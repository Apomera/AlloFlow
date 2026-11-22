// ═══════════════════════════════════════════
// stem_tool_music.js — Music Synthesizer
// Extracted from stem_lab_module.js (~3,100 lines)
// Piano, scales, chords, harmony pad, beat pad, theory
// ═══════════════════════════════════════════

function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('musicSynth'))) {
(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  // Contrast theme: hovered buttons, owned by this tool (allo-music-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-music-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-music-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"musicSynth\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"musicSynth\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"musicSynth\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}";
    document.head.appendChild(st);
  })();
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // The CSS above cannot reach a canvas draw loop. Only DECORATIVE, time-driven
  // canvas motion is gated on this (the harmonic-series scroller). The synth,
  // beat-pad and mic visualizers are analyser-driven: their motion IS the audio
  // data, so freezing them would remove information rather than reduce motion.
  function musicReducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  function musicHighContrast() {
    try {
      if (typeof document === 'undefined') return false;
      var root = document.documentElement;
      var body = document.body;
      return !!(
        (root && root.classList && root.classList.contains('theme-contrast')) ||
        (body && body.classList && body.classList.contains('theme-contrast'))
      );
    } catch (e) { return false; }
  }

  function musicSafeEllipse(ctx, x, y, rx, ry, rot, sa, ea) {
    if (!ctx) return;
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(x, y, rx, ry, rot || 0, sa, ea);
      return;
    }
    var r = Math.max(0.5, (rx + ry) * 0.5);
    ctx.arc(x, y, r, sa, ea);
  }

  // ── Dark theme for the synth surfaces (see MUSIC_TOOLS_REVIEW.md) ──
  (function () {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-music-theme-css')) return;
    var mst = document.createElement('style');
    mst.id = 'allo-music-theme-css';
    mst.textContent = "/* Music Synthesizer dark theme. Scoped to the tool and to the dark attribute,\n   so light mode is byte-for-byte unaffected. Generated from the class tokens\n   actually present in this file (158 rules); saturated button shades are\n   intentionally untouched. */\n.allo-music-tool[data-allo-theme=\"dark\"] { background-color: #0f172a !important; border-radius: 12px; }\n.allo-music-tool[data-allo-theme=\"dark\"] select { color: #e2e8f0 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-amber-100 { background-color: #78350f !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-amber-100\\/50 { background-color: #78350f !important; --tw-bg-opacity: 1 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-amber-200 { background-color: #92400e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-amber-50 { background-color: #451a03 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-blue-100 { background-color: #1e3a8a !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-blue-50 { background-color: #172554 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-emerald-100 { background-color: #064e3b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-emerald-50 { background-color: #022c22 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-green-100 { background-color: #14532d !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-green-50 { background-color: #052e16 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-indigo-100 { background-color: #312e81 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-indigo-100\\/50 { background-color: #312e81 !important; --tw-bg-opacity: 1 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-indigo-200 { background-color: #3730a3 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-orange-50 { background-color: #431407 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-purple-100 { background-color: #581c87 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-purple-200\\/50 { background-color: #6b21a8 !important; --tw-bg-opacity: 1 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-purple-50 { background-color: #3b0764 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-purple-50\\/80 { background-color: #3b0764 !important; --tw-bg-opacity: 1 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-red-100 { background-color: #7f1d1d !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-red-50 { background-color: #450a0a !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-rose-100 { background-color: #881337 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-rose-200 { background-color: #9f1239 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-slate-100 { background-color: #334155 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-slate-200 { background-color: #475569 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-slate-50 { background-color: #1e293b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-violet-100 { background-color: #4c1d95 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-white { background-color: #1e293b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-white\\/60 { background-color: #1e293b !important; --tw-bg-opacity: 1 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .bg-white\\/80 { background-color: #1e293b !important; --tw-bg-opacity: 1 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-amber-100 { border-color: #92400e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-amber-200 { border-color: #92400e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-amber-300 { border-color: #b45309 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-amber-400 { border-color: #b45309 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-blue-100 { border-color: #1e40af !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-blue-200 { border-color: #1e40af !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-cyan-300 { border-color: #0e7490 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-emerald-100 { border-color: #065f46 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-emerald-200 { border-color: #065f46 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-emerald-300 { border-color: #047857 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-green-200 { border-color: #166534 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-green-400 { border-color: #15803d !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-indigo-200 { border-color: #3730a3 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-indigo-300 { border-color: #4338ca !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-indigo-400 { border-color: #4338ca !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-purple-100 { border-color: #6b21a8 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-purple-200 { border-color: #6b21a8 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-purple-300 { border-color: #7e22ce !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-purple-400 { border-color: #7e22ce !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-red-200 { border-color: #991b1b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-red-400 { border-color: #b91c1c !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-rose-100 { border-color: #9f1239 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-rose-200 { border-color: #9f1239 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-rose-300 { border-color: #be123c !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-slate-100 { border-color: #334155 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-slate-200 { border-color: #334155 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-slate-300 { border-color: #334155 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-slate-400 { border-color: #334155 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-teal-200 { border-color: #115e59 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-teal-300 { border-color: #0f766e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .border-violet-200 { border-color: #5b21b6 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-amber-100 { background-image: none !important; background-color: #78350f !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-amber-50 { background-image: none !important; background-color: #451a03 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-emerald-50 { background-image: none !important; background-color: #022c22 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-indigo-50 { background-image: none !important; background-color: #1e1b4b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-purple-50 { background-image: none !important; background-color: #3b0764 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-rose-50 { background-image: none !important; background-color: #4c0519 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-slate-50 { background-image: none !important; background-color: #020617 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-teal-50 { background-image: none !important; background-color: #042f2e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .from-violet-50 { background-image: none !important; background-color: #2e1065 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-amber-100:hover { background-color: #78350f !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-amber-200:hover { background-color: #92400e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-amber-50:hover { background-color: #451a03 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-blue-200:hover { background-color: #1e40af !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-blue-50:hover { background-color: #172554 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-emerald-200:hover { background-color: #065f46 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-indigo-200:hover { background-color: #3730a3 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-indigo-50:hover { background-color: #1e1b4b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-orange-100:hover { background-color: #7c2d12 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-purple-100:hover { background-color: #581c87 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-purple-200:hover { background-color: #6b21a8 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-purple-50:hover { background-color: #3b0764 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-red-100:hover { background-color: #7f1d1d !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-red-200:hover { background-color: #991b1b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-red-50:hover { background-color: #450a0a !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-rose-200:hover { background-color: #9f1239 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-rose-50:hover { background-color: #4c0519 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-slate-100:hover { background-color: #334155 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-slate-200:hover { background-color: #475569 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:bg-violet-200:hover { background-color: #5b21b6 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:border-amber-300:hover { border-color: #b45309 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:border-amber-400:hover { border-color: #b45309 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:border-emerald-400:hover { border-color: #047857 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:border-purple-200:hover { border-color: #6b21a8 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:border-purple-400:hover { border-color: #7e22ce !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:border-rose-300:hover { border-color: #be123c !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:border-rose-400:hover { border-color: #be123c !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:from-purple-100:hover { background-image: none !important; background-color: #581c87 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:text-amber-800:hover { color: #fde68a !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:text-purple-600:hover { color: #d8b4fe !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:text-red-600:hover { color: #fca5a5 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:text-red-700:hover { color: #fca5a5 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:text-slate-700:hover { color: #e2e8f0 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:text-violet-600:hover { color: #c4b5fd !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .hover\\:to-pink-100:hover { background-image: none !important; background-color: #831843 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-amber-500 { color: #fcd34d !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-amber-600 { color: #fcd34d !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-amber-700 { color: #fcd34d !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-amber-800 { color: #fde68a !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-amber-900 { color: #fde68a !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-blue-500 { color: #93c5fd !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-blue-700 { color: #93c5fd !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-emerald-600 { color: #6ee7b7 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-emerald-700 { color: #6ee7b7 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-emerald-800 { color: #a7f3d0 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-gray-800 { color: #e5e7eb !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-green-600 { color: #86efac !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-green-700 { color: #86efac !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-indigo-500 { color: #a5b4fc !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-indigo-600 { color: #a5b4fc !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-indigo-700 { color: #a5b4fc !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-indigo-800 { color: #c7d2fe !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-indigo-900 { color: #c7d2fe !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-orange-500 { color: #fdba74 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-orange-700 { color: #fdba74 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-purple-500 { color: #d8b4fe !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-purple-600 { color: #d8b4fe !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-purple-700 { color: #d8b4fe !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-purple-800 { color: #e9d5ff !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-red-500 { color: #fca5a5 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-red-700 { color: #fca5a5 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-red-800 { color: #fecaca !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-rose-500 { color: #fda4af !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-rose-600 { color: #fda4af !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-rose-700 { color: #fda4af !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-rose-800 { color: #fecdd3 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-rose-900 { color: #fecdd3 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-slate-500 { color: #94a3b8 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-slate-600 { color: #cbd5e1 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-slate-700 { color: #e2e8f0 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-slate-800 { color: #e2e8f0 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-teal-700 { color: #5eead4 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-violet-500 { color: #c4b5fd !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-violet-600 { color: #c4b5fd !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-violet-700 { color: #c4b5fd !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .text-violet-800 { color: #ddd6fe !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-blue-50 { background-image: none !important; background-color: #172554 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-cyan-50 { background-image: none !important; background-color: #083344 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-fuchsia-50 { background-image: none !important; background-color: #4a044e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-gray-50 { background-image: none !important; background-color: #030712 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-indigo-50 { background-image: none !important; background-color: #1e1b4b !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-orange-50 { background-image: none !important; background-color: #431407 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-pink-50 { background-image: none !important; background-color: #500724 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-purple-50 { background-image: none !important; background-color: #3b0764 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-rose-50 { background-image: none !important; background-color: #4c0519 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-teal-50 { background-image: none !important; background-color: #042f2e !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .to-yellow-50 { background-image: none !important; background-color: #422006 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .via-orange-50 { background-image: none !important; background-color: #431407 !important; }\n.allo-music-tool[data-allo-theme=\"dark\"] .via-pink-50 { background-image: none !important; background-color: #500724 !important; }";
    document.head.appendChild(mst);
    // WCAG 1.4.3 high contrast: the host paints buttons black with green ink, but a gradient image stays on top
    var hc = document.createElement('style');
    hc.id = 'allo-music-hc-css';
    hc.textContent = '.theme-contrast [data-stem-tool-shell="musicSynth"] button[class*="bg-gradient"]{background-image:none!important}' +
      '.theme-contrast [data-stem-tool-shell="musicSynth"] :is(.from-amber-300.to-amber-400,.bg-amber-500.scale-y-105):not(:empty):not(svg,canvas,video,iframe,object){background:#000!important}';
    document.head.appendChild(hc);
  })();

  // Bespoke Music Theory & Synth Studio workbench polish + Light/Dark/High-Contrast parity
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-music-studio-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-music-studio-css';
    st.textContent = [
      '.allo-music-tool { min-width: 0; }',
      '.allo-music-tool .mus-back-btn { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid rgba(148,163,184,0.35); border-radius: 10px; }',
      '.allo-music-tool .mus-tab-btn { min-height: 40px; display: inline-flex; align-items: center; gap: 4px; }',
      '.allo-music-tool .mus-studio-hero { background: linear-gradient(135deg, #0d0821 0%, #241047 52%, #3a1149 100%); border: 1px solid rgba(216,180,254,0.36); border-radius: 18px; padding: 14px 16px; box-shadow: 0 18px 36px -22px rgba(15,8,35,0.88); min-width: 0; }',
      '.allo-music-tool .mus-emblem-box { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, rgba(168,85,247,0.34), rgba(15,10,34,0.92)); border: 1.5px solid rgba(232,121,249,0.55); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 6px 16px rgba(10,5,28,0.55); }',
      '.allo-music-tool .mus-subject-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; background: rgba(192,132,252,0.22); border: 1px solid rgba(232,121,249,0.48); color: #f5d0fe; font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }',
      '.allo-music-tool .mus-telemetry-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; padding-top: 9px; border-top: 1px solid rgba(216,180,254,0.22); }',
      '.allo-music-tool .mus-telemetry-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: rgba(15,10,34,0.78); border: 1px solid rgba(216,180,254,0.34); color: #f3e8ff; font-size: 11px; font-weight: 700; white-space: nowrap; }',
      '.allo-music-tool .mus-signal-strip { margin-top: 10px; padding: 7px 10px; border-radius: 12px; background: rgba(11,7,28,0.76); border: 1px solid rgba(216,180,254,0.26); }',
      '.allo-music-tool .mus-starter-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; padding-top: 9px; border-top: 1px solid rgba(216,180,254,0.22); }',
      '.allo-music-tool .mus-starter-label { font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #f5d0fe; }',
      '.allo-music-tool .mus-starter-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 13px; border-radius: 10px; background: rgba(15,10,34,0.82); border: 1px solid rgba(216,180,254,0.38); color: #faf5ff; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 140ms ease, border-color 140ms ease; }',
      '.allo-music-tool .mus-starter-chip:hover:not(:disabled) { background: rgba(147,51,234,0.38); border-color: #f0abfc; color: #ffffff; }',
      '.allo-music-tool .mus-starter-chip[data-active="true"] { background: #7e22ce; border-color: #f0abfc; color: #ffffff; }',
      '.allo-music-tool .mus-viz-legend { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px; background: #140d29; border-top: 1px solid rgba(192,132,252,0.25); color: #e9d5ff; font-size: 11px; font-weight: 600; }',
      '.allo-music-tool button:focus-visible, .allo-music-tool select:focus-visible, .allo-music-tool input:focus-visible { outline: 2px solid #e879f9; outline-offset: 2px; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-studio-hero { background: #000000 !important; background-image: none !important; border: 2px solid #ffff00 !important; color: #ffff00 !important; box-shadow: none !important; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-emblem-box, .theme-contrast [data-stem-tool-shell="musicSynth"] .mus-subject-badge, .theme-contrast [data-stem-tool-shell="musicSynth"] .mus-telemetry-pill, .theme-contrast [data-stem-tool-shell="musicSynth"] .mus-signal-strip, .theme-contrast [data-stem-tool-shell="musicSynth"] .mus-viz-legend { background: #000000 !important; background-image: none !important; border-color: #ffff00 !important; color: #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-starter-label { color: #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-starter-chip { background: #000000 !important; border: 1.5px solid #ffff00 !important; color: #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-starter-chip[data-active="true"] { background: #ffff00 !important; color: #000000 !important; border-color: #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-tab-hero { background: #000000 !important; background-image: none !important; border: 2px solid #ffff00 !important; color: #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-tab-hero h3, .theme-contrast [data-stem-tool-shell="musicSynth"] .mus-tab-hero p { color: #ffff00 !important; }',
      '@keyframes alloMusBeaconPulse { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.45); } }',
      '.allo-music-tool .mus-adsr-beacon { transform-box: fill-box; transform-origin: center; animation: alloMusBeaconPulse 1.8s ease-in-out infinite; }',
      '.theme-contrast [data-stem-tool-shell="musicSynth"] .mus-adsr-beacon { animation: none !important; opacity: 0 !important; }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-music')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-music';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


  // ═══════════════════════════════════════════
  // Voice studio + trainers (shared with the website project where they were built).
  // Generated from that project's src/lib by a converter that
  // wraps each module in its own scope; change the site modules and regenerate, not this copy.
  // ═══════════════════════════════════════════
  var VSR = (function () {
    'use strict';
    // score-player.js is not part of the Music Lab: its sounds are stubs, so VSR.Tones must not be used there.
    var mod_score_player = (function () {
      var missing = function () { throw new Error('VSR: score-player sounds are not included in the Music Lab block'); };
      return { playSound: missing, playSwell: missing, SOUNDS: {} };
    })();
  var mod_common = (function () {
    // Shared pieces for the Practice Room trainers: seeded randomness, voice types and a small synth.
    // Framework-free; its one import is the practice sounds shared with the score player (an AlloFlow
    // port needs both files).
    var playSound = mod_score_player.playSound, playSwell = mod_score_player.playSwell, SOUNDS = mod_score_player.SOUNDS;
    // ---- The practice sound (one choice for the whole Practice Room) ------------------------
    const SOUND_KEY = 'rp-sound';
    
    /** The visitor's chosen practice sound: a key of SOUNDS ('piano' unless they picked another). */
    function loadSound() {
      try {
        const v = localStorage.getItem(SOUND_KEY);
        return v && SOUNDS[v] ? v : 'piano';
      } catch {
        return 'piano';
      }
    }
    
    /** Remember a new choice and tell every player and trainer on the page (event 'sound:change'). */
    function saveSound(sound) {
      if (!SOUNDS[sound]) return;
      try {
        localStorage.setItem(SOUND_KEY, sound);
      } catch {}
      document.dispatchEvent(new CustomEvent('sound:change', { detail: sound }));
    }
    
    
    
    // ---- Seeded randomness -------------------------------------------------------------
    // The same seed always gives the same exercise, so a teacher can hand out a code (or a link)
    // and every student gets the identical melody or rhythm.
    
    /** FNV-1a: a string to a 32-bit seed. */
    function hashSeed(str) {
      let h = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return h >>> 0;
    }
    
    /** mulberry32: a fast, good-enough PRNG returning numbers in [0, 1). */
    function seededRandom(seed) {
      let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
      const rand = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      rand.int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1)); // inclusive
      rand.pick = (list) => list[Math.floor(rand() * list.length)];
      /** Pick from [[value, weight], ...]. */
      rand.weighted = (pairs) => {
        const total = pairs.reduce((s, [, w]) => s + Math.max(0, w), 0);
        let r = rand() * total;
        for (const [v, w] of pairs) {
          r -= Math.max(0, w);
          if (r < 0) return v;
        }
        return pairs[pairs.length - 1][0];
      };
      return rand;
    }
    
    // No 0/O, 1/I/L: codes are read aloud and typed by students.
    const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    
    /** A short, friendly exercise code like "K7QX2". */
    function newCode(length = 5) {
      const buf = new Uint32Array(length);
      crypto.getRandomValues(buf);
      return Array.from(buf, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('');
    }
    
    /** Today's date as YYYYMMDD in the visitor's own time zone (not UTC). */
    function todayStamp(d = new Date()) {
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }
    
    // ---- Voice types -------------------------------------------------------------------
    // Comfortable practice ranges (MIDI), deliberately inside the full professional ranges.
    // Tenors read treble clef an octave down; baritones and basses read bass clef.
    
    const VOICE_TYPES = {
      soprano: { label: 'Soprano', low: 60, high: 79, clef: 'treble' },
      mezzo: { label: 'Mezzo-soprano', low: 57, high: 76, clef: 'treble' },
      alto: { label: 'Alto', low: 53, high: 72, clef: 'treble' },
      tenor: { label: 'Tenor', low: 48, high: 67, clef: 'treble8' },
      baritone: { label: 'Baritone', low: 45, high: 64, clef: 'bass' },
      bass: { label: 'Bass', low: 40, high: 60, clef: 'bass' },
    };
    
    const VOICE_KEY = 'rp-voice-type';
    
    function loadVoiceType() {
      try {
        const v = localStorage.getItem(VOICE_KEY);
        return VOICE_TYPES[v] ? v : 'mezzo';
      } catch {
        return 'mezzo';
      }
    }
    
    function saveVoiceType(v) {
      try {
        localStorage.setItem(VOICE_KEY, v);
      } catch {}
    }
    
    // ---- Notes -------------------------------------------------------------------------
    
    const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
    const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
    /** Note name with octave. spelling: 'sharps' or 'flats' to follow a key; by default the common mix. */
    const noteLabel = (midi, spelling) =>
      `${(spelling === 'sharps' ? SHARP_NAMES : spelling === 'flats' ? FLAT_NAMES : NAMES)[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
    const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
    
    // ---- A small synth -----------------------------------------------------------------
    
    /**
     * iPhones and iPads mute Web Audio when the side switch is on silent (videos still play), so
     * declare the sound as media playback (Safari 17+) and, on older iOS, start a silent looping
     * <audio> element that moves the page into the media channel. Must run inside a tap.
     * (Same as routeAudioAsMedia in score-player.js; each module stays import-free.)
     */
    function routeAudioAsMedia() {
      try {
        if (navigator.audioSession && navigator.audioSession.type === 'auto') navigator.audioSession.type = 'playback';
      } catch {}
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);
      if (!ios) return;
      // Already made: play it again if iOS refused the first time (it does when a finger is only going down).
      if (routeAudioAsMedia.el) {
        if (routeAudioAsMedia.el.paused) routeAudioAsMedia.el.play().catch(() => {});
        return;
      }
      const n = 2000; // a quarter second of silent 8 kHz, 8-bit WAV
      const bytes = new Uint8Array(44 + n);
      const dv = new DataView(bytes.buffer);
      const put = (at, s) => [...s].forEach((ch, i) => (bytes[at + i] = ch.charCodeAt(0)));
      put(0, 'RIFF');
      dv.setUint32(4, 36 + n, true);
      put(8, 'WAVEfmt ');
      dv.setUint32(16, 16, true);
      dv.setUint16(20, 1, true);
      dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true);
      dv.setUint32(28, 8000, true);
      dv.setUint16(32, 1, true);
      dv.setUint16(34, 8, true);
      put(36, 'data');
      dv.setUint32(40, n, true);
      bytes.fill(128, 44);
      let bin = '';
      bytes.forEach((b) => (bin += String.fromCharCode(b)));
      const el = document.createElement('audio');
      el.setAttribute('x-webkit-airplay', 'deny');
      el.loop = true;
      el.src = 'data:audio/wav;base64,' + btoa(bin);
      el.play().catch(() => {});
      routeAudioAsMedia.el = el;
    }
    // One AudioContext per page; every sound is scheduled on its clock so rhythms stay exact.
    
    class Tones {
      get ctx() {
        if (!this._ctx) {
          this._ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.out = this._ctx.createDynamicsCompressor();
          // Everything passes one last gain, so hush() can fade whatever is sounding without a click.
          this.master = this._ctx.createGain();
          this.out.connect(this.master);
          this.master.connect(this._ctx.destination);
          this._armUnlock();
        }
        return this._ctx;
      }
    
      // Browsers only let sound start from a real gesture, and on phones a finger going DOWN doesn't count (iPhones
      // need it to lift: touchend/pointerup/click). A piano key reacts on the way down, so start the audio again on
      // the next gesture that counts, and keep the iPhone's media routing (silent switch) trying too.
      _armUnlock() {
        if (typeof document === 'undefined') return;
        const unlock = () => {
          routeAudioAsMedia();
          const c = this._ctx;
          if (!c || c.state === 'running') {
            for (const ev of EVENTS) document.removeEventListener(ev, unlock, true);
            return;
          }
          c.resume().catch(() => {});
        };
        const EVENTS = ['pointerup', 'touchend', 'click', 'keydown'];
        for (const ev of EVENTS) document.addEventListener(ev, unlock, true);
      }
    
      async ready() {
        routeAudioAsMedia();
        const c = this.ctx;
        if (c.state !== 'running') {
          // resume() may be refused (iPhone: a finger going down) or wait for a gesture: either way, carry on once the
          // audio really runs, which the next lift, click or key press brings (see #armUnlock).
          const running = new Promise((resolve) => {
            const on = () => {
              if (c.state !== 'running') return;
              c.removeEventListener('statechange', on);
              resolve();
            };
            c.addEventListener('statechange', on);
          });
          c.resume().catch(() => {});
          if (c.state !== 'running') await running;
        }
        // resume() can resolve before the audio clock starts moving (seconds, on a busy device).
        // Anything scheduled or timed before then drifts, so wait until the clock is really running.
        const t0 = performance.now();
        while (performance.now() - t0 < 4000) {
          const ts = c.getOutputTimestamp?.();
          if (c.currentTime > 0.02 && (!ts || ts.contextTime > 0)) break;
          await new Promise((r) => setTimeout(r, 20));
        }
        return c;
      }
    
      now() {
        return this.ctx.currentTime;
      }
    
      // Until when (audio clock) something this synth scheduled can still be heard, tail included.
      _busy(end) {
        this.until = Math.max(this.until || 0, end);
      }
    
      /**
       * True while one of these sounds can be heard (or is about to start): pass it to
       * VoiceAnalyzer.setIgnore so a microphone without headphones doesn't take the site's own piano
       * or chime for the singer. Allows for speaker delay and the analysis window.
       */
      sounding() {
        const c = this._ctx;
        if (!c || !this.until) return false;
        const lat = Math.max(0, Math.min(0.5, (c.outputLatency || 0) + (c.baseLatency || 0)));
        return c.currentTime - lat < this.until + 0.15;
      }
    
      /**
       * The audio-clock time the listener was HEARING when an input event happened. People tap along
       * to the speakers, which run behind the clock (Bluetooth by 0.2 s or more), so taps are compared
       * with what was audible, not with what was being scheduled.
       */
      heardTime(timeStamp) {
        const c = this.ctx;
        const ts = c.getOutputTimestamp?.();
        // getOutputTimestamp pairs the context time now leaving the speakers with a performance.now() time.
        if (ts && ts.performanceTime > 0 && typeof timeStamp === 'number') return ts.contextTime + (timeStamp - ts.performanceTime) / 1000;
        return c.currentTime - Math.max(0, Math.min(0.4, (c.outputLatency || 0) + (c.baseLatency || 0)));
      }
    
      /**
       * A note in the visitor's chosen practice sound (piano unless they picked another; see loadSound).
       * Pass `sound` to force one.
       */
      piano(midi, at = this.now(), dur = 0.9, level = 1, sound = loadSound()) {
        const { nodes, stopAt } = playSound(this.ctx, this.out, sound, midi, at, dur, level * 1.6);
        this._track(nodes, stopAt);
      }
    
      /** A messa di voce guide: one note swelling from very soft to full and back over `dur` (see playSwell). */
      swell(midi, at = this.now(), dur = 6, level = 0.75, sound = loadSound()) {
        const { nodes, stopAt } = playSwell(this.ctx, this.out, sound, midi, at, dur, level * 1.6);
        this._track(nodes, stopAt);
      }
    
      // Notes that are sounding or scheduled, so hush() can end them early.
      _live = new Set();
      _track(nodes, stopAt) {
        for (const n of nodes) {
          n.stop(stopAt);
          this._live.add(n);
          n.addEventListener?.('ended', () => this._live.delete(n));
        }
        this._busy(stopAt);
      }
    
      /**
       * Silence every note that is sounding or already scheduled (a long guide note would otherwise ring on after
       * "Stop"): a 40 ms fade, the notes ended, the level restored for whatever plays next (from 60 ms on).
       */
      hush() {
        const c = this._ctx;
        if (!c || !this._live.size) return;
        const t = c.currentTime;
        const g = this.master.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(0, t + 0.04);
        g.setValueAtTime(1, t + 0.06);
        for (const n of this._live) {
          try {
            n.stop(t + 0.05);
          } catch {}
        }
        this._live.clear();
        this.until = Math.min(this.until || 0, t + 0.06);
      }
    
      chord(midis, at = this.now(), dur = 1.2) {
        midis.forEach((m) => this.piano(m, at, dur, 0.55));
      }
    
      /** Metronome tick, higher on the downbeat. */
      click(at = this.now(), accent = false, level = 1) {
        const c = this.ctx;
        const o = c.createOscillator();
        o.frequency.value = accent ? 1500 : 1000;
        const env = c.createGain();
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime((accent ? 0.45 : 0.28) * level, at + 0.002);
        env.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
        o.connect(env).connect(this.out);
        o.start(at);
        o.stop(at + 0.06);
        this._busy(at + 0.08);
      }
    
      /** A woodblock-ish knock for rhythm patterns, distinct from the metronome. */
      knock(at = this.now(), level = 1) {
        const c = this.ctx;
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(820, at);
        o.frequency.exponentialRampToValueAtTime(520, at + 0.06);
        const env = c.createGain();
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(0.6 * level, at + 0.002);
        env.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
        o.connect(env).connect(this.out);
        o.start(at);
        o.stop(at + 0.14);
        this._busy(at + 0.16);
      }
    
      /**
       * A soft, warm "ding" for success: two round bell tones a sixth apart (E5, then C6), a gentle 12 ms swell
       * instead of a hammer strike, the highest overtones filtered off and a long quiet fade; about 7 dB quieter than
       * the old piano chime (C6 + G6, bright and sharp), measured offline through the output compressor.
       */
      chime(at = this.now()) {
        const c = this.ctx;
        const bus = c.createGain();
        bus.gain.value = 0.14;
        const soft = c.createBiquadFilter();
        soft.type = 'lowpass';
        soft.frequency.value = 2600;
        bus.connect(soft).connect(this.out);
        const bell = (midi, t, level) => {
          const f = 440 * Math.pow(2, (midi - 69) / 12);
          // A struck bell's fundamental rings longest; its octave and a soft high partial fade sooner.
          for (const [mult, gain, ring] of [[1, 1, 1.7], [2, 0.16, 0.8], [3, 0.04, 0.35]]) {
            const o = c.createOscillator();
            o.type = 'sine';
            o.frequency.value = f * mult;
            const env = c.createGain();
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(level * gain, t + 0.012);
            env.gain.exponentialRampToValueAtTime(0.0005, t + ring);
            o.connect(env).connect(bus);
            o.start(t);
            o.stop(t + ring + 0.05);
          }
        };
        bell(76, at, 1);
        bell(84, at + 0.11, 0.8);
        this._busy(at + 1.85);
      }
    }

    return { loadSound, saveSound, hashSeed, seededRandom, newCode, todayStamp, VOICE_TYPES, loadVoiceType, saveVoiceType, noteLabel, midiToHz, routeAudioAsMedia, Tones, SOUNDS };
  })();
  var mod_rhythm = (function () {
    // Rhythm clap-back: seeded rhythm generator, notation (MusicXML) and the tap scorer.
    // scoreRhythm() is ported from AlloFlow's Music Lab (stem_tool_music.js), where it has its own tests.
    
    // Durations are in sixteenths (4 = a quarter note). A cell fills one beat or more; 'r' marks a rest.
    // Simple time: the beat is a quarter (4). Compound time (6/8): the beat is a dotted quarter (6).
    const SIMPLE_CELLS = [
      { d: [4], level: 1 },
      { d: [8], level: 1 },
      { d: ['r4'], level: 1 },
      { d: [2, 2], level: 2 },
      { d: [6, 2], level: 2 },
      { d: [12], level: 2 },
      { d: ['r2', 2], level: 3 },
      { d: [3, 1], level: 3 },
      { d: [2, 1, 1], level: 3 },
      { d: [1, 1, 2], level: 3 },
      { d: [1, 1, 1, 1], level: 3 },
      { d: [2, 4, 2], level: 4 }, // syncopation across the beat
      { d: [1, 2, 1], level: 4 },
      { d: [1, 3], level: 4 }, // Scotch snap
      { d: ['r1', 1, 2], level: 4 },
      { d: [2, 'r2'], level: 4 },
    ];
    const COMPOUND_CELLS = [
      { d: [6], level: 1 },
      { d: [12], level: 1 },
      { d: [4, 2], level: 1 },
      { d: [2, 2, 2], level: 2 },
      { d: ['r6'], level: 2 },
      { d: [3, 1, 2], level: 3 },
      { d: [2, 4], level: 3 },
      { d: ['r2', 2, 2], level: 3 },
      { d: [1, 1, 2, 2], level: 4 },
      { d: [2, 1, 1, 2], level: 4 },
      { d: [2, 'r2', 2], level: 4 },
    ];
    
    const METERS = {
      '4/4': { beats: 4, beat: 4, num: 4, den: 4 },
      '3/4': { beats: 3, beat: 4, num: 3, den: 4 },
      '2/4': { beats: 2, beat: 4, num: 2, den: 4 },
      '6/8': { beats: 2, beat: 6, num: 6, den: 8 },
    };
    
    const RHYTHM_LEVELS = [
      { level: 1, name: 'Level 1: quarters and halves', meters: ['4/4', '3/4'], bars: 1 },
      { level: 2, name: 'Level 2: eighth notes and dots', meters: ['4/4', '3/4', '2/4'], bars: 1 },
      { level: 3, name: 'Level 3: sixteenths and rests', meters: ['4/4', '3/4', '6/8'], bars: 2 },
      { level: 4, name: 'Level 4: syncopation', meters: ['4/4', '3/4', '6/8', '2/4'], bars: 2 },
    ];
    
    /**
     * Generate a rhythm. Returns { meter, bars: [[{ dur, rest }]], onsets: [beats...], beats }.
     * Onsets are in beats from the start (the unit the scorer works in).
     * length: how many bars (1, 2, 4, 8 ...); omitted = the level's own length.
     */
    function generateRhythm(rand, level, meterName, length) {
      const L = RHYTHM_LEVELS[Math.max(0, Math.min(RHYTHM_LEVELS.length - 1, level - 1))];
      const meter = METERS[meterName || rand.pick(L.meters)] || METERS['4/4'];
      const name = Object.keys(METERS).find((k) => METERS[k] === meter);
      const cells = (meter.beat === 6 ? COMPOUND_CELLS : SIMPLE_CELLS).filter((c) => c.level <= L.level);
      const barLen = meter.beats * meter.beat;
      // A 2/4 bar is too short to be a rhythm by itself (at level 1 only "two quarter notes" would pass), so 2/4
      // always gets two bars and a bar there may hold a single note.
      const short = barLen <= 8;
      const asked = Number.isInteger(length) && length >= 1 && length <= 16 ? length : L.bars;
      const barCount = Math.max(asked, short ? 2 : 1);
      const minNotes = short ? 1 : 2;
      const bars = [];
      for (let b = 0; b < barCount; b++) {
        for (let attempt = 0; attempt < 40; attempt++) {
          const bar = [];
          let pos = 0;
          while (pos < barLen) {
            const fits = cells.filter((c) => {
              const len = c.d.reduce((s, x) => s + dur(x), 0);
              // Cells longer than a beat start where they read clearly: on a multiple of their own length.
              return pos + len <= barLen && (len <= meter.beat || pos % len === 0);
            });
            // Favour cells at the student's level so each level actually sounds different.
            const cell = rand.weighted(fits.map((c) => [c, c.level === L.level ? 3 : 1 + (c.d.length > 1 ? 0.5 : 0)]));
            for (const x of cell.d) bar.push({ dur: dur(x), rest: typeof x === 'string' });
            pos += cell.d.reduce((s, x) => s + dur(x), 0);
          }
          const notes = bar.filter((n) => !n.rest).length;
          // Begin the first bar on a note, keep at least two notes per bar (one in a short bar), and not too many rests.
          if ((b === 0 && bar[0].rest) || notes < minNotes || bar.filter((n) => n.rest).length > 2) continue;
          // Avoid a bar identical to the previous one (boring) unless we're out of tries.
          if (b > 0 && attempt < 30 && JSON.stringify(bar) === JSON.stringify(bars[b - 1])) continue;
          bars.push(bar);
          break;
        }
        // Out of tries (rare): a plain bar of beats, never a missing bar.
        if (bars.length === b) bars.push(Array.from({ length: meter.beats }, () => ({ dur: meter.beat, rest: false })));
      }
      const onsets = [];
      let pos = 0;
      for (const bar of bars)
        for (const n of bar) {
          if (!n.rest) onsets.push(pos / meter.beat);
          pos += n.dur;
        }
      return { meter: name, num: meter.num, den: meter.den, beatsPerBar: meter.beats, beatUnit: meter.beat, bars, onsets, beats: pos / meter.beat };
    }
    
    function dur(x) {
      return typeof x === 'string' ? Number(x.slice(1)) : x;
    }
    
    const TYPES = { 1: ['16th', 0], 2: ['eighth', 0], 3: ['eighth', 1], 4: ['quarter', 0], 6: ['quarter', 1], 8: ['half', 0], 12: ['half', 1], 16: ['whole', 0] };
    
    /** MusicXML for a one-line rhythm staff (percussion clef). */
    function rhythmToMusicXML(r, bpm) {
      const measures = r.bars
        .map((bar, i) => {
          const attrs =
            i === 0
              ? `<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>${r.num}</beats><beat-type>${r.den}</beat-type></time><clef><sign>percussion</sign></clef><staff-details><staff-lines>1</staff-lines></staff-details></attributes>` +
                `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit>${r.beatUnit === 6 ? '<beat-unit-dot/>' : ''}<per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${r.beatUnit === 6 ? bpm * 1.5 : bpm}"/></direction>`
              : '';
          const beams = beamsFor(bar, r.beatUnit);
          const notes = bar
            .map((n, k) => {
              const [type, dots] = TYPES[n.dur];
              const dot = dots ? '<dot/>' : '';
              if (n.rest) return `<note><rest/><duration>${n.dur}</duration><type>${type}</type>${dot}</note>`;
              return `<note><unpitched><display-step>E</display-step><display-octave>4</display-octave></unpitched><duration>${n.dur}</duration><type>${type}</type>${dot}<stem>up</stem>${beams[k] || ''}</note>`;
            })
            .join('');
          const end = i === r.bars.length - 1 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : '';
          return `<measure number="${i + 1}">${attrs}${notes}${end}</measure>`;
        })
        .join('');
      return xmlDoc('Rhythm', measures);
    }
    
    /**
     * Beam elements for one bar: notes shorter than a quarter are beamed within each beat,
     * with a second beam (or hook) for sixteenths. Shared with the melody writer.
     */
    function beamsFor(bar, beat) {
      const out = new Array(bar.length).fill('');
      let pos = 0;
      const groups = new Map();
      bar.forEach((n, k) => {
        const g = Math.floor(pos / beat);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(k);
        pos += n.dur;
      });
      for (const idx of groups.values()) {
        // Split each beat into runs of beamable notes (no rests, shorter than a quarter).
        let run = [];
        const flush = () => {
          if (run.length >= 2) {
            run.forEach((k, j) => {
              const b1 = j === 0 ? 'begin' : j === run.length - 1 ? 'end' : 'continue';
              let b2 = '';
              if (bar[k].dur <= 1) {
                const prev = j > 0 && bar[run[j - 1]].dur <= 1;
                const next = j < run.length - 1 && bar[run[j + 1]].dur <= 1;
                b2 = prev && next ? 'continue' : prev ? 'end' : next ? 'begin' : j === 0 ? 'forward hook' : 'backward hook';
              }
              out[k] = `<beam number="1">${b1}</beam>` + (b2 ? `<beam number="2">${b2}</beam>` : '');
            });
          }
          run = [];
        };
        for (const k of idx) {
          if (!bar[k].rest && bar[k].dur < 4) run.push(k);
          else flush();
        }
        flush();
      }
      return out;
    }
    
    function xmlDoc(partName, measures) {
      return `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
    <score-partwise version="4.0"><part-list><score-part id="P1"><part-name print-object="no">${partName}</part-name></score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
    }
    
    // ---- Scoring (ported from AlloFlow) -------------------------------------------------
    
    // Grading bands as a fraction of one beat, so they scale with tempo.
    const TIGHT_FRACTION = 0.06; // on the money
    const CLOSE_FRACTION = 0.14; // recognisably the right rhythm
    const MATCH_FRACTION = 0.5; // beyond half a beat a tap belongs to another onset
    
    /**
     * Score taps against expected onsets (both in ms from the same origin). Matching is greedy over
     * the closest pairs first, so one early tap doesn't push every later tap onto the wrong onset.
     * Returns per-onset grades ('tight' | 'close' | 'loose' | 'missed'), extras, bias and accuracy 0-1.
     */
    function scoreRhythm(expectedMs, tapsMs, beatMs) {
      const expected = (expectedMs || []).slice();
      const taps = (tapsMs || []).slice().sort((a, b) => a - b);
      const beat = typeof beatMs === 'number' && isFinite(beatMs) && beatMs > 0 ? beatMs : 500;
      const matchWindow = beat * MATCH_FRACTION;
      const tightMs = beat * TIGHT_FRACTION;
      const closeMs = beat * CLOSE_FRACTION;
    
      const pairs = [];
      expected.forEach((ex, e) =>
        taps.forEach((tap, t) => {
          const delta = tap - ex;
          if (Math.abs(delta) <= matchWindow) pairs.push({ e, t, delta, abs: Math.abs(delta) });
        }),
      );
      pairs.sort((a, b) => a.abs - b.abs);
    
      const usedE = new Set();
      const usedT = new Set();
      const onsets = expected.map((ms) => ({ expectedMs: ms, tapMs: null, deltaMs: null, grade: 'missed' }));
      for (const p of pairs) {
        if (usedE.has(p.e) || usedT.has(p.t)) continue;
        usedE.add(p.e);
        usedT.add(p.t);
        onsets[p.e] = { expectedMs: expected[p.e], tapMs: taps[p.t], deltaMs: p.delta, grade: p.abs <= tightMs ? 'tight' : p.abs <= closeMs ? 'close' : 'loose' };
      }
      const extras = taps.filter((_, t) => !usedT.has(t));
      const hits = onsets.filter((o) => o.tapMs !== null);
      const abs = hits.map((o) => Math.abs(o.deltaMs));
      // Each onset earns credit by how tightly it was hit; extra taps cost as much as a miss.
      const credit = onsets.reduce((s, o) => s + ({ tight: 1, close: 0.75, loose: 0.35 }[o.grade] || 0), 0);
      return {
        onsets,
        extras,
        hit: hits.length,
        missed: onsets.length - hits.length,
        extra: extras.length,
        meanAbsMs: abs.length ? abs.reduce((a, b) => a + b, 0) / abs.length : 0,
        maxAbsMs: abs.length ? Math.max(...abs) : 0,
        biasMs: hits.length ? hits.reduce((a, o) => a + o.deltaMs, 0) / hits.length : 0, // + = behind the beat
        accuracy: Math.max(0, Math.min(1, credit / Math.max(1, expected.length + extras.length))),
        tightMs,
        closeMs,
      };
    }

    return { SIMPLE_CELLS, COMPOUND_CELLS, METERS, RHYTHM_LEVELS, generateRhythm, rhythmToMusicXML, beamsFor, xmlDoc, scoreRhythm };
  })();
    return Object.assign({}, mod_common, mod_rhythm);
  })();
  // ═══ End voice studio block ═══

  // Generated rhythms for Clap-Back: real notation (OpenSheetMusicDisplay, loaded on first use like
  // three.js elsewhere) and a timeline of taps against the written notes.
  // Gemini Canvas refuses third-party CDNs, so the copy beside this script's own host (vendor/) is tried first,
  // then jsdelivr (as the Singing Lab does). A missing file on the CDN is an HTML page with status 200: judge a
  // source by the global it should define.
  var VSR_OSMD_URL = 'https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@2.2.1/build/opensheetmusicdisplay.min.js';
  var VSR_SCRIPT_SRC = (function () {
    try { return (document.currentScript && document.currentScript.src) || ''; } catch (e) { return ''; }
  })();
  var _vsrOsmdPromise = null;
  function vsrLoadOSMD() {
    var have = function () { return window.opensheetmusicdisplay && window.opensheetmusicdisplay.OpenSheetMusicDisplay; };
    if (have()) return Promise.resolve(window.opensheetmusicdisplay);
    if (_vsrOsmdPromise) return _vsrOsmdPromise;
    var sources = [];
    try { if (VSR_SCRIPT_SRC) sources.push(new URL('../vendor/opensheetmusicdisplay-2.2.1/opensheetmusicdisplay.min.js', VSR_SCRIPT_SRC).href); } catch (e) { /* jsdelivr only */ }
    if (typeof window === 'undefined' || window._isDesktopBundledApp !== true) sources.push(VSR_OSMD_URL);
    _vsrOsmdPromise = (function next(i) {
      if (i >= sources.length) return Promise.reject(new Error('notation library failed to load'));
      return new Promise(function (resolve) {
        var s = document.createElement('script');
        s.src = sources[i];
        if (sources[i] === VSR_OSMD_URL) {
          s.integrity = 'sha384-SN393YK0P5KMe7T1cPYzMSaCAP9VHWjBHw+irRbO7IyqZxGp14EH+p3YOKBwC1KL';
          s.crossOrigin = 'anonymous';
          s.referrerPolicy = 'no-referrer';
        }
        s.async = true;
        s.onload = function () { resolve(!!have()); };
        s.onerror = function () { resolve(false); };
        document.head.appendChild(s);
      }).then(function (ok) { return ok ? window.opensheetmusicdisplay : next(i + 1); });
    })(0);
    _vsrOsmdPromise.catch(function () { _vsrOsmdPromise = null; });
    return _vsrOsmdPromise;
  }

  // How far the speakers run behind the audio clock. A student taps to what they HEAR, so a tap is
  // compared with the sound that was audible then (Bluetooth headphones can lag 0.2 s or more).
  function vsrOutputLag(actx) {
    try {
      var ts = actx.getOutputTimestamp && actx.getOutputTimestamp();
      if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
        var heard = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
        // Not clamped at 0: currentTime can step in large chunks and trail the smooth estimate.
        return Math.max(-0.5, Math.min(0.5, actx.currentTime - heard));
      }
      return Math.max(0, Math.min(0.5, (actx.outputLatency || 0) + (actx.baseLatency || 0)));
    } catch (e) { return 0; }
  }
  // Seconds to subtract from 'now' for a tap: the speaker lag, plus how long the event waited
  // before its handler ran (a busy re-render must not make a student look late).
  function vsrTapOffset(actx, ev) {
    var waited = ev && typeof ev.timeStamp === 'number' && ev.timeStamp > 0 ? Math.max(0, Math.min(0.5, (performance.now() - ev.timeStamp) / 1000)) : 0;
    return vsrOutputLag(actx) + waited;
  }
  // Mouse and touch taps count on pointerdown (a click waits for the release); keyboard taps
  // arrive as clicks with detail 0, so only those clicks are kept.
  function vsrTapIgnored(e) { return !!(e && e.type === 'click' && e.detail !== 0); }

  function vsrFmt(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (whole, name) { return vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole; });
  }
  function vsrEsc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; });
  }
  var VSR_METERS = ['4/4', '3/4', '2/4', '6/8'];
  var VSR_BARS = [1, 2, 4, 8];
  // A generated rhythm. Every rhythm has an exercise code: the same code with the same level, time signature and
  // length gives the same rhythm (as on the website), so a teacher can hand one out or print it.
  function vsrMakeGen(level, meter, length, code) {
    code = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 12) || VSR.newCode();
    meter = VSR_METERS.indexOf(meter) >= 0 ? meter : '';
    length = VSR_BARS.indexOf(Number(length)) >= 0 ? Number(length) : 0;
    var r = VSR.generateRhythm(VSR.seededRandom(code), level, meter || undefined, length || undefined);
    return { id: 'gen' + level, level: level, name: 'Generated', beats: r.beats, onsets: r.onsets, beatsPerBar: r.beatsPerBar,
      bars: r.bars, num: r.num, den: r.den, beatUnit: r.beatUnit, meter: r.meter, code: code, pickMeter: meter, pickLength: length };
  }

  var VSR_GRADE_COLORS = { tight: '#16a34a', close: '#65a30d', loose: '#d97706', missed: '#dc2626' };

  function VsrRhythmNotation(p) {
    var React = p.React;
    var h = React.createElement;
    var boxRef = React.useRef(null);
    var osmdRef = React.useRef(null);
    var notesRef = React.useRef([]);
    var stS = React.useState('loading'); var state = stS[0]; var setState = stS[1];
    var xml = VSR.rhythmToMusicXML(p.rhythm, 80);
    React.useEffect(function () {
      var alive = true;
      vsrLoadOSMD().then(function (OSMD) {
        if (!alive || !boxRef.current) return;
        if (!osmdRef.current) osmdRef.current = new OSMD.OpenSheetMusicDisplay(boxRef.current, { autoResize: true, backend: 'svg', drawTitle: false, drawPartNames: false, drawMetronomeMarks: false });
        var o = osmdRef.current;
        return o.load(xml).then(function () {
          o.Zoom = 0.9;
          o.render(); // the cursor only exists after a first render
          notesRef.current = [];
          var cur = o.cursor;
          cur.reset();
          while (!cur.Iterator.EndReached) {
            cur.Iterator.CurrentVoiceEntries.forEach(function (ve) { ve.Notes.forEach(function (n) { if (!n.isRest()) notesRef.current.push(n); }); });
            cur.next();
          }
          cur.hide();
          notesRef.current.forEach(function (n, i) { n.NoteheadColor = p.grades && p.grades[i] ? VSR_GRADE_COLORS[p.grades[i]] : undefined; });
          o.render();
          if (alive) setState('ready');
        });
      }).catch(function (e) { console.warn('[Music] notation failed', e); if (alive) setState('error'); });
      return function () { alive = false; };
    }, [xml, (p.grades || []).join(',')]);
    return h('div', null,
      h('div', { ref: boxRef, role: 'img', 'aria-label': p.label, className: 'rounded-lg border border-rose-200 overflow-x-auto', style: { background: '#fff', minHeight: 70 } }),
      state === 'error' && h('p', { className: 'text-[0.6875rem] text-rose-800 mt-1' }, p.errorText));
  }

  // Printing: each rhythm drawn off screen at paper width and kept as its SVG, then a page of them opened in a new
  // window that prints itself (Canvas ignores print() on the app page); a downloaded page if pop-ups are blocked.
  function vsrDrawForPaper(OSMD, holder, r) {
    var box = document.createElement('div');
    holder.appendChild(box);
    var o = new OSMD.OpenSheetMusicDisplay(box, { autoResize: false, backend: 'svg', drawTitle: false, drawPartNames: false, drawMetronomeMarks: false });
    var rules = o.EngravingRules;
    if (rules) Object.assign(rules, { PageTopMargin: 1.5, PageBottomMargin: 1, PageLeftMargin: 1, PageRightMargin: 1 });
    return o.load(VSR.rhythmToMusicXML(r, 80)).then(function () {
      o.Zoom = 0.9;
      o.render();
      var svg = box.querySelector('svg');
      if (svg && !svg.getAttribute('viewBox') && svg.getAttribute('width')) svg.setAttribute('viewBox', '0 0 ' + parseFloat(svg.getAttribute('width')) + ' ' + parseFloat(svg.getAttribute('height')));
      return svg ? new XMLSerializer().serializeToString(svg) : '';
    });
  }
  function vsrPrintSheet(opts) {
    // opts: { t, gen, count, levelName, meterText, lengthText, lang }
    var t = opts.t;
    var g = opts.gen;
    var count = Math.min(12, Math.max(1, Number(opts.count) || 1));
    var w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    try { if (w) w.opener = null; } catch (_) {}
    try { if (w && w.document) w.document.write('<p style="font-family:system-ui,sans-serif;margin:2em">' + vsrEsc(t('stem.music.rg_print_preparing', 'Getting the page ready…')) + '</p>'); } catch (e) { w = null; }
    var codes = [g.code];
    while (codes.length < count) { var c = VSR.newCode(); if (codes.indexOf(c) < 0) codes.push(c); }
    var holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;left:-10000px;top:0;width:690px;background:#fff';
    document.body.appendChild(holder);
    var items = [];
    return vsrLoadOSMD().then(function (OSMD) {
      var chain = Promise.resolve();
      codes.forEach(function (code, i) {
        chain = chain.then(function () {
          var r = i === 0 ? g : vsrMakeGen(g.level, g.pickMeter, g.pickLength, code);
          return vsrDrawForPaper(OSMD, holder, r).then(function (svg) {
            items.push({ cap: (count > 1 ? (i + 1) + '.  ' : '') + r.meter + ' · ' + vsrFmt(t('stem.music.rg_print_exercise', 'exercise {code}'), { code: code }), svg: svg });
          });
        });
      });
      return chain;
    }).then(function () {
      holder.remove();
      var title = count > 1 ? t('stem.music.rg_print_title_many', 'Rhythm Reading') : t('stem.music.rg_print_title_one', 'Rhythm');
      var spec = [opts.levelName, opts.meterText, opts.lengthText].filter(Boolean).join(' · ');
      var html = '<!doctype html><html lang="' + vsrEsc(opts.lang || 'en') + '"><head><meta charset="utf-8"><title>' + vsrEsc(title + ' · ' + codes[0]) + '</title><style>' +
        '@page{margin:0}html,body{margin:0;background:#fff;color:#111}body{font-family:Georgia,"Times New Roman",serif}' +
        '.sheet{padding:0.5in;-webkit-box-decoration-break:clone;box-decoration-break:clone}h1{font-size:20pt;margin:0 0 6pt}' +
        '.name{font-size:12pt;margin:0 0 6pt}.spec{font-size:9.5pt;color:#333;margin:0 0 10pt}.item{break-inside:avoid;page-break-inside:avoid;margin:0 0 4pt}' +
        '.cap{font-size:10pt;font-weight:bold;margin:6pt 0 0}svg{display:block;max-width:100%;height:auto}.foot{font-size:9pt;color:#444;margin-top:10pt}' +
        '@media screen{body{background:#e5e7eb}.sheet{max-width:7.5in;margin:16px auto;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.2)}}' +
        '</style></head><body><div class="sheet"><h1>' + vsrEsc(title) + '</h1><p class="name">' + vsrEsc(t('stem.music.rg_print_name', 'Name ______________________   Date ____________')) + '</p><p class="spec">' + vsrEsc(spec) + '</p>' +
        items.map(function (it) { return '<div class="item"><p class="cap">' + vsrEsc(it.cap) + '</p>' + it.svg + '</div>'; }).join('') +
        '<p class="foot">' + vsrEsc(t('stem.music.rg_print_foot', 'To hear one: open Rhythm Clap-Back in the AlloFlow Music Lab, choose the same level, time signature and length, and type its exercise code.')) + '</p>' +
        '</div><script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>';
      if (w && !w.closed) {
        w.document.open(); w.document.write(html); w.document.close();
        return 'opened';
      }
      var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'rhythm-' + codes[0] + '.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return 'downloaded';
    }, function (e) {
      holder.remove();
      try { if (w && !w.closed) w.close(); } catch (x) { /* gone */ }
      throw e;
    });
  }

  // The row under a generated rhythm: time signature, length, its exercise code (and a box for one), and Print.
  // p: { React, t, gen, busy, meter, bars, printCount, set(key, value), make(meter, bars, code), announce }
  function VsrGenTools(p) {
    var React = p.React;
    var h = React.createElement;
    var t = p.t;
    var inS = React.useState(''); var codeIn = inS[0]; var setCodeIn = inS[1];
    var noteS = React.useState(''); var note = noteS[0]; var setNote = noteS[1];
    var prS = React.useState(false); var printing = prS[0]; var setPrinting = prS[1];
    var g = p.gen;
    var sel = 'px-1.5 py-0.5 rounded text-[0.6875rem] font-bold bg-white border border-rose-500 text-slate-800 max-w-full';
    var lab = 'inline-flex flex-wrap items-center gap-1 text-[0.6875rem] font-bold text-rose-900 max-w-full';
    var btn = 'px-2 py-1 rounded-lg text-xs font-bold bg-white border border-rose-500 text-rose-800 disabled:opacity-50';
    var levelName = vsrFmt(t('stem.music.rg_print_level', 'Level {n}'), { n: g ? g.level : '' });
    var lengthText = function (n) { return n === 1 ? t('stem.music.rg_len_1', '1 bar (2 in 2/4)') : vsrFmt(t('stem.music.rg_len_n', '{n} bars'), { n: n }); };
    function print() {
      if (!g || printing) return;
      setPrinting(true);
      setNote('');
      vsrPrintSheet({ t: t, gen: g, count: p.printCount, levelName: levelName, meterText: g.meter, lengthText: lengthText(g.bars.length), lang: (document.documentElement && document.documentElement.lang) || 'en' })
        .then(function (how) {
          setNote(how === 'opened' ? t('stem.music.rg_print_opened', 'The page to print opened in a new window.') : t('stem.music.rg_print_downloaded', 'This browser blocked the print window, so the page was downloaded instead: open the file and it prints.'));
        }, function () { setNote(t('stem.music.rg_print_failed', 'The page to print could not be made. Try again.')); })
        .then(function () { setPrinting(false); });
    }
    return h('div', { 'data-rg-tools': '', className: 'flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2' },
      h('label', { className: lab }, t('stem.music.rg_time', 'Time'),
        h('select', { 'data-rg-meter': '', className: sel, value: p.meter || '', disabled: p.busy, onChange: function (e) { p.set('rhythmGenMeter', e.target.value); p.make(e.target.value, p.bars); } },
          h('option', { value: '' }, t('stem.music.rg_any', 'Any')),
          VSR_METERS.map(function (m) { return h('option', { key: m, value: m }, m); }))),
      h('label', { className: lab }, t('stem.music.rg_length', 'Length'),
        h('select', { 'data-rg-bars': '', className: sel, value: p.bars ? String(p.bars) : '', disabled: p.busy, onChange: function (e) { var b = Number(e.target.value) || 0; p.set('rhythmGenBars', b); p.make(p.meter, b); } },
          h('option', { value: '' }, t('stem.music.rg_len_level', 'As the level sets')),
          VSR_BARS.map(function (b) { return h('option', { key: b, value: String(b) }, lengthText(b)); }))),
      g && h('span', { 'data-rg-code': g.code, className: 'text-[0.6875rem] font-bold text-slate-800' }, vsrFmt(t('stem.music.rg_exercise', 'Exercise {code}'), { code: g.code })),
      h('form', { className: 'inline-flex items-center gap-1', onSubmit: function (e) {
        e.preventDefault();
        var v = codeIn.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 12);
        if (!v) return;
        setCodeIn('');
        p.make(p.meter, p.bars, v);
        if (p.announce) p.announce(vsrFmt(t('stem.music.rg_code_loaded', 'Exercise {code} loaded.'), { code: v }));
      } },
        h('input', { type: 'text', 'data-rg-code-input': '', value: codeIn, maxLength: 12, placeholder: t('stem.music.rg_have_code', 'Have a code?'), 'aria-label': t('stem.music.rg_code_label', 'Exercise code'),
          onChange: function (e) { setCodeIn(e.target.value); }, className: sel + ' w-28 uppercase' }),
        h('button', { type: 'submit', className: btn, disabled: p.busy }, t('stem.music.rg_go', 'Go'))),
      h('span', { className: 'inline-flex flex-wrap items-center gap-1' },
        h('select', { 'data-rg-print-count': '', className: sel, 'aria-label': t('stem.music.rg_print_what', 'What to print'), value: String(p.printCount || 1), onChange: function (e) { p.set('rhythmPrintCount', Number(e.target.value)); } },
          h('option', { value: '1' }, t('stem.music.rg_print_1', 'This rhythm')),
          [4, 6, 8, 12].map(function (n) { return h('option', { key: n, value: String(n) }, vsrFmt(t('stem.music.rg_print_n', 'A sheet of {n} rhythms'), { n: n })); })),
        h('button', { type: 'button', 'data-rg-print': '', className: btn, disabled: !g || printing || p.busy, onClick: print }, printing ? t('stem.music.rg_print_busy', 'Getting ready…') : '🖨 ' + t('stem.music.rg_print', 'Print'))),
      note && h('p', { role: 'status', className: 'w-full text-[0.6875rem] text-slate-800 m-0' }, note));
  }

  // Written notes (gold) above, the student's taps below, joined when they matched.
  function VsrTimeline(p) {
    var React = p.React;
    var h = React.createElement;
    var r = p.result;
    var total = r.beats * r.beatMs;
    var W = 1000;
    var x = function (ms) { return 20 + (Math.max(-r.beatMs / 2, Math.min(total + r.beatMs / 2, ms)) / total) * (W - 40); };
    var parts = [];
    for (var b = 0; b <= r.beats; b++) {
      var barLine = b % (r.beatsPerBar || r.beats) === 0;
      parts.push(h('line', { key: 'g' + b, x1: x(b * r.beatMs), x2: x(b * r.beatMs), y1: 6, y2: 62, stroke: '#64748b', strokeOpacity: barLine ? 0.6 : 0.2 }));
    }
    r.expected.forEach(function (ms, i) {
      var g = r.grades[i];
      parts.push(h('rect', { key: 'e' + i, x: x(ms) - 4, y: 12, width: 8, height: 12, rx: 2, fill: '#b45309' }));
      if (r.taps[i] !== null && r.taps[i] !== undefined) {
        parts.push(h('line', { key: 'l' + i, x1: x(ms), y1: 24, x2: x(r.taps[i]), y2: 42, stroke: VSR_GRADE_COLORS[g], strokeWidth: 2 }));
        parts.push(h('circle', { key: 'c' + i, cx: x(r.taps[i]), cy: 47, r: 6, fill: VSR_GRADE_COLORS[g] }));
      }
    });
    (r.extras || []).forEach(function (ms, i) {
      parts.push(h('circle', { key: 'x' + i, cx: x(ms), cy: 47, r: 5.5, fill: 'none', stroke: '#dc2626', strokeWidth: 2 }));
    });
    return h('figure', { className: 'mt-2 mb-0' },
      h('svg', { viewBox: '0 0 ' + W + ' 66', role: 'img', 'aria-label': p.label, style: { width: '100%', height: 'auto', maxHeight: 84, display: 'block' } }, parts),
      h('figcaption', { className: 'flex gap-4 text-[0.6875rem] text-slate-700' }, h('span', null, p.writtenText + ' ■'), h('span', null, p.tapsText + ' ●')));
  }


  // ═══════════════════════════════════════════
  // Rhythm Clap-Back — pattern bank and scoring
  // ═══════════════════════════════════════════

  // Patterns are onset positions in beats within a bar. Fractions are eighth notes
  // (0.5) and sixteenths (0.25), so every pattern below is playable by the same
  // scheduler and readable as standard notation.
  var RHYTHM_PATTERNS = [
    { id: 'quarters',   beats: 4, onsets: [0, 1, 2, 3],                 level: 1, name: 'Steady quarters' },
    { id: 'half_notes', beats: 4, onsets: [0, 2],                       level: 1, name: 'Half notes' },
    { id: 'on_beats13', beats: 4, onsets: [0, 2, 3],                    level: 1, name: 'Long, then two' },
    { id: 'eighths',    beats: 4, onsets: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], level: 2, name: 'Running eighths' },
    { id: 'dotted',     beats: 4, onsets: [0, 1.5, 2, 3],               level: 2, name: 'Dotted feel' },
    { id: 'gallop',     beats: 4, onsets: [0, 0.75, 1, 2, 2.75, 3],     level: 3, name: 'Gallop' },
    { id: 'syncopated', beats: 4, onsets: [0, 1.5, 2.5, 3],             level: 3, name: 'Syncopation' },
    { id: 'clave',      beats: 4, onsets: [0, 0.75, 1.5, 2.5, 3],       level: 4, name: 'Son clave (3-2)' },
    { id: 'waltz',      beats: 3, onsets: [0, 1, 2],                    level: 1, name: 'Waltz pulse' },
    { id: 'waltz_sync', beats: 3, onsets: [0, 1.5, 2],                  level: 3, name: 'Waltz with a lift' }
  ];

  // Grading bands as a fraction of one beat, so they scale with tempo: a 40 ms error
  // is a different musical size at 60 BPM than at 200 BPM. These numbers are tunable
  // — see the open questions in MUSIC_TOOLS_REVIEW.md — and are deliberately in one
  // place rather than scattered through the scorer.
  var RHYTHM_TIGHT_FRACTION = 0.06;   // within 6% of a beat: on the money
  var RHYTHM_CLOSE_FRACTION = 0.14;   // within 14%: recognisably the right rhythm
  var RHYTHM_MATCH_FRACTION = 0.5;    // beyond half a beat a tap belongs to another onset

  /** Absolute onset times in ms for a pattern at a given tempo. */
  function rhythmOnsetTimes(pattern, beatMs) {
    if (!pattern || !pattern.onsets) return [];
    return pattern.onsets.map(function (beat) { return beat * beatMs; });
  }

  /**
   * Score a set of taps against the expected onsets.
   *
   * Matching is greedy over the closest pairs first, not left-to-right. That matters:
   * with left-to-right matching a single early tap claims the first onset and pushes
   * every later tap onto the wrong onset, turning one small error into a whole failed
   * pattern. Sorting candidate pairs by absolute error and assigning the best ones
   * first keeps an isolated mistake isolated.
   *
   * Returns per-onset results (with signed deviation in ms, negative = early), counts
   * of missed onsets and extra taps, and summary accuracy in [0, 1].
   */
  function scoreRhythm(expectedMs, tapsMs, beatMs) {
    var expected = (expectedMs || []).slice();
    var taps = (tapsMs || []).slice().sort(function (a, b) { return a - b; });
    var beat = (typeof beatMs === 'number' && isFinite(beatMs) && beatMs > 0) ? beatMs : 500;
    var matchWindow = beat * RHYTHM_MATCH_FRACTION;
    var tightMs = beat * RHYTHM_TIGHT_FRACTION;
    var closeMs = beat * RHYTHM_CLOSE_FRACTION;

    var pairs = [];
    for (var e = 0; e < expected.length; e++) {
      for (var t = 0; t < taps.length; t++) {
        var delta = taps[t] - expected[e];
        if (Math.abs(delta) <= matchWindow) pairs.push({ e: e, t: t, delta: delta, abs: Math.abs(delta) });
      }
    }
    pairs.sort(function (a, b) { return a.abs - b.abs; });

    var usedExpected = {}, usedTaps = {};
    var byOnset = expected.map(function (ms) { return { expectedMs: ms, tapMs: null, deltaMs: null, grade: 'missed' }; });
    for (var p = 0; p < pairs.length; p++) {
      var pr = pairs[p];
      if (usedExpected[pr.e] || usedTaps[pr.t]) continue;
      usedExpected[pr.e] = true;
      usedTaps[pr.t] = true;
      byOnset[pr.e] = {
        expectedMs: expected[pr.e],
        tapMs: taps[pr.t],
        deltaMs: pr.delta,
        grade: pr.abs <= tightMs ? 'tight' : (pr.abs <= closeMs ? 'close' : 'loose')
      };
    }

    var extras = [];
    for (var t2 = 0; t2 < taps.length; t2++) { if (!usedTaps[t2]) extras.push(taps[t2]); }

    var hits = byOnset.filter(function (o) { return o.tapMs !== null; });
    var absErrors = hits.map(function (o) { return Math.abs(o.deltaMs); });
    var sumAbs = absErrors.reduce(function (a, b) { return a + b; }, 0);
    var meanAbsMs = absErrors.length ? sumAbs / absErrors.length : 0;
    var maxAbsMs = absErrors.length ? Math.max.apply(null, absErrors) : 0;
    var signedSum = hits.reduce(function (a, o) { return a + o.deltaMs; }, 0);

    // Accuracy credits each onset by how tightly it was hit, then penalises extra
    // taps at the same weight as a miss so machine-gunning cannot score well.
    var credit = 0;
    for (var i = 0; i < byOnset.length; i++) {
      var g = byOnset[i].grade;
      credit += g === 'tight' ? 1 : g === 'close' ? 0.75 : g === 'loose' ? 0.35 : 0;
    }
    var denominator = Math.max(1, expected.length + extras.length);
    var accuracy = Math.max(0, Math.min(1, credit / denominator));

    return {
      onsets: byOnset,
      extras: extras,
      hit: hits.length,
      missed: byOnset.length - hits.length,
      extra: extras.length,
      meanAbsMs: meanAbsMs,
      maxAbsMs: maxAbsMs,
      // Positive means consistently behind the beat, negative consistently ahead.
      biasMs: hits.length ? signedSum / hits.length : 0,
      accuracy: accuracy,
      tightMs: tightMs,
      closeMs: closeMs
    };
  }

  // ── Stable view identities (module scope) ──
  // Components defined inside render() get a new function identity every host
  // re-render, so React unmounts/remounts them on ANY toolData write, tearing
  // DOM and dropping keyboard focus (see dev-tools/scan_render_scoped_components.cjs).
  // stableType() hands React a stable wrapper type and swaps the fresh closure
  // in each render. Gate: tests/stem_component_identity_gates.test.js.
  var _stableViewTypes = {};
  function stableType(name, impl) {
    var slot = _stableViewTypes[name];
    if (!slot) {
      slot = _stableViewTypes[name] = { impl: null, Type: null };
      slot.Type = function StableView(props) { return slot.impl(props); };
    }
    slot.impl = impl;
    return slot.Type;
  }
  // A saved project is INPUT. `activeKeys` is .indexOf/.concat/.filter-ed at
  // five sites, and `|| []` only replaces a FALSY value — a stored number or
  // string sailed through and threw. The shell's error boundary is unkeyed,
  // so that blanks the whole lab, not just this tool.
  function _msKeys(d) {
    return (d && Array.isArray(d.activeKeys)) ? d.activeKeys : [];
  }
  window.StemLab.registerTool('musicSynth', {
    icon: '🎹',
    label: 'Music Synthesizer',
    desc: 'Play a piano, build beats, and learn the science of sound with real-time waveform visualization.',
    color: 'purple',
    category: 'creative',
    questHooks: [
      { id: 'play_notes', label: 'Play 5 musical notes', icon: '🎵', check: function(d) { return (d.notesPlayed || 0) >= 5; }, progress: function(d) { return (d.notesPlayed || 0) + '/5'; } },
      { id: 'adjust_filter', label: 'Experiment with audio filters', icon: '🏛️', check: function(d) { return d.filterType && d.filterType !== 'lowpass'; }, progress: function(d) { return d.filterType !== 'lowpass' ? 'Adjusted!' : 'Change filter'; } },
      { id: 'ear_training', label: 'Name 5 intervals by ear', icon: '👂', check: function(d) { return (d.earCorrect || 0) >= 5; }, progress: function(d) { return (d.earCorrect || 0) + '/5'; } },
      { id: 'build_beat', label: 'Build a beat in the sequencer', icon: '🥁', check: function(d) { return !!d.beatBuilt; }, progress: function(d) { return d.beatBuilt ? 'Done!' : 'Not yet'; } },
      { id: 'try_scales', label: 'Play 3 different scales', icon: '🎵', check: function(d) { return (d.scalesTried || []).length >= 3; }, progress: function(d) { return (d.scalesTried || []).length + '/3'; } },
      { id: 'try_preset', label: 'Try a synth engine preset', icon: '⚡', check: function(d) { return !!d.activePreset; }, progress: function(d) { return d.activePreset ? d.activePreset : 'Pick one'; } },
      { id: 'clap_back', label: 'Clap back 3 rhythms accurately', icon: '👏', check: function(d) { return (d.rhythmPassed || 0) >= 3; }, progress: function(d) { return (d.rhythmPassed || 0) + '/3'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var t = ctx.t || function(k) { return k; };
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // Message templates with named placeholders. ctx.t takes no interpolation
      // arguments, so anything carrying a value has to be substituted here rather
      // than glued together with + — fragments cannot be reordered by a translator.
      var __alloFmt = function (k, fb, vars) {
        var out = __alloT(k, fb);
        if (!vars) return out;
        return __alloOneWord(String(out).replace(/\{(\w+)\}/g, function (whole, name) {
          return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole;
        }));
      };
      // Enter/Space route for a non-button control; ignores keys from controls nested inside it.
      var musKeyAct = function (fn) { return function (e) { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } }; };
      var setStemLabTool = function(v) { if (ctx.setStemLabTool) ctx.setStemLabTool(v); };
      var setToolSnapshots = ctx.setToolSnapshots || function() {};
      // Student AI-off: null unless text AI is usable, so the AI theory tutor hides.
      var _aiUsable = function (kind, fn) {
        try { if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable(kind, fn); } catch (_) {}
        return typeof fn === 'function' && !fn._alloQrBlocked && !(typeof window !== 'undefined' && window.__alloStudentAiDisabled === true);
      };
      var callGemini = (ctx.aiAvailable !== false && typeof ctx.callGemini === 'function' && !ctx.callGemini._alloQrBlocked && (!!ctx.isTeacherMode || _aiUsable('text', ctx.callGemini))) ? ctx.callGemini : null;
      var gradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var isDark = !!(ctx.isDark || ctx.isContrast);
          var _rawMusicD = ctx.toolData && ctx.toolData["musicSynth"];
          var d = (_rawMusicD && typeof _rawMusicD === 'object' && !Array.isArray(_rawMusicD)) ? _rawMusicD : {};
          // A saved patch is INPUT: it can be copied between devices,
          // hand-edited, or carried across tool versions. Every synth parameter
          // is read as `d[p.k]` from a slider table and formatted with
          // .toFixed(), so a string or object threw and blanked the tool.
          // Sanitise once here, using the ranges the slider tables themselves
          // declare — per-site guards would miss the next slider added.
          var _MS_RANGES = {
            attack: [0.001, 2, 0.01], decay: [0.01, 1, 0.1],
            sustain: [0, 1, 0.7], release: [0.01, 3, 0.3],
            filterCutoff: [0, 1000, 8000], filterQ: [0.1, 20, 1],
            tremoloRate: [0.5, 20, 0], tremoloDepth: [0, 1, 0],
            vibratoRate: [0.5, 12, 0], vibratoDepth: [0, 1, 0],
            ksBrightness: [0.1, 1, 0.8], ksDamping: [0.99, 0.9999, 0.996],
            volume: [0, 1, 0.5], reverbMix: [0, 1, 0]
          };
          d = Object.keys(_MS_RANGES).reduce(function (acc, k) {
            var r = _MS_RANGES[k];
            if (acc[k] === undefined) return acc;
            acc[k] = (typeof acc[k] === 'number' && isFinite(acc[k]))
              ? Math.min(r[1], Math.max(r[0], acc[k]))
              : r[2];
            return acc;
          }, Object.assign({}, d));
          var upd = function(key, val) { ctx.update("musicSynth", key, val); };

          // --- Tooltip helper ---
          var Tip = function (props) {
            var showId = 'tip_' + props.id;
            var isOpen = d[showId];
            return React.createElement("span", { className: "relative inline-block ml-1" },
              React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_toggle_tooltip', 'Toggle tooltip: {name}', { name: props.title }),
                onClick: function () { upd(showId, !isOpen); },
                "aria-expanded": isOpen,
                className: "w-5 h-5 rounded-full text-[0.6875rem] font-bold leading-none inline-flex items-center justify-center focus:ring-2 focus:ring-offset-1 focus:ring-violet-500 focus:outline-none transition-colors " + (isOpen ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-700 hover:bg-violet-200"),
                title: props.text
              }, "\u24D8"),
              isOpen && React.createElement("div", { className: "absolute z-50 left-6 top-0 w-64 p-2.5 bg-white border border-violet-200 rounded-lg shadow-xl text-[0.6875rem] text-slate-600 leading-relaxed", style: { maxHeight: "200px", overflowY: "auto" } },
                React.createElement("div", { className: "font-bold text-violet-700 mb-0.5" }, "\uD83D\uDD2C " + props.title),
                props.text
              )
            );
          };

          /**
           * Language directive for AI prompts. The host keeps window.__alloTextLanguage
           * in step with the UI language, but callGemini does not consult it, so an
           * explanation came back in English for a student reading Spanish.
           */
          function aiLanguageSuffix() {
            var lang = (typeof window !== 'undefined' && window.__alloTextLanguage) || 'English';
            return (lang && lang !== 'English') ? ' Write the entire response in ' + lang + '.' : '';
          }

          // --- Filter response (RBJ cookbook, same formulas as BiquadFilterNode) ---
          // Returns |H(f)| in dB for the filter the synth is currently running,
          // so the Filter Lab curve matches what is actually audible instead of
          // the linear fake it used to draw.
          var FILTER_PLOT_MIN_HZ = 20;
          var FILTER_PLOT_MAX_HZ = 20000;
          function biquadMagnitudeDb(type, freqHz, cutoffHz, q, sampleRate) {
            var sr = sampleRate || 48000;
            var nyquist = sr / 2;
            if (freqHz >= nyquist) return -96;
            var w0 = 2 * Math.PI * Math.min(cutoffHz, nyquist * 0.999) / sr;
            var cosW0 = Math.cos(w0), sinW0 = Math.sin(w0);
            var alpha = sinW0 / (2 * Math.max(0.0001, q));
            var b0, b1, b2, a0, a1, a2;
            if (type === 'highpass') {
              b0 = (1 + cosW0) / 2; b1 = -(1 + cosW0); b2 = (1 + cosW0) / 2;
            } else if (type === 'bandpass') {
              b0 = alpha; b1 = 0; b2 = -alpha;
            } else { // lowpass
              b0 = (1 - cosW0) / 2; b1 = 1 - cosW0; b2 = (1 - cosW0) / 2;
            }
            a0 = 1 + alpha; a1 = -2 * cosW0; a2 = 1 - alpha;

            var w = 2 * Math.PI * freqHz / sr;
            var cosW = Math.cos(w), sinW = Math.sin(w);
            var cos2W = Math.cos(2 * w), sin2W = Math.sin(2 * w);
            var numRe = b0 + b1 * cosW + b2 * cos2W;
            var numIm = -(b1 * sinW + b2 * sin2W);
            var denRe = a0 + a1 * cosW + a2 * cos2W;
            var denIm = -(a1 * sinW + a2 * sin2W);
            var numMag = Math.sqrt(numRe * numRe + numIm * numIm);
            var denMag = Math.sqrt(denRe * denRe + denIm * denIm);
            if (denMag === 0) return -96;
            var mag = numMag / denMag;
            return mag <= 0 ? -96 : Math.max(-96, 20 * Math.log10(mag));
          }
          // Frequency is heard logarithmically, so the axis and the slider are
          // both log-mapped: 100Hz-200Hz must occupy the same width as 5k-10k.
          function filterPlotFreqAt(fraction) {
            return FILTER_PLOT_MIN_HZ * Math.pow(FILTER_PLOT_MAX_HZ / FILTER_PLOT_MIN_HZ, fraction);
          }
          function filterPlotFractionOf(freqHz) {
            var clamped = Math.min(FILTER_PLOT_MAX_HZ, Math.max(FILTER_PLOT_MIN_HZ, freqHz || FILTER_PLOT_MIN_HZ));
            return Math.log(clamped / FILTER_PLOT_MIN_HZ) / Math.log(FILTER_PLOT_MAX_HZ / FILTER_PLOT_MIN_HZ);
          }

          // --- Audio Context singleton ---
          if (!window._alloSynthCtx) {
            window._alloSynthCtx = null; window._alloSynthGain = null; window._alloSynthAnalyser = null;
            window._alloSynthActiveNotes = {}; window._alloSynthSeqInterval = null; window._alloSynthEffects = null;
            window._alloMetronomeInterval = null; window._alloArpInterval = null;
            window._alloParticles = [];
          }
          function makeDistCurve(amount) {
            var k = Math.max(1, amount); var samples = 44100; var curve = new Float32Array(samples);
            for (var i = 0; i < samples; i++) { var x = (i * 2) / samples - 1; curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)); }
            return curve;
          }
          function getAudioContextCtor() {
            return (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
          }
          function hasUsableAudioContext() {
            return typeof getAudioContextCtor() === 'function';
          }
          function getCtx() {
            var AudioContextCtor = getAudioContextCtor();
            if (!AudioContextCtor) throw new Error('Web Audio API is not available in this environment.');
            if (!window._alloSynthCtx || window._alloSynthCtx.state === 'closed') {
              var ac = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)());
              var gain = ac.createGain(); gain.gain.value = d.volume || 0.5;
              var analyser = ac.createAnalyser(); analyser.fftSize = 2048;
              // Resonant filter
              var filter = ac.createBiquadFilter();
              filter.type = d.filterType || 'lowpass';
              filter.frequency.value = d.filterCutoff || 20000;
              filter.Q.value = d.filterQ || 1;
              // Delay
              var delay = ac.createDelay(2); delay.delayTime.value = (d.delayTime || 300) / 1000;
              var delayFeedback = ac.createGain(); delayFeedback.gain.value = d.delayFeedback || 0.3;
              var delayWet = ac.createGain(); delayWet.gain.value = d.delayMix || 0;
              var delayDry = ac.createGain(); delayDry.gain.value = 1;
              delay.connect(delayFeedback); delayFeedback.connect(delay); delay.connect(delayWet);
              // Distortion
              var distortion = ac.createWaveShaper();
              distortion.curve = makeDistCurve(d.distAmount || 0); distortion.oversample = '4x';
              // Reverb
              var convolver = ac.createConvolver();
              var reverbWet = ac.createGain(); reverbWet.gain.value = d.reverbMix || 0;
              var reverbDry = ac.createGain(); reverbDry.gain.value = 1;
              var reverbLen = (d.reverbSize || 1.5) * ac.sampleRate;
              var impulse = ac.createBuffer(2, reverbLen, ac.sampleRate);
              for (var ch = 0; ch < 2; ch++) { var imp = impulse.getChannelData(ch); for (var si = 0; si < reverbLen; si++) { imp[si] = (Math.random() * 2 - 1) * Math.pow(1 - si / reverbLen, 2); } }
              convolver.buffer = impulse;
              // Chorus
              var chorusDelay = ac.createDelay(0.1); chorusDelay.delayTime.value = 0.02;
              var chorusLFO = ac.createOscillator(); var chorusDepth = ac.createGain();
              chorusLFO.frequency.value = d.chorusRate || 1.5; chorusDepth.gain.value = (d.chorusMix || 0) > 0 ? 0.003 : 0;
              chorusLFO.connect(chorusDepth); chorusDepth.connect(chorusDelay.delayTime); chorusLFO.start();
              var chorusWet = ac.createGain(); chorusWet.gain.value = d.chorusMix || 0;
              // Tremolo (amplitude LFO)
              var tremoloLFO = ac.createOscillator(); tremoloLFO.type = 'sine';
              tremoloLFO.frequency.value = d.tremoloRate || 5;
              var tremoloGain = ac.createGain(); tremoloGain.gain.value = d.tremoloDepth || 0;
              var tremoloNode = ac.createGain(); tremoloNode.gain.value = 1;
              tremoloLFO.connect(tremoloGain); tremoloGain.connect(tremoloNode.gain); tremoloLFO.start();
              // Chain: source -> filter -> distortion -> delay/reverb/chorus -> tremolo -> gain -> analyser -> dest
              filter.connect(distortion);
              distortion.connect(delayDry); distortion.connect(delay); distortion.connect(reverbDry);
              distortion.connect(convolver); distortion.connect(chorusDelay);
              delayDry.connect(tremoloNode); delayWet.connect(tremoloNode); reverbDry.connect(tremoloNode);
              convolver.connect(reverbWet); reverbWet.connect(tremoloNode);
              chorusDelay.connect(chorusWet); chorusWet.connect(tremoloNode);
              tremoloNode.connect(gain); gain.connect(analyser); analyser.connect(ac.destination);
              window._alloSynthCtx = ac; window._alloSynthGain = gain; window._alloSynthAnalyser = analyser;
              window._alloSynthEffects = { filter: filter, distortion: distortion, delay: delay, delayFeedback: delayFeedback, delayWet: delayWet, delayDry: delayDry, convolver: convolver, reverbWet: reverbWet, reverbDry: reverbDry, chorusDelay: chorusDelay, chorusLFO: chorusLFO, chorusDepth: chorusDepth, chorusWet: chorusWet, tremoloLFO: tremoloLFO, tremoloGain: tremoloGain, tremoloNode: tremoloNode };
            }
            if (window._alloSynthCtx.state === 'suspended') window._alloSynthCtx.resume();
            window._alloSynthGain.gain.value = d.volume || 0.5;
            var fx = window._alloSynthEffects;
            if (fx) {
              fx.filter.type = d.filterType || 'lowpass'; fx.filter.frequency.value = d.filterCutoff || 20000; fx.filter.Q.value = d.filterQ || 1;
              fx.delay.delayTime.value = (d.delayTime || 300) / 1000; fx.delayFeedback.gain.value = d.delayFeedback || 0.3;
              fx.delayWet.gain.value = d.delayMix || 0; fx.distortion.curve = makeDistCurve(d.distAmount || 0);
              fx.reverbWet.gain.value = d.reverbMix || 0; fx.chorusLFO.frequency.value = d.chorusRate || 1.5;
              fx.chorusDepth.gain.value = (d.chorusMix || 0) > 0 ? 0.003 : 0; fx.chorusWet.gain.value = d.chorusMix || 0;
              fx.tremoloLFO.frequency.value = d.tremoloRate || 5; fx.tremoloGain.gain.value = d.tremoloDepth || 0;
            }
            var audioState = { ctx: window._alloSynthCtx, gain: window._alloSynthGain, analyser: window._alloSynthAnalyser, effects: window._alloSynthEffects };
            ensureSynthEffects(audioState);
            return audioState;
          }

          // ═══ NOTE & FREQUENCY ═══
          var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          var NOTE_NAMES_FLAT = ['C', 'D\u266D', 'D', 'E\u266D', 'E', 'F', 'G\u266D', 'G', 'A\u266D', 'A', 'B\u266D', 'B'];
          // Chromatic color mapping (each semitone gets a hue)
          var NOTE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];
          function noteFreq(note, octave) {
            var semitone = NOTE_NAMES.indexOf(note);
            if (semitone === -1) semitone = NOTE_NAMES_FLAT.indexOf(note);
            var n = (octave - 4) * 12 + (semitone - 9);
            return 440 * Math.pow(2, n / 12);
          }
          function noteColor(note) { return NOTE_COLORS[NOTE_NAMES.indexOf(note)] || '#6366f1'; }
          var oct = d.octave || 4;
          var KEYS = [];
          var whiteKeyIdx = 0;
          for (var o = oct; o <= oct + 1; o++) {
            for (var ni = 0; ni < 12; ni++) {
              var isBlack = [1, 3, 6, 8, 10].indexOf(ni) !== -1;
              KEYS.push({ note: NOTE_NAMES[ni], octave: o, freq: noteFreq(NOTE_NAMES[ni], o), isBlack: isBlack, semitone: (o - oct) * 12 + ni, position: isBlack ? whiteKeyIdx - 1 : whiteKeyIdx });
              if (!isBlack) whiteKeyIdx++;
            }
          }

          // ═══ PARTICLE SYSTEM (Zero-GC pooled ring + concentric note-trigger ripples) ═══
          function spawnParticles(noteId, color, x, y) {
            if (!window._alloParticles) window._alloParticles = [];
            if (!window._alloParticlePool) {
              var pool = new Array(96);
              for (var pi0 = 0; pi0 < 96; pi0++) {
                pool[pi0] = { x: 0, y: 0, vx: 0, vy: 0, size: 2, life: 0, decay: 0.02, color: '#a855f7', noteId: '' };
              }
              window._alloParticlePool = pool;
              window._alloParticleCursor = 0;
            }
            var noteIdx = NOTE_NAMES.indexOf(String(noteId || '').replace(/[0-9]/g, ''));
            var normX = typeof x === 'number' ? Math.max(0.08, Math.min(0.92, x / 400)) : (noteIdx >= 0 ? 0.1 + (noteIdx / 11) * 0.8 : 0.5);
            window._alloNoteTriggerSeq = (window._alloNoteTriggerSeq || 0) + 1;
            window._alloNoteTriggerColor = color || '#a855f7';
            window._alloNoteTriggerNormX = normX;
            var pxBase = typeof x === 'number' ? x : normX * 400;
            var pyBase = typeof y === 'number' ? y : 100;
            for (var p = 0; p < 8; p++) {
              var slot = window._alloParticlePool[window._alloParticleCursor];
              window._alloParticleCursor = (window._alloParticleCursor + 1) % 96;
              slot.x = pxBase; slot.y = pyBase;
              slot.vx = (Math.random() - 0.5) * 4;
              slot.vy = -Math.random() * 3 - 1;
              slot.size = Math.random() * 4 + 2;
              slot.life = 1.0;
              slot.decay = 0.015 + Math.random() * 0.01;
              slot.color = color || '#a855f7';
              slot.noteId = noteId;
              if (window._alloParticles.indexOf(slot) === -1) window._alloParticles.push(slot);
            }
          }

          // ═══ ENHANCED SYNTH ENGINES ═══

          // FM Synthesis — two oscillators where one modulates the other's frequency
          function playFM(freq, noteId, modRatio, modDepth) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            var carrier = cx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = freq;
            var modulator = cx.createOscillator(); modulator.type = 'sine';
            modulator.frequency.value = freq * (modRatio || 2);
            var modGain = cx.createGain();
            modGain.gain.value = freq * (modDepth || 1.5);
            modulator.connect(modGain); modGain.connect(carrier.frequency);
            var env = cx.createGain();
            var atk = d.attack || 0.02; var dec = d.decay || 0.2; var sus = d.sustain || 0.5; var rel = d.release || 0.4;
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + atk);
            env.gain.linearRampToValueAtTime(sus, now + atk + dec);
            // FM mod envelope — depth decreases over time for evolving timbre
            var modEnv = cx.createGain(); modEnv.gain.setValueAtTime(1, now);
            modEnv.gain.exponentialRampToValueAtTime(0.3, now + 1);
            modGain.connect(modEnv); modEnv.connect(carrier.frequency);
            carrier.connect(env); env.connect(audio.effects.filter);
            carrier.start(now); modulator.start(now);
            window._alloSynthActiveNotes[noteId] = { osc: carrier, env: env, extras: [modulator] };
            var ni = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, '')); if (ni >= 0) spawnParticles(noteId, NOTE_COLORS[ni]);
          }

          // SuperSaw — multiple detuned sawtooth oscillators stacked for huge EDM leads/pads
          function playSuperSaw(freq, noteId, voiceCount, detune, spread) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            var voices = voiceCount || d.superVoices || 5;
            var det = detune || d.superDetune || 15; // cents
            var merger = cx.createGain(); merger.gain.value = 1 / voices;
            var env = cx.createGain();
            var atk = d.attack || 0.01; var sus = d.sustain || 0.8;
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + atk);
            env.gain.linearRampToValueAtTime(sus, now + atk + (d.decay || 0.1));
            var oscs = [];
            var _ssDenom = Math.max(1, voices - 1); // voices===1 (possible from persisted state) would divide by zero
            for (var v = 0; v < voices; v++) {
              var osc = cx.createOscillator(); osc.type = 'sawtooth';
              var detuneAmount = (v - (voices - 1) / 2) * (det * 2 / _ssDenom);
              osc.frequency.value = freq; osc.detune.value = detuneAmount;
              // Slight stereo spread via pan (if available)
              var pan; try { pan = cx.createStereoPanner(); pan.pan.value = (v / _ssDenom) * 2 - 1; } catch(e) { pan = cx.createGain(); pan.gain.value = 1; }
              osc.connect(pan); pan.connect(merger);
              osc.start(now); oscs.push(osc);
            }
            merger.connect(env); env.connect(audio.effects.filter);
            window._alloSynthActiveNotes[noteId] = { osc: oscs[0], env: env, extras: oscs.slice(1) };
            var ni = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, '')); if (ni >= 0) spawnParticles(noteId, NOTE_COLORS[ni]);
          }

          // Sub Bass — deep sine sub with optional square overtone
          function playSubBass(freq, noteId) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            // Sub oscillator (sine, 1 octave down)
            var sub = cx.createOscillator(); sub.type = 'sine'; sub.frequency.value = freq / 2;
            var subGain = cx.createGain(); subGain.gain.value = 0.7;
            // Body oscillator (square at fundamental)
            var body = cx.createOscillator(); body.type = 'square'; body.frequency.value = freq;
            var bodyGain = cx.createGain(); bodyGain.gain.value = 0.3;
            // Pitch envelope (slight downward sweep for punch)
            sub.frequency.setValueAtTime(freq / 2 * 1.5, now);
            sub.frequency.exponentialRampToValueAtTime(freq / 2, now + 0.05);
            body.frequency.setValueAtTime(freq * 1.3, now);
            body.frequency.exponentialRampToValueAtTime(freq, now + 0.04);
            var env = cx.createGain();
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + 0.005);
            env.gain.linearRampToValueAtTime(d.sustain || 0.9, now + 0.01 + (d.decay || 0.05));
            sub.connect(subGain); body.connect(bodyGain);
            subGain.connect(env); bodyGain.connect(env);
            env.connect(audio.effects.filter);
            sub.start(now); body.start(now);
            window._alloSynthActiveNotes[noteId] = { osc: sub, env: env, extras: [body] };
            var ni = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, '')); if (ni >= 0) spawnParticles(noteId, NOTE_COLORS[ni]);
          }

          // Pad Synth — warm layered sine+triangle with slow attack, chorus-like detuning
          function playPad(freq, noteId) {
            var audio = getCtx(); var cx = audio.ctx; var now = cx.currentTime;
            if (window._alloSynthActiveNotes[noteId]) return;
            var oscs = [];
            var merger = cx.createGain(); merger.gain.value = 0.25;
            // 4 layers: fundamental + octave + fifth + slight detune
            var ratios = [1, 2, 1.5, 1.003];
            var types = ['sine', 'triangle', 'sine', 'triangle'];
            var vols = [0.5, 0.2, 0.15, 0.15];
            ratios.forEach(function(ratio, i) {
              var osc = cx.createOscillator(); osc.type = types[i]; osc.frequency.value = freq * ratio;
              var g = cx.createGain(); g.gain.value = vols[i];
              osc.connect(g); g.connect(merger); osc.start(now); oscs.push(osc);
            });
            var env = cx.createGain();
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(0.8, now + (d.attack || 0.5));
            env.gain.linearRampToValueAtTime(d.sustain || 0.6, now + (d.attack || 0.5) + (d.decay || 0.3));
            merger.connect(env); env.connect(audio.effects.filter);
            window._alloSynthActiveNotes[noteId] = { osc: oscs[0], env: env, extras: oscs.slice(1) };
          }

          // ═══ EDM PRESET ENGINE ═══
          var EDM_PRESETS = [
            { id: 'edm_lead', name: __alloT('stem.music.edm_lead', 'EDM Lead'), icon: '\u26A1', engine: 'supersaw', params: { superVoices: 7, superDetune: 20, attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.2, filterCutoff: 8000, filterQ: 2 }, desc: __alloT('stem.music.big_festival_supersaw_lead', 'Big festival supersaw lead') },
            { id: 'fm_bell', name: __alloT('stem.music.fm_bell', 'FM Bell'), icon: '\uD83D\uDD14', engine: 'fm', params: { fmRatio: 3, fmDepth: 2, attack: 0.005, decay: 0.8, sustain: 0.1, release: 1, filterCutoff: 12000 }, desc: __alloT('stem.music.metallic_fm_bell_tone', 'Metallic FM bell tone') },
            { id: 'fm_bass', name: __alloT('stem.music.fm_bass', 'FM Bass'), icon: '\uD83D\uDD0A', engine: 'fm', params: { fmRatio: 1, fmDepth: 3, attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.2, filterCutoff: 2000 }, desc: __alloT('stem.music.punchy_fm_bass', 'Punchy FM bass') },
            { id: 'sub_bass', name: __alloT('stem.music.sub_bass', 'Sub Bass'), icon: '\uD83C\uDF0A', engine: 'sub', params: { attack: 0.005, decay: 0.05, sustain: 0.9, release: 0.1, filterCutoff: 800, filterQ: 4 }, desc: __alloT('stem.music.deep_808_style_sub_bass', 'Deep 808-style sub bass') },
            { id: 'warm_pad', name: __alloT('stem.music.warm_pad', 'Warm Pad'), icon: '\u2601\uFE0F', engine: 'pad', params: { attack: 0.8, decay: 0.5, sustain: 0.6, release: 1.5, filterCutoff: 3000, reverbMix: 0.4, chorusMix: 0.3 }, desc: __alloT('stem.music.lush_ambient_pad', 'Lush ambient pad') },
            { id: 'pluck', name: __alloT('stem.music.pluck', 'Pluck'), icon: '\uD83C\uDFB8', engine: 'plucked', params: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.5, filterCutoff: 6000 }, desc: __alloT('stem.music.karplus_strong_plucked_string', 'Karplus-Strong plucked string') },
            { id: 'acid', name: __alloT('stem.music.acid', 'Acid'), icon: '\uD83E\uDDEA', engine: 'standard', params: { waveType: 'sawtooth', attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.1, filterCutoff: 2000, filterQ: 12, filterType: 'lowpass', distAmount: 20 }, desc: __alloT('stem.music.tb_303_acid_squelch', 'TB-303 acid squelch') },
            { id: 'trance_lead', name: __alloT('stem.music.trance', 'Trance'), icon: '\uD83C\uDF1F', engine: 'supersaw', params: { superVoices: 5, superDetune: 12, attack: 0.02, decay: 0.3, sustain: 0.8, release: 0.4, filterCutoff: 6000, delayMix: 0.3, delayTime: 375, delayFeedback: 0.4 }, desc: __alloT('stem.music.classic_trance_supersaw', 'Classic trance supersaw') },
            { id: 'dubstep', name: __alloT('stem.music.dubstep', 'Dubstep'), icon: '\uD83D\uDD25', engine: 'fm', params: { fmRatio: 0.5, fmDepth: 5, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.1, filterCutoff: 1500, filterQ: 8, distAmount: 30 }, desc: __alloT('stem.music.growling_dubstep_bass', 'Growling dubstep bass') },
            { id: 'lofi', name: 'Lo-Fi', icon: '\uD83C\uDF19', engine: 'standard', params: { waveType: 'triangle', attack: 0.05, decay: 0.4, sustain: 0.5, release: 0.8, filterCutoff: 3000, reverbMix: 0.5, chorusMix: 0.2, vibratoDepth: 0.3, vibratoRate: 4 }, desc: __alloT('stem.music.warm_lo_fi_keys', 'Warm lo-fi keys') },
          ];

          function applyPreset(preset) {
            Object.keys(preset.params).forEach(function(key) { upd(key, preset.params[key]); });
            upd('synthEngine', preset.engine); upd('activePreset', preset.name);
            // Apply filter settings to effects chain
            var fx = window._alloSynthEffects;
            if (fx && preset.params.filterCutoff) { fx.filter.frequency.value = preset.params.filterCutoff; fx.filter.Q.value = preset.params.filterQ || 1; }
            if (fx && preset.params.filterType) fx.filter.type = preset.params.filterType;
            if (fx && preset.params.reverbMix !== undefined) fx.reverbWet.gain.value = preset.params.reverbMix;
            if (fx && preset.params.chorusMix !== undefined) { fx.chorusWet.gain.value = preset.params.chorusMix; fx.chorusDepth.gain.value = preset.params.chorusMix > 0 ? 0.003 : 0; }
            if (fx && preset.params.delayMix !== undefined) fx.delayWet.gain.value = preset.params.delayMix;
            if (fx && preset.params.delayTime !== undefined) fx.delay.delayTime.value = preset.params.delayTime / 1000;
            if (fx && preset.params.delayFeedback !== undefined) fx.delayFeedback.gain.value = preset.params.delayFeedback;
            if (fx && preset.params.distAmount !== undefined) fx.distortion.curve = makeDistCurve(preset.params.distAmount);
            addToast(__alloFmt('stem.music.toast_preset', '\uD83C\uDFB5 Preset: {name}', { name: preset.name }), 'success');
          }

          // ═══ PLAY / STOP NOTE (enhanced with engine routing) ═══
          function playNote(freq, noteId, vibratoOverride) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var engine = (['standard','fm','pad','plucked','sub','supersaw'].indexOf(d.synthEngine) !== -1 ? d.synthEngine : 'standard');
            // Route to appropriate engine
            if (engine === 'fm') { playFM(freq, noteId, d.fmRatio || 2, d.fmDepth || 1.5); return; }
            if (engine === 'supersaw') { playSuperSaw(freq, noteId); return; }
            if (engine === 'sub') { playSubBass(freq, noteId); return; }
            if (engine === 'pad') { playPad(freq, noteId); return; }
            if (engine === 'plucked') { playPlucked(freq, noteId, d.ksBrightness, d.ksDamping); return; }
            // Standard oscillator engine
            var osc = audio.ctx.createOscillator(); var env = audio.ctx.createGain();
            osc.type = d.waveType || 'sine'; osc.frequency.value = freq;
            // Vibrato (pitch LFO)
            var vibDepth = vibratoOverride !== undefined ? vibratoOverride : (d.vibratoDepth || 0);
            var _vibLFO = null;
            if (vibDepth > 0) {
              _vibLFO = audio.ctx.createOscillator(); _vibLFO.type = 'sine';
              _vibLFO.frequency.value = d.vibratoRate || 5;
              var vibGain = audio.ctx.createGain(); vibGain.gain.value = vibDepth * freq * 0.02;
              _vibLFO.connect(vibGain); vibGain.connect(osc.frequency); _vibLFO.start();
            }
            var now = audio.ctx.currentTime;
            var atk = d.attack || 0.02; var dec = d.decay || 0.1; var sus = d.sustain || 0.7;
            env.gain.setValueAtTime(0, now); env.gain.linearRampToValueAtTime(1, now + atk);
            env.gain.linearRampToValueAtTime(sus, now + atk + dec);
            osc.connect(env); env.connect(audio.effects.filter); osc.start(now);
            var _extras = _vibLFO ? [_vibLFO] : [];
            window._alloSynthActiveNotes[noteId] = { osc: osc, env: env, extras: _extras };
            // Spawn particles
            var noteIdx = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, ''));
            if (noteIdx >= 0) spawnParticles(noteId, NOTE_COLORS[noteIdx]);
          }
          function stopNote(noteId) {
            var entry = window._alloSynthActiveNotes[noteId];
            if (!entry) return;
            var audio = getCtx(); var now = audio.ctx.currentTime; var rel = d.release || 0.3;
            entry.env.gain.cancelScheduledValues(now); entry.env.gain.setValueAtTime(entry.env.gain.value, now);
            entry.env.gain.linearRampToValueAtTime(0, now + rel);
            try { entry.osc.stop(now + rel + 0.05); } catch(e) {}
            // Stop extra oscillators (SuperSaw voices, FM modulator, Pad layers, Sub body)
            if (entry.extras) {
              entry.extras.forEach(function(extra) { try { extra.stop(now + rel + 0.05); } catch(e) {} });
            }
            delete window._alloSynthActiveNotes[noteId];
          }
          /**
           * Release every sounding note. Needed on unmount: the note registry lives on
           * window and outlives the component, so a note still held when the tool
           * closes would sustain forever, and its stale registry entry would make
           * playNote() early-return for that key on every later visit.
           */
          function stopAllNotes() {
            var reg = window._alloSynthActiveNotes || {};
            Object.keys(reg).forEach(function (id) {
              try { stopNote(id); } catch (e) { delete reg[id]; }
            });
          }

          // ═══ XY PAD HANDLER ═══
          var XY_SCALE_INTERVALS = {
            chromatic: [0,1,2,3,4,5,6,7,8,9,10,11],
            major: [0,2,4,5,7,9,11],
            minor: [0,2,3,5,7,8,10],
            pentatonic: [0,2,4,7,9],
            blues: [0,3,5,6,7,10]
          };
          function handleXY(e) {
            var rect = e.currentTarget.getBoundingClientRect();
            var xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            var yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            processXY(xPct, yPct);
          }
          function handleXYTouch(e) {
            var rect = e.currentTarget.getBoundingClientRect();
            var touch = e.touches[0];
            var xPct = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
            var yPct = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
            processXY(xPct, yPct);
          }
          function processXY(xPct, yPct) {
            upd('xyX', xPct); upd('xyY', yPct);
            // Trail (last 8 points)
            var trail = (Array.isArray(d.xyTrail) ? d.xyTrail : []).slice(-7).concat([{ x: xPct, y: yPct }]);
            upd('xyTrail', trail);
            // Map X to pitch (2 octaves range)
            var scaleIntervals = XY_SCALE_INTERVALS[d.xyScale || 'chromatic'] || XY_SCALE_INTERVALS.chromatic;
            var noteRange = scaleIntervals.length * 2; // 2 octaves
            var noteIndex = Math.floor(xPct / 100 * noteRange);
            var octaveOffset = Math.floor(noteIndex / scaleIntervals.length);
            var scaleIdx = noteIndex % scaleIntervals.length;
            var semitone = scaleIntervals[scaleIdx];
            var baseOct = (d.octave || 4);
            var freq = 440 * Math.pow(2, ((baseOct + octaveOffset - 4) * 12 + semitone - 9) / 12);
            var noteName = NOTE_NAMES[semitone % 12] + (baseOct + octaveOffset);
            upd('xyNoteName', NOTE_NAMES[semitone % 12]);
            // Map Y to effect parameter
            var yVal = 1 - yPct / 100; // invert so top = high
            var mode = d.xyMode || 'filter';
            var fx = window._alloSynthEffects;
            if (fx) {
              if (mode === 'filter') { fx.filter.frequency.value = 200 + yVal * 12000; }
              else if (mode === 'volume') { window._alloSynthGain.gain.value = yVal * (d.volume || 0.5); }
              else if (mode === 'vibrato') { /* handled in playNote */ }
              else if (mode === 'reverb') { fx.reverbWet.gain.value = yVal * 0.8; }
            }
            // Play/update note
            stopNote('xy_note');
            if (mode === 'vibrato') {
              playNote(freq, 'xy_note', yVal * 2);
            } else {
              playNote(freq, 'xy_note');
            }
          }

          function playNoteFor(freq, noteId, durationMs) {
            playNote(freq, noteId);
            setTimeout(function () { stopNote(noteId); }, durationMs);
          }

          // ═══ KARPLUS-STRONG PLUCKED STRING ═══
          function playPlucked(freq, noteId, brightness, damping) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var ctx = audio.ctx; var now = ctx.currentTime;
            var sampleRate = ctx.sampleRate;
            var delayTime = 1 / freq;
            var br = brightness !== undefined ? brightness : 0.8;
            var dmp = damping !== undefined ? damping : 0.996;
            // Longer noise burst (40ms) for fuller attack
            var noiseLen = Math.round(sampleRate * 0.04);
            var noiseBuf = ctx.createBuffer(1, noiseLen, sampleRate);
            var noiseData = noiseBuf.getChannelData(0);
            // Shaped noise: mix filtered noise for warmer character
            for (var i = 0; i < noiseLen; i++) {
              var t = i / noiseLen;
              noiseData[i] = (Math.random() * 2 - 1) * (1 - t * 0.5); // fade noise tail
            }
            var noiseSrc = ctx.createBufferSource(); noiseSrc.buffer = noiseBuf;
            // Delay line for KS
            var delay = ctx.createDelay(1); delay.delayTime.value = delayTime;
            var feedback = ctx.createGain(); feedback.gain.value = dmp;
            // Primary LPF — warmer ceiling: max 4.8kHz instead of 10kHz
            var lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';
            lpf.frequency.value = br * 4000 + 800;
            lpf.Q.value = 0.5; // gentle resonance
            // Secondary warmth filter in feedback — removes harsh highs each cycle
            var warmth = ctx.createBiquadFilter(); warmth.type = 'lowpass';
            warmth.frequency.value = Math.min(freq * 4, 6000);
            warmth.Q.value = 0.3;
            // Output envelope — gentler 4s decay
            var env = ctx.createGain(); env.gain.setValueAtTime(0.6, now);
            env.gain.exponentialRampToValueAtTime(0.001, now + 4);
            // Body tone — sine at fundamental for pitch clarity (10% volume)
            var body = ctx.createOscillator(); body.type = 'sine'; body.frequency.value = freq;
            var bodyGain = ctx.createGain(); bodyGain.gain.setValueAtTime(0.10, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
            body.connect(bodyGain); bodyGain.connect(env);
            body.start(now); body.stop(now + 2.5);
            // Second harmonic for warmth/richness (4% volume)
            var harm2 = ctx.createOscillator(); harm2.type = 'sine'; harm2.frequency.value = freq * 2;
            var harm2Gain = ctx.createGain(); harm2Gain.gain.setValueAtTime(0.04, now);
            harm2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            harm2.connect(harm2Gain); harm2Gain.connect(env);
            harm2.start(now); harm2.stop(now + 1.5);
            // Signal path: Noise -> delay -> LPF -> warmth -> feedback -> delay
            noiseSrc.connect(delay); delay.connect(lpf); lpf.connect(warmth);
            warmth.connect(feedback); feedback.connect(delay);
            warmth.connect(env); env.connect(audio.effects.filter);
            noiseSrc.start(now); noiseSrc.stop(now + 0.04);
            window._alloSynthActiveNotes[noteId] = { osc: noiseSrc, env: env };
            var nIdx = NOTE_NAMES.indexOf(noteId.replace(/[0-9]/g, ''));
            if (nIdx >= 0) spawnParticles(noteId, NOTE_COLORS[nIdx]);
            setTimeout(function () { delete window._alloSynthActiveNotes[noteId]; }, 4500);
          }
          function playPluckedFor(freq, noteId, durationMs, brightness, damping) {
            playPlucked(freq, noteId, brightness, damping);
          }

          // ═══ STRUM FUNCTION ═══
          function strumChord(rootNote, chordType, inv, speed, direction) {
            var chordData = CHORDS[chordType];
            if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(rootNote);
            var intervals = chordData.intervals.slice();
            for (var ii = 0; ii < (inv || 0); ii++) {
              if (intervals.length > 1) intervals.push(intervals.shift() + 12);
            }
            // Add octave doubling for richer strum
            var fullIntervals = intervals.slice();
            if (d.strumOctaveDouble) {
              intervals.forEach(function (intv) { fullIntervals.push(intv + 12); });
            }
            if (direction === 'down') fullIntervals.reverse();
            var strumDelay = speed || 40; // ms between strings
            var useKS = d.synthEngine === 'plucked';
            fullIntervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12;
                var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
                var noteId = 'strum_' + idx;
                if (useKS) {
                  playPlucked(freq, noteId, d.ksBrightness || 0.8, d.ksDamping || 0.996);
                } else {
                  playNoteFor(freq, noteId, 1500);
                }
              }, idx * strumDelay);
            });
          }

          // ═══ HARMONYPAD PURE SOUND ═══
          function playHarmonyTone(freq, noteId, durationMs, preset) {
            var audio = getCtx();
            if (window._alloSynthActiveNotes[noteId]) return;
            var ctx = audio.ctx; var now = ctx.currentTime;
            var p = preset || 'harp';
            var osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = freq;
            var osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = freq;
            var gain1 = ctx.createGain(); var gain2 = ctx.createGain();
            var master = ctx.createGain();
            if (p === 'harp') { gain1.gain.value = 0.5; gain2.gain.value = 0.3; }
            else if (p === 'organ') { gain1.gain.value = 0.3; gain2.gain.value = 0.5; }
            else { gain1.gain.value = 0.4; gain2.gain.value = 0.4; }
            var attack = p === 'pad' ? 0.25 : 0.015;
            var release = p === 'pad' ? 1.2 : p === 'harp' ? 0.6 : 0.35;
            var vol = 0.3;
            master.gain.setValueAtTime(0, now);
            master.gain.linearRampToValueAtTime(vol, now + attack);
            osc1.connect(gain1); osc2.connect(gain2);
            gain1.connect(master); gain2.connect(master);
            if (p !== 'harp') {
              var osc3 = ctx.createOscillator(); osc3.type = 'sine';
              osc3.frequency.value = freq * 1.003;
              var gain3 = ctx.createGain(); gain3.gain.value = 0.12;
              osc3.connect(gain3); gain3.connect(master); osc3.start(now);
              window._alloSynthActiveNotes[noteId + '_ch'] = { o: osc3 };
            }
            master.connect(audio.gain);
            osc1.start(now); osc2.start(now);
            // Auto-release after duration
            var dur = durationMs || 1200;
            var endT = now + dur / 1000;
            master.gain.setValueAtTime(vol, endT);
            master.gain.linearRampToValueAtTime(0, endT + release);
            setTimeout(function () {
              try { osc1.stop(); osc2.stop(); } catch (e) { }
              if (window._alloSynthActiveNotes[noteId + '_ch']) {
                try { window._alloSynthActiveNotes[noteId + '_ch'].o.stop(); } catch (e) { }
                delete window._alloSynthActiveNotes[noteId + '_ch'];
              }
              delete window._alloSynthActiveNotes[noteId];
            }, dur + release * 1000 + 100);
            window._alloSynthActiveNotes[noteId] = { oscs: [osc1, osc2], master: master };
          }
          function strumHarmony(rootNote, chordType, preset) {
            var chordData = CHORDS[chordType]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(rootNote);
            var intervals = chordData.intervals.slice();
            var oct = d.octave || 4;
            intervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12;
                var nOct = oct + Math.floor((ri + intv) / 12);
                playHarmonyTone(noteFreq(NOTE_NAMES[nIdx], nOct), 'omni_' + idx, 1400, preset);
              }, idx * 35);
            });
          }

          // ═══ DRUM SYNTHESIS ═══
          // ═══ UNIFIED DRUM SYNTHESIZER ═══
          // Handles ALL drum types with Web Audio synthesis
          function playDrum(type, when) {
            var audio = getCtx(); var ctxA = audio.ctx;
            var now = (typeof when === 'number' && isFinite(when) && when > ctxA.currentTime) ? when : ctxA.currentTime;
            var drumGain = ctxA.createGain(); drumGain.connect(audio.effects ? audio.effects.filter : audio.gain);
            if (type === 'kick') {
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(1, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.8; osc.start(now); osc.stop(now + 0.4);
            } else if (type === 'snare') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.15, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var nFilter = ctxA.createBiquadFilter(); nFilter.type = 'highpass'; nFilter.frequency.value = 1000;
              var nGain = ctxA.createGain(); nGain.gain.setValueAtTime(0.7, now); nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
              noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(drumGain);
              var body = ctxA.createOscillator(); body.type = 'triangle'; body.frequency.value = 180;
              var bGain = ctxA.createGain(); bGain.gain.setValueAtTime(0.5, now); bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
              body.connect(bGain); bGain.connect(drumGain); drumGain.gain.value = 0.7; noise.start(now); noise.stop(now + 0.15); body.start(now); body.stop(now + 0.08);
            } else if (type === 'hihat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.05, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hpf = ctxA.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
              noise.connect(hpf); hpf.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; noise.start(now); noise.stop(now + 0.05);
            } else if (type === 'clap') {
              for (var ci = 0; ci < 3; ci++) {
                (function(delay) {
                  var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.04, ctxA.sampleRate);
                  var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
                  noise.buffer = nBuf;
                  var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 1.5;
                  var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now + delay); eg.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);
                  noise.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.7;
                  noise.start(now + delay); noise.stop(now + delay + 0.08);
                })(ci * 0.012);
              }
            } else if (type === 'tom' || type === 'tom1' || type === 'tom2') {
              var baseF = type === 'tom2' ? 120 : type === 'tom1' ? 200 : 200;
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(baseF * 0.5, now + 0.2);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.7, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.6; osc.start(now); osc.stop(now + 0.25);
            } else if (type === 'rim') {
              var osc = ctxA.createOscillator(); osc.type = 'square';
              osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; osc.start(now); osc.stop(now + 0.05);
            } else if (type === 'openhat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.3, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; noise.start(now); noise.stop(now + 0.3);
            } else if (type === 'cymbal') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.5, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4; noise.start(now); noise.stop(now + 0.5);
            } else if (type === 'cowbell') {
              var osc1 = ctxA.createOscillator(); osc1.type = 'square'; osc1.frequency.value = 560;
              var osc2 = ctxA.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 845;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
              var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
              osc1.connect(bp); osc2.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4;
              osc1.start(now); osc2.start(now); osc1.stop(now + 0.3); osc2.stop(now + 0.3);
            } else if (type === 'clave') {
              var osc = ctxA.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 2500;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.5; osc.start(now); osc.stop(now + 0.04);
            } else if (type === 'shaker') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.08, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = 0.4; noise.start(now); noise.stop(now + 0.08);
            }
          }
          // Kit-flavored drum synthesis: applies per-kit tonal adjustments to synth drums
          function playDrumStyled(type, style, vol) {
            var audio = getCtx(); var ctxA = audio.ctx; var now = ctxA.currentTime;
            var dm = (style && style.decayMul) || 1.0;
            var ps = (style && style.pitchShift) || 0;
            var ff = (style && style.filterFreq) || 6000;
            var gm = (style && style.gainMul) || 0.8;
            var v = (vol || 0.8) * gm;
            var drumGain = ctxA.createGain(); drumGain.connect(audio.effects ? audio.effects.filter : audio.gain);
            // Apply kit-wide filter coloring for synth sounds
            var kitFilter = ctxA.createBiquadFilter();
            kitFilter.type = 'lowpass'; kitFilter.frequency.value = ff; kitFilter.Q.value = 0.7;
            drumGain.connect(kitFilter); kitFilter.connect(audio.effects ? audio.effects.filter : audio.gain);
            // Re-route drumGain through the filter
            drumGain.disconnect(); drumGain.connect(kitFilter);
            if (type === 'kick') {
              var baseF = 150 * (1 + ps);
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.12 * dm);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(1, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.4 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v; osc.start(now); osc.stop(now + 0.4 * dm);
            } else if (type === 'snare') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.15 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var nFilter = ctxA.createBiquadFilter(); nFilter.type = 'highpass'; nFilter.frequency.value = 1000 * (1 + ps * 2);
              var nGain = ctxA.createGain(); nGain.gain.setValueAtTime(0.7, now); nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15 * dm);
              noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(drumGain);
              var body = ctxA.createOscillator(); body.type = 'triangle'; body.frequency.value = 180 * (1 + ps);
              var bGain = ctxA.createGain(); bGain.gain.setValueAtTime(0.5, now); bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08 * dm);
              body.connect(bGain); bGain.connect(drumGain); drumGain.gain.value = v * 0.875; noise.start(now); noise.stop(now + 0.15 * dm); body.start(now); body.stop(now + 0.08 * dm);
            } else if (type === 'hihat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.05 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hpf = ctxA.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 7000 + ps * 3000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05 * dm);
              noise.connect(hpf); hpf.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; noise.start(now); noise.stop(now + 0.05 * dm);
            } else if (type === 'clap') {
              for (var ci = 0; ci < 3; ci++) {
                (function(delay) {
                  var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.04 * dm, ctxA.sampleRate);
                  var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
                  noise.buffer = nBuf;
                  var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000 * (1 + ps); bp.Q.value = 1.5;
                  var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now + delay); eg.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08 * dm);
                  noise.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.875;
                  noise.start(now + delay); noise.stop(now + delay + 0.08 * dm);
                })(ci * 0.012);
              }
            } else if (type === 'tom' || type === 'tom1' || type === 'tom2' || type === 'tom3') {
              var baseF = (type === 'tom2' ? 120 : type === 'tom3' ? 90 : type === 'tom1' ? 200 : 200) * (1 + ps);
              var osc = ctxA.createOscillator(); osc.type = 'sine';
              osc.frequency.setValueAtTime(baseF, now); osc.frequency.exponentialRampToValueAtTime(baseF * 0.5, now + 0.2 * dm);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.7, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.25 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.75; osc.start(now); osc.stop(now + 0.25 * dm);
            } else if (type === 'rim') {
              var osc = ctxA.createOscillator(); osc.type = 'square';
              osc.frequency.setValueAtTime(800 * (1 + ps * 2), now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.03 * dm);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; osc.start(now); osc.stop(now + 0.05 * dm);
            } else if (type === 'openhat') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.3 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000 + ps * 2000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.4, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3 * dm);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; noise.start(now); noise.stop(now + 0.3 * dm);
            } else if (type === 'cymbal') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.5 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000 + ps * 2000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.5 * dm);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.5; noise.start(now); noise.stop(now + 0.5 * dm);
            } else if (type === 'cowbell') {
              var osc1 = ctxA.createOscillator(); osc1.type = 'square'; osc1.frequency.value = 560 * (1 + ps);
              var osc2 = ctxA.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 845 * (1 + ps);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.5, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.3 * dm);
              var bp = ctxA.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700 * (1 + ps); bp.Q.value = 3;
              osc1.connect(bp); osc2.connect(bp); bp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.5;
              osc1.start(now); osc2.start(now); osc1.stop(now + 0.3 * dm); osc2.stop(now + 0.3 * dm);
            } else if (type === 'clave') {
              var osc = ctxA.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 2500 * (1 + ps);
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.6, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.04 * dm);
              osc.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.625; osc.start(now); osc.stop(now + 0.04 * dm);
            } else if (type === 'shaker') {
              var noise = ctxA.createBufferSource(); var nBuf = ctxA.createBuffer(1, ctxA.sampleRate * 0.08 * dm, ctxA.sampleRate);
              var nd = nBuf.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
              noise.buffer = nBuf;
              var hp = ctxA.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000 + ps * 3000;
              var eg = ctxA.createGain(); eg.gain.setValueAtTime(0.3, now); eg.gain.exponentialRampToValueAtTime(0.01, now + 0.08 * dm);
              noise.connect(hp); hp.connect(eg); eg.connect(drumGain); drumGain.gain.value = v * 0.5; noise.start(now); noise.stop(now + 0.08 * dm);
            } else {
              // Unknown type — fall back to basic playDrum
              playDrum(type);
            }
          }
          function playClick(accent, when) {
            var audio = getCtx(); var ctx = audio.ctx;
            // Schedule ahead when asked, so a bar of clicks lands on the sample clock
            // rather than wherever setTimeout happens to fire.
            var now = (typeof when === 'number' && isFinite(when) && when > ctx.currentTime) ? when : ctx.currentTime;
            var osc = ctx.createOscillator(); osc.type = 'sine';
            osc.frequency.value = accent ? 1000 : 800;
            var eg = ctx.createGain(); eg.gain.setValueAtTime(accent ? 0.5 : 0.3, now);
            eg.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.connect(eg); eg.connect(audio.gain); osc.start(now); osc.stop(now + 0.05);
          }

          // ═══ SCALE & CHORD DATA ═══
          var SCALES = {
            'Major': { intervals: [0, 2, 4, 5, 7, 9, 11], desc: t('stem.synth.happy_bright_the_most_common', 'Happy, bright. The most common Western scale.'), science: 'Built on the pattern W-W-H-W-W-W-H (Whole/Half steps). The Ionian mode. Its brightness comes from the major 3rd (4 semitones) and perfect 5th (7 semitones).' },
            'Natural Minor': { intervals: [0, 2, 3, 5, 7, 8, 10], desc: t('stem.synth.sad_dark_introspective', 'Sad, dark, introspective.'), science: 'Pattern: W-H-W-W-H-W-W. The Aeolian mode. The minor 3rd (3 semitones) creates a darker, more somber quality than major.' },
            'Harmonic Minor': { intervals: [0, 2, 3, 5, 7, 8, 11], desc: t('stem.synth.exotic_dramatic_classical', 'Exotic, dramatic, classical.'), science: 'Like natural minor but raises the 7th degree. Creates an augmented 2nd interval (3 semitones) between the 6th and 7th, giving it a Middle Eastern flavor.' },
            'Melodic Minor': { intervals: [0, 2, 3, 5, 7, 9, 11], desc: t('stem.synth.smooth_jazzy_sophisticated', 'Smooth, jazzy, sophisticated.'), science: 'Raises both the 6th and 7th degrees of natural minor. Used ascending in classical; jazz uses it both ways. Foundation of many jazz modes.' },
            'Pentatonic Major': { intervals: [0, 2, 4, 7, 9], desc: t('stem.synth.universal_folk_rock', 'Universal, folk, rock.'), science: 'A 5-note subset of the major scale, removing the 4th and 7th. Found in music worldwide because it avoids semitones, making any combination sound consonant.' },
            'Pentatonic Minor': { intervals: [0, 3, 5, 7, 10], desc: t('stem.synth.blues_rock_universal', 'Blues, rock, universal.'), science: 'The most common scale for improvisation. 5 notes, no semitones. Guitar solos, Asian music, African music all use this scale extensively.' },
            'Blues': { intervals: [0, 3, 5, 6, 7, 10], desc: t('stem.synth.soulful_gritty_expressive', 'Soulful, gritty, expressive.'), science: 'Adds the "blue note" (\u266D5/\u266F4) to the minor pentatonic. This tritone creates tension and the characteristic blues sound. Bending notes is central to blues expression.' },
            'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10], desc: t('stem.synth.jazz_funk_sophisticated_minor', 'Jazz, funk, sophisticated minor.'), science: 'A minor mode with a raised 6th degree. Used heavily in jazz and funk (e.g., "So What" by Miles Davis). Has a "bright minor" quality.' },
            'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10], desc: t('stem.synth.rock_folk_dominant_feel', 'Rock, folk, dominant feel.'), science: 'A major scale with a lowered 7th. The "dominant" sound. Used in rock (Grateful Dead), folk, and creates the V7 chord quality.' },
            'Phrygian': { intervals: [0, 1, 3, 5, 7, 8, 10], desc: t('stem.synth.spanish_flamenco_metal', 'Spanish, flamenco, metal.'), science: 'A minor mode with \u266D2. The half-step from root creates dramatic, dark tension. Central to flamenco guitar and heavy metal.' },
            'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11], desc: t('stem.synth.dreamy_ethereal_film_scores', 'Dreamy, ethereal, film scores.'), science: 'A major scale with \u266F4. The raised 4th creates a "floating" quality. Used extensively in film scores (John Williams) and progressive rock.' },
            'Whole Tone': { intervals: [0, 2, 4, 6, 8, 10], desc: t('stem.synth.mysterious_ambiguous_dreamlike', 'Mysterious, ambiguous, dreamlike.'), science: 'All whole steps, no half steps. No tonal center. Only 2 unique whole-tone scales exist. Used by Debussy and in mystery/dream sequences.' },
            'Chromatic': { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], desc: t('stem.synth.all_12_notes_complete_but', 'All 12 notes. Complete but atonal.'), science: 'Every semitone in the octave. No tonal hierarchy. The basis of 12-tone serialism (Schoenberg). Each note is equally spaced at 2^(1/12) \u2248 1.0595 frequency ratio.' },
          };

          var CHORDS = {
            'Major': { intervals: [0, 4, 7], symbol: '', desc: t('stem.synth.happy_stable_resolved', 'Happy, stable, resolved.'), science: 'Root + Major 3rd (4 semitones) + Perfect 5th (7 semitones). Frequency ratio approximately 4:5:6. The most consonant triad.' },
            'Minor': { intervals: [0, 3, 7], symbol: 'm', desc: t('stem.synth.sad_introspective_dark', 'Sad, introspective, dark.'), science: 'Root + Minor 3rd (3 semitones) + Perfect 5th. The lowered 3rd creates a more somber quality. Ratio approximately 10:12:15.' },
            'Diminished': { intervals: [0, 3, 6], symbol: 'dim', desc: t('stem.synth.tense_unstable_needs_to_resolve', 'Tense, unstable, needs to resolve.'), science: 'Two minor 3rds stacked. The tritone (6 semitones) between root and 5th is the most dissonant interval, creating maximum tension.' },
            'Augmented': { intervals: [0, 4, 8], symbol: 'aug', desc: t('stem.synth.mysterious_unresolved_eerie', 'Mysterious, unresolved, eerie.'), science: 'Two major 3rds stacked. Divides the octave into 3 equal parts. Symmetrical \u2014 only 4 unique augmented triads exist.' },
            'Maj7': { intervals: [0, 4, 7, 11], symbol: 'maj7', desc: t('stem.synth.smooth_lush_jazzy', 'Smooth, lush, jazzy.'), science: 'Major triad + major 7th (11 semitones). The major 7th interval is nearly an octave, creating a sweet, complex resonance.' },
            'Min7': { intervals: [0, 3, 7, 10], symbol: 'm7', desc: t('stem.synth.cool_mellow_relaxed', 'Cool, mellow, relaxed.'), science: 'Minor triad + minor 7th (10 semitones). Very common in jazz. Less tense than dominant 7th, more complex than minor triad.' },
            'Dom7': { intervals: [0, 4, 7, 10], symbol: '7', desc: t('stem.synth.bluesy_restless_wants_to_resolve', 'Bluesy, restless, wants to resolve.'), science: 'Major triad + minor 7th. The tritone between 3rd and \u266D7th creates tension that "pulls" toward resolution to a chord a 5th below (V7\u2192I).' },
            'Sus2': { intervals: [0, 2, 7], symbol: 'sus2', desc: t('stem.synth.open_modern_shimmering', 'Open, modern, shimmering.'), science: 'Replaces the 3rd with the 2nd. Neither major nor minor \u2014 ambiguous quality. Common in pop and ambient music.' },
            'Sus4': { intervals: [0, 5, 7], symbol: 'sus4', desc: t('stem.synth.suspended_yearning_to_resolve', 'Suspended, yearning to resolve.'), science: 'Replaces the 3rd with the 4th. The 4th wants to "suspend" down to the 3rd. Used since medieval music to create tension-release.' },
            'Power': { intervals: [0, 7, 12], symbol: '5', desc: t('stem.synth.raw_strong_genredefining', 'Raw, strong, genre-defining.'), science: 'Just root + 5th (+ octave). No 3rd means no major/minor quality. Sounds huge with distortion because the simple 3:2 ratio stays clean when clipped.' },
            // Extended voicings (MiniChord-inspired)
            '6': { intervals: [0, 4, 7, 9], symbol: '6', desc: t('stem.synth.warm_jazzy_classic', 'Warm, jazzy, classic.'), science: 'Major triad + major 6th. Central to Barry Harris harmony. A sweet, sophisticated alternative to maj7.' },
            'min6': { intervals: [0, 3, 7, 9], symbol: 'm6', desc: t('stem.synth.sophisticated_minor', 'Sophisticated minor.'), science: 'Minor triad + major 6th. Key chord in Barry Harris minor system. Creates smooth voice leading with dim7 passing chords.' },
            'add9': { intervals: [0, 2, 4, 7], symbol: 'add9', desc: t('stem.synth.bright_open_modern_pop', 'Bright, open, modern pop.'), science: 'Major triad + 9th (2nd up an octave). No 7th. Clean, shimmering sound popular in contemporary pop and worship music.' },
            '9': { intervals: [0, 4, 7, 10, 14], symbol: '9', desc: t('stem.synth.rich_funky_bluesy', 'Rich, funky, bluesy.'), science: 'Dominant 7th + 9th. Full, complex sound. Essential in funk, R&B, and blues. Hendrix made the 7\u266F9 famous.' },
            'Maj9': { intervals: [0, 4, 7, 11, 14], symbol: 'maj9', desc: t('stem.synth.dreamy_lush', 'Dreamy, lush.'), science: 'Major 7th + 9th. Maximum smoothness and warmth. Neo-soul and jazz ballads. The quintessential "beautiful" chord.' },
            'Min9': { intervals: [0, 3, 7, 10, 14], symbol: 'm9', desc: t('stem.synth.cool_sophisticated', 'Cool, sophisticated.'), science: 'Minor 7th + 9th. The quintessential modern jazz minor chord. Creates a contemplative, introspective mood.' },
            '13': { intervals: [0, 4, 7, 10, 14, 21], symbol: '13', desc: t('stem.synth.full_orchestral_complex', 'Full, orchestral, complex.'), science: 'Dominant with 9th + 13th. Six notes! Used in jazz endings, gospel turnarounds, and orchestral voicings.' },
            'dim7': { intervals: [0, 3, 6, 9], symbol: 'dim7', desc: t('stem.synth.symmetrical_passing', 'Symmetrical, passing.'), science: 'All minor 3rds stacked. Only 3 unique dim7 chords exist (due to symmetry). Used as passing chords in Barry Harris harmony for smooth voice leading.' },
          };

          // Names a Barry Harris entry from the chord that will actually sound,
          // rather than from a hand-written Roman numeral that disagreed with it.
          function barryHarrisChordName(rootIdx, chord) {
            var chordRoot = NOTE_NAMES[(rootIdx + chord.degree) % 12];
            var suffix = chord.type === 'dim7' ? 'dim7' : chord.type === 'min6' ? 'm6' : '6';
            return chordRoot + suffix;
          }

          // Barry Harris harmony transformations
          var BARRY_HARRIS = {
            desc: __alloT('stem.music.barry_harris_1929_2021_codified_bebop_', 'Barry Harris (1929-2021) codified bebop harmony. His system uses 6th chords instead of 7ths and adds diminished passing chords between scale degrees for smooth voice leading.'),
            majorScale: function (rootIdx) {
              // Barry Harris major scale: 1-2-3-4-5-6-\u266D7dim-7
              // Each degree alternates between 6th chord and dim7 passing chord
              return [
                { degree: 0, type: '6', label: 'I6' },
                { degree: 2, type: 'dim7', label: '\u266F\u2170dim7' },
                { degree: 2, type: '6', label: 'II6' },
                { degree: 4, type: 'dim7', label: '\u266F\u2171dim7' },
                { degree: 5, type: '6', label: 'IV6' },
                { degree: 7, type: 'dim7', label: '\u266F\u2163dim7' },
                { degree: 7, type: '6', label: 'V6' },
                { degree: 9, type: 'dim7', label: '\u266F\u2164dim7' },
              ];
            },
            minorScale: function (rootIdx) {
              return [
                { degree: 0, type: 'min6', label: 'i-6' },
                { degree: 2, type: 'dim7', label: '\u266F\u2170dim7' },
                { degree: 3, type: 'min6', label: '\u266DIII-6' },
                { degree: 5, type: 'dim7', label: '\u266F\u2172dim7' },
                { degree: 5, type: 'min6', label: 'iv-6' },
                { degree: 7, type: 'dim7', label: '\u266F\u2163dim7' },
                { degree: 7, type: 'min6', label: 'v-6' },
                { degree: 9, type: 'dim7', label: '\u266F\u2164dim7' },
              ];
            }
          };

          // Records each distinct scale the student chooses, for the try_scales quest.
          function noteScaleTried(name) {
            var tried = (d.scalesTried || []).slice();
            if (tried.indexOf(name) === -1) { tried.push(name); upd('scalesTried', tried); }
          }

          // ═══ WAVEFORM INFO ═══
          var WAVE_INFO = {
            sine: { emoji: '\u223F', desc: t('stem.synth.pure_tone_fundamental_only', 'Pure tone, fundamental only'), harmonics: t('stem.synth.fundamental', 'Fundamental'), science: 'A sine wave is the simplest sound \u2014 a single frequency with no overtones. All other waveforms are combinations of sine waves (Fourier theorem).' },
            square: { emoji: '\u25A0', desc: t('stem.synth.hollow_reedlike', 'Hollow, reed-like'), harmonics: 'Odd only (1,3,5,7...)', science: 'Contains only odd harmonics. Sounds like a clarinet or old-school video games. Each harmonic\u2019s amplitude = 1/n.' },
            sawtooth: { emoji: '\u25E2', desc: t('stem.synth.bright_buzzy_rich', 'Bright, buzzy, rich'), harmonics: 'All harmonics', science: 'Contains ALL harmonics (both odd and even), each at 1/n amplitude. Sounds like a violin or brass. The richest waveform for subtractive synthesis.' },
            triangle: { emoji: '\u25B3', desc: t('stem.synth.soft_flutelike', 'Soft, flute-like'), harmonics: 'Odd only, fading fast', science: 'Like square but softer \u2014 odd harmonics at 1/n\u00B2. Sounds between sine and square, similar to a flute or ocarina.' }
          };
          var wInfo = WAVE_INFO[d.waveType || 'sine'];

          // ═══ INTERVALS ═══
          var INTERVALS = [
            { name: t('stem.synth.unison', 'Unison'), semitones: 0, ratio: '1:1', song: 'Same note', quality: 'perfect' },
            { name: t('stem.synth.minor_2nd', 'Minor 2nd'), semitones: 1, ratio: '16:15', song: 'Jaws theme', quality: 'dissonant' },
            { name: t('stem.synth.major_2nd', 'Major 2nd'), semitones: 2, ratio: '9:8', song: 'Happy Birthday (1st two notes)', quality: 'dissonant' },
            { name: t('stem.synth.minor_3rd', 'Minor 3rd'), semitones: 3, ratio: '6:5', song: 'Greensleeves', quality: 'consonant' },
            { name: t('stem.synth.major_3rd', 'Major 3rd'), semitones: 4, ratio: '5:4', song: 'Oh When the Saints', quality: 'consonant' },
            { name: t('stem.synth.perfect_4th', 'Perfect 4th'), semitones: 5, ratio: '4:3', song: 'Here Comes the Bride', quality: 'perfect' },
            { name: t('stem.synth.tritone', 'Tritone'), semitones: 6, ratio: '\u221A2:1', song: 'The Simpsons theme', quality: 'dissonant' },
            { name: t('stem.synth.perfect_5th', 'Perfect 5th'), semitones: 7, ratio: '3:2', song: 'Star Wars opening', quality: 'perfect' },
            { name: t('stem.synth.minor_6th', 'Minor 6th'), semitones: 8, ratio: '8:5', song: 'Love Story theme', quality: 'consonant' },
            { name: t('stem.synth.major_6th', 'Major 6th'), semitones: 9, ratio: '5:3', song: 'My Bonnie Lies Over the Ocean', quality: 'consonant' },
            { name: t('stem.synth.minor_7th', 'Minor 7th'), semitones: 10, ratio: '16:9', song: 'Star Trek theme', quality: 'dissonant' },
            { name: t('stem.synth.major_7th', 'Major 7th'), semitones: 11, ratio: '15:8', song: 'Take On Me (chorus)', quality: 'dissonant' },
            { name: t('stem.synth.octave', 'Octave'), semitones: 12, ratio: '2:1', song: 'Somewhere Over the Rainbow', quality: 'perfect' },
          ];

          // ═══ PRESETS (incl Plucked for K-S) ═══
          var PRESETS = {
            'Piano': { waveType: 'triangle', attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.4, volume: 0.6, filterCutoff: 8000, filterQ: 1, synthEngine: 'standard' },
            'Organ': { waveType: 'sine', attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.1, volume: 0.5, chorusMix: 0.3, vibratoDepth: 0.2, vibratoRate: 6, synthEngine: 'standard' },
            'Strings': { waveType: 'sawtooth', attack: 0.3, decay: 0.1, sustain: 0.8, release: 0.6, volume: 0.4, filterCutoff: 3000, filterQ: 2, tremoloDepth: 0.15, tremoloRate: 5, synthEngine: 'standard' },
            'Bass': { waveType: 'sawtooth', attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2, volume: 0.7, filterCutoff: 800, filterQ: 5, synthEngine: 'standard' },
            'Lead': { waveType: 'square', attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15, volume: 0.5, distAmount: 15, vibratoDepth: 0.3, vibratoRate: 5.5, synthEngine: 'standard' },
            'Pad': { waveType: 'sine', attack: 0.8, decay: 0.3, sustain: 0.7, release: 1.5, volume: 0.35, reverbMix: 0.6, chorusMix: 0.4, chorusRate: 0.8, synthEngine: 'standard' },
            'Plucked': { waveType: 'sawtooth', attack: 0.001, decay: 0.01, sustain: 0.01, release: 0.01, volume: 0.7, filterCutoff: 6000, filterQ: 1, synthEngine: 'plucked', ksBrightness: 0.8, ksDamping: 0.996 },
            'Guitar': { waveType: 'sawtooth', attack: 0.001, decay: 0.01, sustain: 0.01, release: 0.01, volume: 0.7, synthEngine: 'plucked', ksBrightness: 0.6, ksDamping: 0.998 },
            'Retro': { waveType: 'square', attack: 0.001, decay: 0.08, sustain: 0.3, release: 0.05, volume: 0.45, filterCutoff: 2000, filterQ: 8, synthEngine: 'standard' },
            'Spooky': { waveType: 'sine', attack: 0.5, decay: 0.3, sustain: 0.6, release: 2, volume: 0.3, reverbMix: 0.8, reverbSize: 4, vibratoDepth: 0.5, vibratoRate: 3, synthEngine: 'standard' }
          };
          function applyInstrumentPreset(name) {
            var p = PRESETS[name]; if (!p) return;
            Object.keys(p).forEach(function (k) { upd(k, p[k]); });
            upd('activePreset', name);
          }

          // ═══ PROGRESSIONS ═══
          var PROGRESSIONS = [
            { name: t('stem.synth.iivvi_classical', 'I-IV-V-I (Classical)'), degrees: [[0, 'Major'], [5, 'Major'], [7, 'Major'], [0, 'Major']], desc: t('stem.synth.the_foundation_of_western_music', 'The foundation of Western music.') },
            { name: t('stem.synth.ivviiv_pop', 'I-V-vi-IV (Pop)'), degrees: [[0, 'Major'], [7, 'Major'], [9, 'Minor'], [5, 'Major']], desc: t('stem.synth.used_in_thousands_of_pop', 'Used in thousands of pop songs.') },
            { name: __alloT('stem.music.ii_v_i_jazz', 'ii-V-I (Jazz)'), degrees: [[2, 'Min7'], [7, 'Dom7'], [0, 'Maj7']], desc: t('stem.synth.the_most_important_jazz_progression', 'The most important jazz progression.') },
            { name: t('stem.synth.iviivv_50s', 'I-vi-IV-V (50s)'), degrees: [[0, 'Major'], [9, 'Minor'], [5, 'Major'], [7, 'Major']], desc: t('stem.synth.classic_doowop_progression', 'Classic doo-wop progression.') },
            { name: __alloT('stem.music.12_bar_blues', '12-Bar Blues'), degrees: [[0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [5, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [0, 'Dom7'], [7, 'Dom7'], [5, 'Dom7'], [0, 'Dom7'], [7, 'Dom7']], desc: t('stem.synth.foundation_of_blues_rock_and', 'Foundation of blues, rock, and jazz.') },
            { name: __alloT('stem.music.vi_iv_i_v_emo_alt', 'vi-IV-I-V (Emo/Alt)'), degrees: [[9, 'Minor'], [5, 'Major'], [0, 'Major'], [7, 'Major']], desc: t('stem.synth.common_in_alternative_and_emo', 'Common in alternative and emo.') }
          ];

          // ═══ CIRCLE OF FIFTHS ═══
          var CIRCLE_OF_FIFTHS = [
            { key: 'C', minor: 'Am', sharps: 0, flats: 0 },
            { key: 'G', minor: 'Em', sharps: 1, flats: 0 },
            { key: 'D', minor: 'Bm', sharps: 2, flats: 0 },
            { key: 'A', minor: 'F#m', sharps: 3, flats: 0 },
            { key: 'E', minor: 'C#m', sharps: 4, flats: 0 },
            { key: 'B', minor: 'G#m', sharps: 5, flats: 0 },
            { key: 'F#/G\u266D', minor: 'D#m/E\u266Dm', sharps: 6, flats: 6 },
            { key: 'D\u266D', minor: 'B\u266Dm', sharps: 0, flats: 5 },
            { key: 'A\u266D', minor: 'Fm', sharps: 0, flats: 4 },
            { key: 'E\u266D', minor: 'Cm', sharps: 0, flats: 3 },
            { key: 'B\u266D', minor: 'Gm', sharps: 0, flats: 2 },
            { key: 'F', minor: 'Dm', sharps: 0, flats: 1 },
          ];

          // ═══ HARMONIC SERIES ═══
          var HARMONICS_INFO = [
            { n: 1, name: t('stem.synth.fundamental', 'Fundamental'), interval: t('stem.synth.unison', 'Unison'), ratio: '1x' },
            { n: 2, name: __alloT('stem.music.1st_overtone', '1st Overtone'), interval: t('stem.synth.octave', 'Octave'), ratio: '2x' },
            { n: 3, name: __alloT('stem.music.2nd_overtone', '2nd Overtone'), interval: 'P5 + Oct', ratio: '3x' },
            { n: 4, name: __alloT('stem.music.3rd_overtone', '3rd Overtone'), interval: '2 Octaves', ratio: '4x' },
            { n: 5, name: __alloT('stem.music.4th_overtone', '4th Overtone'), interval: 'M3 + 2 Oct', ratio: '5x' },
            { n: 6, name: __alloT('stem.music.5th_overtone', '5th Overtone'), interval: 'P5 + 2 Oct', ratio: '6x' },
            { n: 7, name: __alloT('stem.music.6th_overtone', '6th Overtone'), interval: '\u266D7 + 2 Oct', ratio: '7x' },
            { n: 8, name: __alloT('stem.music.7th_overtone', '7th Overtone'), interval: '3 Octaves', ratio: '8x' },
          ];
          function playHarmonic(harmNum) {
            var baseFreq = noteFreq(selectedRoot, d.octave || 4);
            playNoteFor(baseFreq * harmNum, 'harm_' + harmNum, 800);
          }

          // ═══ SEQUENCER DATA ═══
          var SEQ_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C5', 'C#5', 'D5', 'D#5', 'E5'];
          var SEQ_FREQS = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88, 523.25, 554.37, 587.33, 622.25, 659.26];
          var SEQ_IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0]; // for grid styling
          var DRUM_TYPES = ['kick', 'snare', 'hihat', 'clap', 'tom'];
          var DRUM_LABELS = ['\uD83E\uDD41 Kick', '\uD83E\uDD41 Snare', '\uD83E\uDD43 Hi-Hat', '\uD83D\uDC4F Clap', '\uD83E\uDD41 Tom'];
          var LOOP_LENGTHS = [8, 12, 16, 24, 32, 48, 64];
          var TIME_SIGS = { '4/4': { beats: 4, note: 4 }, '3/4': { beats: 3, note: 4 }, '6/8': { beats: 6, note: 8 }, '5/4': { beats: 5, note: 4 }, '7/8': { beats: 7, note: 8 } };

          // ═══ EFFECT TOOLTIPS ═══
          var EFFECT_TIPS = {
            adsr: { title: t('stem.synth.adsr_envelope', 'ADSR Envelope'), text: __alloT('stem.music.attack_time_to_reach_full_volume_decay', 'Attack: time to reach full volume. Decay: time to fall to sustain. Sustain: held volume level. Release: fade-out time after key release.') },
            scales: { title: t('stem.synth.scales_modes', 'Scales & Modes'), text: __alloT('stem.music.a_scale_is_an_ordered_set_of_pitches_m', 'A scale is an ordered set of pitches. Modes are rotations of the scale starting on different degrees. Each creates a different emotional mood.') },
            chords: { title: t('stem.synth.chord_theory', 'Chord Theory'), text: __alloT('stem.music.chords_are_built_by_stacking_intervals', 'Chords are built by stacking intervals (3rds). Major uses a major 3rd + minor 3rd. Minor reverses them. Extended chords add 7ths, 9ths, and beyond.') },
            drums: { title: t('stem.synth.drum_synthesis', 'Drum Synthesis'), text: __alloT('stem.music.kicks_use_a_sine_oscillator_with_a_pit', 'Kicks use a sine oscillator with a pitch sweep. Snares combine noise (filtered) + tone body. Hi-hats use high-pass filtered noise bursts.') },
            timeSig: { title: t('stem.synth.time_signatures', 'Time Signatures'), text: __alloT('stem.music.4_4_4_quarter_note_beats_per_bar_most_', '4/4 = 4 quarter-note beats per bar (most common). 3/4 = waltz feel. 6/8 = compound duple. 5/4 and 7/8 create asymmetric, exotic grooves.') },
            circleOfFifths: { title: t('stem.synth.circle_of_fifths', 'Circle of Fifths'), text: __alloT('stem.music.keys_arranged_by_ascending_5ths_clockw', 'Keys arranged by ascending 5ths clockwise. Adjacent keys share 6 of 7 notes. Moving clockwise adds sharps; counter-clockwise adds flats.') },
            harmonicSeries: { title: t('stem.synth.harmonic_series', 'Harmonic Series'), text: __alloT('stem.music.every_musical_sound_contains_overtones', 'Every musical sound contains overtones above the fundamental. Their relative strengths determine timbre \u2014 why a trumpet sounds different from a flute at the same pitch.') },
            intervals: { title: t('stem.synth.musical_intervals', 'Musical Intervals'), text: __alloT('stem.music.an_interval_is_the_distance_between_tw', 'An interval is the distance between two pitches, measured in semitones. The frequency ratio determines consonance (simple ratios like 3:2 sound smooth).') },
            arpeggiator: { title: t('stem.synth.arpeggiator', 'Arpeggiator'), text: __alloT('stem.music.plays_chord_notes_one_at_a_time_in_seq', 'Plays chord notes one at a time in sequence. Up = low to high, Down = high to low. Creates flowing patterns from static chords.') },
            filter: { title: t('stem.synth.resonant_filter', 'Resonant Filter'), text: __alloT('stem.music.a_filter_removes_frequencies_above_low', 'A filter removes frequencies above (lowpass), below (highpass), or around (bandpass) a cutoff frequency. Resonance (Q) amplifies frequencies near cutoff, creating a peak.') },
            tremolo: { title: t('stem.synth.tremolo_vibrato', 'Tremolo & Vibrato'), text: __alloT('stem.music.tremolo_periodic_volume_changes_amplit', 'Tremolo: periodic volume changes (amplitude modulation). Vibrato: periodic pitch changes (frequency modulation). Both controlled by an LFO (Low Frequency Oscillator).') },
            karplusStrong: { title: t('stem.synth.karplusstrong_synthesis', 'Karplus-Strong Synthesis'), text: __alloT('stem.music.discovered_in_1983_a_noise_burst_feeds', 'Discovered in 1983. A noise burst feeds into a very short delay line with feedback. The delay time determines pitch. A filter in the feedback loop controls brightness and decay. Naturally simulates plucked strings.') },
            composition: { title: t('stem.synth.music_composition', 'Music Composition'), text: __alloT('stem.music.the_sequencer_is_a_composition_tool_ea', 'The sequencer is a composition tool. Each step represents a beat subdivision. The melody row sets pitched notes, drums add rhythm. Musical notation shows what you create.') },
            notation: { title: t('stem.synth.musical_notation', 'Musical Notation'), text: __alloT('stem.music.notes_on_lines_and_spaces_represent_pi', 'Notes on lines and spaces represent pitches. Duration is shown by note shape: whole (\u25CB), half (\u{1D15E}), quarter (\u2669), eighth (\u266A). The staff uses 5 lines.') }
          };

          // ═══ MUSIC QUIZ ═══
          var MUSIC_QUIZ = [
            { q: 'What waveform contains ONLY the fundamental frequency?', a: 'Sine', opts: ['Sine', 'Square', 'Sawtooth', 'Triangle'] },
            { q: 'What does ADSR stand for?', a: 'Attack Decay Sustain Release', opts: ['Attack Decay Sustain Release', 'Audio Digital Sound Router', 'Amplitude Duration Signal Response', 'Analog Delay Synth Reverb'] },
            { q: 'Which interval has a 3:2 frequency ratio?', a: 'Perfect Fifth', opts: ['Perfect Fifth', 'Major Third', t('stem.synth.octave', 'Octave'), 'Perfect Fourth'] },
            { q: 'What key has NO sharps or flats?', a: 'C Major', opts: ['C Major', 'G Major', 'D Major', 'A Major'] },
            { q: 'How many semitones in an octave?', a: '12', opts: ['12', '8', '7', '10'] },
            { q: 'What makes a major chord sound \u201Chappy\u201D?', a: 'Major third interval', opts: ['Major third interval', 'More notes', 'Higher pitch', 'Louder volume'] },
            { q: 'What is a tritone?', a: '6 semitones apart', opts: ['6 semitones apart', 'Three tones', 'A type of chord', 'A drum pattern'] },
            { q: 'Which mode sounds "Spanish/Flamenco"?', a: 'Phrygian', opts: ['Phrygian', 'Dorian', 'Lydian', 'Mixolydian'] },
            { q: 'What creates the difference in timbre between instruments?', a: 'Harmonic content', opts: ['Harmonic content', 'Volume', 'Pitch', 'Duration'] },
            { q: 'In equal temperament, the ratio between adjacent semitones is:', a: '2^(1/12)', opts: ['2^(1/12)', '12/7', '3/2', '1.5'] },
            { q: 'What does a low-pass filter do?', a: 'Removes high frequencies', opts: ['Removes high frequencies', 'Removes low frequencies', 'Adds distortion', 'Adds reverb'] },
            { q: 'A ii-V-I progression is most associated with:', a: 'Jazz', opts: ['Jazz', 'Metal', 'Country', 'Classical'] },
            { q: 'Karplus-Strong synthesis creates sounds resembling:', a: 'Plucked strings', opts: ['Plucked strings', 'Brass instruments', 'Drums', 'Wind instruments'] },
            { q: 'What is resonance (Q) in a filter?', a: 'Boost at cutoff frequency', opts: ['Boost at cutoff frequency', 'Echo effect', 'Volume control', 'Pitch shift'] },
            { q: 'How many notes does a pentatonic scale have?', a: '5', opts: ['5', '7', '6', '8'] },
            { q: 'Barry Harris was famous for using which chord type?', a: '6th chords', opts: ['6th chords', 'Power chords', 'Suspended chords', '11th chords'] },
            { q: 'What effect periodically changes volume?', a: 'Tremolo', opts: ['Tremolo', 'Vibrato', 'Reverb', 'Distortion'] },
            { q: 'Which waveform has ALL harmonics?', a: 'Sawtooth', opts: ['Sawtooth', 'Sine', 'Square', 'Triangle'] },
            { q: 'What is the relative minor of C major?', a: 'A minor', opts: ['A minor', 'D minor', 'E minor', 'B minor'] },
            { q: 'What does LFO stand for?', a: 'Low Frequency Oscillator', opts: ['Low Frequency Oscillator', 'Linear Filter Output', 'Logarithmic Fade Out', 'Loop Function Operator'] },
            { q: 'In the circle of fifths, moving clockwise adds:', a: 'Sharps', opts: ['Sharps', 'Flats', 'Notes', 'Octaves'] },
            { q: 'A chord inversion changes:', a: 'Which note is on bottom', opts: ['Which note is on bottom', 'The chord quality', 'The number of notes', 'The key signature'] },
            { q: 'What note value gets one beat in 4/4 time?', a: 'Quarter note', opts: ['Quarter note', 'Half note', 'Whole note', 'Eighth note'] },
            { q: 'An augmented chord is built with:', a: 'Two major thirds', opts: ['Two major thirds', 'Two minor thirds', 'A major and minor third', 'A fifth and octave'] },
            { q: 'Vibrato modulates:', a: 'Pitch', opts: ['Pitch', 'Volume', 'Duration', 'Timbre'] },
            { q: 'The \u201Cblue note\u201D in a blues scale is:', a: 'Flatted fifth', opts: ['Flatted fifth', 'Sharp fourth', 'Minor second', 'Major seventh'] },
            { q: 'How many unique diminished 7th chords exist?', a: '3', opts: ['3', '12', '6', '4'] },
          ];

          // The authored bank put every correct answer FIRST in its opts
          // (27 of 27), so the quiz rendered "always pick A". Rotate each
          // question's opts deterministically — grading compares option TEXT
          // to q.a, so no index remap is needed. Deterministic because this
          // runs on every render.
          MUSIC_QUIZ.forEach(function (q, i) {
            var len = q.opts.length;
            var shift = (i * 7 + 3) % len;
            if (!shift) return;
            q.opts = q.opts.slice(shift).concat(q.opts.slice(0, shift));
          });

          // ═══ STATE ═══
          var synthTab = ['play','beatpad','chords','harmonypad','scales','theory','timbreHunt'].indexOf(d.synthTab) !== -1 ? d.synthTab : 'play';
          var selectedRoot = (typeof d.selectedRoot === 'string' && NOTE_NAMES.indexOf(d.selectedRoot) !== -1) ? d.selectedRoot : 'C';
          var selectedScale = (typeof d.selectedScale === 'string' && SCALES[d.selectedScale]) ? d.selectedScale : 'Major';
          var selectedChord = (typeof d.selectedChord === 'string' && CHORDS[d.selectedChord]) ? d.selectedChord : 'Major';
          var chordRoot = (typeof d.chordRoot === 'string' && NOTE_NAMES.indexOf(d.chordRoot) !== -1) ? d.chordRoot : 'C';
          var chordInversion = (typeof d.chordInversion === 'number' && isFinite(d.chordInversion)) ? Math.max(0, Math.min(3, Math.floor(d.chordInversion))) : 0;
          var safeOctave = (typeof d.octave === 'number' && isFinite(d.octave)) ? Math.max(2, Math.min(6, Math.round(d.octave))) : 4;
          var scaleLock = !!d.scaleLock;
          var looping = d.looping !== false;
          var seqPlaying = !!d.seqPlaying;
          var metroOn = !!d.metroOn;
          var arpOn = !!d.arpOn;
          var arpPattern = (typeof d.arpPattern === 'string' && ['up','down','updown','random'].indexOf(d.arpPattern) !== -1) ? d.arpPattern : 'up';
          var showFFT = !!d.showFFT;
          var timeSig = (typeof d.timeSig === 'string' && ['2/4','3/4','4/4','5/4','6/8'].indexOf(d.timeSig) !== -1) ? d.timeSig : '4/4';
          // Single source of tempo for the metronome and arpeggiator. d.bpm was read
          // in both places and written nowhere, pinning them to 120 regardless of the
          // sequencer's BPM slider.
          var BPM_MIN = 40, BPM_MAX = 208;   // Largo to Prestissimo
          var SWING_MAX_PCT = 75;
          /** Coerce any stored/shared tempo to a usable number of beats per minute. */
          function safeBPM(v) {
            var n = Number(v);
            if (!isFinite(n) || n <= 0) return 120;
            return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(n)));
          }
          /** Coerce a stored/shared swing amount to a fraction in [0, 0.75]. */
          function safeSwingFraction(v) {
            var n = parseFloat(v);
            if (!isFinite(n)) return 0;
            return Math.max(0, Math.min(SWING_MAX_PCT, n)) / 100;
          }
          var tempoBPM = safeBPM(d.seqBPM);
          // Feeds `new Array(loopLen)`, which THROWS on a negative or
          // fractional length. Nothing in the UI changes it, so any stored
          // value is untrusted.
          var loopLen = (Number.isInteger(d.loopLen) && d.loopLen > 0 && d.loopLen <= 64) ? d.loopLen : 16;
          var seq = Array.isArray(d.sequence) ? d.sequence : new Array(loopLen).fill(0);
          var _rawDrumSeq = d.drumSequence || d.drumSeq;
          var drumSeq = (_rawDrumSeq && typeof _rawDrumSeq === 'object' && !Array.isArray(_rawDrumSeq)) ? _rawDrumSeq : {};
          var intervalGame = (d.intervalGame && typeof d.intervalGame === 'object' && !Array.isArray(d.intervalGame)) ? d.intervalGame : null;
          var jazzMode = !!d.jazzMode;
          var synthEngine = (['standard','fm','pad','plucked','sub','supersaw'].indexOf(d.synthEngine) !== -1 ? d.synthEngine : 'standard');
          var vizMode = (typeof d.vizMode === 'string' && ['waveform','lissajous','helix'].indexOf(d.vizMode) !== -1) ? d.vizMode : 'waveform'; // waveform, lissajous, helix
          var isStudioLocked = !!(ctx.locked || ctx.teacherLocked || ctx.isLocked);
          var isMusicAssess = synthTab === 'timbreHunt' || synthTab === 'theory' || !!(intervalGame && !intervalGame.answered);

          // Scale helpers
          var rootIdx = NOTE_NAMES.indexOf(selectedRoot);
          var scaleIntervals = SCALES[selectedScale] ? SCALES[selectedScale].intervals : [0, 2, 4, 5, 7, 9, 11];
          function isInScale(semitone) { return scaleIntervals.indexOf(semitone % 12) !== -1; }

          // ═══ CHORD & SCALE PLAYBACK ═══
          function playChord(root, chordType, inv) {
            var chordData = CHORDS[chordType]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(root); var intervals = chordData.intervals.slice();
            for (var i = 0; i < (inv || 0); i++) { if (intervals.length > 1) intervals.push(intervals.shift() + 12); }
            intervals.forEach(function (intv, idx) {
              var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
              var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
              if (synthEngine === 'plucked') { playPlucked(freq, 'chord_' + idx, d.ksBrightness, d.ksDamping); }
              else { playNoteFor(freq, 'chord_' + idx, 1200); }
            });
          }
          function playScale(root, scaleName, descending) {
            var s = SCALES[scaleName]; if (!s) return; var ri = NOTE_NAMES.indexOf(root);
            var intervals = descending ? s.intervals.slice().reverse() : s.intervals.slice();
            intervals.forEach(function (intv, idx) {
              setTimeout(function () {
                var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                playNoteFor(noteFreq(NOTE_NAMES[nIdx], nOct), 'scale_' + idx, 350);
              }, idx * 300);
            });
          }
          function playProgression(prog) {
            var ri = NOTE_NAMES.indexOf(selectedRoot);
            prog.degrees.forEach(function (deg, idx) {
              setTimeout(function () {
                var chordRootIdx = (ri + deg[0]) % 12;
                playChord(NOTE_NAMES[chordRootIdx], deg[1], 0);
              }, idx * 800);
            });
          }

          // ═══ SEQUENCER ═══
          function toggleSeqStep(idx) { var s = seq.slice(); s[idx] = (s[idx] + 1) % (SEQ_NOTES.length + 1); upd('sequence', s); }
          function setSeqStep(idx, noteIdx) { var s = seq.slice(); s[idx] = noteIdx; upd('sequence', s); }
          function toggleDrumStep(type, idx) {
            var ds = Object.assign({}, drumSeq);
            if (!ds[type]) ds[type] = new Array(loopLen).fill(0);
            ds[type] = ds[type].slice(); ds[type][idx] = ds[type][idx] ? 0 : 1;
            upd('drumSequence', ds);
          }
          // NOTE: an earlier startSequencer/stopSequencer pair lived here and was dead
          // code — the Beat Pad engine below re-declares both names in this same
          // scope, and the later declaration wins. Removed so the shadowing cannot
          // silently reverse if these blocks are ever reordered.
          // How far ahead to schedule, and how often to look. The window only has to
          // exceed the polling interval by a comfortable margin; both are well under
          // the shortest beat the tempo range allows (208 BPM = 288 ms).
          var METRO_LOOKAHEAD_SEC = 0.15;
          var METRO_POLL_MS = 25;
          var _metroState = React.useRef({ nextBeatSec: 0, beat: 0, uiTimers: [] });
          // Beat-pad grids are roving: one tab stop each. Arrows/Home/End move it and
          // focus; Enter/Space stay with the native button. Cursor is view state, not saved.
          var _bpCurS = React.useState({ mel: 0, drum: 0, roll: 0 });
          var bpCur = _bpCurS[0], setBpCur = _bpCurS[1];
          var bpCell = function (gridName, idx, total) { return idx === ((bpCur[gridName] >= 0 && bpCur[gridName] < total) ? bpCur[gridName] : 0); };
          var bpGridKey = function (e, gridName, idx, cols, rows) {
            if (e.altKey || e.ctrlKey || e.metaKey) return;
            var k = e.key, x = idx % cols, y = Math.floor(idx / cols), n;
            if (k === 'ArrowRight') n = y * cols + Math.min(cols - 1, x + 1);
            else if (k === 'ArrowLeft') n = y * cols + Math.max(0, x - 1);
            else if (k === 'ArrowDown') n = Math.min(rows - 1, y + 1) * cols + x;
            else if (k === 'ArrowUp') n = Math.max(0, y - 1) * cols + x;
            else if (k === 'Home') n = y * cols;
            else if (k === 'End') n = y * cols + cols - 1;
            else return;
            e.preventDefault();
            if (n === idx) return;
            setBpCur(function (p) { var o = Object.assign({}, p); o[gridName] = n; return o; });
            var grid = e.currentTarget.closest ? e.currentTarget.closest('[data-bp-grid="' + gridName + '"]') : null;
            var next = grid && grid.querySelector('[data-bp-cell="' + n + '"]');
            if (next && next.focus) next.focus();
          };
          var bpCellFocus = function (gridName, idx) { if (bpCur[gridName] !== idx) setBpCur(function (p) { var o = Object.assign({}, p); o[gridName] = idx; return o; }); };

          function startMetronome() {
            stopMetronome();
            var audio = getCtx();
            if (!audio || !audio.ctx) return;
            var actx = audio.ctx;
            if (actx.state === 'suspended') actx.resume();
            upd('metroOn', true);

            var st = _metroState.current;
            var secPerBeat = 60 / tempoBPM;
            var beatsPerMeasure = TIME_SIGS[timeSig] ? TIME_SIGS[timeSig].beats : 4;
            st.beat = 0;
            st.nextBeatSec = actx.currentTime + 0.1;
            st.uiTimers = [];

            // The polling timer may fire early, late or irregularly; what matters is
            // that nextBeatSec advances by exactly one beat each time, so the audible
            // clicks stay locked to the sample clock no matter how the timer behaves.
            window._alloMetronomeInterval = setInterval(function () {
              while (st.nextBeatSec < actx.currentTime + METRO_LOOKAHEAD_SEC) {
                playClick(st.beat === 0, st.nextBeatSec);
                // Light the lamp when the click is due. A few ms out here is invisible,
                // so the UI stays on the cheap timer.
                (function (beatIdx, whenSec) {
                  var delayMs = Math.max(0, (whenSec - actx.currentTime) * 1000);
                  st.uiTimers.push(setTimeout(function () { upd('metroBeat', beatIdx); }, delayMs));
                })(st.beat, st.nextBeatSec);
                st.beat = (st.beat + 1) % beatsPerMeasure;
                st.nextBeatSec += secPerBeat;
              }
              // Keep the UI timer list from growing without bound over a long session.
              if (st.uiTimers.length > 64) st.uiTimers = st.uiTimers.slice(-32);
            }, METRO_POLL_MS);
          }
          function stopMetronome() {
            if (window._alloMetronomeInterval) { clearInterval(window._alloMetronomeInterval); window._alloMetronomeInterval = null; }
            var st = _metroState.current;
            for (var i = 0; i < st.uiTimers.length; i++) clearTimeout(st.uiTimers[i]);
            st.uiTimers = [];
            upd('metroOn', false); upd('metroBeat', -1);
          }
          function startArpeggiator() {
            stopArpeggiator(); upd('arpOn', true);
            var chordData = CHORDS[selectedChord]; if (!chordData) return;
            var ri = NOTE_NAMES.indexOf(chordRoot); var intervals = chordData.intervals.slice();
            var arpOctaves = d.arpOctaves || 1;
            var allNotes = [];
            for (var oi = 0; oi < arpOctaves; oi++) { intervals.forEach(function (intv) { allNotes.push(intv + oi * 12); }); }
            var step = 0; var ascending = true; var ms = (60000 / tempoBPM) / 2;
            window._alloArpInterval = setInterval(function () {
              var intv = allNotes[step]; var nIdx = (ri + intv) % 12;
              var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
              playNoteFor(noteFreq(NOTE_NAMES[nIdx], nOct), 'arp_' + step, ms * 0.8);
              if (arpPattern === 'up') { step = (step + 1) % allNotes.length; }
              else if (arpPattern === 'down') { step = step <= 0 ? allNotes.length - 1 : step - 1; }
              else if (arpPattern === 'updown') {
                if (ascending) { step++; if (step >= allNotes.length - 1) ascending = false; }
                else { step--; if (step <= 0) ascending = true; }
              }
              else { step = Math.floor(Math.random() * allNotes.length); }
            }, ms);
          }
          // ═══ RHYTHM CLAP-BACK ═══
          // Listen to a one-bar pattern, then tap it back. Timing is compared against
          // the pattern's onsets by scoreRhythm (module scope, tested directly).
          var _rhythmRun = React.useRef({ timers: [], taps: [], recordStartSec: null, patternId: null, beatMs: 500 });

          function stopRhythm() {
            var run = _rhythmRun.current;
            for (var i = 0; i < run.timers.length; i++) clearTimeout(run.timers[i]);
            run.timers = [];
          }

          function rhythmPatternById(id) {
            if (/^gen[1-4]$/.test(id || '') && d.rhythmGen && d.rhythmGen.id === id) return d.rhythmGen;
            for (var i = 0; i < RHYTHM_PATTERNS.length; i++) {
              if (RHYTHM_PATTERNS[i].id === id) return RHYTHM_PATTERNS[i];
            }
            return RHYTHM_PATTERNS[0];
          }

          function startRhythmRound() {
            // Guard re-entry: a second press mid-round would interleave two schedules.
            if (d.rhythmPhase === 'listen' || d.rhythmPhase === 'record') return;
            stopRhythm();
            var audio = getCtx();
            if (!audio || !audio.ctx) return;
            var actx = audio.ctx;
            if (actx.state === 'suspended') actx.resume();

            var pattern = rhythmPatternById(d.rhythmPatternId);
            var beatMs = 60000 / tempoBPM;
            var run = _rhythmRun.current;
            run.taps = [];
            run.patternId = pattern.id;
            run.beatMs = beatMs;

            var countInBeats = pattern.beats;
            // One list of onset offsets, used BOTH to schedule the audio and to score
            // the taps. Deriving them twice is how a reference and its measurement
            // drift apart.
            var onsets = rhythmOnsetTimes(pattern, beatMs);
            var barMs = pattern.beats * beatMs;

            // Audio-clock origin, with a short lead-in so the first click is not
            // clipped by the time it takes to build the nodes.
            var LEAD_IN_MS = 120;
            var originSec = actx.currentTime + LEAD_IN_MS / 1000;
            function audioAt(offsetMs) { return originSec + offsetMs / 1000; }
            // UI phase flips only; a few ms of setTimeout drift here is invisible.
            function at(delayMs, fn) { run.timers.push(setTimeout(fn, Math.max(0, LEAD_IN_MS + delayMs))); }

            upd('rhythmPhase', 'listen');
            upd('rhythmResult', null);
            if (announceToSR) announceToSR(__alloFmt('stem.music.sr_rhythm_listen', 'Count-in, then listen to {name}. Tap it back when the count-in repeats.', { name: __alloT('stem.music.rhythm_' + pattern.id, pattern.name) }));

            // Count-in bar: plain metronome clicks, accented downbeat.
            for (var c = 0; c < countInBeats; c++) {
              playClick(c === 0, audioAt(c * beatMs));
            }
            // The pattern itself, one bar later, on a drum so it is distinct from the count.
            for (var o = 0; o < onsets.length; o++) {
              playDrum('rim', audioAt(barMs + onsets[o]));
            }
            // Second count-in, then the student's bar.
            for (var c2 = 0; c2 < countInBeats; c2++) {
              playClick(c2 === 0, audioAt(barMs * 2 + c2 * beatMs));
            }

            // The student's bar begins at a known point on the audio clock, not
            // whenever the phase timer happens to fire.
            run.recordStartSec = audioAt(barMs * 3);
            at(barMs * 3, function () {
              run.taps = [];
              upd('rhythmPhase', 'record');
              if (announceToSR) announceToSR(__alloT('stem.music.sr_rhythm_go', 'Your turn. Tap the rhythm now.'));
            });
            // Score a little after the bar ends so a late final tap still counts.
            at(barMs * 4 + beatMs * 0.6, function () { finishRhythmRound(pattern, beatMs, onsets); });
          }

          function finishRhythmRound(pattern, beatMs, onsets) {
            var run = _rhythmRun.current;
            // Same onset list the audio was scheduled from, so the student is compared
            // against what they actually heard.
            var expected = onsets || rhythmOnsetTimes(pattern, beatMs);
            var result = scoreRhythm(expected, run.taps, beatMs);
            var passed = result.accuracy >= 0.75 && result.missed === 0 && result.extra === 0;
            upd('rhythmPhase', 'result');
            upd('rhythmResult', {
              patternId: pattern.id,
              accuracy: result.accuracy,
              hit: result.hit,
              missed: result.missed,
              extra: result.extra,
              meanAbsMs: Math.round(result.meanAbsMs),
              biasMs: Math.round(result.biasMs),
              grades: result.onsets.map(function (o) { return o.grade; }),
              expected: expected,
              taps: result.onsets.map(function (o) { return o.tapMs; }),
              extras: result.extras,
              beatMs: beatMs,
              beats: pattern.beats,
              beatsPerBar: pattern.beatsPerBar || pattern.beats,
              passed: passed
            });
            if (passed) {
              upd('rhythmPassed', (d.rhythmPassed || 0) + 1);
              upd('rhythmStreak', (d.rhythmStreak || 0) + 1);
              if (ctx.awardXP) ctx.awardXP('musicSynth', 3, __alloT('stem.music.rhythm_clap_back', '\uD83D\uDC4F Rhythm Clap-Back'));
            } else {
              upd('rhythmStreak', 0);
            }
            var pct = Math.round(result.accuracy * 100);
            var msg = passed
              ? '\u2705 ' + __alloFmt('stem.music.rhythm_passed', 'Nice timing! {pct}% accurate.', { pct: pct })
              : '\uD83C\uDFAF ' + __alloFmt('stem.music.rhythm_try_again', '{pct}% accurate. {detail}', {
                  pct: pct,
                  detail: result.missed > 0
                    ? __alloFmt('stem.music.rhythm_missed', 'You missed {n}.', { n: result.missed })
                    : result.extra > 0
                      ? __alloFmt('stem.music.rhythm_extra', '{n} extra taps.', { n: result.extra })
                      : result.biasMs > 0
                        ? __alloT('stem.music.rhythm_behind', 'You were behind the beat.')
                        : __alloT('stem.music.rhythm_ahead', 'You were ahead of the beat.')
                });
            addToast(msg, passed ? 'success' : 'info');
            if (announceToSR) announceToSR(msg);
          }

          function recordRhythmTap() {
            if (d.rhythmPhase !== 'record' || vsrTapIgnored(arguments[0])) return;
            var run = _rhythmRun.current;
            var audio = getCtx();
            // The clock the reference was scheduled on (not Date.now()), less the speaker
            // lag and the time the event waited for this handler (see vsrTapOffset).
            if (audio && audio.ctx && typeof run.recordStartSec === 'number') {
              run.taps.push((audio.ctx.currentTime - run.recordStartSec - vsrTapOffset(audio.ctx, arguments[0])) * 1000);
            }
            playDrum('rim');
            upd('rhythmTapCount', run.taps.length);
          }

          function stopArpeggiator() { if (window._alloArpInterval) { clearInterval(window._alloArpInterval); window._alloArpInterval = null; } upd('arpOn', false); }

          // ═══ INTERVAL EAR TRAINING ═══
          function startIntervalGame() {
            var idx = 1 + Math.floor(Math.random() * 12);
            var intv = INTERVALS[idx]; var base = noteFreq(selectedRoot, d.octave || 4);
            var top = base * Math.pow(2, intv.semitones / 12);
            playNoteFor(base, 'ear_base', 600);
            setTimeout(function () { playNoteFor(top, 'ear_top', 600); }, 700);
            upd('intervalGame', { answer: intv.name, base: base, top: top, answered: false, chosen: null, score: (intervalGame && intervalGame.score) || 0, streak: (intervalGame && intervalGame.streak) || 0 });
          }
          function replayInterval() {
            if (!intervalGame) return;
            playNoteFor(intervalGame.base, 'ear_base', 600);
            setTimeout(function () { playNoteFor(intervalGame.top, 'ear_top', 600); }, 700);
          }

          // ═══ KEYBOARD HANDLER (delegated to top-level useEffect via window refs) ═══
          // WCAG 2.1.4: the piano, chord and drum-pad keys act only while focus is
          // inside the music tool, never with Ctrl/Alt/Meta, and never in a text field.
          function musicKeyInTool(e) {
            var tg = e && e.target;
            if (!tg || !tg.closest || !tg.closest('.allo-music-tool')) return false;
            if (e.ctrlKey || e.metaKey || e.altKey) return false;
            return !(/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName || '') && tg.type !== 'range' && tg.type !== 'checkbox' && tg.type !== 'button') && !tg.isContentEditable;
          }
          var KEYBOARD_MAP = {
            'z': 0, 'x': 2, 'c': 4, 'v': 5, 'b': 7, 'n': 9, 'm': 11, ',': 12, '.': 14, '/': 16,
            's': 1, 'd': 3, 'g': 6, 'h': 8, 'j': 10, 'l': 13, ';': 15
          };
          window._alloSynthKeyDown = function (e) {
            if (e.repeat) return;
            if (!musicKeyInTool(e)) return;
            var semi = KEYBOARD_MAP[e.key.toLowerCase()];
            if (semi !== undefined && synthTab === 'play') {
              var key = KEYS[semi];
              if (key) {
                var noteId = key.note + key.octave;
                if (scaleLock && !isInScale(key.semitone)) return;
                if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                else { playNote(key.freq, noteId); }
                upd('activeKeys', _msKeys(d).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq);
              }
            }
          };
          window._alloSynthKeyUp = function (e) {
            var semi = KEYBOARD_MAP[e.key.toLowerCase()];
            if (semi !== undefined) {
              var key = KEYS[semi];
              if (key) { var noteId = key.note + key.octave; stopNote(noteId); upd('activeKeys', _msKeys(d).filter(function (x) { return x !== noteId; })); }
            }
          };

          // ═══ NOTATION HELPERS (for composition view) ═══
          var NOTE_TO_STAFF = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
          function seqToNotation(seqArr) {
            // Convert sequencer step array to notation-like data
            return seqArr.map(function (noteIdx, stepIdx) {
              if (noteIdx === 0) return { rest: true, step: stepIdx };
              var name = SEQ_NOTES[noteIdx - 1] || 'C';
              var baseName = name.replace(/[0-9]/g, '');
              var staffPos = NOTE_TO_STAFF[baseName] || 0;
              if (name.indexOf('5') !== -1) staffPos += 7;
              return { note: name, staffPos: staffPos, step: stepIdx, rest: false };
            });
          }

          // ═══ OSCILLOSCOPE REF (Zero-GC Phosphor Bloom, Dual-Harmonic Echo, FFT Waterfall & Resonance Ripples) ═══
          var canvasRef = function (canvasEl) {
            if (!canvasEl) {
              if (canvasRef._lastCanvas && canvasRef._lastCanvas._synthVizAnim) {
                cancelAnimationFrame(canvasRef._lastCanvas._synthVizAnim);
                canvasRef._lastCanvas._synthVizInit = false;
              }
              canvasRef._lastCanvas = null;
              return;
            }
            if (canvasEl._synthVizInit) return;
            canvasRef._lastCanvas = canvasEl;
            canvasEl._synthVizInit = true;
            var W = canvasEl.width = Math.max(2, (canvasEl.offsetWidth || 300) * 2);
            var H = canvasEl.height = Math.max(2, (canvasEl.offsetHeight || 110) * 2);
            var ctx = canvasEl.getContext('2d');
            if (!ctx) return;
            // Pre-allocated zero-GC scratch buffers & pools
            var timeBuf = null;
            var freqBuf = null;
            var SMOOTH_PTS = 96;
            var curWaveY = new Float32Array(SMOOTH_PTS);
            var prevWaveY = new Float32Array(SMOOTH_PTS);
            var echoWaveY = new Float32Array(SMOOTH_PTS);
            var wavePrimed = false;
            var peakHold = null;
            var peakVel = null;
            var WF_ROWS = 14;
            var WF_BINS = 48;
            var wfGrid = new Float32Array(WF_ROWS * WF_BINS);
            var wfHead = 0;
            var wfFrameTick = 0;
            var RIPPLE_MAX = 14;
            var ripX = new Float32Array(RIPPLE_MAX);
            var ripY = new Float32Array(RIPPLE_MAX);
            var ripR = new Float32Array(RIPPLE_MAX);
            var ripMaxR = new Float32Array(RIPPLE_MAX);
            var ripAlpha = new Float32Array(RIPPLE_MAX);
            var ripColor = new Array(RIPPLE_MAX);
            var ripActive = new Uint8Array(RIPPLE_MAX);
            var ripCursor = 0;
            var lastTriggerSeq = window._alloNoteTriggerSeq || 0;
            var vizStartMs = typeof performance !== 'undefined' ? performance.now() : 0;

            function spawnRipple(rx, ry, col, maxR) {
              var idx = ripCursor;
              ripCursor = (ripCursor + 1) % RIPPLE_MAX;
              ripX[idx] = rx;
              ripY[idx] = ry;
              ripR[idx] = 6;
              ripMaxR[idx] = maxR;
              ripAlpha[idx] = 0.85;
              ripColor[idx] = col || '#c084fc';
              ripActive[idx] = 1;
            }

            function drawSmoothWavePath(ys, count, width) {
              var stepX = width / (count - 1);
              ctx.beginPath();
              ctx.moveTo(0, ys[0]);
              for (var k = 1; k < count - 1; k++) {
                var x1 = k * stepX;
                var y1 = ys[k];
                var mx = (x1 + (k + 1) * stepX) * 0.5;
                var my = (y1 + ys[k + 1]) * 0.5;
                ctx.quadraticCurveTo(x1, y1, mx, my);
              }
              ctx.lineTo(width, ys[count - 1]);
            }

            function draw() {
              if (!canvasEl.isConnected) { canvasEl._synthVizInit = false; return; }
              canvasEl._synthVizAnim = requestAnimationFrame(draw);
              var analyser = window._alloSynthAnalyser;
              var vizMode = canvasEl.dataset.vizMode || 'waveform';
              var reduced = musicReducedMotion();
              var hc = musicHighContrast();
              var showFFTMode = canvasEl.dataset.showFft === 'true';
              var nowSec = ((typeof performance !== 'undefined' ? performance.now() : 0) - vizStartMs) * 0.001;

              // Ingest any new note triggers into the zero-GC concentric resonance ripple pool
              var trigSeq = window._alloNoteTriggerSeq || 0;
              if (trigSeq !== lastTriggerSeq) {
                lastTriggerSeq = trigSeq;
                var tNormX = typeof window._alloNoteTriggerNormX === 'number' ? window._alloNoteTriggerNormX : 0.5;
                var tCol = window._alloNoteTriggerColor || canvasEl.dataset.noteColor || '#c084fc';
                spawnRipple(tNormX * W, H * 0.5, tCol, Math.min(W * 0.24, H * 0.92));
                if (!reduced && !hc) {
                  spawnRipple(tNormX * W, H * 0.5, '#38bdf8', Math.min(W * 0.16, H * 0.62));
                }
              }

              // Backdrop: High-Contrast solid black, CRT phosphor persistence wash, or studio vignette
              if (hc) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, W, H);
              } else if (!reduced && vizMode !== 'helix' && !showFFTMode && analyser) {
                ctx.fillStyle = 'rgba(10, 6, 24, 0.34)';
                ctx.fillRect(0, 0, W, H);
              } else {
                if (typeof ctx.createRadialGradient === 'function') {
                  var crtBg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.08, W * 0.5, H * 0.5, W * 0.62);
                  crtBg.addColorStop(0, '#160f33');
                  crtBg.addColorStop(0.65, '#0e0920');
                  crtBg.addColorStop(1, '#070412');
                  ctx.fillStyle = crtBg;
                } else {
                  ctx.fillStyle = '#0f0a1e';
                }
                ctx.fillRect(0, 0, W, H);
              }

              // Crisp CRT oscilloscope graticule + center calibration ticks
              ctx.strokeStyle = hc ? 'rgba(255,255,0,0.22)' : 'rgba(139,92,246,0.11)'; ctx.lineWidth = 1;
              for (var gx = 40; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); }
              for (var gy = 20; gy < H; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke(); }
              ctx.strokeStyle = hc ? 'rgba(255,255,0,0.5)' : 'rgba(167,139,250,0.26)'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(0, H / 2 + 0.5); ctx.lineTo(W, H / 2 + 0.5); ctx.stroke();
              for (var tx = 20; tx < W; tx += 20) {
                var th = tx % 80 === 0 ? 6 : 3;
                ctx.beginPath(); ctx.moveTo(tx + 0.5, H / 2 - th); ctx.lineTo(tx + 0.5, H / 2 + th); ctx.stroke();
              }
              if (!hc) {
                ctx.fillStyle = 'rgba(255,255,255,0.018)';
                for (var sl = 0; sl < H; sl += 4) ctx.fillRect(0, sl, W, 1);
              }

              // Serene harmonic standby standing wave when analyser has not initialized yet
              if (!analyser) {
                ctx.save();
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                var idlePhase = reduced ? 0 : nowSec * 2.2;
                for (var ik = 0; ik < SMOOTH_PTS; ik++) {
                  var iu = ik / (SMOOTH_PTS - 1);
                  var env = Math.sin(iu * Math.PI);
                  var idleAmp = (reduced || hc) ? 0 : (Math.sin(iu * Math.PI * 4 + idlePhase) * 0.65 + Math.sin(iu * Math.PI * 8 - idlePhase * 1.3) * 0.35) * env * H * 0.055;
                  curWaveY[ik] = H * 0.5 + idleAmp;
                }
                drawSmoothWavePath(curWaveY, SMOOTH_PTS, W);
                if (hc) {
                  ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2; ctx.stroke();
                } else {
                  ctx.strokeStyle = 'rgba(168,85,247,0.38)'; ctx.lineWidth = 4; ctx.stroke();
                  ctx.strokeStyle = 'rgba(196,181,253,0.78)'; ctx.lineWidth = 1.6; ctx.stroke();
                }
                ctx.restore();
                return;
              }

              var binCount = analyser.frequencyBinCount;
              if (!timeBuf || timeBuf.length !== binCount) timeBuf = new Uint8Array(binCount);
              if (!freqBuf || freqBuf.length !== binCount) freqBuf = new Uint8Array(binCount);

              if (vizMode === 'lissajous') {
                // Lissajous: zero-GC dual-pass CRT phosphor X-Y trace + phase tracking comet head
                analyser.getByteTimeDomainData(timeBuf);
                var phaseShift = Math.floor(binCount / 4);
                var stride = Math.max(1, Math.floor((binCount - phaseShift) / 140));
                ctx.save();
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath();
                var prevX = 0, prevY = 0, firstL = true, tipX = W * 0.5, tipY = H * 0.5;
                for (var li = 0; li < binCount - phaseShift; li += stride) {
                  var lx = (timeBuf[li] / 255) * W;
                  var ly = (timeBuf[li + phaseShift] / 255) * H;
                  if (firstL) { ctx.moveTo(lx, ly); firstL = false; }
                  else { ctx.quadraticCurveTo(prevX, prevY, (prevX + lx) * 0.5, (prevY + ly) * 0.5); }
                  prevX = lx; prevY = ly; tipX = lx; tipY = ly;
                }
                if (hc) {
                  ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2.4; ctx.stroke();
                } else {
                  ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 16;
                  ctx.strokeStyle = 'rgba(168,85,247,0.45)'; ctx.lineWidth = 5; ctx.stroke();
                  ctx.shadowBlur = 6;
                  ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 2; ctx.stroke();
                  // Phase-tracking comet beacon
                  ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
                  ctx.fillStyle = '#e0f2fe';
                  ctx.beginPath(); ctx.arc(tipX, tipY, 3.6, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
              } else if (vizMode === 'helix') {
                // 3D helix: glowing harmonic ribbon + depth-sorted standing-wave beads
                analyser.getByteTimeDomainData(timeBuf);
                var turns = 3; var perspective = 0.32;
                var phaseDrift = reduced ? 0 : nowSec * 1.4;
                ctx.save();
                // Connecting phase spine
                ctx.beginPath();
                for (var hi = 0; hi < binCount; hi += 4) {
                  var ht = hi / binCount;
                  var hAng = ht * turns * Math.PI * 2 + phaseDrift;
                  var hAmp = (timeBuf[hi] / 128 - 1) * (H * 0.35);
                  var hx = ht * W;
                  var hDepth = Math.sin(hAng) * perspective + 1;
                  var hy = H / 2 + hAmp * Math.cos(hAng) * hDepth;
                  if (hi === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
                }
                ctx.strokeStyle = hc ? '#ffff00' : 'rgba(192,132,252,0.42)';
                ctx.lineWidth = hc ? 2 : 2.2;
                ctx.stroke();
                for (var hi2 = 0; hi2 < binCount; hi2 += 4) {
                  var t = hi2 / binCount;
                  var angle = t * turns * Math.PI * 2 + phaseDrift;
                  var amplitude = (timeBuf[hi2] / 128 - 1) * (H * 0.35);
                  var x = t * W;
                  var depth = Math.sin(angle) * perspective + 1;
                  var y = H / 2 + amplitude * Math.cos(angle) * depth;
                  var hue = 250 + t * 90;
                  var rDot = 1.6 + depth * 1.4;
                  if (hc) {
                    ctx.fillStyle = depth > 1 ? '#ffff00' : '#00ff00';
                    ctx.beginPath(); ctx.arc(x, y, rDot, 0, Math.PI * 2); ctx.fill();
                  } else {
                    ctx.fillStyle = 'hsla(' + hue + ', 90%, 65%, ' + (0.18 + depth * 0.16) + ')';
                    ctx.beginPath(); ctx.arc(x, y, rDot * 2.2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'hsla(' + hue + ', 95%, 78%, ' + (0.48 + depth * 0.38) + ')';
                    ctx.beginPath(); ctx.arc(x, y, rDot, 0, Math.PI * 2); ctx.fill();
                  }
                }
                ctx.restore();
              } else if (showFFTMode) {
                // Shimmering FFT spectral waterfall aura + glowing harmonic bars + gravity peak-hold decay glow
                analyser.getByteFrequencyData(freqBuf);
                var barCount = Math.max(1, Math.min(WF_BINS, Math.floor(binCount / 3)));
                var barW = W / barCount;
                if (!peakHold || peakHold.length !== barCount) {
                  peakHold = new Float32Array(barCount);
                  peakVel = new Float32Array(barCount);
                }
                // Record spectral waterfall row every 3 frames (zero-GC ring buffer)
                wfFrameTick++;
                if (!reduced && !hc && wfFrameTick % 3 === 0) {
                  var rowOff = wfHead * WF_BINS;
                  for (var wi = 0; wi < barCount; wi++) {
                    wfGrid[rowOff + wi] = freqBuf[wi] / 255;
                  }
                  wfHead = (wfHead + 1) % WF_ROWS;
                }
                ctx.save();
                // Render subtle shimmering spectral waterfall behind bars
                if (!reduced && !hc) {
                  var rowH = (H * 0.42) / WF_ROWS;
                  for (var wr = 0; wr < WF_ROWS; wr++) {
                    var ringIdx = (wfHead - 1 - wr + WF_ROWS) % WF_ROWS;
                    var ageAlpha = (1 - wr / WF_ROWS) * 0.24;
                    var ry = wr * rowH + 2;
                    var baseIdx = ringIdx * WF_BINS;
                    for (var wb = 0; wb < barCount; wb++) {
                      var e = wfGrid[baseIdx + wb];
                      if (e > 0.06) {
                        var wHue = 295 - (wb / barCount) * 115;
                        ctx.fillStyle = 'hsla(' + wHue + ', 92%, 64%, ' + (e * ageAlpha).toFixed(3) + ')';
                        ctx.fillRect(wb * barW, ry, Math.max(2, barW - 1), Math.max(1.5, rowH - 0.5));
                      }
                    }
                  }
                }
                // Live harmonic bars + smooth gravity-decay peak-hold caps
                for (var fi = 0; fi < barCount; fi++) {
                  var val = freqBuf[fi] / 255;
                  var barH = val * H * 0.86;
                  if (barH >= peakHold[fi]) {
                    peakHold[fi] = barH;
                    peakVel[fi] = 0;
                  } else if (reduced) {
                    peakHold[fi] = barH;
                    peakVel[fi] = 0;
                  } else {
                    peakVel[fi] = Math.min(4.2, peakVel[fi] + 0.085);
                    peakHold[fi] = Math.max(0, peakHold[fi] - peakVel[fi]);
                  }
                  var hue = 295 - (fi / barCount) * 115;
                  var bx = fi * barW;
                  var bw = Math.max(2, barW - 2);
                  if (barH > 1) {
                    if (hc) {
                      ctx.fillStyle = '#00ff00';
                    } else if (typeof ctx.createLinearGradient === 'function') {
                      var bGrad = ctx.createLinearGradient(0, H - barH, 0, H);
                      bGrad.addColorStop(0, 'hsla(' + hue + ', 96%, 76%, 0.96)');
                      bGrad.addColorStop(0.45, 'hsla(' + hue + ', 86%, 58%, 0.84)');
                      bGrad.addColorStop(1, 'hsla(' + (hue + 24) + ', 75%, 34%, 0.44)');
                      ctx.fillStyle = bGrad;
                    } else {
                      ctx.fillStyle = 'hsla(' + hue + ', 80%, 55%, 0.85)';
                    }
                    ctx.fillRect(bx, H - barH, bw, barH);
                    if (!hc) {
                      ctx.fillStyle = 'hsla(' + hue + ', 100%, 88%, 0.9)';
                      ctx.fillRect(bx, H - barH - 2, bw, 3);
                    }
                  }
                  if (peakHold[fi] > 4) {
                    if (hc) {
                      ctx.fillStyle = '#ffff00';
                      ctx.fillRect(bx, H - peakHold[fi] - 4, bw, 2.5);
                    } else {
                      // Luminous peak-hold decay halo + crisp LED cap
                      ctx.fillStyle = 'hsla(' + hue + ', 100%, 78%, 0.25)';
                      ctx.fillRect(bx - 1, H - peakHold[fi] - 6, bw + 2, 6);
                      ctx.fillStyle = 'hsla(' + hue + ', 100%, 92%, 0.95)';
                      ctx.fillRect(bx, H - peakHold[fi] - 4, bw, 2);
                    }
                  }
                }
                ctx.restore();
              } else {
                // Zero-GC quadratic-smoothed CRT phosphor waveform + dual-harmonic persistence echo
                analyser.getByteTimeDomainData(timeBuf);
                var noteColor = canvasEl.dataset.noteColor || '#a855f7';
                var hasSignal = false;
                var peakAbs = 0;
                var peakIdx = Math.floor(SMOOTH_PTS * 0.5);
                var sampleStep = binCount / SMOOTH_PTS;
                for (var si = 0; si < SMOOTH_PTS; si++) {
                  var rawIdx = Math.min(binCount - 1, Math.floor(si * sampleStep));
                  var delta = Math.abs(timeBuf[rawIdx] - 128);
                  if (delta > 3) hasSignal = true;
                  var sy = (timeBuf[rawIdx] / 128.0) * (H * 0.5);
                  if (delta > peakAbs) { peakAbs = delta; peakIdx = si; }
                  if (!wavePrimed) {
                    curWaveY[si] = sy;
                    prevWaveY[si] = sy;
                    echoWaveY[si] = sy;
                  } else {
                    echoWaveY[si] = echoWaveY[si] * 0.84 + prevWaveY[si] * 0.16;
                    prevWaveY[si] = prevWaveY[si] * 0.64 + curWaveY[si] * 0.36;
                    curWaveY[si] = sy;
                  }
                }
                wavePrimed = true;

                // Subtle idle harmonic breathing shimmer when silent and animations allowed
                if (!hasSignal && !reduced && !hc) {
                  for (var sk = 0; sk < SMOOTH_PTS; sk++) {
                    var su = sk / (SMOOTH_PTS - 1);
                    var sEnv = Math.sin(su * Math.PI);
                    curWaveY[sk] = H * 0.5 + Math.sin(su * Math.PI * 4 + nowSec * 2.1) * sEnv * H * 0.04;
                  }
                }

                if (hasSignal && !hc) {
                  ctx.save();
                  ctx.shadowColor = noteColor; ctx.shadowBlur = 16;
                  ctx.strokeStyle = noteColor; ctx.lineWidth = 2;
                  ctx.globalAlpha = 0.55;
                  ctx.strokeRect(2, 2, W - 4, H - 4);
                  ctx.restore();
                }

                ctx.save();
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';

                // Translucent energy curtain between smoothed waveform and center axis
                if (!hc) {
                  drawSmoothWavePath(curWaveY, SMOOTH_PTS, W);
                  ctx.lineTo(W, H / 2);
                  ctx.lineTo(0, H / 2);
                  ctx.closePath();
                  if (typeof ctx.createLinearGradient === 'function') {
                    var fillG = ctx.createLinearGradient(0, 0, 0, H);
                    fillG.addColorStop(0, 'rgba(56,189,248,0.22)');
                    fillG.addColorStop(0.5, 'rgba(168,85,247,0.03)');
                    fillG.addColorStop(1, 'rgba(244,114,182,0.22)');
                    ctx.fillStyle = fillG;
                  } else {
                    ctx.fillStyle = 'rgba(168,85,247,0.12)';
                  }
                  ctx.fill();
                }

                // Dual-harmonic persistence echo trails (bypassed in reduced motion & high contrast)
                if (!reduced && !hc) {
                  drawSmoothWavePath(echoWaveY, SMOOTH_PTS, W);
                  ctx.strokeStyle = 'rgba(56,189,248,0.20)';
                  ctx.lineWidth = 2.2;
                  ctx.stroke();

                  drawSmoothWavePath(prevWaveY, SMOOTH_PTS, W);
                  ctx.strokeStyle = 'rgba(232,121,249,0.28)';
                  ctx.lineWidth = 2.8;
                  ctx.stroke();
                }

                // Main smoothed CRT phosphor waveform
                drawSmoothWavePath(curWaveY, SMOOTH_PTS, W);
                if (hc) {
                  ctx.strokeStyle = '#ffff00';
                  ctx.lineWidth = 2.6;
                  ctx.stroke();
                } else {
                  ctx.shadowColor = hasSignal ? noteColor : '#a855f7';
                  ctx.shadowBlur = 18;
                  ctx.strokeStyle = 'rgba(168,85,247,0.44)';
                  ctx.lineWidth = 6.2;
                  ctx.stroke();
                  ctx.shadowBlur = 8;
                  if (typeof ctx.createLinearGradient === 'function') {
                    var traceG = ctx.createLinearGradient(0, 0, W, 0);
                    traceG.addColorStop(0, '#38bdf8');
                    traceG.addColorStop(0.5, '#c084fc');
                    traceG.addColorStop(1, '#f472b6');
                    ctx.strokeStyle = traceG;
                  } else {
                    ctx.strokeStyle = '#c084fc';
                  }
                  ctx.lineWidth = 2.6;
                  ctx.stroke();
                  ctx.shadowBlur = 0;
                  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
                  ctx.lineWidth = 1;
                  ctx.stroke();
                  // Active crest energy beacon
                  if (hasSignal && peakAbs > 6) {
                    var bX = (peakIdx / (SMOOTH_PTS - 1)) * W;
                    var bY = curWaveY[peakIdx];
                    ctx.shadowColor = noteColor; ctx.shadowBlur = 12;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(bX, bY, 3.2, 0, Math.PI * 2); ctx.fill();
                  }
                }
                ctx.restore();
              }

              // Live note-trigger concentric resonance ripples (zero-GC fixed pool)
              ctx.save();
              for (var ri = 0; ri < RIPPLE_MAX; ri++) {
                if (!ripActive[ri]) continue;
                if (reduced) {
                  ripR[ri] = ripMaxR[ri] * 0.45;
                  ripAlpha[ri] -= 0.03;
                } else {
                  ripR[ri] += (ripMaxR[ri] - ripR[ri]) * 0.095 + 1.1;
                  ripAlpha[ri] *= 0.92;
                }
                if (ripAlpha[ri] <= 0.03 || ripR[ri] >= ripMaxR[ri]) {
                  ripActive[ri] = 0;
                  continue;
                }
                ctx.strokeStyle = hc ? '#00ff00' : ripColor[ri];
                ctx.globalAlpha = hc ? Math.min(0.85, ripAlpha[ri]) : ripAlpha[ri] * 0.72;
                ctx.lineWidth = hc ? 1.6 : 2.2;
                ctx.beginPath();
                musicSafeEllipse(ctx, ripX[ri], ripY[ri], ripR[ri], ripR[ri] * 0.56, 0, 0, Math.PI * 2);
                ctx.stroke();
              }
              ctx.restore();

              // Pooled note-burst particles (respecting reduced motion & high contrast)
              if (window._alloParticles && window._alloParticles.length > 0) {
                var particles = window._alloParticles;
                ctx.save();
                if (!hc) ctx.globalCompositeOperation = 'lighter';
                for (var pi = particles.length - 1; pi >= 0; pi--) {
                  var p = particles[pi];
                  if (!reduced) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; }
                  p.life -= p.decay;
                  if (p.life <= 0) { particles.splice(pi, 1); continue; }
                  ctx.fillStyle = hc ? '#ffff00' : p.color;
                  ctx.globalAlpha = p.life;
                  ctx.beginPath(); ctx.arc(p.x * 2, p.y * 2, p.size * 2, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
              }
            }
            canvasEl._synthVizAnim = requestAnimationFrame(draw);
          };

          // ═════════════════════════════════════════════════════════════
          // ═══ RETURN: UI RENDERING ═══
          // ═════════════════════════════════════════════════════════════

          // ═══ KEYBOARD CHORD SWITCHING (QAZ/WSX/EDC/RFV/TGB/YHN/UJM) ═══
          var CHORD_KEY_MAP = {
            'q': { root: 'C', type: 'Major' }, 'a': { root: 'C', type: 'Minor' }, 'z': { root: 'C', type: 'Dom7' },
            'w': { root: 'D', type: 'Major' }, 's': { root: 'D', type: 'Minor' }, 'x': { root: 'D', type: 'Dom7' },
            'e': { root: 'E', type: 'Major' }, 'd': { root: 'E', type: 'Minor' }, 'c': { root: 'E', type: 'Dom7' },
            'r': { root: 'F', type: 'Major' }, 'f': { root: 'F', type: 'Minor' }, 'v': { root: 'F', type: 'Dom7' },
            't': { root: 'G', type: 'Major' }, 'g': { root: 'G', type: 'Minor' }, 'b': { root: 'G', type: 'Dom7' },
            'y': { root: 'A', type: 'Major' }, 'h': { root: 'A', type: 'Minor' }, 'n': { root: 'A', type: 'Dom7' },
            'u': { root: 'B', type: 'Major' }, 'j': { root: 'B', type: 'Minor' }, 'm': { root: 'B', type: 'Dom7' }
          };
          React.useEffect(function () {
            if (synthTab !== 'harmonypad' && synthTab !== 'beatpad') return;
            function onKeyDown(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              if (!musicKeyInTool(e)) return;
              var k = e.key.toLowerCase();
              if (synthTab === 'harmonypad') {
                var chord = CHORD_KEY_MAP[k];
                if (chord) { upd('omniChordRoot', chord.root); upd('omniChordType', chord.type); e.preventDefault(); return; }
                if (k === ' ') { strumHarmony(d.omniChordRoot || 'C', d.omniChordType || 'Major', d.omniVoice || 'harp'); e.preventDefault(); return; }
              }
              // Beat pad keyboard triggers (number row for pads)
              if (synthTab === 'beatpad') {
                var padKeys = ['1','2','3','4','5','6','7','8','9','0','-','='];
                var pi = padKeys.indexOf(k);
                if (pi !== -1 && pi < (window._alloBeatPadSounds || []).length) {
                  var ps = (window._alloBeatPadSounds || [])[pi];
                  if (ps) playDrum(ps.type);
                  upd('beatPadActive', pi);
                  setTimeout(function () { upd('beatPadActive', -1); }, 150);
                  e.preventDefault();
                }
              }
            }
            document.addEventListener('keydown', onKeyDown);
            return function () { document.removeEventListener('keydown', onKeyDown); };
          }, [synthTab, d.omniChordRoot, d.omniChordType, d.omniVoice]);

          // ═══ WEB MIDI CONTROLLER SUPPORT ═══
          React.useEffect(function () {
            if (!navigator.requestMIDIAccess) return;
            var cleanup = [];
            navigator.requestMIDIAccess({ sysex: false }).then(function (midi) {
              upd('midiConnected', midi.inputs.size > 0);
              midi.onstatechange = function () { upd('midiConnected', midi.inputs.size > 0); };
              midi.inputs.forEach(function (input) {
                function handler(msg) {
                  var cmd = msg.data[0] & 0xf0;
                  var note = msg.data[1];
                  var vel = msg.data.length > 2 ? msg.data[2] : 0;
                  if (cmd === 0x90 && vel > 0) {
                    // Note On — play synth note
                    var nNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
                    var midiOct = Math.floor(note / 12) - 1;
                    var midiNote = nNames[note % 12];
                    var freq = 440 * Math.pow(2, (note - 69) / 12);
                    var volume = vel / 127;
                    playHarmonyTone(freq, 'midi_' + note, 2000, d.omniVoice || 'harp');
                  }
                  if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
                    // Note Off — stop note
                    if (window._alloSynthActiveNotes['midi_' + note]) {
                      var n = window._alloSynthActiveNotes['midi_' + note];
                      if (n.master) { n.master.gain.cancelScheduledValues(0); n.master.gain.linearRampToValueAtTime(0, getCtx().ctx.currentTime + 0.05); }
                      delete window._alloSynthActiveNotes['midi_' + note];
                    }
                  }
                }
                input.addEventListener('midimessage', handler);
                cleanup.push(function () { input.removeEventListener('midimessage', handler); });
              });
            }).catch(function () { /* MIDI not available */ });
            return function () { cleanup.forEach(function (fn) { fn(); }); };
          }, [d.omniVoice]);

          // ═══ SOUND ENGINE BOOST: Reverb + Compressor ═══
          function ensureSynthEffects(audio) {
            if (window._alloSynthReverbInit) return;
            if (!hasUsableAudioContext() || !audio || !audio.ctx || !audio.gain) return;
            window._alloSynthReverbInit = true;
            try {
              var ctx = audio.ctx;
              // Create DynamicsCompressor for master limiting
              if (!audio._compressor) {
                var comp = ctx.createDynamicsCompressor();
                comp.threshold.value = -12;
                comp.knee.value = 10;
                comp.ratio.value = 4;
                comp.attack.value = 0.003;
                comp.release.value = 0.15;
                // Create convolver reverb with procedural impulse response
                var reverbLen = ctx.sampleRate * 1.5;
                var impulse = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
                for (var ch = 0; ch < 2; ch++) {
                  var impData = impulse.getChannelData(ch);
                  for (var i = 0; i < reverbLen; i++) {
                    impData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
                  }
                }
                var convolver = ctx.createConvolver();
                convolver.buffer = impulse;
                var reverbGain = ctx.createGain();
                reverbGain.gain.value = 0.15; // wet mix
                var dryGain = ctx.createGain();
                dryGain.gain.value = 0.85;
                // Reroute: audio.gain → split → dry + reverb → compressor → destination
                audio.gain.disconnect();
                audio.gain.connect(dryGain);
                audio.gain.connect(convolver);
                convolver.connect(reverbGain);
                dryGain.connect(comp);
                reverbGain.connect(comp);
                comp.connect(ctx.destination);
                audio._compressor = comp;
                audio._convolver = convolver;
                audio._reverbGain = reverbGain;
              }
            } catch (e) { console.warn('[Synth] Reverb init failed:', e); }
          }

          // ═══ BEAT PAD: 16-step sequencer state & engine ═══
          var BEAT_PAD_SOUNDS = [
            { type: 'kick', label: __alloT('stem.music.kick', 'Kick'), color: '#ef4444', key: '1' },
            { type: 'snare', label: __alloT('stem.music.snare', 'Snare'), color: '#f97316', key: '2' },
            { type: 'clap', label: __alloT('stem.music.clap', 'Clap'), color: '#eab308', key: '3' },
            { type: 'rim', label: 'Rim', color: '#84cc16', key: '4' },
            { type: 'hihat', label: __alloT('stem.music.ch_hat', 'CH Hat'), color: '#22c55e', key: '5' },
            { type: 'openhat', label: __alloT('stem.music.oh_hat', 'OH Hat'), color: '#06b6d4', key: '6' },
            { type: 'cymbal', label: __alloT('stem.music.cymbal', 'Cymbal'), color: '#3b82f6', key: '7' },
            { type: 'tom1', label: __alloT('stem.music.tom_hi', 'Tom Hi'), color: '#8b5cf6', key: '8' },
            { type: 'tom2', label: __alloT('stem.music.tom_lo', 'Tom Lo'), color: '#a855f7', key: '9' },
            { type: 'cowbell', label: __alloT('stem.music.cowbell', 'Cowbell'), color: '#ec4899', key: '0' },
            { type: 'clave', label: __alloT('stem.music.clave', 'Clave'), color: '#f43f5e', key: '-' },
            { type: 'shaker', label: __alloT('stem.music.shaker', 'Shaker'), color: '#14b8a6', key: '=' }
          ];
          window._alloBeatPadSounds = BEAT_PAD_SOUNDS;

          // playDrumStyled handles kit-flavored synthesis; playDrum is the raw fallback



          // ═══ PER-CHANNEL MIXER ═══
          function getChVol(row) { var v = d.chVolumes || {}; return v[row] !== undefined ? v[row] : 0.8; }
          function isChMuted(row) {
            var solo = d.chSolo;
            if (solo !== undefined && solo >= 0 && solo !== row) return true;
            return !!(d.chMutes && d.chMutes[row]);
          }

          // ═══ EFFECTS RACK (Web Audio lazy-init) ═══
          var _bpFxRef = React.useRef(null);
          function _initBpFx() {
            if (_bpFxRef.current) return _bpFxRef.current;
            var audio = getCtx(); var ctx = audio.ctx;
            var irLen = Math.round(ctx.sampleRate * 1.5);
            var irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
            for (var ch = 0; ch < 2; ch++) { var dd = irBuf.getChannelData(ch); for (var i = 0; i < irLen; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5); }
            var conv = ctx.createConvolver(); conv.buffer = irBuf;
            var revG = ctx.createGain(); revG.gain.value = 0;
            var dryG = ctx.createGain(); dryG.gain.value = 1;
            var del = ctx.createDelay(1.0); del.delayTime.value = 0.25;
            var delFb = ctx.createGain(); delFb.gain.value = 0;
            var delW = ctx.createGain(); delW.gain.value = 0;
            var flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 20000; flt.Q.value = 1;
            var inp = ctx.createGain(); inp.gain.value = 1;
            var out = ctx.createGain(); out.gain.value = 1;
            inp.connect(flt);
            flt.connect(dryG); dryG.connect(out);
            flt.connect(conv); conv.connect(revG); revG.connect(out);
            flt.connect(del); del.connect(delW); delW.connect(out);
            del.connect(delFb); delFb.connect(del);
            out.connect(audio.gain);
            _bpFxRef.current = { inp: inp, revG: revG, dryG: dryG, del: del, delFb: delFb, delW: delW, flt: flt, out: out };
            return _bpFxRef.current;
          }
          function _getBpFxDest(audio) {
            if (!d.bpFxOn) return audio.gain;
            return _initBpFx().inp;
          }
          React.useEffect(function () {
            if (!_bpFxRef.current) return;
            var fx = _bpFxRef.current;
            var r = (d.bpReverb || 0) / 100, dl = (d.bpDelay || 0) / 100, c = d.bpFilterCut || 20000;
            fx.revG.gain.value = r * 0.6; fx.dryG.gain.value = 1 - r * 0.3;
            fx.delW.gain.value = dl * 0.5; fx.delFb.gain.value = dl * 0.4;
            fx.flt.frequency.value = c;
          }, [d.bpReverb, d.bpDelay, d.bpFilterCut]);

          // ═══ TAP TEMPO ═══
          if (!window._bpTapTimes) window._bpTapTimes = [];
          function tapTempo() {
            var now = Date.now(); var taps = window._bpTapTimes;
            if (taps.length > 0 && now - taps[taps.length - 1] > 2000) taps.length = 0;
            taps.push(now);
            if (taps.length > 1) {
              var ints = []; for (var i = 1; i < Math.min(taps.length, 5); i++) ints.push(taps[i] - taps[i - 1]);
              var avg = ints.reduce(function (a, b) { return a + b; }, 0) / ints.length;
              upd('seqBPM', safeBPM(60000 / avg));
            }
          }

          // ═══ UNDO / REDO ═══
          if (!window._bpUndoStack) window._bpUndoStack = [];
          if (!window._bpRedoStack) window._bpRedoStack = [];
          function pushBpUndo() {
            window._bpUndoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            if (window._bpUndoStack.length > 30) window._bpUndoStack.shift();
            window._bpRedoStack.length = 0;
          }
          function bpUndo() {
            if (!window._bpUndoStack.length) return;
            window._bpRedoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            var prev = window._bpUndoStack.pop();
            upd('seqGrid', prev.g); upd('beatMelody', prev.m);
          }
          function bpRedo() {
            if (!window._bpRedoStack.length) return;
            window._bpUndoStack.push({ g: JSON.parse(JSON.stringify(d.seqGrid || {})), m: (d.beatMelody || []).slice() });
            var nxt = window._bpRedoStack.pop();
            upd('seqGrid', nxt.g); upd('beatMelody', nxt.m);
          }

          // ═══ SCALE-LOCKED MELODY ═══
          var SCALE_PATTERNS = {
            'chromatic': { name: __alloT('stem.music.all_notes', 'All Notes'), intervals: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
            'major': { name: __alloT('stem.music.major', 'Major'), intervals: [0,2,4,5,7,9,11,12] },
            'minor': { name: __alloT('stem.music.minor', 'Minor'), intervals: [0,2,3,5,7,8,10,12] },
            'pentatonic': { name: __alloT('stem.music.pentatonic', 'Pentatonic'), intervals: [0,2,4,7,9,12] },
            'blues': { name: __alloT('stem.music.blues', 'Blues'), intervals: [0,3,5,6,7,10,12] },
            'dorian': { name: __alloT('stem.music.dorian', 'Dorian'), intervals: [0,2,3,5,7,9,10,12] },
            'mixolydian': { name: __alloT('stem.music.mixolydian', 'Mixolydian'), intervals: [0,2,4,5,7,9,10,12] }
          };
          var ALL_NOTE_NAMES = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5'];
          var ALL_NOTE_FREQS = [261.63,277.18,293.66,311.13,329.63,349.23,369.99,392.00,415.30,440.00,466.16,493.88,523.25];
          function getScaleNotes() {
            var sc = SCALE_PATTERNS[d.bpScale || 'major'] || SCALE_PATTERNS['major'];
            var n = [], f = [];
            sc.intervals.forEach(function (iv) { if (iv < ALL_NOTE_NAMES.length) { n.push(ALL_NOTE_NAMES[iv]); f.push(ALL_NOTE_FREQS[iv]); } });
            return { notes: n, freqs: f };
          }

          // ═══ STEP RECORDING ═══
          function stepRecHit(row) {
            if (!d.bpStepRec) return false;
            var pos = d.bpStepRecPos || 0;
            var g = Object.assign({}, d.seqGrid || {});
            g[row + '_' + pos] = 1;
            upd('seqGrid', g);
            upd('bpStepRecPos', (pos + 1) % 16);
            pushBpUndo();
            return true;
          }

          // ═══ SHARE VIA URL ═══
          function sharePattern() {
            try {
              var obj = { g: d.seqGrid || {}, m: d.beatMelody || [], b: d.seqBPM || 120, s: d.seqSwing || '0' };
              var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
              var url = location.origin + location.pathname + '#beat=' + b64;
              (window.StemLab && window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(url).then(function () { upd('bpShareFallbackUrl', ''); addToast(__alloT('stem.music.beat_url_copied', '\uD83D\uDD17 Beat URL copied!'), 'success'); })
                .catch(function () { upd('bpShareFallbackUrl', url); addToast(__alloT('stem.music.beat_url_ready_copy', '\uD83D\uDD17 Clipboard unavailable — copy the share URL below.'), 'info'); });
            } catch (e) { addToast(__alloT('stem.music.share_failed', '\u274C Share failed'), 'error'); }
          }
          React.useEffect(function () {
            try {
              var h = location.hash;
              if (!h || h.indexOf('#beat=') !== 0) return;
              var json = decodeURIComponent(escape(atob(h.substring(6))));
              var obj = JSON.parse(json);
              // Anything in the URL is untrusted input: shape-check the grid and
              // melody, and range-check the numbers, so a malformed or hand-edited
              // link cannot wedge the sequencer or persist nonsense.
              if (obj.g && typeof obj.g === 'object' && !Array.isArray(obj.g)) upd('seqGrid', obj.g);
              if (Array.isArray(obj.m)) upd('beatMelody', obj.m);
              if (obj.b != null) upd('seqBPM', safeBPM(obj.b));
              if (obj.s != null) upd('seqSwing', String(Math.round(safeSwingFraction(obj.s) * 100)));
              history.replaceState(null, '', location.pathname);
              addToast(__alloT('stem.music.loaded_shared_beat', '\uD83C\uDFB5 Loaded shared beat!'), 'success');
            } catch (e) {}
          }, []);

          // ═══ WAV EXPORT (MediaRecorder) ═══
          function exportBeat() {
            try {
              var audio = getCtx(); var ctx = audio.ctx;
              var dest = ctx.createMediaStreamDestination();
              audio.gain.connect(dest);
              var chunks = []; var mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
              var rec = new MediaRecorder(dest.stream, { mimeType: mimeType });
              rec.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data); };
              rec.onstop = function () {
                audio.gain.disconnect(dest);
                var blob = new Blob(chunks, { type: mimeType });
                var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'beat_' + new Date().toISOString().slice(0, 10) + '.webm';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                addToast(__alloT('stem.music.beat_exported', '\uD83D\uDCE5 Beat exported!'), 'success'); upd('bpExporting', false);
              };
              rec.start(); upd('bpExporting', true);
              var bpm = d.seqBPM || 120; var total = ((60000 / bpm) / 4) * 16 + 300;
              if (!d.seqPlaying) startSequencer();
              setTimeout(function () { rec.stop(); stopSequencer(); }, total);
            } catch (e) { addToast(__alloT('stem.music.export_failed', '\u274C Export failed'), 'error'); upd('bpExporting', false); }
          }

          // ═══ WAVEFORM VISUALIZER ═══
          var _bpCanvasRef = React.useRef(null);
          var _bpAnimRef = React.useRef(null);
          var _bpAnalyserRef = React.useRef(null);
          React.useEffect(function () {
            if (!d.seqPlaying) { if (_bpAnimRef.current) { cancelAnimationFrame(_bpAnimRef.current); _bpAnimRef.current = null; } return; }
            var canvas = _bpCanvasRef.current; if (!canvas) return;
            var audio = getCtx(); var ctx = audio.ctx;
            if (!_bpAnalyserRef.current) { var an = ctx.createAnalyser(); an.fftSize = 256; audio.gain.connect(an); _bpAnalyserRef.current = an; }
            var analyser = _bpAnalyserRef.current; var cctx = canvas.getContext('2d');
            if (!cctx) return;
            var w = canvas.width, h = canvas.height, buf = new Uint8Array(analyser.frequencyBinCount);
            var prevBpY = new Float32Array(buf.length);
            var bpPrimed = false;
            function draw() {
              _bpAnimRef.current = requestAnimationFrame(draw);
              analyser.getByteTimeDomainData(buf);
              var hc = musicHighContrast();
              var reduced = musicReducedMotion();
              if (hc) {
                cctx.fillStyle = '#000000'; cctx.fillRect(0, 0, w, h);
              } else if (typeof cctx.createLinearGradient === 'function') {
                var grd = cctx.createLinearGradient(0, 0, w, 0);
                grd.addColorStop(0, '#0f0b2e'); grd.addColorStop(0.5, '#1e1b4b'); grd.addColorStop(1, '#0f0b2e');
                cctx.fillStyle = grd; cctx.fillRect(0, 0, w, h);
              } else {
                cctx.fillStyle = '#130e36'; cctx.fillRect(0, 0, w, h);
              }
              // Sleek 16-step beat graticule markers + live playhead energy column
              var activeStep = (_seqStep && typeof _seqStep.current === 'number') ? (_seqStep.current % 16) : 0;
              var colW = w / 16;
              if (!hc) {
                cctx.fillStyle = activeStep % 4 === 0 ? 'rgba(244,114,182,0.18)' : 'rgba(56,189,248,0.13)';
                cctx.fillRect(activeStep * colW, 0, colW, h);
              } else {
                cctx.strokeStyle = '#00ff00'; cctx.lineWidth = 1.5;
                cctx.strokeRect(activeStep * colW + 0.5, 0.5, colW - 1, h - 1);
              }
              cctx.lineWidth = 1;
              for (var s = 1; s < 16; s++) {
                var sx = (s / 16) * w;
                cctx.strokeStyle = hc ? 'rgba(255,255,0,0.28)' : (s % 4 === 0 ? 'rgba(244,114,182,0.32)' : 'rgba(167,139,250,0.11)');
                cctx.beginPath(); cctx.moveTo(sx, 0); cctx.lineTo(sx, h); cctx.stroke();
              }
              cctx.strokeStyle = hc ? 'rgba(255,255,0,0.45)' : 'rgba(167,139,250,0.22)';
              cctx.beginPath(); cctx.moveTo(0, h / 2); cctx.lineTo(w, h / 2); cctx.stroke();
              var sw = w / Math.max(1, buf.length - 1);
              // Update persistence echo buffer (zero-GC)
              for (var bi = 0; bi < buf.length; bi++) {
                var by = (buf[bi] / 128.0) * h / 2;
                prevBpY[bi] = bpPrimed ? (prevBpY[bi] * 0.72 + by * 0.28) : by;
              }
              bpPrimed = true;
              cctx.save();
              cctx.lineCap = 'round'; cctx.lineJoin = 'round';
              // Persistence echo trail
              if (!reduced && !hc) {
                cctx.beginPath();
                cctx.moveTo(0, prevBpY[0]);
                for (var ei = 1; ei < buf.length - 1; ei++) {
                  cctx.quadraticCurveTo(ei * sw, prevBpY[ei], ((ei + 0.5) * sw), (prevBpY[ei] + prevBpY[ei + 1]) * 0.5);
                }
                cctx.lineTo(w, prevBpY[buf.length - 1]);
                cctx.strokeStyle = 'rgba(56,189,248,0.28)'; cctx.lineWidth = 2; cctx.stroke();
              }
              // Translucent glow curtain
              if (!hc) {
                cctx.beginPath(); cctx.moveTo(0, h / 2);
                for (var fi = 0; fi < buf.length; fi++) cctx.lineTo(fi * sw, (buf[fi] / 128.0) * h / 2);
                cctx.lineTo(w, h / 2); cctx.closePath();
                cctx.fillStyle = 'rgba(167,139,250,0.16)'; cctx.fill();
              }
              // Quadratic-smoothed live beat waveform
              cctx.beginPath();
              cctx.moveTo(0, (buf[0] / 128.0) * h / 2);
              for (var i = 1; i < buf.length - 1; i++) {
                var y1 = (buf[i] / 128.0) * h / 2;
                var y2 = (buf[i + 1] / 128.0) * h / 2;
                cctx.quadraticCurveTo(i * sw, y1, (i + 0.5) * sw, (y1 + y2) * 0.5);
              }
              cctx.lineTo(w, (buf[buf.length - 1] / 128.0) * h / 2);
              if (hc) {
                cctx.strokeStyle = '#ffff00'; cctx.lineWidth = 2.4; cctx.stroke();
              } else {
                var wg = typeof cctx.createLinearGradient === 'function' ? cctx.createLinearGradient(0, 0, w, 0) : null;
                if (wg && typeof wg.addColorStop === 'function') {
                  wg.addColorStop(0, '#38bdf8'); wg.addColorStop(0.5, '#f472b6'); wg.addColorStop(1, '#a78bfa');
                }
                cctx.shadowBlur = 12; cctx.shadowColor = '#c084fc';
                cctx.strokeStyle = wg || '#c084fc'; cctx.lineWidth = 3.8; cctx.globalAlpha = 0.45; cctx.stroke();
                cctx.globalAlpha = 1; cctx.lineWidth = 2; cctx.stroke();
                cctx.shadowBlur = 0; cctx.strokeStyle = 'rgba(255,255,255,0.72)'; cctx.lineWidth = 0.85; cctx.stroke();
              }
              cctx.restore();
            }
            draw();
            return function () { if (_bpAnimRef.current) cancelAnimationFrame(_bpAnimRef.current); };
          }, [d.seqPlaying, synthTab]);

          // ═══ RHYTHM EXERCISES ═══
          var RHYTHM_CHALLENGES = [
            { name: __alloT('stem.music.rock_beat', 'Rock Beat'), pattern: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], desc: __alloT('stem.music.quarter_notes_on_the_beat', 'Quarter notes on the beat') },
            { name: __alloT('stem.music.backbeat', 'Backbeat'), pattern: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], desc: __alloT('stem.music.snare_on_2_and_4', 'Snare on 2 and 4') },
            { name: __alloT('stem.music.syncopation', 'Syncopation'), pattern: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], desc: __alloT('stem.music.off_beat_accents', 'Off-beat accents') },
            { name: __alloT('stem.music.16th_notes', '16th Notes'), pattern: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], desc: __alloT('stem.music.every_subdivision', 'Every subdivision') },
            { name: __alloT('stem.music.swing_feel', 'Swing Feel'), pattern: [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0], desc: __alloT('stem.music.triplet_style_groove', 'Triplet-style groove') },
            { name: __alloT('stem.music.reggae_one_drop', 'Reggae One-Drop'), pattern: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], desc: __alloT('stem.music.accent_only_on_beat_3', 'Accent only on beat 3') }
          ];
          function genRandomRhythm() {
            var p = new Array(16).fill(0);
            for (var i = 0; i < 16; i++) { if (Math.random() < (i % 4 === 0 ? 0.7 : 0.3)) p[i] = 1; }
            return { name: 'Random #' + Math.floor(Math.random() * 100), pattern: p, desc: __alloT('stem.music.try_to_match_this_pattern', 'Try to match this pattern!') };
          }

          // ═══ SEQUENCER ENGINE (setTimeout chain for swing support) ═══
          var _seqTimer = React.useRef(null);
          var _seqStep = React.useRef(0);
          var _seqTickRef = React.useRef(null);
          // Shared tick function — reads d (grid, melody, BPM, swing) fresh each render
          function _seqTick() {
            var bpm = safeBPM(d.seqBPM);
            var baseMs = (60000 / bpm) / 4; // 16th note base
            var swingPct = safeSwingFraction(d.seqSwing);
            var step = _seqStep.current;
            // Play drum grid
            var grid = d.seqGrid || {};
            BEAT_PAD_SOUNDS.forEach(function (sound, row) {
              if (grid[row + '_' + step]) {
                playSample(sound.type, row);
              }
            });
            // Play melody note (scale-aware)
            var mel = d.beatMelody || [];
            var _scD = getScaleNotes();
            var ni = mel[step];
            if (ni > 0 && ni <= _scD.freqs.length) {
              playNoteFor(_scD.freqs[ni - 1], 'bpmel_' + step, baseMs * 0.8);
            }
            upd('seqCurrentStep', step);
            _seqStep.current = (step + 1) % 16;
            // Schedule next tick with swing: odd steps get delayed, even steps get shortened
            var isSwungStep = step % 2 === 1;
            var nextDelay = isSwungStep ? baseMs * (1 + swingPct) : baseMs * (1 - swingPct);
            // Guard against NaN as well as too-small: NaN < 10 is false, so the old
            // floor let a NaN delay through and setTimeout treated it as zero.
            if (!isFinite(nextDelay) || nextDelay < 10) nextDelay = 10;
            // Use ref indirection so the chain always calls the latest render's tick
            _seqTimer.current = setTimeout(function() { if (_seqTickRef.current) _seqTickRef.current(); }, nextDelay);
          }
          // Keep ref pointing to latest render's _seqTick
          _seqTickRef.current = _seqTick;
          function startSequencer() {
            if (_seqTimer.current) return;
            _seqStep.current = 0;
            _seqTick(); // fire first tick immediately, it schedules the chain
            upd('seqPlaying', true);
          }
          function stopSequencer() {
            if (_seqTimer.current) { clearTimeout(_seqTimer.current); _seqTimer.current = null; }
            upd('seqPlaying', false);
            upd('seqCurrentStep', -1);
          }
          // Clean up on unmount — stop the metronome + arpeggiator intervals too (previously only
          // the sequencer was stopped, so those setInterval loops leaked when leaving mid-play).
          React.useEffect(function () { return function () { stopSequencer(); stopMetronome(); stopArpeggiator(); stopRhythm(); stopAllNotes(); }; }, []);
          // Restart the metronome when tempo or time signature changes while it runs —
          // startMetronome captures both in its interval closure.
          React.useEffect(function () {
            if (d.metroOn && window._alloMetronomeInterval) {
              clearInterval(window._alloMetronomeInterval);
              window._alloMetronomeInterval = null;
              startMetronome();
            }
          }, [d.seqBPM, d.timeSig]);

          // Restart sequencer when BPM changes while playing (preserves step position)
          React.useEffect(function () {
            if (d.seqPlaying && _seqTimer.current) {
              clearTimeout(_seqTimer.current);
              _seqTimer.current = null;
              // Re-schedule from current step (don't reset to 0)
              _seqTick();
            }
          }, [d.seqBPM]);

          // ═══ EDM PRESET PATTERNS ═══
          var SEQ_PRESETS = {
            'four_on_floor': { name: '4-on-the-Floor', grid: {'0_0':1,'0_4':1,'0_8':1,'0_12':1,'1_4':1,'1_12':1,'4_0':1,'4_2':1,'4_4':1,'4_6':1,'4_8':1,'4_10':1,'4_12':1,'4_14':1} },
            'breakbeat': { name: __alloT('stem.music.breakbeat', 'Breakbeat'), grid: {'0_0':1,'0_6':1,'0_10':1,'1_4':1,'1_12':1,'4_0':1,'4_4':1,'4_8':1,'4_12':1,'4_2':1,'4_10':1} },
            'trap_hats': { name: __alloT('stem.music.trap_hi_hats', 'Trap Hi-Hats'), grid: {'0_0':1,'0_8':1,'1_4':1,'1_12':1,'4_0':1,'4_1':1,'4_2':1,'4_3':1,'4_4':1,'4_5':1,'4_6':1,'4_7':1,'4_8':1,'4_9':1,'4_10':1,'4_11':1,'4_12':1,'4_13':1,'4_14':1,'4_15':1,'5_2':1,'5_6':1,'5_10':1,'5_14':1} },
            'house': { name: __alloT('stem.music.house', 'House'), grid: {'0_0':1,'0_4':1,'0_8':1,'0_12':1,'1_4':1,'1_12':1,'4_0':1,'4_2':1,'4_4':1,'4_6':1,'4_8':1,'4_10':1,'4_12':1,'4_14':1,'5_2':1,'5_6':1,'5_10':1,'5_14':1,'2_2':1,'2_14':1} },
            'reggaeton': { name: __alloT('stem.music.reggaeton', 'Reggaeton'), grid: {'0_0':1,'0_6':1,'0_12':1,'1_3':1,'1_7':1,'1_11':1,'1_15':1,'4_0':1,'4_4':1,'4_8':1,'4_12':1} },
          };

          // ═══ CDN SAMPLE LOADER (lazy-loads on first Beat Pad open) ═══
          var SAMPLE_CDN = 'https://tonejs.github.io/audio/drum-samples/';
          var SAMPLE_KITS = {
            'CR78': { name: __alloT('stem.music.cr_78_vintage', 'CR-78 Vintage'), icon: '\uD83C\uDFDB\uFE0F',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 1.4, pitchShift: -0.1, filterFreq: 3000, gainMul: 0.7, character: 'vintage' } },
            'acoustic-kit': { name: __alloT('stem.music.acoustic_kit', 'Acoustic Kit'), icon: '\uD83E\uDD41',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 1.0, pitchShift: 0, filterFreq: 6000, gainMul: 0.8, character: 'acoustic' } },
            'Techno': { name: __alloT('stem.music.techno_edm', 'Techno EDM'), icon: '\u26A1',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 0.6, pitchShift: 0.15, filterFreq: 9000, gainMul: 0.9, character: 'techno' } },
            'LINN': { name: 'LinnDrum', icon: '\uD83D\uDD0A',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 0.8, pitchShift: 0.05, filterFreq: 7000, gainMul: 0.85, character: 'linn' } },
            '4OP-FM': { name: __alloT('stem.music.fm_synthesis', 'FM Synthesis'), icon: '\uD83C\uDF1F',
              files: { kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3', openhat: 'hihat.mp3', tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3', clap: 'snare.mp3', rim: 'snare.mp3' },
              synthStyle: { decayMul: 0.7, pitchShift: 0.3, filterFreq: 10000, gainMul: 0.8, character: 'fm' } }
          };
          // Sample cache: { kitName: { soundType: AudioBuffer } }
          if (!window._alloSampleCache) window._alloSampleCache = {};
          if (!window._alloUserSamples) window._alloUserSamples = [];
          function loadSampleKit(kitName) {
            if (window._alloSampleCache[kitName]) { upd('samplesLoaded', kitName); return; }
            var kit = SAMPLE_KITS[kitName]; if (!kit) return;
            upd('samplesLoading', true);
            var audio = getCtx(); var ctx = audio.ctx;
            var loaded = {}; var total = Object.keys(kit.files).length; var count = 0;
            // Track per-fetch AbortControllers — each download times out after 30s instead of
            // hanging indefinitely on a slow CDN, and the kit load can be cancelled if needed.
            var abortControllers = [];
            Object.keys(kit.files).forEach(function (type) {
              var url = SAMPLE_CDN + kitName + '/' + kit.files[type];
              var controller = new AbortController();
              var timeoutId = setTimeout(function() { controller.abort(); }, 30000);
              abortControllers.push(controller);
              fetch(url, { signal: controller.signal }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(function (buf) {
                return ctx.decodeAudioData(buf);
              }).then(function (decoded) {
                clearTimeout(timeoutId);
                loaded[type] = decoded; count++;
                if (count >= total) {
                  window._alloSampleCache[kitName] = loaded;
                  upd('samplesLoading', false); upd('samplesLoaded', kitName);
                  upd('activeKit', kitName);
                }
              }).catch(function (e) {
                clearTimeout(timeoutId);
                console.warn('[Beat Pad] Failed to load sample:', url, e);
                count++;
                if (count >= total) {
                  upd('samplesLoading', false);
                  if (Object.keys(loaded).length === 0) {
                    addToast(__alloFmt('stem.music.toast_kit_failed', '\u26a0\ufe0f Sample kit "{name}" failed to load \u2014 using synthesized drums instead', { name: kitName }), 'warning');
                    upd('sampleLoadError', kitName);
                  } else {
                    window._alloSampleCache[kitName] = loaded;
                    upd('samplesLoaded', kitName); upd('activeKit', kitName);
                    addToast(__alloFmt('stem.music.toast_kit_partial', '\u26a0\ufe0f Some samples from "{name}" failed \u2014 missing sounds will use synthesis', { name: kitName }), 'info');
                  }
                }
              });
            });
            window._alloSampleAbortControllers = window._alloSampleAbortControllers || {};
            window._alloSampleAbortControllers[kitName] = abortControllers;
          }
          // Play sample from loaded kit, fall back to synth
          function playSample(type, row) {
            if (row !== undefined && isChMuted(row)) return;
            var vol = (row !== undefined) ? getChVol(row) : 0.8;
            var kit = d.activeKit || '';
            var kitDef = SAMPLE_KITS[kit];
            var cache = window._alloSampleCache[kit];
            if (cache && cache[type]) {
              var audio = getCtx(); var ctx = audio.ctx;
              var source = ctx.createBufferSource();
              source.buffer = cache[type];
              var g = ctx.createGain();
              var dest = _getBpFxDest(audio);
              // Creative re-mappings: openhat = hihat with longer envelope
              if (type === 'openhat') {
                g.gain.setValueAtTime(vol, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              } else if (type === 'clap') {
                // Clap re-maps from snare — pitch up slightly, short burst
                source.playbackRate.value = 1.3;
                g.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
              } else if (type === 'rim') {
                // Rim re-maps from snare — pitch way up, very short
                source.playbackRate.value = 1.8;
                g.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
              } else {
                g.gain.value = vol;
              }
              source.connect(g);
              g.connect(dest);
              source.start(0);
              return;
            }
            // Fall back to synthesis with kit style applied
            var style = (kitDef && kitDef.synthStyle) ? kitDef.synthStyle : null;
            playDrumStyled(type, style, vol);
          }
          // Play user-uploaded sample by index
          function playUserSample(idx) {
            var samples = window._alloUserSamples || [];
            if (!samples[idx]) return;
            var audio = getCtx(); var ctx = audio.ctx;
            var source = ctx.createBufferSource();
            source.buffer = samples[idx].buffer;
            var g = ctx.createGain(); g.gain.value = 0.8;
            source.connect(g); g.connect(audio.gain);
            source.start(0);
          }
          var melodySeqBP = d.beatMelody || new Array(16).fill(0);
          // Load default kit on first beatpad visit
          React.useEffect(function () {
            if (synthTab === 'beatpad' && !d.activeKit && !d.samplesLoading) {
              loadSampleKit('CR78');
            }
          }, [synthTab, d.activeKit, d.samplesLoading]);
          // Keyboard shortcuts for drum pads (number row)
          React.useEffect(function () {
            function handlePadKey(e) {
              if (synthTab !== 'beatpad') return;
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              if (!musicKeyInTool(e)) return;
              var padMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11 };
              var idx = padMap[e.key];
              if (idx !== undefined && BEAT_PAD_SOUNDS[idx]) {
                e.preventDefault();
                playSample(BEAT_PAD_SOUNDS[idx].type, idx); stepRecHit(idx);
                upd('padHit_' + idx, true);
                setTimeout(function () { upd('padHit_' + idx, false); }, 120);
              }
            }
            window.addEventListener('keydown', handlePadKey);
            return function () { window.removeEventListener('keydown', handlePadKey); };
          }, [synthTab, d.activeKit]);
          return React.createElement("div", { className: "allo-music-tool max-w-6xl mx-auto animate-in fade-in duration-200", 'data-allo-theme': isDark ? 'dark' : 'light' },
            // ── Header ──
            React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-3", style: { minWidth: 0 } },
              React.createElement("button", { onClick: function () { setStemLabTool(null); stopSequencer(); stopMetronome(); stopArpeggiator(); stopRhythm(); stopAllNotes(); }, className: "mus-back-btn p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': __alloT('stem.music.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),
              React.createElement("h3", { className: "text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r " + (isDark ? "from-purple-400 to-pink-400" : "from-purple-700 to-pink-700") }, __alloT('stem.music.music_synthesizer', "\uD83C\uDFB9 Music Synthesizer")),
              React.createElement("span", { className: "px-2 py-0.5 bg-purple-100 text-purple-700 text-[0.6875rem] font-bold rounded-full" },
                synthEngine === 'supersaw' ? '\u26A1 SUPERSAW' : synthEngine === 'fm' ? '\uD83C\uDF1F FM' : synthEngine === 'sub' ? '\uD83C\uDF0A SUB' : synthEngine === 'pad' ? '\u2601\uFE0F PAD' : synthEngine === 'plucked' ? '\uD83C\uDFB8 PLUCKED' : '\u223F ' + (["sine","square","sawtooth","triangle"].indexOf(d.waveType) !== -1 ? d.waveType : 'sine').toUpperCase()
              ),
              d.activePreset && React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 text-amber-700 text-[0.6875rem] font-bold rounded-full" }, "\u2B50 " + d.activePreset),
              // Tab selector
              React.createElement("div", { role: "tablist", "aria-label": __alloT('stem.music.synth_sections', "Synth sections"), className: "flex flex-wrap gap-0.5 ml-auto bg-slate-100 rounded-lg p-0.5" },
                [{ id: 'play', icon: '\uD83C\uDFB9', label: __alloT('stem.synth.play', 'Play') }, { id: 'scales', icon: '\uD83C\uDFB5', label: __alloT('stem.synth.scales', 'Scales') }, { id: 'chords', icon: '\uD83C\uDFB6', label: __alloT('stem.synth.chords', 'Chords') }, { id: 'harmonypad', icon: '\uD83C\uDF1F', label: __alloT('stem.synth.harmonypad', 'HarmonyPad') }, { id: 'beatpad', icon: '\uD83E\uDD41', label: __alloT('stem.synth.beatpad', 'Beat Pad') }, { id: 'theory', icon: '\uD83D\uDCDA', label: __alloT('stem.synth.theory', 'Theory') }, { id: 'timbreHunt', icon: '\u2696\uFE0F', label: __alloT('stem.music.timbre', 'Timbre') }].map(function (tab) {
                  return React.createElement("button", { key: tab.id, role: "tab", "aria-selected": synthTab === tab.id,
                    onClick: function () { upd('synthTab', tab.id); },
                    className: "mus-tab-btn px-2.5 py-1 rounded-md text-[0.6875rem] font-bold transition-all " + (synthTab === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-700')
                  }, tab.icon + " " + tab.label);
                })
              )
            ),

            (function () {
              var activeWaveLabel = synthEngine === 'standard' ? (["sine","square","sawtooth","triangle"].indexOf(d.waveType) !== -1 ? d.waveType : 'sine') : synthEngine;
              var activeStageIdx = synthTab === 'play' ? 0 : (synthTab === 'scales' || synthTab === 'chords' ? 1 : (synthTab === 'harmonypad' || synthTab === 'beatpad' ? 2 : 3));
              var filterHzLabel = Math.round(typeof d.filterCutoff === 'number' && isFinite(d.filterCutoff) ? d.filterCutoff : 8000) + ' Hz';
              var starterSessions = [
                { id: 'warm_pad', label: __alloT('stem.music.starter_warm_pad', 'Ambient Pad Studio'), active: synthTab === 'play' && synthEngine === 'pad', run: function () { var p = EDM_PRESETS.find(function (x) { return x.id === 'warm_pad'; }); if (p) applyPreset(p); upd('synthTab', 'play'); } },
                { id: 'dorian_scale', label: __alloT('stem.music.starter_scale_lab', 'Dorian Scale Explorer'), active: synthTab === 'scales' && selectedScale === 'Dorian', run: function () { upd('selectedRoot', 'D'); upd('selectedScale', 'Dorian'); upd('scaleLock', true); upd('synthTab', 'scales'); } },
                { id: 'chord_voicing', label: __alloT('stem.music.starter_chord_lab', 'Harmony & Chords'), active: synthTab === 'harmonypad', run: function () { upd('selectedRoot', 'C'); upd('synthTab', 'harmonypad'); } },
                { id: 'beat_120', label: __alloT('stem.music.starter_beat_lab', '120 BPM Beat Lab'), active: synthTab === 'beatpad' && tempoBPM === 120, run: function () { upd('seqBPM', 120); upd('timeSig', '4/4'); upd('synthTab', 'beatpad'); } }
              ];
              return React.createElement("section", { "data-music-command": "true", "aria-label": __alloT('stem.music.music_synth_studio_command_deck', "Music Synth studio command deck"), className: "mus-studio-hero mb-3" },
                React.createElement("div", { className: "grid gap-3 lg:grid-cols-[minmax(250px,1.05fr)_minmax(0,1.45fr)]", style: { minWidth: 0 } },
                  React.createElement("div", { className: "rounded-xl border border-white/15 bg-white/10 p-3 text-white", style: { minWidth: 0 } },
                    React.createElement("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 } },
                      React.createElement("div", { className: "mus-emblem-box", "aria-hidden": "true" },
                        React.createElement("svg", { width: 32, height: 32, viewBox: "0 0 36 36", fill: "none" },
                          React.createElement("rect", { x: 4, y: 21, width: 5, height: 11, rx: 1.5, fill: "#f5d0fe", opacity: 0.92 }),
                          React.createElement("rect", { x: 11, y: 21, width: 5, height: 11, rx: 1.5, fill: "#e879f9", opacity: 0.92 }),
                          React.createElement("rect", { x: 18, y: 21, width: 5, height: 11, rx: 1.5, fill: "#c084fc", opacity: 0.92 }),
                          React.createElement("rect", { x: 25, y: 21, width: 5, height: 11, rx: 1.5, fill: "#a855f7", opacity: 0.92 }),
                          React.createElement("path", { d: "M4 13 Q 9 5, 14 13 T 24 13 T 32 13", stroke: "#38bdf8", strokeWidth: 2.5, strokeLinecap: "round", fill: "none" }),
                          React.createElement("circle", { cx: 14, cy: 13, r: 2.4, fill: "#fde047" }),
                          React.createElement("circle", { cx: 24, cy: 13, r: 2.4, fill: "#38bdf8" })
                        )
                      ),
                      React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                        React.createElement("span", { className: "mus-subject-badge" }, __alloT('stem.music.subject_badge', 'Acoustic Synthesis & Music Theory')),
                        React.createElement("div", { className: "mt-1 text-lg font-black leading-tight text-white" }, __alloT('stem.music.hero_headline', "Pick a sound task, then play.")),
                        React.createElement("p", { className: "mt-1 text-xs leading-relaxed text-purple-100" }, __alloT('stem.music.hero_subcopy', "Shape a synthesized tone, explore scales and chords, layer harmonies, or build beats with live waveform feedback."))
                      )
                    ),
                    React.createElement("div", { className: "mus-telemetry-strip", role: "group", "aria-label": __alloT('stem.music.telemetry_label', 'Live synthesizer status') },
                      React.createElement("span", { className: "mus-telemetry-pill" }, __alloFmt('stem.music.pill_engine', 'Engine: {v}', { v: activeWaveLabel.toUpperCase() })),
                      React.createElement("span", { className: "mus-telemetry-pill" }, __alloFmt('stem.music.pill_key', 'Key: {k}{o}', { k: selectedRoot, o: safeOctave })),
                      React.createElement("span", { className: "mus-telemetry-pill" }, __alloFmt('stem.music.pill_tempo', '{bpm} BPM · {sig}', { bpm: tempoBPM, sig: timeSig })),
                      React.createElement("span", { className: "mus-telemetry-pill" }, __alloFmt('stem.music.pill_view', 'Scope: {v}', { v: showFFT ? 'FFT' : vizMode.toUpperCase() }))
                    ),
                    React.createElement("div", { className: "mus-signal-strip" },
                      React.createElement("svg", {
                        viewBox: "0 0 580 58",
                        style: { width: '100%', height: 'auto', maxHeight: 62, display: 'block' },
                        role: "img",
                        "aria-label": __alloT('stem.music.signal_chain_aria', 'Synthesizer signal flow from oscillator through envelope and filter to acoustic output')
                      },
                        React.createElement("line", { x1: 122, y1: 29, x2: 158, y2: 29, stroke: "#c084fc", strokeWidth: 2, strokeDasharray: "4 3" }),
                        React.createElement("line", { x1: 268, y1: 29, x2: 304, y2: 29, stroke: "#c084fc", strokeWidth: 2, strokeDasharray: "4 3" }),
                        React.createElement("line", { x1: 414, y1: 29, x2: 450, y2: 29, stroke: "#c084fc", strokeWidth: 2, strokeDasharray: "4 3" }),
                        [
                          { x: 10, w: 112, tag: __alloT('stem.music.chain_osc', '1. OSC'), val: activeWaveLabel.slice(0, 10).toUpperCase(), active: activeStageIdx === 0 },
                          { x: 158, w: 110, tag: __alloT('stem.music.chain_pitch', '2. SCALE'), val: selectedRoot + ' ' + selectedScale.slice(0, 7), active: activeStageIdx === 1 },
                          { x: 304, w: 110, tag: __alloT('stem.music.chain_filter', '3. FILTER'), val: filterHzLabel, active: activeStageIdx === 2 },
                          { x: 450, w: 120, tag: __alloT('stem.music.chain_output', '4. OUTPUT'), val: showFFT ? 'FFT SPEC' : vizMode.toUpperCase(), active: activeStageIdx === 3 }
                        ].map(function (stNode) {
                          return React.createElement("g", { key: stNode.x },
                            React.createElement("rect", {
                              x: stNode.x, y: 7, width: stNode.w, height: 44, rx: 9,
                              fill: stNode.active ? 'rgba(168,85,247,0.34)' : 'rgba(15,10,34,0.85)',
                              stroke: stNode.active ? '#f0abfc' : 'rgba(192,132,252,0.42)',
                              strokeWidth: stNode.active ? 2 : 1.2
                            }),
                            React.createElement("text", { x: stNode.x + stNode.w / 2, y: 24, textAnchor: "middle", fill: "#f5d0fe", fontSize: 10.5, fontWeight: 800, fontFamily: "system-ui, sans-serif" }, stNode.tag),
                            React.createElement("text", { x: stNode.x + stNode.w / 2, y: 41, textAnchor: "middle", fill: "#ffffff", fontSize: 11, fontWeight: 700, fontFamily: "system-ui, sans-serif" }, stNode.val)
                          );
                        })
                      )
                    )
                  ),
                  React.createElement("div", { className: "flex flex-col gap-2", style: { minWidth: 0 } },
                    React.createElement("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-4", style: { minWidth: 0 } },
                      [
                        { id: 'play', title: __alloT('stem.music.shape_a_tone', 'Shape a tone'), body: __alloT('stem.music.route_play_body', 'Presets, engines, keyboard, envelopes, and effects.'), tone: 'border-purple-300 text-purple-100' },
                        { id: 'scales', title: __alloT('stem.music.learn_a_scale', 'Learn a scale'), body: __alloT('stem.music.route_scales_body', 'Hear step patterns and lock the keyboard to a mode.'), tone: 'border-cyan-300 text-cyan-100' },
                        { id: 'harmonypad', title: __alloT('stem.music.build_harmony', 'Build harmony'), body: __alloT('stem.music.route_harmony_body', 'Layer drones, pads, and chord movement.'), tone: 'border-emerald-300 text-emerald-100' },
                        { id: 'beatpad', title: __alloT('stem.music.make_a_beat', 'Make a beat'), body: __alloT('stem.music.route_beat_body', 'Trigger drum sounds and route into production.'), tone: 'border-rose-300 text-rose-100' }
                      ].map(function(route) {
                        var active = synthTab === route.id;
                        return React.createElement("button", { key: route.id, 'aria-pressed': active, onClick: function() { upd('synthTab', route.id); },
                          className: "min-h-[108px] rounded-xl border bg-white/10 p-3 text-left transition-all hover:bg-white/15 active:scale-[0.98] " + route.tone + (active ? " ring-2 ring-white/80" : "") },
                          React.createElement("div", { className: "text-sm font-black" }, route.title),
                          React.createElement("div", { className: "mt-1 text-[0.6875rem] leading-relaxed text-purple-100" }, route.body),
                          React.createElement("div", { className: "mt-2 text-[0.6875rem] font-black" }, active ? __alloT('stem.music.open_now', "Open now") : __alloT('stem.music.open_action', "Open"))
                        );
                      })
                    ),
                    (!isMusicAssess && !isStudioLocked) && React.createElement("div", { className: "mus-starter-bar", role: "group", "aria-label": __alloT('stem.music.quick_starters_aria', 'Quick studio workflow starters') },
                      React.createElement("span", { className: "mus-starter-label" }, __alloT('stem.music.quick_starters_label', 'Quick Starters:')),
                      starterSessions.map(function (stItem) {
                        return React.createElement("button", {
                          key: stItem.id,
                          type: "button",
                          className: "mus-starter-chip",
                          "data-active": stItem.active ? "true" : "false",
                          "aria-pressed": stItem.active ? "true" : "false",
                          onClick: stItem.run
                        }, stItem.label);
                      })
                    )
                  )
                )
              );
            })(),

            // ── EDM Preset Bar ──
            React.createElement("div", { className: "flex gap-1 mb-3 overflow-x-auto pb-1 bg-gradient-to-r from-slate-900 to-purple-900 rounded-xl p-2 border border-purple-500/30" },
              React.createElement("span", { className: "text-[0.6875rem] font-bold text-purple-200 uppercase tracking-wider self-center px-1 shrink-0" }, __alloT('stem.music.presets_heading', "PRESETS")),
              EDM_PRESETS.map(function(preset) {
                var isActive = d.activePreset === preset.name;
                return React.createElement("button", { key: preset.id, title: preset.desc,
                  'aria-pressed': isActive,
                  onClick: function() { applyPreset(preset); },
                  className: "shrink-0 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all " + (isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105' : 'bg-white/10 text-purple-200 hover:bg-white/20 hover:text-white')
                }, preset.icon + ' ' + preset.name);
              }),
              // Engine selector
              React.createElement("div", { className: "shrink-0 ml-auto flex gap-1 items-center border-l border-purple-500/30 pl-2" },
                React.createElement("span", { className: "text-[0.6875rem] text-purple-200 font-bold" }, __alloT('stem.music.engine_heading', "ENGINE:")),
                [{ id: 'standard', label: __alloT('stem.music.wave', '\u223F Wave') }, { id: 'supersaw', label: __alloT('stem.music.super', '\u26A1 Super') }, { id: 'fm', label: __alloT('stem.music.fm', '\uD83C\uDF1F FM') }, { id: 'sub', label: __alloT('stem.music.sub', '\uD83C\uDF0A Sub') }, { id: 'pad', label: __alloT('stem.music.pad', '\u2601 Pad') }, { id: 'plucked', label: __alloT('stem.music.pluck_2', '\uD83C\uDFB8 Pluck') }].map(function(eng) {
                  return React.createElement("button", { key: eng.id,
                    'aria-pressed': (['standard','fm','pad','plucked','sub','supersaw'].indexOf(d.synthEngine) !== -1 ? d.synthEngine : 'standard') === eng.id,
                    onClick: function() { upd('synthEngine', eng.id); upd('activePreset', null); },
                    className: "px-1.5 py-0.5 rounded text-[0.6875rem] font-bold transition-all " + ((['standard','fm','pad','plucked','sub','supersaw'].indexOf(d.synthEngine) !== -1 ? d.synthEngine : 'standard') === eng.id ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white hover:bg-purple-500/30')
                  }, eng.label);
                })
              )
            ),

            // ── Oscilloscope ──
            React.createElement("div", { className: "rounded-xl overflow-hidden border-2 border-purple-300/60 bg-[#0f0a1e] mb-3 shadow-md" },
              React.createElement("div", { className: "relative", style: { height: '120px' } },
                React.createElement("canvas", { role: "img", tabIndex: 0, "aria-label": __alloFmt('stem.music.aria_visualizer', 'Live audio visualizer showing the synth output as a {mode}', { mode: showFFT ? __alloT('stem.music.aria_freq_spectrum', 'frequency spectrum') : __alloT('stem.music.aria_waveform', 'waveform') }) + ".", ref: canvasRef, "data-show-fft": showFFT ? 'true' : 'false', "data-viz-mode": vizMode, "data-note-color": d.lastNoteColor || '#a855f7', style: { width: '100%', height: '100%', display: 'block' } }),
                // Note display
                d.lastNote && React.createElement("div", { className: "absolute top-2 left-2 px-2 py-0.5 bg-slate-950/85 border border-purple-400/50 rounded text-white text-xs font-bold" }, "\u266A " + d.lastNote + (d.lastFreq ? " (" + Math.round(d.lastFreq) + " Hz)" : "")),
                // Viz mode selector
                React.createElement("div", { className: "absolute top-2 right-2 flex gap-1" },
                  [{ id: 'waveform', label: '\u223F', name: __alloT('stem.music.viz_waveform', 'Waveform view') },
                   { id: 'lissajous', label: '\u221E', name: __alloT('stem.music.viz_lissajous', 'Lissajous view') },
                   { id: 'helix', label: '\uD83C\uDF00', name: __alloT('stem.music.viz_helix', 'Helix view') }].map(function (v) {
                    return React.createElement("button", {
                      'aria-label': v.name,
                      'aria-pressed': vizMode === v.id ? 'true' : 'false',
                      key: v.id,
                      onClick: function () { upd('vizMode', v.id); },
                      className: "min-w-[30px] h-7 px-1.5 rounded text-xs font-bold flex items-center justify-center transition-all border " + (vizMode === v.id ? 'bg-purple-600 text-white border-purple-300' : 'bg-slate-900/85 text-purple-100 border-purple-400/35 hover:bg-purple-800/70')
                    }, v.label);
                  }),
                  React.createElement("button", {
                    'aria-label': __alloT('stem.music.toggle_frequency_spectrum_2', "Toggle frequency spectrum"),
                    'aria-pressed': showFFT ? 'true' : 'false',
                    onClick: function () { upd('showFFT', !showFFT); },
                    className: "min-w-[36px] h-7 px-1.5 rounded text-[0.6875rem] font-bold flex items-center justify-center transition-all border " + (showFFT ? 'bg-emerald-700 text-white border-emerald-300' : 'bg-slate-900/85 text-purple-100 border-purple-400/35 hover:bg-purple-800/70')
                  }, "FFT")
                )
              ),
              React.createElement("div", { className: "mus-viz-legend" },
                React.createElement("span", null, showFFT ? __alloT('stem.music.viz_legend_fft', 'Frequency Spectrum (Hz) — harmonic energy bars') : __alloT('stem.music.viz_legend_wave', 'Oscilloscope — real-time acoustic amplitude & phase')),
                React.createElement("span", null, d.lastNote ? __alloFmt('stem.music.viz_last_note', 'Last Note: {n}', { n: d.lastNote }) : __alloT('stem.music.viz_ready_hint', 'Play a key or pad to visualize sound waves'))
              )
            ),

            // ── Topic-accent hero band per synth tab ──
            (function() {
              var TAB_META = {
                play:       { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83C\uDFB9', title: __alloT('stem.music.play_piano_keys_presets', 'Play \u2014 piano keys + presets'),                 hint: __alloT('stem.music.equal_temperament_12_notes_per_octave_', 'Equal temperament: 12 notes per octave, ratio 2^(1/12). A4 = 440 Hz; A5 = 880 Hz. Bach\u2019s Well-Tempered Clavier (1722) sold the world on this compromise. Every note you play here lives on that grid.') },
                scales:     { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83C\uDFB5', title: __alloT('stem.music.scales_the_major_minor_modal_grammar', 'Scales \u2014 the major + minor + modal grammar'), hint: __alloT('stem.music.major_w_w_h_w_w_w_h_minor_w_h_w_w_h_w_', 'Major: W-W-H-W-W-W-H. Minor: W-H-W-W-H-W-W. The 7 modes (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian) come from rotating the major-scale interval pattern.') },
                chords:     { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFB6', title: __alloT('stem.music.chords_stacked_thirds_inversions', 'Chords \u2014 stacked thirds + inversions'),         hint: __alloT('stem.music.triads_root_third_fifth_major_4_3_semi', 'Triads: root + third + fifth. Major (4+3 semitones), minor (3+4), diminished (3+3), augmented (4+4). 7th chords add another third. Pop music = ~6 chords on repeat; jazz uses extensions and substitutions.') },
                harmonypad: { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83C\uDF1F', title: __alloT('stem.music.harmony_pad_voiced_pads_drones', 'Harmony Pad \u2014 voiced pads + drones'),          hint: __alloT('stem.music.sustained_chord_textures_the_bed_under', 'Sustained chord textures \u2014 the bed under almost every cinematic score. Try iv-V-i in minor, or i-VI-VII for that Hans Zimmer feel. Drones in fifths underpin Indian classical and bagpipe traditions.') },
                beatpad:    { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83E\uDD41', title: __alloT('stem.music.beat_pad_sample_based_drums', 'Beat Pad \u2014 sample-based drums'),                hint: __alloT('stem.music.most_popular_music_sits_at_4_4_90_130_', 'Most popular music sits at 4/4, 90-130 BPM. Hip-hop ~85-95, house 120-130, drum-and-bass ~170 (half-time feel). The kick on 1+3, snare on 2+4 = backbeat \u2014 the foundation of rock + pop.') },
                theory:     { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCDA', title: __alloT('stem.music.theory_the_math_behind_the_sound', 'Theory \u2014 the math behind the sound'),           hint: __alloT('stem.music.pythagoras_500_bce_discovered_consonan', 'Pythagoras (~500 BCE) discovered consonance from integer frequency ratios: octave 2:1, fifth 3:2, fourth 4:3. Helmholtz extended this in 1862. Sound = compression waves; music = patterns we agree to call beautiful.') },
                timbreHunt: { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\u2696\uFE0F', title: __alloT('stem.music.timbre_hero_title', 'Timbre Lab \u2014 harmonics & waveform color'), hint: __alloT('stem.music.timbre_hero_hint', 'Compare harmonic overtone spectra to hear why instruments playing the exact same pitch sound completely different.') }
              };
              var meta = TAB_META[synthTab] || TAB_META.play;
              return React.createElement('div', {
                className: 'mus-tab-hero',
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  // accent mixed 45% toward black (light) or white (dark): 4.5:1+ on the tint
                  React.createElement('h3', { style: { color: 'rgb(' + [16, 8, 0].map(function (s) { var v = parseInt(meta.accent.slice(1), 16) >> s & 255; return Math.round(isDark ? v * 0.55 + 115 : v * 0.55); }).join(',') + ')', fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),

            // ═══════════ TAB: PLAY ═══════════
            synthTab === 'play' && React.createElement("div", null,
              // Preset bar
              React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },
                Object.keys(PRESETS).map(function (name) {
                  return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_instrument_preset', 'Instrument preset: {name}', { name: name }),
                    key: name,
                    'aria-pressed': d.activePreset === name,
                    onClick: function () { applyInstrumentPreset(name); },
                    className: "px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (d.activePreset === name ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }, (name === 'Plucked' ? '\uD83C\uDFB8' : name === 'Guitar' ? '\uD83C\uDFB8' : name === 'Strings' ? '\uD83C\uDFBB' : name === 'Organ' ? '\u26EA' : name === 'Bass' ? '\uD83C\uDFB8' : name === 'Pad' ? '\u2601\uFE0F' : name === 'Lead' ? '\u26A1' : name === 'Retro' ? '\uD83D\uDC7E' : name === 'Spooky' ? '\uD83D\uDC7B' : '\uD83C\uDFB9') + ' ' + name);
                })
              ),

              // Root & Octave & Scale Lock
              React.createElement("div", { className: "flex flex-wrap gap-2 mb-3 items-center" },
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase" }, __alloT('stem.music.root', "Root")),
                  React.createElement("select", {
                    'aria-label': __alloT('stem.music.root_note', 'Root note'),
                    value: selectedRoot,
                    onChange: function (e) { upd('selectedRoot', e.target.value); },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 border-0 focus:ring-2 focus:ring-purple-400"
                  }, NOTE_NAMES.map(function (n) { return React.createElement("option", { key: n, value: n }, n); }))
                ),
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase" }, "Oct"),
                  React.createElement("div", { className: "flex gap-0.5" },
                    [3, 4, 5, 6].map(function (o) {
                      return React.createElement("button", { key: o,
                        'aria-pressed': (d.octave || 4) === o,
                        onClick: function () { upd('octave', o); },
                        className: "w-7 h-7 rounded text-xs font-bold transition-all " + ((d.octave || 4) === o ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }, o);
                    })
                  )
                ),
                React.createElement("button", { 'aria-pressed': !!scaleLock, onClick: function () { upd('scaleLock', !scaleLock); },
                  className: "px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all " + (scaleLock ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-600')
                }, (scaleLock ? '\uD83D\uDD12' : '\uD83D\uDD13') + ' Scale Lock'),
                React.createElement("select", {
                  'aria-label': __alloT('stem.music.musical_scale', 'Musical scale'),
                  value: selectedScale,
                  onChange: function (e) { upd('selectedScale', e.target.value); noteScaleTried(e.target.value); },
                  className: "px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 border-0 focus:ring-2 focus:ring-purple-400"
                }, Object.keys(SCALES).map(function (s) { return React.createElement("option", { key: s, value: s }, s); })),
                // Engine toggle
                React.createElement("div", { className: "flex gap-0.5 ml-auto" },
                  [{ id: 'standard', label: __alloT('stem.music.synth', '\u223F Synth') }, { id: 'plucked', label: __alloT('stem.music.plucked', '\uD83C\uDFB8 Plucked') }].map(function (eng) {
                    return React.createElement("button", { "aria-label": eng.label + " engine",
                      key: eng.id,
                      'aria-pressed': synthEngine === eng.id,
                      onClick: function () {
                        // Clear all active notes (including extras: vibLFO, FM modulator, SuperSaw voices)
                        Object.keys(window._alloSynthActiveNotes || {}).forEach(function (nid) {
                          stopNote(nid);
                        });
                        upd('synthEngine', eng.id);
                      },
                      className: "px-2 py-1 rounded text-[0.6875rem] font-bold transition-all " + (synthEngine === eng.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                    }, eng.label);
                  })
                )
              ),

              // ── Piano Keyboard ──
              React.createElement("div", { className: "relative mb-3 overflow-x-auto overflow-y-hidden", style: { height: '160px' } },
                React.createElement("div", { className: "flex relative", style: { height: '140px', minWidth: '504px' } },
                  KEYS.map(function (key, idx) {
                    var isActive = _msKeys(d).indexOf(key.note + key.octave) !== -1;
                    var isBlack = key.isBlack;
                    var isScaleNote = isInScale(key.semitone);
                    var isRoot = key.semitone === 0;
                    var dimmed = scaleLock && !isScaleNote;
                    // Shared press/release so mouse, touch, and KEYBOARD (Enter/Space)
                    // all play the key — keyboard/switch users were locked out before.
                    var noteId = key.note + key.octave;
                    var pressKey = function () {
                      if (dimmed) return;
                      if (synthEngine === 'plucked') { playPlucked(key.freq, noteId, d.ksBrightness, d.ksDamping); }
                      else { playNote(key.freq, noteId); }
                      upd('activeKeys', _msKeys(d).concat([noteId])); upd('lastNote', noteId); upd('lastFreq', key.freq); upd('lastNoteColor', key.color || '#a855f7');
                      upd('notesPlayed', (d.notesPlayed || 0) + 1);
                      if (announceToSR) announceToSR(key.note + key.octave);
                    };
                    var releaseKey = function () { stopNote(noteId); upd('activeKeys', _msKeys(d).filter(function (x) { return x !== noteId; })); };
                    var onKeyDownKey = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressKey(); } };
                    var onKeyUpKey = function (e) { if (e.key === ' ' || e.key === 'Enter') releaseKey(); };
                    if (isBlack) {
                      return React.createElement("div", {
                        key: idx,
                        role: 'button', tabIndex: dimmed ? -1 : 0,
                        'aria-label': key.note + key.octave + (dimmed ? ' (out of scale)' : ''),
                        'aria-pressed': isActive ? 'true' : 'false',
                        onMouseDown: function (e) { e.preventDefault(); pressKey(); },
                        onMouseUp: releaseKey,
                        onMouseLeave: releaseKey,
                        onKeyDown: onKeyDownKey,
                        onKeyUp: onKeyUpKey,
                        className: "absolute z-10 rounded-b-md select-none flex flex-col items-center justify-end pb-1 transition-all cursor-pointer " + (isActive ? 'bg-purple-600 shadow-lg shadow-purple-500/50' : dimmed ? 'bg-slate-700 opacity-30' : 'bg-slate-800 hover:bg-slate-700'),
                        style: { width: '5.5%', height: '85px', left: (key.position * (100 / 14) + (100 / 14) * 0.65) + '%', top: 0 }
                      },
                        React.createElement("span", { className: "text-[0.6875rem] text-white/60 font-bold" }, key.note)
                      );
                    }
                    return React.createElement("div", {
                      key: idx,
                      role: 'button', tabIndex: dimmed ? -1 : 0,
                      'aria-label': key.note + key.octave + (dimmed ? ' (out of scale)' : ''),
                      'aria-pressed': isActive ? 'true' : 'false',
                      onMouseDown: function (e) { e.preventDefault(); pressKey(); },
                      onMouseUp: releaseKey,
                      onMouseLeave: releaseKey,
                      onKeyDown: onKeyDownKey,
                      onKeyUp: onKeyUpKey,
                      className: "flex-1 rounded-b-lg select-none flex flex-col items-center justify-end pb-2 border transition-all cursor-pointer " + (isActive ? 'bg-purple-100 border-purple-400 shadow-lg shadow-purple-300/50' : dimmed ? 'bg-slate-50 border-slate-200 opacity-30' : 'bg-white border-slate-200 hover:bg-purple-50'),
                      style: { minWidth: '36px' }
                    },
                      isScaleNote && React.createElement("div", { className: "w-2 h-2 rounded-full mb-1 " + (isRoot ? 'bg-purple-600' : 'bg-purple-300') }),
                      React.createElement("span", { className: "text-[0.6875rem] font-bold " + (isActive ? 'text-purple-700' : 'text-slate-600') }, key.note),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-500" }, KEYBOARD_MAP && Object.keys(KEYBOARD_MAP).find(function (k) { return KEYBOARD_MAP[k] === key.semitone + (key.octave - (d.octave || 4)) * 12; }) || '')
                    );
                  })
                )
              ),

              // ── Chord Buttons ──
              React.createElement("div", { className: "mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase" }, __alloT('stem.music.chords', "Chords")),
                  React.createElement("select", {
                    'aria-label': __alloT('stem.music.chord_root_note', 'Chord root note'),
                    value: chordRoot,
                    onChange: function (e) { upd('chordRoot', e.target.value); },
                    className: "px-1.5 py-0.5 rounded text-[0.6875rem] font-bold bg-slate-100 border-0"
                  }, NOTE_NAMES.map(function (n) { return React.createElement("option", { key: n, value: n }, n); })),
                  React.createElement("div", { className: "flex gap-0.5" },
                    [0, 1, 2].map(function (inv) {
                      return React.createElement("button", { key: inv,
                        'aria-pressed': chordInversion === inv,
                        onClick: function () { upd('chordInversion', inv); },
                        className: "px-1.5 py-0.5 rounded text-[0.6875rem] font-bold " + (chordInversion === inv ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600')
                      }, inv === 0 ? 'Root' : inv === 1 ? '1st Inv' : '2nd Inv');
                    })
                  ),
                  React.createElement("button", { "aria-label": __alloT('stem.music.jazz_mode', "Jazz Mode"),
                    'aria-pressed': !!jazzMode,
                    onClick: function () { upd('jazzMode', !jazzMode); },
                    className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold ml-auto " + (jazzMode ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600')
                  }, __alloT('stem.music.jazz_mode_2', "\uD83C\uDFB7 Jazz Mode"))
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1" },
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6'] : ['Major', 'Minor', 'Diminished', 'Augmented', 'Sus2', 'Sus4', 'Power', 'Dom7', 'Maj7', 'Min7']).map(function (chType) {
                    var chord = CHORDS[chType]; if (!chord) return null;
                    return React.createElement("button", { key: chType,
                      'aria-pressed': selectedChord === chType,
                      onClick: function () { upd('selectedChord', chType); playChord(chordRoot, chType, chordInversion); },
                      className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (selectedChord === chType ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600')
                    }, chordRoot + chord.symbol);
                  })
                ),
                // Chord info badge
                selectedChord && CHORDS[selectedChord] && React.createElement("div", { className: "mt-1 px-2.5 py-1 bg-purple-50 rounded-lg text-[0.6875rem] text-purple-700" },
                  React.createElement("span", { className: "font-bold" }, chordRoot + CHORDS[selectedChord].symbol + ": "),
                  React.createElement("span", null, CHORDS[selectedChord].intervals.map(function (i) { return NOTE_NAMES[(NOTE_NAMES.indexOf(chordRoot) + i) % 12]; }).join(' \u2022 ')),
                  React.createElement("span", { className: "ml-2 text-purple-700 italic" }, CHORDS[selectedChord].desc || '')
                )
              ),

              // ── Strum Harp (moved to HarmonyPad tab — this is now a link) ──
              React.createElement("div", { className: "mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3 flex items-center justify-between" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { className: "text-lg" }, "\uD83C\uDFB8"),
                  React.createElement("div", null,
                    React.createElement("span", { className: "text-xs font-bold text-amber-800" }, __alloT('stem.music.strum_chord_pad', "Strum & Chord Pad")),
                    React.createElement("p", { className: "text-[0.6875rem] text-amber-700" }, __alloT('stem.music.full_chord_grid_strum_plate_and_voice_', "Full chord grid, strum plate, and voice presets"))
                  )
                ),
                React.createElement("button", { onClick: function() { upd('synthTab', 'harmonypad'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800 transition-all shadow-sm" }, __alloT('stem.music.open_harmonypad', "\uD83C\uDF1F Open HarmonyPad \u2192"))
              ),
              false && React.createElement("div", { className: "REMOVED" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, __alloT('stem.music.strum_harp', "\uD83C\uDFB8 Strum Harp")),
                  React.createElement("span", { className: "text-[0.6875rem] text-amber-700" }, __alloT('stem.music.drag_across_strings_to_strum', "Drag across strings to strum!"))
                ),
                React.createElement("div", { className: "flex justify-center gap-1", style: { height: '100px' } },
                  (function () {
                    var chordData = CHORDS[selectedChord]; if (!chordData) return [];
                    var ri = NOTE_NAMES.indexOf(chordRoot);
                    return chordData.intervals.map(function (intv, si) {
                      var nIdx = (ri + intv) % 12; var nOct = (d.octave || 4) + Math.floor((ri + intv) / 12);
                      var freq = noteFreq(NOTE_NAMES[nIdx], nOct);
                      var noteN = NOTE_NAMES[nIdx];
                      var stringActive = (d.strumStrings || []).indexOf(si) !== -1;
                      return React.createElement("div", {
                        key: si,
                        onMouseEnter: function (e) {
                          if (e.buttons > 0) {
                            if (synthEngine === 'plucked') playPlucked(freq, 'strum_' + si, d.ksBrightness, d.ksDamping);
                            else playNoteFor(freq, 'strum_' + si, 600);
                            upd('strumStrings', (d.strumStrings || []).concat([si]));
                            setTimeout(function () { upd('strumStrings', (d.strumStrings || []).filter(function (x) { return x !== si; })); }, 300);
                          }
                        },
                        onMouseDown: function (e) {
                          e.preventDefault();
                          if (synthEngine === 'plucked') playPlucked(freq, 'strum_' + si, d.ksBrightness, d.ksDamping);
                          else playNoteFor(freq, 'strum_' + si, 600);
                          upd('strumStrings', (d.strumStrings || []).concat([si]));
                          setTimeout(function () { upd('strumStrings', (d.strumStrings || []).filter(function (x) { return x !== si; })); }, 300);
                        },
                        className: "flex flex-col items-center justify-between cursor-pointer select-none group",
                        style: { width: '24px' }
                      },
                        React.createElement("span", { className: "text-[0.6875rem] font-bold text-amber-700" }, noteN),
                        React.createElement("div", {
                          className: "flex-1 w-[3px] rounded-full transition-all duration-150 " + (stringActive ? 'bg-amber-400 shadow-lg shadow-amber-400/50 scale-x-150' : 'bg-amber-300 group-hover:bg-amber-400'),
                          style: stringActive ? { animation: 'pulse 0.15s ease-in-out 3' } : {}
                        }),
                        React.createElement("span", { className: "text-[0.6875rem] text-amber-400" }, (d.octave || 4) + Math.floor((ri + intv) / 12))
                      );
                    });
                  })()
                )
              ),

              // ── Engine-Specific Controls ──
              (d.synthEngine === 'fm') && React.createElement("div", { className: "mb-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, __alloT('stem.music.fm_synthesis_controls', "\uD83C\uDF1F FM Synthesis Controls")),
                  React.createElement(stableType('Tip', Tip), { id: 'fm', title: __alloT('stem.music.fm_synthesis_2', 'FM Synthesis'), text: __alloT('stem.music.frequency_modulation_fm_synthesis_uses', 'Frequency Modulation (FM) synthesis uses one oscillator (modulator) to rapidly change the frequency of another (carrier). The modulator:carrier ratio determines the harmonic content. Simple ratios (1:1, 2:1, 3:1) produce harmonic tones. Complex ratios produce metallic, bell-like, or inharmonic sounds. FM was popularized by the Yamaha DX7 in 1983.') })
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[0.6875rem] font-bold text-amber-700" }, "Mod Ratio: " + (d.fmRatio || 2) + ":1"),
                    React.createElement("input", { 'aria-label': __alloT('stem.music.a11y_mod_ratio', 'Mod Ratio'), type: "range", 'aria-valuetext': ((d.fmRatio || 2) + ' to 1 ratio'), min: "0.5", max: "8", step: "0.5", value: d.fmRatio || 2, onChange: function(e) { upd('fmRatio', parseFloat(e.target.value)); }, className: "w-full accent-amber-600" }),
                    React.createElement("div", { className: "flex justify-between text-[0.6875rem] text-amber-700" }, React.createElement("span", null, "Sub-harmonic"), React.createElement("span", null, __alloT('stem.music.bright', "Bright")))
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[0.6875rem] font-bold text-amber-700" }, "Mod Depth: " + (d.fmDepth || 1.5)),
                    React.createElement("input", { type: "range", 'aria-label': __alloT('stem.music.fm_mod_depth', 'FM modulation depth'), 'aria-valuetext': ('depth ' + (d.fmDepth || 1.5)), min: "0", max: "10", step: "0.1", value: d.fmDepth || 1.5, onChange: function(e) { upd('fmDepth', parseFloat(e.target.value)); }, className: "w-full accent-amber-600" }),
                    React.createElement("div", { className: "flex justify-between text-[0.6875rem] text-amber-700" }, React.createElement("span", null, __alloT('stem.music.pure', "Pure")), React.createElement("span", null, __alloT('stem.music.metallic', "Metallic")))
                  )
                )
              ),
              (d.synthEngine === 'supersaw') && React.createElement("div", { className: "mb-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, __alloT('stem.music.supersaw_controls', "\u26A1 SuperSaw Controls")),
                  React.createElement(stableType('Tip', Tip), { id: 'supersaw', title: __alloT('stem.music.supersaw_unison', 'SuperSaw / Unison'), text: __alloT('stem.music.supersaw_stacks_multiple_sawtooth_osci', 'SuperSaw stacks multiple sawtooth oscillators slightly detuned from each other. This creates a huge, wide, shimmering sound — the signature of EDM, trance, and modern pop. More voices = thicker sound but uses more CPU. Detuning controls how far apart the voices are tuned — more detune = wider/more chorus-like, less = tighter/more focused.') })
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[0.6875rem] font-bold text-indigo-700" }, "Voices: " + (d.superVoices || 5)),
                    React.createElement("input", { type: "range", 'aria-label': __alloT('stem.music.supersaw_voice_count', 'Supersaw voice count'), 'aria-valuetext': ((d.superVoices || 5) + ' voices'), min: "2", max: "9", step: "1", value: d.superVoices || 5, onChange: function(e) { upd('superVoices', parseInt(e.target.value)); }, className: "w-full accent-indigo-600" }),
                    React.createElement("div", { className: "flex justify-between text-[0.6875rem] text-indigo-700" }, React.createElement("span", null, __alloT('stem.music.thin_2', "Thin (2)")), React.createElement("span", null, __alloT('stem.music.massive_9', "Massive (9)")))
                  ),
                  React.createElement("div", null,
                    React.createElement("label", { className: "text-[0.6875rem] font-bold text-indigo-700" }, "Detune: " + (d.superDetune || 15) + " cents"),
                    React.createElement("input", { type: "range", 'aria-label': __alloT('stem.music.supersaw_detune_cents', 'Supersaw detune in cents'), 'aria-valuetext': ((d.superDetune || 15) + ' cents'), min: "2", max: "50", step: "1", value: d.superDetune || 15, onChange: function(e) { upd('superDetune', parseInt(e.target.value)); }, className: "w-full accent-indigo-600" }),
                    React.createElement("div", { className: "flex justify-between text-[0.6875rem] text-indigo-700" }, React.createElement("span", null, __alloT('stem.music.tight', "Tight")), React.createElement("span", null, __alloT('stem.music.wide', "Wide")))
                  )
                )
              ),

              // ── ADSR & Effects Controls ──
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3" },
                // ADSR - always visible
                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-xs font-bold text-slate-700" }, __alloT('stem.music.adsr_envelope', "\uD83D\uDCC8 ADSR Envelope")),
                    React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.adsr.text }, "\u2753")
                  ),
                  // ADSR visual — luminous scope curve with phase markers & active indicator
                  React.createElement("svg", { role: 'img', 'aria-label': __alloT('stem.music.adsr_img_label', 'ADSR envelope shape'), viewBox: "0 0 200 64", className: "w-full mb-2 rounded-lg overflow-hidden", style: { maxHeight: '56px' } },
                    React.createElement("defs", null,
                      React.createElement("linearGradient", { id: "adsrBgGrad", x1: "0", y1: "0", x2: "0", y2: "1" },
                        React.createElement("stop", { offset: "0%", stopColor: "#140e2e" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#0a0718" })
                      ),
                      React.createElement("linearGradient", { id: "adsrFillGrad", x1: "0", y1: "0", x2: "0", y2: "1" },
                        React.createElement("stop", { offset: "0%", stopColor: "#c084fc", stopOpacity: "0.48" }),
                        React.createElement("stop", { offset: "65%", stopColor: "#7c3aed", stopOpacity: "0.22" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#38bdf8", stopOpacity: "0.02" })
                      ),
                      React.createElement("linearGradient", { id: "adsrStrokeGrad", x1: "0", y1: "0", x2: "1", y2: "0" },
                        React.createElement("stop", { offset: "0%", stopColor: "#38bdf8" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#c084fc" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#f472b6" })
                      )
                    ),
                    React.createElement("rect", { width: 200, height: 64, rx: 6, fill: "url(#adsrBgGrad)" }),
                    React.createElement("line", { x1: 0, y1: 18, x2: 200, y2: 18, stroke: "rgba(148,163,184,0.14)", strokeWidth: 0.7 }),
                    React.createElement("line", { x1: 0, y1: 36, x2: 200, y2: 36, stroke: "rgba(148,163,184,0.14)", strokeWidth: 0.7 }),
                    React.createElement("line", { x1: 0, y1: 54, x2: 200, y2: 54, stroke: "rgba(148,163,184,0.22)", strokeWidth: 0.8 }),
                    (function () {
                      var a = d.attack || 0.01, dec = d.decay || 0.1, s = d.sustain || 0.7, r = d.release || 0.3;
                      var aX = Math.max(6, Math.min(a * 160, 50)), dX = aX + Math.max(8, Math.min(dec * 80, 40)), sX = 140, rX = Math.min(196, sX + Math.max(8, Math.min(r * 45, 52)));
                      var baseY = 54, topY = 8, sY = baseY - s * (baseY - topY);
                      var pts = "4," + baseY + " " + aX + "," + topY + " " + dX + "," + sY + " " + sX + "," + sY + " " + rX + "," + baseY;
                      var areaPts = pts + " 4," + baseY;
                      var hasActive = !!(d.lastPlayedNote || (window._alloActiveNotes && Object.keys(window._alloActiveNotes).length > 0));
                      var lfoDepth = Math.max(Number(d.tremoloDepth) || 0, (Number(d.vibratoDepth) || 0) / 30);
                      var lfoRate = Math.max(Number(d.tremoloRate) || 0, Number(d.vibratoRate) || 0, 3);
                      var lfoPath = '';
                      if (lfoDepth > 0.02 && sX > dX + 6) {
                        var lfoAmp = Math.min(8, 2 + lfoDepth * 6);
                        var lfoCycles = Math.max(2, Math.min(7, Math.round(lfoRate * 0.7)));
                        for (var li = 0; li <= 24; li++) {
                          var lu = li / 24;
                          var lx = dX + lu * (sX - dX);
                          var ly = Math.max(topY + 1, Math.min(baseY - 1, sY + Math.sin(lu * Math.PI * 2 * lfoCycles) * lfoAmp));
                          lfoPath += (li === 0 ? 'M' : 'L') + lx.toFixed(1) + ',' + ly.toFixed(1) + ' ';
                        }
                      }
                      return React.createElement("g", null,
                        React.createElement("line", { x1: aX, y1: topY, x2: aX, y2: baseY, stroke: "rgba(56,189,248,0.28)", strokeDasharray: "2 2", strokeWidth: 0.9 }),
                        React.createElement("line", { x1: dX, y1: sY, x2: dX, y2: baseY, stroke: "rgba(192,132,252,0.28)", strokeDasharray: "2 2", strokeWidth: 0.9 }),
                        React.createElement("line", { x1: sX, y1: sY, x2: sX, y2: baseY, stroke: "rgba(244,114,182,0.28)", strokeDasharray: "2 2", strokeWidth: 0.9 }),
                        React.createElement("polygon", { points: areaPts, fill: "url(#adsrFillGrad)" }),
                        React.createElement("polyline", { points: pts, fill: "none", stroke: "#a855f7", strokeOpacity: 0.38, strokeWidth: 5.5, strokeLinejoin: "round", strokeLinecap: "round" }),
                        React.createElement("polyline", { points: pts, fill: "none", stroke: "url(#adsrStrokeGrad)", strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" }),
                        lfoPath && React.createElement("path", { d: lfoPath, fill: "none", stroke: "#38bdf8", strokeWidth: 1.35, strokeDasharray: "2.5 1.5", opacity: 0.85 }),
                        React.createElement("circle", { cx: aX, cy: topY, r: hasActive ? 7.5 : 5.5, fill: "none", stroke: "#38bdf8", strokeWidth: 1.2, className: "mus-adsr-beacon" }),
                        React.createElement("circle", { cx: (dX + sX) * 0.5, cy: sY, r: lfoDepth > 0.02 ? 6.5 : 4.5, fill: "none", stroke: "#e879f9", strokeWidth: 1.1, className: "mus-adsr-beacon" }),
                        React.createElement("circle", { cx: aX, cy: topY, r: hasActive ? 4 : 3, fill: "#38bdf8", stroke: "#ffffff", strokeWidth: 1 }),
                        React.createElement("circle", { cx: dX, cy: sY, r: 2.8, fill: "#c084fc", stroke: "#ffffff", strokeWidth: 0.9 }),
                        React.createElement("circle", { cx: sX, cy: sY, r: 2.8, fill: "#e879f9", stroke: "#ffffff", strokeWidth: 0.9 }),
                        React.createElement("circle", { cx: rX, cy: baseY, r: 2.5, fill: "#f472b6", stroke: "#ffffff", strokeWidth: 0.9 })
                      );
                    })(),
                    React.createElement("text", { x: 8, y: 62, fontSize: 8, fontWeight: "bold", fill: "#7dd3fc" }, "A"),
                    React.createElement("text", { x: 56, y: 62, fontSize: 8, fontWeight: "bold", fill: "#d8b4fe" }, "D"),
                    React.createElement("text", { x: 110, y: 62, fontSize: 8, fontWeight: "bold", fill: "#f0abfc" }, "S"),
                    React.createElement("text", { x: 165, y: 62, fontSize: 8, fontWeight: "bold", fill: "#fda4af" }, "R")
                  ),
                  [{ k: 'attack', label: t('stem.synth.attack', 'Attack'), min: 0.001, max: 2, step: 0.01, unit: 's' },
                  { k: 'decay', label: t('stem.synth.decay', 'Decay'), min: 0.01, max: 1, step: 0.01, unit: 's' },
                  { k: 'sustain', label: t('stem.synth.sustain', 'Sustain'), min: 0, max: 1, step: 0.01, unit: '' },
                  { k: 'release', label: t('stem.synth.release', 'Release'), min: 0.01, max: 3, step: 0.01, unit: 's' }].map(function (param) {
                    return React.createElement("div", { key: param.k, className: "flex items-center gap-2 mb-0.5" },
                      React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 w-12" }, param.label),
                      React.createElement("input", { type: "range", 'aria-label': param.label, 'aria-valuetext': ((d[param.k] != null ? d[param.k] : param.min).toFixed(2) + (param.unit || '')), min: param.min, max: param.max, step: param.step, value: d[param.k] || param.min, onChange: function (e) { upd(param.k, parseFloat(e.target.value)); }, className: "flex-1 accent-purple-600 h-6" }),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 w-10 text-right" }, (d[param.k] || param.min).toFixed(2) + param.unit)
                    );
                  })
                ),

                // Effects panel
                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700 block mb-2" }, __alloT('stem.music.effects', "\u2699\uFE0F Effects")),
                  // Waveform selector (for standard engine)
                  synthEngine === 'standard' && React.createElement("div", { className: "flex gap-1 mb-2" },
                    ['sine', 'square', 'sawtooth', 'triangle'].map(function (w) {
                      var wi = WAVE_INFO[w];
                      return React.createElement("button", { key: w,
                        'aria-pressed': (['sine', 'square', 'sawtooth', 'triangle'].indexOf(d.waveType) !== -1 ? d.waveType : 'sine') === w,
                        onClick: function () { upd('waveType', w); },
                        className: "flex-1 py-1 rounded-lg text-[0.6875rem] font-bold text-center transition-all " + ((["sine","square","sawtooth","triangle"].indexOf(d.waveType) !== -1 ? d.waveType : 'sine') === w ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-purple-50'),
                        title: wi.desc
                      }, wi.emoji + " " + w);
                    })
                  ),
                  // Plucked engine controls
                  synthEngine === 'plucked' && React.createElement("div", { className: "space-y-1 mb-2" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[0.6875rem] font-bold text-amber-700" }, __alloT('stem.music.karplus_strong', "\uD83C\uDFB8 Karplus-Strong")),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.karplusStrong.text }, "\u2753")
                    ),
                    [{ k: 'ksBrightness', label: t('stem.synth.brightness', 'Brightness'), min: 0.1, max: 1, step: 0.01 },
                    { k: 'ksDamping', label: t('stem.synth.damping', 'Damping'), min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 w-16" }, p.label),
                        React.createElement("input", { type: "range", 'aria-label': p.label, 'aria-valuetext': (String(d[p.k] != null ? d[p.k] : (p.k === 'ksBrightness' ? 0.8 : 0.996))), min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-amber-500 h-6" }),
                        React.createElement("span", { className: "text-[0.6875rem] text-slate-600 w-10 text-right" }, (d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996)).toFixed(p.k === 'ksDamping' ? 4 : 2))
                      );
                    })
                  ),
                  // Volume + Reverb
                  [{ k: 'volume', label: __alloT('stem.music.volume', '\uD83D\uDD0A Volume'), min: 0, max: 1, step: 0.01 },
                  { k: 'reverbMix', label: __alloT('stem.music.reverb', '\uD83C\uDFDB Reverb'), min: 0, max: 1, step: 0.01 }].map(function (p) {
                    return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                      React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 w-16" }, p.label),
                      React.createElement("input", { type: "range", 'aria-label': p.label, 'aria-valuetext': (((d[p.k] != null ? d[p.k] : (p.k === 'volume' ? 0.5 : 0)) * 100).toFixed(0) + '%'), min: p.min, max: p.max, step: p.step, value: d[p.k] != null ? d[p.k] : (p.k === 'volume' ? 0.5 : 0), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-purple-600 h-6" }),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 w-8 text-right" }, ((d[p.k] != null ? d[p.k] : (p.k === 'volume' ? 0.5 : 0)) * 100).toFixed(0) + '%')
                    );
                  }),
                  // Filter
                  React.createElement("div", { className: "mt-1 pt-1 border-t border-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600" }, __alloT('stem.music.filter', "\uD83C\uDF0A Filter")),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.filter.text }, "\u2753"),
                      React.createElement("select", {
                        'aria-label': __alloT('stem.music.filter_type', 'Filter type'),
                        value: d.filterType || 'lowpass',
                        onChange: function (e) { upd('filterType', e.target.value); },
                        className: "ml-auto px-1.5 py-0.5 rounded text-[0.6875rem] font-bold bg-white border"
                      }, ['lowpass', 'highpass', 'bandpass'].map(function (ft) { return React.createElement("option", { key: ft, value: ft }, ft); }))
                    ),
                    [{ k: 'filterCutoff', label: t('stem.synth.cutoff', 'Cutoff'), min: 0, max: 1000, step: 1,
                      // Cutoff is stored in Hz but driven by a log-mapped slider: a linear
                      // 100-12000Hz travel spent ~2% of its length on the lowest two
                      // octaves, where nearly all the musically useful moves live.
                      toSlider: function (v) { return Math.round(filterPlotFractionOf(v || 8000) * 1000); },
                      fromSlider: function (pos) { return Math.round(filterPlotFreqAt(pos / 1000)); },
                      fmt: function (v) { return (v || 8000) >= 1000 ? ((v || 8000) / 1000).toFixed(1) + 'k' : Math.round(v || 8000) + ''; } },
                    { k: 'filterQ', label: 'Q', min: 0.1, max: 20, step: 0.1, fmt: function (v) { return (v || 1).toFixed(1); } }].map(function (p) {
                      var stored = d[p.k] || (p.k === 'filterCutoff' ? 8000 : 1);
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                        React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 w-10" }, p.label),
                        React.createElement("input", { type: "range", 'aria-label': p.label,
                          'aria-valuetext': (p.fmt ? p.fmt(stored) : String(stored)) + (p.k === 'filterCutoff' ? ' Hz' : ''),
                          min: p.min, max: p.max, step: p.step,
                          value: p.toSlider ? p.toSlider(stored) : stored,
                          onChange: function (e) {
                            var raw = parseFloat(e.target.value);
                            upd(p.k, p.fromSlider ? p.fromSlider(raw) : raw);
                          },
                          className: "flex-1 accent-cyan-500 h-6" }),
                        React.createElement("span", { className: "text-[0.6875rem] text-slate-600 w-10 text-right" }, p.fmt(d[p.k]))
                      );
                    })
                  ),
                  // Tremolo & Vibrato
                  React.createElement("div", { className: "mt-1 pt-1 border-t border-slate-200" },
                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                      React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600" }, __alloT('stem.music.modulation', "\u2728 Modulation")),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.tremolo.text }, "\u2753")
                    ),
                    [{ k: 'tremoloDepth', label: t('stem.synth.trem_dep', 'Trem Dep'), min: 0, max: 1, step: 0.01 },
                    { k: 'tremoloRate', label: t('stem.synth.trem_rate', 'Trem Rate'), min: 0.5, max: 20, step: 0.5 },
                    { k: 'vibratoDepth', label: t('stem.synth.vib_dep', 'Vib Dep'), min: 0, max: 1, step: 0.01 },
                    { k: 'vibratoRate', label: t('stem.synth.vib_rate', 'Vib Rate'), min: 0.5, max: 12, step: 0.5 }].map(function (p) {
                      return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-0.5" },
                        React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 w-14" }, p.label),
                        React.createElement("input", { type: "range", 'aria-label': p.label, 'aria-valuetext': ((d[p.k] || 0).toFixed(1) + (/Rate/.test(p.k) ? ' Hz' : '')), min: p.min, max: p.max, step: p.step, value: d[p.k] || 0, onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-pink-500 h-6" }),
                        React.createElement("span", { className: "text-[0.6875rem] text-slate-600 w-8 text-right" }, (d[p.k] || 0).toFixed(1))
                      );
                    })
                  )
                )
              ),

              // ── Progression player ──
              React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3 mb-3" },
                React.createElement("span", { className: "text-xs font-bold text-slate-700 block mb-2" }, __alloT('stem.music.chord_progressions', "\uD83C\uDFB6 Chord Progressions")),
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  PROGRESSIONS.map(function (prog) {
                    return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_play_progression', 'Play progression: {name}', { name: prog.name }),
                      key: prog.name,
                      onClick: function () { playProgression(prog); },
                      className: "text-left px-2.5 py-2 rounded-lg bg-white border border-slate-400 hover:border-purple-600 hover:bg-purple-50 transition-all group"
                    },
                      React.createElement("span", { className: "transition-colors text-[0.6875rem] font-bold text-slate-700 group-hover:text-purple-700 block" }, prog.name),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600" }, prog.desc)
                    );
                  })
                )
              ),

              // ── Metronome ──
              // The engine (playClick, startMetronome, TIME_SIGS with five metres)
              // was fully written but had no control anywhere in the tool, so none of
              // it could be reached. d.timeSig had no writer for the same reason.
              React.createElement("div", { className: "bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-teal-700" }, __alloT('stem.music.metronome', "\u23F1\uFE0F Metronome")),
                  React.createElement("button", {
                    'aria-label': metroOn ? __alloT('stem.music.stop_metronome', 'Stop metronome') : __alloT('stem.music.start_metronome', 'Start metronome'),
                    'aria-pressed': metroOn ? 'true' : 'false',
                    onClick: function () { if (metroOn) stopMetronome(); else startMetronome(); },
                    className: "ml-auto px-3 py-1 rounded-lg text-xs font-bold " + (metroOn ? 'bg-red-700 text-white' : 'bg-teal-700 text-white')
                  }, metroOn ? '\u23F9 ' + __alloT('stem.music.stop', 'Stop') : '\u25B6 ' + __alloT('stem.music.start', 'Start'))
                ),
                React.createElement("div", { className: "flex flex-wrap gap-2 items-center" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600" }, __alloT('stem.music.tempo', "Tempo")),
                  React.createElement("input", { type: "range",
                    'aria-label': __alloT('stem.music.tempo_bpm', 'Tempo in beats per minute'),
                    'aria-valuetext': tempoBPM + ' BPM',
                    min: BPM_MIN, max: BPM_MAX, step: 1, value: tempoBPM,
                    onChange: function (e) { upd('seqBPM', safeBPM(e.target.value)); },
                    className: "w-24 accent-teal-600 h-6" }),
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-teal-700 w-14" }, tempoBPM + ' BPM'),
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 ml-2" }, __alloT('stem.music.metre', "Metre")),
                  React.createElement("select", {
                    'aria-label': __alloT('stem.music.time_signature', 'Time signature'),
                    value: timeSig,
                    onChange: function (e) { upd('timeSig', e.target.value); },
                    className: "px-1.5 py-0.5 rounded text-[0.6875rem] font-bold bg-white border border-teal-600"
                  }, Object.keys(TIME_SIGS).map(function (ts) { return React.createElement("option", { key: ts, value: ts }, ts); })),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.timeSig.text }, "\u2753")
                ),
                // Beat lamps: the accented downbeat is also the loud click, so the
                // metre is legible without relying on hearing the accent.
                React.createElement("div", { className: "flex gap-1 mt-2", role: "img",
                  'aria-label': __alloFmt('stem.music.aria_beat_of', 'Beat {n} of {total}', { n: Math.max(1, (d.metroBeat || 0) + 1), total: (TIME_SIGS[timeSig] || { beats: 4 }).beats })
                },
                  (function () {
                    var beats = (TIME_SIGS[timeSig] || { beats: 4 }).beats;
                    var lamps = [];
                    for (var bi = 0; bi < beats; bi++) {
                      var isNow = metroOn && d.metroBeat === bi;
                      lamps.push(React.createElement("span", { key: bi,
                        className: "h-2 flex-1 rounded-full transition-colors " +
                          (isNow ? (bi === 0 ? 'bg-teal-600' : 'bg-teal-400') : 'bg-slate-200')
                      }));
                    }
                    return lamps;
                  })()
                )
              ),

              // ── Rhythm Clap-Back ──
              // The assessment half of the rhythm gap: the metronome above gives the
              // reference, this measures whether the student can reproduce a pattern.
              React.createElement("div", { className: "bg-gradient-to-r from-rose-50 to-orange-50 rounded-xl border border-rose-200 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },
                  React.createElement("span", { className: "text-xs font-bold text-rose-700" }, __alloT('stem.music.rhythm_clap_back', "\uD83D\uDC4F Rhythm Clap-Back")),
                  (d.rhythmStreak || 0) > 0 && React.createElement("span", { className: "text-[0.6875rem] font-bold text-orange-700" },
                    "\uD83D\uDD25 " + __alloFmt('stem.music.rhythm_streak', 'Streak {n}', { n: d.rhythmStreak })),
                  React.createElement("select", {
                    'aria-label': __alloT('stem.music.rhythm_choose_pattern', 'Choose a rhythm pattern'),
                    value: d.rhythmPatternId || RHYTHM_PATTERNS[0].id,
                    disabled: d.rhythmPhase === 'listen' || d.rhythmPhase === 'record',
                    onChange: function (e) {
                      var v = e.target.value;
                      if (/^gen[1-4]$/.test(v)) upd('rhythmGen', vsrMakeGen(Number(v.slice(3)), d.rhythmGenMeter, d.rhythmGenBars));
                      upd('rhythmPatternId', v); upd('rhythmResult', null);
                    },
                    className: "ml-auto px-1.5 py-0.5 rounded text-[0.6875rem] font-bold bg-white border border-rose-500"
                  }, RHYTHM_PATTERNS.map(function (p) {
                    return React.createElement("option", { key: p.id, value: p.id },
                      __alloFmt('stem.music.rhythm_option', 'L{level} \u2014 {name}', { level: p.level, name: __alloT('stem.music.rhythm_' + p.id, p.name) }));
                  }).concat([1, 2, 3, 4].map(function (lv) {
                    return React.createElement("option", { key: 'gen' + lv, value: 'gen' + lv },
                      __alloFmt('stem.music.rhythm_option', 'L{level} \u2014 {name}', { level: lv, name: t('stem.music.rg_generated', 'New rhythm every time') }));
                  }))),
                  /^gen[1-4]$/.test(d.rhythmPatternId || '') && React.createElement("button", {
                    disabled: d.rhythmPhase === 'listen' || d.rhythmPhase === 'record',
                    onClick: function () { upd('rhythmGen', vsrMakeGen(Number(d.rhythmPatternId.slice(3)), d.rhythmGenMeter, d.rhythmGenBars)); upd('rhythmResult', null); },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-white border border-rose-500 text-rose-800"
                  }, t('stem.music.rg_new', 'New rhythm')),
                  React.createElement("button", {
                    'aria-label': __alloT('stem.music.rhythm_play_pattern', 'Play the rhythm, then tap it back'),
                    disabled: d.rhythmPhase === 'listen' || d.rhythmPhase === 'record',
                    onClick: startRhythmRound,
                    className: "px-3 py-1 rounded-lg text-xs font-bold " + ((d.rhythmPhase === 'listen' || d.rhythmPhase === 'record') ? 'bg-slate-200 text-slate-600' : 'bg-rose-600 text-white hover:bg-rose-700')
                  }, d.rhythmPhase === 'listen' ? '\uD83D\uDC42 ' + __alloT('stem.music.rhythm_listening', 'Listen\u2026')
                    : d.rhythmPhase === 'record' ? '\uD83D\uDD34 ' + __alloT('stem.music.rhythm_recording', 'Tap now!')
                    : '\u25B6 ' + __alloT('stem.music.rhythm_start', 'Start'))
                ),

                // A generated rhythm: time signature, length, its exercise code, Print.
                /^gen[1-4]$/.test(d.rhythmPatternId || '') && React.createElement(VsrGenTools, {
                  React: React, t: t, gen: rhythmPatternById(d.rhythmPatternId).bars ? rhythmPatternById(d.rhythmPatternId) : null,
                  busy: d.rhythmPhase === 'listen' || d.rhythmPhase === 'record',
                  meter: d.rhythmGenMeter || '', bars: d.rhythmGenBars || 0, printCount: d.rhythmPrintCount || 1, set: upd, announce: announceToSR,
                  make: function (m, b, code) { upd('rhythmGen', vsrMakeGen(Number(d.rhythmPatternId.slice(3)), m, b, code)); upd('rhythmResult', null); }
                }),

                // Generated rhythms are written out as notation, coloured by result after a round.
                (function () {
                  var gp = rhythmPatternById(d.rhythmPatternId);
                  if (!gp.bars) return null;
                  var gr = (d.rhythmResult && d.rhythmResult.patternId === gp.id) ? d.rhythmResult.grades : null;
                  return React.createElement("div", { className: "mb-2" }, React.createElement(VsrRhythmNotation, {
                    React: React, rhythm: gp, grades: gr,
                    label: __alloFmt('stem.music.aria_rhythm_pattern', '{name}: {count} taps across {beats} beats', { name: gp.meter, count: gp.onsets.length, beats: gp.beats }),
                    errorText: t('stem.music.rg_notation_failed', 'The notation could not load; the strip below still shows the rhythm.')
                  }));
                })(),

                // Notation strip: where the onsets fall inside the bar.
                (function () {
                  var pattern = rhythmPatternById(d.rhythmPatternId);
                  var grades = (d.rhythmResult && d.rhythmResult.patternId === pattern.id) ? d.rhythmResult.grades : null;
                  return React.createElement("div", { className: "mb-2", role: "img",
                    'aria-label': __alloFmt('stem.music.aria_rhythm_pattern', '{name}: {count} taps across {beats} beats', { name: __alloT('stem.music.rhythm_' + pattern.id, pattern.name), count: pattern.onsets.length, beats: pattern.beats })
                  },
                    React.createElement("div", { className: "relative h-8 rounded-lg bg-white border border-rose-200 overflow-hidden" },
                      // One faint divider per beat, so the grid is readable.
                      Array.apply(null, { length: pattern.beats }).map(function (_, b) {
                        return React.createElement("div", { key: 'b' + b, className: "absolute top-0 bottom-0 border-l border-rose-100",
                          style: { left: (b / pattern.beats * 100) + '%' } });
                      }),
                      pattern.onsets.map(function (beat, i) {
                        var g = grades ? grades[i] : null;
                        var colour = g === 'tight' ? 'bg-green-600' : g === 'close' ? 'bg-lime-500'
                          : g === 'loose' ? 'bg-amber-500' : g === 'missed' ? 'bg-red-500' : 'bg-rose-400';
                        return React.createElement("div", { key: 'o' + i,
                          className: "absolute top-1.5 bottom-1.5 w-2 rounded-sm " + colour,
                          style: { left: 'calc(' + (beat / pattern.beats * 100) + '% + 2px)' } });
                      })
                    )
                  );
                })(),

                // Tap target. A real button, so Space and Enter work without a
                // document-level key handler that would fight the piano keys.
                React.createElement("button", {
                  'aria-label': __alloT('stem.music.rhythm_tap_here', 'Tap the rhythm here'),
                  disabled: d.rhythmPhase !== 'record',
                  onPointerDown: recordRhythmTap,
                  onClick: recordRhythmTap,
                  className: "w-full py-3 rounded-lg text-sm font-black transition-all " +
                    (d.rhythmPhase === 'record' ? 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.99]' : 'bg-slate-100 text-slate-600')
                }, d.rhythmPhase === 'record'
                  ? '\uD83D\uDC4F ' + __alloFmt('stem.music.rhythm_taps_so_far', 'Tap!  ({n} so far)', { n: d.rhythmTapCount || 0 })
                  : '\uD83D\uDC4F ' + __alloT('stem.music.rhythm_tap_prompt', 'Tap area (press Start first)')),

                d.rhythmResult && React.createElement("div", { className: "mt-2 text-[0.6875rem] text-slate-700" },
                  React.createElement("div", { className: "font-bold " + (d.rhythmResult.passed ? 'text-green-700' : 'text-orange-700') },
                    (d.rhythmResult.passed ? '\u2705 ' : '\uD83C\uDFAF ') +
                    __alloFmt('stem.music.rhythm_result_accuracy', '{pct}% accurate', { pct: Math.round(d.rhythmResult.accuracy * 100) })),
                  React.createElement("div", null,
                    __alloFmt('stem.music.rhythm_result_detail', 'On time: {hit} of {total}. Missed: {missed}. Extra: {extra}. Average error: {mean} ms.', {
                      hit: d.rhythmResult.hit,
                      total: d.rhythmResult.hit + d.rhythmResult.missed,
                      missed: d.rhythmResult.missed,
                      extra: d.rhythmResult.extra,
                      mean: d.rhythmResult.meanAbsMs
                    })),
                  d.rhythmResult.hit > 0 && React.createElement("div", { className: "italic text-slate-600" },
                    Math.abs(d.rhythmResult.biasMs) < 10
                      ? __alloT('stem.music.rhythm_bias_centred', 'Your taps sat right on the beat.')
                      : d.rhythmResult.biasMs > 0
                        ? __alloFmt('stem.music.rhythm_bias_late', 'On average you were {n} ms behind the beat.', { n: d.rhythmResult.biasMs })
                        : __alloFmt('stem.music.rhythm_bias_early', 'On average you were {n} ms ahead of the beat.', { n: Math.abs(d.rhythmResult.biasMs) })),
                  d.rhythmResult.expected && React.createElement(VsrTimeline, {
                    React: React, result: d.rhythmResult,
                    label: t('stem.music.rg_timeline', 'Timeline: written notes above, your taps below'),
                    writtenText: t('stem.music.rg_written', 'Written notes'),
                    tapsText: t('stem.music.rg_taps', 'Your taps')
                  })
                ),

                React.createElement("p", { className: "text-[0.6875rem] text-rose-700 mt-2 leading-relaxed" },
                  __alloT('stem.music.rhythm_help', 'You will hear a count-in, then the pattern, then a second count-in. Tap the pattern back during your bar. Timing tolerance scales with the tempo above, so slow it down while you learn a pattern.'))
              ),

              // ── Arpeggiator ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, __alloT('stem.music.arpeggiator', "\uD83C\uDF00 Arpeggiator")),
                  React.createElement("span", { className: "text-[0.6875rem] text-indigo-400 cursor-help", title: EFFECT_TIPS.arpeggiator.text }, "\u2753"),
                  React.createElement("button", {
                    'aria-label': arpOn ? __alloT('stem.music.stop_arpeggiator', 'Stop arpeggiator') : __alloT('stem.music.start_arpeggiator', 'Start arpeggiator'),
                    'aria-pressed': arpOn ? 'true' : 'false',
                    onClick: function () { if (arpOn) stopArpeggiator(); else startArpeggiator(); },
                    className: "ml-auto px-3 py-1 rounded-lg text-xs font-bold " + (arpOn ? 'bg-red-700 text-white' : 'bg-indigo-600 text-white')
                  }, arpOn ? '\u23F9 Stop' : '\u25B6 Start')
                ),
                React.createElement("div", { className: "flex flex-wrap gap-2 items-center" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600" }, __alloT('stem.music.pattern_2', "Pattern")),
                  ['up', 'down', 'updown', 'random'].map(function (pat) {
                    return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_arp_pattern', '{name} pattern', { name: pat }),
                      key: pat,
                      'aria-pressed': arpPattern === pat,
                      onClick: function () { upd('arpPattern', pat); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                      className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold capitalize " + (arpPattern === pat ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600')
                    }, pat);
                  }),
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 ml-2" }, "Oct"),
                  [1, 2, 3, 4].map(function (oc) {
                    return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_octave_range', '{n} octave range', { n: oc }),
                      key: oc,
                      'aria-pressed': (d.arpOctaves || 1) === oc,
                      onClick: function () { upd('arpOctaves', oc); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                      className: "w-6 h-6 rounded text-[0.6875rem] font-bold " + ((d.arpOctaves || 1) === oc ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600')
                    }, oc);
                  }),
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 ml-2" }, __alloT('stem.music.rate', "Rate")),
                  React.createElement("input", { type: "range", 'aria-label': __alloT('stem.music.arpeggiator_rate', 'Arpeggiator rate'), 'aria-valuetext': ((d.arpRate || 150) + ' ms per step'), min: "50", max: "500", step: "10", value: d.arpRate || 150,
                    onChange: function(e) { upd('arpRate', parseInt(e.target.value)); if (arpOn) { stopArpeggiator(); setTimeout(startArpeggiator, 50); } },
                    className: "w-16 accent-indigo-600", title: (d.arpRate || 150) + 'ms'
                  }),
                  React.createElement("span", { className: "text-[0.6875rem] font-mono text-indigo-700 w-10" }, (d.arpRate || 150) + 'ms'),
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 ml-1" }, __alloT('stem.music.gate', "Gate")),
                  React.createElement("input", { type: "range", 'aria-label': __alloT('stem.music.arpeggiator_gate', 'Arpeggiator gate'), 'aria-valuetext': ((d.arpGate || 80) + '% gate'), min: "10", max: "100", step: "5", value: d.arpGate || 80,
                    onChange: function(e) { upd('arpGate', parseInt(e.target.value)); },
                    className: "w-12 accent-indigo-600", title: 'Gate: ' + (d.arpGate || 80) + '%'
                  }),
                  React.createElement("span", { className: "text-[0.6875rem] font-mono text-indigo-700 w-8" }, (d.arpGate || 80) + '%')
                ),
                // Arpeggiator science
                React.createElement("div", { className: "mt-2 bg-indigo-100/50 rounded-lg p-2" },
                  React.createElement("p", { className: "text-[0.6875rem] text-indigo-600 leading-relaxed" },
                    __alloT('stem.music.an_arpeggiator_plays_the_notes_of_a_ch', "\uD83D\uDD2C An arpeggiator plays the notes of a chord one at a time in sequence. \"Up\" goes low to high, creating ascending energy. \"Down\" descends for a cascading feel. Rate controls speed (lower = faster). Gate controls how long each note rings (100% = legato, 10% = staccato). Try rate=100ms + 4 octaves + up pattern for a classic trance arp!")
                  )
                )
              )
            ),

            // ── Live Mic Effects Lab ──
            synthTab === 'play' && React.createElement("div", { className: "bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 rounded-xl border border-rose-200 p-3 mb-3" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-rose-800" }, __alloT('stem.music.live_mic_effects_lab', "\uD83C\uDFA4 Live Mic Effects Lab")),
                React.createElement("span", { className: "text-[0.6875rem] text-rose-700" }, __alloT('stem.music.sing_speak_or_play_an_instrument_hear_', "Sing, speak, or play an instrument \u2014 hear effects in real-time!")),
                React.createElement("button", {
                  onClick: function() {
                    if (d.micActive) {
                      // Stop mic
                      if (window._alloMicStream) { window._alloMicStream.getTracks().forEach(function(t) { t.stop(); }); window._alloMicStream = null; }
                      if (window._alloMicSource) { window._alloMicSource.disconnect(); window._alloMicSource = null; }
                      upd('micActive', false);
                    } else {
                      // Start mic
                      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function(stream) {
                        window._alloMicStream = stream;
                        var audio = getCtx();
                        var source = audio.ctx.createMediaStreamSource(stream);
                        // Create separate analyser for mic visualization
                        var micAnalyser = audio.ctx.createAnalyser(); micAnalyser.fftSize = 2048;
                        window._alloMicAnalyser = micAnalyser;
                        // Route: mic -> effects chain -> analyser (NOT to speakers to avoid feedback)
                        // Create a separate gain for mic monitoring
                        var micGain = audio.ctx.createGain();
                        micGain.gain.value = d.micMonitor ? (d.micVolume || 0.5) : 0;
                        window._alloMicGain = micGain;
                        source.connect(audio.effects.filter); // Through the effects chain
                        source.connect(micAnalyser); // Also to analyser for visualization
                        window._alloMicSource = source;
                        upd('micActive', true);
                        addToast(__alloT('stem.music.mic_connected_apply_effects_with_the_c', '\uD83C\uDFA4 Mic connected! Apply effects with the controls above.'), 'success');
                      }).catch(function(err) {
                        addToast(__alloFmt('stem.music.toast_mic_denied', '\u274C Mic access denied: {reason}', { reason: err.message }), 'error');
                      });
                    }
                  },
                  className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm " + (d.micActive ? 'bg-red-600 text-white animate-pulse' : 'bg-rose-600 text-white hover:bg-rose-700')
                }, d.micActive ? '\u23F9 Stop Mic' : '\uD83C\uDFA4 Start Mic')
              ),

              d.micActive && React.createElement("div", { className: "space-y-3" },
                // Live waveform visualization
                React.createElement("div", { className: "rounded-xl overflow-hidden border border-rose-200", style: { height: '100px' } },
                  React.createElement("canvas", {
                    // Found by hand, not by the scan: this canvas's props object
                    // is too large to parse, so it sat in the "unjudged" bucket
                    // and never appeared in a total. It is live feedback from the
                    // microphone, not decoration, so it is named rather than
                    // hidden.
                    role: 'img',
                    'aria-label': __alloT('stem.music.live_mic_waveform',
                      "Live waveform of the microphone input"),
                    style: { width: '100%', height: '100%', display: 'block', background: '#1a0a1e' },
                    ref: function(canvas) {
                      if (!canvas || canvas._micVizInit) return;
                      canvas._micVizInit = true;
                      var ctx2 = canvas.getContext('2d');
                      if (!ctx2) return;
                      var W = canvas.width = Math.max(2, (canvas.offsetWidth || 300) * 2);
                      var H = canvas.height = 200;
                      // Pre-allocated zero-GC buffers for microphone analyser & peak-hold decay
                      var micTimeBuf = null;
                      var micFreqBuf = null;
                      var micPeakHold = new Float32Array(64);
                      var micPeakVel = new Float32Array(64);
                      function drawMicViz() {
                        // Stop (don't reschedule) when the canvas detaches — the handle was never
                        // stored, so without this the mic-viz rAF + analyser leaked on unmount.
                        if (!canvas.isConnected || !window._alloMicAnalyser) { canvas._micVizInit = false; return; }
                        requestAnimationFrame(drawMicViz);
                        var analyser = window._alloMicAnalyser;
                        var bufLen = analyser.frequencyBinCount;
                        if (!micTimeBuf || micTimeBuf.length !== bufLen) micTimeBuf = new Uint8Array(bufLen);
                        if (!micFreqBuf || micFreqBuf.length !== bufLen) micFreqBuf = new Uint8Array(bufLen);
                        analyser.getByteTimeDomainData(micTimeBuf);
                        analyser.getByteFrequencyData(micFreqBuf);
                        var reduced = musicReducedMotion();
                        var hc = musicHighContrast();
                        // CRT phosphor backdrop wash + subtle scope divider
                        ctx2.fillStyle = hc ? '#000000' : (reduced ? '#14081e' : 'rgba(20,8,30,0.38)');
                        ctx2.fillRect(0, 0, W, H);
                        ctx2.strokeStyle = hc ? 'rgba(255,255,0,0.45)' : 'rgba(244,63,94,0.16)'; ctx2.lineWidth = 1;
                        ctx2.beginPath(); ctx2.moveTo(0, H * 0.5); ctx2.lineTo(W, H * 0.5); ctx2.stroke();
                        // Frequency spectrum (bottom half) with gravity peak-hold decay glow
                        var barW = (W - 14) / 64;
                        for (var bi = 0; bi < 64; bi++) {
                          var val = (micFreqBuf[Math.min(bufLen - 1, bi * 2)] || 0) / 255;
                          var barH = val * H * 0.44;
                          if (barH >= micPeakHold[bi]) { micPeakHold[bi] = barH; micPeakVel[bi] = 0; }
                          else if (reduced) { micPeakHold[bi] = barH; micPeakVel[bi] = 0; }
                          else { micPeakVel[bi] = Math.min(3, micPeakVel[bi] + 0.08); micPeakHold[bi] = Math.max(0, micPeakHold[bi] - micPeakVel[bi]); }
                          var hue = 320 - (bi / 64) * 140;
                          var bw = Math.max(2, barW - 2);
                          if (barH > 1) {
                            ctx2.fillStyle = hc ? '#00ff00' : ('hsla(' + hue + ',88%,58%,' + (0.48 + val * 0.45) + ')');
                            ctx2.fillRect(bi * barW, H - barH, bw, barH);
                            if (!hc) {
                              ctx2.fillStyle = 'hsla(' + hue + ',100%,86%,0.88)';
                              ctx2.fillRect(bi * barW, H - barH - 2, bw, 2.5);
                            }
                          }
                          if (micPeakHold[bi] > 3) {
                            ctx2.fillStyle = hc ? '#ffff00' : ('hsla(' + hue + ',100%,90%,0.85)');
                            ctx2.fillRect(bi * barW, H - micPeakHold[bi] - 4, bw, 2);
                          }
                        }
                        // Quadratic-smoothed dual-pass luminous CRT waveform (top half)
                        ctx2.save();
                        ctx2.lineCap = 'round'; ctx2.lineJoin = 'round';
                        ctx2.beginPath();
                        var stride = Math.max(1, Math.floor(bufLen / 96));
                        var sliceW = (W - 14) / Math.max(1, bufLen - 1);
                        var firstW = true, pwx = 0, pwy = 0;
                        for (var wi = 0; wi < bufLen; wi += stride) {
                          var wx = wi * sliceW;
                          var wy = (micTimeBuf[wi] / 128.0) * H / 4 + H * 0.14;
                          if (firstW) { ctx2.moveTo(wx, wy); firstW = false; }
                          else { ctx2.quadraticCurveTo(pwx, pwy, (pwx + wx) * 0.5, (pwy + wy) * 0.5); }
                          pwx = wx; pwy = wy;
                        }
                        ctx2.lineTo(W - 14, (micTimeBuf[bufLen - 1] / 128.0) * H / 4 + H * 0.14);
                        if (hc) {
                          ctx2.strokeStyle = '#ffff00'; ctx2.lineWidth = 2.4; ctx2.stroke();
                        } else {
                          ctx2.shadowColor = '#fb7185'; ctx2.shadowBlur = 10;
                          ctx2.strokeStyle = 'rgba(244,63,94,0.45)'; ctx2.lineWidth = 4.5; ctx2.stroke();
                          ctx2.shadowBlur = 4; ctx2.strokeStyle = '#fda4af'; ctx2.lineWidth = 2; ctx2.stroke();
                          ctx2.shadowBlur = 0; ctx2.strokeStyle = 'rgba(255,255,255,0.75)'; ctx2.lineWidth = 0.85; ctx2.stroke();
                        }
                        ctx2.restore();
                        // Segmented peak meter
                        var peak = 0; for (var pi = 0; pi < bufLen; pi++) { var pv = Math.abs(micTimeBuf[pi] - 128); if (pv > peak) peak = pv; }
                        var peakPct = peak / 128;
                        ctx2.fillStyle = hc ? '#111111' : 'rgba(255,255,255,0.08)';
                        ctx2.fillRect(W - 9, 4, 7, H - 8);
                        ctx2.fillStyle = hc ? '#ffff00' : (peakPct > 0.8 ? '#ef4444' : peakPct > 0.5 ? '#f59e0b' : '#4ade80');
                        ctx2.fillRect(W - 9, H - 4 - (H - 8) * peakPct, 7, (H - 8) * peakPct);
                        // Labels
                        ctx2.fillStyle = hc ? '#ffff00' : 'rgba(226,232,240,0.62)'; ctx2.font = 'bold 10px system-ui';
                        ctx2.fillText(__alloT('stem.music.canvas_waveform', 'WAVEFORM'), 6, 13);
                        ctx2.fillText(__alloT('stem.music.canvas_spectrum', 'SPECTRUM'), 6, H - 5);
                        ctx2.fillText(Math.round(peakPct * 100) + '%', W - 36, 13);
                      }
                      drawMicViz();
                    }
                  })
                ),

                // Monitor toggle + volume
                React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },
                  React.createElement("label", { className: "flex items-center gap-1 text-[0.6875rem] font-bold text-rose-700 cursor-pointer" },
                    React.createElement("input", { type: "checkbox", checked: !!d.micMonitor,
                      onChange: function() {
                        var newVal = !d.micMonitor; upd('micMonitor', newVal);
                        if (window._alloMicGain) window._alloMicGain.gain.value = newVal ? (d.micVolume || 0.5) : 0;
                      }, className: "rounded"
                    }),
                    __alloT('stem.music.monitor_hear_yourself_use_headphones', "\uD83D\uDD0A Monitor (hear yourself \u2014 use headphones!)")
                  ),
                  d.micMonitor && React.createElement("div", { className: "flex items-center gap-1" },
                    React.createElement("span", { className: "text-[0.6875rem] text-rose-500" }, "Vol"),
                    React.createElement("input", { type: "range", 'aria-label': __alloT('stem.music.microphone_monitor_volume', 'Microphone monitor volume'), 'aria-valuetext': (Math.round((d.micVolume || 0.5) * 100) + '%'), min: "0", max: "1", step: "0.05", value: d.micVolume || 0.5,
                      onChange: function(e) { var v = parseFloat(e.target.value); upd('micVolume', v); if (window._alloMicGain) window._alloMicGain.gain.value = v; },
                      className: "w-16 accent-rose-600"
                    })
                  )
                ),

                // Effect explanation cards
                React.createElement("div", { className: "bg-white/60 rounded-lg p-3 border border-rose-100" },
                  React.createElement("div", { className: "text-[0.6875rem] font-bold text-rose-700 mb-2" }, __alloT('stem.music.how_effects_change_sound_waves', "\uD83D\uDD2C How Effects Change Sound Waves")),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2" },
                    [
                      { name: __alloT('stem.music.filter_cutoff', 'Filter (Cutoff)'), param: 'filterCutoff', icon: '\uD83C\uDF0A', wave: '\u223F\u223F\u223F\u2192\u223F',
                        desc: __alloT('stem.music.removes_frequencies_above_lowpass_or_b', 'Removes frequencies above (lowpass) or below (highpass) a threshold. Like cupping your hand over your mouth \u2014 it removes high frequencies, making sound "darker."'),
                        science: 'A lowpass filter at 1000Hz removes all harmonics above 1kHz. This is why muffled sounds lack "brightness" \u2014 the high-frequency overtones are gone.' },
                      { name: __alloT('stem.music.delay', 'Delay'), param: 'delayMix', icon: '\uD83D\uDD04', wave: '\u223F..\u223F..\u223F',
                        desc: __alloT('stem.music.creates_echoes_by_copying_the_signal_a', 'Creates echoes by copying the signal and playing it back after a short time. Feedback controls how many echoes repeat.'),
                        science: 'Sound travels at ~343 m/s. A 300ms delay simulates a reflection from a wall ~51 meters away (sound travels there and back).' },
                      { name: __alloT('stem.music.reverb_2', 'Reverb'), param: 'reverbMix', icon: '\uD83C\uDFDB\uFE0F', wave: '\u223F\u2248\u2248\u2248\u2248',
                        desc: __alloT('stem.music.simulates_room_acoustics_by_creating_t', 'Simulates room acoustics by creating thousands of tiny echoes that blend together. Small room = short reverb, cathedral = long reverb.'),
                        science: 'Reverb is mathematically modeled as a convolution with an "impulse response" \u2014 a recording of a single clap in a real room.' },
                      { name: __alloT('stem.music.distortion', 'Distortion'), param: 'distAmount', icon: '\u26A1', wave: '\u223F\u2192\u2293',
                        desc: __alloT('stem.music.clips_the_waveform_peaks_turning_smoot', 'Clips the waveform peaks, turning smooth sine waves into harsh, angular shapes. This adds new harmonics that weren\'t in the original sound.'),
                        science: 'Clipping a sine wave creates odd harmonics (3rd, 5th, 7th...). This is why distorted guitar sounds "thick" \u2014 it\'s mathematically richer.' },
                      { name: __alloT('stem.music.chorus', 'Chorus'), param: 'chorusMix', icon: '\u2728', wave: '\u223F+\u223F\u2248\u223F',
                        desc: __alloT('stem.music.duplicates_the_signal_with_a_slight_co', 'Duplicates the signal with a slight, continuously varying delay. This simulates multiple voices/instruments playing together slightly out of time.'),
                        science: 'A chorus uses an LFO (Low Frequency Oscillator) to modulate a delay line between 20-30ms. Our ears hear this as "width" because it mimics natural ensemble playing.' },
                      { name: __alloT('stem.music.tremolo', 'Tremolo'), param: 'tremoloDepth', icon: '\uD83D\uDCA0', wave: '\u223F\u21C5\u223F\u21C5',
                        desc: __alloT('stem.music.rapidly_varies_the_volume_up_and_down_', 'Rapidly varies the volume up and down, creating a pulsating effect. Common in surf guitar and organ music.'),
                        science: 'Tremolo modulates amplitude (volume), while vibrato modulates frequency (pitch). Many people confuse them! Tremolo rate is typically 4-8 Hz.' },
                    ].map(function(effect) {
                      return React.createElement("div", { key: effect.name,
                        className: "bg-white rounded-lg p-2 border border-rose-100 hover:border-rose-300 transition-colors cursor-default"
                      },
                        React.createElement("div", { className: "flex items-center gap-1 mb-1" },
                          React.createElement("span", { className: "text-sm" }, effect.icon),
                          React.createElement("span", { className: "text-[0.6875rem] font-bold text-rose-800" }, effect.name)
                        ),
                        React.createElement("div", { className: "text-[0.75rem] font-mono text-rose-400 mb-1 tracking-widest" }, effect.wave),
                        React.createElement("p", { className: "text-[0.6875rem] text-slate-600 leading-relaxed mb-1" }, effect.desc),
                        React.createElement("p", { className: "text-[0.6875rem] text-rose-500 italic leading-relaxed" }, '\uD83D\uDD2C ' + effect.science)
                      );
                    })
                  )
                ),

                // Safety note
                React.createElement("div", { className: "flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200" },
                  React.createElement("span", { className: "text-sm" }, "\u26A0\uFE0F"),
                  React.createElement("p", { className: "text-[0.6875rem] text-amber-700" }, __alloT('stem.music.use_headphones_when_monitoring_to_avoi', "Use headphones when monitoring to avoid feedback loops! The mic routes through all the effects above (filter, delay, reverb, etc.) \u2014 adjust them to hear how each one transforms your voice or instrument."))
                )
              ),

              // Mic inactive — educational preview
              !d.micActive && React.createElement("div", { className: "text-center py-3" },
                React.createElement("p", { className: "text-[0.6875rem] text-rose-700 mb-2" }, __alloT('stem.music.connect_your_microphone_to_run_your_vo', "Connect your microphone to run your voice or instrument through the effects chain in real-time.")),
                React.createElement("p", { className: "text-[0.6875rem] text-rose-700 italic" }, __alloT('stem.music.see_your_voice_as_a_waveform_frequency', "See your voice as a waveform + frequency spectrum. Hear how filter, delay, reverb, distortion, and chorus physically change sound waves."))
              )
            ),

            // ── XY Performance Pad ──
            synthTab === 'play' && React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-xl border border-indigo-500/30 p-3 mb-3" },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "text-xs font-bold text-indigo-300" }, __alloT('stem.music.xy_performance_pad', "\uD83C\uDFAF XY Performance Pad")),
                React.createElement("span", { className: "text-[0.6875rem] text-indigo-200" }, __alloT('stem.music.touch_drag_x_pitch_y_filter_effect', "Touch & drag \u2014 X = pitch, Y = filter/effect")),
                React.createElement(stableType('Tip', Tip), { id: 'xypad', title: __alloT('stem.music.xy_pad_performance', 'XY Pad Performance'), text: __alloT('stem.music.the_xy_pad_maps_your_finger_mouse_posi', 'The XY pad maps your finger/mouse position to musical parameters in real-time. The X axis controls pitch (left = low, right = high). The Y axis controls the filter cutoff frequency (top = bright, bottom = dark). This is similar to instruments like the Korg Kaoss Pad, which revolutionized live electronic music performance by turning 2D gestures into sound.') })
              ),
              React.createElement("div", {
                style: { position: 'relative', width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', cursor: 'crosshair', touchAction: 'none' },
                className: "border-2 border-indigo-500/40",
                role: 'application', tabIndex: 0,
                'aria-label': __alloT('stem.music.xy_performance_pad_left_right_is_pitch', 'XY performance pad. Left–right is pitch, up–down is filter brightness. Use the arrow keys to move and play a note; press Escape or Space to stop.'),
                onMouseDown: function(e) { upd('xyActive', true); handleXY(e); },
                onMouseMove: function(e) { if (d.xyActive || e.buttons > 0) handleXY(e); },
                onMouseUp: function() { upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); },
                onMouseLeave: function() { if (d.xyActive) { upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); } },
                onKeyDown: function(e) {
                  var step = 8;
                  var x = (d.xyX == null ? 50 : d.xyX), y = (d.xyY == null ? 50 : d.xyY);
                  if (e.key === 'ArrowLeft') x = Math.max(0, x - step);
                  else if (e.key === 'ArrowRight') x = Math.min(100, x + step);
                  else if (e.key === 'ArrowUp') y = Math.max(0, y - step);
                  else if (e.key === 'ArrowDown') y = Math.min(100, y + step);
                  else if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); return; }
                  else return;
                  e.preventDefault(); upd('xyActive', true); processXY(x, y);
                },
                onBlur: function() { if (d.xyActive) { upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); } },
                onTouchStart: function(e) { e.preventDefault(); upd('xyActive', true); handleXYTouch(e); },
                onTouchMove: function(e) { e.preventDefault(); handleXYTouch(e); },
                onTouchEnd: function() { upd('xyActive', false); stopNote('xy_note'); upd('xyX', null); upd('xyY', null); }
              },
                // Background gradient (represents pitch low→high + filter dark→bright)
                React.createElement("div", { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, #1e1b4b, #4338ca, #7c3aed, #c026d3, #f43f5e)', opacity: 0.3 } }),
                React.createElement("div", { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(255,255,255,0.1))' } }),
                // Grid lines
                Array.from({ length: 7 }, function(_, i) {
                  var x = (i + 1) / 8 * 100;
                  return React.createElement("div", { key: 'vl' + i, style: { position: 'absolute', left: x + '%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)' } });
                }),
                Array.from({ length: 3 }, function(_, i) {
                  var y = (i + 1) / 4 * 100;
                  return React.createElement("div", { key: 'hl' + i, style: { position: 'absolute', top: y + '%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.08)' } });
                }),
                // Axis labels
                React.createElement("div", { style: { position: 'absolute', bottom: '4px', left: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 700 } }, __alloT('stem.music.low', '\u2190 LOW')),
                React.createElement("div", { style: { position: 'absolute', bottom: '4px', right: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 700 } }, __alloT('stem.music.high', 'HIGH \u2192')),
                React.createElement("div", { style: { position: 'absolute', top: '4px', left: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 700 } }, __alloT('stem.music.bright_2', '\u2191 BRIGHT')),
                React.createElement("div", { style: { position: 'absolute', bottom: '18px', left: '8px', color: 'rgba(255,255,255,0.2)', fontSize: '9px', fontWeight: 700 } }, __alloT('stem.music.dark', '\u2193 DARK')),
                // Touch point indicator
                (d.xyX !== null && d.xyX !== undefined) && React.createElement("div", { style: {
                  position: 'absolute', left: d.xyX + '%', top: d.xyY + '%', transform: 'translate(-50%,-50%)',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(168,85,247,0.8), rgba(168,85,247,0))',
                  border: '2px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(168,85,247,0.2)',
                  transition: 'none', pointerEvents: 'none'
                } }),
                // Trail dots
                (Array.isArray(d.xyTrail) ? d.xyTrail : []).map(function(pt, i) {
                  return React.createElement("div", { key: i, style: {
                    position: 'absolute', left: pt.x + '%', top: pt.y + '%', transform: 'translate(-50%,-50%)',
                    width: (4 + i * 0.5) + 'px', height: (4 + i * 0.5) + 'px', borderRadius: '50%',
                    background: 'rgba(168,85,247,' + (0.1 + i * 0.03) + ')', pointerEvents: 'none'
                  } });
                }),
                // Note name display
                typeof d.xyNoteName === 'string' && d.xyNoteName && React.createElement("div", { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '24px', fontWeight: 900, pointerEvents: 'none', textShadow: '0 0 20px rgba(168,85,247,0.8)' } }, d.xyNoteName)
              ),
              // XY Mode selector
              React.createElement("div", { className: "flex flex-wrap gap-2 mt-2 items-center" },
                React.createElement("span", { className: "text-[0.6875rem] font-bold text-indigo-200" }, "Y-Axis:"),
                ['filter', 'volume', 'vibrato', 'reverb'].map(function(mode) {
                  return React.createElement("button", { key: mode,
                    'aria-pressed': (d.xyMode || 'filter') === mode,
                    onClick: function() { upd('xyMode', mode); },
                    className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold capitalize transition-all " + ((d.xyMode || 'filter') === mode ? 'bg-indigo-600 text-white' : 'bg-white/10 text-indigo-200 hover:bg-white/20')
                  }, mode);
                }),
                React.createElement("span", { className: "text-[0.6875rem] font-bold text-indigo-200 ml-auto" }, "Scale:"),
                React.createElement("select", { value: d.xyScale || 'chromatic',
                  'aria-label': __alloT('stem.music.scale', "Scale"),
                  onChange: function(e) { upd('xyScale', e.target.value); },
                  className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-white/10 text-indigo-200 border border-indigo-500/30"
                },
                  React.createElement("option", { value: 'chromatic' }, __alloT('stem.music.chromatic', "Chromatic")),
                  React.createElement("option", { value: 'major' }, __alloT('stem.music.major_2', "Major")),
                  React.createElement("option", { value: 'minor' }, __alloT('stem.music.minor_2', "Minor")),
                  React.createElement("option", { value: 'pentatonic' }, __alloT('stem.music.pentatonic_2', "Pentatonic")),
                  React.createElement("option", { value: 'blues' }, __alloT('stem.music.blues_2', "Blues"))
                )
              )
            ),

            // ═══════════ COMPOSE — redirect to Production Studio ═══════════
            synthTab === 'play' && React.createElement("div", { className: "mt-3" },
              React.createElement("div", { 
                onClick: function () { upd('synthTab', 'beatpad'); },
                className: "bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4 cursor-pointer hover:shadow-md hover:from-purple-100 hover:to-pink-100 transition-all group"
              },
                React.createElement("div", { className: "flex items-center gap-3" },
                  React.createElement("span", { className: "text-3xl" }, "\uD83E\uDD41"),
                  React.createElement("div", null,
                    React.createElement("div", { className: "transition-colors text-sm font-bold text-purple-700 group-hover:text-purple-800" }, __alloT('stem.music.production_studio', "Production Studio")),
                    React.createElement("div", { className: "text-[0.6875rem] text-purple-700" }, __alloT('stem.music.sequencer_drum_pads_notation_samples_m', "Sequencer, drum pads, notation, samples & more \u2192"))
                  ),
                  React.createElement("span", { className: "ml-auto text-purple-700 group-hover:text-purple-600 text-lg transition-transform group-hover:translate-x-1" }, "\u2192")
                )
              )
            ),

            // ═══════════ TAB: SCALES ═══════════
            synthTab === 'scales' && React.createElement("div", null,
              // Scales & Modes
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, __alloT('stem.music.scales_modes', "\uD83C\uDFB5 Scales & Modes")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.scales.text }, "\u2753")
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-3" },
                  Object.keys(SCALES).map(function (name) {
                    var s = SCALES[name];
                    return React.createElement("button", { "aria-label": name + " scale",
                      key: name,
                      'aria-pressed': selectedScale === name,
                      onClick: function () { upd('selectedScale', name); noteScaleTried(name); playScale(selectedRoot, name, false); },
                      className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (selectedScale === name ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-50')
                    }, name);
                  })
                ),
                selectedScale && SCALES[selectedScale] && React.createElement("div", { className: "bg-purple-50 rounded-lg p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-xs font-bold text-purple-700" }, selectedRoot + " " + selectedScale),
                    React.createElement("button", { "aria-label": __alloT('stem.music.play_ascending', "Play Ascending"),
                      onClick: function () { playScale(selectedRoot, selectedScale, false); },
                      className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-purple-600 text-white"
                    }, __alloT('stem.music.play_ascending_2', "\u25B6 Play Ascending")),
                    React.createElement("button", { "aria-label": __alloT('stem.music.descending', "Descending"),
                      onClick: function () { playScale(selectedRoot, selectedScale, true); },
                      className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-purple-700 text-white"
                    }, __alloT('stem.music.descending_2', "\u25BC Descending"))
                  ),
                  React.createElement("p", { className: "text-[0.6875rem] text-purple-600 mb-1.5" }, SCALES[selectedScale].desc),
                  React.createElement("div", { className: "flex items-stretch gap-0.5" },
                    SCALES[selectedScale].intervals.map(function (intv, i) {
                      var nIdx = (rootIdx + intv) % 12;
                      var intervals = SCALES[selectedScale].intervals;
                      // INTERVAL_FROM_ROOT names — what each scale degree is called from the tonic
                      var intervalNames = ['R', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'];
                      var degreeLabel = i === 0 ? 'Root' : intervalNames[intv] || (intv + ' semi');
                      // Gap to next note (W = whole step, H = half step, A = augmented 2nd, etc.)
                      var gapEl = null;
                      if (i < intervals.length - 1) {
                        var gap = intervals[i + 1] - intervals[i];
                        var gapLabel = gap === 1 ? 'H' : gap === 2 ? 'W' : gap === 3 ? 'A' : gap + 's';
                        var gapColor = gap === 1 ? 'bg-amber-200 text-amber-900' : gap === 2 ? 'bg-indigo-200 text-indigo-900' : 'bg-rose-200 text-rose-900';
                        var gapTitle = gap === 1 ? 'Half step (1 semitone)' : gap === 2 ? 'Whole step (2 semitones)' : gap === 3 ? 'Augmented 2nd (3 semitones)' : (gap + ' semitones');
                        gapEl = React.createElement("div", {
                          key: 'gap' + i,
                          className: 'self-center px-1.5 py-1 rounded text-[0.625rem] font-black ' + gapColor,
                          title: gapTitle
                        }, gapLabel);
                      }
                      return [
                        React.createElement("button", {
                          key: i, type: 'button',
                          onClick: function () { playNoteFor(noteFreq(NOTE_NAMES[nIdx], d.octave || 4), 'scale_note_' + i, 500); },
                          className: "flex-1 py-2 rounded-lg text-center cursor-pointer transition-all bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100"
                        },
                          React.createElement("span", { className: "text-xs font-bold text-purple-700 block" }, NOTE_NAMES[nIdx]),
                          React.createElement("span", { className: "text-[0.6875rem] text-purple-700" }, degreeLabel)
                        ),
                        gapEl
                      ];
                    })
                  ),
                  React.createElement("p", { className: "text-[0.625rem] text-purple-700 italic mt-2 text-center" },
                    __alloT('stem.music.tags_between_notes', "Tags between notes: "), React.createElement("b", null, "W"), __alloT('stem.music.whole_step', " = whole step · "),
                    React.createElement("b", null, "H"), __alloT('stem.music.half_step', " = half step · "),
                    React.createElement("b", null, "A"), __alloT('stem.music.augmented_2nd', " = augmented 2nd"))
                ),
                // Science box
                selectedScale && SCALES[selectedScale] && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-3 border" },
                  React.createElement("p", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-1" }, __alloT('stem.music.the_science', "\uD83D\uDD2C The Science")),
                  React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, SCALES[selectedScale].science)
                )
              ),

              // Waveform Science (moved from Sound Lab)
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("span", { className: "text-sm font-bold text-slate-800 block mb-3" }, __alloT('stem.music.waveform_science', "\u223F Waveform Science")),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  Object.keys(WAVE_INFO).map(function (wType) {
                    var wi = WAVE_INFO[wType];
                    var isActive = (["sine","square","sawtooth","triangle"].indexOf(d.waveType) !== -1 ? d.waveType : 'sine') === wType;
                    var pickWave = function () { upd('waveType', wType); playNoteFor(noteFreq(selectedRoot, d.octave || 4), 'demo_' + wType, 800); };
                    return React.createElement("div", {
                      key: wType, role: 'button', tabIndex: 0, 'aria-pressed': isActive ? 'true' : 'false',
                      onClick: pickWave, onKeyDown: musKeyAct(pickWave),
                      className: "p-3 rounded-xl border-2 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 " + (isActive ? 'border-purple-400 bg-purple-50 shadow-md' : 'border-slate-200 bg-slate-50 hover:border-purple-200')
                    },
                      React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                        React.createElement("span", { className: "text-lg" }, wi.emoji),
                        React.createElement("span", { className: "text-xs font-bold text-slate-800 capitalize" }, wType)
                      ),
                      React.createElement("p", { className: "text-[0.6875rem] text-slate-600 mb-1" }, wi.desc),
                      React.createElement("p", { className: "text-[0.6875rem] text-purple-600 font-bold" }, "Harmonics: " + wi.harmonics),
                      React.createElement("p", { className: "text-[0.6875rem] text-slate-600 leading-snug mt-1" }, wi.science)
                    );
                  })
                )
              )
            ),

            // ═══════════ TAB: CHORDS ═══════════
            synthTab === 'chords' && React.createElement("div", null,
              // Chord Explorer
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, __alloT('stem.music.chord_explorer', "\uD83C\uDFB6 Chord Explorer")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.chords.text }, "\u2753"),
                  React.createElement("button", { "aria-label": __alloT('stem.music.jazz_mode_3', "Jazz Mode"),
                    'aria-pressed': !!jazzMode,
                    onClick: function () { upd('jazzMode', !jazzMode); },
                    className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold ml-auto " + (jazzMode ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600')
                  }, __alloT('stem.music.jazz_mode_4', "\uD83C\uDFB7 Jazz Mode"))
                ),
                React.createElement("div", { className: "flex flex-wrap gap-1 mb-3" },
                  (jazzMode ? ['Maj7', 'Min7', 'Dom7', 'dim7', 'Min9', 'Maj9', '9', '13', '6', 'min6', 'add9'] : Object.keys(CHORDS).filter(function (k) { return ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'Sus2', 'Sus4', 'Power'].indexOf(k) !== -1; })).map(function (chType) {
                    var chord = CHORDS[chType]; if (!chord) return null;
                    return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_chord_named', 'Chord: {root} {type}', { root: selectedRoot, type: chType }),
                      key: chType,
                      'aria-pressed': selectedChord === chType,
                      onClick: function () { upd('selectedChord', chType); upd('chordRoot', selectedRoot); playChord(selectedRoot, chType, chordInversion); },
                      className: "px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all " + (selectedChord === chType ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600')
                    }, selectedRoot + chord.symbol);
                  })
                ),
                // Inversion selector
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase" }, __alloT('stem.music.inversion_2', "Inversion")),
                  [0, 1, 2].map(function (inv) {
                    return React.createElement("button", { "aria-label": inv === 0 ? __alloT('stem.music.aria_inversion_root', 'Inversion: root position') : inv === 1 ? __alloT('stem.music.aria_inversion_first', 'Inversion: first') : __alloT('stem.music.aria_inversion_second', 'Inversion: second'),
                      key: inv,
                      'aria-pressed': chordInversion === inv,
                      onClick: function () { upd('chordInversion', inv); if (selectedChord) playChord(selectedRoot, selectedChord, inv); },
                      className: "px-2 py-0.5 rounded text-[0.6875rem] font-bold " + (chordInversion === inv ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600')
                    }, inv === 0 ? 'Root' : inv === 1 ? '1st Inv' : '2nd Inv');
                  }),
                  React.createElement("button", { "aria-label": __alloT('stem.music.strum_chord_2', "Strum chord"),
                    onClick: function () { if (selectedChord) strumChord(selectedRoot, selectedChord, chordInversion, 40, 'up'); },
                    className: "transition-colors ml-auto px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200"
                  }, __alloT('stem.music.strum', "\uD83C\uDFB8 Strum"))
                ),
                // Chord info panel
                selectedChord && CHORDS[selectedChord] && React.createElement("div", { className: "bg-purple-50 rounded-lg p-3" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-sm font-bold text-purple-700" }, selectedRoot + CHORDS[selectedChord].symbol),
                    React.createElement("span", { className: "text-xs text-purple-700" }, CHORDS[selectedChord].desc)
                  ),
                  React.createElement("div", { className: "flex gap-1 mb-2" },
                    CHORDS[selectedChord].intervals.map(function (intv, i) {
                      var nIdx = (NOTE_NAMES.indexOf(selectedRoot) + intv) % 12;
                      return React.createElement("button", {
                        key: i, type: 'button',
                        onClick: function () { playNoteFor(noteFreq(NOTE_NAMES[nIdx], d.octave || 4), 'chord_note_' + i, 500); },
                        className: "flex-1 py-2 rounded-lg text-center cursor-pointer bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-100 transition-all"
                      },
                        React.createElement("span", { className: "text-xs font-bold text-purple-700" }, NOTE_NAMES[nIdx]),
                        React.createElement("span", { className: "text-[0.6875rem] text-purple-700 block" }, i === 0 ? 'Root' : intv + ' semi')
                      );
                    })
                  ),
                  React.createElement("p", { className: "text-[0.6875rem] text-slate-600 leading-relaxed" }, "\uD83D\uDD2C " + CHORDS[selectedChord].science)
                )
              ),

              // Chord Progressions
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("span", { className: "text-sm font-bold text-slate-800 block mb-3" }, __alloT('stem.music.chord_progressions_2', "\uD83C\uDFB6 Chord Progressions")),
                React.createElement("div", { className: "grid grid-cols-3 gap-1.5" },
                  PROGRESSIONS.map(function (prog) {
                    return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_play_progression', 'Play progression: {name}', { name: prog.name }),
                      key: prog.name,
                      onClick: function () { playProgression(prog); },
                      className: "text-left px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-400 hover:border-purple-600 hover:bg-purple-50 transition-all group"
                    },
                      React.createElement("span", { className: "transition-colors text-[0.6875rem] font-bold text-slate-700 group-hover:text-purple-700 block" }, prog.name),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600" }, prog.desc)
                    );
                  })
                )
              ),

              // Circle of Fifths
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, __alloT('stem.music.circle_of_fifths', "\u2B55 Circle of Fifths")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.circleOfFifths.text }, "\u2753")
                ),
                React.createElement("svg", { role: 'group', 'aria-label': __alloT('stem.music.fifths_img_label', 'Circle of fifths'), viewBox: "0 0 300 300", className: "w-full mx-auto", style: { maxWidth: '300px', maxHeight: '300px' } },
                  React.createElement("style", null, ".music-cof-key:focus{outline:none}.music-cof-key:focus-visible .music-cof-ring{stroke:#7c3aed;stroke-width:3}"),
                  // Background
                  React.createElement("circle", { cx: 150, cy: 150, r: 140, fill: "none", stroke: "#e2e8f0", strokeWidth: 2 }),
                  React.createElement("circle", { cx: 150, cy: 150, r: 100, fill: "none", stroke: "#e2e8f0", strokeWidth: 1, strokeDasharray: "4 4" }),
                  // Keys around the circle
                  CIRCLE_OF_FIFTHS.map(function (entry, idx) {
                    var angle = (idx * 30 - 90) * Math.PI / 180;
                    var outerX = 150 + 120 * Math.cos(angle);
                    var outerY = 150 + 120 * Math.sin(angle);
                    var innerX = 150 + 85 * Math.cos(angle);
                    var innerY = 150 + 85 * Math.sin(angle);
                    var circleKey = entry.key.indexOf('/') !== -1 ? entry.key.split('/')[0] : entry.key;
                    var isSelected = circleKey === selectedRoot || entry.key === selectedRoot;
                    var pickKey = function () { upd('selectedRoot', circleKey); playChord(circleKey, 'Major', 0); };
                    return React.createElement("g", { key: entry.key, className: "cursor-pointer music-cof-key", role: 'button', tabIndex: 0, 'aria-pressed': isSelected ? 'true' : 'false',
                      'aria-label': __alloFmt('stem.music.aria_fifths_key', '{key} major (relative minor {minor}): select and play', { key: entry.key, minor: entry.minor }),
                      onClick: pickKey, onKeyDown: musKeyAct(pickKey) },
                      React.createElement("circle", { className: 'music-cof-ring', cx: outerX, cy: outerY, r: 22, fill: 'none', stroke: 'transparent' }),
                      React.createElement("circle", { cx: outerX, cy: outerY, r: isSelected ? 18 : 15, fill: isSelected ? '#7c3aed' : '#f8fafc', stroke: isSelected ? '#5b21b6' : '#cbd5e1', strokeWidth: isSelected ? 2 : 1 }),
                      React.createElement("text", { x: outerX, y: outerY + 4, textAnchor: "middle", fill: isSelected ? '#fff' : '#334155', style: { fontSize: '11px', fontWeight: 'bold' } }, entry.key),
                      React.createElement("text", { x: innerX, y: innerY + 3, textAnchor: "middle", fill: '#94a3b8', style: { fontSize: '8px' } }, entry.minor)
                    );
                  })
                )
              ),

              // Barry Harris Harmony
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, __alloT('stem.music.barry_harris_harmony', "\uD83C\uDFB7 Barry Harris Harmony")),
                  React.createElement("span", { className: "text-[0.6875rem] text-amber-700" }, "(1929-2021)")
                ),
                React.createElement("p", { className: "text-[0.6875rem] text-amber-700 mb-3 leading-relaxed" }, BARRY_HARRIS.desc),
                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[0.6875rem] font-bold text-amber-700 mb-1" }, __alloT('stem.music.major_6th_diminished_scale', "Major 6th Diminished Scale")),
                    React.createElement("div", { className: "flex flex-wrap gap-1" },
                      BARRY_HARRIS.majorScale(rootIdx).map(function (chord, i) {
                        var bhName = barryHarrisChordName(rootIdx, chord);
                        return React.createElement("button", { "aria-label": __alloT('stem.music.play_chord_named', 'Play chord') + ' ' + bhName,
                          key: i,
                          onClick: function () { playChord(NOTE_NAMES[(rootIdx + chord.degree) % 12], chord.type, 0); },
                          className: "px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all " + (chord.type === 'dim7' ? 'bg-red-100 text-red-800 border border-red-600 hover:bg-red-200' : 'bg-amber-100 text-amber-800 border border-amber-600 hover:bg-amber-200')
                        }, bhName);
                      })
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[0.6875rem] font-bold text-amber-700 mb-1" }, __alloT('stem.music.minor_6th_diminished_scale_2', "Minor 6th Diminished Scale")),
                    React.createElement("div", { className: "flex flex-wrap gap-1" },
                      BARRY_HARRIS.minorScale(rootIdx).map(function (chord, i) {
                        var bhNameMin = barryHarrisChordName(rootIdx, chord);
                        return React.createElement("button", { "aria-label": __alloT('stem.music.play_chord_named', 'Play chord') + ' ' + bhNameMin,
                          key: i,
                          onClick: function () { playChord(NOTE_NAMES[(rootIdx + chord.degree) % 12], chord.type, 0); },
                          className: "px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all " + (chord.type === 'dim7' ? 'bg-red-100 text-red-800 border border-red-600 hover:bg-red-200' : 'bg-amber-100 text-amber-800 border border-amber-600 hover:bg-amber-200')
                        }, bhNameMin);
                      })
                    )
                  )
                )
              )
            ),




            // ═══════════ TAB: BEAT PAD (Production Studio) ═══════════
            synthTab === 'beatpad' && React.createElement("div", { className: "animate-in fade-in duration-200" },

              // ── Header + Kit Selector ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" },
                React.createElement("span", { className: "text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r " + (isDark ? "from-pink-400 to-purple-400" : "from-pink-700 to-purple-700") }, __alloT('stem.music.production_studio_2', "\uD83E\uDD41 Production Studio")),
                d.samplesLoading && React.createElement("span", { className: "text-[0.6875rem] text-amber-700 animate-pulse font-bold" }, __alloT('stem.music.loading_samples', "\u23F3 Loading samples...")),
                d.activeKit && React.createElement("span", { className: "text-[0.6875rem] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold" }, "\u2705 " + (SAMPLE_KITS[d.activeKit] || {}).name),
                React.createElement("div", { className: "flex gap-1 ml-auto flex-wrap" },
                  Object.keys(SAMPLE_KITS).map(function (kitId) {
                    var kit = SAMPLE_KITS[kitId]; var isActive = (d.activeKit || '') === kitId; var isLoaded = !!window._alloSampleCache[kitId];
                    return React.createElement("button", { "aria-label": (kit ? kit.name : kitId) + " drum kit", key: kitId, 'aria-pressed': isActive, onClick: function () { if (isLoaded) upd('activeKit', kitId); else loadSampleKit(kitId); },
                      className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (isActive ? 'bg-purple-600 text-white shadow-md' : isLoaded ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),
                      title: isLoaded ? 'Switch to ' + kit.name : 'Click to download ' + kit.name
                    }, kit.icon + ' ' + kit.name + (isLoaded ? '' : ' \u2B07'));
                  })
                )
              ),

              // ── MPC Drum Pads ──
              React.createElement("div", { className: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-3 mb-3 shadow-xl border border-slate-700/50" },
                d.bpStepRec && React.createElement("div", { className: "flex items-center gap-2 mb-2 px-2 py-1 bg-red-900/40 rounded-lg border border-red-500/30" },
                  React.createElement("span", { className: "w-2 h-2 rounded-full bg-red-500 animate-pulse" }),
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-red-300" }, "STEP REC \u2022 Step " + ((d.bpStepRecPos || 0) + 1) + "/16"),
                  React.createElement("span", { className: "text-[0.6875rem] text-red-400/60" }, __alloT('stem.music.tap_pads_to_place_beats', "Tap pads to place beats"))
                ),
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  BEAT_PAD_SOUNDS.map(function (sound, idx) {
                    var isHit = d['padHit_' + idx];
                    return React.createElement("button", { "aria-label": sound.type + " drum pad",
                      key: sound.type,
                      onMouseDown: function () {
                        playSample(sound.type, idx);
                        stepRecHit(idx);
                        upd('padHit_' + idx, true); setTimeout(function () { upd('padHit_' + idx, false); }, 120);
                      },
                      className: "relative h-14 rounded-xl font-bold text-white text-xs select-none transition-all duration-75 " + (isHit ? 'scale-[0.93] brightness-150 shadow-lg ring-2 ring-white/40' : 'hover:scale-[1.02] shadow-md hover:shadow-lg'),
                      style: { background: isHit ? sound.color : 'linear-gradient(145deg, ' + sound.color + '55, ' + sound.color + '99)', border: '1px solid ' + sound.color + '44' }
                    },
                      React.createElement("div", { className: "text-[0.6875rem] font-bold drop-shadow-sm" }, sound.label),
                      React.createElement("div", { className: "text-[0.6875rem] opacity-40 mt-0.5 font-mono" }, sound.key)
                    );
                  })
                )
              ),

              // ── Waveform Visualizer ──
              React.createElement("div", { className: "mb-3 rounded-xl overflow-hidden shadow-inner border border-indigo-900/30", style: { height: '48px' } },
                React.createElement("canvas", { role: "img", tabIndex: 0, "aria-label": __alloT('stem.music.note_and_beat_pattern_strip', "Note and beat pattern strip."), ref: _bpCanvasRef, width: 600, height: 48, className: "w-full h-full", style: { background: '#1e1b4b' } })
              ),

              // ── Transport Bar (enhanced) ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border border-purple-200/50 p-2 flex-wrap" },
                React.createElement("button", {
                  'aria-label': d.seqPlaying ? __alloT('stem.music.stop_sequencer', 'Stop the beat') : __alloT('stem.music.play_sequencer', 'Play the beat'),
                  'aria-pressed': d.seqPlaying ? 'true' : 'false',
                  onClick: function () { if (d.seqPlaying) stopSequencer(); else startSequencer(); },
                  className: "px-4 py-2 rounded-lg text-sm font-bold transition-all " + (d.seqPlaying ? 'bg-red-700 text-white shadow-inner' : 'bg-gradient-to-r from-green-700 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-700 shadow-md')
                }, d.seqPlaying ? '\u23F9 Stop' : '\u25B6 Play'),
                // BPM
                React.createElement("div", { className: "flex items-center gap-1" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600" }, "BPM"),
                  React.createElement("input", { type: "range", 'aria-label': __alloT('stem.music.sequencer_bpm', 'Sequencer BPM'), 'aria-valuetext': ((d.seqBPM || 120) + ' BPM'), min: BPM_MIN, max: BPM_MAX, step: 1, value: tempoBPM, onChange: function (e) { upd('seqBPM', safeBPM(e.target.value)); }, className: "w-20 accent-purple-600" }),
                  React.createElement("span", { className: "text-xs font-bold text-purple-700 w-8 text-center" }, d.seqBPM || 120)
                ),
                // Tap Tempo
                React.createElement("button", { "aria-label": __alloT('stem.music.tap_2', "Tap"), onClick: tapTempo, className: "px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all border border-amber-600" }, __alloT('stem.music.tap', "\uD83E\uDD4A Tap")),
                // Pattern Length
                React.createElement("select", { "aria-label": __alloT('stem.music.pattern_length', "Pattern length"), value: String(d.bpPatternLen || 16), onChange: function (e) { upd('bpPatternLen', parseInt(e.target.value)); }, className: "px-2 py-1 rounded text-[0.6875rem] font-bold bg-white border border-slate-500", title: __alloT('stem.music.pattern_length_in_steps', "Pattern length in steps") },
                  React.createElement("option", { value: '8' }, __alloT('stem.music.8_steps', "8 steps")),
                  React.createElement("option", { value: '16' }, __alloT('stem.music.16_steps', "16 steps")),
                  React.createElement("option", { value: '32' }, __alloT('stem.music.32_steps', "32 steps")),
                  React.createElement("option", { value: '64' }, __alloT('stem.music.64_steps', "64 steps"))
                ),
                // Swing
                React.createElement("select", { "aria-label": __alloT('stem.music.swing', "Swing"), value: d.seqSwing || '0', onChange: function (e) { upd('seqSwing', e.target.value); }, className: "px-2 py-1 rounded text-[0.6875rem] font-bold bg-white border border-slate-500" },
                  React.createElement("option", { value: '0' }, __alloT('stem.music.no_swing', "No Swing")),
                  React.createElement("option", { value: '15' }, __alloT('stem.music.swing_15', "Swing 15%")),
                  React.createElement("option", { value: '30' }, __alloT('stem.music.swing_30', "Swing 30%")),
                  React.createElement("option", { value: '50' }, __alloT('stem.music.swing_50', "Swing 50%"))
                ),
                // Undo / Redo
                React.createElement("div", { className: "flex gap-1" },
                  React.createElement("button", { onClick: bpUndo, disabled: !(window._bpUndoStack || []).length, className: "px-2 py-1 rounded text-[0.6875rem] font-bold transition-all " + ((window._bpUndoStack || []).length ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-600 cursor-not-allowed') }, "\u21A9 " + (window._bpUndoStack || []).length),
                  React.createElement("button", { onClick: bpRedo, disabled: !(window._bpRedoStack || []).length, className: "px-2 py-1 rounded text-[0.6875rem] font-bold transition-all " + ((window._bpRedoStack || []).length ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-50 text-slate-600 cursor-not-allowed') }, "\u21AA " + (window._bpRedoStack || []).length)
                ),
                // Step Rec toggle
                React.createElement("button", { 'aria-pressed': !!d.bpStepRec, onClick: function () { upd('bpStepRec', !d.bpStepRec); upd('bpStepRecPos', 0); }, className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (d.bpStepRec ? 'bg-red-700 text-white shadow-inner animate-pulse' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-600') }, d.bpStepRec ? '\u23FA REC' : '\u26AB REC'),
                // Clear
                React.createElement("button", { "aria-label": __alloT('stem.music.clear_all_beats', "Clear all beats"), onClick: function () { pushBpUndo(); upd('seqGrid', {}); upd('beatMelody', null); }, className: "ml-auto px-2 py-1 rounded text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 transition-all" }, __alloT('stem.music.clear', "\uD83D\uDDD1 Clear"))
              ),

              // ── Pattern Selector (A/B/C/D) ──
              React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600" }, __alloT('stem.music.pattern_3', "Pattern")),
                ['A', 'B', 'C', 'D'].map(function (p) {
                  var isActive = (d.bpActivePattern || 'A') === p;
                  var colors = { A: 'purple', B: 'blue', C: 'emerald', D: 'amber' };
                  var c = colors[p];
                  return React.createElement("button", { key: p,
                    'aria-pressed': isActive,
                    onClick: function () {
                      // Save current grid to current pattern
                      var pats = Object.assign({}, d.bpPatterns || {});
                      var cur = d.bpActivePattern || 'A';
                      pats[cur] = { grid: Object.assign({}, d.seqGrid || {}), melody: (d.beatMelody || []).slice() };
                      // Switch to new pattern
                      var target = pats[p] || { grid: {}, melody: [] };
                      upd('seqGrid', Object.assign({}, target.grid || {}));
                      upd('beatMelody', target.melody ? target.melody.slice() : null);
                      upd('bpPatterns', pats);
                      upd('bpActivePattern', p);
                    },
                    className: "w-8 h-8 rounded-lg text-xs font-black transition-all " + (isActive ? 'bg-' + c + '-600 text-white shadow-md scale-110' : 'bg-' + c + '-50 text-' + c + '-600 border border-' + c + '-200 hover:bg-' + c + '-100')
                  }, p);
                }),
                React.createElement("div", { className: "border-l border-slate-200 h-6 mx-1" }),
                React.createElement("button", { "aria-label": __alloT('stem.music.aria_chain_patterns', 'Chain patterns'),
                  'aria-pressed': !!d.bpChainMode,
                  onClick: function () { upd('bpChainMode', !d.bpChainMode); },
                  className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (d.bpChainMode ? 'bg-orange-700 text-white' : 'bg-orange-50 text-orange-700 border border-orange-600 hover:bg-orange-100')
                }, "\uD83D\uDD17 Chain " + (d.bpChainMode ? 'ON' : 'OFF')),
                d.bpChainMode && React.createElement("span", { className: "text-[0.6875rem] text-orange-500" }, __alloT('stem.music.a_b_c_d_loop', "A\u2192B\u2192C\u2192D loop"))
              ),

              // ── EDM Preset Buttons ──
              React.createElement("div", { className: "flex gap-1.5 mb-3 flex-wrap" },
                Object.keys(SEQ_PRESETS).map(function (key) {
                  return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_load_preset', 'Load {name} preset', { name: key }), key: key, onClick: function () { pushBpUndo(); upd('seqGrid', Object.assign({}, SEQ_PRESETS[key].grid)); },
                    className: "px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-600 hover:from-purple-100 hover:to-pink-100 hover:shadow-sm transition-all"
                  }, "\uD83C\uDFB5 " + SEQ_PRESETS[key].name);
                })
              ),

              // ── Mixer Panel (collapsible) ──
              React.createElement("div", { className: "bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-400 mb-3 overflow-hidden" },
                React.createElement("button", { "aria-label": __alloT('stem.music.toggle_mixer_panel', "Toggle mixer panel"), onClick: function () { upd('bpMixerOpen', !d.bpMixerOpen); }, className: "w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 transition-all" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, __alloT('stem.music.mixer', "\uD83C\uDFA8 Mixer")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600" }, __alloT('stem.music.volume_mute_solo', "Volume \u2022 Mute \u2022 Solo")),
                  React.createElement("span", { className: "ml-auto text-slate-600 text-[0.6875rem] transition-transform " + (d.bpMixerOpen ? 'rotate-180' : '') }, "\u25BC")
                ),
                d.bpMixerOpen && React.createElement("div", { className: "px-3 pb-3" },
                  BEAT_PAD_SOUNDS.slice(0, 8).map(function (sound, row) {
                    var vol = getChVol(row);
                    var muted = !!(d.chMutes && d.chMutes[row]);
                    var soloed = d.chSolo === row;
                    return React.createElement("div", { key: sound.type, className: "flex items-center gap-2 py-0.5" },
                      React.createElement("span", { className: "text-[0.6875rem] font-bold w-12 text-right truncate", style: { color: sound.color } }, sound.label),
                      React.createElement("input", { type: "range", 'aria-label': sound.label + ' channel volume', 'aria-valuetext': (Math.round(vol * 100) + '%'), min: 0, max: 100, value: Math.round(vol * 100),
                        onChange: function (e) { var v = Object.assign({}, d.chVolumes || {}); v[row] = parseInt(e.target.value) / 100; upd('chVolumes', v); },
                        className: "flex-1 h-6 accent-purple-500", style: { maxWidth: '120px' }
                      }),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 w-7 text-right" }, Math.round(vol * 100) + '%'),
                      React.createElement("button", { 'aria-pressed': !!muted, 'aria-label': __alloFmt('stem.music.aria_mute_channel', 'Mute {name}', { name: sound.label }), onClick: function () { var m = Object.assign({}, d.chMutes || {}); m[row] = !m[row]; upd('chMutes', m); },
                        className: "w-5 h-5 rounded text-[0.6875rem] font-black " + (muted ? 'bg-red-700 text-white' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }, "M"),
                      React.createElement("button", { 'aria-pressed': !!soloed, 'aria-label': __alloFmt('stem.music.aria_solo_channel', 'Solo {name}', { name: sound.label }), onClick: function () { upd('chSolo', soloed ? -1 : row); },
                        className: "w-5 h-5 rounded text-[0.6875rem] font-black " + (soloed ? 'bg-amber-700 text-white' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }, "S")
                    );
                  })
                )
              ),

              // ── Effects Rack ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, __alloT('stem.music.effects_2', "\u2728 Effects")),
                  React.createElement("button", { onClick: function () { upd('bpFxOn', !d.bpFxOn); if (!d.bpFxOn) _initBpFx(); },
                    className: "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold transition-all " + (d.bpFxOn ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-600')
                  }, d.bpFxOn ? 'FX ON' : 'FX OFF'),
                  d.bpFxOn && React.createElement("button", { "aria-label": __alloT('stem.music.reset_audio_effects', "Reset audio effects"), onClick: function () { upd('bpReverb', 0); upd('bpDelay', 0); upd('bpFilterCut', 20000); }, className: "transition-colors text-[0.6875rem] text-violet-400 hover:text-violet-600" }, __alloT('stem.music.reset', "Reset"))
                ),
                d.bpFxOn && React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                  [
                    { key: 'bpReverb', label: __alloT('stem.music.reverb_3', 'Reverb'), icon: '\uD83C\uDFDB\uFE0F', max: 100, val: d.bpReverb || 0, color: '#8b5cf6' },
                    { key: 'bpDelay', label: __alloT('stem.music.delay_2', 'Delay'), icon: '\uD83D\uDD03', max: 100, val: d.bpDelay || 0, color: '#d946ef' },
                    { key: 'bpFilterCut', label: __alloT('stem.music.filter_2', 'Filter'), icon: '\uD83C\uDF0A', max: 20000, val: d.bpFilterCut || 20000, color: '#a855f7' }
                  ].map(function (fx) {
                    return React.createElement("div", { key: fx.key, className: "text-center" },
                      React.createElement("div", { className: "text-[0.6875rem] font-bold text-violet-700 mb-1" }, fx.icon + ' ' + fx.label),
                      React.createElement("input", { type: "range", 'aria-label': fx.label, 'aria-valuetext': ((fx.key === 'bpFilterCut' ? (fx.val >= 19000 ? 'open' : Math.round(fx.val) + ' Hz') : fx.val + '%')), min: fx.key === 'bpFilterCut' ? 200 : 0, max: fx.max, value: fx.val,
                        onChange: function (e) { upd(fx.key, parseInt(e.target.value)); },
                        className: "w-full accent-violet-500"
                      }),
                      React.createElement("div", { className: "text-[0.6875rem] text-violet-400 mt-0.5" }, fx.key === 'bpFilterCut' ? (fx.val >= 19000 ? 'Open' : Math.round(fx.val) + ' Hz') : fx.val + '%')
                    );
                  })
                )
              ),

              // ── Sequencer Grid ──
              React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 p-3 mb-3 overflow-x-auto shadow-sm" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-slate-700" }, __alloT('stem.music.sequencer', "\uD83C\uDFBC Sequencer")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600" }, __alloT('stem.music.16_steps_1_bar', "16 steps = 1 bar")),
                  // Scale selector
                  React.createElement("select", { 'aria-label': __alloT('stem.music.scale_select_label', 'Musical scale'), value: d.bpScale || 'major', onChange: function (e) { upd('bpScale', e.target.value); },
                    className: "ml-auto px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-purple-50 text-purple-700 border border-purple-600"
                  },
                    Object.keys(SCALE_PATTERNS).map(function (k) {
                      return React.createElement("option", { key: k, value: k }, '\uD83C\uDFB5 ' + SCALE_PATTERNS[k].name);
                    })
                  )
                ),
                // Beat subdivision labels
                React.createElement("div", { className: "flex mb-1", style: { marginLeft: '68px' } },
                  Array.from({ length: 16 }, function (_, i) {
                    var labels = ['1','e','&','a','2','e','&','a','3','e','&','a','4','e','&','a'];
                    return React.createElement("div", { key: i, className: "flex-1 text-center text-[0.6875rem] font-bold " + (i % 4 === 0 ? 'text-purple-600' : 'text-slate-600'), style: { minWidth: '22px' } }, labels[i]);
                  })
                ),
                // Melody row (scale-locked)
                (function () {
                  var scNotes = getScaleNotes();
                  return React.createElement("div", { className: "flex items-center gap-1 mb-1", role: 'group', 'data-bp-grid': 'mel',
                    'aria-label': __alloT('stem.music.aria_melody_grid', 'Melody steps. Left and right arrows move between steps; Enter or Space changes the note.') },
                    React.createElement("span", { className: "text-[0.6875rem] font-bold text-purple-700 w-16 text-right pr-1 truncate" }, __alloT('stem.music.melody', "\uD83C\uDFB9 Melody")),
                    Array.from({ length: 16 }, function (_, i) {
                      var ni = melodySeqBP[i] || 0;
                      var isCur = d.seqPlaying && d.seqCurrentStep === i;
                      var isRec = d.bpStepRec && (d.bpStepRecPos || 0) === i;
                      return React.createElement("button", {
                        key: 'mel_' + i, type: 'button', 'data-bp-cell': i, tabIndex: bpCell('mel', i, 16) ? 0 : -1,
                        onKeyDown: function (e) { bpGridKey(e, 'mel', i, 16, 1); }, onFocus: function () { bpCellFocus('mel', i); },
                        'aria-label': __alloFmt('stem.music.aria_melody_step', 'Melody step {n}: {note}. Press to change the note.', { n: i + 1, note: ni > 0 && ni <= scNotes.notes.length ? scNotes.notes[ni - 1] : __alloT('stem.music.melody_rest', 'rest') }),
                        onClick: function () { pushBpUndo(); var nm = (d.beatMelody || new Array(16).fill(0)).slice(); nm[i] = (nm[i] + 1) % (scNotes.notes.length + 1); upd('beatMelody', nm); },
                        onContextMenu: function (e) { e.preventDefault(); pushBpUndo(); var nm = (d.beatMelody || new Array(16).fill(0)).slice(); nm[i] = nm[i] <= 0 ? scNotes.notes.length : nm[i] - 1; upd('beatMelody', nm); },
                        className: "flex-1 h-7 rounded-sm cursor-pointer transition-all flex items-center justify-center text-[0.6875rem] font-bold select-none " +
                          (ni > 0 ? 'bg-gradient-to-b from-purple-600 to-purple-600 text-white shadow-sm' : isCur ? 'bg-purple-100 ring-1 ring-purple-300' : isRec ? 'bg-red-100 ring-1 ring-red-300' : i % 4 === 0 ? 'bg-purple-50/80' : 'bg-slate-50 border border-slate-100') + ' hover:brightness-110',
                        style: { minWidth: '22px', padding: 0 },
                        title: ni > 0 ? scNotes.notes[ni - 1] : 'Click to add'
                      }, ni > 0 && ni <= scNotes.notes.length ? scNotes.notes[ni - 1].replace('4', '').replace('5', '\u2019') : '');
                    })
                  );
                })(),
                React.createElement("div", { className: "border-b border-dashed border-slate-200 mb-1 ml-16" }),
                // Drum rows
                React.createElement("div", { role: 'group', 'data-bp-grid': 'drum',
                  'aria-label': __alloT('stem.music.aria_drum_grid', 'Drum steps. Arrow keys move between steps and drums; Enter or Space turns a step on or off.') },
                BEAT_PAD_SOUNDS.slice(0, 8).map(function (sound, row, drumRows) {
                  return React.createElement("div", { key: sound.type, className: "flex items-center gap-1 mb-0.5" },
                    React.createElement("span", { className: "text-[0.6875rem] font-bold w-16 text-right pr-1 truncate", style: { color: isDark ? (({ '#ef4444': '#f87171', '#3b82f6': '#60a5fa', '#8b5cf6': '#a78bfa' })[sound.color] || sound.color) : ({ '#ef4444': '#b91c1c', '#f97316': '#c2410c', '#eab308': '#a16207', '#84cc16': '#4d7c0f', '#22c55e': '#15803d', '#06b6d4': '#0e7490', '#3b82f6': '#1d4ed8', '#8b5cf6': '#6d28d9' })[sound.color] || sound.color } }, sound.label),
                    Array.from({ length: 16 }, function (_, col) {
                      var gKey = row + '_' + col; var grid = d.seqGrid || {}; var isOn = grid[gKey];
                      var isCur = d.seqPlaying && d.seqCurrentStep === col;
                      var isRec = d.bpStepRec && (d.bpStepRecPos || 0) === col;
                      var dIdx = row * 16 + col;
                      return React.createElement("button", {
                        key: gKey, type: 'button', 'aria-pressed': isOn ? 'true' : 'false',
                        'data-bp-cell': dIdx, tabIndex: bpCell('drum', dIdx, drumRows.length * 16) ? 0 : -1,
                        onKeyDown: function (e) { bpGridKey(e, 'drum', dIdx, 16, drumRows.length); }, onFocus: function () { bpCellFocus('drum', dIdx); },
                        'aria-label': __alloFmt('stem.music.aria_drum_step', '{sound}, step {n}', { sound: sound.label, n: col + 1 }),
                        onClick: function () { pushBpUndo(); var g = Object.assign({}, d.seqGrid || {}); g[gKey] = g[gKey] ? 0 : 1; upd('seqGrid', g); if (g[gKey] && !d.beatBuilt) upd('beatBuilt', true); },
                        className: "flex-1 h-5 rounded-sm cursor-pointer transition-all " +
                          (isOn ? 'shadow-sm' : isCur ? 'bg-slate-200 ring-1 ring-purple-200' : isRec ? 'bg-red-50 ring-1 ring-red-200' : col % 4 === 0 ? 'bg-slate-100' : 'bg-slate-50 border border-slate-100') + ' hover:opacity-80',
                        style: isOn ? { background: sound.color, opacity: isCur ? 1 : 0.85, padding: 0 } : { minWidth: '22px', padding: 0 }
                      });
                    })
                  );
                })),
                // Step position indicator
                React.createElement("div", { className: "flex mt-1", style: { marginLeft: '68px' } },
                  Array.from({ length: 16 }, function (_, i) {
                    return React.createElement("div", { key: 's_' + i, className: "flex-1 h-1 rounded-full mx-px transition-all " + (d.seqPlaying && d.seqCurrentStep === i ? 'bg-purple-500' : 'bg-slate-200'), style: { minWidth: '22px' } });
                  })
                )
              ),

              // ── Piano Roll Editor ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, __alloT('stem.music.piano_roll', "\uD83C\uDFB9 Piano Roll")),
                  React.createElement("span", { className: "text-[0.6875rem] text-indigo-700" }, __alloT('stem.music.click_cells_to_place_notes_visual_melo', "Click cells to place notes \u2014 visual melody editor")),
                  React.createElement("button", { onClick: function() { upd('showPianoRoll', !d.showPianoRoll); },
                    className: "ml-auto px-2 py-1 rounded text-[0.6875rem] font-bold " + (d.showPianoRoll ? 'bg-indigo-600 text-white' : 'transition-colors bg-indigo-100 text-indigo-700 hover:bg-indigo-200') + " transition-all"
                  }, d.showPianoRoll ? '\u25BC Hide' : '\u25B6 Show')
                ),
                d.showPianoRoll && (function() {
                  var scNotes = getScaleNotes();
                  var patLen = d.bpPatternLen || 16;
                  var melody = d.beatMelody || new Array(patLen).fill(0);
                  var rows = scNotes.notes.slice().reverse(); // high notes at top
                  return React.createElement("div", { className: "overflow-x-auto" },
                    React.createElement("div", { style: { minWidth: Math.max(400, patLen * 28) + 'px' }, role: 'group', 'data-bp-grid': 'roll',
                      'aria-label': __alloT('stem.music.aria_roll_grid', 'Piano roll. Arrow keys move between steps and notes; Enter or Space places or removes a note.') },
                      // Note rows
                      rows.map(function(noteName, rowIdx) {
                        var noteIdx = rows.length - rowIdx; // 1-indexed from bottom
                        var isBlack = noteName.indexOf('#') !== -1 || noteName.indexOf('\u266D') !== -1;
                        return React.createElement("div", { key: noteName, className: "flex", style: { height: '18px' } },
                          // Note label
                          React.createElement("div", { className: "w-10 text-[0.6875rem] font-bold flex items-center justify-end pr-1 shrink-0 border-r",
                            style: { background: isBlack ? '#1e293b' : '#f8fafc', color: isBlack ? '#94a3b8' : '#475569', borderColor: '#e2e8f0' }
                          }, noteName),
                          // Step cells
                          Array.from({ length: patLen }, function(_, col) {
                            var isActive = melody[col] === noteIdx;
                            var isBeat = col % 4 === 0;
                            var isCurrent = d.seqPlaying && d.seqCurrentStep === col;
                            var rIdx = rowIdx * patLen + col;
                            return React.createElement("button", { key: col, type: 'button', 'aria-pressed': isActive ? 'true' : 'false',
                              'data-bp-cell': rIdx, tabIndex: bpCell('roll', rIdx, rows.length * patLen) ? 0 : -1,
                              onKeyDown: function (e) { bpGridKey(e, 'roll', rIdx, patLen, rows.length); }, onFocus: function () { bpCellFocus('roll', rIdx); },
                              'aria-label': __alloFmt('stem.music.aria_roll_cell', '{note}, step {n}', { note: noteName, n: col + 1 }),
                              onClick: function() {
                                pushBpUndo();
                                var newMel = melody.slice();
                                newMel[col] = isActive ? 0 : noteIdx;
                                upd('beatMelody', newMel);
                                if (!isActive && noteIdx > 0 && noteIdx <= scNotes.freqs.length) {
                                  playNoteFor(scNotes.freqs[noteIdx - 1], 'pr_' + col, 200);
                                }
                              },
                              className: "flex-1 border-r border-b cursor-pointer transition-all " + (isCurrent ? 'brightness-125' : ''),
                              style: {
                                minWidth: '20px', padding: 0,
                                background: isActive ? (NOTE_COLORS[scNotes.notes.indexOf(noteName) % 12] || '#6366f1') :
                                  isCurrent ? 'rgba(99,102,241,0.15)' :
                                  isBlack ? (isBeat ? '#1e293b' : '#0f172a') : (isBeat ? '#f1f5f9' : '#fff'),
                                borderColor: '#e2e8f0'
                              }
                            });
                          })
                        );
                      }),
                      // Step numbers at bottom
                      React.createElement("div", { className: "flex" },
                        React.createElement("div", { className: "w-10 shrink-0" }),
                        Array.from({ length: patLen }, function(_, i) {
                          return React.createElement("div", { key: i, className: "flex-1 text-center text-[0.6875rem] font-mono",
                            style: { minWidth: '20px', color: i % 4 === 0 ? '#6366f1' : '#94a3b8' }
                          }, i % 4 === 0 ? String(Math.floor(i / 4) + 1) : '\u00B7');
                        })
                      )
                    )
                  );
                })()
              ),

              // ── Chord Progression Builder ──
              React.createElement("div", { className: "bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-purple-800" }, __alloT('stem.music.chord_progression_builder', "\uD83C\uDFB6 Chord Progression Builder")),
                  React.createElement("span", { className: "text-[0.6875rem] text-purple-700" }, __alloT('stem.music.build_common_progressions', "Build common progressions")),
                  React.createElement("button", { onClick: function() { upd('showChordProg', !d.showChordProg); },
                    className: "ml-auto px-2 py-1 rounded text-[0.6875rem] font-bold " + (d.showChordProg ? 'bg-purple-600 text-white' : 'transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200') + " transition-all"
                  }, d.showChordProg ? '\u25BC Hide' : '\u25B6 Show')
                ),
                d.showChordProg && React.createElement("div", null,
                  // Common progressions
                  React.createElement("div", { className: "text-[0.6875rem] font-bold text-purple-700 mb-1" }, __alloT('stem.music.common_progressions_click_to_hear', "Common Progressions \u2014 click to hear")),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3" },
                    [
                      { name: __alloT('stem.music.i_v_vi_iv', 'I - V - vi - IV'), chords: ['C','G','Am','F'], genre: 'Pop (most common in the world!)', key: 'C' },
                      { name: __alloT('stem.music.i_iv_v_i', 'I - IV - V - I'), chords: ['C','F','G','C'], genre: 'Rock / Country / Folk', key: 'C' },
                      { name: __alloT('stem.music.ii_v_i', 'ii - V - I'), chords: ['Dm','G','C'], genre: 'Jazz (the foundation)', key: 'C' },
                      { name: __alloT('stem.music.i_vi_iv_v', 'I - vi - IV - V'), chords: ['C','Am','F','G'], genre: '50s Doo-Wop / Classic Pop', key: 'C' },
                      { name: __alloT('stem.music.vi_iv_i_v', 'vi - IV - I - V'), chords: ['Am','F','C','G'], genre: 'Modern Pop / Emotional', key: 'Am' },
                      { name: __alloT('stem.music.i_iv_vi_v', 'I - IV - vi - V'), chords: ['C','F','Am','G'], genre: 'Worship / Anthemic', key: 'C' },
                      { name: __alloT('stem.music.i_vi_iii_vii', 'i - VI - III - VII'), chords: ['Am','F','C','G'], genre: 'Anime / Film Score', key: 'Am' },
                      { name: __alloT('stem.music.i_v_vi_iii_iv', 'I - V - vi - iii - IV'), chords: ['C','G','Am','Em','F'], genre: 'Canon in D / Baroque', key: 'C' },
                      { name: __alloT('stem.music.12_bar_blues_2', '12-Bar Blues'), chords: ['C','C','C','C','F','F','C','C','G','F','C','G'], genre: 'Blues / R&B', key: 'C' },
                    ].map(function(prog) {
                      return React.createElement("button", { key: prog.name,
                        'aria-pressed': !!(d.activeProgression && d.activeProgression.name === prog.name),
                        onClick: function() {
                          upd('activeProgression', prog);
                          // Play the progression
                          prog.chords.forEach(function(chord, ci) {
                            setTimeout(function() {
                              var root = chord.replace('m','').replace('7','');
                              var isMinor = chord.indexOf('m') !== -1 && chord.indexOf('maj') === -1;
                              strumChord(root, isMinor ? 'Minor' : 'Major', 0, 50);
                            }, ci * 800);
                          });
                        },
                        className: "p-2 rounded-lg text-left transition-all border hover:shadow-md " + ((d.activeProgression && d.activeProgression.name === prog.name) ? 'border-purple-400 bg-purple-100 shadow-md' : 'border-purple-100 bg-white hover:border-purple-600')
                      },
                        React.createElement("div", { className: "text-[0.6875rem] font-bold text-purple-800" }, prog.name),
                        React.createElement("div", { className: "flex gap-1 mt-1 flex-wrap" },
                          prog.chords.map(function(ch, ci) {
                            return React.createElement("span", { key: ci, className: "text-[0.6875rem] font-bold px-1.5 py-0.5 rounded bg-purple-200/50 text-purple-700" }, ch);
                          })
                        ),
                        React.createElement("div", { className: "text-[0.6875rem] text-purple-700 mt-1 italic" }, prog.genre)
                      );
                    })
                  ),
                  // Educational content
                  React.createElement("div", { className: "bg-white/60 rounded-lg p-2 border border-purple-100" },
                    React.createElement("div", { className: "text-[0.6875rem] font-bold text-purple-700 mb-1" }, __alloT('stem.music.the_science_of_chord_progressions', "\uD83D\uDD2C The Science of Chord Progressions")),
                    React.createElement("p", { className: "text-[0.6875rem] text-slate-600 leading-relaxed" },
                      __alloT('stem.music.chord_progressions_create_emotional_jo', "Chord progressions create emotional journeys. The I chord (tonic) feels like 'home.' The V chord (dominant) creates tension that wants to resolve back to I. The vi chord (relative minor) adds sadness or depth. The IV chord (subdominant) moves away from home gently. The I-V-vi-IV progression is estimated to appear in over 70% of pop songs because it balances these emotions perfectly.")
                    ),
                    React.createElement("p", { className: "text-[0.6875rem] text-purple-600 font-bold mt-1" },
                      __alloT('stem.music.roman_numerals_i_ii_iii_iv_v_vi_vii_re', "Roman numerals (I, ii, iii, IV, V, vi, vii\u00B0) represent scale degrees. Uppercase = major chord. Lowercase = minor chord.")
                    )
                  )
                )
              ),

              // ── Notation Teaching View (SVG-based, no unicode font dependency) ──
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, __alloT('stem.music.musical_notation', "\uD83C\uDFBC Musical Notation")),
                  React.createElement("span", { className: "text-[0.6875rem] text-amber-700" }, __alloT('stem.music.click_notes_to_hear_them', "Click notes to hear them!")),
                  !melodySeqBP.some(function(n) { return n > 0; }) && React.createElement("span", { className: "text-[0.6875rem] text-amber-700 italic ml-auto" }, __alloT('stem.music.add_melody_notes_in_the_grid_above', "Add melody notes in the grid above \u2191"))
                ),
                // Staff notation: proper note placement on treble clef lines/spaces
                (function() {
                  var scNotes = getScaleNotes();
                  var hasMelody = melodySeqBP.some(function(n) { return n > 0; });
                  // Map scale note names to staff Y positions (treble clef, middle C = ledger below)
                  // Staff lines (top to bottom): F5=30, D5=35, B4=40, G4=45, E4=50
                  // Staff spaces: E5=32.5, C5=37.5, A4=42.5, F4=47.5
                  var STAFF_Y = { 'C4': 65, 'D4': 60, 'E4': 55, 'F4': 50, 'G4': 45, 'A4': 40, 'B4': 35, 'C5': 30, 'D5': 25, 'E5': 20, 'F5': 15, 'G5': 10 };
                  // Drum rhythm: check if any drum pads have hits
                  var grid = d.seqGrid || {};
                  var hasDrums = Object.keys(grid).some(function(k) { return grid[k]; });
                  var svgH = hasDrums ? 130 : 100;
                  return React.createElement("svg", { viewBox: "0 0 560 " + svgH, className: "w-full bg-[#fefcf3] rounded-lg border border-amber-100 mb-2", style: { maxHeight: hasDrums ? '160px' : '130px' }, role: "img", 'aria-label': 'Musical staff notation showing your melody' + (hasDrums ? ' and drum pattern' : '') },
                    // Staff lines
                    [0,1,2,3,4].map(function (li) { return React.createElement("line", { key: 'sl_' + li, x1: 35, y1: 25 + li * 10, x2: 540, y2: 25 + li * 10, stroke: '#d4d0c8', strokeWidth: 0.8 }); }),
                    // Treble clef (SVG path instead of unicode)
                    React.createElement("g", { transform: "translate(12,26) scale(0.38)", fill: "#8b7355" },
                      React.createElement("path", { d: "M20 80 C20 60 30 40 30 20 C30 5 25 0 20 0 C15 0 10 5 10 20 C10 40 20 60 20 80 C20 95 15 105 10 105 C5 105 0 95 5 85 C8 80 12 80 15 85 C18 90 15 100 10 100 Z M18 20 C18 10 22 5 22 15 C22 25 18 30 18 20 Z" })
                    ),
                    // Time signature
                    React.createElement("text", { x: 42, y: 40, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif' } }, "4"),
                    React.createElement("text", { x: 42, y: 57, fill: "#8b7355", style: { fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif' } }, "4"),
                    // Barlines
                    [4,8,12].map(function (bl) { return React.createElement("line", { key: 'bar_' + bl, x1: 55 + bl * 30, y1: 25, x2: 55 + bl * 30, y2: 65, stroke: '#bbb', strokeWidth: 0.8 }); }),
                    // Final barline (double)
                    React.createElement("line", { x1: 538, y1: 25, x2: 538, y2: 65, stroke: '#999', strokeWidth: 0.8 }),
                    React.createElement("line", { x1: 541, y1: 25, x2: 541, y2: 65, stroke: '#999', strokeWidth: 2 }),
                    // Melody notes / rests
                    melodySeqBP.map(function (ni, idx) {
                      var x = 70 + idx * 29; var isCur = d.seqPlaying && d.seqCurrentStep === idx;
                      if (!ni || ni <= 0) {
                        // Quarter rest (SVG drawn, not unicode)
                        var restCol = isCur ? '#7c3aed' : '#ccc';
                        return React.createElement("g", { key: 'n_' + idx },
                          React.createElement("path", { d: "M" + (x-2) + ",38 l3,-5 l-3,-3 l3,-5 l-3,-3 l2,-2", stroke: restCol, fill: "none", strokeWidth: 1.5, strokeLinecap: "round" })
                        );
                      }
                      // Get note name and map to staff Y
                      var noteName = ni <= scNotes.notes.length ? scNotes.notes[ni - 1] : 'C4';
                      var y = STAFF_Y[noteName] || (50 - (ni - 1) * 5);
                      var col = isCur ? '#7c3aed' : '#333';
                      return React.createElement("g", { key: 'n_' + idx, style: { cursor: 'pointer' },
                        onClick: function () { if (ni > 0 && ni <= scNotes.freqs.length) playNoteFor(scNotes.freqs[ni - 1], 'notclick_' + idx, 400); }
                      },
                        // Filled notehead (ellipse)
                        React.createElement("ellipse", { cx: x, cy: y, rx: 5, ry: 3.5, fill: col, transform: "rotate(-12 " + x + " " + y + ")" }),
                        // Stem (up if below middle, down if above)
                        y >= 45
                          ? React.createElement("line", { x1: x + 4.5, y1: y, x2: x + 4.5, y2: y - 22, stroke: col, strokeWidth: 1.2 })
                          : React.createElement("line", { x1: x - 4.5, y1: y, x2: x - 4.5, y2: y + 22, stroke: col, strokeWidth: 1.2 }),
                        // Ledger lines below staff (C4, D4)
                        y >= 65 && React.createElement("line", { x1: x - 7, y1: 65, x2: x + 7, y2: 65, stroke: '#999', strokeWidth: 0.6 }),
                        y >= 70 && React.createElement("line", { x1: x - 7, y1: 70, x2: x + 7, y2: 70, stroke: '#999', strokeWidth: 0.6 }),
                        // Ledger lines above staff (D5, E5, F5)
                        y <= 20 && React.createElement("line", { x1: x - 7, y1: 20, x2: x + 7, y2: 20, stroke: '#999', strokeWidth: 0.6 }),
                        y <= 15 && React.createElement("line", { x1: x - 7, y1: 15, x2: x + 7, y2: 15, stroke: '#999', strokeWidth: 0.6 }),
                        // Note name label
                        React.createElement("text", { x: x, y: y + (y >= 45 ? 12 : -8), textAnchor: "middle", fill: isCur ? '#7c3aed' : '#999', style: { fontSize: '6px', fontFamily: 'sans-serif' } }, noteName.replace('4', '').replace('5', '\u2019'))
                      );
                    }),
                    // Playback cursor
                    d.seqPlaying && React.createElement("rect", { x: 65 + (d.seqCurrentStep || 0) * 29, y: 22, width: 20, height: 46, rx: 2, fill: '#7c3aed', opacity: 0.08 }),
                    // Drum rhythm notation (below staff)
                    hasDrums && React.createElement("g", null,
                      // Rhythm label
                      React.createElement("text", { x: 8, y: 88, fill: "#999", style: { fontSize: '7px', fontFamily: 'sans-serif' } }, __alloT('stem.music.drums', "Drums")),
                      // Percussion line
                      React.createElement("line", { x1: 55, y1: 90, x2: 540, y2: 90, stroke: '#e0dcd4', strokeWidth: 0.6 }),
                      // Drum hits as x noteheads
                      Array.from({ length: 16 }, function(_, col) {
                        var hasHit = false;
                        for (var dr = 0; dr < 12; dr++) { if (grid[dr + '_' + col]) { hasHit = true; break; } }
                        if (!hasHit) return null;
                        var x = 70 + col * 29;
                        var isCur = d.seqPlaying && d.seqCurrentStep === col;
                        var hitCol = isCur ? '#7c3aed' : '#666';
                        // Count simultaneous hits for size
                        var hitCount = 0;
                        for (var dr2 = 0; dr2 < 12; dr2++) { if (grid[dr2 + '_' + col]) hitCount++; }
                        return React.createElement("g", { key: 'dh_' + col },
                          // X notehead for percussion
                          React.createElement("line", { x1: x - 3, y1: 87, x2: x + 3, y2: 93, stroke: hitCol, strokeWidth: 1.3 }),
                          React.createElement("line", { x1: x + 3, y1: 87, x2: x - 3, y2: 93, stroke: hitCol, strokeWidth: 1.3 }),
                          // Stem
                          React.createElement("line", { x1: x + 3, y1: 87, x2: x + 3, y2: 77, stroke: hitCol, strokeWidth: 1 }),
                          // Hit count indicator (dot for 2+, double for 3+)
                          hitCount >= 2 && React.createElement("circle", { cx: x, cy: 97, r: 1.2, fill: hitCol }),
                          hitCount >= 3 && React.createElement("circle", { cx: x + 4, cy: 97, r: 1.2, fill: hitCol })
                        );
                      })
                    ),
                    // Empty state hint
                    !hasMelody && !hasDrums && React.createElement("text", { x: 290, y: 50, textAnchor: "middle", fill: "#ccc", style: { fontSize: '10px', fontFamily: 'sans-serif', fontStyle: 'italic' } }, __alloT('stem.music.click_melody_cells_in_the_grid_above_t', "Click melody cells in the grid above to see notation here"))
                  );
                })(),
                // Note value reference (SVG-based, not unicode)
                React.createElement("div", { className: "grid grid-cols-4 gap-2" },
                  [
                    { name: __alloT('stem.music.whole_note', 'Whole Note'), beats: '4 beats', desc: __alloT('stem.music.held_for_a_full_bar', 'Held for a full bar'), filled: false, stem: false },
                    { name: __alloT('stem.music.half_note', 'Half Note'), beats: '2 beats', desc: __alloT('stem.music.held_for_half_a_bar', 'Held for half a bar'), filled: false, stem: true },
                    { name: __alloT('stem.music.quarter_note', 'Quarter Note'), beats: '1 beat', desc: __alloT('stem.music.one_tap_per_beat', 'One tap per beat'), filled: true, stem: true },
                    { name: __alloT('stem.music.eighth_note', 'Eighth Note'), beats: '\u00BD beat', desc: __alloT('stem.music.two_per_beat_1_2', 'Two per beat (1 & 2 &)'), filled: true, stem: true, flag: true }
                  ].map(function (note) {
                    return React.createElement("div", { key: note.name, className: "bg-white/80 rounded-lg p-2 text-center border border-amber-100" },
                      React.createElement("svg", { 'aria-hidden': 'true', viewBox: "0 0 30 40", className: "w-8 h-10 mx-auto mb-0.5" },
                        React.createElement("ellipse", { cx: 12, cy: 28, rx: 6, ry: 4, fill: note.filled ? '#8b7355' : 'none', stroke: '#8b7355', strokeWidth: note.filled ? 0 : 1.5, transform: "rotate(-12 12 28)" }),
                        note.stem && React.createElement("line", { x1: 17, y1: 28, x2: 17, y2: 8, stroke: '#8b7355', strokeWidth: 1.5 }),
                        note.flag && React.createElement("path", { d: "M17,8 C22,12 22,18 17,20", stroke: '#8b7355', strokeWidth: 1.5, fill: 'none' })
                      ),
                      React.createElement("div", { className: "text-[0.6875rem] font-bold text-amber-800" }, note.name),
                      React.createElement("div", { className: "text-[0.6875rem] text-amber-700" }, note.beats),
                      React.createElement("div", { className: "text-[0.6875rem] text-amber-700 italic mt-0.5" }, note.desc)
                    );
                  })
                )
              ),

              // ── Rhythm Exercises ──
              React.createElement("div", { className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-rose-700" }, __alloT('stem.music.rhythm_challenge', "\uD83E\uDD4A Rhythm Challenge")),
                  React.createElement("button", { onClick: function () { upd('bpRhythm', RHYTHM_CHALLENGES[Math.floor(Math.random() * RHYTHM_CHALLENGES.length)]); upd('bpRhythmScore', null); },
                    className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm"
                  }, __alloT('stem.music.challenge_me', "\uD83C\uDFB2 Challenge me!")),
                  React.createElement("button", { "aria-label": __alloT('stem.music.random', "Random"), onClick: function () { upd('bpRhythm', genRandomRhythm()); upd('bpRhythmScore', null); },
                    className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition-all"
                  }, __alloT('stem.music.random_2', "\uD83C\uDFB2 Random"))
                ),
                d.bpRhythm ? React.createElement("div", null,
                  React.createElement("div", { className: "text-[0.6875rem] font-bold text-rose-800 mb-1" }, d.bpRhythm.name + ': ' + d.bpRhythm.desc),
                  React.createElement("div", { className: "flex gap-1 mb-2" },
                    d.bpRhythm.pattern.map(function (v, i) {
                      return React.createElement("div", { key: i, className: "flex-1 h-6 rounded " + (v ? 'bg-rose-500' : 'bg-rose-100 border border-rose-200'), style: { minWidth: '18px' } });
                    })
                  ),
                  React.createElement("div", { className: "text-[0.6875rem] text-rose-500 mb-1" }, __alloT('stem.music.load_this_rhythm_into_row_0_kick', "Load this rhythm into row 0 (Kick)?")),
                  React.createElement("button", { "aria-label": __alloT('stem.music.load_to_grid', "Load to Grid"),
                    onClick: function () {
                      pushBpUndo();
                      var g = Object.assign({}, d.seqGrid || {});
                      d.bpRhythm.pattern.forEach(function (v, i) { g['0_' + i] = v; });
                      upd('seqGrid', g);
                      addToast(__alloT('stem.music.rhythm_loaded_to_kick', '\uD83E\uDD4A Rhythm loaded to Kick!'), 'success');
                    },
                    className: "px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-rose-700 text-white hover:bg-rose-600 transition-all"
                  }, __alloT('stem.music.load_to_grid_2', "\u25B6 Load to Grid"))
                ) : React.createElement("p", { className: "text-[0.6875rem] text-rose-700 italic" }, __alloT('stem.music.click_challenge_me_to_practice_rhythm_', "Click \"Challenge me!\" to practice rhythm patterns"))
              ),

              // ── User Sample Upload ──
              React.createElement("div", { className: "bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                  React.createElement("span", { className: "text-xs font-bold text-indigo-700" }, __alloT('stem.music.your_samples', "\uD83D\uDCC2 Your Samples")),
                  React.createElement("span", { className: "text-[0.6875rem] text-indigo-600" }, __alloT('stem.music.upload_wav_mp3_ogg_max_4', "Upload .wav/.mp3/.ogg \u2022 Max 4")),
                  React.createElement("label", { className: "ml-auto px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700 transition-all shadow-sm" },
                    __alloT('stem.music.upload', "\u2B06 Upload"),
                    React.createElement("input", { type: "file", accept: ".wav,.mp3,.ogg,audio/*", className: "hidden",
                      onChange: function (e) {
                        var file = e.target.files && e.target.files[0]; if (!file) return;
                        if (file.size > 512000) { addToast(__alloT('stem.music.file_too_large_max_500kb', '\u26A0\uFE0F File too large (max 500KB)'), 'error'); return; }
                        if ((window._alloUserSamples || []).length >= 4) { addToast(__alloT('stem.music.max_4_samples', '\u26A0\uFE0F Max 4 samples'), 'error'); return; }
                        var reader = new FileReader();
                        reader.onload = function (ev) {
                          var audio = getCtx(); var ctx = audio.ctx;
                          ctx.decodeAudioData(ev.target.result.slice(0), function (buffer) {
                            window._alloUserSamples = (window._alloUserSamples || []).concat([{ name: file.name.replace(/\.[^.]+$/, ''), buffer: buffer }]);
                            upd('userSampleCount', (window._alloUserSamples || []).length);
                            addToast(__alloT('stem.music.sample_loaded', '\uD83C\uDFB5 Sample loaded!'), 'success');
                          }, function () { addToast(__alloT('stem.music.could_not_decode_audio', '\u274C Could not decode audio'), 'error'); });
                        };
                        reader.readAsArrayBuffer(file); e.target.value = '';
                      }
                    })
                  )
                ),
                (window._alloUserSamples || []).length > 0
                  ? React.createElement("div", { className: "flex gap-2 flex-wrap" },
                      (window._alloUserSamples || []).map(function (smp, si) {
                        return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_play_sample', 'Play recorded sample {n}', { n: si + 1 }), key: si, onMouseDown: function () { playUserSample(si); },
                          className: "px-3 py-2 rounded-lg text-[0.6875rem] font-bold bg-white border border-indigo-600 text-indigo-700 hover:bg-indigo-50 hover:shadow-sm transition-all flex items-center gap-1"
                        },
                          React.createElement("span", null, "\uD83C\uDFB5"),
                          React.createElement("span", { className: "truncate max-w-[80px]" }, smp.name),
                          React.createElement("span", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  onClick: function (e) { e.stopPropagation(); window._alloUserSamples.splice(si, 1); upd('userSampleCount', window._alloUserSamples.length); }, className: "transition-colors ml-1 text-red-400 hover:text-red-600 cursor-pointer" }, "\u2715")
                        );
                      })
                    )
                  : React.createElement("p", { className: "text-[0.6875rem] text-indigo-600 italic" }, __alloT('stem.music.upload_wav_mp3_files_for_custom_pads_s', "Upload WAV/MP3 files for custom pads. Samples clear on page refresh."))
              ),

              // ── Song Arrangement ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200/60 p-3 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },
                  React.createElement("span", { className: "text-xs font-bold text-violet-700" }, __alloT('stem.music.song_arrangement', "\uD83C\uDFB6 Song Arrangement")),
                  React.createElement("span", { className: "text-[0.6875rem] text-violet-600" }, __alloT('stem.music.chain_patterns_into_a_full_song', "Chain patterns into a full song")),
                  React.createElement("button", { "aria-label": __alloT('stem.music.add_current_pattern_as_a_section', "Add current pattern as a section"),
                    onClick: function () {
                      var sections = d.songSections || [];
                      var name = 'Section ' + String.fromCharCode(65 + sections.length); // A, B, C...
                      sections = sections.concat([{ id: Date.now(), name: name, grid: JSON.parse(JSON.stringify(d.seqGrid || {})), melody: (d.beatMelody || []).slice(), bpm: d.seqBPM || 120, color: ['#8b5cf6','#3b82f6','#ef4444','#f59e0b','#10b981','#ec4899'][sections.length % 6] }]);
                      upd('songSections', sections);
                      addToast(__alloFmt('stem.music.toast_added_section', '\uD83C\uDFB6 Added "{name}" to song!', { name: name }), 'success');
                    },
                    className: "ml-auto px-2 py-1 rounded-lg text-[0.6875rem] font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all shadow-sm"
                  }, __alloT('stem.music.add_current_as_section', "+ Add Current as Section"))
                ),
                (d.songSections && d.songSections.length > 0) ? React.createElement("div", null,
                  // Arrangement timeline
                  React.createElement("div", { className: "flex gap-1 mb-2 overflow-x-auto pb-1" },
                    (d.songArrangement || (d.songSections || []).map(function(s) { return s.id; })).map(function (sectionId, idx) {
                      var section = (d.songSections || []).find(function(s) { return s.id === sectionId; });
                      if (!section) return null;
                      var isPlaying = d.songPlaying && d.songCurrentSection === idx;
                      return React.createElement("button", { key: idx + '_' + sectionId, type: 'button',
                        'aria-label': __alloFmt('stem.music.aria_load_section', 'Load section {name} ({bpm} BPM) into the grid', { name: section.name, bpm: section.bpm || 120 }),
                        className: "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-center cursor-pointer transition-all border-2 min-w-[50px] " + (isPlaying ? 'scale-105 shadow-lg' : 'hover:scale-102'),
                        style: { background: section.color + '20', borderColor: isPlaying ? section.color : section.color + '40' },
                        onClick: function () {
                          // Load this section's pattern into the grid
                          upd('seqGrid', JSON.parse(JSON.stringify(section.grid || {})));
                          upd('beatMelody', section.melody ? section.melody.slice() : null);
                          upd('seqBPM', section.bpm || 120);
                          addToast(__alloFmt('stem.music.toast_loaded_section', '\uD83C\uDFB5 Loaded "{name}"', { name: section.name }), 'info');
                        }
                      },
                        React.createElement("span", { className: "text-[0.6875rem] font-bold", style: { color: section.color } }, section.name),
                        React.createElement("span", { className: "text-[0.6875rem] text-slate-600" }, (section.bpm || 120) + " BPM"),
                        isPlaying && React.createElement("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse", style: { background: section.color } })
                      );
                    })
                  ),
                  // Song controls
                  React.createElement("div", { className: "flex gap-2 items-center" },
                    React.createElement("button", { "aria-label": d.songPlaying ? __alloT('stem.music.aria_stop_song', 'Stop song') : __alloT('stem.music.play_full_song', "Play full song"),
                      onClick: function () {
                        if (d.songPlaying) { upd('songPlaying', false); stopSequencer(); return; }
                        var sections = d.songSections || [];
                        var arrangement = d.songArrangement || sections.map(function(s) { return s.id; });
                        if (arrangement.length === 0) return;
                        upd('songPlaying', true); upd('songCurrentSection', 0);
                        // Load first section
                        var first = sections.find(function(s) { return s.id === arrangement[0]; });
                        if (first) {
                          upd('seqGrid', JSON.parse(JSON.stringify(first.grid || {})));
                          upd('beatMelody', first.melody ? first.melody.slice() : null);
                          upd('seqBPM', first.bpm || 120);
                        }
                        startSequencer();
                        // Auto-advance after each section (16 beats)
                        var beatDuration = 60000 / (first ? first.bpm || 120 : 120);
                        var sectionDuration = beatDuration * 16 / 4; // 16 steps = 4 beats at 4 steps/beat
                        var sectionIdx = 0;
                        function advanceSection() {
                          sectionIdx++;
                          if (sectionIdx >= arrangement.length) {
                            if (d.songLoop) { sectionIdx = 0; } else { upd('songPlaying', false); stopSequencer(); return; }
                          }
                          var next = sections.find(function(s) { return s.id === arrangement[sectionIdx]; });
                          if (next) {
                            upd('songCurrentSection', sectionIdx);
                            upd('seqGrid', JSON.parse(JSON.stringify(next.grid || {})));
                            upd('beatMelody', next.melody ? next.melody.slice() : null);
                            upd('seqBPM', next.bpm || 120);
                            var nextDuration = 60000 / (next.bpm || 120) * 16 / 4;
                            window._alloSongAdvance = setTimeout(advanceSection, nextDuration);
                          }
                        }
                        window._alloSongAdvance = setTimeout(advanceSection, sectionDuration);
                      },
                      className: "px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all shadow-sm " + (d.songPlaying ? 'bg-red-600 text-white animate-pulse' : 'bg-violet-600 text-white hover:bg-violet-700')
                    }, d.songPlaying ? '\u23F9 Stop Song' : '\u25B6 Play Full Song'),
                    React.createElement("label", { className: "flex items-center gap-1 text-[0.6875rem] text-violet-600 cursor-pointer" },
                      React.createElement("input", { type: "checkbox", checked: !!d.songLoop, onChange: function () { upd('songLoop', !d.songLoop); }, className: "rounded" }),
                      __alloT('stem.music.loop', "Loop")
                    ),
                    React.createElement("span", { className: "text-[0.6875rem] text-violet-500 ml-auto" }, (d.songSections || []).length + " sections \u2022 Click to load, drag to reorder"),
                    React.createElement("button", { "aria-label": __alloT('stem.music.clear_arrangement', "Clear arrangement"),
                      onClick: function () { upd('songSections', []); upd('songArrangement', null); upd('songPlaying', false); if (window._alloSongAdvance) clearTimeout(window._alloSongAdvance); },
                      className: "px-2 py-1 rounded text-[0.6875rem] font-bold text-red-700 hover:bg-red-50 transition-all"
                    }, __alloT('stem.music.clear_2', "\uD83D\uDDD1 Clear"))
                  )
                ) : React.createElement("div", { className: "text-center py-3" },
                  React.createElement("p", { className: "text-[0.6875rem] text-violet-600 italic mb-2" }, __alloT('stem.music.create_a_drum_pattern_in_the_grid_abov', "Create a drum pattern in the grid above, then click \"+ Add Current as Section\" to start building a song.")),
                  React.createElement("p", { className: "text-[0.6875rem] text-violet-600" }, __alloT('stem.music.sections_intro_verse_chorus_bridge_cho', "Sections: Intro \u2192 Verse \u2192 Chorus \u2192 Bridge \u2192 Chorus \u2192 Outro"))
                )
              ),

              // ── Save/Load + Share + Export ──
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/60 p-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },
                  React.createElement("span", { className: "text-xs font-bold text-emerald-700" }, __alloT('stem.music.compositions', "\uD83D\uDCBE Compositions")),
                  React.createElement("input", {
                    type: "text",
                    value: d.bpCompName || '',
                    onChange: function (e) { upd('bpCompName', e.target.value); },
                    placeholder: __alloT('stem.music.composition_name_placeholder', 'Composition name...'),
                    "aria-label": __alloT('stem.music.composition_name_aria', 'Name your composition'),
                    className: "px-2 py-1 rounded-lg border border-emerald-300 bg-white text-slate-800 text-[0.75rem] w-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                  }),
                  React.createElement("button", { type: "button", "aria-label": __alloT('stem.music.save', "Save"),
                    onClick: function () {
                      var name = String(d.bpCompName || '').trim() || ('Beat ' + new Date().toLocaleDateString());
                      var comp = { name: name, grid: Object.assign({}, d.seqGrid || {}), melody: (d.beatMelody || []).slice(), bpm: d.seqBPM || 120, kit: d.activeKit || '', swing: d.seqSwing || '0', scale: d.bpScale || 'major', timestamp: Date.now() };
                      var saved = [];
                      try { var _sb = JSON.parse(localStorage.getItem('alloflow_beats') || '[]'); if (Array.isArray(_sb)) saved = _sb; } catch (_e) {}
                      saved.push(comp);
                      try { localStorage.setItem('alloflow_beats', JSON.stringify(saved)); } catch (_e) {}
                      upd('bpCompName', '');
                      upd('beatSaveRefresh', Date.now());
                      addToast(__alloT('stem.music.beat_saved', '\uD83D\uDCBE Beat saved!'), 'success');
                    },
                    className: "px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-sm"
                  }, __alloT('stem.music.save_2', "\uD83D\uDCBE Save")),
                  React.createElement("button", { type: "button", onClick: sharePattern, className: "px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-blue-700 text-white hover:bg-blue-600 transition-all shadow-sm" }, __alloT('stem.music.share_url', "\uD83D\uDD17 Share URL")),
                  React.createElement("button", { type: "button", onClick: exportBeat, disabled: d.bpExporting,
                    className: "px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all shadow-sm " + (d.bpExporting ? 'bg-gray-300 text-gray-800' : 'bg-orange-700 text-white hover:bg-orange-800')
                  }, d.bpExporting ? '\u23F3 Recording...' : '\uD83D\uDCE5 Export'),
                  React.createElement("button", { type: "button", "aria-label": __alloT('stem.music.snapshot', "Snapshot"),
                    onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'bp-' + Date.now(), tool: 'synth', label: __alloT('stem.music.beat_pad', 'Beat Pad'), data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast(__alloT('stem.music.snapshot_saved', '\uD83D\uDCF8 Snapshot saved!'), 'success'); },
                    className: "px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all"
                  }, __alloT('stem.music.snapshot_2', "\uD83D\uDCF8 Snapshot"))
                ),
                d.bpShareFallbackUrl && React.createElement("div", { role: "status", className: "flex items-center gap-2 mb-2 bg-white border border-blue-200 rounded-lg p-2" },
                  React.createElement("input", {
                    type: "text", readOnly: true, value: d.bpShareFallbackUrl,
                    "aria-label": __alloT('stem.music.aria_share_url_field', 'Shareable beat URL'),
                    onFocus: function (e) { e.target.select(); },
                    className: "flex-1 px-2 py-1 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded"
                  }),
                  React.createElement("button", { type: "button", onClick: function () { upd('bpShareFallbackUrl', ''); }, "aria-label": __alloT('stem.music.aria_dismiss_share_url', 'Dismiss share URL'), className: "px-2 py-1 rounded text-xs font-bold bg-slate-200 text-slate-800 hover:bg-slate-300" }, "\u2715")
                ),
                (function () {
                  var saved = [];
                  try { var _sb = JSON.parse(localStorage.getItem('alloflow_beats') || '[]'); if (Array.isArray(_sb)) saved = _sb; } catch (_e) {}
                  if (saved.length === 0) return React.createElement("p", { className: "text-[0.6875rem] text-emerald-700 italic" }, __alloT('stem.music.no_saved_beats_yet_create_a_pattern_an', "No saved beats yet. Create a pattern and click Save!"));
                  return React.createElement("div", { className: "flex flex-col gap-1 max-h-28 overflow-y-auto" },
                    saved.map(function (comp, ci) {
                      return React.createElement("div", { key: ci, className: "flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-emerald-100" },
                        React.createElement("span", { className: "text-[0.6875rem] font-bold text-emerald-700 flex-1 truncate" }, comp.name),
                        React.createElement("span", { className: "text-[0.6875rem] text-slate-600" }, (comp.bpm || 120) + " BPM"),
                        React.createElement("button", { onClick: function () {
                            upd('seqGrid', comp.grid || {}); upd('beatMelody', comp.melody || null);
                            upd('seqBPM', comp.bpm || 120); upd('seqSwing', comp.swing || '0');
                            if (comp.scale) upd('bpScale', comp.scale);
                            if (comp.kit && window._alloSampleCache[comp.kit]) upd('activeKit', comp.kit);
                            else if (comp.kit) loadSampleKit(comp.kit);
                            addToast(__alloT('stem.music.loaded', '\uD83C\uDFB5 Loaded!'), 'success');
                          },
                          "aria-label": __alloFmt('stem.music.aria_load_saved_beat', 'Load saved beat: {name}', { name: comp.name }),
                          className: "transition-colors px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        }, "\u25B6"),
                        React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_delete_saved_beat', 'Delete saved beat: {name}', { name: comp.name }),
                          onClick: function () {
                            var s = [];
                            try { var _sb2 = JSON.parse(localStorage.getItem('alloflow_beats') || '[]'); if (Array.isArray(_sb2)) s = _sb2; } catch (_e) {}
                            s.splice(ci, 1);
                            try { localStorage.setItem('alloflow_beats', JSON.stringify(s)); } catch (_e) {}
                            upd('beatSaveRefresh', Date.now());
                          },
                          className: "transition-colors px-1.5 py-0.5 rounded text-[0.6875rem] font-bold text-red-700 hover:text-red-700 hover:bg-red-50"
                        }, "\u2715")
                      );
                    })
                  );
                })()
              )
            ),

            // ═══════════ TAB: HARMONYPAD ═══════════
            synthTab === 'harmonypad' && React.createElement("div", null,
              // Voice presets
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-rose-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, __alloT('stem.music.harmonypad', "\uD83C\uDF1F HarmonyPad")),
                  React.createElement("span", { className: "text-[0.6875rem] text-amber-700" }, __alloT('stem.music.pure_sine_triangle_blend', "Pure sine+triangle blend"))
                ),
                React.createElement("p", { className: "text-[0.6875rem] text-amber-700 mb-3 leading-relaxed" }, __alloT('stem.music.harmonypad_creates_warm_pure_tones_by_', "HarmonyPad creates warm, pure tones by blending sine and triangle waves. Choose a voice, pick a chord from the grid below, then strum the plate!")),

                // Voice selector
                React.createElement("div", { className: "flex gap-2 mb-4" },
                  [{ id: 'harp', label: __alloT('stem.music.harp', '\uD83C\uDFB5 Harp'), desc: t('stem.synth.pure_clean', 'Pure & clean') },
                  { id: 'organ', label: __alloT('stem.music.organ', '\u2728 Organ'), desc: t('stem.synth.warm_chorus', 'Warm chorus') },
                  { id: 'pad', label: __alloT('stem.music.pad_2', '\uD83C\uDF0A Pad'), desc: t('stem.synth.slow_lush', 'Slow & lush') }].map(function (v) {
                    return React.createElement("button", { key: v.id,
                      'aria-pressed': (d.omniVoice || 'harp') === v.id,
                      onClick: function () { upd('omniVoice', v.id); },
                      className: "flex-1 py-2 rounded-lg text-center transition-all " + ((d.omniVoice || 'harp') === v.id ? 'bg-amber-700 text-white shadow-md' : 'bg-white border border-amber-600 text-amber-800 hover:bg-amber-100')
                    },
                      React.createElement("div", { className: "text-xs font-bold" }, v.label),
                      React.createElement("div", { className: "text-[0.6875rem] " + ((d.omniVoice || 'harp') === v.id ? 'text-white' : 'text-amber-700') }, v.desc)
                    );
                  })
                ),

                // Chord grid
                React.createElement("div", { className: "mb-4" },
                  React.createElement("div", { className: "text-[0.6875rem] font-bold text-amber-700 mb-2" }, __alloT('stem.music.chord_grid_tap_to_select_space_to_stru', "\uD83C\uDFB6 Chord Grid \u2014 tap to select, Space to strum")),
                  React.createElement("div", { className: "grid grid-cols-7 gap-1" },
                    // Header row
                    ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (root) {
                      return React.createElement("div", { key: 'h_' + root, className: "text-center text-[0.6875rem] font-bold text-amber-700 py-0.5" }, root);
                    })
                  ),
                  // Chord type rows
                  [{ type: 'Major', label: 'Maj', color: 'from-amber-400 to-amber-500' },
                  { type: 'Minor', label: 'min', color: 'from-rose-400 to-rose-500' },
                  { type: 'Dom7', label: '7th', color: 'from-purple-400 to-purple-500' }].map(function (ct) {
                    return React.createElement("div", { key: ct.type, className: "grid grid-cols-7 gap-1 mt-1" },
                      ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (root) {
                        var isActive = d.omniChordRoot === root && d.omniChordType === ct.type;
                        return React.createElement("button", { key: root + ct.type,
                          'aria-pressed': isActive,
                          onClick: function () {
                            upd('omniChordRoot', root); upd('omniChordType', ct.type);
                          },
                          className: "py-2 rounded-lg text-[0.6875rem] font-bold transition-all " + (isActive ? 'bg-gradient-to-b ' + ct.color + ' text-white shadow-md scale-105' : 'bg-white border border-amber-600 text-amber-800 hover:border-amber-400 hover:bg-amber-50')
                        }, root + ct.label,
                          React.createElement("div", { className: "text-[0.6875rem] opacity-40 mt-0.5" }, (function() { var keys = { C: 'QAZ', D: 'WSX', E: 'EDC', F: 'RFV', G: 'TGB', A: 'YHN', B: 'UJM' }; var row = { Major: 0, Minor: 1, Dom7: 2 }; return keys[root] ? keys[root][row[ct.type]] : ''; })())
                        );
                      })
                    );
                  })
                ),

                // Strum plate
                React.createElement("div", { className: "mb-3" },
                  React.createElement("div", { className: "text-[0.6875rem] font-bold text-amber-700 mb-2" }, __alloT('stem.music.strum_plate_tap_or_drag_across', "\uD83C\uDFB8 Strum Plate \u2014 tap or drag across")),
                  React.createElement("div", { className: "flex gap-0.5 bg-gradient-to-b from-amber-100 to-amber-200 rounded-xl p-3 border border-amber-300" },
                    (function () {
                      var chordRoot = d.omniChordRoot || 'C';
                      var chordType = d.omniChordType || 'Major';
                      var chordData = CHORDS[chordType];
                      if (!chordData) return null;
                      var ri = NOTE_NAMES.indexOf(chordRoot);
                      var oct = d.octave || 4;
                      // Build string set: chord notes spread across range
                      var strings = [];
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +1
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 1 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +2
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 2 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +3
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 3 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +4
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 4 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      // Octave +5
                      chordData.intervals.forEach(function (intv) {
                        var nIdx = (ri + intv) % 12; var nOct = oct + 5 + Math.floor((ri + intv) / 12);
                        strings.push({ note: NOTE_NAMES[nIdx], oct: nOct, freq: noteFreq(NOTE_NAMES[nIdx], nOct) });
                      });
                      return strings.slice(0, 24).map(function (s, si) {
                        var isPlaying = (d.omniStrumActive || []).indexOf(si) !== -1;
                        var pluckString = function () {
                          playHarmonyTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                          upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                          setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                        };
                        return React.createElement("div", {
                          key: si, role: 'button', tabIndex: 0,
                          'aria-label': __alloFmt('stem.music.aria_pluck_string', 'Pluck string {note}', { note: s.note + s.oct }),
                          onMouseDown: pluckString,
                          // stopPropagation keeps Space from also reaching the pad's strum shortcut
                          onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pluckString(); } },
                          onMouseEnter: function (e) {
                            if (e.buttons === 1) {
                              playHarmonyTone(s.freq, 'omniStr_' + si, 900, d.omniVoice || 'harp');
                              upd('omniStrumActive', (d.omniStrumActive || []).concat([si]));
                              setTimeout(function () { upd('omniStrumActive', (d.omniStrumActive || []).filter(function (x) { return x !== si; })); }, 400);
                            }
                          },
                          className: "flex-1 rounded-lg cursor-pointer transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 " + (isPlaying ? 'bg-amber-500 shadow-lg scale-y-105' : 'bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500'),
                          style: { height: '80px', minWidth: '14px' }
                        },
                          // fixed amber-950 ink (no class, so the dark remap cannot lighten it on the amber key)
                          React.createElement("div", { className: "text-center pt-1 text-[0.6875rem] font-bold", style: { color: '#451a03' } }, s.note + s.oct),
                          React.createElement("div", { className: "w-px mx-auto h-10 " + (isPlaying ? 'bg-white' : 'bg-amber-600 opacity-40') })
                        );
                      });
                    })()
                  )
                ),

                // Full strum button
                React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_strum_named', 'Strum {root} {type}', { root: d.omniChordRoot || 'C', type: d.omniChordType || 'Major' }),
                  onClick: function () { strumHarmony(d.omniChordRoot || 'C', d.omniChordType || 'Major', d.omniVoice || 'harp'); },
                  className: "w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-700 to-rose-600 text-white hover:from-amber-700 hover:to-rose-600 shadow-md hover:shadow-lg transition-all"
                }, "\uD83C\uDFB5 Strum " + (d.omniChordRoot || 'C') + " " + (d.omniChordType || 'Major'))
              )
            ),



            // ═══════════ TAB: THEORY ═══════════
            synthTab === 'theory' && React.createElement("div", null,

              // ═══ INSTRUMENT PETTING ZOO ═══
              React.createElement("div", { className: "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, __alloT('stem.music.instrument_explorer', "\uD83C\uDFBB Instrument Explorer")),
                  React.createElement("span", { className: "text-[0.6875rem] text-amber-700" }, __alloT('stem.music.hear_see_the_waveform_and_learn_the_st', "Hear, see the waveform, and learn the story of each instrument")),
                  React.createElement("button", { onClick: function() { upd('showInstruments', !d.showInstruments); },
                    className: "ml-auto px-2 py-1 rounded text-[0.6875rem] font-bold " + (d.showInstruments ? 'bg-amber-700 text-white' : 'transition-colors bg-amber-100 text-amber-800 hover:bg-amber-200') + " transition-all"
                  }, d.showInstruments ? '\u25BC Hide' : '\u25B6 Explore')
                ),
                d.showInstruments && React.createElement("div", null,
                  // Category tabs
                  React.createElement("div", { className: "flex gap-1 mb-3 bg-amber-100/50 rounded-lg p-0.5" },
                    [{ id: 'strings', label: __alloT('stem.music.strings', '\uD83C\uDFBB Strings') }, { id: 'woodwinds', label: __alloT('stem.music.woodwinds', '\uD83C\uDF43 Woodwinds') }, { id: 'brass', label: __alloT('stem.music.brass', '\uD83C\uDFBA Brass') }, { id: 'percussion', label: __alloT('stem.music.percussion', '\uD83E\uDD41 Percussion') }, { id: 'keys', label: __alloT('stem.music.keys', '\uD83C\uDFB9 Keys') }, { id: 'world', label: __alloT('stem.music.world', '\uD83C\uDF0D World') }].map(function(cat) {
                      return React.createElement("button", { key: cat.id,
                        'aria-pressed': (d.instCategory || 'strings') === cat.id,
                        onClick: function() { upd('instCategory', cat.id); },
                        className: "flex-1 px-2 py-1.5 rounded-md text-[0.6875rem] font-bold transition-all " + ((d.instCategory || 'strings') === cat.id ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-600 hover:text-amber-800')
                      }, cat.label);
                    })
                  ),
                  // Instrument cards
                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                    (function() {
                      var INSTRUMENTS = {
                        strings: [
                          { name: __alloT('stem.music.violin', 'Violin'), icon: '\uD83C\uDFBB', family: 'Bowed String', range: 'G3-E7', origin: 'Italy, 16th century',
                            waveDesc: 'Rich harmonic series — strong odd AND even harmonics create the signature warmth. The bow creates continuous vibration.',
                            history: 'Developed in northern Italy around 1550 by Andrea Amati. Stradivarius violins (made 1680-1720) are considered the finest ever made — scientists still debate what makes them special. Some theories involve the wood treatment, the varnish, or even a mini ice age that changed tree growth.',
                            cultural: 'Central to European classical music, Irish/Scottish fiddle traditions, Roma/Gypsy music, Indian classical (violin was adopted in the 19th century), and Appalachian folk music.',
                            synth: { type: 'sawtooth', attack: 0.1, sustain: 0.8, vibratoDepth: 0.3, vibratoRate: 5 } },
                          { name: __alloT('stem.music.cello', 'Cello'), icon: '\uD83C\uDFBB', family: 'Bowed String', range: 'C2-A5', origin: 'Italy, 16th century',
                            waveDesc: 'Deep, warm tone with prominent lower harmonics. The larger body amplifies bass frequencies that resonate in the chest.',
                            history: 'Evolved from the viola da gamba family. Yo-Yo Ma popularized it globally. The cello\'s range closely matches the human voice, which is why it\'s often described as the most "singing" instrument.',
                            cultural: 'European classical, tango orchestras (Argentina), modern film scoring, and increasingly in pop/rock crossover (Apocalyptica, 2Cellos).',
                            synth: { type: 'sawtooth', attack: 0.15, sustain: 0.8, vibratoDepth: 0.2, vibratoRate: 4, octaveShift: -1 } },
                          { name: __alloT('stem.music.acoustic_guitar', 'Acoustic Guitar'), icon: '\uD83C\uDFB8', family: 'Plucked String', range: 'E2-E6', origin: 'Spain, 15th century',
                            waveDesc: 'Quick attack, gradual decay. Harmonics decay at different rates — high frequencies fade faster, giving the characteristic "warm fade."',
                            history: 'Descended from the Arabic oud via Moorish Spain. The modern 6-string form emerged around 1850. The most played instrument in the world.',
                            cultural: 'Flamenco (Spain), blues/country/folk (US), bossa nova (Brazil), classical (worldwide), rock, pop — truly universal.',
                            synth: { type: 'plucked', attack: 0.001, sustain: 0.1, release: 0.5 } },
                        ],
                        woodwinds: [
                          { name: __alloT('stem.music.flute', 'Flute'), icon: '\uD83C\uDF43', family: 'Edge-blown', range: 'C4-C7', origin: 'Prehistoric (40,000+ years)',
                            waveDesc: 'Nearly pure sine wave — very few overtones. The breathy quality comes from turbulent air noise mixed with the tone.',
                            history: 'The oldest known instruments are bone flutes from 40,000 years ago found in German caves. The modern metal flute was developed by Theobald Boehm in 1847.',
                            cultural: 'Found in virtually every culture: bansuri (India), shakuhachi (Japan), ney (Middle East), quena (Andes), Western orchestral, Irish/Celtic.',
                            synth: { type: 'sine', attack: 0.05, sustain: 0.7, vibratoDepth: 0.15, vibratoRate: 5 } },
                          { name: __alloT('stem.music.clarinet', 'Clarinet'), icon: '\uD83C\uDF43', family: 'Single Reed', range: 'D3-Bb6', origin: 'Germany, ~1700',
                            waveDesc: 'Cylindrical bore produces mainly ODD harmonics (3rd, 5th, 7th) — this gives it a hollow, woody quality distinct from the oboe.',
                            history: 'Invented by Johann Christoph Denner around 1700 from the earlier chalumeau. Mozart loved it and wrote his famous Clarinet Concerto for it.',
                            cultural: 'Classical orchestras, jazz (New Orleans), klezmer (Jewish/Eastern European), Turkish classical, marching bands.',
                            synth: { type: 'square', attack: 0.03, sustain: 0.7, filterCutoff: 3000 } },
                          { name: __alloT('stem.music.saxophone', 'Saxophone'), icon: '\uD83C\uDFB7', family: 'Single Reed (metal)', range: 'Bb3-F#6 (alto)', origin: 'Belgium, 1846',
                            waveDesc: 'Conical bore produces ALL harmonics (odd + even), giving a brighter, more complex tone than clarinet despite similar reed mechanism.',
                            history: 'Invented by Adolphe Sax in 1846 — one of the few instruments with a known inventor and exact date. Originally designed for military bands.',
                            cultural: 'Jazz (its defining instrument), R&B, rock (Pink Floyd, Bowie), classical, ska, and West African highlife music.',
                            synth: { type: 'sawtooth', attack: 0.02, sustain: 0.7, filterCutoff: 5000, vibratoDepth: 0.2 } },
                        ],
                        brass: [
                          { name: __alloT('stem.music.trumpet', 'Trumpet'), icon: '\uD83C\uDFBA', family: 'Brass', range: 'F#3-D6', origin: 'Ancient (3000+ years)',
                            waveDesc: 'Bright, brilliant tone with strong upper harmonics. The bell shape amplifies high frequencies, creating the characteristic "brassy" ring.',
                            history: 'Ancient trumpets were straight tubes used for signals. The coiled modern trumpet with valves appeared in 1820. Louis Armstrong and Miles Davis transformed it into a solo voice.',
                            cultural: 'Military music (worldwide), jazz, classical, mariachi (Mexico), Balkan brass bands, Ethiopian jazz, ska/reggae.',
                            synth: { type: 'sawtooth', attack: 0.03, sustain: 0.8, filterCutoff: 8000, filterQ: 2 } },
                          { name: __alloT('stem.music.trombone', 'Trombone'), icon: '\uD83C\uDFBA', family: 'Brass (slide)', range: 'E2-Bb4', origin: 'Europe, 15th century',
                            waveDesc: 'Warm, round tone in low register, increasingly bright higher up. The slide allows true glissando — continuous pitch bending unique among brass.',
                            history: 'Called "sackbut" in the Renaissance. The only brass instrument that can play true glissando (smooth pitch slides). Essential in jazz since the 1920s.',
                            cultural: 'Classical/orchestral, jazz big bands, New Orleans second line, salsa, ska.',
                            synth: { type: 'sawtooth', attack: 0.05, sustain: 0.7, filterCutoff: 4000 } },
                        ],
                        percussion: [
                          { name: __alloT('stem.music.drum_kit', 'Drum Kit'), icon: '\uD83E\uDD41', family: 'Membranophone', range: 'Unpitched', origin: 'USA, early 1900s',
                            waveDesc: 'Complex noise-like spectrum. Kick drum = low sine sweep. Snare = noise burst + body tone. Hi-hat = high-frequency noise.',
                            history: 'The modern drum kit was assembled in New Orleans in the early 1900s when one player combined bass drum, snare, and cymbals with foot pedals. Jazz demanded it.',
                            cultural: 'Rock, pop, jazz, funk, hip-hop — the backbone of virtually all popular music worldwide.',
                            synth: { type: 'drum', attack: 0.001, sustain: 0.1 } },
                          { name: __alloT('stem.music.marimba', 'Marimba'), icon: '\uD83C\uDFB6', family: 'Idiophone', range: 'C2-C7', origin: 'Central America/Africa',
                            waveDesc: 'Pure, warm tone with a prominent fundamental and fast-decaying upper harmonics. Resonator tubes amplify specific frequencies.',
                            history: 'Descended from African balafon, brought to Central America via the slave trade. National instrument of Guatemala and Costa Rica.',
                            cultural: 'Central American folk music, West African griot tradition, Japanese concert music, modern orchestral.',
                            synth: { type: 'sine', attack: 0.001, sustain: 0.2, release: 0.8 } },
                        ],
                        keys: [
                          { name: __alloT('stem.music.piano', 'Piano'), icon: '\uD83C\uDFB9', family: 'Struck String', range: 'A0-C8', origin: 'Italy, 1700',
                            waveDesc: 'Extremely rich harmonic spectrum. Hammers striking strings create a sharp attack followed by complex decay. Each note has slightly inharmonic overtones.',
                            history: 'Invented by Bartolomeo Cristofori around 1700 as the "pianoforte" (soft-loud) — the first keyboard that could play dynamics. Has 88 keys spanning over 7 octaves.',
                            cultural: 'Classical (Beethoven, Chopin, Liszt), jazz, blues, ragtime, pop, rock — the most versatile solo instrument ever created.',
                            synth: { type: 'plucked', attack: 0.001, sustain: 0.3, release: 1.0 } },
                          { name: __alloT('stem.music.organ_2', 'Organ'), icon: '\u26EA', family: 'Aerophone/Electronic', range: 'C1-C8', origin: 'Ancient Greece, 3rd century BC',
                            waveDesc: 'Steady, sustained tone with no decay. Different "stops" add specific harmonics — each pipe produces a nearly pure sine wave.',
                            history: 'The hydraulis (water organ) was invented in Alexandria around 250 BC. The pipe organ became the primary instrument of Christian worship for 1,000+ years. The largest have 33,000+ pipes.',
                            cultural: 'Church/liturgical music (worldwide), Bach, gospel, jazz (Hammond B3), progressive rock (Yes, ELP).',
                            synth: { type: 'sine', attack: 0.01, sustain: 0.95, release: 0.1 } },
                        ],
                        world: [
                          { name: __alloT('stem.music.sitar', 'Sitar'), icon: '\uD83C\uDF10', family: 'Plucked String', range: 'C2-C5', origin: 'India/Persia, 13th century',
                            waveDesc: 'Distinctive buzzing "jawari" quality from strings vibrating against a curved bridge. Sympathetic strings resonate creating a shimmering halo of sound.',
                            history: 'Evolved from the Persian setar. Has 18-21 strings but only 6-7 are played — the rest vibrate sympathetically. Ravi Shankar brought it to Western audiences in the 1960s.',
                            cultural: 'North Indian classical (Hindustani) music, ragas. George Harrison introduced it to rock via the Beatles. Essential to Indian film music.',
                            synth: { type: 'sawtooth', attack: 0.001, sustain: 0.3, vibratoDepth: 0.4, vibratoRate: 6, filterCutoff: 4000, filterQ: 6 } },
                          { name: __alloT('stem.music.djembe', 'Djembe'), icon: '\uD83E\uDD41', family: 'Hand Drum', range: 'Unpitched', origin: 'West Africa, 12th century',
                            waveDesc: 'Three distinct tones: bass (center), tone (edge), slap (rim). Each excites different drum head modes — physics of circular membrane vibration.',
                            history: 'Originated with the Mandinka people of Mali. Name means "everyone gather together in peace." Traditionally carved from a single log with goatskin head.',
                            cultural: 'West African ceremony and celebration, drum circles worldwide, modern world music fusion. Connected to griot oral tradition.',
                            synth: { type: 'drum', attack: 0.001, sustain: 0.15 } },
                          { name: __alloT('stem.music.erhu', 'Erhu'), icon: '\uD83C\uDFBB', family: 'Bowed String', range: 'D4-D7', origin: 'China, 10th century',
                            waveDesc: 'Hauntingly vocal quality from snakeskin resonator. Only 2 strings — all notes come from finger pressure, no frets. Extremely expressive vibrato.',
                            history: 'Part of the huqin family, developed during the Tang Dynasty. Called the "Chinese violin" in the West. Has only 2 strings but can express the full range of human emotion.',
                            cultural: 'Chinese classical and folk music, Beijing opera, modern Chinese pop, film scoring (Crouching Tiger, Hidden Dragon).',
                            synth: { type: 'sawtooth', attack: 0.05, sustain: 0.8, vibratoDepth: 0.5, vibratoRate: 5, filterCutoff: 3000 } },
                          { name: __alloT('stem.music.didgeridoo', 'Didgeridoo'), icon: '\uD83C\uDF10', family: 'Aerophone', range: 'Drone (50-80 Hz)', origin: 'Australia, 1500+ years',
                            waveDesc: 'Deep drone with rich overtones controlled by mouth shape. Circular breathing allows continuous sound — the player breathes in through the nose while pushing air out with cheeks.',
                            history: 'One of the oldest wind instruments, developed by Aboriginal Australians of northern Australia. Originally made from eucalyptus branches hollowed by termites.',
                            cultural: 'Aboriginal Australian ceremony, modern world music, meditation/sound healing. A symbol of Australian Indigenous culture.',
                            synth: { type: 'sawtooth', attack: 0.1, sustain: 0.95, filterCutoff: 600, filterQ: 4, vibratoDepth: 0.1 } },
                          { name: __alloT('stem.music.koto', 'Koto'), icon: '\uD83C\uDFB6', family: 'Plucked String', range: 'D2-D5', origin: 'Japan, 7th century',
                            waveDesc: 'Clean, bright plucked tone with fast decay. Movable bridges allow instant retuning. Each note rings clearly with minimal sustain.',
                            history: 'Derived from the Chinese guzheng, brought to Japan in the 7th century. Has 13 strings on a 6-foot body. Traditionally played by women of the imperial court.',
                            cultural: 'Japanese classical music (gagaku), traditional ceremony, modern J-pop arrangements, Miyagi Michio\'s famous "Spring Sea" (1929).',
                            synth: { type: 'plucked', attack: 0.001, sustain: 0.15, release: 0.6 } },
                        ],
                      };
                      var category = d.instCategory || 'strings';
                      return (INSTRUMENTS[category] || []).map(function(inst) {
                        var isExpanded = d.expandedInst === inst.name;
                        return React.createElement("div", { key: inst.name,
                          className: "bg-white rounded-xl border transition-all " + (isExpanded ? 'border-amber-400 shadow-lg col-span-1 sm:col-span-2' : 'border-amber-100 hover:border-amber-300 hover:shadow-md')
                        },
                          // Header (always visible)
                          React.createElement("div", {
                            className: "p-3 cursor-pointer flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600",
                            role: 'button', tabIndex: 0, 'aria-expanded': isExpanded ? 'true' : 'false',
                            onKeyDown: musKeyAct(function() { upd('expandedInst', isExpanded ? null : inst.name); }),
                            onClick: function() { upd('expandedInst', isExpanded ? null : inst.name); }
                          },
                            React.createElement("span", { className: "text-2xl" }, inst.icon),
                            React.createElement("div", { className: "flex-1 min-w-0" },
                              React.createElement("div", { className: "flex items-center gap-2" },
                                React.createElement("span", { className: "text-sm font-bold text-slate-800" }, inst.name),
                                React.createElement("span", { className: "text-[0.6875rem] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold" }, inst.family)
                              ),
                              React.createElement("div", { className: "text-[0.6875rem] text-slate-600" }, inst.origin + ' \u2022 Range: ' + inst.range)
                            ),
                            // Play button
                            React.createElement("button", {
                              onClick: function(e) {
                                e.stopPropagation();
                                var s = inst.synth;
                                if (s.type === 'drum') { playDrum('kick'); setTimeout(function() { playDrum('snare'); }, 200); return; }
                                // Temporarily set synth params to approximate instrument
                                var origWave = d.waveType; var origEngine = d.synthEngine;
                                if (s.type === 'plucked') {
                                  playPlucked(noteFreq('A', (s.octaveShift || 0) + 4), 'inst_demo', s.ksBrightness || 0.8, s.ksDamping || 0.996);
                                } else {
                                  upd('waveType', s.type); upd('synthEngine', 'standard');
                                  var freq2 = noteFreq('A', (s.octaveShift || 0) + 4);
                                  playNoteFor(freq2, 'inst_demo', 1500);
                                  setTimeout(function() { upd('waveType', origWave); upd('synthEngine', origEngine); }, 100);
                                }
                              },
                              className: "shrink-0 w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center hover:bg-amber-800 transition-all shadow-sm",
                              title: __alloFmt('stem.music.title_hear_instrument', 'Hear {name}', { name: inst.name })
                            }, "\u25B6"),
                            React.createElement("span", { className: "text-slate-600 text-xs shrink-0" }, isExpanded ? '\u25B2' : '\u25BC')
                          ),
                          // Expanded detail
                          isExpanded && React.createElement("div", { className: "px-3 pb-3 space-y-2 border-t border-amber-100 pt-2 animate-in fade-in duration-200" },
                            // Waveform visualization canvas + description
                            React.createElement("div", { className: "bg-purple-50 rounded-lg p-2 border border-purple-100" },
                              React.createElement("div", { className: "text-[0.6875rem] font-bold text-purple-700 mb-1" }, __alloT('stem.music.waveform_harmonics', "\u223F Waveform & Harmonics")),
                              // Canvas that draws the instrument's waveform shape
                              React.createElement("canvas", {
                                role: 'img',
                                'aria-label': __alloT('stem.music.instrument_waveform_shape',
                                  "Waveform shape of the selected instrument"),
                                style: { width: '100%', height: '60px', display: 'block', borderRadius: '6px', background: '#1a0a2e' },
                                ref: function(canvas) {
                                  if (!canvas) return;
                                  var g = canvas.getContext('2d');
                                  if (!g) return;
                                  var W = canvas.offsetWidth * 2, H = 120;
                                  // Guarded: an INLINE ref re-runs on EVERY re-render, and assigning
                                  // width/height REALLOCATES and clears the bitmap each time. The draw
                                  // below clears explicitly, so only resize when the size really changed.
                                  if (canvas.width !== W) canvas.width = W;
                                  if (canvas.height !== H) canvas.height = H;
                                  g.clearRect(0, 0, W, H);
                                  var hc = musicHighContrast();
                                  // CRT phosphor scope backdrop + center graticule
                                  if (hc) {
                                    g.fillStyle = '#000000';
                                  } else if (typeof g.createLinearGradient === 'function') {
                                    var scopeBg = g.createLinearGradient(0, 0, 0, H);
                                    scopeBg.addColorStop(0, '#140b29');
                                    scopeBg.addColorStop(1, '#0b0618');
                                    g.fillStyle = scopeBg;
                                  } else {
                                    g.fillStyle = '#140b29';
                                  }
                                  g.fillRect(0, 0, W, H);
                                  g.strokeStyle = hc ? 'rgba(255,255,0,0.45)' : 'rgba(167,139,250,0.16)'; g.lineWidth = 1;
                                  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
                                  // Draw waveform based on instrument's harmonic content
                                  var wType = inst.synth.type;
                                  var waveW = Math.max(40, W - 76);
                                  g.save();
                                  g.lineCap = 'round'; g.lineJoin = 'round';
                                  g.beginPath();
                                  for (var xi = 0; xi < waveW; xi++) {
                                    var t2 = xi / waveW * Math.PI * 4;
                                    var y2 = 0;
                                    if (wType === 'sine') { y2 = Math.sin(t2); }
                                    else if (wType === 'square') { for (var hn = 1; hn <= 7; hn += 2) y2 += Math.sin(t2 * hn) / hn; }
                                    else if (wType === 'sawtooth') { for (var hn2 = 1; hn2 <= 8; hn2++) y2 += Math.sin(t2 * hn2) / hn2 * (hn2 % 2 === 0 ? -1 : 1); }
                                    else if (wType === 'triangle') { for (var hn3 = 1; hn3 <= 7; hn3 += 2) y2 += Math.sin(t2 * hn3) / (hn3 * hn3) * (((hn3 - 1) / 2) % 2 === 0 ? 1 : -1); }
                                    else if (wType === 'plucked') { y2 = Math.sin(t2) * Math.exp(-xi / waveW * 3) + Math.sin(t2 * 2) * 0.3 * Math.exp(-xi / waveW * 4); }
                                    else { y2 = Math.sin(t2); }
                                    var py = H / 2 - y2 * H * 0.34;
                                    if (xi === 0) g.moveTo(xi, py); else g.lineTo(xi, py);
                                  }
                                  if (hc) {
                                    g.strokeStyle = '#ffff00'; g.lineWidth = 2.4; g.stroke();
                                  } else {
                                    g.shadowColor = '#a855f7'; g.shadowBlur = 10;
                                    g.strokeStyle = 'rgba(168,85,247,0.45)'; g.lineWidth = 4.5; g.stroke();
                                    g.shadowBlur = 4; g.strokeStyle = '#c4b5fd'; g.lineWidth = 2; g.stroke();
                                    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.72)'; g.lineWidth = 0.85; g.stroke();
                                  }
                                  g.restore();
                                  // Glowing harmonic bars on the right
                                  var harmonicAmps = wType === 'sine' ? [1] : wType === 'square' ? [1, 0, 0.33, 0, 0.2, 0, 0.14] : wType === 'sawtooth' ? [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14] : wType === 'triangle' ? [1, 0, 0.11, 0, 0.04] : wType === 'plucked' ? [1, 0.3, 0.15, 0.08, 0.04] : [1];
                                  g.font = '8px monospace'; g.textAlign = 'center';
                                  harmonicAmps.forEach(function(amp, hi) {
                                    var bx = W - 64 + hi * 8.5; var bh = amp * H * 0.48;
                                    var hHue = 280 - hi * 28;
                                    if (bh > 0.5) {
                                      g.fillStyle = hc ? '#00ff00' : ('hsla(' + hHue + ',85%,62%,' + (0.45 + amp * 0.5) + ')');
                                      g.fillRect(bx, H - bh - 12, 6, bh);
                                      if (!hc) {
                                        g.fillStyle = 'hsla(' + hHue + ',100%,86%,0.9)';
                                        g.fillRect(bx, H - bh - 14, 6, 2);
                                      }
                                    }
                                    g.fillStyle = hc ? '#ffff00' : 'rgba(226,232,240,0.55)';
                                    g.fillText(String(hi + 1), bx + 3, H - 2);
                                  });
                                  // Labels
                                  g.fillStyle = hc ? '#ffff00' : 'rgba(226,232,240,0.55)'; g.font = 'bold 9px system-ui'; g.textAlign = 'left';
                                  g.fillText(__alloT('stem.music.canvas_waveform', 'WAVEFORM'), 6, 12);
                                  g.textAlign = 'right';
                                  g.fillText(__alloT('stem.music.canvas_harmonics', 'HARMONICS'), W - 6, 12);
                                }
                              }),
                              React.createElement("p", { className: "text-[0.6875rem] text-purple-600 leading-relaxed mt-1" }, inst.waveDesc)
                            ),

                            // Interactive note player
                            React.createElement("div", { className: "bg-blue-50 rounded-lg p-2 border border-blue-100" },
                              React.createElement("div", { className: "text-[0.6875rem] font-bold text-blue-700 mb-1" }, "\uD83C\uDFB5 Play Notes \u2014 Hear how " + inst.name + " sounds across its range"),
                              React.createElement("div", { className: "flex gap-1 flex-wrap" },
                                (function() {
                                  // Generate playable notes based on instrument range
                                  var notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                                  var startOct = inst.synth.octaveShift ? 4 + inst.synth.octaveShift : (inst.range.match(/(\d)/) ? parseInt(inst.range.match(/(\d)/)[1]) : 4);
                                  var playableNotes = [];
                                  for (var oc2 = startOct; oc2 <= startOct + 1; oc2++) {
                                    notes.forEach(function(n) { playableNotes.push({ note: n, octave: oc2 }); });
                                  }
                                  return playableNotes.map(function(pn, pni) {
                                    return React.createElement("button", { key: pni,
                                      onClick: function() {
                                        var freq3 = noteFreq(pn.note, pn.octave);
                                        var s = inst.synth;
                                        if (s.type === 'plucked') { playPlucked(freq3, 'inst_' + pni, s.ksBrightness || 0.8, s.ksDamping || 0.996); }
                                        else if (s.type === 'drum') { playDrum(pni % 2 === 0 ? 'kick' : 'snare'); }
                                        else {
                                          // Set instrument-appropriate params temporarily
                                          var origW = d.waveType; upd('waveType', s.type);
                                          playNoteFor(freq3, 'inst_' + pni, 800);
                                          setTimeout(function() { upd('waveType', origW); }, 50);
                                        }
                                      },
                                      className: "px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all border hover:shadow-md hover:scale-105 active:scale-95 " + (d['instNoteActive_' + pni] ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border-blue-600 hover:bg-blue-50'),
                                      style: { minWidth: '32px' }
                                    }, pn.note + pn.octave);
                                  });
                                })()
                              ),
                              inst.synth.type !== 'drum' && React.createElement("div", { className: "flex gap-2 mt-2 items-center" },
                                React.createElement("span", { className: "text-[0.6875rem] text-blue-500" }, __alloT('stem.music.play_a_scale', "Play a scale:")),
                                React.createElement("button", {
                                  onClick: function() {
                                    var startOct2 = inst.synth.octaveShift ? 4 + inst.synth.octaveShift : 4;
                                    var scaleNotes2 = [0,2,4,5,7,9,11,12]; // Major scale
                                    scaleNotes2.forEach(function(semi, si) {
                                      setTimeout(function() {
                                        var freq4 = noteFreq('C', startOct2) * Math.pow(2, semi / 12);
                                        var s = inst.synth;
                                        if (s.type === 'plucked') playPlucked(freq4, 'inst_scale_' + si, 0.8, 0.996);
                                        else {
                                          var origW2 = d.waveType; upd('waveType', s.type);
                                          playNoteFor(freq4, 'inst_scale_' + si, 400);
                                          setTimeout(function() { upd('waveType', origW2); }, 50);
                                        }
                                      }, si * 300);
                                    });
                                  },
                                  className: "px-2 py-1 rounded text-[0.6875rem] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                                }, __alloT('stem.music.c_major_scale', "\u25B6 C Major Scale")),
                                React.createElement("button", {
                                  onClick: function() {
                                    var startOct3 = inst.synth.octaveShift ? 4 + inst.synth.octaveShift : 4;
                                    var chromatic = [0,1,2,3,4,5,6,7,8,9,10,11,12];
                                    chromatic.forEach(function(semi, si) {
                                      setTimeout(function() {
                                        var freq5 = noteFreq('C', startOct3) * Math.pow(2, semi / 12);
                                        var s = inst.synth;
                                        if (s.type === 'plucked') playPlucked(freq5, 'inst_chrom_' + si, 0.8, 0.996);
                                        else {
                                          var origW3 = d.waveType; upd('waveType', s.type);
                                          playNoteFor(freq5, 'inst_chrom_' + si, 250);
                                          setTimeout(function() { upd('waveType', origW3); }, 50);
                                        }
                                      }, si * 200);
                                    });
                                  },
                                  className: "px-2 py-1 rounded text-[0.6875rem] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                                }, __alloT('stem.music.chromatic_2', "\u25B6 Chromatic"))
                              )
                            ),

                            // History
                            React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-100" },
                              React.createElement("div", { className: "text-[0.6875rem] font-bold text-amber-700 mb-0.5" }, __alloT('stem.music.history', "\uD83D\uDCDC History")),
                              React.createElement("p", { className: "text-[0.6875rem] text-amber-700 leading-relaxed" }, inst.history)
                            ),
                            // Cultural connections
                            React.createElement("div", { className: "bg-emerald-50 rounded-lg p-2 border border-emerald-100" },
                              React.createElement("div", { className: "text-[0.6875rem] font-bold text-emerald-700 mb-0.5" }, __alloT('stem.music.cultural_connections', "\uD83C\uDF0D Cultural Connections")),
                              React.createElement("p", { className: "text-[0.6875rem] text-emerald-700 leading-relaxed" }, inst.cultural)
                            )
                          )
                        );
                      });
                    })()
                  )
                )
              ),

              // Intervals
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, __alloT('stem.music.intervals', "\uD83D\uDCCF Intervals")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.intervals.text }, "\u2753")
                ),
                React.createElement("div", { className: "grid grid-cols-2 gap-1" },
                  INTERVALS.map(function (intv) {
                    var qColors = { perfect: 'bg-green-50 border-green-200 text-green-700', consonant: 'bg-blue-50 border-blue-200 text-blue-700', dissonant: 'bg-red-50 border-red-200 text-red-700' };
                    return React.createElement("button", { "aria-label": intv.name + " interval",
                      key: intv.name,
                      onClick: function () {
                        var base = noteFreq(selectedRoot, d.octave || 4);
                        playNoteFor(base, 'intv_base', 600);
                        setTimeout(function () { playNoteFor(base * Math.pow(2, intv.semitones / 12), 'intv_top', 600); }, 400);
                      },
                      className: "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all hover:shadow-sm " + (qColors[intv.quality] || 'bg-slate-50 border-slate-200')
                    },
                      React.createElement("span", { className: "text-[0.6875rem] font-bold" }, intv.name),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 ml-auto" }, intv.ratio),
                      React.createElement("span", { className: "text-[0.6875rem] text-slate-600 hidden sm:inline" }, intv.song)
                    );
                  })
                )
              ),

              // Harmonic Series
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, __alloT('stem.music.harmonic_series', "\uD83C\uDF10 Harmonic Series")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.harmonicSeries.text }, "\u2753")
                ),
                React.createElement("div", { className: "flex gap-2" },
                  HARMONICS_INFO.map(function (h) {
                    var isHarmActive = (d.activeHarmonics || [1]).indexOf(h.n) !== -1;
                    return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_toggle_harmonic', 'Toggle harmonic {n}', { n: h.n }),
                      key: h.n,
                      'aria-pressed': !!isHarmActive,
                      onClick: function () {
                        playHarmonic(h.n);
                        var cur = d.activeHarmonics || [1];
                        var next = isHarmActive && h.n !== 1 ? cur.filter(function(x) { return x !== h.n; }) : cur.indexOf(h.n) === -1 ? cur.concat([h.n]) : cur;
                        upd('activeHarmonics', next);
                      },
                      className: "flex-1 py-3 rounded-xl border text-center hover:shadow-md transition-all group cursor-pointer " + (isHarmActive ? 'bg-gradient-to-b from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-md' : 'bg-gradient-to-b from-indigo-50 to-purple-50 border-indigo-200')
                    },
                      React.createElement("span", { className: "text-lg font-bold block group-hover:scale-110 transition-transform " + (isHarmActive ? 'text-white' : 'text-indigo-600') }, h.n),
                      React.createElement("span", { className: "text-[0.6875rem] block " + (isHarmActive ? 'text-white' : 'text-indigo-600') }, h.ratio),
                      React.createElement("span", { className: "text-[0.6875rem] block " + (isHarmActive ? 'text-white' : 'text-slate-600') }, h.interval)
                    );
                  })
                ),
                // Visual waveform builder — shows how active harmonics combine
                React.createElement("div", { className: "mt-3 rounded-xl overflow-hidden border border-indigo-200", style: { height: '80px' } },
                  React.createElement("canvas", {
                    // Unlike the other STEM canvases, this one is NOT decorative
                    // and carries no aria-hidden: it is the only feedback showing
                    // what the harmonic sliders are building. A static name is
                    // the honest minimum — it identifies the region rather than
                    // describing the current wave. Live per-change description
                    // would need the drawing code to report its own state.
                    role: 'img',
                    'aria-label': __alloT('stem.music.waveform_preview',
                      "Waveform preview showing how the active harmonics combine"),
                    style: { width: '100%', height: '100%', display: 'block', background: '#0f0a1e' },
                    key: 'harmCanvas_' + (d.activeHarmonics || [1]).join('_'),
                    ref: function(canvas) {
                      if (!canvas) return;
                      var g = canvas.getContext('2d');
                      if (!g) return;
                      var W = canvas.offsetWidth * 2, H = 160;
                      // Guarded: an INLINE ref re-runs on EVERY re-render, and assigning
                      // width/height REALLOCATES and clears the bitmap each time. The draw
                      // below clears explicitly, so only resize when the size really changed.
                      if (canvas.width !== W) canvas.width = W;
                      if (canvas.height !== H) canvas.height = H;
                      g.clearRect(0, 0, W, H);
                      var hc = musicHighContrast();
                      if (hc) {
                        g.fillStyle = '#000000';
                      } else if (typeof g.createLinearGradient === 'function') {
                        var hBg = g.createLinearGradient(0, 0, 0, H);
                        hBg.addColorStop(0, '#120b28'); hBg.addColorStop(1, '#090517');
                        g.fillStyle = hBg;
                      } else {
                        g.fillStyle = '#0f0a1e';
                      }
                      g.fillRect(0, 0, W, H);
                      g.strokeStyle = hc ? 'rgba(255,255,0,0.45)' : 'rgba(139,92,246,0.15)'; g.lineWidth = 1;
                      g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
                      var harmonics = d.activeHarmonics || [1];
                      // Draw individual harmonics (faint colored partials)
                      for (var hi = 0; hi < harmonics.length; hi++) {
                        var hn = harmonics[hi];
                        g.strokeStyle = hc ? 'rgba(0,255,0,0.55)' : ('hsla(' + (hn * 40) + ',80%,65%,0.28)');
                        g.lineWidth = 1.2; g.beginPath();
                        for (var xi = 0; xi < W; xi += 2) {
                          var t3 = xi / W * Math.PI * 4;
                          var y3 = Math.sin(t3 * hn) / hn;
                          var py2 = H / 2 - y3 * H * 0.34;
                          if (xi === 0) g.moveTo(xi, py2); else g.lineTo(xi, py2);
                        }
                        g.stroke();
                      }
                      // Draw combined CRT phosphor waveform (translucent curtain + neon bloom + hot core)
                      g.save();
                      g.lineCap = 'round'; g.lineJoin = 'round';
                      if (!hc) {
                        g.beginPath(); g.moveTo(0, H / 2);
                        for (var xf = 0; xf < W; xf += 2) {
                          var tf = xf / W * Math.PI * 4;
                          var sumF = 0;
                          for (var hf = 0; hf < harmonics.length; hf++) sumF += Math.sin(tf * harmonics[hf]) / harmonics[hf];
                          g.lineTo(xf, H / 2 - sumF * H * 0.29);
                        }
                        g.lineTo(W, H / 2); g.closePath();
                        if (typeof g.createLinearGradient === 'function') {
                          var curG = g.createLinearGradient(0, 0, 0, H);
                          curG.addColorStop(0, 'rgba(56,189,248,0.22)');
                          curG.addColorStop(0.5, 'rgba(167,139,250,0.03)');
                          curG.addColorStop(1, 'rgba(244,114,182,0.22)');
                          g.fillStyle = curG;
                        } else {
                          g.fillStyle = 'rgba(167,139,250,0.14)';
                        }
                        g.fill();
                      }
                      g.beginPath();
                      for (var xi2 = 0; xi2 < W; xi2 += 2) {
                        var t4 = xi2 / W * Math.PI * 4;
                        var sum = 0;
                        for (var hs2 = 0; hs2 < harmonics.length; hs2++) sum += Math.sin(t4 * harmonics[hs2]) / harmonics[hs2];
                        var py3 = H / 2 - sum * H * 0.29;
                        if (xi2 === 0) g.moveTo(xi2, py3); else g.lineTo(xi2, py3);
                      }
                      if (hc) {
                        g.strokeStyle = '#ffff00'; g.lineWidth = 2.6; g.stroke();
                      } else {
                        g.shadowColor = '#a855f7'; g.shadowBlur = 12;
                        g.strokeStyle = 'rgba(168,85,247,0.45)'; g.lineWidth = 5; g.stroke();
                        g.shadowBlur = 4; g.strokeStyle = '#c4b5fd'; g.lineWidth = 2.4; g.stroke();
                        g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,0.78)'; g.lineWidth = 0.9; g.stroke();
                      }
                      g.restore();
                      // Labels
                      g.fillStyle = hc ? '#ffff00' : 'rgba(226,232,240,0.6)'; g.font = 'bold 10px system-ui'; g.textAlign = 'left';
                      g.fillText(__alloFmt('stem.music.canvas_active_harmonics', 'Active harmonics: {list}', { list: harmonics.slice().sort(function(a,b){return a-b;}).join(', ') }), 8, 14);
                      g.textAlign = 'right';
                      var waveType2 = harmonics.length === 1 ? 'Sine (pure)' : harmonics.every(function(h2){return h2%2===1;}) ? 'Odd harmonics (square/clarinet-like)' : 'All harmonics (sawtooth/violin-like)';
                      g.fillText(waveType2, W - 8, 14);
                      // Play combined button instruction
                      g.fillStyle = hc ? '#ffffff' : 'rgba(196,181,253,0.65)'; g.font = '9px system-ui'; g.textAlign = 'center';
                      g.fillText(__alloT('stem.music.canvas_harmonics_hint', 'Click harmonics above to add/remove \u2014 watch the wave change!'), W / 2, H - 6);
                    }
                  })
                ),
                React.createElement("button", {
                  onClick: function() {
                    var harmonics2 = d.activeHarmonics || [1];
                    var baseFreq2 = noteFreq(selectedRoot, d.octave || 4);
                    harmonics2.forEach(function(hn, hi) {
                      setTimeout(function() { playNoteFor(baseFreq2 * hn, 'harm_combo_' + hn, 1200); }, hi * 50);
                    });
                  },
                  className: "mt-2 w-full py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
                }, "\u25B6 Play All Active Harmonics Together (" + (d.activeHarmonics || [1]).length + " partials)"),
                React.createElement("p", { className: "text-[0.6875rem] text-indigo-700 mt-1 text-center italic" },
                  __alloT('stem.music.this_is_how_different_instruments_get_', "This is how different instruments get their unique sound! A flute is mostly harmonic 1 (sine). A clarinet has odd harmonics (1,3,5,7). A violin has all harmonics. Click to build your own timbre!")
                )
              ),

              // Ear Training
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-emerald-800" }, __alloT('stem.music.ear_training', "\uD83D\uDC42 Ear Training")),
                  React.createElement("button", { "aria-label": intervalGame ? __alloT('stem.music.aria_new_interval', 'New interval') : __alloT('stem.music.aria_start_interval_game', 'Start interval game'),
                    onClick: startIntervalGame,
                    className: "transition-colors ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-700"
                  }, intervalGame ? '\uD83D\uDD04 New Interval' : '\u25B6 Start'),
                  intervalGame && React.createElement("button", { "aria-label": __alloT('stem.music.replay_2', "Replay"),
                    onClick: replayInterval,
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700"
                  }, __alloT('stem.music.replay_3', '\uD83D\uDD0A Replay'))
                ),
                intervalGame && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-emerald-700 mb-2" }, __alloT('stem.music.what_interval_do_you_hear', "What interval do you hear?")),
                  intervalGame.score > 0 && React.createElement("span", { className: "text-[0.6875rem] font-bold text-emerald-600 mr-2" }, "\u2B50 Score: " + intervalGame.score + " | \uD83D\uDD25 Streak: " + intervalGame.streak),
                  React.createElement("div", { className: "grid grid-cols-4 gap-1 mt-2" },
                    INTERVALS.slice(1).map(function (intv) {
                      var isCorrect = intervalGame.answered && intv.name === intervalGame.answer;
                      var isChosen = intervalGame.chosen === intv.name;
                      var isWrong = intervalGame.answered && isChosen && !isCorrect;
                      return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_guess', 'Guess: {name}', { name: intv.name }),
                        key: intv.name,
                        disabled: intervalGame.answered,
                        onClick: function () {
                          var correct = intv.name === intervalGame.answer;
                          var nextScore = intervalGame.score + (correct ? 1 : 0);
                          var nextStreak = correct ? intervalGame.streak + 1 : 0;
                          upd('intervalGame', Object.assign({}, intervalGame, { answered: true, chosen: intv.name, score: nextScore, streak: nextStreak }));
                          upd('earCorrect', (d.earCorrect || 0) + (correct ? 1 : 0));
                          var msg = correct
                            ? '\u2705 ' + __alloT('stem.music.ear_correct', 'Correct!') + ' ' + intv.name
                            : '\u274C ' + __alloT('stem.music.ear_it_was', 'It was') + ' ' + intervalGame.answer;
                          addToast(msg, correct ? 'success' : 'error');
                          if (announceToSR) announceToSR(msg);
                          if (correct && ctx.awardXP) ctx.awardXP('musicSynth', 2, __alloT('stem.music.ear_training', '\uD83D\uDC42 Ear Training'));
                        },
                        className: "px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold border transition-all " + (isCorrect ? 'bg-green-100 border-green-400 text-green-700' : isWrong ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-emerald-600 text-slate-700 hover:border-emerald-400')
                      }, intv.name);
                    })
                  )
                )
              ),

              // Filter Lab
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, __alloT('stem.music.filter_lab', "\uD83C\uDF0A Filter Lab")),
                  React.createElement("span", { className: "text-[0.6875rem] text-slate-600 cursor-help", title: EFFECT_TIPS.filter.text }, "\u2753")
                ),
                React.createElement("svg", { role: 'img', 'aria-label': __alloT('stem.music.filter_img_label', 'Filter frequency response curve'), viewBox: "0 0 300 100", className: "w-full bg-slate-50 rounded-lg mb-2", style: { maxHeight: '100px' } },
                  React.createElement("line", { x1: 20, y1: 80, x2: 280, y2: 80, stroke: "#e2e8f0", strokeWidth: 1 }),
                  React.createElement("line", { x1: 20, y1: 20, x2: 20, y2: 80, stroke: "#e2e8f0", strokeWidth: 1 }),
                  (function () {
                    var type = d.filterType || 'lowpass';
                    var cutoffHz = d.filterCutoff || 8000;
                    var qVal = d.filterQ || 1;
                    var sr = (window._alloSynthCtx && window._alloSynthCtx.sampleRate) || 48000;
                    // +12dB at the top of the box down to -48dB at the bottom, so a
                    // resonant peak is visible instead of being clipped flat.
                    var TOP_DB = 12, BOTTOM_DB = -48;
                    var pts = [];
                    for (var i = 0; i <= 260; i += 2) {
                      var hz = filterPlotFreqAt(i / 260);
                      var db = biquadMagnitudeDb(type, hz, cutoffHz, qVal, sr);
                      var norm = (db - BOTTOM_DB) / (TOP_DB - BOTTOM_DB);
                      if (norm < 0) norm = 0; else if (norm > 1) norm = 1;
                      pts.push((20 + i) + ',' + (80 - norm * 60).toFixed(1));
                    }
                    var cutoffX = 20 + filterPlotFractionOf(cutoffHz) * 260;
                    return React.createElement("g", null,
                      React.createElement("line", { x1: cutoffX, y1: 14, x2: cutoffX, y2: 80, stroke: "#f59e0b", strokeWidth: 1, strokeDasharray: "3 2" }),
                      React.createElement("polyline", { points: pts.join(' '), fill: "none", stroke: "#06b6d4", strokeWidth: 2 })
                    );
                  })(),
                  [20, 100, 1000, 10000].map(function (hz) {
                    return React.createElement("text", { key: hz, x: 20 + filterPlotFractionOf(hz) * 260, y: 95, fill: "#94a3b8", textAnchor: "middle", style: { fontSize: "8px" } },
                      hz >= 1000 ? (hz / 1000) + 'k' : String(hz));
                  }),
                  React.createElement("text", { x: 18, y: 22, fill: "#94a3b8", textAnchor: "end", style: { fontSize: "8px" } }, "+12"),
                  React.createElement("text", { x: 18, y: 45, fill: "#94a3b8", textAnchor: "end", style: { fontSize: "8px" } }, "0dB"),
                  React.createElement("text", { x: 18, y: 79, fill: "#94a3b8", textAnchor: "end", style: { fontSize: "8px" } }, "-48")
                ),
                React.createElement("div", { className: "grid grid-cols-3 gap-2" },
                  ['lowpass', 'highpass', 'bandpass'].map(function (ft) {
                    return React.createElement("button", { key: ft,
                      'aria-pressed': (d.filterType || 'lowpass') === ft,
                      onClick: function () { upd('filterType', ft); },
                      className: "py-1.5 rounded-lg text-[0.6875rem] font-bold capitalize transition-all " + ((d.filterType || 'lowpass') === ft ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600')
                    }, ft);
                  })
                )
              ),

              // Karplus-Strong Lab
              React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, __alloT('stem.music.karplus_strong_lab', "\uD83C\uDFB8 Karplus-Strong Lab")),
                  React.createElement("span", { className: "text-[0.6875rem] text-amber-700 cursor-help", title: EFFECT_TIPS.karplusStrong.text }, "\u2753")
                ),
                React.createElement("p", { className: "text-[0.6875rem] text-amber-700 mb-3 leading-relaxed" }, __alloT('stem.music.karplus_strong_synthesis_creates_reali', "Karplus-Strong synthesis creates realistic plucked string sounds using a short noise burst fed into a delay line with filtered feedback. Adjust brightness (initial noise color) and damping (sustain length) to shape the string character.")),
                React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },
                  [{ label: __alloT('stem.music.bright_guitar', '\uD83C\uDFB8 Bright Guitar'), brightness: 0.95, damping: 0.998 },
                  { label: __alloT('stem.music.banjo', '\uD83E\uDE95 Banjo'), brightness: 0.99, damping: 0.993 },
                  { label: __alloT('stem.music.warm_bass', '\uD83C\uDFBB Warm Bass'), brightness: 0.3, damping: 0.999 }].map(function (preset) {
                    return React.createElement("button", { key: preset.label,
                      onClick: function () {
                        upd('ksBrightness', preset.brightness); upd('ksDamping', preset.damping); upd('synthEngine', 'plucked');
                        playPlucked(noteFreq(selectedRoot, d.octave || 4), 'ks_demo', preset.brightness, preset.damping);
                      },
                      className: "py-2 rounded-lg text-[0.6875rem] font-bold bg-white border border-amber-600 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all"
                    }, preset.label);
                  })
                ),
                [{ k: 'ksBrightness', label: t('stem.synth.brightness', 'Brightness'), min: 0.1, max: 1, step: 0.01 },
                { k: 'ksDamping', label: t('stem.synth.sustaindamping', 'Sustain/Damping'), min: 0.99, max: 0.9999, step: 0.0001 }].map(function (p) {
                  return React.createElement("div", { key: p.k, className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-[0.6875rem] font-bold text-amber-700 w-24" }, p.label),
                    React.createElement("input", { type: "range", 'aria-label': p.label, 'aria-valuetext': (String(d[p.k] != null ? d[p.k] : (p.k === 'ksBrightness' ? 0.8 : 0.996))), min: p.min, max: p.max, step: p.step, value: d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996), onChange: function (e) { upd(p.k, parseFloat(e.target.value)); }, className: "flex-1 accent-amber-500" }),
                    React.createElement("span", { className: "text-[0.6875rem] text-amber-700 w-14 text-right font-mono" }, (d[p.k] || (p.k === 'ksBrightness' ? 0.8 : 0.996)).toFixed(p.k === 'ksDamping' ? 4 : 2))
                  );
                }),
                React.createElement("button", {
                  'aria-label': __alloFmt('stem.music.aria_pluck_note', 'Pluck {note}', { note: selectedRoot + (d.octave || 4) }),
                  onClick: function () { playPlucked(noteFreq(selectedRoot, d.octave || 4), 'ks_test', d.ksBrightness || 0.8, d.ksDamping || 0.996); },
                  className: "mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-700 text-white hover:bg-amber-700 transition-all w-full"
                }, "\uD83C\uDFB8 Pluck " + selectedRoot + (d.octave || 4))
              ),

              // Music Theory Quiz (moved from Quiz tab)
              React.createElement("div", { className: "bg-white rounded-xl border p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-slate-800" }, __alloT('stem.music.music_theory_quiz_2', "\uD83E\uDDE0 Music Theory Quiz")),
                  d.quizScore2 > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.quizScore2 + "/" + (d.quizTotal2 || 0)),
                  d.quizStreak2 > 0 && React.createElement("span", { className: "text-xs font-bold text-amber-700" }, "\uD83D\uDD25 " + d.quizStreak2)
                ),
                (function () {
                  var qIdx = d.quizIdx2 || 0; var q = MUSIC_QUIZ[qIdx % MUSIC_QUIZ.length];
                  return React.createElement("div", null,
                    React.createElement("p", { className: "text-xs font-bold text-purple-700 mb-1" }, "Q" + (qIdx + 1) + " of " + MUSIC_QUIZ.length),
                    React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, q.q),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                      q.opts.map(function (opt) {
                        var fb = d.quizFeedback2;
                        var isCorrect = fb && opt === q.a;
                        var isChosen = fb && fb.chosen === opt;
                        var isWrong = isChosen && !isCorrect;
                        return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_guess', 'Guess: {name}', { name: opt }),
                          key: opt,
                          disabled: !!fb,
                          onClick: function () {
                            var correct = opt === q.a;
                            upd('quizFeedback2', { correct: correct, chosen: opt });
                            upd('quizScore2', (d.quizScore2 || 0) + (correct ? 1 : 0));
                            upd('quizTotal2', (d.quizTotal2 || 0) + 1);
                            upd('quizStreak2', correct ? (d.quizStreak2 || 0) + 1 : 0);
                            addToast(correct
                              ? '\u2705 ' + __alloT('stem.music.quiz_correct', 'Correct!')
                              : '\u274C ' + __alloFmt('stem.music.quiz_answer_was', 'The answer is: {answer}', { answer: q.a }),
                              correct ? 'success' : 'error');
                          },
                          className: "px-3 py-2.5 rounded-lg text-xs font-bold border-2 transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-700' : fb ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-purple-600 bg-white text-slate-700 hover:border-purple-400 hover:bg-purple-50')
                        }, opt);
                      })
                    ),
                    d.quizFeedback2 && React.createElement("div", { className: "mt-3 flex justify-center" },
                      React.createElement("button", { "aria-label": __alloT('stem.music.next_question', "Next Question"),
                        onClick: function () { upd('quizIdx2', (d.quizIdx2 || 0) + 1); upd('quizFeedback2', null); },
                        className: "transition-colors px-4 py-2 rounded-lg text-sm font-bold bg-purple-600 text-white hover:bg-purple-700"
                      }, __alloT('stem.music.next_question_2', "Next Question \u2192"))
                    )
                  );
                })()
              ),

              // ── Chord Detection Challenge ──
              React.createElement("div", { className: "bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-rose-800" }, __alloT('stem.music.chord_detection', "\uD83C\uDFB5 Chord Detection")),
                  d.chordDetectScore > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.chordDetectScore + "/" + (d.chordDetectTotal || 0)),
                  React.createElement("button", { "aria-label": d.chordDetect ? __alloT('stem.music.aria_new_chord', 'New chord') : __alloT('stem.music.aria_start_chord_game', 'Start chord game'),
                    onClick: function () {
                      var chordNames = ['Major', 'Minor', 'Diminished', 'Augmented', 'Maj7', 'Min7', 'Dom7', 'Sus2', 'Sus4'];
                      var roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                      var correctType = chordNames[Math.floor(Math.random() * chordNames.length)];
                      var correctRoot = roots[Math.floor(Math.random() * roots.length)];
                      // Fisher-Yates: the old Math.random()-0.5 comparator
                      // sorts left the correct chord type biased toward the
                      // first slot.
                      var fy = function (arr) {
                        var a = arr.slice();
                        for (var i = a.length - 1; i > 0; i--) {
                          var j = Math.floor(Math.random() * (i + 1));
                          var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
                        }
                        return a;
                      };
                      var wrongOpts = fy(chordNames.filter(function (c) { return c !== correctType; }));
                      var opts = fy([correctType].concat(wrongOpts.slice(0, 3)));
                      playChord(correctRoot, correctType, 0);
                      upd('chordDetect', { root: correctRoot, type: correctType, opts: opts, answered: false, chosen: null });
                    },
                    className: "transition-colors ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                  }, d.chordDetect ? '\uD83D\uDD04 New Chord' : '\u25B6 Start'),
                  d.chordDetect && React.createElement("button", { "aria-label": __alloT('stem.music.replay_4', "Replay"),
                    onClick: function () { playChord(d.chordDetect.root, d.chordDetect.type, 0); },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700"
                  }, __alloT('stem.music.replay_5', '\uD83D\uDD0A Replay'))
                ),
                d.chordDetect && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-rose-700 mb-2" }, __alloT('stem.music.what_type_of_chord_do_you_hear', "What type of chord do you hear?")),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    d.chordDetect.opts.map(function (opt) {
                      var fb = d.chordDetect.answered;
                      var isCorrect = fb && opt === d.chordDetect.type;
                      var isChosen = d.chordDetect.chosen === opt;
                      var isWrong = fb && isChosen && !isCorrect;
                      return React.createElement("button", { "aria-label": __alloFmt('stem.music.aria_guess', 'Guess: {name}', { name: opt }),
                        key: opt, disabled: fb,
                        onClick: function () {
                          var correct = opt === d.chordDetect.type;
                          upd('chordDetect', Object.assign({}, d.chordDetect, { answered: true, chosen: opt }));
                          upd('chordDetectScore', (d.chordDetectScore || 0) + (correct ? 1 : 0));
                          upd('chordDetectTotal', (d.chordDetectTotal || 0) + 1);
                          addToast(correct
                            ? '\u2705 ' + __alloFmt('stem.music.chord_correct', 'Correct! {chord}', { chord: d.chordDetect.root + ' ' + d.chordDetect.type })
                            : '\u274C ' + __alloFmt('stem.music.chord_it_was', 'It was {chord}', { chord: d.chordDetect.root + ' ' + d.chordDetect.type }),
                            correct ? 'success' : 'error');
                        },
                        className: "px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-700' : fb ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-rose-600 bg-white text-slate-700 hover:border-rose-400 hover:bg-rose-50')
                      }, opt);
                    })
                  ),
                  d.chordDetect.answered && React.createElement("p", { className: "text-xs text-rose-600 mt-2" }, __alloT('stem.music.it_was', "\uD83C\uDFB6 It was "), React.createElement("span", { className: "font-bold" }, d.chordDetect.root + " " + d.chordDetect.type), " \u2014 ", CHORDS[d.chordDetect.type] && CHORDS[d.chordDetect.type].desc)
                )
              ),

              // ── Aural Dictation Challenge ──
              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-4 mb-3" },
                React.createElement("div", { className: "flex items-center gap-2 mb-3" },
                  React.createElement("span", { className: "text-sm font-bold text-violet-800" }, __alloT('stem.music.aural_dictation', "\uD83D\uDCDD Aural Dictation")),
                  d.dictationScore > 0 && React.createElement("span", { className: "text-xs font-bold text-green-600 ml-auto" }, "\u2B50 " + d.dictationScore + "/" + (d.dictationTotal || 0)),
                  React.createElement("button", { "aria-label": d.dictation ? __alloT('stem.music.new_dictation_melody', "New dictation melody") : __alloT('stem.music.aria_start_dictation', 'Start dictation'),
                    onClick: function () {
                      var roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                      var octave = d.octave || 4;
                      var melody = [];
                      for (var i = 0; i < 4; i++) { melody.push(roots[Math.floor(Math.random() * roots.length)]); }
                      melody.forEach(function (note, idx) {
                        setTimeout(function () { playNoteFor(noteFreq(note, octave), 'dict_' + idx, 450); }, idx * 500);
                      });
                      upd('dictation', { melody: melody, guesses: ['', '', '', ''], answered: false });
                    },
                    className: "transition-colors ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700"
                  }, d.dictation ? '\uD83D\uDD04 New Melody' : '\u25B6 Start'),
                  d.dictation && React.createElement("button", { "aria-label": __alloT('stem.music.replay_6', "Replay"),
                    onClick: function () {
                      var octave = d.octave || 4;
                      d.dictation.melody.forEach(function (note, idx) {
                        setTimeout(function () { playNoteFor(noteFreq(note, octave), 'dict_' + idx, 450); }, idx * 500);
                      });
                    },
                    className: "px-2 py-1 rounded-lg text-xs font-bold bg-violet-100 text-violet-700"
                  }, __alloT('stem.music.replay_7', '\uD83D\uDD0A Replay'))
                ),
                d.dictation && React.createElement("div", null,
                  React.createElement("p", { className: "text-xs font-bold text-violet-700 mb-2" }, __alloT('stem.music.identify_each_note_in_the_4_note_melod', "Identify each note in the 4-note melody:")),
                  React.createElement("div", { className: "flex gap-2 mb-3" },
                    [0, 1, 2, 3].map(function (idx) {
                      var guess = d.dictation.guesses[idx];
                      var answered = d.dictation.answered;
                      var correct = answered && guess === d.dictation.melody[idx];
                      var wrong = answered && guess && !correct;
                      return React.createElement("div", { key: idx, className: "flex-1 text-center" },
                        React.createElement("div", { className: "text-[0.6875rem] font-bold text-violet-500 mb-1" }, "Note " + (idx + 1)),
                        React.createElement("select", {
                          'aria-label': __alloFmt('stem.music.aria_guess_note', 'Guess note {n}', { n: idx + 1 }),
                          value: guess || '', disabled: answered,
                          onChange: function (e) {
                            var g = d.dictation.guesses.slice(); g[idx] = e.target.value;
                            upd('dictation', Object.assign({}, d.dictation, { guesses: g }));
                          },
                          className: "w-full px-2 py-1.5 rounded-lg border-2 text-sm font-bold " + (correct ? 'border-green-400 bg-green-50 text-green-700' : wrong ? 'border-red-400 bg-red-50 text-red-700' : 'border-violet-600 text-slate-700')
                        },
                          React.createElement("option", { value: "" }, "?"),
                          ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(function (n) { return React.createElement("option", { key: n, value: n }, n); })
                        ),
                        answered && React.createElement("div", { className: "text-[0.6875rem] font-bold mt-1 " + (correct ? 'text-green-600' : 'text-red-500') }, correct ? '\u2705' : '\u274C ' + d.dictation.melody[idx])
                      );
                    })
                  ),
                  !d.dictation.answered && React.createElement("button", { "aria-label": __alloT('stem.music.check_dictation', "Check Dictation"),
                    onClick: function () {
                      var g = d.dictation.guesses; var m = d.dictation.melody;
                      var c = g.filter(function (v, i) { return v === m[i]; }).length;
                      upd('dictation', Object.assign({}, d.dictation, { answered: true }));
                      upd('dictationScore', (d.dictationScore || 0) + c);
                      upd('dictationTotal', (d.dictationTotal || 0) + 4);
                      var dictMsg = c === 4
                        ? '\u2705 ' + __alloT('stem.music.dictation_perfect', 'Perfect! All 4 notes!')
                        : c > 0
                          ? '\uD83C\uDFAF ' + __alloFmt('stem.music.dictation_partial', '{n} of 4 correct', { n: c })
                          : '\u274C ' + __alloT('stem.music.dictation_none', 'Try again!');
                      addToast(dictMsg, c === 4 ? 'success' : c > 0 ? 'info' : 'error');
                      if (announceToSR) announceToSR(dictMsg);
                    },
                    className: "w-full py-2 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                  }, __alloT('stem.music.check_dictation_2', "\u2714 Check Dictation")),
                  d.dictation.answered && React.createElement("div", { className: "text-center mt-2" },
                    React.createElement("p", { className: "text-xs text-violet-600" }, __alloT('stem.music.the_melody_was', "\uD83C\uDFB5 The melody was: "), React.createElement("span", { className: "font-bold" }, d.dictation.melody.join(' \u2192 ')))
                  )
                )
              )
            ),

            // === H7b'' inquiry widget: timbre harmonic balance ===
            synthTab === 'timbreHunt' && (function() {
              var h = React.createElement;
              var iq = d.timbreHunt || { fund: 70, mid: 30, high: 10, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('timbreHunt', Object.assign({}, iq, patch)); }
              var total = iq.fund + iq.mid + iq.high;
              var f = iq.fund / total, m = iq.mid / total, hg = iq.high / total;
              var timbre;
              if (hg > 0.4) timbre = 'bright';
              else if (f > 0.5 && hg < 0.15) timbre = 'warm';
              else if (m > 0.4) timbre = 'hollow';
              else if (f > 0.7) timbre = 'dark';
              else timbre = 'balanced';
              var timbreMeta = {
                bright:   { label: __alloT('stem.music.bright_3', '✨ Bright'),    color: '#facc15', bg: '#fefce8', border: '#fde047', desc: __alloT('stem.music.strong_high_harmonics_pierces_sparkles', 'Strong high harmonics — pierces / sparkles.') },
                warm:     { label: __alloT('stem.music.warm', '🌅 Warm'),      color: '#f97316', bg: '#fff7ed', border: '#fdba74', desc: __alloT('stem.music.fundamental_heavy_gentle_highs_acousti', 'Fundamental-heavy, gentle highs. Acoustic-like.') },
                hollow:   { label: __alloT('stem.music.hollow', '🕳️ Hollow'),    color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: __alloT('stem.music.mid_heavy_without_fundamental_woody_cu', 'Mid-heavy without fundamental — woody/cuckoo flute.') },
                dark:     { label: __alloT('stem.music.dark_2', '🌑 Dark'),      color: '#1e293b', bg: '#f1f5f9', border: '#475569', desc: __alloT('stem.music.almost_pure_fundamental_muffled_sub_li', 'Almost pure fundamental — muffled / sub-like.') },
                balanced: { label: __alloT('stem.music.balanced', '⚖️ Balanced'),  color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.music.roughly_equal_harmonics_full_natural_t', 'Roughly equal harmonics — full / natural timbre.') }
              }[timbre];
              function logObs() {
                setIQ({ log: (iq.log || []).concat([{ f: iq.fund, m: iq.mid, h: iq.high, t: timbre }]).slice(-8) });
              }
              return h('div', { className: 'p-4 rounded-xl bg-slate-50 border border-purple-300' },
                h('h3', { className: 'text-sm font-black text-purple-700 mb-1' }, __alloT('stem.music.harmonic_balance_discovery', '⚖️ Harmonic balance discovery')),
                h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
                  __alloT('stem.music.adjust_fundamental_mid_and_high_harmon', 'Adjust fundamental, mid, and high harmonic levels. Widget classifies one of five discrete timbres. No score, no reveal — sweep and notice.')),
                // ★ The tool's generated dark CSS rewrites `.text-slate-700`/`600`
                // to light inks with !important, so the two lines inside this card
                // cannot be re-inked from here. The card itself painted a fixed
                // light tint (orange-50 and friends) in BOTH themes, which left
                // slate-200 on orange-50 at 1.16:1. Darken the CARD in dark theme
                // so the blanket light ink has the ground it assumes; the timbre
                // hue stays as the label and border.
                h('div', { className: 'mb-3 p-3 rounded-lg text-center', style: { background: isDark ? '#1f2937' : timbreMeta.bg, border: '2px solid ' + timbreMeta.border } },
                  h('div', { className: 'text-base font-black', style: { color: (isDark ? { bright: '#facc15', warm: '#fb923c', hollow: '#c4b5fd', dark: '#cbd5e1', balanced: '#34d399' } : { bright: '#a16207', warm: '#c2410c', hollow: '#7c3aed', dark: '#1e293b', balanced: '#047857' })[timbre] } }, timbreMeta.label),
                  h('div', { className: 'text-[0.6875rem] text-slate-700 mt-1' }, timbreMeta.desc),
                  h('div', { className: 'text-[0.625rem] text-slate-600 mt-1 font-mono' }, 'F=' + (f*100).toFixed(0) + '%  M=' + (m*100).toFixed(0) + '%  H=' + (hg*100).toFixed(0) + '%')
                ),
                h('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                  [
                    { key: 'fund', label: __alloT('stem.music.fundamental', 'Fundamental'), val: iq.fund },
                    { key: 'mid',  label: 'Mid',         val: iq.mid },
                    { key: 'high', label: __alloT('stem.music.high_2', 'High'),        val: iq.high }
                  ].map(function(s) {
                    return h('div', { key: s.key },
                      h('label', { htmlFor: 'th-' + s.key, className: 'block text-[0.6875rem] font-bold text-slate-700' },
                        s.label + ': ', h('span', { className: 'font-mono text-purple-700' }, s.val)),
                      h('input', { id: 'th-' + s.key, type: 'range', 'aria-valuetext': (s.val + ' percent'), min: 0, max: 100, step: 1, value: s.val,
                        onChange: function(e) { var p = {}; p[s.key] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-label': s.label }));
                  })
                ),
                h('div', { className: 'flex gap-2 items-center mb-3 flex-wrap' },
                  h('button', { onClick: logObs, className: 'px-2 py-1 rounded bg-slate-200 text-[0.6875rem] font-bold text-slate-700' }, __alloT('stem.music.log', '📋 Log')),
                  h('button', { onClick: function() { setIQ({ fund: 70, mid: 30, high: 10, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[0.6875rem] font-semibold text-slate-600 border border-slate-300' }, __alloT('stem.music.reset_2', '↺ Reset')),
                  (iq.log || []).length > 0 && h('span', { className: 'text-[0.625rem] text-slate-500 italic' }, (iq.log || []).length + ' logged')
                ),
                (iq.log || []).length > 0 && h('table', { className: 'text-[0.625rem] w-full border-collapse text-slate-700 mb-3' },
                  h('thead', null, h('tr', { className: 'bg-slate-100' }, ['F', 'M', 'H', 'timbre'].map(function(c, i) { return h('th', { scope: 'col', key: 'h' + i, className: 'px-1 border border-slate-200 text-left' }, c); }))),
                  h('tbody', null, iq.log.map(function(o, idx) {
                    return h('tr', { key: 'lr' + idx },
                      h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.f),
                      h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.m),
                      h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.h),
                      h('td', { className: 'px-1 border border-slate-200' }, o.t));
                  }))
                ),
                h('textarea', { 'aria-label': __alloT('stem.music.hypothesis_input', 'Timbre hypothesis'), value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.music.hypothesis_free_text_which_harmonic_le', 'Hypothesis (free text): Which harmonic level dictates "bright" vs "warm"?'),
                  className: 'w-full text-[0.75rem] border border-slate-300 rounded p-2 font-mono leading-snug mb-3', rows: 3 }),
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[0.6875rem] font-bold text-amber-800 border border-amber-300 mb-3' }, __alloT('stem.music.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-slate-700 leading-relaxed mb-3' },
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, __alloT('stem.music.hold_two_sliders_steady_move_one_watch', 'Hold two sliders steady. Move one. Watch.')),
                    h('li', null, __alloT('stem.music.find_two_settings_producing_the_same_t', 'Find two settings producing the same timbre. What proportions do they share?')),
                    h('li', null, __alloT('stem.music.real_instruments_have_characteristic_s', 'Real instruments have characteristic spectra. Investigate why flute sounds different than violin.')))),
                h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                  h('label', { className: 'flex items-center gap-2 text-[0.75rem] font-bold text-emerald-800 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                    __alloT('stem.music.i_understand_explain_in_own_words', 'I understand — explain in own words')),
                  iq.understood && h('textarea', { 'aria-label': __alloT('stem.music.explanation_input', 'Timbre explanation'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.music.explain_how_harmonic_content_determine', 'Explain how harmonic content determines timbre perception.'),
                    className: 'w-full text-[0.75rem] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })),
                h('div', { className: 'mt-3 text-[0.625rem] italic text-slate-500' }, __alloT('stem.music.design_note_discrete_5_class_timbre_ma', 'Design note: discrete 5-class timbre marker; no acoustic fidelity score; no reveal — by design.'))
              );
            })(),

            // ── AI Music Theory Tutor (reading-level aware) ──
            (function () {
              if (typeof callGemini !== 'function') return null;
              var aiLevel = d.aiLevel || 'grade5';
              // Rendered as a React child, so a saved object throws
              // "Objects are not valid as a React child" and blanks the lab.
              var aiText = typeof d.aiExplain === 'string' ? d.aiExplain : '';
              var aiLoading = !!d.aiLoading;
              var aiError = typeof d.aiError === 'string' ? d.aiError : '';
              var LEVELS = [
                { id: 'plain', label: __alloT('stem.music.plain', 'Plain'), hint: __alloT('stem.music.using_simple_everyday_words_and_short_', 'using simple everyday words and short sentences, no jargon') },
                { id: 'grade5', label: __alloT('stem.music.grade_5', 'Grade 5'), hint: __alloT('stem.music.for_a_5th_grade_student_brief_and_frie', 'for a 5th grade student, brief and friendly') },
                { id: 'hs', label: __alloT('stem.music.musician', 'Musician'), hint: __alloT('stem.music.for_a_student_who_already_knows_some_m', 'for a student who already knows some music theory') }
              ];
              var tabLabel = synthTab === 'play' ? 'Piano (play notes)' : synthTab === 'scales' ? 'Scales' : synthTab === 'chords' ? 'Chords' : synthTab === 'harmonypad' ? 'Harmony pad' : synthTab === 'beatpad' ? 'Beat pad' : 'Music theory';
              function explain() {
                if (typeof callGemini !== 'function') { upd('aiError', 'AI tutor not available.'); return; }
                upd('aiLoading', true); upd('aiError', ''); upd('aiExplain', '');
                var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
                var ctxInfo = '';
                if (d.scale) ctxInfo += ' Scale: ' + d.scale + '.';
                if (d.scaleRoot) ctxInfo += ' Root: ' + d.scaleRoot + '.';
                if (d.chord) ctxInfo += ' Chord: ' + d.chord + '.';
                if (d.waveType) ctxInfo += ' Wave type: ' + d.waveType + '.';
                var prompt = 'Explain this music concept ' + lv.hint + '. '
                  + 'Current view: ' + tabLabel + '.' + ctxInfo + ' '
                  + 'In 3 short sentences: (1) What this section is teaching. (2) One concrete example a student would hear (name a familiar song, rhythm, or genre). (3) A simple hands-on thing to try next. '
                  + 'No markdown, no bullets, no headings. Plain prose.'
                  + aiLanguageSuffix();
                callGemini(prompt, false, false, 0.5).then(function (resp) {
                  upd('aiExplain', String(resp || '').trim()); upd('aiLoading', false);
                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.music.explanation_ready', 'Explanation ready.'));
                }).catch(function () {
                  upd('aiLoading', false); upd('aiError', 'Could not reach AI tutor. Try again in a moment.');
                });
              }
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-300 bg-purple-50", role: "region", },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-700" }, __alloT('stem.music.explain_at_my_level', "\u2728 Explain at my level")),
                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": __alloT('stem.music.reading_level', "Reading level") },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        onClick: function () { upd('aiLevel', L.id); },
                        "aria-label": __alloFmt('stem.music.aria_reading_level', 'Reading level: {name}', { name: L.label }) + (active ? ' ' + __alloT('stem.music.aria_selected', '(selected)') : ''),
                        "aria-pressed": active,
                        className: "px-2 py-0.5 rounded text-[0.625rem] font-bold " + (active ? 'bg-purple-600 text-white' : 'transition-colors bg-white text-purple-700 border border-purple-600 hover:bg-purple-100')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": __alloFmt('stem.music.aria_generate_ai', 'Generate AI explanation at {level} level', { level: (LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5' }),
                    className: "transition-colors px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
                ),
                aiError && React.createElement("p", { className: "text-[0.6875rem] text-rose-600", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[0.6875rem] italic text-slate-600" }, __alloT('stem.music.click_explain_for_the_ai_tutor_to_desc', "Click \u201CExplain\u201D for the AI tutor to describe what this view teaches at your chosen reading level."))
              );
            })(),

            // ── Snapshot button (bottom) ──
            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },
              React.createElement("button", { "aria-label": __alloT('stem.music.snapshot_3', "Snapshot"), onClick: function () { setToolSnapshots(function (prev) { return prev.concat([{ id: 'sy-' + Date.now(), tool: 'synth', label: t('stem.synth_ui.synth', 'Synth: ') + (["sine","square","sawtooth","triangle"].indexOf(d.waveType) !== -1 ? d.waveType : 'sine'), data: Object.assign({}, d), timestamp: Date.now() }]); }); addToast(__alloT('stem.music.snapshot_saved_2', '\uD83D\uDCF8 Snapshot saved!'), 'success'); }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, __alloT('stem.music.snapshot_4', "\uD83D\uDCF8 Snapshot"))
            ),

            // \u2550\u2550\u2550 HARMONIC SERIES \u2550\u2550\u2550
            React.createElement('div', { className: 'mt-5 rounded-2xl border border-indigo-300 bg-white p-3 shadow-sm' },
              React.createElement('h4', { className: 'text-sm font-bold text-indigo-700 mb-2' }, __alloT('stem.music.harmonic_series_why_instruments_sound_', '\uD83C\uDFB5 Harmonic Series \u2014 Why instruments sound different')),
              React.createElement('div', { 'data-allo-fs-stage': 'true', ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
                className: 'rounded-xl overflow-hidden border border-indigo-200', style: { position: 'relative', background: '#1e1b4b', aspectRatio: '16/5' } },
                React.createElement('button', {
                  type: 'button',
                  'data-allo-fs-btn': 'true',
                  'aria-pressed': 'false',
                  'aria-label': __alloT('stem.music.enter_fullscreen', 'View the harmonic series waveform fullscreen'),
                  'data-fs-out': __alloT('stem.music.enter_fullscreen', 'View the harmonic series waveform fullscreen'),
                  'data-fs-in': __alloT('stem.music.exit_fullscreen', 'Exit fullscreen harmonic series waveform (Escape)'),
                  style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid ' + 'rgba(165,180,252,0.6)', color: '#e0e7ff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
                }, React.createElement('span', { 'aria-hidden': 'true' }, '⛶')),
                React.createElement('canvas', {
                  role: 'img', tabIndex: 0, 'aria-label': __alloT('stem.music.harmonic_series_waveform_why_different', 'Harmonic series waveform — why different instruments sound different.'),
                  ref: function(cvEl) {
                    if (!cvEl) return;
                    if (cvEl._hsAnim) return;
                    var c2 = cvEl.getContext('2d');
                    if (!c2) return;
                    var W = cvEl.offsetWidth || 600;
                    var H = cvEl.offsetHeight || 180;
                    cvEl.width = W * 2; cvEl.height = H * 2;
                    c2.scale(2, 2);
                    var start = performance.now();
                    // Pre-allocated harmonic rows + labels (zero per-frame allocations in rAF loop)
                    var hsRows = [
                      { n: 1, name: __alloT('stem.music.f_fundamental', 'f (Fundamental)'), note: 'C', color: '#fb7185' },
                      { n: 2, name: __alloT('stem.music.2f_octave', '2f (Octave)'), note: 'C2', color: '#f97316' },
                      { n: 3, name: __alloT('stem.music.3f_fifth', '3f (Fifth)'), note: 'G2', color: '#fbbf24' },
                      { n: 4, name: __alloT('stem.music.4f_octave', '4f (Octave)'), note: 'C3', color: '#86efac' },
                      { n: 5, name: __alloT('stem.music.5f_third', '5f (Third)'), note: 'E3', color: '#22d3ee' },
                      { n: 6, name: __alloT('stem.music.6f_fifth', '6f (Fifth)'), note: 'G3', color: '#a855f7' }
                    ];
                    var hsCaption = __alloT('stem.music.canvas_timbre_caption', 'Timbre = which harmonics dominate. Violin vs flute play same f, but harmonic mix differs.');
                    function drawHs() {
                      if (!cvEl.isConnected) {
                        cancelAnimationFrame(cvEl._hsAnim);
                        if (cvEl._hsRo) { try { cvEl._hsRo.disconnect(); } catch (_) {} cvEl._hsRo = null; }
                        return;
                      }
                      // Freeze the clock (not the loop) under reduced motion: the
                      // ResizeObserver below still needs repaints, and a static
                      // frame conveys the harmonic series just as well.
                      var reduced = musicReducedMotion();
                      var hc = musicHighContrast();
                      var t = reduced ? 0 : (performance.now() - start) / 1000;
                      if (hc) {
                        c2.fillStyle = '#000000';
                      } else if (typeof c2.createLinearGradient === 'function') {
                        var bgHs = c2.createLinearGradient(0, 0, 0, H);
                        bgHs.addColorStop(0, '#131036'); bgHs.addColorStop(1, '#0b0820');
                        c2.fillStyle = bgHs;
                      } else {
                        c2.fillStyle = '#1e1b4b';
                      }
                      c2.fillRect(0, 0, W, H);
                      var rowH = (H - 30) / hsRows.length;
                      var waveSpan = W * 0.50;
                      // Harmonic phase coupling spine on left wave boundary
                      c2.strokeStyle = hc ? '#ffff00' : 'rgba(165,180,252,0.34)';
                      c2.lineWidth = 1.2;
                      c2.beginPath(); c2.moveTo(80, 6); c2.lineTo(80, 6 + hsRows.length * rowH); c2.stroke();
                      for (var i = 0; i < hsRows.length; i++) {
                        var h = hsRows[i];
                        var y = 6 + i * rowH;
                        var midY = y + rowH / 2;
                        // Subtle scope lane & centerline
                        if (!hc) {
                          c2.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.008)';
                          c2.fillRect(78, y + 1, waveSpan + 6, rowH - 2);
                        }
                        c2.strokeStyle = hc ? 'rgba(255,255,0,0.32)' : 'rgba(148,163,184,0.16)';
                        c2.lineWidth = 0.7;
                        c2.beginPath(); c2.moveTo(80, midY); c2.lineTo(80 + waveSpan, midY); c2.stroke();
                        var amp = (rowH - 6) / 2 * (1 / Math.sqrt(h.n));
                        // Conjugate standing-wave envelope ghost (reveals harmonic nodes & antinodes)
                        c2.save();
                        c2.lineCap = 'round';
                        if (!hc) {
                          var standBreath = reduced ? 0.85 : Math.cos(t * 3.2);
                          c2.beginPath();
                          for (var sx = 0; sx <= waveSpan; sx += 2) {
                            var sy = midY + Math.sin((sx / waveSpan) * Math.PI * 2 * h.n) * amp * standBreath;
                            if (sx === 0) c2.moveTo(sx + 80, sy); else c2.lineTo(sx + 80, sy);
                          }
                          c2.strokeStyle = h.color; c2.globalAlpha = 0.22; c2.lineWidth = 1.1; c2.stroke();
                        }
                        // Luminous traveling harmonic phase wave + crisp core
                        c2.beginPath();
                        for (var x = 0; x <= waveSpan; x += 2) {
                          var yy = midY + Math.sin((x / waveSpan) * Math.PI * 2 * h.n + t * 4) * amp;
                          if (x === 0) c2.moveTo(x + 80, yy);
                          else c2.lineTo(x + 80, yy);
                        }
                        if (hc) {
                          c2.globalAlpha = 1;
                          c2.strokeStyle = i % 2 === 0 ? '#ffff00' : '#00ff00';
                          c2.lineWidth = 1.8;
                          c2.stroke();
                        } else {
                          c2.shadowColor = h.color; c2.shadowBlur = 8;
                          c2.strokeStyle = h.color; c2.lineWidth = 3.0; c2.globalAlpha = 0.36; c2.stroke();
                          c2.globalAlpha = 1; c2.lineWidth = 1.5; c2.stroke();
                          c2.shadowBlur = 0; c2.strokeStyle = 'rgba(255,255,255,0.72)'; c2.lineWidth = 0.6; c2.stroke();
                          // Standing-wave anti-node resonance beads
                          var pulseR = reduced ? 1.8 : (1.5 + 0.7 * Math.abs(Math.sin(t * 3.2 + i * 0.4)));
                          var antiNodes = Math.min(h.n * 2, 8);
                          c2.fillStyle = h.color;
                          for (var an = 0; an < antiNodes; an++) {
                            var anx = 80 + ((an + 0.5) / (h.n * 2)) * waveSpan;
                            var any = midY + Math.sin(((anx - 80) / waveSpan) * Math.PI * 2 * h.n + t * 4) * amp;
                            c2.globalAlpha = 0.85;
                            c2.beginPath(); c2.arc(anx, any, pulseR, 0, Math.PI * 2); c2.fill();
                          }
                        }
                        c2.restore();
                        c2.fillStyle = hc ? '#ffff00' : h.color;
                        c2.font = 'bold 9px monospace';
                        c2.textAlign = 'right';
                        c2.fillText(h.n + 'x', 72, midY + 3);
                        c2.fillStyle = hc ? '#ffffff' : '#e2e8f0';
                        c2.font = '8px sans-serif';
                        c2.textAlign = 'left';
                        c2.fillText(h.name, 80 + waveSpan + 10, midY + 2);
                        c2.fillStyle = hc ? '#00ff00' : h.color;
                        c2.font = 'bold 9px monospace';
                        c2.fillText(h.note, W - 26, midY + 2);
                      }
                      c2.fillStyle = hc ? '#000000' : 'rgba(7,5,20,0.88)';
                      c2.fillRect(8, H - 15, W - 16, 13);
                      c2.font = 'bold 8px sans-serif'; c2.fillStyle = hc ? '#ffff00' : '#a5b4fc'; c2.textAlign = 'center';
                      c2.fillText(hsCaption, W / 2, H - 6);
                      cvEl._hsAnim = requestAnimationFrame(drawHs);
                    }
                    drawHs();
                    if (typeof ResizeObserver === 'function') {
                      var ro = new ResizeObserver(function() {
                        if (!cvEl.isConnected) { ro.disconnect(); cvEl._hsRo = null; return; }
                        W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                        cvEl.width = W * 2; cvEl.height = H * 2; c2.scale(2, 2);
                      });
                      cvEl._hsRo = ro;
                      ro.observe(cvEl);
                    }
                  },
                  style: { width: '100%', height: '100%', display: 'block' }
                })
              )
            )
          );
    }
  });

  console.log('[MusicSynth] Plugin loaded and registered');
})();
} // end duplicate guard
