// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ── PetsLab-specific keyframes ──
// Decoder celebration + immersive scene idles (breathing, blink, tail wag).
// All gated behind prefers-reduced-motion so they freeze for users who
// asked the OS not to animate.
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('petslab-celeb-css')) return;
  var st = document.createElement('style');
  st.id = 'petslab-celeb-css';
  st.textContent = [
    '@keyframes petslab-celeb-rise {',
    '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
    '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  85%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
    '}',
    // Breathing: subtle scaleY pulse on the animal body. Centered via
    // transform-origin so the belly rises and the back stays put.
    '@keyframes petslab-breathe {',
    '  0%, 100% { transform: scaleY(1); }',
    '  50%      { transform: scaleY(1.025); }',
    '}',
    // Tail wag: small rotation around the tail base. Used on the dog tail
    // group when mood >= content. Gentle so it does not become a distraction.
    '@keyframes petslab-wag {',
    '  0%, 100% { transform: rotate(-6deg); }',
    '  50%      { transform: rotate(8deg); }',
    '}',
    // Slow blink: scaleY-collapse the eye briefly. Triggered on the cat
    // eye group as a "slow-blink" affection signal when mood is happy.
    '@keyframes petslab-blink {',
    '  0%, 92%, 100% { transform: scaleY(1); }',
    '  95%, 99%      { transform: scaleY(0.05); }',
    '}',
    // Hop: rabbit happy state — tiny vertical bounce.
    '@keyframes petslab-hop {',
    '  0%, 100% { transform: translateY(0); }',
    '  50%      { transform: translateY(-3px); }',
    '}',
    '.petslab-breathe { animation: petslab-breathe 3.4s ease-in-out infinite; transform-origin: 50% 100%; }',
    '.petslab-wag     { animation: petslab-wag 0.6s ease-in-out infinite; transform-origin: 0% 50%; transform-box: fill-box; }',
    '.petslab-blink   { animation: petslab-blink 4.2s ease-in-out infinite; transform-origin: 50% 50%; transform-box: fill-box; }',
    '.petslab-hop     { animation: petslab-hop 1.4s ease-in-out infinite; }',
    '.reduce-motion .petslab-breathe, .reduce-motion .petslab-wag, .reduce-motion .petslab-blink, .reduce-motion .petslab-hop { animation: none !important; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .petslab-breathe, .petslab-wag, .petslab-blink, .petslab-hop { animation: none !important; }',
    '}'
  ].join('');
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_pets.js — Science of Pets Lab
// Companion-animal SCIENCE: physiology, ethology, nutrition, genetics,
// domestication evolution, zoonoses, service-animal welfare.
// Sister to BehaviorLab (operant theory + Skinner box) — this tool ASSUMES
// that theory and applies it to real-world pet training across species.
// Cross-link to EvolutionLab for natural selection (we own artificial
// selection / domestication). Cross-link to Aquarium for fish ecology
// (we cover fish-as-pet husbandry briefly in Pet Picker).
// Distinguishing UDL angle: Service & Support Animals — no other AlloFlow
// tool covers service dog vs ESA vs therapy animal distinctions.
// All clinical / behavioral citations to AVMA, AAFCO, IAADP, ASAB, CDC,
// House Rabbit Society, Bradshaw, Karen Pryor, Mech 2000.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('petsLab'))) {

(function() {
  'use strict';

  // ── Live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-pets')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-pets';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-pets-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-pets-focus-css';
    st.textContent = '[data-pets-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    if (document.head) document.head.appendChild(st);
  })();

  if (typeof document !== 'undefined' && !document.getElementById('petslab-workspace-css')) {
    var petsWorkspaceStyle = document.createElement('style');
    petsWorkspaceStyle.id = 'petslab-workspace-css';
    petsWorkspaceStyle.textContent = [
      '.petslab-menu-shell{max-width:1120px!important;margin:0 auto;padding:6px!important;color:#fef3e2;}',
      '.petslab-menu-shell *{box-sizing:border-box;}',
      '.petslab-command{padding:18px!important;border:1px solid rgba(245,158,11,.42);border-radius:18px!important;background:radial-gradient(circle at 88% 12%,rgba(245,158,11,.2),transparent 34%),linear-gradient(135deg,rgba(69,26,3,.96),rgba(24,18,16,.98));box-shadow:0 18px 42px rgba(0,0,0,.24);}',
      '.petslab-command h2{color:#fff;font-size:clamp(20px,3vw,29px)!important;}',
      '.petslab-command-stats{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));width:100%;gap:7px!important;margin-top:12px;}',
      '.petslab-command-stat{min-width:0;padding:8px 10px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(24,18,16,.62);}',
      '.petslab-command-stat-label{display:block;color:#d6b88f;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.petslab-command-stat-value{display:block;margin-top:2px;color:#fff;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.petslab-start-card{border-radius:14px!important;box-shadow:0 10px 26px rgba(0,0,0,.14);}',
      '.petslab-featured-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:4px 0 10px;}',
      '.petslab-featured-heading h3{margin:0;color:#fef3e2;font-size:15px;}',
      '.petslab-featured-heading p{margin:3px 0 0;color:#e8d5b7;font-size:11px;line-height:1.4;}',
      '.petslab-featured-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}',
      '.petslab-tile-wrap{min-width:0;}',
      '.petslab-menu-tile{width:100%;height:100%;min-height:132px!important;transition:transform .18s,border-color .18s,box-shadow .18s;}',
      '.petslab-menu-tile:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.2);}',
      '.petslab-menu-tile--compact{min-height:104px!important;}',
      '.petslab-catalog,.petslab-inquiry-disclosure{border:1px solid #5c4536;border-radius:14px;background:#181210;overflow:hidden;}',
      '.petslab-catalog summary,.petslab-inquiry-disclosure summary{min-height:46px;padding:12px 14px;cursor:pointer;color:#fef3e2;font-size:12px;font-weight:900;}',
      '.petslab-catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:0 12px 12px;}',
      '.petslab-inquiry-body{padding:0 12px 12px;}',
      '.petslab-genetics-view{box-sizing:border-box;min-width:0;width:100%;max-width:880px;}',
      '.petslab-punnett-lab{min-width:0;max-width:100%;overflow:hidden;border-radius:16px!important;background:radial-gradient(circle at 92% 0,rgba(245,158,11,.12),transparent 32%),linear-gradient(180deg,#211713,#181210)!important;box-shadow:0 18px 46px rgba(0,0,0,.2);}',
      '.petslab-genetics-view *{box-sizing:border-box;}',
      '.petslab-gene-parent-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px;}',
      '.petslab-gene-parent-card{min-width:0;padding:12px;border:1px solid rgba(245,158,11,.28);border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(0,0,0,.1));}',
      '.petslab-gene-parent-visual{display:grid;grid-template-columns:96px minmax(0,1fr);gap:11px;align-items:center;margin:9px 0 10px;}',
      '.petslab-lab-portrait{display:block;width:100%;height:auto;filter:drop-shadow(0 8px 11px rgba(0,0,0,.28));}',
      '.petslab-parent-summary{min-width:0;}',
      '.petslab-coat-swatch{display:flex;align-items:center;gap:8px;min-height:38px;padding:7px 9px;border:1px solid rgba(255,255,255,.22);border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);font-size:11px;font-weight:900;line-height:1.25;}',
      '.petslab-coat-swatch-mark{display:inline-grid;place-items:center;flex:0 0 24px;width:24px;height:24px;border:2px solid currentColor;border-radius:50%;background:rgba(255,255,255,.12);font-size:13px;}',
      '.petslab-allele-loci{display:grid;gap:7px;margin-top:8px;}',
      '.petslab-allele-locus{display:grid;grid-template-columns:46px minmax(0,1fr);gap:7px;align-items:center;}',
      '.petslab-allele-locus-name{color:#d6b88f;font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;}',
      '.petslab-allele-chips{display:flex;gap:5px;min-width:0;}',
      '.petslab-allele-chip{display:inline-grid;place-items:center;width:28px;height:28px;border:1px solid rgba(255,255,255,.24);border-radius:8px;background:#2d2019;color:#fff;font:900 14px/1 ui-monospace,SFMono-Regular,Consolas,monospace;box-shadow:inset 0 -2px 0 rgba(0,0,0,.18);}',
      '.petslab-allele-chip--dominant{border-color:rgba(251,191,36,.72);background:#6b3b12;color:#fff3c4;}',
      '.petslab-gene-key{margin-top:7px;color:#a89180;font-size:9px;line-height:1.4;}',
      '.petslab-punnett-scroll{min-width:0;width:100%;max-width:100%;overflow-x:auto;padding:2px 0 7px;scrollbar-gutter:stable;}',
      '.petslab-punnett-table{width:100%;min-width:500px;max-width:620px;margin:0 auto;border-collapse:separate!important;border-spacing:3px!important;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}',
      '.petslab-punnett-table th{border-radius:7px;}',
      '.petslab-punnett-cell{min-width:82px;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);}',
      '.petslab-cell-genotype{font-size:12px;font-weight:900;letter-spacing:.025em;}',
      '.petslab-cell-phenotype{display:inline-flex;align-items:center;justify-content:center;gap:4px;margin-top:3px;padding:2px 5px;border:1px solid currentColor;border-radius:999px;background:rgba(255,255,255,.1);font:800 9px/1.25 system-ui,sans-serif;white-space:nowrap;}',
      '.petslab-phenotype-shape{font-size:10px;line-height:1;}',
      '.petslab-outcome{width:100%;margin-top:14px;padding:11px;border:1px solid rgba(245,158,11,.26);border-radius:13px;background:rgba(15,10,8,.5);}',
      '.petslab-outcome-heading{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:8px;}',
      '.petslab-outcome-heading strong{color:#fef3e2;font-size:12px;}',
      '.petslab-outcome-heading span{color:#a89180;font-size:10px;}',
      '.petslab-outcome-bar{display:flex;width:100%;height:42px;overflow:hidden;border:2px solid rgba(255,255,255,.24);border-radius:11px;background:#100b09;box-shadow:inset 0 2px 7px rgba(0,0,0,.5);}',
      '.petslab-outcome-segment{display:flex;align-items:center;justify-content:center;min-width:0;color:#fff;font-size:10px;font-weight:950;text-shadow:0 1px 2px rgba(0,0,0,.72);}',
      '.petslab-outcome-segment--black{background:repeating-linear-gradient(135deg,#111827 0,#111827 8px,#263244 8px,#263244 12px);}',
      '.petslab-outcome-segment--chocolate{background:repeating-linear-gradient(45deg,#71390f 0,#71390f 8px,#924b1b 8px,#924b1b 12px);}',
      '.petslab-outcome-segment--yellow{background:radial-gradient(circle at 3px 3px,rgba(91,52,8,.25) 0 1.4px,transparent 1.6px),#e4af36;background-size:9px 9px;color:#291708;text-shadow:none;}',
      '.petslab-outcome-legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px;}',
      '.petslab-outcome-card{min-width:0;padding:9px;border:1px solid rgba(255,255,255,.16);border-radius:10px;text-align:left;}',
      '.petslab-outcome-card-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;}',
      '.petslab-outcome-card-count{margin-top:3px;font-size:20px;font-weight:950;}',
      '.petslab-outcome-card-pct{font-size:10px;font-weight:750;opacity:.88;}',
      '@media (max-width:680px){.petslab-gene-parent-grid{grid-template-columns:1fr;}.petslab-punnett-table{min-width:480px;}}',
      '@media (max-width:480px){.petslab-genetics-view{padding:12px!important;}.petslab-punnett-lab{padding:11px!important;}.petslab-gene-parent-card{padding:10px;}.petslab-gene-parent-visual{grid-template-columns:78px minmax(0,1fr);gap:9px;}.petslab-outcome-heading{display:block;}.petslab-outcome-heading span{display:block;margin-top:2px;}.petslab-outcome-legend{grid-template-columns:1fr;}.petslab-outcome-card{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;}.petslab-outcome-card-count{margin-top:0;font-size:17px;}.petslab-punnett-table{min-width:450px;}}',
      '@media (forced-colors:active){.petslab-gene-parent-card,.petslab-outcome,.petslab-outcome-card,.petslab-coat-swatch,.petslab-cell-phenotype{border:1px solid CanvasText;}.petslab-outcome-segment{border-right:2px solid CanvasText;forced-color-adjust:none;}}',
      '.petslab-cost-view *{box-sizing:border-box;}',
      '.petslab-cost-summary{overflow:hidden;background:radial-gradient(circle at 94% 4%,rgba(245,158,11,.12),transparent 34%),linear-gradient(155deg,rgba(45,32,24,.98),rgba(24,18,16,.98))!important;box-shadow:0 16px 38px rgba(0,0,0,.18);}',
      '.petslab-cost-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:12px;}',
      '.petslab-cost-burden{margin-top:14px;padding-top:12px;border-top:1px solid rgba(232,213,183,.18);}',
      '.petslab-cost-burden-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px;}',
      '.petslab-cost-burden-heading strong{color:#fef3e2;font-size:clamp(12px,2.5vw,14px);}',
      '.petslab-cost-burden-heading span{color:#bca58e;font-size:clamp(11px,2.2vw,12px);}',
      '.petslab-cost-burden-row{display:grid;grid-template-columns:minmax(116px,.7fr) minmax(120px,1.6fr) auto;gap:9px;align-items:center;margin:7px 0;}',
      '.petslab-cost-burden-label,.petslab-cost-burden-value{color:#ead8c6;font-size:clamp(11px,2.3vw,13px);font-weight:800;}',
      '.petslab-cost-burden-value{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right;}',
      '.petslab-cost-burden-track{height:12px;overflow:hidden;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:#100b09;box-shadow:inset 0 2px 4px rgba(0,0,0,.45);}',
      '.petslab-cost-burden-fill{height:100%;min-width:3px;border-radius:inherit;}',
      '.petslab-cost-burden-fill--annual{background:repeating-linear-gradient(135deg,#0891b2 0,#0891b2 7px,#22d3ee 7px,#22d3ee 10px);}',
      '.petslab-cost-burden-fill--span{background:linear-gradient(90deg,#f59e0b,#fbbf24);}',
      '.petslab-cost-timeline{margin-top:12px;padding:10px;border:1px solid rgba(232,213,183,.18);border-radius:12px;background:rgba(15,10,8,.46);}',
      '.petslab-cost-timeline svg{display:block;width:100%;height:clamp(54px,10vw,70px);}',
      '.petslab-cost-timeline-labels{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;color:#c9b39c;font-size:clamp(11px,2.2vw,12px);line-height:1.4;}',
      '.petslab-cost-timeline-key{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:7px;color:#c9b39c;font-size:clamp(11px,2.2vw,12px);}',
      '.petslab-cost-allocation{margin-top:14px;padding-top:12px;border-top:1px solid rgba(232,213,183,.18);}',
      '.petslab-cost-allocation-bar{display:flex;width:100%;height:clamp(42px,8vw,54px);overflow:hidden;border:2px solid rgba(255,255,255,.22);border-radius:11px;background:#100b09;box-shadow:inset 0 2px 7px rgba(0,0,0,.5);}',
      '.petslab-cost-allocation-segment{display:flex;align-items:center;justify-content:center;min-width:0;overflow:hidden;color:#fff;font-size:clamp(11px,2vw,12px);font-weight:950;text-shadow:0 1px 2px rgba(0,0,0,.68);white-space:nowrap;}',
      '.petslab-cost-allocation-segment--setup{background:repeating-linear-gradient(135deg,#a94f0b 0,#a94f0b 8px,#f59e0b 8px,#f59e0b 12px);}',
      '.petslab-cost-allocation-segment--ongoing{background:repeating-linear-gradient(45deg,#075985 0,#075985 8px,#0891b2 8px,#0891b2 12px);}',
      '.petslab-cost-allocation-segment--reserve{background:radial-gradient(circle at 4px 4px,rgba(255,255,255,.28) 0 1.4px,transparent 1.6px),#a71919;background-size:10px 10px;}',
      '.petslab-cost-allocation-legend{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 12px;margin-top:9px;}',
      '.petslab-cost-allocation-item{display:grid;grid-template-columns:26px minmax(0,1fr);gap:7px;align-items:start;min-width:0;color:#d8c3ad;font-size:clamp(11px,2.2vw,12px);line-height:1.4;}',
      '.petslab-cost-allocation-mark{display:grid;place-items:center;width:24px;height:24px;border:1px solid currentColor;border-radius:7px;background:#2d2019;color:#fff;font-size:11px;font-weight:950;}',
      '.petslab-cost-allocation-item strong{display:block;color:#fef3e2;}',
      '.petslab-life-view *{box-sizing:border-box;}',
      '.petslab-life-stage{width:100%;margin-top:10px;padding:10px;border:1px solid rgba(14,165,233,.28);border-radius:12px;background:linear-gradient(145deg,rgba(14,165,233,.08),rgba(15,23,42,.2));}',
      '.petslab-life-stage-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:7px;}',
      '.petslab-life-stage-heading strong{color:#f8fafc;font-size:clamp(12px,2.5vw,14px);}',
      '.petslab-life-stage-heading span{color:#cbd5e1;font-size:clamp(11px,2.2vw,12px);text-align:right;}',
      '.petslab-life-stage svg,.petslab-life-compare-track svg{display:block;width:100%;height:32px;}',
      '.petslab-life-stage-axis{display:flex;justify-content:space-between;gap:8px;margin-top:3px;color:#aebdcd;font-size:clamp(11px,2.2vw,12px);}',
      '.petslab-life-stage-key{display:flex;flex-wrap:wrap;gap:7px 14px;margin-top:7px;color:#cbd5e1;font-size:clamp(11px,2.2vw,12px);}',
      '.petslab-life-stage-note{margin:6px 0 0;color:#aebdcd;font-size:clamp(11px,2.2vw,12px);line-height:1.45;}',
      '.petslab-life-comparison{margin-top:12px;padding:12px;border:1px solid rgba(124,58,237,.34);border-radius:12px;background:rgba(15,10,30,.32);}',
      '.petslab-life-comparison h4{margin:0;color:#f8fafc;font-size:clamp(13px,2.7vw,15px);}',
      '.petslab-life-comparison>p{margin:4px 0 10px;color:#cbd5e1;font-size:clamp(11px,2.2vw,12px);line-height:1.45;}',
      '.petslab-life-compare-list{display:grid;gap:8px;}',
      '.petslab-life-compare-row{display:grid;grid-template-columns:minmax(160px,.95fr) minmax(180px,1.6fr) 82px;gap:9px;align-items:center;min-width:0;}',
      '.petslab-life-compare-name{min-width:0;color:#f8fafc;font-size:clamp(11px,2.25vw,13px);font-weight:800;line-height:1.35;}',
      '.petslab-life-compare-track{min-width:0;}',
      '.petslab-life-compare-range{color:#e2e8f0;font:800 clamp(11px,2.2vw,12px)/1.25 ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right;}',
      '.petslab-life-bucket-mark{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px;border:1px solid currentColor;border-radius:7px;font-weight:950;}',
      '.petslab-picker-results{padding:14px;border:1px solid rgba(245,158,11,.46);border-radius:14px;background:linear-gradient(155deg,rgba(45,32,24,.98),rgba(24,18,16,.98));margin-bottom:14px;box-shadow:0 14px 32px rgba(0,0,0,.18);}' ,
      '.petslab-picker-results-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;}' ,
      '.petslab-picker-results-head h3{margin:0;color:#fef3e2;font-size:15px;}' ,
      '.petslab-picker-scale-copy{color:#d6b88f;font-size:10px;font-weight:800;letter-spacing:.035em;}' ,
      '.petslab-picker-list{display:grid;gap:8px;margin:0;padding:0;list-style:none;}' ,
      '.petslab-picker-card{min-width:0;padding:11px;border:1px solid #5c4536;border-radius:11px;background:rgba(24,18,16,.88);}' ,
      '.petslab-picker-card--top{display:grid;grid-template-columns:minmax(112px,148px) minmax(0,1fr);gap:13px;align-items:stretch;border:2px solid #fbbf24;background:radial-gradient(circle at 12% 20%,rgba(251,191,36,.18),transparent 48%),rgba(24,18,16,.96);box-shadow:0 12px 28px rgba(0,0,0,.25);}' ,
      '.petslab-picker-card-main{min-width:0;}' ,
      '.petslab-picker-card-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:7px;margin-bottom:7px;}' ,
      '.petslab-picker-rank{display:grid;width:24px;height:24px;place-items:center;border:2px solid #8d735f;border-radius:50%;color:#fef3e2;font-size:11px;font-weight:900;}' ,
      '.petslab-picker-card--top .petslab-picker-rank{border-color:#fbbf24;color:#fde68a;}' ,
      '.petslab-picker-icon{font-size:20px;line-height:1;}' ,
      '.petslab-picker-name{min-width:0;color:#fef3e2;font-size:14px;font-weight:850;line-height:1.3;overflow-wrap:anywhere;word-break:normal;}' ,
      '.petslab-picker-status{color:#fde68a;font-family:monospace;font-size:10px;font-weight:800;text-align:right;white-space:nowrap;}' ,
      '.petslab-picker-top-art{display:grid;min-height:112px;place-items:center;border:1px solid rgba(251,191,36,.32);border-radius:10px;background:rgba(15,23,42,.62);color:#fbbf24;}' ,
      '.petslab-picker-top-art svg{display:block;width:min(100%,160px);height:auto;}' ,
      '.petslab-picker-fit{margin:2px 0 9px;}' ,
      '.petslab-picker-fit-key{margin-bottom:4px;color:#d6b88f;font-size:10px;font-weight:750;}' ,
      '.petslab-picker-fit-track{position:relative;height:28px;margin:0 5%;border-radius:999px;background:#0f172a;box-shadow:inset 0 1px 4px rgba(0,0,0,.65);}' ,
      '.petslab-picker-fit-segment{position:absolute;top:9px;height:10px;border-radius:999px;background:#fbbf24;transition:left .24s ease,width .24s ease;}' ,
      '.petslab-picker-fit-segment.is-negative{background:#f97316;}' ,
      '.petslab-picker-fit-zero,.petslab-picker-fit-threshold{position:absolute;top:3px;bottom:3px;width:2px;background:#fef3e2;opacity:.7;}' ,
      '.petslab-picker-fit-threshold{background:#84cc16;}' ,
      '.petslab-picker-fit-marker{position:absolute;top:4px;width:20px;height:20px;transform:translateX(-50%);border:3px solid #fff7ed;border-radius:50%;background:#1f1612;box-shadow:0 0 0 2px rgba(0,0,0,.35);transition:left .24s ease;}' ,
      '.petslab-picker-fit-value{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#fff7ed;font-size:9px;font-weight:900;line-height:1;}' ,
      '.petslab-picker-fit-ends{display:flex;justify-content:space-between;margin-top:3px;color:#a89180;font-size:9px;font-weight:700;}' ,
      '.petslab-picker-reasons{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 7px;padding:0;list-style:none;}' ,
      '.petslab-picker-reason{display:inline-flex;align-items:center;gap:5px;min-width:0;padding:4px 7px;border:1px solid rgba(255,255,255,.13);border-radius:999px;color:#e8d5b7;font-size:10px;line-height:1.25;}' ,
      '.petslab-picker-reason strong{color:#fde68a;font-family:monospace;}' ,
      '.petslab-picker-reason.is-negative strong{color:#fdba74;}' ,
      '.petslab-picker-note{color:#cbbba8;font-size:12px;line-height:1.55;}' ,
      '@media (max-width:560px){.petslab-picker-card--top{grid-template-columns:1fr;}.petslab-picker-top-art{min-height:88px;}.petslab-picker-top-art svg{width:min(58%,150px);}}' ,
      '@media (max-width:380px){.petslab-picker-results{padding:9px;}.petslab-picker-card{padding:9px;}.petslab-picker-card-head{grid-template-columns:auto minmax(0,1fr);}.petslab-picker-status{grid-column:2;text-align:left;white-space:normal;}.petslab-picker-reason{border-radius:7px;}}' ,
      '.reduce-motion .petslab-picker-fit-segment,.reduce-motion .petslab-picker-fit-marker{transition:none!important;}' ,
      '@media (prefers-reduced-motion:reduce){.petslab-picker-fit-segment,.petslab-picker-fit-marker{transition:none!important;}}' ,
      '@media (max-width:600px){.petslab-cost-allocation-legend{grid-template-columns:1fr;}.petslab-life-compare-row{grid-template-columns:1fr auto;gap:3px 8px;}.petslab-life-compare-track{grid-column:1/-1;grid-row:2;}.petslab-life-compare-range{grid-column:2;grid-row:1;}}',
      '@media (max-width:480px){.petslab-cost-view,.petslab-life-view{padding:12px!important;}.petslab-cost-summary{padding:12px!important;}.petslab-cost-burden-heading,.petslab-life-stage-heading{display:block;}.petslab-cost-burden-heading span,.petslab-life-stage-heading span{display:block;margin-top:2px;text-align:left;}.petslab-cost-burden-row{grid-template-columns:1fr auto;gap:4px 8px;}.petslab-cost-burden-track{grid-column:1/-1;grid-row:2;}.petslab-cost-burden-value{grid-column:2;grid-row:1;}.petslab-cost-timeline-labels{align-items:flex-start;}.petslab-cost-allocation{padding-top:10px;}}',
      '@media (forced-colors:active){.petslab-cost-summary,.petslab-cost-timeline,.petslab-cost-allocation-bar,.petslab-cost-burden-track,.petslab-life-stage,.petslab-life-comparison,.petslab-life-bucket-mark{border:1px solid CanvasText;}.petslab-cost-allocation-segment{border-right:2px solid CanvasText;forced-color-adjust:none;}}',
      '.reduce-motion .petslab-life-view *{transition:none!important;animation:none!important;}',
      '@media (prefers-reduced-motion:reduce){.petslab-life-view *{transition:none!important;animation:none!important;}}',
      '.petslab-tradeoff-dashboard{display:grid;grid-template-columns:minmax(0,1.28fr) minmax(250px,.72fr);gap:12px;align-items:stretch;margin:10px 0 12px;}',
      '.petslab-tradeoff-panel{min-width:0;padding:12px;border:1px solid rgba(232,213,183,.2);border-radius:14px;background:linear-gradient(150deg,rgba(45,32,24,.96),rgba(20,15,13,.94));box-shadow:inset 0 1px 0 rgba(255,255,255,.055),0 12px 28px rgba(0,0,0,.18);}',
      '.petslab-tradeoff-radar{display:block;width:100%;height:auto;max-height:430px;margin:0 auto;}',
      '.petslab-tradeoff-legend{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:6px;color:#e8d5b7;font-size:10px;font-weight:800;}',
      '.petslab-tradeoff-legend-item{display:inline-flex;align-items:center;gap:6px;}',
      '.petslab-tradeoff-legend-swatch{display:inline-block;width:30px;height:0;border-top:3px solid #fbbf24;}',
      '.petslab-tradeoff-legend-swatch.is-need{border-top:2px dashed #f6d7a7;}',
      '.petslab-tradeoff-domain-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:0 0 10px;}',
      '.petslab-tradeoff-domain{min-width:0;padding:9px;border:1px solid rgba(232,213,183,.16);border-radius:10px;background:rgba(18,13,11,.64);}',
      '.petslab-tradeoff-domain strong{display:block;min-height:28px;color:#fef3e2;font-size:10px;line-height:1.3;}',
      '.petslab-tradeoff-values{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;}',
      '.petslab-tradeoff-values span{padding:4px;border-radius:6px;background:rgba(255,255,255,.045);color:#e8d5b7;font-size:9px;line-height:1.25;text-align:center;}',
      '.petslab-tradeoff-values b{display:block;margin-top:1px;color:#fff4da;font:800 12px/1.2 monospace;}',
      '.petslab-tradeoff-vignette{display:flex;min-height:100%;flex-direction:column;overflow:hidden;border:1px solid rgba(232,213,183,.2);border-radius:14px;background:#211711;box-shadow:inset 0 1px 0 rgba(255,255,255,.055),0 12px 28px rgba(0,0,0,.18);}',
      '.petslab-tradeoff-vignette svg{display:block;width:100%;height:auto;flex:1 1 auto;}',
      '.petslab-tradeoff-vignette-caption{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:9px 11px;border-top:1px solid rgba(232,213,183,.16);background:rgba(18,13,11,.84);font-size:10px;line-height:1.35;}',
      '.petslab-tradeoff-animal{transform-box:fill-box;transform-origin:center bottom;}',
      '.petslab-tradeoff-animal.is-calm{animation:petslab-tradeoff-breathe 2.8s ease-in-out infinite;}',
      '@keyframes petslab-tradeoff-breathe{0%,100%{transform:scale(1);}50%{transform:scale(1.018,.985);}}',
      '@media (max-width:820px){.petslab-tradeoff-dashboard{grid-template-columns:1fr;}.petslab-tradeoff-vignette{min-height:280px;}.petslab-tradeoff-domain-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:480px){.petslab-tradeoff-panel{padding:7px;}.petslab-tradeoff-radar{max-height:none;}.petslab-tradeoff-radar-scale,.petslab-tradeoff-radar-value{display:none;}.petslab-tradeoff-radar-axis{font-size:20px!important;}.petslab-tradeoff-domain-grid{grid-template-columns:1fr;}.petslab-tradeoff-domain strong{min-height:0;}.petslab-tradeoff-vignette{min-height:240px;}.petslab-tradeoff-vignette-caption{flex-direction:column;}.petslab-tradeoff-legend{justify-content:flex-start;gap:8px;}}',
      '.reduce-motion .petslab-tradeoff-animal{animation:none!important;}',
      '@media (prefers-reduced-motion:reduce){.petslab-tradeoff-animal{animation:none!important;}}',
      '.petslab-diagram-canvas{width:100%;min-width:0;}',
      '.petslab-diagram-responsive-art{width:100%;min-width:0;}',
      '.petslab-diagram-responsive-art svg{display:block;width:100%;height:auto;border-radius:10px;}',
      '.petslab-diagram-narrow{display:none!important;}',
      '.petslab-diagram-flow{animation:petslab-diagram-flow 1.7s linear infinite;}',
      '@keyframes petslab-diagram-flow{to{stroke-dashoffset:-36;}}',
      '@media (max-width:640px){.petslab-diagram-wide{display:none!important;}.petslab-diagram-narrow{display:block!important;}.petslab-diagram-panel{padding:7px!important;}.petslab-diagram-caption{margin-left:1px!important;margin-right:1px!important;}}',
      '.reduce-motion .petslab-diagram-flow{animation:none!important;}',
      '@media (prefers-reduced-motion:reduce){.petslab-diagram-flow{animation:none!important;}}',
      '@media (forced-colors:active){.petslab-diagram-responsive-art svg{border:1px solid CanvasText;}.petslab-diagram-flow{stroke:CanvasText!important;}}',
      '.petslab-sim-stage{position:relative;isolation:isolate;overflow:hidden;border:1px solid rgba(245,158,11,.34);border-radius:20px;background:#111827;box-shadow:0 24px 60px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.08);}',
      '.petslab-sensory-stage{height:clamp(340px,52vw,520px);min-height:340px;}',
      '.petslab-sensory-stage canvas{border-radius:20px!important;}',
      '.petslab-stage-hud{position:absolute;z-index:4;display:flex;gap:6px;flex-wrap:wrap;pointer-events:none;}',
      '.petslab-stage-hud--top{left:14px;right:14px;top:14px;justify-content:space-between;align-items:flex-start;}',
      '.petslab-stage-hud--bottom{left:14px;right:14px;bottom:14px;align-items:flex-end;justify-content:space-between;}',
      '.petslab-hud-stack{display:flex;gap:6px;flex-wrap:wrap;max-width:min(100%,520px);}',
      '.petslab-hud-chip{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:5px 9px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(15,23,42,.74);box-shadow:0 6px 20px rgba(0,0,0,.24);backdrop-filter:blur(10px);color:#fff;font-size:10px;font-weight:850;letter-spacing:.025em;text-shadow:0 1px 2px rgba(0,0,0,.4);}',
      '.petslab-body-pose{margin:0 0 14px;overflow:hidden;border:1px solid rgba(245,158,11,.34);border-radius:14px;background:linear-gradient(155deg,rgba(30,41,59,.98),rgba(24,18,16,.98));box-shadow:0 14px 30px rgba(0,0,0,.22);}',
      '.petslab-body-pose svg{display:block;width:100%;height:auto;aspect-ratio:14/5;}',
      '.petslab-body-cues{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:8px 10px 10px;border-top:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.52);}',
      '.petslab-body-cue{display:flex;align-items:center;gap:7px;min-width:0;padding:6px 8px;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#fef3e2;font-size:11px;font-weight:750;line-height:1.35;}',
      '.petslab-body-cue strong{display:inline-grid;flex:0 0 22px;width:22px;height:22px;place-items:center;border:2px solid #fbbf24;border-radius:50%;color:#fde68a;font-size:11px;line-height:1;}',
      '.petslab-body-motion--sway{transform-box:fill-box;transform-origin:12% 50%;animation:petslab-body-sway 1.7s ease-in-out infinite alternate;}',
      '.petslab-body-motion--pulse{animation:petslab-body-pulse 1.45s ease-in-out infinite alternate;}',
      '.petslab-body-motion--lift{transform-box:fill-box;transform-origin:center;animation:petslab-body-lift 1.8s ease-in-out infinite alternate;}',
      '@keyframes petslab-body-sway{from{transform:rotate(-2deg);}to{transform:rotate(4deg);}}',
      '@keyframes petslab-body-pulse{from{opacity:.52;}to{opacity:1;}}',
      '@keyframes petslab-body-lift{from{transform:translateY(0);}to{transform:translateY(-3px);}}',
      '@media (max-width:480px){.petslab-body-cues{grid-template-columns:1fr;}.petslab-body-cue{padding:5px 7px;}}',
      '.petslab-body-reference-group{margin-bottom:16px;padding:12px;border:1px solid rgba(232,213,183,.18);border-radius:14px;background:linear-gradient(155deg,rgba(45,32,24,.9),rgba(24,18,16,.94));}',
      '.petslab-body-reference-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:10px;}',
      '.petslab-body-reference-head h3{margin:0;color:#fef3e2;font-size:15px;}',
      '.petslab-body-reference-count{color:#c9b39c;font-size:11px;font-weight:800;}',
      '.petslab-body-reference-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
      '.petslab-body-reference-card{min-width:0;overflow:hidden;border:1px solid rgba(232,213,183,.2);border-radius:12px;background:rgba(18,13,11,.76);}',
      '.petslab-body-pose--compact{margin:0!important;border:0;border-bottom:1px solid rgba(255,255,255,.1);border-radius:0;box-shadow:none;}',
      '.petslab-body-pose--compact svg{aspect-ratio:14/5;}',
      '.petslab-body-reference-copy{padding:10px 11px 11px;}',
      '.petslab-body-reference-signal{margin:0 0 5px;color:#fef3e2;font-size:12px;font-weight:800;line-height:1.45;}',
      '.petslab-body-reference-meaning{margin:0;color:#d8c3ad;font-size:12px;line-height:1.5;}',
      '.petslab-body-reference-meaning strong{color:#fde68a;}',
      '@media (max-width:680px){.petslab-body-reference-grid{grid-template-columns:1fr;}.petslab-body-reference-group{padding:9px;}}',
      '@media (max-width:420px){.petslab-body-reference-head{display:block;}.petslab-body-reference-count{display:block;margin-top:3px;}}',
      '@media (forced-colors:active){.petslab-body-reference-group,.petslab-body-reference-card,.petslab-body-pose--compact{border:1px solid CanvasText;}}',
      '.reduce-motion .petslab-body-motion--sway,.reduce-motion .petslab-body-motion--pulse,.reduce-motion .petslab-body-motion--lift{animation:none!important;}',
      '@media (prefers-reduced-motion:reduce){.petslab-body-motion--sway,.petslab-body-motion--pulse,.petslab-body-motion--lift{animation:none!important;}}',

      '.petslab-hud-chip strong{color:#fde68a;}',
      '.petslab-hud-objective{max-width:270px;padding:8px 10px;border:1px solid rgba(251,191,36,.42);border-radius:12px;background:rgba(31,22,18,.78);box-shadow:0 8px 28px rgba(0,0,0,.26);backdrop-filter:blur(10px);color:#fef3e2;font-size:10px;line-height:1.45;text-align:right;}',
      '.petslab-reticle{position:absolute;z-index:3;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.72);border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.25),0 0 12px rgba(255,255,255,.16);pointer-events:none;}',
      '.petslab-reticle:before,.petslab-reticle:after{content:"";position:absolute;background:rgba(255,255,255,.72);}',
      '.petslab-reticle:before{left:8px;top:-5px;width:1px;height:26px;}',
      '.petslab-reticle:after{left:-5px;top:8px;width:26px;height:1px;}',
      '.petslab-control-dock{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:10px;padding:10px;border:1px solid #5c4536;border-radius:14px;background:linear-gradient(180deg,rgba(45,32,24,.98),rgba(24,18,16,.98));box-shadow:0 10px 28px rgba(0,0,0,.2);}',
      '.petslab-control-cluster{display:flex;gap:7px;align-items:center;flex-wrap:wrap;}',
      '.petslab-control-label{color:#a89180;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}',
      '.petslab-sim-button{transition:transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease;}',
      '.petslab-sim-button:not(:disabled):hover{transform:translateY(-1px);border-color:#fbbf24!important;box-shadow:0 7px 18px rgba(0,0,0,.24);}',
      '.petslab-care-stage{aspect-ratio:20/7;min-height:0;}',
      '.petslab-care-stage svg{filter:saturate(1.06) contrast(1.02);}',
      '.petslab-care-zone{transition:transform .16s ease,box-shadow .16s ease,background .16s ease!important;}',
      '.petslab-care-chips{top:52px!important;bottom:auto!important;left:auto!important;max-width:210px;justify-content:flex-end;}',
      '@media (min-width:681px){.petslab-care-zone:not(:disabled):hover{transform:translate(-50%,-50%) scale(1.12)!important;box-shadow:0 0 0 5px rgba(255,255,255,.16),0 8px 20px rgba(0,0,0,.34)!important;}}',
      '.petslab-trainer-stage{height:clamp(220px,42vw,340px);min-height:280px;margin-bottom:12px;}',
      '.petslab-trainer-stage svg{display:block;position:absolute;inset:0;width:100%;height:100%;}',
      '.petslab-trainer-tail{transform-box:fill-box;transform-origin:10% 50%;animation:petslab-trainer-wag .52s ease-in-out infinite alternate;}',
      '.petslab-trainer-reward{animation:petslab-trainer-reward .58s ease-out both;}',
      '@keyframes petslab-trainer-wag{from{transform:rotate(-8deg);}to{transform:rotate(13deg);}}',
      '@keyframes petslab-trainer-reward{0%{opacity:0;}65%{opacity:1;}100%{opacity:1;}}',
      '.petslab-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}',
      '.petslab-metric-card{padding:10px 11px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(0,0,0,.08));}',
      '.petslab-meter-track{position:relative;height:8px;overflow:hidden;border-radius:999px;background:#120d0b;box-shadow:inset 0 1px 3px rgba(0,0,0,.55);}',
      '.petslab-meter-fill{height:100%;border-radius:inherit;box-shadow:0 0 12px currentColor;transition:width .35s ease;}',
      '.petslab-sim-choice{position:relative;overflow:hidden;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;}',
      '.petslab-sim-choice:not(:disabled):hover{transform:translateY(-2px);border-color:#fbbf24!important;box-shadow:0 10px 24px rgba(0,0,0,.22);}',
      '.petslab-day-rail{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin-bottom:10px;}',
      '.petslab-day-node{height:5px;border-radius:999px;background:#3d2c22;overflow:hidden;}',
      '.petslab-day-node.is-past{background:#84cc16;box-shadow:0 0 9px rgba(132,204,22,.35);}',
      '.petslab-day-node.is-now{background:#fbbf24;box-shadow:0 0 11px rgba(251,191,36,.5);}',
      '.petslab-care-event{position:absolute;right:12px;top:52px;display:flex;align-items:center;gap:7px;max-width:238px;padding:6px 9px;border:1px solid rgba(251,191,36,.42);border-radius:10px;background:rgba(31,22,18,.82);box-shadow:0 7px 20px rgba(0,0,0,.26);backdrop-filter:blur(8px);color:#fef3e2;font-size:10px;line-height:1.25;}',
      '.petslab-care-event-icon{font-size:16px;line-height:1;}',
      '.petslab-care-event strong,.petslab-care-event small{display:block;}',
      '.petslab-care-event strong{font-size:10px;color:#fde68a;letter-spacing:.02em;}',
      '.petslab-care-event small{margin-top:2px;color:#d8c3ad;font-size:10px;}',
      '.petslab-care-timeline{padding:12px;border:1px solid rgba(232,213,183,.18);border-radius:12px;background:linear-gradient(155deg,rgba(45,32,24,.92),rgba(24,18,16,.96));}',
      '.petslab-care-timeline-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;}',
      '.petslab-care-timeline-head h3{margin:0;color:#fef3e2;font-size:14px;}',
      '.petslab-care-timeline-head p{margin:4px 0 0;color:#c9b39c;font-size:11px;line-height:1.45;}',
      '.petslab-care-timeline-legend{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;color:#d8c3ad;font-size:10px;font-weight:800;text-transform:uppercase;white-space:nowrap;}',
      '.petslab-care-timeline-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;}',
      '.petslab-care-timeline-day{min-width:0;padding:8px;border:1px solid rgba(232,213,183,.16);border-radius:9px;background:rgba(15,23,42,.34);}',
      '.petslab-care-timeline-day.is-past{border-color:rgba(132,204,22,.38);}',
      '.petslab-care-timeline-day.is-now{border-color:rgba(251,191,36,.78);box-shadow:0 0 0 1px rgba(251,191,36,.22),0 8px 18px rgba(0,0,0,.18);}',
      '.petslab-care-timeline-daytop{display:flex;justify-content:space-between;gap:4px;margin-bottom:6px;color:#a89180;font-size:9px;font-weight:900;letter-spacing:.06em;}',
      '.petslab-care-timeline-day.is-now .petslab-care-timeline-daytop{color:#fde68a;}',
      '.petslab-care-timeline-state{font-weight:800;text-transform:uppercase;}',
      '.petslab-care-timeline-event{display:flex;align-items:flex-start;gap:6px;min-height:35px;}',
      '.petslab-care-timeline-icon{flex:0 0 auto;font-size:17px;line-height:1;}',
      '.petslab-care-timeline-event strong,.petslab-care-timeline-event small{display:block;}',
      '.petslab-care-timeline-event strong{color:#fef3e2;font-size:11px;line-height:1.25;}',
      '.petslab-care-timeline-event small{margin-top:2px;color:#c9b39c;font-size:10px;line-height:1.3;}',
      '.petslab-care-timeline-choice{min-height:36px;margin:7px 0;padding:5px 6px;border-left:2px solid #fbbf24;color:#fef3e2;font-size:10px;line-height:1.35;}',
      '.petslab-care-timeline-choice.is-empty{border-left-color:rgba(232,213,183,.25);color:#a89180;font-style:italic;}',
      '.petslab-care-timeline-deltas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;}',
      '.petslab-care-timeline-deltas span{display:flex;flex-direction:column;align-items:center;padding:3px 2px;border-radius:5px;background:rgba(255,255,255,.045);color:var(--pets-domain-color);font-size:10px;line-height:1.15;}',
      '.petslab-care-timeline-deltas b{font-size:9px;}',
      '.petslab-care-timeline-deltas em{font-style:normal;color:#fef3e2;font-weight:800;}',
      '@media (max-width:680px){.petslab-care-event{right:8px;top:52px;max-width:195px;}.petslab-care-timeline-head{display:block;}.petslab-care-timeline-legend{justify-content:flex-start;margin-top:8px;}.petslab-care-timeline-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:420px){.petslab-care-event{left:8px;right:8px;top:52px;max-width:none;}.petslab-care-timeline{padding:9px;}.petslab-care-timeline-grid{grid-template-columns:1fr;}.petslab-care-timeline-day{padding:9px;}.petslab-care-timeline-choice{min-height:0;}.petslab-care-timeline-deltas{max-width:220px;}}',
      '@media (forced-colors:active){.petslab-care-event,.petslab-care-timeline,.petslab-care-timeline-day{border:1px solid CanvasText;}.petslab-care-timeline-deltas span{color:CanvasText!important;}}',
      '@keyframes petslab-action-pop{0%{opacity:0;transform:translate(-50%,-15%) scale(.72);}16%{opacity:1;transform:translate(-50%,-42%) scale(1.05);}76%{opacity:1;}100%{opacity:0;transform:translate(-50%,-110%) scale(.92);}}',
      '.petslab-action-pop{animation:petslab-action-pop 1.35s ease-out forwards;}',
      '@media (max-width:920px){.petslab-featured-grid{grid-template-columns:repeat(3,minmax(0,1fr));}.petslab-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media (max-width:680px){.petslab-command-stats{grid-template-columns:repeat(2,minmax(0,1fr));}.petslab-featured-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.petslab-sensory-stage{height:400px;}.petslab-stage-hud--bottom{display:none;}.petslab-hud-objective{max-width:190px;}.petslab-control-dock{align-items:stretch;}.petslab-control-cluster{flex:1 1 100%;}.petslab-care-stage{min-height:260px;}}',
      '@media (max-width:480px){.petslab-menu-shell{padding:0!important;}.petslab-command{padding:13px!important;border-radius:14px!important;}.petslab-featured-grid,.petslab-catalog-grid{grid-template-columns:1fr;}.petslab-menu-tile{min-height:96px!important;}.petslab-featured-heading{align-items:flex-start;}.petslab-inquiry-body [style*="flex:0 0 160px"]{flex:1 1 100%!important;}.petslab-sensory-stage{height:340px;min-height:340px;border-radius:14px!important;}.petslab-sensory-stage canvas{border-radius:14px!important;}.petslab-stage-hud--top{left:9px;right:9px;top:9px;}.petslab-hud-objective{display:none;}.petslab-hud-chip{font-size:9px;min-height:25px;padding:4px 7px;}.petslab-control-dock{padding:8px;border-radius:12px;}.petslab-trainer-stage{min-height:220px;}.petslab-metric-grid{grid-template-columns:1fr;}.petslab-care-zone{width:36px!important;height:36px!important;font-size:15px!important;}.petslab-care-chips{left:8px!important;right:8px!important;bottom:8px!important;}}',
      '@media (max-width:680px){.petslab-care-chips{display:none!important;}.petslab-care-zone{top:auto!important;bottom:10px!important;transform:none!important;width:38px!important;height:38px!important;}.petslab-care-zone--pet{left:3%!important;}.petslab-care-zone--feed{left:23%!important;}.petslab-care-zone--water{left:43%!important;}.petslab-care-zone--play{left:63%!important;}.petslab-care-zone--clean{left:83%!important;}}',
      '@media (max-width:480px){.petslab-care-chips{display:none!important;}.petslab-care-zone{top:auto!important;bottom:8px!important;transform:none!important;width:34px!important;height:34px!important;}.petslab-care-zone--pet{left:3%!important;}.petslab-care-zone--feed{left:23%!important;}.petslab-care-zone--water{left:43%!important;}.petslab-care-zone--play{left:63%!important;}.petslab-care-zone--clean{left:83%!important;}}',
      '@media (max-width:680px){.petslab-care-stage{aspect-ratio:auto;height:260px;min-height:260px;min-width:0;width:100%;}}',
      '.reduce-motion .petslab-action-pop{display:none!important;}.reduce-motion .petslab-trainer-tail,.reduce-motion .petslab-trainer-reward{animation:none!important;}.reduce-motion .petslab-sim-choice:hover,.reduce-motion .petslab-sim-button:hover{transform:none;}',
      '@media (max-width:480px){.petslab-care-decision{display:none!important;}}',
      '@media (max-width:680px){.petslab-trainer-stage{height:clamp(220px,44vw,300px);min-height:220px;}}',
      '@media (max-width:480px){.petslab-trainer-stage{height:clamp(160px,45vw,220px);min-height:160px;}}',
      '@media (prefers-reduced-motion:reduce){.petslab-menu-tile,.petslab-sim-button,.petslab-care-zone,.petslab-sim-choice,.petslab-meter-fill{transition:none!important;}.petslab-action-pop{display:none!important;}.petslab-trainer-tail,.petslab-trainer-reward{animation:none!important;}.petslab-menu-tile:hover,.petslab-sim-button:hover,.petslab-sim-choice:hover{transform:none;}}',
      '.theme-contrast .petslab-command,.theme-contrast .petslab-start-card,.theme-contrast .petslab-menu-tile{box-shadow:none;}'
    ].join('\n');
    document.head.appendChild(petsWorkspaceStyle);
  }

  var _petsTimer = null;
  function petsAnnounce(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-pets');
    if (!lr) return;
    if (_petsTimer) clearTimeout(_petsTimer);
    lr.textContent = '';
    _petsTimer = setTimeout(function() { lr.textContent = String(text || ''); _petsTimer = null; }, 25);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: SOURCE CARDS — quick-reference per species
  // Citations: AVMA, AAFP, House Rabbit Society, AAV (avian vets), ARAV (reptile vets).
  // ─────────────────────────────────────────────────────────
  var SOURCE_CARDS = {
    dogs: {
      icon: '🐕', name: 'Dogs (Canis lupus familiaris)',
      principle: 'Domesticated 15–40K years ago from gray wolves',
      oneLiner: 'The first domesticated species. Co-evolved with humans long enough to develop unique communication abilities (reading human pointing gestures, eye contact for bonding). Lifespan inversely correlated with body size: giant breeds 6–8 yr, small breeds 14–16 yr.',
      lifespan: '6–16 years (smaller = longer)',
      brain: '~2 billion cortical neurons (more than cats; bonobo has ~9 billion)',
      cite: 'AVMA + Hare 2017 (Cognition)'
    },
    cats: {
      icon: '🐈', name: 'Cats (Felis catus)',
      principle: 'Self-domesticated ~9,500 years ago in the Fertile Crescent',
      oneLiner: 'Obligate carnivores: cannot synthesize taurine, vitamin A, or arginine internally — they MUST get them from animal protein. Adult-cat meowing evolved AS a domestication artifact specifically to communicate with humans (adult feral cats rarely meow at each other).',
      lifespan: '12–18 years indoor; outdoor cats die younger (predation, disease, traffic) — the often-quoted 2–5 years is a rough figure drawn largely from feral-colony data',
      brain: '~250 million cortical neurons',
      cite: 'AAFP + Bradshaw 2013 (Cat Sense)'
    },
    smallMammals: {
      icon: '🐹', name: 'Small mammals (rabbit, guinea pig, hamster, ferret)',
      principle: 'Highly variable physiology + social needs',
      oneLiner: 'Often bought as "starter pets" but most are LESS forgiving than dogs/cats. Rabbits + guinea pigs are prey species (stress-fragile, hide illness); hamsters are strictly solitary (housing two = fights to death); ferrets are obligate carnivores like cats.',
      lifespan: 'hamster 2–3 yr · guinea pig 5–8 yr · rabbit 8–12 yr · ferret 6–10 yr',
      cite: 'House Rabbit Society + AVMA Companion Animal'
    },
    birds: {
      icon: '🦜', name: 'Companion birds',
      principle: 'Vocal learning + flock psychology + extreme longevity',
      oneLiner: 'Parrots can outlive their owners — macaws + cockatoos hit 50–80 years. Air-sac respiratory anatomy makes them poison-canaries: Teflon (PTFE) overheating kills birds in minutes; aerosols, smoke, and scented candles are toxic. Cognitively complex (Alex the African Grey, Pepperberg).',
      lifespan: 'finch 5–10 yr · cockatiel 15–25 yr · macaw 50–80 yr',
      cite: 'AAV + Pepperberg 2008'
    },
    reptiles: {
      icon: '🦎', name: 'Reptiles & amphibians',
      principle: 'Ectothermic — body temperature follows environment',
      oneLiner: 'Most pet-trade reptiles die young from incorrect husbandry, not disease. They need species-specific UVB lighting + heat gradients (basking spot + cool zone). Salmonella shedding is universal — handwashing required. Amphibians have permeable skin; soap residue on hands kills them.',
      lifespan: 'leopard gecko 15–20 yr · ball python 20–30 yr · tortoise 40–80+ yr',
      cite: 'ARAV + CDC One Health'
    }
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: NUTRITION (toxic foods + species requirements)
  // Citations: AVMA Pet Toxin database + AAFCO + ASPCA Animal Poison Control.
  // ─────────────────────────────────────────────────────────
  var TOXIC_FOODS = [
    { id: 'chocolate', icon: '🍫', name: 'Chocolate', species: 'dogs (worst), cats, ferrets, birds',
      mechanism: 'Theobromine + caffeine. Dogs metabolize theobromine slowly → toxic. Dark chocolate is far worse than milk.',
      thresholdNote: '~20 mg/kg theobromine = mild signs; 60 mg/kg = severe; 200 mg/kg potentially lethal.',
      cite: 'ASPCA APCC' },
    { id: 'grapes', icon: '🍇', name: 'Grapes & raisins', species: 'dogs (mechanism unclear), cats',
      mechanism: 'Tartaric acid likely culprit (ASPCA 2021). Causes acute kidney failure unpredictably — even tiny amounts can kill some dogs.',
      thresholdNote: 'No safe threshold identified. Treat ANY ingestion as emergency.',
      cite: 'ASPCA APCC 2021' },
    { id: 'xylitol', icon: '🧪', name: 'Xylitol (sugar substitute)', species: 'dogs, ferrets',
      mechanism: 'Triggers massive insulin release → hypoglycemia + liver failure. Found in sugar-free gum, peanut butter, candy, some children\'s vitamins.',
      thresholdNote: '0.1 g/kg causes hypoglycemia; 0.5 g/kg causes liver failure.',
      cite: 'AVMA 2023' },
    { id: 'onions', icon: '🧅', name: 'Onions / garlic / leeks (Allium)', species: 'dogs, cats (cats more sensitive)',
      mechanism: 'N-propyl disulfide damages red blood cell membranes → hemolytic anemia. Cooking does NOT inactivate.',
      thresholdNote: '15–30 g/kg toxic in dogs; cats much more sensitive.',
      cite: 'Merck Vet Manual' },
    { id: 'macadamia', icon: '🥜', name: 'Macadamia nuts', species: 'dogs',
      mechanism: 'Unknown mechanism. Causes weakness, tremors, hyperthermia, hind-limb ataxia within 12 hr. Usually self-resolves but distressing.',
      thresholdNote: '~2 g/kg.',
      cite: 'ASPCA' },
    { id: 'lily', icon: '🌸', name: 'Lilies (Lilium spp.)', species: 'cats',
      mechanism: 'ALL parts toxic: leaves, petals, pollen, vase water. Causes acute kidney failure. Even pollen brushed off on fur and groomed off can be fatal.',
      thresholdNote: 'No safe exposure. Easter / Tiger / Asiatic lilies all dangerous.',
      cite: 'ASPCA' },
    { id: 'avocado', icon: '🥑', name: 'Avocado', species: 'birds (worst), rabbits',
      mechanism: 'Persin causes cardiac muscle damage in birds; can kill within 24 hr. Dogs/cats relatively tolerant of flesh but pit is GI obstruction risk.',
      cite: 'Avian Welfare Coalition' },
    { id: 'teflon', icon: '🍳', name: 'Teflon (PTFE) fumes', species: 'birds (FATAL)',
      mechanism: 'Overheated nonstick cookware (>500°F) releases polymer fumes that kill birds in MINUTES. Also: scented candles, aerosol cleaners, cigarette smoke.',
      cite: 'AAV' }
  ];
  var SPECIES_NUTRITION = [
    { id: 'cat', name: 'Cats', icon: '🐈', need: 'TAURINE (essential — deficiency → dilated cardiomyopathy + retinal degeneration). Cannot synthesize from precursors. Vegan diet for cats = cruelty + medical neglect.',
      cite: 'AAFP nutrition guidelines' },
    { id: 'dog', name: 'Dogs', icon: '🐕', need: 'Omnivorous. Can thrive on properly-formulated diets including some plant matter. AAFCO statement on label = nutritionally complete + balanced for life stage.',
      cite: 'AAFCO + AVMA' },
    { id: 'rabbit', name: 'Rabbits', icon: '🐰', need: '~80% grass hay (timothy/orchard for adults; alfalfa for young). Pellets are SUPPLEMENT not staple. Iceberg lettuce is mostly water + dangerous in volume.',
      cite: 'House Rabbit Society' },
    { id: 'parrot', name: 'Parrots', icon: '🦜', need: 'Pellet base + fresh veg + small amount fruit. AVOID all-seed diets (cause obesity + fatty liver disease). NO avocado, chocolate, caffeine, onion, alcohol.',
      cite: 'AAV' },
    { id: 'reptile', name: 'Reptiles', icon: '🦎', need: 'Hugely species-specific. Bearded dragons = omnivore (insects + greens; calcium dusting essential to prevent metabolic bone disease). Ball pythons = strict carnivore (mice).',
      cite: 'ARAV' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 3: ZOONOSES + One Health
  // Citations: CDC One Health, Maine CDC for Lyme stats.
  // ─────────────────────────────────────────────────────────
  var ZOONOSES = [
    { id: 'rabies', icon: '🦠', name: 'Rabies', from: 'mammals (esp bats, raccoons, skunks, foxes)',
      severity: 'ALWAYS FATAL once symptoms appear',
      protect: 'Vaccinate dogs + cats. Avoid wildlife. ANY bat indoors = call doctor + animal control. Wash any bite or scratch with soap and running water for a full 15 minutes first — that alone measurably lowers risk. Then start PEP (post-exposure prophylaxis) as soon as you can. Sooner is better, but there is NO cutoff after which it stops being worth doing: seek care even if days have already passed.',
      cite: 'CDC + Maine CDC' },
    { id: 'lyme', icon: '🕷️', name: 'Lyme disease + anaplasmosis', from: 'deer ticks (Ixodes scapularis)',
      severity: 'Maine is consistently among the top few states for reported incidence, trading the lead year to year with Vermont and New Hampshire. Dogs + humans both vulnerable.',
      protect: 'Year-round tick prevention for dogs (oral or topical). Daily tick checks. Lyme vaccine for high-exposure dogs. Don\'t stop checking in winter — adult ticks active any day above ~40°F.',
      cite: 'Maine CDC + AVMA' },
    { id: 'toxo', icon: '🤰', name: 'Toxoplasmosis', from: 'cats (oocysts in feces)',
      severity: 'Concern for pregnancy + immunocompromise. Do NOT assume you are already immune: only about 1 in 10 people in the US carry antibodies, so most cat owners here are still susceptible. (Seroprevalence IS high in parts of Europe and South America, which is where the "everyone has had it already" claim comes from. It does not transfer to the US.) And most US infections trace to undercooked meat and unwashed produce, not to a cat.',
      protect: 'Pregnant people: someone else cleans litter box, OR wear gloves + clean daily (oocysts take 24+ hr to become infective). Cook meat thoroughly. Wash veggies. Indoor cats fed only commercial food are very low risk — a cat sheds oocysts for only a week or two after its own first infection, which it gets by hunting or eating raw meat, and essentially never again after that.',
      cite: 'CDC + ACOG' },
    { id: 'salmonella', icon: '🐢', name: 'Salmonella', from: 'reptiles (universal shedding), raw food, baby chicks',
      severity: 'GI illness; serious in young children, elderly, pregnant, immunocompromised',
      protect: 'No reptiles for kids under 5 (CDC guidance). Wash hands after every handling. Don\'t kiss your turtle. Don\'t feed raw food to immunocompromised humans\' pets.',
      cite: 'CDC' },
    { id: 'ringworm', icon: '⭕', name: 'Ringworm (NOT a worm — fungus)', from: 'cats (asymptomatic carriers), kittens, rabbits',
      severity: 'Skin infection, itchy, contagious to humans + other pets',
      protect: 'Topical antifungal + environmental cleanup (spores survive months). Treat affected pets + screen housemates. Kittens from shelters often shed even when looking healthy.',
      cite: 'CDC + AVMA' },
    { id: 'psittacosis', icon: '🦜', name: 'Psittacosis (parrot fever — Chlamydia psittaci)', from: 'birds, esp parrots + cockatiels',
      severity: 'Pneumonia-like illness in humans; potentially severe',
      protect: 'Quarantine + vet-test new birds. Don\'t share airspace with sick birds. Inhaled dust from droppings is the route — clean cages with damp cloth, not dry sweep.',
      cite: 'CDC' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 4: GLOSSARY (ethology + animal-care terms)
  // ─────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'Operant conditioning', def: 'Learning by consequences — behavior is shaped by what follows it (reinforcement = increases; punishment = decreases). Foundation of modern pet training. (See BehaviorLab for theory deep-dive.)' },
    { term: 'Classical conditioning', def: 'Learning by association — a previously neutral stimulus becomes meaningful by being paired with something biologically significant (Pavlov\'s bell + food).' },
    { term: 'Shaping', def: 'Reinforcing successive approximations of a target behavior. How dolphins learn complex tricks and how dogs learn "go to mat."' },
    { term: 'Socialization period', def: 'Developmental window when young animals form lasting impressions of what is safe vs scary. Puppies: 3–14 wk. Kittens: 2–7 wk. Missing this window = lifelong fearfulness.' },
    { term: 'Imprinting', def: 'Rapid learning during a critical period (Lorenz\'s ducklings following the first moving object). Most relevant in birds + ungulates; less so in dogs/cats.' },
    { term: 'Calming signals', def: 'Subtle dog body language used to defuse social tension: lip-licking, yawning, head turn, "whale eye" (showing whites). Misread by humans as random.' },
    { term: 'Allogrooming', def: 'Mutual grooming between social bondmates. Cats only allogroom individuals they trust; bonded rabbits will groom each other.' },
    { term: 'Pheromone', def: 'Chemical signal that triggers behavior in same-species individuals. Cats have facial pheromones (rubbing on furniture = marking ownership in friendly way).' },
    { term: 'Allelomimetic behavior', def: 'Doing what your group does. Dogs are highly allelomimetic with their human family — they copy your routine.' },
    { term: 'Resource guarding', def: 'Defensive behavior over food, toys, resting spots, or people. Normal evolutionary behavior; manageable with training; never punish — it intensifies.' },
    { term: 'Trigger stacking', def: 'When several mildly-stressful events compound and push an animal over its bite threshold. The bite looks "out of nowhere" but the lead-up was visible.' },
    { term: 'Bite inhibition', def: 'Soft-mouth control learned in puppyhood from littermates. Puppies removed from litters too early (<8 wk) often have poor bite inhibition.' },
    { term: 'Obligate carnivore', def: 'Must eat animal protein to obtain certain nutrients (taurine, arginine, vitamin A). Cats + ferrets. Cannot survive on plant-only diets.' },
    { term: 'Crepuscular', def: 'Most active at dawn + dusk. Cats, rabbits, ferrets. Explains the 5 AM "zoomies" of indoor cats.' },
    { term: 'Brachycephalic', def: 'Short-skulled breeds (pugs, bulldogs, Persians). Often have breathing problems (BOAS), eye problems, dental crowding, inability to thermoregulate. Result of selective breeding for "cute" features.' },
    { term: 'AAFCO statement', def: '"Complete and balanced" wording on pet food labels means it meets American Association of Feed Control Officials nutrient requirements for the named life stage.' },
    { term: 'TNR (Trap-Neuter-Return)', def: 'Community cat management: trap feral cats, sterilize, vaccinate, return to colony. Reduces population over generations without killing.' },
    { term: 'Service dog vs ESA', def: 'Service dog = task-trained for a disability (ADA: full public access). Emotional support animal = comfort by presence (FHA + sometimes DOT only; no public access).' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5: MYTHS BUSTED (sourced corrections)
  // ─────────────────────────────────────────────────────────
  var MYTHS = [
    { myth: '"You need to be the alpha to control your dog."',
      truth: 'Dominance theory was based on captive-wolf studies that don\'t apply to dogs. L. David Mech (the researcher whose work popularized "alpha wolf") spent decades trying to retract the term. Wild wolf packs are FAMILIES, not status hierarchies. Dogs train best with cooperative reinforcement — not by you "being alpha."',
      source: 'Mech 2000 ("Alpha Status, Dominance, and Division of Labor in Wolf Packs") + AVSAB position statement on dominance' },
    { myth: '"Pit bulls have locking jaws."',
      truth: 'Anatomically false. No dog breed has a jaw-locking mechanism — pit-bull-type skulls and jaw muscles are built like every other dog\'s, and no anatomist has ever found a locking structure. Bite force is comparable to other dogs of similar size. (You\'ll see confident PSI rankings passed around — 235 for a pit bull, 328 for a Rottweiler, 552 for a Mastiff. Those trace to a single television demonstration with a handful of dogs, not a controlled study, so cite them as trivia rather than data.) Behaviour is far more individual than breed-determined, which is why breed-specific legislation has repeatedly failed to reduce bite rates.',
      source: 'AVMA literature review on dog bite risk + AVSAB position statement on breed-specific legislation' },
    { myth: '"Cats can\'t be trained."',
      truth: 'Cats train readily with positive reinforcement — they just don\'t train via social pressure (don\'t care if you\'re disappointed). Use food rewards, short sessions, and target training. Cats can learn sit, high-five, recall, target-touch, even agility. Karen Pryor + John Bradshaw both detail this.',
      source: 'Bradshaw 2013 + Pryor "Reaching the Animal Mind"' },
    { myth: '"Rabbits are easy starter pets for kids."',
      truth: 'Rabbits are arguably the WORST starter pet. Prey-animal nature makes them stress-fragile. They live 8–12 years, need pair bonding, dedicated rabbit-savvy vet care (often >2x dog/cat costs), large enclosures (cages = inhumane), and don\'t generally enjoy being held. House Rabbit Society advises against rabbits for households with young children.',
      source: 'House Rabbit Society + AVMA Companion Animal' },
    { myth: '"Tail wagging means a happy dog."',
      truth: 'Tail wagging means AROUSAL — could be happy, anxious, fearful, or about-to-bite. Read full body language: loose body + soft eyes + relaxed mouth = happy. Stiff body + hard eyes + closed mouth + slow high wag = warning. Whale-eye (whites showing) = fear/discomfort, not playfulness.',
      source: 'AVSAB + Yin "Low Stress Handling"' },
    { myth: '"You can\'t teach an old dog new tricks."',
      truth: 'Adult and senior dogs learn just fine — sometimes BETTER than puppies because they have longer attention spans + impulse control. Cognitive enrichment is medically recommended for senior dogs to slow age-related cognitive dysfunction (canine analog of dementia).',
      source: 'AAHA Senior Care Guidelines' },
    { myth: '"Indoor cats are bored / cruel to keep inside."',
      truth: 'Indoor cats live substantially longer on average — outdoor access adds traffic, fights, predators, and infectious disease. (The popular "2–5 years outdoors" number is shakier than it sounds; it leans on feral-colony data rather than owned cats, so treat the direction as solid and the multiplier as rough.) Free-roaming cats also kill an estimated 1.3–4 BILLION birds and 6.3–22.3 BILLION mammals a year in the US — a wide range, midpoint ~2.4 billion birds, and mostly attributable to unowned cats. Solution = indoor cats + environmental enrichment (vertical space, food puzzles, window perches, leash-walking, catios). Bored ≠ outside-only fix.',
      source: 'Loss et al. 2013 (Nature Communications) + American Bird Conservancy + AVMA' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 6: CAREER PATHWAYS — animal careers from trade to PhD
  // ─────────────────────────────────────────────────────────
  var CAREER_PATHS = [
    { id: 'vet', icon: '🩺', title: 'Veterinarian (DVM/VMD)',
      salary: '~$110,000 median (2024 BLS)',
      growth: '+19% projected through 2032',
      edu: '4-year DVM after undergrad pre-vet. Highly competitive (~12% admit rate at most schools). State licensure exam (NAVLE).',
      where: 'Maine: Tufts Cummings + Cornell are the closest DVM programs. Dr. Rebecca Hodshon (UMaine pre-vet advising).',
      tags: ['professional', 'doctorate', 'clinical'] },
    { id: 'vetTech', icon: '💉', title: 'Veterinary technician (CVT/RVT/LVT)',
      salary: '~$38,000 median',
      growth: '+20% projected — fastest-growing animal career',
      edu: '2-year AAS in Veterinary Technology + VTNE exam + state credential.',
      where: 'Maine: York County Community College, Northern Maine CC (online/hybrid options too).',
      tags: ['trade', 'AAS', 'clinical'] },
    { id: 'caab', icon: '🧠', title: 'Certified Animal Behaviorist (CAAB / ACAAB)',
      salary: '$50,000–120,000 (varies by clientele)',
      growth: 'High demand; only ~70 CAABs total in North America',
      edu: 'PhD in animal behavior (CAAB) OR Master\'s + supervised practice (ACAAB). Animal Behavior Society credentials.',
      where: 'Universities + private behavior consultancy. Often paired with veterinary practice for severe cases.',
      tags: ['research', 'PhD-track', 'clinical+academic'] },
    { id: 'ccpdt', icon: '🦮', title: 'Certified Dog Trainer (CCPDT-KA / KSA)',
      salary: '$30,000–70,000 (group classes vs private)',
      growth: 'Steady; pet-population-driven',
      edu: 'No degree required. CCPDT exam + 300 hours documented training experience. KPA-CTP and IAABC are also respected paths. Avoid "certifications" from for-profit board-and-train chains.',
      where: 'Independent business or partnerships with shelters / vets. Maine: humane societies often hire trainers.',
      tags: ['cert-driven', 'self-employed-friendly'] },
    { id: 'wildlifeRehab', icon: '🦅', title: 'Wildlife rehabilitator',
      salary: 'Often volunteer or stipend; staff positions $25–40K',
      growth: 'Limited paid roles; high volunteer demand',
      edu: 'State permit (Maine: IFW issues permits; rabies-vector-species permits separate). Apprenticeship with licensed rehabber.',
      where: 'Maine: Avian Haven (Freedom), Center for Wildlife (Cape Neddick), Wind Over Wings.',
      tags: ['cert-driven', 'volunteer-heavy', 'field'] },
    { id: 'shelter', icon: '🏠', title: 'Shelter manager / animal welfare director',
      salary: '$45,000–80,000',
      growth: 'Steady',
      edu: 'BS often required. CAWA (Certified Animal Welfare Administrator) credential. Operations + management experience.',
      where: 'Maine: Animal Refuge League of Greater Portland, Bangor Humane Society, Coastal Humane Society.',
      tags: ['professional', 'BS+', 'mgmt'] },
    { id: 'lab', icon: '🔬', title: 'Laboratory animal veterinarian (DACLAM)',
      salary: '$120,000–180,000+',
      growth: 'Steady; specialized',
      edu: 'DVM + 3-yr residency in laboratory animal medicine + ACLAM board certification.',
      where: 'Universities + biotech + pharma. Jackson Lab in Bar Harbor is a major Maine employer.',
      tags: ['professional', 'doctorate+residency'] },
    { id: 'marine', icon: '🐬', title: 'Marine mammal trainer',
      salary: '$30,000–55,000',
      growth: 'Limited number of positions; very competitive',
      edu: 'BS in biology / animal science + extensive volunteer hours. Strong swimming + SCUBA helpful. IMATA certification path.',
      where: 'Aquariums + marine parks. Some research stations.',
      tags: ['BS+', 'apprenticeship-heavy', 'physical'] }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 7: TAKE ACTION — concrete steps across 4 scales
  // ─────────────────────────────────────────────────────────
  var TAKE_ACTION = {
    home: [
      { id: 'enrichment', icon: '🧩', what: 'Add daily enrichment for your existing pets',
        how: 'Food puzzles, scent work, training sessions (5 min beats 30), window perches for cats, foraging toys for parrots. Boredom drives most "bad" pet behavior.',
        impact: 'A puzzle-fed cat / dog has measurably lower stress hormones (Ellis 2009, J Feline Med Surg).',
        url: null },
      { id: 'firstAid', icon: '🚑', what: 'Memorize ASPCA Animal Poison Control: (888) 426-4435',
        how: 'Save the number in your phone NOW. $95 consult fee, available 24/7. Faster than driving to ER for many ingestions.',
        impact: 'The 30 seconds you save by knowing exactly who to call can change the outcome.',
        url: 'https://www.aspca.org/pet-care/animal-poison-control' },
      { id: 'tickPrevention', icon: '🕷️', what: 'Year-round tick prevention for any dog spending time outside',
        how: 'Talk to your vet about oral (NexGard, Bravecto, Credelio, Simparica) vs topical (Frontline). Adult ticks active any day above ~40°F — Maine winter is NOT a safety period.',
        impact: 'Lyme + anaplasmosis hit Maine dogs hard. Prevention costs ~$15–20/mo; treatment for chronic Lyme costs hundreds.',
        url: 'https://www.maine.gov/dhhs/mecdc/infectious-disease/epi/vector-borne/lyme/' }
    ],
    school: [
      { id: 'classpet', icon: '🐹', what: 'Advocate for thoughtful classroom-pet decisions',
        how: 'Most "classroom pets" (hamsters in tiny cages, untouched fish) suffer. Better: aquarium with appropriate species + filtration, or partner with a local shelter for read-to-shelter-cats programs.',
        impact: 'A classroom that gets animal welfare right teaches it; one that gets it wrong teaches that, too.',
        url: null },
      { id: 'shelterVisit', icon: '🏫', what: 'Organize a humane-society visit or guest speaker',
        how: 'Contact Animal Refuge League of Greater Portland or your local Maine humane society. Most have education programs designed for K-12 visits.',
        impact: 'Hands-on connection to real shelter work changes how kids think about pets-as-products.',
        url: 'https://arlgp.org/community/education/' }
    ],
    community: [
      { id: 'foster', icon: '🏠', what: 'Foster instead of adopt',
        how: 'Lower commitment than adoption; saves shelter space; helps animals decompress in a home environment. Shelters provide food, vet care, supplies.',
        impact: 'Maine shelter overcrowding spikes in summer. A 2-week foster slot literally saves a life.',
        url: 'https://arlgp.org/foster/' },
      { id: 'tnr', icon: '🐈', what: 'Support / volunteer for TNR programs',
        how: 'Trap-Neuter-Return is the only humane + effective community-cat management tool. Maine: SpayMaine (mobile clinic) and most county humane societies run TNR support.',
        impact: 'A single un-spayed feral female + her descendants can produce 100+ cats in 7 years.',
        url: 'https://www.spaymaine.org/' },
      { id: 'shelterNotStore', icon: '⛔', what: 'Adopt-don\'t-shop (and know why)',
        how: 'Pet-store puppies almost universally come from puppy mills (USDA-licensed but minimum-standards). Mills produce purebreds + designer mixes. Reputable breeders don\'t sell to stores.',
        impact: 'Maine has multiple puppy-mill rescue cases per year. Demand drives supply.',
        url: 'https://www.humanesociety.org/all-our-fights/stopping-puppy-mills' }
    ],
    civic: [
      { id: 'breedNeutral', icon: '🏛️', what: 'Advocate for breed-neutral housing + insurance laws',
        how: 'Many landlords + insurers ban "pit bull-type" dogs based on appearance alone. AVMA, ASPCA, and CDC all oppose breed-specific legislation as ineffective + unjust.',
        impact: 'Breed bans separate families from beloved pets and drive shelter intake.',
        url: 'https://www.avma.org/resources-tools/avma-policies/dangerous-animal-legislation' },
      { id: 'puppyMill', icon: '✉️', what: 'Contact your Maine legislators about pet-store sourcing',
        how: 'Maine LD 1432 (passed 2023) restricts pet-store dog sales but enforcement gaps remain. Find your rep at legislature.maine.gov; ask about ongoing animal-welfare bills.',
        impact: 'Most Maine legislators get few constituent contacts on animal-welfare bills. Yours stands out.',
        url: 'https://legislature.maine.gov' }
    ]
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 7.5: FAMOUS ANIMALS IN SCIENCE
  // Cultural + scientific resonance — these are the animals whose names
  // students will encounter in textbooks, news, museums.
  // ─────────────────────────────────────────────────────────
  var FAMOUS_ANIMALS = [
    { id: 'pavlov', tag: 'science', icon: '🐕', name: 'Pavlov\'s dogs',
      where: 'Ivan Pavlov\'s lab, St. Petersburg · 1890s–1903 · Nobel Prize 1904 (digestion)',
      story: 'While studying salivary digestion, Pavlov noticed dogs salivated to the lab assistants\' footsteps before food arrived. He systematically paired a bell with food → dogs eventually salivated to the bell alone. Foundation of CLASSICAL conditioning. (Pavlov never used a bell as much as folklore says — metronomes, tones, light.)' },
    { id: 'skinner', tag: 'science', icon: '🕊️', name: 'Skinner\'s pigeons',
      where: 'B.F. Skinner\'s Harvard lab · 1940s–1970s',
      story: 'Skinner used pigeons in operant chambers ("Skinner boxes") to demonstrate reinforcement schedules — fixed/variable ratio + interval. Project Pigeon (WWII) trained pigeons to pilot guided missiles by pecking at targets through a window. Project was funded but never deployed.' },
    { id: 'alex', tag: 'cognition', icon: '🦜', name: 'Alex the African Grey',
      where: 'Irene Pepperberg lab, Purdue/Brandeis/Harvard · 1977–2007',
      story: 'Demonstrated ABSTRACT concepts (same / different, bigger / smaller, color, shape, number to 6, even zero) through ~30 years of training. His vocabulary topped 100 words, used in context. His last words to Pepperberg: "You be good. See you tomorrow. I love you."' },
    { id: 'koko', tag: 'cognition', icon: '🦍', name: 'Koko the gorilla',
      where: 'Francine Patterson, The Gorilla Foundation · 1971–2018',
      story: 'Western lowland gorilla taught American Sign Language. Working vocabulary ~1,000 signs; understood ~2,000 spoken English words. Famous for kitten "All Ball" and emotional responses to others\' grief. Findings remain debated — was it true language or trained associations? Even the debate raised the bar for animal cognition research.' },
    { id: 'endal', tag: 'service', icon: '🦮', name: 'Endal the Labrador',
      where: 'Allen Parton (UK Royal Navy veteran with brain injury) · 1997–2009',
      story: 'Trained service dog who learned 100+ tasks: card-key insertion at hotels, recovery position when handler had a fit, calling 999 (UK 911) by pressing a phone button. Featured in "Dog of the Millennium" award (BBC). One of the most documented examples of how task-trained service dogs extend a handler\'s independence.' },
    { id: 'hachiko', tag: 'culture', icon: '🐕', name: 'Hachikō the Akita',
      where: 'Tokyo · 1923–1935',
      story: 'Met his owner Professor Ueno at Shibuya Station every evening. After Ueno died at work in 1925, Hachikō continued to wait at the station every day for ~10 years until his own death. Bronze statue at Shibuya Station is one of Tokyo\'s landmarks. The story (and his tissue samples studied posthumously) shaped attachment-research thinking about dog-human bonds.' },
    { id: 'balto', tag: 'service', icon: '🐺', name: 'Balto + Togo (Iditarod precursors)',
      where: '1925 Serum Run · Nome, Alaska',
      story: 'A diphtheria outbreak threatened Nome\'s children; antitoxin was 674 miles away in winter conditions. A relay of 20 mushers + ~150 sled dogs delivered the serum in 5.5 days. Balto led the final leg into Nome (statue in Central Park). Togo, who led the longest + most dangerous leg under Leonhard Seppala, was historically under-credited — recent reappraisals give him equal billing.' },
    { id: 'stubby', tag: 'service', icon: '🐶', name: 'Sergeant Stubby',
      where: 'WWI · US Army 102nd Infantry · 1917–1918',
      story: 'Stray Boston Terrier mix who became the most decorated war dog of WWI. Detected gas attacks, located wounded soldiers, captured a German spy. Awarded multiple medals + met three US Presidents. Buried at the Smithsonian. The first dog to be promoted to sergeant in the US military.' },
    { id: 'belyaev', tag: 'science', icon: '🦊', name: 'Belyaev\'s silver foxes',
      where: 'Soviet Institute of Cytology and Genetics, Novosibirsk · 1959–present',
      story: 'Geneticist Dmitry Belyaev selected silver foxes for ONE trait: tameness around humans. Within ~10 generations, foxes started showing all the classic "domestication syndrome" traits: floppy ears, curly tails, piebald coats, smaller adrenals, longer reproductive seasons. Demonstrated that selection for behavior alone drags physical traits along genetically. Still ongoing 65+ years later.' },
    { id: 'cher-ami', tag: 'service', icon: '🕊️', name: 'Cher Ami the carrier pigeon',
      where: 'WWI · US Army Signal Corps · 1918',
      story: 'Carrier pigeon who delivered a critical message from the trapped "Lost Battalion" of the 77th Division. Shot through the chest, blinded, with a leg nearly severed, she still completed the 25-mile flight in 25 minutes — saving ~194 American soldiers. Awarded the French Croix de Guerre. Mounted body still on display at the Smithsonian.' }
  ];
  var FAMOUS_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'science', label: '🔬 Science' },
    { id: 'cognition', label: '🧠 Cognition' },
    { id: 'service', label: '🦮 Service' },
    { id: 'culture', label: '🌍 Culture' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 7.6: AI PRACTICE SCENARIOS + GROUND-TRUTH RUBRICS
  // 6 design scenarios. AI critique constrained by AI_GROUND_TRUTH list
  // so AI cannot hallucinate beyond the science taught in this tool.
  // ─────────────────────────────────────────────────────────
  var AI_SCENARIOS = [
    { id: 'family-pick', icon: '👨‍👩‍👧',
      title: 'Family pet selection',
      prompt: 'A family is considering their first pet. Two kids (ages 4 and 7), a parent with mild cat allergies, an apartment in Portland ME, both parents work 9–5. Budget is moderate. They\'re drawn to "a cute small dog" they saw on Instagram. Help them think through this honestly.',
      rubric: [
        'Acknowledges the cat-allergy + apartment + work-hours constraints',
        'Considers a small dog HONESTLY (still needs daily walks, training, ~$1500–2500/yr; alone-time challenge with both parents working)',
        'Considers alternatives that might fit better (guinea pig pair, fish tank, rabbit pair if they can do exotic-vet costs, pursuing the dog plan with specific accommodations)',
        'Mentions that "cute on Instagram" is a poor selection criterion and asks what they\'ve actually researched',
        'Suggests concrete next steps (visit shelter, talk to allergist, meet specific breeds in person)'
      ],
      hint: 'Don\'t just say "no dog." A good response respects their interest while making the tradeoffs visible. Sometimes the right answer is "wait until X changes" or "yes-with-these-adjustments."' },
    { id: 'service-match', icon: '♿',
      title: 'Service dog exploration for a peer',
      prompt: 'A 14-year-old classmate with type 1 diabetes + occasional unpredictable seizure breakthroughs is asking their family about getting a diabetic-alert service dog. Their parents are skeptical ("just buy a CGM"). The classmate asks for your help thinking it through.',
      rubric: [
        'Distinguishes diabetic-alert dog vs medical-alert task vs ESA vs therapy animal correctly',
        'Acknowledges that CGM (continuous glucose monitor) and a service dog are NOT mutually exclusive — both can be part of a diabetes-care plan',
        'Notes the cost + commitment reality (DAD program waitlists are 2–5 years; placement costs $20–50K; lifespan 8–12 yr)',
        'Mentions seizure-alert science: predictive ability is real but variable; some dogs alert reliably, others don\'t',
        'Suggests connecting with disability + diabetes organizations (ADA + JDRF + Diabetes Alert Dog programs like Can Do Canines)'
      ],
      hint: 'A service dog is not a replacement for a CGM, and vice versa. The honest framing helps the classmate avoid framing it as either-or in a parent conversation.' },
    { id: 'cat-litter', icon: '🐈',
      title: 'Cat behavior crisis',
      prompt: 'Your friend\'s 5-year-old indoor cat has started peeing OUTSIDE the litter box for the past 2 weeks. They\'re thinking about rehoming the cat. Walk them through what to actually do.',
      rubric: [
        'FIRST recommends a vet visit to rule out UTI, crystals, FLUTD — sudden behavior change in cats is medical until proven otherwise',
        'After medical clearance, considers stress / environmental triggers (new pet, new schedule, litter brand change, dirty box, box location)',
        'Litter-box rules: number of boxes = cats + 1; daily scooping; uncovered + low-sided for older cats; quiet location',
        'Advises against punishment / yelling — increases stress + makes elimination problems worse',
        'Mentions that rehoming for litter problems is a common and tragic shelter intake reason — almost always solvable with vet + management'
      ],
      hint: 'Vet first. Don\'t skip it. ~60% of "behavior" cases in cats turn out to have a medical driver.' },
    { id: 'rabbit-stasis', icon: '🐰',
      title: 'Rabbit emergency triage',
      prompt: 'Your friend texts you at 9 PM: "My rabbit hasn\'t eaten anything since this morning and is just sitting hunched in the corner. Should I just wait until morning to call the vet?"',
      rubric: [
        'Identifies this as a likely GI STASIS emergency — life-threatening within hours',
        'Says GO TO AN EMERGENCY EXOTIC VET TONIGHT, not wait for morning',
        'Notes that rabbit GI is fragile + bacteria overgrowth happens fast when motility stops',
        'Tells friend to bring fresh hay + water on the trip (some vets OK gut-stim massage but only if vet-trained)',
        'Provides Maine-specific pointer if possible — most regular vets don\'t do exotics; refer to a real exotic-vet clinic'
      ],
      hint: 'Rabbit GI stasis is the equivalent of a heart attack timing. Hours matter. "Wait until morning" is the wrong answer.' },
    { id: 'parrot-tiktok', icon: '🦜',
      title: 'Talking your friend out of a TikTok parrot',
      prompt: 'Your neighbor wants to buy a baby cockatoo from a local breeder because they keep going viral on TikTok. They have a 1-bedroom apartment, work 50-hour weeks, and admit they "don\'t really know much about birds." Help them think this through.',
      rubric: [
        'States the lifespan reality clearly: cockatoos live 50–80 years — outliving most owners; rehoming is the rule, not exception',
        'Notes the noise + mess reality (cockatoos are LOUD; landlord + neighbor problems are routine)',
        'Mentions the time + attention need: highly social birds, will scream/pluck when ignored',
        'Brings up the Teflon + scented-candle + smoke risks — kitchen overlap with bird = potential death',
        'Suggests alternatives: budgie or cockatiel (smaller, shorter-lived, quieter), or fostering through an avian rescue first'
      ],
      hint: 'Cockatoos are arguably the most surrendered companion bird species precisely because of the gap between TikTok-cuteness and real-life demands.' },
    { id: 'senior-dog', icon: '👴',
      title: 'Senior dog cognitive change',
      prompt: 'Your family\'s 14-year-old labrador-mix has started sleeping more than usual, sometimes seems lost in the kitchen at night, and pees on the floor occasionally even though she\'s house-trained. Your dad says "she\'s just old." Help your family think about this better.',
      rubric: [
        'Identifies these signs as possible Canine Cognitive Dysfunction (CCD) — the dog version of dementia',
        'Recommends vet visit FIRST to rule out medical causes (kidney disease, diabetes, UTI, arthritis, vision loss)',
        'Mentions that early intervention with diet (Hill\'s b/d, Purina Bright Mind), supplements (SAMe, antioxidants), enrichment, and possibly anti-anxiety meds can slow progression',
        'Notes that "she\'s just old" while sometimes true, often misses treatable conditions in seniors',
        'Acknowledges the harder conversation: as a 14-yo Lab she\'s past average lifespan, and quality-of-life planning is appropriate even if she has more years'
      ],
      hint: 'Senior pets get a lot of "she\'s just old" dismissal. Many "old age" symptoms are partially treatable, and intervention now extends both lifespan + quality.' }
  ];
  var AI_GROUND_TRUTH = [
    'Dogs: 15,000–40,000 years from Pleistocene wolf. Olfactory ~300M receptors vs 5M human. Lifespan inversely correlated with size (small 14–16 yr; giant 6–8 yr).',
    'Cats: obligate carnivores requiring taurine, vitamin A, arginine, arachidonic acid from animal protein. Indoor cats live 12–18 yr; cats with outdoor access die younger, though the widely-quoted "outdoor 2–5" figure is rough and leans on feral-colony data rather than owned cats.',
    'Rabbits: GI stasis is a TRUE EMERGENCY (hours matter). Need exotic-savvy vet. House Rabbit Society advises against rabbits for households with young children.',
    'Birds: respiratory air-sac anatomy makes them sensitive to PTFE/Teflon, aerosols, scented candles, smoke. Cockatoos + macaws live 50–80 years.',
    'Reptiles: ALL shed Salmonella. CDC: no reptiles in households with children under 5. Husbandry (UVB + heat gradient) is most reptile-death cause.',
    'Service dog (ADA): individually task-trained for a disability; full public access; only 2 questions allowed (1) is it a service animal because of a disability (2) what task. ESA: comfort by presence; FHA only; no public access. Therapy: visit-based, no automatic access.',
    'Toxic to dogs: chocolate (theobromine), grapes/raisins, xylitol, onions/garlic, macadamia. Toxic to cats: lilies (any part), onions/garlic. Toxic to birds: avocado, Teflon fumes.',
    'ASPCA Animal Poison Control: (888) 426-4435 ($95 24/7). Pet Poison Helpline: (855) 764-7661.',
    'Maine: among the top few US states for Lyme + anaplasmosis incidence, trading the lead year to year with Vermont and New Hampshire — do not assert a flat national #1. Year-round tick prevention is standard veterinary care. ARLGP, Bangor Humane, Avian Haven are major Maine resources.',
    'Operant theory (covered in BehaviorLab): positive reinforcement is primary modality; AVSAB + AVMA oppose dominance-based / punishment-based training.',
    'NEVER recommend specific medications, dosages, or procedures — refer to a veterinarian.',
    'NEVER suggest rehoming a pet without first ruling out medical + manageable behavioral causes.'
  ];

  // ─────────────────────────────────────────────────────────
  // WELFARE & ETHICS DATA — 4 pillars: spay/neuter, adoption,
  // declawing, outdoor cats. Welfare-science voice; sources inline.
  // ─────────────────────────────────────────────────────────
  var WELFARE_DATA = {
    spayNeuter: {
      icon: '✂️', label: 'Spay & Neuter',
      lead: 'Surgical sterilization (spay = ovaries/uterus removed; neuter = testicles removed) is the highest-leverage thing an owner can do for population welfare AND individual-pet welfare.',
      health: [
        { species: 'Female dogs / cats', benefit: 'Spaying before first heat reduces mammary cancer risk dramatically (≈0.5% if spayed before 1st heat vs ≈26% later for dogs). Eliminates risk of pyometra (life-threatening uterine infection) and ovarian cancer.' },
        { species: 'Male dogs / cats', benefit: 'Eliminates testicular cancer risk. Reduces prostate disease in dogs. Reduces FIV transmission in cats (driven by unneutered males roaming + fighting).' },
        { species: 'Rabbits', benefit: 'Female rabbits have ~80% rate of uterine cancer by age 5 if not spayed (House Rabbit Society). Spaying is medical necessity, not optional.' }
      ],
      behavior: [
        'Reduced roaming (intact dogs + cats roam farther seeking mates → traffic + fight injuries)',
        'Reduced inter-male aggression (especially in cats; fewer abscesses, fewer FIV transmissions)',
        'Reduced urine marking in male cats (a primary intake-to-shelter reason)',
        'No more heat cycles in females (no yowling, no blood, no mating attempts)'
      ],
      timing: 'Traditional age: 6 months. Modern guidance varies: AAFP recommends 5 months for cats; AVMA + 2013 large-breed dog research suggests waiting until skeletal maturity (12-18 mo) for some giant breeds. Talk to your vet about timing for your specific animal.',
      math: 'One unspayed female cat + her descendants can produce hundreds of kittens within 7 years if all survive and reproduce. Most of those kittens will end up in shelters or as ferals. Use the calculator below to see the compounding.',
      cost: 'Spay/neuter is far cheaper than treating one accidental pregnancy or one mammary tumor or one pyometra. Many programs offer low-cost or free service.',
      maine: 'SpayMaine (mobile clinic, statewide) — spaymaine.org. Animal Refuge League of Greater Portland — sliding scale. ASPCA national database for low-cost programs near you.',
      cite: 'AVMA position statement 2018 · AAFP guideline 2017 · House Rabbit Society · ASPCA spay/neuter database'
    },
    adoption: {
      icon: '🏠', label: 'Adopt-don\'t-shop',
      lead: 'About 6.3 million companion animals enter US shelters every year. Roughly 920,000 are euthanized annually — down from 2.6 million in 2011 thanks to the rise of adoption + spay/neuter (ASPCA 2024). Every adoption is one less.',
      whyAdopt: [
        '🐾 Adoption literally saves a life. Shelter intake exceeds capacity in most US shelters seasonally.',
        '💰 $50–$300 typical adoption fee vs $1,500–$3,500 from a breeder; usually includes spay/neuter, vaccines, microchip.',
        '👀 Adult dogs and cats from shelters come pre-evaluated for temperament, health, and household fit. Less surprise than a 9-week puppy.',
        '🧬 Mixed-breed dogs (≥50% of shelter dogs) tend to have FEWER concentrated genetic disorders than closed-studbook purebreds (see Genetics tile).',
        '🧑‍🤝‍🧑 You\'re directly relieving overcrowding — fostering or adopting opens a kennel slot for the next animal.'
      ],
      breedSpecificRescues: 'If you genuinely need a specific breed (allergies, working role, household constraint), breed-specific rescues exist for almost every breed. Search "[breed] rescue" or use Petfinder\'s breed filter. About a quarter of shelter dogs are purebred.',
      whenBreederIsOK: [
        'Working dogs requiring specific genetic traits (livestock guardians, service-dog candidates from purpose-bred lines, herding stock)',
        'Documented severe allergies AND specific breed coat type tested (allergens are dander/saliva, not just hair — testing matters)',
        'A specific medical or accessibility need that requires a particular size + temperament profile not reliably available in shelters'
      ],
      reputableBreederChecklist: [
        '✓ OFA / CHIC health testing on parent dogs (hips, elbows, eyes, heart, breed-specific genetic conditions)',
        '✓ Will let you visit the home / kennel and meet the dam (mother)',
        '✓ Asks YOU questions — about lifestyle, fence, plans for vet care, willingness to return the dog',
        '✓ Lifetime takeback policy: you return the dog to them, no questions asked, if you ever can\'t keep it',
        '✓ Doesn\'t sell to pet stores or third parties',
        '✓ Doesn\'t breed multiple breeds at high volume (red flag: "rare colors," "miniature" of breeds that aren\'t naturally small)',
        '✓ Lets puppies stay with mom + littermates until at least 8 weeks (not 6 — that\'s a backyard breeder cue)'
      ],
      cite: 'ASPCA Pet Statistics 2024 · Best Friends Animal Society 2025 · HSUS Pets by the Numbers · Petfinder shelter directory'
    },
    declawing: {
      icon: '⚠️', label: 'Declawing — what it actually is',
      lead: 'Declawing (onychectomy) is NOT trimming or removing nails. It is the surgical AMPUTATION of the third phalanx — the last bone of each toe. The human equivalent is amputating every finger at the last knuckle.',
      anatomicalTruth: 'In a healthy cat, the claw is part of the bone — claws can\'t be "removed" without amputating the bone they\'re attached to. The standard surgical method severs the third phalanx (P3) at the joint with the second phalanx, using either a guillotine clipper, a scalpel disarticulating each joint, or a CO₂ laser. In all methods, the cat permanently loses the last segment of every toe.',
      pain: 'Pain is acute post-op and often becomes chronic. A 2018 study (Martell-Moran, JFMS) found that declawed cats had 3× the rate of long-term back/limb pain and 7× the rate of unwanted behaviors compared to clawed cats. Bone chips left from imperfect surgery can cause lifelong neuropathic pain.',
      behaviorConsequences: [
        '↑ Biting (claws were the primary defense — bite becomes the only option)',
        '↑ Litter box avoidance (sand on amputation sites is painful → cat associates the box with pain → pees elsewhere → often surrendered to shelter)',
        '↑ Aggression toward humans + other pets',
        '↓ Climbing + healthy stretching (toes can\'t grip; balance permanently altered)'
      ],
      vetConsensus: 'Opposed by AVMA (updated 2020), AAFP (Position Statement 2017), AVA (Australia), BSAVA (UK), CVMA (Canada), and the Cat Friendly Practice program. Banned in most of the EU, Israel, the UK, Australia, New Zealand, and Brazil. Banned in NY (2019), MD (2022), Pittsburgh, Denver, San Francisco, LA, and several other US cities.',
      alternatives: [
        '🪵 Tall vertical scratching posts + horizontal scratchers (cats scratch to mark territory + maintain claws — they NEED to scratch; provide many surfaces in different orientations)',
        '✂️ Regular nail trims (every 2–3 weeks; takes 30 seconds with a sharp clipper once the cat is acclimated)',
        '🧢 Soft Paws / Soft Claws (vinyl nail caps glued on; last 4–6 weeks; no pain, no surgery)',
        '🎯 Positive-reinforcement training (treat-reward when cat uses the post; never punish when they scratch furniture — instead remove + redirect)',
        '🛋️ Furniture-protection strategies (double-sided tape, foil, citrus scent on couches you want protected; aluminum foil deters most cats)'
      ],
      cite: 'AVMA position statement (2020) · AAFP Position Statement (2017) · Patronek 2001 (J Am Vet Med Assoc) · Martell-Moran et al. 2018 (J Feline Medicine and Surgery) · Curcio 2006'
    },
    outdoorCats: {
      icon: '🐦', label: 'Outdoor cats and wildlife',
      lead: 'Free-roaming domestic cats (owned cats let outdoors + stray + feral) are the single largest direct human-caused source of wild bird mortality in the United States — ahead of building strikes, vehicles, and wind turbines combined.',
      data: 'Loss et al. 2013 (Nature Communications, Smithsonian Migratory Bird Center): free-roaming cats kill 1.3–4 billion birds and 6.3–22.3 billion mammals per year in the US alone. Conservative midpoint: 2.4 billion birds. Cats are the #1 direct source of bird mortality from human activity.',
      whyItMatters: 'Domestic cats are an introduced predator on every continent except Antarctica. Native bird species evolved without ground predators of cats\' size, agility, and abundance. Cats hunt regardless of whether they\'re fed at home — predation is instinct, not hunger. Bell collars reduce kills by ~30–50% but don\'t eliminate them.',
      ownCatLifespan: 'Indoor cats commonly reach 12–18 years, and cats with outdoor access die younger — that direction is not seriously disputed. Be careful with the widely-quoted "2–5 years outdoors" figure, though: it comes largely from unowned and feral colony data, not from owned cats let out during the day, and it circulates in advocacy material more than in peer-reviewed studies. The mechanisms are what\'s solidly established: traffic (a large share of outdoor-cat deaths in suburban areas), predation (coyotes, owls, fishers in Maine, larger dogs), parasites (fleas, ticks, intestinal worms, FIV/FeLV transmitted in fights), poisoning (antifreeze, secondary rodenticide), weather, and theft.',
      tnrControversy: 'Trap-Neuter-Return (TNR) sterilizes existing feral colonies. AVMA + most major shelters support TNR as the only humane large-scale tool for already-established colonies. American Bird Conservancy + National Audubon argue TNR alone doesn\'t reduce predation enough fast enough to protect threatened bird species — they advocate sanctuaries / removal. Both sides are operating from real data; the disagreement is about strategy, not facts.',
      whatIndividualsCanDo: [
        '🏠 Keep owned cats indoors. The single highest-impact action.',
        '🦮 Leash-train cats (yes — see Cat training in BehaviorLab). Many cats accept harness + lead with patient training; outdoor enrichment without predation.',
        '🌿 Build a catio (enclosed outdoor patio for cats). DIY guides everywhere; ~$200–$2,000 depending on scale.',
        '🪟 Bird-window collisions: Acopian BirdSavers, FeatherFriendly decals, or hanging string curtains on outside-facing windows reduce window strikes by ~90%.',
        '🐈 Adopt a feral cat to indoor life if it\'s young enough (often possible under 6 months; harder for adult ferals).',
        '🦅 Volunteer for Maine Audubon bird counts or shorebird-monitoring (locally-relevant action).'
      ],
      maine: 'Maine Audubon — maineaudubon.org — runs bird surveys + habitat-restoration volunteer days. Birds of Maine app from Maine Audubon. Maine has ~400 native bird species; declines in grassland + shorebird species are well-documented.',
      cite: 'Loss, Will, Marra 2013 (Nat Commun) · Smithsonian Migratory Bird Center · American Bird Conservancy "Cats Indoors" initiative · Maine Audubon · Veterinary Centers of America indoor-cat lifespan data'
    }
  };

  // ─────────────────────────────────────────────────────────
  // PET-CARE WEEK SIM — daily events per species. Each event has
  // a list of choices; each choice impacts welfare meters + human
  // resources (energy, money). Realistic trade-offs, not punishment.
  // ─────────────────────────────────────────────────────────
  var CARE_SIM_DAYS = {
    dog: [
      { day: 1, label: 'Day 1 — establish the routine',
        prompt: 'It\'s the first morning with your new dog. Setting expectations now will define the next 10–15 years. What\'s your morning plan?',
        choices: [
          { id: 'full', label: 'Full routine: 30-min walk, breakfast, brief training, set up daytime enrichment',
            effects: { phys: +12, ment: +10, soc: +8, env: +6, en: -15, money: 0 },
            note: 'Strong start. Routines reduce anxiety in dogs and let you predict their needs.' },
          { id: 'quick', label: 'Quick: 10-min potty walk, food, off to my day',
            effects: { phys: +4, ment: +1, soc: +2, env: +2, en: -5, money: 0 },
            note: 'Functional but minimal. Dogs left this lightly-engaged often develop attention-seeking behaviors over time.' },
          { id: 'skip', label: 'Skip the walk — just let them in the yard',
            effects: { phys: -2, ment: -3, soc: -2, env: 0, en: -1, money: 0 },
            note: 'Yard time isn\'t a substitute for walks. Walks provide novelty + scent enrichment + mental work.' }
        ]
      },
      { day: 2, label: 'Day 2 — friend texts at walk time',
        prompt: 'A friend invites you to a movie that starts at your usual evening walk time. Walks are 45 min for your high-energy dog.',
        choices: [
          { id: 'walk_first', label: 'Walk first, meet friend after the movie',
            effects: { phys: +10, ment: +6, soc: +5, env: 0, en: -10, money: -8 },
            note: 'Pet first when their needs are time-sensitive. Friendship can flex; dog\'s bladder cannot.' },
          { id: 'morning_double', label: 'Skip evening, do a longer morning walk tomorrow',
            effects: { phys: -3, ment: -3, soc: -2, env: 0, en: -2, money: -8 },
            note: 'Compromise. Dogs handle one missed walk fine if they get extra attention; just don\'t let it become the pattern.' },
          { id: 'long_alone', label: 'Skip walk; dog is alone 6 extra hours',
            effects: { phys: -5, ment: -7, soc: -8, env: -3, en: 0, money: -8 },
            note: 'A young dog left this long without a midday break is likely to have an indoor accident — and to associate alone-time with stress.' }
        ]
      },
      { day: 3, label: 'Day 3 — anxiety signals',
        prompt: 'You notice your dog yawning, lip-licking, and pacing when you grab your bag in the morning. (See Body Language Decoder — calming signals.) What do you do?',
        choices: [
          { id: 'reduce', label: 'Lower the cue intensity — pick up bag without leaving for a few days',
            effects: { phys: 0, ment: +6, soc: +6, env: +2, en: -4, money: 0 },
            note: 'Counter-conditioning the cue. Classic separation-anxiety prep — break the chain bag → "you\'re leaving me."' },
          { id: 'kong', label: 'Give a stuffed Kong on departure',
            effects: { phys: +1, ment: +5, soc: +3, env: +2, en: -3, money: -5 },
            note: 'Kong on departure = "alone time predicts good things." Pairs nicely with the previous strategy.' },
          { id: 'ignore', label: 'It\'s probably nothing — proceed normally',
            effects: { phys: -1, ment: -4, soc: -3, env: 0, en: 0, money: 0 },
            note: 'Calming signals are early warnings. Ignored, they often progress to destruction or vocalization. Worth catching early.' }
        ]
      },
      { day: 4, label: 'Day 4 — vet bill arrives',
        prompt: 'Routine annual vet visit + shots due. The estimate is $280. Your dog also has a small lump the vet wants to aspirate ($80 add-on, peace of mind).',
        choices: [
          { id: 'all', label: 'Do everything including the aspiration',
            effects: { phys: +10, ment: +1, soc: +1, env: +1, en: -5, money: -360 },
            note: 'Lumps in middle-aged + senior dogs are usually benign, but aspiration costs $80 and rules out the bad outcome with confidence.' },
          { id: 'core_only', label: 'Just the routine visit + shots; skip the aspiration this year',
            effects: { phys: +5, ment: 0, soc: 0, env: 0, en: -3, money: -280 },
            note: 'Reasonable if budget is tight, BUT make a calendar reminder: any change in lump size = aspirate. Mast-cell tumors mimic fatty lumps.' },
          { id: 'skip', label: 'Skip vet entirely — they seem fine',
            effects: { phys: -8, ment: 0, soc: 0, env: 0, en: 0, money: 0 },
            note: 'Annual exams catch dental, weight, joint, organ, parasite, vaccine, and tumor issues early. Skipping costs more long-term.' }
        ]
      },
      { day: 5, label: 'Day 5 — pouring rain',
        prompt: 'Cold rain all day. Your dog is staring at you expectantly. What\'s the move?',
        choices: [
          { id: 'short_outside', label: 'Short walk in rain gear, then indoor enrichment + nose-work games',
            effects: { phys: +6, ment: +9, soc: +6, env: 0, en: -8, money: 0 },
            note: 'Mental work is exhausting. 15 minutes of nose-work or training equals 30+ minutes of physical exercise for tiring out a dog.' },
          { id: 'puzzle_only', label: 'Skip the walk; food puzzle + couch snuggles all day',
            effects: { phys: -2, ment: +5, soc: +5, env: +2, en: -2, money: -3 },
            note: 'Pleasant for both of you, but high-energy breeds (especially under 5 years) will be wired by evening.' },
          { id: 'nothing', label: 'Treat them like furniture today',
            effects: { phys: -4, ment: -6, soc: -5, env: -2, en: 0, money: 0 },
            note: 'Bored dogs invent jobs. Often those jobs involve your couch or your shoes.' }
        ]
      },
      { day: 6, label: 'Day 6 — vacation request',
        prompt: 'Your family is going to Boston for the weekend (Friday–Sunday). Pick the dog\'s coverage.',
        choices: [
          { id: 'kennel', label: 'Reputable boarding kennel ($55/night × 2 = $110)',
            effects: { phys: +2, ment: +2, soc: -5, env: +3, en: 0, money: -110 },
            note: 'Predictable care, supervised. Dogs miss their humans but stay healthy. Kennel cough is real — current bordetella vaccine matters.' },
          { id: 'sitter', label: 'Trusted friend stays at your house ($80 thank-you)',
            effects: { phys: +5, ment: +5, soc: +3, env: +5, en: 0, money: -80 },
            note: 'Best welfare option if the friend is reliable. Dog stays in their own environment with their own routine.' },
          { id: 'alone_visits', label: 'Friend drops by twice a day for feeds + walks ($30 thanks)',
            effects: { phys: 0, ment: -5, soc: -8, env: -3, en: 0, money: -30 },
            note: 'Cheaper, but a young/anxious dog alone overnight + most of the day will likely regress on training and may have accidents.' }
        ]
      },
      { day: 7, label: 'Day 7 — family BBQ',
        prompt: 'Your family is grilling. A guest offers your dog a chocolate brownie. What happens next?',
        choices: [
          { id: 'intercept', label: 'Politely intercept; offer guest a "dog-safe treat" to give instead',
            effects: { phys: +5, ment: +3, soc: +5, env: 0, en: -2, money: -3 },
            note: 'Theobromine in chocolate is metabolized too slowly by dogs — a brownie can be life-threatening for a small dog. You also taught the guest, kindly.' },
          { id: 'allow', label: 'Let them have it. "It\'s just a little."',
            effects: { phys: -10, ment: 0, soc: 0, env: 0, en: 0, money: -200 },
            note: 'Vet emergency call ($95–$200 advice line) likely. Dark chocolate is significantly worse than milk; smaller dogs at higher risk per gram. Chocolate is the #1 reason dogs end up in pet poison hotlines.' },
          { id: 'shoo', label: 'Just put the dog outside while you eat',
            effects: { phys: -1, ment: -3, soc: -4, env: 0, en: -1, money: 0 },
            note: 'Fine in a pinch but the dog learns that family events = exclusion. With a bit of training, dogs can lie on a mat during meals.' }
        ]
      }
    ],
    cat: [
      { day: 1, label: 'Day 1 — bringing home the cat',
        prompt: 'Your newly-adopted cat is hiding under the bed. It\'s been 4 hours.',
        choices: [
          { id: 'space', label: 'Set up food/water/litter in a quiet single room; let them come out on their own time',
            effects: { phys: +6, ment: +8, soc: +5, env: +10, en: -3, money: 0 },
            note: 'Standard shelter advice. New cats often need 3–7 days to relax. Forcing interaction triggers stress hiding for weeks.' },
          { id: 'pull', label: 'Pull them out so they get used to you',
            effects: { phys: -3, ment: -8, soc: -10, env: 0, en: -2, money: 0 },
            note: 'You\'ve set up the wrong association — your hand = trapped. Recovery takes weeks of slow re-introduction.' },
          { id: 'leave', label: 'Leave them alone all day; they\'ll figure it out',
            effects: { phys: 0, ment: -3, soc: -2, env: +2, en: 0, money: 0 },
            note: 'Better than forcing, but cats settle faster when you\'re calmly nearby (reading, working) than when the room is empty and "different" all day.' }
        ]
      },
      { day: 2, label: 'Day 2 — the litter box',
        prompt: 'You have one cat. How many litter boxes should you set up, and where?',
        choices: [
          { id: 'two', label: 'Two boxes, in two different rooms (one per cat + 1)',
            effects: { phys: +6, ment: +5, soc: +3, env: +10, en: -2, money: -25 },
            note: 'Industry standard: 1 box per cat + 1 extra. Even one cat benefits from 2 — different placements catch different urgency moments. Reduces "missing the box" surrenders dramatically.' },
          { id: 'one_quiet', label: 'One box, in the laundry room',
            effects: { phys: +2, ment: +1, soc: 0, env: +3, en: -1, money: -20 },
            note: 'Minimum acceptable. Make sure it\'s scooped daily — cats refuse dirty boxes and pee elsewhere instead.' },
          { id: 'one_corner', label: 'One box, tucked next to the dryer + furnace',
            effects: { phys: -2, ment: -3, soc: 0, env: -3, en: -1, money: -20 },
            note: 'Loud noises near the box = ambush trauma in cats\' minds. They\'ll start avoiding it.' }
        ]
      },
      { day: 3, label: 'Day 3 — outdoor temptation',
        prompt: 'Your cat is staring out the window, batting at the screen. A neighbor says "just let them out, cats love it."',
        choices: [
          { id: 'indoor_enrich', label: 'Stay indoor; add a window perch, food puzzles, daily play sessions',
            effects: { phys: +8, ment: +12, soc: +5, env: +5, en: -6, money: -40 },
            note: 'Indoor cats commonly reach 12–18 years and cats with outdoor access die younger — the popular "2–5 years" figure is rough, but the direction is well supported. See Welfare & Ethics for the bird-mortality data + your cat\'s safety.' },
          { id: 'leash', label: 'Try harness + leash training for supervised outdoor time',
            effects: { phys: +6, ment: +10, soc: +8, env: +3, en: -10, money: -25 },
            note: 'Yes, cats can be leash-trained. Takes patience but gives outdoor enrichment without predation or risk. Best of both worlds.' },
          { id: 'free_roam', label: 'Open the door; "they know where home is"',
            effects: { phys: -8, ment: +3, soc: 0, env: 0, en: 0, money: 0 },
            note: 'Owned outdoor cat lifespan ~5 years on average. They\'ll also kill an estimated dozens of birds/mammals per year. See Welfare & Ethics for the data.' }
        ]
      },
      { day: 4, label: 'Day 4 — scratching the couch',
        prompt: 'Your cat has been using the couch corner as a scratching post for two weeks. Friends are suggesting "just declaw."',
        choices: [
          { id: 'multi_post', label: 'Buy 2 tall vertical posts (sisal + cardboard) + redirect with treats',
            effects: { phys: +6, ment: +5, soc: +3, env: +6, en: -4, money: -45 },
            note: 'Cats scratch to mark + groom claws — they NEED to scratch. Provide many surfaces in different orientations. Couch cover or double-sided tape on the spot they\'re hitting now.' },
          { id: 'caps', label: 'Soft Paws nail caps + regular trims',
            effects: { phys: +3, ment: 0, soc: 0, env: +5, en: -3, money: -25 },
            note: 'Vinyl caps glue over nails for 4–6 weeks. No pain, no surgery. Pair with scratching posts so the urge has somewhere to go.' },
          { id: 'declaw', label: 'Schedule a declaw appointment',
            effects: { phys: -15, ment: -10, soc: -8, env: 0, en: 0, money: -350 },
            note: 'Declawing is amputation of the last bone of every toe (P3). AVMA + AAFP oppose. Banned in most of Europe + NY/MD. ~3× higher chronic-pain rate, 7× higher rate of biting + litter-box problems (Martell-Moran 2018). See Welfare & Ethics.' }
        ]
      },
      { day: 5, label: 'Day 5 — sudden vet visit',
        prompt: 'Your cat hasn\'t eaten in 24 hours and has been hiding more than usual. They\'re a 5-year-old indoor cat.',
        choices: [
          { id: 'vet_today', label: 'Vet appointment same day ($120 visit + $80 bloodwork)',
            effects: { phys: +12, ment: +2, soc: +2, env: 0, en: -5, money: -200 },
            note: 'Cats hide illness — appetite loss + hiding for 24+ hr is a red flag, especially in cats prone to hepatic lipidosis. Catching urinary blockage in male cats is a 24-hour emergency.' },
          { id: 'wait_24', label: 'Wait another day; offer different food',
            effects: { phys: -3, ment: 0, soc: 0, env: 0, en: 0, money: 0 },
            note: 'Risky in cats. They develop "fatty liver" (hepatic lipidosis) within 48–72 hr of food refusal — life-threatening cascade. 24 hr is the max-watch window.' },
          { id: 'wait_week', label: '"Cats are like that" — wait a week',
            effects: { phys: -15, ment: -5, soc: -3, env: 0, en: 0, money: -800 },
            note: 'You\'ll likely face an emergency vet bill (~$800–$2,000) in 2–3 days, plus risk of permanent damage. Cats hide illness as prey-animal instinct.' }
        ]
      },
      { day: 6, label: 'Day 6 — vacation: 3 days',
        prompt: 'Family weekend trip Friday–Sunday. Cat coverage:',
        choices: [
          { id: 'sitter_visits', label: 'Cat sitter twice a day ($25/visit × 6 = $150). Litter, food, play, brush.',
            effects: { phys: +5, ment: +5, soc: +3, env: +6, en: 0, money: -150 },
            note: 'Cats often handle alone-time better than dogs, but daily check-ins catch sudden illness AND maintain litter freshness so the cat doesn\'t protest-pee.' },
          { id: 'auto_feed', label: 'Auto-feeder + extra water + clean litter; check on Sunday',
            effects: { phys: -3, ment: -3, soc: -3, env: -8, en: 0, money: -60 },
            note: 'Three-day litter without scooping is gross enough that many cats stop using it. Auto-feeders fail, water bowls get knocked. Risky.' },
          { id: 'boarding', label: 'Boarding facility ($55/night × 2 = $110)',
            effects: { phys: 0, ment: -8, soc: -10, env: -3, en: 0, money: -110 },
            note: 'Cats experience boarding as significantly more stressful than dogs. Their environment IS their territory — moving them = trauma. Sitter at home is better welfare for cats.' }
        ]
      },
      { day: 7, label: 'Day 7 — guest with allergies',
        prompt: 'A friend with cat allergies is visiting for a long weekend. They\'re asking you to "just let the cat be outside while I\'m here."',
        choices: [
          { id: 'guest_room', label: 'Set up a quiet room for cat with all comforts; HEPA filter where guest sleeps',
            effects: { phys: +3, ment: +2, soc: 0, env: +4, en: -4, money: -30 },
            note: 'Cat\'s territory remains intact. Friend takes their allergy meds + uses the HEPA. Both sides of the disagreement get respected.' },
          { id: 'outside_temp', label: 'Yes, let cat outside for the weekend',
            effects: { phys: -8, ment: -5, soc: -3, env: 0, en: 0, money: 0 },
            note: 'Indoor cats unfamiliar with outdoors are at high risk of getting lost, hit, or attacked. They\'re also catching anything from outside (fleas, ticks, FIV/FeLV exposure).' },
          { id: 'reschedule', label: 'Suggest the friend stay at a hotel this trip',
            effects: { phys: +4, ment: 0, soc: -1, env: +2, en: -2, money: 0 },
            note: 'Honest answer: hosting people who can\'t share space with your pet sometimes means hotel for them. Your animal isn\'t a temporary inconvenience.' }
        ]
      }
    ],
    rabbit: [
      { day: 1, label: 'Day 1 — the cage question',
        prompt: 'Your bunny\'s pet-store cage is 30" × 18". You\'re re-doing the setup. What works?',
        choices: [
          { id: 'free_roam', label: 'Free-roam in a bunny-proofed room (cords covered, baseboards protected)',
            effects: { phys: +12, ment: +12, soc: +8, env: +8, en: -10, money: -100 },
            note: 'Best welfare. Rabbits are crepuscular athletes — they need to run + binky + dig. House Rabbit Society standard.' },
          { id: 'big_pen', label: '4×4 ft exercise pen with 3 hours daily out-of-pen time',
            effects: { phys: +6, ment: +8, soc: +5, env: +5, en: -6, money: -80 },
            note: 'Acceptable middle ground. Make sure out-of-pen time is daily and predictable.' },
          { id: 'cage', label: 'Keep the original cage',
            effects: { phys: -8, ment: -10, soc: -3, env: -8, en: 0, money: 0 },
            note: 'Pet-store cages are inhumane for rabbits — they cause foot sores ("hock disease"), aggression from confinement, and severely compressed lifespan. RSPCA + HRS both call this welfare failure.' }
        ]
      },
      { day: 2, label: 'Day 2 — diet',
        prompt: 'You\'re at the pet store. The clerk recommends a "complete rabbit kibble" diet.',
        choices: [
          { id: 'hay_first', label: 'Buy unlimited timothy hay + small pellet portion + leafy greens',
            effects: { phys: +12, ment: +5, soc: +2, env: +3, en: -3, money: -45 },
            note: 'Correct. Hay = 80% of diet. Pellets = supplement only (1/4 cup/day max for adults). Iceberg lettuce dangerous — use romaine, parsley, basil.' },
          { id: 'pellets_main', label: 'Pellets are the main meal; hay is a treat',
            effects: { phys: -10, ment: -3, soc: 0, env: 0, en: -1, money: -25 },
            note: 'Causes obesity, dental disease (rabbit teeth grow forever — they need hay\'s grinding action), and GI stasis. Surprisingly common cause of vet visits.' },
          { id: 'free_food', label: 'Free-fed pellets, occasional hay',
            effects: { phys: -12, ment: -4, soc: 0, env: 0, en: 0, money: -20 },
            note: 'GI stasis emergency likely within months. The #1 cause of rabbit ER visits. Vet bill ~$300–$1,500 if caught early; fatal if not.' }
        ]
      },
      { day: 3, label: 'Day 3 — pair bonding',
        prompt: 'Rabbits are highly social — most happiest in bonded pairs. Should you adopt a friend?',
        choices: [
          { id: 'shelter_bond', label: 'Adopt a second rabbit from a shelter; do supervised intros',
            effects: { phys: +6, ment: +12, soc: +15, env: 0, en: -8, money: -80 },
            note: 'Shelter staff often "speed-date" rabbits to find compatible pairs. Both must be spayed/neutered first. Bonding takes weeks of supervised intros — patience pays off.' },
          { id: 'solo', label: 'Keep solo; spend lots of one-on-one time instead',
            effects: { phys: 0, ment: -3, soc: -2, env: 0, en: -5, money: 0 },
            note: 'Possible if you genuinely have hours daily, but most working/school people can\'t match what another bun does. Switzerland makes solo rabbit ownership ILLEGAL for this reason.' },
          { id: 'just_add', label: 'Buy another, no introductions',
            effects: { phys: -10, ment: -5, soc: -5, env: 0, en: 0, money: -50 },
            note: 'Rabbits are territorial — unbonded buns can fight to serious injury. Introductions on neutral territory, both spayed/neutered, takes weeks.' }
        ]
      },
      { day: 4, label: 'Day 4 — spay surgery',
        prompt: 'Your female rabbit is 6 months old. The exotic vet recommends spaying. Cost estimate: $400.',
        choices: [
          { id: 'spay', label: 'Schedule the spay',
            effects: { phys: +18, ment: +3, soc: +3, env: 0, en: -5, money: -400 },
            note: 'Female rabbits have ~80% rate of uterine cancer by age 5 if not spayed (House Rabbit Society / Saunders 2003). Spay nearly eliminates this. Plus reduces aggression + spraying.' },
          { id: 'wait', label: 'Wait until she shows symptoms',
            effects: { phys: -15, ment: 0, soc: 0, env: 0, en: 0, money: -1500 },
            note: 'By the time symptoms (blood in urine, lethargy) show, cancer is often advanced + spread. Spay-now is preventive + far cheaper than later treatment.' },
          { id: 'never', label: '"She\'s a pet — why bother?"',
            effects: { phys: -25, ment: -3, soc: -3, env: 0, en: 0, money: 0 },
            note: 'Far higher cancer mortality. Also: hormones in unspayed females cause aggression + spraying that often gets rabbits surrendered. See Welfare & Ethics for the broader picture.' }
        ]
      },
      { day: 5, label: 'Day 5 — GI stasis warning',
        prompt: 'Your rabbit hasn\'t pooped in 12 hours and is hunched in the corner. (See Body Language: tooth grinding, hunched posture.) What now?',
        choices: [
          { id: 'er', label: 'Exotic vet ER visit IMMEDIATELY ($300+ overnight)',
            effects: { phys: +20, ment: +2, soc: +2, env: 0, en: -8, money: -350 },
            note: 'GI stasis (gut shutdown) is THE rabbit emergency. 12 hours without pooping = TIME-SENSITIVE. Subcutaneous fluids, motility drugs, pain control. Caught early: ~85% recovery. Caught late: high mortality.' },
          { id: 'wait_morning', label: 'Wait until morning to call',
            effects: { phys: -20, ment: -3, soc: 0, env: 0, en: 0, money: -1200 },
            note: 'You may face a much larger bill (or worse). GI stasis cascades fast. The 12-hr rule from House Rabbit Society is non-negotiable.' },
          { id: 'home_remedy', label: 'Try gentle tummy massage + offer treats',
            effects: { phys: -15, ment: -2, soc: 0, env: 0, en: -3, money: 0 },
            note: 'Massage is fine but not a treatment. Stasis usually has an underlying cause (dental, blockage, stress, poor diet). Vet diagnosis matters.' }
        ]
      },
      { day: 6, label: 'Day 6 — kid wants to hold',
        prompt: 'A young niece (age 6) is visiting and wants to hold the rabbit. The rabbit is recently bonded but not yet handling-confident.',
        choices: [
          { id: 'floor_visit', label: 'Sit on floor with niece; let rabbit approach on its terms',
            effects: { phys: +3, ment: +5, soc: +5, env: +2, en: -3, money: 0 },
            note: 'Rabbits are prey animals — being held high (above eye-level) triggers predator-grab instinct. Floor-level interactions are far better welfare.' },
          { id: 'hold_briefly', label: 'Carefully hand the rabbit to her for 30 seconds',
            effects: { phys: -3, ment: -3, soc: -5, env: 0, en: -2, money: 0 },
            note: 'Many rabbits stress-freeze in human arms (they\'re not enjoying it — they\'re terrified). Adults can usually hold safely; kids almost always misjudge.' },
          { id: 'no', label: 'Tell niece "no — rabbits are not for holding"; offer brushing instead',
            effects: { phys: +5, ment: +3, soc: +3, env: +1, en: -2, money: 0 },
            note: 'Honest answer. Brushing a willing rabbit is delightful for both species. Holding is a risk for the rabbit and a teach-them-now moment for the niece.' }
        ]
      },
      { day: 7, label: 'Day 7 — long-term reality check',
        prompt: 'You\'ve been a rabbit owner for one week. A friend mentions getting one. What do you tell them?',
        choices: [
          { id: 'honest', label: '"They\'re wonderful but high-effort. Plan 8–12 years, exotic vets, daily greens + hay, free-roam space, almost certainly pair-bonded. Read House Rabbit Society first."',
            effects: { phys: +5, ment: +5, soc: +5, env: +3, en: -2, money: 0 },
            note: 'Honest counsel. Rabbits are surrendered to shelters at high rates because they\'re the third-most popular pet sold and routinely sold without honest expectations.' },
          { id: 'easy', label: '"Yeah easy starter pet — basically a vegetarian cat"',
            effects: { phys: -5, ment: -5, soc: 0, env: -3, en: 0, money: 0 },
            note: 'You just contributed to a future shelter rabbit. House Rabbit Society explicitly says rabbits are NOT good first pets for kids. The friend\'s rabbit will pay the price.' },
          { id: 'unsure', label: '"Honestly, no. They\'re harder than I thought."',
            effects: { phys: 0, ment: 0, soc: 0, env: 0, en: 0, money: 0 },
            note: 'Also valid. Rabbits aren\'t for everyone. Honest about your experience saves the friend from making the same surprise.' }
        ]
      }
    ]
  };

  // Care-sim economy constants.
  //
  // START_MONEY is species-scaled, not flat. A flat budget made the sim
  // teach the wrong lesson: the cheapest path to full welfare costs $115
  // for a dog, $296 for a cat, but $596 for a rabbit (spay + a GI-stasis
  // emergency are both mandatory and both exotic-vet priced). On a flat
  // $500 the *highest-welfare rabbit week was unreachable* — a student who
  // made every correct medical call went bankrupt and was denied the
  // badge, while one who skipped the spay kept it. These figures give each
  // species a comparable ~$355+ margin over its best-care path while
  // leaving every species bankruptable by careless spending (reckless
  // weeks cost up to $707 / $1,416 / $2,946). Scaled off the tool's own
  // Lifetime Cost profiles, where rabbits carry exotic-vet premiums.
  var CARE_SIM_START_MONEY = { dog: 500, cat: 650, rabbit: 950 };

  // Caregiver energy. Previously decorative — it was displayed and
  // decremented but read by nothing, while the intro promised it tracked
  // "how YOU are doing". Now it recovers overnight and, when it runs low,
  // degrades the care you're able to give (documented caregiver-fatigue
  // effect), which is the actual lesson the meter was there to teach.
  var CARE_SIM_ENERGY_RECOVERY = 10;   // overnight rest, capped at 100
  var CARE_SIM_TIRED_BELOW = 25;       // below this, routine care is half as effective

  // ─────────────────────────────────────────────────────────
  // SECTION 7b: SENSORY PERSPECTIVE ("Through Their Eyes")
  //
  // A walkable first-person room rendered from a dog's, a cat's, or a
  // human's viewpoint. The lab already TELLS students that dogs are
  // dichromats who trade colour for low-light and motion sensitivity
  // (see the Dogs module); this lets them stand in it.
  //
  // Every number below is sourced. Where the render is an ILLUSTRATION
  // rather than a calibrated optical model — the acuity blur and the
  // flat-screen field of view especially — the UI says so out loud
  // rather than implying the screen is what the animal experiences.
  // ─────────────────────────────────────────────────────────
  var SENSORY_SPECIES = [
    {
      id: 'human', name: 'Human', icon: '🧍', accent: '#38bdf8',
      eyeHeight: 1.60,          // average adult standing eye height
      renderFov: 72,            // vertical FOV actually rendered
      totalFieldDeg: 190,       // full horizontal field, both eyes
      binocularDeg: 120,        // overlap where depth perception works
      acuity: '20/20', blurPx: 0,
      dichromat: false,
      lowLightFactor: 1,        // baseline
      flickerHz: 60,
      note: 'Three cone types (trichromat). Best daylight detail of the three, worst night vision.',
      cite: 'Baseline for comparison'
    },
    {
      id: 'dog', name: 'Dog', icon: '🐕', accent: '#fbbf24',
      eyeHeight: 0.62,          // medium breed (Lab/Border-Collie class), standing
      renderFov: 96,
      totalFieldDeg: 240,       // breed-dependent; long-muzzled breeds widest
      binocularDeg: 65,
      acuity: '20/75', blurPx: 2.4,
      dichromat: true,
      lowLightFactor: 5,        // tapetum lucidum + rod-rich retina
      flickerHz: 75,
      note: 'Dichromat — blue and yellow, no functional red/green discrimination. Wider field, sharper motion detection, far better low light, much softer detail.',
      cite: 'Miller & Murphy 1995 (acuity) · Neitz, Geist & Jacobs 1989 (dichromacy)'
    },
    {
      id: 'cat', name: 'Cat', icon: '🐈', accent: '#c084fc',
      eyeHeight: 0.28,          // standing, at the shoulder-to-eye line
      renderFov: 92,
      totalFieldDeg: 200,
      binocularDeg: 100,        // more overlap than a dog — an ambush predator's trade
      acuity: '20/100', blurPx: 2.9,
      dichromat: true,
      lowLightFactor: 6,        // needs roughly 1/6 the light a human does
      flickerHz: 70,
      note: 'Dichromat and even softer detail than a dog, but the best low-light vision of the three and strong binocular overlap for judging a pounce.',
      cite: 'Blake et al. 1974 (acuity) · Guenther & Zrenner 1993 (cone types)'
    }
  ];

  function _petsSensorySpecies(id) {
    for (var i = 0; i < SENSORY_SPECIES.length; i++) {
      if (SENSORY_SPECIES[i].id === id) return SENSORY_SPECIES[i];
    }
    return SENSORY_SPECIES[0];
  }

  // Deuteranope projection (Viénot, Brettel & Mollon 1999), applied in
  // LINEAR light. Dog and cat cone peaks (~429 nm / ~555 nm) sit close to
  // human deuteranopia, so this is the standard stand-in — an approximation
  // of a different species' colour space, not a measurement of it.
  function _petsDichromat(r, g, b) {
    function toLin(c) { return Math.pow(Math.max(0, Math.min(1, c)), 2.2); }
    function toSrgb(c) { return Math.pow(Math.max(0, Math.min(1, c)), 1 / 2.2); }
    var lr = toLin(r), lg = toLin(g), lb = toLin(b);
    return {
      r: toSrgb(0.625 * lr + 0.375 * lg + 0.000 * lb),
      g: toSrgb(0.700 * lr + 0.300 * lg + 0.000 * lb),
      b: toSrgb(0.000 * lr + 0.300 * lg + 0.700 * lb)
    };
  }

  // Where a dog can smell something the eye can't show. Positions are in
  // room coordinates and match the props built in _petsBuildSensoryScene.
  var SENSORY_SCENTS = [
    { x: 2.1, z: -1.4, color: 0xff8a3d, label: 'Food bowl — fresh', rise: 1.0, count: 26 },
    { x: -1.6, z: 1.9, color: 0x7dd3fc, label: 'Where the cat slept', rise: 0.5, count: 18 },
    { x: 0.4, z: 0.6, color: 0xfde047, label: 'Ball — handled minutes ago', rise: 0.6, count: 14 },
    { x: -2.4, z: -2.2, color: 0xa3e635, label: 'Doorway — everyone who came in', rise: 1.2, count: 22 },
    { x: 1.2, z: 2.4, color: 0xf472b6, label: 'Couch — the family\'s spot', rise: 0.8, count: 16 }
  ];

  // Room half-extents in metres. Movement is clamped to these, so they also
  // bound where a student can stand.
  var SENSORY_ROOM = { halfX: 3.4, halfZ: 3.4, height: 2.6 };

  // Furniture footprints, so a student cannot walk inside the couch. This is
  // not polish: at a human's 1.6 m eye line you look over the furniture and
  // never notice, but a cat's eye line is 0.28 m, so standing in the couch
  // fills half the screen with an unlit black mass. The bug only exists in
  // the views the whole feature is FOR.
  var SENSORY_BLOCKERS = [
    { x0: 0.05, x1: 2.35, z0: 2.10, z1: 3.10 },   // couch
    { x0: -0.10, x1: 1.30, z0: 1.10, z1: 1.90 },  // coffee table
    { x0: -3.05, x1: -2.35, z0: 2.15, z1: 2.85 }, // houseplant
    { x0: -2.20, x1: -1.60, z0: -1.50, z1: -0.90 }, // person
    { x0: 1.85, x1: 2.85, z0: -1.65, z1: -1.15 }, // bowls
    { x0: 2.48, x1: 3.08, z0: 1.00, z1: 1.60 },   // floor lamp
    { x0: -3.08, x1: -2.28, z0: -2.30, z1: -1.70 } // toy basket
  ];

  // Soft round sprite for the scent motes, drawn at runtime so there is still
  // no asset to fetch. Untextured THREE.Points render as hard SQUARES, which
  // read as rendering glitches rather than as drifting smell.
  function _petsScentTexture(THREE) {
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.width = 64; c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  // Builds the living room from primitives — no external assets, so nothing
  // to fail behind a school content filter. Every mesh records its authored
  // colour in `baseHex` so switching species can re-derive the dichromat
  // version from the ORIGINAL rather than compounding the transform.
  function _petsBuildSensoryScene(THREE, scene) {
    var tinted = [];   // meshes whose colour changes with species
    var lights = [];   // {light, baseIntensity}
    var disposables = [];

    function mat(hex, opts) {
      var Material = THREE.MeshStandardMaterial || THREE.MeshLambertMaterial;
      var base = { color: hex };
      if (THREE.MeshStandardMaterial) { base.roughness = 0.82; base.metalness = 0.02; }
      var m = new Material(Object.assign(base, opts || {}));
      disposables.push(m);
      return m;
    }
    function add(geo, material, x, y, z, rx, ry) {
      disposables.push(geo);
      var mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z);
      if (rx) mesh.rotation.x = rx;
      if (ry) mesh.rotation.y = ry;
      mesh.castShadow = geo && geo.type !== 'PlaneGeometry';
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    }
    function prop(geo, hex, x, y, z, rx, ry, opts) {
      var m = mat(hex, opts);
      var mesh = add(geo, m, x, y, z, rx, ry);
      tinted.push({ material: m, baseHex: hex });
      return mesh;
    }
    function scale(mesh, x, y, z) {
      mesh.scale.set(x, y, z);
      return mesh;
    }

    var R = SENSORY_ROOM;

    // Shell — floor, ceiling, four walls (BackSide so we see them from inside)
    prop(new THREE.PlaneGeometry(R.halfX * 2, R.halfZ * 2), 0x9a7b52, 0, 0, 0, -Math.PI / 2);
    prop(new THREE.PlaneGeometry(R.halfX * 2, R.halfZ * 2), 0xf3ece2, 0, R.height, 0, Math.PI / 2);
    var wallHex = 0xe8dcc8;
    prop(new THREE.PlaneGeometry(R.halfX * 2, R.height), wallHex, 0, R.height / 2, -R.halfZ);
    prop(new THREE.PlaneGeometry(R.halfX * 2, R.height), wallHex, 0, R.height / 2, R.halfZ, 0, Math.PI);
    prop(new THREE.PlaneGeometry(R.halfZ * 2, R.height), wallHex, -R.halfX, R.height / 2, 0, 0, Math.PI / 2);
    prop(new THREE.PlaneGeometry(R.halfZ * 2, R.height), wallHex, R.halfX, R.height / 2, 0, 0, -Math.PI / 2);

    // Narrow timber boards, seams, and baseboards keep the room from reading
    // as one flat brown plane while remaining entirely procedural/offline.
    for (var plank = 0; plank < 12; plank++) {
      var plankZ = -R.halfZ + 0.29 + plank * 0.57;
      var plankHex = plank % 3 === 0 ? 0x9b7046 : plank % 3 === 1 ? 0xa77b4e : 0x8f653e;
      prop(new THREE.BoxGeometry(R.halfX * 2 - 0.04, 0.026, 0.535), plankHex, 0, 0.013, plankZ, 0, 0, { roughness: 0.72 });
    }
    prop(new THREE.BoxGeometry(R.halfX * 2, 0.12, 0.045), 0xf1e5d2, 0, 0.06, -R.halfZ + 0.03);
    prop(new THREE.BoxGeometry(R.halfX * 2, 0.12, 0.045), 0xf1e5d2, 0, 0.06, R.halfZ - 0.03);
    prop(new THREE.BoxGeometry(0.045, 0.12, R.halfZ * 2), 0xf1e5d2, -R.halfX + 0.03, 0.06, 0);
    prop(new THREE.BoxGeometry(0.045, 0.12, R.halfZ * 2), 0xf1e5d2, R.halfX - 0.03, 0.06, 0);

    // Framed art and a small shelf create scale cues at every eye height.
    prop(new THREE.BoxGeometry(1.02, 0.72, 0.055), 0x6b4428, 1.55, 1.68, -R.halfZ + 0.04);
    prop(new THREE.PlaneGeometry(0.86, 0.56), 0xe8a65d, 1.55, 1.68, -R.halfZ + 0.075);
    prop(new THREE.SphereGeometry(0.13, 20, 14), 0x4f7a6a, 1.39, 1.70, -R.halfZ + 0.10);
    prop(new THREE.SphereGeometry(0.10, 20, 14), 0xf5d36c, 1.70, 1.58, -R.halfZ + 0.10);
    prop(new THREE.BoxGeometry(0.95, 0.07, 0.20), 0x6b4a2f, -R.halfX + 0.10, 1.52, 0.75, 0, Math.PI / 2);
    prop(new THREE.BoxGeometry(0.16, 0.34, 0.14), 0x315b78, -R.halfX + 0.21, 1.72, 0.50, 0, Math.PI / 2);
    prop(new THREE.BoxGeometry(0.12, 0.26, 0.13), 0xb4453a, -R.halfX + 0.20, 1.67, 0.75, 0, Math.PI / 2);

    // Rug — the cat's spot. Deliberately a warm red so the dichromat view
    // visibly flattens it against the wood floor.
    prop(new THREE.BoxGeometry(3.0, 0.035, 2.2), 0xb4453a, -1.0, 0.048, 1.6, 0, 0, { roughness: 0.96 });
    for (var stripe = -2; stripe <= 2; stripe++) {
      prop(new THREE.BoxGeometry(0.035, 0.012, 2.08), stripe % 2 ? 0xd58a67 : 0xe0ab77,
        -1.0 + stripe * 0.48, 0.072, 1.6);
    }
    prop(new THREE.BoxGeometry(3.12, 0.018, 0.055), 0xe4b98a, -1.0, 0.055, 0.49);
    prop(new THREE.BoxGeometry(3.12, 0.018, 0.055), 0xe4b98a, -1.0, 0.055, 2.71);
    prop(new THREE.BoxGeometry(0.08, 0.02, 2.0), 0x7d302e, -2.47, 0.061, 1.6);

    // Couch: seat, back, two arms
    prop(new THREE.BoxGeometry(2.2, 0.42, 0.9), 0x4f7a6a, 1.2, 0.34, 2.6);
    prop(new THREE.BoxGeometry(2.2, 0.6, 0.22), 0x456e5f, 1.2, 0.72, 3.0);
    prop(new THREE.BoxGeometry(0.22, 0.5, 0.9), 0x456e5f, 0.15, 0.5, 2.6);
    prop(new THREE.BoxGeometry(0.22, 0.5, 0.9), 0x456e5f, 2.25, 0.5, 2.6);
    // Layered cushions and feet soften the box silhouette and make contact
    // shadows legible from the dog/cat camera heights.
    prop(new THREE.BoxGeometry(0.94, 0.14, 0.67), 0x5b8d79, 0.68, 0.59, 2.52, -0.04);
    prop(new THREE.BoxGeometry(0.94, 0.14, 0.67), 0x5b8d79, 1.72, 0.59, 2.52, -0.04);
    prop(new THREE.BoxGeometry(0.90, 0.48, 0.16), 0x527f70, 0.70, 0.84, 2.86, -0.10);
    prop(new THREE.BoxGeometry(0.90, 0.48, 0.16), 0x527f70, 1.70, 0.84, 2.86, -0.10);
    scale(prop(new THREE.SphereGeometry(0.25, 22, 16), 0xd5a15c, 1.78, 0.78, 2.48), 1.15, 1.0, 0.38);
    prop(new THREE.BoxGeometry(0.09, 0.22, 0.09), 0x3b2b24, 0.32, 0.12, 2.82);
    prop(new THREE.BoxGeometry(0.09, 0.22, 0.09), 0x3b2b24, 2.08, 0.12, 2.82);
    prop(new THREE.BoxGeometry(0.09, 0.22, 0.09), 0x3b2b24, 0.32, 0.12, 2.34);
    prop(new THREE.BoxGeometry(0.09, 0.22, 0.09), 0x3b2b24, 2.08, 0.12, 2.34);

    // Coffee table
    prop(new THREE.BoxGeometry(1.3, 0.08, 0.7), 0x6b4a2f, 0.6, 0.44, 1.5, 0, 0, { roughness: 0.60 });
    prop(new THREE.BoxGeometry(0.34, 0.035, 0.24), 0x315b78, 0.33, 0.50, 1.42, 0, -0.18);
    prop(new THREE.BoxGeometry(0.31, 0.028, 0.22), 0xd5a15c, 0.36, 0.535, 1.43, 0, -0.18);
    prop(new THREE.CylinderGeometry(0.065, 0.075, 0.13, 18), 0xf2dfb0, 0.94, 0.535, 1.48);
    [[0.05, 1.2], [1.15, 1.2], [0.05, 1.8], [1.15, 1.8]].forEach(function (p) {
      prop(new THREE.BoxGeometry(0.07, 0.42, 0.07), 0x553a24, p[0], 0.21, p[1]);
    });

    // Bowls — food (the strongest scent source) and water
    prop(new THREE.CylinderGeometry(0.20, 0.16, 0.11, 20), 0xcfd4da, 2.1, 0.055, -1.4);
    prop(new THREE.CylinderGeometry(0.17, 0.14, 0.10, 20), 0x8b5e34, 2.1, 0.085, -1.4);
    prop(new THREE.CylinderGeometry(0.18, 0.15, 0.10, 20), 0xcfd4da, 2.6, 0.05, -1.4);
    prop(new THREE.CylinderGeometry(0.15, 0.13, 0.08, 20), 0x4aa3d8, 2.6, 0.075, -1.4, 0, 0, { roughness: 0.28, metalness: 0.35 });
    prop(new THREE.TorusGeometry(0.19, 0.022, 8, 28), 0xe9eef2, 2.1, 0.12, -1.4, Math.PI / 2, 0, { roughness: 0.28, metalness: 0.45 });
    prop(new THREE.TorusGeometry(0.18, 0.020, 8, 28), 0xe9eef2, 2.6, 0.105, -1.4, Math.PI / 2, 0, { roughness: 0.28, metalness: 0.45 });
    prop(new THREE.BoxGeometry(1.05, 0.025, 0.55), 0x315b78, 2.35, 0.018, -1.4);
    prop(new THREE.SphereGeometry(0.035, 12, 9), 0xb67a42, 2.04, 0.15, -1.38);
    prop(new THREE.SphereGeometry(0.035, 12, 9), 0xb67a42, 2.15, 0.15, -1.43);

    // THE demo object: a red ball. Vivid to a human, muddy-yellow to a dog
    // or cat — the single clearest illustration of dichromacy in the room.
    prop(new THREE.SphereGeometry(0.11, 20, 14), 0xd92b2b, 0.4, 0.11, 0.6);
    // ...and a blue one, which stays vivid in every view (dogs see blue well).
    prop(new THREE.SphereGeometry(0.11, 20, 14), 0x2563eb, 0.05, 0.11, 0.15);

    // Houseplant
    prop(new THREE.CylinderGeometry(0.17, 0.13, 0.28, 16), 0xa9613c, -2.7, 0.14, 2.5);
    scale(prop(new THREE.SphereGeometry(0.28, 18, 12), 0x3f8a44, -2.7, 0.55, 2.5), 1.2, 1.35, 0.75);
    scale(prop(new THREE.SphereGeometry(0.21, 18, 12), 0x4f9b55, -2.48, 0.66, 2.48), 1.2, 0.65, 0.75);
    scale(prop(new THREE.SphereGeometry(0.21, 18, 12), 0x477f43, -2.91, 0.67, 2.52), 1.2, 0.70, 0.75);
    scale(prop(new THREE.SphereGeometry(0.18, 18, 12), 0x5ba960, -2.67, 0.86, 2.51), 0.82, 1.35, 0.64);
    prop(new THREE.BoxGeometry(0.55, 0.04, 0.55), 0x755136, -2.7, 0.03, 2.5);
    prop(new THREE.CylinderGeometry(0.115, 0.07, 0.72, 12), 0x765236, -2.7, 0.49, 2.5);
    prop(new THREE.TorusGeometry(0.18, 0.025, 8, 24), 0xc17b4f, -2.7, 0.30, 2.5, Math.PI / 2);

    // A standing person — the scale reference. From a cat's eye line this
    // reads as a tower, which is the point.
    prop(new THREE.CylinderGeometry(0.16, 0.20, 0.95, 14), 0x37506e, -1.9, 0.48, -1.2);
    prop(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 14), 0x9c6b4a, -1.9, 1.22, -1.2);
    prop(new THREE.SphereGeometry(0.135, 16, 12), 0xd8a887, -1.9, 1.62, -1.2);

    // Window on the far wall + the daylight it implies
    prop(new THREE.PlaneGeometry(1.5, 1.0), 0xdff1ff, 0, 1.5, -R.halfZ + 0.02);
    prop(new THREE.BoxGeometry(1.62, 0.06, 0.05), 0xf6f1e7, 0, 2.02, -R.halfZ + 0.04);
    prop(new THREE.BoxGeometry(1.62, 0.06, 0.05), 0xf6f1e7, 0, 0.98, -R.halfZ + 0.04);
    prop(new THREE.BoxGeometry(0.06, 1.08, 0.05), 0xf6f1e7, -0.79, 1.50, -R.halfZ + 0.04);
    prop(new THREE.BoxGeometry(0.06, 1.08, 0.05), 0xf6f1e7, 0.79, 1.50, -R.halfZ + 0.04);
    prop(new THREE.BoxGeometry(0.055, 1.02, 0.05), 0xf6f1e7, 0, 1.50, -R.halfZ + 0.05);
    prop(new THREE.BoxGeometry(1.66, 0.08, 0.18), 0xd9cbb8, 0, 0.95, -R.halfZ + 0.13);
    prop(new THREE.BoxGeometry(0.18, 1.18, 0.10), 0xc98f5b, -0.90, 1.50, -R.halfZ + 0.13);
    prop(new THREE.BoxGeometry(0.18, 1.18, 0.10), 0xc98f5b, 0.90, 1.50, -R.halfZ + 0.13);

    // Doorway to the yard — grass visible through it. A red ball on green
    // grass is the classic "why can't he find it?" demonstration.
    prop(new THREE.PlaneGeometry(1.1, 2.1), 0x6f4d31, -2.4, 1.05, -R.halfZ + 0.02);
    prop(new THREE.PlaneGeometry(1.0, 1.9), 0x5d9e4a, -2.4, 0.95, -R.halfZ + 0.05);
    prop(new THREE.SphereGeometry(0.09, 16, 12), 0xd92b2b, -2.4, 0.35, -R.halfZ + 0.09);
    prop(new THREE.BoxGeometry(0.10, 2.22, 0.10), 0xf0e2ce, -2.98, 1.11, -R.halfZ + 0.14);
    prop(new THREE.BoxGeometry(0.10, 2.22, 0.10), 0xf0e2ce, -1.82, 1.11, -R.halfZ + 0.14);
    prop(new THREE.BoxGeometry(1.25, 0.10, 0.10), 0xf0e2ce, -2.40, 2.19, -R.halfZ + 0.14);
    scale(prop(new THREE.SphereGeometry(0.22, 16, 12), 0x3f8a44, -2.86, 0.30, -R.halfZ + 0.12), 1.35, 0.65, 0.45);
    scale(prop(new THREE.SphereGeometry(0.22, 16, 12), 0x4d9850, -1.94, 0.29, -R.halfZ + 0.12), 1.35, 0.65, 0.45);

    // Scattered toys
    prop(new THREE.BoxGeometry(0.16, 0.08, 0.16), 0xe0762d, 1.9, 0.04, 1.1);
    prop(new THREE.CylinderGeometry(0.05, 0.05, 0.30, 12), 0x8e5bd0, -0.8, 0.05, -0.4, Math.PI / 2);
    prop(new THREE.CylinderGeometry(0.028, 0.035, 1.55, 14), 0x5b4635, 2.76, 0.78, 1.30);
    prop(new THREE.CylinderGeometry(0.36, 0.22, 0.48, 28, 1, true), 0xe1b96c, 2.76, 1.58, 1.30, 0, 0, { side: THREE.DoubleSide, roughness: 0.78 });
    prop(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 24), 0x5b4635, 2.76, 0.025, 1.30);
    prop(new THREE.SphereGeometry(0.08, 16, 12), 0xffdf9a, 2.76, 1.53, 1.30, 0, 0, { emissive: 0x7a4b16, emissiveIntensity: 0.28 });
    prop(new THREE.BoxGeometry(0.68, 0.28, 0.42), 0x9c6b4a, -2.68, 0.14, -2.00);
    prop(new THREE.TorusGeometry(0.18, 0.035, 8, 22, Math.PI), 0x7a4d30, -2.68, 0.36, -2.00, Math.PI / 2);
    prop(new THREE.SphereGeometry(0.085, 16, 12), 0xf4b942, -2.78, 0.32, -1.94);
    prop(new THREE.BoxGeometry(0.22, 0.06, 0.12), 0x5b8d79, -2.55, 0.30, -2.04, 0, 0.28);
    prop(new THREE.TorusGeometry(0.10, 0.028, 8, 22), 0x2d78c4, 1.85, 0.075, 0.20, Math.PI / 2);
    prop(new THREE.TorusGeometry(0.08, 0.022, 8, 22), 0xf4b942, 1.86, 0.072, 0.20, Math.PI / 2);

    // ── Lighting ──
    // Kept deliberately low. An earlier pass ran ambient at 0.55 with a 0.85
    // key and the pale walls blew out to flat cream, which destroys exactly
    // the hue information the dichromat comparison depends on.
    var ambient = new THREE.HemisphereLight(0xfff2df, 0x4a3428, 0.48);
    scene.add(ambient); lights.push({ light: ambient, base: 0.48 });
    var sun = new THREE.DirectionalLight(0xffefcf, 0.92);
    sun.position.set(-1.2, 4.8, -2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = -4.5; sun.shadow.camera.right = 4.5;
    sun.shadow.camera.top = 4.5; sun.shadow.camera.bottom = -4.5;
    sun.shadow.camera.near = 0.2; sun.shadow.camera.far = 12;
    sun.shadow.bias = -0.0007;
    scene.add(sun); lights.push({ light: sun, base: 0.92 });
    var lamp = new THREE.PointLight(0xffcb79, 0.64, 7.5, 2);
    lamp.position.set(2.76, 1.48, 1.30);
    scene.add(lamp); lights.push({ light: lamp, base: 0.64 });
    var windowFill = new THREE.PointLight(0xbfe5ff, 0.24, 5.5, 2);
    windowFill.position.set(0, 1.55, -2.95);
    scene.add(windowFill); lights.push({ light: windowFill, base: 0.24 });

    // ── Scent field (dog view only) ──
    // Additive drifting motes rising from each source. Kept as one Points
    // cloud per source so a source can carry its own colour and rise rate.
    var scentGroup = new THREE.Group();
    scentGroup.visible = false;
    scene.add(scentGroup);
    var scentClouds = [];
    var scentTex = _petsScentTexture(THREE);
    disposables.push(scentTex);
    SENSORY_SCENTS.forEach(function (src) {
      var positions = new Float32Array(src.count * 3);
      var seeds = [];
      for (var i = 0; i < src.count; i++) {
        var a = (i / src.count) * Math.PI * 2;
        var rad = 0.10 + (i % 5) * 0.055;
        positions[i * 3] = src.x + Math.cos(a) * rad;
        positions[i * 3 + 1] = (i / src.count) * src.rise;
        positions[i * 3 + 2] = src.z + Math.sin(a) * rad;
        seeds.push({ a: a, rad: rad, phase: (i / src.count) });
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var pmat = new THREE.PointsMaterial({
        color: src.color, size: 0.20, transparent: true, opacity: 0.5,
        map: scentTex, blending: THREE.AdditiveBlending,
        depthWrite: false, sizeAttenuation: true
      });
      disposables.push(geo, pmat);
      var pts = new THREE.Points(geo, pmat);
      scentGroup.add(pts);
      scentClouds.push({ points: pts, src: src, seeds: seeds, geo: geo });
    });

    return {
      tinted: tinted,
      lights: lights,
      scentGroup: scentGroup,
      scentClouds: scentClouds,
      dispose: function () {
        disposables.forEach(function (o) { if (o && o.dispose) { try { o.dispose(); } catch (e) {} } });
      }
    };
  }

  // Hook-free viewer factory. Owns the renderer, the RAF loop and all DOM
  // listeners; React only ever holds the returned handle in a stable ref and
  // calls methods on it. Nothing here touches component state, so a re-render
  // cannot re-initialise the canvas (the inline-callback-ref stutter that bit
  // the DNA and Ecosystem tools).
  function _petsMakeSensoryViewer() {
    var S = null;              // live state; null when detached
    var speciesId = 'human';
    var dusk = false;
    var onStatus = null;
    var status = 'idle';
    // The tool's reduced-motion CSS freezes keyframes and transitions, which
    // does nothing whatsoever to a WebGL RAF loop. Without this, a student
    // who asked the OS for less motion still gets a continuously drifting
    // first-person scene. When reduced, the scene renders only when the
    // student actually changes something.
    var reduced = false;

    function setStatus(next) {
      if (status === next) return;
      status = next;
      if (onStatus) { try { onStatus(next); } catch (e) {} }
    }

    // Marks the scene as needing one more frame. In reduced-motion mode this
    // is the only thing that causes a render.
    function invalidate() { if (S) S.dirty = true; }

    function applySpecies() {
      if (!S) return;
      var sp = _petsSensorySpecies(speciesId);
      // Colour: re-derive from the authored hex every time.
      S.built.tinted.forEach(function (t) {
        var hex = t.baseHex;
        var r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
        if (sp.dichromat) { var c = _petsDichromat(r, g, b); r = c.r; g = c.g; b = c.b; }
        t.material.color.setRGB(r, g, b);
      });
      // Light: at dusk a human is nearly blind while the animals still read
      // the room — that contrast IS the lesson, so the gain is species-scaled.
      var gain = dusk ? Math.min(0.62, 0.10 * sp.lowLightFactor) : 1;
      S.built.lights.forEach(function (l) { l.light.intensity = l.base * gain; });
      S.scene.background.setHex(dusk ? 0x111827 : 0x2a211c);
      if (S.scene.fog) S.scene.fog.color.setHex(dusk ? 0x1a2130 : 0x5e4a3d);
      if (S.renderer.toneMappingExposure != null) {
        S.renderer.toneMappingExposure = dusk ? (sp.lowLightFactor > 1 ? 0.88 : 0.58) : 1.08;
      }
      S.camera.fov = sp.renderFov;
      S.camera.position.y = sp.eyeHeight;
      S.camera.updateProjectionMatrix();
      // Acuity + exposure are screen-space, so they ride on a CSS filter —
      // r128 core ships no post-processing passes.
      var filters = [];
      if (sp.blurPx > 0) filters.push('blur(' + sp.blurPx.toFixed(2) + 'px)');
      // At dusk the animals see a USABLE room, not a daylit one. An earlier
      // tuning left the cat's dusk view nearly identical to its noon view,
      // which quietly claimed a tapetum turns night into day. It does not:
      // needing 1/6 the light still leaves a cat well short when dusk is far
      // more than 6x dimmer than noon. Heavy desaturation is the honest part —
      // low light is rod-dominated, and rods carry almost no colour.
      if (dusk && sp.lowLightFactor > 1) filters.push('brightness(1.06) saturate(0.42)');
      if (dusk && sp.lowLightFactor === 1) filters.push('brightness(0.62)');
      S.renderer.domElement.style.filter = filters.length ? filters.join(' ') : 'none';
      S.built.scentGroup.visible = (speciesId === 'dog');
      S.dirty = true;
    }

    function resize() {
      if (!S || !S.node) return;
      var w = S.node.clientWidth || 480;
      var h = S.node.clientHeight || 360;
      S.renderer.setSize(w, h, false);
      S.camera.aspect = w / Math.max(1, h);
      S.camera.updateProjectionMatrix();
      S.dirty = true;
    }

    var api = {
      status: function () { return status; },
      onStatus: function (fn) { onStatus = fn; },

      attach: function (THREE, node) {
        if (S || !node) return;
        var renderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        } catch (e) {
          setStatus('failed');
          return;                       // no WebGL — the 2D panels carry the lesson
        }
        var w = node.clientWidth || 480;
        var h = node.clientHeight || 360;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (THREE.sRGBEncoding != null) renderer.outputEncoding = THREE.sRGBEncoding;
        if (THREE.ACESFilmicToneMapping != null) renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.domElement.style.cssText =
          'display:block;width:100%;height:100%;border-radius:20px;touch-action:pan-y;';
        renderer.domElement.setAttribute('aria-hidden', 'true');
        node.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a211c);
        scene.fog = new THREE.Fog(0x5e4a3d, 8.5, 17);
        var camera = new THREE.PerspectiveCamera(72, w / Math.max(1, h), 0.05, 60);
        camera.position.set(-1.2, 1.6, 2.35);

        // Open looking ACROSS the room toward the window and the doorway, from
        // the back wall, tilted slightly down. The first frame has to contain
        // the things the lesson is about — the two balls, the bowls, the
        // person — or a student arrives staring at blank plaster. A human's
        // eye line is 1.6 m up, so without the tilt the floor props sit just
        // below the bottom of frame.
        S = {
          THREE: THREE, node: node, renderer: renderer, scene: scene, camera: camera,
          built: _petsBuildSensoryScene(THREE, scene),
          yaw: 0, pitch: -0.15, x: -1.2, z: 2.35,
          keys: {}, drag: null, raf: 0, t0: 0, listeners: [], resizeObserver: null, dirty: true
        };

        function on(target, type, fn, opts) {
          target.addEventListener(type, fn, opts || false);
          S.listeners.push({ target: target, type: type, fn: fn });
        }
        on(window, 'resize', resize);
        if (typeof window.ResizeObserver === 'function') {
          S.resizeObserver = new window.ResizeObserver(function () { resize(); });
          S.resizeObserver.observe(node);
        }
        // Pointer look. pan-y above keeps vertical page scroll working.
        on(renderer.domElement, 'pointerdown', function (e) {
          S.drag = { x: e.clientX, y: e.clientY };
          if (renderer.domElement.setPointerCapture) {
            try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) {}
          }
        });
        on(renderer.domElement, 'pointermove', function (e) {
          if (!S || !S.drag) return;
          api.look((e.clientX - S.drag.x) * 0.4, (e.clientY - S.drag.y) * 0.3);
          S.drag = { x: e.clientX, y: e.clientY };
          S.dirty = true;
        });
        on(renderer.domElement, 'pointerup', function () { if (S) S.drag = null; });
        on(renderer.domElement, 'pointercancel', function () { if (S) S.drag = null; });

        applySpecies();
        setStatus('ready');

        var clock = 0;
        function frame(ts) {
          if (!S) return;
          S.raf = window.requestAnimationFrame(frame);
          var dt = S.t0 ? Math.min(0.05, (ts - S.t0) / 1000) : 0.016;
          S.t0 = ts;
          clock += dt;

          // Keyboard walk — held keys integrate per frame.
          var fwd = (S.keys.w ? 1 : 0) - (S.keys.s ? 1 : 0);
          var strafe = (S.keys.d ? 1 : 0) - (S.keys.a ? 1 : 0);
          var turn = (S.keys.right ? 1 : 0) - (S.keys.left ? 1 : 0);
          if (turn) { api.look(turn * 90 * dt, 0); S.dirty = true; }
          if (fwd || strafe) { api.move(fwd * dt * 1.7, strafe * dt * 1.7); S.dirty = true; }

          // With motion reduced, the room holds perfectly still until the
          // student moves it. Walking still works — it just does not drift on
          // its own. Bail BEFORE the scent animation and the render.
          if (reduced && !S.dirty) return;
          var scentAnimating = S.built.scentGroup.visible && !reduced;
          if (!S.dirty && !scentAnimating) return;
          S.dirty = false;

          // Scent motes rise and recycle. Dog view only, so skip the work
          // entirely otherwise. Frozen (but still visible, at a stable
          // position) when motion is reduced — the information is the WHERE,
          // not the drifting.
          if (scentAnimating) {
            S.built.scentClouds.forEach(function (cl) {
              var pos = cl.geo.attributes.position;
              for (var i = 0; i < cl.seeds.length; i++) {
                var sd = cl.seeds[i];
                var life = (clock * 0.22 + sd.phase) % 1;
                var sway = Math.sin(clock * 0.9 + sd.a * 3) * 0.05;
                pos.array[i * 3] = cl.src.x + Math.cos(sd.a + clock * 0.2) * (sd.rad + life * 0.18) + sway;
                pos.array[i * 3 + 1] = 0.05 + life * cl.src.rise;
                pos.array[i * 3 + 2] = cl.src.z + Math.sin(sd.a + clock * 0.2) * (sd.rad + life * 0.18);
              }
              pos.needsUpdate = true;
              cl.points.material.opacity = 0.26 + 0.16 * Math.sin(clock * 1.3 + cl.src.rise);
            });
          }

          S.camera.position.set(S.x, S.camera.position.y, S.z);
          S.camera.rotation.set(0, 0, 0);
          S.camera.rotateY(S.yaw);
          S.camera.rotateX(S.pitch);
          S.renderer.render(S.scene, S.camera);
          if (S.renderer.shadowMap && S.renderer.shadowMap.autoUpdate) S.renderer.shadowMap.autoUpdate = false;
        }
        S.raf = window.requestAnimationFrame(frame);
      },

      // Movement is clamped inside the room so a student can't walk out
      // into the void and lose the scene.
      move: function (forward, strafe) {
        if (!S) return;
        var sin = Math.sin(S.yaw), cos = Math.cos(S.yaw);
        var nx = S.x - (forward * sin) + (strafe * cos);
        var nz = S.z - (forward * cos) - (strafe * sin);
        var pad = 0.35;
        nx = Math.max(-SENSORY_ROOM.halfX + pad, Math.min(SENSORY_ROOM.halfX - pad, nx));
        nz = Math.max(-SENSORY_ROOM.halfZ + pad, Math.min(SENSORY_ROOM.halfZ - pad, nz));
        // Resolve each axis separately so hitting a couch slides along it
        // instead of sticking fast — walking into furniture and stopping dead
        // reads as a broken control, not as a wall.
        function blocked(px, pz) {
          for (var i = 0; i < SENSORY_BLOCKERS.length; i++) {
            var b = SENSORY_BLOCKERS[i];
            if (px > b.x0 - 0.22 && px < b.x1 + 0.22 && pz > b.z0 - 0.22 && pz < b.z1 + 0.22) return true;
          }
          return false;
        }
        if (!blocked(nx, S.z)) S.x = nx;
        if (!blocked(S.x, nz)) S.z = nz;
      },

      look: function (dYawDeg, dPitchDeg) {
        if (!S) return;
        S.yaw -= dYawDeg * Math.PI / 180;
        S.pitch = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6,
          S.pitch - (dPitchDeg || 0) * Math.PI / 180));
      },

      resetView: function () {
        if (!S) return;
        S.x = -1.2; S.z = 2.35; S.yaw = 0; S.pitch = -0.15;
        invalidate();
      },

      focusTarget: function (name) {
        if (!S) return;
        var targets = {
          balls: { x: 0.22, y: 0.12, z: 0.38 },
          doorway: { x: -2.40, y: 0.90, z: -3.25 },
          bowls: { x: 2.35, y: 0.10, z: -1.40 },
          person: { x: -1.90, y: 1.02, z: -1.20 },
          couch: { x: 1.20, y: 0.60, z: 2.60 }
        };
        var t = targets[name] || targets.balls;
        var dx = t.x - S.x, dz = t.z - S.z;
        var flat = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
        S.yaw = Math.atan2(-dx, -dz);
        S.pitch = Math.max(-Math.PI / 2.6, Math.min(Math.PI / 2.6,
          Math.atan2(t.y - S.camera.position.y, flat)));
        invalidate();
      },

      setKey: function (name, down) { if (S) S.keys[name] = !!down; },

      setSpecies: function (id) { speciesId = id; applySpecies(); },
      setDusk: function (on) { dusk = !!on; applySpecies(); },
      setReducedMotion: function (on) { reduced = !!on; invalidate(); },
      isReducedMotion: function () { return reduced; },
      resize: resize,

      detach: function () {
        if (!S) return;
        if (S.raf) window.cancelAnimationFrame(S.raf);
        if (S.resizeObserver) { try { S.resizeObserver.disconnect(); } catch (e) {} }
        S.listeners.forEach(function (l) {
          try { l.target.removeEventListener(l.type, l.fn); } catch (e) {}
        });
        try { S.built.dispose(); } catch (e) {}
        try { S.renderer.dispose(); } catch (e) {}
        if (S.renderer.domElement && S.renderer.domElement.parentNode) {
          S.renderer.domElement.parentNode.removeChild(S.renderer.domElement);
        }
        S = null;
        setStatus('idle');
      }
    };
    return api;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 8: TOOL REGISTRATION + RENDER (helpers + view router)
  // Render functions added in subsequent edits.
  // ─────────────────────────────────────────────────────────
  window.StemLab.registerTool('petsLab', {
    name: 'Science of Pets Lab',
    icon: '🐾',
    category: 'life-earth-science',
    description: 'Companion-animal SCIENCE: physiology, ethology, nutrition, genetics, domestication, zoonoses, service animals. Cross-species pet training that assumes BehaviorLab\'s operant theory and applies it to real homes. UDL-aligned via Service & Support Animals coverage.',
    tags: ['pets', 'animals', 'biology', 'ethology', 'genetics', 'service-dogs', 'maine'],
    render: function(ctx) {
      try {
        return _renderPets(ctx);
      } catch(e) {
        console.error('[Pets] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'Pets Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

  // _renderPets — the full render function defined below.
  function _renderPets(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var d = (ctx.toolData && ctx.toolData['petsLab']) || {};
    // `val` may be an updater FUNCTION receiving the current stored value.
    // Required anywhere two writes to one key happen in a single pass off the
    // same render snapshot: ctx.update() stores a plain value, so each call
    // rebuilt the map from the same stale `d.*` and the earlier write vanished.
    // (Acing the quiz awards pass + ace together — the first was being lost.)
    var upd = function(key, val) {
      if (typeof val === 'function' && typeof ctx.setToolData === 'function') {
        ctx.setToolData(function(prev) {
          var copy = Object.assign({}, prev);
          var td = Object.assign({}, copy['petsLab'] || {});
          td[key] = val(td[key]);
          copy['petsLab'] = td;
          return copy;
        });
        return;
      }
      ctx.update('petsLab', key, val);
    };
    var updMulti = function(obj) {
      if (ctx.updateMulti) ctx.updateMulti('petsLab', obj);
      else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
    };
    var addToast = ctx.addToast || function(msg) { console.log('[Pets]', msg); };

    // ── XP ──
    // The host keeps awardStemXP module-local and hands it to plugins as
    // ctx.awardXP(activityId, points, reason); `window.awardStemXP` is never
    // assigned anywhere in the app. This tool awarded badges but no XP at all,
    // so none of its work counted toward StemLab progress. Points are capped
    // at 100 per activity by the host, so the table below is deliberately
    // over-subscribed (130) — the cap is reached through breadth across the
    // lab rather than by grinding any single view.
    var awardHostXP = ctx.awardXP;
    function awardXP(amount, reason) {
      if (typeof awardHostXP === 'function') awardHostXP('petsLab', amount, reason);
    }
    var BADGE_XP = {
      pets_explorer: 5, pets_pro: 10, pets_welfare_aware: 8,
      pets_decoder_5: 8, pets_decoder_15: 12, pets_decoder_all: 20,
      pets_body_lang: 10, pets_quiz_pass: 10, pets_quiz_ace: 15,
      pets_trainer: 12, pets_caregiver: 15, pets_ai_designer: 5,
      pets_sensory: 12
    };

    // ── Hydration + Canvas-survival persistence ──
    // Read priority: window slot (set by host's handleLoadProject) → localStorage
    // → ctx.toolData. The StemLab host doesn't persist this tool's state by
    // default; we layer our own so reloads don't wipe progress.
    var _hydratedRef = React.useRef(false);
    // Badges already awarded by THIS mount — survives across renders, so an
    // award scheduled during render can't fire its toast/XP twice before the
    // state write commits. Declared here, unconditionally, to keep hook order
    // stable across every view this tool dispatches to.
    var _awardedBadgesRef = React.useRef({});
    if (!_hydratedRef.current) {
      _hydratedRef.current = true;
      try {
        var winState = (typeof window !== 'undefined' && window.__alloflowPetsLab) || null;
        var lsState = null;
        try { lsState = JSON.parse(localStorage.getItem('petsLab.state.v1') || 'null'); } catch (e) {}
        var initial = winState || lsState || null;
        if (initial && typeof initial === 'object') {
          if (initial.badges && d.badges === undefined) upd('badges', initial.badges);
          if (initial.modulesVisited && d.modulesVisited === undefined) upd('modulesVisited', initial.modulesVisited);
          if (initial.decoderMastery && d.decoderMastery === undefined) upd('decoderMastery', initial.decoderMastery);
        }
      } catch (e) {}
    }

    // Decoder-mastery celebration state — fires once when a body-language
    // signal is correctly identified for the first time. Auto-clears after
    // ~3.2s. Separate from the quiz score (which is per-attempt) — mastery
    // is forever, like a life list of signals decoded.
    var _decoderCelebState = React.useState(null);
    var decoderCeleb = _decoderCelebState[0];
    var setDecoderCeleb = _decoderCelebState[1];

    // ── Sensory-perspective 3D. Hooks live HERE, at the top of the render
    // function and outside every conditional, because renderSensory() is
    // reached through the view switch — a hook inside that branch would
    // change hook order the moment a student navigated away.
    var _sensoryViewerRef = React.useRef(null);
    var _sensoryMountRef = React.useRef(null);
    var _sensoryStatusState = React.useState('idle');
    var sensoryStatus = _sensoryStatusState[0];
    var setSensoryStatus = _sensoryStatusState[1];

    var view = d.view || 'menu';
    var modulesVisited = d.modulesVisited || {};
    var badges = d.badges || {};
    var decoderMastery = d.decoderMastery || {};
    var quizState = d.quizState || { idx: 0, score: 0, answered: false, lastChoice: null };

    // Mirror persistent state to window slot (for executeSaveFile pickup) +
    // localStorage (for non-Canvas across-session warm cache).
    React.useEffect(function () {
      try {
        var snapshot = {
          badges: d.badges || {},
          modulesVisited: d.modulesVisited || {},
          decoderMastery: d.decoderMastery || {},
          _ts: Date.now()
        };
        window.__alloflowPetsLab = snapshot;
        try { localStorage.setItem('petsLab.state.v1', JSON.stringify(snapshot)); } catch (e) {}
      } catch (e) {}
    }, [d.badges, d.modulesVisited, d.decoderMastery]);

    // Hot-reload from a project-JSON load mid-session.
    React.useEffect(function () {
      function onRestore() {
        try {
          var w = window.__alloflowPetsLab || {};
          if (w.badges) upd('badges', w.badges);
          if (w.modulesVisited) upd('modulesVisited', w.modulesVisited);
          if (w.decoderMastery) upd('decoderMastery', w.decoderMastery);
        } catch (e) {}
      }
      window.addEventListener('alloflow-petslab-restored', onRestore);
      return function () { window.removeEventListener('alloflow-petslab-restored', onRestore); };
    }, []);

    // ── Sensory-perspective lifecycle ──
    var sensorySpecies = d.sensorySpecies || 'human';
    var sensoryDusk = !!d.sensoryDusk;
    var sensoryActive = !!d.sensoryActive;
    var sensoryThreeReady = !!d._threeLoaded;

    // Mount / tear down the viewer. Keyed on what can invalidate the canvas;
    // the cleanup runs on navigation away, so leaving the view stops the RAF
    // loop and frees the WebGL context rather than leaving it spinning.
    React.useEffect(function () {
      if (view !== 'sensory' || !sensoryActive || !sensoryThreeReady) return undefined;
      var node = _sensoryMountRef.current;
      var THREE = (typeof window !== 'undefined') ? window.THREE : null;
      if (!node || !THREE) return undefined;
      var viewer = _petsMakeSensoryViewer();
      _sensoryViewerRef.current = viewer;
      viewer.onStatus(function (s) { setSensoryStatus(s); });
      viewer.attach(THREE, node);
      viewer.setSpecies(d.sensorySpecies || 'human');
      viewer.setDusk(!!d.sensoryDusk);
      viewer.setReducedMotion(d.sensoryReduceMotion != null
        ? !!d.sensoryReduceMotion
        : petsPrefersReducedMotion());
      return function () {
        try { viewer.detach(); } catch (e) {}
        if (_sensoryViewerRef.current === viewer) _sensoryViewerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, sensoryActive, sensoryThreeReady]);

    // Reduced motion. The OS preference is the DEFAULT, not the verdict — the
    // student can still turn the drift back on, and someone who needs it but
    // never found the OS setting can turn it off here. Matches the host's own
    // detection, which also honours an app-level `.reduce-motion` class.
    function petsPrefersReducedMotion() {
      try {
        if (typeof document !== 'undefined' && document.querySelector('.reduce-motion')) return true;
        return !!(typeof window !== 'undefined' && window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (e) { return false; }
    }
    var sensoryReduceMotion = d.sensoryReduceMotion != null
      ? !!d.sensoryReduceMotion
      : petsPrefersReducedMotion();

    // Push species / lighting / motion changes to the live scene without
    // remounting it.
    React.useEffect(function () {
      var viewer = _sensoryViewerRef.current;
      if (!viewer) return;
      viewer.setSpecies(sensorySpecies);
      viewer.setDusk(sensoryDusk);
      viewer.setReducedMotion(sensoryReduceMotion);
    }, [sensorySpecies, sensoryDusk, sensoryReduceMotion]);

    // Keyboard walk. Bound to the window only while the sim is on screen, and
    // only for the movement keys, so it never swallows Tab or a screen-reader
    // shortcut. Arrow keys are preventDefault-ed to stop the page scrolling
    // under the student while they turn.
    React.useEffect(function () {
      if (view !== 'sensory' || !sensoryActive) return undefined;
      var MAP = {
        KeyW: 'w', ArrowUp: 'w', KeyS: 's', ArrowDown: 's',
        KeyA: 'a', KeyD: 'd', ArrowLeft: 'left', ArrowRight: 'right'
      };
      function key(e, down) {
        var name = MAP[e.code];
        if (!name) return;
        var viewer = _sensoryViewerRef.current;
        if (!viewer) return;
        if (e.code.indexOf('Arrow') === 0) e.preventDefault();
        viewer.setKey(name, down);
      }
      function kd(e) { key(e, true); }
      function ku(e) { key(e, false); }
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      return function () {
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
      };
    }, [view, sensoryActive]);

    // Pet Picker state
    var pickHousing = d.pickHousing || 'house';
    var pickKids = d.pickKids != null ? d.pickKids : false;
    // Youngest child's age BAND, not a yes/no. The picker's own scoring asks
    // whether a child is under 5 (CDC: no reptiles) and under 8 (House Rabbit
    // Society), but the old boolean pinned every household with children to a
    // hardcoded age of 6 — so the under-5 reptile rule could never fire and a
    // family with a toddler was shown a gecko with no caution at all. A single
    // checkbox cannot answer a question the scoring asks in two thresholds.
    var pickKidAge = d.pickKidAge || (pickKids ? '5to9' : 'none');
    var PICK_KID_BANDS = [
      { id: 'none', label: 'No children at home', age: 99 },
      { id: 'under5', label: 'Youngest is under 5', age: 3 },
      { id: '5to9', label: 'Youngest is 5–9', age: 7 },
      { id: '10plus', label: 'Youngest is 10 or older', age: 12 }
    ];
    function pickKidBand(id) {
      for (var i = 0; i < PICK_KID_BANDS.length; i++) {
        if (PICK_KID_BANDS[i].id === id) return PICK_KID_BANDS[i];
      }
      return PICK_KID_BANDS[0];
    }
    var pickAllergies = d.pickAllergies != null ? d.pickAllergies : false;
    var pickHoursHome = d.pickHoursHome != null ? d.pickHoursHome : 8;
    var pickBudget = d.pickBudget || 'medium';
    var pickExperience = d.pickExperience || 'some';
    // Lifetime cost state
    var costSpecies = d.costSpecies || 'dog-medium';
    var costYears = d.costYears != null ? d.costYears : 12;
    // Famous animals filter
    var famousFilter = d.famousFilter || 'all';
    // AI Practice state
    var aiScenarioId = d.aiScenarioId || null;
    var aiResponse = d.aiResponse || '';
    var aiCritique = d.aiCritique || null; // { text, source }
    var aiLoadingCritique = !!d.aiLoadingCritique;
    // Diagrams view
    var diagramView = d.diagramView || 'skull';

    function awardBadge(id, label) {
      // `badges` is the render snapshot, so it cannot see an award made
      // moments ago in this same pass — and renderQuiz() calls this during
      // render, which can re-enter before the write commits. The ref guard
      // makes each badge fire its toast and its XP exactly once; the updater
      // form below makes the write itself merge instead of clobber.
      if (badges[id] || _awardedBadgesRef.current[id]) return;
      _awardedBadgesRef.current[id] = true;
      upd('badges', function(cur) {
        var next = Object.assign({}, cur || {});
        if (next[id]) return cur;
        next[id] = { earned: new Date().toISOString(), label: label };
        return next;
      });
      awardXP(BADGE_XP[id] || 5, 'Badge: ' + label);
      addToast('🏅 Badge: ' + label);
      petsAnnounce('Badge earned: ' + label);
    }
    function markVisited(modId) {
      if (modulesVisited[modId]) return;
      var nextVisited = Object.assign({}, modulesVisited);
      nextVisited[modId] = new Date().toISOString();
      upd('modulesVisited', nextVisited);
      var count = Object.keys(nextVisited).length;
      if (count >= 5) awardBadge('pets_explorer', 'Pet Science Explorer');
      if (count >= 12) awardBadge('pets_pro', 'Pet Science Pro');
    }

    // Theme — warm earth tones (cream + amber + brown)
    var T = {
      bg: '#1f1612', card: '#2d2018', cardAlt: '#181210', border: '#5c4536',
      text: '#fef3e2', muted: '#e8d5b7', dim: '#a89180',
      accent: '#f59e0b', accentHi: '#fbbf24', warm: '#fb923c',
      ok: '#84cc16', danger: '#dc2626', link: '#fcd34d'
    };
    function btn(extra) {
      return Object.assign({
        padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
        background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', textAlign: 'left'
      }, extra || {});
    }
    function btnPrimary(extra) {
      return Object.assign(btn({ background: T.accent, color: '#1f1612', border: '1px solid ' + T.accent }), extra || {});
    }

    // Helpers
    function backBar(title) {
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
        h('button', { 'data-pets-focusable': true,
          'aria-label': 'Back to Pets Lab menu',
          onClick: function() { upd('view', 'menu'); petsAnnounce('Back to menu'); },
          style: btn({ padding: '6px 12px', fontSize: 12 })
        }, '← Menu'),
        h('h2', { style: { margin: 0, fontSize: 20, color: T.text } }, title)
      );
    }
    function footer() {
      return h('div', { role: 'contentinfo', 'aria-label': 'Source attribution',
        style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
        'Citations: AVMA · AAFP · AAFCO · IAADP · ASAB · CDC · House Rabbit Society · ASPCA · Bradshaw 2013 · Mech 2000. Educational only — for medical questions, see your veterinarian.');
    }
    function sourceCard(srcKey) {
      var s = SOURCE_CARDS[srcKey]; if (!s) return null;
      return h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, s.icon),
          h('div', null,
            h('div', { style: { fontWeight: 700, fontSize: 17, color: T.text } }, s.name),
            h('div', { style: { fontSize: 12, color: T.accentHi } }, s.principle))),
        h('p', { style: { margin: '6px 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } }, s.oneLiner),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 11, color: T.dim } },
          s.lifespan && h('div', null, h('strong', { style: { color: T.text } }, 'Lifespan: '), s.lifespan),
          s.brain && h('div', null, h('strong', { style: { color: T.text } }, 'Brain: '), s.brain),
          h('div', { style: { gridColumn: '1 / -1' } }, h('strong', { style: { color: T.text } }, 'Cite: '), s.cite))
      );
    }
    function crossLink(label, body) {
      return h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.accent, marginTop: 12 } },
        h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, '🔗 ' + label),
        h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, body));
    }

    // Menu tile data
    var MENU_TILES = [
      { id: 'dogs',         icon: '🐕', label: 'Dogs',                 desc: 'Domestication, scent science, lifespan, dominance-myth debunked.' },
      { id: 'cats',         icon: '🐈', label: 'Cats',                 desc: 'Obligate carnivore biology, sensory world, vocal evolution.' },
      { id: 'smallMammals', icon: '🐹', label: 'Small mammals',        desc: 'Hamster / guinea pig / rabbit / ferret. Lifespans + social needs.' },
      { id: 'birds',        icon: '🦜', label: 'Birds',                desc: 'Vocal learning, air-sac respiration, decade-spanning lifespans.' },
      { id: 'reptiles',     icon: '🦎', label: 'Reptiles & amphibians', desc: 'Ectothermy, UVB, husbandry kills, Salmonella reality.' },
      { id: 'training',     icon: '🎯', label: 'Pet Training (applied)', desc: 'Cross-species training; assumes BehaviorLab theory.' },
      { id: 'nutrition',    icon: '🥩', label: 'Nutrition Science',    desc: 'Species-specific needs + 8 toxic foods to know.' },
      { id: 'genetics',     icon: '🧬', label: 'Domestication & Breeding', desc: 'Artificial selection, breed traits, inbreeding consequences.' },
      { id: 'zoonoses',     icon: '🦠', label: 'Zoonoses & One Health', desc: 'Diseases that cross species. Maine ticks. Rabies.' },
      { id: 'service',      icon: '♿', label: 'Service & Support Animals', desc: 'Service dog vs ESA vs therapy: legal + scientific distinctions.' },
      { id: 'welfare',      icon: '🛡️', label: 'Welfare & Ethics',     desc: 'Spay/neuter, adoption vs breeding, declawing, outdoor cats. Sourced inline.' },
      { id: 'careSim',      icon: '📅', label: 'Pet-Care Week (sim)',  desc: 'Live a week with a dog/cat/rabbit. Decisions affect 4 welfare meters.' },
      { id: 'sensory',      icon: '👁️', label: 'Through Their Eyes (3D)', desc: 'Walk a room as a human, dog, or cat. Colour, acuity, eye height, night vision, and a dog\'s scent world.' },
      { id: 'picker',       icon: '🏠', label: 'Pet Picker',           desc: 'Match species/breed-class to your housing + lifestyle.' },
      { id: 'bodyLang',     icon: '👀', label: 'Body Language Decoder', desc: 'Read dogs, cats, rabbits, birds. Stress + appeasement signals.' },
      { id: 'decoderMastery', icon: '🏅', label: 'Decoder Mastery',   desc: 'Your personal log of every body-language signal you have decoded across species.' },
      { id: 'cost',         icon: '💵', label: 'Lifetime Cost Calc',   desc: 'First-year + annual + emergency fund. Time + space too.' },
      { id: 'lifespan',     icon: '⏳', label: 'Lifespan Match',       desc: '10 species/breeds. Pick the typical lifespan range from 5 buckets (under 3 yrs through 50+ yrs). Surfaces the surprising spread — hamsters die in 2–3 yrs while macaws and tortoises outlive their owners.' },
      { id: 'diagrams',     icon: '🔬', label: 'Diagrams',             desc: '4 SVG schematics: dog vs cat skull, bird air sacs, operant loop, body language.' },
      { id: 'aiPractice',   icon: '🤖', label: 'AI Practice',          desc: '6 real-world scenarios. AI critiques your reasoning vs welfare rubric.' },
      { id: 'famous',       icon: '🌟', label: 'Famous Animals',       desc: 'Pavlov, Skinner, Alex, Koko, Endal, Hachikō, Balto, Stubby, Belyaev foxes.' },
      { id: 'glossary',     icon: '📖', label: 'Glossary',             desc: '18 ethology + animal-care terms.' },
      { id: 'myths',        icon: '🧐', label: 'Myths Busted',         desc: '7 sourced corrections: alpha theory, pit bull jaws, more.' },
      { id: 'careers',      icon: '🧰', label: 'Career Pathways',      desc: 'Vet, vet tech, behaviorist, trainer, rehabber, more.' },
      { id: 'action',       icon: '🌱', label: 'Take Action',          desc: 'Concrete steps at home, school, community, civically.' },
      { id: 'quiz',         icon: '📝', label: '15-question quiz',     desc: 'Test your understanding across the lab.' },
      { id: 'resources',    icon: '📚', label: 'Resources',            desc: 'Every org cited in this tool.' },
      { id: 'teacher',      icon: '🎓', label: 'Teacher Guide',        desc: 'NGSS alignment, prompts, hands-on activities.' }
    ];

    function renderMenu() {
      var visitedCount = Object.keys(modulesVisited).length;
      function startHereCard() {
        var s;
        if (visitedCount === 0) {
          s = { header: '👋 First time here? Try this 5-tile path:',
                body: 'Start with 🐕 Dogs (most familiar), then 🐈 Cats, then 🦠 Zoonoses (Maine ticks!), then ♿ Service & Support Animals, then 📝 the quiz. About 30 minutes.' };
        } else if (visitedCount < 5) {
          s = { header: '👍 Already started — keep going:',
                body: 'Open 2 more species tiles, then 🎯 Pet Training (applied) and 🧬 Domestication & Breeding to see how operant theory + selective breeding shape modern pets.' };
        } else if (visitedCount < 12) {
          s = { header: '🚀 Branch into applied + values:',
                body: '🏠 Pet Picker (find your match), 💵 Lifetime Cost Calc (be honest with yourself), 🌱 Take Action.' };
        } else {
          s = { header: '🏁 You\'ve gone broad — capstone moves:',
                body: '📝 the 15-Q quiz, 🎓 Teacher Guide, and the 🧐 Myths page if you haven\'t.' };
        }
        return h('div', { className: 'petslab-start-card', role: 'region', 'aria-label': 'Recommended path through the lab',
          style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, s.header),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 } }, s.body));
      }
      function renderMenuTile(tile, compact) {
        var visited = !!modulesVisited[tile.id];
        return h('div', { key: tile.id, role: 'listitem', className: 'petslab-tile-wrap' },
          h('button', {
            type: 'button', 'data-pets-focusable': true,
            className: 'petslab-menu-tile' + (compact ? ' petslab-menu-tile--compact' : ''),
            'aria-label': tile.label + (visited ? ' (visited)' : ''),
            onClick: function() { upd('view', tile.id); markVisited(tile.id); petsAnnounce('Opening ' + tile.label); },
            style: btn({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: 14, background: T.card, cursor: 'pointer', borderColor: visited ? T.accent : T.border })
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
              h('span', { style: { fontWeight: 700, fontSize: 14, flex: 1 } }, tile.label),
              visited && h('span', { 'aria-hidden': 'true', style: { color: T.accent, fontSize: 14 } }, '\u2713')
            ),
            h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } }, tile.desc)
          )
        );
      }
      var featuredIds = ['careSim', 'picker', 'bodyLang', 'training', 'quiz'];
      var featuredTiles = featuredIds.map(function(id) { return MENU_TILES.filter(function(tile) { return tile.id === id; })[0]; }).filter(Boolean);
      var catalogTiles = MENU_TILES.filter(function(tile) { return featuredIds.indexOf(tile.id) < 0; });
      var _decoderUnique = Object.keys(decoderMastery || {}).length;
      return h('main', { className: 'petslab-menu-shell', 'data-petslab-tool': 'true' },
        decoderCelebOverlay(),
        h('header', { className: 'petslab-command', 'data-petslab-mission': 'true', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 } },
          h('h2', { style: { margin: 0, fontSize: 22 } }, '🐾 Science of Pets Lab'),
          h('div', { className: 'petslab-command-stats' },
            h('div', { className: 'petslab-command-stat' }, h('span', { className: 'petslab-command-stat-label' }, 'Modules explored'), h('strong', { className: 'petslab-command-stat-value' }, visitedCount + ' / ' + (MENU_TILES.length - 2))),
            h('div', { className: 'petslab-command-stat', 'aria-label': 'Decoder mastery: ' + _decoderUnique + ' of 27 signals decoded' }, h('span', { className: 'petslab-command-stat-label' }, 'Decoder mastery'),
              h('span', { 'aria-hidden': 'true' }, '🏅 '),
              h('strong', { className: 'petslab-command-stat-value', style: { color: _decoderUnique > 0 ? T.accentHi : T.text } }, _decoderUnique + ' / 27')
            ),
            h('div', { className: 'petslab-command-stat' }, h('span', { className: 'petslab-command-stat-label' }, 'Badges'), h('strong', { className: 'petslab-command-stat-value' }, String(Object.keys(badges).length))),
            h('div', { className: 'petslab-command-stat' }, h('span', { className: 'petslab-command-stat-label' }, 'Recommended next'), h('strong', { className: 'petslab-command-stat-value' }, visitedCount < 5 ? 'Learn essentials' : visitedCount < 12 ? 'Apply the science' : 'Capstone'))
          )
        ),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          'How companion animals actually work — the physiology, behavior, genetics, and welfare science behind the pets in our lives. Pair with ',
          h('strong', { style: { color: T.text } }, 'BehaviorLab'), ' for operant-conditioning theory and ',
          h('strong', { style: { color: T.text } }, 'EvolutionLab'), ' for natural-selection theory.'),
        startHereCard(),
        h('section', { 'aria-labelledby': 'petslab-featured-heading' },
          h('div', { className: 'petslab-featured-heading' },
            h('div', null, h('h3', { id: 'petslab-featured-heading' }, 'Start an investigation'), h('p', null, 'Choose a high-impact activity, then open the full catalog when you are ready.')),
            h('span', { style: { color: T.accentHi, fontSize: 10, fontWeight: 900 } }, '5 FEATURED')
          ),
          h('div', { className: 'petslab-featured-grid', role: 'list' }, featuredTiles.map(function(tile) { return renderMenuTile(tile, false); }))
        ),
        h('details', { className: 'petslab-catalog' },
          h('summary', null, 'Browse all pet-science modules (' + catalogTiles.length + ' more)'),
          h('div', { className: 'petslab-catalog-grid', role: 'list' }, catalogTiles.map(function(tile) { return renderMenuTile(tile, true); }))
        ),
        Object.keys(badges).length > 0 && h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, '🏅 Badges earned'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            Object.keys(badges).map(function(bid) {
              return h('span', { key: bid, style: { fontSize: 11, padding: '4px 10px', borderRadius: '999rem', background: T.accent, color: '#1f1612', fontWeight: 700 } }, badges[bid].label || bid);
            }))),
        // ═══ CARE TRADEOFF inquiry widget (H7b'') ═══
        h('details', { className: 'petslab-inquiry-disclosure' },
          h('summary', null, 'Advanced inquiry: model a care tradeoff'),
          h('div', { className: 'petslab-inquiry-body' },
        (function() {
          var iq = d.careTradeoff || { food: 50, exercise: 50, social: 50, vet: 50, training: 50, species: 'dog', hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('careTradeoff', Object.assign({}, iq, patch)); }
          function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
          // species multipliers
          var sp = ({
            dog: { food: 1.0, exercise: 1.2, social: 1.1, vet: 1.0, training: 1.2, label: '🐕 Dog' },
            cat: { food: 0.7, exercise: 0.5, social: 0.6, vet: 0.9, training: 0.7, label: '🐈 Cat' },
            rabbit: { food: 0.5, exercise: 0.8, social: 0.7, vet: 1.1, training: 0.6, label: '🐰 Rabbit' },
            parrot: { food: 0.4, exercise: 0.6, social: 1.3, vet: 1.2, training: 1.0, label: '🦜 Parrot' },
            reptile: { food: 0.2, exercise: 0.2, social: 0.1, vet: 0.8, training: 0.3, label: '🦎 Reptile' }
          })[iq.species] || { food: 1, exercise: 1, social: 1, vet: 1, training: 1, label: '🐾 Pet' };
          // welfare score (each is need_provided vs need_required)
          function gap(provided, mult) { var need = mult * 50; return Math.max(0, need - provided) + Math.max(0, provided - need - 20) * 0.3; }
          var gFood = gap(iq.food, sp.food);
          var gEx = gap(iq.exercise, sp.exercise);
          var gSoc = gap(iq.social, sp.social);
          var gVet = gap(iq.vet, sp.vet);
          var gTrain = gap(iq.training, sp.training);
          var totalGap = gFood + gEx + gSoc + gVet + gTrain;
          var state = totalGap < 15 ? 'thriving' : totalGap < 40 ? 'healthy' : totalGap < 80 ? 'compromised' : totalGap < 130 ? 'atrisk' : 'crisis';
          var sm = ({
            thriving: { label: 'Thriving', color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: 'All five welfare domains met. Animal is comfortable, expressing natural behavior.' },
            healthy: { label: 'Healthy', color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: 'Minor mismatches — adjust one or two domains for optimal welfare.' },
            compromised: { label: 'Compromised', color: '#facc15', bg: '#2a2410', border: '#eab308', desc: 'Visible welfare concerns — likely behavioral or physical signs of unmet needs.' },
            atrisk: { label: 'At risk', color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: 'Serious deficits across multiple domains. Long-term harm if not addressed.' },
            crisis: { label: 'Welfare crisis', color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: 'Severe neglect or overprovision pattern. Veterinary/behavioral intervention indicated.' }
          })[state];
          var domains = [
            { k: 'food', label: 'Food/nutrition', provided: iq.food, gap: gFood, need: sp.food * 50 },
            { k: 'exercise', label: 'Exercise', provided: iq.exercise, gap: gEx, need: sp.exercise * 50 },
            { k: 'social', label: 'Social contact', provided: iq.social, gap: gSoc, need: sp.social * 50 },
            { k: 'vet', label: 'Vet care', provided: iq.vet, gap: gVet, need: sp.vet * 50 },
            { k: 'training', label: 'Training/enrichment', provided: iq.training, gap: gTrain, need: sp.training * 50 }
          ];
          // Larger SVG radar geometry plus a species/state vignette.
          var radarW = 440;
          var radarH = 350;
          var centerX = 220;
          var centerY = 160;
          var radius = 98;
          var labelRadius = 130;
          var n = 5;
          function radarPoint(value, i, rMax) {
            var angle = -Math.PI / 2 + (i * 2 * Math.PI / n);
            var r = (Math.min(100, value) / 100) * rMax;
            return [centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r];
          }
          var pts = domains.map(function(domain, i) { return radarPoint(domain.provided, i, radius); });
          var needPts = domains.map(function(domain, i) { return radarPoint(domain.need, i, radius); });
          var labelPts = domains.map(function(_, i) {
            var angle = -Math.PI / 2 + (i * 2 * Math.PI / n);
            return [centerX + Math.cos(angle) * labelRadius, centerY + Math.sin(angle) * labelRadius];
          });
          var radarLabelLines = [
            ['Food /', 'nutrition'],
            ['Exercise'],
            ['Social', 'contact'],
            ['Vet care'],
            ['Training /', 'enrichment']
          ];
          var stateRank = ({ thriving: 0, healthy: 1, compromised: 2, atrisk: 3, crisis: 4 })[state];
          var stateMark = ({ thriving: 'STAR', healthy: 'CHECK', compromised: '!', atrisk: '!!', crisis: 'SOS' })[state];
          var worstDomain = domains.reduce(function(worst, domain) {
            return domain.gap > worst.gap ? domain : worst;
          }, domains[0]);
          var radarSummary = domains.map(function(domain) {
            return domain.label + ': provided ' + domain.provided + ', species need ' + domain.need.toFixed(0);
          }).join('. ') + '. Welfare state: ' + sm.label + '.';
          function provisionOpacity(value) {
            return 0.18 + (Math.min(100, value) / 100) * 0.82;
          }
          function vignetteFace(x, y) {
            var calm = stateRank <= 1;
            return h('g', { transform: 'translate(' + x + ' ' + y + ')' },
              calm
                ? h('ellipse', { cx: 0, cy: 0, rx: 4.5, ry: 4, fill: '#24150f' })
                : h('path', { d: 'M -5 0 Q 0 ' + (stateRank >= 3 ? 2 : -2) + ' 5 0', fill: 'none', stroke: '#24150f', strokeWidth: 2.5, strokeLinecap: 'round' }),
              calm && h('circle', { cx: 1.5, cy: -1.5, r: 1.2, fill: '#fff8e7' }),
              h('path', {
                d: calm ? 'M 4 11 Q 10 16 16 10' : 'M 4 14 Q 10 8 16 14',
                fill: 'none', stroke: '#6b3027', strokeWidth: 2.4, strokeLinecap: 'round'
              })
            );
          }
          function renderTradeoffAnimalShape() {
            var calmClass = 'petslab-tradeoff-animal' + (stateRank <= 1 ? ' is-calm' : '');
            var postureY = stateRank * 5;
            if (iq.species === 'cat') {
              return h('g', null,
                h('ellipse', { cx: 183, cy: 226, rx: 76, ry: 12, fill: '#2b1b14', opacity: 0.25 }),
                h('g', { transform: 'translate(0 ' + postureY + ')' },
                  h('g', { className: calmClass },
                    h('path', {
                      d: stateRank >= 3 ? 'M 116 183 Q 74 204 96 225' : 'M 116 181 Q 73 139 84 111 Q 100 149 123 158',
                      fill: 'none', stroke: '#65513f', strokeWidth: 15, strokeLinecap: 'round'
                    }),
                    h('ellipse', { cx: 173, cy: 184, rx: 62, ry: stateRank >= 3 ? 31 : 39, fill: '#75604d' }),
                    h('ellipse', { cx: 189, cy: 196, rx: 38, ry: 20, fill: '#a9947f', opacity: 0.72 }),
                    h('circle', { cx: 225, cy: 151 + stateRank * 2, r: 34, fill: '#75604d' }),
                    h('path', { d: 'M 201 ' + (134 + stateRank * 2) + ' L 207 ' + (107 + stateRank * 4) + ' L 220 ' + (132 + stateRank * 2) + ' Z', fill: '#65513f' }),
                    h('path', { d: 'M 229 ' + (130 + stateRank * 2) + ' L 248 ' + (108 + stateRank * 4) + ' L 251 ' + (140 + stateRank * 2) + ' Z', fill: '#65513f' }),
                    h('path', { d: 'M 159 203 Q 157 220 151 227 M 198 207 Q 205 220 210 227', fill: 'none', stroke: '#65513f', strokeWidth: 12, strokeLinecap: 'round' }),
                    vignetteFace(231, 149 + stateRank * 2)
                  )
                )
              );
            }
            if (iq.species === 'rabbit') {
              return h('g', null,
                h('ellipse', { cx: 183, cy: 226, rx: 73, ry: 12, fill: '#2b1b14', opacity: 0.25 }),
                h('g', { transform: 'translate(0 ' + postureY + ')' },
                  h('g', { className: calmClass },
                    h('ellipse', { cx: 170, cy: 187, rx: 64, ry: stateRank >= 3 ? 34 : 43, fill: '#b8a18d' }),
                    h('circle', { cx: 226, cy: 158 + stateRank * 2, r: 33, fill: '#c5af9b' }),
                    h('path', {
                      d: stateRank >= 3
                        ? 'M 211 ' + (135 + stateRank * 2) + ' Q 176 110 187 89 Q 213 103 221 136 Z'
                        : 'M 211 137 Q 190 91 205 62 Q 228 91 225 139 Z',
                      fill: '#a98f7a'
                    }),
                    h('path', {
                      d: stateRank >= 3
                        ? 'M 229 ' + (133 + stateRank * 2) + ' Q 247 100 268 102 Q 267 128 245 143 Z'
                        : 'M 229 137 Q 224 84 245 58 Q 259 99 243 143 Z',
                      fill: '#b69b85'
                    }),
                    h('path', { d: 'M 140 207 Q 132 220 126 227 M 191 211 Q 198 221 205 227', fill: 'none', stroke: '#9e856f', strokeWidth: 13, strokeLinecap: 'round' }),
                    h('circle', { cx: 109, cy: 178, r: 15, fill: '#eee0d0' }),
                    vignetteFace(232, 155 + stateRank * 2)
                  )
                )
              );
            }
            if (iq.species === 'parrot') {
              return h('g', null,
                h('path', { d: 'M 103 226 H 270', stroke: '#795238', strokeWidth: 12, strokeLinecap: 'round' }),
                h('path', { d: 'M 126 226 V 250 M 248 226 V 250', stroke: '#5b3a2a', strokeWidth: 8, strokeLinecap: 'round' }),
                h('g', { transform: 'translate(0 ' + postureY + ')' },
                  h('g', { className: calmClass },
                    h('ellipse', { cx: 183, cy: 174 + stateRank * 2, rx: stateRank >= 3 ? 42 : 46, ry: stateRank >= 3 ? 51 : 62, fill: '#4f8f6b' }),
                    h('ellipse', { cx: 169, cy: 183 + stateRank * 2, rx: 28, ry: 45, fill: '#2f7151' }),
                    h('circle', { cx: 205, cy: 121 + stateRank * 3, r: 34, fill: '#68a97f' }),
                    h('path', { d: 'M 231 ' + (119 + stateRank * 3) + ' L 261 ' + (130 + stateRank * 3) + ' L 231 ' + (139 + stateRank * 3) + ' Z', fill: '#e2ae42', stroke: '#8d6524', strokeWidth: 2 }),
                    h('path', { d: 'M 168 219 Q 162 231 160 239 M 198 219 Q 201 231 204 239', fill: 'none', stroke: '#b18c58', strokeWidth: 7, strokeLinecap: 'round' }),
                    h('path', { d: 'M 165 215 L 151 252 L 181 222', fill: '#2b6c4d' }),
                    vignetteFace(210, 119 + stateRank * 3)
                  )
                )
              );
            }
            if (iq.species === 'reptile') {
              return h('g', null,
                h('ellipse', { cx: 185, cy: 226, rx: 91, ry: 12, fill: '#2b1b14', opacity: 0.25 }),
                h('g', { transform: 'translate(0 ' + postureY + ')' },
                  h('g', { className: calmClass },
                    h('path', {
                      d: stateRank >= 3 ? 'M 120 195 Q 78 218 105 225' : 'M 120 194 Q 73 174 48 191 Q 83 191 112 207',
                      fill: 'none', stroke: '#618854', strokeWidth: 13, strokeLinecap: 'round'
                    }),
                    h('ellipse', { cx: 176, cy: 197, rx: 65, ry: stateRank >= 3 ? 25 : 30, fill: '#739c61' }),
                    h('ellipse', { cx: 231, cy: 187 + stateRank * 2, rx: 38, ry: 27, fill: '#7fa86d' }),
                    h('path', { d: 'M 146 209 L 128 225 M 165 211 L 174 228 M 214 207 L 201 225 M 238 204 L 250 219', fill: 'none', stroke: '#577a4c', strokeWidth: 9, strokeLinecap: 'round' }),
                    h('path', { d: 'M 141 188 L 153 174 L 164 191 M 178 181 L 189 168 L 199 188', fill: '#8db37a' }),
                    vignetteFace(239, 183 + stateRank * 2)
                  )
                )
              );
            }
            return h('g', null,
              h('ellipse', { cx: 184, cy: 226, rx: 78, ry: 12, fill: '#2b1b14', opacity: 0.25 }),
              h('g', { transform: 'translate(0 ' + postureY + ')' },
                h('g', { className: calmClass },
                  h('path', {
                    d: stateRank >= 3 ? 'M 122 184 Q 83 208 103 226' : 'M 123 180 Q 79 150 91 121',
                    fill: 'none', stroke: '#aa6d36', strokeWidth: 17, strokeLinecap: 'round'
                  }),
                  h('ellipse', { cx: 174, cy: 183, rx: 64, ry: stateRank >= 3 ? 34 : 42, fill: '#c9894b' }),
                  h('ellipse', { cx: 190, cy: 194, rx: 37, ry: 24, fill: '#f0d3ad', opacity: 0.78 }),
                  h('circle', { cx: 229, cy: 148 + stateRank * 2, r: 37, fill: '#d89a58' }),
                  h('path', { d: 'M 204 ' + (134 + stateRank * 2) + ' Q 183 117 187 153 Q 193 168 211 160 Z', fill: '#965a2b' }),
                  h('path', { d: 'M 238 ' + (127 + stateRank * 2) + ' Q 264 112 260 150 Q 253 162 241 157 Z', fill: '#9b5b2a' }),
                  h('ellipse', { cx: 251, cy: 159 + stateRank * 2, rx: 23, ry: 17, fill: '#f3d9b9' }),
                  h('path', { d: 'M 146 207 Q 144 220 139 228 M 194 210 Q 202 221 207 228', fill: 'none', stroke: '#ad6c35', strokeWidth: 14, strokeLinecap: 'round' }),
                  h('path', { d: 'M 212 173 Q 229 181 248 168', fill: 'none', stroke: '#315b78', strokeWidth: 8, strokeLinecap: 'round' }),
                  vignetteFace(235, 146 + stateRank * 2)
                )
              )
            );
          }
          function renderTradeoffVignette() {
            var watchLabel = worstDomain.gap < 5 ? 'Closest watch' : 'Largest mismatch';
            var vignetteDesc = sp.label + ' welfare vignette. Current state: ' + sm.label + '. ' +
              watchLabel + ': ' + worstDomain.label + ', gap score ' + worstDomain.gap.toFixed(1) + '. ' +
              'Food ' + iq.food + ', exercise ' + iq.exercise + ', social contact ' + iq.social +
              ', vet care ' + iq.vet + ', and training or enrichment ' + iq.training + '.';
            return h('div', { className: 'petslab-tradeoff-vignette' },
              h('svg', {
                viewBox: '0 0 360 270',
                role: 'img',
                'aria-labelledby': 'pets-tradeoff-animal-title pets-tradeoff-animal-desc',
                preserveAspectRatio: 'xMidYMid meet'
              },
                h('title', { id: 'pets-tradeoff-animal-title' }, sp.label + ' welfare state: ' + sm.label),
                h('desc', { id: 'pets-tradeoff-animal-desc' }, vignetteDesc),
                h('defs', null,
                  h('linearGradient', { id: 'pets-tradeoff-wall', x1: 0, y1: 0, x2: 0, y2: 1 },
                    h('stop', { offset: '0%', stopColor: '#f2dfc4' }),
                    h('stop', { offset: '100%', stopColor: '#cda77d' })
                  ),
                  h('linearGradient', { id: 'pets-tradeoff-floor', x1: 0, y1: 0, x2: 0, y2: 1 },
                    h('stop', { offset: '0%', stopColor: '#9a704d' }),
                    h('stop', { offset: '100%', stopColor: '#65442f' })
                  )
                ),
                h('rect', { x: 0, y: 0, width: 360, height: 190, fill: 'url(#pets-tradeoff-wall)' }),
                h('rect', { x: 0, y: 190, width: 360, height: 80, fill: 'url(#pets-tradeoff-floor)' }),
                h('rect', { x: 0, y: 184, width: 360, height: 10, fill: '#fff1dc' }),
                h('path', { d: 'M 0 220 H 360 M 0 250 H 360 M 62 190 L 44 270 M 132 190 L 123 270 M 228 190 L 237 270 M 298 190 L 316 270', stroke: '#503322', strokeWidth: 1.5, opacity: 0.35 }),
                h('ellipse', { cx: 184, cy: 230, rx: 112, ry: 26, fill: '#9f4f45', opacity: 0.74 }),
                h('ellipse', { cx: 184, cy: 230, rx: 88, ry: 18, fill: 'none', stroke: '#dda081', strokeWidth: 2, opacity: 0.72 }),
                // Food bowl: the fill becomes visually stronger as provision rises.
                h('g', { opacity: provisionOpacity(iq.food) },
                  h('ellipse', { cx: 38, cy: 231, rx: 24, ry: 7, fill: '#2f4050' }),
                  h('path', { d: 'M 17 220 H 59 L 54 233 H 22 Z', fill: '#607386', stroke: '#d7e1e7', strokeWidth: 1.5 }),
                  h('ellipse', { cx: 38, cy: 220, rx: 17, ry: 4.5, fill: '#ad6a35' })
                ),
                // Exercise, social, veterinary, and enrichment props track their sliders.
                h('g', { opacity: provisionOpacity(iq.exercise) },
                  h('circle', { cx: 82, cy: 232, r: 13, fill: '#d06151', stroke: '#f5d18c', strokeWidth: 2 }),
                  h('path', { d: 'M 71 226 Q 82 236 93 226', fill: 'none', stroke: '#f5d18c', strokeWidth: 2 })
                ),
                h('g', { opacity: provisionOpacity(iq.social) },
                  h('rect', { x: 286, y: 41, width: 52, height: 46, rx: 8, fill: '#fff1dc', stroke: '#9b6c4a', strokeWidth: 2 }),
                  h('path', { d: 'M 312 74 C 297 64 300 51 312 58 C 324 51 327 64 312 74 Z', fill: '#c65353' })
                ),
                h('g', { opacity: provisionOpacity(iq.vet) },
                  h('rect', { x: 298, y: 112, width: 40, height: 44, rx: 6, fill: '#f4eee5', stroke: '#8a684d', strokeWidth: 2 }),
                  h('rect', { x: 313, y: 119, width: 10, height: 30, rx: 2, fill: '#b84b4b' }),
                  h('rect', { x: 305, y: 129, width: 26, height: 10, rx: 2, fill: '#b84b4b' })
                ),
                h('g', { opacity: provisionOpacity(iq.training) },
                  h('rect', { x: 276, y: 216, width: 23, height: 23, rx: 4, fill: '#d6a542', stroke: '#fff0b8', strokeWidth: 1.5 }),
                  h('rect', { x: 301, y: 228, width: 23, height: 23, rx: 4, fill: '#4e8192', stroke: '#c9eef4', strokeWidth: 1.5 }),
                  h('circle', { cx: 313, cy: 224, r: 7, fill: '#6f4f8f', stroke: '#eadffc', strokeWidth: 1.5 })
                ),
                renderTradeoffAnimalShape(),
                h('g', { transform: 'translate(12 12)' },
                  h('rect', { x: 0, y: 0, width: 142, height: 31, rx: 15.5, fill: '#20150f', fillOpacity: 0.9, stroke: sm.color, strokeWidth: 2 }),
                  h('rect', { x: 8, y: 7, width: 36, height: 17, rx: 8.5, fill: sm.color }),
                  h('text', { x: 26, y: 19, textAnchor: 'middle', fill: '#17100d', fontSize: 9, fontWeight: 950 }, stateMark),
                  h('text', { x: 51, y: 20, fill: '#fff5e5', fontSize: 12, fontWeight: 900 }, sm.label)
                )
              ),
              h('div', { className: 'petslab-tradeoff-vignette-caption' },
                h('span', null,
                  h('strong', { style: { display: 'block', color: sm.color, fontSize: 11 } }, stateMark + ' ' + sm.label),
                  'Posture and expression follow the total mismatch.'
                ),
                h('span', { style: { color: '#e8d5b7', textAlign: 'right' } },
                  watchLabel + ': ', h('strong', { style: { color: '#fef3e2' } }, worstDomain.label),
                  ' (gap ' + worstDomain.gap.toFixed(1) + ')'
                )
              )
            );
          }
          return h('div', { className: 'petslab-care-tradeoff', style: { marginTop: 14, padding: 14, borderRadius: 12, background: 'linear-gradient(145deg, #2d2018 0%, ' + sm.bg + ' 100%)', border: '1px solid ' + sm.border, color: '#e8f0f5' } },
            h('h4', { style: { margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, '⚖️ Care Tradeoff — Inquiry Widget'),
            h('p', { style: { margin: '0 0 8px', fontSize: 11, opacity: 0.85, lineHeight: 1.4 } }, 'Pick a species. Set five care domains. Predict where mismatches with species-typical needs will show up. No score, no reveal — you mark your own understanding.'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 } },
              ['dog', 'cat', 'rabbit', 'parrot', 'reptile'].map(function(s) {
                var active = iq.species === s;
                return h('button', {
                  key: s,
                  'aria-pressed': active,
                  onClick: function() { setKey('species', s); },
                  style: { padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + (active ? sm.color : '#1e293b'), background: active ? sm.color : '#0a0a1a', color: active ? '#000' : '#94a3b8', cursor: 'pointer' }
                }, ({ dog: '🐕', cat: '🐈', rabbit: '🐰', parrot: '🦜', reptile: '🦎' })[s] + ' ' + s + (active ? ' \u2713' : ''));
              })
            ),
            h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: '999rem', background: sm.color, color: '#000', fontSize: 10, fontWeight: 800, marginBottom: 6 } }, sp.label + ' — ' + sm.label),
            h('p', { style: { margin: '0 0 10px', fontSize: 10, opacity: 0.8 } }, sm.desc),
            h('div', { className: 'petslab-tradeoff-dashboard' },
              h('div', { className: 'petslab-tradeoff-panel' },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 3 } },
                  h('strong', { style: { color: '#fef3e2', fontSize: 12 } }, 'Care balance radar'),
                  h('span', { style: { color: '#bda891', fontSize: 9 } }, 'Scale 0-100')
                ),
                h('svg', {
                  className: 'petslab-tradeoff-radar',
                  viewBox: '0 0 ' + radarW + ' ' + radarH,
                  role: 'img',
                  'aria-labelledby': 'pets-tradeoff-radar-title pets-tradeoff-radar-desc',
                  preserveAspectRatio: 'xMidYMid meet'
                },
                  h('title', { id: 'pets-tradeoff-radar-title' }, sm.label + ' care balance for ' + sp.label),
                  h('desc', { id: 'pets-tradeoff-radar-desc' }, radarSummary),
                  h('rect', { x: 0, y: 0, width: radarW, height: radarH, rx: 14, fill: '#17100d' }),
                  h('circle', { cx: centerX, cy: centerY, r: radius + 18, fill: '#2c1f18', opacity: 0.42 }),
                  [0.25, 0.5, 0.75, 1.0].map(function(level, i) {
                    var ring = domains.map(function(_, axis) {
                      return radarPoint(level * 100, axis, radius);
                    });
                    return h('polygon', {
                      key: 'ring-' + i,
                      points: ring.map(function(p) { return p[0] + ',' + p[1]; }).join(' '),
                      fill: i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'none',
                      stroke: '#7c6655',
                      strokeWidth: i === 3 ? 1.5 : 1,
                      strokeDasharray: i === 3 ? null : '3 5',
                      opacity: i === 3 ? 0.72 : 0.48
                    });
                  }),
                  // Five spokes make each domain axis unambiguous.
                  domains.map(function(_, i) {
                    var outer = radarPoint(100, i, radius);
                    return h('line', {
                      key: 'spoke-' + i,
                      x1: centerX, y1: centerY, x2: outer[0], y2: outer[1],
                      stroke: '#9b816c', strokeWidth: 1.25, opacity: 0.66
                    });
                  }),
                  [25, 50, 75, 100].map(function(value) {
                    return h('text', {
                      key: 'scale-' + value,
                      className: 'petslab-tradeoff-radar-scale',
                      x: centerX + (value / 100) * radius - 2,
                      y: centerY - 5,
                      textAnchor: 'end', fill: '#aa9584', fontSize: 9, fontWeight: 700
                    }, String(value));
                  }),
                  // Need is dashed with square markers; provided is solid with circles.
                  h('polygon', {
                    points: needPts.map(function(p) { return p[0] + ',' + p[1]; }).join(' '),
                    fill: 'none', stroke: '#f6d7a7', strokeWidth: 2.5, strokeDasharray: '8 6',
                    strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke'
                  }),
                  needPts.map(function(p, i) {
                    return h('rect', {
                      key: 'need-' + i, x: p[0] - 4, y: p[1] - 4, width: 8, height: 8,
                      fill: '#17100d', stroke: '#f6d7a7', strokeWidth: 2,
                      vectorEffect: 'non-scaling-stroke'
                    });
                  }),
                  h('polygon', {
                    points: pts.map(function(p) { return p[0] + ',' + p[1]; }).join(' '),
                    fill: sm.color + '2e', stroke: sm.color, strokeWidth: 3,
                    strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke'
                  }),
                  pts.map(function(p, i) {
                    return h('circle', {
                      key: 'provided-' + i, cx: p[0], cy: p[1], r: 5,
                      fill: '#17100d', stroke: sm.color, strokeWidth: 3,
                      vectorEffect: 'non-scaling-stroke'
                    });
                  }),
                  // Full labels and P/N values remain readable without the legend color.
                  labelPts.map(function(lp, i) {
                    var anchor = i === 0 ? 'middle' : (i === 1 || i === 2 ? 'start' : 'end');
                    var lines = radarLabelLines[i];
                    var labelY = lp[1] - ((lines.length - 1) * 10);
                    return h('text', {
                      key: 'label-' + i,
                      className: 'petslab-tradeoff-radar-axis',
                      x: lp[0], y: labelY, textAnchor: anchor,
                      fill: '#f5e8d6', fontSize: 15, fontWeight: 800
                    },
                      lines.map(function(line, lineIndex) {
                        return h('tspan', {
                          key: 'label-line-' + lineIndex,
                          x: lp[0], dy: lineIndex === 0 ? 0 : 20
                        }, line);
                      }),
                      h('tspan', {
                        className: 'petslab-tradeoff-radar-value',
                        x: lp[0], dy: 20, fill: sm.color, fontSize: 12, fontWeight: 900
                      }, 'P ' + domains[i].provided + ' / N ' + domains[i].need.toFixed(0))
                    );
                  })
                ),
                h('div', { className: 'petslab-tradeoff-legend', role: 'list', 'aria-label': 'Radar chart legend' },
                  h('span', { className: 'petslab-tradeoff-legend-item', role: 'listitem' },
                    h('span', { className: 'petslab-tradeoff-legend-swatch', style: { borderTopColor: sm.color }, 'aria-hidden': 'true' }),
                    h('span', null, 'Circle + solid = provided')
                  ),
                  h('span', { className: 'petslab-tradeoff-legend-item', role: 'listitem' },
                    h('span', { className: 'petslab-tradeoff-legend-swatch is-need', 'aria-hidden': 'true' }),
                    h('span', null, 'Square + dashed = species need')
                  )
                )
              ),
              renderTradeoffVignette()
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
              h('div', { style: { fontWeight: 800, fontSize: 11, color: '#fef3e2' } }, 'Gap analysis (provided vs species need)'),
              h('span', { style: { color: '#bda891', fontSize: 9 } }, 'P = provided / N = need')
            ),
            h('div', { className: 'petslab-tradeoff-domain-grid' },
              domains.map(function(domain) {
                var sev = domain.gap < 5 ? '#4ade80' : domain.gap < 15 ? '#facc15' : domain.gap < 30 ? '#fb923c' : '#f87171';
                var severityText = domain.gap < 5 ? 'low mismatch' : domain.gap < 15 ? 'moderate mismatch' : domain.gap < 30 ? 'large mismatch' : 'critical mismatch';
                var delta = domain.provided - domain.need;
                var relation = Math.abs(delta) < 0.5 ? 'at need'
                  : delta < 0 ? Math.abs(delta).toFixed(0) + ' below need'
                  : delta.toFixed(0) + ' above need';
                return h('div', { key: domain.k, className: 'petslab-tradeoff-domain' },
                  h('strong', null, domain.label),
                  h('div', { className: 'petslab-tradeoff-values' },
                    h('span', null, 'Provided', h('b', null, domain.provided)),
                    h('span', null, 'Need', h('b', null, domain.need.toFixed(0)))
                  ),
                  h('div', { style: { marginTop: 6, color: sev, fontSize: 9, fontWeight: 800, lineHeight: 1.3 } },
                    'Gap ' + domain.gap.toFixed(1) + ' - ' + severityText
                  ),
                  h('div', { style: { marginTop: 2, color: '#bda891', fontSize: 9, lineHeight: 1.25 } }, relation)
                );
              })
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '8px 10px', marginBottom: 10, borderRadius: 9, background: 'rgba(18,13,11,.66)', border: '1px solid ' + sm.border, fontSize: 10 } },
              h('span', { style: { color: '#e8d5b7', fontWeight: 800 } }, 'Total mismatch:'),
              h('span', { style: { color: sm.color, font: '900 15px/1 monospace' } }, totalGap.toFixed(1) + ' - ' + sm.label)
            ),            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px 10px', marginBottom: 10 } },
              domains.map(function(s) {
                return h('label', { key: s.k, style: { display: 'block', fontSize: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
                    h('span', null, s.label),
                    h('span', { style: { fontFamily: 'monospace', color: sm.color, fontWeight: 700 } }, s.provided)
                  ),
                  h('input', { type: 'range', min: 0, max: 100, step: 5, value: s.provided, 'aria-label': s.label + ' provided level', onChange: function(e) { setKey(s.k, parseInt(e.target.value, 10)); }, style: { width: '100%' } })
                );
              })
            ),
            h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
              h('button', { onClick: function() {
                var t = new Date().toISOString().slice(11, 19);
                setIQ({ log: iq.log.concat([{ t: t, sp: iq.species, gap: totalGap.toFixed(1), state: sm.label }]) });
              }, style: { flex: 1, padding: 6, fontSize: 10, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, '📋 Log this scenario'),
              h('button', { onClick: function() { setIQ({ food: 50, exercise: 50, social: 50, vet: 50, training: 50 }); }, style: { padding: '6px 10px', fontSize: 10, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, 'Reset')
            ),
            iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: '#0a0a1a', border: '1px solid #1e293b', marginBottom: 10, fontSize: 9, fontFamily: 'monospace', lineHeight: 1.4 } },
              iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.sp + ' · ' + e.state + ' · gap ' + e.gap); })
            ),
            h('label', { style: { display: 'block', fontSize: 10, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, 'Your hypothesis (which species is hardest to keep thriving — and why?)'),
            h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, 'aria-label': 'Pet welfare hypothesis', placeholder: 'e.g., parrots need high social provision because flock behavior...', style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 10, marginBottom: 10, resize: 'vertical' } }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, "🤔 I'm stuck — show open questions"),
            iq.stuckRevealed && h('div', { style: { padding: 8, borderRadius: 6, background: '#0a0a1a', border: '1px dashed ' + sm.border, fontSize: 10, marginBottom: 10, lineHeight: 1.5 } },
              h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, 'Open questions (no answer key)'),
              h('ul', { style: { margin: 0, paddingLeft: 16 } },
                h('li', null, 'Which two domains tend to trade off in your real household?'),
                h('li', null, 'When you switch species, which slider needs to move most? Why?'),
                h('li', null, 'Can over-provision (too much of one thing) cause a welfare issue? Where would you see it first?'),
                h('li', null, 'How would the radar shape differ for a working dog vs a companion dog?')
              )
            ),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
              h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
              h('span', null, 'I can explain why this species shows this welfare state at these slider settings.')
            ),
            iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, 'aria-label': 'Pet welfare explanation', placeholder: 'Explain in your own words...', style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 10, marginBottom: 6, resize: 'vertical' } }),
            h('p', { style: { margin: 0, fontSize: 9, fontStyle: 'italic', opacity: 0.6 } }, 'Inquiry widget — no score, no reveal, no answer dump. Welfare frameworks: Five Domains (Mellor 2017), Five Freedoms (Brambell 1965).')
          );
        })()
          )
        ),
        footer()
      );
    }

    // ─────────────────────────────────────────
    // SPECIES: DOGS
    // ─────────────────────────────────────────
    function renderDogs() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🐕 Dogs'),
        sourceCard('dogs'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Domestication: 15,000–40,000 years ago'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Dogs share a common ancestor with modern gray wolves but were NOT bred from them — both descend from an extinct Pleistocene wolf population. The current best estimate (Frantz 2016, Botigué 2017): ',
            h('strong', { style: { color: T.accentHi } }, 'a single domestication event between 15,000 and 40,000 years ago'),
            ', possibly in eastern Eurasia.'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            h('strong', { style: { color: T.text } }, 'Belyaev fox experiment'),
            ': starting 1959 in Soviet Siberia, geneticist Dmitry Belyaev selected silver foxes for one trait — tameness around humans. Within ~10 generations, foxes started showing all the classic "domestication syndrome" traits: floppy ears, curly tails, piebald coats, smaller adrenal glands, longer reproductive seasons. Showed that selecting for behavior alone drags physical traits along genetically.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'This means the dog\'s "look" and "personality" co-evolved as a package over thousands of generations of selection by ancient humans.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '👃 The dog nose: ~300 million olfactory receptors'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Humans have ~5 million olfactory receptors. Dogs have ~300 million. Their olfactory cortex is ~40× larger relative to brain size. Dogs also have a vomeronasal organ (Jacobson\'s organ) above the roof of the mouth for detecting pheromones.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Practical: a trained detection dog can find ',
            h('strong', { style: { color: T.accentHi } }, 'a teaspoon of sugar in an Olympic swimming pool of water'),
            '. Medical alert dogs detect blood-glucose changes (diabetes), seizure pre-states, and certain cancers — all from scent.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '⚠️ Lifespan paradox: bigger ≠ longer'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Across mammals, larger species generally live longer (mouse 2 yr, elephant 70 yr). But ',
            h('strong', { style: { color: T.text } }, 'within dogs the relationship REVERSES'),
            ': giant breeds (Great Dane, Irish Wolfhound) live 6–8 years; small breeds (Chihuahua, Toy Poodle) live 14–16 years. Hypotheses include accelerated growth → cellular damage and IGF-1 signaling differences.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Maine has a strong working-dog culture: sled dogs (Iditarod-class kennels in Bethel + Greenville), Labrador retrievers everywhere (Lab is named for Labrador, just to the north), coon hounds in rural Maine. Tick + Lyme density is among the highest in the US — see the Zoonoses tile. Cold-climate breeds (Husky, Malamute, Bernese) thrive; brachycephalic breeds (pugs, bulldogs) struggle in summer humidity.')),
        crossLink('Operant theory deep-dive', h('span', null,
          'For the science of how dogs learn — reinforcement schedules, shaping, extinction — open ',
          h('strong', { style: { color: T.text } }, 'BehaviorLab'), '. This tile focuses on dog-specific physiology + history; the Pet Training tile applies BehaviorLab\'s theory to real-world scenarios (housetraining, recall, leash, alone-time).')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: CATS
    // ─────────────────────────────────────────
    function renderCats() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🐈 Cats'),
        sourceCard('cats'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🥩 Obligate carnivore biochemistry'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Cats lost the metabolic ability to synthesize key nutrients during their evolution as strict meat-eaters. They MUST consume animal protein to obtain:'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Taurine'), ' — deficiency causes dilated cardiomyopathy + retinal degeneration. AAFCO commercial cat food guarantees minimums.'),
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Vitamin A'), ' — cats can\'t convert beta-carotene from plants to vitamin A like dogs/humans do.'),
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Arachidonic acid'), ' — required for inflammatory + reproductive function; absent in plant fats.'),
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Arginine'), ' — without it, ammonia builds up dangerously after a single meat-free meal.')),
          h('p', { style: { margin: '8px 0 0', color: T.warm, fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' } },
            'Vegan diets for cats are not an ethical choice — they\'re medical neglect. (AAFP 2017 position statement.)')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '👁️ Sensory world: built for low-light hunting'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('li', null, h('strong', { style: { color: T.text } }, 'Slit pupils'), ' that close to a vertical line — admit far less light at midday and far more at twilight.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Tapetum lucidum'), ' — reflective layer behind the retina that gives the eyeshine effect, doubling effective sensitivity in low light.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Whiskers (vibrissae)'), ' — embedded in 200+ nerve endings; map gap-width when navigating in the dark. Whisker fatigue from narrow food bowls is real.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Hearing range'), ' to ~64 kHz (human ~20 kHz, dog ~45 kHz) — they hear ultrasonic rodent calls.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Vision'), ' — dichromatic (similar to red-green color blind humans). Trade color for low-light + motion sensitivity.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '🗣️ The meow is for humans'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Adult feral cats almost never meow at each other — they communicate via body language, scent marking, and growls/hisses for conflict. The plaintive adult-cat ',
            h('em', null, '"meow"'),
            ' is a domestication artifact: it\'s acoustically optimized to grab human attention (similar frequency profile to a baby\'s cry — Nicastro 2004). Cats learned that humans respond to it; the trait persisted.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'The ',
            h('strong', { style: { color: T.accentHi } }, 'Maine Coon'),
            ' is the largest domestic cat breed and an actual Maine native — emerged from working farm cats in the late 1800s, with cold-adapted features (large size for thermal mass, water-resistant coat, tufted paws like snowshoes, ear tufts to keep ear canals warm). Official state cat of Maine since 1985. Origin myths (raccoon hybrid, Marie Antoinette\'s cats) are charming but biologically false — Maine Coons are ',
            h('em', null, 'Felis catus'),
            ' selected by Maine winters.')),
        crossLink('Cat training is real', h('span', null,
          'For the operant theory of how cats learn, see ', h('strong', { style: { color: T.text } }, 'BehaviorLab'),
          '. Cats train readily with food rewards + clickers — see the Pet Training tile. The "cats can\'t be trained" myth is in Myths Busted.')),
        crossLink('Two welfare topics specific to cats', h('span', null,
          'Two cat-welfare debates are worth understanding deeply: ',
          h('strong', { style: { color: T.text } }, 'declawing'),
          ' (it\'s amputation of the last bone of every toe — not nail trimming — and there are alternatives that work) and ',
          h('strong', { style: { color: T.text } }, 'outdoor vs indoor'),
          ' (free-roaming cats are the #1 human-caused source of US bird mortality, AND outdoor cats live ~3× shorter lives than indoor). See the ',
          h('strong', { style: { color: T.accentHi } }, 'Welfare & Ethics'),
          ' tile for the data + sources + practical alternatives.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: SMALL MAMMALS (rabbit / GP / hamster / ferret bundle)
    // ─────────────────────────────────────────
    function renderSmallMammals() {
      var list = [
        { name: 'Rabbit', icon: '🐰', life: '8–12 yr (indoor)',
          social: 'Bonded pair (rarely solo). Bonding takes weeks of supervised intros.',
          pitfall: 'Cages are inhumane — need a free-roam area or ≥4×4 ft pen. GI stasis is a real emergency: any rabbit not eating for 12+ hr needs a vet IMMEDIATELY.',
          chow: 'Unlimited grass hay (timothy / orchard). Limited pellets. Fresh leafy greens (NOT iceberg). No carrots as staple — too sugary.',
          cite: 'House Rabbit Society' },
        { name: 'Guinea pig', icon: '🐹', life: '5–8 yr',
          social: 'Strict herd animal. ILLEGAL to own solo in Switzerland. Bond a same-sex pair (or trio) — lifelong company.',
          pitfall: 'Vitamin C dependent (like humans + great apes — most mammals make their own). Need fresh bell pepper / parsley / GP-formulated pellets daily or get scurvy.',
          chow: 'Hay (~80% diet) + vitamin-C-stable pellets + fresh veggies daily.',
          cite: 'AVMA Companion Animal' },
        { name: 'Hamster', icon: '🐹', life: '2–3 yr',
          social: 'Strictly solitary. Two hamsters in one cage = fights to the death (especially Syrians).',
          pitfall: 'Most pet-store cages are far too small (need minimum 600 sq in floor space — Syrian hamsters). Wire wheels can damage feet — solid wheels only. Crepuscular: night shift.',
          chow: 'Seed/pellet mix + small fresh veggies. Avoid sugary fruits (diabetes risk in dwarves).',
          cite: 'AVMA + RSPCA' },
        { name: 'Ferret', icon: '🦦', life: '6–10 yr',
          social: 'Group animal — solo ferret = lonely ferret. Most happy in pairs/trios.',
          pitfall: 'Obligate carnivores (like cats — cannot eat plant-based food). Adrenal disease + insulinoma very common in older ferrets — vet care expensive. Strong odor even when descented.',
          chow: 'Ferret-specific kibble (high meat protein, low carb) OR raw/whole prey diet. NEVER dog food.',
          cite: 'AFA + AVMA Exotic Pet' }
      ];
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🐹 Small mammals'),
        sourceCard('smallMammals'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            'Often marketed as "starter pets" but most are LESS forgiving than dogs/cats: prey-species stress, fragile GI tracts, narrow diet windows, and species-specific social rules that the pet-store sells you wrong.')),
        list.map(function(p) {
          return h('div', { key: p.name, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, p.icon),
              h('strong', { style: { color: T.accentHi, fontSize: 15 } }, p.name),
              h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.warm, fontFamily: 'monospace' } }, p.life)),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.text } }, '👥 Social: '), p.social),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.danger } }, '⚠ Pitfall: '), p.pitfall),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.text } }, '🥗 Diet: '), p.chow),
            h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + p.cite));
        }),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Backyard rabbit + chicken hobby farms are common in rural Maine. Hawks, fishers, and weasels are constant predator pressures — outdoor enclosures need wire FLOORS too, not just sides. Maine winters mean rabbits + GP need above-freezing housing or a heated shed.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: BIRDS
    // ─────────────────────────────────────────
    function renderBirds() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🦜 Birds'),
        sourceCard('birds'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🫁 Air sacs: why birds are poison-canaries'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Birds don\'t breathe like mammals. Instead of two-way lung tidal flow, they have a one-way circulation through ',
            h('strong', { style: { color: T.accentHi } }, '9 air sacs'),
            ' that make every breath a flow-through exchange — vastly more efficient than mammalian breathing.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Side effect: ',
            h('strong', { style: { color: T.danger } }, 'birds inhale far more air per kg than we do'),
            '. Airborne toxins that mildly irritate humans kill birds in minutes. Major risks: ',
            h('strong', { style: { color: T.text } }, 'Teflon (PTFE) overheated cookware'),
            ' (deadly within 5–15 min), aerosol cleaners, scented candles + plug-ins, cigarette + cooking smoke, self-cleaning ovens during the cycle. Pet birds historically alerted miners to carbon monoxide and methane for the same physiological reason.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🧠 Vocal learning + cognition'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Parrots are one of only a handful of vertebrate groups that learn novel vocalizations (others: humans, songbirds, hummingbirds, cetaceans, bats, elephants). They can copy human speech because they can map auditory input to muscle output via a neural circuit similar to our own.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Alex the African Grey (Pepperberg lab, 1977–2007) demonstrated abstract concepts: numerical understanding to 6, "same/different," "bigger/smaller," and zero. His last words to Pepperberg: "You be good. See you tomorrow. I love you."')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '⏱️ Lifespan reality check'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Macaws + cockatoos: ',
            h('strong', { style: { color: T.accentHi } }, '50–80 years'),
            '. African Greys: 40–60. Amazons: 40–60. Cockatiels: 15–25. Budgies: 5–10. Larger parrots routinely outlive their first owner — buyers should plan for the bird\'s rehoming as part of the adoption decision.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Backyard chickens are increasingly common across Maine — productive layers + manageable. Avian influenza (HPAI) outbreaks have hit Maine flocks; biosecurity matters. For wild bird rescue, ',
            h('strong', { style: { color: T.accentHi } }, 'Avian Haven in Freedom, ME'),
            ' is the regional rehab center.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: REPTILES & AMPHIBIANS
    // ─────────────────────────────────────────
    function renderReptiles() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🦎 Reptiles & amphibians'),
        sourceCard('reptiles'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🌡️ Ectothermy: temperature is your job'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Reptiles cannot generate body heat from metabolism — their entire physiology depends on environmental temperature. A reptile at the wrong temperature can\'t digest food, fight infection, or move. ',
            h('strong', { style: { color: T.accentHi } }, 'Most pet reptile deaths are husbandry failures, not disease'),
            '.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Required setup: ',
            h('strong', { style: { color: T.text } }, 'thermal gradient'),
            ' (basking spot at species-specific high; cool zone at species-specific low). UVB lighting for diurnal species (bearded dragons, tortoises) — without UVB the animal can\'t synthesize vitamin D3 → metabolic bone disease (deformed legs, soft jaw, fatal). UVB bulbs LOSE output before they look dim — replace every 6–12 months even if visibly bright.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🦠 Salmonella: not optional'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'CDC: ',
            h('strong', { style: { color: T.accentHi } }, 'all reptiles + amphibians shed Salmonella'),
            ' regardless of how clean they appear. Shedding is intermittent, so a lab test that comes back negative does NOT clear the animal — it only means it was not shedding that day. Treat every reptile as positive, every time. Wash hands after every handling. CDC actively recommends ',
            h('strong', { style: { color: T.warm } }, 'no reptiles in households with children under 5'),
            ' or immunocompromised members. Don\'t let reptiles roam in food-prep areas. Don\'t kiss your turtle.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '🐸 Amphibians: bad pets for kids'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Frog and salamander skin is permeable — they breathe + drink through it. Soap residue on a child\'s hands can poison the animal. Lotion, sunscreen, even tap water with chlorine. Look-don\'t-touch is the right framing.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Wild reptiles in Maine are protected — collecting native turtles or snakes for pets is illegal under Maine IFW rules. Released exotic reptiles (red-eared sliders most often) become invasive in southern Maine ponds. The pet-trade-released-into-the-wild pipeline is the #1 invasive-species vector globally (see also: Burmese pythons in Florida Everglades, lionfish in Caribbean).')),
        footer());
    }

    // ─────────────────────────────────────────
    // PET TRAINING (applied — distinct from BehaviorLab)
    // ─────────────────────────────────────────
    function renderTraining() {
      var scenarios = [
        { id: 'house', name: 'Housetraining a puppy',
          principle: 'Reinforce success outdoors; never punish accidents indoors',
          how: 'Puppy out every 1–2 hr + after meals + after waking. Praise + tiny treat WITHIN 3 SECONDS of finishing. Indoor accidents → silent cleanup with enzymatic cleaner. Punishing post-fact teaches "don\'t pee around humans" → harder training.',
          species: 'Dogs (and rabbits — yes, rabbits litter-train naturally)' },
        { id: 'recall', name: 'Reliable recall ("come" works every time)',
          principle: 'Recall must always predict something AMAZING',
          how: 'Practice on long line first. Reward EVERY recall with high-value treat (chicken, cheese, hot dog) for the first 6 months. Never call your dog to do something they hate (bath, leaving the dog park). Fading rewards too early = unreliable recall.',
          species: 'Dogs primarily' },
        { id: 'leash', name: 'Loose-leash walking',
          principle: 'Pulling never works (handler stops; reward when leash slackens)',
          how: 'Handler stops moving the moment the leash goes tight. Wait for any slack — reward + resume. Slow at first, fast with practice. Front-clip harness (Easy Walk) helps mechanically; don\'t use prong / shock / choke (AVSAB position).',
          species: 'Dogs' },
        { id: 'crate', name: 'Crate as positive resting place',
          principle: 'Crate is a den, not a punishment',
          how: 'Feed all meals + chews inside crate with door open. Slowly close door for 5 sec → 30 sec → minutes, always with a stuffed Kong. Never use as discipline. A crate-conditioned puppy chooses the crate as a nap spot for life.',
          species: 'Dogs (and cats — same idea with carriers)' },
        { id: 'alone', name: 'Alone-time tolerance (separation prep)',
          principle: 'Teach alone-time BEFORE you need it',
          how: 'Practice 30 sec → 2 min → 5 min → 30 min absences from puppyhood, paired with a stuffed Kong or chew. Build slowly. Don\'t make a ritual of departures (cue triggers anxiety). Severe separation anxiety needs a vet behaviorist — do NOT crate an actively-panicking dog.',
          species: 'Dogs primarily; some parrots also' },
        { id: 'cat-sit', name: 'Sit / target / high-five (cats)',
          principle: 'Cats learn fine — they just need food rewards + short sessions',
          how: 'Use clicker or marker word. Lure with treat over the head → tail tucks under → "sit" → click + treat. 5 sessions of 2 min each beats one 10-min slog. Cats won\'t work for praise like dogs do — pay them.',
          species: 'Cats' },
        { id: 'parrot-step', name: 'Parrot "step up" + recall',
          principle: 'Bites + flying off = no consequence; stepping up + flying to you = jackpot',
          how: 'Hold finger / perch in front of belly + cue "step up." Reward generously when they step up. NEVER chase a parrot — handle on their schedule. Recall is built with two trainers + treats, increasing distance.',
          species: 'Parrots' }
      ];
      // Sub-mode: 'read' (default scenario listing) or 'sim' (operant trainer game)
      var trMode = d.trMode || 'read';
      function setTrMode(m) { upd('trMode', m); petsAnnounce(m === 'sim' ? 'Operant trainer simulator' : 'Reading mode'); }
      // ── Operant trainer game ──
      // Goal: train "sit" over 10 rounds. Each round, the dog does something
      // (sometimes the target, sometimes random). Student picks a response
      // within a conceptual 3-second window. Updates a behavior-probability
      // bar. Teaches: reinforcement timing, 3-second rule, the cost of
      // reinforcing the wrong thing, the difference between marker-only +
      // marker-then-treat, and that punishment poisons the relationship.
      var TR_MOMENTS = [
        // type: 'target' = the desired behavior (sit), 'almost' = close to it,
        // 'wrong' = unrelated behavior. Each moment includes a description.
        { type: 'target',  desc: 'You hold a treat above your puppy\'s nose. Their butt drops to the floor.', label: '✓ Sat fully' },
        { type: 'wrong',   desc: 'Your puppy is sniffing the corner of the rug, ignoring you.', label: '× Distracted, sniffing' },
        { type: 'almost',  desc: 'You say "sit." The puppy stares at you, doesn\'t move.', label: '~ Looking at you, not sitting' },
        { type: 'target',  desc: 'After "sit," the puppy lowers all the way to a clean sit.', label: '✓ Sat fully' },
        { type: 'wrong',   desc: 'The puppy jumps up to lick your face.', label: '× Jumped up' },
        { type: 'target',  desc: 'You wait quietly. The puppy offers a sit on their own.', label: '✓ Offered a sit' },
        { type: 'almost',  desc: 'The puppy starts to lower, then stands back up.', label: '~ Half-sit' },
        { type: 'target',  desc: 'You say "sit." The puppy sits faster than before.', label: '✓ Quick sit on cue' },
        { type: 'wrong',   desc: 'The puppy starts barking at a noise outside.', label: '× Barking at noise' },
        { type: 'target',  desc: 'You say "sit." The puppy holds the sit for 3 seconds.', label: '✓ Sustained sit' }
      ];
      var trSim = d.trSim || null;  // { idx, choices, prob, trust, log }
      function startTrSim() {
        upd('trSim', { idx: 0, choices: [], prob: 0.20, trust: 1.00, done: false, log: [] });
      }
      function newTrSim() { upd('trSim', null); startTrSim(); }
      function pickResponse(rxn) {
        if (!trSim) return;
        if (trSim.done) return;
        if ((trSim.choices || [])[trSim.idx] != null) return;  // already answered this round
        var moment = TR_MOMENTS[trSim.idx];
        var dProb = 0, dTrust = 0, verdict;
        // Reinforcement model — simplified for pedagogy
        // rxn: 'treat3s' (treat within 3s), 'click' (marker only), 'wait', 'correct'
        if (moment.type === 'target') {
          if (rxn === 'treat3s') { dProb = +0.10; verdict = 'Excellent timing. Reinforced the desired behavior right when it happened. The puppy is learning what works.'; }
          else if (rxn === 'click') { dProb = +0.05; verdict = 'Marker without a treat works ONCE in a while if you pair markers with food consistently. Long-term you need to back it up with reinforcement.'; }
          else if (rxn === 'wait')  { dProb = -0.04; verdict = 'You watched the desired behavior happen and did nothing. To the puppy, sitting "didn\'t pay" — they\'ll try other things next time.'; }
          else if (rxn === 'correct') { dProb = -0.12; dTrust = -0.10; verdict = 'You just punished the RIGHT behavior. Devastating: the puppy now thinks sitting causes scolding. This is called "poisoning the cue."'; }
        } else if (moment.type === 'almost') {
          if (rxn === 'treat3s') { dProb = +0.04; verdict = 'You reinforced an approximation. This is called "shaping" — useful for building behavior step by step.'; }
          else if (rxn === 'click') { dProb = +0.06; verdict = 'Marking an approximation without giving the full treat is classic shaping. The marker tells the puppy "that\'s the move." Excellent.'; }
          else if (rxn === 'wait')  { dProb = +0.00; verdict = 'Reasonable — you\'re holding out for a clean sit. Just be patient.'; }
          else if (rxn === 'correct') { dTrust = -0.08; verdict = 'Correcting an approximation makes the puppy hesitant to try anything. They\'ll shut down.'; }
        } else {  // wrong
          if (rxn === 'treat3s') { dProb = -0.15; verdict = 'You reinforced the WRONG behavior. The puppy now thinks barking / jumping / sniffing earned the treat. Common mistake.'; }
          else if (rxn === 'click') { dProb = -0.08; verdict = 'Marking the wrong behavior plants the wrong association. Try not to mark unrelated behaviors.'; }
          else if (rxn === 'wait')  { dProb = +0.02; verdict = 'Correct — ignoring undesired behavior is "extinction." If it doesn\'t pay, the puppy stops doing it.'; }
          else if (rxn === 'correct') { dTrust = -0.07; verdict = 'Verbal corrections add stress without teaching what TO do. Modern training (AVSAB) recommends redirect + reward the alternative.'; }
        }
        var newProb = Math.max(0, Math.min(1, trSim.prob + dProb));
        var newTrust = Math.max(0, Math.min(1, trSim.trust + dTrust));
        var nextChoices = (trSim.choices || []).slice();
        nextChoices[trSim.idx] = { rxn: rxn, dProb: dProb, dTrust: dTrust, verdict: verdict, momentLabel: moment.label, momentType: moment.type };
        upd('trSim', Object.assign({}, trSim, {
          choices: nextChoices,
          prob: newProb,
          trust: newTrust,
          log: (trSim.log || []).concat([{ rd: trSim.idx + 1, prob: newProb, trust: newTrust, dProb: dProb }])
        }));
      }
      function nextTrRound() {
        if (!trSim) return;
        if (trSim.idx < TR_MOMENTS.length - 1) {
          upd('trSim', Object.assign({}, trSim, { idx: trSim.idx + 1 }));
        } else {
          // Done
          var finalScore = Math.round(trSim.prob * 100);
          var trustScore = Math.round(trSim.trust * 100);
          if (finalScore >= 70 && trustScore >= 80) awardBadge('pets_trainer', 'Reinforcement Trainer');
          upd('trSim', Object.assign({}, trSim, { done: true }));
        }
      }
      function renderTrainerStage(moment, thisChoice, revealed, probPct, trustPct) {
        var round = trSim.idx + 1;
        var pose = moment.type === 'target' ? 'sit'
          : moment.type === 'almost' ? 'crouch'
          : trSim.idx === 1 ? 'sniff'
          : trSim.idx === 4 ? 'jump'
          : 'bark';
        var responseNames = {
          treat3s: 'Treat within 3 seconds',
          click: 'Marker only',
          wait: 'Wait and observe',
          correct: 'Verbal correction'
        };
        var selected = revealed ? thisChoice.rxn : null;
        var outcomeColor = !revealed ? '#fbbf24'
          : thisChoice.dProb > 0 ? '#84cc16'
          : thisChoice.dProb < 0 ? '#ef4444'
          : '#7dd3fc';
        var outcomeLabel = !revealed ? '3-second response window'
          : thisChoice.dTrust < 0 ? 'Trust dipped'
          : thisChoice.dProb > 0 ? 'Behavior strengthened'
          : thisChoice.dProb < 0 ? 'Behavior weakened'
          : 'Observation recorded';
        var trustLow = trustPct < 70 || selected === 'correct';
        var tailClass = trustPct >= 70 && selected !== 'correct' ? 'petslab-trainer-tail' : '';
        var sceneLabel = 'Illustrated kitchen training scene. Round ' + round + ' of ' + TR_MOMENTS.length +
          '. Puppy action: ' + moment.desc + ' Behavior probability ' + probPct +
          ' percent. Trust ' + trustPct + ' percent.' +
          (revealed ? ' Selected response: ' + responseNames[selected] + '. ' + outcomeLabel + '.'
            : ' Choose a response within three seconds.');

        function puppyHead(x, y, rotation) {
          return h('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + rotation + ')' },
            trustLow
              ? h('g', null,
                  h('path', { d: 'M -22 -18 Q -48 -17 -47 4 Q -30 2 -18 -5 Z', fill: '#8a542c' }),
                  h('path', { d: 'M 15 -20 Q 35 -23 36 -2 Q 25 0 14 -7 Z', fill: '#754523' })
                )
              : h('g', null,
                  h('path', { d: 'M -22 -17 Q -42 -37 -44 -8 Q -38 11 -18 1 Z', fill: '#8a542c' }),
                  h('path', { d: 'M 14 -20 Q 34 -36 36 -7 Q 32 8 15 1 Z', fill: '#754523' }),
                  h('path', { d: 'M -27 -17 Q -36 -27 -36 -10 Q -32 -2 -24 -4 Z', fill: '#d89d76', opacity: 0.7 })
                ),
            h('ellipse', { cx: 0, cy: 0, rx: 34, ry: 31, fill: 'url(#pets-trainer-fur)' }),
            h('path', { d: 'M -27 -14 Q -5 -31 8 -17 Q -4 -2 -24 0 Z', fill: '#9a5c2b', opacity: 0.88 }),
            h('ellipse', { cx: 12, cy: -6, rx: 5.5, ry: trustLow ? 2.4 : 4.6, fill: '#24140d' }),
            !trustLow && h('circle', { cx: 14, cy: -8, r: 1.5, fill: '#fff8e7' }),
            trustLow && h('path', { d: 'M 6 -12 Q 14 -16 21 -12', fill: 'none', stroke: '#5a321b', strokeWidth: 2.2, strokeLinecap: 'round' }),
            h('ellipse', { cx: 20, cy: 10, rx: 22, ry: 15, fill: '#f4d9b8' }),
            h('path', { d: 'M 34 4 Q 43 5 39 12 Q 34 16 29 10 Z', fill: '#2a1811' }),
            pose === 'bark'
              ? h('path', { d: 'M 34 17 Q 47 25 32 31 Q 21 27 22 19 Z', fill: '#6f1d1b', stroke: '#3f1714', strokeWidth: 1.5 })
              : h('path', { d: trustLow ? 'M 23 21 Q 29 17 35 21' : 'M 22 19 Q 29 25 36 19', fill: 'none', stroke: '#5d2b23', strokeWidth: 2, strokeLinecap: 'round' }),
            pose !== 'bark' && !trustLow && h('path', { d: 'M 29 22 Q 31 27 35 22', fill: '#d56d7a' })
          );
        }

        function puppy() {
          var coat = 'url(#pets-trainer-fur)';
          var patch = '#f5dfc5';
          var tailD = trustLow ? 'M -43 49 Q -85 58 -68 85' : 'M -43 49 Q -91 24 -73 -10';
          if (pose === 'sit') {
            return h('g', { transform: 'translate(344 149)', filter: 'url(#pets-trainer-shadow)' },
              h('path', { className: tailClass, d: tailD, fill: 'none', stroke: '#a96631', strokeWidth: 17, strokeLinecap: 'round' }),
              h('ellipse', { cx: -7, cy: 67, rx: 48, ry: 57, fill: coat }),
              h('ellipse', { cx: 16, cy: 73, rx: 25, ry: 44, fill: patch, opacity: 0.92 }),
              h('ellipse', { cx: -39, cy: 108, rx: 25, ry: 13, fill: '#b77439' }),
              h('path', { d: 'M 3 72 Q 4 109 -2 121 M 28 69 Q 34 105 31 121', fill: 'none', stroke: '#c9894b', strokeWidth: 15, strokeLinecap: 'round' }),
              h('ellipse', { cx: -2, cy: 120, rx: 15, ry: 7, fill: patch }),
              h('ellipse', { cx: 32, cy: 120, rx: 15, ry: 7, fill: patch }),
              h('path', { d: 'M 3 32 Q 23 43 44 25', fill: 'none', stroke: '#315b78', strokeWidth: 8, strokeLinecap: 'round' }),
              h('circle', { cx: 24, cy: 37, r: 6, fill: '#f4b942', stroke: '#fff1bc', strokeWidth: 1.5 }),
              puppyHead(29, 4, -2)
            );
          }
          if (pose === 'jump') {
            return h('g', { transform: 'translate(337 120) rotate(-10 5 45)', filter: 'url(#pets-trainer-shadow)' },
              h('path', { className: tailClass, d: trustLow ? 'M -45 55 Q -76 75 -60 91' : 'M -42 52 Q -89 32 -73 4', fill: 'none', stroke: '#a96631', strokeWidth: 16, strokeLinecap: 'round' }),
              h('ellipse', { cx: 0, cy: 54, rx: 57, ry: 39, fill: coat }),
              h('ellipse', { cx: 17, cy: 66, rx: 29, ry: 21, fill: patch, opacity: 0.85 }),
              h('path', { d: 'M -24 75 Q -31 101 -46 111 M 6 82 Q 7 108 -3 119', fill: 'none', stroke: '#b9783d', strokeWidth: 15, strokeLinecap: 'round' }),
              h('path', { d: 'M 36 58 Q 69 42 82 19 M 29 70 Q 65 65 82 49', fill: 'none', stroke: '#ca894c', strokeWidth: 14, strokeLinecap: 'round' }),
              h('ellipse', { cx: 84, cy: 17, rx: 13, ry: 7, fill: patch, transform: 'rotate(-20 84 17)' }),
              h('ellipse', { cx: 85, cy: 48, rx: 13, ry: 7, fill: patch, transform: 'rotate(-8 85 48)' }),
              h('path', { d: 'M 23 33 Q 43 44 57 25', fill: 'none', stroke: '#315b78', strokeWidth: 8, strokeLinecap: 'round' }),
              h('circle', { cx: 42, cy: 36, r: 6, fill: '#f4b942', stroke: '#fff1bc', strokeWidth: 1.5 }),
              puppyHead(59, 8, 2)
            );
          }
          return h('g', { transform: 'translate(320 184)', filter: 'url(#pets-trainer-shadow)' },
            h('path', { className: tailClass, d: trustLow ? 'M -54 34 Q -91 55 -74 76' : 'M -54 33 Q -99 10 -84 -18', fill: 'none', stroke: '#a96631', strokeWidth: 16, strokeLinecap: 'round' }),
            h('ellipse', { cx: 0, cy: 38, rx: 66, ry: pose === 'crouch' ? 31 : 35, fill: coat }),
            h('path', { d: 'M -17 17 Q 3 39 26 17 Q 13 54 -18 54 Z', fill: '#9a5c2b', opacity: 0.72 }),
            pose === 'crouch'
              ? h('g', null,
                  h('path', { d: 'M -42 52 Q -57 70 -40 82 M 19 54 Q 40 69 50 81', fill: 'none', stroke: '#b9783d', strokeWidth: 15, strokeLinecap: 'round' }),
                  h('ellipse', { cx: -39, cy: 83, rx: 16, ry: 7, fill: patch }),
                  h('ellipse', { cx: 52, cy: 82, rx: 16, ry: 7, fill: patch })
                )
              : h('g', null,
                  h('path', { d: 'M -39 55 L -42 87 M 29 54 L 34 87', fill: 'none', stroke: '#b9783d', strokeWidth: 15, strokeLinecap: 'round' }),
                  h('ellipse', { cx: -40, cy: 89, rx: 16, ry: 7, fill: patch }),
                  h('ellipse', { cx: 36, cy: 89, rx: 16, ry: 7, fill: patch })
                ),
            h('path', { d: 'M 36 22 Q 50 32 62 18', fill: 'none', stroke: '#315b78', strokeWidth: 8, strokeLinecap: 'round' }),
            h('circle', { cx: 51, cy: 26, r: 6, fill: '#f4b942', stroke: '#fff1bc', strokeWidth: 1.5 }),
            puppyHead(62, pose === 'sniff' ? 58 : pose === 'crouch' ? 27 : 14, pose === 'sniff' ? 28 : pose === 'crouch' ? 8 : 0),
            pose === 'sniff' && h('g', { opacity: 0.72 },
              h('path', { d: 'M 104 79 Q 116 68 126 79 Q 137 89 149 77', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '3 5', strokeLinecap: 'round' }),
              h('circle', { cx: 112, cy: 67, r: 3, fill: '#fbbf24' }),
              h('circle', { cx: 139, cy: 69, r: 2.5, fill: '#fbbf24' })
            ),
            pose === 'bark' && h('g', { fill: 'none', stroke: '#fef3c7', strokeWidth: 3, strokeLinecap: 'round' },
              h('path', { d: 'M 105 4 L 126 -5' }),
              h('path', { d: 'M 108 16 L 134 16' }),
              h('path', { d: 'M 104 28 L 126 39' })
            )
          );
        }

        function responseCue() {
          if (!revealed) {
            return h('g', { transform: 'translate(610 107)' },
              h('circle', { cx: 0, cy: 0, r: 27, fill: '#1f1612', fillOpacity: 0.88, stroke: '#fbbf24', strokeWidth: 3 }),
              h('path', { d: 'M 0 -18 A 18 18 0 0 1 18 0', fill: 'none', stroke: '#fff5d6', strokeWidth: 3, strokeLinecap: 'round' }),
              h('text', { x: 0, y: 6, textAnchor: 'middle', fill: '#fff7df', fontSize: 16, fontWeight: 900 }, '3s')
            );
          }
          if (selected === 'treat3s') {
            return h('g', { className: 'petslab-trainer-reward' },
              h('path', { d: 'M 635 145 Q 554 122 437 178', fill: 'none', stroke: '#fbbf24', strokeWidth: 3, strokeDasharray: '5 7', strokeLinecap: 'round' }),
              h('rect', { x: 613, y: 132, width: 20, height: 11, rx: 5, fill: '#9a5b2f', stroke: '#f7d68f', strokeWidth: 2, transform: 'rotate(-18 623 138)' }),
              h('path', { d: 'M 598 119 L 601 128 L 610 131 L 601 134 L 598 143 L 595 134 L 586 131 L 595 128 Z', fill: '#fef08a' }),
              h('path', { d: 'M 572 148 L 574 154 L 580 156 L 574 158 L 572 164 L 570 158 L 564 156 L 570 154 Z', fill: '#fff7c2' })
            );
          }
          if (selected === 'click') {
            return h('g', { className: 'petslab-trainer-reward', transform: 'translate(602 90)' },
              h('rect', { x: 0, y: 20, width: 45, height: 30, rx: 8, fill: '#253b52', stroke: '#9fd7ea', strokeWidth: 2 }),
              h('circle', { cx: 34, cy: 29, r: 5, fill: '#fbbf24' }),
              h('path', { d: 'M 49 20 L 64 10 M 53 30 L 72 30 M 49 41 L 64 53', fill: 'none', stroke: '#fef3c7', strokeWidth: 3, strokeLinecap: 'round' }),
              h('rect', { x: -10, y: -9, width: 58, height: 22, rx: 11, fill: '#fff7df' }),
              h('text', { x: 19, y: 7, textAnchor: 'middle', fill: '#315b78', fontSize: 13, fontWeight: 900 }, 'YES!')
            );
          }
          if (selected === 'wait') {
            return h('g', { className: 'petslab-trainer-reward', transform: 'translate(620 103)' },
              h('circle', { cx: 0, cy: 0, r: 25, fill: '#243447', fillOpacity: 0.92, stroke: '#bae6fd', strokeWidth: 2 }),
              h('rect', { x: -8, y: -10, width: 6, height: 20, rx: 3, fill: '#e0f2fe' }),
              h('rect', { x: 3, y: -10, width: 6, height: 20, rx: 3, fill: '#e0f2fe' }),
              h('text', { x: 0, y: 42, textAnchor: 'middle', fill: '#e0f2fe', fontSize: 11, fontWeight: 800 }, 'OBSERVE')
            );
          }
          return h('g', { className: 'petslab-trainer-reward', transform: 'translate(575 70)' },
            h('path', { d: 'M 0 0 H 80 Q 92 0 92 12 V 42 Q 92 54 80 54 H 35 L 21 68 L 23 54 H 0 Q -12 54 -12 42 V 12 Q -12 0 0 0 Z', fill: '#fff1f2', stroke: '#ef4444', strokeWidth: 3 }),
            h('text', { x: 40, y: 35, textAnchor: 'middle', fill: '#b91c1c', fontSize: 22, fontWeight: 950 }, 'NO!')
          );
        }

        return h('div', {
          className: 'petslab-sim-stage petslab-trainer-stage',
          style: {
            borderColor: outcomeColor,
            boxShadow: '0 24px 60px rgba(0,0,0,.34), 0 0 0 1px ' + outcomeColor + '33'
          }
        },
          h('svg', {
            viewBox: '0 0 760 330',
            preserveAspectRatio: 'xMidYMid meet',
            role: 'img',
            focusable: 'false',
            'aria-label': sceneLabel
          },
            h('title', null, sceneLabel),
            h('defs', null,
              h('linearGradient', { id: 'pets-trainer-wall', x1: 0, y1: 0, x2: 1, y2: 1 },
                h('stop', { offset: '0%', stopColor: '#f8ead5' }),
                h('stop', { offset: '65%', stopColor: '#e6c7a3' }),
                h('stop', { offset: '100%', stopColor: '#d3a97d' })
              ),
              h('linearGradient', { id: 'pets-trainer-floor', x1: 0, y1: 0, x2: 0, y2: 1 },
                h('stop', { offset: '0%', stopColor: '#a8784f' }),
                h('stop', { offset: '100%', stopColor: '#68452f' })
              ),
              h('linearGradient', { id: 'pets-trainer-fur', x1: 0, y1: 0, x2: 1, y2: 1 },
                h('stop', { offset: '0%', stopColor: '#e8b66f' }),
                h('stop', { offset: '55%', stopColor: '#c88443' }),
                h('stop', { offset: '100%', stopColor: '#8a4f27' })
              ),
              h('radialGradient', { id: 'pets-trainer-rug', cx: '50%', cy: '42%', r: '70%' },
                h('stop', { offset: '0%', stopColor: '#d46b59' }),
                h('stop', { offset: '100%', stopColor: '#8d3f3b' })
              ),
              h('filter', { id: 'pets-trainer-shadow', x: '-35%', y: '-35%', width: '170%', height: '180%' },
                h('feDropShadow', { dx: 0, dy: 5, stdDeviation: 5, floodColor: '#3b2418', floodOpacity: 0.3 })
              )
            ),
            h('rect', { x: 0, y: 0, width: 760, height: 216, fill: 'url(#pets-trainer-wall)' }),
            h('path', { d: 'M 0 57 H 760 M 0 111 H 760 M 0 165 H 760', stroke: '#b8916c', strokeWidth: 1, opacity: 0.25 }),
            h('path', { d: 'M 52 0 V 216 M 108 0 V 216 M 164 0 V 216 M 220 0 V 216 M 276 0 V 216 M 332 0 V 216 M 388 0 V 216 M 444 0 V 216 M 500 0 V 216 M 556 0 V 216 M 612 0 V 216 M 668 0 V 216 M 724 0 V 216', stroke: '#b8916c', strokeWidth: 1, opacity: 0.16 }),
            h('rect', { x: 0, y: 208, width: 760, height: 13, fill: '#fff3df' }),
            h('rect', { x: 0, y: 218, width: 760, height: 112, fill: 'url(#pets-trainer-floor)' }),
            h('path', { d: 'M 0 251 H 760 M 0 290 H 760 M 90 218 L 45 330 M 205 218 L 181 330 M 320 218 L 316 330 M 440 218 L 454 330 M 555 218 L 588 330 M 670 218 L 721 330', stroke: '#4f3324', strokeWidth: 2, opacity: 0.34 }),
            h('ellipse', { cx: 375, cy: 286, rx: 178, ry: 38, fill: 'url(#pets-trainer-rug)', filter: 'url(#pets-trainer-shadow)' }),
            h('ellipse', { cx: 375, cy: 286, rx: 151, ry: 27, fill: 'none', stroke: '#eda184', strokeWidth: 3, opacity: 0.72 }),
            h('path', { d: 'M 242 283 Q 375 261 508 283 M 255 294 Q 375 274 495 294', fill: 'none', stroke: '#f7c0a3', strokeWidth: 2, opacity: 0.42 }),
            h('g', { filter: 'url(#pets-trainer-shadow)' },
              h('rect', { x: 0, y: 104, width: 225, height: 108, fill: '#6b4935' }),
              h('rect', { x: 0, y: 98, width: 250, height: 15, rx: 3, fill: '#d7c0a2' }),
              h('rect', { x: 18, y: 122, width: 86, height: 79, rx: 3, fill: '#815940', stroke: '#a87b59', strokeWidth: 2 }),
              h('rect', { x: 119, y: 122, width: 86, height: 79, rx: 3, fill: '#815940', stroke: '#a87b59', strokeWidth: 2 }),
              h('circle', { cx: 92, cy: 160, r: 3, fill: '#e8c680' }),
              h('circle', { cx: 132, cy: 160, r: 3, fill: '#e8c680' }),
              h('rect', { x: 28, y: 75, width: 82, height: 23, rx: 4, fill: '#b9c6c8' }),
              h('ellipse', { cx: 69, cy: 79, rx: 32, ry: 7, fill: '#6d888c' }),
              h('path', { d: 'M 94 77 Q 95 51 77 51', fill: 'none', stroke: '#73888b', strokeWidth: 7, strokeLinecap: 'round' }),
              h('rect', { x: 150, y: 52, width: 42, height: 46, rx: 8, fill: '#eef3ed', stroke: '#9aaea9', strokeWidth: 2 }),
              h('rect', { x: 155, y: 47, width: 32, height: 8, rx: 3, fill: '#6c8290' }),
              h('circle', { cx: 162, cy: 77, r: 4, fill: '#a86635' }),
              h('circle', { cx: 175, cy: 70, r: 4, fill: '#a86635' }),
              h('circle', { cx: 181, cy: 82, r: 4, fill: '#a86635' })
            ),
            h('g', { opacity: 0.96 },
              h('rect', { x: 510, y: 35, width: 157, height: 104, rx: 4, fill: '#8fc7d6' }),
              h('circle', { cx: 625, cy: 67, r: 22, fill: '#ffe59a' }),
              h('path', { d: 'M 513 113 Q 550 78 583 109 Q 620 75 664 112 V 136 H 513 Z', fill: '#77a765' }),
              h('rect', { x: 504, y: 28, width: 169, height: 118, rx: 5, fill: 'none', stroke: '#76533b', strokeWidth: 8 }),
              h('line', { x1: 588, y1: 31, x2: 588, y2: 143, stroke: '#76533b', strokeWidth: 4 }),
              h('line', { x1: 508, y1: 87, x2: 669, y2: 87, stroke: '#76533b', strokeWidth: 4 }),
              h('path', { d: 'M 492 22 Q 519 58 496 154 M 685 22 Q 657 61 680 154', fill: '#c45f51', stroke: '#9e443e', strokeWidth: 3 })
            ),
            h('g', { opacity: 0.88 },
              h('rect', { x: 280, y: 49, width: 99, height: 67, rx: 4, fill: '#815b42' }),
              h('rect', { x: 288, y: 57, width: 83, height: 51, fill: '#f3c970' }),
              h('path', { d: 'M 296 96 Q 318 65 336 91 Q 352 69 365 96', fill: '#6f8e69' }),
              h('circle', { cx: 344, cy: 72, r: 9, fill: '#fff1bd' })
            ),
            h('g', { filter: 'url(#pets-trainer-shadow)' },
              h('path', { d: 'M 697 178 Q 678 227 681 330 H 733 Q 736 250 724 182 Z', fill: '#36465d' }),
              h('path', { d: 'M 726 181 Q 728 236 742 330 H 760 V 181 Z', fill: '#29394f' }),
              h('path', { d: 'M 681 318 H 735 V 330 H 669 Q 666 322 681 318 Z', fill: '#2b201c' }),
              h('path', { d: 'M 733 318 H 760 V 330 H 721 Q 719 322 733 318 Z', fill: '#241a18' }),
              h('path', { d: 'M 760 81 Q 704 87 648 132', fill: 'none', stroke: '#e5ad83', strokeWidth: 22, strokeLinecap: 'round' }),
              h('path', { d: 'M 760 72 Q 709 74 679 97', fill: 'none', stroke: '#5d7188', strokeWidth: 31, strokeLinecap: 'round' }),
              h('ellipse', { cx: 642, cy: 137, rx: 20, ry: 14, fill: '#e5ad83', transform: 'rotate(-20 642 137)' }),
              h('circle', { cx: 628, cy: 135, r: 5, fill: '#f0bf98' })
            ),
            h('ellipse', { cx: pose === 'jump' ? 374 : 375, cy: 284, rx: pose === 'jump' ? 72 : 88, ry: 13, fill: '#24150f', opacity: pose === 'jump' ? 0.18 : 0.24 }),
            puppy(),
            responseCue()
          ),
          h('div', { className: 'petslab-stage-hud petslab-stage-hud--top', 'aria-hidden': 'true' },
            h('div', { className: 'petslab-hud-stack' },
              h('span', { className: 'petslab-hud-chip' }, 'ROUND ', h('strong', null, round + ' / ' + TR_MOMENTS.length)),
              h('span', { className: 'petslab-hud-chip' }, revealed ? 'RESPONSE ' : 'OBSERVE ', h('strong', null, revealed ? responseNames[selected] : moment.label))
            ),
            h('div', { className: 'petslab-hud-objective' },
              h('strong', { style: { display: 'block', color: outcomeColor, marginBottom: 2 } }, revealed ? outcomeLabel.toUpperCase() : 'TRAINING MOMENT'),
              revealed ? 'See how your timing changes learning and the relationship.' : 'Watch the puppy, then choose what happens immediately after.'
            )
          ),
          h('div', { className: 'petslab-stage-hud petslab-stage-hud--bottom', 'aria-hidden': 'true' },
            h('div', { className: 'petslab-hud-stack' },
              h('span', { className: 'petslab-hud-chip' }, 'Behavior ', h('strong', null, probPct + '%')),
              h('span', { className: 'petslab-hud-chip' }, 'Trust ', h('strong', { style: { color: trustPct >= 80 ? '#bef264' : trustPct >= 60 ? '#fde68a' : '#fca5a5' } }, trustPct + '%'))
            ),
            h('span', { className: 'petslab-hud-chip', style: { borderColor: outcomeColor } }, outcomeLabel)
          )
        );
      }
      function renderTrainerSim() {
        if (!trSim) {
          return h('div', { style: { padding: 18, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, textAlign: 'center' } },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '🐕'),
            h('h3', { style: { margin: '0 0 6px', color: T.accentHi, fontSize: 17 } }, 'Train "Sit" — 10-round operant simulator'),
            h('p', { style: { color: T.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' } },
              'Your puppy is in the kitchen. Each round, they do something. You have ~3 seconds to respond. Pick: treat-within-3s · marker-only · wait · verbal correction.'
            ),
            h('p', { style: { color: T.dim, fontSize: 12, lineHeight: 1.55, margin: '0 0 14px', fontStyle: 'italic' } },
              'Reach 70%+ behavior probability while keeping trust above 80% to earn the Reinforcement Trainer badge.'
            ),
            h('button', { 'data-pets-focusable': true,
              onClick: startTrSim,
              style: btnPrimary({ padding: '12px 22px', fontSize: 14 })
            }, '▶ Start 10-round trainer')
          );
        }
        if (trSim.done) {
          var finalScore = Math.round(trSim.prob * 100);
          var trustScore = Math.round(trSim.trust * 100);
          var headline = finalScore >= 70 && trustScore >= 80 ? '🏆 Solid trainer.'
            : finalScore >= 50 ? '👍 Decent — review the moments where probability dropped.'
            : finalScore >= 30 ? '🤔 Behavior is wobbly. You may have reinforced the wrong things or punished too much.'
            : '😬 The puppy learned the wrong lessons. Re-read the scenarios above and try again.';
          var trustNote = trustScore < 70 ? '⚠ Trust is low — corrections damaged the relationship. The puppy will be hesitant going forward.'
            : trustScore < 90 ? 'Trust took a small hit. Build back with positive sessions.'
            : '✓ Trust is strong. The puppy is engaged and willing.';
          // Render a larger, responsive probability/trust chart over rounds.
          var W = 640, H = 250;
          var pad = { l: 52, r: 24, t: 28, b: 42 };
          var chartPoints = trSim.log || [];
          var sx = function(i) { return pad.l + (i / (TR_MOMENTS.length - 1)) * (W - pad.l - pad.r); };
          var sy = function(p) { return pad.t + (1 - p) * (H - pad.t - pad.b); };
          var probPath = 'M ' + chartPoints.map(function(pt, i) { return sx(i) + ',' + sy(pt.prob); }).join(' L ');
          var trustPath = 'M ' + chartPoints.map(function(pt, i) { return sx(i) + ',' + sy(pt.trust); }).join(' L ');
          var chartDesc = 'Rounds 1 through 10 are labeled along the horizontal axis. The vertical axis marks 0, 50, and 100 percent. ' +
            'The behavior goal is 70 percent and the trust goal is 80 percent. Final behavior probability is ' +
            finalScore + ' percent and final trust is ' + trustScore + ' percent.';
          return h('div', { style: { padding: 18, borderRadius: 12, background: T.card, border: '2px solid ' + (finalScore >= 70 && trustScore >= 80 ? T.ok : T.accent) } },
            h('div', { style: { fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 6 } }, headline),
            h('p', { style: { color: T.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' } }, trustNote),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Behavior probability'),
                h('div', { style: { fontSize: 26, fontWeight: 800, color: finalScore >= 70 ? T.ok : finalScore >= 40 ? T.accentHi : T.danger, fontFamily: 'monospace' } },
                  finalScore + '%'),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'Likelihood the puppy will offer "sit" on cue')
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: T.dim } }, 'Relationship trust'),
                h('div', { style: { fontSize: 26, fontWeight: 800, color: trustScore >= 80 ? T.ok : trustScore >= 60 ? T.warm : T.danger, fontFamily: 'monospace' } },
                  trustScore + '%'),
                h('div', { style: { fontSize: 10, color: T.dim } }, 'Willingness to engage and try things')
              )
            ),
            // Trajectory
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 8 } }, 'Trajectory across 10 rounds'),
              h('svg', {
                width: '100%',
                viewBox: '0 0 ' + W + ' ' + H,
                preserveAspectRatio: 'xMidYMid meet',
                role: 'img',
                focusable: 'false',
                'aria-label': 'Behavior probability and trust trajectory across 10 rounds.',
                'aria-describedby': 'pets-trainer-chart-desc',
                style: { display: 'block', width: '100%', height: 'auto', minHeight: 150, background: T.bg, borderRadius: 8 }
              },
                h('title', null, 'Behavior probability and trust trajectory across 10 rounds'),
                h('desc', { id: 'pets-trainer-chart-desc' }, chartDesc),
                h('rect', { x: 0, y: 0, width: W, height: H, rx: 8, fill: T.bg }),
                h('rect', {
                  x: pad.l, y: pad.t,
                  width: W - pad.l - pad.r, height: H - pad.t - pad.b,
                  rx: 5, fill: '#111827', opacity: 0.48
                }),
                // Round grid, tick marks, and labels 1-10.
                TR_MOMENTS.map(function(_, i) {
                  return h('g', { key: 'round-' + i },
                    h('line', {
                      x1: sx(i), y1: pad.t, x2: sx(i), y2: H - pad.b,
                      stroke: '#475569', strokeWidth: 1, opacity: 0.32
                    }),
                    h('line', {
                      x1: sx(i), y1: H - pad.b, x2: sx(i), y2: H - pad.b + 5,
                      stroke: '#94a3b8', strokeWidth: 1
                    }),
                    h('text', {
                      x: sx(i), y: H - pad.b + 18,
                      textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: T.muted
                    }, String(i + 1))
                  );
                }),
                // Y-axis grid and explicit 0 / 50 / 100 percent ticks.
                [0, 0.5, 1].map(function(v, i) {
                  return h('g', { key: 'level-' + i },
                    h('line', {
                      x1: pad.l, y1: sy(v), x2: W - pad.r, y2: sy(v),
                      stroke: '#64748b', strokeWidth: 1, strokeDasharray: v === 0 ? null : '3 5', opacity: 0.58
                    }),
                    h('line', {
                      x1: pad.l - 5, y1: sy(v), x2: pad.l, y2: sy(v),
                      stroke: '#94a3b8', strokeWidth: 1
                    }),
                    h('text', {
                      x: pad.l - 9, y: sy(v) + 4,
                      textAnchor: 'end', fontSize: 11, fontWeight: 700, fill: T.muted
                    }, Math.round(v * 100) + '%')
                  );
                }),
                // Goal thresholds stay visible behind the data.
                h('g', null,
                  h('line', {
                    x1: pad.l, y1: sy(0.8), x2: W - pad.r, y2: sy(0.8),
                    stroke: '#7dd3fc', strokeWidth: 2, strokeDasharray: '8 6', opacity: 0.72,
                    vectorEffect: 'non-scaling-stroke'
                  }),
                  h('rect', {
                    x: W - pad.r - 103, y: sy(0.8) - 17, width: 98, height: 16, rx: 8,
                    fill: T.bg, fillOpacity: 0.9, stroke: '#7dd3fc', strokeOpacity: 0.5
                  }),
                  h('text', {
                    x: W - pad.r - 54, y: sy(0.8) - 5,
                    textAnchor: 'middle', fontSize: 10, fontWeight: 800, fill: '#bae6fd'
                  }, 'Trust goal 80%')
                ),
                h('g', null,
                  h('line', {
                    x1: pad.l, y1: sy(0.7), x2: W - pad.r, y2: sy(0.7),
                    stroke: T.accent, strokeWidth: 2, strokeDasharray: '8 6', opacity: 0.72,
                    vectorEffect: 'non-scaling-stroke'
                  }),
                  h('rect', {
                    x: pad.l + 6, y: sy(0.7) + 3, width: 113, height: 16, rx: 8,
                    fill: T.bg, fillOpacity: 0.9, stroke: T.accent, strokeOpacity: 0.5
                  }),
                  h('text', {
                    x: pad.l + 62, y: sy(0.7) + 15,
                    textAnchor: 'middle', fontSize: 10, fontWeight: 800, fill: '#fde68a'
                  }, 'Behavior goal 70%')
                ),
                h('line', {
                  x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b,
                  stroke: '#94a3b8', strokeWidth: 1.25
                }),
                h('line', {
                  x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b,
                  stroke: '#94a3b8', strokeWidth: 1.25
                }),
                h('path', {
                  d: probPath, fill: 'none', stroke: T.accent, strokeWidth: 3,
                  strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke'
                }),
                h('path', {
                  d: trustPath, fill: 'none', stroke: '#7dd3fc', strokeWidth: 3,
                  strokeDasharray: '7 5', strokeLinecap: 'round', strokeLinejoin: 'round',
                  vectorEffect: 'non-scaling-stroke'
                }),
                // Every observation has a visible marker, not just a line segment.
                chartPoints.map(function(pt, i) {
                  return h('g', { key: 'point-' + i },
                    h('circle', {
                      cx: sx(i), cy: sy(pt.prob), r: 4.7,
                      fill: T.bg, stroke: T.accent, strokeWidth: 2.5,
                      vectorEffect: 'non-scaling-stroke'
                    }),
                    h('circle', {
                      cx: sx(i), cy: sy(pt.trust), r: 3.8,
                      fill: '#7dd3fc', stroke: T.bg, strokeWidth: 1.8,
                      vectorEffect: 'non-scaling-stroke'
                    })
                  );
                }),
                h('g', { transform: 'translate(' + (pad.l + 8) + ' 14)' },
                  h('line', { x1: 0, y1: 0, x2: 24, y2: 0, stroke: T.accent, strokeWidth: 3, strokeLinecap: 'round' }),
                  h('circle', { cx: 12, cy: 0, r: 3.5, fill: T.bg, stroke: T.accent, strokeWidth: 2 }),
                  h('text', { x: 31, y: 4, fontSize: 11, fontWeight: 800, fill: T.accentHi }, 'Behavior'),
                  h('line', { x1: 112, y1: 0, x2: 136, y2: 0, stroke: '#7dd3fc', strokeWidth: 3, strokeDasharray: '6 4', strokeLinecap: 'round' }),
                  h('circle', { cx: 124, cy: 0, r: 3.5, fill: '#7dd3fc', stroke: T.bg, strokeWidth: 1.5 }),
                  h('text', { x: 143, y: 4, fontSize: 11, fontWeight: 800, fill: '#7dd3fc' }, 'Trust')
                ),
                h('text', {
                  x: (pad.l + W - pad.r) / 2, y: H - 7,
                  textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: T.dim
                }, 'Round'),
                h('text', {
                  x: 14, y: H / 2,
                  textAnchor: 'middle', fontSize: 10, fontWeight: 800, fill: T.dim,
                  transform: 'rotate(-90 14 ' + (H / 2) + ')'
                }, 'Probability / trust')
              )
            ),            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { 'data-pets-focusable': true,
                onClick: newTrSim,
                style: btnPrimary({ padding: '10px 18px', fontSize: 13 })
              }, '🔁 New session'),
              h('button', { 'data-pets-focusable': true,
                onClick: function() { setTrMode('read'); },
                style: btn({ padding: '10px 18px', fontSize: 13 })
              }, '📚 Back to scenarios')
            )
          );
        }
        // Active round
        var moment = TR_MOMENTS[trSim.idx];
        var thisChoice = (trSim.choices || [])[trSim.idx];
        var revealed = thisChoice != null;
        var probPct = Math.round(trSim.prob * 100);
        var trustPct = Math.round(trSim.trust * 100);
        var responseBtns = [
          { id: 'treat3s', label: '🍖 Treat (within 3s)', desc: 'Mark + reinforce' },
          { id: 'click',   label: '👍 Marker only ("yes!")', desc: 'Click without food' },
          { id: 'wait',    label: '⏸ Wait / ignore', desc: 'No response' },
          { id: 'correct', label: '❌ Verbal correction ("no!")', desc: 'Punishment' }
        ];
        return h('div', null,
          renderTrainerStage(moment, thisChoice, revealed, probPct, trustPct),
          // Status bars
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, marginBottom: 12 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.dim, marginBottom: 4 } },
              h('span', null, 'Round ' + (trSim.idx + 1) + ' / ' + TR_MOMENTS.length),
              h('span', null, 'Behavior ' + probPct + '%  ·  Trust ' + trustPct + '%')
            ),
            // Behavior probability bar
            h('div', { style: { height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }, 'aria-hidden': 'true' },
              h('div', { style: { width: probPct + '%', height: '100%', background: probPct >= 60 ? T.ok : probPct >= 30 ? T.accentHi : T.danger, transition: 'width 0.3s' } })
            ),
            // Trust bar
            h('div', { style: { height: 4, background: T.bg, borderRadius: 2, overflow: 'hidden' }, 'aria-hidden': 'true' },
              h('div', { style: { width: trustPct + '%', height: '100%', background: '#7dd3fc', transition: 'width 0.3s' } })
            )
          ),
          // The moment
          h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: T.accentHi, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, '🐕 What the puppy does'),
            h('div', { style: { fontSize: 16, color: T.text, fontWeight: 600, lineHeight: 1.5 } }, moment.desc),
            h('div', { style: { fontSize: 11, color: T.dim, marginTop: 8, fontStyle: 'italic' } }, 'You have ~3 seconds in real life — pick your response now.')
          ),
          // Response choices
          h('div', { role: 'radiogroup', 'aria-label': 'Choose your response',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 12 } },
            responseBtns.map(function(b) {
              var isPicked = revealed && thisChoice.rxn === b.id;
              return h('button', {
                key: b.id, className: 'petslab-sim-choice', role: 'radio', 'aria-checked': isPicked ? 'true' : 'false',
                'data-pets-focusable': true,
                disabled: revealed,
                onClick: function() { pickResponse(b.id); },
                style: btn({
                  padding: '12px 14px', fontSize: 13,
                  background: isPicked ? 'rgba(245,158,11,0.15)' : T.card,
                  border: '2px solid ' + (isPicked ? T.accent : T.border),
                  cursor: revealed ? 'default' : 'pointer',
                  textAlign: 'center'
                })
              },
                h('div', { style: { fontWeight: 700, marginBottom: 2 } }, b.label),
                h('div', { style: { fontSize: 11, color: T.dim, fontWeight: 400 } }, b.desc)
              );
            })
          ),
          // Reveal + next
          revealed && h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt,
              borderLeft: '4px solid ' + (thisChoice.dProb > 0 ? T.ok : thisChoice.dProb < 0 ? T.danger : T.dim),
              marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 } },
                h('span', { style: { fontSize: 11, fontWeight: 800, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Result'),
                h('span', { style: { fontSize: 12, fontFamily: 'monospace', color: thisChoice.dProb > 0 ? T.ok : thisChoice.dProb < 0 ? T.danger : T.dim, fontWeight: 700 } },
                  (thisChoice.dProb >= 0 ? '+' : '') + Math.round(thisChoice.dProb * 100) + '% behavior' +
                  (thisChoice.dTrust !== 0 ? ', ' + (thisChoice.dTrust >= 0 ? '+' : '') + Math.round(thisChoice.dTrust * 100) + '% trust' : '')
                )
              ),
              h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.6 } }, thisChoice.verdict)
            ),
            h('button', { 'data-pets-focusable': true,
              onClick: nextTrRound,
              style: btnPrimary({ padding: '10px 22px', fontSize: 13, width: '100%' })
            }, trSim.idx < TR_MOMENTS.length - 1 ? 'Next round →' : 'See results ✓')
          )
        );
      }
      // Mode toggle
      var trModeBar = h('div', { role: 'tablist', 'aria-label': 'Training mode',
        style: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' } },
        ['read', 'sim'].map(function(m) {
          var sel = trMode === m;
          return h('button', {
            key: m, role: 'tab', 'aria-selected': sel ? 'true' : 'false',
            'data-pets-focusable': true,
            'aria-label': m === 'read' ? 'Reading mode — scenarios reference' : 'Simulator mode — operant trainer game',
            onClick: function() { setTrMode(m); },
            style: btn({
              padding: '8px 14px', fontSize: 13,
              background: sel ? T.accent : T.card,
              color: sel ? '#1f1612' : T.text,
              border: '2px solid ' + (sel ? T.accent : T.border),
              fontWeight: sel ? 800 : 600
            })
          }, (m === 'read' ? '📚 Read scenarios' : '🎯 Trainer simulator'));
        })
      );
      if (trMode === 'sim') {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎯 Pet Training (applied)'),
          trModeBar,
          renderTrainerSim(),
          crossLink('Theory deep-dive: BehaviorLab', h('span', null,
            'For interactive operant conditioning theory (reinforcement schedules, shaping, extinction, chains), open ',
            h('strong', { style: { color: T.text } }, 'BehaviorLab'),
            '. This trainer applies that theory to a puppy in a kitchen.')),
          footer()
        );
      }
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🎯 Pet Training (applied)'),
        trModeBar,
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, 'This tile assumes the operant theory'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Reinforcement, schedules, shaping, extinction, and discrimination are covered deeply in ',
            h('strong', { style: { color: T.text } }, 'BehaviorLab'),
            ' (Skinner-box mouse simulator). This tile applies that theory to real homes + cross-species: what mice in a chamber can\'t teach you about working with a 60-lb dog or a parrot or a cat in your living room.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🧠 What pet training adds beyond Skinner box'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.65 } },
            h('li', null, h('strong', { style: { color: T.text } }, 'Socialization periods (developmental window):'),
              ' Puppies 3–14 wk, kittens 2–7 wk. Animals that don\'t encounter cars / kids / vacuum cleaners / strangers / handling during this window often stay fearful for life. NOT operant — it\'s neurodevelopmental imprinting.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Cross-species cognition differences:'),
              ' Dogs read human pointing gestures from puppyhood; wolves don\'t. Cats discriminate human voices but don\'t care to respond. Parrots use abstract concepts (Alex). One method does NOT fit all species.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Bond + handler relationship:'),
              ' Reinforcement value depends on the relationship — the same treat from a stranger is worth less than from a trusted handler. Skinner box doesn\'t model this.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Stress + trigger stacking:'),
              ' A dog already worried about thunderstorms may snap at the cat tonight even if cat-tolerance is normally fine. Read calming signals; manage stressors before they compound.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Real-world discrimination:'),
              ' "Sit" in your kitchen ≠ "sit" at the vet ≠ "sit" with a squirrel running by. Generalize across many contexts, not just one.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '7 real-world training scenarios'),
          scenarios.map(function(s) {
            return h('div', { key: s.id, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('strong', { style: { color: T.accentHi, fontSize: 14 } }, s.name),
              h('div', { style: { fontSize: 11, color: T.warm, fontStyle: 'italic', marginTop: 3, marginBottom: 5 } }, '↳ ' + s.principle),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, s.how),
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Species: ' + s.species));
          })),
        h('div', { style: { padding: 14, borderRadius: 10, background: '#3a1a1a', border: '1px solid ' + T.danger, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.warm } }, '⚠️ The dominance / "alpha" myth'),
          h('p', { style: { margin: 0, color: '#fde2e2', fontSize: 13, lineHeight: 1.6 } },
            'Skip "be the alpha." It was based on captive-wolf studies of unrelated wolves forced together (artificial). L. David Mech, the wolf researcher whose work popularized the term, has spent decades trying to retract it. Wild wolf packs are FAMILIES. Modern training (AVSAB, AVMA, AAVSB position) uses cooperative reinforcement — not status-based correction.')),
        crossLink('Theory deep-dive: BehaviorLab', h('span', null,
          'For interactive operant conditioning (reinforcement, schedules, shaping, extinction, chains, discrimination), open ',
          h('strong', { style: { color: T.text } }, 'BehaviorLab'),
          '. This Pet Training tile assumes you have that theory and shows how to apply it to real animals in real homes.')),
        footer());
    }

    // ─────────────────────────────────────────
    // NUTRITION
    // ─────────────────────────────────────────
    function renderNutrition() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🥩 Nutrition Science'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Species-specific requirements'),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 } },
            SPECIES_NUTRITION.map(function(n) {
              return h('div', { key: n.id, role: 'listitem',
                style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, n.icon),
                  h('strong', { style: { color: T.accentHi, fontSize: 13 } }, n.name)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, n.need),
                h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + n.cite));
            }))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '☠️ 8 common toxic foods'),
          TOXIC_FOODS.map(function(f) {
            return h('div', { key: f.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, f.icon),
                h('strong', { style: { color: T.accentHi, fontSize: 14 } }, f.name),
                h('span', { style: { marginLeft: 'auto', fontSize: 10, color: T.warm, fontFamily: 'monospace' } }, '→ ' + f.species)),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
                h('strong', { style: { color: T.text } }, 'Mechanism: '), f.mechanism),
              f.thresholdNote && h('div', { style: { fontSize: 11, color: T.warm, marginBottom: 3 } },
                h('strong', null, 'Threshold: '), f.thresholdNote),
              h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + f.cite));
          })),
        h('div', { style: { padding: 14, borderRadius: 10, background: '#3a1a1a', border: '1px solid ' + T.danger } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.warm } }, '🚑 If you suspect ingestion'),
          h('p', { style: { margin: 0, color: '#fde2e2', fontSize: 13, lineHeight: 1.55 } },
            h('strong', null, 'ASPCA Animal Poison Control: (888) 426-4435'),
            ' — $95 consult, 24/7. Often faster than driving to ER and they\'ll triage whether home observation is enough or vet is needed. ',
            h('strong', null, 'Pet Poison Helpline: (855) 764-7661'),
            ' is an alternative.')),

        // ─── TOXIC FOODS SLEUTH (net-new mini-game) ───
        // 10 vignettes; player picks the species at risk from 5 options.
        // Tests the discrimination between commonly-confused cases (chocolate
        // vs xylitol, lily-cat vs grape-dog, avocado vs teflon-fume birds).
        // Lifts data from the 8 toxic foods reference card above + safe distractors.
        (function() {
          var TFS_OPTIONS = [
            { id: 'safe',        label: 'Safe for both',     color: '#22c55e', icon: '✅', def: 'No documented toxicity for either dogs or cats at typical exposure.' },
            { id: 'toxicDogs',   label: 'Toxic — dogs',      color: '#dc2626', icon: '🐕', def: 'Primarily affects dogs (cats may be theoretical risk but not the canonical poisoning case).' },
            { id: 'toxicCats',   label: 'Toxic — cats',      color: '#a855f7', icon: '🐈', def: 'Primarily affects cats (dogs less commonly affected).' },
            { id: 'toxicBirds',  label: 'Toxic — birds',     color: '#0ea5e9', icon: '🦜', def: 'Primarily affects birds (often fatal; respiratory or cardiac mechanism).' },
            { id: 'toxicMulti',  label: 'Toxic — multiple', color: '#f59e0b', icon: '⚠️', def: 'Toxic to multiple species — dogs + cats both at risk, sometimes ferrets and birds too.' }
          ];
          var TFS_VIGNETTES = [
            { id: 1, food: 'Dark chocolate (~1 oz)', icon: '🍫', correct: 'toxicMulti',
              why: 'Theobromine + caffeine. Dogs metabolize theobromine very slowly (canonical poisoning case), but cats, ferrets, AND birds are also at risk. Dark chocolate is far worse than milk; baker\'s chocolate is the worst.' },
            { id: 2, food: 'Easter lily petals + pollen', icon: '🌸', correct: 'toxicCats',
              why: 'CATS only at clinical risk. ALL parts of true lilies (Lilium spp.) cause acute kidney failure in cats — even pollen brushed off on fur and groomed off. Dogs are essentially unaffected.' },
            { id: 3, food: 'Sugar-free gum (xylitol)', icon: '🧪', correct: 'toxicDogs',
              why: 'Xylitol triggers massive insulin release in dogs → hypoglycemia + liver failure. As little as 1–2 pieces of gum can poison a small dog. Cats are largely unaffected because their insulin response differs.' },
            { id: 4, food: 'Grapes / raisins (any amount)', icon: '🍇', correct: 'toxicDogs',
              why: 'Tartaric acid (ASPCA 2021) causes acute kidney failure in dogs, unpredictably — even tiny amounts can kill. Cats theoretical but no confirmed cases. Treat ANY ingestion in a dog as emergency.' },
            { id: 5, food: 'Cooked onions in food scraps', icon: '🧅', correct: 'toxicMulti',
              why: 'N-propyl disulfide damages red blood cells in BOTH dogs and cats → hemolytic anemia. Cats are MORE sensitive than dogs. Cooking does NOT inactivate. Garlic and leeks (same Allium family) work the same way.' },
            { id: 6, food: 'Avocado flesh + skin', icon: '🥑', correct: 'toxicBirds',
              why: 'Persin causes cardiac muscle damage in BIRDS — can kill within 24 hours. Parrots, cockatiels, and canaries are especially vulnerable. Dogs and cats are relatively tolerant of avocado flesh (the pit is a GI obstruction risk, but not chemically toxic).' },
            { id: 7, food: 'Overheated nonstick (Teflon) pan fumes', icon: '🍳', correct: 'toxicBirds',
              why: 'Polymer fumes from PTFE > 500°F kill BIRDS in MINUTES — respiratory system shuts down. Cats and dogs are not at clinical risk. Why pet birds should never be in the kitchen during cooking. Same risk: scented candles, aerosol cleaners, cigarette smoke.' },
            { id: 8, food: 'A handful of macadamia nuts', icon: '🥜', correct: 'toxicDogs',
              why: 'Mechanism unknown but causes weakness, tremors, hyperthermia, hind-limb ataxia in DOGS within 12 hours. Cats are unaffected. Usually self-resolves but distressing. ~2 g/kg toxic dose.' },
            { id: 9, food: 'Plain cooked chicken (boneless, unseasoned)', icon: '🍗', correct: 'safe',
              why: 'Plain protein, no Allium seasoning, no bones (cooked bones splinter). Safe for both dogs and cats — and a common ER vet recommendation as a bland diet for upset stomachs.' },
            { id: 10, food: 'Raw carrot sticks', icon: '🥕', correct: 'safe',
              why: 'Carrots are safe and even beneficial (low-calorie chewing) for dogs and cats. Some cats ignore them entirely, but no toxicity. Crunchy texture also helps with dental plaque in dogs.' }
          ];

          var tfsIdx = d.tfsIdx == null ? -1 : d.tfsIdx;
          var tfsSeed = d.tfsSeed || 1;
          var tfsAns = !!d.tfsAns;
          var tfsPick = d.tfsPick;
          var tfsScore = d.tfsScore || 0;
          var tfsRounds = d.tfsRounds || 0;
          var tfsStreak = d.tfsStreak || 0;
          var tfsBest = d.tfsBest || 0;
          var tfsShown = d.tfsShown || [];
          var tfsOpen = !!d.tfsOpen;

          // ESC dismisses the Toxic Foods Sleuth modal (keyboard accessibility)
          React.useEffect(function() {
            if (!tfsOpen) return;
            function onEsc(e) {
              if (e.key === 'Escape') { e.preventDefault(); upd('tfsOpen', false); }
            }
            document.addEventListener('keydown', onEsc);
            return function() { document.removeEventListener('keydown', onEsc); };
          }, [tfsOpen]);

          function startTfs() {
            var pool = [];
            for (var i = 0; i < TFS_VIGNETTES.length; i++) if (tfsShown.indexOf(i) < 0) pool.push(i);
            if (pool.length === 0) { pool = []; for (var j = 0; j < TFS_VIGNETTES.length; j++) pool.push(j); tfsShown = []; }
            var seedNext = ((tfsSeed * 16807 + 11) % 2147483647) || 7;
            var pick = pool[seedNext % pool.length];
            upd('tfsSeed', seedNext);
            upd('tfsIdx', pick);
            upd('tfsAns', false);
            upd('tfsPick', null);
            upd('tfsShown', tfsShown.concat([pick]));
          }
          function pickTfs(optId) {
            if (tfsAns) return;
            var v = TFS_VIGNETTES[tfsIdx];
            var correct = optId === v.correct;
            var newScore = tfsScore + (correct ? 1 : 0);
            var newStreak = correct ? (tfsStreak + 1) : 0;
            var newBest = Math.max(tfsBest, newStreak);
            upd('tfsAns', true);
            upd('tfsPick', optId);
            upd('tfsScore', newScore);
            upd('tfsRounds', tfsRounds + 1);
            upd('tfsStreak', newStreak);
            upd('tfsBest', newBest);
          }

          return h('div', { style: { padding: 14, marginTop: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent + '88' } },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, '🕵️'),
                h('div', null,
                  h('div', { style: { color: T.accentHi, fontSize: 14, fontWeight: 900 } }, 'Toxic Foods Sleuth'),
                  h('div', { style: { color: T.dim, fontSize: 11, fontStyle: 'italic' } }, '10 vignettes — pick the species at risk. Builds the "could this kill the pet?" reflex.')
                )
              ),
              h('button', {
                'aria-label': tfsOpen ? 'Close Toxic Foods Sleuth quiz' : 'Open Toxic Foods Sleuth quiz',
                'aria-expanded': tfsOpen,
                onClick: function() { upd('tfsOpen', !tfsOpen); },
                style: { padding: '6px 12px', borderRadius: 8, background: T.cardAlt, color: T.accentHi, border: '1px solid ' + T.accent, fontSize: 11, fontWeight: 700, cursor: 'pointer' }
              }, tfsOpen ? 'Hide ▴' : 'Play →')
            ),
            tfsOpen && h('div', { role: 'region', 'aria-label': 'Toxic Foods Sleuth quiz game', tabIndex: 0, style: { marginTop: 12 } },
              tfsIdx < 0
                ? h('div', { style: { textAlign: 'center', padding: '12px 8px' } },
                    h('p', { style: { color: T.muted, fontSize: 12, lineHeight: 1.55, marginBottom: 12 } },
                      '10 food + species vignettes. For each, pick which species (if any) is at primary risk. After picking, a coaching block names what makes this species the canonical poisoning case and what the others would or would not experience.'),
                    h('button', {
                      onClick: startTfs,
                      style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#0f172a', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
                    }, '🕵️ Start — vignette 1 of 10')
                  )
                : (function() {
                    var v = TFS_VIGNETTES[tfsIdx];
                    var pickedCorrect = tfsAns && tfsPick === v.correct;
                    var pct = tfsRounds > 0 ? Math.round((tfsScore / tfsRounds) * 100) : 0;
                    var allDone = tfsShown.length >= TFS_VIGNETTES.length && tfsAns;
                    return h('div', null,
                      // Score header
                      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 11, color: T.dim, marginBottom: 8 } },
                        h('span', null, 'Vignette ', h('strong', { style: { color: T.text } }, tfsShown.length)),
                        h('span', null, 'Score ', h('strong', { style: { color: T.ok } }, tfsScore + ' / ' + tfsRounds)),
                        tfsRounds > 0 && h('span', null, 'Accuracy ', h('strong', { style: { color: T.link } }, pct + '%')),
                        h('span', null, 'Streak ', h('strong', { style: { color: T.warm } }, tfsStreak)),
                        h('span', null, 'Best ', h('strong', { style: { color: T.accentHi } }, tfsBest))
                      ),
                      // Vignette card
                      h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '2px solid ' + T.accent + '60', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
                        h('div', { style: { fontSize: 36, flexShrink: 0 }, 'aria-hidden': 'true' }, v.icon),
                        h('div', { style: { flex: 1, minWidth: 200 } },
                          h('div', { style: { fontSize: 11, color: T.accentHi, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, 'Vignette ' + tfsShown.length + ' of ' + TFS_VIGNETTES.length),
                          h('div', { style: { fontSize: 14, fontWeight: 700, color: T.text } }, v.food)
                        )
                      ),
                      // 5 picker buttons
                      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }, role: 'radiogroup', 'aria-label': 'Pick the species at risk' },
                        TFS_OPTIONS.map(function(opt) {
                          var picked = tfsAns && tfsPick === opt.id;
                          var isRight = tfsAns && opt.id === v.correct;
                          var bg, border, color;
                          if (tfsAns) {
                            if (isRight) { bg = 'rgba(34,197,94,0.15)'; border = T.ok; color = '#bbf7d0'; }
                            else if (picked) { bg = 'rgba(239,68,68,0.15)'; border = T.danger; color = '#fecaca'; }
                            else { bg = T.cardAlt; border = T.border; color = T.dim; }
                          } else {
                            bg = opt.color + '20'; border = opt.color + '60'; color = T.text;
                          }
                          return h('button', {
                            key: opt.id, role: 'radio',
                            'aria-checked': picked ? 'true' : 'false',
                            'aria-label': opt.label,
                            disabled: tfsAns,
                            onClick: function() { pickTfs(opt.id); },
                            style: { padding: '10px 12px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: tfsAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 60, transition: 'all 0.15s' }
                          },
                            h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
                              h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, opt.icon),
                              h('span', { style: { color: tfsAns ? color : opt.color, fontSize: 12, fontWeight: 800 } }, opt.label)
                            ),
                            h('div', { style: { fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: tfsAns ? color : T.muted } }, opt.def)
                          );
                        })
                      ),
                      // Feedback
                      tfsAns && h('div', {
                        style: {
                          marginTop: 10, padding: '10px 12px', borderRadius: 8,
                          background: pickedCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                          border: '1px solid ' + (pickedCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)')
                        }
                      },
                        h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 4, color: pickedCorrect ? '#86efac' : '#fca5a5' } },
                          pickedCorrect
                            ? '✅ Correct — ' + (TFS_OPTIONS.filter(function(x) { return x.id === v.correct; })[0]).label
                            : '❌ It was ' + (TFS_OPTIONS.filter(function(x) { return x.id === v.correct; })[0]).label + (tfsPick ? ' (you picked ' + (TFS_OPTIONS.filter(function(x) { return x.id === tfsPick; })[0]).label + ')' : '')
                        ),
                        h('p', { style: { color: T.text, fontSize: 12, lineHeight: 1.55, margin: '0 0 8px' } }, v.why),
                        allDone
                          ? h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent } },
                              h('div', { style: { fontSize: 13, fontWeight: 800, color: T.accentHi, marginBottom: 4 } }, '🏆 All 10 vignettes complete'),
                              h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.5 } },
                                'Final: ', h('strong', null, tfsScore + ' / ' + TFS_VIGNETTES.length + ' (' + Math.round((tfsScore / TFS_VIGNETTES.length) * 100) + '%)'),
                                tfsScore === TFS_VIGNETTES.length ? ' — every species-specific risk correctly identified. Save the ASPCA poison control number above to your phone now.' :
                                tfsScore >= 8 ? ' — strong species-discrimination reasoning. The most-confused pair is usually grapes vs onions (one is dogs-only, the other affects both).' :
                                tfsScore >= 6 ? ' — solid baseline. The discriminator to remember: lily kills CATS only; xylitol/grapes/macadamia kill DOGS; teflon/avocado kill BIRDS; chocolate + onions affect ALL.' :
                                ' — these patterns matter at 2 AM when a kid texts you "my dog ate X." Save the poison control number AND retake.'
                              ),
                              h('button', {
                                onClick: function() { upd('tfsIdx', -1); upd('tfsShown', []); upd('tfsScore', 0); upd('tfsRounds', 0); upd('tfsStreak', 0); },
                                style: { marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: T.accent, color: '#0f172a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                              }, '🔄 Restart')
                            )
                          : h('button', {
                              onClick: startTfs,
                              style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: T.accent, color: '#0f172a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                            }, '➡️ Next vignette')
                      )
                    );
                  })()
            )
          );
        })(),

        footer());
    }

    // ─────────────────────────────────────────
    // DOMESTICATION & BREEDING
    // ─────────────────────────────────────────
    function renderGenetics() {
      return h('div', { className: 'petslab-genetics-view', style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🧬 Domestication & Breeding'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, 'This tile owns artificial selection'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'For natural-selection theory (Darwin, Galápagos finches, Hardy-Weinberg, genetic drift), open ',
            h('strong', { style: { color: T.text } }, 'EvolutionLab'),
            '. This tile covers ARTIFICIAL selection — what humans did to dogs, cats, and other companion species across thousands of generations of choosing who breeds with whom.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Domestication timeline'),
          h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
            h('thead', null,
              h('tr', { style: { background: T.cardAlt } },
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'Species'),
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'When'),
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'From'),
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'Where'))),
            h('tbody', null,
              [['Dog', '15,000–40,000 yr ago', 'Pleistocene wolf', 'Eurasia — region disputed *'],
               ['Cat', '~9,500 yr ago', 'Felis silvestris (African wildcat)', 'Fertile Crescent'],
               ['Goat', '~10,000 yr ago', 'Bezoar ibex', 'Zagros Mountains'],
               ['Sheep', '~10,000 yr ago', 'Mouflon', 'Anatolia'],
               ['Pig', '~9,000 yr ago', 'Wild boar', 'Multiple sites'],
               ['Horse', '~4,200 yr ago *', 'Eurasian wild horse', 'Western Eurasian steppe'],
               ['Chicken', '~8,000 yr ago', 'Red junglefowl', 'SE Asia'],
               ['Rabbit', 'gradual — no single date *', 'European wild rabbit', 'Iberia + SW France'],
               ['Guinea pig', '~7,000 yr ago', 'Cavia tschudii', 'Andes mountains'],
               ['Hamster (Syrian)', '~1930 (essentially modern)', 'Wild Mesocricetus auratus', 'Aleppo, Syria']].map(function(row, i) {
                return h('tr', { key: i, style: { background: i % 2 === 0 ? T.cardAlt : T.card, borderBottom: '1px solid ' + T.border } },
                  row.map(function(cell, j) {
                    return h('td', { key: j, style: { padding: '6px 8px', color: j === 0 ? T.text : T.muted, fontWeight: j === 0 ? 700 : 400 } }, cell);
                  }));
              }))),
          h('p', { style: { margin: '10px 0 0', fontSize: 11, color: T.dim, lineHeight: 1.6 } },
            h('strong', { style: { color: T.muted } }, '* These are moving targets, and that is the interesting part. '),
            'Ancient-DNA work keeps revising this table, so treat any single date as provisional. Three worth knowing about: ',
            h('strong', { style: { color: T.muted } }, 'dogs'),
            ' — everyone agrees the ancestor is an extinct Pleistocene wolf lineage, but the region is genuinely unsettled (East Asia, Europe, and Central Asia have all been argued, and a dual origin is on the table). ',
            h('strong', { style: { color: T.muted } }, 'Horses'),
            ' — the 5,500-year-old Botai horses used to be called the first domestic horses, until ancient DNA showed they are ancestors of Przewalski\'s horse and left essentially no modern descendants; today\'s domestic lineage spread from the western Eurasian steppe roughly 4,200 years ago (Librado et al. 2021). ',
            h('strong', { style: { color: T.muted } }, 'Rabbits'),
            ' — the famous story that monks domesticated rabbits in 600 AD after a papal ruling traces to a misreading of the sources, not evidence; rabbit domestication was gradual with no founding moment (Irving-Pease et al. 2018, memorably titled "Rabbits and the Specious Origins of Domestication"). A confidently-repeated date is not the same as a well-supported one.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🦴 Inbreeding consequences (the cost of "purebred")'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Closed studbooks (you can only breed within the registered pool) + selection for extreme features create concentrated genetic problems:'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.65 } },
            h('li', null, h('strong', { style: { color: T.warm } }, 'Brachycephaly'),
              ' (English bulldog, French bulldog, pug, Persian cat): collapsed airways, can\'t exercise, can\'t cool themselves, eye problems, dental crowding. Many can\'t give birth without C-section.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Hip dysplasia'),
              ' (German Shepherd, Labrador, Golden Retriever): malformed hip joint causes lifelong pain. OFA + PennHIP screening before breeding reduces incidence.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Syringomyelia'),
              ' (Cavalier King Charles Spaniel): brain too large for the skull → spinal cord cavities → severe pain. ~70% of CKCS show MRI signs by age 6.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Deafness'),
              ' linked to white-coat genes (Dalmatians, blue-eyed white cats, double-merle dogs). Up to 30% of Dalmatians have hearing loss in at least one ear.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Hypertrophic cardiomyopathy'),
              ' (Maine Coon, Ragdoll cats): genetic test exists for the major mutations; reputable breeders screen.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'Designer-breed reality'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'F1 "doodle" hybrids (Goldendoodle, Labradoodle) are genuinely first-generation crosses with hybrid vigor and unpredictable coats / sizes / temperaments. F2+ generations (doodle × doodle) lose the predictability AND can stack health risks from both parents. "Hypoallergenic" is overstated — allergens are in saliva + dander, not just hair, and no breed is truly hypoallergenic.')),

        // ── Interactive Punnett square: Labrador coat color (2 loci) ──
        // B locus: B (black) dominant over b (chocolate). E locus: E allows
        // expression of pigment; ee masks pigment so dog is yellow regardless
        // of B/b. Two black Labs with hidden b or e can absolutely have a
        // chocolate or yellow puppy — students see WHY in the 16 squares.
        (function() {
          var pa1 = d.geneP1 || 'BbEe';
          var pa2 = d.geneP2 || 'BbEe';
          // Generate gametes from a 2-locus genotype like 'BbEe'
          function gametes(geno) {
            // geno is 4 chars: B/b at index 0-1, E/e at index 2-3 (e.g. 'BbEe', 'BBEe', 'bbee')
            // Take BOTH alleles at each locus and cross them. That is always
            // exactly 4 gametes with the right multiplicities, which is what
            // makes all 16 grid cells equally likely.
            //
            // Do NOT "simplify" this by collapsing a homozygous locus to a
            // single allele and padding the list back up to 4. Padding repeats
            // one gamete and silently reweights the whole grid: that bug made
            // BbEE x BbEE read 7 black : 9 chocolate instead of the correct
            // 12 : 4, and Bbee x bbEe read 1:3:12 instead of 4:4:8. It was
            // invisible on the BbEe x BbEe default, which is heterozygous at
            // both loci and therefore never hit the padding branch.
            var bs = [geno[0], geno[1]];
            var es = [geno[2], geno[3]];
            var out = [];
            bs.forEach(function(bb) {
              es.forEach(function(ee) {
                out.push(bb + ee);
              });
            });
            return out;
          }
          // Phenotype from offspring (4-char genotype string like 'BBEe' or unsorted)
          function phenotype(b1, b2, e1, e2) {
            // Order by dominant first
            var hasE = (e1 === 'E' || e2 === 'E');
            if (!hasE) return {
              color: 'Yellow', hex: '#fbbf24', text: '#1f1612', marker: 'YLW',
              coat: '#d9ad55', coatHi: '#f4d990', coatShadow: '#9b6f2d', nose: '#4b2c1b'
            };
            var hasB = (b1 === 'B' || b2 === 'B');
            if (hasB) return {
              color: 'Black', hex: '#1f2937', text: '#fef3c7', marker: 'BLK',
              coat: '#242c38', coatHi: '#4b5868', coatShadow: '#10151d', nose: '#05070a'
            };
            return {
              color: 'Chocolate', hex: '#78350f', text: '#fef3c7', marker: 'CHO',
              coat: '#713c20', coatHi: '#a9673f', coatShadow: '#402012', nose: '#24120d'
            };
          }
          function renderLabPortrait(ph, parentNum) {
            var gradientId = 'pets-lab-coat-' + parentNum;
            return h('svg', {
              className: 'petslab-lab-portrait',
              viewBox: '0 0 120 108',
              role: 'img',
              'aria-label': 'Parent ' + parentNum + ', ' + ph.color + ' Labrador portrait',
              focusable: 'false'
            },
              h('defs', null,
                h('linearGradient', { id: gradientId, x1: '18%', y1: '8%', x2: '84%', y2: '94%' },
                  h('stop', { offset: '0%', stopColor: ph.coatHi }),
                  h('stop', { offset: '48%', stopColor: ph.coat }),
                  h('stop', { offset: '100%', stopColor: ph.coatShadow })
                )
              ),
              h('circle', { cx: 60, cy: 54, r: 50, fill: 'rgba(245,158,11,0.11)', stroke: 'rgba(245,158,11,0.28)', strokeWidth: 2 }),
              h('path', { d: 'M26 38 C10 29 10 61 28 73 C34 65 36 50 35 41 Z', fill: ph.coatShadow }),
              h('path', { d: 'M94 38 C110 29 110 61 92 73 C86 65 84 50 85 41 Z', fill: ph.coatShadow }),
              h('path', { d: 'M15 108 C18 83 34 76 60 76 C86 76 102 83 105 108 Z', fill: 'url(#' + gradientId + ')' }),
              h('ellipse', { cx: 60, cy: 54, rx: 34, ry: 38, fill: 'url(#' + gradientId + ')' }),
              h('path', { d: 'M36 48 C41 42 49 41 53 47', fill: 'none', stroke: ph.coatShadow, strokeWidth: 2.5, strokeLinecap: 'round' }),
              h('path', { d: 'M67 47 C72 41 80 42 84 48', fill: 'none', stroke: ph.coatShadow, strokeWidth: 2.5, strokeLinecap: 'round' }),
              h('circle', { cx: 46, cy: 51, r: 3.5, fill: '#20130d' }),
              h('circle', { cx: 74, cy: 51, r: 3.5, fill: '#20130d' }),
              h('circle', { cx: 47, cy: 50, r: 1, fill: '#ffffff' }),
              h('circle', { cx: 75, cy: 50, r: 1, fill: '#ffffff' }),
              h('ellipse', { cx: 60, cy: 68, rx: 22, ry: 16, fill: ph.coatHi, opacity: 0.92 }),
              h('path', { d: 'M51 63 Q60 57 69 63 Q68 71 60 72 Q52 71 51 63 Z', fill: ph.nose }),
              h('path', { d: 'M60 72 L60 77 M60 77 Q53 82 48 77 M60 77 Q67 82 72 77', fill: 'none', stroke: ph.coatShadow, strokeWidth: 2, strokeLinecap: 'round' }),
              h('path', { d: 'M31 86 Q60 99 89 86', fill: 'none', stroke: '#f59e0b', strokeWidth: 5, strokeLinecap: 'round' }),
              h('circle', { cx: 60, cy: 94, r: 4, fill: '#fbbf24', stroke: '#5b3408', strokeWidth: 1.5 })
            );
          }
          function renderAlleleLocus(label, alleles) {
            return h('div', { className: 'petslab-allele-locus' },
              h('span', { className: 'petslab-allele-locus-name' }, label),
              h('div', {
                className: 'petslab-allele-chips',
                role: 'list',
                'aria-label': label + ' alleles: ' + alleles.join(' and ')
              },
                alleles.map(function(allele, alleleIndex) {
                  var dominant = allele === allele.toUpperCase();
                  return h('span', {
                    key: alleleIndex,
                    role: 'listitem',
                    className: 'petslab-allele-chip' + (dominant ? ' petslab-allele-chip--dominant' : ''),
                    'aria-label': (dominant ? 'dominant ' : 'recessive ') + allele + ' allele'
                  }, allele);
                })
              )
            );
          }
          // Sort genotype letters so 'BB' / 'Bb' (not 'bB')
          function sortAlleles(a, b) {
            // Uppercase first
            if (a.toUpperCase() === a && b.toUpperCase() !== b) return a + b;
            if (b.toUpperCase() === b && a.toUpperCase() !== a) return b + a;
            return [a, b].sort().join('');
          }
          var g1 = gametes(pa1);
          var g2 = gametes(pa2);
          // Build the 4×4 Punnett grid
          var grid = [];
          var counts = { Black: 0, Chocolate: 0, Yellow: 0 };
          for (var ri = 0; ri < 4; ri++) {
            grid[ri] = [];
            for (var ci = 0; ci < 4; ci++) {
              var ga = g1[ri], gb = g2[ci];
              var bGeno = sortAlleles(ga[0], gb[0]);
              var eGeno = sortAlleles(ga[1], gb[1]);
              var pheno = phenotype(ga[0], gb[0], ga[1], gb[1]);
              counts[pheno.color]++;
              grid[ri][ci] = { geno: bGeno + eGeno, pheno: pheno };
            }
          }
          var GENOTYPE_OPTIONS = [
            { id: 'BBEE', label: 'BBEE — Pure black' },
            { id: 'BBEe', label: 'BBEe — Black, carrier for yellow' },
            { id: 'BbEE', label: 'BbEE — Black, carrier for chocolate' },
            { id: 'BbEe', label: 'BbEe — Black, carrier for both (most common pet)' },
            { id: 'bbEE', label: 'bbEE — Pure chocolate' },
            { id: 'bbEe', label: 'bbEe — Chocolate, carrier for yellow' },
            { id: 'BBee', label: 'BBee — Yellow (B hidden by ee)' },
            { id: 'Bbee', label: 'Bbee — Yellow (B hidden by ee)' },
            { id: 'bbee', label: 'bbee — Yellow with brown pigment (nose, eye rims)' }
          ];
          return h('div', { className: 'petslab-punnett-lab', style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } }, '🧪 Punnett square: Labrador coat color (B/b · E/e)'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Two genes determine Lab color. ',
              h('strong', { style: { color: T.text } }, 'B'), ' (black) is dominant over ',
              h('strong', { style: { color: T.text } }, 'b'), ' (chocolate). ',
              h('strong', { style: { color: T.text } }, 'E'), ' allows pigment expression; ',
              h('strong', { style: { color: T.text } }, 'ee'), ' masks pigment so the dog is yellow regardless of B/b. Pick two parents to see all 16 possible offspring genotypes and the resulting phenotype ratio.'
            ),
            // Parent pickers
            h('div', { className: 'petslab-gene-parent-grid' },
              ['1', '2'].map(function(num) {
                var key = num === '1' ? 'geneP1' : 'geneP2';
                var val = num === '1' ? pa1 : pa2;
                var ph = phenotype(val[0], val[1], val[2], val[3]);
                return h('div', { key: num, className: 'petslab-gene-parent-card' },
                  h('label', { htmlFor: 'pets-gene-p' + num, style: { display: 'block', fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 4 } }, 'Parent ' + num),
                  h('select', {
                    id: 'pets-gene-p' + num,
                    'data-pets-focusable': true,
                    value: val,
                    onChange: function(e) { upd(key, e.target.value); },
                    style: { width: '100%', padding: 8, borderRadius: 8, background: T.cardAlt, color: T.text, border: '1px solid ' + T.border, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
                  },
                    GENOTYPE_OPTIONS.map(function(opt) {
                      return h('option', { key: opt.id, value: opt.id }, opt.label);
                    })
                  ),
                  h('div', { className: 'petslab-gene-parent-visual' },
                    renderLabPortrait(ph, num),
                    h('div', { className: 'petslab-parent-summary' },
                      h('div', {
                        className: 'petslab-coat-swatch',
                        role: 'img',
                        'aria-label': ph.color + ' Labrador coat swatch',
                        style: {
                          background: 'linear-gradient(135deg,' + ph.coatHi + ',' + ph.coat + ' 55%,' + ph.coatShadow + ')',
                          color: ph.text
                        }
                      },
                        h('span', { className: 'petslab-coat-swatch-mark', 'aria-hidden': 'true' }, ph.marker),
                        h('span', null, ph.color + ' Lab coat')
                      ),
                      h('div', { className: 'petslab-allele-loci' },
                        renderAlleleLocus('B locus', [val[0], val[1]]),
                        renderAlleleLocus('E locus', [val[2], val[3]])
                      ),
                      h('div', { className: 'petslab-gene-key' },
                        'Uppercase chips are dominant; lowercase chips are recessive.'
                      )
                    )
                  )
                );
              })
            ),
            // Punnett grid
            h('div', {
              className: 'petslab-punnett-scroll',
              role: 'region',
              'aria-label': 'Scrollable Punnett square',
              tabIndex: 0
            },
              h('table', { className: 'petslab-punnett-table',
                'aria-label': 'Punnett square 4 by 4 grid showing 16 offspring genotypes and phenotypes' },
                h('thead', null,
                  h('tr', null,
                    h('th', { scope: 'col', style: { padding: 6, color: T.dim, fontSize: 10 } }, ''),
                    g2.map(function(gam, i) {
                      return h('th', { key: i, scope: 'col', style: { padding: 6, color: T.accentHi, fontSize: 12, fontWeight: 800, background: T.cardAlt, border: '1px solid ' + T.border } }, gam);
                    })
                  )
                ),
                h('tbody', null,
                  grid.map(function(row, ri) {
                    return h('tr', { key: ri },
                      h('th', { scope: 'row', style: { padding: 6, color: T.accentHi, fontSize: 12, fontWeight: 800, background: T.cardAlt, border: '1px solid ' + T.border, textAlign: 'center' } }, g1[ri]),
                      row.map(function(cell, ci) {
                        return h('td', {
                          key: ci,
                          className: 'petslab-punnett-cell',
                          'data-phenotype': cell.pheno.color.toLowerCase(),
                          'aria-label': cell.geno + ', ' + cell.pheno.color + ' coat phenotype',
                          style: {
                          padding: 6, border: '1px solid ' + T.border,
                          background: cell.pheno.hex, color: cell.pheno.text,
                          textAlign: 'center', fontSize: 12, fontWeight: 700
                        } },
                          h('div', { className: 'petslab-cell-genotype' }, cell.geno),
                          h('div', { className: 'petslab-cell-phenotype' },
                            h('span', { className: 'petslab-phenotype-shape', 'aria-hidden': 'true' }, cell.pheno.marker),
                            h('span', null, cell.pheno.color)
                          )
                        );
                      })
                    );
                  })
                )
              )
            ),
            // Phenotype ratios
            h('div', { className: 'petslab-outcome' },
              h('div', { className: 'petslab-outcome-heading' },
                h('strong', null, 'Phenotype outcomes'),
                h('span', null, '16 equally likely offspring combinations')
              ),
              h('div', {
                className: 'petslab-outcome-bar',
                role: 'img',
                'aria-label': 'Phenotype outcomes: ' + counts.Black + ' black, ' +
                  counts.Chocolate + ' chocolate, and ' + counts.Yellow + ' yellow, out of 16'
              },
                ['Black', 'Chocolate', 'Yellow'].map(function(color) {
                  var count = counts[color];
                  if (!count) return null;
                  var pct = (count / 16 * 100).toFixed(0);
                  var ph = phenotype(color === 'Black' ? 'B' : 'b', color === 'Black' ? 'B' : 'b',
                                     color === 'Yellow' ? 'e' : 'E', color === 'Yellow' ? 'e' : 'E');
                  return h('div', {
                    key: color,
                    className: 'petslab-outcome-segment petslab-outcome-segment--' + color.toLowerCase(),
                    'aria-hidden': 'true',
                    style: { flex: '0 0 ' + (count / 16 * 100) + '%' }
                  }, count >= 2 ? ph.marker + ' ' + pct + '%' : ph.marker);
                })
              ),
              h('div', {
                className: 'petslab-outcome-legend',
                role: 'list',
                'aria-label': 'Phenotype outcome legend'
              },
                ['Black', 'Chocolate', 'Yellow'].map(function(color) {
                  var ph = phenotype(color === 'Black' ? 'B' : 'b', color === 'Black' ? 'B' : 'b',
                                     color === 'Yellow' ? 'e' : 'E', color === 'Yellow' ? 'e' : 'E');
                  var pct = (counts[color] / 16 * 100).toFixed(0);
                  return h('div', {
                    key: color,
                    role: 'listitem',
                    className: 'petslab-outcome-card',
                    style: { background: ph.hex, color: ph.text }
                  },
                    h('div', { className: 'petslab-outcome-card-label' },
                      h('span', { className: 'petslab-phenotype-shape', 'aria-hidden': 'true' }, ph.marker),
                      h('span', null, color)
                    ),
                    h('div', { className: 'petslab-outcome-card-count' }, counts[color] + '/16'),
                    h('div', { className: 'petslab-outcome-card-pct' }, pct + '%')
                  );
                })
              )
            ),
            // Teaching note tied to the current cross
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              (function() {
                if (pa1 === 'BbEe' && pa2 === 'BbEe') return h('div', null,
                  h('strong', { style: { color: T.text } }, 'Why this matters: '),
                  'Two black Labs (BbEe × BbEe) can produce ANY of the three Lab colors. The 9:3:4 ratio (black:chocolate:yellow) is the classic Mendelian outcome with epistasis. The "ee" alleles mask whatever B/b a yellow Lab carries — that\'s why a yellow Lab can have any nose color from black to brown.');
                if (counts.Yellow === 16) return h('div', null,
                  h('strong', { style: { color: T.text } }, 'All yellow: '),
                  'Both parents are ee (homozygous recessive at the E locus) so neither can express B or b pigment. 100% of puppies will be yellow regardless of what B/b alleles they carry.');
                if (counts.Black === 16) return h('div', null,
                  h('strong', { style: { color: T.text } }, 'All black: '),
                  'No recessive alleles to surface. The puppies are all black, but their carrier status varies depending on parents\' genotypes.');
                // Show the reduced ratio too: 4:4:8 is what the grid counts,
                // but 1:1:2 is what a textbook prints and what a student is
                // being asked to recognise.
                function gcd2(a, b) { while (b) { var t = b; b = a % b; a = t; } return a; }
                var g = 0;
                [counts.Black, counts.Chocolate, counts.Yellow].forEach(function(n) {
                  if (n) g = gcd2(g, n);
                });
                var reduced = (g > 1)
                  ? (counts.Black / g) + ':' + (counts.Chocolate / g) + ':' + (counts.Yellow / g)
                  : '';
                return h('div', null,
                  h('strong', { style: { color: T.text } }, 'Phenotype ratio: '),
                  counts.Black + ' black : ' + counts.Chocolate + ' chocolate : ' + counts.Yellow + ' yellow, out of 16',
                  reduced ? ' — which simplifies to ' + reduced : '',
                  '. Try a different cross — especially Bbee × bbEe — to see how recessive alleles surface.'
                );
              })()
            ),
            h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, fontStyle: 'italic', lineHeight: 1.55 } },
              'Real Lab genetics also include modifier genes (intensity, dilution) that produce variations like silver and champagne — those are minor genetic tweaks on this same B/b · E/e backbone. Reputable breeders test for both loci before mating.'
            )
          );
        })(),
        footer());
    }

    // ─────────────────────────────────────────
    // ZOONOSES & ONE HEALTH
    // ─────────────────────────────────────────
    function renderZoonoses() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🦠 Zoonoses & One Health'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Zoonoses are diseases that cross between humans and other animals. The CDC ',
            h('strong', { style: { color: T.accentHi } }, 'One Health'),
            ' framework recognizes that human, animal, and environmental health are inseparable. About 60% of known infectious diseases are zoonotic; ~75% of newly emerging infectious diseases originate in animals.')),
        ZOONOSES.map(function(z) {
          return h('div', { key: z.id, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 20 } }, z.icon),
              h('strong', { style: { color: T.accentHi, fontSize: 14 } }, z.name),
              h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'from ' + z.from)),
            h('div', { style: { fontSize: 12, color: T.warm, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', null, '⚠ Severity: '), z.severity),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.text } }, '🛡 Protect: '), z.protect),
            h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + z.cite));
        }),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Maine has ',
            h('strong', { style: { color: T.accentHi } }, 'one of the highest US Lyme + anaplasmosis incidence rates'),
            '. Year-round tick prevention is standard veterinary care. Maine CDC tracks tick-borne disease cases — see maine.gov/dhhs/mecdc. Rabies is endemic in Maine wildlife (raccoons, skunks, foxes, bats); annual rabies vaccine is legally required for dogs + cats.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SERVICE & SUPPORT ANIMALS (UDL standout)
    // ─────────────────────────────────────────
    function renderService() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('♿ Service & Support Animals'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, 'Three legally + scientifically distinct categories'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'These get conflated constantly in public conversation, but they have very different legal protections, training standards, and access rights. Knowing the difference matters for handlers, businesses, school staff, and bystanders.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🦮 Service dog (ADA, federal)'),
          h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Definition: '),
              'A dog (and in some narrow cases miniature horse) ',
              h('strong', { style: { color: T.text } }, 'individually trained to perform tasks for a person with a disability'),
              '. The disability can be physical, sensory, psychiatric, intellectual, or other.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Access: '),
              'Full public access under the ADA — restaurants, shops, hospitals, schools, planes (separately under ACAA). Businesses may ask only TWO questions: (1) Is the dog a service animal required because of a disability? (2) What work or task has the dog been trained to perform? They CANNOT ask for documentation, demand a demonstration, or ask about the disability.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Tasks include: '),
              'guiding (blind), alerting (deaf), medical alert (blood-glucose drop, oncoming seizure), retrieval, mobility brace, deep-pressure therapy (interrupting psychiatric episodes), reminder-to-take-meds, room searching for PTSD.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.warm } }, 'No federal certification or registration exists. '),
              'The "Amazon vest + ID card" market is a scam — those products mean nothing legally. ADI + IGDF accredit training programs, but a self-trained service dog is equally legal under the ADA.'),
            // The other half of the rule. Without it this card reads as "a
            // business can never say no", which is wrong, and which leaves
            // school staff with no lawful answer when an animal is genuinely
            // disruptive. It also protects legitimate handlers: this provision
            // is what separates a trained working dog from a pet in a vest.
            h('p', { style: { margin: 0 } },
              h('strong', { style: { color: T.accentHi } }, 'What a business or school CAN do: '),
              'the two-question limit is not a blanket yes. A service animal may lawfully be asked to leave if it is ',
              h('strong', { style: { color: T.text } }, 'out of control and the handler does not take effective action'),
              ', or if it is ',
              h('strong', { style: { color: T.text } }, 'not housebroken'),
              ' (28 CFR §36.302(c)(2)). The handler must still be served without the animal. The animal must also be harnessed, leashed, or tethered unless that would interfere with its work or the disability prevents it, in which case the handler must maintain control by voice or signal. Allergies and fear of dogs are NOT valid grounds for exclusion.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '💚 Emotional Support Animal (ESA — FHA only)'),
          h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Definition: '),
              'A pet (any species) whose ',
              h('strong', { style: { color: T.text } }, 'presence provides comfort'),
              ' to a person with a documented mental-health diagnosis. ESAs are NOT task-trained. The benefit is companionship, not task performance.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Access: '),
              h('strong', { style: { color: T.text } }, 'NOT a service animal under the ADA'),
              '. Limited protections under the federal Fair Housing Act (no-pet rentals must accommodate with valid ESA letter from a treating mental-health provider). DOT removed ESA accommodation from US airlines in 2021. No public-access right (restaurants, shops, schools can decline).'),
            h('p', { style: { margin: 0 } },
              h('strong', { style: { color: T.warm } }, 'Online "ESA letters" '),
              'sold in 5 minutes are widely considered fraudulent — a legitimate ESA letter requires a real therapeutic relationship with a licensed mental-health provider treating a documented condition.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🤝 Therapy animal (visit-based)'),
          h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Definition: '),
              'A pet trained + temperament-tested to provide ',
              h('strong', { style: { color: T.text } }, 'comfort visits to OTHERS'),
              ' — hospital patients, school readers, nursing-home residents, courtroom witnesses. The handler is a volunteer; the animal\'s "patient" is the person they\'re visiting, not the handler.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Access: '),
              'No automatic public access. Visits are by invitation of the facility. Pet Partners + Therapy Dogs International + Alliance of Therapy Dogs are the major credentialing bodies (temperament test + handler training + insurance).'),
            h('p', { style: { margin: 0 } },
              h('strong', { style: { color: T.text } }, 'Reading-to-dogs programs '),
              'in libraries and schools are popular, and children reliably report enjoying them and feeling less self-conscious reading aloud. Whether they measurably improve reading fluency is ',
              h('strong', { style: { color: T.text } }, 'not settled'),
              ' — systematic reviews find the studies small, often uncontrolled, and mixed in result (Hall, Gee & Mills 2016, PLOS ONE). Treat these as a motivation and anxiety support, not as a substitute for an evidence-based reading intervention. Available at many Maine libraries.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'Service-animal etiquette (handlers + bystanders)'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
            h('li', null, h('strong', { style: { color: T.text } }, 'Don\'t pet a working service dog'),
              ' even if cute — the handler depends on focus. Ask first, expect "no thanks, he\'s working."'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Don\'t distract'),
              ' (eye contact, kissy noises, calling the dog\'s name). A distracted alert dog can miss a medical signal.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Don\'t bring your pet'),
              ' just because you saw a service dog — pet-vs-service-dog confrontations injure handlers regularly.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Service dogs in training'),
              ' have less protection in many states; Maine recognizes SDIT under state law for handler training.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine resources'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, 'Hero Pups'),
            ' (NH/ME) places service dogs with veterans + first responders. ',
            h('strong', { style: { color: T.accentHi } }, 'NEADS'),
            ' (MA-based, serves Maine) trains hearing + service dogs. ',
            h('strong', { style: { color: T.accentHi } }, 'Pet Partners'),
            ' has Maine-active therapy teams. For ESA letters, work with your existing therapist — not an online vendor.')),
        footer());
    }

    // ─────────────────────────────────────────
    // PET PICKER (interactive matchmaker)
    // ─────────────────────────────────────────
    function renderPicker() {
      // Score candidate species against current inputs.
      var candidates = [
        { id: 'dog-large', name: 'Large dog (Lab, GSD, retriever-class)', icon: '🐕',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'house') s += 3; else if (o.housing === 'apartment') s -= 2;
            if (o.hours <= 4) s += 2; else if (o.hours <= 8) s += 1; else s -= 1;
            if (o.experience === 'lots') s += 2; else if (o.experience === 'some') s += 1;
            if (o.budget === 'low') s -= 2;
            if (o.allergies) s -= 2;
            return s;
          },
          note: 'Needs 1–2 hr/day exercise. Will shed and slobber. Good with kids when raised right.' },
        { id: 'dog-small', name: 'Small dog (terrier, dachshund, toy-class)', icon: '🐕‍🦺',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'apartment') s += 2; else s += 1;
            if (o.hours <= 6) s += 2;
            if (o.experience === 'first') s += 1; // small dogs more first-time-owner friendly
            if (o.budget === 'low') s -= 1;
            if (o.allergies) s -= 2;
            if (o.kids) s -= 1; // small dogs often less kid-tolerant
            return s;
          },
          note: 'Less exercise need but still daily walks + training. Often longer-lived (14–16 yr).' },
        { id: 'cat', name: 'Cat (indoor)', icon: '🐈',
          fit: function(o) {
            var s = 2; // generally easy
            if (o.housing === 'apartment') s += 1;
            if (o.hours >= 6) s += 1;
            if (o.experience === 'first') s += 1;
            if (o.budget === 'low') s += 1;
            if (o.allergies) s -= 3; // cats are biggest allergy risk
            return s;
          },
          note: 'Great match for many lifestyles. Provide vertical space, enrichment, two cats often happier than one.' },
        { id: 'rabbit-pair', name: 'Bonded rabbit pair', icon: '🐰',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'house') s += 2; else s += 1;
            if (o.experience === 'first') s -= 1;
            if (o.budget === 'low') s -= 2;
            if (o.kids && o.kidAge < 8) s -= 2; // small kids + rabbits rarely work
            return s;
          },
          note: 'Need a rabbit-savvy vet (limited in rural Maine). Free-roam or large pen. NOT a starter pet.' },
        { id: 'guinea-pair', name: 'Bonded guinea pig pair', icon: '🐹',
          fit: function(o) {
            var s = 1;
            if (o.experience !== 'lots') s += 1; // forgiving for new owners
            if (o.budget === 'low') s += 0;
            if (o.kids) s += 1; // generally kid-tolerant
            return s;
          },
          note: 'Need vitamin C daily, hay-heavy diet, weekly cage cleaning. Pair MUST be same sex or neutered.' },
        { id: 'reptile-beginner', name: 'Beginner reptile (leopard gecko, corn snake)', icon: '🦎',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'apartment') s += 1; // small footprint
            if (o.allergies) s += 2; // no fur
            if (o.kids && o.kidAge < 5) s -= 3; // CDC says no
            if (o.experience === 'first') s -= 1; // husbandry steep learning curve
            return s;
          },
          note: 'Salmonella shedding (handwashing required). UVB / heat gradient critical. Long-lived (15–25 yr).' },
        { id: 'fish-tank', name: 'Freshwater aquarium', icon: '🐠',
          fit: function(o) {
            var s = 1;
            if (o.allergies) s += 2;
            if (o.budget === 'low') s -= 1; // setup cost real
            if (o.experience === 'first') s += 0;
            return s;
          },
          note: 'See AlloFlow Aquarium tile for ecosystem science. Tank-cycling takes 4–6 weeks BEFORE adding fish.' },
        { id: 'cockatiel', name: 'Cockatiel or budgie (small parrot)', icon: '🦜',
          fit: function(o) {
            var s = 0;
            if (o.hours <= 6) s += 1; // birds want company
            if (o.budget === 'low') s -= 1;
            if (o.allergies) s -= 1;
            if (o.experience !== 'first') s += 1;
            return s;
          },
          note: 'Need flight-time outside cage daily. Lifespan 15–25 yr. Toxic to Teflon + scented candles.' }
      ];
      var kidBand = pickKidBand(pickKidAge);
      var inputs = {
        housing: pickHousing,
        kids: kidBand.id !== 'none',
        kidAge: kidBand.age,
        allergies: pickAllergies,
        hours: pickHoursHome,
        budget: pickBudget,
        experience: pickExperience
      };
      var scored = candidates.map(function(c) {
        var score = c.fit(inputs);
        return { id: c.id, name: c.name, icon: c.icon, score: score, note: c.note,
          reasons: pickerReasonCues(c.id, inputs, score) };
      }).sort(function(a, b) { return b.score - a.score; });

      function pickerReasonCues(candidateId, o, expectedScore) {
        var factors = [];
        function add(label, delta) {
          if (delta) factors.push({ label: label, delta: delta });
        }
        if (candidateId === 'dog-large') {
          if (o.housing === 'house') add('House selected', 3);
          else if (o.housing === 'apartment') add('Apartment selected', -2);
          if (o.hours <= 4) add(o.hours + ' hr alone', 2);
          else if (o.hours <= 8) add(o.hours + ' hr alone', 1);
          else add(o.hours + ' hr alone', -1);
          if (o.experience === 'lots') add('Experienced selection', 2);
          else if (o.experience === 'some') add('Some experience', 1);
          if (o.budget === 'low') add('Low budget', -2);
          if (o.allergies) add('Allergies selected', -2);
        } else if (candidateId === 'dog-small') {
          add(o.housing === 'apartment' ? 'Apartment selected' : 'Non-apartment setting', o.housing === 'apartment' ? 2 : 1);
          if (o.hours <= 6) add(o.hours + ' hr alone', 2);
          if (o.experience === 'first') add('First-time selection', 1);
          if (o.budget === 'low') add('Low budget', -1);
          if (o.allergies) add('Allergies selected', -2);
          if (o.kids) add('Children at home', -1);
        } else if (candidateId === 'cat') {
          add('Base score', 2);
          if (o.housing === 'apartment') add('Apartment selected', 1);
          if (o.hours >= 6) add(o.hours + ' hr alone', 1);
          if (o.experience === 'first') add('First-time selection', 1);
          if (o.budget === 'low') add('Low budget', 1);
          if (o.allergies) add('Allergies selected', -3);
        } else if (candidateId === 'rabbit-pair') {
          add(o.housing === 'house' ? 'House selected' : 'Non-house setting', o.housing === 'house' ? 2 : 1);
          if (o.experience === 'first') add('First-time selection', -1);
          if (o.budget === 'low') add('Low budget', -2);
          if (o.kids && o.kidAge < 8) add('Youngest child under 8', -2);
        } else if (candidateId === 'guinea-pair') {
          add('Base score', 1);
          if (o.experience !== 'lots') add('First/some experience', 1);
          if (o.kids) add('Children at home', 1);
        } else if (candidateId === 'reptile-beginner') {
          if (o.housing === 'apartment') add('Apartment selected', 1);
          if (o.allergies) add('Allergies selected', 2);
          if (o.kids && o.kidAge < 5) add('Youngest child under 5', -3);
          if (o.experience === 'first') add('First-time selection', -1);
        } else if (candidateId === 'fish-tank') {
          add('Base score', 1);
          if (o.allergies) add('Allergies selected', 2);
          if (o.budget === 'low') add('Low budget', -1);
        } else if (candidateId === 'cockatiel') {
          if (o.hours <= 6) add(o.hours + ' hr alone', 1);
          if (o.budget === 'low') add('Low budget', -1);
          if (o.allergies) add('Allergies selected', -1);
          if (o.experience !== 'first') add('Some/lots experience', 1);
        }
        var total = factors.reduce(function(sum, factor) { return sum + factor.delta; }, 0);
        if (total !== expectedScore) {
          return [{ label: 'Current computed score', delta: expectedScore }];
        }
        factors.sort(function(a, b) {
          return Math.abs(b.delta) - Math.abs(a.delta);
        });
        return factors.length ? factors : [{ label: 'No input bonus or penalty', delta: 0 }];
      }

      function renderPickerSilhouette(candidate) {
        var id = candidate.id;
        var titleId = 'pets-picker-silhouette-' + id + '-title';
        var descId = 'pets-picker-silhouette-' + id + '-desc';
        var drawing;
        if (id === 'dog-large' || id === 'dog-small') {
          var smallDog = id === 'dog-small';
          drawing = h('g', { transform: smallDog ? 'translate(18 16) scale(.82)' : null },
            h('ellipse', { cx: 94, cy: 55, rx: 48, ry: 25 }),
            h('circle', { cx: 47, cy: 43, r: 22 }),
            h('path', { d: 'M 34 29 L 29 7 L 48 25 Z M 53 27 L 67 10 L 68 36 Z' }),
            h('path', { d: 'M 130 49 Q 166 26 169 45', fill: 'none', stroke: 'currentColor', strokeWidth: 12, strokeLinecap: 'round' }),
            h('path', { d: 'M 66 70 L 62 97 M 92 73 L 91 99 M 115 71 L 120 98', fill: 'none', stroke: 'currentColor', strokeWidth: 10, strokeLinecap: 'round' }),
            h('circle', { cx: 41, cy: 40, r: 3, fill: '#172033' })
          );
        } else if (id === 'cat') {
          drawing = h('g', null,
            h('ellipse', { cx: 96, cy: 61, rx: 48, ry: 25 }),
            h('circle', { cx: 53, cy: 43, r: 22 }),
            h('path', { d: 'M 37 29 L 39 8 L 51 27 Z M 57 27 L 69 8 L 72 33 Z' }),
            h('path', { d: 'M 135 60 Q 170 45 158 15 Q 153 5 164 6', fill: 'none', stroke: 'currentColor', strokeWidth: 11, strokeLinecap: 'round' }),
            h('path', { d: 'M 70 76 L 68 97 M 100 77 L 104 98', fill: 'none', stroke: 'currentColor', strokeWidth: 9, strokeLinecap: 'round' }),
            h('circle', { cx: 47, cy: 41, r: 3, fill: '#172033' })
          );
        } else if (id === 'rabbit-pair') {
          drawing = h('g', null,
            h('ellipse', { cx: 104, cy: 65, rx: 48, ry: 27 }),
            h('circle', { cx: 58, cy: 51, r: 22 }),
            h('ellipse', { cx: 47, cy: 20, rx: 9, ry: 27, transform: 'rotate(-12 47 20)' }),
            h('ellipse', { cx: 67, cy: 19, rx: 9, ry: 28, transform: 'rotate(9 67 19)' }),
            h('circle', { cx: 150, cy: 57, r: 12 }),
            h('circle', { cx: 52, cy: 48, r: 3, fill: '#172033' }),
            h('path', { d: 'M 75 82 L 63 96 M 119 83 L 139 94', fill: 'none', stroke: 'currentColor', strokeWidth: 10, strokeLinecap: 'round' })
          );
        } else if (id === 'guinea-pair') {
          drawing = h('g', null,
            h('ellipse', { cx: 92, cy: 62, rx: 61, ry: 32 }),
            h('circle', { cx: 45, cy: 49, r: 22 }),
            h('circle', { cx: 36, cy: 28, r: 10 }),
            h('circle', { cx: 50, cy: 45, r: 3, fill: '#172033' }),
            h('path', { d: 'M 43 80 L 40 96 M 104 85 L 111 98', fill: 'none', stroke: 'currentColor', strokeWidth: 9, strokeLinecap: 'round' })
          );
        } else if (id === 'reptile-beginner') {
          drawing = h('g', null,
            h('ellipse', { cx: 85, cy: 58, rx: 45, ry: 17 }),
            h('circle', { cx: 38, cy: 54, r: 15 }),
            h('path', { d: 'M 127 58 Q 156 58 171 35', fill: 'none', stroke: 'currentColor', strokeWidth: 11, strokeLinecap: 'round' }),
            h('path', { d: 'M 65 67 L 47 88 M 77 68 L 92 90 M 103 66 L 118 86', fill: 'none', stroke: 'currentColor', strokeWidth: 7, strokeLinecap: 'round' }),
            h('circle', { cx: 34, cy: 51, r: 2.5, fill: '#172033' })
          );
        } else if (id === 'fish-tank') {
          drawing = h('g', null,
            h('ellipse', { cx: 87, cy: 57, rx: 49, ry: 29 }),
            h('path', { d: 'M 130 57 L 171 29 L 168 85 Z' }),
            h('path', { d: 'M 82 30 L 105 12 L 111 38 Z M 81 83 L 107 99 L 111 75 Z' }),
            h('circle', { cx: 61, cy: 51, r: 4, fill: '#172033' }),
            h('circle', { cx: 36, cy: 26, r: 6, fill: 'none', stroke: 'currentColor', strokeWidth: 3 }),
            h('circle', { cx: 24, cy: 10, r: 4, fill: 'none', stroke: 'currentColor', strokeWidth: 3 })
          );
        } else {
          drawing = h('g', null,
            h('path', { d: 'M 38 88 H 164', fill: 'none', stroke: 'currentColor', strokeWidth: 8, strokeLinecap: 'round' }),
            h('ellipse', { cx: 98, cy: 54, rx: 36, ry: 39 }),
            h('circle', { cx: 64, cy: 34, r: 21 }),
            h('path', { d: 'M 47 31 L 20 43 L 48 49 Z' }),
            h('path', { d: 'M 122 62 L 157 96 L 118 84 Z' }),
            h('path', { d: 'M 59 17 L 50 2 M 67 15 L 68 0 M 74 18 L 84 4', fill: 'none', stroke: 'currentColor', strokeWidth: 5, strokeLinecap: 'round' }),
            h('path', { d: 'M 83 84 L 81 91 M 104 84 L 107 91', fill: 'none', stroke: 'currentColor', strokeWidth: 4 }),
            h('circle', { cx: 59, cy: 31, r: 3, fill: '#172033' })
          );
        }
        return h('svg', {
          viewBox: '0 0 180 110',
          role: 'img',
          focusable: 'false',
          'aria-labelledby': titleId + ' ' + descId
        },
          h('title', { id: titleId }, 'Top match: ' + candidate.name),
          h('desc', { id: descId }, 'Simplified ' + candidate.name + ' silhouette highlighting the current top-ranked match.'),
          h('g', { fill: 'currentColor', stroke: '#3b2419', strokeWidth: 2, strokeLinejoin: 'round' }, drawing)
        );
      }

      function renderPickerFitBar(candidate) {
        var minScore = -7, maxScore = 7, threshold = 2;
        var clamped = Math.max(minScore, Math.min(maxScore, candidate.score));
        var markerPct = 5 + ((clamped - minScore) / (maxScore - minScore)) * 90;
        var zeroPct = 50;
        var thresholdPct = 5 + ((threshold - minScore) / (maxScore - minScore)) * 90;
        var segmentLeft = Math.min(markerPct, zeroPct);
        var segmentWidth = Math.abs(markerPct - zeroPct);
        var signedScore = candidate.score > 0 ? '+' + candidate.score : String(candidate.score);
        return h('div', {
          className: 'petslab-picker-fit',
          role: 'img',
          'aria-label': candidate.name + ' fit score ' + signedScore +
            ' on a scale from minus 7 to plus 7. Zero is neutral. Plus 2 is the good-fit threshold.'
        },
          h('div', { className: 'petslab-picker-fit-key', 'aria-hidden': 'true' },
            '0 = neutral  |  +2 = good-fit threshold'),
          h('div', { className: 'petslab-picker-fit-track', 'aria-hidden': 'true' },
            h('span', { className: 'petslab-picker-fit-zero', style: { left: zeroPct + '%' } }),
            h('span', { className: 'petslab-picker-fit-threshold', style: { left: thresholdPct + '%' } }),
            h('span', {
              className: 'petslab-picker-fit-segment' + (candidate.score < 0 ? ' is-negative' : ''),
              style: { left: segmentLeft + '%', width: segmentWidth + '%' }
            }),
            h('span', { className: 'petslab-picker-fit-marker', style: { left: markerPct + '%' } },
              h('span', { className: 'petslab-picker-fit-value' }, signedScore)
            )
          ),
          h('div', { className: 'petslab-picker-fit-ends', 'aria-hidden': 'true' },
            h('span', null, '-7 less fit'),
            h('span', null, '+7 stronger fit')
          )
        );
      }
      function radio(name, val, current, label, onChange) {
        var picked = current === val;
        return h('label', { htmlFor: 'pp-' + name + '-' + val,
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginRight: 6, marginBottom: 4, borderRadius: '999rem',
            background: picked ? T.accent : T.cardAlt, color: picked ? '#1f1612' : T.text,
            border: '1px solid ' + (picked ? T.accent : T.border), fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
          h('input', { id: 'pp-' + name + '-' + val, 'data-pets-focusable': true, type: 'radio',
            name: 'pp-' + name, checked: picked,
            onChange: function() { onChange(val); },
            style: { position: 'absolute', opacity: 0, pointerEvents: 'none' } }),
          label);
      }
      function checkbox(name, current, label, onChange) {
        return h('label', { htmlFor: 'pp-' + name,
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginRight: 6, marginBottom: 4, borderRadius: '999rem',
            background: current ? T.accent : T.cardAlt, color: current ? '#1f1612' : T.text,
            border: '1px solid ' + (current ? T.accent : T.border), fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
          h('input', { id: 'pp-' + name, 'data-pets-focusable': true, type: 'checkbox',
            checked: current, onChange: function(e) { onChange(e.target.checked); },
            style: { marginRight: 4, accentColor: T.accent } }),
          label);
      }
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🏠 Pet Picker'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Tell us about your situation; we\'ll suggest species/breed-class matches with honest tradeoffs. This is a science-based matchmaker, not a quiz that always finds you a "winner" — sometimes the right answer is "wait until your situation changes."')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🏘️ Housing'),
          h('div', { role: 'radiogroup', 'aria-label': 'Housing type' },
            radio('housing', 'apartment', pickHousing, 'Apartment / small', function(v) { upd('pickHousing', v); }),
            radio('housing', 'house', pickHousing, 'House with yard', function(v) { upd('pickHousing', v); }),
            radio('housing', 'rural', pickHousing, 'Rural / acreage', function(v) { upd('pickHousing', v); })),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } }, '👨‍👩‍👧 Family'),
          h('div', { role: 'radiogroup', 'aria-label': 'Youngest child at home' },
            PICK_KID_BANDS.map(function (b) {
              return radio('kidage', b.id, pickKidAge, b.label, function (v) {
                upd('pickKidAge', v);
                upd('pickKids', v !== 'none');   // keep the legacy flag in step
              });
            })),
          h('div', { style: { fontSize: 11, color: T.dim, marginTop: 4, marginBottom: 4, lineHeight: 1.5 } },
            'Age matters, not just presence: the CDC advises against reptiles in homes with children under 5, and the House Rabbit Society advises against rabbits with young children.'),
          h('div', null,
            checkbox('allergies', pickAllergies, 'Allergies in household', function(v) { upd('pickAllergies', v); })),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } },
            '⏰ Hours pet would be alone per day: ',
            h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, pickHoursHome + ' hr')),
          h('input', { id: 'pp-hours', 'data-pets-focusable': true, type: 'range',
            min: 0, max: 14, step: 1, value: pickHoursHome,
            'aria-label': 'Hours alone per day',
            onChange: function(e) { upd('pickHoursHome', parseInt(e.target.value, 10)); },
            style: { width: '100%', accentColor: T.accent } }),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } }, '💵 Budget'),
          h('div', { role: 'radiogroup', 'aria-label': 'Budget' },
            radio('budget', 'low', pickBudget, 'Low (< $1K/yr)', function(v) { upd('pickBudget', v); }),
            radio('budget', 'medium', pickBudget, 'Medium ($1–3K/yr)', function(v) { upd('pickBudget', v); }),
            radio('budget', 'high', pickBudget, 'High ($3K+ /yr)', function(v) { upd('pickBudget', v); })),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } }, '🎓 Pet experience'),
          h('div', { role: 'radiogroup', 'aria-label': 'Experience level' },
            radio('exp', 'first', pickExperience, 'First-time owner', function(v) { upd('pickExperience', v); }),
            radio('exp', 'some', pickExperience, 'Some experience', function(v) { upd('pickExperience', v); }),
            radio('exp', 'lots', pickExperience, 'Experienced (multiple species)', function(v) { upd('pickExperience', v); }))),
        h('section', {
          className: 'petslab-picker-results',
          role: 'region',
          'aria-labelledby': 'pets-picker-results-title'
        },
          h('div', { className: 'petslab-picker-results-head' },
            h('h3', { id: 'pets-picker-results-title' }, '\uD83C\uDFAF Your matches'),
            h('div', { className: 'petslab-picker-scale-copy' }, 'Fixed fit scale: -7 to +7')),
          h('ol', { className: 'petslab-picker-list' },
            scored.slice(0, 5).map(function(s, i) {
              var isTopScore = s.score === scored[0].score;
              var topScoreIsTied = scored.length > 1 && scored[1].score === scored[0].score;
              var label = isTopScore
                ? (topScoreIsTied ? 'TIED TOP' : 'TOP MATCH')
                : (s.score >= 2 ? 'good' : (s.score >= 0 ? 'consider' : 'probably not'));
              return h('li', {
                key: s.id,
                className: 'petslab-picker-card' + (i === 0 ? ' petslab-picker-card--top' : ''),
                'aria-label': 'Rank ' + (i + 1) + ': ' + s.name + '. ' + label + '. Fit score ' + s.score + '.'
              },
                i === 0 && h('div', { className: 'petslab-picker-top-art' }, renderPickerSilhouette(s)),
                h('div', { className: 'petslab-picker-card-main' },
                  h('div', { className: 'petslab-picker-card-head' },
                    h('span', { className: 'petslab-picker-rank', 'aria-hidden': 'true' }, String(i + 1)),
                    h('span', { style: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 } },
                      h('span', { className: 'petslab-picker-icon', 'aria-hidden': 'true' }, s.icon),
                      h('strong', { className: 'petslab-picker-name' }, s.name)),
                    h('span', { className: 'petslab-picker-status' }, label + ' \u00b7 ' + s.score)),
                  renderPickerFitBar(s),
                  h('ul', { className: 'petslab-picker-reasons', 'aria-label': 'All score factors for ' + s.name },
                    (s.reasons || []).map(function(reason, reasonIndex) {
                      var signed = reason.delta > 0 ? '+' + reason.delta : String(reason.delta);
                      return h('li', {
                        key: s.id + '-reason-' + reasonIndex,
                        className: 'petslab-picker-reason' + (reason.delta < 0 ? ' is-negative' : '')
                      },
                        h('strong', null, signed),
                        h('span', null, reason.label));
                    })),
                  h('div', { className: 'petslab-picker-note' }, s.note))
              );
            }))
        ),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🤔 Honest checks before any pet'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
            h('li', null, 'Will you (and your circumstances) still want this animal in 5, 10, 15+ years? Pets aren\'t for "right now" only.'),
            h('li', null, 'Have you priced an emergency vet visit ($1K–5K typical)? Do you have a fund or pet insurance for that?'),
            h('li', null, 'Who cares for them when you travel? Boarding + petsitter costs add up.'),
            h('li', null, 'Are you allowed pets where you live (and where you might live next)?'),
            h('li', null, 'Have you actually met the species? Many people get a breed they\'ve only seen on Instagram.'))),
        footer());
    }

    // ─────────────────────────────────────────
    // BODY LANGUAGE DECODER
    // ─────────────────────────────────────────
    function renderBodyLang() {
      var sets = [
        { species: '🐕 Dogs', items: [
          { signal: 'Loose body + soft eyes + open mouth + wagging mid-height tail', meaning: 'Relaxed + happy', color: T.ok },
          { signal: 'Stiff body + closed mouth + hard stare + slow high tail wag', meaning: 'WARNING — back off', color: T.warm },
          { signal: '"Whale eye" (whites of eyes showing as head turns away)', meaning: 'Stress / fear / discomfort — give space', color: T.warm },
          { signal: 'Lip licking / yawning / sniffing the ground in a tense moment', meaning: 'Calming signal — dog is trying to defuse', color: T.accentHi },
          { signal: 'Play bow (front low, butt up)', meaning: 'Invitation to play / "what comes next is fun"', color: T.ok },
          { signal: 'Tucked tail + low body + ears back', meaning: 'Fear / appeasement — do NOT push interaction', color: T.warm },
          { signal: 'Showing belly with relaxed body', meaning: 'Trust / play (not always "rub me!")', color: T.accentHi },
          { signal: 'Showing teeth + low growl + freeze', meaning: 'CLEAR warning — bite is the next step if pressure continues', color: T.danger }
        ]},
        { species: '🐈 Cats', items: [
          { signal: 'Slow blink toward you', meaning: '"Cat kiss" — affection / trust', color: T.ok },
          { signal: 'Tail held straight up (sometimes with curve at tip)', meaning: 'Friendly greeting', color: T.ok },
          { signal: 'Tail flicking back and forth', meaning: 'Annoyed / about to react — back off', color: T.warm },
          { signal: 'Pupils dilated wide in normal light', meaning: 'Aroused (could be play, fear, or aggression — read context)', color: T.warm },
          { signal: 'Ears flattened back / sideways', meaning: 'Fear or aggression', color: T.warm },
          { signal: 'Crouched + tail wrapped tight', meaning: 'Stressed / unwell', color: T.warm },
          { signal: 'Kneading paws + purring', meaning: 'Content (kitten-nursing leftover behavior)', color: T.ok },
          { signal: 'Loud meowing AT you specifically', meaning: 'Demand — for food, attention, or door opening', color: T.accentHi }
        ]},
        { species: '🐰 Rabbits', items: [
          { signal: '"Binky" (sudden midair leap + twist)', meaning: 'Pure joy', color: T.ok },
          { signal: 'Loud thump with hind feet', meaning: 'Alarm — perceived threat (rabbits HEAR something)', color: T.warm },
          { signal: 'Tooth purring (soft chattering)', meaning: 'Content', color: T.ok },
          { signal: 'Tooth grinding (loud grating)', meaning: 'PAIN — vet visit', color: T.danger },
          { signal: 'Flopping over on side', meaning: 'Trust / relaxation (NOT injured)', color: T.ok },
          { signal: 'Hunched + not eating + closed eyes', meaning: 'GI stasis or other illness — EMERGENCY', color: T.danger }
        ]},
        { species: '🦜 Birds', items: [
          { signal: 'Crest feathers raised + relaxed posture', meaning: 'Curious / engaged (in cockatiels)', color: T.ok },
          { signal: 'Eye-pinning (rapid pupil contraction)', meaning: 'Excitement OR aggression — read context', color: T.warm },
          { signal: 'Beak grinding', meaning: 'Content (often before sleep)', color: T.ok },
          { signal: 'Tail bobbing while breathing', meaning: 'Respiratory distress — vet now', color: T.danger },
          { signal: 'Feather plucking / overgrooming', meaning: 'Boredom / stress / medical — needs investigation', color: T.warm }
        ]}
      ];
      // Flatten all signals for quiz mode
      // Observable pose metadata drives the quiz illustration without changing
      // the canonical signal or meaning text used by scoring and mastery.
      var BODY_POSE_META = [
        { pose: 'dog-relaxed', cues: [['Soft eyes', 176, 86], ['Loose stance', 300, 130], ['Mid-height tail', 430, 104]] },
        { pose: 'dog-warning', cues: [['Hard stare', 176, 82], ['Stiff body', 306, 112], ['High slow tail', 430, 68]] },
        { pose: 'dog-whale-eye', cues: [['Eye white visible', 174, 82], ['Head turns away', 200, 98], ['Body holds still', 320, 124]] },
        { pose: 'dog-calming', cues: [['Head lowered', 188, 130], ['Quick tongue flick', 168, 151], ['Nose near ground', 145, 159]] },
        { pose: 'dog-play-bow', cues: [['Front end low', 214, 146], ['Hindquarters high', 350, 94], ['Tail stays loose', 438, 83]] },
        { pose: 'dog-fear', cues: [['Ears pinned back', 186, 105], ['Body carried low', 304, 143], ['Tail tucked under', 407, 145]] },
        { pose: 'dog-belly', cues: [['Belly exposed', 306, 127], ['Limbs stay loose', 326, 87], ['Face stays soft', 187, 132]] },
        { pose: 'dog-teeth', cues: [['Lips lifted', 159, 105], ['Hard direct gaze', 179, 84], ['Frozen stance', 312, 121]] },
        { pose: 'cat-slow-blink', cues: [['Eyes half closed', 178, 82], ['Body stays loose', 302, 124], ['Tail rests softly', 428, 133]] },
        { pose: 'cat-tail-up', cues: [['Tail held upright', 429, 54], ['Ears face forward', 179, 69], ['Easy walking stance', 304, 133]] },
        { pose: 'cat-tail-flick', cues: [['Tail tip sweeps', 438, 106], ['Body grows tense', 306, 116], ['Ears track back', 181, 72]] },
        { pose: 'cat-wide-pupils', cues: [['Pupils fill the eyes', 178, 84], ['Ears aim forward', 181, 67], ['Weight shifts ready', 304, 132]] },
        { pose: 'cat-flat-ears', cues: [['Ears flatten sideways', 179, 73], ['Head draws low', 188, 93], ['Tail stays low', 430, 139]] },
        { pose: 'cat-crouch', cues: [['Belly near floor', 307, 146], ['Tail wraps tightly', 373, 151], ['Head tucked down', 191, 126]] },
        { pose: 'cat-knead', cues: [['Paws press in turn', 257, 151], ['Eyes remain soft', 181, 83], ['Body remains loose', 307, 119]] },
        { pose: 'cat-meow', cues: [['Mouth opens toward you', 157, 103], ['Head faces the person', 181, 88], ['Tail stays neutral', 429, 127]] },
        { pose: 'rabbit-binky', cues: [['All feet leave ground', 312, 145], ['Body twists midair', 306, 91], ['Ears stay loose', 190, 62]] },
        { pose: 'rabbit-thump', cues: [['Rear foot strikes', 407, 151], ['Ears stand alert', 190, 55], ['Body braces', 306, 119]] },
        { pose: 'rabbit-tooth-purr', cues: [['Tiny jaw motion', 166, 105], ['Eyes look soft', 181, 85], ['Body forms a loose loaf', 309, 126]] },
        { pose: 'rabbit-tooth-grind', cues: [['Large jaw motion', 163, 111], ['Eyes pinch closed', 181, 86], ['Back stays hunched', 302, 103]] },
        { pose: 'rabbit-flop', cues: [['Body lies on its side', 306, 137], ['Feet extend loosely', 390, 118], ['Ears rest on floor', 189, 137]] },
        { pose: 'rabbit-hunched', cues: [['Back rounds tightly', 306, 94], ['Eyes stay closed', 181, 105], ['Food remains untouched', 448, 148]] },
        { pose: 'bird-crest', cues: [['Crest feathers raised', 210, 52], ['Body feathers relaxed', 298, 112], ['Feet stay steady', 293, 151]] },
        { pose: 'bird-eye-pin', cues: [['Pupil rapidly narrows', 194, 82], ['Head points forward', 202, 94], ['Body context stays visible', 304, 117]] },
        { pose: 'bird-beak-grind', cues: [['Beak moves softly', 166, 103], ['Eye looks relaxed', 196, 83], ['Feet settle on perch', 292, 151]] },
        { pose: 'bird-tail-bob', cues: [['Tail moves with each breath', 376, 145], ['Chest effort is visible', 291, 115], ['Feet grip the perch', 292, 151]] },
        { pose: 'bird-feather-pluck', cues: [['Bare feather patch', 304, 111], ['Beak works at the wing', 257, 108], ['Loose feathers collect', 423, 157]] }
      ];
      var allSignals = [];
      sets.forEach(function(g) {
        g.items.forEach(function(it) {
          var poseMeta = BODY_POSE_META[allSignals.length] || {
            pose: 'body-neutral', cues: [['Head', 185, 82], ['Body', 305, 120], ['Tail or wings', 420, 125]]
          };
          allSignals.push({ species: g.species, signal: it.signal, meaning: it.meaning,
            color: it.color, pose: poseMeta.pose, cues: poseMeta.cues });
        });
      });
      var blMode = d.blMode || 'read';
      // Quiz state
      var blQuiz = d.blQuiz || null;  // { idx, qs, answers, score }
      function setMode(m) { upd('blMode', m); petsAnnounce(m === 'quiz' ? 'Body language quiz mode' : 'Reference reading mode'); }
      function bodySpeciesKey(species) {
        var name = String(species || '');
        if (name.indexOf('Cats') !== -1) return 'cat';
        if (name.indexOf('Rabbits') !== -1) return 'rabbit';
        if (name.indexOf('Birds') !== -1) return 'bird';
        return 'dog';
      }
      function renderBodyLanguagePose(item, compact) {
        var speciesKey = bodySpeciesKey(item && item.species);
        var speciesLabel = speciesKey === 'cat' ? 'Cat'
          : speciesKey === 'rabbit' ? 'Rabbit'
          : speciesKey === 'bird' ? 'Bird'
          : 'Dog';
        var pose = item && item.pose;
        var cues = item && item.cues;
        if (!pose || !cues || !cues.length) {
          for (var pi = 0; pi < allSignals.length; pi++) {
            if (allSignals[pi].species === item.species && allSignals[pi].signal === item.signal) {
              pose = allSignals[pi].pose;
              cues = allSignals[pi].cues;
              break;
            }
          }
        }
        pose = pose || (speciesKey + '-neutral');
        cues = cues || [];
        var safeId = ('pets-body-' + pose).replace(/[^a-z0-9_-]/gi, '-');
        var titleId = safeId + '-title';
        var descId = safeId + '-desc';
        var cueSummary = cues.map(function(c, ci) {
          return 'Cue ' + (ci + 1) + ': ' + c[0];
        }).join('. ');
        var commonStroke = '#2b1b14';
        var ground = '#34445a';

        function drawDog() {
          var belly = pose === 'dog-belly';
          var playBow = pose === 'dog-play-bow';
          var fearful = pose === 'dog-fear';
          var warning = pose === 'dog-warning' || pose === 'dog-teeth';
          var whale = pose === 'dog-whale-eye';
          var calming = pose === 'dog-calming';
          if (belly) {
            return h('g', null,
              h('ellipse', { cx: 305, cy: 157, rx: 116, ry: 13, fill: '#0b1020', opacity: 0.34 }),
              h('ellipse', { cx: 302, cy: 126, rx: 94, ry: 37, fill: '#c98a47', stroke: commonStroke, strokeWidth: 3, transform: 'rotate(7 302 126)' }),
              h('ellipse', { cx: 302, cy: 119, rx: 60, ry: 25, fill: '#f0c98e', opacity: 0.9, transform: 'rotate(7 302 126)' }),
              h('path', { className: 'petslab-body-motion--lift', d: 'M 270 108 Q 250 76 269 63 M 330 105 Q 350 73 370 66 M 277 140 Q 257 161 239 151 M 337 142 Q 360 160 378 147', fill: 'none', stroke: '#b87538', strokeWidth: 18, strokeLinecap: 'round' }),
              h('path', { className: 'petslab-body-motion--sway', d: 'M 391 129 Q 447 112 455 139', fill: 'none', stroke: '#a96731', strokeWidth: 17, strokeLinecap: 'round' }),
              h('circle', { cx: 190, cy: 132, r: 36, fill: '#d99a55', stroke: commonStroke, strokeWidth: 3 }),
              h('path', { d: 'M 166 111 Q 137 109 148 141 Q 161 148 174 132 Z M 209 107 Q 235 103 229 134 Q 218 142 207 127 Z', fill: '#8d542d' }),
              h('ellipse', { cx: 174, cy: 130, rx: 4, ry: 3, fill: commonStroke }),
              h('path', { d: 'M 164 147 Q 185 158 203 144', fill: 'none', stroke: '#6f2d25', strokeWidth: 3, strokeLinecap: 'round' })
            );
          }
          var bodyY = fearful ? 136 : playBow ? 105 : warning ? 110 : 119;
          var headX = calming ? 174 : 183;
          var headY = calming ? 137 : playBow ? 132 : fearful ? 116 : 91;
          var tailD = fearful ? 'M 403 130 Q 431 150 409 158'
            : warning ? 'M 404 103 Q 448 73 458 45'
            : playBow ? 'M 405 101 Q 450 76 459 93'
            : 'M 404 115 Q 451 96 458 116';
          var tailClass = (pose === 'dog-relaxed' || playBow || warning) ? 'petslab-body-motion--sway' : '';
          var earD = fearful
            ? 'M 163 91 Q 136 100 150 124 Q 164 121 176 106 Z M 197 90 Q 225 99 213 122 Q 198 119 190 105 Z'
            : warning
              ? 'M 161 74 L 166 43 L 181 73 Z M 194 72 L 208 43 L 214 79 Z'
              : 'M 160 73 Q 137 64 141 99 Q 154 112 170 94 Z M 199 70 Q 225 64 220 100 Q 207 111 194 93 Z';
          var earTransform = (playBow || calming) ? 'translate(' + (headX - 183) + ' ' + (headY - 91) + ')' : null;
          return h('g', null,
            h('ellipse', { cx: 306, cy: 158, rx: 125, ry: 12, fill: '#0b1020', opacity: 0.32 }),
            playBow
              ? h('path', { d: 'M 218 126 Q 287 82 393 94 Q 411 98 410 116 Q 333 122 263 144 Z', fill: '#c98a47', stroke: commonStroke, strokeWidth: 3 })
              : h('ellipse', { cx: 306, cy: bodyY, rx: 100, ry: fearful ? 30 : 39, fill: '#c98a47', stroke: commonStroke, strokeWidth: 3 }),
            h('ellipse', { cx: 300, cy: bodyY + 9, rx: 58, ry: fearful ? 16 : 23, fill: '#efc58a', opacity: 0.72 }),
            h('path', { d: playBow
              ? 'M 237 132 L 218 158 M 267 137 L 257 160 M 358 119 L 370 157 M 390 113 L 406 156'
              : fearful
                ? 'M 248 146 L 240 160 M 286 148 L 282 160 M 347 146 L 351 160 M 383 141 L 391 158'
                : 'M 242 ' + (bodyY + 22) + ' L 236 158 M 281 ' + (bodyY + 28) + ' L 279 158 M 350 ' + (bodyY + 27) + ' L 354 158 M 388 ' + (bodyY + 20) + ' L 395 158',
              fill: 'none', stroke: '#b87538', strokeWidth: 17, strokeLinecap: 'round' }),
            h('path', { className: tailClass, d: tailD, fill: 'none', stroke: '#a96731', strokeWidth: 17, strokeLinecap: 'round' }),
            h('circle', { cx: headX, cy: headY, r: 38, fill: '#d99a55', stroke: commonStroke, strokeWidth: 3 }),
            h('path', { d: earD, transform: earTransform, fill: '#8d542d', stroke: commonStroke, strokeWidth: 2, strokeLinejoin: 'round' }),
            h('ellipse', { cx: headX - 21, cy: headY + 13, rx: 25, ry: 18, fill: '#efc89a' }),
            whale
              ? h('g', { className: 'petslab-body-motion--pulse' },
                  h('ellipse', { cx: headX - 5, cy: headY - 8, rx: 13, ry: 8, fill: '#fff7ed', stroke: commonStroke, strokeWidth: 2 }),
                  h('circle', { cx: headX - 12, cy: headY - 8, r: 4, fill: commonStroke })
                )
              : h('ellipse', { cx: headX - 7, cy: headY - 8, rx: warning ? 6 : 4, ry: warning ? 4 : 5, fill: commonStroke }),
            h('ellipse', { cx: headX - 39, cy: headY + 13, rx: 7, ry: 5, fill: commonStroke }),
            pose === 'dog-teeth'
              ? h('g', null,
                  h('path', { d: 'M 144 108 Q 163 118 180 106', fill: '#5f1f1f', stroke: commonStroke, strokeWidth: 2 }),
                  h('path', { d: 'M 150 110 L 155 119 L 160 111 L 166 120 L 171 109', fill: '#fff7ed', stroke: commonStroke, strokeWidth: 1 })
                )
              : calming
                ? h('g', { className: 'petslab-body-motion--pulse' },
                    h('path', { d: 'M 145 151 Q 159 158 174 151', fill: 'none', stroke: '#6f2d25', strokeWidth: 3 }),
                    h('path', { d: 'M 156 153 Q 153 169 165 164', fill: '#e88486', stroke: '#6f2d25', strokeWidth: 2 })
                  )
                : h('path', { d: warning ? 'M 154 108 L 177 108' : 'M 151 ' + (headY + 25) + ' Q 169 ' + (headY + 35) + ' 185 ' + (headY + 23), fill: 'none', stroke: '#6f2d25', strokeWidth: 3, strokeLinecap: 'round' }),
            playBow && h('path', { d: 'M 205 144 Q 185 155 166 151', fill: 'none', stroke: '#fbbf24', strokeWidth: 3, strokeDasharray: '5 5' })
          );
        }

        function drawCat() {
          var crouch = pose === 'cat-crouch';
          var flatEars = pose === 'cat-flat-ears';
          var blink = pose === 'cat-slow-blink';
          var wide = pose === 'cat-wide-pupils';
          var knead = pose === 'cat-knead';
          var meow = pose === 'cat-meow';
          var bodyY = crouch ? 142 : 119;
          var tailD = pose === 'cat-tail-up' ? 'M 397 120 Q 451 100 432 39 Q 427 25 442 28'
            : pose === 'cat-tail-flick' ? 'M 397 122 Q 451 105 468 128 Q 478 143 493 130'
            : crouch ? 'M 388 142 Q 431 165 357 164 Q 321 165 302 151'
            : 'M 395 124 Q 446 120 454 141 Q 458 151 469 145';
          var tailClass = (pose === 'cat-tail-up' || pose === 'cat-tail-flick') ? 'petslab-body-motion--sway' : '';
          return h('g', null,
            h('ellipse', { cx: 306, cy: 158, rx: 124, ry: 11, fill: '#0b1020', opacity: 0.32 }),
            h('ellipse', { cx: 310, cy: bodyY, rx: crouch ? 92 : 96, ry: crouch ? 25 : 41, fill: '#718096', stroke: commonStroke, strokeWidth: 3 }),
            h('path', { d: 'M 267 ' + (bodyY - 31) + ' Q 301 ' + bodyY + ' 341 ' + (bodyY - 31), fill: 'none', stroke: '#9eabba', strokeWidth: 8, opacity: 0.48 }),
            !crouch && h('path', { d: 'M 257 142 L 253 158 M 292 145 L 290 158 M 355 145 L 359 158 M 388 139 L 397 157', fill: 'none', stroke: '#667587', strokeWidth: 14, strokeLinecap: 'round' }),
            h('path', { className: tailClass, d: tailD, fill: 'none', stroke: '#667587', strokeWidth: 18, strokeLinecap: 'round' }),
            h('circle', { cx: 184, cy: crouch ? 125 : 89, r: 36, fill: '#7f8fa3', stroke: commonStroke, strokeWidth: 3 }),
            flatEars
              ? h('path', { d: 'M 163 71 Q 133 70 139 87 Q 153 94 173 87 Z M 202 70 Q 233 68 229 86 Q 215 95 196 87 Z', transform: crouch ? 'translate(0 36)' : null, fill: '#667587', stroke: commonStroke, strokeWidth: 2 })
              : h('path', { d: 'M 159 68 L 162 35 L 179 66 Z M 196 66 L 211 35 L 216 72 Z', transform: crouch ? 'translate(0 36)' : null, fill: '#667587', stroke: commonStroke, strokeWidth: 2 }),
            blink
              ? h('g', { className: 'petslab-body-motion--pulse', fill: 'none', stroke: commonStroke, strokeWidth: 3, strokeLinecap: 'round' },
                  h('path', { d: 'M 166 87 Q 174 92 182 87' }),
                  h('path', { d: 'M 190 87 Q 198 92 206 87' })
                )
              : h('g', null,
                  h('ellipse', { cx: 174, cy: crouch ? 124 : 86, rx: wide ? 8 : 5, ry: wide ? 10 : 7, fill: '#d9f99d', stroke: commonStroke, strokeWidth: 1.5 }),
                  h('ellipse', { cx: 198, cy: crouch ? 124 : 86, rx: wide ? 8 : 5, ry: wide ? 10 : 7, fill: '#d9f99d', stroke: commonStroke, strokeWidth: 1.5 }),
                  h('ellipse', { className: wide ? 'petslab-body-motion--pulse' : '', cx: 174, cy: crouch ? 124 : 86, rx: wide ? 6 : 1.7, ry: wide ? 8 : 5, fill: commonStroke }),
                  h('ellipse', { className: wide ? 'petslab-body-motion--pulse' : '', cx: 198, cy: crouch ? 124 : 86, rx: wide ? 6 : 1.7, ry: wide ? 8 : 5, fill: commonStroke })
                ),
            h('path', { d: 'M 177 ' + (crouch ? 139 : 102) + ' L 185 ' + (crouch ? 143 : 106) + ' L 193 ' + (crouch ? 139 : 102), fill: '#d99a9a', stroke: commonStroke, strokeWidth: 1.5 }),
            meow
              ? h('g', null,
                  h('ellipse', { cx: 185, cy: 113, rx: 9, ry: 12, fill: '#6f1d2a', stroke: commonStroke, strokeWidth: 2 }),
                  h('g', { className: 'petslab-body-motion--pulse', fill: 'none', stroke: '#fde68a', strokeWidth: 3, strokeLinecap: 'round' },
                    h('path', { d: 'M 139 91 Q 123 86 115 76' }),
                    h('path', { d: 'M 137 104 Q 118 106 106 112' })
                  )
                )
              : h('path', { d: 'M 177 ' + (crouch ? 148 : 110) + ' Q 185 ' + (crouch ? 153 : 115) + ' 193 ' + (crouch ? 148 : 110), fill: 'none', stroke: '#5f2630', strokeWidth: 2.5 }),
            knead && h('g', { className: 'petslab-body-motion--lift' },
              h('ellipse', { cx: 255, cy: 157, rx: 14, ry: 7, fill: '#aab6c4' }),
              h('ellipse', { cx: 290, cy: 157, rx: 14, ry: 7, fill: '#aab6c4' }),
              h('path', { d: 'M 247 165 L 247 172 M 290 165 L 290 172', stroke: '#fbbf24', strokeWidth: 3, strokeLinecap: 'round' })
            )
          );
        }

        function drawRabbit() {
          var binky = pose === 'rabbit-binky';
          var thump = pose === 'rabbit-thump';
          var purr = pose === 'rabbit-tooth-purr';
          var grind = pose === 'rabbit-tooth-grind';
          var flop = pose === 'rabbit-flop';
          var hunched = pose === 'rabbit-hunched';
          if (flop) {
            return h('g', null,
              h('ellipse', { cx: 306, cy: 158, rx: 122, ry: 11, fill: '#0b1020', opacity: 0.32 }),
              h('ellipse', { cx: 306, cy: 137, rx: 96, ry: 34, fill: '#aa9382', stroke: commonStroke, strokeWidth: 3, transform: 'rotate(8 306 137)' }),
              h('circle', { cx: 190, cy: 137, r: 34, fill: '#bca797', stroke: commonStroke, strokeWidth: 3 }),
              h('path', { d: 'M 176 118 Q 134 116 122 136 Q 151 143 184 137 M 193 114 Q 157 98 142 113 Q 162 130 199 133', fill: '#a58c7b', stroke: commonStroke, strokeWidth: 3 }),
              h('path', { d: 'M 354 120 Q 389 96 410 112 M 359 145 Q 397 162 420 145', fill: 'none', stroke: '#967c6c', strokeWidth: 18, strokeLinecap: 'round' }),
              h('path', { d: 'M 174 139 Q 180 143 186 139', fill: 'none', stroke: commonStroke, strokeWidth: 2.5 })
            );
          }
          var animalClass = binky ? 'petslab-body-motion--lift' : '';
          var bodyY = binky ? 94 : hunched || grind ? 111 : 121;
          return h('g', null,
            h('ellipse', { cx: 310, cy: 160, rx: binky ? 93 : 122, ry: 10, fill: '#0b1020', opacity: binky ? 0.2 : 0.32 }),
            h('g', { className: animalClass },
              h('ellipse', { cx: 310, cy: bodyY, rx: hunched || grind ? 74 : 93, ry: hunched || grind ? 53 : 40, fill: '#aa9382', stroke: commonStroke, strokeWidth: 3, transform: binky ? 'rotate(-9 310 94)' : null }),
              h('ellipse', { cx: 369, cy: bodyY - 6, rx: 43, ry: 36, fill: '#9b8170', opacity: 0.85 }),
              h('circle', { cx: 190, cy: binky ? 75 : hunched || grind ? 105 : 91, r: 35, fill: '#bca797', stroke: commonStroke, strokeWidth: 3 }),
              h('path', { d: binky
                ? 'M 175 54 Q 139 25 145 14 Q 177 29 190 57 M 198 52 Q 186 17 199 8 Q 219 31 213 62'
                : 'M 172 67 Q 148 16 160 7 Q 187 35 188 69 M 195 66 Q 190 13 204 7 Q 221 39 211 75',
                fill: '#aa9382', stroke: commonStroke, strokeWidth: 3, strokeLinejoin: 'round' }),
              h('path', { d: binky
                ? 'M 276 119 Q 250 144 232 136 M 344 118 Q 373 146 394 134'
                : thump
                  ? 'M 352 142 Q 397 151 424 143 M 368 132 Q 410 123 435 135'
                  : 'M 270 143 Q 253 155 239 151 M 353 143 Q 374 155 391 150',
                fill: 'none', stroke: '#967c6c', strokeWidth: 18, strokeLinecap: 'round' }),
              hunched || grind
                ? h('path', { d: 'M 173 105 Q 181 109 189 105 M 196 105 Q 204 109 212 105', fill: 'none', stroke: commonStroke, strokeWidth: 3, strokeLinecap: 'round' })
                : h('circle', { cx: 182, cy: binky ? 75 : 91, r: 4.5, fill: commonStroke }),
              h('path', { d: 'M 164 ' + (binky ? 92 : hunched || grind ? 123 : 108) + ' Q 177 ' + (binky ? 98 : hunched || grind ? 129 : 114) + ' 190 ' + (binky ? 92 : hunched || grind ? 123 : 108), fill: 'none', stroke: '#5f3030', strokeWidth: 2.5 }),
              (purr || grind) && h('g', { className: 'petslab-body-motion--pulse', fill: 'none', stroke: grind ? '#fb7185' : '#fde68a', strokeWidth: grind ? 4 : 2.5, strokeLinecap: 'round' },
                h('path', { d: grind ? 'M 145 115 L 133 107 M 145 123 L 130 123 M 147 130 L 135 139' : 'M 149 111 L 142 106 M 149 119 L 140 119' })
              ),
              thump && h('g', { className: 'petslab-body-motion--lift', fill: 'none', stroke: '#fbbf24', strokeWidth: 3, strokeLinecap: 'round' },
                h('path', { d: 'M 431 145 L 449 137 M 432 152 L 454 153 M 428 159 L 448 169' })
              )
            ),
            hunched && h('g', null,
              h('ellipse', { cx: 449, cy: 154, rx: 30, ry: 8, fill: '#7c4d2d', stroke: commonStroke, strokeWidth: 2 }),
              h('path', { d: 'M 425 151 Q 448 141 473 151', fill: 'none', stroke: '#c7d2a3', strokeWidth: 3, strokeDasharray: '4 4' })
            )
          );
        }

        function drawBird() {
          var crest = pose === 'bird-crest';
          var pin = pose === 'bird-eye-pin';
          var grind = pose === 'bird-beak-grind';
          var bob = pose === 'bird-tail-bob';
          var pluck = pose === 'bird-feather-pluck';
          return h('g', null,
            h('path', { d: 'M 90 153 Q 280 148 470 153', fill: 'none', stroke: '#8b5e3c', strokeWidth: 14, strokeLinecap: 'round' }),
            h('path', { d: 'M 117 160 Q 281 156 447 160', fill: 'none', stroke: '#c48a5d', strokeWidth: 3, opacity: 0.7 }),
            h('g', { className: bob ? 'petslab-body-motion--lift' : '' },
              h('path', { d: 'M 346 123 L 425 153 L 364 151 Z', fill: '#277c78', stroke: commonStroke, strokeWidth: 3 }),
              h('path', { d: 'M 355 132 L 434 170 L 365 157 Z', fill: '#1d5f64', stroke: commonStroke, strokeWidth: 3 })
            ),
            h('ellipse', { cx: 306, cy: 113, rx: 61, ry: 48, fill: '#4aa7a0', stroke: commonStroke, strokeWidth: 3 }),
            h('path', { d: 'M 279 91 Q 327 92 344 135 Q 299 149 269 120 Z', fill: pluck ? '#3c8883' : '#2f8c88', stroke: commonStroke, strokeWidth: 2 }),
            pluck && h('ellipse', { cx: 304, cy: 111, rx: 19, ry: 14, fill: '#d6ad91', stroke: '#5f3b30', strokeWidth: 2, strokeDasharray: '4 3' }),
            h('circle', { cx: 202, cy: 88, r: 39, fill: '#67b9ad', stroke: commonStroke, strokeWidth: 3 }),
            h('path', { d: 'M 165 91 L 118 105 L 163 113 Z', fill: '#e6a847', stroke: commonStroke, strokeWidth: 3, strokeLinejoin: 'round' }),
            h('circle', { cx: 193, cy: 81, r: 12, fill: '#f7f1dc', stroke: commonStroke, strokeWidth: 2 }),
            h('circle', { className: pin ? 'petslab-body-motion--pulse' : '', cx: 193, cy: 81, r: pin ? 3 : 7, fill: commonStroke }),
            crest && h('g', { className: 'petslab-body-motion--sway', fill: 'none', stroke: '#f4c95d', strokeWidth: 7, strokeLinecap: 'round' },
              h('path', { d: 'M 188 52 L 171 19 M 199 49 L 196 10 M 209 51 L 221 18' })
            ),
            grind && h('g', { className: 'petslab-body-motion--pulse', fill: 'none', stroke: '#fde68a', strokeWidth: 3, strokeLinecap: 'round' },
              h('path', { d: 'M 131 100 L 119 91 M 132 108 L 115 111' })
            ),
            h('path', { d: 'M 274 147 L 272 157 M 304 148 L 307 157 M 266 157 L 281 157 M 300 157 L 316 157', fill: 'none', stroke: '#4b2e22', strokeWidth: 4, strokeLinecap: 'round' }),
            pluck && h('g', { className: 'petslab-body-motion--pulse', fill: '#9fd5ce', stroke: commonStroke, strokeWidth: 1.5 },
              h('path', { d: 'M 408 151 Q 428 138 438 151 Q 425 157 408 151 Z' }),
              h('path', { d: 'M 448 164 Q 464 151 476 161 Q 464 171 448 164 Z' })
            ),
            pluck && h('path', { d: 'M 252 97 Q 274 100 284 116', fill: 'none', stroke: '#e6a847', strokeWidth: 7, strokeLinecap: 'round' }),
            bob && h('g', { className: 'petslab-body-motion--pulse', fill: 'none', stroke: '#fbbf24', strokeWidth: 3, strokeLinecap: 'round' },
              h('path', { d: 'M 248 103 Q 232 113 247 125 M 237 98 Q 214 113 236 132' })
            )
          );
        }

        var animal = speciesKey === 'cat' ? drawCat()
          : speciesKey === 'rabbit' ? drawRabbit()
          : speciesKey === 'bird' ? drawBird()
          : drawDog();

        return h('figure', {
          className: 'petslab-body-pose' + (compact ? ' petslab-body-pose--compact' : ''),
          'data-pets-body-pose': pose,
          style: { marginTop: compact ? 0 : 12 }
        },
          h('svg', {
            viewBox: '0 0 560 200',
            preserveAspectRatio: 'xMidYMid meet',
            role: 'img',
            focusable: 'false',
            'aria-labelledby': titleId + ' ' + descId
          },
            h('title', { id: titleId }, speciesLabel + ' posture study: ' + (item.signal || 'body-language signal')),
            h('desc', { id: descId },
              (compact ? 'Reference pose illustration. ' : 'Numbered teaching illustration. ') +
              cueSummary + '. Read the whole posture; color is decorative.'),
            h('rect', { x: 0, y: 0, width: 560, height: 200, fill: '#172033' }),
            h('circle', { cx: 485, cy: 44, r: 25, fill: '#fbbf24', opacity: 0.14 }),
            h('path', { d: 'M 0 151 Q 128 137 263 151 T 560 151 V 200 H 0 Z', fill: ground }),
            h('path', { d: 'M 0 151 Q 128 137 263 151 T 560 151', fill: 'none', stroke: '#64748b', strokeWidth: 2 }),
            !compact && h('text', { x: 18, y: 24, fill: '#fde68a', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em' }, 'WATCH THE WHOLE BODY'),
            animal,
            !compact && cues.map(function(cue, ci) {
              var cx = cue[1], cy = cue[2];
              return h('g', { key: 'body-cue-' + ci, 'aria-hidden': 'true' },
                h('circle', { cx: cx, cy: cy, r: 17, fill: 'none', stroke: '#fbbf24', strokeWidth: 2.5, strokeDasharray: '4 3' }),
                h('line', { x1: cx + 10, y1: cy - 11, x2: cx + 24, y2: cy - 25, stroke: '#fbbf24', strokeWidth: 2.5, strokeLinecap: 'round' }),
                h('circle', { cx: cx + 30, cy: cy - 30, r: 14, fill: '#1f1612', stroke: '#fbbf24', strokeWidth: 2.5 }),
                h('text', { x: cx + 30, y: cy - 24, textAnchor: 'middle', fill: '#fff7ed', fontSize: 18, fontWeight: 900 }, String(ci + 1))
              );
            })
          ),
          !compact && h('figcaption', { className: 'petslab-body-cues' },
            cues.map(function(cue, ci) {
              return h('span', { key: 'body-cue-label-' + ci, className: 'petslab-body-cue' },
                h('strong', { 'aria-hidden': 'true' }, String(ci + 1)),
                cue[0]
              );
            })
          )
        );
      }
      function startQuiz() {
        // Pick 10 distinct signals at random; each becomes a question with 1 correct + 3 distractors from same species (where possible)
        var pool = allSignals.slice();
        for (var i = pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        var qs = pool.slice(0, 10).map(function(item) {
          // 3 distractors: prefer same species, fall back to others
          var sameSpecies = allSignals.filter(function(x) { return x.species === item.species && x.meaning !== item.meaning; });
          for (var k = sameSpecies.length - 1; k > 0; k--) {
            var jj = Math.floor(Math.random() * (k + 1));
            var tt = sameSpecies[k]; sameSpecies[k] = sameSpecies[jj]; sameSpecies[jj] = tt;
          }
          var distractors = sameSpecies.slice(0, 3).map(function(x) { return x.meaning; });
          while (distractors.length < 3) {
            var rand = allSignals[Math.floor(Math.random() * allSignals.length)];
            if (rand.meaning !== item.meaning && distractors.indexOf(rand.meaning) === -1) {
              distractors.push(rand.meaning);
            }
          }
          var choices = distractors.concat([item.meaning]);
          // Shuffle the 4 choices
          for (var c = choices.length - 1; c > 0; c--) {
            var cj = Math.floor(Math.random() * (c + 1));
            var ct = choices[c]; choices[c] = choices[cj]; choices[cj] = ct;
          }
          var correctIdx = choices.indexOf(item.meaning);
          return {
            species: item.species, signal: item.signal,
            pose: item.pose, cues: item.cues,
            choices: choices, correct: correctIdx, color: item.color
          };
        });
        upd('blQuiz', { idx: 0, qs: qs, answers: [], score: 0 });
      }
      function answerQuiz(choiceIdx) {
        if (!blQuiz) return;
        var existing = blQuiz.answers || [];
        if (existing[blQuiz.idx] != null) return;  // already answered
        var nextAns = existing.slice();
        nextAns[blQuiz.idx] = choiceIdx;
        var q = blQuiz.qs[blQuiz.idx];
        var isCorrect = choiceIdx === q.correct;
        upd('blQuiz', Object.assign({}, blQuiz, {
          answers: nextAns,
          score: blQuiz.score + (isCorrect ? 1 : 0)
        }));
        // Decoder Mastery: log unique signals correctly identified across
        // every attempt. First-correct fires a celebration overlay.
        if (isCorrect) {
          var sigKey = q.species + '|' + q.signal;
          var prevMastery = (d.decoderMastery && typeof d.decoderMastery === 'object') ? d.decoderMastery : {};
          var existingEntry = prevMastery[sigKey];
          var isFirstCorrect = !existingEntry;
          var nowIso = new Date().toISOString();
          var nextEntry = isFirstCorrect
            ? { firstCorrectAt: nowIso, lastCorrectAt: nowIso, correctCount: 1, species: q.species, signal: q.signal, meaning: q.qs ? null : null }
            : Object.assign({}, existingEntry, { lastCorrectAt: nowIso, correctCount: (existingEntry.correctCount || 0) + 1 });
          var nextMastery = Object.assign({}, prevMastery);
          nextMastery[sigKey] = nextEntry;
          upd('decoderMastery', nextMastery);
          if (isFirstCorrect) {
            try { setDecoderCeleb({ species: q.species, signal: q.signal, at: Date.now() }); } catch (e) {}
            try { setTimeout(function () { setDecoderCeleb(null); }, 3200); } catch (e) {}
            // Award progressive badges based on unique signals decoded
            var uniqueCount = Object.keys(nextMastery).length;
            if (uniqueCount >= 5) awardBadge('pets_decoder_5', 'Signal Reader (5 decoded)');
            if (uniqueCount >= 15) awardBadge('pets_decoder_15', 'Fluent Decoder (15 decoded)');
            if (uniqueCount >= 27) awardBadge('pets_decoder_all', 'Master Decoder (all signals)');
          }
        }
        petsAnnounce(isCorrect ? 'Correct.' : 'Not quite — see explanation.');
      }
      function nextQuiz() {
        if (!blQuiz) return;
        if (blQuiz.idx < blQuiz.qs.length - 1) {
          upd('blQuiz', Object.assign({}, blQuiz, { idx: blQuiz.idx + 1 }));
        } else {
          // Done — award badge if score ≥ 8
          if (blQuiz.score >= 8) awardBadge('pets_body_lang', 'Body Language Reader');
          upd('blQuiz', Object.assign({}, blQuiz, { idx: blQuiz.qs.length, done: true }));
        }
      }
      function newQuiz() { upd('blQuiz', null); startQuiz(); }
      // Mode switcher UI
      var modeBar = h('div', { role: 'tablist', 'aria-label': 'Body language mode',
        style: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' } },
        ['read', 'quiz'].map(function(m) {
          var sel = blMode === m;
          return h('button', {
            key: m, role: 'tab', 'aria-selected': sel ? 'true' : 'false',
            'data-pets-focusable': true,
            'aria-label': m === 'read' ? 'Reference reading mode' : 'Quiz mode',
            onClick: function() { setMode(m); },
            style: btn({
              padding: '8px 14px', fontSize: 13,
              background: sel ? T.accent : T.card,
              color: sel ? '#1f1612' : T.text,
              border: '2px solid ' + (sel ? T.accent : T.border),
              fontWeight: sel ? 800 : 600
            })
          }, (m === 'read' ? '📚 Read (reference)' : '🎯 Quiz mode'));
        })
      );
      // Quiz mode rendering
      function renderQuizMode() {
        if (!blQuiz) {
          return h('div', { style: { padding: 18, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, textAlign: 'center' } },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '🎯'),
            h('h3', { style: { margin: '0 0 8px', color: T.accentHi, fontSize: 17 } }, 'Body Language Quiz'),
            h('p', { style: { color: T.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' } },
              '10 signals across 4 species. For each, pick the most likely meaning. Score 8/10 or higher to earn the Body Language Reader badge.'
            ),
            h('button', { 'data-pets-focusable': true,
              onClick: startQuiz,
              style: btnPrimary({ padding: '12px 22px', fontSize: 14 })
            }, '▶ Start 10-question quiz')
          );
        }
        if (blQuiz.done) {
          var pct = Math.round(blQuiz.score / blQuiz.qs.length * 100);
          var tier = blQuiz.score === blQuiz.qs.length ? 'perfect'
                     : blQuiz.score >= 9 ? 'outstanding'
                     : blQuiz.score >= 7 ? 'strong'
                     : blQuiz.score >= 5 ? 'learning'
                     : 'review';
          var tierColor = tier === 'perfect' ? '#fbbf24'
                          : tier === 'outstanding' ? T.ok
                          : tier === 'strong' ? '#16a34a'
                          : tier === 'learning' ? T.accent
                          : T.danger;
          var tierIcon = tier === 'perfect' ? '🏆' : tier === 'outstanding' ? '🎯' : tier === 'strong' ? '👊' : tier === 'learning' ? '📚' : '📖';
          var tierTitle = tier === 'perfect' ? 'Perfect — every signal read'
                          : tier === 'outstanding' ? 'Outstanding — you can read pets like a pro'
                          : tier === 'strong' ? 'Strong — you will spot most danger signals before they escalate'
                          : tier === 'learning' ? 'Solid foundation'
                          : 'These signals take practice';
          var tierMsg = tier === 'perfect'
                        ? 'You read every species cleanly. Bring this skill to a real shelter — most volunteers can read 3 of 4 species at this level after weeks of work.'
                        : tier === 'outstanding'
                          ? 'You read all 4 species at near-expert level. The signal most volunteers miss is whale eye in cats — you got it.'
                          : tier === 'strong'
                            ? 'Strong overall. Re-read the species you missed (most likely cats or rabbits — they have the most-misread signals).'
                            : tier === 'learning'
                              ? 'Solid foundation — review the Read tab to sharpen specific species. Most miss-prone: cat whale eye, rabbit thumping, dog calming signals.'
                              : 'Re-read the species sections, then try again. Body language fluency is muscle memory; one quiz pass isn\'t enough.';
          var rad = 36, circ = 2 * Math.PI * rad;
          var dashOff = circ - (pct / 100) * circ;
          var ans = blQuiz.answers || [];
          return h('div', { style: { borderRadius: 14, overflow: 'hidden', border: '2px solid ' + tierColor + 'aa', background: T.card } },
            h('div', { style: { padding: 18, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: 'linear-gradient(135deg, ' + tierColor + '22, transparent)' } },
              // Score donut
              h('div', { style: { position: 'relative', width: 96, height: 96, flexShrink: 0 } },
                h('svg', { viewBox: '0 0 100 100', width: 96, height: 96,
                  'aria-label': 'Score: ' + blQuiz.score + ' out of ' + blQuiz.qs.length
                },
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                    strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                ),
                h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                  h('div', { style: { fontSize: 22, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                  h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted } }, blQuiz.score + ' / ' + blQuiz.qs.length)
                )
              ),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 30, marginBottom: 4 }, 'aria-hidden': 'true' }, tierIcon),
                h('h3', { style: { margin: '0 0 6px', fontSize: 18, color: tierColor, fontWeight: 900, lineHeight: 1.15 } }, tierTitle),
                h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } }, tierMsg)
              )
            ),
            // Per-question result strip
            h('div', { style: { padding: '0 18px 8px' } },
              h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 } }, 'Your answers'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                blQuiz.qs.map(function(qq, qi) {
                  var picked = ans[qi];
                  var isCorrect = picked === qq.correct;
                  return h('div', { key: qi,
                    title: 'Q' + (qi + 1) + ' (' + qq.species + ')' + (isCorrect ? ' correct ✓' : ' incorrect'),
                    style: {
                      width: 14, height: 14, borderRadius: 3,
                      background: isCorrect ? T.ok : T.danger,
                      border: '1.5px solid ' + (isCorrect ? '#15803d' : '#7f1d1d'),
                      boxShadow: '0 1px 1px rgba(0,0,0,0.3)'
                    },
                    'aria-label': 'Q' + (qi + 1) + (isCorrect ? ' correct' : ' incorrect')
                  });
                })
              )
            ),
            blQuiz.score >= 8 && h('div', { style: { padding: '8px 18px', fontSize: 13, color: T.ok, fontWeight: 700, borderTop: '1px solid ' + T.border } }, '🏅 Badge earned: Body Language Reader'),
            h('div', { style: { padding: '12px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid ' + T.border } },
              h('button', { 'data-pets-focusable': true,
                onClick: newQuiz,
                style: btnPrimary({ padding: '10px 18px', fontSize: 13 })
              }, '🔁 New quiz'),
              h('button', { 'data-pets-focusable': true,
                onClick: function() { setMode('read'); },
                style: btn({ padding: '10px 18px', fontSize: 13 })
              }, '📚 Back to reference')
            )
          );
        }
        var q = blQuiz.qs[blQuiz.idx];
        var picked = (blQuiz.answers || [])[blQuiz.idx];
        var revealed = picked != null;
        return h('div', null,
          // Progress + score
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: T.dim } }, 'Question ' + (blQuiz.idx + 1) + ' / ' + blQuiz.qs.length),
            h('div', { style: { flex: 1, height: 6, background: T.cardAlt, borderRadius: 3, overflow: 'hidden' }, 'aria-hidden': 'true' },
              h('div', { style: { width: ((blQuiz.idx + (revealed ? 1 : 0)) / blQuiz.qs.length * 100) + '%', height: '100%', background: T.accent, transition: 'width 0.3s' } })
            ),
            h('div', { style: { fontSize: 12, color: T.accentHi, fontWeight: 700 } }, blQuiz.score + ' correct')
          ),
          // The signal
          h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: T.accentHi, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, q.species),
            h('div', { style: { fontSize: 16, color: T.text, fontWeight: 700, lineHeight: 1.5 } }, q.signal),
            renderBodyLanguagePose(q),
            h('div', { style: { fontSize: 12, color: T.muted, marginTop: 8, fontStyle: 'italic' } }, 'What is this animal most likely communicating?')
          ),
          // Choices
          h('div', { role: 'radiogroup', 'aria-label': 'Choose the most likely meaning',
            style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 } },
            q.choices.map(function(choice, ci) {
              var isPicked = picked === ci;
              var isCorrect = ci === q.correct;
              var bg = T.card, border = T.border, text = T.text;
              if (revealed) {
                if (isCorrect) { bg = 'rgba(132,204,22,0.18)'; border = T.ok; text = T.ok; }
                else if (isPicked) { bg = 'rgba(220,38,38,0.18)'; border = T.danger; text = '#fca5a5'; }
              } else if (isPicked) {
                bg = 'rgba(245,158,11,0.18)'; border = T.accent;
              }
              return h('button', {
                key: ci, role: 'radio', 'aria-checked': isPicked ? 'true' : 'false',
                'data-pets-focusable': true,
                disabled: revealed,
                onClick: function() { answerQuiz(ci); },
                style: btn({
                  padding: '12px 14px', fontSize: 13,
                  background: bg, color: text,
                  border: '2px solid ' + border,
                  cursor: revealed ? 'default' : 'pointer',
                  fontWeight: 600, lineHeight: 1.5
                })
              },
                h('span', { style: { fontWeight: 800, marginRight: 8, color: T.accentHi } }, String.fromCharCode(65 + ci) + '.'),
                choice,
                revealed && isCorrect && h('span', { style: { color: T.ok, marginLeft: 8, fontWeight: 800 } }, ' ✓ correct'),
                revealed && isPicked && !isCorrect && h('span', { style: { color: T.danger, marginLeft: 8, fontWeight: 800 } }, ' ✗')
              );
            })
          ),
          // Reveal + next
          revealed && h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, borderLeft: '3px solid ' + q.color, marginBottom: 12 } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: q.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Why'),
            h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.6 } }, q.choices[q.correct])
          ),
          revealed && h('button', { 'data-pets-focusable': true,
            onClick: nextQuiz,
            style: btnPrimary({ padding: '10px 22px', fontSize: 13, width: '100%' })
          }, blQuiz.idx < blQuiz.qs.length - 1 ? 'Next signal →' : 'See score ✓')
        );
      }
      // Read mode: the same observable poses used by the quiz, arranged as a
      // scan-friendly reference gallery. Compact figures keep all SVG text out
      // of the scaled thumbnail; the readable signal and meaning stay in HTML.
      var readContent = h('div', { className: 'petslab-body-reference' },
        sets.map(function(g) {
          var speciesKey = bodySpeciesKey(g.species);
          var headingId = 'pets-body-reference-' + speciesKey;
          var referenceItems = allSignals.filter(function(item) { return item.species === g.species; });
          return h('section', { key: g.species, className: 'petslab-body-reference-group', 'aria-labelledby': headingId },
            h('div', { className: 'petslab-body-reference-head' },
              h('h3', { id: headingId }, g.species),
              h('span', { className: 'petslab-body-reference-count' }, referenceItems.length + ' observable signals')
            ),
            h('div', { className: 'petslab-body-reference-grid', role: 'list' },
              referenceItems.map(function(it) {
                return h('article', { key: it.pose, className: 'petslab-body-reference-card', role: 'listitem' },
                  renderBodyLanguagePose(it, true),
                  h('div', { className: 'petslab-body-reference-copy' },
                    h('h4', { className: 'petslab-body-reference-signal' }, it.signal),
                    h('p', { className: 'petslab-body-reference-meaning' },
                      h('strong', { style: { color: it.color } }, 'Meaning: '),
                      it.meaning)
                  )
                );
              })
            )
          );
        })
      );
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('👀 Body Language Decoder'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Most pet bites + stress incidents are predictable from body language minutes in advance. Learning to read these signals is the single highest-impact thing a pet-owning household can do.')),
        modeBar,
        blMode === 'quiz' ? renderQuizMode() : readContent,
        footer());
    }

    // ─────────────────────────────────────────
    // LIFETIME COST CALCULATOR
    // ─────────────────────────────────────────
    function renderCost() {
      var profiles = {
        'dog-large': { name: 'Large dog (Lab/GSD class)', icon: '🐕',
          firstYear: 3500, annual: 2200, emergencyFund: 3000, lifespan: 11, timeDaily: 2,
          notes: 'Includes spay/neuter, vaccines, training class, food, gear. Annual = food + vet + grooming + dental.' },
        'dog-small': { name: 'Small dog', icon: '🐕‍🦺',
          firstYear: 2500, annual: 1500, emergencyFund: 2500, lifespan: 14, timeDaily: 1.5,
          notes: 'Lower food cost; small-breed dental needs raise lifetime vet costs.' },
        'cat-indoor': { name: 'Cat (indoor)', icon: '🐈',
          firstYear: 1800, annual: 1100, emergencyFund: 2500, lifespan: 15, timeDaily: 0.75,
          notes: 'Litter + food + vet + enrichment. Pair of cats often costs less than 2× single (shared resources).' },
        'rabbit-pair': { name: 'Bonded rabbit pair', icon: '🐰',
          firstYear: 1200, annual: 900, emergencyFund: 2000, lifespan: 10, timeDaily: 1.5,
          notes: 'Hay + greens + pellets + exotic-vet visits. Spay/neuter mandatory + can be expensive.' },
        'guinea-pair': { name: 'Bonded GP pair', icon: '🐹',
          firstYear: 600, annual: 700, emergencyFund: 1000, lifespan: 6, timeDaily: 1,
          notes: 'Vitamin-C-stable pellets + daily fresh veg + cage cleaning.' },
        'reptile': { name: 'Beginner reptile (gecko)', icon: '🦎',
          firstYear: 800, annual: 250, emergencyFund: 800, lifespan: 18, timeDaily: 0.25,
          notes: 'Front-loaded setup cost (enclosure + UVB + heat). Low ongoing cost. Exotic vets rare.' },
        'parrot-medium': { name: 'Medium parrot (Conure)', icon: '🦜',
          firstYear: 2500, annual: 1200, emergencyFund: 2000, lifespan: 25, timeDaily: 2,
          notes: 'Cage + food + toys (replaced often) + avian vet. NEEDS daily out-of-cage time.' }
      };
      var p = profiles[costSpecies] || profiles['cat-indoor'];
      // The slider runs to 30 years but a guinea pig pair lives ~6, so a
      // student can ask for a span covering several successive animals. The
      // panel used to call that "Lifetime cost" regardless, which is the wrong
      // word for five consecutive pairs — and it charged the first-year setup
      // only once, when in reality each new animal brings its own.
      var costAnimals = Math.max(1, Math.ceil(costYears / (p.lifespan || costYears)));
      var multiGen = costAnimals > 1;
      var lifetimeCost = multiGen
        ? (costAnimals * p.firstYear) + (p.annual * Math.max(0, costYears - costAnimals))
        : p.firstYear + (p.annual * (costYears - 1));
      var lifetimeHours = p.timeDaily * 365 * costYears;
      var dollarsPerYear = lifetimeCost / costYears;

      function renderCostScale() {
        var annualShare = lifetimeCost > 0 ? (p.annual / lifetimeCost * 100) : 100;
        var spans = [];
        for (var animalIndex = 0; animalIndex < costAnimals; animalIndex++) {
          var startYear = animalIndex * p.lifespan;
          if (startYear >= costYears) break;
          spans.push({
            start: startYear,
            end: Math.min(costYears, (animalIndex + 1) * p.lifespan)
          });
        }
        var W = 600;
        var x0 = 18;
        var usable = W - 36;
        function xForYear(year) {
          return x0 + (Math.max(0, Math.min(costYears, year)) / costYears) * usable;
        }
        var setupYears = spans.map(function(span) { return span.start; });
        var timelineLabel = costYears + '-year commitment timeline for ' + p.name + '. ' +
          (multiGen
            ? 'This span covers about ' + costAnimals + ' successive animals, with a new first-year setup at years ' + setupYears.join(', ') + '.'
            : 'This span stays within one typical animal lifespan.') +
          ' The selected plan ends at year ' + costYears + '.';
        return h('div', { className: 'petslab-cost-burden' },
          h('div', { className: 'petslab-cost-burden-heading' },
            h('strong', null, 'Annual cost versus the selected span'),
            h('span', null, 'Same scale: one ongoing year compared with the full plan')
          ),
          h('div', { className: 'petslab-cost-burden-row' },
            h('span', { className: 'petslab-cost-burden-label' }, 'One ongoing year'),
            h('div', {
              className: 'petslab-cost-burden-track',
              role: 'img',
              'aria-label': 'One ongoing year is $' + p.annual.toLocaleString() +
                ', about ' + Math.round(annualShare) + ' percent of the selected-span cost.'
            },
              h('div', {
                className: 'petslab-cost-burden-fill petslab-cost-burden-fill--annual',
                style: { width: Math.max(3, Math.min(100, annualShare)) + '%' }
              })
            ),
            h('span', { className: 'petslab-cost-burden-value' }, '$' + p.annual.toLocaleString())
          ),
          h('div', { className: 'petslab-cost-burden-row' },
            h('span', { className: 'petslab-cost-burden-label' }, costYears + '-year plan'),
            h('div', {
              className: 'petslab-cost-burden-track',
              role: 'img',
              'aria-label': 'The selected ' + costYears + '-year cost is $' + lifetimeCost.toLocaleString() + '.'
            },
              h('div', { className: 'petslab-cost-burden-fill petslab-cost-burden-fill--span', style: { width: '100%' } })
            ),
            h('span', { className: 'petslab-cost-burden-value' }, '$' + lifetimeCost.toLocaleString())
          ),
          h('div', { className: 'petslab-cost-timeline' },
            h('svg', {
              viewBox: '0 0 ' + W + ' 70',
              preserveAspectRatio: 'none',
              role: 'img',
              'aria-label': timelineLabel,
              focusable: 'false'
            },
              h('title', null, timelineLabel),
              h('rect', { x: x0, y: 24, width: usable, height: 22, rx: 11, fill: T.bg, stroke: T.border, strokeWidth: 2 }),
              spans.map(function(span, spanIndex) {
                var sx = xForYear(span.start);
                var ex = xForYear(span.end);
                return h('rect', {
                  key: 'span-' + spanIndex,
                  x: sx,
                  y: 25,
                  width: Math.max(2, ex - sx),
                  height: 20,
                  rx: 9,
                  fill: spanIndex % 2 === 0 ? '#0e7490' : '#7c3aed',
                  opacity: 0.82
                });
              }),
              spans.map(function(span, markerIndex) {
                var mx = xForYear(span.start);
                return h('polygon', {
                  key: 'setup-' + markerIndex,
                  points: mx + ',15 ' + (mx + 7) + ',22 ' + mx + ',29 ' + (mx - 7) + ',22',
                  fill: '#fbbf24',
                  stroke: '#5b3408',
                  strokeWidth: 1.5
                });
              }),
              spans.slice(1).map(function(span, boundaryIndex) {
                var bx = xForYear(span.start);
                return h('line', {
                  key: 'boundary-' + boundaryIndex,
                  x1: bx, y1: 22, x2: bx, y2: 52,
                  stroke: '#f8fafc', strokeWidth: 2, strokeDasharray: '3 3', opacity: 0.8
                });
              }),
              h('circle', { cx: xForYear(costYears), cy: 35, r: 7, fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 2 })
            ),
            h('div', { className: 'petslab-cost-timeline-labels' },
              h('span', null, 'Year 0'),
              h('span', null, '~' + p.lifespan + ' yr typical lifespan'),
              h('span', null, 'Year ' + costYears)
            ),
            h('div', { className: 'petslab-cost-timeline-key', 'aria-hidden': 'true' },
              h('span', null, '◆ First-year setup / new animal'),
              h('span', null, '━ Ongoing care'),
              h('span', null, '● Selected plan ends')
            )
          )
        );
      }

      function radioCost(val, label) {
        var picked = costSpecies === val;
        return h('label', { htmlFor: 'cs-' + val,
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginRight: 6, marginBottom: 4, borderRadius: '999rem',
            background: picked ? T.accent : T.cardAlt, color: picked ? '#1f1612' : T.text,
            border: '1px solid ' + (picked ? T.accent : T.border), fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
          h('input', { id: 'cs-' + val, 'data-pets-focusable': true, type: 'radio',
            name: 'cost-species', checked: picked,
            onChange: function() { upd('costSpecies', val); },
            style: { position: 'absolute', opacity: 0, pointerEvents: 'none' } }),
          label);
      }
      return h('div', { className: 'petslab-cost-view', style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('💵 Lifetime Cost & Commitment'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'These are illustrative US averages from AVMA + ASPCA + APPA surveys (2023–2024). Actual costs vary widely by region — Maine rural exotic-vet care can be limited or require driving to Boston. Use as ballpark, not exact estimate.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 } }, 'Pick a species'),
          h('div', { role: 'radiogroup', 'aria-label': 'Species' },
            radioCost('dog-large', '🐕 Large dog'),
            radioCost('dog-small', '🐕‍🦺 Small dog'),
            radioCost('cat-indoor', '🐈 Cat'),
            radioCost('rabbit-pair', '🐰 Rabbits'),
            radioCost('guinea-pair', '🐹 Guinea pigs'),
            radioCost('reptile', '🦎 Gecko'),
            radioCost('parrot-medium', '🦜 Conure'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 } },
            'Years of commitment: ',
            h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, costYears + ' years'),
            ' (typical lifespan ~', h('strong', null, p.lifespan), ' yr)'),
          h('input', { id: 'cs-years', 'data-pets-focusable': true, type: 'range',
            min: 1, max: 30, step: 1, value: costYears,
            'aria-label': 'Commitment years',
            onChange: function(e) { upd('costYears', parseInt(e.target.value, 10)); },
            style: { width: '100%', accentColor: T.accent } })),
        h('div', { className: 'petslab-cost-summary', style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, p.icon + ' ' + p.name + ' over ' + costYears + ' years'),
          h('div', { className: 'petslab-cost-metrics' },
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'First year'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.warm, fontFamily: 'monospace' } }, '$' + p.firstYear.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Annual ongoing'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } }, '$' + p.annual.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Emergency fund'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.danger, fontFamily: 'monospace' } }, '$' + p.emergencyFund.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, multiGen ? 'Cost over ' + costYears + ' yr' : 'Lifetime cost'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accent, fontFamily: 'monospace' } }, '$' + lifetimeCost.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, '$ per year'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'monospace' } }, '$' + Math.round(dollarsPerYear).toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Total time'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'monospace' } }, Math.round(lifetimeHours).toLocaleString() + ' hr'))),
          renderCostScale(),
          // Naming what a multi-lifespan span actually is. The money is the
          // smaller half of it: a short-lived pet over a long horizon means
          // repeated loss, which the Lifespan module treats as the real
          // planning question rather than a footnote.
          multiGen && h('div', {
            style: { marginTop: 10, padding: '10px 12px', borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent }
          },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: T.accentHi, marginBottom: 4 } },
              // multiGen guarantees costAnimals >= 2, so this is always plural.
              '↻ ' + costYears + ' years is about ' + costAnimals + ' successive animals'),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              p.name + ' lives roughly ' + p.lifespan + ' years, so planning ' + costYears +
              ' years means starting over about ' + costAnimals + ' times. The figure above counts ' +
              costAnimals + ' first-year setups, not one. It also means ' + (costAnimals - 1) +
              ' more ' + (costAnimals - 1 === 1 ? 'goodbye' : 'goodbyes') +
              ' than a single long-lived animal would ask of you — often a child\'s first experience of losing someone. ' +
              'If you want one animal for the whole span, compare against a species whose lifespan already covers it.')
          ),
          // Lifetime-cost composition — setup vs ongoing vs the emergency reserve people forget.
          (function() {
            // Must track the headline figure above: with successive animals
            // the setup slice is paid once per animal, not once overall.
            var setup = p.firstYear * costAnimals;
            var ongoing = p.annual * Math.max(0, costYears - costAnimals);
            var reserve = p.emergencyFund;
            var total = setup + ongoing + reserve || 1;
            var segs = [
              { id: 'setup', mark: 'SET', label: 'First-year setup', v: setup, color: T.warm || '#f59e0b' },
              { id: 'ongoing', mark: 'RUN', label: 'Ongoing (' + Math.max(0, costYears - costAnimals) + ' yr × $' + p.annual.toLocaleString() + ')', v: ongoing, color: T.accentHi || '#0891b2' },
              { id: 'reserve', mark: 'SAFE', label: 'Emergency reserve', v: reserve, color: T.danger || '#dc2626' }
            ];
            var allocationLabel = 'True total commitment $' + total.toLocaleString() + ': ' +
              segs.map(function(s) {
                return s.label + ' $' + s.v.toLocaleString() + ', ' + Math.round(s.v / total * 100) + ' percent';
              }).join('; ') + '.';
            return h('div', { className: 'petslab-cost-allocation' },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'True total commitment: $' + total.toLocaleString()),
              h('div', {
                className: 'petslab-cost-allocation-bar',
                role: 'img',
                'aria-label': allocationLabel
              },
                segs.map(function(s) {
                  var share = s.v / total * 100;
                  return h('div', {
                    key: s.id,
                    className: 'petslab-cost-allocation-segment petslab-cost-allocation-segment--' + s.id,
                    title: s.label + ': $' + s.v.toLocaleString(),
                    'aria-hidden': 'true',
                    style: { flex: '0 0 ' + share + '%' }
                  }, share >= 12 ? s.mark + ' ' + Math.round(share) + '%' : (share >= 7 ? s.mark : s.mark.charAt(0)));
                })
              ),
              h('div', { className: 'petslab-cost-allocation-legend', role: 'list', 'aria-label': 'Cost allocation legend' },
                segs.map(function(s) {
                  return h('div', { key: s.id, role: 'listitem', className: 'petslab-cost-allocation-item' },
                    h('span', { className: 'petslab-cost-allocation-mark', 'aria-hidden': 'true' }, s.mark),
                    h('span', null,
                      h('strong', null, s.label),
                      '$' + s.v.toLocaleString() + ' (' + Math.round(s.v / total * 100) + '%)'
                    )
                  );
                })
              ),
              h('div', { style: { marginTop: 6, fontSize: 11, color: T.muted, fontStyle: 'italic' } }, 'The "lifetime cost" figure above leaves out the emergency reserve — a real cost you should bank before adopting.')
            );
          })(),
          h('p', { style: { margin: '12px 0 0', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } }, p.notes)),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'What\'s NOT in these numbers'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
            h('li', null, 'Damage to your stuff (chewed shoes, scratched furniture, accidents on rugs)'),
            h('li', null, 'Pet sitters / boarding when you travel'),
            h('li', null, 'Higher rent / pet-deposit costs'),
            h('li', null, 'Senior-pet costs (last 2–3 years often double the annual budget)'),
            h('li', null, 'Specialty vet care (cardiology, oncology, behaviorist)'))),
        footer());
    }

    // ─────────────────────────────────────────
    // GLOSSARY
    // ─────────────────────────────────────────
    function renderGlossary() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('📖 Glossary'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          'Ethology + animal-care terms used throughout this lab. Skim once to recognize them when they show up in source modules; come back when something\'s fuzzy.'),
        h('div', { role: 'list',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 } },
          GLOSSARY.map(function(g, i) {
            return h('div', { key: i, role: 'listitem',
              style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, g.term),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, g.def));
          })),
        footer());
    }

    // ─────────────────────────────────────────
    // MYTHS BUSTED
    // ─────────────────────────────────────────
    function renderMyths() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🧐 Myths Busted'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          'Seven misconceptions that mislead pet owners. Every correction has a primary-source citation.'),
        MYTHS.map(function(m, i) {
          return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 6 } },
              '❌ Myth: ', h('span', { style: { color: T.text } }, m.myth)),
            h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
              h('strong', { style: { color: T.accentHi } }, '✓ What\'s actually true: '), m.truth),
            h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Source: ', m.source));
        }),
        footer());
    }

    // ─────────────────────────────────────────
    // CAREER PATHWAYS
    // ─────────────────────────────────────────
    function renderCareers() {
      // Only these two are distinct BLS occupations with a published national
      // median. The other six — behaviorist, trainer, wildlife rehabber,
      // shelter director, lab-animal specialist, marine mammal trainer — are
      // either folded into broader BLS categories or not surveyed at all, so
      // their figures come from professional bodies and job-board aggregates.
      // "Salaries from BLS where available" was true but hid which was which,
      // and a range sourced from a job board reads identically to a national
      // survey median when they sit in the same font.
      var CAREER_BLS_SOURCED = { vet: true, vetTech: true };
      function srcChip(isBls) {
        return h('span', {
          style: {
            fontSize: 9, padding: '1px 6px', borderRadius: '999rem', marginLeft: 6,
            border: '1px solid ' + (isBls ? T.ok : T.border),
            color: isBls ? T.ok : T.dim, whiteSpace: 'nowrap'
          },
          title: isBls
            ? 'National median from the BLS Occupational Employment and Wage Statistics survey.'
            : 'Not a separate BLS occupation — figure is an estimate from professional bodies and job listings, and is weaker evidence than a BLS median.'
        }, isBls ? 'BLS median' : 'estimate');
      }
      function tagPill(text) {
        return h('span', { key: text,
          style: { fontSize: 10, padding: '2px 8px', borderRadius: '999rem', background: T.bg, color: T.text, border: '1px solid ' + T.border, marginRight: 4, marginBottom: 4, display: 'inline-block' } }, text);
      }
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('🧰 Career Pathways'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Animal careers span every level of training: high-school cert programs, 2-year community college, apprenticeships, 4-year degrees, graduate research. Maine pipelines highlighted.'),
          h('p', { style: { margin: '8px 0 0', color: T.dim, fontSize: 11, lineHeight: 1.6 } },
            h('strong', { style: { color: T.warm } }, 'How to read these numbers. '),
            'Two of these are real BLS occupations with a published national median (marked ',
            h('span', { style: { color: T.ok } }, 'BLS median'),
            '); the rest are not separately surveyed, so those figures are ',
            h('span', { style: { color: T.dim } }, 'estimates'),
            ' from professional bodies and job listings and should carry less weight. All are ',
            h('strong', { style: { color: T.text } }, 'national'),
            ' — rural Maine pay commonly runs below a national median, and cost of living with it, so compare local postings before deciding anything. Wage data also goes stale: these are BLS OEWS 2024 medians and the 2022–2032 outlook, so check the current BLS Occupational Outlook Handbook rather than trusting a figure on this page.')),
        h('div', { role: 'list',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 } },
          CAREER_PATHS.map(function(c) {
            return h('div', { key: c.id, role: 'listitem',
              style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, c.icon),
                h('h3', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, c.title)),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', marginBottom: 8 } },
                c.tags.map(function(t) { return tagPill(t); })),
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                h('strong', { style: { color: T.accent } }, '💵 Salary: '), c.salary,
                srcChip(!!CAREER_BLS_SOURCED[c.id])),
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                h('strong', { style: { color: T.warm } }, '📈 Outlook: '), c.growth),
              h('div', { style: { fontSize: 11, color: T.muted, marginBottom: 4, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, '🎓 How to get there: '), c.edu),
              h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, '📍 Where: '), c.where));
          })),
        crossLink('Pair with retrieval practice', h('span', null,
          'AlloFlow ', h('strong', { style: { color: T.text } }, 'AlloBot Sage'),
          ' uses retrieval-practice combat to drill terminology + facts from this tool — useful for kids who want career-skill reps before transcripts catch up.')),
        footer());
    }

    // ─────────────────────────────────────────
    // TAKE ACTION
    // ─────────────────────────────────────────
    function renderAction() {
      function actionList(title, items) {
        return h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, title),
          items.map(function(a) {
            return h('div', { key: a.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, a.icon),
                h('strong', { style: { color: T.text, fontSize: 13, flex: 1 } }, a.what)),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
                h('strong', { style: { color: T.text } }, 'How: '), a.how),
              h('div', { style: { fontSize: 12, color: T.accentHi, lineHeight: 1.55, marginBottom: a.url ? 4 : 0 } },
                h('strong', null, 'Why: '), a.impact),
              a.url && h('a', { href: a.url, target: '_blank', rel: 'noopener',
                style: { color: T.link, fontSize: 11, textDecoration: 'underline' },
                'aria-label': a.what + ' — open resource (new tab)' }, '→ Open resource'));
          }));
      }
      return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
        backBar('🌱 Take Action'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Knowing how cats work doesn\'t change anything by itself. The animal-welfare picture in your community changes when people make small decisions in the same direction. Pick what fits your time + situation.')),
        actionList('🏠 At home', TAKE_ACTION.home),
        actionList('🏫 At school', TAKE_ACTION.school),
        actionList('🌲 In your community', TAKE_ACTION.community),
        actionList('🏛️ In civic life', TAKE_ACTION.civic),
        crossLink('Want depth on civic action?', h('span', null,
          'AlloFlow ', h('strong', { style: { color: T.text } }, 'Civic Action / Rights & Dissent'),
          ' goes deeper on writing effective public comments, planning a school-board ask, and what counts as protected speech.')),
        footer());
    }

    // ─────────────────────────────────────────
    // QUIZ — 15 questions across the lab
    // ─────────────────────────────────────────
    var QUIZ = [
      { id: 'q1', icon: '🐕',
        stem: 'Roughly how long ago do current genetic studies suggest dogs were domesticated from a now-extinct Pleistocene wolf population?',
        choices: ['~500 years', '~3,000 years', '~15,000–40,000 years', '~200,000 years'],
        correct: 2, why: 'Multiple genome studies (Frantz 2016, Botigué 2017) point to a single domestication event between 15,000 and 40,000 years ago, possibly in eastern Eurasia.' },
      { id: 'q2', icon: '🐈',
        stem: 'Why do cats need taurine in their diet but dogs don\'t?',
        choices: ['Taurine is a vitamin only cats need', 'Cats lost the metabolic ability to synthesize taurine; they\'re obligate carnivores', 'Cats absorb taurine through their paws', 'Cats convert taurine from sunlight'],
        correct: 1, why: 'Cats lost the synthesis pathway during their evolution as strict meat-eaters. Without dietary taurine, cats develop dilated cardiomyopathy + retinal degeneration. AAFCO commercial cat foods guarantee minimums.' },
      { id: 'q3', icon: '🐺',
        stem: 'What\'s the modern scientific status of "alpha wolf" / dominance theory for dog training?',
        choices: ['Confirmed by recent wolf studies', 'Discredited — wild wolf packs are families, not status hierarchies', 'Only applies to certain breeds', 'Still used by all major veterinary associations'],
        correct: 1, why: 'L. David Mech (whose work popularized "alpha") spent decades trying to retract it. Wild wolf packs are family units. AVSAB + AVMA position statements oppose dominance-based training.' },
      { id: 'q4', icon: '🐹',
        stem: 'You\'re considering housing two Syrian hamsters together to keep each other company. What does the science say?',
        choices: ['Great idea — hamsters are highly social', 'Only safe if same sex', 'Strictly solitary — two adult hamsters in one cage = serious fighting', 'Only safe with food puzzles'],
        correct: 2, why: 'Syrian (golden) hamsters are strictly solitary. Cohabiting adults typically results in fighting, often fatal. Pet stores often house them together as juveniles, then sell them with bad advice.' },
      { id: 'q5', icon: '🦜',
        stem: 'Why are pet birds so vulnerable to overheated nonstick (Teflon/PTFE) cookware?',
        choices: ['Birds are allergic to PTFE molecules', 'Bird respiratory anatomy uses one-way air sacs that exchange far more air per kg than mammal lungs', 'Bird feathers absorb PTFE fumes', 'Birds have no sense of smell'],
        correct: 1, why: 'Birds have 9 air sacs and one-way airflow through their lungs — vastly more efficient gas exchange than mammals. Same physiology that makes them sensitive coal-mine canaries makes them die in minutes from PTFE fumes.' },
      { id: 'q6', icon: '🦎',
        stem: 'A reptile owner has a leopard gecko that won\'t eat. Most likely first thing to check?',
        choices: ['Whether they\'re lonely', 'Husbandry — temperature gradient + UVB lighting + substrate', 'Whether they want a friend', 'Whether they need a bath'],
        correct: 1, why: 'Most pet-reptile illness is husbandry-driven. Wrong temperature → can\'t digest. Old or missing UVB → metabolic bone disease. Substrate-impaction risks. Always check husbandry before assuming disease.' },
      { id: 'q7', icon: '♿',
        stem: 'Under federal law (ADA), what\'s the SCIENTIFIC distinction between a service dog and an emotional support animal?',
        choices: ['Size of the animal', 'Service dog is task-trained for a disability; ESA provides comfort by presence (no task training)', 'ESA wears a vest; service dog doesn\'t', 'Service dogs are larger breeds'],
        correct: 1, why: 'A service dog is INDIVIDUALLY TRAINED to perform tasks for a person with a disability (mobility brace, medical alert, deep pressure, retrieval, etc.). An ESA provides comfort through presence — no specific tasks. ESAs are not service animals under the ADA.' },
      { id: 'q8', icon: '🥩',
        stem: 'Which of these foods is most universally toxic to dogs, cats, AND ferrets?',
        choices: ['Carrots', 'Bananas', 'Chocolate', 'Plain cooked chicken'],
        correct: 2, why: 'Theobromine + caffeine in chocolate are toxic across many mammals because they metabolize them slowly. Dogs are most affected; cats + ferrets vulnerable too. Dark chocolate is far worse than milk.' },
      { id: 'q9', icon: '🤰',
        stem: 'A pregnant person has an indoor cat. What does the science say about toxoplasmosis risk?',
        choices: ['Rehome the cat immediately', 'Indoor cats fed only commercial food are very low risk; pregnant person should avoid scooping (or wear gloves + scoop daily, since oocysts take 24+ hr to become infective)', 'Cat must be tested daily', 'No risk at all'],
        correct: 1, why: 'Toxoplasmosis is a real concern, but the risk from an indoor commercial-food-fed cat is low. CDC + ACOG guidance: someone else handles the litter, OR daily cleaning with gloves. Higher risks: undercooked meat, unwashed produce.' },
      { id: 'q10', icon: '🧬',
        stem: 'A "purebred" dog from a 200-year-old closed studbook is more likely to have which of the following compared to mixed-breed dogs?',
        choices: ['Stronger immune system', 'Concentrated genetic disorders (hip dysplasia, brachycephaly, etc.)', 'Longer lifespan automatically', 'Better behavior automatically'],
        correct: 1, why: 'Closed studbooks limit the gene pool. Selecting for extreme features (flat faces, certain proportions) concentrates problems. Reputable breeders screen for known conditions (OFA hips, cardiac, eyes), but the structural risks of pedigree breeding are real.' },
      { id: 'q11', icon: '🐈',
        stem: 'A friend says "outdoor cats are happier than indoor cats." What\'s the actual data?',
        choices: ['Outdoor cats live LONGER than indoor cats', 'Indoor cats live substantially longer on average; enrichment — not outdoor access — is what solves boredom', 'Lifespan is the same', 'Outdoor cats only kill rats'],
        correct: 1, why: 'Cats with outdoor access face traffic, predators, disease, and weather, and they die younger — that much is well established. The exact multiplier is not: the popular "12–18 years indoors vs 2–5 outdoors" contrast leans on feral-colony data rather than owned cats, so treat it as a rough illustration, not a measurement. Free-roaming cats also kill an estimated 1.3–4 billion birds per year in the US (Loss et al. 2013 — a wide range, mostly unowned cats). Indoor cats + environmental enrichment is the welfare-positive answer.' },
      { id: 'q12', icon: '🐰',
        stem: 'Your friend says "rabbits are easy starter pets for kids." Which is the MOST accurate response?',
        choices: ['Yes, hardy + easy', 'Rabbits are arguably the WORST starter pet — prey-animal stress, fragile GI, 8–12 yr lifespan, exotic-vet costs, dislike being held', 'Only large rabbits are hard', 'Only baby rabbits are hard'],
        correct: 1, why: 'House Rabbit Society advises against rabbits in homes with young children. Rabbits hide illness (prey instinct), need exotic vets (limited in rural Maine), and most don\'t enjoy handling.' },
      { id: 'q13', icon: '🐾',
        stem: 'During a tense interaction between two dogs, one yawns + licks her lips repeatedly. What\'s she communicating?',
        choices: ['She\'s hungry', 'She\'s sleepy', 'A "calming signal" — trying to defuse the social tension', 'She\'s about to bite'],
        correct: 2, why: 'Lip licking, yawning, head turning, and ground sniffing in a tense moment are appeasement / calming signals. Dogs use them to defuse. Recognizing them helps owners intervene before stacked stress becomes a bite.' },
      { id: 'q14', icon: '🦠',
        stem: 'Why does the CDC recommend NO reptiles in households with children under 5?',
        choices: ['Reptiles bite easily', 'Reptiles universally shed Salmonella', 'Reptiles need expensive vets', 'Children are allergic to scales'],
        correct: 1, why: 'Salmonella shedding is universal in reptiles + amphibians (no matter how clean they look). Young children don\'t reliably wash hands and have higher infection-severity risk. Same logic for immunocompromised + pregnant people.' },
      { id: 'q15', icon: '🌲',
        stem: 'Why do Maine vets push year-round tick prevention even in winter?',
        choices: ['Tradition', 'Adult deer ticks (Ixodes scapularis) are active any day above ~40°F — Maine has many such days even in January / February', 'Vets need year-round revenue', 'Lyme bacteria mutate in cold'],
        correct: 1, why: 'Adult Ixodes ticks emerge whenever temperatures briefly rise above ~40°F. Maine has plenty of warm days mid-winter. Year-round prevention has become standard for Maine dogs given Lyme + anaplasmosis density.' }
    ];

    // The authored bank put 73% of correct answers in slot 2 (measured
    // 0/11/4/0, slots 1 and 4 never) — passable by position. Rotate each
    // question ONCE here: renderQuiz re-reads QUIZ[qIdx] on every render,
    // so a random shuffle would deal new options mid-question. Grading is
    // by index, so `correct` is remapped with the choices; `why` is one
    // string. (The body-language quiz already shuffles at generation time
    // and is untouched.)
    (function () {
      for (var qi = 0; qi < QUIZ.length; qi++) {
        var q = QUIZ[qi];
        if (!q || !Array.isArray(q.choices) || q.choices.length < 2 || typeof q.correct !== 'number') continue;
        var n = q.choices.length;
        var shift = ((qi * 7) + 3) % n;
        if (shift === 0) continue;
        var moved = new Array(n);
        for (var i = 0; i < n; i++) moved[(i + shift) % n] = q.choices[i];
        q.choices = moved;
        q.correct = (q.correct + shift) % n;
      }
    })();

    function renderQuiz() {
      var qIdx = quizState.idx || 0;
      var done = qIdx >= QUIZ.length;
      if (done) {
        var score = quizState.score || 0;
        var pct = Math.round((score / QUIZ.length) * 100);
        var label = pct >= 90 ? 'Pet Science Pro' : pct >= 70 ? 'Pet Science Apprentice' : pct >= 50 ? 'Keep going' : 'Back to the source modules';
        if (pct >= 70) awardBadge('pets_quiz_pass', 'Pets Quiz Passed');
        if (pct >= 90) awardBadge('pets_quiz_ace', 'Pets Quiz Ace');
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('📝 Quiz — Results'),
          h('div', { style: { padding: 24, borderRadius: 14, background: T.card, border: '2px solid ' + T.accent, textAlign: 'center', marginBottom: 14 } },
            h('div', { style: { fontSize: 42, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } }, score + ' / ' + QUIZ.length),
            h('div', { style: { fontSize: 18, color: T.text, marginTop: 6 } }, pct + '%'),
            h('div', { style: { fontSize: 14, color: T.accentHi, fontWeight: 700, marginTop: 8 } }, label)),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { 'data-pets-focusable': true,
              onClick: function() { upd('quizState', { idx: 0, score: 0, answered: false, lastChoice: null }); petsAnnounce('Quiz reset'); },
              style: btn() }, '🔄 Try again'),
            h('button', { 'data-pets-focusable': true,
              onClick: function() { upd('view', 'menu'); }, style: btnPrimary() }, '← Back to menu')),
          footer());
      }
      var q = QUIZ[qIdx];
      return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
        backBar('📝 Quiz'),
        h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } },
          'Question ', h('strong', { style: { color: T.text } }, (qIdx + 1) + ' of ' + QUIZ.length),
          '  ·  Score: ', h('strong', { style: { color: T.accentHi } }, (quizState.score || 0))),
        h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 26 } }, q.icon),
            h('div', { style: { fontSize: 14, color: T.text, lineHeight: 1.55, fontWeight: 600 } }, q.stem)),
          q.choices.map(function(c, i) {
            var picked = quizState.lastChoice === i;
            var correct = q.correct === i;
            var bg = T.cardAlt, bd = T.border;
            if (quizState.answered) {
              if (correct) { bg = '#1a3320'; bd = T.ok; }
              else if (picked) { bg = '#3a1a1a'; bd = T.danger; }
            } else if (picked) { bg = T.cardAlt; bd = T.accentHi; }
            return h('button', { key: i, 'data-pets-focusable': true,
              disabled: quizState.answered,
              'aria-label': 'Choice ' + (i + 1) + ': ' + c + (quizState.answered && correct ? ' (correct)' : '') + (quizState.answered && picked && !correct ? ' (your answer, incorrect)' : ''),
              onClick: function() {
                if (quizState.answered) return;
                var isCorrect = i === q.correct;
                upd('quizState', { idx: qIdx, score: (quizState.score || 0) + (isCorrect ? 1 : 0), answered: true, lastChoice: i });
                petsAnnounce(isCorrect ? 'Correct!' : 'Not quite. ' + q.why);
              },
              style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: bg, border: '2px solid ' + bd, color: T.text, fontSize: 13, cursor: quizState.answered ? 'default' : 'pointer' } }, c);
          }),
          quizState.answered && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.accent } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, 'Why:'),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, q.why))),
        quizState.answered && h('button', { 'data-pets-focusable': true,
          onClick: function() { upd('quizState', { idx: qIdx + 1, score: quizState.score || 0, answered: false, lastChoice: null }); },
          style: btnPrimary({ width: '100%' }) }, qIdx + 1 >= QUIZ.length ? '🏁 See results' : 'Next question →'),
        footer());
    }

    // ─────────────────────────────────────────
    // RESOURCES
    // ─────────────────────────────────────────
    function renderResources() {
      var groups = [
        { title: '🩺 Veterinary medicine + welfare standards', items: [
          { name: 'AVMA — American Veterinary Medical Association', url: 'https://www.avma.org', desc: 'US veterinary professional body. Position statements, pet-care guidance.' },
          { name: 'AAFP — American Assoc. of Feline Practitioners', url: 'https://catvets.com', desc: 'Cat-specific clinical + welfare guidelines.' },
          { name: 'AAHA — Animal Hospital Assoc.', url: 'https://www.aaha.org', desc: 'Accredits ~12% of US vet hospitals; publishes pet-owner guidelines.' },
          { name: 'AAFCO — feed-control officials', url: 'https://www.aafco.org', desc: 'Pet-food nutrient profile standards.' }
        ]},
        { title: '🧠 Behavior + training', items: [
          { name: 'ASAB — Animal Behavior Society', url: 'https://www.animalbehaviorsociety.org', desc: 'Certifies CAAB/ACAAB animal behaviorists.' },
          { name: 'IAABC — International Assoc. of Animal Behavior Consultants', url: 'https://iaabc.org', desc: 'Behavior consultant certification.' },
          { name: 'CCPDT — Certification Council for Professional Dog Trainers', url: 'https://www.ccpdt.org', desc: 'CPDT-KA / CPDT-KSA dog-trainer certifications.' },
          { name: 'AVSAB — Veterinary Behavior position statements', url: 'https://avsab.org', desc: 'Position papers on dominance, punishment, choice in training.' },
          { name: 'Karen Pryor Academy', url: 'https://karenpryoracademy.com', desc: 'Clicker-training methodology + KPA-CTP credential.' }
        ]},
        { title: '♿ Service / ESA / therapy animals', items: [
          { name: 'IAADP — Intl. Assoc. of Assistance Dog Partners', url: 'https://iaadp.org', desc: 'Service-dog partners advocacy + standards.' },
          { name: 'ADI — Assistance Dogs International', url: 'https://assistancedogsinternational.org', desc: 'Accredits service-dog training programs.' },
          { name: 'Pet Partners — therapy animal teams', url: 'https://petpartners.org', desc: 'Largest US therapy-animal credentialing body.' },
          { name: 'ADA Service Animal FAQ (US DOJ)', url: 'https://www.ada.gov/topics/service-animals/', desc: 'Authoritative federal guidance on service-animal access.' }
        ]},
        { title: '🦠 Public health + zoonoses', items: [
          { name: 'CDC One Health', url: 'https://www.cdc.gov/onehealth', desc: 'Federal zoonoses + animal-human-environment health.' },
          { name: 'Maine CDC Vector-Borne Disease', url: 'https://www.maine.gov/dhhs/mecdc/infectious-disease/epi/vector-borne/', desc: 'Maine-specific Lyme + anaplasmosis surveillance.' },
          { name: 'ASPCA Animal Poison Control: (888) 426-4435', url: 'https://www.aspca.org/pet-care/animal-poison-control', desc: '$95 24/7 consult for suspected ingestions.' }
        ]},
        { title: '🐰 Species-specific welfare', items: [
          { name: 'House Rabbit Society', url: 'https://rabbit.org', desc: 'Definitive rabbit-welfare resource.' },
          { name: 'AAV — Assoc. of Avian Veterinarians', url: 'https://www.aav.org', desc: 'Pet-bird medicine + welfare.' },
          { name: 'ARAV — Reptile + Amphibian Vets', url: 'https://arav.org', desc: 'Reptile + amphibian medicine.' },
          { name: 'IFTA — Intl. Ferret Trainers Assoc.', url: 'https://www.ferret.org', desc: 'Ferret-specific welfare + behavior.' }
        ]},
        { title: '🌲 Maine animal welfare', items: [
          { name: 'Animal Refuge League of Greater Portland', url: 'https://arlgp.org', desc: 'Largest Maine open-admission shelter.' },
          { name: 'Bangor Humane Society', url: 'https://bangorhumane.org', desc: 'Eastern Maine shelter + wellness clinic.' },
          { name: 'Avian Haven (wild bird rescue)', url: 'https://www.avianhaven.org', desc: 'Wild-bird rehab center, Freedom ME.' },
          { name: 'Maine Veterinary Medical Assoc.', url: 'https://mvma.org', desc: 'State vet professional body.' },
          { name: 'Maine IFW Wildlife', url: 'https://www.maine.gov/ifw/', desc: 'Wildlife rehab permits + native species rules.' }
        ]}
      ];
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('📚 Resources'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
          'Every organization cited in this tool. Bookmark a few — these are the primary sources reputable pet-owner advice traces back to.'),
        groups.map(function(g, gi) {
          return h('div', { key: gi, style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, g.title),
            g.items.map(function(r, i) {
              return h('div', { key: i, style: { padding: '8px 0', borderBottom: i < g.items.length - 1 ? '1px solid ' + T.border : 'none' } },
                h('a', { href: r.url, target: '_blank', rel: 'noopener',
                  style: { color: T.accentHi, fontWeight: 700, fontSize: 13, textDecoration: 'underline' },
                  'aria-label': r.name + ' (opens in new tab)' }, r.name),
                h('div', { style: { fontSize: 11, color: T.muted, marginTop: 3, lineHeight: 1.5 } }, r.desc));
            }));
        }),
        footer());
    }

    // ─────────────────────────────────────────
    // TEACHER GUIDE
    // ─────────────────────────────────────────
    function renderTeacher() {
      var ngss = [
        { mod: 'Dogs / Cats / Small mammals / Birds / Reptiles', std: 'MS-LS1-4 (structure + function), HS-LS1 (structure + function in living systems)' },
        { mod: 'Domestication & Breeding', std: 'MS-LS3 (heredity), HS-LS3 (heredity), HS-LS4 (selection — both natural + artificial)' },
        { mod: 'Pet Training (applied)', std: 'MS-LS1-8 (sensory processing → memory → response), HS-LS1-3 (homeostasis + feedback)' },
        { mod: 'Nutrition Science', std: 'MS-LS1-7 (matter + energy in organisms), HS-LS1-6 (carbon-based molecules)' },
        { mod: 'Zoonoses', std: 'MS-LS2 (interdependent relationships), HS-LS2-7 (human impact)' },
        { mod: 'Service Animals', std: 'Cross-cutting: science + society + ethics + disability studies' }
      ];
      var prompts = [
        { topic: 'Dogs', items: [
          'If wolf packs are families and not status hierarchies, what does that change about how you\'d train a dog?',
          'Why do small dogs live longer than large dogs when across mammals it\'s usually the opposite?',
          'Belyaev\'s fox experiment showed tameness selection drags physical traits along. What does that tell us about why our dogs look the way they do?'
        ]},
        { topic: 'Cats', items: [
          'Cats can\'t make taurine. What does that tell you about whether a vegan diet is ethical for cats?',
          'Adult-cat meowing only happens at humans. What does that suggest about the evolution of domestication?',
          'Indoor cats live ~3× longer than outdoor cats AND outdoor cats kill billions of birds. What\'s the welfare-positive recommendation, and why is it controversial?'
        ]},
        { topic: 'Service Animals', items: [
          'Why is the legal distinction between service dog, ESA, and therapy animal scientifically meaningful — not just legal hairsplitting?',
          'How would you respond if a stranger reaches to pet a working service dog?',
          'Online "ESA letters" are a $200-million industry. What\'s the harm if they\'re fake?'
        ]},
        { topic: 'Pet Picker', items: [
          'Run the Pet Picker for your actual situation. What surprised you?',
          'Run it for "first apartment after college" vs "house with three young kids." How does the right pet shift?',
          'When is the honest answer "no pet right now"? What changes that?'
        ]},
        { topic: 'Maine angles', items: [
          'Why do Maine vets push year-round tick prevention even in winter?',
          'Why is the Maine Coon breed adapted the way it is?',
          'Where would you take an injured wild bird in Maine?'
        ]}
      ];
      var activities = [
        { name: 'Clicker training a stuffed animal', grade: 'K-5',
          what: 'Use a clicker + treats to "train" a stuffed dog: click when it\'s in the right pose, "treat" with a chip. Teaches the timing + mechanics of operant conditioning before live animals.', url: null },
        { name: 'Body-language flash cards', grade: '3-12',
          what: 'Print or draw 12 dog/cat body postures. Students sort into "happy / stressed / warning / neutral." Discuss what cue made them decide.', url: null },
        { name: 'Breed-trait heritability puzzle', grade: '6-12',
          what: 'Punnett-square exercise crossing two coat-color carriers. Apply to actual breed examples (Labrador yellow vs chocolate vs black).', url: null },
        { name: 'Pet-budget design', grade: '6-12',
          what: 'Use the Lifetime Cost Calc tile + a real Maine vet price list. Students design a complete first-year + emergency fund. Compare to a phone or sneaker budget.', url: null },
        { name: 'Zoonoses hand-washing experiment', grade: '3-8',
          what: 'Glo-Germ powder + black light. Show how poor handwashing leaves pet-handling residue everywhere.', url: 'https://www.cdc.gov/handwashing/' },
        { name: 'Shelter visit / read-to-shelter-cats', grade: 'K-12',
          what: 'Coordinate with Animal Refuge League of Greater Portland or your local Maine humane society. Most have K-12 ed programs.', url: 'https://arlgp.org/community/education/' }
      ];
      var pacing = [
        { label: '1-week unit', body: 'Day 1: Menu + Pet Picker. Day 2: pick 2 species deep-dives (jigsaw groups). Day 3: Pet Training (applied) + Body Language. Day 4: Zoonoses + Nutrition. Day 5: 15-Q quiz.' },
        { label: '2-week unit', body: 'Week 1 same as 1-week, slower. Week 2 adds Domestication & Breeding, Service Animals, Lifetime Cost, Take Action, Career Pathways.' },
        { label: 'Sub day', body: 'Body Language Decoder + Myths Busted + Quiz. Three modules students run independently. Print Pet Picker as a worksheet.' }
      ];
      return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
        backBar('🎓 Teacher Guide'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Resource page for educators. NGSS alignment per module, discussion prompts, hands-on activities, pacing options.')),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, overflowX: 'auto' } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📐 NGSS alignment'),
          h('table', { 'aria-label': 'NGSS standards alignment',
            style: { width: '100%', minWidth: 540, borderCollapse: 'collapse', fontSize: 12 } },
            h('thead', null,
              h('tr', { style: { background: T.cardAlt } },
                h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi } }, 'Module'),
                h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi } }, 'Standards'))),
            h('tbody', null,
              ngss.map(function(r, i) {
                return h('tr', { key: i, style: { background: i % 2 === 0 ? T.cardAlt : T.card, borderBottom: '1px solid ' + T.border } },
                  h('td', { style: { padding: '8px 10px', color: T.text, fontWeight: 600 } }, r.mod),
                  h('td', { style: { padding: '8px 10px', color: T.muted, fontFamily: 'monospace', fontSize: 11 } }, r.std));
              })))),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '💬 Discussion prompts'),
          prompts.map(function(p) {
            return h('div', { key: p.topic, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, p.topic),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
                p.items.map(function(q, i) { return h('li', { key: i, style: { marginBottom: 4 } }, q); })));
          })),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🛠️ Hands-on activities'),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            activities.map(function(a, i) {
              return h('div', { key: i, role: 'listitem',
                style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                  h('strong', { style: { color: T.accentHi, fontSize: 13 } }, a.name),
                  h('span', { style: { fontSize: 10, color: T.dim, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + T.border } }, 'Gr ' + a.grade)),
                h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, a.what),
                a.url && h('a', { href: a.url, target: '_blank', rel: 'noopener',
                  style: { color: T.link, fontSize: 11, textDecoration: 'underline' },
                  'aria-label': a.name + ' resource link (opens in new tab)' }, '→ Open resource'));
            }))),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🗓️ Pacing options'),
          pacing.map(function(p, i) {
            return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('strong', { style: { color: T.accentHi, fontSize: 13 } }, p.label),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginTop: 4 } }, p.body));
          })),
        footer());
    }

    // ─────────────────────────────────────────
    // LIFESPAN MATCH (net-new mini-game)
    // 10 species/breeds. Player picks the typical lifespan range from 5 buckets.
    // Surfaces the surprising spread — hamsters 2-3 yrs vs macaws 50-80 vs
    // Galápagos tortoises 100+. Useful pre-adoption to set expectations.
    // ─────────────────────────────────────────
    function renderLifespan() {
      var BUCKETS = [
        { id: 'b1', label: 'Under 3 years', color: '#dc2626', icon: '⏱️',
          def: 'Very short — most small rodents fall here. Plan for the loss; this is often a child\'s first death.' },
        { id: 'b2', label: '3–10 years', color: '#f97316', icon: '🪻',
          def: 'Short to medium. Rabbits, guinea pigs, ferrets, large-breed dogs. ~half a childhood.' },
        { id: 'b3', label: '10–20 years', color: '#22c55e', icon: '🌳',
          def: 'Medium-long. Average dogs + indoor cats. Outlasts most childhoods; will see your kid through college.' },
        { id: 'b4', label: '20–50 years', color: '#0ea5e9', icon: '🏛️',
          def: 'Long-lived. Cockatiels, mid-size parrots, ball pythons. Multi-decade commitment; plan for who inherits.' },
        { id: 'b5', label: '50+ years', color: '#7c3aed', icon: '👑',
          def: 'Very long-lived — outlives the owner. Macaws, large cockatoos, Galápagos tortoises. Generational pet; estate planning needed.' }
      ];
      var V = [
        { id: 1, species: 'Syrian (golden) hamster', icon: '🐹', correct: 'b1',
          why: 'Hamsters live 2–3 years. The shortest-lived common pet. Often a child\'s first experience with death; many parents underestimate how soon it happens. Buy from rescue if possible — pet-store rodents are often older than labeled.' },
        { id: 2, species: 'Indoor-only cat', icon: '🐈', correct: 'b3',
          why: '12–18 years indoors. Cats with outdoor access die younger — predation, traffic, and disease are the documented mechanisms, and ASPCA and AVMA both recommend indoor-only on that basis. The comparison figure you will see quoted (2–5 years outdoors) is rough and comes largely from feral-colony data, so lean on the mechanisms rather than a precise multiplier.' },
        { id: 3, species: 'Blue-and-gold macaw (parrot)', icon: '🦜', correct: 'b5',
          why: '50–80 years. Macaws and large cockatoos genuinely outlive most owners. Estate planning + designated successor caregiver is essential. Most parrot rescues are full because owners died first or could no longer care for them.' },
        { id: 4, species: 'Galápagos tortoise', icon: '🐢', correct: 'b5',
          why: '100+ years. Lonesome George (last Pinta tortoise) lived ~100. Multi-generational commitment — typically passed down or rehomed multiple times. Most US owners cannot legally own one without permits; commonly seen at zoos.' },
        { id: 5, species: 'Domestic ferret', icon: '🐾', correct: 'b2',
          why: '6–10 years. Adrenal disease + insulinoma are common late-life problems; budget $300+/year for senior ferret vet bills. Banned in California and Hawaii.' },
        { id: 6, species: 'Average medium-size dog (~50 lb)', icon: '🐕', correct: 'b3',
          why: '10–14 years. Inverse size rule: small dogs (Yorkies, Chihuahuas) live 14–18; large dogs (Mastiffs, Great Danes) often 7–10. Genetics + cancer rates explain most of the gap.' },
        { id: 7, species: 'Cockatiel', icon: '🐦', correct: 'b4',
          why: '15–25 years. Often surprises owners who expected 5–8 years like a finch. Cockatiels are still parrots and need parrot-level commitment + enrichment. Will outlast most childhood-to-college periods.' },
        { id: 8, species: 'Guinea pig', icon: '🐹', correct: 'b2',
          why: '5–8 years. Often kept in pairs (social animals — solo housing is welfare violation in some EU countries). Vitamin C deficiency (scurvy) is a common preventable cause of early death — same as humans, they cannot synthesize it.' },
        { id: 9, species: 'Ball python', icon: '🐍', correct: 'b4',
          why: '20–30 years in captivity. Ball pythons are the most common pet snake and a long commitment. Husbandry-driven mortality is high in inexperienced hands; respiratory infections + scale rot from improper humidity kill many young snakes.' },
        { id: 10, species: 'Goldfish (well-cared in proper tank)', icon: '🐠', correct: 'b3',
          why: '10–20 years in proper conditions (50+ gallon filtered tank, regular water changes). The "goldfish die in 6 months" stereotype is a husbandry failure, not a species lifespan. World record is 43 years. Bowls + neglected tanks shorten this dramatically.' }
      ];
      // Presentation-only lifespan ranges. Quiz answers and species coaching
      // remain in V/BUCKETS; this map only gives the visuals a shared scale.
      var LIFE_VISUALS = {
        1: { min: 2, max: 3, label: '2-3 years' },
        2: { min: 12, max: 18, label: '12-18 years' },
        3: { min: 50, max: 80, label: '50-80 years' },
        4: { min: 100, max: 100, label: '100+ years' },
        5: { min: 6, max: 10, label: '6-10 years' },
        6: { min: 10, max: 14, label: '10-14 years' },
        7: { min: 15, max: 25, label: '15-25 years' },
        8: { min: 5, max: 8, label: '5-8 years' },
        9: { min: 20, max: 30, label: '20-30 years' },
        10: { min: 10, max: 20, label: '10-20 years' }
      };

      var lsIdx = d.lsIdx == null ? -1 : d.lsIdx;
      var lsSeed = d.lsSeed || 1;
      var lsAns = !!d.lsAns;
      var lsPick = d.lsPick;
      var lsScore = d.lsScore || 0;
      var lsRounds = d.lsRounds || 0;
      var lsStreak = d.lsStreak || 0;
      var lsBest = d.lsBest || 0;
      var lsShown = d.lsShown || [];

      function bucketById(bucketId) {
        return BUCKETS.filter(function(bucket) { return bucket.id === bucketId; })[0];
      }
      function lifeShapeText(bucketId) {
        return ({ b1: '\u25cf', b2: '\u25a0', b3: '\u25c6', b4: '\u25b2', b5: '\u2605' })[bucketId] || '\u25cf';
      }
      function renderLifeStage(item, reveal) {
        var visual = LIFE_VISUALS[item.id];
        var bucket = bucketById(item.correct);
        var endPct = reveal ? Math.max(0, Math.min(100, visual.max)) : 100;
        var minPct = reveal ? Math.max(0, Math.min(100, visual.min)) : 0;
        var youngW = endPct * 0.18;
        var adultW = endPct * 0.54;
        var seniorW = endPct * 0.28;
        var timelineLabel = reveal
          ? item.species + ' has a typical lifespan of ' + visual.label + ' on this 0-to-100-year commitment scale. The colored span is divided into illustrative young, adult, and senior-care planning stages.'
          : 'The 0-to-100-year commitment scale for ' + item.species + ' is hidden until a lifespan range is selected.';
        var fill = reveal ? bucket.color : T.border;
        return h('div', { className: 'petslab-life-stage' },
          h('div', { className: 'petslab-life-stage-heading' },
            h('strong', null, reveal ? 'Typical commitment timeline' : 'Commitment timeline'),
            h('span', null, reveal ? visual.label + ' typical' : 'Pick a bucket to reveal the range')
          ),
          h('svg', {
            viewBox: '0 0 100 32',
            preserveAspectRatio: 'none',
            role: 'img',
            'aria-label': timelineLabel,
            focusable: 'false'
          },
            h('title', null, timelineLabel),
            h('rect', { x: 1, y: 8, width: 98, height: 16, rx: 8, fill: T.bg, stroke: T.border, strokeWidth: 0.7 }),
            h('rect', { x: 1, y: 9, width: youngW * 0.98, height: 14, rx: 7, fill: fill, opacity: reveal ? 0.42 : 0.18 }),
            h('rect', { x: 1 + youngW * 0.98, y: 9, width: adultW * 0.98, height: 14, fill: fill, opacity: reveal ? 0.68 : 0.28 }),
            h('rect', { x: 1 + (youngW + adultW) * 0.98, y: 9, width: seniorW * 0.98, height: 14, rx: 7, fill: fill, opacity: reveal ? 0.94 : 0.38 }),
            reveal && h('line', { x1: 1 + minPct * 0.98, y1: 5, x2: 1 + minPct * 0.98, y2: 27, stroke: '#f8fafc', strokeWidth: 0.8, strokeDasharray: '2 1' }),
            reveal && h('line', { x1: 1 + endPct * 0.98, y1: 4, x2: 1 + endPct * 0.98, y2: 28, stroke: '#f8fafc', strokeWidth: 1.2 })
          ),
          h('div', { className: 'petslab-life-stage-axis', 'aria-hidden': 'true' },
            h('span', null, '0 years'),
            h('span', null, '100+ years')
          ),
          h('div', { className: 'petslab-life-stage-key', 'aria-label': 'Illustrative life-stage key' },
            h('span', null, h('span', { 'aria-hidden': 'true' }, '\u25cf '), 'Young / settling in'),
            h('span', null, h('span', { 'aria-hidden': 'true' }, '\u25a0 '), 'Adult care years'),
            h('span', null, h('span', { 'aria-hidden': 'true' }, '\u25c6 '), 'Senior-care planning')
          ),
          h('p', { className: 'petslab-life-stage-note' },
            reveal
              ? 'The dashed line marks the lower end of the typical range; the solid line marks its upper end. Life-stage proportions are a planning guide, not veterinary age cutoffs.'
              : 'The life-stage pattern is illustrative. Its length unlocks after the choice so the visual does not give away the quiz answer.'
          )
        );
      }
      function renderSpeciesComparison() {
        return h('section', { className: 'petslab-life-comparison', 'aria-labelledby': 'petslab-life-comparison-title' },
          h('h4', { id: 'petslab-life-comparison-title' }, 'All species on one 100-year scale'),
          h('p', null, 'Compare the typical commitment length directly. Each color also has a distinct shape and written range.'),
          h('div', { className: 'petslab-life-stage-key', 'aria-label': 'Lifespan bucket legend' },
            BUCKETS.map(function(bucket) {
              return h('span', { key: 'legend-' + bucket.id, style: { color: bucket.color } },
                h('span', { className: 'petslab-life-bucket-mark', 'aria-hidden': 'true' }, lifeShapeText(bucket.id)),
                ' ' + bucket.label
              );
            })
          ),
          h('div', { className: 'petslab-life-compare-list', role: 'list' },
            V.map(function(item) {
              var visual = LIFE_VISUALS[item.id];
              var bucket = bucketById(item.correct);
              var minPct = Math.max(0, Math.min(100, visual.min));
              var endPct = Math.max(0, Math.min(100, visual.max));
              var rowLabel = item.species + ': ' + visual.label + ', in the ' + bucket.label + ' bucket, shown on a 0-to-100-year scale.';
              return h('div', { key: item.id, className: 'petslab-life-compare-row', role: 'listitem' },
                h('div', { className: 'petslab-life-compare-name' },
                  h('span', { 'aria-hidden': 'true' }, item.icon + ' '),
                  h('span', { className: 'petslab-life-bucket-mark', style: { color: bucket.color }, 'aria-hidden': 'true' }, lifeShapeText(bucket.id)),
                  ' ' + item.species
                ),
                h('div', { className: 'petslab-life-compare-track' },
                  h('svg', {
                    viewBox: '0 0 100 24',
                    preserveAspectRatio: 'none',
                    role: 'img',
                    'aria-label': rowLabel,
                    focusable: 'false'
                  },
                    h('title', null, rowLabel),
                    h('rect', { x: 1, y: 7, width: 98, height: 10, rx: 5, fill: T.bg, stroke: T.border, strokeWidth: 0.65 }),
                    h('rect', { x: 1, y: 8, width: Math.max(0.8, endPct * 0.98), height: 8, rx: 4, fill: bucket.color, opacity: 0.52 }),
                    h('rect', { x: 1 + minPct * 0.98, y: 8, width: Math.max(0.6, (endPct - minPct) * 0.98), height: 8, rx: 4, fill: bucket.color }),
                    h('line', { x1: 1 + endPct * 0.98, y1: 4, x2: 1 + endPct * 0.98, y2: 20, stroke: '#f8fafc', strokeWidth: 1.1 })
                  )
                ),
                h('span', { className: 'petslab-life-compare-range' }, visual.label)
              );
            })
          )
        );
      }

      function startLs() {
        var pool = [];
        for (var i = 0; i < V.length; i++) if (lsShown.indexOf(i) < 0) pool.push(i);
        if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); lsShown = []; }
        var seedNext = ((lsSeed * 16807 + 11) % 2147483647) || 7;
        var pick = pool[seedNext % pool.length];
        upd('lsSeed', seedNext);
        upd('lsIdx', pick);
        upd('lsAns', false);
        upd('lsPick', null);
        upd('lsShown', lsShown.concat([pick]));
      }
      function pickLs(bId) {
        if (lsAns) return;
        var v = V[lsIdx];
        var correct = bId === v.correct;
        var newScore = lsScore + (correct ? 1 : 0);
        var newStreak = correct ? (lsStreak + 1) : 0;
        var newBest = Math.max(lsBest, newStreak);
        upd('lsAns', true);
        upd('lsPick', bId);
        upd('lsScore', newScore);
        upd('lsRounds', lsRounds + 1);
        upd('lsStreak', newStreak);
        upd('lsBest', newBest);
      }

      if (lsIdx < 0) {
        return h('div', { className: 'petslab-life-view', style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('⏳ Lifespan Match'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 16, color: T.text } }, '⏳ 10 species/breeds — pick the typical lifespan range'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'For each species, pick the lifespan bucket from 5 options (under 3 yrs through 50+ yrs). Coaching after each pick names what makes this species fall in that range and what shortens or extends typical lifespan.')
          ),
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }, 'The five lifespan buckets'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
              BUCKETS.map(function(b) {
                return h('div', { key: b.id, style: { padding: '8px 10px', borderRadius: 8, background: b.color + '15', border: '1px solid ' + b.color + '55' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                    h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, b.icon),
                    h('span', { style: { color: b.color, fontWeight: 800, fontSize: 12 } }, b.label)
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } }, b.def)
                );
              })
            )
          ),
          h('button', { 'data-pets-focusable': true,
            onClick: startLs,
            style: { width: '100%', padding: '12px 18px', borderRadius: 10, border: 'none', background: T.accent, color: '#0f172a', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
          }, '⏳ Start — vignette 1 of 10')
        );
      }

      var v = V[lsIdx];
      var pickedCorrect = lsAns && lsPick === v.correct;
      var pct = lsRounds > 0 ? Math.round((lsScore / lsRounds) * 100) : 0;
      var allDone = lsShown.length >= V.length && lsAns;
      var correctBucket = BUCKETS.filter(function(b) { return b.id === v.correct; })[0];
      var pickedBucket = lsPick ? BUCKETS.filter(function(b) { return b.id === lsPick; })[0] : null;
      var correctAnswerLabel = v.id === 7
        ? correctBucket.label + ' commitment bucket (cockatiels commonly span 15–25 years)'
        : correctBucket.label;

      return h('div', { className: 'petslab-life-view', style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('⏳ Lifespan Match'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12, color: T.dim, marginBottom: 12 } },
          h('span', null, 'Vignette ', h('strong', { style: { color: T.text } }, lsShown.length)),
          h('span', null, 'Score ', h('strong', { style: { color: T.ok } }, lsScore + ' / ' + lsRounds)),
          lsRounds > 0 && h('span', null, 'Accuracy ', h('strong', { style: { color: T.link } }, pct + '%')),
          h('span', null, 'Streak ', h('strong', { style: { color: T.warm } }, lsStreak)),
          h('span', null, 'Best ', h('strong', { style: { color: T.accentHi } }, lsBest))
        ),
        // Vignette card
        h('section', { style: { padding: 14, borderRadius: 12, background: T.card, border: '2px solid ' + T.accent + '88', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
          h('div', { style: { fontSize: 40, flexShrink: 0 }, 'aria-hidden': 'true' }, v.icon),
          h('div', { style: { flex: 1, minWidth: 220 } },
            h('div', { style: { fontSize: 11, color: T.accentHi, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, 'Vignette ' + lsShown.length + ' of ' + V.length),
            h('div', { style: { fontSize: 18, fontWeight: 800, color: T.text } }, v.species)
          ),
          renderLifeStage(v, lsAns)
        ),
        // 5 picker buttons
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }, role: 'radiogroup', 'aria-label': 'Pick the lifespan range' },
          BUCKETS.map(function(b) {
            var picked = lsAns && lsPick === b.id;
            var isRight = lsAns && b.id === v.correct;
            var bg, border, color;
            if (lsAns) {
              if (isRight) { bg = 'rgba(132,204,22,0.18)'; border = T.ok; color = '#bbf7d0'; }
              else if (picked) { bg = 'rgba(220,38,38,0.18)'; border = T.danger; color = '#fecaca'; }
              else { bg = T.cardAlt; border = T.border; color = T.dim; }
            } else {
              bg = b.color + '15'; border = b.color + '55'; color = T.text;
            }
            return h('button', { key: b.id, role: 'radio',
              'aria-checked': picked ? 'true' : 'false',
              'aria-label': b.label,
              disabled: lsAns,
              'data-pets-focusable': true,
              onClick: function() { pickLs(b.id); },
              style: { padding: '10px 12px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: lsAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 64, transition: 'all 0.15s' }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
                h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, b.icon),
                h('span', { style: { color: lsAns ? color : b.color, fontSize: 12, fontWeight: 800 } }, b.label)
              ),
              h('div', { style: { fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: lsAns ? color : T.muted } }, b.def)
            );
          })
        ),
        // Feedback
        lsAns && h('section', {
          style: {
            marginTop: 12, padding: '12px 14px', borderRadius: 10,
            background: pickedCorrect ? 'rgba(132,204,22,0.10)' : 'rgba(220,38,38,0.10)',
            border: '1px solid ' + (pickedCorrect ? 'rgba(132,204,22,0.45)' : 'rgba(220,38,38,0.40)')
          }
        },
          h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 6, color: pickedCorrect ? '#bef264' : '#fca5a5' } },
            pickedCorrect
              ? '✅ Correct — ' + correctAnswerLabel
              : '❌ The right range is ' + correctAnswerLabel + (pickedBucket ? ' (you picked ' + pickedBucket.label + ')' : '')
          ),
          h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 12, lineHeight: 1.55 } }, v.why),
          allDone
            ? h('div', { style: { padding: 10, borderRadius: 8, background: T.card, border: '1px solid ' + T.accent } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: T.accentHi, marginBottom: 4 } }, '🏆 All 10 species complete'),
                h('div', { style: { color: T.text, fontSize: 12, lineHeight: 1.5 } },
                  'Final: ', h('strong', null, lsScore + ' / ' + V.length + ' (' + Math.round((lsScore / V.length) * 100) + '%)'),
                  lsScore === V.length ? ' — every lifespan correctly identified. Use this when families ask "what pet should we adopt?"' :
                  lsScore >= 8 ? ' — strong lifespan intuition. The most-confused pair is usually goldfish (10–20 yr in proper tanks) vs cockatiel (15–25 yr) — both surprise people who expected shorter spans.' :
                  lsScore >= 6 ? ' — solid baseline. The four reflexes worth building: rodents = under 3, parrots = 15+ to 80, large dogs lose to small dogs by ~5 years, indoor cats outlive outdoor cats by 4–7×.' :
                  ' — these matter at adoption. Re-read the rationales on misses, then retake. Lifespan-mismatch is the #1 cause of pet surrender after the first year.'
                ),
                renderSpeciesComparison(),
                h('button', { 'data-pets-focusable': true,
                  onClick: function() { upd('lsIdx', -1); upd('lsShown', []); upd('lsScore', 0); upd('lsRounds', 0); upd('lsStreak', 0); },
                  style: { marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: T.accent, color: '#0f172a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                }, '🔄 Restart')
              )
            : h('button', { 'data-pets-focusable': true,
                onClick: startLs,
                style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: T.accent, color: '#0f172a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, '➡️ Next species')
        ),
        footer()
      );
    }

    // ─────────────────────────────────────────
    // FAMOUS ANIMALS IN SCIENCE
    // ─────────────────────────────────────────
    function renderFamous() {
      var visible = famousFilter === 'all'
        ? FAMOUS_ANIMALS
        : FAMOUS_ANIMALS.filter(function(a) { return a.tag === famousFilter; });
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('🌟 Famous Animals in Science'),
        h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
          '10 animals you\'ll encounter in textbooks, museums, and culture. Each shaped how we understand animal cognition, training, service work, or human-animal bonds.'),
        h('div', { role: 'group', 'aria-label': 'Filter famous animals by category',
          style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
          FAMOUS_FILTERS.map(function(f) {
            var active = famousFilter === f.id;
            return h('button', { key: f.id, 'data-pets-focusable': true,
              'aria-pressed': active ? 'true' : 'false',
              onClick: function() { upd('famousFilter', f.id); petsAnnounce('Filtered to ' + f.label); },
              style: btn({
                background: active ? T.accent : T.card,
                color: active ? '#1f1612' : T.text,
                border: '1px solid ' + (active ? T.accent : T.border),
                padding: '6px 12px', fontSize: 12
              })
            }, f.label);
          })),
        h('div', { role: 'list',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 } },
          visible.length === 0
            ? [h('div', { key: 'empty', style: { padding: 24, color: T.dim, fontStyle: 'italic', textAlign: 'center', gridColumn: '1 / -1' } }, 'No animals in this filter.')]
            : visible.map(function(a) {
                return h('div', { key: a.id, role: 'listitem',
                  style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, a.icon),
                    h('h3', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, a.name)),
                  h('div', { style: { fontSize: 11, color: T.warm, fontFamily: 'monospace', marginBottom: 8 } }, a.where),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, a.story));
              })),
        h('div', { style: { marginTop: 14, fontSize: 11, color: T.dim, textAlign: 'center' } },
          'Showing ' + visible.length + ' of ' + FAMOUS_ANIMALS.length + ' animals.'),
        footer());
    }

    // ─────────────────────────────────────────
    // AI PRACTICE — design scenarios + Gemini critique with local fallback
    // ─────────────────────────────────────────
    function renderAiPractice() {
      var callGemini = ctx.callGemini || null;
      var scenario = AI_SCENARIOS.filter(function(s) { return s.id === aiScenarioId; })[0] || null;

      function selectScenario(id) {
        updMulti({ aiScenarioId: id, aiResponse: '', aiCritique: null });
        petsAnnounce('Scenario loaded.');
      }

      // Words that appear in almost any fluent English sentence. The old check
      // counted them, and a flat "2 keyword hits = satisfied" bar meant common
      // words alone could tick a criterion. Measured against all 30 rubric
      // lines: content-free filler prose scored 3 checkmarks, and a good
      // answer to ONE scenario scored a checkmark on 4 of the 5 OTHER
      // scenarios it had nothing to do with. Both are now 0.
      var RUBRIC_STOPWORDS = {
        that: 1, this: 1, with: 1, they: 1, them: 1, their: 1, from: 1, have: 1,
        been: 1, were: 1, what: 1, when: 1, then: 1, than: 1, into: 1, only: 1,
        also: 1, some: 1, more: 1, most: 1, much: 1, many: 1, will: 1, would: 1,
        should: 1, could: 1, does: 1, done: 1, your: 1, yours: 1, about: 1,
        which: 1, while: 1, where: 1, there: 1, here: 1, just: 1, even: 1,
        like: 1, well: 1, good: 1, best: 1, thing: 1, things: 1, other: 1,
        being: 1, both: 1, each: 1, over: 1, because: 1, before: 1, after: 1,
        still: 1, very: 1, sometimes: 1, possible: 1, actually: 1, really: 1
      };

      // Offline fallback. This is word matching, not comprehension, so it is
      // built to under-claim rather than over-claim: stop words stripped, the
      // bar scales with how many content words the criterion actually has,
      // and the result is three-state so a partial hit never renders as a
      // checkmark. It also shows its own hit counts, which makes the
      // crudeness legible instead of merely asserted.
      function localRubricCheck() {
        var resp = ' ' + String(aiResponse).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
        var checks = scenario.rubric.map(function(r) {
          var seen = {};
          (r.toLowerCase().match(/[a-z][a-z\-]{3,}/g) || []).forEach(function(w) {
            if (!RUBRIC_STOPWORDS[w]) seen[w] = 1;
          });
          var keys = Object.keys(seen);
          var hits = keys.filter(function(k) {
            // Match at a word start on a 6-char stem so vaccination/vaccinated
            // count as the same idea, while "have" cannot match "behave".
            return resp.indexOf(' ' + k.slice(0, 6)) !== -1;
          }).length;
          var need = Math.max(2, Math.ceil(keys.length / 3));
          return { hits: hits, need: need, total: keys.length, msg: r };
        });
        var lines = checks.map(function(c) {
          var tag = c.hits >= c.need ? '[likely covered]' : (c.hits > 0 ? '[partly covered]' : '[not covered]');
          return tag + ' (' + c.hits + ' of ' + c.total + ' key words) — ' + c.msg;
        });
        var summary = 'OFFLINE RUBRIC CHECK — this is word matching, not understanding.\n\n' +
          'It looks for each rubric line\'s key words in what you wrote. It cannot tell whether your reasoning is sound, ' +
          'and it cannot tell a correct answer from an incorrect one that happens to use the same vocabulary. ' +
          '"Likely covered" means you used related words — NOT that you got it right.\n\n' +
          lines.join('\n\n') +
          '\n\nUse this to find criteria you did not address at all. For judgement on the ones you did address, ask a teacher — or try again when AI is available.';
        updMulti({ aiCritique: { text: summary, source: 'local' }, aiLoadingCritique: false });
        // Earned for doing the work, not for having a network. Awarding this
        // only on the AI path made the badge unreachable in an offline
        // classroom, with no way for the student to find out why.
        awardBadge('pets_ai_designer', 'AI Practice (wrote and checked a response)');
        petsAnnounce('Offline rubric check ready.');
      }

      function getCritique() {
        if (!scenario || !aiResponse.trim()) return;
        if (!callGemini) { localRubricCheck(); return; }
        upd('aiLoadingCritique', true);
        petsAnnounce('Getting critique...');
        var prompt = 'You are a veterinary + animal-welfare educator reviewing a student\'s response to a real-world pet-care scenario.\n\n' +
          'SCENARIO:\n' + scenario.prompt + '\n\n' +
          'STUDENT RESPONSE:\n' + aiResponse + '\n\n' +
          'RUBRIC (criteria a sound response hits):\n' + scenario.rubric.map(function(r, i) { return (i + 1) + '. ' + r; }).join('\n') + '\n\n' +
          'GROUND-TRUTH FACTS (do not deviate; if student response conflicts, flag):\n' +
          AI_GROUND_TRUTH.map(function(p, i) { return (i + 1) + '. ' + p; }).join('\n') + '\n\n' +
          'CRITIQUE specifically:\n' +
          '1. Which rubric items did they hit? (cite numbers)\n' +
          '2. Which did they miss?\n' +
          '3. Any factual errors against the ground-truth list?\n' +
          '4. One concrete suggestion to strengthen the response.\n\n' +
          'Tone: warm, specific, like a school counselor + vet hybrid. 5–7 sentences. ' +
          'IMPORTANT: never recommend specific medications, dosages, or veterinary procedures — refer to a veterinarian. ' +
          'End with: "Educational only — for medical decisions see your veterinarian."';
        callGemini(prompt, { maxOutputTokens: 500 })
          .then(function(text) {
            var clean = String(text || '').trim();
            if (!clean) throw new Error('Empty response');
            updMulti({ aiCritique: { text: clean, source: 'ai' }, aiLoadingCritique: false });
            awardBadge('pets_ai_designer', 'AI Practice (got a response critiqued)');
            petsAnnounce('Critique ready.');
          })
          .catch(function(e) {
            console.warn('[Pets] AI critique failed; falling back.', e);
            // Actually fall back. This used to toast "try the local check"
            // while offering no such control: when callGemini EXISTS the only
            // button reads "Get AI critique", so the advice pointed at a
            // button that is not on the screen and the student dead-ended.
            addToast('AI unavailable — ran the offline check instead.');
            localRubricCheck();
          });
      }

      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🤖 AI Practice'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Pick a scenario. Write 4–8 sentences walking a friend (or yourself) through what you\'d actually do. ',
            h('strong', { style: { color: T.accentHi } }, 'AI critiques your reasoning'),
            ' against a welfare-science rubric and the same ground-truth facts taught throughout this lab.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.text } }, '📋 Pick a scenario'),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 } },
            AI_SCENARIOS.map(function(s) {
              var picked = aiScenarioId === s.id;
              return h('div', { key: s.id, role: 'listitem' }, h('button', { 'data-pets-focusable': true,
                'aria-label': s.title + (picked ? ' (selected)' : ''),
                'aria-pressed': picked ? 'true' : 'false',
                onClick: function() { selectScenario(s.id); },
                style: btn({
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  padding: 10, minHeight: 60,
                  background: picked ? T.cardAlt : T.card,
                  borderColor: picked ? T.accent : T.border
                })
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, s.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 13 } }, s.title))));
            }))),
        scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, scenario.icon + ' ' + scenario.title),
          h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.6 } }, scenario.prompt),
          h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.5 } },
            h('strong', { style: { color: T.warm } }, '💡 Hint: '), scenario.hint)),
        scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('label', { htmlFor: 'pets-ai-response', style: { display: 'block', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 } },
            '✏️ Your response (4–8 sentences)'),
          h('textarea', { id: 'pets-ai-response', 'data-pets-focusable': true,
            value: aiResponse,
            onChange: function(e) { upd('aiResponse', e.target.value); },
            placeholder: 'Walk through what you\'d do or say. What do you ask first? What do you recommend? What would change your recommendation?',
            'aria-label': 'Your response',
            rows: 6,
            style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' } }),
          h('div', { style: { marginTop: 6, fontSize: 11, color: T.dim, marginBottom: 10 } },
            aiResponse.length, ' characters. Aim for ~300–800.'),
          h('button', { 'data-pets-focusable': true,
            'aria-label': aiLoadingCritique ? 'Getting critique' : 'Get critique of your response',
            'aria-busy': aiLoadingCritique ? 'true' : 'false',
            disabled: aiLoadingCritique || !aiResponse.trim(),
            onClick: getCritique,
            style: btnPrimary({ opacity: (aiLoadingCritique || !aiResponse.trim()) ? 0.6 : 1 })
          }, aiLoadingCritique ? '⏳ Critiquing...' : (callGemini ? '🎓 Get AI critique' : '📋 Local rubric check'))),
        aiCritique && h('div', { style: { padding: 14, borderRadius: 10, background: '#3a2a1a', border: '1px solid ' + T.accent, color: '#fef3e2', marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, '🎓 Critique'),
          h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 } }, aiCritique.text),
          h('div', { style: { marginTop: 10, fontSize: 10, opacity: 0.75, fontStyle: 'italic' } },
            aiCritique.source === 'ai' ? 'Critique from AI; constrained against this lab\'s ground-truth.' : 'Offline word-match check — it did not read your reasoning, only your vocabulary.')),
        footer());
    }

    // ─────────────────────────────────────────
    // DIAGRAMS — labeled SVG schematics
    // ─────────────────────────────────────────
    var DIAGRAM_TABS = [
      { id: 'skull', icon: '💀', label: 'Dog vs cat skull' },
      { id: 'airsac', icon: '🦜', label: 'Bird respiratory air sacs' },
      { id: 'operant', icon: '🔁', label: 'Operant conditioning loop' },
      { id: 'bodylang', icon: '🐕', label: 'Dog body language ethogram' }
    ];

    function svgSkullCompare() {
      var titleText = 'Dog and cat skull comparison';
      var descText = 'Responsive side-by-side comparison of dog and cat skull anatomy. The dog has a longer muzzle and flat-topped grinding molars. The cat has proportionally larger eye sockets, long canines, and blade-like carnassial teeth for shearing rather than grinding.';

      function skullDefs(suffix) {
        return h('defs', null,
          h('pattern', { id: 'pets-skull-dog' + suffix, width: 14, height: 14, patternUnits: 'userSpaceOnUse' },
            h('rect', { width: 14, height: 14, fill: '#3b2a1f' }),
            h('path', { d: 'M 0 14 L 14 0 M -4 4 L 4 -4 M 10 18 L 18 10', stroke: '#fbbf24', strokeWidth: 1.2, opacity: 0.16 })
          ),
          h('pattern', { id: 'pets-skull-cat' + suffix, width: 12, height: 12, patternUnits: 'userSpaceOnUse' },
            h('rect', { width: 12, height: 12, fill: '#24362c' }),
            h('circle', { cx: 3, cy: 3, r: 1.4, fill: '#86efac', opacity: 0.22 }),
            h('circle', { cx: 9, cy: 9, r: 1.4, fill: '#86efac', opacity: 0.22 })
          )
        );
      }

      function drawSkull(kind, x, y, scale) {
        var dog = kind === 'dog';
        var accent = dog ? '#fbbf24' : '#86efac';
        var skullPath = dog
          ? 'M 20 105 Q 30 42 104 34 Q 170 22 230 53 L 272 75 Q 286 91 271 112 L 229 119 L 209 143 L 151 147 L 91 136 L 35 124 Z'
          : 'M 45 103 Q 48 42 116 31 Q 181 24 226 57 L 251 77 Q 263 96 246 113 L 211 121 L 191 144 L 129 146 L 78 134 L 51 119 Z';
        return h('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + scale + ')' },
          h('ellipse', { cx: 151, cy: 151, rx: dog ? 135 : 112, ry: 10, fill: '#0b0a09', opacity: 0.42 }),
          h('path', { d: skullPath, fill: '#c7b79e', stroke: accent, strokeWidth: 3, strokeLinejoin: 'round' }),
          h('path', { d: dog ? 'M 65 118 Q 141 139 236 116' : 'M 79 119 Q 145 139 215 117', fill: 'none', stroke: '#705f4d', strokeWidth: 4 }),
          h('ellipse', { cx: dog ? 139 : 151, cy: 79, rx: dog ? 25 : 34, ry: dog ? 22 : 31, fill: '#181210', stroke: accent, strokeWidth: 2.5 }),
          h('path', { d: dog ? 'M 52 100 Q 25 95 19 107 Q 27 119 55 115 Z' : 'M 69 99 Q 45 95 40 106 Q 48 117 72 113 Z', fill: '#5a4939' }),
          dog
            ? h('g', null,
                [0, 1, 2, 3].map(function(i) {
                  return h('path', { key: 'dog-molar-' + i, d: 'M ' + (178 + i * 20) + ' 116 L ' + (178 + i * 20) + ' 136 L ' + (193 + i * 20) + ' 136 L ' + (193 + i * 20) + ' 116 Z', fill: '#fff8e7', stroke: '#5b4937', strokeWidth: 1.5 });
                }),
                h('path', { d: 'M 157 113 L 164 146 L 174 116 Z', fill: '#fff8e7', stroke: '#5b4937', strokeWidth: 1.5 })
              )
            : h('g', null,
                h('path', { d: 'M 150 111 L 158 149 L 170 113 Z', fill: '#fff8e7', stroke: '#5b4937', strokeWidth: 1.5 }),
                h('path', { d: 'M 190 115 L 198 138 L 207 116 Z M 210 116 L 216 136 L 224 116 Z', fill: '#fff8e7', stroke: '#5b4937', strokeWidth: 1.5 })
              ),
          h('path', { d: dog ? 'M 96 54 Q 126 34 163 38' : 'M 112 48 Q 148 27 184 43', fill: 'none', stroke: '#efe3cc', strokeWidth: 6, opacity: 0.62, strokeLinecap: 'round' })
        );
      }

      function cueRow(cue, x, y, narrow) {
        return h('g', { key: cue.mark + cue.label },
          h('rect', { x: x, y: y - (narrow ? 17 : 14), width: narrow ? 29 : 24, height: narrow ? 29 : 24, rx: cue.mark === '◆' ? 4 : 12, fill: '#181210', stroke: cue.color, strokeWidth: 2 }),
          h('text', { x: x + (narrow ? 14.5 : 12), y: y + (narrow ? 5 : 4), textAnchor: 'middle', fill: cue.color, fontSize: narrow ? 17 : 13, fontWeight: 900 }, cue.mark),
          h('text', { x: x + (narrow ? 39 : 34), y: y, fill: '#fef3e2', fontSize: narrow ? 16 : 12, fontWeight: 800 }, cue.label),
          h('text', { x: x + (narrow ? 39 : 34), y: y + (narrow ? 19 : 15), fill: '#c8b4a2', fontSize: narrow ? 16 : 11.5 }, cue.detail)
        );
      }

      var dogCues = [
        { mark: '■', label: 'Flat-topped molars', detail: 'crush and grind some plant matter', color: '#fbbf24' },
        { mark: '◆', label: 'Longer muzzle', detail: 'more room for a mixed tooth toolkit', color: '#fbbf24' },
        { mark: '●', label: 'Smaller eye socket ratio', detail: 'compared with the cat skull', color: '#fbbf24' }
      ];
      var catCues = [
        { mark: '▲', label: 'Blade-like carnassials', detail: 'slice meat; no flat grinding surface', color: '#86efac' },
        { mark: '◆', label: 'Short rounded skull', detail: 'compact jaw built around shearing', color: '#86efac' },
        { mark: '●', label: 'Larger eye socket ratio', detail: 'supports low-light hunting anatomy', color: '#86efac' }
      ];

      function skullCard(kind, x, y, width, height, narrow, suffix) {
        var dog = kind === 'dog';
        var accent = dog ? '#fbbf24' : '#86efac';
        var cues = dog ? dogCues : catCues;
        var title = dog ? 'DOG — flexible tooth toolkit' : 'CAT — obligate carnivore';
        var drawScale = narrow ? 0.94 : 1.04;
        return h('g', { key: kind },
          h('rect', { x: x, y: y, width: width, height: height, rx: 14, fill: 'url(#pets-skull-' + kind + suffix + ')', stroke: accent, strokeWidth: 2 }),
          h('text', { x: x + 18, y: y + (narrow ? 29 : 27), fill: accent, fontSize: narrow ? 18 : 15, fontWeight: 900 }, title),
          drawSkull(kind, x + (narrow ? 28 : 43), y + 43, drawScale),
          cues.map(function(cue, i) {
            return cueRow(cue, x + 18, y + (narrow ? 244 : 226) + i * (narrow ? 55 : 43), narrow);
          })
        );
      }

      function skullSvg(narrow) {
        var suffix = narrow ? '-narrow' : '-wide';
        var W = narrow ? 360 : 840;
        var H = narrow ? 942 : 500;
        var titleId = narrow ? 'svg-skull-mobile-title' : 'svg-skull-title';
        var descId = narrow ? 'svg-skull-mobile-desc' : 'svg-skull-desc';
        return h('svg', {
          className: narrow ? 'petslab-diagram-narrow' : 'petslab-diagram-wide',
          viewBox: '0 0 ' + W + ' ' + H,
          role: 'img', 'aria-labelledby': titleId + ' ' + descId,
          preserveAspectRatio: 'xMidYMid meet',
          style: { background: '#181210', borderRadius: 8 }
        },
          h('title', { id: titleId }, titleText),
          h('desc', { id: descId }, descText),
          skullDefs(suffix),
          h('rect', { x: 0, y: 0, width: W, height: H, rx: 12, fill: '#181210' }),
          h('text', { x: W / 2, y: narrow ? 28 : 27, textAnchor: 'middle', fill: '#fef3e2', fontSize: 18, fontWeight: 900 }, 'Dog and cat skulls reveal diet'),
          narrow
            ? h('g', null,
                h('text', { x: W / 2, y: 50, textAnchor: 'middle', fill: '#c8b4a2', fontSize: 16 }, 'Compare tooth shape and eye-socket proportion'),
                h('text', { x: W / 2, y: 70, textAnchor: 'middle', fill: '#c8b4a2', fontSize: 16 }, '— not just overall skull size')
              )
            : h('text', { x: W / 2, y: 49, textAnchor: 'middle', fill: '#c8b4a2', fontSize: 12 }, 'Compare tooth SHAPE and eye-socket proportion — not just skull size'),
          narrow
            ? h('g', null,
                skullCard('dog', 12, 86, 336, 380, true, suffix),
                skullCard('cat', 12, 478, 336, 380, true, suffix)
              )
            : h('g', null,
                skullCard('dog', 14, 66, 397, 365, false, suffix),
                skullCard('cat', 429, 66, 397, 365, false, suffix)
              ),
          narrow
            ? h('g', null,
                h('rect', { x: 12, y: 872, width: 336, height: 58, rx: 18, fill: '#2d2019', stroke: '#e8d5b7', strokeWidth: 1.5 }),
                h('text', { x: W / 2, y: 895, textAnchor: 'middle', fill: '#fef3e2', fontSize: 16, fontWeight: 800 }, 'Grinding widens diet; shearing'),
                h('text', { x: W / 2, y: 917, textAnchor: 'middle', fill: '#fef3e2', fontSize: 16, fontWeight: 800 }, 'reveals obligate carnivory.')
              )
            : h('g', null,
                h('rect', { x: 145, y: 444, width: 550, height: 38, rx: 18, fill: '#2d2019', stroke: '#e8d5b7', strokeWidth: 1.5 }),
                h('text', { x: W / 2, y: 469, textAnchor: 'middle', fill: '#fef3e2', fontSize: 12.5, fontWeight: 800 }, 'Grinding surfaces widen diet; shearing blades reveal obligate carnivory.')
              )
        );
      }

      return h('div', { className: 'petslab-diagram-responsive-art' },
        skullSvg(false),
        skullSvg(true)
      );
    }
    function svgAirSac() {
      var titleText = 'Bird respiratory air sac system';
      var descText = 'Schematic of bird respiratory anatomy: 9 air sacs, two-cycle one-way airflow through lungs. Air enters via trachea, fills posterior sacs first (cycle 1), passes through parabronchi (oxygen exchange), then to anterior sacs (cycle 2), exits via trachea. Far more efficient than mammalian tidal-flow lungs.';
      var subtitleText = '9 air sacs · two-cycle one-way airflow · ~2× more efficient than mammals';
      var cycleOneText = 'FIRST BREATH: fresh air → posterior sacs → lung';
      var cycleTwoText = 'SECOND BREATH: lung → anterior sacs → out';
      var warningText = '⚠ This efficiency is why birds die from PTFE / smoke / aerosols in MINUTES.';

      function airDefs(suffix) {
        var colors = ['#fbbf24', '#86efac', '#7dd3fc', '#c4b5fd'];
        return h('defs', null,
          colors.map(function(color, i) {
            return h('marker', {
              key: 'marker-' + i,
              id: 'pets-air-arrow-' + (i + 1) + suffix,
              viewBox: '0 0 10 10', refX: 8.5, refY: 5,
              markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse'
            }, h('path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: color }));
          }),
          h('pattern', { id: 'pets-air-posterior' + suffix, width: 10, height: 10, patternUnits: 'userSpaceOnUse' },
            h('rect', { width: 10, height: 10, fill: '#4a3517' }),
            h('circle', { cx: 3, cy: 3, r: 1.7, fill: '#fbbf24' }),
            h('circle', { cx: 8, cy: 8, r: 1.2, fill: '#fde68a' })
          ),
          h('pattern', { id: 'pets-air-anterior' + suffix, width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' },
            h('rect', { width: 9, height: 9, fill: '#17374a' }),
            h('rect', { width: 3, height: 9, fill: '#7dd3fc', opacity: 0.8 })
          ),
          h('pattern', { id: 'pets-air-lung' + suffix, width: 8, height: 8, patternUnits: 'userSpaceOnUse' },
            h('rect', { width: 8, height: 8, fill: '#244530' }),
            h('path', { d: 'M 0 8 L 8 0 M -2 2 L 2 -2 M 6 10 L 10 6', stroke: '#86efac', strokeWidth: 1.4, opacity: 0.8 })
          )
        );
      }

      function flowPath(d, phase, suffix, color, dash) {
        return h('path', {
          className: 'petslab-diagram-flow',
          d: d, fill: 'none', stroke: color, strokeWidth: 5,
          strokeDasharray: dash, strokeLinecap: 'round', strokeLinejoin: 'round',
          markerEnd: 'url(#pets-air-arrow-' + phase + suffix + ')',
          vectorEffect: 'non-scaling-stroke'
        });
      }

      function phaseBadge(x, y, number, color) {
        return h('g', { transform: 'translate(' + x + ' ' + y + ')' },
          h('circle', { cx: 0, cy: 0, r: 13, fill: '#181210', stroke: color, strokeWidth: 2.5 }),
          h('text', { x: 0, y: 5, textAnchor: 'middle', fill: '#fff8e7', fontSize: 13, fontWeight: 950 }, String(number))
        );
      }

      function desktopAirSac() {
        var suffix = '-wide';
        return h('svg', {
          className: 'petslab-diagram-wide',
          viewBox: '0 0 760 520',
          role: 'img', 'aria-labelledby': 'svg-airsac-title svg-airsac-desc',
          preserveAspectRatio: 'xMidYMid meet',
          style: { background: '#181210', borderRadius: 8 }
        },
          h('title', { id: 'svg-airsac-title' }, titleText),
          h('desc', { id: 'svg-airsac-desc' }, descText),
          airDefs(suffix),
          h('rect', { x: 0, y: 0, width: 760, height: 520, rx: 12, fill: '#181210' }),
          h('text', { x: 380, y: 30, fill: '#fef3e2', fontSize: 18, textAnchor: 'middle', fontWeight: 800 }, 'Bird respiratory system'),
          h('text', { x: 380, y: 52, fill: '#c8b4a2', fontSize: 13, textAnchor: 'middle' }, subtitleText),
          // Simplified perched bird profile and airway.
          h('path', {
            d: 'M 82 245 Q 105 142 226 129 Q 350 113 479 161 Q 540 183 576 215 L 606 205 L 632 216 L 609 232 Q 594 300 522 335 Q 429 371 287 351 Q 151 336 95 291 Q 75 272 82 245 Z',
            fill: '#2d2018', stroke: '#d7aa62', strokeWidth: 2.5
          }),
          h('circle', { cx: 576, cy: 180, r: 45, fill: '#3a291d', stroke: '#d7aa62', strokeWidth: 2 }),
          h('path', { d: 'M 607 178 L 652 190 L 609 201 Z', fill: '#d7aa62', stroke: '#f6d59a', strokeWidth: 1.5 }),
          h('circle', { cx: 588, cy: 167, r: 5.5, fill: '#111827' }),
          h('circle', { cx: 590, cy: 165, r: 1.6, fill: '#fff8e7' }),
          h('path', { d: 'M 583 204 Q 603 157 626 112', stroke: '#d9eff7', strokeWidth: 8, fill: 'none', strokeLinecap: 'round' }),
          h('path', { d: 'M 583 204 Q 603 157 626 112', stroke: '#315b78', strokeWidth: 2, fill: 'none', strokeDasharray: '4 5' }),
          h('text', { x: 650, y: 108, fill: '#d9eff7', fontSize: 13, fontWeight: 800 }, 'Trachea'),
          // Four posterior sacs: paired posterior thoracic + abdominal.
          [[213, 252, 38, 29], [168, 294, 35, 27], [243, 316, 40, 25], [300, 286, 30, 23]].map(function(sac, i) {
            return h('ellipse', {
              key: 'posterior-' + i, cx: sac[0], cy: sac[1], rx: sac[2], ry: sac[3],
              fill: 'url(#pets-air-posterior' + suffix + ')', stroke: '#fbbf24', strokeWidth: 2
            });
          }),
          // Five anterior sacs: paired cervical/anterior thoracic + clavicular.
          [[475, 205, 28, 21], [523, 232, 30, 23], [492, 274, 34, 24], [440, 178, 24, 18], [536, 178, 22, 17]].map(function(sac, i) {
            return h('ellipse', {
              key: 'anterior-' + i, cx: sac[0], cy: sac[1], rx: sac[2], ry: sac[3],
              fill: 'url(#pets-air-anterior' + suffix + ')', stroke: '#7dd3fc', strokeWidth: 2
            });
          }),
          h('rect', { x: 335, y: 218, width: 104, height: 54, rx: 11, fill: 'url(#pets-air-lung' + suffix + ')', stroke: '#86efac', strokeWidth: 2.5 }),
          h('path', { d: 'M 347 230 H 427 M 347 242 H 427 M 347 254 H 427', stroke: '#d9f7df', strokeWidth: 1.5, opacity: 0.78 }),
          h('text', { x: 387, y: 244, fill: '#f2fff4', fontSize: 12, textAnchor: 'middle', fontWeight: 900 }, 'Lung'),
          h('text', { x: 387, y: 259, fill: '#d9f7df', fontSize: 10, textAnchor: 'middle' }, '(parabronchi)'),
          h('g', null,
            h('rect', { x: 126, y: 200, width: 128, height: 24, rx: 12, fill: '#181210', stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('text', { x: 190, y: 216, fill: '#fde68a', fontSize: 11, textAnchor: 'middle', fontWeight: 850 }, 'Posterior group · 4 sacs'),
            h('rect', { x: 457, y: 304, width: 128, height: 24, rx: 12, fill: '#181210', stroke: '#7dd3fc', strokeWidth: 1.5 }),
            h('text', { x: 521, y: 320, fill: '#bae6fd', fontSize: 11, textAnchor: 'middle', fontWeight: 850 }, 'Anterior group · 5 sacs')
          ),
          // Four numbered, directional phases trace two complete breaths.
          flowPath('M 681 87 Q 645 91 625 116 Q 587 171 561 210 Q 479 322 268 309', 1, suffix, '#fbbf24', '15 7'),
          flowPath('M 246 281 Q 294 249 342 246', 2, suffix, '#86efac', '5 5'),
          flowPath('M 432 239 Q 465 218 500 218', 3, suffix, '#7dd3fc', '12 5 2 5'),
          flowPath('M 515 192 Q 557 163 591 135 Q 626 103 678 79', 4, suffix, '#c4b5fd', '2 7'),
          phaseBadge(574, 250, 1, '#fbbf24'),
          phaseBadge(302, 257, 2, '#86efac'),
          phaseBadge(466, 238, 3, '#7dd3fc'),
          phaseBadge(601, 122, 4, '#c4b5fd'),
          h('g', { transform: 'translate(37 378)' },
            [
              ['1', 'Inhale 1', 'fresh air → posterior sacs', '#fbbf24', '15 7'],
              ['2', 'Exhale 1', 'posterior sacs → lung', '#86efac', '5 5'],
              ['3', 'Inhale 2', 'lung → anterior sacs', '#7dd3fc', '12 5 2 5'],
              ['4', 'Exhale 2', 'anterior sacs → out', '#c4b5fd', '2 7']
            ].map(function(item, i) {
              var x = i * 178;
              return h('g', { key: item[0], transform: 'translate(' + x + ' 0)' },
                h('line', { x1: 0, y1: 4, x2: 34, y2: 4, stroke: item[3], strokeWidth: 4, strokeDasharray: item[4], strokeLinecap: 'round' }),
                h('text', { x: 43, y: 8, fill: '#fff3e2', fontSize: 11, fontWeight: 900 }, item[0] + ' ' + item[1]),
                h('text', { x: 0, y: 27, fill: '#c8b4a2', fontSize: 10 }, item[2])
              );
            })
          ),
          h('text', { x: 380, y: 438, fill: '#fbbf24', fontSize: 12, textAnchor: 'middle', fontWeight: 800 }, cycleOneText),
          h('text', { x: 380, y: 460, fill: '#7dd3fc', fontSize: 12, textAnchor: 'middle', fontWeight: 800 }, cycleTwoText),
          h('text', { x: 380, y: 501, fill: '#fb923c', fontSize: 13, textAnchor: 'middle', fontWeight: 850 }, warningText)
        );
      }

      function narrowAirSac() {
        var suffix = '-narrow';
        return h('svg', {
          className: 'petslab-diagram-narrow',
          viewBox: '0 0 360 780',
          role: 'img', 'aria-labelledby': 'svg-airsac-mobile-title svg-airsac-mobile-desc',
          preserveAspectRatio: 'xMidYMid meet',
          style: { background: '#181210', borderRadius: 8 }
        },
          h('title', { id: 'svg-airsac-mobile-title' }, titleText),
          h('desc', { id: 'svg-airsac-mobile-desc' }, descText),
          airDefs(suffix),
          h('rect', { x: 0, y: 0, width: 360, height: 780, rx: 12, fill: '#181210' }),
          h('text', { x: 180, y: 28, fill: '#fef3e2', fontSize: 17, textAnchor: 'middle', fontWeight: 850 }, 'Bird respiratory system'),
          h('text', { x: 180, y: 49, fill: '#c8b4a2', fontSize: 10.5, textAnchor: 'middle' }, subtitleText),
          h('path', {
            d: 'M 26 215 Q 45 104 142 92 Q 236 81 298 142 Q 327 172 321 232 Q 313 302 242 340 Q 157 380 70 335 Q 20 309 26 215 Z',
            fill: '#2d2018', stroke: '#d7aa62', strokeWidth: 2.5
          }),
          h('circle', { cx: 290, cy: 128, r: 34, fill: '#3a291d', stroke: '#d7aa62', strokeWidth: 2 }),
          h('path', { d: 'M 315 127 L 347 138 L 316 148 Z', fill: '#d7aa62' }),
          h('circle', { cx: 299, cy: 118, r: 4.5, fill: '#111827' }),
          h('path', { d: 'M 285 157 Q 304 116 318 83', stroke: '#d9eff7', strokeWidth: 7, fill: 'none', strokeLinecap: 'round' }),
          h('text', { x: 320, y: 78, fill: '#d9eff7', fontSize: 11, textAnchor: 'end', fontWeight: 800 }, 'Trachea'),
          [[93, 240, 27, 22], [67, 276, 25, 20], [116, 304, 29, 20], [146, 267, 23, 18]].map(function(sac, i) {
            return h('ellipse', {
              key: 'posterior-mobile-' + i, cx: sac[0], cy: sac[1], rx: sac[2], ry: sac[3],
              fill: 'url(#pets-air-posterior' + suffix + ')', stroke: '#fbbf24', strokeWidth: 2
            });
          }),
          [[240, 181, 23, 17], [274, 207, 24, 18], [249, 246, 26, 19], [215, 153, 19, 14], [278, 157, 18, 13]].map(function(sac, i) {
            return h('ellipse', {
              key: 'anterior-mobile-' + i, cx: sac[0], cy: sac[1], rx: sac[2], ry: sac[3],
              fill: 'url(#pets-air-anterior' + suffix + ')', stroke: '#7dd3fc', strokeWidth: 2
            });
          }),
          h('rect', { x: 160, y: 206, width: 72, height: 43, rx: 9, fill: 'url(#pets-air-lung' + suffix + ')', stroke: '#86efac', strokeWidth: 2 }),
          h('text', { x: 196, y: 224, fill: '#f2fff4', fontSize: 10.5, textAnchor: 'middle', fontWeight: 900 }, 'Lung'),
          h('text', { x: 196, y: 238, fill: '#d9f7df', fontSize: 8.5, textAnchor: 'middle' }, '(parabronchi)'),
          flowPath('M 338 79 Q 316 87 303 112 Q 278 174 244 235 Q 200 309 116 303', 1, suffix, '#fbbf24', '15 7'),
          flowPath('M 125 269 Q 147 242 165 232', 2, suffix, '#86efac', '5 5'),
          flowPath('M 226 221 Q 243 202 257 198', 3, suffix, '#7dd3fc', '12 5 2 5'),
          flowPath('M 264 173 Q 290 140 305 107 Q 318 82 342 70', 4, suffix, '#c4b5fd', '2 7'),
          phaseBadge(202, 296, 1, '#fbbf24'),
          phaseBadge(148, 248, 2, '#86efac'),
          phaseBadge(241, 220, 3, '#7dd3fc'),
          phaseBadge(303, 110, 4, '#c4b5fd'),
          h('rect', { x: 28, y: 344, width: 130, height: 24, rx: 12, fill: '#181210', stroke: '#fbbf24', strokeWidth: 1.5 }),
          h('text', { x: 93, y: 360, fill: '#fde68a', fontSize: 10.5, textAnchor: 'middle', fontWeight: 850 }, 'Posterior · 4 sacs'),
          h('rect', { x: 202, y: 344, width: 130, height: 24, rx: 12, fill: '#181210', stroke: '#7dd3fc', strokeWidth: 1.5 }),
          h('text', { x: 267, y: 360, fill: '#bae6fd', fontSize: 10.5, textAnchor: 'middle', fontWeight: 850 }, 'Anterior · 5 sacs'),
          h('g', { transform: 'translate(16 395)' },
            [
              ['1', 'Inhale 1', 'fresh air → posterior sacs', '#fbbf24', '15 7'],
              ['2', 'Exhale 1', 'posterior sacs → lung', '#86efac', '5 5'],
              ['3', 'Inhale 2', 'lung → anterior sacs', '#7dd3fc', '12 5 2 5'],
              ['4', 'Exhale 2', 'anterior sacs → out', '#c4b5fd', '2 7']
            ].map(function(item, i) {
              var y = i * 58;
              return h('g', { key: item[0], transform: 'translate(0 ' + y + ')' },
                h('rect', { x: 0, y: 0, width: 328, height: 48, rx: 10, fill: '#241a15', stroke: item[3], strokeWidth: 1.5 }),
                h('circle', { cx: 22, cy: 24, r: 13, fill: '#181210', stroke: item[3], strokeWidth: 2 }),
                h('text', { x: 22, y: 29, textAnchor: 'middle', fill: '#fff8e7', fontSize: 12, fontWeight: 950 }, item[0]),
                h('text', { x: 45, y: 20, fill: '#fff3e2', fontSize: 11.5, fontWeight: 900 }, item[1]),
                h('text', { x: 45, y: 36, fill: '#d5c0ad', fontSize: 10.5 }, item[2])
              );
            })
          ),
          h('text', { x: 180, y: 652, fill: '#fbbf24', fontSize: 10.5, textAnchor: 'middle', fontWeight: 800 }, cycleOneText),
          h('text', { x: 180, y: 678, fill: '#7dd3fc', fontSize: 10.5, textAnchor: 'middle', fontWeight: 800 },
            h('tspan', { x: 180, dy: 0 }, 'CYCLE 2 (exhale): posterior → lung'),
            h('tspan', { x: 180, dy: 15 }, '→ anterior (blue) → out')
          ),
          h('text', { x: 180, y: 744, fill: '#fb923c', fontSize: 10.5, textAnchor: 'middle', fontWeight: 850 },
            h('tspan', { x: 180, dy: 0 }, '⚠ This efficiency is why birds die from'),
            h('tspan', { x: 180, dy: 15 }, 'PTFE / smoke / aerosols in MINUTES.')
          )
        );
      }

      return h('div', { className: 'petslab-diagram-responsive-art' },
        desktopAirSac(),
        narrowAirSac()
      );
    }
    function svgOperantLoop() {
      var titleText = 'Operant conditioning loop';
      var descText = 'Responsive three-step operant-conditioning diagram. Step 1 is an antecedent cue: the trainer says sit. Step 2 is the behavior: the dog sits. Step 3 is the consequence: a treat and praise follow. The feedback arrow shows that consequences change how likely the behavior is next time. Reinforcement increases behavior; punishment decreases it.';

      var steps = [
        { id: 'cue', number: '1', mark: '●', title: 'ANTECEDENT', subtitle: 'Cue or setting', example: 'Trainer says “sit”', color: '#7dd3fc' },
        { id: 'behavior', number: '2', mark: '■', title: 'BEHAVIOR', subtitle: 'Observable action', example: 'Dog puts rear on floor', color: '#fbbf24' },
        { id: 'consequence', number: '3', mark: '◆', title: 'CONSEQUENCE', subtitle: 'What follows', example: 'Treat + praise arrive', color: '#86efac' }
      ];

      function operantDefs(suffix) {
        return h('defs', null,
          h('marker', {
            id: 'pets-operant-arrow' + suffix,
            viewBox: '0 0 10 10', refX: 8.5, refY: 5,
            markerWidth: 8, markerHeight: 8, orient: 'auto-start-reverse'
          }, h('path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: '#fef3e2' })),
          steps.map(function(step) {
            return h('pattern', { key: step.id, id: 'pets-operant-' + step.id + suffix, width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: step.id === 'behavior' ? 'rotate(35)' : null },
              h('rect', { width: 14, height: 14, fill: '#2d2019' }),
              step.id === 'cue'
                ? h('circle', { cx: 4, cy: 4, r: 1.5, fill: step.color, opacity: 0.2 })
                : step.id === 'behavior'
                  ? h('rect', { width: 3, height: 14, fill: step.color, opacity: 0.14 })
                  : h('path', { d: 'M 0 7 L 7 0 L 14 7 L 7 14 Z', fill: 'none', stroke: step.color, strokeWidth: 1, opacity: 0.16 })
            );
          })
        );
      }

      function stepIcon(id, x, y, scale) {
        if (id === 'cue') {
          return h('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + scale + ')' },
            h('path', { d: 'M 10 58 Q 25 31 50 42 L 74 55 L 67 72 L 39 61 Q 26 74 10 58 Z', fill: '#d7a979', stroke: '#2b1b14', strokeWidth: 2 }),
            h('rect', { x: 50, y: 2, width: 62, height: 34, rx: 12, fill: '#172033', stroke: '#7dd3fc', strokeWidth: 2 }),
            h('path', { d: 'M 65 36 L 58 48 L 80 36', fill: '#172033', stroke: '#7dd3fc', strokeWidth: 2 }),
            h('text', { x: 81, y: 25, textAnchor: 'middle', fill: '#fef3e2', fontSize: 16, fontWeight: 900 }, 'SIT')
          );
        }
        if (id === 'behavior') {
          return h('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + scale + ')' },
            h('ellipse', { cx: 57, cy: 76, rx: 48, ry: 7, fill: '#0b0a09', opacity: 0.38 }),
            h('ellipse', { cx: 59, cy: 48, rx: 35, ry: 27, fill: '#c98a47', stroke: '#2b1b14', strokeWidth: 2 }),
            h('circle', { cx: 28, cy: 25, r: 20, fill: '#d99a55', stroke: '#2b1b14', strokeWidth: 2 }),
            h('path', { d: 'M 18 11 L 10 -8 L 29 8 Z M 34 8 L 49 -7 L 48 18 Z', fill: '#8d542d', stroke: '#2b1b14', strokeWidth: 1.5 }),
            h('path', { d: 'M 45 66 L 39 78 M 67 66 L 72 78 M 84 47 Q 110 29 112 49', fill: 'none', stroke: '#a96731', strokeWidth: 10, strokeLinecap: 'round' }),
            h('circle', { cx: 23, cy: 23, r: 2.5, fill: '#2b1b14' })
          );
        }
        return h('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + scale + ')' },
          h('path', { d: 'M 5 55 Q 29 29 55 44 L 82 56 L 74 74 L 45 62 Q 26 77 5 55 Z', fill: '#d7a979', stroke: '#2b1b14', strokeWidth: 2 }),
          h('path', { className: 'petslab-body-motion--lift', d: 'M 54 39 Q 69 18 81 4', fill: 'none', stroke: '#fbbf24', strokeWidth: 3, strokeDasharray: '5 4' }),
          h('circle', { cx: 83, cy: 2, r: 9, fill: '#a35b24', stroke: '#fde68a', strokeWidth: 2 }),
          h('path', { d: 'M 97 21 C 109 5 128 13 128 29 C 128 45 110 53 97 66 C 84 53 66 45 66 29 C 66 13 85 5 97 21 Z', transform: 'scale(.48) translate(105 14)', fill: '#86efac', opacity: 0.9 })
        );
      }

      function stepCard(step, x, y, width, height, narrow, suffix) {
        return h('g', { key: step.id },
          h('rect', { x: x, y: y, width: width, height: height, rx: 14, fill: 'url(#pets-operant-' + step.id + suffix + ')', stroke: step.color, strokeWidth: 2 }),
          h('circle', { cx: x + (narrow ? 28 : 25), cy: y + (narrow ? 28 : 25), r: narrow ? 17 : 15, fill: '#181210', stroke: step.color, strokeWidth: 2.5 }),
          h('text', { x: x + (narrow ? 28 : 25), y: y + (narrow ? 34 : 30), textAnchor: 'middle', fill: '#fff8e7', fontSize: narrow ? 18 : 14, fontWeight: 900 }, step.number),
          h('text', { x: x + (narrow ? 54 : 47), y: y + (narrow ? 27 : 24), fill: step.color, fontSize: narrow ? 17 : 13.5, fontWeight: 900 }, step.mark + ' ' + step.title),
          h('text', { x: x + (narrow ? 54 : 47), y: y + (narrow ? 49 : 43), fill: '#fef3e2', fontSize: narrow ? 16 : 12, fontWeight: 700 }, step.subtitle),
          h('text', { x: x + (narrow ? 22 : 18), y: y + height - (narrow ? 19 : 16), fill: '#c8b4a2', fontSize: narrow ? 16 : 11.5, fontStyle: 'italic' }, step.example),
          stepIcon(step.id, x + width - (narrow ? 128 : 107), y + (narrow ? 38 : 46), narrow ? 0.82 : 0.7)
        );
      }

      function effectBox(x, y, width, title, detail, mark, color, narrow) {
        return h('g', null,
          h('rect', { x: x, y: y, width: width, height: narrow ? 78 : 72, rx: 12, fill: '#241a16', stroke: color, strokeWidth: 2 }),
          h('text', { x: x + 17, y: y + (narrow ? 29 : 27), fill: color, fontSize: narrow ? 17 : 13, fontWeight: 900 }, mark + ' ' + title),
          h('text', { x: x + 17, y: y + (narrow ? 55 : 51), fill: '#fef3e2', fontSize: narrow ? 16 : 12 }, detail)
        );
      }

      function operantSvg(narrow) {
        var suffix = narrow ? '-narrow' : '-wide';
        var W = narrow ? 360 : 840;
        var H = narrow ? 890 : 500;
        var titleId = narrow ? 'svg-operant-mobile-title' : 'svg-operant-title';
        var descId = narrow ? 'svg-operant-mobile-desc' : 'svg-operant-desc';
        var arrowId = 'url(#pets-operant-arrow' + suffix + ')';
        return h('svg', {
          className: narrow ? 'petslab-diagram-narrow' : 'petslab-diagram-wide',
          viewBox: '0 0 ' + W + ' ' + H,
          role: 'img', 'aria-labelledby': titleId + ' ' + descId,
          preserveAspectRatio: 'xMidYMid meet',
          style: { background: '#181210', borderRadius: 8 }
        },
          h('title', { id: titleId }, titleText),
          h('desc', { id: descId }, descText),
          operantDefs(suffix),
          h('rect', { x: 0, y: 0, width: W, height: H, rx: 12, fill: '#181210' }),
          h('text', { x: W / 2, y: narrow ? 28 : 27, textAnchor: 'middle', fill: '#fef3e2', fontSize: 18, fontWeight: 900 }, 'Operant conditioning loop'),
          h('text', { x: W / 2, y: narrow ? 50 : 49, textAnchor: 'middle', fill: '#c8b4a2', fontSize: narrow ? 16 : 12 }, 'Cue → action → consequence'),
          narrow
            ? h('g', null,
                stepCard(steps[0], 16, 66, 328, 140, true, suffix),
                stepCard(steps[1], 16, 236, 328, 140, true, suffix),
                stepCard(steps[2], 16, 406, 328, 140, true, suffix),
                h('path', { className: 'petslab-diagram-flow', d: 'M 180 208 L 180 230', fill: 'none', stroke: '#fef3e2', strokeWidth: 4, strokeDasharray: '7 5', markerEnd: arrowId }),
                h('path', { className: 'petslab-diagram-flow', d: 'M 180 378 L 180 400', fill: 'none', stroke: '#fef3e2', strokeWidth: 4, strokeDasharray: '7 5', markerEnd: arrowId }),
                h('path', { className: 'petslab-diagram-flow', d: 'M 329 520 C 354 520 354 82 329 82', fill: 'none', stroke: '#fb923c', strokeWidth: 3, strokeDasharray: '8 6', markerEnd: arrowId }),
                h('text', { x: 180, y: 574, textAnchor: 'middle', fill: '#fb923c', fontSize: 16, fontWeight: 800 }, '↺ CONSEQUENCE SHAPES NEXT TRY'),
                effectBox(16, 604, 328, 'REINFORCEMENT', 'Behavior becomes more likely next time', '↑', '#86efac', true),
                effectBox(16, 698, 328, 'PUNISHMENT', 'Behavior becomes less likely next time', '↓', '#fca5a5', true)
              )
            : h('g', null,
                stepCard(steps[0], 16, 78, 250, 178, false, suffix),
                stepCard(steps[1], 295, 78, 250, 178, false, suffix),
                stepCard(steps[2], 574, 78, 250, 178, false, suffix),
                h('path', { className: 'petslab-diagram-flow', d: 'M 268 167 L 288 167', fill: 'none', stroke: '#fef3e2', strokeWidth: 4, strokeDasharray: '7 5', markerEnd: arrowId }),
                h('path', { className: 'petslab-diagram-flow', d: 'M 547 167 L 567 167', fill: 'none', stroke: '#fef3e2', strokeWidth: 4, strokeDasharray: '7 5', markerEnd: arrowId }),
                h('path', { className: 'petslab-diagram-flow', d: 'M 699 262 Q 699 325 420 325 Q 141 325 141 262', fill: 'none', stroke: '#fb923c', strokeWidth: 3, strokeDasharray: '8 6', markerEnd: arrowId }),
                h('text', { x: 420, y: 314, textAnchor: 'middle', fill: '#fb923c', fontSize: 12, fontWeight: 800 }, 'CONSEQUENCE CHANGES THE NEXT TRY'),
                effectBox(126, 354, 280, 'REINFORCEMENT', 'Behavior becomes more likely next time', '↑', '#86efac', false),
                effectBox(434, 354, 280, 'PUNISHMENT', 'Behavior becomes less likely next time', '↓', '#fca5a5', false)
              ),
          narrow
            ? h('g', null,
                h('text', { x: W / 2, y: 846, textAnchor: 'middle', fill: '#fef3e2', fontSize: 16, fontWeight: 800 }, 'Reward is one reinforcer.'),
                h('text', { x: W / 2, y: 870, textAnchor: 'middle', fill: '#fef3e2', fontSize: 16, fontWeight: 800 }, 'The test: did behavior increase?')
              )
            : h('text', { x: W / 2, y: 465, textAnchor: 'middle', fill: '#fef3e2', fontSize: 12, fontWeight: 800 }, 'Reward is one reinforcer. The defining test is whether behavior increases.')
        );
      }

      return h('div', { className: 'petslab-diagram-responsive-art' },
        operantSvg(false),
        operantSvg(true)
      );
    }
    function svgEthogram() {
      var titleText = 'Dog body language ethogram';
      var descText = 'Reading dog body language: simplified ethogram showing relaxed, alert, fearful, and warning postures via tail position, ear position, body stance, and facial expression.';
      var states = [
        { id: 'relaxed', number: '1', color: '#86efac', title: '✓ RELAXED + happy', posture: 'LOOSE',
          cues: ['• Loose, wiggly body', '• Soft eyes (almond-shaped)', '• Open, slightly hanging mouth', '• Tail mid-height, loose wag', '• Ears in neutral position'],
          action: 'Safe to greet → ask handler first' },
        { id: 'alert', number: '2', color: '#fbbf24', title: '⚠ ALERT / aroused', posture: 'STILL',
          cues: ['• Body still + forward', '• Eyes fixed on something', '• Ears pricked forward', '• Tail high, can be fast wag', '• Closed mouth'],
          action: 'Pause + assess, do NOT approach' },
        { id: 'fearful', number: '3', color: '#fb923c', title: '⚠ FEARFUL / appeasing', posture: 'LOW',
          cues: ['• Low body / tucked posture', '• "Whale eye" — whites showing', '• Ears flattened back', '• Tail tucked', '• Lip-licking, yawning, paw-lift'],
          action: 'Give space — do NOT push interaction' },
        { id: 'warning', number: '4', color: '#fca5a5', title: '🛑 WARNING — back off NOW', posture: 'STIFF',
          cues: ['• Stiff body, weight forward', '• Hard, direct stare', '• Closed mouth → showing teeth', '• Tail high + slow stiff wag', '• Low growl, raised hackles'],
          action: 'A bite is the next step. Slowly create distance.' }
      ];
      var poses = {
        relaxed: { bodyY: 60, bodyRy: 28, headX: 132, headY: 48, tail: 'M 42 58 Q 7 42 16 22', ear: 'neutral', mouth: 'open', eye: 'soft', legs: 'normal' },
        alert: { bodyY: 57, bodyRy: 26, headX: 135, headY: 40, tail: 'M 41 53 Q 13 22 18 2', ear: 'up', mouth: 'closed', eye: 'fixed', legs: 'stiff' },
        fearful: { bodyY: 76, bodyRy: 22, headX: 131, headY: 65, tail: 'M 39 75 Q 4 91 36 101 Q 54 99 51 84', ear: 'back', mouth: 'frown', eye: 'whale', legs: 'crouch' },
        warning: { bodyY: 59, bodyRy: 26, headX: 140, headY: 42, tail: 'M 41 53 L 13 12', ear: 'up', mouth: 'teeth', eye: 'hard', legs: 'forward' }
      };

      function ethogramDefs(suffix) {
        return h('defs', null,
          h('pattern', { id: 'pets-ethogram-relaxed' + suffix, width: 16, height: 16, patternUnits: 'userSpaceOnUse' },
            h('rect', { width: 16, height: 16, fill: '#1a3320' }),
            h('circle', { cx: 4, cy: 4, r: 1.5, fill: '#86efac', opacity: 0.22 }),
            h('circle', { cx: 12, cy: 12, r: 1.5, fill: '#86efac', opacity: 0.22 })
          ),
          h('pattern', { id: 'pets-ethogram-alert' + suffix, width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' },
            h('rect', { width: 14, height: 14, fill: '#3a2a1a' }),
            h('rect', { width: 3, height: 14, fill: '#fbbf24', opacity: 0.1 })
          ),
          h('pattern', { id: 'pets-ethogram-fearful' + suffix, width: 18, height: 12, patternUnits: 'userSpaceOnUse' },
            h('rect', { width: 18, height: 12, fill: '#3a1f10' }),
            h('path', { d: 'M 0 7 Q 4 2 9 7 Q 14 12 18 7', fill: 'none', stroke: '#fb923c', strokeWidth: 1, opacity: 0.17 })
          ),
          h('pattern', { id: 'pets-ethogram-warning' + suffix, width: 14, height: 14, patternUnits: 'userSpaceOnUse' },
            h('rect', { width: 14, height: 14, fill: '#3a1010' }),
            h('path', { d: 'M 0 0 L 14 14 M 14 0 L 0 14', stroke: '#fca5a5', strokeWidth: 1, opacity: 0.13 })
          )
        );
      }

      function dogEars(kind, hx, hy) {
        if (kind === 'up') {
          return h('g', null,
            h('path', { d: 'M ' + (hx - 21) + ' ' + (hy - 15) + ' L ' + (hx - 15) + ' ' + (hy - 42) + ' L ' + (hx - 4) + ' ' + (hy - 17) + ' Z', fill: '#8f542a', stroke: '#f6e0c3', strokeWidth: 1 }),
            h('path', { d: 'M ' + (hx + 4) + ' ' + (hy - 19) + ' L ' + (hx + 19) + ' ' + (hy - 43) + ' L ' + (hx + 18) + ' ' + (hy - 10) + ' Z', fill: '#8f542a', stroke: '#f6e0c3', strokeWidth: 1 })
          );
        }
        if (kind === 'back') {
          return h('g', null,
            h('path', { d: 'M ' + (hx - 17) + ' ' + (hy - 11) + ' Q ' + (hx - 44) + ' ' + (hy - 16) + ' ' + (hx - 31) + ' ' + (hy + 3) + ' Q ' + (hx - 18) + ' ' + (hy + 12) + ' ' + (hx - 7) + ' ' + (hy + 1) + ' Z', fill: '#8f542a' }),
            h('path', { d: 'M ' + (hx + 7) + ' ' + (hy - 12) + ' Q ' + (hx + 36) + ' ' + (hy - 17) + ' ' + (hx + 27) + ' ' + (hy + 4) + ' Q ' + (hx + 16) + ' ' + (hy + 11) + ' ' + (hx + 4) + ' ' + (hy + 1) + ' Z', fill: '#8f542a' })
          );
        }
        return h('g', null,
          h('path', { d: 'M ' + (hx - 20) + ' ' + (hy - 12) + ' Q ' + (hx - 34) + ' ' + (hy - 20) + ' ' + (hx - 29) + ' ' + (hy + 8) + ' Q ' + (hx - 19) + ' ' + (hy + 17) + ' ' + (hx - 8) + ' ' + (hy + 4) + ' Z', fill: '#8f542a' }),
          h('path', { d: 'M ' + (hx + 7) + ' ' + (hy - 14) + ' Q ' + (hx + 28) + ' ' + (hy - 19) + ' ' + (hx + 21) + ' ' + (hy + 8) + ' Q ' + (hx + 13) + ' ' + (hy + 15) + ' ' + (hx + 3) + ' ' + (hy + 3) + ' Z', fill: '#8f542a' })
        );
      }

      function drawEthogramDog(poseId, x, y, scale, narrow) {
        var p = poses[poseId];
        var fur = '#c98b4c';
        var dark = '#8f542a';
        var cream = '#f2d6b3';
        var hx = p.headX, hy = p.headY;
        var legPaths = p.legs === 'crouch'
          ? 'M 53 91 Q 48 103 43 108 M 86 94 Q 87 105 91 109 M 109 91 Q 122 84 130 90'
          : p.legs === 'forward'
            ? 'M 54 80 L 50 106 M 87 81 L 92 106 M 112 77 Q 127 91 134 104'
            : 'M 53 81 L 50 105 M 84 82 L 88 106 M 109 79 L 116 104';
        return h('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + scale + ')' },
          h('ellipse', { cx: 89, cy: 109, rx: 73, ry: 8, fill: '#0f0a08', opacity: 0.3 }),
          h('path', { d: p.tail, fill: 'none', stroke: fur, strokeWidth: 13, strokeLinecap: 'round' }),
          poseId === 'relaxed' && h('path', { d: 'M 11 18 Q 4 12 7 5 M 18 21 Q 25 12 23 4', fill: 'none', stroke: '#86efac', strokeWidth: 2, strokeDasharray: '3 4' }),
          poseId === 'warning' && h('path', { d: 'M 50 39 L 58 24 L 67 39 L 76 22 L 85 39 L 95 25 L 104 42', fill: fur, stroke: '#f6e0c3', strokeWidth: 1.2 }),
          h('ellipse', { cx: 84, cy: p.bodyY, rx: 52, ry: p.bodyRy, fill: fur, stroke: '#f6e0c3', strokeWidth: 1.5 }),
          h('ellipse', { cx: 95, cy: p.bodyY + 10, rx: 28, ry: 16, fill: cream, opacity: 0.7 }),
          h('circle', { cx: hx, cy: hy, r: poseId === 'warning' ? 29 : 27, fill: fur, stroke: '#f6e0c3', strokeWidth: 1.5 }),
          dogEars(p.ear, hx, hy),
          h('ellipse', { cx: hx + 18, cy: hy + 9, rx: 18, ry: 13, fill: cream }),
          p.eye === 'whale'
            ? h('g', null, h('ellipse', { cx: hx + 8, cy: hy - 4, rx: 7, ry: 4.8, fill: '#fff8e7' }), h('circle', { cx: hx + 11, cy: hy - 4, r: 3, fill: '#24150f' }))
            : p.eye === 'hard'
              ? h('g', null, h('path', { d: 'M ' + (hx + 2) + ' ' + (hy - 7) + ' L ' + (hx + 14) + ' ' + (hy - 5), stroke: '#24150f', strokeWidth: 3.5, strokeLinecap: 'round' }), h('circle', { cx: hx + 11, cy: hy - 5, r: 2.5, fill: '#24150f' }))
              : h('g', null, h('ellipse', { cx: hx + 8, cy: hy - 5, rx: p.eye === 'soft' ? 4.5 : 4, ry: p.eye === 'soft' ? 3.2 : 4, fill: '#24150f' }), h('circle', { cx: hx + 9.5, cy: hy - 6.5, r: 1.1, fill: '#fff8e7' })),
          h('path', { d: 'M ' + (hx + 22) + ' ' + (hy + 5) + ' Q ' + (hx + 32) + ' ' + (hy + 6) + ' ' + (hx + 28) + ' ' + (hy + 13), fill: '#24150f' }),
          p.mouth === 'open'
            ? h('g', null, h('path', { d: 'M ' + (hx + 14) + ' ' + (hy + 18) + ' Q ' + (hx + 22) + ' ' + (hy + 28) + ' ' + (hx + 31) + ' ' + (hy + 18), fill: 'none', stroke: '#6b3027', strokeWidth: 2.5, strokeLinecap: 'round' }), h('path', { d: 'M ' + (hx + 21) + ' ' + (hy + 22) + ' Q ' + (hx + 24) + ' ' + (hy + 31) + ' ' + (hx + 28) + ' ' + (hy + 23), fill: '#d9787e' }))
            : p.mouth === 'teeth'
              ? h('g', null, h('path', { d: 'M ' + (hx + 13) + ' ' + (hy + 18) + ' Q ' + (hx + 23) + ' ' + (hy + 29) + ' ' + (hx + 34) + ' ' + (hy + 17) + ' Q ' + (hx + 25) + ' ' + (hy + 37) + ' ' + (hx + 13) + ' ' + (hy + 18) + ' Z', fill: '#5d1d1d' }), h('path', { d: 'M ' + (hx + 17) + ' ' + (hy + 19) + ' L ' + (hx + 21) + ' ' + (hy + 25) + ' L ' + (hx + 25) + ' ' + (hy + 19) + ' L ' + (hx + 29) + ' ' + (hy + 24) + ' L ' + (hx + 32) + ' ' + (hy + 18), fill: '#fff8e7' }))
              : h('path', { d: p.mouth === 'frown' ? 'M ' + (hx + 14) + ' ' + (hy + 22) + ' Q ' + (hx + 22) + ' ' + (hy + 15) + ' ' + (hx + 30) + ' ' + (hy + 22) : 'M ' + (hx + 14) + ' ' + (hy + 20) + ' H ' + (hx + 30), fill: 'none', stroke: '#6b3027', strokeWidth: 2.5, strokeLinecap: 'round' }),
          h('path', { d: legPaths, fill: 'none', stroke: dark, strokeWidth: 11, strokeLinecap: 'round' }),
          poseId === 'fearful' && h('path', { d: 'M 126 89 Q 132 82 138 88', fill: 'none', stroke: '#fb923c', strokeWidth: 2, strokeDasharray: '3 3' }),
          h('text', {
            x: narrow ? 170 : 89, y: narrow ? 118 : 125,
            textAnchor: narrow ? 'end' : 'middle',
            fill: '#e4cfb8', fontSize: 10, fontWeight: 900, letterSpacing: 1.1
          }, states.filter(function(s) { return s.id === poseId; })[0].posture)
        );
      }

      function ethogramCard(cfg, x, y, width, height, narrow, suffix) {
        var drawX = narrow ? x + 82 : x + 13;
        var drawY = narrow ? y + 42 : y + 50;
        var cueX = narrow ? x + 18 : x + 166;
        var cueY = narrow ? y + 149 : y + 70;
        var cueStep = narrow ? 14 : 18;
        return h('g', { key: cfg.id },
          h('rect', { x: x, y: y, width: width, height: height, rx: 13, fill: 'url(#pets-ethogram-' + cfg.id + suffix + ')', stroke: cfg.color, strokeWidth: 2 }),
          h('rect', { x: x + 10, y: y + 9, width: 32, height: 24, rx: 12, fill: '#181210', stroke: cfg.color, strokeWidth: 2 }),
          h('text', { x: x + 26, y: y + 26, textAnchor: 'middle', fill: '#fff8e7', fontSize: 12, fontWeight: 950 }, cfg.number),
          h('text', { x: x + 50, y: y + 26, fill: cfg.color, fontSize: narrow ? 12.5 : 13.5, fontWeight: 900 }, cfg.title),
          drawEthogramDog(cfg.id, drawX, drawY, narrow ? 1 : 0.78, narrow),
          cfg.cues.map(function(cue, i) {
            return h('text', { key: 'cue-' + i, x: cueX, y: cueY + i * cueStep, fill: '#fff3e2', fontSize: narrow ? 11.5 : 11.8, fontWeight: i === 0 ? 750 : 600 }, cue);
          }),
          h('line', {
            x1: narrow ? x + 18 : x + 166,
            y1: narrow ? y + height - 24 : y + height - 31,
            x2: x + width - 18,
            y2: narrow ? y + height - 24 : y + height - 31,
            stroke: cfg.color, strokeWidth: 1, strokeDasharray: '3 4', opacity: 0.62
          }),
          h('text', {
            x: narrow ? x + 18 : x + 166, y: narrow ? y + height - 7 : y + height - 13,
            fill: cfg.id === 'warning' ? cfg.color : '#c8b4a2', fontSize: narrow ? 10 : 10.8,
            fontStyle: 'italic', fontWeight: cfg.id === 'warning' ? 750 : 500
          }, cfg.action)
        );
      }

      function ethogramSvg(narrow) {
        var suffix = narrow ? '-narrow' : '-wide';
        var W = narrow ? 360 : 840;
        var H = narrow ? 1080 : 570;
        var titleId = narrow ? 'svg-ethogram-mobile-title' : 'svg-ethogram-title';
        var descId = narrow ? 'svg-ethogram-mobile-desc' : 'svg-ethogram-desc';
        return h('svg', {
          className: narrow ? 'petslab-diagram-narrow' : 'petslab-diagram-wide',
          viewBox: '0 0 ' + W + ' ' + H,
          role: 'img', 'aria-labelledby': titleId + ' ' + descId,
          preserveAspectRatio: 'xMidYMid meet',
          style: { background: '#181210', borderRadius: 8 }
        },
          h('title', { id: titleId }, titleText),
          h('desc', { id: descId }, descText),
          ethogramDefs(suffix),
          h('rect', { x: 0, y: 0, width: W, height: H, rx: 12, fill: '#181210' }),
          h('text', { x: W / 2, y: 27, fill: '#fef3e2', fontSize: narrow ? 17 : 18, textAnchor: 'middle', fontWeight: 850 }, '🐕 Dog body language ethogram'),
          h('text', { x: W / 2, y: 48, fill: '#c8b4a2', fontSize: narrow ? 11 : 13, textAnchor: 'middle' }, 'Read the WHOLE body, not just the tail'),
          narrow
            ? h('g', null,
                ethogramCard(states[0], 12, 62, 336, 240, true, suffix),
                ethogramCard(states[1], 12, 315, 336, 240, true, suffix),
                ethogramCard(states[2], 12, 568, 336, 240, true, suffix),
                ethogramCard(states[3], 12, 821, 336, 240, true, suffix)
              )
            : h('g', null,
                ethogramCard(states[0], 15, 62, 400, 225, false, suffix),
                ethogramCard(states[1], 425, 62, 400, 225, false, suffix),
                ethogramCard(states[2], 15, 300, 400, 225, false, suffix),
                ethogramCard(states[3], 425, 300, 400, 225, false, suffix)
              ),
          h('text', { x: W / 2, y: narrow ? 1072 : 555, fill: '#c8b4a2', fontSize: narrow ? 10.5 : 11.5, textAnchor: 'middle' }, 'Tail wagging means AROUSAL — context (rest of body) tells you which kind.')
        );
      }

      return h('div', { className: 'petslab-diagram-responsive-art' },
        ethogramSvg(false),
        ethogramSvg(true)
      );
    }
    function renderDiagrams() {
      var current = diagramView;
      var svg, caption;
      if (current === 'airsac') {
        svg = svgAirSac();
        caption = 'Bird respiratory anatomy is fundamentally different from mammals. Two-cycle one-way airflow through 9 air sacs gives birds ~2× the gas-exchange efficiency. Same physiology that lets canaries warn coal miners makes pet birds extraordinarily sensitive to airborne toxins (Teflon, scented candles, smoke).';
      } else if (current === 'operant') {
        svg = svgOperantLoop();
        caption = 'The three-term contingency (antecedent → behavior → consequence) is the foundation of operant conditioning. BehaviorLab simulates this with mice in a Skinner box. The Pets Lab shows what changes when you swap the mouse for a real animal in a real environment.';
      } else if (current === 'bodylang') {
        svg = svgEthogram();
        caption = 'Most dog bites are predictable from body language minutes in advance. The 4 quadrants here are simplified; real dogs slide between states. Reading the WHOLE body — not just the tail — is the highest-impact skill for any pet-owning household.';
      } else {
        svg = svgSkullCompare();
        caption = 'Tooth shape reveals diet. Dogs have flat-topped molars (can grind plants) and a longer braincase. Cats have only sharp canines + carnassial teeth (slicing only — no grinding) and proportionally larger eye sockets for low-light hunting. Anatomy confirms what biochemistry already shows: cats are obligate carnivores.';
      }
      var petsDiagramTabKeyDown = function(e, index) {
        var nextIndex = -1;
        var total = DIAGRAM_TABS.length;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % total;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + total - 1) % total;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = total - 1;
        if (nextIndex < 0) return;
        e.preventDefault();
        var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        var nextTab = tabs[nextIndex];
        if (nextTab) { nextTab.focus(); nextTab.click(); }
      };
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('🔬 Diagrams'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          '4 labeled anatomical schematics. Switch tabs to compare different topics covered across the lab.'),
        h('div', { role: 'tablist', 'aria-label': 'Schematic diagrams',
          style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
          DIAGRAM_TABS.map(function(t, tabIndex) {
            var picked = current === t.id;
            return h('button', { key: t.id, role: 'tab',
              id: 'pets-diagram-tab-' + t.id,
              'aria-controls': 'pets-diagram-panel-' + t.id,
              'aria-selected': picked ? 'true' : 'false',
              tabIndex: picked ? 0 : -1,
              onKeyDown: function(e) { petsDiagramTabKeyDown(e, tabIndex); },
              'data-pets-focusable': true,
              onClick: function() { upd('diagramView', t.id); petsAnnounce(t.label + ' diagram'); },
              style: btn({
                background: picked ? T.accent : T.card,
                color: picked ? '#1f1612' : T.text,
                border: '1px solid ' + (picked ? T.accent : T.border),
                padding: '8px 14px', fontSize: 13
              })
            }, t.icon + ' ' + t.label);
          })),
        h('div', { role: 'tabpanel', id: 'pets-diagram-panel-' + current,
          'aria-labelledby': 'pets-diagram-tab-' + current, tabIndex: 0,
          className: 'petslab-diagram-panel',
          style: { padding: 12, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('div', { className: 'petslab-diagram-canvas petslab-diagram-canvas--' + current,
            style: { width: '100%', maxWidth: 920, margin: '0 auto', aspectRatio: (current === 'airsac' || current === 'bodylang') ? 'auto' : '600 / 360' } }, svg),
          h('p', { className: 'petslab-diagram-caption', style: { margin: '12px 4px 0', fontSize: 13, color: T.muted, lineHeight: 1.6 } }, caption)),
        h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
          'Schematics are simplified for learning. For clinical anatomy + behavioral assessment, see the cited primary sources (AVMA, AAV, AVSAB).'),
        footer());
    }

    // ─────────────────────────────────────────
    // WELFARE & ETHICS
    // ─────────────────────────────────────────
    function renderWelfare() {
      var welfareSec = d.welfareSec || 'spayNeuter';
      function setSec(id) { upd('welfareSec', id); petsAnnounce(WELFARE_DATA[id].label); }
      // Track which sections have been visited for the welfare-aware badge
      var welfareVisited = d.welfareVisited || {};
      if (!welfareVisited[welfareSec]) {
        var nv = Object.assign({}, welfareVisited); nv[welfareSec] = true;
        // Deferred out of the render phase — calling upd()/awardBadge() during render risks a
        // "cannot update while rendering" warning / extra render pass.
        setTimeout(function() { upd('welfareVisited', nv); if (Object.keys(nv).length >= 4) awardBadge('pets_welfare_aware', 'Welfare-Aware'); }, 0);
      }
      var sectionTabs = h('div', { role: 'tablist', 'aria-label': 'Welfare topic',
        style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 } },
        Object.keys(WELFARE_DATA).map(function(k) {
          var s = WELFARE_DATA[k];
          var sel = welfareSec === k;
          var visited = !!welfareVisited[k];
          return h('button', {
            key: k, role: 'tab', 'aria-selected': sel ? 'true' : 'false',
            'data-pets-focusable': true,
            'aria-label': s.label + (visited ? ' (visited)' : ''),
            onClick: function() { setSec(k); },
            style: btn({
              padding: '8px 14px', fontSize: 13,
              background: sel ? T.accent : (visited ? T.cardAlt : T.card),
              color: sel ? '#1f1612' : T.text,
              border: '2px solid ' + (sel ? T.accent : (visited ? T.warm : T.border)),
              fontWeight: sel ? 800 : 600
            })
          }, s.icon + ' ' + s.label);
        })
      );
      var sec = WELFARE_DATA[welfareSec];
      var body;
      if (welfareSec === 'spayNeuter') {
        var years = d.litterYears != null ? d.litterYears : 5;
        // Compound: each generation produces 2 litters/yr × 4 kittens × 50% female × ~80% survive to reproduce
        // Simplified: total cats(t) ≈ Σ generation cats. Use HSUS-style estimate.
        // Females per generation grow by factor ~3.2/year (2 litters × 4 × 0.5 × 0.8)
        var growthFactor = 3.2;
        var totalCats = 0;
        var generations = [];
        var alive = 1;  // start: 1 unspayed female
        for (var y = 0; y <= years; y++) {
          generations.push({ year: y, count: Math.round(alive) });
          totalCats += Math.round(alive);
          alive *= growthFactor;
          if (alive > 100000) alive = 100000;  // safety cap
        }
        body = h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.6 } }, sec.lead),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🩺 Health benefits'),
            sec.health.map(function(h2, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 8, background: T.cardAlt, marginBottom: 6 } },
                h('strong', { style: { color: T.text, fontSize: 13 } }, h2.species),
                h('div', { style: { color: T.muted, fontSize: 12, lineHeight: 1.55, marginTop: 2 } }, h2.benefit)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🧠 Behavioral benefits'),
            h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.muted, lineHeight: 1.65 } },
              sec.behavior.map(function(b, i) { return h('li', { key: i }, b); })
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '⏱️ Timing'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } }, sec.timing)
          ),
          // Interactive litter-math calculator
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '2px solid ' + T.warm, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.warm } }, '🧮 The litter math'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } }, sec.math),
            h('label', { htmlFor: 'litter-years',
              style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 } },
              h('span', null, 'Years of unchecked breeding'),
              h('span', { style: { color: T.warm, fontFamily: 'monospace' } }, years + ' yr')
            ),
            h('input', { id: 'litter-years', 'data-pets-focusable': true, type: 'range',
              min: 1, max: 7, step: 1, value: years,
              'aria-label': 'Years of unchecked breeding',
              onChange: function(e) { upd('litterYears', parseInt(e.target.value, 10)); },
              style: { width: '100%', accentColor: T.warm, cursor: 'pointer' }
            }),
            h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } }, 'Estimated descendants from one unspayed female'),
              h('div', { style: { fontSize: 32, fontWeight: 900, color: T.warm, fontFamily: 'monospace' } },
                totalCats.toLocaleString()
              ),
              h('div', { style: { fontSize: 10, color: T.dim, marginTop: 4 } }, 'cats over ' + years + ' years (HSUS conservative estimate, assuming 50% survival to reproduction)')
            ),
            // Mini-chart
            h('div', { style: { marginTop: 12, padding: 8, borderRadius: 6, background: T.bg, display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }, 'aria-hidden': 'true' },
              generations.map(function(g, i) {
                var h_pct = Math.min(100, (g.count / Math.max(1, generations[generations.length - 1].count)) * 100);
                return h('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 } },
                  h('div', { style: { width: '100%', height: h_pct + '%', background: T.warm, borderRadius: '3px 3px 0 0', minHeight: 2 } }),
                  h('div', { style: { fontSize: 9, color: T.dim } }, 'y' + g.year)
                );
              })
            )
          ),
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.ok, marginBottom: 8 } },
            h('h4', { style: { margin: '0 0 6px', fontSize: 13, color: T.ok } }, '💵 Affordability'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } }, sec.cost),
            h('p', { style: { margin: '6px 0 0', color: T.text, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🌲 Maine: '), sec.maine)
          ),
          h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', padding: 8 } }, 'Sources: ' + sec.cite)
        );
      } else if (welfareSec === 'adoption') {
        body = h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.6 } }, sec.lead),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '✓ Why adopt'),
            h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.muted, lineHeight: 1.7 } },
              sec.whyAdopt.map(function(item, i) { return h('li', { key: i, style: { marginBottom: 4 } }, item); })
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 13, color: T.text } }, '🐕 Need a specific breed?'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } }, sec.breedSpecificRescues)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.accentHi } }, '🤔 When a breeder IS appropriate'),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, fontStyle: 'italic' } }, 'These are real cases, not excuses. The bar for "I genuinely need a breeder" is high but not zero.'),
            h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.muted, lineHeight: 1.65 } },
              sec.whenBreederIsOK.map(function(item, i) { return h('li', { key: i, style: { marginBottom: 4 } }, item); })
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '2px solid ' + T.ok, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.ok } }, '✓ Reputable breeder checklist'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12 } }, 'If a breeder fails ANY of these, walk away.'),
            h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.text, lineHeight: 1.65, listStyleType: 'none' } },
              sec.reputableBreederChecklist.map(function(item, i) { return h('li', { key: i, style: { marginBottom: 4 } }, item); })
            )
          ),
          h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', padding: 8 } }, 'Sources: ' + sec.cite)
        );
      } else if (welfareSec === 'declawing') {
        body = h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '2px solid ' + T.danger, marginBottom: 14 } },
            h('p', { style: { margin: 0, color: '#fde2e2', fontSize: 14, lineHeight: 1.6, fontWeight: 700 } }, sec.lead)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🦴 The anatomical truth'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } }, sec.anatomicalTruth)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '😖 Pain (acute and chronic)'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } }, sec.pain)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🧠 Behavioral consequences'),
            h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.muted, lineHeight: 1.65 } },
              sec.behaviorConsequences.map(function(b, i) { return h('li', { key: i, style: { marginBottom: 3 } }, b); })
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.warm, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.warm } }, '⚖️ Veterinary consensus + legal status'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } }, sec.vetConsensus)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '2px solid ' + T.ok, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.ok } }, '✓ Alternatives that actually work'),
            h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.text, lineHeight: 1.65, listStyleType: 'none' } },
              sec.alternatives.map(function(a, i) { return h('li', { key: i, style: { marginBottom: 6 } }, a); })
            )
          ),
          h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', padding: 8 } }, 'Sources: ' + sec.cite)
        );
      } else if (welfareSec === 'outdoorCats') {
        body = h('div', null,
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.6 } }, sec.lead),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '2px solid ' + T.warm, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.warm } }, '📊 The numbers'),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.7 } }, sec.data)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🐦 Why it matters ecologically'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } }, sec.whyItMatters)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🐈 Risk to your own cat'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } }, sec.ownCatLifespan)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.warm, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 13, color: T.warm } }, '⚖️ TNR — where the welfare community disagrees'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.65 } }, sec.tnrControversy)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '2px solid ' + T.ok, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.ok } }, '✓ What individuals can do'),
            h('ul', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.text, lineHeight: 1.7, listStyleType: 'none' } },
              sec.whatIndividualsCanDo.map(function(a, i) { return h('li', { key: i, style: { marginBottom: 6 } }, a); })
            )
          ),
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, marginBottom: 8 } },
            h('strong', { style: { color: T.accentHi } }, '🌲 Maine: '),
            h('span', { style: { color: T.muted, fontSize: 13, lineHeight: 1.55 } }, sec.maine)
          ),
          h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic', padding: 8 } }, 'Sources: ' + sec.cite)
        );
      }
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🛡️ Welfare & Ethics'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.65 } },
            'Four welfare topics where the science is clear but the cultural defaults haven\'t caught up. Browse all four to earn the ',
            h('strong', { style: { color: T.accentHi } }, 'Welfare-Aware'), ' badge.'
          )
        ),
        sectionTabs,
        body,
        crossLink('Apply this — practical actions',
          h('span', null,
            'See ', h('strong', { style: { color: T.text } }, '🌱 Take Action'),
            ' for the concrete community-level moves: foster, TNR support, adopt-don\'t-shop, and civic-level animal welfare.'
          )
        ),
        footer()
      );
    }

    // ─────────────────────────────────────────
    // PET-CARE WEEK SIMULATOR
    // ─────────────────────────────────────────
    // ───────────────────────────────────────────────────────
    // Immersive scene for the Pet-Care Week sim. Renders the
    // selected species in a small "habitat" scene whose mood,
    // posture, and ambient items reflect the current welfare meters
    // and the day-of-week. The student can SEE what care has done
    // (or failed to do) for the animal, instead of inferring it
    // from numbers. Each scene is a stylized SVG built from simple
    // shapes — no external assets, no rendering loop, idle motion
    // via CSS keyframes that honor prefers-reduced-motion.
    // Presentation-only scene cues for each scenario day. These do not affect
    // scoring; they make the prompt feel situated in the animal's world.
    var CARE_SCENE_EVENTS = {
      dog: [
        { icon: '\uD83C\uDF05', label: 'Routine morning', detail: 'Walk + breakfast set the tone', kind: 'routine' },
        { icon: '\uD83D\uDC65', label: 'Social plans', detail: 'A walk competes with your evening', kind: 'social' },
        { icon: '\uD83C\uDF92', label: 'Departure cue', detail: 'The bag predicts alone time', kind: 'anxiety' },
        { icon: '\u2695\uFE0F', label: 'Vet visit', detail: 'Prevention protects future health', kind: 'vet' },
        { icon: '\uD83C\uDF27\uFE0F', label: 'Rain day', detail: 'Indoor nose-work still counts', kind: 'rain' },
        { icon: '\uD83E\uDDF3', label: 'Travel weekend', detail: 'Coverage keeps routines safe', kind: 'travel' },
        { icon: '\uD83C\uDF7D\uFE0F', label: 'Family BBQ', detail: 'Guests need a safe-treat plan', kind: 'bbq' }
      ],
      cat: [
        { icon: '\uD83C\uDFE0', label: 'Safe room', detail: 'A quiet landing zone lowers stress', kind: 'home' },
        { icon: '\uD83E\uDDF9', label: 'Litter setup', detail: 'Placement changes bathroom comfort', kind: 'litter' },
        { icon: '\uD83C\uDF3F', label: 'Window temptation', detail: 'Indoor enrichment protects wildlife', kind: 'outdoors' },
        { icon: '\u2695\uFE0F', label: 'Health check', detail: 'A small sign deserves attention', kind: 'vet' },
        { icon: '\uD83D\uDD0A', label: 'Noise stress', detail: 'A quiet hideaway is a resource', kind: 'noise' },
        { icon: '\uD83C\uDFE1', label: 'Care coverage', detail: 'Familiar space beats disruption', kind: 'sitter' },
        { icon: '\uD83C\uDF81', label: 'Holiday guests', detail: 'Choice and escape routes matter', kind: 'guests' }
      ],
      rabbit: [
        { icon: '\uD83D\uDECE\uFE0F', label: 'New enclosure', detail: 'Hide spots make settling safer', kind: 'settle' },
        { icon: '\uD83C\uDF3E', label: 'Hay first', detail: 'Fiber keeps the gut moving', kind: 'hay' },
        { icon: '\uD83D\uDCA7', label: 'Water check', detail: 'Hydration is a daily basic', kind: 'water' },
        { icon: '\u2695\uFE0F', label: 'Exotic vet', detail: 'Rabbit health can turn quickly', kind: 'vet' },
        { icon: '\u2600\uFE0F', label: 'Warm afternoon', detail: 'Shade and airflow prevent heat stress', kind: 'heat' },
        { icon: '\uD83D\uDEAA', label: 'Free-roam plan', detail: 'Safe exercise needs preparation', kind: 'space' },
        { icon: '\uD83D\uDC65', label: 'Guest visit', detail: 'Quiet handling protects trust', kind: 'guests' }
      ]
    };

    function renderCareTimeline(careSim, allDays) {
      if (!careSim || !allDays) return null;
      var clamp = function(v) { return Math.max(0, Math.min(100, v)); };
      var running = { phys: 50, ment: 50, soc: 50, env: 50 };
      var events = CARE_SCENE_EVENTS[careSim.species] || [];
      var domainMeta = [
        { key: 'phys', label: 'P', color: T.ok },
        { key: 'ment', label: 'M', color: '#7dd3fc' },
        { key: 'soc', label: 'S', color: T.accentHi },
        { key: 'env', label: 'E', color: '#a78bfa' }
      ];
      return h('section', {
        className: 'petslab-care-timeline',
        role: 'region',
        'aria-label': 'Seven-day welfare timeline. Each day shows the scenario choice and its physical, mental, social, and environmental changes.',
        style: { marginBottom: 12 }
      },
        h('div', { className: 'petslab-care-timeline-head' },
          h('div', null,
            h('h3', null, 'Seven-day welfare timeline'),
            h('p', null, 'Follow how each decision moves the four welfare domains. The highlighted day is your current position.')
          ),
          h('div', { className: 'petslab-care-timeline-legend', 'aria-label': 'Welfare domain key' },
            domainMeta.map(function(m) { return h('span', { key: m.key, style: { color: m.color } }, m.label + ' ' + m.key); })
          )
        ),
        h('div', { className: 'petslab-care-timeline-grid' },
          allDays.map(function(day, i) {
            var choice = (careSim.choices || [])[i] || null;
            var ev = events[i] || { icon: '\u2022', label: day.label, detail: '' };
            var deltas = choice && choice.effects ? choice.effects : null;
            var before = Object.assign({}, running);
            if (deltas) {
              ['phys', 'ment', 'soc', 'env'].forEach(function(k) { running[k] = clamp(running[k] + (deltas[k] || 0)); });
            }
            var isPast = i < careSim.day || careSim.done;
            var isNow = !careSim.done && i === careSim.day;
            return h('article', {
              key: i,
              className: 'petslab-care-timeline-day' + (isNow ? ' is-now' : '') + (isPast ? ' is-past' : ''),
              'aria-label': 'Day ' + (i + 1) + ': ' + ev.label + (choice ? '. Choice recorded.' : '. Not chosen yet.')
            },
              h('div', { className: 'petslab-care-timeline-daytop' },
                h('span', { className: 'petslab-care-timeline-daynum' }, 'DAY ' + (i + 1)),
                h('span', { className: 'petslab-care-timeline-state' }, choice ? '\u2713 chosen' : isNow ? 'current' : 'up next')
              ),
              h('div', { className: 'petslab-care-timeline-event' },
                h('span', { className: 'petslab-care-timeline-icon', 'aria-hidden': 'true' }, ev.icon),
                h('span', null,
                  h('strong', null, ev.label),
                  h('small', null, ev.detail)
                )
              ),
              choice
                ? h('div', { className: 'petslab-care-timeline-choice' }, choice.choiceLabel)
                : h('div', { className: 'petslab-care-timeline-choice is-empty' }, 'Choice pending'),
              h('div', { className: 'petslab-care-timeline-deltas' },
                domainMeta.map(function(m) {
                  var delta = deltas ? (deltas[m.key] || 0) : 0;
                  var value = choice ? Math.round(running[m.key]) : Math.round(before[m.key]);
                  return h('span', { key: m.key, style: { '--pets-domain-color': m.color }, 'aria-label': m.key + ' ' + (delta >= 0 ? '+' : '') + delta + ', ' + value + '%' },
                    h('b', null, m.label),
                    h('em', null, choice ? (delta >= 0 ? '+' : '') + delta : '\u2014')
                  );
                })
              )
            );
          })
        )
      );
    }

    function renderPetScene(species, careSim, dayIdx, totalDays, hasChosen, onInteract) {
      // Mood from average welfare. The 4 pet-welfare meters drive
      // posture; the OWNER meters (energy/money) don't change the
      // animal's behavior — they only affect what the student can
      // do next. So we ignore them here.
      var avg = (careSim.phys + careSim.ment + careSim.soc + careSim.env) / 4;
      var mood = avg >= 75 ? 'happy' : avg >= 55 ? 'content' : avg >= 35 ? 'stressed' : 'distressed';
      var sceneEvent = ((CARE_SCENE_EVENTS[species] || [])[dayIdx]) || { icon: '\u2022', label: 'Daily care', detail: 'Notice what your pet needs', kind: 'routine' };

      // Time-of-day across the week. Day 0 = early dawn; final day
      // = dusk. Gives a felt sense of progress through the week.
      var tprog = totalDays > 1 ? dayIdx / (totalDays - 1) : 0;
      // Sun goes from low-left at dawn → high midday → low-right at dusk.
      var sunX = 60 + tprog * 700;
      var sunY = 80 - Math.sin(tprog * Math.PI) * 50;
      var skyTop = tprog < 0.5
        ? 'rgb(' + Math.round(180 - tprog * 80) + ',' + Math.round(160 - tprog * 60) + ',' + Math.round(220 - tprog * 60) + ')'
        : 'rgb(' + Math.round(140 + (tprog - 0.5) * 60) + ',' + Math.round(100 + (tprog - 0.5) * 80) + ',' + Math.round(160 + (tprog - 0.5) * 30) + ')';
      var skyBot = tprog < 0.5
        ? 'rgb(' + Math.round(220 - tprog * 60) + ',' + Math.round(200 - tprog * 40) + ',' + Math.round(230 - tprog * 30) + ')'
        : 'rgb(' + Math.round(180 + (tprog - 0.5) * 40) + ',' + Math.round(140 + (tprog - 0.5) * 50) + ',' + Math.round(180 + (tprog - 0.5) * 20) + ')';

      var W = 800, H = 280;

      // Ambient items — show or hide based on individual welfare.
      // Empty bowl signals food neglect; full bowl signals the
      // student fed regularly. Toy presence reflects mental
      // enrichment. Bedding cleanliness reflects environment.
      var bowlFull   = careSim.phys >= 50;            // food regularly provided
      var hasToy     = careSim.ment >= 50;            // enrichment offered
      var beddingClean = careSim.env >= 50;           // habitat maintained
      var ownerNear  = careSim.soc >= 50 && mood !== 'distressed'; // companionship

      function moodCaption() {
        if (mood === 'happy') {
          if (species === 'dog')    return '🐕 Tail high, ears alert. Looking right at you.';
          if (species === 'cat')    return '🐈 Slow blink, tail-up greet. Trusts you.';
          if (species === 'rabbit') return '🐰 Binkying. Relaxed enough to play.';
        }
        if (mood === 'content') {
          if (species === 'dog')    return '🐕 Calm, breathing easy. Settled.';
          if (species === 'cat')    return '🐈 Loafed, eyes half-closed. Fine.';
          if (species === 'rabbit') return '🐰 Loaf posture. Comfortable enough.';
        }
        if (mood === 'stressed') {
          if (species === 'dog')    return '🐕 Yawning, lip-licking. Calming signals; something is off.';
          if (species === 'cat')    return '🐈 Tail flicking, ears flat. Wants space.';
          if (species === 'rabbit') return '🐰 Hunched, eyes wide. Watch for stasis.';
        }
        // distressed
        if (species === 'dog')    return '🐕 Tucked tail, body low. Real welfare gap.';
        if (species === 'cat')    return '🐈 Hidden, body small. Crisis level.';
        if (species === 'rabbit') return '🐰 Pressed in a corner. Vet now.';
        return '';
      }

      // ── Sky-sun-ground backdrop ──
      var backdrop = h('g', null,
        h('defs', null,
          h('linearGradient', { id: 'pets-sky-' + dayIdx, x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: '0%',  stopColor: skyTop }),
            h('stop', { offset: '100%', stopColor: skyBot })
          ),
          h('radialGradient', { id: 'pets-sun-' + dayIdx, cx: '50%', cy: '50%', r: '50%' },
            h('stop', { offset: '0%',  stopColor: '#fef3c7', stopOpacity: 1 }),
            h('stop', { offset: '60%', stopColor: '#fbbf24', stopOpacity: 0.7 }),
            h('stop', { offset: '100%', stopColor: '#fbbf24', stopOpacity: 0 })
          ),
          h('linearGradient', { id: 'pets-grass-' + dayIdx, x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: '0%', stopColor: '#86b967' }),
            h('stop', { offset: '100%', stopColor: '#4f7d3e' })
          ),
          h('linearGradient', { id: 'pets-wall-' + dayIdx, x1: 0, y1: 0, x2: 1, y2: 1 },
            h('stop', { offset: '0%', stopColor: '#efe2cf' }),
            h('stop', { offset: '100%', stopColor: '#c8aa87' })
          ),
          h('linearGradient', { id: 'pets-pen-' + dayIdx, x1: 0, y1: 0, x2: 0, y2: 1 },
            h('stop', { offset: '0%', stopColor: '#f2e8d8' }),
            h('stop', { offset: '100%', stopColor: '#d7bea0' })
          ),
          h('linearGradient', { id: 'pets-dog-coat-' + dayIdx, x1: 0, y1: 0, x2: 1, y2: 1 },
            h('stop', { offset: '0%', stopColor: '#e0ae70' }),
            h('stop', { offset: '58%', stopColor: '#bb7b3d' }),
            h('stop', { offset: '100%', stopColor: '#825225' })
          ),
          h('linearGradient', { id: 'pets-cat-coat-' + dayIdx, x1: 0, y1: 0, x2: 1, y2: 1 },
            h('stop', { offset: '0%', stopColor: '#6e5a44' }),
            h('stop', { offset: '55%', stopColor: '#3a3025' }),
            h('stop', { offset: '100%', stopColor: '#201b17' })
          ),
          h('linearGradient', { id: 'pets-rabbit-coat-' + dayIdx, x1: 0, y1: 0, x2: 1, y2: 1 },
            h('stop', { offset: '0%', stopColor: '#c9b3a3' }),
            h('stop', { offset: '62%', stopColor: '#9c8272' }),
            h('stop', { offset: '100%', stopColor: '#6f5a50' })
          ),
          h('filter', { id: 'pets-soft-shadow-' + dayIdx, x: '-25%', y: '-25%', width: '150%', height: '170%' },
            h('feDropShadow', { dx: 0, dy: 5, stdDeviation: 5, floodColor: '#1f2937', floodOpacity: 0.28 })
          )
        ),
        h('rect', { x: 0, y: 0, width: W, height: H * 0.62, fill: 'url(#pets-sky-' + dayIdx + ')' }),
        // Sun
        h('circle', { cx: sunX, cy: sunY, r: 30, fill: 'url(#pets-sun-' + dayIdx + ')' }),
        h('circle', { cx: sunX, cy: sunY, r: 16, fill: '#fef3c7' })
      );

      // ── Per-species scene ──
      var scene;
      if (species === 'dog') {
        // Yard scene: grass + dog + bowls + toy
        var dogColor = 'url(#pets-dog-coat-' + dayIdx + ')';
        var dogShade = '#8a6030';
        var earY = mood === 'happy' || mood === 'content' ? 122 : 142; // ears down when stressed
        var bodyDip = mood === 'distressed' ? 30 : mood === 'stressed' ? 14 : 0;
        var eyeOpen = mood === 'distressed' ? false : true;
        var tailPath = mood === 'happy' ? 'M 462 158 L 502 130 L 510 138 L 472 168 Z'
                     : mood === 'content' ? 'M 462 158 L 510 168 L 510 178 L 466 172 Z'
                     : mood === 'stressed' ? 'M 462 168 L 502 188 L 502 196 L 466 178 Z'
                     : 'M 462 174 L 488 200 L 484 208 L 462 188 Z'; // tucked
        var wagClass = (mood === 'happy' || mood === 'content') ? 'petslab-wag' : '';

        scene = h('g', null,
          // Grass ground
          // Layered yard: clouds, distant hills, tree canopy, then grass.
          h('g', { opacity: 0.72 },
            h('ellipse', { cx: 170, cy: 62, rx: 48, ry: 13, fill: '#ffffff' }),
            h('ellipse', { cx: 135, cy: 67, rx: 30, ry: 10, fill: '#ffffff' }),
            h('ellipse', { cx: 610, cy: 82, rx: 54, ry: 14, fill: '#ffffff', opacity: 0.74 })
          ),
          h('path', { d: 'M 0 152 Q 100 106 205 151 Q 310 106 420 151 Q 540 102 650 151 Q 725 122 800 147 L 800 180 L 0 180 Z', fill: '#6d995b', opacity: 0.72 }),
          h('path', { d: 'M 0 164 Q 135 126 260 165 Q 400 124 530 165 Q 680 132 800 160 L 800 184 L 0 184 Z', fill: '#507e47', opacity: 0.72 }),
          h('g', { opacity: 0.9 },
            h('rect', { x: 714, y: 82, width: 15, height: 95, rx: 5, fill: '#725036' }),
            h('circle', { cx: 722, cy: 75, r: 39, fill: '#4f8547' }),
            h('circle', { cx: 690, cy: 91, r: 27, fill: '#5d9752' }),
            h('circle', { cx: 751, cy: 93, r: 28, fill: '#487a43' })
          ),
          h('rect', { x: 0, y: H * 0.62, width: W, height: H * 0.38, fill: 'url(#pets-grass-' + dayIdx + ')' }),
          h('rect', { x: 0, y: H * 0.62, width: W, height: 6, fill: '#4a7a3a', opacity: 0.4 }),
          // Distant fence
          h('path', { d: 'M 80 168 L 80 178 M 130 168 L 130 178 M 180 168 L 180 178 M 720 168 L 720 178', stroke: '#5a4a30', strokeWidth: 2 }),
          h('rect', { x: 70, y: 174, width: 660, height: 3, fill: '#5a4a30', opacity: 0.6 }),
          // Toy ball (only if enrichment is being met)
          hasToy && h('g', null,
            h('circle', { cx: 600, cy: 230, r: 14, fill: '#ef4444' }),
            h('path', { d: 'M 588 230 Q 600 224 612 230 M 588 230 Q 600 236 612 230', stroke: '#fff', strokeWidth: 1.5, fill: 'none' })
          ),
          // Owner silhouette in background (if social bond intact)
          ownerNear && h('g', { opacity: 0.85 },
            h('rect', { x: 130, y: 130 + bodyDip * 0.3, width: 24, height: 50, fill: '#3b4252', rx: 6 }),
            h('circle', { cx: 142, cy: 122 + bodyDip * 0.3, r: 10, fill: '#5e81ac' })
          ),
          // Bowls (food + water)
          h('g', null,
            h('ellipse', { cx: 250, cy: 240, rx: 28, ry: 7, fill: '#5a4030' }),
            h('rect', { x: 222, y: 226, width: 56, height: 14, fill: '#7a5a3a', rx: 2 }),
            bowlFull && h('ellipse', { cx: 250, cy: 226, rx: 22, ry: 4, fill: '#c0a060' }),
            // Water bowl
            h('ellipse', { cx: 320, cy: 244, rx: 22, ry: 6, fill: '#3b4252' }),
            h('rect', { x: 300, y: 232, width: 40, height: 12, fill: '#5a6a7a', rx: 2 }),
            h('ellipse', { cx: 320, cy: 234, rx: 16, ry: 3, fill: '#7dd3fc', opacity: 0.85 })
          ),
          // ── Dog body ──
          h('ellipse', { cx: 430, cy: 244, rx: 78, ry: 12, fill: '#1f2937', opacity: 0.22 }),
          h('g', { className: mood !== 'distressed' ? 'petslab-breathe' : '', filter: 'url(#pets-soft-shadow-' + dayIdx + ')', style: { transformOrigin: '50% 100%' } },
            // Body
            h('ellipse', { cx: 430, cy: 200 + bodyDip, rx: 60, ry: 30 + bodyDip * 0.2, fill: dogColor }),
            // Belly highlight
            h('ellipse', { cx: 430, cy: 210 + bodyDip, rx: 50, ry: 14, fill: '#d8a868' }),
            // Tail (animated wag if mood >= content)
            h('g', { className: wagClass, style: { transformOrigin: '462px 168px' } },
              h('path', { d: tailPath, fill: dogColor })
            ),
            // Legs (4)
            h('rect', { x: 388, y: 215 + bodyDip, width: 10, height: 28, fill: dogShade, rx: 3 }),
            h('rect', { x: 410, y: 215 + bodyDip, width: 10, height: 28, fill: dogShade, rx: 3 }),
            h('rect', { x: 442, y: 215 + bodyDip, width: 10, height: 28, fill: dogShade, rx: 3 }),
            h('rect', { x: 462, y: 215 + bodyDip, width: 10, height: 28, fill: dogShade, rx: 3 }),
            // Head
            h('ellipse', { cx: 380, cy: 162 + bodyDip * 0.6, rx: 32, ry: 28, fill: dogColor }),
            // Ears
            h('path', { d: 'M 358 ' + earY + ' Q 352 ' + (earY - 14) + ' 364 ' + (earY - 18) + ' L 372 ' + (earY - 6) + ' Z', fill: dogShade }),
            h('path', { d: 'M 396 ' + earY + ' Q 408 ' + (earY - 14) + ' 408 ' + (earY - 6) + ' L 396 ' + (earY - 4) + ' Z', fill: dogShade }),
            // Snout
            h('ellipse', { cx: 360, cy: 178 + bodyDip * 0.6, rx: 14, ry: 9, fill: '#e0c098' }),
            h('circle', { cx: 350, cy: 176 + bodyDip * 0.6, r: 3, fill: '#1a1a1a' }),
            // Eyes
            eyeOpen
              ? h('g', null,
                  h('circle', { cx: 372, cy: 158 + bodyDip * 0.6, r: 3, fill: '#1a1a1a' }),
                  h('circle', { cx: 388, cy: 158 + bodyDip * 0.6, r: 3, fill: '#1a1a1a' })
                )
              : h('g', null,
                  h('path', { d: 'M 369 ' + (158 + bodyDip * 0.6) + ' Q 372 ' + (160 + bodyDip * 0.6) + ' 375 ' + (158 + bodyDip * 0.6), stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' }),
                  h('path', { d: 'M 385 ' + (158 + bodyDip * 0.6) + ' Q 388 ' + (160 + bodyDip * 0.6) + ' 391 ' + (158 + bodyDip * 0.6), stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' })
                ),
            // Mouth (smile if happy, line if stressed)
            mood === 'happy'
              ? h('path', { d: 'M 354 184 Q 360 190 366 184', stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' })
              : h('path', { d: 'M 354 184 L 366 184', stroke: '#1a1a1a', strokeWidth: 1.5, fill: 'none' }),
            mood === 'stressed' && h('ellipse', { cx: 365, cy: 186, rx: 5, ry: 2.5, fill: '#f59aa8', transform: 'rotate(-18 365 186)' })
          )
        );
      } else if (species === 'cat') {
        var catColor = 'url(#pets-cat-coat-' + dayIdx + ')';
        var catBelly = '#a89070';
        var bodyDip2 = mood === 'distressed' ? 14 : 0;
        var eyeOpen2 = mood === 'distressed' ? false : true;
        var tail2 = mood === 'happy' ? 'M 462 178 L 462 130 L 472 130 L 472 178 Z'
                  : mood === 'content' ? 'M 462 178 L 510 200 L 510 210 L 462 188 Z'
                  : mood === 'stressed' ? 'M 462 178 L 504 192 Q 506 196 504 200 L 458 188 Z'
                  : 'M 446 182 L 458 196 L 454 200 L 442 186 Z'; // tucked tight

        scene = h('g', null,
          // Indoor floor (hardwood)
          // A real interior wall replaces the shared outdoor sky.
          h('rect', { x: 0, y: 0, width: W, height: H * 0.62, fill: 'url(#pets-wall-' + dayIdx + ')' }),
          h('path', { d: 'M 0 128 L 800 128 M 205 128 L 205 174 M 365 128 L 365 174 M 525 128 L 525 174 M 685 128 L 685 174', stroke: '#b49372', strokeWidth: 1, opacity: 0.42 }),
          h('rect', { x: 0, y: H * 0.62 - 8, width: W, height: 10, fill: '#f5ead8' }),
          h('g', { opacity: 0.92 },
            h('rect', { x: 390, y: 46, width: 76, height: 60, rx: 3, fill: '#7c573b' }),
            h('rect', { x: 398, y: 54, width: 60, height: 44, fill: '#8db6b0' }),
            h('circle', { cx: 427, cy: 73, r: 11, fill: '#f5c76b' }),
            h('rect', { x: 520, y: 92, width: 104, height: 7, rx: 3, fill: '#7a5838' }),
            h('rect', { x: 535, y: 63, width: 14, height: 29, fill: '#b4453a' }),
            h('rect', { x: 552, y: 70, width: 13, height: 22, fill: '#315b78' }),
            h('rect', { x: 568, y: 59, width: 16, height: 33, fill: '#d49a45' })
          ),
          ownerNear && h('g', { opacity: 0.82 },
            h('rect', { x: 724, y: 82, width: 31, height: 96, rx: 10, fill: '#405168' }),
            h('circle', { cx: 740, cy: 68, r: 15, fill: '#d6a47f' }),
            h('path', { d: 'M 728 120 Q 682 136 651 170', fill: 'none', stroke: '#d6a47f', strokeWidth: 9, strokeLinecap: 'round' })
          ),
          h('rect', { x: 0, y: H * 0.62, width: W, height: H * 0.38, fill: '#9a7858' }),
          h('path', { d: 'M 0 ' + (H * 0.62 + 30) + ' L ' + W + ' ' + (H * 0.62 + 30) + ' M 0 ' + (H * 0.62 + 60) + ' L ' + W + ' ' + (H * 0.62 + 60), stroke: '#7a5838', strokeWidth: 1, opacity: 0.5 }),
          h('ellipse', { cx: 445, cy: 241, rx: 150, ry: 31, fill: '#b65b4f', opacity: 0.80 }),
          h('ellipse', { cx: 445, cy: 241, rx: 122, ry: 24, fill: 'none', stroke: '#e4a47c', strokeWidth: 2, opacity: 0.65 }),
          // Window frame on left
          h('rect', { x: 60, y: 50, width: 110, height: 110, fill: 'none', stroke: '#5a4030', strokeWidth: 4 }),
          h('rect', { x: 60, y: 50, width: 110, height: 110, fill: skyBot, opacity: 0.7 }),
          h('line', { x1: 115, y1: 50, x2: 115, y2: 160, stroke: '#5a4030', strokeWidth: 2 }),
          // Cardboard scratcher / scratching post (only if env good)
          beddingClean && h('g', null,
            h('rect', { x: 600, y: 145, width: 28, height: 90, fill: '#a06030', rx: 2 }),
            h('rect', { x: 596, y: 138, width: 36, height: 10, fill: '#7a4020', rx: 2 }),
            h('path', { d: 'M 600 175 L 628 175 M 600 195 L 628 195', stroke: '#5a3010', strokeWidth: 0.5 })
          ),
          // Toy mouse if enrichment
          hasToy && h('g', null,
            h('ellipse', { cx: 660, cy: 240, rx: 12, ry: 6, fill: '#9ca3af' }),
            h('circle', { cx: 670, cy: 238, r: 4, fill: '#9ca3af' }),
            h('path', { d: 'M 648 240 Q 638 244 632 250', stroke: '#9ca3af', strokeWidth: 2, fill: 'none' })
          ),
          // Litter box (always shown — it's always needed)
          h('g', null,
            h('rect', { x: 200, y: 234, width: 70, height: 20, fill: beddingClean ? '#c0a888' : '#8a7060', rx: 2 }),
            h('rect', { x: 200, y: 230, width: 70, height: 6, fill: beddingClean ? '#a08868' : '#6a5040' })
          ),
          // Food bowl
          h('g', null,
            h('ellipse', { cx: 320, cy: 244, rx: 22, ry: 6, fill: '#3b4252' }),
            h('rect', { x: 300, y: 232, width: 40, height: 12, fill: '#5a6a7a', rx: 2 }),
            bowlFull && h('ellipse', { cx: 320, cy: 234, rx: 16, ry: 3, fill: '#c0a060' })
          ),
          h('g', null,
            h('ellipse', { cx: 374, cy: 244, rx: 20, ry: 6, fill: '#334155' }),
            h('rect', { x: 356, y: 233, width: 36, height: 11, fill: '#64748b', rx: 3 }),
            h('ellipse', { cx: 374, cy: 235, rx: 14, ry: 3, fill: '#7dd3fc', opacity: 0.88 })
          ),
          // ── Cat body — loaf when content, alert when happy, hidden when distressed ──
          h('ellipse', { cx: mood === 'distressed' ? 130 : 430, cy: 244, rx: mood === 'distressed' ? 54 : 70, ry: 10, fill: '#1f2937', opacity: 0.20 }),
          mood === 'distressed'
            ? h('g', { filter: 'url(#pets-soft-shadow-' + dayIdx + ')' },
                h('rect', { x: 72, y: 194, width: 122, height: 42, rx: 5, fill: '#72533d' }),
                h('rect', { x: 66, y: 188, width: 134, height: 11, rx: 4, fill: '#8d6849' }),
                h('rect', { x: 82, y: 230, width: 9, height: 24, rx: 2, fill: '#553b2b' }),
                h('rect', { x: 174, y: 230, width: 9, height: 24, rx: 2, fill: '#553b2b' }),
                // Cat hidden under bed/box — only ears show behind scratching post
                h('ellipse', { cx: 130, cy: 234, rx: 14, ry: 6, fill: catColor, opacity: 0.6 }),
                h('path', { d: 'M 122 230 L 124 222 L 128 228 Z M 138 230 L 136 222 L 132 228 Z', fill: catColor })
              )
            : h('g', { className: 'petslab-breathe', filter: 'url(#pets-soft-shadow-' + dayIdx + ')', style: { transformOrigin: '50% 100%' } },
                // Body (loaf)
                h('ellipse', { cx: 430, cy: 215 + bodyDip2, rx: 56, ry: 26, fill: catColor }),
                h('ellipse', { cx: 430, cy: 222 + bodyDip2, rx: 44, ry: 12, fill: catBelly }),
                // Tail
                h('path', { d: tail2, fill: catColor }),
                // Head
                h('circle', { cx: 388, cy: 178 + bodyDip2 * 0.5, r: 26, fill: catColor }),
                // Ears (triangle)
                mood === 'stressed'
                  ? h('g', null,
                      h('path', { d: 'M 370 164 Q 356 158 350 166 Q 363 172 380 168 Z', fill: catColor }),
                      h('path', { d: 'M 402 164 Q 416 158 424 166 Q 412 172 396 168 Z', fill: catColor })
                    )
                  : h('g', null,
                      h('path', { d: 'M 370 162 L 374 144 L 382 158 Z', fill: catColor }),
                      h('path', { d: 'M 406 162 L 402 144 L 394 158 Z', fill: catColor }),
                      h('path', { d: 'M 372 158 L 376 150 L 380 156 Z', fill: '#e8c5a0' })
                    ),
                // Eyes (almond) — slow-blink if happy
                eyeOpen2
                  ? h('g', { className: mood === 'happy' ? 'petslab-blink' : '' },
                      h('ellipse', { cx: 380, cy: 175 + bodyDip2 * 0.5, rx: 4, ry: mood === 'happy' ? 2.5 : 4, fill: '#84cc16' }),
                      h('ellipse', { cx: 396, cy: 175 + bodyDip2 * 0.5, rx: 4, ry: mood === 'happy' ? 2.5 : 4, fill: '#84cc16' }),
                      h('rect', { x: 379.5, y: 173 + bodyDip2 * 0.5, width: 1, height: 4, fill: '#1a1a1a' }),
                      h('rect', { x: 395.5, y: 173 + bodyDip2 * 0.5, width: 1, height: 4, fill: '#1a1a1a' })
                    )
                  : h('g', null,
                      h('path', { d: 'M 376 175 L 384 175', stroke: '#1a1a1a', strokeWidth: 1.5 }),
                      h('path', { d: 'M 392 175 L 400 175', stroke: '#1a1a1a', strokeWidth: 1.5 })
                    ),
                // Nose + whiskers
                h('path', { d: 'M 386 184 L 392 184 L 389 188 Z', fill: '#e8c5a0' }),
                h('path', { d: 'M 370 186 L 380 186 M 370 188 L 380 188 M 398 186 L 408 186 M 398 188 L 408 188', stroke: '#fff', strokeWidth: 0.5, opacity: 0.7 }),
                // Front paws tucked under (loaf)
                h('rect', { x: 408, y: 235 + bodyDip2, width: 12, height: 6, fill: catColor, rx: 3 }),
                h('rect', { x: 432, y: 235 + bodyDip2, width: 12, height: 6, fill: catColor, rx: 3 })
              )
        );
      } else {
        // Rabbit scene
        var rabbColor = 'url(#pets-rabbit-coat-' + dayIdx + ')';
        var rabbBelly = '#d8c0a8';
        var bodyDip3 = mood === 'distressed' ? 16 : mood === 'stressed' ? 8 : 0;
        var earUp = mood === 'happy' || mood === 'content';
        var eyeOpen3 = mood === 'distressed' ? false : true;
        var bodyClass = mood === 'happy' ? 'petslab-hop' : (mood !== 'distressed' ? 'petslab-breathe' : '');

        scene = h('g', null,
          // Hay-strewn floor
          // Indoor free-roam pen with a warm wall, daylight window, and mat.
          h('rect', { x: 0, y: 0, width: W, height: H * 0.62, fill: 'url(#pets-pen-' + dayIdx + ')' }),
          h('rect', { x: 0, y: H * 0.62 - 8, width: W, height: 10, fill: '#f5ead8' }),
          h('g', { opacity: 0.88 },
            h('rect', { x: 278, y: 42, width: 150, height: 92, rx: 4, fill: skyBot }),
            h('rect', { x: 272, y: 36, width: 162, height: 104, rx: 4, fill: 'none', stroke: '#86664a', strokeWidth: 7 }),
            h('line', { x1: 353, y1: 38, x2: 353, y2: 138, stroke: '#86664a', strokeWidth: 3 }),
            h('line', { x1: 275, y1: 88, x2: 431, y2: 88, stroke: '#86664a', strokeWidth: 3 })
          ),
          ownerNear && h('g', { opacity: 0.78 },
            h('rect', { x: 725, y: 86, width: 34, height: 88, rx: 10, fill: '#5d6675' }),
            h('circle', { cx: 742, cy: 72, r: 15, fill: '#d6a47f' }),
            h('path', { d: 'M 728 125 Q 684 146 650 187', fill: 'none', stroke: '#d6a47f', strokeWidth: 9, strokeLinecap: 'round' })
          ),
          h('rect', { x: 0, y: H * 0.62, width: W, height: H * 0.38, fill: '#c8a868' }),
          h('rect', { x: 16, y: H * 0.62 + 12, width: W - 32, height: H * 0.38 - 22, rx: 22, fill: '#d8c8a0', opacity: 0.72 }),
          h('path', { d: 'M 20 174 L 20 272 M 75 174 L 75 272 M 725 174 L 725 272 M 780 174 L 780 272', stroke: '#818895', strokeWidth: 3, opacity: 0.50 }),
          // Hay strands
          h('path', { d: 'M 30 230 L 50 222 M 70 244 L 88 234 M 700 224 L 720 220 M 760 240 L 780 232', stroke: '#a08438', strokeWidth: 1.5 }),
          // Cage edges (very subtle vertical bars at far left/right)
          h('rect', { x: 0, y: 80, width: 4, height: 200, fill: '#8a8a8a', opacity: 0.6 }),
          h('rect', { x: 796, y: 80, width: 4, height: 200, fill: '#8a8a8a', opacity: 0.6 }),
          // Hay pile (always — rabbits need 24/7 hay)
          h('g', null,
            h('ellipse', { cx: 240, cy: 240, rx: 50, ry: 14, fill: '#d8b85a' }),
            h('path', { d: 'M 200 232 L 210 220 L 218 232 M 234 226 L 242 214 L 248 226 M 268 230 L 276 218 L 282 230', stroke: '#a08438', strokeWidth: 1.2, fill: 'none' })
          ),
          // Water bottle
          h('g', null,
            h('rect', { x: 668, y: 158, width: 22, height: 50, fill: '#d4d4d8', rx: 3 }),
            h('rect', { x: 672, y: 162, width: 14, height: 36, fill: '#7dd3fc', opacity: 0.85 }),
            h('rect', { x: 676, y: 208, width: 6, height: 12, fill: '#71717a' })
          ),
          // Hidey box / tunnel (only if env good)
          beddingClean && h('g', null,
            h('rect', { x: 60, y: 200, width: 90, height: 50, fill: '#8a6a48', rx: 4 }),
            h('rect', { x: 60, y: 200, width: 90, height: 8, fill: '#6a4a28', rx: 4 }),
            h('ellipse', { cx: 105, cy: 240, rx: 16, ry: 10, fill: '#1a1a1a', opacity: 0.7 })
          ),
          // Toy / chew block if enrichment
          hasToy && h('rect', { x: 600, y: 232, width: 24, height: 16, fill: '#d4a060', rx: 2, transform: 'rotate(-8 612 240)' }),
          // ── Rabbit body — loaf when content, hopping when happy, hunched when stressed ──
          h('ellipse', { cx: mood === 'distressed' ? 240 : 430, cy: 246, rx: 67, ry: 10, fill: '#1f2937', opacity: 0.18 }),
          h('g', { className: bodyClass, transform: mood === 'distressed' ? 'translate(-190 0)' : null, filter: 'url(#pets-soft-shadow-' + dayIdx + ')', style: { transformOrigin: '50% 100%' } },
            // Body (compact loaf shape)
            h('ellipse', { cx: 430, cy: 220 + bodyDip3, rx: 50, ry: 22, fill: rabbColor }),
            // Belly
            h('ellipse', { cx: 430, cy: 230 + bodyDip3, rx: 38, ry: 8, fill: rabbBelly }),
            // Hindquarter / haunch
            h('ellipse', { cx: 462, cy: 218 + bodyDip3, rx: 22, ry: 18, fill: rabbColor }),
            // Cottontail
            h('circle', { cx: 480, cy: 214 + bodyDip3, r: 8, fill: '#fff' }),
            // Head (front, slightly down)
            h('circle', { cx: 388, cy: 200 + bodyDip3 * 0.5, r: 22, fill: rabbColor }),
            // Ears
            earUp
              ? h('g', null,
                  h('ellipse', { cx: 378, cy: 168 + bodyDip3 * 0.5, rx: 5, ry: 22, fill: rabbColor }),
                  h('ellipse', { cx: 378, cy: 168 + bodyDip3 * 0.5, rx: 2.5, ry: 17, fill: '#e8c8a8' }),
                  h('ellipse', { cx: 396, cy: 168 + bodyDip3 * 0.5, rx: 5, ry: 22, fill: rabbColor }),
                  h('ellipse', { cx: 396, cy: 168 + bodyDip3 * 0.5, rx: 2.5, ry: 17, fill: '#e8c8a8' })
                )
              : h('g', null,
                  // Ears flat back when stressed
                  h('ellipse', { cx: 396, cy: 192 + bodyDip3 * 0.5, rx: 18, ry: 5, fill: rabbColor })
                ),
            // Eyes (round)
            eyeOpen3
              ? h('g', null,
                  h('circle', { cx: 380, cy: 200 + bodyDip3 * 0.5, r: 3, fill: '#1a1a1a' }),
                  h('circle', { cx: 396, cy: 200 + bodyDip3 * 0.5, r: 3, fill: '#1a1a1a' }),
                  h('circle', { cx: 381, cy: 199 + bodyDip3 * 0.5, r: 0.8, fill: '#fff' })
                )
              : h('g', null,
                  h('path', { d: 'M 377 200 L 383 200', stroke: '#1a1a1a', strokeWidth: 1.5 }),
                  h('path', { d: 'M 393 200 L 399 200', stroke: '#1a1a1a', strokeWidth: 1.5 })
                ),
            // Nose / mouth (Y shape)
            h('path', { d: 'M 388 212 L 388 215 M 388 215 L 385 218 M 388 215 L 391 218', stroke: '#1a1a1a', strokeWidth: 1, fill: 'none' })
          )
        );
      }

      // ── Status chips — visible call-outs of what's working / what's not ──
      var eventArt = sceneEvent.kind === 'rain'
        ? h('g', { opacity: 0.58, 'aria-hidden': 'true' },
            h('path', { d: 'M 90 28 L 82 58 M 130 20 L 122 50 M 170 34 L 162 64 M 620 24 L 612 54 M 660 18 L 652 48 M 700 32 L 692 62', stroke: '#dbeafe', strokeWidth: 3, strokeLinecap: 'round' }),
            h('ellipse', { cx: 112, cy: 228, rx: 48, ry: 7, fill: '#7dd3fc', opacity: 0.36 }),
            h('ellipse', { cx: 660, cy: 228, rx: 42, ry: 6, fill: '#7dd3fc', opacity: 0.30 })
          )
        : sceneEvent.kind === 'vet'
          ? h('g', { opacity: 0.9, 'aria-hidden': 'true' },
              h('rect', { x: 664, y: 174, width: 58, height: 44, rx: 5, fill: '#fef3c7', stroke: '#b45309', strokeWidth: 2 }),
              h('path', { d: 'M 693 184 L 693 207 M 681 195 L 705 195', stroke: '#dc2626', strokeWidth: 6, strokeLinecap: 'round' }),
              h('path', { d: 'M 673 174 Q 693 162 713 174', fill: 'none', stroke: '#b45309', strokeWidth: 3 })
            )
          : sceneEvent.kind === 'travel'
            ? h('g', { opacity: 0.9, 'aria-hidden': 'true' },
                h('rect', { x: 650, y: 200, width: 78, height: 42, rx: 6, fill: '#315b78', stroke: '#172554', strokeWidth: 2 }),
                h('path', { d: 'M 676 200 L 676 190 Q 689 182 702 190 L 702 200', fill: 'none', stroke: '#fbbf24', strokeWidth: 4 }),
                h('line', { x1: 689, y1: 202, x2: 689, y2: 241, stroke: '#fbbf24', strokeWidth: 2 })
              )
            : sceneEvent.kind === 'bbq'
              ? h('g', { opacity: 0.88, 'aria-hidden': 'true' },
                  h('rect', { x: 646, y: 213, width: 72, height: 16, rx: 4, fill: '#374151' }),
                  h('path', { d: 'M 654 213 L 661 194 M 710 213 L 703 194', stroke: '#374151', strokeWidth: 4 }),
                  h('path', { d: 'M 674 190 Q 663 176 675 164 Q 684 153 676 143 M 694 190 Q 706 175 694 163 Q 686 153 695 144', fill: 'none', stroke: '#e5e7eb', strokeWidth: 3, strokeLinecap: 'round' })
                )
              : sceneEvent.kind === 'noise'
                ? h('g', { opacity: 0.88, 'aria-hidden': 'true' },
                    h('path', { d: 'M 660 82 L 674 82 L 690 68 L 690 108 L 674 94 L 660 94 Z', fill: '#64748b' }),
                    h('path', { d: 'M 700 74 Q 716 88 700 102 M 712 64 Q 738 88 712 112', fill: 'none', stroke: '#f59e0b', strokeWidth: 3, strokeLinecap: 'round' })
                  )
                : sceneEvent.kind === 'outdoors'
                  ? h('g', { opacity: 0.82, 'aria-hidden': 'true' },
                      h('circle', { cx: 692, cy: 68, r: 18, fill: '#fde68a' }),
                      h('path', { d: 'M 674 68 Q 692 51 710 68', fill: 'none', stroke: '#64748b', strokeWidth: 2 }),
                      h('path', { d: 'M 710 84 Q 724 74 738 84 Q 724 94 710 84 Z', fill: '#475569' })
                    )
                  : sceneEvent.kind === 'water'
                    ? h('g', { opacity: 0.9, 'aria-hidden': 'true' },
                        h('path', { d: 'M 690 165 C 674 185 676 198 690 201 C 704 198 706 185 690 165 Z', fill: '#7dd3fc', stroke: '#0369a1', strokeWidth: 2 })
                      )
                    : null;
      var chips = [
        { label: bowlFull ? 'Fed' : 'Hungry',          ok: bowlFull,    icon: '🍖' },
        { label: hasToy ? 'Enriched' : 'Bored',        ok: hasToy,      icon: '🧩' },
        { label: ownerNear ? 'Bonded' : 'Lonely',      ok: ownerNear,   icon: '💗' },
        { label: beddingClean ? 'Clean home' : 'Dirty', ok: beddingClean, icon: '🏠' }
      ];

      return h('div', { className: 'petslab-sim-stage petslab-care-stage',
        style: {
          position: 'relative',
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--allo-stem-canvas, #0f172a)',
          border: '1px solid ' + T.border,
          boxShadow: '0 4px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
          marginBottom: 12
        }
      },
        h('svg', { preserveAspectRatio: 'xMidYMid slice',
          viewBox: '0 0 ' + W + ' ' + H,
          role: 'img',
          'aria-label': species + ' care scene. Day ' + (dayIdx + 1) + ' of ' + totalDays + '. Mood: ' + mood + '. ' + moodCaption(),
          style: { display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%' }
        },
          backdrop,
          scene,
          eventArt
        ),
        // Mood caption ribbon
        h('div', {
          style: {
            position: 'absolute',
            left: 12, top: 12,
            padding: '6px 10px',
            background: 'rgba(15,23,42,0.78)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: mood === 'happy' ? '#86efac' : mood === 'content' ? '#fde68a' : mood === 'stressed' ? '#fdba74' : '#fca5a5',
            border: '1px solid ' + (mood === 'happy' ? 'rgba(134,239,172,0.5)' : mood === 'content' ? 'rgba(253,230,138,0.5)' : mood === 'stressed' ? 'rgba(253,186,116,0.5)' : 'rgba(252,165,165,0.5)'),
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }
        }, moodCaption()),
        hasChosen && h('div', {
          className: 'petslab-care-decision',
          'aria-label': 'Daily decision recorded',
          style: {
            position: 'absolute', right: 12, top: 12,
            padding: '6px 9px', borderRadius: 999,
            background: 'rgba(54,83,20,0.88)', color: '#ecfccb',
            border: '1px solid rgba(190,242,100,0.62)',
            boxShadow: '0 5px 16px rgba(0,0,0,0.24)',
            fontSize: 10, fontWeight: 900, letterSpacing: '0.045em',
            textTransform: 'uppercase'
          }
        }, '\u2713 Decision logged'),
        h('div', {
          className: 'petslab-care-event',
          role: 'note',
          'aria-label': sceneEvent.label + ': ' + sceneEvent.detail
        },
          h('span', { className: 'petslab-care-event-icon', 'aria-hidden': 'true' }, sceneEvent.icon),
          h('span', null,
            h('strong', null, sceneEvent.label),
            h('small', null, sceneEvent.detail)
          )
        ),
        // Status chip strip (bottom)
        h('div', { className: 'petslab-care-chips',
          style: {
            position: 'absolute',
            left: 12, right: 12, bottom: 12,
            display: 'flex', gap: 6, flexWrap: 'wrap'
          }
        },
          chips.map(function(c, i) {
            return h('div', {
              key: i,
              'aria-label': c.label + (c.ok ? ' (good)' : ' (needs attention)'),
              style: {
                fontSize: 11, fontWeight: 700,
                padding: '4px 8px', borderRadius: 6,
                background: c.ok ? 'rgba(132,204,22,0.20)' : 'rgba(220,38,38,0.20)',
                color: c.ok ? '#a3e635' : '#fca5a5',
                border: '1px solid ' + (c.ok ? 'rgba(132,204,22,0.5)' : 'rgba(220,38,38,0.5)'),
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)'
              }
            }, c.icon + ' ' + c.label);
          })
        ),

        // ── Interactive care zones ──
        // Five clickable zones overlaying the scene let the student
        // ACTIVELY care for the animal (pet, feed, play, water, clean)
        // instead of only choosing scenarios. Each is once-per-day.
        // Positioned over the relevant scene element so the connection
        // between "click the bowl" and "the bowl gets refilled" is direct.
        onInteract && (function() {
          var todayInts = ((careSim.dailyInteractions || {})[dayIdx]) || {};
          // Each zone: { kind, leftPct, topPct, icon, label }
          // Positions tuned to where the items appear in the per-species SVGs.
          var zoneMaps = { dog: [
            { kind: 'pet',   leftPct: 52, topPct: 65, icon: '🤚', label: 'Pet · +bond' },
            { kind: 'feed',  leftPct: 31, topPct: 85, icon: '🍖', label: 'Feed · +phys' },
            { kind: 'water', leftPct: 40, topPct: 88, icon: '💧', label: 'Water · +phys' },
            { kind: 'play',  leftPct: 75, topPct: 85, icon: '🧩', label: 'Play · +mental' },
            { kind: 'clean', leftPct: 12, topPct: 90, icon: '🧹', label: 'Clean · +env' }
          ],
            cat: [
              { kind: 'pet', leftPct: 54, topPct: 72, icon: '\uD83E\uDD1A', label: 'Pet \u00b7 +bond' },
              { kind: 'feed', leftPct: 40, topPct: 86, icon: '\uD83C\uDF56', label: 'Feed \u00b7 +phys' },
              { kind: 'water', leftPct: 47, topPct: 86, icon: '\uD83D\uDCA7', label: 'Water \u00b7 +phys' },
              { kind: 'play', leftPct: 83, topPct: 86, icon: '\uD83E\uDDE9', label: 'Play \u00b7 +mental' },
              { kind: 'clean', leftPct: 29, topPct: 87, icon: '\uD83E\uDDF9', label: 'Clean \u00b7 +env' }
            ],
            rabbit: [
              { kind: 'pet', leftPct: 54, topPct: 76, icon: '\uD83E\uDD1A', label: 'Pet \u00b7 +bond' },
              { kind: 'feed', leftPct: 30, topPct: 86, icon: '\uD83C\uDF56', label: 'Feed \u00b7 +phys' },
              { kind: 'water', leftPct: 85, topPct: 68, icon: '\uD83D\uDCA7', label: 'Water \u00b7 +phys' },
              { kind: 'play', leftPct: 77, topPct: 86, icon: '\uD83E\uDDE9', label: 'Play \u00b7 +mental' },
              { kind: 'clean', leftPct: 13, topPct: 86, icon: '\uD83E\uDDF9', label: 'Clean \u00b7 +env' }
            ]
          };
          var zones = zoneMaps[species] || zoneMaps.dog;
          var lastAction = careSim.lastInteract || null;
          var lastZone = null;
          if (lastAction && todayInts[lastAction.kind]) {
            for (var zi = 0; zi < zones.length; zi++) {
              if (zones[zi].kind === lastAction.kind) { lastZone = zones[zi]; break; }
            }
          }
          // Want bubble — when an individual meter is critically low,
          // float a thought icon above the animal pointing at what to do.
          var lowestKey = null, lowestVal = Infinity;
          [['phys', careSim.phys, 'feed'], ['ment', careSim.ment, 'play'], ['soc', careSim.soc, 'pet'], ['env', careSim.env, 'clean']].forEach(function(t) {
            if (t[1] < 40 && t[1] < lowestVal) { lowestVal = t[1]; lowestKey = t; }
          });
          var wantIcon = lowestKey
            ? (lowestKey[2] === 'feed' ? '🍖' : lowestKey[2] === 'play' ? '🧩' : lowestKey[2] === 'pet' ? '💗' : '🧹')
            : null;

          return h('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none' } },
            lastZone && h('div', {
              key: 'care-pop-' + (lastAction.t || 0),
              className: 'petslab-action-pop',
              'aria-hidden': 'true',
              style: {
                position: 'absolute',
                left: lastZone.leftPct + '%', top: Math.max(12, lastZone.topPct - 7) + '%',
                transform: 'translate(-50%,-42%)',
                padding: '6px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.96)', color: '#365314',
                border: '2px solid #84cc16', boxShadow: '0 8px 24px rgba(54,83,20,0.28)',
                fontSize: 13, fontWeight: 900
              }
            }, lastZone.icon + ' Done'),
            // Want bubble (positioned above animal)
            wantIcon && h('div', {
              'aria-hidden': 'true',
              style: {
                position: 'absolute',
                left: '52%', top: '18%',
                transform: 'translate(-50%, 0)',
                background: 'rgba(255,255,255,0.94)',
                border: '2px solid #fca5a5',
                borderRadius: 16,
                padding: '4px 10px',
                fontSize: 18,
                fontWeight: 700,
                color: '#7f1d1d',
                boxShadow: '0 4px 14px rgba(220,38,38,0.30)',
                animation: 'petslab-breathe 2.1s ease-in-out infinite',
                pointerEvents: 'none'
              }
            },
              wantIcon, ' ',
              h('span', { style: { fontSize: 11 } }, 'wants this')
            ),
            // Interactive zones
            zones.map(function(z) {
              var done = !!todayInts[z.kind];
              return h('button', {
                key: z.kind, className: 'petslab-care-zone petslab-care-zone--' + z.kind,
                'data-pets-focusable': true,
                onClick: function(ev) { ev.stopPropagation(); onInteract(z.kind); },
                'aria-label': (done ? 'Already done today: ' : 'Care interaction: ') + z.label,
                title: done ? 'Already done today' : z.label,
                style: {
                  position: 'absolute',
                  left: z.leftPct + '%', top: z.topPct + '%',
                  transform: 'translate(-50%, -50%)',
                  width: 44, height: 44,
                  borderRadius: '50%',
                  border: '2px solid ' + (done ? 'rgba(132,204,22,0.7)' : 'rgba(255,255,255,0.65)'),
                  background: done
                    ? 'rgba(132,204,22,0.30)'
                    : 'rgba(15,23,42,0.55)',
                  color: 'var(--allo-stem-text, #ffffff)',
                  fontSize: 18,
                  cursor: done ? 'default' : 'pointer',
                  pointerEvents: 'auto',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  boxShadow: done
                    ? '0 0 8px rgba(132,204,22,0.55)'
                    : '0 0 0 1px rgba(0,0,0,0.25), 0 4px 10px rgba(0,0,0,0.3)',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  opacity: done ? 0.85 : 1
                }
              }, done ? '✓' : z.icon);
            })
          );
        })()
      );
    }

    function renderCareSim() {
      var careSim = d.careSim || null;
      function startSim(species) {
        var startMoney = CARE_SIM_START_MONEY[species] != null ? CARE_SIM_START_MONEY[species] : 500;
        upd('careSim', {
          species: species, day: 0, choices: [],
          phys: 50, ment: 50, soc: 50, env: 50,
          en: 100, money: startMoney, startMoney: startMoney,
          lowMoney: false, tiredCare: 0, done: false
        });
      }
      function chooseAction(choiceId) {
        if (!careSim || careSim.done) return;
        var dayObj = CARE_SIM_DAYS[careSim.species][careSim.day];
        var choice = null;
        for (var i = 0; i < dayObj.choices.length; i++) if (dayObj.choices[i].id === choiceId) { choice = dayObj.choices[i]; break; }
        if (!choice) return;
        var existing = careSim.choices || [];
        if (existing[careSim.day] != null) return;  // already chose for this day
        var nextChoices = existing.slice();
        nextChoices[careSim.day] = { dayLabel: dayObj.label, choiceId: choiceId, choiceLabel: choice.label, note: choice.note, effects: choice.effects };
        var clamp = function(v) { return Math.max(0, Math.min(100, v)); };
        var newPhys = clamp(careSim.phys + (choice.effects.phys || 0));
        var newMent = clamp(careSim.ment + (choice.effects.ment || 0));
        var newSoc  = clamp(careSim.soc  + (choice.effects.soc  || 0));
        var newEnv  = clamp(careSim.env  + (choice.effects.env  || 0));
        var newEn   = clamp(careSim.en   + (choice.effects.en   || 0));
        var newMoney = careSim.money + (choice.effects.money || 0);
        upd('careSim', Object.assign({}, careSim, {
          choices: nextChoices,
          phys: newPhys, ment: newMent, soc: newSoc, env: newEnv,
          en: newEn, money: newMoney,
          lowMoney: careSim.lowMoney || newMoney < 0
        }));
      }
      function nextDay() {
        if (!careSim) return;
        if (careSim.day < CARE_SIM_DAYS[careSim.species].length - 1) {
          // Overnight rest. Energy is a renewable resource, not a one-way
          // drain — a week of full care stays sustainable, but stacking
          // energy-expensive days on top of full care still wears you down.
          var rested = Math.max(0, Math.min(100, careSim.en + CARE_SIM_ENERGY_RECOVERY));
          upd('careSim', Object.assign({}, careSim, { day: careSim.day + 1, en: rested }));
        } else {
          // Done — assess + award badge if criteria met.
          // All FOUR welfare domains gate the badge. Environmental was
          // previously omitted, which let a student earn "Caring Pet-Owner"
          // while the animal's housing was neglected — incoherent with the
          // Five Domains framing this tool teaches elsewhere, and worst for
          // exactly the caged species where habitat matters most.
          var c = careSim;
          var earned = (c.phys >= 70 && c.ment >= 70 && c.soc >= 70 && c.env >= 70 && !c.lowMoney);
          if (earned) awardBadge('pets_caregiver', 'Caring Pet-Owner (week complete)');
          upd('careSim', Object.assign({}, careSim, { done: true, badgeEarned: earned }));
        }
      }

      // Routine-care interactions. Each can be done ONCE per day. The
      // scenario choice still drives the headline outcome of the day,
      // but these little daily interactions let the student feel like
      // they're actually caring for the animal between scenarios:
      // pet the dog, refill the bowl, swap out the toy, top off the
      // water. Costs a sliver of player energy / money so that
      // spamming doesn't trivially max the meters.
      var INTERACT_EFFECTS = {
        pet:   { soc: 4, en: -2, money: 0,  toast: '💗 Calm pet & talk: bond strengthens.',          eff: '+4 social · -2 energy' },
        feed:  { phys: 5, en: -1, money: -3, toast: '🍖 Bowl topped off with fresh food.',            eff: '+5 physical · -$3 · -1 energy' },
        play:  { ment: 5, en: -4, money: 0,  toast: '🧩 Play session: tail wag / purr / binky.',       eff: '+5 mental · -4 energy' },
        water: { phys: 2, en: -1, money: 0,  toast: '💧 Fresh water — small daily basic.',            eff: '+2 physical · -1 energy' },
        clean: { env: 5, en: -3, money: 0,  toast: '🏠 Habitat scrub: bedding clean, smells right.', eff: '+5 environment · -3 energy' }
      };
      function petInteract(kind) {
        if (!careSim || careSim.done) return;
        var d0 = careSim.day;
        var ints = Object.assign({}, (careSim.dailyInteractions || {}));
        var todayInts = Object.assign({}, (ints[d0] || {}));
        if (todayInts[kind]) {
          if (addToast) addToast('Already did that today. Try Next Day.');
          return;
        }
        var fx = INTERACT_EFFECTS[kind];
        if (!fx) return;
        todayInts[kind] = true;
        ints[d0] = todayInts;
        var clamp01 = function(v) { return Math.max(0, Math.min(100, v)); };
        // Running on empty: a depleted caregiver still shows up, but the
        // care lands at half strength. Energy still costs the same — being
        // tired doesn't make the chore cheaper.
        var tired = careSim.en < CARE_SIM_TIRED_BELOW;
        var scale = tired ? 0.5 : 1;
        upd('careSim', Object.assign({}, careSim, {
          phys: clamp01(careSim.phys + (fx.phys || 0) * scale),
          ment: clamp01(careSim.ment + (fx.ment || 0) * scale),
          soc:  clamp01(careSim.soc  + (fx.soc  || 0) * scale),
          env:  clamp01(careSim.env  + (fx.env  || 0) * scale),
          en:   clamp01(careSim.en   + (fx.en   || 0)),
          money: careSim.money + (fx.money || 0),
          lowMoney: careSim.lowMoney || (careSim.money + (fx.money || 0)) < 0,
          tiredCare: (careSim.tiredCare || 0) + (tired ? 1 : 0),
          dailyInteractions: ints,
          lastInteract: { kind: kind, t: Date.now() }
        }));
        var msg = tired
          ? fx.toast + ' (You are running on empty — half effect.)'
          : fx.toast;
        if (addToast) addToast(msg);
        if (typeof petsAnnounce === 'function') {
          petsAnnounce(msg + ' ' + (tired ? fx.eff + ', halved by fatigue' : fx.eff));
        }
      }
      function reset() { upd('careSim', null); }
      // Species picker
      if (!careSim) {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📅 Pet-Care Week (sim)'),
          h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 16 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.accentHi } }, '🎮 Live a week as a pet owner'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.65 } },
              'Pick a species and walk through 7 days of decisions. Real trade-offs: walks vs. plans, vet bills vs. budget, comfort vs. enrichment. Four welfare meters track how the pet is doing; your energy + money meters track how YOU are doing.'
            ),
            h('p', { style: { margin: 0, color: T.dim, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } },
              'Earn the Caring Pet-Owner badge for a week where all four welfare domains — Physical, Mental, Social, and Environmental — stay ≥70% AND money never goes negative. Your starting budget depends on the species, because their real costs do.'
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 } },
            [
              { id: 'dog',    icon: '🐕', label: 'Dog (high-energy young)', sub: 'Daily walks, training, social needs, emergency-prone' },
              { id: 'cat',    icon: '🐈', label: 'Cat (newly adopted)',     sub: 'Litter, enrichment, indoor decisions, sudden-illness risk' },
              { id: 'rabbit', icon: '🐰', label: 'Rabbit (newly home)',     sub: 'GI stasis vigilance, free-roam space, exotic-vet costs' }
            ].map(function(sp) {
              var spMoney = CARE_SIM_START_MONEY[sp.id] != null ? CARE_SIM_START_MONEY[sp.id] : 500;
              return h('button', { key: sp.id, 'data-pets-focusable': true,
                onClick: function() { startSim(sp.id); },
                'aria-label': sp.label + '. Starting budget $' + spMoney + '. ' + sp.sub,
                style: btn({ padding: 16, fontSize: 14, textAlign: 'left', minHeight: 100 })
              },
                h('div', { style: { fontSize: 28, marginBottom: 4 } }, sp.icon),
                h('div', { style: { fontWeight: 800, color: T.accentHi, fontSize: 15, marginBottom: 4 } }, sp.label),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, sp.sub),
                h('div', { style: { fontSize: 11, color: T.dim, marginTop: 6, fontFamily: 'monospace' } },
                  'Week budget: $' + spMoney)
              );
            })
          ),
          footer()
        );
      }
      // Active sim — render meters + current day
      var allDays = CARE_SIM_DAYS[careSim.species];
      var dayObj = careSim.day < allDays.length ? allDays[careSim.day] : null;
      var thisChoice = (careSim.choices || [])[careSim.day];
      var hasChosen = thisChoice != null;
      // End of week
      if (careSim.done) {
        var c = careSim;
        var avg = (c.phys + c.ment + c.soc + c.env) / 4;
        var verdict = avg >= 80 ? '🌟 Excellent week. Your pet is thriving — and you stayed sustainable.'
          : avg >= 65 ? '👍 Solid. A few rough decisions but the pet is broadly healthy and safe.'
          : avg >= 45 ? '😬 Mixed week. Real welfare gaps. Notice where the meters dropped.'
          : '🚨 Welfare crisis. This pet would likely need rehoming — and that\'s often a moral injury for both pet and owner.';
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📅 Pet-Care Week — Reflection'),
          h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '2px solid ' + (avg >= 70 ? T.ok : T.accent), marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 18, color: T.text } }, verdict),
            c.badgeEarned && h('div', { style: { fontSize: 14, color: T.ok, marginBottom: 6 } }, '🏅 Badge earned: Caring Pet-Owner'),
            c.lowMoney && h('div', { style: { fontSize: 13, color: T.warm, marginBottom: 6 } }, '⚠ Money went negative this week. In real life this often forces hard choices — surrendering the pet, skipping vet care, or going into debt.'),
            (c.tiredCare > 0 || c.en <= 20) && h('div', { style: { fontSize: 13, color: T.warm, marginBottom: 6 } },
              c.tiredCare > 0
                ? '😮‍💨 You ran on empty for ' + c.tiredCare + ' care task' + (c.tiredCare === 1 ? '' : 's') + ' this week — those landed at half effect. Caregiver fatigue is a real welfare factor: burned-out owners miss walks, skip enrichment, and delay vet visits. Sustainable routines beat heroic ones.'
                : '😮‍💨 You finished the week nearly out of energy. That pace is hard to hold for 10–15 years. Building in rest is part of good animal care, not a break from it.'),
            // Final meters
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 10 } },
              [
                { l: '💪 Physical',      v: c.phys,  desc: 'Health, exercise, vet care' },
                { l: '🧠 Mental',        v: c.ment,  desc: 'Enrichment, novelty' },
                { l: '🧑‍🤝‍🧑 Social',         v: c.soc,   desc: 'Bonding, training' },
                { l: '🏠 Environmental', v: c.env,   desc: 'Clean, safe, appropriate' }
              ].map(function(m, i) {
                var col = m.v >= 70 ? T.ok : m.v >= 40 ? T.accentHi : T.danger;
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                  h('div', { style: { fontSize: 11, color: T.dim } }, m.l),
                  h('div', { style: { fontSize: 26, fontWeight: 800, color: col, fontFamily: 'monospace' } }, Math.round(m.v) + '%'),
                  h('div', { style: { fontSize: 10, color: T.dim } }, m.desc)
                );
              })
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: T.dim } }, '⚡ Your energy left'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: c.en >= 30 ? T.ok : T.warm, fontFamily: 'monospace' } }, Math.round(c.en) + '%')
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: T.dim } }, '💰 Money left'),
                h('div', { style: { fontSize: 22, fontWeight: 800, color: c.money >= 100 ? T.ok : c.money >= 0 ? T.accentHi : T.danger, fontFamily: 'monospace' } }, '$' + Math.round(c.money)),
                h('div', { style: { fontSize: 10, color: T.dim } },
                  'spent $' + Math.round((c.startMoney != null ? c.startMoney : 500) - c.money) + ' of $' + (c.startMoney != null ? c.startMoney : 500))
              )
            )
          ),
          // Decisions log
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi } }, '📋 Your decisions this week'),
            (c.choices || []).map(function(ch, i) {
              if (!ch) return null;
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, marginBottom: 6 } },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 2 } }, ch.dayLabel),
                h('div', { style: { fontSize: 12, color: T.text, marginBottom: 3 } }, h('strong', null, '→ '), ch.choiceLabel),
                h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.5 } }, ch.note)
              );
            })
          ),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { 'data-pets-focusable': true, onClick: reset,
              style: btnPrimary({ padding: '10px 18px' })
            }, '🔁 Try a different species'),
            h('button', { 'data-pets-focusable': true,
              onClick: function() { upd('view', 'welfare'); },
              style: btn({ padding: '10px 18px' })
            }, '🛡️ Welfare & Ethics'),
            h('button', { 'data-pets-focusable': true,
              onClick: function() { upd('view', 'cost'); },
              style: btn({ padding: '10px 18px' })
            }, '💵 Lifetime Cost')
          ),
          footer()
        );
      }
      // Active day
      var meters = h('div', { className: 'petslab-metric-grid', style: { padding: 12, borderRadius: 10, background: T.cardAlt, marginBottom: 12 } },
        h('div', { style: { gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.dim, marginBottom: 2 } },
          h('span', null, 'Day ' + (careSim.day + 1) + ' / ' + allDays.length),
          h('span', null,
            '⚡ ', Math.round(careSim.en), '%   ',
            h('span', { style: { color: careSim.money >= 0 ? T.text : T.danger } }, '💰 $' + Math.round(careSim.money))
          )
        ),
        // 4 welfare bars
        [
          { l: '💪 Phys',  v: careSim.phys, color: T.ok },
          { l: '🧠 Ment',  v: careSim.ment, color: '#7dd3fc' },
          { l: '🧑‍🤝‍🧑 Soc', v: careSim.soc,  color: T.accentHi },
          { l: '🏠 Env',   v: careSim.env,  color: '#a78bfa' }
        ].map(function(m, i) {
          return h('div', { key: i, className: 'petslab-metric-card', style: { display: 'flex', alignItems: 'center', gap: 6 } },
            h('span', { style: { fontSize: 10, color: T.dim, minWidth: 56 } }, m.l),
            h('div', { className: 'petslab-meter-track', style: { flex: 1 }, 'aria-hidden': 'true' },
              h('div', { className: 'petslab-meter-fill', style: { width: m.v + '%', background: m.color, color: m.color } })
            ),
            h('span', { style: { fontSize: 11, color: T.text, fontFamily: 'monospace', minWidth: 32, textAlign: 'right' } }, Math.round(m.v) + '%')
          );
        })
      );
      // ── Today's Care tracker — 5 interactions, done/available state ──
      var todayInts = ((careSim.dailyInteractions || {})[careSim.day]) || {};
      var careTrack = h('div', {
        style: {
          padding: '10px 12px', borderRadius: 10, background: T.cardAlt,
          border: '1px solid ' + T.border,
          marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
        }
      },
        h('div', { style: { fontSize: 11, fontWeight: 800, color: T.accentHi, textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 88 } }, '🗓 Today\'s care'),
        [
          { kind: 'pet',   icon: '🤚', label: 'Pet',    short: '+bond' },
          { kind: 'feed',  icon: '🍖', label: 'Feed',   short: '+phys -$3' },
          { kind: 'water', icon: '💧', label: 'Water',  short: '+phys' },
          { kind: 'play',  icon: '🧩', label: 'Play',   short: '+ment' },
          { kind: 'clean', icon: '🧹', label: 'Clean',  short: '+env' }
        ].map(function(c) {
          var done = !!todayInts[c.kind];
          return h('button', {
            key: c.kind, className: 'petslab-sim-button',
            'data-pets-focusable': true,
            onClick: function() { petInteract(c.kind); },
            'aria-label': (done ? 'Already done today: ' : 'Do this care: ') + c.label + ' (' + c.short + ')',
            title: done ? 'Already done today' : c.label + ' · ' + c.short,
            style: {
              fontSize: 11, fontWeight: 700,
              padding: '6px 10px', borderRadius: 8,
              border: '1px solid ' + (done ? 'rgba(132,204,22,0.55)' : T.border),
              background: done ? 'rgba(132,204,22,0.18)' : T.card,
              color: done ? '#a3e635' : T.text,
              cursor: done ? 'default' : 'pointer',
              opacity: done ? 0.85 : 1,
              boxShadow: done ? 'inset 0 0 0 1px rgba(132,204,22,0.35)' : 'none'
            }
          },
            (done ? '✓ ' : c.icon + ' ') + c.label,
            h('span', { style: { fontSize: 10, opacity: 0.7, marginLeft: 6 } }, c.short)
          );
        })
      );

      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('📅 Pet-Care Week — ' + careSim.species.charAt(0).toUpperCase() + careSim.species.slice(1)),
        // Immersive habitat scene — animal posture, ambient items, and
        // status chips reflect the current welfare meters in real time.
        // The 6th arg wires up the interactive care zones (pet/feed/water/
        // play/clean buttons that overlay the scene).
        h('div', {
          role: 'group',
          'aria-label': 'Week progress: day ' + (careSim.day + 1) + ' of ' + allDays.length + ', ' + dayObj.label,
          style: { padding: '11px 13px', marginBottom: 10, borderRadius: 12, background: 'rgba(28,18,13,0.72)', border: '1px solid ' + T.border }
        },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' } },
            h('span', { style: { color: T.muted } }, 'Seven-day care arc'),
            h('span', { style: { color: T.accentHi } }, 'Day ' + (careSim.day + 1) + ' - ' + dayObj.label)
          ),
          h('div', { className: 'petslab-day-rail', 'aria-hidden': 'true', style: { marginBottom: 0 } },
            allDays.map(function (_, dayNumber) {
              return h('span', { key: dayNumber, className: 'petslab-day-node' + (dayNumber < careSim.day ? ' is-past' : dayNumber === careSim.day ? ' is-now' : '') });
            })
          )
        ),
        renderPetScene(careSim.species, careSim, careSim.day, allDays.length, hasChosen, petInteract),
        renderCareTimeline(careSim, allDays),
        // Tap-friendly version of the same interactions, listed below the
        // scene for keyboard / touch users who'd rather see the menu.
        careTrack,
        meters,
        h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' } }, dayObj.label),
          h('p', { style: { margin: 0, fontSize: 15, color: T.text, lineHeight: 1.6 } }, dayObj.prompt)
        ),
        h('div', { role: 'radiogroup', 'aria-label': 'Choose your action',
          style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 } },
          dayObj.choices.map(function(ch) {
            var isPicked = hasChosen && thisChoice.choiceId === ch.id;
            return h('button', {
              key: ch.id, className: 'petslab-sim-choice', role: 'radio', 'aria-checked': isPicked ? 'true' : 'false',
              'data-pets-focusable': true,
              disabled: hasChosen,
              onClick: function() { chooseAction(ch.id); },
              style: btn({
                padding: '12px 14px', fontSize: 13,
                background: isPicked ? 'rgba(245,158,11,0.15)' : T.card,
                border: '2px solid ' + (isPicked ? T.accent : T.border),
                cursor: hasChosen ? 'default' : 'pointer',
                fontWeight: 600, lineHeight: 1.5
              })
            }, ch.label);
          })
        ),
        hasChosen && h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, borderLeft: '4px solid ' + T.accentHi, marginBottom: 12 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: T.accentHi, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'What happens'),
            h('p', { style: { margin: 0, fontSize: 13, color: T.text, lineHeight: 1.6 } }, thisChoice.note)
          ),
          h('button', { 'data-pets-focusable': true, onClick: nextDay,
            style: btnPrimary({ padding: '12px 24px', fontSize: 14, width: '100%' })
          }, careSim.day < allDays.length - 1 ? 'Next day →' : 'See week summary ✓')
        ),
        footer()
      );
    }

    // ── SENSORY PERSPECTIVE VIEW ─────────────────────────────
    // "Through Their Eyes": stand in a living room as a human, a dog, or a
    // cat. Everything the 3D canvas shows is ALSO stated in text below it,
    // because a simulation a student can't see is not a lesson — the panel
    // is the primary content and the canvas is the illustration.
    function renderSensory() {
      var sp = _petsSensorySpecies(sensorySpecies);
      var threeErr = !!d._threeError;
      var threeLoading = !!d._threeLoading;

      // The badge is for COMPARING, not for arriving. Seeing one viewpoint
      // teaches nothing on its own — the lesson is the difference between
      // them, so the award tracks how many of the three have been stood in.
      var sensorySeen = d.sensorySeen || {};
      function markSeen(id) {
        if (sensorySeen[id]) return;
        upd('sensorySeen', function (cur) {
          var next = Object.assign({}, cur || {});
          next[id] = true;
          return next;
        });
        var seenCount = Object.keys(sensorySeen).length + 1;
        if (seenCount >= SENSORY_SPECIES.length) {
          awardBadge('pets_sensory', 'Saw It Their Way (all three viewpoints)');
        }
      }
      function pickSpecies(id) {
        upd('sensorySpecies', id);
        markSeen(id);
        var s = _petsSensorySpecies(id);
        petsAnnounce('Now seeing as a ' + s.name + '. Eye height ' + s.eyeHeight.toFixed(2) +
          ' metres. Visual acuity ' + s.acuity + '. ' + s.note);
      }
      function toggleDusk() {
        var next = !sensoryDusk;
        upd('sensoryDusk', next);
        petsAnnounce(next
          ? 'Dusk. A human now sees very little; the dog and cat still read the room.'
          : 'Daylight restored.');
      }
      function loadEngine() {
        updMulti({ _threeLoading: true, _threeError: false });
        if (!window.StemLab || !window.StemLab.ensureThree) {
          updMulti({ _threeLoading: false, _threeError: true });
          return;
        }
        window.StemLab.ensureThree({ orbit: false }).then(function () {
          updMulti({ _threeLoading: false, _threeLoaded: true });
          petsAnnounce('3D engine ready.');
        }).catch(function () {
          updMulti({ _threeLoading: false, _threeError: true });
          petsAnnounce('The 3D engine could not load. The written comparison below still works.');
        });
      }

      // Movement pad — the same actions the keyboard exposes, for touch and
      // for anyone who navigates by pointer only.
      function padBtn(label, aria, onDown) {
        return h('button', {
          key: aria, className: 'petslab-sim-button', 'data-pets-focusable': true, 'aria-label': aria,
          disabled: sensoryStatus !== 'ready',
          onPointerDown: function () { onDown(true); },
          onPointerUp: function () { onDown(false); },
          onPointerLeave: function () { onDown(false); },
          onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') onDown(true); },
          onKeyUp: function () { onDown(false); },
          style: {
            width: 44, height: 40, borderRadius: 8, border: '1px solid ' + T.border,
            background: T.card, color: T.text, fontSize: 15, fontWeight: 800,
            cursor: sensoryStatus === 'ready' ? 'pointer' : 'not-allowed', opacity: sensoryStatus === 'ready' ? 1 : 0.48
          }
        }, label);
      }
      function key(name) {
        return function (down) {
          var v = _sensoryViewerRef.current;
          if (v) v.setKey(name, down);
        };
      }

      var seenCount = Object.keys(sensorySeen).length;
      var speciesBar = h('div', { style: { marginBottom: 10 } },
        h('div', { role: 'radiogroup', 'aria-label': 'Whose eyes to see through',
          style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          SENSORY_SPECIES.map(function (s) {
            var on = s.id === sensorySpecies;
            var seen = !!sensorySeen[s.id];
            return h('button', {
              key: s.id, role: 'radio', 'aria-checked': on ? 'true' : 'false',
              'data-pets-focusable': true,
              'aria-label': s.name + (seen ? ' (already compared)' : ' (not yet seen)'),
              onClick: function () { pickSpecies(s.id); },
              style: btn({
                padding: '8px 14px', fontSize: 13, fontWeight: 800,
                background: on ? 'rgba(245,158,11,0.16)' : T.card,
                border: '2px solid ' + (on ? s.accent : T.border),
                color: on ? s.accent : T.text
              })
            }, (seen ? '✓ ' : '') + s.icon + ' ' + s.name);
          })
        ),
        h('div', { style: { fontSize: 11, color: T.dim, marginTop: 6 } },
          seenCount >= SENSORY_SPECIES.length
            ? 'All three viewpoints compared. The differences between them are the lesson.'
            : 'Viewpoints compared: ' + seenCount + ' / ' + SENSORY_SPECIES.length + ' — the comparison is where the science is.')
      );

      // The written equivalent of the canvas. Always rendered.
      var factRows = [
        { l: 'Eye height', v: sp.eyeHeight.toFixed(2) + ' m',
          why: 'Where the world is seen FROM. A cat meets the room at ankle height.' },
        { l: 'Visual acuity', v: sp.acuity,
          why: 'How much fine detail resolves. 20/75 means the dog must stand at 20 ft to see what a human sees at 75.' },
        { l: 'Total field of view', v: sp.totalFieldDeg + '°',
          why: 'How much of the world is visible at once without turning the head.' },
        { l: 'Binocular overlap', v: sp.binocularDeg + '°',
          why: 'The band where both eyes see the same thing — where depth judgement is sharpest.' },
        { l: 'Colour vision', v: sp.dichromat ? 'Dichromat (blue / yellow)' : 'Trichromat (full colour)',
          why: sp.dichromat
            ? 'No functional red/green channel. A red ball on green grass is a grey-yellow lump on a grey-yellow field.'
            : 'Three cone types, so reds and greens separate clearly.' },
        { l: 'Low-light ability', v: sp.lowLightFactor === 1 ? 'Baseline' : 'Needs ~1/' + sp.lowLightFactor + ' the light',
          why: sp.lowLightFactor === 1
            ? 'No tapetum lucidum — human night vision is the weakest of the three.'
            : 'A reflective tapetum lucidum gives the retina a second pass at the same photons.' },
        { l: 'Flicker fusion', v: sp.flickerHz + ' Hz',
          why: 'Above this rate, flashes blend into steady light. It is why some screens look like flickering strobes to a dog.' }
      ];

      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('👁️ Through Their Eyes'),

        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('p', { style: { margin: '0 0 6px', fontSize: 13, color: T.muted, lineHeight: 1.65 } },
            'The Dogs and Cats modules tell you these animals are dichromats who trade colour for low-light and motion sensitivity. This lets you stand in a room and look through their eyes instead.'),
          h('p', { style: { margin: 0, fontSize: 11, color: T.dim, lineHeight: 1.55, fontStyle: 'italic' } },
            'Honest about its limits: the softening is an ILLUSTRATION of an acuity ratio, not a calibrated optical model, and a 240° field cannot be drawn undistorted on a flat screen — the canvas renders a wide-but-normal view and the real figure is given below. Nobody knows what another species\' colour experience feels like from the inside; this is the standard dichromat approximation applied to a human display.')
        ),

        speciesBar,

        // ── 3D surface: loader → canvas → graceful failure ──
        !sensoryThreeReady ? h('div', { style: { padding: 20, borderRadius: 12, background: T.card, border: '1px dashed ' + T.border, textAlign: 'center', marginBottom: 14 } },
          threeErr
            ? h('div', null,
                h('div', { style: { fontSize: 13, color: T.warm, marginBottom: 8 } },
                  '⚠ The 3D engine could not load — school networks often block CDNs. Everything below still works.'),
                h('button', { 'data-pets-focusable': true, onClick: loadEngine, style: btn({ padding: '8px 16px', fontSize: 13 }) }, '↻ Try again'))
            : h('div', null,
                h('div', { style: { fontSize: 13, color: T.muted, marginBottom: 10, lineHeight: 1.6 } },
                  'The walk-around view needs the 3D engine (about 600 KB, loaded only if you ask for it).'),
                h('button', {
                  'data-pets-focusable': true, onClick: loadEngine, disabled: threeLoading,
                  style: btnPrimary({ padding: '12px 24px', fontSize: 14, opacity: threeLoading ? 0.6 : 1 })
                }, threeLoading ? '⏳ Loading 3D engine…' : '▶ Load the 3D room'))
        ) : !sensoryActive ? h('div', { style: { padding: 20, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, textAlign: 'center', marginBottom: 14 } },
          h('button', {
            'data-pets-focusable': true,
            onClick: function () {
              upd('sensoryActive', true);
              markSeen(sensorySpecies);   // the viewpoint you arrive in counts
              petsAnnounce('Entering the room as a ' + sp.name + '. Use arrow keys or W A S D to walk, and drag the view to look around.');
            },
            style: btnPrimary({ padding: '12px 26px', fontSize: 14 })
          }, '🚪 Step into the room')
        ) : h('div', { style: { marginBottom: 12 } },
          h('div', { className: 'petslab-sim-stage petslab-sensory-stage' },
            h('div', {
              ref: _sensoryMountRef,
              style: { position: 'absolute', inset: 0, overflow: 'hidden', background: '#1a1410' }
            }),
            h('div', { className: 'petslab-stage-hud petslab-stage-hud--top' },
              h('div', { className: 'petslab-hud-stack' },
                h('span', { className: 'petslab-hud-chip' }, sp.icon + ' ', h('strong', null, sp.name + ' view')),
                h('span', { className: 'petslab-hud-chip' }, 'Eye line ', h('strong', null, sp.eyeHeight.toFixed(2) + ' m')),
                h('span', { className: 'petslab-hud-chip' }, 'View ', h('strong', null, sp.totalFieldDeg + '\u00b0')),
                h('span', { className: 'petslab-hud-chip' }, sensoryDusk ? '\uD83C\uDF19 Dusk optics' : '\u2600\uFE0F Daylight optics')
              ),
              h('div', { className: 'petslab-hud-objective' },
                h('strong', { style: { display: 'block', color: '#fbbf24', marginBottom: 2 } }, 'SCIENCE MISSION'),
                sensorySpecies === 'human' ? 'Find the red and blue balls. Then switch species without moving.'
                  : sensorySpecies === 'dog' ? 'Compare the two balls and follow the scent motes back to their sources.'
                  : 'Notice the lower eye line. Look up at the person, then test dusk.'
              )
            ),
            h('span', { className: 'petslab-reticle', 'aria-hidden': 'true' }),
            h('div', { className: 'petslab-stage-hud petslab-stage-hud--bottom' },
              h('span', { className: 'petslab-hud-chip' }, 'Drag to look \u00b7 W A S D to walk'),
              sensorySpecies === 'dog' && h('span', { className: 'petslab-hud-chip' }, '\uD83D\uDC43 ', h('strong', null, 'Scent field visible'))
            )
          ),
          sensoryStatus === 'failed' && h('div', { style: { fontSize: 12, color: T.warm, marginTop: 8 } },
            '⚠ This device could not open a WebGL canvas. The comparison below still carries the lesson.'),
          // Controls
          h('div', { className: 'petslab-control-dock' },
            h('div', { className: 'petslab-control-cluster' },
              h('span', { className: 'petslab-control-label' }, 'Navigate'),
              padBtn('↑', 'Walk forward', key('w')),
              padBtn('↓', 'Walk backward', key('s')),
              padBtn('←', 'Turn left', key('left')),
              padBtn('→', 'Turn right', key('right'))
            ),
            h('div', { className: 'petslab-control-cluster' },
              h('span', { className: 'petslab-control-label' }, 'Focus'),
              [
                { id: 'balls', label: '\uD83D\uDD34 Balls' },
                { id: 'doorway', label: '\uD83D\uDEAA Doorway' },
                { id: 'person', label: '\uD83E\uDDCD Person' }
              ].map(function(target) {
                return h('button', {
                  key: target.id, className: 'petslab-sim-button', 'data-pets-focusable': true,
                  disabled: sensoryStatus !== 'ready',
                  onClick: function () {
                    var viewer = _sensoryViewerRef.current;
                    if (!viewer || sensoryStatus !== 'ready') return;
                    viewer.focusTarget(target.id);
                    petsAnnounce('View centered on ' + target.id + '.');
                  },
                  style: btn({ padding: '7px 10px', fontSize: 11, opacity: sensoryStatus === 'ready' ? 1 : 0.48 })
                }, target.label);
              }),
              h('button', {
                className: 'petslab-sim-button', 'data-pets-focusable': true,
                disabled: sensoryStatus !== 'ready',
                onClick: function () {
                  var viewer = _sensoryViewerRef.current;
                  if (!viewer || sensoryStatus !== 'ready') return;
                  viewer.resetView();
                  petsAnnounce('View reset to the room entrance.');
                },
                style: btn({ padding: '7px 10px', fontSize: 11, opacity: sensoryStatus === 'ready' ? 1 : 0.48 })
              }, '\u21BA Reset')
            ),
            h('button', { className: 'petslab-sim-button', 'data-pets-focusable': true, onClick: toggleDusk,
              'aria-pressed': sensoryDusk ? 'true' : 'false',
              style: btn({ padding: '8px 14px', fontSize: 13 }) },
              sensoryDusk ? '🌙 Dusk — on' : '☀️ Daylight'),
            h('button', { className: 'petslab-sim-button', 'data-pets-focusable': true,
              'aria-pressed': sensoryReduceMotion ? 'true' : 'false',
              onClick: function () {
                var next = !sensoryReduceMotion;
                upd('sensoryReduceMotion', next);
                petsAnnounce(next
                  ? 'Motion reduced. The room now holds still until you move it.'
                  : 'Motion restored. Scent drifts on its own again.');
              },
              style: btn({ padding: '8px 14px', fontSize: 13 }) },
              sensoryReduceMotion ? '🧊 Motion reduced' : '🌀 Motion on'),
            h('button', { className: 'petslab-sim-button', 'data-pets-focusable': true,
              onClick: function () { upd('sensoryActive', false); petsAnnounce('Left the room.'); },
              style: btn({ padding: '8px 14px', fontSize: 13 }) }, '⏹ Leave the room'),
            h('span', { style: { fontSize: 11, color: T.dim } },
              'Arrow keys or W A S D to move · drag the view to look around')
          ),
          sensorySpecies === 'dog' && h('div', { style: { marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.45)' } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, '👃 Scent layer on'),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              'The drifting motes are the part of the room a camera can never show. With roughly 300 million olfactory receptors to a human\'s 5 million, a dog reads the rug as a record of who crossed it and how long ago. Sources here: ',
              SENSORY_SCENTS.map(function (s) { return s.label; }).join(' · '), '.')
          )
        ),

        // ── The written comparison. Primary content, not a caption. ──
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('h3', { style: { margin: '0 0 4px', fontSize: 15, color: sp.accent } }, sp.icon + ' Seeing as a ' + sp.name),
          h('p', { style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.6 } }, sp.note),
          h('div', { role: 'table', 'aria-label': sp.name + ' sensory measurements' },
            factRows.map(function (r, i) {
              return h('div', { key: i, role: 'row',
                style: { display: 'grid', gridTemplateColumns: 'minmax(120px,1fr) minmax(90px,auto) minmax(180px,2fr)', gap: 10, padding: '8px 0', borderTop: i ? '1px solid ' + T.border : 'none', alignItems: 'baseline' } },
                h('div', { role: 'cell', style: { fontSize: 12, fontWeight: 700, color: T.text } }, r.l),
                h('div', { role: 'cell', style: { fontSize: 13, fontWeight: 800, color: sp.accent, fontFamily: 'monospace' } }, r.v),
                h('div', { role: 'cell', style: { fontSize: 11, color: T.dim, lineHeight: 1.5 } }, r.why)
              );
            })
          ),
          h('div', { style: { marginTop: 10, fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Sources: ' + sp.cite)
        ),

        h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, borderLeft: '4px solid ' + T.accentHi, marginBottom: 12 } },
          h('div', { style: { fontSize: 11, fontWeight: 800, color: T.accentHi, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Try this'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
            h('li', null, 'Find the red ball as a human, then switch to the dog. It does not vanish — it stops standing out. That is why fetch toys are sold in blue and yellow.'),
            h('li', null, 'Compare the red ball on the grass through the doorway across all three.'),
            h('li', null, 'Turn on dusk and switch between human and cat. The cat is not seeing a brighter room; it is spending colour and detail to buy light.'),
            h('li', null, 'Stand at cat height next to the person. Consider what reaching down over the top of them looks like from there.')
          )
        ),
        footer()
      );
    }

    // First-correct decoder-mastery celebration overlay. Renders on top
    // of any view if the celebration state is set; auto-clears after 3.2s.
    function decoderCelebOverlay() {
      if (!decoderCeleb) return null;
      var unique = Object.keys(decoderMastery || {}).length;
      return h('div', {
        role: 'status',
        'aria-live': 'assertive',
        style: {
          position: 'fixed', top: 80, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999, pointerEvents: 'none',
          animation: 'petslab-celeb-rise 3.2s ease-out forwards'
        }
      },
        h('div', {
          style: {
            background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 50%, #ef4444 100%)',
            color: '#fff',
            padding: '14px 22px',
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            border: '4px solid #fff',
            display: 'flex', alignItems: 'center', gap: 12,
            maxWidth: 420
          }
        },
          h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, '🎉'),
          h('div', null,
            h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.95 } }, 'Signal decoded'),
            h('div', { style: { fontSize: 15, fontWeight: 800, lineHeight: 1.2 } }, decoderCeleb.species + ' — ' + decoderCeleb.signal),
            h('div', { style: { fontSize: 11, fontStyle: 'italic', opacity: 0.95, marginTop: 2 } }, unique + ' / 27 unique signals decoded')
          )
        )
      );
    }

    // ── DECODER MASTERY VIEW ─────────────────────────────────
    // Cross-species log of body-language signals correctly identified at
    // least once in the quiz. Mirrors BirdLab's life-list pattern: tracks
    // mastery across attempts, not per-attempt score.
    function renderDecoderMastery() {
      // Re-derive the canonical signal list (same source as renderBodyLang).
      var sets = [
        { species: '🐕 Dogs', items: [
          { signal: 'Loose body + soft eyes + open mouth + wagging mid-height tail', meaning: 'Relaxed + happy' },
          { signal: 'Stiff body + closed mouth + hard stare + slow high tail wag', meaning: 'WARNING — back off' },
          { signal: '"Whale eye" (whites of eyes showing as head turns away)', meaning: 'Stress / fear / discomfort — give space' },
          { signal: 'Lip licking / yawning / sniffing the ground in a tense moment', meaning: 'Calming signal — dog is trying to defuse' },
          { signal: 'Play bow (front low, butt up)', meaning: 'Invitation to play / "what comes next is fun"' },
          { signal: 'Tucked tail + low body + ears back', meaning: 'Fear / appeasement — do NOT push interaction' },
          { signal: 'Showing belly with relaxed body', meaning: 'Trust / play (not always "rub me!")' },
          { signal: 'Showing teeth + low growl + freeze', meaning: 'CLEAR warning — bite is the next step if pressure continues' }
        ]},
        { species: '🐈 Cats', items: [
          { signal: 'Slow blink toward you', meaning: '"Cat kiss" — affection / trust' },
          { signal: 'Tail held straight up (sometimes with curve at tip)', meaning: 'Friendly greeting' },
          { signal: 'Tail flicking back and forth', meaning: 'Annoyed / about to react — back off' },
          { signal: 'Pupils dilated wide in normal light', meaning: 'Aroused (could be play, fear, or aggression — read context)' },
          { signal: 'Ears flattened back / sideways', meaning: 'Fear or aggression' },
          { signal: 'Crouched + tail wrapped tight', meaning: 'Stressed / unwell' },
          { signal: 'Kneading paws + purring', meaning: 'Content (kitten-nursing leftover behavior)' },
          { signal: 'Loud meowing AT you specifically', meaning: 'Demand — for food, attention, or door opening' }
        ]},
        { species: '🐰 Rabbits', items: [
          { signal: '"Binky" (sudden midair leap + twist)', meaning: 'Pure joy' },
          { signal: 'Loud thump with hind feet', meaning: 'Alarm — perceived threat (rabbits HEAR something)' },
          { signal: 'Tooth purring (soft chattering)', meaning: 'Content' },
          { signal: 'Tooth grinding (loud grating)', meaning: 'PAIN — vet visit' },
          { signal: 'Flopping over on side', meaning: 'Trust / relaxation (NOT injured)' },
          { signal: 'Hunched + not eating + closed eyes', meaning: 'GI stasis or other illness — EMERGENCY' }
        ]},
        { species: '🦜 Birds', items: [
          { signal: 'Crest feathers raised + relaxed posture', meaning: 'Curious / engaged (in cockatiels)' },
          { signal: 'Eye-pinning (rapid pupil contraction)', meaning: 'Excitement OR aggression — read context' },
          { signal: 'Beak grinding', meaning: 'Content (often before sleep)' },
          { signal: 'Tail bobbing while breathing', meaning: 'Respiratory distress — vet now' },
          { signal: 'Feather plucking / overgrooming', meaning: 'Boredom / stress / medical — needs investigation' }
        ]}
      ];
      var totalSignals = 0;
      sets.forEach(function (s) { totalSignals += s.items.length; });
      var unique = Object.keys(decoderMastery || {}).length;
      var pctOverall = totalSignals > 0 ? Math.round((unique / totalSignals) * 100) : 0;

      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        decoderCelebOverlay(),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 } },
          h('h2', { style: { margin: 0, fontSize: 22 } }, '🏅 Decoder Mastery'),
          h('button', { 'data-pets-focusable': true,
            onClick: function () { upd('view', 'menu'); petsAnnounce('Back to menu'); },
            style: btnPrimary({ padding: '8px 14px', fontSize: 13 })
          }, '← Menu')
        ),
        // Hero summary
        h('div', { style: { padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, ' + T.cardAlt + ' 0%, ' + T.card + ' 100%)', border: '2px solid ' + T.accent, marginBottom: 16 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
            h('div', { style: { textAlign: 'center', minWidth: 110 } },
              h('div', { style: { fontSize: 38, fontWeight: 900, color: T.accentHi, lineHeight: 1 } }, unique + ' / ' + totalSignals),
              h('div', { style: { fontSize: 10, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, 'Signals decoded')
            ),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('p', { style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 } },
                'Every body-language signal you correctly identify in the quiz lands here permanently. Read animals confidently — across species — and the meter fills. Quiz scores reset; mastery sticks.'
              ),
              h('div', { style: { marginTop: 8, height: 8, background: T.cardAlt, borderRadius: 4, overflow: 'hidden' }, 'aria-hidden': 'true' },
                h('div', { style: { width: pctOverall + '%', height: '100%', background: T.accent, transition: 'width 0.3s' } })
              )
            )
          )
        ),
        // Per-species progress
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          sets.map(function (s) {
            var total = s.items.length;
            var decodedItems = s.items.filter(function (it) { return decoderMastery[s.species + '|' + it.signal]; });
            var pct = total > 0 ? Math.round((decodedItems.length / total) * 100) : 0;
            return h('div', { key: s.species,
              style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                h('div', { style: { fontSize: 16, fontWeight: 800 } }, s.species),
                h('div', { style: { fontSize: 12, color: T.dim } }, decodedItems.length + ' of ' + total + ' decoded'),
                h('div', { style: { flex: 1, minWidth: 80, height: 6, background: T.cardAlt, borderRadius: 3, overflow: 'hidden' }, 'aria-hidden': 'true' },
                  h('div', { style: { width: pct + '%', height: '100%', background: T.accent } })
                )
              ),
              h('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 } },
                s.items.map(function (it, i) {
                  var entry = decoderMastery[s.species + '|' + it.signal];
                  var done = !!entry;
                  return h('li', { key: i,
                    style: {
                      padding: '8px 10px', borderRadius: 8,
                      background: done ? 'rgba(132,204,22,0.08)' : T.cardAlt,
                      border: '1px solid ' + (done ? T.ok : T.border),
                      opacity: done ? 1 : 0.7,
                      display: 'flex', alignItems: 'flex-start', gap: 8
                    }
                  },
                    h('span', { 'aria-hidden': 'true', style: { color: done ? T.ok : T.dim, fontSize: 14, flexShrink: 0, marginTop: 1 } }, done ? '✓' : '○'),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 12, fontWeight: 600, lineHeight: 1.4 } }, it.signal),
                      h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic', marginTop: 2 } }, it.meaning),
                      done && entry.correctCount > 1 && h('div', { style: { fontSize: 10, color: T.dim, marginTop: 2 } }, '✓ ' + entry.correctCount + ' correct attempts')
                    )
                  );
                })
              )
            );
          })
        ),
        h('div', { style: { marginTop: 16, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.accent } },
          h('button', { 'data-pets-focusable': true,
            onClick: function () { upd('view', 'bodyLang'); markVisited('bodyLang'); petsAnnounce('Opening Body Language Decoder'); },
            style: btnPrimary({ padding: '10px 18px', fontSize: 13, width: '100%' })
          }, unique === 0 ? '🎯 Take the decoder quiz to start your mastery log' : (unique === totalSignals ? '🏆 All signals decoded — review or retry the quiz' : '🎯 Keep going — open the decoder quiz'))
        )
      );
    }

    // VIEW ROUTER — wraps each view in a fragment so the celebration overlay
    // can render on top of any view (it's anchored to fixed positioning, so
    // it doesn't matter which view it appears over).
    var viewBody;
    switch (view) {
      case 'dogs':         viewBody = renderDogs(); break;
      case 'cats':         viewBody = renderCats(); break;
      case 'smallMammals': viewBody = renderSmallMammals(); break;
      case 'birds':        viewBody = renderBirds(); break;
      case 'reptiles':     viewBody = renderReptiles(); break;
      case 'training':     viewBody = renderTraining(); break;
      case 'nutrition':    viewBody = renderNutrition(); break;
      case 'genetics':     viewBody = renderGenetics(); break;
      case 'zoonoses':     viewBody = renderZoonoses(); break;
      case 'service':      viewBody = renderService(); break;
      case 'welfare':      viewBody = renderWelfare(); break;
      case 'careSim':      viewBody = renderCareSim(); break;
      case 'sensory':      viewBody = renderSensory(); break;
      case 'picker':       viewBody = renderPicker(); break;
      case 'bodyLang':     viewBody = renderBodyLang(); break;
      case 'cost':         viewBody = renderCost(); break;
      case 'lifespan':     viewBody = renderLifespan(); break;
      case 'famous':       viewBody = renderFamous(); break;
      case 'aiPractice':   viewBody = renderAiPractice(); break;
      case 'diagrams':     viewBody = renderDiagrams(); break;
      case 'glossary':     viewBody = renderGlossary(); break;
      case 'myths':        viewBody = renderMyths(); break;
      case 'careers':      viewBody = renderCareers(); break;
      case 'action':       viewBody = renderAction(); break;
      case 'quiz':         viewBody = renderQuiz(); break;
      case 'resources':    viewBody = renderResources(); break;
      case 'teacher':      viewBody = renderTeacher(); break;
      case 'decoderMastery': viewBody = renderDecoderMastery(); break;
      case 'menu':
      default:             viewBody = renderMenu(); break;
    }
    return h(React.Fragment, null, decoderCelebOverlay(), viewBody);
  }

})();

}
