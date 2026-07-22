// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// Brain Atlas visual shell: scoped so the lab can be refined without touching shared chrome.
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-brainatlas-refine-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-brainatlas-refine-css';
  st.textContent = [
    '.brainatlas-tool-shell{--ba-purple:#7c3aed;--ba-sky:#0ea5e9;--ba-teal:#0f766e;--ba-amber:#d97706;--ba-rose:#e11d48;--ba-surface:var(--allo-stem-canvas,#ffffff);--ba-panel:var(--allo-stem-panel,#f8fafc);--ba-subpanel:var(--allo-stem-deeper,#e2e8f0);--ba-text:var(--allo-stem-text,#0f172a);--ba-muted:var(--allo-stem-text-soft,#475569);--ba-border:var(--allo-stem-border,#cbd5e1);--ba-button:var(--allo-stem-button-bg,#f1f5f9);--ba-button-text:var(--allo-stem-button-text,#0f172a);--ba-button-border:var(--allo-stem-button-border,#cbd5e1);color:var(--ba-text);width:100%;max-width:1440px!important;}',
    '.brainatlas-topbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:13px;border:1px solid var(--ba-border);border-radius:14px;background:linear-gradient(110deg,rgba(124,58,237,.08),rgba(14,165,233,.06)),var(--ba-surface);padding:11px 13px;margin-bottom:12px;box-shadow:0 10px 26px rgba(15,23,42,.06);}',
    '.brainatlas-topbar-back{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid var(--ba-button-border);border-radius:10px;background:var(--ba-button);color:var(--ba-button-text);}',
    '.brainatlas-topbar-back:hover{border-color:var(--ba-purple);}',
    '.brainatlas-topbar-copy{min-width:0;}',
    '.brainatlas-topbar-eyebrow{margin:0 0 2px;color:var(--ba-purple);font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.08em;}',
    '.brainatlas-topbar-title{margin:0;color:var(--ba-text);font-size:17px;line-height:1.2;font-weight:950;}',
    '.brainatlas-topbar-subtitle{margin:3px 0 0;color:var(--ba-muted);font-size:10px;line-height:1.4;overflow-wrap:anywhere;}',
    '.brainatlas-topbar-jump{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;border:1px solid var(--ba-purple);border-radius:10px;background:var(--ba-purple);color:#fff;padding:7px 11px;font-size:10px;font-weight:950;white-space:nowrap;box-shadow:0 8px 18px rgba(124,58,237,.20);}',
    '.brainatlas-topbar-jump:hover{filter:brightness(1.05);}',
    '.brainatlas-topbar-jump:focus-visible{outline:3px solid var(--ba-sky);outline-offset:2px;}',
    '.brainatlas-mission{position:relative;overflow:hidden;border:1px solid var(--ba-border);border-radius:16px;background:linear-gradient(135deg,var(--ba-surface) 0%,var(--ba-panel) 52%,var(--ba-subpanel) 100%);box-shadow:0 16px 36px rgba(15,23,42,.08);margin-bottom:12px;}',
    '.brainatlas-mission:before{content:"";position:absolute;inset:0 0 auto 0;height:5px;background:linear-gradient(90deg,var(--ba-teal),var(--ba-sky),var(--ba-purple),var(--ba-amber));}',
    '.brainatlas-mission-inner{position:relative;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.8fr);gap:14px;padding:18px;}',
    '.brainatlas-mission-kicker{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0;color:var(--ba-teal);margin:0 0 4px;}',
    '.brainatlas-mission-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}',
    '.brainatlas-mission-title{font-size:22px;line-height:1.12;font-weight:900;margin:0;color:var(--ba-text);}',
    '.brainatlas-overview-toggle{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;flex:0 0 auto;border:1px solid var(--ba-button-border);border-radius:9px;background:var(--ba-button);color:var(--ba-button-text);padding:6px 9px;font-size:9px;font-weight:950;white-space:nowrap;}',
    '.brainatlas-overview-toggle:hover{border-color:var(--ba-purple);}',
    '.brainatlas-overview-toggle:focus-visible{outline:3px solid var(--ba-sky);outline-offset:2px;}',
    '.brainatlas-mission-copy{font-size:12px;line-height:1.55;color:var(--ba-muted);margin:8px 0 12px;max-width:68ch;}',
    '.brainatlas-action-row{display:flex;flex-wrap:wrap;gap:8px;}',
    '.brainatlas-action-row button{border-radius:8px;min-height:34px;}',
    '.brainatlas-route-library{margin-top:13px;padding-top:11px;border-top:1px solid var(--ba-border);min-width:0;}',
    '.brainatlas-route-library-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:8px;}',
    '.brainatlas-route-library-copy{min-width:0;}',
    '.brainatlas-route-eyebrow{margin:0 0 2px;color:var(--ba-sky);font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;}',
    '.brainatlas-route-library-title{margin:0;color:var(--ba-text);font-size:12px;line-height:1.25;font-weight:950;}',
    '.brainatlas-route-library-note{margin:3px 0 0;color:var(--ba-muted);font-size:9px;line-height:1.35;}',
    '.brainatlas-route-count{display:inline-flex;align-items:center;min-height:26px;flex:0 0 auto;border:1px solid var(--ba-border);border-radius:999px;background:var(--ba-surface);color:var(--ba-muted);padding:4px 8px;font-size:9px;font-weight:900;white-space:nowrap;}',
    '.brainatlas-route-grid{display:flex;gap:9px;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:thin;padding:2px 2px 9px;margin:0;}',
    '.brainatlas-route-card{display:flex;flex:0 0 218px;flex-direction:column;align-items:flex-start;min-height:118px;scroll-snap-align:start;text-align:left;border:1px solid var(--ba-border);border-radius:12px;background:var(--ba-surface);color:var(--ba-text);padding:11px;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
    '.brainatlas-route-card:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(15,23,42,.08);}',
    '.brainatlas-route-card:focus-visible{outline:3px solid var(--ba-sky);outline-offset:2px;}',
    '.brainatlas-route-card[aria-pressed="true"]{box-shadow:0 0 0 2px rgba(14,165,233,.24),0 12px 26px rgba(14,165,233,.12);}',
    '.brainatlas-route-badge{display:inline-flex;align-items:center;border-radius:999px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0;padding:3px 7px;margin-bottom:7px;}',
    '.brainatlas-route-title{font-size:12px;font-weight:900;color:var(--ba-text);margin:0;}',
    '.brainatlas-route-copy{flex:1;font-size:10px;line-height:1.4;color:var(--ba-muted);margin:4px 0 8px;overflow-wrap:anywhere;}',
    '.brainatlas-route-open{display:inline-flex;align-items:center;gap:4px;color:var(--ba-purple);font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.04em;}',
    '.brainatlas-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}',
    '.brainatlas-metric{border:1px solid var(--ba-border);border-radius:8px;background:var(--ba-surface);padding:10px;min-height:70px;}',
    '.brainatlas-metric-label{font-size:10px;font-weight:900;text-transform:uppercase;color:var(--ba-muted);margin:0 0 4px;}',
    '.brainatlas-metric-value{font-size:18px;line-height:1.1;font-weight:900;color:var(--ba-text);margin:0;}',
    '.brainatlas-metric-note{font-size:10px;line-height:1.35;color:var(--ba-muted);margin:4px 0 0;}',
    '.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-mission-copy,.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-action-row,.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-mode-groups,.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-route-library,.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-metric-grid{display:none!important;}',
    '.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-mission-inner{grid-template-columns:minmax(0,1fr);padding:14px 18px;}',
    '.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-mission-title{font-size:18px;}',
    '.brainatlas-mode-groups{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;}',
    '.brainatlas-group-button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:132px;text-align:left;border:1px solid var(--ba-button-border);border-radius:8px;background:var(--ba-button);color:var(--ba-button-text);padding:8px 10px;transition:transform .14s ease,border-color .14s ease,background .14s ease;}',
    '.brainatlas-group-button strong{font-size:11px;line-height:1.1;}',
    '.brainatlas-group-button span{font-size:9px;line-height:1.25;color:var(--ba-muted);}',
    '.brainatlas-group-button[aria-pressed="true"]{border-color:var(--ba-purple);background:var(--ba-panel);}',
    '.brainatlas-view-panel{border:1px solid var(--ba-border);border-radius:14px;background:linear-gradient(135deg,rgba(124,58,237,.07),rgba(14,165,233,.05)),var(--ba-surface);padding:12px 12px 4px;margin-bottom:12px;box-shadow:0 10px 26px rgba(15,23,42,.06);}',
    '.brainatlas-view-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:9px;}',
    '.brainatlas-view-panel-copy{min-width:0;}',
    '.brainatlas-view-eyebrow{margin:0 0 2px;color:var(--ba-purple);font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;}',
    '.brainatlas-view-panel-title{margin:0;color:var(--ba-text);font-size:13px;line-height:1.25;font-weight:950;overflow-wrap:anywhere;}',
    '.brainatlas-view-panel-note{margin:3px 0 0;color:var(--ba-muted);font-size:10px;line-height:1.4;overflow-wrap:anywhere;}',
    '.brainatlas-view-count{display:inline-flex;flex:0 0 auto;align-items:center;min-height:26px;border:1px solid var(--ba-button-border);border-radius:999px;background:var(--ba-button);color:var(--ba-button-text);padding:4px 8px;font-size:9px;font-weight:900;white-space:nowrap;}',
    '.brainatlas-view-rail{display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin;scroll-snap-type:x proximity;padding:2px 1px 9px;margin:0;}',
    '.brainatlas-view-button{display:inline-flex;flex:0 0 auto;align-items:center;min-height:38px;max-width:220px;scroll-snap-align:start;white-space:normal!important;text-align:left;line-height:1.25;border-radius:9px!important;overflow-wrap:anywhere;}',
    '.brainatlas-view-button[aria-pressed="true"]{box-shadow:0 7px 18px rgba(124,58,237,.22)!important;}',
    '.brainatlas-mode-card{border-radius:8px!important;}',
    '.brainatlas-controls{display:grid;grid-template-columns:minmax(260px,1fr) auto;align-items:end;gap:12px;border:1px solid var(--ba-border);border-radius:12px;background:var(--ba-surface);color:var(--ba-text);padding:12px 13px;box-shadow:0 10px 26px rgba(15,23,42,.06);}',
    '.brainatlas-controls-search{min-width:0;}',
    '.brainatlas-controls-label{display:block;margin:0 0 5px;color:var(--ba-text);font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.06em;}',
    '.brainatlas-search-field{display:flex;align-items:center;gap:7px;min-height:42px;border:1px solid var(--ba-button-border);border-radius:10px;background:var(--ba-panel);padding:0 7px 0 10px;transition:border-color .15s ease,box-shadow .15s ease;}',
    '.brainatlas-search-field:focus-within{border-color:var(--ba-purple);box-shadow:0 0 0 3px rgba(124,58,237,.14);}',
    '.brainatlas-search-icon{flex:0 0 auto;color:var(--ba-purple);font-size:14px;line-height:1;}',
    '.brainatlas-tool-shell .brainatlas-search-input{flex:1;min-width:0!important;border:0!important;background:transparent!important;color:var(--ba-text)!important;padding:9px 2px!important;outline:none!important;box-shadow:none!important;}',
    '.brainatlas-clear-search{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;flex:0 0 auto;border:1px solid var(--ba-button-border);border-radius:8px;background:var(--ba-button);color:var(--ba-button-text);font-size:13px;font-weight:900;}',
    '.brainatlas-clear-search:hover{border-color:var(--ba-purple);}',
    '.brainatlas-controls-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;}',
    '.brainatlas-quiz-button{min-height:42px;border-radius:9px!important;white-space:nowrap;}',
    '.brainatlas-region-count-chip{display:inline-flex;align-items:center;min-height:42px;border:1px solid var(--ba-border);border-radius:9px;background:var(--ba-panel);color:var(--ba-muted);padding:7px 10px;font-size:10px;font-weight:900;white-space:nowrap;}',
    '.brainatlas-function-match{border-radius:8px!important;}',
    '.brainatlas-main-stack{display:grid;gap:12px;}',
    '.brainatlas-canvas-shell{display:flex;flex-direction:column;isolation:isolate;min-width:0;scroll-margin-top:16px;border:1px solid var(--ba-border);border-radius:16px;background:linear-gradient(180deg,var(--ba-surface),var(--ba-panel));box-shadow:0 22px 54px rgba(15,23,42,.12);overflow:hidden;}',
    '.brainatlas-canvas-header{display:flex;flex:0 0 auto;align-items:flex-start;justify-content:space-between;gap:16px;padding:15px 18px;border-bottom:1px solid var(--ba-border);background:radial-gradient(circle at 0 0,rgba(14,165,233,.15),transparent 34%),linear-gradient(100deg,rgba(124,58,237,.08),rgba(15,118,110,.07));}',
    '.brainatlas-canvas-heading{min-width:0;}',
    '.brainatlas-canvas-eyebrow{margin:0 0 3px;color:var(--ba-purple);font-size:9px;line-height:1.2;font-weight:950;text-transform:uppercase;letter-spacing:.08em;}',
    '.brainatlas-canvas-title{font-size:15px;line-height:1.2;font-weight:950;color:var(--ba-text);margin:0;letter-spacing:-.01em;overflow-wrap:anywhere;}',
    '.brainatlas-canvas-subtitle{font-size:12px;line-height:1.5;color:var(--ba-muted);margin:4px 0 0;max-width:76ch;}',
    '.brainatlas-canvas-actions{display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;}',
    '.brainatlas-canvas-chip{flex:0 0 auto;border-radius:999px;background:var(--ba-button);color:var(--ba-button-text);border:1px solid var(--ba-button-border);font-size:10px;font-weight:900;padding:5px 8px;}',
    '.brainatlas-canvas-chip--accent{border-color:rgba(124,58,237,.35);background:rgba(124,58,237,.10);color:var(--ba-purple);}',
    '.brainatlas-zoom-controls{display:inline-flex;flex:0 0 auto;align-items:center;gap:2px;border:1px solid var(--ba-button-border);border-radius:9px;background:var(--ba-button);padding:3px;box-shadow:0 4px 12px rgba(15,23,42,.06);}',
    '.brainatlas-zoom-controls button{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:28px;border:0;border-radius:6px;background:transparent;color:var(--ba-button-text);padding:0 7px;font-size:14px;font-weight:950;line-height:1;cursor:pointer;}',
    '.brainatlas-zoom-controls button:hover:not(:disabled){background:var(--ba-panel);color:var(--ba-purple);}',
    '.brainatlas-zoom-controls button:focus-visible{outline:2px solid var(--ba-sky);outline-offset:1px;}',
    '.brainatlas-zoom-controls button:disabled{opacity:.38;cursor:not-allowed;}',
    '.brainatlas-zoom-controls .brainatlas-zoom-readout{min-width:46px;color:var(--ba-purple);font-size:9px;letter-spacing:.02em;}',
    '.brainatlas-fullscreen-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;border:1px solid var(--ba-button-border);border-radius:8px;background:var(--ba-button);color:var(--ba-button-text);padding:6px 10px;font-size:11px;font-weight:900;line-height:1;cursor:pointer;}',
    '.brainatlas-fullscreen-button:hover{border-color:var(--ba-purple);}',
    '.brainatlas-fullscreen-button:focus-visible{outline:3px solid var(--ba-sky);outline-offset:2px;}',
    '.brainatlas-fullscreen-exit-label,.brainatlas-fullscreen-shortcut{display:none;}',
    '.brainatlas-fullscreen-shortcut{align-items:center;justify-content:center;min-width:29px;height:20px;border:1px solid var(--ba-button-border);border-radius:5px;background:var(--ba-panel);padding:0 5px;color:var(--ba-muted);font-size:8px;font-weight:950;letter-spacing:.04em;}',
    '.brainatlas-fullscreen-navigator{display:none;align-items:center;gap:2px;border:1px solid var(--ba-button-border);border-radius:8px;background:var(--ba-button);padding:3px;box-shadow:0 4px 12px rgba(15,23,42,.06);}',
    '.brainatlas-fullscreen-navigator button{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:28px;border:0;border-radius:6px;background:transparent;color:var(--ba-button-text);padding:0 7px;font-size:14px;font-weight:950;line-height:1;cursor:pointer;}',
    '.brainatlas-fullscreen-navigator button:hover{background:var(--ba-panel);color:var(--ba-purple);}',
    '.brainatlas-fullscreen-navigator button:focus-visible{outline:2px solid var(--ba-sky);outline-offset:1px;}',
    '.brainatlas-fullscreen-position{display:inline-flex;align-items:center;justify-content:center;min-width:46px;height:28px;color:var(--ba-purple);font-size:9px;font-weight:950;letter-spacing:.02em;white-space:nowrap;}',
    '.brainatlas-canvas-status{display:flex;flex:0 0 auto;align-items:center;gap:10px;min-height:38px;padding:7px 18px;border-bottom:1px solid var(--ba-border);background:var(--ba-surface);color:var(--ba-muted);font-size:10px;line-height:1.35;}',
    '.brainatlas-status-dot{width:8px;height:8px;flex:0 0 auto;border-radius:999px;background:var(--ba-teal);box-shadow:0 0 0 4px rgba(15,118,110,.12);}',
    '.brainatlas-status-label{display:inline-flex;align-items:baseline;gap:4px;min-width:0;}',
    '.brainatlas-status-label strong{color:var(--ba-text);font-size:10px;}',
    '.brainatlas-status-divider{width:1px;height:16px;flex:0 0 auto;background:var(--ba-border);}',
    '.brainatlas-status-hint{margin-left:auto;text-align:right;}',
    '.brainatlas-canvas-stage{display:flex;flex:1 1 auto;min-height:0;align-items:center;justify-content:flex-start;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable both-edges;scrollbar-width:thin;scrollbar-color:var(--ba-purple) var(--ba-panel);padding:18px;background:radial-gradient(circle at 50% 14%,rgba(124,58,237,.12),transparent 46%),linear-gradient(rgba(100,116,139,.065) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.065) 1px,transparent 1px),var(--ba-panel);background-size:auto,32px 32px,32px 32px,auto;}',
    '.brainatlas-canvas-stage::-webkit-scrollbar{width:10px;height:10px;}',
    '.brainatlas-canvas-stage::-webkit-scrollbar-track{background:var(--ba-panel);}',
    '.brainatlas-canvas-stage::-webkit-scrollbar-thumb{border:2px solid var(--ba-panel);border-radius:999px;background:var(--ba-button-border);}',
    '.brainatlas-canvas-zoom-frame{display:flex;flex:0 0 auto;align-items:center;justify-content:center;margin:auto;transition:width .18s ease,max-width .18s ease;}',
    '.brainatlas-canvas-zoom-frame .brainatlas-canvas{max-width:none!important;}',
    '.brainatlas-canvas{display:block;width:100%!important;height:auto!important;max-width:1160px!important;border-radius:12px!important;border-color:rgba(124,58,237,.30)!important;box-shadow:0 18px 42px rgba(76,29,149,.14),0 0 0 1px rgba(255,255,255,.35) inset;transition:box-shadow .18s ease,border-color .18s ease;}',
    '.brainatlas-canvas-shell[data-brainatlas-has-selection="true"] .brainatlas-canvas{border-color:var(--ba-purple)!important;box-shadow:0 20px 48px rgba(76,29,149,.18),0 0 0 3px rgba(124,58,237,.12);}',
    '.brainatlas-canvas-shell:fullscreen,.brainatlas-canvas-shell:-webkit-full-screen,.brainatlas-canvas-shell:-moz-full-screen,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback{width:100vw!important;height:100vh!important;max-width:none!important;border:0!important;border-radius:0!important;background:var(--ba-surface)!important;box-shadow:none!important;overflow:hidden!important;}',
    '.brainatlas-canvas-shell.brainatlas-fullscreen-fallback{position:fixed!important;inset:0!important;z-index:99998!important;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-header,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-header,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-header,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-header{display:flex;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(100deg,var(--ba-surface),var(--ba-panel));box-shadow:0 8px 24px rgba(15,23,42,.10);}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-heading,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-heading,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-heading,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-heading{display:flex;align-items:center;min-width:0;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-eyebrow,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-eyebrow,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-eyebrow,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-eyebrow,.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-subtitle,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-subtitle,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-subtitle,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-subtitle{display:none;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-title,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-title,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-title,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-title{max-width:72vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-actions,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-actions,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-actions,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-actions{margin:0;flex-wrap:nowrap;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-stage,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-stage,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-stage,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-stage{padding:12px;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas{width:auto!important;height:100%!important;max-width:100%!important;max-height:100%!important;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-zoom-frame,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-zoom-frame,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-zoom-frame,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-zoom-frame{width:auto!important;height:100%!important;max-width:100%!important;margin:auto;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-chip,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-chip,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-chip,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-chip,.brainatlas-canvas-shell:fullscreen .brainatlas-zoom-controls,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-zoom-controls,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-zoom-controls,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-zoom-controls,.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-status,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-canvas-status,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-canvas-status,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-canvas-status,.brainatlas-canvas-shell:fullscreen .brainatlas-learning-footer,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-learning-footer,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-learning-footer,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-learning-footer{display:none;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-fullscreen-enter-label,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-fullscreen-enter-label,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-fullscreen-enter-label,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-fullscreen-enter-label{display:none;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-fullscreen-exit-label,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-fullscreen-exit-label,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-fullscreen-exit-label,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-fullscreen-exit-label{display:inline;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-fullscreen-shortcut,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-fullscreen-shortcut,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-fullscreen-shortcut,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-fullscreen-shortcut{display:inline-flex;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-fullscreen-navigator,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-fullscreen-navigator,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-fullscreen-navigator,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-fullscreen-navigator{display:inline-flex;}',
    '.brainatlas-canvas-shell:fullscreen .brainatlas-fullscreen-button,.brainatlas-canvas-shell:-webkit-full-screen .brainatlas-fullscreen-button,.brainatlas-canvas-shell:-moz-full-screen .brainatlas-fullscreen-button,.brainatlas-canvas-shell.brainatlas-fullscreen-fallback .brainatlas-fullscreen-button{border-color:rgba(124,58,237,.45);background:rgba(124,58,237,.10);color:var(--ba-purple);}',
    '.brainatlas-learning-footer{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);flex:0 0 auto;border-top:1px solid var(--ba-border);background:var(--ba-surface);}',
    '.brainatlas-canvas-summary{min-width:0;background:var(--ba-surface);padding:13px 16px;color:var(--ba-muted);font-size:11px;line-height:1.55;overflow-wrap:anywhere;}',
    '.brainatlas-canvas-summary strong{display:block;color:var(--ba-text);font-size:11px;margin-bottom:2px;}',
    '.brainatlas-teacher-prompt{min-width:0;border-left:1px solid var(--ba-border);background:linear-gradient(135deg,rgba(14,165,233,.07),rgba(15,118,110,.06));color:var(--ba-muted);padding:13px 16px;font-size:11px;line-height:1.5;overflow-wrap:anywhere;}',
    '.brainatlas-teacher-prompt strong{display:block;color:var(--ba-text);font-size:11px;text-transform:uppercase;margin-bottom:2px;}',
    '.brainatlas-nt-inquiry{border-radius:8px!important;box-shadow:0 16px 32px rgba(15,23,42,.16);}',
    '.brainatlas-region-list-card{border:1px solid var(--ba-border);border-radius:14px;background:var(--ba-surface);color:var(--ba-text);padding:14px;box-shadow:0 14px 34px rgba(15,23,42,.08);}',
    '.brainatlas-region-list-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px;}',
    '.brainatlas-region-list-title-group{min-width:0;}',
    '.brainatlas-region-list-eyebrow{margin:0 0 2px;color:var(--ba-teal);font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;}',
    '.brainatlas-region-list-title{font-size:12px;font-weight:900;color:var(--ba-text);margin:0;}',
    '.brainatlas-region-list-note{display:inline-flex;align-items:center;min-height:26px;border:1px solid var(--ba-border);border-radius:999px;background:var(--ba-panel);padding:4px 8px;font-size:9px;font-weight:900;color:var(--ba-muted);margin:0;white-space:nowrap;}',
    '.brainatlas-study-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px;}',
    '.brainatlas-study-step{border:1px solid var(--ba-border);border-radius:8px;background:var(--ba-panel);padding:7px 8px;min-height:44px;}',
    '.brainatlas-study-step strong{display:block;font-size:10px;color:var(--ba-text);}',
    '.brainatlas-study-step span{display:block;font-size:9px;line-height:1.25;color:var(--ba-muted);margin-top:2px;}',
    '.brainatlas-region-list{display:grid;gap:8px;max-height:460px;overflow:auto;padding:2px 6px 3px 2px;}',
    '.brainatlas-region-item{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;min-height:64px;overflow:visible;overflow-wrap:anywhere;}',
    '.brainatlas-region-index{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex:0 0 auto;border:1px solid var(--ba-button-border);border-radius:9px;background:var(--ba-surface);color:var(--ba-purple);font-size:10px;font-weight:950;}',
    '.brainatlas-region-item-body{min-width:0;}',
    '.brainatlas-region-item-name{font-size:12px;line-height:1.3;}',
    '.brainatlas-region-item-copy{font-size:11px;line-height:1.4;color:var(--ba-muted);margin-top:3px;white-space:normal;}',
    '.brainatlas-region-item-cue{align-self:center;color:var(--ba-purple);font-size:16px;font-weight:950;line-height:1;}',
    '.brainatlas-empty-results{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:150px;border:1px dashed var(--ba-border);border-radius:11px;background:var(--ba-panel);color:var(--ba-muted);padding:18px;text-align:center;}',
    '.brainatlas-empty-results strong{color:var(--ba-text);font-size:12px;}',
    '.brainatlas-empty-results span{max-width:48ch;font-size:10px;line-height:1.45;}',
    '.brainatlas-empty-results button{margin-top:5px;border:1px solid var(--ba-button-border);border-radius:8px;background:var(--ba-button);color:var(--ba-button-text);padding:6px 9px;font-size:10px;font-weight:900;}',
    '.brainatlas-detail-panel{border-radius:14px!important;background:var(--ba-surface)!important;color:var(--ba-text)!important;border-color:var(--ba-border)!important;box-shadow:0 18px 42px rgba(15,23,42,.10);overflow:hidden;}',
    '.brainatlas-detail-focus-header{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:14px;border:1px solid var(--ba-border);border-radius:11px;background:radial-gradient(circle at 0 0,rgba(124,58,237,.16),transparent 42%),linear-gradient(135deg,var(--ba-panel),var(--ba-surface));padding:12px 13px;}',
    '.brainatlas-detail-focus-copy{min-width:0;}',
    '.brainatlas-detail-focus-label{display:flex;align-items:center;gap:7px;margin:0 0 5px;color:var(--ba-purple);font-size:9px;line-height:1.2;font-weight:950;letter-spacing:.08em;text-transform:uppercase;}',
    '.brainatlas-detail-focus-dot{width:8px;height:8px;flex:0 0 auto;border-radius:999px;background:var(--ba-purple);box-shadow:0 0 0 4px rgba(124,58,237,.13);}',
    '.brainatlas-detail-focus-title{margin:0;color:var(--ba-text);font-size:18px;line-height:1.2;font-weight:950;letter-spacing:-.01em;overflow-wrap:anywhere;}',
    '.brainatlas-detail-context{margin:4px 0 0;color:var(--ba-muted);font-size:10px;line-height:1.35;overflow-wrap:anywhere;}',
    '.brainatlas-detail-close{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 auto;border:1px solid var(--ba-button-border);border-radius:9px;background:var(--ba-button);color:var(--ba-button-text);transition:transform .14s ease,border-color .14s ease,background .14s ease;}',
    '.brainatlas-detail-close:hover{border-color:var(--ba-purple);background:var(--ba-panel);}',
    '.brainatlas-detail-close:focus-visible{outline:3px solid var(--ba-sky);outline-offset:2px;}',
    '.brainatlas-detail-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;border:1px solid var(--ba-border);border-radius:8px;background:var(--ba-panel);padding:8px;}',
    '.brainatlas-detail-toggle{display:inline-flex;gap:4px;padding:3px;border:1px solid var(--ba-border);border-radius:8px;background:var(--ba-surface);}',
    '.brainatlas-detail-toggle button{border-radius:6px;padding:5px 8px;font-size:10px;font-weight:900;color:var(--ba-muted);}',
    '.brainatlas-detail-toggle button[aria-pressed="true"]{background:var(--ba-purple);color:#fff;}',
    '.brainatlas-detail-takeaways{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}',
    '.brainatlas-detail-takeaway{border:1px solid var(--ba-border);border-left:4px solid var(--ba-purple);background:var(--ba-panel);border-radius:9px;padding:9px 10px;min-width:0;box-shadow:0 6px 16px rgba(15,23,42,.05);overflow-wrap:anywhere;}',
    '.brainatlas-detail-takeaway strong{display:block;font-size:10px;text-transform:uppercase;color:var(--ba-text);letter-spacing:0;margin-bottom:3px;}',
    '.brainatlas-detail-takeaway span{display:block;font-size:11px;line-height:1.35;color:var(--ba-muted);}',
    '.brainatlas-plain-summary{border:1px solid var(--ba-border);border-radius:8px;background:var(--ba-panel);padding:10px 12px;}',
    '.brainatlas-plain-summary p{margin:0;color:var(--ba-muted);font-size:12px;line-height:1.5;}',
    '.brainatlas-tool-shell .bg-white{background:var(--ba-surface)!important;color:var(--ba-text)!important;}',
    '.brainatlas-tool-shell .bg-slate-50,.brainatlas-tool-shell .bg-purple-50,.brainatlas-tool-shell .bg-indigo-50,.brainatlas-tool-shell .bg-teal-50,.brainatlas-tool-shell .bg-amber-50,.brainatlas-tool-shell .bg-rose-50,.brainatlas-tool-shell .bg-sky-50,.brainatlas-tool-shell .bg-blue-50,.brainatlas-tool-shell .bg-green-50,.brainatlas-tool-shell .bg-red-50{background:var(--ba-panel)!important;}',
    '.brainatlas-tool-shell .text-slate-800,.brainatlas-tool-shell .text-slate-700{color:var(--ba-text)!important;}',
    '.brainatlas-tool-shell .text-slate-600,.brainatlas-tool-shell .text-slate-500{color:var(--ba-muted)!important;}',
    '.theme-dark .brainatlas-tool-shell .text-purple-800,.theme-dark .brainatlas-tool-shell .text-purple-700,.theme-dark .brainatlas-tool-shell .text-purple-600,.theme-dark .brainatlas-tool-shell .text-purple-500{color:#c4b5fd!important;}',
    '.theme-dark .brainatlas-tool-shell .text-blue-800,.theme-dark .brainatlas-tool-shell .text-blue-700,.theme-dark .brainatlas-tool-shell .text-blue-600,.theme-dark .brainatlas-tool-shell .text-sky-800,.theme-dark .brainatlas-tool-shell .text-sky-700,.theme-dark .brainatlas-tool-shell .text-sky-600{color:#7dd3fc!important;}',
    '.theme-dark .brainatlas-tool-shell .text-green-800,.theme-dark .brainatlas-tool-shell .text-green-700,.theme-dark .brainatlas-tool-shell .text-green-600{color:#86efac!important;}',
    '.theme-dark .brainatlas-tool-shell .text-amber-800,.theme-dark .brainatlas-tool-shell .text-amber-700,.theme-dark .brainatlas-tool-shell .text-amber-600{color:#fcd34d!important;}',
    '.theme-dark .brainatlas-tool-shell .text-red-700,.theme-dark .brainatlas-tool-shell .text-red-600,.theme-dark .brainatlas-tool-shell .text-rose-600,.theme-dark .brainatlas-tool-shell .text-rose-500{color:#fda4af!important;}',
    '.theme-contrast .brainatlas-tool-shell .text-purple-800,.theme-contrast .brainatlas-tool-shell .text-purple-700,.theme-contrast .brainatlas-tool-shell .text-purple-600,.theme-contrast .brainatlas-tool-shell .text-purple-500,.theme-contrast .brainatlas-tool-shell .text-blue-800,.theme-contrast .brainatlas-tool-shell .text-blue-700,.theme-contrast .brainatlas-tool-shell .text-blue-600,.theme-contrast .brainatlas-tool-shell .text-sky-800,.theme-contrast .brainatlas-tool-shell .text-sky-700,.theme-contrast .brainatlas-tool-shell .text-sky-600,.theme-contrast .brainatlas-tool-shell .text-green-800,.theme-contrast .brainatlas-tool-shell .text-green-700,.theme-contrast .brainatlas-tool-shell .text-green-600,.theme-contrast .brainatlas-tool-shell .text-amber-800,.theme-contrast .brainatlas-tool-shell .text-amber-700,.theme-contrast .brainatlas-tool-shell .text-amber-600,.theme-contrast .brainatlas-tool-shell .text-red-700,.theme-contrast .brainatlas-tool-shell .text-red-600,.theme-contrast .brainatlas-tool-shell .text-rose-600,.theme-contrast .brainatlas-tool-shell .text-rose-500{color:var(--ba-text)!important;}',
    '.theme-contrast .brainatlas-tool-shell .border-purple-200,.theme-contrast .brainatlas-tool-shell .border-green-200,.theme-contrast .brainatlas-tool-shell .border-sky-200,.theme-contrast .brainatlas-tool-shell .border-amber-200,.theme-contrast .brainatlas-tool-shell .border-blue-200,.theme-contrast .brainatlas-tool-shell .border-red-200{border-color:var(--ba-border)!important;}',
    '.brainatlas-tool-shell input,.brainatlas-tool-shell textarea{background:var(--ba-surface)!important;color:var(--ba-text)!important;border-color:var(--ba-border)!important;}',
    '.theme-contrast .brainatlas-tool-shell *{box-shadow:none!important;text-shadow:none!important;}',
    '.theme-contrast .brainatlas-tool-shell button:not([aria-pressed="true"]){background:var(--ba-button)!important;color:var(--ba-button-text)!important;border-color:var(--ba-button-border)!important;}',
    '.theme-contrast .brainatlas-tool-shell button[aria-pressed="true"]{background:var(--ba-button-border)!important;color:#000!important;border-color:var(--ba-text)!important;}',
    '.theme-contrast .brainatlas-detail-toggle button[aria-pressed="true"],.theme-contrast .brainatlas-group-button[aria-pressed="true"]{outline:2px solid var(--ba-button-border);outline-offset:2px;}',
    '@media (max-width:760px){.brainatlas-tool-shell{padding:0 2px;}.brainatlas-topbar{grid-template-columns:auto minmax(0,1fr);}.brainatlas-topbar-jump{grid-column:1/-1;width:100%;}.brainatlas-mission-inner{grid-template-columns:1fr;padding:14px;}.brainatlas-mission-title{font-size:19px;}.brainatlas-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.brainatlas-detail-takeaways{grid-template-columns:1fr;}.brainatlas-canvas-header{display:block;padding:13px 14px;}.brainatlas-canvas-actions{justify-content:flex-start;margin-top:10px;}.brainatlas-canvas-status{align-items:flex-start;flex-wrap:wrap;padding:8px 14px;}.brainatlas-status-hint{width:100%;margin-left:18px;text-align:left;}.brainatlas-learning-footer{grid-template-columns:1fr;}.brainatlas-teacher-prompt{border-left:0;border-top:1px solid var(--ba-border);}.brainatlas-canvas-stage{padding:8px;}.brainatlas-view-panel-head{display:block;}.brainatlas-view-count{margin-top:8px;}.brainatlas-view-rail{flex-wrap:nowrap;}.brainatlas-view-button{max-width:178px;}.brainatlas-controls{grid-template-columns:1fr;align-items:stretch;}.brainatlas-controls-actions{justify-content:space-between;}.brainatlas-route-library-head{align-items:flex-start;}.brainatlas-route-card{flex-basis:82vw;max-width:240px;}}',
    '@media (max-width:460px){.brainatlas-metric-grid{grid-template-columns:1fr;}.brainatlas-action-row button{flex:1 1 100%;}.brainatlas-controls input{min-width:100%!important;}.brainatlas-study-strip{grid-template-columns:1fr;}}'
  ].join('');
  if (document.head) document.head.appendChild(st);
})();

// stem_tool_brainatlas.js - Brain Atlas Explorer plugin
// Extracted from stem_tool_science.js
var prefersReducedMotion = (function() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
(function() {
  if (!window.StemLab || !window.StemLab.registerTool) return;

  // ═══ 🔬 brainAtlas (brainAtlas) ═══

  // ── Audio (auto-injected) ──
  var _brainAC = null;
  function getBrainAC() { if (!_brainAC) { try { _brainAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_brainAC && _brainAC.state === "suspended") { try { _brainAC.resume(); } catch(e) {} } return _brainAC; }
  function brainTone(f,d,tp,v) { var ac = getBrainAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxBrainClick() { brainTone(600, 0.03, "sine", 0.04); }
  function sfxBrainSuccess() { brainTone(523, 0.08, "sine", 0.07); setTimeout(function() { brainTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { brainTone(784, 0.1, "sine", 0.08); }, 140); }

  window.StemLab.registerTool('brainAtlas', {
    icon: "🧠",
    label: "Brain Atlas Explorer",
    desc: "Explore an interactive brain model: regions, functions, neurotransmitter synapses, EEG waves, and a labeling quiz.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'explore_3_views', label: 'Explore 3 brain views', icon: '🧠', check: function(d) { return Object.keys(d.viewsExplored || {}).length >= 3; }, progress: function(d) { return Object.keys(d.viewsExplored || {}).length + '/3 views'; } },
      { id: 'quiz_3', label: 'Answer 3 brain quiz questions', icon: '🎯', check: function(d) { return (d.quizCorrect || 0) >= 3; }, progress: function(d) { return (d.quizCorrect || 0) + '/3'; } }
    ],
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
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
      // ctx.t is a single-arg translator that returns undefined on a miss and ignores the
      // 2nd-arg English fallback. Wrap it so the fallback is honored — otherwise any key not
      // yet in ui_strings.js renders as nothing (empty buttons). See dev-tools/check_i18n_fallback.cjs.
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      var aiHintsEnabled = !!(ctx && ctx.aiHintsEnabled); // house default-OFF AI gate
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (brainAtlas) ──
      return (function() {
var d = labToolData.brainAtlas || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('brainAtlas', 'init', {
              first: 'Brain Atlas loaded. Explore brain regions, their functions, and neural pathways in an interactive 3D model.',
              repeat: 'Brain Atlas active.',
              terse: 'Brain Atlas.'
            }, { debounce: 800 });
          }

          var upd = function (k, v) { setLabToolData(function (p) { return Object.assign({}, p, { brainAtlas: Object.assign({}, p.brainAtlas, (function () {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-brainatlas')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-brainatlas';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
 var o = {}; o[k] = v; return o; })()) }); }); };



          var VIEWS = {

            lateral: {

              name: t('stem.synth_ui.lateral'), desc: t('stem.brainatlas.side_view_showing_all_four_lobes_cereb', 'Side view showing all four lobes, cerebellum, and brainstem'),

              regions: [

                { id: 'frontal', name: t('stem.synth_ui.frontal_lobe'), x: 0.28, y: 0.32, w: 0.22, fn: 'Executive function, planning, decision-making, personality, voluntary motor control (precentral gyrus), speech production (Broca\u2019s area, left hemisphere).', brodmann: 'BA 4 (primary motor), BA 6 (premotor), BA 44\u201345 (Broca\u2019s)', blood: 'Anterior cerebral artery (medial), middle cerebral artery (lateral)', conditions: 'Broca\u2019s aphasia (non-fluent speech with intact comprehension), personality changes, disinhibition, abulia. Frontal lobe tumors may present with subtle personality changes before focal signs.', damage: 'Contralateral hemiparesis, impaired judgment, personality changes, motor aphasia (dominant hemisphere).' },

                { id: 'prefrontal', name: t('stem.synth_ui.prefrontal_cortex'), x: 0.18, y: 0.35, w: 0.12, fn: 'Highest-order cognitive functions: working memory, attention, abstract reasoning, social behavior, impulse control. Dorsolateral PFC for executive control; orbitofrontal for social/emotional regulation.', brodmann: 'BA 9, 10, 11, 12, 46, 47', blood: 'Anterior cerebral artery, middle cerebral artery', conditions: 'ADHD, schizophrenia (hypofrontality), OCD, frontotemporal dementia (Pick disease). Phineas Gage case demonstrated personality changes from prefrontal damage.', damage: 'Poor planning, impulsivity, flat affect, socially inappropriate behavior, difficulty with abstract thinking.' },

                { id: 'motor_cortex', name: t('stem.synth_ui.primary_motor_cortex'), x: 0.42, y: 0.18, w: 0.08, fn: 'Precentral gyrus. Contains motor homunculus \u2014 somatotopic map of body. Upper motor neurons project via corticospinal tract to spinal cord. Controls voluntary movement contralaterally.', brodmann: 'BA 4', blood: 'Middle cerebral artery (lateral face/arm), anterior cerebral artery (medial leg)', conditions: 'Stroke: contralateral hemiparesis. Upper motor neuron signs: spasticity, hyperreflexia, Babinski sign, clonus.', damage: 'Contralateral spastic paralysis. Face/arm (MCA stroke) vs leg (ACA stroke).' },

                { id: 'parietal', name: t('stem.synth_ui.parietal_lobe'), x: 0.52, y: 0.22, w: 0.18, fn: 'Somatosensory processing (postcentral gyrus), spatial awareness, visuomotor integration, mathematical calculation. Posterior parietal cortex integrates sensory input for motor planning.', brodmann: 'BA 1,2,3 (primary somatosensory), BA 5,7 (association), BA 39 (angular gyrus), BA 40 (supramarginal gyrus)', blood: 'Middle cerebral artery, posterior cerebral artery', conditions: 'Gerstmann syndrome (dominant): agraphia, acalculia, finger agnosia, left-right confusion. Hemispatial neglect (non-dominant): patient ignores contralateral space.', damage: 'Loss of sensation, neglect syndrome, apraxia, difficulty with spatial reasoning and navigation.' },

                { id: 'temporal', name: t('stem.synth_ui.temporal_lobe'), x: 0.38, y: 0.58, w: 0.20, fn: 'Auditory processing (superior temporal gyrus), language comprehension (Wernicke\u2019s area, left), memory formation (hippocampus), emotion (amygdala), face recognition (fusiform gyrus).', brodmann: 'BA 41,42 (primary auditory), BA 22 (Wernicke\u2019s), BA 20,21,37,38 (association)', blood: 'Middle cerebral artery (lateral), posterior cerebral artery (inferior/medial)', conditions: 'Wernicke\u2019s aphasia: fluent but nonsensical speech, poor comprehension. Temporal lobe epilepsy: aura (d\u00E9j\u00E0 vu, smell), automatisms. Prosopagnosia (face blindness).', damage: 'Language comprehension deficits (dominant), memory impairment, auditory agnosia, emotional changes.' },

                { id: 'occipital', name: t('stem.synth_ui.occipital_lobe'), x: 0.78, y: 0.32, w: 0.14, fn: 'Primary visual cortex (V1) along calcarine sulcus processes raw visual input. Association areas (V2\u2013V5) process color, motion, depth, and object recognition.', brodmann: 'BA 17 (V1 primary visual), BA 18 (V2), BA 19 (V3\u2013V5)', blood: 'Posterior cerebral artery', conditions: 'Cortical blindness with intact pupillary reflex (Anton syndrome: patient denies blindness). Homonymous hemianopia from unilateral lesion. Visual agnosia.', damage: 'Contralateral homonymous hemianopia, cortical blindness (bilateral), visual hallucinations, color blindness (achromatopsia).' },

                { id: 'cerebellum', name: t('stem.synth_ui.cerebellum'), x: 0.78, y: 0.62, w: 0.14, fn: 'Motor coordination, balance, motor learning, timing. Contains ~80% of the brain\u2019s neurons (about four-fifths, ~69 billion, mostly granule cells), despite being only ~10% of brain mass. Three functional divisions: vestibulocerebellum (balance), spinocerebellum (posture), cerebrocerebellum (planning).', brodmann: 'N/A (has its own cytoarchitecture: Purkinje cells, granule cells)', blood: 'Superior cerebellar, anterior inferior cerebellar (AICA), posterior inferior cerebellar (PICA) arteries', conditions: 'Cerebellar ataxia: wide-based gait, dysmetria (finger-to-nose test), intention tremor, dysdiadochokinesia. PICA stroke \u2192 Wallenberg syndrome.', damage: 'Ipsilateral ataxia (damage affects same side, unlike cerebrum). Nystagmus, scanning speech, hypotonia.' },

                { id: 'brainstem', name: t('stem.brainatlas.brainstem', 'Brainstem'), x: 0.62, y: 0.68, w: 0.10, fn: 'Midbrain + pons + medulla oblongata. Contains cranial nerve nuclei (III\u2013XII), reticular activating system (consciousness), vital centers (cardiac, respiratory, vasomotor). All ascending/descending tracts pass through.', brodmann: 'N/A', blood: 'Basilar artery, vertebral arteries, PICA, AICA', conditions: 'Locked-in syndrome (ventral pons lesion): conscious but can only move eyes. Brainstem death = legal death criterion. Central pontine myelinolysis from rapid Na correction.', damage: 'Coma, cranial nerve palsies, respiratory failure, cardiovascular collapse. "Crossed" signs: ipsilateral CN deficit + contralateral body weakness.' },

                { id: 'brocas', name: t('stem.brainatlas.broca_s_area', 'Broca\'s Area'), x: 0.25, y: 0.48, w: 0.08, fn: 'Left inferior frontal gyrus (pars opercularis + triangularis). Speech production and language processing. Part of larger language network connecting to Wernicke\'s via arcuate fasciculus.', brodmann: 'BA 44, 45', blood: 'Middle cerebral artery (superior division)', conditions: 'Broca\'s aphasia: non-fluent speech, telegraphic output ("want... water..."), intact comprehension, patient frustrated. Often accompanied by right hemiparesis (adjacent motor cortex).', damage: 'Expressive (motor) aphasia. Patient understands language but cannot produce fluent speech.' },

                { id: 'wernickes', name: t('stem.brainatlas.wernicke_s_area', 'Wernicke\'s Area'), x: 0.55, y: 0.50, w: 0.10, fn: 'Left posterior superior temporal gyrus. Receptive language processing \u2014 comprehension of spoken and written language. Connected to Broca\'s area via arcuate fasciculus.', brodmann: 'BA 22 (posterior part)', blood: 'Middle cerebral artery (inferior division)', conditions: 'Wernicke\'s aphasia: fluent but meaningless speech (word salad/neologisms), severely impaired comprehension. Patient often unaware of deficit. Conduction aphasia if arcuate fasciculus damaged.', damage: 'Receptive (sensory) aphasia. Patient speaks fluently but output is meaningless; poor comprehension and repetition.' },

                { id: 'insular', name: t('stem.brainatlas.insular_cortex_insula', 'Insular Cortex (Insula)'), x: 0.42, y: 0.45, w: 0.10, fn: 'Hidden deep to lateral sulcus, covered by opercula. Integrates interoceptive awareness (body state), taste (gustatory cortex), pain, disgust, addiction craving (a hub in the empathy network, not its sole seat). Anterior insula: subjective emotional experience. Posterior insula: somatosensory integration.', brodmann: 'BA 13, 14 (anterior insula; BA 15-16 are non-human-primate areas with no standard human homologue)', blood: 'Middle cerebral artery (insular branches, M2 segment)', conditions: 'Insular stroke: gustatory dysfunction, autonomic dysregulation (cardiac arrhythmias), loss of interoceptive awareness. Insular involvement in addiction: damage reduces nicotine craving. Temporal lobe epilepsy often involves insula. Role in anxiety and panic disorder.', damage: 'Loss of taste, impaired interoception, autonomic instability, altered pain perception, disrupted addiction circuits.' },

                { id: 'angular_gyrus', name: t('stem.brainatlas.angular_gyrus', 'Angular Gyrus'), x: 0.68, y: 0.38, w: 0.08, fn: 'Posterior parietal cortex (inferior parietal lobule). Multimodal integration hub: reading (visual word form \u2192 language), arithmetic, spatial cognition, semantic processing, attention, a node in the theory-of-mind network. Cross-modal association area. Left angular gyrus critical for reading comprehension.', brodmann: 'BA 39', blood: 'Middle cerebral artery (angular branch) and posterior cerebral artery', conditions: 'Gerstmann syndrome (left angular gyrus lesion): agraphia, acalculia, finger agnosia, left-right disorientation. Alexia with agraphia. Angular gyrus syndrome may mimic Wernicke aphasia. Part of default mode network.', damage: 'Reading comprehension deficits, calculation errors, spatial disorientation, impaired semantic processing, anomia.' },

                { id: 'supramarginal', name: t('stem.brainatlas.supramarginal_gyrus', 'Supramarginal Gyrus'), x: 0.62, y: 0.32, w: 0.08, fn: 'Anterior inferior parietal lobule, wraps around posterior end of lateral sulcus. Phonological processing, tactile object recognition, language (repetition: connects Wernicke to Broca via arcuate fasciculus). Non-dominant: spatial awareness and attention.', brodmann: 'BA 40', blood: 'Middle cerebral artery (posterior parietal branches)', conditions: 'Conduction aphasia: impaired repetition with intact comprehension and fluency (arcuate fasciculus damage at supramarginal gyrus). Non-dominant lesion: hemispatial neglect (overlaps with parietal neglect). Ideomotor apraxia.', damage: 'Impaired repetition (conduction aphasia), phonological processing deficits, tactile agnosia, ideomotor apraxia, contralateral neglect (non-dominant).' }

              ]

            },

            medial: {

              name: t('stem.synth_ui.medial_sagittal'), desc: t('stem.synth_ui.midline_cut_revealing_deep_structures'),

              regions: [

                { id: 'corpus_callosum', name: t('stem.synth_ui.corpus_callosum'), x: 0.48, y: 0.30, w: 0.20, fn: 'Largest white matter commissure (~200 million axons). Connects left and right cerebral hemispheres. Regions: rostrum, genu, body, splenium. Enables interhemispheric communication.', brodmann: 'N/A (white matter tract)', blood: 'Anterior cerebral artery (pericallosal branches)', conditions: 'Split-brain syndrome after callosotomy: hemispheres cannot communicate. Alien hand syndrome. Agenesis of corpus callosum (developmental anomaly).', damage: 'Disconnection syndromes: inability to name objects in left visual field, left hand apraxia to verbal commands.' },

                { id: 'thalamus', name: t('stem.synth_ui.thalamus'), x: 0.52, y: 0.42, w: 0.10, fn: 'Relay station for all sensory input (except olfaction) to cortex. Specific nuclei: VPL (body sensation), VPM (face), LGN (vision), MGN (hearing). Also involved in consciousness, sleep, and memory.', brodmann: 'N/A (diencephalon)', blood: 'Posterior cerebral artery (thalamogeniculate, thalamoperforating branches)', conditions: 'Thalamic pain syndrome (Dejerine-Roussy): contralateral burning/tingling pain after thalamic stroke. Thalamic tumors cause sensory loss and altered consciousness.', damage: 'Contralateral sensory loss, pain syndromes, decreased consciousness, aphasia (dominant thalamus), neglect (non-dominant).' },

                { id: 'hypothalamus', name: t('stem.synth_ui.hypothalamus'), x: 0.42, y: 0.52, w: 0.08, fn: 'Master regulator of homeostasis. Controls: body temperature, hunger/thirst, circadian rhythm, autonomic NS, pituitary hormone release. "Four Fs": feeding, fighting, fleeing, reproduction.', brodmann: 'N/A (diencephalon)', blood: 'Circle of Willis branches, superior hypophyseal artery', conditions: 'Diabetes insipidus (ADH deficiency), SIADH (excess ADH), Kallmann syndrome (GnRH deficiency + anosmia). Craniopharyngioma: tumor compressing hypothalamus.', damage: 'Disrupted temperature regulation, sleep-wake cycle, hunger/satiety, hormonal imbalance, autonomic dysfunction.' },

                { id: 'cingulate', name: t('stem.synth_ui.cingulate_gyrus'), x: 0.42, y: 0.22, w: 0.18, fn: 'C-shaped cortex above corpus callosum. Anterior cingulate: emotion regulation, performance/conflict monitoring, pain perception. Posterior cingulate: memory retrieval, default mode network.', brodmann: 'BA 23, 24, 25, 31, 32, 33', blood: 'Anterior cerebral artery (callosomarginal branches)', conditions: 'Anterior cingulate lesions: apathy, akinetic mutism (awake but no spontaneous movement/speech). Implicated in depression, OCD, chronic pain processing.', damage: 'Emotional blunting, apathy, reduced motivation, impaired performance/conflict monitoring.' },

                { id: 'hippocampus', name: t('stem.synth_ui.hippocampus'), x: 0.58, y: 0.55, w: 0.10, fn: 'Seahorse-shaped structure in medial temporal lobe. Critical for converting short-term to long-term memory (consolidation). Spatial navigation (place cells). One of first areas affected in Alzheimer\u2019s.', brodmann: 'Archicortex (3-layered, not neocortical)', blood: 'Posterior cerebral artery (hippocampal branches)', conditions: 'Alzheimer\u2019s disease: hippocampal atrophy is earliest finding. Anterograde amnesia (HM patient: bilateral hippocampal removal). Temporal lobe epilepsy often originates here. Hippocampal sclerosis.', damage: 'Anterograde amnesia (cannot form new memories), spatial disorientation. Retrograde memory relatively preserved initially.' },

                { id: 'amygdala', name: t('stem.synth_ui.amygdala'), x: 0.38, y: 0.58, w: 0.08, fn: 'Almond-shaped nucleus in anterior medial temporal lobe. Fear conditioning, threat detection, emotional memory. Modulates hippocampal memory consolidation. Part of limbic system.', brodmann: 'N/A (subcortical)', blood: 'Anterior choroidal artery, middle cerebral artery branches', conditions: 'Kl\u00FCver-Bucy syndrome (bilateral amygdala damage): hyperorality, hypersexuality, visual agnosia, placidity. PTSD: hyperactive amygdala. Anxiety disorders.', damage: 'Impaired fear recognition, inability to detect threatening facial expressions, emotional blunting, hypersexuality (bilateral).' },

                { id: 'basal_ganglia', name: t('stem.synth_ui.basal_ganglia'), x: 0.50, y: 0.38, w: 0.10, fn: 'Caudate + putamen (=striatum) + globus pallidus. Movement modulation: direct pathway (facilitates movement) vs indirect pathway (inhibits movement). Also involved in reward, habit formation, procedural learning.', brodmann: 'N/A (subcortical nuclei)', blood: 'Middle cerebral artery (lenticulostriate arteries, "arteries of stroke")', conditions: 'Parkinson\u2019s disease (dopamine depletion in substantia nigra \u2192 striatum): resting tremor, rigidity, bradykinesia, postural instability. Huntington\u2019s disease (caudate atrophy): chorea, dementia, psychiatric symptoms.', damage: 'Hypokinesia (Parkinson\u2019s-like) or hyperkinesia (chorea, ballismus) depending on which pathway is affected.' },

                { id: 'ventricles', name: t('stem.brainatlas.ventricular_system', 'Ventricular System'), x: 0.50, y: 0.45, w: 0.10, fn: 'CSF-filled cavities: 2 lateral ventricles \u2192 interventricular foramina (Monro) \u2192 3rd ventricle \u2192 cerebral aqueduct (Sylvius) \u2192 4th ventricle. Choroid plexus produces ~500mL CSF/day. CSF cushions brain.', brodmann: 'N/A', blood: 'Choroid plexus supplied by choroidal arteries', conditions: 'Hydrocephalus: obstructive (non-communicating, e.g. aqueductal stenosis) or communicating (impaired absorption at arachnoid granulations). Normal pressure hydrocephalus: triad of dementia, gait ataxia, urinary incontinence ("wet, wacky, wobbly").', damage: 'Increased ICP from CSF obstruction \u2192 headache, nausea, papilledema, herniation if untreated.' },

                { id: 'pineal_brain', name: t('stem.brainatlas.pineal_gland', 'Pineal Gland'), x: 0.68, y: 0.38, w: 0.06, fn: 'Small endocrine gland in epithalamus, posterior to third ventricle. Produces melatonin from serotonin (darkness-regulated). Contains pinealocytes and glial cells. Calcifies with age (visible on imaging as midline marker). Outside blood-brain barrier.', brodmann: 'N/A (endocrine gland)', blood: 'Posterior choroidal arteries', conditions: 'Pinealoma/pineal germinoma: may compress cerebral aqueduct \u2192 obstructive hydrocephalus. Parinaud syndrome (dorsal midbrain syndrome): upgaze palsy, convergence-retraction nystagmus, light-near dissociation. Pineal cysts (usually incidental). Precocious puberty (pineal tumors secreting hCG).', damage: 'Disrupted circadian rhythms, obstructive hydrocephalus from aqueductal compression, Parinaud dorsal midbrain syndrome.' },

                { id: 'fornix', name: t('stem.brainatlas.fornix', 'Fornix'), x: 0.52, y: 0.34, w: 0.12, fn: 'Major white matter tract of limbic system. C-shaped bundle connecting hippocampus to mammillary bodies, septal nuclei, and hypothalamus. Carries output from hippocampal formation (subiculum). Columns of fornix pass through hypothalamus to mammillary bodies. Critical for memory circuit (Papez circuit).', brodmann: 'N/A (white matter tract)', blood: 'Branches of anterior cerebral artery and internal cerebral vein', conditions: 'Fornix damage (surgical, tumor, trauma): severe anterograde amnesia similar to hippocampal lesions. Colloid cyst of third ventricle can compress columns of fornix \u2192 acute memory loss. Forniceal involvement in MS may contribute to cognitive symptoms.', damage: 'Anterograde amnesia (inability to form new memories), disrupted spatial memory, impaired episodic memory encoding.' },

                { id: 'mammillary', name: t('stem.brainatlas.mammillary_bodies', 'Mammillary Bodies'), x: 0.45, y: 0.58, w: 0.06, fn: 'Paired nuclei on ventral surface of posterior hypothalamus. Part of Papez circuit (hippocampus \u2192 fornix \u2192 mammillary bodies \u2192 mammillothalamic tract \u2192 anterior thalamic nucleus \u2192 cingulate \u2192 hippocampus). Medial nucleus (larger): memory. Lateral nucleus: visceral reflexes.', brodmann: 'N/A (hypothalamic nuclei)', blood: 'Branches of posterior cerebral artery and posterior communicating artery', conditions: 'Wernicke encephalopathy: thiamine (B1) deficiency \u2192 mammillary body necrosis/hemorrhage + ataxia + ophthalmoplegia + confusion. If untreated \u2192 Korsakoff syndrome: permanent confabulation, anterograde/retrograde amnesia. Most common in chronic alcoholism. MRI shows mammillary body atrophy.', damage: 'Severe memory impairment (especially anterograde), confabulation (Korsakoff syndrome), disrupted spatial navigation.' },

                { id: 'septum_pell', name: t('stem.brainatlas.septum_pellucidum', 'Septum Pellucidum'), x: 0.40, y: 0.30, w: 0.06, fn: 'Thin membrane of two laminae separating the two lateral ventricles. Contains septal nuclei (part of limbic system). Septal nuclei project to hippocampus (medial septum: cholinergic/GABAergic input for theta rhythm), hypothalamus, and brainstem. Connected to nucleus accumbens (reward/motivation circuitry).', brodmann: 'N/A (septal region)', blood: 'Anterior cerebral artery branches', conditions: 'Cavum septum pellucidum (CSP): persistent fluid-filled cavity between laminae, normal variant in ~20% of adults, more common in boxers and TBI patients. Septal lesions can cause rage reactions (septal rage syndrome in animal models). CSP associated with schizophrenia in some studies.', damage: 'Septal lesion effects include emotional dysregulation, hyperemotionality, and impaired pleasure/reward processing.' }

              ]

            },

            superior: {

              name: t('stem.synth_ui.superior_top'), desc: t('stem.synth_ui.view_from_above_showing_hemispheres'),

              regions: [

                { id: 'longitudinal', name: t('stem.synth_ui.longitudinal_fissure'), x: 0.50, y: 0.50, w: 0.04, fn: 'Deep midline cleft separating left and right cerebral hemispheres. Contains the falx cerebri (dural fold) and anterior cerebral arteries. Corpus callosum visible at its depth.', brodmann: 'N/A (anatomical landmark)', blood: 'Superior sagittal sinus runs along its superior border', conditions: 'Superior sagittal sinus thrombosis: headache, seizures, papilledema. Parasagittal meningiomas may compress motor cortex for lower limbs.', damage: 'Bilateral leg weakness if parasagittal tumor/thrombosis compresses medial motor cortex.' },

                { id: 'central_sulcus', name: t('stem.synth_ui.central_sulcus_rolandic'), x: 0.50, y: 0.38, w: 0.30, fn: 'Separates frontal lobe (anterior) from parietal lobe (posterior). Precentral gyrus (motor) lies anterior; postcentral gyrus (somatosensory) lies posterior. Key surgical landmark.', brodmann: 'Border between BA 4 (anterior) and BA 3,1,2 (posterior)', blood: 'Middle cerebral artery branches', conditions: 'Central sulcus is critical surgical landmark \u2014 must be identified to avoid motor/sensory cortex damage during neurosurgery. Functional MRI used for preoperative mapping.', damage: 'Lesions anterior \u2192 motor deficit; lesions posterior \u2192 sensory deficit on contralateral body.' },

                { id: 'frontal_sup', name: t('stem.synth_ui.frontal_lobes_superior_view'), x: 0.35, y: 0.25, w: 0.15, fn: 'Anterior to central sulcus. From above: superior, middle, and inferior frontal gyri visible. Prefrontal cortex dominates anterior portion. Supplementary motor area on medial surface.', brodmann: 'BA 4, 6, 8, 9, 10, 46', blood: 'Anterior cerebral artery (medial), middle cerebral artery (lateral)', conditions: 'Frontal lobe syndrome: disinhibition, poor judgment, abulia (lack of will). Meningiomas of the olfactory groove may compress frontal lobes bilaterally.', damage: 'Executive dysfunction, personality changes, contralateral motor weakness.' },

                { id: 'parietal_sup', name: t('stem.synth_ui.parietal_lobes_superior_view'), x: 0.55, y: 0.55, w: 0.15, fn: 'Posterior to central sulcus. Superior and inferior parietal lobules visible from above. Precuneus on medial surface (part of default mode network). Interhemispheric parietal areas for spatial integration.', brodmann: 'BA 1,2,3,5,7,39,40', blood: 'Middle cerebral artery, posterior cerebral artery', conditions: 'Balint syndrome (bilateral parietal): simultanagnosia, optic ataxia, oculomotor apraxia. Astereognosis: cannot identify objects by touch despite intact sensation.', damage: 'Sensory loss, neglect (non-dominant), apraxia, spatial disorientation, acalculia (dominant).' },

                { id: 'sma', name: t('stem.brainatlas.supplementary_motor_area', 'Supplementary Motor Area'), x: 0.42, y: 0.35, w: 0.10, fn: 'Medial surface of frontal lobe, anterior to primary motor cortex. Plans complex motor sequences, coordinates bimanual movements, internally generated movements (vs externally cued). Pre-SMA involved in motor planning and decision-making. Contains somatotopic organization.', brodmann: 'BA 6 (medial)', blood: 'Anterior cerebral artery', conditions: 'SMA syndrome (post-surgical): transient contralateral akinesia and mutism after SMA resection (recovers in weeks due to compensation). SMA seizures: bilateral tonic posturing, preserved consciousness. Alien limb syndrome (medial frontal variant).', damage: 'Transient contralateral motor neglect, difficulty initiating voluntary movement, impaired bimanual coordination, speech initiation problems.' }

              ]

            },

            inferior: {

              name: t('stem.synth_ui.inferior_bottom'), desc: t('stem.synth_ui.view_from_below_showing_cranial'),

              regions: [

                { id: 'olfactory', name: t('stem.synth_ui.olfactory_bulbstracts_cn_i'), x: 0.50, y: 0.20, w: 0.10, fn: 'Receive input from olfactory epithelium via cribriform plate of ethmoid bone. Only sensory pathway that does NOT relay through thalamus \u2014 projects directly to olfactory cortex, amygdala, entorhinal cortex.', brodmann: 'N/A', blood: 'Anterior cerebral artery (olfactory branches)', conditions: 'Anosmia: loss of smell from head trauma (cribriform plate fracture), COVID-19, Parkinson\u2019s (early sign), Kallmann syndrome, olfactory groove meningioma.', damage: 'Unilateral or bilateral anosmia. Foster Kennedy syndrome: ipsilateral anosmia + optic atrophy + contralateral papilledema (olfactory groove meningioma).' },

                { id: 'optic_chiasm', name: t('stem.synth_ui.optic_chiasm_cn_ii'), x: 0.50, y: 0.32, w: 0.10, fn: 'Partial decussation of optic nerve fibers. Nasal fibers cross; temporal fibers remain ipsilateral. Sits above pituitary gland in sella turcica. Critical landmark for visual field deficits.', brodmann: 'N/A', blood: 'Superior hypophyseal artery, ophthalmic artery', conditions: 'Bitemporal hemianopia: classical visual field defect from pituitary adenoma compressing chiasm from below. Craniopharyngioma compresses from above.', damage: 'Bitemporal hemianopia (loss of both temporal visual fields). Pituitary tumors are most common cause.' },

                { id: 'temporal_inf', name: t('stem.synth_ui.temporal_lobes_inferior'), x: 0.40, y: 0.50, w: 0.15, fn: 'Inferior surface shows fusiform gyrus (face recognition), parahippocampal gyrus (memory encoding), uncus (olfactory processing). Contains hippocampus and amygdala internally.', brodmann: 'BA 20 (inferior temporal), BA 36,37 (fusiform)', blood: 'Posterior cerebral artery', conditions: 'Uncal herniation: life-threatening transtentorial herniation compresses CN III \u2192 ipsilateral fixed dilated pupil, contralateral hemiparesis, then coma. Neurosurgical emergency. Prosopagnosia from fusiform gyrus damage.', damage: 'Memory deficits, face perception problems, uncal herniation signs if mass effect present.' },

                { id: 'cerebellum_inf', name: t('stem.synth_ui.cerebellum_inferior'), x: 0.50, y: 0.72, w: 0.18, fn: 'Cerebellar tonsils visible inferiorly, flanking the foramen magnum. Vermis (midline) controls truncal balance; hemispheres control limb coordination. Flocculonodular lobe controls eye movements.', brodmann: 'N/A', blood: 'PICA (posterior inferior cerebellar artery)', conditions: 'Chiari malformation: cerebellar tonsils herniate through foramen magnum \u2192 headache, syringomyelia. Cerebellar tonsillar herniation is life-threatening (compresses brainstem). Medulloblastoma in children (vermis).', damage: 'Truncal ataxia (vermis lesion), limb ataxia (hemisphere lesion), nystagmus, dysarthria.' },

                { id: 'medulla_inf', name: t('stem.synth_ui.medulla_oblongata_inferior'), x: 0.50, y: 0.60, w: 0.08, fn: 'Most inferior brainstem structure. Contains: cardiovascular center, respiratory center, vomiting center, pyramids (corticospinal tracts that decussate here). CN IX, X, XI, XII nuclei.', brodmann: 'N/A', blood: 'Vertebral arteries, PICA', conditions: 'Lateral medullary (Wallenberg) syndrome: PICA occlusion \u2192 ipsilateral facial numbness, Horner syndrome, ataxia + contralateral body pain/temperature loss. Dysphagia from nucleus ambiguus involvement.', damage: 'Respiratory/cardiac arrest if bilateral lesion. Alternating hemiplegia, dysphagia, dysarthria, vertigo.' },

                { id: 'cn_nerves', name: t('stem.synth_ui.cranial_nerves_iiu2013xii'), x: 0.50, y: 0.45, w: 0.12, fn: 'Emerge from brainstem base. Key exits: CN V from pons (trigeminal), CN VII/VIII from pontomedullary junction (facial/vestibulocochlear), CN IX/X/XI from medulla (glossopharyngeal, vagus, spinal accessory), CN XII from medulla (hypoglossal).', brodmann: 'N/A', blood: 'Various branches of basilar and vertebral arteries', conditions: 'CN III palsy: "down and out" eye, ptosis, mydriasis. CN V: trigeminal neuralgia. CN VII: Bell palsy (LMN facial droop). CN VIII: acoustic neuroma (hearing loss, tinnitus). CN XII: tongue deviates toward lesion.', damage: 'Specific cranial nerve deficits depending on which nerve is affected. Multiple CN palsies suggest brainstem pathology or skull base disease.' },

                { id: 'pituitary_brain', name: t('stem.brainatlas.pituitary_gland', 'Pituitary Gland'), x: 0.50, y: 0.38, w: 0.06, fn: 'Pea-sized master endocrine gland in sella turcica of sphenoid bone. Anterior lobe (adenohypophysis): GH, ACTH, TSH, FSH, LH, prolactin. Posterior lobe (neurohypophysis): stores oxytocin and ADH. Connected to hypothalamus by infundibulum (pituitary stalk). Hypophyseal portal system links hypothalamus to anterior pituitary.', brodmann: 'N/A (endocrine gland)', blood: 'Superior and inferior hypophyseal arteries from internal carotid artery', conditions: 'Pituitary adenoma (most common: prolactinoma) \u2192 visual field defects (bitemporal hemianopia), hormonal excess/deficiency. Pituitary apoplexy: hemorrhage into adenoma \u2192 sudden headache, visual loss, hypopituitarism. Sheehan syndrome: postpartum pituitary necrosis. Craniopharyngioma.', damage: 'Hormonal imbalance (multiple endocrine deficiencies), visual field defects from optic chiasm compression, diabetes insipidus if posterior pituitary affected.' },

                { id: 'circle_willis_brain', name: t('stem.brainatlas.circle_of_willis', 'Circle of Willis'), x: 0.50, y: 0.50, w: 0.14, fn: 'Arterial anastomotic ring at base of brain forming a polygon. Components: anterior communicating artery (AComm), bilateral A1 segments of ACA, bilateral ICA, bilateral PComm, bilateral P1 segments of PCA. Complete circle in only ~25% of population. Provides collateral circulation if one artery is occluded.', brodmann: 'N/A (vascular)', blood: 'Internal carotid arteries (anterior circulation) + basilar artery (posterior circulation)', conditions: 'Berry (saccular) aneurysms: most common at AComm junction (30\u201335%). Rupture \u2192 subarachnoid hemorrhage (thunderclap headache, worst headache of life). Risk: hypertension, smoking, polycystic kidney disease, Ehlers-Danlos, coarctation of aorta. Variants may reduce collateral flow \u2192 increased stroke risk.', damage: 'Aneurysm rupture causes subarachnoid hemorrhage with high mortality; occlusion of feeding vessels causes ischemic stroke in the territory of the affected branch.' }

              ]

            },

            cranialNervesWillis: {

              name: t('stem.brainatlas.cranial_nerves_willis', 'Cranial Nerves & Willis'), desc: t('stem.brainatlas.cranial_nerves_willis_desc', 'Inferior brain map of cranial nerve exits and the Circle of Willis'),

              isCranialWillis: true,

              regions: [

                { id: 'olfactory_cn_i_cw', name: t('stem.brainatlas.cn_i_olfactory', 'CN I - Olfactory Bulbs/Tracts'), x: 0.25, y: 0.12, w: 0.08, fn: 'CN I carries smell from the nasal cavity through the cribriform plate to olfactory bulbs and tracts. It is the only sensory system that reaches cortex without first relaying through thalamus.', brodmann: 'Cranial nerve I; olfactory cortex connections', blood: 'Anterior cerebral artery and olfactory branches.', conditions: 'Anosmia can follow head trauma, olfactory groove meningioma, viral injury, or neurodegenerative disease. Foster Kennedy syndrome can combine ipsilateral anosmia with optic atrophy.', damage: 'Loss or distortion of smell; safety risks from not detecting smoke, gas, or spoiled food.' },

                { id: 'optic_chiasm_cn_ii_cw', name: t('stem.brainatlas.cn_ii_chiasm', 'CN II / Optic Chiasm'), x: 0.50, y: 0.31, w: 0.08, fn: 'Optic nerves meet at the chiasm, where nasal retinal fibers cross. This location sits above the pituitary, making it clinically important for pituitary masses and bitemporal visual-field loss.', brodmann: 'CN II; visual pathway before optic tracts', blood: 'Superior hypophyseal and ophthalmic artery branches.', conditions: 'Pituitary adenoma compressing the chiasm classically causes bitemporal hemianopia. Optic neuritis affects the optic nerve rather than the chiasm.', damage: 'Chiasmal injury causes loss of temporal visual fields in both eyes; optic nerve injury causes monocular vision loss.' },

                { id: 'oculomotor_cn_iii_cw', name: t('stem.brainatlas.cn_iii_oculomotor', 'CN III - Oculomotor'), x: 0.29, y: 0.40, w: 0.08, fn: 'CN III exits the ventral midbrain and controls most extraocular muscles, eyelid elevation, and parasympathetic pupil constriction. It runs near the posterior communicating artery.', brodmann: 'Midbrain oculomotor nucleus; Edinger-Westphal nucleus', blood: 'Posterior cerebral, superior cerebellar, and posterior communicating artery region.', conditions: 'Posterior communicating artery aneurysm can compress CN III, causing ptosis, a down-and-out eye, and a dilated pupil. Diabetic ischemic palsy often spares the pupil.', damage: 'Diplopia, ptosis, impaired eye adduction/elevation/depression, and possible fixed dilated pupil.' },

                { id: 'trigeminal_cn_v_cw', name: t('stem.brainatlas.cn_v_trigeminal', 'CN V - Trigeminal'), x: 0.20, y: 0.55, w: 0.08, fn: 'CN V exits the lateral pons. It carries facial sensation, corneal reflex afferent input, and motor control for muscles of mastication.', brodmann: 'Pons trigeminal nuclei', blood: 'Basilar and anterior inferior cerebellar artery region.', conditions: 'Trigeminal neuralgia causes brief severe facial pain. Pontine or cerebellopontine angle lesions can affect facial sensation and corneal reflex.', damage: 'Facial numbness, weak jaw clench, reduced corneal reflex afferent limb, or neuropathic facial pain.' },

                { id: 'abducens_cn_vi_cw', name: t('stem.brainatlas.cn_vi_abducens', 'CN VI - Abducens'), x: 0.32, y: 0.64, w: 0.08, fn: 'CN VI exits near the pontomedullary junction and abducts the eye via lateral rectus. Its long intracranial course makes it vulnerable to raised intracranial pressure.', brodmann: 'Pontine abducens nucleus', blood: 'Basilar artery paramedian branches.', conditions: 'CN VI palsy causes horizontal diplopia and inability to abduct the affected eye. It can be a false localizing sign in increased intracranial pressure.', damage: 'Medial deviation of the affected eye at rest and horizontal double vision worse when looking toward the lesion.' },

                { id: 'facial_vestibular_cn_vii_viii_cw', name: t('stem.brainatlas.cn_vii_viii_facial_vestibular', 'CN VII/VIII - Facial & Vestibulocochlear'), x: 0.80, y: 0.61, w: 0.08, fn: 'CN VII and CN VIII exit at the cerebellopontine angle. CN VII controls facial expression and taste from anterior tongue; CN VIII carries hearing and balance.', brodmann: 'Pontomedullary junction nuclei', blood: 'AICA and labyrinthine artery region.', conditions: 'Vestibular schwannoma at the cerebellopontine angle commonly causes hearing loss, tinnitus, imbalance, then facial weakness or numbness as it enlarges.', damage: 'Facial droop, hyperacusis, taste changes, dry eye, hearing loss, vertigo, or imbalance depending on nerve involvement.' },

                { id: 'lower_cranial_ix_x_xi_cw', name: t('stem.brainatlas.cn_ix_x_xi_lower_cranial', 'CN IX/X/XI - Lower Cranial Nerves'), x: 0.82, y: 0.72, w: 0.08, fn: 'CN IX, X, and XI exit from the medulla and jugular foramen region. They support swallowing, palate movement, voice, gag reflex, autonomic output, and head/shoulder movement.', brodmann: 'Medullary nuclei including nucleus ambiguus', blood: 'Vertebral artery and PICA region.', conditions: 'Lateral medullary syndrome can cause dysphagia, hoarseness, impaired gag, vertigo, ataxia, and crossed sensory findings.', damage: 'Dysphagia, hoarseness, nasal speech, palate droop, impaired gag reflex, shoulder weakness, or autonomic disturbance.' },

                { id: 'hypoglossal_cn_xii_cw', name: t('stem.brainatlas.cn_xii_hypoglossal', 'CN XII - Hypoglossal'), x: 0.22, y: 0.74, w: 0.08, fn: 'CN XII exits the medulla and controls tongue movement. Lower motor neuron injury makes the tongue deviate toward the weak side when protruded.', brodmann: 'Medullary hypoglossal nucleus', blood: 'Anterior spinal and vertebral artery branches.', conditions: 'Medial medullary syndrome can combine contralateral weakness with ipsilateral tongue weakness. Skull-base lesions can also injure CN XII.', damage: 'Tongue weakness, atrophy, fasciculations, dysarthria, and tongue deviation toward the lesion for lower motor neuron damage.' },

                { id: 'circle_willis_cw', name: t('stem.brainatlas.circle_willis_ring', 'Circle of Willis Ring'), x: 0.50, y: 0.40, w: 0.09, fn: 'The Circle of Willis is an arterial ring connecting anterior and posterior circulation at the brain base. It can provide collateral flow, though complete anatomy varies widely between people.', brodmann: 'Vascular anatomy', blood: 'Internal carotid arteries plus basilar artery and communicating branches.', conditions: 'Berry aneurysms often arise at branch points. Rupture causes subarachnoid hemorrhage with thunderclap headache and meningeal irritation.', damage: 'Vessel occlusion causes territory-specific ischemic stroke; aneurysm rupture causes subarachnoid hemorrhage.' },

                { id: 'acomm_aca_cw', name: t('stem.brainatlas.acomm_aca', 'AComm / ACA'), x: 0.50, y: 0.25, w: 0.08, fn: 'The anterior communicating artery links the left and right anterior cerebral arteries. It is the most common site for saccular aneurysms.', brodmann: 'Anterior circulation vessel', blood: 'Internal carotid artery via ACA A1 segments.', conditions: 'AComm aneurysm can cause subarachnoid hemorrhage and may affect frontal systems, producing confusion, personality change, or memory problems.', damage: 'ACA territory stroke affects contralateral leg more than face/arm and may produce abulia or urinary symptoms.' },

                { id: 'pcomm_ica_cw', name: t('stem.brainatlas.pcomm_ica', 'PComm / Internal Carotid'), x: 0.61, y: 0.40, w: 0.08, fn: 'Posterior communicating arteries connect internal carotid circulation to posterior cerebral arteries. They sit near CN III, so aneurysms here are high-yield for pupil-involving oculomotor palsy.', brodmann: 'Communicating artery and carotid circulation', blood: 'Internal carotid artery and posterior circulation connection.', conditions: 'PComm aneurysm can compress CN III before rupture. ICA disease can reduce anterior circulation flow and collateral capacity.', damage: 'Aneurysm compression causes CN III palsy; occlusion risk depends on collateral anatomy and downstream territory.' },

                { id: 'basilar_vertebral_cw', name: t('stem.brainatlas.basilar_vertebral', 'Basilar / Vertebral Arteries'), x: 0.50, y: 0.70, w: 0.08, fn: 'Vertebral arteries join to form the basilar artery on the ventral pons. Branches supply brainstem, cerebellum, thalamus, and posterior cerebral cortex.', brodmann: 'Posterior circulation vessels', blood: 'Vertebral arteries, basilar artery, PICA, AICA, SCA, PCA.', conditions: 'Basilar artery occlusion can cause locked-in syndrome, coma, or death. Vertebral/PICA disease can cause lateral medullary syndrome.', damage: 'Brainstem stroke signs, crossed findings, ataxia, cranial nerve deficits, visual symptoms, or catastrophic loss of consciousness.' },

                { id: 'bedside_clue_decoder_cw', name: t('stem.brainatlas.bedside_clue_decoder', 'Bedside Clue Decoder'), x: 0.50, y: 0.14, w: 0.12, fn: 'A quick localization checklist for the inferior brain map. Pupil-involving CN III palsy points toward PComm aneurysm until proven otherwise. Bitemporal visual-field loss points toward optic chiasm compression, often from the pituitary region. Hoarseness, dysphagia, and impaired gag localize to lower cranial nerves or medulla. Thunderclap headache raises concern for subarachnoid hemorrhage from a ruptured aneurysm.', brodmann: 'Clinical localization guide across cranial nerves, optic chiasm, and Circle of Willis vessels', blood: 'Highlights PComm/ICA, AComm/ACA, basilar/vertebral, and hypophyseal/chiasmal supply depending on the clue.', conditions: 'Useful for triaging CN III palsy, pituitary/chiasmal compression, lateral medullary presentations, basilar disease, and aneurysmal subarachnoid hemorrhage.', damage: 'The clue pattern narrows the dangerous anatomy: pupil plus CN III near PComm, bitemporal fields near chiasm, bulbar symptoms near medulla/lower cranial nerves, and thunderclap headache near aneurysm rupture.' }

              ]

            },

            strokeTerritories: {

              name: t('stem.brainatlas.stroke_territories', 'Stroke Territories'), desc: t('stem.brainatlas.stroke_territories_desc', 'ACA, MCA, PCA, lacunar, watershed, and posterior-circulation stroke localization'),

              isStrokeTerritory: true,

              regions: [

                { id: 'aca_stroke_territory', name: t('stem.brainatlas.aca_stroke_territory', 'ACA Territory'), x: 0.32, y: 0.30, w: 0.09, fn: 'Anterior cerebral artery territory supplies medial frontal and parietal cortex, including leg/foot motor and sensory cortex, supplementary motor area, and medial frontal motivation systems.', brodmann: 'Medial frontal/parietal cortex; leg area of BA 4 and BA 3/1/2', blood: 'Anterior cerebral artery.', conditions: 'ACA stroke often causes contralateral leg weakness or sensory loss greater than face/arm, abulia, grasp reflex, urinary incontinence, or gait initiation difficulty.', damage: 'Leg-predominant contralateral weakness/sensory loss plus frontal behavioral signs localizes toward ACA territory.' },
                { id: 'mca_superior_stroke', name: t('stem.brainatlas.mca_superior_stroke', 'MCA Superior Division'), x: 0.48, y: 0.34, w: 0.09, fn: 'MCA superior division supplies lateral frontal cortex, face/arm motor cortex, frontal eye field, and Broca area in the dominant hemisphere.', brodmann: 'Lateral frontal motor/language cortex including BA 4, 6, 8, 44/45', blood: 'Middle cerebral artery superior division.', conditions: 'Dominant MCA superior stroke causes face/arm weakness plus Broca aphasia. Non-dominant stroke may cause motor neglect or attention deficits.', damage: 'Face/arm-predominant contralateral weakness, gaze preference toward lesion, and nonfluent aphasia if dominant.' },
                { id: 'mca_inferior_stroke', name: t('stem.brainatlas.mca_inferior_stroke', 'MCA Inferior Division'), x: 0.58, y: 0.48, w: 0.09, fn: 'MCA inferior division supplies lateral temporal and inferior parietal association cortex, including Wernicke language cortex in the dominant hemisphere.', brodmann: 'Temporal/parietal association cortex including BA 22, 39, 40', blood: 'Middle cerebral artery inferior division.', conditions: 'Dominant MCA inferior stroke causes fluent aphasia with poor comprehension. Non-dominant stroke often causes hemispatial neglect, anosognosia, or visuospatial errors.', damage: 'Fluent but poorly meaningful speech if dominant; neglect and spatial inattention if non-dominant.' },
                { id: 'pca_stroke_territory', name: t('stem.brainatlas.pca_stroke_territory', 'PCA Territory'), x: 0.76, y: 0.42, w: 0.09, fn: 'Posterior cerebral artery supplies occipital cortex, inferior/medial temporal cortex, thalamus, and parts of midbrain.', brodmann: 'Occipital V1/V2 and medial temporal cortex', blood: 'Posterior cerebral artery.', conditions: 'PCA stroke classically causes contralateral homonymous hemianopia, sometimes with macular sparing. Dominant PCA can cause alexia without agraphia; thalamic branches can cause sensory syndromes.', damage: 'Visual-field loss points to PCA/occipital territory, especially with preserved strength.' },
                { id: 'deep_lacunar_stroke', name: t('stem.brainatlas.deep_lacunar_stroke', 'Deep Lacunar Territory'), x: 0.47, y: 0.58, w: 0.09, fn: 'Small penetrating arteries supply internal capsule, basal ganglia, thalamus, and pons. Tiny infarcts can cause dense symptoms because fibers are tightly packed.', brodmann: 'Deep white matter and subcortical nuclei', blood: 'Lenticulostriate, anterior choroidal, thalamoperforator, and pontine perforator arteries.', conditions: 'Classic lacunar syndromes include pure motor stroke, pure sensory stroke, ataxic hemiparesis, dysarthria-clumsy hand, and sensorimotor stroke.', damage: 'Pure motor or pure sensory findings without cortical signs suggest a deep lacunar localization.' },
                { id: 'watershed_stroke', name: t('stem.brainatlas.watershed_stroke', 'Watershed / Border Zone'), x: 0.62, y: 0.24, w: 0.09, fn: 'Watershed zones sit between major arterial territories and are vulnerable to hypoperfusion, carotid stenosis, or shock.', brodmann: 'ACA-MCA and MCA-PCA border-zone cortex and white matter', blood: 'Border zones between ACA, MCA, and PCA territories.', conditions: 'Hypotension or severe carotid disease can cause proximal arm/leg weakness in a man-in-the-barrel pattern or patchy cortical deficits.', damage: 'Bilateral proximal weakness or border-zone patterns point toward hypoperfusion rather than one embolic branch.' },
                { id: 'posterior_circulation_stroke', name: t('stem.brainatlas.posterior_circulation_stroke', 'Posterior Circulation'), x: 0.74, y: 0.68, w: 0.09, fn: 'Vertebral, basilar, and cerebellar arteries supply brainstem, cerebellum, thalamus, and occipital cortex. Symptoms often combine cranial nerve, long-tract, vestibular, visual, and coordination findings.', brodmann: 'Brainstem, cerebellum, thalamus, occipital cortex', blood: 'Vertebral arteries, basilar artery, PICA, AICA, SCA, PCA.', conditions: 'Posterior circulation stroke may cause vertigo, diplopia, dysarthria, dysphagia, ataxia, crossed findings, coma, or visual field loss.', damage: 'Brainstem or cerebellar signs with crossed sensory/motor findings raise concern for posterior circulation ischemia.' },
                { id: 'stroke_case_decoder', name: t('stem.brainatlas.stroke_case_decoder', 'Stroke Case Decoder'), x: 0.50, y: 0.84, w: 0.12, fn: 'A quick case-mode decoder. Leg greater than arm suggests ACA. Face/arm weakness with Broca aphasia suggests MCA superior division. Fluent aphasia or neglect suggests MCA inferior division. Homonymous visual-field loss suggests PCA. Pure motor or pure sensory symptoms without cortical signs suggest lacunar stroke. Vertigo, diplopia, dysphagia, ataxia, or crossed findings suggest posterior circulation.', brodmann: 'Clinical pattern map across cortical, deep, and posterior circulation territories', blood: 'ACA, MCA, PCA, perforator, watershed, vertebrobasilar, PICA, AICA, and SCA territories.', conditions: 'Use time course and safety rules clinically: acute stroke symptoms require urgent emergency evaluation. This decoder is for learning localization patterns, not self-diagnosis.', damage: 'The symptom pattern narrows the likely vascular territory before imaging confirms the lesion.' }

              ]

            },

            cerebellumClinic: {

              name: t('stem.brainatlas.cerebellum_clinic', 'Cerebellum Clinic'), desc: t('stem.brainatlas.cerebellum_clinic_desc', 'Cerebellar functional zones, artery territories, and ipsilateral ataxia clues'),

              isCerebellumClinic: true,

              regions: [

                { id: 'vermis_cerebellum_clinic', name: t('stem.brainatlas.cerebellum_vermis', 'Vermis / Truncal Zone'), x: 0.50, y: 0.38, w: 0.09, fn: 'The cerebellar vermis coordinates midline posture, gait, trunk balance, and eye-head stabilization. It is the midline stabilizer of the cerebellum.', brodmann: 'Cerebellar vermis', blood: 'PICA and SCA medial branches.', conditions: 'Vermis injury causes truncal ataxia, wide-based gait, titubation, and difficulty sitting or standing steadily.', damage: 'Midline wobble and gait instability localize more to vermis than lateral hemisphere.' },
                { id: 'hemisphere_cerebellum_clinic', name: t('stem.brainatlas.cerebellum_hemisphere', 'Cerebellar Hemispheres'), x: 0.32, y: 0.52, w: 0.09, fn: 'Cerebellar hemispheres coordinate ipsilateral limb movement, timing, force scaling, and error correction. They refine movement rather than initiate it.', brodmann: 'Cerebellar hemisphere cortex and deep nuclei', blood: 'SCA, AICA, and PICA branches depending on region.', conditions: 'Hemisphere lesions cause ipsilateral dysmetria, intention tremor, dysdiadochokinesia, rebound, and limb ataxia.', damage: 'Finger-to-nose overshoot on the same side as the lesion is a classic cerebellar clue.' },
                { id: 'flocculonodular_cerebellum', name: t('stem.brainatlas.cerebellum_flocculonodular', 'Flocculonodular / Vestibular Zone'), x: 0.68, y: 0.52, w: 0.09, fn: 'Flocculonodular lobe and vestibulocerebellum stabilize gaze, balance, vestibular reflexes, and eye movements.', brodmann: 'Vestibulocerebellum', blood: 'AICA and PICA-related vestibular/cerebellar supply.', conditions: 'Lesions cause nystagmus, vertigo, poor gaze holding, nausea, and balance trouble that can mimic inner-ear disease.', damage: 'Eye movement and vestibular signs point toward flocculonodular or brainstem vestibular systems.' },
                { id: 'deep_nuclei_cerebellum', name: t('stem.brainatlas.cerebellum_deep_nuclei', 'Deep Cerebellar Nuclei'), x: 0.50, y: 0.58, w: 0.09, fn: 'Deep nuclei are the cerebellum output hubs. Dentate supports planned limb movement; interposed nuclei help ongoing correction; fastigial supports posture and eye/head control.', brodmann: 'Dentate, interposed, and fastigial nuclei', blood: 'SCA and PICA/AICA penetrating branches.', conditions: 'Deep nuclear injury can produce severe ataxia because it interrupts output even if cortex remains partly intact.', damage: 'Large output errors, tremor, and poor correction localize to deep cerebellar output systems.' },
                { id: 'pica_cerebellum', name: t('stem.brainatlas.cerebellum_pica', 'PICA Territory'), x: 0.36, y: 0.75, w: 0.09, fn: 'PICA supplies inferior cerebellum, vermis, tonsil, and lateral medulla. It is high-yield because lateral medullary syndrome combines cerebellar and brainstem signs.', brodmann: 'Inferior cerebellum and lateral medulla', blood: 'Posterior inferior cerebellar artery.', conditions: 'PICA stroke can cause vertigo, nystagmus, ipsilateral ataxia, dysphagia, hoarseness, Horner syndrome, and crossed pain-temperature loss.', damage: 'Ataxia plus bulbar or crossed sensory signs suggests PICA/lateral medulla.' },
                { id: 'aica_cerebellum', name: t('stem.brainatlas.cerebellum_aica', 'AICA Territory'), x: 0.50, y: 0.80, w: 0.09, fn: 'AICA supplies lateral pons, middle cerebellar peduncle, anterior inferior cerebellum, and often the labyrinthine artery to the inner ear.', brodmann: 'Lateral pons, middle cerebellar peduncle, anterior inferior cerebellum', blood: 'Anterior inferior cerebellar artery.', conditions: 'AICA stroke can produce facial weakness, reduced lacrimation/salivation, hearing loss, vertigo, ataxia, and lateral pontine signs.', damage: 'Ataxia plus facial weakness or hearing symptoms points toward AICA.' },
                { id: 'sca_cerebellum', name: t('stem.brainatlas.cerebellum_sca', 'SCA Territory'), x: 0.64, y: 0.75, w: 0.09, fn: 'SCA supplies superior cerebellum, deep nuclei, superior peduncle, and parts of rostral pons/midbrain.', brodmann: 'Superior cerebellum and deep nuclei', blood: 'Superior cerebellar artery.', conditions: 'SCA stroke often causes ipsilateral limb ataxia, dysarthria, nausea, and sometimes contralateral pain-temperature loss or tremor.', damage: 'Prominent limb ataxia and dysarthria with fewer lower cranial nerve signs suggests SCA territory.' },
                { id: 'cerebellar_case_decoder', name: t('stem.brainatlas.cerebellar_case_decoder', 'Cerebellar Case Decoder'), x: 0.50, y: 0.16, w: 0.12, fn: 'A case-mode shortcut. Truncal wobble points to vermis. Limb overshoot and intention tremor point to ipsilateral hemisphere. Vertigo plus nystagmus points to vestibulocerebellum or vestibular nuclei. Ataxia plus hoarseness/dysphagia points to PICA/lateral medulla. Ataxia plus hearing/facial weakness points to AICA. Ataxia plus dysarthria and superior cerebellar signs points to SCA.', brodmann: 'Clinical pattern map across cerebellar functional zones and artery territories', blood: 'PICA, AICA, and SCA territories.', conditions: 'Use HINTS-style acute vestibular reasoning clinically only with trained expertise; this tool is a learning map, not a diagnostic device.', damage: 'Cerebellar lesions are usually ipsilateral: same-side coordination deficits are the key localization clue.' }

              ]

            },

            brainstemCrossSection: {

              name: t('stem.brainatlas.brainstem_cross_section', 'Brainstem Cross-Section'), desc: t('stem.brainatlas.brainstem_cross_section_desc', 'Midbrain, pons, medulla, long tracts, cranial nerve nuclei, and crossed findings'),

              isBrainstemCross: true,

              regions: [

                { id: 'midbrain_cross_section', name: t('stem.brainatlas.midbrain_cross_section', 'Midbrain Level'), x: 0.26, y: 0.36, w: 0.09, fn: 'Midbrain contains CN III/IV systems, cerebral peduncles, red nucleus, substantia nigra, superior/inferior colliculi, and ascending sensory pathways.', brodmann: 'Brainstem midbrain level', blood: 'PCA, SCA, basilar tip perforators.', conditions: 'Midbrain stroke can cause oculomotor palsy with contralateral weakness or tremor, vertical gaze problems, or altered consciousness depending on location.', damage: 'Ipsilateral CN III palsy plus contralateral body weakness localizes near ventral midbrain.' },
                { id: 'pons_cross_section', name: t('stem.brainatlas.pons_cross_section', 'Pons Level'), x: 0.50, y: 0.42, w: 0.09, fn: 'Pons contains corticospinal tracts, pontine nuclei, middle cerebellar peduncles, facial/abducens/trigeminal systems, and gaze pathways.', brodmann: 'Brainstem pontine level', blood: 'Basilar paramedian and circumferential branches; AICA laterally.', conditions: 'Pontine lesions can cause facial weakness, horizontal gaze palsy, abducens palsy, trigeminal sensory findings, ataxia, or locked-in syndrome if ventral bilateral.', damage: 'Face or eye movement findings plus contralateral body signs often localize to pons.' },
                { id: 'medulla_cross_section', name: t('stem.brainatlas.medulla_cross_section', 'Medulla Level'), x: 0.74, y: 0.49, w: 0.09, fn: 'Medulla contains pyramids, medial lemniscus, nucleus ambiguus, hypoglossal nucleus, vestibular nuclei, spinal trigeminal nucleus, inferior olive, and autonomic respiratory/cardiovascular centers.', brodmann: 'Brainstem medullary level', blood: 'Vertebral, anterior spinal, and PICA branches.', conditions: 'Lateral medullary syndrome causes dysphagia/hoarseness, vertigo, ataxia, ipsilateral face pain-temperature loss, contralateral body pain-temperature loss, and Horner syndrome.', damage: 'Bulbar symptoms plus crossed sensory signs localize strongly to medulla.' },
                { id: 'corticospinal_brainstem', name: t('stem.brainatlas.corticospinal_brainstem', 'Corticospinal Tract'), x: 0.40, y: 0.66, w: 0.09, fn: 'Corticospinal motor fibers descend through cerebral peduncles, ventral pons, and medullary pyramids before crossing at the caudal medulla.', brodmann: 'Long descending motor tract', blood: 'Paramedian brainstem perforators and anterior spinal territory in medulla.', conditions: 'Brainstem corticospinal injury causes contralateral upper motor neuron weakness below the lesion; bilateral ventral pontine injury can cause locked-in syndrome.', damage: 'Contralateral weakness with nearby cranial nerve signs is the crossed-findings pattern.' },
                { id: 'medial_lemniscus_brainstem', name: t('stem.brainatlas.medial_lemniscus_brainstem', 'Medial Lemniscus'), x: 0.50, y: 0.66, w: 0.09, fn: 'Medial lemniscus carries vibration, proprioception, and fine touch after crossing in the medulla.', brodmann: 'Ascending dorsal column-medial lemniscus tract', blood: 'Paramedian brainstem perforators.', conditions: 'Lesions cause contralateral loss of vibration/proprioception/fine touch below the face, often with motor tract signs if medial brainstem is involved.', damage: 'Loss of position/vibration with weakness suggests medial brainstem tract involvement.' },
                { id: 'spinothalamic_brainstem', name: t('stem.brainatlas.spinothalamic_brainstem', 'Spinothalamic Tract'), x: 0.60, y: 0.66, w: 0.09, fn: 'Spinothalamic tract carries pain and temperature from the contralateral body after crossing in the spinal cord.', brodmann: 'Ascending anterolateral sensory tract', blood: 'Lateral brainstem territories including PICA/AICA/SCA regions.', conditions: 'Lateral brainstem lesions can cause contralateral body pain-temperature loss while nearby trigeminal pathways cause ipsilateral face pain-temperature loss.', damage: 'Contralateral body pain-temperature loss with ipsilateral facial sensory loss is a lateral brainstem clue.' },
                { id: 'cranial_nuclei_brainstem', name: t('stem.brainatlas.cranial_nuclei_brainstem', 'Cranial Nerve Nuclei'), x: 0.50, y: 0.22, w: 0.09, fn: 'Cranial nerve nuclei create ipsilateral face, eye, swallowing, voice, tongue, and vestibular signs. Pairing them with long-tract findings localizes the brainstem level.', brodmann: 'CN III-XII nuclei distributed across midbrain, pons, and medulla', blood: 'Level-specific perforators and circumferential arteries.', conditions: 'CN III midbrain, CN VI/VII pons, and CN IX/X/XII medulla are common localization anchors.', damage: 'Ipsilateral cranial nerve sign plus contralateral body deficit is the classic crossed brainstem pattern.' },
                { id: 'crossed_findings_decoder', name: t('stem.brainatlas.crossed_findings_decoder', 'Crossed Findings Decoder'), x: 0.50, y: 0.86, w: 0.12, fn: 'A case-mode rule for brainstem localization. Ipsilateral cranial nerve deficit plus contralateral body weakness or sensory loss means the lesion is in the brainstem on the cranial nerve side. CN III suggests midbrain, CN VI/VII/V suggests pons, and dysphagia/hoarseness/tongue signs suggest medulla. Add tract clues: corticospinal means weakness, medial lemniscus means vibration/proprioception, spinothalamic means pain-temperature.', brodmann: 'Clinical decoder across midbrain, pons, medulla, long tracts, and cranial nerve nuclei', blood: 'Vertebrobasilar perforators, circumferential branches, PICA, AICA, SCA, anterior spinal artery.', conditions: 'Crossed findings are high-stakes acute neurologic signs and require urgent evaluation in real life.', damage: 'The side of the cranial nerve deficit often marks the lesion side; the body deficit is usually opposite.' }

              ]

            },

            csfHydrocephalus: {

              name: t('stem.brainatlas.csf_flow_hydrocephalus', 'CSF Flow & Hydrocephalus'), desc: t('stem.brainatlas.csf_flow_hydrocephalus_desc', 'CSF production, ventricular flow, reabsorption, and hydrocephalus localization'),

              isCsfHydro: true,

              regions: [

                { id: 'choroid_plexus_csf', name: t('stem.brainatlas.choroid_plexus_csf', 'Choroid Plexus'), x: 0.30, y: 0.30, w: 0.08, fn: 'Choroid plexus produces most cerebrospinal fluid inside the ventricles. CSF is continuously made, circulated, and reabsorbed, so blockage or poor absorption can enlarge ventricles.', brodmann: 'Ventricular vascular epithelium', blood: 'Anterior and posterior choroidal arteries.', conditions: 'Choroid plexus papilloma can overproduce CSF. Inflammation or hemorrhage can also disrupt CSF balance.', damage: 'Excess production is uncommon but can contribute to hydrocephalus when production exceeds absorption.' },
                { id: 'lateral_ventricles_csf', name: t('stem.brainatlas.lateral_ventricles_csf', 'Lateral Ventricles'), x: 0.38, y: 0.38, w: 0.09, fn: 'The paired lateral ventricles are the largest CSF spaces. CSF flows from each lateral ventricle through the interventricular foramen of Monro into the third ventricle.', brodmann: 'Ventricular system', blood: 'Choroidal arteries and nearby deep venous drainage.', conditions: 'Hydrocephalus often enlarges the lateral ventricles. A colloid cyst at the foramen of Monro can obstruct outflow and cause episodic headache or acute hydrocephalus.', damage: 'Ventricular enlargement can stretch periventricular white matter, affecting gait, cognition, and urinary control.' },
                { id: 'third_ventricle_csf', name: t('stem.brainatlas.third_ventricle_csf', 'Third Ventricle'), x: 0.50, y: 0.45, w: 0.08, fn: 'The third ventricle sits in the midline between the thalami and funnels CSF toward the cerebral aqueduct.', brodmann: 'Diencephalic ventricular space', blood: 'Deep perforators and choroidal branches nearby.', conditions: 'Masses near the third ventricle, colloid cysts, or hypothalamic/thalamic lesions can block flow or distort nearby structures.', damage: 'Midline obstruction can enlarge upstream lateral ventricles and produce signs of raised intracranial pressure.' },
                { id: 'cerebral_aqueduct_csf', name: t('stem.brainatlas.cerebral_aqueduct_csf', 'Cerebral Aqueduct'), x: 0.58, y: 0.55, w: 0.08, fn: 'The cerebral aqueduct is a narrow channel through the midbrain from the third to the fourth ventricle. Because it is narrow, it is a classic obstructive hydrocephalus bottleneck.', brodmann: 'Midbrain aqueduct', blood: 'Posterior circulation perforators nearby.', conditions: 'Aqueductal stenosis blocks CSF flow and enlarges the lateral and third ventricles while the fourth ventricle may stay smaller.', damage: 'Aqueduct blockage causes non-communicating hydrocephalus with upstream ventricular enlargement and raised pressure.' },
                { id: 'fourth_ventricle_csf', name: t('stem.brainatlas.fourth_ventricle_csf', 'Fourth Ventricle'), x: 0.62, y: 0.67, w: 0.08, fn: 'The fourth ventricle lies between the brainstem and cerebellum. CSF exits through the median and lateral apertures into the subarachnoid space.', brodmann: 'Hindbrain ventricular space', blood: 'Posterior circulation branches nearby.', conditions: 'Posterior fossa tumors, Chiari malformation, or outlet obstruction can block fourth ventricle outflow and cause hydrocephalus.', damage: 'Fourth ventricle compression can threaten brainstem function and raise intracranial pressure.' },
                { id: 'subarachnoid_space_csf', name: t('stem.brainatlas.subarachnoid_space_csf', 'Subarachnoid Space'), x: 0.74, y: 0.52, w: 0.09, fn: 'CSF circulates around the brain and spinal cord in the subarachnoid space, cushioning neural tissue and helping clear metabolites.', brodmann: 'Meningeal CSF compartment', blood: 'Meningeal and cortical vessels run through this space.', conditions: 'Subarachnoid hemorrhage can impair CSF reabsorption and cause communicating hydrocephalus. Meningitis can also scar arachnoid pathways.', damage: 'Blood or inflammation in the subarachnoid space can block absorption even when the ventricular outlets remain open.' },
                { id: 'arachnoid_granulations_csf', name: t('stem.brainatlas.arachnoid_granulations_csf', 'Arachnoid Granulations'), x: 0.58, y: 0.20, w: 0.08, fn: 'Arachnoid granulations return CSF to the dural venous sinuses, especially the superior sagittal sinus. This is the major reabsorption route.', brodmann: 'Arachnoid villi and dural venous sinus interface', blood: 'Drains into dural venous sinuses.', conditions: 'Communicating hydrocephalus occurs when CSF reaches the subarachnoid space but absorption is impaired, often after hemorrhage or meningitis.', damage: 'Poor absorption enlarges ventricles without one focal ventricular blockage.' },
                { id: 'hydrocephalus_decoder_csf', name: t('stem.brainatlas.hydrocephalus_decoder_csf', 'Hydrocephalus Decoder'), x: 0.50, y: 0.86, w: 0.12, fn: 'A quick localization decoder. Obstructive hydrocephalus means CSF is blocked within the ventricular route, often at the aqueduct or fourth-ventricle outlets. Communicating hydrocephalus means CSF reaches subarachnoid space but is not absorbed well. Normal pressure hydrocephalus classically links gait trouble, cognitive decline, and urinary urgency or incontinence.', brodmann: 'Clinical CSF-flow pattern map', blood: 'Depends on the obstructed or inflamed structure; hemorrhage can impair arachnoid granulation absorption.', conditions: 'Raised intracranial pressure can cause headache, vomiting, papilledema, sixth nerve palsy, or decreased consciousness. This diagram is for learning patterns, not self-diagnosis.', damage: 'The pattern separates upstream obstruction, impaired absorption, and chronic pressure-related white-matter stretch.' }

              ]

            },

            homunculus: {

              name: t('stem.brainatlas.motor_sensory_homunculus', 'Motor/Sensory Homunculus'), desc: t('stem.brainatlas.homunculus_map_motor_sensory_cortex', 'Penfield-style body map across primary motor and primary somatosensory cortex'),

              isHomunculus: true,

              regions: [

                { id: 'motor_strip_hom', name: t('stem.brainatlas.primary_motor_cortex_precentral', 'Primary Motor Cortex (precentral gyrus)'), x: 0.28, y: 0.18, w: 0.10, fn: 'Primary motor cortex (BA 4) sits just anterior to the central sulcus on the precentral gyrus. It sends corticospinal output to move the opposite side of the body. Electrical stimulation here produces movement, which is how Penfield mapped much of the motor homunculus.', brodmann: 'BA 4', blood: 'Anterior cerebral artery for medial leg/foot area; middle cerebral artery for lateral face/arm/hand areas.', conditions: 'Stroke or stimulation signs follow the map: medial lesions affect the contralateral leg; lateral lesions affect face, tongue, and hand. Jacksonian motor seizures can march from one body part to adjacent mapped areas.', damage: 'Contralateral weakness or spastic paralysis. Fine hand movement and facial movement are often prominent because those body parts have large cortical representations.' },

                { id: 'sensory_strip_hom', name: t('stem.brainatlas.primary_somatosensory_cortex_postcentral', 'Primary Somatosensory Cortex (postcentral gyrus)'), x: 0.72, y: 0.18, w: 0.10, fn: 'Primary somatosensory cortex (BA 3, 1, 2) sits just posterior to the central sulcus on the postcentral gyrus. It receives touch, proprioception, vibration, and body-position information from the opposite side of the body.', brodmann: 'BA 3, 1, 2', blood: 'Anterior cerebral artery for medial leg/foot area; middle cerebral artery for lateral face/arm/hand areas.', conditions: 'Cortical sensory loss can include astereognosis, agraphesthesia, poor two-point discrimination, and neglect-like sensory inattention even when basic pathways are intact.', damage: 'Contralateral numbness, impaired localization of touch, loss of discriminative sensation, and difficulty recognizing objects by touch.' },

                { id: 'leg_foot_hom', name: t('stem.brainatlas.homunculus_leg_foot', 'Leg & Foot Area'), x: 0.50, y: 0.29, w: 0.08, fn: 'Leg and foot are represented medially near the longitudinal fissure. This area is supplied mainly by the anterior cerebral artery, so ACA strokes classically cause contralateral leg weakness or sensory loss more than face or arm symptoms.', brodmann: 'Motor: BA 4; sensory: BA 3,1,2', blood: 'Anterior cerebral artery territory.', conditions: 'ACA stroke: contralateral leg weakness, abulia, urinary symptoms if medial frontal areas are involved. Parasagittal meningioma can compress the leg area bilaterally.', damage: 'Contralateral leg and foot weakness, numbness, poor proprioception, or gait difficulty depending on whether motor or sensory cortex is affected.' },

                { id: 'hand_hom', name: t('stem.brainatlas.homunculus_hand_area', 'Hand Area'), x: 0.50, y: 0.52, w: 0.08, fn: 'The hand has a large cortical representation because fine finger control and tactile discrimination require many neurons. In the motor strip this supports skilled movement; in the sensory strip it supports precise touch and object recognition.', brodmann: 'Motor hand knob: BA 4; sensory hand area: BA 3,1,2', blood: 'Middle cerebral artery territory.', conditions: 'Small cortical strokes can produce isolated hand weakness or numbness. Focal seizures may start with hand twitching or tingling and spread in a Jacksonian march.', damage: 'Contralateral hand clumsiness, weakness, numbness, impaired two-point discrimination, or loss of stereognosis.' },

                { id: 'face_lips_hom', name: t('stem.brainatlas.homunculus_face_lips', 'Face & Lips Area'), x: 0.50, y: 0.69, w: 0.08, fn: 'Face and lips are represented laterally and occupy a large share of cortex because facial expression, speech articulation, and oral sensation are highly precise. Motor cortex drives facial movement; sensory cortex receives touch from face and mouth.', brodmann: 'Motor: BA 4; sensory: BA 3,1,2', blood: 'Middle cerebral artery territory.', conditions: 'MCA stroke often affects face and arm more than leg. Cortical stimulation may cause contralateral facial twitching or tingling rather than whole-body symptoms.', damage: 'Contralateral lower facial weakness or facial numbness; speech articulation may be affected when nearby language/motor planning areas are involved.' },

                { id: 'tongue_hom', name: t('stem.brainatlas.homunculus_tongue_area', 'Tongue Area'), x: 0.50, y: 0.83, w: 0.08, fn: 'Tongue representation sits at the lateral/inferior end of the motor and sensory strips. It is important for speech articulation, swallowing, and oral sensation. This is why small lateral peri-Rolandic lesions can affect speech clarity or tongue sensation.', brodmann: 'Motor: BA 4; sensory: BA 3,1,2', blood: 'Middle cerebral artery territory.', conditions: 'Focal seizures or stimulation can produce tongue movement, tingling, or speech arrest-like symptoms if adjacent speech networks are involved.', damage: 'Contralateral tongue weakness, dysarthria, or oral sensory changes depending on lesion location.' }

              ]

            },

            visualPathway: {

              name: t('stem.brainatlas.visual_pathway', 'Visual Pathway'), desc: t('stem.brainatlas.visual_pathway_map_desc', 'Retina to V1 map with classic visual-field cuts'),

              isVisualPathway: true,

              regions: [

                { id: 'retina_visual', name: t('stem.brainatlas.visual_retina', 'Retina'), x: 0.16, y: 0.50, w: 0.08, fn: 'The retina is the neural tissue of the eye. Nasal retina receives temporal visual field; temporal retina receives nasal visual field. This inverted mapping is the first step in understanding visual-field cuts.', brodmann: 'N/A (retinal CNS tissue)', blood: 'Central retinal artery and choroidal circulation.', conditions: 'Retinal artery occlusion causes sudden painless monocular vision loss. Retinal detachment causes flashes, floaters, and a curtain-like field defect.', damage: 'Retinal lesions produce monocular scotomas or field loss in one eye only, matching the damaged retinal area.' },

                { id: 'optic_nerve_visual', name: t('stem.brainatlas.visual_optic_nerve', 'Optic Nerve'), x: 0.29, y: 0.50, w: 0.08, fn: 'The optic nerve carries all visual information from one eye before any crossing has happened. It includes retinal ganglion cell axons and is part of the central nervous system, myelinated by oligodendrocytes.', brodmann: 'CN II', blood: 'Ophthalmic artery branches and pial vessels.', conditions: 'Optic neuritis causes painful monocular vision loss and is associated with multiple sclerosis. Papilledema reflects raised intracranial pressure.', damage: 'Complete optic nerve lesion causes monocular blindness in the affected eye with an afferent pupillary defect.' },

                { id: 'optic_chiasm_visual_path', name: t('stem.brainatlas.visual_optic_chiasm', 'Optic Chiasm'), x: 0.42, y: 0.50, w: 0.08, fn: 'At the optic chiasm, nasal retinal fibers cross while temporal retinal fibers stay on the same side. Because nasal retina sees temporal visual fields, a midline chiasm lesion removes both temporal fields.', brodmann: 'N/A', blood: 'Superior hypophyseal branches.', conditions: 'Pituitary adenoma compressing the chiasm from below classically causes bitemporal hemianopia. Craniopharyngioma may compress from above.', damage: 'Midline chiasm damage causes bitemporal hemianopia: loss of outer visual fields in both eyes.' },

                { id: 'optic_tract_visual', name: t('stem.brainatlas.visual_optic_tract', 'Optic Tract'), x: 0.55, y: 0.50, w: 0.08, fn: 'After the chiasm, each optic tract carries the opposite visual field from both eyes. The left optic tract carries right visual field information; the right optic tract carries left visual field information.', brodmann: 'N/A', blood: 'Anterior choroidal artery and posterior communicating artery branches.', conditions: 'Optic tract lesions are uncommon but can occur with tumors, vascular lesions, trauma, or demyelination.', damage: 'Optic tract lesion causes contralateral homonymous hemianopia: the same side of visual space is lost in both eyes.' },

                { id: 'lgn_visual', name: t('stem.brainatlas.visual_lgn', 'Lateral Geniculate Nucleus (LGN)'), x: 0.66, y: 0.50, w: 0.08, fn: 'The LGN is the thalamic relay for vision. It preserves retinotopic maps and separates input from each eye before sending information through optic radiations to primary visual cortex.', brodmann: 'Thalamic relay nucleus', blood: 'Anterior choroidal and posterior cerebral artery branches.', conditions: 'Thalamic or posterior circulation lesions can affect the LGN, producing sectoranopias or homonymous field defects.', damage: 'LGN damage can cause contralateral homonymous field loss, often with sector-shaped patterns.' },

                { id: 'meyer_loop_visual', name: t('stem.brainatlas.visual_meyer_loop', 'Meyer Loop (temporal radiation)'), x: 0.74, y: 0.66, w: 0.08, fn: 'Meyer loop sweeps through the temporal lobe and carries superior visual-field information from the contralateral side. The mnemonic is "pie in the sky" for temporal-lobe lesions.', brodmann: 'Optic radiation to V1', blood: 'Middle cerebral artery inferior division and posterior cerebral artery contributions.', conditions: 'Temporal lobe surgery, tumor, or stroke can injure Meyer loop. This is a key risk in epilepsy surgery.', damage: 'Meyer loop damage causes contralateral superior quadrantanopia: a "pie in the sky" field cut.' },

                { id: 'parietal_radiation_visual', name: t('stem.brainatlas.visual_parietal_radiation', 'Parietal Optic Radiation'), x: 0.74, y: 0.34, w: 0.08, fn: 'Parietal optic radiations carry inferior visual-field information from the contralateral side. The mnemonic is "pie on the floor" for parietal-lobe lesions.', brodmann: 'Optic radiation to V1', blood: 'Middle cerebral artery superior division and posterior cerebral artery contributions.', conditions: 'Parietal stroke can combine inferior quadrantanopia with sensory loss, neglect, or spatial deficits depending on hemisphere.', damage: 'Parietal radiation damage causes contralateral inferior quadrantanopia: a "pie on the floor" field cut.' },

                { id: 'v1_visual_path', name: t('stem.brainatlas.visual_primary_visual_cortex', 'Primary Visual Cortex (V1)'), x: 0.88, y: 0.50, w: 0.08, fn: 'Primary visual cortex sits along the calcarine sulcus in the occipital lobe. It receives a precise map of the contralateral visual field; the macula has a large posterior representation.', brodmann: 'BA 17', blood: 'Posterior cerebral artery; macular area can receive collateral middle cerebral artery supply.', conditions: 'PCA stroke causes contralateral homonymous hemianopia, sometimes with macular sparing. Bilateral occipital damage can cause cortical blindness.', damage: 'V1 lesion causes contralateral homonymous field loss. Macular sparing may occur because central vision has dual/collateral blood supply.' },

                { id: 'field_cut_decoder_visual', name: t('stem.brainatlas.visual_field_cut_decoder', 'Field-Cut Decoder'), x: 0.50, y: 0.15, w: 0.12, fn: 'A fast localization rule for visual-field deficits. Before the chiasm, the loss is usually monocular. At the chiasm, crossing nasal retinal fibers create bitemporal hemianopia. After the chiasm, deficits are homonymous: the same side of visual space is lost in both eyes. Temporal Meyer loop lesions cut the superior visual field ("pie in the sky"); parietal radiations tend to cut the inferior field ("pie on the floor"); occipital V1 lesions may show macular sparing.', brodmann: 'Clinical localization guide across retina, optic nerve, chiasm, tract, radiations, and V1', blood: 'Depends on the affected segment: ophthalmic/retinal circulation, hypophyseal/chiasmal branches, anterior choroidal, MCA radiations, or PCA occipital territory.', conditions: 'Useful for localizing optic neuritis, pituitary compression, optic tract lesions, temporal/parietal lobe injury, PCA stroke, and surgical risk around optic radiations.', damage: 'The field pattern localizes the lesion: one eye before chiasm, both temporal fields at chiasm, same-side field loss after chiasm, quadrant patterns in optic radiations, and homonymous loss with possible macular sparing in V1.' }

              ]

            },

            languageNetwork: {

              name: t('stem.brainatlas.language_network', 'Language Network'), desc: t('stem.brainatlas.language_network_desc', 'Dominant-hemisphere speech, comprehension, reading, and repetition circuit'),

              isLanguageNetwork: true,

              regions: [

                { id: 'auditory_language', name: t('stem.brainatlas.language_auditory_word_input', 'Auditory Word Input'), x: 0.22, y: 0.62, w: 0.08, fn: 'Primary auditory cortex and superior temporal input decode speech sounds before the language network maps them onto word meaning. This is the spoken-language entry point for the dominant hemisphere.', brodmann: 'BA 41/42 plus superior temporal language cortex', blood: 'Middle cerebral artery inferior division and temporal branches.', conditions: 'Pure word deafness or auditory verbal agnosia can make spoken words hard to understand even when hearing itself is partly preserved.', damage: 'Impaired understanding of spoken words, especially when auditory association cortex or its connections are injured.' },

                { id: 'wernicke_language', name: t('stem.brainatlas.language_wernicke_area', 'Wernicke Area'), x: 0.39, y: 0.53, w: 0.08, fn: 'Posterior superior temporal cortex links word sounds to meaning. It is the classic comprehension hub for spoken language and connects with frontal speech planning through the arcuate fasciculus.', brodmann: 'BA 22 dominant hemisphere', blood: 'Middle cerebral artery inferior division.', conditions: 'Wernicke aphasia: fluent output with poor comprehension, poor repetition, and paraphasic or nonsensical speech.', damage: 'Fluent but poorly meaningful speech, impaired comprehension, poor repetition, and limited awareness of errors.' },

                { id: 'angular_language', name: t('stem.brainatlas.language_angular_gyrus', 'Angular Gyrus'), x: 0.54, y: 0.39, w: 0.08, fn: 'Angular gyrus integrates visual, semantic, numeric, and written-language information. It helps convert seen words into meaning and supports reading, writing, calculation, and naming.', brodmann: 'BA 39 dominant inferior parietal lobule', blood: 'Middle cerebral artery angular branch and posterior border-zone supply.', conditions: 'Gerstmann syndrome, alexia with agraphia, anomia, and semantic reading/writing problems can involve this region.', damage: 'Reading, writing, calculation, naming, and multimodal semantic integration deficits.' },

                { id: 'supramarginal_language', name: t('stem.brainatlas.language_supramarginal_gyrus', 'Supramarginal Gyrus'), x: 0.52, y: 0.58, w: 0.08, fn: 'Supramarginal gyrus supports phonological working memory: holding word sounds in mind long enough to repeat, compare, and assemble them for speech.', brodmann: 'BA 40 dominant inferior parietal lobule', blood: 'Middle cerebral artery inferior division.', conditions: 'Conduction aphasia can involve supramarginal cortex, arcuate fasciculus, or their shared network.', damage: 'Poor repetition, phonemic paraphasias, and trouble keeping sound sequences stable.' },

                { id: 'arcuate_language', name: t('stem.brainatlas.language_arcuate_fasciculus', 'Arcuate Fasciculus'), x: 0.56, y: 0.48, w: 0.08, fn: 'The arcuate fasciculus is a white-matter tract linking posterior comprehension areas with frontal speech planning. It is especially important for repetition.', brodmann: 'Dominant-hemisphere association white matter tract', blood: 'Middle cerebral artery long association fiber territory.', conditions: 'Conduction aphasia: fluent speech and relatively good comprehension but poor repetition, often with phonemic errors.', damage: 'Poor repetition, phonemic paraphasias, and difficulty relaying heard language into planned output.' },

                { id: 'broca_language', name: t('stem.brainatlas.language_broca_area', 'Broca Area'), x: 0.70, y: 0.43, w: 0.08, fn: 'Inferior frontal cortex plans and sequences speech output. It turns intended meaning into a motor speech program and supports grammar, articulation planning, and verbal fluency.', brodmann: 'BA 44/45 dominant inferior frontal gyrus', blood: 'Middle cerebral artery superior division.', conditions: 'Broca aphasia: nonfluent, effortful speech with relatively preserved comprehension and impaired repetition.', damage: 'Nonfluent aphasia, agrammatism, impaired repetition, speech frustration, and sometimes right face/arm weakness from nearby motor cortex.' },

                { id: 'motor_speech_language', name: t('stem.brainatlas.language_motor_speech_cortex', 'Motor Speech Cortex'), x: 0.84, y: 0.34, w: 0.08, fn: 'Lower precentral gyrus drives lips, tongue, jaw, larynx, and face for speech execution. It is the output edge of the language network.', brodmann: 'BA 4 lower precentral gyrus', blood: 'Middle cerebral artery lateral motor territory.', conditions: 'Dysarthria, apraxia of speech, or face/tongue weakness can follow injury near this region.', damage: 'Weak or imprecise articulation, impaired speech motor sequencing, or contralateral lower facial weakness.' },

                { id: 'visual_word_language', name: t('stem.brainatlas.language_visual_word_input', 'Visual Word Input'), x: 0.20, y: 0.30, w: 0.08, fn: 'Occipital and ventral occipitotemporal systems begin reading by recognizing letters and word forms before sending them into semantic language cortex.', brodmann: 'Visual cortex and ventral occipitotemporal word-form region', blood: 'Posterior cerebral artery and posterior MCA/PCA border-zone supply.', conditions: 'Alexia without agraphia can occur when visual word input is disconnected from dominant language cortex.', damage: 'Reading impairment with variable spelling or writing effects depending on whether the language network remains connected.' },

                { id: 'semantic_language', name: t('stem.brainatlas.language_semantic_network', 'Semantic Network'), x: 0.40, y: 0.31, w: 0.08, fn: 'Temporal and inferior parietal association cortex stores and retrieves word meaning. It helps connect names, concepts, categories, and context.', brodmann: 'Temporal and parietal association cortex', blood: 'Middle cerebral and posterior cerebral artery branches.', conditions: 'Anomic aphasia, semantic dementia, temporal-lobe seizures, and tumor can disrupt naming or word meaning.', damage: 'Word-finding trouble, loss of concept knowledge, naming errors, or impaired comprehension of meaning.' },

                { id: 'aphasia_cards_language', name: t('stem.brainatlas.language_aphasia_clue_cards', 'Aphasia Clue Cards'), x: 0.50, y: 0.84, w: 0.08, fn: 'Classic bedside aphasia patterns help localize language network injury. Fluency, comprehension, repetition, naming, reading, and writing are tested together.', brodmann: 'Clinical pattern map', blood: 'Depends on cortical, subcortical, and white-matter territory.', conditions: 'Stroke is the common acute cause; seizure, migraine, tumor, infection, and neurodegeneration can mimic or evolve into aphasia patterns.', damage: 'Use fluency, comprehension, repetition, naming, reading, and writing to distinguish Broca, Wernicke, conduction, global, transcortical, and anomic aphasia.' }

              ]

            },

            basalGangliaLoop: {

              name: t('stem.brainatlas.basal_ganglia_loop', 'Basal Ganglia Loop'), desc: t('stem.brainatlas.basal_ganglia_loop_desc', 'Direct and indirect movement-selection loops with dopamine modulation'),

              isBasalGanglia: true,

              regions: [

                { id: 'cortex_bg', name: t('stem.brainatlas.bg_motor_cortex', 'Motor Cortex'), x: 0.50, y: 0.14, w: 0.09, fn: 'Motor and premotor cortex propose possible actions and send excitatory glutamate input to the striatum. The basal ganglia do not initiate every movement directly; they help select, permit, suppress, and scale competing motor programs.', brodmann: 'Motor/premotor cortical areas: BA 4 and BA 6', blood: 'Middle cerebral artery and anterior cerebral artery territories.', conditions: 'Frontal cortical lesions can mimic basal-ganglia movement problems by impairing initiation, sequencing, or inhibition of actions.', damage: 'Poor movement planning, apraxia-like difficulty, or weakness depending on cortical region involved.' },

                { id: 'striatum_d1_bg', name: t('stem.brainatlas.bg_striatum_d1', 'Striatum D1 (Direct / GO)'), x: 0.31, y: 0.38, w: 0.09, fn: 'The direct pathway starts in D1 medium spiny neurons of the striatum (caudate and putamen). D1 neurons inhibit GPi/SNr, reducing the brake on thalamus so selected movement can pass through.', brodmann: 'Subcortical basal ganglia nucleus', blood: 'Lenticulostriate branches of the middle cerebral artery.', conditions: 'D1 pathway underactivity contributes to hypokinesia in Parkinson disease. Excess facilitation can contribute to dyskinesias.', damage: 'Reduced direct pathway output makes voluntary movement harder to initiate and scale.' },

                { id: 'striatum_d2_bg', name: t('stem.brainatlas.bg_striatum_d2', 'Striatum D2 (Indirect / NO-GO)'), x: 0.31, y: 0.62, w: 0.09, fn: 'The indirect pathway starts in D2 medium spiny neurons. It suppresses competing actions through GPe, STN, and GPi/SNr, increasing the thalamic brake when movement should be held back.', brodmann: 'Subcortical basal ganglia nucleus', blood: 'Lenticulostriate branches of the middle cerebral artery.', conditions: 'Early Huntington disease preferentially injures indirect-pathway striatal neurons, reducing the NO-GO brake and producing chorea.', damage: 'Indirect pathway loss causes excess unwanted movement; overactivity contributes to slowness and rigidity.' },

                { id: 'gpe_bg', name: t('stem.brainatlas.bg_gpe', 'Globus Pallidus Externus (GPe)'), x: 0.50, y: 0.68, w: 0.09, fn: 'GPe is a key relay of the indirect pathway. It normally inhibits the subthalamic nucleus. When striatal D2 neurons inhibit GPe, STN becomes more active.', brodmann: 'Subcortical basal ganglia nucleus', blood: 'Anterior choroidal and lenticulostriate arteries.', conditions: 'GPe dysfunction participates in Parkinsonian beta oscillations and abnormal movement suppression.', damage: 'Disrupted GPe output can impair the balance between movement release and movement suppression.' },

                { id: 'stn_bg', name: t('stem.brainatlas.bg_stn', 'Subthalamic Nucleus (STN)'), x: 0.66, y: 0.66, w: 0.09, fn: 'STN excites GPi/SNr. In the indirect pathway this strengthens the brake on thalamus. Deep brain stimulation of STN can reduce Parkinson symptoms by disrupting pathological circuit activity.', brodmann: 'Subthalamic nucleus', blood: 'Posterior communicating and posterior cerebral artery perforators.', conditions: 'STN lesion classically causes contralateral hemiballismus: flinging, violent movements. STN deep brain stimulation is used for selected Parkinson patients.', damage: 'Loss of STN output reduces the inhibitory brake and can cause large-amplitude involuntary movement.' },

                { id: 'gpi_snr_bg', name: t('stem.brainatlas.bg_gpi_snr', 'GPi / SNr Output Brake'), x: 0.70, y: 0.42, w: 0.09, fn: 'GPi and SNr are the major inhibitory output nuclei of the basal ganglia. They tonically inhibit thalamus. Direct pathway turns this brake down; indirect pathway turns this brake up.', brodmann: 'Subcortical basal ganglia output nuclei', blood: 'Anterior choroidal, posterior communicating, and perforating branches.', conditions: 'GPi deep brain stimulation can treat Parkinson disease and dystonia. Output imbalance underlies hypokinetic and hyperkinetic movement disorders.', damage: 'Too much output produces reduced movement; too little output permits unwanted movement.' },

                { id: 'thalamus_bg', name: t('stem.brainatlas.bg_thalamus', 'Thalamus (VA/VL)'), x: 0.73, y: 0.20, w: 0.09, fn: 'VA/VL thalamic nuclei relay motor-loop output back to cortex. When GPi/SNr inhibition is reduced, thalamus can excite motor cortex and help movement proceed.', brodmann: 'VA/VL thalamic nuclei', blood: 'Posterior cerebral artery perforators and thalamogeniculate branches.', conditions: 'Thalamic stroke can produce movement abnormalities, tremor, sensory loss, or thalamic pain depending on nuclei involved.', damage: 'Disrupted motor relay produces impaired movement scaling, tremor, or abnormal motor feedback.' },

                { id: 'snc_dopamine_bg', name: t('stem.brainatlas.bg_snc_dopamine', 'Substantia Nigra pars compacta (Dopamine)'), x: 0.18, y: 0.76, w: 0.09, fn: 'SNc dopamine modulates the striatum: it excites D1 direct-pathway neurons and inhibits D2 indirect-pathway neurons. Net effect: dopamine makes selected movement easier to release.', brodmann: 'Midbrain dopaminergic nucleus', blood: 'Posterior cerebral and superior cerebellar artery perforators.', conditions: 'Parkinson disease is caused by degeneration of SNc dopaminergic neurons, producing bradykinesia, rigidity, resting tremor, and postural instability.', damage: 'Dopamine loss weakens GO signaling and strengthens NO-GO braking, causing hypokinetic movement.' },

                { id: 'direct_path_bg', name: t('stem.brainatlas.bg_direct_pathway', 'Direct Pathway: GO'), x: 0.49, y: 0.30, w: 0.09, fn: 'Direct pathway: Cortex excites striatum D1; D1 inhibits GPi/SNr; GPi/SNr releases thalamus from inhibition; thalamus excites cortex. The practical result is movement facilitation.', brodmann: 'Circuit pathway', blood: 'Depends on cortex, striatum, pallidum, and thalamus supply.', conditions: 'Underactive direct pathway contributes to Parkinsonian bradykinesia. Excess direct facilitation can contribute to dyskinesia.', damage: 'Difficulty initiating desired movement or controlling movement amplitude.' },

                { id: 'indirect_path_bg', name: t('stem.brainatlas.bg_indirect_pathway', 'Indirect Pathway: NO-GO'), x: 0.55, y: 0.82, w: 0.09, fn: 'Indirect pathway: Cortex excites striatum D2; D2 inhibits GPe; STN becomes more active; STN excites GPi/SNr; GPi/SNr inhibits thalamus. The practical result is suppression of competing movement.', brodmann: 'Circuit pathway', blood: 'Depends on cortex, striatum, GPe, STN, GPi/SNr, and thalamus supply.', conditions: 'Indirect pathway loss is central to early Huntington chorea. Excess indirect activity contributes to Parkinsonian slowness and rigidity.', damage: 'Too little NO-GO signaling permits unwanted movements; too much suppresses intended movement.' },

                { id: 'movement_disorder_decoder_bg', name: t('stem.brainatlas.bg_movement_disorder_decoder', 'Movement Disorder Decoder'), x: 0.50, y: 0.15, w: 0.12, fn: 'A clinical shortcut for the basal ganglia loop. Parkinson disease usually means too little dopamine: weaker direct GO signaling and stronger indirect NO-GO braking, so movement is hard to start. Huntington disease early on preferentially weakens indirect NO-GO output, allowing unwanted chorea. Subthalamic nucleus injury weakens the brake-driving signal to GPi/SNr and can produce contralateral hemiballismus. Too much or poorly timed facilitation can contribute to dyskinesia.', brodmann: 'Clinical loop decoder across SNc dopamine, D1/D2 striatum, STN, GPi/SNr, thalamus, and motor cortex', blood: 'Depends on the affected node: lenticulostriate, anterior choroidal, posterior communicating, posterior cerebral perforators, or midbrain perforators.', conditions: 'Parkinson disease, Huntington disease, hemiballismus from STN lesion, medication-induced dyskinesia, dystonia, and tremor syndromes can all be framed as imbalance in GO, NO-GO, dopamine, and output brake signals.', damage: 'Use movement amount and pattern to reason backward: too much brake gives slowness and rigidity, too little brake permits unwanted movement, dopamine loss shifts the loop toward under-movement, and STN loss can release large ballistic movement.' }

              ]

            },

            limbicPapezLoop: {

              name: t('stem.brainatlas.limbic_papez_loop', 'Limbic / Papez Loop'), desc: t('stem.brainatlas.limbic_papez_loop_desc', 'Memory-emotion circuit linking hippocampus, cingulate, amygdala, and hypothalamus'),

              isLimbicPapez: true,

              regions: [

                { id: 'hippocampus_limbic', name: t('stem.brainatlas.limbic_hippocampus', 'Hippocampus'), x: 0.22, y: 0.58, w: 0.08, fn: 'The hippocampus helps bind new episodic memories and spatial context. In the Papez circuit it sends output through the fornix toward mammillary bodies, then receives processed cortical return input through entorhinal cortex.', brodmann: 'Archicortex; hippocampal formation', blood: 'Posterior cerebral artery hippocampal branches and anterior choroidal contributions.', conditions: 'Early Alzheimer disease commonly affects medial temporal memory systems. Bilateral hippocampal injury causes profound anterograde amnesia. Temporal lobe epilepsy often involves hippocampal sclerosis.', damage: 'Difficulty forming new declarative memories, spatial disorientation, and impaired context binding.' },

                { id: 'fornix_limbic', name: t('stem.brainatlas.limbic_fornix', 'Fornix'), x: 0.36, y: 0.47, w: 0.08, fn: 'The fornix is a major white-matter output tract from hippocampus. It carries memory-related signals to mammillary bodies, septal region, and hypothalamus.', brodmann: 'White matter limbic tract', blood: 'Anterior cerebral artery and anterior choroidal artery branches.', conditions: 'Fornix injury from tumors, surgery, hydrocephalus, or traumatic shearing can cause memory impairment that resembles hippocampal damage.', damage: 'Anterograde amnesia and impaired spatial or episodic memory encoding.' },

                { id: 'mammillary_limbic', name: t('stem.brainatlas.limbic_mammillary', 'Mammillary Bodies'), x: 0.50, y: 0.68, w: 0.08, fn: 'Mammillary bodies are paired hypothalamic nuclei in the classic Papez memory circuit. They receive hippocampal output through fornix and project to anterior thalamus through the mammillothalamic tract.', brodmann: 'Hypothalamic nuclei', blood: 'Posterior cerebral and posterior communicating artery branches.', conditions: 'Thiamine deficiency in Wernicke-Korsakoff syndrome injures mammillary bodies, contributing to severe memory problems and confabulation.', damage: 'Severe memory impairment, especially when bilateral or combined with thalamic involvement.' },

                { id: 'mammillothalamic_limbic', name: t('stem.brainatlas.limbic_mammillothalamic', 'Mammillothalamic Tract'), x: 0.63, y: 0.55, w: 0.08, fn: 'The mammillothalamic tract carries signals from mammillary bodies to anterior thalamic nuclei. It is a narrow relay, so small lesions can disrupt the Papez loop.', brodmann: 'White matter tract', blood: 'Thalamoperforating and posterior communicating artery region.', conditions: 'Diencephalic stroke or tumor can injure this tract and produce disproportionate memory impairment.', damage: 'Disconnection of mammillary body output from anterior thalamus, impairing memory consolidation.' },

                { id: 'anterior_thalamus_limbic', name: t('stem.brainatlas.limbic_anterior_thalamus', 'Anterior Thalamic Nucleus'), x: 0.72, y: 0.38, w: 0.08, fn: 'Anterior thalamic nuclei relay Papez circuit information to cingulate cortex. They are important for memory, navigation, and attention to internally relevant context.', brodmann: 'Anterior thalamic nuclei', blood: 'Thalamoperforating and polar artery branches.', conditions: 'Anterior thalamic stroke can cause amnesia, disorientation, apathy, or executive-memory problems.', damage: 'Memory impairment, poor orientation, reduced initiative, and disrupted limbic-cortical relay.' },

                { id: 'cingulate_limbic', name: t('stem.brainatlas.limbic_cingulate', 'Cingulate Cortex'), x: 0.50, y: 0.19, w: 0.08, fn: 'Cingulate cortex links memory, attention, pain, motivation, and emotional salience. In Papez circuit it receives anterior thalamic input and sends signals back toward medial temporal memory cortex.', brodmann: 'BA 24, 23, 31, 32', blood: 'Anterior cerebral artery and posterior cerebral artery branches.', conditions: 'Anterior cingulate lesions can produce apathy or akinetic mutism. Cingulate and posterior cingulate changes are important in depression, pain, attention, and default-mode network disorders.', damage: 'Apathy, reduced motivation, impaired conflict monitoring, pain-affect disruption, or memory-network disconnection.' },

                { id: 'cingulum_limbic', name: t('stem.brainatlas.limbic_cingulum', 'Cingulum Bundle'), x: 0.35, y: 0.27, w: 0.08, fn: 'The cingulum bundle is a white-matter highway under cingulate cortex. It carries signals from cingulate and medial frontal regions toward parahippocampal and entorhinal cortex.', brodmann: 'Association white matter tract', blood: 'ACA and PCA branch territories along medial cortex.', conditions: 'White-matter disease, traumatic brain injury, or neurodegeneration can weaken cingulum connectivity and affect attention, mood, and memory.', damage: 'Disrupted communication between medial frontal/cingulate systems and medial temporal memory networks.' },

                { id: 'entorhinal_limbic', name: t('stem.brainatlas.limbic_entorhinal', 'Entorhinal / Parahippocampal Cortex'), x: 0.24, y: 0.35, w: 0.08, fn: 'Entorhinal cortex is the main cortical gateway into hippocampus. It supports memory encoding, spatial maps, and contextual association.', brodmann: 'Medial temporal cortex including BA 28/34 region', blood: 'Posterior cerebral artery and anterior choroidal contributions.', conditions: 'Entorhinal cortex is one of the earliest cortical regions affected by Alzheimer pathology. Temporal-lobe seizures can involve this gateway.', damage: 'Poor new-memory encoding, spatial/context confusion, and impaired hippocampal input.' },

                { id: 'amygdala_limbic', name: t('stem.brainatlas.limbic_amygdala', 'Amygdala'), x: 0.25, y: 0.72, w: 0.08, fn: 'The amygdala detects emotional salience, especially threat, and helps tag memories with emotion. It communicates with hippocampus for emotional memory and with hypothalamus/brainstem for autonomic responses.', brodmann: 'Medial temporal subcortical nuclei', blood: 'Anterior choroidal artery and MCA/PCA temporal branches.', conditions: 'PTSD and anxiety can involve hyperresponsive threat circuits. Bilateral amygdala damage contributes to Kluver-Bucy syndrome with reduced fear and abnormal social/emotional behavior.', damage: 'Impaired fear recognition, emotional blunting, altered threat learning, or excessive/poorly regulated autonomic responses.' },

                { id: 'hypothalamus_limbic', name: t('stem.brainatlas.limbic_hypothalamus', 'Hypothalamus'), x: 0.50, y: 0.82, w: 0.08, fn: 'The hypothalamus turns emotional and homeostatic signals into autonomic, endocrine, hunger, thirst, temperature, and circadian responses.', brodmann: 'Diencephalon; hypothalamic nuclei', blood: 'Circle of Willis perforators and superior hypophyseal branches.', conditions: 'Hypothalamic dysfunction can cause temperature, appetite, sleep, endocrine, or autonomic abnormalities. Amygdala-hypothalamus signaling helps explain racing heart and sweating during fear.', damage: 'Autonomic instability, endocrine problems, sleep-wake disruption, appetite/thirst changes, or impaired stress response.' },

                { id: 'prefrontal_limbic', name: t('stem.brainatlas.limbic_prefrontal', 'Medial Prefrontal Regulation'), x: 0.78, y: 0.22, w: 0.08, fn: 'Medial and orbitofrontal prefrontal cortex help regulate amygdala reactivity, value, social judgment, impulse control, and emotion-guided decisions.', brodmann: 'Medial/orbitofrontal cortex: BA 10, 11, 12, 24, 32', blood: 'ACA and MCA frontal branches.', conditions: 'Prefrontal-limbic dysregulation is relevant to depression, anxiety, PTSD, addiction, impulsivity, and social behavior changes after frontal injury.', damage: 'Disinhibition, poor emotional regulation, impulsive decisions, apathy, or altered social judgment.' },

                { id: 'papez_path_limbic', name: t('stem.brainatlas.limbic_papez_path', 'Papez Memory Loop'), x: 0.50, y: 0.50, w: 0.08, fn: 'Papez circuit: hippocampus -> fornix -> mammillary bodies -> mammillothalamic tract -> anterior thalamus -> cingulate cortex -> cingulum/entorhinal cortex -> hippocampus. It is a memory and context loop, not a single emotion center.', brodmann: 'Circuit pathway', blood: 'Depends on medial temporal, hypothalamic, thalamic, cingulate, and medial cortical supply.', conditions: 'Damage at multiple nodes can cause amnesia. Wernicke-Korsakoff syndrome, thalamic stroke, hippocampal injury, and fornix damage all illustrate different weak points.', damage: 'Disrupted episodic memory consolidation, context binding, navigation, or recall.' },

                { id: 'emotion_output_limbic', name: t('stem.brainatlas.limbic_emotion_output', 'Amygdala Emotion Output'), x: 0.37, y: 0.83, w: 0.08, fn: 'Amygdala output to hypothalamus and brainstem helps convert emotion into body state: heart rate, sweating, freezing, startle, stress hormones, and defensive behavior.', brodmann: 'Circuit pathway', blood: 'Medial temporal, hypothalamic, and brainstem supply.', conditions: 'Panic, PTSD hyperarousal, and autonomic fear responses are easier to understand when emotion is linked to hypothalamic/brainstem output.', damage: 'Blunted fear/autonomic response if underactive; exaggerated threat response if overactive or poorly regulated.' },

                { id: 'memory_emotion_decoder_limbic', name: t('stem.brainatlas.limbic_memory_emotion_decoder', 'Memory-Emotion Decoder'), x: 0.50, y: 0.15, w: 0.12, fn: 'A clinical shortcut for reading limbic findings. New-learning failure points toward hippocampus, entorhinal cortex, fornix, or connected medial temporal memory systems. Confabulation with severe amnesia raises concern for mammillary body, mammillothalamic, or anterior thalamic injury. Strong fear tagging, hypervigilance, panic, or trauma-cue reactivity points toward amygdala and hypothalamic body-output systems. Poor top-down calming, impulsivity, or emotional dysregulation points toward medial prefrontal and cingulate regulation.', brodmann: 'Clinical pattern map across hippocampus, fornix, mammillary bodies, anterior thalamus, cingulate, amygdala, hypothalamus, and medial prefrontal cortex', blood: 'Depends on the injured node: PCA medial temporal branches, anterior choroidal contributions, thalamoperforators, posterior communicating branches, ACA, or MCA frontal branches.', conditions: 'Anterograde amnesia, early Alzheimer disease, Wernicke-Korsakoff syndrome, thalamic amnesia, PTSD, panic, anxiety, depression, impulsivity, and frontal-limbic dysregulation can all be framed by this decoder.', damage: 'Reason from the symptom pattern: cannot form new memories suggests medial temporal or Papez-loop damage; confabulation suggests diencephalic memory relay injury; excessive fear-body output suggests amygdala-hypothalamus drive; poor regulation suggests prefrontal-cingulate control failure.' }

              ]

            },

            neurotransmitters: {

              name: t('stem.brainatlas.neurotransmitters', '\u26A1 Neurotransmitters'), desc: t('stem.brainatlas.complete_reference_synthesis_receptors', 'Complete reference: synthesis, receptors, pathways, functions, pharmacology'),

              isNT: true,

              regions: [

                { id: 'dopamine', name: t('stem.brainatlas.dopamine_da', 'Dopamine (DA)'), x: 0.30, y: 0.35, w: 0.08, category: 'Catecholamine (Monoamine)', synthesis: 'Tyrosine \u2192 L-DOPA (tyrosine hydroxylase, rate-limiting) \u2192 Dopamine (DOPA decarboxylase). Stored in synaptic vesicles via VMAT2.', receptors: 'D1-like (D1, D5): Gs-coupled, excitatory, increase cAMP. D2-like (D2, D3, D4): Gi-coupled, inhibitory, decrease cAMP. D2 autoreceptors regulate release.', pathways: 'Mesolimbic (VTA \u2192 nucleus accumbens): reward/motivation. Mesocortical (VTA \u2192 PFC): cognition/executive function. Nigrostriatal (substantia nigra \u2192 striatum): motor control. Tuberoinfundibular (hypothalamus \u2192 pituitary): inhibits prolactin.', fn: 'Reward-prediction and motivation signaling (the "pleasure chemical" framing oversimplifies), motor control, executive function, working memory, attention, hormonal regulation (prolactin inhibition).', conditions: 'Parkinson disease: nigrostriatal DA depletion. Schizophrenia: mesolimbic DA excess (positive symptoms), mesocortical DA deficit (negative symptoms). ADHD: prefrontal DA/NE dysregulation. Addiction: mesolimbic hijacking.', drugs: 'L-DOPA/carbidopa (Parkinson). Antipsychotics: D2 blockers (haloperidol, risperidone). Stimulants: methylphenidate, amphetamine (block DAT/increase release). Cocaine blocks DAT. Pramipexole (D2/D3 agonist).', damage: 'Loss of dopamine neurons leads to bradykinesia, rigidity, and tremor in Parkinson disease; excess dopamine activity causes psychosis and hallucinations.' },

                { id: 'serotonin', name: t('stem.brainatlas.serotonin_5_ht', 'Serotonin (5-HT)'), x: 0.50, y: 0.60, w: 0.08, category: 'Indolamine (Monoamine)', synthesis: 'Tryptophan \u2192 5-hydroxytryptophan (tryptophan hydroxylase, rate-limiting) \u2192 Serotonin (aromatic amino acid decarboxylase). 90% in gut enterochromaffin cells; only 2% in brain (raphe nuclei).', receptors: '7 families (5-HT1\u20137), 14+ subtypes. 5-HT1A: anxiolytic target (buspirone). 5-HT2A: psychedelic target, antipsychotic target. 5-HT3: ionotropic (ondansetron target, antiemetic). 5-HT4: GI motility.', pathways: 'Raphe nuclei (dorsal and median) project widely to cortex, limbic system, basal ganglia, hypothalamus, brainstem, spinal cord. Most widespread monoamine projection system in brain.', fn: 'Mood modulation (the serotonin/monoamine hypothesis of depression is contested), anxiety modulation, sleep-wake cycle, appetite, pain perception, thermoregulation, GI motility, platelet aggregation, nausea/vomiting control.', conditions: 'Depression: monoamine hypothesis (5-HT deficit). Anxiety disorders. OCD (5-HT circuit dysfunction). Migraine (5-HT vasoconstriction). Carcinoid syndrome: serotonin-secreting tumor (flushing, diarrhea, wheezing). Serotonin syndrome: excess 5-HT (hyperthermia, rigidity, clonus).', drugs: 'SSRIs (fluoxetine, sertraline): block SERT. SNRIs (venlafaxine). TCAs (amitriptyline). MAOIs (phenelzine). Triptans (5-HT1B/1D agonists for migraine). Ondansetron (5-HT3 antagonist, antiemetic). Buspirone (5-HT1A partial agonist). LSD/psilocybin (5-HT2A agonists).', damage: 'Serotonin depletion contributes to depression, insomnia, impulsivity, and increased pain sensitivity; excess causes serotonin syndrome with potentially fatal hyperthermia.' },

                { id: 'norepinephrine', name: t('stem.brainatlas.norepinephrine_ne', 'Norepinephrine (NE)'), x: 0.40, y: 0.30, w: 0.08, category: 'Catecholamine (Monoamine)', synthesis: 'Tyrosine \u2192 L-DOPA \u2192 Dopamine \u2192 Norepinephrine (dopamine \u03B2-hydroxylase, in synaptic vesicles). NE is the immediate precursor to epinephrine in the adrenal medulla.', receptors: '\u03B11: Gq, vasoconstriction, mydriasis. \u03B12: Gi, presynaptic autoreceptor (inhibits NE release), central sedation. \u03B21: Gs, increases heart rate/contractility. \u03B22: Gs, bronchodilation, vasodilation. \u03B23: Gs, lipolysis.', pathways: 'Locus coeruleus (LC) in dorsal pons projects to entire cerebral cortex, hippocampus, amygdala, cerebellum, spinal cord. Primary arousal/alertness center. Lateral tegmental system: autonomic regulation.', fn: 'Arousal, alertness, attention, vigilance, stress response (fight-or-flight), mood regulation, blood pressure regulation, pain modulation, memory consolidation during emotional events.', conditions: 'Depression (NE deficit). PTSD (NE hyperactivity, hyperarousal). Orthostatic hypotension (NE insufficiency). Pheochromocytoma: NE/epinephrine-secreting adrenal tumor \u2192 episodic hypertension, tachycardia, headache, diaphoresis.', drugs: 'SNRIs (duloxetine, venlafaxine). NRIs (atomoxetine for ADHD). TCAs (desipramine: NE-selective). Clonidine (\u03B12 agonist, central sympatholytic). Prazosin (\u03B11 blocker, PTSD nightmares). Propranolol (\u03B2-blocker). Phenylephrine (\u03B11 agonist, decongestant).', damage: 'Norepinephrine dysregulation causes attention deficits, autonomic dysfunction, depression, and impaired stress response.' },

                { id: 'acetylcholine', name: t('stem.brainatlas.acetylcholine_ach', 'Acetylcholine (ACh)'), x: 0.55, y: 0.40, w: 0.08, category: 'Cholinergic (Ester)', synthesis: 'Choline + Acetyl-CoA \u2192 ACh (choline acetyltransferase, ChAT). Degraded in synaptic cleft by acetylcholinesterase (AChE). Choline recycled via high-affinity choline transporter.', receptors: 'Nicotinic (nAChR): ligand-gated ion channels. NMJ type (\u03B11)2\u03B21\u03B4\u03B5: muscle contraction. CNS types (\u03B14\u03B22, \u03B17): cognition, attention. Muscarinic (mAChR): G-protein coupled. M1 (Gq): cognition. M2 (Gi): heart (slows HR). M3 (Gq): smooth muscle, glands.', pathways: 'Basal nucleus of Meynert \u2192 cortex (cognition/memory). Pedunculopontine nucleus \u2192 thalamus (arousal/REM sleep). Medial septum \u2192 hippocampus (memory). Motor neurons \u2192 NMJ (voluntary movement). Preganglionic autonomic neurons.', fn: 'Muscle contraction at NMJ, memory formation and retrieval, attention, arousal, REM sleep, autonomic function (parasympathetic: rest-and-digest), learning and cortical plasticity.', conditions: 'Alzheimer disease: loss of cholinergic neurons from nucleus basalis of Meynert. Myasthenia gravis: anti-nAChR antibodies at NMJ. Lambert-Eaton: anti-VGCC antibodies (presynaptic). Organophosphate poisoning: AChE inhibition \u2192 cholinergic crisis.', drugs: 'Donepezil, rivastigmine (AChE inhibitors for Alzheimer). Atropine (muscarinic antagonist). Pilocarpine (muscarinic agonist, glaucoma). Succinylcholine (depolarizing NMJ blocker). Neostigmine (AChE inhibitor for myasthenia). Nicotine (nAChR agonist). Botulinum toxin (blocks ACh release).', damage: 'ACh depletion causes memory loss, cognitive decline, and is the primary neurochemical deficit in Alzheimer disease; NMJ dysfunction causes muscle weakness.' },

                { id: 'gaba', name: t('stem.brainatlas.gaba_aminobutyric_acid', 'GABA (\u03B3-Aminobutyric Acid)'), x: 0.60, y: 0.25, w: 0.08, category: 'Amino Acid (Inhibitory)', synthesis: 'Glutamate \u2192 GABA (glutamic acid decarboxylase/GAD, requires vitamin B6/pyridoxal phosphate as cofactor). Degraded by GABA transaminase (GABA-T). Most abundant inhibitory NT in CNS (~40% of synapses).', receptors: 'GABA-A: ligand-gated Cl\u207B channel (fast inhibition). Has binding sites for benzodiazepines (\u03B1/\u03B3 subunit interface), barbiturates, ethanol, neurosteroids, propofol. GABA-B: Gi/Go-coupled GPCR (slow, prolonged inhibition). Baclofen target.', pathways: 'Ubiquitous inhibitory interneurons throughout cortex, hippocampus, basal ganglia, cerebellum (Purkinje cells), thalamus. Striatal medium spiny neurons (GABAergic output of basal ganglia). Reticular thalamic nucleus gates thalamic relay.', fn: 'Primary inhibitory neurotransmission, reduces neuronal excitability, prevents seizures, regulates muscle tone, anxiolysis, sleep induction, motor coordination, thalamic gating of sensory information.', conditions: 'Epilepsy (GABA/glutamate imbalance). Anxiety disorders (insufficient GABAergic tone). Huntington disease (loss of GABAergic MSNs in striatum). Hepatic encephalopathy (excess GABA-like substances). Status epilepticus. Stiff-person syndrome (anti-GAD antibodies).', drugs: 'Benzodiazepines (diazepam, lorazepam): positive allosteric modulators of GABA-A. Barbiturates (phenobarbital): prolong Cl\u207B channel opening. Vigabatrin (irreversible GABA-T inhibitor). Tiagabine (GABA reuptake inhibitor). Baclofen (GABA-B agonist, spasticity). Zolpidem (\u03B11-selective, sleep). Propofol, ethanol (GABA-A modulation).', damage: 'GABA deficiency leads to seizures, anxiety, and movement disorders; excessive GABAergic activity causes sedation, coma, and respiratory depression.' },

                { id: 'glutamate', name: t('stem.brainatlas.glutamate_glu', 'Glutamate (Glu)'), x: 0.45, y: 0.20, w: 0.08, category: 'Amino Acid (Excitatory)', synthesis: 'From glutamine (glutaminase in neurons), \u03B1-ketoglutarate (transamination), or recycled from synaptic cleft by astrocytes (glutamate-glutamine cycle). Most abundant excitatory NT in CNS (~90% of excitatory synapses).', receptors: 'Ionotropic: NMDA (Na\u207A/Ca\u00B2\u207A, voltage-dependent Mg\u00B2\u207A block, requires glycine co-agonist \u2014 critical for LTP/memory). AMPA (Na\u207A, fast excitation). Kainate (Na\u207A). Metabotropic: mGluR1\u20138 (Gq or Gi coupled, modulatory).', pathways: 'Virtually all excitatory projection neurons in cortex, hippocampus, thalamus, brainstem. Corticospinal, corticothalamic, thalamocortical, hippocampal trisynaptic circuit (perforant path \u2192 DG \u2192 CA3 \u2192 CA1). Cerebellar granule cells.', fn: 'Primary excitatory neurotransmission, learning and memory (LTP via NMDA receptors), synaptic plasticity, brain development, sensory processing, motor control, cognition.', conditions: 'Excitotoxicity: excessive glutamate \u2192 neuronal death (stroke, TBI, neurodegeneration). ALS: glutamate excitotoxicity (riluzole reduces). Epilepsy (glutamate/GABA imbalance). NMDA receptor encephalitis (anti-NMDAR antibodies). Hepatic encephalopathy.', drugs: 'Memantine (NMDA antagonist, moderate-severe Alzheimer). Riluzole (reduces glutamate release, ALS). Ketamine (NMDA antagonist, anesthesia, rapid-acting antidepressant). PCP (NMDA antagonist, psychosis). Lamotrigine (reduces glutamate release, epilepsy/bipolar). Topiramate (blocks AMPA/kainate).', damage: 'Excess glutamate causes excitotoxic neuronal death in stroke and neurodegeneration; NMDA dysfunction impairs memory formation and synaptic plasticity.' },

                { id: 'glycine', name: t('stem.brainatlas.glycine', 'Glycine'), x: 0.55, y: 0.70, w: 0.08, category: 'Amino Acid (Inhibitory)', synthesis: 'From serine (serine hydroxymethyltransferase) or dietary intake. Simplest amino acid. Dual role: inhibitory NT in spinal cord/brainstem, and obligatory co-agonist at NMDA receptors in brain.', receptors: 'Glycine receptors (GlyR): ligand-gated Cl\u207B channels, primarily in spinal cord and brainstem. Strychnine-sensitive. Also binds glycine site on NMDA receptor (strychnine-insensitive). GlyT1/GlyT2 transporters for reuptake.', pathways: 'Renshaw cell inhibition in spinal cord (recurrent inhibition of motor neurons). Brainstem auditory and vestibular nuclei. Retinal amacrine cells. NMDA receptor co-agonism throughout cortex.', fn: 'Inhibitory neurotransmission in spinal cord and brainstem, motor neuron regulation, pain modulation, NMDA receptor co-activation for synaptic plasticity, auditory/visual processing.', conditions: 'Hyperekplexia (startle disease): glycine receptor mutations. Glycine encephalopathy (nonketotic hyperglycinemia): neonatal seizures. Strychnine poisoning: GlyR antagonism \u2192 unopposed excitation \u2192 convulsions, opisthotonus.', drugs: 'Strychnine (GlyR antagonist, poison). D-serine and sarcosine (GlyT1 inhibitors, investigated for schizophrenia as NMDA enhancers). Glycine supplementation studied for schizophrenia negative symptoms.', damage: 'Glycine receptor dysfunction causes excessive startle reflexes, spasticity, and convulsions; as NMDA co-agonist, glycine modulation affects learning and memory.' },

                { id: 'histamine', name: t('stem.brainatlas.histamine', 'Histamine'), x: 0.35, y: 0.25, w: 0.08, category: 'Monoamine (Imidazole)', synthesis: 'Histidine \u2192 Histamine (histidine decarboxylase). In CNS: tuberomammillary nucleus (TMN) of posterior hypothalamus. Also in mast cells (immune), ECL cells of stomach (acid secretion). Degraded by histamine N-methyltransferase (HNMT) in brain.', receptors: 'H1: Gq, wakefulness, allergic response, smooth muscle contraction. H2: Gs, gastric acid secretion, cardiac contractility. H3: Gi/Go, presynaptic autoreceptor (CNS), regulates histamine/other NT release. H4: Gi, immune cells, inflammation.', pathways: 'TMN of posterior hypothalamus projects to entire cerebral cortex, thalamus, basal ganglia, hippocampus, amygdala, brainstem. Part of ascending arousal system. Active during wakefulness, silent during sleep.', fn: 'Wakefulness and arousal, circadian rhythm regulation, attention, learning, gastric acid secretion, immune and allergic responses, appetite regulation, thermoregulation.', conditions: 'Narcolepsy type 2 (partial histamine deficiency). Allergic responses (mast cell histamine release). Peptic ulcer disease (H2-mediated acid hypersecretion). Systemic mastocytosis. Scombroid fish poisoning (histamine toxicity).', drugs: 'H1 antihistamines: diphenhydramine, cetirizine (allergy). First-gen H1 blockers: sedating (cross BBB). H2 blockers: ranitidine, famotidine (acid reflux). H3 antagonists/inverse agonists: pitolisant (narcolepsy, promotes wakefulness). Betahistine (vertigo).', damage: 'Histamine deficiency impairs wakefulness and causes excessive sleepiness; excess release causes allergic inflammation, bronchoconstriction, and anaphylaxis.' },

                { id: 'endorphins', name: t('stem.brainatlas.endorphins_endorphin', 'Endorphins (\u03B2-Endorphin)'), x: 0.50, y: 0.15, w: 0.08, category: 'Opioid Peptide (Neuropeptide)', synthesis: 'Pro-opiomelanocortin (POMC) \u2192 cleaved into \u03B2-endorphin + ACTH + \u03B1-MSH. POMC expressed in arcuate nucleus of hypothalamus and NTS of brainstem. Also: met-/leu-enkephalin (from proenkephalin), dynorphins (from prodynorphin).', receptors: '\u03BC (mu, MOR): analgesia, euphoria, respiratory depression, constipation (primary opioid drug target). \u03B4 (delta, DOR): analgesia, mood. \u03BA (kappa, KOR): analgesia, dysphoria, diuresis. All Gi/Go-coupled, decrease cAMP, open K\u207A channels, close Ca\u00B2\u207A channels.', pathways: 'Descending pain modulation: PAG \u2192 RVM \u2192 dorsal horn (gate control). Arcuate nucleus projections to PAG, thalamus, amygdala, locus coeruleus. Enkephalin interneurons in dorsal horn. VTA reward circuits (disinhibit dopamine neurons).', fn: 'Endogenous pain modulation (analgesia), stress response, reward and euphoria (runner\u2019s high), immune regulation, mood elevation, appetite regulation, respiratory regulation.', conditions: 'Chronic pain syndromes (endorphin deficit). Opioid use disorder: exogenous opioids hijack endogenous system \u2192 tolerance, dependence, withdrawal. Congenital insensitivity to pain (rare). Stress-induced analgesia on the battlefield.', drugs: 'Morphine, fentanyl, oxycodone (\u03BC agonists, analgesia). Naloxone, naltrexone (\u03BC antagonists, overdose reversal/addiction treatment). Buprenorphine (\u03BC partial agonist, opioid use disorder). Methadone (full \u03BC agonist, maintenance therapy). Tramadol (\u03BC agonist + SNRI).', damage: 'Endorphin system disruption leads to chronic pain, mood disorders, and vulnerability to opioid addiction; excessive opioid receptor activation causes respiratory depression.' },

                { id: 'substance_p', name: t('stem.brainatlas.substance_p', 'Substance P'), x: 0.65, y: 0.55, w: 0.08, category: 'Tachykinin (Neuropeptide)', synthesis: 'Encoded by TAC1 gene (preprotachykinin A). 11-amino acid peptide. Stored in large dense-core vesicles. Co-released with glutamate from C-fiber nociceptive neurons. Also found in gut enteric neurons and immune cells.', receptors: 'NK1 (neurokinin-1) receptor: Gq-coupled, primary target. NK2, NK3 receptors (lower affinity). NK1 receptors abundant in dorsal horn, brainstem emesis center, amygdala, hypothalamus, striatum.', pathways: 'C-fiber nociceptors \u2192 dorsal horn (laminae I and II) for pain transmission. Trigeminal system for head/face pain. Brainstem vomiting center. Striatum (mood/anxiety). Enteric nervous system (GI motility/inflammation).', fn: 'Pain transmission (especially slow, burning pain from C-fibers), neurogenic inflammation (vasodilation, plasma extravasation, mast cell degranulation), emesis, mood and stress regulation, GI motility.', conditions: 'Chronic pain and fibromyalgia (elevated CSF substance P). Migraine (trigeminovascular substance P release). Chemotherapy-induced nausea/vomiting. Inflammatory bowel disease. Depression and anxiety (elevated substance P).', drugs: 'Aprepitant (NK1 antagonist, antiemetic for chemotherapy-induced nausea). Capsaicin cream (depletes substance P from C-fibers, topical pain relief). NK1 antagonists investigated for depression and anxiety.', damage: 'Excess substance P amplifies pain perception, causes neurogenic inflammation, and triggers nausea; depletion impairs pain signaling and protective reflexes.' },

                { id: 'oxytocin', name: t('stem.brainatlas.oxytocin', 'Oxytocin'), x: 0.42, y: 0.10, w: 0.08, category: 'Peptide Hormone/Neurotransmitter', synthesis: '9-amino acid peptide synthesized in paraventricular nucleus (PVN) and supraoptic nucleus (SON) of hypothalamus. Transported via neurophysin I to posterior pituitary for systemic release. Also released centrally from dendrites and axon terminals.', receptors: 'Oxytocin receptor (OXTR): Gq-coupled GPCR. Expressed in uterus, mammary glands, brain (amygdala, hippocampus, hypothalamus, nucleus accumbens, brainstem). Receptor density varies with reproductive state and social experience.', pathways: 'PVN/SON \u2192 posterior pituitary (endocrine release \u2192 blood). PVN \u2192 amygdala, hippocampus, nucleus accumbens, brainstem, spinal cord (central neuromodulation). Dense projections to social brain network.', fn: 'Uterine contractions during labor, milk ejection (let-down reflex), maternal bonding, pair bonding, social trust and recognition, stress reduction, anxiolysis, wound healing, sexual arousal.', conditions: 'Oxytocin deficiency: difficult labor, poor lactation. Williams syndrome (excess social behavior, possibly related to OXT system). Autism spectrum: oxytocin studied as potential treatment for social deficits. Postpartum depression may involve OXT dysregulation.', drugs: 'Pitocin (synthetic oxytocin, labor induction/augmentation, postpartum hemorrhage). Carbetocin (long-acting oxytocin agonist). Intranasal oxytocin (research for autism, social anxiety, PTSD). Atosiban (oxytocin receptor antagonist, preterm labor).', damage: 'Oxytocin deficiency impairs social bonding, lactation, and labor progression; excess can cause uterine hyperstimulation and fetal distress during labor.' },

                { id: 'vasopressin', name: t('stem.brainatlas.vasopressin_adh', 'Vasopressin (ADH)'), x: 0.58, y: 0.10, w: 0.08, category: 'Peptide Hormone/Neurotransmitter', synthesis: '9-amino acid peptide (differs from oxytocin by 2 amino acids). Synthesized in SON (primarily) and PVN of hypothalamus. Transported via neurophysin II to posterior pituitary. Release triggered by increased plasma osmolality (>285 mOsm) or decreased blood volume.', receptors: 'V1a: Gq, vascular smooth muscle vasoconstriction, hepatic glycogenolysis, platelet aggregation. V1b (V3): Gq, anterior pituitary ACTH release. V2: Gs, renal collecting duct (aquaporin-2 insertion for water reabsorption). Central V1a: social behavior.', pathways: 'SON/PVN \u2192 posterior pituitary (endocrine). PVN \u2192 brainstem autonomic centers. Central V1a projections to amygdala and septum (aggression, pair bonding in voles). Osmoreceptor feedback from OVLT and SFO (circumventricular organs).', fn: 'Water reabsorption in kidneys (antidiuretic effect), vasoconstriction, ACTH regulation (stress response), memory consolidation, social behavior (aggression, pair bonding), circadian rhythm, temperature regulation.', conditions: 'Diabetes insipidus: central (no ADH production) or nephrogenic (kidneys unresponsive to ADH) \u2192 polyuria/polydipsia. SIADH (excess ADH): hyponatremia, water retention. Causes: SCLC, CNS disease, drugs.', drugs: 'Desmopressin (V2 agonist: central DI, nocturnal enuresis, hemophilia A/vWD). Vasopressin/terlipressin (V1 agonist: variceal bleeding, vasodilatory shock). Tolvaptan (V2-selective) and conivaptan (non-selective V1a+V2) vaptans (SIADH, hyponatremia). Demeclocycline (induces nephrogenic DI for SIADH).', damage: 'ADH deficiency causes massive water loss and dehydration; excess causes dangerous hyponatremia with cerebral edema, seizures, and coma.' },

                { id: 'melatonin', name: t('stem.brainatlas.melatonin', 'Melatonin'), x: 0.50, y: 0.05, w: 0.08, category: 'Indolamine (Tryptophan derivative)', synthesis: 'Tryptophan \u2192 Serotonin \u2192 N-acetylserotonin (AANAT, rate-limiting, activated by darkness) \u2192 Melatonin (HIOMT). Produced in pineal gland. Synthesis controlled by SCN \u2192 SCG \u2192 pineal pathway. Peaks at 2\u20134 AM, suppressed by light (especially blue, 460nm).', receptors: 'MT1: Gi, sleep onset (inhibits SCN neuronal firing, promotes sleepiness). MT2: Gi, circadian phase-shifting (advances or delays clock). Both expressed in SCN, retina, cerebral arteries, immune cells. MT3/NQO2: enzyme, detoxification.', pathways: 'Pineal gland \u2192 CSF and blood (endocrine hormone). Acts on SCN (master circadian clock) to reinforce day-night rhythm. Also acts on immune cells, GI tract, skin, reproductive organs. Retinal melatonin for local circadian regulation.', fn: 'Circadian rhythm regulation (sleep-wake cycle entrainment), sleep onset facilitation, seasonal reproductive timing (photoperiodism), antioxidant properties, immune modulation, oncostatic effects, body temperature lowering.', conditions: 'Circadian rhythm disorders: delayed sleep phase, jet lag, shift-work disorder, non-24-hour sleep-wake disorder (blind individuals). Age-related melatonin decline \u2192 insomnia in elderly. Pineal tumors: altered melatonin production. Seasonal affective disorder.', drugs: 'Exogenous melatonin (OTC sleep aid, jet lag, circadian disorders). Ramelteon (MT1/MT2 agonist, insomnia). Tasimelteon (MT1/MT2 agonist, non-24-hour disorder in blind). Agomelatine (MT1/MT2 agonist + 5-HT2C antagonist, depression). Suvorexant (orexin antagonist, different mechanism).', damage: 'Melatonin disruption impairs sleep quality, circadian rhythms, and may increase cancer risk; chronic circadian misalignment is associated with metabolic and cardiovascular disease.' },

                { id: 'nitric_oxide', name: t('stem.brainatlas.nitric_oxide_no', 'Nitric Oxide (NO)'), x: 0.70, y: 0.35, w: 0.08, category: 'Gaseous Neurotransmitter', synthesis: 'L-arginine \u2192 L-citrulline + NO (nitric oxide synthase: nNOS in neurons, eNOS in endothelium, iNOS in immune cells). Not stored in vesicles \u2014 synthesized on demand, diffuses freely across membranes. Half-life: seconds.', receptors: 'Not a classical receptor. Activates soluble guanylate cyclase (sGC) \u2192 increases cGMP \u2192 smooth muscle relaxation, vasodilation. Also: S-nitrosylation of proteins (post-translational modification). Acts as retrograde messenger at synapses.', pathways: 'Retrograde signaling at glutamatergic synapses (postsynaptic NMDA Ca\u00B2\u207A influx \u2192 nNOS activation \u2192 NO diffuses to presynaptic terminal \u2192 enhances glutamate release). Endothelial NO \u2192 vascular smooth muscle. Nitrergic neurons in enteric NS, penile cavernosal nerves.', fn: 'Vasodilation (blood pressure regulation), retrograde synaptic signaling (LTP), immune defense (macrophage killing of pathogens), GI motility (non-adrenergic non-cholinergic relaxation), penile erection, platelet aggregation inhibition.', conditions: 'Endothelial dysfunction: reduced NO \u2192 hypertension, atherosclerosis. Erectile dysfunction (insufficient cavernosal NO). Septic shock: iNOS overproduction \u2192 massive vasodilation. Migraine: excessive NO \u2192 cerebral vasodilation. Excitotoxicity: excess nNOS contributes to neuronal damage.', drugs: 'Nitroglycerin, isosorbide (NO donors, angina). Sildenafil/tadalafil (PDE5 inhibitors: prevent cGMP breakdown, prolong NO vasodilatory effect, erectile dysfunction and pulmonary hypertension). L-NAME (NOS inhibitor, research). Inhaled NO (pulmonary hypertension in neonates).', damage: 'NO deficiency causes hypertension and impaired synaptic plasticity; excess NO produces oxidative stress, contributes to neurodegeneration, and causes pathological vasodilation in septic shock.' },

                { id: 'anandamide', name: t('stem.brainatlas.anandamide_aea', 'Anandamide (AEA)'), x: 0.30, y: 0.50, w: 0.08, category: 'Endocannabinoid (Lipid)', synthesis: 'N-arachidonoylphosphatidylethanolamine (NAPE) \u2192 Anandamide (NAPE-PLD). Also 2-AG: diacylglycerol \u2192 2-arachidonoylglycerol (DAGL). Synthesized on demand from membrane phospholipids (retrograde messengers). Degraded by FAAH (anandamide) and MAGL (2-AG).', receptors: 'CB1: Gi/Go, most abundant GPCR in brain (cortex, basal ganglia, hippocampus, cerebellum). Presynaptic: inhibits neurotransmitter release (both glutamate and GABA). CB2: Gi/Go, primarily immune cells, microglia, some neurons. Also TRPV1, PPARs.', pathways: 'Retrograde signaling: postsynaptic depolarization/Ca\u00B2\u207A \u2192 endocannabinoid synthesis \u2192 diffuses to presynaptic CB1 \u2192 inhibits NT release (depolarization-induced suppression of inhibition/excitation: DSI/DSE). Widespread modulatory system.', fn: 'Synaptic plasticity modulation (fine-tuning excitation/inhibition balance), pain modulation, appetite stimulation, mood regulation, neuroprotection, fear/memory extinction (new inhibitory learning, not erasure), nausea suppression, immune regulation.', conditions: 'Chronic pain (endocannabinoid deficiency hypothesis). Obesity (overactive endocannabinoid tone). PTSD (impaired fear extinction, CB1 link). Multiple sclerosis spasticity. Epilepsy (CBD-responsive: Dravet, Lennox-Gastaut syndromes). Cannabinoid hyperemesis syndrome.', drugs: 'THC (CB1/CB2 partial agonist, \u0394\u2079-tetrahydrocannabinol from cannabis). CBD (cannabidiol: allosteric modulator, anticonvulsant, Epidiolex for epilepsy). Dronabinol/nabilone (synthetic THC, antiemetic/appetite). Rimonabant (CB1 antagonist, withdrawn: depression risk). FAAH inhibitors (research).', damage: 'Endocannabinoid deficiency may contribute to chronic pain, migraine, and irritable bowel; excessive CB1 activation impairs short-term memory and motivation.' },

                { id: 'atp_adenosine', name: t('stem.brainatlas.atp_adenosine', 'ATP / Adenosine'), x: 0.65, y: 0.45, w: 0.08, category: 'Purinergic (Purine)', synthesis: 'ATP: synthesized in mitochondria (oxidative phosphorylation) and cytoplasm (glycolysis). Stored in synaptic vesicles, often co-released with other NTs. Adenosine: produced from ATP degradation by ectonucleotidases (ATP \u2192 ADP \u2192 AMP \u2192 adenosine). Also from intracellular SAH hydrolysis.', receptors: 'P2X (ATP): ligand-gated cation channels (P2X1-7). P2X3: pain signaling. P2X7: microglial activation, inflammation. P2Y (ATP/ADP/UTP): GPCRs (P2Y1,2,4,6,11,12,13,14). P2Y12: platelet aggregation. Adenosine: A1 (Gi, inhibitory), A2A (Gs, excitatory), A2B (Gs), A3 (Gi).', pathways: 'Purinergic co-transmission at sympathetic, parasympathetic, and sensory nerve terminals. Adenosine: widespread inhibitory neuromodulation, especially active during prolonged wakefulness (homeostatic sleep drive). Basal ganglia A2A-D2 interaction. Glial purinergic signaling.', fn: 'Fast excitatory synaptic transmission (P2X), pain signaling, platelet aggregation, immune cell activation, sleep pressure (adenosine accumulation during wakefulness), vasodilation, neuroprotection, cardioprotection, modulation of other neurotransmitter systems.', conditions: 'Chronic pain (P2X3 overexpression). Thrombosis (P2Y12-mediated platelet activation). Gout (purine metabolism disorder). Migraine (purinergic signaling). Insomnia (adenosine dysregulation). Parkinson disease (A2A receptors on striatopallidal neurons modulate motor function).', drugs: 'Caffeine (A1/A2A adenosine receptor antagonist: promotes wakefulness by blocking sleep-promoting adenosine). Clopidogrel (P2Y12 antagonist, antiplatelet). Adenosine IV (supraventricular tachycardia, diagnostic). Istradefylline (A2A antagonist, Parkinson adjunct). Dipyridamole (inhibits adenosine reuptake). Regadenoson (A2A agonist, cardiac stress test).', damage: 'Excessive extracellular ATP triggers neuroinflammation and pain; adenosine accumulation causes drowsiness but is neuroprotective during ischemia; purinergic dysregulation contributes to chronic pain and neurodegeneration.' },

                { id: 'neuropeptide_y', name: t('stem.brainatlas.neuropeptide_y_npy', 'Neuropeptide Y (NPY)'), x: 0.35, y: 0.15, w: 0.08, category: 'Neuropeptide (Pancreatic polypeptide family)', synthesis: '36-amino acid peptide, one of most abundant neuropeptides in brain. Prepro-NPY \u2192 pro-NPY \u2192 NPY (signal peptidase + carboxypeptidase). Stored in large dense-core vesicles, released during sustained high-frequency firing. Co-released with NE in sympathetic neurons.', receptors: 'Y1: Gi, anxiolysis, vasoconstriction, appetite. Y2: Gi, presynaptic autoreceptor (inhibits NPY and NE release), anxiolysis. Y4: Gi, GI satiety. Y5: Gi, appetite stimulation (feeding). Y6: pseudogene in humans. All GPCRs.', pathways: 'Arcuate nucleus \u2192 PVN (appetite/energy homeostasis, co-expressed with AgRP). Amygdala and hippocampus (stress resilience, anxiolysis). Sympathetic postganglionic neurons (co-released with NE for vasoconstriction). Cortical interneurons. Brainstem (autonomic regulation).', fn: 'Appetite stimulation (most potent orexigenic peptide), energy homeostasis, anxiolysis, stress resilience, vasoconstriction (potentiates NE), circadian rhythms, seizure modulation (anticonvulsant), bone formation, alcohol consumption.', conditions: 'Obesity (NPY overexpression in arcuate \u2192 hyperphagia). Anorexia nervosa (paradoxically elevated NPY). Anxiety and PTSD (low NPY \u2192 vulnerability; high NPY \u2192 resilience). Epilepsy (NPY is endogenous anticonvulsant). Hypertension (vascular NPY/NE co-release).', drugs: 'No FDA-approved NPY drugs yet. NPY Y1/Y5 receptor antagonists: investigated for obesity. NPY Y2 agonists: investigated for epilepsy and anxiety. NPY infusion: research for stress resilience in military populations. Gene therapy: NPY overexpression vectors for epilepsy (preclinical).', damage: 'NPY excess drives overeating and obesity; NPY deficiency reduces stress resilience, increases anxiety, and may lower seizure threshold.' },

                { id: 'epinephrine', name: t('stem.brainatlas.epinephrine_adrenaline', 'Epinephrine (Adrenaline)'), x: 0.70, y: 0.20, w: 0.08, category: 'Catecholamine (Monoamine)', synthesis: 'Norepinephrine \u2192 Epinephrine (PNMT, phenylethanolamine N-methyltransferase, requires cortisol induction). Primarily from adrenal medulla chromaffin cells (80% epinephrine, 20% NE). Minor CNS presence in a few medullary neuron clusters.', receptors: 'Same adrenergic receptors as NE but higher \u03B22 affinity: \u03B11 (vasoconstriction), \u03B12 (feedback inhibition), \u03B21 (cardiac stimulation), \u03B22 (bronchodilation, vasodilation in skeletal muscle, glycogenolysis, relaxes uterine smooth muscle), \u03B23 (lipolysis).', pathways: 'Primarily endocrine (adrenal medulla \u2192 blood \u2192 systemic effects). Small CNS clusters in lateral tegmental area and medulla project to hypothalamus, thalamus, spinal cord. Adrenal medulla innervated by preganglionic sympathetic splanchnic nerves.', fn: 'Acute stress response (fight-or-flight hormone), increases heart rate and contractility, bronchodilation, increases blood glucose (glycogenolysis + gluconeogenesis), redirects blood flow to skeletal muscle, pupil dilation, enhances mental alertness.', conditions: 'Pheochromocytoma: catecholamine-secreting adrenal tumor (episodic HTN, headache, sweating, palpitations). Anaphylaxis: systemic allergic reaction requiring epinephrine. Cardiac arrest: epinephrine in ACLS protocol. Addison disease: decreased catecholamine response.', drugs: 'Epinephrine (EpiPen for anaphylaxis, ACLS, local anesthetic adjuvant to prolong duration via vasoconstriction). Racemic epinephrine (nebulized for croup). Isoproterenol (\u03B2 agonist). Albuterol (\u03B22 agonist, asthma). Ephedrine (indirect sympathomimetic).', damage: 'Epinephrine excess from pheochromocytoma causes hypertensive crises and cardiomyopathy; it is the critical rescue drug for anaphylaxis and cardiac arrest.' }

              ]

            }

,

            neuron: {

              name: t('stem.brainatlas.action_potential', '\u26A1 Action Potential'), desc: t('stem.brainatlas.watch_a_neuron_fire_ion_channels_depol', 'Watch a neuron fire \u2014 ion channels, depolarization, and signal propagation'),

              isNeuron: true,

              regions: [

                { id: 'dendrite', name: t('stem.brainatlas.dendrites', 'Dendrites'), x: 0.08, y: 0.45, w: 0.08, fn: 'Tree-like branching extensions that receive signals from other neurons via synapses. Contain ligand-gated ion channels. Dendritic spines increase surface area. Graded potentials sum at the axon hillock.', conditions: 'Dendritic pruning abnormalities in autism/schizophrenia. Atrophy in chronic stress. Fragile X: excess immature spines.', damage: 'Loss of synaptic input, reduced signal integration, impaired learning.' },

                { id: 'soma', name: t('stem.brainatlas.cell_body_soma', 'Cell Body (Soma)'), x: 0.22, y: 0.45, w: 0.10, fn: 'Contains nucleus with DNA, rough ER (Nissl bodies), mitochondria. Integrates incoming signals. Produces neurotransmitters and ion channel proteins.', conditions: 'Chromatolysis after axonal injury. Lewy bodies in Parkinson. Nuclear inclusions in Huntington.', damage: 'Cell death. Loss of neuron and all connections. Cannot regenerate in most CNS regions.' },

                { id: 'axon_hillock', name: t('stem.brainatlas.axon_hillock', 'Axon Hillock'), x: 0.32, y: 0.45, w: 0.06, fn: 'Transition zone with highest density of voltage-gated Na\u207A channels. Lowest threshold for action potential initiation (\u221255mV). All-or-nothing decision point.', conditions: 'Epilepsy: abnormally low thresholds. Na\u207A channelopathies alter firing threshold.', damage: 'Inability to generate action potentials. Complete loss of signal transmission.' },

                { id: 'myelin', name: t('stem.brainatlas.myelin_sheath', 'Myelin Sheath'), x: 0.55, y: 0.45, w: 0.08, fn: 'Insulating lipid wrapping by oligodendrocytes (CNS) or Schwann cells (PNS). Increases conduction velocity 10\u2013100x via saltatory conduction. ~80% lipid, 20% protein.', conditions: 'Multiple sclerosis: autoimmune CNS demyelination. Guillain-Barr\u00E9: PNS demyelination. Charcot-Marie-Tooth.', damage: 'Slowed/blocked conduction, weakness, numbness, fatigue.' },

                { id: 'node_ranvier', name: t('stem.brainatlas.nodes_of_ranvier', 'Nodes of Ranvier'), x: 0.70, y: 0.45, w: 0.06, fn: '1\u20132\u03BCm gaps between myelin with ~1000 Na\u207A channels/\u03BCm\u00B2. Action potential jumps node-to-node (saltatory conduction) at up to 120 m/s.', conditions: 'Anti-ganglioside antibodies target nodal proteins in Guillain-Barr\u00E9. Paranodal disruption slows conduction.', damage: 'Loss of saltatory conduction. Dramatic velocity drop. Eventual conduction block.' },

                { id: 'axon_terminal', name: t('stem.brainatlas.axon_terminal', 'Axon Terminal'), x: 0.92, y: 0.45, w: 0.06, fn: 'Synaptic boutons with vesicles of neurotransmitter. Ca\u00B2\u207A influx triggers SNARE-mediated exocytosis into synaptic cleft.', conditions: 'Botulism: cleaves SNAREs, blocks ACh release. Lambert-Eaton: anti-VGCC antibodies reduce Ca\u00B2\u207A entry.', damage: 'No NT release. Complete failure of synaptic transmission.' },

                { id: 'spike_cycle_decoder_neuron', name: t('stem.brainatlas.spike_cycle_decoder', 'Spike Cycle Decoder'), x: 0.48, y: 0.12, w: 0.12, fn: 'A compact map of the action-potential cycle: resting potential near -70 mV, threshold near -55 mV, rapid depolarization as voltage-gated Na+ channels open, repolarization as Na+ channels inactivate and K+ channels open, brief hyperpolarization, then refractory recovery. The all-or-nothing rule means a neuron either fires a full spike after threshold or does not fire.', conditions: 'Useful for understanding epilepsy and sodium-channel disorders, local anesthetics and anti-seizure medicines that alter channel firing, demyelination that slows propagation, and refractory periods that limit maximum firing rate.', damage: 'Disrupted spike cycling can prevent signal initiation, slow axonal conduction, or create unstable firing patterns such as repetitive or synchronized discharges.' }

              ]

            },
            synapses: {
              name: t('stem.brainatlas.synapse_development', '\uD83D\uDD17 Synapse & Development'), desc: t('stem.brainatlas.how_synapses_form_get_pruned_and_matur', 'How synapses form, get pruned, and mature across the lifespan'), 
              isSynapse: true,
              regions: [
                { id: 'synaptogenesis', name: t('stem.brainatlas.synaptogenesis_synapse_formation', 'Synaptogenesis (synapse formation)'), x: 0.30, y: 0.30, w: 0.08, fn: 'Synapse formation. After birth the brain massively OVERPRODUCES synapses (exuberant synaptogenesis), reaching roughly twice adult density in early childhood. Timing differs by region: sensory and motor areas peak in the first 1-2 years, the prefrontal cortex peaks later (around ages 3-5). Driven by genetic programs plus early sensory and social experience.', conditions: 'Fragile X syndrome: failure of normal spine maturation leaves an excess of long, thin, immature dendritic spines.', damage: 'Too few synapses (early deprivation) limits the raw material that later experience can shape.' },
                { id: 'pruning', name: t('stem.brainatlas.synaptic_pruning', 'Synaptic pruning'), x: 0.50, y: 0.30, w: 0.08, fn: 'Experience-dependent elimination of weaker or unused synapses: a "use it or lose it" sculpting that makes circuits more efficient. Microglia and astrocytes physically engulf synapses, in part tagged by immune-complement proteins (C1q, C3). Sensory and motor circuits prune first (childhood); the prefrontal cortex prunes LAST, continuing into the mid-20s.', conditions: 'Atypical pruning is associated at the GROUP level with autism (evidence of REDUCED pruning and excess spines: Tang et al. 2014, mTOR/autophagy) and schizophrenia (evidence of EXCESSIVE adolescent pruning: Sekar et al. 2016, complement C4). These are real research associations, NOT diagnostic tests and NOT the whole cause.', damage: 'Too little pruning (excess noisy connections) or too much (loss of needed circuits) can both disrupt typical development.' },
                { id: 'critical_periods', name: t('stem.brainatlas.critical_sensitive_periods', 'Critical & sensitive periods'), x: 0.70, y: 0.30, w: 0.08, fn: 'Windows when a circuit is maximally plastic and shaped by experience. Vision has a well-defined critical period (ocular dominance: Hubel and Wiesel); native-language phonology is largely set in the first years. Most learning uses gentler SENSITIVE periods that stay partly open for life. Window closure is gated by maturation of inhibitory (PV+/GABA) circuits and perineuronal nets.', conditions: 'Untreated congenital cataract or strabismus during the visual critical period causes lasting amblyopia. Severe early deprivation has outsized, harder-to-reverse effects.', damage: 'Missing experience during a critical period produces deficits that later input only partly corrects.' },
                { id: 'myelination_dev', name: t('stem.brainatlas.myelination_development', 'Myelination (development)'), x: 0.30, y: 0.55, w: 0.08, fn: 'Glial wrapping of axons (oligodendrocytes in the CNS) that speeds conduction up to ~100x through saltatory conduction. It proceeds back-to-front: sensory and motor tracts myelinate early, while prefrontal and association cortex myelinate LAST, continuing into the mid-to-late 20s. A major reason executive control keeps maturing through the teens and early 20s.', conditions: 'Multiple sclerosis (CNS demyelination); leukodystrophies; preterm white-matter injury (periventricular leukomalacia).', damage: 'Demyelination slows or blocks conduction, producing weakness, numbness, and fatigue.' },
                { id: 'neuroplasticity', name: t('stem.brainatlas.neuroplasticity_lifelong', 'Neuroplasticity (lifelong)'), x: 0.50, y: 0.55, w: 0.08, fn: 'The brain keeps rewiring throughout life: synapses strengthen and weaken (LTP/LTD), dendritic spines form and disappear, and the hippocampus shows limited new-neuron formation. Plasticity is real and lifelong, but BOUNDED: commercial "brain-training" usually shows gains on the trained task with little transfer to untrained skills.', conditions: 'Harnessed in stroke and injury rehabilitation (constraint-induced movement therapy). Maladaptive plasticity contributes to chronic pain and phantom-limb sensation.', damage: 'Reduced plasticity slows learning and recovery; runaway plasticity can entrench maladaptive circuits.' },
                { id: 'adolescent_remodel', name: t('stem.brainatlas.adolescent_remodeling', 'Adolescent remodeling'), x: 0.70, y: 0.55, w: 0.08, fn: 'Adolescence is a second window of large-scale remodeling: prefrontal pruning and myelination plus changes in the dopamine system. The limbic/reward system matures EARLIER than prefrontal control, a normal developmental gap (not a deficit) linked to greater risk-taking, novelty-seeking, and sensitivity to peers. This is typical maturation, not damage.', conditions: 'Many psychiatric conditions first emerge in adolescence as these circuits remodel; this is an association, not a simple cause.' }
              ]
            },
            stimulate: {
              name: t('stem.brainatlas.stimulation_lab', '\u26A1 Stimulation Lab'), desc: t('stem.brainatlas.predict_what_stimulating_each_region_d', 'Predict what stimulating each region does (how Penfield mapped the brain)'), 
              isStim: true,
              regions: [
                { id: 'stim_motor_map', name: t('stem.brainatlas.stim_motor_map', 'Motor Response Zone'), x: 0.34, y: 0.25, w: 0.08, fn: 'Stimulation of primary motor cortex can trigger movement in the opposite side of the body. In Penfield-style mapping, hand, face, and leg areas can produce brief twitches or postures without the patient deciding to move.', conditions: 'Used during awake cortical mapping to avoid injuring essential motor cortex during surgery. Motor responses also help explain the motor homunculus.' },
                { id: 'stim_sensory_map', name: t('stem.brainatlas.stim_sensory_map', 'Sensory Response Zone'), x: 0.46, y: 0.27, w: 0.08, fn: 'Stimulation of primary somatosensory cortex can produce tingling, buzzing, numbness, pressure, or other sensations in the opposite body part. It feels sensory, not voluntary movement.', conditions: 'Somatosensory mapping separates the postcentral gyrus from the nearby motor strip and helps preserve body sensation.' },
                { id: 'stim_visual_map', name: t('stem.brainatlas.stim_visual_map', 'Visual Flash Zone'), x: 0.72, y: 0.40, w: 0.08, fn: 'Stimulation of primary visual cortex usually produces simple flashes, spots, or sparkles called phosphenes in the opposite visual field, not full scenes.', conditions: 'Visual stimulation findings connect directly to the retina-to-V1 visual pathway and experimental visual prosthesis research.' },
                { id: 'stim_auditory_map', name: t('stem.brainatlas.stim_auditory_map', 'Auditory Sound Zone'), x: 0.58, y: 0.46, w: 0.08, fn: 'Stimulation of primary auditory cortex can produce simple sounds such as ringing, buzzing, humming, or tones. Association cortex is needed for meaningful speech and music interpretation.', conditions: 'Auditory mapping helps distinguish primary sensory response from language comprehension or memory associations.' },
                { id: 'stim_language_map', name: t('stem.brainatlas.stim_language_map', 'Language Disruption Zone'), x: 0.29, y: 0.43, w: 0.08, fn: 'Stimulation of dominant-language cortex can briefly interrupt speech output, word finding, comprehension, reading, naming, or repetition. Broca-area stimulation often causes speech arrest; Wernicke-area stimulation can disrupt comprehension and produce jumbled output.', conditions: 'Awake language mapping protects essential speech and comprehension cortex during epilepsy and tumor surgery.' },
                { id: 'stim_memory_emotion_map', name: t('stem.brainatlas.stim_memory_emotion_map', 'Memory and Emotion Zone'), x: 0.51, y: 0.59, w: 0.08, fn: 'Temporal-lobe and limbic stimulation can evoke experiential responses: deja vu, remembered songs, vivid scenes, fear, or body arousal. These effects are clues that memory and emotion are distributed across temporal and limbic circuits.', conditions: 'Penfield described experiential responses from temporal-lobe stimulation; amygdala stimulation can trigger fear and autonomic arousal.' },
                { id: 'stim_autonomic_quiet_map', name: t('stem.brainatlas.stim_autonomic_quiet_map', 'Autonomic or Quiet Zone'), x: 0.35, y: 0.60, w: 0.08, fn: 'Some stimulation produces body-state changes such as heart-rate shifts, flushing, hunger, or temperature feelings, especially near hypothalamic/autonomic systems. Other association cortex may produce little obvious effect, which is still meaningful.', conditions: 'A quiet response does not mean the area is unimportant. Some regions support planning, attention, judgment, or integration without an immediate reportable sensation.' }
              ]
            },
            sleepStages: {

              name: t('stem.brainatlas.sleep_stages', '\u{1F4A4} Sleep Stages'), desc: t('stem.brainatlas.hypnogram_visualization_sleep_architec', 'Hypnogram visualization \u2014 sleep architecture across a full night'),

              isSleep: true,

              regions: [

                { id: 'awake', name: t('stem.brainatlas.wakefulness', 'Wakefulness'), x: 0.12, y: 0.12, w: 0.08, fn: 'Full consciousness with active cortical processing. EEG shows beta waves (13\u201330 Hz) during alertness and alpha waves (8\u201313 Hz) during relaxed wakefulness with eyes closed. Ascending reticular activating system (ARAS) in brainstem maintains arousal.', conditions: 'Insomnia: difficulty initiating or maintaining sleep. Hyperarousal model: elevated cortisol, increased beta activity. Fatal familial insomnia: prion disease destroying thalamus, progressive total insomnia leading to death.', damage: 'Chronic sleep deprivation impairs immune function, glucose metabolism, memory consolidation, and emotional regulation. 11 days is the longest recorded voluntary wakefulness.' },

                { id: 'n1_stage', name: t('stem.brainatlas.stage_n1_light_sleep', 'Stage N1 (Light Sleep)'), x: 0.30, y: 0.28, w: 0.08, fn: 'Transition from wakefulness to sleep, lasting 1\u20135 minutes per cycle. EEG shifts from alpha to theta waves (4\u20138 Hz). Slow rolling eye movements present. Hypnic jerks (myoclonic twitches) are common. Vertex sharp waves appear. Muscle tone decreases but is still present. Easily awakened \u2014 may deny having been asleep.', conditions: 'Narcolepsy type 1: abnormally rapid entry into REM from wakefulness (SOREMPs) due to orexin/hypocretin deficiency. Sleep-onset hallucinations (hypnagogic) occur during N1 transitions.', damage: 'Disrupted N1 transitions cause sleep onset insomnia, excessive hypnic jerks, and fragmented sleep architecture.' },

                { id: 'n2_stage', name: t('stem.brainatlas.stage_n2_core_sleep', 'Stage N2 (Core Sleep)'), x: 0.50, y: 0.44, w: 0.08, fn: 'Comprises 45\u201355% of total sleep time. Defined by two signature EEG features: sleep spindles (11\u201316 Hz bursts from thalamic reticular nucleus, lasting 0.5\u20131.5s) and K-complexes (large biphasic waves, largest EEG events). Body temperature drops, heart rate slows. Spindles are critical for memory consolidation \u2014 they gate information transfer from hippocampus to neocortex.', conditions: 'Reduced sleep spindles found in schizophrenia, intellectual disability, and aging. K-complex absence may indicate cortical dysfunction. Bruxism (teeth grinding) peaks in N2.', damage: 'Loss of N2 sleep impairs procedural memory consolidation, motor learning, and sensory gating. Sleep spindle deficits correlate with cognitive decline.' },

                { id: 'n3_sws', name: t('stem.brainatlas.stage_n3_deep_sws', 'Stage N3 (Deep/SWS)'), x: 0.70, y: 0.60, w: 0.08, fn: 'Slow-wave sleep (SWS): deepest sleep stage with high-amplitude delta waves (0.5\u20134 Hz, >75\u00B5V). Growth hormone peaks during first SWS episode. Glymphatic system maximally active \u2014 clears metabolic waste (amyloid-\u03B2) from brain. Declarative memory consolidation occurs. Parasomnias most likely: sleepwalking, night terrors, bedwetting. Very difficult to awaken; sleep inertia if woken.', conditions: 'SWS decreases with aging (near-absent in elderly). Reduced SWS linked to Alzheimer disease amyloid accumulation. Fibromyalgia: alpha-delta sleep (alpha waves intrude into delta). Night terrors and sleepwalking are NREM parasomnias occurring from N3.', damage: 'SWS deprivation causes impaired glucose tolerance, reduced growth hormone, weakened immune function, and accelerated amyloid-\u03B2 accumulation.' },

                { id: 'rem_stage', name: t('stem.brainatlas.rem_sleep', 'REM Sleep'), x: 0.88, y: 0.28, w: 0.08, fn: 'Rapid Eye Movement sleep: vivid dreaming, emotional memory processing, and synaptic homeostasis. EEG resembles wakefulness (low-voltage, mixed frequency \u2014 "paradoxical sleep"). Complete skeletal muscle atonia except diaphragm and extraocular muscles. REM periods lengthen across the night (10 min \u2192 60 min). Pontine cholinergic neurons (LDT/PPT) drive REM; locus coeruleus and raphe nuclei are silent. PGO waves (ponto-geniculo-occipital) trigger eye movements.', conditions: 'REM behavior disorder (RBD): loss of atonia \u2192 acting out dreams, strong predictor of synucleinopathies (Parkinson, Lewy body dementia). Narcolepsy: SOREMPs, cataplexy (REM atonia intruding into wakefulness). PTSD: REM fragmentation, nightmares. Obstructive sleep apnea worsens in REM (hypotonia of upper airway).', damage: 'REM deprivation impairs emotional regulation, creative problem-solving, and procedural memory. REM rebound occurs with increased intensity and duration after deprivation.' },

                { id: 'sleep_architecture_decoder_sleep', name: t('stem.brainatlas.sleep_architecture_decoder', 'Sleep Architecture Decoder'), x: 0.50, y: 0.88, w: 0.12, fn: 'A practical shortcut for reading the hypnogram. Sleep cycles repeat about every 90 minutes. Early night is weighted toward N3 slow-wave sleep, which supports physical restoration, growth-hormone release, declarative memory consolidation, and glymphatic clearance. Later night is weighted toward longer REM periods, which support emotional memory processing, procedural learning, dreaming, and flexible problem solving. N2 is the largest share of total sleep and its spindles help memory transfer. Fragmented sleep breaks the architecture even if total time in bed looks adequate.', conditions: 'Insomnia, sleep apnea, circadian rhythm disorders, shift-work disorder, narcolepsy, REM behavior disorder, PTSD nightmares, sleep deprivation, and aging can all alter the shape of the hypnogram.', damage: 'Use the pattern: too little N3 means weak recovery and declarative-memory support; too little REM means poorer emotion/procedural processing; repeated awakenings fragment attention, mood regulation, and learning the next day.' }

              ]

            },

            eegWaves: {

              name: t('stem.brainatlas.eeg_waves', '\u{1F4C8} EEG Waves'), desc: t('stem.brainatlas.real_time_brain_wave_patterns_frequenc', 'Real-time brain wave patterns \u2014 frequency bands and clinical significance'),

              isEEG: true,

              regions: [

                { id: 'delta_wave', name: t('stem.brainatlas.delta_waves_0_5_4_hz', 'Delta Waves (0.5\u20134 Hz)'), x: 0.50, y: 0.12, w: 0.10, fn: 'Highest amplitude, slowest frequency. Dominant during Stage N3 deep sleep (slow-wave sleep). Generated by thalamocortical circuits with cortical UP/DOWN state oscillations. Essential for restorative sleep, growth hormone release, and glymphatic clearance of metabolic waste. Amplitude >75\u00B5V defines slow-wave sleep on polysomnography.', conditions: 'Polymorphic delta activity (PDA): focal brain lesion (tumor, stroke). Intermittent rhythmic delta activity (IRDA): frontal (FIRDA) suggests metabolic/toxic encephalopathy; occipital (OIRDA) suggests childhood epilepsy. Excessive delta in wakefulness indicates severe encephalopathy. Temporal delta in herpes encephalitis.', damage: 'Loss of delta activity indicates severe cortical or thalamocortical dysfunction; delta slowing during wakefulness is a marker of brain injury severity.' },

                { id: 'theta_wave', name: t('stem.brainatlas.theta_waves_4_8_hz', 'Theta Waves (4\u20138 Hz)'), x: 0.50, y: 0.30, w: 0.10, fn: 'Prominent during Stage N1 sleep, drowsiness, meditation, and hippocampal memory processing. Hippocampal theta rhythm (5\u20138 Hz) is critical for spatial navigation and episodic memory encoding. Generated by medial septum cholinergic/GABAergic input to hippocampus. Frontal midline theta increases during focused cognitive tasks (working memory, error monitoring).', conditions: 'Excessive theta in wakefulness: mild encephalopathy, drowsiness, medication effect. Temporal intermittent rhythmic theta activity (TIRTA): hippocampal pathology, mesial temporal sclerosis. An elevated theta/beta ratio was once proposed as an ADHD marker but is NOT diagnostically reliable (Arns et al. 2013); the FDA-cleared NEBA device was controversial. Theta burst stimulation (TBS) used in therapeutic TMS protocols for depression.', damage: 'Theta dysregulation impairs working memory, spatial navigation, and memory consolidation; excess waking theta indicates diffuse cortical slowing.' },

                { id: 'alpha_wave', name: t('stem.brainatlas.alpha_waves_8_13_hz', 'Alpha Waves (8\u201313 Hz)'), x: 0.50, y: 0.50, w: 0.10, fn: 'Dominant rhythm of relaxed wakefulness with eyes closed. Best recorded over posterior (occipital) regions. Attenuates with eye opening or mental effort (alpha blocking/desynchronization). Generated by thalamocortical relay neurons in a partially disfacilitated state. Mu rhythm (8\u201313 Hz over motor cortex) is the sensorimotor alpha equivalent, suppressed by movement or movement observation. Peak alpha frequency correlates with cognitive processing speed.', conditions: 'Alpha coma: continuous unreactive alpha activity in comatose patient (brainstem lesion or cardiopulmonary arrest) \u2014 poor prognosis. Reduced posterior alpha in Alzheimer disease (shifts to theta). Alpha-delta sleep: alpha intrusion into delta waves in fibromyalgia. Breach rhythm: enhanced alpha/beta near skull defect (post-surgical).', damage: 'Absent alpha indicates severe posterior cortical or thalamocortical dysfunction; asymmetric alpha may indicate structural lesion on the side with lower amplitude (Bancaud phenomenon).' },

                { id: 'beta_wave', name: t('stem.brainatlas.beta_waves_13_30_hz', 'Beta Waves (13\u201330 Hz)'), x: 0.50, y: 0.70, w: 0.10, fn: 'Low amplitude, high frequency. Dominant during active thinking, problem-solving, and alert concentration. Most prominent over frontal and central regions. Sub-bands: low beta (13\u201316 Hz, relaxed focus), mid beta (16\u201320 Hz, active cognition), high beta (20\u201330 Hz, anxiety, complex processing). Sensorimotor beta (mu-beta) suppresses during movement preparation and execution.', conditions: 'Excess beta: anxiety disorders, medication effect (benzodiazepines dramatically enhance beta activity, especially frontal). Beta asymmetry may indicate structural lesion. Drug-induced beta: barbiturates, benzodiazepines cause diffuse beta enhancement. Reduced beta in frontal dementia and severe depression (hypofrontality).', damage: 'Beta abnormalities reflect arousal dysregulation; excessive frontal beta correlates with anxiety and insomnia; absent beta with severe cortical depression.' },

                { id: 'gamma_wave', name: t('stem.brainatlas.gamma_waves_30_100_hz', 'Gamma Waves (30\u2013100 Hz)'), x: 0.50, y: 0.88, w: 0.10, fn: 'Fastest brain waves, lowest amplitude. Associated with higher cognitive functions: consciousness, cross-modal sensory binding, selective attention, working memory, and perceptual integration. Generated by fast-spiking parvalbumin-positive GABAergic interneurons creating synchronized inhibition windows. The "40 Hz gamma" (35\u201345 Hz) is linked to conscious perception and the binding problem (an influential but contested hypothesis: Crick & Koch 1990; critiqued by Shadlen & Movshon 1999).', conditions: 'Reduced gamma in schizophrenia (auditory steady-state response deficit at 40 Hz) \u2014 reflects interneuron dysfunction. Alzheimer disease: reduced gamma power; 40 Hz light/sound stimulation being researched as therapy (gamma entrainment). Epileptic high-frequency oscillations (HFOs, 80\u2013500 Hz) localize seizure onset zones.', damage: 'Gamma deficits are associated with impaired perceptual binding and attention; pathological gamma (HFOs) indicates epileptogenic cortex.' }

              ]

            },

            crossLateral: {

              name: t('stem.brainatlas.cross_lateralization', '\uD83D\uDD00 Cross-Lateralization'), desc: t('stem.brainatlas.how_each_hemisphere_controls_the_oppos', 'How each hemisphere controls the opposite side of the body and shares information through the corpus callosum'),

              isCrossLateral: true,

              regions: [

                { id: 'motor_decuss', name: t('stem.brainatlas.motor_decussation_pyramids', 'Motor Decussation (Pyramids)'), x: 0.50, y: 0.82, w: 0.08, fn: 'The corticospinal (pyramidal) tract crosses at the medullary pyramids. ~85\u201390% of fibers cross (lateral corticospinal tract) to control contralateral limb movement. ~10\u201315% remain ipsilateral (anterior corticospinal tract, controlling proximal/axial muscles). This crossing is why a left hemisphere stroke causes right-sided weakness (contralateral hemiparesis).', conditions: 'Medullary lesion at pyramids: contralateral hemiparesis below the lesion. Brown-S\u00E9quard syndrome (hemisection of spinal cord): ipsilateral motor loss + contralateral pain/temp loss. Wallenberg syndrome: ipsilateral face + contralateral body deficits.', damage: 'Unilateral pyramidal lesion produces contralateral upper motor neuron signs: weakness, spasticity, hyperreflexia, Babinski sign. Bilateral lesion causes quadriplegia.' },

                { id: 'sensory_decuss', name: t('stem.brainatlas.sensory_decussation_medial_lemniscus', 'Sensory Decussation (Medial Lemniscus)'), x: 0.50, y: 0.72, w: 0.08, fn: 'The dorsal column\u2013medial lemniscus (DCML) pathway carries fine touch, proprioception, and vibration. First-order neurons ascend ipsilaterally in the dorsal columns to the gracile/cuneate nuclei of the medulla. Second-order neurons cross as internal arcuate fibers forming the medial lemniscus, then ascend to the contralateral thalamus (VPL nucleus). This means the left somatosensory cortex processes right-body sensation.', conditions: 'Posterior cord syndrome: bilateral loss of proprioception and fine touch (dorsal column damage). Tabes dorsalis (neurosyphilis): dorsal column degeneration \u2192 sensory ataxia, Romberg sign. Vitamin B12 deficiency: subacute combined degeneration (dorsal columns + corticospinal tracts).', damage: 'Medullary lesion at sensory decussation causes contralateral loss of fine touch and proprioception. Cortical lesion causes contralateral sensory loss with cortical signs (astereognosis, agraphesthesia).' },

                { id: 'optic_chiasm_cross', name: t('stem.brainatlas.optic_chiasm_visual_crossing', 'Optic Chiasm (Visual Crossing)'), x: 0.50, y: 0.52, w: 0.08, fn: 'Partial decussation of visual signals: nasal retinal fibers (receiving temporal visual field) cross to the contralateral optic tract. Temporal retinal fibers (receiving nasal visual field) remain ipsilateral. Result: each occipital lobe processes the contralateral visual field. Left occipital cortex sees the right visual field, and vice versa. This partial crossing enables binocular vision and depth perception.', conditions: 'Pituitary adenoma compressing chiasm from below: bitemporal hemianopia (loss of both temporal fields). Craniopharyngioma compressing from above: variable field cuts. Optic tract lesion: contralateral homonymous hemianopia (both eyes lose same visual field). Optic neuritis (MS): unilateral vision loss with afferent pupillary defect.', damage: 'Chiasm compression causes bitemporal hemianopia. Post-chiasm lesions cause homonymous defects. Complete optic nerve lesion causes monocular blindness.' },

                { id: 'corpus_callosum_cross', name: t('stem.brainatlas.corpus_callosum', 'Corpus Callosum'), x: 0.50, y: 0.30, w: 0.10, fn: 'Largest white matter commissure (~200 million axons) connecting homologous regions of left and right cortex. Enables interhemispheric communication: transfers sensory, motor, and cognitive information between hemispheres. Anterior portion (genu): prefrontal connections. Body: motor/somatosensory. Splenium (posterior): visual/parietal connections. Grows through childhood, but callosal myelination continues into the mid-to-late 20s (among the latest-maturing white-matter tracts).', conditions: 'Agenesis of corpus callosum: can be asymptomatic or cause disconnect syndromes. Split-brain surgery (callosotomy for epilepsy): each hemisphere operates independently \u2014 left hand does not know what right hand does. Marchiafava-Bignami disease (alcoholism): callosal demyelination. MS frequently affects callosal fibers (Dawson fingers on MRI).', damage: 'Callosal lesions cause disconnection syndromes: alien hand, ideomotor apraxia of left hand, left hemialexia (cannot read words in left visual field), tactile anomia of left hand.' },

                { id: 'language_lateral', name: t('stem.brainatlas.language_lateralization', 'Language Lateralization'), x: 0.28, y: 0.35, w: 0.08, fn: 'Language is strongly lateralized to the left hemisphere in ~95% of right-handers and ~70% of left-handers. Broca\u2019s area (left inferior frontal gyrus, BA 44/45): speech production and grammar. Wernicke\u2019s area (left superior temporal gyrus, BA 22): speech comprehension. Connected by the arcuate fasciculus. Right hemisphere contributes prosody (emotional tone), pragmatics, humor, and metaphor interpretation.', conditions: 'Broca\u2019s aphasia: non-fluent, effortful speech with preserved comprehension. Wernicke\u2019s aphasia: fluent but meaningless speech (word salad) with impaired comprehension. Conduction aphasia: arcuate fasciculus lesion \u2192 intact fluency and comprehension but poor repetition. Global aphasia: massive left hemisphere stroke destroying both areas.', damage: 'Left hemisphere damage in language-dominant individuals causes aphasia. Right hemisphere damage causes aprosodia (flat emotional speech), difficulty with sarcasm, metaphor, and social pragmatics.' },

                { id: 'handedness_lat', name: t('stem.brainatlas.handedness_motor_dominance', 'Handedness & Motor Dominance'), x: 0.72, y: 0.35, w: 0.08, fn: 'Hand preference is determined primarily by contralateral motor cortex specialization. Left hemisphere motor cortex controls the right hand (dominant in ~90% of humans). The dominant hemisphere shows larger cortical representation for the preferred hand (expanded motor homunculus). Handedness correlates with but does not perfectly predict language lateralization. Mixed handedness (ambidexterity) is associated with subtle differences in interhemispheric connectivity.', conditions: 'Forced handedness change: historically attempted, now recognized as harmful. Pathological left-handedness: early left-hemisphere damage causing shift to left-hand dominance. Mirror writing (Leonardo da Vinci): more natural for left-handers, facilitated by right-hemisphere spatial processing.', damage: 'Lesion to dominant motor cortex causes contralateral hand weakness/clumsiness. Recovery depends on plasticity and interhemispheric compensation via corpus callosum.' },

                { id: 'split_brain', name: t('stem.brainatlas.split_brain_phenomenon', 'Split-Brain Phenomenon'), x: 0.50, y: 0.18, w: 0.10, fn: 'When the corpus callosum is severed (callosotomy, performed for intractable epilepsy), each hemisphere operates more independently. Classic Sperry and Gazzaniga split-brain studies used fixation tasks to flash stimuli into one visual field. Objects presented to the right visual field (left hemisphere) can often be named verbally, while objects in the left visual field (right hemisphere) may not be named but can be identified by touch with the left hand. This demonstrates hemispheric specialization and interhemispheric transfer.', conditions: 'Split-brain syndrome: cannot verbally name objects in left visual field, left-hand tactile anomia, inability to match objects across visual fields. Alien hand syndrome: one hand acts contrary to conscious intention (usually left hand). These effects are most dramatic in lab testing; daily life compensation can be remarkably good.', damage: 'Callosotomy can reduce interhemispheric seizure spread but creates disconnection: sensory information, language report, and motor choices can separate when the corpus callosum cannot share information.' },

                { id: 'fixation_task_cross', name: t('stem.brainatlas.split_brain_fixation_task', 'Split-Brain Fixation Task'), x: 0.50, y: 0.65, w: 0.12, fn: 'In a split-brain fixation task, the patient keeps looking at a central point while a word or object flashes briefly to one visual field. A KEY flashed in the left visual field projects first to the right hemisphere. With an intact corpus callosum, that information can transfer to left-language cortex, so speech can name KEY. After callosotomy, speech may not name the KEY, while the left hand can still choose the matching object.', conditions: 'This task structure made hemispheric specialization visible in classic split-brain research: visual field, hemisphere, verbal report, and hand choice can be separated experimentally.', damage: 'Without callosal transfer, right-hemisphere visual information may guide the left hand but fail to reach dominant left-hemisphere speech systems.' }

              ]

            }

          };



          var viewKey = d.view || 'lateral';

          var currentView = VIEWS[viewKey] || VIEWS.lateral;
          if (!VIEWS[viewKey]) viewKey = 'lateral';

          var regions = Array.isArray(currentView.regions) ? currentView.regions : [];

          var searchTerm = (d.search || '').toLowerCase();

          var filtered = searchTerm ? regions.filter(function (r) { return r.name.toLowerCase().indexOf(searchTerm) >= 0 || r.fn.toLowerCase().indexOf(searchTerm) >= 0 || (r.conditions || '').toLowerCase().indexOf(searchTerm) >= 0; }) : regions;

          var sel = d.selectedRegion ? regions.find(function (r) { return r.id === d.selectedRegion; }) : null;



          // Quiz logic — options memoized in state to prevent re-shuffle on render

          var allRegions = []; Object.values(VIEWS).forEach(function (v) { v.regions.forEach(function (r) { if (!allRegions.find(function (a) { return a.id === r.id; })) allRegions.push(r); }); });

          var quizPool = allRegions.filter(function (r) { return r.damage; });

          var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[d.quizIdx % quizPool.length] : null;

          var brainQuizOpts = d._brainQuizOpts || [];

          if (quizQ && d._brainQuizOptsFor !== d.quizIdx) {

            var wrong = quizPool.filter(function (r) { return r.id !== quizQ.id; }).sort(function () { return Math.random() - 0.5; }).slice(0, 3);

            brainQuizOpts = wrong.concat([quizQ]).sort(function () { return Math.random() - 0.5; });

            upd('_brainQuizOpts', brainQuizOpts);

            upd('_brainQuizOptsFor', d.quizIdx);

          }



          // ── Neurotransmitter Simulation System ──

          var SIM_SCENARIOS = [

            { id: 'normal', name: t('stem.brainatlas.normal', 'Normal'), icon: '\u2705', color: '#22c55e', desc: t('stem.brainatlas.baseline_neurotransmission_neurotransm', 'Baseline neurotransmission: neurotransmitters are released, bind receptors, and are cleared by reuptake and enzymatic degradation.'), reuptakeBlocked: false, enzymeBlocked: false, particleMult: 1, receptorBoost: null, receptorDim: null, vesicleRate: 1 },

            { id: 'ssri', name: 'SSRI', icon: '\uD83D\uDC8A', color: '#3b82f6', desc: t('stem.brainatlas.selective_serotonin_reuptake_inhibitor', 'Selective Serotonin Reuptake Inhibitor (e.g., Fluoxetine/Prozac): blocks the serotonin transporter (SERT), increasing 5-HT concentration in the synaptic cleft. Used for depression and anxiety.'), reuptakeBlocked: true, enzymeBlocked: false, particleMult: 2.5, receptorBoost: null, receptorDim: null, vesicleRate: 1 },

            { id: 'snri', name: 'SNRI', icon: '\uD83D\uDC8A', color: '#8b5cf6', desc: t('stem.brainatlas.serotonin_norepinephrine_reuptake_inhi', 'Serotonin-Norepinephrine Reuptake Inhibitor (e.g., Venlafaxine/Effexor): blocks both SERT and NET, increasing serotonin AND norepinephrine in the cleft. Used for depression, anxiety, and chronic pain.'), reuptakeBlocked: true, enzymeBlocked: false, particleMult: 2.8, receptorBoost: null, receptorDim: null, vesicleRate: 1.2 },

            { id: 'benzo', name: t('stem.brainatlas.benzodiazepine', 'Benzodiazepine'), icon: '\uD83D\uDC8A', color: '#14b8a6', desc: t('stem.brainatlas.positive_allosteric_modulator_of_gaba_', 'Positive allosteric modulator of GABA-A receptors (e.g., Diazepam/Valium): increases Cl\u207B channel opening frequency, enhancing inhibitory neurotransmission. Used for anxiety, seizures, and insomnia. Risk: dependence.'), reuptakeBlocked: false, enzymeBlocked: false, particleMult: 1, receptorBoost: 'GABA-A', receptorDim: null, vesicleRate: 0.7 },

            { id: 'cocaine', name: t('stem.brainatlas.cocaine', 'Cocaine'), icon: '\u26A0\uFE0F', color: '#ef4444', desc: t('stem.brainatlas.blocks_dat_net_and_sert_reuptake_trans', 'Blocks DAT, NET, and SERT reuptake transporters non-selectively. Massive dopamine accumulation in mesolimbic pathway \u2192 intense euphoria. Highly addictive. Cardiotoxic: causes vasoconstriction, arrhythmias, MI, and stroke.'), reuptakeBlocked: true, enzymeBlocked: false, particleMult: 4, receptorBoost: null, receptorDim: null, vesicleRate: 2 },

            { id: 'opioid', name: t('stem.brainatlas.opioid', 'Opioid'), icon: '\u26A0\uFE0F', color: '#f59e0b', desc: t('stem.brainatlas.mu_receptor_agonist_e_g_morphine_fenta', 'Mu-receptor agonist (e.g., Morphine, Fentanyl): activates endogenous opioid receptors \u2192 analgesia, euphoria, respiratory depression. Hijacks VTA reward circuit. Tolerance and physical dependence develop rapidly. Overdose: fatal respiratory arrest.'), reuptakeBlocked: false, enzymeBlocked: false, particleMult: 1.3, receptorBoost: '\u03BC-opioid', receptorDim: null, vesicleRate: 0.6 },

            { id: 'alcohol', name: t('stem.brainatlas.alcohol', 'Alcohol'), icon: '\u26A0\uFE0F', color: '#d946ef', desc: t('stem.brainatlas.dual_mechanism_enhances_gaba_a_recepto', 'Dual mechanism: enhances GABA-A receptor activity (sedation) AND blocks NMDA glutamate receptors (reduces excitation). Results in CNS depression, impaired judgment, ataxia. Chronic use: neuroadaptation, tolerance, and life-threatening withdrawal seizures.'), reuptakeBlocked: false, enzymeBlocked: false, particleMult: 0.8, receptorBoost: 'GABA-A', receptorDim: 'NMDA', vesicleRate: 0.5 }

          ];

          var simScenario = d.simScenario || 'normal';

          var activeSim = SIM_SCENARIOS.find(function (s) { return s.id === simScenario; }) || SIM_SCENARIOS[0];

          var EEG_ACTIVITY_MODES = [
            { id: 'resting', label: t('stem.brainatlas.resting', 'Resting') || 'Resting', mults: [0.3, 0.5, 1.0, 0.4, 0.2] },
            { id: 'sleeping', label: t('stem.brainatlas.sleeping', 'Sleeping') || 'Sleeping', mults: [1.0, 0.7, 0.2, 0.1, 0.05] },
            { id: 'studying', label: t('stem.brainatlas.studying', 'Studying') || 'Studying', mults: [0.1, 0.3, 0.4, 1.0, 0.7] },
            { id: 'exercise', label: t('stem.brainatlas.exercise', 'Exercise') || 'Exercise', mults: [0.1, 0.2, 0.3, 1.0, 0.5] },
            { id: 'meditating', label: t('stem.brainatlas.meditating', 'Meditating') || 'Meditating', mults: [0.4, 0.9, 1.0, 0.2, 0.6] }
          ];
          function brainAtlasEegModeFor(id) {
            return EEG_ACTIVITY_MODES.filter(function (mode) { return mode.id === id; })[0] || EEG_ACTIVITY_MODES[0];
          }
          var eegActivityMode = brainAtlasEegModeFor(d.eegActivity || 'resting').id;
          var activeEegMode = brainAtlasEegModeFor(eegActivityMode);
          var EEG_STATE_READOUTS = {
            resting: {
              title: t('stem.brainatlas.eeg_resting_readout', 'Resting readout') || 'Resting readout',
              dominant: t('stem.brainatlas.eeg_resting_dominant', 'Alpha leads; beta stays modest') || 'Alpha leads; beta stays modest',
              pattern: t('stem.brainatlas.eeg_resting_pattern', 'Relaxed wakefulness often shows a posterior alpha rhythm that fades with eye opening or effort.') || 'Relaxed wakefulness often shows a posterior alpha rhythm that fades with eye opening or effort.',
              caution: t('stem.brainatlas.eeg_resting_caution', 'Asymmetry or absent reactivity matters more than one pretty alpha trace.') || 'Asymmetry or absent reactivity matters more than one pretty alpha trace.',
              color: '#22c55e'
            },
            sleeping: {
              title: t('stem.brainatlas.eeg_sleeping_readout', 'Sleep readout') || 'Sleep readout',
              dominant: t('stem.brainatlas.eeg_sleeping_dominant', 'Delta/theta rise; beta quiets') || 'Delta/theta rise; beta quiets',
              pattern: t('stem.brainatlas.eeg_sleeping_pattern', 'Deep sleep shifts toward high-amplitude slow activity, while lighter sleep adds theta and stage-specific features.') || 'Deep sleep shifts toward high-amplitude slow activity, while lighter sleep adds theta and stage-specific features.',
              caution: t('stem.brainatlas.eeg_sleeping_caution', 'Delta is healthy in N3 sleep but concerning if it dominates an awake adult.') || 'Delta is healthy in N3 sleep but concerning if it dominates an awake adult.',
              color: '#4338ca'
            },
            studying: {
              title: t('stem.brainatlas.eeg_studying_readout', 'Studying readout') || 'Studying readout',
              dominant: t('stem.brainatlas.eeg_studying_dominant', 'Beta/gamma increase with focus') || 'Beta/gamma increase with focus',
              pattern: t('stem.brainatlas.eeg_studying_pattern', 'Sustained attention tends to raise faster, lower-amplitude activity while alpha becomes less dominant.') || 'Sustained attention tends to raise faster, lower-amplitude activity while alpha becomes less dominant.',
              caution: t('stem.brainatlas.eeg_studying_caution', 'More fast activity is not automatically better; stress, caffeine, and artifact can look similar.') || 'More fast activity is not automatically better; stress, caffeine, and artifact can look similar.',
              color: '#ef4444'
            },
            exercise: {
              title: t('stem.brainatlas.eeg_exercise_readout', 'Exercise readout') || 'Exercise readout',
              dominant: t('stem.brainatlas.eeg_exercise_dominant', 'Arousal rises; artifact risk rises') || 'Arousal rises; artifact risk rises',
              pattern: t('stem.brainatlas.eeg_exercise_pattern', 'Movement and alertness can increase beta-like activity, while muscle artifact can contaminate high-frequency channels.') || 'Movement and alertness can increase beta-like activity, while muscle artifact can contaminate high-frequency channels.',
              caution: t('stem.brainatlas.eeg_exercise_caution', 'Always separate brain rhythm from muscle, blink, and movement artifact.') || 'Always separate brain rhythm from muscle, blink, and movement artifact.',
              color: '#f59e0b'
            },
            meditating: {
              title: t('stem.brainatlas.eeg_meditating_readout', 'Meditating readout') || 'Meditating readout',
              dominant: t('stem.brainatlas.eeg_meditating_dominant', 'Alpha/theta settle into synchrony') || 'Alpha/theta settle into synchrony',
              pattern: t('stem.brainatlas.eeg_meditating_pattern', 'Relaxed attention can strengthen alpha and theta while reducing high-arousal beta dominance.') || 'Relaxed attention can strengthen alpha and theta while reducing high-arousal beta dominance.',
              caution: t('stem.brainatlas.eeg_meditating_caution', 'A calm-looking rhythm is a state clue, not a diagnosis or a personality readout.') || 'A calm-looking rhythm is a state clue, not a diagnosis or a personality readout.',
              color: '#0ea5e9'
            }
          };
          var activeEegReadout = EEG_STATE_READOUTS[eegActivityMode] || EEG_STATE_READOUTS.resting;



          // Brain canvas — animated

          var canvasRef = function (canvas) {

            if (!canvas) {
              try { if (window.__alloBrainAtlasCanvasCleanup) window.__alloBrainAtlasCanvasCleanup(); } catch (e) {}
              return;
            }

            // If view or sim scenario changed, cancel the old animation so we restart with fresh closures

            var _cacheKey = viewKey + '|' + simScenario + '|' + eegActivityMode;

            if (canvas._brainCleanup) canvas._brainCleanup();
            else if (canvas._brainAnim) { cancelAnimationFrame(canvas._brainAnim); canvas._brainAnim = null; }
            try { if (window.__alloBrainAtlasCanvasCleanup && window.__alloBrainAtlasCanvasCleanup !== canvas._brainCleanup) window.__alloBrainAtlasCanvasCleanup(); } catch (e) {}

            canvas._brainViewKey = _cacheKey;

            // PL7 HiDPI: crisp rendering on retina displays.
            if (window.StemLab && window.StemLab.setupHiDPI) {
              window.StemLab.setupHiDPI(canvas, atlasW, atlasH);
            }
            var ctx = canvas.getContext('2d');
            if (!ctx) return;
            if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);

            var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;

            // Neurochemistry views get a reduced text scale so the larger
            // canvases become breathing room for labels, not oversized glyphs.
            var neuroTextScale = currentView.isSynapse ? 0.60 : (currentView.isNeuron ? 0.60 : (currentView.isNT ? 0.65 : 1));
            var fontScale = Math.min(1.3, (W / 600) * neuroTextScale); // Grow labels for readability without recreating collisions.
            function brainAtlasEllipsizeCanvasText(text, maxWidth) {
              var value = String(text || '');
              if (!value || ctx.measureText(value).width <= maxWidth) return value;
              var suffix = '\u2026';
              if (ctx.measureText(suffix).width > maxWidth) return '';
              var low = 0, high = value.length;
              while (low < high) {
                var mid = Math.ceil((low + high) / 2);
                if (ctx.measureText(value.slice(0, mid).replace(/\s+$/, '') + suffix).width <= maxWidth) low = mid;
                else high = mid - 1;
              }
              return value.slice(0, low).replace(/\s+$/, '') + suffix;
            }
            function brainAtlasWrapCanvasLabel(text, maxWidth, maxLines) {
              var words = String(text || '').trim().split(/\s+/).filter(Boolean);
              var lineLimit = Math.max(1, maxLines || 1);
              if (!words.length) return [''];
              var lines = [];
              while (words.length && lines.length < lineLimit) {
                var line = words.shift();
                while (words.length && ctx.measureText(line + ' ' + words[0]).width <= maxWidth) line += ' ' + words.shift();
                if (ctx.measureText(line).width > maxWidth) line = brainAtlasEllipsizeCanvasText(line, maxWidth);
                if (lines.length === lineLimit - 1 && words.length) line = brainAtlasEllipsizeCanvasText(line + ' ' + words.join(' '), maxWidth);
                lines.push(line);
              }
              return lines;
            }
            function brainAtlasDrawCanvasHeading(title, subtitle, palette) {
              var colors = palette || {};
              var panelX = 24, panelY = 14, panelW = Math.max(120, W - 48);
              var panelH = Math.max(76, Math.min(96, H * 0.13));
              var maxTextWidth = Math.max(80, panelW - 52);
              var titlePx = Math.max(15, Math.min(20, Math.round(15 * fontScale)));
              var subtitlePx = Math.max(10, Math.min(12, Math.round(9.5 * fontScale)));
              ctx.save();
              ctx.shadowColor = 'rgba(15,23,42,0.10)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
              ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 12);
              ctx.fillStyle = colors.panel || 'rgba(255,255,255,0.86)'; ctx.fill();
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
              ctx.strokeStyle = colors.border || 'rgba(148,163,184,0.38)'; ctx.lineWidth = 1; ctx.stroke();
              ctx.fillStyle = colors.accent || '#7c3aed';
              ctx.fillRect(panelX + 12, panelY + 14, 3, Math.max(20, panelH - 28));
              ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);
              ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif';
              var subtitleLines = subtitle ? brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2) : [];
              var titleLineHeight = titlePx + 2, subtitleLineHeight = subtitlePx + 3;
              var textGap = subtitleLines.length ? 4 : 0;
              var textHeight = titleLines.length * titleLineHeight + textGap + subtitleLines.length * subtitleLineHeight;
              var cursorY = panelY + Math.max(7, (panelH - textHeight) / 2);
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              ctx.fillStyle = colors.title || '#0f172a';
              titleLines.forEach(function (line) { cursorY += titleLineHeight; ctx.fillText(line, W * 0.5, cursorY - 2); });
              cursorY += textGap;
              ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif';
              ctx.fillStyle = colors.subtitle || '#64748b';
              subtitleLines.forEach(function (line) { cursorY += subtitleLineHeight; ctx.fillText(line, W * 0.5, cursorY - 2); });
              ctx.restore();
            }
            function brainAtlasDrawCompactCanvasHeading(title, subtitle, palette) {
              var colors = palette || {};
              var headerH = Math.max(48, Math.min(66, H * 0.11));
              var maxTextWidth = Math.max(90, W - 48);
              var titlePx = Math.max(13, Math.min(17, Math.round(13 * fontScale)));
              var subtitlePx = Math.max(8, Math.min(10, Math.round(8.2 * fontScale)));
              ctx.save();
              ctx.textAlign = 'center';
              ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var titleText = brainAtlasEllipsizeCanvasText(title, maxTextWidth);
              ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif';
              var subtitleLines = subtitle ? brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2) : [];
              var titleLineHeight = titlePx + 2;
              var subtitleLineHeight = subtitlePx + 3;
              var textHeight = titleLineHeight + (subtitleLines.length ? 3 : 0) + subtitleLines.length * subtitleLineHeight;
              var cursorY = Math.max(2, (headerH - textHeight) / 2);
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              ctx.fillStyle = colors.title || colors.accent || '#7c3aed';
              cursorY += titleLineHeight;
              ctx.fillText(titleText, W * 0.5, cursorY - 2);
              ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif';
              ctx.fillStyle = colors.subtitle || '#64748b';
              subtitleLines.forEach(function (line) { cursorY += subtitleLineHeight; ctx.fillText(line, W * 0.5, cursorY); });
              ctx.restore();
            }


            function brainAtlasDrawClinicalCaseCard(x, y, w, h, title, clue, answer, color) {
              var cardX = Math.max(8, Math.min(W - w - 8, x));
              var cardY = Math.max(8, Math.min(H - h - 8, y));
              var textX = cardX + 15;
              var maxTextWidth = Math.max(50, w - 24);
              var titlePx = Math.max(9, Math.min(11, Math.round(8 * fontScale)));
              var bodyPx = Math.max(8, Math.min(10, Math.round(7.4 * fontScale)));
              ctx.save();
              ctx.shadowColor = 'rgba(15,23,42,0.08)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
              ctx.beginPath(); ctx.roundRect(cardX, cardY, w, h, 9);
              ctx.fillStyle = '#ffffff'; ctx.fill();
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
              ctx.strokeStyle = color + '99'; ctx.lineWidth = 1.4; ctx.stroke();
              ctx.fillStyle = color; ctx.fillRect(cardX + 6, cardY + 8, 3, Math.max(18, h - 16));
              ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 1);
              ctx.font = bodyPx + 'px Inter, system-ui, sans-serif';
              var clueLines = brainAtlasWrapCanvasLabel(clue, maxTextWidth, 2);
              ctx.font = 'bold ' + bodyPx + 'px Inter, system-ui, sans-serif';
              var answerLines = brainAtlasWrapCanvasLabel(answer, maxTextWidth, 1);
              var titleLineHeight = titlePx + 2, bodyLineHeight = bodyPx + 2;
              var textHeight = titleLines.length * titleLineHeight + clueLines.length * bodyLineHeight + answerLines.length * bodyLineHeight + 5;
              var cursorY = cardY + Math.max(2, (h - textHeight) / 2);
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = color;
              titleLines.forEach(function (line) { cursorY += titleLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              cursorY += 3; ctx.font = bodyPx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#334155';
              clueLines.forEach(function (line) { cursorY += bodyLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              cursorY += 2; ctx.font = 'bold ' + bodyPx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#0f172a';
              answerLines.forEach(function (line) { cursorY += bodyLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              ctx.restore();
            }
            function brainAtlasDrawDecoderChip(x, y, w, h, title, body, color, active) {
              var chipX = Math.max(8, Math.min(W - w - 8, x));
              var chipY = Math.max(8, Math.min(H - h - 8, y));
              var maxTextWidth = Math.max(44, w - 18);
              var titlePx = Math.max(8, Math.min(10, Math.round(6.8 * fontScale)));
              var bodyPx = Math.max(7, Math.min(9, Math.round(5.8 * fontScale)));
              ctx.save();
              ctx.shadowColor = active ? color + '55' : 'rgba(15,23,42,0.07)'; ctx.shadowBlur = active ? 10 : 6; ctx.shadowOffsetY = 2;
              ctx.beginPath(); ctx.roundRect(chipX, chipY, w, h, 8);
              ctx.fillStyle = active ? color + '14' : 'rgba(255,255,255,0.95)'; ctx.fill();
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
              ctx.strokeStyle = color + (active ? 'cc' : '99'); ctx.lineWidth = active ? 1.8 : 1.15; ctx.stroke();
              ctx.fillStyle = color; ctx.fillRect(chipX + 9, chipY + 5, Math.max(18, w - 18), 2);
              ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 1);
              ctx.font = bodyPx + 'px Inter, system-ui, sans-serif';
              var bodyLines = brainAtlasWrapCanvasLabel(body, maxTextWidth, 2);
              var titleLineHeight = titlePx + 1, bodyLineHeight = bodyPx + 1;
              var textHeight = titleLines.length * titleLineHeight + bodyLines.length * bodyLineHeight + 3;
              var cursorY = chipY + Math.max(1, (h - textHeight) / 2);
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = color;
              titleLines.forEach(function (line) { cursorY += titleLineHeight; ctx.fillText(line, chipX + w / 2, cursorY - 1); });
              cursorY += 3; ctx.font = bodyPx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#475569';
              bodyLines.forEach(function (line) { cursorY += bodyLineHeight; ctx.fillText(line, chipX + w / 2, cursorY - 1); });
              ctx.restore();
            }
            function brainAtlasDrawDecoderBannerText(x, y, w, h, title, subtitle, accent) {
              var textX = x + 22;
              var maxTextWidth = Math.max(80, w - 38);
              var titlePx = Math.max(9, Math.min(12, Math.round(8 * fontScale)));
              var subtitlePx = Math.max(8, Math.min(10, Math.round(6 * fontScale)));
              ctx.save();
              ctx.fillStyle = accent || '#818cf8';
              ctx.fillRect(x + 10, y + Math.max(7, h * 0.20), 3, Math.max(18, h * 0.60));
              ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var safeTitle = brainAtlasEllipsizeCanvasText(title, maxTextWidth);
              var titleWidth = ctx.measureText(safeTitle).width;
              ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif';
              var subtitleWidth = ctx.measureText(String(subtitle || '')).width;
              var sideBySide = titleWidth + subtitleWidth + 22 <= maxTextWidth;
              if (sideBySide) {
                var baseline = y + h / 2 + Math.max(titlePx, subtitlePx) * 0.34;
                ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#e2e8f0';
                ctx.fillText(safeTitle, textX, baseline);
                ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
                ctx.fillText(subtitle, textX + titleWidth + 18, baseline);
              } else {
                ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
                var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 1);
                ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif';
                var subtitleLines = brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2);
                var titleLineHeight = titlePx + 1, subtitleLineHeight = subtitlePx + 1;
                var textHeight = titleLines.length * titleLineHeight + subtitleLines.length * subtitleLineHeight + 3;
                var cursorY = y + Math.max(1, (h - textHeight) / 2);
                ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#e2e8f0';
                titleLines.forEach(function (line) { cursorY += titleLineHeight; ctx.fillText(line, textX, cursorY - 1); });
                cursorY += 3; ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
                subtitleLines.forEach(function (line) { cursorY += subtitleLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              }
              ctx.restore();
            }
            function brainAtlasDrawInfoStrip(x, y, w, h, text, accent) {
              var stripX = Math.max(8, Math.min(W - w - 8, x));
              var stripY = Math.max(8, Math.min(H - h - 8, y));
              var maxTextWidth = Math.max(80, w - 44);
              var textPx = Math.max(8, Math.min(11, Math.round(8.4 * fontScale)));
              ctx.save();
              ctx.shadowColor = 'rgba(15,23,42,0.10)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
              ctx.beginPath(); ctx.roundRect(stripX, stripY, w, h, 10);
              ctx.fillStyle = 'rgba(15,23,42,0.87)'; ctx.fill();
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
              ctx.strokeStyle = (accent || '#818cf8') + '88'; ctx.lineWidth = 1; ctx.stroke();
              ctx.fillStyle = accent || '#818cf8';
              ctx.fillRect(stripX + 10, stripY + Math.max(7, h * 0.22), 3, Math.max(16, h * 0.56));
              ctx.font = 'bold ' + textPx + 'px Inter, system-ui, sans-serif';
              ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
              var lines = brainAtlasWrapCanvasLabel(text, maxTextWidth, 2);
              var lineHeight = textPx + 3;
              var cursorY = stripY + Math.max(1, (h - lines.length * lineHeight) / 2);
              ctx.fillStyle = '#e2e8f0';
              lines.forEach(function (line) { cursorY += lineHeight; ctx.fillText(line, stripX + w / 2, cursorY - 2); });
              ctx.restore();
            }
            function brainAtlasDrawAnnotationCard(x, y, w, h, title, body, color, active) {
              var cardX = Math.max(8, Math.min(W - w - 8, x));
              var cardY = Math.max(8, Math.min(H - h - 8, y));
              var textX = cardX + 22;
              var maxTextWidth = Math.max(54, w - 34);
              var titlePx = Math.max(9, Math.min(11, Math.round(8.6 * fontScale)));
              var bodyPx = Math.max(8, Math.min(10, Math.round(7.2 * fontScale)));
              var bodyText = Array.isArray(body) ? body.join(' ') : String(body || '');
              ctx.save();
              ctx.shadowColor = active ? color + '77' : 'rgba(15,23,42,0.08)'; ctx.shadowBlur = active ? 13 : 6; ctx.shadowOffsetY = 2;
              ctx.beginPath(); ctx.roundRect(cardX, cardY, w, h, 11);
              ctx.fillStyle = active ? color : 'rgba(255,255,255,0.94)'; ctx.fill();
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
              ctx.strokeStyle = color; ctx.lineWidth = active ? 2.4 : 1.2; ctx.stroke();
              ctx.fillStyle = active ? 'rgba(255,255,255,0.78)' : color;
              ctx.fillRect(cardX + 9, cardY + Math.max(8, h * 0.18), 3, Math.max(18, h * 0.64));
              ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);
              ctx.font = bodyPx + 'px Inter, system-ui, sans-serif';
              var bodyLines = brainAtlasWrapCanvasLabel(bodyText, maxTextWidth, 2);
              var titleLineHeight = titlePx + 2, bodyLineHeight = bodyPx + 2;
              var textHeight = titleLines.length * titleLineHeight + bodyLines.length * bodyLineHeight + 4;
              var cursorY = cardY + Math.max(2, (h - textHeight) / 2);
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = active ? '#ffffff' : color;
              titleLines.forEach(function (line) { cursorY += titleLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              cursorY += 4; ctx.font = bodyPx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = active ? '#f8fafc' : '#475569';
              bodyLines.forEach(function (line) { cursorY += bodyLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              ctx.restore();
            }
            function brainAtlasDrawBoundedNodeLabel(cx, cy, w, h, title, subtitle, titleColor, subtitleColor) {
              var maxTextWidth = Math.max(32, w - 14);
              var titlePx = Math.max(8, Math.min(10, Math.round(8 * fontScale)));
              var subtitlePx = Math.max(7, Math.min(9, Math.round(6.8 * fontScale)));
              ctx.save();
              ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);
              ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif';
              var subtitleLines = subtitle ? brainAtlasWrapCanvasLabel(subtitle, maxTextWidth, 2) : [];
              var titleLineHeight = titlePx + 1, subtitleLineHeight = subtitlePx + 1;
              var textHeight = titleLines.length * titleLineHeight + subtitleLines.length * subtitleLineHeight + (subtitleLines.length ? 2 : 0);
              var cursorY = cy - textHeight / 2;
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = titleColor || '#0f172a';
              titleLines.forEach(function (line) { cursorY += titleLineHeight; ctx.fillText(line, cx, cursorY - 1); });
              if (subtitleLines.length) cursorY += 2;
              ctx.font = subtitlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = subtitleColor || '#64748b';
              subtitleLines.forEach(function (line) { cursorY += subtitleLineHeight; ctx.fillText(line, cx, cursorY - 1); });
              ctx.restore();
            }
            function brainAtlasDrawTeachingCard(x, y, w, h, title, body, color, tinted) {
              var cardX = Math.max(8, Math.min(W - w - 8, x));
              var cardY = Math.max(8, Math.min(H - h - 8, y));
              var textX = cardX + 18;
              var maxTextWidth = Math.max(48, w - 28);
              var titlePx = Math.max(8, Math.min(10, Math.round(7.6 * fontScale)));
              var bodyPx = Math.max(7, Math.min(9, Math.round(6.6 * fontScale)));
              var bodyText = Array.isArray(body) ? body.join(' ') : String(body || '');
              ctx.save();
              ctx.shadowColor = 'rgba(15,23,42,0.08)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
              ctx.beginPath(); ctx.roundRect(cardX, cardY, w, h, 10);
              ctx.fillStyle = tinted ? color + '12' : 'rgba(255,255,255,0.92)'; ctx.fill();
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
              ctx.strokeStyle = color + '88'; ctx.lineWidth = 1.1; ctx.stroke();
              ctx.fillStyle = color; ctx.fillRect(cardX + 8, cardY + Math.max(8, h * 0.16), 3, Math.max(18, h * 0.68));
              ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif';
              var titleLines = brainAtlasWrapCanvasLabel(title, maxTextWidth, 2);
              var titleLineHeight = titlePx + 2, bodyLineHeight = bodyPx + 2;
              var availableBodyHeight = Math.max(bodyLineHeight, h - titleLines.length * titleLineHeight - 9);
              var maxBodyLines = Math.max(1, Math.min(5, Math.floor(availableBodyHeight / bodyLineHeight)));
              ctx.font = bodyPx + 'px Inter, system-ui, sans-serif';
              var bodyLines = brainAtlasWrapCanvasLabel(bodyText, maxTextWidth, maxBodyLines);
              var textHeight = titleLines.length * titleLineHeight + bodyLines.length * bodyLineHeight + 3;
              var cursorY = cardY + Math.max(2, (h - textHeight) / 2);
              ctx.font = 'bold ' + titlePx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = color;
              titleLines.forEach(function (line) { cursorY += titleLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              cursorY += 3; ctx.font = bodyPx + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#334155';
              bodyLines.forEach(function (line) { cursorY += bodyLineHeight; ctx.fillText(line, textX, cursorY - 1); });
              ctx.restore();
            }
            function brainAtlasDrawPathLabel(cx, cy, text, color, maxWidth) {
              var value = String(text || '').trim();
              if (!value) return;
              var fontPx = Math.max(8, Math.min(10, Math.round(7.2 * fontScale)));
              var widthLimit = Math.max(48, maxWidth || W * 0.18);
              ctx.save();
              ctx.font = 'bold ' + fontPx + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              var safeText = brainAtlasEllipsizeCanvasText(value, widthLimit - 18);
              var pillW = Math.min(widthLimit, Math.max(34, ctx.measureText(safeText).width + 18));
              var pillH = fontPx + 10;
              var pillX = Math.max(6, Math.min(W - pillW - 6, cx - pillW / 2));
              var pillY = Math.max(6, Math.min(H - pillH - 6, cy - pillH / 2));
              ctx.shadowColor = 'rgba(15,23,42,0.10)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1;
              ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
              ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill();
              ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
              ctx.strokeStyle = color + '66'; ctx.lineWidth = 1; ctx.stroke();
              ctx.fillStyle = color;
              ctx.fillText(safeText, pillX + pillW / 2, pillY + pillH / 2 + 0.5);
              ctx.restore();
            }
            function brainAtlasDrawLegendGrid(x, y, w, items, textColor, maxItemWidth) {
              var fontPx = Math.max(8, Math.min(10, Math.round(7.4 * fontScale)));
              var rowHeight = fontPx + 9;
              var widthLimit = Math.max(56, Math.min(maxItemWidth || w / 2, w));
              ctx.save();
              ctx.font = 'bold ' + fontPx + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
              var rows = [];
              var row = { items: [], width: 0 };
              (items || []).forEach(function (item) {
                var label = String(item.label || item.name || '');
                var color = item.color || item.c || '#64748b';
                var itemLimit = Math.max(56, Math.min(widthLimit, w));
                var safeLabel = brainAtlasEllipsizeCanvasText(label, itemLimit - 26);
                var itemWidth = Math.min(itemLimit, ctx.measureText(safeLabel).width + 26);
                var gap = row.items.length ? 8 : 0;
                if (row.items.length && row.width + gap + itemWidth > w) { rows.push(row); row = { items: [], width: 0 }; gap = 0; }
                row.items.push({ label: safeLabel, color: color, width: itemWidth });
                row.width += gap + itemWidth;
              });
              if (row.items.length) rows.push(row);
              rows.forEach(function (packedRow, rowIndex) {
                var cursorX = x + Math.max(0, (w - packedRow.width) / 2);
                var centerY = y + rowIndex * rowHeight + rowHeight / 2;
                packedRow.items.forEach(function (item, itemIndex) {
                  if (itemIndex) cursorX += 8;
                  ctx.fillStyle = item.color;
                  ctx.beginPath(); ctx.roundRect(cursorX + 3, centerY - 2, 12, 4, 2); ctx.fill();
                  ctx.fillStyle = textColor || '#64748b';
                  ctx.fillText(item.label, cursorX + 20, centerY + 0.5);
                  cursorX += item.width;
                });
              });
              ctx.restore();
              return rows.length * rowHeight;
            }
            if (!canvas._neurons) {

              canvas._neurons = [];

              for (var ni = 0; ni < 30; ni++) {

                canvas._neurons.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: Math.random(), size: 1 + Math.random() * 1.5 });

              }

            }

            var neurons = canvas._neurons;

            canvas._brainTick = canvas._brainTick || 0;
            var brainAlive = true;
            var brainMotionReduced = !!prefersReducedMotion;

            function isBrainAtlasHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelBrainFrame() {
              if (canvas._brainAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvas._brainAnim);
              canvas._brainAnim = null;
            }

            function scheduleBrainFrame() {
              if (!brainAlive || brainMotionReduced || canvas._brainAnim || isBrainAtlasHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              canvas._brainAnim = requestAnimationFrame(drawBrainFrame);
            }

            function cleanupBrainCanvas() {
              brainAlive = false;
              cancelBrainFrame();
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onBrainAtlasVisibilityChange);
              if (window.__alloBrainAtlasCanvasCleanup === canvas._brainCleanup) window.__alloBrainAtlasCanvasCleanup = null;
              canvas._brainCleanup = null;
            }

            function onBrainAtlasVisibilityChange() {
              if (!brainAlive) return;
              if (!canvas.isConnected) { cleanupBrainCanvas(); return; }
              if (isBrainAtlasHidden()) cancelBrainFrame();
              else { cancelBrainFrame(); drawBrainFrame(); }
            }

            canvas._brainCleanup = cleanupBrainCanvas;
            try { window.__alloBrainAtlasCanvasCleanup = canvas._brainCleanup; } catch (e) {}
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onBrainAtlasVisibilityChange);

            function drawBrainFrame() {

              if (!brainAlive) return;
              canvas._brainAnim = null;
              if (!canvas.isConnected) { cleanupBrainCanvas(); return; }
              if (isBrainAtlasHidden()) { cancelBrainFrame(); return; }
              if (!brainMotionReduced) canvas._brainTick++;

              ctx.clearRect(0, 0, W, H);

              ctx.save();



              // ── Enhanced Neurotransmitter Synapse View ──

              if (currentView.isNT) {

                var tNT = canvas._brainTick * 0.02;

                ctx.lineCap = 'round'; ctx.lineJoin = 'round';



                // ── Presynaptic Terminal (gradient fill + shadow) ──

                ctx.save();

                ctx.shadowColor = 'rgba(124,58,237,0.12)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;

                var preGrad = ctx.createLinearGradient(W * 0.1, H * 0.05, W * 0.1, H * 0.40);

                preGrad.addColorStop(0, '#f3eefc');

                preGrad.addColorStop(0.5, '#ede5f8');

                preGrad.addColorStop(1, '#e4d9f0');

                ctx.beginPath();

                ctx.moveTo(W * 0.15, H * 0.05); ctx.lineTo(W * 0.85, H * 0.05);

                ctx.quadraticCurveTo(W * 0.90, H * 0.05, W * 0.90, H * 0.10);

                ctx.lineTo(W * 0.90, H * 0.32);

                ctx.quadraticCurveTo(W * 0.85, H * 0.38, W * 0.70, H * 0.40);

                ctx.lineTo(W * 0.30, H * 0.40);

                ctx.quadraticCurveTo(W * 0.15, H * 0.38, W * 0.10, H * 0.32);

                ctx.lineTo(W * 0.10, H * 0.10);

                ctx.quadraticCurveTo(W * 0.10, H * 0.05, W * 0.15, H * 0.05);

                ctx.fillStyle = preGrad; ctx.fill();

                ctx.restore();

                ctx.beginPath();

                ctx.moveTo(W * 0.15, H * 0.05); ctx.lineTo(W * 0.85, H * 0.05);

                ctx.quadraticCurveTo(W * 0.90, H * 0.05, W * 0.90, H * 0.10);

                ctx.lineTo(W * 0.90, H * 0.32);

                ctx.quadraticCurveTo(W * 0.85, H * 0.38, W * 0.70, H * 0.40);

                ctx.lineTo(W * 0.30, H * 0.40);

                ctx.quadraticCurveTo(W * 0.15, H * 0.38, W * 0.10, H * 0.32);

                ctx.lineTo(W * 0.10, H * 0.10);

                ctx.quadraticCurveTo(W * 0.10, H * 0.05, W * 0.15, H * 0.05);

                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();



                // Phospholipid bilayer texture on presynaptic membrane bottom

                ctx.save(); ctx.globalAlpha = 0.22;

                for (var pli = 0; pli < 16; pli++) {

                  var plx = W * 0.18 + pli * W * 0.045;

                  var plBaseY = H * 0.38 + (pli < 4 || pli > 12 ? -H * 0.02 : 0);

                  // Lipid heads (circles)

                  ctx.beginPath(); ctx.arc(plx, plBaseY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#a78bfa'; ctx.fill();

                  // Lipid tails (wavy lines)

                  ctx.beginPath();

                  ctx.moveTo(plx, plBaseY - 3);

                  ctx.quadraticCurveTo(plx - 1.5, plBaseY - 8, plx, plBaseY - 12);

                  ctx.strokeStyle = '#c4b5d8'; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.beginPath();

                  ctx.moveTo(plx + 1, plBaseY - 3);

                  ctx.quadraticCurveTo(plx + 2.5, plBaseY - 8, plx + 1, plBaseY - 12);

                  ctx.stroke();

                }

                ctx.restore();



                // Label

                ctx.font = 'bold ' + Math.round(18 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#7c3aed'; ctx.textAlign = 'center';

                ctx.fillText('PRESYNAPTIC TERMINAL', W * 0.5, H * 0.10);

                // (Drug banner moved to end of draw loop for z-order)



                // ── Mitochondria (energy source) ──

                ctx.save(); ctx.globalAlpha = 0.35;

                ctx.beginPath(); ctx.ellipse(W * 0.78, H * 0.12, W * 0.06, H * 0.025, 0.2, 0, Math.PI * 2);

                ctx.fillStyle = '#fde68a'; ctx.fill();

                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1; ctx.stroke();

                // Cristae folds

                for (var cr = 0; cr < 4; cr++) {

                  var crx = W * 0.74 + cr * W * 0.022;

                  ctx.beginPath();

                  ctx.moveTo(crx, H * 0.10); ctx.quadraticCurveTo(crx + W * 0.005, H * 0.12, crx, H * 0.14);

                  ctx.strokeStyle = '#b4590080'; ctx.lineWidth = 0.6; ctx.stroke();

                }

                ctx.font = 'bold ' + Math.round(14 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#b45900'; ctx.textAlign = 'center';

                ctx.fillText('Mitochondria', W * 0.78, H * 0.155);

                ctx.restore();



                // ── Calcium channel (animated glow on membrane edge) ──

                var caGlow = 0.4 + Math.sin(tNT * 2.5) * 0.3;

                ctx.save();

                ctx.globalAlpha = caGlow;

                ctx.beginPath(); ctx.arc(W * 0.42, H * 0.39, 7, 0, Math.PI * 2);

                var caGrad = ctx.createRadialGradient(W * 0.42, H * 0.39, 1, W * 0.42, H * 0.39, 7);

                caGrad.addColorStop(0, '#22d3ee');

                caGrad.addColorStop(1, '#22d3ee00');

                ctx.fillStyle = caGrad; ctx.fill();

                ctx.restore();

                ctx.beginPath(); ctx.arc(W * 0.42, H * 0.39, 4, 0, Math.PI * 2);

                ctx.fillStyle = '#06b6d4'; ctx.fill();

                ctx.strokeStyle = '#0891b2'; ctx.lineWidth = 1; ctx.stroke();

                ctx.font = 'bold ' + Math.round(14 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#0e7490'; ctx.textAlign = 'center';

                ctx.fillText('Ca\u00B2\u207A', W * 0.42, H * 0.39 + 2);



                // ── Vesicles with glow + one fusing ──

                var vesColors = ['#c084fc', '#a78bfa', '#8b5cf6', '#7c3aed'];

                var vesicleCount = Math.round(8 * activeSim.vesicleRate);

                // Vesicle rate callout (drug effect)
                if (activeSim.id !== 'normal' && activeSim.vesicleRate !== 1) {
                  ctx.save();
                  ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillStyle = activeSim.color; ctx.textAlign = 'right';
                  ctx.fillText(activeSim.vesicleRate < 1 ? '\u2B07 Fewer vesicles' : '\u2B06 More vesicles', W * 0.90, H * 0.175);
                  ctx.restore();
                }

                for (var vi = 0; vi < vesicleCount; vi++) {

                  var vx = W * 0.22 + (vi % 4) * W * 0.15, vy = H * 0.20 + Math.floor(vi / 4) * H * 0.064;

                  var isFusing = vi === 5; // One vesicle animates toward membrane

                  var vRadius = 9;

                  var vyAnim = vy;

                  if (isFusing) {

                    vyAnim = vy + Math.abs(Math.sin(tNT * 1.2)) * H * 0.08;

                    vRadius = 9 - Math.abs(Math.sin(tNT * 1.2)) * 3;

                  }

                  // Vesicle glow

                  ctx.save();

                  var vesGlow = ctx.createRadialGradient(vx - 2, vyAnim - 2, 1, vx, vyAnim, vRadius);

                  vesGlow.addColorStop(0, '#f0e6ff');

                  vesGlow.addColorStop(0.5, vesColors[vi % 4] + '80');

                  vesGlow.addColorStop(1, vesColors[vi % 4]);

                  ctx.beginPath(); ctx.arc(vx, vyAnim, vRadius, 0, Math.PI * 2);

                  ctx.fillStyle = vesGlow; ctx.fill();

                  ctx.strokeStyle = vesColors[vi % 4]; ctx.lineWidth = 1; ctx.stroke();

                  // NT molecules inside (small dots)

                  if (!isFusing || vRadius > 5) {

                    for (var di = 0; di < 4; di++) {

                      var da = (di / 4) * Math.PI * 2 + tNT * 0.5;

                      var dr = vRadius * 0.4;

                      ctx.beginPath(); ctx.arc(vx + Math.cos(da) * dr, vyAnim + Math.sin(da) * dr, 1.5, 0, Math.PI * 2);

                      ctx.fillStyle = '#fff'; ctx.fill();

                    }

                  }

                }



                // ── Synaptic Cleft (gradient + depth) ──

                ctx.save();

                var cleftGrad = ctx.createLinearGradient(0, H * 0.41, 0, H * 0.59);

                cleftGrad.addColorStop(0, '#ede5f810');

                cleftGrad.addColorStop(0.3, '#e8f4f812');

                cleftGrad.addColorStop(0.7, '#e8f4f812');

                cleftGrad.addColorStop(1, '#fef3c710');

                ctx.fillStyle = cleftGrad;

                ctx.fillRect(W * 0.06, H * 0.41, W * 0.88, H * 0.18);

                ctx.restore();

                // Cleft borders

                ctx.setLineDash([5, 3]);

                ctx.strokeStyle = '#94a3b830'; ctx.lineWidth = 1;

                ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.41); ctx.lineTo(W * 0.94, H * 0.41); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.59); ctx.lineTo(W * 0.94, H * 0.59); ctx.stroke();

                ctx.setLineDash([]);

                // Cleft label with background

                ctx.save();

                var cleftLabelW = 110;

                ctx.fillStyle = '#f1f5f9'; ctx.globalAlpha = 0.7;

                ctx.beginPath();

                ctx.roundRect(W * 0.5 - cleftLabelW / 2, H * 0.482, cleftLabelW, 18, 5);

                ctx.fill();

                ctx.restore();

                ctx.font = 'bold ' + Math.round(16 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#475569'; ctx.textAlign = 'center';

                ctx.fillText('SYNAPTIC CLEFT (~20nm)', W * 0.5, H * 0.50);

                // ── NT particle count callout (drug effect) ──
                if (activeSim.id !== 'normal') {
                  var pmLabel = activeSim.particleMult > 1 ? '\u2B06 ' + activeSim.particleMult + '\u00D7 NT in cleft' : activeSim.particleMult < 1 ? '\u2B07 NT reduced' : '';
                  if (pmLabel) {
                    ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                    ctx.fillStyle = activeSim.color; ctx.textAlign = 'left';
                    ctx.fillText(pmLabel, W * 0.06, H * 0.475);
                  }
                }



                // ── Animated NT particles (glowing with trails) ──

                var ntParticleCount = Math.round(14 * activeSim.particleMult);

                for (var pi = 0; pi < ntParticleCount; pi++) {

                  var px2 = W * 0.14 + ((pi % 14) * W * 0.055) + Math.sin(tNT * 1.5 + pi * 0.8) * 10;

                  var py2 = H * 0.43 + Math.abs(Math.sin(tNT * 1.0 + pi * 1.3)) * H * 0.14;

                  // Glow

                  ctx.save();

                  var ptGlow = ctx.createRadialGradient(px2, py2, 0.5, px2, py2, 6);

                  ptGlow.addColorStop(0, 'hsla(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 65%, 0.6)');

                  ptGlow.addColorStop(1, 'hsla(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 65%, 0)');

                  ctx.beginPath(); ctx.arc(px2, py2, 6, 0, Math.PI * 2);

                  ctx.fillStyle = ptGlow; ctx.fill();

                  ctx.restore();

                  // Particle core

                  ctx.beginPath(); ctx.arc(px2, py2, 2.5, 0, Math.PI * 2);

                  ctx.fillStyle = 'hsl(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 58%)';

                  ctx.fill();

                  ctx.strokeStyle = 'hsl(' + ((pi * 25 + canvas._brainTick) % 360) + ', 80%, 45%)';

                  ctx.lineWidth = 0.5; ctx.stroke();

                }



                // ── Postsynaptic Membrane (gradient + shadow) ──

                ctx.save();

                ctx.shadowColor = 'rgba(124,58,237,0.10)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = -3;

                var postGrad = ctx.createLinearGradient(0, H * 0.59, 0, H * 0.96);

                postGrad.addColorStop(0, '#fef9ee');

                postGrad.addColorStop(0.3, '#fdf3e0');

                postGrad.addColorStop(1, '#fcecd0');

                ctx.beginPath();

                ctx.moveTo(W * 0.06, H * 0.59); ctx.lineTo(W * 0.94, H * 0.59);

                ctx.quadraticCurveTo(W * 0.96, H * 0.61, W * 0.94, H * 0.63);

                ctx.lineTo(W * 0.94, H * 0.96); ctx.lineTo(W * 0.06, H * 0.96);

                ctx.lineTo(W * 0.06, H * 0.63);

                ctx.quadraticCurveTo(W * 0.04, H * 0.61, W * 0.06, H * 0.59);

                ctx.fillStyle = postGrad; ctx.fill();

                ctx.restore();

                ctx.beginPath();

                ctx.moveTo(W * 0.06, H * 0.59); ctx.lineTo(W * 0.94, H * 0.59);

                ctx.quadraticCurveTo(W * 0.96, H * 0.61, W * 0.94, H * 0.63);

                ctx.lineTo(W * 0.94, H * 0.96); ctx.lineTo(W * 0.06, H * 0.96);

                ctx.lineTo(W * 0.06, H * 0.63);

                ctx.quadraticCurveTo(W * 0.04, H * 0.61, W * 0.06, H * 0.59);

                ctx.strokeStyle = '#b49370'; ctx.lineWidth = 1.5; ctx.stroke();



                // Phospholipid bilayer on postsynaptic top

                ctx.save(); ctx.globalAlpha = 0.18;

                for (var pli2 = 0; pli2 < 18; pli2++) {

                  var plx2 = W * 0.10 + pli2 * W * 0.046;

                  var plBaseY2 = H * 0.60;

                  ctx.beginPath(); ctx.arc(plx2, plBaseY2, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#d97706'; ctx.fill();

                  ctx.beginPath();

                  ctx.moveTo(plx2, plBaseY2 + 3);

                  ctx.quadraticCurveTo(plx2 - 1.5, plBaseY2 + 8, plx2, plBaseY2 + 12);

                  ctx.strokeStyle = '#e8c48a'; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.beginPath();

                  ctx.moveTo(plx2 + 1, plBaseY2 + 3);

                  ctx.quadraticCurveTo(plx2 + 2.5, plBaseY2 + 8, plx2 + 1, plBaseY2 + 12);

                  ctx.stroke();

                }

                ctx.restore();



                ctx.font = 'bold ' + Math.round(16 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#92400e'; ctx.textAlign = 'center';

                ctx.fillText('POSTSYNAPTIC DENSITY', W * 0.5, H * 0.70);



                // ── Enhanced Receptors (varied shapes) ──

                var recData = [

                  { name: 'AMPA', type: 'ion', color: '#3b82f6' },

                  { name: 'NMDA', type: 'ion', color: '#8b5cf6' },

                  { name: 'mGluR', type: 'meta', color: '#f59e0b' },

                  { name: 'GABA-A', type: 'ion', color: '#22c55e' },

                  { name: 'GABA-B', type: 'meta', color: '#14b8a6' },

                  { name: 'nACh', type: 'ion', color: '#ef4444' }

                ];

                for (var ri = 0; ri < 6; ri++) {

                  var rx = W * 0.14 + ri * W * 0.135, ry = H * 0.59;

                  var rd = recData[ri];

                  if (rd.type === 'ion') {

                    // Y-shaped ionotropic receptor

                    ctx.beginPath();

                    ctx.moveTo(rx, ry + 16); ctx.lineTo(rx, ry + 6);

                    ctx.moveTo(rx, ry + 6); ctx.lineTo(rx - 5, ry - 2);

                    ctx.moveTo(rx, ry + 6); ctx.lineTo(rx + 5, ry - 2);

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 2.5; ctx.stroke();

                    // Pore opening

                    ctx.beginPath(); ctx.arc(rx, ry + 3, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#fff'; ctx.fill();

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 1; ctx.stroke();

                  } else {

                    // Serpentine metabotropic receptor (7TM-like wavy)

                    ctx.beginPath();

                    ctx.moveTo(rx - 4, ry - 2);

                    ctx.quadraticCurveTo(rx - 2, ry + 4, rx, ry + 2);

                    ctx.quadraticCurveTo(rx + 2, ry, rx + 1, ry + 6);

                    ctx.quadraticCurveTo(rx, ry + 10, rx - 1, ry + 14);

                    ctx.lineTo(rx + 3, ry + 16);

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 2; ctx.stroke();

                    // G-protein bulge

                    ctx.beginPath(); ctx.ellipse(rx + 2, ry + 15, 4, 2.5, 0, 0, Math.PI * 2);

                    ctx.fillStyle = rd.color + '30'; ctx.fill();

                    ctx.strokeStyle = rd.color; ctx.lineWidth = 0.8; ctx.stroke();

                  }

                  // Receptor boost/dim effects from simulation

                  if (activeSim.receptorBoost && rd.name === activeSim.receptorBoost) {

                    ctx.save();

                    var boostGlow = ctx.createRadialGradient(rx, ry + 8, 2, rx, ry + 8, 18);

                    boostGlow.addColorStop(0, rd.color + '60');

                    boostGlow.addColorStop(1, rd.color + '00');

                    ctx.beginPath(); ctx.arc(rx, ry + 8, 18 + Math.sin(tNT * 3) * 4, 0, Math.PI * 2);

                    ctx.fillStyle = boostGlow; ctx.fill();

                    ctx.restore();

                    ctx.font = 'bold ' + Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';

                    ctx.fillStyle = '#16a34a'; ctx.textAlign = 'center';

                    ctx.fillText('\u2B06 ENHANCED', rx, ry + 46);

                  }

                  if (activeSim.receptorDim && rd.name === activeSim.receptorDim) {

                    ctx.save();

                    ctx.globalAlpha = 0.3 + Math.sin(tNT * 2) * 0.1;

                    ctx.beginPath(); ctx.moveTo(rx - 10, ry - 4); ctx.lineTo(rx + 10, ry + 18);

                    ctx.moveTo(rx + 10, ry - 4); ctx.lineTo(rx - 10, ry + 18);

                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.stroke();

                    ctx.restore();

                    ctx.font = 'bold ' + Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';

                    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';

                    ctx.fillText('\u2B07 BLOCKED', rx, ry + 46);

                  }

                  ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';

                  ctx.fillStyle = rd.color; ctx.textAlign = 'center';

                  ctx.fillText(rd.name, rx, ry + 30);

                }



                // ── Reuptake Pump (animated spinning arrows) ──

                ctx.save();

                ctx.translate(W * 0.88, H * 0.41);

                // Pump body

                var pumpGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);

                if (activeSim.reuptakeBlocked) {

                  pumpGrad.addColorStop(0, '#fef2f2');

                  pumpGrad.addColorStop(1, '#fecaca');

                } else {

                  pumpGrad.addColorStop(0, '#d1fae5');

                  pumpGrad.addColorStop(1, '#86efac');

                }

                ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);

                ctx.fillStyle = pumpGrad; ctx.fill();

                ctx.strokeStyle = activeSim.reuptakeBlocked ? '#ef4444' : '#16a34a'; ctx.lineWidth = 1.5; ctx.stroke();

                if (activeSim.reuptakeBlocked) {

                  // Blocked: red X overlay with pulsing glow

                  ctx.save();

                  ctx.shadowColor = 'rgba(239,68,68,0.5)';

                  ctx.shadowBlur = 6 + Math.sin(tNT * 3) * 3;

                  ctx.beginPath();

                  ctx.moveTo(-7, -7); ctx.lineTo(7, 7);

                  ctx.moveTo(7, -7); ctx.lineTo(-7, 7);

                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke();

                  ctx.restore();

                } else {

                  // Spinning arrow (normal operation)

                  ctx.rotate(tNT * 2);

                  ctx.beginPath();

                  ctx.moveTo(0, -8); ctx.lineTo(4, -3); ctx.lineTo(-4, -3);

                  ctx.fillStyle = '#16a34a'; ctx.fill();

                  ctx.beginPath();

                  ctx.moveTo(0, 8); ctx.lineTo(-4, 3); ctx.lineTo(4, 3);

                  ctx.fill();

                }

                ctx.restore();

                ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = activeSim.reuptakeBlocked ? '#ef4444' : '#16a34a'; ctx.textAlign = 'center';

                ctx.fillText(activeSim.reuptakeBlocked ? 'BLOCKED' : 'Reuptake', W * 0.88, H * 0.41 + 22);

                ctx.fillText(activeSim.reuptakeBlocked ? 'Reuptake' : 'Transporter', W * 0.88, H * 0.41 + 33);



                // ── Enzyme (MAO/COMT) with scissor icon ──

                ctx.save();

                var enzGrad = ctx.createRadialGradient(W * 0.12, H * 0.50, 2, W * 0.12, H * 0.50, 12);

                enzGrad.addColorStop(0, '#fef2f2');

                enzGrad.addColorStop(1, '#fecaca');

                ctx.beginPath(); ctx.arc(W * 0.12, H * 0.50, 12, 0, Math.PI * 2);

                ctx.fillStyle = enzGrad; ctx.fill();

                ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.stroke();

                // Scissor lines

                ctx.beginPath();

                ctx.moveTo(W * 0.12 - 5, H * 0.50 - 5); ctx.lineTo(W * 0.12 + 5, H * 0.50 + 5);

                ctx.moveTo(W * 0.12 + 5, H * 0.50 - 5); ctx.lineTo(W * 0.12 - 5, H * 0.50 + 5);

                ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.2; ctx.stroke();

                ctx.restore();

                ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#dc2626'; ctx.textAlign = 'center';

                ctx.fillText('MAO/COMT', W * 0.12, H * 0.50 + 20);

                ctx.fillText('Enzyme', W * 0.12, H * 0.50 + 31);



                // ── Signal Cascade (multi-stage with arrows) ──

                ctx.save();

                // cAMP / IP3 cascade stages

                var cascadeY = [H * 0.73, H * 0.79, H * 0.85, H * 0.91];

                var cascadeLabels = ['G-protein', 'cAMP / IP₃', 'Protein Kinase', 'Gene Expression'];

                var cascadeColors = ['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'];

                for (var ci = 0; ci < 4; ci++) {

                  // Arrow

                  if (ci > 0) {

                    ctx.beginPath();

                    ctx.moveTo(W * 0.5, cascadeY[ci - 1] + 4);

                    ctx.lineTo(W * 0.5, cascadeY[ci] - 4);

                    ctx.strokeStyle = cascadeColors[ci] + '60'; ctx.lineWidth = 1.5;

                    ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);

                    // Arrowhead

                    ctx.beginPath();

                    ctx.moveTo(W * 0.5, cascadeY[ci] - 2);

                    ctx.lineTo(W * 0.49, cascadeY[ci] - 5);

                    ctx.moveTo(W * 0.5, cascadeY[ci] - 2);

                    ctx.lineTo(W * 0.51, cascadeY[ci] - 5);

                    ctx.strokeStyle = cascadeColors[ci]; ctx.lineWidth = 1; ctx.stroke();

                  }

                  // Label pill

                  var pillW = ctx.measureText ? 70 : 70;

                  ctx.beginPath();

                  ctx.roundRect(W * 0.5 - pillW / 2, cascadeY[ci] - 5, pillW, 11, 3);

                  ctx.fillStyle = cascadeColors[ci] + '15'; ctx.fill();

                  ctx.strokeStyle = cascadeColors[ci] + '40'; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';

                  ctx.fillStyle = cascadeColors[ci]; ctx.textAlign = 'center';

                  ctx.fillText(cascadeLabels[ci], W * 0.5, cascadeY[ci] + 3);

                }

                ctx.restore();



                // ── Active Drug Banner (drawn last for z-order) ──
                if (activeSim.id !== 'normal') {
                  var banW = W * 0.72, banH = 22, banX = W * 0.5 - banW / 2, banY = H * 0.125;
                  ctx.save();
                  ctx.shadowColor = activeSim.color + '40'; ctx.shadowBlur = 8;
                  ctx.beginPath(); ctx.roundRect(banX, banY, banW, banH, 6);
                  ctx.fillStyle = activeSim.color; ctx.fill();
                  ctx.restore();
                  ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
                  var banText = activeSim.icon + ' ' + activeSim.name.toUpperCase();
                  ctx.fillText(banText, W * 0.5, banY + 15);
                  // Frosted backdrop behind mechanism note
                  var mechMap = { ssri: 'Blocks SERT reuptake \u2192 \u2191 serotonin in cleft', snri: 'Blocks SERT+NET \u2192 \u2191 serotonin & norepinephrine', benzo: 'Enhances GABA-A Cl\u207B channel opening', cocaine: 'Blocks DAT+NET+SERT \u2192 massive DA accumulation', opioid: 'Activates \u03BC-opioid receptors \u2192 analgesia & euphoria', alcohol: 'Enhances GABA-A + blocks NMDA glutamate' };
                  var mechText = mechMap[activeSim.id] || '';
                  if (mechText) {
                    ctx.font = Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';
                    var mechW = ctx.measureText(mechText).width + 16;
                    ctx.save();
                    ctx.globalAlpha = 0.85;
                    ctx.beginPath(); ctx.roundRect(W * 0.5 - mechW / 2, banY + banH + 1, mechW, 14, 3);
                    ctx.fillStyle = '#fff'; ctx.fill();
                    ctx.restore();
                    ctx.fillStyle = activeSim.color;
                    ctx.fillText(mechText, W * 0.5, banY + banH + 12);
                  }
                }

                // ── View Label (styled) ──

                ctx.save();

                ctx.beginPath();

                ctx.roundRect(W * 0.5 - 80, H - 18, 160, 14, 4);

                ctx.fillStyle = '#f8fafc'; ctx.fill();

                ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5; ctx.stroke();

                ctx.font = 'bold ' + Math.round(13 * fontScale) + 'px Inter, system-ui, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';

                ctx.fillText('NEUROTRANSMITTER SYNAPSE', W * 0.5, H - 8);

                ctx.restore();



                scheduleBrainFrame(); return;

              }



              // ── Enhanced Brain Rendering ──

              ctx.lineJoin = 'round';

              ctx.lineCap = 'round';



              // Brain gradient for realistic tissue appearance

              var brainGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, W * 0.05, W * 0.5, H * 0.4, W * 0.45);

              brainGrad.addColorStop(0, '#f0e6f6');

              brainGrad.addColorStop(0.4, '#ebe0f0');

              brainGrad.addColorStop(0.8, '#e4d8ea');

              brainGrad.addColorStop(1, '#ddd0e2');



              // ── Realistic cortical tissue helpers ──
              // Seeded RNG so the folds stay identical across animation frames.
              function foldRng(seed){ var s=(seed>>>0)||1; return function(){ s=(s*16807)%2147483647; return (s&0x7fffffff)/2147483647; }; }

              // Paint embossed cortical convolutions inside the current clip.
              // Ridges are concentric wavy arcs around a distant flow-centre so gyri
              // gently bow over the hemisphere. Light source is top-left.
              function paintCortexFolds(fcx, fcy, r0, r1, seed, o){
                o = o || {};
                var r = foldRng(seed);
                var gap = o.gap || 11;
                var hi = o.crest || 'rgba(255,250,254,0.55)';
                var sh = o.shadow || 'rgba(72,44,96,0.5)';
                var ridge = o.ridge || '#e7d6e4';
                var a0 = o.a0 !== undefined ? o.a0 : -2.05;
                var a1 = o.a1 !== undefined ? o.a1 : -1.05;
                var ampMul = o.ampMul || 1, freqMul = o.freqMul || 1;
                ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round';
                for (var rad=r0; rad<=r1; rad+=gap){
                  var a = a0 + r()*0.3;
                  while (a < a1){
                    var span = 0.5 + r()*1.4;
                    var segEnd = Math.min(a1, a + span);
                    var amp1 = gap*(0.45+r()*0.8)*ampMul, amp2 = gap*(0.22+r()*0.5)*ampMul;
                    var f1 = (3+r()*5)*freqMul, f2 = (7+r()*8)*freqMul;
                    var p1 = r()*6.28, p2 = r()*6.28;
                    var jitter = (r()-0.5)*gap*0.7;
                    var tone = 0.86 + r()*0.14;
                    (function(a, segEnd, amp1, amp2, f1, f2, p1, p2, jitter, tone){
                      function rAt(x){ return rad+jitter+Math.sin(x*f1+p1)*amp1+Math.sin(x*f2+p2)*amp2; }
                      function stroke(dr, color, wd){ ctx.beginPath(); var first=true; for(var x=a; x<=segEnd; x+=0.035){ var rr=rAt(x)+dr, xx=fcx+Math.cos(x)*rr, yy=fcy+Math.sin(x)*rr; if(first){ctx.moveTo(xx,yy);first=false;}else ctx.lineTo(xx,yy);} ctx.strokeStyle=color; ctx.lineWidth=wd; ctx.stroke(); }
                      stroke(gap*0.16, sh, gap*0.95);
                      ctx.globalAlpha=tone; stroke(-gap*0.04, ridge, gap*0.60); ctx.globalAlpha=1;
                      stroke(-gap*0.24, hi, gap*0.15);
                    })(a, segEnd, amp1, amp2, f1, f2, p1, p2, jitter, tone);
                    a = segEnd - 0.15 + r()*0.4;
                  }
                }
                ctx.restore();
              }

              // Faint branching pial vasculature (living-tissue cue).
              function drawVasculature(seeds, seed, o){
                o=o||{}; var r=foldRng(seed);
                ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle=o.color||'rgba(150,72,98,0.15)';
                function vessel(x,y,ang,len,wd,depth){
                  if(depth>4||len<6) return;
                  var steps=Math.max(3,Math.round(len/8)), cx=x, cy=y, ca=ang;
                  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineWidth=wd;
                  for(var i=0;i<steps;i++){ ca+=(r()-0.5)*0.5; cx+=Math.cos(ca)*(len/steps); cy+=Math.sin(ca)*(len/steps); ctx.lineTo(cx,cy);
                    if(i===Math.round(steps*0.55)&&depth<3&&r()<0.8) vessel(cx,cy,ca+(r()<0.5?1:-1)*(0.5+r()*0.5),len*(0.5+r()*0.25),wd*0.66,depth+1); }
                  ctx.stroke();
                  if(depth<2) vessel(cx,cy,ca+(r()-0.5)*0.6,len*0.55,wd*0.7,depth+1);
                }
                seeds.forEach(function(s){ vessel(s[0],s[1],s[2],s[3],s[4]||1.4,0); });
                ctx.restore();
              }

              // A sulcus/fissure: a soft dark valley with a bright upper lip.
              function drawSulcus(pts, o){
                o=o||{};
                ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round';
                function trace(){ ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); for(var i=1;i<pts.length;i++){ var p=pts[i]; if(p.length===4) ctx.quadraticCurveTo(p[0],p[1],p[2],p[3]); else ctx.lineTo(p[0],p[1]); } }
                var wide=o.wide||6;
                ctx.save(); ctx.translate(0,-wide*0.34); trace(); ctx.strokeStyle=o.lip||'rgba(255,252,255,0.5)'; ctx.lineWidth=wide*0.34; ctx.stroke(); ctx.restore();
                trace(); ctx.strokeStyle=o.shadow||'rgba(74,46,104,0.34)'; ctx.lineWidth=wide; ctx.stroke();
                trace(); ctx.strokeStyle=o.core||'rgba(58,36,86,0.6)'; ctx.lineWidth=o.core_w||2.2; ctx.stroke();
                ctx.restore();
              }

              // Medium tissue base inside the current clip (so gyri gaps read as darker sulci).
              function paintTissueBase(hx, hy){
                var sub = ctx.createRadialGradient(hx,hy,W*0.05,W*0.5,H*0.44,W*0.52);
                sub.addColorStop(0,'#dcc6d6'); sub.addColorStop(0.6,'#cbb0c4'); sub.addColorStop(1,'#b998ae');
                ctx.fillStyle=sub; ctx.fillRect(0,0,W,H);
              }
              // Rounded-form shading: edge ambient-occlusion + top-left sheen.
              function paintTissueShade(hx, hy){
                var ao = ctx.createRadialGradient(W*0.48,H*0.42,W*0.24,W*0.48,H*0.44,W*0.52);
                ao.addColorStop(0,'rgba(0,0,0,0)'); ao.addColorStop(0.72,'rgba(0,0,0,0)'); ao.addColorStop(1,'rgba(74,47,104,0.28)');
                ctx.fillStyle=ao; ctx.fillRect(0,0,W,H);
                var sheen = ctx.createRadialGradient(hx,hy,W*0.02,hx,hy,W*0.34);
                sheen.addColorStop(0,'rgba(255,252,255,0.30)'); sheen.addColorStop(1,'rgba(255,252,255,0)');
                ctx.fillStyle=sheen; ctx.fillRect(0,0,W,H);
              }

              // A feathered lobe tint (educational colour that fades out — no hard seams).
              // Caller sets ctx.globalAlpha for overall strength; hex must be 6-digit.
              function softTint(cx, cy, rad, hex){
                var g = ctx.createRadialGradient(cx,cy,rad*0.12,cx,cy,rad);
                g.addColorStop(0, hex); g.addColorStop(0.68, hex+'59'); g.addColorStop(1, hex+'00');
                ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
              }

              // Realistic foliated cerebellum.
              function drawCerebellum(cx, cy, rx, ry) {
                ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round';
                ctx.save(); ctx.shadowColor='rgba(70,45,110,0.26)'; ctx.shadowBlur=8; ctx.shadowOffsetY=3;
                ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
                var body = ctx.createRadialGradient(cx-rx*0.3,cy-ry*0.4,rx*0.1,cx,cy,rx*1.05);
                body.addColorStop(0,'#d9c6d6'); body.addColorStop(0.6,'#c6aec2'); body.addColorStop(1,'#a98ba6');
                ctx.fillStyle=body; ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.clip();
                var n = Math.max(6, Math.round(ry*2/3.2));
                for (var i=0;i<=n;i++){
                  var fy = cy - ry + (i/n)*ry*2;
                  var tt = (fy-cy)/ry;
                  var span = rx*Math.sqrt(Math.max(0,1-tt*tt));
                  ctx.beginPath(); ctx.moveTo(cx-span, fy); ctx.quadraticCurveTo(cx, fy+(i%2?1.6:-1.6), cx+span, fy);
                  ctx.strokeStyle='rgba(70,44,96,0.34)'; ctx.lineWidth=1.4; ctx.stroke();
                  ctx.beginPath(); ctx.moveTo(cx-span, fy-1.3); ctx.quadraticCurveTo(cx, fy-1.3+(i%2?1.6:-1.6), cx+span, fy-1.3);
                  ctx.strokeStyle='rgba(255,250,254,0.4)'; ctx.lineWidth=0.7; ctx.stroke();
                }
                var vg = ctx.createLinearGradient(cx-rx*0.16,0,cx+rx*0.16,0);
                vg.addColorStop(0,'rgba(70,44,96,0)'); vg.addColorStop(0.5,'rgba(70,44,96,0.15)'); vg.addColorStop(1,'rgba(70,44,96,0)');
                ctx.fillStyle=vg; ctx.fillRect(cx-rx*0.16,cy-ry,rx*0.32,ry*2);
                ctx.restore();
                ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
                ctx.strokeStyle='#7c5c9a'; ctx.lineWidth=1.6; ctx.stroke();
                ctx.restore();
              }

              // Realistic tapered brainstem (midbrain -> pons bulge -> medulla). Keeps 4-corner signature.
              function drawBrainstem(x1, y1, x2, y2, x3, y3, x4, y4) {
                var topX=(x1+x4)/2, topY=(y1+y4)/2, topW=Math.abs(x4-x1);
                var botX=(x2+x3)/2, botY=(y2+y3)/2, botW=Math.abs(x3-x2);
                var len=botY-topY;
                var midW=topW*1.3, medW=Math.max(botW, topW*0.68);
                function stemPath(){ ctx.beginPath(); ctx.moveTo(topX-topW/2, topY); ctx.quadraticCurveTo(topX-midW/2, topY+len*0.42, botX-medW/2, botY); ctx.lineTo(botX+medW/2, botY); ctx.quadraticCurveTo(topX+midW/2, topY+len*0.42, topX+topW/2, topY); ctx.closePath(); }
                ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round';
                stemPath();
                var g=ctx.createLinearGradient(topX-midW/2,0,topX+midW/2,0);
                g.addColorStop(0,'#b193ae'); g.addColorStop(0.5,'#d6c0d2'); g.addColorStop(1,'#a98ba6');
                ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#7c5c9a'; ctx.lineWidth=1.5; ctx.stroke();
                ctx.save(); stemPath(); ctx.clip();
                ctx.globalAlpha=0.16; ctx.strokeStyle='#5a3a7e'; ctx.lineWidth=0.7;
                for(var i=1;i<7;i++){ var yy=topY+len*(i/7); ctx.beginPath(); ctx.moveTo(topX-midW/2,yy); ctx.quadraticCurveTo(topX,yy+2,topX+midW/2,yy); ctx.stroke(); }
                ctx.restore();
                ctx.restore();
              }

              

              if (viewKey === 'lateral') {

                var outline = function(){ ctx.beginPath();
                  ctx.moveTo(W*0.15,H*0.45);
                  ctx.quadraticCurveTo(W*0.12,H*0.20,W*0.35,H*0.12);
                  ctx.quadraticCurveTo(W*0.55,H*0.08,W*0.72,H*0.15);
                  ctx.quadraticCurveTo(W*0.88,H*0.25,W*0.90,H*0.42);
                  ctx.quadraticCurveTo(W*0.88,H*0.55,W*0.78,H*0.60);
                  ctx.quadraticCurveTo(W*0.70,H*0.72,W*0.62,H*0.76);
                  ctx.quadraticCurveTo(W*0.50,H*0.78,W*0.42,H*0.72);
                  ctx.quadraticCurveTo(W*0.30,H*0.62,W*0.20,H*0.55);
                  ctx.quadraticCurveTo(W*0.14,H*0.50,W*0.15,H*0.45);
                };

                // Silhouette with soft drop shadow
                ctx.save();
                ctx.shadowColor='rgba(70,45,110,0.28)'; ctx.shadowBlur=15; ctx.shadowOffsetX=4; ctx.shadowOffsetY=6;
                outline(); ctx.fillStyle=brainGrad; ctx.fill();
                ctx.restore();

                // Realistic cortical surface, clipped to the silhouette
                ctx.save();
                outline(); ctx.clip();
                paintTissueBase(W*0.40, H*0.30);
                paintCortexFolds(W*0.50, H*1.35, H*0.55, H*1.30, 4021, {gap:11, a0:-2.05, a1:-1.05});
                drawVasculature([[W*0.30,H*0.24,0.9,70],[W*0.62,H*0.20,1.6,80],[W*0.44,H*0.16,1.2,60],[W*0.24,H*0.44,0.3,64],[W*0.72,H*0.34,2.2,70],[W*0.52,H*0.60,1.5,58]], 7788);
                paintTissueShade(W*0.36, H*0.26);
                // Soft, feathered lobe tints (educational colour over the real texture)
                ctx.globalAlpha=0.17;
                softTint(W*0.28, H*0.30, W*0.19, '#3b82f6');  // frontal
                softTint(W*0.63, H*0.26, W*0.17, '#22c55e');  // parietal
                softTint(W*0.39, H*0.62, W*0.15, '#eab308');  // temporal
                softTint(W*0.81, H*0.46, W*0.13, '#ef4444');  // occipital
                ctx.globalAlpha=1;
                // Major fissures as grooves
                drawSulcus([[W*0.20,H*0.53],[W*0.35,H*0.50,W*0.50,H*0.475],[W*0.60,H*0.445,W*0.67,H*0.425]], {wide:14, core:'rgba(52,30,78,0.7)', core_w:2.6, shadow:'rgba(66,40,96,0.4)'});
                drawSulcus([[W*0.50,H*0.11],[W*0.47,H*0.28,W*0.44,H*0.38],[W*0.42,H*0.48,W*0.40,H*0.55]], {wide:8});
                drawSulcus([[W*0.78,H*0.15],[W*0.75,H*0.28,W*0.72,H*0.40]], {wide:6});
                ctx.restore();

                // Outline
                outline(); ctx.strokeStyle='#6d4a8e'; ctx.lineWidth=2.4; ctx.stroke();

                // Cerebellum + brainstem
                drawCerebellum(W*0.80, H*0.65, W*0.10, H*0.08);
                drawBrainstem(W*0.62,H*0.62, W*0.65,H*0.80, W*0.58,H*0.80, W*0.55,H*0.62);

              

              } else if (viewKey === 'medial') {

                var outlineM = function(){ ctx.beginPath();
                  ctx.moveTo(W*0.20,H*0.50);
                  ctx.quadraticCurveTo(W*0.15,H*0.22,W*0.40,H*0.12);
                  ctx.quadraticCurveTo(W*0.60,H*0.08,W*0.78,H*0.18);
                  ctx.quadraticCurveTo(W*0.88,H*0.32,W*0.85,H*0.50);
                  ctx.quadraticCurveTo(W*0.82,H*0.60,W*0.72,H*0.62);
                  ctx.lineTo(W*0.60,H*0.60);
                  ctx.quadraticCurveTo(W*0.50,H*0.58,W*0.40,H*0.60);
                  ctx.quadraticCurveTo(W*0.25,H*0.58,W*0.20,H*0.50);
                };

                // Silhouette with soft drop shadow
                ctx.save();
                ctx.shadowColor='rgba(70,45,110,0.24)'; ctx.shadowBlur=12; ctx.shadowOffsetX=3; ctx.shadowOffsetY=5;
                outlineM(); ctx.fillStyle=brainGrad; ctx.fill();
                ctx.restore();

                // Realistic cortical surface, clipped
                ctx.save();
                outlineM(); ctx.clip();
                paintTissueBase(W*0.42, H*0.26);
                paintCortexFolds(W*0.52, H*1.5, H*0.90, H*1.45, 5310, {gap:11, a0:-1.95, a1:-1.15});
                drawVasculature([[W*0.34,H*0.22,1.0,66],[W*0.60,H*0.18,1.8,72],[W*0.48,H*0.15,1.3,54]], 4471);
                paintTissueShade(W*0.40, H*0.24);
                // Soft, feathered cingulate tint
                ctx.globalAlpha=0.16;
                softTint(W*0.50, H*0.30, W*0.22, '#8b5cf6');
                ctx.globalAlpha=1;
                // Cingulate + calcarine sulci as grooves
                drawSulcus([[W*0.25,H*0.30],[W*0.45,H*0.18,W*0.68,H*0.22]], {wide:5});
                drawSulcus([[W*0.72,H*0.42],[W*0.80,H*0.48,W*0.84,H*0.50]], {wide:5});
                ctx.restore();

                // Outline
                outlineM(); ctx.strokeStyle='#7c5c9a'; ctx.lineWidth=2; ctx.stroke();

                // Corpus callosum (thick C-shaped band with gradient)

                ctx.save();

                var ccGrad = ctx.createLinearGradient(W * 0.30, H * 0.34, W * 0.70, H * 0.34);

                ccGrad.addColorStop(0, '#e0d6f8');

                ccGrad.addColorStop(0.5, '#d4c8f0');

                ccGrad.addColorStop(1, '#e0d6f8');

                ctx.beginPath();

                ctx.moveTo(W * 0.30, H * 0.40);

                ctx.quadraticCurveTo(W * 0.50, H * 0.30, W * 0.70, H * 0.36);

                ctx.quadraticCurveTo(W * 0.72, H * 0.38, W * 0.71, H * 0.40);

                ctx.quadraticCurveTo(W * 0.50, H * 0.34, W * 0.32, H * 0.43);

                ctx.closePath();

                ctx.fillStyle = ccGrad; ctx.fill();

                ctx.strokeStyle = '#b49de0'; ctx.lineWidth = 1.2; ctx.stroke();

                // Corpus callosum label area

                ctx.font = '7px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#8b6fc080'; ctx.textAlign = 'center';

                ctx.fillText('CC', W * 0.50, H * 0.38);

                ctx.restore();



                // Thalamus (egg shape in center)

                ctx.beginPath();

                ctx.ellipse(W * 0.52, H * 0.44, W * 0.06, H * 0.04, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#fde68a40'; ctx.fill();

                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1; ctx.stroke();

                ctx.font = '6px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#b4590080'; ctx.textAlign = 'center';

                ctx.fillText('Thalamus', W * 0.52, H * 0.445);



                // Hypothalamus (small oval below)

                ctx.beginPath();

                ctx.ellipse(W * 0.45, H * 0.50, W * 0.03, H * 0.02, 0, 0, Math.PI * 2);

                ctx.fillStyle = '#fecaca40'; ctx.fill();

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.8; ctx.stroke();
                // Cerebellum with foliation
                drawCerebellum(W*0.78, H*0.68, W*0.09, H*0.08);
                // Brainstem
                drawBrainstem(W*0.58,H*0.58, W*0.62,H*0.80, W*0.55,H*0.80, W*0.50,H*0.58);

              

              } else if (viewKey === 'superior') {

                var hemis = function(){ ctx.beginPath(); ctx.ellipse(W*0.38,H*0.50,W*0.18,H*0.38,0,0,Math.PI*2); ctx.ellipse(W*0.62,H*0.50,W*0.18,H*0.38,0,0,Math.PI*2); };

                // Both hemispheres with soft drop shadow
                ctx.save();
                ctx.shadowColor='rgba(70,45,110,0.20)'; ctx.shadowBlur=10; ctx.shadowOffsetY=4;
                ctx.beginPath(); ctx.ellipse(W*0.38,H*0.50,W*0.18,H*0.38,0,0,Math.PI*2); ctx.fillStyle=brainGrad; ctx.fill();
                ctx.beginPath(); ctx.ellipse(W*0.62,H*0.50,W*0.18,H*0.38,0,0,Math.PI*2); ctx.fillStyle=brainGrad; ctx.fill();
                ctx.restore();

                // Realistic cortical surface (gyri run front-to-back), clipped to both hemispheres
                ctx.save();
                hemis(); ctx.clip();
                paintTissueBase(W*0.42, H*0.30);
                // flow-centre far to the left -> near-vertical (antero-posterior) ridges
                paintCortexFolds(W*(-1.15), H*0.50, W*1.28, W*2.05, 6120, {gap:11, a0:-0.30, a1:0.30, ampMul:1.7, freqMul:2.1});
                drawVasculature([[W*0.34,H*0.30,1.4,74],[W*0.66,H*0.32,1.7,74],[W*0.40,H*0.66,1.5,64],[W*0.60,H*0.64,1.6,64]], 3390);
                paintTissueShade(W*0.42, H*0.30);
                // Soft, feathered lobe tints (frontal / occipital, both hemispheres)
                ctx.globalAlpha=0.14;
                softTint(W*0.38, H*0.34, W*0.16, '#3b82f6'); softTint(W*0.62, H*0.34, W*0.16, '#3b82f6');
                softTint(W*0.38, H*0.72, W*0.11, '#ef4444'); softTint(W*0.62, H*0.72, W*0.11, '#ef4444');
                ctx.globalAlpha=1;
                // Central sulcus as a groove
                drawSulcus([[W*0.20,H*0.38],[W*0.35,H*0.35,W*0.50,H*0.36],[W*0.65,H*0.35,W*0.80,H*0.38]], {wide:6});
                ctx.restore();

                // Longitudinal fissure (deep midline groove)
                drawSulcus([[W*0.50,H*0.11],[W*0.50,H*0.90]], {wide:9, core:'rgba(48,28,72,0.72)', core_w:2.8, shadow:'rgba(60,38,90,0.4)'});

                // Hemisphere outlines
                ctx.beginPath(); ctx.ellipse(W*0.38,H*0.50,W*0.18,H*0.38,0,0,Math.PI*2); ctx.strokeStyle='#7c5c9a'; ctx.lineWidth=2; ctx.stroke();
                ctx.beginPath(); ctx.ellipse(W*0.62,H*0.50,W*0.18,H*0.38,0,0,Math.PI*2); ctx.stroke();

              

              } else if (viewKey === 'inferior') {

                var outlineI = function(){ ctx.beginPath(); ctx.ellipse(W*0.50,H*0.38,W*0.30,H*0.28,0,0,Math.PI*2); };

                // Cerebral base with soft drop shadow
                ctx.save();
                ctx.shadowColor='rgba(70,45,110,0.22)'; ctx.shadowBlur=11; ctx.shadowOffsetY=4;
                outlineI(); ctx.fillStyle=brainGrad; ctx.fill();
                ctx.restore();

                // Realistic cortical surface, clipped
                ctx.save();
                outlineI(); ctx.clip();
                paintTissueBase(W*0.42, H*0.24);
                // flow-centre far left -> antero-posterior ridges on the ventral surface
                paintCortexFolds(W*(-1.0), H*0.38, W*1.15, W*1.75, 8842, {gap:11, a0:-0.34, a1:0.34, ampMul:1.7, freqMul:2.1});
                drawVasculature([[W*0.30,H*0.30,1.3,70],[W*0.70,H*0.30,1.8,70],[W*0.50,H*0.20,1.5,56]], 9021);
                paintTissueShade(W*0.42, H*0.22);
                // Soft, feathered temporal-lobe tints
                ctx.globalAlpha=0.15;
                softTint(W*0.35, H*0.36, W*0.14, '#eab308'); softTint(W*0.65, H*0.36, W*0.14, '#eab308');
                ctx.globalAlpha=1;
                ctx.restore();

                // Longitudinal fissure (ventral midline groove)
                ctx.save(); outlineI(); ctx.clip();
                drawSulcus([[W*0.50,H*0.12],[W*0.50,H*0.64]], {wide:7, core:'rgba(52,30,78,0.66)', core_w:2.4});
                ctx.restore();

                // Outline
                outlineI(); ctx.strokeStyle='#7c5c9a'; ctx.lineWidth=2; ctx.stroke();

                // Cerebellum with foliation
                drawCerebellum(W*0.50, H*0.72, W*0.22, H*0.12);
                // Brainstem
                drawBrainstem(W*0.46,H*0.55, W*0.48,H*0.68, W*0.52,H*0.68, W*0.54,H*0.55);

                // Optic chiasm (X shape with nerve paths)

                ctx.save();

                ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;

                // Optic nerves coming in

                ctx.beginPath();

                ctx.moveTo(W * 0.36, H * 0.26); ctx.quadraticCurveTo(W * 0.42, H * 0.28, W * 0.48, H * 0.33);

                ctx.stroke();

                ctx.beginPath();

                ctx.moveTo(W * 0.64, H * 0.26); ctx.quadraticCurveTo(W * 0.58, H * 0.28, W * 0.52, H * 0.33);

                ctx.stroke();

                // The crossing

                ctx.beginPath();

                ctx.moveTo(W * 0.48, H * 0.33); ctx.lineTo(W * 0.55, H * 0.38);

                ctx.moveTo(W * 0.52, H * 0.33); ctx.lineTo(W * 0.45, H * 0.38);

                ctx.lineWidth = 1.5; ctx.stroke();

                // Optic tracts going back

                ctx.beginPath();

                ctx.moveTo(W * 0.45, H * 0.38); ctx.quadraticCurveTo(W * 0.40, H * 0.42, W * 0.38, H * 0.48);

                ctx.stroke();

                ctx.beginPath();

                ctx.moveTo(W * 0.55, H * 0.38); ctx.quadraticCurveTo(W * 0.60, H * 0.42, W * 0.62, H * 0.48);

                ctx.stroke();

                // Label

                ctx.font = '7px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#b4590090'; ctx.textAlign = 'center';

                ctx.fillText('Optic Chiasm', W * 0.50, H * 0.30);

                ctx.restore();



                // Cranial nerve stumps (simplified)

                ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;

                var cnPositions = [[0.42, 0.46], [0.58, 0.46], [0.44, 0.50], [0.56, 0.50], [0.46, 0.54], [0.54, 0.54]];

                cnPositions.forEach(function (cn) {

                  ctx.beginPath();

                  ctx.moveTo(W * cn[0], H * cn[1]);

                  ctx.lineTo(W * (cn[0] + (cn[0] < 0.5 ? -0.04 : 0.04)), H * (cn[1] + 0.02));

                  ctx.stroke();

                });

                ctx.restore();
              

              } else if (currentView.isCranialWillis) {

                var cwT = canvas._brainTick || 0;
                var arteryColor = '#dc2626';
                var arterySoft = '#ef4444';
                var nerveColor = '#7c3aed';
                var nerveSoft = '#a855f7';
                var vesselDark = '#991b1b';
                var cyan = '#0f766e';

                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, W, H);
                var cwBg = ctx.createRadialGradient(W * 0.50, H * 0.42, W * 0.06, W * 0.50, H * 0.42, W * 0.72);
                cwBg.addColorStop(0, 'rgba(14,165,233,0.12)');
                cwBg.addColorStop(0.46, 'rgba(255,255,255,0.96)');
                cwBg.addColorStop(1, 'rgba(124,58,237,0.10)');
                ctx.fillStyle = cwBg;
                ctx.fillRect(0, 0, W, H);

                brainAtlasDrawCanvasHeading('Cranial nerves and Circle of Willis', 'Inferior view: nerve exits in violet, arterial ring and posterior circulation in red.', { accent: '#dc2626' });

                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.82)';
                ctx.strokeStyle = 'rgba(100,116,139,0.35)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(W * 0.36, H * 0.40, W * 0.22, H * 0.26, -0.12, 0, Math.PI * 2);
                ctx.ellipse(W * 0.64, H * 0.40, W * 0.22, H * 0.26, 0.12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = 'rgba(226,232,240,0.80)';
                ctx.beginPath();
                ctx.roundRect(W * 0.45, H * 0.43, W * 0.10, H * 0.33, 24);
                ctx.fill();
                ctx.strokeStyle = 'rgba(71,85,105,0.35)';
                ctx.stroke();
                ctx.fillStyle = 'rgba(219,234,254,0.68)';
                ctx.beginPath();
                ctx.ellipse(W * 0.50, H * 0.76, W * 0.20, H * 0.12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(14,165,233,0.45)';
                ctx.stroke();
                for (var fol = 0; fol < 6; fol++) {
                  ctx.beginPath();
                  ctx.ellipse(W * (0.39 + fol * 0.044), H * 0.76, W * 0.018, H * 0.09, 0.15, 0, Math.PI * 2);
                  ctx.strokeStyle = 'rgba(14,165,233,0.22)';
                  ctx.stroke();
                }
                ctx.fillStyle = '#64748b';
                ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillText('ventral brainstem', W * 0.50, H * 0.58);
                ctx.fillText('cerebellum', W * 0.50, H * 0.86);
                ctx.restore();

                function cwActive(id) { return !!(sel && sel.id === id); }

                function cwPath(points, color, width, offset) {
                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = width || 4;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.shadowColor = color + '55';
                  ctx.shadowBlur = 7;
                  ctx.beginPath();
                  ctx.moveTo(points[0][0], points[0][1]);
                  for (var cwi = 1; cwi < points.length; cwi++) {
                    var pt = points[cwi];
                    if (pt.length === 4) ctx.quadraticCurveTo(pt[0], pt[1], pt[2], pt[3]);
                    else ctx.lineTo(pt[0], pt[1]);
                  }
                  ctx.stroke();
                  ctx.shadowBlur = 0;
                  if (!brainMotionReduced) {
                    var start = points[0];
                    var last = points[points.length - 1];
                    var lx = last.length === 4 ? last[2] : last[0];
                    var ly = last.length === 4 ? last[3] : last[1];
                    var f = (cwT * 0.006 + (offset || 0)) % 1;
                    var px = start[0] + (lx - start[0]) * f;
                    var py = start[1] + (ly - start[1]) * f;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.restore();
                }

                function nerveLine(id, sx, sy, ex, ey, color, offset) {
                  var active = cwActive(id);
                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 3.8 : 2.4;
                  ctx.lineCap = 'round';
                  ctx.shadowColor = color + (active ? '99' : '44');
                  ctx.shadowBlur = active ? 12 : 5;
                  ctx.beginPath();
                  ctx.moveTo(sx, sy);
                  ctx.quadraticCurveTo((sx + ex) / 2, sy + (ey - sy) * 0.25, ex, ey);
                  ctx.stroke();
                  ctx.shadowBlur = 0;
                  if (!brainMotionReduced) {
                    var f = (cwT * 0.008 + (offset || 0)) % 1;
                    var qx = sx + (ex - sx) * f;
                    var qy = sy + (ey - sy) * f;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(qx, qy, active ? 5.5 : 4.5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(qx, qy, active ? 3.2 : 2.4, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.restore();
                }

                function cwPill(id, label, sub, x, y, color, wide) {
                  var active = cwActive(id);
                  ctx.save();
                  ctx.font = 'bold ' + Math.round(8.5 * fontScale) + 'px Inter, system-ui, sans-serif';
                  var labelWidth = ctx.measureText(label).width;
                  ctx.font = Math.round(6.8 * fontScale) + 'px Inter, system-ui, sans-serif';
                  var subtitleWidth = ctx.measureText(sub).width;
                  var measured = Math.max(labelWidth, subtitleWidth) + 28;
                  var pw = Math.max(wide ? W * 0.19 : W * 0.13, Math.min(W * 0.25, measured));
                  var ph = H * 0.061;
                  ctx.fillStyle = active ? color : 'rgba(255,255,255,0.94)';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 2.5 : 1.2;
                  ctx.shadowColor = active ? color + '80' : 'rgba(15,23,42,0.08)';
                  ctx.shadowBlur = active ? 14 : 6;
                  ctx.beginPath();
                  ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 10);
                  ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(x, y, pw, ph, label, sub, active ? '#ffffff' : color, active ? '#e2e8f0' : '#64748b');
                  ctx.restore();
                }

                function cwNode(id, x, y, r, color, label) {
                  var active = cwActive(id);
                  ctx.save();
                  ctx.fillStyle = active ? color : '#fff';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 3 : 1.5;
                  ctx.shadowColor = active ? color + '88' : 'rgba(15,23,42,0.10)';
                  ctx.shadowBlur = active ? 14 : 5;
                  ctx.beginPath(); ctx.arc(x, y, r + (active ? 2 : 0), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = active ? '#fff' : color;
                  ctx.font = 'bold ' + Math.round(7.2 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText(label, x, y + 3);
                  ctx.restore();
                }

                cwPath([[W * 0.43, H * 0.27], [W * 0.50, H * 0.235], [W * 0.57, H * 0.27]], arteryColor, 5, 0.00);
                cwPath([[W * 0.43, H * 0.27], [W * 0.36, H * 0.35, W * 0.39, H * 0.43], [W * 0.43, H * 0.52]], arteryColor, 5, 0.16);
                cwPath([[W * 0.57, H * 0.27], [W * 0.64, H * 0.35, W * 0.61, H * 0.43], [W * 0.57, H * 0.52]], arteryColor, 5, 0.32);
                cwPath([[W * 0.43, H * 0.52], [W * 0.50, H * 0.58], [W * 0.57, H * 0.52]], arteryColor, 5, 0.48);
                cwPath([[W * 0.50, H * 0.58], [W * 0.50, H * 0.71]], arteryColor, 5, 0.64);
                cwPath([[W * 0.45, H * 0.81], [W * 0.50, H * 0.71], [W * 0.55, H * 0.81]], arterySoft, 4, 0.80);
                cwPath([[W * 0.39, H * 0.43], [W * 0.25, H * 0.39]], arterySoft, 3.5, 0.22);
                cwPath([[W * 0.61, H * 0.43], [W * 0.75, H * 0.39]], arterySoft, 3.5, 0.38);
                cwPath([[W * 0.43, H * 0.27], [W * 0.39, H * 0.18]], arterySoft, 3.5, 0.54);
                cwPath([[W * 0.57, H * 0.27], [W * 0.61, H * 0.18]], arterySoft, 3.5, 0.70);

                nerveLine('olfactory_cn_i_cw', W * 0.43, H * 0.22, W * 0.25, H * 0.12, nerveSoft, 0.02);
                nerveLine('optic_chiasm_cn_ii_cw', W * 0.40, H * 0.29, W * 0.50, H * 0.31, '#f59e0b', 0.12);
                nerveLine('optic_chiasm_cn_ii_cw', W * 0.60, H * 0.29, W * 0.50, H * 0.31, '#f59e0b', 0.22);
                nerveLine('oculomotor_cn_iii_cw', W * 0.46, H * 0.43, W * 0.29, H * 0.40, nerveColor, 0.30);
                nerveLine('trigeminal_cn_v_cw', W * 0.42, H * 0.54, W * 0.20, H * 0.55, nerveColor, 0.42);
                nerveLine('abducens_cn_vi_cw', W * 0.49, H * 0.58, W * 0.32, H * 0.64, nerveColor, 0.52);
                nerveLine('facial_vestibular_cn_vii_viii_cw', W * 0.57, H * 0.61, W * 0.80, H * 0.61, nerveColor, 0.62);
                nerveLine('lower_cranial_ix_x_xi_cw', W * 0.56, H * 0.69, W * 0.82, H * 0.72, nerveColor, 0.72);
                nerveLine('hypoglossal_cn_xii_cw', W * 0.46, H * 0.70, W * 0.22, H * 0.74, nerveColor, 0.82);

                cwNode('circle_willis_cw', W * 0.50, H * 0.41, Math.min(W, H) * 0.038, vesselDark, 'CoW');
                cwNode('acomm_aca_cw', W * 0.50, H * 0.245, Math.min(W, H) * 0.025, arteryColor, 'A');
                cwNode('pcomm_ica_cw', W * 0.61, H * 0.43, Math.min(W, H) * 0.025, arteryColor, 'P');
                cwNode('basilar_vertebral_cw', W * 0.50, H * 0.71, Math.min(W, H) * 0.025, arteryColor, 'B');

                cwPill('olfactory_cn_i_cw', 'CN I', 'olfaction', W * 0.25, H * 0.13, nerveColor, false);
                cwPill('optic_chiasm_cn_ii_cw', 'CN II / chiasm', 'field crossing', W * 0.50, H * 0.335, '#f59e0b', true);
                cwPill('oculomotor_cn_iii_cw', 'CN III', 'pupil + eye', W * 0.25, H * 0.40, nerveColor, false);
                cwPill('trigeminal_cn_v_cw', 'CN V', 'face + chew', W * 0.20, H * 0.55, nerveColor, false);
                cwPill('abducens_cn_vi_cw', 'CN VI', 'abducts eye', W * 0.29, H * 0.65, nerveColor, false);
                cwPill('hypoglossal_cn_xii_cw', 'CN XII', 'tongue', W * 0.22, H * 0.75, nerveColor, false);
                cwPill('facial_vestibular_cn_vii_viii_cw', 'CN VII/VIII', 'face, hearing, balance', W * 0.80, H * 0.61, nerveColor, true);
                cwPill('lower_cranial_ix_x_xi_cw', 'CN IX-XI', 'swallow + voice', W * 0.82, H * 0.72, nerveColor, true);
                cwPill('acomm_aca_cw', 'AComm / ACA', 'common aneurysm', W * 0.50, H * 0.205, arteryColor, true);
                cwPill('pcomm_ica_cw', 'PComm / ICA', 'CN III neighbor', W * 0.76, H * 0.43, arteryColor, true);
                cwPill('basilar_vertebral_cw', 'Basilar / vertebral', 'brainstem supply', W * 0.50, H * 0.905, arteryColor, true);

                function cwClueChip(x, y, w, title, sub, color) {
                  brainAtlasDrawDecoderChip(x, y, w, H * 0.045, title, sub, color);
                }

                ctx.save();
                var clueActive = cwActive('bedside_clue_decoder_cw');
                var clueX = W * 0.10, clueY = H * 0.105, clueW = W * 0.80, clueH = H * 0.090;
                ctx.fillStyle = clueActive ? 'rgba(220,38,38,0.16)' : 'rgba(15,23,42,0.86)';
                ctx.strokeStyle = clueActive ? '#dc2626' : 'rgba(15,23,42,0.20)';
                ctx.lineWidth = clueActive ? 2 : 1;
                ctx.beginPath(); ctx.roundRect(clueX, clueY, clueW, clueH, 11); ctx.fill(); ctx.stroke();
                brainAtlasDrawDecoderBannerText(clueX, clueY, clueW, clueH, 'BEDSIDE CLUE DECODER', 'dangerous pattern -> likely anatomy', arteryColor);
                ctx.restore();

                var clueChipY = H * 0.143;
                var clueChipW = W * 0.180;
                cwClueChip(W * 0.120, clueChipY, clueChipW, 'Pupil + CN III', 'PComm aneurysm', arteryColor);
                cwClueChip(W * 0.320, clueChipY, clueChipW, 'Bitemporal fields', 'chiasm / pituitary', '#f59e0b');
                cwClueChip(W * 0.520, clueChipY, clueChipW, 'Hoarse + dysphagia', 'CN IX-X / medulla', nerveColor);
                cwClueChip(W * 0.720, clueChipY, clueChipW, 'Thunderclap', 'SAH / aneurysm', arteryColor);

              } else if (currentView.isStrokeTerritory) {
                var stT = canvas._brainTick || 0;
                var stPulse = brainMotionReduced ? 0.55 : (0.5 + 0.5 * Math.sin(stT * 0.055));
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, W, H);
                brainAtlasDrawCanvasHeading('Stroke territory localization', 'Match the deficit pattern to ACA, MCA, PCA, perforator, watershed, or posterior circulation.', { accent: '#ef4444' });

                function stActive(id) { return !!(sel && sel.id === id); }
                function stBrainClip() {
                  ctx.beginPath();
                  ctx.moveTo(W * 0.19, H * 0.40);
                  ctx.bezierCurveTo(W * 0.18, H * 0.22, W * 0.35, H * 0.14, W * 0.54, H * 0.17);
                  ctx.bezierCurveTo(W * 0.75, H * 0.20, W * 0.86, H * 0.35, W * 0.82, H * 0.52);
                  ctx.bezierCurveTo(W * 0.78, H * 0.70, W * 0.60, H * 0.77, W * 0.40, H * 0.72);
                  ctx.bezierCurveTo(W * 0.24, H * 0.68, W * 0.18, H * 0.56, W * 0.19, H * 0.40);
                }
                ctx.save();
                stBrainClip();
                ctx.fillStyle = '#e2e8f0';
                ctx.fill();
                ctx.clip();
                function stTerritory(id, color, draw) {
                  ctx.save();
                  ctx.fillStyle = color;
                  ctx.globalAlpha = stActive(id) ? 0.96 : 0.76;
                  draw();
                  ctx.fill();
                  ctx.restore();
                }
                stTerritory('aca_stroke_territory', '#60a5fa', function () {
                  ctx.beginPath();
                  ctx.moveTo(W * 0.26, H * 0.28);
                  ctx.bezierCurveTo(W * 0.34, H * 0.16, W * 0.54, H * 0.15, W * 0.66, H * 0.23);
                  ctx.lineTo(W * 0.55, H * 0.38);
                  ctx.lineTo(W * 0.30, H * 0.42);
                  ctx.closePath();
                });
                stTerritory('mca_superior_stroke', '#f97316', function () {
                  ctx.beginPath();
                  ctx.moveTo(W * 0.29, H * 0.41);
                  ctx.lineTo(W * 0.55, H * 0.38);
                  ctx.lineTo(W * 0.68, H * 0.45);
                  ctx.lineTo(W * 0.52, H * 0.56);
                  ctx.lineTo(W * 0.28, H * 0.54);
                  ctx.closePath();
                });
                stTerritory('mca_inferior_stroke', '#fb7185', function () {
                  ctx.beginPath();
                  ctx.moveTo(W * 0.33, H * 0.55);
                  ctx.lineTo(W * 0.52, H * 0.56);
                  ctx.lineTo(W * 0.72, H * 0.48);
                  ctx.bezierCurveTo(W * 0.75, H * 0.62, W * 0.62, H * 0.72, W * 0.42, H * 0.69);
                  ctx.bezierCurveTo(W * 0.32, H * 0.67, W * 0.27, H * 0.61, W * 0.33, H * 0.55);
                });
                stTerritory('pca_stroke_territory', '#8b5cf6', function () {
                  ctx.beginPath();
                  ctx.moveTo(W * 0.66, H * 0.23);
                  ctx.bezierCurveTo(W * 0.82, H * 0.30, W * 0.87, H * 0.45, W * 0.75, H * 0.60);
                  ctx.lineTo(W * 0.65, H * 0.50);
                  ctx.lineTo(W * 0.68, H * 0.38);
                  ctx.closePath();
                });
                stTerritory('watershed_stroke', '#facc15', function () {
                  ctx.beginPath();
                  ctx.moveTo(W * 0.55, H * 0.30);
                  ctx.lineTo(W * 0.65, H * 0.25);
                  ctx.lineTo(W * 0.68, H * 0.42);
                  ctx.lineTo(W * 0.57, H * 0.39);
                  ctx.closePath();
                });
                ctx.restore();
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 2;
                stBrainClip();
                ctx.stroke();
                ctx.strokeStyle = 'rgba(71,85,105,0.25)';
                ctx.lineWidth = 1.2;
                [0.32, 0.43, 0.54, 0.66].forEach(function (gx) {
                  ctx.beginPath();
                  ctx.moveTo(W * gx, H * 0.22);
                  ctx.bezierCurveTo(W * (gx + 0.05), H * 0.34, W * (gx - 0.08), H * 0.52, W * (gx + 0.02), H * 0.67);
                  ctx.stroke();
                });
                ctx.save();
                ctx.fillStyle = stActive('deep_lacunar_stroke') ? '#0f766e' : 'rgba(15,118,110,0.82)';
                ctx.strokeStyle = '#0f766e';
                ctx.lineWidth = stActive('deep_lacunar_stroke') ? 3 : 1.4;
                ctx.beginPath(); ctx.ellipse(W * 0.47, H * 0.58, W * 0.06, H * 0.075, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillText('deep', W * 0.47, H * 0.585);
                ctx.restore();
                ctx.save();
                ctx.fillStyle = stActive('posterior_circulation_stroke') ? '#dc2626' : 'rgba(220,38,38,0.86)';
                ctx.strokeStyle = '#991b1b';
                ctx.lineWidth = stActive('posterior_circulation_stroke') ? 3 : 1.5;
                ctx.beginPath(); ctx.roundRect(W * 0.66, H * 0.64, W * 0.16, H * 0.08, 16); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillText('vertebrobasilar', W * 0.74, H * 0.688);
                ctx.restore();

                function stLabel(id, text, x, y, color) {
                  var active = stActive(id);
                  ctx.save();
                  ctx.fillStyle = active ? color : '#ffffff';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 2.4 : 1.2;
                  ctx.shadowColor = active ? color + '88' : 'rgba(15,23,42,0.10)';
                  ctx.shadowBlur = active ? 14 : 5;
                  ctx.beginPath(); ctx.roundRect(x - W * 0.065, y - H * 0.020, W * 0.13, H * 0.040, 8); ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = active ? '#fff' : color;
                  ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText(text, x, y + 3);
                  ctx.restore();
                }
                stLabel('aca_stroke_territory', 'ACA: leg', W * 0.35, H * 0.25, '#2563eb');
                stLabel('mca_superior_stroke', 'MCA sup: face/arm', W * 0.43, H * 0.45, '#ea580c');
                stLabel('mca_inferior_stroke', 'MCA inf: language/neglect', W * 0.53, H * 0.62, '#be123c');
                stLabel('pca_stroke_territory', 'PCA: visual field', W * 0.76, H * 0.39, '#7c3aed');
                stLabel('watershed_stroke', 'watershed', W * 0.64, H * 0.30, '#b45309');

                function stCase(x, y, w, title, clue, answer, color) {
                  brainAtlasDrawClinicalCaseCard(x, y, w, H * 0.082, title, clue, answer, color);
                }
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('CASE MODE: deficit pattern -> likely territory', W * 0.08, H * 0.785);
                var stCardW = W * 0.205;
                stCase(W * 0.08, H * 0.81, stCardW, 'Leg > arm', 'weak leg, abulia', 'ACA', '#2563eb');
                stCase(W * 0.305, H * 0.81, stCardW, 'Broca + face/arm', 'nonfluent + weak arm', 'MCA superior', '#ea580c');
                stCase(W * 0.53, H * 0.81, stCardW, 'Fluent/neglect', 'comprehension or space', 'MCA inferior', '#be123c');
                stCase(W * 0.755, H * 0.81, stCardW, 'Visual field', 'homonymous loss', 'PCA', '#7c3aed');
                if (!brainMotionReduced) {
                  var sx = W * (0.20 + 0.62 * ((stT * 0.003) % 1));
                  ctx.strokeStyle = 'rgba(15,23,42,0.18)';
                  ctx.beginPath(); ctx.moveTo(sx, H * 0.14); ctx.lineTo(sx, H * 0.74); ctx.stroke();
                }

              } else if (currentView.isCerebellumClinic) {
                var cbT = canvas._brainTick || 0;
                var cbGlow = brainMotionReduced ? 0.55 : (0.5 + 0.5 * Math.sin(cbT * 0.06));
                ctx.fillStyle = '#f7fee7';
                ctx.fillRect(0, 0, W, H);
                brainAtlasDrawCanvasHeading('Cerebellum clinic map', 'Same-side coordination signs: zone + artery + bedside clue.', { accent: '#84cc16', title: '#14532d', subtitle: '#3f6212' });
                function cbActive(id) { return !!(sel && sel.id === id); }
                function cbLobe(id, x, y, rx, ry, color, label) {
                  var active = cbActive(id);
                  ctx.save();
                  ctx.fillStyle = color;
                  ctx.strokeStyle = active ? '#111827' : 'rgba(22,101,52,0.65)';
                  ctx.lineWidth = active ? 3 : 1.5;
                  ctx.shadowColor = color;
                  ctx.shadowBlur = active ? 18 : 7;
                  ctx.beginPath(); ctx.ellipse(x, y, rx + (active ? 3 : 0), ry + (active ? 3 : 0), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = '#fff';
                  ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText(label, x, y + 3);
                  ctx.restore();
                }
                cbLobe('hemisphere_cerebellum_clinic', W * 0.33, H * 0.47, W * 0.16, H * 0.15, '#22c55e', 'LEFT limb zone');
                cbLobe('hemisphere_cerebellum_clinic', W * 0.67, H * 0.47, W * 0.16, H * 0.15, '#22c55e', 'RIGHT limb zone');
                cbLobe('vermis_cerebellum_clinic', W * 0.50, H * 0.45, W * 0.07, H * 0.21, '#84cc16', 'VERMIS');
                cbLobe('flocculonodular_cerebellum', W * 0.50, H * 0.64, W * 0.14, H * 0.06, '#14b8a6', 'vestibular');
                ctx.save();
                ctx.strokeStyle = 'rgba(63,98,18,0.32)';
                ctx.lineWidth = 1.2;
                for (var cbi = 0; cbi < 8; cbi++) {
                  ctx.beginPath();
                  ctx.ellipse(W * 0.50, H * (0.30 + cbi * 0.045), W * (0.10 + cbi * 0.018), H * 0.012, 0, 0, Math.PI * 2);
                  ctx.stroke();
                }
                ctx.restore();
                cbLobe('deep_nuclei_cerebellum', W * 0.50, H * 0.55, W * 0.055, H * 0.035, '#f59e0b', 'deep nuclei');
                function arteryBand(id, label, x, y, w, color) {
                  var active = cbActive(id);
                  ctx.save();
                  ctx.fillStyle = active ? color : '#fff';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 2.5 : 1.2;
                  ctx.shadowColor = active ? color + '88' : 'rgba(15,23,42,0.08)';
                  ctx.shadowBlur = active ? 14 : 5;
                  ctx.beginPath(); ctx.roundRect(x, y, w, H * 0.048, 8); ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(x + w / 2, y + H * 0.024, w, H * 0.048, label, '', active ? '#ffffff' : color, '#64748b');
                  ctx.restore();
                }
                arteryBand('pica_cerebellum', 'PICA: inferior + medulla', W * 0.19, H * 0.74, W * 0.22, '#dc2626');
                arteryBand('aica_cerebellum', 'AICA: face/hearing + pons', W * 0.39, H * 0.82, W * 0.22, '#2563eb');
                arteryBand('sca_cerebellum', 'SCA: superior + dysarthria', W * 0.59, H * 0.74, W * 0.22, '#7c3aed');
                ctx.strokeStyle = 'rgba(15,118,110,0.42)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath(); ctx.moveTo(W * 0.50, H * 0.20); ctx.lineTo(W * 0.50, H * 0.70); ctx.stroke();
                ctx.setLineDash([]);
                if (!brainMotionReduced) {
                  ctx.fillStyle = 'rgba(250,204,21,' + (0.20 + cbGlow * 0.25) + ')';
                  ctx.beginPath(); ctx.arc(W * 0.50, H * 0.55, W * 0.055 + cbGlow * 8, 0, Math.PI * 2); ctx.fill();
                }
                function cbCase(x, y, title, clue, answer, color) {
                  brainAtlasDrawClinicalCaseCard(x, y, W * 0.205, H * 0.082, title, clue, answer, color);
                }
                ctx.fillStyle = '#14532d'; ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
                ctx.fillText('CASE MODE: sign -> cerebellar zone', W * 0.08, H * 0.145);
                cbCase(W * 0.08, H * 0.165, 'Wide gait', 'trunk wobble', 'vermis', '#65a30d');
                cbCase(W * 0.305, H * 0.165, 'Finger overshoot', 'same-side limb', 'hemisphere', '#16a34a');
                cbCase(W * 0.53, H * 0.165, 'Vertigo + nystagmus', 'gaze unstable', 'vestibular zone', '#0f766e');
                cbCase(W * 0.755, H * 0.165, 'Hoarse + ataxic', 'bulbar signs', 'PICA', '#dc2626');

              } else if (currentView.isBrainstemCross) {
                var bsT = canvas._brainTick || 0;
                var bsPulse = brainMotionReduced ? 0.55 : (0.5 + 0.5 * Math.sin(bsT * 0.07));
                ctx.fillStyle = '#f0f9ff';
                ctx.fillRect(0, 0, W, H);
                brainAtlasDrawCanvasHeading('Brainstem crossed-findings map', 'Cranial nerve side marks lesion side; body findings often cross.', { accent: '#0ea5e9' });
                function bsActive(id) { return !!(sel && sel.id === id); }
                function bsSection(id, x, y, w, h, color, title, cn) {
                  var active = bsActive(id);
                  ctx.save();
                  ctx.fillStyle = active ? color : '#fff';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 3 : 1.5;
                  ctx.shadowColor = active ? color + '88' : 'rgba(15,23,42,0.08)';
                  ctx.shadowBlur = active ? 16 : 6;
                  ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(x, y, w * 0.82, h * 0.72, title, cn, active ? '#ffffff' : color, active ? '#e2e8f0' : '#475569');
                  ctx.restore();
                }
                bsSection('midbrain_cross_section', W * 0.26, H * 0.34, W * 0.20, H * 0.18, '#7c3aed', 'MIDBRAIN', 'CN III/IV');
                bsSection('pons_cross_section', W * 0.50, H * 0.42, W * 0.24, H * 0.20, '#2563eb', 'PONS', 'CN V-VIII');
                bsSection('medulla_cross_section', W * 0.74, H * 0.50, W * 0.20, H * 0.18, '#dc2626', 'MEDULLA', 'CN IX-XII');
                function bsTract(id, y, color, label) {
                  var active = bsActive(id);
                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 5 : 3;
                  ctx.lineCap = 'round';
                  ctx.shadowColor = active ? color + '99' : color + '44';
                  ctx.shadowBlur = active ? 14 : 6;
                  ctx.beginPath();
                  ctx.moveTo(W * 0.18, y);
                  ctx.bezierCurveTo(W * 0.36, y - H * 0.035, W * 0.58, y + H * 0.035, W * 0.82, y);
                  ctx.stroke();
                  if (!brainMotionReduced) {
                    var f = (bsT * 0.004 + (y / H)) % 1;
                    var px = W * (0.18 + 0.64 * f);
                    var py = y + Math.sin(f * Math.PI * 2) * H * 0.025;
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 5 + bsPulse * 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.shadowBlur = 0;
                  brainAtlasDrawPathLabel(W * 0.10, y, label, color, W * 0.15);
                  ctx.restore();
                }
                bsTract('corticospinal_brainstem', H * 0.64, '#ef4444', 'motor');
                bsTract('medial_lemniscus_brainstem', H * 0.70, '#0ea5e9', 'vibration/position');
                bsTract('spinothalamic_brainstem', H * 0.76, '#f59e0b', 'pain/temp');
                ctx.save();
                ctx.fillStyle = bsActive('cranial_nuclei_brainstem') ? '#14b8a6' : '#ffffff';
                ctx.strokeStyle = '#14b8a6';
                ctx.lineWidth = bsActive('cranial_nuclei_brainstem') ? 3 : 1.4;
                ctx.beginPath(); ctx.roundRect(W * 0.36, H * 0.18, W * 0.28, H * 0.075, 12); ctx.fill(); ctx.stroke();
                ctx.fillStyle = bsActive('cranial_nuclei_brainstem') ? '#fff' : '#0f766e';
                ctx.font = 'bold ' + Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('cranial nerve nuclei: ipsilateral clues', W * 0.50, H * 0.225);
                ctx.restore();
                function bsCase(x, y, title, clue, answer, color) {
                  brainAtlasDrawClinicalCaseCard(x, y, W * 0.205, H * 0.082, title, clue, answer, color);
                }
                ctx.fillStyle = '#0f172a'; ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
                ctx.fillText('CASE MODE: crossed finding -> level', W * 0.08, H * 0.835);
                bsCase(W * 0.08, H * 0.86, 'CN III + weak body', 'down/out eye + hemiparesis', 'midbrain', '#7c3aed');
                bsCase(W * 0.305, H * 0.86, 'CN VI/VII + weakness', 'face/eye + body', 'pons', '#2563eb');
                bsCase(W * 0.53, H * 0.86, 'Hoarse + crossed pain', 'nucleus ambiguus', 'medulla', '#dc2626');
                bsCase(W * 0.755, H * 0.86, 'Pure tracts only', 'motor/sensory no cortex', 'long tracts', '#f59e0b');

              } else if (currentView.isCsfHydro) {
                var csfT = canvas._brainTick || 0;
                var csfPulse = brainMotionReduced ? 0.55 : (0.5 + 0.5 * Math.sin(csfT * 0.06));
                ctx.fillStyle = '#eff6ff';
                ctx.fillRect(0, 0, W, H);
                var csfGrad = ctx.createLinearGradient(0, 0, W, H);
                csfGrad.addColorStop(0, 'rgba(14,165,233,0.16)');
                csfGrad.addColorStop(0.55, 'rgba(255,255,255,0.92)');
                csfGrad.addColorStop(1, 'rgba(37,99,235,0.12)');
                ctx.fillStyle = csfGrad;
                ctx.fillRect(0, 0, W, H);
                brainAtlasDrawCanvasHeading('CSF flow and hydrocephalus map', 'Trace production, narrow bottlenecks, subarachnoid circulation, and venous reabsorption.', { accent: '#06b6d4' });

                function csfActive(id) { return !!(sel && sel.id === id); }
                ctx.save();
                ctx.strokeStyle = 'rgba(37,99,235,0.20)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(W * 0.50, H * 0.47, W * 0.34, H * 0.28, -0.08, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,255,255,0.50)';
                ctx.fill();
                ctx.restore();

                function csfArrow(x1, y1, x2, y2, color, label) {
                  var angle = Math.atan2(y2 - y1, x2 - x1);
                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 3;
                  ctx.lineCap = 'round';
                  ctx.shadowColor = color + '66';
                  ctx.shadowBlur = 8;
                  ctx.beginPath();
                  ctx.moveTo(x1, y1);
                  ctx.lineTo(x2, y2);
                  ctx.stroke();
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.moveTo(x2, y2);
                  ctx.lineTo(x2 - Math.cos(angle - 0.45) * 12, y2 - Math.sin(angle - 0.45) * 12);
                  ctx.lineTo(x2 - Math.cos(angle + 0.45) * 12, y2 - Math.sin(angle + 0.45) * 12);
                  ctx.closePath();
                  ctx.fill();
                  if (label) brainAtlasDrawPathLabel((x1 + x2) / 2, (y1 + y2) / 2 - H * 0.012, label, color, W * 0.16);
                  ctx.restore();
                }
                function csfParticle(x1, y1, x2, y2, offset, color) {
                  var f = brainMotionReduced ? offset : ((csfT * 0.004 + offset) % 1);
                  var x = x1 + (x2 - x1) * f;
                  var y = y1 + (y2 - y1) * f;
                  ctx.save();
                  ctx.fillStyle = '#ffffff';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.arc(x, y, 4 + csfPulse * 1.5, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.stroke();
                  ctx.restore();
                }
                function csfNode(id, x, y, w, h, color, label, sublabel) {
                  var active = csfActive(id);
                  ctx.save();
                  ctx.fillStyle = active ? color : '#ffffff';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 3 : 1.5;
                  ctx.shadowColor = active ? color + '88' : 'rgba(15,23,42,0.08)';
                  ctx.shadowBlur = active ? 16 : 6;
                  ctx.beginPath();
                  ctx.roundRect(x - w / 2, y - h / 2, w, h, 14);
                  ctx.fill();
                  ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(x, y, w, h, label, sublabel, active ? '#ffffff' : color, active ? 'rgba(255,255,255,0.82)' : '#475569');
                  ctx.restore();
                }

                var p1 = { x: W * 0.34, y: H * 0.33 };
                var p2 = { x: W * 0.50, y: H * 0.43 };
                var p3 = { x: W * 0.58, y: H * 0.54 };
                var p4 = { x: W * 0.63, y: H * 0.66 };
                var p5 = { x: W * 0.76, y: H * 0.52 };
                var p6 = { x: W * 0.58, y: H * 0.20 };
                csfArrow(p1.x, p1.y, p2.x - W * 0.05, p2.y, '#0ea5e9', 'Monro');
                csfArrow(p2.x, p2.y + H * 0.04, p3.x, p3.y - H * 0.04, '#2563eb', 'aqueduct bottleneck');
                csfArrow(p3.x, p3.y + H * 0.05, p4.x, p4.y - H * 0.05, '#2563eb', '');
                csfArrow(p4.x + W * 0.04, p4.y - H * 0.02, p5.x - W * 0.05, p5.y, '#0891b2', 'outlets');
                csfArrow(p5.x - W * 0.02, p5.y - H * 0.08, p6.x + W * 0.05, p6.y + H * 0.04, '#0284c7', 'reabsorb');
                [0, 0.33, 0.66].forEach(function (off) {
                  csfParticle(p1.x, p1.y, p2.x - W * 0.05, p2.y, off, '#0ea5e9');
                  csfParticle(p2.x, p2.y + H * 0.04, p3.x, p3.y - H * 0.04, off + 0.15, '#2563eb');
                  csfParticle(p4.x + W * 0.04, p4.y - H * 0.02, p5.x - W * 0.05, p5.y, off + 0.30, '#0891b2');
                });

                csfNode('lateral_ventricles_csf', W * 0.32, H * 0.35, W * 0.22, H * 0.095, '#0ea5e9', 'lateral ventricles', 'paired CSF spaces');
                csfNode('third_ventricle_csf', W * 0.50, H * 0.43, W * 0.15, H * 0.080, '#2563eb', 'third ventricle', 'midline funnel');
                csfNode('cerebral_aqueduct_csf', W * 0.58, H * 0.55, W * 0.13, H * 0.070, '#7c3aed', 'aqueduct', 'narrow channel');
                csfNode('fourth_ventricle_csf', W * 0.64, H * 0.68, W * 0.16, H * 0.080, '#0891b2', 'fourth ventricle', 'outlets to cisterns');
                csfNode('subarachnoid_space_csf', W * 0.77, H * 0.52, W * 0.17, H * 0.090, '#14b8a6', 'subarachnoid', 'around brain/spine');
                csfNode('arachnoid_granulations_csf', W * 0.58, H * 0.20, W * 0.20, H * 0.072, '#0f766e', 'arachnoid granulations', 'venous sinus return');

                ctx.save();
                ctx.fillStyle = csfActive('choroid_plexus_csf') ? '#f97316' : '#fed7aa';
                ctx.strokeStyle = '#f97316';
                ctx.lineWidth = csfActive('choroid_plexus_csf') ? 3 : 1.4;
                ctx.beginPath();
                ctx.roundRect(W * 0.205, H * 0.275, W * 0.15, H * 0.052, 14);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = csfActive('choroid_plexus_csf') ? '#ffffff' : '#9a3412';
                ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('choroid plexus', W * 0.28, H * 0.307);
                ctx.restore();

                ctx.save();
                ctx.strokeStyle = csfActive('cerebral_aqueduct_csf') ? '#dc2626' : 'rgba(220,38,38,0.72)';
                ctx.lineWidth = csfActive('cerebral_aqueduct_csf') ? 4 : 2;
                ctx.setLineDash([7, 5]);
                ctx.beginPath();
                ctx.arc(W * 0.58, H * 0.55, W * 0.095, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#dc2626';
                ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('classic blockage point', W * 0.58, H * 0.62);
                ctx.restore();

                function csfCase(x, y, title, clue, answer, color) {
                  brainAtlasDrawClinicalCaseCard(x, y, W * 0.205, H * 0.082, title, clue, answer, color);
                }
                brainAtlasDrawInfoStrip(W * 0.055, H * 0.742, W * 0.89, H * 0.052, 'CSF FLOW ROUTE: choroid -> lateral -> third -> aqueduct -> fourth -> subarachnoid -> venous sinus', '#0ea5e9');
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('HYDROCEPHALUS DECODER', W * 0.07, H * 0.812);
                csfCase(W * 0.08, H * 0.835, 'Obstructive', 'blocked route', 'upstream ventricles', '#7c3aed');
                csfCase(W * 0.305, H * 0.835, 'Communicating', 'absorption fails', 'all ventricles enlarge', '#0f766e');
                csfCase(W * 0.53, H * 0.835, 'NPH triad', 'gait + cognition + urine', 'chronic stretch', '#f59e0b');
                csfCase(W * 0.755, H * 0.835, 'Raised ICP', 'headache/vomit/CN VI', 'urgent pressure signs', '#dc2626');

              } else if (currentView.isHomunculus) {

                // Penfield-style cortical body map: motor strip before the sulcus,
                // sensory strip behind it, with size encoding cortical representation.
                var hT = canvas._brainTick || 0;
                var hPulse = brainMotionReduced ? 0.35 : (0.35 + 0.35 * Math.sin(hT * 0.045));
                var stripTop = H * 0.20, stripBottom = H * 0.88, stripH = stripBottom - stripTop;
                var motorX = W * 0.34, sensoryX = W * 0.66, sulcusX = W * 0.50;

                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, W, H);
                var hGrad = ctx.createLinearGradient(0, 0, W, H);
                hGrad.addColorStop(0, 'rgba(124,58,237,0.12)');
                hGrad.addColorStop(0.5, 'rgba(14,165,233,0.08)');
                hGrad.addColorStop(1, 'rgba(245,158,11,0.10)');
                ctx.fillStyle = hGrad;
                ctx.fillRect(0, 0, W, H);

                brainAtlasDrawCanvasHeading('Motor and sensory homunculus', 'Bigger bubbles mean more cortex is devoted to control or sensation, not bigger body parts.', { accent: '#7c3aed' });

                function stripPanel(x, color, title, subtitle) {
                  ctx.save();
                  ctx.fillStyle = 'rgba(255,255,255,0.90)';
                  ctx.strokeStyle = color + 'aa';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.roundRect(x - W * 0.105, stripTop - H * 0.035, W * 0.21, stripH + H * 0.07, 18);
                  ctx.fill();
                  ctx.stroke();
                  brainAtlasDrawBoundedNodeLabel(x, stripTop + H * 0.002, W * 0.19, H * 0.065, title, subtitle, color, '#64748b');
                  ctx.restore();
                }
                stripPanel(motorX, '#7c3aed', 'Primary motor cortex', 'precentral gyrus - BA 4');
                stripPanel(sensoryX, '#0ea5e9', 'Primary somatosensory cortex', 'postcentral gyrus - BA 3,1,2');

                ctx.save();
                ctx.setLineDash([7, 6]);
                ctx.strokeStyle = 'rgba(15,23,42,0.30)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sulcusX, stripTop - H * 0.02);
                ctx.lineTo(sulcusX, stripBottom + H * 0.025);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#334155';
                ctx.font = 'bold ' + Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillText('Central sulcus', sulcusX, stripTop - H * 0.045);
                ctx.restore();

                var homRows = [
                  { id: 'leg_foot_hom', label: 'Leg / foot', y: 0.30, size: 20, color: '#6366f1', note: 'ACA territory' },
                  { id: 'hand_hom', label: 'Hand', y: 0.52, size: 34, color: '#22c55e', note: 'fine movement + touch' },
                  { id: 'face_lips_hom', label: 'Face / lips', y: 0.69, size: 31, color: '#f59e0b', note: 'speech + expression' },
                  { id: 'tongue_hom', label: 'Tongue', y: 0.83, size: 24, color: '#ef4444', note: 'speech + swallowing' }
                ];

                function bodyBubble(x, y, size, color, active, sideLabel) {
                  ctx.save();
                  ctx.shadowColor = color + '80';
                  ctx.shadowBlur = active ? 18 : 8;
                  ctx.fillStyle = color + (active ? '44' : '26');
                  ctx.beginPath();
                  ctx.arc(x, y, size + (active ? hPulse * 4 : 0), 0, Math.PI * 2);
                  ctx.fill();
                  ctx.shadowBlur = 0;
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 3 : 2;
                  ctx.stroke();
                  ctx.fillStyle = color;
                  ctx.font = 'bold ' + Math.round(8.5 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText(sideLabel, x, y + 3);
                  ctx.restore();
                }

                homRows.forEach(function (row) {
                  var y = H * row.y;
                  var active = !!(sel && sel.id === row.id);
                  ctx.save();
                  ctx.strokeStyle = row.color + '55';
                  ctx.lineWidth = active ? 2.4 : 1.2;
                  ctx.beginPath();
                  ctx.moveTo(motorX + row.size + 8, y);
                  ctx.quadraticCurveTo(sulcusX, y - H * 0.035, sensoryX - row.size - 8, y);
                  ctx.stroke();
                  ctx.restore();
                  bodyBubble(motorX, y, row.size, row.color, active, 'move');
                  bodyBubble(sensoryX, y, row.size, row.color, active, 'feel');

                  ctx.save();
                  ctx.font = 'bold ' + Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';
                  var labelW = Math.max(W * 0.15, ctx.measureText(row.label).width + 28);
                  ctx.fillStyle = active ? '#0f172a' : 'rgba(255,255,255,0.90)';
                  ctx.strokeStyle = row.color + 'aa';
                  ctx.lineWidth = 1.2;
                  ctx.beginPath();
                  ctx.roundRect(sulcusX - labelW / 2, y - 16, labelW, 32, 10);
                  ctx.fill();
                  ctx.stroke();
                  ctx.fillStyle = active ? '#fff' : '#0f172a';
                  ctx.textAlign = 'center';
                  ctx.fillText(row.label, sulcusX, y - 2);
                  ctx.fillStyle = active ? '#cbd5e1' : '#64748b';
                  ctx.font = Math.round(7.5 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillText(row.note, sulcusX, y + 10);
                  ctx.restore();
                });

                function corticalTag(regionId, x, y, color, title, copy) {
                  var active = !!(sel && sel.id === regionId);
                  brainAtlasDrawAnnotationCard(x - W * 0.13, y - H * 0.045, W * 0.26, H * 0.09, title, copy, color, active);
                }
                corticalTag('motor_strip_hom', W * 0.22, H * 0.145, '#7c3aed', 'Motor strip', 'movement output');
                corticalTag('sensory_strip_hom', W * 0.78, H * 0.145, '#0ea5e9', 'Sensory strip', 'touch input');

                brainAtlasDrawInfoStrip(W * 0.13, H * 0.900, W * 0.74, H * 0.065, 'Clinical shortcut: medial cortex = leg/foot; lateral cortex = hand, face, lips, tongue.', '#a78bfa');

              } else if (currentView.isVisualPathway) {

                var vT = canvas._brainTick || 0;
                var vPulse = brainMotionReduced ? 0.45 : (0.45 + 0.35 * Math.sin(vT * 0.05));
                var leftColor = '#2563eb';
                var rightColor = '#ef4444';
                var relayColor = '#14b8a6';

                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, W, H);
                var vpGrad = ctx.createLinearGradient(0, 0, W, H);
                vpGrad.addColorStop(0, 'rgba(37,99,235,0.13)');
                vpGrad.addColorStop(0.48, 'rgba(255,255,255,0.94)');
                vpGrad.addColorStop(1, 'rgba(239,68,68,0.12)');
                ctx.fillStyle = vpGrad;
                ctx.fillRect(0, 0, W, H);

                brainAtlasDrawCanvasHeading('Visual pathway and field cuts', 'Nasal retinal fibers cross at the optic chiasm; each occipital cortex sees the opposite visual field.', { accent: '#2563eb' });

                function visualPath(points, color, width, phaseOffset) {
                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = width || 4;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.shadowColor = color + '66';
                  ctx.shadowBlur = 8;
                  ctx.beginPath();
                  ctx.moveTo(points[0][0], points[0][1]);
                  for (var pi = 1; pi < points.length; pi++) {
                    var p = points[pi];
                    if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
                    else ctx.lineTo(p[0], p[1]);
                  }
                  ctx.stroke();
                  if (!brainMotionReduced) {
                    var a = points[0], b = points[points.length - 1];
                    var f = ((vT * 0.005 + (phaseOffset || 0)) % 1);
                    var dx = a[0] + (b[p.length === 4 ? 2 : 0] - a[0]) * f;
                    var dy = a[1] + (b[p.length === 4 ? 3 : 1] - a[1]) * f;
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.restore();
                }

                function eye(cx, cy, label) {
                  ctx.save();
                  ctx.fillStyle = '#fff';
                  ctx.strokeStyle = '#94a3b8';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.ellipse(cx, cy, W * 0.045, H * 0.040, 0, 0, Math.PI * 2);
                  ctx.fill(); ctx.stroke();
                  ctx.fillStyle = '#dbeafe';
                  ctx.beginPath(); ctx.arc(cx, cy, W * 0.018, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#0f172a';
                  ctx.beginPath(); ctx.arc(cx, cy, W * 0.008, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = leftColor + 'aa';
                  ctx.lineWidth = 3;
                  ctx.beginPath(); ctx.arc(cx - W * 0.020, cy, W * 0.025, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke();
                  ctx.strokeStyle = rightColor + 'aa';
                  ctx.beginPath(); ctx.arc(cx + W * 0.020, cy, W * 0.025, -Math.PI * 0.35, Math.PI * 0.35); ctx.stroke();
                  ctx.fillStyle = '#475569';
                  ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText(label, cx, cy + H * 0.070);
                  ctx.restore();
                }

                function pathwayNode(regionId, label, x, y, color, sub) {
                  var active = !!(sel && sel.id === regionId);
                  ctx.save();
                  ctx.fillStyle = active ? color : 'rgba(255,255,255,0.94)';
                  ctx.strokeStyle = color;
                  ctx.lineWidth = active ? 3 : 1.4;
                  ctx.shadowColor = active ? color + '88' : 'rgba(15,23,42,0.08)';
                  ctx.shadowBlur = active ? 16 : 7;
                  ctx.beginPath();
                  ctx.roundRect(x - W * 0.060, y - H * 0.032, W * 0.120, H * 0.064, 10);
                  ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(x, y, W * 0.120, H * 0.064, label, sub, active ? '#ffffff' : color, active ? '#e2e8f0' : '#64748b');
                  ctx.restore();
                }

                var eyeLX = W * 0.14, topEyeY = H * 0.34, botEyeY = H * 0.54;
                var nerveX = W * 0.29, chiasmX = W * 0.42, midY = H * 0.44;
                var tractX = W * 0.55, lgnX = W * 0.66, occX = W * 0.88;
                var upperY = H * 0.32, lowerY = H * 0.56;

                eye(eyeLX, topEyeY, 'Left eye');
                eye(eyeLX, botEyeY, 'Right eye');

                visualPath([[eyeLX + W * 0.045, topEyeY], [nerveX, H * 0.38], [chiasmX, midY]], leftColor + 'cc', 4, 0.0);
                visualPath([[eyeLX + W * 0.045, botEyeY], [nerveX, H * 0.50], [chiasmX, midY]], rightColor + 'cc', 4, 0.25);
                visualPath([[chiasmX, midY], [tractX, upperY], [lgnX, upperY]], rightColor + 'cc', 4, 0.48);
                visualPath([[chiasmX, midY], [tractX, lowerY], [lgnX, lowerY]], leftColor + 'cc', 4, 0.62);
                visualPath([[lgnX, upperY], [W * 0.74, H * 0.30, occX, H * 0.37]], rightColor + 'bb', 3, 0.15);
                visualPath([[lgnX, upperY], [W * 0.75, H * 0.24, occX, H * 0.43]], rightColor + '99', 2.5, 0.35);
                visualPath([[lgnX, lowerY], [W * 0.74, H * 0.66, occX, H * 0.51]], leftColor + 'bb', 3, 0.55);
                visualPath([[lgnX, lowerY], [W * 0.75, H * 0.72, occX, H * 0.58]], leftColor + '99', 2.5, 0.78);

                ctx.save();
                ctx.fillStyle = 'rgba(15,23,42,0.86)';
                ctx.beginPath(); ctx.roundRect(chiasmX - W * 0.050, midY - H * 0.045, W * 0.100, H * 0.090, 12); ctx.fill();
                ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(chiasmX - W * 0.030, midY - H * 0.020); ctx.lineTo(chiasmX + W * 0.030, midY + H * 0.020);
                ctx.moveTo(chiasmX + W * 0.030, midY - H * 0.020); ctx.lineTo(chiasmX - W * 0.030, midY + H * 0.020);
                ctx.stroke();
                ctx.fillStyle = '#fde68a';
                ctx.font = 'bold ' + Math.round(7.5 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('crossing', chiasmX, midY + H * 0.060);
                ctx.restore();

                pathwayNode('retina_visual', 'Retina', W * 0.16, H * 0.50, '#64748b', 'inverted map');
                pathwayNode('optic_nerve_visual', 'Optic nerve', nerveX, H * 0.50, '#7c3aed', 'one eye');
                pathwayNode('optic_chiasm_visual_path', 'Chiasm', chiasmX, H * 0.575, '#f59e0b', 'nasal fibers cross');
                pathwayNode('optic_tract_visual', 'Optic tract', tractX, H * 0.50, '#0f766e', 'opposite field');
                pathwayNode('lgn_visual', 'LGN', lgnX, H * 0.50, relayColor, 'thalamus');
                pathwayNode('parietal_radiation_visual', 'Parietal', W * 0.75, H * 0.27, '#2563eb', 'floor cut');
                pathwayNode('meyer_loop_visual', 'Meyer loop', W * 0.75, H * 0.69, '#ef4444', 'sky cut');
                pathwayNode('v1_visual_path', 'V1', occX, H * 0.50, '#7c2d12', 'calcarine');

                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.90)';
                ctx.strokeStyle = 'rgba(148,163,184,0.55)';
                ctx.beginPath(); ctx.roundRect(W * 0.80, H * 0.30, W * 0.145, H * 0.34, 18); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fed7aa';
                ctx.beginPath(); ctx.ellipse(occX, H * 0.47, W * 0.035, H * 0.125, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = '#7c2d12';
                ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Occipital lobe', occX, H * 0.315);
                ctx.fillText('V1 / BA17', occX, H * 0.625);
                ctx.restore();

                function fieldIcon(cx, cy, r, mode) {
                  ctx.save();
                  ctx.fillStyle = '#f8fafc';
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                  ctx.save();
                  ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.clip();
                  ctx.fillStyle = 'rgba(239,68,68,0.22)';
                  ctx.fillRect(cx, cy - r, r, r * 2);
                  ctx.fillStyle = 'rgba(37,99,235,0.22)';
                  ctx.fillRect(cx - r, cy - r, r, r * 2);
                  ctx.fillStyle = 'rgba(15,23,42,0.72)';
                  if (mode === 'all') ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
                  if (mode === 'temporalLeft') ctx.fillRect(cx - r, cy - r, r, r * 2);
                  if (mode === 'temporalRight') ctx.fillRect(cx, cy - r, r, r * 2);
                  if (mode === 'rightHalf') ctx.fillRect(cx, cy - r, r, r * 2);
                  if (mode === 'upperRight') ctx.fillRect(cx, cy - r, r, r);
                  if (mode === 'lowerRight') ctx.fillRect(cx, cy, r, r);
                  if (mode === 'rightHalfMacula') {
                    ctx.fillRect(cx, cy - r, r, r * 2);
                    ctx.fillStyle = '#f8fafc';
                    ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.restore();
                  ctx.strokeStyle = '#94a3b8';
                  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
                  ctx.restore();
                }

                function fieldCard(x, y, title, leftMode, rightMode, color) {
                  ctx.save();
                  ctx.fillStyle = 'rgba(255,255,255,0.92)';
                  ctx.strokeStyle = color + '88';
                  ctx.lineWidth = 1.2;
                  ctx.beginPath(); ctx.roundRect(x, y, W * 0.145, H * 0.115, 10); ctx.fill(); ctx.stroke();
                  brainAtlasDrawBoundedNodeLabel(x + W * 0.0725, y + H * 0.024, W * 0.135, H * 0.040, title, '', color, '#64748b');
                  fieldIcon(x + W * 0.052, y + H * 0.070, Math.min(W, H) * 0.020, leftMode);
                  fieldIcon(x + W * 0.094, y + H * 0.070, Math.min(W, H) * 0.020, rightMode);
                  ctx.fillStyle = '#64748b';
                  ctx.font = Math.round(6.2 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillText('L eye', x + W * 0.052, y + H * 0.105);
                  ctx.fillText('R eye', x + W * 0.094, y + H * 0.105);
                  ctx.restore();
                }

                function decoderChip(x, y, w, title, body, color) {
                  brainAtlasDrawDecoderChip(x, y, w, H * 0.055, title, body, color);
                }

                ctx.save();
                var decoderX = W * 0.055;
                var decoderY = H * 0.112;
                var decoderW = W * 0.89;
                ctx.fillStyle = 'rgba(15,23,42,0.84)';
                ctx.beginPath(); ctx.roundRect(decoderX, decoderY, decoderW, H * 0.050, 10); ctx.fill();
                brainAtlasDrawDecoderBannerText(decoderX, decoderY, decoderW, H * 0.050, 'FIELD-CUT DECODER', 'pattern -> lesion level', '#60a5fa');
                ctx.restore();

                var chipY = H * 0.155;
                var chipW = W * 0.150;
                decoderChip(W * 0.095, chipY, chipW, 'Before chiasm', 'one eye', '#7c3aed');
                decoderChip(W * 0.270, chipY, chipW, 'Chiasm', 'bitemporal', '#f59e0b');
                decoderChip(W * 0.445, chipY, chipW, 'After chiasm', 'homonymous', '#0f766e');
                decoderChip(W * 0.620, chipY, chipW, 'Temporal loop', 'pie in sky', '#ef4444');
                decoderChip(W * 0.795, chipY, chipW, 'Parietal / V1', 'floor / macula', '#2563eb');

                fieldCard(W * 0.035, H * 0.765, 'Optic nerve', 'all', null, '#7c3aed');
                fieldCard(W * 0.195, H * 0.765, 'Chiasm', 'temporalLeft', 'temporalRight', '#f59e0b');
                fieldCard(W * 0.355, H * 0.765, 'Optic tract', 'rightHalf', 'rightHalf', '#0f766e');
                fieldCard(W * 0.515, H * 0.765, 'Meyer loop', 'upperRight', 'upperRight', '#ef4444');
                fieldCard(W * 0.675, H * 0.765, 'Parietal/V1', 'lowerRight', 'rightHalfMacula', '#2563eb');

              } else if (currentView.isLanguageNetwork) {

                var langT = canvas._brainTick || 0;
                var inputColor = '#2563eb';
                var meaningColor = '#14b8a6';
                var outputColor = '#7c3aed';
                var warningColor = '#ef4444';
                var tractColor = '#f59e0b';

                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, W, H);
                var langGrad = ctx.createLinearGradient(0, 0, W, H);
                langGrad.addColorStop(0, 'rgba(37,99,235,0.14)');
                langGrad.addColorStop(0.48, 'rgba(255,255,255,0.94)');
                langGrad.addColorStop(1, 'rgba(124,58,237,0.13)');
                ctx.fillStyle = langGrad;
                ctx.fillRect(0, 0, W, H);

                brainAtlasDrawCanvasHeading('Dominant-hemisphere language network', 'Trace reading and hearing into meaning, repetition, speech planning, and motor output.', { accent: '#7c3aed' });

                ctx.save();
                ctx.fillStyle = 'rgba(255,255,255,0.72)';
                ctx.strokeStyle = 'rgba(148,163,184,0.35)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(W * 0.13, H * 0.46);
                ctx.bezierCurveTo(W * 0.15, H * 0.22, W * 0.36, H * 0.14, W * 0.58, H * 0.16);
                ctx.bezierCurveTo(W * 0.84, H * 0.18, W * 0.91, H * 0.35, W * 0.86, H * 0.54);
                ctx.bezierCurveTo(W * 0.82, H * 0.72, W * 0.55, H * 0.76, W * 0.34, H * 0.70);
                ctx.bezierCurveTo(W * 0.18, H * 0.66, W * 0.11, H * 0.56, W * 0.13, H * 0.46);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = 'rgba(124,58,237,0.18)';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(W * 0.39, H * 0.18);
                ctx.bezierCurveTo(W * 0.31, H * 0.31, W * 0.34, H * 0.53, W * 0.46, H * 0.69);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(20,184,166,0.18)';
                ctx.beginPath();
                ctx.moveTo(W * 0.55, H * 0.17);
                ctx.bezierCurveTo(W * 0.48, H * 0.32, W * 0.51, H * 0.53, W * 0.63, H * 0.67);
                ctx.stroke();
                ctx.restore();

                var langNodes = {
                  visual_word_language: { x: W * 0.20, y: H * 0.30, w: W * 0.145, h: H * 0.070, color: inputColor, label: 'Visual word', sub: 'reading input' },
                  auditory_language: { x: W * 0.22, y: H * 0.62, w: W * 0.145, h: H * 0.070, color: inputColor, label: 'Auditory word', sub: 'speech sounds' },
                  semantic_language: { x: W * 0.40, y: H * 0.31, w: W * 0.150, h: H * 0.070, color: meaningColor, label: 'Semantic hub', sub: 'meaning' },
                  wernicke_language: { x: W * 0.39, y: H * 0.53, w: W * 0.150, h: H * 0.070, color: meaningColor, label: 'Wernicke', sub: 'comprehension' },
                  angular_language: { x: W * 0.55, y: H * 0.39, w: W * 0.145, h: H * 0.070, color: '#0ea5e9', label: 'Angular', sub: 'reading/writing' },
                  supramarginal_language: { x: W * 0.53, y: H * 0.58, w: W * 0.160, h: H * 0.070, color: '#0891b2', label: 'Supramarginal', sub: 'phonology' },
                  arcuate_language: { x: W * 0.57, y: H * 0.49, w: W * 0.145, h: H * 0.066, color: tractColor, label: 'Arcuate', sub: 'repetition tract' },
                  broca_language: { x: W * 0.72, y: H * 0.43, w: W * 0.135, h: H * 0.070, color: outputColor, label: 'Broca', sub: 'speech plan' },
                  motor_speech_language: { x: W * 0.85, y: H * 0.34, w: W * 0.135, h: H * 0.070, color: outputColor, label: 'Motor speech', sub: 'mouth output' }
                };

                function langPoint(id) {
                  var n = langNodes[id];
                  return [n.x, n.y];
                }

                function bezierPoint(p0, p1, p2, p3, f) {
                  var inv = 1 - f;
                  return [
                    inv * inv * inv * p0[0] + 3 * inv * inv * f * p1[0] + 3 * inv * f * f * p2[0] + f * f * f * p3[0],
                    inv * inv * inv * p0[1] + 3 * inv * inv * f * p1[1] + 3 * inv * f * f * p2[1] + f * f * f * p3[1]
                  ];
                }

                function langCurve(fromId, toId, c1x, c1y, c2x, c2y, color, phase, width) {
                  var a = langPoint(fromId);
                  var b = langPoint(toId);
                  var c1 = [W * c1x, H * c1y];
                  var c2 = [W * c2x, H * c2y];
                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = width || 3.5;
                  ctx.lineCap = 'round';
                  ctx.shadowColor = color + '55';
                  ctx.shadowBlur = 7;
                  ctx.beginPath();
                  ctx.moveTo(a[0], a[1]);
                  ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], b[0], b[1]);
                  ctx.stroke();
                  if (!brainMotionReduced) {
                    var f = ((langT * 0.006 + (phase || 0)) % 1);
                    var dot = bezierPoint(a, c1, c2, b, f);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(dot[0], dot[1], 5.5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(dot[0], dot[1], 3.1, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.restore();
                }

                function langNode(id) {
                  var n = langNodes[id];
                  var active = !!(sel && sel.id === id);
                  ctx.save();
                  ctx.fillStyle = active ? n.color : 'rgba(255,255,255,0.94)';
                  ctx.strokeStyle = n.color;
                  ctx.lineWidth = active ? 3 : 1.4;
                  ctx.shadowColor = active ? n.color + '88' : 'rgba(15,23,42,0.10)';
                  ctx.shadowBlur = active ? 16 : 8;
                  ctx.beginPath();
                  ctx.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 11);
                  ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(n.x, n.y, n.w, n.h, n.label, n.sub, active ? '#ffffff' : n.color, active ? '#e2e8f0' : '#64748b');
                  ctx.restore();
                }

                langCurve('visual_word_language', 'angular_language', 0.28, 0.23, 0.43, 0.33, inputColor + 'cc', 0.02, 3.5);
                langCurve('auditory_language', 'wernicke_language', 0.27, 0.64, 0.34, 0.55, inputColor + 'cc', 0.18, 3.5);
                langCurve('angular_language', 'semantic_language', 0.52, 0.30, 0.45, 0.28, meaningColor + 'cc', 0.31, 3);
                langCurve('wernicke_language', 'semantic_language', 0.34, 0.44, 0.35, 0.38, meaningColor + 'cc', 0.42, 3);
                langCurve('wernicke_language', 'supramarginal_language', 0.43, 0.61, 0.49, 0.62, meaningColor + 'cc', 0.50, 3);
                langCurve('supramarginal_language', 'arcuate_language', 0.56, 0.59, 0.58, 0.54, tractColor + 'cc', 0.60, 3.2);
                langCurve('arcuate_language', 'broca_language', 0.63, 0.45, 0.67, 0.41, tractColor + 'dd', 0.70, 4.1);
                langCurve('semantic_language', 'broca_language', 0.49, 0.22, 0.66, 0.29, outputColor + 'bb', 0.80, 3.2);
                langCurve('broca_language', 'motor_speech_language', 0.77, 0.35, 0.81, 0.32, outputColor + 'dd', 0.90, 4);

                ['visual_word_language', 'auditory_language', 'semantic_language', 'wernicke_language', 'angular_language', 'supramarginal_language', 'arcuate_language', 'broca_language', 'motor_speech_language'].forEach(langNode);

                function langClueCard(regionId, x, y, w, title, line1, line2, color) {
                  var active = !!(sel && sel.id === regionId);
                  brainAtlasDrawAnnotationCard(x, y, w, H * 0.112, title, [line1, line2], color, active);
                }

                brainAtlasDrawInfoStrip(W * 0.08, H * 0.710, W * 0.84, H * 0.055, 'APHASIA CLUES: test fluency, comprehension, repetition, naming, reading, and writing together.', warningColor);

                langClueCard('aphasia_cards_language', W * 0.08, H * 0.785, W * 0.255, 'BROCA: nonfluent output', 'Comprehension often stronger', 'Repetition usually impaired', outputColor);
                langClueCard('aphasia_cards_language', W * 0.372, H * 0.785, W * 0.275, 'WERNICKE: fluent but poor comprehension', 'Speech can sound effortless', 'Meaning breaks down', meaningColor);
                langClueCard('arcuate_language', W * 0.685, H * 0.785, W * 0.235, 'CONDUCTION: repetition breaks', 'Fluent + understands', 'Arcuate pathway clue', tractColor);

              } else if (currentView.isBasalGanglia) {

                var bgT = canvas._brainTick || 0;
                var bgPulse = brainMotionReduced ? 0.55 : (0.55 + 0.35 * Math.sin(bgT * 0.05));
                var goColor = '#22c55e';
                var stopColor = '#ef4444';
                var exciteColor = '#2563eb';
                var dopamineColor = '#f59e0b';
                var inhibitColor = '#dc2626';

                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, W, H);
                var bgGrad = ctx.createRadialGradient(W * 0.50, H * 0.42, W * 0.05, W * 0.50, H * 0.42, W * 0.70);
                bgGrad.addColorStop(0, 'rgba(20,184,166,0.16)');
                bgGrad.addColorStop(0.45, 'rgba(255,255,255,0.94)');
                bgGrad.addColorStop(1, 'rgba(15,23,42,0.06)');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);

                brainAtlasDrawCanvasHeading('Basal ganglia movement-selection loop', 'Direct pathway releases a selected movement; indirect pathway suppresses competing movement.', { accent: '#0f766e' });

                var bgNodes = {
                  cortex_bg: { x: W * 0.50, y: H * 0.235, w: W * 0.18, h: H * 0.075, color: '#2563eb', label: 'Motor cortex', sub: 'action plans' },
                  striatum_d1_bg: { x: W * 0.30, y: H * 0.38, w: W * 0.20, h: H * 0.075, color: goColor, label: 'Striatum D1', sub: 'direct GO' },
                  striatum_d2_bg: { x: W * 0.30, y: H * 0.62, w: W * 0.20, h: H * 0.075, color: stopColor, label: 'Striatum D2', sub: 'indirect NO-GO' },
                  gpe_bg: { x: W * 0.50, y: H * 0.69, w: W * 0.15, h: H * 0.070, color: '#f97316', label: 'GPe', sub: 'relay' },
                  stn_bg: { x: W * 0.66, y: H * 0.67, w: W * 0.15, h: H * 0.070, color: '#a855f7', label: 'STN', sub: 'excites brake' },
                  gpi_snr_bg: { x: W * 0.71, y: H * 0.42, w: W * 0.17, h: H * 0.075, color: '#0f766e', label: 'GPi / SNr', sub: 'output brake' },
                  thalamus_bg: { x: W * 0.73, y: H * 0.245, w: W * 0.16, h: H * 0.070, color: '#14b8a6', label: 'Thalamus', sub: 'VA/VL relay' },
                  snc_dopamine_bg: { x: W * 0.17, y: H * 0.78, w: W * 0.18, h: H * 0.075, color: dopamineColor, label: 'SNc dopamine', sub: 'D1 up, D2 down' }
                };

                function nodeBox(id) {
                  var n = bgNodes[id];
                  var active = !!(sel && sel.id === id);
                  ctx.save();
                  ctx.fillStyle = active ? n.color : 'rgba(255,255,255,0.94)';
                  ctx.strokeStyle = n.color;
                  ctx.lineWidth = active ? 3 : 1.4;
                  ctx.shadowColor = active ? n.color + '88' : 'rgba(15,23,42,0.10)';
                  ctx.shadowBlur = active ? 16 : 8;
                  ctx.beginPath();
                  ctx.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 12);
                  ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(n.x, n.y, n.w, n.h, n.label, n.sub, active ? '#ffffff' : n.color, active ? '#e2e8f0' : '#64748b');
                  ctx.restore();
                }

                function edgePoint(id, side) {
                  var n = bgNodes[id];
                  if (side === 'top') return { x: n.x, y: n.y - n.h / 2 };
                  if (side === 'bottom') return { x: n.x, y: n.y + n.h / 2 };
                  if (side === 'left') return { x: n.x - n.w / 2, y: n.y };
                  return { x: n.x + n.w / 2, y: n.y };
                }

                function drawConnection(fromId, fromSide, toId, toSide, color, label, inhibitory, offset) {
                  var a = edgePoint(fromId, fromSide);
                  var b = edgePoint(toId, toSide);
                  var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                  var dx = b.x - a.x, dy = b.y - a.y;
                  var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                  var nx = -dy / len, ny = dx / len;
                  var bow = (offset || 0) * Math.min(W, H);
                  var cx = mx + nx * bow, cy = my + ny * bow;

                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = inhibitory ? 3.2 : 3.6;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.shadowColor = color + '44';
                  ctx.shadowBlur = 7;
                  ctx.beginPath();
                  ctx.moveTo(a.x, a.y);
                  ctx.quadraticCurveTo(cx, cy, b.x, b.y);
                  ctx.stroke();
                  ctx.shadowBlur = 0;

                  var endAngle = Math.atan2(b.y - cy, b.x - cx);
                  if (inhibitory) {
                    var tx = b.x - Math.cos(endAngle) * 7;
                    var ty = b.y - Math.sin(endAngle) * 7;
                    ctx.save();
                    ctx.translate(tx, ty);
                    ctx.rotate(endAngle + Math.PI / 2);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
                    ctx.restore();
                  } else {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(b.x - Math.cos(endAngle - 0.45) * 12, b.y - Math.sin(endAngle - 0.45) * 12);
                    ctx.lineTo(b.x - Math.cos(endAngle + 0.45) * 12, b.y - Math.sin(endAngle + 0.45) * 12);
                    ctx.closePath();
                    ctx.fill();
                  }

                  if (!brainMotionReduced) {
                    var f = (bgT * 0.006 + (offset || 0) * 2.7 + 1) % 1;
                    var qx = (1 - f) * (1 - f) * a.x + 2 * (1 - f) * f * cx + f * f * b.x;
                    var qy = (1 - f) * (1 - f) * a.y + 2 * (1 - f) * f * cy + f * f * b.y;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(qx, qy, 5 + bgPulse * 1.5, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(qx, qy, 3, 0, Math.PI * 2); ctx.fill();
                  }

                  if (label) brainAtlasDrawPathLabel(cx, cy - 5, label, color, W * 0.15);
                  ctx.restore();
                }

                drawConnection('cortex_bg', 'left', 'striatum_d1_bg', 'top', exciteColor, 'glutamate +', false, -0.05);
                drawConnection('cortex_bg', 'bottom', 'striatum_d2_bg', 'top', exciteColor, 'glutamate +', false, 0.05);
                drawConnection('striatum_d1_bg', 'right', 'gpi_snr_bg', 'left', inhibitColor, 'GABA -', true, -0.02);
                drawConnection('gpi_snr_bg', 'top', 'thalamus_bg', 'bottom', inhibitColor, 'brake -', true, -0.02);
                drawConnection('thalamus_bg', 'left', 'cortex_bg', 'right', goColor, 'movement +', false, -0.10);
                drawConnection('striatum_d2_bg', 'right', 'gpe_bg', 'left', inhibitColor, 'GABA -', true, 0.00);
                drawConnection('gpe_bg', 'right', 'stn_bg', 'left', inhibitColor, 'GABA -', true, 0.02);
                drawConnection('stn_bg', 'top', 'gpi_snr_bg', 'bottom', exciteColor, 'glutamate +', false, -0.02);
                drawConnection('snc_dopamine_bg', 'top', 'striatum_d1_bg', 'left', dopamineColor, 'D1 +', false, -0.05);
                drawConnection('snc_dopamine_bg', 'right', 'striatum_d2_bg', 'left', dopamineColor, 'D2 -', true, 0.04);

                Object.keys(bgNodes).forEach(nodeBox);

                function pathBadge(regionId, x, y, color, title, lines) {
                  var active = !!(sel && sel.id === regionId);
                  brainAtlasDrawAnnotationCard(x - W * 0.17, y - H * 0.050, W * 0.34, H * 0.10, title, lines, color, active);
                }
                pathBadge('direct_path_bg', W * 0.28, H * 0.90, goColor, 'DIRECT PATHWAY: GO', ['D1 inhibits the brake', 'thalamus can excite cortex']);
                pathBadge('indirect_path_bg', W * 0.72, H * 0.90, stopColor, 'INDIRECT PATHWAY: NO-GO', ['D2 lets STN strengthen brake', 'competing actions are suppressed']);

                function bgDisorderChip(x, y, w, title, sub, color) {
                  brainAtlasDrawDecoderChip(x, y, w, H * 0.040, title, sub, color);
                }

                ctx.save();
                var disorderActive = !!(sel && sel.id === 'movement_disorder_decoder_bg');
                var disorderX = W * 0.07;
                var disorderY = H * 0.108;
                var disorderW = W * 0.86;
                var disorderH = H * 0.087;
                ctx.fillStyle = disorderActive ? 'rgba(245,158,11,0.18)' : 'rgba(15,23,42,0.88)';
                ctx.strokeStyle = disorderActive ? dopamineColor : 'rgba(15,23,42,0.24)';
                ctx.lineWidth = disorderActive ? 2.4 : 1;
                ctx.shadowColor = disorderActive ? 'rgba(245,158,11,0.24)' : 'rgba(15,23,42,0.12)';
                ctx.shadowBlur = disorderActive ? 16 : 8;
                ctx.beginPath(); ctx.roundRect(disorderX, disorderY, disorderW, disorderH, 12); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 0;
                brainAtlasDrawDecoderBannerText(disorderX, disorderY, disorderW, disorderH, 'MOVEMENT DISORDER DECODER', 'movement pattern -> loop imbalance', dopamineColor);
                ctx.restore();

                var disorderChipY = H * 0.148;
                var disorderChipW = W * 0.185;
                bgDisorderChip(W * 0.095, disorderChipY, disorderChipW, 'Parkinson', 'DA loss -> too much brake', dopamineColor);
                bgDisorderChip(W * 0.310, disorderChipY, disorderChipW, 'Huntington', 'NO-GO loss -> chorea', stopColor);
                bgDisorderChip(W * 0.525, disorderChipY, disorderChipW, 'STN lesion', 'weak brake -> ballismus', '#a855f7');
                bgDisorderChip(W * 0.740, disorderChipY, disorderChipW, 'Dyskinesia', 'too much GO timing', goColor);

              } else if (currentView.isLimbicPapez) {

                var limbicT = canvas._brainTick || 0;
                var memoryColor = '#f59e0b';
                var emotionColor = '#ef4444';
                var regulateColor = '#2563eb';
                var returnColor = '#14b8a6';
                var limbicPulse = brainMotionReduced ? 0.45 : (0.45 + 0.35 * Math.sin(limbicT * 0.05));

                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(0, 0, W, H);
                var limbicBg = ctx.createRadialGradient(W * 0.50, H * 0.48, W * 0.05, W * 0.50, H * 0.48, W * 0.70);
                limbicBg.addColorStop(0, 'rgba(245,158,11,0.14)');
                limbicBg.addColorStop(0.45, 'rgba(255,255,255,0.96)');
                limbicBg.addColorStop(1, 'rgba(239,68,68,0.10)');
                ctx.fillStyle = limbicBg;
                ctx.fillRect(0, 0, W, H);

                brainAtlasDrawCanvasHeading('Limbic / Papez memory-emotion loop', 'Amber traces the memory loop; red traces amygdala-to-body emotion output.', { accent: '#d97706' });

                var limbicNodes = {
                  hippocampus_limbic: { x: W * 0.21, y: H * 0.58, w: W * 0.16, h: H * 0.070, color: '#7c3aed', label: 'Hippocampus', sub: 'new memory' },
                  fornix_limbic: { x: W * 0.36, y: H * 0.47, w: W * 0.13, h: H * 0.062, color: '#a855f7', label: 'Fornix', sub: 'output tract' },
                  mammillary_limbic: { x: W * 0.50, y: H * 0.68, w: W * 0.16, h: H * 0.064, color: '#d97706', label: 'Mammillary', sub: 'memory relay' },
                  mammillothalamic_limbic: { x: W * 0.63, y: H * 0.55, w: W * 0.17, h: H * 0.064, color: '#f97316', label: 'Mammillothal.', sub: 'tract' },
                  anterior_thalamus_limbic: { x: W * 0.74, y: H * 0.38, w: W * 0.17, h: H * 0.064, color: '#0f766e', label: 'Anterior thal.', sub: 'context relay' },
                  cingulate_limbic: { x: W * 0.50, y: H * 0.245, w: W * 0.17, h: H * 0.064, color: '#14b8a6', label: 'Cingulate', sub: 'motivation' },
                  cingulum_limbic: { x: W * 0.35, y: H * 0.315, w: W * 0.16, h: H * 0.062, color: '#0891b2', label: 'Cingulum', sub: 'return path' },
                  entorhinal_limbic: { x: W * 0.22, y: H * 0.36, w: W * 0.17, h: H * 0.064, color: '#0ea5e9', label: 'Entorhinal', sub: 'gateway' },
                  amygdala_limbic: { x: W * 0.25, y: H * 0.74, w: W * 0.16, h: H * 0.066, color: emotionColor, label: 'Amygdala', sub: 'salience' },
                  hypothalamus_limbic: { x: W * 0.50, y: H * 0.82, w: W * 0.17, h: H * 0.066, color: '#be123c', label: 'Hypothalamus', sub: 'body state' },
                  prefrontal_limbic: { x: W * 0.79, y: H * 0.255, w: W * 0.15, h: H * 0.064, color: regulateColor, label: 'mPFC', sub: 'regulates' }
                };

                function limbicActive(id) { return !!(sel && sel.id === id); }
                function limbicPoint(id, side) {
                  var n = limbicNodes[id];
                  if (side === 'top') return { x: n.x, y: n.y - n.h / 2 };
                  if (side === 'bottom') return { x: n.x, y: n.y + n.h / 2 };
                  if (side === 'left') return { x: n.x - n.w / 2, y: n.y };
                  if (side === 'right') return { x: n.x + n.w / 2, y: n.y };
                  return { x: n.x, y: n.y };
                }

                function limbicEdge(fromId, fromSide, toId, toSide, color, label, offset, dash, inhibitory) {
                  var a = limbicPoint(fromId, fromSide);
                  var b = limbicPoint(toId, toSide);
                  var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                  var dx = b.x - a.x, dy = b.y - a.y;
                  var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                  var nx = -dy / len, ny = dx / len;
                  var bow = (offset || 0) * Math.min(W, H);
                  var cx = mx + nx * bow, cy = my + ny * bow;
                  ctx.save();
                  ctx.strokeStyle = color;
                  ctx.lineWidth = dash ? 2.3 : 3.4;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  if (dash) ctx.setLineDash([8, 6]);
                  ctx.shadowColor = color + '44';
                  ctx.shadowBlur = 7;
                  ctx.beginPath();
                  ctx.moveTo(a.x, a.y);
                  ctx.quadraticCurveTo(cx, cy, b.x, b.y);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.shadowBlur = 0;
                  var angle = Math.atan2(b.y - cy, b.x - cx);
                  if (inhibitory) {
                    var tx = b.x - Math.cos(angle) * 8;
                    var ty = b.y - Math.sin(angle) * 8;
                    ctx.save();
                    ctx.translate(tx, ty);
                    ctx.rotate(angle + Math.PI / 2);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
                    ctx.restore();
                  } else {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y);
                    ctx.lineTo(b.x - Math.cos(angle - 0.45) * 11, b.y - Math.sin(angle - 0.45) * 11);
                    ctx.lineTo(b.x - Math.cos(angle + 0.45) * 11, b.y - Math.sin(angle + 0.45) * 11);
                    ctx.closePath();
                    ctx.fill();
                  }
                  if (!brainMotionReduced) {
                    var f = (limbicT * 0.006 + (offset || 0) * 2.5 + 1) % 1;
                    var qx = (1 - f) * (1 - f) * a.x + 2 * (1 - f) * f * cx + f * f * b.x;
                    var qy = (1 - f) * (1 - f) * a.y + 2 * (1 - f) * f * cy + f * f * b.y;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(qx, qy, 4.8 + limbicPulse, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.arc(qx, qy, 2.8, 0, Math.PI * 2); ctx.fill();
                  }
                  if (label) brainAtlasDrawPathLabel(cx, cy - 6, label, color, W * 0.18);
                  ctx.restore();
                }

                function limbicBox(id) {
                  var n = limbicNodes[id];
                  var active = limbicActive(id);
                  ctx.save();
                  ctx.fillStyle = active ? n.color : 'rgba(255,255,255,0.94)';
                  ctx.strokeStyle = n.color;
                  ctx.lineWidth = active ? 3 : 1.35;
                  ctx.shadowColor = active ? n.color + '88' : 'rgba(15,23,42,0.08)';
                  ctx.shadowBlur = active ? 16 : 7;
                  ctx.beginPath();
                  ctx.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 12);
                  ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  brainAtlasDrawBoundedNodeLabel(n.x, n.y, n.w, n.h, n.label, n.sub, active ? '#ffffff' : n.color, active ? '#e2e8f0' : '#64748b');
                  ctx.restore();
                }

                limbicEdge('hippocampus_limbic', 'right', 'fornix_limbic', 'left', memoryColor, 'fornix', -0.03, false, false);
                limbicEdge('fornix_limbic', 'bottom', 'mammillary_limbic', 'left', memoryColor, '', -0.05, false, false);
                limbicEdge('mammillary_limbic', 'right', 'mammillothalamic_limbic', 'bottom', memoryColor, '', -0.04, false, false);
                limbicEdge('mammillothalamic_limbic', 'top', 'anterior_thalamus_limbic', 'bottom', memoryColor, 'MTT', -0.03, false, false);
                limbicEdge('anterior_thalamus_limbic', 'left', 'cingulate_limbic', 'right', memoryColor, '', 0.07, false, false);
                limbicEdge('cingulate_limbic', 'left', 'cingulum_limbic', 'top', returnColor, 'cingulum', 0.02, false, false);
                limbicEdge('cingulum_limbic', 'left', 'entorhinal_limbic', 'top', returnColor, '', -0.02, false, false);
                limbicEdge('entorhinal_limbic', 'bottom', 'hippocampus_limbic', 'top', returnColor, 'back to hippocampus', -0.04, false, false);

                limbicEdge('amygdala_limbic', 'right', 'hypothalamus_limbic', 'left', emotionColor, 'body response', 0.00, false, false);
                limbicEdge('amygdala_limbic', 'top', 'hippocampus_limbic', 'bottom', emotionColor, 'emotional tag', -0.04, true, false);
                limbicEdge('prefrontal_limbic', 'bottom', 'amygdala_limbic', 'right', regulateColor, 'regulates', -0.12, true, true);
                limbicEdge('cingulate_limbic', 'right', 'prefrontal_limbic', 'left', regulateColor, 'control', 0.03, true, false);

                Object.keys(limbicNodes).forEach(limbicBox);

                function limbicBadge(regionId, x, y, color, title, lines) {
                  var active = limbicActive(regionId);
                  brainAtlasDrawAnnotationCard(x - W * 0.18, y - H * 0.049, W * 0.36, H * 0.098, title, lines, color, active);
                }
                limbicBadge('papez_path_limbic', W * 0.29, H * 0.925, memoryColor, 'PAPEZ MEMORY LOOP', ['hippocampus -> thalamus -> cingulate', 'returns through entorhinal cortex']);
                limbicBadge('emotion_output_limbic', W * 0.71, H * 0.925, emotionColor, 'AMYGDALA OUTPUT', ['tags memory with emotion', 'drives hypothalamic body response']);

                function limbicDecoderChip(x, y, w, title, sub, color) {
                  brainAtlasDrawDecoderChip(x, y, w, H * 0.040, title, sub, color);
                }

                ctx.save();
                var limbicDecoderActive = !!(sel && sel.id === 'memory_emotion_decoder_limbic');
                var limbicDecoderX = W * 0.06;
                var limbicDecoderY = H * 0.108;
                var limbicDecoderW = W * 0.88;
                var limbicDecoderH = H * 0.087;
                ctx.fillStyle = limbicDecoderActive ? 'rgba(217,119,6,0.18)' : 'rgba(15,23,42,0.88)';
                ctx.strokeStyle = limbicDecoderActive ? memoryColor : 'rgba(15,23,42,0.24)';
                ctx.lineWidth = limbicDecoderActive ? 2.4 : 1;
                ctx.shadowColor = limbicDecoderActive ? 'rgba(217,119,6,0.24)' : 'rgba(15,23,42,0.12)';
                ctx.shadowBlur = limbicDecoderActive ? 16 : 8;
                ctx.beginPath(); ctx.roundRect(limbicDecoderX, limbicDecoderY, limbicDecoderW, limbicDecoderH, 12); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 0;
                brainAtlasDrawDecoderBannerText(limbicDecoderX, limbicDecoderY, limbicDecoderW, limbicDecoderH, 'MEMORY-EMOTION DECODER', 'symptom pattern -> weak circuit', memoryColor);
                ctx.restore();

                var limbicChipY = H * 0.148;
                var limbicChipW = W * 0.195;
                limbicDecoderChip(W * 0.082, limbicChipY, limbicChipW, 'New amnesia', 'hippocampus / fornix', memoryColor);
                limbicDecoderChip(W * 0.302, limbicChipY, limbicChipW, 'Confabulation', 'mammillary / thalamus', '#d97706');
                limbicDecoderChip(W * 0.522, limbicChipY, limbicChipW, 'Fear tagging', 'amygdala -> body', emotionColor);
                limbicDecoderChip(W * 0.742, limbicChipY, limbicChipW, 'Poor regulation', 'mPFC brake weak', regulateColor);

              } else if (currentView.isNeuron) {

                // ── Action Potential Neuron Animation ──

                var nT = canvas._brainTick;

                var nSpeed = 1;

                var phase = (nT * 0.008 * nSpeed) % 6;

                var phaseNames = ['Resting (-70mV)', 'Stimulus Arrives', 'Depolarization \u2191', 'Overshoot (+30mV)', 'Repolarization \u2193', 'Hyperpolarization'];

                canvas._neuronPhase = phaseNames[Math.floor(phase)];

                var naColor = '#3b82f6';

                var kColor = '#22c55e';

                function spikeCycleDecoder() {
                  var active = !!(sel && sel.id === 'spike_cycle_decoder_neuron');
                  var boxX = W * 0.075, boxY = H * 0.075, boxW = W * 0.68, boxH = Math.max(74, H * 0.118);
                  ctx.save();
                  ctx.fillStyle = active ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.92)';
                  ctx.strokeStyle = active ? '#f59e0b' : 'rgba(203,213,225,0.9)';
                  ctx.lineWidth = active ? 2.2 : 1;
                  ctx.shadowColor = active ? 'rgba(245,158,11,0.25)' : 'rgba(15,23,42,0.08)';
                  ctx.shadowBlur = active ? 14 : 7;
                  ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 12); ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  var decoderHeaderH = Math.max(30, Math.min(36, boxH * 0.44));
                  ctx.fillStyle = 'rgba(15,23,42,0.90)';
                  ctx.beginPath(); ctx.roundRect(boxX + 5, boxY + 5, boxW - 10, decoderHeaderH, 8); ctx.fill();
                  brainAtlasDrawDecoderBannerText(boxX + 5, boxY + 5, boxW - 10, decoderHeaderH, 'SPIKE CYCLE DECODER', 'threshold -> Na+ in -> K+ out -> refractory recovery', '#f59e0b');

                  var chips = [
                    { label: 'Rest -70', sub: 'polarized', color: '#64748b' },
                    { label: 'Threshold -55', sub: 'all-or-none', color: '#ef4444' },
                    { label: 'Na+ in', sub: 'depolarize', color: naColor },
                    { label: 'K+ out', sub: 'repolarize', color: kColor },
                    { label: 'Refractory', sub: 'reset', color: '#f59e0b' }
                  ];
                  var chipPadding = Math.max(8, boxW * 0.025);
                  var chipGap = Math.max(3, boxW * 0.012);
                  var chipW = (boxW - chipPadding * 2 - chipGap * 4) / 5;
                  for (var ci = 0; ci < chips.length; ci++) {
                    var ch = chips[ci];
                    var isPhase = Math.floor(phase) === ci || (ci === 4 && phase >= 5);
                    var cx = boxX + chipPadding + ci * (chipW + chipGap);
                    var cy = boxY + decoderHeaderH + 8;
                    var chipH = Math.max(28, boxH - decoderHeaderH - 12);
                    brainAtlasDrawDecoderChip(cx, cy, chipW, chipH, ch.label, ch.sub, ch.color, isPhase);
                  }
                  ctx.restore();
                }

                spikeCycleDecoder();



                // Dendrites — recursive branching tree with dendritic spines

                ctx.save();
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';

                // Seeded pseudo-random for consistent shape across frames
                var _dendSeed = 42;
                function dendRand() { _dendSeed = (_dendSeed * 16807 + 0) % 2147483647; return (_dendSeed & 0x7fffffff) / 2147483647; }

                // Draw a single dendritic branch with sub-branches
                function drawDendBranch(x1, y1, x2, y2, depth, maxDepth, branchSeed) {
                  _dendSeed = branchSeed;
                  var lw = 3.0 - depth * 0.8;
                  if (lw < 0.5) lw = 0.5;
                  var alpha = 1.0 - depth * 0.2;
                  if (alpha < 0.3) alpha = 0.3;

                  // Main branch curve
                  var mx = (x1 + x2) / 2 + (dendRand() - 0.5) * W * 0.025;
                  var my = (y1 + y2) / 2 + (dendRand() - 0.5) * H * 0.025;
                  ctx.globalAlpha = alpha;
                  ctx.strokeStyle = depth === 0 ? '#8b5cf6' : depth === 1 ? '#a78bfa' : '#c4b5fd';
                  ctx.lineWidth = lw;
                  ctx.beginPath(); ctx.moveTo(x1, y1);
                  ctx.quadraticCurveTo(mx, my, x2, y2);
                  ctx.stroke();

                  // Dendritic spines (tiny bumps along the branch)
                  if (depth >= 1) {
                    var spineCount = depth === 1 ? 3 : 5;
                    ctx.fillStyle = '#ddd6fe';
                    for (var sp = 0; sp < spineCount; sp++) {
                      var st = 0.2 + (sp / spineCount) * 0.6;
                      var sx = x1 + (x2 - x1) * st + (dendRand() - 0.5) * 3;
                      var sy = y1 + (y2 - y1) * st + (dendRand() - 0.5) * 3;
                      var sDir = dendRand() * Math.PI * 2;
                      var sLen = 2 + dendRand() * 3;
                      // Spine stalk
                      ctx.beginPath();
                      ctx.moveTo(sx, sy);
                      ctx.lineTo(sx + Math.cos(sDir) * sLen, sy + Math.sin(sDir) * sLen);
                      ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 0.5; ctx.stroke();
                      // Spine head
                      ctx.beginPath();
                      ctx.arc(sx + Math.cos(sDir) * sLen, sy + Math.sin(sDir) * sLen, 1.2, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  }

                  // Sub-branches
                  if (depth < maxDepth) {
                    var nBranch = depth === 0 ? 3 : 2;
                    for (var bi = 0; bi < nBranch; bi++) {
                      var t = 0.4 + bi * 0.25;
                      var bx = x1 + (x2 - x1) * t;
                      var by = y1 + (y2 - y1) * t;
                      var baseAngle = Math.atan2(y2 - y1, x2 - x1);
                      var spread = (bi % 2 === 0 ? 1 : -1) * (0.5 + dendRand() * 0.6);
                      var bAngle = baseAngle + spread;
                      var bLen = W * (0.04 - depth * 0.012);
                      if (bLen < W * 0.015) bLen = W * 0.015;
                      var bx2 = bx + Math.cos(bAngle) * bLen;
                      var by2 = by + Math.sin(bAngle) * bLen;
                      drawDendBranch(bx, by, bx2, by2, depth + 1, maxDepth, branchSeed + bi * 137 + depth * 31);
                    }
                  }
                }

                // 5 primary dendrite branches emanating from soma in a fan
                var somaX = W * 0.20, somaY = H * 0.45, somaR = W * 0.06;
                var primaryAngles = [-2.4, -1.8, -1.2, -0.6, -3.0];
                for (var pi3 = 0; pi3 < primaryAngles.length; pi3++) {
                  var pa = primaryAngles[pi3];
                  var startX = somaX + Math.cos(pa) * somaR;
                  var startY = somaY + Math.sin(pa) * somaR;
                  var endX = startX + Math.cos(pa) * W * 0.10;
                  var endY = startY + Math.sin(pa) * H * 0.10;
                  drawDendBranch(startX, startY, endX, endY, 0, 2, 100 + pi3 * 251);
                }

                // Signal pulse traveling along primary branches during stimulus phase
                if (phase > 0.5 && phase < 2) {
                  var pulseT = (phase - 0.5) / 1.5;
                  ctx.globalAlpha = 0.9;
                  for (var pi4 = 0; pi4 < primaryAngles.length; pi4++) {
                    var pa2 = primaryAngles[pi4];
                    var sx2 = somaX + Math.cos(pa2) * somaR;
                    var sy2 = somaY + Math.sin(pa2) * somaR;
                    var ex2 = sx2 + Math.cos(pa2) * W * 0.10;
                    var ey2 = sy2 + Math.sin(pa2) * H * 0.10;
                    // Pulse travels FROM tip TO soma
                    var ppx2 = ex2 + (sx2 - ex2) * pulseT;
                    var ppy2 = ey2 + (sy2 - ey2) * pulseT;
                    // Glow
                    var pGlow = ctx.createRadialGradient(ppx2, ppy2, 1, ppx2, ppy2, 6);
                    pGlow.addColorStop(0, 'rgba(251,191,36,0.8)');
                    pGlow.addColorStop(1, 'rgba(251,191,36,0)');
                    ctx.beginPath(); ctx.arc(ppx2, ppy2, 6, 0, Math.PI * 2);
                    ctx.fillStyle = pGlow; ctx.fill();
                    // Core
                    ctx.beginPath(); ctx.arc(ppx2, ppy2, 3 + Math.sin(nT * 0.1 + pi4) * 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#fbbf24'; ctx.fill();
                  }
                }

                ctx.globalAlpha = 1;
                ctx.restore();



                // Soma

                ctx.save();

                var somaGlow = phase > 1.5 && phase < 3 ? 0.3 : 0;

                if (somaGlow > 0) {

                  var sgr = ctx.createRadialGradient(W*0.20,H*0.45,W*0.02,W*0.20,H*0.45,W*0.10);

                  sgr.addColorStop(0,'rgba(251,191,36,'+somaGlow+')'); sgr.addColorStop(1,'rgba(251,191,36,0)');

                  ctx.beginPath(); ctx.arc(W*0.20,H*0.45,W*0.10,0,Math.PI*2); ctx.fillStyle=sgr; ctx.fill();

                }

                ctx.beginPath(); ctx.arc(W*0.20,H*0.45,W*0.06,0,Math.PI*2);

                var smGr=ctx.createRadialGradient(W*0.19,H*0.43,W*0.01,W*0.20,H*0.45,W*0.06);

                smGr.addColorStop(0,'#ede9fe'); smGr.addColorStop(1,'#c4b5fd');

                ctx.fillStyle=smGr; ctx.fill(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=2; ctx.stroke();

                ctx.beginPath(); ctx.arc(W*0.20,H*0.45,W*0.025,0,Math.PI*2);

                ctx.fillStyle='#a78bfa'; ctx.fill(); ctx.strokeStyle='#6d28d9'; ctx.lineWidth=1; ctx.stroke();

                brainAtlasDrawPathLabel(W*0.20,H*0.58,'Soma','#6d28d9',W*0.12);


                ctx.restore();



                // Axon hillock

                ctx.save();

                ctx.beginPath(); ctx.moveTo(W*0.26,H*0.42); ctx.lineTo(W*0.32,H*0.44);

                ctx.lineTo(W*0.32,H*0.46); ctx.lineTo(W*0.26,H*0.48); ctx.closePath();

                ctx.fillStyle = (phase>2&&phase<4) ? '#fbbf2480' : '#e2e8f0';

                ctx.fill(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=1.5; ctx.stroke();

                brainAtlasDrawPathLabel(W*0.29,H*0.40,'Hillock','#7c3aed',W*0.14);


                ctx.restore();



                // Axon with myelin + nodes

                var axonY=H*0.45, axSx=W*0.32, axEx=W*0.88, nSeg=5;

                var segW2=(axEx-axSx)/nSeg, ndW=segW2*0.12, myW=segW2-ndW;

                ctx.save();

                for(var si2=0;si2<nSeg;si2++){

                  var sx=axSx+si2*segW2;

                  ctx.beginPath(); ctx.roundRect(sx,axonY-H*0.035,myW,H*0.07,6);

                  var mg=ctx.createLinearGradient(sx,axonY-H*0.035,sx,axonY+H*0.035);

                  mg.addColorStop(0,'#f8fafc'); mg.addColorStop(0.5,'#e2e8f0'); mg.addColorStop(1,'#f1f5f9');

                  ctx.fillStyle=mg; ctx.fill(); ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1.2; ctx.stroke();

                  if(si2<nSeg-1){

                    var nx=sx+myW, ndAct=false;

                    if(phase>2){var wp=(phase-2)/3,np=(si2+1)/nSeg;ndAct=Math.abs(wp-np)<0.15;}

                    ctx.beginPath(); ctx.rect(nx,axonY-H*0.03,ndW,H*0.06);

                    ctx.fillStyle=ndAct?'#fbbf2450':'#fef3c750'; ctx.fill();

                    ctx.strokeStyle=ndAct?'#f59e0b':'#d97706'; ctx.lineWidth=1; ctx.stroke();

                    if(ndAct){

                      for(var pi2=0;pi2<4;pi2++){

                        var iT=((nT*0.05*nSpeed+pi2*0.25)%1);

                        var ix2=nx+ndW*0.5+(Math.random()-0.5)*ndW*0.6;

                        var iy2=axonY-H*0.08+iT*H*0.05;

                        ctx.beginPath(); ctx.arc(ix2,iy2,2.5,0,Math.PI*2);

                        ctx.fillStyle=naColor; ctx.globalAlpha=1-iT; ctx.fill(); ctx.globalAlpha=1;

                      }

                      if(phase>3.5){

                        for(var ki2=0;ki2<3;ki2++){

                          var kT2=((nT*0.04*nSpeed+ki2*0.33)%1);

                          var kx2=nx+ndW*0.5+(Math.random()-0.5)*ndW*0.5;

                          var ky2=axonY+H*0.03+kT2*H*0.05;

                          ctx.beginPath(); ctx.arc(kx2,ky2,2.5,0,Math.PI*2);

                          ctx.fillStyle=kColor; ctx.globalAlpha=1-kT2; ctx.fill(); ctx.globalAlpha=1;

                        }

                      }

                    }

                  }

                }

                if(phase>2){

                  var wf=Math.min(1,(phase-2)/3), wx=axSx+wf*(axEx-axSx);

                  var wg=ctx.createRadialGradient(wx,axonY,2,wx,axonY,W*0.04);

                  wg.addColorStop(0,'rgba(249,115,22,0.6)'); wg.addColorStop(1,'rgba(249,115,22,0)');

                  ctx.beginPath(); ctx.arc(wx,axonY,W*0.04,0,Math.PI*2); ctx.fillStyle=wg; ctx.fill();

                }

                ctx.restore();



                // Axon terminal

                ctx.save();

                var tAct=phase>4.5;

                ctx.beginPath(); ctx.arc(W*0.90,H*0.45,W*0.03,0,Math.PI*2);

                var tg=ctx.createRadialGradient(W*0.895,H*0.44,W*0.005,W*0.90,H*0.45,W*0.03);

                tg.addColorStop(0,tAct?'#fde68a':'#ede9fe'); tg.addColorStop(1,tAct?'#f59e0b':'#c4b5fd');

                ctx.fillStyle=tg; ctx.fill(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=1.5; ctx.stroke();

                for(var vi2=0;vi2<4;vi2++){

                  ctx.beginPath(); ctx.arc(W*0.90+Math.cos(vi2*1.57)*W*0.012,H*0.45+Math.sin(vi2*1.57)*H*0.015,2.5,0,Math.PI*2);

                  ctx.fillStyle=tAct?'#fbbf24':'#ddd6fe'; ctx.fill();

                }

                if(tAct){

                  for(var ri2=0;ri2<5;ri2++){

                    var rT2=((nT*0.03*nSpeed+ri2*0.2)%1);

                    ctx.beginPath(); ctx.arc(W*0.93+rT2*W*0.04,H*0.45+(Math.random()-0.5)*H*0.04,2,0,Math.PI*2);

                    ctx.fillStyle='#a78bfa'; ctx.globalAlpha=1-rT2; ctx.fill(); ctx.globalAlpha=1;

                  }

                }

                brainAtlasDrawPathLabel(W*0.90,H*0.58,'Terminal','#7c3aed',W*0.13);


                ctx.restore();



                // Labels (enlarged text)

                ctx.save();


                brainAtlasDrawPathLabel(W*0.50,H*0.34,'Myelin Sheath','#475569',W*0.18);

                brainAtlasDrawPathLabel(W*0.50,H*0.575,'Nodes of Ranvier','#475569',W*0.20);

                ctx.beginPath(); ctx.moveTo(W*0.50,H*0.355); ctx.lineTo(W*0.50,H*0.40);

                ctx.strokeStyle='#94a3b8'; ctx.lineWidth=0.8; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(W*0.50,H*0.59); ctx.lineTo(W*0.50,H*0.53); ctx.stroke();

                ctx.restore();



                // Voltage graph overlay (roomier, with labels kept inside the panel)

                ctx.save();

                var gx2=W*0.50,gy2=H*0.60,gw2=W*0.46,gh2=H*0.31;

                ctx.fillStyle='#ffffffee'; ctx.beginPath(); ctx.roundRect(gx2,gy2,gw2,gh2,8); ctx.fill();

                ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1; ctx.stroke();

                ctx.font='bold '+(10*fontScale)+'px Inter,system-ui,sans-serif';

                ctx.fillStyle='#334155'; ctx.textAlign='left'; ctx.fillText('Membrane Potential (mV)',gx2+10,gy2+18);

                var px2=gx2+gw2*0.22,py2=gy2+32,pw2=gw2*0.58,ph2=gh2-48;
                var voltageLabelX=px2+pw2+gw2*0.10,voltageLabelW=gw2*0.17;

                ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=0.5;

                ctx.beginPath(); ctx.moveTo(px2,py2); ctx.lineTo(px2,py2+ph2); ctx.lineTo(px2+pw2,py2+ph2); ctx.stroke();

                ctx.font='bold '+(7*fontScale)+'px Inter,system-ui,sans-serif'; ctx.fillStyle='#94a3b8'; ctx.textAlign='right';

                ctx.fillText('+30 mV',px2-3,py2+ph2*0.15); ctx.fillText('0 mV',px2-3,py2+ph2*0.38);

                ctx.fillText('-55 mV',px2-3,py2+ph2*0.58); ctx.fillText('-70 mV',px2-3,py2+ph2*0.70);

                // Resting potential line
                ctx.beginPath(); ctx.setLineDash([3,3]);
                ctx.moveTo(px2,py2+ph2*0.70); ctx.lineTo(px2+pw2,py2+ph2*0.70);
                ctx.strokeStyle='#3b82f650'; ctx.stroke();
                brainAtlasDrawBoundedNodeLabel(voltageLabelX,py2+ph2*0.70,voltageLabelW,18,'Resting','','#3b82f6','#3b82f6');
                ctx.setLineDash([]);

                // Threshold line
                ctx.beginPath(); ctx.setLineDash([3,3]);
                ctx.moveTo(px2,py2+ph2*0.58); ctx.lineTo(px2+pw2,py2+ph2*0.58);
                ctx.strokeStyle='#ef444460'; ctx.stroke(); ctx.setLineDash([]);
                brainAtlasDrawBoundedNodeLabel(voltageLabelX,py2+ph2*0.58,voltageLabelW,18,'Threshold','','#ef4444','#ef4444');

                // Action potential curve labels
                var apP=[[0,0.70],[0.15,0.70],[0.25,0.68],[0.35,0.58],[0.42,0.15],[0.48,0.10],[0.55,0.50],[0.65,0.82],[0.78,0.72],[1.0,0.70]];

                ctx.beginPath(); ctx.strokeStyle='#7c3aed'; ctx.lineWidth=2.5;

                apP.forEach(function(p,i){var ppx2=px2+p[0]*pw2,ppy2=py2+p[1]*ph2;if(i===0)ctx.moveTo(ppx2,ppy2);else ctx.lineTo(ppx2,ppy2);}); ctx.stroke();

                // Phase labels on curve
                brainAtlasDrawPathLabel(px2+0.38*pw2,py2+ph2*0.05,'Depolarization','#7c3aed',gw2*0.27);
                brainAtlasDrawPathLabel(px2+0.61*pw2,py2+ph2*0.42,'Repolarization','#22c55e',gw2*0.27);
                brainAtlasDrawPathLabel(px2+0.75*pw2,py2+ph2*0.90,'Hyperpolarization','#f59e0b',gw2*0.31);

                var df=phase/6,di2=Math.min(apP.length-2,Math.floor(df*(apP.length-1))),dt2=(df*(apP.length-1))-di2;

                var dpx=px2+(apP[di2][0]+(apP[di2+1][0]-apP[di2][0])*dt2)*pw2;

                var dpy=py2+(apP[di2][1]+(apP[di2+1][1]-apP[di2][1])*dt2)*ph2;

                ctx.beginPath(); ctx.arc(dpx,dpy,5,0,Math.PI*2); ctx.fillStyle='#7c3aed'; ctx.fill();

                ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();

                ctx.restore();



                // Ion legend and key concept

                ctx.save();
                var lgX=W*0.035, lgY=H*0.635, lgW=W*0.32, lgH=H*0.285;
                ctx.fillStyle='rgba(255,255,255,0.92)';
                ctx.beginPath(); ctx.roundRect(lgX,lgY,lgW,lgH,8); ctx.fill();
                ctx.strokeStyle='rgba(203,213,225,0.9)'; ctx.lineWidth=1; ctx.stroke();
                var ionLegendItems = [
                  { color: naColor, label: 'Na\u207A ions (rush in)' },
                  { color: kColor, label: 'K\u207A ions (flow out)' },
                  { color: '#fbbf24', label: 'Signal propagation' }
                ];
                brainAtlasDrawLegendGrid(lgX + 10, lgY + 8, lgW - 20, ionLegendItems, '#475569', lgW - 20);
                brainAtlasDrawTeachingCard(lgX + 10, lgY + 64, lgW - 20, lgH - 74, '\u26A1 ALL-OR-NOTHING', 'Once threshold (-55mV) is reached, the neuron fires at full strength. No partial signals!', '#7c3aed', true);
                ctx.restore();



                // Phase name overlay (enlarged)

                ctx.save(); var pn=phaseNames[Math.floor(phase)];

                ctx.font='bold '+(12*fontScale)+'px Inter,system-ui,sans-serif';

                var pnW2=ctx.measureText(pn).width+20;

                ctx.beginPath(); ctx.roundRect(W-pnW2-10,6,pnW2,24,8);

                var pc=phase<1?'#94a3b8':phase<2?'#eab308':phase<4?'#f97316':phase<5?'#22c55e':'#3b82f6';

                ctx.fillStyle=pc+'20'; ctx.fill(); ctx.strokeStyle=pc+'60'; ctx.lineWidth=1; ctx.stroke();

                ctx.fillStyle=pc; ctx.textAlign='center'; ctx.fillText(pn,W-pnW2/2,23);

                ctx.restore();

              } else if (currentView.isSynapse) {
                // Synaptic density across the lifespan (Huttenlocher-style)
                ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
                var sT = canvas._brainTick || 0;
                var mL = 78, mR = 48, mT = 110, mB = 74;
                var pW = W - mL - mR, pH = H - mT - mB, x0 = mL, y0 = mT, yB = mT + pH;
                var sensoryPts = [[0, 0.32], [0.5, 0.86], [1, 1.0], [2, 0.96], [4, 0.82], [8, 0.66], [12, 0.6], [20, 0.58], [70, 0.55]];
                var prefrontalPts = [[0, 0.26], [1, 0.62], [3, 0.92], [5, 1.0], [10, 0.9], [15, 0.8], [20, 0.7], [25, 0.62], [40, 0.6], [70, 0.58]];
                var ageX = function (a) { var f = a <= 25 ? (a / 25) * 0.78 : 0.78 + ((a - 25) / 45) * 0.22; return x0 + f * pW; };
                var densY = function (dn) { return yB - dn * pH; };
                var scan = brainMotionReduced ? 0.62 : ((sT * 0.0024) % 1);
                var glow = brainMotionReduced ? 0.45 : (0.45 + 0.35 * Math.sin(sT * 0.045));

                brainAtlasDrawCompactCanvasHeading('Synapse density across the lifespan', 'Overproduction in early childhood, then experience-dependent pruning', { title: '#e2e8f0', subtitle: '#94a3b8' });

                var lifespanLegendItems = [
                  { color: '#22d3ee', label: 'Sensory cortex: early pruning' },
                  { color: '#f59e0b', label: 'Prefrontal cortex: later pruning' }
                ];
                var lifespanLegendY = Math.max(66, Math.min(y0 - 36, H * 0.12));
                brainAtlasDrawLegendGrid(x0 + 8, lifespanLegendY, pW - 16, lifespanLegendItems, '#cbd5e1', (pW - 24) / 2);

                ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, yB); ctx.lineTo(x0 + pW, yB); ctx.stroke();
                ctx.font = '9px Inter,system-ui,sans-serif'; ctx.textAlign = 'right';
                [0, 0.25, 0.5, 0.75, 1.0].forEach(function (dn) {
                  var gy = densY(dn);
                  ctx.strokeStyle = 'rgba(71,85,105,0.35)'; ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + pW, gy); ctx.stroke();
                  ctx.fillStyle = '#64748b'; ctx.fillText(dn === 1.0 ? 'peak' : dn.toFixed(2), x0 - 8, gy + 3);
                });

                ctx.fillStyle = '#64748b'; ctx.font = '9px Inter,system-ui,sans-serif'; ctx.textAlign = 'center';
                [0, 1, 2, 5, 10, 15, 20, 25, 40, 70].forEach(function (a) {
                  var x = ageX(a);
                  ctx.beginPath(); ctx.moveTo(x, yB); ctx.lineTo(x, yB + 4); ctx.stroke();
                  ctx.fillText(a + (a === 70 ? '+' : ''), x, yB + 17);
                });
                ctx.fillText('Age (years)', x0 + pW / 2, yB + 38);
                ctx.save(); ctx.translate(24, y0 + pH / 2); ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8'; ctx.fillText('Relative synapse density', 0, 0); ctx.restore();

                function drawCurve(pts, color) {
                  ctx.save();
                  ctx.shadowColor = color; ctx.shadowBlur = 9;
                  ctx.strokeStyle = color; ctx.lineWidth = 2.8;
                  ctx.beginPath();
                  pts.forEach(function (p, i) {
                    var x = ageX(p[0]), y = densY(p[1]);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                  });
                  ctx.stroke();
                  ctx.restore();
                }
                drawCurve(sensoryPts, '#22d3ee');
                drawCurve(prefrontalPts, '#f59e0b');

                function tag(x, y, text, color) {
                  brainAtlasDrawPathLabel(x, y, text, color, Math.max(72, W * 0.16));
                }
                tag(ageX(2), y0 - 16, 'synaptogenesis', '#22c55e');
                tag(ageX(11.5), y0 + 22, 'pruning', '#fb7185');

                var advX = ageX(15);
                ctx.strokeStyle = 'rgba(167,139,250,' + (0.42 + glow * 0.18) + ')'; ctx.setLineDash([5, 5]);
                ctx.beginPath(); ctx.moveTo(advX, y0); ctx.lineTo(advX, yB); ctx.stroke(); ctx.setLineDash([]);
                tag(advX, y0 - 16, 'adolescence', '#a78bfa');

                function pointOnCurve(pts, f) {
                  var span = f * (pts.length - 1);
                  var idx = Math.min(pts.length - 2, Math.max(0, Math.floor(span)));
                  var local = span - idx;
                  var a = pts[idx], b = pts[idx + 1];
                  return { x: ageX(a[0] + (b[0] - a[0]) * local), y: densY(a[1] + (b[1] - a[1]) * local) };
                }
                function pulsePoint(pt, color, label) {
                  ctx.save();
                  ctx.fillStyle = 'rgba(255,255,255,0.9)';
                  ctx.beginPath(); ctx.arc(pt.x, pt.y, 7 + glow * 2, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = color;
                  ctx.beginPath(); ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2); ctx.fill();
                  brainAtlasDrawPathLabel(pt.x, pt.y - 15, label, color, Math.max(64, W * 0.13));
                  ctx.restore();
                }
                var scanX = x0 + scan * pW;
                ctx.strokeStyle = 'rgba(226,232,240,0.24)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(scanX, y0); ctx.lineTo(scanX, yB); ctx.stroke();
                pulsePoint(pointOnCurve(sensoryPts, scan), '#22d3ee', 'sensory');
                pulsePoint(pointOnCurve(prefrontalPts, (scan + 0.17) % 1), '#f59e0b', 'prefrontal');
              } else if (currentView.isStim) {
                var stimTick = canvas._brainTick || 0;
                var stimPulse = brainMotionReduced ? 0.55 : (0.5 + 0.5 * Math.sin(stimTick * 0.095));
                var stimSweep = brainMotionReduced ? 0.35 : ((stimTick * 0.004) % 1);
                var activeStim = STIM_SCENARIOS && STIM_SCENARIOS.length ? STIM_SCENARIOS[(d.stimIdx || 0) % STIM_SCENARIOS.length] : { target: 'the primary motor cortex (hand area)' };
                function stimScenarioRegionId(targetText) {
                  var target = String(targetText || '').toLowerCase();
                  if (target.indexOf('motor') >= 0) return 'stim_motor_map';
                  if (target.indexOf('somatosensory') >= 0) return 'stim_sensory_map';
                  if (target.indexOf('visual') >= 0) return 'stim_visual_map';
                  if (target.indexOf('auditory') >= 0) return 'stim_auditory_map';
                  if (target.indexOf('broca') >= 0 || target.indexOf('wernicke') >= 0) return 'stim_language_map';
                  if (target.indexOf('temporal-lobe') >= 0 || target.indexOf('amygdala') >= 0) return 'stim_memory_emotion_map';
                  return 'stim_autonomic_quiet_map';
                }
                var activeStimId = stimScenarioRegionId(activeStim.target);
                var stimZones = [
                  { id: 'stim_motor_map', x: W * 0.34, y: H * 0.25, color: '#22c55e', label: 'Motor', sub: 'movement' },
                  { id: 'stim_sensory_map', x: W * 0.46, y: H * 0.27, color: '#0ea5e9', label: 'Sensory', sub: 'tingling' },
                  { id: 'stim_visual_map', x: W * 0.72, y: H * 0.40, color: '#8b5cf6', label: 'Visual', sub: 'flashes' },
                  { id: 'stim_auditory_map', x: W * 0.58, y: H * 0.46, color: '#f59e0b', label: 'Auditory', sub: 'sounds' },
                  { id: 'stim_language_map', x: W * 0.29, y: H * 0.43, color: '#ef4444', label: 'Language', sub: 'speech clue' },
                  { id: 'stim_memory_emotion_map', x: W * 0.51, y: H * 0.59, color: '#ec4899', label: 'Memory / emotion', sub: 'deja vu / fear' },
                  { id: 'stim_autonomic_quiet_map', x: W * 0.35, y: H * 0.60, color: '#14b8a6', label: 'Autonomic / quiet', sub: 'body state' }
                ];
                var activeStimZone = stimZones.find(function (z) { return z.id === activeStimId; }) || stimZones[0];

                ctx.fillStyle = '#fff7ed'; ctx.fillRect(0, 0, W, H);
                brainAtlasDrawCanvasHeading('Penfield stimulation response map', 'Tap a zone or use the scenario panel to predict the patient response.', { accent: '#ea580c', title: '#7c2d12', subtitle: '#9a3412' });

                var skullX = W * 0.50, skullY = H * 0.43, skullW = W * 0.34, skullH = H * 0.27;
                ctx.save();
                ctx.shadowColor = 'rgba(251,146,60,0.25)'; ctx.shadowBlur = 18;
                ctx.fillStyle = '#fed7aa'; ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.ellipse(skullX - skullW * 0.13, skullY - skullH * 0.02, skullW * 0.64, skullH * 0.82, -0.05, 0, Math.PI * 2);
                ctx.ellipse(skullX + skullW * 0.27, skullY + skullH * 0.06, skullW * 0.44, skullH * 0.62, 0.12, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.restore();

                ctx.strokeStyle = 'rgba(194,65,12,0.24)'; ctx.lineWidth = 1.5;
                [-0.42, -0.21, 0.02, 0.22, 0.43].forEach(function (fx, idx) {
                  ctx.beginPath();
                  ctx.moveTo(skullX + fx * skullW, skullY - skullH * 0.58);
                  ctx.bezierCurveTo(skullX + (fx + 0.10) * skullW, skullY - skullH * 0.25, skullX + (fx - 0.13) * skullW, skullY + skullH * 0.24, skullX + (fx + 0.04) * skullW, skullY + skullH * 0.62);
                  ctx.stroke();
                  if (idx < 4) {
                    ctx.beginPath();
                    ctx.moveTo(skullX - skullW * 0.56 + idx * skullW * 0.28, skullY - skullH * 0.18);
                    ctx.quadraticCurveTo(skullX - skullW * 0.28 + idx * skullW * 0.24, skullY + skullH * 0.03, skullX - skullW * 0.45 + idx * skullW * 0.36, skullY + skullH * 0.28);
                    ctx.stroke();
                  }
                });

                var stimStartX = W * 0.52, stimCapY = Math.max(96, H * 0.145), stimStartY = stimCapY + 38;
                ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(stimStartX, stimCapY + 15); ctx.lineTo(stimStartX, stimStartY); ctx.stroke();
                ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.roundRect(stimStartX - 14, stimCapY, 28, 15, 5); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#475569'; ctx.font = 'bold 8px Inter,system-ui,sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('stim', stimStartX, stimCapY + 11);

                ctx.strokeStyle = 'rgba(245,158,11,0.72)'; ctx.lineWidth = 2.4;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(stimStartX, stimStartY);
                ctx.bezierCurveTo(stimStartX - 46, stimStartY + 38, activeStimZone.x + 42, activeStimZone.y - 42, activeStimZone.x, activeStimZone.y);
                ctx.stroke();
                ctx.setLineDash([]);

                stimZones.forEach(function (z) {
                  var isActive = z.id === activeStimId;
                  var isSelected = sel && sel.id === z.id;
                  var radius = isActive ? 16 + stimPulse * 5 : 13;
                  ctx.save();
                  if (isActive || isSelected) {
                    ctx.shadowColor = z.color; ctx.shadowBlur = isActive ? 18 : 10;
                    ctx.fillStyle = z.color + (isActive ? '33' : '22');
                    ctx.beginPath(); ctx.arc(z.x, z.y, radius + 8, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.fillStyle = z.color;
                  ctx.beginPath(); ctx.arc(z.x, z.y, radius, 0, Math.PI * 2); ctx.fill();
                  ctx.lineWidth = isSelected ? 3 : 2;
                  ctx.strokeStyle = isSelected ? '#111827' : 'rgba(255,255,255,0.9)';
                  ctx.stroke();
                  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Inter,system-ui,sans-serif'; ctx.textAlign = 'center';
                  ctx.fillText(z.label.split(' ')[0], z.x, z.y + 3);
                  ctx.restore();

                  ctx.save();
                  ctx.font = 'bold 9px Inter,system-ui,sans-serif';
                  var zoneTitleWidth = ctx.measureText(z.label).width;
                  ctx.font = '8px Inter,system-ui,sans-serif';
                  var zoneSubtitleWidth = ctx.measureText(z.sub).width;
                  ctx.restore();
                  var labelW = Math.max(80, Math.min(118, W * 0.24, Math.max(zoneTitleWidth, zoneSubtitleWidth) + 18));
                  var labelH = 38;
                  var labelSide = z.x < W * 0.50 ? -1 : 1;
                  var labelX = Math.max(labelW / 2 + 6, Math.min(W - labelW / 2 - 6, z.x + labelSide * (labelW / 2 + 14)));
                  var labelY = Math.max(110, Math.min(H - 128, z.y + (z.y < H * 0.34 ? -30 : 32)));
                  ctx.strokeStyle = z.color + '88'; ctx.lineWidth = 1.1;
                  ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(labelX, labelY); ctx.stroke();
                  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = z.color + '88';
                  ctx.beginPath(); ctx.roundRect(labelX - labelW / 2, labelY - labelH / 2, labelW, labelH, 7); ctx.fill(); ctx.stroke();
                  brainAtlasDrawBoundedNodeLabel(labelX, labelY, labelW, labelH, z.label, z.sub, '#7c2d12', '#9a3412');
                });

                ctx.fillStyle = 'rgba(245,158,11,' + (0.18 + stimPulse * 0.24) + ')';
                ctx.beginPath(); ctx.arc(activeStimZone.x, activeStimZone.y, 28 + stimPulse * 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.arc(activeStimZone.x, activeStimZone.y, 5, 0, Math.PI * 2); ctx.fill();

                var readoutX = 30, readoutY = H - 104, readoutW = W - 60, readoutH = 47;
                ctx.fillStyle = '#431407'; ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.roundRect(readoutX, readoutY, readoutW, readoutH, 10); ctx.fill(); ctx.stroke();
                var readoutLeftX = readoutX + 14;
                var readoutRightX = readoutX + readoutW - 14;
                var readoutSplitX = readoutX + readoutW * 0.58;
                ctx.fillStyle = '#fed7aa'; ctx.font = 'bold 9px Inter,system-ui,sans-serif'; ctx.textAlign = 'left';
                ctx.fillText('CURRENT ELECTRODE TARGET', readoutLeftX, readoutY + 17);
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px Inter,system-ui,sans-serif';
                var targetReadout = brainAtlasEllipsizeCanvasText(activeStim.target.replace(/^the /, ''), Math.max(70, readoutSplitX - readoutLeftX - 10));
                ctx.fillText(targetReadout, readoutLeftX, readoutY + 35);
                ctx.fillStyle = activeStimZone.color; ctx.textAlign = 'right'; ctx.font = 'bold 11px Inter,system-ui,sans-serif';
                var responseReadout = brainAtlasEllipsizeCanvasText(activeStimZone.label + ' -> ' + activeStimZone.sub, Math.max(70, readoutRightX - readoutSplitX - 10));
                ctx.fillText(responseReadout, readoutRightX, readoutY + 31);

                [
                  ['Motor / sensory', 'move vs feel', '#22c55e'],
                  ['Vision / hearing', 'flash vs sound', '#8b5cf6'],
                  ['Language', 'speech/comprehension', '#ef4444'],
                  ['Limbic / quiet', 'fear, body, or none', '#ec4899']
                ].forEach(function (card, idx) {
                  var cw = (W - 78) / 4, cx = 30 + idx * (cw + 6), cy = H - 44;
                  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = card[2] + '88'; ctx.lineWidth = 1.2;
                  ctx.beginPath(); ctx.roundRect(cx, cy, cw, 27, 7); ctx.fill(); ctx.stroke();
                  brainAtlasDrawBoundedNodeLabel(cx + cw / 2, cy + 13.5, cw - 8, 27, card[0], card[1], card[2], '#78716c');
                });

                ctx.strokeStyle = 'rgba(234,88,12,0.28)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(30 + stimSweep * (W - 60), 62); ctx.lineTo(30 + stimSweep * (W - 60), H - 16); ctx.stroke();
              } else if (currentView.isSleep) {

                // ── Sleep Stages Hypnogram Animation ──
                var sT = canvas._brainTick;
                var nightDur = 600; // frames for one full night cycle
                var nightProg = (sT % nightDur) / nightDur; // 0..1 = 8 hours of sleep

                // Stage definitions [name, yFraction(0=top/Awake, 1=bottom/N3), color, startPct, endPct for one cycle]
                var sleepCycles = [
                  // ~90 min cycles, 4-5 per night. REM lengthens, SWS shortens across night
                  // Cycle 1 (0-0.19)
                  {s:'Awake',y:0.05,c:'#94a3b8',t0:0,t1:0.01},
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.01,t1:0.03},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.03,t1:0.08},
                  {s:'N3',y:0.80,c:'#4338ca',t0:0.08,t1:0.14},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.14,t1:0.17},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.17,t1:0.19},
                  // Cycle 2 (0.19-0.40)
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.19,t1:0.21},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.21,t1:0.27},
                  {s:'N3',y:0.80,c:'#4338ca',t0:0.27,t1:0.33},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.33,t1:0.36},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.36,t1:0.40},
                  // Cycle 3 (0.40-0.62)
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.40,t1:0.42},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.42,t1:0.50},
                  {s:'N3',y:0.75,c:'#4338ca',t0:0.50,t1:0.53},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.53,t1:0.57},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.57,t1:0.62},
                  // Cycle 4 (0.62-0.82)
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.62,t1:0.63},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.63,t1:0.72},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.72,t1:0.82},
                  // Cycle 5 (0.82-1.0) - mostly REM and light sleep
                  {s:'N1',y:0.25,c:'#38bdf8',t0:0.82,t1:0.84},
                  {s:'N2',y:0.50,c:'#3b82f6',t0:0.84,t1:0.90},
                  {s:'REM',y:0.15,c:'#a855f7',t0:0.90,t1:0.98},
                  {s:'Awake',y:0.05,c:'#94a3b8',t0:0.98,t1:1.0}
                ];

                // Graph area
                var gxS = W * 0.14, gyS = H * 0.08, gwS = W * 0.80, ghS = H * 0.64;

                // Background
                ctx.save();
                ctx.fillStyle = '#faf8ff';
                ctx.beginPath(); ctx.roundRect(gxS - 8, gyS - 8, gwS + 16, ghS + 16, 8);
                ctx.fill();
                ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();

                // Title
                ctx.font = 'bold ' + Math.round(14 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#334155'; ctx.textAlign = 'center';
                var sleepHeading = brainAtlasEllipsizeCanvasText('Sleep Hypnogram \u2014 One Night (8 Hours)', Math.max(100, W - 48));
                ctx.fillText(sleepHeading, W * 0.5, gyS - 16);

                // Y-axis labels
                ctx.font = Math.round(10 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'right';
                var stageLabels = [
                  {name:t('stem.brainatlas.awake', 'Awake'),y:0.05,color: 'var(--allo-stem-text-soft, #94a3b8)'},
                  {name:'REM',y:0.15,color:'#a855f7'},
                  {name:'N1',y:0.25,color:'#38bdf8'},
                  {name:'N2',y:0.50,color:'#3b82f6'},
                  {name:'N3/SWS',y:0.80,color:'#4338ca'}
                ];
                stageLabels.forEach(function(sl) {
                  var ly = gyS + sl.y * ghS;
                  ctx.fillStyle = sl.color;
                  ctx.fillText(sl.name, gxS - 12, ly + 3);
                  // Horizontal guide line
                  ctx.beginPath(); ctx.moveTo(gxS, ly); ctx.lineTo(gxS + gwS, ly);
                  ctx.strokeStyle = sl.color + '20'; ctx.lineWidth = 0.5; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
                });

                // X-axis hour labels
                ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
                ctx.font = Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                for (var hr = 0; hr <= 8; hr++) {
                  var hx = gxS + (hr / 8) * gwS;
                  ctx.fillText(hr + 'h', hx, gyS + ghS + 16);
                  if (hr > 0) {
                    ctx.beginPath(); ctx.moveTo(hx, gyS); ctx.lineTo(hx, gyS + ghS);
                    ctx.strokeStyle = '#e2e8f030'; ctx.lineWidth = 0.5; ctx.stroke();
                  }
                }

                // Draw the hypnogram as a stepped area chart with glow
                ctx.beginPath();
                ctx.moveTo(gxS, gyS + sleepCycles[0].y * ghS);
                sleepCycles.forEach(function(cyc) {
                  var cx1 = gxS + cyc.t0 * gwS;
                  var cx2 = gxS + cyc.t1 * gwS;
                  var cy2 = gyS + cyc.y * ghS;
                  ctx.lineTo(cx1, cy2);
                  ctx.lineTo(cx2, cy2);
                });
                ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.5; ctx.stroke();

                // Colored fill bands per stage
                ctx.globalAlpha = 0.12;
                sleepCycles.forEach(function(cyc) {
                  var cx1 = gxS + cyc.t0 * gwS;
                  var cx2 = gxS + cyc.t1 * gwS;
                  var cy2 = gyS + cyc.y * ghS;
                  ctx.fillStyle = cyc.c;
                  ctx.fillRect(cx1, cy2, cx2 - cx1, gyS + ghS - cy2);
                });
                ctx.globalAlpha = 1;

                // Animated tracking dot
                var curCyc = sleepCycles[0];
                for (var ci2 = 0; ci2 < sleepCycles.length; ci2++) {
                  if (nightProg >= sleepCycles[ci2].t0 && nightProg < sleepCycles[ci2].t1) {
                    curCyc = sleepCycles[ci2]; break;
                  }
                }
                var dotX = gxS + nightProg * gwS;
                var dotY = gyS + curCyc.y * ghS;

                // Dot glow
                var dGlow = ctx.createRadialGradient(dotX, dotY, 2, dotX, dotY, 12);
                dGlow.addColorStop(0, curCyc.c + 'cc');
                dGlow.addColorStop(1, curCyc.c + '00');
                ctx.beginPath(); ctx.arc(dotX, dotY, 12, 0, Math.PI * 2);
                ctx.fillStyle = dGlow; ctx.fill();

                // Dot core
                ctx.beginPath(); ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
                ctx.fillStyle = curCyc.c; ctx.fill();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

                // Current stage label
                ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                var curLabel = curCyc.s + ' \u2014 ' + (nightProg * 8).toFixed(1) + 'h';
                brainAtlasDrawPathLabel(dotX, dotY - 16, curLabel, curCyc.c, Math.max(76, W * 0.18));

                // Cycle markers
                ctx.font = Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
                var cycleStarts = [0, 0.19, 0.40, 0.62, 0.82];
                cycleStarts.forEach(function(cs, ci3) {
                  if (ci3 > 0) {
                    var csx = gxS + cs * gwS;
                    ctx.beginPath(); ctx.moveTo(csx, gyS); ctx.lineTo(csx, gyS + ghS);
                    ctx.strokeStyle = '#cbd5e160'; ctx.lineWidth = 1; ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
                    ctx.fillText('Cycle ' + (ci3 + 1), csx, gyS + ghS + 28);
                  }
                });
                ctx.fillText('Cycle 1', gxS + 0.095 * gwS, gyS + ghS + 28);

                // Legend
                var legendItems = [
                  {name:t('stem.brainatlas.awake_2', 'Awake'),c:'#94a3b8'},{name:'REM',c:'#a855f7'},{name:'N1',c:'#38bdf8'},{name:'N2',c:'#3b82f6'},{name:'N3/SWS',c:'#4338ca'}
                ];
                brainAtlasDrawLegendGrid(W * 0.08, H * 0.782, W * 0.84, legendItems, '#475569', W * 0.24);

                function sleepDecoderChip(x, y, w, title, sub, color) {
                  brainAtlasDrawDecoderChip(x, y, w, H * 0.047, title, sub, color);
                }

                var sleepDecoderActive = !!(sel && sel.id === 'sleep_architecture_decoder_sleep');
                var sleepDecoderX = W * 0.065;
                var sleepDecoderY = H * 0.827;
                var sleepDecoderW = W * 0.87;
                var sleepDecoderH = H * 0.138;
                ctx.save();
                ctx.fillStyle = sleepDecoderActive ? 'rgba(99,102,241,0.16)' : 'rgba(15,23,42,0.88)';
                ctx.strokeStyle = sleepDecoderActive ? '#6366f1' : 'rgba(15,23,42,0.22)';
                ctx.lineWidth = sleepDecoderActive ? 2.4 : 1;
                ctx.shadowColor = sleepDecoderActive ? 'rgba(99,102,241,0.24)' : 'rgba(15,23,42,0.10)';
                ctx.shadowBlur = sleepDecoderActive ? 16 : 8;
                ctx.beginPath(); ctx.roundRect(sleepDecoderX, sleepDecoderY, sleepDecoderW, sleepDecoderH, 12); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 0;
                brainAtlasDrawDecoderBannerText(sleepDecoderX, sleepDecoderY, sleepDecoderW, sleepDecoderH, 'SLEEP ARCHITECTURE DECODER', 'early night N3 -> late night REM; fragmentation breaks the pattern', '#818cf8');
                ctx.restore();

                var sleepChipY = H * 0.885;
                var sleepChipW = W * 0.195;
                sleepDecoderChip(W * 0.087, sleepChipY, sleepChipW, 'N1 / N2', 'transition + spindles', '#3b82f6');
                sleepDecoderChip(W * 0.307, sleepChipY, sleepChipW, 'N3 early', 'restore + declarative memory', '#4338ca');
                sleepDecoderChip(W * 0.527, sleepChipY, sleepChipW, 'REM late', 'emotion + procedure', '#a855f7');
                sleepDecoderChip(W * 0.747, sleepChipY, sleepChipW, 'Fragmented', 'attention + mood cost', '#ef4444');

                ctx.restore();

              } else if (currentView.isEEG) {

                // ── EEG Waves Real-Time Animation with Activity Modes ──
                var eT = canvas._brainTick;
                var eSpeed = 0.03;

                var eegActivity = eegActivityMode;
                var actMults = activeEegMode.mults;

                // Base wave definitions modulated by activity
                var eegBands = [
                  { name: t('stem.brainatlas.delta_0_5_4_hz', 'Delta (0.5\u20134 Hz)'), freq: 1.5, amp: 0.08 * actMults[0], color: '#4338ca', yc: 0.12, desc: eegActivity === 'sleeping' ? '\u2B06 Dominant' : 'Deep Sleep' },
                  { name: t('stem.brainatlas.theta_4_8_hz', 'Theta (4\u20138 Hz)'), freq: 4, amp: 0.06 * actMults[1], color: '#0ea5e9', yc: 0.32, desc: eegActivity === 'meditating' ? '\u2B06 Enhanced' : 'Drowsiness' },
                  { name: t('stem.brainatlas.alpha_8_13_hz', 'Alpha (8\u201313 Hz)'), freq: 8, amp: 0.045 * actMults[2], color: '#22c55e', yc: 0.52, desc: eegActivity === 'resting' ? '\u2B06 Dominant' : 'Relaxed' },
                  { name: t('stem.brainatlas.beta_13_30_hz', 'Beta (13\u201330 Hz)'), freq: 16, amp: 0.03 * actMults[3], color: '#f59e0b', yc: 0.72, desc: (eegActivity === 'studying' || eegActivity === 'exercise') ? '\u2B06 Dominant' : 'Active' },
                  { name: t('stem.brainatlas.gamma_30_100_hz', 'Gamma (30\u2013100 Hz)'), freq: 35, amp: 0.018 * actMults[4], color: '#ef4444', yc: 0.90, desc: eegActivity === 'studying' ? '\u2B06 Enhanced' : 'Focus' }
                ];

                // Title with activity mode
                brainAtlasDrawCompactCanvasHeading('EEG \u2014 ' + activeEegMode.label + ' Brain Activity', '', { title: '#334155' });
                canvas._eegBtnRects = [];

                // Draw each EEG channel
                var eMarginL = W * 0.18;
                var eTraceW = W * 0.76;
                var eChanH = H * 0.16;

                eegBands.forEach(function(band) {
                  var yBase = band.yc * H;

                  // Channel background
                  ctx.save();
                  ctx.fillStyle = band.color + '08';
                  ctx.beginPath(); ctx.roundRect(eMarginL - 4, yBase - eChanH * 0.5, eTraceW + 8, eChanH, 4);
                  ctx.fill();
                  ctx.strokeStyle = band.color + '20'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Label
                  brainAtlasDrawBoundedNodeLabel(eMarginL * 0.5, yBase, eMarginL - 12, eChanH * 0.72, band.name, band.desc, band.color, band.color + 'aa');

                  // Baseline
                  ctx.beginPath(); ctx.moveTo(eMarginL, yBase); ctx.lineTo(eMarginL + eTraceW, yBase);
                  ctx.strokeStyle = band.color + '15'; ctx.lineWidth = 0.5; ctx.setLineDash([2,2]); ctx.stroke(); ctx.setLineDash([]);

                  // EEG waveform — scrolling sine with harmonics
                  ctx.beginPath();
                  var nPts = 300;
                  for (var ei = 0; ei <= nPts; ei++) {
                    var ex = eMarginL + (ei / nPts) * eTraceW;
                    var tOff = eT * eSpeed + ei * 0.02;
                    // Main wave + harmonic for realistic EEG appearance
                    var ey = yBase
                      + Math.sin(tOff * band.freq * 0.5) * H * band.amp
                      + Math.sin(tOff * band.freq * 1.3 + 1.2) * H * band.amp * 0.3
                      + Math.sin(tOff * band.freq * 2.7 + 3.1) * H * band.amp * 0.12;
                    if (ei === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
                  }
                  ctx.strokeStyle = band.color; ctx.lineWidth = 1.8; ctx.stroke();

                  // Glow effect on the wave
                  ctx.save();
                  ctx.globalAlpha = 0.15;
                  ctx.strokeStyle = band.color; ctx.lineWidth = 4; ctx.stroke();
                  ctx.restore();

                  // Amplitude scale bar
                  ctx.beginPath();
                  ctx.moveTo(eMarginL + eTraceW + 6, yBase - H * band.amp);
                  ctx.lineTo(eMarginL + eTraceW + 6, yBase + H * band.amp);
                  ctx.strokeStyle = band.color + '40'; ctx.lineWidth = 1; ctx.stroke();
                  // Scale ticks
                  ctx.beginPath();
                  ctx.moveTo(eMarginL + eTraceW + 3, yBase - H * band.amp);
                  ctx.lineTo(eMarginL + eTraceW + 9, yBase - H * band.amp);
                  ctx.moveTo(eMarginL + eTraceW + 3, yBase + H * band.amp);
                  ctx.lineTo(eMarginL + eTraceW + 9, yBase + H * band.amp);
                  ctx.stroke();

                  ctx.restore();
                });

                // Time scale bar (bottom)
                ctx.save();
                var scaleCenterX = eMarginL + eTraceW * 0.85;
                var scaleW = Math.max(48, Math.min(eTraceW * 0.18, 92));
                var scaleY = H - 20;
                brainAtlasDrawPathLabel(scaleCenterX, scaleY - 13, '1 second', '#64748b', Math.max(68, scaleW + 18));
                // Scale bar line and end ticks share a fixed bottom-safe baseline.
                ctx.beginPath();
                ctx.moveTo(scaleCenterX - scaleW / 2, scaleY);
                ctx.lineTo(scaleCenterX + scaleW / 2, scaleY);
                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(scaleCenterX - scaleW / 2, scaleY - 5); ctx.lineTo(scaleCenterX - scaleW / 2, scaleY + 5);
                ctx.moveTo(scaleCenterX + scaleW / 2, scaleY - 5); ctx.lineTo(scaleCenterX + scaleW / 2, scaleY + 5);
                ctx.stroke();
                ctx.restore();

              } else if (currentView.isCrossLateral) {

                // ── Cross-Lateralization (Coronal View) ──
                var clT = canvas._brainTick || 0;

                // Gently scalloped (gyral) edge so the coronal hemispheres read as brain lobes,
                // not plain ellipses — deterministic, and the interior is left clear for the pathways.
                function coronalHemi(cx, cy, rx, ry) {
                  ctx.beginPath();
                  for (var i = 0; i <= 72; i++) {
                    var a = (i / 72) * Math.PI * 2;
                    var wob = 1 + Math.sin(a * 11) * 0.035 + Math.sin(a * 22 + 1) * 0.018;
                    var x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                  }
                  ctx.closePath();
                }

                // Background — faint grid
                ctx.save(); ctx.globalAlpha = 0.04; ctx.strokeStyle = '#6d5a8f';
                for (var gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
                for (var gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
                ctx.restore();

                // Title
                brainAtlasDrawCompactCanvasHeading('CROSS-LATERALIZATION', 'Each hemisphere controls the OPPOSITE side of the body', { title: '#7c3aed', subtitle: '#64748b' });

                // ── Coronal brain silhouette ──
                var brCx = W * 0.5, brCy = H * 0.33, brRx = W * 0.30, brRy = H * 0.22;

                // Left hemisphere
                ctx.save();
                ctx.shadowColor = 'rgba(100,70,160,0.15)'; ctx.shadowBlur = 12;
                coronalHemi(brCx - brRx * 0.52, brCy, brRx * 0.52, brRy);
                var lhGrad = ctx.createRadialGradient(brCx - brRx * 0.52, brCy - brRy * 0.2, brRx * 0.1, brCx - brRx * 0.52, brCy, brRx * 0.52);
                lhGrad.addColorStop(0, '#f3eeff'); lhGrad.addColorStop(1, '#e0d4f5');
                ctx.fillStyle = lhGrad; ctx.fill();
                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();

                // Right hemisphere
                ctx.save();
                ctx.shadowColor = 'rgba(100,70,160,0.15)'; ctx.shadowBlur = 12;
                coronalHemi(brCx + brRx * 0.52, brCy, brRx * 0.52, brRy);
                var rhGrad = ctx.createRadialGradient(brCx + brRx * 0.52, brCy - brRy * 0.2, brRx * 0.1, brCx + brRx * 0.52, brCy, brRx * 0.52);
                rhGrad.addColorStop(0, '#f3eeff'); rhGrad.addColorStop(1, '#e0d4f5');
                ctx.fillStyle = rhGrad; ctx.fill();
                ctx.strokeStyle = '#8b6fc0'; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();

                // Midline fissure
                ctx.save();
                ctx.beginPath(); ctx.setLineDash([4, 3]);
                ctx.moveTo(brCx, brCy - brRy - 5); ctx.lineTo(brCx, brCy + brRy + 5);
                ctx.strokeStyle = '#6d4a8e'; ctx.lineWidth = 2; ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // Hemisphere labels — positioned well above the brain ellipses
                brainAtlasDrawPathLabel(brCx - brRx * 0.52, brCy - brRy * 0.68, 'LEFT', '#7c3aed', W * 0.12);
                brainAtlasDrawPathLabel(brCx + brRx * 0.52, brCy - brRy * 0.68, 'RIGHT', '#7c3aed', W * 0.12);

                // Corpus callosum (connecting bridge)
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(brCx, brCy - brRy * 0.05, brRx * 0.30, brRy * 0.12, 0, 0, Math.PI * 2);
                var ccGrad = ctx.createLinearGradient(brCx - brRx * 0.3, brCy, brCx + brRx * 0.3, brCy);
                ccGrad.addColorStop(0, '#ddd6fe'); ccGrad.addColorStop(0.5, '#f5f3ff'); ccGrad.addColorStop(1, '#ddd6fe');
                ctx.fillStyle = ccGrad; ctx.fill();
                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.stroke();
                for (var ccFiber = 0; ccFiber < 5; ccFiber++) {
                  var fy = brCy - brRy * 0.08 + (ccFiber - 2) * brRy * 0.025;
                  ctx.beginPath();
                  ctx.moveTo(brCx - brRx * 0.24, fy);
                  ctx.quadraticCurveTo(brCx, fy - brRy * 0.08, brCx + brRx * 0.24, fy);
                  ctx.strokeStyle = 'rgba(124,58,237,0.30)';
                  ctx.lineWidth = 0.9;
                  ctx.stroke();
                }
                if (!brainMotionReduced) {
                  for (var ccPulse = 0; ccPulse < 3; ccPulse++) {
                    var cp = ((clT * 0.007 + ccPulse * 0.33) % 1);
                    var cxp = brCx - brRx * 0.24 + brRx * 0.48 * cp;
                    var cyp = brCy - brRy * 0.06 - Math.sin(cp * Math.PI) * brRy * 0.045;
                    ctx.beginPath(); ctx.arc(cxp, cyp, 4.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff'; ctx.fill();
                    ctx.beginPath(); ctx.arc(cxp, cyp, 2.6, 0, Math.PI * 2);
                    ctx.fillStyle = '#7c3aed'; ctx.fill();
                  }
                }
                brainAtlasDrawPathLabel(brCx, brCy, 'Corpus Callosum', '#7c3aed', W * 0.20);
                ctx.restore();

                function callosalResearchCard(x, y, w, h, title, lines, color) {
                  brainAtlasDrawTeachingCard(x, y, w, h, title, lines, color, false);
                }

                callosalResearchCard(W * 0.025, H * 0.155, W * 0.150, H * 0.220, 'SPLIT-BRAIN EVIDENCE', [
                  'Left visual field',
                  '-> right hemisphere',
                  'speech cannot name',
                  'left hand can pick'
                ], '#dc2626');
                callosalResearchCard(W * 0.825, H * 0.155, W * 0.150, H * 0.220, 'CALLOSAL TRANSFER', [
                  'Intact callosum',
                  'shares visual info',
                  'callosotomy blocks',
                  'cross-report'
                ], '#7c3aed');

                // Brainstem + medulla below
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(brCx - 12, brCy + brRy);
                ctx.quadraticCurveTo(brCx - 14, brCy + brRy + 40, brCx - 8, H * 0.78);
                ctx.lineTo(brCx + 8, H * 0.78);
                ctx.quadraticCurveTo(brCx + 14, brCy + brRy + 40, brCx + 12, brCy + brRy);
                ctx.closePath();
                var bsGrad = ctx.createLinearGradient(brCx, brCy + brRy, brCx, H * 0.78);
                bsGrad.addColorStop(0, '#e8e0f0'); bsGrad.addColorStop(1, '#d4c8e8');
                ctx.fillStyle = bsGrad; ctx.fill();
                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.stroke();
                // Medulla pyramids label — offset to the right to avoid pathway overlap
                var medLabelX = brCx + W * 0.07;
                var medLabelY = H * 0.73;
                brainAtlasDrawPathLabel(medLabelX, medLabelY, 'Medulla Pyramids', '#7c3aed', W * 0.20);
                ctx.restore();

                // ── Crossing Pathways with animated pulses ──
                function drawCrossingPathway(fromX, fromY, crossY, toX, toY, color, label, pulseOffset) {
                  // Upper segment (ipsilateral)
                  ctx.beginPath();
                  ctx.moveTo(fromX, fromY);
                  ctx.quadraticCurveTo(fromX, crossY - 15, brCx, crossY);
                  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7; ctx.stroke();

                  // Lower segment (contralateral — crosses midline)
                  ctx.beginPath();
                  ctx.moveTo(brCx, crossY);
                  ctx.quadraticCurveTo(toX, crossY + 15, toX, toY);
                  ctx.stroke();
                  ctx.globalAlpha = 1;

                  // Animated pulse
                  var pulsePhase = ((clT * 0.012 + pulseOffset) % 2.0);
                  if (pulsePhase < 1) {
                    var t = pulsePhase;
                    var px, py;
                    if (t < 0.5) {
                      // Upper segment
                      var t2 = t * 2;
                      px = fromX + (brCx - fromX) * t2;
                      py = fromY + (crossY - fromY) * t2;
                    } else {
                      // Lower segment
                      var t2 = (t - 0.5) * 2;
                      px = brCx + (toX - brCx) * t2;
                      py = crossY + (toY - crossY) * t2;
                    }
                    // Glow
                    ctx.save();
                    var pGlow = ctx.createRadialGradient(px, py, 1, px, py, 8);
                    pGlow.addColorStop(0, color); pGlow.addColorStop(1, color.slice(0, 7) + '00');
                    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
                    ctx.fillStyle = pGlow; ctx.fill();
                    // Core dot
                    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff'; ctx.fill();
                    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = color; ctx.fill();
                    ctx.restore();
                  }

                  // Crossing node (X mark at midline)
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(brCx, crossY, 4, 0, Math.PI * 2);
                  ctx.fillStyle = color; ctx.globalAlpha = 0.5; ctx.fill();
                  ctx.restore();
                }

                ctx.save();
                // Motor pathway: Left motor cortex → crosses at medullary pyramids → Right body
                drawCrossingPathway(
                  brCx - brRx * 0.35, brCy - brRy * 0.6,  // Left motor cortex
                  H * 0.72,  // Cross at medullary pyramids
                  brCx + W * 0.25, H * 0.92,  // Right body
                  '#ef4444', 'Motor', 0
                );
                // Motor: Right motor cortex → Left body
                drawCrossingPathway(
                  brCx + brRx * 0.35, brCy - brRy * 0.6,
                  H * 0.72,
                  brCx - W * 0.25, H * 0.92,
                  '#ef4444', 'Motor', 0.7
                );

                // Sensory pathway: Right body → crosses at medial lemniscus → Left cortex
                drawCrossingPathway(
                  brCx + W * 0.22, H * 0.88,
                  H * 0.64,
                  brCx - brRx * 0.40, brCy + brRy * 0.1,
                  '#3b82f6', 'Sensory', 0.35
                );
                // Sensory: Left body → Right cortex
                drawCrossingPathway(
                  brCx - W * 0.22, H * 0.88,
                  H * 0.64,
                  brCx + brRx * 0.40, brCy + brRy * 0.1,
                  '#3b82f6', 'Sensory', 1.05
                );

                // Visual pathway: partial crossing at optic chiasm
                drawCrossingPathway(
                  brCx - W * 0.28, brCy + brRy * 0.5,  // Left eye
                  brCy + brRy + 10,  // Optic chiasm
                  brCx + brRx * 0.45, brCy,  // Right occipital
                  '#22c55e', 'Visual (nasal)', 0.5
                );
                drawCrossingPathway(
                  brCx + W * 0.28, brCy + brRy * 0.5,
                  brCy + brRy + 10,
                  brCx - brRx * 0.45, brCy,
                  '#22c55e', 'Visual (nasal)', 1.2
                );
                ctx.restore();

                function splitBrainExperimentInset() {
                  var bx = W * 0.195;
                  var by = H * 0.550;
                  var bw = W * 0.610;
                  var bh = Math.max(96, H * 0.190);
                  var insetHeaderH = Math.max(36, Math.min(44, bh * 0.38));
                  ctx.save();
                  ctx.fillStyle = 'rgba(255,255,255,0.94)';
                  ctx.strokeStyle = 'rgba(124,58,237,0.35)';
                  ctx.lineWidth = 1.2;
                  ctx.shadowColor = 'rgba(15,23,42,0.10)';
                  ctx.shadowBlur = 8;
                  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = '#7c3aed';
                  ctx.font = 'bold ' + Math.round(8 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('FIXATION TASK', bx + bw * 0.5, by + 14);
                  ctx.fillStyle = '#64748b';
                  var insetBodyPx = Math.max(7, Math.round(6.8 * fontScale));
                  ctx.font = insetBodyPx + 'px Inter, system-ui, sans-serif';
                  var insetBodyLines = brainAtlasWrapCanvasLabel('Callosotomy blocks transfer; intact callosum shares the cue.', bw - 24, 2);
                  var insetBodyLineHeight = insetBodyPx + 2;
                  insetBodyLines.forEach(function (line, lineIndex) { ctx.fillText(line, bx + bw * 0.5, by + 25 + lineIndex * insetBodyLineHeight); });

                  var sx = bx + 14, sy = by + insetHeaderH + 2, sw = bw * 0.36, sh = bh - insetHeaderH - 24;
                  ctx.fillStyle = '#f8fafc';
                  ctx.strokeStyle = '#cbd5e1';
                  ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 8); ctx.fill(); ctx.stroke();
                  ctx.fillStyle = 'rgba(220,38,38,0.10)';
                  ctx.fillRect(sx + 1, sy + 1, sw * 0.5 - 1, sh - 2);
                  ctx.fillStyle = 'rgba(37,99,235,0.10)';
                  ctx.fillRect(sx + sw * 0.5, sy + 1, sw * 0.5 - 1, sh - 2);
                  ctx.strokeStyle = '#94a3b8';
                  ctx.beginPath(); ctx.moveTo(sx + sw * 0.5, sy + 5); ctx.lineTo(sx + sw * 0.5, sy + sh - 5); ctx.stroke();
                  ctx.fillStyle = '#0f172a';
                  ctx.font = 'bold ' + Math.round(11 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillText('+', sx + sw * 0.5, sy + sh * 0.52);
                  ctx.fillStyle = '#dc2626';
                  ctx.font = 'bold ' + Math.round(9 * fontScale) + 'px Inter, system-ui, sans-serif';
                  ctx.fillText('KEY', sx + sw * 0.25, sy + sh * 0.50);
                  if (!brainMotionReduced) {
                    var flash = 0.35 + 0.35 * Math.sin(clT * 0.045);
                    ctx.globalAlpha = flash;
                    ctx.fillStyle = '#fef2f2';
                    ctx.beginPath(); ctx.roundRect(sx + 8, sy + 8, sw * 0.22, sh - 16, 6); ctx.fill();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#dc2626';
                    ctx.fillText('KEY', sx + sw * 0.25, sy + sh * 0.50);
                  }
                  var visualFieldLabelY = sy + sh + 11;
                  brainAtlasDrawBoundedNodeLabel(sx + sw * 0.25, visualFieldLabelY, sw * 0.48, 20, 'left visual field', '', '#64748b', '#64748b');
                  brainAtlasDrawBoundedNodeLabel(sx + sw * 0.75, visualFieldLabelY, sw * 0.48, 20, 'right visual field', '', '#64748b', '#64748b');

                  function conditionChip(x, y, title, body, color) {
                    brainAtlasDrawTeachingCard(x, y, bw * 0.245, bh * 0.270, title, body, color, true);
                  }

                  function outcomeBox(x, y, title, body, color) {
                    brainAtlasDrawTeachingCard(x, y, bw * 0.245, bh * 0.300, title, body, color, true);
                  }
                  var ox = bx + bw * 0.435;
                  conditionChip(ox, by + bh * 0.260, 'INTACT', 'speech can name KEY', '#16a34a');
                  conditionChip(ox + bw * 0.285, by + bh * 0.260, 'CALLOSOTOMY', 'speech blocked', '#dc2626');
                  outcomeBox(ox, by + bh * 0.610, 'Speech report', 'cannot name KEY', '#7c3aed');
                  outcomeBox(ox + bw * 0.285, by + bh * 0.610, 'Left hand', 'picks KEY', '#dc2626');

                  ctx.strokeStyle = '#dc2626';
                  ctx.lineWidth = 1.4;
                  ctx.setLineDash([4, 3]);
                  ctx.beginPath();
                  ctx.moveTo(sx + sw * 0.25, sy + sh * 0.50);
                  ctx.quadraticCurveTo(bx + bw * 0.42, by + bh * 0.30, ox + bw * 0.02, by + bh * 0.82);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  brainAtlasDrawPathLabel(bx + bw * 0.43, by + bh * 0.60, 'LVF -> right hemisphere', '#dc2626', bw * 0.32);
                  ctx.restore();
                }

                splitBrainExperimentInset();

                // ── Language lateralization highlight (left hemisphere) ──
                ctx.save();
                ctx.globalAlpha = 0.12;
                ctx.beginPath();
                ctx.ellipse(brCx - brRx * 0.45, brCy - brRy * 0.15, brRx * 0.22, brRy * 0.45, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#f59e0b'; ctx.fill();
                ctx.restore();
                brainAtlasDrawPathLabel(brCx - brRx * 0.65, brCy - brRy * 0.50, 'Broca\u2019s', '#b45900', W * 0.14);
                brainAtlasDrawPathLabel(brCx - brRx * 0.25, brCy + brRy * 0.25, 'Wernicke\u2019s', '#b45900', W * 0.16);

                // ── Legend (two rows to avoid cramping) ──
                var legItems = [
                  { color: '#ef4444', label: t('stem.brainatlas.motor_corticospinal', 'Motor (corticospinal)') },
                  { color: '#3b82f6', label: t('stem.brainatlas.sensory_dcml', 'Sensory (DCML)') },
                  { color: '#22c55e', label: t('stem.brainatlas.visual_optic', 'Visual (optic)') },
                  { color: '#f59e0b', label: t('stem.brainatlas.language_left_dominant', 'Language (left-dominant)') }
                ];
                brainAtlasDrawLegendGrid(W * 0.12, H * 0.805, W * 0.76, legItems, '#94a3b8', W * 0.34);

                // Body silhouette labels at bottom — pushed below legend rows
                brainAtlasDrawPathLabel(brCx - W * 0.30, H * 0.92, '\u2190 LEFT BODY', '#64748b', W * 0.20);
                brainAtlasDrawPathLabel(brCx + W * 0.30, H * 0.92, 'RIGHT BODY \u2192', '#64748b', W * 0.20);

              }



              ctx.restore();



              // ── Enhanced Region Markers (anatomical views only) ──
              if (!currentView.isNeuron && !currentView.isNT && !currentView.isSleep && !currentView.isEEG && !currentView.isSynapse && !currentView.isStim && !currentView.isHomunculus && !currentView.isVisualPathway && !currentView.isLanguageNetwork && !currentView.isBasalGanglia && !currentView.isCranialWillis && !currentView.isLimbicPapez && !currentView.isStrokeTerritory && !currentView.isCerebellumClinic && !currentView.isBrainstemCross && !currentView.isCsfHydro)
              filtered.forEach(function (r) {

                var px = r.x * W, py = r.y * H;

                var isSel = sel && sel.id === r.id;

                var rad = isSel ? 10 : 5;

                // Animated pulsing ring for selected

                if (isSel) {

                  var pulse = 1.0 + Math.sin(canvas._brainTick * 0.06) * 0.3;

                  ctx.save();

                  ctx.globalAlpha = 0.3 - pulse * 0.1;

                  ctx.beginPath(); ctx.arc(px, py, rad + 6 + pulse * 4, 0, Math.PI * 2);

                  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5; ctx.stroke();

                  ctx.restore();

                  // Inner glow

                  ctx.save();

                  var selGlow = ctx.createRadialGradient(px, py, rad * 0.3, px, py, rad + 4);

                  selGlow.addColorStop(0, '#7c3aed50');

                  selGlow.addColorStop(1, '#7c3aed00');

                  ctx.beginPath(); ctx.arc(px, py, rad + 4, 0, Math.PI * 2);

                  ctx.fillStyle = selGlow; ctx.fill();

                  ctx.restore();

                }

                // Marker dot (gradient sphere)

                var mGrad = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, rad);

                mGrad.addColorStop(0, isSel ? '#a78bfa' : '#c4b5fd');

                mGrad.addColorStop(1, isSel ? '#7c3aed' : '#8b5cf6');

                ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2);

                ctx.fillStyle = mGrad; ctx.fill();

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

                // Label with leader line + tooltip pill

                if (isSel) {

                  ctx.save();

                  var isRight = px > W * 0.5;
                  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
                  var pillMaxWidth = Math.min(260, W * 0.42);
                  var pillPaddingX = 8;
                  var labelLines = brainAtlasWrapCanvasLabel(r.name, pillMaxWidth - pillPaddingX * 2, 2);
                  var widestText = 0;
                  for (var labelLineIndex = 0; labelLineIndex < labelLines.length; labelLineIndex++) widestText = Math.max(widestText, ctx.measureText(labelLines[labelLineIndex]).width);
                  var pillW = Math.max(54, Math.min(pillMaxWidth, widestText + pillPaddingX * 2));
                  var pillH = labelLines.length > 1 ? 30 : 20;
                  var preferredPillX = isRight ? px - pillW - 18 : px + 18;
                  var pillX = Math.max(8, Math.min(W - pillW - 8, preferredPillX));
                  var pillY = Math.max(8, Math.min(H - pillH - 24, py - pillH / 2));
                  var leaderDirection = pillX + pillW / 2 < px ? -1 : 1;
                  var pillEdgeX = leaderDirection < 0 ? pillX + pillW : pillX;
                  var pillCenterY = pillY + pillH / 2;
                  ctx.beginPath();
                  ctx.moveTo(px + leaderDirection * (rad + 2), py);
                  ctx.lineTo(pillEdgeX, pillCenterY);
                  ctx.strokeStyle = '#7c3aed60'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
                  ctx.shadowColor = 'rgba(124,58,237,0.25)'; ctx.shadowBlur = 4;
                  ctx.beginPath();
                  ctx.roundRect(pillX, pillY, pillW, pillH, 6);
                  ctx.fillStyle = '#7c3aed'; ctx.fill();
                  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'alphabetic';
                  ctx.fillStyle = '#fff';
                  var labelBaseline = pillY + (labelLines.length > 1 ? 12 : 14);
                  labelLines.forEach(function (line, lineIndex) { ctx.fillText(line, pillX + pillPaddingX, labelBaseline + lineIndex * 11); });

                  ctx.restore();

                }

              });

              // ── Styled View Label ──

              ctx.save();

              var rawViewLabel = currentView.name.toUpperCase() + ' VIEW';

              ctx.font = 'bold 9px Inter, system-ui, sans-serif';
              var viewLabel = brainAtlasEllipsizeCanvasText(rawViewLabel, Math.max(80, W - 40));

              var vlW = ctx.measureText(viewLabel).width + 16;

              ctx.beginPath();

              ctx.roundRect(W * 0.5 - vlW / 2, H - 18, vlW, 14, 4);

              ctx.fillStyle = '#f8fafc'; ctx.fill();

              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5; ctx.stroke();

              ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';

              ctx.fillText(viewLabel, W * 0.5, H - 8);

              ctx.restore();



              // Continue animation

              scheduleBrainFrame();

            };

            drawBrainFrame();

          };

          var handleClick = function (e) {

            var rect = e.target.getBoundingClientRect();

            var cx = (e.clientX - rect.left) / rect.width;

            var cy = (e.clientY - rect.top) / rect.height;

            // EEG activity mode button click detection
            var canvas = e.target;
            if (canvas._eegBtnRects && currentView.isEEG) {
              for (var bi = 0; bi < canvas._eegBtnRects.length; bi++) {
                var btn = canvas._eegBtnRects[bi];
                if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
                  upd('eegActivity', btn.key);
                  if (typeof announceToSR === 'function') announceToSR((t('stem.brainatlas.eeg_activity_mode_set', 'EEG activity mode: ') || 'EEG activity mode: ') + brainAtlasEegModeFor(btn.key).label);
                  return; // handled by EEG button
                }
              }
            }

            var closest = null, minD = 0.08;

            filtered.forEach(function (r) {

              var dist = Math.sqrt(Math.pow(r.x - cx, 2) + Math.pow(r.y - cy, 2));

              if (dist < minD) { minD = dist; closest = r; }

            });

            if (closest) upd('selectedRegion', closest.id);

          };



          // ── Keyboard shortcuts (WCAG 2.1.1) ──
          var STIM_SCENARIOS = [
            { target: 'the primary motor cortex (hand area)', options: ['A twitch or movement of the opposite hand', 'Tingling in the opposite hand', 'A flash of light', 'Speech suddenly stops'], correctIdx: 0, note: t('stem.brainatlas.motor_cortex_stimulation_produces_move', 'Motor-cortex stimulation produces MOVEMENT on the opposite side of the body. Penfield mapped the motor homunculus exactly this way in awake patients.') },
            { target: 'the primary somatosensory cortex (hand area)', options: ['A twitch of the opposite hand', 'Tingling or numbness in the opposite hand', 'A ringing sound', 'A vivid memory'], correctIdx: 1, note: t('stem.brainatlas.the_somatosensory_strip_just_behind_th', 'The somatosensory strip (just behind the motor strip) produces a SENSATION on the opposite side, not a movement.') },
            { target: 'the primary visual cortex (occipital lobe)', options: ['A buzzing sound', 'A flash or spot of light in the opposite visual field', 'A twitch of the hand', 'A wave of fear'], correctIdx: 1, note: t('stem.brainatlas.v1_stimulation_causes_phosphenes_simpl', 'V1 stimulation causes phosphenes (simple flashes or spots of light), not formed images. This is the basis of experimental visual prostheses.') },
            { target: 'the primary auditory cortex (temporal lobe)', options: ['A buzzing, ringing, or humming sound', 'A flash of light', 'Numbness in the hand', 'Speech arrest'], correctIdx: 0, note: t('stem.brainatlas.auditory_cortex_stimulation_produces_s', 'Auditory-cortex stimulation produces simple sounds (buzzing or ringing), not words or music.') },
            { target: 'Broca area (left frontal lobe)', options: ['Speech becomes fluent but jumbled', 'Speech arrests: the person cannot get words out, but still understands', 'A flash of light', 'A twitch of the leg'], correctIdx: 1, note: t('stem.brainatlas.stimulating_broca_area_causes_speech_a', 'Stimulating Broca area causes speech ARREST with intact comprehension, the brief mirror of Broca aphasia.') },
            { target: 'Wernicke area (left temporal lobe)', options: ['Speech stops cleanly with full understanding', 'Comprehension is disrupted and output becomes jumbled', 'A ringing sound', 'Tingling in the hand'], correctIdx: 1, note: t('stem.brainatlas.wernicke_area_stimulation_disrupts_lan', 'Wernicke-area stimulation disrupts language COMPREHENSION and produces jargon, unlike the clean arrest from Broca area.') },
            { target: 'the temporal-lobe association cortex', options: ['A leg twitch', 'A vivid memory, a remembered song, or a sense of deja vu', 'A bright flash', 'A sudden chill'], correctIdx: 1, note: t('stem.brainatlas.penfield_famously_evoked_experiential_', 'Penfield famously evoked experiential responses (vivid memories, songs, deja vu) from temporal-lobe stimulation, a clue to how memory is organized.') },
            { target: 'the amygdala (deep in the temporal lobe)', options: ['A flash of light', 'A sudden surge of fear with a racing heart', 'A hand twitch', 'A remembered song'], correctIdx: 1, note: t('stem.brainatlas.amygdala_stimulation_can_trigger_fear_', 'Amygdala stimulation can trigger fear and autonomic arousal, consistent with its role in threat processing.') },
            { target: 'the hypothalamus', options: ['A flash of light', 'Autonomic changes: flushing, a heart-rate change, or hunger', 'Speech arrest', 'Tingling in the hand'], correctIdx: 1, note: t('stem.brainatlas.the_hypothalamus_drives_autonomic_and_', 'The hypothalamus drives autonomic and homeostatic responses (temperature, hunger, heart rate), not sensation or movement.') },
            { target: 'the prefrontal association cortex', options: ['An immediate hand twitch', 'A loud ringing', 'Usually little or no obvious effect', 'A bright flash of light'], correctIdx: 2, note: t('stem.brainatlas.much_of_association_cortex_including_p', 'Much of association cortex (including prefrontal) is electrically quiet: stimulation produces no dramatic response. Not every brain area maps to one obvious output.') }
          ];
          var VIEW_KEYS = Object.keys(VIEWS);
          var currentViewIndex = Math.max(0, VIEW_KEYS.indexOf(viewKey));
          var currentViewPosition = currentViewIndex + 1;
          var previousViewKey = VIEW_KEYS.length ? VIEW_KEYS[(currentViewIndex - 1 + VIEW_KEYS.length) % VIEW_KEYS.length] : viewKey;
          var nextViewKey = VIEW_KEYS.length ? VIEW_KEYS[(currentViewIndex + 1) % VIEW_KEYS.length] : viewKey;
          var overviewCollapsed = !!d.overviewCollapsed;
          var canvasZoom = Math.max(0.75, Math.min(1.5, Math.round((Number(d.canvasZoom) || 1) * 4) / 4));
          var canvasZoomPercent = Math.round(canvasZoom * 100);
          var viewsExploredCount = Object.keys(d.viewsExplored || {}).length;
          var atlasCompletion = VIEW_KEYS.length ? Math.min(100, Math.round((viewsExploredCount / VIEW_KEYS.length) * 100)) : 0;
          var selectedLabel = sel && sel.name ? sel.name : (t('stem.brainatlas.none_selected', 'None selected') || 'None selected');
          selectedLabel = String(selectedLabel || 'None selected');
          var showNtInquiry = viewKey === 'neurotransmitters' || !!d.showNtInquiry;
          var specialAtlasView = !!(currentView.isNT || currentView.isNeuron || currentView.isSynapse || currentView.isHomunculus || currentView.isVisualPathway || currentView.isLanguageNetwork || currentView.isBasalGanglia || currentView.isCranialWillis || currentView.isLimbicPapez || currentView.isStrokeTerritory || currentView.isCerebellumClinic || currentView.isBrainstemCross || currentView.isCsfHydro || currentView.isStim || currentView.isSleep || currentView.isEEG || currentView.isCrossLateral);
          // Neurochemistry diagrams (synapse release, neuron anatomy, synapse
          // growth) pack many labels into a tall vertical stack and were
          // cramped / overlapping. Give them a larger canvas so the diagram
          // spreads out; fontScale is REDUCED for these views (see ~line 571)
          // so the extra room becomes label SPACING, not bigger glyphs.
          // Safe: hit-testing is fraction-based [0,1], independent of canvas px.
          var neurochemView = !!(currentView.isNT || currentView.isNeuron || currentView.isSynapse);
          var wideAtlasView = !!(currentView.isSynapse || currentView.isLanguageNetwork || currentView.isVisualPathway || currentView.isBasalGanglia || currentView.isLimbicPapez || currentView.isCranialWillis || currentView.isStrokeTerritory || currentView.isCerebellumClinic || currentView.isBrainstemCross || currentView.isCsfHydro || currentView.isCrossLateral);
          var atlasW = currentView.isNeuron ? 1040 : (wideAtlasView ? 1040 : (currentView.isHomunculus ? 960 : (currentView.isNT ? 960 : (specialAtlasView ? 900 : 840))));
          var atlasH = currentView.isNeuron ? 880 : (currentView.isNT ? 820 : (wideAtlasView ? 780 : (currentView.isHomunculus ? 720 : (specialAtlasView ? 680 : 640))));
          // Use native fullscreen when available; otherwise fill the host frame safely.
          function setBrainAtlasFallbackFullscreen(el, enabled) {
            if (!el || typeof document === 'undefined') return;
            if (enabled) {
              if (el.__brainAtlasFullscreenFallback) return;
              el.__brainAtlasFullscreenFallback = true;
              el.classList.add('brainatlas-fullscreen-fallback');
              el.__brainAtlasFullscreenEsc = function (ev) {
                if (ev && ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setBrainAtlasFallbackFullscreen(el, false); }
              };
              document.addEventListener('keydown', el.__brainAtlasFullscreenEsc);
              el.__brainAtlasFullscreenCleanup = function () { setBrainAtlasFallbackFullscreen(el, false); };
              try { window.__alloBrainAtlasFullscreenCleanup = el.__brainAtlasFullscreenCleanup; } catch (e) {}
            } else {
              el.__brainAtlasFullscreenFallback = false;
              el.classList.remove('brainatlas-fullscreen-fallback');
              try { if (el.__brainAtlasFullscreenEsc) document.removeEventListener('keydown', el.__brainAtlasFullscreenEsc); } catch (e) {}
              el.__brainAtlasFullscreenEsc = null;
              var cleanup = el.__brainAtlasFullscreenCleanup;
              el.__brainAtlasFullscreenCleanup = null;
              try { if (window.__alloBrainAtlasFullscreenCleanup === cleanup) window.__alloBrainAtlasFullscreenCleanup = null; } catch (e) {}
            }
            try { window.dispatchEvent(new Event('resize')); } catch (e) {}
          }
          function toggleBrainAtlasFullscreen() {
            if (typeof document === 'undefined') return;
            var el = document.getElementById('brainatlas-canvas-fullscreen');
            if (!el) return;
            if (el.__brainAtlasFullscreenFallback) { setBrainAtlasFallbackFullscreen(el, false); return; }
            var realEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
            if (realEl) {
              var exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
              if (exit) { try { var ep = exit.call(document); if (ep && ep.catch) ep.catch(function () {}); } catch (e) {} }
              return;
            }
            var request = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
            if (request && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
              try {
                var pending = request.call(el);
                if (pending && pending.catch) pending.catch(function () { setBrainAtlasFallbackFullscreen(el, true); });
                return;
              } catch (e) {}
            }
            setBrainAtlasFallbackFullscreen(el, true);
          }
          function scrollToBrainAtlasDiagram() {
            if (typeof document === 'undefined') return;
            var el = document.getElementById('brainatlas-canvas-fullscreen');
            if (!el || typeof el.scrollIntoView !== 'function') return;
            try {
              el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            } catch (e) {
              el.scrollIntoView();
            }
            if (typeof announceToSR === 'function') announceToSR(t('stem.brainatlas.diagram_in_view', 'Brain Atlas diagram is now in view.') || 'Brain Atlas diagram is now in view.');
          }
          function setBrainAtlasZoom(nextZoom) {
            var normalized = Math.max(0.75, Math.min(1.5, Math.round((Number(nextZoom) || 1) * 4) / 4));
            upd('canvasZoom', normalized);
            var zoomMessage = (t('stem.brainatlas.diagram_zoom_set', 'Diagram zoom set to') || 'Diagram zoom set to') + ' ' + Math.round(normalized * 100) + ' percent.';
            if (typeof announceToSR === 'function') announceToSR(zoomMessage);
          }
          function stepBrainAtlasView(direction) {
            var nextKey = direction < 0 ? previousViewKey : nextViewKey;
            if (!nextKey || !VIEWS[nextKey]) return;
            upd('view', nextKey);
            upd('viewGroup', brainAtlasViewGroupFor(nextKey));
            upd('viewsExplored', (function () { var o = Object.assign({}, d.viewsExplored); o[nextKey] = true; return o; })());
            upd('selectedRegion', null); upd('quizMode', false); upd('search', ''); upd('showNtInquiry', nextKey === 'neurotransmitters');
            var nextPosition = VIEW_KEYS.indexOf(nextKey) + 1;
            if (typeof announceToSR === 'function') announceToSR((t('stem.brainatlas.fullscreen_view_changed', 'Fullscreen diagram') || 'Fullscreen diagram') + ' ' + nextPosition + ' of ' + VIEW_KEYS.length + ': ' + (VIEWS[nextKey].name || nextKey) + '.');
          }
          var missionText = sel
            ? t('stem.brainatlas.now_studying_region_detail', 'Now studying selected region details, function, related conditions, and damage patterns.')
            : currentView.desc;
          var quizScoreLabel = (d.quizCorrect || 0) + ' correct';
          var VIEW_GROUPS = [
            { id: 'atlas', label: t('stem.brainatlas.group_atlas', 'Atlas'), note: t('stem.brainatlas.group_atlas_note', 'Lobes, language, body maps, orientation, nerves, and vessels'), views: ['lateral', 'medial', 'superior', 'inferior', 'cranialNervesWillis', 'homunculus', 'visualPathway', 'languageNetwork'] },
            { id: 'clinical', label: t('stem.brainatlas.group_clinical', 'Clinical'), note: t('stem.brainatlas.group_clinical_note', 'Stroke territories, cerebellar signs, brainstem tracts, CSF flow, and case clues'), views: ['strokeTerritories', 'cerebellumClinic', 'brainstemCrossSection', 'csfHydrocephalus'] },
            { id: 'systems', label: t('stem.brainatlas.group_systems', 'Systems'), note: t('stem.brainatlas.group_systems_note', 'Cells, synapses, chemistry, memory, emotion, and movement loops'), views: ['neurotransmitters', 'neuron', 'synapses', 'basalGangliaLoop', 'limbicPapezLoop'] },
            { id: 'simulations', label: t('stem.brainatlas.group_simulations', 'Simulations'), note: t('stem.brainatlas.group_simulations_note', 'Stimulation, sleep, rhythms, and wiring'), views: ['stimulate', 'sleepStages', 'eegWaves', 'crossLateral'] }
          ];
          function brainAtlasViewGroupFor(key) {
            for (var gi = 0; gi < VIEW_GROUPS.length; gi++) {
              if (VIEW_GROUPS[gi].views.indexOf(key) >= 0) return VIEW_GROUPS[gi].id;
            }
            return 'atlas';
          }
          var activeViewGroupId = d.viewGroup || brainAtlasViewGroupFor(viewKey);
          var activeViewGroup = VIEW_GROUPS.filter(function (group) { return group.id === activeViewGroupId; })[0] || VIEW_GROUPS[0];
          var visibleViewKeys = activeViewGroup.views.filter(function (key) { return !!VIEWS[key]; });
          var detailMode = d.detailMode || 'plain';
          var showAdvancedDetail = detailMode === 'advanced';
          function brainAtlasShortText(text, limit) {
            var clean = String(text || '').replace(/\s+/g, ' ').trim();
            if (!limit || clean.length <= limit) return clean;
            return clean.slice(0, Math.max(0, limit - 3)).replace(/\s+\S*$/, '') + '...';
          }
          function brainAtlasPlainTakeaway(region) {
            if (!region) return t('stem.brainatlas.pick_a_region_takeaway', 'Pick a region to see its student takeaway.');
            return brainAtlasShortText(region.fn, 210);
          }
          function brainAtlasTeacherPrompt() {
            if (sel) return t('stem.brainatlas.teacher_prompt_selected', 'Ask students: What evidence from the function or damage pattern helps you identify this region?');
            if (currentView.isNT) return t('stem.brainatlas.teacher_prompt_nt', 'Ask students to change one neurotransmitter at a time, then name what changed and what stayed uncertain.');
            if (currentView.isNeuron) return t('stem.brainatlas.teacher_prompt_neuron', 'Ask students to trace one signal from dendrite to axon terminal using one sentence per step.');
            if (currentView.isSynapse) return t('stem.brainatlas.teacher_prompt_synapse', 'Ask students to explain how strengthening or pruning a synapse could change learning over time.');
            if (currentView.isHomunculus) return t('stem.brainatlas.teacher_prompt_homunculus', 'Ask students to choose one body part, then predict whether a nearby lesion would change movement, sensation, or both.');
            if (currentView.isVisualPathway) return t('stem.brainatlas.teacher_prompt_visual_pathway', 'Ask students to cover one pathway segment and predict the exact visual-field cut before revealing the card.');
            if (currentView.isLanguageNetwork) return t('stem.brainatlas.teacher_prompt_language_network', 'Ask students to trace one spoken or written word from input to comprehension to speech output, then predict the aphasia clue.');
            if (currentView.isBasalGanglia) return t('stem.brainatlas.teacher_prompt_basal_ganglia', 'Ask students to trace the GO and NO-GO loops, then predict how dopamine loss changes movement.');
            if (currentView.isLimbicPapez) return t('stem.brainatlas.teacher_prompt_limbic_papez', 'Ask students to trace one memory signal around Papez circuit, then explain how amygdala output changes the body.');
            if (currentView.isCranialWillis) return t('stem.brainatlas.teacher_prompt_cranial_willis', 'Ask students to pick one nerve or vessel, then name the bedside clue that would localize a lesion there.');
            if (currentView.isStrokeTerritory) return t('stem.brainatlas.teacher_prompt_stroke_territories', 'Give one stroke clue, then ask students to localize the likely vascular territory before checking the case cards.');
            if (currentView.isCerebellumClinic) return t('stem.brainatlas.teacher_prompt_cerebellum_clinic', 'Ask students whether the sign is midline, limb, vestibular, or artery-pattern before naming the cerebellar target.');
            if (currentView.isBrainstemCross) return t('stem.brainatlas.teacher_prompt_brainstem_cross', 'Ask students to identify the ipsilateral cranial nerve sign first, then pair it with the crossed body tract finding.');
            if (currentView.isCsfHydro) return t('stem.brainatlas.teacher_prompt_csf_hydro', 'Ask students to trace one CSF drop from production to reabsorption, then predict which ventricles enlarge when a blockage occurs.');
            if (currentView.isStim) return t('stem.brainatlas.teacher_prompt_stim', 'Ask students to predict the patient response first, then revise their reasoning after feedback.');
            if (currentView.isSleep) return t('stem.brainatlas.teacher_prompt_sleep', 'Ask students to compare two sleep stages and connect each to memory, attention, or recovery.');
            if (currentView.isEEG) return t('stem.brainatlas.teacher_prompt_eeg', 'Ask students to match a brain-wave pattern to a state, then explain the clue they used.');
            if (currentView.isCrossLateral) return t('stem.brainatlas.teacher_prompt_cross', 'Ask students to predict what the patient can say versus what the left hand can pick, then explain why the corpus callosum matters.');
            return t('stem.brainatlas.teacher_prompt_atlas', 'Ask students to choose one region, name its everyday job, and predict what might change if it were damaged.');
          }
          function brainAtlasCanvasSummary() {
            if (sel) return currentView.name + ': ' + sel.name + '. ' + brainAtlasShortText(sel.fn, 190);
            if (currentView.isNT) return t('stem.brainatlas.canvas_summary_nt', 'Neurotransmitter view showing synaptic release, receptor binding, and reuptake. Active scenario: ') + activeSim.name + '. ' + brainAtlasShortText(activeSim.desc, 150);
            if (currentView.isNeuron) return t('stem.brainatlas.canvas_summary_neuron', 'Neuron anatomy view showing dendrites, soma, axon hillock, myelin, nodes, terminals, and a spike-cycle decoder for threshold, sodium influx, potassium efflux, refractory recovery, and all-or-nothing firing.');
            if (currentView.isSynapse) return t('stem.brainatlas.canvas_summary_synapse', 'Synapse and development view showing how neural connections can strengthen, weaken, or be pruned through experience.');
            if (currentView.isHomunculus) return t('stem.brainatlas.canvas_summary_homunculus', 'Motor and sensory homunculus view showing primary motor cortex, primary somatosensory cortex, the central sulcus, and enlarged hand, face, and tongue representations.');
            if (currentView.isVisualPathway) return t('stem.brainatlas.canvas_summary_visual_pathway', 'Visual pathway view showing retina, optic nerve, optic chiasm, optic tract, LGN, optic radiations, V1, a field-cut decoder, and classic patterns such as bitemporal hemianopia, homonymous hemianopia, quadrantanopia, and macular sparing.');
            if (currentView.isLanguageNetwork) return t('stem.brainatlas.canvas_summary_language_network', 'Language network view showing auditory and visual word input, Wernicke comprehension, angular and supramarginal integration, arcuate fasciculus repetition, Broca speech planning, motor speech output, and classic aphasia clues.');
            if (currentView.isBasalGanglia) return t('stem.brainatlas.canvas_summary_basal_ganglia', 'Basal ganglia loop view showing direct GO and indirect NO-GO pathways, GPi/SNr thalamic braking, STN excitation, dopamine modulation from substantia nigra pars compacta, and a movement-disorder decoder for Parkinson disease, Huntington chorea, STN hemiballismus, and dyskinesia.');
            if (currentView.isLimbicPapez) return t('stem.brainatlas.canvas_summary_limbic_papez', 'Limbic and Papez loop view showing hippocampus, fornix, mammillary bodies, mammillothalamic tract, anterior thalamus, cingulate, cingulum, entorhinal cortex, amygdala, hypothalamus, prefrontal regulation, and a memory-emotion decoder for new amnesia, confabulation, fear tagging, and poor top-down regulation.');
            if (currentView.isCranialWillis) return t('stem.brainatlas.canvas_summary_cranial_willis', 'Cranial nerves and Circle of Willis view showing inferior brain anatomy, CN I, II, III, V, VI, VII/VIII, IX/X/XI, XII, AComm/ACA, PComm/ICA, basilar/vertebral arteries, and a bedside clue decoder for pupil-involving CN III palsy, bitemporal field loss, bulbar symptoms, and thunderclap headache.');
            if (currentView.isStrokeTerritory) return t('stem.brainatlas.canvas_summary_stroke_territories', 'Stroke territories view showing ACA, MCA superior, MCA inferior, PCA, deep lacunar, watershed, and posterior circulation maps with case cards for leg-predominant weakness, Broca aphasia with face-arm weakness, fluent aphasia or neglect, and homonymous visual-field loss.');
            if (currentView.isCerebellumClinic) return t('stem.brainatlas.canvas_summary_cerebellum_clinic', 'Cerebellum clinic view showing vermis, cerebellar hemispheres, flocculonodular vestibular zone, deep nuclei, PICA, AICA, SCA, and case cards for wide gait, finger overshoot, vertigo with nystagmus, and hoarse ataxia.');
            if (currentView.isBrainstemCross) return t('stem.brainatlas.canvas_summary_brainstem_cross', 'Brainstem cross-section view showing midbrain, pons, medulla, corticospinal tract, medial lemniscus, spinothalamic tract, cranial nerve nuclei, and a crossed-findings decoder for localizing ipsilateral cranial nerve signs with contralateral body deficits.');
            if (currentView.isCsfHydro) return t('stem.brainatlas.canvas_summary_csf_hydro', 'CSF flow and hydrocephalus view showing choroid plexus production, lateral ventricles, third ventricle, cerebral aqueduct, fourth ventricle, subarachnoid space, arachnoid granulation reabsorption, and a hydrocephalus decoder for obstructive, communicating, normal-pressure, and raised-pressure patterns.');
            if (currentView.isStim) return t('stem.brainatlas.canvas_summary_stim', 'Stimulation Lab view showing a Penfield-style response map for motor movement, sensory tingling, visual flashes, auditory sounds, language disruption, memory-emotion responses, autonomic body-state changes, and quiet association cortex while the current electrode target pulses.');
            if (currentView.isSleep) return t('stem.brainatlas.canvas_summary_sleep', 'Sleep-stage view showing an animated overnight hypnogram, repeated 90-minute cycles, early-night N3 slow-wave sleep, later-night REM periods, N2 spindle sleep, and a sleep-architecture decoder for recovery, memory, emotion, attention, and fragmented sleep.');
            if (currentView.isEEG) return (t('stem.brainatlas.canvas_summary_eeg_active', 'EEG rhythm view comparing delta, theta, alpha, beta, and gamma waves across different brain states. Active state: ') || 'EEG rhythm view comparing delta, theta, alpha, beta, and gamma waves across different brain states. Active state: ') + activeEegMode.label + '. ' + activeEegReadout.dominant + '. ' + activeEegReadout.caution;
            if (currentView.isCrossLateral) return t('stem.brainatlas.canvas_summary_cross', 'Cross-lateral wiring view showing motor, sensory, and visual crossing, language lateralization, corpus callosum transfer between hemispheres, and a split-brain fixation task where left visual field -> right hemisphere information cannot be verbally named but the left hand can pick the object.');
            return currentView.name + ': ' + brainAtlasShortText(currentView.desc, 170) + ' ' + filtered.length + ' selectable targets are available in this view.';
          }
          var teacherPrompt = brainAtlasTeacherPrompt();
          var canvasSummary = brainAtlasCanvasSummary();
          var GUIDED_ROUTES = [
            { id: 'lobes', view: 'lateral', badge: t('stem.brainatlas.route_badge_atlas', 'Atlas'), title: t('stem.brainatlas.route_lobes_title', 'Map the lobes'), copy: t('stem.brainatlas.route_lobes_copy', 'Start with the side view and connect each lobe to everyday function.'), color: '#7c3aed' },
            { id: 'deep', view: 'medial', badge: t('stem.brainatlas.route_badge_deep', 'Deep'), title: t('stem.brainatlas.route_deep_title', 'Find hidden systems'), copy: t('stem.brainatlas.route_deep_copy', 'Trace memory, emotion, homeostasis, and midline structures.'), color: '#0f766e' },
            { id: 'base', view: 'cranialNervesWillis', badge: t('stem.brainatlas.route_badge_base', 'Base'), title: t('stem.brainatlas.route_cranial_willis_title', 'Map nerves and vessels'), copy: t('stem.brainatlas.route_cranial_willis_copy', 'Use the underside map to connect nerve exits, blood supply, and classic lesion clues.'), color: '#dc2626' },
            { id: 'stroke', view: 'strokeTerritories', badge: t('stem.brainatlas.route_badge_stroke', 'Stroke'), title: t('stem.brainatlas.route_stroke_title', 'Localize a stroke'), copy: t('stem.brainatlas.route_stroke_copy', 'Match deficit patterns to ACA, MCA, PCA, lacunar, watershed, and posterior circulation territories.'), color: '#ef4444' },
            { id: 'cerebellar', view: 'cerebellumClinic', badge: t('stem.brainatlas.route_badge_cerebellum', 'Cerebellum'), title: t('stem.brainatlas.route_cerebellum_title', 'Read ataxia clues'), copy: t('stem.brainatlas.route_cerebellum_copy', 'Separate vermis, limb hemispheres, vestibular signs, and PICA/AICA/SCA patterns.'), color: '#16a34a' },
            { id: 'brainstem', view: 'brainstemCrossSection', badge: t('stem.brainatlas.route_badge_brainstem', 'Brainstem'), title: t('stem.brainatlas.route_brainstem_title', 'Decode crossed findings'), copy: t('stem.brainatlas.route_brainstem_copy', 'Pair ipsilateral cranial nerve signs with contralateral body tract findings.'), color: '#2563eb' },
            { id: 'csf', view: 'csfHydrocephalus', badge: t('stem.brainatlas.route_badge_csf', 'CSF'), title: t('stem.brainatlas.route_csf_title', 'Trace CSF flow'), copy: t('stem.brainatlas.route_csf_copy', 'Follow ventricular flow, aqueduct bottlenecks, reabsorption, and hydrocephalus patterns.'), color: '#0284c7' },
            { id: 'bodymap', view: 'homunculus', badge: t('stem.brainatlas.route_badge_map', 'Map'), title: t('stem.brainatlas.route_homunculus_title', 'Map the body'), copy: t('stem.brainatlas.route_homunculus_copy', 'Compare motor output and sensory input across the cortical homunculus.'), color: '#0ea5e9' },
            { id: 'vision', view: 'visualPathway', badge: t('stem.brainatlas.route_badge_vision', 'Vision'), title: t('stem.brainatlas.route_visual_pathway_title', 'Trace vision'), copy: t('stem.brainatlas.route_visual_pathway_copy', 'Follow retinal fibers through the chiasm and match each lesion to its field cut.'), color: '#2563eb' },
            { id: 'language', view: 'languageNetwork', badge: t('stem.brainatlas.route_badge_language', 'Language'), title: t('stem.brainatlas.route_language_network_title', 'Map language'), copy: t('stem.brainatlas.route_language_network_copy', 'Trace hearing, reading, comprehension, repetition, and speech output across the dominant-hemisphere network.'), color: '#7c3aed' },
            { id: 'movement', view: 'basalGangliaLoop', badge: t('stem.brainatlas.route_badge_movement', 'Movement'), title: t('stem.brainatlas.route_basal_ganglia_title', 'Balance GO and NO-GO'), copy: t('stem.brainatlas.route_basal_ganglia_copy', 'Trace direct, indirect, and dopamine pathways that select movement.'), color: '#14b8a6' },
            { id: 'memory', view: 'limbicPapezLoop', badge: t('stem.brainatlas.route_badge_memory', 'Memory'), title: t('stem.brainatlas.route_limbic_papez_title', 'Link memory and emotion'), copy: t('stem.brainatlas.route_limbic_papez_copy', 'Trace Papez circuit and compare it with amygdala-driven body responses.'), color: '#f59e0b' },
            { id: 'signals', view: 'neuron', badge: t('stem.brainatlas.route_badge_cells', 'Cells'), title: t('stem.brainatlas.route_signals_title', 'Follow a signal'), copy: t('stem.brainatlas.route_signals_copy', 'Zoom from neuron anatomy into firing, myelin, and synaptic flow.'), color: '#d97706' },
            { id: 'rhythms', view: 'eegWaves', badge: t('stem.brainatlas.route_badge_rhythms', 'Rhythms'), title: t('stem.brainatlas.route_rhythms_title', 'Read brain waves'), copy: t('stem.brainatlas.route_rhythms_copy', 'Compare delta through gamma and connect waves to sleep and attention.'), color: '#be185d' },
            { id: 'crossing', view: 'crossLateral', badge: t('stem.brainatlas.route_badge_wiring', 'Wiring'), title: t('stem.brainatlas.route_crossing_title', 'Trace left vs right'), copy: t('stem.brainatlas.route_crossing_copy', 'See why one hemisphere affects the opposite side of the body and why the corpus callosum lets the halves share information.'), color: '#dc2626' }
          ];
          // Patient Simulator: an AI patient roleplays the real effect of a hidden
          // stimulation; the student guesses the region. Grounded in STIM_SCENARIOS.
          function startPatient() {
            if (!aiHintsEnabled || typeof callGemini !== 'function') return;
            var idx = (d.patientIdx || 0) % STIM_SCENARIOS.length;
            var sc = STIM_SCENARIOS[idx];
            var effect = sc.options[sc.correctIdx];
            var opts = [];
            for (var k = 1; k <= 3; k++) opts.push(STIM_SCENARIOS[(idx + k) % STIM_SCENARIOS.length].target);
            opts.push(sc.target);
            var rot = idx % 4; opts = opts.slice(rot).concat(opts.slice(0, rot));
            upd('patientOpts', opts); upd('patientCorrect', sc.target); upd('patientGuess', null);
            upd('patientLoading', true); upd('patientText', '');
            var prompt = 'You are roleplaying a calm, cooperative patient in an awake brain-surgery TEACHING simulation for students. The surgeon just gently stimulated one spot, and the real effect you feel is: "' + effect + '". In 1 to 2 short sentences, IN CHARACTER as the patient, say out loud what you suddenly notice or do. Do NOT name any brain region, lobe, or medical term, and do NOT explain the science. Keep it calm, friendly, and suitable for children. Plain prose only.';
            callGemini(prompt, false, false, 0.7).then(function (resp) {
              upd('patientText', ((resp || '').trim()) || 'I feel something, but it is hard to put into words.');
              upd('patientLoading', false);
            }).catch(function () { upd('patientText', 'The simulator is not available right now.'); upd('patientLoading', false); });
          }
          function onBrainKey(e) {
            var tgt = e.target || {};
            var tn = (tgt.tagName || '').toUpperCase();
            if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
            var k = e.key;
            if (k >= '1' && k <= '9') {
              var idx = parseInt(k, 10) - 1;
              if (VIEW_KEYS[idx]) {
                e.preventDefault();
                var vk = VIEW_KEYS[idx];
                upd('view', vk); upd('viewGroup', brainAtlasViewGroupFor(vk)); upd('viewsExplored', (function () { var o = Object.assign({}, d.viewsExplored); o[vk] = true; return o; })()); upd('selectedRegion', null); upd('quizMode', false); upd('search', ''); upd('showNtInquiry', vk === 'neurotransmitters');
                if (typeof announceToSR === 'function') announceToSR('View ' + (idx + 1) + ': ' + (VIEWS[vk].name || vk) + '.');
              }
            } else if (k === 'q' || k === 'Q') {
              e.preventDefault();
              upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null);
              if (typeof announceToSR === 'function') announceToSR(d.quizMode ? 'Quiz off.' : 'Quiz on.');
            } else if (k === 'Escape') {
              if (d.selectedRegion) { e.preventDefault(); upd('selectedRegion', null); if (typeof announceToSR === 'function') announceToSR('Region deselected.'); }
              else if (d.quizMode) { e.preventDefault(); upd('quizMode', false); if (typeof announceToSR === 'function') announceToSR('Quiz closed.'); }
            } else if (k === '/') {
              e.preventDefault();
              var searchInput = document.querySelector('input[placeholder*="Search regions"]');
              if (searchInput) searchInput.focus();
            }
          }

          return React.createElement("div", {
              className: "brainatlas-tool-shell mx-auto animate-in fade-in duration-200",
              role: "region",
              "data-brainatlas-tool": "true",
              "aria-label": "Brain Atlas. Keyboard shortcuts: 1 through " + VIEW_KEYS.length + " switch views, Q toggles quiz, / focuses search, Escape closes region detail.",
              tabIndex: 0,
              onKeyDown: onBrainKey
            },

            // Header

            React.createElement("div", {
              className: "brainatlas-topbar",
              "data-brainatlas-topbar": "true"
            },
              React.createElement("button", {
                type: "button",
                onClick: function () { setStemLabTool(null); },
                className: "brainatlas-topbar-back active:scale-[0.97]",
                'aria-label': t('stem.brainatlas.back_to_tools', 'Back to tools'),
                title: t('stem.brainatlas.back_to_tools', 'Back to tools')
              }, React.createElement(ArrowLeft, { size: 18 })),
              React.createElement("div", { className: "brainatlas-topbar-copy" },
                React.createElement("p", { className: "brainatlas-topbar-eyebrow" }, t('stem.brainatlas.stem_learning_lab', 'STEM learning lab') || 'STEM learning lab'),
                React.createElement("h3", { className: "brainatlas-topbar-title" }, t('stem.brainatlas.brain_atlas', "\uD83E\uDDE0 Brain Atlas")),
                React.createElement("p", { className: "brainatlas-topbar-subtitle" }, currentView.desc)
              ),
              React.createElement("button", {
                type: "button",
                className: "brainatlas-topbar-jump",
                "data-brainatlas-jump-to-diagram": "true",
                "aria-label": t('stem.brainatlas.view_large_diagram', 'View the large Brain Atlas diagram') || 'View the large Brain Atlas diagram',
                title: t('stem.brainatlas.view_large_diagram', 'View the large Brain Atlas diagram') || 'View the large Brain Atlas diagram',
                onClick: scrollToBrainAtlasDiagram
              },
                React.createElement("span", null, t('stem.brainatlas.view_diagram', 'View diagram') || 'View diagram'),
                React.createElement("span", { "aria-hidden": "true" }, '\u2193')
              )
            ),

            React.createElement("section", {
              className: "brainatlas-mission",
              "data-brainatlas-mission": "true",
              "data-brainatlas-overview-collapsed": overviewCollapsed ? "true" : "false"
            },
              React.createElement("div", { className: "brainatlas-mission-inner" },
                React.createElement("div", null,
                  React.createElement("p", { className: "brainatlas-mission-kicker" }, t('stem.brainatlas.neural_systems_lab', 'Neural systems lab')),
                  React.createElement("div", { className: "brainatlas-mission-title-row" },
                    React.createElement("h2", { className: "brainatlas-mission-title" }, currentView.name),
                    React.createElement("button", {
                      type: "button",
                      className: "brainatlas-overview-toggle",
                      "data-brainatlas-overview-toggle": "true",
                      "aria-expanded": overviewCollapsed ? "false" : "true",
                      "aria-label": overviewCollapsed ? (t('stem.brainatlas.expand_overview', 'Expand overview') || 'Expand overview') : (t('stem.brainatlas.collapse_overview', 'Collapse overview') || 'Collapse overview'),
                      title: overviewCollapsed ? (t('stem.brainatlas.expand_overview', 'Expand overview') || 'Expand overview') : (t('stem.brainatlas.collapse_overview', 'Collapse overview') || 'Collapse overview'),
                      onClick: function () { var nextCollapsed = !overviewCollapsed; upd('overviewCollapsed', nextCollapsed); if (typeof announceToSR === 'function') announceToSR(nextCollapsed ? 'Brain Atlas overview collapsed.' : 'Brain Atlas overview expanded.'); }
                    },
                      React.createElement("span", null, overviewCollapsed ? (t('stem.brainatlas.expand_overview', 'Expand overview') || 'Expand overview') : (t('stem.brainatlas.collapse_overview', 'Collapse overview') || 'Collapse overview')),
                      React.createElement("span", { "aria-hidden": "true" }, overviewCollapsed ? '+' : '\u2212')
                    )
                  ),
                  React.createElement("p", { className: "brainatlas-mission-copy" }, missionText),
                  React.createElement("div", { className: "brainatlas-action-row", role: "group", "aria-label": t('stem.brainatlas.brain_atlas_modes', 'Brain atlas modes') },
                    React.createElement("button", {
                      onClick: function () {
                        var nextAtlasView = brainAtlasViewGroupFor(viewKey) === 'atlas' ? viewKey : 'lateral';
                        if (nextAtlasView !== viewKey) {
                          upd('view', nextAtlasView);
                          upd('viewsExplored', (function () { var o = Object.assign({}, d.viewsExplored); o[nextAtlasView] = true; return o; })());
                        }
                        upd('viewGroup', 'atlas');
                        upd('quizMode', false); upd('selectedRegion', null); upd('search', ''); upd('showNtInquiry', false);
                      },
                      className: "px-3 py-1.5 text-xs font-black border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors active:scale-[0.97]"
                    }, t('stem.brainatlas.atlas_view', 'Atlas view')),
                    React.createElement("button", {
                      onClick: function () {
                        upd('view', 'neurotransmitters');
                        upd('viewGroup', 'systems');
                        upd('viewsExplored', (function () { var o = Object.assign({}, d.viewsExplored); o.neurotransmitters = true; return o; })());
                        upd('selectedRegion', null); upd('quizMode', false); upd('search', ''); upd('showNtInquiry', true);
                      },
                      "aria-pressed": showNtInquiry ? "true" : "false",
                      className: "px-3 py-1.5 text-xs font-black border transition-colors active:scale-[0.97] " + (showNtInquiry ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100')
                    }, t('stem.brainatlas.neurochemistry_lab', 'Neurochemistry')),
                    React.createElement("button", {
                      onClick: function () { upd('fmOpen', !d.fmOpen); },
                      "aria-pressed": d.fmOpen ? "true" : "false",
                      className: "px-3 py-1.5 text-xs font-black border transition-colors active:scale-[0.97] " + (d.fmOpen ? 'border-violet-500 bg-violet-600 text-white' : 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100')
                    }, d.fmOpen ? t('stem.brainatlas.hide_function_match', 'Hide Function Match') : t('stem.brainatlas.function_match_2', 'Function Match')),
                    React.createElement("button", {
                      onClick: function () { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },
                      "aria-pressed": d.quizMode ? "true" : "false",
                      className: "px-3 py-1.5 text-xs font-black border transition-colors active:scale-[0.97] " + (d.quizMode ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100')
                    }, d.quizMode ? t('stem.brainatlas.quiz_active', 'Quiz active') : t('stem.brainatlas.start_quiz', 'Start quiz'))
                  ),
                  React.createElement("div", {
                    className: "brainatlas-mode-groups",
                    role: "group",
                    "aria-label": t('stem.brainatlas.view_group_picker', 'Brain Atlas view groups'),
                    "data-brainatlas-mode-groups": "true",
                    "data-brainatlas-active-group": activeViewGroup.id
                  },
                    VIEW_GROUPS.map(function (group) {
                      var groupActive = activeViewGroup.id === group.id;
                      return React.createElement("button", {
                        key: group.id,
                        type: "button",
                        className: "brainatlas-group-button",
                        "aria-pressed": groupActive ? "true" : "false",
                        onClick: function () {
                          var nextView = group.views.indexOf(viewKey) >= 0 ? viewKey : group.views[0];
                          upd('viewGroup', group.id);
                          if (nextView && nextView !== viewKey) {
                            upd('view', nextView);
                            upd('viewsExplored', (function () { var o = Object.assign({}, d.viewsExplored); o[nextView] = true; return o; })());
                            upd('selectedRegion', null);
                            upd('quizMode', false);
                            upd('search', '');
                            upd('showNtInquiry', nextView === 'neurotransmitters');
                          }
                        }
                      },
                        React.createElement("strong", null, group.label),
                        React.createElement("span", null, group.note)
                      );
                    })
                  ),
                  React.createElement("section", {
                    className: "brainatlas-route-library",
                    "data-brainatlas-route-library": "true",
                    "aria-labelledby": "brainatlas-route-library-title"
                  },
                    React.createElement("div", { className: "brainatlas-route-library-head" },
                      React.createElement("div", { className: "brainatlas-route-library-copy" },
                        React.createElement("p", { className: "brainatlas-route-eyebrow" }, t('stem.brainatlas.guided_exploration', 'Guided exploration') || 'Guided exploration'),
                        React.createElement("h3", { id: "brainatlas-route-library-title", className: "brainatlas-route-library-title" }, t('stem.brainatlas.learning_paths', 'Learning paths') || 'Learning paths'),
                        React.createElement("p", { className: "brainatlas-route-library-note" }, t('stem.brainatlas.learning_paths_note', 'Choose a path or scroll sideways to preview every diagram.') || 'Choose a path or scroll sideways to preview every diagram.')
                      ),
                      React.createElement("span", { className: "brainatlas-route-count" }, GUIDED_ROUTES.length + ' ' + (t('stem.brainatlas.paths', 'paths') || 'paths'))
                    ),
                    React.createElement("div", {
                      className: "brainatlas-route-grid",
                      "data-brainatlas-route-grid": "true",
                      "aria-label": t('stem.brainatlas.available_learning_paths', 'Available learning paths') || 'Available learning paths'
                    },
                      GUIDED_ROUTES.map(function (route) {
                        var routeActive = viewKey === route.view;
                        return React.createElement("button", {
                          key: route.id,
                          type: "button",
                          "aria-pressed": routeActive ? "true" : "false",
                          "data-brainatlas-route-card": "true",
                          "data-brainatlas-route-active": routeActive ? "true" : "false",
                          className: "brainatlas-route-card",
                          onClick: function () {
                            upd('view', route.view);
                            upd('viewGroup', brainAtlasViewGroupFor(route.view));
                            upd('viewsExplored', (function () { var o = Object.assign({}, d.viewsExplored); o[route.view] = true; return o; })());
                            upd('selectedRegion', null);
                            upd('quizMode', false);
                            upd('search', '');
                            upd('showNtInquiry', route.view === 'neurotransmitters');
                          },
                          style: routeActive ? { borderColor: route.color, background: route.color + '0d' } : {}
                        },
                          React.createElement("span", { className: "brainatlas-route-badge", style: { color: route.color, background: route.color + '17' } }, route.badge),
                          React.createElement("p", { className: "brainatlas-route-title" }, route.title),
                          React.createElement("p", { className: "brainatlas-route-copy" }, route.copy),
                          React.createElement("span", { className: "brainatlas-route-open", "aria-hidden": "true" }, (t('stem.brainatlas.open_diagram', 'Open diagram') || 'Open diagram') + ' \u2192')
                        );
                      })
                    )
                  )
                ),
                React.createElement("div", { className: "brainatlas-metric-grid", "aria-label": t('stem.brainatlas.brain_atlas_progress_summary', 'Brain atlas progress summary') },
                  React.createElement("div", { className: "brainatlas-metric" },
                    React.createElement("p", { className: "brainatlas-metric-label" }, t('stem.brainatlas.views_explored', 'Views explored')),
                    React.createElement("p", { className: "brainatlas-metric-value" }, viewsExploredCount + " / " + VIEW_KEYS.length),
                    React.createElement("p", { className: "brainatlas-metric-note" }, atlasCompletion + "% map coverage")
                  ),
                  React.createElement("div", { className: "brainatlas-metric" },
                    React.createElement("p", { className: "brainatlas-metric-label" }, t('stem.brainatlas.current_targets', 'Current targets')),
                    React.createElement("p", { className: "brainatlas-metric-value" }, filtered.length),
                    React.createElement("p", { className: "brainatlas-metric-note" }, t('stem.brainatlas.regions_in_this_view', 'regions in this view'))
                  ),
                  React.createElement("div", { className: "brainatlas-metric" },
                    React.createElement("p", { className: "brainatlas-metric-label" }, t('stem.brainatlas.quiz_score', 'Quiz score')),
                    React.createElement("p", { className: "brainatlas-metric-value" }, quizScoreLabel),
                    React.createElement("p", { className: "brainatlas-metric-note" }, t('stem.brainatlas.damage_pattern_practice', 'damage-pattern practice'))
                  ),
                  React.createElement("div", { className: "brainatlas-metric" },
                    React.createElement("p", { className: "brainatlas-metric-label" }, t('stem.brainatlas.selected', 'Selected')),
                    React.createElement("p", { className: "brainatlas-metric-value", style: { fontSize: selectedLabel.length > 18 ? 13 : 18 } }, selectedLabel),
                    React.createElement("p", { className: "brainatlas-metric-note" }, sel ? t('stem.brainatlas.detail_panel_ready', 'detail panel ready') : t('stem.brainatlas.pick_a_region', 'pick a region on the atlas'))
                  )
                )
              )
            ),

            // \u2550\u2550 NEUROTRANSMITTER INQUIRY widget (H7b'') \u2550\u2550
            (function() {
              var iqDefaults = { dopamine: 50, serotonin: 50, gaba: 50, glutamate: 50, norepi: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              var iqSaved = d.ntInquiry && typeof d.ntInquiry === 'object' ? d.ntInquiry : {};
              var iq = Object.assign({}, iqDefaults, iqSaved);
              if (!Array.isArray(iq.log)) iq.log = [];
              function setIQ(patch) { upd('ntInquiry', Object.assign({}, iq, patch)); }
              function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
              var arousal = (iq.norepi + iq.glutamate - iq.gaba) / 3;
              var mood = (iq.serotonin + iq.dopamine * 0.5 - iq.norepi * 0.3) / 2;
              var attention = (iq.dopamine + iq.norepi - iq.gaba * 0.3) / 2.5;
              var anxiety = (iq.norepi + iq.glutamate - iq.gaba - iq.serotonin * 0.4) / 3;
              var state = anxiety > 35 ? 'anxious' : arousal > 50 && mood < 20 ? 'agitated' : mood > 50 && attention > 40 ? 'focused' : mood < 5 && attention < 15 ? 'depressed' : 'baseline';
              // State labels are reframed in conditional/model-bound language: the
              // simple monoamine framing predicts these associations, but the actual
              // neurobiology of mood, anxiety, and attention is contested (Moncrieff
              // et al. 2022 for the serotonin-depression claim; receptor sensitivity
              // and network dynamics matter as much or more than absolute levels).
              var sm = ({
                anxious: { label: t('stem.brainatlas.monoamine_model_anxious_hyperaroused_p', 'Monoamine model: anxious / hyperaroused profile'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: t('stem.brainatlas.in_the_simplified_monoamine_framing_lo', 'In the simplified monoamine framing, low GABA relative to norepi + glutamate is associated with racing thoughts, restlessness, hypervigilance. Real anxiety has many causes (receptor sensitivity, cortisol axis, context) — this is one toy mapping.') },
                agitated: { label: t('stem.brainatlas.monoamine_model_agitated_profile', 'Monoamine model: agitated profile'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: t('stem.brainatlas.high_arousal_low_mood_in_the_toy_mappi', 'High arousal + low mood in the toy mapping. Patterns labeled "agitated" in clinical settings can come from many sources including medication side-effects, withdrawal, and mixed mood states.') },
                focused: { label: t('stem.brainatlas.monoamine_model_well_regulated_profile', 'Monoamine model: well-regulated profile'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: t('stem.brainatlas.dopamine_serotonin_in_mid_range_with_m', 'Dopamine + serotonin in mid-range with modest arousal — the toy mapping calls this on-task / engaged. Real attention regulation depends on prefrontal-striatal circuits, not just transmitter levels.') },
                depressed: { label: t('stem.brainatlas.monoamine_model_low_energy_profile', 'Monoamine model: low-energy profile'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: t('stem.brainatlas.low_da_ne_5_ht_in_the_toy_mapping_is_h', 'Low DA + NE + 5-HT in the toy mapping is historically associated with anhedonia and fatigue. The "chemical imbalance" theory of depression is contested in current research (see Moncrieff et al., 2022); receptor sensitivity, network dynamics, and life context matter as much.') },
                baseline: { label: t('stem.brainatlas.monoamine_model_baseline_neutral', 'Monoamine model: baseline / neutral'), color: '#94a3b8', bg: '#1e293b', border: '#475569', desc: t('stem.brainatlas.no_single_system_dominates_most_everyd', 'No single system dominates. Most everyday states live here in the toy mapping.') }
              })[state];
              var nts = [
                { k: 'dopamine', label: t('stem.brainatlas.dopamine', 'Dopamine'), short: 'DA', col: '#fb923c' },
                { k: 'serotonin', label: t('stem.brainatlas.serotonin', 'Serotonin'), short: '5-HT', col: '#22d3ee' },
                { k: 'gaba', label: 'GABA', short: 'GABA', col: '#a78bfa' },
                { k: 'glutamate', label: t('stem.brainatlas.glutamate', 'Glutamate'), short: 'Glu', col: '#f87171' },
                { k: 'norepi', label: t('stem.brainatlas.norepinephrine', 'Norepinephrine'), short: 'NE', col: '#facc15' }
              ];
              if (!showNtInquiry) return null;
              // SVG: bars
              return React.createElement('div', { className: 'brainatlas-nt-inquiry p-3 mb-3', "data-brainatlas-nt-inquiry": "true", style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
                React.createElement('h4', { className: 'text-xs font-black uppercase tracking-wider mb-1', style: { color: sm.color } }, t('stem.brainatlas.neurotransmitter_inquiry_predict_the_s', '\uD83D\uDD2C Neurotransmitter Inquiry \u2014 Predict the State')),
                React.createElement('p', { className: 'text-[10px] opacity-85 mb-2 leading-snug' }, t('stem.brainatlas.set_five_neurotransmitter_levels_predi', 'Set five neurotransmitter levels. Predict the felt state before reading it. No score, no reveal \u2014 and no clinical interpretation.')),
                React.createElement('div', { className: 'inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2', style: { background: sm.color, color: '#000' } }, sm.label),
                React.createElement('p', { className: 'text-[10px] opacity-80 mb-2' }, sm.desc),
                React.createElement('div', { className: 'grid grid-cols-4 gap-1 mb-2' },
                  [
                    { label: t('stem.brainatlas.arousal', 'Arousal'), val: arousal.toFixed(0) },
                    { label: t('stem.brainatlas.mood', 'Mood'), val: mood.toFixed(0) },
                    { label: t('stem.brainatlas.attention', 'Attention'), val: attention.toFixed(0) },
                    { label: t('stem.brainatlas.anxiety_idx', 'Anxiety idx'), val: anxiety.toFixed(0) }
                  ].map(function(m) {
                    return React.createElement('div', { key: m.label, className: 'p-1 rounded text-center', style: { background: '#0a0a1a', border: '1px solid ' + sm.border } },
                      React.createElement('div', { className: 'text-[8px] opacity-60' }, m.label),
                      React.createElement('div', { className: 'text-[11px] font-bold font-mono', style: { color: sm.color } }, m.val)
                    );
                  })
                ),
                React.createElement('svg', { width: '100%', height: 140, viewBox: '0 0 320 140', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
                  React.createElement('line', { x1: 30, y1: 110, x2: 310, y2: 110, stroke: '#1e293b' }),
                  nts.map(function(nt, i) {
                    var x = 50 + i * 55;
                    var hh = (iq[nt.k] / 100) * 90;
                    return React.createElement('g', { key: nt.k },
                      React.createElement('rect', { x: x, y: 110 - hh, width: 40, height: hh, fill: nt.col, opacity: 0.85 }),
                      React.createElement('text', { x: x + 20, y: 125, fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle', fontWeight: 700 }, nt.short),
                      React.createElement('text', { x: x + 20, y: 135, fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' }, iq[nt.k])
                    );
                  }),
                  React.createElement('text', { x: 6, y: 28, fill: '#64748b', fontSize: 8 }, '100'),
                  React.createElement('text', { x: 6, y: 110, fill: '#94a3b8', fontSize: 8 }, '0')
                ),
                React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2 mb-2' },
                  nts.map(function(nt) {
                    return React.createElement('label', { key: nt.k, className: 'text-[10px]' },
                      React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, nt.label), React.createElement('span', { className: 'font-mono font-bold', style: { color: nt.col } }, iq[nt.k])),
                      React.createElement('input', { type: 'range', min: 0, max: 100, step: 5, value: iq[nt.k], onChange: function(e) { setKey(nt.k, parseInt(e.target.value, 10)); }, className: 'w-full' })
                    );
                  })
                ),
                React.createElement('div', { className: 'flex gap-2 mb-2' },
                  React.createElement('button', { onClick: function() {
                    var t = new Date().toISOString().slice(11, 19);
                    setIQ({ log: iq.log.concat([{ t: t, da: iq.dopamine, sh: iq.serotonin, ga: iq.gaba, glu: iq.glutamate, ne: iq.norepi, state: sm.label }]) });
                  }, className: 'flex-1 px-2 py-1 rounded text-[10px] font-bold', style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, t('stem.brainatlas.log_this_profile', '\uD83D\uDCCB Log this profile')),
                  React.createElement('button', { onClick: function() { setIQ({ dopamine: 50, serotonin: 50, gaba: 50, glutamate: 50, norepi: 50 }); }, className: 'px-2 py-1 rounded text-[10px]', style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.brainatlas.reset', 'Reset'))
                ),
                iq.log.length > 0 && React.createElement('div', { className: 'p-1.5 rounded text-[9px] font-mono mb-2', style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                  iq.log.slice(-5).map(function(e, i) { return React.createElement('div', { key: i }, e.t + '  ' + e.state + ' \u00B7 DA' + e.da + ' 5HT' + e.sh + ' GABA' + e.ga + ' Glu' + e.glu + ' NE' + e.ne); })
                ),
                React.createElement('label', { className: 'block text-[10px] font-bold opacity-85 mb-1' }, t('stem.brainatlas.your_hypothesis_which_two_neurotransmi', 'Your hypothesis (which two neurotransmitters most strongly trade off in shaping affect?)')),
                React.createElement('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: t('stem.brainatlas.e_g_gaba_and_glutamate_are_functional_', 'e.g., GABA and glutamate are functional opposites (inhibitory vs excitatory)...'), className: 'w-full p-1.5 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded text-[10px] font-bold mb-2', style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.brainatlas.i_m_stuck_show_open_questions', "\uD83E\uDD14 I'm stuck \u2014 show open questions")),
                iq.stuckRevealed && React.createElement('div', { className: 'p-2 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                  React.createElement('div', { className: 'font-bold mb-1', style: { color: sm.color } }, t('stem.brainatlas.open_questions_no_answer_key', 'Open questions (no answer key)')),
                  React.createElement('ul', { className: 'pl-4 m-0' },
                    React.createElement('li', null, t('stem.brainatlas.gaba_and_glutamate_are_inhibitory_exci', 'GABA and glutamate are inhibitory/excitatory \u2014 what does that mean at the synapse, not just at the system level?')),
                    React.createElement('li', null, t('stem.brainatlas.dopamine_is_often_called_the_reward_ch', 'Dopamine is often called the "reward" chemical. Is that the right frame? (See Schultz reward-prediction-error work.)')),
                    React.createElement('li', null, t('stem.brainatlas.why_is_the_low_serotonin_depression_cl', 'Why is the "low serotonin \u2192 depression" claim contested in current research?')),
                    React.createElement('li', null, t('stem.brainatlas.what_states_would_you_not_expect_to_se', 'What states would you NOT expect to see in this five-axis space, and what would they require?'))
                  )
                ),
                React.createElement('label', { className: 'flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1' },
                  React.createElement('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                  React.createElement('span', null, t('stem.brainatlas.i_can_explain_why_this_nt_profile_is_a', 'I can explain why this NT profile is associated with this functional state.'))
                ),
                iq.understood && React.createElement('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: t('stem.brainatlas.explain_in_your_own_words', 'Explain in your own words...'), className: 'w-full p-1.5 rounded text-[10px] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                React.createElement('p', { className: 'm-0 text-[9px] italic opacity-60' }, t('stem.brainatlas.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget \u2014 no score, no reveal, no answer dump. Mapping from neurotransmitter levels to felt states is a teaching heuristic, NOT a clinical model. The "chemical imbalance" theory of mood disorders is contested; receptor sensitivity, network dynamics, and lifecycle/context matter at least as much.'))
              );
            })(),

            // View tabs

            React.createElement("section", {
              className: "brainatlas-view-panel",
              "data-brainatlas-view-panel": "true",
              "aria-labelledby": "brainatlas-view-library-title"
            },
              React.createElement("div", { className: "brainatlas-view-panel-head" },
                React.createElement("div", { className: "brainatlas-view-panel-copy" },
                  React.createElement("p", { className: "brainatlas-view-eyebrow" }, t('stem.brainatlas.diagram_library', 'Diagram library') || 'Diagram library'),
                  React.createElement("h3", { id: "brainatlas-view-library-title", className: "brainatlas-view-panel-title" }, activeViewGroup.label),
                  React.createElement("p", { className: "brainatlas-view-panel-note" }, activeViewGroup.note)
                ),
                React.createElement("span", { className: "brainatlas-view-count" }, visibleViewKeys.length + ' ' + (t('stem.brainatlas.views_count', 'views') || 'views'))
              ),
              React.createElement("div", {
                className: "brainatlas-view-rail",
                "data-brainatlas-view-rail": "true",
                "data-brainatlas-visible-group": activeViewGroup.id,
                "aria-label": activeViewGroup.label + ': ' + (t('stem.brainatlas.view_choices', 'view choices') || 'view choices')
              },
                visibleViewKeys.map(function (key) {
                  var v = VIEWS[key];
                  return React.createElement("button", { key: key,
                    type: "button",
                    "aria-pressed": viewKey === key ? "true" : "false",
                    "data-brainatlas-view-button": "true",
                    "data-brainatlas-active": viewKey === key ? "true" : "false",
                    onClick: function () { upd('view', key); upd('viewGroup', brainAtlasViewGroupFor(key)); upd('viewsExplored', (function () { var o = Object.assign({}, d.viewsExplored); o[key] = true; return o; })()); upd('selectedRegion', null); upd('quizMode', false); upd('search', ''); upd('showNtInquiry', key === 'neurotransmitters'); },
                    className: "brainatlas-view-button px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (viewKey === key ? 'bg-purple-600 text-white shadow-sm' : 'transition-colors bg-slate-50 text-slate-600 hover:bg-purple-50 border border-slate-400 active:scale-[0.97]')
                  }, v.name);
                })
              )
            ),

            // ── Topic-accent hero band (per anatomical view) ──
            (function() {
              var VIEW_META = {
                lateral:           { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '🧠', title: t('stem.brainatlas.lateral_view_the_4_lobes_cerebellum_br', 'Lateral view — the 4 lobes, cerebellum, brainstem'),  hint: t('stem.brainatlas.the_classic_side_view_frontal_planning', 'The classic side view. Frontal (planning + Broca), parietal (sensation + space), temporal (language + memory), occipital (vision). Each lobe maps to specific clinical syndromes.') },
                medial:            { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '🪞', title: t('stem.brainatlas.medial_sagittal_midline_structures', 'Medial sagittal — midline structures'),          hint: t('stem.brainatlas.cut_the_brain_in_half_corpus_callosum_', 'Cut the brain in half: corpus callosum, thalamus, hypothalamus, cingulate, hippocampus. The deep structures the lateral view hides — most of the limbic system lives here.') },
                superior:          { accent: '#3b82f6', soft: 'rgba(59,130,246,0.10)', icon: '⬆️', title: t('stem.brainatlas.superior_view_top_down', 'Superior view — top-down'),                       hint: t('stem.brainatlas.look_down_at_the_brain_the_longitudina', 'Look down at the brain. The longitudinal fissure splits L and R hemispheres; the central sulcus separates motor (front) from somatosensory (back). Asymmetry reveals.') },
                inferior:          { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '⬇️', title: t('stem.brainatlas.inferior_view_bottom_up', 'Inferior view — bottom-up'),                      hint: t('stem.brainatlas.look_up_from_underneath_cranial_nerves', 'Look up from underneath. Cranial nerves I–XII exit here. The Circle of Willis (basilar + vertebral + ICA) supplies the brain — strokes happen at these branch points.') },
                homunculus:        { accent: '#14b8a6', soft: 'rgba(20,184,166,0.10)', icon: '✋', title: t('stem.brainatlas.homunculus_motor_sensory_body_map', 'Homunculus — motor/sensory body map'),       hint: t('stem.brainatlas.homunculus_map_hint', 'A Penfield-style map of the precentral motor strip and postcentral sensory strip. Hands, lips, face, and tongue look oversized because they get more cortical real estate.') },
                visualPathway:     { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)', icon: '👁️', title: t('stem.brainatlas.visual_pathway_field_cuts', 'Visual pathway — field cuts'),             hint: t('stem.brainatlas.visual_pathway_hint', 'Follow light from retina to optic nerve, chiasm, tract, LGN, radiations, and V1. The mini cards show why each lesion creates a different visual-field pattern.') },
                languageNetwork:   { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: 'LN', title: t('stem.brainatlas.language_network_broca_wernicke', 'Language network - Broca/Wernicke'),     hint: t('stem.brainatlas.language_network_hint', 'A dominant-hemisphere map linking auditory and visual word input to Wernicke comprehension, arcuate fasciculus repetition, Broca speech planning, and motor speech output.') },
                neurotransmitters: { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '🧪', title: t('stem.brainatlas.neurotransmitters_chemistry_of_mind', 'Neurotransmitters — chemistry of mind'),          hint: t('stem.brainatlas.glutamate_excite_gaba_inhibit_dopamine', 'Glutamate (excite), GABA (inhibit), dopamine (reward + motor), serotonin (mood + GI), norepinephrine (alertness), acetylcholine (memory + autonomic). Drug targets all live here.') },
                neuron:            { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '🪡', title: t('stem.brainatlas.neuron_anatomy_single_cell', 'Neuron anatomy — single cell'),                  hint: t('stem.brainatlas.dendrites_input_soma_axon_output_termi', 'Dendrites (input) → soma → axon (output) → terminal. Action potential travels at 10–120 m/s; myelin makes it faster. Synapses can be excitatory or inhibitory.') },
                sleepStages:       { accent: '#6366f1', soft: 'rgba(99,102,241,0.10)', icon: '😴', title: t('stem.brainatlas.sleep_stages_n1_n2_n3_rem', 'Sleep stages — N1, N2, N3, REM'),               hint: t('stem.brainatlas.cycles_every_90_min_n3_deep_for_memory', 'Cycles every ~90 min. N3 (deep) for memory consolidation; REM for emotional processing + procedural memory. Adolescents need 8–10 hrs; chronic deprivation impairs everything cognitive.') },
                eegWaves:          { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '📈', title: t('stem.brainatlas.eeg_waves_brain_rhythms', 'EEG waves — brain rhythms'),                    hint: t('stem.brainatlas.delta_deep_sleep_theta_drowsy_memory_a', 'Delta (deep sleep) → Theta (drowsy + memory) → Alpha (relaxed wakefulness) → Beta (active thinking) → Gamma (focused attention). Frequency rises with arousal level.') },
                crossLateral:      { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '⚡', title: t('stem.brainatlas.cross_lateral_wiring_left_vs_right', 'Cross-lateral wiring — left vs right'),          hint: t('stem.brainatlas.each_hemisphere_controls_the_opposite_', 'Each hemisphere controls the OPPOSITE side of the body, while the corpus callosum transfers information between hemispheres. Split-brain studies make that bridge visible: what one hemisphere sees may not be verbally reportable unless information crosses.') }
              };
              VIEW_META.synapses = {
                accent: '#8b5cf6',
                soft: 'rgba(139,92,246,0.10)',
                icon: 'SD',
                title: t('stem.brainatlas.synapse_development_lifespan_map', 'Synapse & development - lifespan map'),
                hint: t('stem.brainatlas.synapse_development_lifespan_hint', 'Compare early synapse overproduction, sensory pruning, later prefrontal pruning, myelination, lifelong plasticity, and adolescent remodeling on one uncluttered development map.')
              };
              VIEW_META.stimulate = {
                accent: '#ea580c',
                soft: 'rgba(234,88,12,0.10)',
                icon: 'ST',
                title: t('stem.brainatlas.stimulation_lab_penfield_map', 'Stimulation Lab - Penfield response map'),
                hint: t('stem.brainatlas.stimulation_lab_penfield_hint', 'Use the pulsing electrode target to predict whether stimulation should cause movement, tingling, flashes, sounds, language disruption, memory-emotion responses, body-state changes, or no obvious report.')
              };
              VIEW_META.strokeTerritories = {
                accent: '#ef4444',
                soft: 'rgba(239,68,68,0.10)',
                icon: 'CV',
                title: t('stem.brainatlas.stroke_territories_clinical_map', 'Stroke territories - clinical map'),
                hint: t('stem.brainatlas.stroke_territories_hint', 'Match the deficit pattern to the vascular map: leg greater than arm for ACA, face/arm plus language or neglect for MCA, visual-field loss for PCA, pure motor or sensory signs for lacunar stroke, and crossed or vestibular clues for posterior circulation.')
              };
              VIEW_META.cerebellumClinic = {
                accent: '#16a34a',
                soft: 'rgba(22,163,74,0.10)',
                icon: 'CB',
                title: t('stem.brainatlas.cerebellum_clinic_map', 'Cerebellum clinic - ataxia map'),
                hint: t('stem.brainatlas.cerebellum_clinic_hint', 'Use same-side coordination signs to separate vermis gait instability, limb hemisphere dysmetria, vestibular nystagmus, and PICA/AICA/SCA artery patterns.')
              };
              VIEW_META.brainstemCrossSection = {
                accent: '#2563eb',
                soft: 'rgba(37,99,235,0.10)',
                icon: 'BS',
                title: t('stem.brainatlas.brainstem_cross_findings_map', 'Brainstem - crossed findings'),
                hint: t('stem.brainatlas.brainstem_cross_hint', 'Localize the brainstem by pairing ipsilateral cranial nerve signs with contralateral body tract findings: CN III for midbrain, CN V-VIII for pons, and bulbar/tongue signs for medulla.')
              };
              VIEW_META.csfHydrocephalus = {
                accent: '#0284c7',
                soft: 'rgba(2,132,199,0.10)',
                icon: 'CSF',
                title: t('stem.brainatlas.csf_flow_hydrocephalus_map', 'CSF flow - hydrocephalus map'),
                hint: t('stem.brainatlas.csf_flow_hydrocephalus_hint', 'Follow CSF from choroid plexus through the lateral ventricles, third ventricle, aqueduct, fourth ventricle, subarachnoid space, and arachnoid granulations. The decoder separates obstructive, communicating, normal-pressure, and raised-pressure patterns.')
              };
              var meta = VIEW_META[viewKey] || VIEW_META.lateral;
              if (viewKey === 'cranialNervesWillis') {
                meta = {
                  accent: '#dc2626',
                  soft: 'rgba(220,38,38,0.09)',
                  icon: 'CN',
                  title: t('stem.brainatlas.cranial_willis_base_map', 'Cranial nerves & Willis - base map'),
                  hint: t('stem.brainatlas.cranial_willis_hint', 'An underside view that separates cranial nerve exits from the arterial ring. It highlights CN III near PComm, lower cranial nerves at the medulla, and basilar/vertebral brainstem supply.')
                };
              }
              if (viewKey === 'basalGangliaLoop') {
                meta = {
                  accent: '#0f766e',
                  soft: 'rgba(15,118,110,0.10)',
                  icon: 'BG',
                  title: t('stem.brainatlas.basal_ganglia_loop_go_no_go', 'Basal ganglia loop - GO / NO-GO'),
                  hint: t('stem.brainatlas.basal_ganglia_loop_hint', 'Direct pathway releases selected movement; indirect pathway suppresses competing movement. Dopamine nudges D1 up and D2 down, so loss of dopamine makes movement harder to start.')
                };
              }
              if (viewKey === 'limbicPapezLoop') {
                meta = {
                  accent: '#d97706',
                  soft: 'rgba(217,119,6,0.10)',
                  icon: 'LM',
                  title: t('stem.brainatlas.limbic_papez_memory_emotion', 'Limbic / Papez loop - memory + emotion'),
                  hint: t('stem.brainatlas.limbic_papez_hint', 'Papez circuit links hippocampus, mammillary bodies, anterior thalamus, cingulate, and entorhinal cortex for memory context. Amygdala output tags memories with emotion and drives hypothalamic body responses.')
                };
              }
              return React.createElement('div', {
                className: 'brainatlas-mode-card',
                "data-brainatlas-mode-card": "true",
                style: {
                  marginBottom: '12px',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, var(--allo-stem-canvas, #ffffff) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // Controls

            React.createElement("div", { className: "brainatlas-controls mb-3", "data-brainatlas-controls": "true" },
              React.createElement("div", { className: "brainatlas-controls-search" },
                React.createElement("label", { htmlFor: "brainatlas-region-search", className: "brainatlas-controls-label" }, t('stem.brainatlas.find_a_region', 'Find a region') || 'Find a region'),
                React.createElement("div", { className: "brainatlas-search-field" },
                  React.createElement("span", { className: "brainatlas-search-icon", "aria-hidden": "true" }, '\u2315'),
                  React.createElement("input", {
                    id: "brainatlas-region-search",
                    type: "text", placeholder: t('stem.brainatlas.search_regions_functions_conditions', "Search regions, functions, conditions..."),
                    'aria-label': t('stem.brainatlas.search_brain_regions_functions_and_con', 'Search brain regions, functions, and conditions'),
                    value: d.search || '',
                    onChange: function (e) { upd('search', e.target.value); },
                    className: "brainatlas-search-input text-xs"
                  }),
                  d.search && React.createElement("button", {
                    type: "button",
                    className: "brainatlas-clear-search",
                    "data-brainatlas-clear-search": "true",
                    "aria-label": t('stem.brainatlas.clear_region_search', 'Clear region search') || 'Clear region search',
                    title: t('stem.brainatlas.clear_search', 'Clear search') || 'Clear search',
                    onClick: function () { upd('search', ''); }
                  }, '\u00D7')
                )
              ),
              React.createElement("div", { className: "brainatlas-controls-actions" },
                React.createElement("button", {
                  type: "button",
                  "aria-pressed": d.quizMode ? "true" : "false",
                  "data-brainatlas-quiz-toggle": "true",
                  onClick: function () { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },
                  className: "brainatlas-quiz-button px-3 py-1.5 text-xs font-bold transition-all " + (d.quizMode ? 'bg-green-700 text-white' : 'transition-colors bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 active:scale-[0.97]')
                }, d.quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),
                React.createElement("span", {
                  className: "brainatlas-region-count-chip",
                  role: "status",
                  "aria-live": "polite",
                  "data-brainatlas-region-count": "true"
                }, filtered.length + ' regions')
              )
            ),

            // ─── FUNCTION MATCH (net-new mini-game) ───
            // 12 function/clinical-syndrome vignettes; player picks the brain
            // region from 8 common areas. Distinct from the existing Quiz mode
            // (which tests region-name → click location): Function Match tests
            // function/syndrome → region. The school-psych canonical reflex.
            (function() {
              var FM_REGIONS = [
                { id: 'frontal',     label: t('stem.brainatlas.frontal_lobe', 'Frontal lobe'),    color: '#7c3aed', icon: '🧠', def: 'Executive function, planning, motor cortex, Broca\'s area (speech production), personality, impulse control. Damage = Phineas Gage / motor aphasia / hemiparesis.' },
                { id: 'parietal',    label: t('stem.brainatlas.parietal_lobe', 'Parietal lobe'),   color: '#0ea5e9', icon: '🗺️', def: 'Somatosensory cortex, spatial awareness, visuomotor integration. Right-hemisphere damage = hemispatial neglect; left = Gerstmann syndrome.' },
                { id: 'temporal',    label: t('stem.brainatlas.temporal_lobe', 'Temporal lobe'),   color: '#16a34a', icon: '👂', def: 'Auditory cortex, Wernicke\'s area (language comprehension), face recognition (fusiform), encloses the hippocampus + amygdala.' },
                { id: 'occipital',   label: t('stem.brainatlas.occipital_lobe', 'Occipital lobe'),  color: '#f59e0b', icon: '👁️', def: 'Primary visual cortex (V1) + association areas (V2-V5). Color, motion, depth, object recognition. Damage = cortical blindness, hemianopia, visual agnosia.' },
                { id: 'hippocampus', label: t('stem.brainatlas.hippocampus', 'Hippocampus'),     color: '#ec4899', icon: '📚', def: 'Memory formation + consolidation; spatial memory (London-taxi-driver studies). Bilateral damage = anterograde amnesia (HM / Henry Molaison case).' },
                { id: 'amygdala',    label: t('stem.brainatlas.amygdala', 'Amygdala'),        color: '#dc2626', icon: '⚡', def: 'Emotion processing, fear recognition + conditioning, threat detection. Damage = Klüver-Bucy / fear-blindness; hyperactivity = PTSD, anxiety disorders.' },
                { id: 'cerebellum',  label: t('stem.brainatlas.cerebellum', 'Cerebellum'),      color: '#0891b2', icon: '🦴', def: 'Motor coordination, balance, motor learning, timing. Damage = ipsilateral ataxia, dysmetria, intention tremor, scanning speech (NOT contralateral like cerebrum).' },
                { id: 'brainstem',   label: t('stem.brainatlas.brainstem_2', 'Brainstem'),       color: 'var(--allo-stem-text-soft, #64748b)', icon: '🌳', def: 'Cranial nerve nuclei (III-XII), reticular activating system (consciousness), vital centers (cardiac, respiratory). Damage = coma, cranial palsies, vital instability.' }
              ];
              var FM_V = [
                { id: 1, scenario: 'Patient produces telegraphic, non-fluent speech ("water... want...") with intact comprehension. Aware of the deficit and frustrated by it. Right hemiparesis on exam.', correct: 'frontal',
                  why: "Broca's aphasia (left frontal lobe, BA 44/45). Non-fluent + intact comprehension + frustrated awareness is the canonical triad. Adjacent motor cortex damage explains the right hemiparesis (corticospinal tract crosses)." },
                { id: 2, scenario: 'Patient produces fluent, well-articulated but nonsensical "word salad" with poor comprehension of others. Unaware of the deficit. No motor weakness.', correct: 'temporal',
                  why: "Wernicke's aphasia (left posterior superior temporal gyrus, BA 22). Fluent + nonsensical + comprehension-impaired + unaware is the canonical contrast to Broca's. No hemiparesis because motor cortex is far away." },
                { id: 3, scenario: 'After surgical removal of bilateral medial temporal lobes for intractable epilepsy, patient cannot form ANY new long-term memories, though working memory + procedural learning are preserved. Pre-surgery memories intact.', correct: 'hippocampus',
                  why: "Henry Molaison (HM) case — the most-cited case in cognitive neuroscience. Bilateral hippocampal removal = profound anterograde amnesia. Distinguishes declarative (lost) from procedural (preserved) memory systems. Implicit memory works through different circuits." },
                { id: 4, scenario: 'Patient has flattened emotional response. Cannot recognize fear in others\' faces. Approaches strangers without normal caution. No motor or sensory deficits.', correct: 'amygdala',
                  why: "Bilateral amygdala damage (Klüver-Bucy syndrome features). Fear-recognition + appropriate-caution-around-strangers depend on amygdala fast-track threat processing. Patient SR (Bechara et al.) is the canonical case." },
                { id: 5, scenario: 'After damage from a railroad accident, patient becomes impulsive, socially inappropriate, abandons long-term plans. Personality changed. Memory + speech + motor function intact.', correct: 'frontal',
                  why: "Phineas Gage (1848) — the founding case of frontal-lobe / executive-function neuroscience. Prefrontal damage with intact cognition + memory shows that personality + planning + impulse control can change personality, planning, and impulse control while sparing memory and language." },
                { id: 6, scenario: 'Patient develops cortical blindness after a stroke but their pupillary light reflex is intact. They sometimes deny being blind (Anton syndrome). Eyes are anatomically normal.', correct: 'occipital',
                  why: "Bilateral occipital lobe damage (V1) = cortical blindness. Pupillary reflex is intact because it bypasses cortex (subcortical pathway via pretectum). Anton syndrome (denial of blindness) suggests damage extends to association areas that would normally signal the deficit." },
                { id: 7, scenario: 'Patient has wide-based gait, intention tremor (worsens as the hand approaches a target), dysmetria (overshoot/undershoot on finger-to-nose test), and scanning speech. Strength normal. Damage from PICA stroke.', correct: 'cerebellum',
                  why: "Classic cerebellar syndrome. Coordination + timing + motor learning deficits without weakness. PICA (posterior inferior cerebellar artery) supplies the cerebellum. Note: cerebellar damage causes IPSILATERAL signs (same side), unlike cerebral cortex damage." },
                { id: 8, scenario: 'Patient ignores the entire left side of space. Eats food only off the right half of their plate, dresses only the right side, draws clocks with all numbers crammed on the right. No visual-field cut.', correct: 'parietal',
                  why: "Right-parietal damage = hemispatial neglect. Spatial-attention systems are right-lateralized, so right damage produces left neglect (much more common than the reverse). Distinguishes from hemianopia (visual-field cut) — neglect is attentional, not visual." },
                { id: 9, scenario: 'Patient cannot recognize familiar faces (including own family) but can recognize them by voice or context. Other visual recognition intact. Lesion in fusiform gyrus.', correct: 'temporal',
                  why: "Prosopagnosia (face blindness). The fusiform face area (FFA) in the right ventral temporal cortex is specialized for face recognition. Voice + context recognition are unaffected because they use different cortical pathways. Distinguishes face-specific from general visual agnosia." },
                { id: 10, scenario: 'Patient becomes comatose after a midbrain lesion. Pupils unresponsive. Spontaneous breathing intact but irregular. Patient does not arouse to noxious stimuli.', correct: 'brainstem',
                  why: "Midbrain damage affecting the reticular activating system (RAS) = coma. Pupils are unresponsive because cranial nerves III + sympathetic innervation pass through midbrain. Vital centers (medulla) determine whether spontaneous breathing continues. Brainstem death = legal death criterion." },
                { id: 11, scenario: 'Combat veteran shows hyper-vigilance, exaggerated startle response, and intense fear responses to neutral cues that resemble combat (a car backfire, bright flashes). Imaging shows hyperactivity here.', correct: 'amygdala',
                  why: "PTSD = amygdala hyperactivity + reduced prefrontal regulation. Trauma-conditioned cues activate the amygdala\'s fear circuit, bypassing slower cortical evaluation. Treatment (exposure therapy, EMDR, propranolol) targets re-consolidation of the fear-conditioned trace." },
                { id: 12, scenario: 'Patient with mild cognitive impairment cannot remember a 4-item shopping list 5 minutes later, gets lost in their own neighborhood, and has trouble learning new routes. Pre-clinical Alzheimer\'s suspected.', correct: 'hippocampus',
                  why: "Earliest Alzheimer\'s pathology starts in the entorhinal cortex + hippocampus (medial temporal lobe). Spatial memory + new-route learning depend on hippocampal place cells (Nobel Prize 2014: O\'Keefe + Mosers). Anterograde memory deficit before other cognitive symptoms is the typical AD progression." }
              ];
              var fmIdx = d.fmIdx == null ? -1 : d.fmIdx;
              var fmSeed = d.fmSeed || 1;
              var fmAns = !!d.fmAns;
              var fmPick = d.fmPick;
              var fmScore = d.fmScore || 0;
              var fmRounds = d.fmRounds || 0;
              var fmStreak = d.fmStreak || 0;
              var fmBest = d.fmBest || 0;
              var fmShown = d.fmShown || [];
              var fmOpen = !!d.fmOpen;
              function startFm() {
                var pool = [];
                for (var i = 0; i < FM_V.length; i++) if (fmShown.indexOf(i) < 0) pool.push(i);
                if (pool.length === 0) { pool = []; for (var j = 0; j < FM_V.length; j++) pool.push(j); fmShown = []; }
                var seedNext = ((fmSeed * 16807 + 11) % 2147483647) || 7;
                var pick = pool[seedNext % pool.length];
                upd('fmSeed', seedNext);
                upd('fmIdx', pick);
                upd('fmAns', false);
                upd('fmPick', null);
                upd('fmShown', fmShown.concat([pick]));
              }
              function pickFm(rId) {
                if (fmAns) return;
                var v = FM_V[fmIdx];
                var correct = rId === v.correct;
                var newScore = fmScore + (correct ? 1 : 0);
                var newStreak = correct ? (fmStreak + 1) : 0;
                var newBest = Math.max(fmBest, newStreak);
                upd('fmAns', true);
                upd('fmPick', rId);
                upd('fmScore', newScore);
                upd('fmRounds', fmRounds + 1);
                upd('fmStreak', newStreak);
                upd('fmBest', newBest);
              }
              if (!fmOpen && fmIdx < 0) return null;
              return React.createElement("div", { className: "brainatlas-function-match", "data-brainatlas-function-match": fmOpen ? "open" : "closed", style: { padding: 14, marginBottom: 14, borderRadius: 8, background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(255,255,255,0))', border: '2px solid rgba(124,58,237,0.30)' } },
                React.createElement("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
                  React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    React.createElement("span", { style: { fontSize: 22 }, 'aria-hidden': 'true' }, '🕵️'),
                    React.createElement("div", null,
                      React.createElement("div", { style: { color: '#6d28d9', fontSize: 14, fontWeight: 900 } }, t('stem.brainatlas.function_match', 'Function Match')),
                      React.createElement("div", { style: { color: 'var(--allo-stem-text-soft, #64748b)', fontSize: 11, fontStyle: 'italic' } }, t('stem.brainatlas.12_function_clinical_syndrome_vignette', '12 function / clinical-syndrome vignettes — pick the brain region.'))
                    )
                  ),
                  React.createElement("button", {
                    onClick: function() { upd('fmOpen', !fmOpen); },
                    style: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.40)', background: 'rgba(124,58,237,0.10)', color: '#6d28d9', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                  }, fmOpen ? 'Hide ▴' : 'Play →')
                ),
                fmOpen && (fmIdx < 0
                  ? React.createElement("div", { style: { textAlign: 'center', padding: '12px 0' } },
                      React.createElement("p", { style: { color: 'var(--allo-stem-text-soft, #475569)', fontSize: 12, lineHeight: 1.55, marginBottom: 12 } },
                        t('stem.brainatlas.for_each_clinical_vignette_pick_the_br', 'For each clinical vignette, pick the brain region most likely involved. Coaching cites the canonical case (HM, Phineas Gage, etc.) and what distinguishes the correct region from look-alikes.')),
                      React.createElement("button", {
                        onClick: startFm,
                        style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
                      }, t('stem.brainatlas.start_vignette_1_of_12', '🕵️ Start — vignette 1 of 12'))
                    )
                  : (function() {
                      var v = FM_V[fmIdx];
                      var pickedCorrect = fmAns && fmPick === v.correct;
                      var pct = fmRounds > 0 ? Math.round((fmScore / fmRounds) * 100) : 0;
                      var allDone = fmShown.length >= FM_V.length && fmAns;
                      var correctReg = FM_REGIONS.filter(function(r) { return r.id === v.correct; })[0];
                      var pickedReg = fmPick ? FM_REGIONS.filter(function(r) { return r.id === fmPick; })[0] : null;
                      return React.createElement("div", { style: { marginTop: 10 } },
                        React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 11, color: 'var(--allo-stem-text-soft, #475569)', marginBottom: 8 } },
                          React.createElement("span", null, t('stem.brainatlas.vignette', 'Vignette '), React.createElement("strong", { style: { color: '#1e293b' } }, fmShown.length)),
                          React.createElement("span", null, t('stem.brainatlas.score', 'Score '), React.createElement("strong", { style: { color: '#16a34a' } }, fmScore + ' / ' + fmRounds)),
                          fmRounds > 0 && React.createElement("span", null, t('stem.brainatlas.accuracy', 'Accuracy '), React.createElement("strong", { style: { color: '#0ea5e9' } }, pct + '%')),
                          React.createElement("span", null, t('stem.brainatlas.streak', 'Streak '), React.createElement("strong", { style: { color: '#f59e0b' } }, fmStreak)),
                          React.createElement("span", null, t('stem.brainatlas.best', 'Best '), React.createElement("strong", { style: { color: '#7c3aed' } }, fmBest))
                        ),
                        React.createElement("div", { style: { padding: '12px 14px', borderRadius: 10, background: '#faf5ff', border: '2px solid rgba(124,58,237,0.40)', marginBottom: 10 } },
                          React.createElement("div", { style: { fontSize: 11, color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Vignette ' + fmShown.length + ' of ' + FM_V.length),
                          React.createElement("p", { style: { margin: 0, color: '#1e293b', fontSize: 13, lineHeight: 1.55 } }, v.scenario)
                        ),
                        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }, role: 'radiogroup', 'aria-label': t('stem.brainatlas.pick_the_brain_region', 'Pick the brain region') },
                          FM_REGIONS.map(function(r) {
                            var picked = fmAns && fmPick === r.id;
                            var isRight = fmAns && r.id === v.correct;
                            var bg, border, color;
                            if (fmAns) {
                              if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                              else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                              else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
                            } else {
                              bg = r.color + '12'; border = r.color + '60'; color = '#1e293b';
                            }
                            return React.createElement('button', {
                              key: r.id, role: 'radio',
                              'aria-checked': picked ? 'true' : 'false',
                              'aria-label': r.label,
                              disabled: fmAns,
                              onClick: function() { pickFm(r.id); },
                              style: { padding: '10px 12px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: fmAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 11, minHeight: 70, transition: 'all 0.15s' }
                            },
                              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
                                React.createElement('span', { style: { fontSize: 14 }, 'aria-hidden': 'true' }, r.icon),
                                React.createElement('span', { style: { color: fmAns ? color : r.color, fontSize: 12, fontWeight: 800 } }, r.label)
                              ),
                              React.createElement('div', { style: { fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: fmAns ? color: 'var(--allo-stem-text-soft, #475569)' } }, r.def)
                            );
                          })
                        ),
                        fmAns && React.createElement("div", {
                          style: {
                            marginTop: 10, padding: '12px 14px', borderRadius: 10,
                            background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
                            border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
                          }
                        },
                          React.createElement("div", { style: { fontSize: 13, fontWeight: 800, marginBottom: 6, color: pickedCorrect ? '#166534' : '#991b1b' } },
                            pickedCorrect
                              ? '✅ Correct — ' + correctReg.label
                              : '❌ The region is ' + correctReg.label + (pickedReg ? ' (you picked ' + pickedReg.label + ')' : '')
                          ),
                          React.createElement("p", { style: { color: '#1e293b', fontSize: 12, lineHeight: 1.55, margin: '0 0 10px' } }, v.why),
                          allDone
                            ? React.createElement("div", { style: { padding: 10, borderRadius: 8, background: '#faf5ff', border: '1px solid rgba(124,58,237,0.45)' } },
                                React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: '#6d28d9', marginBottom: 4 } }, t('stem.brainatlas.all_12_vignettes_complete', '🏆 All 12 vignettes complete')),
                                React.createElement("div", { style: { color: '#1e293b', fontSize: 12, lineHeight: 1.5 } },
                                  'Final: ', React.createElement('strong', null, fmScore + ' / ' + FM_V.length + ' (' + Math.round((fmScore / FM_V.length) * 100) + '%)'),
                                  fmScore === FM_V.length ? ' — every region correctly identified. Ready for clinical neuro work.' :
                                  fmScore >= 10 ? ' — strong clinical-syndrome reasoning. The most-confused pair is usually frontal vs temporal for language deficits (Broca\'s frontal vs Wernicke\'s temporal — fluency is the discriminator).' :
                                  fmScore >= 7 ? ' — solid baseline. Reflexes worth building: telegraphic = Broca\'s (frontal), fluent nonsense = Wernicke\'s (temporal), no new memories = hippocampus, fearless = amygdala, ataxia = cerebellum.' :
                                  ' — these distinctions are what neurology + neuropsych assessments are built on. Re-read the rationales on misses, then retake.'
                                ),
                                React.createElement("button", {
                                  onClick: function() { upd('fmIdx', -1); upd('fmShown', []); upd('fmScore', 0); upd('fmRounds', 0); upd('fmStreak', 0); },
                                  style: { marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                                }, t('stem.brainatlas.restart', '🔄 Restart'))
                              )
                            : React.createElement("button", {
                                onClick: startFm,
                                style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                              }, t('stem.brainatlas.next_vignette', '➡️ Next vignette'))
                        )
                      );
                    })()
                )
              );
            })(),

            // Main: canvas (full width) + detail below

            React.createElement("div", { className: "brainatlas-main-stack", "data-brainatlas-main": "true" },

              // ─── Simulation scenario buttons (NT view only) ───

              currentView.isNT && React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                SIM_SCENARIOS.map(function (s) {

                  var isActive = simScenario === s.id;

                  return React.createElement("button", { key: s.id,

                    onClick: function () { upd('simScenario', s.id); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 " +

                      (isActive ? 'text-white shadow-lg' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]'),

                    style: isActive ? { background: s.color, borderColor: s.color } : {}

                  }, s.icon + ' ' + s.name);

                })

              ),

              currentView.isEEG && React.createElement("div", { className: "flex flex-wrap gap-1.5", "data-brainatlas-eeg-modes": "true", role: "group", "aria-label": t('stem.brainatlas.eeg_activity_mode', 'EEG activity mode') || 'EEG activity mode' },

                EEG_ACTIVITY_MODES.map(function (mode) {

                  var isActive = eegActivityMode === mode.id;

                  return React.createElement("button", { key: mode.id,

                    type: "button",

                    "aria-pressed": isActive,

                    onClick: function () { upd('eegActivity', mode.id); if (typeof announceToSR === 'function') announceToSR((t('stem.brainatlas.eeg_activity_mode_set', 'EEG activity mode: ') || 'EEG activity mode: ') + mode.label); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 " +

                      (isActive ? 'text-white shadow-lg' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:bg-purple-50 active:scale-[0.97]'),

                    style: isActive ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}

                  }, mode.label);

                })

              ),

              currentView.isEEG && React.createElement("div", {
                className: "brainatlas-eeg-readout",
                "data-brainatlas-eeg-readout": "true",
                style: {
                  border: '1px solid ' + activeEegReadout.color + '55',
                  borderLeft: '4px solid ' + activeEegReadout.color,
                  background: 'linear-gradient(135deg, ' + activeEegReadout.color + '12, rgba(255,255,255,0.96))',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: 10,
                  alignItems: 'start'
                }
              },
                React.createElement("div", null,
                  React.createElement("p", { style: { margin: 0, color: activeEegReadout.color, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 } }, t('stem.brainatlas.eeg_state_readout', 'EEG state readout') || 'EEG state readout'),
                  React.createElement("p", { style: { margin: '2px 0 0', color: '#0f172a', fontSize: 14, fontWeight: 900, lineHeight: 1.2 } }, activeEegReadout.title)
                ),
                React.createElement("div", null,
                  React.createElement("p", { style: { margin: 0, color: '#334155', fontSize: 11, fontWeight: 900 } }, activeEegReadout.dominant),
                  React.createElement("p", { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45 } }, activeEegReadout.pattern)
                ),
                React.createElement("div", null,
                  React.createElement("p", { style: { margin: 0, color: '#be123c', fontSize: 11, fontWeight: 900 } }, t('stem.brainatlas.eeg_interpretation_caution', 'Interpretation caution') || 'Interpretation caution'),
                  React.createElement("p", { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45 } }, activeEegReadout.caution)
                )
              ),

              // ─── Canvas ───

              React.createElement("div", { id: "brainatlas-canvas-fullscreen", className: "brainatlas-canvas-shell", "data-brainatlas-canvas-shell": "true", "data-brainatlas-has-selection": sel ? "true" : "false" },

                React.createElement("div", { className: "brainatlas-canvas-header" },
                  React.createElement("div", { className: "brainatlas-canvas-heading", "data-brainatlas-canvas-heading": "true" },
                    React.createElement("p", { className: "brainatlas-canvas-eyebrow" }, t('stem.brainatlas.interactive_diagram', 'Interactive diagram') || 'Interactive diagram'),
                    React.createElement("p", { className: "brainatlas-canvas-title" }, currentView.name),
                    React.createElement("p", { className: "brainatlas-canvas-subtitle" }, sel ? (t('stem.brainatlas.selected_region', 'Selected region') + ': ' + sel.name) : t('stem.brainatlas.select_a_region_or_switch_views', 'Select a region on the atlas, or switch views to compare systems.'))
                  ),
                  React.createElement("div", { className: "brainatlas-canvas-actions" },
                    React.createElement("span", {
                      className: "brainatlas-canvas-chip brainatlas-canvas-chip--accent",
                      "data-brainatlas-view-position": "true"
                    }, (t('stem.brainatlas.view_position', 'View') || 'View') + ' ' + currentViewPosition + ' / ' + VIEW_KEYS.length),
                    React.createElement("span", { className: "brainatlas-canvas-chip" }, filtered.length + " targets"),
                    React.createElement("div", {
                      className: "brainatlas-zoom-controls",
                      role: "group",
                      "aria-label": t('stem.brainatlas.diagram_zoom_controls', 'Diagram zoom controls'),
                      "data-brainatlas-zoom-controls": "true"
                    },
                      React.createElement("button", {
                        type: "button",
                        "data-brainatlas-zoom-out": "true",
                        "aria-label": t('stem.brainatlas.zoom_out_diagram', 'Zoom out diagram'),
                        title: t('stem.brainatlas.zoom_out_diagram', 'Zoom out diagram'),
                        disabled: canvasZoom <= 0.75,
                        onClick: function () { setBrainAtlasZoom(canvasZoom - 0.25); }
                      }, '\u2212'),
                      React.createElement("button", {
                        type: "button",
                        className: "brainatlas-zoom-readout",
                        "data-brainatlas-zoom-level": "true",
                        "aria-label": (t('stem.brainatlas.reset_diagram_zoom', 'Reset diagram zoom') || 'Reset diagram zoom') + ': ' + canvasZoomPercent + '%',
                        title: t('stem.brainatlas.reset_diagram_zoom', 'Reset diagram zoom'),
                        onClick: function () { setBrainAtlasZoom(1); }
                      }, canvasZoomPercent + '%'),
                      React.createElement("button", {
                        type: "button",
                        "data-brainatlas-zoom-in": "true",
                        "aria-label": t('stem.brainatlas.zoom_in_diagram', 'Zoom in diagram'),
                        title: t('stem.brainatlas.zoom_in_diagram', 'Zoom in diagram'),
                        disabled: canvasZoom >= 1.5,
                        onClick: function () { setBrainAtlasZoom(canvasZoom + 0.25); }
                      }, '+')
                    ),
                    React.createElement("div", {
                      className: "brainatlas-fullscreen-navigator",
                      role: "group",
                      "aria-label": t('stem.brainatlas.fullscreen_diagram_navigation', 'Fullscreen diagram navigation'),
                      "data-brainatlas-fullscreen-navigator": "true"
                    },
                      React.createElement("button", {
                        type: "button",
                        "data-brainatlas-previous-view": "true",
                        "aria-label": (t('stem.brainatlas.previous_diagram', 'Previous diagram') || 'Previous diagram') + ': ' + ((VIEWS[previousViewKey] && VIEWS[previousViewKey].name) || previousViewKey),
                        title: t('stem.brainatlas.previous_diagram', 'Previous diagram'),
                        onClick: function () { stepBrainAtlasView(-1); }
                      }, '\u2190'),
                      React.createElement("span", {
                        className: "brainatlas-fullscreen-position",
                        "data-brainatlas-fullscreen-position": "true",
                        "aria-live": "polite"
                      }, currentViewPosition + ' / ' + VIEW_KEYS.length),
                      React.createElement("button", {
                        type: "button",
                        "data-brainatlas-next-view": "true",
                        "aria-label": (t('stem.brainatlas.next_diagram', 'Next diagram') || 'Next diagram') + ': ' + ((VIEWS[nextViewKey] && VIEWS[nextViewKey].name) || nextViewKey),
                        title: t('stem.brainatlas.next_diagram', 'Next diagram'),
                        onClick: function () { stepBrainAtlasView(1); }
                      }, '\u2192')
                    ),
                    React.createElement("button", {
                      type: "button",
                      className: "brainatlas-fullscreen-button",
                      "data-brainatlas-fullscreen": "true",
                      "aria-label": t('stem.brainatlas.toggle_fullscreen_diagram', 'Toggle full screen for the brain atlas diagram'),
                      title: t('stem.brainatlas.toggle_fullscreen_diagram', 'Toggle full screen for the brain atlas diagram'),
                      onClick: toggleBrainAtlasFullscreen
                    },
                      React.createElement("span", { "aria-hidden": "true" }, '\u26F6'),
                      React.createElement("span", { className: "brainatlas-fullscreen-enter-label", "aria-hidden": "true" }, t('stem.brainatlas.full_screen', 'Full screen')),
                      React.createElement("span", { className: "brainatlas-fullscreen-exit-label", "aria-hidden": "true" }, t('stem.brainatlas.exit_full_screen', 'Exit full screen')),
                      React.createElement("span", { className: "brainatlas-fullscreen-shortcut", "aria-hidden": "true" }, 'Esc')
                    )
                  )
                ),

                React.createElement("div", { className: "brainatlas-canvas-status", "data-brainatlas-canvas-status": "true", role: "group", "aria-label": t('stem.brainatlas.diagram_status', 'Diagram status') },
                  React.createElement("span", { className: "brainatlas-status-dot", "aria-hidden": "true" }),
                  React.createElement("span", { className: "brainatlas-status-label" },
                    React.createElement("span", null, t('stem.brainatlas.view_group', 'View:')),
                    React.createElement("strong", null, activeViewGroup.label)
                  ),
                  React.createElement("span", { className: "brainatlas-status-divider", "aria-hidden": "true" }),
                  React.createElement("span", { className: "brainatlas-status-label" },
                    React.createElement("span", null, t('stem.brainatlas.focus_region', 'Focus:')),
                    React.createElement("strong", null, selectedLabel)
                  ),
                  React.createElement("span", { className: "brainatlas-status-hint" }, canvasZoom > 1 ? t('stem.brainatlas.diagram_enlarged_scroll_hint', 'Diagram enlarged - scroll to explore every label.') : (d.quizMode ? t('stem.brainatlas.quiz_status_hint', 'Quiz is active - use the diagram and evidence to decide.') : t('stem.brainatlas.canvas_interaction_hint', 'Select a label on the diagram or choose a region below.')))
                ),
                React.createElement("div", {
                  className: "brainatlas-canvas-stage",
                  "data-brainatlas-scrollable": canvasZoom > 1 ? "true" : "false"
                },

                React.createElement("div", {
                  className: "brainatlas-canvas-zoom-frame",
                  "data-brainatlas-canvas-zoom-frame": "true",
                  "data-brainatlas-zoom": canvasZoom.toFixed(2),
                  style: { width: (canvasZoom * 100) + '%', maxWidth: Math.round(1160 * canvasZoom) }
                },
                React.createElement("canvas", { tabIndex: 0,

                  ref: canvasRef,

                  width: atlasW,

                  height: atlasH,

                  onClick: handleClick,

                  role: "img",

                  "aria-label": canvasSummary,
                  "aria-describedby": "brainatlas-canvas-summary",

                  className: "brainatlas-canvas border-2 cursor-crosshair",

                  "data-brainatlas-canvas": "true",

                  style: { background: 'var(--allo-stem-panel, #faf8ff)', width: '100%', height: 'auto' }

                })
                )

                ),

                React.createElement("div", { className: "brainatlas-learning-footer", "data-brainatlas-learning-footer": "true" },
                React.createElement("div", {
                  id: "brainatlas-canvas-summary",
                  className: "brainatlas-canvas-summary",
                  "data-brainatlas-canvas-summary": "true",
                  "aria-live": "polite"
                },
                  React.createElement("strong", null, t('stem.brainatlas.canvas_summary', 'Canvas summary')),
                  canvasSummary
                ),

                React.createElement("div", {
                  className: "brainatlas-teacher-prompt",
                  "data-brainatlas-teacher-prompt": "true"
                },
                  React.createElement("strong", null, t('stem.brainatlas.teacher_move', 'Teacher move')),
                  teacherPrompt
                )

                )
              ),

              // ─── Simulation description panel (NT view only) ───

              currentView.isNT && React.createElement("div", {

                className: "rounded-xl border-2 p-3",

                style: { borderColor: activeSim.color + '44', background: activeSim.color + '0a' }

              },

                React.createElement("div", { className: "flex items-start gap-2" },

                  React.createElement("span", { className: "text-lg flex-shrink-0" }, activeSim.icon),

                  React.createElement("div", null,

                    React.createElement("p", {

                      className: "text-sm font-black mb-1",

                      style: { color: activeSim.color }

                    }, activeSim.name + ' Mode'),

                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, activeSim.desc),

                    simScenario !== 'normal' && React.createElement("div", {

                      className: "mt-2 rounded-lg p-2 border",

                      style: { background: '#fef3c720', borderColor: '#f59e0b33' }

                    },

                      React.createElement("p", { className: "text-[11px] font-bold text-amber-700 uppercase mb-0.5" }, t('stem.brainatlas.tolerance_receptor_desensitization', "\u26A0\uFE0F Tolerance \u0026 Receptor Desensitization")),

                      React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" },

                        t('stem.brainatlas.with_repeated_exposure_postsynaptic_re', "With repeated exposure, postsynaptic receptors undergo downregulation \u2014 the cell reduces receptor density or sensitivity (internalization) to compensate for excess stimulation. This means higher doses are needed to achieve the same effect, driving the cycle of tolerance and dependence. Abrupt cessation can cause withdrawal as the nervous system has adapted to the drug\u2019s presence.")

                      )

                    )

                  )

                )

              ),

              // ─── Action Potential Education Panel (Neuron view only) ───
              currentView.isNeuron && React.createElement("div", {
                className: "rounded-xl border-2 border-purple-200 p-4 space-y-3",
                style: { background: 'linear-gradient(135deg, #faf5ff, #f0f0ff)' }
              },
                React.createElement("h4", { className: "text-sm font-black text-purple-800 flex items-center gap-2" }, t('stem.brainatlas.how_neurons_fire_the_action_potential', "\u26A1 How Neurons Fire: The Action Potential")),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2" },
                  React.createElement("div", { className: "rounded-lg bg-white p-3 border border-purple-100" },
                    React.createElement("p", { className: "text-[11px] font-bold text-purple-600 uppercase mb-1" }, t('stem.brainatlas.ion_chemistry', "\uD83E\uDDEA Ion Chemistry")),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, t('stem.brainatlas.at_rest_the_neuron_is_polarized_at_70m', "At rest, the neuron is polarized at -70mV. Na\u207A (sodium) is concentrated outside; K\u207A (potassium) inside. The Na\u207A/K\u207A pump maintains this gradient using ATP energy (3 Na\u207A out, 2 K\u207A in)."))
                  ),
                  React.createElement("div", { className: "rounded-lg bg-white p-3 border border-purple-100" },
                    React.createElement("p", { className: "text-[11px] font-bold text-orange-600 uppercase mb-1" }, t('stem.brainatlas.all_or_nothing_firing', "\u26A1 All-or-Nothing Firing")),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, t('stem.brainatlas.when_stimulation_reaches_threshold_55m', "When stimulation reaches threshold (-55mV), voltage-gated Na\u207A channels open and the neuron fires at FULL strength. There is no \u201Chalf\u201D signal \u2014 it either fires completely or not at all. Stronger stimuli increase firing RATE, not intensity."))
                  ),
                  React.createElement("div", { className: "rounded-lg bg-white p-3 border border-purple-100" },
                    React.createElement("p", { className: "text-[11px] font-bold text-green-600 uppercase mb-1" }, t('stem.brainatlas.recovery_cycle', "\uD83D\uDD04 Recovery Cycle")),
                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, t('stem.brainatlas.after_firing_na_channels_close_k_chann', "After firing: Na\u207A channels close, K\u207A channels open \u2192 repolarization. The membrane briefly overshoots to -80mV (hyperpolarization), creating a refractory period where the neuron cannot fire again. This ensures one-way signal travel."))
                  )
                ),
                React.createElement("p", { className: "text-[11px] text-purple-500 italic text-center" }, t('stem.brainatlas.saltatory_conduction_signals_jump_betw', "Saltatory conduction: signals \u201Cjump\u201D between Nodes of Ranvier along the myelinated axon, increasing speed from ~2 m/s to ~120 m/s."))
              ),

              // \u2500\u2500\u2500 Stimulation Lab (predict the effect) \u2500\u2500\u2500
              currentView.isStim && React.createElement("div", { className: "bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3" },
                React.createElement("div", { className: "flex items-center justify-between" },
                  React.createElement("h4", { className: "font-black text-amber-800 text-sm" }, t('stem.brainatlas.stimulation_lab_2', "\u26A1 Stimulation Lab")),
                  React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700" }, "\u2B50 " + (d.stimScore || 0))
                ),
                React.createElement("p", { className: "text-[11px] text-slate-500 italic" }, t('stem.brainatlas.wilder_penfield_mapped_the_brain_by_ge', "Wilder Penfield mapped the brain by gently stimulating awake patients during surgery. Predict what the patient would experience.")),
                (function () {
                  var sc = STIM_SCENARIOS[(d.stimIdx || 0) % STIM_SCENARIOS.length];
                  var fb = d.stimFeedback; var show = fb !== null && fb !== undefined;
                  return React.createElement("div", { className: "space-y-2" },
                    React.createElement("p", { className: "text-sm text-slate-800 font-bold" }, t('stem.brainatlas.electrode_on', "Electrode on: "), React.createElement("span", { className: "text-amber-700" }, sc.target)),
                    React.createElement("p", { className: "text-xs text-slate-600" }, t('stem.brainatlas.what_does_the_awake_patient_experience', "What does the awake patient experience?")),
                    React.createElement("div", { role: "radiogroup", "aria-label": t('stem.brainatlas.predict_the_effect_of_stimulation', "Predict the effect of stimulation"), className: "grid grid-cols-1 gap-1.5" },
                      sc.options.map(function (optText, oi) {
                        var isCorrect = oi === sc.correctIdx; var wasChosen = show && fb.chosen === oi;
                        return React.createElement("button", { key: oi, role: "radio", "aria-checked": !!wasChosen, disabled: show,
                          onClick: function () { upd('stimFeedback', { chosen: oi, correct: isCorrect }); if (isCorrect) upd('stimScore', (d.stimScore || 0) + 1); if (typeof announceToSR === 'function') announceToSR(isCorrect ? 'Correct.' : 'Not quite.'); },
                          className: "w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium border-2 transition-all " +
                            (show && isCorrect ? 'border-green-400 bg-green-50 text-green-800' : show && wasChosen ? 'border-red-400 bg-red-50 text-red-700' : 'transition-colors border-slate-200 hover:border-amber-300 text-slate-600 hover:bg-amber-50 active:scale-[0.97]')
                        }, (show && isCorrect ? '\u2705 ' : show && wasChosen ? '\u274C ' : '') + optText);
                      })
                    ),
                    show && React.createElement('div', { className: 'rounded-lg p-3 text-xs leading-relaxed ' + (fb.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      React.createElement('p', { className: 'font-black ' + (fb.correct ? 'text-green-800' : 'text-amber-800') }, fb.correct ? '\u2705 Correct!' : '\u274C The answer:'),
                      React.createElement('p', { className: 'text-slate-700' }, sc.note)
                    ),
                    show && React.createElement('button', { 'aria-label': t('stem.brainatlas.next_stimulation', 'Next stimulation'),
                      onClick: function () { upd('stimIdx', (d.stimIdx || 0) + 1); upd('stimFeedback', null); },
                      className: 'transition-colors w-full py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 active:scale-[0.97]' }, t('stem.brainatlas.next', 'Next \u2192'))
                  );
                })()
              ),

              // --- Patient Simulator (AI; guess the region from behavior) ---
              currentView.isStim && aiHintsEnabled && React.createElement("div", { className: "bg-white rounded-xl border-2 border-sky-200 p-4 space-y-3 mt-3" },
                React.createElement("div", { className: "flex items-center justify-between" },
                  React.createElement("h4", { className: "font-black text-sky-800 text-sm" }, t('stem.brainatlas.patient_simulator_ai', "\uD83E\uDDD1\u200D\u2695\uFE0F Patient Simulator (AI)")),
                  React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700" }, "\u2B50 " + (d.patientScore || 0))
                ),
                React.createElement("p", { className: "text-[11px] text-slate-500 italic" }, t('stem.brainatlas.a_simulated_patient_ai_reacts_to_a_hid', "A simulated patient (AI) reacts to a hidden stimulation. Read what they say, then guess which region was stimulated. The patient never names the region.")),
                (function () {
                  var loading = !!d.patientLoading; var text = d.patientText || ""; var opts = d.patientOpts || []; var guess = d.patientGuess;
                  var show = guess !== null && guess !== undefined;
                  if (!text && !loading) { return React.createElement("button", { onClick: startPatient, className: "transition-colors w-full py-2 rounded-lg text-xs font-bold bg-sky-700 text-white hover:bg-sky-800 active:scale-[0.97]" }, t('stem.brainatlas.stimulate_the_patient', "\u26A1 Stimulate the patient")); }
                  if (loading) { return React.createElement("p", { className: "text-xs text-sky-700 italic py-2" }, t('stem.brainatlas.the_patient_is_responding', "\u23F3 The patient is responding...")); }
                  return React.createElement("div", { className: "space-y-2" },
                    React.createElement("div", { className: "rounded-lg bg-sky-50 border border-sky-200 p-3" },
                      React.createElement("p", { className: "text-[10px] font-bold text-sky-600 uppercase mb-0.5" }, t('stem.brainatlas.the_patient_says', "The patient says")),
                      React.createElement("p", { className: "text-sm text-slate-800 italic" }, "\u201C" + text + "\u201D")
                    ),
                    React.createElement("p", { className: "text-xs text-slate-600 font-bold" }, t('stem.brainatlas.which_region_was_stimulated', "Which region was stimulated?")),
                    React.createElement("div", { role: "radiogroup", "aria-label": t('stem.brainatlas.guess_the_stimulated_region', "Guess the stimulated region"), className: "grid grid-cols-1 gap-1.5" },
                      opts.map(function (optTarget, oi) {
                        var isCorrect = optTarget === d.patientCorrect; var wasChosen = show && guess.chosen === optTarget;
                        return React.createElement("button", { key: oi, role: "radio", "aria-checked": !!wasChosen, disabled: show,
                          onClick: function () { upd('patientGuess', { chosen: optTarget, correct: isCorrect }); if (isCorrect) upd('patientScore', (d.patientScore || 0) + 1); if (typeof announceToSR === 'function') announceToSR(isCorrect ? 'Correct.' : 'Not quite.'); },
                          className: "w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium border-2 transition-all " +
                            (show && isCorrect ? 'border-green-400 bg-green-50 text-green-800' : show && wasChosen ? 'border-red-400 bg-red-50 text-red-700' : 'transition-colors border-slate-200 hover:border-sky-300 text-slate-600 hover:bg-sky-50 active:scale-[0.97]')
                        }, (show && isCorrect ? '\u2705 ' : show && wasChosen ? '\u274C ' : '') + optTarget);
                      })
                    ),
                    show && React.createElement('div', { className: 'rounded-lg p-3 text-xs leading-relaxed ' + (guess.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      React.createElement('p', { className: 'font-black ' + (guess.correct ? 'text-green-800' : 'text-amber-800') }, guess.correct ? '\u2705 Correct!' : '\u274C The answer: ' + d.patientCorrect),
                      React.createElement('p', { className: 'text-slate-700' }, ((STIM_SCENARIOS.filter(function (x) { return x.target === d.patientCorrect; })[0]) || {}).note || '')
                    ),
                    show && React.createElement('button', { 'aria-label': t('stem.brainatlas.new_patient', 'New patient'),
                      onClick: function () { upd('patientIdx', (d.patientIdx || 0) + 1); upd('patientText', ''); upd('patientGuess', null); upd('patientOpts', []); },
                      className: 'transition-colors w-full py-2 rounded-lg text-xs font-bold bg-sky-700 text-white hover:bg-sky-800 active:scale-[0.97]' }, t('stem.brainatlas.new_patient_2', 'New patient \u2192'))
                  );
                })()
              ),

              // --- Detail panel (below canvas) ---

              d.quizMode ? (

                quizQ ? React.createElement("div", { className: "brainatlas-detail-panel bg-white rounded-xl border-2 border-green-200 p-4 space-y-3" },

                  React.createElement("div", { className: "flex items-center justify-between mb-2" },

                    React.createElement("h4", { className: "font-bold text-green-800 text-sm" }, t('stem.brainatlas.brain_quiz', "\uD83E\uDDE0 Brain Quiz")),

                    React.createElement("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700" }, "\u2B50 " + (d.quizScore || 0))

                  ),

                  React.createElement("p", { className: "text-sm text-slate-800 font-bold" }, t('stem.brainatlas.what_happens_when_this_region_is_damag', "What happens when this region is damaged?")),

                  React.createElement("p", { className: "text-xs text-purple-700 bg-purple-50 rounded-lg p-3 font-bold" }, quizQ.name),

                  React.createElement("div", { className: "grid grid-cols-1 gap-1.5" },

                    brainQuizOpts.map(function (opt) {

                      var fb = d.quizFeedback;

                      var isCorrect = opt.id === quizQ.id;

                      var wasChosen = fb && fb.chosen === opt.id;

                      var showResult = fb !== null && fb !== undefined;

                      return React.createElement("button", { key: opt.id, disabled: showResult,

                        onClick: function () {

                          var correct = opt.id === quizQ.id;

                          upd('quizFeedback', { chosen: opt.id, correct: correct });

                          if (correct) { upd('quizScore', (d.quizScore || 0) + 1); upd('quizCorrect', (d.quizCorrect || 0) + 1); }

                        },

                        className: "w-full text-left px-3 py-2 rounded-lg text-[11px] leading-relaxed font-medium transition-all border-2 " +

                          (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :

                            showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :

                              'transition-colors border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50 active:scale-[0.97]')

                      }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + (opt.damage || '').substring(0, 100) + ((opt.damage || '').length > 100 ? '...' : ''));

                    })

                  ),

                  d.quizFeedback && React.createElement("div", { className: "rounded-lg p-3 text-xs leading-relaxed space-y-1.5 " + (d.quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },

                    React.createElement("p", { className: "font-black " + (d.quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (d.quizFeedback.correct ? '\u2705 Correct! ' : '\u274C Correct answer for: ') + quizQ.name),

                    React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-slate-600" }, "Function: "), quizQ.fn),

                    quizQ.damage && React.createElement("p", { className: "text-slate-700" }, React.createElement("span", { className: "font-bold text-rose-500" }, t('stem.brainatlas.if_damaged', "\uD83C\uDFE5 If Damaged: ")), quizQ.damage),

                    quizQ.conditions && React.createElement("p", { className: "text-slate-600 italic" }, React.createElement("span", { className: "font-bold text-amber-600" }, t('stem.brainatlas.conditions', "\u26A0 Conditions: ")), quizQ.conditions)

                  ),

                  d.quizFeedback && React.createElement("button", { "aria-label": t('stem.brainatlas.next_question', "Next Question"),

                    onClick: function () { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); },

                    className: "transition-colors w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-700 text-white hover:bg-green-800 active:scale-[0.97]"

                  }, t('stem.brainatlas.next_question_2', "Next Question \u2192"))

                ) : null

              ) : React.createElement(React.Fragment, null,

              // ─── Brainwave Visualizer ───

              currentView.isEEG && React.createElement("div", { className: "rounded-xl border-2 border-purple-200 overflow-hidden", "data-brainatlas-eeg-panel": "true", style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)' } },

                React.createElement("div", { className: "p-3" },

                  React.createElement("div", { className: "flex items-center justify-between mb-2" },

                    React.createElement("div", { className: "flex items-center gap-2" },

                      React.createElement("span", { className: "text-lg" }, "\u{1F9E0}"),

                      React.createElement("h4", { className: "text-sm font-black text-white" }, t('stem.brainatlas.brainwave_visualizer', "Brainwave Visualizer"))

                    ),

                    React.createElement("div", { className: "flex gap-1" },

                      ['delta', 'theta', 'alpha', 'beta', 'gamma'].map(function (waveType) {

                        var WAVE_META = {

                          delta: { label: t('stem.brainatlas.delta', '\u0394 Delta'), freq: '0.5\u20134 Hz', color: '#818cf8', desc: t('stem.brainatlas.deep_sleep_healing_unconscious_process', 'Deep sleep, healing, unconscious processes. Highest amplitude, slowest frequency.') },

                          theta: { label: t('stem.brainatlas.theta', '\u0398 Theta'), freq: '4\u20138 Hz', color: '#a78bfa', desc: t('stem.brainatlas.light_sleep_meditation_creativity_memo', 'Light sleep, meditation, creativity, memory consolidation. "Twilight" state between waking and sleeping.') },

                          alpha: { label: t('stem.brainatlas.alpha', '\u03B1 Alpha'), freq: '8\u201313 Hz', color: '#c084fc', desc: t('stem.brainatlas.relaxed_alertness_calm_focus_mindfulne', 'Relaxed alertness, calm focus, mindfulness. Prominent over occipital cortex; attenuates when the eyes open (Berger effect).') },

                          beta: { label: t('stem.brainatlas.beta', '\u03B2 Beta'), freq: '13\u201330 Hz', color: '#e879f9', desc: t('stem.brainatlas.active_thinking_problem_solving_focuse', 'Active thinking, problem-solving, focused concentration. Dominant during normal waking consciousness.') },

                          gamma: { label: t('stem.brainatlas.gamma', '\u03B3 Gamma'), freq: '30\u2013100 Hz', color: '#f472b6', desc: t('stem.brainatlas.higher_cognitive_processing_peak_aware', 'Higher cognitive processing, peak awareness, information binding across brain regions. Fastest brainwave.') }

                        };

                        var meta = WAVE_META[waveType];

                        var isActive = (d.brainwaveType || 'alpha') === waveType;

                        return React.createElement("button", { key: waveType,

                          onClick: function () { upd('brainwaveType', waveType); },

                          className: "px-2 py-1 rounded-md text-[11px] font-bold transition-all " + (isActive ? 'text-white shadow-lg' : 'transition-colors text-white/70 hover:text-white/90'),

                          style: isActive ? { background: meta.color } : {}

                        }, meta.label);

                      })

                    )

                  ),

                  // Brainwave canvas

                  React.createElement("canvas", { tabIndex: 0,

                    id: "brainwave-canvas",

                    width: 560, height: 160,

                    role: "img",

                    "aria-label": t('stem.brainatlas.eeg_waveform_animation', "EEG waveform animation"),

                    className: "w-full rounded-lg",

                    style: { background: '#0f0b2e' }

                  }),

                  // Info panel

                  (function () {

                    var WAVE_META = {

                      delta: { label: t('stem.brainatlas.delta_2', '\u0394 Delta'), freq: '0.5\u20134 Hz', color: '#818cf8', desc: t('stem.brainatlas.deep_sleep_healing_unconscious_process_2', 'Deep sleep, healing, unconscious processes. Highest amplitude, slowest frequency.'), amp: 'Highest (75\u2013200 \u00B5V)', states: 'Deep sleep (NREM Stage 3\u20134), coma, infants', eeg: 'Frontal (adults), posterior (children)' },

                      theta: { label: t('stem.brainatlas.theta_2', '\u0398 Theta'), freq: '4\u20138 Hz', color: '#a78bfa', desc: t('stem.brainatlas.light_sleep_meditation_creativity_memo_2', 'Light sleep, meditation, creativity, memory consolidation. Twilight state.'), amp: 'Medium-High (20\u201375 \u00B5V)', states: 'Drowsiness, light sleep, meditation, memory encoding', eeg: 'Temporal, frontal midline' },

                      alpha: { label: t('stem.brainatlas.alpha_2', '\u03B1 Alpha'), freq: '8\u201313 Hz', color: '#c084fc', desc: t('stem.brainatlas.relaxed_alertness_calm_focus_mindfulne_2', 'Relaxed alertness, calm focus, mindfulness. Prominent over occipital cortex; attenuates with eye opening.'), amp: 'Medium (30\u201350 \u00B5V)', states: 'Eyes closed, relaxed, calm alertness, mindfulness', eeg: 'Posterior (occipital), attenuates with eye opening' },

                      beta: { label: t('stem.brainatlas.beta_2', '\u03B2 Beta'), freq: '13\u201330 Hz', color: '#e879f9', desc: t('stem.brainatlas.active_thinking_problem_solving_focuse_2', 'Active thinking, problem-solving, focused concentration. Normal waking consciousness.'), amp: 'Low (5\u201330 \u00B5V)', states: 'Active thinking, anxiety, concentration, motor planning', eeg: 'Frontal, central (Rolandic beta)' },

                      gamma: { label: t('stem.brainatlas.gamma_2', '\u03B3 Gamma'), freq: '30\u2013100 Hz', color: '#f472b6', desc: t('stem.brainatlas.higher_cognitive_processing_peak_aware_2', 'Higher cognitive processing, peak awareness, cross-region information binding.'), amp: 'Very Low (< 5 \u00B5V)', states: 'Perception binding, peak focus, advanced meditation', eeg: 'Widespread, somatosensory cortex' }

                    };

                    var activeWave = WAVE_META[d.brainwaveType || 'alpha'];

                    return React.createElement("div", { className: "mt-2 grid grid-cols-2 gap-2" },

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[11px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, t('stem.brainatlas.frequency', "Frequency")),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.freq)

                      ),

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[11px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, t('stem.brainatlas.amplitude', "Amplitude")),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.amp)

                      ),

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[11px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, t('stem.brainatlas.mental_states', "Mental States")),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.states)

                      ),

                      React.createElement("div", { className: "rounded-lg p-2", style: { background: activeWave.color + '15', border: '1px solid ' + activeWave.color + '33' } },

                        React.createElement("p", { className: "text-[11px] font-bold uppercase mb-0.5", style: { color: activeWave.color } }, t('stem.brainatlas.eeg_location', "EEG Location")),

                        React.createElement("p", { className: "text-xs text-white/80" }, activeWave.eeg)

                      )

                    );

                  })(),

                  React.createElement("p", { className: "text-[11px] text-white/55 mt-2 italic text-center" }, (function () {

                    var WAVE_META = {

                      delta: { desc: t('stem.brainatlas.deep_sleep_healing_highest_amplitude_s', 'Deep sleep, healing. Highest amplitude, slowest frequency. Dominant in infants and during deep non-REM sleep.') },

                      theta: { desc: t('stem.brainatlas.light_sleep_meditation_creativity_the_', 'Light sleep, meditation, creativity. The twilight state between waking and sleeping. Linked to memory consolidation.') },

                      alpha: { desc: t('stem.brainatlas.relaxed_alertness_calm_focus_prominent', 'Relaxed alertness, calm focus. Prominent over occipital cortex during relaxed, eyes-closed wakefulness. Blocked by opening eyes (Berger effect).') },

                      beta: { desc: t('stem.brainatlas.active_thinking_problem_solving_domina', 'Active thinking, problem-solving. Dominant during normal waking consciousness. Excess linked to anxiety.') },

                      gamma: { desc: t('stem.brainatlas.peak_cognitive_processing_cross_region', 'Peak cognitive processing, cross-region binding. Fastest brainwave. Associated with advanced meditation and heightened perception.') }

                    };

                    return WAVE_META[d.brainwaveType || 'alpha'].desc;

                  })())

                )

              ),

              // ─── Brainwave canvas renderer (async) ───

              currentView.isEEG && (function () {

                setTimeout(function () {

                  var canvas = document.getElementById('brainwave-canvas');

                  if (!canvas) {
                    try { if (window.__alloBrainwaveCanvasCleanup) window.__alloBrainwaveCanvasCleanup(); } catch (e) {}
                    return;
                  }
                  if (canvas._bwCleanup) canvas._bwCleanup();
                  else if (canvas._bwAnimFrame) { cancelAnimationFrame(canvas._bwAnimFrame); canvas._bwAnimFrame = null; }
                  try { if (window.__alloBrainwaveCanvasCleanup && window.__alloBrainwaveCanvasCleanup !== canvas._bwCleanup) window.__alloBrainwaveCanvasCleanup(); } catch (e) {}

                  // PL7 HiDPI: crisp rendering on retina displays.
                  if (window.StemLab && window.StemLab.setupHiDPI) {
                    window.StemLab.setupHiDPI(canvas, canvas._logicalW || canvas.width, canvas._logicalH || canvas.height);
                  }
                  var ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  if (canvas._dpr) ctx.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);

                  var W = canvas._logicalW || canvas.width, H = canvas._logicalH || canvas.height;

                  var tick = 0;

                  var WAVE_PARAMS = {

                    delta: { freq: 1.5, amp: 0.85, color: '#818cf8', lineWidth: 3 },

                    theta: { freq: 3, amp: 0.65, color: '#a78bfa', lineWidth: 2.5 },

                    alpha: { freq: 5, amp: 0.50, color: '#c084fc', lineWidth: 2.5 },

                    beta: { freq: 10, amp: 0.30, color: '#e879f9', lineWidth: 2 },

                    gamma: { freq: 22, amp: 0.18, color: '#f472b6', lineWidth: 1.5 }

                  };
                  var bwAlive = true;

                  function isBrainwaveHidden() {
                    return typeof document !== 'undefined' && !!document.hidden;
                  }

                  function cancelBrainwaveFrame() {
                    if (canvas._bwAnimFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvas._bwAnimFrame);
                    canvas._bwAnimFrame = null;
                  }

                  function scheduleBrainwaveFrame() {
                    if (!bwAlive || prefersReducedMotion || canvas._bwAnimFrame || isBrainwaveHidden()) return;
                    if (typeof requestAnimationFrame !== 'function') return;
                    canvas._bwAnimFrame = requestAnimationFrame(drawFrame);
                  }

                  function cleanupBrainwaveCanvas() {
                    bwAlive = false;
                    cancelBrainwaveFrame();
                    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onBrainwaveVisibilityChange);
                    if (window.__alloBrainwaveCanvasCleanup === canvas._bwCleanup) window.__alloBrainwaveCanvasCleanup = null;
                    canvas._bwCleanup = null;
                  }

                  function onBrainwaveVisibilityChange() {
                    if (!bwAlive) return;
                    if (!canvas.isConnected) { cleanupBrainwaveCanvas(); return; }
                    if (isBrainwaveHidden()) cancelBrainwaveFrame();
                    else { cancelBrainwaveFrame(); drawFrame(); }
                  }

                  canvas._bwCleanup = cleanupBrainwaveCanvas;
                  try { window.__alloBrainwaveCanvasCleanup = canvas._bwCleanup; } catch (e) {}
                  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onBrainwaveVisibilityChange);

                  function drawFrame() {

                    if (!bwAlive) return;
                    canvas._bwAnimFrame = null;
                    if (!canvas.isConnected) { cleanupBrainwaveCanvas(); return; }
                    if (isBrainwaveHidden()) { cancelBrainwaveFrame(); return; }
                    if (!prefersReducedMotion) tick += 0.8;

                    ctx.fillStyle = 'rgba(15, 11, 46, 0.15)';

                    ctx.fillRect(0, 0, W, H);

                    // Grid lines

                    ctx.strokeStyle = 'rgba(255,255,255,0.04)';

                    ctx.lineWidth = 1;

                    for (var gy = 1; gy < 4; gy++) {

                      ctx.beginPath();

                      ctx.moveTo(0, H * gy / 4);

                      ctx.lineTo(W, H * gy / 4);

                      ctx.stroke();

                    }

                    // Draw all waves faintly, active wave bright

                    var activeType = (canvas.closest && canvas.closest('[class*="border-purple"]')) ? null : null;

                    var types = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

                    // Read active type from parent

                    var btns = canvas.parentElement ? canvas.parentElement.querySelectorAll('button[class*="shadow-lg"]') : [];

                    var activeKey = 'alpha';

                    btns.forEach(function (btn) {

                      types.forEach(function (t) { if (btn.textContent && btn.textContent.toLowerCase().includes(t.substring(0, 4))) activeKey = t; });

                    });

                    for (var ti = 0; ti < types.length; ti++) {

                      var t = types[ti];

                      var p = WAVE_PARAMS[t];

                      var isActive = t === activeKey;

                      ctx.beginPath();

                      ctx.strokeStyle = isActive ? p.color : (p.color + '22');

                      ctx.lineWidth = isActive ? p.lineWidth + 1 : 1;

                      if (isActive) {

                        ctx.shadowColor = p.color;

                        ctx.shadowBlur = 12;

                      }

                      var midY = H / 2;

                      var ampPx = midY * p.amp * (isActive ? 1 : 0.3);

                      for (var x = 0; x < W; x++) {

                        var phase = (x / W) * Math.PI * 2 * p.freq + tick * 0.02 * p.freq;

                        // Add slight noise for realism

                        var noise = isActive ? Math.sin(phase * 3.7 + tick * 0.1) * ampPx * 0.08 : 0;

                        var y = midY + Math.sin(phase) * ampPx + noise;

                        if (x === 0) ctx.moveTo(x, y);

                        else ctx.lineTo(x, y);

                      }

                      ctx.stroke();

                      ctx.shadowBlur = 0;

                    }

                    // Label

                    ctx.fillStyle = WAVE_PARAMS[activeKey].color;

                    ctx.font = 'bold 11px Inter, system-ui';

                    ctx.textAlign = 'right';

                    ctx.fillText(activeKey.charAt(0).toUpperCase() + activeKey.slice(1) + ' Waves', W - 12, 18);

                    ctx.fillStyle = 'rgba(255,255,255,0.3)';

                    ctx.font = '9px Inter, system-ui';

                    ctx.fillText(WAVE_PARAMS[activeKey].freq.toFixed(0) + 'x base freq | Amp: ' + (WAVE_PARAMS[activeKey].amp * 100).toFixed(0) + '%', W - 12, 32);

                    // Time axis

                    ctx.fillStyle = 'rgba(255,255,255,0.15)';

                    ctx.font = '8px monospace';

                    ctx.textAlign = 'center';

                    for (var s = 1; s <= 3; s++) { ctx.fillText(s + 's', W * s / 4, H - 4); }
                    scheduleBrainwaveFrame();

                  }

                  drawFrame();

                }, 50);

                return null;

              })(),

                sel ? (

                  React.createElement("div", {
                    className: "brainatlas-detail-panel bg-white rounded-xl border-2 border-purple-200 p-4 space-y-3",
                    "data-brainatlas-detail-panel": "true",
                    "data-brainatlas-detail-mode": detailMode
                  },

                    React.createElement("div", {
                      className: "brainatlas-detail-focus-header",
                      "data-brainatlas-detail-focus": "true"
                    },
                      React.createElement("div", { className: "brainatlas-detail-focus-copy" },
                        React.createElement("p", { className: "brainatlas-detail-focus-label" },
                          React.createElement("span", { className: "brainatlas-detail-focus-dot", "aria-hidden": "true" }),
                          t('stem.brainatlas.selected_region', 'Selected region') || 'Selected region'
                        ),
                        React.createElement("h4", { className: "brainatlas-detail-focus-title" }, sel.name),
                        React.createElement("p", { className: "brainatlas-detail-context" }, currentView.name + ' \u00B7 ' + activeViewGroup.label)
                      ),
                      React.createElement("button", {
                        type: "button",
                        "aria-label": t('stem.brainatlas.close_region_detail_panel', "Close region detail panel") || "Close region detail panel",
                        title: t('stem.brainatlas.close_region_detail_panel', "Close region detail panel") || "Close region detail panel",
                        onClick: function () { upd('selectedRegion', null); },
                        className: "brainatlas-detail-close active:scale-[0.97]"
                      }, React.createElement(X, { size: 16 }))
                    ),

                    React.createElement("div", { className: "brainatlas-detail-toolbar" },
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-[11px] font-black uppercase text-slate-700 m-0" }, t('stem.brainatlas.detail_view', 'Detail view')),
                        React.createElement("p", { className: "text-[10px] text-slate-600 m-0" }, showAdvancedDetail ? t('stem.brainatlas.advanced_detail_note', 'Advanced anatomy, pathways, and clinical context are visible.') : t('stem.brainatlas.plain_detail_note', 'Plain view keeps the high-value student takeaways visible first.'))
                      ),
                      React.createElement("div", {
                        className: "brainatlas-detail-toggle",
                        role: "group",
                        "aria-label": t('stem.brainatlas.detail_density', 'Detail density'),
                        "data-brainatlas-detail-toggle": "true"
                      },
                        React.createElement("button", {
                          type: "button",
                          "aria-pressed": detailMode === 'plain' ? "true" : "false",
                          onClick: function () { upd('detailMode', 'plain'); }
                        }, t('stem.brainatlas.plain_view', 'Plain view')),
                        React.createElement("button", {
                          type: "button",
                          "aria-pressed": showAdvancedDetail ? "true" : "false",
                          onClick: function () { upd('detailMode', 'advanced'); }
                        }, t('stem.brainatlas.advanced', 'Advanced'))
                      )
                    ),

                    React.createElement("div", {
                      className: "brainatlas-detail-takeaways",
                      "data-brainatlas-detail-takeaways": "true"
                    },
                      [
                        {
                          label: t('stem.brainatlas.quick_function', 'Function') || 'Function',
                          text: brainAtlasShortText(sel.fn, 116),
                          color: '#7c3aed'
                        },
                        {
                          label: t('stem.brainatlas.quick_watch_for', 'Watch for') || 'Watch for',
                          text: brainAtlasShortText(sel.conditions || sel.blood || sel.category || currentView.desc, 116),
                          color: '#d97706'
                        },
                        {
                          label: t('stem.brainatlas.quick_if_damaged', 'If damaged') || 'If damaged',
                          text: brainAtlasShortText(sel.damage || t('stem.brainatlas.damage_depends_on_circuit', 'Effects depend on the connected circuit and task being tested.'), 116),
                          color: '#e11d48'
                        }
                      ].map(function (item) {
                        return React.createElement("div", {
                          key: item.label,
                          className: "brainatlas-detail-takeaway",
                          style: { borderLeftColor: item.color }
                        },
                          React.createElement("strong", null, item.label),
                          React.createElement("span", null, item.text)
                        );
                      })
                    ),

                    React.createElement("div", { className: "space-y-2.5" },

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-0.5" }, t('stem.brainatlas.function', "Function")),

                        React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, sel.fn)

                      ),

                      React.createElement("div", { className: "brainatlas-plain-summary", "data-brainatlas-plain-summary": "true" },

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-0.5" }, t('stem.brainatlas.student_takeaway', 'Student takeaway')),

                        React.createElement("p", null, brainAtlasPlainTakeaway(sel))

                      ),

                      showAdvancedDetail && sel.brodmann && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-0.5" }, t('stem.brainatlas.brodmann_areas', "Brodmann Areas")),

                        React.createElement("p", { className: "text-xs text-purple-600 font-mono" }, sel.brodmann)

                      ),

                      showAdvancedDetail && sel.blood && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-0.5" }, t('stem.brainatlas.blood_supply', "Blood Supply")),

                        React.createElement("p", { className: "text-xs text-red-600" }, sel.blood)

                      ),

                      showAdvancedDetail && sel.category && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-purple-500 uppercase mb-0.5" }, t('stem.brainatlas.category', "\u2697\uFE0F Category")),

                        React.createElement("p", { className: "text-xs text-purple-700 font-semibold" }, sel.category)

                      ),

                      showAdvancedDetail && sel.synthesis && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-0.5" }, t('stem.brainatlas.synthesis_pathway', "\uD83E\uDDEC Synthesis Pathway")),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-purple-50 rounded-lg p-2" }, sel.synthesis)

                      ),

                      showAdvancedDetail && sel.receptors && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-0.5" }, t('stem.brainatlas.receptor_subtypes', "\uD83C\uDFAF Receptor Subtypes")),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-indigo-50 rounded-lg p-2" }, sel.receptors)

                      ),

                      showAdvancedDetail && sel.pathways && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-0.5" }, t('stem.brainatlas.neural_pathways', "\uD83D\uDEE4\uFE0F Neural Pathways")),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-teal-50 rounded-lg p-2" }, sel.pathways)

                      ),

                      showAdvancedDetail && sel.drugs && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-blue-600 uppercase mb-0.5" }, t('stem.brainatlas.pharmacology', "\uD83D\uDC8A Pharmacology")),

                        React.createElement("p", { className: "text-xs text-blue-800 leading-relaxed bg-blue-50 border border-blue-200 rounded-lg p-2" }, sel.drugs)

                      ),

                      sel.conditions && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-amber-600 uppercase mb-0.5" }, t('stem.brainatlas.associated_conditions', "\u26A0 Associated Conditions")),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-amber-50 rounded-lg p-2" }, sel.conditions)

                      ),

                      sel.damage && React.createElement("div", null,

                        React.createElement("p", { className: "text-[11px] font-bold text-rose-500 uppercase mb-0.5" }, t('stem.brainatlas.if_damaged_2', "\uD83C\uDFE5 If Damaged")),

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2" }, sel.damage)

                      ),



                      // ── AI Explain at my level (reading-level aware) ──

                      (function () {

                        if (!aiHintsEnabled) return null;

                        var aiKey = '_ai_' + sel.id;

                        var aiLevelKey = '_aiLevel_' + sel.id;

                        var aiLoadingKey = '_aiLoading_' + sel.id;

                        var aiErrorKey = '_aiError_' + sel.id;

                        var aiText = d[aiKey] || '';

                        var aiLevel = d[aiLevelKey] || 'grade5';

                        var aiLoading = !!d[aiLoadingKey];

                        var aiError = d[aiErrorKey] || '';

                        var LEVELS = [

                          { id: 'plain', label: t('stem.brainatlas.plain', 'Plain'), promptHint: 'using simple everyday words and short sentences, no jargon' },

                          { id: 'grade5', label: t('stem.brainatlas.grade_5', 'Grade 5'), promptHint: 'for a 5th grade student, brief and friendly' },

                          { id: 'hs', label: t('stem.brainatlas.high_school', 'High School'), promptHint: 'for a high school student, scientifically accurate but accessible' }

                        ];

                        function explain() {

                          if (!aiHintsEnabled || typeof callGemini !== 'function') { upd(aiErrorKey, 'AI tutor not available.'); return; }

                          upd(aiLoadingKey, true); upd(aiErrorKey, ''); upd(aiKey, '');

                          var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];

                          var parts = [];

                          parts.push('Brain region: ' + sel.name + '.');

                          parts.push('Function: ' + sel.fn + '.');

                          if (sel.conditions) parts.push('Associated conditions: ' + sel.conditions + '.');

                          if (sel.damage) parts.push('Damage effects: ' + sel.damage + '.');

                          if (sel.drugs) parts.push('Related pharmacology: ' + sel.drugs + '.');

                          var prompt = 'Explain this brain region ' + lv.promptHint + '. '

                            + parts.join(' ') + ' '

                            + 'In 2-3 short sentences, explain (a) what this region does, (b) a concrete everyday example or analogy, and (c) why it matters. '

                            + 'If any function listed is a simplification or a contested single-region claim (for example dopamine as the "pleasure chemical", or pinning empathy, theory of mind, or consciousness to one region), say so briefly in plain words. '

                            + 'No markdown, no bullets, no headings. Use plain prose.';

                          callGemini(prompt, false, false, 0.5).then(function (resp) {

                            upd(aiKey, String(resp || '').trim());

                            upd(aiLoadingKey, false);

                            if (typeof announceToSR === 'function') announceToSR('Explanation ready for ' + sel.name + '.');

                          }).catch(function () {

                            upd(aiLoadingKey, false);

                            upd(aiErrorKey, 'Could not reach AI tutor. Try again in a moment.');

                          });

                        }

                        return React.createElement("div", { className: "pt-2 border-t border-slate-200" },

                          React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },

                            React.createElement("p", { className: "text-[11px] font-bold text-purple-600 uppercase" }, t('stem.brainatlas.explain_at_my_level', "\u2728 Explain at my level")),

                            React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": t('stem.brainatlas.reading_level', "Reading level") },

                              LEVELS.map(function (L) {

                                var active = aiLevel === L.id;

                                return React.createElement("button", {

                                  key: L.id,

                                  onClick: function () { upd(aiLevelKey, L.id); },

                                  "aria-label": "Reading level: " + L.label + (active ? " (selected)" : ""),

                                  "aria-pressed": active,

                                  className: "px-2 py-0.5 rounded text-[10px] font-bold " + (active ? 'bg-purple-600 text-white' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-purple-50 active:scale-[0.97]')

                                }, L.label);

                              })

                            ),

                            React.createElement("button", {

                              onClick: explain,

                              disabled: aiLoading,

                              "aria-label": "Generate AI explanation for " + sel.name + " at " + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + " level",

                              className: "transition-colors px-2.5 py-1 rounded text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 active:scale-[0.97]"

                            }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))

                          ),

                          aiError && React.createElement("p", { className: "text-[11px] text-rose-600", role: "alert" }, aiError),

                          aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-purple-50 rounded-lg p-2" }, aiText)

                        );

                      })()

                    )

                  )

                ) : (

                  React.createElement("div", {
                    className: "brainatlas-region-list-card",
                    "data-brainatlas-region-list": "true",
                    role: "region",
                    "aria-labelledby": "brainatlas-region-directory-title"
                  },
                    React.createElement("div", { className: "brainatlas-region-list-head" },
                      React.createElement("div", { className: "brainatlas-region-list-title-group" },
                        React.createElement("p", { className: "brainatlas-region-list-eyebrow" }, t('stem.brainatlas.explore_the_diagram', 'Explore the diagram') || 'Explore the diagram'),
                        React.createElement("h3", { id: "brainatlas-region-directory-title", className: "brainatlas-region-list-title" }, t('stem.brainatlas.region_directory', 'Region directory'))
                      ),
                      React.createElement("p", {
                        className: "brainatlas-region-list-note",
                        role: "status",
                        "aria-live": "polite"
                      }, filtered.length + " shown")
                    ),

                    React.createElement("div", { className: "brainatlas-study-strip", "data-brainatlas-study-strip": "true" },

                      React.createElement("div", { className: "brainatlas-study-step" },
                        React.createElement("strong", null, t('stem.brainatlas.study_step_select', '1. Select')),
                        React.createElement("span", null, t('stem.brainatlas.study_step_select_note', 'Pick a region from the atlas or list.'))
                      ),

                      React.createElement("div", { className: "brainatlas-study-step" },
                        React.createElement("strong", null, t('stem.brainatlas.study_step_connect', '2. Connect')),
                        React.createElement("span", null, t('stem.brainatlas.study_step_connect_note', 'Read function, blood supply, and conditions.'))
                      ),

                      React.createElement("div", { className: "brainatlas-study-step" },
                        React.createElement("strong", null, t('stem.brainatlas.study_step_practice', '3. Practice')),
                        React.createElement("span", null, t('stem.brainatlas.study_step_practice_note', 'Use quiz or Function Match when ready.'))
                      )

                    ),

                    React.createElement("div", {
                      className: "brainatlas-region-list",
                      "aria-label": t('stem.brainatlas.available_regions', 'Available regions') || 'Available regions'
                    },
                      filtered.length === 0 && React.createElement("div", {
                        className: "brainatlas-empty-results",
                        "data-brainatlas-empty-results": "true"
                      },
                        React.createElement("strong", null, t('stem.brainatlas.no_regions_match_your_search', "No regions match your search.")),
                        React.createElement("span", null, t('stem.brainatlas.try_a_broader_search', 'Try a broader term, search by function, or reset the directory.') || 'Try a broader term, search by function, or reset the directory.'),
                        React.createElement("button", {
                          type: "button",
                          "data-brainatlas-empty-clear": "true",
                          onClick: function () { upd('search', ''); }
                        }, t('stem.brainatlas.clear_search', 'Clear search') || 'Clear search')
                      ),
                      filtered.map(function (r, regionIndex) {
                        return React.createElement("button", { key: r.id,
                          type: "button",
                          "data-brainatlas-region-button": "true",
                          "aria-label": (t('stem.brainatlas.open_region_details', 'Open region details for') || 'Open region details for') + ' ' + r.name,
                          onClick: function () { upd('selectedRegion', r.id); },
                          className: "brainatlas-region-item w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:shadow-sm " +
                            (d.selectedRegion === r.id ? 'font-bold border-2 border-purple-400 bg-purple-50' : 'transition-colors bg-slate-50 hover:bg-white border border-slate-400 active:scale-[0.97]')
                        },
                          React.createElement("span", {
                            className: "brainatlas-region-index",
                            "data-brainatlas-region-index": "true",
                            "aria-hidden": "true"
                          }, regionIndex + 1),
                          React.createElement("div", { className: "brainatlas-region-item-body" },
                            React.createElement("div", { className: "brainatlas-region-item-name font-bold text-slate-800" }, r.name),
                            React.createElement("div", { className: "brainatlas-region-item-copy" }, r.fn.substring(0, 120) + (r.fn.length > 120 ? '...' : ''))
                          ),
                          React.createElement("span", { className: "brainatlas-region-item-cue", "aria-hidden": "true" }, '\u2192')
                        );
                      })
                    )

                  )

                )

              )

            )

          );
      })();
    }
  });

})();
