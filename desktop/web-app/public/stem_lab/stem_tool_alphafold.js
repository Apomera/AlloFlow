// AlloFlow STEAM Lab - AlphaFold Explorer launcher + AI bridge
//
// The explorer itself is a companion window:
//   alphafold_explorer/alphafold_explorer.html
//
// It uses the same Canvas escape-hatch pattern as Molecule Shelf/Data Lab:
// open a top-level browser window, keep AlloFlow as the AI bridge, and avoid
// submitting anything automatically to AlphaFold Server. Students can inspect
// public AlphaFold DB structures, import downloaded result files, and prepare
// AlphaFold Server or AlphaFold 3 local-code JSON for teacher-approved,
// non-sensitive classroom sequences.
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var ALPHAFOLD_CDN_URL = 'https://alloflow-cdn.pages.dev/alphafold_explorer/alphafold_explorer.html?v=2';

  function companionUrl(path, cdnUrl) {
    try {
      var loc = window.location || {};
      var host = loc.hostname || '';
      var pathname = loc.pathname || '';
      var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      var isAlloHosted = /^alloflow-cdn\.pages\.dev$/i.test(host) || /^(?:(?:www|app|cdn)\.)?alloflow\.org$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return cdnUrl;
  }

  var ALPHAFOLD_URL = companionUrl('alphafold_explorer/alphafold_explorer.html?v=2', ALPHAFOLD_CDN_URL);
  // Bridge trust: only the pop-up this tool opened, at the companion's own origin,
  // may drive the bridge. Opaque origins (file://) report "null", which postMessage
  // rejects as a target, so those fall back to '*' and rely on the source check.
  var ALPHAFOLD_ORIGIN = (function () {
    try { var o = new URL(ALPHAFOLD_URL, (window.location && window.location.href) || undefined).origin; return (o && o !== 'null') ? o : '*'; } catch (_) { return '*'; }
  })();
  var _alphafoldPopup = null; // module scope: a still-open pop-up keeps working after a remount
  function _alphafoldBridgeTrusted(ev, win) {
    var src = ev && ev.source;
    if (!src || (src !== win && src !== _alphafoldPopup)) return false;
    return ALPHAFOLD_ORIGIN === '*' || ev.origin === ALPHAFOLD_ORIGIN;
  }

  if (typeof document !== 'undefined' && !document.getElementById('alphafold-launcher-css')) {
    var alphaFoldStyle = document.createElement('style');
    alphaFoldStyle.id = 'alphafold-launcher-css';
    alphaFoldStyle.textContent = [
      '.af-launcher{width:min(100%,980px);margin:0 auto;padding:16px;border-radius:20px;display:grid;gap:14px;color:#e2e8f0;background:#07111f;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
      '.af-launcher[data-theme="light"]{background:#f1f7f8;color:#0f172a;border:1px solid #cbd5e1;}',
      '.af-launcher *{box-sizing:border-box;}',
      '.af-launcher :is(button,a,textarea,summary):focus-visible{outline:3px solid #22d3ee;outline-offset:2px;}',
      '.af-mission{position:relative;padding:22px;border:1px solid rgba(45,212,191,.4);border-radius:18px;background:radial-gradient(circle at 92% 8%,rgba(56,189,248,.22),transparent 36%),radial-gradient(circle at 12% 88%,rgba(20,184,166,.16),transparent 34%),linear-gradient(140deg,rgba(15,118,110,.32),rgba(2,6,23,.98) 60%) #020617;color:#e2e8f0;box-shadow:0 18px 44px rgba(2,6,23,.26);}',
      '.af-mission-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;}',
      '.af-mission-copy{flex:1 1 320px;min-width:0;}',
      '.af-badge-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}',
      '.af-eyebrow{margin:0;color:#5eead4;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;}',
      '.af-subject-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border:1px solid rgba(94,234,212,.35);border-radius:999px;background:rgba(15,118,110,.28);color:#ccfbf1;font-size:10px;font-weight:800;letter-spacing:.05em;}',
      '.af-title{margin:0;color:#f8fafc;font-size:clamp(22px,3vw,32px);line-height:1.12;letter-spacing:-.015em;}',
      '.af-subtitle{max-width:680px;margin:8px 0 0;color:#cbd5e1;font-size:13px;line-height:1.58;}',
      '.af-status{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;padding:7px 12px;border:1px solid rgba(94,234,212,.35);border-radius:999px;background:rgba(15,23,42,.82);color:#99f6e4;font-size:11px;font-weight:800;white-space:nowrap;}',
      '.af-status-dot{width:8px;height:8px;border-radius:50%;background:#2dd4bf;box-shadow:0 0 8px #2dd4bf;flex:0 0 8px;}',
      '.af-status[data-state="blocked"] .af-status-dot{background:#fbbf24;box-shadow:0 0 8px #fbbf24;}',
      '.af-stage-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:16px;padding-bottom:10px;border-bottom:1px solid rgba(148,163,184,.18);}',
      '.af-preset-strip{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;}',
      '.af-preset-label{color:#94a3b8;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-right:2px;}',
      '.af-preset-chip{min-height:34px;padding:5px 10px;border:1px solid rgba(148,163,184,.28);border-radius:999px;background:rgba(15,23,42,.72);color:#cbd5e1;font-size:11px;font-weight:750;cursor:pointer;transition:border-color .16s,background .16s,color .16s;}',
      '.af-preset-chip:hover{border-color:#5eead4;color:#f8fafc;}',
      '.af-preset-chip[aria-pressed="true"]{border-color:#2dd4bf;background:rgba(20,184,166,.24);color:#f0fdfa;box-shadow:0 0 0 1px rgba(45,212,191,.35);}',
      '.af-stage-tabs{display:inline-flex;gap:4px;padding:3px;border:1px solid rgba(148,163,184,.24);border-radius:10px;background:rgba(2,6,23,.72);}',
      '.af-stage-tab{min-height:32px;padding:5px 11px;border:0;border-radius:7px;background:transparent;color:#94a3b8;font-size:11px;font-weight:800;cursor:pointer;transition:background .16s,color .16s;}',
      '.af-stage-tab:hover{color:#e2e8f0;}',
      '.af-stage-tab[aria-selected="true"]{background:linear-gradient(135deg,#0f766e,#0369a1);color:#ffffff;}',
      '.af-confidence-atlas{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(240px,.55fr);gap:12px;margin-top:12px;align-items:stretch;}',
      '.af-protein-viz{display:flex;flex-direction:column;justify-content:space-between;min-width:0;border:1px solid rgba(94,234,212,.26);border-radius:16px;background:radial-gradient(circle at 30% 42%,rgba(14,165,233,.16),transparent 38%),linear-gradient(150deg,rgba(15,23,42,.92),rgba(2,6,23,.98)) #020617;padding:10px 12px;}',
      '.af-viz-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px;}',
      '.af-viz-label{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border:1px solid rgba(125,211,252,.28);border-radius:999px;background:rgba(2,6,23,.82);color:#bae6fd;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;}',
      '.af-viz-acc{color:#99f6e4;font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;}',
      '.af-protein-viz svg{display:block;width:100%;height:auto;max-height:224px;}',
      '.af-viz-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:6px;padding-top:6px;border-top:1px solid rgba(148,163,184,.14);}',
      '.af-viz-summary{color:#cbd5e1;font-size:11px;line-height:1.4;}',
      '.af-viz-note{color:#94a3b8;font-size:10px;font-weight:700;}',
      '.af-fold-shadow{fill:none;stroke:#020617;stroke-width:18;stroke-linecap:round;stroke-linejoin:round;opacity:.75;}',
      '.af-fold-ribbon{fill:none;stroke:url(#af-confidence-gradient);stroke-width:10;stroke-linecap:round;stroke-linejoin:round;filter:url(#af-ribbon-glow);transition:opacity .2s;}',
      '.af-fold-segment{fill:none;stroke-width:13;stroke-linecap:round;stroke-linejoin:round;filter:url(#af-ribbon-glow);opacity:.15;transition:opacity .2s,stroke-width .2s;cursor:pointer;}',
      '.af-protein-viz[data-confidence-band]:not([data-confidence-band="all"]) .af-fold-ribbon{opacity:.18;}',
      '.af-fold-segment[data-active="true"]{opacity:1;stroke-width:15;}',
      '.af-fold-spine{fill:none;stroke:rgba(255,255,255,.72);stroke-width:1.4;stroke-linecap:round;stroke-dasharray:3 7;pointer-events:none;animation:afSpineFlow 2.6s linear infinite;}',
      '.af-hbond-arc{fill:none;stroke:rgba(125,211,252,.52);stroke-width:1.25;stroke-linecap:round;stroke-dasharray:2.5 5.5;pointer-events:none;animation:afSpineFlow 3.4s linear infinite;}',
      '.af-hbond-arc:nth-of-type(2n){animation-delay:-1.4s;}',
      '.af-ribbon-shimmer{fill:none;stroke:#ffffff;stroke-width:2.4;stroke-linecap:round;stroke-dasharray:46 164;pointer-events:none;animation:afRibbonShimmer 4.8s ease-in-out infinite;}',
      '.af-emb-shimmer{fill:none;stroke:#e0f2fe;stroke-width:1.4;stroke-linecap:round;stroke-dasharray:14 48;pointer-events:none;animation:afEmbShimmer 4.2s linear infinite;}',
      '.af-fold-beacon{fill:none;stroke-width:1.5;pointer-events:none;transform-box:fill-box;transform-origin:center;animation:afBeaconRing 3.2s ease-in-out infinite;}',
      '.af-bar-glint{pointer-events:none;animation:afBarGlint 3.6s ease-in-out infinite;}',
      '.af-spectrum-sheen{pointer-events:none;animation:afSpectrumSweep 6.4s ease-in-out infinite;}',
      '.af-pae-diag{pointer-events:none;animation:afPaeDiagFlow 3.2s linear infinite;}',
      '.af-pae-sheen{pointer-events:none;animation:afPaeSheen 5.6s ease-in-out infinite;}',
      '.af-pae-cell-active{animation:afPaeCellPulse 3.1s ease-in-out infinite;}',
      '.af-status-dot{animation:afStatusBreath 3s ease-in-out infinite;}',
      '.af-residue-node{stroke:#e0f2fe;stroke-width:1.5;filter:url(#af-ribbon-glow);transform-box:fill-box;transform-origin:center;animation:afResiduePulse 2.8s ease-in-out infinite;}',
      '.af-residue-node:nth-of-type(2n){animation-delay:-1.2s;}',
      '.af-pae-cell{cursor:pointer;transition:opacity .15s,stroke-width .15s;}',
      '.af-pae-cell:hover{opacity:.88;}',
      '.af-confidence-key{display:flex;flex-direction:column;justify-content:space-between;min-width:0;padding:13px;border:1px solid rgba(148,163,184,.22);border-radius:16px;background:rgba(15,23,42,.82);}',
      '.af-confidence-key h3{margin:0;color:#f8fafc;font-size:13px;}',
      '.af-confidence-key>p{margin:4px 0 9px;color:#cbd5e1;font-size:11px;line-height:1.45;}',
      '.af-confidence-row{display:grid;width:100%;grid-template-columns:10px 46px minmax(0,1fr) auto;align-items:center;gap:7px;padding:7px 6px;border:0;border-top:1px solid rgba(148,163,184,.14);border-radius:6px;background:transparent;text-align:left;cursor:pointer;transition:background .15s;}',
      '.af-confidence-row:hover{background:rgba(148,163,184,.1);}',
      '.af-confidence-row[aria-pressed="true"]{background:rgba(56,189,248,.16);box-shadow:inset 3px 0 0 var(--af-confidence-color,currentColor);}',
      '.af-confidence-dot{width:9px;height:9px;border-radius:999px;box-shadow:0 0 8px currentColor;}',
      '.af-confidence-range{color:#f8fafc;font:800 10px ui-monospace,SFMono-Regular,Menlo,monospace;}',
      '.af-confidence-name{color:#e2e8f0;font-size:11px;font-weight:600;}',
      '.af-confidence-pct{color:#94a3b8;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;}',
      '.af-confidence-reading{min-height:40px;margin-top:8px;padding:8px 9px;border-radius:9px;background:rgba(2,6,23,.55);border:1px solid rgba(56,189,248,.22);color:#bae6fd;font-size:11px;line-height:1.45;}',
      '.af-confidence-caution{margin-top:8px;padding:8px 9px;border:1px solid rgba(251,191,36,.28);border-radius:9px;background:rgba(120,53,15,.22);color:#fde68a;font-size:10px;line-height:1.45;}',
      '@keyframes afResiduePulse{0%,100%{opacity:.68;transform:scale(.94)}50%{opacity:1;transform:scale(1.1)}}',
      '@keyframes afSpineFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-20}}',
      '@keyframes afRibbonShimmer{0%{stroke-dashoffset:0;opacity:.16}50%{stroke-dashoffset:-105;opacity:.48}100%{stroke-dashoffset:-210;opacity:.16}}',
      '@keyframes afEmbShimmer{0%{stroke-dashoffset:0;opacity:.25}50%{opacity:.78}100%{stroke-dashoffset:-62;opacity:.25}}',
      '@keyframes afBeaconRing{0%,100%{transform:scale(.88);opacity:.54}50%{transform:scale(1.42);opacity:.12}}',
      '@keyframes afBarGlint{0%,100%{opacity:.28}50%{opacity:.82}}',
      '@keyframes afSpectrumSweep{0%,100%{transform:translateX(-40px);opacity:0}20%{opacity:.24}50%{transform:translateX(440px);opacity:.3}80%{opacity:0}}',
      '@keyframes afPaeDiagFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-18}}',
      '@keyframes afPaeSheen{0%,100%{transform:translateX(0);opacity:.12}50%{transform:translateX(218px);opacity:.48}}',
      '@keyframes afPaeCellPulse{0%,100%{opacity:.86}50%{opacity:1}}',
      '@keyframes afStatusBreath{0%,100%{opacity:.75;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}',
      '.af-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:16px;}',
      '.af-metric{min-width:0;padding:10px 11px;border:1px solid rgba(148,163,184,.2);border-radius:12px;background:rgba(15,23,42,.74);transition:border-color .16s;}',
      '.af-metric[data-active="true"]{border-color:rgba(45,212,191,.5);background:rgba(15,118,110,.16);}',
      '.af-metric-label{display:block;color:#94a3b8;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;}',
      '.af-metric-value{display:block;margin-top:3px;color:#f8fafc;font-size:16px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.af-metric-note{display:block;margin-top:2px;color:#cbd5e1;font-size:10px;line-height:1.35;}',
      '.af-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;}',
      '.af-primary{min-height:44px;padding:10px 17px;border:1px solid rgba(153,246,228,.45);border-radius:12px;background:linear-gradient(135deg,#0f766e,#0369a1);color:#ffffff;font-size:13px;font-weight:850;cursor:pointer;box-shadow:0 10px 24px rgba(8,145,178,.25);transition:transform .16s,box-shadow .16s;}',
      '.af-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(8,145,178,.34);}',
      '.af-sample-launch{min-height:44px;padding:10px 14px;border:1px solid rgba(94,234,212,.38);border-radius:12px;background:rgba(15,23,42,.82);color:#ccfbf1;font-size:12px;font-weight:800;cursor:pointer;transition:border-color .16s,background .16s;}',
      '.af-sample-launch:hover{border-color:#2dd4bf;background:rgba(15,118,110,.3);}',
      '.af-action-note{color:#cbd5e1;font-size:11px;line-height:1.45;flex:1 1 220px;min-width:0;}',
      '.af-cross-scale{border-color:rgba(34,211,238,.45);background:linear-gradient(145deg,rgba(8,145,178,.14),rgba(15,23,42,.88) 72%) #0f172a;color:#e2e8f0;}.af-cross-meta{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}.af-cross-chip{padding:5px 9px;border:1px solid rgba(103,232,249,.28);border-radius:999px;background:rgba(8,47,73,.72);color:#cffafe;font-size:10px;font-weight:800}.af-evidence-ladder{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:11px}.af-evidence-step{min-width:0;padding:11px;border:1px solid rgba(103,232,249,.22);border-radius:12px;background:rgba(15,23,42,.84)}.af-evidence-step span{color:#67e8f9;font-size:10px;font-weight:900;text-transform:uppercase}.af-evidence-step h4{margin:6px 0 5px;color:#f8fafc;font-size:12px}.af-evidence-step p{margin:0;color:#cbd5e1;font-size:11px;line-height:1.5}.af-cross-evidence{margin-top:10px;padding:10px 12px;border-left:4px solid #22d3ee;border-radius:0 8px 8px 0;background:rgba(8,47,73,.55);color:#cffafe;font-size:11px;line-height:1.5}.af-claim-grid{display:grid;gap:7px;margin-top:9px}.af-claim-choice{width:100%;padding:10px 12px;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#e2e8f0;text-align:left;font-size:11px;font-weight:700;line-height:1.45;cursor:pointer}.af-claim-choice[aria-pressed=true]{border-color:#22d3ee;background:rgba(8,145,178,.22);color:#ecfeff}.af-cross-feedback{margin-top:9px;padding:10px 12px;border-radius:10px;font-size:11px;font-weight:800;line-height:1.45}.af-cross-feedback[data-correct=true]{background:rgba(22,101,52,.38);color:#bbf7d0}.af-cross-feedback[data-correct=false]{background:rgba(154,52,18,.36);color:#fed7aa}.af-secondary{min-height:40px;padding:9px 13px;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#e2e8f0;font-size:12px;font-weight:800;cursor:pointer}.af-primary:disabled,.af-secondary:disabled{cursor:not-allowed;opacity:.5;transform:none}.af-evidence-notebook{margin-top:13px;padding:14px;border:1px solid rgba(167,243,208,.32);border-radius:14px;background:rgba(6,78,59,.18)}.af-evidence-notebook h3{font-size:14px;color:#f8fafc;margin:0}.af-evidence-notebook>p{margin:5px 0 10px;color:#a7f3d0;font-size:11px;line-height:1.5}.af-note-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.af-note-field{min-width:0}.af-note-field label{display:block;margin-bottom:5px;color:#d1fae5;font-size:10px;font-weight:850;text-transform:uppercase}.af-note-field textarea{box-sizing:border-box;width:100%;min-height:82px;resize:vertical;border:1px solid #475569;border-radius:10px;background:#020617;color:#e2e8f0;padding:9px;font:inherit;font-size:11px;line-height:1.45}.af-note-field textarea:focus{outline:3px solid #22d3ee;outline-offset:2px}.af-record-checks{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.af-record-check{padding:4px 8px;border-radius:999px;background:#334155;color:#e2e8f0;font-size:10px;font-weight:850}.af-record-check[data-done=true]{background:#14532d;color:#bbf7d0}.af-record-saved{margin-top:9px;padding:9px 11px;border-radius:9px;background:rgba(22,101,52,.4);color:#bbf7d0;font-size:11px;font-weight:800}',
      '.af-section{padding:16px;border:1px solid #334155;border-radius:16px;background:#0f172a;color:#e2e8f0;}',
      '.af-launcher[data-theme="light"] .af-section{background:#ffffff;border-color:#cbd5e1;color:#0f172a;box-shadow:0 4px 16px rgba(15,23,42,.05);}',
      '.af-launcher[data-theme="light"] .af-section.af-cross-scale{background:linear-gradient(145deg,#ecfeff,#f8fafc 72%);border-color:#0891b2;color:#0f172a;}',
      '.af-launcher[data-theme="light"] .af-section.af-cross-scale .af-eyebrow{color:#0f766e;}',
      '.af-launcher[data-theme="light"] .af-section.af-cross-scale h3,.af-launcher[data-theme="light"] .af-section.af-cross-scale h4{color:#0f172a;}',
      '.af-launcher[data-theme="light"] .af-section.af-cross-scale p{color:#334155;}',
      '.af-launcher[data-theme="light"] .af-cross-chip{background:#e0f2fe;border-color:#7dd3fc;color:#0c4a6e;}',
      '.af-launcher[data-theme="light"] .af-cross-evidence{background:#ecfeff;color:#164e63;border-left-color:#0891b2;}',
      '.af-launcher[data-theme="light"] .af-evidence-step{background:#ffffff;border-color:#bae6fd;}',
      '.af-launcher[data-theme="light"] .af-evidence-step span{color:#0e7490;}',
      '.af-launcher[data-theme="light"] .af-claim-choice{background:#ffffff;border-color:#cbd5e1;color:#0f172a;}',
      '.af-launcher[data-theme="light"] .af-claim-choice[aria-pressed=true]{background:#ecfeff;border-color:#0891b2;color:#083344;}',
      '.af-launcher[data-theme="light"] .af-cross-feedback[data-correct=true]{background:#dcfce7;color:#14532d;}',
      '.af-launcher[data-theme="light"] .af-cross-feedback[data-correct=false]{background:#ffedd5;color:#7c2d12;}',
      '.af-launcher[data-theme="light"] .af-evidence-notebook{background:#f0fdf4;border-color:#86efac;}',
      '.af-launcher[data-theme="light"] .af-evidence-notebook>p{color:#166534;}',
      '.af-launcher[data-theme="light"] .af-note-field label{color:#14532d;}',
      '.af-launcher[data-theme="light"] .af-note-field textarea{background:#ffffff;color:#0f172a;border-color:#94a3b8;}',
      '.af-launcher[data-theme="light"] .af-record-check{background:#e2e8f0;color:#334155;}',
      '.af-launcher[data-theme="light"] .af-record-check[data-done=true]{background:#dcfce7;color:#14532d;}',
      '.af-launcher[data-theme="light"] .af-record-saved{background:#dcfce7;color:#14532d;}',
      '.af-launcher[data-theme="light"] .af-secondary{background:#ffffff;border-color:#94a3b8;color:#0f172a;}',
      '.af-launcher[data-theme="light"] .af-action-note{color:#334155;}',
      '.af-launcher[data-theme="light"] .af-mission .af-action-note{color:#cbd5e1;}',
      '.af-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;}',
      '.af-section h3{margin:0;color:#f8fafc;font-size:15px;}',
      '.af-launcher[data-theme="light"] .af-section h3{color:#0f172a;}',
      '.af-section-head p{margin:3px 0 0;color:#94a3b8;font-size:12px;}',
      '.af-launcher[data-theme="light"] .af-section-head p{color:#475569;}',
      '.af-route-progress{height:6px;border-radius:999px;background:rgba(148,163,184,.22);margin-bottom:12px;overflow:hidden;}',
      '.af-route-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#14b8a6,#38bdf8);transition:width .25s ease;}',
      '.af-route{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}',
      '.af-route-card{min-width:0;padding:13px;border:1px solid #334155;border-radius:13px;background:#0b1324;}',
      '.af-launcher[data-theme="light"] .af-route-card{background:#f8fafc;border-color:#cbd5e1;}',
      '.af-route-card[data-complete="true"]{border-color:rgba(45,212,191,.6);background:linear-gradient(145deg,rgba(13,148,136,.18),#0f172a 70%) #0f172a;}',
      '.af-launcher[data-theme="light"] .af-route-card[data-complete="true"]{border-color:#0f766e;background:linear-gradient(145deg,#ccfbf1,#ffffff 75%);}',
      '.af-route-kicker{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#5eead4;font-size:10px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.af-launcher[data-theme="light"] .af-route-kicker{color:#0f766e;}',
      '.af-route-card h4{margin:8px 0 5px;color:#f8fafc;font-size:13px;}',
      '.af-launcher[data-theme="light"] .af-route-card h4{color:#0f172a;}',
      '.af-route-card p{margin:0;color:#cbd5e1;font-size:11px;line-height:1.5;}',
      '.af-launcher[data-theme="light"] .af-route-card p{color:#334155;}',
      '.af-route-state{color:#cbd5e1;font-size:10px;font-weight:800;}',
      '.af-launcher[data-theme="light"] .af-route-state{color:#334155;}',
      '.af-support-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:10px;}',
      '.af-details,.af-guardrail{border:1px solid #334155;border-radius:14px;background:#0f172a;color:#e2e8f0;}',
      '.af-launcher[data-theme="light"] .af-details{background:#ffffff;border-color:#cbd5e1;color:#0f172a;}',
      '.af-details summary{min-height:46px;padding:13px 15px;cursor:pointer;color:#f8fafc;font-size:13px;font-weight:850;}',
      '.af-launcher[data-theme="light"] .af-details summary{color:#0f172a;}',
      '.af-details ol{margin:0;padding:0 20px 15px 34px;color:#cbd5e1;font-size:12px;line-height:1.58;}',
      '.af-launcher[data-theme="light"] .af-details ol{color:#334155;}',
      '.af-details li+li{margin-top:6px;}',
      '.af-guardrail{padding:14px 15px;border-color:rgba(251,191,36,.38);background:linear-gradient(145deg,rgba(120,53,15,.22),#0f172a 72%) #0f172a;}',
      '.af-launcher[data-theme="light"] .af-guardrail{background:linear-gradient(145deg,#fef3c7,#fffbeb 75%);border-color:#d97706;}',
      '.af-guardrail h3{margin:0 0 7px;color:#fde68a;font-size:13px;}',
      '.af-launcher[data-theme="light"] .af-guardrail h3{color:#92400e;}',
      '.af-guardrail p{margin:0;color:#e2e8f0;font-size:11px;line-height:1.55;}',
      '.af-launcher[data-theme="light"] .af-guardrail p{color:#451a03;}',
      '.af-guardrail p+p{margin-top:7px;}',
      '.af-alert{padding:11px 13px;border:1px solid rgba(251,191,36,.45);border-radius:12px;background:rgba(120,53,15,.25);color:#fde68a;font-size:12px;line-height:1.5;}',
      '.af-launcher[data-theme="light"] .af-alert{background:#fef3c7;color:#78350f;border-color:#d97706;}',
      '.af-alert a{color:#fef3c7;text-decoration:underline;font-weight:800;}',
      '.af-launcher[data-theme="light"] .af-alert a{color:#78350f;}',
      '.af-credit{margin:0;padding:0 4px;color:#94a3b8;font-size:10px;line-height:1.5;}',
      '.af-launcher[data-theme="light"] .af-credit{color:#475569;}',
      '@media(max-width:760px){.af-confidence-atlas{grid-template-columns:1fr;}.af-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.af-route{grid-template-columns:repeat(2,minmax(0,1fr));}.af-support-grid{grid-template-columns:1fr;}.af-evidence-ladder,.af-note-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media(max-width:520px){.af-launcher{padding:11px;}.af-evidence-ladder,.af-note-grid,.af-route{grid-template-columns:1fr;}.af-mission{padding:15px;border-radius:16px;}.af-mission-top{flex-direction:column;}.af-status{white-space:normal;}.af-metrics{grid-template-columns:1fr 1fr;}.af-primary,.af-sample-launch{width:100%;}.af-actions{align-items:stretch;}.af-action-note{width:100%;}}',
      '@media(prefers-reduced-motion:reduce){.af-primary,.af-fold-ribbon,.af-fold-segment,.af-route-progress-fill{transition:none;}.af-primary:hover{transform:none;}.af-residue-node,.af-fold-spine,.af-hbond-arc,.af-ribbon-shimmer,.af-emb-shimmer,.af-fold-beacon,.af-bar-glint,.af-spectrum-sheen,.af-pae-diag,.af-pae-sheen,.af-pae-cell-active,.af-status-dot{animation:none!important;}}',
      '.theme-contrast .af-launcher,.af-launcher[data-theme="contrast"],.theme-contrast .af-mission,.af-launcher[data-theme="contrast"] .af-mission,.theme-contrast .af-section,.af-launcher[data-theme="contrast"] .af-section,.theme-contrast .af-route-card,.af-launcher[data-theme="contrast"] .af-route-card,.theme-contrast .af-details,.af-launcher[data-theme="contrast"] .af-details,.theme-contrast .af-guardrail,.af-launcher[data-theme="contrast"] .af-guardrail,.theme-contrast .af-protein-viz,.af-launcher[data-theme="contrast"] .af-protein-viz,.theme-contrast .af-confidence-key,.af-launcher[data-theme="contrast"] .af-confidence-key,.theme-contrast .af-metric,.af-launcher[data-theme="contrast"] .af-metric,.theme-contrast .af-stage-tabs,.af-launcher[data-theme="contrast"] .af-stage-tabs,.theme-contrast .af-preset-chip,.af-launcher[data-theme="contrast"] .af-preset-chip,.theme-contrast .af-status,.af-launcher[data-theme="contrast"] .af-status,.theme-contrast .af-alert,.af-launcher[data-theme="contrast"] .af-alert,.theme-contrast .af-note-field,.af-launcher[data-theme="contrast"] .af-note-field,.theme-contrast .af-note-card,.af-launcher[data-theme="contrast"] .af-note-card,.theme-contrast .af-evidence-step,.af-launcher[data-theme="contrast"] .af-evidence-step,.theme-contrast .af-support-card,.af-launcher[data-theme="contrast"] .af-support-card,.theme-contrast .af-confidence-row,.af-launcher[data-theme="contrast"] .af-confidence-row,.theme-contrast .af-stage-tab,.af-launcher[data-theme="contrast"] .af-stage-tab{background:#000000!important;color:#ffff00!important;border-color:#ffff00!important;box-shadow:none!important;}',
      '.theme-contrast .af-primary,.af-launcher[data-theme="contrast"] .af-primary,.theme-contrast .af-secondary,.af-launcher[data-theme="contrast"] .af-secondary,.theme-contrast .af-sample-launch,.af-launcher[data-theme="contrast"] .af-sample-launch,.theme-contrast .af-stage-tab[aria-selected="true"],.af-launcher[data-theme="contrast"] .af-stage-tab[aria-selected="true"],.theme-contrast .af-preset-chip[aria-pressed="true"],.af-launcher[data-theme="contrast"] .af-preset-chip[aria-pressed="true"]{background:#000000!important;color:#00ff00!important;border:2px solid #00ff00!important;}',
      '.theme-contrast .af-launcher :is(p,span,h2,h3,h4,strong,li,summary,label,a),.af-launcher[data-theme="contrast"] :is(p,span,h2,h3,h4,strong,li,summary,label,a){color:#ffff00!important;}',
      '.theme-contrast .af-launcher :is(.af-fold-ribbon,.af-fold-segment,.af-residue-node),.af-launcher[data-theme="contrast"] :is(.af-fold-ribbon,.af-fold-segment,.af-residue-node){filter:none!important;}',
      '.theme-contrast .af-launcher :is(.af-fold-beacon,.af-ribbon-shimmer,.af-emb-shimmer,.af-bar-glint,.af-spectrum-sheen,.af-pae-sheen),.af-launcher[data-theme="contrast"] :is(.af-fold-beacon,.af-ribbon-shimmer,.af-emb-shimmer,.af-bar-glint,.af-spectrum-sheen,.af-pae-sheen){display:none!important;}',
      '.theme-contrast .af-launcher :is(.af-residue-node,.af-fold-spine,.af-hbond-arc,.af-pae-diag,.af-pae-cell-active,.af-status-dot),.af-launcher[data-theme="contrast"] :is(.af-residue-node,.af-fold-spine,.af-hbond-arc,.af-pae-diag,.af-pae-cell-active,.af-status-dot){animation:none!important;}',
      '@media(forced-colors:active){.af-fold-ribbon,.af-fold-segment,.af-residue-node{filter:none!important;}.af-fold-beacon,.af-ribbon-shimmer,.af-emb-shimmer,.af-bar-glint,.af-spectrum-sheen,.af-pae-sheen{display:none!important;}.af-residue-node,.af-fold-spine,.af-hbond-arc,.af-pae-diag,.af-pae-cell-active,.af-status-dot{animation:none!important;}}'
    ].join('\n');
    if (document.head) document.head.appendChild(alphaFoldStyle);
  }

  function safeClip(value, limit) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 300);
  }

  function safeEvidenceText(value, limit) {
    return safeClip(value, limit || 600)
      .replace(/\b[ACGTUN]{40,}\b/gi, '[nucleic-acid sequence omitted]')
      .replace(/\b[ACDEFGHIKLMNPQRSTVWY]{40,}\b/gi, '[protein sequence omitted]');
  }

  function buildCoachPrompt(payload) {
    var meta = payload && payload.meta ? payload.meta : {};
    var guide = payload && payload.guide ? payload.guide : {};
    var lines = [
      'You are a warm, Socratic STRUCTURAL-BIOLOGY COACH for a K-12 student using an AlphaFold explorer.',
      'The tool is for public, synthetic, or classroom sample proteins only. Do not discuss diagnosis, treatment, ancestry, personal genetic risk, or patient-specific interpretation.',
      'RULES:',
      '- At most 4 sentences.',
      '- End with exactly one question.',
      '- Ask the student to inspect the structure, confidence, domain layout, or a visible pocket/surface feature.',
      '- Adapt vocabulary, sentence length, and next steps to the selected grade band and tutorial frame.',
      '- Do not overstate AlphaFold predictions; remind them that predictions are hypotheses when needed.',
      '- Do not request or repeat personal/family genetic or medical information.',
      'CURRENT PUBLIC/LOCAL STRUCTURE CONTEXT:',
      'Name: ' + safeClip(meta.name || meta.description || 'unknown protein', 160),
      'Accession/source: ' + safeClip(meta.accession || meta.source || 'unknown', 120),
      'Organism: ' + safeClip(meta.organism || 'unknown', 120),
      'Length: ' + safeClip(meta.length || 'unknown', 40),
      'Confidence summary: ' + safeClip(meta.confidence || 'not shown', 180),
      'Grade band: ' + safeClip(guide.gradeBand || 'not specified', 140),
      'Lesson sequence: ' + safeClip(guide.lessonLength || 'not specified', 120),
      'Biology context: ' + safeClip(guide.biologyContext || 'not specified', 160),
      'Anchor question: ' + safeClip(guide.biologyAnchor || 'not specified', 260),
      'Assignment format: ' + safeClip(guide.assignmentFormat || 'not specified', 120),
      'Learner support: ' + safeClip(guide.scaffoldLevel || 'not specified', 120),
      'Diagnostic summary: ' + safeClip(guide.diagnostic || 'not provided', 420),
      'Learning context: ' + safeClip(guide.learningContext || 'not specified', 120),
      'Accessibility/pedagogy focus: ' + safeClip(guide.accessibilityFocus || 'not specified', 260),
      'Learning route: ' + safeClip(guide.route || 'not specified', 120),
      'Readiness: ' + safeClip(guide.readiness || 'not provided', 220),
      'Local claim review: ' + safeClip(guide.claimReview || 'not provided', 320),
      'Rubric feedback: ' + safeClip(guide.rubric || 'not provided', 420),
      'Student observation: ' + safeEvidenceText(payload && payload.note, 700),
      'Reply with plain text only.'
    ];
    return lines.join('\n');
  }

  function buildVariantPrompt(payload) {
    var meta = payload && payload.meta ? payload.meta : {};
    var variant = payload && payload.variant ? payload.variant : {};
    var mutations = Array.isArray(variant.mutations) ? variant.mutations.map(function (item) { return safeClip(item, 24); }).slice(0, 12) : [];
    var details = Array.isArray(variant.mutationDetails) ? variant.mutationDetails.slice(0, 12).map(function (item) {
      return safeClip(item && item.notation, 24) + ': ' + safeClip(item && item.fromProperty, 60) + ' to ' + safeClip(item && item.toProperty, 60);
    }) : [];
    return [
      'You are a cautious PROTEIN-VARIANT HYPOTHESIS COACH for a K-12 or introductory structural-biology investigation.',
      'The input is public, synthetic, or teacher-approved classroom material. No raw sequence is provided.',
      'Do not provide diagnosis, treatment, pathogenicity classification, personal genetic risk, ancestry interpretation, or patient-specific conclusions.',
      'RULES:',
      '- Reply with exactly 3 short bullets headed Property change, Possible structural hypotheses, and Best next checks.',
      '- Discuss plausible effects on packing, charge, flexibility, interfaces, pockets, or local stability only as hypotheses.',
      '- State that residue position and 3D context matter and that sequence-only reasoning cannot determine the actual effect.',
      '- Recommend comparing original and variant predictions, local confidence and PAE, site burial or interfaces, trusted references, and experiments where appropriate.',
      '- Do not claim AlphaFold predicts function, stability, binding, or clinical impact.',
      'CLASSROOM VARIANT CONTEXT:',
      'Protein/source: ' + safeClip(meta.name || meta.source || 'classroom protein', 160),
      'Length: ' + safeClip(variant.proteinLength || meta.length || 'unknown', 40),
      'Mutations: ' + (mutations.join(', ') || 'none'),
      'Broad property changes: ' + (details.join('; ') || 'not provided'),
      'Grade band: ' + safeClip(variant.gradeBand || 'not specified', 80),
      'Prediction context: ' + safeClip(meta.confidence || 'No variant prediction has been run yet.', 180),
      'Reply with plain text only.'
    ].join('\n');
  }

  function buildGuidePrompt(payload) {
    var meta = payload && payload.meta ? payload.meta : {};
    var guide = payload && payload.guide ? payload.guide : {};
    var lines = [
      'You are an AI GUIDANCE LAYER for a K-12 AlphaFold investigation.',
      'Coach the student on scientific reasoning, not on personal genetics, diagnosis, treatment, ancestry, or patient-specific interpretation.',
      'The tool sends structure metadata and student-written notes only. Do not ask for or repeat raw sequences or personal/family medical or genetic information.',
      'RULES:',
      '- Give 3 short bullets.',
      '- Bullet 1: name what is strong or promising in their reasoning.',
      '- Bullet 2: name the most important missing evidence or uncertainty.',
      '- Bullet 3: give one concrete next action in the viewer or lab note.',
      '- Match the selected grade band: use simpler model-literacy language for elementary grades and more technical validation language for AP/advanced students.',
      '- Match the selected lesson sequence: keep launch guidance brief and make investigation guidance more evidence-rich.',
      '- Use the biology context to choose relevant evidence, but do not infer function beyond what the student can support.',
      '- Aim the next action at the selected assignment format, such as an exit ticket, lab note, discussion post, or mini-investigation.',
      '- Match the learner-support scaffold: guided means simpler next steps; extension means stronger validation and evidence-hierarchy prompts.',
      '- Use the diagnostic summary to target the highest-priority issue: privacy, overclaiming, missing evidence, missing limit, or validation.',
      '- Use cautious language for AlphaFold predictions; predictions are hypotheses until supported by evidence.',
      '- Do not write a final answer for the student.',
      'CURRENT STRUCTURE CONTEXT:',
      'Name: ' + safeClip(meta.name || meta.description || 'unknown', 160),
      'Source/accession: ' + safeClip(meta.source || meta.accession || 'unknown', 120),
      'Organism: ' + safeClip(meta.organism || 'unknown', 120),
      'Components/length: ' + safeClip(meta.length || 'unknown', 120),
      'Confidence summary: ' + safeClip(meta.confidence || 'not shown', 180),
      'GUIDE STATE:',
      'Current prompt: ' + safeClip(guide.currentPrompt || '', 240),
      'Grade band: ' + safeClip(guide.gradeBand || 'not specified', 140),
      'Grade tutorial: ' + safeClip(guide.gradeTutorial || 'not provided', 900),
      'Lesson sequence: ' + safeClip(guide.lessonLength || 'not specified', 120),
      'Lesson plan: ' + safeClip(guide.lessonSequence || 'not provided', 900),
      'Biology context: ' + safeClip(guide.biologyContext || 'not specified', 160),
      'Suggested public example: ' + safeClip(guide.suggestedExample || 'not specified', 160),
      'Investigation brief: ' + safeClip(guide.investigationBrief || 'not provided', 900),
      'Assignment format: ' + safeClip(guide.assignmentFormat || 'not specified', 120),
      'LMS assignment: ' + safeClip(guide.lmsAssignment || 'not provided', 900),
      'Learner support: ' + safeClip(guide.scaffoldLevel || 'not specified', 120),
      'Scaffold support: ' + safeClip(guide.scaffoldSupport || 'not provided', 900),
      'Confidence guide: ' + safeClip(guide.confidenceGuide || 'not provided', 900),
      'Diagnostic summary: ' + safeClip(guide.diagnostic || 'not provided', 600),
      'Learning context: ' + safeClip(guide.learningContext || 'not specified', 120),
      'Accessibility/pedagogy focus: ' + safeClip(guide.accessibilityFocus || 'not specified', 260),
      'Context-specific guidance: ' + safeClip(guide.contextGuidance || 'not specified', 260),
      'Learning route: ' + safeClip(guide.route || 'not specified', 120),
      'Readiness: ' + safeClip(guide.readiness || 'not provided', 220),
      'Activity card: ' + safeClip(guide.activityCard || 'not provided', 360),
      'Local claim review: ' + safeClip(guide.claimReview || 'not provided', 480),
      'Rubric feedback: ' + safeClip(guide.rubric || 'not provided', 620),
      'Completed steps: ' + safeClip(guide.completed || 'none', 160),
      'Source confirmed: ' + (guide.sourceConfirmed ? 'yes' : 'no'),
      'Observation: ' + safeEvidenceText(guide.observation || '', 700),
      'Cautious claim: ' + safeEvidenceText(guide.claim || '', 700),
      'Structure evidence: ' + safeEvidenceText(guide.evidence || '', 700),
      'Limit or next test: ' + safeEvidenceText(guide.caution || '', 700),
      'Reply with plain text only.'
    ];
    return lines.join('\n');
  }

  window.StemLab.registerTool('alphaFoldExplorer', {
    icon: '\u03b1',
    label: 'AlphaFold Explorer',
    desc: 'Look up public AlphaFold DB protein structures by UniProt/accession, view them in Mol*, import downloaded AlphaFold result files, prepare AlphaFold Server or AlphaFold 3 local-code JSON, and guide students through classroom presets, grade-leveled lessons, biology-context investigation briefs, LMS-ready assignment packets, learner-support scaffolds, confidence/PAE interpretation, accessible claim-evidence-limit reasoning, local claim review, rubric feedback, and no automatic submission.',
    color: 'teal',
    category: 'science',
    questHooks: [
      { id: 'af_open', label: 'Open AlphaFold Explorer', icon: '\u03b1',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'af_lookup', label: 'Load a public AlphaFold DB structure', icon: 'AF',
        check: function (d) { return !!(d && (d.lookupCount || 0) >= 1); } },
      { id: 'af_prepare', label: 'Prepare safe AlphaFold Server input', icon: '{}',
        check: function (d) { return !!(d && (d.sequencePreparedCount || 0) >= 1); } },
      { id: 'af_coach', label: 'Ask one structure-inspection question', icon: '?',
        check: function (d) { return !!(d && (d.coachCount || 0) >= 1); } },
      { id: 'af_ai_guide', label: 'Use AI guidance on a cautious claim', icon: 'AI',
        check: function (d) { return !!(d && (d.guideCount || 0) >= 1); } },
      { id: 'af_export', label: 'Export a cross-scale evidence record', icon: '\u21e9',
        check: function (d) { return !!(d && (d.crossScaleExportStatus === 'downloaded' || d.crossScaleExportStatus === 'downloaded-json')); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;

      var _win = React.useRef((_alphafoldPopup && !_alphafoldPopup.closed) ? _alphafoldPopup : null);

      React.useEffect(function () {
        var popup = (_win.current && !_win.current.closed) ? _win.current : ((_alphafoldPopup && !_alphafoldPopup.closed) ? _alphafoldPopup : null);
        if (!popup || popup.closed) return;
        _win.current = popup;
        var activeTheme = ctx.theme === 'light' || ctx.theme === 'contrast' ? ctx.theme : 'dark';
        try { popup.postMessage({ type: 'alloflow-theme-change', theme: activeTheme }, ALPHAFOLD_ORIGIN); } catch (_) {}
      }, [ctx.theme]);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];
      var _bandState = React.useState('all'); var confidenceBand = _bandState[0], setConfidenceBand = _bandState[1];
      var _stageState = React.useState('ribbon'); var stageView = _stageState[0], setStageView = _stageState[1];
      var _sampleState = React.useState('P69905'); var sampleAcc = _sampleState[0], setSampleAcc = _sampleState[1];
      var _paeState = React.useState('intra'); var paeRegion = _paeState[0], setPaeRegion = _paeState[1];
      var afTheme = (ctx.isContrast || ctx.theme === 'contrast') ? 'contrast' : ((ctx.isDark || ctx.theme === 'dark') ? 'dark' : 'light');
      var SAMPLE_PROTEINS = [
        {
          accession: 'P69905',
          name: t('stem.alphaFold.sample_hba', 'Hemoglobin \u03b1'),
          length: '142 aa',
          foldNote: t('stem.alphaFold.sample_hba_note', 'Compact 7-helix globin core with mostly >90 pLDDT confidence.'),
          pcts: { 'very-high': '82%', confident: '13%', low: '3%', 'very-low': '2%' },
          path: 'M36 104 C56 36 108 34 134 86 C158 136 206 142 232 82 C256 28 304 28 332 84 C358 136 410 132 438 78 C458 44 494 52 518 76',
          segs: {
            'very-high': 'M36 104 C56 36 108 34 134 86 C158 136 206 142 232 82',
            confident: 'M232 82 C256 28 304 28 332 84',
            low: 'M332 84 C358 136 410 132 438 78',
            'very-low': 'M438 78 C458 44 494 52 518 76'
          },
          bars: [96, 95, 97, 94, 92, 95, 96, 93, 91, 88, 86, 84, 79, 76, 68, 62, 54, 46],
          paeBlocks: [
            [1,1,1,1,2,2,2,3],
            [1,1,1,1,2,2,2,3],
            [1,1,1,1,2,2,2,3],
            [1,1,1,1,2,2,2,3],
            [2,2,2,2,1,1,1,2],
            [2,2,2,2,1,1,1,2],
            [2,2,2,2,1,1,1,2],
            [3,3,3,3,2,2,2,1]
          ]
        },
        {
          accession: 'P42212',
          name: t('stem.alphaFold.sample_gfp', 'GFP Barrel'),
          length: '238 aa',
          foldNote: t('stem.alphaFold.sample_gfp_note', 'Rigid 11-strand \u03b2-barrel housing the chromophore, flanked by short flexible ends.'),
          pcts: { 'very-high': '74%', confident: '18%', low: '5%', 'very-low': '3%' },
          path: 'M38 118 C64 42 118 42 142 112 C166 150 212 36 246 86 C276 132 314 38 352 92 C386 140 426 48 462 94 C484 122 504 114 520 88',
          segs: {
            'very-high': 'M38 118 C64 42 118 42 142 112 C166 150 212 36 246 86',
            confident: 'M246 86 C276 132 314 38 352 92',
            low: 'M352 92 C386 140 426 48 462 94',
            'very-low': 'M462 94 C484 122 504 114 520 88'
          },
          bars: [72, 88, 95, 97, 96, 94, 93, 95, 92, 90, 86, 83, 81, 78, 70, 62, 48, 42],
          paeBlocks: [
            [1,1,1,1,1,2,3,4],
            [1,1,1,1,1,2,3,4],
            [1,1,1,1,1,2,3,4],
            [1,1,1,1,1,2,3,4],
            [1,1,1,1,1,2,3,4],
            [2,2,2,2,2,1,2,3],
            [3,3,3,3,3,2,1,2],
            [4,4,4,4,4,3,2,2]
          ]
        },
        {
          accession: 'P01308',
          name: t('stem.alphaFold.sample_ins', 'Insulin Precursor'),
          length: '110 aa',
          foldNote: t('stem.alphaFold.sample_ins_note', 'Well-folded A/B hormone helices connected by a flexible C-peptide loop.'),
          pcts: { 'very-high': '48%', confident: '26%', low: '16%', 'very-low': '10%' },
          path: 'M36 98 C66 36 122 40 148 92 C176 144 226 146 254 88 C282 32 330 28 362 72 C392 114 386 142 434 134 C478 126 488 64 520 56',
          segs: {
            'very-high': 'M36 98 C66 36 122 40 148 92',
            confident: 'M148 92 C176 144 226 146 254 88',
            low: 'M254 88 C282 32 330 28 362 72',
            'very-low': 'M362 72 C392 114 386 142 434 134 C478 126 488 64 520 56'
          },
          bars: [92, 94, 91, 89, 86, 81, 76, 72, 65, 58, 52, 47, 44, 51, 64, 78, 86, 91],
          paeBlocks: [
            [1,1,1,3,4,4,2,2],
            [1,1,1,3,4,4,2,2],
            [1,1,1,3,4,4,2,2],
            [3,3,3,2,3,3,3,3],
            [4,4,4,3,2,3,4,4],
            [4,4,4,3,3,2,4,4],
            [2,2,2,3,4,4,1,1],
            [2,2,2,3,4,4,1,1]
          ]
        },
        {
          accession: 'P04637',
          name: t('stem.alphaFold.sample_p53', 'p53 Suppressor'),
          length: '393 aa',
          foldNote: t('stem.alphaFold.sample_p53_note', 'Ordered DNA-binding core flanked by intrinsically disordered low-pLDDT tails.'),
          pcts: { 'very-high': '41%', confident: '17%', low: '18%', 'very-low': '24%' },
          path: 'M36 126 C64 138 92 78 134 94 C172 108 198 34 246 76 C284 110 314 36 352 84 C384 124 424 140 460 112 C486 92 504 54 522 46',
          segs: {
            'very-high': 'M172 108 C198 34 246 76 284 110',
            confident: 'M284 110 C314 36 352 84 374 108',
            low: 'M36 126 C64 138 92 78 134 94 C150 100 160 106 172 108',
            'very-low': 'M374 108 C404 136 436 132 460 112 C486 92 504 54 522 46'
          },
          bars: [38, 42, 46, 54, 62, 86, 94, 96, 95, 93, 88, 76, 61, 48, 41, 36, 34, 39],
          paeBlocks: [
            [2,3,4,4,4,4,4,4],
            [3,2,3,4,4,4,4,4],
            [4,3,1,1,1,3,4,4],
            [4,4,1,1,1,3,4,4],
            [4,4,1,1,1,3,4,4],
            [4,4,3,3,3,2,3,4],
            [4,4,4,4,4,3,2,3],
            [4,4,4,4,4,4,3,2]
          ]
        }
      ];
      var activeSample = SAMPLE_PROTEINS.filter(function (item) { return item.accession === sampleAcc; })[0] || SAMPLE_PROTEINS[0];
      var PAE_EXPLANATIONS = {
        intra: t('stem.alphaFold.pae_intra', 'Dark emerald diagonal blocks (0–5 \u00c5) indicate residues packed closely within one folded domain with high relative-position confidence.'),
        boundary: t('stem.alphaFold.pae_boundary', 'Medium teal squares (6–15 \u00c5) mark domain boundaries or loops where local contacts are plausible but exact orientation has moderate uncertainty.'),
        inter: t('stem.alphaFold.pae_inter', 'Pale or dark off-diagonal squares (>20 \u00c5) mean AlphaFold is uncertain how two domains or disordered tails sit relative to one another.')
      };
      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');
      var progress = (ctx.toolData && ctx.toolData._alphaFoldExplorer) || {};
      var prefillAccession = String(progress.prefillAccession || '').trim().toUpperCase();
      if (!/^[A-Z0-9-]{3,24}$/.test(prefillAccession)) prefillAccession = '';
      var prefillLabel = String(progress.prefillLabel || '').trim().slice(0, 80);
      var prefillSource = safeClip(progress.prefillSource, 120);
      var prefillGene = safeClip(progress.prefillGene, 24).toUpperCase();
      var prefillProtein = safeClip(progress.prefillProtein, 80);
      var prefillCellType = safeClip(progress.prefillCellType, 80);
      var prefillTissue = safeClip(progress.prefillTissue, 80);
      var prefillEvidenceMode = safeClip(progress.prefillEvidenceMode, 80);
      var prefillMetricLabel = safeClip(progress.prefillMetricLabel, 80);
      var prefillEvidenceDetail = safeClip(progress.prefillEvidenceDetail, 360);
      var prefillBiologicalRole = safeClip(progress.prefillBiologicalRole, 260);
      var prefillEvidenceBoundary = safeClip(progress.prefillEvidenceBoundary, 260);
      var prefillAtlasDatasetVersion = safeClip(progress.prefillAtlasDatasetVersion, 100);
      var prefillAtlasAssetSha256 = safeClip(progress.prefillAtlasAssetSha256, 100);
      var prefillAtlasSourceTitle = safeClip(progress.prefillAtlasSourceTitle, 180);
      var prefillAtlasSourceUrl = safeClip(progress.prefillAtlasSourceUrl, 260);
      var prefillAtlasCitation = safeClip(progress.prefillAtlasCitation, 220);
      var cellAtlasHandoff = progress._scaleJourneySource === 'cellAtlasLab' && !!prefillAccession && !!prefillGene;
      var crossScaleAnswer = safeClip(progress.crossScaleAnswer, 24);
      var savedCrossScaleRecord = progress.crossScaleEvidenceRecord && progress.crossScaleEvidenceRecord.accession === prefillAccession ? progress.crossScaleEvidenceRecord : {};
      function downloadTextFile(filename, content, mimeType) {
        try {
          if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false;
          var blob = new Blob([content], { type: mimeType || 'text/markdown;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.rel = 'noopener';
          if (document.body) document.body.appendChild(link);
          link.click();
          if (link.parentNode) link.parentNode.removeChild(link);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          return true;
        } catch (error) {
          return false;
        }
      }
      function alphaFoldExportArtifact() {
        var record = savedCrossScaleRecord || {};
        var atlasProvenance = record.atlasProvenance || {};
        var structureRecord = record.structureRecord || null;
        return {
          schemaVersion: 'cell-atlas-artifact/v1',
          artifactType: 'alphafold-cross-scale-evidence',
          title: 'Cell Atlas ↔ AlphaFold learner evidence record',
          generatedAt: new Date().toISOString(),
          context: { tissue: record.tissue || prefillTissue, cellType: record.cellType || prefillCellType, accession: record.accession || prefillAccession },
          provenance: {
            atlas: atlasProvenance,
            alphaFoldDB: { accession: record.accession || prefillAccession, url: structureRecord && structureRecord.databaseUrl ? structureRecord.databaseUrl : 'https://alphafold.ebi.ac.uk/entry/' + encodeURIComponent(record.accession || prefillAccession) }
          },
          boundary: 'RNA evidence, protein abundance, localization, structure, and function remain distinct evidence levels. No protein sequence is included in this artifact.',
          learningPath: alphaFoldLearningPath(),
          record: {
            accession: record.accession || prefillAccession,
            gene: record.gene || prefillGene,
            protein: record.protein || prefillProtein || prefillLabel,
            tissue: record.tissue || prefillTissue,
            cellType: record.cellType || prefillCellType,
            atlasEvidenceMode: record.atlasEvidenceMode || prefillEvidenceMode,
            atlasMetricLabel: record.atlasMetricLabel || prefillMetricLabel,
            atlasEvidence: record.atlasEvidence || prefillEvidenceDetail,
            structureObservation: record.structureObservation || '',
            structureEvidence: record.structureEvidence || '',
            cautiousClaim: record.cautiousClaim || '',
            nextTest: record.nextTest || '',
            evidenceBoundary: record.evidenceBoundary || prefillEvidenceBoundary,
            structureRecord: structureRecord
          }
        };
      }
      function alphaFoldArtifactMarkdown(artifact) {
        var record = artifact.record || {};
        var atlas = artifact.provenance && artifact.provenance.atlas ? artifact.provenance.atlas : {};
        var learningPath = artifact.learningPath || {};
        var learningRouteLine = learningPath.total ? String(learningPath.completedCount || 0) + '/' + String(learningPath.total) + ' milestones complete' : 'not recorded';
        var nextRouteLine = learningPath.nextStep && learningPath.nextStep.label ? learningPath.nextStep.label : 'none recorded';
        return [
          '# ' + artifact.title,
          '',
          'Learning route: ' + learningRouteLine,
          'Next recommended step: ' + nextRouteLine,
          '',
          'Artifact schema: ' + artifact.schemaVersion,
          'Artifact type: ' + artifact.artifactType,
          'Generated: ' + artifact.generatedAt,
          'Tissue / cell: ' + (record.tissue || 'not recorded') + ' / ' + (record.cellType || 'not recorded'),
          'Accession: ' + (record.accession || 'not recorded'),
          'Atlas dataset version: ' + (atlas.datasetVersion || 'not recorded'),
          'Atlas asset SHA-256: ' + (atlas.assetSha256 || 'not recorded'),
          'Atlas source URL: ' + (atlas.sourceUrl || 'not recorded'),
          'AlphaFold DB URL: ' + ((artifact.provenance && artifact.provenance.alphaFoldDB && artifact.provenance.alphaFoldDB.url) || 'not recorded'),
          'Boundary: ' + artifact.boundary,
          '',
          '## Learner evidence',
          '',
          'Atlas observation: ' + (record.atlasEvidence || 'not recorded'),
          'Structural observation: ' + (record.structureObservation || 'not recorded'),
          'Model evidence: ' + (record.structureEvidence || 'not recorded'),
          'Cautious claim: ' + (record.cautiousClaim || 'not recorded'),
          'Missing evidence or next test: ' + (record.nextTest || 'not recorded')
        ].join('\n');
      }
      function downloadAlphaFoldArtifact(format) {
        var artifact = alphaFoldExportArtifact();
        var isJson = format === 'json';
        var body = isJson ? JSON.stringify(artifact, null, 2) : alphaFoldArtifactMarkdown(artifact);
        var downloaded = downloadTextFile('cell-atlas-alphafold-evidence' + (isJson ? '.json' : '.md'), body, isJson ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8');
        patchProgress({ crossScaleExportStatus: downloaded ? (isJson ? 'downloaded-json' : 'downloaded') : 'download-failed' });
      }
      var _observationState = React.useState(safeClip(savedCrossScaleRecord.structureObservation, 600)); var structureObservation = _observationState[0], setStructureObservation = _observationState[1];
      var _structureEvidenceState = React.useState(safeClip(savedCrossScaleRecord.structureEvidence, 600)); var structureEvidence = _structureEvidenceState[0], setStructureEvidence = _structureEvidenceState[1];
      var _claimState = React.useState(safeClip(savedCrossScaleRecord.cautiousClaim, 600)); var cautiousClaim = _claimState[0], setCautiousClaim = _claimState[1];
      var _nextTestState = React.useState(safeClip(savedCrossScaleRecord.nextTest, 600)); var nextTest = _nextTestState[0], setNextTest = _nextTestState[1];
      var _prevAccRef = React.useRef(prefillAccession);
      React.useEffect(function () {
        if (_prevAccRef.current === prefillAccession) return;
        _prevAccRef.current = prefillAccession;
        var matchRec = (savedCrossScaleRecord && savedCrossScaleRecord.accession === prefillAccession) ? savedCrossScaleRecord : {};
        setStructureObservation(safeClip(matchRec.structureObservation, 600));
        setStructureEvidence(safeClip(matchRec.structureEvidence, 600));
        setCautiousClaim(safeClip(matchRec.cautiousClaim, 600));
        setNextTest(safeClip(matchRec.nextTest, 600));
      }, [prefillAccession]);
      var explorerLaunchUrl = ALPHAFOLD_URL + '&lang=' + encodeURIComponent(ctx.lang || 'en') + '&theme=' + encodeURIComponent(ctx.theme || 'dark') + (prefillAccession ? '&accession=' + encodeURIComponent(prefillAccession) : '');
      var openedCount = progress.openedCount || (progress.opened ? 1 : 0);
      var lookupCount = progress.lookupCount || 0;
      var preparedCount = progress.sequencePreparedCount || 0;
      var guidanceCount = (progress.coachCount || 0) + (progress.guideCount || 0) + (progress.variantAnalysisCount || 0);
      var exportedCount = progress.crossScaleExportStatus === 'downloaded' || progress.crossScaleExportStatus === 'downloaded-json' ? 1 : 0;
      var packetRouteComplete = !!(savedCrossScaleRecord.complete && exportedCount > 0);
      function alphaFoldLearningPath() {
        var steps = [
          { id: 'launch', label: 'Launch safely', complete: openedCount > 0 },
          { id: 'inspect', label: 'Inspect the model', complete: lookupCount > 0 },
          { id: 'explain', label: 'Explain cautiously', complete: guidanceCount > 0 },
          { id: 'package', label: 'Package the evidence', complete: true }
        ];
        var completedCount = steps.filter(function (step) { return step.complete; }).length;
        var nextStep = steps.filter(function (step) { return !step.complete; })[0] || null;
        return {
          routeId: 'alphafold-cross-scale-route/v1',
          completedCount: completedCount,
          total: steps.length,
          steps: steps,
          nextStep: nextStep ? { id: nextStep.id, label: nextStep.label } : null
        };
      }
      var confidenceBands = [
        { id: 'very-high', color: '#1d4ed8', range: '>90', name: t('stem.alphaFold.confidence_very_high', 'Very high'), detail: t('stem.alphaFold.confidence_very_high_detail', 'The local backbone is predicted with very high confidence. Still compare it with experimental or biological evidence.') },
        { id: 'confident', color: '#38bdf8', range: '70-90', name: t('stem.alphaFold.confidence_confident', 'Confident'), detail: t('stem.alphaFold.confidence_confident_detail', 'The local fold is generally reliable, though side chains and flexible boundaries may need closer inspection.') },
        { id: 'low', color: '#facc15', range: '50-70', name: t('stem.alphaFold.confidence_low', 'Low'), detail: t('stem.alphaFold.confidence_low_detail', 'Treat this region cautiously. It may be flexible, disordered, or uncertain in this prediction.') },
        { id: 'very-low', color: '#f97316', range: '<50', name: t('stem.alphaFold.confidence_very_low', 'Very low'), detail: t('stem.alphaFold.confidence_very_low_detail', 'This region should not be interpreted as a dependable structure without supporting evidence.') }
      ];
      var selectedBand = confidenceBands.filter(function (band) { return band.id === confidenceBand; })[0];

      function selectConfidenceBand(id) {
        var next = confidenceBand === id ? 'all' : id;
        setConfidenceBand(next);
        if (announceToSR) announceToSR(next === 'all' ? t('stem.alphaFold.confidence_all_sr', 'Showing all prediction confidence bands.') : t('stem.alphaFold.confidence_selected_sr', 'Showing the selected prediction confidence band:') + ' ' + confidenceBands.filter(function (band) { return band.id === next; })[0].name + '.');
      }

      function metric(label, value, note) {
        var active = Number(value) > 0;
        return h('div', { className: 'af-metric', role: 'listitem', 'data-active': active ? 'true' : 'false' },
          h('span', { className: 'af-metric-label' }, label),
          h('strong', { className: 'af-metric-value' }, value),
          h('span', { className: 'af-metric-note' }, note));
      }

      function routeCard(step, title, body, complete, state) {
        return h('article', { className: 'af-route-card', 'data-complete': complete ? 'true' : 'false' },
          h('div', { className: 'af-route-kicker' },
            h('span', null, t('stem.alphaFold.step_label', 'Step') + ' ' + step),
            h('span', { className: 'af-route-state' }, complete ? t('stem.alphaFold.complete', '\u2713 Complete') : state)),
          h('h4', null, title),
          h('p', null, body));
      }

      function patchProgress(patch) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          next._alphaFoldExplorer = Object.assign({}, next._alphaFoldExplorer || {}, patch || {});
          return next;
        });
      }

      function answerCrossScale(answer) {
        patchProgress({
          crossScaleAnswer: answer,
          crossScaleReasoningCount: (progress.crossScaleReasoningCount || 0) + 1
        });
        if (announceToSR) announceToSR(answer === 'separate' ? t('stem.alphaFold.cross_scale_recorded_sr', 'Cautious cross-scale conclusion recorded.') : t('stem.alphaFold.cross_scale_review_sr', 'Review the evidence boundaries between RNA, protein, structure, and function.'));
      }

      function saveCrossScaleEvidenceRecord() {
        var observation = safeEvidenceText(structureObservation, 600);
        var modelEvidence = safeEvidenceText(structureEvidence, 600);
        var claim = safeEvidenceText(cautiousClaim, 600);
        var experiment = safeEvidenceText(nextTest, 600);
        var complete = crossScaleAnswer === 'separate' && observation.length >= 12 && modelEvidence.length >= 12 && claim.length >= 12 && experiment.length >= 12;
        if (!complete) {
          if (announceToSR) announceToSR(t('stem.alphaFold.record_incomplete_sr', 'Complete the evidence-boundary check and all four evidence-record fields before saving.'));
          return;
        }
        var record = {
          schemaVersion: 1,
          kind: 'cell-atlas-alphafold-evidence',
          sourceLabel: 'Learner-authored cross-scale record',
          complete: true,
          accession: prefillAccession,
          gene: prefillGene,
          protein: prefillProtein || prefillLabel,
          cellType: prefillCellType,
          tissue: prefillTissue,
          atlasEvidenceMode: prefillEvidenceMode,
          atlasMetricLabel: prefillMetricLabel,
          atlasEvidence: prefillEvidenceDetail,
          atlasProvenance: {
            datasetVersion: prefillAtlasDatasetVersion,
            assetSha256: prefillAtlasAssetSha256,
            sourceTitle: prefillAtlasSourceTitle,
            sourceUrl: prefillAtlasSourceUrl,
            citation: prefillAtlasCitation
          },
          structureObservation: observation,
          structureEvidence: modelEvidence,
          cautiousClaim: claim,
          nextTest: experiment,
          evidenceBoundary: prefillEvidenceBoundary
        };
        if (typeof setLabToolData === 'function') setLabToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          var explorer = Object.assign({}, next._alphaFoldExplorer || {});
          explorer.crossScaleEvidenceRecord = record;
          explorer.crossScaleRecordCount = (explorer.crossScaleRecordCount || 0) + 1;
          next._alphaFoldExplorer = explorer;
          next.cellAtlasLab = Object.assign({}, next.cellAtlasLab || {}, { alphaFoldEvidenceRecord: record });
          return next;
        });
        if (announceToSR) announceToSR(t('stem.alphaFold.record_saved_sr', 'Cross-scale evidence record saved for Cell Atlas.'));
      }

      function companionHandoffPayload() {
        if (!cellAtlasHandoff) return null;
        return {
          schemaVersion: 1,
          source: 'cellAtlasLab',
          accession: prefillAccession,
          gene: prefillGene,
          protein: prefillProtein || prefillLabel,
          cellType: prefillCellType,
          tissue: prefillTissue,
          atlasMetricLabel: prefillMetricLabel,
          atlasEvidence: prefillEvidenceDetail,
          evidenceBoundary: prefillEvidenceBoundary,
          atlasProvenance: {
            datasetVersion: prefillAtlasDatasetVersion,
            assetSha256: prefillAtlasAssetSha256,
            sourceTitle: prefillAtlasSourceTitle,
            sourceUrl: prefillAtlasSourceUrl,
            citation: prefillAtlasCitation
          }
        };
      }

      function captureCompanionEvidence(data) {
        if (!cellAtlasHandoff || !data || data.schemaVersion !== 1 || data.source !== 'AlphaFold DB' || data.structureLoaded !== true) return;
        var accession = safeClip(data.accession, 24).toUpperCase();
        if (!/^[A-Z0-9-]{3,24}$/.test(accession) || accession !== prefillAccession) return;
        var observation = safeEvidenceText(data.observation, 600);
        var evidence = safeEvidenceText(data.evidence, 600);
        var claim = safeEvidenceText(data.claim, 600);
        var caution = safeEvidenceText(data.caution, 600);
        if (observation.length < 12 || evidence.length < 12 || claim.length < 12 || caution.length < 12) return;
        var pae = data.paeSelection && typeof data.paeSelection === 'object' ? data.paeSelection : {};
        function finitePae(value) {
          var number = Number(value);
          return Number.isFinite(number) && number >= 0 && number <= 100 ? Math.round(number * 10) / 10 : null;
        }
        var paeSelection = {
          available: pae.available === true,
          matrixSize: Math.max(0, Math.min(2500, Math.round(Number(pae.matrixSize) || 0))),
          alignedResidue: Math.max(0, Math.min(100000, Math.round(Number(pae.alignedResidue) || 0))),
          comparedResidue: Math.max(0, Math.min(100000, Math.round(Number(pae.comparedResidue) || 0))),
          forwardAngstroms: finitePae(pae.forwardAngstroms),
          reverseAngstroms: finitePae(pae.reverseAngstroms),
          interpretation: safeEvidenceText(pae.interpretation, 360)
        };
        var record = {
          schemaVersion: 1,
          kind: 'cell-atlas-alphafold-evidence',
          sourceLabel: 'Learner-authored reasoning with companion-verified public-record metadata',
          captureMethod: 'alphafold-companion-explicit-send',
          complete: true,
          accession: prefillAccession,
          gene: prefillGene,
          protein: prefillProtein || prefillLabel,
          cellType: prefillCellType,
          tissue: prefillTissue,
          atlasEvidenceMode: prefillEvidenceMode,
          atlasMetricLabel: prefillMetricLabel,
          atlasEvidence: prefillEvidenceDetail,
          atlasProvenance: {
            datasetVersion: prefillAtlasDatasetVersion,
            assetSha256: prefillAtlasAssetSha256,
            sourceTitle: prefillAtlasSourceTitle,
            sourceUrl: prefillAtlasSourceUrl,
            citation: prefillAtlasCitation
          },
          structureObservation: observation,
          structureEvidence: evidence,
          cautiousClaim: claim,
          nextTest: caution,
          evidenceBoundary: prefillEvidenceBoundary,
          structureRecord: {
            source: 'AlphaFold DB',
            accession: accession,
            entryId: safeClip(data.entryId, 80),
            proteinName: safeClip(data.proteinName, 160),
            organism: safeClip(data.organism, 120),
            gene: safeClip(data.gene, 40),
            length: safeClip(data.length, 60),
            confidenceSummary: safeEvidenceText(data.confidenceSummary, 240),
            structureLoaded: true,
            databaseUrl: 'https://alphafold.ebi.ac.uk/entry/' + encodeURIComponent(accession),
            paeSelection: paeSelection
          }
        };
        if (typeof setLabToolData === 'function') setLabToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          var explorer = Object.assign({}, next._alphaFoldExplorer || {});
          explorer.crossScaleEvidenceRecord = record;
          explorer.companionEvidenceCount = (explorer.companionEvidenceCount || 0) + 1;
          explorer.lookupCount = Math.max(1, explorer.lookupCount || 0);
          next._alphaFoldExplorer = explorer;
          next.cellAtlasLab = Object.assign({}, next.cellAtlasLab || {}, { alphaFoldEvidenceRecord: record });
          return next;
        });
        setStructureObservation(observation);
        setStructureEvidence(evidence);
        setCautiousClaim(claim);
        setNextTest(caution);
        if (announceToSR) announceToSR(t('stem.alphaFold.companion_verified_sr', 'Verified AlphaFold companion evidence received for') + ' ' + accession + '.');
      }

      function returnToCellAtlas() {
        if (typeof setLabToolData === 'function') setLabToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          next._alphaFoldExplorer = Object.assign({}, next._alphaFoldExplorer || {}, {
            crossScaleReturnCount: ((next._alphaFoldExplorer && next._alphaFoldExplorer.crossScaleReturnCount) || 0) + 1
          });
          next.cellAtlasLab = Object.assign({}, next.cellAtlasLab || {}, { alphaFoldRoundTrip: true });
          return next;
        });
        if (typeof ctx.setStemLabTab === 'function') ctx.setStemLabTab('explore');
        if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool('cellAtlasLab');
        if (announceToSR) announceToSR(t('stem.alphaFold.return_cell_atlas_sr', 'Returning to the Cell Atlas evidence investigation.'));
      }

      function bumpSlice(key) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._alphaFoldExplorer) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._alphaFoldExplorer = cur; return next;
        });
      }

      var _onMsgRef = React.useRef(null);
      _onMsgRef.current = function (ev) {
        var data = ev && ev.data;
        if (!data || typeof data.type !== 'string') return;
        var activePopup = (_win.current && !_win.current.closed) ? _win.current : ((_alphafoldPopup && !_alphafoldPopup.closed) ? _alphafoldPopup : null);
        if (activePopup && !_win.current) _win.current = activePopup;
        if (!_alphafoldBridgeTrusted(ev, activePopup)) return;
        if (data.type === 'allocaf-hello') {
          if (activePopup && ev.source !== activePopup) return;
          try { if (ev.source) ev.source.postMessage({ type: 'allocaf-ready', ai: aiOn, cellAtlasHandoff: companionHandoffPayload() }, ALPHAFOLD_ORIGIN); } catch (_) {}
          setPopupState('open');
          return;
        }
        if (data.type === 'allocaf-closed') { setPopupState('closed'); return; }
        if (data.type === 'allocaf-db-hit') { bumpSlice('lookupCount'); return; }
        if (data.type === 'allocaf-file-imported') { bumpSlice('fileImportCount'); return; }
        if (data.type === 'allocaf-sequence-prepared') { bumpSlice('sequencePreparedCount'); return; }
        if (data.type === 'allocaf-cross-scale-evidence') {
          if (!activePopup || ev.source !== activePopup) return;
          captureCompanionEvidence(data);
          return;
        }
        var isCoachRequest = data.type === 'allocaf-ai-request';
        var isGuideRequest = data.type === 'allocaf-ai-guide-request';
        var isVariantRequest = data.type === 'allocaf-ai-variant-request';
        if ((!isCoachRequest && !isGuideRequest && !isVariantRequest) || !data.id) return;
        var replyTo = ev.source || activePopup;
        var respond = function (payload) {
          try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allocaf-ai-response', id: data.id }, payload), ALPHAFOLD_ORIGIN); } catch (_) {}
        };
        if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
        bumpSlice(isVariantRequest ? 'variantAnalysisCount' : (isGuideRequest ? 'guideCount' : 'coachCount'));
        Promise.resolve().then(function () {
          var prompt = isVariantRequest ? buildVariantPrompt(data) : (isGuideRequest ? buildGuidePrompt(data) : buildCoachPrompt(data));
          return ctx.callGemini(prompt, false, false, 0.7);
        }).then(function (resp) {
          var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
          respond({ text: String(text || '').slice(0, 1200) });
        }).catch(function (e) {
          respond({ error: String((e && e.message) || e).slice(0, 120) });
        });
      };

      React.useEffect(function () {
        function onMsg(ev) { if (_onMsgRef.current) _onMsgRef.current(ev); }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn]);

      function openExplorer(accessionOverride) {
        var targetAcc = (typeof accessionOverride === 'string' && /^[A-Z0-9-]{3,24}$/.test(accessionOverride)) ? accessionOverride : prefillAccession;
        var launchUrl = ALPHAFOLD_URL + '&lang=' + encodeURIComponent(ctx.lang || 'en') + '&theme=' + encodeURIComponent(ctx.theme || 'dark') + (targetAcc ? '&accession=' + encodeURIComponent(targetAcc) : '');
        var existing = (_win.current && !_win.current.closed) ? _win.current : ((_alphafoldPopup && !_alphafoldPopup.closed) ? _alphafoldPopup : null);
        if (existing && !existing.closed && !targetAcc) {
          _win.current = existing;
          try { existing.focus(); } catch (_) {}
          return;
        }
        var w = null;
        try { w = window.open(launchUrl, 'alloflow-alphafold-explorer', 'width=1360,height=900'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.alphaFold.popup_blocked', 'The AlphaFold Explorer window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        _alphafoldPopup = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.alphaFold.opened_sr', 'Opened AlphaFold Explorer in a new window.'));
      }

      function renderCellAtlasBridge() {
        if (!cellAtlasHandoff) return null;
        var correct = crossScaleAnswer === 'separate';
        return h('section', { className: 'af-section af-cross-scale', 'aria-labelledby': 'af-cross-scale-title' },
          h('div', { className: 'af-section-head' },
            h('div', null,
              h('p', { className: 'af-eyebrow' }, t('stem.alphaFold.bridge_label', 'Cell Atlas \u2192 AlphaFold evidence bridge')),
              h('h3', { id: 'af-cross-scale-title' }, t('stem.alphaFold.bridge_title', 'One biological story, four different evidence levels')),
              h('p', null, t('stem.alphaFold.bridge_intro', 'Carry the RNA observation forward without letting one tool answer a question measured by another.')))),
          h('div', { className: 'af-cross-meta', role: 'list', 'aria-label': t('stem.alphaFold.handoff_context_aria', 'Cell Atlas handoff context') },
            h('span', { className: 'af-cross-chip', role: 'listitem' }, prefillTissue || t('stem.alphaFold.tissue_atlas', 'Tissue atlas')),
            h('span', { className: 'af-cross-chip', role: 'listitem' }, prefillCellType || t('stem.alphaFold.selected_cell', 'Selected cell')),
            h('span', { className: 'af-cross-chip', role: 'listitem' }, prefillGene + ' ' + t('stem.alphaFold.gene_protein_arrow', '\u2192') + ' ' + (prefillProtein || prefillLabel)),
            h('span', { className: 'af-cross-chip', role: 'listitem' }, prefillMetricLabel || t('stem.alphaFold.rna_evidence', 'RNA evidence'))),
          h('div', { className: 'af-cross-evidence' },
            h('strong', null, t('stem.alphaFold.atlas_observation_label', 'Atlas observation:')), ' ', prefillEvidenceDetail,
            prefillSource && h('span', null, ' ' + t('stem.alphaFold.source_context_prefix', 'Source context:') + ' ' + prefillSource + '.')),
          h('div', { className: 'af-evidence-ladder' },
            h('article', { className: 'af-evidence-step' },
              h('span', null, t('stem.alphaFold.observed_step', '01 Observed')),
              h('h4', null, t('stem.alphaFold.rna_evidence', 'RNA evidence')),
              h('p', null, prefillEvidenceMode + '. ' + (prefillEvidenceBoundary || t('stem.alphaFold.rna_abundance_boundary', 'RNA abundance does not directly measure protein.')))),
            h('article', { className: 'af-evidence-step' },
              h('span', null, t('stem.alphaFold.hypothesized_step', '02 Hypothesized')),
              h('h4', null, t('stem.alphaFold.protein_presence', 'Protein presence')),
              h('p', null, t('stem.alphaFold.protein_hypothesis', 'The transcript supports a hypothesis that the protein may be produced. Confirm abundance and cellular localization with proteomics, immunostaining, or another protein assay.'))),
            h('article', { className: 'af-evidence-step' },
              h('span', null, t('stem.alphaFold.predicted_step', '03 Predicted')),
              h('h4', null, t('stem.alphaFold.protein_structure', 'Protein structure')),
              h('p', null, t('stem.alphaFold.structure_prediction', 'AlphaFold predicts a sequence-compatible 3D model. Inspect pLDDT and PAE; structural confidence is not evidence that this cell produced an active protein.'))),
            h('article', { className: 'af-evidence-step' },
              h('span', null, t('stem.alphaFold.tested_step', '04 Tested')),
              h('h4', null, t('stem.alphaFold.function_in_context', 'Function in context')),
              h('p', null, t('stem.alphaFold.function_test', 'Use localization, perturbation, interaction, or functional assays to test whether the protein contributes to the proposed cell role.')))),
          prefillBiologicalRole && h('div', { className: 'af-confidence-caution' },
            h('strong', null, t('stem.alphaFold.biological_hypothesis_label', 'Biological hypothesis from the atlas:')), ' ', prefillBiologicalRole),
          h('div', { style: { marginTop: '12px' } },
            h('h3', null, t('stem.alphaFold.claim_question', 'Which conclusion respects every evidence boundary?')),
            h('div', { className: 'af-claim-grid', role: 'group', 'aria-label': t('stem.alphaFold.claim_choices_aria', 'Cross-scale claim choices') },
              h('button', { type: 'button', className: 'af-claim-choice', 'aria-pressed': crossScaleAnswer === 'proof' ? 'true' : 'false', onClick: function () { answerCrossScale('proof'); } }, t('stem.alphaFold.claim_overreach', 'High RNA evidence plus a confident AlphaFold model proves the protein is abundant, correctly localized, and active in this cell.')),
              h('button', { type: 'button', className: 'af-claim-choice', 'aria-pressed': crossScaleAnswer === 'separate' ? 'true' : 'false', onClick: function () { answerCrossScale('separate'); } }, t('stem.alphaFold.claim_separate', 'The atlas supports a transcript-level hypothesis, while AlphaFold supplies separate structural-model evidence; protein abundance, localization, and function still require appropriate experiments.')),
              h('button', { type: 'button', className: 'af-claim-choice', 'aria-pressed': crossScaleAnswer === 'expression' ? 'true' : 'false', onClick: function () { answerCrossScale('expression'); } }, t('stem.alphaFold.claim_expression', 'A low-confidence AlphaFold region would show that the gene was not expressed in the atlas.'))),
            crossScaleAnswer && h('div', { className: 'af-cross-feedback', 'data-correct': correct ? 'true' : 'false', role: 'status' },
              correct
                ? t('stem.alphaFold.claim_correct', 'Well separated: transcript, protein, structure, and function are connected hypotheses measured by different evidence.')
                : t('stem.alphaFold.claim_incorrect', 'That claim crosses measurement levels. AlphaFold confidence describes a structural model; it cannot establish RNA expression, protein abundance, localization, or activity.'))),
          h('div', { className: 'af-evidence-notebook', 'aria-labelledby': 'af-evidence-notebook-title' },
            h('h3', { id: 'af-evidence-notebook-title' }, t('stem.alphaFold.record_title', 'Build a cross-scale evidence record')),
            h('p', null, t('stem.alphaFold.record_intro', 'Write only what you actually inspected. AlphaFold model evidence remains separate from the atlas RNA measurement, and no protein sequence is stored in this record.')),
            h('div', { className: 'af-note-grid' },
              h('div', { className: 'af-note-field' },
                h('label', { htmlFor: 'af-cross-observation' }, t('stem.alphaFold.record_observation_label', '1. Structural observation')),
                h('textarea', { id: 'af-cross-observation', rows: 3, maxLength: 600, value: structureObservation, placeholder: t('stem.alphaFold.record_observation_placeholder', 'I observed a compact region and a lower-confidence flexible segment...'), onChange: function (event) { setStructureObservation(event.target.value); } })),
              h('div', { className: 'af-note-field' },
                h('label', { htmlFor: 'af-cross-evidence' }, t('stem.alphaFold.record_model_label', '2. Model evidence')),
                h('textarea', { id: 'af-cross-evidence', rows: 3, maxLength: 600, value: structureEvidence, placeholder: t('stem.alphaFold.record_model_placeholder', 'The pLDDT colors support local confidence in..., while PAE suggests uncertainty between...'), onChange: function (event) { setStructureEvidence(event.target.value); } })),
              h('div', { className: 'af-note-field' },
                h('label', { htmlFor: 'af-cross-claim' }, t('stem.alphaFold.record_claim_label', '3. Cautious claim')),
                h('textarea', { id: 'af-cross-claim', rows: 3, maxLength: 600, value: cautiousClaim, placeholder: t('stem.alphaFold.record_claim_placeholder', 'Together, the atlas and model support the hypothesis that..., but they do not establish...'), onChange: function (event) { setCautiousClaim(event.target.value); } })),
              h('div', { className: 'af-note-field' },
                h('label', { htmlFor: 'af-cross-next-test' }, t('stem.alphaFold.record_next_label', '4. Missing evidence or next test')),
                h('textarea', { id: 'af-cross-next-test', rows: 3, maxLength: 600, value: nextTest, placeholder: t('stem.alphaFold.record_next_placeholder', 'Next I would test protein abundance, localization, or function by...'), onChange: function (event) { setNextTest(event.target.value); } }))),
            h('div', { className: 'af-record-checks', 'aria-label': t('stem.alphaFold.record_completion_aria', 'Evidence record completion') },
              h('span', { className: 'af-record-check', 'data-done': correct ? 'true' : 'false' }, correct ? t('stem.alphaFold.record_separated', '\u2713 Evidence levels separated') : t('stem.alphaFold.record_not_separated', 'Evidence levels not yet separated')),
              h('span', { className: 'af-record-check', 'data-done': safeClip(structureObservation, 600).length >= 12 ? 'true' : 'false' }, t('stem.alphaFold.record_observation_badge', 'Observation')),
              h('span', { className: 'af-record-check', 'data-done': safeClip(structureEvidence, 600).length >= 12 ? 'true' : 'false' }, t('stem.alphaFold.record_model_badge', 'Model evidence')),
              h('span', { className: 'af-record-check', 'data-done': safeClip(cautiousClaim, 600).length >= 12 ? 'true' : 'false' }, t('stem.alphaFold.record_claim_badge', 'Cautious claim')),
              h('span', { className: 'af-record-check', 'data-done': safeClip(nextTest, 600).length >= 12 ? 'true' : 'false' }, t('stem.alphaFold.record_next_badge', 'Next test'))),
            h('button', {
              type: 'button',
              className: 'af-primary',
              disabled: !(correct && safeClip(structureObservation, 600).length >= 12 && safeClip(structureEvidence, 600).length >= 12 && safeClip(cautiousClaim, 600).length >= 12 && safeClip(nextTest, 600).length >= 12),
              onClick: saveCrossScaleEvidenceRecord
            }, t('stem.alphaFold.record_save_button', 'Save cross-scale evidence record')),
            savedCrossScaleRecord.complete && h('div', { className: 'af-record-saved', role: 'status' }, t('stem.alphaFold.record_saved_message', 'Evidence record saved for return to Cell Atlas. Revise any field and save again to update it.'))),
            savedCrossScaleRecord.complete && h('div', { className: 'af-actions', role: 'group', 'aria-label': t('stem.alphaFold.record_downloads_aria', 'Download evidence record') },
              h('button', { type: 'button', className: 'af-secondary', onClick: function () { downloadAlphaFoldArtifact('md'); } }, t('stem.alphaFold.record_download_md', 'Download evidence record (.md)')),
              h('button', { type: 'button', className: 'af-secondary', onClick: function () { downloadAlphaFoldArtifact('json'); } }, t('stem.alphaFold.record_download_json', 'Download evidence record (.json)')),
              progress.crossScaleExportStatus === 'downloaded' && h('span', { className: 'af-action-note', role: 'status' }, 'Downloaded cell-atlas-alphafold-evidence.md.'),
              progress.crossScaleExportStatus === 'downloaded-json' && h('span', { className: 'af-action-note', role: 'status' }, 'Downloaded cell-atlas-alphafold-evidence.json.'),
              progress.crossScaleExportStatus === 'download-failed' && h('span', { className: 'af-action-note', role: 'status' }, 'Download unavailable; select the evidence record manually.')),
          h('div', { className: 'af-actions' },
            h('button', { type: 'button', className: 'af-primary', onClick: openExplorer }, t('stem.alphaFold.inspect_prefix', 'Inspect') + ' ' + (prefillProtein || prefillGene) + ' ' + t('stem.alphaFold.structure_suffix', 'structure \u2192')),
            h('button', { type: 'button', className: 'af-secondary', onClick: returnToCellAtlas }, t('stem.alphaFold.return_cell_atlas_button', '\u2190 Return to Cell Atlas evidence'))));
      }

      var statusText = popupState === 'open'
        ? t('stem.alphaFold.status_open', 'Explorer connected')
        : popupState === 'opening'
          ? t('stem.alphaFold.status_opening', 'Opening companion window')
          : popupState === 'blocked'
            ? t('stem.alphaFold.status_blocked', 'Pop-up needs permission')
            : t('stem.alphaFold.status_ready', 'Ready to investigate');

      var completedRouteSteps = (openedCount > 0 ? 1 : 0) + (lookupCount > 0 ? 1 : 0) + (guidanceCount > 0 ? 1 : 0) + (packetRouteComplete ? 1 : 0);
      var paeColorScale = { 1: '#059669', 2: '#34d399', 3: '#a7f3d0', 4: '#1e293b' };
      var paeRegionForLevel = function (lvl) { return lvl === 1 ? 'intra' : (lvl <= 2 ? 'boundary' : 'inter'); };
      function barColorForScore(score) {
        if (score >= 90) return '#1d4ed8';
        if (score >= 70) return '#38bdf8';
        if (score >= 50) return '#facc15';
        return '#f97316';
      }

      function handleStageTabKeyDown(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          var next = e.key === 'Home' ? 'ribbon' : (e.key === 'End' ? 'pae' : (stageView === 'ribbon' ? 'pae' : 'ribbon'));
          setStageView(next);
          var btn = typeof document !== 'undefined' ? document.getElementById('af-stage-tab-' + next) : null;
          if (btn && typeof btn.focus === 'function') btn.focus();
        }
      }

      return h('section', { className: 'af-launcher', 'aria-label': t('stem.alphaFold.title', 'AlphaFold Explorer'), 'data-alphafold-mission': 'true', 'data-theme': afTheme },
        h('header', { className: 'af-mission' },
          h('div', { className: 'af-mission-top' },
            h('div', { className: 'af-mission-copy', style: { display: 'flex', alignItems: 'flex-start', gap: '12px' } },
              h('svg', { width: 44, height: 44, viewBox: '0 0 44 44', 'aria-hidden': 'true', focusable: 'false', style: { flexShrink: 0, marginTop: '2px' } },
                h('defs', null,
                  h('radialGradient', { id: 'af-emb-bg', cx: '34%', cy: '28%', r: '72%' },
                    h('stop', { offset: '0%', stopColor: '#0e7490' }),
                    h('stop', { offset: '58%', stopColor: '#0f172a' }),
                    h('stop', { offset: '100%', stopColor: '#020617' })
                  ),
                  h('linearGradient', { id: 'af-emb-rib', x1: '0', y1: '0', x2: '1', y2: '1' },
                    h('stop', { offset: '0%', stopColor: '#1d4ed8' }),
                    h('stop', { offset: '42%', stopColor: '#38bdf8' }),
                    h('stop', { offset: '74%', stopColor: '#facc15' }),
                    h('stop', { offset: '100%', stopColor: '#f97316' })
                  )
                ),
                h('rect', { x: 2, y: 2, width: 40, height: 40, rx: 11, fill: afTheme === 'contrast' ? '#000000' : 'url(#af-emb-bg)', stroke: afTheme === 'contrast' ? '#ffff00' : '#2dd4bf', strokeWidth: 1.4 }),
                afTheme !== 'contrast' && h('path', { d: 'M9 5.2 H35', stroke: '#ccfbf1', strokeWidth: 0.9, opacity: 0.4, strokeLinecap: 'round' }),
                afTheme !== 'contrast' && h('path', { d: 'M9 28 C13 11, 21 11, 23 23 C25 34, 32 33, 35 16', fill: 'none', stroke: '#38bdf8', strokeWidth: 6.5, strokeLinecap: 'round', opacity: 0.22 }),
                h('path', { d: 'M9 28 C13 11, 21 11, 23 23 C25 34, 32 33, 35 16', fill: 'none', stroke: afTheme === 'contrast' ? '#00ff00' : 'url(#af-emb-rib)', strokeWidth: 3.4, strokeLinecap: 'round' }),
                afTheme !== 'contrast' && h('path', { className: 'af-emb-shimmer', d: 'M9 28 C13 11, 21 11, 23 23 C25 34, 32 33, 35 16' }),
                afTheme !== 'contrast' && h('circle', { className: 'af-fold-beacon', cx: 23, cy: 23, r: 6.2, stroke: '#7dd3fc' }),
                h('circle', { cx: 11, cy: 23, r: 2.8, fill: afTheme === 'contrast' ? '#ffff00' : '#38bdf8', stroke: '#ffffff', strokeWidth: 0.8 }),
                h('circle', { cx: 23, cy: 23, r: 3.2, fill: afTheme === 'contrast' ? '#00ff00' : '#facc15', stroke: '#ffffff', strokeWidth: 0.8 }),
                h('circle', { cx: 34, cy: 18, r: 2.6, fill: afTheme === 'contrast' ? '#ffff00' : '#f97316', stroke: '#ffffff', strokeWidth: 0.8 }),
                afTheme !== 'contrast' && h('circle', { cx: 22.1, cy: 22, r: 0.9, fill: '#ffffff', opacity: 0.9 })
              ),
              h('div', { style: { minWidth: 0, flex: 1 } },
                h('div', { className: 'af-badge-row' },
                  h('p', { className: 'af-eyebrow' }, t('stem.alphaFold.mission_label', 'Structural biology mission')),
                  h('span', { className: 'af-subject-pill' }, t('stem.alphaFold.subject_badge', 'Protein Folding \u00b7 pLDDT & PAE'))),
                h('h2', { className: 'af-title' }, t('stem.alphaFold.title', 'AlphaFold Explorer')),
                h('p', { className: 'af-subtitle' },
                  t('stem.alphaFold.mission_blurb', 'Explore a public protein prediction, inspect confidence and shape, then build a cautious claim from visible evidence.')))),
            h('div', { className: 'af-status', 'data-state': popupState, role: 'status', 'aria-live': 'polite' },
              h('span', { className: 'af-status-dot', 'aria-hidden': 'true' }),
              h('span', null, statusText))),

          h('div', { className: 'af-stage-bar' },
            h('div', { className: 'af-preset-strip', role: 'group', 'aria-label': t('stem.alphaFold.sample_presets_aria', 'Illustrative classroom protein models') },
              h('span', { className: 'af-preset-label' }, t('stem.alphaFold.sample_presets_label', 'Model preview:')),
              SAMPLE_PROTEINS.map(function (sample) {
                var isCur = sample.accession === activeSample.accession;
                return h('button', {
                  key: sample.accession,
                  type: 'button',
                  className: 'af-preset-chip',
                  'aria-pressed': isCur ? 'true' : 'false',
                  onClick: function () {
                    setSampleAcc(sample.accession);
                    if (announceToSR) announceToSR(sample.name + ' (' + sample.accession + ') ' + sample.foldNote);
                  }
                }, sample.name + ' (' + sample.accession + ')');
              })),
            h('div', { className: 'af-stage-tabs', role: 'tablist', 'aria-label': t('stem.alphaFold.stage_view_aria', 'Structural preview view') },
              h('button', {
                type: 'button', role: 'tab', id: 'af-stage-tab-ribbon',
                className: 'af-stage-tab',
                tabIndex: stageView === 'ribbon' ? 0 : -1,
                'aria-selected': stageView === 'ribbon' ? 'true' : 'false',
                'aria-controls': 'af-stage-panel',
                onKeyDown: handleStageTabKeyDown,
                onClick: function () { setStageView('ribbon'); }
              }, t('stem.alphaFold.tab_ribbon', 'pLDDT Ribbon')),
              h('button', {
                type: 'button', role: 'tab', id: 'af-stage-tab-pae',
                className: 'af-stage-tab',
                tabIndex: stageView === 'pae' ? 0 : -1,
                'aria-selected': stageView === 'pae' ? 'true' : 'false',
                'aria-controls': 'af-stage-panel',
                onKeyDown: handleStageTabKeyDown,
                onClick: function () { setStageView('pae'); }
              }, t('stem.alphaFold.tab_pae', 'PAE Error Matrix')))),

          h('div', { className: 'af-confidence-atlas', id: 'af-stage-panel', role: 'tabpanel', 'aria-labelledby': stageView === 'pae' ? 'af-stage-tab-pae' : 'af-stage-tab-ribbon' },
            stageView === 'ribbon'
              ? h('figure', { className: 'af-protein-viz', role: 'img', 'data-confidence-band': confidenceBand, 'aria-label': t('stem.alphaFold.confidence_preview_aria', 'Illustrative folded protein ribbon colored by AlphaFold pLDDT confidence: deep blue and cyan are higher confidence, while yellow and orange are lower confidence. This is a teaching illustration, not a loaded protein prediction.') },
                  h('div', { className: 'af-viz-head' },
                    h('span', { className: 'af-viz-label', 'aria-hidden': 'true' }, t('stem.alphaFold.confidence_preview_label', 'Prediction confidence preview')),
                    h('span', { className: 'af-viz-acc' }, activeSample.name + ' \u00b7 ' + activeSample.accession + ' \u00b7 ' + activeSample.length)),
                  h('svg', { viewBox: '0 0 560 210', 'aria-hidden': 'true', focusable: 'false' },
                    h('defs', null,
                      h('radialGradient', { id: 'af-stage-glow', cx: '46%', cy: '38%', r: '58%' },
                        h('stop', { offset: '0%', stopColor: '#0c4a6e', stopOpacity: 0.42 }),
                        h('stop', { offset: '62%', stopColor: '#071426', stopOpacity: 0.84 }),
                        h('stop', { offset: '100%', stopColor: '#020617', stopOpacity: 0.96 })),
                      h('linearGradient', { id: 'af-confidence-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                        h('stop', { offset: '0%', stopColor: '#1d4ed8' }),
                        h('stop', { offset: '36%', stopColor: '#38bdf8' }),
                        h('stop', { offset: '70%', stopColor: '#facc15' }),
                        h('stop', { offset: '100%', stopColor: '#f97316' })),
                      h('linearGradient', { id: 'af-bar-vh', x1: '0', y1: '0', x2: '0', y2: '1' },
                        h('stop', { offset: '0%', stopColor: '#60a5fa' }),
                        h('stop', { offset: '100%', stopColor: '#1d4ed8' })),
                      h('linearGradient', { id: 'af-bar-c', x1: '0', y1: '0', x2: '0', y2: '1' },
                        h('stop', { offset: '0%', stopColor: '#7dd3fc' }),
                        h('stop', { offset: '100%', stopColor: '#0284c7' })),
                      h('linearGradient', { id: 'af-bar-l', x1: '0', y1: '0', x2: '0', y2: '1' },
                        h('stop', { offset: '0%', stopColor: '#fef08a' }),
                        h('stop', { offset: '100%', stopColor: '#eab308' })),
                      h('linearGradient', { id: 'af-bar-vl', x1: '0', y1: '0', x2: '0', y2: '1' },
                        h('stop', { offset: '0%', stopColor: '#fdba74' }),
                        h('stop', { offset: '100%', stopColor: '#ea580c' })),
                      h('linearGradient', { id: 'af-sheen-grad', x1: '0', y1: '0', x2: '1', y2: '0' },
                        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0 }),
                        h('stop', { offset: '50%', stopColor: '#e0f2fe', stopOpacity: 0.85 }),
                        h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })),
                      h('clipPath', { id: 'af-spectrum-clip' },
                        h('rect', { x: 56, y: 158, width: 484, height: 39, rx: 5 })),
                      h('filter', { id: 'af-ribbon-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' },
                        h('feGaussianBlur', { stdDeviation: '2.6', result: 'blur' }),
                        h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })))),
                    // Dark-field structural-biology viewport chassis + optical corner reticles
                    h('rect', { x: 4, y: 4, width: 552, height: 146, rx: 10, fill: afTheme === 'contrast' ? '#000000' : 'url(#af-stage-glow)', stroke: afTheme === 'contrast' ? '#ffff00' : 'rgba(56,189,248,0.22)', strokeWidth: 1 }),
                    afTheme !== 'contrast' && h('path', { d: 'M12 20 V12 H22 M548 20 V12 H538 M12 134 V142 H22 M548 134 V142 H538', fill: 'none', stroke: 'rgba(94,234,212,0.45)', strokeWidth: 1.2, strokeLinecap: 'round' }),
                    // Subtle coordinate grid + domain boundary band markers
                    [40, 80, 120].map(function (gy) {
                      return h('line', { key: 'gy-' + gy, x1: 22, y1: gy, x2: 538, y2: gy, stroke: afTheme === 'contrast' ? '#333333' : 'rgba(148,163,184,0.12)', strokeWidth: 1, strokeDasharray: '4 4' });
                    }),
                    [110, 220, 330, 440].map(function (gx) {
                      return h('line', { key: 'gx-' + gx, x1: gx, y1: 14, x2: gx, y2: 144, stroke: afTheme === 'contrast' ? '#333333' : 'rgba(148,163,184,0.11)', strokeWidth: 1, strokeDasharray: '4 4' });
                    }),
                    // Terminal callouts safely inset inside viewBox
                    h('rect', { x: 20, y: 16, width: 54, height: 18, rx: 9, fill: afTheme === 'contrast' ? '#000000' : 'rgba(29,78,216,0.42)', stroke: afTheme === 'contrast' ? '#00ff00' : 'rgba(96,165,250,0.75)', strokeWidth: 1 }),
                    h('text', { x: 47, y: 28, textAnchor: 'middle', fill: afTheme === 'contrast' ? '#00ff00' : '#dbeafe', fontSize: 9, fontWeight: 'bold' }, 'N-term'),
                    h('rect', { x: 486, y: 16, width: 54, height: 18, rx: 9, fill: afTheme === 'contrast' ? '#000000' : 'rgba(249,115,22,0.38)', stroke: afTheme === 'contrast' ? '#ffff00' : 'rgba(251,146,60,0.75)', strokeWidth: 1 }),
                    h('text', { x: 513, y: 28, textAnchor: 'middle', fill: afTheme === 'contrast' ? '#ffff00' : '#ffedd5', fontSize: 9, fontWeight: 'bold' }, 'C-term'),
                    // Fold shadow, residue-contact / H-bond arcs, core ribbon, interactive segments, specular highlight & spine
                    ['M68 68 Q101 38 130 82', 'M140 88 Q195 52 248 82', 'M260 80 Q290 42 318 66'].map(function (hd, hi) {
                      return h('path', { key: 'hb-' + hi, className: 'af-hbond-arc', d: hd, stroke: afTheme === 'contrast' ? '#ffff00' : undefined });
                    }),
                    h('path', { className: 'af-fold-shadow', d: activeSample.path }),
                    h('path', { className: 'af-fold-ribbon', d: activeSample.path }),
                    h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'very-high' ? 'true' : 'false', d: activeSample.segs['very-high'], stroke: '#1d4ed8', onClick: function () { selectConfidenceBand('very-high'); } }),
                    h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'confident' ? 'true' : 'false', d: activeSample.segs.confident, stroke: '#38bdf8', onClick: function () { selectConfidenceBand('confident'); } }),
                    h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'low' ? 'true' : 'false', d: activeSample.segs.low, stroke: '#facc15', onClick: function () { selectConfidenceBand('low'); } }),
                    h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'very-low' ? 'true' : 'false', d: activeSample.segs['very-low'], stroke: '#f97316', onClick: function () { selectConfidenceBand('very-low'); } }),
                    afTheme !== 'contrast' && h('path', { className: 'af-ribbon-shimmer', d: activeSample.path }),
                    h('path', { className: 'af-fold-spine', d: activeSample.path }),
                    [[62,68,'#1d4ed8'],[134,86,'#0ea5e9'],[196,120,'#38bdf8'],[254,84,'#7dd3fc'],[322,68,'#facc15'],[378,118,'#fde047'],[448,96,'#fb923c'],[508,68,'#f97316']].map(function (node, i) {
                      var rN = i === 3 ? 5.2 : 4.2;
                      return h('g', { key: i },
                        afTheme !== 'contrast' && i < 4 && h('circle', { className: 'af-fold-beacon', cx: node[0], cy: node[1], r: rN + 4.4, stroke: node[2], style: { animationDelay: (i * 0.55) + 's' } }),
                        h('circle', { className: 'af-residue-node', cx: node[0], cy: node[1], r: rN, fill: afTheme === 'contrast' ? '#00ff00' : node[2] }),
                        afTheme !== 'contrast' && h('circle', { cx: node[0] - 1.3, cy: node[1] - 1.3, r: 1.2, fill: '#ffffff', opacity: 0.82 })
                      );
                    }),
                    // Calibrated per-residue pLDDT confidence spectrum bar at bottom
                    h('rect', { x: 56, y: 158, width: 484, height: 39, rx: 5, fill: afTheme === 'contrast' ? '#000000' : 'rgba(2,6,23,0.68)', stroke: afTheme === 'contrast' ? '#ffff00' : 'rgba(148,163,184,0.2)', strokeWidth: 0.9 }),
                    // Threshold lines at 90 and 70 pLDDT
                    [90, 70].map(function (thr) {
                      var ty = 196 - Math.round((thr / 100) * 32);
                      return h('line', { key: 'thr-' + thr, x1: 58, y1: ty, x2: 538, y2: ty, stroke: afTheme === 'contrast' ? '#ffff00' : 'rgba(125,211,252,0.26)', strokeWidth: 0.8, strokeDasharray: '3 3' });
                    }),
                    h('text', { x: 24, y: 181, fill: afTheme === 'contrast' ? '#ffff00' : '#94a3b8', fontSize: 9, fontWeight: 'bold' }, 'pLDDT'),
                    activeSample.bars.map(function (score, idx) {
                      var bx = 62 + idx * 26;
                      var bh = Math.max(4, Math.round((score / 100) * 32));
                      var bandMatch = (confidenceBand === 'all') ||
                        (confidenceBand === 'very-high' && score >= 90) ||
                        (confidenceBand === 'confident' && score >= 70 && score < 90) ||
                        (confidenceBand === 'low' && score >= 50 && score < 70) ||
                        (confidenceBand === 'very-low' && score < 50);
                      var gradFill = afTheme === 'contrast' ? (score >= 70 ? '#00ff00' : '#ffff00') : (score >= 90 ? 'url(#af-bar-vh)' : score >= 70 ? 'url(#af-bar-c)' : score >= 50 ? 'url(#af-bar-l)' : 'url(#af-bar-vl)');
                      return h('g', { key: 'b-' + idx },
                        h('rect', { x: bx, y: 196 - bh, width: 20, height: bh, rx: 2.5, fill: gradFill, opacity: bandMatch ? 0.95 : 0.2 }),
                        afTheme !== 'contrast' && bandMatch && h('line', { className: 'af-bar-glint', x1: bx + 2, y1: 196 - bh + 1, x2: bx + 18, y2: 196 - bh + 1, stroke: '#ffffff', strokeWidth: 1.2, strokeLinecap: 'round', style: { animationDelay: (idx * 0.14) + 's' } })
                      );
                    }),
                    afTheme !== 'contrast' && h('g', { clipPath: 'url(#af-spectrum-clip)' },
                      h('rect', { className: 'af-spectrum-sheen', x: 56, y: 158, width: 72, height: 39, fill: 'url(#af-sheen-grad)' })),
                    h('text', { x: 62, y: 207, fill: afTheme === 'contrast' ? '#ffff00' : '#94a3b8', fontSize: 8 }, 'Res 1'),
                    h('text', { x: 528, y: 207, textAnchor: 'end', fill: afTheme === 'contrast' ? '#ffff00' : '#94a3b8', fontSize: 8 }, activeSample.length)),
                  h('div', { className: 'af-viz-foot' },
                    h('span', { className: 'af-viz-summary' }, activeSample.foldNote),
                    h('span', { className: 'af-viz-note', 'aria-hidden': 'true' }, t('stem.alphaFold.confidence_preview_note', 'Illustrative model | confidence is not correctness'))))
              : h('figure', { className: 'af-protein-viz', role: 'group', 'aria-label': t('stem.alphaFold.pae_preview_aria', 'Illustrative Predicted Aligned Error heatmap showing intra-domain low error in dark green along the diagonal and higher inter-domain error off-diagonal.') },
                  h('div', { className: 'af-viz-head' },
                    h('span', { className: 'af-viz-label', 'aria-hidden': 'true' }, t('stem.alphaFold.pae_preview_label', 'Predicted Aligned Error (PAE)')),
                    h('span', { className: 'af-viz-acc' }, activeSample.name + ' \u00b7 ' + activeSample.accession)),
                  h('svg', { viewBox: '0 0 560 210', 'aria-hidden': 'true', focusable: 'false' },
                    h('defs', null,
                      h('linearGradient', { id: 'af-pae-scale', x1: '0', y1: '0', x2: '1', y2: '0' },
                        h('stop', { offset: '0%', stopColor: '#059669' }),
                        h('stop', { offset: '38%', stopColor: '#34d399' }),
                        h('stop', { offset: '70%', stopColor: '#a7f3d0' }),
                        h('stop', { offset: '100%', stopColor: '#1e293b' })),
                      h('linearGradient', { id: 'af-pae-sheen-grad', x1: '0', y1: '0', x2: '1', y2: '0' },
                        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0 }),
                        h('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: 0.85 }),
                        h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })),
                      h('clipPath', { id: 'af-pae-bar-clip' },
                        h('rect', { x: 268, y: 40, width: 266, height: 6, rx: 3 }))),
                    // Dark-field matrix viewport frame
                    h('rect', { x: 4, y: 4, width: 552, height: 202, rx: 10, fill: afTheme === 'contrast' ? '#000000' : 'rgba(2,6,23,0.72)', stroke: afTheme === 'contrast' ? '#ffff00' : 'rgba(56,189,248,0.2)', strokeWidth: 1 }),
                    h('rect', { x: 74, y: 26, width: 167, height: 167, rx: 5, fill: '#020617', stroke: afTheme === 'contrast' ? '#ffff00' : 'rgba(94,234,212,0.38)', strokeWidth: 1.2 }),
                    // 8x8 PAE matrix on the left
                    h('text', { x: 158, y: 20, textAnchor: 'middle', fill: afTheme === 'contrast' ? '#ffff00' : '#cbd5e1', fontSize: 10, fontWeight: 'bold' }, 'Scored Residue'),
                    h('text', { x: 30, y: 112, textAnchor: 'middle', fill: afTheme === 'contrast' ? '#ffff00' : '#cbd5e1', fontSize: 10, fontWeight: 'bold', transform: 'rotate(-90 30 112)' }, 'Aligned Residue'),
                    activeSample.paeBlocks.map(function (row, rIdx) {
                      return row.map(function (lvl, cIdx) {
                        var reg = paeRegionForLevel(lvl);
                        var activeCell = paeRegion === reg;
                        return h('rect', {
                          key: rIdx + '-' + cIdx,
                          className: activeCell ? 'af-pae-cell af-pae-cell-active' : 'af-pae-cell',
                          x: 78 + cIdx * 20,
                          y: 30 + rIdx * 20,
                          width: 19,
                          height: 19,
                          rx: 2.5,
                          fill: afTheme === 'contrast' ? (lvl === 1 ? '#00ff00' : lvl === 2 ? '#ffff00' : '#000000') : (paeColorScale[lvl] || '#1e293b'),
                          stroke: activeCell ? '#f8fafc' : (afTheme === 'contrast' ? '#ffff00' : 'rgba(15,23,42,0.55)'),
                          strokeWidth: activeCell ? 1.5 : 0.7,
                          onClick: function () { setPaeRegion(reg); }
                        });
                      });
                    }),
                    // Crisp diagonal intra-domain axis guide
                    h('line', { className: 'af-pae-diag', x1: 78, y1: 30, x2: 237, y2: 189, stroke: afTheme === 'contrast' ? '#ffffff' : 'rgba(255,255,255,0.38)', strokeWidth: 1.1, strokeDasharray: '3 3', pointerEvents: 'none' }),
                    // Right side: PAE scale legend & domain guide
                    h('text', { x: 268, y: 34, fill: afTheme === 'contrast' ? '#ffff00' : '#f8fafc', fontSize: 12, fontWeight: 'bold' }, 'Expected position error (\u00c5)'),
                    !(afTheme === 'contrast') && h('rect', { x: 268, y: 40, width: 266, height: 6, rx: 3, fill: 'url(#af-pae-scale)' }),
                    !(afTheme === 'contrast') && h('g', { clipPath: 'url(#af-pae-bar-clip)' },
                      h('rect', { className: 'af-pae-sheen', x: 268, y: 40, width: 48, height: 6, fill: 'url(#af-pae-sheen-grad)' })),
                    h('rect', { x: 268, y: 54, width: 22, height: 14, rx: 3, fill: afTheme === 'contrast' ? '#00ff00' : '#059669' }),
                    h('text', { x: 298, y: 65, fill: afTheme === 'contrast' ? '#ffff00' : '#e2e8f0', fontSize: 10 }, '0\u20135 \u00c5  Tightly packed domain'),
                    h('rect', { x: 268, y: 76, width: 22, height: 14, rx: 3, fill: afTheme === 'contrast' ? '#ffff00' : '#34d399' }),
                    h('text', { x: 298, y: 87, fill: afTheme === 'contrast' ? '#ffff00' : '#e2e8f0', fontSize: 10 }, '6\u201312 \u00c5  Moderate local packing'),
                    h('rect', { x: 268, y: 98, width: 22, height: 14, rx: 3, fill: afTheme === 'contrast' ? '#000000' : '#a7f3d0', stroke: afTheme === 'contrast' ? '#ffff00' : undefined }),
                    h('text', { x: 298, y: 109, fill: afTheme === 'contrast' ? '#ffff00' : '#e2e8f0', fontSize: 10 }, '13\u201320 \u00c5  Flexible boundary'),
                    h('rect', { x: 268, y: 120, width: 22, height: 14, rx: 3, fill: afTheme === 'contrast' ? '#000000' : '#1e293b', stroke: afTheme === 'contrast' ? '#ffff00' : '#64748b', strokeWidth: 1 }),
                    h('text', { x: 298, y: 131, fill: afTheme === 'contrast' ? '#ffff00' : '#e2e8f0', fontSize: 10 }, '>22 \u00c5  Uncertain relative position'),
                    h('rect', { x: 268, y: 148, width: 266, height: 42, rx: 8, fill: afTheme === 'contrast' ? '#000000' : 'rgba(15,118,110,0.22)', stroke: afTheme === 'contrast' ? '#00ff00' : 'rgba(94,234,212,0.42)', strokeWidth: 1 }),
                    h('text', { x: 280, y: 165, fill: afTheme === 'contrast' ? '#00ff00' : '#99f6e4', fontSize: 10, fontWeight: 'bold' }, 'Click any matrix square to inspect:'),
                    h('text', { x: 280, y: 181, fill: afTheme === 'contrast' ? '#ffff00' : '#cbd5e1', fontSize: 9.5 }, 'Diagonal = within domain | Off-diagonal = between domains')),
                  h('div', { className: 'af-viz-foot', style: { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } },
                    h('div', { className: 'af-preset-strip', role: 'group', 'aria-label': t('stem.alphaFold.pae_region_aria', 'Inspect PAE error regions') },
                      [
                        { id: 'intra', label: t('stem.alphaFold.pae_intra', 'Within domain (0–5 Å)') },
                        { id: 'boundary', label: t('stem.alphaFold.pae_boundary', 'Domain boundary (6–15 Å)') },
                        { id: 'inter', label: t('stem.alphaFold.pae_inter', 'Between domains (>20 Å)') }
                      ].map(function (reg) {
                        return h('button', {
                          key: reg.id,
                          type: 'button',
                          className: 'af-preset-chip',
                          'aria-pressed': paeRegion === reg.id ? 'true' : 'false',
                          onClick: function () {
                            setPaeRegion(reg.id);
                            if (announceToSR) announceToSR(PAE_EXPLANATIONS[reg.id]);
                          }
                        }, reg.label);
                      })),
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                      h('span', { className: 'af-viz-summary' }, PAE_EXPLANATIONS[paeRegion]),
                      h('span', { className: 'af-viz-note', 'aria-hidden': 'true' }, t('stem.alphaFold.pae_note', 'Low PAE = reliable relative domain geometry'))))),

            h('aside', { className: 'af-confidence-key', 'aria-labelledby': 'af-confidence-heading' },
              h('div', null,
                h('h3', { id: 'af-confidence-heading' }, t('stem.alphaFold.confidence_title', 'Read the confidence colors')),
                h('p', null, t('stem.alphaFold.confidence_intro', 'pLDDT estimates local model confidence for each residue.')),
                confidenceBands.map(function (band) {
                  return h('button', {
                    key: band.id, type: 'button', className: 'af-confidence-row',
                    style: { '--af-confidence-color': band.color },
                    'aria-pressed': confidenceBand === band.id ? 'true' : 'false',
                    onClick: function () { setStageView('ribbon'); selectConfidenceBand(band.id); }
                  },
                    h('span', { className: 'af-confidence-dot', style: { color: band.color, backgroundColor: band.color }, 'aria-hidden': 'true' }),
                    h('span', { className: 'af-confidence-range' }, band.range),
                    h('span', { className: 'af-confidence-name' }, band.name),
                    h('span', { className: 'af-confidence-pct' }, activeSample.pcts[band.id] || ''));
                })),
              h('div', null,
                h('div', { className: 'af-confidence-reading', role: 'status', 'aria-live': 'polite' },
                  stageView === 'pae'
                    ? PAE_EXPLANATIONS[paeRegion]
                    : (selectedBand ? selectedBand.detail : t('stem.alphaFold.confidence_overview_detail', 'Select a confidence band to isolate that part of the illustrative fold and learn how cautiously to interpret it.'))),
                h('div', { className: 'af-confidence-caution' }, t('stem.alphaFold.confidence_caution', 'High confidence supports the local fold. It does not prove function, binding, or biological relevance.'))))),

          h('div', { className: 'af-metrics', role: 'list', 'aria-label': t('stem.alphaFold.progress_label', 'AlphaFold investigation progress') },
            metric(t('stem.alphaFold.metric_launches', 'Explorer launches'), String(openedCount), t('stem.alphaFold.metric_launches_note', 'companion-window sessions')),
            metric(t('stem.alphaFold.metric_structures', 'Public structures'), String(lookupCount), t('stem.alphaFold.metric_structures_note', 'database lookups')),
            metric(t('stem.alphaFold.metric_prepared', 'Inputs prepared'), String(preparedCount), t('stem.alphaFold.metric_prepared_note', 'safe classroom samples')),
            metric(t('stem.alphaFold.metric_guidance', 'Reasoning checks'), String(guidanceCount), aiOn ? t('stem.alphaFold.metric_ai_on', 'AI guidance available') : t('stem.alphaFold.metric_ai_off', 'built-in prompts active')),
            metric(t('stem.alphaFold.metric_exports', 'Evidence exports'), String(exportedCount), t('stem.alphaFold.metric_exports_note', 'saved Markdown or JSON records'))),
          h('div', { className: 'af-actions' },
            h('button', {
              type: 'button',
              onClick: function () { openExplorer(); },
              className: 'af-primary',
              'aria-label': t('stem.alphaFold.open_title', 'Open AlphaFold Explorer in a new window')
            }, prefillAccession ? t('stem.alphaFold.open_prefilled_prefix', 'Open') + ' ' + (prefillLabel || prefillAccession) + ' ' + t('stem.alphaFold.open_prefilled_suffix', 'in AlphaFold Explorer') : (popupState === 'open' ? t('stem.alphaFold.refocus', 'Return to AlphaFold Explorer') : t('stem.alphaFold.open', 'Open AlphaFold Explorer'))),
            !prefillAccession && h('button', {
              type: 'button',
              onClick: function () { openExplorer(activeSample.accession); },
              className: 'af-sample-launch'
            }, t('stem.alphaFold.launch_sample_prefix', 'Inspect') + ' ' + activeSample.name + ' (' + activeSample.accession + ') \u2192'),
            h('span', { className: 'af-action-note' },
              prefillAccession ? t('stem.alphaFold.handoff_ready_prefix', 'Cell Atlas handoff ready:') + ' ' + (prefillLabel || t('stem.alphaFold.public_protein', 'public protein')) + ' (' + prefillAccession + '). ' + t('stem.alphaFold.handoff_ready_suffix', 'The public accession will load automatically.') : t('stem.alphaFold.action_note', 'Opens a companion window. Keep AlloFlow open for progress and optional guidance.')))),

        renderCellAtlasBridge(),

        popupState === 'blocked' && h('div', { className: 'af-alert', role: 'alert' },
          t('stem.alphaFold.blocked_note', 'Pop-up blocked - allow pop-ups for this page and try again. '),
          h('a', {
            href: explorerLaunchUrl,
            target: '_blank',
            rel: 'noopener'
          }, t('stem.alphaFold.blocked_link', 'Open AlphaFold Explorer directly'))),

        h('section', { className: 'af-section', 'aria-labelledby': 'af-route-heading' },
          h('div', { className: 'af-section-head' },
            h('div', null,
              h('h3', { id: 'af-route-heading' }, t('stem.alphaFold.route_title', 'Your investigation route')),
              h('p', null, t('stem.alphaFold.route_subtitle', 'Move from model viewing to evidence-based explanation.'))),
            h('span', { className: 'af-route-state' }, completedRouteSteps + ' / 4')),
          h('div', { className: 'af-route-progress', 'aria-hidden': 'true' },
            h('div', { className: 'af-route-progress-fill', style: { width: (completedRouteSteps * 25) + '%' } })),
          h('div', { className: 'af-route' },
            routeCard('01', t('stem.alphaFold.route_launch', 'Launch safely'), t('stem.alphaFold.route_launch_body', 'Use a public, synthetic, or teacher-approved sample—never personal genetic data.'), openedCount > 0, t('stem.alphaFold.route_launch_state', 'Start here')),
            routeCard('02', t('stem.alphaFold.route_inspect', 'Inspect the model'), t('stem.alphaFold.route_inspect_body', 'Compare folds, domains, surfaces, pLDDT confidence, and PAE uncertainty.'), lookupCount > 0, t('stem.alphaFold.route_inspect_state', 'Observe next')),
            routeCard('03', t('stem.alphaFold.route_explain', 'Explain cautiously'), t('stem.alphaFold.route_explain_body', 'Connect one visible feature to evidence, uncertainty, and a useful next test.'), guidanceCount > 0, t('stem.alphaFold.route_explain_state', 'Build a claim')),
            routeCard('04', t('stem.alphaFold.route_package', 'Package the evidence'), t('stem.alphaFold.route_package_body', 'Save the completed cross-scale record as Markdown or JSON so another learner can audit the claim.'), packetRouteComplete, t('stem.alphaFold.route_package_state', 'Record + export')))),

        h('section', { className: 'af-support-grid', 'aria-label': t('stem.alphaFold.support_label', 'Tutorial and classroom data guidance') },
          h('details', { className: 'af-details' },
            h('summary', null, t('stem.alphaFold.tutorial_title', 'How AlphaFold investigations work (4 steps)')),
            h('ol', null,
              h('li', null, t('stem.alphaFold.tutorial_1', 'AlphaFold predicts a protein 3D structure from an amino acid sequence; AlphaFold DB provides public predicted structures.')),
              h('li', null, t('stem.alphaFold.tutorial_2', 'Start from a classroom preset or choose a grade-level tutorial, lesson length, biology context, assignment format, and support level.')),
              h('li', null, t('stem.alphaFold.tutorial_3', 'Use cautious wording: the model suggests evidence, but it is not final proof by itself.')),
              h('li', null, t('stem.alphaFold.tutorial_4', 'Only prepare JSON for public, synthetic, or teacher-approved classroom samples; the explorer does not automatically submit sequences.')))),
          h('aside', { className: 'af-guardrail', 'aria-labelledby': 'af-guardrail-heading' },
            h('h3', { id: 'af-guardrail-heading' }, t('stem.alphaFold.guardrail_title', 'Classroom data boundary')),
            h('p', null, t('stem.alphaFold.guardrail1', 'Do not enter sequences from yourself, classmates, family members, patients, private genetic tests, or medical reports.')),
            h('p', null, aiOn
              ? t('stem.alphaFold.ai_on', 'AI guidance receives structure metadata, learner context, and student observations or claims—not full protein sequences.')
              : t('stem.alphaFold.ai_off', 'AI hints are off. The explorer still works with built-in inspection prompts.')))),

        h('p', { className: 'af-credit' },
          t('stem.alphaFold.credit', 'Data/viewing: AlphaFold Protein Structure Database by Google DeepMind and EMBL-EBI; Mol* viewer under MIT license. AlphaFold Server opens separately for non-commercial research workflows. Internet is required for database lookup and web viewing.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_alphafold.js loaded - AlphaFold Explorer launcher');
})();
