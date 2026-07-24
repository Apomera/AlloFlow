// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// Scoped Virtual Dissection Lab UI shell.
(function() {
  if (typeof document === 'undefined' || document.getElementById('allo-dissection-ui-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-dissection-ui-css';
  st.textContent = `
[data-dissection-root] {
  --diss-ink: #10233f;
  --diss-muted: #52647d;
  --diss-line: #cbd7e7;
  --diss-blue: #1766d2;
  --diss-teal: #087f78;
  --diss-gold: #f6c65b;
  color: var(--diss-ink);
  min-width: 0;
}
[data-dissection-root] *, [data-dissection-root] *::before, [data-dissection-root] *::after { box-sizing: border-box; }
[data-dissection-root] button, [data-dissection-root] input, [data-dissection-root] summary { font: inherit; }
[data-dissection-root] button { min-height: 2.5rem; }
[data-dissection-root] [class*="text-[10px]"] { font-size: .75rem !important; line-height: 1.4 !important; }
[data-dissection-root] [class*="text-[11px]"] { font-size: .8125rem !important; line-height: 1.4 !important; }
[data-dissection-root] button:focus-visible,
[data-dissection-root] input:focus-visible,
[data-dissection-root] textarea:focus-visible,
[data-dissection-root] summary:focus-visible,
[data-dissection-root] [tabindex]:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 3px;
}
.diss-mission {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(15rem, 19rem);
  gap: 1rem;
  padding: 1.15rem;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(125, 211, 252, .35);
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at 90% 0%, rgba(45, 212, 191, .26), transparent 38%),
    linear-gradient(135deg, #10233f 0%, #123d6c 58%, #0b6967 100%);
  box-shadow: 0 18px 45px rgba(15, 23, 42, .16);
  color: #fff;
}
.diss-mission::after {
  content: "";
  position: absolute;
  width: 12rem;
  height: 12rem;
  right: -5rem;
  bottom: -7rem;
  border: 1.5rem solid rgba(255, 255, 255, .06);
  border-radius: 999px;
  pointer-events: none;
}
.diss-mission__main, .diss-mission__action, .diss-mission__stats { position: relative; z-index: 1; }
.diss-mission__eyebrow {
  margin: 0 0 .3rem;
  color: #99f6e4;
  font-size: .68rem;
  font-weight: 900;
  letter-spacing: .16em;
  text-transform: uppercase;
}
.diss-mission h2 { margin: 0; color: #fff; font-size: clamp(1.25rem, 2.6vw, 1.8rem); line-height: 1.08; font-weight: 900; }
.diss-mission__copy { max-width: 46rem; margin: .45rem 0 0; color: #dbeafe; font-size: .84rem; line-height: 1.5; }
.diss-workflow { display: flex; flex-wrap: wrap; gap: .45rem; margin: .8rem 0 0; padding: 0; list-style: none; }
.diss-workflow li { display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .58rem; border: 1px solid rgba(255,255,255,.2); border-radius: 999px; background: rgba(15,23,42,.24); color: #f8fafc; font-size: .7rem; font-weight: 800; }
.diss-workflow__number { display: inline-grid; width: 1.3rem; height: 1.3rem; place-items: center; border-radius: 999px; background: #ccfbf1; color: #115e59; font-size: .65rem; }
.diss-mission__action { align-self: stretch; padding: .85rem; border: 1px solid rgba(255,255,255,.2); border-radius: 1rem; background: rgba(3, 20, 40, .34); backdrop-filter: blur(8px); }
.diss-mission__action-label { color: #bae6fd; font-size: .66rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.diss-mission__action h3 { margin: .25rem 0 .2rem; color: #fff; font-size: 1rem; font-weight: 900; }
.diss-mission__action p { margin: 0; min-height: 2.6em; color: #dbeafe; font-size: .74rem; line-height: 1.35; }
.diss-primary-action {
  width: 100%;
  min-height: 2.75rem !important;
  margin-top: .7rem;
  padding: .65rem .85rem;
  border: 1px solid #fde68a;
  border-radius: .8rem;
  background: linear-gradient(135deg, #fef3c7, #f6c65b);
  box-shadow: 0 8px 20px rgba(246,198,91,.2);
  color: #422006;
  font-size: .78rem;
  font-weight: 900;
  cursor: pointer;
}
.diss-primary-action:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.03); }
.diss-primary-action:disabled { cursor: default; opacity: .72; }
.diss-mission__stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
.diss-stat { min-width: 0; padding: .58rem .68rem; border: 1px solid rgba(255,255,255,.18); border-radius: .8rem; background: rgba(15,23,42,.25); }
.diss-stat__label { display: block; color: #a5f3fc; font-size: .62rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.diss-stat__value { display: block; margin-top: .15rem; overflow: hidden; color: #fff; font-size: .78rem; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.diss-mode-rail {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: .5rem;
  padding: .45rem;
  border: 1px solid var(--diss-line);
  border-radius: 1rem;
  background: linear-gradient(180deg, #f8fbff, #eef6ff);
}
.diss-route-button {
  min-height: 2.75rem !important;
  border: 1px solid transparent;
  border-radius: .75rem;
  background: transparent;
  color: #36506f;
  font-size: .76rem;
  font-weight: 900;
  cursor: pointer;
}
.diss-route-button[data-active="true"] { border-color: #8ab7ed; background: #fff; box-shadow: 0 5px 16px rgba(23,102,210,.12); color: #0b57b3; }
.diss-picker, .diss-layer-stepper { padding: .75rem; border: 1px solid var(--diss-line); border-radius: 1rem; background: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.05); }
.diss-section-heading { display: flex; align-items: end; justify-content: space-between; gap: .75rem; margin-bottom: .55rem; }
.diss-section-heading h3 { margin: 0; color: #193454; font-size: .8rem; font-weight: 900; }
.diss-section-heading p { margin: 0; color: var(--diss-muted); font-size: .68rem; }
.diss-specimen-rail { display: flex; gap: .45rem; overflow-x: auto; padding: .15rem .05rem .35rem; overscroll-behavior-inline: contain; scroll-snap-type: x proximity; scrollbar-width: thin; }
.diss-specimen-tab {
  min-height: 2.75rem !important;
  flex: 0 0 auto;
  scroll-snap-align: start;
  padding: .6rem .85rem;
  border: 1px solid #c6d4e6;
  border-radius: .8rem;
  background: #f8fafc;
  color: #435771;
  font-size: .74rem;
  font-weight: 850;
  cursor: pointer;
}
.diss-specimen-tab[aria-selected="true"] { border-color: #1766d2; background: linear-gradient(135deg, #1766d2, #0b7a77); box-shadow: 0 7px 18px rgba(23,102,210,.2); color: #fff; }
.diss-layer-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.25rem, 1fr)); gap: .45rem; }
.diss-layer-button {
  min-height: 3rem !important;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: .45rem;
  padding: .55rem .65rem;
  border: 1px solid #cbd5e1;
  border-radius: .75rem;
  background: #f8fafc;
  color: #435771;
  text-align: left;
  cursor: pointer;
}
.diss-layer-button[data-state="current"] { border-color: #0f8f86; background: #ecfdf5; box-shadow: inset 0 0 0 1px #5eead4; color: #115e59; }
.diss-layer-button[data-state="revealed"] { border-color: #bbd5f5; background: #eff6ff; color: #174d86; }
.diss-layer-button:disabled { cursor: not-allowed; opacity: .5; }
.diss-layer-index { display: grid; width: 1.4rem; height: 1.4rem; place-items: center; border-radius: 999px; background: #e2e8f0; color: #334155; font-size: .64rem; font-weight: 900; }
.diss-layer-name { overflow: hidden; font-size: .7rem; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.diss-layer-state { color: #078174; font-size: .7rem; font-weight: 900; }
.diss-toolbar { gap: .45rem !important; padding: .5rem !important; border-radius: 1rem !important; background: #f8fafc !important; }
.diss-toolbar > button, .diss-tool-panel > button { min-height: 2.5rem !important; }
.diss-tool-panel { gap: .45rem !important; padding: .65rem !important; }
.diss-workspace { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(18rem, 21rem); align-items: start; gap: 1rem !important; }
.diss-primary-column, .diss-sidebar { min-width: 0; }
.diss-primary-column { display: grid; gap: .85rem; }
.diss-stage { overflow: hidden; padding: .8rem; border: 1px solid #becde0; border-radius: 1.15rem; background: linear-gradient(180deg, #ffffff, #f5f9ff); box-shadow: 0 12px 30px rgba(15,23,42,.08); }
.diss-stage__header { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin-bottom: .65rem; }
.diss-stage__eyebrow { color: #0f766e; font-size: .62rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
.diss-stage__title { margin: .14rem 0 0; color: #10233f; font-size: .92rem; font-weight: 900; }
.diss-stage__status { max-width: 50%; padding: .42rem .6rem; border: 1px solid #cbdcf0; border-radius: 999px; background: #eef6ff; color: #24517f; font-size: .68rem; font-weight: 850; text-align: right; }
.diss-canvas-layout { display: grid; gap: .65rem; }
.diss-canvas-layout[data-split="true"] { grid-template-columns: minmax(0, 1fr) minmax(11rem, .56fr); align-items: stretch; }
.diss-canvas-frame { overflow: hidden; padding: .4rem; border: 1px solid #91a8c4; border-radius: 1rem; background: #0f172a; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
.diss-canvas { display: block; width: min(100%, 650px) !important; height: auto; margin: 0 auto; border: 0 !important; border-radius: .75rem !important; box-shadow: 0 14px 32px rgba(2,6,23,.24); }
.diss-split-reference { display: flex; min-width: 0; flex-direction: column; padding: .5rem; border: 1px solid #91a8c4; border-radius: 1rem; background: #0f172a; color: #e2e8f0; }
.diss-split-reference__header { display: flex; align-items: flex-start; justify-content: space-between; gap: .4rem; margin-bottom: .45rem; }
.diss-split-reference__header > div { display: grid; min-width: 0; }
.diss-split-reference__header button { min-height: 2rem !important; padding: .3rem .45rem; border: 1px solid #64748b; border-radius: .45rem; background: #1e293b; color: #e2e8f0; font-size: .58rem; font-weight: 850; cursor: pointer; }
.diss-split-reference img { display: block; width: 100%; min-height: 0; flex: 1 1 auto; border-radius: .7rem; object-fit: contain; background: #020617; }
.diss-split-reference strong { margin-top: .45rem; font-size: .68rem; }
.diss-split-reference span { margin-top: .12rem; color: #bfdbfe; font-size: .61rem; line-height: 1.35; }
.diss-evidence { margin-top: .55rem; border-top: 1px solid #cbdcf0; padding-top: .45rem; }
.diss-evidence summary { cursor: pointer; color: #24517f; font-size: .69rem; font-weight: 850; }
.diss-evidence__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: .45rem; margin-top: .5rem; }
.diss-evidence__item { min-width: 0; padding: .4rem; border: 1px solid #cbdcf0; border-radius: .65rem; background: #fff; }
.diss-evidence__item[data-reference="true"] { border-color: #0f766e; box-shadow: inset 0 0 0 1px #0f766e; }
.diss-evidence__item img { display: block; width: 100%; aspect-ratio: 5/6; border-radius: .45rem; background: #0f172a; object-fit: cover; }
.diss-evidence__item strong, .diss-evidence__item span { display: block; margin-top: .28rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diss-evidence__item strong { color: #10233f; font-size: .65rem; }
.diss-evidence__item span { color: #526b87; font-size: .59rem; }
.diss-evidence__actions { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .35rem; }
.diss-evidence__actions button { min-height: 2rem !important; padding: .3rem .42rem; border: 1px solid #91a8c4; border-radius: .45rem; background: #f8fafc; color: #24517f; font-size: .58rem; font-weight: 850; cursor: pointer; }
.diss-canvas:fullscreen { width: auto !important; height: min(96vh, 1100px) !important; max-width: 96vw !important; margin: auto; border-radius: 0 !important; background: #0f172a !important; object-fit: contain; }
.diss-stage__live { margin: .55rem .1rem 0; color: #36506f; font-size: .72rem; line-height: 1.4; }
.diss-procedure { margin-top: .7rem; padding: .75rem; border: 1px solid #99c7be; border-radius: .9rem; background: linear-gradient(145deg, #f0fdfa, #f8fbff); }
.diss-procedure__header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.diss-procedure__header h4 { margin: 0; color: #134e4a; font-size: .82rem; font-weight: 900; }
.diss-procedure__header p { margin: .2rem 0 0; color: #426568; font-size: .7rem; line-height: 1.4; }
.diss-procedure__mode { display: flex; flex: 0 0 auto; gap: .25rem; padding: .2rem; border: 1px solid #b9d8d2; border-radius: .65rem; background: #fff; }
.diss-procedure__mode button { min-height: 2rem !important; padding: .35rem .55rem; border: 0; border-radius: .45rem; background: transparent; color: #466a68; font-size: .66rem; font-weight: 850; cursor: pointer; }
.diss-procedure__mode button[aria-pressed="true"] { background: #0f766e; color: #fff; }
.diss-instruments { display: grid; grid-template-columns: repeat(auto-fit, minmax(5.2rem, 1fr)); gap: .35rem; margin-top: .65rem; }
.diss-instrument { min-height: 2.8rem !important; padding: .35rem .25rem; border: 1px solid #b8ccc9; border-radius: .65rem; background: #fff; color: #315b58; font-size: .67rem; font-weight: 850; cursor: pointer; }
.diss-instrument[aria-checked="true"] { border-color: #0f766e; background: #0f766e; box-shadow: 0 5px 14px rgba(15,118,110,.18); color: #fff; }
.diss-procedure__steps { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .28rem; margin-top: .6rem; }
.diss-procedure__step { min-width: 0; padding: .3rem .2rem; border-radius: .45rem; background: #dfeae9; color: #5c7472; font-size: .61rem; font-weight: 800; text-align: center; }
.diss-procedure__step[data-complete="true"] { background: #ccfbf1; color: #0f766e; }
.diss-procedure__step[data-current="true"] { box-shadow: inset 0 0 0 2px #f59e0b; background: #fffbeb; color: #92400e; }
.diss-procedure__controls { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; margin-top: .65rem; }
.diss-procedure__controls button { min-height: 2.4rem !important; padding: .5rem .7rem; border: 1px solid #9dbab6; border-radius: .65rem; background: #fff; color: #315b58; font-size: .7rem; font-weight: 850; cursor: pointer; }
.diss-procedure__controls .diss-procedure__next { border-color: #0f766e; background: #0f766e; color: #fff; }
.diss-procedure__controls button:disabled { cursor: not-allowed; opacity: .55; }
.diss-procedure__feedback { margin: .55rem 0 0; padding: .5rem .6rem; border-left: 4px solid #0f766e; border-radius: .45rem; background: #fff; color: #355754; font-size: .7rem; line-height: 1.4; }
.diss-procedure__feedback[data-tone="caution"] { border-left-color: #f59e0b; background: #fffbeb; color: #7c3f10; }
.diss-procedure__notice { margin: .5rem 0 0; color: #5a6d73; font-size: .64rem; line-height: 1.4; }
.diss-procedure__metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(6.2rem, 1fr)); gap: .35rem; margin-top: .6rem; }
.diss-procedure__metric { min-width: 0; padding: .45rem; border: 1px solid #c3d8d4; border-radius: .55rem; background: rgba(255,255,255,.84); }
.diss-procedure__metric span { display: block; color: #5b7471; font-size: .58rem; font-weight: 850; letter-spacing: .04em; text-transform: uppercase; }
.diss-procedure__metric strong { display: block; margin-top: .12rem; overflow: hidden; color: #134e4a; font-size: .76rem; text-overflow: ellipsis; white-space: nowrap; }
.diss-procedure__timeline { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .55rem; }
.diss-procedure__timeline span { padding: .28rem .45rem; border: 1px solid #b9d8d2; border-radius: 999px; background: #fff; color: #3c625f; font-size: .62rem; font-weight: 800; }
.diss-advanced-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr)); gap: .4rem; margin-top: .6rem; }
.diss-advanced-card { min-width: 0; padding: .55rem .6rem; border: 1px solid #b9d8d2; border-radius: .65rem; background: rgba(255,255,255,.88); color: #315b58; }
.diss-advanced-card strong { display: block; color: #134e4a; font-size: .7rem; }
.diss-advanced-card p { margin: .2rem 0 0; font-size: .66rem; line-height: 1.4; }
.diss-advanced-card button { margin-top: .42rem; padding: .38rem .5rem; border: 1px solid #8b5cf6; border-radius: .5rem; background: #fff; color: #5b21b6; font-size: .62rem; font-weight: 850; cursor: pointer; }
.diss-attempt-comparison { grid-column: 1 / -1; border-color: #c4b5fd; background: linear-gradient(135deg, rgba(245,243,255,.96), rgba(253,242,248,.9)); }
.diss-attempt-comparison__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.2rem, 1fr)); gap: .35rem; margin-top: .45rem; }
.diss-attempt-comparison__metric { padding: .4rem .45rem; border: 1px solid #ddd6fe; border-radius: .5rem; background: rgba(255,255,255,.78); }
.diss-attempt-comparison__metric span { display: block; color: #6d5b8c; font-size: .57rem; font-weight: 850; text-transform: uppercase; }
.diss-attempt-comparison__metric strong { display: block; margin-top: .12rem; color: #4c1d95; font-size: .72rem; }
.diss-debrief { margin-top: .55rem; padding: .6rem; border: 1px solid #93c5fd; border-radius: .65rem; background: #eff6ff; color: #24486e; font-size: .69rem; line-height: 1.45; }
.diss-debrief strong { color: #123b67; }
.diss-instructor { margin-top: .55rem; border-top: 1px solid #b9d8d2; padding-top: .45rem; }
.diss-instructor summary { cursor: pointer; color: #315b58; font-size: .68rem; font-weight: 850; }
.diss-zoom-bar { min-height: 2.7rem; margin-top: .6rem !important; background: #edf4fb !important; }
.diss-zoom-bar button { min-width: 2.5rem; min-height: 2.25rem !important; }
.diss-overlay-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
.diss-overlay-actions button { min-height: 2.55rem !important; margin-top: .55rem !important; }
.diss-sidebar { display: grid; width: 100% !important; gap: .8rem; }
.diss-selection-card { border-color: #9db4cf !important; box-shadow: 0 10px 26px rgba(15,23,42,.07); }
.diss-selection-summary { margin: .65rem 0; padding: .7rem; border-left: 4px solid #f59e0b; border-radius: .65rem; background: #fff7ed; }
.diss-selection-summary__label { display: block; color: #9a4d08; font-size: .62rem; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
.diss-selection-summary p { margin: .2rem 0 0; color: #4a3b2b; font-size: .78rem; line-height: 1.48; }
.diss-evidence-note { width: 100%; min-height: 5rem; margin-top: .4rem; padding: .65rem; border: 1px solid #aebed2; border-radius: .65rem; background: #fff; color: #24364d; resize: vertical; }
.diss-science-scope { margin: .55rem 0 0; padding: .55rem .65rem; border: 1px solid #bfdbfe; border-radius: .65rem; background: #eff6ff; color: #294f79; font-size: .75rem; line-height: 1.45; }
.diss-structure-list button { min-height: 2.7rem !important; }
.diss-study-card { min-width: 0; }
.diss-flashcard { width: 100%; min-height: 7rem !important; border: 2px solid #c4b5fd; cursor: pointer; }
.diss-disclosure { overflow: hidden; border-radius: .9rem; }
.diss-disclosure > summary { min-height: 2.65rem; display: flex; align-items: center; gap: .4rem; padding: .7rem .8rem; cursor: pointer; font-size: .72rem; font-weight: 900; list-style: none; }
.diss-disclosure > summary::-webkit-details-marker { display: none; }
.diss-disclosure > summary::after { content: "＋"; margin-left: auto; font-size: 1rem; }
.diss-disclosure[open] > summary::after { content: "−"; }
.diss-disclosure__body { padding: 0 .8rem .8rem; }
.diss-disclosure--inset { padding: 0 .8rem .8rem; }
.diss-disclosure--inset > summary { margin: 0 -.8rem .7rem; }
@media print {
  [data-dissection-root] { color: #000 !important; background: #fff !important; }
  [data-dissection-root] .diss-mode-rail, [data-dissection-root] .diss-picker, [data-dissection-root] .diss-layer-stepper,
  [data-dissection-root] .diss-toolbar, [data-dissection-root] .diss-tool-panel, [data-dissection-root] .diss-zoom-bar,
  [data-dissection-root] .diss-overlay-actions, [data-dissection-root] .diss-primary-action { display: none !important; }
  [data-dissection-root] .diss-mission { display: block; padding: .6rem; border: 1px solid #777; background: #fff !important; box-shadow: none; color: #000 !important; }
  [data-dissection-root] .diss-mission * { color: #000 !important; }
  [data-dissection-root] .diss-workspace { grid-template-columns: 58% 40% !important; gap: 2% !important; }
  [data-dissection-root] .diss-stage, [data-dissection-root] .diss-selection-card, [data-dissection-root] .diss-disclosure { break-inside: avoid; box-shadow: none !important; }
}
@media (max-width: 980px) {
  .diss-mission { grid-template-columns: 1fr; }
  .diss-mission__stats { grid-column: auto; }
  .diss-workspace { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .diss-mission { padding: .9rem; border-radius: 1rem; }
  .diss-mission__stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .35rem; }
  .diss-stat { padding: .48rem .45rem; }
  .diss-mode-rail { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .35rem; }
  .diss-section-heading { align-items: start; flex-direction: column; }
  .diss-layer-list { display: flex; overflow-x: auto; padding-bottom: .25rem; scroll-snap-type: x proximity; }
  .diss-layer-button { min-width: 8.6rem; scroll-snap-align: start; }
  .diss-stage { padding: .55rem; }
  .diss-stage__header { align-items: flex-start; flex-direction: column; }
  .diss-stage__status { max-width: 100%; text-align: left; }
  .diss-procedure__header { flex-direction: column; }
  .diss-instruments { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .diss-canvas-layout[data-split="true"] { grid-template-columns: 1fr; }
  .diss-procedure__steps { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .diss-procedure__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .diss-overlay-actions { grid-template-columns: 1fr; }
}
`;
  if (document.head) document.head.appendChild(st);
})();

// stem_tool_dissection.js — Virtual Dissection Lab
// Extracted from stem_tool_science.js as a standalone module
// Uses window.StemLab.registerTool() plugin architecture

  // â•â•â• ðŸ”¬ dissection (dissection) â•â•â•
  // ── Dissection Lab Audio System ──
  var _disAC = null;
  var _disSaveTimer = null;
  function disSoundEnabled() { try { return window.__alloDissectionSoundEnabled !== false; } catch (e) { return true; } }
  function scheduleDissectionSave(key, data) {
    try {
      if (_disSaveTimer) clearTimeout(_disSaveTimer);
      _disSaveTimer = setTimeout(function () {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
        _disSaveTimer = null;
      }, 120);
    } catch (e) {}
  }
  function getDisAC() { if (!_disAC) { try { _disAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_disAC && _disAC.state === 'suspended') { try { _disAC.resume(); } catch(e) {} } return _disAC; }
  function disTone(f,d,tp,v) { if (!disSoundEnabled()) return; var ac = getDisAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function disNoise(dur,vol,hz) { if (!disSoundEnabled()) return; var ac = getDisAC(); if (!ac) return; try { var bs = Math.floor(ac.sampleRate*(dur||0.05)); var b = ac.createBuffer(1,bs,ac.sampleRate); var dd = b.getChannelData(0); for(var i=0;i<bs;i++) dd[i]=(Math.random()*2-1)*(1-i/bs); var s = ac.createBufferSource(); s.buffer=b; var f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=hz||600; var g = ac.createGain(); g.gain.setValueAtTime(vol||0.04,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(dur||0.05)); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); } catch(e) {} }
  function sfxDisCut() { disNoise(0.06, 0.05, 800); disTone(300, 0.08, 'sawtooth', 0.05); }
  function sfxDisProbe() { disTone(800, 0.04, 'sine', 0.05); setTimeout(function() { disTone(1000, 0.03, 'sine', 0.04); }, 30); }
  function sfxDisReveal() { disTone(440, 0.06, 'sine', 0.06); setTimeout(function() { disTone(554, 0.06, 'sine', 0.06); }, 50); setTimeout(function() { disTone(659, 0.08, 'sine', 0.07); }, 100); }
  function sfxDisPin() { disTone(1200, 0.03, 'square', 0.04); }
  function sfxDisLabel() { disTone(600, 0.04, 'sine', 0.05); }

  console.log('[Dissection Plugin] Registering dissection tool...');
  window.StemLab.registerTool('dissection', {
    icon: "🔪",
    label: "Virtual Dissection Lab",
    desc: "Peel anatomical layers and click organs across specimens (frog, fetal pig, earthworm, perch and more) with quizzes and flashcards.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'reveal_3_layers', label: 'Reveal 3 layers of a specimen', icon: '\uD83D\uDD2C', check: function(d) { return Object.keys(d.revealedLayers || {}).length >= 3; }, progress: function(d) { return Object.keys(d.revealedLayers || {}).length + '/3 layers'; } },
      { id: 'complete_guided', label: 'Complete a guided dissection', icon: '\uD83D\uDCDA', check: function(d) { return d.guidedComplete || false; }, progress: function(d) { return d.guidedComplete ? 'Done!' : 'In progress'; } },
      { id: 'quiz_3_correct', label: 'Answer 3+ dissection quiz questions correctly', icon: '\uD83E\uDDE0', check: function(d) { return (d.quizScore || 0) >= 3; }, progress: function(d) { return (d.quizScore || 0) + '/3'; } },
      { id: 'try_2_specimens', label: 'Explore 2 different specimens', icon: '\uD83D\uDC38', check: function(d) { return Object.keys(d.specimensViewed || {}).length >= 2; }, progress: function(d) { return Object.keys(d.specimensViewed || {}).length + '/2'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      console.log('[Dissection Plugin] render() called, has React:', !!ctx.React, 'has toolData:', !!ctx.toolData);
      // Aliases â€” maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var callGemini = ctx.callGemini;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;

      // â”€â”€ Tool body (dissection) â”€â”€
      return (function() {
var d = labToolData.dissection || {};

          // ── Specimen-specific trivia for "Did You Know?" panel ──
          var SPECIMEN_TRIVIA = {
            frog: [
              'A frog can absorb water through its skin \u2014 it never needs to drink.',
              'The golden poison dart frog has enough toxin to kill 10 adults.',
              'Frogs were the first land animals with true vocal cords.',
              'Wood frogs can survive being frozen solid and thaw back to life.',
              'A group of frogs is called an "army."'
            ],
            earthworm: [
              'Earthworms have 5 pairs of aortic arches that act as hearts.',
              'Charles Darwin studied earthworms for 39 years.',
              'A single acre can contain over 1 million earthworms.',
              'Earthworms can regenerate lost segments in some species.',
              'They eat their own weight in soil every single day.'
            ],
            pig: [
              'Pig organs are so similar to human that pig heart valves are used in surgery.',
              'Porcine insulin treated millions of diabetics before synthetic versions existed.',
              'Pigs have more taste buds (15,000) than humans (9,000).',
              'Fetal pig anatomy is 95% identical to human fetal anatomy.',
              'Pig skin is used as temporary grafts for human burn victims.'
            ],
            perch: [
              'Fish gills extract proportionally more O\u2082 from water than lungs from air.',
              'The swim bladder evolved from the same structure that became lungs in land animals.',
              'Perch scale rings can reveal the fish\u2019s exact age, like tree rings.',
              'A perch\u2019s lateral line can detect prey movement in complete darkness.',
              'Fish have been on Earth for over 500 million years \u2014 before trees existed.'
            ],
            crayfish: [
              'Crayfish can regenerate lost claws over several molts.',
              'Their tail flip escape is one of the fastest movements in the animal kingdom.',
              'A crayfish has teeth inside its stomach (the gastric mill).',
              'They can walk forward but swim backward.',
              'Crayfish establish dominance hierarchies and remember social status.'
            ],
            sheepEye: [
              'The human eye can distinguish about 10 million different colors.',
              'Sheep have a tapetum lucidum \u2014 their eyes literally glow in the dark.',
              'The cornea is the only body part with no blood supply \u2014 it gets oxygen from air.',
              'Your retina contains 120 million rod cells for night vision.',
              'The eye\u2019s lens is made of transparent crystallin proteins that never turn over.'
            ],
            sheepHeart: [
              'Your heart beats about 100,000 times per day \u2014 3 billion times in a lifetime.',
              'The left ventricle wall is 3x thicker than the right.',
              'The heart creates enough pressure to squirt blood 30 feet.',
              'A sheep heart shares the four-chamber mammalian plan, while size, vessel branching, rate, and pressure differ by species.',
              'The SA node fires 60-100 times per minute with zero input from the brain.'
            ]
          };


          var upd = function (k, v) { setLabToolData(function (p) { return Object.assign({}, p, { dissection: Object.assign({}, p.dissection, (function () {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-dissection')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-dissection';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
 var o = {}; o[k] = v; return o; })()) }); }); };
          var updMany = function (patch) {
            setLabToolData(function (p) {
              return Object.assign({}, p, { dissection: Object.assign({}, p.dissection || {}, patch || {}) });
            });
          };
          try { window.__alloDissectionSoundEnabled = d.soundEnabled !== false; } catch (e) {}

          // Canvas Narration: Dissection Lab init
          if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'init', {
            first: 'Virtual Dissection Lab loaded. Choose a specimen such as frog, earthworm, fetal pig, perch, crayfish, sheep eye, or sheep heart. Peel layers to reveal anatomy, click organs for detail, and use study tools for quizzes and flashcards.',
            repeat: 'Dissection Lab ready.',
            terse: 'Dissection Lab ready.'
          });



          // â•â•â•â•â•â•â•â• SPECIMEN DATABASE â•â•â•â•â•â•â•â•

          var SPECIMENS = {

            frog: {

              name: 'Frog (Rana)', icon: '\uD83D\uDC38',

              desc: 'Classic vertebrate â€” 3-chambered heart, cutaneous respiration, metamorphosis.',

              objectives: [
                'Identify the 3-chambered heart and trace blood flow',
                'Compare cutaneous vs pulmonary respiration',
                'Distinguish mesonephric kidneys from mammalian metanephric',
                'Locate the cloaca and explain shared-opening anatomy'
              ],
              specTerms: [
                { term: 'Cutaneous respiration', def: 'Gas exchange through moist, permeable skin.' },
                { term: 'Buccal pumping', def: 'Throat-based breathing mechanism; frogs push air into lungs by raising the floor of the mouth.' },
                { term: 'Mesonephric kidney', def: 'Intermediate kidney type between fish pronephros and mammalian metanephros.' },
                { term: 'Cloaca', def: 'Shared exit chamber for digestive, urinary, and reproductive systems.' },
                { term: 'Nictitating membrane', def: 'Transparent third eyelid that protects the eye underwater.' }
              ],
              bodyShape: 'frog',

              layers: [

                { id: 'skin', name: 'Skin', icon: '\uD83D\uDFE2', color: '#4ade80', accent: '#16a34a', desc: 'Moist permeable integument with chromatophores.' },

                { id: 'muscle', name: 'Muscle', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Skeletal muscles for jumping and swimming.' },

                { id: 'organs', name: 'Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Digestive, respiratory, circulatory, and urogenital organs.' },

                { id: 'skeleton', name: 'Skeleton', icon: '\uD83E\uDDB4', color: 'var(--allo-stem-text, #e2e8f0)', accent: '#94a3b8', desc: 'Endoskeleton adapted for jumping.' },

                { id: 'nervous', name: 'Nervous', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'CNS and peripheral nerves.' }

              ],

              organs: {

                skin: [

                  { id: 'dorsal_skin', name: 'Dorsal Skin', x: 0.50, y: 0.35, fn: 'Green-brown pigmented surface with chromatophores. Mucous glands keep skin moist for cutaneous respiration (up to 50% of gas exchange).', clinical: 'Chytrid fungus attacks frog skin keratin, causing global amphibian declines.' },

                  { id: 'ventral_skin', name: 'Ventral Skin', x: 0.50, y: 0.65, fn: 'Lighter, thinner ventral surface. Highly vascularized \u2014 frogs absorb water through skin, not by drinking.', clinical: 'Permeable skin makes frogs sensitive bioindicators of environmental pollution.' },

                  { id: 'tympanum', name: 'Tympanic Membrane', x: 0.62, y: 0.18, fn: 'External eardrum behind eye. Transmits sound to columella and inner ear. Size indicates sex (larger = male).', clinical: 'Used for species and sex identification in field studies.' },

                  { id: 'nictitating', name: 'Nictitating Membrane', x: 0.58, y: 0.15, fn: 'Transparent third eyelid protecting eye underwater. Homologous to human plica semilunaris (vestigial).', clinical: 'Present in many vertebrates \u2014 vestigial in humans as plica semilunaris.' }

                ],

                muscle: [

                  { id: 'pectoralis', name: 'Pectoralis', x: 0.50, y: 0.42, fn: 'Chest muscle adducting forelimb. Assists landing absorption after jumps. Homologous to human pectoralis major.', clinical: 'Comparative anatomy: same muscle, different function \u2014 landing in frogs vs pushing in humans.' },

                  { id: 'rectus_abd', name: 'Rectus Abdominis', x: 0.50, y: 0.55, fn: 'Ventral abdominal muscle from sternum to pelvis. Flexes trunk and compresses cavity for buccal pump breathing.', clinical: 'Frogs use buccal pumping (throat) rather than diaphragmatic breathing like mammals.' },

                  { id: 'gastrocnemius', name: 'Gastrocnemius', x: 0.35, y: 0.78, fn: 'Large calf muscle powering jumps. Can generate 2\u00D7 body weight force. Galvani used frog legs to discover bioelectricity (1780s).', clinical: 'Classic muscle for physiology experiments \u2014 Galvani\'s frog leg experiments founded bioelectricity.' },

                  { id: 'triceps_fem', name: 'Triceps Femoris', x: 0.38, y: 0.68, fn: 'Three-headed thigh muscle (homolog of quadriceps). Primary knee extensor during jumping.', clinical: 'Frogs can jump 20\u00D7 body length due to elastic energy storage in tendons.' },

                  { id: 'sartorius', name: 'Sartorius', x: 0.42, y: 0.65, fn: 'Thin strap on medial thigh. Flexes and rotates hip. Assists drawing legs into swimming position.', clinical: 'Longest muscle in both frogs and humans \u2014 a homologous structure across vertebrates.' },

                  { id: 'deltoid', name: 'Deltoideus', x: 0.38, y: 0.38, fn: 'Shoulder muscle elevating/rotating forelimb. Smaller than hindlimb muscles \u2014 frogs are hindlimb-dominant.' }

                ],

                organs: [

                  { id: 'heart', name: 'Heart (3-chamber)', x: 0.50, y: 0.38, fn: '2 atria + 1 ventricle. Spiral valve in conus arteriosus separates blood with ~90% efficiency despite single ventricle.', clinical: 'Frog hearts beat without neural input (myogenic) and can beat in saline for hours \u2014 used in cardiac physiology research.' },

                  { id: 'lungs', name: 'Lungs', x: 0.45, y: 0.40, fn: 'Simple thin-walled sacs (no alveoli). Supplemented by cutaneous respiration. Inflated by buccal pumping \u2014 not diaphragm.', clinical: 'The Bornean flat-headed frog is completely lungless \u2014 breathes entirely through skin.' },

                  { id: 'liver', name: 'Liver (3 lobes)', x: 0.50, y: 0.45, fn: 'Large three-lobed organ. Produces bile, detoxifies blood, stores glycogen. Largest internal organ.', clinical: 'Liver color/size indicates environmental contamination in ecotoxicology studies.' },

                  { id: 'gallbladder', name: 'Gallbladder', x: 0.52, y: 0.47, fn: 'Small green sac between liver lobes. Stores/concentrates bile. Bright green color \u2014 key dissection landmark.', clinical: 'Bright green color makes it one of the easiest organs to identify in dissection.' },

                  { id: 'stomach', name: 'Stomach', x: 0.48, y: 0.50, fn: 'J-shaped muscular organ. Frogs swallow prey whole and use eye retraction to push food down.', clinical: 'Frogs push food into stomach by retracting eyes into mouth roof \u2014 unique swallowing mechanism.' },

                  { id: 'sm_intestine', name: 'Small Intestine', x: 0.50, y: 0.58, fn: 'Coiled tube (duodenum + ileum). Primary nutrient absorption site. Shorter than in herbivorous tadpoles.', clinical: 'Tadpoles (herbivores) have much longer intestines than adult frogs (carnivores) \u2014 diet drives gut length.' },

                  { id: 'lg_intestine', name: 'Large Intestine', x: 0.50, y: 0.65, fn: 'Short wide tube to cloaca. Absorbs water. Opens into cloaca (shared digestive/urinary/reproductive exit).', clinical: 'The cloaca \u2014 shared exit for 3 systems \u2014 is the ancestral vertebrate condition; separate openings evolved later.' },

                  { id: 'spleen', name: 'Spleen', x: 0.46, y: 0.53, fn: 'Small reddish organ near stomach. Filters blood, removes old RBCs, immune function.', clinical: 'Spleen plus antimicrobial skin peptides form a dual immune defense system.' },

                  { id: 'kidneys', name: 'Kidneys', x: 0.50, y: 0.70, fn: 'Elongated, dorsal organs. Mesonephric kidneys \u2014 intermediate between fish and mammal kidney types. Drains to cloaca.', clinical: 'Frog kidneys (mesonephric) are ancestral \u2014 mammals evolved more advanced metanephric kidneys.' },

                  { id: 'fat_bodies', name: 'Fat Bodies', x: 0.48, y: 0.35, fn: 'Yellow finger-like structures on kidneys/gonads. Energy reserves for hibernation and reproduction.', clinical: 'Fat body size indicates nutritional status \u2014 shrunken = environmental stress.' },

                  { id: 'pancreas', name: 'Pancreas', x: 0.53, y: 0.52, fn: 'Thin pale organ between stomach and duodenum. Produces digestive enzymes and insulin/glucagon.', clinical: 'Frog pancreatic islets used in early insulin research.' },

                  { id: 'cloaca', name: 'Cloaca', x: 0.50, y: 0.75, fn: 'Common chamber for digestive, urinary, and reproductive output. Present in amphibians, reptiles, birds.', clinical: 'Represents ancestral vertebrate design \u2014 separate openings evolved independently in mammals.' }

                ],

                skeleton: [

                  { id: 'skull', name: 'Skull', x: 0.50, y: 0.15, fn: 'Broad flat skull with large orbits. Frontoparietal bone fused (unique to frogs). Maxillary + vomerine teeth.', clinical: 'Frogs have teeth on upper jaw only \u2014 toads have no teeth at all.' },

                  { id: 'vertebral_col', name: 'Vertebral Column', x: 0.50, y: 0.40, fn: 'Only 9 presacral vertebrae (mammals have 24+). Short rigid spine for jumping.', clinical: 'Fewest vertebrae of any tetrapod \u2014 extreme spinal reduction for jumping.' },

                  { id: 'urostyle', name: 'Urostyle', x: 0.50, y: 0.55, fn: 'Fused caudal vertebrae forming rod-like tailbone. Absorbs landing shock. Unique to frogs/toads.', clinical: 'The urostyle is found only in anurans \u2014 a defining skeletal feature of frogs and toads.' },

                  { id: 'pelvic_girdle', name: 'Pelvic Girdle', x: 0.50, y: 0.60, fn: 'Elongated ilium creates lever for powerful jumps. Highly modified compared to other vertebrates.', clinical: 'Elongated pelvic girdle is the key anatomical adaptation enabling the frog jump.' },

                  { id: 'pectoral_gird', name: 'Pectoral Girdle', x: 0.50, y: 0.32, fn: 'Supports forelimbs. Acts as shock absorber during landing. Clavicle, coracoid, scapula, suprascapula.', clinical: 'The pectoral girdle absorbs impact forces that would fracture bones in most other animals.' },

                  { id: 'femur', name: 'Femur', x: 0.40, y: 0.65, fn: 'Long thigh bone. Proportionally longer than most vertebrates for jumping leverage.', clinical: 'Frog femur is proportionally longer than human femur relative to body size.' },

                  { id: 'tibiofibula', name: 'Tibio-fibula', x: 0.38, y: 0.75, fn: 'Fused tibia + fibula (single bone). Reduces weight while maintaining strength. 5 digits with webbing.', clinical: 'Bone fusion reduces weight \u2014 an adaptation for efficient jumping.' },

                  { id: 'radioulna', name: 'Radio-ulna', x: 0.30, y: 0.42, fn: 'Fused radius + ulna. 4 digits on forelimb (digit I lost). Simplified limb for landing.', clinical: 'Loss of digit I and bone fusion are weight reduction adaptations.' },

                  { id: 'astragalus', name: 'Elongated Ankle Bones', x: 0.36, y: 0.82, fn: 'Astragalus and calcaneus elongated to add extra leg segment \u2014 increases jump distance. Unique to frogs.', clinical: 'Elongated ankles function as an extra leg segment \u2014 key innovation for saltatory locomotion.' }

                ],

                nervous: [

                  { id: 'brain', name: 'Brain', x: 0.50, y: 0.12, fn: 'Small brain with prominent optic lobes (largest region). Olfactory lobes, cerebrum, cerebellum (small), medulla.', clinical: 'Vision dominates \u2014 classic Lettvin 1959 study: "What the Frog\'s Eye Tells the Frog\'s Brain."' },

                  { id: 'spinal_cord', name: 'Spinal Cord', x: 0.50, y: 0.40, fn: '10 spinal nerve pairs. Ends with filum terminale. Classic spinal frog preparation demonstrates reflexes.', clinical: 'A "spinal frog" (brain destroyed) still shows coordinated reflex responses \u2014 foundational neuroscience.' },

                  { id: 'sciatic_n', name: 'Sciatic Nerve', x: 0.42, y: 0.68, fn: 'Largest nerve. Runs along posterior thigh. Branches from sacral plexus (spinal nerves 8-9).', clinical: 'Frog sciatic nerve was the model system for early electrophysiology experiments.' },

                  { id: 'brachial_n', name: 'Brachial Nerves', x: 0.38, y: 0.35, fn: 'Spinal nerves 2-3 forming brachial plexus for forelimb. Smaller than sciatic due to smaller forelimb.', clinical: 'Smaller brachial vs larger sciatic reflects hindlimb dominance in frogs.' },

                  { id: 'cranial_n', name: 'Cranial Nerves', x: 0.55, y: 0.14, fn: '10 pairs (mammals have 12). Key: optic (II, large), trigeminal (V), vagus (X, viscera).', clinical: 'Frogs have 10 cranial nerve pairs vs 12 in mammals \u2014 lacking spinal accessory (XI) and hypoglossal (XII).' },

                  { id: 'optic_lobe', name: 'Optic Lobes (Tectum)', x: 0.52, y: 0.10, fn: 'Largest brain region processing visual "bug detector" neurons \u2014 respond to small moving dark objects.', clinical: 'Optic tectum "bug detectors" inspired early computer vision and AI motion detection algorithms.' }

                ]

              }

            },



            earthworm: {

              name: 'Earthworm (Lumbricus)', icon: '\uD83E\uDEB1',

              desc: 'Annelid \u2014 segmented body, closed circulation, 5 aortic arches, ventral nerve cord.',

              objectives: [
                'Trace the closed circulatory system through aortic arches',
                'Explain peristaltic locomotion via antagonistic muscles',
                'Identify nephridia and compare to vertebrate kidneys',
                'Describe the role of the clitellum in reproduction'
              ],
              specTerms: [
                { term: 'Peristalsis', def: 'Wave-like contraction of circular and longitudinal muscles for locomotion.' },
                { term: 'Nephridium', def: 'Excretory tubule in each segment; filters coelomic fluid similar to a kidney nephron.' },
                { term: 'Aortic arch', def: 'One of five paired muscular vessels that pump blood; analogous to a heart.' },
                { term: 'Clitellum', def: 'Glandular band that secretes a cocoon for egg deposition.' },
                { term: 'Setae', def: 'Chitinous bristles providing traction during locomotion.' }
              ],
              bodyShape: 'worm',

              layers: [

                { id: 'skin', name: 'Integument', icon: '\uD83D\uDFE4', color: '#a78bfa', accent: '#7c3aed', desc: 'Moist cuticle with setae for locomotion.' },

                { id: 'muscle', name: 'Body Wall', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Circular and longitudinal muscles for peristalsis.' },

                { id: 'organs', name: 'Internal Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Digestive tube, aortic arches, nephridia.' },

                { id: 'nervous', name: 'Nervous System', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'Ventral nerve cord with cerebral ganglia.' }

              ],

              organs: {

                skin: [

                  { id: 'cuticle', name: 'Cuticle', x: 0.50, y: 0.30, fn: 'Transparent outer covering. Keeps skin moist for gas exchange \u2014 earthworms breathe through skin.', clinical: 'Earthworms die if skin dries out \u2014 cutaneous respiration requires moisture.' },

                  { id: 'setae', name: 'Setae', x: 0.35, y: 0.55, fn: 'Tiny chitinous bristles (4 pairs/segment). Grip soil during peristaltic locomotion.', clinical: 'Setae are homologous to marine polychaete parapodia.' },

                  { id: 'clitellum', name: 'Clitellum', x: 0.50, y: 0.25, fn: 'Glandular band (segments 32-37). Secretes cocoon for eggs. Indicates sexual maturity.', clinical: 'Clitellum position varies by species \u2014 used for identification.' },

                  { id: 'prostomium', name: 'Prostomium', x: 0.50, y: 0.08, fn: 'Fleshy lip over mouth. Sensory: detects light, chemicals, vibrations. Not a true segment.', clinical: '"Worm grunting" exploits vibration sensitivity to harvest bait worms.' }

                ],

                muscle: [

                  { id: 'circular_m', name: 'Circular Muscles', x: 0.55, y: 0.40, fn: 'Outer layer running around each segment. Contraction = longer/thinner (elongation phase).', clinical: 'Same peristaltic mechanism humans use for intestinal movement.' },

                  { id: 'longitudinal_m', name: 'Longitudinal Muscles', x: 0.45, y: 0.50, fn: 'Inner layer along body length. Contraction = shorter/fatter (anchoring phase). Antagonistic to circular.', clinical: 'Hydrostatic skeleton (fluid-filled coelom) transmits force between the two layers.' },

                  { id: 'septa', name: 'Septa', x: 0.50, y: 0.45, fn: 'Muscular partitions between segments. Each segment = independent hydraulic unit.', clinical: 'Segmentation allows independent control \u2014 damage to one segment doesn\'t disable others.' }

                ],

                organs: [

                  { id: 'pharynx', name: 'Pharynx', x: 0.50, y: 0.12, fn: 'Muscular pump (segments 1-5). Sucks in soil and organic matter.', clinical: 'Earthworms eat their own weight in soil daily, aerating tons of soil per acre.' },

                  { id: 'crop', name: 'Crop', x: 0.50, y: 0.28, fn: 'Thin-walled storage chamber (segments 15-16). Temporary food storage.', clinical: 'Similar function to a bird\'s crop \u2014 convergent evolution of food storage.' },

                  { id: 'gizzard', name: 'Gizzard', x: 0.50, y: 0.33, fn: 'Thick muscular grinder (segments 17-18). Uses sand grains to crush food. No teeth.', clinical: 'Like a bird\'s gizzard \u2014 independent evolution of grit-grinding organs.' },

                  { id: 'intestine', name: 'Intestine', x: 0.50, y: 0.55, fn: 'Straight tube with typhlosole (dorsal fold increasing surface area). Digestion and absorption.', clinical: 'Typhlosole is a simple version of intestinal villi \u2014 same principle, different solution.' },

                  { id: 'aortic_arches', name: 'Aortic Arches (5 Hearts)', x: 0.48, y: 0.22, fn: '5 pairs of contractile vessels (segments 7-11). Pump blood in closed circulatory system.', clinical: 'Often called "5 hearts" \u2014 actually muscular blood vessels. Among first studied for closed circulation.' },

                  { id: 'nephridia', name: 'Nephridia', x: 0.55, y: 0.48, fn: 'Paired excretory organs per segment. Filter coelomic fluid. Equivalent of kidneys.', clinical: 'Segmentally repeated kidneys \u2014 unique annelid design with one pair per segment.' },

                  { id: 'seminal_v', name: 'Seminal Vesicles', x: 0.45, y: 0.20, fn: 'White organs (segments 9-12). Store sperm. Earthworms are hermaphrodites but cross-fertilize.', clinical: 'Despite being hermaphrodites, self-fertilization is rare \u2014 they mate with partners.' }

                ],

                nervous: [

                  { id: 'cerebral_g', name: 'Cerebral Ganglia', x: 0.50, y: 0.08, fn: 'Paired ganglia above pharynx (segment 3). Process sensory input. "Brain."', clinical: 'Very simple \u2014 a headless earthworm can still burrow, eat, and mate.' },

                  { id: 'ventral_cord', name: 'Ventral Nerve Cord', x: 0.50, y: 0.50, fn: 'Runs entire ventral length. Giant fibers enable rapid escape contraction (20-45 m/s).', clinical: 'Giant axons transmit signals fast \u2014 enabling rapid withdrawal when disturbed.' },

                  { id: 'segmental_g', name: 'Segmental Ganglia', x: 0.48, y: 0.40, fn: 'Paired ganglia per segment. Control local reflexes independently.', clinical: 'Each ganglion controls its segment \u2014 why cut segments still move.' }

                ]

              }

            },

            pig: {

              name: 'Fetal Pig (Sus scrofa)', icon: '\uD83D\uDC37',

              desc: 'Mammal \u2014 4-chambered heart, diaphragm, organ systems nearly identical to human.',

              bodyShape: 'pig',
              objectives: ['Compare the 4-chambered pig heart to a human heart','Identify the diaphragm and explain negative-pressure breathing','Trace the fetal circulatory pathway through the umbilical cord','Locate the spiral colon and compare to human large intestine'],
              specTerms: [
                { term: 'Diaphragm', def: 'Dome-shaped respiratory muscle separating thorax from abdomen; mammalian innovation.' },
                { term: 'Umbilical vein', def: 'Carries oxygenated blood from placenta to fetus through the umbilical cord.' },
                { term: 'Spiral colon', def: 'Uniquely porcine coiled large intestine resembling a watch spring.' },
                { term: 'Urachus', def: 'Fetal canal connecting the bladder to the umbilicus; becomes the median umbilical ligament.' },
                { term: 'Xenotransplantation', def: 'Transplanting organs between species; pig organs are closest to human in size and function.' }
              ],

              layers: [

                { id: 'skin', name: 'Skin', icon: '\uD83E\uDDB4', color: '#fda4af', accent: '#e11d48', desc: 'Thin skin with hair follicles and umbilical cord.' },

                { id: 'muscle', name: 'Musculature', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Mammalian muscles nearly identical to human.' },

                { id: 'organs', name: 'Visceral Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Complete mammalian organs \u2014 closest lab animal to human.' },

                { id: 'skeleton', name: 'Skeleton', icon: '\uD83E\uDDB4', color: 'var(--allo-stem-text, #e2e8f0)', accent: '#94a3b8', desc: 'Largely cartilaginous fetal skeleton.' },

                { id: 'nervous', name: 'Nervous', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'Complex mammalian CNS with cerebral cortex.' }

              ],

              organs: {

                skin: [

                  { id: 'epidermis_p', name: 'Epidermis', x: 0.50, y: 0.35, fn: 'Stratified squamous epithelium. Pig skin is closest animal model to human skin.', clinical: 'Pig skin used in burn treatment research and skin graft studies.' },

                  { id: 'umbilical', name: 'Umbilical Cord', x: 0.50, y: 0.55, fn: '2 umbilical arteries + 1 umbilical vein in Wharton\'s jelly. Same structure as human.', clinical: 'Single umbilical artery may indicate congenital abnormalities in both pigs and humans.' },

                  { id: 'mammary', name: 'Mammary Papillae', x: 0.42, y: 0.60, fn: '6-7 pairs along ventral surface (vs 1 pair in humans). Along embryonic "milk line."', clinical: 'Supernumerary nipples occur in 1-5% of humans along the vestigial milk line.' }

                ],

                muscle: [

                  { id: 'diaphragm_p', name: 'Diaphragm', x: 0.50, y: 0.42, fn: 'Dome separating thorax/abdomen. Primary respiratory muscle. Phrenic nerve (C3-C5). Identical to human.', clinical: 'Diaphragm is a key mammalian innovation \u2014 enables negative-pressure breathing.' },

                  { id: 'masseter_p', name: 'Masseter', x: 0.55, y: 0.12, fn: 'Powerful jaw muscle. Larger than human \u2014 pigs process tough plant material.', clinical: 'Homologous to human masseter \u2014 strongest muscle by weight in both species.' },

                  { id: 'ext_oblique_p', name: 'External Oblique', x: 0.55, y: 0.45, fn: 'Largest abdominal wall muscle. Same function as human external oblique.', clinical: 'Identical innervation pattern to humans \u2014 used in surgical training.' }

                ],

                organs: [

                  { id: 'heart_p', name: 'Heart (4-chamber)', x: 0.50, y: 0.32, fn: '4 chambers identical to human. Complete separation of oxygenated/deoxygenated blood. Coronary arteries present.', clinical: 'Pig heart valves replace human valves in cardiac surgery. Pig-to-human heart xenotransplantation research ongoing.' },

                  { id: 'lungs_p', name: 'Lungs', x: 0.45, y: 0.34, fn: 'Lobed with alveolar structure identical to human. Right: 4 lobes. Left: 2-3 lobes. Pleural membranes.', clinical: 'Pig lungs used for surgical technique practice. Lobation differs slightly from human.' },

                  { id: 'liver_p', name: 'Liver', x: 0.52, y: 0.40, fn: '5 lobes (more lobed than human). Bile production, detoxification, protein synthesis, glycogen storage.', clinical: 'Pig liver studied for xenotransplantation. Functionally identical to human liver.' },

                  { id: 'stomach_p', name: 'Stomach', x: 0.48, y: 0.45, fn: 'Monogastric (simple stomach like human). Cardiac, fundic, pyloric regions. Produces HCl and pepsin.', clinical: 'Unlike ruminants (cows), pigs have simple stomachs like humans \u2014 ideal gastric research model.' },

                  { id: 'sm_int_p', name: 'Small Intestine', x: 0.50, y: 0.55, fn: 'Long (~15m adult). Duodenum, jejunum, ileum. Villi for nutrient absorption.', clinical: 'Proportionally longer than human \u2014 used for surgical anastomosis training.' },

                  { id: 'lg_int_p', name: 'Spiral Colon', x: 0.50, y: 0.62, fn: 'Distinctive spiral colon (coiled). Cecum present. Absorbs water.', clinical: 'Spiral colon is uniquely porcine \u2014 coiled like a watch spring.' },

                  { id: 'kidneys_p', name: 'Kidneys', x: 0.55, y: 0.48, fn: 'Bean-shaped, retroperitoneal. Multipyramidal like human. Filter blood, regulate electrolytes.', clinical: 'Leading xenotransplantation candidates \u2014 closest to human in structure/function.' },

                  { id: 'thymus_p', name: 'Thymus', x: 0.50, y: 0.25, fn: 'Enormous in fetus (much larger than adult). T-cell maturation. Extends from mediastinum into neck.', clinical: 'Fetal thymus demonstrates critical early immune development role.' },

                  { id: 'pancreas_p', name: 'Pancreas', x: 0.52, y: 0.50, fn: 'Exocrine enzymes + endocrine insulin/glucagon. Nearly identical to human.', clinical: 'Porcine insulin treated human diabetes for decades before synthetic insulin.' },

                  { id: 'bladder_p', name: 'Urinary Bladder', x: 0.50, y: 0.68, fn: 'Large distensible organ. Allantoic bladder with urachus in fetus.', clinical: 'Patent urachus is a congenital anomaly in both pigs and humans.' }

                ],

                skeleton: [

                  { id: 'skull_p', name: 'Skull', x: 0.25, y: 0.22, fn: 'Elongated snout. Largely cartilaginous in fetus. Internal anatomy similar to human.', clinical: 'Elongated pig skull vs rounded human skull, but cranial contents are similar.' },

                  { id: 'vert_col_p', name: 'Vertebral Column', x: 0.50, y: 0.38, fn: '7C, 14-15T, 6-7L, 4S, 20-23 caudal. More vertebrae than human. 7 cervical constant across mammals.', clinical: 'Cervical count (7) is constant across nearly all mammals \u2014 giraffe to mouse.' },

                  { id: 'ribs_p', name: 'Ribs', x: 0.55, y: 0.35, fn: '14-15 pairs (vs 12 human). Cartilaginous in fetus. Protect thoracic organs.', clinical: '"Spare ribs" in cooking come from this ventral rib region.' },

                  { id: 'pelvis_p', name: 'Pelvis', x: 0.70, y: 0.42, fn: 'Ilium, ischium, pubis â€” largely cartilaginous in fetus. Same tripartite structure as human pelvis but horizontally oriented for quadrupedal stance.', clinical: 'Pig pelvis is oriented horizontally vs vertically in bipedal humans â€” key comparative anatomy difference.' },

                  { id: 'scapula_p', name: 'Scapula', x: 0.30, y: 0.35, fn: 'Triangular shoulder blade with prominent spine and acromion. Cartilaginous in fetus. Attachment for supraspinatus and infraspinatus muscles.', clinical: 'Pig scapula is more vertically oriented than human â€” adaptation for quadrupedal weight bearing.' },

                  { id: 'humerus_p', name: 'Forelimb Bones', x: 0.35, y: 0.40, fn: 'Humerus (upper), radius and ulna (lower). Articulate with shoulder and carpals. Ulna has prominent olecranon process for triceps attachment.', clinical: 'Pig limb proportions differ from human but bone homology is exact â€” used in orthopedic research.' },

                  { id: 'femur_p', name: 'Hindlimb Bones', x: 0.68, y: 0.42, fn: 'Femur (thigh), tibia and fibula (leg). Terminates in cloven hoof (digits III and IV). Other digits are vestigial dewclaws.', clinical: 'Pig walks on digits III-IV â€” an even-toed ungulate (Artiodactyla). Humans walk on entire foot sole.' },

                  { id: 'sternum_p', name: 'Sternum', x: 0.50, y: 0.40, fn: 'Segmented breastbone with 6-7 sternebrae. Largely cartilaginous in fetus with ossification centers. Ribs articulate laterally.', clinical: 'Segmented pig sternum reveals the fetal ossification process â€” each sternebra starts as cartilage.' }

                ],

                nervous: [

                  { id: 'brain_p', name: 'Brain', x: 0.50, y: 0.08, fn: 'Mammalian brain with sulci/gyri. Large olfactory bulbs. Structure very similar to human.', clinical: 'Pig brains used in neurosurgery training \u2014 closer to human than any common lab animal except primates.' },

                  { id: 'spinal_p', name: 'Spinal Cord', x: 0.50, y: 0.40, fn: 'Full vertebral length in fetus. Cervical/lumbar enlargements. Gray/white matter identical to human.', clinical: 'Spinal cord organization (dorsal sensory, ventral motor) identical to human.' },

                  { id: 'vagus_p', name: 'Vagus Nerve (CN X)', x: 0.48, y: 0.22, fn: 'Longest cranial nerve. Heart, lungs, GI innervation. Runs with carotid/jugular.', clinical: 'Pig vagus nerve studies led to human vagus nerve stimulator implants for epilepsy.' }

                ]

              }

            },



            perch: {

              name: 'Perch (Perca)', icon: '\uD83D\uDC1F',

              desc: 'Bony fish \u2014 gills, swim bladder, lateral line, 2-chambered heart.',

              bodyShape: 'fish',
              objectives: ['Explain countercurrent flow in gill respiration','Trace single-circuit circulation through the 2-chambered heart','Identify the swim bladder and explain buoyancy regulation','Describe the lateral line sensory system'],
              specTerms: [
                { term: 'Operculum', def: 'Bony gill cover that protects gills and actively pumps water for respiration.' },
                { term: 'Countercurrent exchange', def: 'Blood flows opposite to water across gills, maximizing O\u2082 extraction (~80%).' },
                { term: 'Swim bladder', def: 'Gas-filled organ homologous to lungs; provides neutral buoyancy without effort.' },
                { term: 'Lateral line', def: 'Sensory system detecting water pressure changes for navigation and predator detection.' },
                { term: 'Pyloric ceca', def: 'Finger-like pouches at stomach-intestine junction unique to fish; increase absorption area.' }
              ],

              layers: [

                { id: 'skin', name: 'Scales & Skin', icon: '\uD83D\uDFE1', color: '#fde68a', accent: '#d97706', desc: 'Ctenoid scales with mucus coating and lateral line.' },

                { id: 'muscle', name: 'Musculature', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'W-shaped myomeres for undulatory swimming.' },

                { id: 'organs', name: 'Internal Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Swim bladder, gills, 2-chambered heart, pyloric ceca.' },

                { id: 'skeleton', name: 'Skeleton', icon: '\uD83E\uDDB4', color: 'var(--allo-stem-text, #e2e8f0)', accent: '#94a3b8', desc: 'Ossified skeleton with fin rays and operculum.' }

              ],

              organs: {

                skin: [

                  { id: 'scales', name: 'Ctenoid Scales', x: 0.50, y: 0.40, fn: 'Overlapping bony scales with growth rings \u2014 used to determine fish age like tree rings.', clinical: 'Scale annuli counting is the standard method for aging fish in fisheries biology.' },

                  { id: 'lat_line', name: 'Lateral Line', x: 0.50, y: 0.45, fn: 'Sensory system detecting water pressure changes. Enables schooling, predator detection, murky-water navigation.', clinical: 'A "sixth sense" unique to fish/aquatic amphibians \u2014 no equivalent in terrestrial vertebrates.' },

                  { id: 'operculum', name: 'Operculum', x: 0.25, y: 0.35, fn: 'Bony gill cover. Protects gills and pumps water for respiration.', clinical: 'Only bony fish have opercula \u2014 sharks have exposed gill slits.' },

                  { id: 'fins_ext', name: 'Fins (7 types)', x: 0.60, y: 0.25, fn: 'Dorsal (spiny + soft), caudal, anal, pelvic, pectoral. Pectoral/pelvic are homologous to tetrapod limbs.', clinical: 'Fish fins are evolutionary precursors of tetrapod limbs \u2014 pectoral=arms, pelvic=legs.' }

                ],

                muscle: [

                  { id: 'myomeres', name: 'Myomeres', x: 0.50, y: 0.42, fn: 'W-shaped muscle blocks separated by myosepta. Contract in waves for swimming. White (fast) + red (slow) fibers.', clinical: 'Visible as "flakes" in cooked fish \u2014 each flake is one myomere.' },

                  { id: 'epaxial', name: 'Epaxial Muscles', x: 0.50, y: 0.32, fn: 'Dorsal muscle mass above lateral septum. Main swimming power. Bulk of body musculature.', clinical: 'This is the "fillet" \u2014 mostly epaxial muscle, the main edible portion.' }

                ],

                organs: [

                  { id: 'gills', name: 'Gills', x: 0.25, y: 0.38, fn: '4 gill arches with filaments/lamellae. Countercurrent flow extracts 80% of dissolved O\u2082.', clinical: 'Fish gills extract proportionally more oxygen from water than lungs from air.' },

                  { id: 'heart_f', name: 'Heart (2-chamber)', x: 0.22, y: 0.45, fn: '1 atrium + 1 ventricle. Single-circuit circulation: heart\u2192gills\u2192body\u2192heart.', clinical: 'Simplest vertebrate heart. Evolution: 2 (fish) \u2192 3 (amphibian) \u2192 4 (mammal/bird).' },

                  { id: 'swim_bladder', name: 'Swim Bladder', x: 0.50, y: 0.35, fn: 'Gas-filled sac for buoyancy. Closed type \u2014 gas secreted/absorbed via rete mirabile. Neutral buoyancy without effort.', clinical: 'Homologous to the tetrapod lung \u2014 both evolved from pharyngeal outpocketing in ancestral fish.' },

                  { id: 'liver_f', name: 'Liver', x: 0.35, y: 0.42, fn: 'Large lobed organ. Bile production, glycogen/lipid storage.', clinical: 'Fish liver oil is a concentrated energy reserve \u2014 cod liver oil rich in vitamins A and D.' },

                  { id: 'stomach_f', name: 'Stomach', x: 0.40, y: 0.48, fn: 'J-shaped. HCl + pepsin. Expandable for large prey.', clinical: 'Not all fish have stomachs \u2014 carp and minnows lack them entirely.' },

                  { id: 'pyloric_ceca', name: 'Pyloric Ceca', x: 0.42, y: 0.52, fn: 'Finger-like pouches at stomach-intestine junction (3-5 in perch). Increase absorption area.', clinical: 'Unique to fish \u2014 no mammalian homolog. Number used in species identification.' },

                  { id: 'kidneys_f', name: 'Kidneys', x: 0.50, y: 0.30, fn: 'Dark elongated organs along dorsal wall. Head kidney (immune) + trunk kidney (excretion).', clinical: 'Freshwater fish excrete dilute urine \u2014 constantly fighting water influx through gills.' },

                  { id: 'gonads_f', name: 'Gonads', x: 0.50, y: 0.50, fn: 'Paired dorsal organs. External fertilization. Ovaries can be 20-30% of body weight when full.', clinical: 'Enormous reproductive investment \u2014 some fish produce millions of eggs per spawning.' }

                ],

                skeleton: [

                  { id: 'skull_f', name: 'Skull', x: 0.18, y: 0.35, fn: 'Complex with 60+ separate bones \u2014 more than any other vertebrate class.', clinical: 'Fish skulls have the most individual bones of any vertebrate group.' },

                  { id: 'vert_col_f', name: 'Vertebral Column', x: 0.50, y: 0.38, fn: 'Neural arches (spinal cord) + hemal arches (caudal vessels). Trunk + caudal regions only.', clinical: 'No distinct cervical/thoracic/lumbar regions \u2014 the "neck" is a tetrapod innovation.' },

                  { id: 'fin_rays', name: 'Fin Rays', x: 0.55, y: 0.22, fn: 'Spiny (hard, sharp, defense) and soft (segmented, flexible) rays support fin membranes.', clinical: 'Perch spiny rays are sharp enough to puncture skin \u2014 defensive adaptation.' }

                ]

              }

            },

            crayfish: {

              name: 'Crayfish (Cambarus)', icon: '\uD83E\uDD9E',

              desc: 'Crustacean \u2014 exoskeleton, compound eyes, gills, open circulatory system, gastric mill.',

              bodyShape: 'crayfish',
              objectives: ['Compare open circulatory system to closed circulation in vertebrates','Identify the gastric mill and explain post-ingestion grinding','Explain ecdysis (molting) and the role of gastroliths','Describe the compound eye structure and motion detection'],
              specTerms: [
                { term: 'Hemolymph', def: 'Open circulatory fluid combining blood and interstitial fluid; flows through sinuses, not vessels.' },
                { term: 'Ecdysis', def: 'Periodic molting of the exoskeleton to allow growth; animal is vulnerable during hardening.' },
                { term: 'Gastrolith', def: 'Calcium carbonate deposit in the stomach; dissolved during molting to harden new exoskeleton.' },
                { term: 'Ommatidium', def: 'Individual visual unit in compound eyes; ~3,000 per eye, excellent at motion detection.' },
                { term: 'Statocyst', def: 'Balance organ at the base of the antennules containing a sand grain that shifts with gravity.' }
              ],

              layers: [

                { id: 'skin', name: 'Exoskeleton', icon: '\uD83D\uDEE1\uFE0F', color: '#ef4444', accent: '#b91c1c', desc: 'Chitinous shell hardened with calcium carbonate.' },

                { id: 'muscle', name: 'Musculature', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Muscles attached inside exoskeleton.' },

                { id: 'organs', name: 'Internal Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Open circulatory system, gastric mill, green glands.' },

                { id: 'nervous', name: 'Nervous System', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'Ventral nerve cord, compound eyes, antennae.' }

              ],

              organs: {

                skin: [

                  { id: 'carapace', name: 'Carapace', x: 0.40, y: 0.32, fn: 'Fused dorsal shell covering cephalothorax. Chitin + CaCO\u2083. Must molt (ecdysis) to grow.', clinical: 'Soft-shell stage after molting makes them vulnerable \u2014 many crustaceans hide while hardening.' },

                  { id: 'telson', name: 'Telson & Uropods', x: 0.80, y: 0.40, fn: 'Tail fan for escape response ("tail flip"). Swims backward at 2 m/s in milliseconds.', clinical: 'Tail flip is one of the fastest animal movements \u2014 mediated by giant nerve fibers.' },

                  { id: 'chelipeds', name: 'Chelipeds (Claws)', x: 0.18, y: 0.42, fn: 'First walking legs modified into pincers. Defense, feeding, territorial displays. Can regenerate if lost.', clinical: 'Lost claws regenerate over several molts \u2014 remarkable crustacean regenerative ability.' },

                  { id: 'compound_eye', name: 'Compound Eyes', x: 0.22, y: 0.30, fn: '~3,000 ommatidia per eye on moveable stalks. Motion detection specialist.', clinical: 'Compound eyes excel at motion detection but have lower resolution than vertebrate eyes.' }

                ],

                muscle: [

                  { id: 'flexor_m', name: 'Abdominal Flexors', x: 0.65, y: 0.42, fn: 'Powerful ventral muscles for escape tail-flip. Among fastest muscle contractions in animal kingdom.', clinical: 'This is the edible "crawfish tail" \u2014 these flexor muscles are the commercial meat.' },

                  { id: 'extensor_m', name: 'Abdominal Extensors', x: 0.65, y: 0.35, fn: 'Dorsal muscles returning abdomen to rest position. Slower than flexors.', clinical: 'Antagonistic flexor/extensor system works same as in vertebrate limbs.' },

                  { id: 'cheliped_m', name: 'Cheliped Muscles', x: 0.22, y: 0.38, fn: 'Closer (adductor) much larger than opener. Crushing force >50N in large specimens.', clinical: 'Claw joint leverages amplify muscle force \u2014 a biological lever system.' }

                ],

                organs: [

                  { id: 'heart_c', name: 'Heart', x: 0.45, y: 0.30, fn: 'Single-chambered dorsal heart. Open circulatory system \u2014 hemolymph flows through sinuses, not vessels.', clinical: 'Low-pressure open circulation limits crustacean maximum body size.' },

                  { id: 'gills_c', name: 'Gills', x: 0.35, y: 0.30, fn: 'Feather-like gills in branchial chamber. Gill bailer creates water current. Attached to leg bases.', clinical: 'Walking legs ventilate gills \u2014 movement and breathing are linked.' },

                  { id: 'gastric_mill', name: 'Gastric Mill', x: 0.32, y: 0.35, fn: '3 calcified teeth (ossicles) inside stomach. Grind food after swallowing. Gastroliths store calcium for molting.', clinical: '"Teeth in the stomach" \u2014 crustaceans chew food after eating it.' },

                  { id: 'green_gland', name: 'Green Glands', x: 0.25, y: 0.32, fn: 'Excretory organs at antenna base. Filter hemolymph, produce urine. Equivalent of kidneys.', clinical: 'Excrete ammonia directly \u2014 possible because aquatic environments flush waste.' },

                  { id: 'hepato', name: 'Hepatopancreas', x: 0.42, y: 0.38, fn: 'Combined liver + pancreas. Digestive enzymes, nutrient absorption, energy storage. Largest internal organ.', clinical: 'Called "tomalley" in lobster cuisine. Accumulates toxins in polluted waters.' },

                  { id: 'gonads_c', name: 'Gonads', x: 0.50, y: 0.35, fn: 'Dorsal to hepatopancreas. Females carry eggs on swimmerets ("berried" females).', clinical: 'Males identified by modified first swimmerets (gonopods) for sperm transfer.' }

                ],

                nervous: [

                  { id: 'brain_c', name: 'Supraesophageal Ganglion', x: 0.25, y: 0.30, fn: 'Fused ganglia above esophagus. Processes eyes, antennae input. Supports learning and social hierarchies.', clinical: 'Simple brain but complex behavior \u2014 crayfish establish dominance hierarchies.' },

                  { id: 'ventral_c', name: 'Ventral Nerve Cord', x: 0.50, y: 0.42, fn: 'Double cord with giant fibers mediating escape. Segmental ganglia control appendages.', clinical: 'Crayfish giant axons were foundational to neuroscience \u2014 among first where action potentials recorded.' },

                  { id: 'antennae_n', name: 'Antennae & Antennules', x: 0.18, y: 0.32, fn: 'Long pair: touch/taste. Short pair: chemoreception + balance (statocyst).', clinical: 'Classic experiment: iron filings in statocyst + magnet = inverted orientation.' }

                ]

              }

            },

            sheepEye: {

              name: 'Sheep Eye', icon: '\uD83D\uDC41\uFE0F',

              desc: 'Organ dissection \u2014 camera-type eye with lens, retina, vitreous humor. Nearly identical to human.',

              bodyShape: 'eye',
              objectives: ['Trace the path of light through the eye from cornea to retina','Explain accommodation and the role of the ciliary body','Compare the tapetum lucidum in sheep to the human eye','Identify the blind spot and explain why it exists'],
              specTerms: [
                { term: 'Accommodation', def: 'Process by which the ciliary muscle changes lens shape to focus on near or far objects.' },
                { term: 'Tapetum lucidum', def: 'Reflective layer behind the retina enhancing night vision; absent in humans.' },
                { term: 'Human fovea comparison', def: 'Humans use a cone-dense fovea for sharp central vision; sheep retinal specialization differs and should not be treated as identical.' },
                { term: 'Aqueous humor', def: 'Clear fluid in the anterior chamber; produced by ciliary body, drains via trabecular meshwork.' },
                { term: 'Vitreous humor', def: 'Clear gel filling the posterior 80% of the eye; maintains shape, does not regenerate.' }
              ],

              layers: [

                { id: 'skin', name: 'External', icon: '\uD83D\uDC41\uFE0F', color: '#93c5fd', accent: '#2563eb', desc: 'Outer structures: cornea, sclera, muscles, optic nerve.' },

                { id: 'organs', name: 'Internal', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Internal structures: lens, iris, retina, humors.' }

              ],

              organs: {

                skin: [

                  { id: 'cornea', name: 'Cornea', x: 0.30, y: 0.45, fn: 'Transparent anterior surface. Provides 2/3 of refractive power. Avascular \u2014 nourished by aqueous humor and tears. 5 layers.', clinical: 'LASIK reshapes the cornea with laser. Corneal transplants are the most common transplant surgery worldwide.' },

                  { id: 'sclera', name: 'Sclera', x: 0.70, y: 0.45, fn: 'Tough white outer coat. Dense connective tissue protecting eye contents. Attachment for extraocular muscles. "White of the eye."', clinical: 'Yellow sclera (scleral icterus) = jaundice from liver disease. Blue sclera = osteogenesis imperfecta.' },

                  { id: 'optic_nerve', name: 'Optic Nerve', x: 0.82, y: 0.50, fn: '~1.2 million retinal ganglion cell axons. Exits at optic disc (blind spot). Surrounded by meninges extension.', clinical: 'Optic disc has no photoreceptors = blind spot. Papilledema (optic disc swelling) = increased intracranial pressure.' },

                  { id: 'ext_muscles', name: 'Extraocular Muscles', x: 0.75, y: 0.30, fn: '6 muscles control eye movement: 4 rectus (sup/inf/med/lat) + 2 oblique (sup/inf). Cranial nerves III, IV, VI.', clinical: 'CN III palsy: eye "down and out," ptosis. CN IV: difficulty looking down stairs. CN VI: medial deviation.' },

                  { id: 'conjunctiva', name: 'Conjunctiva', x: 0.35, y: 0.30, fn: 'Thin mucous membrane lining eyelids (palpebral) and covering sclera (bulbar). Produces mucin for tear film.', clinical: 'Conjunctivitis ("pink eye") = inflamed conjunctiva. Subconjunctival hemorrhage looks alarming but is usually benign.' },

                  { id: 'fat_pad', name: 'Orbital Fat', x: 0.70, y: 0.65, fn: 'Cushions and insulates the eye within the orbit. Acts as shock absorber.', clinical: 'Orbital fat atrophy causes sunken eyes (enophthalmos). Graves disease causes fat expansion \u2192 proptosis.' }

                ],

                organs: [

                  { id: 'iris', name: 'Iris & Pupil', x: 0.35, y: 0.45, fn: 'Pigmented muscular diaphragm. Dilator (sympathetic) and sphincter (parasympathetic) muscles control pupil size. Regulates light entry.', clinical: 'Anisocoria (unequal pupils): may indicate CN III palsy, Horner syndrome, or elevated ICP. Iris color from melanin amount.' },

                  { id: 'lens', name: 'Crystalline Lens', x: 0.42, y: 0.45, fn: 'Biconvex, transparent, avascular. Changes shape for focusing (accommodation). Held by zonular fibers attached to ciliary body. Contains crystallin proteins.', clinical: 'Cataracts = lens clouding (most common surgery worldwide). Presbyopia = lens stiffening with age.' },

                  { id: 'ciliary_body', name: 'Ciliary Body', x: 0.38, y: 0.35, fn: 'Ring of muscle + epithelium. Ciliary muscle changes lens shape for focusing. Epithelium produces aqueous humor.', clinical: 'Glaucoma: excess aqueous humor \u2192 increased IOP \u2192 optic nerve damage. Treated with drugs reducing production.' },

                  { id: 'retina', name: 'Retina', x: 0.65, y: 0.45, fn: 'Neural sensory tissue containing rods and cones. In the sheep specimen, observe the retina as a delicate layer against the choroid; avoid applying human fovea and macula measurements directly to sheep anatomy.', clinical: 'Retinal detachment = surgical emergency. Diabetic retinopathy. Macular degeneration = leading cause of blindness in elderly.' },

                  { id: 'tapetum', name: 'Tapetum Lucidum', x: 0.65, y: 0.55, fn: 'Reflective layer behind retina in sheep (absent in humans). Reflects light back through retina for enhanced night vision. Causes "eyeshine."', clinical: 'Present in many animals (cats, dogs, sheep) but not humans or pigs. This is why animal eyes glow in headlights.' },

                  { id: 'vitreous', name: 'Vitreous Humor', x: 0.55, y: 0.45, fn: 'Clear gel filling posterior 80% of eye. Maintains eye shape. 99% water + collagen + hyaluronic acid. Does not regenerate.', clinical: 'Floaters = collagen clumps in vitreous. Posterior vitreous detachment common with aging.' },

                  { id: 'aqueous', name: 'Aqueous Humor', x: 0.33, y: 0.50, fn: 'Clear fluid in anterior/posterior chambers (in front of lens). Produced by ciliary body, drains via trabecular meshwork at angle.', clinical: 'Blocked drainage \u2192 increased IOP \u2192 glaucoma. Acute angle-closure = emergency.' },

                  { id: 'choroid', name: 'Choroid', x: 0.60, y: 0.35, fn: 'Vascular layer between sclera and retina. Blood supply for outer retina. Heavily pigmented to absorb stray light.', clinical: 'Choroidal melanoma is the most common primary intraocular malignancy in adults.' }

                ]

              }

            },

            sheepHeart: {

              name: 'Sheep Heart', icon: '\u2764\uFE0F',

              desc: 'Organ dissection \u2014 a four-chambered mammalian heart with a body plan useful for comparison to humans. Vessel branching, size, rate, and pressure remain species-specific.',

              bodyShape: 'heart',
              objectives: ['Trace blood flow through all four chambers and valves','Distinguish the coronary arteries and explain myocardial blood supply','Compare wall thickness of left vs right ventricles','Identify the conduction system pathway from SA node to Purkinje fibers'],
              specTerms: [
                { term: 'Chordae tendineae', def: 'Fibrous cords connecting AV valve leaflets to papillary muscles, preventing prolapse.' },
                { term: 'Coronary sinus', def: 'Large venous channel collecting deoxygenated blood from the heart muscle itself.' },
                { term: 'Purkinje fibers', def: 'Specialized conduction cells distributing electrical impulse to ventricular myocardium.' },
                { term: 'Papillary muscle', def: 'Muscular projections anchoring chordae tendineae; contract during systole to keep valves closed.' },
                { term: 'Pericardium', def: 'Double-walled sac enclosing the heart; fibrous outer layer and serous inner layer with lubricating fluid.' }
              ],

              layers: [

                { id: 'skin', name: 'External', icon: '\u2764\uFE0F', color: '#fca5a5', accent: '#dc2626', desc: 'Pericardium, great vessels, coronary arteries, surface anatomy.' },

                { id: 'organs', name: 'Internal', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Chambers, valves, septum, chordae tendineae.' }

              ],

              organs: {

                skin: [

                  { id: 'pericardium', name: 'Pericardium', x: 0.50, y: 0.30, fn: 'Double-walled sac enclosing heart. Fibrous (outer, tough) and serous (inner, 2 layers with fluid). Anchors heart. 15-50mL pericardial fluid reduces friction.', clinical: 'Pericarditis: inflammation causing chest pain. Cardiac tamponade: fluid compresses heart = emergency. Beck triad: hypotension, JVD, muffled sounds.' },

                  { id: 'aorta_h', name: 'Aorta', x: 0.45, y: 0.15, fn: 'Largest artery. The ascending aorta exits the left ventricle and distributes oxygenated blood to the body. Aortic-arch branch patterns differ between sheep and humans.', clinical: 'Aortic aneurysm: >5.5cm \u2192 surgical repair risk. Aortic dissection: tearing pain, emergency surgery.' },

                  { id: 'pulm_trunk', name: 'Pulmonary Trunk', x: 0.55, y: 0.18, fn: 'Exits RV, bifurcates into R and L pulmonary arteries carrying deoxygenated blood to lungs. Only arteries carrying deoxy blood.', clinical: 'Pulmonary embolism: clot lodges here. Saddle PE across bifurcation is life-threatening.' },

                  { id: 'coronary_aa', name: 'Coronary Arteries', x: 0.40, y: 0.40, fn: 'Left main \u2192 LAD + circumflex. Right coronary artery (RCA). Supply myocardium with oxygenated blood. First aortic branches.', clinical: 'LAD = "widow maker." Coronary artery disease is #1 cause of death. CABG bypasses blockages using vein/artery grafts.' },

                  { id: 'sup_vena_h', name: 'Cranial (Superior) Vena Cava', x: 0.55, y: 0.12, fn: 'Returns deoxygenated blood from upper body to RA. Formed by brachiocephalic veins.', clinical: 'SVC syndrome from lung cancer: facial swelling and dyspnea.' },

                  { id: 'inf_vena_h', name: 'Caudal (Inferior) Vena Cava', x: 0.55, y: 0.70, fn: 'Returns blood from lower body to RA. Largest vein.', clinical: 'IVC filter prevents PE from DVT. Compression in pregnancy causes supine hypotension.' },

                  { id: 'apex', name: 'Apex', x: 0.45, y: 0.75, fn: 'Inferior tip of heart formed by LV. Points left and anterior. PMI (point of maximum impulse) at 5th intercostal space, midclavicular line.', clinical: 'Displaced PMI = ventricular enlargement. PMI palpation is key clinical exam finding.' }

                ],

                organs: [

                  { id: 'ra', name: 'Right Atrium', x: 0.60, y: 0.38, fn: 'Receives deoxygenated blood from SVC (upper body), IVC (lower body), and coronary sinus (heart). Thin-walled. SA node here sets heart rhythm.', clinical: 'SA node = "pacemaker of the heart" \u2014 sets sinus rhythm at 60-100 bpm. Atrial fibrillation: chaotic atrial activity.' },

                  { id: 'rv', name: 'Right Ventricle', x: 0.55, y: 0.55, fn: 'Pumps blood to the lungs through the pulmonary trunk. Its wall is thinner than the left ventricle because it works against lower pulmonary resistance; exact pressures vary by species and condition.', clinical: 'RV failure from pulmonary hypertension or massive PE. RV infarction from RCA occlusion.' },

                  { id: 'la', name: 'Left Atrium', x: 0.45, y: 0.35, fn: 'Receives oxygenated blood from 4 pulmonary veins. Smooth walled. Left atrial appendage is common site of thrombus formation in AFib.', clinical: 'Atrial appendage clots in AFib = stroke risk. Anticoagulation or appendage occlusion devices prevent this.' },

                  { id: 'lv', name: 'Left Ventricle', x: 0.42, y: 0.55, fn: 'The thick-walled systemic pump. It sends oxygenated blood through the aorta; its muscular wall is substantially thicker than the right ventricle. Exact pressure values vary by species and condition.', clinical: 'LV hypertrophy from chronic hypertension or aortic stenosis. LV ejection fraction (normal 55-70%) = key cardiac metric.' },

                  { id: 'tricuspid', name: 'Tricuspid Valve', x: 0.58, y: 0.45, fn: 'AV valve with 3 cusps between RA and RV. Chordae tendineae attach to papillary muscles preventing prolapse during systole.', clinical: 'Tricuspid regurgitation: blood leaks backward. Endocarditis in IV drug users often affects tricuspid.' },

                  { id: 'mitral', name: 'Mitral (Bicuspid) Valve', x: 0.43, y: 0.42, fn: 'AV valve with 2 cusps between LA and LV. Most commonly affected valve in rheumatic heart disease. "Bicuspid" = 2 leaflets.', clinical: 'Mitral stenosis from rheumatic fever. Mitral valve prolapse (MVP) in 2-3% of population. "Lub" = AV valves closing.' },

                  { id: 'aortic_v', name: 'Aortic Valve', x: 0.45, y: 0.25, fn: '3 semilunar cusps at LV-aorta junction. Opens during systole for ejection. Coronary ostia just above valve.', clinical: 'Aortic stenosis: calcified valve \u2192 syncope, angina, HF. "Dub" = semilunar valves closing. Bicuspid aortic valve (1-2% prevalence).' },

                  { id: 'pulm_v', name: 'Pulmonary Valve', x: 0.55, y: 0.28, fn: '3 semilunar cusps at RV-pulmonary trunk junction. Prevents backflow into RV during diastole.', clinical: 'Pulmonary stenosis: congenital narrowing (part of Tetralogy of Fallot). Least commonly affected valve.' },

                  { id: 'septum', name: 'Interventricular Septum', x: 0.48, y: 0.52, fn: 'Muscular wall separating L and R ventricles. Thick muscular portion + thin membranous portion. LAD supplies anterior septum.', clinical: 'VSD (ventricular septal defect): most common congenital heart defect. Septal MI from LAD occlusion.' },

                  { id: 'chordae', name: 'Chordae Tendineae', x: 0.50, y: 0.48, fn: '"Heart strings" \u2014 fibrous cords connecting AV valve leaflets to papillary muscles. Prevent valve prolapse during ventricular contraction.', clinical: 'Ruptured chordae = sudden severe valve regurgitation = acute heart failure. Can occur in endocarditis or MI.' },

                  { id: 'conduction', name: 'Conduction System', x: 0.52, y: 0.42, fn: 'SA node \u2192 AV node \u2192 atrioventricular bundle \u2192 right and left bundle branches \u2192 Purkinje fibers. This pathway coordinates contraction; normal rates differ between sheep and humans.', clinical: 'Heart blocks: 1st degree (delayed), 2nd degree (dropped beats), 3rd degree (complete dissociation). Pacemaker implantation.' }

                ]

              }

            }

          };





          // â•â•â•â•â•â•â•â• ACTIVE STATE â•â•â•â•â•â•â•â•

          var specimen = d.specimen || 'frog';

          var spec = SPECIMENS[specimen];

          if (!spec) { specimen = 'frog'; spec = SPECIMENS['frog']; }

          var activeLayer = d.activeLayer || (spec.layers[0] || {}).id || 'skin';

          var revealedLayers = d.revealedLayers || {};

          var currentLayerIdx = spec.layers.findIndex(function (l) { return l.id === activeLayer; });

          if (currentLayerIdx < 0) currentLayerIdx = 0;

          var organs = (spec.organs[activeLayer] || []);

          var sel = d.selectedOrgan ? organs.find(function (o) { return o.id === d.selectedOrgan; }) : null;

          var guidedStep = d.guidedStep || 0;

          var guidedMode = d.guidedMode || false;

          var PROCEDURE_INSTRUMENTS = [
            { id: 'probe', label: 'Probe', icon: '\u2022', help: 'Trace and identify a visible structure.' },
            { id: 'forceps', label: 'Forceps', icon: '\u2195', help: 'Lift and retract the opened layer.' },
            { id: 'scalpel', label: 'Scalpel', icon: '\u2712', help: 'Create the first shallow guided incision.' },
            { id: 'scissors', label: 'Scissors', icon: '\u2702', help: 'Extend an opening that has already been started.' },
            { id: 'pin', label: 'Pins', icon: '\u25C6', help: 'Hold retracted tissue so structures remain visible.' }
          ];
          if (spec.bodyShape === 'eye') {
            PROCEDURE_INSTRUMENTS.push({ id: 'dropper', label: 'Dropper', icon: '\u25C9', help: 'Clear the simulated viewing surface with a controlled drop.' });
          }
          var specimenTrayNote = spec.bodyShape === 'eye'
            ? 'Eye tray: probe, forceps, shallow cutting tools, pins, and an optional viewing-surface dropper.'
            : (spec.bodyShape === 'heart'
              ? 'Heart tray: blunt probing is emphasized for tracing chambers and vessels before opening a layer.'
              : 'Comparative tray: inspect and probe before using shallow access tools.');
          var PROCEDURE_STEPS = [
            { id: 'inspect', label: 'Inspect' }, { id: 'scalpel', label: 'Incise' },
            { id: 'scissors', label: 'Extend' }, { id: 'forceps', label: 'Retract' },
            { id: 'pin', label: 'Pin' }, { id: 'probe', label: 'Probe' }
          ];
          var activeInstrument = d.activeInstrument || 'probe';
          var procedureMode = d.procedureMode || 'guided';
          var visualRealism = d.visualRealism || 'guided';
          var labLight = d.labLight || 'neutral';
          var inspectionLens = !!d.inspectionLens;
          var instrumentVisuals = d.instrumentVisuals !== false;
          var macroInset = d.macroInset !== false;
          var sceneDetail = d.sceneDetail !== false;
          var relationshipMotion = d.relationshipMotion !== false;
          var focusMode = d.focusMode !== false;
          var parallaxDepth = d.parallaxDepth !== false;
          var visualEvidence = Array.isArray(d.visualEvidence) ? d.visualEvidence.filter(function (entry) { return entry && entry.image; }).slice(-6) : [];
          var splitComparison = !!d.splitComparison;
          var lightDirection = ['overhead', 'left', 'right', 'raking'].indexOf(d.lightDirection) >= 0 ? d.lightDirection : 'overhead';
          var variationSeed = Number(d.variationSeed) || 1;
          var anatomicalView = ['dorsal', 'ventral', 'lateral', 'internal'].indexOf(d.anatomicalView) >= 0 ? d.anatomicalView : 'dorsal';
          var crossSectionMode = !!d.crossSectionMode;
          var specimenCondition = ['standard', 'preserved', 'dehydrated', 'cloudy', 'swollen'].indexOf(d.specimenCondition) >= 0 ? d.specimenCondition : 'standard';
          var relationshipMode = !!d.relationshipMode;
          var renderQuality = ['auto', 'high', 'balanced'].indexOf(d.renderQuality) >= 0 ? d.renderQuality : 'auto';
          var procedureScenario = d.procedureScenario || 'precision-access';
          var instructorTarget = Math.max(60, Math.min(95, Number(d.instructorTarget) || 75));
          var instructorMaxCautions = Math.max(0, Math.min(3, Number(d.instructorMaxCautions) || 1));
          var instructorRequiredStructures = Math.max(1, Math.min(5, Number(d.instructorRequiredStructures) || 2));
          var procedureByLayer = d.procedureByLayer || {};
          var currentProcedure = Object.assign({
            inspected: false, incisionStarted: false, incisionExtended: false,
            retracted: false, pins: [], probed: false, errors: 0, history: [], actionLog: [], cautionLog: []
          }, procedureByLayer[activeLayer] || {});

          var CURATED_ANATOMY_RELATIONSHIPS = {
            frog: [
              { from: 'heart', to: 'lungs', type: 'circulation', forward: 'pumps blood toward', reverse: 'return blood toward' },
              { from: 'liver', to: 'gallbladder', type: 'biliary', forward: 'produces bile stored by', reverse: 'stores bile produced by' },
              { from: 'stomach', to: 'sm_intestine', type: 'digestive flow', forward: 'empties into', reverse: 'receives digesta from' },
              { from: 'sm_intestine', to: 'lg_intestine', type: 'digestive flow', forward: 'continues into', reverse: 'receives material from' },
              { from: 'pancreas', to: 'sm_intestine', type: 'secretion', forward: 'delivers digestive secretions to', reverse: 'receives digestive secretions from' },
              { from: 'kidneys', to: 'cloaca', type: 'excretion', forward: 'drain waste toward', reverse: 'receives urinary waste from' },
              { from: 'brain', to: 'spinal_cord', type: 'neural continuity', forward: 'continues into', reverse: 'continues cranially into' },
              { from: 'spinal_cord', to: 'sciatic_n', type: 'neural branching', forward: 'gives rise to pathways including', reverse: 'connects proximally toward' },
              { from: 'skull', to: 'brain', type: 'protection', forward: 'encloses and protects', reverse: 'is enclosed by' },
              { from: 'femur', to: 'tibiofibula', type: 'joint', forward: 'articulates with', reverse: 'articulates with' }
            ],
            worm: [
              { from: 'pharynx', to: 'crop', type: 'digestive flow', forward: 'moves food toward', reverse: 'receives food from' },
              { from: 'crop', to: 'gizzard', type: 'digestive flow', forward: 'passes stored food to', reverse: 'receives stored food from' },
              { from: 'gizzard', to: 'intestine', type: 'digestive flow', forward: 'passes ground food to', reverse: 'receives ground food from' },
              { from: 'cerebral_g', to: 'ventral_cord', type: 'neural continuity', forward: 'connects with', reverse: 'connects anteriorly with' },
              { from: 'ventral_cord', to: 'segmental_g', type: 'neural branching', forward: 'links the repeated', reverse: 'connect with' },
              { from: 'circular_m', to: 'longitudinal_m', type: 'antagonistic muscles', forward: 'works antagonistically with', reverse: 'works antagonistically with' },
              { from: 'setae', to: 'longitudinal_m', type: 'locomotion', forward: 'anchor movement generated with', reverse: 'generates movement stabilized by' },
              { from: 'clitellum', to: 'seminal_v', type: 'reproduction', forward: 'functions reproductively with', reverse: 'functions reproductively with' }
            ],
            pig: [
              { from: 'heart_p', to: 'lungs_p', type: 'pulmonary circulation', forward: 'pumps blood toward', reverse: 'return oxygenated blood toward' },
              { from: 'diaphragm_p', to: 'lungs_p', type: 'respiration', forward: 'changes thoracic pressure around', reverse: 'expand as pressure changes from' },
              { from: 'stomach_p', to: 'sm_int_p', type: 'digestive flow', forward: 'empties into', reverse: 'receives digesta from' },
              { from: 'sm_int_p', to: 'lg_int_p', type: 'digestive flow', forward: 'continues into', reverse: 'receives material from' },
              { from: 'pancreas_p', to: 'sm_int_p', type: 'secretion', forward: 'delivers digestive secretions to', reverse: 'receives digestive secretions from' },
              { from: 'kidneys_p', to: 'bladder_p', type: 'urinary flow', forward: 'drain urine toward', reverse: 'stores urine produced by' },
              { from: 'brain_p', to: 'spinal_p', type: 'neural continuity', forward: 'continues into', reverse: 'continues cranially into' },
              { from: 'brain_p', to: 'vagus_p', type: 'autonomic nerve', forward: 'gives rise to pathways including', reverse: 'connects to the brainstem within' },
              { from: 'ribs_p', to: 'sternum_p', type: 'thoracic support', forward: 'attach ventrally toward', reverse: 'anchors anterior portions of' },
              { from: 'scapula_p', to: 'humerus_p', type: 'joint', forward: 'articulates with', reverse: 'articulates with' },
              { from: 'pelvis_p', to: 'femur_p', type: 'joint', forward: 'articulates with', reverse: 'articulates with' }
            ],
            fish: [
              { from: 'heart_f', to: 'gills', type: 'circulation', forward: 'pumps blood toward', reverse: 'oxygenate blood returning toward' },
              { from: 'operculum', to: 'gills', type: 'protection and ventilation', forward: 'covers and helps ventilate', reverse: 'are covered by' },
              { from: 'stomach_f', to: 'pyloric_ceca', type: 'digestion', forward: 'passes digesta near', reverse: 'receive digesta near' },
              { from: 'liver_f', to: 'stomach_f', type: 'digestive support', forward: 'supports digestion adjacent to', reverse: 'lies functionally near' },
              { from: 'scales', to: 'lat_line', type: 'sensory surface', forward: 'surround the sensory pathway of', reverse: 'passes through the scale field of' },
              { from: 'vert_col_f', to: 'fin_rays', type: 'axial support', forward: 'supports movement coordinated with', reverse: 'transmit forces toward' },
              { from: 'swim_bladder', to: 'kidneys_f', type: 'dorsal adjacency', forward: 'lies ventral to', reverse: 'lie dorsal to' }
            ],
            crayfish: [
              { from: 'heart_c', to: 'gills_c', type: 'circulation', forward: 'circulates hemolymph associated with', reverse: 'oxygenate hemolymph returning toward' },
              { from: 'gastric_mill', to: 'hepato', type: 'digestion', forward: 'processes food before support from', reverse: 'provides digestive support after' },
              { from: 'brain_c', to: 'ventral_c', type: 'neural continuity', forward: 'connects with', reverse: 'connects anteriorly with' },
              { from: 'ventral_c', to: 'antennae_n', type: 'sensory neural pathway', forward: 'integrates sensory signals including', reverse: 'carry sensory signals toward' },
              { from: 'flexor_m', to: 'extensor_m', type: 'antagonistic muscles', forward: 'works antagonistically with', reverse: 'works antagonistically with' },
              { from: 'cheliped_m', to: 'chelipeds', type: 'attachment', forward: 'moves', reverse: 'are moved by' },
              { from: 'carapace', to: 'gills_c', type: 'protection', forward: 'covers and protects', reverse: 'lie protected beneath' }
            ],
            eye: [
              { from: 'cornea', to: 'aqueous', type: 'optical pathway', forward: 'refracts light into', reverse: 'lies immediately behind' },
              { from: 'aqueous', to: 'lens', type: 'optical pathway', forward: 'transmits light toward', reverse: 'receives light through' },
              { from: 'iris', to: 'lens', type: 'aperture control', forward: 'regulates light reaching', reverse: 'receives regulated light through' },
              { from: 'ciliary_body', to: 'lens', type: 'accommodation', forward: 'changes the shape of', reverse: 'is shaped by' },
              { from: 'lens', to: 'retina', type: 'optical pathway', forward: 'focuses light onto', reverse: 'receives focused light from' },
              { from: 'retina', to: 'optic_nerve', type: 'neural transmission', forward: 'sends visual signals through', reverse: 'carries signals from' },
              { from: 'choroid', to: 'retina', type: 'vascular support', forward: 'supports and nourishes', reverse: 'is supported by' },
              { from: 'sclera', to: 'ext_muscles', type: 'attachment', forward: 'provides attachment for', reverse: 'attach to' },
              { from: 'vitreous', to: 'retina', type: 'structural support', forward: 'supports the inner surface near', reverse: 'is supported internally by' },
              { from: 'tapetum', to: 'retina', type: 'light reflection', forward: 'reflects light back through', reverse: 'receives reflected light from' }
            ],
            heart: [
              { from: 'sup_vena_h', to: 'ra', type: 'blood flow', forward: 'drains into', reverse: 'receives blood from' },
              { from: 'inf_vena_h', to: 'ra', type: 'blood flow', forward: 'drains into', reverse: 'receives blood from' },
              { from: 'ra', to: 'tricuspid', type: 'blood flow', forward: 'passes blood through', reverse: 'controls flow from' },
              { from: 'tricuspid', to: 'rv', type: 'blood flow', forward: 'opens into', reverse: 'receives blood through' },
              { from: 'rv', to: 'pulm_v', type: 'blood flow', forward: 'ejects blood through', reverse: 'controls outflow from' },
              { from: 'pulm_v', to: 'pulm_trunk', type: 'blood flow', forward: 'opens into', reverse: 'receives blood through' },
              { from: 'la', to: 'mitral', type: 'blood flow', forward: 'passes blood through', reverse: 'controls flow from' },
              { from: 'mitral', to: 'lv', type: 'blood flow', forward: 'opens into', reverse: 'receives blood through' },
              { from: 'lv', to: 'aortic_v', type: 'blood flow', forward: 'ejects blood through', reverse: 'controls outflow from' },
              { from: 'aortic_v', to: 'aorta_h', type: 'blood flow', forward: 'opens into', reverse: 'receives blood through' },
              { from: 'aorta_h', to: 'coronary_aa', type: 'coronary supply', forward: 'gives rise to', reverse: 'originate from' },
              { from: 'chordae', to: 'mitral', type: 'valve support', forward: 'stabilize', reverse: 'is stabilized by' },
              { from: 'chordae', to: 'tricuspid', type: 'valve support', forward: 'stabilize', reverse: 'is stabilized by' },
              { from: 'septum', to: 'rv', type: 'separation', forward: 'separates from the left ventricle', reverse: 'is separated from the left ventricle by' },
              { from: 'conduction', to: 'ra', type: 'electrical control', forward: 'initiates coordinated activity near', reverse: 'contains the primary pacemaker region of' }
            ]
          };
          var VIEW_OCCLUSIONS = {
            frog: { dorsal: ['ventral_skin', 'rectus_abd', 'liver', 'stomach', 'sm_intestine', 'lg_intestine'], ventral: ['dorsal_skin', 'kidneys', 'brain', 'spinal_cord', 'vertebral_col'], lateral: ['rectus_abd', 'pectoral_gird', 'pelvic_girdle'], internal: ['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating'] },
            worm: { dorsal: ['setae'], ventral: ['cerebral_g'], lateral: ['aortic_arches', 'seminal_v'], internal: ['cuticle', 'setae'] },
            pig: { dorsal: ['umbilical', 'mammary', 'stomach_p', 'sm_int_p', 'lg_int_p', 'bladder_p'], ventral: ['vert_col_p', 'brain_p', 'spinal_p'], lateral: ['kidneys_p', 'thymus_p'], internal: ['epidermis_p', 'mammary'] },
            fish: { dorsal: ['gills', 'heart_f', 'liver_f', 'stomach_f'], ventral: ['swim_bladder', 'kidneys_f', 'vert_col_f'], lateral: [], internal: ['scales', 'lat_line', 'operculum'] },
            crayfish: { dorsal: ['gills_c', 'green_gland', 'ventral_c'], ventral: ['heart_c', 'carapace'], lateral: ['green_gland', 'gonads_c'], internal: ['carapace', 'telson'] },
            eye: { dorsal: ['retina', 'choroid', 'tapetum'], ventral: ['optic_nerve', 'retina'], lateral: ['fat_pad', 'conjunctiva'], internal: ['ext_muscles', 'conjunctiva', 'fat_pad'] },
            heart: { dorsal: ['rv', 'tricuspid', 'pulm_v'], ventral: ['la', 'mitral'], lateral: ['septum', 'conduction'], internal: ['pericardium', 'coronary_aa'] }
          };
          var VIEW_LANDMARK_OFFSETS = {
            frog: { ventral: { liver: [-0.015, 0.025], heart: [0, 0.018], stomach: [0.018, 0.02] }, lateral: { lungs: [0.035, -0.025], heart: [-0.018, 0], kidneys: [0.02, 0.025] }, internal: { brain: [0, -0.018], liver: [-0.02, 0.012], sm_intestine: [0.025, 0.025] } },
            worm: { ventral: { ventral_cord: [0, 0.018], segmental_g: [0.018, 0] }, lateral: { crop: [-0.025, 0], gizzard: [0.025, 0] }, internal: { aortic_arches: [-0.02, -0.012], intestine: [0.02, 0.012] } },
            pig: { ventral: { heart_p: [0, 0.018], liver_p: [-0.02, 0.025], stomach_p: [0.02, 0.025] }, lateral: { lungs_p: [0.025, -0.02], kidneys_p: [0.03, 0.025] }, internal: { brain_p: [0, -0.02], sm_int_p: [0.025, 0.02] } },
            fish: { ventral: { heart_f: [-0.02, 0.018], liver_f: [0.02, 0.02] }, lateral: { gills: [-0.025, 0], swim_bladder: [0.025, -0.02] }, internal: { stomach_f: [-0.02, 0.02], pyloric_ceca: [0.025, 0.015] } },
            crayfish: { ventral: { ventral_c: [0, 0.02], green_gland: [-0.018, 0] }, lateral: { heart_c: [0.02, -0.02], gills_c: [-0.02, 0.02] }, internal: { gastric_mill: [-0.02, 0], hepato: [0.025, 0.02] } },
            eye: { ventral: { optic_nerve: [0.025, 0], retina: [-0.015, 0.018] }, lateral: { lens: [0.025, 0], retina: [-0.025, 0] }, internal: { lens: [-0.02, 0], retina: [0.025, 0], optic_nerve: [0.03, 0.01] } },
            heart: { ventral: { rv: [0.02, 0.018], lv: [-0.018, 0.018] }, lateral: { ra: [-0.025, 0], la: [0.025, 0], septum: [0, 0.02] }, internal: { tricuspid: [-0.02, 0.015], mitral: [0.02, 0.015], chordae: [0, 0.03] } }
          };
          var SPECIMEN_MATERIAL_PROFILES = {
            frog: { pattern: 'chromatophores', label: 'moist chromatophore surface', cx: 0.50, cy: 0.49, rx: 0.25, ry: 0.35, density: 34 },
            worm: { pattern: 'segments', label: 'segmented iridescent cuticle', cx: 0.50, cy: 0.49, rx: 0.095, ry: 0.39, density: 28 },
            pig: { pattern: 'follicles', label: 'fine follicle and connective surface', cx: 0.50, cy: 0.49, rx: 0.35, ry: 0.23, density: 38 },
            fish: { pattern: 'scales', label: 'overlapping reflective scales', cx: 0.50, cy: 0.48, rx: 0.37, ry: 0.19, density: 42 },
            crayfish: { pattern: 'facets', label: 'jointed chitin microfacets', cx: 0.50, cy: 0.48, rx: 0.35, ry: 0.21, density: 32 },
            eye: { pattern: 'radial', label: 'translucent corneal and scleral layers', cx: 0.50, cy: 0.48, rx: 0.26, ry: 0.25, density: 24 },
            heart: { pattern: 'fibers', label: 'directional myocardial fibers', cx: 0.50, cy: 0.50, rx: 0.23, ry: 0.28, density: 30 }
          };          function allSpecimenStructures() {
            return Object.keys(spec.organs || {}).reduce(function (all, layerId) { return all.concat(spec.organs[layerId] || []); }, []);
          }
          function viewOrganVisibility(org) {
            var shapeViews = VIEW_OCCLUSIONS[spec.bodyShape] || {};
            var occluded = shapeViews[d.anatomicalView || anatomicalView] || [];
            return occluded.indexOf(org.id) >= 0 ? 'occluded' : 'visible';
          }
          function viewSpecificOrganPoint(org, point) {
            var view = d.anatomicalView || anatomicalView;
            var next = { x: point.x, y: point.y };
            if (view === 'lateral') next.y += (point.x - 0.5) * 0.045;
            else if (view === 'internal') { next.x = 0.5 + (point.x - 0.5) * 1.06; next.y = 0.45 + (point.y - 0.45) * 1.04; }
            var shapeOffsets = VIEW_LANDMARK_OFFSETS[spec.bodyShape] || {};
            var offset = ((shapeOffsets[view] || {})[org.id]) || [0, 0];
            next.x += offset[0]; next.y += offset[1];
            return { x: Math.max(0.04, Math.min(0.96, next.x)), y: Math.max(0.04, Math.min(0.96, next.y)) };
          }
          function specimenVariationValue(salt) {
            var liveVariationSeed = Number(d.variationSeed) || variationSeed;
            return (dissHash(specimen + '|' + liveVariationSeed + '|' + salt) % 1001) / 1000;
          }
          function variedOrganPoint(org) {
            var variedMode = d.visualRealism || visualRealism;
            var amount = variedMode === 'accessible' ? 0 : (variedMode === 'realistic' ? 0.016 : 0.007);
            return viewSpecificOrganPoint(org, {
              x: Math.max(0.04, Math.min(0.96, org.x + (specimenVariationValue(org.id + '|x') - 0.5) * amount * 2)),
              y: Math.max(0.04, Math.min(0.96, org.y + (specimenVariationValue(org.id + '|y') - 0.5) * amount * 2))
            });
          }
          function specimenScaleFactors() {
            var scaleMode = d.visualRealism || visualRealism;
            var amount = scaleMode === 'accessible' ? 0 : (scaleMode === 'realistic' ? 0.045 : 0.018);
            var view = d.anatomicalView || anatomicalView;
            var viewScaleX = view === 'ventral' ? -1 : (view === 'lateral' ? 0.66 : (view === 'internal' ? 1.04 : 1));
            var viewScaleY = view === 'lateral' ? 1.04 : (view === 'internal' ? 1.03 : 1);
            return {
              x: (1 + (specimenVariationValue('body-scale-x') - 0.5) * amount * 2) * viewScaleX,
              y: (1 + (specimenVariationValue('body-scale-y') - 0.5) * amount * 2) * viewScaleY
            };
          }
          function inverseSpecimenVariation(point) {
            var factors = specimenScaleFactors();
            return { x: (point.x - 0.5) / factors.x + 0.5, y: (point.y - 0.45) / factors.y + 0.45 };
          }
          function setVisualRealism(mode) {
            var patch = { visualRealism: mode };
            if (mode === 'accessible') { patch.highContrast = true; patch.animSpeed = 'slow'; }
            updMany(patch);
            setProcedureFeedback(mode === 'realistic'
              ? 'Realistic visuals enabled: richer materials, natural landmark variation, and reduced teaching emphasis.'
              : (mode === 'accessible'
                ? 'Accessible visuals enabled: high contrast, larger visual targets, and slower motion.'
                : 'Guided visuals enabled: balanced materials and visible technique targets.'));
          }

          function procedureActionLabel(action) {
            return {
              inspect: 'Inspected', scalpel: 'Incised', scissors: 'Extended',
              forceps: 'Retracted', pin: 'Pinned', probe: 'Probed', dropper: 'Cleared surface'
            }[action] || action;
          }
          function procedureTactile(kind) {
            if (d.tactileFeedback === false) return;
            try {
              if (window._alloHaptic) {
                window._alloHaptic(kind === 'warning' ? 'error' : (kind === 'firm' ? 'break' : 'selection'));
                return;
              }
              if (navigator.vibrate) navigator.vibrate(kind === 'warning' ? [18, 28, 18] : (kind === 'firm' ? 24 : 8));
            } catch (e) {}
          }
          function procedureCoachingCue(metrics) {
            if (!metrics) return '';
            if (metrics.alignment < 72) return ' Keep the instrument tip closer to the access corridor.';
            if (metrics.coverage < 68) return ' Carry the stroke farther toward both endpoints.';
            if (metrics.control < 72) return ' Use a steadier pace and smoother hand motion.';
            return ' The stroke showed balanced alignment, coverage, and control.';
          }
          function showProcedureReplay() {
            var actions = (currentProcedure.actionLog || []).slice();
            if (!actions.length) actions = (currentProcedure.history || []).map(function (action, idx) {
              return { action: action, label: procedureActionLabel(action), at: idx };
            });
            if (!actions.length) { setProcedureFeedback('Complete at least one technique action before replaying the attempt.'); return; }
            var duration = Math.max(2800, actions.length * 650);
            try {
              if (window.__alloDissectionReplayTimer) clearTimeout(window.__alloDissectionReplayTimer);
              window.__alloDissectionReplayTimer = setTimeout(function () { upd('_procedureReplay', null); window.__alloDissectionReplayTimer = null; }, duration + 250);
            } catch (e) {}
            upd('_procedureReplay', { layer: activeLayer, startedAt: Date.now(), duration: duration, actions: actions });
            setProcedureFeedback('Attempt replay started. The canvas will retrace the recorded technique sequence.');
          }

          function procedureStepIndex(state) {
            if (!state.inspected) return 0;
            if (!state.incisionStarted) return 1;
            if (!state.incisionExtended) return 2;
            if (!state.retracted) return 3;
            if ((state.pins || []).length < 2) return 4;
            if (!state.probed) return 5;
            return 6;
          }
          function procedureGuidePoints() {
            var view = d.anatomicalView || anatomicalView;
            var paths = {
              frog: { dorsal: [[0.50,0.27],[0.50,0.49],[0.50,0.72]], ventral: [[0.49,0.29],[0.50,0.50],[0.51,0.70]], lateral: [[0.47,0.31],[0.51,0.50],[0.54,0.68]], internal: [[0.50,0.30],[0.50,0.49],[0.50,0.68]] },
              worm: { dorsal: [[0.50,0.18],[0.50,0.49],[0.50,0.80]], ventral: [[0.51,0.19],[0.51,0.49],[0.51,0.79]], lateral: [[0.48,0.20],[0.50,0.49],[0.52,0.78]], internal: [[0.50,0.22],[0.50,0.49],[0.50,0.76]] },
              pig: { dorsal: [[0.30,0.47],[0.50,0.47],[0.70,0.47]], ventral: [[0.30,0.50],[0.50,0.49],[0.70,0.48]], lateral: [[0.34,0.45],[0.50,0.48],[0.66,0.51]], internal: [[0.33,0.48],[0.50,0.48],[0.67,0.48]] },
              fish: { dorsal: [[0.29,0.47],[0.50,0.47],[0.71,0.47]], ventral: [[0.29,0.51],[0.50,0.50],[0.71,0.49]], lateral: [[0.28,0.49],[0.50,0.48],[0.73,0.47]], internal: [[0.32,0.49],[0.50,0.48],[0.68,0.47]] },
              crayfish: { dorsal: [[0.31,0.46],[0.50,0.47],[0.69,0.48]], ventral: [[0.31,0.50],[0.50,0.50],[0.69,0.50]], lateral: [[0.33,0.46],[0.50,0.48],[0.67,0.51]], internal: [[0.34,0.48],[0.50,0.48],[0.66,0.48]] },
              eye: { dorsal: [[0.36,0.53],[0.50,0.47],[0.64,0.53]], ventral: [[0.37,0.50],[0.50,0.46],[0.63,0.50]], lateral: [[0.40,0.45],[0.50,0.48],[0.60,0.55]], internal: [[0.40,0.51],[0.50,0.47],[0.60,0.51]] },
              heart: { dorsal: [[0.43,0.33],[0.50,0.49],[0.55,0.67]], ventral: [[0.57,0.34],[0.50,0.49],[0.45,0.67]], lateral: [[0.46,0.34],[0.50,0.49],[0.53,0.66]], internal: [[0.48,0.35],[0.50,0.49],[0.52,0.64]] }
            };
            var shapePaths = paths[spec.bodyShape] || {};
            var raw = shapePaths[view] || shapePaths.dorsal || [[0.5,0.32],[0.5,0.5],[0.5,0.68]];
            var layerOffset = Math.min(0.018, currentLayerIdx * 0.004);
            return raw.map(function (pair, idx) { return { x: pair[0] + (idx === 1 ? layerOffset : 0), y: pair[1] }; });
          }
          var ADVANCED_SCENARIOS = [
            { id: 'precision-access', label: 'Precision access', prompt: 'Complete the technique sequence at or above the instructor score target.' },
            { id: 'structure-trace', label: 'Structure trace', prompt: 'Identify the required number of structures in the current layer.' },
            { id: 'preservation', label: 'Preservation challenge', prompt: 'Complete the sequence within the caution limit and maintain strong tool control.' }
          ];
          function currentScenarioDefinition() {
            return ADVANCED_SCENARIOS.find(function (scenario) { return scenario.id === (d.procedureScenario || procedureScenario); }) || ADVANCED_SCENARIOS[0];
          }
          function procedureScenarioStatus() {
            var scenario = currentScenarioDefinition();
            var layerExplored = organs.filter(function (org) { return !!(d.exploredOrgans || {})[specimen + '|' + org.id]; }).length;
            var metrics = currentProcedure.extensionMetrics || currentProcedure.incisionMetrics;
            var control = metrics ? (metrics.control == null ? metrics.smoothness || 0 : metrics.control) : 0;
            if (scenario.id === 'structure-trace') return { complete: layerExplored >= instructorRequiredStructures, progress: Math.min(100, Math.round(layerExplored / instructorRequiredStructures * 100)), detail: layerExplored + '/' + instructorRequiredStructures + ' structures identified' };
            if (scenario.id === 'preservation') {
              var preservationComplete = procedureStepIndex(currentProcedure) >= 6 && (currentProcedure.errors || 0) <= instructorMaxCautions && control >= instructorTarget;
              return { complete: preservationComplete, progress: Math.min(100, Math.round((procedureStepIndex(currentProcedure) / 6 * 55) + (control / 100 * 35) + ((currentProcedure.errors || 0) <= instructorMaxCautions ? 10 : 0))), detail: 'Control ' + control + '%, cautions ' + (currentProcedure.errors || 0) + '/' + instructorMaxCautions };
            }
            return { complete: procedureStepIndex(currentProcedure) >= 6 && procedureTechniqueScore(currentProcedure) >= instructorTarget, progress: Math.min(100, Math.round(procedureTechniqueScore(currentProcedure) / instructorTarget * 100)), detail: 'Technique score ' + procedureTechniqueScore(currentProcedure) + '/' + instructorTarget };
          }
          function procedureDebriefData() {
            var metrics = currentProcedure.extensionMetrics || currentProcedure.incisionMetrics;
            var strengths = [];
            if (procedureStepIndex(currentProcedure) >= 6) strengths.push('completed the full instrument sequence');
            if ((currentProcedure.errors || 0) <= instructorMaxCautions) strengths.push('worked within the caution limit');
            if (metrics && metrics.alignment >= 75) strengths.push('maintained corridor alignment');
            if (metrics && (metrics.control || 0) >= 75) strengths.push('used steady tool control');
            var improve = !metrics ? 'Complete a scalpel or scissors stroke to generate technique feedback.' : (metrics.alignment < 75 ? 'Keep the tool tip closer to the specimen-specific access path.' : (metrics.coverage < 70 ? 'Extend the stroke toward both endpoints.' : ((metrics.control || 0) < 75 ? 'Use a steadier pace and instrument angle.' : 'Try independent mode or a stricter instructor target next.')));
            return { strength: strengths.length ? strengths.join(', ') : 'orientation and sequence awareness are still developing', improve: improve };
          }
          function anatomicalRelationships() {
            var allStructures = allSpecimenStructures();
            var selected = allStructures.find(function (org) { return org.id === d.selectedOrgan; });
            if (!selected) return [];
            var edges = CURATED_ANATOMY_RELATIONSHIPS[spec.bodyShape] || [];
            return edges.filter(function (edge) { return edge.from === selected.id || edge.to === selected.id; }).map(function (edge) {
              var isForward = edge.from === selected.id;
              var otherId = isForward ? edge.to : edge.from;
              var other = allStructures.find(function (org) { return org.id === otherId; });
              return other ? { organ: other, type: edge.type, relation: isForward ? edge.forward : edge.reverse, visible: organs.some(function (org) { return org.id === other.id; }) && viewOrganVisibility(other) === 'visible' } : null;
            }).filter(Boolean);
          }
          function specimenConditionDescription() {
            return { standard: 'Standard teaching specimen', preserved: 'Preserved: firmer tissue response and muted surface color', dehydrated: 'Dehydrated: reduced sheen and greater simulated resistance', cloudy: spec.bodyShape === 'eye' ? 'Cloudy optics: reduced surface clarity' : 'Cloudy preservation film', swollen: 'Swollen: enlarged contours and tighter working space' }[d.specimenCondition || specimenCondition] || 'Standard teaching specimen';
          }
          function distanceToGuide(point, guide) {
            var best = Infinity;
            for (var i = 1; i < guide.length; i++) {
              var a = guide[i - 1], b = guide[i], vx = b.x - a.x, vy = b.y - a.y;
              var lengthSq = vx * vx + vy * vy || 1;
              var t = Math.max(0, Math.min(1, ((point.x - a.x) * vx + (point.y - a.y) * vy) / lengthSq));
              var px = a.x + t * vx, py = a.y + t * vy, dx = point.x - px, dy = point.y - py;
              best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
            }
            return best;
          }
          function procedurePointDistance(a, b) {
            var dx = a.x - b.x, dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy);
          }
          function procedurePathMetrics(points, samples) {
            var guide = procedureGuidePoints();
            if (!points || points.length < 2) return { alignment: 0, coverage: 0, smoothness: 0, control: 0, precision: 0 };
            var close = points.filter(function (point) { return distanceToGuide(point, guide) <= 0.075; }).length;
            var alignment = close / points.length;
            var first = points[0], last = points[points.length - 1];
            var forward = (procedurePointDistance(first, guide[0]) + procedurePointDistance(last, guide[guide.length - 1])) / 2;
            var reverse = (procedurePointDistance(first, guide[guide.length - 1]) + procedurePointDistance(last, guide[0])) / 2;
            var coverage = Math.max(0, Math.min(1, 1 - Math.min(forward, reverse) / 0.2));
            var turns = [];
            for (var mi = 1; mi < points.length - 1; mi++) {
              var ax = points[mi].x - points[mi - 1].x, ay = points[mi].y - points[mi - 1].y;
              var bx = points[mi + 1].x - points[mi].x, by = points[mi + 1].y - points[mi].y;
              var denom = Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by);
              if (denom > 0) turns.push(Math.max(0, Math.min(1, (ax * bx + ay * by) / denom)));
            }
            var smoothness = turns.length ? turns.reduce(function (sum, value) { return sum + value; }, 0) / turns.length : 1;
            var usableSamples = (samples || []).filter(function (sample) { return sample && sample.at != null; });
            var paceControl = 1, pressureControl = 1;
            if (usableSamples.length > 2) {
              var intervals = [], pressures = [];
              for (var si = 1; si < usableSamples.length; si++) intervals.push(Math.max(1, usableSamples[si].at - usableSamples[si - 1].at));
              usableSamples.forEach(function (sample) { if (sample.pressure > 0) pressures.push(sample.pressure); });
              var meanInterval = intervals.reduce(function (sum, value) { return sum + value; }, 0) / intervals.length;
              var intervalSpread = Math.sqrt(intervals.reduce(function (sum, value) { var delta = value - meanInterval; return sum + delta * delta; }, 0) / intervals.length);
              paceControl = Math.max(0, Math.min(1, 1 - intervalSpread / Math.max(18, meanInterval * 1.8)));
              if (pressures.length > 2) {
                var meanPressure = pressures.reduce(function (sum, value) { return sum + value; }, 0) / pressures.length;
                var pressureSpread = Math.sqrt(pressures.reduce(function (sum, value) { var delta = value - meanPressure; return sum + delta * delta; }, 0) / pressures.length);
                pressureControl = Math.max(0, Math.min(1, 1 - pressureSpread / 0.22));
              }
            }
            var guideAngle = Math.atan2(guide[guide.length - 1].y - guide[0].y, guide[guide.length - 1].x - guide[0].x);
            var strokeAngle = Math.atan2(last.y - first.y, last.x - first.x);
            var angleDelta = Math.abs(Math.atan2(Math.sin(strokeAngle - guideAngle), Math.cos(strokeAngle - guideAngle)));
            angleDelta = Math.min(angleDelta, Math.abs(Math.PI - angleDelta));
            var angleControl = Math.max(0, Math.min(1, 1 - angleDelta / (Math.PI / 3)));
            var control = smoothness * 0.35 + paceControl * 0.25 + pressureControl * 0.2 + angleControl * 0.2;
            var precision = alignment * 0.52 + coverage * 0.24 + smoothness * 0.08 + control * 0.1 + angleControl * 0.06;
            return { alignment: Math.round(alignment * 100), coverage: Math.round(coverage * 100), smoothness: Math.round(smoothness * 100), control: Math.round(control * 100), angleControl: Math.round(angleControl * 100), precision: Math.round(precision * 100) };
          }
          function procedurePathQuality(points) { return procedurePathMetrics(points).precision / 100; }
          function procedureTechniqueScore(state) {
            var step = procedureStepIndex(state);
            if (!step) return 0;
            var metrics = [state.incisionMetrics, state.extensionMetrics].filter(Boolean);
            var meanPrecision = metrics.length ? metrics.reduce(function (sum, item) { return sum + (item.precision || 0); }, 0) / metrics.length / 100 : 0;
            var meanControl = metrics.length ? metrics.reduce(function (sum, item) { return sum + (item.control == null ? item.smoothness || 0 : item.control); }, 0) / metrics.length / 100 : 0;
            var completion = step / 6;
            var safety = Math.max(0, 1 - (Number(state.errors) || 0) * 0.12);
            return Math.max(0, Math.min(100, Math.round(completion * 65 + meanPrecision * 20 + meanControl * 5 + safety * 10)));
          }
          function procedureMetricSnapshot(state) {
            state = state || {};
            var metrics = state.extensionMetrics || state.incisionMetrics || {};
            return {
              score: procedureTechniqueScore(state),
              precision: Number(metrics.precision) || 0,
              coverage: Number(metrics.coverage) || 0,
              control: Number(metrics.control == null ? metrics.smoothness : metrics.control) || 0,
              angleControl: Number(metrics.angleControl) || 0,
              cautions: Number(state.errors) || 0,
              completedSteps: procedureStepIndex(state),
              inputType: state.inputType || 'not recorded'
            };
          }
          function techniqueComparisonData() {
            var entries = (((d.attemptArchive || {})[activeLayer]) || []).slice();
            if (!entries.length) return null;
            var priorIndex = entries.length - 1;
            if (currentProcedure.lastSavedAttemptId === entries[priorIndex].id) priorIndex -= 1;
            if (priorIndex < 0) return null;
            var previous = entries[priorIndex];
            var current = procedureMetricSnapshot(currentProcedure);
            return {
              previous: previous,
              current: current,
              scoreDelta: current.score - (Number(previous.score) || 0),
              precisionDelta: current.precision - (Number(previous.precision) || 0),
              coverageDelta: current.coverage - (Number(previous.coverage) || 0),
              controlDelta: current.control - (Number(previous.control) || 0),
              angleDelta: current.angleControl - (Number(previous.angleControl) || 0),
              cautionDelta: current.cautions - (Number(previous.cautions) || 0)
            };
          }
          function saveTechniqueAttempt() {
            if (procedureStepIndex(currentProcedure) === 0) {
              setProcedureFeedback('Complete at least one technique step before saving an attempt.', 'caution');
              return;
            }
            var snapshot = procedureMetricSnapshot(currentProcedure);
            snapshot.id = Date.now();
            snapshot.savedAt = snapshot.id;
            snapshot.layer = activeLayer;
            snapshot.view = d.anatomicalView || anatomicalView;
            snapshot.condition = d.specimenCondition || specimenCondition;
            snapshot.mode = d.procedureMode || procedureMode;
            snapshot.incisionPath = (currentProcedure.incisionPath || []).map(function (point) { return { x: point.x, y: point.y }; });
            snapshot.extensionPath = (currentProcedure.extensionPath || []).map(function (point) { return { x: point.x, y: point.y }; });
            snapshot.history = (currentProcedure.history || []).slice();
            var archive = Object.assign({}, d.attemptArchive || {});
            var entries = (archive[activeLayer] || []).slice();
            entries.push(snapshot);
            archive[activeLayer] = entries.slice(-6);
            var map = Object.assign({}, d.procedureByLayer || {});
            map[activeLayer] = Object.assign({}, currentProcedure, { lastSavedAttemptId: snapshot.id });
            updMany({
              attemptArchive: archive,
              procedureByLayer: map,
              compareTechniqueAttempts: entries.length > 1,
              procedureFeedback: { message: 'Attempt saved with a technique score of ' + snapshot.score + '/100. Start a new attempt to practice against this baseline.', tone: 'success', at: Date.now() }
            });
          }
          function startNewTechniqueAttempt() {
            if (!(((d.attemptArchive || {})[activeLayer]) || []).length) {
              setProcedureFeedback('Save the current attempt before starting a new comparison.', 'caution');
              return;
            }
            var map = Object.assign({}, d.procedureByLayer || {});
            map[activeLayer] = {
              inspected: false, incisionStarted: false, incisionExtended: false,
              retracted: false, pins: [], probed: false, errors: 0, history: [], actionLog: [], cautionLog: []
            };
            updMany({
              procedureByLayer: map,
              activeInstrument: 'probe',
              incisionDepth: 'shallow',
              compareTechniqueAttempts: true,
              procedureFeedback: { message: 'New attempt started. The pink dashed path shows the saved baseline for this layer.', tone: 'success', at: Date.now() }
            });
          }
          function adaptiveCoachingData() {
            var metrics = currentProcedure.extensionMetrics || currentProcedure.incisionMetrics;
            var cautions = currentProcedure.cautionLog || [];
            var latestCaution = cautions.length ? cautions[cautions.length - 1].message : '';
            var comparison = techniqueComparisonData();
            if ((currentProcedure.errors || 0) > instructorMaxCautions || latestCaution) {
              return { focus: 'Safety sequence', suggestion: latestCaution || 'Slow down and verify the sequence before the next instrument action.' };
            }
            if (!metrics) return { focus: 'Orientation', suggestion: 'Inspect the layer, choose shallow depth, and preview the teaching corridor before drawing.' };
            if (metrics.alignment < 75) return { focus: 'Path alignment', suggestion: 'Keep the instrument tip centered on the access corridor from start to finish.' };
            if (metrics.coverage < 70) return { focus: 'Path coverage', suggestion: 'Begin closer to the first endpoint and carry the stroke through the second endpoint.' };
            if ((metrics.angleControl || 0) < 72) return { focus: 'Instrument angle', suggestion: 'Use steadier pointer pressure and a more consistent stroke direction.' };
            if ((metrics.control || metrics.smoothness || 0) < 72) return { focus: 'Tool control', suggestion: 'Use one continuous, even-paced motion instead of several abrupt corrections.' };
            if (comparison && comparison.scoreDelta <= 0) return { focus: 'Strategy change', suggestion: 'Replay the prior attempt, then use guided mode for one deliberate correction.' };
            return { focus: 'Independent refinement', suggestion: 'Try independent mode or raise the instructor target by five points.' };
          }
          function applyAdaptiveCoaching() {
            var next = nextProcedureInfo();
            updMany({ procedureMode: 'guided', activeInstrument: next.instrument, adaptiveGuidance: true });
            showProcedureDemonstration();
          }
          function showProcedureDemonstration() {
            var demo = { layer: activeLayer, startedAt: Date.now() };
            try {
              if (window.__alloDissectionDemoTimer) clearTimeout(window.__alloDissectionDemoTimer);
              window.__alloDissectionDemoTimer = setTimeout(function () { upd('_procedureDemo', null); window.__alloDissectionDemoTimer = null; }, 3200);
            } catch (e) {}
            upd('_procedureDemo', demo);
            setProcedureFeedback('Safe-technique demonstration playing. Watch the moving marker follow the generalized teaching corridor.');
          }
          function setProcedureFeedback(message, tone) {
            upd('procedureFeedback', { message: message, tone: tone || 'success', at: Date.now() });
            if (typeof announceToSR === 'function') announceToSR(message);
          }
          function updateProcedure(patch, message, action, tone) {
            var map = Object.assign({}, d.procedureByLayer || {});
            var next = Object.assign({}, currentProcedure, patch);
            if (action) {
              next.history = (currentProcedure.history || []).concat([action]).slice(-12);
              next.actionLog = (currentProcedure.actionLog || []).concat([{ action: action, label: procedureActionLabel(action), at: Date.now() }]).slice(-18);
              procedureTactile(action === 'scalpel' || action === 'scissors' || action === 'forceps' ? 'firm' : 'tick');
            }
            map[activeLayer] = next;
            updMany({ procedureByLayer: map, procedureFeedback: { message: message, tone: tone || 'success', at: Date.now() } });
            if (typeof announceToSR === 'function') announceToSR(message);
          }
          function procedureMistake(message) {
            procedureTactile('warning');
            var cautionLog = (currentProcedure.cautionLog || []).concat([{ message: message, at: Date.now() }]).slice(-12);
            updateProcedure({ errors: (currentProcedure.errors || 0) + 1, cautionLog: cautionLog }, message, null, 'caution');
          }
          function performProcedureAction(action, payload) {
            payload = payload || {};
            if (revealedLayers[activeLayer]) { setProcedureFeedback('This layer is complete. Continue to the next layer.'); return; }
            if (action === 'inspect') {
              if (currentProcedure.inspected) { setProcedureFeedback('Orientation is already recorded for this layer.'); return; }
              updateProcedure({ inspected: true }, 'Orientation recorded. Select the scalpel and use a shallow stroke along the teaching guide.', 'inspect'); return;
            }
            if (action === 'scalpel') {
              if (!currentProcedure.inspected) { procedureMistake('Pause and inspect the layer before choosing an incision path.'); return; }
              if (currentProcedure.incisionStarted) { setProcedureFeedback('The initial incision is complete. Use scissors to extend the opening.'); return; }
              if ((d.incisionDepth || 'shallow') !== 'shallow') { procedureMistake('That depth could obscure underlying structures. Switch to shallow depth and try again; no cut was recorded.'); return; }
              var cutPath = payload.points || procedureGuidePoints();
              var cutMetrics = procedurePathMetrics(cutPath, payload.samples);
              if (cutMetrics.precision < 55 || cutMetrics.coverage < 45) { procedureMistake('The stroke needs more corridor alignment or end-to-end coverage. Try again; no cut was recorded.'); return; }
              sfxDisCut();
              updateProcedure({ incisionStarted: true, incisionPath: cutPath, incisionMetrics: cutMetrics, inputType: payload.inputType || currentProcedure.inputType || 'button' }, 'Shallow access incision complete. Precision ' + cutMetrics.precision + '%, control ' + cutMetrics.control + '%.' + procedureCoachingCue(cutMetrics) + ' Switch to scissors.', 'scalpel'); return;
            }
            if (action === 'scissors') {
              if (!currentProcedure.incisionStarted) { procedureMistake('Scissors extend an opening; begin with a shallow scalpel incision first.'); return; }
              if (currentProcedure.incisionExtended) { setProcedureFeedback('The opening is already extended. Use forceps next.'); return; }
              var extensionPath = payload.points || procedureGuidePoints();
              var extensionMetrics = procedurePathMetrics(extensionPath, payload.samples);
              if (extensionMetrics.precision < 50 || extensionMetrics.coverage < 40) { procedureMistake('Keep the scissors within the opening and extend farther toward both endpoints. Try again; no extension was recorded.'); return; }
              sfxDisCut();
              updateProcedure({ incisionExtended: true, extensionPath: extensionPath, extensionMetrics: extensionMetrics, inputType: payload.inputType || currentProcedure.inputType || 'button' }, 'Opening extended. Precision ' + extensionMetrics.precision + '%, control ' + extensionMetrics.control + '%.' + procedureCoachingCue(extensionMetrics) + ' Use forceps next.', 'scissors'); return;
            }
            if (action === 'forceps') {
              if (!currentProcedure.incisionExtended) { procedureMistake('Extend the opening with scissors before using forceps.'); return; }
              if (currentProcedure.retracted) { setProcedureFeedback('The layer is already retracted. Place two pins.'); return; }
              if (payload.point && distanceToGuide(payload.point, procedureGuidePoints()) > 0.11) {
                procedureMistake('Grip near the opened teaching corridor so the layer can be lifted without obscuring the field. Try again.'); return;
              }
              playDissectSound('peel');
              updateProcedure({ retracted: true, forcepsPoint: payload.point || procedureGuidePoints()[1] }, 'Layer lifted and retracted from the opening. Place two well-spaced pins.', 'forceps'); return;
            }
            if (action === 'pin') {
              if (!currentProcedure.retracted) { procedureMistake('Retract the opened layer with forceps before placing a pin.'); return; }
              var pins = (currentProcedure.pins || []).slice();
              if (pins.length >= 2) { setProcedureFeedback('Two pins already secure this layer. Use the probe next.'); return; }
              var guide = procedureGuidePoints(), defaultPoint = pins.length ? guide[guide.length - 1] : guide[0];
              var pinPoint = payload.point || defaultPoint;
              if (payload.point) {
                var endpointDistance = Math.min(procedurePointDistance(pinPoint, guide[0]), procedurePointDistance(pinPoint, guide[guide.length - 1]));
                if (endpointDistance > 0.14) { procedureMistake('Place the pin near an end of the opened corridor, away from the observation field. Try again.'); return; }
                if (pins.length && procedurePointDistance(pinPoint, pins[0]) < 0.18) { procedureMistake('The pins are too close together. Place the second pin on the opposite side of the opening.'); return; }
              }
              pins.push(pinPoint); sfxDisPin();
              updateProcedure({ pins: pins }, pins.length < 2 ? 'First pin placed. Add a second pin on the opposite side.' : 'Layer secured with two well-spaced pins. Use the probe to trace a structure.', 'pin'); return;
            }
            if (action === 'dropper') {
              if (spec.bodyShape !== 'eye') { procedureMistake('The viewing-surface dropper is available only in the eye tray.'); return; }
              var dropPoint = payload.point || procedureGuidePoints()[1];
              sfxDisProbe();
              updateProcedure({ surfaceCleared: true, dropperPoint: dropPoint }, 'Controlled drop applied. The simulated viewing surface is clearer for optical inspection.', 'dropper'); return;
            }
            if (action === 'probe') {
              if ((currentProcedure.pins || []).length < 2) { procedureMistake('Secure the retracted layer with two pins before probing.'); return; }
              var target = payload.organ || organs.find(function (org) { return !(d.exploredOrgans || {})[specimen + '|' + org.id]; }) || organs[0];
              if (!target) { procedureMistake('No visible structure is available to probe in this layer.'); return; }
              chooseOrganFromDirectory(target); sfxDisProbe();
              updateProcedure({ probed: true, probedOrganId: target.id }, 'Probe trace complete: ' + target.name + '. Record evidence or complete the layer.', 'probe');
            }
          }
          function undoProcedureAction() {
            var history = (currentProcedure.history || []).slice(), action = history.pop();
            if (!action) { setProcedureFeedback('There is no technique action to undo.'); return; }
            var patch = { history: history, actionLog: (currentProcedure.actionLog || []).slice(0, -1) };
            if (action === 'probe') { patch.probed = false; patch.probedOrganId = null; }
            else if (action === 'dropper') { patch.surfaceCleared = false; patch.dropperPoint = null; }
            else if (action === 'pin') patch.pins = (currentProcedure.pins || []).slice(0, -1);
            else if (action === 'forceps') patch.retracted = false;
            else if (action === 'scissors') { patch.incisionExtended = false; patch.extensionPath = null; patch.extensionMetrics = null; }
            else if (action === 'scalpel') { patch.incisionStarted = false; patch.incisionPath = null; patch.incisionMetrics = null; }
            else if (action === 'inspect') patch.inspected = false;
            var map = Object.assign({}, d.procedureByLayer || {});
            map[activeLayer] = Object.assign({}, currentProcedure, patch);
            updMany({ procedureByLayer: map, procedureFeedback: { message: 'Undid ' + action + '. You can try that step again.', tone: 'success', at: Date.now() } });
          }
          function nextProcedureInfo() {
            var idx = procedureStepIndex(currentProcedure);
            if (idx === 0) return { action: 'inspect', instrument: 'probe', label: 'Inspect and orient the layer' };
            if (idx === 1) return { action: 'scalpel', instrument: 'scalpel', label: 'Make a shallow guided incision' };
            if (idx === 2) return { action: 'scissors', instrument: 'scissors', label: 'Extend the opening with scissors' };
            if (idx === 3) return { action: 'forceps', instrument: 'forceps', label: 'Lift and retract with forceps' };
            if (idx === 4) return { action: 'pin', instrument: 'pin', label: (currentProcedure.pins || []).length ? 'Place the second pin' : 'Place the first pin' };
            if (idx === 5) return { action: 'probe', instrument: 'probe', label: 'Probe a visible structure' };
            return { action: 'complete', instrument: 'probe', label: 'Complete and reveal the layer' };
          }
          function performNextProcedureStep() {
            var next = nextProcedureInfo();
            if (next.action === 'complete') { peelCurrentLayer(); return; }
            upd('activeInstrument', next.instrument); performProcedureAction(next.action);
          }
          function canvasPointFromEvent(e) {
            var canvas = e.currentTarget || e.target, rect = canvas.getBoundingClientRect();
            var rawX = (e.clientX - rect.left) / rect.width, rawY = (e.clientY - rect.top) / rect.height;
            var zoom = d.canvasZoom || 1, panX = d.canvasPanX || 0, panY = d.canvasPanY || 0;
            return inverseSpecimenVariation({ x: (rawX - 0.5 - panX / rect.width) / zoom + 0.5, y: (rawY - 0.5 - panY / rect.height) / zoom + 0.5 });
          }
          function beginProcedureStroke(e) {
            var canvas = e.currentTarget, point = canvasPointFromEvent(e);
            canvas._toolDrawing = true; canvas._toolStroke = [point];
            canvas._toolPointer = point; canvas._toolVector = null;
            canvas._toolPressure = Number(e.pressure) || 0.5;
            canvas._toolInputType = e.pointerType || 'mouse';
            canvas._toolSamples = [{ pressure: canvas._toolPressure, at: Date.now(), pointerType: canvas._toolInputType }];
            canvas._toolResistance = { level: 'low', value: 0.12 };
            if (canvas.setPointerCapture && e.pointerId != null) canvas.setPointerCapture(e.pointerId); e.preventDefault();
          }
          function appendProcedureStroke(e) {
            var canvas = e.currentTarget; if (!canvas._toolDrawing) return;
            var point = canvasPointFromEvent(e), previous = canvas._toolStroke[canvas._toolStroke.length - 1];
            if (previous) canvas._toolVector = { x: point.x - previous.x, y: point.y - previous.y };
            canvas._toolPointer = point;
            canvas._toolPressure = Number(e.pressure) || canvas._toolPressure || 0.5;
            if (!previous || Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) > 0.006) {
              canvas._toolStroke.push(point);
              canvas._toolSamples.push({ pressure: Number(e.pressure) || 0.5, at: Date.now(), pointerType: e.pointerType || canvas._toolInputType || 'mouse' });
            }
            var corridorDistance = distanceToGuide(point, procedureGuidePoints());
            var conditionFactor = { preserved: 1.15, dehydrated: 1.32, cloudy: 1.08, swollen: 1.2 }[d.specimenCondition || specimenCondition] || 1;
            var effectiveResistance = corridorDistance * conditionFactor;
            var resistanceLevel = effectiveResistance <= 0.04 ? 'low' : (effectiveResistance <= 0.075 ? 'moderate' : 'high');
            canvas._toolResistance = { level: resistanceLevel, value: Math.max(0.08, Math.min(1, effectiveResistance / 0.12)) };
            if (canvas._lastResistanceLevel !== resistanceLevel) {
              procedureTactile(resistanceLevel === 'high' ? 'warning' : 'tick');
              canvas._lastResistanceLevel = resistanceLevel;
            }
            e.preventDefault();
          }
          function finishProcedureStroke(e) {
            var canvas = e.currentTarget; if (!canvas._toolDrawing) return false;
            canvas._toolDrawing = false; var points = (canvas._toolStroke || []).slice(), samples = (canvas._toolSamples || []).slice();
            var inputType = canvas._toolInputType || (e.pointerType || 'mouse');
            canvas._toolStroke = null; canvas._toolSamples = null; canvas._toolInputType = null; canvas._toolResistance = null; canvas._lastResistanceLevel = null; canvas._toolPressure = 0.12; canvas._suppressToolClick = true;
            if (canvas.releasePointerCapture && e.pointerId != null && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
            if (points.length < 2) {
              procedureMistake('Drag along the corridor to practice the instrument stroke, or use the equivalent action button.');
              return true;
            }
            performProcedureAction(activeInstrument, { points: points, samples: samples, inputType: inputType }); return true;
          }

          // Quiz: deterministic shuffling keeps questions stable during a render while
          // still varying their order for each new study session.
          var quizPool = organs.filter(function (o) { return o.fn; });
          function dissHash(value) {
            var hash = 2166136261;
            var input = String(value || '');
            for (var hi = 0; hi < input.length; hi++) { hash ^= input.charCodeAt(hi); hash = Math.imul(hash, 16777619); }
            return hash >>> 0;
          }
          function dissStableOrder(items, salt) {
            return items.slice().sort(function (a, b) {
              return dissHash(salt + '|' + a.id) - dissHash(salt + '|' + b.id);
            });
          }
          var quizSalt = specimen + '|' + activeLayer + '|' + (d.quizSeed || 'default');
          var orderedQuizPool = dissStableOrder(quizPool, quizSalt);
          var quizQ = d.quizMode && orderedQuizPool.length > 0 ? orderedQuizPool[(d.quizIdx || 0) % orderedQuizPool.length] : null;
          var quizOptions = quizQ
            ? dissStableOrder(quizPool.filter(function (o) { return o.id !== quizQ.id; }), quizSalt + '|' + (d.quizIdx || 0)).slice(0, 3).concat([quizQ])
            : [];
          quizOptions = dissStableOrder(quizOptions, quizSalt + '|options|' + (d.quizIdx || 0));
          var quizKind = ((d.quizIdx || 0) % 2 === 0) ? 'function' : 'location';
          function dissDiagramRegion(org) {
            var vertical = org.y < 0.34 ? 'upper' : (org.y > 0.66 ? 'lower' : 'middle');
            var horizontal = org.x < 0.4 ? 'left' : (org.x > 0.6 ? 'right' : 'central');
            return vertical + (horizontal === 'central' ? '-central' : '-' + horizontal);
          }
          var quizPrompt = quizQ ? (quizKind === 'location'
            ? 'Diagram location clue: which structure is in the ' + dissDiagramRegion(quizQ) + ' region of this view?'
            : 'Function clue: "' + quizQ.fn.split('.')[0] + '."') : '';

          function submitQuizAnswer(answerId) {
            if (!quizQ || d.quizFeedback) return;
            var correct = answerId === quizQ.id;
            var nextScore = (d.quizScore || 0) + (correct ? 1 : 0);
            var nextTotal = (d.quizTotal || 0) + 1;
            updMany({
              quizFeedback: { correct: correct, chosen: answerId },
              quizScore: nextScore,
              quizTotal: nextTotal,
              quizExplanation: quizQ.fn.split('.').slice(0, 2).join('.') + '.'
            });
            if (d.practicalMode) {
              try { window.__alloDissectionPracticalScore = nextScore; } catch (e) {}
            }
            if (correct) awardStemXP('dissection', 2, 'Correct quiz answer');
            if (addToast) addToast(correct ? '\u2705 Correct!' : '\u274C It was ' + quizQ.name, correct ? 'success' : 'error');
            if (typeof announceToSR === 'function') announceToSR(correct ? 'Correct. ' + quizQ.name + '.' : 'Not quite. The correct structure is ' + quizQ.name + '.');
          }
          function peelCurrentLayer() {

            // Trigger animated incision line before peeling
            sfxDisCut(); // Scalpel cutting sound
            if (window._alloHaptic) window._alloHaptic('break');
            upd('_incisionAnim', { active: true, startTick: Date.now(), layerName: activeLayer });

            // Delay the actual peel so the scalpel cut animation plays first (~500ms)
            setTimeout(function () {
              var newRevealed = Object.assign({}, revealedLayers);
              newRevealed[activeLayer] = true;
              upd('revealedLayers', newRevealed);

              if (currentLayerIdx < spec.layers.length - 1) {
                upd('activeLayer', spec.layers[currentLayerIdx + 1].id);
                upd('selectedOrgan', null);
                if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'layerPeel', 'Peeled ' + (spec.layers[currentLayerIdx] || {}).name + ' layer. Now viewing ' + spec.layers[currentLayerIdx + 1].name + ' layer with ' + ((spec.organs[spec.layers[currentLayerIdx + 1].id] || []).length) + ' structures.', { debounce: 1000 });
              }

              upd('_incisionAnim', null);
              awardStemXP('dissection', 3, 'Peeled ' + activeLayer + ' layer');
              sfxDisReveal(); // Layer reveal chime
              if (addToast) addToast('\uD83D\uDD2C +3 XP Layer revealed!', 'success');
            }, 500);

          }



          // Canvas renderer

          var canvasRef = function (canvas) {

            if (!canvas) {
              try { if (window.__alloDissectionCanvasCleanup) window.__alloDissectionCanvasCleanup(); } catch (e) {}
              return;
            }

            // Always update zoom/pan on canvas element so animation loop reads latest values

            canvas._zoom = d.canvasZoom || 1;

            canvas._panX = d.canvasPanX || 0;

            canvas._panY = d.canvasPanY || 0;

            // Store all drawing state on canvas so animation loop always has fresh values

            canvas._drawSpec = spec;

            canvas._drawActiveLayer = activeLayer;

            canvas._drawCurrentLayerIdx = currentLayerIdx;

            canvas._drawOrgans = organs;

            canvas._drawRevealedLayers = revealedLayers;

            canvas._drawSel = sel;

            canvas._drawD = d;

            canvas._drawSpecimen = specimen;

            canvas._drawGuidedMode = guidedMode;

            canvas._drawGuidedStep = guidedStep;

            // If animation loop is already running, just update state â€” don't restart

            if (canvas._dissAnim && canvas._dissCleanup) return;
            if (canvas._dissCleanup) canvas._dissCleanup();
            else if (canvas._dissAnim) { cancelAnimationFrame(canvas._dissAnim); canvas._dissAnim = null; }
            try { if (window.__alloDissectionCanvasCleanup && window.__alloDissectionCanvasCleanup !== canvas._dissCleanup) window.__alloDissectionCanvasCleanup(); } catch (e) {}

            // PL7 HiDPI: crisp rendering on retina displays.
            if (window.StemLab && window.StemLab.setupHiDPI) {
              window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
            }
            var ctx = canvas.getContext('2d');
            if (!ctx) return;
            if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);

            var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;

            var dissTick = 0;
            var dissAlive = true;
            var dissLastDrawAt = 0;
            var dissTimeTimer = setInterval(function () {
              if (!dissAlive || !canvas.isConnected || isDissectionHidden()) return;
              var latest = canvas._drawD || {};
              upd('timeSpent', (Number(latest.timeSpent) || 0) + 30);
            }, 30000);
            var dissMotionReduced = false;
            try { dissMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            function isDissectionHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelDissectionFrame() {
              if (canvas._dissAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvas._dissAnim);
              canvas._dissAnim = null;
            }

            function scheduleDissectionFrame() {
              if (!dissAlive || dissMotionReduced || canvas._dissAnim || isDissectionHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              canvas._dissAnim = requestAnimationFrame(drawDissectionFrame);
            }

            function cleanupDissectionCanvas() {
              dissAlive = false;
              cancelDissectionFrame();
              if (dissTimeTimer) { clearInterval(dissTimeTimer); dissTimeTimer = null; }
              try { if (window.__alloDissectionPracticalInterval) { clearInterval(window.__alloDissectionPracticalInterval); window.__alloDissectionPracticalInterval = null; } } catch (e) {}
              try { if (window.__alloDissectionDemoTimer) { clearTimeout(window.__alloDissectionDemoTimer); window.__alloDissectionDemoTimer = null; } } catch (e) {}
              try { if (window.__alloDissectionReplayTimer) { clearTimeout(window.__alloDissectionReplayTimer); window.__alloDissectionReplayTimer = null; } } catch (e) {}
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onDissectionVisibilityChange);
              if (window.__alloDissectionCanvasCleanup === canvas._dissCleanup) window.__alloDissectionCanvasCleanup = null;
              canvas._dissCleanup = null;
            }

            function onDissectionVisibilityChange() {
              if (!dissAlive) return;
              if (!canvas.isConnected) { cleanupDissectionCanvas(); return; }
              if (isDissectionHidden()) cancelDissectionFrame();
              else { cancelDissectionFrame(); drawDissectionFrame(); }
            }

            canvas._dissCleanup = cleanupDissectionCanvas;
            try { window.__alloDissectionCanvasCleanup = canvas._dissCleanup; } catch (e) {}
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onDissectionVisibilityChange);

            function drawDissectionFrame() {

              if (!dissAlive) return;
              canvas._dissAnim = null;
              // Stop the loop once React unmounts the canvas — this heavyweight
              // full-anatomy redraw otherwise reschedules itself at 60fps forever,
              // surviving tab switches and navigation away from the tool.
              if (!canvas.isConnected) { cleanupDissectionCanvas(); return; }
              if (isDissectionHidden()) { cancelDissectionFrame(); return; }

              var drawState = canvas._drawD || d || {};
              var liveRenderQuality = drawState.renderQuality || 'auto';
              var autoBalanced = liveRenderQuality === 'auto' && typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
              var minFrameMs = liveRenderQuality === 'high' ? 16 : (liveRenderQuality === 'balanced' || autoBalanced ? 50 : (drawState.animSpeed === 'fast' ? 16 : (drawState.animSpeed === 'slow' ? 66 : 33)));
              if (!dissMotionReduced && dissLastDrawAt && arguments[0] && arguments[0] - dissLastDrawAt < minFrameMs) { scheduleDissectionFrame(); return; }
              if (!dissMotionReduced) { dissLastDrawAt = arguments[0] || Date.now(); dissTick++; }

              // Guard: skip frame if canvas dimensions are not finite or zero

              W = canvas.width; H = canvas.height;

              if (!W || !H || !isFinite(W) || !isFinite(H)) {

                scheduleDissectionFrame();

                return;

              }

              // Read ALL drawing state from canvas element (updated by canvasRef on each React render)

              // This avoids stale closures that caused the specimen to vanish permanently

              spec = canvas._drawSpec || spec;

              activeLayer = canvas._drawActiveLayer || activeLayer;

              currentLayerIdx = canvas._drawCurrentLayerIdx != null ? canvas._drawCurrentLayerIdx : currentLayerIdx;

              organs = canvas._drawOrgans || organs;

              revealedLayers = canvas._drawRevealedLayers || revealedLayers;

              sel = canvas._drawSel;

              d = canvas._drawD || d;

              specimen = canvas._drawSpecimen || specimen;

              guidedMode = canvas._drawGuidedMode;

              guidedStep = canvas._drawGuidedStep || 0;

              try {

              // BULLETPROOF: Reset all canvas state at frame start to prevent leaks

              ctx.setTransform(1, 0, 0, 1, 0, 0);

              ctx.globalAlpha = 1;

              ctx.setLineDash([]);

              ctx.lineDashOffset = 0;

              ctx.shadowBlur = 0;

              ctx.shadowColor = 'transparent';

              ctx.clearRect(0, 0, W, H);

              var cx = W * 0.5, cy = H * 0.45;

              // Read zoom + pan from canvas element (always current, avoids stale closure)

              var zoom = canvas._zoom || 1;

              var panX = canvas._panX || 0;

              var panY = canvas._panY || 0;

              var parallaxEnabled = d.parallaxDepth !== false && !dissMotionReduced;
              var parallaxTargetX = parallaxEnabled ? (Number(canvas._parallaxTargetX) || 0) : 0;
              var parallaxTargetY = parallaxEnabled ? (Number(canvas._parallaxTargetY) || 0) : 0;
              canvas._parallaxX = (Number(canvas._parallaxX) || 0) + (parallaxTargetX - (Number(canvas._parallaxX) || 0)) * 0.16;
              canvas._parallaxY = (Number(canvas._parallaxY) || 0) + (parallaxTargetY - (Number(canvas._parallaxY) || 0)) * 0.16;
              var parallaxX = Math.abs(canvas._parallaxX) < 0.01 ? 0 : canvas._parallaxX;
              var parallaxY = Math.abs(canvas._parallaxY) < 0.01 ? 0 : canvas._parallaxY;

              ctx.save();

              ctx.translate(W / 2 + panX, H / 2 + panY);

              ctx.scale(zoom, zoom);

              ctx.translate(-W / 2, -H / 2);

              // Dark dissection tray background

              var isHC = d.highContrast;

              // Route the dissection-tray gradient through the global theme palette so it
              // adapts to light/dark/contrast mode instead of forcing a fixed dark surface.
              var _p = (typeof window !== 'undefined' && window.AlloStemTheme && window.AlloStemTheme.palette) ? window.AlloStemTheme.palette() : { canvas: '#0f172a', panel: '#1e293b' };
              var trayGrad = ctx.createLinearGradient(0, 0, 0, H);
              var _topColor = (_p.panel && _p.panel !== _p.canvas) ? _p.panel : _p.canvas;
              trayGrad.addColorStop(0, _topColor); trayGrad.addColorStop(1, _p.canvas);

              ctx.fillStyle = trayGrad; ctx.fillRect(0, 0, W, H);

              // Theme-aware tray border (was hardcoded slate-700) — adapts to current theme palette
              var _borderPalette = (typeof window !== 'undefined' && window.AlloStemTheme && window.AlloStemTheme.palette) ? window.AlloStemTheme.palette() : { border: '#334155' };
              ctx.strokeStyle = _borderPalette.border || '#334155'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, H - 8);

              if (sceneDetail) {
                ctx.save();
                var trayTopBevel = ctx.createLinearGradient(0, 4, 0, 30);
                trayTopBevel.addColorStop(0, 'rgba(255,255,255,0.15)'); trayTopBevel.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = trayTopBevel; ctx.fillRect(7, 7, W - 14, 28);
                var trayBottomBevel = ctx.createLinearGradient(0, H - 38, 0, H - 6);
                trayBottomBevel.addColorStop(0, 'rgba(2,6,23,0)'); trayBottomBevel.addColorStop(1, 'rgba(2,6,23,0.42)');
                ctx.fillStyle = trayBottomBevel; ctx.fillRect(7, H - 38, W - 14, 31);
                ctx.strokeStyle = 'rgba(255,255,255,0.055)'; ctx.lineWidth = 18;
                ctx.beginPath(); ctx.moveTo(W * 0.12, H * 0.08); ctx.lineTo(W * 0.78, H * 0.92); ctx.stroke();
                [[16,16],[W-16,16],[16,H-16],[W-16,H-16]].forEach(function (fastener) {
                  var fastenerGrad = ctx.createRadialGradient(fastener[0] - 2, fastener[1] - 2, 1, fastener[0], fastener[1], 5);
                  fastenerGrad.addColorStop(0, 'rgba(248,250,252,0.72)'); fastenerGrad.addColorStop(0.42, 'rgba(100,116,139,0.62)'); fastenerGrad.addColorStop(1, 'rgba(2,6,23,0.82)');
                  ctx.beginPath(); ctx.arc(fastener[0], fastener[1], 4.5, 0, Math.PI * 2); ctx.fillStyle = fastenerGrad; ctx.fill();
                  ctx.strokeStyle = 'rgba(15,23,42,0.72)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fastener[0]-2.5, fastener[1]); ctx.lineTo(fastener[0]+2.5, fastener[1]); ctx.stroke();
                });
                ctx.restore();
              }

              // Faint grid

              ctx.strokeStyle = 'rgba(100,116,139,0.12)'; ctx.lineWidth = 0.5;

              for (var gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }

              for (var gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

              var specimenScale = specimenScaleFactors();
              if (sceneDetail) {
                var depthProfile = SPECIMEN_MATERIAL_PROFILES[spec.bodyShape] || SPECIMEN_MATERIAL_PROFILES.frog;
                var depthShadowX = depthProfile.cx * W - parallaxX * 1.5;
                var depthShadowY = depthProfile.cy * H + depthProfile.ry * H * 0.54 - parallaxY * 0.35;
                ctx.save(); ctx.globalAlpha = (d.visualRealism || visualRealism) === 'accessible' ? 0.11 : 0.2;
                var depthShadow = ctx.createRadialGradient(depthShadowX, depthShadowY, 6, depthShadowX, depthShadowY, depthProfile.rx * W * 0.92);
                depthShadow.addColorStop(0, 'rgba(2,6,23,0.72)'); depthShadow.addColorStop(0.58, 'rgba(2,6,23,0.28)'); depthShadow.addColorStop(1, 'rgba(2,6,23,0)');
                ctx.fillStyle = depthShadow; ctx.beginPath(); ctx.ellipse(depthShadowX, depthShadowY, depthProfile.rx * W * 0.88, Math.max(12, depthProfile.ry * H * 0.33), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
              }
              ctx.save(); ctx.translate(parallaxX, parallaxY); ctx.translate(cx, cy); ctx.transform(1, parallaxY * 0.0007, parallaxX * 0.0007, 1, 0, 0); ctx.scale(specimenScale.x, specimenScale.y); ctx.translate(-cx, -cy);

              ctx.lineJoin = 'round'; ctx.lineCap = 'round';

              // Specular highlight for 3D effect

              if (spec.bodyShape !== 'worm') {

                var specGrad = ctx.createRadialGradient(cx - W * 0.05, cy - H * 0.08, 0, cx - W * 0.05, cy - H * 0.08, W * 0.15);

                specGrad.addColorStop(0, 'rgba(255,255,255,0.06)');

                specGrad.addColorStop(1, 'rgba(255,255,255,0)');

                ctx.fillStyle = specGrad;

                ctx.beginPath(); ctx.ellipse(cx - W * 0.05, cy - H * 0.08, W * 0.12, H * 0.08, -0.3, 0, Math.PI * 2);

                ctx.fill();

              } else {

                // Worm gets elongated highlight

                var wSpecGrad = ctx.createRadialGradient(cx - W * 0.01, H * 0.30, 0, cx - W * 0.01, H * 0.30, W * 0.04);

                wSpecGrad.addColorStop(0, 'rgba(255,255,255,0.06)');

                wSpecGrad.addColorStop(1, 'rgba(255,255,255,0)');

                ctx.fillStyle = wSpecGrad;

                ctx.fillRect(cx - W * 0.03, H * 0.08, W * 0.04, H * 0.84);

              }

              // 3D depth shadow under body

              ctx.globalAlpha = 0.08;

              ctx.beginPath();

              if (spec.bodyShape === 'frog') { ctx.ellipse(cx + 3, cy + 5, W * 0.18, H * 0.30, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'pig') { ctx.ellipse(cx + 3, cy + 5, W * 0.30, H * 0.14, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'fish') { ctx.ellipse(cx + 3, cy + 5, W * 0.32, H * 0.10, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'crayfish') { ctx.ellipse(cx + 3, cy + 5, W * 0.32, H * 0.08, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'worm') { ctx.ellipse(cx + 2, H * 0.50 + 5, W * 0.05, H * 0.42, 0, 0, Math.PI * 2); }

              // Theme-aware shadow: derives the darkest tone from the current palette so the
              // shadow reads as "depth" in both light and dark themes instead of pure black.
              var _shadowPalette = (typeof window !== 'undefined' && window.AlloStemTheme && window.AlloStemTheme.palette) ? window.AlloStemTheme.palette() : { canvas: '#0f172a' };
              var _shc = _shadowPalette.canvas || '#0f172a';
              ctx.fillStyle = 'rgba(' + parseInt(_shc.slice(1, 3), 16) + ',' + parseInt(_shc.slice(3, 5), 16) + ',' + parseInt(_shc.slice(5, 7), 16) + ',0.3)';
              ctx.fill();

              ctx.globalAlpha = 1;

              // Tissue texture overlay (stipple for organic feel)

              if (spec.bodyShape !== 'eye' && spec.bodyShape !== 'heart') {

                ctx.globalAlpha = 0.03;

                for (var stip = 0; stip < 80; stip++) {

                  var sx = cx + (Math.sin(stip * 137.5) * W * 0.25);

                  var sy_t = cy + (Math.cos(stip * 47.3) * H * 0.30);

                  ctx.beginPath(); ctx.arc(sx, sy_t, Math.random() * 2 + 0.5, 0, Math.PI * 2);

                  ctx.fillStyle = stip % 2 === 0 ? '#000' : '#fff'; ctx.fill();

                }

                ctx.globalAlpha = 1;

              }

              // Dissection tools illustration (bottom-right corner)

              ctx.globalAlpha = 0.15;

              // Scalpel

              ctx.beginPath(); ctx.moveTo(W - 60, H - 60); ctx.lineTo(W - 35, H - 35);

              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

              ctx.beginPath(); ctx.moveTo(W - 35, H - 35); ctx.lineTo(W - 30, H - 32);

              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.stroke();

              // Forceps

              ctx.beginPath(); ctx.moveTo(W - 80, H - 55); ctx.lineTo(W - 55, H - 40);

              ctx.moveTo(W - 80, H - 48); ctx.lineTo(W - 55, H - 40);

              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();

              // Pins

              for (var pi_tool = 0; pi_tool < 3; pi_tool++) {

                ctx.beginPath(); ctx.arc(W - 90 + pi_tool * 8, H - 70, 1.5, 0, Math.PI * 2);

                ctx.fillStyle = '#94a3b8'; ctx.fill();

                ctx.beginPath(); ctx.moveTo(W - 90 + pi_tool * 8, H - 70); ctx.lineTo(W - 90 + pi_tool * 8, H - 62);

                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.5; ctx.stroke();

              }

              ctx.globalAlpha = 1;



              // Get current layer styling

              var curLayer = spec.layers[currentLayerIdx] || spec.layers[0];

              var layerColor = curLayer.color || '#94a3b8';

              var layerStroke = curLayer.accent || '#94a3b8';

              // cx, cy declared at top of drawDissectionFrame



              // Create body gradient for 3D depth effect

              var bodyGrad = ctx.createRadialGradient(cx - W * 0.05, cy - H * 0.05, 10, cx, cy, W * 0.30);

              bodyGrad.addColorStop(0, layerColor);

              bodyGrad.addColorStop(0.7, layerColor);

              bodyGrad.addColorStop(1, layerStroke);

              // Breathing animation for organic feel

              var breathScale = activeLayer === 'organs' ? (1 + Math.sin(dissTick * 0.025) * 0.012) : (1 + Math.sin(dissTick * 0.02) * 0.005);



              ctx.save();

              ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 12;



// €â€ Draw organ pins â€â€”€â”€ Draw specimen body based on bodyShape â”€â”€

              if (spec.bodyShape === 'frog') {

  // €â€ Draw organ pins â€â€•â• ANATOMICALLY ACCURATE FROG (Rana temporaria) â•â•

                var bS = breathScale;



  // €â€ Draw organ pins â€â€”€â”€ Hindlimbs (drawn first, behind body) â”€â”€

                [-1, 1].forEach(function (sx) {

                  var hipX = cx + sx * W * 0.13, hipY = cy + H * 0.20;

                  var kneeX = cx + sx * W * 0.26, kneeY = cy + H * 0.18;

                  var ankleX = cx + sx * W * 0.28, ankleY = cy + H * 0.30;

                  var footX = cx + sx * W * 0.22, footY = cy + H * 0.38;

                  // Thigh (femur region â€“ thick)

                  ctx.beginPath();

                  ctx.moveTo(hipX, hipY);

                  ctx.bezierCurveTo(hipX + sx * W * 0.04, hipY - H * 0.02, kneeX - sx * W * 0.02, kneeY - H * 0.04, kneeX, kneeY);

                  ctx.bezierCurveTo(kneeX + sx * W * 0.02, kneeY + H * 0.02, hipX + sx * W * 0.06, hipY + H * 0.06, hipX + sx * W * 0.02, hipY + H * 0.04);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                  // Calf (tibia-fibula â€“ tapers)

                  ctx.beginPath();

                  ctx.moveTo(kneeX, kneeY);

                  ctx.bezierCurveTo(kneeX + sx * W * 0.01, kneeY + H * 0.04, ankleX + sx * W * 0.02, ankleY - H * 0.03, ankleX, ankleY);

                  ctx.bezierCurveTo(ankleX - sx * W * 0.03, ankleY + H * 0.01, kneeX - sx * W * 0.03, kneeY + H * 0.04, kneeX - sx * W * 0.02, kneeY + H * 0.02);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                  // Elongated ankle (astragalus/calcaneus â€“ frog adaptation)

                  ctx.beginPath();

                  ctx.moveTo(ankleX, ankleY);

                  ctx.lineTo(footX, footY - H * 0.02);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

                  // Foot with 5 webbed toes

                  var toeAngles = [-0.45, -0.22, 0, 0.22, 0.45];

                  var toeLens = [0.07, 0.09, 0.10, 0.09, 0.06];

                  toeAngles.forEach(function (ang, ti) {

                    var toeEndX = footX + Math.sin(ang + sx * 0.1) * W * toeLens[ti] * sx;

                    var toeEndY = footY + Math.cos(ang) * H * toeLens[ti] * 0.7;

                    ctx.beginPath(); ctx.moveTo(footX, footY - H * 0.02);

                    ctx.lineTo(toeEndX, toeEndY);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                    // Toe tip bulb

                    ctx.beginPath(); ctx.arc(toeEndX, toeEndY, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = layerColor; ctx.fill();

                  });

                  // Webbing between toes

                  ctx.globalAlpha = 0.15;

                  ctx.beginPath();

                  ctx.moveTo(footX + Math.sin(toeAngles[0] + sx * 0.1) * W * toeLens[0] * sx, footY + Math.cos(toeAngles[0]) * H * toeLens[0] * 0.7);

                  for (var tw = 1; tw < 5; tw++) {

                    ctx.lineTo(footX + Math.sin(toeAngles[tw] + sx * 0.1) * W * toeLens[tw] * sx, footY + Math.cos(toeAngles[tw]) * H * toeLens[tw] * 0.7);

                  }

                  ctx.lineTo(footX, footY - H * 0.02); ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill();

                  ctx.globalAlpha = 1;

                });



  // €â€ Draw organ pins â€â€”€â”€ Forelimbs (drawn behind body) â”€â”€

                [-1, 1].forEach(function (sx) {

                  var shX = cx + sx * W * 0.15, shY = cy - H * 0.12;

                  var elbX = cx + sx * W * 0.22, elbY = cy - H * 0.06;

                  var wristX = cx + sx * W * 0.24, wristY = cy + H * 0.02;

                  // Upper arm

                  ctx.beginPath();

                  ctx.moveTo(shX, shY);

                  ctx.bezierCurveTo(shX + sx * W * 0.03, shY + H * 0.01, elbX - sx * W * 0.02, elbY - H * 0.02, elbX, elbY);

                  ctx.bezierCurveTo(elbX - sx * W * 0.01, elbY + H * 0.02, shX + sx * W * 0.01, shY + H * 0.04, shX - sx * W * 0.01, shY + H * 0.02);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                  // Forearm (radioulna)

                  ctx.beginPath();

                  ctx.moveTo(elbX, elbY);

                  ctx.bezierCurveTo(elbX + sx * W * 0.01, elbY + H * 0.03, wristX, wristY - H * 0.03, wristX, wristY);

                  ctx.bezierCurveTo(wristX - sx * W * 0.02, wristY, elbX - sx * W * 0.02, elbY + H * 0.03, elbX - sx * W * 0.01, elbY + H * 0.01);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                  // 4 digits (digit I lost in frogs)

                  var dAngles = [-0.5, -0.15, 0.15, 0.45];

                  dAngles.forEach(function (da) {

                    var dEndX = wristX + Math.sin(da + sx * 0.2) * W * 0.04 * sx;

                    var dEndY = wristY + Math.cos(da) * H * 0.04;

                    ctx.beginPath(); ctx.moveTo(wristX, wristY);

                    ctx.lineTo(dEndX, dEndY);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                    ctx.beginPath(); ctx.arc(dEndX, dEndY, 1, 0, Math.PI * 2);

                    ctx.fillStyle = layerColor; ctx.fill();

                  });

                });



  // €â€ Draw organ pins â€â€”€â”€ Main body (Rana dorsal silhouette â€“ BÃ©zier contour) â”€â”€

                ctx.beginPath();

                // Start at anterior (top of body, behind head junction)

                ctx.moveTo(cx, cy - H * 0.20 * bS);

                // Right shoulder curve (wider)

                ctx.bezierCurveTo(cx + W * 0.10, cy - H * 0.20 * bS, cx + W * 0.17 * bS, cy - H * 0.14, cx + W * 0.18 * bS, cy - H * 0.05);

                // Right waist (narrower â€“ amphibian body shape)

                ctx.bezierCurveTo(cx + W * 0.17 * bS, cy + H * 0.05, cx + W * 0.14 * bS, cy + H * 0.10, cx + W * 0.13 * bS, cy + H * 0.12);

                // Right pelvic flare

                ctx.bezierCurveTo(cx + W * 0.15 * bS, cy + H * 0.16, cx + W * 0.16 * bS, cy + H * 0.20, cx + W * 0.14 * bS, cy + H * 0.24 * bS);

                // Posterior (cloaca)

                ctx.bezierCurveTo(cx + W * 0.08, cy + H * 0.26 * bS, cx - W * 0.08, cy + H * 0.26 * bS, cx - W * 0.14 * bS, cy + H * 0.24 * bS);

                // Left pelvic flare

                ctx.bezierCurveTo(cx - W * 0.16 * bS, cy + H * 0.20, cx - W * 0.15 * bS, cy + H * 0.16, cx - W * 0.13 * bS, cy + H * 0.12);

                // Left waist

                ctx.bezierCurveTo(cx - W * 0.14 * bS, cy + H * 0.10, cx - W * 0.17 * bS, cy + H * 0.05, cx - W * 0.18 * bS, cy - H * 0.05);

                // Left shoulder curve

                ctx.bezierCurveTo(cx - W * 0.17 * bS, cy - H * 0.14, cx - W * 0.10, cy - H * 0.20 * bS, cx, cy - H * 0.20 * bS);

                ctx.closePath();

                ctx.fillStyle = bodyGrad; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;



                // Body highlight (3D volume)

                ctx.beginPath(); ctx.ellipse(cx - W * 0.03, cy - H * 0.06, W * 0.09, H * 0.12, -0.1, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();



  // €â€ Draw organ pins â€â€”€â”€ Head (triangular snout, not oval) â”€â”€

                var headCy = cy - H * 0.25;

                var headGrad = ctx.createRadialGradient(cx - W * 0.01, headCy - H * 0.02, 3, cx, headCy, W * 0.13);

                headGrad.addColorStop(0, layerColor); headGrad.addColorStop(1, layerStroke);

                ctx.beginPath();

                // Triangular head: wide behind eyes, narrows to round snout

                ctx.moveTo(cx, headCy - H * 0.07);  // snout tip

                ctx.bezierCurveTo(cx + W * 0.04, headCy - H * 0.07, cx + W * 0.09, headCy - H * 0.04, cx + W * 0.12, headCy);

                ctx.bezierCurveTo(cx + W * 0.13, headCy + H * 0.03, cx + W * 0.10, headCy + H * 0.06, cx + W * 0.05, headCy + H * 0.06);

                ctx.lineTo(cx - W * 0.05, headCy + H * 0.06);

                ctx.bezierCurveTo(cx - W * 0.10, headCy + H * 0.06, cx - W * 0.13, headCy + H * 0.03, cx - W * 0.12, headCy);

                ctx.bezierCurveTo(cx - W * 0.09, headCy - H * 0.04, cx - W * 0.04, headCy - H * 0.07, cx, headCy - H * 0.07);

                ctx.closePath();

                ctx.fillStyle = headGrad; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // Maxillary ridge (subtle line)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.10, headCy - H * 0.01);

                ctx.quadraticCurveTo(cx, headCy - H * 0.04, cx + W * 0.10, headCy - H * 0.01);

                ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.8; ctx.stroke();

                // Nostrils (pair at snout tip)

                [-1, 1].forEach(function (s) {

                  ctx.beginPath(); ctx.ellipse(cx + s * W * 0.025, headCy - H * 0.06, 2, 1.5, 0, 0, Math.PI * 2);

                  ctx.fillStyle = layerStroke; ctx.fill();

                });



  // €â€ Draw organ pins â€â€”€â”€ Tympanic membranes (large circular, behind eyes) â”€â”€

                [-1, 1].forEach(function (s) {

                  ctx.beginPath(); ctx.arc(cx + s * W * 0.10, headCy + H * 0.01, W * 0.022, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(139,92,246,0.15)'; ctx.fill();

                  ctx.strokeStyle = 'rgba(139,92,246,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();

                  // Inner detail ring

                  ctx.beginPath(); ctx.arc(cx + s * W * 0.10, headCy + H * 0.01, W * 0.012, 0, Math.PI * 2);

                  ctx.strokeStyle = 'rgba(139,92,246,0.2)'; ctx.lineWidth = 0.4; ctx.stroke();

                });



  // €â€ Draw organ pins â€â€”€â”€ Eyes (protruding bulbous amphibian eyes) â”€â”€

                [-1, 1].forEach(function (s) {

                  var eyeX = cx + s * W * 0.09, eyeY = headCy - H * 0.04;

                  var eyeR = W * 0.032;

                  // Eye socket shadow

                  ctx.beginPath(); ctx.arc(eyeX, eyeY + 1, eyeR + 2, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();

                  // Eyeball (multicolor iris gradient)

                  var irisGrad = ctx.createRadialGradient(eyeX - 1, eyeY - 1, 0, eyeX, eyeY, eyeR);

                  irisGrad.addColorStop(0, '#d4a017');

                  irisGrad.addColorStop(0.3, '#b8860b');

                  irisGrad.addColorStop(0.6, '#8B6914');

                  irisGrad.addColorStop(0.85, '#5c4a1e');

                  irisGrad.addColorStop(1, '#2d2010');

                  ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);

                  ctx.fillStyle = irisGrad; ctx.fill();

                  ctx.strokeStyle = '#1a1206'; ctx.lineWidth = 1.2; ctx.stroke();

                  // Horizontal slit pupil (amphibian characteristic)

                  ctx.beginPath();

                  ctx.ellipse(eyeX, eyeY, eyeR * 0.55, eyeR * 0.25, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#0a0a0a'; ctx.fill();

                  // Specular highlight (top-left)

                  ctx.beginPath(); ctx.arc(eyeX - eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.2, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();

                  // Secondary highlight (smaller)

                  ctx.beginPath(); ctx.arc(eyeX + eyeR * 0.2, eyeY + eyeR * 0.15, eyeR * 0.08, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();

                });



  // €â€ Draw organ pins â€â€”€â”€ Skin layer details â”€â”€

                if (activeLayer === 'skin' && !revealedLayers['skin']) {

                  // Irregular blotch pattern (realistic chromatophore clusters)

                  ctx.globalAlpha = 0.30;

                  var blotchSeeds = [

                    { x: -0.06, y: -0.10, r: 0.035, c: '#14532d' }, { x: 0.08, y: -0.08, r: 0.03, c: '#166534' },

                    { x: -0.03, y: 0.05, r: 0.045, c: '#14532d' }, { x: 0.05, y: 0.02, r: 0.028, c: '#15803d' },

                    { x: -0.10, y: 0.12, r: 0.032, c: '#166534' }, { x: 0.10, y: 0.10, r: 0.038, c: '#14532d' },

                    { x: 0.00, y: 0.15, r: 0.025, c: '#15803d' }, { x: -0.08, y: -0.01, r: 0.022, c: '#166534' },

                    { x: 0.11, y: -0.04, r: 0.020, c: '#14532d' }, { x: -0.04, y: 0.18, r: 0.028, c: '#15803d' },

                    { x: 0.02, y: -0.15, r: 0.018, c: '#166534' }, { x: -0.12, y: 0.05, r: 0.020, c: '#14532d' },

                    { x: 0.07, y: 0.16, r: 0.024, c: '#166534' }, { x: -0.02, y: -0.05, r: 0.030, c: '#15803d' }

                  ];

                  blotchSeeds.forEach(function (b) {

                    var bx = cx + b.x * W, by = cy + b.y * H, br = b.r * W;

                    // Irregular blotch using overlapping ellipses

                    var bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);

                    bg.addColorStop(0, b.c); bg.addColorStop(0.6, b.c); bg.addColorStop(1, 'transparent');

                    ctx.save();

                    ctx.translate(bx, by); ctx.rotate(Math.sin(b.x * 10) * 0.5); ctx.translate(-bx, -by);

                    ctx.beginPath(); ctx.ellipse(bx, by, br, br * 0.7, 0, 0, Math.PI * 2);

                    ctx.fillStyle = bg; ctx.fill();

                    ctx.restore();

                  });

                  ctx.globalAlpha = 1;



                  // Dorsolateral folds (raised ridges running along back)

                  ctx.globalAlpha = 0.18;

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.06, cy - H * 0.18);

                    ctx.bezierCurveTo(cx + s * W * 0.07, cy - H * 0.05, cx + s * W * 0.06, cy + H * 0.08, cx + s * W * 0.05, cy + H * 0.20);

                    ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;



                  // Moisture sheen gradient (glistening moist skin)

                  ctx.globalAlpha = 0.06;

                  var sheenGrad = ctx.createLinearGradient(cx - W * 0.15, cy - H * 0.15, cx + W * 0.10, cy + H * 0.10);

                  sheenGrad.addColorStop(0, 'transparent'); sheenGrad.addColorStop(0.4, '#ffffff');

                  sheenGrad.addColorStop(0.6, '#ffffff'); sheenGrad.addColorStop(1, 'transparent');

                  ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.16, H * 0.22, -0.2, 0, Math.PI * 2);

                  ctx.fillStyle = sheenGrad; ctx.fill();

                  ctx.globalAlpha = 1;



                  // Ventral skin indication (lighter belly)

                  ctx.globalAlpha = 0.08;

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.08, W * 0.10, H * 0.12, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#fef9c3'; ctx.fill();

                  ctx.globalAlpha = 1;

                }



  // €â€ Draw organ pins â€â€”€â”€ Frog layer-specific internal anatomy â”€â”€

                // Muscle layer: animated fiber contraction

                if (activeLayer === 'muscle') {

                  ctx.globalAlpha = 0.25;

                  ctx.strokeStyle = '#991b1b';

                  ctx.lineWidth = 0.6;

                  // Abdominal muscle fibers with contraction wave

                  var contractionWave = Math.sin(dissTick * 0.04);

                  for (var mf = 0; mf < 12; mf++) {

                    var mfy = cy - H * 0.15 + mf * H * 0.035;

                    var mfContract = Math.sin(dissTick * 0.04 + mf * 0.5) * 2;

                    ctx.beginPath();

                    ctx.moveTo(cx - W * 0.10, mfy);

                    ctx.quadraticCurveTo(cx, mfy + mfContract, cx + W * 0.10, mfy);

                    ctx.lineWidth = 0.6 + Math.abs(mfContract) * 0.15;

                    ctx.stroke();

                  }

                  // Muscle tension indicator

                  ctx.globalAlpha = 0.15;

                  var tensionColor = 'rgba(220,38,38,' + (0.1 + Math.abs(contractionWave) * 0.12) + ')';

                  ctx.fillStyle = tensionColor;

                  ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.12, H * 0.20, 0, 0, Math.PI * 2);

                  ctx.fill();

                  // Leg muscle detail

                  [-1, 1].forEach(function (side) {

                    for (var lm = 0; lm < 5; lm++) {

                      ctx.beginPath();

                      ctx.moveTo(cx + side * W * 0.12, cy + H * 0.24 + lm * H * 0.03);

                      ctx.quadraticCurveTo(cx + side * W * 0.18, cy + H * 0.28 + lm * H * 0.02, cx + side * W * 0.20, cy + H * 0.32 + lm * H * 0.01);

                      ctx.stroke();

                    }

                  });

                  ctx.globalAlpha = 1;

                }

                // Organs layer: draw simplified organ shapes inside body

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.55;

                  // Heart (anterior)

                  ctx.beginPath(); ctx.arc(cx, cy - H * 0.08, W * 0.03, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 0.8; ctx.stroke();

                  // Aorta line from heart

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.11);

                  ctx.lineTo(cx, cy - H * 0.18);

                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();

                  // Lungs (paired)

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.06, cy - H * 0.06, W * 0.03, H * 0.04, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fca5a5'; ctx.fill();

                    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.5; ctx.stroke();

                  });

                  // Liver (3 lobes)

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.02, W * 0.10, H * 0.04, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.6; ctx.stroke();

                  // Gallbladder

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.04, cy + H * 0.03, W * 0.015, H * 0.02, 0.3, 0, Math.PI * 2);

                  ctx.fillStyle = '#22c55e'; ctx.fill(); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Stomach

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.03, cy + H * 0.08, W * 0.04, H * 0.025, -0.3, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Small intestine (coiled)

                  ctx.beginPath();

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;

                  ctx.moveTo(cx - W * 0.01, cy + H * 0.10);

                  for (var gi = 0; gi < 6; gi++) {

                    ctx.quadraticCurveTo(cx + (gi % 2 ? 1 : -1) * W * 0.06, cy + H * 0.11 + gi * H * 0.015, cx + (gi % 2 ? -1 : 1) * W * 0.02, cy + H * 0.12 + gi * H * 0.015);

                  }

                  ctx.stroke();

                  // Fat bodies (yellow fingers)

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.05, cy - H * 0.10, W * 0.008, H * 0.03, s * 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#fbbf24'; ctx.fill();

                  });

                  // Bladder

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.15, W * 0.025, H * 0.018, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(186,230,253,0.4)'; ctx.fill();

                  ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Stomach churning animation

                  if (activeLayer === 'organs') {

                    ctx.globalAlpha = 0.12;

                    var churnPhase = Math.sin(dissTick * 0.04);

                    ctx.beginPath();

                    ctx.ellipse(cx - W * 0.02, cy - H * 0.04, W * 0.02 + churnPhase * W * 0.005, H * 0.015 - churnPhase * H * 0.003, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fbbf24'; ctx.fill();

                    ctx.globalAlpha = 0.5;

                  }

                  // Spleen (small red organ near stomach)

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.06, cy - H * 0.03, W * 0.012, H * 0.008, 0.3, 0, Math.PI * 2);

                  ctx.fillStyle = '#7f1d1d'; ctx.fill();

                  // Pancreas (thin, yellowish)

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.02, cy - H * 0.04);

                  ctx.quadraticCurveTo(cx + W * 0.05, cy - H * 0.02, cx + W * 0.08, cy - H * 0.01);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 0.5;

                  // Adrenal glands (on top of kidneys)

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.06, cy + H * 0.07, W * 0.008, H * 0.004, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fbbf24'; ctx.fill();

                  });

                  // Peritoneum lining (body cavity membrane)

                  ctx.globalAlpha = 0.04;

                  ctx.beginPath();

                  ctx.ellipse(cx, cy, W * 0.14, H * 0.25, 0, 0, Math.PI * 2);

                  ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);

                  ctx.globalAlpha = 0.5;

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = 'rgba(254,240,138,0.4)';

                  ctx.fillText('Peritoneum', cx + W * 0.12, cy + H * 0.22);

                  // Mesentery (translucent membrane connecting organs)

                  ctx.globalAlpha = 0.06;

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.05, cy - H * 0.08);

                  ctx.quadraticCurveTo(cx + W * 0.08, cy, cx - W * 0.03, cy + H * 0.10);

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.05, cx - W * 0.05, cy - H * 0.08);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  ctx.globalAlpha = 0.5;

                  // Animated blood flow paths

                  var bloodT = (dissTick * 0.03) % 1;

                  // Arterial flow (red, from heart outward)

                  ctx.setLineDash([4, 8]);

                  ctx.lineDashOffset = -dissTick * 0.5;

                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;

                  // Aorta â†’ body

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.11);

                  ctx.quadraticCurveTo(cx + W * 0.03, cy - H * 0.15, cx + W * 0.05, cy - H * 0.18);

                  ctx.stroke();

                  // To legs

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.02, cy + H * 0.10);

                    ctx.lineTo(cx + s * W * 0.10, cy + H * 0.30);

                    ctx.stroke();

                  });

                  // Venous return (blue)

                  ctx.strokeStyle = '#3b82f6';

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.12, cy + H * 0.32);

                    ctx.quadraticCurveTo(cx + s * W * 0.04, cy + H * 0.15, cx + s * W * 0.01, cy - H * 0.05);

                    ctx.stroke();

                  });

                  ctx.setLineDash([]); ctx.lineDashOffset = 0;

                  ctx.globalAlpha = 1;

                }

                // Skeleton layer: draw bone outlines

                if (activeLayer === 'skeleton') {

                  ctx.globalAlpha = 0.6;

                  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;

                  // Skull

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.25, W * 0.09, H * 0.055, 0, 0, Math.PI * 2);

                  ctx.stroke();

                  // Orbits

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.arc(cx + s * W * 0.05, cy - H * 0.26, W * 0.025, 0, Math.PI * 2);

                    ctx.stroke();

                  });

                  // Vertebral column (9 vertebrae)

                  for (var vi = 0; vi < 9; vi++) {

                    var vy = cy - H * 0.18 + vi * (H * 0.36 / 9);

                    ctx.beginPath(); ctx.ellipse(cx, vy, W * 0.015, H * 0.01, 0, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(226,232,240,0.4)'; ctx.fill();

                    ctx.stroke();

                  }

                  // Urostyle

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.15);

                  ctx.lineTo(cx, cy + H * 0.24);

                  ctx.lineWidth = 3; ctx.stroke();

                  // Pelvic girdle

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.16, W * 0.08, H * 0.025, 0, 0, Math.PI * 2);

                  ctx.lineWidth = 1.5; ctx.stroke();

                  // Pectoral girdle

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.16, W * 0.10, H * 0.02, 0, 0, Math.PI * 2);

                  ctx.stroke();

                  // Femur + tibiofibula outlines

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.08, cy + H * 0.18);

                    ctx.lineTo(cx + s * W * 0.16, cy + H * 0.26);

                    ctx.lineTo(cx + s * W * 0.18, cy + H * 0.36);

                    ctx.lineWidth = 2.5; ctx.stroke();

                    // Humerus + radioulna

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.10, cy - H * 0.14);

                    ctx.lineTo(cx + s * W * 0.18, cy - H * 0.08);

                    ctx.lineTo(cx + s * W * 0.20, cy - H * 0.02);

                    ctx.lineWidth = 2; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;

                }

                // Nervous layer: draw nerve pathways

                if (activeLayer === 'nervous') {

                  ctx.globalAlpha = 0.6;

                  // Brain

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.25, W * 0.05, H * 0.03, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(167,139,250,0.4)'; ctx.fill();

                  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5; ctx.stroke();

                  // Optic lobes

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.28, W * 0.03, H * 0.015, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(196,181,253,0.4)'; ctx.fill(); ctx.stroke();

                  // Spinal cord

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.22); ctx.lineTo(cx, cy + H * 0.18);

                  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 2]); ctx.stroke(); ctx.setLineDash([]);

                  // Spinal nerves (10 pairs)

                  for (var sn = 0; sn < 10; sn++) {

                    var sny = cy - H * 0.18 + sn * (H * 0.36 / 10);

                    [-1, 1].forEach(function (s) {

                      ctx.beginPath(); ctx.moveTo(cx, sny);

                      ctx.lineTo(cx + s * W * 0.08, sny + H * 0.01);

                      ctx.strokeStyle = 'rgba(167,139,250,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();

                    });

                  }

                  // Sciatic nerves

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.04, cy + H * 0.15);

                    ctx.quadraticCurveTo(cx + s * W * 0.10, cy + H * 0.25, cx + s * W * 0.16, cy + H * 0.38);

                    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);

                  });

                  // Optic nerves to eyes

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.03, cy - H * 0.26);

                    ctx.lineTo(cx + s * W * 0.07, cy - H * 0.28);

                    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 1; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;

                }



              } else if (spec.bodyShape === 'worm') {

  // €â€ Draw organ pins â€â€•â• EARTHWORM (Lumbricus) â€” segmented annelid â•â•

                var wormTop = cy - H * 0.38;

                var wormBot = cy + H * 0.38;

                var ww = W * 0.045;

  // €â€ Draw organ pins â€â€”€â”€ Body (S-curved) â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - ww, wormTop);

                ctx.bezierCurveTo(cx - ww - W * 0.02, wormTop + H * 0.20, cx - ww + W * 0.02, wormTop + H * 0.40, cx - ww - W * 0.01, wormBot);

                ctx.quadraticCurveTo(cx, wormBot + H * 0.02, cx + ww + W * 0.01, wormBot);

                ctx.bezierCurveTo(cx + ww + W * 0.02, wormTop + H * 0.40, cx + ww - W * 0.02, wormTop + H * 0.20, cx + ww, wormTop);

                ctx.quadraticCurveTo(cx, wormTop - H * 0.015, cx - ww, wormTop);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

  // €â€ Draw organ pins â€â€”€â”€ Segmentation rings â”€â”€

                ctx.globalAlpha = 0.15;

                var numSegs = 32;

                for (var seg = 1; seg < numSegs; seg++) {

                  var segY = wormTop + seg * (wormBot - wormTop) / numSegs;

                  var xOff = Math.sin(seg * 0.2) * W * 0.008;

                  ctx.beginPath(); ctx.moveTo(cx - ww + xOff, segY); ctx.lineTo(cx + ww + xOff, segY);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Prostomium â”€â”€

                ctx.beginPath(); ctx.ellipse(cx, wormTop - H * 0.005, ww * 0.6, H * 0.008, 0, 0, Math.PI * 2);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

  // €â€ Draw organ pins â€â€”€â”€ Clitellum â”€â”€

                var clitTop = wormTop + 12 * (wormBot - wormTop) / numSegs;

                var clitBot = wormTop + 15 * (wormBot - wormTop) / numSegs;

                ctx.beginPath(); ctx.rect(cx - ww - W * 0.005, clitTop, ww * 2 + W * 0.01, clitBot - clitTop);

                ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fill();

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke();

                ctx.beginPath(); ctx.rect(cx - ww * 0.5, clitTop, ww, clitBot - clitTop);

                ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();

  // €â€ Draw organ pins â€â€”€â”€ Setae â”€â”€

                ctx.globalAlpha = 0.2;

                for (var st = 2; st < numSegs - 1; st++) {

                  var stY = wormTop + st * (wormBot - wormTop) / numSegs + (wormBot - wormTop) / numSegs / 2;

                  var stOff = Math.sin(st * 0.2) * W * 0.008;

                  ctx.beginPath(); ctx.moveTo(cx - ww + stOff, stY);

                  ctx.lineTo(cx - ww - W * 0.008 + stOff, stY - 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - ww + stOff, stY);

                  ctx.lineTo(cx - ww - W * 0.008 + stOff, stY + 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + ww + stOff, stY);

                  ctx.lineTo(cx + ww + W * 0.008 + stOff, stY - 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + ww + stOff, stY);

                  ctx.lineTo(cx + ww + W * 0.008 + stOff, stY + 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Moisture sheen â”€â”€

                ctx.globalAlpha = 0.05;

                ctx.beginPath(); ctx.rect(cx - ww * 0.3, wormTop + H * 0.05, ww * 0.4, wormBot - wormTop - H * 0.10);

                // Theme-aware moisture sheen — use palette.text so it reads as a faint highlight
                // in both light + dark modes (was hardcoded white, broke in light theme).
                var _moistPalette = (typeof window !== 'undefined' && window.AlloStemTheme && window.AlloStemTheme.palette) ? window.AlloStemTheme.palette() : { text: '#ffffff' };
                ctx.fillStyle = _moistPalette.text || '#ffffff';
                ctx.fill();

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Layer overlays â”€â”€

                if (activeLayer === 'skin') {

                  ctx.globalAlpha = 0.1;

                  for (var mg = 0; mg < 20; mg++) {

                    ctx.beginPath(); ctx.arc(cx - ww * 0.5, wormTop + H * 0.05 + mg * H * 0.035, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();

                  }

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'muscle') {

                  ctx.globalAlpha = 0.3;

                  for (var lm = 0; lm < 3; lm++) {

                    ctx.beginPath(); ctx.moveTo(cx - ww * 0.5 + lm * ww * 0.5, wormTop + H * 0.02);

                    ctx.lineTo(cx - ww * 0.5 + lm * ww * 0.5, wormBot - H * 0.02);

                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.stroke();

                  }

                  for (var cm = 0; cm < 15; cm++) {

                    ctx.beginPath(); ctx.moveTo(cx - ww, wormTop + cm * H * 0.05 + H * 0.03);

                    ctx.lineTo(cx + ww, wormTop + cm * H * 0.05 + H * 0.03);

                    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 0.8; ctx.stroke();

                  }

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  for (var aa = 0; aa < 5; aa++) {

                    ctx.beginPath(); ctx.arc(cx, wormTop + H * 0.15 + aa * H * 0.04, W * 0.012, 0, Math.PI * 2);

                    ctx.fillStyle = '#dc2626'; ctx.fill();

                  }

                  ctx.beginPath(); ctx.ellipse(cx, wormTop + H * 0.35, ww * 0.6, H * 0.02, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx, wormTop + H * 0.40, ww * 0.7, H * 0.02, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#a78bfa'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx, wormTop + H * 0.42);

                  ctx.lineTo(cx, wormBot - H * 0.05);

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = ww * 0.6; ctx.stroke();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'nervous') {

                  ctx.globalAlpha = 0.6;

                  ctx.beginPath(); ctx.arc(cx, wormTop + H * 0.04, W * 0.012, 0, Math.PI * 2);

                  ctx.fillStyle = '#fbbf24'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx, wormTop + H * 0.04);

                  ctx.lineTo(cx, wormBot - H * 0.02);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                  for (var sg2 = 0; sg2 < 12; sg2++) {

                    ctx.beginPath(); ctx.arc(cx, wormTop + H * 0.08 + sg2 * H * 0.06, 2.5, 0, Math.PI * 2);

                    ctx.fillStyle = '#f59e0b'; ctx.fill();

                  }

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'pig') {

  // €â€ Draw organ pins â€â€•â• FETAL PIG (Sus scrofa) â•â•

  // €â€ Draw organ pins â€â€”€â”€ Body (barrel-shaped torso) â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.08, cy - H * 0.18, cx + W * 0.10, cy - H * 0.18, cx + W * 0.20, cy - H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.24, cy - H * 0.06, cx + W * 0.24, cy + H * 0.08, cx + W * 0.20, cy + H * 0.14);

                ctx.bezierCurveTo(cx + W * 0.10, cy + H * 0.18, cx - W * 0.08, cy + H * 0.18, cx - W * 0.18, cy + H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.22, cy + H * 0.08, cx - W * 0.22, cy - H * 0.06, cx - W * 0.18, cy - H * 0.14);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

                // Body midline highlight (3D volume)

                ctx.beginPath(); ctx.ellipse(cx - W * 0.02, cy - H * 0.04, W * 0.12, H * 0.08, -0.05, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();



  // €â€ Draw organ pins â€â€”€â”€ Head (elongated snout) â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.22, cy - H * 0.12, cx - W * 0.28, cy - H * 0.10, cx - W * 0.30, cy - H * 0.04);

                ctx.bezierCurveTo(cx - W * 0.32, cy + H * 0.01, cx - W * 0.30, cy + H * 0.06, cx - W * 0.26, cy + H * 0.08);

                ctx.bezierCurveTo(cx - W * 0.22, cy + H * 0.10, cx - W * 0.18, cy + H * 0.08, cx - W * 0.18, cy + H * 0.04);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // Snout (disk-shaped pig nose)

                ctx.beginPath(); ctx.ellipse(cx - W * 0.31, cy - H * 0.01, W * 0.028, H * 0.035, 0, 0, Math.PI * 2);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // Nostrils

                ctx.beginPath(); ctx.ellipse(cx - W * 0.32, cy - H * 0.025, 2, 1.5, 0.3, 0, Math.PI * 2);

                ctx.fillStyle = layerStroke; ctx.fill();

                ctx.beginPath(); ctx.ellipse(cx - W * 0.32, cy + H * 0.005, 2, 1.5, -0.3, 0, Math.PI * 2);

                ctx.fillStyle = layerStroke; ctx.fill();

                // Eye

                ctx.beginPath(); ctx.arc(cx - W * 0.24, cy - H * 0.06, 4, 0, Math.PI * 2);

                ctx.fillStyle = '#1a1a1a'; ctx.fill();

                ctx.beginPath(); ctx.arc(cx - W * 0.237, cy - H * 0.065, 1.5, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();

                // Ears (floppy pig ears)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.22, cy - H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.24, cy - H * 0.16, cx - W * 0.20, cy - H * 0.18, cx - W * 0.17, cy - H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.16, cy - H * 0.12, cx - W * 0.19, cy - H * 0.10, cx - W * 0.20, cy - H * 0.09);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Inner ear shading

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.215, cy - H * 0.11);

                ctx.bezierCurveTo(cx - W * 0.23, cy - H * 0.15, cx - W * 0.19, cy - H * 0.16, cx - W * 0.175, cy - H * 0.13);

                ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fill();



  // €â€ Draw organ pins â€â€”€â”€ Legs (anatomically shaped with joints) â”€â”€

                // Front-left leg

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.14, cy + H * 0.12);

                ctx.bezierCurveTo(cx - W * 0.15, cy + H * 0.16, cx - W * 0.14, cy + H * 0.22, cx - W * 0.135, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.13, cy + H * 0.28, cx - W * 0.12, cy + H * 0.29, cx - W * 0.115, cy + H * 0.30);

                ctx.lineTo(cx - W * 0.095, cy + H * 0.30);

                ctx.bezierCurveTo(cx - W * 0.09, cy + H * 0.29, cx - W * 0.10, cy + H * 0.28, cx - W * 0.105, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.11, cy + H * 0.22, cx - W * 0.12, cy + H * 0.16, cx - W * 0.11, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Front-right leg (behind)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.12, cy + H * 0.12);

                ctx.bezierCurveTo(cx - W * 0.13, cy + H * 0.16, cx - W * 0.12, cy + H * 0.22, cx - W * 0.115, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.11, cy + H * 0.28, cx - W * 0.10, cy + H * 0.29, cx - W * 0.095, cy + H * 0.30);

                ctx.lineTo(cx - W * 0.075, cy + H * 0.30);

                ctx.bezierCurveTo(cx - W * 0.07, cy + H * 0.29, cx - W * 0.08, cy + H * 0.28, cx - W * 0.085, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.09, cy + H * 0.22, cx - W * 0.10, cy + H * 0.16, cx - W * 0.09, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Rear-left leg

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.10, cy + H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.09, cy + H * 0.16, cx + W * 0.10, cy + H * 0.22, cx + W * 0.105, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.11, cy + H * 0.28, cx + W * 0.12, cy + H * 0.29, cx + W * 0.125, cy + H * 0.30);

                ctx.lineTo(cx + W * 0.145, cy + H * 0.30);

                ctx.bezierCurveTo(cx + W * 0.15, cy + H * 0.29, cx + W * 0.14, cy + H * 0.28, cx + W * 0.135, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.22, cx + W * 0.12, cy + H * 0.16, cx + W * 0.13, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Rear-right leg (behind)

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.12, cy + H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.11, cy + H * 0.16, cx + W * 0.12, cy + H * 0.22, cx + W * 0.125, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.28, cx + W * 0.14, cy + H * 0.29, cx + W * 0.145, cy + H * 0.30);

                ctx.lineTo(cx + W * 0.165, cy + H * 0.30);

                ctx.bezierCurveTo(cx + W * 0.17, cy + H * 0.29, cx + W * 0.16, cy + H * 0.28, cx + W * 0.155, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.15, cy + H * 0.22, cx + W * 0.14, cy + H * 0.16, cx + W * 0.15, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();



  // €â€ Draw organ pins â€â€”€â”€ Hooves (dark, split/cloven) â”€â”€

                // Front hooves

                [cx - W * 0.115, cx - W * 0.095].forEach(function (hx) {

                  ctx.beginPath();

                  ctx.moveTo(hx - W * 0.01, cy + H * 0.30);

                  ctx.lineTo(hx - W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx - W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx, cy + H * 0.31);

                  ctx.lineTo(hx + W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.01, cy + H * 0.30);

                  ctx.closePath();

                  ctx.fillStyle = '#292524'; ctx.fill();

                });

                [cx - W * 0.075].forEach(function (hx) {

                  ctx.beginPath();

                  ctx.moveTo(hx - W * 0.01, cy + H * 0.30);

                  ctx.lineTo(hx - W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx - W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx, cy + H * 0.31);

                  ctx.lineTo(hx + W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.01, cy + H * 0.30);

                  ctx.closePath();

                  ctx.fillStyle = '#292524'; ctx.fill();

                });

                // Rear hooves

                [cx + W * 0.125, cx + W * 0.145, cx + W * 0.165].forEach(function (hx) {

                  ctx.beginPath();

                  ctx.moveTo(hx - W * 0.01, cy + H * 0.30);

                  ctx.lineTo(hx - W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx - W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx, cy + H * 0.31);

                  ctx.lineTo(hx + W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.01, cy + H * 0.30);

                  ctx.closePath();

                  ctx.fillStyle = '#292524'; ctx.fill();

                });



  // €â€ Draw organ pins â€â€”€â”€ Curly tail â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.22, cy - H * 0.02);

                ctx.bezierCurveTo(cx + W * 0.26, cy - H * 0.06, cx + W * 0.28, cy - H * 0.10, cx + W * 0.26, cy - H * 0.12);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();



  // €â€ Draw organ pins â€â€”€â”€ Skin layer details â”€â”€

                if (activeLayer === 'skin') {

                  ctx.globalAlpha = 0.08;

                  for (var hf = 0; hf < 50; hf++) {

                    var hfx = cx - W * 0.18 + (hf % 10) * W * 0.04;

                    var hfy = cy - H * 0.12 + Math.floor(hf / 10) * H * 0.05;

                    ctx.beginPath(); ctx.moveTo(hfx, hfy);

                    ctx.lineTo(hfx + (Math.sin(hf * 2.7) * 1.5), hfy - 3);

                    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.4; ctx.stroke();

                  }

                  ctx.globalAlpha = 1;

                  // Skin folds

                  ctx.globalAlpha = 0.05;

                  for (var sf = 0; sf < 4; sf++) {

                    ctx.beginPath();

                    ctx.moveTo(cx - W * 0.10, cy - H * 0.08 + sf * H * 0.05);

                    ctx.quadraticCurveTo(cx, cy - H * 0.10 + sf * H * 0.05, cx + W * 0.10, cy - H * 0.08 + sf * H * 0.05);

                    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.6; ctx.stroke();

                  }

                  ctx.globalAlpha = 1;

                }



  // €â€ Draw organ pins â€â€”€â”€ Pig layer overlays â”€â”€

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  // Heart

                  ctx.beginPath(); ctx.arc(cx - W * 0.04, cy - H * 0.06, W * 0.025, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  // Lungs

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.08 - W * 0.04, cy - H * 0.04, W * 0.04, H * 0.06, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.5; ctx.stroke();

                  });

                  // Liver

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.02, cy + H * 0.02, W * 0.10, H * 0.04, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  // Stomach

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.06, W * 0.06, H * 0.03, 0.2, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Intestines

                  ctx.beginPath(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5;

                  ctx.moveTo(cx - W * 0.05, cy + H * 0.08);

                  for (var pi = 0; pi < 5; pi++) {

                    ctx.quadraticCurveTo(cx + (pi % 2 ? 1 : -1) * W * 0.08, cy + H * 0.09 + pi * H * 0.012, cx + (pi % 2 ? -1 : 1) * W * 0.03, cy + H * 0.10 + pi * H * 0.012);

                  }

                  ctx.stroke();

                  // Umbilical cord

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.14);

                  ctx.quadraticCurveTo(cx + W * 0.05, cy + H * 0.20, cx + W * 0.02, cy + H * 0.26);

                  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3; ctx.stroke();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'skeleton') {

                  // Use higher opacity and darker colors for visibility

                  ctx.globalAlpha = 0.85;

                  var boneColor = '#94a3b8';

                  var boneFill = 'rgba(148,163,184,0.35)';

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.5;

    // €â€ Draw organ pins â€â€”€â”€ Skull â”€â”€

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.24, cy - H * 0.02, W * 0.07, H * 0.06, -0.2, 0, Math.PI * 2);

                  ctx.fillStyle = boneFill; ctx.fill(); ctx.stroke();

                  // Eye socket

                  ctx.beginPath(); ctx.arc(cx - W * 0.24, cy - H * 0.05, W * 0.015, 0, Math.PI * 2);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                  // Jaw

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.27, cy + H * 0.02);

                  ctx.quadraticCurveTo(cx - W * 0.30, cy + H * 0.01, cx - W * 0.30, cy - H * 0.01);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.2; ctx.stroke();

    // €â€ Draw organ pins â€â€”€â”€ Spine (vertebral column) â”€â”€

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.17, cy - H * 0.02);

                  ctx.lineTo(cx + W * 0.20, cy - H * 0.02);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 4; ctx.stroke();

                  // Vertebrae marks + neural arches

                  for (var pv = 0; pv < 18; pv++) {

                    var pvx = cx - W * 0.15 + pv * (W * 0.34 / 18);

                    ctx.beginPath(); ctx.moveTo(pvx, cy - H * 0.05); ctx.lineTo(pvx, cy + H * 0.01);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                    // Spinous process (dorsal bump)

                    ctx.beginPath(); ctx.arc(pvx, cy - H * 0.055, 1.8, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill();

                  }

    // €â€ Draw organ pins â€â€”€â”€ Ribs (extending from vertebrae down to sternum) â”€â”€

                  for (var pr = 0; pr < 8; pr++) {

                    var prx = cx - W * 0.12 + pr * (W * 0.18 / 8);

                    ctx.beginPath();

                    ctx.moveTo(prx, cy - H * 0.04);

                    ctx.bezierCurveTo(prx - W * 0.015, cy + H * 0.02, prx - W * 0.01, cy + H * 0.06, prx + W * 0.005, cy + H * 0.09);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 1; ctx.stroke();

                  }

    // €â€ Draw organ pins â€â€”€â”€ Sternum (connecting rib tips ventrally) â”€â”€

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.10, cy + H * 0.09);

                  ctx.lineTo(cx + W * 0.06, cy + H * 0.09);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 2.5; ctx.stroke();

                  // Sternebrae

                  for (var stb = 0; stb < 6; stb++) {

                    var stbx = cx - W * 0.09 + stb * (W * 0.15 / 6);

                    ctx.beginPath(); ctx.arc(stbx, cy + H * 0.09, 2.5, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill();

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 0.6; ctx.stroke();

                  }

    // €â€ Draw organ pins â€â€”€â”€ Scapula (shoulder blade â€” inside body outline) â”€â”€

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.16, cy - H * 0.04);

                  ctx.lineTo(cx - W * 0.19, cy - H * 0.11);

                  ctx.lineTo(cx - W * 0.12, cy - H * 0.09);

                  ctx.closePath();

                  ctx.fillStyle = boneFill; ctx.fill();

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.5; ctx.stroke();

                  // Scapular spine

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.17, cy - H * 0.10);

                  ctx.lineTo(cx - W * 0.14, cy - H * 0.06);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1; ctx.stroke();

    // €â€ Draw organ pins â€â€”€â”€ Pelvis (ilium-ischium-pubis, inside body) â”€â”€

                  ctx.beginPath();

                  ctx.moveTo(cx + W * 0.12, cy - H * 0.04);

                  ctx.bezierCurveTo(cx + W * 0.16, cy - H * 0.08, cx + W * 0.20, cy - H * 0.04, cx + W * 0.18, cy);

                  ctx.bezierCurveTo(cx + W * 0.20, cy + H * 0.04, cx + W * 0.16, cy + H * 0.08, cx + W * 0.12, cy + H * 0.04);

                  ctx.closePath();

                  ctx.fillStyle = boneFill; ctx.fill();

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.5; ctx.stroke();

                  // Acetabulum (hip socket)

                  ctx.beginPath(); ctx.arc(cx + W * 0.14, cy + H * 0.01, W * 0.012, 0, Math.PI * 2);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                  // Obturator foramen

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.15, cy + H * 0.03, W * 0.008, H * 0.015, 0, 0, Math.PI * 2);

                  ctx.strokeStyle = 'rgba(200,214,229,0.4)'; ctx.lineWidth = 0.6; ctx.stroke();

                  ctx.strokeStyle = boneColor;

    // €â€ Draw organ pins â€â€”€â”€ Forelimb bones â”€â”€

                  // Humerus + radius/ulna for each front leg

                  [[-0.135, -0.005], [-0.105, 0.005]].forEach(function (lp) {

                    var legX = cx + W * lp[0];

                    // Humerus (upper)

                    ctx.beginPath(); ctx.moveTo(legX, cy + H * 0.12);

                    ctx.lineTo(legX - W * 0.005, cy + H * 0.20);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2.5; ctx.stroke();

                    // Elbow joint

                    ctx.beginPath(); ctx.arc(legX - W * 0.005, cy + H * 0.20, 3, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill(); ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                    // Radius/ulna (lower)

                    ctx.beginPath(); ctx.moveTo(legX - W * 0.005, cy + H * 0.20);

                    ctx.lineTo(legX, cy + H * 0.29);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2; ctx.stroke();

                  });

    // €â€ Draw organ pins â€â€”€â”€ Hindlimb bones â”€â”€

                  // Femur + tibia/fibula for each rear leg

                  [[0.115, -0.005], [0.145, 0.005]].forEach(function (lp) {

                    var legX = cx + W * lp[0];

                    // Femur (upper)

                    ctx.beginPath(); ctx.moveTo(legX, cy + H * 0.12);

                    ctx.lineTo(legX + W * 0.005, cy + H * 0.20);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2.5; ctx.stroke();

                    // Knee joint

                    ctx.beginPath(); ctx.arc(legX + W * 0.005, cy + H * 0.20, 3, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill(); ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                    // Tibia/fibula (lower)

                    ctx.beginPath(); ctx.moveTo(legX + W * 0.005, cy + H * 0.20);

                    ctx.lineTo(legX, cy + H * 0.29);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2; ctx.stroke();

                  });

    // €â€ Draw organ pins â€â€”€â”€ Hoof bones (distal phalanges) â”€â”€

                  [cx - W * 0.135, cx - W * 0.105, cx + W * 0.115, cx + W * 0.145].forEach(function (hx) {

                    ctx.beginPath();

                    ctx.moveTo(hx - W * 0.008, cy + H * 0.30);

                    ctx.lineTo(hx - W * 0.01, cy + H * 0.32);

                    ctx.lineTo(hx, cy + H * 0.31);

                    ctx.lineTo(hx + W * 0.01, cy + H * 0.32);

                    ctx.lineTo(hx + W * 0.008, cy + H * 0.30);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 1; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'fish') {

                // ══ PERCH (Perca) — fusiform bony fish ══

                // ======== FINS (drawn first so body covers fin bases) ========

                // ── Spiny dorsal fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.10, cy - H * 0.14);
                // Fin rises from dorsal contour — base merges INTO body
                ctx.bezierCurveTo(cx - W * 0.08, cy - H * 0.22, cx - W * 0.01, cy - H * 0.26, cx + W * 0.03, cy - H * 0.24);
                ctx.bezierCurveTo(cx + W * 0.06, cy - H * 0.22, cx + W * 0.08, cy - H * 0.19, cx + W * 0.10, cy - H * 0.13);
                // Return path dips INTO body so body covers it
                ctx.lineTo(cx + W * 0.10, cy - H * 0.10);
                ctx.lineTo(cx - W * 0.10, cy - H * 0.11);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.45; ctx.fill();
                // Only stroke the OUTER edge (not the base that body will cover)
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.10, cy - H * 0.14);
                ctx.bezierCurveTo(cx - W * 0.08, cy - H * 0.22, cx - W * 0.01, cy - H * 0.26, cx + W * 0.03, cy - H * 0.24);
                ctx.bezierCurveTo(cx + W * 0.06, cy - H * 0.22, cx + W * 0.08, cy - H * 0.19, cx + W * 0.10, cy - H * 0.13);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
                // Spine rays
                ctx.globalAlpha = 0.35;
                for (var ds = 0; ds < 9; ds++) {
                  var dsP = ds / 8;
                  var dsX = cx - W * 0.10 + dsP * W * 0.20;
                  var dsBaseY = cy - H * 0.14;
                  var dsH = Math.sin(dsP * Math.PI) * H * 0.12 + H * 0.03;
                  ctx.beginPath(); ctx.moveTo(dsX, dsBaseY); ctx.lineTo(dsX, dsBaseY - dsH);
                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // ── Soft dorsal fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.14, cy - H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.15, cy - H * 0.17, cx + W * 0.18, cy - H * 0.18, cx + W * 0.21, cy - H * 0.15);
                ctx.bezierCurveTo(cx + W * 0.22, cy - H * 0.13, cx + W * 0.22, cy - H * 0.10, cx + W * 0.22, cy - H * 0.09);
                ctx.lineTo(cx + W * 0.22, cy - H * 0.06);
                ctx.lineTo(cx + W * 0.14, cy - H * 0.08);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.40; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.14, cy - H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.15, cy - H * 0.17, cx + W * 0.18, cy - H * 0.18, cx + W * 0.21, cy - H * 0.15);
                ctx.bezierCurveTo(cx + W * 0.22, cy - H * 0.13, cx + W * 0.22, cy - H * 0.10, cx + W * 0.22, cy - H * 0.09);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
                // Soft rays
                ctx.globalAlpha = 0.25;
                for (var sd = 0; sd < 5; sd++) {
                  var sdP = sd / 4;
                  var sdX = cx + W * (0.14 + sdP * 0.08);
                  ctx.beginPath(); ctx.moveTo(sdX, cy - H * 0.10);
                  ctx.lineTo(sdX, cy - H * (0.10 + Math.sin(sdP * Math.PI) * 0.07 + 0.02));
                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.35; ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // ── Anal fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.12, cy + H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.17, cx + W * 0.16, cy + H * 0.18, cx + W * 0.18, cy + H * 0.14);
                ctx.lineTo(cx + W * 0.18, cy + H * 0.08);
                ctx.lineTo(cx + W * 0.12, cy + H * 0.08);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.40; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.12, cy + H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.17, cx + W * 0.16, cy + H * 0.18, cx + W * 0.18, cy + H * 0.14);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.7; ctx.stroke(); ctx.globalAlpha = 1;

                // ── Pelvic fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.06, cy + H * 0.12);
                ctx.bezierCurveTo(cx - W * 0.08, cy + H * 0.16, cx - W * 0.10, cy + H * 0.19, cx - W * 0.08, cy + H * 0.20);
                ctx.bezierCurveTo(cx - W * 0.05, cy + H * 0.19, cx - W * 0.03, cy + H * 0.16, cx - W * 0.02, cy + H * 0.13);
                ctx.lineTo(cx - W * 0.02, cy + H * 0.10);
                ctx.lineTo(cx - W * 0.06, cy + H * 0.10);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.35; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.06, cy + H * 0.12);
                ctx.bezierCurveTo(cx - W * 0.08, cy + H * 0.16, cx - W * 0.10, cy + H * 0.19, cx - W * 0.08, cy + H * 0.20);
                ctx.bezierCurveTo(cx - W * 0.05, cy + H * 0.19, cx - W * 0.03, cy + H * 0.16, cx - W * 0.02, cy + H * 0.13);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke(); ctx.globalAlpha = 1;

                // ── Pectoral fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.16, cy + H * 0.02);
                ctx.bezierCurveTo(cx - W * 0.19, cy + H * 0.06, cx - W * 0.20, cy + H * 0.12, cx - W * 0.17, cy + H * 0.14);
                ctx.bezierCurveTo(cx - W * 0.14, cy + H * 0.12, cx - W * 0.13, cy + H * 0.08, cx - W * 0.14, cy + H * 0.04);
                ctx.lineTo(cx - W * 0.14, cy + H * 0.00);
                ctx.lineTo(cx - W * 0.16, cy + H * 0.00);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.35; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.16, cy + H * 0.02);
                ctx.bezierCurveTo(cx - W * 0.19, cy + H * 0.06, cx - W * 0.20, cy + H * 0.12, cx - W * 0.17, cy + H * 0.14);
                ctx.bezierCurveTo(cx - W * 0.14, cy + H * 0.12, cx - W * 0.13, cy + H * 0.08, cx - W * 0.14, cy + H * 0.04);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke(); ctx.globalAlpha = 1;

                // ======== BODY (drawn on top, covers fin bases) ========

                // ── Body (streamlined fusiform shape) ──

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.30, cy); // snout tip

                ctx.bezierCurveTo(cx - W * 0.25, cy - H * 0.08, cx - W * 0.18, cy - H * 0.13, cx - W * 0.10, cy - H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.02, cy - H * 0.15, cx + W * 0.08, cy - H * 0.13, cx + W * 0.16, cy - H * 0.10);

                ctx.bezierCurveTo(cx + W * 0.22, cy - H * 0.08, cx + W * 0.25, cy - H * 0.06, cx + W * 0.26, cy - H * 0.04);

                // Caudal peduncle

                ctx.lineTo(cx + W * 0.28, cy - H * 0.03);

                // Caudal fin (forked)

                ctx.lineTo(cx + W * 0.34, cy - H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.33, cy - H * 0.06, cx + W * 0.33, cy + H * 0.06, cx + W * 0.34, cy + H * 0.12);

                ctx.lineTo(cx + W * 0.28, cy + H * 0.03);

                // Ventral contour

                ctx.lineTo(cx + W * 0.26, cy + H * 0.04);

                ctx.bezierCurveTo(cx + W * 0.22, cy + H * 0.08, cx + W * 0.16, cy + H * 0.10, cx + W * 0.08, cy + H * 0.12);

                ctx.bezierCurveTo(cx - W * 0.02, cy + H * 0.14, cx - W * 0.12, cy + H * 0.14, cx - W * 0.20, cy + H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.25, cy + H * 0.07, cx - W * 0.28, cy + H * 0.04, cx - W * 0.30, cy);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

                // Dorsal highlight

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.20, cy - H * 0.08);

                ctx.quadraticCurveTo(cx, cy - H * 0.12, cx + W * 0.18, cy - H * 0.06);

                ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3; ctx.stroke();

                // ── Operculum (gill cover) ──

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.16, cy - H * 0.04, cx - W * 0.16, cy + H * 0.04, cx - W * 0.18, cy + H * 0.08);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // ── Eye ──

                ctx.beginPath(); ctx.arc(cx - W * 0.23, cy - H * 0.02, 6, 0, Math.PI * 2);

                ctx.fillStyle = '#fef9c3'; ctx.fill(); ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.23, cy - H * 0.02, 3, 0, Math.PI * 2); ctx.fillStyle = '#1a1a1a'; ctx.fill();

                ctx.beginPath(); ctx.arc(cx - W * 0.225, cy - H * 0.03, 1.5, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();

                // ── Mouth ──

                ctx.beginPath(); ctx.moveTo(cx - W * 0.30, cy); ctx.lineTo(cx - W * 0.28, cy + H * 0.02);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();


  // €â€ Draw organ pins â€â€”€â”€ Scale pattern â”€â”€

                ctx.globalAlpha = 0.12;

                for (var sc = 0; sc < 12; sc++) {

                  for (var sr = 0; sr < 4; sr++) {

                    var scx = cx - W * 0.15 + sc * W * 0.035 + (sr % 2) * W * 0.017;

                    var scy = cy - H * 0.08 + sr * H * 0.04;

                    ctx.beginPath(); ctx.arc(scx, scy, W * 0.012, 0, Math.PI, true);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.4; ctx.stroke();

                  }

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Caudal fin rays â”€â”€

                ctx.globalAlpha = 0.25;

                for (var cfr = 0; cfr < 7; cfr++) {

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.28, cy);

                  ctx.lineTo(cx + W * 0.34, cy - H * 0.10 + cfr * H * 0.03);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.4; ctx.stroke();

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Lateral line â”€â”€

                ctx.globalAlpha = 0.3;

                for (var ll = 0; ll < 18; ll++) {

                  ctx.beginPath(); ctx.arc(cx - W * 0.22 + ll * W * 0.025, cy - H * 0.01, 1, 0, Math.PI * 2);

                  ctx.fillStyle = layerStroke; ctx.fill();

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Perch vertical bars â”€â”€

                ctx.globalAlpha = 0.08;

                for (var pb = 0; pb < 6; pb++) {

                  var pbx = cx - W * 0.10 + pb * W * 0.06;

                  ctx.beginPath(); ctx.moveTo(pbx, cy - H * 0.10); ctx.lineTo(pbx, cy + H * 0.08);

                  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = W * 0.015; ctx.stroke();

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Layer overlays â”€â”€

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.04, W * 0.10, H * 0.035, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(219,234,254,0.6)'; ctx.fill();

                  ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.beginPath(); ctx.arc(cx - W * 0.20, cy + H * 0.04, W * 0.015, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.10, cy + H * 0.02, W * 0.05, H * 0.03, 0.2, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.03, cy + H * 0.04, W * 0.04, H * 0.02, -0.1, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.01, cy + H * 0.04);

                  ctx.quadraticCurveTo(cx + W * 0.08, cy + H * 0.06, cx + W * 0.12, cy + H * 0.04);

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke();

                  for (var gf = 0; gf < 5; gf++) {

                    ctx.beginPath(); ctx.moveTo(cx - W * 0.175, cy - H * 0.06 + gf * H * 0.025);

                    ctx.lineTo(cx - W * 0.20, cy - H * 0.06 + gf * H * 0.025);

                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();

                  }

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.08, W * 0.12, H * 0.012, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#78350f'; ctx.fill();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'skeleton') {

                  ctx.globalAlpha = 0.7; var boneC = '#94a3b8';

                  ctx.strokeStyle = boneC; ctx.lineWidth = 1.5;

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.25, cy - H * 0.01, W * 0.06, H * 0.05, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(148,163,184,0.2)'; ctx.fill(); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.28, cy);

                  ctx.lineTo(cx - W * 0.30, cy + H * 0.03); ctx.lineTo(cx - W * 0.24, cy + H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.19, cy - H * 0.02);

                  ctx.lineTo(cx + W * 0.26, cy - H * 0.02); ctx.lineWidth = 3; ctx.stroke();

                  for (var fv = 0; fv < 22; fv++) {

                    var fvx = cx - W * 0.18 + fv * (W * 0.43 / 22);

                    ctx.beginPath(); ctx.moveTo(fvx, cy - H * 0.05); ctx.lineTo(fvx, cy + H * 0.01);

                    ctx.strokeStyle = boneC; ctx.lineWidth = 0.6; ctx.stroke();

                  }

                  for (var rb = 0; rb < 10; rb++) {

                    var rbx = cx - W * 0.15 + rb * W * 0.03;

                    ctx.beginPath(); ctx.moveTo(rbx, cy);

                    ctx.quadraticCurveTo(rbx - W * 0.005, cy + H * 0.06, rbx, cy + H * 0.08);

                    ctx.strokeStyle = boneC; ctx.lineWidth = 0.5; ctx.stroke();

                  }

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.19, cy, W * 0.02, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.strokeStyle = boneC; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'crayfish') {

  // €â€ Draw organ pins â€â€•â• CRAYFISH (Cambarus) â€” crustacean â•â•

  // €â€ Draw organ pins â€â€”€â”€ Cephalothorax â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.06);

                ctx.bezierCurveTo(cx - W * 0.20, cy - H * 0.10, cx - W * 0.12, cy - H * 0.14, cx - W * 0.02, cy - H * 0.14);

                ctx.bezierCurveTo(cx + W * 0.06, cy - H * 0.14, cx + W * 0.10, cy - H * 0.12, cx + W * 0.12, cy - H * 0.08);

                ctx.bezierCurveTo(cx + W * 0.12, cy - H * 0.04, cx + W * 0.10, cy + H * 0.04, cx + W * 0.12, cy + H * 0.08);

                ctx.bezierCurveTo(cx + W * 0.10, cy + H * 0.12, cx + W * 0.06, cy + H * 0.14, cx - W * 0.02, cy + H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.12, cy + H * 0.14, cx - W * 0.20, cy + H * 0.10, cx - W * 0.18, cy + H * 0.06);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

                // Cervical groove

                ctx.beginPath(); ctx.moveTo(cx - W * 0.04, cy - H * 0.13);

                ctx.quadraticCurveTo(cx - W * 0.06, cy, cx - W * 0.04, cy + H * 0.13);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;

                // Carapace texture

                ctx.globalAlpha = 0.06;

                for (var ct = 0; ct < 30; ct++) {

                  ctx.beginPath(); ctx.arc(cx - W * 0.12 + (ct % 6) * W * 0.04, cy - H * 0.10 + Math.floor(ct / 6) * H * 0.04, 1.5, 0, Math.PI * 2);

                  // Theme-aware texture dots (was hardcoded black) — use deepest palette tone for contrast on any theme
                  var _dotPalette = (typeof window !== 'undefined' && window.AlloStemTheme && window.AlloStemTheme.palette) ? window.AlloStemTheme.palette() : { deeper: '#020617' };
                  ctx.fillStyle = _dotPalette.deeper || _dotPalette.canvas || '#020617';
                  ctx.fill();

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Rostrum â”€â”€

                ctx.beginPath(); ctx.moveTo(cx - W * 0.18, cy - H * 0.04);

                ctx.lineTo(cx - W * 0.26, cy); ctx.lineTo(cx - W * 0.18, cy + H * 0.04);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

  // €â€ Draw organ pins â€â€”€â”€ Compound eyes â”€â”€

                ctx.beginPath(); ctx.moveTo(cx - W * 0.18, cy - H * 0.06);

                ctx.lineTo(cx - W * 0.22, cy - H * 0.10);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.22, cy - H * 0.10, 3.5, 0, Math.PI * 2);

                ctx.fillStyle = '#1a1a1a'; ctx.fill();

                ctx.beginPath(); ctx.arc(cx - W * 0.218, cy - H * 0.105, 1.2, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();

                ctx.beginPath(); ctx.moveTo(cx - W * 0.18, cy + H * 0.06);

                ctx.lineTo(cx - W * 0.22, cy + H * 0.10);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.22, cy + H * 0.10, 3.5, 0, Math.PI * 2);

                ctx.fillStyle = '#1a1a1a'; ctx.fill();

  // €â€ Draw organ pins â€â€”€â”€ Antennae â”€â”€

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1;

                ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy - H * 0.08);

                ctx.bezierCurveTo(cx - W * 0.28, cy - H * 0.14, cx - W * 0.30, cy - H * 0.08, cx - W * 0.34, cy - H * 0.10);

                ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy + H * 0.08);

                ctx.bezierCurveTo(cx - W * 0.28, cy + H * 0.14, cx - W * 0.30, cy + H * 0.08, cx - W * 0.34, cy + H * 0.10);

                ctx.stroke();

                ctx.lineWidth = 0.6;

                ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy - H * 0.04);

                ctx.lineTo(cx - W * 0.28, cy - H * 0.06); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy + H * 0.04);

                ctx.lineTo(cx - W * 0.28, cy + H * 0.06); ctx.stroke();

  // €â€ Draw organ pins â€â€”€â”€ Abdomen â”€â”€

                for (var seg = 0; seg < 6; seg++) {

                  var segX = cx + W * 0.12 + seg * W * 0.035;

                  var segH2 = H * (0.10 - seg * 0.008);

                  ctx.beginPath(); ctx.rect(segX, cy - segH2, W * 0.035, segH2 * 2);

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                }

  // €â€ Draw organ pins â€â€”€â”€ Telson + Uropods â”€â”€

                var tailX = cx + W * 0.33;

                ctx.beginPath(); ctx.moveTo(tailX, cy - H * 0.04);

                ctx.lineTo(tailX + W * 0.06, cy); ctx.lineTo(tailX, cy + H * 0.04); ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(tailX, cy - H * 0.04);

                ctx.bezierCurveTo(tailX + W * 0.03, cy - H * 0.10, tailX + W * 0.06, cy - H * 0.08, tailX + W * 0.05, cy - H * 0.02);

                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.6; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.stroke(); ctx.globalAlpha = 1;

                ctx.beginPath(); ctx.moveTo(tailX, cy + H * 0.04);

                ctx.bezierCurveTo(tailX + W * 0.03, cy + H * 0.10, tailX + W * 0.06, cy + H * 0.08, tailX + W * 0.05, cy + H * 0.02);

                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.6; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.stroke(); ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Chelipeds (claws) â”€â”€

                [-1, 1].forEach(function (s) {

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.14, cy + s * H * 0.10);

                  ctx.lineTo(cx - W * 0.22, cy + s * H * 0.16);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy + s * H * 0.16);

                  ctx.lineTo(cx - W * 0.28, cy + s * H * 0.20);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 2.5; ctx.stroke();

                  // Pincer

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.28, cy + s * H * 0.20);

                  ctx.bezierCurveTo(cx - W * 0.32, cy + s * H * 0.18, cx - W * 0.34, cy + s * H * 0.19, cx - W * 0.34, cy + s * H * 0.20);

                  ctx.bezierCurveTo(cx - W * 0.34, cy + s * H * 0.21, cx - W * 0.32, cy + s * H * 0.22, cx - W * 0.28, cy + s * H * 0.20);

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                });

  // €â€ Draw organ pins â€â€”€â”€ Walking legs (4 pairs) â”€â”€

                for (var wl = 0; wl < 4; wl++) {

                  [-1, 1].forEach(function (s) {

                    var lx = cx - W * 0.04 + wl * W * 0.04;

                    ctx.beginPath(); ctx.moveTo(lx, cy + s * H * 0.12);

                    ctx.lineTo(lx - W * 0.02, cy + s * H * 0.20);

                    ctx.lineTo(lx - W * 0.04, cy + s * H * 0.26);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke();

                    ctx.beginPath(); ctx.arc(lx - W * 0.02, cy + s * H * 0.20, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = layerStroke; ctx.fill();

                  });

                }

  // €â€ Draw organ pins â€â€”€â”€ Swimmerets â”€â”€

                ctx.globalAlpha = 0.3;

                for (var sw = 0; sw < 5; sw++) {

                  var swx = cx + W * 0.14 + sw * W * 0.035;

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(swx, cy + s * H * 0.04);

                    ctx.lineTo(swx + W * 0.01, cy + s * H * 0.08);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke();

                  });

                }

                ctx.globalAlpha = 1;

  // €â€ Draw organ pins â€â€”€â”€ Layer overlays â”€â”€

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  ctx.beginPath(); ctx.arc(cx + W * 0.04, cy, W * 0.02, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.02, cy, W * 0.05, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.beginPath(); ctx.arc(cx - W * 0.10, cy, W * 0.018, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  for (var cg = 0; cg < 3; cg++) {

                    ctx.beginPath(); ctx.ellipse(cx + W * 0.06, cy + (cg - 1) * H * 0.04, W * 0.015, H * 0.02, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fca5a5'; ctx.fill();

                  }

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.02, cy);

                  ctx.lineTo(cx + W * 0.32, cy);

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5; ctx.stroke();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'nervous') {

                  ctx.globalAlpha = 0.6;

                  ctx.beginPath(); ctx.arc(cx - W * 0.14, cy, W * 0.018, 0, Math.PI * 2);

                  ctx.fillStyle = '#fbbf24'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy);

                  ctx.lineTo(cx + W * 0.32, cy);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();

                  for (var ng = 0; ng < 8; ng++) {

                    ctx.beginPath(); ctx.arc(cx - W * 0.10 + ng * W * 0.05, cy, 3, 0, Math.PI * 2);

                    ctx.fillStyle = '#f59e0b'; ctx.fill();

                  }

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'eye') {

                // Sheep eye â€” cross-section

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.30, 0, Math.PI * 2);

                ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.stroke();

                ctx.shadowBlur = 0;

                // Choroid (dark inner layer)

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.27, 0, Math.PI * 2);

                ctx.fillStyle = '#1e1b4b'; ctx.fill();

                // Retina (inner)

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.25, 0, Math.PI * 2);

                ctx.fillStyle = '#fef3c7'; ctx.fill();

                // Vitreous humor (clear)

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.23, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(219,234,254,0.5)'; ctx.fill();

                // Lens

                ctx.beginPath(); ctx.ellipse(cx - W * 0.12, cy, W * 0.06, H * 0.10, 0, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5; ctx.stroke();

                // Cornea (front bulge)

                ctx.beginPath(); ctx.arc(cx - W * 0.28, cy, W * 0.08, -Math.PI * 0.4, Math.PI * 0.4);

                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2.5; ctx.stroke();

                // Iris

                ctx.beginPath(); ctx.arc(cx - W * 0.16, cy, H * 0.08, 0, Math.PI * 2);

                ctx.fillStyle = '#7c3aed'; ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;

                ctx.beginPath(); ctx.arc(cx - W * 0.16, cy, H * 0.03, 0, Math.PI * 2);

                ctx.fillStyle = '#0f172a'; ctx.fill(); // pupil

                // Optic nerve with myelin sheath

                ctx.beginPath(); ctx.moveTo(cx + W * 0.30, cy);

                ctx.lineTo(cx + W * 0.38, cy + H * 0.05);

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 6; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx + W * 0.30, cy);

                ctx.lineTo(cx + W * 0.38, cy + H * 0.05);

                ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.stroke();

                // Blood vessels on retina

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.4;

                ctx.beginPath(); ctx.moveTo(cx + W * 0.10, cy);

                ctx.quadraticCurveTo(cx + W * 0.05, cy - H * 0.10, cx - W * 0.05, cy - H * 0.12); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx + W * 0.10, cy);

                ctx.quadraticCurveTo(cx + W * 0.05, cy + H * 0.08, cx - W * 0.05, cy + H * 0.10); ctx.stroke();

                ctx.globalAlpha = 1;

                // Tapetum reflection

                ctx.beginPath(); ctx.arc(cx + W * 0.10, cy, W * 0.08, -0.5, 0.5);

                ctx.strokeStyle = 'rgba(34,211,238,0.3)'; ctx.lineWidth = 8; ctx.shadowColor = 'rgba(34,211,238,0.6)'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;

                // Animated light refraction ray

                var rayPhase = (dissTick * 0.02) % (Math.PI * 2);

                var rayAlpha = 0.3 + Math.sin(rayPhase) * 0.15;

                ctx.globalAlpha = rayAlpha;

                // Incoming ray

                ctx.beginPath(); ctx.moveTo(cx - W * 0.45, cy - H * 0.08);

                ctx.lineTo(cx - W * 0.28, cy); // hits cornea

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                // Ray through cornea â†’ aqueous humor â†’ lens (bends)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.28, cy);

                ctx.quadraticCurveTo(cx - W * 0.20, cy + H * 0.01, cx - W * 0.12, cy); // through pupil/lens

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                // Ray through vitreous â†’ hits retina (converges)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy);

                ctx.lineTo(cx + W * 0.10, cy + H * 0.02); // focal point on retina

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                // Focal point glow

                ctx.beginPath(); ctx.arc(cx + W * 0.10, cy + H * 0.02, 4, 0, Math.PI * 2);

                var focalGrad = ctx.createRadialGradient(cx + W * 0.10, cy + H * 0.02, 0, cx + W * 0.10, cy + H * 0.02, 4);

                focalGrad.addColorStop(0, 'rgba(251,191,36,0.8)');

                focalGrad.addColorStop(1, 'rgba(251,191,36,0)');

                ctx.fillStyle = focalGrad; ctx.fill();

                // Ray label

                ctx.font = '8px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                ctx.fillText('Light Ray', cx - W * 0.44, cy - H * 0.10);

                ctx.globalAlpha = 1;

                // Aqueous humor label

                ctx.font = '7px Inter, system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.25)';

                ctx.fillText('Aqueous Humor', cx - W * 0.24, cy + H * 0.06);

                ctx.fillText('Vitreous Humor', cx - W * 0.05, cy + H * 0.10);

                // Ciliary body

                ctx.beginPath(); ctx.arc(cx - W * 0.14, cy - H * 0.08, W * 0.015, 0, Math.PI);

                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.14, cy + H * 0.08, W * 0.015, Math.PI, Math.PI * 2);

                ctx.strokeStyle = '#a78bfa'; ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillText('Ciliary Body', cx - W * 0.18, cy - H * 0.11);

                // Suspensory ligaments (zonules)

                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.4;

                for (var zl = 0; zl < 6; zl++) {

                  var za = -0.5 + zl * 0.2;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.14 + Math.cos(za) * W * 0.015, cy + Math.sin(za) * H * 0.08);

                  ctx.lineTo(cx - W * 0.12 + Math.cos(za) * W * 0.04, cy + Math.sin(za) * H * 0.06);

                  ctx.stroke();

                }

                // Fovea centralis (center of macula)

                ctx.beginPath(); ctx.arc(cx + W * 0.10, cy, 2.5, 0, Math.PI * 2);

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.stroke();

                ctx.fillStyle = 'rgba(251,191,36,0.3)'; ctx.fillText('Fovea', cx + W * 0.12, cy - H * 0.02);

                // Blind spot (optic disc)

                ctx.beginPath(); ctx.arc(cx + W * 0.18, cy + H * 0.03, 3, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(251,191,36,0.4)'; ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillText('Optic Disc', cx + W * 0.20, cy + H * 0.02);

                // Iris sphincter muscle detail

                ctx.globalAlpha = 0.15;

                for (var ism = 0; ism < 12; ism++) {

                  var ismA = (ism / 12) * Math.PI * 2;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.24 + Math.cos(ismA) * W * 0.06, cy + Math.sin(ismA) * H * 0.04);

                  ctx.lineTo(cx - W * 0.24 + Math.cos(ismA) * W * 0.08, cy + Math.sin(ismA) * H * 0.06);

                  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 0.5; ctx.stroke();

                }

                ctx.globalAlpha = 1;

                // Macula lutea region

                ctx.beginPath(); ctx.ellipse(cx + W * 0.10, cy, W * 0.03, H * 0.02, 0, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(251,191,36,0.2)'; ctx.lineWidth = 0.5; ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillText('Macula', cx + W * 0.12, cy + H * 0.03);

                // Rod and cone cell detail on retina

                ctx.globalAlpha = 0.15;

                for (var rc = 0; rc < 20; rc++) {

                  var rcAngle = Math.PI * 0.65 + rc * Math.PI * 0.02;

                  var rcR = W * 0.28;

                  var rcx = cx + Math.cos(rcAngle) * rcR;

                  var rcy = cy + Math.sin(rcAngle) * rcR;

                  ctx.beginPath();

                  if (rc % 3 === 0) {

                    // Cone cell (triangle shape)

                    ctx.moveTo(rcx, rcy - 1.5); ctx.lineTo(rcx - 1, rcy + 1.5); ctx.lineTo(rcx + 1, rcy + 1.5); ctx.closePath();

                    ctx.fillStyle = '#3b82f6'; ctx.fill();

                  } else {

                    // Rod cell (rectangle shape)

                    ctx.fillStyle = '#94a3b8';

                    ctx.fillRect(rcx - 0.5, rcy - 2, 1, 4);

                  }

                }

                ctx.globalAlpha = 1;

                ctx.font = '5px Inter, system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.15)';

                ctx.fillText('Rods', cx + W * 0.22, cy - H * 0.14);

                ctx.fillStyle = 'rgba(59,130,246,0.15)';

                ctx.fillText('Cones', cx + W * 0.22, cy - H * 0.12);

              } else if (spec.bodyShape === 'heart') {

                // Sheep heart â€” anatomical shape with beating animation

                var heartPhase = (dissTick * 0.04) % (Math.PI * 2);

                var systole = Math.max(0, Math.sin(heartPhase));

                var heartScale = 1 + systole * 0.03;

                ctx.save();

                ctx.translate(cx, cy);

                ctx.scale(heartScale, heartScale);

                ctx.translate(-cx, -cy);

                ctx.beginPath();

                ctx.moveTo(cx, cy - H * 0.25);

                ctx.quadraticCurveTo(cx - W * 0.22, cy - H * 0.30, cx - W * 0.25, cy - H * 0.10);

                ctx.quadraticCurveTo(cx - W * 0.26, cy + H * 0.05, cx - W * 0.15, cy + H * 0.18);

                ctx.quadraticCurveTo(cx - W * 0.05, cy + H * 0.30, cx, cy + H * 0.28);

                ctx.quadraticCurveTo(cx + W * 0.05, cy + H * 0.30, cx + W * 0.15, cy + H * 0.18);

                ctx.quadraticCurveTo(cx + W * 0.26, cy + H * 0.05, cx + W * 0.25, cy - H * 0.10);

                ctx.quadraticCurveTo(cx + W * 0.22, cy - H * 0.30, cx, cy - H * 0.25);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 2; ctx.stroke();

                ctx.shadowBlur = 0;

                // Septum line

                ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.20); ctx.lineTo(cx, cy + H * 0.25);

                ctx.strokeStyle = layerStroke; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;

                // Great vessels stubs

                ctx.beginPath(); ctx.moveTo(cx - W * 0.08, cy - H * 0.25); ctx.lineTo(cx - W * 0.10, cy - H * 0.35);

                ctx.lineTo(cx - W * 0.04, cy - H * 0.35); ctx.closePath();

                ctx.fillStyle = '#ef4444'; ctx.fill(); // aorta stub

                ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy - H * 0.25); ctx.lineTo(cx + W * 0.10, cy - H * 0.35);

                ctx.lineTo(cx + W * 0.04, cy - H * 0.35); ctx.closePath();

                ctx.fillStyle = '#3b82f6'; ctx.fill(); // pulm trunk stub

                // Left coronary artery (LAD)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.06, cy - H * 0.18);

                ctx.quadraticCurveTo(cx - W * 0.15, cy, cx - W * 0.10, cy + H * 0.15);

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.stroke();

                // Right coronary artery

                ctx.beginPath(); ctx.moveTo(cx + W * 0.06, cy - H * 0.18);

                ctx.quadraticCurveTo(cx + W * 0.18, cy - H * 0.05, cx + W * 0.12, cy + H * 0.10);

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();

                // Coronary sinus (venous drainage)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy + H * 0.12);

                ctx.quadraticCurveTo(cx, cy + H * 0.18, cx + W * 0.10, cy + H * 0.12);

                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.stroke();

                // Pericardium outline (outer membrane)

                ctx.beginPath();

                ctx.ellipse(cx, cy, W * 0.28, H * 0.30, 0, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

                ctx.globalAlpha = 1;

                // ECG waveform display (bottom of canvas)

                var ecgY = H - 35; var ecgW = W * 0.6; var ecgX = (W - ecgW) / 2;

                ctx.fillStyle = 'rgba(15,23,42,0.7)';

                ctx.fillRect(ecgX - 5, ecgY - 20, ecgW + 10, 35);

                ctx.strokeStyle = 'rgba(34,197,94,0.15)'; ctx.lineWidth = 0.3;

                // Grid lines

                for (var eg = 0; eg < 6; eg++) { ctx.beginPath(); ctx.moveTo(ecgX, ecgY - 15 + eg * 5); ctx.lineTo(ecgX + ecgW, ecgY - 15 + eg * 5); ctx.stroke(); }

                // ECG trace

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5; ctx.beginPath();

                for (var ep = 0; ep < ecgW; ep++) {

                  var et = ((ep + dissTick * 2) % ecgW) / ecgW;

                  var ey = ecgY;

                  // P wave

                  if (et > 0.05 && et < 0.15) ey -= Math.sin((et - 0.05) * 10 * Math.PI) * 4;

                  // QRS complex

                  else if (et > 0.20 && et < 0.22) ey += (et - 0.20) * 200;

                  else if (et > 0.22 && et < 0.26) ey -= 15 - (et - 0.22) * 375;

                  else if (et > 0.26 && et < 0.28) ey += (et - 0.26) * 150;

                  // T wave

                  else if (et > 0.35 && et < 0.50) ey -= Math.sin((et - 0.35) * 6.67 * Math.PI) * 5;

                  ep === 0 ? ctx.moveTo(ecgX + ep, ey) : ctx.lineTo(ecgX + ep, ey);

                }

                ctx.stroke();

                // BPM display

                var bpm = 72 + Math.floor(Math.sin(dissTick * 0.02) * 5);

                ctx.font = 'bold 10px Inter, system-ui'; ctx.fillStyle = '#22c55e';

                ctx.fillText(bpm + ' BPM', ecgX + ecgW + 8, ecgY);

                ctx.font = '6px Inter, system-ui'; ctx.fillStyle = 'rgba(34,197,94,0.5)';

                ctx.fillText('P', ecgX + ecgW * 0.10, ecgY - 18); ctx.fillText('QRS', ecgX + ecgW * 0.23, ecgY - 18); ctx.fillText('T', ecgX + ecgW * 0.42, ecgY - 18);

                // Chamber shading (left side thicker wall)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.04, cy - H * 0.15);

                ctx.quadraticCurveTo(cx - W * 0.20, cy, cx - W * 0.10, cy + H * 0.20);

                ctx.strokeStyle = 'rgba(239,68,68,0.15)'; ctx.lineWidth = 12; ctx.stroke();

                // Right side (thinner wall)

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.04, cy - H * 0.15);

                ctx.quadraticCurveTo(cx + W * 0.18, cy, cx + W * 0.10, cy + H * 0.18);

                ctx.strokeStyle = 'rgba(59,130,246,0.12)'; ctx.lineWidth = 8; ctx.stroke();

                ctx.restore(); // End heartbeat scale

                // Conduction system animation

                if (activeLayer === 'nervous' || activeLayer === 'conduction') {

                  ctx.globalAlpha = 0.7;

                  var condPhase = (dissTick * 0.03) % 1;

                  // SA Node (pacemaker)

                  var saGlow = Math.max(0, Math.sin(condPhase * Math.PI * 2));

                  ctx.beginPath(); ctx.arc(cx + W * 0.12, cy - H * 0.14, 5 + saGlow * 3, 0, Math.PI * 2);

                  var saGrad = ctx.createRadialGradient(cx + W * 0.12, cy - H * 0.14, 0, cx + W * 0.12, cy - H * 0.14, 5 + saGlow * 3);

                  saGrad.addColorStop(0, 'rgba(251,191,36,' + (0.5 + saGlow * 0.5) + ')');

                  saGrad.addColorStop(1, 'rgba(251,191,36,0)');

                  ctx.fillStyle = saGrad; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#fbbf24'; ctx.fillText('SA Node', cx + W * 0.13, cy - H * 0.18);

                  // AV Node

                  var avDelay = Math.max(0, Math.sin((condPhase - 0.15) * Math.PI * 2));

                  ctx.beginPath(); ctx.arc(cx, cy - H * 0.04, 4 + avDelay * 2, 0, Math.PI * 2);

                  var avGrad = ctx.createRadialGradient(cx, cy - H * 0.04, 0, cx, cy - H * 0.04, 4 + avDelay * 2);

                  avGrad.addColorStop(0, 'rgba(34,197,94,' + (0.4 + avDelay * 0.5) + ')');

                  avGrad.addColorStop(1, 'rgba(34,197,94,0)');

                  ctx.fillStyle = avGrad; ctx.fill();

                  ctx.fillStyle = '#22c55e'; ctx.fillText('AV Node', cx + W * 0.02, cy - H * 0.06);

                  // Bundle of His

                  var hisPhase = Math.max(0, Math.sin((condPhase - 0.3) * Math.PI * 2));

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.02); ctx.lineTo(cx, cy + H * 0.06);

                  ctx.strokeStyle = 'rgba(59,130,246,' + (0.3 + hisPhase * 0.5) + ')'; ctx.lineWidth = 2; ctx.stroke();

                  ctx.fillStyle = '#3b82f6'; ctx.fillText('Bundle of His', cx + W * 0.02, cy + H * 0.02);

                  // Left and right bundle branches

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.06);

                  ctx.lineTo(cx - W * 0.08, cy + H * 0.18);

                  ctx.strokeStyle = 'rgba(59,130,246,' + (0.2 + hisPhase * 0.4) + ')'; ctx.lineWidth = 1.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.06);

                  ctx.lineTo(cx + W * 0.06, cy + H * 0.16);

                  ctx.stroke();

                  // Purkinje fibers (fan out in ventricles)

                  var purkPhase = Math.max(0, Math.sin((condPhase - 0.5) * Math.PI * 2));

                  ctx.strokeStyle = 'rgba(168,85,247,' + (0.2 + purkPhase * 0.4) + ')'; ctx.lineWidth = 0.8;

                  for (var pk = 0; pk < 5; pk++) {

                    ctx.beginPath(); ctx.moveTo(cx - W * 0.08, cy + H * 0.18);

                    ctx.lineTo(cx - W * 0.12 + pk * W * 0.02, cy + H * 0.22 + pk * H * 0.01);

                    ctx.stroke();

                    ctx.beginPath(); ctx.moveTo(cx + W * 0.06, cy + H * 0.16);

                    ctx.lineTo(cx + W * 0.02 + pk * W * 0.02, cy + H * 0.20 + pk * H * 0.01);

                    ctx.stroke();

                  }

                  ctx.fillStyle = '#a855f7'; ctx.fillText('Purkinje Fibers', cx - W * 0.14, cy + H * 0.24);

                  // Signal propagation indicator

                  var sigY = cy - H * 0.14 + condPhase * H * 0.38;

                  ctx.beginPath(); ctx.arc(cx, sigY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(251,191,36,0.8)'; ctx.fill();

                  ctx.globalAlpha = 1;

                }

                // Internal chambers when on interior/chambers layer

                if (activeLayer === 'chambers' || activeLayer === 'interior') {

                  ctx.globalAlpha = 0.4;

                  // Left atrium

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.10, cy - H * 0.10, W * 0.08, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.font = '8px Inter'; ctx.fillStyle = '#ffffff'; ctx.fillText('LA', cx - W * 0.11, cy - H * 0.09);

                  // Right atrium

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.10, cy - H * 0.10, W * 0.08, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#3b82f6'; ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.fillText('RA', cx + W * 0.09, cy - H * 0.09);

                  // Left ventricle (thicker wall)

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.08, cy + H * 0.08, W * 0.10, H * 0.10, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#b91c1c'; ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.fillText('LV', cx - W * 0.09, cy + H * 0.09);

                  // Right ventricle (thinner wall)

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.08, cy + H * 0.08, W * 0.08, H * 0.08, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#2563eb'; ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.fillText('RV', cx + W * 0.07, cy + H * 0.09);

                  // Valve lines

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;

                  // Mitral valve

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.15, cy - H * 0.02); ctx.lineTo(cx - W * 0.04, cy - H * 0.02); ctx.stroke();

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  // Animated valve movement

                  var valveOpen = Math.sin(dissTick * 0.05);

                  var vOff = Math.max(0, valveOpen) * 3;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy - H * 0.02 - vOff); ctx.lineTo(cx - W * 0.10, cy - H * 0.02 + vOff);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();

                  ctx.fillText('Mitral' + (valveOpen > 0 ? ' ' + 'Open' : ' ' + 'Closed'), cx - W * 0.14, cy - H * 0.035);

                  // Tricuspid valve

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.04, cy - H * 0.02); ctx.lineTo(cx + W * 0.15, cy - H * 0.02); ctx.stroke();

                  ctx.fillText('Tricuspid', cx + W * 0.05, cy - H * 0.035);

                  // Semilunar valves (above ventricles)

                  ctx.beginPath(); ctx.arc(cx - W * 0.08, cy - H * 0.05, 3, 0, Math.PI); ctx.stroke();

                  ctx.fillText('Aortic', cx - W * 0.10, cy - H * 0.07);

                  ctx.beginPath(); ctx.arc(cx + W * 0.06, cy - H * 0.05, 3, 0, Math.PI); ctx.stroke();

                  ctx.fillText('Pulmonary', cx + W * 0.04, cy - H * 0.07);

                  // Papillary muscles (bumps on ventricle walls)

                  ctx.globalAlpha = 0.4;

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.10, cy + H * 0.12, W * 0.008, H * 0.015, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#ef4444'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.08, cy + H * 0.10, W * 0.006, H * 0.012, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#ef4444'; ctx.fill();

                  // Chordae tendinae (strings connecting papillary to valves)

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.4;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy + H * 0.105);

                  ctx.lineTo(cx - W * 0.08, cy - H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy + H * 0.105);

                  ctx.lineTo(cx - W * 0.06, cy - H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy + H * 0.088);

                  ctx.lineTo(cx + W * 0.06, cy - H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy + H * 0.088);

                  ctx.lineTo(cx + W * 0.10, cy - H * 0.02); ctx.stroke();

                  ctx.globalAlpha = 0.35;

                  ctx.font = '5px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('Chordae', cx - W * 0.14, cy + H * 0.08);

                  ctx.fillText('Papillary', cx - W * 0.14, cy + H * 0.14);

                  ctx.globalAlpha = 0.5;

                  ctx.globalAlpha = 1;

                  // Animated blood flow through chambers

                  ctx.setLineDash([3, 5]); ctx.lineDashOffset = -dissTick * 0.4;

                  ctx.globalAlpha = 0.6;

                  // Deoxygenated flow: RA â†’ RV â†’ lungs

                  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.2;

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.10, cy - H * 0.16);

                  ctx.lineTo(cx + W * 0.10, cy - H * 0.03);

                  ctx.lineTo(cx + W * 0.08, cy + H * 0.05); ctx.stroke();

                  // Oxygenated flow: LA â†’ LV â†’ body

                  ctx.strokeStyle = '#ef4444';

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy - H * 0.16);

                  ctx.lineTo(cx - W * 0.10, cy - H * 0.03);

                  ctx.lineTo(cx - W * 0.08, cy + H * 0.05); ctx.stroke();

                  ctx.setLineDash([]); ctx.lineDashOffset = 0;

                  ctx.globalAlpha = 1;

                }

              }



              ctx.restore();



              // ── Animated incision line overlay ──
              var _incisionAnim = d._incisionAnim;
              if (_incisionAnim && _incisionAnim.active) {
                var incElapsed = (Date.now() - _incisionAnim.startTick) / 500;
                if (incElapsed <= 1) {
                  ctx.save();
                  ctx.globalAlpha = 0.9;
                  ctx.strokeStyle = '#f8fafc';
                  ctx.lineWidth = 2;
                  ctx.shadowColor = '#fbbf24';
                  ctx.shadowBlur = 8;
                  var cutY = cy;
                  var cutStartX = cx - W * 0.20;
                  var cutEndX = cx + W * 0.20;
                  var cutProgress = cutStartX + (cutEndX - cutStartX) * incElapsed;
                  ctx.beginPath();
                  ctx.moveTo(cutStartX, cutY);
                  ctx.lineTo(cutProgress, cutY);
                  ctx.stroke();
                  // Scalpel blade indicator at leading edge
                  ctx.beginPath();
                  ctx.moveTo(cutProgress, cutY - 6);
                  ctx.lineTo(cutProgress + 4, cutY);
                  ctx.lineTo(cutProgress, cutY + 6);
                  ctx.closePath();
                  ctx.fillStyle = '#e2e8f0';
                  ctx.fill();
                  // Sparkle particles along cut
                  for (var sp = 0; sp < 5; sp++) {
                    var spX = cutStartX + (cutProgress - cutStartX) * (sp / 5) + (Math.random() - 0.5) * 6;
                    var spY = cutY + (Math.random() - 0.5) * 10;
                    ctx.beginPath();
                    ctx.arc(spX, spY, 1 + Math.random(), 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(251,191,36,' + (0.3 + Math.random() * 0.5) + ')';
                    ctx.fill();
                  }
                  ctx.shadowBlur = 0;
                  ctx.restore();
                }
              }

              // ── Draw organ pins ──

              var focusRelatedIds = d.selectedOrgan ? anatomicalRelationships().map(function (relationship) { return relationship.organ.id; }) : [];
              var focusEntryProgress = 1;
              if (d.selectedOrgan) {
                if (canvas._focusOrganId !== d.selectedOrgan) {
                  canvas._focusOrganId = d.selectedOrgan;
                  canvas._focusStartedAt = Date.now();
                }
                if (!dissMotionReduced) {
                  var focusElapsed = Math.max(0, Date.now() - (canvas._focusStartedAt || Date.now()));
                  var focusLinear = Math.min(1, focusElapsed / 520);
                  focusEntryProgress = 1 - Math.pow(1 - focusLinear, 3);
                }
              } else {
                canvas._focusOrganId = null;
                canvas._focusStartedAt = null;
              }

              if (d.relationshipMode && d.selectedOrgan) {
                var relationshipSource = organs.find(function (org) { return org.id === d.selectedOrgan; });
                if (relationshipSource) {
                  var relationshipSourcePoint = variedOrganPoint(relationshipSource);
                  anatomicalRelationships().filter(function (relationship) { return relationship.visible; }).forEach(function (relationship, relationshipIdx) {
                    var relationshipPoint = variedOrganPoint(relationship.organ);
                    var sourceX = relationshipSourcePoint.x * W, sourceY = relationshipSourcePoint.y * H;
                    var targetX = relationshipPoint.x * W, targetY = relationshipPoint.y * H;
                    var relationshipDX = targetX - sourceX, relationshipDY = targetY - sourceY;
                    var relationshipLength = Math.sqrt(relationshipDX * relationshipDX + relationshipDY * relationshipDY) || 1;
                    var relationshipBend = Math.min(42, relationshipLength * 0.2) * (relationshipIdx % 2 ? -1 : 1);
                    var controlX = (sourceX + targetX) / 2 - relationshipDY / relationshipLength * relationshipBend;
                    var controlY = (sourceY + targetY) / 2 + relationshipDX / relationshipLength * relationshipBend;
                    var relationshipType = String(relationship.type || '').toLowerCase();
                    var relationshipColor = relationshipType.indexOf('blood') >= 0 || relationshipType.indexOf('circulation') >= 0 ? '#fb7185'
                      : (relationshipType.indexOf('neural') >= 0 || relationshipType.indexOf('nerve') >= 0 ? '#a78bfa'
                        : (relationshipType.indexOf('digest') >= 0 || relationshipType.indexOf('secretion') >= 0 || relationshipType.indexOf('biliary') >= 0 ? '#fbbf24'
                          : (relationshipType.indexOf('optic') >= 0 || relationshipType.indexOf('light') >= 0 ? '#38bdf8'
                            : (relationshipType.indexOf('excret') >= 0 || relationshipType.indexOf('urinary') >= 0 ? '#c084fc'
                              : (relationshipType.indexOf('joint') >= 0 || relationshipType.indexOf('muscle') >= 0 || relationshipType.indexOf('attachment') >= 0 ? '#cbd5e1' : '#67e8f9')))));
                    ctx.save();
                    if (!relationshipMotion) ctx.setLineDash([4, 4]);
                    ctx.strokeStyle = relationshipColor; ctx.globalAlpha = 0.72; ctx.lineWidth = (d.visualRealism || visualRealism) === 'accessible' ? 3 : 1.7;
                    ctx.beginPath(); ctx.moveTo(sourceX, sourceY); ctx.quadraticCurveTo(controlX, controlY, targetX, targetY); ctx.stroke();
                    ctx.setLineDash([]); ctx.globalAlpha = 1;
                    var arrowAngle = Math.atan2(targetY - controlY, targetX - controlX);
                    ctx.fillStyle = relationshipColor; ctx.beginPath(); ctx.moveTo(targetX, targetY);
                    ctx.lineTo(targetX - Math.cos(arrowAngle - 0.5) * 8, targetY - Math.sin(arrowAngle - 0.5) * 8);
                    ctx.lineTo(targetX - Math.cos(arrowAngle + 0.5) * 8, targetY - Math.sin(arrowAngle + 0.5) * 8); ctx.closePath(); ctx.fill();
                    for (var flowMarkerIdx = 0; flowMarkerIdx < 3; flowMarkerIdx++) {
                      var flowT = relationshipMotion && !dissMotionReduced ? (dissTick * 0.012 + flowMarkerIdx / 3 + relationshipIdx * 0.13) % 1 : (flowMarkerIdx + 1) / 4;
                      var flowInverse = 1 - flowT;
                      var flowX = flowInverse * flowInverse * sourceX + 2 * flowInverse * flowT * controlX + flowT * flowT * targetX;
                      var flowY = flowInverse * flowInverse * sourceY + 2 * flowInverse * flowT * controlY + flowT * flowT * targetY;
                      ctx.shadowColor = relationshipColor; ctx.shadowBlur = 7; ctx.beginPath(); ctx.arc(flowX, flowY, flowMarkerIdx === 1 ? 3.4 : 2.5, 0, Math.PI * 2);
                      ctx.fillStyle = relationshipColor; ctx.fill();
                    }
                    ctx.shadowBlur = 0; ctx.font = 'bold 8px Inter, system-ui'; ctx.fillStyle = '#f8fafc';
                    ctx.fillText(relationship.type, controlX + 5, controlY - 5);
                    ctx.restore();
                  });
                }
              }
              organs.forEach(function (org, oi) {
                var isFocusRelated = focusRelatedIds.indexOf(org.id) >= 0;
                var focusMuted = focusMode && d.selectedOrgan && org.id !== d.selectedOrgan && !isFocusRelated;
                ctx.save(); ctx.globalAlpha = focusMuted ? ((d.visualRealism || visualRealism) === 'accessible' ? 0.46 : 0.24) : 1;

                var organPoint = variedOrganPoint(org);
                var organVisibility = viewOrganVisibility(org);
                var viewLabel = organVisibility === 'occluded' ? org.name + ' \u00B7 occluded' : org.name;
                var px = organPoint.x * W, py = organPoint.y * H;

                var isSel = d.selectedOrgan === org.id;

                var isHov = !isSel && d.hoveredOrgan === org.id;

                var pulse = isSel ? 1 + (dissMotionReduced ? 0 : Math.sin(dissTick * 0.06) * 0.3) : 1;

                // Outer glow

                if (isSel) {

                  ctx.beginPath(); ctx.arc(px, py, 18 * pulse, 0, Math.PI * 2);

                  var glowGrad = ctx.createRadialGradient(px, py, 4, px, py, 18 * pulse);

                  glowGrad.addColorStop(0, 'rgba(251,191,36,0.4)');

                  glowGrad.addColorStop(1, 'rgba(251,191,36,0)');

                  ctx.fillStyle = glowGrad; ctx.fill();
                  var focusRadius = 12 + (1 - focusEntryProgress) * 24 + (dissMotionReduced ? 0 : (Math.sin(dissTick * 0.045) + 1) * 2);
                  ctx.save(); ctx.strokeStyle = (d.visualRealism || visualRealism) === 'accessible' ? '#facc15' : 'rgba(254,240,138,0.86)';
                  ctx.lineWidth = (d.visualRealism || visualRealism) === 'accessible' ? 2.8 : 1.5;
                  for (var focusQuadrant = 0; focusQuadrant < 4; focusQuadrant++) {
                    var focusStart = focusQuadrant * Math.PI / 2 + 0.14;
                    ctx.beginPath(); ctx.arc(px, py, focusRadius + 8, focusStart, focusStart + 0.58); ctx.stroke();
                  }
                  ctx.restore();

                }

                // Pin dot with system color

                var sysCol = layerStroke || '#94a3b8';

                ctx.beginPath(); ctx.arc(px, py, 5 * pulse, 0, Math.PI * 2);

                var pinGrad = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, 5 * pulse);

                pinGrad.addColorStop(0, isSel ? '#fef08a' : isHov ? '#bfdbfe' : isFocusRelated ? '#cffafe' : '#ffffff');

                pinGrad.addColorStop(1, isSel ? '#f59e0b' : isHov ? '#3b82f6' : isFocusRelated ? '#0891b2' : sysCol);

                ctx.fillStyle = pinGrad; ctx.fill();

                ctx.strokeStyle = isSel ? '#f59e0b' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();

                // Selection/hover ring

                if (isSel) { ctx.beginPath(); ctx.arc(px, py, 12 * pulse, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(251,191,36,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }

                if (isHov) { ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(59,130,246,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }

                ctx.font = '10px Inter, system-ui, sans-serif';

                var tw = ctx.measureText(viewLabel).width + 10;

                var lx = px + 12, ly = py - 8;

                if (lx + tw > W - 10) lx = px - tw - 12;

                ctx.beginPath(); ctx.moveTo(px + 6, py); ctx.lineTo(lx, ly + 6);

                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 0.8; ctx.stroke(); ctx.setLineDash([]);

                if (d.labelMode !== 'hidden' || isSel) {

                  ctx.fillStyle = isSel ? 'rgba(251,191,36,0.9)' : 'rgba(30,41,59,0.85)';

                  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(lx, ly, tw, 16, 4); ctx.fill(); } else { ctx.fillRect(lx, ly, tw, 16); }

                  ctx.strokeStyle = isSel ? '#f59e0b' : 'rgba(148,163,184,0.4)'; ctx.lineWidth = 0.6; ctx.stroke();

                  ctx.fillStyle = organVisibility === 'occluded' ? '#94a3b8' : (isSel ? '#1e293b' : '#e2e8f0'); ctx.fillText(viewLabel, lx + 5, ly + 11.5);

                } else {

                  // Hidden mode: show numbered markers instead of names

                  var markerNum = String(oi + 1);

                  ctx.fillStyle = 'rgba(30,41,59,0.7)';

                  ctx.beginPath(); ctx.arc(lx + 8, ly + 8, 8, 0, Math.PI * 2); ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Inter, system-ui';

                  ctx.fillText(markerNum, lx + 8 - ctx.measureText(markerNum).width / 2, ly + 11);

                  ctx.font = '10px Inter, system-ui, sans-serif';

                }
                ctx.restore();

              });

              // Layer label

              var activeLayerDef = spec.layers[currentLayerIdx];

              if (activeLayerDef) { ctx.font = 'bold 13px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(activeLayerDef.icon + ' ' + activeLayerDef.name + ' Layer', 14, H - 14); }

              // Annotation drawing overlay

              if (d.annotations && d.annotations.length > 0) {

                ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2; ctx.lineCap = 'round';

                d.annotations.forEach(function (ann) {

                  if (ann.prevX !== undefined) {

                    ctx.beginPath(); ctx.moveTo(ann.prevX, ann.prevY);

                    ctx.lineTo(ann.x, ann.y); ctx.stroke();

                  }

                  ctx.beginPath(); ctx.arc(ann.x, ann.y, 2, 0, Math.PI * 2);

                  ctx.fillStyle = '#ec4899'; ctx.fill();

                });

              }

              // Clear annotations button hint

              if (d.annotateMode && d.annotations && d.annotations.length > 0) {

                ctx.font = '8px Inter, system-ui'; ctx.fillStyle = 'rgba(236,72,153,0.6)';

                ctx.fillText('Double-click to clear', 10, H - 5);

              }

              // Procedural instrument overlays
              var canvasProcedure = d.beforeTechniqueView ? {} : ((d.procedureByLayer || {})[activeLayer] || {});
              if (d.beforeTechniqueView) {
                ctx.save(); ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = 'rgba(15,23,42,0.82)';
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(W - 132, 14, 116, 25, 7); ctx.fill(); } else { ctx.fillRect(W - 132, 14, 116, 25); }
                ctx.fillStyle = '#f8fafc'; ctx.fillText('Before technique', W - 121, 31); ctx.restore();
              }
              function drawProcedurePath(points, color, width, dashed) {
                if (!points || points.length < 2) return;
                ctx.save();
                ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.setLineDash(dashed ? [6, 5] : []);
                ctx.beginPath(); ctx.moveTo(points[0].x * W, points[0].y * H);
                for (var pi = 1; pi < points.length; pi++) ctx.lineTo(points[pi].x * W, points[pi].y * H);
                ctx.stroke(); ctx.restore();
              }
              function drawProcedureOpening(points, extended) {
                if (!points || points.length < 2) return;
                var openingMode = d.visualRealism || visualRealism;
                var openingMetrics = extended ? canvasProcedure.extensionMetrics : canvasProcedure.incisionMetrics;
                var openingControl = openingMetrics ? Number(openingMetrics.control == null ? openingMetrics.smoothness : openingMetrics.control) / 100 : 0.8;
                var halfWidth = extended ? 7.5 : 3.8;
                var leftEdge = [], rightEdge = [];
                for (var oi = 0; oi < points.length; oi++) {
                  var previousPoint = points[Math.max(0, oi - 1)], nextPoint = points[Math.min(points.length - 1, oi + 1)];
                  var tangentX = (nextPoint.x - previousPoint.x) * W, tangentY = (nextPoint.y - previousPoint.y) * H;
                  var tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
                  var normalX = -tangentY / tangentLength, normalY = tangentX / tangentLength;
                  var controlVariation = (1 - Math.max(0, Math.min(1, openingControl))) * Math.sin(oi * 1.73) * 0.22;
                  var endpointTaper = oi === 0 || oi === points.length - 1 ? 0.58 : 1;
                  var localWidth = halfWidth * endpointTaper * (0.96 + controlVariation);
                  leftEdge.push({ x: points[oi].x * W + normalX * localWidth, y: points[oi].y * H + normalY * localWidth });
                  rightEdge.push({ x: points[oi].x * W - normalX * localWidth, y: points[oi].y * H - normalY * localWidth });
                }
                ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
                for (var leftIdx = 1; leftIdx < leftEdge.length; leftIdx++) ctx.lineTo(leftEdge[leftIdx].x, leftEdge[leftIdx].y);
                for (var rightIdx = rightEdge.length - 1; rightIdx >= 0; rightIdx--) ctx.lineTo(rightEdge[rightIdx].x, rightEdge[rightIdx].y);
                ctx.closePath();
                var openingGradient = ctx.createLinearGradient(leftEdge[0].x, leftEdge[0].y, rightEdge[Math.floor(rightEdge.length / 2)].x, rightEdge[Math.floor(rightEdge.length / 2)].y);
                openingGradient.addColorStop(0, openingMode === 'accessible' ? '#f8fafc' : '#7f4f55');
                openingGradient.addColorStop(0.22, openingMode === 'accessible' ? '#020617' : '#32181d');
                openingGradient.addColorStop(0.78, openingMode === 'accessible' ? '#020617' : '#160d11');
                openingGradient.addColorStop(1, openingMode === 'accessible' ? '#f8fafc' : '#a56970');
                ctx.shadowColor = 'rgba(2,6,23,0.78)'; ctx.shadowBlur = extended ? 12 : 6;
                ctx.fillStyle = openingGradient; ctx.fill(); ctx.shadowBlur = 0;
                [leftEdge, rightEdge].forEach(function (edge, edgeIdx) {
                  ctx.beginPath(); ctx.moveTo(edge[0].x, edge[0].y);
                  for (var edgePointIdx = 1; edgePointIdx < edge.length; edgePointIdx++) ctx.lineTo(edge[edgePointIdx].x, edge[edgePointIdx].y);
                  ctx.strokeStyle = openingMode === 'accessible' ? (edgeIdx ? '#f8fafc' : '#facc15') : (edgeIdx ? 'rgba(254,202,202,0.72)' : 'rgba(190,110,118,0.82)');
                  ctx.lineWidth = openingMode === 'accessible' ? 2.3 : 1.25; ctx.stroke();
                });
                ctx.beginPath(); ctx.moveTo(points[0].x * W, points[0].y * H);
                for (var centerIdx = 1; centerIdx < points.length; centerIdx++) ctx.lineTo(points[centerIdx].x * W, points[centerIdx].y * H);
                ctx.strokeStyle = openingMode === 'accessible' ? '#020617' : 'rgba(15,8,12,0.76)';
                ctx.lineWidth = extended ? 2.2 : 1.1; ctx.stroke();
                ctx.restore();
              }
              function drawTissueFlaps(guide, pins, forcepsPoint) {
                if (!guide || guide.length < 2) return;
                var flapMode = d.visualRealism || visualRealism;
                var start = guide[0], middle = guide[Math.floor((guide.length - 1) / 2)], end = guide[guide.length - 1];
                var directionX = end.x - start.x, directionY = end.y - start.y;
                var directionLength = Math.sqrt(directionX * directionX + directionY * directionY) || 1;
                var normalX = -directionY / directionLength, normalY = directionX / directionLength;
                var midpoint = { x: (start.x + end.x + middle.x) / 3, y: (start.y + end.y + middle.y) / 3 };
                var pinPull = (pins || []).reduce(function (sum, pin) {
                  var dx = pin.x - midpoint.x, dy = pin.y - midpoint.y;
                  return sum + Math.min(0.055, Math.sqrt(dx * dx + dy * dy) * 0.18);
                }, 0) / Math.max(1, (pins || []).length);
                var forcepsPull = forcepsPoint ? Math.min(0.022, procedurePointDistance(forcepsPoint, midpoint) * 0.1 + 0.008) : 0;
                var settle = dissMotionReduced ? 0 : Math.sin(dissTick * 0.022) * 0.002;
                var spread = (flapMode === 'realistic' ? 0.074 : 0.058) + pinPull + forcepsPull + settle;
                var inset = 0.009;
                var layerColor = ((spec.layers[currentLayerIdx] || {}).color) || '#d89b8f';
                function offsetFlapPoint(point, amount) { return { x: point.x + normalX * amount, y: point.y + normalY * amount }; }
                var flaps = [
                  [offsetFlapPoint(start, inset), offsetFlapPoint(middle, inset), offsetFlapPoint(end, inset), offsetFlapPoint(end, spread), offsetFlapPoint(middle, spread * 1.08), offsetFlapPoint(start, spread)],
                  [offsetFlapPoint(start, -inset), offsetFlapPoint(start, -spread), offsetFlapPoint(middle, -spread * 1.08), offsetFlapPoint(end, -spread), offsetFlapPoint(end, -inset), offsetFlapPoint(middle, -inset)]
                ];
                flaps.forEach(function (flap, flapIdx) {
                  ctx.save(); ctx.beginPath(); ctx.moveTo(flap[0].x * W, flap[0].y * H);
                  for (var fi = 1; fi < flap.length; fi++) ctx.lineTo(flap[fi].x * W, flap[fi].y * H);
                  ctx.closePath(); ctx.shadowColor = 'rgba(2,6,23,0.68)'; ctx.shadowBlur = 14;
                  ctx.shadowOffsetX = normalX * (flapIdx ? -7 : 7); ctx.shadowOffsetY = normalY * (flapIdx ? -7 : 7);
                  var flapGrad = ctx.createLinearGradient(flap[0].x * W, flap[0].y * H, flap[4].x * W, flap[4].y * H);
                  flapGrad.addColorStop(0, layerColor); flapGrad.addColorStop(0.7, flapMode === 'realistic' ? '#8f5960' : '#a87579'); flapGrad.addColorStop(1, '#5f3b43');
                  ctx.fillStyle = flapGrad; ctx.fill(); ctx.shadowBlur = 0;
                  ctx.strokeStyle = flapMode === 'accessible' ? '#f8fafc' : 'rgba(254,202,202,0.68)'; ctx.lineWidth = flapMode === 'accessible' ? 2.5 : 1.2; ctx.stroke();
                  if (flapMode === 'realistic') {
                    ctx.globalAlpha = 0.24; ctx.strokeStyle = '#fee2e2'; ctx.lineWidth = 0.8;
                    for (var fiberIdx = 0; fiberIdx < 3; fiberIdx++) {
                      var fiberT = (fiberIdx + 1) / 4;
                      var fiberStart = { x: start.x + (end.x - start.x) * fiberT, y: start.y + (end.y - start.y) * fiberT };
                      var fiberOuter = offsetFlapPoint(fiberStart, (flapIdx ? -1 : 1) * spread * (0.72 + fiberIdx * 0.05));
                      ctx.beginPath(); ctx.moveTo(fiberStart.x * W, fiberStart.y * H); ctx.lineTo(fiberOuter.x * W, fiberOuter.y * H); ctx.stroke();
                    }
                  }
                  ctx.restore();
                });
                (pins || []).forEach(function (pin) {
                  var pinSide = ((pin.x - midpoint.x) * normalX + (pin.y - midpoint.y) * normalY) >= 0 ? 1 : -1;
                  var flapAnchor = offsetFlapPoint(middle, spread * pinSide);
                  ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = flapMode === 'accessible' ? '#facc15' : 'rgba(226,232,240,0.58)'; ctx.lineWidth = 1.2;
                  ctx.beginPath(); ctx.moveTo(flapAnchor.x * W, flapAnchor.y * H); ctx.lineTo(pin.x * W, pin.y * H); ctx.stroke(); ctx.restore();
                });
              }              if ((d.procedureMode || 'guided') === 'guided' && (d.visualRealism || 'guided') !== 'realistic' && !d.beforeTechniqueView && !canvasProcedure.incisionStarted && !revealedLayers[activeLayer]) {
                drawProcedurePath(procedureGuidePoints(), 'rgba(45,212,191,0.9)', 3, true);
                var guideMid = procedureGuidePoints()[1];
                ctx.font = 'bold 9px Inter, system-ui'; ctx.fillStyle = '#99f6e4';
                ctx.fillText('Teaching access path', guideMid.x * W + 8, guideMid.y * H - 8);
              }
              var overlayGuide = procedureGuidePoints();
              var liveDemo = d._procedureDemo;
              if (liveDemo && liveDemo.layer === activeLayer && Date.now() - liveDemo.startedAt < 3000) {
                var demoProgress = Math.max(0, Math.min(1, (Date.now() - liveDemo.startedAt) / 2600));
                var demoPath = [overlayGuide[0]], demoPoint;
                if (demoProgress <= 0.5) {
                  var firstProgress = demoProgress * 2;
                  demoPoint = { x: overlayGuide[0].x + (overlayGuide[1].x - overlayGuide[0].x) * firstProgress, y: overlayGuide[0].y + (overlayGuide[1].y - overlayGuide[0].y) * firstProgress };
                  demoPath.push(demoPoint);
                } else {
                  var secondProgress = (demoProgress - 0.5) * 2;
                  demoPath.push(overlayGuide[1]);
                  demoPoint = { x: overlayGuide[1].x + (overlayGuide[2].x - overlayGuide[1].x) * secondProgress, y: overlayGuide[1].y + (overlayGuide[2].y - overlayGuide[1].y) * secondProgress };
                  demoPath.push(demoPoint);
                }
                drawProcedurePath(demoPath, '#67e8f9', 5, false);
                ctx.beginPath(); ctx.arc(demoPoint.x * W, demoPoint.y * H, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#fef08a'; ctx.fill(); ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 2; ctx.stroke();
              }
              var liveReplay = d._procedureReplay;
              if (liveReplay && liveReplay.layer === activeLayer && Date.now() - liveReplay.startedAt < liveReplay.duration) {
                var replayProgress = Math.max(0, Math.min(0.999, (Date.now() - liveReplay.startedAt) / liveReplay.duration));
                var replayActions = liveReplay.actions || [];
                var replayIndex = Math.min(replayActions.length - 1, Math.floor(replayProgress * replayActions.length));
                var replayEntry = replayActions[Math.max(0, replayIndex)] || { action: 'inspect', label: 'Inspect' };
                var replayLocal = replayProgress * Math.max(1, replayActions.length) - Math.max(0, replayIndex);
                var replayPath = replayEntry.action === 'scissors' && canvasProcedure.extensionPath
                  ? canvasProcedure.extensionPath
                  : (canvasProcedure.incisionPath || overlayGuide);
                var replayPoint = replayPath[0] || overlayGuide[1];
                if (replayPath.length > 1) {
                  var replayFloat = replayLocal * (replayPath.length - 1);
                  var replaySegment = Math.min(replayPath.length - 2, Math.floor(replayFloat));
                  var replaySegmentProgress = replayFloat - replaySegment;
                  replayPoint = {
                    x: replayPath[replaySegment].x + (replayPath[replaySegment + 1].x - replayPath[replaySegment].x) * replaySegmentProgress,
                    y: replayPath[replaySegment].y + (replayPath[replaySegment + 1].y - replayPath[replaySegment].y) * replaySegmentProgress
                  };
                }
                if (replayEntry.action === 'forceps' && canvasProcedure.forcepsPoint) replayPoint = canvasProcedure.forcepsPoint;
                if (replayEntry.action === 'pin' && (canvasProcedure.pins || []).length) replayPoint = canvasProcedure.pins[Math.min((canvasProcedure.pins || []).length - 1, replayIndex)];
                drawProcedurePath(replayPath, 'rgba(34,211,238,0.78)', 4, false);
                ctx.save();
                ctx.shadowColor = 'rgba(8,145,178,0.7)'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(replayPoint.x * W, replayPoint.y * H, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#fef08a'; ctx.fill(); ctx.strokeStyle = '#0e7490'; ctx.lineWidth = 2; ctx.stroke();
                ctx.shadowBlur = 0; ctx.font = 'bold 9px Inter, system-ui'; ctx.fillStyle = '#ecfeff';
                ctx.fillText('Replay: ' + (replayEntry.label || procedureActionLabel(replayEntry.action)), Math.min(W - 115, replayPoint.x * W + 10), Math.max(14, replayPoint.y * H - 10));
                ctx.restore();
              }
              var liveInstrument = d.activeInstrument || 'probe';
              if ((d.visualRealism || 'guided') !== 'realistic' && liveInstrument === 'forceps' && canvasProcedure.incisionExtended && !canvasProcedure.retracted) {
                ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(overlayGuide[1].x * W, overlayGuide[1].y * H, 18, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
              }
              if ((d.visualRealism || 'guided') !== 'realistic' && liveInstrument === 'pin' && canvasProcedure.retracted && (canvasProcedure.pins || []).length < 2) {
                [overlayGuide[0], overlayGuide[overlayGuide.length - 1]].forEach(function (target) {
                  ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#f9a8d4'; ctx.lineWidth = 2;
                  ctx.beginPath(); ctx.arc(target.x * W, target.y * H, 13, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
                });
              }
              var savedLayerAttempts = (((d.attemptArchive || {})[activeLayer]) || []);
              var previousTechniqueIndex = savedLayerAttempts.length - 1;
              if (previousTechniqueIndex >= 0 && currentProcedure.lastSavedAttemptId === savedLayerAttempts[previousTechniqueIndex].id) previousTechniqueIndex -= 1;
              var previousTechniqueAttempt = previousTechniqueIndex >= 0 ? savedLayerAttempts[previousTechniqueIndex] : null;
              if (d.compareTechniqueAttempts && previousTechniqueAttempt) {
                if ((previousTechniqueAttempt.incisionPath || []).length > 1) drawProcedurePath(previousTechniqueAttempt.incisionPath, 'rgba(244,114,182,0.78)', 3, true);
                if ((previousTechniqueAttempt.extensionPath || []).length > 1) drawProcedurePath(previousTechniqueAttempt.extensionPath, 'rgba(244,114,182,0.66)', 5, true);
                ctx.save();
                ctx.font = 'bold 9px Inter, system-ui'; ctx.fillStyle = '#f9a8d4';
                ctx.fillText('Previous attempt', 12, H - 14);
                ctx.restore();
              }
              if (canvasProcedure.incisionStarted) drawProcedureOpening(canvasProcedure.incisionPath, false);
              if (canvasProcedure.incisionExtended) drawProcedureOpening(canvasProcedure.extensionPath, true);
              var activeOpeningPath = canvasProcedure.extensionPath || canvasProcedure.incisionPath || overlayGuide;
              if (canvasProcedure.retracted) drawTissueFlaps(activeOpeningPath, canvasProcedure.pins || [], canvasProcedure.forcepsPoint);
              if (canvasProcedure.surfaceCleared && canvasProcedure.dropperPoint) {
                var dropX = canvasProcedure.dropperPoint.x * W, dropY = canvasProcedure.dropperPoint.y * H;
                var dropRadius = dissMotionReduced ? 22 : 22 + Math.sin(dissTick * 0.08) * 3;
                var dropGrad = ctx.createRadialGradient(dropX - 5, dropY - 6, 2, dropX, dropY, dropRadius);
                dropGrad.addColorStop(0, 'rgba(224,242,254,0.62)'); dropGrad.addColorStop(1, 'rgba(56,189,248,0.06)');
                ctx.beginPath(); ctx.arc(dropX, dropY, dropRadius, 0, Math.PI * 2); ctx.fillStyle = dropGrad; ctx.fill();
                ctx.strokeStyle = 'rgba(125,211,252,0.72)'; ctx.lineWidth = 1.5; ctx.stroke();
              }
              (canvasProcedure.pins || []).forEach(function (pin, pinIdx) {
                var pinX = pin.x * W, pinY = pin.y * H;
                var openingCenter = activeOpeningPath[Math.floor((activeOpeningPath.length - 1) / 2)] || overlayGuide[1];
                var tensionX = (pin.x - openingCenter.x) * 28, tensionY = (pin.y - openingCenter.y) * 28;
                ctx.save(); ctx.strokeStyle = 'rgba(226,232,240,0.82)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(pinX - tensionX, pinY - tensionY); ctx.lineTo(pinX + tensionX, pinY + tensionY); ctx.stroke();
                ctx.shadowColor = 'rgba(2,6,23,0.65)'; ctx.shadowBlur = 5;
                var pinGrad = ctx.createRadialGradient(pinX - 3, pinY - 3, 1, pinX, pinY, 7);
                pinGrad.addColorStop(0, '#ffffff'); pinGrad.addColorStop(0.3, pinIdx ? '#7dd3fc' : '#f9a8d4'); pinGrad.addColorStop(1, pinIdx ? '#0369a1' : '#be185d');
                ctx.beginPath(); ctx.arc(pinX, pinY, (d.visualRealism || visualRealism) === 'accessible' ? 8 : 6, 0, Math.PI * 2); ctx.fillStyle = pinGrad; ctx.fill();
                ctx.restore();
              });
              if (canvas._toolStroke && canvas._toolStroke.length > 1) drawProcedurePath(canvas._toolStroke, '#fef08a', 3, true);
              if (canvas._toolResistance && canvas._toolPointer) {
                var resistance = canvas._toolResistance, resistancePoint = canvas._toolPointer;
                var resistanceColor = resistance.level === 'high' ? '#fb7185' : (resistance.level === 'moderate' ? '#fbbf24' : '#34d399');
                ctx.save();
                ctx.beginPath(); ctx.arc(resistancePoint.x * W, resistancePoint.y * H, 13 + resistance.value * 8, 0, Math.PI * 2);
                ctx.strokeStyle = resistanceColor; ctx.lineWidth = 2.5; ctx.stroke();
                ctx.fillStyle = 'rgba(15,23,42,0.86)';
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(resistancePoint.x * W + 18, resistancePoint.y * H - 14, 84, 21, 6); ctx.fill(); }
                else ctx.fillRect(resistancePoint.x * W + 18, resistancePoint.y * H - 14, 84, 21);
                ctx.font = 'bold 9px Inter, system-ui'; ctx.fillStyle = resistanceColor;
                ctx.fillText('Resistance: ' + resistance.level, resistancePoint.x * W + 23, resistancePoint.y * H);
                ctx.restore();
              }

              // Ruler tool overlay

              if (d.rulerMode && d.rulerStart && d.rulerEnd) {

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([]);

                ctx.beginPath(); ctx.moveTo(d.rulerStart.x, d.rulerStart.y);

                ctx.lineTo(d.rulerEnd.x, d.rulerEnd.y); ctx.stroke();

                // Endpoints

                ctx.beginPath(); ctx.arc(d.rulerStart.x, d.rulerStart.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#fbbf24'; ctx.fill();

                ctx.beginPath(); ctx.arc(d.rulerEnd.x, d.rulerEnd.y, 3, 0, Math.PI * 2); ctx.fill();

                // Distance

                var rdx = d.rulerEnd.x - d.rulerStart.x;

                var rdy = d.rulerEnd.y - d.rulerStart.y;

                var rDist = Math.sqrt(rdx * rdx + rdy * rdy);

                var rCm = (rDist / W * (spec.bodyShape === 'worm' ? 15 : spec.bodyShape === 'pig' ? 25 : spec.bodyShape === 'fish' ? 20 : spec.bodyShape === 'crayfish' ? 12 : spec.bodyShape === 'frog' ? 8 : 3)).toFixed(1);

                ctx.font = 'bold 10px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                ctx.fillText(rCm + ' cm', (d.rulerStart.x + d.rulerEnd.x) / 2 + 5, (d.rulerStart.y + d.rulerEnd.y) / 2 - 5);

              }

              // Scale bar

              ctx.fillStyle = 'rgba(255,255,255,0.25)';

              ctx.fillRect(W - 80, H - 18, 60, 2);

              ctx.font = '8px Inter, system-ui'; ctx.fillText('Scale Bar', W - 72, H - 7);

              // Endocrine system overlay

              if (d.showEndocrine) {

                ctx.globalAlpha = 0.6; ctx.font = '6px Inter, system-ui';

                var glands = [];

                if (spec.bodyShape === 'frog') {

                  glands = [

                    { name: 'pituitary', x: cx, y: cy - H * 0.24, hormone: 'GH, TSH, FSH', color: '#ec4899' },

                    { name: 'thyroid', x: cx - W * 0.03, y: cy - H * 0.18, hormone: 'T3, T4 (metabolism)', color: '#f472b6' },

                    { name: 'parathyroid', x: cx + W * 0.03, y: cy - H * 0.17, hormone: 'PTH (calcium)', color: '#fb7185' },

                    { name: 'adrenals', x: cx + W * 0.06, y: cy + H * 0.07, hormone: 'cortisol, adrenaline', color: '#fbbf24' },

                    { name: 'pancreas (islets)', x: cx + W * 0.04, y: cy - H * 0.02, hormone: 'insulin, glucagon', color: '#34d399' },

                    { name: 'gonads', x: cx, y: cy + H * 0.12, hormone: 'estrogen/testosterone', color: '#a78bfa' }

                  ];

                } else if (spec.bodyShape === 'pig') {

                  glands = [

                    { name: 'pituitary', x: cx - W * 0.26, y: cy - H * 0.06, hormone: 'master gland', color: '#ec4899' },

                    { name: 'thyroid', x: cx - W * 0.16, y: cy - H * 0.06, hormone: 'T3, T4', color: '#f472b6' },

                    { name: 'thymus', x: cx - W * 0.08, y: cy - H * 0.08, hormone: 'thymosin (immunity)', color: '#fbbf24' },

                    { name: 'adrenals', x: cx + W * 0.09, y: cy + H * 0.065, hormone: 'cortisol', color: '#fbbf24' },

                    { name: 'pancreas', x: cx + W * 0.02, y: cy + H * 0.04, hormone: 'insulin', color: '#34d399' }

                  ];

                }

                glands.forEach(function (gl) {

                  // Gland marker (pulsing circle)

                  var glPulse = 1 + Math.sin(dissTick * 0.04) * 0.2;

                  ctx.beginPath(); ctx.arc(gl.x, gl.y, 5 * glPulse, 0, Math.PI * 2);

                  var glGrad = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, 5 * glPulse);

                  glGrad.addColorStop(0, gl.color); glGrad.addColorStop(1, gl.color.slice(0, -1) + ',0)');

                  ctx.fillStyle = glGrad; ctx.fill();

                  // Hormone arrows radiating out

                  ctx.strokeStyle = gl.color; ctx.lineWidth = 0.5;

                  for (var ha = 0; ha < 4; ha++) {

                    var hAngle = ha * Math.PI / 2 + dissTick * 0.02;

                    var hLen = 8 + Math.sin(dissTick * 0.05 + ha) * 3;

                    ctx.beginPath(); ctx.moveTo(gl.x + Math.cos(hAngle) * 6, gl.y + Math.sin(hAngle) * 6);

                    ctx.lineTo(gl.x + Math.cos(hAngle) * hLen, gl.y + Math.sin(hAngle) * hLen);

                    ctx.stroke();

                  }

                  // Labels

                  ctx.fillStyle = gl.color;

                  ctx.fillText(gl.name, gl.x + 8, gl.y - 3);

                  ctx.fillStyle = 'rgba(255,255,255,0.35)';

                  ctx.fillText(gl.hormone, gl.x + 8, gl.y + 5);

                });

                ctx.globalAlpha = 1;

              }

              // Nervous system tracing overlay

              if (d.traceNervous) {

                ctx.setLineDash([3, 5]);

                ctx.lineDashOffset = -dissTick * 0.5;

                ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#a855f7';

                  // Brain â†’ spinal cord

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.25); // brain

                  ctx.lineTo(cx, cy + H * 0.10); // spinal cord

                  ctx.stroke();

                  // Cranial nerves radiating from brain

                  for (var cn = 0; cn < 5; cn++) {

                    var cnAngle = -1.2 + cn * 0.5;

                    ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.24);

                    ctx.lineTo(cx + Math.cos(cnAngle) * W * 0.08, cy - H * 0.24 + Math.sin(cnAngle) * H * 0.06);

                    ctx.stroke();

                  }

                  // Sciatic nerves to legs

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.08);

                    ctx.quadraticCurveTo(cx + s * W * 0.06, cy + H * 0.18, cx + s * W * 0.10, cy + H * 0.35);

                    ctx.stroke();

                  });

                  // Brachial plexus to arms

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12);

                    ctx.quadraticCurveTo(cx + s * W * 0.08, cy - H * 0.08, cx + s * W * 0.14, cy + H * 0.05);

                    ctx.stroke();

                  });

                  // Signal pulse animation

                  var sigT = (dissTick * 0.01) % 1;

                  var sigY = cy - H * 0.25 + sigT * H * 0.35;

                  ctx.beginPath(); ctx.arc(cx, sigY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#e879f9'; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                  ctx.fillText('Brain', cx + W * 0.03, cy - H * 0.26);

                  ctx.fillText('Spinal Cord', cx + W * 0.02, cy);

                  ctx.fillText('Sciatic', cx + W * 0.08, cy + H * 0.25);

                  ctx.fillText('Brachial', cx + W * 0.06, cy - H * 0.10);

                } else if (spec.bodyShape === 'worm') {

                  ctx.strokeStyle = '#a855f7';

                  // Ventral nerve cord

                  ctx.beginPath(); ctx.moveTo(cx, H * 0.07); ctx.lineTo(cx, H * 0.93); ctx.stroke();

                  // Segmental ganglia

                  for (var sg = 0; sg < 20; sg++) {

                    var sgY = H * 0.10 + sg * H * 0.04;

                    ctx.beginPath(); ctx.arc(cx, sgY, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#c084fc'; ctx.fill();

                    // Lateral nerves

                    ctx.beginPath(); ctx.moveTo(cx, sgY);

                    ctx.lineTo(cx - W * 0.04, sgY); ctx.stroke();

                    ctx.beginPath(); ctx.moveTo(cx, sgY);

                    ctx.lineTo(cx + W * 0.04, sgY); ctx.stroke();

                  }

                  var wSigT = (dissTick * 0.008) % 1;

                  ctx.beginPath(); ctx.arc(cx, H * 0.07 + wSigT * H * 0.86, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#e879f9'; ctx.fill();

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                  ctx.fillText('Ventral Nerve Cord', cx + W * 0.05, H * 0.50);

                  ctx.fillText('Segmental Ganglia', cx + W * 0.05, H * 0.52);

                } else if (spec.bodyShape === 'crayfish') {

                  ctx.strokeStyle = '#a855f7';

                  // Brain â†’ ventral cord

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy); // brain

                  ctx.lineTo(cx + W * 0.25, cy); // ventral cord

                  ctx.stroke();

                  // Ganglia

                  for (var cg = 0; cg < 6; cg++) {

                    ctx.beginPath(); ctx.arc(cx - W * 0.15 + cg * W * 0.08, cy, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#c084fc'; ctx.fill();

                  }

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                  ctx.fillText('Brain', cx - W * 0.22, cy - H * 0.03);

                  ctx.fillText('Ventral Cord', cx + W * 0.05, cy - H * 0.03);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Excretory flow tracing overlay

              if (d.traceExcretory && activeLayer === 'organs') {

                ctx.setLineDash([4, 4]);

                ctx.lineDashOffset = -dissTick * 0.4;

                ctx.lineWidth = 2; ctx.globalAlpha = 0.65;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#84cc16';

                  // Kidneys â†’ ureters â†’ bladder â†’ cloaca

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.06, cy + H * 0.08); // kidney

                    ctx.quadraticCurveTo(cx + s * W * 0.03, cy + H * 0.12, cx, cy + H * 0.15); // ureter â†’ bladder

                    ctx.stroke();

                  });

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.15); // bladder

                  ctx.lineTo(cx, cy + H * 0.22); // cloaca

                  ctx.stroke();

                  // Filtrate animation

                  var filtT = (dissTick * 0.006) % 1;

                  ctx.beginPath(); ctx.arc(cx + Math.cos(filtT * 6) * W * 0.03, cy + H * 0.08 + filtT * H * 0.14, 2, 0, Math.PI * 2);

                  ctx.fillStyle = '#a3e635'; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#84cc16';

                  ctx.fillText('Kidneys', cx + W * 0.08, cy + H * 0.09);

                  ctx.fillText('Ureters', cx + W * 0.04, cy + H * 0.13);

                  ctx.fillText('Bladder', cx + W * 0.03, cy + H * 0.16);

                  ctx.fillText('Cloaca', cx + W * 0.02, cy + H * 0.23);

                } else if (spec.bodyShape === 'worm') {

                  ctx.strokeStyle = '#84cc16';

                  // Nephridia along body

                  for (var neph = 0; neph < 8; neph++) {

                    var nephY = H * 0.22 + neph * H * 0.08;

                    ctx.beginPath();

                    ctx.moveTo(cx - W * 0.04, nephY);

                    ctx.quadraticCurveTo(cx - W * 0.05, nephY + H * 0.02, cx - W * 0.045, nephY + H * 0.04);

                    ctx.stroke();

                    // Nephridiopore

                    ctx.beginPath(); ctx.arc(cx - W * 0.045, nephY + H * 0.04, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = '#84cc16'; ctx.fill();

                  }

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#84cc16';

                  ctx.fillText('Nephridia', cx - W * 0.09, H * 0.35);

                  ctx.fillText('Nephridiopores', cx - W * 0.10, H * 0.37);

                } else if (spec.bodyShape === 'pig') {

                  ctx.strokeStyle = '#84cc16';

                  ctx.beginPath();

                  ctx.moveTo(cx + W * 0.08, cy + H * 0.08); // kidney

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.12, cx + W * 0.04, cy + H * 0.14); // ureter

                  ctx.lineTo(cx, cy + H * 0.16); // bladder

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#84cc16';

                  ctx.fillText('Kidney', cx + W * 0.09, cy + H * 0.07);

                  ctx.fillText('Ureter', cx + W * 0.07, cy + H * 0.13);

                  ctx.fillText('Bladder', cx + W * 0.01, cy + H * 0.18);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Circulatory flow tracing overlay

              if (d.traceCirculation && activeLayer === 'organs') {

                ctx.setLineDash([5, 4]);

                ctx.lineWidth = 2; ctx.globalAlpha = 0.6;

                if (spec.bodyShape === 'frog') {

                  // Heart â†’ Arteries (red, oxygenated)

                  ctx.lineDashOffset = -dissTick * 0.6;

                  ctx.strokeStyle = '#ef4444';

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12); // heart

                  ctx.quadraticCurveTo(cx - W * 0.08, cy - H * 0.18, cx - W * 0.04, cy - H * 0.24); // carotid â†’ head

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12);

                  ctx.quadraticCurveTo(cx + W * 0.05, cy - H * 0.05, cx + W * 0.03, cy + H * 0.06); // systemic â†’ body

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.03, cy + H * 0.06);

                  ctx.lineTo(cx + W * 0.12, cy + H * 0.30); // to legs

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.03, cy + H * 0.06);

                  ctx.lineTo(cx - W * 0.12, cy + H * 0.30);

                  ctx.stroke();

                  // Veins (blue, deoxygenated) â†’ back to heart

                  ctx.lineDashOffset = dissTick * 0.6;

                  ctx.strokeStyle = '#3b82f6';

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy + H * 0.32);

                  ctx.quadraticCurveTo(cx - W * 0.06, cy + H * 0.15, cx - W * 0.02, cy - H * 0.10);

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.12, cy + H * 0.32);

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.15, cx + W * 0.02, cy - H * 0.10);

                  ctx.stroke();

                  // Pulmonary loop

                  ctx.strokeStyle = '#a855f7';

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12);

                  ctx.quadraticCurveTo(cx - W * 0.10, cy - H * 0.10, cx - W * 0.08, cy - H * 0.06);

                  ctx.stroke();

                  // Labels

                  ctx.font = '7px Inter, system-ui';

                  ctx.fillStyle = '#ef4444'; ctx.fillText('Arteries (O₂)', cx - W * 0.12, cy - H * 0.20);

                  ctx.fillStyle = '#3b82f6'; ctx.fillText('Veins (CO₂)', cx + W * 0.06, cy + H * 0.20);

                  ctx.fillStyle = '#a855f7'; ctx.fillText('Pulmonary', cx - W * 0.14, cy - H * 0.08);

                  // Blood cell animation

                  var bcT = (dissTick * 0.008) % 1;

                  ctx.beginPath(); ctx.arc(cx + bcT * W * 0.15, cy - H * 0.12 + (bcT * H * 0.42), 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#ef4444'; ctx.fill();

                } else if (spec.bodyShape === 'heart') {

                  // Through chambers

                  ctx.lineDashOffset = -dissTick * 0.5;

                  ctx.strokeStyle = '#3b82f6'; // deoxygenated

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.15, cy - H * 0.25); // SVC

                  ctx.lineTo(cx + W * 0.10, cy - H * 0.10); // RA

                  ctx.lineTo(cx + W * 0.08, cy + H * 0.05); // RV

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy + H * 0.05);

                  ctx.quadraticCurveTo(cx + W * 0.15, cy - H * 0.15, cx + W * 0.20, cy - H * 0.25); // pulmonary artery

                  ctx.stroke();

                  ctx.strokeStyle = '#ef4444'; // oxygenated

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.15, cy - H * 0.20); // pulmonary vein

                  ctx.lineTo(cx - W * 0.10, cy - H * 0.10); // LA

                  ctx.lineTo(cx - W * 0.08, cy + H * 0.05); // LV

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.08, cy + H * 0.05);

                  ctx.quadraticCurveTo(cx - W * 0.15, cy, cx, cy - H * 0.28); // aorta

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui';

                  ctx.fillStyle = '#3b82f6'; ctx.fillText('SVC', cx + W * 0.16, cy - H * 0.26);

                  ctx.fillText('Pulm. Artery', cx + W * 0.16, cy - H * 0.16);

                  ctx.fillStyle = '#ef4444'; ctx.fillText('Pulm. Vein', cx - W * 0.20, cy - H * 0.22);

                  ctx.fillText('Aorta', cx - W * 0.04, cy - H * 0.30);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Respiratory flow tracing overlay

              if (d.traceRespiration && activeLayer === 'organs') {

                ctx.setLineDash([4, 5]);

                ctx.lineDashOffset = -dissTick * 0.7;

                ctx.lineWidth = 2; ctx.globalAlpha = 0.7;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#38bdf8';

                  // Air path: nares â†’ glottis â†’ lungs

                  ctx.beginPath();

                  ctx.moveTo(cx, cy - H * 0.28); // nostrils

                  ctx.lineTo(cx, cy - H * 0.20); // pharynx

                  ctx.lineTo(cx, cy - H * 0.15); // glottis

                  ctx.stroke();

                  // Left lung

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.15);

                  ctx.quadraticCurveTo(cx - W * 0.06, cy - H * 0.12, cx - W * 0.08, cy - H * 0.06);

                  ctx.stroke();

                  // Right lung

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.15);

                  ctx.quadraticCurveTo(cx + W * 0.06, cy - H * 0.12, cx + W * 0.08, cy - H * 0.06);

                  ctx.stroke();

                  // Air particles animation

                  for (var ap = 0; ap < 5; ap++) {

                    var apT = ((dissTick * 0.01 + ap * 0.2) % 1);

                    var apY = cy - H * 0.28 + apT * H * 0.22;

                    ctx.beginPath(); ctx.arc(cx + Math.sin(apT * 8) * W * 0.01, apY, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#38bdf8'; ctx.fill();

                  }

                  // O2/CO2 labels

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#38bdf8';

                  ctx.fillText('O₂ In', cx + W * 0.02, cy - H * 0.26);

                  ctx.fillStyle = '#ef4444';

                  ctx.fillText('CO₂ Out', cx + W * 0.02, cy - H * 0.24);

                  // Cutaneous respiration note

                  ctx.fillStyle = 'rgba(56,189,248,0.4)'; ctx.font = '6px Inter, system-ui';

                  ctx.fillText('Cutaneous', cx + W * 0.10, cy + H * 0.05);

                } else if (spec.bodyShape === 'pig') {

                  ctx.strokeStyle = '#38bdf8';

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.32, cy - H * 0.01); // nostrils

                  ctx.lineTo(cx - W * 0.20, cy - H * 0.02); // trachea

                  ctx.stroke();

                  // Bronchi split

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy - H * 0.02);

                  ctx.quadraticCurveTo(cx - W * 0.12, cy - H * 0.06, cx - W * 0.06, cy - H * 0.08);

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy - H * 0.02);

                  ctx.quadraticCurveTo(cx - W * 0.12, cy + H * 0.02, cx - W * 0.06, cy + H * 0.02);

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#38bdf8';

                  ctx.fillText('Trachea', cx - W * 0.22, cy - H * 0.05);

                  ctx.fillText('L. Bronchus', cx - W * 0.10, cy - H * 0.10);

                  ctx.fillText('R. Bronchus', cx - W * 0.10, cy + H * 0.05);

                } else if (spec.bodyShape === 'fish') {

                  ctx.strokeStyle = '#38bdf8';

                  // Water flow through gills

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.35, cy); // mouth intake

                  ctx.lineTo(cx - W * 0.22, cy); // through pharynx

                  ctx.stroke();

                  // Through gills and out operculum

                  for (var gf = 0; gf < 3; gf++) {

                    ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy - H * 0.02 + gf * H * 0.02);

                    ctx.lineTo(cx - W * 0.28, cy - H * 0.03 + gf * H * 0.02);

                    ctx.stroke();

                  }

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#38bdf8';

                  ctx.fillText('Water In', cx - W * 0.38, cy - H * 0.02);

                  ctx.fillText('O₂ Exchange', cx - W * 0.26, cy - H * 0.06);

                  ctx.fillText('Water Out', cx - W * 0.30, cy + H * 0.06);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Digestive tract tracing overlay

              if (d.traceDigestion && activeLayer === 'organs') {

                ctx.setLineDash([6, 4]);

                ctx.lineDashOffset = -dissTick * 0.6;

                ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx, cy - H * 0.26); // mouth

                  ctx.lineTo(cx, cy - H * 0.18); // esophagus

                  ctx.quadraticCurveTo(cx + W * 0.02, cy - H * 0.12, cx + W * 0.04, cy - H * 0.05); // stomach

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.02, cx + W * 0.03, cy + H * 0.05); // duodenum

                  ctx.quadraticCurveTo(cx - W * 0.02, cy + H * 0.10, cx, cy + H * 0.14); // intestines

                  ctx.quadraticCurveTo(cx + W * 0.03, cy + H * 0.18, cx, cy + H * 0.22); // large intestine

                  ctx.stroke();

                  // Food bolus moving along path

                  var foodT = (dissTick * 0.005) % 1;

                  var foodY = cy - H * 0.26 + foodT * H * 0.48;

                  ctx.beginPath(); ctx.arc(cx + Math.sin(foodT * 10) * W * 0.02, foodY, 4, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1; ctx.stroke();

                  // Labels

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx + W * 0.02, cy - H * 0.27);

                  ctx.fillText('Esophagus', cx + W * 0.04, cy - H * 0.17);

                  ctx.fillText('Stomach', cx + W * 0.07, cy - H * 0.06);

                  ctx.fillText('Sm. Intestine', cx + W * 0.06, cy + H * 0.08);

                  ctx.fillText('Lg. Intestine', cx + W * 0.04, cy + H * 0.18);

                  ctx.fillText('Cloaca', cx + W * 0.02, cy + H * 0.23);

                } else if (spec.bodyShape === 'worm') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx, H * 0.06); // mouth

                  ctx.lineTo(cx, H * 0.10); // pharynx

                  ctx.lineTo(cx, H * 0.28); // crop

                  ctx.lineTo(cx, H * 0.33); // gizzard

                  ctx.lineTo(cx, H * 0.88); // intestine

                  ctx.lineTo(cx, H * 0.94); // anus

                  ctx.stroke();

                  var wFoodT = (dissTick * 0.003) % 1;

                  var wFoodY = H * 0.06 + wFoodT * H * 0.88;

                  ctx.beginPath(); ctx.arc(cx, wFoodY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx + W * 0.05, H * 0.065);

                  ctx.fillText('Pharynx', cx + W * 0.05, H * 0.11);

                  ctx.fillText('Crop', cx + W * 0.05, H * 0.29);

                  ctx.fillText('Gizzard', cx + W * 0.05, H * 0.34);

                  ctx.fillText('Intestine', cx + W * 0.05, H * 0.60);

                  ctx.fillText('Anus', cx + W * 0.05, H * 0.945);

                } else if (spec.bodyShape === 'pig') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.30, cy); // mouth

                  ctx.lineTo(cx - W * 0.20, cy); // esophagus

                  ctx.quadraticCurveTo(cx - W * 0.05, cy - H * 0.02, cx, cy + H * 0.02); // stomach

                  ctx.quadraticCurveTo(cx + W * 0.08, cy + H * 0.06, cx + W * 0.10, cy + H * 0.10); // intestines

                  ctx.quadraticCurveTo(cx + W * 0.12, cy + H * 0.14, cx + W * 0.16, cy + H * 0.12); // rectum

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx - W * 0.33, cy - H * 0.02);

                  ctx.fillText('Esophagus', cx - W * 0.18, cy - H * 0.03);

                  ctx.fillText('Stomach', cx + W * 0.02, cy - H * 0.01);

                  ctx.fillText('Intestines', cx + W * 0.09, cy + H * 0.13);

                } else if (spec.bodyShape === 'fish') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.32, cy); // mouth

                  ctx.lineTo(cx - W * 0.18, cy); // pharynx

                  ctx.quadraticCurveTo(cx - W * 0.08, cy + H * 0.02, cx, cy + H * 0.03); // stomach

                  ctx.lineTo(cx + W * 0.10, cy + H * 0.02); // pyloric caeca

                  ctx.lineTo(cx + W * 0.20, cy + H * 0.04); // intestine

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx - W * 0.35, cy - H * 0.02);

                  ctx.fillText('Stomach', cx - W * 0.04, cy + H * 0.06);

                  ctx.fillText('Intestine', cx + W * 0.12, cy + H * 0.07);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Cross-section indicators

              if (activeLayer === 'organs' && (spec.bodyShape === 'frog' || spec.bodyShape === 'pig' || spec.bodyShape === 'fish')) {

                ctx.globalAlpha = 0.15; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.5; ctx.setLineDash([4, 6]);

                // Transverse section lines

                var sectionYs = spec.bodyShape === 'frog' ? [cy - H * 0.12, cy, cy + H * 0.10] :

                  spec.bodyShape === 'pig' ? [cy - H * 0.06, cy + H * 0.04] :

                    [cy - H * 0.04, cy + H * 0.04];

                sectionYs.forEach(function (sy, si) {

                  ctx.beginPath(); ctx.moveTo(10, sy); ctx.lineTo(W - 10, sy); ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = 'rgba(148,163,184,0.3)';

                  ctx.fillText('Section' + ' ' + String.fromCharCode(65 + si), 12, sy - 3);

                });

                ctx.setLineDash([]); ctx.globalAlpha = 1;

              }

              // Dissection tray corner labels

              ctx.font = '7px Inter, system-ui';

              ctx.fillStyle = 'rgba(100,116,139,0.3)';

              ctx.fillText('Anterior', W / 2 - 20, 14);

              ctx.fillText('Posterior', W / 2 - 20, H - 4);

              ctx.save(); ctx.translate(8, H / 2 + 10); ctx.rotate(-Math.PI / 2);

              ctx.fillText('Left', 0, 0); ctx.restore();

              ctx.save(); ctx.translate(W - 4, H / 2 - 10); ctx.rotate(Math.PI / 2);

              ctx.fillText('Right', 0, 0); ctx.restore();

              // Specimen label

              ctx.font = '11px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';

              ctx.fillText(spec.icon + ' ' + spec.name + (d.viewAngle === 'dorsal' ? '  ' + '(Dorsal View)' : '  ' + '(Ventral View)'), 14, 20);

              // System color legend (top-right)

              var legendSys = ['circulatory', 'digestive', 'respiratory', 'nervous', 'skeletal', 'muscular', 'excretory', 'reproductive'];

              var sysColors = { circulatory: '#ef4444', digestive: '#f59e0b', respiratory: '#3b82f6', nervous: '#8b5cf6', skeletal: '#e2e8f0', muscular: '#f87171', excretory: '#a78bfa', reproductive: '#ec4899' };

              var legendLabels = ['Circulatory', 'Digestive', 'Respiratory', 'Nervous', 'Skeletal', 'Muscular', 'Excretory', 'Reproductive'];

              ctx.font = '7px Inter, system-ui';

              for (var li = 0; li < legendSys.length; li++) {

                var lx = W - 58, ly = 50 + li * 12;

                ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2);

                ctx.fillStyle = sysColors[legendSys[li]] || '#94a3b8'; ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.4)';

                ctx.fillText(legendLabels[li], lx + 6, ly + 3);

              }

              // Progress bar at top

              if (totalOrgansInSpecimen > 0) {

                var barW = W - 28;

                ctx.fillStyle = 'rgba(30,41,59,0.6)';

                ctx.fillRect(14, 28, barW, 4);

                ctx.fillStyle = progressPct >= 100 ? '#22c55e' : '#3b82f6';

                ctx.fillRect(14, 28, barW * (progressPct / 100), 4);

                ctx.font = '9px Inter, system-ui, sans-serif';

                ctx.fillStyle = 'rgba(255,255,255,0.35)';

                ctx.fillText('Explored'.replace('{count}', exploredCount).replace('{total}', totalOrgansInSpecimen).replace('{pct}', progressPct), 14, 42);

              }

              // Hover tooltip

              var hovOrg = d.hoveredOrgan ? organs.find(function (o) { return o.id === d.hoveredOrgan; }) : null;

              if (hovOrg && d.selectedOrgan !== hovOrg.id) {

                var hoverPoint = variedOrganPoint(hovOrg);
                var hpx = hoverPoint.x * W, hpy = hoverPoint.y * H;

                var hText = hovOrg.name + ': ' + hovOrg.fn.split('.')[0] + '.';

                ctx.font = '10px Inter, system-ui, sans-serif';

                var hLines = [];

                var words = hText.split(' ');

                var line = '';

                for (var wi = 0; wi < words.length; wi++) {

                  var testLine = line + words[wi] + ' ';

                  if (ctx.measureText(testLine).width > 180 && line) { hLines.push(line.trim()); line = words[wi] + ' '; }

                  else { line = testLine; }

                }

                if (line.trim()) hLines.push(line.trim());

                if (hLines.length > 3) hLines = hLines.slice(0, 3);

                var hBoxH = hLines.length * 14 + 10;

                var hBoxW = 196;

                var hbx = Math.min(hpx + 20, W - hBoxW - 10);

                var hby = Math.max(hpy - hBoxH - 10, 50);

                ctx.fillStyle = 'rgba(15,23,42,0.92)';

                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(hbx, hby, hBoxW, hBoxH, 6); ctx.fill(); } else { ctx.fillRect(hbx, hby, hBoxW, hBoxH); }

                ctx.strokeStyle = 'rgba(59,130,246,0.4)'; ctx.lineWidth = 1; ctx.stroke();

                ctx.fillStyle = '#e2e8f0';

                for (var hi = 0; hi < hLines.length; hi++) {

                  ctx.fillText(hLines[hi], hbx + 8, hby + 16 + hi * 14);

                }

              }

              // Guided walkthrough prompt

              if (guidedMode && currentGuided) {

                ctx.fillStyle = 'rgba(147,51,234,0.85)';

                var gpW = W - 28;

                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(14, H - 50, gpW, 32, 6); ctx.fill(); } else { ctx.fillRect(14, H - 50, gpW, 32); }

                ctx.font = 'bold 11px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#ffffff';

                ctx.fillText(currentGuided.prompt, 22, H - 30);

                // Highlight guided organ with arrow

                var gOrg = organs.find(function (o) { return o.id === currentGuided.organId; });

                if (gOrg) {

                  var guidedPoint = variedOrganPoint(gOrg);
                  var gx = guidedPoint.x * W, gy = guidedPoint.y * H;

                  ctx.beginPath(); ctx.arc(gx, gy, 16 + Math.sin(dissTick * 0.08) * 3, 0, Math.PI * 2);

                  ctx.strokeStyle = 'rgba(147,51,234,0.7)'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

                }

              }



              ctx.restore(); // End deterministic specimen-proportion transform

              // Advanced view, condition, and cross-section overlays stay screen-aligned.
              ctx.save();
              var liveAnatomicalView = d.anatomicalView || 'dorsal';
              var liveCondition = d.specimenCondition || 'standard';
              var conditionTint = { preserved: '148,163,184', dehydrated: '180,126,84', cloudy: '226,232,240', swollen: '251,146,160' }[liveCondition];
              if (conditionTint) {
                ctx.globalCompositeOperation = liveCondition === 'cloudy' ? 'screen' : 'soft-light';
                ctx.fillStyle = 'rgba(' + conditionTint + ',' + (liveCondition === 'cloudy' ? '0.16' : '0.18') + ')';
                ctx.beginPath(); ctx.ellipse(cx, cy, W * (liveCondition === 'swollen' ? 0.39 : 0.35), H * (liveCondition === 'swollen' ? 0.36 : 0.32), 0, 0, Math.PI * 2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                if (liveCondition === 'dehydrated') {
                  ctx.strokeStyle = 'rgba(120,53,15,0.34)'; ctx.lineWidth = 1;
                  for (var crackIdx = 0; crackIdx < 7; crackIdx++) {
                    var crackX = W * (0.31 + crackIdx * 0.065);
                    ctx.beginPath(); ctx.moveTo(crackX, H * 0.35); ctx.lineTo(crackX - 5, H * 0.46); ctx.lineTo(crackX + 3, H * 0.58); ctx.stroke();
                  }
                }
              }
              ctx.fillStyle = 'rgba(15,23,42,0.82)';
              if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(14, 50, 118, 24, 7); ctx.fill(); } else ctx.fillRect(14, 50, 118, 24);
              ctx.font = 'bold 9px Inter, system-ui'; ctx.fillStyle = '#e0f2fe'; ctx.fillText('View: ' + liveAnatomicalView, 23, 66);
              if (d.crossSectionMode) {
                var sectionX = W - 122, sectionY = 52, sectionW = 106, sectionH = 18;
                ctx.fillStyle = 'rgba(15,23,42,0.9)';
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(sectionX - 6, sectionY - 19, sectionW + 12, spec.layers.length * sectionH + 28, 8); ctx.fill(); }
                else ctx.fillRect(sectionX - 6, sectionY - 19, sectionW + 12, spec.layers.length * sectionH + 28);
                ctx.font = 'bold 9px Inter, system-ui'; ctx.fillStyle = '#f8fafc'; ctx.fillText('Layer cross-section', sectionX, sectionY - 5);
                spec.layers.forEach(function (layer, layerIdx) {
                  var isCurrentSection = layer.id === activeLayer;
                  ctx.fillStyle = layer.color || (isCurrentSection ? '#f59e0b' : '#64748b');
                  ctx.globalAlpha = isCurrentSection ? 1 : 0.62;
                  ctx.fillRect(sectionX, sectionY + layerIdx * sectionH, sectionW, sectionH - 2);
                  ctx.globalAlpha = 1; ctx.font = (isCurrentSection ? 'bold ' : '') + '8px Inter, system-ui'; ctx.fillStyle = isCurrentSection ? '#0f172a' : '#f8fafc';
                  ctx.fillText((layerIdx + 1) + '. ' + layer.name, sectionX + 5, sectionY + 12 + layerIdx * sectionH);
                });
              }
              ctx.restore();

              // Specimen-specific material, moisture, and adjustable lab-light pass.
              var liveVisualMode = d.visualRealism || 'guided';
              var liveLight = d.labLight || 'neutral';
              var liveMaterialProfile = SPECIMEN_MATERIAL_PROFILES[spec.bodyShape] || SPECIMEN_MATERIAL_PROFILES.frog;
              var materialCX = liveMaterialProfile.cx * W + parallaxX, materialCY = liveMaterialProfile.cy * H + parallaxY;
              var materialRX = liveMaterialProfile.rx * W, materialRY = liveMaterialProfile.ry * H;
              if (liveVisualMode !== 'accessible' && sceneDetail) {
                ctx.save();
                ctx.beginPath(); ctx.ellipse(materialCX, materialCY, materialRX, materialRY, 0, 0, Math.PI * 2); ctx.clip();
                ctx.globalCompositeOperation = 'soft-light';
                var materialDensity = liveVisualMode === 'realistic' ? liveMaterialProfile.density : Math.round(liveMaterialProfile.density * 0.58);
                if (liveMaterialProfile.pattern === 'chromatophores') {
                  for (var chromatophoreIdx = 0; chromatophoreIdx < materialDensity; chromatophoreIdx++) {
                    var chromAngle = specimenVariationValue('chrom-angle-' + chromatophoreIdx) * Math.PI * 2;
                    var chromRadius = Math.sqrt(specimenVariationValue('chrom-radius-' + chromatophoreIdx));
                    var chromX = materialCX + Math.cos(chromAngle) * materialRX * chromRadius;
                    var chromY = materialCY + Math.sin(chromAngle) * materialRY * chromRadius;
                    var chromSize = 1.2 + specimenVariationValue('chrom-size-' + chromatophoreIdx) * 4;
                    ctx.beginPath(); ctx.arc(chromX, chromY, chromSize, 0, Math.PI * 2);
                    ctx.fillStyle = chromatophoreIdx % 3 === 0 ? 'rgba(37,99,70,0.34)' : (chromatophoreIdx % 3 === 1 ? 'rgba(120,53,15,0.26)' : 'rgba(253,230,138,0.18)'); ctx.fill();
                  }
                } else if (liveMaterialProfile.pattern === 'segments') {
                  ctx.strokeStyle = 'rgba(226,232,240,0.28)'; ctx.lineWidth = 1;
                  for (var segmentIdx = 0; segmentIdx < materialDensity; segmentIdx++) {
                    var segmentT = (segmentIdx + 1) / (materialDensity + 1);
                    var segmentY = materialCY - materialRY + segmentT * materialRY * 2;
                    var segmentHalf = materialRX * Math.sqrt(Math.max(0, 1 - Math.pow((segmentY - materialCY) / materialRY, 2)));
                    ctx.beginPath(); ctx.moveTo(materialCX - segmentHalf, segmentY); ctx.quadraticCurveTo(materialCX, segmentY + Math.sin(segmentIdx) * 2, materialCX + segmentHalf, segmentY); ctx.stroke();
                  }
                  var cuticleGlow = ctx.createLinearGradient(materialCX - materialRX, materialCY, materialCX + materialRX, materialCY);
                  cuticleGlow.addColorStop(0, 'rgba(59,130,246,0.05)'); cuticleGlow.addColorStop(0.5, 'rgba(255,255,255,0.22)'); cuticleGlow.addColorStop(1, 'rgba(236,72,153,0.08)');
                  ctx.fillStyle = cuticleGlow; ctx.fillRect(materialCX - materialRX, materialCY - materialRY, materialRX * 2, materialRY * 2);
                } else if (liveMaterialProfile.pattern === 'follicles') {
                  for (var follicleIdx = 0; follicleIdx < materialDensity; follicleIdx++) {
                    var follicleAngle = specimenVariationValue('follicle-angle-' + follicleIdx) * Math.PI * 2;
                    var follicleRadius = Math.sqrt(specimenVariationValue('follicle-radius-' + follicleIdx));
                    var follicleX = materialCX + Math.cos(follicleAngle) * materialRX * follicleRadius;
                    var follicleY = materialCY + Math.sin(follicleAngle) * materialRY * follicleRadius;
                    ctx.fillStyle = 'rgba(71,85,105,0.24)'; ctx.beginPath(); ctx.arc(follicleX, follicleY, 1.1, 0, Math.PI * 2); ctx.fill();
                    if (liveVisualMode === 'realistic' && follicleIdx % 3 === 0) {
                      ctx.strokeStyle = 'rgba(241,245,249,0.18)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(follicleX, follicleY); ctx.lineTo(follicleX + 3, follicleY - 5); ctx.stroke();
                    }
                  }
                } else if (liveMaterialProfile.pattern === 'scales') {
                  ctx.strokeStyle = 'rgba(224,242,254,0.3)'; ctx.lineWidth = liveVisualMode === 'realistic' ? 1.1 : 0.8;
                  var scaleRows = liveVisualMode === 'realistic' ? 9 : 6, scaleCols = liveVisualMode === 'realistic' ? 15 : 10;
                  for (var scaleRow = 0; scaleRow < scaleRows; scaleRow++) {
                    for (var scaleCol = 0; scaleCol < scaleCols; scaleCol++) {
                      var scaleX = materialCX - materialRX + (scaleCol + 0.5 + (scaleRow % 2) * 0.5) * (materialRX * 2 / scaleCols);
                      var scaleY = materialCY - materialRY + (scaleRow + 0.7) * (materialRY * 2 / scaleRows);
                      ctx.beginPath(); ctx.ellipse(scaleX, scaleY, materialRX / scaleCols * 0.82, materialRY / scaleRows * 0.62, 0, 0.12, Math.PI - 0.12); ctx.stroke();
                    }
                  }
                  var scaleSheen = ctx.createLinearGradient(materialCX - materialRX, materialCY - materialRY, materialCX + materialRX, materialCY + materialRY);
                  scaleSheen.addColorStop(0.15, 'rgba(14,165,233,0.04)'); scaleSheen.addColorStop(0.5, 'rgba(255,255,255,0.24)'); scaleSheen.addColorStop(0.76, 'rgba(168,85,247,0.08)');
                  ctx.fillStyle = scaleSheen; ctx.fillRect(materialCX - materialRX, materialCY - materialRY, materialRX * 2, materialRY * 2);
                } else if (liveMaterialProfile.pattern === 'facets') {
                  ctx.strokeStyle = 'rgba(226,232,240,0.22)'; ctx.lineWidth = 0.9;
                  for (var facetIdx = 0; facetIdx < materialDensity; facetIdx++) {
                    var facetAngle = specimenVariationValue('facet-angle-' + facetIdx) * Math.PI * 2;
                    var facetRadius = Math.sqrt(specimenVariationValue('facet-radius-' + facetIdx));
                    var facetX = materialCX + Math.cos(facetAngle) * materialRX * facetRadius;
                    var facetY = materialCY + Math.sin(facetAngle) * materialRY * facetRadius;
                    var facetSize = 3 + specimenVariationValue('facet-size-' + facetIdx) * 5;
                    ctx.beginPath();
                    for (var facetSide = 0; facetSide < 6; facetSide++) {
                      var facetSideAngle = facetSide / 6 * Math.PI * 2;
                      var facetPX = facetX + Math.cos(facetSideAngle) * facetSize, facetPY = facetY + Math.sin(facetSideAngle) * facetSize * 0.7;
                      if (!facetSide) ctx.moveTo(facetPX, facetPY); else ctx.lineTo(facetPX, facetPY);
                    }
                    ctx.closePath(); ctx.stroke();
                  }
                } else if (liveMaterialProfile.pattern === 'radial') {
                  ctx.strokeStyle = 'rgba(224,242,254,0.24)'; ctx.lineWidth = 1;
                  for (var radialRing = 1; radialRing <= 6; radialRing++) {
                    ctx.beginPath(); ctx.ellipse(materialCX, materialCY, materialRX * radialRing / 6, materialRY * radialRing / 6, 0, 0, Math.PI * 2); ctx.stroke();
                  }
                  for (var radialRay = 0; radialRay < 18; radialRay++) {
                    var radialAngle = radialRay / 18 * Math.PI * 2;
                    ctx.beginPath(); ctx.moveTo(materialCX + Math.cos(radialAngle) * materialRX * 0.2, materialCY + Math.sin(radialAngle) * materialRY * 0.2);
                    ctx.lineTo(materialCX + Math.cos(radialAngle) * materialRX, materialCY + Math.sin(radialAngle) * materialRY); ctx.stroke();
                  }
                  var cornealGlow = ctx.createRadialGradient(materialCX - materialRX * 0.28, materialCY - materialRY * 0.32, 2, materialCX, materialCY, materialRX);
                  cornealGlow.addColorStop(0, 'rgba(255,255,255,0.34)'); cornealGlow.addColorStop(0.35, 'rgba(186,230,253,0.10)'); cornealGlow.addColorStop(1, 'rgba(15,23,42,0.08)');
                  ctx.fillStyle = cornealGlow; ctx.fillRect(materialCX - materialRX, materialCY - materialRY, materialRX * 2, materialRY * 2);
                } else if (liveMaterialProfile.pattern === 'fibers') {
                  ctx.strokeStyle = 'rgba(254,202,202,0.26)'; ctx.lineWidth = 1.1;
                  for (var fiberLineIdx = 0; fiberLineIdx < materialDensity; fiberLineIdx++) {
                    var fiberT = (fiberLineIdx + 1) / (materialDensity + 1);
                    var fiberStartX = materialCX - materialRX + fiberT * materialRX * 1.35;
                    var fiberStartY = materialCY + materialRY;
                    ctx.beginPath(); ctx.moveTo(fiberStartX, fiberStartY);
                    ctx.bezierCurveTo(fiberStartX - 20, materialCY + materialRY * 0.32, fiberStartX + 32, materialCY - materialRY * 0.28, fiberStartX + materialRX * 0.6, materialCY - materialRY); ctx.stroke();
                  }
                }
                ctx.globalCompositeOperation = 'source-over';
                var materialSheenAlpha = (d.specimenCondition || specimenCondition) === 'dehydrated' ? 0.035 : (liveVisualMode === 'realistic' ? 0.16 : 0.09);
                ctx.strokeStyle = 'rgba(255,255,255,' + materialSheenAlpha + ')'; ctx.lineWidth = 2;
                for (var sheenIdx = 0; sheenIdx < 4; sheenIdx++) {
                  var sheenY = materialCY - materialRY * 0.45 + sheenIdx * materialRY * 0.28;
                  ctx.beginPath(); ctx.moveTo(materialCX - materialRX * 0.58, sheenY); ctx.quadraticCurveTo(materialCX, sheenY - 10, materialCX + materialRX * 0.52, sheenY + 2); ctx.stroke();
                }
                if ((liveMaterialProfile.pattern === 'chromatophores' || liveMaterialProfile.pattern === 'scales' || liveMaterialProfile.pattern === 'radial') && (d.specimenCondition || specimenCondition) !== 'dehydrated') {
                  for (var dropletIdx = 0; dropletIdx < (liveVisualMode === 'realistic' ? 9 : 5); dropletIdx++) {
                    var dropletAngle = specimenVariationValue('droplet-angle-' + dropletIdx) * Math.PI * 2;
                    var dropletRadius = Math.sqrt(specimenVariationValue('droplet-radius-' + dropletIdx));
                    var dropletX = materialCX + Math.cos(dropletAngle) * materialRX * dropletRadius * 0.84;
                    var dropletY = materialCY + Math.sin(dropletAngle) * materialRY * dropletRadius * 0.84;
                    var dropletSize = 1.8 + specimenVariationValue('droplet-size-' + dropletIdx) * 3.2;
                    var dropletGrad = ctx.createRadialGradient(dropletX - 1, dropletY - 1, 0.5, dropletX, dropletY, dropletSize);
                    dropletGrad.addColorStop(0, 'rgba(255,255,255,0.6)'); dropletGrad.addColorStop(0.45, 'rgba(186,230,253,0.13)'); dropletGrad.addColorStop(1, 'rgba(15,23,42,0.08)');
                    ctx.fillStyle = dropletGrad; ctx.beginPath(); ctx.ellipse(dropletX, dropletY, dropletSize, dropletSize * 0.72, -0.4, 0, Math.PI * 2); ctx.fill();
                  }
                }
                ctx.restore();
              }

              if (focusMode && d.selectedOrgan) {
                var focusedStructure = organs.find(function (org) { return org.id === d.selectedOrgan; });
                if (focusedStructure) {
                  var focusedPoint = variedOrganPoint(focusedStructure);
                  var focusedScale = specimenScaleFactors();
                  var focusedX = ((focusedPoint.x - 0.5) * focusedScale.x + 0.5) * W + parallaxX;
                  var focusedY = ((focusedPoint.y - 0.45) * focusedScale.y + 0.45) * H + parallaxY;
                  ctx.save(); ctx.beginPath(); ctx.ellipse(materialCX, materialCY, materialRX * 1.08, materialRY * 1.08, 0, 0, Math.PI * 2); ctx.clip();
                  var focusVignette = ctx.createRadialGradient(focusedX, focusedY, 16, focusedX, focusedY, Math.max(materialRX, materialRY) * 1.1);
                  focusVignette.addColorStop(0, 'rgba(2,6,23,0)');
                  focusVignette.addColorStop(0.22, 'rgba(2,6,23,0.025)');
                  focusVignette.addColorStop(0.62, 'rgba(2,6,23,' + (liveVisualMode === 'accessible' ? '0.13' : '0.23') + ')');
                  focusVignette.addColorStop(1, 'rgba(2,6,23,' + (liveVisualMode === 'accessible' ? '0.22' : '0.42') + ')');
                  ctx.fillStyle = focusVignette; ctx.fillRect(materialCX - materialRX * 1.1, materialCY - materialRY * 1.1, materialRX * 2.2, materialRY * 2.2);
                  ctx.restore();
                  ctx.save(); ctx.strokeStyle = liveVisualMode === 'accessible' ? '#facc15' : 'rgba(254,240,138,0.48)'; ctx.lineWidth = liveVisualMode === 'accessible' ? 2.4 : 1;
                  ctx.beginPath(); ctx.arc(focusedX, focusedY, 28 + (1 - focusEntryProgress) * 24, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
                }
              }

              ctx.save();
              var lightPointer = canvas._toolPointer;
              var directionAnchor = {
                overhead: { x: 0.50, y: 0.20 },
                left: { x: 0.18, y: 0.43 },
                right: { x: 0.82, y: 0.43 },
                raking: { x: 0.24, y: 0.76 }
              }[lightDirection] || { x: 0.50, y: 0.20 };
              var pointerLightWeight = lightPointer ? 0.22 : 0;
              var lightX = (directionAnchor.x * (1 - pointerLightWeight) + (lightPointer ? lightPointer.x : directionAnchor.x) * pointerLightWeight) * W;
              var lightY = (directionAnchor.y * (1 - pointerLightWeight) + (lightPointer ? lightPointer.y : directionAnchor.y) * pointerLightWeight) * H;
              var lightTint = liveLight === 'warm' ? '255,214,170' : (liveLight === 'cool' ? '186,230,253' : '241,245,249');
              var directionalShade = lightDirection === 'left' ? ctx.createLinearGradient(0, 0, W, 0)
                : (lightDirection === 'right' ? ctx.createLinearGradient(W, 0, 0, 0)
                  : (lightDirection === 'raking' ? ctx.createLinearGradient(0, H, W, 0) : ctx.createLinearGradient(0, 0, 0, H)));
              directionalShade.addColorStop(0, 'rgba(' + lightTint + ',' + (lightDirection === 'raking' ? '0.17' : '0.12') + ')');
              directionalShade.addColorStop(0.46, 'rgba(' + lightTint + ',0.015)');
              directionalShade.addColorStop(1, 'rgba(2,6,23,' + (lightDirection === 'raking' ? '0.25' : '0.17') + ')');
              ctx.fillStyle = directionalShade; ctx.fillRect(0, 0, W, H);
              var labGlow = ctx.createRadialGradient(lightX, lightY, 12, lightX, lightY, liveVisualMode === 'realistic' ? W * 0.48 : W * 0.62);
              labGlow.addColorStop(0, 'rgba(' + lightTint + ',' + (lightDirection === 'raking' ? '0.21' : '0.16') + ')');
              labGlow.addColorStop(0.55, 'rgba(' + lightTint + ',0.045)');
              labGlow.addColorStop(1, 'rgba(2,6,23,0.12)');
              ctx.fillStyle = labGlow; ctx.fillRect(0, 0, W, H); ctx.restore();

              ctx.restore(); // End zoom transform

              var screenPointer = canvas._toolPointer;
              if (screenPointer) {
                var pointerScale = specimenScaleFactors();
                var displayedPointerX = (screenPointer.x - 0.5) * pointerScale.x + 0.5;
                var displayedPointerY = (screenPointer.y - 0.45) * pointerScale.y + 0.45;
                var pointerScreenX = (displayedPointerX * W + parallaxX - W / 2) * zoom + W / 2 + panX;
                var pointerScreenY = (displayedPointerY * H + parallaxY - H / 2) * zoom + H / 2 + panY;
                var activePointerTool = d.activeInstrument || 'probe';
                var pointerInFrame = pointerScreenX > 0 && pointerScreenX < W && pointerScreenY > 0 && pointerScreenY < H;
                var contactPressure = Math.max(0.08, Math.min(1, Number(canvas._toolPressure) || 0.12));
                var contactResistance = canvas._toolResistance ? canvas._toolResistance.value : 0.1;
                if (instrumentVisuals && pointerInFrame && !d.quizMode && !d.annotateMode && !d.rulerMode) {
                  var contactRadius = 10 + contactPressure * 7 + contactResistance * 4;
                  ctx.save(); ctx.translate(pointerScreenX, pointerScreenY); ctx.scale(1, 0.42);
                  var contactShadow = ctx.createRadialGradient(-2, -2, 1, 0, 0, contactRadius);
                  contactShadow.addColorStop(0, 'rgba(2,6,23,' + (0.22 + contactPressure * 0.28).toFixed(2) + ')');
                  contactShadow.addColorStop(0.55, 'rgba(15,23,42,0.16)');
                  contactShadow.addColorStop(1, 'rgba(15,23,42,0)');
                  ctx.fillStyle = contactShadow; ctx.beginPath(); ctx.arc(0, 0, contactRadius, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = canvas._toolDrawing ? 'rgba(250,204,21,0.74)' : 'rgba(226,232,240,0.38)';
                  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 5 + contactPressure * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
                  if (canvas._toolDrawing) {
                    ctx.save(); ctx.fillStyle = 'rgba(15,23,42,0.82)';
                    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(pointerScreenX + 12, pointerScreenY + 15, 70, 18, 5); ctx.fill(); }
                    else ctx.fillRect(pointerScreenX + 12, pointerScreenY + 15, 70, 18);
                    ctx.font = 'bold 8px Inter, system-ui'; ctx.fillStyle = '#fde68a';
                    ctx.fillText('Contact ' + Math.round(contactPressure * 100) + '%', pointerScreenX + 17, pointerScreenY + 27); ctx.restore();
                  }
                }

                var lensBuffer = null, lensCtx = null;
                if ((d.inspectionLens || macroInset) && pointerInFrame) {
                  lensBuffer = canvas._dissLensBuffer;
                  if (!lensBuffer) { lensBuffer = document.createElement('canvas'); canvas._dissLensBuffer = lensBuffer; }
                  if (lensBuffer.width !== canvas.width || lensBuffer.height !== canvas.height) { lensBuffer.width = canvas.width; lensBuffer.height = canvas.height; }
                  lensCtx = lensBuffer.getContext('2d');
                  if (lensCtx) {
                    lensCtx.setTransform(1, 0, 0, 1, 0, 0); lensCtx.clearRect(0, 0, lensBuffer.width, lensBuffer.height); lensCtx.drawImage(canvas, 0, 0);
                  }
                }
                if (d.inspectionLens && pointerInFrame && lensCtx) {
                  var lensRadius = liveVisualMode === 'accessible' ? 72 : 58;
                  var lensMagnification = liveVisualMode === 'realistic' ? 1.9 : 1.65;
                  var sourceRadius = lensRadius / lensMagnification;
                  ctx.save(); ctx.beginPath(); ctx.arc(pointerScreenX, pointerScreenY, lensRadius, 0, Math.PI * 2); ctx.clip();
                  ctx.drawImage(lensBuffer, pointerScreenX - sourceRadius, pointerScreenY - sourceRadius, sourceRadius * 2, sourceRadius * 2, pointerScreenX - lensRadius, pointerScreenY - lensRadius, lensRadius * 2, lensRadius * 2);
                  var lensShade = ctx.createRadialGradient(pointerScreenX - 15, pointerScreenY - 18, 4, pointerScreenX, pointerScreenY, lensRadius);
                  lensShade.addColorStop(0, 'rgba(255,255,255,0.17)'); lensShade.addColorStop(0.72, 'rgba(255,255,255,0)'); lensShade.addColorStop(1, 'rgba(2,6,23,0.24)');
                  ctx.fillStyle = lensShade; ctx.fillRect(pointerScreenX - lensRadius, pointerScreenY - lensRadius, lensRadius * 2, lensRadius * 2); ctx.restore();
                  ctx.save(); ctx.beginPath(); ctx.arc(pointerScreenX, pointerScreenY, lensRadius, 0, Math.PI * 2);
                  ctx.strokeStyle = liveVisualMode === 'accessible' ? '#f8fafc' : '#94a3b8'; ctx.lineWidth = liveVisualMode === 'accessible' ? 5 : 3; ctx.shadowColor = 'rgba(2,6,23,0.75)'; ctx.shadowBlur = 8; ctx.stroke();
                  ctx.font = 'bold 10px Inter, system-ui'; ctx.fillStyle = '#f8fafc'; ctx.fillText(lensMagnification.toFixed(1) + 'x', pointerScreenX + lensRadius - 25, pointerScreenY + lensRadius - 8); ctx.restore();
                }
                if (macroInset && pointerInFrame && lensCtx) {
                  var macroWidth = liveVisualMode === 'accessible' ? 156 : 136;
                  var macroHeight = liveVisualMode === 'accessible' ? 116 : 98;
                  var macroX = W - macroWidth - 12, macroY = 12;
                  var macroPadding = 5, macroLabelHeight = 19;
                  var macroMagnification = liveVisualMode === 'realistic' ? 2.45 : 2.15;
                  var macroSourceWidth = (macroWidth - macroPadding * 2) / macroMagnification;
                  var macroSourceHeight = (macroHeight - macroPadding * 2 - macroLabelHeight) / macroMagnification;
                  ctx.save(); ctx.shadowColor = 'rgba(2,6,23,0.72)'; ctx.shadowBlur = 14; ctx.fillStyle = 'rgba(15,23,42,0.92)';
                  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(macroX, macroY, macroWidth, macroHeight, 9); ctx.fill(); }
                  else ctx.fillRect(macroX, macroY, macroWidth, macroHeight);
                  ctx.shadowBlur = 0; ctx.beginPath();
                  if (ctx.roundRect) ctx.roundRect(macroX + macroPadding, macroY + macroLabelHeight, macroWidth - macroPadding * 2, macroHeight - macroLabelHeight - macroPadding, 5);
                  else ctx.rect(macroX + macroPadding, macroY + macroLabelHeight, macroWidth - macroPadding * 2, macroHeight - macroLabelHeight - macroPadding);
                  ctx.clip();
                  ctx.drawImage(lensBuffer, pointerScreenX - macroSourceWidth / 2, pointerScreenY - macroSourceHeight / 2, macroSourceWidth, macroSourceHeight, macroX + macroPadding, macroY + macroLabelHeight, macroWidth - macroPadding * 2, macroHeight - macroLabelHeight - macroPadding);
                  ctx.restore();
                  ctx.save(); ctx.strokeStyle = liveVisualMode === 'accessible' ? '#facc15' : '#94a3b8'; ctx.lineWidth = liveVisualMode === 'accessible' ? 3 : 1.5;
                  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(macroX, macroY, macroWidth, macroHeight, 9); ctx.stroke(); }
                  else ctx.strokeRect(macroX, macroY, macroWidth, macroHeight);
                  var macroCenterX = macroX + macroWidth / 2, macroCenterY = macroY + macroLabelHeight + (macroHeight - macroLabelHeight) / 2;
                  ctx.beginPath(); ctx.moveTo(macroCenterX - 7, macroCenterY); ctx.lineTo(macroCenterX + 7, macroCenterY); ctx.moveTo(macroCenterX, macroCenterY - 7); ctx.lineTo(macroCenterX, macroCenterY + 7); ctx.stroke();
                  ctx.font = 'bold 9px Inter, system-ui'; ctx.fillStyle = '#f8fafc';
                  ctx.fillText('MACRO ' + macroMagnification.toFixed(1) + 'x · ' + activePointerTool.toUpperCase(), macroX + 8, macroY + 13); ctx.restore();
                }

                if (instrumentVisuals && !d.quizMode && !d.annotateMode && !d.rulerMode) {
                  var cursorTool = activePointerTool;
                  var cursorVector = canvas._toolVector;
                  var desiredCursorAngle = -0.72;
                  if (cursorVector && Math.abs(cursorVector.x) + Math.abs(cursorVector.y) > 0.001) {
                    desiredCursorAngle = Math.atan2(cursorVector.y * pointerScale.y * H, cursorVector.x * pointerScale.x * W);
                  }
                  var previousCursorAngle = Number(canvas._toolAngle);
                  if (!isFinite(previousCursorAngle)) previousCursorAngle = desiredCursorAngle;
                  var cursorAngleDelta = Math.atan2(Math.sin(desiredCursorAngle - previousCursorAngle), Math.cos(desiredCursorAngle - previousCursorAngle));
                  var cursorAngle = dissMotionReduced ? desiredCursorAngle : previousCursorAngle + cursorAngleDelta * 0.28;
                  canvas._toolAngle = cursorAngle;
                  var cursorScale = (liveVisualMode === 'accessible' ? 1.28 : 1) * (1 + contactPressure * 0.035);
                  var toolTipOffset = cursorTool === 'scissors' ? 29 : (cursorTool === 'forceps' ? 21 : (cursorTool === 'probe' ? 20 : (cursorTool === 'pin' ? 17 : 15)));
                  ctx.save(); ctx.translate(pointerScreenX - Math.cos(cursorAngle) * toolTipOffset * cursorScale, pointerScreenY - Math.sin(cursorAngle) * toolTipOffset * cursorScale); ctx.rotate(cursorAngle); ctx.scale(cursorScale, cursorScale);
                  ctx.shadowColor = 'rgba(2,6,23,0.76)'; ctx.shadowBlur = 5 + (1 - contactPressure) * 7; ctx.shadowOffsetX = 2 + (1 - contactPressure) * 5; ctx.shadowOffsetY = 3 + (1 - contactPressure) * 6;
                  var metalGradient = ctx.createLinearGradient(-44, -8, 28, 9);
                  metalGradient.addColorStop(0, '#475569'); metalGradient.addColorStop(0.28, '#f8fafc'); metalGradient.addColorStop(0.52, '#94a3b8'); metalGradient.addColorStop(0.78, '#e2e8f0'); metalGradient.addColorStop(1, '#64748b');
                  if (cursorTool === 'scalpel') {
                    var handleGradient = ctx.createLinearGradient(-48, -7, -7, 7);
                    handleGradient.addColorStop(0, '#0f766e'); handleGradient.addColorStop(0.5, '#5eead4'); handleGradient.addColorStop(1, '#115e59');
                    ctx.fillStyle = handleGradient; ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(-48, -6, 40, 12, 4); else ctx.rect(-48, -6, 40, 12); ctx.fill();
                    ctx.fillStyle = metalGradient; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(16, -2); ctx.lineTo(4, 5); ctx.lineTo(-9, 5); ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9; ctx.stroke();
                    ctx.strokeStyle = 'rgba(15,118,110,0.8)'; ctx.lineWidth = 1;
                    for (var gripIdx = -42; gripIdx < -12; gripIdx += 6) { ctx.beginPath(); ctx.moveTo(gripIdx, -4); ctx.lineTo(gripIdx, 4); ctx.stroke(); }
                  } else if (cursorTool === 'scissors') {
                    var jaw = canvas._toolDrawing && !dissMotionReduced ? 0.18 + Math.abs(Math.sin(dissTick * 0.16)) * 0.18 : 0.1;
                    ctx.strokeStyle = metalGradient; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(29, -7 - jaw * 17); ctx.moveTo(-7, 0); ctx.lineTo(29, 7 + jaw * 17); ctx.stroke();
                    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(-19, -9, 8, 0, Math.PI * 2); ctx.arc(-19, 9, 8, 0, Math.PI * 2); ctx.stroke();
                    ctx.beginPath(); ctx.arc(-7, 0, 3.3, 0, Math.PI * 2); ctx.fillStyle = '#334155'; ctx.fill(); ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1; ctx.stroke();
                  } else if (cursorTool === 'forceps') {
                    var forcepsClose = contactPressure * 3.4;
                    ctx.strokeStyle = metalGradient; ctx.lineWidth = 2.7; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(-39, -6); ctx.quadraticCurveTo(-3, -3, 21, -2 + forcepsClose * 0.25); ctx.moveTo(-39, 6); ctx.quadraticCurveTo(-3, 3, 21, 2 - forcepsClose * 0.25); ctx.stroke();
                    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-39, 0); ctx.lineTo(-25, 0); ctx.stroke();
                    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 0.8;
                    for (var toothIdx = 15; toothIdx <= 20; toothIdx += 2.5) { ctx.beginPath(); ctx.moveTo(toothIdx, -2); ctx.lineTo(toothIdx, 2); ctx.stroke(); }
                  } else if (cursorTool === 'pin') {
                    ctx.strokeStyle = metalGradient; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-29, 0); ctx.lineTo(17, 0); ctx.stroke();
                    var cursorPinGrad = ctx.createRadialGradient(-32, -3, 1, -29, 0, 8); cursorPinGrad.addColorStop(0, '#fff'); cursorPinGrad.addColorStop(0.35, '#f9a8d4'); cursorPinGrad.addColorStop(1, '#be185d');
                    ctx.beginPath(); ctx.arc(-29, 0, 7, 0, Math.PI * 2); ctx.fillStyle = cursorPinGrad; ctx.fill();
                    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(12, -2); ctx.lineTo(12, 2); ctx.closePath(); ctx.fill();
                  } else if (cursorTool === 'dropper') {
                    var dropperGradient = ctx.createLinearGradient(-29, -5, 12, 5);
                    dropperGradient.addColorStop(0, '#475569'); dropperGradient.addColorStop(0.25, '#e0f2fe'); dropperGradient.addColorStop(0.8, '#7dd3fc'); dropperGradient.addColorStop(1, '#0369a1');
                    ctx.fillStyle = dropperGradient; ctx.fillRect(-29, -4, 40, 8);
                    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(-32, 0, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(125,211,252,0.9)'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.quadraticCurveTo(22, 7, 15, 13); ctx.quadraticCurveTo(8, 7, 15, 0); ctx.fill();
                  } else {
                    ctx.strokeStyle = metalGradient; ctx.lineWidth = 2.7; ctx.beginPath(); ctx.moveTo(-43, 0); ctx.lineTo(20, 0); ctx.stroke();
                    var probeHandleGradient = ctx.createLinearGradient(-45, -6, -15, 6);
                    probeHandleGradient.addColorStop(0, '#115e59'); probeHandleGradient.addColorStop(0.5, '#2dd4bf'); probeHandleGradient.addColorStop(1, '#134e4a');
                    ctx.fillStyle = probeHandleGradient; ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(-45, -5, 29, 10, 4); else ctx.rect(-45, -5, 29, 10); ctx.fill();
                    ctx.beginPath(); ctx.arc(20, 0, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#f8fafc'; ctx.fill();
                  }
                  ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(toolTipOffset, 0, 1.8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill();
                  ctx.restore();
                }
              }
              } catch (e) { console.error('[DissectionLab] render error:', e); try { ctx.restore(); ctx.restore(); } catch (_) {} }

              scheduleDissectionFrame();

            }

            drawDissectionFrame();

          };



          // Save current-specimen progress with a short debounce. Each specimen owns
          // its own layer, notes, assessment, and annotation state.
          if (d._dissLoadedSpec === specimen) {
            scheduleDissectionSave('dissection_progress_' + specimen, {
              schemaVersion: 10,
              exploredOrgans: d.exploredOrgans || {},
              revealedLayers: d.revealedLayers || {},
              quizScore: d.quizScore || 0,
              quizTotal: d.quizTotal || 0,
              completedObjectives: d.completedObjectives || {},
              organNotes: d.organNotes || {},
              organConfidence: d.organConfidence || {},
              annotations: d.annotations || [],
              activeLayer: activeLayer,
              timeSpent: d.timeSpent || 0,
              guidedComplete: !!d.guidedComplete,
              procedureByLayer: d.procedureByLayer || {},
              attemptArchive: d.attemptArchive || {},
              adaptiveGuidance: d.adaptiveGuidance !== false,
              procedureMode: procedureMode,
              activeInstrument: activeInstrument,
              incisionDepth: d.incisionDepth || 'shallow',
              visualRealism: visualRealism,
              labLight: labLight,
              inspectionLens: inspectionLens,
              instrumentVisuals: instrumentVisuals,
              macroInset: macroInset,
              sceneDetail: sceneDetail,
              relationshipMotion: relationshipMotion,
              focusMode: focusMode,
              parallaxDepth: parallaxDepth,
              visualEvidence: visualEvidence,
              splitComparison: splitComparison,
              referenceEvidenceId: d.referenceEvidenceId || null,
              lightDirection: lightDirection,
              variationSeed: variationSeed,
              tactileFeedback: d.tactileFeedback !== false,
              anatomicalView: anatomicalView,
              crossSectionMode: crossSectionMode,
              specimenCondition: specimenCondition,
              relationshipMode: relationshipMode,
              renderQuality: renderQuality,
              procedureScenario: procedureScenario,
              instructorTarget: instructorTarget,
              instructorMaxCautions: instructorMaxCautions,
              instructorRequiredStructures: instructorRequiredStructures
            });
          }

          // Load the selected specimen after render; defaults deliberately clear
          // progress from the previously viewed specimen.
          if (!d._dissLoadedSpec || d._dissLoadedSpec !== specimen) {
            var loadSpecimenKey = specimen;
            var loadSpecimenDef = spec;
            setTimeout(function () {
              var data = {};
              try {
                var saved = localStorage.getItem('dissection_progress_' + loadSpecimenKey);
                if (saved) data = JSON.parse(saved) || {};
              } catch (e) { data = {}; }
              var savedLayer = data.activeLayer && loadSpecimenDef.layers.some(function (layer) { return layer.id === data.activeLayer; })
                ? data.activeLayer
                : ((loadSpecimenDef.layers[0] || {}).id || 'skin');
              updMany({
                exploredOrgans: data.exploredOrgans || {},
                revealedLayers: data.revealedLayers || {},
                quizScore: Number(data.quizScore) || 0,
                quizTotal: Number(data.quizTotal) || 0,
                completedObjectives: data.completedObjectives || {},
                organNotes: data.organNotes || {},
                organConfidence: data.organConfidence || {},
                annotations: Array.isArray(data.annotations) ? data.annotations : [],
                activeLayer: savedLayer,
                timeSpent: Number(data.timeSpent) || 0,
                guidedComplete: !!data.guidedComplete,
                procedureByLayer: data.procedureByLayer || {},
                attemptArchive: data.attemptArchive || {},
                adaptiveGuidance: data.adaptiveGuidance !== false,
                compareTechniqueAttempts: false,
                procedureMode: data.procedureMode === 'independent' ? 'independent' : 'guided',
                activeInstrument: data.activeInstrument || 'probe',
                incisionDepth: data.incisionDepth === 'deep' ? 'deep' : 'shallow',
                visualRealism: ['guided', 'realistic', 'accessible'].indexOf(data.visualRealism) >= 0 ? data.visualRealism : 'guided',
                labLight: ['neutral', 'warm', 'cool'].indexOf(data.labLight) >= 0 ? data.labLight : 'neutral',
                inspectionLens: !!data.inspectionLens,
                instrumentVisuals: data.instrumentVisuals !== false,
                macroInset: data.macroInset !== false,
                sceneDetail: data.sceneDetail !== false,
                relationshipMotion: data.relationshipMotion !== false,
                focusMode: data.focusMode !== false,
                parallaxDepth: data.parallaxDepth !== false,
                visualEvidence: Array.isArray(data.visualEvidence) ? data.visualEvidence.filter(function (entry) { return entry && entry.image; }).slice(-6) : [],
                splitComparison: !!data.splitComparison,
                referenceEvidenceId: data.referenceEvidenceId || null,
                lightDirection: ['overhead', 'left', 'right', 'raking'].indexOf(data.lightDirection) >= 0 ? data.lightDirection : 'overhead',
                variationSeed: Number(data.variationSeed) || 1,
                tactileFeedback: data.tactileFeedback !== false,
                anatomicalView: ['dorsal', 'ventral', 'lateral', 'internal'].indexOf(data.anatomicalView) >= 0 ? data.anatomicalView : 'dorsal',
                crossSectionMode: !!data.crossSectionMode,
                specimenCondition: ['standard', 'preserved', 'dehydrated', 'cloudy', 'swollen'].indexOf(data.specimenCondition) >= 0 ? data.specimenCondition : 'standard',
                relationshipMode: !!data.relationshipMode,
                renderQuality: ['auto', 'high', 'balanced'].indexOf(data.renderQuality) >= 0 ? data.renderQuality : 'auto',
                procedureScenario: ADVANCED_SCENARIOS.some(function (scenario) { return scenario.id === data.procedureScenario; }) ? data.procedureScenario : 'precision-access',
                instructorTarget: Math.max(60, Math.min(95, Number(data.instructorTarget) || 75)),
                instructorMaxCautions: Math.max(0, Math.min(3, Number(data.instructorMaxCautions) || 1)),
                instructorRequiredStructures: Math.max(1, Math.min(5, Number(data.instructorRequiredStructures) || 2)),
                procedureFeedback: null,
                selectedOrgan: null,
                _dissLoadedSpec: loadSpecimenKey
              });
            }, 0);
          }
          // Keyboard shortcuts stay inside the active lab and never intercept form controls.
          window._dissectionKeyHandler = function (e) {
            var target = e.target;
            var tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (target && target.isContentEditable)) return;
            var root = target && target.closest ? target.closest('[data-dissection-root]') : null;
            if (!root) return;
            var isCanvas = !!(target && target.matches && target.matches('[data-diss-canvas]'));
            if (!isCanvas && e.key !== 'Escape') return;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              var oi = organs.findIndex(function (o) { return o.id === d.selectedOrgan; });
              if (oi < organs.length - 1) chooseOrganFromDirectory(organs[Math.max(0, oi + 1)]);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              var oi2 = organs.findIndex(function (o) { return o.id === d.selectedOrgan; });
              if (oi2 > 0) chooseOrganFromDirectory(organs[oi2 - 1]);
            } else if (e.key === 'Escape') {
              upd('selectedOrgan', null);
            } else if (e.key === 'r' || e.key === 'R') {
              e.preventDefault();
              upd('canvasZoom', 1); upd('canvasPanX', 0); upd('canvasPanY', 0);
            } else if (e.key === 'v' || e.key === 'V') {
              e.preventDefault();
              var keyboardViews = ['dorsal', 'ventral', 'lateral', 'internal'];
              upd('anatomicalView', keyboardViews[(keyboardViews.indexOf(d.anatomicalView || 'dorsal') + 1) % keyboardViews.length]);
            } else if (e.key === 'x' || e.key === 'X') {
              e.preventDefault(); upd('crossSectionMode', !d.crossSectionMode);
            } else if (/^[1-6]$/.test(e.key)) {
              var keyboardTool = PROCEDURE_INSTRUMENTS[Number(e.key) - 1];
              if (keyboardTool) { e.preventDefault(); updMany({ activeInstrument: keyboardTool.id, annotateMode: false, rulerMode: false }); setProcedureFeedback(keyboardTool.label + ' selected with keyboard shortcut ' + e.key + '.'); }
            }
          };

          if (!window._dissectionKeyBound) {
            window._dissectionKeyBound = true;
            window.addEventListener('keydown', function (e) { if (window._dissectionKeyHandler) window._dissectionKeyHandler(e); });
          }


          // Simple sound effects via Web Audio API

          var audioCtx = null;

          function playDissectSound(type) {

            if (!disSoundEnabled()) return;
            try {

              if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

              var osc = audioCtx.createOscillator();

              var gain = audioCtx.createGain();

              osc.connect(gain); gain.connect(audioCtx.destination);

              gain.gain.setValueAtTime(0.05, audioCtx.currentTime);

              if (type === 'pin') { osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); }

              else if (type === 'peel') { osc.frequency.setValueAtTime(220, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + 0.2); osc.type = 'sawtooth'; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25); osc.start(); osc.stop(audioCtx.currentTime + 0.25); }

              else if (type === 'success') { osc.frequency.setValueAtTime(523, audioCtx.currentTime); osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); osc.start(); osc.stop(audioCtx.currentTime + 0.15); var osc2 = audioCtx.createOscillator(); var g2 = audioCtx.createGain(); osc2.connect(g2); g2.connect(audioCtx.destination); g2.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.12); osc2.frequency.setValueAtTime(659, audioCtx.currentTime + 0.12); osc2.type = 'sine'; g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); osc2.start(audioCtx.currentTime + 0.12); osc2.stop(audioCtx.currentTime + 0.3); }

            } catch (e) { }

          }



          var canvasClick = function (e) {

            if (e.target._wasPanning) { e.target._wasPanning = false; return; }
            if (e.target._suppressToolClick) { e.target._suppressToolClick = false; return; }

            var canvas = e.target; var rect = canvas.getBoundingClientRect();

            var rawX = (e.clientX - rect.left) / rect.width, rawY = (e.clientY - rect.top) / rect.height;
            canvas._parallaxTargetX = parallaxDepth ? (rawX - 0.5) * 8 : 0;
            canvas._parallaxTargetY = parallaxDepth ? (rawY - 0.5) * 6 : 0;

            // Inverse-transform for zoom + pan

            var _z = d.canvasZoom || 1, _px = d.canvasPanX || 0, _py = d.canvasPanY || 0;

            var mx = (rawX - 0.5 - _px / rect.width) / _z + 0.5;

            var my = (rawY - 0.5 - _py / rect.height) / _z + 0.5;
            mx -= (Number(canvas._parallaxX) || 0) / (canvas.width || 500);
            my -= (Number(canvas._parallaxY) || 0) / (canvas.height || 600);
            var mappedPoint = inverseSpecimenVariation({ x: mx, y: my });
            mx = mappedPoint.x; my = mappedPoint.y;

            if (!d.quizMode && !d.annotateMode && !d.rulerMode) {
              if (activeInstrument === 'forceps') { performProcedureAction('forceps', { point: { x: mx, y: my } }); return; }
              if (activeInstrument === 'pin') { performProcedureAction('pin', { point: { x: mx, y: my } }); return; }
              if (activeInstrument === 'dropper') { performProcedureAction('dropper', { point: { x: mx, y: my } }); return; }
              if (activeInstrument === 'scalpel' || activeInstrument === 'scissors') return;
            }

            var hit = null;

            organs.forEach(function (org) { if (viewOrganVisibility(org) !== 'visible') return; var orgPoint = variedOrganPoint(org); var dx = mx - orgPoint.x, dy = my - orgPoint.y; if (Math.sqrt(dx * dx + dy * dy) < (visualRealism === 'accessible' ? 0.065 : 0.05)) hit = org; });

            if (hit && d.quizMode && d.quizAnswerMode === 'hotspot' && !d.quizFeedback) submitQuizAnswer(hit.id);
            upd('selectedOrgan', hit ? (hit.id === d.selectedOrgan ? null : hit.id) : null);

            if (hit) {
              playDissectSound('pin'); sfxDisPin();
              if (window._alloHaptic) window._alloHaptic('click');

            }

            // Annotation mode: add to drawing

            if (d.annotateMode) {

              var annots = d.annotations || [];

              annots.push({ x: mx, y: my, type: 'dot' });

              upd('annotations', annots);

              if (annots.length > 1) {

                // Connect to previous dot

                annots[annots.length - 1].prevX = annots[annots.length - 2].x;

                annots[annots.length - 1].prevY = annots[annots.length - 2].y;

                upd('annotations', annots.slice());

              }

            }

            // Ruler mode: set start/end points

            if (d.rulerMode) {

              if (!d.rulerStart || d.rulerEnd) {

                upd('rulerStart', { x: mx, y: my });

                upd('rulerEnd', null);

              } else {

                upd('rulerEnd', { x: mx, y: my });

              }

            }

            // Track explored organs for progress

            if (hit) {

              var explored = Object.assign({}, d.exploredOrgans || {});

              explored[specimen + '|' + hit.id] = true;

              upd('exploredOrgans', explored);

              // Advance guided walkthrough if correct organ clicked

              if (guidedMode && currentGuided && hit.id === currentGuided.organId) {

                upd('guidedStep', guidedStep + 1);

                awardStemXP('dissection', 2, 'Found ' + hit.name + ' in guided tour');

                sfxDisProbe(); if (window._alloHaptic) window._alloHaptic('tap');
                if (addToast) addToast('\uD83D\uDCCD ' + 'Found organ!'.replace('{name}', hit.name), 'success');

                if (guidedStep + 1 >= guidedSteps.length) {

                  upd('guidedMode', false);

                  upd('guidedComplete', true);

                  awardStemXP('dissection', 10, 'Completed guided tour');

                  if (addToast) addToast('\uD83C\uDF89 ' + 'Tour Complete!', 'success');

                }

              }

            }

          };



          // Hover handler for canvas tooltips

          var canvasHover = function (e) {

            var canvas = e.target; var rect = canvas.getBoundingClientRect();

            var rawX = (e.clientX - rect.left) / rect.width, rawY = (e.clientY - rect.top) / rect.height;
            canvas._parallaxTargetX = parallaxDepth ? (rawX - 0.5) * 8 : 0;
            canvas._parallaxTargetY = parallaxDepth ? (rawY - 0.5) * 6 : 0;

            // Inverse-transform for zoom + pan

            var _z = d.canvasZoom || 1, _px = d.canvasPanX || 0, _py = d.canvasPanY || 0;

            var mx = (rawX - 0.5 - _px / rect.width) / _z + 0.5;

            var my = (rawY - 0.5 - _py / rect.height) / _z + 0.5;
            mx -= (Number(canvas._parallaxX) || 0) / (canvas.width || 500);
            my -= (Number(canvas._parallaxY) || 0) / (canvas.height || 600);
            var mappedPoint = inverseSpecimenVariation({ x: mx, y: my });
            mx = mappedPoint.x; my = mappedPoint.y;
            var priorToolPointer = canvas._toolPointer;
            if (priorToolPointer) {
              var vectorX = mx - priorToolPointer.x, vectorY = my - priorToolPointer.y;
              if (Math.abs(vectorX) + Math.abs(vectorY) > 0.0015) canvas._toolVector = { x: vectorX, y: vectorY };
            }
            canvas._toolPointer = { x: mx, y: my, at: Date.now() };
            canvas._toolPressure = Number(e.pressure) || (e.buttons ? 0.5 : 0.12);

            var hit = null;

            organs.forEach(function (org) { if (viewOrganVisibility(org) !== 'visible') return; var orgPoint = variedOrganPoint(org); var dx = mx - orgPoint.x, dy = my - orgPoint.y; if (Math.sqrt(dx * dx + dy * dy) < (visualRealism === 'accessible' ? 0.06 : 0.04)) hit = org; });

            upd('hoveredOrgan', hit ? hit.id : null);

            var toolCursor = (activeInstrument === 'scalpel' || activeInstrument === 'scissors') ? 'crosshair' : (activeInstrument === 'forceps' ? 'grab' : 'pointer');
            canvas.style.cursor = visualRealism === 'accessible' || !instrumentVisuals
              ? (hit ? 'pointer' : (canvas._isPanning ? 'grabbing' : ((d.canvasZoom || 1) > 1 && activeInstrument === 'probe' ? 'grab' : toolCursor)))
              : (canvas._isPanning ? 'grabbing' : 'none');

          };



          // Progress calculation

          var exploredOrgans = d.exploredOrgans || {};

          var totalOrgansInSpecimen = 0;

          var exploredCount = 0;

          spec.layers.forEach(function (layer) {

            var layerOrgans = spec.organs[layer.id] || [];

            totalOrgansInSpecimen += layerOrgans.length;

            layerOrgans.forEach(function (org) {

              if (exploredOrgans[specimen + '|' + org.id]) exploredCount++;

            });

          });

          var progressPct = totalOrgansInSpecimen > 0 ? Math.round((exploredCount / totalOrgansInSpecimen) * 100) : 0;



          // Guided walkthrough data

          var guidedSteps = organs.map(function (org, i) {

            return { organId: org.id, name: org.name, prompt: 'Find the next structure'.replace('{step}', i + 1).replace('{total}', organs.length).replace('{name}', org.name) };

          });

          var currentGuided = guidedMode && guidedSteps[guidedStep % guidedSteps.length];



          var SPEC_KEYS = Object.keys(SPECIMENS);
          var currentLayerDef = spec.layers[currentLayerIdx] || spec.layers[0] || { id: activeLayer, name: activeLayer, desc: '' };
          var currentLayerDone = !!revealedLayers[activeLayer];
          var nextLayerDef = spec.layers[currentLayerIdx + 1] || null;
          var procedureStageIdx = procedureStepIndex(currentProcedure);
          var procedureNext = nextProcedureInfo();
          var techniqueScore = procedureTechniqueScore(currentProcedure);
          var recentTechniqueMetrics = currentProcedure.extensionMetrics || currentProcedure.incisionMetrics || null;
          var scenarioDefinition = currentScenarioDefinition();
          var scenarioStatus = procedureScenarioStatus();
          var procedureDebrief = procedureDebriefData();
          var attemptEntries = (((d.attemptArchive || {})[activeLayer]) || []);
          var techniqueComparison = techniqueComparisonData();
          var adaptiveCoach = adaptiveCoachingData();
          var activeMaterialProfile = SPECIMEN_MATERIAL_PROFILES[spec.bodyShape] || SPECIMEN_MATERIAL_PROFILES.frog;
          var referenceEvidence = visualEvidence.find(function (entry) { return entry.id === d.referenceEvidenceId; }) || visualEvidence[visualEvidence.length - 1] || null;
          var selectedRelationships = anatomicalRelationships();
          var visibleOrgansInView = organs.filter(function (org) { return viewOrganVisibility(org) === 'visible'; });
          var revealedLayerCount = spec.layers.filter(function (layer) { return !!revealedLayers[layer.id]; }).length;
          var unlockedLayerIdx = Math.max(0, currentLayerIdx);
          spec.layers.forEach(function (layer, layerIdx) {
            if (layerIdx === 0 || revealedLayers[spec.layers[layerIdx - 1].id]) unlockedLayerIdx = Math.max(unlockedLayerIdx, layerIdx);
          });
          var nextUnexplored = organs.find(function (org) { return !exploredOrgans[specimen + '|' + org.id]; });
          var missionText = nextUnexplored
            ? 'Identify ' + nextUnexplored.name + ' in the ' + currentLayerDef.name + ' layer.'
            : (nextLayerDef ? 'Reveal the ' + nextLayerDef.name + ' layer to continue the investigation.' : 'Review the final layer and complete your specimen notes.');
          var studyRoute = d.guidedMode ? 'guided' : (d.quizMode ? 'quiz' : ((d.flashcardMode || d.compareMode || d.practicalMode) ? 'study' : 'explore'));

          function captureVisualEvidence() {
            try {
              var sourceCanvas = document.querySelector('[data-diss-canvas]');
              if (!sourceCanvas) throw new Error('Canvas unavailable');
              var thumbnail = document.createElement('canvas');
              thumbnail.width = 220; thumbnail.height = 264;
              var thumbnailContext = thumbnail.getContext('2d');
              if (!thumbnailContext) throw new Error('Thumbnail canvas unavailable');
              thumbnailContext.drawImage(sourceCanvas, 0, 0, thumbnail.width, thumbnail.height);
              var evidenceId = Date.now();
              var selectedEvidenceOrgan = d.selectedOrgan ? organs.find(function (organ) { return organ.id === d.selectedOrgan; }) : null;
              var evidenceEntry = {
                id: evidenceId,
                image: thumbnail.toDataURL('image/jpeg', 0.72),
                capturedAt: new Date(evidenceId).toISOString(),
                layer: activeLayer,
                layerName: currentLayerDef.name,
                view: anatomicalView,
                condition: specimenCondition,
                selectedOrganId: selectedEvidenceOrgan ? selectedEvidenceOrgan.id : null,
                selectedOrganName: selectedEvidenceOrgan ? selectedEvidenceOrgan.name : '',
                techniqueScore: techniqueScore,
                specimen: specimen
              };
              var nextEvidence = visualEvidence.concat([evidenceEntry]).slice(-6);
              updMany({ visualEvidence: nextEvidence, referenceEvidenceId: evidenceId, splitComparison: true });
              if (addToast) addToast('Evidence frame captured and opened for comparison.', 'success');
              if (typeof announceToSR === 'function') announceToSR('Captured evidence frame for ' + currentLayerDef.name + '. Split comparison is on.');
            } catch (error) {
              if (addToast) addToast('Evidence capture is unavailable in this view.', 'error');
            }
          }

          function selectEvidenceReference(evidenceId) {
            var evidence = visualEvidence.find(function (entry) { return entry.id === evidenceId; });
            if (!evidence) return;
            updMany({ referenceEvidenceId: evidenceId, splitComparison: true });
            if (typeof announceToSR === 'function') announceToSR('Reference frame selected from ' + evidence.layerName + '.');
          }

          function downloadEvidence(evidence) {
            if (!evidence || !evidence.image) return;
            try {
              var link = document.createElement('a');
              link.download = specimen + '_' + (evidence.layer || 'evidence') + '_' + evidence.id + '.jpg';
              link.href = evidence.image; link.click();
              if (addToast) addToast('Evidence frame downloaded.', 'success');
            } catch (error) {
              if (addToast) addToast('Evidence download failed.', 'error');
            }
          }

          function selectSpecimen(sk) {
            var sp = SPECIMENS[sk];
            if (!sp || sk === specimen) return;
            closeTimedPractical();
            var viewed = Object.assign({}, d.specimensViewed || {});
            viewed[sk] = true;
            updMany({ specimen: sk, activeLayer: (sp.layers && sp.layers[0] ? sp.layers[0].id : 'skin'), selectedOrgan: null, guidedStep: 0, organSearch: '', exploredOrgans: {}, revealedLayers: {}, quizScore: 0, quizTotal: 0, quizFeedback: null, completedObjectives: {}, organNotes: {}, organConfidence: {}, annotations: [], timeSpent: 0, guidedComplete: false, procedureByLayer: {}, attemptArchive: {}, compareTechniqueAttempts: false, visualEvidence: [], referenceEvidenceId: null, splitComparison: false, procedureFeedback: null, activeInstrument: 'probe', incisionDepth: 'shallow', specimensViewed: viewed, _dissLoadedSpec: null });
            if (typeof announceToSR === 'function') announceToSR('Selected ' + sp.name + '. Loading saved progress for the ' + ((sp.layers[0] || {}).name || 'first') + ' layer.');
            if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'specimenSelect', 'Selected ' + sp.name + '. ' + sp.desc, { debounce: 500 });
          }
          function onSpecimenKeyDown(e, sk) {
            var idx = SPEC_KEYS.indexOf(sk);
            var nextIdx = idx;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % SPEC_KEYS.length;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + SPEC_KEYS.length) % SPEC_KEYS.length;
            else if (e.key === 'Home') nextIdx = 0;
            else if (e.key === 'End') nextIdx = SPEC_KEYS.length - 1;
            else return;
            e.preventDefault();
            var nextKey = SPEC_KEYS[nextIdx];
            selectSpecimen(nextKey);
            setTimeout(function () {
              var target = document.getElementById('diss-specimen-tab-' + nextKey);
              if (target) target.focus();
            }, 0);
          }

          function selectLayer(layerId) {
            var layerIdx = spec.layers.findIndex(function (layer) { return layer.id === layerId; });
            if (layerIdx < 0 || layerIdx > unlockedLayerIdx) return;
            upd('activeLayer', layerId);
            upd('selectedOrgan', null);
            upd('guidedStep', 0);
            var layer = spec.layers[layerIdx];
            if (typeof announceToSR === 'function') announceToSR('Viewing ' + layer.name + ' layer, step ' + (layerIdx + 1) + ' of ' + spec.layers.length + '.');
          }

          function moveThroughLayer() {
            if (d._incisionAnim && d._incisionAnim.active) return;
            if (currentLayerDone && nextLayerDef) { selectLayer(nextLayerDef.id); return; }
            if (!currentLayerDone) performNextProcedureStep();
          }

          function closeTimedPractical() {
            try { if (window.__alloDissectionPracticalInterval) clearInterval(window.__alloDissectionPracticalInterval); window.__alloDissectionPracticalInterval = null; window.__alloDissectionPracticalScore = 0; } catch (e) {}
            if (!d.practicalMode) return;
            updMany({ practicalMode: false, quizMode: false, labelMode: d._prePracticalLabelMode || 'show' });
          }

          function setStudyRoute(route) {
            var secondaryStudyOpen = !!(d.flashcardMode || d.compareMode || d.practicalMode);
            var routeIsClean = route === 'explore' ? !d.guidedMode && !d.quizMode : route === 'guided' ? !!d.guidedMode && !d.quizMode : !!d.quizMode && !d.guidedMode && !d.practicalMode;
            if (routeIsClean && !secondaryStudyOpen) return;
            closeTimedPractical();
            if (route === 'guided') {
              updMany({ flashcardMode: false, compareMode: false, quizMode: false, guidedMode: true, guidedStep: 0 });
              if (typeof announceToSR === 'function') announceToSR('Guided investigation started. ' + (currentGuided ? currentGuided.prompt : 'Choose a structure on the canvas.'));
            } else if (route === 'quiz') {
              updMany({ flashcardMode: false, compareMode: false, guidedMode: false, quizMode: true, quizIdx: 0, quizScore: 0, quizTotal: 0, quizFeedback: null, quizExplanation: null, quizSeed: Date.now(), quizAnswerMode: d.quizAnswerMode || 'choices' });
              if (typeof announceToSR === 'function') announceToSR('Practice assessment started. Choose multiple choice or answer directly on the specimen.');
            } else {
              updMany({ flashcardMode: false, compareMode: false, guidedMode: false, quizMode: false, quizFeedback: null });
              if (typeof announceToSR === 'function') announceToSR('Free explore mode active.');
            }
          }
          function chooseOrganFromDirectory(org) {
            upd('selectedOrgan', org.id);
            var explored = Object.assign({}, d.exploredOrgans || {});
            explored[specimen + '|' + org.id] = true;
            upd('exploredOrgans', explored);
            if (guidedMode && currentGuided && org.id === currentGuided.organId) {
              upd('guidedStep', guidedStep + 1);
              awardStemXP('dissection', 2, 'Found ' + org.name + ' in guided tour');
              sfxDisProbe();
              if (addToast) addToast('Found ' + org.name + '!', 'success');
              if (guidedStep + 1 >= guidedSteps.length) {
                upd('guidedMode', false);
                upd('guidedComplete', true);
                awardStemXP('dissection', 10, 'Completed guided tour');
                if (addToast) addToast('Guided tour complete!', 'success');
              }
            }


          }





          // â”€â”€ Render â”€â”€

          return React.createElement("div", { className: "space-y-3", "data-dissection-root": true },

            React.createElement("section", { className: "diss-mission", "data-dissection-mission": true, "aria-labelledby": "diss-mission-title" },
              React.createElement("div", { className: "diss-mission__main" },
                React.createElement("p", { className: "diss-mission__eyebrow" }, __alloT('stem.dissection.virtual_biology_laboratory', 'Virtual Biology Laboratory')),
                React.createElement("h2", { id: "diss-mission-title" }, __alloT('stem.dissection.virtual_dissection_lab', 'Virtual Dissection Lab')),
                React.createElement("p", { className: "diss-mission__copy" }, missionText),
                React.createElement("ol", { className: "diss-workflow", "aria-label": "Dissection workflow" },
                  [__alloT('stem.dissection.orient', 'Orient'), __alloT('stem.dissection.predict', 'Predict'), __alloT('stem.dissection.reveal_a_layer', 'Reveal'), __alloT('stem.dissection.identify_structures', 'Identify'), __alloT('stem.dissection.record_evidence', 'Record evidence'), __alloT('stem.dissection.compare', 'Compare')].map(function (step, stepIdx) {
                    return React.createElement("li", { key: step },
                      React.createElement("span", { className: "diss-workflow__number", "aria-hidden": "true" }, String(stepIdx + 1)),
                      step
                    );
                  })
                ),
                React.createElement("p", { className: "diss-mission__copy" }, __alloT('stem.dissection.virtual_practice_notice', 'Virtual practice supports observation and comparison. Follow your instructor’s safety, ethics, handling, and disposal procedures for any physical specimen.'))
              ),
              React.createElement("aside", { className: "diss-mission__action", "aria-label": "Current layer action" },
                React.createElement("span", { className: "diss-mission__action-label" }, 'Current investigation'),
                React.createElement("h3", null, currentLayerDef.icon + ' ' + currentLayerDef.name + ' layer'),
                React.createElement("p", { id: "diss-layer-action-help" }, currentLayerDef.desc || ('Explore the ' + currentLayerDef.name + ' anatomy before continuing.')),
                React.createElement("button", {
                  type: "button",
                  className: "diss-primary-action",
                  "data-dissection-reveal": true,
                  disabled: (currentLayerDone && !nextLayerDef) || !!(d._incisionAnim && d._incisionAnim.active),
                  "aria-describedby": "diss-layer-action-help",
                  onClick: moveThroughLayer
                }, (d._incisionAnim && d._incisionAnim.active)
                  ? 'Technique in progress...'
                  : (currentLayerDone && nextLayerDef)
                    ? 'Continue to ' + nextLayerDef.name
                    : (currentLayerDone ? 'All layers revealed' : procedureNext.label))
              ),
              React.createElement("div", { className: "diss-mission__stats", "aria-label": "Current lab status" },
                [
                  { label: 'Specimen', value: spec.icon + ' ' + spec.name },
                  { label: 'Layer', value: (currentLayerIdx + 1) + ' of ' + spec.layers.length + ' · ' + currentLayerDef.name },
                  { label: 'Structures explored', value: exploredCount + ' of ' + totalOrgansInSpecimen }
                ].map(function (stat) {
                  return React.createElement("div", { className: "diss-stat", key: stat.label },
                    React.createElement("span", { className: "diss-stat__label" }, stat.label),
                    React.createElement("span", { className: "diss-stat__value", title: stat.value }, stat.value)
                  );
                })
              )
            ),

            React.createElement("div", { className: "diss-mode-rail", role: "toolbar", "aria-label": "Learning route" },
              [
                { id: 'explore', icon: '🔎', label: __alloT('stem.dissection.free_explore', 'Free explore') },
                { id: 'guided', icon: '🧭', label: __alloT('stem.dissection.guided_investigation', 'Guided investigation') },
                { id: 'quiz', icon: '🧠', label: __alloT('stem.dissection.practice_assessment', 'Practice assessment') }
              ].map(function (route) {
                var active = studyRoute === route.id;
                return React.createElement("button", {
                  type: "button",
                  key: route.id,
                  className: "diss-route-button",
                  "data-active": active ? "true" : "false",
                  "aria-pressed": active,
                  onClick: function () { setStudyRoute(route.id); }
                }, route.icon + ' ' + route.label);
              })
            ),

            React.createElement("section", { className: "diss-picker", "data-dissection-specimens": true, "aria-labelledby": "diss-specimen-heading" },
              React.createElement("div", { className: "diss-section-heading" },
                React.createElement("h3", { id: "diss-specimen-heading" }, 'Choose a specimen'),
                React.createElement("p", null, SPEC_KEYS.length + ' comparative anatomy models')
              ),
              React.createElement("div", { className: "diss-specimen-rail", role: "tablist", "aria-label": "Dissection specimens" },
                SPEC_KEYS.map(function (sk) {
                  var sp = SPECIMENS[sk];
                  var isActive = sk === specimen;
                  return React.createElement("button", {
                    type: "button",
                    key: sk,
                    id: 'diss-specimen-tab-' + sk,
                    role: "tab",
                    "aria-label": "Select specimen: " + sp.name,
                    "aria-selected": isActive,
                    "aria-controls": "diss-workspace",
                    tabIndex: isActive ? 0 : -1,
                    onKeyDown: function (e) { onSpecimenKeyDown(e, sk); },
                    onClick: function () { selectSpecimen(sk); },
                    className: "diss-specimen-tab"
                  }, sp.icon + ' ' + sp.name);
                })
              )
            ),

            React.createElement("nav", { className: "diss-layer-stepper", "data-dissection-layer-stepper": true, "aria-labelledby": "diss-layer-heading" },
              React.createElement("div", { className: "diss-section-heading" },
                React.createElement("h3", { id: "diss-layer-heading" }, 'Anatomical layers'),
                React.createElement("p", null, revealedLayerCount + ' of ' + spec.layers.length + ' completed')
              ),
              React.createElement("div", { className: "diss-layer-list" },
                spec.layers.map(function (layer, layerIdx) {
                  var isCurrent = layer.id === activeLayer;
                  var isDone = !!revealedLayers[layer.id];
                  var isUnlocked = layerIdx <= unlockedLayerIdx;
                  var state = isCurrent ? 'current' : (isDone ? 'revealed' : (isUnlocked ? 'available' : 'locked'));
                  return React.createElement("button", {
                    type: "button",
                    key: layer.id,
                    className: "diss-layer-button",
                    "data-state": state,
                    disabled: !isUnlocked,
                    "aria-current": isCurrent ? "step" : undefined,
                    "aria-label": 'Layer ' + (layerIdx + 1) + ': ' + layer.name + (isCurrent ? ', current' : isDone ? ', revealed' : isUnlocked ? ', available' : ', locked'),
                    onClick: function () { selectLayer(layer.id); }
                  },
                    React.createElement("span", { className: "diss-layer-index", "aria-hidden": "true" }, String(layerIdx + 1)),
                    React.createElement("span", { className: "diss-layer-name" }, layer.icon + ' ' + layer.name),
                    React.createElement("span", { className: "diss-layer-state", "aria-hidden": "true" }, isCurrent ? '●' : isDone ? '✓' : isUnlocked ? '→' : '🔒')
                  );
                })
              )
            ),

            // Toolbar: compact secondary controls
            React.createElement("div", { className: "diss-toolbar flex flex-wrap items-center bg-slate-50 border border-slate-400", role: "toolbar", "aria-label": "Secondary lab controls" },

              // ── View toggle ──
              React.createElement("button", { type: "button", "aria-label": "Toggle View toolbar", "aria-expanded": !!d.toolbarViewOpen, "aria-controls": "diss-view-tools",
                onClick: function () { upd('toolbarViewOpen', !d.toolbarViewOpen); upd('toolbarToolsOpen', false); upd('toolbarStudyOpen', false); },
                className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.toolbarViewOpen ? 'bg-blue-600 text-white shadow-md' : 'transition-colors bg-white text-slate-600 border border-slate-400 hover:bg-blue-50 active:scale-[0.97]')
              }, '\uD83D\uDC41 View ' + (d.toolbarViewOpen ? '\u25B2' : '\u25BC')),

              // ── Tools toggle ──
              React.createElement("button", { type: "button", "aria-label": "Toggle Tools toolbar", "aria-expanded": !!d.toolbarToolsOpen, "aria-controls": "diss-lab-tools",
                onClick: function () { upd('toolbarToolsOpen', !d.toolbarToolsOpen); upd('toolbarViewOpen', false); upd('toolbarStudyOpen', false); },
                className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.toolbarToolsOpen ? 'bg-emerald-700 text-white shadow-md' : 'transition-colors bg-white text-slate-600 border border-slate-400 hover:bg-emerald-50 active:scale-[0.97]')
              }, '\uD83D\uDEE0 Tools ' + (d.toolbarToolsOpen ? '\u25B2' : '\u25BC')),

              // ── Study toggle ──
              React.createElement("button", { type: "button", "aria-label": "Toggle Study toolbar", "aria-expanded": !!d.toolbarStudyOpen, "aria-controls": "diss-study-tools",
                onClick: function () { upd('toolbarStudyOpen', !d.toolbarStudyOpen); upd('toolbarViewOpen', false); upd('toolbarToolsOpen', false); },
                className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.toolbarStudyOpen ? 'bg-amber-700 text-white shadow-md' : (d.quizMode || d.flashcardMode || d.guidedMode || d.compareMode || d.practicalMode ? 'bg-amber-100 text-amber-700 border border-amber-600' : 'transition-colors bg-white text-slate-600 border border-slate-400 hover:bg-amber-50 active:scale-[0.97]'))
              }, '\uD83D\uDCDA Study ' + (d.toolbarStudyOpen ? '\u25B2' : '\u25BC'))

            ),

            // ── View group expanded ──
            d.toolbarViewOpen && React.createElement("div", { id: "diss-view-tools", className: "diss-tool-panel flex flex-wrap bg-blue-50 rounded-xl border border-blue-200 animate-[fadeIn_0.2s_ease-out]", role: "region", "aria-label": "View and accessibility controls" },
              React.createElement("button", { "aria-label": "Toggle organ name labels", "aria-pressed": d.labelMode !== 'hidden', onClick: function () { upd('labelMode', d.labelMode === 'show' ? 'hidden' : 'show'); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.labelMode !== 'hidden' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\uD83C\uDFF7 Labels'),
              React.createElement("button", { "aria-label": "Toggle high contrast mode", "aria-pressed": !!d.highContrast, onClick: function () { upd('highContrast', !d.highContrast); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.highContrast ? 'bg-yellow-500 text-black' : 'bg-white text-blue-700 border border-blue-200') }, '\u2600 High contrast'),
              React.createElement("button", { "aria-label": "Toggle dissection sound effects", "aria-pressed": d.soundEnabled !== false, onClick: function () { var enabled = d.soundEnabled === false; try { window.__alloDissectionSoundEnabled = enabled; } catch (e) {} upd('soundEnabled', enabled); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.soundEnabled !== false ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, d.soundEnabled !== false ? '\uD83D\uDD0A Sound on' : '\uD83D\uDD07 Sound off'),
              React.createElement("button", { "aria-label": "Toggle tactile instrument feedback", "aria-pressed": d.tactileFeedback !== false, onClick: function () { upd('tactileFeedback', d.tactileFeedback === false); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.tactileFeedback !== false ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, d.tactileFeedback !== false ? '\u223F Tactile on' : '\u223F Tactile off'),
              React.createElement("button", { "aria-label": "Visual presentation: cycle guided, realistic, and accessible", onClick: function () { setVisualRealism(visualRealism === 'guided' ? 'realistic' : (visualRealism === 'realistic' ? 'accessible' : 'guided')); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u2726 Visuals: ' + (visualRealism === 'realistic' ? 'Realistic' : visualRealism === 'accessible' ? 'Accessible' : 'Guided')),
              React.createElement("button", { "aria-label": "Anatomical view: cycle dorsal, ventral, lateral, and internal", onClick: function () { var views = ['dorsal', 'ventral', 'lateral', 'internal']; upd('anatomicalView', views[(views.indexOf(anatomicalView) + 1) % views.length]); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u21BB View: ' + anatomicalView),
              React.createElement("button", { "aria-label": "Toggle layer cross-section", "aria-pressed": crossSectionMode, onClick: function () { upd('crossSectionMode', !crossSectionMode); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (crossSectionMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\u25A4 Cross-section ' + (crossSectionMode ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Specimen condition: cycle standard, preserved, dehydrated, cloudy, and swollen", onClick: function () { var conditions = ['standard', 'preserved', 'dehydrated', 'cloudy', 'swollen']; upd('specimenCondition', conditions[(conditions.indexOf(specimenCondition) + 1) % conditions.length]); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u25C9 Condition: ' + specimenCondition),
              React.createElement("button", { "aria-label": "Toggle curated anatomical relationships", "aria-pressed": relationshipMode, onClick: function () { upd('relationshipMode', !relationshipMode); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (relationshipMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\u2194 Relationships ' + (relationshipMode ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Rendering quality: cycle auto, high, and balanced", onClick: function () { var qualities = ['auto', 'high', 'balanced']; upd('renderQuality', qualities[(qualities.indexOf(renderQuality) + 1) % qualities.length]); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u2699 Quality: ' + renderQuality),
              React.createElement("button", { "aria-label": "Toggle movable inspection lens", "aria-pressed": inspectionLens, onClick: function () { upd('inspectionLens', !inspectionLens); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (inspectionLens ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\uD83D\uDD0D Lens ' + (inspectionLens ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Toggle detailed pointer-following instrument visuals and contact response", "aria-pressed": instrumentVisuals, onClick: function () { upd('instrumentVisuals', !instrumentVisuals); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (instrumentVisuals ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\u2692 Visual tools ' + (instrumentVisuals ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Toggle docked macro inspection view", "aria-pressed": macroInset, onClick: function () { upd('macroInset', !macroInset); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (macroInset ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\u25A3 Macro view ' + (macroInset ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Toggle specimen-specific surface and tray depth details", "aria-pressed": sceneDetail, onClick: function () { upd('sceneDetail', !sceneDetail); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (sceneDetail ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\u2726 Scene detail ' + (sceneDetail ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Toggle animated direction markers for curated anatomical relationships", "aria-pressed": relationshipMotion, onClick: function () { upd('relationshipMotion', !relationshipMotion); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (relationshipMotion ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\u2192 Flow motion ' + (relationshipMotion ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Toggle selected-structure focus isolation", "aria-pressed": focusMode, onClick: function () { upd('focusMode', !focusMode); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (focusMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, '\u25CE Focus mode ' + (focusMode ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Toggle subtle pointer-responsive specimen depth", "aria-pressed": parallaxDepth, onClick: function () { upd('parallaxDepth', !parallaxDepth); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (parallaxDepth ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, 'Depth motion ' + (parallaxDepth ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Toggle live and reference split comparison", "aria-pressed": splitComparison && !!referenceEvidence, disabled: !referenceEvidence, onClick: function () { upd('splitComparison', !splitComparison); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (splitComparison && referenceEvidence ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') + (!referenceEvidence ? ' opacity-50 cursor-not-allowed' : '') }, 'Split compare ' + (splitComparison && referenceEvidence ? 'on' : 'off')),
              React.createElement("button", { "aria-label": "Lab light: cycle neutral, warm, and cool", onClick: function () { upd('labLight', labLight === 'neutral' ? 'warm' : (labLight === 'warm' ? 'cool' : 'neutral')); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\uD83D\uDCA1 ' + labLight + ' light'),
              React.createElement("button", { "aria-label": "Laboratory light direction: cycle overhead, left, right, and raking", onClick: function () { var directions = ['overhead', 'left', 'right', 'raking']; upd('lightDirection', directions[(directions.indexOf(lightDirection) + 1) % directions.length]); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u2198 Light angle: ' + lightDirection),
              React.createElement("button", { "aria-label": "Generate another deterministic specimen variation", onClick: function () { upd('variationSeed', variationSeed + 1); setProcedureFeedback('Loaded specimen variation ' + (variationSeed + 1) + '. Landmark shifts are small and deterministic.'); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u21BB Variation ' + variationSeed),
              React.createElement("button", { "aria-label": "Toggle before and after technique view", "aria-pressed": !!d.beforeTechniqueView, onClick: function () { upd('beforeTechniqueView', !d.beforeTechniqueView); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold " + (d.beforeTechniqueView ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200') }, d.beforeTechniqueView ? '\u25C0 Before view' : '\u25B6 After view'),
              React.createElement("button", { "aria-label": "Enter fullscreen canvas mode", onClick: function () { try { var c = document.querySelector('[data-diss-canvas]'); if (window.__alloStemFS) window.__alloStemFS(c); } catch (e) {} }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u26F6 Fullscreen'),
              React.createElement("button", { "aria-label": "Animation speed: cycle normal, slow, and fast", onClick: function () { var s = d.animSpeed === 'fast' ? 'normal' : (d.animSpeed === 'normal' ? 'slow' : 'fast'); upd('animSpeed', s); }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\u23E9 ' + (d.animSpeed === 'slow' ? 'Slow' : d.animSpeed === 'fast' ? 'Fast' : 'Normal')),
              React.createElement("button", { "aria-label": "Print clean dissection report", onClick: function () { try { window.print(); } catch (e) { if (addToast) addToast('Print is unavailable in this view.', 'error'); } }, className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200" }, '\uD83D\uDDA8 Print')
            ),

            // Tools group expanded
            d.toolbarToolsOpen && React.createElement("div", { id: "diss-lab-tools", className: "diss-tool-panel flex flex-wrap bg-emerald-50 rounded-xl border border-emerald-200 animate-[fadeIn_0.2s_ease-out]", role: "region", "aria-label": "Lab tools" },

              React.createElement("button", { "aria-label": "Ruler", "aria-pressed": !!d.rulerMode,
                onClick: function () { upd('rulerMode', !d.rulerMode); if (!d.rulerMode) upd('annotateMode', false); },
                title: 'Ruler' + ' — Measure distances on the specimen',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.rulerMode ? 'bg-emerald-700 text-white' : 'transition-colors bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-[0.97]')
              }, '\uD83D\uDCCF ' + 'Ruler'),

              React.createElement("button", { "aria-label": "Annotate", "aria-pressed": !!d.annotateMode,
                onClick: function () { upd('annotateMode', !d.annotateMode); if (!d.annotateMode) upd('rulerMode', false); },
                title: 'Annotate' + ' — Draw annotations on the canvas',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.annotateMode ? 'bg-emerald-700 text-white' : 'transition-colors bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-[0.97]')
              }, '\u270F ' + 'Annotate'),

              React.createElement("button", { "aria-label": "Screenshot",
                onClick: function () {
                  try {
                    var c = document.querySelector('[data-diss-canvas]');
                    if (c) { var link = document.createElement('a'); link.download = specimen + '_dissection.png'; link.href = c.toDataURL(); link.click(); if (addToast) addToast('\uD83D\uDCF8 Screenshot saved!', 'success'); }
                  } catch (e) { if (addToast) addToast('Screenshot failed', 'error'); }
                },
                title: 'Screenshot' + ' — Save the current canvas view',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all active:scale-[0.97]"
              }, '\uD83D\uDCF8 ' + 'Screenshot'),

              React.createElement("button", { "aria-label": "Capture compressed visual evidence frame",
                onClick: captureVisualEvidence,
                title: 'Capture evidence — Save a lightweight frame in the specimen notebook',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all active:scale-[0.97]"
              }, 'Capture evidence'),

              React.createElement("button", { "aria-label": "Copy accurate lab report to clipboard",
                onClick: function () {
                  var report = 'Virtual Dissection Lab Report: ' + spec.name + '\n' + '\u2500'.repeat(36) + '\n';
                  report += 'Specimen: ' + spec.name + '\nLayers revealed: ' + revealedLayerCount + '/' + spec.layers.length + '\n';
                  report += 'Structures examined: ' + exploredCount + '/' + totalOrgansInSpecimen + '\nPractice score: ' + (d.quizScore || 0) + '/' + (d.quizTotal || 0) + '\n';
                  report += 'Active investigation time: ' + (d.timeSpent || 0) + ' seconds\n';
                  var techniqueLayers = spec.layers.map(function (layer) { return (d.procedureByLayer || {})[layer.id] || {}; });
                  var completedTechniques = techniqueLayers.filter(function (state) { return procedureStepIndex(state) >= 6; }).length;
                  var techniqueCautions = techniqueLayers.reduce(function (sum, state) { return sum + (Number(state.errors) || 0); }, 0);
                  report += 'Technique sequences complete: ' + completedTechniques + '/' + spec.layers.length + '\n';
                  report += 'Technique cautions reviewed: ' + techniqueCautions + '\n';
                  report += 'Technique support: ' + (procedureMode === 'independent' ? 'Independent' : 'Guided') + '\n';
                  report += 'Current layer technique score: ' + procedureTechniqueScore((d.procedureByLayer || {})[activeLayer] || {}) + '/100\n';
                  var reportMetrics = currentProcedure.extensionMetrics || currentProcedure.incisionMetrics;
                  report += 'Current tool control: ' + (reportMetrics ? (reportMetrics.control == null ? reportMetrics.smoothness : reportMetrics.control) + '%' : 'Not scored') + '\n';
                  report += 'Technique input: ' + (currentProcedure.inputType || 'Not recorded') + '\n';
                  report += 'Saved attempts for current layer: ' + attemptEntries.length + '\n';
                  if (techniqueComparison) report += 'Attempt score change: ' + (techniqueComparison.scoreDelta >= 0 ? '+' : '') + techniqueComparison.scoreDelta + ' points\n';
                  report += 'Adaptive coaching: ' + adaptiveCoach.focus + ' — ' + adaptiveCoach.suggestion + '\n';
                  report += 'Caution history: ' + ((currentProcedure.cautionLog || []).map(function (entry) { return entry.message; }).join(' | ') || 'None') + '\n';
                  report += 'Technique timeline: ' + ((currentProcedure.actionLog || []).map(function (entry) { return entry.label || procedureActionLabel(entry.action); }).join(' > ') || 'Not started') + '\n';
                  report += 'Visual presentation: ' + visualRealism + '; lab light: ' + labLight + '; light direction: ' + lightDirection + '; inspection lens: ' + (inspectionLens ? 'on' : 'off') + '; visual tools: ' + (instrumentVisuals ? 'on' : 'off') + '; macro view: ' + (macroInset ? 'on' : 'off') + '; scene detail: ' + (sceneDetail ? 'on' : 'off') + '; relationship motion: ' + (relationshipMotion ? 'on' : 'off') + '; focus isolation: ' + (focusMode ? 'on' : 'off') + '; depth motion: ' + (parallaxDepth ? 'on' : 'off') + '; evidence frames: ' + visualEvidence.length + '; split comparison: ' + (splitComparison && referenceEvidence ? 'on' : 'off') + '; tactile feedback: ' + (d.tactileFeedback !== false ? 'on' : 'off') + '\n';
                  report += 'Specimen material model: ' + activeMaterialProfile.label + '\n';
                  report += 'Specimen variation: ' + variationSeed + '\n';
                  report += 'Anatomical view: ' + anatomicalView + '; cross-section: ' + (crossSectionMode ? 'on' : 'off') + '; condition: ' + specimenCondition + '\n';
                  report += 'Scenario: ' + scenarioDefinition.label + '; status: ' + (scenarioStatus.complete ? 'complete' : 'in progress') + ' (' + scenarioStatus.progress + '%)\n';
                  report += 'Instructor thresholds: score ' + instructorTarget + ', max cautions ' + instructorMaxCautions + ', required structures ' + instructorRequiredStructures + '\n';
                  report += 'Curated relationship overlay: ' + (relationshipMode ? 'on' : 'off') + '; directly visible structures: ' + visibleOrgansInView.length + '/' + organs.length + '; rendering quality: ' + renderQuality + '\n';
                  if (d.selectedOrgan && selectedRelationships.length) report += 'Selected structure relationships: ' + selectedRelationships.map(function (item) { return item.type + ': ' + item.relation + ' ' + item.organ.name; }).join('; ') + '\n';
                  spec.layers.forEach(function (layer) {
                    var examined = (spec.organs[layer.id] || []).filter(function (o) { return !!(d.exploredOrgans || {})[specimen + '|' + o.id]; });
                    if (!examined.length) return;
                    report += '\n' + layer.name + '\n';
                    examined.forEach(function (o) {
                      var noteKey = specimen + '|' + o.id;
                      report += '\u2022 ' + o.name + ': ' + o.fn + '\n';
                      if ((d.organConfidence || {})[noteKey]) report += '  Confidence: ' + (d.organConfidence || {})[noteKey] + '/3\n';
                      if ((d.organNotes || {})[noteKey]) report += '  Evidence note: ' + (d.organNotes || {})[noteKey] + '\n';
                    });
                  });
                  try { var copied = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(report) : null; if (copied && copied.catch) copied.catch(function () { if (addToast) addToast('Could not copy the lab report.', 'error'); }); if (addToast) addToast('\uD83D\uDCCB Lab report copied!', 'success'); } catch (e) { if (addToast) addToast('Could not copy the lab report.', 'error'); }
                },
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-emerald-700 border border-emerald-200"
              }, '\uD83D\uDCCB Lab Report'),
              React.createElement("button", { "aria-label": "Reset progress for this specimen",
                onClick: function () {
                  updMany({ activeLayer: (spec.layers[0] || {}).id || 'skin', selectedOrgan: null, exploredOrgans: {}, revealedLayers: {}, quizScore: 0, quizTotal: 0, quizFeedback: null, completedObjectives: {}, organNotes: {}, organConfidence: {}, annotations: [], timeSpent: 0, guidedComplete: false, procedureByLayer: {}, attemptArchive: {}, compareTechniqueAttempts: false, visualEvidence: [], referenceEvidenceId: null, splitComparison: false, procedureFeedback: null, activeInstrument: 'probe', incisionDepth: 'shallow', canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, traceNervous: false, traceCirculation: false, traceDigestion: false, traceRespiration: false, traceExcretory: false, showEndocrine: false, rulerMode: false, annotateMode: false, labelMode: 'show', highContrast: false });
                  try { localStorage.removeItem('dissection_progress_' + specimen); } catch (e) {}
                  if (addToast) addToast('\u21BA Progress reset for ' + spec.name, 'info');
                },
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-red-600 border border-red-200"
              }, '\u21BA Reset specimen')
            ),

            // Study group expanded
            d.toolbarStudyOpen && React.createElement("div", { id: "diss-study-tools", className: "diss-tool-panel flex flex-wrap bg-amber-50 rounded-xl border border-amber-200 animate-[fadeIn_0.2s_ease-out]", role: "region", "aria-label": "Study tools" },

              React.createElement("button", { "aria-label": "Flashcard", "aria-pressed": !!d.flashcardMode,
                onClick: function () { if (d.flashcardMode) upd('flashcardMode', false); else { closeTimedPractical(); upd('guidedMode', false); upd('quizMode', false); upd('compareMode', false); upd('flashcardMode', true); upd('flashcardIdx', 0); upd('flashcardFlipped', false); } },
                title: 'Flashcard' + ' — Review organs with flip cards',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.flashcardMode ? 'bg-violet-600 text-white' : 'transition-colors bg-white text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-[0.97]')
              }, '\uD83C\uDCCF ' + 'Flashcard'),

              React.createElement("button", { "aria-label": "Compare", "aria-pressed": !!d.compareMode,
                onClick: function () { if (d.compareMode) upd('compareMode', false); else { closeTimedPractical(); upd('guidedMode', false); upd('quizMode', false); upd('flashcardMode', false); upd('compareMode', true); } },
                title: 'Compare' + ' — Compare organs across specimens',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.compareMode ? 'bg-cyan-700 text-white' : 'transition-colors bg-white text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-[0.97]')
              }, '\uD83D\uDD0D ' + 'Compare'),

              React.createElement("button", { "aria-label": "Toggle practical exam mode", "aria-pressed": !!d.practicalMode,
                onClick: function () {
                  if (!d.practicalMode) {
                    var previousLabelMode = d.labelMode || 'show';
                    try { if (window.__alloDissectionPracticalInterval) clearInterval(window.__alloDissectionPracticalInterval); window.__alloDissectionPracticalScore = 0; } catch (e) {}
                    updMany({ _prePracticalLabelMode: previousLabelMode, guidedMode: false, flashcardMode: false, compareMode: false, practicalMode: true, labelMode: 'hidden', quizMode: true, quizAnswerMode: 'hotspot', quizSeed: Date.now(), quizIdx: 0, quizScore: 0, quizTotal: 0, quizFeedback: null, quizExplanation: null, practicalTimer: 120 });
                    var remaining = 120;
                    var practicalTimerId = setInterval(function () {
                      remaining -= 1;
                      if (remaining <= 0) {
                        clearInterval(practicalTimerId);
                        var finalScore = 0;
                        try { finalScore = window.__alloDissectionPracticalScore || 0; window.__alloDissectionPracticalInterval = null; } catch (e) {}
                        updMany({ practicalTimer: 0, practicalMode: false, quizMode: false, labelMode: previousLabelMode });
                        if (addToast) addToast('\u23F0 Time up! Score: ' + finalScore, 'info');
                        if (typeof announceToSR === 'function') announceToSR('Practical assessment complete. Score ' + finalScore + '.');
                        return;
                      }
                      upd('practicalTimer', remaining);
                    }, 1000);
                    try { window.__alloDissectionPracticalInterval = practicalTimerId; } catch (e) {}
                  } else closeTimedPractical();
                },
                title: 'Practical — timed canvas identification assessment',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.practicalMode ? 'bg-red-600 text-white animate-pulse' : 'transition-colors bg-white text-orange-700 border border-orange-200 hover:bg-orange-100 active:scale-[0.97]')
              }, d.practicalMode ? '\u23F0 ' + Math.floor((d.practicalTimer || 0) / 60) + ':' + String((d.practicalTimer || 0) % 60).padStart(2, '0') : '\u23F1 Practical')

            ),

            // Main: Canvas + sidebar

            React.createElement("div", { id: "diss-workspace", className: "diss-workspace", "data-dissection-workspace": true, role: "tabpanel", "aria-labelledby": "diss-specimen-tab-" + specimen },

              // Canvas + peel button

              React.createElement("div", { className: "diss-primary-column" },

                React.createElement("section", { className: "diss-stage", "data-dissection-stage": true, "aria-labelledby": "diss-stage-title" },
                  React.createElement("div", { className: "diss-stage__header" },
                    React.createElement("div", null,
                      React.createElement("div", { className: "diss-stage__eyebrow" }, 'Interactive specimen'),
                      React.createElement("h3", { id: "diss-stage-title", className: "diss-stage__title" }, spec.icon + ' ' + spec.name + ' · ' + currentLayerDef.name)
                    ),
                    React.createElement("div", { className: "diss-stage__status" }, sel ? ('Selected: ' + sel.name) : (organs.length + ' structures in this layer'))
                  ),

                  React.createElement("div", { className: "diss-canvas-layout", "data-split": splitComparison && referenceEvidence ? "true" : "false" },
                    React.createElement("div", { className: "diss-canvas-frame" },
                      React.createElement("canvas", {

                      role: "img",
                      ref: canvasRef, onClick: canvasClick,
                      'data-diss-canvas': true,
                      tabIndex: 0,
                      'aria-label': d.quizMode
                        ? spec.name + ' practice assessment, ' + currentLayerDef.name + ' layer. ' + (d.quizAnswerMode === 'hotspot' ? 'Select a structure on the specimen, or switch to the keyboard-accessible multiple-choice answers.' : 'Answer with the keyboard-accessible choices in the assessment panel.')
                        : spec.name + ' virtual dissection, ' + anatomicalView + ' view, ' + specimenCondition + ' condition, ' + currentLayerDef.name + ' layer. Surface model: ' + activeMaterialProfile.label + '. Light direction: ' + lightDirection + '. Focus isolation ' + (focusMode ? 'on' : 'off') + '. Depth motion ' + (parallaxDepth ? 'on' : 'off') + '. ' + visibleOrgansInView.length + ' directly visible structures. Active instrument: ' + activeInstrument + '. ' + ((activeInstrument === 'scalpel' || activeInstrument === 'scissors') ? 'Drag on the canvas to practice a stroke, or use the equivalent technique action button.' : 'Select on the canvas or use the equivalent technique action button.') + ' Occluded structures remain available in the structure directory.',
                      'aria-describedby': 'diss-canvas-status',

                  onPointerMove: function (e) {

                    var canvas = e.currentTarget;
                    if (canvas._toolDrawing) { appendProcedureStroke(e); return; }

                    // Pan via drag when zoomed > 1

                    if (canvas._isPanning) {

                      var dx = e.clientX - canvas._panStartX;

                      var dy = e.clientY - canvas._panStartY;

                      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) canvas._wasPanning = true;

                      var newPanX = (canvas._panOrigX || 0) + dx;
                      var newPanY = (canvas._panOrigY || 0) + dy;
                      upd('canvasPanX', newPanX); upd('canvasPanY', newPanY);
                    }
                    canvasHover(e);
                  },
                  onPointerDown: function (e) {
                    var canvas = e.currentTarget;
                    if (!d.quizMode && !d.annotateMode && !d.rulerMode && (activeInstrument === 'scalpel' || activeInstrument === 'scissors')) {
                      beginProcedureStroke(e); return;
                    }
                    if ((d.canvasZoom || 1) > 1.01 && activeInstrument === 'probe' && !d.annotateMode && !d.rulerMode) {
                      canvas._isPanning = true;
                      canvas._panStartX = e.clientX;
                      canvas._panStartY = e.clientY;
                      canvas._panOrigX = d.canvasPanX || 0;
                      canvas._panOrigY = d.canvasPanY || 0;
                      canvas._wasPanning = false;
                      if (canvas.setPointerCapture && e.pointerId != null) canvas.setPointerCapture(e.pointerId);
                      canvas.style.cursor = 'grabbing';
                      e.preventDefault();
                    }
                  },

                  onPointerUp: function (e) {

                    var canvas = e.currentTarget;
                    if (finishProcedureStroke(e)) return;

                    canvas._isPanning = false;
                    if (canvas.releasePointerCapture && e.pointerId != null && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
                    canvas.style.cursor = (canvas._zoom || 1) > 1.01 ? 'grab' : 'crosshair';

                  },

                  onPointerCancel: function (e) {

                    var canvas = e.currentTarget;

                    canvas._isPanning = false;
                    canvas._toolDrawing = false;
                    canvas._toolStroke = null;
                    canvas._toolSamples = null;
                    canvas._toolResistance = null;
                    canvas._lastResistanceLevel = null;
                    canvas._toolPointer = null;
                    canvas._parallaxTargetX = 0;
                    canvas._parallaxTargetY = 0;
                    canvas._toolVector = null;
                    canvas._toolPressure = null;
                    upd('hoveredOrgan', null);

                  },
                  onPointerLeave: function (e) {
                    e.currentTarget._toolPointer = null;
                    e.currentTarget._parallaxTargetX = 0;
                    e.currentTarget._parallaxTargetY = 0;
                    e.currentTarget._toolVector = null;
                    e.currentTarget._toolPressure = null;
                    upd('hoveredOrgan', null);
                  },

                  width: 500, height: 600,

                      className: "diss-canvas w-full rounded-xl border border-slate-400 cursor-crosshair",

                      style: { aspectRatio: '5/6', background: 'var(--allo-stem-canvas, #0f172a)', touchAction: ((d.canvasZoom || 1) > 1.01 || d.annotateMode || d.rulerMode || activeInstrument === 'scalpel' || activeInstrument === 'scissors') ? 'none' : 'pan-y' }

                      })
                    ),
                    splitComparison && referenceEvidence ? React.createElement("section", { className: "diss-split-reference", "aria-label": "Selected dissection reference frame" },
                      React.createElement("div", { className: "diss-split-reference__header" },
                        React.createElement("div", null,
                          React.createElement("strong", null, 'Reference frame'),
                          React.createElement("span", null, referenceEvidence.layerName + ' · ' + referenceEvidence.view + ' view')
                        ),
                        React.createElement("button", { type: "button", "aria-label": "Close split comparison", onClick: function () { upd('splitComparison', false); } }, 'Close')
                      ),
                      React.createElement("img", { src: referenceEvidence.image, alt: spec.name + ' evidence reference, ' + referenceEvidence.layerName + ', ' + referenceEvidence.view + ' view, ' + referenceEvidence.condition + ' condition' }),
                      React.createElement("p", null, (referenceEvidence.selectedOrganName ? 'Focused on ' + referenceEvidence.selectedOrganName + ' · ' : '') + 'Technique ' + referenceEvidence.techniqueScore + '/100 · captured ' + (referenceEvidence.capturedAt ? referenceEvidence.capturedAt.slice(0, 16).replace('T', ' ') : 'earlier'))
                    ) : null
                  ),

                  // Zoom control bar
                React.createElement("div", { className: "diss-zoom-bar flex items-center justify-center gap-2 py-1 px-2 rounded-lg bg-slate-100 border border-slate-400" },
                  React.createElement("button", { "aria-label": "Zoom out canvas",
                    onClick: function () { var z = Math.max(0.5, (d.canvasZoom || 1) - 0.25); upd('canvasZoom', z); },
                    className: "transition-colors px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-400 hover:bg-slate-50 active:scale-[0.97]"
                  }, '\u2796'),
                  React.createElement("span", { className: "text-[11px] font-mono text-slate-600 min-w-[40px] text-center" }, Math.round((d.canvasZoom || 1) * 100) + '%'),
                  React.createElement("button", { "aria-label": "Zoom in canvas",
                    onClick: function () { var z = Math.min(3, (d.canvasZoom || 1) + 0.25); upd('canvasZoom', z); },
                    className: "transition-colors px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-400 hover:bg-slate-50 active:scale-[0.97]"
                  }, '\u2795'),
                  (d.canvasZoom || 1) !== 1 ? React.createElement("button", { "aria-label": "100%",
                    onClick: function () { upd('canvasZoom', 1); upd('canvasPanX', 0); upd('canvasPanY', 0); },
                    className: "transition-colors px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 active:scale-[0.97]"
                  }, '\u21BA 100%') : null
                ),

                React.createElement("details", { className: "diss-evidence", open: splitComparison && !!referenceEvidence },
                  React.createElement("summary", null, 'Evidence notebook · ' + visualEvidence.length + '/6 frames'),
                  visualEvidence.length ? React.createElement("div", { className: "diss-evidence__grid" },
                    visualEvidence.map(function (evidence) {
                      var isReferenceEvidence = !!referenceEvidence && evidence.id === referenceEvidence.id;
                      return React.createElement("article", { className: "diss-evidence__item", key: evidence.id, "data-reference": isReferenceEvidence ? "true" : "false" },
                        React.createElement("img", { src: evidence.image, alt: evidence.layerName + ' evidence thumbnail, ' + evidence.view + ' view' }),
                        React.createElement("strong", null, evidence.layerName),
                        React.createElement("span", null, evidence.view + ' · ' + evidence.condition + (evidence.selectedOrganName ? ' · ' + evidence.selectedOrganName : '')),
                        React.createElement("span", null, 'Technique ' + evidence.techniqueScore + '/100' + (evidence.capturedAt ? ' · ' + evidence.capturedAt.slice(11, 16) : '')),
                        React.createElement("div", { className: "diss-evidence__actions" },
                          React.createElement("button", { type: "button", "aria-pressed": isReferenceEvidence, onClick: function () { selectEvidenceReference(evidence.id); } }, isReferenceEvidence ? 'Reference selected' : 'Use as reference'),
                          React.createElement("button", { type: "button", onClick: function () { downloadEvidence(evidence); }, "aria-label": "Download evidence from " + evidence.layerName }, 'Download')
                        )
                      );
                    })
                  ) : React.createElement("p", null, 'Capture a frame from Lab tools to build a visual record of layers, views, and technique progress.')
                ),

                  React.createElement("p", { id: "diss-canvas-status", className: "diss-stage__live", role: "status", "aria-live": "polite" },
                    d.quizMode
                      ? 'Practice quiz active. Read the clue and choose an answer in the quiz panel; selecting a structure does not submit an answer.'
                      : sel
                        ? ('Selected ' + sel.name + ' in the ' + currentLayerDef.name + ' layer. ' + sel.fn.split('.')[0] + '.')
                        : ('Select a structure on the specimen or use the accessible structure directory. Arrow keys move between structures when the canvas is focused.')
                  ),

                  React.createElement("section", { className: "diss-procedure", "aria-labelledby": "diss-procedure-title" },
                    React.createElement("div", { className: "diss-procedure__header" },
                      React.createElement("div", null,
                        React.createElement("h4", { id: "diss-procedure-title" }, 'Technique practice \u00B7 ' + (procedureStageIdx >= 6 ? 'ready to complete' : 'step ' + (procedureStageIdx + 1) + ' of 6')),
                        React.createElement("p", null, procedureMode === 'guided' ? 'Follow the teaching corridor or use the equivalent action button.' : 'Choose instruments yourself; safety prerequisites and feedback remain active.')
                      ),
                      React.createElement("div", { className: "diss-procedure__mode", role: "group", "aria-label": "Technique support level" },
                        ['guided', 'independent'].map(function (mode) {
                          return React.createElement("button", { type: "button", key: mode, "aria-pressed": procedureMode === mode, onClick: function () { upd('procedureMode', mode); setProcedureFeedback(mode === 'guided' ? 'Guided technique shows the teaching access path.' : 'Independent technique hides the access path while preserving safety feedback.'); } }, mode === 'guided' ? 'Guided' : 'Independent');
                        })
                      )
                    ),
                    React.createElement("div", { className: "diss-instruments", role: "radiogroup", "aria-label": "Dissection instruments" },
                      PROCEDURE_INSTRUMENTS.map(function (tool) {
                        return React.createElement("button", {
                          type: "button", role: "radio", key: tool.id,
                          className: "diss-instrument", "aria-checked": activeInstrument === tool.id,
                          "aria-label": tool.label + '. ' + tool.help,
                          title: tool.help,
                          onClick: function () { updMany({ activeInstrument: tool.id, annotateMode: false, rulerMode: false }); setProcedureFeedback(tool.label + ' selected. ' + tool.help); }
                        }, tool.icon + ' ' + tool.label);
                      })
                    ),
                    activeInstrument === 'scalpel' && React.createElement("div", { className: "diss-procedure__controls", role: "group", "aria-label": "Scalpel depth" },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, 'Depth:'),
                      ['shallow', 'deep'].map(function (depth) {
                        return React.createElement("button", { type: "button", key: depth, "aria-pressed": (d.incisionDepth || 'shallow') === depth, onClick: function () { upd('incisionDepth', depth); } }, depth === 'shallow' ? 'Shallow' : 'Deep (practice warning)');
                      })
                    ),
                    React.createElement("div", { className: "diss-procedure__steps", "aria-label": procedureStageIdx + ' of 6 technique steps complete' },
                      PROCEDURE_STEPS.map(function (step, idx) {
                        return React.createElement("span", { key: step.id, className: "diss-procedure__step", "data-complete": procedureStageIdx > idx ? "true" : "false", "data-current": procedureStageIdx === idx ? "true" : "false" }, (procedureStageIdx > idx ? '\u2713 ' : '') + step.label);
                      })
                    ),
                    React.createElement("div", { className: "diss-procedure__metrics", role: "group", "aria-label": "Technique feedback metrics" },
                      [
                        { label: 'Technique score', value: techniqueScore + '/100' },
                        { label: 'Stroke precision', value: recentTechniqueMetrics ? recentTechniqueMetrics.precision + '%' : 'Not scored' },
                        { label: 'Path coverage', value: recentTechniqueMetrics ? recentTechniqueMetrics.coverage + '%' : 'Not scored' },
                        { label: 'Tool control', value: recentTechniqueMetrics ? (recentTechniqueMetrics.control == null ? recentTechniqueMetrics.smoothness : recentTechniqueMetrics.control) + '%' : 'Not scored' },
                        { label: 'Instrument angle', value: recentTechniqueMetrics && recentTechniqueMetrics.angleControl != null ? recentTechniqueMetrics.angleControl + '%' : 'Not scored' },
                        { label: 'Input', value: currentProcedure.inputType || 'Not recorded' },
                        { label: 'Cautions', value: String(currentProcedure.errors || 0) }
                      ].map(function (metric) {
                        return React.createElement("div", { className: "diss-procedure__metric", key: metric.label },
                          React.createElement("span", null, metric.label),
                          React.createElement("strong", null, metric.value)
                        );
                      })
                    ),
                    React.createElement("div", { className: "diss-advanced-row" },
                      React.createElement("div", { className: "diss-advanced-card" },
                        React.createElement("strong", null, (scenarioStatus.complete ? '\u2713 ' : '') + scenarioDefinition.label),
                        React.createElement("p", null, scenarioDefinition.prompt + ' ' + scenarioStatus.detail + ' (' + scenarioStatus.progress + '%).')
                      ),
                      React.createElement("div", { className: "diss-advanced-card" },
                        React.createElement("strong", null, anatomicalView + ' view \u00B7 ' + specimenCondition),
                        React.createElement("p", null, specimenConditionDescription() + '. ' + visibleOrgansInView.length + '/' + organs.length + ' structures directly visible in this orientation. Material model: ' + activeMaterialProfile.label + '. Light: ' + lightDirection + '; focus isolation ' + (focusMode ? 'on' : 'off') + '.')
                      ),
                      d.adaptiveGuidance !== false && React.createElement("div", { className: "diss-advanced-card" },
                        React.createElement("strong", null, 'Adaptive focus: ' + adaptiveCoach.focus),
                        React.createElement("p", null, adaptiveCoach.suggestion),
                        React.createElement("button", { type: "button", onClick: applyAdaptiveCoaching }, 'Apply coaching setup')
                      ),
                      relationshipMode && d.selectedOrgan && React.createElement("div", { className: "diss-advanced-card" },
                        React.createElement("strong", null, 'Curated anatomical relationships'),
                        React.createElement("p", null, selectedRelationships.length ? selectedRelationships.map(function (item) { return item.relation + ' ' + item.organ.name + ' [' + item.type + ']'; }).join('; ') + '.' : 'No curated connection is defined for this structure.')
                      )
                    ),
                    d.compareTechniqueAttempts && techniqueComparison && React.createElement("div", { className: "diss-advanced-card diss-attempt-comparison", role: "region", "aria-label": "Technique attempt comparison" },
                      React.createElement("strong", null, 'Previous attempt vs current attempt'),
                      React.createElement("p", null, 'Saved baseline: ' + (techniqueComparison.previous.view || anatomicalView) + ' view, ' + (techniqueComparison.previous.inputType || 'input not recorded') + '. Positive values indicate improvement.'),
                      React.createElement("div", { className: "diss-attempt-comparison__grid" },
                        [
                          { label: 'Score', previous: techniqueComparison.previous.score, current: techniqueComparison.current.score, delta: techniqueComparison.scoreDelta, unit: '' },
                          { label: 'Precision', previous: techniqueComparison.previous.precision, current: techniqueComparison.current.precision, delta: techniqueComparison.precisionDelta, unit: '%' },
                          { label: 'Coverage', previous: techniqueComparison.previous.coverage, current: techniqueComparison.current.coverage, delta: techniqueComparison.coverageDelta, unit: '%' },
                          { label: 'Control', previous: techniqueComparison.previous.control, current: techniqueComparison.current.control, delta: techniqueComparison.controlDelta, unit: '%' },
                          { label: 'Angle', previous: techniqueComparison.previous.angleControl, current: techniqueComparison.current.angleControl, delta: techniqueComparison.angleDelta, unit: '%' },
                          { label: 'Cautions', previous: techniqueComparison.previous.cautions, current: techniqueComparison.current.cautions, delta: techniqueComparison.cautionDelta, unit: '' }
                        ].map(function (metric) {
                          return React.createElement("div", { className: "diss-attempt-comparison__metric", key: metric.label },
                            React.createElement("span", null, metric.label),
                            React.createElement("strong", null, metric.previous + metric.unit + ' \u2192 ' + metric.current + metric.unit + ' (' + (metric.delta > 0 ? '+' : '') + metric.delta + metric.unit + ')')
                          );
                        })
                      )
                    ),
                    (currentProcedure.actionLog || []).length > 0 && React.createElement("div", { className: "diss-procedure__timeline", "aria-label": "Recorded technique timeline" },
                      (currentProcedure.actionLog || []).slice(-6).map(function (entry, idx) {
                        return React.createElement("span", { key: String(entry.at || idx) + entry.action }, (idx + 1) + '. ' + (entry.label || procedureActionLabel(entry.action)));
                      })
                    ),
                    (currentProcedure.cautionLog || []).length > 0 && React.createElement("div", { className: "diss-procedure__timeline", "aria-label": "Technique caution history" },
                      (currentProcedure.cautionLog || []).slice(-3).map(function (entry, idx) {
                        return React.createElement("span", { key: String(entry.at || idx) }, 'Caution: ' + entry.message);
                      })
                    ),
                    React.createElement("div", { className: "diss-procedure__controls" },
                      React.createElement("button", { type: "button", className: "diss-procedure__next", disabled: !!(d._incisionAnim && d._incisionAnim.active), onClick: performNextProcedureStep }, procedureNext.label),
                      React.createElement("button", { type: "button", onClick: showProcedureDemonstration, "aria-label": "Show a generalized safe-technique demonstration on the specimen" }, '\u25B6 Show technique'),
                      React.createElement("button", { type: "button", disabled: !((currentProcedure.actionLog || []).length || (currentProcedure.history || []).length), onClick: showProcedureReplay, "aria-label": "Replay the recorded technique attempt on the specimen" }, '\u21BB Replay attempt'),
                      React.createElement("button", { type: "button", disabled: procedureStageIdx === 0, onClick: saveTechniqueAttempt, "aria-label": "Save this technique attempt as a comparison baseline" }, '\u25A3 Save attempt'),
                      React.createElement("button", { type: "button", disabled: !attemptEntries.length, onClick: startNewTechniqueAttempt, "aria-label": "Start a new technique attempt for this layer" }, '\u21BB Start new attempt'),
                      React.createElement("button", { type: "button", disabled: !techniqueComparison, "aria-pressed": !!d.compareTechniqueAttempts, onClick: function () { upd('compareTechniqueAttempts', !d.compareTechniqueAttempts); }, "aria-label": "Compare the current technique with the previous saved attempt" }, '\u21C4 Compare attempts'),
                      React.createElement("button", { type: "button", "aria-pressed": d.adaptiveGuidance !== false, onClick: function () { upd('adaptiveGuidance', d.adaptiveGuidance === false); } }, 'Adaptive coaching ' + (d.adaptiveGuidance === false ? 'off' : 'on')),
                      React.createElement("button", { type: "button", onClick: function () { var idx = ADVANCED_SCENARIOS.findIndex(function (scenario) { return scenario.id === procedureScenario; }); var nextScenario = ADVANCED_SCENARIOS[(idx + 1) % ADVANCED_SCENARIOS.length]; upd('procedureScenario', nextScenario.id); setProcedureFeedback('Scenario selected: ' + nextScenario.label + '. ' + nextScenario.prompt); } }, '\u2691 Scenario: ' + scenarioDefinition.label),
                      React.createElement("button", { type: "button", "aria-pressed": !!d.showProcedureDebrief, onClick: function () { upd('showProcedureDebrief', !d.showProcedureDebrief); } }, '\uD83D\uDCDD Debrief'),
                      activeInstrument === 'dropper' && React.createElement("button", { type: "button", onClick: function () { performProcedureAction('dropper'); } }, '\u25C9 Apply controlled drop'),
                      React.createElement("button", { type: "button", disabled: !(currentProcedure.history || []).length, onClick: undoProcedureAction }, '\u21A9 Undo last technique action')
                    ),
                    d.showProcedureDebrief && React.createElement("div", { className: "diss-debrief", role: "region", "aria-label": "Technique debrief" },
                      React.createElement("strong", null, 'Strength: '), procedureDebrief.strength + '. ',
                      React.createElement("strong", null, 'Next improvement: '), procedureDebrief.improve
                    ),
                    React.createElement("details", { className: "diss-instructor" },
                      React.createElement("summary", null, 'Instructor thresholds'),
                      React.createElement("div", { className: "diss-procedure__controls", role: "group", "aria-label": "Instructor assessment thresholds" },
                        React.createElement("button", { type: "button", onClick: function () { upd('instructorTarget', instructorTarget >= 90 ? 70 : instructorTarget + 5); } }, 'Target score: ' + instructorTarget),
                        React.createElement("button", { type: "button", onClick: function () { upd('instructorMaxCautions', instructorMaxCautions >= 2 ? 0 : instructorMaxCautions + 1); } }, 'Max cautions: ' + instructorMaxCautions),
                        React.createElement("button", { type: "button", onClick: function () { upd('instructorRequiredStructures', instructorRequiredStructures >= 4 ? 1 : instructorRequiredStructures + 1); } }, 'Required structures: ' + instructorRequiredStructures)
                      )
                    ),
                    React.createElement("p", { className: "diss-procedure__feedback", "data-tone": (d.procedureFeedback || {}).tone || 'success', role: "status", "aria-live": "polite" },
                      (d.procedureFeedback || {}).message || 'Begin by inspecting the visible layer and planning an access path.'
                    ),
                    React.createElement("p", { className: "diss-procedure__notice" }, specimenTrayNote),
                    React.createElement("p", { className: "diss-procedure__notice" }, 'This is a generalized, non-graphic teaching simulation, not a specimen-specific physical-dissection or surgical protocol. Follow instructor-approved procedures in a physical lab.')
                  ),

                  React.createElement("div", { className: "diss-overlay-actions", "data-dissection-overlays": true, role: "group", "aria-label": "System overlays" },
                    [
                      { key: 'traceNervous', label: 'Nervous', icon: '⚡', active: !!d.traceNervous, tone: 'purple' },
                      { key: 'traceCirculation', label: 'Circulatory', icon: '♥', active: !!d.traceCirculation, tone: 'red' },
                      { key: 'traceDigestion', label: 'Digestive', icon: '◉', active: !!d.traceDigestion, tone: 'amber' },
                      { key: 'traceRespiration', label: 'Respiratory', icon: '≈', active: !!d.traceRespiration, tone: 'blue' },
                      { key: 'traceExcretory', label: 'Excretory', icon: '◆', active: !!d.traceExcretory, tone: 'lime' },
                      { key: 'showEndocrine', label: 'Endocrine', icon: '✦', active: !!d.showEndocrine, tone: 'pink' }
                    ].map(function (overlay) {
                      var activeTone = {
                        purple: 'bg-purple-700 text-white border-purple-700',
                        red: 'bg-red-700 text-white border-red-700',
                        amber: 'bg-amber-700 text-white border-amber-700',
                        blue: 'bg-blue-700 text-white border-blue-700',
                        lime: 'bg-lime-700 text-white border-lime-700',
                        pink: 'bg-pink-700 text-white border-pink-700'
                      }[overlay.tone];
                      return React.createElement("button", {
                        type: "button",
                        key: overlay.key,
                        "aria-label": "Toggle " + overlay.label + " system overlay",
                        "aria-pressed": overlay.active,
                        onClick: function () {
                          ['traceNervous', 'traceCirculation', 'traceDigestion', 'traceRespiration', 'traceExcretory', 'showEndocrine'].forEach(function (key) { upd(key, false); });
                          upd(overlay.key, !overlay.active);
                        },
                        className: "w-full rounded-xl text-xs font-bold border transition-colors " + (overlay.active ? activeTone : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')
                      }, overlay.icon + ' ' + (overlay.active ? 'Hide ' : '') + overlay.label);
                    })
                  )
                ),

              // Flashcard panel
              d.flashcardMode && React.createElement("section", {
                className: "diss-study-card bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 p-4",
                "data-dissection-flashcards": true,
                "aria-labelledby": "diss-flashcard-title"
              },
                React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3" },
                  React.createElement("h3", { id: "diss-flashcard-title", className: "text-sm font-black text-indigo-800" }, '🃏 Structure flashcards'),
                  React.createElement("span", { className: "text-xs font-bold text-indigo-500" }, ((d.flashcardIdx || 0) + 1) + ' / ' + organs.length)
                ),
                React.createElement("button", {
                  type: "button",
                  className: "diss-flashcard bg-white rounded-xl shadow-lg p-5 flex items-center justify-center hover:shadow-xl transition-shadow",
                  "aria-pressed": !!d.flashcardFlipped,
                  "aria-label": (d.flashcardFlipped ? 'Hide answer for ' : 'Reveal answer for ') + (organs[d.flashcardIdx || 0] ? organs[d.flashcardIdx || 0].name : 'this card'),
                  onClick: function () { upd('flashcardFlipped', !d.flashcardFlipped); }
                },
                  !d.flashcardFlipped
                    ? React.createElement("span", { className: "block text-center" },
                        React.createElement("span", { className: "block text-base font-black text-indigo-800" }, organs[d.flashcardIdx || 0] ? organs[d.flashcardIdx || 0].name : 'No structures found'),
                        React.createElement("span", { className: "block text-xs text-indigo-500 mt-2" }, 'Tap or press Enter to reveal its function')
                      )
                    : React.createElement("span", { className: "block text-left" },
                        React.createElement("span", { className: "block text-sm font-bold text-slate-700 leading-relaxed" }, organs[d.flashcardIdx || 0] ? organs[d.flashcardIdx || 0].fn : ''),
                        organs[d.flashcardIdx || 0] && organs[d.flashcardIdx || 0].clinical && React.createElement("span", { className: "block text-xs text-amber-700 mt-2 italic" }, organs[d.flashcardIdx || 0].clinical)
                      )
                ),
                React.createElement("div", { className: "flex items-center justify-between gap-3 mt-3" },
                  React.createElement("button", {
                    type: "button",
                    "aria-label": "Previous flashcard",
                    disabled: (d.flashcardIdx || 0) <= 0,
                    onClick: function () { upd('flashcardIdx', Math.max(0, (d.flashcardIdx || 0) - 1)); upd('flashcardFlipped', false); },
                    className: "px-4 py-2 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 disabled:opacity-40"
                  }, '◀ Previous'),
                  React.createElement("button", {
                    type: "button",
                    "aria-label": "Next flashcard",
                    disabled: (d.flashcardIdx || 0) >= organs.length - 1,
                    onClick: function () { upd('flashcardIdx', Math.min(organs.length - 1, (d.flashcardIdx || 0) + 1)); upd('flashcardFlipped', false); },
                    className: "px-4 py-2 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 disabled:opacity-40"
                  }, 'Next ▶')
                )
              ),
              // Comparison panel

              d.compareMode && sel && React.createElement("div", { className: "mt-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-3" },

                React.createElement("div", { className: "text-xs font-bold text-cyan-800 mb-2" }, '\uD83D\uDD0D ' + 'Comparing across specimens' + ': ' + sel.name + ' across specimens'),

                React.createElement("div", { className: "space-y-1.5 max-h-48 overflow-y-auto" },

                  SPEC_KEYS.map(function (sk) {

                    var sp = SPECIMENS[sk];

                    // Search for matching organ name in all layers

                    var match = null;

                    sp.layers.forEach(function (layer) {

                      if (match) return;

                      var layerOrgans = sp.organs[layer.id] || [];

                      layerOrgans.forEach(function (org) {

                        if (!match && org.name.toLowerCase() === sel.name.toLowerCase()) match = { organ: org, layer: layer };

                      });

                    });

                    // Also try partial match (e.g. "Heart" matches "3-Chamber Heart")

                    if (!match) {

                      var searchWord = sel.name.split(' ').pop().toLowerCase();

                      sp.layers.forEach(function (layer) {

                        if (match) return;

                        var layerOrgans = sp.organs[layer.id] || [];

                        layerOrgans.forEach(function (org) {

                          if (!match && org.name.toLowerCase().indexOf(searchWord) >= 0) match = { organ: org, layer: layer };

                        });

                      });

                    }

                    if (!match) return null;

                    var isCurrent = sk === specimen;

                    return React.createElement("div", {

                      key: sk,

                      className: "p-2 rounded-lg text-xs " + (isCurrent ? 'bg-cyan-100 border border-cyan-300' : 'bg-white border border-slate-400')

                    },

                      React.createElement("div", { className: "font-bold " + (isCurrent ? 'text-cyan-800' : 'text-slate-700') }, sp.icon + ' ' + sp.name.split('(')[0].trim() + ': ' + match.organ.name),

                      React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5 leading-relaxed" }, match.organ.fn.substring(0, 120) + (match.organ.fn.length > 120 ? '...' : '')),

                      match.organ.clinical && React.createElement("p", { className: "text-[11px] text-amber-600 mt-0.5 italic" }, '\uD83C\uDFEB ' + match.organ.clinical.substring(0, 80) + '...')

                    );

                  })

                ),

                !sel && React.createElement("p", { className: "text-xs text-cyan-600 italic" }, 'Click organ to compare')

              ),



              ),

              // Sidebar

              React.createElement("aside", { className: "diss-sidebar space-y-3", "data-dissection-sidebar": true, "aria-label": "Structure details and lab notes" },

                // Selected organ detail

                sel && React.createElement("section", { className: "diss-selection-card bg-white rounded-xl border p-4", "data-dissection-selection": true, role: "region", "aria-labelledby": "diss-selection-title" },

                  React.createElement("div", { className: "flex items-center justify-between mb-1" },

                    React.createElement("h4", { id: "diss-selection-title", className: "text-base font-black text-slate-800" }, sel.name),

                    React.createElement("div", { className: "flex gap-1" },

                      React.createElement("button", { type: "button", "aria-label": "Previous structure", disabled: organs.findIndex(function (o) { return o.id === sel.id; }) <= 0,

                        onClick: function () {

                          var idx = organs.findIndex(function (o) { return o.id === sel.id; });

                          if (idx > 0) chooseOrganFromDirectory(organs[idx - 1]);

                        },

                        className: "transition-colors w-10 h-10 rounded-lg bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 flex items-center justify-center active:scale-[0.97] disabled:opacity-35"

                      }, '\u25C0'),

                      React.createElement("button", { type: "button", "aria-label": "Next structure", disabled: organs.findIndex(function (o) { return o.id === sel.id; }) >= organs.length - 1,

                        onClick: function () {

                          var idx = organs.findIndex(function (o) { return o.id === sel.id; });

                          if (idx < organs.length - 1) chooseOrganFromDirectory(organs[idx + 1]);

                        },

                        className: "transition-colors w-10 h-10 rounded-lg bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 flex items-center justify-center active:scale-[0.97] disabled:opacity-35"

                      }, '▶'),
                      React.createElement("button", {
                        type: "button",
                        "aria-label": "Back to structure directory",
                        onClick: function () { upd('selectedOrgan', null); },
                        className: "transition-colors w-10 h-10 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 flex items-center justify-center active:scale-[0.97]"
                      }, '✕')
                    )
                  ),

                  React.createElement("div", { className: "diss-selection-summary" },
                    React.createElement("span", { className: "diss-selection-summary__label" }, __alloT('stem.dissection.specimen_anatomy_and_function', 'Specimen anatomy and function')),
                    React.createElement("p", null, sel.fn)
                  ),
                  // Embryological origin badge

                  (function () {

                    var devMap = {

                      heart: 'Mesoderm', liver: 'Endoderm', brain: 'Ectoderm', kidney: 'Mesoderm',

                      lung: 'Endoderm', stomach: 'Endoderm', intestine: 'Endoderm', spleen: 'Mesoderm',

                      skin: 'Ectoderm', bone: 'Mesoderm', muscle: 'Mesoderm', nerve: 'Ectoderm',

                      eye: 'Ectoderm (lens) + mesoderm', retina: 'Ectoderm', pancreas: 'Endoderm',

                      blood: 'Mesoderm', thyroid: 'Endoderm'

                    };

                    var sn = sel.name.toLowerCase(); var dev = null;

                    Object.keys(devMap).forEach(function (k) { if (sn.indexOf(k) >= 0) dev = devMap[k]; });

                    var dColors = { Ectoderm: 'bg-blue-50 text-blue-600 border-blue-200', Mesoderm: 'bg-red-50 text-red-600 border-red-200', Endoderm: 'bg-yellow-50 text-yellow-600 border-yellow-200' };

                    var dcKey = dev ? (dev.indexOf('Ecto') >= 0 ? 'Ectoderm' : dev.indexOf('Meso') >= 0 ? 'Mesoderm' : 'Endoderm') : null;

                    return dev ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mr-1 mb-1 border " + (dColors[dcKey] || 'bg-slate-50 text-slate-600 border-slate-200') }, '\uD83E\uDDEC ' + dev) : null;

                  })(),

                  // Tissue type badge

                  (function () {

                    var tissueMap = {

                      heart: 'Cardiac muscle', liver: 'Epithelial', brain: 'Nervous', kidney: 'Epithelial',

                      lung: 'Epithelial', stomach: 'Smooth muscle', intestine: 'Epithelial', spleen: 'Lymphoid',

                      bone: 'Connective', cartilage: 'Connective', skin: 'Epithelial', muscle: 'Skeletal muscle',

                      nerve: 'Nervous', tendon: 'Connective', blood: 'Connective (fluid)', pancreas: 'Glandular',

                      eye: 'Mixed', lens: 'Epithelial', retina: 'Nervous', esophagus: 'Smooth muscle'

                    };

                    var sn = sel.name.toLowerCase(); var tissue = null;

                    Object.keys(tissueMap).forEach(function (k) { if (sn.indexOf(k) >= 0) tissue = tissueMap[k]; });

                    var tColors = {

                      'Cardiac muscle': 'bg-red-100 text-red-600', 'Epithelial': 'bg-emerald-100 text-emerald-600',

                      'Nervous': 'bg-purple-100 text-purple-600', 'Smooth muscle': 'bg-rose-100 text-rose-600',

                      'Lymphoid': 'bg-amber-100 text-amber-600', 'Connective': 'bg-blue-100 text-blue-600',

                      'Skeletal muscle': 'bg-red-100 text-red-600', 'Glandular': 'bg-teal-100 text-teal-600',

                      'Mixed': 'bg-slate-100 text-slate-600', 'Connective (fluid)': 'bg-blue-100 text-blue-600'

                    };

                    return tissue ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mr-1 mb-1 " + (tColors[tissue] || 'bg-slate-100 text-slate-600') }, '\uD83E\uDDA0 ' + tissue) : null;

                  })(),

                  // Organ weight estimate

                  (function () {

                    var weightMap = { heart: '250-350g', liver: '1.4-1.5kg', brain: '1.3-1.4kg', kidney: '120-170g', lung: '0.5-0.6kg', stomach: '150g', spleen: '170g', pancreas: '80g', eye: '7.5g', thyroid: '20-25g', adrenal: '4-5g', gallbladder: '30-50ml' };

                    var w = null; var sn = sel.name.toLowerCase();

                    Object.keys(weightMap).forEach(function (k) { if (sn.indexOf(k) >= 0) w = weightMap[k]; });

                    return w ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-400 mr-1 mb-1" }, '\u2696\uFE0F ' + w + ' ' + 'Human') : null;

                  })(),

                  // System badge

                  (function () {

                    var sn = sel.name.toLowerCase();

                    var sysN = null;

                    var sysBadges = { circulatory: '\u2764\uFE0F Circulatory', digestive: '\uD83C\uDF7D\uFE0F Digestive', respiratory: '\uD83C\uDF2C\uFE0F Respiratory', nervous: '\u26A1 Nervous', skeletal: '\uD83E\uDDB4 Skeletal', muscular: '\uD83D\uDCAA Muscular', excretory: '\uD83D\uDCA7 Excretory', reproductive: '\u2665\uFE0F Reproductive' };

                    var sysCols = { circulatory: 'bg-red-50 text-red-700 border-red-200', digestive: 'bg-amber-50 text-amber-700 border-amber-200', respiratory: 'bg-blue-50 text-blue-700 border-blue-200', nervous: 'bg-purple-50 text-purple-700 border-purple-200', skeletal: 'bg-slate-50 text-slate-700 border-slate-200', muscular: 'bg-red-50 text-red-700 border-red-200', excretory: 'bg-lime-50 text-lime-700 border-lime-200', reproductive: 'bg-pink-50 text-pink-700 border-pink-200' };

                    var sysKW = { circulatory: ['heart', 'aorta', 'artery', 'vein', 'atrium', 'ventricle', 'blood', 'aortic'], digestive: ['stomach', 'liver', 'intestin', 'gizzard', 'crop', 'pancreas', 'gallbladder'], respiratory: ['lung', 'gill', 'trachea', 'swim bladder'], nervous: ['brain', 'nerve', 'spinal', 'eye', 'optic'], skeletal: ['bone', 'skull', 'vertebr', 'femur'], muscular: ['muscle', 'rectus'], excretory: ['kidney', 'nephri'], reproductive: ['gonad', 'ovary', 'testi'] };

                    Object.keys(sysKW).forEach(function (sk) { sysKW[sk].forEach(function (kw) { if (!sysN && sn.indexOf(kw) >= 0) sysN = sk; }); });

                    return sysN ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border mb-1 " + sysCols[sysN] }, sysBadges[sysN]) : null;

                  })(),



                  sel.clinical && React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-200" },

                    React.createElement("span", { className: "text-[11px] font-bold text-amber-700" }, '\uD83C\uDFE5 ' + __alloT('stem.dissection.human_clinical_connection', 'Human/clinical connection')),

                    React.createElement("p", { className: "text-[11px] text-amber-600 leading-relaxed mt-0.5" }, sel.clinical)

                  ),

                  // Position info

                  React.createElement("div", { className: "mt-2 flex gap-2 text-[11px] text-slate-600" },

                    React.createElement("span", null, '\uD83D\uDCCD x:' + Math.round(sel.x * 100) + '% y:' + Math.round(sel.y * 100) + '%'),

                    React.createElement("span", null, '\uD83C\uDFF7 ' + (sel.layer || activeLayer))

                  ),

                  // Clinical correlations

                  (function () {

                    var clinMap = {

                      heart: '\u26A0 Myocardial infarction, arrhythmia, heart murmur',

                      liver: '\u26A0 Hepatitis, cirrhosis, fatty liver disease',

                      lung: '\u26A0 Pneumonia, asthma, COPD, pulmonary embolism',

                      brain: '\u26A0 Stroke (CVA), concussion, meningitis',

                      kidney: '\u26A0 Renal calculi (stones), UTI, nephritis',

                      stomach: '\u26A0 Gastric ulcer, GERD, H. pylori infection',

                      pancreas: '\u26A0 Pancreatitis, diabetes mellitus',

                      spleen: '\u26A0 Splenomegaly, splenic rupture (trauma)',

                      gallbladder: '\u26A0 Cholelithiasis (gallstones), cholecystitis',

                      thyroid: '\u26A0 Hypothyroidism, hyperthyroidism, goiter',

                      eye: '\u26A0 Cataracts, glaucoma, retinal detachment',

                      retina: '\u26A0 Macular degeneration, diabetic retinopathy'

                    };

                    var sn = sel.name.toLowerCase(); var clin = null;

                    Object.keys(clinMap).forEach(function (k) { if (sn.indexOf(k) >= 0) clin = clinMap[k]; });

                    return clin ? React.createElement("div", { className: "text-[11px] text-amber-500 mt-1 italic border-l-2 border-amber-300 pl-2" }, clin) : null;

                  })(),

                  // Related organs info

                  (function () {

                    var relMap = {

                      heart: ['lungs', 'aorta', 'blood vessels'],

                      lungs: ['heart', 'trachea', 'diaphragm'],

                      liver: ['gallbladder', 'stomach', 'intestine'],

                      stomach: ['esophagus', 'liver', 'intestine'],

                      brain: ['spinal cord', 'nerves', 'eyes'],

                      kidneys: ['bladder', 'ureters', 'adrenals']

                    };

                    var sn = sel.name.toLowerCase();

                    var related = null;

                    Object.keys(relMap).forEach(function (k) { if (sn.indexOf(k) >= 0) related = relMap[k]; });

                    return related ? React.createElement("div", { className: "text-[11px] text-slate-600 mt-1" },

                      React.createElement("span", { className: "font-bold" }, '\uD83D\uDD17 ' + 'Related' + ': '),

                      related.join(', ')

                    ) : null;

                  })(),

                  (function () {
                    var evidenceKey = specimen + '|' + sel.id;
                    var noteValue = (d.organNotes || {})[evidenceKey] || '';
                    var confidenceValue = (d.organConfidence || {})[evidenceKey] || 0;
                    return React.createElement("div", { className: "mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3", "data-dissection-evidence": true },
                      React.createElement("label", { htmlFor: 'diss-note-' + sel.id, className: "block text-xs font-black text-blue-900" }, __alloT('stem.dissection.evidence_note', 'Evidence note')),
                      React.createElement("p", { className: "text-[11px] text-blue-700 mt-1" }, __alloT('stem.dissection.evidence_note_help', 'Record what you observed, where it is located, and how that evidence supports your identification.')),
                      React.createElement("textarea", { id: 'diss-note-' + sel.id, className: "diss-evidence-note", rows: 3, value: noteValue, placeholder: __alloT('stem.dissection.evidence_note_placeholder', 'I identified this structure because…'), onChange: function (e) { var notes = Object.assign({}, d.organNotes || {}); notes[evidenceKey] = e.target.value; upd('organNotes', notes); } }),
                      React.createElement("div", { className: "mt-2 flex flex-wrap items-center gap-2", role: "group", "aria-label": __alloT('stem.dissection.identification_confidence', 'Identification confidence') },
                        React.createElement("span", { className: "text-xs font-bold text-blue-900" }, __alloT('stem.dissection.confidence', 'Confidence') + ':'),
                        [1, 2, 3].map(function (level) {
                          return React.createElement("button", { type: "button", key: level, "aria-label": 'Confidence ' + level + ' of 3', "aria-pressed": confidenceValue === level, onClick: function () { var confidence = Object.assign({}, d.organConfidence || {}); confidence[evidenceKey] = level; upd('organConfidence', confidence); }, className: "min-w-10 rounded-lg border px-2 py-1 text-xs font-bold " + (confidenceValue === level ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-800 border-blue-300') }, String(level));
                        })
                      )
                    );
                  })(),
                  // Action buttons

                  React.createElement("div", { className: "mt-2 flex gap-1" },

                    React.createElement("button", { onClick: function () {

                        if (typeof callGemini === 'function') {

                          var _aiPrompt = 'Explain the ' + sel.name + ' in a ' + spec.name + ' for a biology student. Clearly separate specimen-specific anatomy from any human comparison. Include function, location, one observable identification clue, and cite uncertainty when species details vary.';
                          callGemini(_aiPrompt).then(function(res) {
                            if (addToast) addToast('\uD83E\uDD16 ' + sel.name + ': ' + (res || 'Response received'), 'info', 8000);
                          }).catch(function(err) {
                            if (addToast) addToast('\uD83E\uDD16 AI unavailable: ' + (err.message || err), 'error');
                          });

                        } else if (addToast) {

                          addToast('\uD83E\uDD16 AI not available. ' + sel.name + ': ' + sel.fn.split('.')[0] + '.', 'info');

                        }

                      },

                      className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600"

                    }, '\uD83E\uDD16 ' + 'AI Explain'),

                    React.createElement("button", { onClick: function () {

                        var text = sel.name + '\n' + sel.fn;

                        if (sel.clinical) text += '\n\nFun Fact: ' + sel.clinical;

                        if (navigator.clipboard) navigator.clipboard.writeText(text);

                        if (addToast) addToast('\uD83D\uDCCB ' + 'Copied' + ' ' + sel.name + ' info!', 'success');

                      },

                      className: "transition-colors px-2 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.97]"

                    }, '\uD83D\uDCCB ' + 'Copy')

                  )

                ),



                // Organ list with search

                !sel && React.createElement("section", { className: "diss-structure-list bg-white rounded-xl border p-3", "data-dissection-directory": true, "aria-labelledby": "diss-directory-title" },

                  React.createElement("h3", { id: "diss-directory-title", className: "text-sm font-black text-slate-800 mb-2" }, (spec.layers[currentLayerIdx] || {}).icon + ' ' + (spec.layers[currentLayerIdx] || {}).name + ' structures (' + organs.length + ')'),

                  React.createElement("input", {

                    type: "text",

                    placeholder: 'Search organs...',

                    "aria-label": "Search organs in this layer",

                    value: d.organSearch || '',

                    onChange: function (e) { upd('organSearch', e.target.value); },

                    className: "w-full min-h-11 px-3 py-2 rounded-lg border border-slate-400 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"

                  }),

                  React.createElement("div", { className: "space-y-1 max-h-72 overflow-y-auto" },

                    organs.filter(function (org) {

                      var search = (d.organSearch || '').toLowerCase();

                      if (!search) return true;

                      return org.name.toLowerCase().indexOf(search) >= 0 || org.fn.toLowerCase().indexOf(search) >= 0;

                    }).map(function (org) {

                      var orgSys = null;

                      var orgName = org.name.toLowerCase();

                      var sysKeys = ['circulatory', 'digestive', 'respiratory', 'nervous', 'skeletal', 'muscular', 'excretory', 'reproductive'];

                      var sysKws = { circulatory: ['heart', 'aorta', 'artery', 'vein', 'atrium', 'ventricle', 'blood', 'aortic'], digestive: ['stomach', 'liver', 'intestin', 'gizzard', 'crop', 'pancreas', 'gallbladder'], respiratory: ['lung', 'gill', 'trachea', 'swim bladder'], nervous: ['brain', 'nerve', 'spinal', 'eye', 'optic'], skeletal: ['bone', 'skull', 'vertebr', 'femur'], muscular: ['muscle', 'rectus'], excretory: ['kidney', 'nephri'], reproductive: ['gonad', 'ovary', 'testi', 'oviduct'] };

                      for (var si = 0; si < sysKeys.length; si++) {

                        var kws = sysKws[sysKeys[si]];

                        for (var ki = 0; kws && ki < kws.length; ki++) {

                          if (orgName.indexOf(kws[ki]) >= 0) { orgSys = sysKeys[si]; break; }

                        }

                        if (orgSys) break;

                      }

                      var sysColorsMap = { circulatory: '#ef4444', digestive: '#f59e0b', respiratory: '#3b82f6', nervous: '#8b5cf6', skeletal: '#94a3b8', muscular: '#dc2626', excretory: '#84cc16', reproductive: '#ec4899' };

                      var dotColor = orgSys ? sysColorsMap[orgSys] : '#94a3b8';

                      var isExplored = (d.exploredOrgans || {})[specimen + '|' + org.id];

                      return React.createElement("button", { key: org.id,

                        id: 'diss-organ-' + org.id,

                        type: "button",
                        "aria-pressed": d.selectedOrgan === org.id,
                        "aria-label": org.name + (isExplored ? ', explored' : ', not yet explored'),
                        onClick: function () { chooseOrganFromDirectory(org); },

                        className: "w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-[0.99] " + (d.selectedOrgan === org.id ? 'bg-amber-50 border border-amber-200 font-bold text-amber-800' : 'text-slate-700')

                      },

                        React.createElement("span", { style: { width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block', flexShrink: 0 } }),

                        React.createElement("span", { className: "flex-1" }, org.name),

                        isExplored && React.createElement("span", { className: "text-[11px] text-green-500" }, '\u2713')

                      );

                    })

                  )

                ),



                // Quiz card

                d.quizMode && quizQ && React.createElement("section", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4", "data-dissection-quiz": true, "aria-labelledby": "diss-quiz-title" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("h3", { id: "diss-quiz-title", className: "text-sm font-black text-amber-900" }, '\uD83E\uDDE0 ' + 'Identify'),

                    d.quizScore > 0 && React.createElement("span", { className: "text-[11px] font-bold text-green-600 ml-auto" }, '\u2B50 ' + d.quizScore + '/' + (d.quizTotal || 0))

                  ),

                  React.createElement("p", { className: "text-xs text-amber-700 mb-2" }, quizPrompt),
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-3", role: "group", "aria-label": "Answer method" },
                    React.createElement("button", { type: "button", "aria-pressed": (d.quizAnswerMode || 'choices') === 'choices', onClick: function () { upd('quizAnswerMode', 'choices'); }, className: "px-3 py-1 rounded-lg text-xs font-bold border " + ((d.quizAnswerMode || 'choices') === 'choices' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-amber-800 border-amber-300') }, 'Multiple choice'),
                    React.createElement("button", { type: "button", "aria-pressed": d.quizAnswerMode === 'hotspot', onClick: function () { upd('quizAnswerMode', 'hotspot'); }, className: "px-3 py-1 rounded-lg text-xs font-bold border " + (d.quizAnswerMode === 'hotspot' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-amber-800 border-amber-300') }, 'Select on specimen')
                  ),
                  d.quizAnswerMode === 'hotspot' && !d.quizFeedback && React.createElement("p", { className: "text-xs font-bold text-blue-700 mb-2", role: "status" }, 'Select the matching structure on the specimen. Keyboard users can choose Multiple choice.'),

                  (d.quizAnswerMode || 'choices') === 'choices' && React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },

                    quizOptions.map(function (opt) {

                      var fb = d.quizFeedback;

                      var isCorrect = fb && opt.id === quizQ.id;

                      var isChosen = fb && fb.chosen === opt.id;

                      var isWrong = isChosen && !isCorrect;

                      return React.createElement("button", { type: "button", key: opt.id, disabled: !!fb, "aria-label": opt.name + (isCorrect ? ', correct answer' : isWrong ? ', selected answer, incorrect' : ''),

                        onClick: function () { submitQuizAnswer(opt.id); },


                        className: "min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-600' : fb ? 'border-slate-200 bg-slate-50 text-slate-600' : 'transition-colors border-amber-200 bg-white text-slate-700 hover:border-amber-400')

                      }, opt.name);

                    })

                  ),

                  d.quizFeedback && React.createElement("div", {
                    className: "mt-3 p-2.5 rounded-lg border " + (d.quizFeedback.correct ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'),
                    role: "status",
                    "aria-live": "assertive"
                  }, d.quizFeedback.correct ? ('Correct — ' + quizQ.name + '.') : ('Not quite. The correct structure is ' + quizQ.name + '.')),

                  d.quizFeedback && React.createElement("button", { type: "button", "aria-label": "Next Question",

                    onClick: function () { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); upd('quizExplanation', null); },

                    className: "transition-colors w-full min-h-11 mt-2 py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 active:scale-[0.97]"

                  }, 'Next Question' + ' \u2192'),

                  d.quizExplanation && React.createElement("div", { className: "mt-2 p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "text-[11px] font-bold text-amber-600" }, '\uD83D\uDCA1 '),
                    React.createElement("span", { className: "text-[11px] text-slate-600 leading-relaxed" }, d.quizExplanation)
                  )

                ),



                // Layer + specimen info

                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },

                  React.createElement("div", { className: "text-[11px] font-bold text-slate-600 mb-1" }, 'Layer Progress'),

                  spec.layers.map(function (layer) {

                    var done = !!revealedLayers[layer.id];

                    return React.createElement("div", { key: layer.id, className: "flex items-center gap-2 py-0.5" },

                      React.createElement("span", { className: "text-[11px] " + (done ? 'line-through text-slate-600' : 'text-slate-600') }, layer.icon + ' ' + layer.name),

                      done && React.createElement("span", { className: "text-[11px] text-green-500 ml-auto" }, '\u2713')

                    );

                  }),

                  React.createElement("div", { className: "mt-2 pt-2 border-t border-slate-200" },

                    React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed mb-1" }, __alloT('stem.dissection.' + (specimen) + '_desc', spec.desc)),
                    React.createElement("p", { className: "diss-science-scope" }, __alloT('stem.dissection.comparative_model_notice', 'Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual.')),

                    React.createElement("div", { className: "grid grid-cols-2 gap-1 mt-1" },

                      spec.kingdom && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Kingdom'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.kingdom)

                      ),

                      spec.phylum && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Phylum'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.phylum)

                      ),

                      spec.habitat && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Habitat'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.habitat)

                      ),

                      spec.lifespan && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Lifespan'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.lifespan)

                      )

                    )

                  )

                ),




                // "Did You Know?" rotating trivia panel
                (function () {
                  var facts = SPECIMEN_TRIVIA[specimen] || [];
                  if (facts.length === 0) return null;
                  var factIdx = Math.floor((Date.now() / 8000)) % facts.length;
                  return React.createElement("details", { className: "diss-disclosure diss-disclosure--inset bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200" }, React.createElement("summary", { className: "text-amber-800" }, 'Biology fact'),
                    React.createElement("div", { className: "flex items-center gap-1.5 mb-1" },
                      React.createElement("span", { className: "text-sm" }, '\uD83D\uDCA1'),
                      React.createElement("span", { className: "text-[11px] font-bold text-amber-700" }, 'Did You Know?')
                    ),
                    React.createElement("p", { className: "text-[11px] text-amber-600 leading-relaxed" }, facts[factIdx]),
                    React.createElement("div", { className: "flex gap-0.5 mt-1.5 justify-center" },
                      facts.map(function (_, fi) {
                        return React.createElement("div", {
                          key: fi,
                          className: "w-1 h-1 rounded-full " + (fi === factIdx ? 'bg-amber-500' : 'bg-amber-200')
                        });
                      })
                    )
                  );
                })(),

                // Progress card

                React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3" },

                  React.createElement("div", { className: "flex items-center justify-between mb-1" },

                    React.createElement("span", { className: "text-[11px] font-bold text-blue-700" }, '\uD83D\uDCCA ' + 'Exploration'),

                    React.createElement("span", { className: "text-[11px] font-bold " + (progressPct >= 100 ? 'text-green-600' : 'text-blue-600') }, progressPct + '%')

                  ),

                  React.createElement("div", { className: "w-full h-2 bg-blue-100 rounded-full overflow-hidden" },

                    React.createElement("div", { role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": progressPct, "aria-label": "Structures examined: " + exploredCount + " of " + totalOrgansInSpecimen, className: "h-full rounded-full transition-all duration-500 " + (progressPct >= 100 ? 'bg-green-500' : 'bg-blue-500'), style: { width: progressPct + '%' } })

                  ),

                  React.createElement("div", { className: "mt-1 text-[11px] text-blue-500" }, 'Structures Examined'.replace('{count}', exploredCount).replace('{total}', totalOrgansInSpecimen)),

                  progressPct >= 100 && React.createElement("div", { className: "mt-1" },

                    React.createElement("div", { className: "text-[11px] font-bold text-green-600" }, '\u2B50 ' + 'Specimen Complete!'),

                    React.createElement("div", { className: "text-[11px] text-emerald-500 mt-0.5" },

                      '\uD83C\uDFC6 Identified ' + exploredCount + ' of ' + totalOrgansInSpecimen

                    ),

                    React.createElement("button", { "aria-label": "Generate dissection completion summary",

                      onClick: function () {

                        var cert = '\u2728 ' + 'Dissection Completion Summary' + ' \u2728\n';

                        cert += '\u2500'.repeat(40) + '\n';

                        cert += 'Specimen' + ': ' + spec.icon + ' ' + spec.name + '\n';

                        cert += 'Structures' + ': ' + totalOrgansInSpecimen + '/' + totalOrgansInSpecimen + '\n';

                        cert += 'Layers revealed: ' + revealedLayerCount + '/' + spec.layers.length + '\n';

                        cert += 'Practice score: ' + (d.quizScore || 0) + '/' + (d.quizTotal || 0) + '\n';

                        cert += 'Date' + ': ' + new Date().toLocaleDateString() + '\n';

                        cert += '\u2500'.repeat(40) + '\n';

                        cert += 'Learner-generated completion summary';

                        if (navigator.clipboard) navigator.clipboard.writeText(cert);

                        if (addToast) addToast('\uD83C\uDF93 ' + 'Certificate copied!', 'success');

                      },

                      className: "mt-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white"

                    }, '\uD83C\uDF93 ' + 'Copy Summary')

                  )

                ),



                // Specimen stats card

                React.createElement("details", { className: "diss-disclosure diss-disclosure--inset bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-400" }, React.createElement("summary", { className: "text-slate-800" }, 'Specimen stats'),

                  React.createElement("div", { className: "text-[11px] font-bold text-slate-700 mb-1" }, '\uD83D\uDCC8 ' + 'Specimen Stats'),

                  React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center" },

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-blue-600 tracking-tight" }, String(totalOrgansInSpecimen)),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Structures')

                    ),

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-emerald-600 tracking-tight" }, String(spec.layers.length)),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Layers')

                    ),

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-amber-600 tracking-tight" }, String(d.quizScore || 0)),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Quiz Score')

                    ),

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-violet-600 tracking-tight" }, (function () {

                        var ts = d.timeSpent || 0;

                        return ts < 60 ? ts + 's' : Math.floor(ts / 60) + 'm';

                      })()),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Time')

                    )

                  )

                ),

                // Learning Objectives

                React.createElement("details", { className: "diss-disclosure bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200" },

                  React.createElement("summary", { className: "text-emerald-800" }, 'Learning objectives'),
                  React.createElement("div", { className: "diss-disclosure__body space-y-1" },

                    (spec.objectives || [

                      'Identify major organs and their functions',

                      'Compare organ systems across body layers',

                      'Trace the digestive pathway from ingestion to excretion',

                      'Trace the respiratory pathway and gas exchange',

                      'Locate and name all structures in each layer',

                      'Explain how structure relates to function',

                      'Compare homologous organs across specimens'

                    ]).map(function (obj, oi) {

                      var isComplete = (d.completedObjectives || {})[oi];

                      return React.createElement("button", {
                        type: "button",
                        key: oi,
                        "aria-pressed": !!isComplete,

                        onClick: function () {

                          var co = Object.assign({}, d.completedObjectives || {});

                          co[oi] = !co[oi];

                          upd('completedObjectives', co);

                        },

                        className: "w-full min-h-10 transition-colors flex items-start gap-2 text-left text-xs cursor-pointer hover:bg-emerald-100 rounded-lg px-2 py-2 active:scale-[0.99]"

                      },

                        React.createElement("span", { className: isComplete ? 'text-emerald-600' : 'text-slate-600' }, isComplete ? '\u2705' : '\u2B1C'),

                        React.createElement("span", { className: isComplete ? 'text-emerald-600 line-through' : 'text-slate-600' }, obj)

                      );

                    })

                  )

                ),

                // ══ DISSECTION INQUIRY widget (H7b'') ══
                (function() {
                  var iq = d.dissInquiry || { specimenSize: 8, layerDepth: 1, careLevel: 5, timePress: 5, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
                  function setIQ(patch) { upd('dissInquiry', Object.assign({}, iq, patch)); }
                  function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
                  // damage = (depth × timePress) / (care × specimenSize/8)
                  var damage = (iq.layerDepth * iq.timePress) / Math.max(1, iq.careLevel * (iq.specimenSize / 8));
                  var insight = (iq.layerDepth * 1.5 + iq.careLevel * 0.8 - iq.timePress * 0.3) * (iq.specimenSize / 8);
                  var state = damage > 8 ? 'destroyed' : damage > 5 ? 'damaged' : damage > 3 ? 'compromised' : insight > 8 ? 'excellent' : insight > 4 ? 'good' : 'surface';
                  var sm = ({
                    destroyed: { label: 'Specimen destroyed', color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: 'Damage exceeds tolerance. Anatomy obscured by cuts. Restart with smaller specimen or more care.' },
                    damaged: { label: 'Significant damage', color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: 'Specimen still usable but key relationships obscured. Common with rushed work on small specimens.' },
                    compromised: { label: 'Compromised', color: '#facc15', bg: '#2a2410', border: '#eab308', desc: 'Visible cut errors but most anatomy intact. Workable for learning if not for documentation.' },
                    surface: { label: 'Surface only', color: '#94a3b8', bg: '#1e293b', border: '#475569', desc: 'Low effort, low risk, low reward. Good for external anatomy lessons only.' },
                    good: { label: 'Good progress', color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: 'Effective dissection — clean cuts, visible structures, moderate insight.' },
                    excellent: { label: 'Excellent dissection', color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: 'Patient, deep, careful work on a workable-sized specimen. Anatomy maximally exposed.' }
                  })[state];
                  return React.createElement("details", { className: "diss-disclosure diss-disclosure--inset rounded-xl", style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } }, React.createElement("summary", { style: { color: sm.color } }, 'Advanced inquiry simulator'),
                    React.createElement("h4", { className: "text-xs font-black uppercase tracking-wider mb-1", style: { color: sm.color } }, '🔬 Dissection Inquiry — Predict the Outcome'),
                    React.createElement("p", { className: "text-[10px] opacity-85 mb-2 leading-snug" }, 'Set specimen size, dissection depth, care level, and time pressure. Predict the outcome quality before reading it. No score, no reveal.'),
                    React.createElement("div", { className: "inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2", style: { background: sm.color, color: '#000' } }, sm.label),
                    React.createElement("p", { className: "text-[10px] opacity-80 mb-2" }, sm.desc),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                      [
                        { label: 'Damage index', val: damage.toFixed(1) },
                        { label: 'Insight score', val: insight.toFixed(1) }
                      ].map(function(m) {
                        return React.createElement("div", { key: m.label, className: "p-1 rounded text-center", style: { background: '#0a0a1a', border: '1px solid ' + sm.border } },
                          React.createElement("div", { className: "text-[10px] opacity-60" }, m.label),
                          React.createElement("div", { className: "text-[11px] font-bold font-mono", style: { color: sm.color } }, m.val)
                        );
                      })
                    ),
                    React.createElement("svg", { width: '100%', height: 100, viewBox: '0 0 320 100', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
                      React.createElement("line", { x1: 30, y1: 80, x2: 310, y2: 80, stroke: '#1e293b' }),
                      React.createElement("rect", { x: 50, y: 80 - Math.max(0, Math.min(60, damage * 6)), width: 60, height: Math.max(0, Math.min(60, damage * 6)), fill: '#f87171', opacity: 0.85 }),
                      React.createElement("text", { x: 80, y: 95, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'damage'),
                      React.createElement("rect", { x: 200, y: 80 - Math.max(0, Math.min(60, insight * 5)), width: 60, height: Math.max(0, Math.min(60, insight * 5)), fill: '#4ade80', opacity: 0.85 }),
                      React.createElement("text", { x: 230, y: 95, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'insight'),
                      React.createElement("text", { x: 8, y: 14, fill: '#475569', fontSize: 8 }, 'high'),
                      React.createElement("text", { x: 8, y: 78, fill: '#475569', fontSize: 8 }, 'low')
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                      React.createElement("label", { className: "text-[10px]" },
                        React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, 'Specimen size (cm)'), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.specimenSize)),
                        React.createElement("input", { type: 'range', min: 2, max: 30, step: 1, value: iq.specimenSize, onChange: function(e) { setKey('specimenSize', parseInt(e.target.value, 10)); }, className: "w-full" })
                      ),
                      React.createElement("label", { className: "text-[10px]" },
                        React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, 'Dissection depth (1-5)'), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.layerDepth)),
                        React.createElement("input", { type: 'range', min: 1, max: 5, step: 1, value: iq.layerDepth, onChange: function(e) { setKey('layerDepth', parseInt(e.target.value, 10)); }, className: "w-full" })
                      ),
                      React.createElement("label", { className: "text-[10px]" },
                        React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, 'Care level (1-10)'), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.careLevel)),
                        React.createElement("input", { type: 'range', min: 1, max: 10, step: 1, value: iq.careLevel, onChange: function(e) { setKey('careLevel', parseInt(e.target.value, 10)); }, className: "w-full" })
                      ),
                      React.createElement("label", { className: "text-[10px]" },
                        React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, 'Time pressure (1-10)'), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.timePress)),
                        React.createElement("input", { type: 'range', min: 1, max: 10, step: 1, value: iq.timePress, onChange: function(e) { setKey('timePress', parseInt(e.target.value, 10)); }, className: "w-full" })
                      )
                    ),
                    React.createElement("div", { className: "flex gap-2 mb-2" },
                      React.createElement("button", { onClick: function() {
                        var t = new Date().toISOString().slice(11, 19);
                        setIQ({ log: iq.log.concat([{ t: t, sz: iq.specimenSize, dp: iq.layerDepth, c: iq.careLevel, tp: iq.timePress, dmg: damage.toFixed(1), ins: insight.toFixed(1), state: sm.label }]) });
                      }, className: "flex-1 px-2 py-1 rounded text-[10px] font-bold", style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, '📋 Log this approach'),
                      React.createElement("button", { onClick: function() { setIQ({ specimenSize: 8, layerDepth: 1, careLevel: 5, timePress: 5 }); }, className: "px-2 py-1 rounded text-[10px]", style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, 'Reset')
                    ),
                    iq.log.length > 0 && React.createElement("div", { className: "p-1.5 rounded text-[10px] font-mono mb-2", style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                      iq.log.slice(-5).map(function(e, i) { return React.createElement("div", { key: i }, e.t + '  ' + e.state + ' · sz' + e.sz + ' dp' + e.dp + ' care' + e.c + ' tp' + e.tp + ' → dmg ' + e.dmg + ' ins ' + e.ins); })
                    ),
                    React.createElement("label", { className: "block text-[10px] font-bold opacity-85 mb-1" }, 'Your hypothesis (which slider is most overweighted by novice dissectors? Why?)'),
                    React.createElement("textarea", { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: 'e.g., novices push depth too fast on small specimens, destroying anatomy before identifying it...', className: "w-full p-1.5 rounded text-[10px] mb-2", style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                    !iq.stuckRevealed && React.createElement("button", { onClick: function() { setIQ({ stuckRevealed: true }); }, className: "px-2 py-1 rounded text-[10px] font-bold mb-2", style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, "🤔 I'm stuck — show open questions"),
                    iq.stuckRevealed && React.createElement("div", { className: "p-2 rounded text-[10px] mb-2", style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                      React.createElement("div", { className: "font-bold mb-1", style: { color: sm.color } }, 'Open questions (no answer key)'),
                      React.createElement("ul", { className: "pl-4 m-0" },
                        React.createElement("li", null, 'Why does specimen SIZE matter so much? What\'s easier to dissect — earthworm or pig?'),
                        React.createElement("li", null, 'When does adding depth start REDUCING insight (because you destroy what you wanted to see)?'),
                        React.createElement("li", null, 'How does this map to the ethical case for virtual dissection — what insight do you lose?'),
                        React.createElement("li", null, 'What would happen if you went depth=5, care=10, time=1? Why is that combination contradictory?')
                      )
                    ),
                    React.createElement("label", { className: "flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1" },
                      React.createElement("input", { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                      React.createElement("span", null, 'I can explain why this combination of size, depth, care, and time pressure yields this outcome.')
                    ),
                    iq.understood && React.createElement("textarea", { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: 'Explain in your own words...', className: "w-full p-1.5 rounded text-[10px] mb-1", style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                    React.createElement("p", { className: "m-0 text-[10px] italic opacity-60" }, 'Inquiry widget — no score, no reveal, no answer dump. Damage/insight indices are pedagogical heuristics, not lab-grade rubrics. Real dissection outcomes depend on preservation quality, instrument sharpness, and specific anatomy.')
                  );
                })(),

                // Glossary panel

                React.createElement("details", { className: "diss-disclosure bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200" },

                  React.createElement("summary", { className: "text-violet-800" }, 'Key terms'),
                  React.createElement("div", { className: "diss-disclosure__body space-y-1 max-h-48 overflow-y-auto" },

                    [

                      { term: 'Dorsal', def: 'Back/upper surface of the organism' },

                      { term: 'Ventral', def: 'Belly/lower surface of the organism' },

                      { term: 'Anterior', def: 'Front/head end of the organism' },

                      { term: 'Posterior', def: 'Rear/tail end of the organism' },

                      { term: 'Lateral', def: 'Side of the organism' },

                      { term: 'Medial', def: 'Toward the midline of the organism' },

                      { term: 'Proximal', def: 'Closer to the point of attachment' },

                      { term: 'Distal', def: 'Further from the point of attachment' },

                      { term: 'Sagittal', def: 'Plane dividing body into left/right' },

                      { term: 'Transverse', def: 'Plane dividing body into top/bottom' },

                      { term: 'Homologous', def: 'Structures with shared evolutionary origin' },

                      { term: 'Analogous', def: 'Similar function but different origin' }

                    ].map(function (g) {

                      return React.createElement("div", { key: g.term, className: "text-[11px]" },

                        React.createElement("span", { className: "font-bold text-violet-700" }, g.term + ': '),

                        React.createElement("span", { className: "text-slate-600" }, g.def)

                      );

                    })

                  )

                )

              )

            )

          );
      })();
    }
  });
