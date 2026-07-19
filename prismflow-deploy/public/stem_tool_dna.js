// ═══════════════════════════════════════════════════════
// stem_tool_dna.js - DNA / Genetics Lab  v3.0
// Enhanced STEM Lab tool - 11 sub-tools
// Build · Replicate · Transcribe · Translate · Mutate
// CRISPR · Protein · Forensics · Challenge · Battle · Learn
// ═══════════════════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) - shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── DNA Lab interface layer: path-first navigation + focused workbench ──
  (function() {
    if (document.getElementById('allo-dna-interface-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-dna-interface-css';
    st.textContent = [
      '[data-dna-tool]{--dna-ink:#172a2d;--dna-muted:#61716f;--dna-line:#d9e2df;--dna-paper:#f6f8f4;--dna-violet:#6d28d9;max-width:80rem!important;color:var(--allo-stem-text,#0f172a)}',
      '[data-dna-tool] button{min-height:36px}',
      '.dna-command-header{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;padding:15px 17px;border:1px solid var(--dna-line);border-top:4px solid var(--dna-violet);border-radius:14px;background:var(--allo-stem-canvas,#fff);box-shadow:0 12px 30px rgba(15,23,42,.08)}',
      '.dna-back-button{width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--dna-line);border-radius:10px;background:#fff;color:#475569;transition:transform .18s ease,border-color .18s ease}',
      '.dna-back-button:hover{transform:translateX(-2px);border-color:#a78bfa}',
      '.dna-brand-lockup{display:flex;align-items:center;gap:12px;min-width:0}',
      '.dna-brand-mark{width:42px;height:42px;position:relative;display:grid;grid-template-columns:1fr 1fr;place-items:center;overflow:hidden;flex:none;border:1px solid #a78bfa;border-radius:12px;background:#f5f3ff;color:#5b21b6;font:900 10px/1 ui-monospace,SFMono-Regular,monospace}',
      '.dna-brand-mark:after{content:"";position:absolute;width:62px;height:1px;background:#8b5cf6;transform:rotate(-32deg)}',
      '.dna-brand-mark span{position:relative;z-index:1;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(91,33,182,.16)}',
      '.dna-brand-mark span:last-child{background:#ede9fe}',
      '.dna-command-kicker{margin:0 0 3px;color:#6d28d9;font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}',
      '.dna-command-title{margin:0;color:var(--allo-stem-text,#172033);font-size:20px;font-weight:950;letter-spacing:-.025em;line-height:1.05}',
      '.dna-command-subtitle{margin:5px 0 0;color:var(--allo-stem-text-soft,#64748b);font-size:11px;line-height:1.35}',
      '.dna-command-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}',
      '.dna-live-status{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #d8e5c2;border-radius:999px;background:#f4fae8;color:#3f6212;font-size:10px;font-weight:850}',
      '.dna-live-status i{width:7px;height:7px;border-radius:50%;background:#65a30d;box-shadow:0 0 0 4px rgba(101,163,13,.12)}',
      '.dna-xp-chip{padding:7px 10px;border:1px solid #fde68a;border-radius:999px;background:#fffbeb;color:#92400e;font-size:10px;font-weight:900}',
      '.dna-snapshot-button{min-height:38px!important;padding:0 14px;border:1px solid #5b21b6;border-radius:10px;background:#6d28d9;color:#fff;font-size:11px;font-weight:900;box-shadow:3px 3px 0 #c4b5fd;transition:transform .18s ease,box-shadow .18s ease}',
      '.dna-snapshot-button:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 #c4b5fd}',
      '.dna-grade-bar{display:flex;align-items:center;gap:6px;overflow-x:auto;padding:8px 10px;border:1px solid var(--dna-line);border-radius:12px;background:rgba(255,255,255,.8);scrollbar-width:thin}',
      '.dna-grade-label{flex:none;margin-right:4px;color:#64748b;font-size:9px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}',
      '.dna-grade-option{flex:none;min-height:32px!important;padding:0 11px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#526174;font-size:10px;font-weight:850}',
      '.dna-grade-option:hover{border-color:#a78bfa;background:#faf5ff}',
      '.dna-grade-option[data-active="true"]{border-color:#6d28d9;background:#6d28d9;color:#fff;box-shadow:0 4px 10px rgba(109,40,217,.18)}',
      '.dna-grade-level{flex:none;margin-left:auto;padding:6px 9px;border-radius:999px;background:#f5f3ff;color:#6d28d9;font-size:9px;font-weight:850}',
      '.dna-mission-shell{overflow:hidden;border:1px solid var(--dna-line);border-radius:14px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.07)}',
      '.dna-mission-summary{display:flex;align-items:center;gap:13px;min-height:68px;padding:12px 15px;cursor:pointer;list-style:none;background:var(--dna-paper)}',
      '.dna-mission-summary::-webkit-details-marker{display:none}',
      '.dna-mission-index{width:34px;height:34px;display:grid;place-items:center;flex:none;border-radius:10px;background:#ede9fe;color:#5b21b6;font:950 10px/1 ui-monospace,SFMono-Regular,monospace}',
      '.dna-mission-summary-copy{min-width:0;flex:1}',
      '.dna-mission-kicker{color:#6d28d9;font-size:8px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}',
      '.dna-mission-title{margin:2px 0 0;color:#14252c;font-size:16px;font-weight:950;letter-spacing:-.02em}',
      '.dna-mission-desc{margin:3px 0 0;overflow:hidden;color:#64748b;font-size:10px;text-overflow:ellipsis;white-space:nowrap}',
      '.dna-active-tool{display:flex;align-items:center;gap:6px;flex:none;padding:7px 9px;border:1px solid var(--dna-line);border-radius:9px;background:#fff;color:#243a3d;font-size:10px;font-weight:900}',
      '.dna-mission-chevron{color:#7c3aed;font-size:16px;transition:transform .18s ease}',
      '.dna-mission-shell[open] .dna-mission-chevron{transform:rotate(180deg)}',
      '.dna-mission-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(350px,.9fr);border-top:1px solid var(--dna-line)}',
      '.dna-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:17px;background:#f8faf8}',
      '.dna-stat{min-width:0;padding:11px 12px;border:1px solid #e1e7e4;border-radius:10px;background:#fff}',
      '.dna-stat-label{color:#778583;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}',
      '.dna-stat-value{margin-top:4px;overflow:hidden;color:#182d31;font-size:17px;font-weight:950;letter-spacing:-.025em;text-overflow:ellipsis;white-space:nowrap}',
      '.dna-stat-sub{margin-top:2px;overflow:hidden;color:#7a8787;font-size:9px;text-overflow:ellipsis;white-space:nowrap}',
      '.dna-route-panel{padding:14px 16px;border-left:1px solid var(--dna-line);background:#fff}',
      '.dna-route-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:9px}',
      '.dna-route-heading strong{color:#23383d;font-size:10px;font-weight:950}',
      '.dna-route-heading span{color:#7a8787;font-size:8px}',
      '.dna-route-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
      '.dna-route-card{min-height:68px!important;padding:9px;border:1px solid var(--route-soft);border-left:4px solid var(--route-accent);border-radius:9px;background:#fff;text-align:left;transition:transform .17s ease,box-shadow .17s ease,background .17s ease}',
      '.dna-route-card:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(15,23,42,.08)}',
      '.dna-route-card[data-active="true"]{background:var(--route-bg);box-shadow:0 7px 16px rgba(15,23,42,.07)}',
      '.dna-route-top{display:flex;align-items:center;justify-content:space-between;gap:7px}',
      '.dna-route-name{color:#1f3035;font-size:10px;font-weight:950}',
      '.dna-route-state{color:var(--route-accent);font-size:7px;font-weight:950;letter-spacing:.07em;text-transform:uppercase}',
      '.dna-route-tools{display:block;margin-top:5px;overflow:hidden;color:#69777a;font-size:8px;text-overflow:ellipsis;white-space:nowrap}',
      '.dna-tool-rail{position:sticky;top:0;z-index:6;display:flex;gap:6px;overflow-x:auto;padding:7px;border:1px solid #273548;border-radius:13px;background:#111c2b;box-shadow:0 10px 24px rgba(15,23,42,.16);scroll-snap-type:x proximity;scrollbar-width:thin}',
      '.dna-tool-tab{position:relative;flex:1 0 88px;min-height:50px!important;display:flex;align-items:center;justify-content:center;gap:7px;padding:6px 9px;border:1px solid transparent;border-radius:9px;background:transparent;color:#aeb9c8;font-size:10px;font-weight:850;scroll-snap-align:start}',
      '.dna-tool-tab:hover{background:#1e2b3d;color:#fff}',
      '.dna-tool-tab[data-active="true"]{border-color:#a78bfa;background:#f8fafc;color:#4c1d95;box-shadow:0 5px 12px rgba(0,0,0,.18)}',
      '.dna-tool-tab-icon{font-size:15px;line-height:1}',
      '.dna-tool-tab[data-active="true"]:after{content:"";position:absolute;inset:auto 20% 3px;height:3px;border-radius:3px;background:#7c3aed}',
      '.dna-achievements{border:1px solid var(--dna-line);border-radius:11px;background:#fff}',
      '.dna-achievements summary{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;color:#526174;font-size:10px;font-weight:850;list-style:none}',
      '.dna-achievements summary::-webkit-details-marker{display:none}',
      '.dna-achievements summary:after{content:"+";margin-left:auto;color:#7c3aed;font-size:16px}',
      '.dna-achievements[open] summary:after{content:"−"}',
      '.dna-achievement-progress{color:#6d28d9;font-weight:950}',
      '.dna-badge-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:7px;padding:10px 12px 12px;border-top:1px solid #eef2f1}',
      '.dna-badge{display:grid;grid-template-columns:30px 1fr;align-items:center;gap:8px;min-height:47px;padding:6px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc}',
      '.dna-badge[data-earned="true"]{border-color:#facc15;background:#fefce8}',
      '.dna-badge-icon{width:30px;height:30px;display:grid;place-items:center;border-radius:8px;background:#fff;font-size:14px}',
      '.dna-badge strong{display:block;color:#334155;font-size:9px}.dna-badge small{display:block;margin-top:2px;color:#77818d;font-size:8px;line-height:1.25}',
      '[data-dna-topic]{border-radius:12px!important;box-shadow:0 8px 18px rgba(15,23,42,.05)}',
      '[data-dna-workspace]{padding:14px;border:1px solid var(--dna-line);border-radius:15px;background:#f8fafc;box-shadow:0 12px 28px rgba(15,23,42,.05)}',
      '[data-dna-molecular-frame]{border-radius:13px!important;box-shadow:0 18px 38px rgba(15,23,42,.16)!important}',
      '[data-dna-sequence]{display:flex!important;flex-wrap:nowrap!important;gap:5px!important;overflow-x:auto;padding:6px 2px 10px;scrollbar-width:thin}',
      '[data-dna-sequence] button{width:44px!important;height:44px!important;min-width:44px;border:2px solid rgba(255,255,255,.78);border-radius:9px!important;box-shadow:0 3px 8px rgba(15,23,42,.12)}',
      '.dna-preset-picker{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.dna-preset-picker label{color:#64748b;font-size:9px;font-weight:850}.dna-preset-picker select{min-height:36px;max-width:220px;padding:0 30px 0 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font-size:10px;font-weight:750}',
      '.dna-reference-library{border:1px solid var(--dna-line);border-radius:12px;background:#fff}.dna-reference-library>summary{display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;list-style:none;color:#334155;font-size:11px;font-weight:900}.dna-reference-library>summary::-webkit-details-marker{display:none}.dna-reference-library>summary:after{content:"+";margin-left:auto;color:#059669;font-size:17px}.dna-reference-library[open]>summary:after{content:"−"}',
      '@media (max-width:980px){.dna-mission-body{grid-template-columns:1fr}.dna-route-panel{border-left:0;border-top:1px solid var(--dna-line)}.dna-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dna-tool-rail{position:relative;top:auto}}',
      '@media (max-width:640px){[data-dna-tool]{margin-left:-4px;margin-right:-4px}.dna-command-header{grid-template-columns:auto minmax(0,1fr);padding:13px;gap:10px}.dna-command-actions{grid-column:1/-1;justify-content:flex-start;padding-top:2px}.dna-command-title{font-size:17px}.dna-command-subtitle{font-size:10px}.dna-brand-mark{width:38px;height:38px}.dna-live-status{display:none}.dna-grade-level{display:none}.dna-mission-summary{padding:10px 12px}.dna-mission-desc{display:none}.dna-active-tool{padding:6px 8px}.dna-stat-grid{gap:6px;padding:12px}.dna-stat{padding:9px}.dna-route-grid{grid-template-columns:1fr 1fr}.dna-tool-tab{flex-basis:82px;min-height:48px!important}[data-dna-workspace]{padding:9px}.dna-snapshot-button{margin-left:auto}.dna-preset-picker{width:100%}.dna-preset-picker select{max-width:none;flex:1}}',
      '@media (max-width:430px){.dna-route-grid{grid-template-columns:1fr}.dna-xp-chip{margin-left:auto}.dna-snapshot-button{width:100%}.dna-stat-value{font-size:15px}}'
    ].join('');
    document.head.appendChild(st);
  })();
  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-dna')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-dna';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


  // ── Audio (auto-injected) ──
  var _dnaAC = null;
  function getDnaAC() { if (!_dnaAC) { try { _dnaAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_dnaAC && _dnaAC.state === "suspended") { try { _dnaAC.resume(); } catch(e) {} } return _dnaAC; }
  function dnaTone(f,d,tp,v) { var ac = getDnaAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxDnaClick() { dnaTone(600, 0.03, "sine", 0.04); }
  function sfxDnaSuccess() { dnaTone(523, 0.08, "sine", 0.07); setTimeout(function() { dnaTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { dnaTone(784, 0.1, "sine", 0.08); }, 140); }


  // ═══════════════════════════════════════════════════════
  // IIFE-Scope Static Data (shared across renders)
  // ═══════════════════════════════════════════════════════

  var SUBTOOLS = [
    { id: 'build', icon: '\uD83E\uDDEC', label: 'Build' },
    { id: 'replicate', icon: '\uD83D\uDD00', label: 'Replicate' },
    { id: 'transcribe', icon: '\uD83D\uDCDD', label: 'Transcribe' },
    { id: 'translate', icon: '\uD83D\uDD2C', label: 'Translate' },
    { id: 'mutate', icon: '\uD83E\uDDA0', label: 'Mutate' },
    { id: 'crispr', icon: '\u2702\uFE0F', label: 'CRISPR' },
    { id: 'protein', icon: '\uD83E\uDDEA', label: 'Protein' },
    { id: 'forensics', icon: '\uD83D\uDD0D', label: 'Forensics' },
    { id: 'challenge', icon: '\uD83C\uDFAF', label: 'Challenge' },
    { id: 'battle', icon: '\u2694\uFE0F', label: 'Battle' },
    { id: 'learn', icon: '\uD83D\uDCDA', label: 'Learn' }
  ];

  var CODON_TABLE = {
    'UUU':'Phe','UUC':'Phe','UUA':'Leu','UUG':'Leu',
    'CUU':'Leu','CUC':'Leu','CUA':'Leu','CUG':'Leu',
    'AUU':'Ile','AUC':'Ile','AUA':'Ile','AUG':'Met',
    'GUU':'Val','GUC':'Val','GUA':'Val','GUG':'Val',
    'UCU':'Ser','UCC':'Ser','UCA':'Ser','UCG':'Ser',
    'CCU':'Pro','CCC':'Pro','CCA':'Pro','CCG':'Pro',
    'ACU':'Thr','ACC':'Thr','ACA':'Thr','ACG':'Thr',
    'GCU':'Ala','GCC':'Ala','GCA':'Ala','GCG':'Ala',
    'UAU':'Tyr','UAC':'Tyr','UAA':'Stop','UAG':'Stop',
    'UGU':'Cys','UGC':'Cys','UGA':'Stop','UGG':'Trp',
    'CGU':'Arg','CGC':'Arg','CGA':'Arg','CGG':'Arg',
    'AGU':'Ser','AGC':'Ser','AGA':'Arg','AGG':'Arg',
    'GGU':'Gly','GGC':'Gly','GGA':'Gly','GGG':'Gly',
    'AAU':'Asn','AAC':'Asn','AAA':'Lys','AAG':'Lys',
    'GAU':'Asp','GAC':'Asp','GAA':'Glu','GAG':'Glu',
    'CAU':'His','CAC':'His','CAA':'Gln','CAG':'Gln'
  };

  var AA_PROPS = {
    'Phe':{full:'Phenylalanine',abbr:'F',type:'nonpolar',color:'#f59e0b'},
    'Leu':{full:'Leucine',abbr:'L',type:'nonpolar',color:'#f59e0b'},
    'Ile':{full:'Isoleucine',abbr:'I',type:'nonpolar',color:'#f59e0b'},
    'Met':{full:'Methionine',abbr:'M',type:'nonpolar',color:'#22c55e',start:true},
    'Val':{full:'Valine',abbr:'V',type:'nonpolar',color:'#f59e0b'},
    'Ser':{full:'Serine',abbr:'S',type:'polar',color:'#3b82f6'},
    'Pro':{full:'Proline',abbr:'P',type:'nonpolar',color:'#f59e0b'},
    'Thr':{full:'Threonine',abbr:'T',type:'polar',color:'#3b82f6'},
    'Ala':{full:'Alanine',abbr:'A',type:'nonpolar',color:'#f59e0b'},
    'Tyr':{full:'Tyrosine',abbr:'Y',type:'polar',color:'#3b82f6'},
    'Cys':{full:'Cysteine',abbr:'C',type:'polar',color:'#3b82f6'},
    'Trp':{full:'Tryptophan',abbr:'W',type:'nonpolar',color:'#f59e0b'},
    'Arg':{full:'Arginine',abbr:'R',type:'positive',color:'#ef4444'},
    'Gly':{full:'Glycine',abbr:'G',type:'nonpolar',color:'#f59e0b'},
    'Asn':{full:'Asparagine',abbr:'N',type:'polar',color:'#3b82f6'},
    'Lys':{full:'Lysine',abbr:'K',type:'positive',color:'#ef4444'},
    'Asp':{full:'Aspartic acid',abbr:'D',type:'negative',color:'#a855f7'},
    'Glu':{full:'Glutamic acid',abbr:'E',type:'negative',color:'#a855f7'},
    'His':{full:'Histidine',abbr:'H',type:'positive',color:'#ef4444'},
    'Gln':{full:'Glutamine',abbr:'Q',type:'polar',color:'#3b82f6'},
    'Stop':{full:'Stop codon',abbr:'*',type:'stop',color:'#94a3b8'}
  };

  var BASE_COMPLEMENT = { 'A':'T', 'T':'A', 'G':'C', 'C':'G' };
  var DNA_TO_RNA = { 'A':'U', 'T':'A', 'G':'C', 'C':'G' }; // template-strand → RNA (still used by the CRISPR gRNA readout)
  // Coding-strand → mRNA (T→U only). The displayed sequence is the CODING strand (every preset starts with
  // ATG), so transcription must NOT complement it — complementing destroyed the start codon, which left
  // translation/protein/MW empty for every preset.
  var CODING_TO_RNA = { 'A':'A', 'T':'U', 'G':'G', 'C':'C' };
  var BASE_COLORS = { 'A':'#ef4444', 'T':'#3b82f6', 'G':'#22c55e', 'C':'#f59e0b', 'U':'#a855f7' };
  var BASE_DARK_COLORS = { 'A':'#991b1b', 'T':'#1e3a8a', 'G':'#166534', 'C':'#9a3412', 'U':'#6b21a8' };
  var BASE_TEXT_COLORS = { 'A':'#0f172a', 'T':'#0f172a', 'G':'#052e16', 'C':'#451a03', 'U':'#ffffff' };

  var PRESETS = [
    { name: 'Insulin Teaching Fragment', seq: 'ATGTTCGTCAACCAACACCTGTGCGGCTCACAC', desc: 'Short teaching sequence inspired by insulin biology; it is not the complete human INS coding sequence.' },
    { name: 'Short Peptide', seq: 'ATGCGTACCTGAAACTGA', desc: 'A minimal protein for learning.' },
    { name: 'Beta-Globin Start', seq: 'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCC', desc: 'N-terminal coding fragment of HBB, one subunit of adult hemoglobin.' },
    { name: 'GFP Fragment', seq: 'ATGAGTAAAGGAGAAGAACTTTTCACTGA', desc: 'Green fluorescent protein from jellyfish.' },
    { name: 'p53 Fragment', seq: 'ATGGAGGAGCCGCAGTCAGATCCTAGCG', desc: 'Tumor suppressor. Mutated in ~50% of cancers.' },
    { name: 'HbS Beta-Globin Start', seq: 'ATGGTGCATCTGACTCCTGTGGAGAAGTCTGCC', desc: 'GAG\u2192GTG produces beta-globin Glu6Val; it appears as codon 7 here because the initiator methionine is included.' },
    { name: 'BRCA1 Start', seq: 'ATGGATTTATCTGCTCTTCGCGTTGAAGAA', desc: 'Breast cancer susceptibility gene.' },
    { name: 'Collagen Teaching Fragment', seq: 'ATGGGACCACGAGGACCAGGCCCACCAGGC', desc: 'Collagens commonly contain Gly-X-Y repeats; this is a short teaching sequence, not a complete collagen gene.' }
  ];

  var GENETIC_DISORDERS = [
    { name: 'Sickle Cell Disease', gene: 'HBB', mutation: 'Glu\u2192Val (pos 6)', type: 'Missense', effect: 'Hemoglobin S causes red blood cells to form sickle shapes, blocking blood flow.' },
    { name: 'Cystic Fibrosis', gene: 'CFTR', mutation: '\u0394F508 deletion', type: 'Deletion', effect: 'Misfolded chloride channel causes thick mucus in lungs and digestive system.' },
    { name: 'Huntington\'s Disease', gene: 'HTT', mutation: 'CAG repeat expansion', type: 'Trinucleotide Repeat', effect: 'Expanded polyglutamine damages neurons. People with 36-39 repeats may or may not develop symptoms; 40 or more is usually fully penetrant.' },
    { name: 'Red-Green Color Vision Deficiency', gene: 'OPN1LW, OPN1MW', mutation: 'Gene rearrangements and sequence variants', type: 'X-linked', effect: 'Changes affecting cone opsins alter sensitivity to long or medium wavelengths.' },
    { name: 'PKU', gene: 'PAH', mutation: 'Many pathogenic variants', type: 'Often missense', effect: 'Reduced phenylalanine hydroxylase activity raises phenylalanine levels; treatment is individualized and often includes dietary management.' },
    { name: 'Hereditary BRCA1/2 Cancer Risk', gene: 'BRCA1, BRCA2', mutation: 'Multiple pathogenic variant types', type: 'Loss of function', effect: 'Impaired DNA repair increases risk for several cancers; a pathogenic variant raises risk but does not guarantee cancer.' }
  ];

  // ── Badges ──
  var DNA_BADGES = [
    { id: 'firstStrand', icon: '\uD83E\uDDEC', label: 'First Strand', desc: 'Load a DNA preset' },
    { id: 'copyMachine', icon: '\uD83D\uDD00', label: 'Copy Machine', desc: 'Complete replication' },
    { id: 'messenger', icon: '\uD83D\uDCDD', label: 'Messenger', desc: 'Complete transcription' },
    { id: 'ribosomePro', icon: '\uD83D\uDD2C', label: 'Ribosome Pro', desc: 'Complete translation' },
    { id: 'mutantMaker', icon: '\uD83E\uDDA0', label: 'Mutant Maker', desc: 'Apply 5 mutations' },
    { id: 'geneEditor', icon: '\u2702\uFE0F', label: 'Gene Editor', desc: 'Complete CRISPR edit' },
    { id: 'proteinSci', icon: '\uD83E\uDDEA', label: 'Protein Scientist', desc: 'AI-analyze a protein' },
    { id: 'csiGenetics', icon: '\uD83D\uDD0D', label: 'CSI Genetics', desc: 'Solve a forensics case' },
    { id: 'quizWhiz', icon: '\uD83C\uDFAF', label: 'Quiz Whiz', desc: 'Score 50+ in challenges' },
    { id: 'streakMaster', icon: '\uD83D\uDD25', label: 'Streak Master', desc: '5-question streak' },
    { id: 'geneWarrior', icon: '\u2694\uFE0F', label: 'Gene Warrior', desc: 'Win a battle' },
    { id: 'speedDemon', icon: '\u26A1', label: 'Speed Demon', desc: 'Replicate at 4x speed' },
    { id: 'explorer', icon: '\uD83D\uDDFA\uFE0F', label: 'Explorer', desc: 'Visit all sub-tools' },
    { id: 'dnaMaster', icon: '\uD83D\uDC51', label: 'DNA Master', desc: 'Earn 100 XP' }
  ];

  // ── Forensics Cases ──
  var FORENSIC_CASES = [
    { name: 'Crime Scene Match', desc: 'A robbery occurred. Match the evidence DNA to a suspect using restriction fragment analysis.',
      enzyme: 'EcoRI', samples: [
        { label: 'Evidence', fragments: [130, 250, 380, 510, 680], isRef: true },
        { label: 'Suspect A', fragments: [130, 290, 380, 510, 680] },
        { label: 'Suspect B', fragments: [130, 250, 380, 510, 680] },
        { label: 'Suspect C', fragments: [180, 250, 420, 510, 720] }
      ], match: 2 },
    { name: 'Paternity Test', desc: 'Determine biological parentage from DNA banding patterns.',
      enzyme: 'BamHI', samples: [
        { label: 'Child', fragments: [140, 310, 450, 600], isRef: true },
        { label: 'Mother', fragments: [140, 310, 520, 670] },
        { label: 'Father A', fragments: [200, 370, 450, 600] },
        { label: 'Father B', fragments: [140, 280, 520, 680] }
      ], match: 2 },
    { name: 'Species ID', desc: 'Identify a confiscated wildlife sample using DNA barcoding.',
      enzyme: 'HindIII', samples: [
        { label: 'Unknown', fragments: [160, 290, 430, 560, 710], isRef: true },
        { label: 'Wolf', fragments: [160, 290, 430, 560, 710] },
        { label: 'Coyote', fragments: [160, 330, 430, 600, 710] },
        { label: 'Dog', fragments: [160, 290, 470, 560, 750] }
      ], match: 1 },
    { name: 'Outbreak Source', desc: 'Trace a bacterial outbreak to its restaurant source.',
      enzyme: 'PstI', samples: [
        { label: 'Patient', fragments: [180, 340, 480, 610], isRef: true },
        { label: 'Restaurant A', fragments: [180, 340, 480, 610] },
        { label: 'Restaurant B', fragments: [220, 340, 520, 610] },
        { label: 'Restaurant C', fragments: [180, 380, 480, 650] }
      ], match: 1 }
  ];

  // ── Challenge Questions (3 tiers × 8) ──
  var CHALLENGE_QS = [
    { q: 'How many strands does DNA have?', a: '2', h: 'Think "double" helix', tier: 0 },
    { q: 'What base pairs with Adenine in DNA?', a: 'Thymine', h: 'A-T, G-C', tier: 0 },
    { q: 'What sugar is found in DNA?', a: 'Deoxyribose', h: 'The "D" in DNA', tier: 0 },
    { q: 'What shape is DNA?', a: 'Double helix', h: 'A twisted ladder', tier: 0 },
    { q: 'Which base pairs with Cytosine?', a: 'Guanine', h: 'A-T, G-C', tier: 0 },
    { q: 'Where is most DNA found in a typical eukaryotic cell?', a: 'Nucleus', h: 'Mitochondria and plant chloroplasts also contain small genomes', tier: 0 },
    { q: 'What are DNA building blocks called?', a: 'Nucleotides', h: 'Sugar + phosphate + base', tier: 0 },
    { q: 'What does DNA stand for?', a: 'Deoxyribonucleic acid', h: 'Deoxyribo-nucleic acid', tier: 0 },
    { q: 'What enzyme unwinds DNA during replication?', a: 'Helicase', h: 'It "unzips" the helix', tier: 1 },
    { q: 'In mRNA, what base replaces Thymine?', a: 'Uracil', h: 'U replaces T in RNA', tier: 1 },
    { q: 'What is the usual start codon in standard mRNA translation?', a: 'AUG', h: 'AUG usually recruits initiator methionine; exceptions exist', tier: 1 },
    { q: 'What amino acid does AUG code for?', a: 'Methionine', h: 'Also the start signal', tier: 1 },
    { q: 'What RNA carries amino acids to the ribosome?', a: 'tRNA', h: 'Transfer RNA', tier: 1 },
    { q: 'How many nucleotides code for one amino acid?', a: '3', h: 'Called a codon', tier: 1 },
    { q: 'What is a permanent change in DNA called?', a: 'Mutation', h: 'Substitution, insertion, or deletion', tier: 1 },
    { q: 'What type of bond pairs complementary DNA bases?', a: 'Hydrogen', h: 'Hydrogen bonds pair A-T and G-C; base stacking also stabilizes the helix', tier: 1 },
    { q: 'Name the enzyme that joins Okazaki fragments.', a: 'Ligase', h: 'DNA Ligase seals nicks', tier: 2 },
    { q: 'What does PAM stand for in CRISPR?', a: 'Protospacer Adjacent Motif', h: 'The Cas9 recognition sequence', tier: 2 },
    { q: 'A mutation that does NOT change the amino acid?', a: 'Silent,Synonymous', h: 'Also called synonymous', tier: 2 },
    { q: 'How many possible codons exist?', a: '64', h: '4 bases \u00d7 4 \u00d7 4', tier: 2 },
    { q: 'Which CRISPR repair pathway introduces random indels?', a: 'NHEJ', h: 'Non-Homologous End Joining', tier: 2 },
    { q: 'What is the wobble position of a codon?', a: '3rd,Third', h: 'The least specific position', tier: 2 },
    { q: 'Name the enzyme that adds RNA primers.', a: 'Primase', h: 'Creates short RNA segments', tier: 2 },
    { q: 'A single-base deletion causes what mutation type?', a: 'Frameshift', h: 'Shifts the entire reading frame', tier: 2 }
  ];

  // ── Battle Questions (10) ──
  var BATTLE_QS = [
    { q: 'What enzyme reads DNA and builds mRNA?', a: 'RNA Polymerase', h: 'RNA Pol' },
    { q: 'Name one of the three STOP codons.', a: 'UAA,UAG,UGA', h: 'U-A-A, U-A-G, or U-G-A' },
    { q: 'What holds the two strands of DNA together?', a: 'Hydrogen bonds', h: 'Between base pairs' },
    { q: 'What cellular structure carries out translation?', a: 'Ribosome', h: 'A ribosome is made of rRNA and protein' },
    { q: 'What mutation replaces one base with another?', a: 'Substitution', h: 'Also called a point mutation' },
    { q: 'DNA replication is called semi-conservative because?', a: 'Each new DNA has one old strand', h: 'Half old, half new' },
    { q: 'What does the "A" in ATP stand for?', a: 'Adenosine', h: 'Same base as in DNA!' },
    { q: 'What structure does tRNA have?', a: 'Cloverleaf', h: 'Three loops and a stem' },
    { q: 'The standard genetic code directly assigns sense codons to how many canonical amino acids?', a: '20', h: '61 sense codons specify 20 canonical amino acids; specialized recoding can add others' },
    { q: 'What is an anticodon?', a: 'tRNA sequence that pairs with mRNA codon', h: 'Found on transfer RNA' }
  ];

  // ── Learn Topics (4 topics × 4 grade bands) ──
  var LEARN_TOPICS = [
    { title: 'DNA Structure', icon: '\uD83E\uDDEC', tryIt: 'build', content: {
      'K-2': 'DNA is like a recipe book found in most of your cells. It helps cells grow and work. DNA looks like a twisted ladder called a double helix. Its four base letters are A, T, G, and C; A pairs with T, and G pairs with C.',
      '3-5': 'Most DNA in a typical eukaryotic cell is in the nucleus; mitochondria and plant chloroplasts also have small genomes. DNA forms a double helix with sugar-phosphate backbones and A-T or G-C base pairs. One human haploid nuclear genome has about 3.2 billion base pairs.',
      '6-8': 'DNA is a polymer of nucleotides, each containing deoxyribose sugar, a phosphate group, and a nitrogenous base (A, T, G, or C). The antiparallel strands run 5\u2032\u21923\u2032 and 3\u2032\u21925\u2032, connected by hydrogen bonds (2 for A-T, 3 for G-C). Chromosomes are DNA wrapped around histone proteins forming chromatin.',
      '9-12': 'DNA is commonly a right-handed B-form double helix with major and minor grooves. Each nucleotide contains 2\u2032-deoxyribose, phosphate, and a base. Double-stranded DNA follows Chargaff\u2019s relationships: %A=%T and %G=%C. B-DNA averages about 3.4 nm and 10.5 base pairs per turn; topology and chromatin regulate access.'
    }},
    { title: 'Central Dogma', icon: '\uD83D\uDD04', tryIt: 'transcribe', content: {
      'K-2': 'DNA is like a recipe, and proteins are the food! First, the cell copies the recipe (transcription) to make a message called mRNA. Then tiny machines called ribosomes read the message and build proteins (translation). Proteins do almost everything in your body!',
      '3-5': 'The Central Dogma: DNA \u2192 RNA \u2192 Protein. In transcription, RNA polymerase reads DNA and makes mRNA. The mRNA goes to a ribosome for translation - it reads mRNA in groups of 3 letters (codons) and builds a chain of amino acids that folds into a protein!',
      '6-8': 'DNA is transcribed into mRNA by RNA polymerase (reading template 3\u2032\u21925\u2032, building mRNA 5\u2032\u21923\u2032). mRNA is processed (5\u2032 cap, poly-A tail, splicing of introns) then exported to ribosomes. tRNAs with anticodons deliver amino acids; the ribosome catalyzes peptide bonds during translation.',
      '9-12': 'In many eukaryotic protein-coding genes, RNA polymerase II and general transcription factors assemble at a promoter, then synthesize pre-mRNA 5\u2032\u21923\u2032. Capping, splicing, and cleavage/polyadenylation process the transcript. During cytosolic translation, a 43S complex scans for an AUG context, the 80S ribosome cycles through A/P/E sites, eEF1A delivers aminoacyl-tRNAs, and release factors recognize stop codons.'
    }},
    { title: 'Mutations & Evolution', icon: '\uD83E\uDDA0', tryIt: 'mutate', content: {
      'K-2': 'Sometimes the cell makes a mistake when copying DNA - like a typo! These mistakes are called mutations. Most mutations don\u2019t do anything, but some can change how an organism looks or works. Over a very long time, helpful mutations help living things survive better!',
      '3-5': 'Mutations are changes in DNA sequence. A substitution swaps a base, an insertion adds sequence, and a deletion removes sequence. In a coding region, insertions or deletions not divisible by three shift the reading frame. Mutation supplies variation; selection, drift, and other processes shape populations over generations.',
      '6-8': 'Single-base substitutions can be transitions or transversions and may be synonymous, missense, or nonsense. Coding-region insertions and deletions cause a frameshift when their length is not divisible by three. Mutations may be neutral, harmful, or beneficial depending on context; selection and drift influence their frequencies.',
      '9-12': 'Mutation rates vary by organism, cell type, genomic region, and measurement method. Substitutions include transitions and transversions; repeat expansions can show anticipation. In Huntington disease, 36-39 CAG repeats have reduced penetrance and 40 or more are usually fully penetrant. A dN/dS value above 1 can support, but does not alone prove, positive selection.'
    }},
    { title: 'Genetic Engineering', icon: '\u2702\uFE0F', tryIt: 'crispr', content: {
      'K-2': 'Scientists can use tools such as CRISPR to change DNA in cells. A guide helps a protein find a chosen region, where the DNA may be cut and repaired. Some carefully tested treatments and crop studies use this approach, but editing can have limits and risks.',
      '3-5': 'Genetic engineering means intentionally changing DNA. CRISPR-Cas9 uses a guide RNA and a nearby PAM to target a region, then cellular repair creates the final edit. An approved sickle cell therapy edits a patient\u2019s blood stem cells outside the body, but CRISPR outcomes and risks must be tested carefully.',
      '6-8': 'SpCas9 uses an sgRNA spacer, typically 20 nucleotides, next to an NGG PAM. Cas9 usually cuts about three bases upstream of the PAM. End joining often produces small indels, while template-directed repair can copy a supplied donor sequence; neither pathway guarantees the intended outcome.',
      '9-12': 'Beyond Cas9: Cas12a (Cpf1) recognizes T-rich PAMs, staggered cuts. Base editors (CBE/ABE) enable C\u2192T or A\u2192G without DSBs. Prime editing: pegRNA + Cas9 nickase-RT fusion for all 12 substitution types plus small indels. Epigenome editors (dCas9-DNMT3A/TET1/p300) modulate expression without sequence changes. Delivery: AAV, LNPs, RNP electroporation.'
    }}
  ];

  // ── Module-level cleanup tracker ──
  if (!window._dnaCleanup) window._dnaCleanup = {};

  // ═══════════════════════════════════════════════════════
  // Tool Registration
  // ═══════════════════════════════════════════════════════

  window.StemLab.registerTool('dnaLab', {
    icon: '\uD83E\uDDEC',
    label: 'DNA Lab',
    desc: 'Build, replicate, transcribe, translate, mutate, CRISPR-edit, forensics & more.',
    color: 'fuchsia',
    category: 'biology',
    questHooks: [
      { id: 'transcribe', label: 'Transcribe DNA to mRNA', icon: '\uD83E\uDDEC', check: function(d) { return !!(d.mRNA && d.mRNA.length > 0); }, progress: function(d) { return d.mRNA ? 'Done!' : 'Not yet'; } },
      { id: 'translate', label: 'Translate mRNA to protein', icon: '\uD83E\uDDAA', check: function(d) { return (d.protein || []).length >= 1; }, progress: function(d) { return (d.protein || []).length >= 1 ? 'Translated!' : 'Not yet'; } },
      { id: 'mutate', label: 'Create a DNA mutation and observe the effect', icon: '\u26A0\uFE0F', check: function(d) { return d.mutationApplied || false; }, progress: function(d) { return d.mutationApplied ? 'Mutated!' : 'Try mutating'; } },
      { id: 'explore_3_tabs', label: 'Explore 3 DNA lab modes', icon: '\uD83D\uDD2C', check: function(d) { return Object.keys(d.tabsViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.tabsViewed || {}).length + '/3 modes'; } }
    ],
    ready: true,

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var toolSnapshots = ctx.toolSnapshots;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var dnaCleanupRef = React.useRef(null);
      if (!dnaCleanupRef.current) dnaCleanupRef.current = {};
      var dnaCleanup = dnaCleanupRef.current;
      var dnaCompletionRef = React.useRef({});
      var prefersReducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      React.useEffect(function() {
        return function() {
          Object.keys(dnaCleanup).forEach(function(key) {
            if (typeof dnaCleanup[key] === 'function') dnaCleanup[key]();
            dnaCleanup[key] = null;
          });
        };
      }, []);

      function sizeDnaCanvas(cv, ctx2d) {
        var rect = typeof cv.getBoundingClientRect === 'function' ? cv.getBoundingClientRect() : { width: 0, height: 0 };
        var cssWidth = Math.max(1, Math.round(cv.offsetWidth || rect.width || 1));
        var cssHeight = Math.max(1, Math.round(cv.offsetHeight || rect.height || 1));
        var dpr = Math.max(1, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
        var pixelWidth = Math.round(cssWidth * dpr);
        var pixelHeight = Math.round(cssHeight * dpr);
        var resized = cv.width !== pixelWidth || cv.height !== pixelHeight;
        if (resized) {
          cv.width = pixelWidth;
          cv.height = pixelHeight;
        }
        if (typeof ctx2d.setTransform === 'function') ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        else if (resized && typeof ctx2d.scale === 'function') ctx2d.scale(dpr, dpr);
        return { width: cssWidth, height: cssHeight };
      }

      function createDnaCanvasLoop(cv, drawFrame) {
        var frameId = null;
        var stopped = false;
        var inViewport = true;
        function isHidden() { return typeof document !== 'undefined' && document.hidden; }
        function next(shouldContinue) {
          if (stopped || !shouldContinue || prefersReducedMotion || isHidden() || !inViewport || frameId != null) return;
          frameId = requestAnimationFrame(function() {
            frameId = null;
            drawFrame();
          });
        }
        function onVisibilityChange() {
          if (stopped) return;
          if (isHidden()) {
            if (frameId != null) cancelAnimationFrame(frameId);
            frameId = null;
          } else if (cv.isConnected) {
            drawFrame();
          }
        }
        function onIntersection(entries) {
          if (stopped || !entries || !entries.length) return;
          var nextInViewport = !!entries[0].isIntersecting;
          if (nextInViewport === inViewport) return;
          inViewport = nextInViewport;
          if (!inViewport) {
            if (frameId != null) cancelAnimationFrame(frameId);
            frameId = null;
          } else if (!isHidden() && cv.isConnected) {
            drawFrame();
          }
        }
        var resizeObserver = typeof window !== 'undefined' && typeof window.ResizeObserver === 'function'
          ? new window.ResizeObserver(function() { if (!stopped && !isHidden() && cv.isConnected) drawFrame(); })
          : null;
        var intersectionObserver = typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function'
          ? new window.IntersectionObserver(onIntersection, { threshold: 0 })
          : null;
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
        if (resizeObserver) resizeObserver.observe(cv);
        if (intersectionObserver) intersectionObserver.observe(cv);
        return {
          next: next,
          stop: function() {
            stopped = true;
            if (frameId != null) cancelAnimationFrame(frameId);
            frameId = null;
            if (resizeObserver) resizeObserver.disconnect();
            if (intersectionObserver) intersectionObserver.disconnect();
            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
          }
        };
      }

      var d = (labToolData && labToolData.dnaLab) || {};
      var upd = function(key, val) { setLabToolData(function(prev) { var nd = Object.assign({}, prev.dnaLab || {}); nd[key] = val; return Object.assign({}, prev, { dnaLab: nd }); }); };
      var updMulti = function(obj) { setLabToolData(function(prev) { return Object.assign({}, prev, { dnaLab: Object.assign({}, prev.dnaLab || {}, obj) }); }); };

      // ═══ GRADE BAND HELPER ═══
      var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
      function getGradeBand() {
        var ov = d.dnaGradeOverride;
        if (ov && GRADE_BANDS.indexOf(ov) >= 0) return ov;
        var gl = (gradeLevel || '5th Grade').toLowerCase();
        if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
        if (/3rd|4th|5th/.test(gl)) return '3-5';
        if (/6th|7th|8th/.test(gl)) return '6-8';
        if (/9th|10|11|12|high/.test(gl)) return '9-12';
        return '3-5';
      }
      var gradeBand = getGradeBand();
      function gradeText(k2, g35, g68, g912) { return gradeBand === 'K-2' ? k2 : gradeBand === '3-5' ? g35 : gradeBand === '6-8' ? g68 : g912; }

      // ═══ STATE EXTRACTION ═══
      var tab = d.tab || 'build';
      var dnaSeq = d.dnaSequence || 'ATGCGTACCTGAAACTGA';
      var mRNA = d.mRNA || '';
      var protein = d.protein || [];
      var animStep = d.animStep || 0;
      var animPlaying = !!d.animPlaying;
      var speed = d.speed || 1;
      var challengeQ = d.challengeQ || null;
      var challengeAnswer = d.challengeAnswer || '';
      var challengeFeedback = d.challengeFeedback || '';
      var score = d.score || 0;

      // ═══ DERIVED VALUES ═══
      var complementStrand = dnaSeq.split('').map(function(b) { return BASE_COMPLEMENT[b] || 'N'; }).join('');
      var fullMRNA = dnaSeq.split('').map(function(b) { return CODING_TO_RNA[b] || 'N'; }).join('');

      function translateMRNA(mrna) {
        var result = [];
        var started = false;
        for (var i = 0; i <= mrna.length - 3; i += 3) {
          var codon = mrna.substring(i, i + 3);
          var aa = CODON_TABLE[codon];
          if (!aa) continue;
          if (!started && aa === 'Met') started = true;
          if (!started) continue;
          if (aa === 'Stop') { result.stop = { codon: codon, pos: i }; break; }
          result.push({ codon: codon, aa: aa, pos: i });
        }
        return result;
      }
      var fullProtein = translateMRNA(fullMRNA);
      var translationStop = fullProtein.stop || null;

      function randomDNA(len) {
        var bases = 'ATGC';
        var seq = 'ATG';
        for (var i = 3; i < (len || 21) - 3; i++) seq += bases[Math.floor(Math.random() * 4)];
        var stops = ['TAA', 'TAG', 'TGA'];
        seq += stops[Math.floor(Math.random() * 3)];
        return seq;
      }

      // ═══ BADGE HELPER ═══
      function checkBadge(id) {
        var badges = d.badges || {};
        if (badges[id]) return;
        var nb = Object.assign({}, badges);
        nb[id] = true;
        upd('badges', nb);
        var b = null;
        for (var i = 0; i < DNA_BADGES.length; i++) { if (DNA_BADGES[i].id === id) { b = DNA_BADGES[i]; break; } }
        if (b) addToast(b.icon + ' Badge: ' + b.label + '!', 'success');
        if (typeof stemCelebrate === 'function') stemCelebrate();
      }

      // XP badge check
      if (getStemXP('dnaLab') >= 100) checkBadge('dnaMaster');

      // ═══════════════════════════════════════════
      // CANVAS: DNA Helix (callback ref)
      // ═══════════════════════════════════════════
      var _dnaCanvasRef = function(cv) {
        if (dnaCleanup.dnaAnim) { dnaCleanup.dnaAnim(); dnaCleanup.dnaAnim = null; }
        if (!cv) return;
        if (tab !== 'build' && tab !== 'transcribe') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        // React re-fires this inline ref on every re-render; setting cv.width (even to
        // the same value) reallocates + CLEARS the canvas and resets the ctx transform.
        // Only resize when the size actually changed, and persist the animation tick on
        // the node — otherwise the helix wobble snaps back to 0 on every render (stutter).
        var canvasSize = sizeDnaCanvas(cv, ctx2d);
        var w = canvasSize.width, hh = canvasSize.height;
        var _tick = cv._dnaTick || 0;
        var loop = null;
        var currentAnimStep = animStep;
        var hoveredIndex = -1;

        function draw3DSphere(ctx, x, y, r, baseChar) {
          var baseColor = BASE_COLORS[baseChar] || '#888';
          var darkColor = BASE_DARK_COLORS[baseChar] || '#444';
          var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.3, baseColor);
          grad.addColorStop(1, darkColor);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold ' + Math.max(9, r * 1.2) + 'px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 3;
          ctx.fillText(baseChar, x, y);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        cv.onmousemove = function(e) {
          var rect = cv.getBoundingClientRect();
          var scaleX = w / Math.max(1, rect.width);
          var scaleY = hh / Math.max(1, rect.height);
          var mX = (e.clientX - rect.left) * scaleX;
          var mY = (e.clientY - rect.top) * scaleY;

          var baseW = Math.min(32, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = hh / 2;

          var found = -1;
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * 18;
            var topY = midY - 25 + yOff;
            var bottomY = midY + 25 - yOff;

            var distTop = Math.sqrt((mX - x)*(mX - x) + (mY - topY)*(mY - topY));
            var distBottom = Math.sqrt((mX - x)*(mX - x) + (mY - bottomY)*(mY - bottomY));
            var radius = baseW * 0.38;

            if (distTop <= radius + 5 || distBottom <= radius + 5) {
              found = i;
              break;
            }
          }

          if (found !== hoveredIndex) {
            hoveredIndex = found;
            cv.style.cursor = (found !== -1) ? 'pointer' : '';
          }
        };

        cv.onmouseleave = function() {
          hoveredIndex = -1;
          cv.style.cursor = '';
        };

        cv.onclick = function(e) {
          if (hoveredIndex !== -1) {
            sfxDnaClick();
            var order = 'ATGC';
            var currentBase = dnaSeq[hoveredIndex];
            var next = order[(order.indexOf(currentBase) + 1) % 4];
            var newSeq = dnaSeq.substring(0, hoveredIndex) + next + dnaSeq.substring(hoveredIndex + 1);
            updMulti({ dnaSequence: newSeq, mRNA: '', protein: [], animStep: 0, animPlaying: false });
            announceToSR('Mutated base at position ' + (hoveredIndex + 1) + ' to ' + next);
          }
        };

        function draw() {
          if (!ctx2d.canvas.isConnected) return;
          canvasSize = sizeDnaCanvas(cv, ctx2d);
          w = canvasSize.width; hh = canvasSize.height;
          ctx2d.clearRect(0, 0, w, hh);
          var baseW = Math.min(32, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = hh / 2;
          var helixAmp = 18;

          // Draw template strand backbone
          ctx2d.strokeStyle = '#94a3b8'; ctx2d.lineWidth = 2.5;
          ctx2d.shadowColor = 'rgba(148, 163, 184, 0.45)'; ctx2d.shadowBlur = 6;
          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (i === 0) ctx2d.moveTo(x, midY - 25 + yOff); else ctx2d.lineTo(x, midY - 25 + yOff);
          }
          ctx2d.stroke();

          // Draw coding/mRNA strand backbone
          ctx2d.beginPath();
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            if (tab === 'transcribe' && i < currentAnimStep) continue;
            if (i === 0 || (tab === 'transcribe' && i === currentAnimStep)) ctx2d.moveTo(x, midY + 25 - yOff);
            else ctx2d.lineTo(x, midY + 25 - yOff);
          }
          ctx2d.stroke();
          ctx2d.shadowColor = 'transparent'; ctx2d.shadowBlur = 0;

          // Draw bonds and base spheres
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            var base = dnaSeq[i]; var comp = complementStrand[i];
            var topY = midY - 25 + yOff;
            var bottomY = midY + 25 - yOff;

            // Draw hydrogen bonds
            if (!(tab === 'transcribe' && i < currentAnimStep)) {
              var pulseDashOffset = -_tick * 0.5;
              ctx2d.setLineDash([3, 3]);
              ctx2d.lineDashOffset = pulseDashOffset;
              var isGC = (base === 'G' && comp === 'C') || (base === 'C' && comp === 'G');
              ctx2d.strokeStyle = isGC ? 'rgba(34, 197, 94, 0.8)' : 'rgba(59, 130, 246, 0.8)';
              ctx2d.lineWidth = isGC ? 2.5 : 1.5;
              ctx2d.shadowColor = isGC ? '#22c55e' : '#3b82f6';
              ctx2d.shadowBlur = 8;

              var bY = tab === 'transcribe' ? bottomY + 15 : bottomY;
              ctx2d.beginPath();
              ctx2d.moveTo(x, topY + baseW * 0.38);
              ctx2d.lineTo(x, bY - baseW * 0.38);
              ctx2d.stroke();

              ctx2d.shadowColor = 'transparent';
              ctx2d.shadowBlur = 0;
              ctx2d.setLineDash([]);
              ctx2d.lineDashOffset = 0;
            }

            // Draw 3D base spheres
            draw3DSphere(ctx2d, x, topY, baseW * 0.38, base);

            if (tab === 'transcribe' && i < currentAnimStep) {
              var rnaBase = CODING_TO_RNA[base] || base; // match the mRNA string (coding strand, T→U) — not the complement
              draw3DSphere(ctx2d, x, bottomY + 15, baseW * 0.38, rnaBase);
            } else {
              draw3DSphere(ctx2d, x, bottomY, baseW * 0.38, comp);
            }

            // Draw hover rings
            if (i === hoveredIndex) {
              var pulse = 1 + 0.15 * Math.sin(_tick * 0.15);
              ctx2d.strokeStyle = 'rgba(234, 179, 8, 0.95)';
              ctx2d.lineWidth = 2.5;
              ctx2d.shadowColor = '#eab308';
              ctx2d.shadowBlur = 8;
              
              ctx2d.beginPath();
              ctx2d.arc(x, topY, baseW * 0.38 * pulse, 0, Math.PI * 2);
              ctx2d.stroke();

              if (!(tab === 'transcribe' && i < currentAnimStep)) {
                ctx2d.beginPath();
                ctx2d.arc(x, (tab === 'transcribe' ? bottomY + 15 : bottomY), baseW * 0.38 * pulse, 0, Math.PI * 2);
                ctx2d.stroke();
              }
              ctx2d.shadowColor = 'transparent';
              ctx2d.shadowBlur = 0;
            }

            // Draw RNA Polymerase
            if (tab === 'transcribe' && i === currentAnimStep && currentAnimStep < dnaSeq.length) {
              ctx2d.fillStyle = 'rgba(168, 85, 247, 0.15)';
              ctx2d.strokeStyle = 'rgba(168, 85, 247, 0.4)';
              ctx2d.lineWidth = 1.5;
              ctx2d.shadowColor = 'rgba(168, 85, 247, 0.5)'; ctx2d.shadowBlur = 12;
              ctx2d.beginPath(); ctx2d.arc(x, midY, baseW * 1.6, 0, Math.PI * 2); ctx2d.fill(); ctx2d.stroke();
              ctx2d.shadowColor = 'transparent'; ctx2d.shadowBlur = 0;
              ctx2d.fillStyle = '#a855f7'; ctx2d.font = 'bold 9px sans-serif';
              ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
              ctx2d.fillText('RNA Pol', x, midY - baseW * 1.9);
            }
          }

          ctx2d.fillStyle = '#cbd5e1'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'middle';
          ctx2d.fillText("3'", startX - 18, midY - 25);
          ctx2d.fillText("5'", startX + dnaSeq.length * baseW + 4, midY - 25);
          ctx2d.fillText("5'", startX - 18, midY + 25);
          ctx2d.fillText("3'", startX + dnaSeq.length * baseW + 4, midY + 25);
          ctx2d.fillStyle = '#f8fafc';
          ctx2d.fillText('Template', startX - 18, midY - 45);
          ctx2d.fillText('Coding', startX - 18, midY + 45);

          _tick++;
          cv._dnaTick = _tick; // persist across ref re-fires so the wobble stays continuous
          loop.next(tab === 'build' || animPlaying);
        }
        loop = createDnaCanvasLoop(cv, draw);
        draw();
        dnaCleanup.dnaAnim = loop.stop;
      };

      // ═══ Transcription timer ═══
      React.useEffect(function() {
        if (tab !== 'transcribe' || !animPlaying) return;
        if (animStep >= dnaSeq.length) {
          updMulti({ animPlaying: false, mRNA: fullMRNA });
          var completionKey = fullMRNA;
          if (dnaCompletionRef.current.transcribe !== completionKey) {
            dnaCompletionRef.current.transcribe = completionKey;
          announceToSR('Transcription complete. mRNA: ' + fullMRNA);
          awardStemXP('dnaLab', 10, 'Completed transcription');
          checkBadge('messenger');
          }
          return;
        }
        var timer = setTimeout(function() {
          updMulti({ animStep: animStep + 1, mRNA: fullMRNA.substring(0, animStep + 1) });
        }, 600 / speed);
        return function() { clearTimeout(timer); };
      }, [tab, animPlaying, animStep, dnaSeq.length, fullMRNA, speed]);

      // ═══════════════════════════════════════════
      // CANVAS: Replication Fork (callback ref)
      // ═══════════════════════════════════════════
      var replStep = d.replStep || 0;
      var replPlaying = !!d.replPlaying;

      var _replCanvasRef = function(cv) {
        if (dnaCleanup.replAnim) { dnaCleanup.replAnim(); dnaCleanup.replAnim = null; }
        if (!cv) return;
        if (tab !== 'replicate') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var canvasSize = sizeDnaCanvas(cv, ctx2d);
        var w = canvasSize.width, h2 = canvasSize.height;
        var _tick = cv._dnaReplTick || 0;
        var loop = null;
        var currentReplStep = replStep;

        function drawRepl() {
          if (!ctx2d.canvas.isConnected) return;
          canvasSize = sizeDnaCanvas(cv, ctx2d);
          w = canvasSize.width; h2 = canvasSize.height;
          ctx2d.clearRect(0, 0, w, h2);
          var baseW = Math.min(28, (w - 100) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = h2 / 2;
          var helixAmp = 14;

          ctx2d.fillStyle = '#e2e8f0'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left';
          ctx2d.fillText('DNA Replication Fork', 10, 14);

          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2;
            var yOff = Math.sin((i * 0.5) + _tick * 0.02) * helixAmp;
            var base = dnaSeq[i];
            var comp = complementStrand[i];
            var topY = midY - 22 + yOff;
            var bottomY = midY + 22 - yOff;

            if (i >= currentReplStep) {
              ctx2d.fillStyle = BASE_COLORS[base] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, topY, baseW * 0.35, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.font = 'bold ' + Math.max(8, baseW * 0.5) + 'px monospace'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
              ctx2d.fillText(base, x, topY);

              ctx2d.setLineDash([2, 2]); ctx2d.strokeStyle = 'rgba(148,163,184,0.5)';
              ctx2d.beginPath(); ctx2d.moveTo(x, topY + baseW * 0.35); ctx2d.lineTo(x, bottomY - baseW * 0.35); ctx2d.stroke();
              ctx2d.setLineDash([]);

              ctx2d.fillStyle = BASE_COLORS[comp] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, bottomY, baseW * 0.35, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, bottomY);
            } else {
              var spreadTop = midY - 48 + yOff;
              var spreadBot = midY + 48 - yOff;
              ctx2d.fillStyle = BASE_COLORS[base] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, spreadTop, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(base, x, spreadTop);
              ctx2d.fillStyle = BASE_COLORS[comp] || '#888'; ctx2d.globalAlpha = 0.7;
              ctx2d.beginPath(); ctx2d.arc(x, spreadTop + baseW * 0.9, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, spreadTop + baseW * 0.9);
              ctx2d.globalAlpha = 1;
              ctx2d.fillStyle = BASE_COLORS[comp] || '#888';
              ctx2d.beginPath(); ctx2d.arc(x, spreadBot, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(comp, x, spreadBot);
              ctx2d.fillStyle = BASE_COLORS[base] || '#888'; ctx2d.globalAlpha = 0.7;
              ctx2d.beginPath(); ctx2d.arc(x, spreadBot - baseW * 0.9, baseW * 0.32, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#fff'; ctx2d.fillText(base, x, spreadBot - baseW * 0.9);
              ctx2d.globalAlpha = 1;
            }

            if (i === currentReplStep && currentReplStep < dnaSeq.length) {
              ctx2d.fillStyle = 'rgba(168, 85, 247, 0.25)';
              ctx2d.beginPath(); ctx2d.arc(x, midY, baseW * 2, 0, Math.PI * 2); ctx2d.fill();
              ctx2d.fillStyle = '#7c3aed'; ctx2d.font = 'bold 9px sans-serif'; ctx2d.textAlign = 'center';
              ctx2d.fillText('Helicase', x, midY - baseW * 2.2);
              ctx2d.fillStyle = '#059669'; ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('DNA Pol III', x, midY + baseW * 2.5);
            }
          }

          ctx2d.fillStyle = '#94a3b8'; ctx2d.font = 'bold 9px sans-serif'; ctx2d.textAlign = 'right';
          ctx2d.fillText("5' \u2192 3' (Leading)", w - 10, midY - 55);
          ctx2d.textAlign = 'left';
          ctx2d.fillText("3' \u2192 5' (Lagging)", 10, midY + 60);

          _tick++;
          cv._dnaReplTick = _tick; // preserve helix phase when each replication step reattaches the callback ref
          loop.next(replPlaying && currentReplStep < dnaSeq.length);
        }
        loop = createDnaCanvasLoop(cv, drawRepl);
        drawRepl();
        dnaCleanup.replAnim = loop.stop;
      };

      // ═══════════════════════════════════════════
      // CANVAS: Translation (callback ref)
      // ═══════════════════════════════════════════
      var _translationCanvasRef = function(cv) {
        if (dnaCleanup.transAnim) { dnaCleanup.transAnim(); dnaCleanup.transAnim = null; }
        if (!cv) return;
        if (tab !== 'translate') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var canvasSize = sizeDnaCanvas(cv, ctx2d);
        var w = canvasSize.width, hh = canvasSize.height;
        var _tick = cv._dnaTransTick || 0;
        var loop = null;
        var lastStep = cv._dnaTransStep != null ? cv._dnaTransStep : -1;
        var stepStartTime = lastStep === transStep && cv._dnaTransStepStart ? cv._dnaTransStepStart : Date.now();

        function drawTRNA(ctx, x, y, anticodon, aaChar, hasAA, alpha) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 4;
          
          // Cloverleaf structure
          ctx.beginPath();
          ctx.moveTo(x, y - 15); ctx.lineTo(x, y);
          ctx.arc(x - 9, y - 8, 4, 0, Math.PI * 2);
          ctx.arc(x + 9, y - 8, 4, 0, Math.PI * 2);
          ctx.arc(x, y + 8, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          if (anticodon) {
            ctx.fillStyle = '#bae6fd';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(anticodon, x, y + 8);
          }

          if (hasAA && aaChar) {
            var aaColor = (AA_PROPS[aaChar] && AA_PROPS[aaChar].color) || '#cbd5e1';
            var r = 6;
            var grad = ctx.createRadialGradient(x - r*0.3, y - 20 - r*0.3, r*0.1, x, y - 20, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, aaColor);
            grad.addColorStop(1, '#222');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y - 20, r, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 6px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((AA_PROPS[aaChar] && AA_PROPS[aaChar].abbr) || aaChar.substring(0,1), x, y - 20);
          }
          ctx.restore();
        }

        function drawTrans() {
          if (!ctx2d.canvas.isConnected) return;
          canvasSize = sizeDnaCanvas(cv, ctx2d);
          w = canvasSize.width; hh = canvasSize.height;
          ctx2d.clearRect(0, 0, w, hh);

          // Track step duration & progress
          var duration = 800 / speed;
          if (transStep !== lastStep) {
            lastStep = transStep;
            stepStartTime = Date.now();
            cv._dnaTransStep = lastStep;
            cv._dnaTransStepStart = stepStartTime;
          }
          var pct = transPlaying ? (prefersReducedMotion ? 1 : Math.min(1, (Date.now() - stepStartTime) / duration)) : 0;

          var midY = hh / 2 + 10;
          var yChannel = midY + 15;

          // ─── 1. DRAW RIBOSOME ENVELOPE ───
          ctx2d.shadowColor = 'rgba(16, 185, 129, 0.2)';
          ctx2d.shadowBlur = 10;

          // Large Subunit (top green dome)
          ctx2d.fillStyle = 'rgba(16, 185, 129, 0.12)';
          ctx2d.strokeStyle = 'rgba(16, 185, 129, 0.6)';
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          ctx2d.moveTo(w / 2 - 90, yChannel - 5);
          ctx2d.bezierCurveTo(w / 2 - 90, yChannel - 85, w / 2 + 90, yChannel - 85, w / 2 + 90, yChannel - 5);
          ctx2d.closePath();
          ctx2d.fill();
          ctx2d.stroke();

          // Small Subunit (bottom green capsule)
          ctx2d.fillStyle = 'rgba(52, 211, 153, 0.15)';
          ctx2d.strokeStyle = 'rgba(52, 211, 153, 0.6)';
          ctx2d.beginPath();
          ctx2d.roundRect(w / 2 - 80, yChannel + 5, 160, 30, 10);
          ctx2d.fill();
          ctx2d.stroke();
          ctx2d.shadowBlur = 0;

          // E, P, A Site Boxes
          var xP = w / 2;
          var xE = w / 2 - 45;
          var xA = w / 2 + 45;

          ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx2d.lineWidth = 1;
          ctx2d.setLineDash([2, 2]);
          [xE, xP, xA].forEach(function(slotX) {
            ctx2d.strokeRect(slotX - 15, yChannel - 50, 30, 45);
          });
          ctx2d.setLineDash([]);

          // EPA Labels
          ctx2d.fillStyle = 'rgba(16, 185, 129, 0.8)';
          ctx2d.font = 'bold 9px sans-serif';
          ctx2d.textAlign = 'center';
          ctx2d.fillText('E', xE, yChannel - 55);
          ctx2d.fillText('P', xP, yChannel - 55);
          ctx2d.fillText('A', xA, yChannel - 55);

          // ─── 2. DRAW mRNA STRAND ───
          // Draw mRNA backbone
          ctx2d.strokeStyle = '#a855f7';
          ctx2d.lineWidth = 3;
          ctx2d.beginPath();
          ctx2d.moveTo(0, yChannel + 15);
          ctx2d.lineTo(w, yChannel + 15);
          ctx2d.stroke();

          var codonW = 42;
          var startX = w / 2; // P-site align

          var codons = (fullMRNA.match(/.{1,3}/g) || []);
          codons.forEach(function(codon, idx) {
            // codon horizontal center
            var cx = startX + (idx - transStep - pct) * codonW;
            if (cx < -40 || cx > w + 40) return;

            // Draw 3 bases inside the codon
            for (var b = 0; b < 3; b++) {
              var baseChar = codon[b];
              var bx = cx - 12 + b * 12;
              var baseColor = BASE_COLORS[baseChar] || '#888';

              // Draw base dot
              ctx2d.fillStyle = baseColor;
              ctx2d.beginPath();
              ctx2d.arc(bx, yChannel + 15, 4.5, 0, Math.PI * 2);
              ctx2d.fill();

              // Draw base label
              ctx2d.fillStyle = '#fff';
              ctx2d.font = 'bold 6px monospace';
              ctx2d.fillText(baseChar, bx, yChannel + 15);
            }

            // Codon boundary bracket
            ctx2d.strokeStyle = 'rgba(168, 85, 247, 0.3)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(cx - 16, yChannel + 22);
            ctx2d.lineTo(cx - 16, yChannel + 25);
            ctx2d.lineTo(cx + 16, yChannel + 25);
            ctx2d.lineTo(cx + 16, yChannel + 22);
            ctx2d.stroke();

            ctx2d.fillStyle = 'rgba(168, 85, 247, 0.7)';
            ctx2d.font = 'bold 7px sans-serif';
            ctx2d.fillText(codon, cx, yChannel + 32);
          });

          // ─── 3. DRAW ANIMATING tRNAs & POLYPEPTIDE CHAIN ───
          // tRNA 1: Exiting E-site
          if (transStep > 0) {
            var t1Codon = codons[transStep - 1];
            var compMap = { 'A':'U', 'U':'A', 'G':'C', 'C':'G' };
            var t1Anti = t1Codon ? t1Codon.split('').map(function(c) { return compMap[c] || 'U'; }).join('') : '';

            var t1X = xE - pct * 35;
            var t1Y = (yChannel - 20) - pct * 60;
            var t1Alpha = Math.max(0, 1 - pct * 1.5);
            drawTRNA(ctx2d, t1X, t1Y, t1Anti, null, false, t1Alpha);
          }

          // tRNA 2: P-site shifting to E-site
          var t2Codon = transStep > 0 ? codons[transStep - 1] : null;
          if (t2Codon) {
            var compMap = { 'A':'U', 'U':'A', 'G':'C', 'C':'G' };
            var t2Anti = t2Codon.split('').map(function(c) { return compMap[c] || 'U'; }).join('');
            var t2X = xP - pct * codonW;
            var t2Y = yChannel - 20;
            var t2AA = CODON_TABLE[t2Codon];
            var t2HasAA = pct < 0.4;
            drawTRNA(ctx2d, t2X, t2Y, t2Anti, t2AA, t2HasAA, 1);
          }

          // tRNA 3: Incoming A-site landing & shifting to P-site
          var t3Codon = transStep < codons.length ? codons[transStep] : null;
          if (t3Codon && transPlaying) {
            var compMap = { 'A':'U', 'U':'A', 'G':'C', 'C':'G' };
            var t3Anti = t3Codon.split('').map(function(c) { return compMap[c] || 'U'; }).join('');
            
            var t3X = xA - pct * codonW;
            var t3Y = yChannel - 20;
            if (pct < 0.5) {
              var f = (0.5 - pct) * 2;
              t3Y = (yChannel - 20) + f * 50;
            }
            var t3AA = CODON_TABLE[t3Codon];
            drawTRNA(ctx2d, t3X, t3Y, t3Anti, t3AA, true, 1);
          }

          // ─── 4. DRAW GROWING POLYPEPTIDE CHAIN ───
          if (builtProtein.length > 0) {
            var anchorX, anchorY;
            if (pct < 0.4) {
              anchorX = xP - pct * codonW;
              anchorY = yChannel - 40;
            } else {
              var t3X = xA - pct * codonW;
              var t3Y = yChannel - 20;
              if (pct < 0.5) {
                var f = (0.5 - pct) * 2;
                t3Y = (yChannel - 20) + f * 50;
              }
              anchorX = t3X;
              anchorY = t3Y - 20;
            }

            ctx2d.strokeStyle = '#94a3b8';
            ctx2d.lineWidth = 1.5;
            
            var prevX = anchorX;
            var prevY = anchorY;

            for (var k = builtProtein.length - 1; k >= 0; k--) {
              var aaData = builtProtein[k];
              var aaChar = aaData.aa;
              var depth = builtProtein.length - 1 - k;

              var sx = anchorX + Math.sin(_tick * 0.06 + depth * 0.5) * 5;
              var sy = anchorY - 14 - depth * 12;

              ctx2d.beginPath();
              ctx2d.moveTo(prevX, prevY);
              ctx2d.lineTo(sx, sy);
              ctx2d.stroke();

              var aaColor = (AA_PROPS[aaChar] && AA_PROPS[aaChar].color) || '#cbd5e1';
              var r = 5.5;
              var grad = ctx2d.createRadialGradient(sx - r*0.3, sy - r*0.3, r*0.1, sx, sy, r);
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(0.3, aaColor);
              grad.addColorStop(1, '#222');

              ctx2d.fillStyle = grad;
              ctx2d.beginPath();
              ctx2d.arc(sx, sy, r, 0, Math.PI * 2);
              ctx2d.fill();

              ctx2d.fillStyle = '#ffffff';
              ctx2d.font = 'bold 5px sans-serif';
              ctx2d.fillText((AA_PROPS[aaChar] && AA_PROPS[aaChar].abbr) || aaChar.substring(0,1), sx, sy);

              prevX = sx;
              prevY = sy;
            }
          }

          _tick++;
          cv._dnaTransTick = _tick;
          cv._dnaTransStep = lastStep;
          cv._dnaTransStepStart = stepStartTime;
          loop.next(transPlaying);
        }
        loop = createDnaCanvasLoop(cv, drawTrans);
        drawTrans();
        dnaCleanup.transAnim = loop.stop;
      };

      // ═══ Replication timer ═══
      React.useEffect(function() {
      if (tab === 'replicate' && replPlaying) {
        if (replStep >= dnaSeq.length) {
          updMulti({ replPlaying: false });
          var completionKey = dnaSeq + ':' + dnaSeq.length;
          if (dnaCompletionRef.current.replicate !== completionKey) {
            dnaCompletionRef.current.replicate = completionKey;
          announceToSR('DNA replication complete! Two identical copies created.');
          awardStemXP('dnaLab', 15, 'Completed DNA replication');
          addToast('\uD83E\uDDEC Replication complete! Two daughter strands formed.', 'success');
          if (typeof stemCelebrate === 'function') stemCelebrate();
          checkBadge('copyMachine');
          if (speed >= 4) checkBadge('speedDemon');
          }
        } else {
          var timer = setTimeout(function() {
            upd('replStep', replStep + 1);
          }, 500 / speed);
          return function() { clearTimeout(timer); };
        }
      }
      }, [tab, replPlaying, replStep, dnaSeq, speed]);

      // ═══ Translation state + timer ═══
      var transStep = d.transStep || 0;
      var transPlaying = !!d.transPlaying;
      var builtProtein = d.builtProtein || [];

      React.useEffect(function() {
      if (tab === 'translate' && transPlaying) {
        var tPos = transStep * 3;
        if (tPos + 3 > fullMRNA.length) {
          updMulti({ transPlaying: false });
        } else {
          var tCodon = fullMRNA.substring(tPos, tPos + 3);
          var tAA = CODON_TABLE[tCodon];
          if (!tAA || tAA === 'Stop') {
            updMulti({ transPlaying: false, protein: builtProtein });
            var completionKey = fullMRNA + ':' + builtProtein.length;
            if (dnaCompletionRef.current.translate !== completionKey) {
              dnaCompletionRef.current.translate = completionKey;
            announceToSR('Translation complete. Protein has ' + builtProtein.length + ' amino acids.');
            awardStemXP('dnaLab', 15, 'Completed translation');
            checkBadge('ribosomePro');
            }
          } else {
            var timer = setTimeout(function() {
              updMulti({ transStep: transStep + 1, builtProtein: builtProtein.concat([{ codon: tCodon, aa: tAA, pos: tPos }]) });
              announceToSR('Codon ' + tCodon + ' = ' + (AA_PROPS[tAA] ? AA_PROPS[tAA].full : tAA));
            }, 800 / speed);
            return function() { clearTimeout(timer); };
          }
        }
      }
      }, [tab, transPlaying, transStep, fullMRNA, builtProtein, speed]);

      // ═══ CHALLENGE HELPERS ═══
      var challengeTier = d.challengeTier || 0;

      function generateChallenge() {
        var tierQs = CHALLENGE_QS.filter(function(q) { return q.tier === challengeTier; });
        var q = tierQs[Math.floor(Math.random() * tierQs.length)];
        updMulti({ challengeQ: { type: 'static', question: q.q, answer: q.a, hint: q.h }, challengeAnswer: '', challengeFeedback: '' });
        announceToSR('Challenge: ' + q.q);
      }

      function checkChallenge() {
        if (!challengeQ || !challengeAnswer) return;
        var answers = challengeQ.answer.split(',');
        var correct = answers.some(function(a) { return challengeAnswer.trim().toUpperCase() === a.trim().toUpperCase(); });
        if (correct) {
          var newStreak = (d.challengeStreak || 0) + 1;
          var bonus = newStreak >= 3 ? 5 : 0;
          updMulti({ challengeFeedback: '\u2705 Correct!' + (bonus ? ' (+' + bonus + ' streak bonus!)' : ''), score: score + 10 + bonus, challengeStreak: newStreak });
          awardStemXP('dnaLab', 10, 'Challenge correct');
          announceToSR('Correct!'); if (typeof stemCelebrate === 'function') stemCelebrate();
          if (score + 10 >= 50) checkBadge('quizWhiz');
          if (newStreak >= 5) checkBadge('streakMaster');
        } else {
          updMulti({ challengeFeedback: '\u274c The answer is ' + answers[0] + '. ' + (challengeQ.hint || ''), challengeStreak: 0 });
          announceToSR('Incorrect. Answer: ' + answers[0]);
        }
      }

      // ═══ MUTATION HELPERS ═══
      function applyMutation(type) {
        var bases = 'ATGC'; var seq = dnaSeq.split('');
        var pos = Math.floor(Math.random() * (seq.length - 6)) + 3;
        var original = seq[pos]; var mutated;
        var newLog = (d.mutationLog || []).slice();
        if (type === 'substitution') {
          do { mutated = bases[Math.floor(Math.random() * 4)]; } while (mutated === original);
          seq[pos] = mutated;
          newLog.push({ type: 'Substitution', pos: pos, from: original, to: mutated });
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: newLog });
          addToast('\uD83E\uDDEC Substitution at pos ' + (pos + 1) + ': ' + original + ' \u2192 ' + mutated, 'success');
        } else if (type === 'insertion') {
          mutated = bases[Math.floor(Math.random() * 4)];
          seq.splice(pos, 0, mutated);
          newLog.push({ type: 'Insertion', pos: pos, to: mutated });
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: newLog });
          addToast('\uD83E\uDDEC Insertion at pos ' + (pos + 1) + ': +' + mutated, 'success');
        } else {
          var removed = seq.splice(pos, 1)[0];
          newLog.push({ type: 'Deletion', pos: pos, from: removed });
          updMulti({ dnaSequence: seq.join(''), mRNA: '', protein: [], animStep: 0, mutationLog: newLog });
          addToast('\uD83E\uDDEC Deletion at pos ' + (pos + 1) + ': -' + removed, 'success');
        }
        awardStemXP('dnaLab', 3, 'Applied ' + type + ' mutation');
        if (newLog.length >= 5) checkBadge('mutantMaker');
      }

      // ═══ CRISPR HELPERS ═══
      var crisprPhase = d.crisprPhase || 'design';
      var crisprScanPos = d.crisprScanPos || 0;
      var crisprGuideLen = 6; // Schematic window; real SpCas9 spacers are typically 20 nt.
      var crisprRepairType = d.crisprRepairType || '';
      var crisprEditLog = d.crisprEditLog || [];

      function findPAMSites(seq) {
        var sites = [];
        for (var i = 0; i <= seq.length - 3; i++) {
          if (seq[i + 1] === 'G' && seq[i + 2] === 'G' && i >= crisprGuideLen) {
            sites.push({
              pamStart: i,
              guideStart: i - crisprGuideLen,
              guideEnd: i,
              cutSite: i - 3
            });
          }
        }
        return sites;
      }
      var pamSites = findPAMSites(dnaSeq);
      var requestedPAM = d.crisprTargetPAM != null ? d.crisprTargetPAM : 0;
      var activePAM = requestedPAM >= 0 && requestedPAM < pamSites.length ? requestedPAM : (pamSites.length > 0 ? 0 : -1);
      var selectedPAMSite = activePAM >= 0 ? pamSites[activePAM] : null;
      var crisprDonorBase = d.crisprDonorBase || (selectedPAMSite ? BASE_COMPLEMENT[dnaSeq[selectedPAMSite.cutSite]] : 'A');

      function startCRISPRScan() {
        updMulti({ crisprPhase: 'scanning', crisprScanPos: 0 });
        announceToSR('Cas9 scanning DNA for target sequence...');
      }

      function applyCRISPRRepair(type) {
        if (!selectedPAMSite) return;
        var seq = dnaSeq.split('');
        var cutPos = selectedPAMSite.cutSite;
        var resultSeq, desc;
        if (type === 'nhej') {
          var delLen = Math.floor(Math.random() * 3) + 1;
          var deleted = seq.splice(Math.max(0, cutPos - 1), delLen);
          resultSeq = seq.join('');
          desc = 'NHEJ: deleted ' + deleted.join('') + ' at pos ' + cutPos + ' (error-prone, may cause frameshift)';
        } else {
          var newBase = crisprDonorBase;
          seq[cutPos] = newBase;
          resultSeq = seq.join('');
          desc = 'HDR model: donor template replaced base at pos ' + (cutPos + 1) + ' with ' + newBase;
        }
        updMulti({
          dnaSequence: resultSeq, mRNA: '', protein: [], animStep: 0,
          crisprPhase: 'done', crisprRepairType: type,
          crisprEditLog: crisprEditLog.concat([{ type: type.toUpperCase(), pos: cutPos, desc: desc, time: Date.now() }])
        });
        addToast('\u2702\uFE0F CRISPR edit applied: ' + type.toUpperCase(), 'success');
        awardStemXP('dnaLab', 20, 'Completed CRISPR gene edit');
        if (typeof stemCelebrate === 'function') stemCelebrate();
        checkBadge('geneEditor');
      }

      // CRISPR scanning timer
      React.useEffect(function() {
      if (tab === 'crispr' && crisprPhase === 'scanning') {
        if (!selectedPAMSite) {
          updMulti({ crisprPhase: 'design' });
        } else {
          var targetPos = selectedPAMSite.cutSite;
          if (crisprScanPos >= targetPos) {
            updMulti({ crisprPhase: 'cut' });
            var completionKey = dnaSeq + ':' + targetPos;
            if (dnaCompletionRef.current.crisprTarget !== completionKey) {
              dnaCompletionRef.current.crisprTarget = completionKey;
            announceToSR('Cas9 found target! PAM site located. Ready to cut.');
            addToast('\uD83C\uDFAF Cas9 found the target PAM site!', 'success');
            stemBeep && stemBeep();
            }
          } else {
            var timer = setTimeout(function() {
              upd('crisprScanPos', crisprScanPos + 1);
            }, 200 / speed);
            return function() { clearTimeout(timer); };
          }
        }
      }
      }, [tab, crisprPhase, crisprScanPos, selectedPAMSite, speed]);

      // ═══════════════════════════════════════════
      // CANVAS: CRISPR (callback ref)
      // ═══════════════════════════════════════════
      var _crisprCanvasRef = function(cv) {
        if (dnaCleanup.crisprAnim) { dnaCleanup.crisprAnim(); dnaCleanup.crisprAnim = null; }
        if (!cv) return;
        if (tab !== 'crispr') return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var canvasSize = sizeDnaCanvas(cv, ctx2d);
        var w = canvasSize.width, h2 = canvasSize.height;
        var _tick = cv._dnaCrisprTick || 0;
        var loop = null;
        var lastPhase = cv._dnaCrisprPhase || '';
        var phaseStartTime = lastPhase === crisprPhase && cv._dnaCrisprPhaseStart ? cv._dnaCrisprPhaseStart : Date.now();

        function drawCRISPR() {
          if (!ctx2d.canvas.isConnected) return;
          canvasSize = sizeDnaCanvas(cv, ctx2d);
          w = canvasSize.width; h2 = canvasSize.height;
          ctx2d.clearRect(0, 0, w, h2);
          var baseW = Math.min(24, (w - 80) / dnaSeq.length);
          var startX = (w - dnaSeq.length * baseW) / 2;
          var midY = h2 / 2 - 5;

          if (crisprPhase !== lastPhase) {
            lastPhase = crisprPhase;
            phaseStartTime = Date.now();
            cv._dnaCrisprPhase = lastPhase;
            cv._dnaCrisprPhaseStart = phaseStartTime;
          }
          var elapsed = prefersReducedMotion ? 1200 : Date.now() - phaseStartTime;

          var cutSite = selectedPAMSite ? selectedPAMSite.cutSite : 0;
          
          // Calculate cut split displacement
          var displacement = 0;
          if (crisprPhase === 'cut') {
            var cutPct = Math.min(1, elapsed / 800);
            displacement = 22 * cutPct;
          } else if (crisprPhase === 'done') {
            var repairPct = Math.min(1, elapsed / 1200);
            displacement = 22 * (1 - repairPct);
          }

          ctx2d.fillStyle = '#e2e8f0'; ctx2d.font = 'bold 10px sans-serif'; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'top';
          ctx2d.fillText('CRISPR-Cas9 Gene Editor', 10, 10);

          // Draw DNA template & coding backbones in two broken segments
          ctx2d.strokeStyle = '#94a3b8';
          ctx2d.lineWidth = 2.5;

          // Segment 1 (Left of cut site)
          ctx2d.beginPath();
          for (var i = 0; i < cutSite; i++) {
            var x = startX + i * baseW + baseW / 2 - displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === 0) ctx2d.moveTo(x, midY - 16 + yOff); else ctx2d.lineTo(x, midY - 16 + yOff);
          }
          ctx2d.stroke();

          ctx2d.beginPath();
          for (var i = 0; i < cutSite; i++) {
            var x = startX + i * baseW + baseW / 2 - displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === 0) ctx2d.moveTo(x, midY + 16 - yOff); else ctx2d.lineTo(x, midY + 16 - yOff);
          }
          ctx2d.stroke();

          // Segment 2 (Right of cut site)
          ctx2d.beginPath();
          for (var i = cutSite; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2 + displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === cutSite) ctx2d.moveTo(x, midY - 16 + yOff); else ctx2d.lineTo(x, midY - 16 + yOff);
          }
          ctx2d.stroke();

          ctx2d.beginPath();
          for (var i = cutSite; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2 + displacement;
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            if (i === cutSite) ctx2d.moveTo(x, midY + 16 - yOff); else ctx2d.lineTo(x, midY + 16 - yOff);
          }
          ctx2d.stroke();

          // Draw bases
          for (var i = 0; i < dnaSeq.length; i++) {
            var x = startX + i * baseW + baseW / 2 + (i < cutSite ? -displacement : displacement);
            var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
            var base = dnaSeq[i];
            var comp = complementStrand[i];

            var isPAM = selectedPAMSite && (i >= selectedPAMSite.pamStart && i < selectedPAMSite.pamStart + 3);
            var isGuide = selectedPAMSite && (i >= selectedPAMSite.guideStart && i < selectedPAMSite.guideEnd);
            var isCutSite = selectedPAMSite && i === selectedPAMSite.cutSite;

            // Highlight PAM and Guide regions
            if (isPAM) {
              ctx2d.fillStyle = 'rgba(239, 68, 68, 0.08)';
              ctx2d.fillRect(x - baseW / 2, midY - 26 + yOff, baseW, 52);
            } else if (isGuide) {
              ctx2d.fillStyle = 'rgba(59, 130, 246, 0.06)';
              ctx2d.fillRect(x - baseW / 2, midY - 26 + yOff, baseW, 52);
            }

            // Hydrogen bonds
            if (!(crisprPhase === 'cut' && isCutSite)) {
              ctx2d.setLineDash([2, 2]);
              ctx2d.strokeStyle = 'rgba(148, 163, 184, 0.3)';
              ctx2d.beginPath();
              ctx2d.moveTo(x, midY - 16 + yOff + baseW * 0.35);
              ctx2d.lineTo(x, midY + 16 - yOff - baseW * 0.35);
              ctx2d.stroke();
              ctx2d.setLineDash([]);
            }

            // NHEJ Flashing mutation at cut site during done animation
            var isNHEJFlashing = (crisprPhase === 'done' && crisprRepairType === 'nhej' && elapsed >= 400 && elapsed < 1000 && i === cutSite);

            if (isNHEJFlashing) {
              var flashBases = ['A', 'T', 'G', 'C'];
              base = flashBases[Math.floor(_tick / 4) % 4];
              comp = BASE_COMPLEMENT[base] || 'A';
              ctx2d.fillStyle = '#f59e0b';
            } else {
              ctx2d.fillStyle = isPAM ? '#ef4444' : isGuide ? '#3b82f6' : (BASE_COLORS[base] || '#888');
            }

            // Draw 3D Base Spheres
            var r = baseW * 0.35;
            var baseColor = ctx2d.fillStyle;
            var darkColor = isNHEJFlashing ? '#b45309' : (isPAM ? '#991b1b' : isGuide ? '#1e3a8a' : (BASE_DARK_COLORS[dnaSeq[i]] || '#444'));

            // Top sphere
            var gradTop = ctx2d.createRadialGradient(x - r*0.3, midY - 16 + yOff - r*0.3, r*0.1, x, midY - 16 + yOff, r);
            gradTop.addColorStop(0, '#ffffff');
            gradTop.addColorStop(0.3, baseColor);
            gradTop.addColorStop(1, darkColor);
            ctx2d.fillStyle = gradTop;
            ctx2d.beginPath(); ctx2d.arc(x, midY - 16 + yOff, r, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.fillStyle = '#fff'; ctx2d.font = 'bold ' + Math.max(7, baseW * 0.45) + 'px monospace'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
            ctx2d.fillText(base, x, midY - 16 + yOff);

            // Bottom sphere
            if (isNHEJFlashing) {
              ctx2d.fillStyle = '#f59e0b';
            } else {
              ctx2d.fillStyle = isPAM ? '#ef4444' : isGuide ? '#3b82f6' : (BASE_COLORS[comp] || '#888');
            }
            var compColor = ctx2d.fillStyle;
            var compDarkColor = isNHEJFlashing ? '#b45309' : (isPAM ? '#991b1b' : isGuide ? '#1e3a8a' : (BASE_DARK_COLORS[complementStrand[i]] || '#444'));

            var gradBot = ctx2d.createRadialGradient(x - r*0.3, midY + 16 - yOff - r*0.3, r*0.1, x, midY + 16 - yOff, r);
            gradBot.addColorStop(0, '#ffffff');
            gradBot.addColorStop(0.3, compColor);
            gradBot.addColorStop(1, compDarkColor);
            ctx2d.fillStyle = gradBot;
            ctx2d.beginPath(); ctx2d.arc(x, midY + 16 - yOff, r, 0, Math.PI * 2); ctx2d.fill();
            ctx2d.fillStyle = '#fff';
            ctx2d.fillText(comp, x, midY + 16 - yOff);

            // Scissor line during cut phase
            if (crisprPhase === 'cut' && isCutSite) {
              ctx2d.strokeStyle = '#ef4444'; ctx2d.lineWidth = 1.5;
              ctx2d.setLineDash([3, 2]);
              ctx2d.beginPath(); ctx2d.moveTo(x, midY - 32 + yOff); ctx2d.lineTo(x, midY + 32 - yOff); ctx2d.stroke();
              ctx2d.setLineDash([]);
              ctx2d.fillStyle = '#ef4444'; ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('\u2702 CUT', x, midY - 36 + yOff);
            }
          }

          // ─── GUIDE RNA DOCKING ───
          if (selectedPAMSite && (crisprPhase === 'scanning' || crisprPhase === 'cut')) {
            // Draw Guide RNA backbone
            ctx2d.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx2d.lineWidth = 1.5;
            ctx2d.shadowColor = '#3b82f6';
            ctx2d.shadowBlur = 6;
            ctx2d.beginPath();
            var first = true;
            for (var i = selectedPAMSite.guideStart; i < selectedPAMSite.guideEnd; i++) {
              var x = startX + i * baseW + baseW / 2 + (i < cutSite ? -displacement : displacement);
              var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
              var gy = midY - 4 + yOff;
              if (first) { ctx2d.moveTo(x, gy); first = false; }
              else ctx2d.lineTo(x, gy);
            }
            ctx2d.stroke();
            ctx2d.shadowBlur = 0;

            // Draw gRNA bases
            for (var i = selectedPAMSite.guideStart; i < selectedPAMSite.guideEnd; i++) {
              var x = startX + i * baseW + baseW / 2 + (i < cutSite ? -displacement : displacement);
              var yOff = Math.sin((i * 0.4) + _tick * 0.015) * 10;
              var gy = midY - 4 + yOff;
              var rnaBase = DNA_TO_RNA[dnaSeq[i]];

              ctx2d.fillStyle = 'rgba(59, 130, 246, 0.95)';
              ctx2d.beginPath();
              ctx2d.arc(x, gy, baseW * 0.22, 0, Math.PI * 2);
              ctx2d.fill();

              ctx2d.fillStyle = '#fff';
              ctx2d.font = 'bold 5px monospace';
              ctx2d.fillText(rnaBase, x, gy);
            }
          }

          // ─── CAS9 ENVELOPE MOLECULAR GRAPHICS ───
          var cas9Pos = crisprPhase === 'scanning' ? crisprScanPos : (selectedPAMSite ? selectedPAMSite.cutSite : 0);
          if (crisprPhase === 'scanning' || crisprPhase === 'cut') {
            var cas9X = startX + cas9Pos * baseW + baseW / 2;
            var cas9Y = midY;
            var lobeR = baseW * 2.8;

            ctx2d.fillStyle = 'rgba(139, 92, 246, 0.12)';
            ctx2d.strokeStyle = 'rgba(139, 92, 246, 0.6)';
            ctx2d.lineWidth = 1.5;
            ctx2d.beginPath();
            ctx2d.ellipse(cas9X - baseW * 0.8, cas9Y, lobeR, 28, 0, 0, Math.PI * 2);
            ctx2d.ellipse(cas9X + baseW * 0.8, cas9Y, lobeR, 28, 0, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.stroke();

            ctx2d.fillStyle = '#8b5cf6'; ctx2d.font = 'bold 9px sans-serif'; ctx2d.textAlign = 'center';
            ctx2d.fillText('Cas9 Protein Lobe', cas9X, cas9Y - 33);
            
            if (crisprPhase === 'cut') {
              ctx2d.fillStyle = '#2563eb'; ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('gRNA guide', cas9X - baseW * 1.8, cas9Y + 36);
            }
          }

          // ─── CLEAVAGE PARTICLE SPRAY ───
          if (crisprPhase === 'cut' && elapsed < 1200) {
            var xL = startX + (cutSite - 1) * baseW + baseW / 2 - displacement;
            var xR = startX + cutSite * baseW + baseW / 2 + displacement;
            var xMid = (xL + xR) / 2;
            var yMid = midY + Math.sin(((cutSite - 0.5) * 0.4) + _tick * 0.015) * 10;

            ctx2d.fillStyle = 'rgba(245, 158, 11, 0.9)';
            for (var p = 0; p < 12; p++) {
              var angle = (p / 12) * Math.PI * 2 + _tick * 0.03;
              var speedDist = 12 + 28 * Math.sin(p * 55.7) * (elapsed / 1200);
              var px = xMid + Math.cos(angle) * speedDist;
              var py = yMid + Math.sin(angle) * speedDist;
              var size = Math.max(1, 2.5 * (1 - elapsed / 1200));
              ctx2d.beginPath();
              ctx2d.arc(px, py, size, 0, Math.PI * 2);
              ctx2d.fill();
            }
          }

          // ─── HDR DONOR DNA TEMPLATE FLOATING ───
          if (crisprPhase === 'done' && crisprRepairType === 'hdr') {
            var repairPct = Math.min(1, elapsed / 1200);
            if (repairPct < 0.5) {
              var dy = 10 + (repairPct / 0.5) * (midY - 10);
              var donorX = startX + cutSite * baseW + baseW / 2;
              
              ctx2d.strokeStyle = 'rgba(234, 179, 8, 0.8)';
              ctx2d.lineWidth = 1.5;
              ctx2d.setLineDash([2, 2]);
              ctx2d.strokeRect(donorX - 16, dy - 20, 32, 40);
              ctx2d.setLineDash([]);
              
              ctx2d.fillStyle = '#eab308';
              ctx2d.font = 'bold 7px sans-serif';
              ctx2d.fillText('Donor DNA Template', donorX, dy - 24);
            }

            // HDR Suture Glow
            if (repairPct >= 0.5 && repairPct < 0.9) {
              var glowX = startX + cutSite * baseW + baseW / 2;
              var glowYOff = Math.sin((cutSite * 0.4) + _tick * 0.015) * 10;
              ctx2d.strokeStyle = 'rgba(234, 179, 8, ' + (1 - (repairPct - 0.5) / 0.4) + ')';
              ctx2d.lineWidth = 3.5;
              ctx2d.shadowColor = '#eab308';
              ctx2d.shadowBlur = 12;
              ctx2d.strokeRect(glowX - 18, midY - 26 + glowYOff, 36, 52);
              ctx2d.shadowBlur = 0;
            }
          }

          ctx2d.font = 'bold 8px sans-serif'; ctx2d.textAlign = 'left'; ctx2d.textBaseline = 'middle';
          ctx2d.fillStyle = '#3b82f6'; ctx2d.fillText('\u25CF Guide RNA target', 10, h2 - 25);
          ctx2d.fillStyle = '#ef4444'; ctx2d.fillText('\u25CF PAM site (NGG)', 10, h2 - 13);
          ctx2d.fillStyle = '#8b5cf6'; ctx2d.fillText('\u25CF Cas9 protein', w - 90, h2 - 25);

          _tick++;
          cv._dnaCrisprTick = _tick;
          cv._dnaCrisprPhase = lastPhase;
          cv._dnaCrisprPhaseStart = phaseStartTime;
          loop.next(crisprPhase === 'scanning' || ((crisprPhase === 'cut' || crisprPhase === 'done') && elapsed < 1200));
        }
        loop = createDnaCanvasLoop(cv, drawCRISPR);
        drawCRISPR();
        dnaCleanup.crisprAnim = loop.stop;
      };

      // ═══ FORENSICS HELPERS ═══
      var forensicCase = d.forensicCase || 0;
      var forensicGelRun = !!d.forensicGelRun;
      var forensicGuess = d.forensicGuess;
      var forensicResult = d.forensicResult || null;
      var forensicSolved = d.forensicSolved || 0;
      var currentCase = FORENSIC_CASES[forensicCase] || FORENSIC_CASES[0];

      function bandY(size) {
        var logMin = Math.log(80), logMax = Math.log(850);
        var logSize = Math.log(Math.max(80, Math.min(850, size)));
        return 35 + 180 * (logMax - logSize) / (logMax - logMin);
      }

      var _forensicCanvasRef = function(cv) {
        if (dnaCleanup.forensicAnim) { dnaCleanup.forensicAnim(); dnaCleanup.forensicAnim = null; }
        if (!cv) return;
        var ctx2d = cv.getContext('2d');
        if (!ctx2d) return;
        var canvasSize = sizeDnaCanvas(cv, ctx2d);
        var w = canvasSize.width, h2 = canvasSize.height;
        var runKey = forensicCase + ':' + (forensicGelRun ? 'run' : 'idle');
        var _tick = cv._dnaForensicTick || 0;
        var start = cv._dnaForensicRunKey === runKey && cv._dnaForensicStart ? cv._dnaForensicStart : Date.now();
        var loop = null;

        function drawForensics() {
          if (!ctx2d.canvas.isConnected) return;
          canvasSize = sizeDnaCanvas(cv, ctx2d);
          w = canvasSize.width; h2 = canvasSize.height;
          ctx2d.clearRect(0, 0, w, h2);
          
          var progress = prefersReducedMotion ? 1 : Math.min(1, (Date.now() - start) / 3000); // 3 seconds migration duration

          // Gel background (high-contrast dark indigo)
          ctx2d.fillStyle = '#0c1322';
          ctx2d.beginPath();
          ctx2d.roundRect(15, 10, w - 30, h2 - 20, 8);
          ctx2d.fill();
          ctx2d.strokeStyle = 'rgba(56, 189, 248, 0.3)';
          ctx2d.lineWidth = 1.5;
          ctx2d.stroke();

          // Electrode labels
          ctx2d.font = 'bold 7px sans-serif';
          ctx2d.textAlign = 'center';
          ctx2d.textBaseline = 'middle';
          ctx2d.fillStyle = '#ef4444';
          ctx2d.fillText('- (cathode)', w / 2, 6);
          ctx2d.fillStyle = '#22c55e';
          ctx2d.fillText('+ (anode)', w / 2, h2 - 6);

          var wellY = 18;
          var ladderX = Math.max(34, Math.min(52, w * 0.12));
          var sampleStart = Math.max(70, w * 0.2);
          var sampleLaneWidth = Math.max(36, (w - sampleStart - 18) / Math.max(1, currentCase.samples.length));
          var sampleLaneX = function(index) { return sampleStart + sampleLaneWidth * (index + 0.5); };
          var bandWidth = Math.max(14, Math.min(22, sampleLaneWidth * 0.55));
          var wellWidth = Math.max(16, Math.min(24, sampleLaneWidth * 0.62));

          // Draw responsive wells (ladder + one lane per sample)
          ctx2d.fillStyle = '#1e293b';
          [ladderX].concat(currentCase.samples.map(function(sample, index) { return sampleLaneX(index); })).forEach(function(centerX) {
            ctx2d.fillRect(centerX - wellWidth / 2, wellY, wellWidth, 5);
          });

          // Draw Ladder label
          ctx2d.fillStyle = '#94a3b8';
          ctx2d.font = 'bold 6.5px sans-serif';
          ctx2d.fillText('Ladder', ladderX, 13);

          // Draw Ladder bands
          var ladderSizes = [100, 200, 300, 400, 500, 600, 700];
          ladderSizes.forEach(function(size) {
            var finalY = bandY(size);
            var logMin = Math.log(80), logMax = Math.log(850);
            var logSize = Math.log(size);
            var speedFactor = 1.8 - (logSize - logMin) / (logMax - logMin);
            var currentY = wellY + (finalY - wellY) * Math.min(1, progress * speedFactor);

            ctx2d.fillStyle = 'rgba(245, 158, 11, 0.9)';
            ctx2d.beginPath();
            ctx2d.roundRect(ladderX - bandWidth / 2, currentY, bandWidth, 2.5, 0.5);
            ctx2d.fill();

            // Label text
            ctx2d.fillStyle = '#64748b';
            ctx2d.font = '5px sans-serif';
            ctx2d.textAlign = 'left';
            ctx2d.fillText(size + 'bp', ladderX + bandWidth / 2 + 4, currentY + 1.25);
          });

          // Draw Sample lanes
          currentCase.samples.forEach(function(s, si) {
            var laneX = sampleLaneX(si);

            // Lane label text
            ctx2d.fillStyle = s.isRef ? '#22d3ee' : '#94a3b8';
            ctx2d.font = 'bold 6.5px sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.fillText(s.label, laneX, 13);

            s.fragments.forEach(function(frag) {
              var finalY = bandY(frag);
              var logMin = Math.log(80), logMax = Math.log(850);
              var logSize = Math.log(frag);
              var speedFactor = 1.8 - (logSize - logMin) / (logMax - logMin);
              var currentY = wellY + (finalY - wellY) * Math.min(1, progress * speedFactor);

              ctx2d.fillStyle = s.isRef ? '#22d3ee' : '#3b82f6';
              ctx2d.shadowColor = s.isRef ? '#22d3ee' : '#3b82f6';
              ctx2d.shadowBlur = 4;
              ctx2d.beginPath();
              ctx2d.roundRect(laneX - bandWidth / 2, currentY, bandWidth, 2.5, 0.5);
              ctx2d.fill();
              ctx2d.shadowBlur = 0;
            });
          });

          // Draw rising bubbles in gel lanes
          if (progress < 1) {
            ctx2d.fillStyle = 'rgba(255, 255, 255, 0.25)';
            for (var b = 0; b < 24; b++) {
              var laneIdx = b % (currentCase.samples.length + 1);
              var bx = laneIdx === 0 ? ladderX : sampleLaneX(laneIdx - 1);
              var bOffset = Math.sin(b * 12.7 + _tick * 0.08) * 6;
              var by = h2 - 12 - ((_tick * 1.5 + b * 15) % (h2 - 24));
              var radius = 0.8 + (b % 3) * 0.4;
              
              ctx2d.beginPath();
              ctx2d.arc(bx + bOffset, by, radius, 0, Math.PI * 2);
              ctx2d.fill();
            }
          }

          _tick++;
          cv._dnaForensicTick = _tick;
          cv._dnaForensicRunKey = runKey;
          cv._dnaForensicStart = start;
          loop.next(progress < 1);
        }

        loop = createDnaCanvasLoop(cv, drawForensics);
        drawForensics();
        dnaCleanup.forensicAnim = loop.stop;
      };

      function checkForensicAnswer() {
        if (forensicGuess == null) return;
        var correct = forensicGuess === currentCase.match;
        if (correct) {
          var ns = forensicSolved + 1;
          updMulti({ forensicResult: 'correct', forensicSolved: ns });
          addToast('\u2705 Correct! DNA match confirmed!', 'success');
          awardStemXP('dnaLab', 15, 'Solved forensics case');
          if (typeof stemCelebrate === 'function') stemCelebrate();
          checkBadge('csiGenetics');
        } else {
          updMulti({ forensicResult: 'wrong' });
          addToast('\u274c Not a match. Look at the banding pattern more carefully.', 'error');
        }
      }

      // ═══ BATTLE HELPERS ═══
      var battleRound = d.battleRound || 0;
      var battlePlayerHP = d.battlePlayerHP != null ? d.battlePlayerHP : 100;
      var battleEnemyHP = d.battleEnemyHP != null ? d.battleEnemyHP : 100;
      var battleOrder = d.battleOrder || [];
      var battleAnswer = d.battleAnswer || '';
      var battleFeedback = d.battleFeedback || '';
      var battleDone = !!d.battleDone;
      var battleWon = !!d.battleWon;
      var battleUseAI = !!d.battleUseAI;
      var battleAIQ = d.battleAIQ || null; // current AI-generated question

      function startBattle(useAI) {
        var order = [];
        for (var i = 0; i < BATTLE_QS.length; i++) order.push(i);
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        }
        updMulti({ battleRound: 0, battlePlayerHP: 100, battleEnemyHP: 100, battleOrder: order, battleAnswer: '', battleFeedback: '', battleDone: false, battleWon: false, battleUseAI: !!useAI, battleAIQ: null, battleAILoading: false });
        if (useAI) generateBattleAIQ(0);
      }

      function generateBattleAIQ(round) {
        if (!callGemini) return;
        upd('battleAILoading', true);
        var gradeCtx = gradeText('kindergarten (ages 5-7), very simple', '3rd-5th grade', '6th-8th grade', '9th-12th grade AP Biology');
        var prompt = 'Generate a genetics/DNA battle quiz question (round ' + (round + 1) + '/10) for ' + gradeCtx + ' students. Make it exciting and varied. Topics: DNA structure, replication, transcription, translation, mutations, codons, amino acids, CRISPR, genetic disorders, proteins. Return ONLY valid JSON: {"question":"...","answer":"...","hint":"..."}. Answer should be 1-3 words.';
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          try {
            var clean = (typeof resp === 'string' ? resp : '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
            var parsed = JSON.parse(clean);
            if (parsed.question && parsed.answer) {
              updMulti({ battleAIQ: { q: parsed.question, a: parsed.answer, h: parsed.hint || '' }, battleAILoading: false });
            } else { throw new Error('bad'); }
          } catch (e) { updMulti({ battleAIQ: null, battleAILoading: false, battleUseAI: false }); }
        }).catch(function() { updMulti({ battleAIQ: null, battleAILoading: false, battleUseAI: false }); });
      }

      function getCurrentBattleQ() {
        if (battleUseAI && battleAIQ) return battleAIQ;
        var qIdx = (battleOrder || [])[battleRound];
        return BATTLE_QS[qIdx] || null;
      }

      function battleAttack() {
        if (!battleAnswer.trim() || battleDone) return;
        var q = getCurrentBattleQ();
        if (!q) return;
        var answers = q.a.split(',');
        var correct = answers.some(function(a) { return battleAnswer.trim().toUpperCase().indexOf(a.trim().toUpperCase()) >= 0; });
        var newEHP = battleEnemyHP;
        var newPHP = battlePlayerHP;
        var fb;
        if (correct) {
          var dmg = 12 + Math.floor(Math.random() * 8);
          newEHP = Math.max(0, newEHP - dmg);
          fb = '\u2705 Correct! Dealt ' + dmg + ' damage!';
          awardStemXP('dnaLab', 5, 'Battle correct');
          if (typeof stemBeep === 'function') stemBeep();
        } else {
          var dmg2 = 10 + Math.floor(Math.random() * 8);
          newPHP = Math.max(0, newPHP - dmg2);
          fb = '\u274c Wrong! ' + answers[0] + '. Took ' + dmg2 + ' damage!';
        }
        var maxRounds = battleUseAI ? 10 : BATTLE_QS.length;
        var nextRound = battleRound + 1;
        var done = newEHP <= 0 || newPHP <= 0 || nextRound >= maxRounds;
        var won = done && newEHP <= newPHP;
        updMulti({ battleEnemyHP: newEHP, battlePlayerHP: newPHP, battleRound: nextRound, battleAnswer: '', battleFeedback: fb, battleDone: done, battleWon: won, battleAIQ: null });
        if (!done && battleUseAI) generateBattleAIQ(nextRound);
        if (done && won) {
          checkBadge('geneWarrior');
          awardStemXP('dnaLab', 25, 'Won Gene Defense battle');
          if (typeof stemCelebrate === 'function') stemCelebrate();
        }
      }

      // ═══════════════════════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════════════════════

      var badges = d.badges || {};
      var earnedBadgeCount = 0;
      for (var bi = 0; bi < DNA_BADGES.length; bi++) { if (badges[DNA_BADGES[bi].id]) earnedBadgeCount++; }
      var activeSubtool = SUBTOOLS.filter(function(tb) { return tb.id === tab; })[0] || SUBTOOLS[0];
      var visitedTabs = d.visitedTabs || {};
      // Count the screen the learner is currently using, even before the first tab switch.
      var visitedCount = Object.keys(visitedTabs).length + (visitedTabs[tab] ? 0 : 1);
      var gcCount = dnaSeq.split('').filter(function(b) { return b === 'G' || b === 'C'; }).length;
      var gcPercent = Math.round((gcCount / Math.max(1, dnaSeq.length)) * 100);
      var latestMutation = (d.mutationLog || []).length ? (d.mutationLog || [])[(d.mutationLog || []).length - 1] : null;
      var dnaWorkflowRoutes = [
        {
          id: 'structure',
          label: 'Structure Path',
          desc: 'Start with base pairing, then watch the helix copy itself.',
          accent: '#7c3aed',
          soft: '#f5f3ff',
          tools: ['build', 'replicate', 'transcribe']
        },
        {
          id: 'dogma',
          label: 'Central Dogma',
          desc: 'Follow DNA to RNA to protein, with codons and amino acids visible.',
          accent: '#047857',
          soft: '#ecfdf5',
          tools: ['transcribe', 'translate', 'protein']
        },
        {
          id: 'editing',
          label: 'Mutation & Editing',
          desc: 'Change the sequence, predict impact, then try CRISPR or forensics.',
          accent: '#b91c1c',
          soft: '#fef2f2',
          tools: ['mutate', 'crispr', 'forensics']
        },
        {
          id: 'practice',
          label: 'Practice Arena',
          desc: 'Use challenges, battles, and reference notes when ready to review.',
          accent: '#b45309',
          soft: '#fffbeb',
          tools: ['challenge', 'battle', 'learn']
        }
      ];
      // Each tool has one canonical path. Transcription appears in two curricula, but
      // its active state belongs to Central Dogma so route highlighting is stable.
      var dnaTabRouteId = {
        build: 'structure', replicate: 'structure', transcribe: 'dogma',
        translate: 'dogma', protein: 'dogma', mutate: 'editing',
        crispr: 'editing', forensics: 'editing', challenge: 'practice',
        battle: 'practice', learn: 'practice'
      };
      var activeRoute = dnaWorkflowRoutes.filter(function(route) {
        return route.id === dnaTabRouteId[tab];
      })[0] || dnaWorkflowRoutes[0];
      function switchDnaTab(nextTab) {
        var v = Object.assign({}, visitedTabs);
        v[tab] = true;
        v[nextTab] = true;
        updMulti({ tab: nextTab, visitedTabs: v });
        if (Object.keys(v).length >= SUBTOOLS.length) checkBadge('explorer');
        var target = SUBTOOLS.filter(function(tb) { return tb.id === nextTab; })[0];
        announceToSR('Switched to ' + (target ? target.label : nextTab));
      }
      function handleDnaTabKeyDown(event, index) {
        var key = event.key;
        if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
        event.preventDefault();
        var nextIndex = key === 'Home' ? 0 : key === 'End' ? SUBTOOLS.length - 1 :
          (index + (key === 'ArrowRight' ? 1 : -1) + SUBTOOLS.length) % SUBTOOLS.length;
        switchDnaTab(SUBTOOLS[nextIndex].id);
        setTimeout(function() {
          var rail = document.querySelector('[data-dna-tabstrip]');
          var tabs = rail ? rail.querySelectorAll('[role="tab"]') : [];
          if (tabs[nextIndex]) tabs[nextIndex].focus();
        }, 0);
      }

      function dnaInstrumentFrame(title, subtitle, accent, chips, canvasNode, ariaLabel) {
        return h("div", {
          className: "overflow-hidden rounded-xl border bg-slate-950 shadow-xl",
          role: "region",
          "aria-label": ariaLabel || title,
          "data-dna-molecular-frame": true,
          style: {
            borderColor: accent + '66',
            boxShadow: '0 18px 45px rgba(15,23,42,0.18)'
          }
        },
          h("div", {
            className: "flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2",
            style: { background: 'linear-gradient(90deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95))' }
          },
            h("div", { className: "min-w-0" },
              h("div", { className: "text-[11px] font-black uppercase text-white" }, title),
              subtitle && h("div", { className: "mt-0.5 text-[11px] font-medium text-slate-300" }, subtitle)
            ),
            h("div", { className: "flex flex-wrap gap-1.5" },
              (chips || []).map(function(chip, idx) {
                var tone = chip.tone || accent;
                return h("span", {
                  key: chip.label + idx,
                  className: "rounded-full border px-2.5 py-1 text-[11px] font-black shadow-sm",
                  style: { borderColor: tone + '66', background: tone + '18', color: '#f8fafc' }
                }, chip.label + (chip.value != null ? ' ' + chip.value : ''));
              })
            )
          ),
          h("div", {
            className: "relative",
            style: { background: 'radial-gradient(circle at 18% 18%,' + accent + '2e 0,rgba(2,6,23,0) 32%),radial-gradient(circle at 82% 12%,rgba(34,211,238,0.18) 0,rgba(2,6,23,0) 28%),linear-gradient(180deg,#020617 0%,#0f172a 100%)' }
          },
            h("div", { className: "pointer-events-none absolute inset-x-4 top-3 h-px bg-white/20", "aria-hidden": "true" }),
            canvasNode
          )
        );
      }

      var __dnaMainView = h("div", { className: "space-y-3 max-w-7xl mx-auto animate-in fade-in duration-200", "data-dna-tool": true, "data-dna-active-tab": tab },

        // ═══ COMMAND HEADER ═══
        h("div", { className: "dna-command-header" },
          h("button", { onClick: function() { setStemLabTool(null); announceToSR('Returned to tool grid'); }, className: "dna-back-button", 'aria-label': t('stem.dna.back_to_tools', 'Back to tools') },
            h(ArrowLeft, { size: 18 })),
          h("div", { className: "dna-brand-lockup" },
            h("div", { className: "dna-brand-mark", "aria-hidden": "true" }, h("span", null, "A"), h("span", null, "T")),
            h("div", { className: "min-w-0" },
              h("p", { className: "dna-command-kicker" }, "Molecular biology workbench"),
              h("h3", { className: "dna-command-title" }, t('stem.dna.dna_genetics_lab', "DNA / Genetics Lab")),
              h("p", { className: "dna-command-subtitle" }, t('stem.dna.build_replicate_transcribe_translate_m', "Build, copy, read, edit, and explain a living sequence."))
            )
          ),
          h("div", { className: "dna-command-actions" },
            h("span", { className: "dna-live-status" }, h("i", { "aria-hidden": "true" }), "Sequence ready"),
            h("span", { className: "dna-xp-chip", 'aria-label': getStemXP('dnaLab') + ' of 100 experience points' }, "\u2B50 " + getStemXP('dnaLab') + "/100"),
            h("button", { onClick: function() { setToolSnapshots(function(prev) { return prev.concat([{ id: 'dna-' + Date.now(), tool: 'dnaLab', label: 'DNA: ' + dnaSeq.substring(0, 12) + '...', data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "dna-snapshot-button", 'aria-label': t('stem.dna.snapshot', 'Save DNA snapshot') }, t('stem.dna.snapshot', "\uD83D\uDCF8 Snapshot"))
          )
        ),

        // ═══ READING LEVEL ═══
        h("div", { className: "dna-grade-bar", role: "group", 'aria-label': "Explanation reading level" },
          h("span", { className: "dna-grade-label" }, t('stem.dna.grade', "Reading level")),
          GRADE_BANDS.map(function(gb) {
            return h("button", {
              key: gb,
              onClick: function() { upd('dnaGradeOverride', gb); addToast('\uD83C\uDF93 Grade set to ' + gb, 'success'); },
              className: "dna-grade-option",
              "data-active": gradeBand === gb ? "true" : "false",
              'aria-pressed': gradeBand === gb
            }, gb);
          }),
          h("span", { className: "dna-grade-level" },
            gradeBand === 'K-2' ? '\uD83E\uDDF8 Elementary' : gradeBand === '3-5' ? '\uD83D\uDCDA Upper Elementary' : gradeBand === '6-8' ? '\uD83E\uDD13 Middle School' : '\uD83C\uDF93 High School'
          )
        ),

        // ═══ TOOL RAIL ═══
        h("div", { className: "dna-tool-rail", role: "tablist", "aria-label": "DNA Lab tools", "data-dna-tabstrip": true },
          SUBTOOLS.map(function(tb, tabIndex) {
            var isActive = tab === tb.id;
            return h("button", {
              key: tb.id,
              id: "dna-tab-" + tb.id,
              role: "tab",
              'aria-selected': isActive,
              'aria-controls': "dna-workspace",
              tabIndex: isActive ? 0 : -1,
              onKeyDown: function(event) { handleDnaTabKeyDown(event, tabIndex); },
              onClick: function() { switchDnaTab(tb.id); },
              className: "dna-tool-tab",
              "data-active": isActive ? "true" : "false"
            },
              h("span", { className: "dna-tool-tab-icon", "aria-hidden": "true" }, tb.icon),
              h("span", null, tb.label)
            );
          })
        ),

        // ═══ LEARNING PATHS + LIVE READOUT ═══
        h("details", { "data-dna-mission": true, className: "dna-mission-shell" },
          h("summary", { className: "dna-mission-summary" },
            h("span", { className: "dna-mission-index", "aria-hidden": "true" }, "0" + (dnaWorkflowRoutes.indexOf(activeRoute) + 1)),
            h("span", { className: "dna-mission-summary-copy" },
              h("span", { className: "dna-mission-kicker" }, "Current learning path"),
              h("span", { className: "dna-mission-title" }, activeRoute.label),
              h("span", { className: "dna-mission-desc" }, activeRoute.desc)
            ),
            h("span", { className: "dna-active-tool", style: { borderColor: activeRoute.accent + '44' } },
              h("span", { "aria-hidden": "true" }, activeSubtool.icon),
              h("span", null, activeSubtool.label)
            ),
            h("span", { className: "dna-mission-chevron", "aria-hidden": "true" }, "⌄")
          ),
          h("div", { className: "dna-mission-body" },
            h("div", { className: "dna-stat-grid", "aria-label": "Live sequence summary" },
              [
                { label: 'Sequence', value: dnaSeq.length + ' bp', sub: gcPercent + '% GC' },
                { label: 'mRNA', value: fullMRNA.length + ' nt', sub: fullMRNA.substring(0, 9) + (fullMRNA.length > 9 ? '…' : '') },
                { label: 'Protein', value: fullProtein.length + ' aa', sub: fullProtein.length ? fullProtein[0].aa + ' start' : 'No start codon' },
                { label: 'Explored', value: visitedCount + '/' + SUBTOOLS.length, sub: earnedBadgeCount + ' badges earned' }
              ].map(function(stat) {
                return h("div", { key: stat.label, className: "dna-stat" },
                  h("div", { className: "dna-stat-label" }, stat.label),
                  h("div", { className: "dna-stat-value" }, stat.value),
                  h("div", { className: "dna-stat-sub" }, stat.sub)
                );
              })
            ),
            h("nav", { className: "dna-route-panel", "data-dna-routes": true, "aria-label": "DNA learning paths" },
              h("div", { className: "dna-route-heading" },
                h("strong", null, "Choose a path"),
                h("span", null, "Opens the first tool")
              ),
              h("div", { className: "dna-route-grid" },
                dnaWorkflowRoutes.map(function(route) {
                  var active = route.id === activeRoute.id;
                  var routeNames = route.tools.map(function(toolId) {
                    var routeTool = SUBTOOLS.filter(function(item) { return item.id === toolId; })[0];
                    return routeTool ? routeTool.label : null;
                  }).filter(Boolean).join(' · ');
                  return h("button", {
                    key: route.id,
                    onClick: function() { switchDnaTab(route.tools[0]); },
                    className: "dna-route-card",
                    "data-active": active ? "true" : "false",
                    'aria-pressed': active,
                    style: { '--route-accent': route.accent, '--route-soft': route.accent + '44', '--route-bg': route.soft }
                  },
                    h("span", { className: "dna-route-top" },
                      h("span", { className: "dna-route-name" }, route.label),
                      h("span", { className: "dna-route-state" }, active ? "Active" : "Open")
                    ),
                    h("span", { className: "dna-route-tools" }, routeNames)
                  );
                })
              )
            )
          )
        ),

        // ═══ ACHIEVEMENTS ═══
        h("details", { className: "dna-achievements" },
          h("summary", null,
            h("span", { "aria-hidden": "true" }, "🏆"),
            h("span", null, "Achievements"),
            h("span", { className: "dna-achievement-progress" }, earnedBadgeCount + "/" + DNA_BADGES.length)
          ),
          h("div", { className: "dna-badge-grid" },
            DNA_BADGES.map(function(b) {
              var earned = badges[b.id];
              return h("div", { key: b.id, className: "dna-badge", "data-earned": earned ? "true" : "false" },
                h("span", { className: "dna-badge-icon", "aria-hidden": "true" }, b.icon),
                h("span", null,
                  h("strong", null, b.label + (earned ? " · Earned" : " · Locked")),
                  h("small", null, b.desc)
                )
              );
            })
          )
        ),
        // ═══ TOPIC HERO BAND (per-tab) ═══
        (function() {
          var TAB_META = {
            build:      { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83E\uDDEC', title: t('stem.dna.build_a_dna_strand', 'Build a DNA strand'),          hint: t('stem.dna.pick_a_sequence_the_complementary_stra', 'Pick a sequence - the complementary strand fills in via base pairing (A-T, G-C). Real DNA is built like this constantly.') },
            replicate:  { accent: '#3b82f6', soft: 'rgba(59,130,246,0.10)', icon: '\uD83D\uDD00', title: t('stem.dna.dna_replication', 'DNA replication'),              hint: t('stem.dna.helicase_unwinds_the_helix_dna_polymer', 'Helicase unwinds the helix; DNA polymerase reads each template strand and lays down its complement. Semiconservative - each daughter has one old + one new strand.') },
            transcribe: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCDD', title: t('stem.dna.transcription_dna_mrna', 'Transcription - DNA \u2192 mRNA'), hint: t('stem.dna.rna_polymerase_reads_the_template_stra', 'This lab displays the coding strand, so its mRNA readout matches that strand with U replacing T. In cells, RNA polymerase reads the antiparallel template strand to synthesize RNA 5\u2032\u21923\u2032.') },
            translate:  { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '\uD83D\uDD2C', title: t('stem.dna.translation_mrna_protein', 'Translation - mRNA \u2192 protein'), hint: t('stem.dna.ribosome_reads_codons_3_bases_at_a_tim', 'Ribosome reads codons (3 bases at a time). Each codon \u2192 one amino acid. The genetic code is read in non-overlapping triplets, no commas.') },
            mutate:     { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83E\uDDA0', title: t('stem.dna.mutations', 'Mutations'),                     hint: t('stem.dna.point_mutations_silent_no_protein_chan', 'Substitutions may be synonymous, missense, or nonsense. A coding-region insertion or deletion shifts the frame only when its length is not divisible by three; effects depend on position and biological context.') },
            crispr:     { accent: '#ef4444', soft: 'rgba(239,68,68,0.10)',  icon: '\u2702\uFE0F',  title: t('stem.dna.crispr_cas9_editing', 'CRISPR-Cas9 editing'),          hint: t('stem.dna.guide_rna_points_cas9_to_a_20_base_tar', 'Real SpCas9 usually uses a 20-nt spacer beside an NGG PAM and cuts about three bases upstream. This compact schematic shows a six-base guide window and simplified repair outcomes.') },
            protein:    { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  icon: '\uD83E\uDDEA', title: t('stem.dna.protein_structure', 'Protein structure'),            hint: t('stem.dna.primary_sequence_secondary_helix_sheet', 'Primary (sequence) \u2192 secondary (\u03B1-helix, \u03B2-sheet) \u2192 tertiary (3D fold) \u2192 quaternary (multi-subunit). One amino acid swap can break the fold.') },
            forensics:  { accent: '#8b5cf6', soft: 'rgba(139,92,246,0.10)', icon: '\uD83D\uDD0D', title: t('stem.dna.dna_forensics', 'DNA forensics'),                hint: t('stem.dna.str_profiling_13_20_short_tandem_repea', 'Forensic STR profiles compare many loci. Analysts evaluate data quality and calculate statistical weight using relevant population data; a matching profile alone does not identify how or when DNA was deposited.') },
            challenge:  { accent: '#fbbf24', soft: 'rgba(251,191,36,0.10)', icon: '\uD83C\uDFAF', title: t('stem.dna.daily_challenge', 'Daily challenge'),              hint: t('stem.dna.a_new_dna_puzzle_every_session_transla', 'A new DNA puzzle every session. Translate, identify the mutation, find the ORF, or solve a forensic case. Streak counter tracks daily wins.') },
            battle:     { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\u2694\uFE0F',  title: t('stem.dna.codon_battle', 'Codon battle'),                 hint: t('stem.dna.speed_translation_duel_decode_codons_f', 'Speed-translation duel. Decode codons fast against a timer. Tests whether the genetic code is in your head, not just your reference card.') },
            learn:      { accent: '#64748b', soft: 'rgba(100,116,139,0.10)', icon: '\uD83D\uDCDA', title: t('stem.dna.reference_glossary', 'Reference + glossary'),         hint: t('stem.dna.codon_table_base_pairing_rules_key_ter', 'Codon table, base-pairing rules, key terms (ORF, intron, exon, promoter, repressor) - the cheat sheet you keep coming back to.') }
          };
          var meta = TAB_META[tab] || TAB_META.build;
          return h('div', {
            className: 'flex items-center gap-3 flex-wrap px-4 py-3',
            'data-dna-topic': true,
            style: {
              background: meta.soft,
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent
            }
          },
            h('div', { style: { fontSize: 25, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('div', { style: { color: meta.accent, fontSize: 8, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' } }, 'Now exploring'),
              h('h3', { style: { color: 'var(--allo-stem-text, #172033)', fontSize: 15, fontWeight: 900, margin: '2px 0 0', lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 10, lineHeight: 1.45 } }, meta.hint)
            )
          );
        })(),

        // ═══════════════════════════════════════════
        // BUILD TAB
        // ═══════════════════════════════════════════
        tab === 'build' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-build", "data-dna-workspace": "build" },
          dnaInstrumentFrame(
            "Live Double Helix",
            "Click a base on the model or sequence strip to cycle A/T/G/C.",
            "#a855f7",
            [
              { label: "Sequence", value: dnaSeq.length + " bp", tone: "#a855f7" },
              { label: "GC", value: gcPercent + "%", tone: "#22c55e" },
              { label: "Protein", value: fullProtein.length + " aa", tone: "#06b6d4" }
            ],
            h("canvas", { ref: _dnaCanvasRef, className: "block w-full", style: { width: '100%', height: 240 }, tabIndex: 0, role: "img", 'aria-label': 'DNA helix: ' + dnaSeq }),
            t('stem.dna.dna_helix_visualization', 'DNA helix visualization')
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4 space-y-3" },
            h("div", { className: "flex items-center justify-between flex-wrap gap-2" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, t('stem.dna.coding_strand_5_3', "Coding Strand (5'\u21923')")),
              h("div", { className: "dna-preset-picker" },
                h("button", { onClick: function() { updMulti({ dnaSequence: randomDNA(21), mRNA: '', protein: [], animStep: 0 }); announceToSR('Random sequence'); }, className: "transition-colors px-3 py-2 text-[11px] font-bold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 active:scale-[0.97]" }, t('stem.dna.random', "\uD83C\uDFB2 Random")),
                h("label", null,
                  h("span", { className: "sr-only" }, "Example DNA sequence"),
                  h("select", { defaultValue: "", 'aria-label': "Load an example DNA sequence", onChange: function(event) {
                    var presetIndex = parseInt(event.target.value, 10);
                    if (isNaN(presetIndex) || !PRESETS[presetIndex]) return;
                    var preset = PRESETS[presetIndex];
                    updMulti({ dnaSequence: preset.seq, mRNA: '', protein: [], animStep: 0 });
                    addToast('\uD83E\uDDEC ' + preset.name + ': ' + preset.desc, 'success');
                    announceToSR('Loaded ' + preset.name);
                    checkBadge('firstStrand');
                    event.target.value = '';
                  } },
                    h("option", { value: "" }, "Load an example…"),
                    PRESETS.map(function(p, index) { return h("option", { key: p.name, value: index }, p.name); })
                  )
                )
              )
            ),
            h("div", { className: "flex flex-wrap gap-1", role: "group", "data-dna-sequence": true, 'aria-label': "Editable DNA coding strand" },
              dnaSeq.split('').map(function(base, idx) {
                return h("button", { key: idx, onClick: function() { var order = 'ATGC'; var next = order[(order.indexOf(base) + 1) % 4]; updMulti({ dnaSequence: dnaSeq.substring(0, idx) + next + dnaSeq.substring(idx + 1), mRNA: '', protein: [], animStep: 0 }); },
                  className: "w-8 h-8 rounded-lg font-mono font-bold text-white text-sm hover:scale-110 transition-all", style: { background: BASE_COLORS[base], color: BASE_TEXT_COLORS[base] || '#ffffff' }, 'aria-label': 'Base ' + (idx + 1) + ': ' + base
                }, base);
              })
            ),
            h("div", { className: "text-xs text-slate-600" }, "Complement: ", h("span", { className: "font-mono font-bold text-slate-600" }, complementStrand), " | " + dnaSeq.length + " bp"),
            h("div", { className: "flex gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100" },
              h("span", null, "GC: " + Math.round((dnaSeq.split('').filter(function(b) { return b === 'G' || b === 'C'; }).length / dnaSeq.length) * 100) + "%"),
              h("span", null, "AT: " + Math.round((dnaSeq.split('').filter(function(b) { return b === 'A' || b === 'T'; }).length / dnaSeq.length) * 100) + "%")
            ),
            h("div", { className: "flex gap-4 text-[11px] text-slate-600 pt-2 border-t border-slate-100" },
              ['A', 'T', 'G', 'C'].map(function(b) { var names = { A: 'Adenine', T: 'Thymine', G: 'Guanine', C: 'Cytosine' }; return h("span", { key: b, className: "flex items-center gap-1" }, h("span", { className: "w-3 h-3 rounded-full", style: { background: BASE_COLORS[b] } }), b + "=" + names[b] + " \u2194 " + BASE_COMPLEMENT[b]); })
            )
          )
        ),

        // ═══════════════════════════════════════════
        // REPLICATION TAB
        // ═══════════════════════════════════════════
        tab === 'replicate' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-replicate", "data-dna-workspace": "replicate" },
          dnaInstrumentFrame(
            "Replication Fork",
            "Helicase opens the ladder while DNA polymerase builds matching strands.",
            "#14b8a6",
            [
              { label: "Copied", value: replStep + "/" + dnaSeq.length, tone: "#14b8a6" },
              { label: "Progress", value: Math.round(replStep / dnaSeq.length * 100) + "%", tone: "#22c55e" },
              { label: "Speed", value: speed + "x", tone: "#0ea5e9" }
            ],
            h("canvas", { ref: _replCanvasRef, className: "block w-full", style: { width: '100%', height: 260 }, tabIndex: 0, role: "img", 'aria-label': 'Replication: ' + replStep + '/' + dnaSeq.length }),
            t('stem.dna.dna_replication_fork_visualization', 'DNA replication fork visualization')
          ),
          h("div", { className: "flex items-center gap-3 flex-wrap" },
            h("button", { onClick: function() {
              if (replPlaying) { upd('replPlaying', false); }
              else { if (replStep >= dnaSeq.length) updMulti({ replStep: 0, replPlaying: true }); else upd('replPlaying', true); }
            }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (replPlaying ? 'bg-amber-700 text-white' : 'transition-colors bg-teal-700 text-white hover:bg-teal-700 active:scale-[0.97]') }, replPlaying ? '\u23F8 Pause' : '\u25B6 Replicate'),
            h("button", { onClick: function() { updMulti({ replStep: 0, replPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, t('stem.dna.reset', '\u21BA Reset')),
            h("div", { className: "flex items-center gap-2 ml-auto" },
              h("span", { className: "text-xs text-slate-600" }, 'Speed:'),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[11px] font-bold rounded-lg " + (speed === s ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600') }, s + 'x'); })
            )
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4 space-y-3" },
            h("div", { className: "flex justify-between text-xs text-slate-600 mb-1" },
              h("span", null, replStep + '/' + dnaSeq.length + ' bases replicated'),
              h("span", null, Math.round(replStep / dnaSeq.length * 100) + '%')
            ),
            h("div", { className: "w-full bg-slate-100 rounded-full h-2" },
              h("div", { className: "bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full h-2 transition-all", style: { width: (replStep / dnaSeq.length * 100) + '%' } })
            ),
            h("p", { className: "text-xs text-slate-600 mt-2 leading-relaxed" },
              gradeText(
                '\uD83E\uDDEC DNA replication is like photocopying a recipe. The cell unzips the DNA ladder and builds two exact copies so both new cells get the instructions!',
                '\uD83E\uDDEC During replication, helicase helps separate the strands and DNA polymerases synthesize complementary strands. Proofreading and repair make copying highly accurate, but replication is not literally error-free.',
                '\uD83E\uDDEC Semiconservative replication gives each daughter duplex one parental strand and one new strand. Polymerases synthesize 5\u2032\u21923\u2032; leading synthesis is mostly continuous and lagging synthesis uses Okazaki fragments. DNA polymerase III is the main replicase in bacteria, while eukaryotes use different polymerases.',
                '\uD83E\uDDEC Replication initiates at origins (OriC in prokaryotes). Helicase unwinds; SSB proteins stabilize. Primase lays RNA primers. Pol III extends 5\u2032\u21923\u2032 (leading = continuous, lagging = Okazaki fragments). Pol I replaces primers; ligase seals nicks. Proofreading by 3\u2032\u21925\u2032 exonuclease achieves ~10\u207B\u2079 error rate.'
              )
            ),
            h("div", { className: "flex gap-3 flex-wrap text-[11px] text-slate-600 pt-2 border-t border-slate-100" },
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-violet-500" }), t('stem.dna.helicase', 'Helicase')),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500" }), t('stem.dna.dna_pol_iii', 'DNA Pol III')),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-sky-400" }), t('stem.dna.leading_continuous', 'Leading (continuous)')),
              h("span", { className: "flex items-center gap-1" }, h("span", { className: "w-2.5 h-2.5 rounded-full bg-orange-400" }), t('stem.dna.lagging_okazaki', 'Lagging (Okazaki)'))
            )
          )
        ),

        // ═══════════════════════════════════════════
        // TRANSCRIPTION TAB
        // ═══════════════════════════════════════════
        tab === 'transcribe' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-transcribe", "data-dna-workspace": "transcribe" },
          dnaInstrumentFrame(
            "Transcription Chamber",
            "RNA polymerase reads the DNA and produces a single mRNA message.",
            "#8b5cf6",
            [
              { label: "Read", value: animStep + "/" + dnaSeq.length, tone: "#8b5cf6" },
              { label: "mRNA", value: (mRNA ? mRNA.length : 0) + "/" + fullMRNA.length + " nt", tone: "#06b6d4" },
              { label: "Speed", value: speed + "x", tone: "#f59e0b" }
            ],
            h("canvas", { ref: _dnaCanvasRef, className: "block w-full", style: { width: '100%', height: 260 }, tabIndex: 0, role: "img", 'aria-label': 'Transcription: ' + animStep + '/' + dnaSeq.length }),
            t('stem.dna.transcription_dna_mrna', 'Transcription - DNA to mRNA')
          ),
          h("div", { className: "flex items-center gap-3" },
            h("button", { onClick: function() { if (animPlaying) upd('animPlaying', false); else { if (animStep >= dnaSeq.length) updMulti({ animStep: 0, mRNA: '', animPlaying: true }); else upd('animPlaying', true); } }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (animPlaying ? "bg-amber-700 text-white" : "transition-colors bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.97]") }, animPlaying ? "\u23F8 Pause" : "\u25B6 Transcribe"),
            h("button", { onClick: function() { updMulti({ animStep: 0, mRNA: '', animPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, t('stem.dna.reset_2', "\u21BA Reset")),
            h("div", { className: "flex items-center gap-2 ml-auto" }, h("span", { className: "text-xs text-slate-600" }, "Speed:"),
              [0.5, 1, 2, 4].map(function(s) { return h("button", { key: s, onClick: function() { upd('speed', s); }, className: "px-2 py-1 text-[11px] font-bold rounded-lg " + (speed === s ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600") }, s + "x"); })
            )
          ),
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("div", { className: "flex justify-between text-xs text-slate-600 mb-2" }, h("span", null, animStep + "/" + dnaSeq.length), h("span", null, Math.round(animStep / dnaSeq.length * 100) + "%")),
            h("div", { className: "w-full bg-slate-100 rounded-full h-2" }, h("div", { className: "bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full h-2 transition-all", style: { width: (animStep / dnaSeq.length * 100) + '%' } })),
            mRNA && h("div", { className: "mt-3" }, h("span", { className: "text-xs font-bold text-violet-600" }, "mRNA: "), h("span", { className: "font-mono text-xs text-slate-700 break-all" }, mRNA)),
            h("div", { className: "mt-2 text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2" }, t('stem.dna.mrna_is_a_copy_of_the_coding_strand_wi', "\uD83D\uDCA1 mRNA is a copy of the coding strand with U in place of T. (RNA Polymerase actually reads the complementary template strand 3'\u21925', which yields the same sequence as the coding strand.)"))
          )
        ),

        // ═══════════════════════════════════════════
        // TRANSLATION TAB
        // ═══════════════════════════════════════════
        tab === 'translate' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-translate", "data-dna-workspace": "translate" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("h4", { className: "text-sm font-bold text-slate-700 mb-3" }, t('stem.dna.ribosome_translation', "\uD83D\uDD2C Ribosome Translation")),
            h("div", { className: "font-mono text-xs break-all mb-3 p-3 bg-slate-50 rounded-lg" },
              h("span", { className: "text-[11px] font-bold text-violet-600 block mb-1" }, "mRNA:"),
              (fullMRNA.match(/.{1,3}/g) || []).map(function(codon, idx) {
                var isActive = idx === transStep && transPlaying;
                var isPast = idx < transStep;
                return h("span", { key: idx, className: "inline-block px-1 py-0.5 mx-0.5 rounded text-xs font-bold " + (isActive ? "bg-violet-600 text-white scale-110" : isPast ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"), title: codon + ' \u2192 ' + (CODON_TABLE[codon] || '?') }, codon);
              })
            ),
            h("div", { className: "flex flex-wrap gap-1 items-center mb-3", role: "list" },
              h("span", { className: "text-[11px] font-bold text-slate-600 mr-1" }, "Protein:"),
              builtProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa }; return h("span", { key: idx, role: "listitem", className: "px-1.5 py-0.5 rounded-md text-[11px] font-bold text-white", style: { background: pr.color }, title: pr.full }, p.aa); }),
              builtProtein.length === 0 && h("span", { className: "text-[11px] text-slate-600 italic" }, t('stem.dna.press_start_to_begin', "Press Start to begin..."))
            ),
            dnaInstrumentFrame(
              "Ribosome Runway",
              "Watch codons slide through E/P/A sites as the amino acid chain grows.",
              "#10b981",
              [
                { label: "Codon", value: Math.min(transStep + 1, Math.max(1, Math.ceil(fullMRNA.length / 3))) + "/" + Math.max(1, Math.ceil(fullMRNA.length / 3)), tone: "#10b981" },
                { label: "Built", value: builtProtein.length + " aa", tone: "#06b6d4" },
                { label: "State", value: transPlaying ? "running" : "ready", tone: transPlaying ? "#f59e0b" : "#64748b" }
              ],
              h("canvas", { ref: _translationCanvasRef, className: "block w-full", style: { width: '100%', height: 260 }, tabIndex: 0, role: "img", 'aria-label': t('stem.dna.ribosome_translation_simulator', 'Ribosome Translation Simulator') }),
              t('stem.dna.ribosome_translation_simulator', 'Ribosome Translation Simulator')
            ),
            h("div", { className: "flex items-center gap-3 mt-4" },
              h("button", { onClick: function() { if (transPlaying) updMulti({ transPlaying: false }); else { updMulti({ transStep: 0, builtProtein: [], transPlaying: true }); } }, className: "px-4 py-2 text-sm font-bold rounded-xl " + (transPlaying ? "bg-amber-700 text-white" : "transition-colors bg-emerald-700 text-white hover:bg-emerald-700 active:scale-[0.97]") }, transPlaying ? "\u23F8 Pause" : "\u25B6 Translate"),
              h("button", { onClick: function() { updMulti({ transStep: 0, builtProtein: [], transPlaying: false }); }, className: "px-3 py-2 text-sm font-bold bg-slate-200 text-slate-600 rounded-xl" }, t('stem.dna.reset_3', "\u21BA Reset"))
            )
          )
        ),

        // ═══════════════════════════════════════════
        // MUTATE TAB
        // ═══════════════════════════════════════════
        tab === 'mutate' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-mutate", "data-dna-workspace": "mutate" },
          h("div", { className: "bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border-2 border-rose-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\uD83E\uDDA0"),
              h("h4", { className: "text-sm font-bold text-rose-800" }, t('stem.dna.mutation_simulator', "Mutation Simulator")),
              h("span", { className: "px-2 py-0.5 bg-rose-200 text-rose-800 text-[11px] font-bold rounded-full" }, "INTERACTIVE")
            ),
            h("p", { className: "text-xs text-slate-600" },
              gradeText(
                'Mutations are like typos in the DNA recipe. Even one small change can make a different protein!',
                'A mutation changes the DNA sequence. This can change the mRNA, which can change the protein. Some mutations are harmless, others cause disease.',
                'Substitutions change one base and may be synonymous, missense, or nonsense. This simulator inserts or deletes one base, so those edits shift the reading frame; larger indels divisible by three would not.',
                'Mutation supplies heritable variation, while selection, drift, migration, and mating patterns change variant frequencies. Coding-region indels cause frameshifts only when their length is not divisible by three.'
              )
            ),
            h("div", { className: "flex gap-2 flex-wrap" },
              h("button", { onClick: function() { applyMutation('substitution'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 shadow-md transition-all active:scale-[0.97]" }, t('stem.dna.substitution', "\uD83D\uDD04 Substitution")),
              h("button", { onClick: function() { applyMutation('insertion'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 shadow-md transition-all active:scale-[0.97]" }, t('stem.dna.insertion', "\u2795 Insertion")),
              h("button", { onClick: function() { applyMutation('deletion'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-red-700 text-white hover:bg-red-600 shadow-md transition-all active:scale-[0.97]" }, t('stem.dna.deletion', "\u2796 Deletion")),
              h("button", { onClick: function() { updMulti({ dnaSequence: 'ATGCGTACCTGAAACTGA', mRNA: '', protein: [], animStep: 0, mutationLog: [] }); addToast('\u21BA Reset to original', 'success'); }, className: "px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all active:scale-[0.97]" }, t('stem.dna.reset_4', "\u21BA Reset"))
            ),
            h("div", { className: "bg-white rounded-lg p-3 border" },
              h("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, "Current Sequence (" + dnaSeq.length + " bp):"),
              h("div", { className: "font-mono text-xs break-all" },
                dnaSeq.split('').map(function(base, idx) { return h("span", { key: idx, className: "inline-block w-5 h-5 text-center leading-5 rounded font-bold text-[11px] m-px", style: { background: BASE_COLORS[base], color: BASE_TEXT_COLORS[base] || '#ffffff', outline: latestMutation && idx === latestMutation.pos ? '2px solid #0f172a' : 'none', outlineOffset: latestMutation && idx === latestMutation.pos ? '2px' : 0 } }, base); })
              ),
              h("p", { className: "text-[11px] text-slate-600 mt-2" }, "Protein: " + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return p.aa; }).join('-') + (translationStop ? ' [STOP ' + translationStop.codon + ']' : ''))
            ),
            latestMutation && h("div", { className: "grid gap-3 rounded-lg border border-rose-200 bg-white p-3 sm:grid-cols-[auto_1fr]", role: "status" },
              h("div", { className: "flex items-center gap-2 font-mono text-xs font-black" },
                h("span", { className: "rounded-md bg-slate-100 px-2 py-1 text-slate-700" }, latestMutation.type === 'Insertion' ? '—' : latestMutation.from),
                h("span", { className: "text-rose-500", "aria-hidden": "true" }, "→"),
                h("span", { className: "rounded-md bg-rose-100 px-2 py-1 text-rose-800" }, latestMutation.type === 'Deletion' ? '—' : latestMutation.to)
              ),
              h("div", null,
                h("p", { className: "mb-1 text-[10px] font-black uppercase tracking-wide text-rose-700" }, "Latest change · base " + (latestMutation.pos + 1)),
                h("p", { className: "m-0 text-[11px] leading-relaxed text-slate-600" },
                  latestMutation.type === 'Substitution'
                    ? 'One nucleotide changed. Compare the protein readout to determine whether the codon is silent, missense, or nonsense.'
                    : 'A single-base ' + latestMutation.type.toLowerCase() + ' shifts the downstream reading frame and can change every codon that follows.'
                )
              )
            ),
            (d.mutationLog && d.mutationLog.length > 0) && h("div", { className: "mt-2" },
              h("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, t('stem.dna.mutation_log', "\uD83D\uDCCB Mutation Log:")),
              h("div", { className: "space-y-1 max-h-32 overflow-y-auto" },
                (d.mutationLog || []).map(function(m, i) {
                  var emoji = m.type === 'Substitution' ? '\uD83D\uDD04' : m.type === 'Insertion' ? '\u2795' : '\u2796';
                  var desc = m.type === 'Substitution' ? m.from + '\u2192' + m.to + ' at pos ' + (m.pos + 1) :
                             m.type === 'Insertion' ? '+' + m.to + ' at pos ' + (m.pos + 1) :
                             '-' + m.from + ' at pos ' + (m.pos + 1);
                  return h("div", { key: i, className: "text-[11px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, emoji + ' ' + m.type + ': ' + desc);
                })
              )
            )
          ),
          callGemini && h("div", { className: "mt-2" },
            h("button", { onClick: function() {
              if (d.aiExplainLoading) return;
              upd('aiExplainLoading', true); upd('aiExplain', '');
              var gradeCtx = gradeText('kindergarten (ages 5-7), very simple words', '3rd-5th grade (ages 8-10)', '6th-8th grade (ages 11-13), use scientific terms', '9th-12th grade (ages 14-18), use advanced biology terminology');
              var mutLog = (d.mutationLog || []).slice(-3).map(function(m) { return m.type + (m.from ? ' ' + m.from : '') + (m.to ? '\u2192' + m.to : '') + ' at pos ' + (m.pos + 1); }).join('; ');
              var prompt = 'You are a genetics teacher. Grade level: ' + gradeCtx + '. ' +
                'DNA sequence: ' + dnaSeq + '. Protein: ' + fullProtein.map(function(p) { return p.aa; }).join('-') + '. ' +
                'Recent mutations: ' + (mutLog || 'none') + '. ' +
                'Explain in 3-4 sentences what this DNA codes for, how the mutations affected the protein, and whether the changes would be harmful/neutral/beneficial. Be engaging and educational.';
              callGemini(prompt, true, false, 0.7).then(function(resp) {
                upd('aiExplain', typeof resp === 'string' ? resp : 'Could not generate explanation.');
                upd('aiExplainLoading', false);
              }).catch(function() { upd('aiExplain', 'AI explanation unavailable.'); upd('aiExplainLoading', false); });
            }, disabled: d.aiExplainLoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiExplainLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white hover:from-purple-600 hover:to-fuchsia-600 shadow-md') }, d.aiExplainLoading ? '\u23F3 Analyzing...' : '\u2728 AI: Explain This DNA'),
            d.aiExplain && h("div", { className: "mt-2 p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed" },
              h("span", { className: "text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1" }, t('stem.dna.ai_analysis', "\uD83E\uDDE0 AI Analysis")),
              d.aiExplain
            )
          )
        ),

        // ═══════════════════════════════════════════
        // CRISPR TAB
        // ═══════════════════════════════════════════
        tab === 'crispr' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-crispr", "data-dna-workspace": "crispr" },
          (function() {
            var currentStage = crisprPhase === 'design' ? 0 : crisprPhase === 'scanning' ? 1 : crisprPhase === 'cut' ? 2 : 3;
            return h("ol", { className: "grid grid-cols-4 gap-2", 'aria-label': "CRISPR editing progress" },
              ['Design', 'Scan', 'Cut', 'Repair'].map(function(label, index) {
                var state = index < currentStage ? 'complete' : index === currentStage ? 'current' : 'upcoming';
                return h("li", { key: label, className: "min-w-0 rounded-lg border px-2 py-2 text-center " + (
                  state === 'complete' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                  state === 'current' ? 'border-violet-400 bg-violet-50 text-violet-800 shadow-sm' :
                  'border-slate-200 bg-white text-slate-500'
                ), 'aria-current': state === 'current' ? 'step' : undefined },
                  h("span", { className: "block font-mono text-[9px] font-black" }, state === 'complete' ? '\u2713' : '0' + (index + 1)),
                  h("span", { className: "mt-0.5 block truncate text-[10px] font-bold" }, label)
                );
              })
            );
          })(),
          dnaInstrumentFrame(
            "CRISPR Targeting Bay",
            "Guide RNA locks onto the PAM zone before Cas9 cuts and repairs.",
            "#ef4444",
            [
              { label: "Phase", value: crisprPhase, tone: "#ef4444" },
              { label: "PAM", value: pamSites.length, tone: "#8b5cf6" },
              { label: "Scan", value: crisprScanPos + "/" + (selectedPAMSite ? selectedPAMSite.cutSite : 0), tone: "#0ea5e9" }
            ],
            h("canvas", { ref: _crisprCanvasRef, className: "block w-full", style: { width: '100%', height: 280 }, tabIndex: 0, role: "img", 'aria-label': 'CRISPR: ' + crisprPhase }),
            t('stem.dna.crispr_cas9_gene_editing_simulation', 'CRISPR-Cas9 gene editing simulation')
          ),

          h("div", { className: "bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl border-2 border-violet-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\u2702\uFE0F"),
              h("h4", { className: "text-sm font-bold text-violet-800" }, t('stem.dna.crispr_cas9_gene_editor', "CRISPR-Cas9 Gene Editor")),
              h("span", { className: "px-2 py-0.5 text-[11px] font-bold rounded-full " + (
                crisprPhase === 'design' ? 'bg-blue-200 text-blue-800' :
                crisprPhase === 'scanning' ? 'bg-amber-200 text-amber-800 animate-pulse' :
                crisprPhase === 'cut' ? 'bg-red-200 text-red-800' :
                crisprPhase === 'done' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
              ) }, crisprPhase === 'design' ? 'DESIGN' : crisprPhase === 'scanning' ? 'SCANNING...' : crisprPhase === 'cut' ? 'TARGET FOUND' : crisprPhase === 'done' ? 'EDIT COMPLETE' : crisprPhase.toUpperCase())
            ),
            h("p", { className: "text-xs text-slate-600 leading-relaxed" },
              gradeText(
                '\u2702\uFE0F CRISPR can guide a protein such as Cas9 to a chosen DNA region. Cutting and repair can change the sequence, but outcomes are not guaranteed and medical uses require careful testing.',
                '\u2702\uFE0F SpCas9 uses guide-RNA pairing plus an NGG PAM to recognize a target region. It usually cuts both strands about three bases before the PAM, and cellular repair determines the edit.',
                '\u2702\uFE0F SpCas9 typically pairs a 20-nt guide spacer with target DNA next to 5\u2032-NGG-3\u2032 and cuts about three bases upstream. End joining often yields indels; homology-directed repair can copy a donor template, but efficiencies and outcomes vary.',
                '\u2702\uFE0F In SpCas9, crRNA plus tracrRNA (or an sgRNA) targets a protospacer next to an NGG PAM. HNH and RuvC nuclease domains cleave opposite strands near three bases upstream. Repair distributions, on-target byproducts, and off-target activity must be measured rather than assumed away.'
              )
            ),

            // Design phase
            crisprPhase === 'design' && h("div", { className: "space-y-2" },
              h("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, t('stem.dna.step_1_select_pam_target_site', 'Step 1: Select PAM Target Site')),
              pamSites.length === 0 ? h("p", { className: "text-xs text-amber-800 bg-amber-50 p-2 rounded-lg" }, t('stem.dna.no_pam_sites_ngg_found_try_a_different', '\u26A0\uFE0F No forward-strand NGG sites with enough upstream sequence were found. Try a longer preset from Build.')) :
              h("div", { className: "space-y-1" },
                h("p", { className: "text-[11px] text-slate-600" }, pamSites.length + ' forward-strand PAM site(s) detected. The six-base guide window is schematic; real SpCas9 spacers are typically 20 nt:'),
                h("div", { className: "flex gap-1 flex-wrap" },
                  pamSites.map(function(site, idx) {
                    return h("button", { type: "button", key: idx, 'aria-pressed': activePAM === idx, onClick: function() { upd('crisprTargetPAM', idx); },
                      className: "px-2 py-1 text-[11px] font-bold rounded-lg transition-all " + (activePAM === idx ? 'bg-violet-600 text-white shadow-md' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-violet-50 active:scale-[0.97]')
                    }, 'Pos ' + (site.pamStart + 1) + ' (' + dnaSeq.substring(site.pamStart, site.pamStart + 3) + ')');
                  })
                ),
                selectedPAMSite && h("div", { className: "mt-2 p-2 bg-white rounded-lg border text-[11px]" },
                  h("p", { className: "text-slate-600" }, '\uD83C\uDFAF Schematic guide window: pos ' + (selectedPAMSite.guideStart + 1) + '-' + selectedPAMSite.guideEnd + ' | cut near pos ' + (selectedPAMSite.cutSite + 1) + ' | PAM: ' + dnaSeq.substring(selectedPAMSite.pamStart, selectedPAMSite.pamStart + 3) + ' at pos ' + (selectedPAMSite.pamStart + 1)),
                  h("p", { className: "text-blue-600 font-mono mt-0.5" }, 'gRNA: ' + dnaSeq.substring(selectedPAMSite.guideStart, selectedPAMSite.guideEnd).split('').map(function(b) { return DNA_TO_RNA[b] || b; }).join(''))
                ),
                h("button", { type: "button", onClick: startCRISPRScan, disabled: !selectedPAMSite, className: "mt-2 px-4 py-2 text-sm font-bold rounded-xl transition-all " + (selectedPAMSite ? 'transition-colors bg-violet-600 text-white hover:bg-violet-700 shadow-md active:scale-[0.97]' : 'bg-slate-500 text-white cursor-not-allowed') }, t('stem.dna.deploy_cas9', '\uD83D\uDE80 Deploy Cas9'))
              )
            ),

            // Scanning phase
            crisprPhase === 'scanning' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs text-amber-600 font-bold" }, '\uD83D\uDD0E Cas9 scanning... position ' + crisprScanPos + '/' + (selectedPAMSite ? selectedPAMSite.cutSite : '?')),
              h("div", { className: "w-full bg-slate-100 rounded-full h-2" },
                h("div", { className: "bg-gradient-to-r from-violet-500 to-blue-500 rounded-full h-2 transition-all", style: { width: (selectedPAMSite ? (crisprScanPos / selectedPAMSite.cutSite * 100) : 0) + '%' } })
              ),
              h("div", { className: "flex items-center gap-2", role: "group", 'aria-label': "CRISPR scan speed" },
                h("span", { className: "text-xs text-slate-600" }, 'Speed:'),
                [1, 2, 4].map(function(s) { return h("button", { type: "button", key: s, 'aria-pressed': speed === s, onClick: function() { upd('speed', s); }, className: "px-2 py-0.5 text-[11px] font-bold rounded " + (speed === s ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600') }, s + 'x'); })
              )
            ),

            // Cut phase
            crisprPhase === 'cut' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs font-bold text-red-600" }, t('stem.dna.double_strand_break_created_choose_rep', '\u2702\uFE0F Double-strand break created! Choose repair pathway:')),
              h("div", { className: "flex flex-wrap items-center gap-1", role: "group", 'aria-label': "Choose the donor-template base for the HDR model" },
                h("span", { className: "text-[11px] font-bold text-slate-600 mr-1" }, "HDR donor base:"),
                ['A', 'T', 'G', 'C'].map(function(base) {
                  return h("button", {
                    type: "button",
                    key: base,
                    'aria-pressed': crisprDonorBase === base,
                    onClick: function() { upd('crisprDonorBase', base); },
                    className: "w-8 h-8 rounded-lg text-xs font-black border " + (crisprDonorBase === base ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-slate-700 border-slate-300")
                  }, base);
                })
              ),
              h("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2" },
                h("button", { type: "button", onClick: function() { applyCRISPRRepair('nhej'); }, className: "p-3 rounded-xl border-2 border-amber-600 bg-amber-50 hover:bg-amber-100 transition-all text-left active:scale-[0.97]" },
                  h("p", { className: "text-xs font-bold text-amber-700" }, t('stem.dna.nhej', '\uD83D\uDD27 NHEJ')),
                  h("p", { className: "text-[11px] text-amber-600 mt-0.5" }, t('stem.dna.non_homologous_end_joining', 'Non-Homologous End Joining')),
                  h("p", { className: "text-[11px] text-slate-600 mt-1" }, gradeText('Quick fix - might make mistakes!', 'Often rejoins the break with small insertions or deletions; this model applies a deletion.', 'Often produces a distribution of indels and is commonly used in knockout experiments; this model shows one deletion outcome.', 'Often produces a distribution of indels and is commonly used in knockout experiments; this model shows one deletion outcome.'))
                ),
                h("button", { type: "button", onClick: function() { applyCRISPRRepair('hdr'); }, className: "p-3 rounded-xl border-2 border-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all text-left active:scale-[0.97]" },
                  h("p", { className: "text-xs font-bold text-emerald-700" }, t('stem.dna.hdr', '\uD83E\uDDEC HDR')),
                  h("p", { className: "text-[11px] text-emerald-600 mt-0.5" }, t('stem.dna.homology_directed_repair', 'Homology-Directed Repair')),
                  h("p", { className: "text-[11px] text-slate-600 mt-1" }, gradeText('Careful fix - uses a template!', 'Template-directed editing can copy a supplied donor sequence; this model substitutes the selected base.', 'A donor template can support a desired knock-in, but repair efficiency and byproducts vary.', 'A donor template can support a desired change, but on-target byproducts and efficiency must be measured.'))
                )
              )
            ),

            // Done phase
            crisprPhase === 'done' && h("div", { className: "space-y-2" },
              h("p", { className: "text-xs font-bold text-emerald-600" }, '\u2705 Edit model complete. Repair: ' + (crisprRepairType === 'nhej' ? 'NHEJ' : 'HDR')),
              h("button", { type: "button", onClick: function() { updMulti({ crisprPhase: 'design', crisprScanPos: 0, crisprRepairType: '' }); }, className: "transition-colors px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 active:scale-[0.97]" }, t('stem.dna.new_edit', '\u21BA New Edit'))
            ),

            // Edit history
            crisprEditLog.length > 0 && h("div", { className: "mt-2 pt-2 border-t border-slate-200" },
              h("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, t('stem.dna.crispr_edit_history', '\uD83D\uDCCB CRISPR Edit History:')),
              h("div", { className: "space-y-1 max-h-24 overflow-y-auto" },
                crisprEditLog.map(function(e, i) {
                  return h("div", { key: i, className: "text-[11px] px-2 py-1 rounded bg-slate-50 text-slate-600" }, (e.type === 'NHEJ' ? '\uD83D\uDD27' : '\uD83E\uDDEC') + ' ' + e.desc);
                })
              )
            )
          ),

          h("details", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
            h("summary", { className: "transition-colors px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50 active:scale-[0.97]" }, t('stem.dna.crispr_quick_reference', '\uD83D\uDCDA CRISPR Quick Reference')),
            h("div", { className: "p-3 text-[11px] text-slate-600 space-y-2" },
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, t('stem.dna.what_is_crispr', 'What is CRISPR?')),
                h("p", null, t('stem.dna.crispr_clustered_regularly_interspaced', 'CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) is a gene editing technology adapted from bacteria\'s immune defense.'))
              ),
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, t('stem.dna.key_components', 'Key Components:')),
                h("ul", { className: "list-disc ml-4 space-y-0.5" },
                  h("li", null, h("strong", null, 'Cas9'), t('stem.dna.the_molecular_scissors_endonuclease', ' - The molecular scissors (endonuclease)')),
                  h("li", null, h("strong", null, t('stem.dna.guide_rna', 'Guide RNA')), t('stem.dna.a_20nt_rna_that_directs_cas9_to_the_ta', ' - A ~20nt RNA that directs Cas9 to the target')),
                  h("li", null, h("strong", null, 'PAM'), t('stem.dna.protospacer_adjacent_motif_ngg_require', ' - Protospacer Adjacent Motif (NGG). Required for binding.'))
                )
              ),
              h("div", null,
                h("p", { className: "font-bold text-slate-700" }, 'Applications:'),
                h("p", null, t('stem.dna.gene_therapy_sickle_cell_casgevy_cance', 'Gene therapy (sickle cell \u2192 CASGEVY\u2122), cancer immunotherapy, crop engineering, disease models.'))
              )
            )
          )
        ),

        // ═══════════════════════════════════════════
        // PROTEIN TAB
        // ═══════════════════════════════════════════
        tab === 'protein' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-protein", "data-dna-workspace": "protein" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("div", { className: "flex items-center justify-between mb-3" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, "\uD83E\uDDEA Protein - " + fullProtein.length + " amino acids"),
              fullProtein.length > 0 && h("span", { className: "text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full" },
                Math.round(fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length / Math.max(1, fullProtein.length) * 100) + '% hydrophobic'
              )
            ),
            fullProtein.length > 0 ? h("div", { className: "space-y-3" },
              h("div", { className: "flex flex-wrap gap-1.5 p-3 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl border border-slate-100" },
                fullProtein.map(function(p, idx) { var pr = AA_PROPS[p.aa] || { color: '#888', full: p.aa, abbr: '?', type: '?' };
                  return h("div", { key: idx, className: "flex flex-col items-center gap-0.5 p-1.5 rounded-lg min-w-[44px] hover:scale-105 transition-transform cursor-default", title: pr.full + ' (' + p.codon + ') - ' + pr.type },
                    h("span", { className: "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm", style: { background: pr.color } }, pr.abbr),
                    h("span", { className: "text-[11px] font-bold text-slate-600" }, p.aa),
                    h("span", { className: "text-[11px] text-slate-600 font-mono" }, p.codon),
                    idx < fullProtein.length - 1 && p.aa !== 'Stop' ? h("span", { className: "text-[11px] text-slate-600" }, '\u2500') : null
                  );
                })
              ),
              h("div", { className: "grid grid-cols-2 gap-2 mt-2" },
                h("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-100" },
                  h("p", { className: "text-[11px] font-bold text-amber-700 uppercase" }, t('stem.dna.nonpolar_hydrophobic', 'Nonpolar (Hydrophobic)')),
                  h("p", { className: "text-sm font-black text-amber-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'nonpolar'; }).length),
                  h("p", { className: "text-[11px] text-amber-700" }, t('stem.dna.ala_val_leu_ile_pro_phe_trp_met_gly', 'Ala, Val, Leu, Ile, Pro, Phe, Trp, Met, Gly'))
                ),
                h("div", { className: "bg-blue-50 rounded-lg p-2 border border-blue-100" },
                  h("p", { className: "text-[11px] font-bold text-blue-700 uppercase" }, t('stem.dna.polar_hydrophilic', 'Polar (Hydrophilic)')),
                  h("p", { className: "text-sm font-black text-blue-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'polar'; }).length),
                  h("p", { className: "text-[11px] text-blue-500" }, t('stem.dna.ser_thr_cys_tyr_asn_gln', 'Ser, Thr, Cys, Tyr, Asn, Gln'))
                ),
                h("div", { className: "bg-red-50 rounded-lg p-2 border border-red-100" },
                  h("p", { className: "text-[11px] font-bold text-red-700 uppercase" }, t('stem.dna.positively_charged', 'Positively Charged')),
                  h("p", { className: "text-sm font-black text-red-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'positive'; }).length),
                  h("p", { className: "text-[11px] text-red-500" }, t('stem.dna.arg_lys_his', 'Arg, Lys, His'))
                ),
                h("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-100" },
                  h("p", { className: "text-[11px] font-bold text-purple-700 uppercase" }, t('stem.dna.negatively_charged', 'Negatively Charged')),
                  h("p", { className: "text-sm font-black text-purple-600" }, fullProtein.filter(function(p) { return (AA_PROPS[p.aa] || {}).type === 'negative'; }).length),
                  h("p", { className: "text-[11px] text-purple-500" }, t('stem.dna.asp_glu', 'Asp, Glu'))
                )
              ),
              h("div", { className: "bg-slate-50 rounded-lg p-2 border border-slate-400 mt-1" },
                h("p", { className: "text-[11px] font-bold text-slate-600" }, '\u2696\uFE0F Estimated MW: ~' + (fullProtein.length * 110) + ' Da (' + (fullProtein.length * 110 / 1000).toFixed(1) + ' kDa) | Seq: ' + fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return (AA_PROPS[p.aa] || {}).abbr || '?'; }).join(''))
              ),
              h("div", { className: "flex gap-3 text-[11px] text-slate-600 pt-2 border-t flex-wrap" },
                [{ t: 'nonpolar', c: '#f59e0b', l: 'Nonpolar' }, { t: 'polar', c: '#3b82f6', l: 'Polar' }, { t: 'positive', c: '#ef4444', l: 'Positive (+)' }, { t: 'negative', c: '#a855f7', l: 'Negative (\u2212)' }].map(function(lg) { return h("span", { key: lg.t, className: "flex items-center gap-1" }, h("span", { className: "w-3 h-3 rounded-full", style: { background: lg.c } }), lg.l); })
              ),
              callGemini && h("div", { className: "pt-2 border-t border-slate-100" },
                h("button", { onClick: function() {
                  if (d.aiProteinLoading) return;
                  upd('aiProteinLoading', true);
                  var gradeCtx = gradeText('kindergarten, very simple', '3rd-5th grade', '6th-8th grade, scientific terms', '9th-12th grade, advanced biochemistry');
                  var seq = fullProtein.filter(function(p) { return p.aa !== 'Stop'; }).map(function(p) { return p.aa; }).join('-');
                  var prompt = 'You are a biochemistry teacher. Grade: ' + gradeCtx + '. Protein sequence: ' + seq + '. Amino acid count: ' + fullProtein.length + '. Analyze this protein in 3-4 sentences: predict likely function, cellular location, and any notable patterns. Be educational and engaging.';
                  callGemini(prompt, true, false, 0.7).then(function(r) { updMulti({ aiProtein: typeof r === 'string' ? r : 'Analysis unavailable.', aiProteinLoading: false }); checkBadge('proteinSci'); }).catch(function() { updMulti({ aiProtein: 'AI unavailable.', aiProteinLoading: false }); });
                }, disabled: d.aiProteinLoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiProteinLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md') }, d.aiProteinLoading ? '\u23F3 Analyzing...' : '\u2728 AI: Analyze Protein'),
                d.aiProtein && h("div", { className: "mt-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 leading-relaxed" },
                  h("span", { className: "text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1" }, t('stem.dna.protein_analysis', '\uD83E\uDDE0 Protein Analysis')),
                  d.aiProtein
                )
              )
            ) : h("div", { className: "text-center py-8 text-slate-200" }, h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEA"), h("p", null, t('stem.dna.run_transcription_and_translation_firs', "Run Transcription and Translation first!")))
          ),
          h("details", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
            h("summary", { className: "transition-colors px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50 active:scale-[0.97]" }, t('stem.dna.genetic_disorders_reference', '\uD83E\uDDA0 Genetic Disorders Reference')),
            h("div", { className: "p-3 space-y-2 max-h-60 overflow-y-auto" },
              GENETIC_DISORDERS.map(function(dis) {
                return h("div", { key: dis.name, className: "p-2 bg-slate-50 rounded-lg" },
                  h("div", { className: "flex items-center gap-2" },
                    h("span", { className: "text-xs font-bold text-slate-700" }, dis.name),
                    h("span", { className: "px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[11px] font-bold rounded-full" }, dis.type)
                  ),
                  h("p", { className: "text-[11px] text-slate-600 mt-0.5" }, 'Gene: ' + dis.gene + ' | Mutation: ' + dis.mutation),
                  h("p", { className: "text-[11px] text-slate-600 mt-0.5" }, dis.effect)
                );
              })
            )
          ),

          // \u2550\u2550\u2550 MUTATION EFFECT SLEUTH (net-new mini-game) \u2550\u2550\u2550
          // 10 mutation vignettes. Player picks the effect type from 5 options
          // (silent / missense / nonsense / frameshift / in-frame indel). Tests the
          // AP Bio canonical concept that mutation TYPE matters more than mutation
          // existence - silent mutations don't change protein, frameshifts are
          // usually catastrophic, missense varies by which AA changes.
          (function() {
            var MS_TYPES = [
              { id: 'silent',     label: t('stem.dna.silent', 'Silent'),           color: '#22c55e', icon: '\uD83E\uDD2D', def: 'Codon changes but encodes the same amino acid (wobble, mostly 3rd position). No protein change.' },
              { id: 'missense',   label: t('stem.dna.missense', 'Missense'),         color: '#f59e0b', icon: '\uD83D\uDD04', def: 'Codon changes to a different amino acid. Effect ranges from harmless (conservative) to catastrophic (e.g., sickle cell).' },
              { id: 'nonsense',   label: t('stem.dna.nonsense', 'Nonsense'),         color: '#dc2626', icon: '\uD83D\uDED1', def: 'Sense codon changes to STOP. Protein is truncated - usually nonfunctional.' },
              { id: 'frameshift', label: t('stem.dna.frameshift', 'Frameshift'),       color: '#7c3aed', icon: '\u21AA\uFE0F',  def: 'Insertion or deletion NOT divisible by 3. Reading frame shifts; downstream protein is garbage. Usually catastrophic.' },
              { id: 'inframe',    label: t('stem.dna.in_frame_indel', 'In-frame indel'),   color: '#0ea5e9', icon: '\u2795', def: 'Insertion or deletion that IS divisible by 3. Adds or removes whole amino acids; rest of protein is unchanged.' }
            ];
            var MS_VIGNETTES = [
              { id: 1, before: 'ATG GCC TTC TAA',  after: 'ATG GCC TTT TAA',          change: 'TTC \u2192 TTT (3rd-position C\u2192T)',
                aaBefore: 'Met-Ala-Phe-stop', aaAfter: 'Met-Ala-Phe-stop', correct: 'silent',
                why: 'Both TTC and TTT encode phenylalanine - the 3rd-position change is wobble and produces no protein change. Common at the 3rd codon position because of the genetic code\'s redundancy there.' },
              { id: 2, before: 'ATG GAG GTG TAA', after: 'ATG GTG GTG TAA',           change: 'GAG \u2192 GTG (2nd-position A\u2192T)',
                aaBefore: 'Met-Glu-Val-stop', aaAfter: 'Met-Val-Val-stop', correct: 'missense',
                why: 'Glutamate \u2192 Valine. This is the actual sickle-cell hemoglobin mutation (HbS). Single AA swap radically changes hemoglobin folding under low O\u2082. Missense effect depends entirely on which AA changes to which.' },
              { id: 3, before: 'ATG CAG GCC TAA', after: 'ATG TAG GCC TAA',           change: 'CAG \u2192 TAG (1st-position C\u2192T)',
                aaBefore: 'Met-Gln-Ala-stop', aaAfter: 'Met-STOP', correct: 'nonsense',
                why: 'Glutamine \u2192 STOP. Protein is truncated immediately after Met. CAG\u2192TAG (and CGA\u2192TGA, TGG\u2192TGA, TGG\u2192TAG) are the most common nonsense mutations - single base flip from a sense codon to a stop.' },
              { id: 4, before: 'ATG GCC TTC GGG TAA', after: 'ATG GCC GTT CGG GTA A',  change: 'Single G inserted between codons 2 and 3',
                aaBefore: 'Met-Ala-Phe-Gly-stop', aaAfter: 'Met-Ala-Val-Arg-Val-...', correct: 'frameshift',
                why: 'Inserting one base shifts the reading frame for everything downstream. Every codon past the insertion is a different triplet - usually creating a premature stop within ~20 codons. Frameshifts almost always destroy protein function.' },
              { id: 5, before: 'ATG GCC TTC TAA', after: 'ATG GCC GGG TTC TAA',       change: 'GGG (3 bases) inserted between codons 2 and 3',
                aaBefore: 'Met-Ala-Phe-stop', aaAfter: 'Met-Ala-Gly-Phe-stop', correct: 'inframe',
                why: 'Inserting 3 bases keeps the reading frame intact. One extra glycine added between Ala and Phe. The rest of the protein is unchanged - effect depends on whether the new AA disrupts folding. Often less severe than frameshift.' },
              { id: 6, before: 'ATG CCG GCC TAA', after: 'ATG CCA GCC TAA',           change: 'CCG \u2192 CCA (3rd-position G\u2192A)',
                aaBefore: 'Met-Pro-Ala-stop', aaAfter: 'Met-Pro-Ala-stop', correct: 'silent',
                why: 'Both CCG and CCA encode proline. All four CC_ codons code for proline - the 3rd position is fully wobble for proline. Silent mutations are common in coding sequences and one reason synonymous-substitution rates are used in molecular evolution.' },
              { id: 7, before: 'ATG TGG GCC TAA', after: 'ATG TGA GCC TAA',           change: 'TGG \u2192 TGA (3rd-position G\u2192A)',
                aaBefore: 'Met-Trp-Ala-stop', aaAfter: 'Met-STOP', correct: 'nonsense',
                why: 'Tryptophan \u2192 STOP. TGG is the only Trp codon, and a single 3rd-position G\u2192A change makes it a stop. This is one reason Trp residues are often essential - they are fragile in the genetic code.' },
              { id: 8, before: 'ATG GCC TTC GGG TAA', after: 'ATG GCC TTC GGA',       change: 'Last base of stop codon deleted',
                aaBefore: 'Met-Ala-Phe-Gly-stop', aaAfter: 'Met-Ala-Phe-Gly-...', correct: 'frameshift',
                why: 'Deleting one base causes a frameshift. The stop codon is destroyed; ribosome reads through into UTR until it hits the next in-frame stop somewhere downstream. The extended protein is usually misfolded.' },
              { id: 9, before: 'ATG TTC GGG GCC TAA', after: 'ATG GCC TAA',           change: 'TTC GGG (6 bases, 2 codons) deleted in-frame',
                aaBefore: 'Met-Phe-Gly-Ala-stop', aaAfter: 'Met-Ala-stop', correct: 'inframe',
                why: 'Deleting 6 bases (2 codons) keeps the reading frame intact. Phe and Gly are removed; Ala remains. Classic example: cystic fibrosis \u0394F508 is a 3-base deletion that removes one phenylalanine - in-frame, but breaks CFTR folding.' },
              { id: 10, before: 'ATG AAA GCC TAA', after: 'ATG AGA GCC TAA',          change: 'AAA \u2192 AGA (2nd-position A\u2192G)',
                aaBefore: 'Met-Lys-Ala-stop', aaAfter: 'Met-Arg-Ala-stop', correct: 'missense',
                why: 'Lysine \u2192 Arginine. Both are basic, positively-charged AAs - chemically very similar. This is a CONSERVATIVE missense. Often has minimal protein-function impact, unlike radical missense (e.g., Glu\u2192Val in #2).' }
            ];
            var msIdx = d.msIdx == null ? -1 : d.msIdx;
            var msSeed = d.msSeed || 1;
            var msAnswered = !!d.msAnswered;
            var msPick = d.msPick;
            var msScore = d.msScore || 0;
            var msRounds = d.msRounds || 0;
            var msStreak = d.msStreak || 0;
            var msBest = d.msBest || 0;
            var msShown = d.msShown || [];
            var msOpen = !!d.msOpen;
            function startMs() {
              var pool = [];
              for (var i = 0; i < MS_VIGNETTES.length; i++) if (msShown.indexOf(i) < 0) pool.push(i);
              if (pool.length === 0) { pool = []; for (var j = 0; j < MS_VIGNETTES.length; j++) pool.push(j); msShown = []; }
              var seedNext = ((msSeed * 16807 + 11) % 2147483647) || 7;
              var pick = pool[seedNext % pool.length];
              upd('msSeed', seedNext);
              upd('msIdx', pick);
              upd('msAnswered', false);
              upd('msPick', null);
              upd('msShown', msShown.concat([pick]));
            }
            function pickMs(typeId) {
              if (msAnswered) return;
              var v = MS_VIGNETTES[msIdx];
              var correct = typeId === v.correct;
              var newScore = msScore + (correct ? 1 : 0);
              var newStreak = correct ? (msStreak + 1) : 0;
              var newBest = Math.max(msBest, newStreak);
              upd('msAnswered', true);
              upd('msPick', typeId);
              upd('msScore', newScore);
              upd('msRounds', msRounds + 1);
              upd('msStreak', newStreak);
              upd('msBest', newBest);
            }
            return h("div", { className: "bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border-2 border-violet-300 p-4" },
              h("div", { className: "flex items-center justify-between mb-2 flex-wrap gap-2" },
                h("div", { className: "flex items-center gap-2" },
                  h("span", { style: { fontSize: 22 }, "aria-hidden": "true" }, '\uD83D\uDD75\uFE0F'),
                  h("div", null,
                    h("div", { className: "text-sm font-black text-violet-800" }, t('stem.dna.mutation_effect_sleuth', 'Mutation Effect Sleuth')),
                    h("div", { className: "text-[11px] text-slate-600 italic" }, t('stem.dna.predict_the_effect_type_from_5_options', 'Predict the effect type from 5 options.'))
                  )
                ),
                h("button", {
                  onClick: function() { upd('msOpen', !msOpen); },
                  className: "transition-colors px-3 py-1 rounded-lg bg-violet-200 text-violet-800 text-[11px] font-bold hover:bg-violet-300 active:scale-[0.97]"
                }, msOpen ? 'Hide \u25B4' : 'Play \u2192')
              ),
              msOpen && (msIdx < 0
                ? h("div", { className: "text-center py-3" },
                    h("p", { className: "text-[11px] text-slate-700 leading-relaxed mb-3" },
                      t('stem.dna.10_mutation_vignettes_each_shows_a_sho', '10 mutation vignettes. Each shows a short before/after DNA sequence with the change highlighted. Pick the effect type - silent, missense, nonsense, frameshift, or in-frame indel. Coaching after each pick names what makes this effect more likely than the others.')),
                    h("button", {
                      onClick: startMs,
                      'aria-label': t('stem.dna.start_mutation_effect_sleuth', 'Start Mutation Effect Sleuth'),
                      className: "transition-colors px-4 py-2 rounded-lg bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500 active:scale-[0.97]"
                    }, t('stem.dna.start_vignette_1_of_10', '\uD83D\uDD75\uFE0F Start - vignette 1 of 10'))
                  )
                : (function() {
                    var v = MS_VIGNETTES[msIdx];
                    var pickedCorrect = msAnswered && msPick === v.correct;
                    var pct = msRounds > 0 ? Math.round((msScore / msRounds) * 100) : 0;
                    var allDone = msShown.length >= MS_VIGNETTES.length && msAnswered;
                    return h("div", null,
                      h("div", { className: "flex items-center flex-wrap gap-3 mb-3 text-[11px] text-slate-600" },
                        h("span", null, t('stem.dna.vignette', 'Vignette '), h('strong', { className: "text-slate-800" }, msShown.length)),
                        h("span", null, t('stem.dna.score', 'Score '), h('strong', { className: "text-emerald-700" }, msScore + ' / ' + msRounds)),
                        msRounds > 0 && h("span", null, t('stem.dna.accuracy', 'Accuracy '), h('strong', { className: "text-cyan-700" }, pct + '%')),
                        h("span", null, t('stem.dna.streak', 'Streak '), h('strong', { className: "text-amber-700" }, msStreak)),
                        h("span", null, t('stem.dna.best', 'Best '), h('strong', { className: "text-fuchsia-700" }, msBest))
                      ),
                      h("div", { className: "bg-white rounded-lg p-3 border border-violet-200 mb-2" },
                        h("div", { className: "text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-1" }, 'Vignette ' + msShown.length + ' of ' + MS_VIGNETTES.length),
                        h("div", { className: "font-mono text-[12px] text-slate-700 mb-1" },
                          h('span', { className: "text-slate-500" }, 'Before:  '),
                          h('span', { className: "text-emerald-700 font-bold" }, v.before)
                        ),
                        h("div", { className: "font-mono text-[12px] text-slate-700 mb-1" },
                          h('span', { className: "text-slate-500" }, 'After:   '),
                          h('span', { className: "text-rose-700 font-bold" }, v.after)
                        ),
                        h("div", { className: "text-[11px] text-slate-700 italic mt-1" }, 'Change: ' + v.change),
                        msAnswered && h("div", { className: "mt-2 pt-2 border-t border-violet-100 text-[11px] text-slate-700 font-mono" },
                          h('div', null, h('span', { className: 'text-slate-500' }, t('stem.dna.aa_before', 'AA before: ')), v.aaBefore),
                          h('div', null, h('span', { className: 'text-slate-500' }, t('stem.dna.aa_after', 'AA after:  ')), v.aaAfter)
                        )
                      ),
                      h("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2", role: 'radiogroup', 'aria-label': t('stem.dna.pick_the_mutation_effect_type', 'Pick the mutation effect type') },
                        MS_TYPES.map(function(t) {
                          var picked = msAnswered && msPick === t.id;
                          var isRight = msAnswered && t.id === v.correct;
                          var bg, border, color;
                          if (msAnswered) {
                            if (isRight) { bg = '#ecfdf5'; border = '#22c55e'; color = '#166534'; }
                            else if (picked) { bg = '#fef2f2'; border = '#ef4444'; color = '#991b1b'; }
                            else { bg = '#f8fafc'; border = '#cbd5e1'; color = '#64748b'; }
                          } else {
                            bg = t.color + '15'; border = t.color + '60'; color = '#1e293b';
                          }
                          return h('button', {
                            key: t.id, role: 'radio',
                            'aria-checked': picked ? 'true' : 'false',
                            'aria-label': t.label,
                            disabled: msAnswered,
                            onClick: function() { pickMs(t.id); },
                            style: { padding: '10px 10px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: msAnswered ? 'default' : 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 700, transition: 'all 0.15s', minHeight: 64 }
                          },
                            h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 } },
                              h('span', { style: { fontSize: 14 }, 'aria-hidden': 'true' }, t.icon),
                              h('span', { style: { color: msAnswered ? color : t.color, fontSize: 12, fontWeight: 800 } }, t.label)
                            ),
                            h('div', { style: { fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: msAnswered ? color: 'var(--allo-stem-text-soft, #475569)' } }, t.def)
                          );
                        })
                      ),
                      msAnswered && h("div", {
                        className: "mt-3 p-3 rounded-lg",
                        style: {
                          background: pickedCorrect ? '#ecfdf5' : '#fef2f2',
                          border: '1px solid ' + (pickedCorrect ? '#22c55e88' : '#ef444488')
                        }
                      },
                        h("div", { className: "text-[12px] font-bold mb-1", style: { color: pickedCorrect ? '#166534' : '#991b1b' } },
                          pickedCorrect
                            ? '\u2705 Correct - ' + (MS_TYPES.filter(function(x) { return x.id === v.correct; })[0]).label
                            : '\u274C The effect is ' + (MS_TYPES.filter(function(x) { return x.id === v.correct; })[0]).label + (msPick ? ' (you picked ' + (MS_TYPES.filter(function(x) { return x.id === msPick; })[0]).label + ')' : '')
                        ),
                        h("p", { className: "text-[11px] text-slate-700 leading-relaxed mb-2" }, v.why),
                        allDone
                          ? h("div", { className: "p-2 rounded bg-violet-100 border border-violet-300" },
                              h("div", { className: "text-[12px] font-bold text-violet-800 mb-1" }, t('stem.dna.all_10_vignettes_complete', '\uD83C\uDFC6 All 10 vignettes complete')),
                              h("div", { className: "text-[11px] text-slate-700 leading-relaxed" },
                                'Final: ', h('strong', null, msScore + ' / ' + MS_VIGNETTES.length + ' (' + Math.round((msScore / MS_VIGNETTES.length) * 100) + '%)'),
                                msScore === MS_VIGNETTES.length ? ' - every effect type correctly identified. Ready for AP Bio FRQ work.' :
                                msScore >= 8 ? ' - strong codon-effect reasoning. The most-confused pair is usually missense vs silent (3rd-position changes can go either way) and frameshift vs in-frame indel (count the bases mod 3).' :
                                msScore >= 6 ? ' - solid baseline. The mod-3 rule for indels and the wobble-rule for 3rd position are the two reflexes to build.' :
                                ' - these distinctions take practice. Re-read the codon table + the rationales on misses, then retake.'
                              ),
                              h("button", {
                                onClick: function() { upd('msIdx', -1); upd('msShown', []); upd('msScore', 0); upd('msRounds', 0); upd('msStreak', 0); },
                                className: "transition-colors mt-2 px-3 py-1.5 rounded bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500 active:scale-[0.97]"
                              }, t('stem.dna.restart', '\uD83D\uDD04 Restart'))
                            )
                          : h("button", {
                              onClick: startMs,
                              className: "transition-colors px-3 py-1.5 rounded bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500 active:scale-[0.97]"
                            }, t('stem.dna.next_vignette', '\u27A1\uFE0F Next vignette'))
                      )
                    );
                  })()
              )
            );
          })()
        ),

        // ═══════════════════════════════════════════
        // FORENSICS TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'forensics' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-forensics", "data-dna-workspace": "forensics" },
          h("div", { className: "bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-cyan-200 p-4 space-y-3" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\uD83D\uDD0D"),
              h("h4", { className: "text-sm font-bold text-cyan-800" }, t('stem.dna.dna_forensics_gel_electrophoresis', "DNA Forensics - Gel Electrophoresis")),
              h("span", { className: "px-2 py-0.5 bg-cyan-200 text-cyan-800 text-[11px] font-bold rounded-full" }, "CASE " + (forensicCase + 1) + "/" + FORENSIC_CASES.length)
            ),
            h("p", { className: "text-xs text-slate-600" },
              gradeText(
                'A DNA profile compares selected markers, a little like comparing a pattern of barcode lines. This activity uses simplified fragment bands; real laboratories use controls, multiple markers, and statistics.',
                'Restriction enzymes cut DNA at specific sequences, and gel electrophoresis separates fragments by size. The same bands are consistent with the same source in this simplified activity, but real conclusions require quality checks and statistical interpretation.',
                'RFLP compares fragment lengths after restriction digestion, while modern forensic profiling usually amplifies STR loci. Similar band positions support an association in this model; they do not by themselves prove identity or explain how DNA was deposited.',
                'RFLP and STR profiling are different methods. Modern forensic workflows amplify many STR loci and report statistical weight using population data, laboratory controls, and validated interpretation procedures. A random-match probability is not a universal constant and does not alone identify a person as the source.'
              )
            ),

            h("p", { className: "text-[11px] text-cyan-900 bg-cyan-100 border border-cyan-300 rounded-lg p-2" },
              "Model limit: these are clean, single-source teaching patterns. Real evidence may be partial, degraded, contaminated, or mixed, and analysts quantify the strength of support rather than declaring identity from bands alone."
            ),

            // Case selector
            h("div", { className: "flex gap-1 flex-wrap" },
              FORENSIC_CASES.map(function(c, idx) {
                return h("button", { type: "button", key: idx, 'aria-pressed': forensicCase === idx, onClick: function() { updMulti({ forensicCase: idx, forensicGelRun: false, forensicGuess: null, forensicResult: null }); },
                  className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (forensicCase === idx ? 'bg-cyan-700 text-white shadow-md' : 'transition-colors bg-white text-slate-600 hover:bg-cyan-50 border border-slate-400 active:scale-[0.97]')
                }, (idx + 1) + '. ' + c.name);
              })
            ),

            h("div", { className: "bg-white rounded-lg p-3 border" },
              h("p", { className: "text-xs font-bold text-slate-700" }, currentCase.name),
              h("p", { className: "text-[11px] text-slate-600 mt-1" }, currentCase.desc),
              h("p", { className: "text-[11px] text-cyan-600 mt-1" }, '\uD83E\uDDEC Restriction enzyme: ' + currentCase.enzyme)
            ),

            // Run gel button
            !forensicGelRun && h("button", { type: "button", onClick: function() { upd('forensicGelRun', true); addToast('\u26A1 Running gel electrophoresis...', 'success'); }, className: "px-4 py-2 text-sm font-bold bg-cyan-700 text-white rounded-xl hover:bg-cyan-700 shadow-md transition-all active:scale-[0.97]" }, t('stem.dna.run_gel_electrophoresis', '\u26A1 Run Gel Electrophoresis')),

            forensicGelRun && h("div", { className: "space-y-3" },
              h("canvas", { ref: _forensicCanvasRef, style: { width: '100%', height: 240 }, tabIndex: 0, role: "img", 'aria-label': t('stem.dna.gel_electrophoresis_results', 'Gel electrophoresis results') }),
              h("div", { className: "overflow-x-auto rounded-lg border border-cyan-100 bg-white" },
                h("table", { className: "w-full min-w-[420px] text-left text-[10px]" },
                  h("caption", { className: "sr-only" }, "DNA sample fragment sizes shown in the gel"),
                  h("thead", { className: "bg-cyan-50 text-cyan-900" },
                    h("tr", null,
                      h("th", { scope: "col", className: "px-3 py-2 font-black" }, "Lane"),
                      h("th", { scope: "col", className: "px-3 py-2 font-black" }, "Role"),
                      h("th", { scope: "col", className: "px-3 py-2 font-black" }, "Fragment sizes")
                    )
                  ),
                  h("tbody", null,
                    currentCase.samples.map(function(sample) {
                      return h("tr", { key: sample.label, className: "border-t border-cyan-100 text-slate-600" },
                        h("td", { className: "px-3 py-2 font-bold text-slate-800" }, sample.label),
                        h("td", { className: "px-3 py-2" }, sample.isRef ? "Reference" : "Comparison"),
                        h("td", { className: "px-3 py-2 font-mono" }, sample.fragments.join(', ') + " bp")
                      );
                    })
                  )
                )
              ),

              // Answer selection
              !forensicResult && h("div", { className: "space-y-2" },
                h("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Which sample matches the ' + currentCase.samples[0].label + '?'),
                h("div", { className: "flex gap-2 flex-wrap", role: "group", 'aria-label': "Choose the comparison sample" },
                  currentCase.samples.map(function(s, idx) {
                    if (s.isRef) return null;
                    return h("button", { type: "button", key: idx, 'aria-pressed': forensicGuess === idx, onClick: function() { upd('forensicGuess', idx); },
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (forensicGuess === idx ? 'bg-cyan-700 text-white shadow-md ring-2 ring-cyan-300' : 'transition-colors bg-white text-slate-600 hover:bg-cyan-50 border border-slate-400 active:scale-[0.97]')
                    }, s.label);
                  })
                ),
                h("button", { type: "button", onClick: checkForensicAnswer, disabled: forensicGuess == null, className: "px-4 py-2 text-sm font-bold rounded-xl transition-all " + (forensicGuess != null ? 'transition-colors bg-cyan-700 text-white hover:bg-cyan-800 shadow-md active:scale-[0.97]' : 'bg-slate-500 text-white cursor-not-allowed') }, t('stem.dna.submit_answer', '\u2713 Submit Answer'))
              ),

              // Result
              forensicResult && h("div", { className: "space-y-2" },
                h("div", { role: "status", className: "p-3 rounded-xl text-sm font-bold " + (forensicResult === 'correct' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-red-50 text-red-700 border-2 border-red-200') },
                  forensicResult === 'correct' ? '\u2705 Correct for this teaching dataset: the selected fragment pattern matches the reference. A real report would also quantify the statistical weight and consider other evidence.' : '\u274c Incorrect. Compare the band positions more carefully - matching samples have identical fragment sizes.',
                  h("button", { type: "button", onClick: function() {
                    var nextCase = (forensicCase + 1) % FORENSIC_CASES.length;
                    updMulti({ forensicCase: nextCase, forensicGelRun: false, forensicGuess: null, forensicResult: null, forensicAI: null });
                  }, className: "mt-2 px-3 py-1.5 text-xs font-bold bg-white text-slate-600 rounded-lg border block" }, t('stem.dna.next_case', '\u21BB Next Case'))
                ),
                // AI Forensics Analysis
                callGemini && h("div", null,
                  h("button", { onClick: function() {
                    if (d.forensicAILoading) return;
                    upd('forensicAILoading', true);
                    var gradeCtx = gradeText('kindergarten, very simple', '3rd-5th grade', '6th-8th grade, scientific terms', '9th-12th grade, advanced forensic science');
                    var caseData = currentCase;
                    var matchSample = caseData.samples[caseData.match];
                    var prompt = 'You are a forensic genetics teacher. Grade: ' + gradeCtx + '. Case: "' + caseData.name + '" - ' + caseData.desc + ' The restriction enzyme ' + caseData.enzyme + ' was used. The ' + caseData.samples[0].label + ' matched ' + matchSample.label + ' because they share identical fragment sizes: ' + matchSample.fragments.join(', ') + ' bp. Explain in 3-4 sentences why the bands match, what restriction enzymes do, and how gel electrophoresis separates DNA. Be educational and engaging.';
                    callGemini(prompt, true, false, 0.7).then(function(r) { updMulti({ forensicAI: typeof r === 'string' ? r : 'Analysis unavailable.', forensicAILoading: false }); }).catch(function() { updMulti({ forensicAI: 'AI unavailable.', forensicAILoading: false }); });
                  }, disabled: d.forensicAILoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.forensicAILoading ? 'bg-cyan-300 text-white cursor-wait' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-md') }, d.forensicAILoading ? '\u23F3 Analyzing...' : '\u2728 AI: Explain the Evidence'),
                  d.forensicAI && h("div", { className: "mt-2 p-3 bg-cyan-50 rounded-xl border border-cyan-200 text-xs text-cyan-900 leading-relaxed" },
                    h("span", { className: "text-[11px] font-bold text-cyan-600 uppercase tracking-wider block mb-1" }, t('stem.dna.forensic_analysis', '\uD83E\uDDE0 Forensic Analysis')),
                    d.forensicAI
                  )
                )
              )
            )
          )
        ),

        // ═══════════════════════════════════════════
        // CHALLENGE TAB (Enhanced)
        // ═══════════════════════════════════════════
        tab === 'challenge' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-challenge", "data-dna-workspace": "challenge" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4 space-y-4" },
            h("div", { className: "flex items-center justify-between flex-wrap gap-2" },
              h("h4", { className: "text-sm font-bold text-slate-700" }, t('stem.dna.dna_challenge', "\uD83C\uDFAF DNA Challenge")),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-full" }, "\u2B50 " + score + " pts"),
                (d.challengeStreak || 0) >= 2 && h("span", { className: "px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[11px] font-bold rounded-full shadow-sm animate-pulse" }, "\uD83D\uDD25 " + d.challengeStreak + " streak!")
              )
            ),

            // Tier selector
            h("div", { className: "flex gap-1" },
              [{ l: '\uD83C\uDF3F Easy', t: 0 }, { l: '\u26A1 Medium', t: 1 }, { l: '\uD83D\uDD25 Hard', t: 2 }].map(function(tier) {
                return h("button", { key: tier.t, onClick: function() { upd('challengeTier', tier.t); },
                  className: "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all " + (challengeTier === tier.t ? 'bg-violet-600 text-white shadow-md' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-violet-50 active:scale-[0.97]')
                }, tier.l);
              })
            ),

            !challengeQ ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl mb-2" }, "\uD83E\uDDEC"),
              h("p", { className: "text-xs text-slate-600 mb-3" }, t('stem.dna.test_your_genetics_knowledge', "Test your genetics knowledge!")),
              h("div", { className: "flex gap-2 justify-center flex-wrap" },
                h("button", { onClick: generateChallenge, className: "px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl shadow-lg transition-all hover:shadow-xl" }, t('stem.dna.start_challenge', "\uD83C\uDFAF Start Challenge")),
                callGemini && h("button", { onClick: function() {
                  if (d.aiChallengeLoading) return;
                  upd('aiChallengeLoading', true);
                  var gradeCtx = gradeText('kindergarten (ages 5-7), very simple', '3rd-5th grade', '6th-8th grade', '9th-12th grade AP Biology level');
                  var prompt = 'Generate a genetics/DNA quiz question for ' + gradeCtx + ' students. DNA: ' + dnaSeq.substring(0, 15) + '... Return ONLY valid JSON: {"question":"...","answer":"...","hint":"..."}. Topics: DNA structure, base pairing, replication, transcription, translation, mutations, codons, amino acids, genetic disorders. Answer should be 1-3 words.';
                  callGemini(prompt, true, false, 0.7).then(function(resp) {
                    try {
                      var clean = (typeof resp === 'string' ? resp : '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
                      var parsed = JSON.parse(clean);
                      if (parsed.question && parsed.answer) {
                        updMulti({ challengeQ: { type: 'ai', question: parsed.question, answer: parsed.answer, hint: parsed.hint || '', isAI: true }, challengeAnswer: '', challengeFeedback: '', aiChallengeLoading: false });
                      } else { throw new Error('bad'); }
                    } catch (e) {
                      addToast('\u26A0\uFE0F AI quiz failed, using static', 'error');
                      upd('aiChallengeLoading', false);
                      generateChallenge();
                    }
                  }).catch(function() { addToast('\u26A0\uFE0F AI unavailable', 'error'); upd('aiChallengeLoading', false); generateChallenge(); });
                }, disabled: d.aiChallengeLoading, className: "px-5 py-2.5 text-sm font-bold transition-all rounded-xl shadow-lg " + (d.aiChallengeLoading ? 'bg-purple-300 text-white cursor-wait' : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-xl') }, d.aiChallengeLoading ? '\u23F3 Generating...' : '\u2728 AI Challenge')
              )
            ) : h("div", { className: "space-y-3" },
              challengeQ.isAI && h("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full" }, t('stem.dna.ai_generated', "\uD83E\uDDE0 AI-GENERATED")),
              h("p", { className: "text-sm font-medium text-slate-700" }, challengeQ.question),
              h("input", { type: "text", value: challengeAnswer, onChange: function(e) { upd('challengeAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') checkChallenge(); }, placeholder: t('stem.dna.type_your_answer', "Type your answer..."), className: "w-full px-4 py-2 border border-slate-400 rounded-xl text-sm font-mono focus:border-violet-400", 'aria-label': t('stem.dna.answer', 'Answer') }),
              h("div", { className: "flex gap-2 flex-wrap" },
                h("button", { onClick: checkChallenge, className: "px-4 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all active:scale-[0.97]" }, t('stem.dna.check', "\u2713 Check")),
                h("button", { onClick: function() { updMulti({ challengeFeedback: '\uD83D\uDCA1 ' + (challengeQ.hint || 'No hint available') }); }, className: "px-4 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl" }, t('stem.dna.hint', "\uD83D\uDCA1 Hint")),
                h("button", { onClick: generateChallenge, className: "px-3 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl" }, t('stem.dna.next', "\u21BB Next")),
                callGemini && h("button", { onClick: function() {
                  upd('aiChallengeLoading', true);
                  var gradeCtx = gradeText('kindergarten', '3rd-5th grade', '6th-8th grade', '9th-12th grade AP Bio');
                  var prompt = 'Generate a genetics quiz question for ' + gradeCtx + '. DNA: ' + dnaSeq.substring(0, 12) + '. Return ONLY JSON: {"question":"...","answer":"...","hint":"..."}. Answer 1-3 words.';
                  callGemini(prompt, true, false, 0.7).then(function(r) {
                    try { var p = JSON.parse((typeof r === 'string' ? r : '').replace(/```json\s*/gi, '').replace(/```/g, '').trim()); updMulti({ challengeQ: { type: 'ai', question: p.question, answer: p.answer, hint: p.hint || '', isAI: true }, challengeAnswer: '', challengeFeedback: '', aiChallengeLoading: false }); }
                    catch (e) { addToast('\u26A0\uFE0F Parse error', 'error'); upd('aiChallengeLoading', false); generateChallenge(); }
                  }).catch(function() { upd('aiChallengeLoading', false); generateChallenge(); });
                }, disabled: d.aiChallengeLoading, className: "px-3 py-2 text-sm font-bold rounded-xl ml-auto transition-all " + (d.aiChallengeLoading ? 'bg-purple-200 text-purple-400 cursor-wait' : 'transition-colors bg-purple-50 text-purple-600 hover:bg-purple-100 active:scale-[0.97]') }, d.aiChallengeLoading ? '\u23F3...' : '\u2728 AI Next')
              ),
              challengeFeedback && h("p", { className: "text-sm font-bold p-2 rounded-lg " + (challengeFeedback[0] === '\u2705' ? "bg-green-50 text-green-700" : challengeFeedback[0] === '\u274c' ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"), role: "alert" }, challengeFeedback)
            )
          ),
          h("details", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
            h("summary", { className: "transition-colors px-4 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50 active:scale-[0.97]" }, t('stem.dna.codon_reference_table', "\uD83D\uDCD6 Codon Reference Table")),
            h("div", { className: "p-3 grid grid-cols-4 gap-1 text-[11px] font-mono max-h-60 overflow-y-auto" },
              Object.keys(CODON_TABLE).sort().map(function(c2) { var aa2 = CODON_TABLE[c2]; var pr2 = AA_PROPS[aa2] || { color: '#888' }; return h("div", { key: c2, className: "flex items-center gap-1 px-1.5 py-0.5 rounded", style: { background: pr2.color + '15' } }, h("span", { style: { color: pr2.color }, className: "font-bold" }, c2), h("span", { className: "text-slate-700" }, "\u2192 " + aa2)); })
            )
          )
        ),

        // ═══════════════════════════════════════════
        // BATTLE TAB (NEW - Gene Defense)
        // ═══════════════════════════════════════════
        tab === 'battle' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-battle", "data-dna-workspace": "battle" },
          h("div", { className: "bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 p-4 space-y-4" },
            h("div", { className: "flex items-center gap-2 mb-1" },
              h("span", { className: "text-lg" }, "\u2694\uFE0F"),
              h("h4", { className: "text-sm font-bold text-red-800" }, t('stem.dna.gene_defense_battle', "Gene Defense Battle")),
              !battleDone && battleOrder.length > 0 && h("span", { className: "px-2 py-0.5 bg-red-200 text-red-800 text-[11px] font-bold rounded-full animate-pulse" }, "Round " + (battleRound + 1) + "/" + (battleUseAI ? 10 : BATTLE_QS.length) + (battleUseAI ? ' \uD83E\uDDE0' : ''))
            ),
            h("p", { className: "text-xs text-slate-600" }, gradeText(
              'A virus is attacking the cell! Answer genetics questions to fight it off!',
              'Defend the cell against an invading virus! Correct answers deal damage, wrong answers let the virus strike back.',
              'Use your genetics knowledge to defend against a viral pathogen. Each correct answer activates your immune response.',
              'Defend the cell against viral infection. Demonstrate mastery of molecular biology to mount an effective immune response.'
            )),

            // HP bars
            (battleOrder.length > 0 && !battleDone) && h("div", { className: "space-y-2" },
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-emerald-600 w-20" }, t('stem.dna.you', "\uD83D\uDEE1\uFE0F You")),
                h("div", { className: "flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden" },
                  h("div", { className: "bg-gradient-to-r from-emerald-500 to-green-400 h-4 rounded-full transition-all duration-500", style: { width: battlePlayerHP + '%' } }),
                  h("span", { className: "absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow" }, battlePlayerHP + ' HP')
                )
              ),
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-xs font-bold text-red-600 w-20" }, t('stem.dna.virus', "\uD83E\uDDA0 Virus")),
                h("div", { className: "flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden" },
                  h("div", { className: "bg-gradient-to-r from-red-500 to-orange-400 h-4 rounded-full transition-all duration-500", style: { width: battleEnemyHP + '%' } }),
                  h("span", { className: "absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow" }, battleEnemyHP + ' HP')
                )
              )
            ),

            // Start / question / done
            battleOrder.length === 0 ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl mb-2" }, "\u2694\uFE0F"),
              h("div", { className: "flex gap-2 justify-center flex-wrap" },
                h("button", { onClick: function() { startBattle(false); }, className: "px-6 py-3 text-sm font-bold bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all" }, t('stem.dna.start_battle', "\u2694\uFE0F Start Battle")),
                callGemini && h("button", { onClick: function() { startBattle(true); }, className: "px-6 py-3 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all" }, t('stem.dna.ai_battle', "\u2728 AI Battle"))
              )
            ) : battleDone ? h("div", { className: "text-center py-6 space-y-3" },
              h("div", { className: "text-4xl" }, battleWon ? '\uD83C\uDFC6' : '\uD83D\uDC80'),
              h("p", { className: "text-lg font-bold  tracking-tight" + (battleWon ? 'text-emerald-700' : 'text-red-700') }, battleWon ? 'Victory! Cell Defended!' : 'Defeated! Virus Won!'),
              h("p", { className: "text-xs text-slate-600" }, 'Your HP: ' + battlePlayerHP + ' | Virus HP: ' + battleEnemyHP),
              battleFeedback && h("p", { className: "text-xs font-bold mt-1 " + (battleFeedback[0] === '\u2705' ? 'text-emerald-600' : 'text-red-600') }, battleFeedback),
              h("div", { className: "flex gap-2 justify-center mt-2" },
                h("button", { onClick: function() { startBattle(false); }, className: "px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-[0.97]" }, t('stem.dna.play_again', "\u21BA Play Again")),
                callGemini && h("button", { onClick: function() { startBattle(true); }, className: "px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all active:scale-[0.97]" }, t('stem.dna.ai_rematch', "\u2728 AI Rematch"))
              )
            ) : h("div", { className: "space-y-3" },
              // Current question (static or AI)
              (function() {
                if (battleUseAI && d.battleAILoading) {
                  return h("div", { className: "text-center py-4" },
                    h("div", { className: "text-2xl animate-pulse mb-2" }, "\uD83E\uDDE0"),
                    h("p", { className: "text-xs text-purple-600 font-bold" }, t('stem.dna.ai_generating_question', "AI generating question..."))
                  );
                }
                var q = getCurrentBattleQ();
                if (!q) return null;
                return h("div", { className: "space-y-3" },
                  battleUseAI && h("span", { className: "px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full" }, t('stem.dna.ai_generated_2', "\uD83E\uDDE0 AI-GENERATED")),
                  h("p", { className: "text-sm font-medium text-slate-700" }, q.q),
                  h("input", { type: "text", value: battleAnswer, onChange: function(e) { upd('battleAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') battleAttack(); }, placeholder: t('stem.dna.type_your_answer_2', "Type your answer..."), className: "w-full px-4 py-2 border border-slate-400 rounded-xl text-sm font-mono focus:border-red-400", 'aria-label': t('stem.dna.battle_answer', 'Battle answer') }),
                  h("div", { className: "flex gap-2" },
                    h("button", { onClick: battleAttack, className: "px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-[0.97]" }, t('stem.dna.attack', "\u2694\uFE0F Attack!")),
                    h("button", { onClick: function() { updMulti({ battleFeedback: '\uD83D\uDCA1 ' + (q.h || 'No hint') }); }, className: "px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl" }, t('stem.dna.hint_2', "\uD83D\uDCA1 Hint"))
                  ),
                  battleFeedback && h("p", { className: "text-sm font-bold p-2 rounded-lg " + (battleFeedback[0] === '\u2705' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700") }, battleFeedback)
                );
              })()
            )
          )
        ),

        // ═══════════════════════════════════════════
        // LEARN TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'learn' && h("div", { className: "space-y-4", id: "dna-workspace", role: "tabpanel", 'aria-labelledby': "dna-tab-learn", "data-dna-workspace": "learn" },
          h("div", { className: "bg-white rounded-xl border border-slate-400 p-4" },
            h("h4", { className: "text-sm font-bold text-slate-700 mb-3" }, t('stem.dna.learn_genetics_concepts', "\uD83D\uDCDA Learn - Genetics Concepts")),
            h("p", { className: "text-xs text-slate-600 mb-4" }, "Explore key topics adapted to your grade level (" + gradeBand + ").")
          ),
          LEARN_TOPICS.map(function(topic) {
            var content = topic.content[gradeBand] || topic.content['3-5'];
            return h("div", { key: topic.title, className: "bg-white rounded-xl border border-slate-400 p-4 space-y-3" },
              h("div", { className: "flex items-center gap-2" },
                h("span", { className: "text-lg" }, topic.icon),
                h("h5", { className: "text-sm font-bold text-slate-700" }, topic.title)
              ),
              h("p", { className: "text-xs text-slate-600 leading-relaxed" }, content),
              h("div", { className: "flex gap-2 pt-2 border-t border-slate-100" },
                h("button", { onClick: function() { updMulti({ tab: topic.tryIt }); announceToSR('Switched to ' + topic.tryIt); }, className: "px-3 py-1.5 text-[11px] font-bold bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-all active:scale-[0.97]" }, t('stem.dna.try_it', '\uD83D\uDD2C Try It')),
                callTTS && h("button", { onClick: function() { callTTS(content); }, className: "px-3 py-1.5 text-[11px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all active:scale-[0.97]" }, t('stem.dna.read_aloud', '\uD83D\uDD0A Read Aloud'))
              )
            );
          })
        ),

        // SR status
        h("div", { className: "sr-only", role: "status", 'aria-live': "polite" }, "DNA Lab: " + tab + " view")
      );

      // ═══════════════════════════════════════════════════════════════════
      // DNA EXPANSION SECTIONS — interactive genetics reference (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      var d2 = (labToolData && labToolData.dna) || {};
      var expSection = d2.expSection || null;
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.dna) || {};
          return Object.assign({}, prev, { dna: Object.assign({}, prior, patch) });
        });
      }

      // ── Reference data ──
      var BASE_PAIRS = [
        { base: 'Adenine (A)', cat: 'Purine (2-ring)', pairs: 'Thymine (T) in DNA · Uracil (U) in RNA', bonds: '2 hydrogen bonds', icon: 'A', color: '#ef4444', notes: 'One of the four DNA bases. Paired with T via 2 H-bonds — weaker than G-C.' },
        { base: 'Thymine (T)', cat: 'Pyrimidine (1-ring)', pairs: 'Adenine (A)', bonds: '2 hydrogen bonds', icon: 'T', color: '#3b82f6', notes: 'DNA only — replaced by uracil in RNA. Methyl group at C5 distinguishes it from U.' },
        { base: 'Guanine (G)', cat: 'Purine (2-ring)', pairs: 'Cytosine (C)', bonds: '3 hydrogen bonds', icon: 'G', color: '#22c55e', notes: 'Stronger pairing than A-T due to 3 H-bonds. G-C rich regions are more thermally stable.' },
        { base: 'Cytosine (C)', cat: 'Pyrimidine (1-ring)', pairs: 'Guanine (G)', bonds: '3 hydrogen bonds', icon: 'C', color: '#f59e0b', notes: 'Pyrimidine. Subject to deamination → uracil (a major source of DNA damage).' },
        { base: 'Uracil (U)', cat: 'Pyrimidine (1-ring)', pairs: 'Adenine (A) in RNA', bonds: '2 hydrogen bonds', icon: 'U', color: '#a855f7', notes: 'RNA-only. Cheaper for cell to make than T; T more stable for genetic-info storage.' }
      ];

      var GENETIC_CODE = [
        { codon: 'AUG', aa: 'Met', name: t('stem.dna.methionine', 'Methionine'), note: t('stem.dna.start_codon', 'START codon') },
        { codon: 'UAA', aa: '—', name: 'STOP', note: 'ochre' },
        { codon: 'UAG', aa: '—', name: 'STOP', note: 'amber' },
        { codon: 'UGA', aa: '—', name: 'STOP', note: t('stem.dna.opal_sometimes_selenocysteine', 'opal (sometimes selenocysteine)') },
        { codon: 'UUU/UUC', aa: 'Phe', name: t('stem.dna.phenylalanine', 'Phenylalanine'), note: t('stem.dna.aromatic_hydrophobic', 'Aromatic, hydrophobic') },
        { codon: 'UUA/UUG/CUx', aa: 'Leu', name: t('stem.dna.leucine', 'Leucine'), note: t('stem.dna.6_codons_branched_hydrophobic', '6 codons. Branched, hydrophobic.') },
        { codon: 'AUU/AUC/AUA', aa: 'Ile', name: t('stem.dna.isoleucine', 'Isoleucine'), note: t('stem.dna.branched_hydrophobic', 'Branched, hydrophobic') },
        { codon: 'GUx', aa: 'Val', name: t('stem.dna.valine', 'Valine'), note: t('stem.dna.branched_hydrophobic_2', 'Branched, hydrophobic') },
        { codon: 'UCx/AGU/AGC', aa: 'Ser', name: t('stem.dna.serine', 'Serine'), note: t('stem.dna.polar_hydroxyl_side_chain_often_phosph', 'Polar, hydroxyl side chain. Often phosphorylated.') },
        { codon: 'ACx', aa: 'Thr', name: t('stem.dna.threonine', 'Threonine'), note: t('stem.dna.polar_hydroxyl_often_phosphorylated', 'Polar, hydroxyl. Often phosphorylated.') },
        { codon: 'UAU/UAC', aa: 'Tyr', name: t('stem.dna.tyrosine', 'Tyrosine'), note: t('stem.dna.aromatic_polar', 'Aromatic, polar') },
        { codon: 'UGU/UGC', aa: 'Cys', name: t('stem.dna.cysteine', 'Cysteine'), note: t('stem.dna.forms_disulfide_bonds_s_s_critical_for', 'Forms disulfide bonds (S-S). Critical for protein folding.') },
        { codon: 'UGG', aa: 'Trp', name: t('stem.dna.tryptophan', 'Tryptophan'), note: t('stem.dna.aromatic_hydrophobic_largest_amino_aci', 'Aromatic, hydrophobic. Largest amino acid.') },
        { codon: 'CCx', aa: 'Pro', name: t('stem.dna.proline', 'Proline'), note: t('stem.dna.rigid_ring_disrupts_helices', 'Rigid (ring). Disrupts α-helices.') },
        { codon: 'CAU/CAC', aa: 'His', name: t('stem.dna.histidine', 'Histidine'), note: t('stem.dna.basic_side_chain_active_site_of_many_e', 'Basic side chain. Active site of many enzymes (pKa near 7).') },
        { codon: 'CAA/CAG', aa: 'Gln', name: t('stem.dna.glutamine', 'Glutamine'), note: t('stem.dna.polar_amide_often_surface_exposed', 'Polar amide. Often surface-exposed.') },
        { codon: 'AAU/AAC', aa: 'Asn', name: t('stem.dna.asparagine', 'Asparagine'), note: t('stem.dna.polar_amide_common_n_glycosylation_sit', 'Polar amide. Common N-glycosylation site.') },
        { codon: 'AAA/AAG', aa: 'Lys', name: t('stem.dna.lysine', 'Lysine'), note: t('stem.dna.basic_long_side_chain_often_acetylated', 'Basic, long side chain. Often acetylated/methylated.') },
        { codon: 'CGx/AGA/AGG', aa: 'Arg', name: t('stem.dna.arginine', 'Arginine'), note: t('stem.dna.basic_guanidinium_group_6_codons_most_', 'Basic, guanidinium group. 6 codons — most degenerate.') },
        { codon: 'GAU/GAC', aa: 'Asp', name: t('stem.dna.aspartate', 'Aspartate'), note: t('stem.dna.acidic_often_active_site_nucleophile', 'Acidic. Often active-site nucleophile.') },
        { codon: 'GAA/GAG', aa: 'Glu', name: t('stem.dna.glutamate', 'Glutamate'), note: t('stem.dna.acidic_most_abundant_in_proteins', 'Acidic. Most abundant in proteins.') },
        { codon: 'GGx', aa: 'Gly', name: t('stem.dna.glycine', 'Glycine'), note: t('stem.dna.smallest_no_side_chain_high_flexibilit', 'Smallest. No side chain — high flexibility.') },
        { codon: 'GCx', aa: 'Ala', name: t('stem.dna.alanine', 'Alanine'), note: t('stem.dna.small_hydrophobic_generic_residue', 'Small, hydrophobic. "Generic" residue.') }
      ];

      var DNA_REPLICATION_STEPS = [
        { step: 1, name: t('stem.dna.initiation', 'Initiation'), enzymes: 'Helicase, SSBs, Topoisomerase', detail: t('stem.dna.helicase_unwinds_the_double_helix_at_o', 'Helicase unwinds the double helix at origins of replication. Single-strand binding proteins prevent re-annealing. Topoisomerase relieves the supercoiling tension ahead of the fork.') },
        { step: 2, name: t('stem.dna.primer_synthesis', 'Primer synthesis'), enzymes: 'Primase (RNA polymerase)', detail: t('stem.dna.primase_lays_down_short_10_nt_rna_prim', 'Primase lays down short (~10 nt) RNA primers — DNA polymerase needs a 3\'-OH to extend from, so it cannot start a new strand alone.') },
        { step: 3, name: t('stem.dna.leading_strand', 'Leading strand'), enzymes: 'DNA polymerase III (prokaryotes) / Pol δ (eukaryotes)', detail: t('stem.dna.synthesized_continuously_5_3_in_the_sa', 'Synthesized continuously 5\'→3\' in the same direction as the replication fork moves. One primer per origin.') },
        { step: 4, name: t('stem.dna.lagging_strand_okazaki_fragments', 'Lagging strand (Okazaki fragments)'), enzymes: 'DNA polymerase III / Pol δ + Pol α', detail: t('stem.dna.synthesized_in_short_100_1000_nt_fragm', 'Synthesized in short 100–1000 nt fragments (Okazaki fragments) because polymerase can only extend 5\'→3\'. Each fragment needs its own primer.') },
        { step: 5, name: t('stem.dna.primer_removal_gap_filling', 'Primer removal + gap filling'), enzymes: 'DNA polymerase I (prokaryotes) / RNase H + Pol δ (eukaryotes)', detail: t('stem.dna.rna_primers_are_excised_and_replaced_w', 'RNA primers are excised and replaced with DNA nucleotides.') },
        { step: 6, name: t('stem.dna.ligation', 'Ligation'), enzymes: 'DNA ligase', detail: t('stem.dna.joins_okazaki_fragments_by_forming_the', 'Joins Okazaki fragments by forming the final phosphodiester bond.') },
        { step: 7, name: t('stem.dna.proofreading', 'Proofreading'), enzymes: 'DNA Pol III 3\'→5\' exonuclease', detail: t('stem.dna.polymerase_checks_each_base_mismatches', 'Polymerase checks each base; mismatches removed and replaced. Lowers error rate from ~10⁻⁵ to ~10⁻⁷.') },
        { step: 8, name: t('stem.dna.mismatch_repair', 'Mismatch repair'), enzymes: 'MutS, MutL, MutH (prokaryotes); MSH, MLH (eukaryotes)', detail: t('stem.dna.catches_the_few_mismatches_that_escape', 'Catches the few mismatches that escape proofreading. Final error rate: ~10⁻¹⁰ per base pair.') }
      ];

      var TRANSCRIPTION_STEPS = [
        { step: 1, name: t('stem.dna.initiation_2', 'Initiation'), detail: t('stem.dna.rna_polymerase_binds_the_promoter_e_g_', 'RNA polymerase binds the promoter (e.g., TATA box ~25 bp upstream of transcription start). Helps melt the DNA double helix.') },
        { step: 2, name: t('stem.dna.elongation', 'Elongation'), detail: t('stem.dna.polymerase_reads_template_strand_3_5_s', 'Polymerase reads template strand 3\'→5\', synthesizing mRNA 5\'→3\'. Adds ~30 nucleotides per second in bacteria; ~10-50 in eukaryotes.') },
        { step: 3, name: t('stem.dna.termination', 'Termination'), detail: t('stem.dna.bacteria_rho_dependent_or_intrinsic_te', 'Bacteria: rho-dependent or intrinsic termination (hairpin loop). Eukaryotes: cleavage and polyadenylation signals.') },
        { step: 4, name: t('stem.dna.5_capping_eukaryotes', '5\' capping (eukaryotes)'), detail: t('stem.dna.7_methylguanosine_cap_added_to_5_end_h', '7-methylguanosine cap added to 5\' end. Helps ribosome recognize mRNA + protects from degradation.') },
        { step: 5, name: t('stem.dna.splicing_eukaryotes', 'Splicing (eukaryotes)'), detail: t('stem.dna.introns_removed_exons_joined_by_the_sp', 'Introns removed, exons joined by the spliceosome. Alternative splicing → multiple proteins from one gene.') },
        { step: 6, name: t('stem.dna.polyadenylation_eukaryotes', 'Polyadenylation (eukaryotes)'), detail: t('stem.dna.100_250_adenine_nucleotides_added_to_3', '~100-250 adenine nucleotides added to 3\' end. Stabilizes mRNA + signals export.') },
        { step: 7, name: t('stem.dna.nuclear_export_eukaryotes', 'Nuclear export (eukaryotes)'), detail: t('stem.dna.mature_mrna_exits_through_nuclear_pore', 'Mature mRNA exits through nuclear pore complexes to the cytoplasm.') }
      ];

      var TRANSLATION_STEPS = [
        { step: 1, name: t('stem.dna.initiation_3', 'Initiation'), detail: t('stem.dna.small_ribosomal_subunit_binds_mrna_ini', 'Small ribosomal subunit binds mRNA. Initiator tRNA (carrying Met) binds AUG start codon. Large subunit joins.') },
        { step: 2, name: t('stem.dna.elongation_2', 'Elongation'), detail: t('stem.dna.each_cycle_aminoacyl_trna_enters_a_sit', 'Each cycle: aminoacyl-tRNA enters A site → peptide bond forms (catalyzed by 23S rRNA, a ribozyme) → ribosome translocates one codon → tRNA shifts A→P→E.') },
        { step: 3, name: t('stem.dna.termination_2', 'Termination'), detail: t('stem.dna.stop_codon_uaa_uag_uga_recognized_by_r', 'Stop codon (UAA/UAG/UGA) recognized by release factors. Peptide released, ribosome dissociates.') },
        { step: 4, name: t('stem.dna.folding_modification', 'Folding + modification'), detail: t('stem.dna.chaperones_hsp70_groel_help_proteins_f', 'Chaperones (Hsp70, GroEL) help proteins fold correctly. Post-translational modifications: phosphorylation, glycosylation, cleavage, disulfide bonds.') }
      ];

      var MUTATION_TYPES = [
        { type: 'Substitution (point)', subtype: 'Silent', desc: t('stem.dna.codon_changes_but_amino_acid_is_the_sa', 'Codon changes but amino acid is the same (genetic code redundancy). No effect.') },
        { type: 'Substitution (point)', subtype: 'Missense', desc: t('stem.dna.codon_changes_different_amino_acid_eff', 'Codon changes → different amino acid. Effect ranges from none (conservative substitution) to severe (sickle cell: Glu→Val).') },
        { type: 'Substitution (point)', subtype: 'Nonsense', desc: t('stem.dna.codon_changes_stop_codon_truncated_pro', 'Codon changes → STOP codon. Truncated protein, usually non-functional.') },
        { type: 'Insertion', subtype: 'Frameshift (if not ÷3)', desc: t('stem.dna.adds_nucleotide_s_if_not_a_multiple_of', 'Adds nucleotide(s). If not a multiple of 3, shifts reading frame → all downstream codons changed. Usually severe.') },
        { type: 'Deletion', subtype: 'Frameshift (if not ÷3)', desc: t('stem.dna.removes_nucleotide_s_same_frameshift_c', 'Removes nucleotide(s). Same frameshift consequence as insertion.') },
        { type: 'Duplication', subtype: 'Gene/chromosome', desc: t('stem.dna.extra_copies_of_a_gene_or_region_can_l', 'Extra copies of a gene or region. Can lead to dosage effects (Down syndrome = extra chrom 21).') },
        { type: 'Inversion', subtype: 'Chromosomal', desc: t('stem.dna.segment_of_chromosome_flipped_may_disr', 'Segment of chromosome flipped. May disrupt genes at breakpoints.') },
        { type: 'Translocation', subtype: 'Chromosomal', desc: t('stem.dna.segment_moves_to_a_different_chromosom', 'Segment moves to a different chromosome. Famous: Philadelphia chromosome (CML; BCR-ABL fusion).') },
        { type: 'Repeat expansion', subtype: 'Trinucleotide repeat', desc: t('stem.dna.repeating_unit_e_g_cag_expands_across_', 'Repeating unit (e.g., CAG) expands across generations. Huntington\'s (CAG repeats in HTT), fragile X (CGG in FMR1), myotonic dystrophy.') }
      ];

      var CHROMOSOMES = [
        { name: t('stem.dna.human_autosomes', 'Human autosomes'), count: '22 pairs', detail: t('stem.dna.pairs_1_22_numbered_roughly_by_size_wi', 'Pairs 1-22 (numbered roughly by size, with exceptions: chr 21 is smaller than chr 22).') },
        { name: t('stem.dna.sex_chromosomes', 'Sex chromosomes'), count: '1 pair', detail: t('stem.dna.xx_female_or_xy_male_y_is_much_smaller', 'XX (female) or XY (male). Y is much smaller, carries few genes (~70) vs X (~800).') },
        { name: t('stem.dna.total_human_chromosomes', 'Total human chromosomes'), count: '46', detail: t('stem.dna.23_pairs_diploid_in_somatic_cells_game', '23 pairs (diploid in somatic cells). Gametes are haploid (23 chromosomes, no pairs).') },
        { name: t('stem.dna.total_human_genes', 'Total human genes'), count: '~20,000', detail: t('stem.dna.surprisingly_few_many_genes_produce_mu', 'Surprisingly few — many genes produce multiple proteins via alternative splicing. Much of the genome is regulatory or non-coding.') },
        { name: t('stem.dna.total_base_pairs_haploid', 'Total base pairs (haploid)'), count: '~3.2 billion', detail: t('stem.dna.if_stretched_out_1_8_m_of_dna_per_cell', 'If stretched out, ~1.8 m of DNA per cell. Packed into a nucleus ~10 µm across via histones + supercoiling.') },
        { name: t('stem.dna.mitochondrial_dna', 'Mitochondrial DNA'), count: '16,569 bp (circular)', detail: t('stem.dna.maternally_inherited_codes_for_37_gene', 'Maternally inherited. Codes for 37 genes (13 proteins, 22 tRNAs, 2 rRNAs). Multiple copies per mitochondrion.') }
      ];

      var DNA_VS_RNA = [
        { feature: 'Sugar', dna: 'Deoxyribose (no -OH at 2\')', rna: 'Ribose (-OH at 2\')' },
        { feature: 'Bases', dna: 'A, T, G, C', rna: 'A, U, G, C (uracil replaces thymine)' },
        { feature: 'Strands', dna: 'Double-stranded helix', rna: 'Usually single-stranded; can fold into 3D structures' },
        { feature: 'Stability', dna: 'Very stable; long-term info storage', rna: 'Less stable (the 2\'-OH makes it susceptible to hydrolysis)' },
        { feature: 'Length', dna: 'Very long (chromosomes)', rna: 'Short to medium; mRNA up to ~kb, rRNA few kb' },
        { feature: 'Location', dna: 'Mostly nucleus (eukaryotes) + mitochondria', rna: 'Nucleus, cytoplasm, ribosomes' },
        { feature: 'Function', dna: 'Genetic blueprint', rna: 'mRNA (messenger), tRNA (transfer), rRNA (ribosomal), regulatory (miRNA, lncRNA)' }
      ];

      var BIOTECH_TOOLS = [
        { name: t('stem.dna.pcr_polymerase_chain_reaction', 'PCR (Polymerase Chain Reaction)'), invented: '1983 (Kary Mullis)', desc: t('stem.dna.amplifies_a_specific_dna_segment_by_2_', 'Amplifies a specific DNA segment by 2ⁿ (n cycles). Uses heat-stable Taq polymerase. Foundation of modern molecular biology.') },
        { name: t('stem.dna.sanger_sequencing', 'Sanger sequencing'), invented: '1977 (Frederick Sanger)', desc: t('stem.dna.reads_dna_sequence_using_chain_termina', 'Reads DNA sequence using chain-terminating dideoxynucleotides. Read length ~800-1000 bp. Now largely replaced by next-gen sequencing.') },
        { name: t('stem.dna.next_gen_sequencing_ngs', 'Next-gen sequencing (NGS)'), invented: '2005+ (multiple)', desc: t('stem.dna.massively_parallel_sequences_millions_', 'Massively parallel — sequences millions of fragments simultaneously. Illumina dominates. ~100-300 bp reads, billions per run.') },
        { name: 'CRISPR-Cas9', invented: '2012 (Doudna, Charpentier, Zhang)', desc: t('stem.dna.programmable_gene_editing_guide_rna_ta', 'Programmable gene editing. Guide RNA targets Cas9 nuclease to specific DNA. Cuts allow gene knockout or HDR-mediated insertion. Nobel 2020.') },
        { name: t('stem.dna.crispr_base_editing', 'CRISPR base editing'), invented: '2016 (Liu lab)', desc: t('stem.dna.edits_a_single_base_without_double_str', 'Edits a single base without double-strand break. Lower off-target effects than Cas9.') },
        { name: t('stem.dna.restriction_enzymes', 'Restriction enzymes'), invented: '1970s (Smith, Nathans, Arber)', desc: t('stem.dna.bacterial_proteins_that_cut_dna_at_spe', 'Bacterial proteins that cut DNA at specific 4-8 bp sequences. Enabled recombinant DNA technology. Nobel 1978.') },
        { name: t('stem.dna.dna_ligase', 'DNA ligase'), invented: '1967', desc: t('stem.dna.joins_dna_fragments_via_phosphodiester', 'Joins DNA fragments via phosphodiester bonds. T4 DNA ligase is the workhorse for cloning.') },
        { name: t('stem.dna.gel_electrophoresis', 'Gel electrophoresis'), invented: '1960s', desc: t('stem.dna.separates_dna_fragments_by_size_in_an_', 'Separates DNA fragments by size in an electric field. Smaller fragments migrate faster through gel matrix.') },
        { name: t('stem.dna.microarrays', 'Microarrays'), invented: '1990s', desc: t('stem.dna.thousands_of_dna_probes_on_a_chip_meas', 'Thousands of DNA probes on a chip. Measure gene expression or detect SNPs in parallel.') },
        { name: t('stem.dna.single_cell_rna_seq', 'Single-cell RNA-seq'), invented: '2009+', desc: t('stem.dna.sequences_mrna_from_individual_cells_r', 'Sequences mRNA from individual cells. Reveals cell-type heterogeneity that bulk RNA-seq misses.') },
        { name: t('stem.dna.cryo_em_for_nucleic_acids', 'Cryo-EM for nucleic acids'), invented: '2010s+ (revolution)', desc: t('stem.dna.near_atomic_structures_of_rna_dna_comp', 'Near-atomic structures of RNA/DNA complexes without crystallization. Particularly powerful for ribosomes, spliceosomes, replisomes.') },
        { name: t('stem.dna.long_read_sequencing_pacbio_nanopore', 'Long-read sequencing (PacBio, Nanopore)'), invented: '2010s', desc: t('stem.dna.read_lengths_up_to_100kb_vs_illumina_s', 'Read lengths up to 100kb+ (vs Illumina\'s ~300bp). Better for structural variants, repeats, full-length transcripts.') }
      ];

      var DISEASES_AND_GENES = [
        { disease: 'Sickle cell anemia', gene: 'HBB (β-globin)', mutation: 'Glu6Val (GAG→GTG)', inheritance: 'Autosomal recessive', notes: 'Heterozygotes have malaria resistance — balanced polymorphism in malaria-endemic regions.' },
        { disease: 'Cystic fibrosis', gene: 'CFTR (chloride channel)', mutation: 'ΔF508 (Phe508 deletion, most common); 1900+ known mutations', inheritance: 'Autosomal recessive', notes: 'Carrier frequency ~1/25 in Europeans. Thick mucus in lungs + pancreas + gut.' },
        { disease: 'Huntington disease', gene: 'HTT', mutation: 'CAG repeat expansion (≥36 repeats)', inheritance: 'Autosomal dominant', notes: 'Anticipation: repeats expand across generations, earlier onset in offspring.' },
        { disease: 'BRCA-related breast/ovarian cancer', gene: 'BRCA1, BRCA2', mutation: '1000+ pathogenic variants', inheritance: 'Autosomal dominant (high penetrance)', notes: '60-85% lifetime breast cancer risk if pathogenic variant present. PARP inhibitors therapeutic.' },
        { disease: 'Phenylketonuria (PKU)', gene: 'PAH', mutation: '500+ variants', inheritance: 'Autosomal recessive', notes: 'Newborn screening (Guthrie test) — early dietary management (low Phe) prevents intellectual disability.' },
        { disease: 'Down syndrome', gene: 'Whole chr 21 (trisomy)', mutation: 'Three copies of chr 21', inheritance: 'Sporadic (non-disjunction)', notes: 'Most common autosomal aneuploidy. Risk increases with maternal age.' },
        { disease: 'Tay-Sachs disease', gene: 'HEXA', mutation: 'Various (1278insTATC common in Ashkenazi)', inheritance: 'Autosomal recessive', notes: 'Founder effect in Ashkenazi Jewish (~1/27 carriers) and French Canadian populations.' },
        { disease: 'Hemophilia A', gene: 'F8 (factor VIII)', mutation: 'Inversions, deletions, points', inheritance: 'X-linked recessive', notes: 'Mostly affects males. Famous in European royal families via Queen Victoria.' },
        { disease: 'Duchenne muscular dystrophy', gene: 'DMD (dystrophin)', mutation: 'Large deletions common', inheritance: 'X-linked recessive', notes: 'Largest gene known (~2.4 Mb, ~99% introns). Boys typically wheelchair-bound by adolescence.' },
        { disease: 'Lactose intolerance (adults)', gene: 'LCT (lactase)', mutation: 'Regulatory SNP (rs4988235) keeps gene "on" in adults', inheritance: 'Variable by population', notes: 'Persistence (continuing to make lactase as adult) is the derived trait — appeared with dairy-farming cultures.' }
      ];

      var EVOLUTION_CONCEPTS = [
        { concept: 'Natural selection', detail: t('stem.dna.differential_reproduction_based_on_her', 'Differential reproduction based on heritable variation. Genes that improve survival/reproduction become more common over generations.') },
        { concept: 'Mutation', detail: t('stem.dna.random_source_of_new_genetic_variation', 'Random source of new genetic variation. Most are neutral or harmful; rarely beneficial. Substrate for selection.') },
        { concept: 'Genetic drift', detail: t('stem.dna.random_changes_in_allele_frequency_esp', 'Random changes in allele frequency, especially in small populations. Founder effect + bottlenecks are extreme cases.') },
        { concept: 'Gene flow', detail: t('stem.dna.movement_of_alleles_between_population', 'Movement of alleles between populations via migration. Reduces between-population differences; increases within-population diversity.') },
        { concept: 'Speciation', detail: t('stem.dna.formation_of_new_species_usually_via_r', 'Formation of new species, usually via reproductive isolation. Allopatric (geographic separation) most common.') },
        { concept: 'Convergent evolution', detail: t('stem.dna.unrelated_organisms_evolve_similar_tra', 'Unrelated organisms evolve similar traits independently (wings in birds + bats + insects; eyes in vertebrates + cephalopods).') },
        { concept: 'Common ancestry', detail: t('stem.dna.all_life_shares_a_common_ancestor_luca', 'All life shares a common ancestor (LUCA). Evidence: shared genetic code, ribosomes, ATP, glycolysis, basic biochemistry.') },
        { concept: 'Phylogenetic tree', detail: t('stem.dna.diagram_showing_evolutionary_relations', 'Diagram showing evolutionary relationships. Increasingly built from DNA sequence comparisons rather than morphology.') },
        { concept: 'Hardy-Weinberg equilibrium', detail: t('stem.dna.allele_frequencies_stay_constant_under', 'Allele frequencies stay constant under no-evolution assumptions: large pop, random mating, no selection/mutation/migration/drift. p² + 2pq + q² = 1.') }
      ];

      var DNA_GLOSSARY = [
        { term: 'Gene', def: 'A segment of DNA that codes for a functional product (protein or RNA).' },
        { term: 'Allele', def: 'A variant of a gene. Different alleles can produce different versions of the same trait.' },
        { term: 'Genotype', def: 'The complete set of alleles an organism has.' },
        { term: 'Phenotype', def: 'The observable traits — result of genotype + environment + chance.' },
        { term: 'Homozygous', def: 'Two identical alleles at a locus (AA or aa).' },
        { term: 'Heterozygous', def: 'Two different alleles at a locus (Aa).' },
        { term: 'Dominant allele', def: 'Expressed in heterozygote. Capital letter (A).' },
        { term: 'Recessive allele', def: 'Only expressed in homozygote (aa). Lowercase (a).' },
        { term: 'Codominance', def: 'Both alleles fully expressed in heterozygote (ABO blood: AB shows both A + B antigens).' },
        { term: 'Incomplete dominance', def: 'Heterozygote has intermediate phenotype (red × white → pink flowers).' },
        { term: 'Locus', def: 'Specific physical location of a gene on a chromosome.' },
        { term: 'Genome', def: 'Complete set of an organism\'s DNA. Human ~3.2 billion bp.' },
        { term: 'Chromosome', def: 'Single, long, condensed DNA molecule with associated proteins (mainly histones).' },
        { term: 'Chromatin', def: 'DNA + protein in the nucleus. Euchromatin (loose, active) vs heterochromatin (condensed, inactive).' },
        { term: 'Exon', def: 'Coding region of a gene; retained in mature mRNA.' },
        { term: 'Intron', def: 'Non-coding region of a gene; removed by splicing.' },
        { term: 'Promoter', def: 'DNA sequence where RNA polymerase binds to start transcription. ~25-100 bp upstream of gene.' },
        { term: 'Codon', def: 'Three-nucleotide sequence specifying one amino acid (or stop signal). 64 possible codons.' },
        { term: 'Anticodon', def: 'Three-nucleotide sequence on tRNA that pairs with mRNA codon during translation.' },
        { term: 'Ribosome', def: 'Cellular machine that synthesizes proteins. Made of rRNA + proteins. Catalytic activity is in the 23S rRNA — it\'s a ribozyme.' },
        { term: 'tRNA', def: 'Transfer RNA. Adapter molecule that carries amino acids to the ribosome based on codon-anticodon pairing.' },
        { term: 'mRNA', def: 'Messenger RNA. Carries genetic code from DNA to ribosomes for translation.' },
        { term: 'rRNA', def: 'Ribosomal RNA. Structural + catalytic component of ribosomes. Most abundant RNA in cells.' },
        { term: 'siRNA / miRNA', def: 'Small interfering / microRNA. Regulatory RNAs that silence gene expression via RNAi pathway. Therapeutic + research tools.' },
        { term: 'Plasmid', def: 'Small, circular DNA found in bacteria, separate from chromosomes. Often carries antibiotic resistance. Workhorse of molecular cloning.' },
        { term: 'Karyotype', def: 'Visual representation of an individual\'s full chromosome set. Reveals numerical or large structural abnormalities.' },
        { term: 'Pedigree', def: 'Diagram tracing a trait through a family tree. Reveals inheritance pattern (dominant/recessive, autosomal/sex-linked).' },
        { term: 'Epigenetics', def: 'Heritable changes in gene expression NOT caused by changes in DNA sequence. Methylation, histone modification, etc.' },
        { term: 'Telomere', def: 'Repetitive DNA at chromosome ends (TTAGGG in vertebrates). Shortens with each division — linked to aging.' },
        { term: 'Centromere', def: 'Constricted region where sister chromatids attach. Site of kinetochore + spindle attachment during cell division.' }
      ];

      function expHeader() {
        return h('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200' },
          h('div', null,
            h('h3', { className: 'text-base font-black text-emerald-900' }, t('stem.dna.genetics_reference_library', '🧬 Genetics Reference Library')),
            h('div', { className: 'text-[11px] text-emerald-700 mt-0.5' }, t('stem.dna.interactive_references_pick_a_topic_be', 'Interactive references — pick a topic below to explore.'))
          ),
          expSection && h('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'transition-colors px-3 py-1 rounded-md text-xs font-bold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 active:scale-[0.97]'
          }, t('stem.dna.close_section', '✕ Close section'))
        );
      }

      function expTabBar() {
        // 45 DNA/biology sections grouped into 7 cohesive domains. All IDs
        // preserved. Groups: DNA Basics · Cell & Organelles · Genetics &
        // Inheritance · Biotech & Lab · Disease & Health · Life on Earth ·
        // Reference.
        var TAB_GROUPS = [
          { id: 'dna', label: t('stem.dna.dna_basics', 'DNA Basics'), color: 'emerald', tabs: [
            { id: 'bases', label: t('stem.dna.base_pairs', 'Base pairs'), icon: '🅰🅣' },
            { id: 'code', label: t('stem.dna.genetic_code', 'Genetic code'), icon: '🔡' },
            { id: 'replication', label: t('stem.dna.dna_replication_2', 'DNA replication'), icon: '🔄' },
            { id: 'transcription', label: t('stem.dna.transcription', 'Transcription'), icon: '✍' },
            { id: 'translation', label: t('stem.dna.translation', 'Translation'), icon: '🏭' },
            { id: 'dnarna', label: t('stem.dna.dna_vs_rna', 'DNA vs RNA'), icon: '⇌' },
            { id: 'mutations', label: t('stem.dna.mutations_2', 'Mutations'), icon: '⚠' },
            { id: 'amino', label: t('stem.dna.amino_acids', 'Amino acids'), icon: '⚕' },
            { id: 'mutInquiry', label: t('stem.dna.mutation_inquiry', 'Mutation Inquiry'), icon: '🔬' }
          ] },
          { id: 'cell', label: t('stem.dna.cell_organelles', 'Cell & Organelles'), color: 'teal', tabs: [
            { id: 'organelles', label: t('stem.dna.cell_organelles_2', 'Cell organelles'), icon: '🔬' },
            { id: 'celltypes', label: t('stem.dna.cell_types', 'Cell types'), icon: '🧫' },
            { id: 'pathways', label: t('stem.dna.cell_pathways', 'Cell pathways'), icon: '⇄' },
            { id: 'periodtable_bio', label: t('stem.dna.bio_elements', 'Bio elements'), icon: '⌬' },
            { id: 'devel', label: t('stem.dna.embryology', 'Embryology'), icon: '🥚' }
          ] },
          { id: 'genetics', label: t('stem.dna.genetics_inheritance', 'Genetics & Inheritance'), color: 'lime', tabs: [
            { id: 'chromosomes', label: t('stem.dna.chromosomes', 'Chromosomes'), icon: '🧬' },
            { id: 'meiosis', label: t('stem.dna.meiosis_vs_mitosis', 'Meiosis vs mitosis'), icon: '⊞' },
            { id: 'mendel', label: t('stem.dna.mendelian_genetics', 'Mendelian genetics'), icon: '🫛' },
            { id: 'epigenetics', label: t('stem.dna.epigenetics', 'Epigenetics'), icon: '✎' },
            { id: 'genomes', label: t('stem.dna.genome_sizes', 'Genome sizes'), icon: '📏' },
            { id: 'famousgenes', label: t('stem.dna.famous_genes', 'Famous genes'), icon: '⌬' }
          ] },
          { id: 'biotech', label: t('stem.dna.biotech_lab', 'Biotech & Lab'), color: 'cyan', tabs: [
            { id: 'biotech', label: t('stem.dna.biotech_tools', 'Biotech tools'), icon: '🔬' },
            { id: 'biotech2', label: t('stem.dna.biotech_apps', 'Biotech apps'), icon: '💉' },
            { id: 'pcr', label: t('stem.dna.pcr_lab', 'PCR + lab'), icon: '🧪' },
            { id: 'crispr', label: t('stem.dna.crispr_detail', 'CRISPR detail'), icon: '✂' },
            { id: 'sequencing', label: t('stem.dna.sequencing_tech', 'Sequencing tech'), icon: '📊' },
            { id: 'modelorg', label: t('stem.dna.model_organisms', 'Model organisms'), icon: '🧫' },
            { id: 'ethics', label: t('stem.dna.bioethics', 'Bioethics'), icon: '⚖' }
          ] },
          { id: 'health', label: t('stem.dna.disease_health', 'Disease & Health'), color: 'rose', tabs: [
            { id: 'diseases', label: t('stem.dna.disease_genes', 'Disease genes'), icon: '🏥' },
            { id: 'cancer', label: t('stem.dna.cancer_biology', 'Cancer biology'), icon: '⚕' },
            { id: 'immunity', label: t('stem.dna.immune_system', 'Immune system'), icon: '🛡' },
            { id: 'viruses', label: t('stem.dna.virus_families', 'Virus families'), icon: '🦠' },
            { id: 'microbiome', label: t('stem.dna.microbiome', 'Microbiome'), icon: '🦠' },
            { id: 'organ_systems', label: t('stem.dna.organ_systems', 'Organ systems'), icon: '🫀' },
            { id: 'hormones', label: t('stem.dna.hormones', 'Hormones'), icon: '⚛' },
            { id: 'vitamins', label: t('stem.dna.vitamins', 'Vitamins'), icon: '💊' },
            { id: 'neuro', label: t('stem.dna.neuroscience', 'Neuroscience'), icon: '🧠' }
          ] },
          { id: 'life', label: t('stem.dna.life_on_earth', 'Life on Earth'), color: 'amber', tabs: [
            { id: 'evolution', label: t('stem.dna.evolution', 'Evolution'), icon: '🌳' },
            { id: 'tree', label: t('stem.dna.tree_of_life', 'Tree of life'), icon: '🌳' },
            { id: 'ecology', label: t('stem.dna.ecology', 'Ecology'), icon: '🌍' },
            { id: 'animals2', label: t('stem.dna.animal_facts', 'Animal facts'), icon: '🐾' },
            { id: 'animal_groups', label: t('stem.dna.animal_groups', 'Animal groups'), icon: '🦁' },
            { id: 'famous_orgs', label: t('stem.dna.wild_dog_dna', 'Wild + dog DNA'), icon: '🐕' },
            { id: 'plants', label: t('stem.dna.plant_biology', 'Plant biology'), icon: '🌿' },
            { id: 'extinct', label: t('stem.dna.extinct_species', 'Extinct species'), icon: '🦕' }
          ] },
          { id: 'reference', label: t('stem.dna.reference', 'Reference'), color: 'slate', tabs: [
            { id: 'famous', label: t('stem.dna.history', 'History'), icon: '🕰' },
            { id: 'glossary', label: t('stem.dna.glossary', 'Glossary'), icon: '📖' }
          , { id: 'traceTrait', label: t('stem.dna.trace_trait', 'Trace trait'), icon: '🧬' }] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return h('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'transition-colors bg-white text-slate-700 border-slate-300 hover:bg- active:scale-[0.97]' + accent + 'transition-colors -50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        return h('div', { className: 'mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5' },
          TAB_GROUPS.map(function(g) {
            return h('div', { key: g.id, role: 'group', 'aria-label': g.label + ' tabs', className: 'flex items-center gap-2 flex-wrap' },
              h('span', { 'aria-hidden': 'true', className: 'text-[10px] font-extrabold tracking-widest uppercase text-' + g.color + '-700 min-w-[120px] text-right pr-1 border-r border-' + g.color + '-200 shrink-0' }, g.label),
              g.tabs.map(function(s) { return renderBtn(s, g.color); })
            );
          })
        );
      }

      function renderBasesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.dna_rna_bases', '🅰🅣 DNA + RNA bases')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.five_nitrogenous_bases_make_up_dna_rna', 'Five nitrogenous bases make up DNA + RNA: A, T, G, C (DNA); A, U, G, C (RNA). Purines (A, G) are 2-ringed; pyrimidines (T, U, C) are 1-ringed. Pairing follows specific H-bond patterns.')),
          h('div', { className: 'space-y-2' },
            BASE_PAIRS.map(function(b, i) {
              return h('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-center gap-3 mb-1' },
                  h('div', { className: 'w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg tracking-tight', style: { background: b.color } }, b.icon),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'text-sm font-black text-slate-800' }, b.base),
                    h('div', { className: 'text-[11px] text-slate-600' }, b.cat + ' · ' + b.bonds)
                  )
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, t('stem.dna.pairs_with', 'Pairs with: ')), b.pairs),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.notes)
              );
            })
          )
        );
      }

      function renderCodeSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.genetic_code_codon_table', '🔡 Genetic code — codon table')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.64_codons_4_encode_20_amino_acids_3_st', '64 codons (4³) encode 20 amino acids + 3 stop signals. Code is redundant (degenerate) — most amino acids have multiple codons, usually differing in the 3rd position ("wobble"). Universal across nearly all life.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Codon(s)', 'AA', 'Name', 'Note'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                GENETIC_CODE.map(function(g, i) {
                  var isStop = g.aa === '—';
                  var isStart = g.note === 'START codon';
                  return h('tr', { key: 'g'+i, className: isStop ? 'bg-red-50' : isStart ? 'bg-emerald-50' : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50') },
                    h('td', { className: 'px-2 py-1 text-slate-800 font-mono font-bold' }, g.codon),
                    h('td', { className: 'px-2 py-1 text-slate-800 font-mono font-bold' }, g.aa),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, g.name),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, g.note)
                  );
                })
              )
            )
          ),
          h('div', { className: 'mt-3 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            h('strong', null, t('stem.dna.wobble', '💡 Wobble: ')), t('stem.dna.third_codon_position_pairs_less_strict', 'Third codon position pairs less strictly — a single tRNA can recognize multiple codons. Reduces the number of tRNAs needed (cells have ~30-40, not 64).')
          )
        );
      }

      function renderReplicationSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.dna_replication_3', '🔄 DNA replication')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.semi_conservative_each_new_helix_has_o', 'Semi-conservative — each new helix has one parent + one newly-synthesized strand. Proven by Meselson-Stahl 1958. ~50 bp/sec in bacteria, ~50 bp/sec per fork in eukaryotes (but thousands of forks in parallel).')),
          h('div', { className: 'space-y-2' },
            DNA_REPLICATION_STEPS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-base font-black text-emerald-700 min-w-[28px] mt-0.5' }, s.step),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-0.5' }, s.name),
                  h('div', { className: 'text-[10px] font-bold text-emerald-700 mb-1' }, 'Enzymes: ', s.enzymes),
                  h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
                )
              );
            })
          )
        );
      }

      function renderTranscriptionSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.transcription_dna_rna', '✍ Transcription (DNA → RNA)')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.rna_polymerase_reads_dna_template_3_5_', 'RNA polymerase reads DNA template (3\'→5\') and synthesizes mRNA (5\'→3\'). In eukaryotes, the primary transcript is heavily processed before export.')),
          h('div', { className: 'space-y-2' },
            TRANSCRIPTION_STEPS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-base font-black text-emerald-700 min-w-[28px] mt-0.5' }, s.step),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-0.5' }, s.name),
                  h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
                )
              );
            })
          )
        );
      }

      function renderTranslationSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.translation_mrna_protein_2', '🏭 Translation (mRNA → protein)')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.ribosome_reads_mrna_in_3_base_codons_a', 'Ribosome reads mRNA in 3-base codons and builds protein. ~10-20 amino acids per second in bacteria; ~3-5 in eukaryotes. Multiple ribosomes can translate the same mRNA (polyribosome).')),
          h('div', { className: 'space-y-2' },
            TRANSLATION_STEPS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-base font-black text-emerald-700 min-w-[28px] mt-0.5' }, s.step),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-0.5' }, s.name),
                  h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
                )
              );
            })
          )
        );
      }

      function renderMutationsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.mutation_types', '⚠ Mutation types')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.mutations_range_from_invisible_silent_', 'Mutations range from invisible (silent) to lethal. Their effect depends on what changes, where, and in which cell type (germline vs somatic).')),
          h('div', { className: 'space-y-2' },
            MUTATION_TYPES.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, m.type),
                  h('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-800' }, m.subtype)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.desc)
              );
            })
          )
        );
      }

      function renderChromosomesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.human_chromosomes_genome', '🧬 Human chromosomes + genome')),
          h('div', { className: 'space-y-2' },
            CHROMOSOMES.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'flex items-baseline gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'min-w-[180px]' },
                  h('div', { className: 'text-[12px] font-black text-slate-800' }, c.name),
                  h('div', { className: 'text-[10px] font-bold text-emerald-700 font-mono' }, c.count)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed flex-1' }, c.detail)
              );
            })
          )
        );
      }

      function renderDnaRnaSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.dna_vs_rna_2', '⇌ DNA vs RNA')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Feature', 'DNA', 'RNA'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                DNA_VS_RNA.map(function(d, i) {
                  return h('tr', { key: 'd'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 text-slate-800 font-bold' }, d.feature),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, d.dna),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, d.rna)
                  );
                })
              )
            )
          )
        );
      }

      function renderBiotechSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.biotech_tools_2', '🔬 Biotech tools')),
          h('div', { className: 'space-y-1.5' },
            BIOTECH_TOOLS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, t.name),
                  h('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 italic' }, t.invented)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.desc)
              );
            })
          )
        );
      }

      function renderDiseasesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.disease_causing_genes_examples', '🏥 Disease-causing genes (examples)')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.a_sampling_of_well_characterized_genet', 'A sampling of well-characterized genetic disorders. Genetic counseling resources and current treatments evolve — verify with current literature for clinical decisions.')),
          h('div', { className: 'space-y-2' },
            DISEASES_AND_GENES.map(function(d, i) {
              return h('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, d.disease),
                  h('span', { className: 'text-[10px] font-mono ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-800' }, d.gene)
                ),
                h('div', { className: 'text-[11px] text-slate-600 mb-1' }, h('strong', null, 'Inheritance: '), d.inheritance),
                h('div', { className: 'text-[11px] text-slate-600 mb-1' }, h('strong', null, 'Mutation: '), d.mutation),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed italic' }, d.notes)
              );
            })
          )
        );
      }

      function renderEvolutionSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.evolution_concepts', '🌳 Evolution concepts')),
          h('div', { className: 'space-y-1.5' },
            EVOLUTION_CONCEPTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, c.concept),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      // ── Cycle 4 of the inquiry-learning study: REASONING VERIFICATION ──
      // Refined H5: forced commitment of the ANSWER alone is not enough —
      // learner must commit to the REASONING ranking too; reveal verifies both.
      // Implementation: drag-rank 4 candidate explanations from most→least supporting.
      var PEDIGREE_PUZZLES = [
        {
          id: 'p1', title: t('stem.dna.family_a_three_generations_blue_eyes', 'Family A — three generations, blue eyes'),
          description: t('stem.dna.two_unaffected_parents_gen_i_have_one_', 'Two unaffected parents (gen I) have one affected child + one unaffected (gen II). The affected child + unaffected partner have one affected + one unaffected (gen III). Trait appears in roughly 25% of offspring of unaffected x unaffected matings.'),
          correctPattern: 'autosomal_recessive',
          expertRanking: ['skip_generations', 'unaffected_carriers', 'no_sex_bias', 'present_in_homozygote'],
          explanations: [
            { id: 'skip_generations', text: t('stem.dna.trait_skips_generations_unaffected_par', 'Trait skips generations (unaffected parents → affected child).') },
            { id: 'unaffected_carriers', text: t('stem.dna.parents_must_be_heterozygous_carriers_', 'Parents must be heterozygous carriers passing one recessive allele each.') },
            { id: 'no_sex_bias', text: t('stem.dna.affected_individuals_appear_in_both_se', 'Affected individuals appear in both sexes at roughly equal frequency.') },
            { id: 'present_in_homozygote', text: t('stem.dna.affected_aa_homozygous_carriers_aa_are', 'Affected = aa homozygous; carriers (Aa) are phenotypically unaffected.') }
          ]
        },
        {
          id: 'p2', title: t('stem.dna.family_b_color_blindness_across_three_', 'Family B — color blindness across three generations'),
          description: t('stem.dna.affected_grandfather_gen_i_has_unaffec', 'Affected grandfather (gen I) has unaffected daughter (gen II) and affected grandson via that daughter (gen III). No affected sons of unaffected fathers. Trait far more common in males.'),
          correctPattern: 'x_linked_recessive',
          expertRanking: ['male_bias', 'mother_carrier', 'skip_via_daughters', 'no_male_to_male'],
          explanations: [
            { id: 'male_bias', text: t('stem.dna.trait_shows_strong_male_bias_hemizygou', 'Trait shows strong male bias (hemizygous males express; females need two copies).') },
            { id: 'mother_carrier', text: t('stem.dna.unaffected_daughter_of_affected_grandf', 'Unaffected daughter of affected grandfather is an obligate carrier.') },
            { id: 'skip_via_daughters', text: t('stem.dna.trait_skips_generation_through_carrier', 'Trait skips generation through carrier daughters, then reappears in grandsons.') },
            { id: 'no_male_to_male', text: t('stem.dna.no_father_to_son_transmission_sons_inh', 'No father-to-son transmission (sons inherit Y from father, not X).') }
          ]
        },
        {
          id: 'p3', title: t('stem.dna.family_c_huntington_like_late_onset_tr', 'Family C — Huntington-like late-onset trait'),
          description: t('stem.dna.every_affected_individual_has_at_least', 'Every affected individual has at least one affected parent. Trait appears in every generation. ~50% of children of affected parents are affected. Equal in males + females.'),
          correctPattern: 'autosomal_dominant',
          expertRanking: ['every_gen', 'affected_parent_required', 'fifty_pct', 'no_sex_bias_dom'],
          explanations: [
            { id: 'every_gen', text: t('stem.dna.trait_appears_in_every_generation_no_s', 'Trait appears in every generation (no skipping).') },
            { id: 'affected_parent_required', text: t('stem.dna.every_affected_individual_has_at_least_2', 'Every affected individual has at least one affected parent.') },
            { id: 'fifty_pct', text: t('stem.dna.roughly_50_of_children_of_an_affected_', 'Roughly 50% of children of an affected heterozygote are affected.') },
            { id: 'no_sex_bias_dom', text: t('stem.dna.equal_frequency_in_males_females_autos', 'Equal frequency in males + females — autosomal, not sex-linked.') }
          ]
        }
      ];
      var PATTERN_OPTIONS = [
        { id: 'autosomal_dominant', label: t('stem.dna.autosomal_dominant', 'Autosomal dominant') },
        { id: 'autosomal_recessive', label: t('stem.dna.autosomal_recessive', 'Autosomal recessive') },
        { id: 'x_linked_dominant', label: t('stem.dna.x_linked_dominant', 'X-linked dominant') },
        { id: 'x_linked_recessive', label: t('stem.dna.x_linked_recessive', 'X-linked recessive') },
        { id: 'y_linked', label: 'Y-linked' },
        { id: 'mitochondrial', label: t('stem.dna.mitochondrial', 'Mitochondrial') }
      ];
      function renderTraceTraitSection() {
        var state = d2.traceTrait || { puzzles: {}, score: 0 };
        function setTT(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.dna) || {};
            var st = Object.assign({}, prior.traceTrait || state, patch);
            return Object.assign({}, prev, { dna: Object.assign({}, prior, { traceTrait: st }) });
          });
        }
        function reorderExplanations(puzzleId, fromIdx, toIdx) {
          var ps = state.puzzles[puzzleId];
          if (!ps || !ps.ranking) return;
          var ranking = ps.ranking.slice();
          var item = ranking.splice(fromIdx, 1)[0];
          ranking.splice(toIdx, 0, item);
          var newPuzzles = Object.assign({}, state.puzzles);
          newPuzzles[puzzleId] = Object.assign({}, ps, { ranking: ranking });
          setTT({ puzzles: newPuzzles });
        }
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, t('stem.dna.trace_the_trait', '🧬 Trace the trait')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' },
            t('stem.dna.inheritance_pattern_reasoning_ranking_', 'Inheritance pattern + reasoning ranking — both must be committed before reveal. The reveal grades your ranking position-by-position, not just your final answer. Real inquiry requires you to know WHY, not just WHAT.')),
          PEDIGREE_PUZZLES.map(function(puzzle, pIdx) {
            var defaultRanking = puzzle.explanations.map(function(e) { return e.id; });
            var st = state.puzzles[puzzle.id] || { pick: null, ranking: defaultRanking, revealed: false };
            if (!state.puzzles[puzzle.id]) {
              setTimeout(function() {
                var newP = Object.assign({}, state.puzzles);
                newP[puzzle.id] = st;
                setTT({ puzzles: newP });
              }, 0);
            }
            var canReveal = st.pick != null && Array.isArray(st.ranking) && st.ranking.length === 4 && !st.revealed;
            var diagnosisCorrect = st.revealed && st.pick === puzzle.correctPattern;
            var positionMatches = st.revealed ? (st.ranking || []).map(function(id, i) { return id === puzzle.expertRanking[i]; }) : [];
            var rankingScore = positionMatches.filter(Boolean).length;
            return h('div', { key: puzzle.id, className: 'mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200' },
              h('div', { className: 'flex items-baseline gap-2 mb-1' },
                h('span', { className: 'text-[10px] font-mono text-emerald-700 font-bold' }, '#' + (pIdx + 1)),
                h('span', { className: 'text-[12px] font-black text-slate-800' }, puzzle.title)
              ),
              h('p', { className: 'text-[11px] text-slate-700 mb-2 italic' }, puzzle.description),
              h('div', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, t('stem.dna.1_inheritance_pattern', '1. Inheritance pattern:')),
              h('div', { className: 'flex flex-wrap gap-1 mb-2' },
                PATTERN_OPTIONS.map(function(opt) {
                  var picked = st.pick === opt.id;
                  var revealed = st.revealed;
                  var correct = opt.id === puzzle.correctPattern;
                  var bg = revealed
                    ? (correct ? 'bg-green-600 text-white border-green-700' : (picked ? 'bg-red-100 text-red-800 border-red-300 line-through' : 'bg-white text-slate-500 border-slate-200'))
                    : (picked ? 'bg-emerald-200 text-emerald-900 border-emerald-400' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 active:scale-[0.97]');
                  return h('button', {
                    key: opt.id,
                    disabled: revealed,
                    onClick: function() {
                      var newP = Object.assign({}, state.puzzles);
                      newP[puzzle.id] = Object.assign({}, st, { pick: opt.id });
                      setTT({ puzzles: newP });
                    },
                    'aria-pressed': picked ? 'true' : 'false',
                    className: 'px-2 py-1 rounded text-[11px] font-bold border transition-colors focus:ring-2 focus:ring-emerald-400 focus:outline-none ' + bg
                  }, opt.label);
                })
              ),
              h('div', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, t('stem.dna.2_rank_these_explanations_most_least_s', '2. Rank these explanations (most → least supporting):')),
              h('ol', { className: 'space-y-1 mb-2', style: { listStyle: 'none', padding: 0 } },
                (st.ranking || defaultRanking).map(function(eId, rIdx) {
                  var expl = puzzle.explanations.find(function(e) { return e.id === eId; });
                  if (!expl) return null;
                  var expertPos = puzzle.expertRanking.indexOf(eId);
                  var positionMatch = st.revealed && rIdx === expertPos;
                  return h('li', { key: eId, className: 'flex items-center gap-2 p-2 rounded border ' +
                    (st.revealed
                      ? (positionMatch ? 'bg-green-100 border-green-300' : 'bg-amber-50 border-amber-300')
                      : 'bg-white border-slate-300')
                  },
                    h('span', { className: 'font-mono font-bold text-[11px] text-slate-500', style: { minWidth: 24 } }, '#' + (rIdx + 1)),
                    h('span', { className: 'flex-1 text-[11px] text-slate-700' }, expl.text),
                    !st.revealed && rIdx > 0 && h('button', {
                      'aria-label': t('stem.dna.move_up', 'Move up'),
                      onClick: function() { reorderExplanations(puzzle.id, rIdx, rIdx - 1); },
                      className: 'transition-colors px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 focus:outline-none active:scale-[0.97]'
                    }, '▲'),
                    !st.revealed && rIdx < (st.ranking || []).length - 1 && h('button', {
                      'aria-label': t('stem.dna.move_down', 'Move down'),
                      onClick: function() { reorderExplanations(puzzle.id, rIdx, rIdx + 1); },
                      className: 'transition-colors px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 focus:outline-none active:scale-[0.97]'
                    }, '▼'),
                    st.revealed && h('span', { className: 'text-[10px] font-bold ' + (positionMatch ? 'text-green-700' : 'text-amber-700') },
                      positionMatch ? '✓ exact' : 'expert pos #' + (expertPos + 1))
                  );
                })
              ),
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('button', {
                  disabled: !canReveal,
                  onClick: function() {
                    var newP = Object.assign({}, state.puzzles);
                    newP[puzzle.id] = Object.assign({}, st, { revealed: true });
                    var bonus = st.pick === puzzle.correctPattern ? 1 : 0;
                    setTT({ puzzles: newP, score: (state.score || 0) + bonus });
                  },
                  className: 'transition-colors px-3 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-emerald-400 focus:outline-none active:scale-[0.97]'
                }, st.revealed ? '✓ Revealed' : 'Reveal verdict'),
                !canReveal && !st.revealed && h('span', { className: 'text-[10px] text-slate-500 italic' },
                  st.pick == null ? 'Pick a pattern first' : 'Order all 4 explanations'),
                st.revealed && h('span', { className: 'text-[11px] font-bold ' + (diagnosisCorrect ? 'text-green-700' : 'text-rose-700') },
                  diagnosisCorrect ? '✓ Pattern correct' : '✗ Pattern off'),
                st.revealed && h('span', { className: 'text-[11px] text-slate-600' },
                  'Ranking match: ' + rankingScore + '/4 positions')
              )
            );
          }),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-2 flex-wrap' },
            h('span', null, '🎯'),
            h('strong', null, 'Pattern score: ' + (state.score || 0) + ' / ' + PEDIGREE_PUZZLES.length),
            h('span', { className: 'text-slate-500 ml-2 italic' }, t('stem.dna.notice_the_ranking_grade_is_independen', 'Notice: the ranking grade is independent of the pattern grade — you can identify the WHAT correctly but rank the WHY out of order.'))
          )
        );
      }

      function renderGlossarySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.genetics_glossary', '📖 Genetics glossary')),
          h('div', { className: 'space-y-1' },
            DNA_GLOSSARY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900' }, g.term),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — Additional genetics references (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var GENOME_SIZES = [
        { organism: 'φX174 (bacteriophage)', size: '~5,400 bp', genes: '11', notes: 'One of the smallest. First DNA genome sequenced (Sanger, 1977).' },
        { organism: 'HIV-1', size: '~9,700 bp', genes: '9', notes: 'RNA genome. Compact, with overlapping reading frames.' },
        { organism: 'E. coli', size: '~4.6 million bp', genes: '~4,300', notes: 'Workhorse of molecular biology. Circular chromosome.' },
        { organism: 'Yeast (S. cerevisiae)', size: '~12 million bp', genes: '~6,000', notes: 'First eukaryote sequenced (1996). 16 chromosomes.' },
        { organism: 'C. elegans (roundworm)', size: '~100 million bp', genes: '~20,000', notes: 'First multicellular sequenced. Cell-by-cell fate mapped.' },
        { organism: 'Fruit fly (D. melanogaster)', size: '~140 million bp', genes: '~14,000', notes: 'Classic genetics model. Polytene chromosomes.' },
        { organism: 'Arabidopsis (plant model)', size: '~135 million bp', genes: '~27,500', notes: 'First plant sequenced (2000).' },
        { organism: 'Pufferfish (Takifugu)', size: '~390 million bp', genes: '~22,000', notes: 'Compact vertebrate genome — little "junk" DNA.' },
        { organism: 'Human', size: '~3.0 billion bp', genes: '~20,000', notes: 'Reference draft 2001. Telomere-to-telomere finished 2022.' },
        { organism: 'Wheat', size: '~16 billion bp', genes: '~108,000', notes: 'Hexaploid (6 copies). Much larger than human.' },
        { organism: 'Axolotl (salamander)', size: '~32 billion bp', genes: '~23,000', notes: 'One of the largest sequenced. Lots of repetitive DNA.' },
        { organism: 'Paris japonica (plant)', size: '~150 billion bp', genes: 'unknown', notes: 'Largest known eukaryotic genome. ~50× bigger than human.' }
      ];

      var MEIOSIS_VS_MITOSIS = [
        { feature: 'Purpose', mitosis: 'Growth, repair, asexual reproduction', meiosis: 'Produce gametes (sperm, egg) for sexual reproduction' },
        { feature: 'Divisions', mitosis: '1', meiosis: '2 (meiosis I + meiosis II)' },
        { feature: 'Daughter cells', mitosis: '2', meiosis: '4' },
        { feature: 'Daughter chromosome count', mitosis: 'Same as parent (diploid → diploid)', meiosis: 'Half of parent (diploid → haploid)' },
        { feature: 'Genetic variation', mitosis: 'None (clones, barring mutations)', meiosis: 'Crossing over + independent assortment = huge variation' },
        { feature: 'Homologous pairing', mitosis: 'No', meiosis: 'Yes (synapsis in prophase I)' },
        { feature: 'Crossing over', mitosis: 'No', meiosis: 'Yes — exchanges DNA between homologs' },
        { feature: 'Where it happens', mitosis: 'All somatic cells', meiosis: 'Only germ cells (gonads)' }
      ];

      var MENDEL_LAWS = [
        { name: t('stem.dna.law_of_segregation', 'Law of Segregation'), description: t('stem.dna.during_gamete_formation_the_two_allele', 'During gamete formation, the two alleles for each gene separate so each gamete carries only one allele.'), example: 'Pea plant Tt (heterozygous) produces ½ T gametes and ½ t gametes.' },
        { name: t('stem.dna.law_of_independent_assortment', 'Law of Independent Assortment'), description: t('stem.dna.alleles_for_different_genes_assort_ind', 'Alleles for different genes assort independently of one another during gamete formation (genes on different chromosomes).'), example: 'A TtYy plant produces TY, Ty, tY, ty gametes in equal proportions.' },
        { name: t('stem.dna.law_of_dominance', 'Law of Dominance'), description: t('stem.dna.when_two_different_alleles_are_present', 'When two different alleles are present, one (dominant) is expressed while the other (recessive) is masked.'), example: 'In peas, purple (P) is dominant to white (p). Pp plants are purple.' }
      ];

      var MENDEL_RATIOS = [
        { cross: 'Monohybrid (Aa × Aa)', phenotype: '3:1', genotype: '1 AA : 2 Aa : 1 aa', notes: 'Classic dominance pattern.' },
        { cross: 'Dihybrid (AaBb × AaBb)', phenotype: '9:3:3:1', genotype: '16 combinations', notes: 'Independent assortment of two genes.' },
        { cross: 'Test cross (Aa × aa)', phenotype: '1:1', genotype: '1 Aa : 1 aa', notes: 'Used to determine if dominant phenotype is heterozygous or homozygous.' },
        { cross: 'Incomplete dominance (RR × WW)', phenotype: 'All pink', genotype: 'All RW', notes: 'Heterozygotes show blended phenotype. Snapdragons, four o\'clocks.' },
        { cross: 'Codominance (IᴬIᴮ blood type)', phenotype: 'AB blood', genotype: 'Both alleles expressed', notes: 'Both alleles fully expressed. Roan cattle (red + white = roan).' },
        { cross: 'X-linked recessive (carrier female)', phenotype: 'Affected sons (50%)', genotype: 'XᴬXᵃ × XᴬY', notes: 'Pattern for hemophilia, color blindness, DMD.' }
      ];

      var EPIGENETIC_MECHANISMS = [
        { mechanism: 'DNA methylation', description: t('stem.dna.methyl_group_ch_added_to_cytosines_esp', 'Methyl group (–CH₃) added to cytosines, especially at CpG islands. Generally silences gene expression.'), example: 'Methylation of tumor-suppressor gene promoters can drive cancer.' },
        { mechanism: 'Histone modifications', description: t('stem.dna.acetylation_methylation_phosphorylatio', 'Acetylation, methylation, phosphorylation of histone tails. Changes chromatin packing.'), example: 'Histone acetylation → open chromatin → active transcription. Deacetylation → silent.' },
        { mechanism: 'Chromatin remodeling', description: t('stem.dna.atp_dependent_complexes_slide_or_eject', 'ATP-dependent complexes slide or eject nucleosomes to expose DNA.'), example: 'SWI/SNF complex repositions nucleosomes during gene activation.' },
        { mechanism: 'Non-coding RNA', description: t('stem.dna.mirna_lncrna_regulate_gene_expression_', 'miRNA, lncRNA regulate gene expression post-transcriptionally.'), example: 'XIST lncRNA coats one X chromosome in females → X-inactivation.' },
        { mechanism: 'Genomic imprinting', description: t('stem.dna.some_genes_expressed_only_from_materna', 'Some genes expressed only from maternal or paternal allele. Methylation marks.'), example: 'IGF2 expressed only from paternal allele; H19 only from maternal.' },
        { mechanism: 'Trans-generational inheritance', description: t('stem.dna.some_epigenetic_marks_survive_gametoge', 'Some epigenetic marks survive gametogenesis and pass to offspring.'), example: 'Dutch Hunger Winter (1944-45) descendants show altered metabolism, methylation patterns.' }
      ];

      var AMINO_ACIDS = [
        { letter: 'A', three: 'Ala', name: t('stem.dna.alanine_2', 'Alanine'), side: 'Nonpolar, hydrophobic', notes: 'Smallest after glycine. Common in protein cores.' },
        { letter: 'R', three: 'Arg', name: t('stem.dna.arginine_2', 'Arginine'), side: 'Basic, positively charged', notes: 'Long side chain. Binds DNA/RNA (negatively charged).' },
        { letter: 'N', three: 'Asn', name: t('stem.dna.asparagine_2', 'Asparagine'), side: 'Polar, uncharged', notes: 'Can be glycosylated. Hydrogen bonds with water.' },
        { letter: 'D', three: 'Asp', name: t('stem.dna.aspartate_2', 'Aspartate'), side: 'Acidic, negatively charged', notes: 'Active site of many enzymes.' },
        { letter: 'C', three: 'Cys', name: t('stem.dna.cysteine_2', 'Cysteine'), side: 'Polar, contains –SH', notes: 'Forms disulfide bonds (S-S) — stabilize protein folds.' },
        { letter: 'E', three: 'Glu', name: t('stem.dna.glutamate_2', 'Glutamate'), side: 'Acidic, negatively charged', notes: 'Important neurotransmitter (in brain).' },
        { letter: 'Q', three: 'Gln', name: t('stem.dna.glutamine_2', 'Glutamine'), side: 'Polar, uncharged', notes: 'Most abundant amino acid in blood.' },
        { letter: 'G', three: 'Gly', name: t('stem.dna.glycine_2', 'Glycine'), side: 'Nonpolar, smallest', notes: 'No side chain (just –H). Found in tight turns + collagen.' },
        { letter: 'H', three: 'His', name: t('stem.dna.histidine_2', 'Histidine'), side: 'Basic, can be neutral or +', notes: 'pKa near 6 — important in enzyme active sites (proton transfer).' },
        { letter: 'I', three: 'Ile', name: t('stem.dna.isoleucine_2', 'Isoleucine'), side: 'Nonpolar, hydrophobic', notes: 'Branched chain. Essential.' },
        { letter: 'L', three: 'Leu', name: t('stem.dna.leucine_2', 'Leucine'), side: 'Nonpolar, hydrophobic', notes: 'Most common in proteins. Branched chain. Essential.' },
        { letter: 'K', three: 'Lys', name: t('stem.dna.lysine_2', 'Lysine'), side: 'Basic, positively charged', notes: 'Long side chain. Often modified (acetylation, methylation) in histones.' },
        { letter: 'M', three: 'Met', name: t('stem.dna.methionine_2', 'Methionine'), side: 'Nonpolar, contains S', notes: 'Start codon. Sulfur in side chain. Essential.' },
        { letter: 'F', three: 'Phe', name: t('stem.dna.phenylalanine_2', 'Phenylalanine'), side: 'Nonpolar, aromatic', notes: 'Benzene ring. Hydrophobic core of proteins. Essential.' },
        { letter: 'P', three: 'Pro', name: t('stem.dna.proline_2', 'Proline'), side: 'Special — cyclic', notes: 'Side chain loops back to N. Creates kinks in protein chain.' },
        { letter: 'S', three: 'Ser', name: t('stem.dna.serine_2', 'Serine'), side: 'Polar, contains –OH', notes: 'Active site of serine proteases. Phosphorylation target.' },
        { letter: 'T', three: 'Thr', name: t('stem.dna.threonine_2', 'Threonine'), side: 'Polar, contains –OH', notes: 'Phosphorylation target. Essential.' },
        { letter: 'W', three: 'Trp', name: t('stem.dna.tryptophan_2', 'Tryptophan'), side: 'Nonpolar, aromatic', notes: 'Largest amino acid. Fluorescent — used for protein detection. Essential.' },
        { letter: 'Y', three: 'Tyr', name: t('stem.dna.tyrosine_2', 'Tyrosine'), side: 'Polar, aromatic with –OH', notes: 'Phosphorylation target in signaling.' },
        { letter: 'V', three: 'Val', name: t('stem.dna.valine_2', 'Valine'), side: 'Nonpolar, hydrophobic', notes: 'Branched chain. Sickle cell anemia: Glu→Val mutation in β-globin. Essential.' }
      ];

      var ORGANELLES = [
        { name: t('stem.dna.nucleus', 'Nucleus'), function: 'Houses DNA, controls gene expression, site of transcription', notes: 'Surrounded by double membrane (nuclear envelope). Pores allow regulated transport.' },
        { name: t('stem.dna.nucleolus', 'Nucleolus'), function: 'Produces ribosomal RNA + assembles ribosomes', notes: 'Dense region within the nucleus. Not membrane-bound.' },
        { name: t('stem.dna.mitochondrion', 'Mitochondrion'), function: 'Cellular respiration → ATP production', notes: 'Has own DNA (mtDNA, ~16,500 bp in humans). Maternally inherited. Endosymbiotic origin.' },
        { name: t('stem.dna.chloroplast_plants', 'Chloroplast (plants)'), function: 'Photosynthesis: light energy → glucose', notes: 'Has own DNA. Contains chlorophyll. Endosymbiotic origin (cyanobacterium).' },
        { name: t('stem.dna.endoplasmic_reticulum_rough', 'Endoplasmic reticulum (rough)'), function: 'Protein synthesis (ribosomes on surface), modification', notes: 'Continuous with nuclear envelope.' },
        { name: t('stem.dna.endoplasmic_reticulum_smooth', 'Endoplasmic reticulum (smooth)'), function: 'Lipid synthesis, detoxification, calcium storage', notes: 'No ribosomes. Abundant in liver cells.' },
        { name: t('stem.dna.golgi_apparatus', 'Golgi apparatus'), function: 'Modifies, sorts, packages proteins for secretion or delivery', notes: 'Stack of flattened sacs (cisternae).' },
        { name: t('stem.dna.lysosome', 'Lysosome'), function: 'Digestion via hydrolytic enzymes', notes: 'pH ~5 (acidic). Recycles cell components (autophagy).' },
        { name: t('stem.dna.peroxisome', 'Peroxisome'), function: 'Breakdown of fatty acids, detox of H₂O₂', notes: 'Contains catalase. Important in liver and kidney.' },
        { name: t('stem.dna.vacuole_plant_central', 'Vacuole (plant central)'), function: 'Storage, turgor pressure', notes: 'Can be 90% of plant cell volume. Maintains shape.' },
        { name: t('stem.dna.cytoskeleton', 'Cytoskeleton'), function: 'Structure, motility, intracellular transport', notes: 'Microtubules, microfilaments, intermediate filaments.' },
        { name: t('stem.dna.ribosome', 'Ribosome'), function: 'Protein synthesis (translation)', notes: 'Made of rRNA + protein. Free in cytoplasm or attached to rough ER.' },
        { name: t('stem.dna.cell_membrane', 'Cell membrane'), function: 'Selective barrier, signaling', notes: 'Phospholipid bilayer with embedded proteins (fluid mosaic model).' },
        { name: t('stem.dna.cell_wall_plants_fungi_bacteria', 'Cell wall (plants, fungi, bacteria)'), function: 'Structure, protection', notes: 'Plants: cellulose. Fungi: chitin. Bacteria: peptidoglycan.' }
      ];

      var CELL_TYPES = [
        { type: 'Prokaryote (bacteria/archaea)', size: '~1–10 μm', features: 'No nucleus or membrane-bound organelles. Circular DNA in nucleoid.', example: 'E. coli, Streptococcus' },
        { type: 'Eukaryote (general)', size: '~10–100 μm', features: 'Nucleus + organelles. Linear chromosomes with histones.', example: 'All animals, plants, fungi, protists' },
        { type: 'Neuron', size: 'soma ~10–100 μm; axon up to 1 m', features: 'Specialized for electrical signaling. Doesn\'t divide (mostly).', example: 'Brain, spinal cord, peripheral nerves' },
        { type: 'Red blood cell (RBC)', size: '~7–8 μm', features: 'No nucleus or organelles in mature form. Packed with hemoglobin.', example: 'Mammalian erythrocytes' },
        { type: 'White blood cell (lymphocyte)', size: '~7–15 μm', features: 'Immune surveillance. B cells make antibodies; T cells kill infected cells.', example: 'Lymph, blood, lymphoid tissue' },
        { type: 'Muscle cell (skeletal)', size: 'long fibers, up to many cm', features: 'Multinucleate. Packed with myofibrils (actin + myosin).', example: 'Biceps, quadriceps' },
        { type: 'Cardiac muscle', size: '~50–100 μm long', features: 'Branched. Intercalated discs synchronize contraction.', example: 'Heart' },
        { type: 'Smooth muscle', size: '~100 μm long', features: 'Involuntary, no striations. Around hollow organs.', example: 'Intestines, blood vessels, uterus' },
        { type: 'Epithelial cell', size: 'varies', features: 'Sheet-forming. Polarized (apical vs basal surfaces).', example: 'Skin, gut lining, glands' },
        { type: 'Sperm', size: '~50 μm long', features: 'Highly streamlined. Mitochondria for flagellum power. Haploid.', example: 'Male gamete' },
        { type: 'Egg (oocyte)', size: '~100 μm (human) up to ostrich egg', features: 'Huge cytoplasm with maternal mRNAs + organelles. Haploid.', example: 'Female gamete' },
        { type: 'Stem cell', size: 'varies', features: 'Can self-renew + differentiate. Pluripotent (ESCs) or multipotent (adult).', example: 'Bone marrow HSCs, embryonic stem cells, iPSCs' }
      ];

      var SEQUENCING_METHODS = [
        { name: t('stem.dna.sanger_sequencing_2', 'Sanger sequencing'), year: '1977', readLength: '~800 bp', cost: 'high per base', notes: 'Chain termination with ddNTPs. Still used for short, accurate reads. Used for Human Genome Project.' },
        { name: t('stem.dna.illumina_short_read_ngs', 'Illumina (short-read NGS)'), year: '~2007', readLength: '~150-300 bp', cost: 'low per base', notes: 'Sequencing by synthesis with reversible terminators. High throughput, dominates whole-genome sequencing.' },
        { name: t('stem.dna.ion_torrent', 'Ion Torrent'), year: '2010', readLength: '~200-400 bp', cost: 'moderate', notes: 'Detects H⁺ release as bases are added. No fluorescence — simpler optics.' },
        { name: t('stem.dna.pacbio_smrt', 'PacBio (SMRT)'), year: '2011', readLength: '10-100 kb', cost: 'moderate', notes: 'Long reads. Good for spanning repeats, structural variants, full transcripts.' },
        { name: t('stem.dna.oxford_nanopore', 'Oxford Nanopore'), year: '~2014', readLength: '1 kb – 4 Mb', cost: 'low per device', notes: 'Detects current changes as DNA passes through pore. Portable (MinION). Used in Ebola, COVID field sequencing.' },
        { name: t('stem.dna.hi_c_chromosome_conformation_capture', 'Hi-C / chromosome conformation capture'), year: '2009', readLength: 'paired-end', cost: 'high', notes: 'Maps 3D genome organization, scaffolds genomes. Reveals chromatin loops and TADs.' }
      ];

      var BIOETHICS = [
        { topic: 'Genetic privacy', detail: t('stem.dna.who_can_access_your_genome_gina_2008_u', 'Who can access your genome? GINA (2008, US) prohibits genetic discrimination in employment + health insurance, NOT life insurance.') },
        { topic: 'Direct-to-consumer testing', detail: t('stem.dna.23andme_ancestrydna_reveal_ancestry_he', '23andMe, AncestryDNA reveal ancestry + health risk. Concerns: incidental findings, accuracy, third-party data sharing.') },
        { topic: 'CRISPR germline editing', detail: t('stem.dna.in_2018_he_jiankui_edited_embryos_for_', 'In 2018, He Jiankui edited embryos for HIV resistance → twin births. Widely condemned. Most countries ban germline editing.') },
        { topic: 'Designer babies', detail: t('stem.dna.hypothetical_selection_or_editing_of_e', 'Hypothetical selection or editing of embryos for non-medical traits (height, IQ). Currently technically limited; ethically contested.') },
        { topic: 'Gene drives', detail: t('stem.dna.engineered_to_spread_through_wild_popu', 'Engineered to spread through wild populations (e.g., mosquito malaria-resistance). Potential ecological irreversibility.') },
        { topic: 'Genetic testing for disease', detail: t('stem.dna.should_we_test_for_untreatable_disease', 'Should we test for untreatable diseases (Huntington)? Some people choose not to know.') },
        { topic: 'Forensic DNA', detail: t('stem.dna.familial_dna_searches_solved_cold_case', 'Familial DNA searches solved cold cases (Golden State Killer, 2018) but raise privacy issues for relatives who never consented.') },
        { topic: 'Patenting genes', detail: t('stem.dna.us_supreme_court_2013_ruled_that_natur', 'US Supreme Court (2013) ruled that naturally-occurring DNA cannot be patented, but synthetic cDNA can.') },
        { topic: 'Equity in genomics', detail: t('stem.dna.reference_genomes_historically_eurocen', 'Reference genomes historically Eurocentric. Improving reference diversity is ongoing (e.g., human pangenome project).') }
      ];

      var DNA_HISTORY = [
        { year: '1865', who: 'Gregor Mendel', what: 'Pea plant experiments → laws of inheritance. Largely ignored until 1900.' },
        { year: '1869', who: 'Friedrich Miescher', what: 'Isolated "nuclein" (DNA) from pus cells. Didn\'t know its function.' },
        { year: '1928', who: 'Frederick Griffith', what: 'Transformation experiments in pneumonia bacteria → some "transforming principle" carries heredity.' },
        { year: '1944', who: 'Avery, MacLeod, McCarty', what: 'Showed Griffith\'s transforming principle is DNA.' },
        { year: '1952', who: 'Hershey + Chase', what: 'Blender experiment with radiolabeled phages confirmed DNA = genetic material.' },
        { year: '1953', who: 'Watson, Crick, Franklin, Wilkins', what: 'Double helix structure of DNA (using Franklin\'s Photo 51).' },
        { year: '1958', who: 'Meselson + Stahl', what: 'Showed DNA replication is semi-conservative.' },
        { year: '1961', who: 'Jacob + Monod', what: 'Operon model — how genes are regulated (lac operon in E. coli).' },
        { year: '1966', who: 'Nirenberg, Khorana, Holley', what: 'Cracked the genetic code — codon → amino acid mapping.' },
        { year: '1977', who: 'Frederick Sanger', what: 'Developed Sanger sequencing. Earlier (1958) sequenced insulin (proteins). Two Nobels.' },
        { year: '1983', who: 'Kary Mullis', what: 'Invented PCR (polymerase chain reaction).' },
        { year: '1990', who: 'NIH + international', what: 'Human Genome Project launched.' },
        { year: '2001', who: 'HGP + Celera', what: 'First draft of human genome published.' },
        { year: '2012', who: 'Doudna + Charpentier', what: 'CRISPR-Cas9 demonstrated as programmable gene-editing tool.' },
        { year: '2022', who: 'T2T consortium', what: 'First complete (telomere-to-telomere) human genome published.' }
      ];

      function renderGenomesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.genome_sizes_across_life', '📏 Genome sizes across life')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.genome_size_does_not_correlate_with_or', 'Genome size does not correlate with organism complexity (C-value paradox). Humans have similar gene counts to roundworms — much of "extra" DNA in larger genomes is non-coding.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Organism', 'Genome size', 'Genes', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                GENOME_SIZES.map(function(g, i) {
                  return h('tr', { key: 'g'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, g.organism),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 font-bold' }, g.size),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, g.genes),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, g.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMeiosisSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.meiosis_vs_mitosis_2', '⊞ Meiosis vs Mitosis')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Feature', 'Mitosis', 'Meiosis'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MEIOSIS_VS_MITOSIS.map(function(r, i) {
                  return h('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, r.feature),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, r.mitosis),
                    h('td', { className: 'px-2 py-1 text-emerald-700 font-medium' }, r.meiosis)
                  );
                })
              )
            )
          )
        );
      }

      function renderMendelSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.mendelian_genetics_2', '🫛 Mendelian genetics')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.mendel_s_laws_1865', 'Mendel\'s Laws (1865)')),
            h('div', { className: 'space-y-2' },
              MENDEL_LAWS.map(function(L, i) {
                return h('div', { key: 'L'+i, className: 'p-3 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, L.name),
                  h('div', { className: 'text-[11px] text-slate-700 mb-1' }, L.description),
                  h('div', { className: 'text-[10px] text-emerald-700 italic font-mono' }, '→ ' + L.example)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.common_cross_outcomes', 'Common cross outcomes')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Cross', 'Phenotype ratio', 'Genotype', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MENDEL_RATIOS.map(function(m, i) {
                  return h('tr', { key: 'm'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, m.cross),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 font-bold' }, m.phenotype),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, m.genotype),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, m.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderEpigeneticsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.epigenetics_beyond_the_sequence', '✎ Epigenetics — beyond the sequence')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.heritable_changes_in_gene_expression_t', 'Heritable changes in gene expression that don\'t involve changes to DNA sequence. Influenced by environment, diet, stress.')),
          h('div', { className: 'space-y-2' },
            EPIGENETIC_MECHANISMS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, m.mechanism),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, m.description),
                h('div', { className: 'text-[10px] text-emerald-700 italic' }, '→ ' + m.example)
              );
            })
          )
        );
      }

      function renderAminoSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.the_20_standard_amino_acids', '⚕ The 20 standard amino acids')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.building_blocks_of_proteins_9_are_esse', 'Building blocks of proteins. 9 are "essential" (can\'t be synthesized — must come from diet): His, Ile, Leu, Lys, Met, Phe, Thr, Trp, Val.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['1-letter', '3-letter', 'Name', 'Side chain', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                AMINO_ACIDS.map(function(a, i) {
                  return h('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-black text-emerald-700' }, a.letter),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, a.three),
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, a.name),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, a.side),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderOrganellesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.cell_organelles_3', '🔬 Cell organelles')),
          h('div', { className: 'space-y-2' },
            ORGANELLES.map(function(o, i) {
              return h('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, o.name),
                h('div', { className: 'text-[11px] text-emerald-700 font-bold mb-1' }, 'Function: ' + o.function),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, o.notes)
              );
            })
          )
        );
      }

      function renderCellTypesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.cell_types_2', '🧫 Cell types')),
          h('div', { className: 'space-y-2' },
            CELL_TYPES.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, c.type),
                  h('span', { className: 'text-[10px] text-emerald-700 font-mono ml-auto px-2 py-0.5 rounded bg-emerald-100' }, c.size)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, c.features),
                h('div', { className: 'text-[10px] text-slate-600 italic' }, 'Example: ' + c.example)
              );
            })
          )
        );
      }

      function renderSequencingSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.dna_sequencing_technologies', '📊 DNA sequencing technologies')),
          h('div', { className: 'space-y-2' },
            SEQUENCING_METHODS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, s.name),
                  h('span', { className: 'text-[10px] text-slate-500 ml-auto font-mono' }, s.year)
                ),
                h('div', { className: 'flex gap-3 text-[10px] mb-1' },
                  h('span', { className: 'font-mono text-emerald-700' }, 'Read length: ' + s.readLength),
                  h('span', { className: 'font-mono text-slate-600' }, 'Cost: ' + s.cost)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderEthicsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.bioethics_in_genetics', '⚖ Bioethics in genetics')),
          h('div', { className: 'space-y-2' },
            BIOETHICS.map(function(b, i) {
              return h('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, b.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.detail)
              );
            })
          )
        );
      }

      function renderFamousSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.history_of_genetics', '🕰 History of genetics')),
          h('div', { className: 'space-y-2' },
            DNA_HISTORY.map(function(d, i) {
              return h('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  h('span', { className: 'text-[10px] font-mono text-emerald-700 font-bold' }, d.year),
                  h('span', { className: 'text-[12px] font-black text-emerald-900' }, d.who)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, d.what)
              );
            })
          )
        );
      }

      function renderMutInquirySection() {
        var iq = d2.mutInquiry || { mutRate: 1e-7, popSize: 1e6, generations: 100, selection: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { setExp({ mutInquiry: Object.assign({}, iq, patch) }); }
        function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
        // expected number of beneficial mutations: μ * N * G * f_beneficial (≈1%)
        var totalMuts = iq.mutRate * iq.popSize * iq.generations;
        var beneficial = totalMuts * 0.01;
        // Probability one beneficial mutation sweeps to fixation. Use the full Kimura
        // (1962) diploid formula: (1 − e^(−2s)) / (1 − e^(−4Ns)). Special-cases:
        //   • s = 0 (neutral)   → 1/(2N)   (drift fixation)
        //   • Ns ≫ 1 (strong)    → ~2s     (Haldane limit)
        //   • Ns ≪ 1 (weak)      → ~1/(2N) (effectively neutral)
        // The old `2s` form contradicted both the widget's own neutral-mutation open
        // question ("s=0 → fixProb = 1/(2N)") AND the disclaimer text that already
        // recommended Kimura. Guard against overflow in exp(−4Ns) for large N·s.
        var s = iq.selection;
        var Ns = iq.popSize * s;
        var fixProb;
        if (s === 0) {
          fixProb = 1 / (2 * iq.popSize);
        } else if (Math.abs(4 * Ns) > 700) {
          // exp overflow → Haldane limit (or 0 if s < 0)
          fixProb = s > 0 ? 2 * s : 0;
        } else {
          var num = 1 - Math.exp(-2 * s);
          var den = 1 - Math.exp(-4 * Ns);
          fixProb = den === 0 ? 1 / (2 * iq.popSize) : num / den;
        }
        fixProb = Math.min(0.95, Math.max(0, fixProb));
        var expectedFixed = beneficial * fixProb;
        var state = expectedFixed < 0.01 ? 'static' : expectedFixed < 0.5 ? 'driftdom' : expectedFixed < 5 ? 'slowevo' : expectedFixed < 50 ? 'fastevo' : 'runaway';
        var sm = ({
          static: { label: t('stem.dna.static', 'Static'), color: '#94a3b8', bg: '#1e293b', border: '#475569', desc: t('stem.dna.essentially_no_beneficial_fixation_exp', 'Essentially no beneficial fixation expected. Population is in mutation-selection balance or drift-only.') },
          driftdom: { label: 'Drift-dominated', color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: t('stem.dna.drift_dominates_few_expected_fixations', 'Drift dominates: few expected fixations even though mutations occur. Common in small populations.') },
          slowevo: { label: t('stem.dna.slow_evolution', 'Slow evolution'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: t('stem.dna.a_handful_of_beneficial_mutations_expe', 'A handful of beneficial mutations expected to fix. Standard for most natural populations.') },
          fastevo: { label: t('stem.dna.fast_evolution', 'Fast evolution'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: t('stem.dna.many_fixations_expected_strong_selecti', 'Many fixations expected — strong selection, large population, or both. E.g., bacterial antibiotic resistance.') },
          runaway: { label: t('stem.dna.runaway_adaptation', 'Runaway adaptation'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: t('stem.dna.extreme_regime_viruses_cancer_cell_lin', 'Extreme regime: viruses, cancer cell lines, asexual lab populations. Many simultaneous adaptive sweeps.') }
        })[state];
        // SVG: log-log mutation×population scatter with current point
        function logX(v) { return 30 + (Math.log10(Math.max(1, v)) / 9) * 270; }
        function logY(v) { return 130 - Math.min(110, (Math.log10(Math.max(1e-12, v)) + 12) / 12 * 110); }
        return h('div', { className: 'rounded-xl p-4', style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
          h('h3', { style: { margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, t('stem.dna.mutation_inquiry_drift_selection_fixat', '🔬 Mutation Inquiry — Drift, Selection, Fixation')),
          h('p', { style: { margin: '0 0 8px', fontSize: 11, opacity: 0.85, lineHeight: 1.4 } }, t('stem.dna.set_per_base_mutation_rate_population_', 'Set per-base mutation rate, population size, generations, and selection coefficient. Predict how many beneficial mutations actually sweep to fixation. No score, no reveal.')),
          h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: sm.color, color: '#000', fontSize: 11, fontWeight: 800, marginBottom: 6 } }, sm.label + ' · ~' + expectedFixed.toFixed(2) + ' fixations expected'),
          h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 } },
            [
              { label: t('stem.dna.total_mutations', 'Total mutations'), val: totalMuts.toExponential(2) },
              { label: '~Beneficial', val: beneficial.toExponential(2) },
              { label: t('stem.dna.fix_prob_kimura', 'Fix prob (Kimura)'), val: (fixProb * 100).toFixed(2) + '%' }
            ].map(function(m) {
              return h('div', { key: m.label, style: { padding: 6, borderRadius: 4, background: '#0a0a1a', border: '1px solid ' + sm.border, textAlign: 'center' } },
                h('div', { style: { fontSize: 9, opacity: 0.6 } }, m.label),
                h('div', { style: { fontSize: 11, fontWeight: 700, color: sm.color, fontFamily: 'monospace' } }, m.val)
              );
            })
          ),
          h('svg', { width: '100%', height: 160, viewBox: '0 0 320 160', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 10 } },
            h('line', { x1: 30, y1: 130, x2: 300, y2: 130, stroke: '#1e293b' }),
            h('line', { x1: 30, y1: 20, x2: 30, y2: 130, stroke: '#1e293b' }),
            [1, 1000, 1e6, 1e9].map(function(p, i) { return h('text', { key: 'nx' + i, x: logX(p), y: 145, fill: '#64748b', fontSize: 8, textAnchor: 'middle' }, '10^' + Math.log10(p).toFixed(0)); }),
            [1e-10, 1e-7, 1e-4, 1e-1].map(function(r, i) { return h('text', { key: 'ry' + i, x: 24, y: logY(r), fill: '#64748b', fontSize: 8, textAnchor: 'end' }, '10^' + Math.log10(r).toFixed(0)); }),
            // background zones (drift vs selection regimes for human, bacterial, virus)
            h('circle', { cx: logX(1e4), cy: logY(1e-8), r: 14, fill: '#22d3ee', opacity: 0.2 }),
            h('text', { x: logX(1e4) + 18, y: logY(1e-8) + 3, fill: '#22d3ee', fontSize: 8, fontWeight: 700 }, t('stem.dna.human_drift', 'human (drift)')),
            h('circle', { cx: logX(1e9), cy: logY(1e-9), r: 14, fill: '#4ade80', opacity: 0.2 }),
            h('text', { x: logX(1e9) - 5, y: logY(1e-9) + 3, fill: '#4ade80', fontSize: 8, fontWeight: 700, textAnchor: 'end' }, 'bacterial'),
            h('circle', { cx: logX(1e8), cy: logY(1e-5), r: 14, fill: '#f87171', opacity: 0.2 }),
            h('text', { x: logX(1e8) + 18, y: logY(1e-5) + 3, fill: '#f87171', fontSize: 8, fontWeight: 700 }, 'virus'),
            h('circle', { cx: logX(iq.popSize), cy: logY(iq.mutRate), r: 6, fill: sm.color, stroke: '#fff', strokeWidth: 1.5 }),
            h('text', { x: 160, y: 158, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, t('stem.dna.log_n_vs_log_circles_typical_regimes', 'log₁₀(N) vs log₁₀(μ) — circles = typical regimes'))
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px', marginBottom: 10 } },
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.dna.mutation_rate_log', 'Mutation rate μ (log)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.mutRate.toExponential(1))),
              h('input', { type: 'range', min: -10, max: -2, step: 0.5, value: Math.log10(iq.mutRate), onChange: function(e) { setKey('mutRate', Math.pow(10, parseFloat(e.target.value))); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.dna.population_size_n_log', 'Population size N (log)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.popSize.toExponential(1))),
              h('input', { type: 'range', min: 1, max: 10, step: 0.5, value: Math.log10(iq.popSize), onChange: function(e) { setKey('popSize', Math.pow(10, parseFloat(e.target.value))); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.dna.generations', 'Generations')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.generations)),
              h('input', { type: 'range', min: 1, max: 10000, step: 1, value: iq.generations, onChange: function(e) { setKey('generations', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, t('stem.dna.selection_coef_s', 'Selection coef s')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.selection.toFixed(3))),
              h('input', { type: 'range', min: 0, max: 0.5, step: 0.005, value: iq.selection, onChange: function(e) { setKey('selection', parseFloat(e.target.value)); }, style: { width: '100%' } })
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('button', { onClick: function() {
              var t = new Date().toISOString().slice(11, 19);
              setIQ({ log: iq.log.concat([{ t: t, mu: iq.mutRate.toExponential(1), N: iq.popSize.toExponential(1), g: iq.generations, s: iq.selection.toFixed(3), fix: expectedFixed.toFixed(2), state: sm.label }]) });
            }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, t('stem.dna.log_this_evolutionary_regime', '📋 Log this evolutionary regime')),
            h('button', { onClick: function() { setIQ({ mutRate: 1e-7, popSize: 1e6, generations: 100, selection: 0 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, t('stem.dna.reset_5', 'Reset'))
          ),
          iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: '#0a0a1a', border: '1px solid #1e293b', marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
            iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · μ' + e.mu + ' N' + e.N + ' g' + e.g + ' s' + e.s + ' → ' + e.fix); })
          ),
          h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, t('stem.dna.your_hypothesis_which_slider_has_the_b', 'Your hypothesis (which slider has the biggest leverage on fixation rate? Why?)')),
          h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: t('stem.dna.e_g_selection_has_more_leverage_than_o', 'e.g., selection has more leverage than μ once N is large enough...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
          !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, t('stem.dna.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
          iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: '#0a0a1a', border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
            h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, t('stem.dna.open_questions_no_answer_key', 'Open questions (no answer key)')),
            h('ul', { style: { margin: 0, paddingLeft: 16 } },
              h('li', null, t('stem.dna.when_does_the_regime_move_from_drift_d', 'When does the regime move from drift-dominated to selection-dominated? What does N·s tell you?')),
              h('li', null, t('stem.dna.why_are_antibiotic_resistance_and_vira', 'Why are antibiotic resistance and viral evolution so fast — which sliders are at their extreme?')),
              h('li', null, t('stem.dna.a_neutral_mutation_s_0_has_fixation_pr', 'A neutral mutation (s = 0) has fixation probability 1/(2N). What does that mean for large populations?')),
              h('li', null, t('stem.dna.could_the_same_population_size_be_drif', 'Could the same population size be "drift-dominated" for weak mutations and "selection-dominated" for strong ones simultaneously?'))
            )
          ),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
            h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
            h('span', null, t('stem.dna.i_can_explain_why_this_n_g_s_combinati', 'I can explain why this μ × N × g × s combination yields this regime.'))
          ),
          iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: t('stem.dna.explain_in_your_own_words', 'Explain in your own words...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 6, resize: 'vertical' } }),
          h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, t('stem.dna.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump. Uses the full Kimura (1962) diploid fixation formula (1−e^(−2s))/(1−e^(−4Ns)), which interpolates between Haldane\'s ~2s in the strong-selection limit (Ns≫1) and the neutral 1/(2N) in the drift limit (Ns≪1 or s=0).'))
        );
      }

      function renderActiveSection() {
        if (expSection === 'mutInquiry') return renderMutInquirySection();
        if (expSection === 'bases') return renderBasesSection();
        if (expSection === 'code') return renderCodeSection();
        if (expSection === 'replication') return renderReplicationSection();
        if (expSection === 'transcription') return renderTranscriptionSection();
        if (expSection === 'translation') return renderTranslationSection();
        if (expSection === 'mutations') return renderMutationsSection();
        if (expSection === 'chromosomes') return renderChromosomesSection();
        if (expSection === 'dnarna') return renderDnaRnaSection();
        if (expSection === 'biotech') return renderBiotechSection();
        if (expSection === 'diseases') return renderDiseasesSection();
        if (expSection === 'evolution') return renderEvolutionSection();
        if (expSection === 'genomes') return renderGenomesSection();
        if (expSection === 'meiosis') return renderMeiosisSection();
        if (expSection === 'mendel') return renderMendelSection();
        if (expSection === 'epigenetics') return renderEpigeneticsSection();
        if (expSection === 'amino') return renderAminoSection();
        if (expSection === 'organelles') return renderOrganellesSection();
        if (expSection === 'celltypes') return renderCellTypesSection();
        if (expSection === 'sequencing') return renderSequencingSection();
        if (expSection === 'ethics') return renderEthicsSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'pcr') return renderPcrSection();
        if (expSection === 'crispr') return renderCrisprSection();
        if (expSection === 'viruses') return renderVirusesSection();
        if (expSection === 'microbiome') return renderMicrobiomeSection();
        if (expSection === 'devel') return renderDevelSection();
        if (expSection === 'cancer') return renderCancerSection();
        if (expSection === 'immunity') return renderImmunitySection();
        if (expSection === 'neuro') return renderNeuroSection();
        if (expSection === 'tree') return renderTreeSection();
        if (expSection === 'biotech2') return renderBiotech2Section();
        if (expSection === 'animals2') return renderAnimals2Section();
        if (expSection === 'plants') return renderPlantsSection();
        if (expSection === 'famousgenes') return renderFamousGenesSection();
        if (expSection === 'modelorg') return renderModelorgSection();
        if (expSection === 'ecology') return renderEcologySection();
        if (expSection === 'periodtable_bio') return renderPeriodTableBioSection();
        if (expSection === 'pathways') return renderPathwaysSection();
        if (expSection === 'extinct') return renderExtinctSection();
        if (expSection === 'organ_systems') return renderOrganSystemsSection();
        if (expSection === 'hormones') return renderHormonesSection();
        if (expSection === 'vitamins') return renderVitaminsSection();
        if (expSection === 'animal_groups') return renderAnimalGroupsSection();
        if (expSection === 'famous_orgs') return renderFamousOrgsSection();
        if (expSection === 'traceTrait') return renderTraceTraitSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var DOG_GENETICS = [
        { breed: 'Dalmatian', trait: 'Spots', genetics: 'Two genes (S + T loci). Born white; spots develop in first weeks.', notes: 'All Dalmatians historically had uric-acid metabolism mutation → kidney stone risk.' },
        { breed: 'Golden Retriever', trait: 'Coat color', genetics: 'E-locus extension gene — recessive ee gives yellow/red coat.', notes: 'All Goldens are ee for that locus. Variation in shade due to other genes.' },
        { breed: 'Border Collie', trait: 'Herding behavior', genetics: 'Strongly heritable behavioral trait. Several genes implicated.', notes: 'Most intelligent dog breed by some measures (vocabulary tests).' },
        { breed: 'Bulldog (English)', trait: 'Flat face', genetics: 'Brachycephalic syndrome. Selective breeding shaped skull dramatically.', notes: 'Most cannot give birth naturally — ~80% require C-section.' },
        { breed: 'Pug', trait: 'Curly tail + flat face', genetics: 'Similar brachycephalic genetics.', notes: 'Breathing + eye problems common.' },
        { breed: 'Greyhound', trait: 'Speed', genetics: 'Muscle composition + body proportions.', notes: 'Up to ~72 km/h. Heart proportionally larger than other breeds.' },
        { breed: 'Chihuahua', trait: 'Tiny size', genetics: 'IGF1 gene variants.', notes: 'Smallest dog breed. Adults 1-3 kg.' },
        { breed: 'Great Dane', trait: 'Huge size', genetics: 'IGF1 variants opposite of small breeds.', notes: 'Can reach 90+ kg. Short lifespan (~7 years).' },
        { breed: 'Husky / Malamute', trait: 'Blue eyes (some)', genetics: 'Variant near ALX4 gene.', notes: 'About 40% of Huskies have at least one blue eye.' },
        { breed: 'Poodle', trait: 'Curly hypoallergenic coat', genetics: 'KRT71 mutation → curl.', notes: '"Hypoallergenic" overstated — all dogs produce allergenic proteins.' },
        { breed: 'Basenji', trait: 'Doesn\'t bark', genetics: 'Unusual larynx shape.', notes: 'African breed. "Sings" or yodels instead. Genetically distinct from most modern breeds.' }
      ];

      var WILD_DNA_FACTS = [
        { fact: t('stem.dna.octopus_has_33_000_genes', 'Octopus has 33,000 genes'), detail: t('stem.dna.more_than_humans_20_000_many_novel_gen', 'More than humans (~20,000). Many novel genes for sensing + cognition.') },
        { fact: t('stem.dna.tardigrade_dna_repair', 'Tardigrade DNA repair'), detail: t('stem.dna.special_protein_dsup_wraps_dna_protect', 'Special protein (Dsup) wraps DNA + protects against X-ray damage. Studied for radiation therapy applications.') },
        { fact: t('stem.dna.naked_mole_rat_cancer_resistance', 'Naked mole rat cancer resistance'), detail: t('stem.dna.hypersensitive_contact_inhibition_high', 'Hypersensitive contact inhibition + high-molecular-weight hyaluronan. Cancer extremely rare.') },
        { fact: t('stem.dna.elephant_tp53_redundancy', 'Elephant TP53 redundancy'), detail: t('stem.dna.elephants_have_20_copies_of_tumor_supp', 'Elephants have ~20 copies of tumor suppressor TP53 (humans have 1). Possible explanation for low cancer rates despite huge cell number.') },
        { fact: t('stem.dna.salamander_regeneration', 'Salamander regeneration'), detail: t('stem.dna.axolotl_can_regrow_limbs_spinal_cord_h', 'Axolotl can regrow limbs, spinal cord, heart, even portions of brain. Studied for regenerative medicine.') },
        { fact: t('stem.dna.camel_hump', 'Camel hump'), detail: t('stem.dna.stores_fat_not_water_myth_allows_survi', 'Stores fat, not water (myth). Allows survival without food for weeks. Water comes from drinking + metabolic byproduct.') },
        { fact: t('stem.dna.cheetah_inbreeding', 'Cheetah inbreeding'), detail: t('stem.dna.population_crashed_12_000_years_ago_ge', 'Population crashed ~12,000 years ago. Genetic bottleneck → very low diversity. All cheetahs basically twins genetically.') },
        { fact: t('stem.dna.whale_evolution', 'Whale evolution'), detail: t('stem.dna.modern_whales_descended_from_land_mamm', 'Modern whales descended from land mammals (~50 mya). Closest living relatives: hippos. Vestigial pelvis bones remain.') },
        { fact: t('stem.dna.plant_chromosome_counts', 'Plant chromosome counts'), detail: t('stem.dna.wide_variation_adder_s_tongue_fern_720', 'Wide variation. Adder\'s tongue fern: ~720 pairs (most ever). Rice: 12 pairs. Humans: 23 pairs.') },
        { fact: t('stem.dna.bdelloid_rotifers', 'Bdelloid rotifers'), detail: t('stem.dna.all_female_asexual_for_80_million_year', 'All-female, asexual for ~80 million years. Acquire genes from other species (HGT) instead of mixing via sex.') },
        { fact: t('stem.dna.coelacanth', 'Coelacanth'), detail: t('stem.dna.lobe_finned_fish_thought_extinct_since', 'Lobe-finned fish thought extinct since dinosaur age. Living specimens found 1938. Lineage ~400 million years old.') },
        { fact: t('stem.dna.horseshoe_crab_blood', 'Horseshoe crab blood'), detail: t('stem.dna.blue_copper_based_hemocyanin_detects_b', 'Blue (copper-based hemocyanin). Detects bacterial endotoxins — used to test vaccines + medical devices.') },
        { fact: t('stem.dna.polar_bear_evolution', 'Polar bear evolution'), detail: t('stem.dna.diverged_from_brown_bears_150_000_500_', 'Diverged from brown bears ~150,000-500,000 years ago. Some grizzly-polar hybrids ("pizzly" or "grolar") confirmed in wild.') }
      ];

      function renderFamousOrgsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.dog_breed_genetics_wild_dna_facts', '🐕 Dog breed genetics + wild DNA facts')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.dog_breed_genetics', 'Dog breed genetics')),
            h('div', { className: 'space-y-2' },
              DOG_GENETICS.map(function(d, i) {
                return h('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[12px] font-black text-slate-800' }, d.breed),
                    h('span', { className: 'text-[10px] text-emerald-700 italic ml-auto' }, d.trait)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700 mb-1' }, h('strong', null, 'Genetics: '), d.genetics),
                  h('div', { className: 'text-[10px] text-slate-600 italic' }, d.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.wild_dna_biology_trivia', 'Wild DNA + biology trivia')),
          h('div', { className: 'space-y-1' },
            WILD_DNA_FACTS.map(function(w, i) {
              return h('div', { key: 'w'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, w.fact),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, w.detail)
              );
            })
          )
        );
      }

      var ANIMAL_GROUPS = [
        { phylum: 'Porifera', common: 'Sponges', features: 'Multicellular, no true tissues, filter feeders', examples: 'Sea sponges', notes: '~8,500 species. No organs. Among oldest animal lineages.' },
        { phylum: 'Cnidaria', common: 'Jellyfish, corals, sea anemones, hydras', features: 'Radial symmetry, stinging cells (cnidocytes), two body forms (polyp + medusa)', examples: 'Box jellyfish, brain coral, Portuguese man o\' war', notes: '~10,000 species. Some virtually immortal (Turritopsis).' },
        { phylum: 'Platyhelminthes', common: 'Flatworms (incl. tapeworms, planaria, flukes)', features: 'Flat body, no body cavity, bilateral symmetry', examples: 'Tapeworm, liver fluke, planaria', notes: '~20,000 species. Planaria can regenerate from tiny fragments.' },
        { phylum: 'Nematoda', common: 'Roundworms', features: 'Long, thin, unsegmented', examples: 'C. elegans, hookworm, Trichinella', notes: '~25,000 described, but estimated millions of species. Most abundant animals on Earth.' },
        { phylum: 'Annelida', common: 'Segmented worms', features: 'Segmented body, closed circulatory system', examples: 'Earthworm, leech, marine bristle worms', notes: '~17,000 species. Important soil engineers.' },
        { phylum: 'Mollusca', common: 'Snails, clams, octopuses, squid', features: 'Soft body, often with shell, muscular foot', examples: 'Garden snail, octopus, scallop, giant squid', notes: '~85,000 living species. Octopuses are among most intelligent invertebrates.' },
        { phylum: 'Arthropoda', common: 'Insects, spiders, crustaceans, centipedes', features: 'Exoskeleton (chitin), segmented body, jointed legs', examples: 'Ant, spider, lobster, butterfly', notes: '~1.1 million described — most of all animals. Probably 5-10× more undescribed.' },
        { phylum: 'Echinodermata', common: 'Starfish, sea urchins, sea cucumbers, sand dollars', features: 'Radial symmetry (as adults), water vascular system, calcareous endoskeleton', examples: 'Sea star, sea urchin, sand dollar', notes: '~7,000 species. All marine. Bilateral as larvae.' },
        { phylum: 'Chordata', common: 'Vertebrates + close relatives', features: 'Notochord (or backbone), dorsal hollow nerve cord, gill slits at some stage, post-anal tail', examples: 'Fish, frogs, birds, mammals, humans', notes: '~65,000 species. Includes us.' }
      ];

      var VERTEBRATE_CLASSES = [
        { class_: 'Agnatha (jawless fish)', features: 'No jaws, cartilaginous skeleton', examples: 'Lamprey, hagfish', notes: 'Most ancient vertebrate lineage.' },
        { class_: 'Chondrichthyes', features: 'Cartilaginous skeleton, paired jaws + fins', examples: 'Sharks, rays, skates', notes: '~1,200 species. Hammerhead, great white, manta ray.' },
        { class_: 'Osteichthyes (bony fish)', features: 'Bony skeleton, swim bladder, gills', examples: 'Salmon, tuna, goldfish, coelacanth', notes: 'Largest vertebrate group. ~32,000 species. Includes ray-finned + lobe-finned.' },
        { class_: 'Amphibia', features: 'Moist skin, metamorphosis (in many), lay eggs in water', examples: 'Frog, salamander, caecilian', notes: '~8,000 species. Permeable skin makes them sensitive to pollution.' },
        { class_: 'Reptilia', features: 'Scaly skin, lay shelled eggs on land (or live bear), ectothermic', examples: 'Snake, turtle, crocodile, lizard, tuatara', notes: '~11,500 species. Birds are technically reptiles (modern cladistics).' },
        { class_: 'Aves (birds)', features: 'Feathers, beak, hollow bones, lay hard-shelled eggs, endothermic', examples: 'Sparrow, eagle, penguin, ostrich, hummingbird', notes: '~11,000 species. Evolved from theropod dinosaurs.' },
        { class_: 'Mammalia', features: 'Hair/fur, mammary glands, live birth (mostly), endothermic, 3 middle ear bones', examples: 'Mouse, whale, bat, human, kangaroo, platypus', notes: '~6,500 species. Three main groups: monotremes, marsupials, placentals.' }
      ];

      function renderAnimalGroupsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.animal_classification', '🦁 Animal classification')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.major_animal_phyla', 'Major animal phyla')),
            h('div', { className: 'space-y-2' },
              ANIMAL_GROUPS.map(function(a, i) {
                return h('div', { key: 'a'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[12px] font-black text-slate-800' }, a.phylum),
                    h('span', { className: 'text-[10px] text-emerald-700 ml-auto' }, a.common)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700 mb-1' }, h('strong', null, 'Features: '), a.features),
                  h('div', { className: 'text-[10px] text-slate-700 mb-1' }, h('strong', null, 'Examples: '), a.examples),
                  h('div', { className: 'text-[10px] text-slate-600 italic' }, a.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.vertebrate_classes_subset_of_chordata', 'Vertebrate classes (subset of Chordata)')),
          h('div', { className: 'space-y-1' },
            VERTEBRATE_CLASSES.map(function(v, i) {
              return h('div', { key: 'v'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, v.class_),
                h('div', { className: 'text-[10px] text-slate-700 mb-0.5' }, h('strong', null, 'Features: '), v.features),
                h('div', { className: 'text-[10px] text-slate-700 mb-0.5' }, h('strong', null, 'Examples: '), v.examples),
                h('div', { className: 'text-[10px] text-slate-600 italic' }, v.notes)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final dna data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var VITAMINS = [
        { vitamin: 'A (retinol)', solubility: 'Fat', sources: 'Liver, eggs, dairy, orange/yellow veg (as β-carotene)', role: 'Vision (rhodopsin), immune, skin, growth', deficit: 'Night blindness, xerophthalmia, immune compromise. Toxic in excess (especially retinol form).' },
        { vitamin: 'B1 (thiamine)', solubility: 'Water', sources: 'Whole grains, pork, legumes, fortified foods', role: 'Energy metabolism (cofactor for pyruvate dehydrogenase)', deficit: 'Beriberi (cardio + neuro). Wernicke-Korsakoff in alcoholism.' },
        { vitamin: 'B2 (riboflavin)', solubility: 'Water', sources: 'Dairy, eggs, leafy greens, fortified grains', role: 'FAD + FMN — electron carriers', deficit: 'Cracked lips, sore throat, anemia. Rarely deficient alone.' },
        { vitamin: 'B3 (niacin)', solubility: 'Water', sources: 'Meat, fish, peanuts, fortified grains', role: 'NAD + NADP — major electron carriers', deficit: 'Pellagra: dermatitis, diarrhea, dementia, death.' },
        { vitamin: 'B5 (pantothenic acid)', solubility: 'Water', sources: 'Wide variety', role: 'Coenzyme A — central to metabolism', deficit: 'Very rare. Almost never seen due to wide food distribution.' },
        { vitamin: 'B6 (pyridoxine)', solubility: 'Water', sources: 'Meat, fish, potatoes, bananas, chickpeas', role: 'Amino acid + neurotransmitter metabolism', deficit: 'Anemia, dermatitis, depression. Toxic in extreme excess (neuropathy).' },
        { vitamin: 'B7 (biotin)', solubility: 'Water', sources: 'Egg yolks, nuts, legumes, gut bacteria', role: 'Carboxylase enzymes (fatty acid synthesis, gluconeogenesis)', deficit: 'Rare — caused by raw egg whites long-term (avidin binds biotin).' },
        { vitamin: 'B9 (folate)', solubility: 'Water', sources: 'Leafy greens, legumes, fortified grains', role: 'Nucleotide synthesis, methylation', deficit: 'Megaloblastic anemia, neural tube defects. Critical pre-conception + pregnancy.' },
        { vitamin: 'B12 (cobalamin)', solubility: 'Water', sources: 'Animal products (meat, fish, dairy, eggs)', role: 'Nucleotide synthesis, nerve myelination', deficit: 'Megaloblastic anemia, permanent neurological damage. Vegans need supplements.' },
        { vitamin: 'C (ascorbic acid)', solubility: 'Water', sources: 'Citrus, peppers, broccoli, strawberries', role: 'Collagen synthesis, antioxidant, iron absorption', deficit: 'Scurvy (gum bleeding, poor healing). Historically killed sailors.' },
        { vitamin: 'D (cholecalciferol)', solubility: 'Fat', sources: 'Sunlight (skin synthesis), fatty fish, fortified milk', role: 'Calcium + phosphorus absorption, immune', deficit: 'Rickets (kids), osteomalacia (adults). Common in northern winters.' },
        { vitamin: 'E (α-tocopherol)', solubility: 'Fat', sources: 'Nuts, seeds, vegetable oils, leafy greens', role: 'Antioxidant — protects cell membranes', deficit: 'Rare. Neurological problems in deficiency.' },
        { vitamin: 'K1 (phylloquinone)', solubility: 'Fat', sources: 'Leafy greens', role: 'Blood clotting (carboxylation of clotting factors)', deficit: 'Bleeding. Newborns get vitamin K injection.' },
        { vitamin: 'K2 (menaquinone)', solubility: 'Fat', sources: 'Fermented foods (natto), gut bacteria, animal products', role: 'Calcium regulation, bone + cardiovascular health', deficit: 'Possible role in osteoporosis. Less established than K1.' }
      ];

      var MINERAL_NUTRIENTS = [
        { mineral: 'Calcium', daily: '~1000-1200 mg', role: 'Bones, teeth, muscle contraction, signaling', sources: 'Dairy, leafy greens, fortified plant milk' },
        { mineral: 'Iron', daily: '~8-18 mg', role: 'Hemoglobin, myoglobin, electron transport', sources: 'Red meat, beans, lentils, fortified grains. Heme iron (animal) more bioavailable.' },
        { mineral: 'Magnesium', daily: '~310-420 mg', role: 'Cofactor for ~300 enzymes, ATP-Mg complex, nerve + muscle', sources: 'Nuts, seeds, whole grains, leafy greens' },
        { mineral: 'Phosphorus', daily: '~700 mg', role: 'Bones, ATP, DNA backbone, cell membranes', sources: 'Dairy, meat, nuts, beans' },
        { mineral: 'Potassium', daily: '~3500-4700 mg', role: 'Major intracellular cation, nerve + muscle', sources: 'Bananas, potatoes, beans, leafy greens, citrus' },
        { mineral: 'Sodium', daily: '<2300 mg (UL)', role: 'Major extracellular cation, nerve impulses, BP', sources: 'Salt, processed foods. Most people exceed need.' },
        { mineral: 'Zinc', daily: '~8-11 mg', role: 'Immune function, wound healing, DNA synthesis', sources: 'Oysters, meat, legumes, seeds' },
        { mineral: 'Copper', daily: '~900 μg', role: 'Iron metabolism, electron transport, neurotransmitter synthesis', sources: 'Shellfish, organ meats, nuts, dark chocolate' },
        { mineral: 'Iodine', daily: '~150 μg', role: 'Thyroid hormones (T3, T4)', sources: 'Seafood, iodized salt, dairy. Deficiency caused goiter — iodized salt nearly eliminated it.' },
        { mineral: 'Selenium', daily: '~55 μg', role: 'Antioxidant enzymes (glutathione peroxidase)', sources: 'Brazil nuts (very high), seafood, meat. Just 1-2 Brazil nuts/day meets need.' },
        { mineral: 'Manganese', daily: '~1.8-2.3 mg', role: 'Enzyme cofactor', sources: 'Whole grains, nuts, leafy greens, tea' },
        { mineral: 'Chromium', daily: '~25-35 μg', role: 'Insulin function (debated)', sources: 'Broccoli, grape juice, whole grains' },
        { mineral: 'Molybdenum', daily: '~45 μg', role: 'Enzyme cofactor', sources: 'Legumes, grains, nuts' },
        { mineral: 'Fluoride', daily: '~3-4 mg', role: 'Strengthens tooth enamel + bone', sources: 'Fluoridated water, tea, seafood. Excess causes fluorosis.' },
        { mineral: 'Chloride', daily: '~2300 mg', role: 'Extracellular fluid balance, stomach HCl', sources: 'Salt (NaCl). Rarely deficient.' }
      ];

      function renderVitaminsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.vitamins_minerals', '💊 Vitamins + minerals')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.the_13_essential_vitamins', 'The 13 essential vitamins')),
            h('div', { className: 'space-y-2' },
              VITAMINS.map(function(v, i) {
                return h('div', { key: 'v'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[12px] font-black text-slate-800' }, v.vitamin),
                    h('span', { className: 'text-[10px] text-emerald-700 font-mono ml-auto px-2 py-0.5 rounded bg-emerald-100' }, v.solubility)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700 mb-1' }, h('strong', null, 'Sources: '), v.sources),
                  h('div', { className: 'text-[10px] text-slate-700 mb-1' }, h('strong', null, 'Role: '), v.role),
                  h('div', { className: 'text-[10px] text-slate-600 italic' }, h('strong', null, 'Deficit: '), v.deficit)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.essential_dietary_minerals', 'Essential dietary minerals')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Mineral', 'Daily intake', 'Role', 'Sources'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MINERAL_NUTRIENTS.map(function(m, i) {
                  return h('tr', { key: 'm'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, m.mineral),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 font-bold text-[10px]' }, m.daily),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, m.role),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, m.sources)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var ORGAN_SYSTEMS = [
        { system: 'Cardiovascular', parts: 'Heart, arteries, veins, capillaries, blood', function: 'Transports O₂, CO₂, nutrients, hormones, heat. Maintains pressure + circulation.', notes: 'Heart pumps ~5 L/min at rest. ~100,000 km of blood vessels in adult.' },
        { system: 'Respiratory', parts: 'Lungs, trachea, bronchi, alveoli, diaphragm', function: 'Exchange O₂ + CO₂ between air + blood.', notes: '~500 million alveoli in adult lungs. Surface area ~70 m² (tennis court).' },
        { system: 'Digestive', parts: 'Mouth, esophagus, stomach, small + large intestine, liver, pancreas', function: 'Break down food, absorb nutrients, eliminate waste.', notes: 'Small intestine ~6-7 m long (in living person; longer at autopsy after muscle relaxes).' },
        { system: 'Urinary (renal)', parts: 'Kidneys, ureters, bladder, urethra', function: 'Filter blood, regulate water/salt balance, excrete urea + other wastes.', notes: 'Kidneys filter ~180 L/day, reabsorb ~178 L → ~1-2 L urine.' },
        { system: 'Nervous', parts: 'Brain, spinal cord, peripheral nerves, sensory organs', function: 'Sense, process, respond. Coordinate body.', notes: '~86 billion neurons in brain. Each neuron makes thousands of synaptic connections.' },
        { system: 'Endocrine', parts: 'Pituitary, thyroid, parathyroid, adrenals, pancreas (islets), gonads, hypothalamus', function: 'Hormone-based slow signaling. Metabolism, growth, reproduction, stress.', notes: 'Hormones travel via blood — slower than nervous signals but reach all cells.' },
        { system: 'Immune', parts: 'Lymph nodes, spleen, thymus, bone marrow, lymphatic vessels, immune cells', function: 'Defense against pathogens. Surveillance + memory.', notes: 'Innate (fast, non-specific) + adaptive (slow, specific, has memory).' },
        { system: 'Lymphatic', parts: 'Lymph vessels, lymph nodes, lymph fluid', function: 'Return interstitial fluid to bloodstream. Transport immune cells. Absorb fats from gut.', notes: 'Closely tied to immune system. No central pump — flows via muscle compression.' },
        { system: 'Muscular', parts: 'Skeletal (~600), cardiac (heart), smooth (organs)', function: 'Movement (skeletal), pumping (cardiac), peristalsis + vasoconstriction (smooth).', notes: '~40% of body weight in adults. ATP-powered actin-myosin sliding.' },
        { system: 'Skeletal', parts: '206 bones, joints, cartilage, ligaments, tendons', function: 'Support, protect, enable movement. Bone marrow makes blood cells.', notes: 'Born with ~270 bones — many fuse during growth. Largest: femur. Smallest: stapes (ear).' },
        { system: 'Integumentary', parts: 'Skin, hair, nails, sebaceous + sweat glands', function: 'Barrier to environment. Thermoregulation. Vitamin D synthesis. Sensory input.', notes: 'Largest organ. ~16% of body weight. Adult skin total ~1.5-2 m².' },
        { system: 'Reproductive', parts: 'Gonads (ovaries/testes), uterus, fallopian tubes, vagina, penis, prostate', function: 'Produce gametes + sex hormones. Enable reproduction.', notes: 'Only system that exists in two different anatomic configurations.' }
      ];

      var HORMONES = [
        { hormone: 'Insulin', source: 'Pancreas (β cells in islets of Langerhans)', target: 'Liver, muscle, fat', effect: 'Lowers blood glucose by promoting uptake + storage as glycogen + fat.' },
        { hormone: 'Glucagon', source: 'Pancreas (α cells)', target: 'Liver primarily', effect: 'Raises blood glucose. Stimulates glycogen breakdown + gluconeogenesis.' },
        { hormone: 'Thyroxine (T₄)', source: 'Thyroid gland', target: 'Most cells', effect: 'Sets metabolic rate. Converted to active T₃ in tissues.' },
        { hormone: 'Calcitonin', source: 'Thyroid (C cells)', target: 'Bones, kidneys', effect: 'Lowers blood calcium by promoting deposit in bone.' },
        { hormone: 'Parathyroid hormone (PTH)', source: 'Parathyroid glands', target: 'Bones, kidneys, gut', effect: 'Raises blood calcium. Opposite of calcitonin.' },
        { hormone: 'Cortisol', source: 'Adrenal cortex', target: 'Most cells', effect: 'Stress response. Raises blood glucose. Suppresses immune system. Anti-inflammatory.' },
        { hormone: 'Aldosterone', source: 'Adrenal cortex', target: 'Kidneys', effect: 'Retains Na⁺ + water, excretes K⁺. Raises blood pressure.' },
        { hormone: 'Epinephrine (adrenaline)', source: 'Adrenal medulla', target: 'Heart, muscles, smooth muscle', effect: 'Fight-or-flight: ↑ heart rate, ↑ blood glucose, dilates airways.' },
        { hormone: 'Norepinephrine', source: 'Adrenal medulla + nerve terminals', target: 'Blood vessels, heart', effect: 'Vasoconstriction, ↑ blood pressure. Sympathetic nervous system.' },
        { hormone: 'Growth hormone (GH)', source: 'Anterior pituitary', target: 'Most tissues, especially bone + muscle', effect: 'Stimulates growth. Acts via IGF-1 from liver.' },
        { hormone: 'ACTH', source: 'Anterior pituitary', target: 'Adrenal cortex', effect: 'Stimulates cortisol release. Part of HPA axis.' },
        { hormone: 'TSH', source: 'Anterior pituitary', target: 'Thyroid', effect: 'Stimulates T₃/T₄ production.' },
        { hormone: 'FSH', source: 'Anterior pituitary', target: 'Ovaries / testes', effect: 'Follicle development (♀) / sperm production (♂).' },
        { hormone: 'LH', source: 'Anterior pituitary', target: 'Ovaries / testes', effect: 'Triggers ovulation (♀) / testosterone production (♂).' },
        { hormone: 'Prolactin', source: 'Anterior pituitary', target: 'Mammary glands', effect: 'Milk production after childbirth.' },
        { hormone: 'Oxytocin', source: 'Posterior pituitary (made in hypothalamus)', target: 'Uterus, mammary glands, brain', effect: 'Childbirth contractions, milk letdown, social bonding.' },
        { hormone: 'ADH (vasopressin)', source: 'Posterior pituitary', target: 'Kidneys', effect: 'Water retention. Concentrates urine.' },
        { hormone: 'Melatonin', source: 'Pineal gland', target: 'Brain (SCN)', effect: 'Regulates sleep-wake cycle. Rises in darkness.' },
        { hormone: 'Estrogen (estradiol)', source: 'Ovaries + placenta', target: 'Reproductive tissues, bones, brain', effect: 'Female secondary sex traits, menstrual cycle, bone maintenance.' },
        { hormone: 'Progesterone', source: 'Ovaries (corpus luteum), placenta', target: 'Uterus, breast', effect: 'Maintains pregnancy. Prepares uterus for implantation.' },
        { hormone: 'Testosterone', source: 'Testes (Leydig cells) + adrenals (small amount)', target: 'Reproductive + muscle tissue', effect: 'Male secondary sex traits, muscle + bone growth, libido.' },
        { hormone: 'hCG', source: 'Placenta (after implantation)', target: 'Corpus luteum', effect: 'Maintains progesterone in early pregnancy. Detected by pregnancy tests.' },
        { hormone: 'Leptin', source: 'Fat cells', target: 'Hypothalamus', effect: 'Signals satiety. Long-term hunger regulation.' },
        { hormone: 'Ghrelin', source: 'Stomach', target: 'Hypothalamus', effect: 'Triggers hunger before meals.' },
        { hormone: 'Renin', source: 'Kidneys (juxtaglomerular cells)', target: 'Blood', effect: 'Initiates RAAS (renin-angiotensin-aldosterone) → blood pressure regulation.' },
        { hormone: 'Erythropoietin (EPO)', source: 'Kidneys', target: 'Bone marrow', effect: 'Stimulates red blood cell production. Notorious in athletic doping.' },
        { hormone: 'Atrial natriuretic peptide (ANP)', source: 'Heart (atria)', target: 'Kidneys + vessels', effect: 'Lowers blood pressure by promoting Na⁺ + water excretion.' },
        { hormone: 'Vitamin D (calcitriol)', source: 'Skin (with sunlight) → liver → kidney', target: 'Gut + bone', effect: 'Promotes Ca²⁺ absorption. Acts like steroid hormone despite being a vitamin.' }
      ];

      function renderOrganSystemsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.human_organ_systems', '🫀 Human organ systems')),
          h('div', { className: 'space-y-2' },
            ORGAN_SYSTEMS.map(function(o, i) {
              return h('div', { key: 'o'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, o.system),
                h('div', { className: 'text-[11px] text-emerald-700 mb-1' }, h('strong', null, 'Parts: '), o.parts),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Function: '), o.function),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed italic' }, o.notes)
              );
            })
          )
        );
      }

      function renderHormonesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.major_hormones', '⚛ Major hormones')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.hormones_travel_through_the_bloodstrea', 'Hormones travel through the bloodstream to act on distant target tissues. They orchestrate metabolism, growth, reproduction, stress response, and homeostasis.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Hormone', 'Source', 'Target', 'Effect'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                HORMONES.map(function(H, i) {
                  return h('tr', { key: 'H'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800 text-[10px]' }, H.hormone),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, H.source),
                    h('td', { className: 'px-2 py-1 text-emerald-700 text-[10px]' }, H.target),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, H.effect)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — Dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var BIO_ELEMENTS = [
        { element: 'Oxygen (O)', pct: '65%', role: 'In water (~60% of body) + organic molecules.' },
        { element: 'Carbon (C)', pct: '18%', role: 'Backbone of all organic molecules.' },
        { element: 'Hydrogen (H)', pct: '10%', role: 'Water + organic molecules. Most numerous atoms.' },
        { element: 'Nitrogen (N)', pct: '3%', role: 'Proteins (amino group) + DNA/RNA bases.' },
        { element: 'Calcium (Ca)', pct: '1.5%', role: 'Bones, teeth, muscle contraction, signaling.' },
        { element: 'Phosphorus (P)', pct: '1.0%', role: 'DNA backbone, ATP, bones, cell membranes.' },
        { element: 'Potassium (K)', pct: '0.4%', role: 'Major intracellular cation. Nerve + muscle function.' },
        { element: 'Sulfur (S)', pct: '0.3%', role: 'Amino acids cys + met. Disulfide bonds.' },
        { element: 'Sodium (Na)', pct: '0.2%', role: 'Major extracellular cation. Nerve impulses.' },
        { element: 'Chlorine (Cl)', pct: '0.2%', role: 'Stomach HCl. Negative counter-ion.' },
        { element: 'Magnesium (Mg)', pct: '0.05%', role: 'Cofactor for ~300 enzymes. ATP-Mg complex.' },
        { element: 'Iron (Fe)', pct: '0.006%', role: 'Hemoglobin (O₂ transport). Electron transport.' },
        { element: 'Zinc (Zn)', pct: '0.003%', role: 'Cofactor for many enzymes. Immune function.' },
        { element: 'Copper (Cu)', pct: '0.0001%', role: 'Cytochrome c oxidase. Iron metabolism.' },
        { element: 'Iodine (I)', pct: '0.00003%', role: 'Thyroid hormones (T₃, T₄).' },
        { element: 'Selenium (Se)', pct: 'trace', role: 'Antioxidant enzymes (glutathione peroxidase).' },
        { element: 'Manganese (Mn)', pct: 'trace', role: 'Cofactor for various enzymes.' },
        { element: 'Cobalt (Co)', pct: 'trace', role: 'Center of vitamin B12.' },
        { element: 'Molybdenum (Mo)', pct: 'trace', role: 'Cofactor for several enzymes.' },
        { element: 'Fluorine (F)', pct: 'trace', role: 'Strengthens tooth enamel (fluorapatite).' }
      ];

      var CELL_PATHWAYS = [
        { pathway: 'Glycolysis', input: 'Glucose', output: '2 pyruvate + 2 ATP + 2 NADH', location: 'Cytoplasm', notes: 'Universal pathway. Anaerobic. First step of cellular respiration.' },
        { pathway: 'Krebs (citric acid) cycle', input: 'Acetyl-CoA', output: 'CO₂ + ATP + NADH + FADH₂', location: 'Mitochondrial matrix', notes: '8 steps. Generates electron carriers for ETC.' },
        { pathway: 'Electron transport chain', input: 'NADH, FADH₂, O₂', output: '~32 ATP + H₂O', location: 'Inner mitochondrial membrane', notes: 'Where most ATP is made. Proton gradient drives ATP synthase.' },
        { pathway: 'Fermentation (lactic acid)', input: 'Pyruvate, NADH', output: 'Lactate + NAD⁺', location: 'Cytoplasm', notes: 'When oxygen is short. Muscle burn. Yogurt + sauerkraut bacteria.' },
        { pathway: 'Fermentation (alcoholic)', input: 'Pyruvate, NADH', output: 'Ethanol + CO₂ + NAD⁺', location: 'Cytoplasm', notes: 'Yeast. Bread, beer, wine.' },
        { pathway: 'Photosynthesis (light reactions)', input: 'H₂O, light, ADP, NADP⁺', output: 'O₂ + ATP + NADPH', location: 'Thylakoid membrane', notes: 'Splits water → O₂. Chlorophyll absorbs photons.' },
        { pathway: 'Calvin cycle (dark reactions)', input: 'CO₂, ATP, NADPH', output: 'Glucose (G3P)', location: 'Chloroplast stroma', notes: 'Fixes CO₂ into organic molecules. Doesn\'t require light directly.' },
        { pathway: 'Beta-oxidation', input: 'Fatty acids', output: 'Acetyl-CoA + NADH + FADH₂', location: 'Mitochondria + peroxisomes', notes: 'How fats are broken down for energy.' },
        { pathway: 'Urea cycle', input: 'NH₃ + CO₂', output: 'Urea (excreted in urine)', location: 'Liver mitochondria + cytosol', notes: 'Disposes of toxic ammonia from protein breakdown.' },
        { pathway: 'Gluconeogenesis', input: 'Pyruvate, amino acids', output: 'Glucose', location: 'Liver mainly', notes: 'Make glucose when blood sugar drops.' },
        { pathway: 'Pentose phosphate pathway', input: 'Glucose-6-phosphate', output: 'NADPH + ribose-5-phosphate', location: 'Cytoplasm', notes: 'Provides building blocks for nucleotides + reducing power.' },
        { pathway: 'Cholesterol synthesis', input: 'Acetyl-CoA', output: 'Cholesterol', location: 'Smooth ER (liver primarily)', notes: 'Target of statin drugs (HMG-CoA reductase step).' },
        { pathway: 'Apoptosis (intrinsic)', input: 'DNA damage, stress', output: 'Programmed cell death', location: 'Mitochondria → cytoplasm', notes: 'Releases cytochrome c. Activates caspases.' },
        { pathway: 'Apoptosis (extrinsic)', input: 'Death receptor activation', output: 'Programmed cell death', location: 'Cell surface → cytoplasm', notes: 'Initiated by external "death signals" (e.g., Fas/FasL).' },
        { pathway: 'Cell cycle (G1/S/G2/M)', input: 'Growth signals', output: 'Cell division', location: 'Nucleus + cytoplasm', notes: 'Tightly regulated by cyclins + cyclin-dependent kinases (CDKs).' },
        { pathway: 'MAPK signaling', input: 'Growth factor binding', output: 'Gene expression changes', location: 'Cytoplasm → nucleus', notes: 'Cascade of kinases. Mutations drive many cancers.' },
        { pathway: 'PI3K/AKT/mTOR', input: 'Insulin, growth factors', output: 'Cell growth, metabolism', location: 'Cytoplasm', notes: 'Promotes growth + protein synthesis. mTOR inhibitors as immunosuppressants + cancer drugs.' },
        { pathway: 'JAK-STAT', input: 'Cytokines', output: 'Transcription factor activation', location: 'Cytoplasm → nucleus', notes: 'Immune cell signaling. JAK inhibitors for autoimmune disease.' },
        { pathway: 'Notch signaling', input: 'Cell-cell contact (Notch ligand)', output: 'Cell fate decisions', location: 'Cell membrane → nucleus', notes: 'Developmental patterning. Lateral inhibition.' },
        { pathway: 'Wnt/β-catenin', input: 'Wnt protein binding', output: 'Stem cell maintenance + body axis', location: 'Cell membrane → nucleus', notes: 'Critical in embryonic patterning + adult stem cells. Mutations drive colon cancer.' }
      ];

      var EXTINCT_SPECIES = [
        { species: 'Wooly mammoth', when: '~4000 BP (last)', notes: 'Last on Wrangel Island. Climate + human hunting. Genome being studied for de-extinction.' },
        { species: 'Smilodon (saber-tooth cat)', when: '~10,000 BP', notes: 'Ice age predator of large prey. Massive canines.' },
        { species: 'Giant ground sloth', when: '~12,000 BP', notes: 'Up to 6 m long. Vanished as humans arrived in Americas.' },
        { species: 'Megatherium', when: '~10,000 BP', notes: 'Largest ground sloth (4 tons).' },
        { species: 'Cave bear', when: '~24,000 BP', notes: 'Ice age. Larger than modern brown bears.' },
        { species: 'Dodo', when: '1681 (last sighting)', notes: 'Flightless Mauritius pigeon relative. Hunted by humans + introduced rats/pigs.' },
        { species: 'Passenger pigeon', when: '1914 (last died in Cincinnati Zoo)', notes: 'Was perhaps most numerous bird ever (5 billion). Driven extinct by hunting + habitat loss.' },
        { species: 'Tasmanian tiger (thylacine)', when: '1936 (last died in zoo)', notes: 'Marsupial carnivore. Resembled striped wolf. Bounty hunting + disease.' },
        { species: 'Great auk', when: '1844', notes: 'Flightless North Atlantic bird. Hunted to extinction.' },
        { species: 'Steller\'s sea cow', when: '1768', notes: '8 m long sea cow. Eliminated within 27 years of European discovery.' },
        { species: 'Quagga', when: '1883', notes: 'Half-striped zebra. Selective breeding program now attempting reverse breeding.' },
        { species: 'Western black rhinoceros', when: '2011 (declared extinct)', notes: 'Subspecies of black rhino. Poaching for horn.' },
        { species: 'Caspian tiger', when: '~1970s', notes: 'Hunted to extinction in Central Asia.' },
        { species: 'Pyrenean ibex', when: '2000', notes: 'Last specimen cloned briefly in 2003 — first extinct species "resurrected".' },
        { species: 'Tyrannosaurus rex', when: '66 mya (K-Pg extinction)', notes: 'Cretaceous-Paleogene boundary. Asteroid impact at Chicxulub.' },
        { species: 'Triceratops', when: '66 mya', notes: 'Same K-Pg extinction.' },
        { species: 'Brachiosaurus', when: '~140 mya', notes: 'Late Jurassic.' },
        { species: 'Stegosaurus', when: '~150 mya', notes: 'Late Jurassic. Distinct plates + tail spikes.' },
        { species: 'Velociraptor', when: '~75 mya', notes: 'Smaller than Jurassic Park depiction (~turkey-sized). Likely feathered.' },
        { species: 'Pterodactyls (pterosaurs)', when: 'Various mya', notes: 'Flying reptiles. Not dinosaurs. Vanished with dinosaurs at K-Pg.' },
        { species: 'Megalodon', when: '~3.6 mya', notes: 'Giant shark, ~15-18 m long. Vanished as oceans cooled.' },
        { species: 'Trilobites', when: '252 mya (P-T extinction)', notes: 'Dominant Paleozoic arthropods for 270 million years. Vanished in greatest extinction event.' },
        { species: 'Ammonites', when: '66 mya', notes: 'Spiral-shelled cephalopods. K-Pg extinction.' },
        { species: 'Dimetrodon', when: '~270 mya', notes: 'Sail-backed synapsid. NOT a dinosaur — closer relative of mammals than reptiles.' },
        { species: 'Anomalocaris', when: '~520 mya', notes: 'Cambrian-era predator. ~1 m long, terrifying to trilobites.' },
        { species: 'Neanderthals', when: '~40,000 BP', notes: 'Closest extinct relative of modern humans. Most non-Africans carry 1-4% Neanderthal DNA.' },
        { species: 'Denisovans', when: '~30,000 BP', notes: 'Sister group to Neanderthals. Known mostly from DNA in finger bone + teeth. Tibetans carry adaptive Denisovan genes.' }
      ];

      function renderPeriodTableBioSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.elements_of_life', '⌬ Elements of life')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.approximate_elemental_composition_of_t', 'Approximate elemental composition of the human body by mass. Just 11 elements account for >99%. CHNOPS (C, H, N, O, P, S) make up almost all organic molecules.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Element', '% by mass', 'Role'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                BIO_ELEMENTS.map(function(e, i) {
                  return h('tr', { key: 'e'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, e.element),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 font-bold' }, e.pct),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, e.role)
                  );
                })
              )
            )
          )
        );
      }

      function renderPathwaysSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.major_cell_pathways', '⇄ Major cell pathways')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Pathway', 'Input', 'Output', 'Location', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                CELL_PATHWAYS.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800 text-[10px]' }, p.pathway),
                    h('td', { className: 'px-2 py-1 text-emerald-700 text-[10px]' }, p.input),
                    h('td', { className: 'px-2 py-1 text-emerald-700 font-medium text-[10px]' }, p.output),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, p.location),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderExtinctSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.extinct_species_2', '🦕 Extinct species')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.recent_extinctions_mostly_human_caused', 'Recent extinctions (mostly human-caused) + notable prehistoric extinctions. Earth has had 5 mass extinctions — many argue we\'re in a 6th now.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Species', 'When extinct', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                EXTINCT_SPECIES.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.species),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 text-[10px]' }, s.when),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var ANIMAL_FACTS = [
        { animal: 'African elephant', lifespan: '60-70 yr', genome: '3.2 Gb', notes: 'Largest land animal. Pregnancy ~22 months — longest of any mammal.' },
        { animal: 'Blue whale', lifespan: '80-90 yr', genome: '2.4 Gb', notes: 'Largest animal ever. Heart size of a small car. ~30 m long.' },
        { animal: 'Ostrich', lifespan: '40-45 yr', genome: '1.2 Gb', notes: 'Largest bird. Cannot fly. Eggs ~1.5 kg.' },
        { animal: 'Komodo dragon', lifespan: '~30 yr', genome: '1.5 Gb', notes: 'Largest lizard. Saliva harbors potent bacteria + venom.' },
        { animal: 'Cheetah', lifespan: '10-12 yr', genome: '2.4 Gb', notes: 'Fastest land animal (~110 km/h). Very low genetic diversity → inbreeding risk.' },
        { animal: 'Honeybee', lifespan: '6 wk (worker) / 5 yr (queen)', genome: '236 Mb', notes: 'Genetic sex determination via haploid males.' },
        { animal: 'Octopus (common)', lifespan: '1-2 yr', genome: '2.7 Gb', notes: 'Highly intelligent. Edits RNA extensively (unusual). Female dies after eggs hatch.' },
        { animal: 'Naked mole rat', lifespan: '30+ yr', genome: '2.8 Gb', notes: 'Extreme longevity for rodent. Cancer-resistant. Cold-blooded mammal (one of few).' },
        { animal: 'Tardigrade', lifespan: '~3 months / 10+ yr in cryptobiosis', genome: '~100 Mb', notes: 'Survives vacuum, radiation, dehydration. Cryptobiosis suspends metabolism.' },
        { animal: 'Hummingbird (bee)', lifespan: '~7-10 yr', genome: '~1 Gb', notes: 'Smallest bird. Hover via figure-8 wing motion. ~80 wingbeats/sec.' },
        { animal: 'Giant squid', lifespan: '~5 yr', genome: 'unknown', notes: 'Up to ~13 m long. Largest invertebrate eyes (basketball-sized).' },
        { animal: 'Mantis shrimp', lifespan: '~3-6 yr', genome: '~1.2 Gb', notes: '16 types of color receptors (humans: 3). Strikes faster than .22 caliber bullet.' },
        { animal: 'Bowhead whale', lifespan: '200+ yr', genome: '2.7 Gb', notes: 'Longest-lived mammal. Cancer resistance studied for human aging research.' },
        { animal: 'Greenland shark', lifespan: '300-500 yr', genome: 'unknown', notes: 'Longest-lived vertebrate. Slow growth + cold habitat.' },
        { animal: 'Cicadas (periodical)', lifespan: '13 or 17 yr', genome: 'small', notes: 'Spend years underground; emerge in massive swarms. Prime numbers — predator avoidance hypothesis.' },
        { animal: 'Anglerfish (female)', lifespan: '20+ yr', genome: 'unknown', notes: 'Bioluminescent lure. Males fuse permanently to females (parasitic mating).' }
      ];

      var PLANT_FACTS = [
        { topic: 'Photosynthesis', detail: t('stem.dna.6co_6h_o_light_c_h_o_6o_powered_by_chl', '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. Powered by chlorophyll. Source of most atmospheric oxygen.') },
        { topic: 'C3, C4, CAM pathways', detail: t('stem.dna.c3_most_plants_c4_corn_sugarcane_effic', 'C3 (most plants), C4 (corn, sugarcane — efficient at high T), CAM (cacti, succulents — open stomata at night to save water).') },
        { topic: 'Stomata', detail: t('stem.dna.tiny_pores_on_leaves_let_co_in_o_water', 'Tiny pores on leaves. Let CO₂ in + O₂/water out. Open/close in response to light, water, CO₂.') },
        { topic: 'Xylem', detail: t('stem.dna.carries_water_minerals_up_from_roots_d', 'Carries water + minerals UP from roots. Dead cells. Drives transpiration pull.') },
        { topic: 'Phloem', detail: t('stem.dna.carries_sugars_from_leaves_to_rest_of_', 'Carries sugars from leaves to rest of plant. Living cells. Bidirectional.') },
        { topic: 'Auxin', detail: t('stem.dna.plant_hormone_phototropism_growing_tow', 'Plant hormone. Phototropism (growing toward light). Concentration on dark side → cells elongate → bends toward light.') },
        { topic: 'Ethylene', detail: t('stem.dna.gas_hormone_ripens_fruit_why_ripe_bana', 'Gas hormone. Ripens fruit. Why ripe bananas ripen others. Stress signaling.') },
        { topic: 'Gibberellin', detail: t('stem.dna.promotes_stem_elongation_seed_germinat', 'Promotes stem elongation, seed germination, flowering.') },
        { topic: 'Cytokinin', detail: t('stem.dna.promotes_cell_division_delays_leaf_sen', 'Promotes cell division. Delays leaf senescence.') },
        { topic: 'Abscisic acid (ABA)', detail: t('stem.dna.stress_hormone_closes_stomata_when_wat', 'Stress hormone. Closes stomata when water-stressed. Promotes seed dormancy.') },
        { topic: 'Pollen + double fertilization', detail: t('stem.dna.angiosperm_unique_one_sperm_fertilizes', 'Angiosperm unique: one sperm fertilizes egg (embryo), one fertilizes polar nuclei (endosperm — food for seed).') },
        { topic: 'Coevolution with pollinators', detail: t('stem.dna.flower_shape_color_scent_match_pollina', 'Flower shape + color + scent match pollinator preferences. Some highly specialized (orchid + specific moth).') },
        { topic: 'Carnivorous plants', detail: t('stem.dna.evolved_in_nutrient_poor_soils_venus_f', 'Evolved in nutrient-poor soils. Venus flytrap (snap), pitcher plants (pitfall), sundew (sticky).') },
        { topic: 'Mycorrhiza', detail: t('stem.dna.symbiosis_with_fungi_fungi_extend_root', 'Symbiosis with fungi. Fungi extend root reach; plants supply sugars. ~85% of plant species.') },
        { topic: 'Nitrogen fixation (legumes)', detail: t('stem.dna.rhizobium_bacteria_in_root_nodules_con', 'Rhizobium bacteria in root nodules convert N₂ → NH₃. Why beans + peas are protein-rich + soil-improving.') },
        { topic: 'Crop genetics', detail: t('stem.dna.domestication_selected_larger_seeds_wh', 'Domestication selected larger seeds (wheat), non-shattering (rice), sweeter fruit (apples). Recent: hybrid corn, GM, marker-assisted selection.') },
        { topic: 'Polyploidy in plants', detail: t('stem.dna.common_in_plants_rare_in_animals_wheat', 'Common in plants (rare in animals). Wheat is hexaploid (6 sets), strawberry is octoploid. Often increases vigor + crop yield.') },
        { topic: 'Lignin', detail: t('stem.dna.stiffening_compound_in_cell_walls_of_w', 'Stiffening compound in cell walls of wood. Why wood is stiff + slow to decompose.') }
      ];

      var FAMOUS_GENES = [
        { gene: 'BRCA1, BRCA2', chr: '17q, 13q', function: 'DNA double-strand break repair', notes: 'Mutations greatly increase breast + ovarian cancer risk.' },
        { gene: 'TP53', chr: '17p', function: 'Tumor suppressor — "guardian of the genome"', notes: 'Mutated in ~50% of human cancers. Activates apoptosis when DNA damaged.' },
        { gene: 'APOE', chr: '19q', function: 'Lipid transport', notes: 'APOE4 variant: 3-4× increased Alzheimer\'s risk. APOE2 protective.' },
        { gene: 'CFTR', chr: '7q', function: 'Chloride channel in epithelial cells', notes: 'Mutations cause cystic fibrosis. ~1500 different mutations known.' },
        { gene: 'HBB', chr: '11p', function: 'β-globin (oxygen transport)', notes: 'Sickle cell + β-thalassemia mutations. Glu6Val in HbS.' },
        { gene: 'HTT', chr: '4p', function: 'Huntingtin (function not fully clear)', notes: 'Huntington\'s disease: CAG repeat expansion (>36).' },
        { gene: 'FMR1', chr: 'Xq', function: 'Fragile X mental retardation protein', notes: 'Most common inherited intellectual disability. CGG repeat expansion.' },
        { gene: 'DMD', chr: 'Xp', function: 'Dystrophin (muscle structure)', notes: 'Largest known human gene (~2.4 Mb, 79 exons). Mutations → Duchenne muscular dystrophy.' },
        { gene: 'SRY', chr: 'Yp', function: 'Sex-determining region', notes: 'Triggers testis development in mammals.' },
        { gene: 'MC1R', chr: '16q', function: 'Melanocortin 1 receptor', notes: 'Variants → red hair + fair skin. Higher melanoma risk.' },
        { gene: 'LCT', chr: '2q', function: 'Lactase (digests lactose)', notes: 'Most humans lose expression after weaning. Persistence common in pastoral populations.' },
        { gene: 'ALDH2', chr: '12q', function: 'Aldehyde dehydrogenase (alcohol metabolism)', notes: 'Variant common in East Asian populations causes "alcohol flush".' },
        { gene: 'CYP2D6', chr: '22q', function: 'Drug metabolism (cytochrome P450)', notes: '>100 variants. Affects ~25% of prescription drug metabolism.' },
        { gene: 'OPN1LW, OPN1MW, OPN1SW', chr: 'X (LW, MW), 7q (SW)', function: 'Cone opsins for color vision', notes: 'Variants cause color blindness (red-green: X-linked, common; blue: very rare).' },
        { gene: 'HLA complex', chr: '6p', function: 'Major histocompatibility complex', notes: 'Highly polymorphic. Tissue matching for transplants. Disease associations.' },
        { gene: 'FOXP2', chr: '7q', function: 'Transcription factor', notes: 'Speech + language. Mutations cause speech impairment.' },
        { gene: 'TAS2R38', chr: '7q', function: 'Bitter taste receptor', notes: 'Determines PTC-tasting ability + sensitivity to bitter vegetables.' },
        { gene: 'BDNF', chr: '11p', function: 'Brain-derived neurotrophic factor', notes: 'Neuronal growth + plasticity. Val66Met variant studied for mood + cognition.' },
        { gene: 'SOD1', chr: '21q', function: 'Superoxide dismutase', notes: 'Mutations cause ~20% of familial ALS.' },
        { gene: 'p21 (CDKN1A)', chr: '6p', function: 'Cell cycle inhibitor', notes: 'Activated by p53. Stops cell division to allow DNA repair.' }
      ];

      var MODEL_ORGANISMS = [
        { org: 'E. coli (bacterium)', size: '1-2 μm', life: '20 min div.', genome: '4.6 Mb', why: 'Easy to culture, fast, well-characterized. Workhorse of molecular biology + cloning.' },
        { org: 'Saccharomyces cerevisiae (yeast)', size: '5 μm', life: '~90 min div.', genome: '12 Mb', why: 'Simplest eukaryote. Cell biology, drug screens, brewing + baking.' },
        { org: 'Caenorhabditis elegans (worm)', size: '1 mm', life: '~3 days egg→adult', genome: '100 Mb', why: '959 somatic cells, all mapped. Apoptosis discovered here. Transparent.' },
        { org: 'Drosophila melanogaster (fruit fly)', size: '~3 mm', life: '~10 days', genome: '140 Mb', why: 'Genetics workhorse since 1910 (Morgan). Many human disease orthologs.' },
        { org: 'Zebrafish (Danio rerio)', size: '~4 cm adult', life: '3-4 mo to adult', genome: '1.4 Gb', why: 'Transparent embryos. Vertebrate development + drug screens.' },
        { org: 'Xenopus laevis (African clawed frog)', size: '~10 cm', life: '~1 yr to adult', genome: '3.1 Gb (tetraploid)', why: 'Large eggs. Embryology + cell biology. Once used for pregnancy tests.' },
        { org: 'Mouse (Mus musculus)', size: '~7-10 cm body', life: '~3 wk gestation', genome: '2.7 Gb', why: 'Closest standard mammalian model. Knockout + transgenic technology mature.' },
        { org: 'Rat', size: '~25 cm', life: '~3 wk gestation', genome: '2.7 Gb', why: 'Bigger than mouse → easier surgery. Behavioral + cardiovascular studies.' },
        { org: 'Arabidopsis thaliana', size: '~30 cm tall', life: '~6 wk', genome: '135 Mb', why: 'Small genome, short life cycle, easy to transform. Plant genetics model.' },
        { org: 'Chimp (Pan troglodytes)', size: 'human-like', life: '~40-50 yr', genome: '3.1 Gb', why: '~98.8% DNA shared with humans. Closest model for human-specific questions; restricted use.' },
        { org: 'Macaque (rhesus monkey)', size: '~50 cm', life: '~25 yr', genome: '2.9 Gb', why: 'Cardiovascular + immunology. Used for vaccine development.' },
        { org: 'Tetrahymena (ciliate)', size: '~50 μm', life: '~3 hr div.', genome: '125 Mb', why: 'Telomeres + ribozymes discovered here.' },
        { org: 'Bacteriophage λ', size: '~100 nm', life: '~30 min', genome: '48 kb', why: 'Lysogeny, gene regulation, recombination. Classic molecular biology.' },
        { org: 'iPS cells (human, in vitro)', size: 'cell-scale', life: 'continuous culture', genome: '3.0 Gb', why: 'Reprogrammed from adult cells. Generate any tissue type. Avoid embryo ethics.' }
      ];

      var ECOLOGY_CONCEPTS = [
        { concept: 'Population', detail: t('stem.dna.individuals_of_one_species_in_an_area', 'Individuals of one species in an area.') },
        { concept: 'Community', detail: t('stem.dna.all_populations_interacting_in_an_area', 'All populations interacting in an area.') },
        { concept: 'Ecosystem', detail: t('stem.dna.community_abiotic_environment_soil_wat', 'Community + abiotic environment (soil, water, weather).') },
        { concept: 'Biosphere', detail: t('stem.dna.all_ecosystems_on_earth_the_zone_of_li', 'All ecosystems on Earth. The zone of life.') },
        { concept: 'Niche', detail: t('stem.dna.role_of_a_species_in_its_ecosystem_two', 'Role of a species in its ecosystem. Two species can\'t occupy exactly the same niche (competitive exclusion).') },
        { concept: 'Habitat', detail: t('stem.dna.physical_place_where_an_organism_lives', 'Physical place where an organism lives.') },
        { concept: 'Food web', detail: t('stem.dna.network_of_who_eats_whom_trophic_level', 'Network of who eats whom. Trophic levels: producers → primary consumers → secondary → etc.') },
        { concept: 'Producers (autotrophs)', detail: t('stem.dna.make_own_food_plants_algae_some_bacter', 'Make own food. Plants, algae, some bacteria. Foundation of food chains.') },
        { concept: 'Consumers (heterotrophs)', detail: t('stem.dna.get_food_by_eating_others_herbivores_c', 'Get food by eating others. Herbivores, carnivores, omnivores.') },
        { concept: 'Decomposers', detail: t('stem.dna.break_down_dead_matter_fungi_bacteria_', 'Break down dead matter. Fungi, bacteria, detritivores. Recycle nutrients.') },
        { concept: 'Symbiosis', detail: t('stem.dna.close_interaction_between_species_mutu', 'Close interaction between species. Mutualism (+/+), commensalism (+/0), parasitism (+/−).') },
        { concept: 'Keystone species', detail: t('stem.dna.disproportionate_effect_on_ecosystem_d', 'Disproportionate effect on ecosystem despite low abundance. Sea otters control urchins, which control kelp.') },
        { concept: 'Carrying capacity (K)', detail: t('stem.dna.maximum_population_size_environment_ca', 'Maximum population size environment can sustain. Resources, predation, disease limit K.') },
        { concept: 'Exponential growth', detail: t('stem.dna.population_grows_at_constant_rate_dn_d', 'Population grows at constant rate. dN/dt = rN. Cannot continue forever.') },
        { concept: 'Logistic growth', detail: t('stem.dna.growth_slows_as_n_approaches_k_dn_dt_r', 'Growth slows as N approaches K. dN/dt = rN(K-N)/K. S-shaped curve.') },
        { concept: 'r-selected species', detail: t('stem.dna.many_offspring_little_parental_care_sh', 'Many offspring, little parental care, short-lived. Insects, weeds. Boom-and-bust.') },
        { concept: 'K-selected species', detail: t('stem.dna.few_offspring_lots_of_care_long_lived_', 'Few offspring, lots of care, long-lived. Whales, humans, oaks.') },
        { concept: 'Succession', detail: t('stem.dna.predictable_changes_in_community_over_', 'Predictable changes in community over time. Primary (bare rock) vs secondary (after disturbance).') },
        { concept: 'Biodiversity', detail: t('stem.dna.variety_of_life_species_richness_count', 'Variety of life. Species richness (count) + evenness (distribution). High biodiversity → ecosystem resilience.') },
        { concept: 'Extinction', detail: t('stem.dna.background_rate_1_species_per_million_', 'Background rate ~1 species per million per year. Current rate 100-1000× background due to humans.') },
        { concept: 'Biome', detail: t('stem.dna.major_life_zone_defined_by_climate_veg', 'Major life zone defined by climate + vegetation. Tropical rainforest, desert, tundra, savanna, etc.') },
        { concept: 'Nitrogen cycle', detail: t('stem.dna.n_nh_fixation_no_no_nitrification_orga', 'N₂ → NH₃ (fixation) → NO₂⁻ → NO₃⁻ (nitrification) → organic N → back to N₂ (denitrification).') },
        { concept: 'Carbon cycle', detail: t('stem.dna.co_photosynthesis_organic_c_respiratio', 'CO₂ ↔ photosynthesis ↔ organic C ↔ respiration. Fossil fuels move long-buried C back to atmosphere.') },
        { concept: 'Water cycle', detail: t('stem.dna.evaporation_condensation_precipitation', 'Evaporation → condensation → precipitation → runoff/groundwater → back to ocean.') },
        { concept: 'Biogeochemical cycles', detail: t('stem.dna.movement_of_elements_c_n_p_s_through_b', 'Movement of elements (C, N, P, S) through biotic + abiotic compartments.') }
      ];

      function renderAnimals2Section() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.notable_animals', '🐾 Notable animals')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Animal', 'Lifespan', 'Genome', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                ANIMAL_FACTS.map(function(a, i) {
                  return h('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, a.animal),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 text-[10px]' }, a.lifespan),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, a.genome),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderPlantsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.plant_biology_2', '🌿 Plant biology')),
          h('div', { className: 'space-y-1' },
            PLANT_FACTS.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, p.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, p.detail)
              );
            })
          )
        );
      }

      function renderFamousGenesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.famous_human_genes', '⌬ Famous human genes')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Gene', 'Location', 'Function', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                FAMOUS_GENES.map(function(g, i) {
                  return h('tr', { key: 'g'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-black text-emerald-700' }, g.gene),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, g.chr),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, g.function),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, g.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderModelorgSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.model_organisms_in_research', '🧫 Model organisms in research')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.each_chosen_for_properties_that_make_b', 'Each chosen for properties that make biology tractable: small size, fast life cycle, ease of culture, genetic tools.')),
          h('div', { className: 'space-y-2' },
            MODEL_ORGANISMS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, m.org),
                  h('span', { className: 'text-[10px] text-emerald-700 font-mono ml-auto' }, m.size + ' · ' + m.life + ' · ' + m.genome)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.why)
              );
            })
          )
        );
      }

      function renderEcologySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.ecology_concepts', '🌍 Ecology concepts')),
          h('div', { className: 'space-y-1' },
            ECOLOGY_CONCEPTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, c.concept),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var PCR_STEPS = [
        { step: '1. Denaturation', temp: '94-98°C', duration: '~30 sec', detail: t('stem.dna.heat_separates_double_stranded_dna_int', 'Heat separates double-stranded DNA into single strands. Hydrogen bonds break.') },
        { step: '2. Annealing', temp: '50-65°C', duration: '~30 sec', detail: t('stem.dna.primers_short_dna_sequences_bind_to_co', 'Primers (short DNA sequences) bind to complementary regions on each template strand.') },
        { step: '3. Extension', temp: '72°C', duration: '~30-60 sec', detail: t('stem.dna.dna_polymerase_taq_from_thermus_aquati', 'DNA polymerase (Taq, from Thermus aquaticus) extends primers, synthesizing new DNA.') }
      ];

      var PCR_FACTS = [
        { fact: t('stem.dna.amplification', 'Amplification'), detail: t('stem.dna.each_cycle_doubles_target_dna_30_cycle', 'Each cycle doubles target DNA. 30 cycles → ~10⁹-fold amplification.') },
        { fact: t('stem.dna.inventor', 'Inventor'), detail: t('stem.dna.kary_mullis_invented_pcr_1983_won_nobe', 'Kary Mullis invented PCR (1983); won Nobel Prize 1993.') },
        { fact: t('stem.dna.taq_polymerase', 'Taq polymerase'), detail: t('stem.dna.from_thermophilic_bacterium_in_hot_spr', 'From thermophilic bacterium in hot springs. Survives 95°C denaturation step.') },
        { fact: t('stem.dna.qpcr_real_time', 'qPCR (real-time)'), detail: t('stem.dna.fluorescent_dyes_report_on_amplificati', 'Fluorescent dyes report on amplification in real time. Used for COVID tests, gene expression.') },
        { fact: 'RT-PCR', detail: t('stem.dna.reverse_transcription_pcr_converts_rna', 'Reverse Transcription PCR. Converts RNA to cDNA first. Used for RNA viruses (COVID, HIV, flu).') },
        { fact: t('stem.dna.digital_pcr_dpcr', 'Digital PCR (dPCR)'), detail: t('stem.dna.partitions_sample_into_thousands_of_dr', 'Partitions sample into thousands of droplets. Counts presence/absence — highly accurate quantification.') },
        { fact: t('stem.dna.applications', 'Applications'), detail: t('stem.dna.diagnostics_forensics_gene_cloning_anc', 'Diagnostics, forensics, gene cloning, ancient DNA (Jurassic Park-style; real life, mostly < 1 million years).') }
      ];

      var CRISPR_PARTS = [
        { component: 'Cas9 protein', role: 'Programmable DNA-cutting enzyme.', notes: 'From bacterial immune system. Other Cas variants exist (Cas12, Cas13, etc.).' },
        { component: 'sgRNA (single guide RNA)', role: 'Directs Cas9 to specific DNA sequence (20 bp target).', notes: 'Engineered fusion of crRNA + tracrRNA.' },
        { component: 'PAM (protospacer adjacent motif)', role: 'Short sequence (NGG for SpCas9) next to target.', notes: 'Required for Cas9 to cut. Limits targetable sites.' },
        { component: 'DSB (double-strand break)', role: 'Cas9 cleaves both DNA strands.', notes: 'Triggers cellular repair: NHEJ (error-prone) or HDR (homology-directed).' },
        { component: 'Repair templates (HDR)', role: 'Provide a sequence to insert at the cut site.', notes: 'Allows precise edits, but HDR is inefficient outside dividing cells.' },
        { component: 'Prime editing', role: '"Search-and-replace" without DSBs.', notes: 'Newer method (2019). Higher precision, fewer off-target effects.' },
        { component: 'Base editing', role: 'Single-base changes (e.g., C→T) without DSB.', notes: 'Combines Cas9 nickase + deaminase. Useful for point mutations.' }
      ];

      var CRISPR_APPS = [
        { use: 'Sickle cell + β-thalassemia (Casgevy)', detail: t('stem.dna.first_crispr_therapy_fda_approved_dec_', 'First CRISPR therapy FDA-approved (Dec 2023). Edits patient\'s stem cells ex vivo.') },
        { use: 'CAR-T cancer therapy', detail: t('stem.dna.crispr_engineers_t_cells_to_attack_can', 'CRISPR engineers T cells to attack cancer. Several Phase I/II trials.') },
        { use: 'Drug discovery screens', detail: t('stem.dna.crispr_knockout_libraries_reveal_which', 'CRISPR knockout libraries reveal which genes are essential for disease.') },
        { use: 'Animal disease models', detail: t('stem.dna.faster_than_traditional_knockout_mice_', 'Faster than traditional knockout mice. Used widely in research.') },
        { use: 'Crop improvement', detail: t('stem.dna.disease_resistant_rice_mushrooms_that_', 'Disease-resistant rice, mushrooms that don\'t brown, gluten-free wheat (still mostly research).') },
        { use: 'Mosquito gene drives', detail: t('stem.dna.spread_sterility_or_malaria_resistance', 'Spread sterility or malaria-resistance through wild populations. Field trials being debated.') },
        { use: 'Heritable editing', detail: t('stem.dna.he_jiankui_2018_edited_human_embryos_m', 'He Jiankui (2018) edited human embryos → moral + scientific outcry. Currently banned in most countries.') }
      ];

      var VIRUS_FAMILIES = [
        { family: 'Adenoviridae', genome: 'dsDNA', envelope: 'No', examples: 'Common cold (some), adenovirus vaccine vectors (J&J COVID)', notes: 'Linear dsDNA. Used in gene therapy + vaccines.' },
        { family: 'Coronaviridae', genome: '(+)ssRNA', envelope: 'Yes', examples: 'SARS-CoV-2 (COVID), MERS, SARS, common cold strains', notes: 'Largest RNA genomes (~30 kb). Crown of spike proteins.' },
        { family: 'Flaviviridae', genome: '(+)ssRNA', envelope: 'Yes', examples: 'Dengue, Zika, West Nile, yellow fever, hepatitis C', notes: 'Mostly mosquito-borne.' },
        { family: 'Herpesviridae', genome: 'dsDNA', envelope: 'Yes', examples: 'HSV-1/2, varicella zoster, Epstein-Barr, CMV', notes: 'Establish lifelong latent infection.' },
        { family: 'Orthomyxoviridae', genome: '(−)ssRNA segmented', envelope: 'Yes', examples: 'Influenza A, B, C', notes: 'Segmented genome → reassortment → new strains.' },
        { family: 'Paramyxoviridae', genome: '(−)ssRNA', envelope: 'Yes', examples: 'Measles, mumps, RSV, Nipah', notes: 'Measles among most contagious diseases known (R₀ ~12-18).' },
        { family: 'Picornaviridae', genome: '(+)ssRNA', envelope: 'No', examples: 'Polio, rhinovirus (common cold), hepatitis A, enteroviruses', notes: 'Small (pico) RNA viruses.' },
        { family: 'Retroviridae', genome: 'ssRNA (reverse-transcribed)', envelope: 'Yes', examples: 'HIV, HTLV', notes: 'Integrates into host genome. Reverse transcriptase converts RNA to DNA.' },
        { family: 'Rhabdoviridae', genome: '(−)ssRNA', envelope: 'Yes', examples: 'Rabies, vesicular stomatitis virus', notes: 'Bullet-shaped.' },
        { family: 'Filoviridae', genome: '(−)ssRNA', envelope: 'Yes', examples: 'Ebola, Marburg', notes: 'Hemorrhagic fevers. Filamentous shape.' },
        { family: 'Poxviridae', genome: 'dsDNA', envelope: 'Complex', examples: 'Smallpox (eradicated), mpox, vaccinia', notes: 'Largest viruses. Replicate in cytoplasm (unusual for DNA viruses).' },
        { family: 'Bacteriophage', genome: 'varies', envelope: 'sometimes', examples: 'T4 (E. coli), lambda', notes: 'Infect bacteria. Used as research tools + phage therapy (alternative to antibiotics).' }
      ];

      var MICROBIOME_FACTS = [
        { topic: 'How many', detail: t('stem.dna.human_body_has_10_human_cells_10_10_mi', 'Human body has ~10¹³ human cells + ~10¹³-10¹⁴ microbial cells. Roughly equal in number.') },
        { topic: 'Microbial diversity', detail: t('stem.dna.500_1_000_bacterial_species_in_healthy', '500-1,000+ bacterial species in healthy adult gut. Plus archaea, fungi, viruses.') },
        { topic: 'Genome contribution', detail: t('stem.dna.microbiome_carries_100_more_genes_than', 'Microbiome carries ~100× more genes than human genome. Adds many metabolic capabilities.') },
        { topic: 'Gut-brain axis', detail: t('stem.dna.gut_microbes_communicate_with_brain_vi', 'Gut microbes communicate with brain via vagus nerve, immune signals, metabolites. Linked to mood, behavior — though many specific claims overstated.') },
        { topic: 'Antibiotic disruption', detail: t('stem.dna.broad_spectrum_antibiotics_wipe_out_co', 'Broad-spectrum antibiotics wipe out commensals → may take months/years to recover. Some shifts persistent.') },
        { topic: 'C. diff + FMT', detail: t('stem.dna.fecal_microbiota_transplant_fmt_cures_', 'Fecal microbiota transplant (FMT) cures recurrent C. difficile infection ~90% of time. Other applications still experimental.') },
        { topic: 'Skin microbiome', detail: t('stem.dna.varies_by_body_site_forehead_oily_domi', 'Varies by body site: forehead (oily, dominated by Cutibacterium acnes), gut (anaerobes), armpit (apocrine sweat + bacteria → body odor).') },
        { topic: 'Vaginal microbiome', detail: t('stem.dna.healthy_lactobacillus_dominant_low_ph_', 'Healthy: Lactobacillus dominant, low pH. Imbalance → bacterial vaginosis (BV).') },
        { topic: 'Oral microbiome', detail: t('stem.dna.700_species_affects_cavities_gum_disea', '~700 species. Affects cavities, gum disease. Linked to cardiovascular risk.') },
        { topic: 'Birth mode', detail: t('stem.dna.vaginal_birth_seeds_infant_with_matern', 'Vaginal birth seeds infant with maternal vaginal microbes; C-section seeds with skin microbes. Long-term effects studied (some contested).') },
        { topic: 'Breast milk + microbiome', detail: t('stem.dna.contains_live_bacteria_prebiotics_hmos', 'Contains live bacteria + prebiotics (HMOs) that feed specific gut microbes (B. infantis).') }
      ];

      var EMBRYO_STAGES = [
        { stage: 'Fertilization', time: 'Day 0-1', detail: t('stem.dna.sperm_egg_fuse_diploid_zygote_forms', 'Sperm + egg fuse. Diploid zygote forms.') },
        { stage: 'Cleavage', time: 'Day 1-3', detail: t('stem.dna.rapid_cell_divisions_without_growth_2_', 'Rapid cell divisions without growth. 2 → 4 → 8 → 16 cell stage.') },
        { stage: 'Morula', time: 'Day 3-4', detail: t('stem.dna.solid_ball_of_16_32_cells', 'Solid ball of ~16-32 cells.') },
        { stage: 'Blastocyst', time: 'Day 5-6', detail: t('stem.dna.hollow_ball_with_inner_cell_mass_futur', 'Hollow ball with inner cell mass (future embryo) + trophoblast (future placenta).') },
        { stage: 'Implantation', time: 'Day 6-12', detail: t('stem.dna.blastocyst_attaches_to_uterine_wall', 'Blastocyst attaches to uterine wall.') },
        { stage: 'Gastrulation', time: 'Week 3', detail: t('stem.dna.cell_movements_form_3_germ_layers_ecto', 'Cell movements form 3 germ layers: ectoderm, mesoderm, endoderm.') },
        { stage: 'Neurulation', time: 'Week 3-4', detail: t('stem.dna.neural_tube_forms_from_ectoderm_future', 'Neural tube forms from ectoderm. Future brain + spinal cord.') },
        { stage: 'Organogenesis', time: 'Week 4-8', detail: t('stem.dna.all_major_organs_begin_forming_heart_s', 'All major organs begin forming. Heart starts beating ~week 4-5.') },
        { stage: 'Fetal period', time: 'Week 9 - birth', detail: t('stem.dna.growth_maturation_major_structures_alr', 'Growth + maturation. Major structures already formed.') }
      ];

      var GERM_LAYERS = [
        { layer: 'Ectoderm (outer)', forms: 'Skin epidermis, hair, nails. Nervous system (brain, spinal cord, peripheral nerves). Tooth enamel. Inner ear, lens of eye.' },
        { layer: 'Mesoderm (middle)', forms: 'Muscle (skeletal, cardiac, smooth). Bone + cartilage. Heart + blood vessels. Kidneys. Gonads. Dermis of skin.' },
        { layer: 'Endoderm (inner)', forms: 'Lining of digestive tract. Lining of respiratory tract. Liver, pancreas. Thyroid, parathyroid. Bladder.' }
      ];

      var CANCER_HALLMARKS = [
        { hallmark: 'Sustained proliferative signaling', detail: t('stem.dna.cancer_cells_produce_their_own_growth_', 'Cancer cells produce their own growth signals or activate receptors constitutively.') },
        { hallmark: 'Evading growth suppressors', detail: t('stem.dna.tumor_suppressors_p53_rb_inactivated_c', 'Tumor suppressors (p53, Rb) inactivated → cells divide despite stop signals.') },
        { hallmark: 'Resisting cell death', detail: t('stem.dna.apoptosis_pathways_disabled_damaged_ce', 'Apoptosis pathways disabled. Damaged cells survive when they should die.') },
        { hallmark: 'Enabling replicative immortality', detail: t('stem.dna.reactivate_telomerase_telomeres_mainta', 'Reactivate telomerase → telomeres maintained → unlimited divisions.') },
        { hallmark: 'Inducing angiogenesis', detail: t('stem.dna.tumors_recruit_blood_vessels_to_feed_g', 'Tumors recruit blood vessels to feed growing mass.') },
        { hallmark: 'Activating invasion + metastasis', detail: t('stem.dna.cells_lose_adhesion_migrate_colonize_d', 'Cells lose adhesion, migrate, colonize distant tissues.') },
        { hallmark: 'Reprogramming energy metabolism', detail: t('stem.dna.warburg_effect_tumors_use_glycolysis_e', 'Warburg effect: tumors use glycolysis even in oxygen presence.') },
        { hallmark: 'Evading immune destruction', detail: t('stem.dna.tumors_hide_from_or_suppress_immune_su', 'Tumors hide from or suppress immune surveillance (PD-L1 expression).') },
        { hallmark: 'Tumor-promoting inflammation', detail: t('stem.dna.chronic_inflammation_creates_a_permiss', 'Chronic inflammation creates a permissive environment.') },
        { hallmark: 'Genome instability', detail: t('stem.dna.accumulating_mutations_chromosomal_rea', 'Accumulating mutations + chromosomal rearrangements drive evolution.') }
      ];

      var IMMUNE_COMPONENTS = [
        { component: 'Innate immunity', detail: t('stem.dna.fast_non_specific_skin_mucus_complemen', 'Fast, non-specific. Skin, mucus, complement, neutrophils, NK cells, macrophages.') },
        { component: 'Adaptive immunity', detail: t('stem.dna.slower_days_highly_specific_has_memory', 'Slower (days), highly specific, has memory. B cells (antibodies) + T cells.') },
        { component: 'B cells', detail: t('stem.dna.produce_antibodies_each_b_cell_makes_o', 'Produce antibodies. Each B cell makes one specificity. Activated B cells become plasma cells.') },
        { component: 'T helper cells (CD4+)', detail: t('stem.dna.coordinate_immune_response_hiv_target_', 'Coordinate immune response. HIV target. Tipped from naive to specialized subsets (Th1, Th2, Th17, Treg).') },
        { component: 'T cytotoxic cells (CD8+)', detail: t('stem.dna.kill_infected_or_cancerous_cells_via_p', 'Kill infected or cancerous cells via perforin + granzyme.') },
        { component: 'Antibodies', detail: t('stem.dna.y_shaped_proteins_5_classes_igg_most_a', 'Y-shaped proteins. 5 classes: IgG (most abundant), IgA (mucosal), IgM (initial), IgE (allergies + parasites), IgD (B-cell surface).') },
        { component: 'MHC / HLA', detail: t('stem.dna.cell_surface_molecules_that_present_an', 'Cell-surface molecules that present antigens to T cells. MHC I (all cells, viral peptides). MHC II (immune cells, extracellular peptides).') },
        { component: 'Complement', detail: t('stem.dna.plasma_proteins_that_punch_holes_in_pa', 'Plasma proteins that punch holes in pathogens + recruit phagocytes.') },
        { component: 'Cytokines', detail: t('stem.dna.signaling_molecules_of_immune_system_i', 'Signaling molecules of immune system. Interferons (anti-viral), interleukins (coordinate), TNF (inflammation).') },
        { component: 'Memory cells', detail: t('stem.dna.long_lived_b_t_cells_from_prior_exposu', 'Long-lived B + T cells from prior exposure. Basis of vaccines + lifelong immunity.') },
        { component: 'Vaccines', detail: t('stem.dna.train_adaptive_immunity_without_diseas', 'Train adaptive immunity without disease. mRNA (COVID), protein subunit, attenuated live, inactivated.') },
        { component: 'Autoimmunity', detail: t('stem.dna.immune_system_attacks_self_type_1_diab', 'Immune system attacks self. Type 1 diabetes, RA, MS, lupus, Hashimoto\'s.') },
        { component: 'Allergy', detail: t('stem.dna.ige_mediated_hypersensitivity_mast_cel', 'IgE-mediated hypersensitivity. Mast cells release histamine.') }
      ];

      var NEURO_BASICS = [
        { topic: 'Neuron parts', detail: t('stem.dna.dendrites_receive_soma_cell_body_axon_', 'Dendrites (receive), soma (cell body), axon (transmit), terminals (release neurotransmitter).') },
        { topic: 'Action potential', detail: t('stem.dna.all_or_none_electrical_signal_sodium_i', 'All-or-none electrical signal. Sodium in → depolarize → potassium out → repolarize. ~1 ms. Traveling speed: ~1 m/s (unmyelinated) to ~100 m/s (myelinated).') },
        { topic: 'Myelin sheath', detail: t('stem.dna.fatty_insulation_made_by_glia_oligoden', 'Fatty insulation made by glia (oligodendrocytes in CNS, Schwann cells in PNS). Speeds conduction. Destroyed in MS.') },
        { topic: 'Synapse', detail: t('stem.dna.junction_between_neurons_electrical_or', 'Junction between neurons. Electrical or chemical (most). ~0.02 μm gap.') },
        { topic: 'Neurotransmitters', detail: t('stem.dna.chemical_messengers_across_synapse_exc', 'Chemical messengers across synapse. Excitatory (glutamate), inhibitory (GABA), modulatory (serotonin, dopamine).') },
        { topic: 'Dopamine', detail: t('stem.dna.reward_motivation_motor_control_low_in', 'Reward, motivation, motor control. Low in Parkinson\'s; dysregulated in schizophrenia.') },
        { topic: 'Serotonin', detail: t('stem.dna.mood_sleep_appetite_ssris_target_reupt', 'Mood, sleep, appetite. SSRIs target reuptake.') },
        { topic: 'Acetylcholine', detail: t('stem.dna.neuromuscular_junction_memory_attentio', 'Neuromuscular junction. Memory + attention. Low in Alzheimer\'s.') },
        { topic: 'Glia (non-neuron brain cells)', detail: t('stem.dna.astrocytes_support_bbb_oligodendrocyte', 'Astrocytes (support, BBB), oligodendrocytes (myelin in CNS), microglia (immune), ependymal cells (CSF).') },
        { topic: 'Brain regions', detail: t('stem.dna.cerebrum_cortex_thinking_perception_ce', 'Cerebrum (cortex — thinking, perception), cerebellum (motor coordination), brainstem (autonomic), limbic system (emotion + memory).') },
        { topic: 'Neuroplasticity', detail: t('stem.dna.brain_reorganizes_itself_strongest_in_', 'Brain reorganizes itself — strongest in childhood but ongoing throughout life. Basis of learning.') },
        { topic: 'Blood-brain barrier', detail: t('stem.dna.tight_junctions_between_brain_capillar', 'Tight junctions between brain capillary cells keep most molecules out. Major challenge for CNS drug delivery.') },
        { topic: 'Brain energy', detail: t('stem.dna.20_of_body_s_energy_at_rest_despite_be', '~20% of body\'s energy at rest despite being ~2% of mass. Mostly Na+/K+ pumps maintaining ion gradients.') }
      ];

      var TREE_OF_LIFE = [
        { domain: 'Bacteria', features: 'Prokaryotic. No nucleus. Peptidoglycan cell wall. Highly diverse metabolism.', examples: 'E. coli, Streptococcus, cyanobacteria' },
        { domain: 'Archaea', features: 'Prokaryotic. Distinct membrane lipids + ribosomes. Often in extreme environments.', examples: 'Methanogens, halophiles, thermophiles' },
        { domain: 'Eukarya', features: 'Eukaryotic. Membrane-bound nucleus + organelles. Sexual reproduction common.', examples: 'Animals, plants, fungi, protists' }
      ];

      var KINGDOMS = [
        { kingdom: 'Animalia', features: 'Multicellular, heterotrophic, mobile (at some stage), no cell wall.', notes: 'Mostly sexual reproduction. From sponges (no true tissues) to vertebrates.' },
        { kingdom: 'Plantae', features: 'Multicellular, photosynthetic (chlorophyll a+b), cellulose cell walls.', notes: 'Includes algae (debated), mosses, ferns, gymnosperms, angiosperms.' },
        { kingdom: 'Fungi', features: 'Multicellular (mostly), heterotrophic, chitin cell walls. Digest externally.', notes: 'Decomposers + symbionts. Yeasts, molds, mushrooms, lichens (fungus + alga).' },
        { kingdom: 'Protista', features: 'Eukaryotes that aren\'t plants, animals, or fungi. Polyphyletic — being reclassified.', notes: 'Amoebas, algae (some), Plasmodium (malaria), euglena.' }
      ];

      var BIOTECH_APPS = [
        { app: 'Recombinant insulin', detail: t('stem.dna.first_mass_produced_human_protein_made', 'First mass-produced human protein. Made in E. coli (1982). Replaced pig + cow insulin.') },
        { app: 'Monoclonal antibodies', detail: t('stem.dna.single_target_therapies_humira_autoimm', 'Single-target therapies. Humira (autoimmune), Herceptin (HER2+ breast cancer), Keytruda (immunotherapy).') },
        { app: 'mRNA vaccines', detail: t('stem.dna.covid_19_vaccines_pfizer_moderna_self_', 'COVID-19 vaccines (Pfizer, Moderna). Self-amplifying versions + non-COVID applications in development.') },
        { app: 'Gene therapy', detail: t('stem.dna.replace_defective_genes_luxturna_inher', 'Replace defective genes. Luxturna (inherited blindness, FDA 2017). Zolgensma (SMA, 2019).') },
        { app: 'CAR-T cell therapy', detail: t('stem.dna.engineered_immune_cells_yescarta_kymri', 'Engineered immune cells. Yescarta + Kymriah for blood cancers. ~$400K per dose.') },
        { app: 'Stem cell therapy', detail: t('stem.dna.bone_marrow_transplants_standard_for_d', 'Bone marrow transplants standard for decades. Newer iPSC + ESC approaches in trials.') },
        { app: '3D bioprinting', detail: t('stem.dna.print_tissue_with_living_cells_scaffol', 'Print tissue with living cells + scaffolds. Skin, cartilage, bladder. Whole organs still distant.') },
        { app: 'Synthetic biology', detail: t('stem.dna.engineer_biological_systems_bacteria_t', 'Engineer biological systems. Bacteria that produce drugs, yeast that brews opioids, algae biofuels.') },
        { app: 'GMO crops', detail: t('stem.dna.bt_corn_insect_resistance_roundup_read', 'Bt corn (insect resistance), Roundup Ready (herbicide), Golden Rice (vitamin A).') },
        { app: 'DNA forensics', detail: t('stem.dna.str_profiling_mtdna_degraded_samples_y', 'STR profiling, mtDNA (degraded samples), Y-chromosome (paternal lineage). Database matching.') },
        { app: 'Ancestry + relative finding', detail: t('stem.dna.snp_arrays_23andme_ancestrydna_reveals', 'SNP arrays (23andMe, AncestryDNA). Reveals biogeographic ancestry + DNA relatives.') },
        { app: 'Liquid biopsy', detail: t('stem.dna.detect_cancer_dna_in_blood_earlier_dia', 'Detect cancer DNA in blood. Earlier diagnosis, treatment monitoring.') },
        { app: 'Engineered T cells', detail: t('stem.dna.treat_solid_tumors_til_therapy_iovance', 'Treat solid tumors. TIL therapy (Iovance, melanoma) FDA approved 2024.') },
        { app: 'Bioremediation', detail: t('stem.dna.engineered_microbes_clean_up_oil_spill', 'Engineered microbes clean up oil spills, plastic pollution, heavy metals.') }
      ];

      function renderPcrSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.pcr_polymerase_chain_reaction_2', '🧪 PCR (polymerase chain reaction)')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.amplifies_specific_dna_sequences_a_bil', 'Amplifies specific DNA sequences a billion-fold. Workhorse of molecular biology, diagnostics, and forensics.')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.the_3_steps_repeated_30', 'The 3 steps (repeated ~30×)')),
            h('div', { className: 'space-y-1' },
              PCR_STEPS.map(function(s, i) {
                return h('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    h('span', { className: 'text-[11px] font-black text-slate-800' }, s.step),
                    h('span', { className: 'text-[10px] font-mono text-emerald-700 ml-auto' }, s.temp + ' · ' + s.duration)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700' }, s.detail)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.key_facts', 'Key facts')),
          h('div', { className: 'space-y-1' },
            PCR_FACTS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[11px] font-black text-emerald-900 mb-0.5' }, f.fact),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderCrisprSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.crispr_cas9', '✂ CRISPR-Cas9')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.originally_a_bacterial_immune_system_n', 'Originally a bacterial immune system; now a programmable gene-editing tool. Doudna + Charpentier shared 2020 Nobel Prize.')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.components_concepts', 'Components + concepts')),
            h('div', { className: 'space-y-1' },
              CRISPR_PARTS.map(function(c, i) {
                return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'text-[11px] font-black text-slate-800 mb-0.5' }, c.component),
                  h('div', { className: 'text-[10px] text-emerald-700 italic mb-0.5' }, c.role),
                  h('div', { className: 'text-[10px] text-slate-700' }, c.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.real_applications', 'Real applications')),
          h('div', { className: 'space-y-1' },
            CRISPR_APPS.map(function(a, i) {
              return h('div', { key: 'a'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[11px] font-black text-emerald-900 mb-0.5' }, a.use),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, a.detail)
              );
            })
          )
        );
      }

      function renderVirusesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.virus_families_2', '🦠 Virus families')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.viruses_are_non_living_infectious_agen', 'Viruses are non-living infectious agents — they need a host cell to replicate. Classified by genome type (Baltimore classification), envelope, shape.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Family', 'Genome', 'Envelope', 'Examples', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                VIRUS_FAMILIES.map(function(v, i) {
                  return h('tr', { key: 'v'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, v.family),
                    h('td', { className: 'px-2 py-1 font-mono text-emerald-700 text-[10px]' }, v.genome),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, v.envelope),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, v.examples),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, v.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMicrobiomeSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.human_microbiome', '🦠 Human microbiome')),
          h('div', { className: 'p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mb-3' },
            h('strong', null, t('stem.dna.note', '⚠ Note: ')), t('stem.dna.microbiome_science_is_advancing_fast_m', 'Microbiome science is advancing fast. Many popular claims (specific probiotic strains "curing" specific conditions) outrun the evidence. Stick to robustly replicated findings.')
          ),
          h('div', { className: 'space-y-1' },
            MICROBIOME_FACTS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, m.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.detail)
              );
            })
          )
        );
      }

      function renderDevelSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.embryonic_development', '🥚 Embryonic development')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.stages_human_approximate', 'Stages (human, approximate)')),
            h('div', { className: 'space-y-1' },
              EMBRYO_STAGES.map(function(s, i) {
                return h('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    h('span', { className: 'text-[11px] font-black text-slate-800' }, s.stage),
                    h('span', { className: 'text-[10px] font-mono text-emerald-700 ml-auto' }, s.time)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700' }, s.detail)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.germ_layers_what_each_forms', 'Germ layers — what each forms')),
          h('div', { className: 'space-y-1' },
            GERM_LAYERS.map(function(L, i) {
              return h('div', { key: 'L'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, L.layer),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, L.forms)
              );
            })
          )
        );
      }

      function renderCancerSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.hallmarks_of_cancer', '⚕ Hallmarks of cancer')),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, t('stem.dna.defined_by_hanahan_weinberg_2000_updat', 'Defined by Hanahan + Weinberg (2000, updated 2011). Most cancers acquire most of these hallmarks. Therapy increasingly targets specific hallmarks.')),
          h('div', { className: 'space-y-1' },
            CANCER_HALLMARKS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, c.hallmark),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      function renderImmunitySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.the_immune_system', '🛡 The immune system')),
          h('div', { className: 'space-y-2' },
            IMMUNE_COMPONENTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, c.component),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      function renderNeuroSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.neuroscience_basics', '🧠 Neuroscience basics')),
          h('div', { className: 'space-y-1' },
            NEURO_BASICS.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderTreeSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.tree_of_life_2', '🌳 Tree of life')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.three_domains_woese_1990', 'Three domains (Woese, 1990)')),
            h('div', { className: 'space-y-2' },
              TREE_OF_LIFE.map(function(d, i) {
                return h('div', { key: 'd'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, d.domain),
                  h('div', { className: 'text-[11px] text-emerald-700 font-bold mb-1' }, d.features),
                  h('div', { className: 'text-[10px] text-slate-600 italic' }, 'Examples: ' + d.examples)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, t('stem.dna.traditional_eukaryote_kingdoms', 'Traditional eukaryote kingdoms')),
          h('div', { className: 'space-y-1' },
            KINGDOMS.map(function(K, i) {
              return h('div', { key: 'K'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-emerald-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-emerald-900 mb-0.5' }, K.kingdom),
                h('div', { className: 'text-[11px] text-slate-700 mb-0.5' }, K.features),
                h('div', { className: 'text-[10px] text-slate-600 italic' }, K.notes)
              );
            })
          )
        );
      }

      function renderBiotech2Section() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.dna.biotechnology_applications', '💉 Biotechnology applications')),
          h('div', { className: 'space-y-2' },
            BIOTECH_APPS.map(function(b, i) {
              return h('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, b.app),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.detail)
              );
            })
          )
        );
      }

      var __dnaExpansions = h('details', { className: 'dna-reference-library mt-4 max-w-4xl mx-auto' },
        h('summary', null,
          h('span', { 'aria-hidden': 'true' }, '\uD83D\uDCDA'),
          h('span', null, 'Biology reference library'),
          h('span', { className: 'text-[10px] font-medium text-slate-500' }, expSection ? 'Selection saved' : '45 topics · optional')
        ),
        h('div', { className: 'px-3 pb-3' },
          expHeader(),
          expTabBar(),
          expSection && h('div', { className: 'mt-2' }, renderActiveSection())
        )
      );

      return h(React.Fragment, null, __dnaMainView, __dnaExpansions);
    }
  });

  console.log('[StemLab] stem_tool_dna.js v3.0 loaded');
})();
