// ═══════════════════════════════════════════
// stem_tool_aquarium.js — Aquarium Ecosystem Simulator
// Enhanced standalone module with progression & economy system
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
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

  // ═══ 🔬 aquarium (aquarium) ═══
  window.StemLab.registerTool('aquarium', {
    icon: '🔬',
    label: 'aquarium',
    desc: '',
    color: 'slate',
    category: 'science',
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
      var t = ctx.t;
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
      var props = ctx.props;

      // ── Tool body (aquarium) ──
      return (function() {
var d = (labToolData && labToolData._aquarium) || {};

          var upd = function (key, val) {

            setLabToolData(function (prev) {

              var aq = Object.assign({}, (prev && prev._aquarium) || {});

              aq[key] = val;

              return Object.assign({}, prev, { _aquarium: aq });

            });

          };

          var updMulti = function (obj) {

            setLabToolData(function (prev) {

              var aq = Object.assign({}, (prev && prev._aquarium) || {});

              Object.keys(obj).forEach(function (k) { aq[k] = obj[k]; });

              return Object.assign({}, prev, { _aquarium: aq });

            });

          };



          var mode = d.mode || 'tank';



          // ── Inject aquarium CSS animations ──

          if (!document.getElementById('aqua-css')) {

            var style = document.createElement('style');

            style.id = 'aqua-css';

            style.textContent = [

              '@keyframes aquaSwim { 0% { transform: translateX(0) translateY(0); } 25% { transform: translateX(35px) translateY(-8px); } 50% { transform: translateX(-25px) translateY(6px); } 75% { transform: translateX(18px) translateY(-5px); } 100% { transform: translateX(0) translateY(0); } }',

              '@keyframes aquaBubble { 0% { bottom: 30px; opacity: 0.6; } 50% { opacity: 0.8; } 100% { bottom: 220px; opacity: 0; } }',

              '@keyframes aquaWave { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }',

              '@keyframes oceanPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }',

              '.aqua-fish:hover { transform: scale(1.3) !important; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)) !important; }',

              '@keyframes aquaBodySway { 0%, 100% { transform: scaleY(1) scaleX(1); } 30% { transform: scaleY(0.97) scaleX(1.02); } 70% { transform: scaleY(1.02) scaleX(0.98); } }',

              '.aqua-fish-svg svg { width: 100%; height: 100%; overflow: visible; }',

              '.aqua-fish-svg:hover { transform: scale(1.4) !important; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35)) !important; }',

              '@keyframes aiEventSlideIn { 0% { opacity: 0; transform: translateY(-20px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }',

              '@keyframes aiEventPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); } 50% { box-shadow: 0 0 20px 4px rgba(59,130,246,0.15); } }',

              '@keyframes aiEventFadeOut { 0% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }',

              '@keyframes xpPop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }',

              '.ai-event-card { animation: aiEventSlideIn 0.4s ease-out, aiEventPulse 3s ease-in-out 0.5s infinite; }',

              '.ai-event-choice:hover { transform: translateY(-2px) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }',

              '.ai-event-choice { transition: all 0.2s ease; }',

              '@keyframes aquaBobble { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }',

              '@keyframes aquaScuttle { 0% { transform: translateX(0) translateY(0); } 20% { transform: translateX(20px) translateY(-4px); } 40% { transform: translateX(-14px) translateY(3px); } 60% { transform: translateX(22px) translateY(-3px); } 80% { transform: translateX(-8px) translateY(4px); } 100% { transform: translateX(0) translateY(0); } }',

              '@keyframes aquaDrift { 0%, 100% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(8px) rotate(3deg); } }',

              '@keyframes aquaUndulate { 0% { transform: translateX(0) skewX(0deg); } 25% { transform: translateX(20px) skewX(5deg); } 50% { transform: translateX(-16px) skewX(-4deg); } 75% { transform: translateX(14px) skewX(3deg); } 100% { transform: translateX(0) skewX(0deg); } }',

              '@keyframes aquaPulse { 0%, 100% { transform: scale(1) translateY(0); } 35% { transform: scale(0.90, 1.08) translateY(-10px); } 65% { transform: scale(1.06, 0.94) translateY(5px); } }',

              '@keyframes aquaSeaweed { 0%, 100% { transform: rotate(-5deg) scaleY(1); } 50% { transform: rotate(5deg) scaleY(1.05); } }',

              '.aqua-sick-overlay { position: absolute; top: -4px; right: -4px; font-size: 10px; z-index: 8; animation: xpPop 0.4s ease-out; pointer-events: none; }',

              '@keyframes stemCardIn { 0% { opacity: 0; transform: translateY(12px) scale(0.97); } 100% { opacity: 1; transform: translateY(0) scale(1); } }',

              '@keyframes aquaCaustic { 0% { background-position: 0% 0%; opacity: 0.12; } 50% { background-position: 100% 100%; opacity: 0.18; } 100% { background-position: 0% 0%; opacity: 0.12; } }',

              '@keyframes aquaShimmerWave { 0% { transform: translateX(0) scaleY(1); opacity: 0.25; } 33% { transform: translateX(-15%) scaleY(1.1); opacity: 0.35; } 66% { transform: translateX(10%) scaleY(0.95); opacity: 0.3; } 100% { transform: translateX(0) scaleY(1); opacity: 0.25; } }',

              '@keyframes aquaParticle { 0% { bottom: 30px; opacity: 0; transform: translateX(0); } 15% { opacity: 0.5; } 50% { transform: translateX(8px); opacity: 0.6; } 85% { opacity: 0.3; transform: translateX(-5px); } 100% { bottom: 210px; opacity: 0; transform: translateX(2px); } }',

              '@keyframes aquaCoralSway { 0%, 100% { transform: rotate(-3deg) scaleX(1); } 30% { transform: rotate(2deg) scaleX(1.04); } 70% { transform: rotate(-4deg) scaleX(0.97); } }',

              '@keyframes aquaPlantGrow { 0%, 100% { transform: scaleY(1) rotate(0deg); } 50% { transform: scaleY(1.06) rotate(1deg); } }',

              '@keyframes aquaGlassGlint { 0% { opacity: 0; top: -20%; } 30% { opacity: 0.35; } 100% { opacity: 0; top: 120%; } }',

              '@keyframes aquaCriticalPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 12px 3px rgba(239,68,68,0.2); } }',

              '.aqua-gradient-bar { background-size: 200% 100%; animation: aquaBarShimmer 2s ease-in-out infinite; }',

              '@keyframes aquaBarShimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }',

              '@keyframes aquaDepthFog { 0%, 100% { opacity: 0.18; } 50% { opacity: 0.28; } }',

              '@keyframes aquaSpecular { 0%, 100% { opacity: 0.12; transform: scale(1); } 50% { opacity: 0.22; transform: scale(1.1); } }'

            ].join('\n');

            document.head.appendChild(style);

          }

          // ═══ ANATOMY VIEWER SYSTEM ═══

          var BODY_PLANS = {

            fish: {

              label: 'Bony Fish (Osteichthyes)',

              svg: function (w, h, color) {

                var c1 = color || '#22d3ee', c2 = color || '#0891b2';

                return '<svg viewBox="0 0 440 260" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="fishG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '<linearGradient id="fishBelly" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M55,130 Q65,75 110,65 Q160,50 210,55 Q270,58 310,75 Q340,85 355,110 Q360,130 355,150 Q340,175 310,185 Q270,200 210,205 Q160,210 110,195 Q65,185 55,130Z" fill="url(#fishG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M55,130 Q65,145 110,170 Q160,190 210,193 Q270,195 310,185 Q340,175 355,150 Q360,130 355,150" fill="url(#fishBelly)" opacity="0.4"/>' +

                  '<path d="M350,125 Q370,115 400,90 Q415,80 420,85 L420,95 Q418,100 410,110 Q395,125 380,130 Q395,135 410,150 Q418,160 420,165 L420,175 Q415,180 400,170 Q370,145 350,135" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.9"/>' +

                  '<line x1="400" y1="93" x2="400" y2="167" stroke="' + c2 + '" stroke-width="0.8" opacity="0.5"/>' +

                  '<line x1="390" y1="100" x2="390" y2="160" stroke="' + c2 + '" stroke-width="0.6" opacity="0.4"/>' +

                  '<line x1="380" y1="107" x2="380" y2="153" stroke="' + c2 + '" stroke-width="0.5" opacity="0.3"/>' +

                  '<path d="M180,58 Q185,38 195,20 Q210,5 225,10 Q235,15 240,25 Q248,40 250,60" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<line x1="195" y1="55" x2="210" y2="18" stroke="' + c2 + '" stroke-width="0.6" opacity="0.4"/>' +

                  '<line x1="210" y1="55" x2="220" y2="14" stroke="' + c2 + '" stroke-width="0.6" opacity="0.4"/>' +

                  '<line x1="225" y1="56" x2="233" y2="17" stroke="' + c2 + '" stroke-width="0.6" opacity="0.4"/>' +

                  '<path d="M215,200 Q220,220 225,235 Q230,245 240,248 Q245,245 248,235 Q250,220 250,200" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.75"/>' +

                  '<path d="M270,198 Q275,215 280,225 Q285,230 290,228 Q293,222 295,210 Q296,200 295,195" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<path d="M120,165 Q105,178 92,188 Q85,192 88,195 Q95,195 108,188 Q125,178 135,170" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.8" transform="rotate(-10,120,175)"/>' +

                  '<path d="M138,170 Q128,182 118,190 Q112,193 115,196 Q120,196 130,190 Q142,182 148,175" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7" transform="rotate(-5,138,180)"/>' +

                  '<circle cx="88" cy="118" r="16" fill="white" stroke="#334155" stroke-width="2"/>' +

                  '<circle cx="92" cy="118" r="9" fill="#1e293b"/>' +

                  '<circle cx="95" cy="115" r="3" fill="white" opacity="0.8"/>' +

                  '<path d="M55,128 Q48,125 40,124" stroke="' + c2 + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +

                  '<path d="M118,90 Q113,120 118,150" stroke="' + c2 + '" fill="none" stroke-width="3" stroke-linecap="round" opacity="0.6"/>' +

                  '<path d="M123,93 Q118,120 123,147" stroke="' + c2 + '" fill="none" stroke-width="2" stroke-linecap="round" opacity="0.4"/>' +

                  '<path d="M130,110 L340,110" stroke="' + c2 + '" fill="none" stroke-width="1" stroke-dasharray="6,4" opacity="0.35"/>' +

                  '<path d="M130,115 L340,115" stroke="' + c2 + '" fill="none" stroke-width="0.5" stroke-dasharray="3,3" opacity="0.2"/>' +

                  '<ellipse cx="210" cy="100" rx="45" ry="12" fill="rgba(255,255,255,0.08)" stroke="' + c2 + '" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.5"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Dorsal Fin', x: 48, y: 5, desc: 'Stabilizes the fish during swimming, preventing rolling. Contains bony spines (rays) connected by thin membrane. Erected when alarmed.' },

                { name: 'Caudal Fin (Tail)', x: 93, y: 48, desc: 'Primary propulsion organ. Shape determines swimming style — forked tails are built for speed, rounded for maneuverability.' },

                { name: 'Pectoral Fins', x: 26, y: 68, desc: 'Paired fins used for steering, braking, and hovering. Act like hydrofoils. Can be fanned out to appear larger to rivals.' },

                { name: 'Anal/Pelvic Fins', x: 53, y: 85, desc: 'Ventral stabilizers that prevent pitching and yawing. Pelvic fins evolved from ancestral limb buds.' },

                { name: 'Gill Cover (Operculum)', x: 27, y: 42, desc: 'Bony plate protecting delicate gill filaments. Pumps water over gills by rhythmically opening and closing.' },

                { name: 'Lateral Line', x: 58, y: 42, desc: 'A row of sensory pores detecting vibrations and pressure changes. Allows fish to sense movement, currents, and obstacles in total darkness.' },

                { name: 'Eye', x: 19, y: 44, desc: 'Spherical lens focuses light. Most fish see in color and some perceive UV light. No eyelids — cornea is bathed in water.' },

                { name: 'Swim Bladder (internal)', x: 48, y: 38, desc: 'Gas-filled organ for buoyancy control. Fish add or remove gas to hover at any depth without expending energy.' },

                { name: 'Scales & Mucus', x: 70, y: 55, desc: 'Overlapping cycloid or ctenoid scales covered in antibacterial mucus. Reduces hydrodynamic drag by up to 65%.' }

              ]

            },

            shark: {

              label: 'Cartilaginous Fish (Chondrichthyes)',

              svg: function (w, h, color) {

                return '<svg viewBox="0 0 460 230" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="sharkG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#64748b"/><stop offset="50%" stop-color="#475569"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M30,115 Q45,85 75,78 Q120,65 180,68 Q250,62 310,78 Q350,88 380,98 Q400,105 410,105 Q430,90 445,70 L448,72 Q445,85 440,100 Q438,110 440,118 Q445,135 448,148 L445,150 Q430,130 410,115 Q400,115 380,122 Q350,132 310,142 Q250,158 180,155 Q120,155 75,142 Q45,135 30,115Z" fill="url(#sharkG)" stroke="#334155" stroke-width="2.5"/>' +

                  '<path d="M30,115 Q45,130 75,140 Q120,152 180,155 Q250,158 310,142 Q350,132 380,122 Q400,115 410,115" fill="#e2e8f0" opacity="0.4"/>' +

                  '<path d="M230,68 Q232,42 238,22 Q244,8 252,5 Q258,8 260,18 Q264,35 264,68" fill="#475569" stroke="#334155" stroke-width="2"/>' +

                  '<line x1="240" y1="65" x2="248" y2="12" stroke="#334155" stroke-width="0.6" opacity="0.4"/>' +

                  '<line x1="250" y1="65" x2="255" y2="10" stroke="#334155" stroke-width="0.6" opacity="0.4"/>' +

                  '<path d="M330,78 Q335,68 340,62 Q344,60 347,62 Q348,68 346,78" fill="#475569" stroke="#334155" stroke-width="1.2" opacity="0.7"/>' +

                  '<path d="M120,145 Q108,160 98,170 Q92,172 93,168 Q97,158 108,145 Q115,140 120,142" fill="#64748b" stroke="#334155" stroke-width="1.2" opacity="0.7"/>' +

                  '<path d="M135,148 Q128,160 122,168 Q118,170 119,166 Q122,158 130,148" fill="#64748b" stroke="#334155" stroke-width="1" opacity="0.6"/>' +

                  '<ellipse cx="68" cy="105" r="8" ry="6" fill="white" stroke="#1e293b" stroke-width="1.5"/>' +

                  '<circle cx="70" cy="105" r="3.5" fill="#0f172a"/>' +

                  '<path d="M30,112 Q22,110 15,110" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round"/>' +

                  '<path d="M30,118 Q22,120 15,120" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round"/>' +

                  '<line x1="105" y1="90" x2="105" y2="80" stroke="#334155" stroke-width="1.8" stroke-linecap="round"/>' +

                  '<line x1="115" y1="88" x2="115" y2="78" stroke="#334155" stroke-width="1.8" stroke-linecap="round"/>' +

                  '<line x1="125" y1="86" x2="125" y2="77" stroke="#334155" stroke-width="1.6" stroke-linecap="round"/>' +

                  '<line x1="135" y1="84" x2="135" y2="76" stroke="#334155" stroke-width="1.4" stroke-linecap="round"/>' +

                  '<line x1="145" y1="82" x2="145" y2="75" stroke="#334155" stroke-width="1.2" stroke-linecap="round"/>' +

                  '<circle cx="45" cy="108" r="2" fill="#475569" opacity="0.5"/>' +

                  '<circle cx="40" cy="112" r="1.5" fill="#475569" opacity="0.4"/>' +

                  '<circle cx="50" cy="105" r="1.5" fill="#475569" opacity="0.4"/>' +

                  '<circle cx="38" cy="106" r="1" fill="#475569" opacity="0.3"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Dorsal Fin', x: 53, y: 3, desc: 'The iconic triangular fin provides stability. Made entirely of cartilage — sharks have no true bones anywhere in their body.' },

                { name: 'Gill Slits (5)', x: 27, y: 36, desc: 'Five exposed gill slits with no protective cover. Sharks must swim to push water over gills — they cannot pump water like bony fish.' },

                { name: 'Ampullae of Lorenzini', x: 9, y: 46, desc: 'Jelly-filled pores on the snout that detect electrical fields as weak as 5 nanovolts — enough to sense a prey heartbeat buried in sand.' },

                { name: 'Heterocercal Tail', x: 95, y: 32, desc: 'Upper lobe is longer, generating upward lift as the shark swims. This compensates for the lack of a swim bladder.' },

                { name: 'Pectoral Fins', x: 26, y: 62, desc: 'Rigid, wing-like fins that generate lift. Unlike bony fish, shark pectoral fins cannot fold flat — they act as airplane wings.' },

                { name: 'Dermal Denticles', x: 62, y: 55, desc: 'Tooth-like scales (placoid scales) that channel water flow. Surface texture reduces drag by 8% — inspired NASA swimsuit designs.' },

                { name: 'Cartilage Skeleton', x: 45, y: 50, desc: 'Skeleton is 100% cartilage — half the density of bone. This makes sharks lighter and more agile, but fossils only preserve teeth and spines.' },

                { name: 'Replaceable Teeth', x: 5, y: 50, desc: 'Teeth grow in rows on a conveyor-belt jaw. A single shark may produce 30,000+ teeth in its lifetime, replacing them every 1-2 weeks.' }

              ]

            },

            jellyfish: {

              label: 'Cnidarian (Medusa Form)',

              svg: function (w, h, color) {

                var c1 = color || '#c4b5fd', c2 = color || '#8b5cf6';

                return '<svg viewBox="0 0 320 340" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<radialGradient id="jellyG" cx="50%" cy="40%"><stop offset="0%" stop-color="' + c1 + '" stop-opacity="0.3"/><stop offset="60%" stop-color="' + c1 + '" stop-opacity="0.5"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.7"/></radialGradient>' +

                  '<radialGradient id="jellyInner" cx="50%" cy="50%"><stop offset="0%" stop-color="white" stop-opacity="0.15"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0"/></radialGradient>' +

                  '</defs>' +

                  '<path d="M60,100 Q60,30 160,25 Q260,30 260,100 Q260,120 240,130 Q200,145 160,145 Q120,145 80,130 Q60,120 60,100Z" fill="url(#jellyG)" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<ellipse cx="160" cy="75" rx="55" ry="30" fill="url(#jellyInner)"/>' +

                  '<path d="M100,100 Q95,95 100,90 Q105,85 110,87" stroke="' + c1 + '" stroke-width="0.8" fill="none" opacity="0.5"/>' +

                  '<path d="M200,95 Q195,90 200,85 Q205,80 210,82" stroke="' + c1 + '" stroke-width="0.8" fill="none" opacity="0.5"/>' +

                  '<path d="M160,100 L160,120 Q155,140 160,155 Q163,160 168,155 Q165,140 165,120" fill="' + c2 + '" opacity="0.3" stroke="' + c2 + '" stroke-width="0.5"/>' +

                  '<path d="M80,130 Q85,180 75,230 Q70,260 65,290" stroke="' + c2 + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.65"/>' +

                  '<path d="M115,140 Q118,200 110,260 Q108,280 105,310" stroke="' + c1 + '" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.55"/>' +

                  '<path d="M145,145 Q148,210 142,275 Q140,295 137,320" stroke="' + c2 + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>' +

                  '<path d="M175,145 Q172,210 178,275 Q180,295 183,320" stroke="' + c1 + '" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.55"/>' +

                  '<path d="M205,140 Q202,200 210,260 Q212,280 215,310" stroke="' + c2 + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.65"/>' +

                  '<path d="M240,130 Q235,180 245,230 Q250,260 255,290" stroke="' + c1 + '" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.5"/>' +

                  '<path d="M90,132 Q100,155 88,175 Q100,190 90,210 Q100,225 92,245" stroke="' + c1 + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.35"/>' +

                  '<path d="M230,132 Q220,155 232,175 Q220,190 230,210 Q220,225 228,245" stroke="' + c1 + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.35"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Bell (Medusa)', x: 50, y: 10, desc: 'The dome-shaped body contracts rhythmically for jet propulsion. Made of mesoglea — 95% water with collagen fibers for elasticity.' },

                { name: 'Tentacles', x: 78, y: 60, desc: 'Trailing appendages lined with cnidocytes — stinging cells that fire nematocysts in 700 nanoseconds, among the fastest events in nature.' },

                { name: 'Oral Arms', x: 25, y: 50, desc: 'Frilly appendages near the mouth that capture food particles. In some species they fuse to form a feeding curtain.' },

                { name: 'Gastrovascular Cavity', x: 50, y: 33, desc: 'A central cavity serves as both stomach and circulatory system. One opening functions as both mouth and anus.' },

                { name: 'Nerve Net', x: 40, y: 22, desc: 'No brain, no central nervous system. A diffuse nerve net coordinates swimming contractions. Some species have rhopalia (light/gravity sensors).' },

                { name: 'Radial Canals', x: 65, y: 25, desc: 'Channels radiating from the central cavity to the bell margin, distributing nutrients. Their radial symmetry predates bilateral body plans by 200M+ years.' }

              ]

            },

            sea_anemone: {

              label: 'Cnidarian (Polyp Form — Sea Anemone)',

              svg: function (w, h, color) {

                var c1 = color || '#ec4899', c2 = color || '#be185d';

                return '<svg viewBox="0 0 340 360" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<radialGradient id="anemG" cx="50%" cy="60%"><stop offset="0%" stop-color="' + c1 + '" stop-opacity="0.6"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.85"/></radialGradient>' +

                  '<radialGradient id="anemDisc" cx="50%" cy="50%"><stop offset="0%" stop-color="#fbbf24" stop-opacity="0.7"/><stop offset="60%" stop-color="' + c1 + '" stop-opacity="0.5"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.8"/></radialGradient>' +

                  '</defs>' +

                  // Pedal disc (base attached to substrate)

                  '<ellipse cx="170" cy="340" rx="75" ry="14" fill="' + c2 + '" stroke="#881337" stroke-width="2" opacity="0.9"/>' +

                  // Column (cylindrical body)

                  '<path d="M95,340 Q90,280 95,200 Q100,160 130,140 Q150,130 170,128 Q190,130 210,140 Q240,160 245,200 Q250,280 245,340Z" fill="url(#anemG)" stroke="' + c2 + '" stroke-width="1.8"/>' +

                  // Column texture lines

                  '<path d="M120,300 Q118,260 125,220" stroke="' + c2 + '" stroke-width="0.8" fill="none" opacity="0.3"/>' +

                  '<path d="M220,300 Q222,260 215,220" stroke="' + c2 + '" stroke-width="0.8" fill="none" opacity="0.3"/>' +

                  '<path d="M170,335 Q170,280 170,200" stroke="' + c2 + '" stroke-width="0.6" fill="none" opacity="0.2"/>' +

                  // Oral disc (top)

                  '<ellipse cx="170" cy="128" rx="60" ry="22" fill="url(#anemDisc)" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  // Mouth (center of oral disc)

                  '<ellipse cx="170" cy="128" rx="10" ry="6" fill="' + c2 + '" opacity="0.7"/>' +

                  // Tentacles (radiating outward from oral disc)

                  '<path d="M170,106 Q165,70 155,35 Q153,28 158,25 Q163,28 162,38 Q165,65 170,95" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.7"/>' +

                  '<path d="M145,112 Q125,80 108,50 Q105,42 110,40 Q115,42 118,55 Q130,80 148,108" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.65"/>' +

                  '<path d="M195,112 Q215,80 232,50 Q235,42 230,40 Q225,42 222,55 Q210,80 192,108" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.65"/>' +

                  '<path d="M125,120 Q95,100 68,85 Q62,82 64,77 Q70,78 75,84 Q95,96 128,115" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.6"/>' +

                  '<path d="M215,120 Q245,100 272,85 Q278,82 276,77 Q270,78 265,84 Q245,96 212,115" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.6"/>' +

                  '<path d="M130,130 Q100,130 72,128 Q65,128 64,123 Q68,120 75,122 Q100,124 132,126" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.55"/>' +

                  '<path d="M210,130 Q240,130 268,128 Q275,128 276,123 Q272,120 265,122 Q240,124 208,126" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.55"/>' +

                  // Zooxanthellae dots on column (symbiotic algae)

                  '<circle cx="140" cy="210" r="3" fill="#4ade80" opacity="0.5"/>' +

                  '<circle cx="200" cy="230" r="2.5" fill="#4ade80" opacity="0.45"/>' +

                  '<circle cx="155" cy="260" r="2" fill="#4ade80" opacity="0.4"/>' +

                  '<circle cx="185" cy="190" r="2.5" fill="#4ade80" opacity="0.45"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Tentacles', x: 50, y: 8, desc: 'Ring of flexible tentacles armed with cnidocytes (stinging cells). Used to capture prey — small fish and shrimp are paralyzed by nematocyst venom and guided to the mouth.' },

                { name: 'Oral Disc', x: 50, y: 33, desc: 'Flat upper surface surrounding the central mouth. The mouth is the only opening — it serves as both entrance for food and exit for waste, identical to the jellyfish body plan.' },

                { name: 'Column', x: 28, y: 55, desc: 'Muscular cylindrical body wall made of two tissue layers (ectoderm and endoderm) separated by mesoglea. Can contract to retract tentacles when threatened.' },

                { name: 'Pedal Disc', x: 50, y: 95, desc: 'Adhesive base that anchors the anemone to rocks, shells, or coral. Despite appearing fixed, anemones can slowly glide across surfaces at ~1 cm/hour.' },

                { name: 'Cnidocytes', x: 75, y: 18, desc: 'Specialized stinging cells concentrated on tentacles. Each cnidocyte fires a barbed nematocyst in under 700 nanoseconds — one of the fastest mechanical processes in nature.' },

                { name: 'Zooxanthellae', x: 30, y: 70, desc: 'Symbiotic photosynthetic algae living inside the tissue. They provide up to 90% of the anemone\'s energy via photosynthesis, in exchange for shelter and nutrients.' }

              ]

            },

            crustacean: {

              label: 'Crustacean (Arthropoda)',

              svg: function (w, h, color) {

                var c1 = color || '#f97316', c2 = color || '#dc2626';

                return '<svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="crustG" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '</defs>' +

                  '<ellipse cx="200" cy="120" rx="100" ry="55" fill="url(#crustG)" stroke="#991b1b" stroke-width="2.5"/>' +

                  '<path d="M200,67 Q200,75 195,85 Q190,90 200,90 Q210,90 205,85 Q200,75 200,67" fill="#991b1b" opacity="0.3"/>' +

                  '<ellipse cx="200" cy="90" rx="60" ry="25" fill="none" stroke="#fbbf24" stroke-width="1" stroke-dasharray="5,3" opacity="0.4"/>' +

                  '<ellipse cx="110" cy="105" rx="40" ry="32" fill="' + c1 + '" stroke="#991b1b" stroke-width="2"/>' +

                  '<circle cx="82" cy="92" r="8" fill="black" stroke="#991b1b" stroke-width="1.5"/><circle cx="84" cy="90" r="3" fill="white" opacity="0.7"/>' +

                  '<circle cx="95" cy="88" r="7" fill="black" stroke="#991b1b" stroke-width="1.5"/><circle cx="97" cy="86" r="2.5" fill="white" opacity="0.7"/>' +

                  '<path d="M80,88 Q50,55 30,38 Q25,35 28,32 Q32,30 38,35 Q55,48 78,80" stroke="' + c1 + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +

                  '<path d="M85,82 Q60,40 48,22 Q45,18 48,15 Q52,13 55,18 Q65,35 82,75" stroke="' + c1 + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +

                  '<path d="M140,155 Q135,185 130,215 Q128,225 132,230 Q138,228 140,220 Q145,195 148,165" stroke="#991b1b" stroke-width="4" fill="none" stroke-linecap="round"/>' +

                  '<path d="M170,162 Q168,192 165,225 Q163,235 168,238 Q174,236 175,228 Q178,198 178,168" stroke="#991b1b" stroke-width="4" fill="none" stroke-linecap="round"/>' +

                  '<path d="M210,165 Q212,195 215,228 Q217,238 222,238 Q226,235 225,225 Q222,195 218,168" stroke="#991b1b" stroke-width="4" fill="none" stroke-linecap="round"/>' +

                  '<path d="M245,162 Q248,190 252,218 Q254,226 258,225 Q262,222 260,215 Q255,188 250,160" stroke="#991b1b" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +

                  '<path d="M275,155 Q280,180 285,205 Q287,212 290,210 Q293,207 290,200 Q285,178 280,155" stroke="#991b1b" stroke-width="3" fill="none" stroke-linecap="round"/>' +

                  '<path d="M285,100 Q310,95 335,100 Q340,108 335,115 Q310,108 290,115" fill="' + c1 + '" stroke="#991b1b" stroke-width="2" opacity="0.6"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Carapace (Exoskeleton)', x: 50, y: 24, desc: 'Hardened shell of chitin and calcium carbonate. Must be molted (shed) to grow — the animal is soft and vulnerable for hours after.' },

                { name: 'Antennae (2 pairs)', x: 10, y: 11, desc: 'Long antennae detect touch, chemicals, and water currents. Short antennules sense gravity and balance via statocysts.' },

                { name: 'Compound Eyes', x: 22, y: 30, desc: 'Mounted on stalks with thousands of ommatidia (individual lenses). Excellent motion detection. Some species see polarized and UV light.' },

                { name: 'Walking Legs (Pereopods)', x: 42, y: 78, desc: 'Five pairs of jointed walking legs. First pair often modified into claws (chelipeds) for defense, feeding, and signaling.' },

                { name: 'Swimmerets (Pleopods)', x: 60, y: 60, desc: 'Small paddle-like appendages under the abdomen. Used for swimming, carrying eggs, and circulating water over abdominal gills.' },

                { name: 'Gills (under carapace)', x: 72, y: 38, desc: 'Feathery gills sit in chambers under the carapace. Appendages called scaphognathites act as pumps to draw water through.' }

              ]

            },

            cephalopod: {

              label: 'Cephalopod (Mollusca)',

              svg: function (w, h, color) {

                var c1 = color || '#f472b6', c2 = color || '#be185d';

                return '<svg viewBox="0 0 320 360" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<radialGradient id="cephG" cx="50%" cy="35%"><stop offset="0%" stop-color="' + c1 + '" stop-opacity="0.8"/><stop offset="100%" stop-color="' + c2 + '"/></radialGradient>' +

                  '</defs>' +

                  '<path d="M100,130 Q80,70 100,30 Q130,5 160,5 Q190,5 220,30 Q240,70 220,130 Q210,145 200,150 Q160,158 120,150 Q110,145 100,130Z" fill="url(#cephG)" stroke="' + c2 + '" stroke-width="2"/>' +

                  '<ellipse cx="160" cy="90" rx="40" ry="20" fill="rgba(255,255,255,0.06)"/>' +

                  '<circle cx="125" cy="80" r="18" fill="white" stroke="#1e293b" stroke-width="2"/><ellipse cx="128" cy="80" rx="7" ry="11" fill="#1e293b"/><circle cx="130" cy="77" r="2.5" fill="white"/>' +

                  '<circle cx="195" cy="80" r="18" fill="white" stroke="#1e293b" stroke-width="2"/><ellipse cx="198" cy="80" rx="7" ry="11" fill="#1e293b"/><circle cx="200" cy="77" r="2.5" fill="white"/>' +

                  '<path d="M148,120 Q155,125 160,120 Q165,125 172,120" stroke="' + c2 + '" stroke-width="2" fill="none"/>' +

                  '<path d="M160,130 Q158,140 155,148 Q160,155 165,148 Q162,140 160,130" fill="' + c2 + '" opacity="0.5"/>' +

                  '<path d="M108,155 Q100,200 90,250 Q85,280 82,310 Q80,320 85,325 Q92,322 95,310 Q100,280 105,250 Q108,220 112,190" stroke="' + c1 + '" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8"/>' +

                  '<path d="M125,158 Q120,210 115,265 Q112,295 110,320 Q108,330 113,332 Q120,328 120,315 Q122,290 125,260 Q128,220 130,180" stroke="' + c2 + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.75"/>' +

                  '<path d="M145,160 Q143,220 140,280 Q138,310 137,335 Q136,342 140,342 Q145,340 145,330 Q146,305 148,275 Q150,220 150,170" stroke="' + c1 + '" stroke-width="5.5" fill="none" stroke-linecap="round" opacity="0.8"/>' +

                  '<path d="M175,160 Q177,220 180,280 Q182,310 183,335 Q184,342 180,342 Q175,340 175,330 Q174,305 172,275 Q170,220 170,170" stroke="' + c2 + '" stroke-width="5.5" fill="none" stroke-linecap="round" opacity="0.75"/>' +

                  '<path d="M195,158 Q200,210 205,265 Q208,295 210,320 Q212,330 207,332 Q200,328 200,315 Q198,290 195,260 Q192,220 190,180" stroke="' + c1 + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>' +

                  '<path d="M212,155 Q220,200 230,250 Q235,280 238,310 Q240,320 235,325 Q228,322 225,310 Q220,280 215,250 Q212,220 208,190" stroke="' + c2 + '" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.75"/>' +

                  '<circle cx="95" cy="260" r="3" fill="rgba(255,255,255,0.3)"/>' +

                  '<circle cx="115" cy="285" r="2.5" fill="rgba(255,255,255,0.25)"/>' +

                  '<circle cx="145" cy="300" r="3" fill="rgba(255,255,255,0.3)"/>' +

                  '<circle cx="180" cy="295" r="2.5" fill="rgba(255,255,255,0.25)"/>' +

                  '<circle cx="210" cy="270" r="3" fill="rgba(255,255,255,0.3)"/>' +

                  '<circle cx="225" cy="260" r="2" fill="rgba(255,255,255,0.2)"/>' +

                  '<circle cx="130" cy="50" r="5" fill="' + c1 + '" opacity="0.25"/>' +

                  '<circle cx="190" cy="45" r="6" fill="' + c1 + '" opacity="0.2"/>' +

                  '<circle cx="160" cy="115" r="4" fill="' + c1 + '" opacity="0.15"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Mantle', x: 50, y: 8, desc: 'Muscular body housing all organs. Contracts forcefully to jet water through the siphon, achieving speeds up to 40 km/h in squids.' },

                { name: 'Arms (8) with Suckers', x: 25, y: 60, desc: 'Eight arms lined with suckers containing chemoreceptors — they can taste what they touch. Each sucker can exert tremendous grip force.' },

                { name: 'Siphon (Funnel)', x: 50, y: 40, desc: 'A muscular nozzle for jet propulsion. Water is drawn into the mantle cavity, then expelled forcefully. Also ejects ink for escape.' },

                { name: 'Camera Eyes', x: 38, y: 22, desc: 'Evolved independently from vertebrate eyes but are structurally similar. No blind spot (unlike human eyes). Can see polarized light.' },

                { name: 'Chromatophores', x: 60, y: 15, desc: 'Thousands of pigment-filled sacs that expand/contract in milliseconds. Controlled directly by the brain for instant camouflage, signaling, and hypnotic hunting displays.' },

                { name: 'Three Hearts', x: 50, y: 30, desc: 'Two branchial hearts push blood through the gills. One systemic heart circulates oxygenated blood. Blood is copper-based (hemocyanin) — it is blue.' },

                { name: 'Beak', x: 50, y: 36, desc: 'A hard, parrot-like beak of chitin — the only rigid structure. An octopus can squeeze through any gap larger than its beak.' }

              ]

            },

            echinoderm: {

              label: 'Echinoderm (Asteroidea)',

              svg: function (w, h, color) {

                var c1 = color || '#f97316', c2 = color || '#ea580c';

                return '<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="echiG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '<radialGradient id="echiCenter"><stop offset="0%" stop-color="#fed7aa"/><stop offset="100%" stop-color="' + c2 + '"/></radialGradient>' +

                  '</defs>' +

                  '<path d="M160,15 Q170,60 178,85 L195,95 Q240,80 275,68 Q285,68 285,75 Q280,82 240,105 L225,118 Q235,140 245,175 Q250,195 248,200 Q242,205 235,195 Q215,162 200,140 L185,138 Q170,155 160,175 Q150,155 135,138 L120,140 Q105,162 85,195 Q78,205 72,200 Q70,195 75,175 Q85,140 95,118 L80,105 Q40,82 35,75 Q35,68 45,68 Q80,80 125,95 L142,85 Q150,60 160,15Z" fill="url(#echiG)" stroke="#c2410c" stroke-width="2.5" stroke-linejoin="round"/>' +

                  '<circle cx="160" cy="135" r="22" fill="url(#echiCenter)" stroke="#c2410c" stroke-width="2"/>' +

                  '<circle cx="160" cy="135" r="5" fill="#c2410c"/>' +

                  '<circle cx="160" cy="22" r="4" fill="#fbbf24" stroke="#c2410c" stroke-width="1" opacity="0.8"/>' +

                  '<circle cx="278" cy="72" r="4" fill="#fbbf24" stroke="#c2410c" stroke-width="1" opacity="0.8"/>' +

                  '<circle cx="245" cy="197" r="4" fill="#fbbf24" stroke="#c2410c" stroke-width="1" opacity="0.8"/>' +

                  '<circle cx="75" cy="197" r="4" fill="#fbbf24" stroke="#c2410c" stroke-width="1" opacity="0.8"/>' +

                  '<circle cx="42" cy="72" r="4" fill="#fbbf24" stroke="#c2410c" stroke-width="1" opacity="0.8"/>' +

                  '<line x1="160" y1="113" x2="160" y2="25" stroke="#c2410c" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.4"/>' +

                  '<line x1="178" y1="122" x2="275" y2="72" stroke="#c2410c" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.4"/>' +

                  '<line x1="172" y1="152" x2="242" y2="195" stroke="#c2410c" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.4"/>' +

                  '<line x1="148" y1="152" x2="78" y2="195" stroke="#c2410c" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.4"/>' +

                  '<line x1="142" y1="122" x2="45" y2="72" stroke="#c2410c" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.4"/>' +

                  '<circle cx="155" cy="128" r="3" fill="#fde68a" opacity="0.6"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Water Vascular System', x: 50, y: 42, desc: 'A hydraulic network unique to echinoderms. Seawater enters through the madreporite and fills radial canals powering hundreds of tube feet.' },

                { name: 'Tube Feet', x: 30, y: 42, desc: 'Tiny suction-cup appendages powered by hydraulic pressure. Coordinated movement can pry open clam shells with sustained force of 5+ kg.' },

                { name: 'Madreporite', x: 48, y: 38, desc: 'A small sieve plate (visible as a pale dot) that filters seawater into the water vascular system. Located off-center on the aboral surface.' },

                { name: 'Eyespots', x: 50, y: 5, desc: 'Simple photoreceptors at each arm tip — bright spots visible at extremities. Cannot form images but detect light direction and intensity.' },

                { name: 'Pentaradial Symmetry', x: 85, y: 22, desc: 'Five-fold body plan. Adults develop this from bilateral larvae — a unique metamorphosis among animals. No front, back, or sides.' },

                { name: 'Regeneration Zone', x: 24, y: 60, desc: 'Can regrow entire arms from the central disc. Some species regenerate a complete animal from a single arm. Process takes months to years.' }

              ]

            },

            cetacean: {

              label: 'Marine Mammal (Cetacea)',

              svg: function (w, h, color) {

                return '<svg viewBox="0 0 480 220" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="cetG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#64748b"/><stop offset="55%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M35,110 Q45,72 80,62 Q120,52 170,55 Q230,52 290,62 Q340,72 370,85 Q400,95 420,100 Q440,95 455,78 Q462,70 465,72 Q465,80 460,92 Q455,105 455,115 Q460,130 465,148 Q465,150 462,150 Q455,142 440,125 Q420,120 400,125 Q370,135 340,148 Q290,162 230,168 Q170,168 120,162 Q80,155 45,142 Q35,135 35,110Z" fill="url(#cetG)" stroke="#475569" stroke-width="2.5"/>' +

                  '<path d="M35,112 Q45,135 80,150 Q120,160 170,165 Q230,168 290,162 Q340,148 370,135 Q400,125 420,120" fill="#e2e8f0" opacity="0.35"/>' +

                  '<path d="M260,60 Q265,42 272,30 Q278,24 284,28 Q288,35 288,48 Q286,58 282,65" fill="#94a3b8" stroke="#475569" stroke-width="1.5" opacity="0.8"/>' +

                  '<circle cx="65" cy="100" r="7" fill="white" stroke="#1e293b" stroke-width="1.5"/><circle cx="67" cy="100" r="3.5" fill="#0f172a"/>' +

                  '<ellipse cx="58" cy="72" rx="8" ry="4" fill="#64748b" stroke="#475569" stroke-width="1.5" opacity="0.8"/>' +

                  '<path d="M140,145 Q128,162 118,172 Q112,175 113,170 Q118,158 130,142" fill="#94a3b8" stroke="#475569" stroke-width="1.5" opacity="0.7"/>' +

                  '<path d="M150,148 Q142,162 135,170 Q130,172 131,168 Q136,158 145,146" fill="#94a3b8" stroke="#475569" stroke-width="1.2" opacity="0.6"/>' +

                  '<path d="M35,108 Q42,100 50,98 Q55,102 48,110" fill="#94a3b8" stroke="#475569" stroke-width="1" opacity="0.5"/>' +

                  '<ellipse cx="100" cy="95" rx="25" ry="15" fill="rgba(255,255,255,0.05)" stroke="#475569" stroke-width="0.5" stroke-dasharray="4,4" />' +

                  '</svg>';

              },

              parts: [

                { name: 'Blowhole', x: 12, y: 28, desc: 'Modified nostril(s) on top of skull. Breathing is voluntary — cetaceans must consciously surface. Only half the brain sleeps at a time (unihemispheric sleep).' },

                { name: 'Melon (Echolocation)', x: 20, y: 40, desc: 'A fatty, oil-filled lens in the forehead that focuses outgoing clicks into a directional beam. Returning echoes are received through the lower jaw.' },

                { name: 'Dorsal Fin', x: 57, y: 12, desc: 'Dense connective tissue (no bone). Used for thermoregulation — blood vessels release or retain heat. Shape and nicks identify individuals.' },

                { name: 'Fluke (Tail)', x: 95, y: 38, desc: 'Horizontal tail moved up-and-down by powerful back muscles (not side-to-side like fish). No bones — pure collagen and connective tissue.' },

                { name: 'Pectoral Flippers', x: 30, y: 68, desc: 'Modified forelimbs containing humerus, radius, ulna, and finger bones — the same skeletal plan as a human arm, adapted for steering and braking.' },

                { name: 'Blubber Layer', x: 50, y: 55, desc: 'Thick subcutaneous fat providing insulation, energy storage, buoyancy, and streamlining. Up to 50 cm thick in Arctic species like bowhead whales.' }

              ]

            },

            chelonian: {

              label: 'Sea Turtle (Testudines)',

              svg: function (w, h, color) {

                var sh = color || '#4d7c0f';

                return '<svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<radialGradient id="turtCarapace" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#84cc16"/><stop offset="40%" stop-color="#65a30d"/><stop offset="75%" stop-color="#4d7c0f"/><stop offset="100%" stop-color="#365314"/></radialGradient>' +

                  '<linearGradient id="turtSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6b8e23"/><stop offset="100%" stop-color="#3b5110"/></linearGradient>' +

                  '<linearGradient id="turtFlipGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#5a7c1a"/><stop offset="100%" stop-color="#3d5412" stop-opacity="0.85"/></linearGradient>' +

                  '<linearGradient id="turtPlastron" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5e6b8"/><stop offset="100%" stop-color="#d4b66a"/></linearGradient>' +

                  '</defs>' +

                  // Rear flippers (behind body)

                  '<path d="M140,208 Q118,232 102,252 Q95,262 90,268 Q86,275 90,276 Q96,274 104,264 Q115,248 130,228 Q138,216 145,208" fill="url(#turtFlipGrad)" stroke="#2d4a0a" stroke-width="1.8"/>' +

                  '<path d="M280,208 Q302,232 318,252 Q325,262 330,268 Q334,275 330,276 Q324,274 316,264 Q305,248 290,228 Q282,216 275,208" fill="url(#turtFlipGrad)" stroke="#2d4a0a" stroke-width="1.8"/>' +

                  // Short tail

                  '<path d="M202,215 Q204,242 206,258 Q208,266 204,268 Q200,266 200,258 Q200,242 200,215" fill="url(#turtSkin)" stroke="#2d4a0a" stroke-width="1.2"/>' +

                  // Front flippers (wide paddle shape)

                  '<path d="M105,130 Q72,112 42,95 Q25,86 14,82 Q6,80 4,86 Q6,94 16,100 Q28,108 48,118 Q65,126 90,136" fill="url(#turtFlipGrad)" stroke="#2d4a0a" stroke-width="2"/>' +

                  '<line x1="28" y1="95" x2="70" y2="118" stroke="#2d4a0a" stroke-width="0.6" opacity="0.3"/>' +

                  '<line x1="20" y1="90" x2="55" y2="110" stroke="#2d4a0a" stroke-width="0.5" opacity="0.2"/>' +

                  '<path d="M315,130 Q348,112 378,95 Q395,86 406,82 Q414,80 416,86 Q414,94 404,100 Q392,108 372,118 Q355,126 330,136" fill="url(#turtFlipGrad)" stroke="#2d4a0a" stroke-width="2"/>' +

                  '<line x1="392" y1="95" x2="350" y2="118" stroke="#2d4a0a" stroke-width="0.6" opacity="0.3"/>' +

                  // Carapace (shell) - main dome

                  '<ellipse cx="210" cy="148" rx="118" ry="78" fill="url(#turtCarapace)" stroke="#2d4a0a" stroke-width="2.5"/>' +

                  // Scute pattern - central vertebral scutes (5 large)

                  '<path d="M210,74 L230,90 L230,118 L210,130 L190,118 L190,90Z" fill="none" stroke="#3d5412" stroke-width="1.5" opacity="0.55"/>' +

                  '<path d="M210,130 L232,144 L232,172 L210,184 L188,172 L188,144Z" fill="none" stroke="#3d5412" stroke-width="1.5" opacity="0.55"/>' +

                  '<path d="M210,184 L228,198 L220,222 L200,222 L192,198Z" fill="none" stroke="#3d5412" stroke-width="1.3" opacity="0.45"/>' +

                  // Costal scutes (flanking)

                  '<path d="M190,90 L166,80 L140,94 L148,118 L172,126 L190,118Z" fill="none" stroke="#3d5412" stroke-width="1.2" opacity="0.4"/>' +

                  '<path d="M230,90 L254,80 L280,94 L272,118 L248,126 L230,118Z" fill="none" stroke="#3d5412" stroke-width="1.2" opacity="0.4"/>' +

                  '<path d="M188,144 L158,136 L132,152 L138,180 L162,188 L188,172Z" fill="none" stroke="#3d5412" stroke-width="1.2" opacity="0.4"/>' +

                  '<path d="M232,144 L262,136 L288,152 L282,180 L258,188 L232,172Z" fill="none" stroke="#3d5412" stroke-width="1.2" opacity="0.4"/>' +

                  // Marginal scutes (edge ring, subtle)

                  '<path d="M100,120 Q97,135 100,150 Q105,165 115,175" fill="none" stroke="#3d5412" stroke-width="1" opacity="0.3"/>' +

                  '<path d="M320,120 Q323,135 320,150 Q315,165 305,175" fill="none" stroke="#3d5412" stroke-width="1" opacity="0.3"/>' +

                  // Shell highlight

                  '<ellipse cx="200" cy="118" rx="55" ry="28" fill="white" opacity="0.06"/>' +

                  // Head and neck

                  '<path d="M105,130 Q82,126 62,124 Q48,122 38,124 Q30,128 30,136 Q32,144 40,146 Q50,146 62,144 Q82,140 105,138" fill="url(#turtSkin)" stroke="#2d4a0a" stroke-width="2"/>' +

                  // Head detail

                  '<ellipse cx="42" cy="134" rx="16" ry="14" fill="#5a7c1a" stroke="#2d4a0a" stroke-width="2"/>' +

                  // Eye

                  '<ellipse cx="36" cy="128" rx="5.5" ry="5" fill="#1a1a1a" stroke="#0f0f0f" stroke-width="1.2"/>' +

                  '<ellipse cx="35" cy="127" rx="2" ry="1.8" fill="white" opacity="0.7"/>' +

                  // Beak

                  '<path d="M28,134 Q22,132 20,136 Q22,140 28,138" fill="#8b7d3c" stroke="#5c5228" stroke-width="1"/>' +

                  // Salt gland (tear mark)

                  '<path d="M32,132 Q28,136 26,142" stroke="#7cb8d4" stroke-width="1.5" fill="none" opacity="0.4" stroke-linecap="round"/>' +

                  // Plastron hint (underside visible at edge)

                  '<path d="M125,210 Q165,222 210,224 Q255,222 295,210" fill="none" stroke="#d4b66a" stroke-width="2" opacity="0.35"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Carapace (Shell)', x: 50, y: 25, desc: 'Fused vertebrae and ribs covered in keratinous scutes. Unlike land turtles, sea turtles cannot retract into their shell — it is streamlined for swimming.' },

                { name: 'Front Flippers', x: 8, y: 35, desc: 'Elongated forelimbs used for powerful underwater flight. Leatherbacks can dive to 1,280 meters. Front flippers generate all thrust.' },

                { name: 'Rear Flippers', x: 20, y: 80, desc: 'Shorter and rounder than front flippers. Used as rudders for steering. Females use them to dig egg chambers on nesting beaches.' },

                { name: 'Salt Glands', x: 5, y: 18, desc: 'Orbital glands near the eyes excrete concentrated salt — this is why sea turtles appear to cry. Excreted salt is twice as concentrated as seawater.' },

                { name: 'Scute Pattern', x: 35, y: 42, desc: 'Keratinous plates in species-specific arrangements. The pattern helps identify species. Growth rings on scutes record age like tree rings.' },

                { name: 'Magnetic Navigation', x: 55, y: 55, desc: 'Magnetite crystals in the brain create an internal compass. Hatchlings imprint their natal beach\'s unique magnetic signature and return decades later to nest.' }

              ]

            },

            betta: {

              label: 'Betta (Labyrinth Fish)',

              svg: function (w, h, color) {

                var c1 = color || '#7c3aed', c2 = color || '#5b21b6';

                return '<svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="bettaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '<linearGradient id="bettaFin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + c1 + '" stop-opacity="0.9"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.5"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M100,140 Q110,100 140,88 Q175,75 210,80 Q250,78 275,95 Q295,110 300,140 Q295,170 275,185 Q250,200 210,200 Q175,205 140,192 Q110,180 100,140Z" fill="url(#bettaG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M165,80 Q160,40 175,15 Q200,-5 230,10 Q260,30 270,60 Q275,78 270,85" fill="url(#bettaFin)" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<path d="M180,76 Q185,35 200,20" stroke="' + c2 + '" stroke-width="0.6" fill="none" opacity="0.4"/>' +

                  '<path d="M210,78 Q218,40 235,25" stroke="' + c2 + '" stroke-width="0.6" fill="none" opacity="0.4"/>' +

                  '<path d="M240,82 Q250,50 260,38" stroke="' + c2 + '" stroke-width="0.6" fill="none" opacity="0.4"/>' +

                  '<path d="M300,130 Q330,110 360,85 Q385,65 400,60 Q410,62 408,72 Q400,85 380,105 Q360,120 340,130 Q360,140 380,155 Q400,175 408,188 Q410,198 400,200 Q385,195 360,175 Q330,150 300,140" fill="url(#bettaFin)" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<path d="M160,195 Q145,220 130,245 Q120,265 118,275 Q120,280 128,272 Q140,255 155,230 Q165,210 170,198" fill="url(#bettaFin)" stroke="' + c2 + '" stroke-width="1.2" opacity="0.85"/>' +

                  '<path d="M200,200 Q195,230 192,255 Q190,268 195,270 Q200,265 202,250 Q206,230 208,205" fill="url(#bettaFin)" stroke="' + c2 + '" stroke-width="1.2" opacity="0.8"/>' +

                  '<path d="M110,160 Q90,175 72,192 Q60,202 55,198 Q55,190 65,178 Q80,162 100,148" fill="url(#bettaFin)" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<circle cx="120" cy="128" r="12" fill="white" stroke="#334155" stroke-width="2"/>' +

                  '<circle cx="124" cy="128" r="6.5" fill="#1e293b"/>' +

                  '<circle cx="126" cy="126" r="2.5" fill="white" opacity="0.8"/>' +

                  '<path d="M100,136 Q92,134 85,134" stroke="' + c2 + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Flowing Dorsal Fin', x: 48, y: 2, desc: 'Elaborate, sail-like dorsal fin used for display. In male bettas, it can span nearly the entire body length. Breeding selects for longer, more colorful fins.' },

                { name: 'Caudal Veil (Tail)', x: 90, y: 42, desc: 'Dramatic fan-shaped tail with delicate membrane. Multiple tail types exist: halfmoon, crowntail, plakat, veiltail. Susceptible to fin rot in poor water.' },

                { name: 'Pectoral Fins', x: 18, y: 58, desc: 'Small, rounded fins used for slow sculling movements. Bettas hover and maneuver precisely rather than swimming fast.' },

                { name: 'Labyrinth Organ', x: 35, y: 32, desc: 'A folded, lung-like organ above the gills that extracts oxygen from air. This allows bettas to survive in shallow, oxygen-poor water like rice paddies.' },

                { name: 'Ventral Fins (Display)', x: 42, y: 85, desc: 'Long, trailing ventral fins used primarily for signaling. Males flare ventral fins alongside their gill covers when challenging rivals.' },

                { name: 'Opercular Flare', x: 22, y: 44, desc: 'Gill covers extend outward to display bright-colored gill membranes. This threat display makes the fish appear larger and more intimidating to rivals.' }

              ]

            },

            seahorse: {

              label: 'Seahorse (Syngnathidae)',

              svg: function (w, h, color) {

                var c1 = color || '#f59e0b', c2 = color || '#d97706';

                return '<svg viewBox="0 0 280 380" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M130,25 Q145,15 160,20 Q175,28 178,45 Q180,60 175,80 Q170,95 165,110 Q162,125 160,140 Q158,155 155,170 Q152,185 150,200 Q148,215 145,230 Q140,250 130,265 Q118,280 105,290 Q90,298 78,300 Q65,298 55,288 Q50,275 55,260 Q65,250 80,248 Q92,250 98,260 Q100,268 95,275" fill="none" stroke="url(#seaG)" stroke-width="18" stroke-linecap="round"/>' +

                  '<path d="M140,25 Q150,15 162,18 Q172,25 175,40 Q178,55 175,75 Q170,92 166,108 Q162,122 160,138 Q158,152 155,168 Q152,182 150,198 Q148,212 145,228 Q140,248 130,262 Q120,275 108,285" fill="none" stroke="' + c1 + '" stroke-width="8" stroke-linecap="round" opacity="0.3"/>' +

                  '<ellipse cx="155" cy="45" rx="28" ry="25" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M183,42 Q195,38 210,35 Q218,34 220,38 Q218,42 210,42 Q195,44 185,45" fill="' + c2 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.8"/>' +

                  '<circle cx="168" cy="38" r="7" fill="white" stroke="#334155" stroke-width="1.5"/>' +

                  '<circle cx="170" cy="38" r="3.5" fill="#1e293b"/><circle cx="171" cy="37" r="1.5" fill="white" opacity="0.7"/>' +

                  '<path d="M142,22 Q135,10 140,5 Q148,3 152,8 Q155,15 148,22" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.7"/>' +

                  '<path d="M160,75 Q168,72 175,80 Q170,88 165,85" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.5"/>' +

                  '<path d="M155,115 Q162,112 168,118 Q164,125 158,122" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.5"/>' +

                  '<path d="M150,155 Q157,152 163,158 Q158,165 153,162" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.5"/>' +

                  '<path d="M145,195 Q152,192 157,198 Q153,205 148,202" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="0.8" opacity="0.5"/>' +

                  '<ellipse cx="150" cy="185" rx="12" ry="25" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.35"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Coronet (Crown)', x: 49, y: 2, desc: 'A bony crest unique to each individual — like a fingerprint. Used for species identification. Grows more elaborate with age.' },

                { name: 'Prehensile Tail', x: 30, y: 72, desc: 'Muscular, gripping tail used to anchor to seagrass and coral. Has a square cross-section for superior grip strength — unique among fish.' },

                { name: 'Brood Pouch (male)', x: 53, y: 48, desc: 'Males carry eggs in a ventral pouch. The female deposits eggs during an elaborate upright dance. Males nourish embryos for 2-4 weeks before giving birth.' },

                { name: 'Dorsal Fin', x: 60, y: 20, desc: 'Tiny, translucent dorsal fin that beats up to 35 times per second. This is the primary means of propulsion — making seahorses the slowest fish in the ocean.' },

                { name: 'Tubular Snout', x: 78, y: 10, desc: 'Elongated snout acts as a pipette — seahorses slurp up tiny crustaceans with a rapid head snap. Can strike and ingest prey in under 1 millisecond.' },

                { name: 'Bony Armor Plates', x: 42, y: 35, desc: 'Body encased in bony rings instead of scales. Provides excellent protection but limits flexibility. Few predators can digest the bony exterior.' }

              ]

            },

            pufferfish: {

              label: 'Pufferfish (Tetraodontidae)',

              svg: function (w, h, color) {

                var c1 = color || '#eab308', c2 = color || '#a16207';

                return '<svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<radialGradient id="puffG" cx="45%" cy="45%"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></radialGradient>' +

                  '<radialGradient id="puffBelly" cx="50%" cy="60%"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="' + c1 + '"/></radialGradient>' +

                  '</defs>' +

                  '<ellipse cx="200" cy="155" rx="130" ry="115" fill="url(#puffG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<ellipse cx="200" cy="175" rx="100" ry="85" fill="url(#puffBelly)" opacity="0.4"/>' +

                  '<circle cx="132" cy="110" r="22" fill="white" stroke="#334155" stroke-width="2.5"/>' +

                  '<circle cx="138" cy="110" r="12" fill="#1e293b"/>' +

                  '<circle cx="142" cy="106" r="4" fill="white" opacity="0.8"/>' +

                  '<circle cx="268" cy="110" r="22" fill="white" stroke="#334155" stroke-width="2.5"/>' +

                  '<circle cx="274" cy="110" r="12" fill="#1e293b"/>' +

                  '<circle cx="278" cy="106" r="4" fill="white" opacity="0.8"/>' +

                  '<path d="M175,170 Q185,180 200,182 Q215,180 225,170" stroke="#334155" stroke-width="3" fill="none" stroke-linecap="round"/>' +

                  '<line x1="195" y1="170" x2="195" y2="182" stroke="#334155" stroke-width="2"/>' +

                  '<line x1="205" y1="170" x2="205" y2="182" stroke="#334155" stroke-width="2"/>' +

                  '<path d="M330,120 Q355,110 370,100 Q378,98 378,105 Q372,115 355,125 Q340,130 330,135 Q340,140 355,145 Q372,155 378,165 Q378,172 370,170 Q355,160 330,150" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.8"/>' +

                  '<path d="M200,42 Q205,25 215,18 Q222,16 224,22 Q222,32 215,42" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<path d="M200,268 Q205,285 210,292 Q212,296 208,296 Q202,292 200,280" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<path d="M118,135 Q100,148 88,158 Q82,162 84,156 Q90,145 105,135 Q112,128 118,128" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<line x1="100" y1="70" x2="115" y2="58" stroke="' + c2 + '" stroke-width="2" stroke-linecap="round" opacity="0.5"/>' +

                  '<line x1="145" y1="52" x2="150" y2="38" stroke="' + c2 + '" stroke-width="2" stroke-linecap="round" opacity="0.5"/>' +

                  '<line x1="250" y1="52" x2="248" y2="38" stroke="' + c2 + '" stroke-width="2" stroke-linecap="round" opacity="0.5"/>' +

                  '<line x1="300" y1="70" x2="312" y2="58" stroke="' + c2 + '" stroke-width="2" stroke-linecap="round" opacity="0.5"/>' +

                  '<line x1="120" y1="210" x2="108" y2="225" stroke="' + c2 + '" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>' +

                  '<line x1="280" y1="210" x2="292" y2="225" stroke="' + c2 + '" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Inflation Sac', x: 50, y: 48, desc: 'A highly elastic stomach that can inflate with water (or air) to 3x normal size. This makes the fish nearly impossible for predators to swallow.' },

                { name: 'Fused Beak Teeth', x: 50, y: 55, desc: 'Four fused teeth form a strong beak that can crack open shellfish, sea urchins, and crabs. Teeth grow continuously — must eat hard food to keep them trimmed.' },

                { name: 'Spines (when inflated)', x: 30, y: 18, desc: 'Short spines embedded in the skin become erect when inflated. Combined with inflation, they create a spiky ball that deters all but the most determined predators.' },

                { name: 'Large Eyes', x: 33, y: 34, desc: 'Independently moving eyes provide near 360° vision. Puffers are considered among the most intelligent fish — they recognize their owners and can learn tricks.' },

                { name: 'Tetrodotoxin Organs', x: 70, y: 45, desc: 'Liver, ovaries, and skin contain tetrodotoxin — 1,200× more lethal than cyanide. Produced by symbiotic bacteria. There is no antidote.' },

                { name: 'Caudal Fin (Rudder)', x: 88, y: 40, desc: 'Small tail fin for slow, precise maneuvering. Dorsal and anal fins do most of the work. Puffers swim awkwardly but compensate with excellent defenses.' }

              ]

            },

            anglerfish_plan: {

              label: 'Deep-Sea Anglerfish (Lophiiformes)',

              svg: function (w, h, color) {

                var c1 = color || '#1c1917', c2 = color || '#0c0a09';

                return '<svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<radialGradient id="anglerG" cx="40%" cy="40%"><stop offset="0%" stop-color="#292524"/><stop offset="100%" stop-color="' + c1 + '"/></radialGradient>' +

                  '<radialGradient id="lureGlow" cx="50%" cy="50%"><stop offset="0%" stop-color="#86efac"/><stop offset="30%" stop-color="#22c55e" stop-opacity="0.8"/><stop offset="100%" stop-color="#22c55e" stop-opacity="0"/></radialGradient>' +

                  '</defs>' +

                  '<rect width="420" height="320" fill="#0a0a0a" rx="8"/>' +

                  '<path d="M70,180 Q80,110 120,85 Q165,60 220,65 Q280,60 315,100 Q340,130 345,180 Q340,230 315,260 Q280,285 220,285 Q165,290 120,265 Q80,240 70,180Z" fill="url(#anglerG)" stroke="#44403c" stroke-width="2"/>' +

                  '<path d="M70,180 Q80,220 120,250 Q165,275 220,280 Q280,280 315,258 Q340,230 345,180" fill="#1c1917" opacity="0.5"/>' +

                  '<path d="M120,82 Q115,65 108,50 Q105,42 100,35 Q98,28 102,22 Q108,18 112,22 Q115,30 115,42 Q116,52 118,62" stroke="#57534e" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +

                  '<circle cx="102" cy="18" r="12" fill="url(#lureGlow)"/>' +

                  '<circle cx="102" cy="18" r="5" fill="#4ade80" opacity="0.9"/>' +

                  '<circle cx="104" cy="16" r="2" fill="white" opacity="0.8"/>' +

                  '<circle cx="105" cy="145" r="28" fill="#292524" stroke="#44403c" stroke-width="2"/>' +

                  '<circle cx="115" cy="142" r="16" fill="#fef9c3" opacity="0.15"/>' +

                  '<circle cx="112" cy="145" r="12" fill="#1c1917"/>' +

                  '<circle cx="115" cy="142" r="4" fill="#fef9c3" opacity="0.6"/>' +

                  '<path d="M70,175 Q55,170 42,172 Q32,176 38,182 Q48,185 60,182" fill="#44403c" stroke="#57534e" stroke-width="1.5" opacity="0.7"/>' +

                  '<path d="M230,280 Q235,295 240,305 Q242,310 238,310 Q232,305 230,295" fill="#292524" stroke="#44403c" stroke-width="1.2" opacity="0.6"/>' +

                  '<path d="M260,278 Q265,292 268,300 Q270,305 266,305 Q260,300 258,290" fill="#292524" stroke="#44403c" stroke-width="1.2" opacity="0.6"/>' +

                  '<path d="M345,160 Q365,145 385,135 Q395,132 395,140 Q388,150 370,162 Q380,168 392,178 Q398,185 395,190 Q388,188 370,175 Q358,168 350,170" fill="#292524" stroke="#44403c" stroke-width="1.5" opacity="0.7"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Bioluminescent Lure (Esca)', x: 24, y: 4, desc: 'A modified dorsal fin spine (illicium) tipped with a glowing bulb. Contains symbiotic bioluminescent bacteria. Attracts prey in the pitch-black deep sea.' },

                { name: 'Enormous Mouth', x: 15, y: 55, desc: 'Hinged jaw can open to 120°, allowing the anglerfish to swallow prey up to twice its own body size. Inward-pointing teeth prevent escape.' },

                { name: 'Enormous Eye', x: 26, y: 43, desc: 'Large, forward-facing eyes sensitized to detect bioluminescent flashes. In many species, eyes are adapted to see blue-green light wavelengths only.' },

                { name: 'Expandable Stomach', x: 50, y: 60, desc: 'Highly distensible stomach can accommodate meals larger than the anglerfish itself. Meals are rare in the deep sea, so storage capacity is critical.' },

                { name: 'Parasitic Male (attached)', x: 70, y: 75, desc: 'Males are tiny (<10% of female size). They bite the female and fuse permanently, becoming a parasite that provides sperm on demand.' },

                { name: 'Pressure-Adapted Body', x: 45, y: 85, desc: 'Gelatinous flesh with minimal bone. Lack of a swim bladder prevents implosion at extreme depths (1,000-4,000m). Metabolism is extremely slow.' }

              ]

            },

            angelfish: {

              label: 'Angelfish (Pterophyllum)',

              svg: function (w, h, color) {

                var c1 = color || '#fbbf24', c2 = color || '#b45309';

                return '<svg viewBox="0 0 360 400" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="angG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '<linearGradient id="angFin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + c1 + '" stop-opacity="0.9"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.5"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M110,200 Q115,140 145,110 Q175,85 200,80 Q225,85 255,110 Q285,140 290,200 Q285,260 255,290 Q225,315 200,320 Q175,315 145,290 Q115,260 110,200Z" fill="url(#angG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M200,80 Q195,35 185,10 Q180,0 190,5 Q200,15 210,5 Q220,0 215,10 Q205,35 200,80" fill="url(#angFin)" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<path d="M200,320 Q195,365 185,390 Q180,400 190,395 Q200,385 210,395 Q220,400 215,390 Q205,365 200,320" fill="url(#angFin)" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<path d="M290,195 Q310,185 330,175 Q340,172 340,180 Q335,190 320,198 Q335,206 340,216 Q340,224 330,221 Q310,211 290,205" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<path d="M130,170 Q115,158 102,150 Q95,148 95,155 Q100,162 115,172" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.8"/>' +

                  '<path d="M130,230 Q115,242 102,250 Q95,252 95,245 Q100,238 115,228" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.8"/>' +

                  '<circle cx="145" cy="185" r="14" fill="white" stroke="#334155" stroke-width="2"/>' +

                  '<circle cx="149" cy="185" r="8" fill="#1e293b"/>' +

                  '<circle cx="152" cy="183" r="3" fill="white" opacity="0.8"/>' +

                  '<path d="M150,130 L250,130" stroke="' + c2 + '" fill="none" stroke-width="0.8" opacity="0.3"/>' +

                  '<path d="M150,160 L260,160" stroke="' + c2 + '" fill="none" stroke-width="0.8" opacity="0.3"/>' +

                  '<path d="M150,195 L280,195" stroke="' + c2 + '" fill="none" stroke-width="1" stroke-dasharray="6,4" opacity="0.35"/>' +

                  '<path d="M150,230 L260,230" stroke="' + c2 + '" fill="none" stroke-width="0.8" opacity="0.3"/>' +

                  '<path d="M150,260 L250,260" stroke="' + c2 + '" fill="none" stroke-width="0.8" opacity="0.3"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Tall Dorsal Fin', x: 55, y: 3, desc: 'Extremely elongated dorsal fin gives the diamond-shaped profile. Used for display and stability in slow-moving water. Vulnerable to fin nipping by tankmates.' },

                { name: 'Trailing Anal Fin', x: 55, y: 95, desc: 'Mirror-image of the dorsal fin. Creates the characteristic angel profile. Both fins are supported by bony rays covered in thin membrane.' },

                { name: 'Laterally Compressed Body', x: 42, y: 48, desc: 'Disc-shaped body allows navigation through dense vegetation. Angelfish are ambush predators that hide among plant stems in the Amazon basin.' },

                { name: 'Caudal Fin (Tail)', x: 92, y: 48, desc: 'Small, fan-shaped tail provides gentle propulsion. Angelfish are slow, deliberate swimmers — built for maneuverability, not speed.' },

                { name: 'Vertical Bars', x: 60, y: 35, desc: 'Dark vertical bars provide camouflage among underwater vegetation. Pattern intensity changes with mood — bars fade when stressed or dominant.' },

                { name: 'Pectoral Fins', x: 30, y: 42, desc: 'Fan-shaped fins for precise steering. Used to fan eggs during spawning. Both parents guard eggs by wafting fresh, oxygenated water over them.' }

              ]

            },

            tetra: {

              label: 'Tetra (Characidae)',

              svg: function (w, h, color) {

                var c1 = color || '#38bdf8', c2 = color || '#0284c7';

                return '<svg viewBox="0 0 380 200" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="tetG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="50%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M50,100 Q60,65 95,52 Q130,42 170,42 Q220,40 255,50 Q280,58 295,75 Q305,90 305,100 Q305,110 295,125 Q280,142 255,150 Q220,160 170,158 Q130,158 95,148 Q60,135 50,100Z" fill="url(#tetG)" stroke="' + c2 + '" stroke-width="2"/>' +

                  '<rect x="90" y="72" width="175" height="12" rx="6" fill="' + c1 + '" opacity="0.9" stroke="' + c2 + '" stroke-width="0.8"/>' +

                  '<rect x="90" y="86" width="175" height="10" rx="5" fill="#dc2626" opacity="0.7" stroke="#b91c1c" stroke-width="0.8"/>' +

                  '<path d="M305,95 Q320,85 340,72 Q352,64 356,68 L356,76 Q350,82 340,90 Q330,96 325,100 Q330,104 340,110 Q350,118 356,124 L356,132 Q352,136 340,128 Q320,115 305,105" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<path d="M190,42 Q193,28 200,18 Q207,12 212,16 Q215,22 213,32 Q210,40 207,45" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.7"/>' +

                  '<path d="M200,155 Q203,165 205,172 Q207,178 203,178 Q199,175 198,168 Q197,162 198,156" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.6"/>' +

                  '<path d="M100,128 Q88,138 78,145 Q72,148 74,143 Q80,136 90,128" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.7"/>' +

                  '<circle cx="70" cy="90" r="12" fill="white" stroke="#334155" stroke-width="1.5"/>' +

                  '<circle cx="73" cy="90" r="6.5" fill="#1e293b"/>' +

                  '<circle cx="75" cy="88" r="2.5" fill="white" opacity="0.8"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Iridescent Stripe', x: 40, y: 37, desc: 'The famous neon stripe is made of guanine crystals arranged in layers. Acts like a biological mirror — reflects light to create iridescent blue-green shimmer.' },

                { name: 'Red Band', x: 40, y: 44, desc: 'Pigment cells (chromatophores) produce the vivid red belly band. Color intensity signals health and breeding readiness to potential mates.' },

                { name: 'Torpedo Body', x: 55, y: 50, desc: 'Streamlined, laterally compressed body optimized for darting through dense vegetation. Small size (3-4cm) allows passage through tight spaces.' },

                { name: 'Forked Caudal Fin', x: 90, y: 50, desc: 'Deeply forked tail for rapid bursts of speed. Tetras alternate between hovering in schools and explosive escape dashes when startled.' },

                { name: 'Adipose Fin', x: 55, y: 10, desc: 'A small, fleshy fin between dorsal and tail found only in certain fish groups. Its function is debated — may detect water flow turbulence.' },

                { name: 'Schooling Behavior', x: 20, y: 45, desc: 'Large eyes positioned for wide-angle vision enable precise school coordination. Each fish maintains exact distance from neighbors using its lateral line.' }

              ]

            },

            guppy_body: {

              label: 'Livebearer (Poeciliidae)',

              svg: function (w, h, color) {

                var c1 = color || '#f97316', c2 = color || '#c2410c';

                return '<svg viewBox="0 0 380 220" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="gupG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '<radialGradient id="gupTail" cx="30%" cy="50%"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.6"/></radialGradient>' +

                  '</defs>' +

                  '<path d="M60,110 Q70,72 105,58 Q140,48 180,50 Q225,48 260,60 Q285,72 295,95 Q300,110 295,125 Q285,148 260,160 Q225,172 180,170 Q140,172 105,162 Q70,148 60,110Z" fill="url(#gupG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M60,110 Q70,130 105,148 Q140,162 180,165 Q225,168 260,158 Q285,148 295,125" fill="' + c2 + '" opacity="0.2"/>' +

                  '<path d="M295,100 Q320,80 345,55 Q360,40 365,45 Q368,55 360,70 Q345,90 325,105 Q345,120 360,140 Q368,155 365,165 Q360,170 345,155 Q320,130 295,120" fill="url(#gupTail)" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<circle cx="80" cy="98" r="13" fill="white" stroke="#334155" stroke-width="2"/>' +

                  '<circle cx="84" cy="98" r="7" fill="#1e293b"/>' +

                  '<circle cx="86" cy="96" r="2.5" fill="white" opacity="0.8"/>' +

                  '<path d="M185,50 Q188,35 195,25 Q200,20 204,24 Q206,32 204,40 Q200,48 198,52" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.7"/>' +

                  '<path d="M200,168 Q202,180 205,188 Q206,195 202,195 Q198,190 197,182 Q196,175 197,170" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.6"/>' +

                  '<path d="M110,145 Q95,158 85,168 Q80,172 82,166 Q88,156 100,145" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.7"/>' +

                  '<ellipse cx="235" cy="128" rx="25" ry="8" fill="rgba(255,255,255,0.12)" stroke="' + c2 + '" stroke-width="0.5" opacity="0.5"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Fan-Shaped Caudal', x: 90, y: 30, desc: 'Large, colorful tail fin doubles as a display organ. Males fan their tails to attract females. Tail shape varies: round, lyretail, swordtail, delta.' },

                { name: 'Gravid Spot (female)', x: 60, y: 58, desc: 'A dark patch near the anal fin in pregnant females. Darkens as embryos develop. Fry develop fully inside the mother — born live and free-swimming.' },

                { name: 'Gonopodium (male)', x: 53, y: 78, desc: 'Modified anal fin used for internal fertilization — unique to livebearers. Guppies can store sperm for months, producing multiple broods from a single mating.' },

                { name: 'Color Patterns', x: 40, y: 35, desc: 'Male coloration is genetically determined and Y-linked. Females prefer males with rare patterns — driving constant evolution of new color morphs.' },

                { name: 'Compact Body', x: 35, y: 50, desc: 'Rounded, robust body optimized for quick starts rather than sustained swimming. Livebearers are surface-feeders that dart for food.' },

                { name: 'Upturned Mouth', x: 14, y: 42, desc: 'Slightly upturned jaw adapted for feeding at the water surface. Guppies eat mosquito larvae, making them valuable for biocontrol of malaria.' }

              ]

            },

            flatfish: {

              label: 'Bottom-Dweller (Loricariidae)',

              svg: function (w, h, color) {

                var c1 = color || '#57534e', c2 = color || '#292524';

                return '<svg viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="flatG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M50,110 Q55,80 85,68 Q120,58 170,55 Q230,52 280,58 Q320,65 345,80 Q360,92 365,110 Q360,132 345,145 Q320,158 280,162 Q230,168 170,165 Q120,162 85,152 Q55,140 50,110Z" fill="url(#flatG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M62,75 Q58,68 52,62 Q48,58 52,55 Q58,52 62,58 Q66,65 68,72" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.6"/>' +

                  '<path d="M80,68 Q78,60 75,52 Q72,46 76,44 Q82,44 82,52 Q82,60 82,66" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.6"/>' +

                  '<path d="M95,62 Q94,55 93,48 Q92,42 96,40 Q100,42 100,48 Q99,55 98,60" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.6"/>' +

                  '<ellipse cx="75" cy="98" rx="10" ry="9" fill="#44403c" stroke="#1c1917" stroke-width="1.5"/>' +

                  '<circle cx="78" cy="97" r="5" fill="#292524"/><circle cx="79" cy="96" r="2" fill="#a8a29e" opacity="0.5"/>' +

                  '<ellipse cx="100" cy="98" rx="10" ry="9" fill="#44403c" stroke="#1c1917" stroke-width="1.5"/>' +

                  '<circle cx="103" cy="97" r="5" fill="#292524"/><circle cx="104" cy="96" r="2" fill="#a8a29e" opacity="0.5"/>' +

                  '<ellipse cx="50" cy="125" rx="12" ry="6" fill="' + c2 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.8"/>' +

                  '<path d="M365,105 Q385,95 400,88 Q408,86 408,92 Q402,100 388,108 Q402,115 408,122 Q408,128 400,126 Q385,118 365,112" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.8"/>' +

                  '<path d="M100,85 Q120,82 160,78 Q200,76 240,78 Q280,82 320,88" fill="none" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round" opacity="0.35"/>' +

                  '<path d="M105,92 Q130,88 170,85 Q210,83 250,85 Q290,88 310,92" fill="none" stroke="' + c2 + '" stroke-width="3" stroke-linecap="round" opacity="0.25"/>' +

                  '<path d="M110,100 Q140,96 180,94 Q220,93 260,95 Q300,98 315,102" fill="none" stroke="' + c2 + '" stroke-width="2" stroke-linecap="round" opacity="0.2"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Sucker Mouth', x: 10, y: 58, desc: 'Ventral sucker-like mouth for rasping algae off surfaces. The lips form a vacuum seal. Specialized teeth scrape biofilm — a living algae scrubber.' },

                { name: 'Bony Armor Plates', x: 50, y: 30, desc: 'Overlapping bony scutes replace scales. Provides armor-like protection from predators. So tough that some indigenous peoples use dried pleco skin as sandpaper.' },

                { name: 'Dorsal Spine Array', x: 15, y: 18, desc: 'Lockable dorsal spines can be erected and locked rigid. Once locked, predators cannot swallow the fish. Spines unlock with a special "trigger" mechanism.' },

                { name: 'High-Set Eyes', x: 22, y: 45, desc: 'Eyes positioned on top of the head for upward surveillance while bottom-feeding. Can see approaching predators while attached to rocks.' },

                { name: 'Flat Ventral Profile', x: 40, y: 55, desc: 'Body flattened from top to bottom (dorsoventrally) for a low profile against substrates. Reduces drag in current and helps maintain position on rocks.' },

                { name: 'Intestinal Breathing', x: 70, y: 52, desc: 'Some species can absorb atmospheric oxygen through a modified intestine. They gulp air at the surface — essential in low-oxygen tropical waters.' }

              ]

            },

            eel: {

              label: 'Deep-Sea Eel (Saccopharyngiformes)',

              svg: function (w, h, color) {

                var c1 = color || '#78716c', c2 = color || '#57534e';

                return '<svg viewBox="0 0 460 200" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="eelG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.6"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M30,85 Q45,55 80,45 Q115,42 140,55 Q155,65 160,80 Q162,90 155,105 Q140,120 125,125 Q115,125 110,118 Q125,115 138,108 Q148,98 150,85 Q148,72 140,62 Q125,50 100,48 Q70,52 50,70 Q38,82 35,95 Q35,108 45,118 Q60,130 85,140 Q120,148 170,150 Q220,148 270,140 Q320,130 370,115 Q400,105 420,100 Q440,100 450,108 L450,112 Q440,115 420,115 Q400,118 370,128 Q320,142 270,152 Q220,162 170,165 Q120,162 85,155 Q55,148 38,135 Q28,125 25,110 Q22,95 30,85Z" fill="url(#eelG)" stroke="#44403c" stroke-width="2"/>' +

                  '<path d="M30,85 Q50,65 80,52 Q100,48 120,52 Q55,58 38,82 Q32,95 38,110" fill="' + c1 + '" opacity="0.3"/>' +

                  '<circle cx="55" cy="75" r="8" fill="#292524" stroke="#44403c" stroke-width="1.5"/>' +

                  '<circle cx="57" cy="74" r="4" fill="#fef9c3" opacity="0.4"/><circle cx="58" cy="73" r="1.5" fill="#fef9c3" opacity="0.7"/>' +

                  '<path d="M445,108 Q448,105 450,108 Q448,115 445,112" fill="#dc2626" opacity="0.6"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Massive Hinged Jaw', x: 15, y: 30, desc: 'Jaw can unhinge to an angle greater than 180°. The entire head unfolds like a net to engulf prey. Can swallow fish larger than its own body.' },

                { name: 'Distensible Stomach', x: 30, y: 50, desc: 'Expandable stomach stretches to accommodate enormous meals. In the food-scarce deep sea, the ability to eat any prey encountered is essential for survival.' },

                { name: 'Bioluminescent Tail Tip', x: 97, y: 53, desc: 'The tail tip emits a pinkish-red glow to lure prey. Functions as a fishing line in reverse — prey approaches the light and enters the gaping mouth.' },

                { name: 'Tiny Eyes', x: 11, y: 35, desc: 'Extremely small eyes with minimal visual capability. In the lightless deep sea, vision is less important than detecting bioluminescent flashes.' },

                { name: 'Whip-Like Body', x: 60, y: 60, desc: 'Extremely elongated and laterally compressed body. The tail is 3-4x longer than the head and body combined. Enables slow, energy-efficient drifting.' },

                { name: 'Reduced Skeleton', x: 45, y: 40, desc: 'Minimally ossified bones reduce weight for neutral buoyancy. No swim bladder, no pelvic fins, no scales — everything stripped for deep-sea efficiency.' }

              ]

            },

            ray: {

              label: 'Manta Ray (Mobulidae)',

              svg: function (w, h, color) {

                var c1 = color || '#1e293b', c2 = color || '#0f172a';

                return '<svg viewBox="0 0 440 280" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="rayG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="70%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M220,60 Q260,55 310,40 Q360,25 400,15 Q425,10 430,20 Q428,35 410,50 Q380,72 340,90 Q300,105 270,115 Q260,118 250,120 Q240,118 220,115 Q200,118 190,120 Q180,118 170,115 Q140,105 100,90 Q60,72 30,50 Q12,35 10,20 Q15,10 40,15 Q80,25 130,40 Q180,55 220,60Z" fill="url(#rayG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M220,120 Q240,118 270,115 Q300,108 340,92 Q300,118 270,130 Q240,138 220,142 Q200,138 170,130 Q140,118 100,92 Q140,108 170,115 Q200,118 220,120Z" fill="#e2e8f0" opacity="0.3"/>' +

                  '<path d="M190,60 Q185,48 178,42 Q172,40 170,45 Q174,55 180,62" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<path d="M250,60 Q255,48 262,42 Q268,40 270,45 Q266,55 260,62" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<ellipse cx="200" cy="85" rx="6" ry="5" fill="#1e293b" stroke="#334155" stroke-width="1"/>' +

                  '<circle cx="201" cy="84" r="2.5" fill="#475569"/><circle cx="202" cy="83" r="1" fill="white" opacity="0.5"/>' +

                  '<ellipse cx="240" cy="85" rx="6" ry="5" fill="#1e293b" stroke="#334155" stroke-width="1"/>' +

                  '<circle cx="241" cy="84" r="2.5" fill="#475569"/><circle cx="242" cy="83" r="1" fill="white" opacity="0.5"/>' +

                  '<path d="M210,100 Q215,108 220,110 Q225,108 230,100" fill="none" stroke="#334155" stroke-width="1.5"/>' +

                  '<path d="M220,142 Q222,170 225,200 Q226,220 224,240 Q222,255 218,260 Q215,255 215,240 Q215,220 216,200 Q218,170 220,142" fill="' + c2 + '" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Pectoral Wings', x: 8, y: 15, desc: 'Enormously expanded pectoral fins create wing-like surfaces. Mantas swim by "flying" through water with powerful downstrokes. Wingspan can reach 7 meters.' },

                { name: 'Cephalic Fins', x: 42, y: 15, desc: 'Unique horn-like fins flanking the mouth that funnel plankton-rich water inward. Can be rolled up when not feeding. Gave rise to the name "devil ray."' },

                { name: 'Terminal Mouth', x: 50, y: 38, desc: 'Wide, forward-facing mouth with rows of tiny filter plates. Opens wide during feeding to maximize water intake. Can process thousands of liters per hour.' },

                { name: 'Counter-Shading', x: 60, y: 45, desc: 'Dark dorsal surface blends with ocean depths when viewed from above. Light ventral surface matches bright surface when viewed from below. Classic marine camouflage.' },

                { name: 'Whip Tail', x: 50, y: 85, desc: 'Long, slender tail without a stinging barb (unlike stingrays). Used as a rudder for precise turns during barrel-roll feeding maneuvers.' },

                { name: 'Gill Slits (ventral)', x: 38, y: 42, desc: 'Five pairs of gill slits on the underside filter oxygen. During feeding, water enters the mouth and exits the gills — a ram-ventilation system.' }

              ]

            },

            whale: {

              label: 'Baleen Whale (Mysticeti)',

              svg: function (w, h, color) {

                var c1 = color || '#3b82f6', c2 = color || '#1d4ed8';

                return '<svg viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="whlG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="70%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="#bfdbfe"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M30,110 Q35,75 60,60 Q90,48 130,45 Q180,40 230,42 Q290,40 340,50 Q370,58 390,72 Q405,85 410,100 Q412,110 410,120 Q405,135 390,148 Q370,162 340,170 Q290,180 230,178 Q180,180 130,175 Q90,172 60,160 Q35,145 30,110Z" fill="url(#whlG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M30,110 Q35,130 60,150 Q90,165 130,170 Q180,175 230,175 Q290,178 340,168 Q370,160 390,148 Q405,135 410,120" fill="' + c2 + '" opacity="0.2"/>' +

                  '<path d="M410,105 Q425,95 438,82 Q445,75 448,80 L448,88 Q445,95 438,105 Q445,115 448,125 L448,133 Q445,138 438,130 Q425,118 410,110" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5"/>' +

                  '<path d="M410,95 Q430,80 445,65 L448,62 Q452,65 450,72 Q445,85 430,100 Q445,115 450,130 Q452,137 448,140 L445,137 Q430,122 410,110" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.5"/>' +

                  '<circle cx="52" cy="95" r="8" fill="#1e3a5f" stroke="#334155" stroke-width="1.5"/>' +

                  '<circle cx="54" cy="94" r="4" fill="#1e293b"/><circle cx="55" cy="93" r="1.5" fill="white" opacity="0.6"/>' +

                  '<path d="M40,115 Q35,118 30,118" stroke="' + c2 + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +

                  '<path d="M100,155 L100,165 M115,157 L115,168 M130,158 L130,170 M145,158 L145,170 M160,157 L160,168 M175,155 L175,165" stroke="#bfdbfe" stroke-width="1.5" opacity="0.5"/>' +

                  '<path d="M60,170 Q55,180 50,185 M65,172 Q62,182 58,188" stroke="' + c2 + '" stroke-width="2" opacity="0.4" stroke-linecap="round"/>' +

                  '<path d="M250,42 Q260,25 268,15 Q272,10 272,18 Q268,28 262,38" fill="none" stroke="' + c2 + '" stroke-width="1.5" opacity="0.6"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Baleen Plates', x: 25, y: 72, desc: 'Hundreds of keratinous plates hang from the upper jaw like a curtain. Filter up to 4 tons of krill daily. Made of the same protein as human fingernails.' },

                { name: 'Ventral Pleats', x: 30, y: 82, desc: 'Accordion-like throat grooves expand to engulf enormous volumes of water. A blue whale\'s mouth can hold 90 tonnes of water in a single gulp.' },

                { name: 'Blowhole', x: 57, y: 5, desc: 'Paired nostrils migrated to the top of the skull. Exhaled air can reach 9 meters high. Contains a muscular plug that seals watertight during dives.' },

                { name: 'Fluke (Tail)', x: 95, y: 42, desc: 'Horizontal tail flukes move up and down (unlike fish tails). Each fluke has a unique trailing edge pattern — used by researchers to identify individuals.' },

                { name: 'Pectoral Flipper', x: 13, y: 78, desc: 'Contains the same bones as a human arm (humerus, radius, ulna, fingers). Internal structure reveals the whale\'s evolution from land-dwelling mammals.' },

                { name: 'Blubber Layer', x: 45, y: 55, desc: 'Up to 30cm of insulating fat. Serves as energy storage, thermal insulation, and streamlining. A blue whale\'s blubber can weigh 27 tonnes.' }

              ]

            },

            worm: {

              label: 'Giant Tube Worm (Riftia)',

              svg: function (w, h, color) {

                var c1 = color || '#dc2626', c2 = color || '#7f1d1d';

                return '<svg viewBox="0 0 300 380" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="wrmG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5f5f4"/><stop offset="100%" stop-color="#a8a29e"/></linearGradient>' +

                  '<radialGradient id="wrmPlume" cx="50%" cy="30%"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '" stop-opacity="0.7"/></radialGradient>' +

                  '</defs>' +

                  '<rect width="300" height="380" fill="#1c1917" rx="8"/>' +

                  '<rect x="125" y="120" width="50" height="250" rx="8" fill="url(#wrmG)" stroke="#78716c" stroke-width="2"/>' +

                  '<rect x="130" y="120" width="40" height="250" rx="6" fill="none" stroke="#a8a29e" stroke-width="0.8" opacity="0.4"/>' +

                  '<path d="M150,120 Q110,90 80,55 Q72,42 78,35 Q85,32 92,42 Q105,60 130,85 Q140,95 145,105" fill="url(#wrmPlume)" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<path d="M150,120 Q130,82 118,50 Q115,38 120,35 Q126,38 128,50 Q135,78 148,108" fill="url(#wrmPlume)" stroke="' + c2 + '" stroke-width="1.2" opacity="0.75"/>' +

                  '<path d="M150,120 Q155,85 162,52 Q165,38 170,35 Q175,38 172,52 Q165,82 155,108" fill="url(#wrmPlume)" stroke="' + c2 + '" stroke-width="1.2" opacity="0.75"/>' +

                  '<path d="M150,120 Q190,90 220,55 Q228,42 222,35 Q215,32 208,42 Q195,60 170,85 Q160,95 155,105" fill="url(#wrmPlume)" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<path d="M150,120 Q140,95 125,70 Q118,55 122,50 Q128,52 132,65 Q142,88 150,110" fill="' + c1 + '" opacity="0.4"/>' +

                  '<path d="M150,120 Q160,95 175,70 Q182,55 178,50 Q172,52 168,65 Q158,88 150,110" fill="' + c1 + '" opacity="0.4"/>' +

                  '<ellipse cx="135" cy="335" rx="20" ry="8" fill="#78716c" opacity="0.5"/>' +

                  '<ellipse cx="165" cy="340" rx="18" ry="6" fill="#78716c" opacity="0.4"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Plume (Obturaculae)', x: 50, y: 8, desc: 'Bright red feathery plume absorbs hydrogen sulfide, oxygen, and CO₂ from vent water. The red color comes from hemoglobin — same iron-based molecule as in human blood.' },

                { name: 'Chitin Tube', x: 50, y: 55, desc: 'Self-secreted protective tube made of chitin and protein. Can grow over 2 meters tall. The worm can retract completely inside when threatened by predators.' },

                { name: 'Trophosome (internal)', x: 50, y: 40, desc: 'A spongy organ packed with billions of chemosynthetic bacteria. These bacteria convert hydrogen sulfide into organic molecules — the worm\'s sole energy source.' },

                { name: 'No Mouth or Gut', x: 30, y: 30, desc: 'Adult tube worms have no digestive system at all. They rely entirely on their symbiotic bacteria. Nutrients are delivered through the bloodstream.' },

                { name: 'Vestimentiferan Body', x: 35, y: 50, desc: 'Segmented body plan divided into distinct regions. Anchors in the tube using tiny hooks called chaetae. Can grow at rates of 85cm per year — the fastest of any invertebrate.' },

                { name: 'Hydrothermal Vent Base', x: 50, y: 92, desc: 'Lives exclusively at hydrothermal vents where superheated water (up to 400°C) meets near-freezing ocean. Thrives in water containing lethal levels of hydrogen sulfide.' }

              ]

            },

            clownfish_body: {

              label: 'Clownfish (Amphiprioninae)',

              svg: function (w, h, color) {

                var c1 = color || '#f97316', c2 = color || '#c2410c';

                return '<svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="clnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M65,130 Q70,75 115,55 Q155,42 200,45 Q245,42 275,62 Q300,82 310,130 Q300,178 275,198 Q245,218 200,215 Q155,218 115,205 Q70,185 65,130Z" fill="url(#clnG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M120,55 Q118,115 120,205" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.9"/>' +

                  '<path d="M120,55 Q118,115 120,205" stroke="#1e293b" stroke-width="11" fill="none" stroke-linecap="round" opacity="0.2"/>' +

                  '<path d="M230,60 Q228,115 230,200" stroke="white" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.85"/>' +

                  '<path d="M230,60 Q228,115 230,200" stroke="#1e293b" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.18"/>' +

                  '<path d="M310,120 Q335,108 352,95 Q360,92 360,100 Q355,112 340,122 Q355,132 360,145 Q360,152 352,150 Q335,138 310,128" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.9"/>' +

                  '<path d="M175,45 Q180,25 190,15 Q198,12 200,18 Q198,28 192,40" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.8"/>' +

                  '<path d="M200,215 Q205,230 210,238 Q212,242 208,240 Q200,235 200,225" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.7"/>' +

                  '<path d="M95,175 Q80,190 70,198 Q66,200 68,194 Q75,182 88,170" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.8"/>' +

                  '<circle cx="88" cy="115" r="15" fill="white" stroke="#334155" stroke-width="2"/>' +

                  '<circle cx="92" cy="115" r="8" fill="#1e293b"/>' +

                  '<circle cx="95" cy="112" r="3" fill="white" opacity="0.8"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'White Bands', x: 33, y: 22, desc: 'Distinctive vertical white bands bordered by black margins. Band pattern varies by species — 0 to 3 bands. Produced by iridophore cells containing guanine crystals.' },

                { name: 'Rounded Body', x: 50, y: 50, desc: 'Compact, laterally compressed body adapted for quick turns among anemone tentacles. Shape allows rapid darting rather than sustained swimming.' },

                { name: 'Mucus Coating', x: 20, y: 48, desc: 'Special mucus layer prevents anemone stings. Built up gradually through careful acclimation touching. Composition includes sugars that inhibit nematocyst discharge.' },

                { name: 'Rounded Tail', x: 92, y: 48, desc: 'Small, rounded caudal fin for quick maneuvers near host anemone. Clownfish rarely venture far from their home anemone — typically within 1 meter.' },

                { name: 'Protandrous Sex', x: 55, y: 35, desc: 'All clownfish are born male. The dominant individual transitions to female. If the female dies, the next-largest male becomes female.' },

                { name: 'Pectoral Hovering', x: 22, y: 65, desc: 'Rapid pectoral fin waving creates the characteristic hovering motion near the anemone. The constant fluttering also aerates the anemone.' }

              ]

            },

            cichlid: {

              label: 'Cichlid (Cichlidae)',

              svg: function (w, h, color) {

                var c1 = color || '#b45309', c2 = color || '#78350f';

                return '<svg viewBox="0 0 420 280" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="cicG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="60%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="#e7e5e4"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M60,140 Q65,80 105,58 Q150,38 210,40 Q270,38 310,58 Q340,75 355,110 Q365,140 355,170 Q340,205 310,222 Q270,240 210,240 Q150,242 105,222 Q65,200 60,140Z" fill="url(#cicG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M60,140 Q65,180 105,208 Q150,230 210,235 Q270,235 310,218 Q340,200 355,170" fill="' + c2 + '" opacity="0.25"/>' +

                  '<path d="M160,40 Q155,18 165,5 Q180,-5 200,5 Q218,15 230,8 Q240,5 245,12 Q248,22 245,38" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.8"/>' +

                  '<line x1="170" y1="38" x2="175" y2="10" stroke="' + c2 + '" stroke-width="1" opacity="0.4"/>' +

                  '<line x1="190" y1="38" x2="192" y2="8" stroke="' + c2 + '" stroke-width="1" opacity="0.4"/>' +

                  '<line x1="210" y1="38" x2="210" y2="8" stroke="' + c2 + '" stroke-width="1" opacity="0.4"/>' +

                  '<line x1="230" y1="38" x2="235" y2="12" stroke="' + c2 + '" stroke-width="1" opacity="0.4"/>' +

                  '<path d="M355,130 Q380,118 400,100 Q412,92 414,100 Q410,112 395,125 Q410,135 414,148 Q412,156 400,150 Q380,138 355,130" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.9"/>' +

                  '<path d="M355,150 Q380,162 400,180 Q412,188 414,180 Q410,168 395,155" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<path d="M210,238 Q215,258 220,268 Q222,275 218,272 Q210,265 210,252" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<path d="M250,235 Q255,252 260,260 Q262,265 258,262 Q252,256 250,248" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.6"/>' +

                  '<path d="M100,195 Q85,210 75,220 Q70,224 72,218 Q80,205 92,192" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.8"/>' +

                  '<path d="M115,200 Q105,215 95,225 Q90,228 92,222 Q100,210 110,198" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<circle cx="85" cy="120" r="16" fill="white" stroke="#334155" stroke-width="2"/>' +

                  '<circle cx="90" cy="120" r="9" fill="#1e293b"/>' +

                  '<circle cx="93" cy="117" r="3" fill="white" opacity="0.8"/>' +

                  '<path d="M60,136 Q50,132 42,132" stroke="' + c2 + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +

                  '<path d="M60,144 Q52,148 45,150" stroke="' + c2 + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +

                  '<path d="M130,120 L330,120" stroke="' + c2 + '" fill="none" stroke-width="1" stroke-dasharray="6,4" opacity="0.3"/>' +

                  '<circle cx="160" cy="100" r="6" fill="' + c1 + '" opacity="0.15"/>' +

                  '<circle cx="220" cy="90" r="8" fill="' + c1 + '" opacity="0.12"/>' +

                  '<circle cx="280" cy="95" r="7" fill="' + c1 + '" opacity="0.1"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Spiny Dorsal Fin', x: 48, y: 3, desc: 'Long dorsal fin with sharp anterior spines and soft posterior rays. Spines lock erect for defense. Cichlids raise their dorsal to signal aggression.' },

                { name: 'Thick Oval Body', x: 50, y: 50, desc: 'Deep, laterally compressed body provides power for territorial defense. Cichlids are among the most diverse vertebrate families — over 2,000 species.' },

                { name: 'Protrusible Jaw', x: 12, y: 48, desc: 'Pharyngeal jaws in the throat grind food independently of the outer jaw. This dual-jaw system enabled explosive adaptive radiation in African rift lakes.' },

                { name: 'Lateral Line', x: 55, y: 42, desc: 'Sensory canal running head to tail detects water pressure changes. Enables cichlids to sense approaching rivals and fine-tune territorial spacing.' },

                { name: 'Pelvic Fans', x: 25, y: 72, desc: 'Modified pelvic fins used for fanning eggs and signaling. Many cichlids are mouthbrooders — carrying fertilized eggs inside their mouth.' },

                { name: 'Color Patches', x: 40, y: 35, desc: 'Chromatophore-driven color patterns signal mood, dominance, and breeding readiness. Colors intensify during courtship and territorial displays.' }

              ]

            },

            goldfish_body: {

              label: 'Goldfish (Carassius auratus)',

              svg: function (w, h, color) {

                var c1 = color || '#f59e0b', c2 = color || '#d97706';

                return '<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<radialGradient id="gfG" cx="45%" cy="40%"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></radialGradient>' +

                  '<radialGradient id="gfBelly" cx="50%" cy="70%"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="' + c1 + '"/></radialGradient>' +

                  '</defs>' +

                  '<path d="M80,148 Q85,88 120,65 Q160,45 210,48 Q260,45 290,70 Q312,92 318,148 Q312,205 290,228 Q260,250 210,252 Q160,252 120,232 Q85,210 80,148Z" fill="url(#gfG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M80,150 Q85,195 120,220 Q160,242 210,248 Q260,248 290,228 Q312,205 318,150" fill="url(#gfBelly)" opacity="0.35"/>' +

                  '<path d="M318,135 Q345,115 365,90 Q375,78 380,82 Q382,92 375,108 Q362,128 345,140 Q358,148 372,165 Q382,182 380,188 Q375,192 365,180 Q345,158 318,145" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.9"/>' +

                  '<path d="M318,148 Q350,130 370,108" stroke="' + c2 + '" stroke-width="0.6" fill="none" opacity="0.3"/>' +

                  '<path d="M318,148 Q348,158 368,178" stroke="' + c2 + '" stroke-width="0.6" fill="none" opacity="0.3"/>' +

                  '<path d="M180,48 Q178,28 185,15 Q192,8 198,12 Q202,22 198,38" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.8"/>' +

                  '<path d="M210,248 Q215,268 220,278 Q222,285 218,282 Q210,275 210,262" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.75"/>' +

                  '<path d="M240,245 Q248,265 252,275 Q254,280 250,278 Q244,272 242,260" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.65"/>' +

                  '<path d="M115,205 Q100,220 88,230 Q82,234 84,228 Q90,218 105,205" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.8"/>' +

                  '<path d="M130,212 Q120,225 110,232 Q105,234 107,228 Q115,218 125,210" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.7"/>' +

                  '<circle cx="105" cy="125" r="18" fill="white" stroke="#334155" stroke-width="2"/>' +

                  '<circle cx="110" cy="125" r="10" fill="#1e293b"/>' +

                  '<circle cx="113" cy="122" r="3.5" fill="white" opacity="0.8"/>' +

                  '<path d="M80,144 Q70,140 62,140" stroke="' + c2 + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +

                  '<ellipse cx="210" cy="120" rx="40" ry="10" fill="rgba(255,255,255,0.08)" stroke="' + c2 + '" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.4"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Rounded Body', x: 50, y: 48, desc: 'Selectively bred for 1,000+ years to achieve the deep, egg-shaped body. Wild-type carp have streamlined bodies — the round shape is entirely artificial selection.' },

                { name: 'Double Tail Fin', x: 92, y: 45, desc: 'Flowing double or triple caudal fin with delicate membrane. Fancy varieties include butterfly, veil, and fantail. Creates drag but enhances display.' },

                { name: 'Dorsal Fin', x: 45, y: 6, desc: 'Single dorsal fin — absent in some fancy breeds like ranchu. When present, it provides stability during the slow, waddling swim of round-bodied varieties.' },

                { name: 'Pharyngeal Teeth', x: 18, y: 48, desc: 'Teeth in the throat (not the mouth) crush food. Goldfish are omnivorous bottom-feeders that naturally root through substrate for insect larvae.' },

                { name: 'Lateral Line', x: 55, y: 40, desc: 'Pressure-sensing canal line. Goldfish have excellent senses — they can distinguish individual humans and learn to respond to feeding cues within days.' },

                { name: 'Operculum', x: 22, y: 52, desc: 'Bony gill cover pumps water over the gills. Goldfish are cold-water fish with a remarkable temperature range (2-30°C) and can survive brief oxygen deprivation.' }

              ]

            },

            swordfish_body: {

              label: 'Billfish (Xiphiidae)',

              svg: function (w, h, color) {

                var c1 = color || '#475569', c2 = color || '#1e293b';

                return '<svg viewBox="0 0 500 220" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="swdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="55%" stop-color="' + c2 + '"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M15,108 L85,102" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round"/>' +

                  '<path d="M15,112 L85,112" stroke="' + c1 + '" stroke-width="3" stroke-linecap="round" opacity="0.6"/>' +

                  '<path d="M80,110 Q90,78 120,65 Q160,50 220,52 Q290,50 340,60 Q375,72 395,90 Q410,105 412,110 Q410,118 395,132 Q375,148 340,160 Q290,170 220,168 Q160,170 120,155 Q90,142 80,110Z" fill="url(#swdG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M80,110 Q90,135 120,150 Q160,165 220,168 Q290,168 340,158 Q375,148 395,132" fill="#cbd5e1" opacity="0.3"/>' +

                  '<path d="M240,52 Q238,30 245,15 Q252,5 260,8 Q265,15 264,30 Q262,45 258,55" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<path d="M412,105 Q435,92 455,75 Q465,68 468,72 Q468,82 458,95 Q445,108 435,112 Q445,115 458,128 Q468,142 468,148 Q465,152 455,145 Q435,130 412,118" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.9"/>' +

                  '<line x1="445" y1="82" x2="445" y2="140" stroke="' + c2 + '" stroke-width="0.6" opacity="0.4"/>' +

                  '<line x1="455" y1="78" x2="455" y2="142" stroke="' + c2 + '" stroke-width="0.5" opacity="0.3"/>' +

                  '<path d="M220,168 Q225,182 228,190 Q230,195 226,194 Q220,188 220,178" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.65"/>' +

                  '<path d="M130,148 Q118,162 108,170 Q104,172 106,166 Q112,156 125,145" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<circle cx="95" cy="102" r="10" fill="white" stroke="#334155" stroke-width="1.5"/>' +

                  '<circle cx="98" cy="102" r="5.5" fill="#1e293b"/>' +

                  '<circle cx="100" cy="100" r="2" fill="white" opacity="0.7"/>' +

                  '<path d="M130,85 L350,85" stroke="' + c2 + '" fill="none" stroke-width="0.8" stroke-dasharray="5,4" opacity="0.25"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Bill / Rostrum', x: 5, y: 48, desc: 'Elongated upper jaw forms a flat, sword-like bill. Used to slash through schools of fish, stunning prey. Can reach speeds of 100 km/h — one of the fastest fish.' },

                { name: 'Streamlined Torpedo', x: 50, y: 50, desc: 'Supremely hydrodynamic body with minimal drag coefficient. Skin secretes an oil that further reduces friction. Built for sustained high-speed pursuit.' },

                { name: 'Crescent Tail', x: 92, y: 42, desc: 'Deeply forked, crescent-shaped (lunate) caudal fin is the hallmark of high-speed pelagic fish. Generates maximum thrust with minimal turbulence.' },

                { name: 'Tall Dorsal', x: 52, y: 5, desc: 'Large, sail-like first dorsal fin folds into a groove for speed. When raised, it stabilizes turns and can be used to herd prey fish.' },

                { name: 'Lateral Keel', x: 30, y: 38, desc: 'Bony ridge on the caudal peduncle reduces drag during tail beats. Combined with counter-current heat exchangers, allows warm-blooded muscle operation.' },

                { name: 'Large Eye', x: 20, y: 45, desc: 'Enormous eyes with specialized heating organs keep them warm. Heated eyes process visual information faster — critical for high-speed pursuit in cold deep water.' }

              ]

            },

            corydoras: {

              label: 'Corydoras Catfish (Callichthyidae)',

              svg: function (w, h, color) {

                var c1 = color || '#a78bfa', c2 = color || '#7c3aed';

                return '<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">' +

                  '<defs>' +

                  '<linearGradient id="coryG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient>' +

                  '</defs>' +

                  '<path d="M70,120 Q75,78 115,60 Q155,48 205,50 Q255,48 290,62 Q315,78 325,105 Q330,120 325,142 Q315,168 290,182 Q255,195 205,195 Q155,198 115,185 Q75,168 70,120Z" fill="url(#coryG)" stroke="' + c2 + '" stroke-width="2.5"/>' +

                  '<path d="M70,125 Q75,155 115,175 Q155,190 205,192 Q255,192 290,180 Q315,165 325,140" fill="' + c2 + '" opacity="0.25"/>' +

                  '<path d="M100,90 Q120,85 160,82 Q200,80 240,82 Q280,85 300,90" fill="none" stroke="' + c2 + '" stroke-width="3" stroke-linecap="round" opacity="0.35"/>' +

                  '<path d="M105,98 Q130,92 170,90 Q210,88 250,90 Q280,92 295,98" fill="none" stroke="' + c2 + '" stroke-width="2" stroke-linecap="round" opacity="0.25"/>' +

                  '<path d="M80,112 Q55,108 35,112 Q28,116 32,120 Q38,122 52,118" stroke="' + c2 + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +

                  '<path d="M78,120 Q58,118 42,122 Q36,126 40,130 Q48,130 58,126" stroke="' + c2 + '" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>' +

                  '<path d="M80,128 Q62,128 48,132 Q42,136 46,138 Q52,138 62,134" stroke="' + c2 + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.6"/>' +

                  '<path d="M185,50 Q182,30 188,18 Q195,12 200,16 Q202,24 198,38" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.8"/>' +

                  '<line x1="190" y1="48" x2="193" y2="20" stroke="' + c2 + '" stroke-width="0.8" opacity="0.4"/>' +

                  '<path d="M325,115 Q345,108 358,98 Q365,95 365,102 Q360,112 348,118 Q358,125 365,135 Q365,142 358,140 Q345,132 325,125" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.5" opacity="0.85"/>' +

                  '<path d="M205,195 Q208,210 212,218 Q214,222 210,220 Q205,215 205,205" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1" opacity="0.65"/>' +

                  '<path d="M120,178 Q108,192 98,200 Q94,202 96,196 Q102,186 115,175" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="1.2" opacity="0.7"/>' +

                  '<ellipse cx="95" cy="105" rx="12" ry="10" fill="white" stroke="#334155" stroke-width="1.5"/>' +

                  '<circle cx="98" cy="104" r="5.5" fill="#1e293b"/>' +

                  '<circle cx="100" cy="102" r="2" fill="white" opacity="0.8"/>' +

                  '</svg>';

              },

              parts: [

                { name: 'Barbels (3 pairs)', x: 10, y: 48, desc: 'Sensitive whisker-like organs around the mouth packed with taste buds. Used to probe substrate for buried worms, larvae, and detritus in murky Amazonian streams.' },

                { name: 'Bony Scute Armor', x: 30, y: 35, desc: 'Two rows of overlapping bony plates (scutes) instead of scales. Provides excellent armor — most predators avoid them. Plates are visible as ridged lines along the flanks.' },

                { name: 'Dorsal Spine', x: 47, y: 5, desc: 'Sharp, lockable dorsal spine that can pierce predator mouths. Some species secrete a mild venom. The spine locks rigid with a ratchet mechanism.' },

                { name: 'Flat Belly', x: 50, y: 78, desc: 'Ventrally flattened body profile for bottom-dwelling. Corydoras spend most of their time rooting through substrate — they are the cleanup crew of freshwater tanks.' },

                { name: 'Intestinal Breathing', x: 65, y: 55, desc: 'Can gulp air at the surface and absorb oxygen through a modified intestine. This adaptation allows survival in warm, stagnant Amazonian pools with near-zero dissolved oxygen.' },

                { name: 'Adipose Fin', x: 80, y: 30, desc: 'A small, fleshy fin between dorsal and tail — a telltale sign shared with tetras, catfish, and salmon. Its function remains debated among ichthyologists.' }

              ]

            }

          };



          // Map each species to its body plan

          var SPECIES_BODY_MAP = {

            neon: 'tetra', guppy: 'guppy_body', cory: 'corydoras', angel: 'angelfish', platy: 'fish', molly: 'fish',

            cardinal: 'tetra', rummy: 'tetra', oto: 'corydoras', betta: 'betta',

            clown: 'clownfish_body', tang: 'fish', goby: 'fish',

            oscar: 'cichlid', pike: 'cichlid', pleco: 'corydoras',

            goldfish: 'goldfish_body', rockfish: 'cichlid',

            archer: 'fish', puffer: 'pufferfish', mudskip: 'fish',

            anemone: 'sea_anemone',

            shrimp: 'crustacean', cleaner: 'crustacean', crab: 'crustacean', amphipod: 'crustacean',

            starfish: 'echinoderm', seastar: 'echinoderm', urchin: 'echinoderm', seacucumber: 'echinoderm',

            slider: 'chelonian', turtle: 'chelonian',

            clownfish: 'clownfish_body', dolphin: 'cetacean', jellyfish: 'jellyfish', squid: 'cephalopod',

            hatchetfish: 'fish', swordfish: 'swordfish_body', anglerfish: 'anglerfish_plan', gulpereel: 'eel',

            giantsquid: 'cephalopod', tubeworms: 'worm', snailfish: 'fish',

            mantaray: 'ray', bluewhale: 'whale', seahorse: 'seahorse',

            octopus: 'cephalopod', nautilus: 'cephalopod', coelacanth: 'fish'

          };



          // Per-species colors for unique anatomy close-ups

          var SPECIES_COLORS = {

            // ── Freshwater ──

            neon: '#38bdf8',     // electric blue stripe

            guppy: '#f97316',    // orange/rainbow

            cory: '#a78bfa',     // pale lavender

            angel: '#fbbf24',    // gold/silver

            platy: '#fb923c',    // orange-red

            molly: '#334155',    // dark slate (visible at small sizes)

            // ── Planted ──

            cardinal: '#dc2626', // deep red stripe

            rummy: '#ef4444',    // red nose accent

            oto: '#84cc16',      // olive/green

            shrimp: '#e11d48',   // cherry red

            betta: '#7c3aed',    // royal purple

            // ── Reef ──

            clown: '#f97316',    // orange clownfish

            tang: '#3b82f6',     // royal blue

            goby: '#14b8a6',     // teal/aqua

            anemone: '#ec4899',  // pink/magenta

            cleaner: '#ef4444',  // red/white stripe

            // ── Predator ──

            oscar: '#b45309',    // dark orange/brown tiger

            pike: '#4d7c0f',     // forest green

            pleco: '#57534e',    // dark brown armor

            // ── Turtle & Reptile ──

            slider: '#16a34a',   // green shell

            turtle: '#15803d',   // deep green

            goldfish: '#f59e0b', // classic gold

            // ── Invertebrate Reef ──

            crab: '#dc2626',     // red crab

            urchin: '#6b21a8',   // dark purple spines

            starfish: '#f97316', // orange starfish

            seastar: '#ef4444',  // red seastar

            // ── Cold Water ──

            rockfish: '#9f1239', // vermillion rockfish

            kelp: '#15803d',     // dark green

            // ── Brackish ──

            archer: '#c2410c',   // amber/brown bands

            puffer: '#eab308',   // yellow puffer

            mudskip: '#713f12',  // muddy brown

            // ── Marine Science species ──

            clownfish: '#f97316',  // orange

            dolphin: '#64748b',   // grey

            jellyfish: '#c084fc', // translucent purple

            squid: '#ec4899',     // pink/bioluminescent

            hatchetfish: '#94a3b8', // silver

            swordfish: '#475569', // steel blue-grey

            anglerfish: '#1c1917', // deep black

            gulpereel: '#292524', // near-black

            giantsquid: '#881337', // dark crimson

            tubeworms: '#dc2626', // red plume

            snailfish: '#cbd5e1', // pale/translucent

            mantaray: '#1e293b', // dark navy

            bluewhale: '#3b82f6', // blue

            seahorse: '#f59e0b', // golden yellow

            octopus: '#7c3aed',  // purple

            nautilus: '#b45309', // amber/brown shell

            coelacanth: '#1e3a5f', // deep steel blue

            amphipod: '#f87171',  // pale red

            seacucumber: '#854d0e' // brown

          };



          // Species-specific anatomy overrides and extra info

          var SPECIES_ANATOMY = {

            mudskip: { override: 'Modified pectoral fins act as legs. Can breathe through skin and oral lining when on land.', locomotion: 'Uses pectoral fins to "walk" and "skip" across mud. Can also climb roots.' },

            betta: { override: 'Has a labyrinth organ that allows breathing atmospheric air directly — can survive in low-oxygen water.', locomotion: 'Flowing fins create drag; bettas are slow but agile swimmers using sculling pectoral fins.' },

            seahorse: { override: 'Swims upright using a tiny dorsal fin that beats 35 times per second. Prehensile tail grips substrates.', locomotion: 'The worst swimmer in the ocean — relies on rapid dorsal fin oscillation and steers with pectoral fins.' },

            anglerfish: { override: 'The bioluminescent lure (esca) contains symbiotic bacteria. Males fuse permanently to females, sharing blood supply.', locomotion: 'Slow ambush predator. Uses modified pectoral fins to "walk" on the seafloor.' },

            puffer: { override: 'Can inflate body by swallowing water rapidly. Many species contain tetrodotoxin — 1200x more toxic than cyanide.', locomotion: 'Slow swimmer using pectoral and dorsal fin sculling. Sacrifices speed for defensive inflation ability.' },

            mantaray: { override: 'Cephalic fins funnel plankton into mouth. Largest brain-to-body ratio of any fish. Recognized individual humans.', locomotion: 'Underwater flight — flaps wing-like pectoral fins. Can breach completely out of the water.' },

            coelacanth: { override: 'Lobed fins move in alternating pattern like tetrapod limbs — may represent step in fish-to-land transition.', locomotion: 'Slow drift feeder. Uses lobed fins in a unique "walking" pattern not seen in other living fish.' },

            nautilus: { override: 'Shell chambers filled with gas for buoyancy control. Has 90+ tentacles with no suckers — uses sticky ridges.', locomotion: 'Jet propulsion via siphon. Can withdraw completely into shell and seal with a leathery hood.' },

            clown: { override: 'Mucus coating prevents anemone stings. All born male — the dominant fish transitions to female (sequential hermaphroditism).', locomotion: 'Rapid pectoral fin waving for hovering near host anemone. Rarely strays far from home.' },

            slider: { override: 'Basking behavior critical for thermoregulation and vitamin D synthesis. Can brumate (hibernate) underwater for months.', locomotion: 'Powerful rear leg kicks propel through water. On land, uses all four legs in a characteristic waddle.' }

          };



          // ── Per-species display sizes (proportional to real-world size) ──

          var SPECIES_DISPLAY_SIZE = {

            // Freshwater

            neon: { w: 30, h: 22, emoji: 18 }, guppy: { w: 32, h: 24, emoji: 20 },

            cory: { w: 38, h: 28, emoji: 22 }, angel: { w: 52, h: 44, emoji: 28 },

            platy: { w: 32, h: 24, emoji: 20 }, molly: { w: 40, h: 30, emoji: 22 },

            // Planted

            cardinal: { w: 30, h: 22, emoji: 18 }, rummy: { w: 30, h: 22, emoji: 18 },

            oto: { w: 28, h: 20, emoji: 18 }, shrimp: { w: 24, h: 18, emoji: 16 },

            betta: { w: 48, h: 36, emoji: 26 },

            // Reef

            clown: { w: 42, h: 32, emoji: 24 }, tang: { w: 56, h: 40, emoji: 30 },

            goby: { w: 36, h: 26, emoji: 22 }, anemone: { w: 50, h: 50, emoji: 32 },

            // Predator

            oscar: { w: 72, h: 52, emoji: 38 }, pike: { w: 64, h: 44, emoji: 34 },

            pleco: { w: 68, h: 46, emoji: 36 },

            // Turtle

            slider: { w: 70, h: 55, emoji: 40 }, goldfish: { w: 48, h: 36, emoji: 28 },

            // Invert

            cleaner: { w: 28, h: 20, emoji: 18 }, urchin: { w: 34, h: 34, emoji: 24 },

            crab: { w: 30, h: 24, emoji: 20 }, starfish: { w: 42, h: 42, emoji: 30 },

            // Cold Water

            rockfish: { w: 58, h: 42, emoji: 32 }, seastar: { w: 50, h: 50, emoji: 36 },

            kelp: { w: 24, h: 60, emoji: 28 },

            // Brackish

            archer: { w: 50, h: 36, emoji: 28 }, puffer: { w: 44, h: 38, emoji: 26 },

            mudskip: { w: 42, h: 30, emoji: 24 }

          };



          // ── Tank SVG mini-renderer — uses close-up body plan SVGs as miniatures in the tank ──

          var getTankSvg = function (speciesId) {

            var bodyKey = SPECIES_BODY_MAP[speciesId];

            var plan = bodyKey && BODY_PLANS[bodyKey];

            if (!plan || !plan.svg) return null;

            var color = SPECIES_COLORS[speciesId] || null;

            var ds = SPECIES_DISPLAY_SIZE[speciesId] || { w: 52, h: 38 };

            return plan.svg(ds.w, ds.h, color);

          };



          // ── Anatomy viewer state ──

          var viewingAnatomy = d.viewingAnatomy || null;

          var anatomyHighlight = d.anatomyHighlight != null ? d.anatomyHighlight : null;



          var openAnatomy = function (speciesId) {

            updMulti({ viewingAnatomy: speciesId, anatomyHighlight: null });

          };

          var closeAnatomy = function () {

            updMulti({ viewingAnatomy: null, anatomyHighlight: null });

          };



          var TANK_TYPES = [



            { id: 'freshwater', name: '🐠 Freshwater Community', size: 20, temp: 76, salinity: 0, pH: 7.0, diff: 1, desc: 'Classic beginner setup with tetras, guppies, and corydoras.' },

            { id: 'planted', name: '🌿 Planted Tropical', size: 40, temp: 78, salinity: 0, pH: 6.8, diff: 2, desc: 'Lush aquascape with live plants and small schooling fish.' },

            { id: 'reef', name: '🐡 Saltwater Reef', size: 55, temp: 78, salinity: 35, pH: 8.2, diff: 3, desc: 'Vibrant coral reef with clownfish and anemones.' },

            { id: 'predator', name: '🦈 Predator Tank', size: 75, temp: 76, salinity: 0, pH: 7.2, diff: 3, desc: 'Oscars, pike cichlids, and other large predatory fish.' },

            { id: 'turtle', name: '🐢 Turtle & Reptile', size: 40, temp: 80, salinity: 0, pH: 7.5, diff: 2, desc: 'Basking dock, UVB lighting, and hardy companion fish.' },

            { id: 'invert', name: '🦐 Invertebrate Reef', size: 30, temp: 77, salinity: 35, pH: 8.3, diff: 4, desc: 'Shrimp, crabs, urchins, and delicate corals.' },

            { id: 'coldwater', name: '🐧 Cold Water Marine', size: 100, temp: 55, salinity: 34, pH: 8.1, diff: 4, desc: 'Kelp forest ecosystem with rockfish and sea stars.' },

            { id: 'brackish', name: '🔬 Brackish Estuary', size: 30, temp: 75, salinity: 15, pH: 7.8, diff: 3, desc: 'Where river meets sea — archerfish, puffers, mudskippers.' }

          ];



          var SPECIES_BY_TANK = {

            freshwater: [

              { id: 'neon', name: 'Neon Tetra', icon: '🐟', load: 1, minTank: 10, tempRange: [72, 80], pHRange: [6.0, 7.5], compat: ['guppy', 'cory', 'platy'], diet: 'Micro-omnivore — brine shrimp, daphnia, and crushed flake food', habitat: 'Shaded blackwater streams in the Amazon basin among submerged roots and leaf litter', fact: 'Their iridescent stripe is made of guanine crystals.' },

              { id: 'guppy', name: 'Guppy', icon: '🐠', load: 1, minTank: 5, tempRange: [72, 82], pHRange: [6.8, 7.8], compat: ['neon', 'cory', 'platy', 'molly'], diet: 'Omnivore — algae, mosquito larvae, micro-worms, and flake food', habitat: 'Warm, slow-moving streams and pools in Trinidad, Venezuela, and northeast Brazil', fact: 'Males display vibrant colors to attract females.' },

              { id: 'cory', name: 'Corydoras', icon: '🐡', load: 2, minTank: 15, tempRange: [72, 79], pHRange: [6.0, 7.5], compat: ['neon', 'guppy', 'platy', 'angel'], diet: 'Bottom-feeder — sinking pellets, bloodworms, and organic detritus from the substrate', habitat: 'Sandy-bottomed, slow-flowing tributaries of the Amazon and Orinoco basins', fact: 'They breathe air by darting to the surface!' },

              { id: 'angel', name: 'Angelfish', icon: '🐠', load: 4, minTank: 20, tempRange: [76, 84], pHRange: [6.0, 7.5], compat: ['cory'], diet: 'Predatory omnivore — small fish, insects, worms, and vegetable matter', habitat: 'Deep, quiet, vegetated floodplains and slow tributaries of the central Amazon', fact: 'Angelfish are cichlids — they guard their eggs fiercely.' },

              { id: 'platy', name: 'Platy', icon: '🐠', load: 1, minTank: 10, tempRange: [70, 80], pHRange: [7.0, 8.2], compat: ['neon', 'guppy', 'cory', 'molly'], diet: 'Omnivore — algae, blanched vegetables, and small invertebrates', habitat: 'Warm, spring-fed streams and drainage ditches in southern Mexico and Guatemala', fact: 'Platys are livebearers — they give birth to free-swimming fry.' },

              { id: 'molly', name: 'Molly', icon: '🐟', load: 2, minTank: 15, tempRange: [72, 82], pHRange: [7.0, 8.5], compat: ['guppy', 'platy'], diet: 'Herbivore-leaning omnivore — algae films, spirulina, and occasional insect larvae', habitat: 'Brackish coastal lagoons, mangrove swamps, and freshwater streams from Mexico to Colombia', fact: 'Mollies can survive in both fresh and saltwater!' }

            ],

            planted: [

              { id: 'cardinal', name: 'Cardinal Tetra', icon: '🐟', load: 1, minTank: 10, tempRange: [73, 81], pHRange: [5.5, 7.0], compat: ['rummy', 'oto', 'shrimp'], diet: 'Micro-predator — tiny crustaceans, insect larvae, and fine flake food', habitat: 'Tea-stained blackwater streams of the Rio Negro basin under dense rainforest canopy', fact: 'Cardinals have a deeper red stripe than neons.' },

              { id: 'rummy', name: 'Rummynose Tetra', icon: '🐟', load: 1, minTank: 15, tempRange: [75, 82], pHRange: [5.5, 7.0], compat: ['cardinal', 'oto', 'shrimp'], diet: 'Omnivore — micro-crustaceans, fallen fruit particles, and algae', habitat: 'Soft, acidic tributaries of the Amazon and Rio Meta with sandy substrates', fact: 'Their red nose fades when stressed — a living water quality indicator!' },

              { id: 'oto', name: 'Otocinclus', icon: '🐡', load: 1, minTank: 10, tempRange: [72, 79], pHRange: [6.0, 7.5], compat: ['cardinal', 'rummy', 'shrimp', 'betta'], diet: 'Herbivore — biofilm, soft green algae, and blanched zucchini', habitat: 'Shallow, sunlit, plant-rich margins of South American rivers with moderate current', fact: 'These tiny catfish are the best algae cleaners in the hobby.' },

              { id: 'shrimp', name: 'Cherry Shrimp', icon: '🦐', load: 0.5, minTank: 5, tempRange: [68, 78], pHRange: [6.5, 8.0], compat: ['cardinal', 'rummy', 'oto'], diet: 'Detritivore — biofilm, decaying plant matter, algae, and microorganisms', habitat: 'Densely vegetated freshwater streams and ponds in Taiwan', fact: 'A colony can double in size every 2-3 months.' },

              { id: 'betta', name: 'Betta', icon: '🐠', load: 2, minTank: 5, tempRange: [76, 82], pHRange: [6.5, 7.5], compat: ['oto'], diet: 'Insectivore — mosquito larvae, small insects, daphnia, and brine shrimp', habitat: 'Shallow rice paddies, stagnant ponds, and floodplains of Thailand and Cambodia', fact: 'Bettas build bubble nests at the surface for their eggs.' }

            ],

            reef: [

              { id: 'clown', name: 'Clownfish', icon: '🐠', load: 3, minTank: 20, tempRange: [75, 82], pHRange: [8.0, 8.4], compat: ['tang', 'goby', 'anemone'], diet: 'Omnivore — algae, zooplankton, and leftover scraps from its host anemone', habitat: 'Shelters among venomous tentacles of Heteractis anemones on Indo-Pacific reefs', fact: 'All clownfish are born male — the dominant one becomes female!' },

              { id: 'tang', name: 'Blue Tang', icon: '🐠', load: 5, minTank: 55, tempRange: [75, 82], pHRange: [8.0, 8.4], compat: ['clown', 'goby'], diet: 'Herbivore — filamentous algae and seaweed, essential for reef health', habitat: 'Coral-rich outer reef slopes and lagoons throughout the Indo-Pacific', fact: 'Blue tangs can "play dead" when stressed, lying on their side.' },

              { id: 'goby', name: 'Watchman Goby', icon: '🐡', load: 2, minTank: 20, tempRange: [75, 82], pHRange: [8.0, 8.4], compat: ['clown', 'tang', 'anemone'], diet: 'Micro-predator — copepods, mysis shrimp, and sand-dwelling invertebrates', habitat: 'Sandy rubble zones adjacent to coral reefs, often sharing a burrow with a pistol shrimp', fact: 'Gobies form symbiotic partnerships with pistol shrimp.' },

              { id: 'anemone', name: 'Sea Anemone', icon: '🪸', load: 3, minTank: 30, tempRange: [76, 82], pHRange: [8.1, 8.4], compat: ['clown', 'goby'], diet: 'Carnivore — captures small fish and shrimp with nematocyst-armed tentacles; also hosts photosynthetic zooxanthellae', habitat: 'Well-lit, current-swept sections of tropical reefs in the Indo-Pacific', fact: 'Anemones can live over 100 years in the right conditions.' }

            ],

            predator: [

              { id: 'oscar', name: 'Oscar', icon: '🐠', load: 10, minTank: 55, tempRange: [74, 81], pHRange: [6.0, 8.0], compat: ['pleco'], diet: 'Carnivore — crayfish, insects, small fish, and earthworms', habitat: 'Slow-moving, white-water rivers and flooded forests of the Amazon, Orinoco, and Paraná basins', fact: 'Oscars recognize their owners and can learn tricks.' },

              { id: 'pike', name: 'Pike Cichlid', icon: '🐡', load: 8, minTank: 55, tempRange: [75, 82], pHRange: [6.0, 7.5], compat: ['pleco'], diet: 'Aggressive piscivore — ambushes fish, large insects, and crustaceans', habitat: 'Submerged logs and undercut banks in fast-flowing Amazonian creeks', fact: 'Pike cichlids are ambush predators that strike in milliseconds.' },

              { id: 'pleco', name: 'Plecostomus', icon: '🐡', load: 6, minTank: 40, tempRange: [72, 82], pHRange: [6.5, 7.5], compat: ['oscar', 'pike'], diet: 'Omnivorous grazer — rasps algae and biofilm off rocks; also eats driftwood and sinking wafers', habitat: 'Rocky rapids and submerged driftwood in tropical South American rivers', fact: 'Some plecos can grow over 2 feet long!' }

            ],

            turtle: [

              { id: 'slider', name: 'Red-Eared Slider', icon: '🐢', load: 15, minTank: 40, tempRange: [75, 85], pHRange: [6.5, 8.0], compat: ['goldfish'], diet: 'Omnivore — aquatic plants, snails, insects, and commercial turtle pellets; diet shifts to more vegetation with age', habitat: 'Calm ponds, lakes, and slow streams with muddy bottoms and basking logs in the southern United States', fact: 'They can hold their breath for over 30 minutes!' },

              { id: 'goldfish', name: 'Feeder Goldfish', icon: '🐠', load: 3, minTank: 20, tempRange: [65, 75], pHRange: [7.0, 8.4], compat: ['slider'], diet: 'Omnivore — algae, aquatic plants, detritus, small invertebrates, and prepared pellets', habitat: 'Cool, slow-moving freshwater ponds and rivers; originally domesticated from wild carp in East Asia', fact: 'Goldfish can live 20+ years with proper care.' }

            ],

            invert: [

              { id: 'cleaner', name: 'Cleaner Shrimp', icon: '🦐', load: 1, minTank: 10, tempRange: [75, 82], pHRange: [8.0, 8.4], compat: ['urchin', 'crab', 'starfish'], diet: 'Ectoparasite feeder — removes parasites, dead skin, and mucus from visiting reef fish', habitat: 'Coral ledges and reef crevices throughout the Indo-Pacific where it establishes cleaning stations', fact: 'They set up cleaning stations where fish line up to be groomed!' },

              { id: 'urchin', name: 'Sea Urchin', icon: '🦔', load: 2, minTank: 20, tempRange: [72, 78], pHRange: [8.0, 8.4], compat: ['cleaner', 'crab', 'starfish'], diet: 'Herbivore — rasps coralline and filamentous algae off rocks using a five-toothed jaw called Aristotle\'s lantern', habitat: 'Rocky subtidal reef zones and kelp forests in temperate and tropical seas', fact: 'Urchin spines are actually modified teeth.' },

              { id: 'crab', name: 'Hermit Crab', icon: '🦀', load: 2, minTank: 10, tempRange: [72, 80], pHRange: [8.0, 8.4], compat: ['cleaner', 'urchin', 'starfish'], diet: 'Scavenger/omnivore — detritus, algae, leftover food scraps, and small worms', habitat: 'Intertidal rock pools and shallow coral rubble zones in tropical seas', fact: 'Hermit crabs form "vacancy chains" — swapping shells in order of size!' },

              { id: 'starfish', name: 'Sea Star', icon: '⭐', load: 3, minTank: 20, tempRange: [72, 78], pHRange: [8.0, 8.4], compat: ['cleaner', 'urchin', 'crab'], diet: 'Predator — everts its stomach to digest mussels, clams, and oysters externally', habitat: 'Rocky intertidal zones to deep reef slopes in nearly every ocean', fact: 'Sea stars can regenerate lost arms — and sometimes an entire body from one arm.' }

            ],

            coldwater: [

              { id: 'rockfish', name: 'Rockfish', icon: '🐡', load: 5, minTank: 55, tempRange: [50, 60], pHRange: [7.8, 8.4], compat: ['seastar', 'kelp'], diet: 'Ambush predator — small fish, shrimp, and planktonic crustaceans near rocky structure', habitat: 'Deep rocky reefs and kelp forests along the Pacific coast of North America', fact: 'Some rockfish live over 200 years!' },

              { id: 'seastar', name: 'Sunflower Star', icon: '⭐', load: 4, minTank: 40, tempRange: [48, 58], pHRange: [7.8, 8.4], compat: ['rockfish', 'kelp'], diet: 'Voracious predator — sea urchins, clams, snails, and other sea stars', habitat: 'Kelp forests and rocky reefs from Alaska to Baja California, critical for controlling urchin populations', fact: 'Sunflower stars have up to 24 arms and can move 1 meter per minute.' },

              { id: 'kelp', name: 'Giant Kelp', icon: '🌿', load: 1, minTank: 30, tempRange: [50, 65], pHRange: [7.5, 8.5], compat: ['rockfish', 'seastar'], diet: 'Photosynthetic autotroph — converts sunlight, CO₂, and dissolved nutrients into biomass', habitat: 'Cool, nutrient-rich, sunlit coastal waters from 6-30m depth along temperate coastlines', fact: 'Giant kelp can grow up to 2 feet per day!' }

            ],

            brackish: [

              { id: 'archer', name: 'Archerfish', icon: '🐠', load: 3, minTank: 20, tempRange: [72, 82], pHRange: [7.0, 8.5], compat: ['puffer', 'mudskip'], diet: 'Insectivore — shoots down terrestrial insects with precisely aimed jets of water', habitat: 'Mangrove-lined estuaries, brackish creeks, and river mouths across Southeast Asia and northern Australia', fact: 'Archerfish shoot jets of water to knock insects off branches!' },

              { id: 'puffer', name: 'Figure-8 Puffer', icon: '🐡', load: 4, minTank: 15, tempRange: [72, 79], pHRange: [7.5, 8.5], compat: ['archer'], diet: 'Molluscivore — crunches snails, clams, and crustacean shells to keep its fused beak trimmed', habitat: 'Brackish river deltas and coastal mangroves of Southeast Asia, especially in Thailand and Borneo', fact: 'Puffers need to crunch hard-shelled food to keep their beaks trimmed.' },

              { id: 'mudskip', name: 'Mudskipper', icon: '🐸', load: 3, minTank: 20, tempRange: [75, 86], pHRange: [7.0, 8.5], compat: ['archer'], diet: 'Opportunistic omnivore — insects, small crabs, algae, and detritus from mudflats', habitat: 'Intertidal mudflats and mangrove forests of the Indo-Pacific, spending much of its time on land', fact: 'Mudskippers are fish that can walk on land and breathe air!' }

            ]

          };



          // ═══ PLANT SPECIES CATALOG ═══

          // Each plant has real aquatic properties that affect the ecosystem simulation

          var PLANT_SPECIES = {

            freshwater: [

              { id: 'java_fern', name: 'Java Fern', icon: '🌿', o2: 0.3, co2Need: 0.2, nitrateAbsorb: 0.2, light: 'low', growth: 0.02, maxSize: 3, desc: 'Hardy epiphyte — attaches to rocks and driftwood. Thrives in low light. Absorbs nutrients through leaves, not roots.', fact: 'Java Fern reproduces by growing tiny plantlets on its leaves!' },

              { id: 'amazon_sword', name: 'Amazon Sword', icon: '🌱', o2: 0.8, co2Need: 0.5, nitrateAbsorb: 0.7, light: 'medium', growth: 0.05, maxSize: 5, desc: 'Large rosette plant with broad leaves. Heavy root feeder — needs nutrient-rich substrate. Excellent nitrate absorber.', fact: 'A single Amazon Sword can grow over 20 inches tall and consume enormous amounts of nitrate.' },

              { id: 'java_moss', name: 'Java Moss', icon: '🌿', o2: 0.2, co2Need: 0.15, nitrateAbsorb: 0.3, light: 'low', growth: 0.06, maxSize: 4, desc: 'Versatile moss that carpets surfaces. Provides hiding spots for fry and shrimp. Nearly indestructible.', fact: 'Java Moss can survive in almost any water conditions and even grow emersed above water.' },

              { id: 'hornwort', name: 'Hornwort', icon: '🌿', o2: 1.0, co2Need: 0.4, nitrateAbsorb: 0.9, light: 'medium', growth: 0.08, maxSize: 6, desc: 'Fast-growing floating/anchored stem plant. Champion nitrate absorber and oxygenator. Can grow 1-5 inches per week.', fact: 'Hornwort releases allelopathic chemicals that actively inhibit algae growth!' },

              { id: 'anubias', name: 'Anubias', icon: '🍀', o2: 0.2, co2Need: 0.1, nitrateAbsorb: 0.15, light: 'low', growth: 0.01, maxSize: 3, desc: 'Extremely slow-growing but nearly unkillable. Thick, waxy leaves resist algae and herbivorous fish.', fact: 'Anubias grows so slowly that algae often colonizes its leaves before new ones emerge.' },

              { id: 'water_wisteria', name: 'Water Wisteria', icon: '🌿', o2: 0.7, co2Need: 0.4, nitrateAbsorb: 0.6, light: 'medium', growth: 0.07, maxSize: 5, desc: 'Fast-growing stem plant with finely divided leaves. Excellent for absorbing excess nutrients and preventing algae.', fact: 'Water Wisteria leaf shape changes dramatically based on whether it grows submerged or above water.' },

              { id: 'duckweed', name: 'Duckweed', icon: '🟢', o2: 0.5, co2Need: 0.1, nitrateAbsorb: 0.8, light: 'high', growth: 0.1, maxSize: 8, desc: 'Tiny floating plant that doubles in mass every 2-3 days. Absorbs nitrate voraciously but blocks light to plants below.', fact: 'Duckweed is the fastest-growing flowering plant on Earth — used in wastewater treatment worldwide.' }

            ],

            planted: [

              { id: 'dwarf_hairgrass', name: 'Dwarf Hairgrass', icon: '🌾', o2: 0.5, co2Need: 0.7, nitrateAbsorb: 0.4, light: 'high', growth: 0.04, maxSize: 3, desc: 'Carpet-forming grass that creates lush green lawns. Requires high CO2 and bright light to thrive.', fact: 'Dwarf Hairgrass sends out runners underground, forming a dense carpet over weeks.' },

              { id: 'red_root_floater', name: 'Red Root Floater', icon: '🔴', o2: 0.4, co2Need: 0.1, nitrateAbsorb: 0.5, light: 'high', growth: 0.06, maxSize: 4, desc: 'Floating plant with red-purple roots that dangle into the water. Roots absorb nutrients directly from the water column.', fact: 'The roots turn deep red under intense light — a sign of anthocyanin pigment production.' },

              { id: 'rotala', name: 'Rotala Rotundifolia', icon: '🌺', o2: 0.6, co2Need: 0.6, nitrateAbsorb: 0.5, light: 'high', growth: 0.05, maxSize: 5, desc: 'Colorful stem plant that turns pink-red under high light and CO2. One of the most popular aquascaping plants.', fact: 'Rotala can grow completely red when iron levels are high, creating stunning underwater landscapes.' },

              { id: 'monte_carlo', name: 'Monte Carlo', icon: '🌿', o2: 0.4, co2Need: 0.6, nitrateAbsorb: 0.3, light: 'high', growth: 0.03, maxSize: 2, desc: 'Low-growing carpet plant with small round leaves. Creates dense ground cover. Needs CO2 injection.', fact: 'Monte Carlo was discovered in Argentina and named after Monte Carlo, the famous Mediterranean city.' },

              { id: 'java_fern', name: 'Java Fern', icon: '🌿', o2: 0.3, co2Need: 0.2, nitrateAbsorb: 0.2, light: 'low', growth: 0.02, maxSize: 3, desc: 'Hardy epiphyte — attaches to rocks and driftwood. Thrives in low light.', fact: 'Java Fern reproduces by growing tiny plantlets on its leaves!' },

              { id: 'hornwort', name: 'Hornwort', icon: '🌿', o2: 1.0, co2Need: 0.4, nitrateAbsorb: 0.9, light: 'medium', growth: 0.08, maxSize: 6, desc: 'Champion oxygenator and nitrate absorber. Grows fast and releases algae-inhibiting chemicals.', fact: 'Hornwort allelopathy actively suppresses algae growth in the water column.' },

              { id: 'water_wisteria', name: 'Water Wisteria', icon: '🌿', o2: 0.7, co2Need: 0.4, nitrateAbsorb: 0.6, light: 'medium', growth: 0.07, maxSize: 5, desc: 'Fast-growing nutrient sponge with beautiful lacey leaves.', fact: 'Water Wisteria can be propagated from just a single stem cutting.' }

            ],

            reef: [

              { id: 'chaeto', name: 'Chaetomorpha', icon: '🌿', o2: 0.8, co2Need: 0.6, nitrateAbsorb: 0.9, light: 'high', growth: 0.07, maxSize: 5, desc: 'Green macroalgae grown in refugiums. The ultimate nitrate and phosphate remover for saltwater tanks.', fact: 'Chaeto is so effective at nutrient export that reefers harvest and discard overgrown portions regularly.' },

              { id: 'mangrove', name: 'Mangrove Seedling', icon: '🌳', o2: 0.4, co2Need: 0.2, nitrateAbsorb: 0.6, light: 'high', growth: 0.01, maxSize: 4, desc: 'Grows roots in saltwater while leaves emerge above. Excellent natural denitrifier and provides habitat structure.', fact: 'Mangrove forests protect coastlines from storms and serve as nurseries for 75% of commercially caught fish species.' },

              { id: 'caulerpa', name: 'Caulerpa', icon: '🌿', o2: 0.5, co2Need: 0.4, nitrateAbsorb: 0.7, light: 'medium', growth: 0.06, maxSize: 5, desc: 'Fast-growing marine macroalgae. Can become invasive if not pruned — known to "go sexual" and release spores in a toxic crash.', fact: 'Caulerpa is a single-celled organism — one of the largest single cells on Earth, up to 3 meters long!' }

            ],

            brackish: [

              { id: 'mangrove', name: 'Mangrove Seedling', icon: '🌳', o2: 0.4, co2Need: 0.2, nitrateAbsorb: 0.6, light: 'high', growth: 0.01, maxSize: 4, desc: 'Grows roots in brackish water while leaves emerge above. Natural denitrifier.', fact: 'Mangroves can filter salt from seawater — their roots excrete salt crystals.' },

              { id: 'java_fern', name: 'Java Fern', icon: '🌿', o2: 0.3, co2Need: 0.2, nitrateAbsorb: 0.2, light: 'low', growth: 0.02, maxSize: 3, desc: 'Tolerates mild brackish conditions. Hardy and low-maintenance.', fact: 'Java Fern is one of the few plants that can tolerate slight salinity.' }

            ]

          };

          // Fallback: tanks without plant lists get generic hardies

          var getPlantsForTank = function (tankId) {

            return PLANT_SPECIES[tankId] || PLANT_SPECIES['freshwater'] || [];

          };



          // ═══ BREEDING DATA CATALOG ═══

          // Per-species reproductive strategies and parameters

          var BREEDING_DATA = {

            // Livebearers — give birth to free-swimming fry, no egg stage

            guppy: { type: 'livebearer', gestationTicks: 20, fryCount: [3, 7], breedChance: 0.12, minPop: 2, desc: 'Males display vibrant color patterns to attract females. Females store sperm and can produce multiple broods.' },

            platy: { type: 'livebearer', gestationTicks: 18, fryCount: [2, 5], breedChance: 0.10, minPop: 2, desc: 'Prolific livebearers that give birth to free-swimming fry every 4-6 weeks.' },

            molly: { type: 'livebearer', gestationTicks: 22, fryCount: [3, 8], breedChance: 0.08, minPop: 2, desc: 'Mollies prefer slightly brackish conditions for breeding. Fry are large and independent at birth.' },

            // Egg-layers — lay eggs on surfaces, parents may guard

            angel: { type: 'egg_layer', gestationTicks: 30, fryCount: [1, 3], breedChance: 0.05, minPop: 2, desc: 'Angelfish carefully clean a flat surface before laying hundreds of eggs. Both parents fan and guard the clutch.' },

            clown: { type: 'egg_layer', gestationTicks: 35, fryCount: [1, 2], breedChance: 0.04, minPop: 2, hermaphrodite: true, desc: 'All clownfish are born male. The dominant fish becomes female — if she dies, the next male transitions.' },

            cory: { type: 'egg_layer', gestationTicks: 25, fryCount: [2, 4], breedChance: 0.06, minPop: 2, desc: 'Corydoras perform a unique "T-position" mating dance. Females carry eggs in their pelvic fins before depositing them on glass or leaves.' },

            // Bubble nest builders — male builds floating bubble nest

            betta: { type: 'bubble_nest', gestationTicks: 25, fryCount: [1, 2], breedChance: 0.04, minPop: 1, desc: 'Males blow mucus-coated bubbles to build a floating nest. After spawning, the male guards eggs and returns fallen fry to the nest.' },

            // Colony breeders — rapid reproduction, females carry eggs

            shrimp: { type: 'colony', gestationTicks: 12, fryCount: [4, 10], breedChance: 0.15, minPop: 2, desc: 'Females carry fertilized eggs under their abdomen ("berried"). Shrimplets are miniature adults at birth.' },

            // Schooling egg-scatterers — eggs scattered among plants, no parental care

            neon: { type: 'egg_scatter', gestationTicks: 28, fryCount: [1, 3], breedChance: 0.03, minPop: 4, desc: 'Scatter tiny adhesive eggs among fine-leaved plants at dawn. Eggs are light-sensitive and hatch in 24 hours.' },

            cardinal: { type: 'egg_scatter', gestationTicks: 28, fryCount: [1, 3], breedChance: 0.03, minPop: 4, desc: 'Prefer very soft, acidic water for spawning. Eggs and fry are extremely small and fragile.' },

            rummy: { type: 'egg_scatter', gestationTicks: 28, fryCount: [1, 2], breedChance: 0.03, minPop: 4, desc: 'Spawn in tight schools at first light. Red nose coloration intensifies during courtship.' }

          };



          // Breeding event messages by reproductive type

          var BREEDING_MESSAGES = {

            livebearer: {

              court: function (n) { return '\uD83D\uDC95 Your ' + n + ' are courting! Males displaying vibrant colors...'; },

              birth: function (n, c) { return '\uD83D\uDC23 A ' + n + ' has given birth to ' + c + ' free-swimming fry!'; },

              abort: function (n) { return '\u26A0\uFE0F ' + n + ' breeding interrupted \u2014 poor water conditions caused stress.'; }

            },

            egg_layer: {

              court: function (n) { return '\uD83D\uDC95 Your ' + n + ' are cleaning a surface for egg-laying...'; },

              eggs: function (n) { return '\uD83E\uDD5A ' + n + ' have laid eggs! Parents are guarding the nest.'; },

              birth: function (n, c) { return '\uD83D\uDC23 ' + c + ' ' + n + ' fry have hatched from the eggs!'; },

              abort: function (n) { return '\u26A0\uFE0F ' + n + ' eggs failed to develop \u2014 water quality too poor.'; }

            },

            bubble_nest: {

              court: function (n) { return '\uD83D\uDC95 Your ' + n + ' is building a bubble nest at the surface...'; },

              birth: function (n, c) { return '\uD83D\uDC23 ' + c + ' ' + n + ' fry emerging from the bubble nest!'; },

              abort: function (n) { return '\u26A0\uFE0F ' + n + ' bubble nest destroyed by surface turbulence.'; }

            },

            colony: {

              court: function (n) { return '\uD83D\uDC95 Your ' + n + ' colony is thriving \u2014 females are berried (carrying eggs)!'; },

              birth: function (n, c) { return '\uD83D\uDC23 ' + c + ' tiny shrimplets have appeared in the colony!'; },

              abort: function (n) { return '\u26A0\uFE0F ' + n + ' dropped their eggs \u2014 too much stress.'; }

            },

            egg_scatter: {

              court: function (n) { return '\uD83D\uDC95 Your ' + n + ' are scattering eggs among the plants...'; },

              birth: function (n, c) { return '\uD83D\uDC23 ' + c + ' ' + n + ' fry have survived the egg stage!'; },

              abort: function (n) { return '\u26A0\uFE0F ' + n + ' eggs were eaten \u2014 not enough plant cover.'; }

            }

          };




          // ═══ SHOP & ECONOMY SYSTEM ═══
          var SPECIES_COST = {
            neon: 0, guppy: 0, platy: 5, cory: 10, molly: 15, angel: 30,
            cardinal: 10, rummy: 15, oto: 10, shrimp: 5, betta: 25,
            clown: 40, tang: 60, goby: 30, anemone: 50,
            oscar: 50, pike: 45, pleco: 35,
            slider: 55, goldfish: 15,
            cleaner: 20, urchin: 25, crab: 15, starfish: 30,
            rockfish: 40, seastar: 35, kelp: 10,
            archer: 30, puffer: 35, mudskip: 25
          };

          var EQUIPMENT_CATALOG = {
            filter: {
              name: 'Filter', icon: '\u2699\uFE0F',
              levels: [
                { name: 'Sponge Filter', cost: 0, ammoniaReduction: 0.05, nitriteReduction: 0.03, desc: 'Basic mechanical & biological filtration.' },
                { name: 'HOB Filter', cost: 30, ammoniaReduction: 0.08, nitriteReduction: 0.05, desc: 'Hang-on-back with activated carbon. Better flow.' },
                { name: 'Canister Filter', cost: 75, ammoniaReduction: 0.12, nitriteReduction: 0.08, desc: 'Multi-stage: mechanical, chemical, biological.' },
                { name: 'Sump System', cost: 150, ammoniaReduction: 0.18, nitriteReduction: 0.12, desc: 'Professional-grade. Massive biological capacity.' }
              ]
            },
            heater: {
              name: 'Heater', icon: '\uD83C\uDF21\uFE0F',
              levels: [
                { name: 'No Heater', cost: 0, tempStability: 0, failChance: 0.05, desc: 'Room temperature only. Temp swings.' },
                { name: 'Preset Heater', cost: 20, tempStability: 0.6, failChance: 0.03, desc: 'Fixed 78\u00B0F. Reliable but not adjustable.' },
                { name: 'Adjustable Heater', cost: 50, tempStability: 0.85, failChance: 0.015, desc: 'Dial-controlled. \u00B11\u00B0F accuracy.' },
                { name: 'Titanium + Controller', cost: 120, tempStability: 0.97, failChance: 0.005, desc: 'Shatterproof with digital controller.' }
              ]
            },
            light: {
              name: 'Light', icon: '\uD83D\uDCA1',
              levels: [
                { name: 'Room Light', cost: 0, plantBoost: 0, algaeMult: 0.8, desc: 'Ambient only. Insufficient for plants.' },
                { name: 'Basic LED', cost: 25, plantBoost: 0.2, algaeMult: 1.0, desc: 'White LED strip. Adequate for low-light plants.' },
                { name: 'Full Spectrum', cost: 60, plantBoost: 0.5, algaeMult: 1.1, desc: 'Tuned for photosynthesis. Sunrise/sunset.' },
                { name: 'Pro Planted LED', cost: 130, plantBoost: 0.8, algaeMult: 0.9, desc: 'PAR-optimized with adjustable RGB.' }
              ]
            },
            airPump: {
              name: 'Air Pump', icon: '\uD83C\uDF2C\uFE0F',
              levels: [
                { name: 'None', cost: 0, o2Boost: 0, desc: 'Surface agitation from filter only.' },
                { name: 'Small Air Pump', cost: 15, o2Boost: 0.3, desc: 'Single airstone. Gentle bubbles.' },
                { name: 'Dual Outlet', cost: 40, o2Boost: 0.6, desc: 'Two airstones. Adjustable flow.' },
                { name: 'Linear Piston', cost: 90, o2Boost: 1.0, desc: 'Whisper-quiet micro-bubbles.' }
              ]
            }
          };

          var ACHIEVEMENTS = [
            { id: 'first_fish', name: 'First Splash', icon: '\uD83D\uDC1F', desc: 'Add your first fish', coins: 10 },
            { id: 'full_tank', name: 'Full House', icon: '\uD83C\uDFE0', desc: 'Fill tank to 80%+ capacity', coins: 25 },
            { id: 'first_breed', name: 'Circle of Life', icon: '\uD83D\uDC23', desc: 'First successful breeding', coins: 20 },
            { id: 'perfect_water', name: 'Crystal Clear', icon: '\uD83D\uDCA7', desc: 'All params safe for 20 ticks', coins: 30 },
            { id: 'plant_master', name: 'Green Thumb', icon: '\uD83C\uDF3F', desc: 'Grow 4+ plants in a tank', coins: 20 },
            { id: 'disease_cure', name: 'Fish Doctor', icon: '\uD83E\uDE7A', desc: 'Cure a fish disease', coins: 15 },
            { id: 'day_30', name: 'Dedicated Keeper', icon: '\u2B50', desc: 'Reach day 30', coins: 35 },
            { id: 'day_100', name: 'Master Aquarist', icon: '\uD83C\uDFC6', desc: 'Reach day 100', coins: 75 },
            { id: 'five_species', name: 'Biodiversity', icon: '\uD83C\uDF0D', desc: '5 different species in tank', coins: 25 },
            { id: 'all_equipment', name: 'Fully Equipped', icon: '\uD83D\uDD27', desc: 'All equipment level 2+', coins: 40 },
            { id: 'ocean_sustain', name: 'Sustainable Fisher', icon: '\uD83C\uDF0A', desc: '20 years without collapse', coins: 30 },
            { id: 'quiz_ace', name: 'Marine Biologist', icon: '\uD83E\uDDEC', desc: '10 correct quiz answers', coins: 30 },
            { id: 'ten_breeds', name: 'Fish Breeder', icon: '\uD83E\uDDEC', desc: 'Breed 10 total fry', coins: 40 },
            { id: 'first_upgrade', name: 'Upgrade!', icon: '\u2B06\uFE0F', desc: 'First equipment upgrade', coins: 10 },
            { id: 'coin_100', name: 'Savings Account', icon: '\uD83D\uDCB0', desc: 'Earn 100 total coins', coins: 15 },
            { id: 'anatomy_5', name: 'Anatomy Scholar', icon: '\uD83D\uDD2C', desc: 'Study 5 species anatomy', coins: 20 }
          ];

          var TUTORIAL_STEPS = [
            { id: 'welcome', title: 'Welcome to Aquarium Lab!', msg: 'Build and manage your own aquatic ecosystem. Select a tank type to begin.' },
            { id: 'add_fish', title: 'Stock Your Tank', msg: 'Add fish from the species list. Watch the bioload meter!' },
            { id: 'run_sim', title: 'Start the Simulation', msg: 'Press Play to begin the ecosystem simulation.' },
            { id: 'feed', title: 'Feed Your Fish', msg: 'Fish get hungry. Feed flakes or live food, but avoid overfeeding!' },
            { id: 'water_change', title: 'Water Maintenance', msg: 'Do water changes when ammonia or nitrite rises.' },
            { id: 'earn_coins', title: 'Earn Coins!', msg: 'Healthy tanks earn daily coins. Spend on species and upgrades!' },
            { id: 'shop', title: 'Visit the Shop', msg: 'Tap the Shop tab to buy new fish and upgrade equipment.' }
          ];

          // ── Current state ──

          var selectedTank = d.selectedTank || null;

          var tankFish = d.tankFish || [];

          var waterChem = d.waterChem || null;

          var simTick = d.simTick || 0;

          var simRunning = d.simRunning || false;

          var fishHealth = d.fishHealth || {};

          var eventLog = d.eventLog || [];



          // ── Enhanced sim state ──

          var hungerLevels = d.hungerLevels || {};

          var simSpeed = d.simSpeed || 1;

          var simDay = d.simDay || 0;

          var simHour = d.simHour || 8;

          var feedingLog = d.feedingLog || null;

          var chemTooltip = d.chemTooltip || null;

          var fishStress = d.fishStress || {};



          // ── New gameplay state ──

          var lightsOn = d.lightsOn !== undefined ? d.lightsOn : true;

          var fishSickness = d.fishSickness || {}; // { speciesId: { disease: 'ich', severity: 1-3, tick: when } }

          var algaeLevel = d.algaeLevel || 0; // 0-100




          // ═══ ECONOMY & PROGRESSION STATE ═══
          var coins = d.coins || 0;
          var totalCoinsEarned = d.totalCoinsEarned || 0;
          var equipment = d.equipment || { filter: 0, heater: 0, light: 0, airPump: 0 };
          var unlockedAchievements = d.unlockedAchievements || {};
          var perfectWaterTicks = d.perfectWaterTicks || 0;
          var anatomiesStudied = d.anatomiesStudied || {};
          var tutorialStep = d.tutorialStep || 0;
          var tutorialDismissed = d.tutorialDismissed || false;
          var shopOpen = d.shopOpen || false;
          var shopTab = d.shopTab || 'fish';

          // ── Plant ecosystem state ──

          var tankPlants = d.tankPlants || []; // array of plant IDs in the tank

          var plantHealth = d.plantHealth || {}; // { plantId: 0-100 }

          var plantBiomass = d.plantBiomass || {}; // { plantId: currentSize (0 to maxSize) }

          var plantCatalog = getPlantsForTank(selectedTank); // available plants for current tank type



          // ── Breeding ecosystem state ──

          var breedingState = d.breedingState || {}; // { speciesId: { stage: 'gestating'|'hatching', startTick: N, fryCount: N } }

          var breedingCooldowns = d.breedingCooldowns || {}; // { speciesId: lastBreedCompleteTick }

          var totalFryBorn = d.totalFryBorn || 0; // lifetime fry counter for achievements



          // ── Species animation behaviors ──

          var SPECIES_ANIM = {

            seahorse: { anim: 'aquaBobble', yZone: 'mid', speed: [4, 6] },

            crab: { anim: 'aquaScuttle', yZone: 'bottom', speed: [1.5, 3] },

            shrimp: { anim: 'aquaScuttle', yZone: 'bottom', speed: [2, 3.5] },

            cleaner: { anim: 'aquaScuttle', yZone: 'bottom', speed: [2, 4] },

            amphipod: { anim: 'aquaScuttle', yZone: 'bottom', speed: [1, 2.5] },

            starfish: { anim: 'aquaDrift', yZone: 'bottom', speed: [8, 12] },

            seastar: { anim: 'aquaDrift', yZone: 'bottom', speed: [8, 12] },

            urchin: { anim: 'aquaDrift', yZone: 'bottom', speed: [10, 15] },

            seacucumber: { anim: 'aquaDrift', yZone: 'bottom', speed: [12, 18] },

            anemone: { anim: 'aquaPulse', yZone: 'bottom', speed: [4, 7] },

            jellyfish: { anim: 'aquaPulse', yZone: 'top', speed: [3, 5] },

            gulpereel: { anim: 'aquaUndulate', yZone: 'mid', speed: [3, 5] },

            tubeworms: { anim: 'aquaPulse', yZone: 'bottom', speed: [5, 8] },

            cory: { anim: 'aquaScuttle', yZone: 'bottom', speed: [2.5, 4] },

            pleco: { anim: 'aquaDrift', yZone: 'bottom', speed: [6, 10] },

            oto: { anim: 'aquaDrift', yZone: 'bottom', speed: [5, 8] },

            goby: { anim: 'aquaScuttle', yZone: 'bottom', speed: [2, 4] },

            mudskip: { anim: 'aquaScuttle', yZone: 'bottom', speed: [2, 3] },

            octopus: { anim: 'aquaUndulate', yZone: 'mid', speed: [3, 5] },

            squid: { anim: 'aquaPulse', yZone: 'mid', speed: [2.5, 4] },

            giantsquid: { anim: 'aquaPulse', yZone: 'mid', speed: [3, 5] },

            nautilus: { anim: 'aquaBobble', yZone: 'mid', speed: [5, 8] },

            slider: { anim: 'aquaBobble', yZone: 'top', speed: [4, 7] },

            turtle: { anim: 'aquaBobble', yZone: 'top', speed: [4, 7] },

            mantaray: { anim: 'aquaBobble', yZone: 'mid', speed: [3, 5] },

            bluewhale: { anim: 'aquaBobble', yZone: 'mid', speed: [5, 8] },

            dolphin: { anim: 'aquaBobble', yZone: 'top', speed: [2, 4] },

            snailfish: { anim: 'aquaDrift', yZone: 'bottom', speed: [6, 10] }

          };



          // ── Species diet types ──

          var SPECIES_DIET = {

            pike: 'carnivore', swordfish: 'carnivore', anglerfish: 'carnivore',

            oscar: 'carnivore', betta: 'carnivore',

            octopus: 'carnivore', squid: 'carnivore', giantsquid: 'carnivore',

            nautilus: 'carnivore', dolphin: 'carnivore', bluewhale: 'filter',

            anemone: 'filter', jellyfish: 'filter', tubeworms: 'filter',

            seacucumber: 'detritivore', urchin: 'herbivore',

            shrimp: 'omnivore', cleaner: 'omnivore', crab: 'omnivore',

            amphipod: 'detritivore', cory: 'omnivore', pleco: 'herbivore',

            oto: 'herbivore', goby: 'omnivore', starfish: 'omnivore',

            seastar: 'omnivore', snailfish: 'carnivore',

            slider: 'omnivore', turtle: 'omnivore', mantaray: 'carnivore'

            // everything else defaults to 'omnivore'

          };





          var aiEvent = d.aiEvent || null;

          var aiEventHistory = d.aiEventHistory || [];

          var aiEventLoading = d.aiEventLoading || false;

          var lastAIEventDay = d.lastAIEventDay || 0;



          // ── Fallback Event Bank (fires when Gemini unavailable) ──

          var FALLBACK_EVENTS = [

            // Disease

            {

              id: 'ich', title: 'White Spot Disease (Ich)', icon: '\u26A0\uFE0F', desc: 'You notice tiny white spots on your fish\u2019s fins and body. Ichthyophthirius multifiliis is highly contagious and can be fatal if untreated.', category: 'disease',

              educational: 'Ich is caused by a ciliated protozoan parasite. It burrows under the skin, creating white cysts. The parasite has a 3-stage life cycle \u2014 it\u2019s only vulnerable to treatment during the free-swimming stage.',

              choices: [

                { label: '\uD83C\uDF21\uFE0F Raise temperature to 86\u00B0F', effect: { temp: 86, ammonia: 0.1 }, outcome: 'The higher temperature speeds up the parasite\u2019s life cycle, making treatment more effective. Fish are slightly stressed by the heat but the ich is clearing.', xp: 5 },

                { label: '\uD83E\uDDEA Add aquarium salt (1 tsp/gal)', effect: { ammonia: 0.05 }, outcome: 'Salt disrupts the parasite\u2019s osmotic balance. After 3 days, the white spots are fading. Scaleless fish like corydoras may be slightly irritated.', xp: 4 },

                { label: '\u274C Do nothing and observe', effect: { ammonia: 0.3 }, outcome: 'The ich spreads rapidly. Two fish are now heavily infected and showing labored breathing. Immediate action is now critical.', xp: 1 }

              ]

            },

            {

              id: 'finrot', title: 'Fin Rot Detected', icon: '\uD83E\uDE78', desc: 'One of your fish has ragged, discolored fin edges \u2014 a sign of bacterial fin rot. Poor water quality is usually the root cause.', category: 'disease',

              educational: 'Fin rot is caused by gram-negative bacteria (Aeromonas, Pseudomonas) that thrive in dirty water. Clean water is the #1 treatment \u2014 medications are secondary.',

              choices: [

                { label: '\uD83D\uDCA7 25% water change + clean filter', effect: { ammonia: -0.2, nitrite: -0.1 }, outcome: 'Excellent choice! The water quality improves dramatically. Over the next week, the damaged fins begin regenerating with clear tissue.', xp: 6 },

                { label: '\uD83D\uDC8A Dose antibiotics immediately', effect: { ammonia: 0.15 }, outcome: 'The antibiotics help, but also kill beneficial bacteria in your filter. Next time, try clean water first \u2014 it\u2019s usually sufficient.', xp: 3 },

                { label: '\u274C Ignore it', effect: { ammonia: 0.4 }, outcome: 'The fin rot progresses to body rot. The fish\u2019s immune system is now compromised. This could have been prevented with a water change.', xp: 0 }

              ]

            },

            // Equipment

            {

              id: 'heater_fail', title: 'Heater Malfunction!', icon: '\uD83C\uDF21\uFE0F', desc: 'Your heater thermostat is stuck on high! Water temperature is climbing rapidly toward 88\u00B0F. Your fish are showing signs of thermal stress.', category: 'equipment',

              educational: 'Heater malfunctions are one of the most dangerous aquarium emergencies. Above 86\u00B0F, dissolved oxygen drops significantly. Many fish can tolerate brief temperature spikes but prolonged exposure causes organ damage.',

              choices: [

                { label: '\u26A1 Unplug heater + add ice bag', effect: { temp: -6 }, outcome: 'Quick thinking! The ice bag slowly cools the water back to safe range. You\u2019ll need to monitor and replace the heater.', xp: 6 },

                { label: '\uD83D\uDCA8 Point a fan across water surface', effect: { temp: -3 }, outcome: 'Evaporative cooling helps reduce temperature gradually. The water drops a few degrees but may not be enough. Good emergency measure!', xp: 4 },

                { label: '\u274C Unplug heater only', effect: { temp: -1 }, outcome: 'The temperature will slowly drift down, but tropical fish need some heat. Monitor closely and get a replacement heater soon.', xp: 2 }

              ]

            },

            {

              id: 'filter_clog', title: 'Filter Flow Reduced', icon: '\u2699\uFE0F', desc: 'Your filter output is barely trickling. Debris has built up in the intake and media. Without filtration, ammonia will spike quickly.', category: 'equipment',

              educational: 'Filters house your nitrogen cycle bacteria (Nitrosomonas + Nitrospira). Never clean filter media in tap water \u2014 the chlorine kills the beneficial bacteria. Always rinse in old tank water!',

              choices: [

                { label: '\uD83D\uDCA7 Rinse media in old tank water', effect: { ammonia: -0.1 }, outcome: 'Perfect technique! The filter flow is restored while preserving the bacterial colony. Your nitrogen cycle stays intact.', xp: 6 },

                { label: '\uD83D\uDDD1\uFE0F Replace all filter media', effect: { ammonia: 0.3 }, outcome: 'The filter runs great, but you\u2019ve lost ALL your beneficial bacteria. Expect an ammonia spike in 2-3 days as the cycle restarts.', xp: 2 },

                { label: '\u274C Deal with it later', effect: { ammonia: 0.5 }, outcome: 'Without proper filtration, ammonia and waste build up rapidly. Your fish are gasping at the surface for oxygen.', xp: 0 }

              ]

            },

            // Ecology

            {

              id: 'algae_bloom', title: 'Green Algae Bloom!', icon: '\uD83C\uDF3F', desc: 'Your tank water has turned pea-soup green overnight. A massive algae bloom has erupted, likely from excess nutrients and light.', category: 'ecology',

              educational: 'Algae blooms are caused by excess phosphates and nitrates combined with too much light (>10 hours/day). They\u2019re not immediately dangerous but reduce oxygen at night and look unsightly.',

              choices: [

                { label: '\uD83D\uDD26 Blackout for 3 days (cover tank)', effect: { nitrate: -5 }, outcome: 'Without light, the algae dies off. After 3 days of darkness, the water clears. Reduce your light schedule to prevent recurrence.', xp: 5 },

                { label: '\uD83E\uDDA0 Add algae-eating fish (Oto)', effect: { nitrate: -2 }, outcome: 'The otocinclus help with surface algae, but green water algae is too small for them. Partial improvement, but a blackout would be more effective.', xp: 3 },

                { label: '\uD83D\uDCA7 50% water change', effect: { ammonia: -0.1, nitrate: -10 }, outcome: 'The water change dilutes nutrients and clears some algae, but it may return if the root cause (excess light/nutrients) isn\u2019t addressed.', xp: 4 }

              ]

            },

            {

              id: 'snail_invasion', title: 'Snail Population Explosion!', icon: '\uD83D\uDC0C', desc: 'Tiny snails are everywhere! They hitchhiked in on a plant and have multiplied rapidly. While not harmful, they\u2019re covering your glass.', category: 'ecology',

              educational: 'Pest snails (bladder snails, Malaysian trumpet snails) reproduce asexually \u2014 one snail can become hundreds. They\u2019re actually beneficial detritivores but can indicate overfeeding.',

              choices: [

                { label: '\uD83C\uDF7D\uFE0F Reduce feeding (snails eat leftovers)', effect: { ammonia: -0.15 }, outcome: 'Smart approach! With less excess food, the snail population naturally declines over 2-3 weeks. Bonus: your water quality improves too.', xp: 6 },

                { label: '\uD83E\uDD9E Add an assassin snail', effect: {}, outcome: 'The assassin snail is a natural predator. Over time, it hunts down the pest snails. A biological control approach \u2014 very elegant!', xp: 5 },

                { label: '\uD83D\uDEAB Remove them manually', effect: {}, outcome: 'You pick out dozens, but miss the tiny ones and eggs. They\u2019ll be back. This is a never-ending battle without addressing the root cause.', xp: 2 }

              ]

            },

            {

              id: 'plant_melt', title: 'Aquatic Plants Melting', icon: '\uD83C\uDF42', desc: 'Several of your live plants are turning brown and dissolving. The leaves are becoming translucent and falling apart.', category: 'ecology',

              educational: 'New aquatic plants often \"melt\" as they transition from emersed (above-water) to submersed growth. This is normal! Iron and CO2 deficiency can also cause melting in established plants.',

              choices: [

                { label: '\uD83E\uDDEA Add root tabs + liquid fertilizer', effect: { nitrate: 3 }, outcome: 'The iron and micronutrients give the plants what they need. New, submersed-growth leaves begin sprouting within a week.', xp: 5 },

                { label: '\u2702\uFE0F Trim dead leaves, leave roots', effect: {}, outcome: 'Good practice! Removing dead material prevents it from decaying and spiking ammonia. Healthy roots will send up new growth.', xp: 4 },

                { label: '\uD83D\uDDD1\uFE0F Remove all dying plants', effect: { ammonia: 0.1, nitrate: 5 }, outcome: 'Without plants absorbing nitrate, your water quality may suffer. Plants also provide hiding spots that reduce fish stress.', xp: 1 }

              ]

            },

            // Water

            {

              id: 'ph_crash', title: 'Sudden pH Crash!', icon: '\u2697\uFE0F', desc: 'Your pH has dropped from 7.2 to 6.0 overnight! Fish are showing signs of acidosis: clamped fins, rapid gill movement, and lethargy.', category: 'water',

              educational: 'pH crashes happen when KH (carbonate hardness) is depleted. KH acts as a buffer \u2014 without it, pH becomes unstable. Adding crushed coral or baking soda restores buffering capacity.',

              choices: [

                { label: '\uD83E\uDDF1 Add crushed coral to filter', effect: { pH: 1.0 }, outcome: 'The crushed coral slowly dissolves, raising KH and stabilizing pH around 7.2. This provides long-term buffering. Excellent choice!', xp: 6 },

                { label: '\uD83E\uDDEA Add baking soda (1 tsp/5 gal)', effect: { pH: 0.6 }, outcome: 'The pH rises quickly back toward neutral. Be careful \u2014 sudden pH changes can be as stressful as the crash itself. Slow and steady wins.', xp: 4 },

                { label: '\uD83D\uDCA7 Large water change (50%)', effect: { pH: 0.4, ammonia: -0.2 }, outcome: 'The fresh water brings pH up somewhat, but without addressing the low KH, the pH will crash again within days.', xp: 3 }

              ]

            },

            {

              id: 'cloudy_water', title: 'Mysterious Cloudiness', icon: '\uD83C\uDF2B\uFE0F', desc: 'Your crystal-clear water has become milky white. It happened within hours and the fish seem unaffected so far.', category: 'water',

              educational: 'Milky white cloudiness is a bacterial bloom \u2014 millions of free-floating heterotrophic bacteria. This is common in new tanks or after a major disturbance. It\u2019s usually harmless and self-resolving.',

              choices: [

                { label: '\u23F3 Wait it out (bacterial bloom)', effect: { ammonia: 0.1 }, outcome: 'Correct diagnosis! The bloom runs out of food after 2-3 days and clears on its own. Your tank\u2019s ecosystem is simply rebalancing.', xp: 5 },

                { label: '\uD83D\uDCA7 Small daily water changes (10%)', effect: { ammonia: -0.05 }, outcome: 'The gentle water changes remove some bacteria without disrupting the cycle. Combined with patience, the water clears in a few days.', xp: 5 },

                { label: '\uD83E\uDDEA Add water clarifier chemical', effect: { ammonia: 0.05 }, outcome: 'The clarifier clumps particles for the filter to catch. It works visually but doesn\u2019t address why the bloom happened. A band-aid solution.', xp: 2 }

              ]

            },

            // Behavioral

            {

              id: 'aggression', title: 'Fish Aggression Alert!', icon: '\uD83D\uDCA2', desc: 'One of your larger fish is chasing and nipping at the others. You can see torn fins on the smaller fish. Tank harmony is disrupted.', category: 'behavioral',

              educational: 'Aggression often stems from territorial behavior, breeding instincts, or overcrowding. Rearranging decorations breaks established territories and can reset the social hierarchy.',

              choices: [

                { label: '\uD83C\uDFE0 Rearrange decorations', effect: {}, outcome: 'Brilliant strategy! Moving the decor disrupts the bully\u2019s claimed territory. All fish have to re-establish boundaries, reducing aggression.', xp: 5 },

                { label: '\uD83C\uDF3F Add more hiding spots', effect: {}, outcome: 'More plants and caves give smaller fish escape routes. Line-of-sight breaks are key to peaceful tanks. The nipping decreases significantly.', xp: 5 },

                { label: '\uD83D\uDCD0 Check if tank is overcrowded', effect: {}, outcome: 'You review your stocking \u2014 the bioload is high. Sometimes the only solution is to rehome the aggressive individual.', xp: 4 }

              ]

            },

            {

              id: 'breeding', title: 'Breeding Behavior Spotted!', icon: '\uD83D\uDC95', desc: 'Two fish are performing an elaborate courtship dance! The male is displaying vibrant colors and the female appears to have a rounded belly.', category: 'behavioral',

              educational: 'Successful breeding requires stable water chemistry, proper temperature, and adequate nutrition. Many livebearers (guppies, mollies, platys) breed readily. Egg-layers need specific conditions.',

              choices: [

                { label: '\uD83C\uDF31 Add breeding box / plants', effect: {}, outcome: 'The dense plants provide cover for fry. Within days, you spot tiny baby fish hiding among the leaves! Your population may grow.', xp: 5 },

                { label: '\uD83C\uDF21\uFE0F Optimize conditions for spawning', effect: { temp: 1 }, outcome: 'The slightly warmer water and good nutrition encourage spawning. Nature takes its course \u2014 this is natural population dynamics!', xp: 4 },

                { label: '\uD83D\uDC40 Just observe and enjoy', effect: {}, outcome: 'You watch the beautiful natural behavior unfold. Even if fry don\u2019t survive, witnessing courtship displays is one of the joys of fishkeeping.', xp: 3 }

              ]

            },

            {

              id: 'new_cycle', title: 'Nitrogen Cycle Kick-starting', icon: '\uD83D\uDD04', desc: 'You notice ammonia is rising but nitrite is still zero. Your tank is in the early stages of cycling \u2014 beneficial bacteria haven\u2019t colonized yet.', category: 'water',

              educational: 'The nitrogen cycle is the single most important concept in fishkeeping. Ammonia \u2192 Nitrite \u2192 Nitrate. It takes 4-6 weeks to fully establish. Patience is the key.',

              choices: [

                { label: '\uD83E\uDDA0 Add bottled bacteria starter', effect: { ammonia: -0.2 }, outcome: 'The commercial bacteria boost jump-starts colonization. You should see nitrite appear within a week as the first bacteria convert ammonia.', xp: 5 },

                { label: '\uD83D\uDCA7 Small daily water changes', effect: { ammonia: -0.15 }, outcome: 'Keeping ammonia below 2 ppm protects your fish while the cycle establishes. This is the gold standard for fish-in cycling.', xp: 6 },

                { label: '\u274C Add more fish to speed it up', effect: { ammonia: 0.6 }, outcome: 'More fish = more ammonia. But your bacteria can\u2019t keep up yet! This overloads the system and puts all fish at risk. Less is more during cycling.', xp: 0 }

              ]

            },

            {

              id: 'power_outage', title: 'Power Outage Simulation', icon: '\u26A1', desc: 'The power goes out! Your heater, filter, and lights all stop. Without filtration, oxygen levels will drop. Without the heater, temperature will fall.', category: 'equipment',

              educational: 'During power outages, oxygen is the #1 concern. Battery-powered air pumps are essential emergency gear. Most tropical fish can survive 4-6 hours without heat but suffocate faster without water movement.',

              choices: [

                { label: '\uD83E\uDEAB Battery air pump + blanket on tank', effect: { temp: -2 }, outcome: 'The air pump maintains oxygen while the blanket insulates heat. Your fish barely notice the outage. You were prepared!', xp: 6 },

                { label: '\uD83D\uDCA8 Manually agitate water surface', effect: { temp: -3, ammonia: 0.1 }, outcome: 'Stirring the water with a cup adds oxygen. It\u2019s labor-intensive but effective short-term. Temperature slowly drops.', xp: 4 },

                { label: '\u274C Wait for power to return', effect: { temp: -5, ammonia: 0.3 }, outcome: 'After 3 hours, oxygen drops critically. Some fish are gasping at the surface. The temperature is falling steadily. An emergency kit would have prevented this.', xp: 1 }

              ]

            },

            {

              id: 'test_results', title: 'Unexpected Water Test Results', icon: '\uD83E\uDDEA', desc: 'Your weekly water test shows nitrate at 80+ ppm! Your fish seem fine now, but this level of nitrate suppresses immune function over time.', category: 'water',

              educational: 'High nitrate is the "silent killer." Fish acclimate gradually and seem fine, but chronic exposure stunts growth, fades color, and weakens immunity. Regular water changes are the #1 prevention.',

              choices: [

                { label: '\uD83D\uDCA7 50% water change + gravel vacuum', effect: { nitrate: -30, ammonia: -0.1 }, outcome: 'A thorough water change and gravel vacuum removes trapped detritus. Nitrate drops to safe levels. Schedule weekly changes to prevent buildup.', xp: 6 },

                { label: '\uD83C\uDF3F Add fast-growing live plants', effect: { nitrate: -15 }, outcome: 'Floating plants like duckweed and hornwort are nitrogen-absorbing machines. They\u2019ll help keep nitrate in check between water changes.', xp: 5 },

                { label: '\u274C It will come down on its own', effect: { nitrate: 10 }, outcome: 'Nitrate doesn\u2019t decrease on its own \u2014 only water changes, plants, or special media remove it. Your fish\u2019s long-term health is at risk.', xp: 0 }

              ]

            }

          ];



          // ── AI Event Generator (Gemini-powered with fallback) ──

          var generateAIEvent = function () {

            if (aiEventLoading || !selectedTank || tankFish.length === 0) return;



            // Try Gemini first, fall back to curated bank

            if (callGemini) {

              upd('aiEventLoading', true);

              var fishNames = tankFish.map(function (fId) {

                var sp = (SPECIES_BY_TANK[selectedTank] || []).find(function (s) { return s.id === fId; });

                return sp ? sp.name : fId;

              }).join(', ');

              var tankInfo = TANK_TYPES.find(function (t) { return t.id === selectedTank; });

              var prompt = 'You are an aquarium science educator generating an interactive learning event for a tank simulation. Current tank state:\n' +

                '- Tank type: ' + (tankInfo ? tankInfo.name : selectedTank) + '\n' +

                '- Fish: ' + fishNames + ' (' + tankFish.length + ' total)\n' +

                '- Water: pH ' + (waterChem ? waterChem.pH.toFixed(1) : '?') + ', Temp ' + (waterChem ? waterChem.temp.toFixed(0) : '?') + 'F, NH3 ' + (waterChem ? waterChem.ammonia.toFixed(2) : '?') + ', NO2 ' + (waterChem ? waterChem.nitrite.toFixed(2) : '?') + ', NO3 ' + (waterChem ? waterChem.nitrate.toFixed(0) : '?') + '\n' +

                '- Day: ' + simDay + '\n' +

                '- Recent events: ' + (aiEventHistory.length > 0 ? aiEventHistory.slice(-3).map(function (e) { return e.title; }).join(', ') : 'none') + '\n\n' +

                'Generate ONE realistic aquarium event that requires a student decision. Return ONLY valid JSON:\n' +

                '{"title":"short title","icon":"single emoji","desc":"2-3 sentence scenario description","educational":"1-2 sentence science explanation","choices":[{"label":"emoji + action","effect_desc":"brief consequence preview","ammonia_delta":0,"ph_delta":0,"temp_delta":0,"nitrate_delta":0,"xp":5,"outcome":"what happens after choosing this"},{"label":"emoji + alternative action","effect_desc":"brief consequence","ammonia_delta":0,"ph_delta":0,"temp_delta":0,"nitrate_delta":0,"xp":3,"outcome":"result"}]}\n' +

                'Rules: 2-3 choices, effects realistic, one choice should be clearly educational/best, include a wrong/risky choice. Make it specific to the current fish and water conditions. Do NOT repeat recent events.';



              callGemini(prompt, true, false, 0.9).then(function (response) {

                try {

                  var parsed = typeof response === 'string' ? JSON.parse(response) : response;

                  if (parsed && parsed.title && parsed.choices && parsed.choices.length >= 2) {

                    // Convert AI response to standard event format

                    var aiEvt = {

                      id: 'ai_' + Date.now(),

                      title: parsed.title,

                      icon: parsed.icon || '\uD83E\uDD16',

                      desc: parsed.desc,

                      educational: parsed.educational,

                      category: 'ai_generated',

                      choices: parsed.choices.map(function (c) {

                        return {

                          label: c.label,

                          effect: {

                            ammonia: c.ammonia_delta || 0,

                            pH: c.ph_delta || 0,

                            temp: c.temp_delta || 0,

                            nitrate: c.nitrate_delta || 0

                          },

                          outcome: c.outcome,

                          xp: c.xp || 3

                        };

                      })

                    };

                    updMulti({ aiEvent: aiEvt, aiEventLoading: false, lastAIEventDay: simDay });

                    return;

                  }

                } catch (e) { /* fall through to fallback */ }

                // Fallback on parse failure

                var fb = FALLBACK_EVENTS[Math.floor(Math.random() * FALLBACK_EVENTS.length)];

                updMulti({ aiEvent: Object.assign({}, fb), aiEventLoading: false, lastAIEventDay: simDay });

              }).catch(function () {

                var fb = FALLBACK_EVENTS[Math.floor(Math.random() * FALLBACK_EVENTS.length)];

                updMulti({ aiEvent: Object.assign({}, fb), aiEventLoading: false, lastAIEventDay: simDay });

              });

            } else {

              // No callGemini available — use fallback

              var fb = FALLBACK_EVENTS[Math.floor(Math.random() * FALLBACK_EVENTS.length)];

              updMulti({ aiEvent: Object.assign({}, fb), aiEventLoading: false, lastAIEventDay: simDay });

            }

          };



          // ── Resolve AI Event (apply chosen consequence) ──

          var resolveAIEvent = function (choiceIdx) {

            if (!aiEvent || !aiEvent.choices || !aiEvent.choices[choiceIdx]) return;

            var choice = aiEvent.choices[choiceIdx];

            var updates = {};

            // Apply effects to water chemistry

            if (waterChem && choice.effect) {

              var newChem = Object.assign({}, waterChem);

              if (choice.effect.ammonia) newChem.ammonia = Math.max(0, newChem.ammonia + choice.effect.ammonia);

              if (choice.effect.pH) newChem.pH = Math.max(5.5, Math.min(9.0, newChem.pH + choice.effect.pH));

              if (choice.effect.temp) {

                if (Math.abs(choice.effect.temp) > 10) newChem.temp = choice.effect.temp; // Absolute temp set

                else newChem.temp = Math.max(40, Math.min(95, newChem.temp + choice.effect.temp));

              }

              if (choice.effect.nitrate) newChem.nitrate = Math.max(0, newChem.nitrate + choice.effect.nitrate);

              if (choice.effect.nitrite) newChem.nitrite = Math.max(0, newChem.nitrite + choice.effect.nitrite);

              updates.waterChem = newChem;

            }

            // Award XP

            if (choice.xp && typeof awardStemXP === 'function') awardStemXP('aquarium', choice.xp, 'AI Event: ' + aiEvent.title);

            // Log the resolved event

            var historyEntry = { title: aiEvent.title, icon: aiEvent.icon, choice: choice.label, outcome: choice.outcome, day: simDay, xp: choice.xp || 0 };

            updates.aiEventHistory = aiEventHistory.concat([historyEntry]).slice(-20);

            // Mark event as resolved (show outcome)

            updates.aiEvent = Object.assign({}, aiEvent, { resolved: true, chosenIdx: choiceIdx, chosenOutcome: choice.outcome, chosenXp: choice.xp || 0 });

            updMulti(updates);

            // Auto-dismiss outcome after 8 seconds

            setTimeout(function () { upd('aiEvent', null); }, 8000);

          };



          // ── Ocean Ecology state ──

          var oceanPop = d.oceanPop || { sardines: 800, tuna: 200, sharks: 50 };

          var harvestRate = d.harvestRate != null ? d.harvestRate : 20;

          var meshSize = d.meshSize || 'medium';

          var mpaPercent = d.mpaPercent != null ? d.mpaPercent : 10;

          var isOpenSeason = d.isOpenSeason != null ? d.isOpenSeason : true;

          var oceanHistory = d.oceanHistory || [];

          var oceanYear = d.oceanYear || 0;

          var oceanRevenue = d.oceanRevenue || 0;

          var oceanBycatch = d.oceanBycatch || 0;

          var oceanCollapsed = d.oceanCollapsed || false;

          var oceanScenario = d.oceanScenario || null;



          // ── Marine Science state ──

          var selectedZone = d.selectedZone || null;

          var selectedSpecies = d.selectedSpecies || null;

          var quizActive = d.quizActive || false;

          var quizScore = d.quizScore || { correct: 0, total: 0 };

          var quizQ = d.quizQ || null;





          // ── Chemistry educational data ──

          var CHEM_INFO = {

            pH: {

              name: 'pH (Power of Hydrogen)',

              icon: '\u2697\uFE0F',

              what: 'A measure of how acidic or basic the water is. The scale runs 0-14, where 7 is neutral. Each whole number change represents a 10x difference in hydrogen ion concentration.',

              safeRange: 'Depends on species — freshwater: 6.5-7.5, African cichlids: 7.8-8.6, marine: 8.1-8.4',

              danger: 'Rapid pH swings > 0.5 in 24h cause osmotic stress. Fish gills struggle to regulate ion exchange, leading to respiratory distress.',

              math: function (wc, tank) {

                var diff = Math.abs(wc.pH - tank.pH);

                return 'Target: ' + tank.pH.toFixed(1) + ' | Current deviation: ' + diff.toFixed(2) + ' units\nA pH of ' + wc.pH.toFixed(1) + ' means [H\u207A] = 10\u207B' + wc.pH.toFixed(1) + ' mol/L';

              },

              fix: 'Partial water changes gradually bring pH toward target. Never adjust more than 0.2 units per day.'

            },

            temp: {

              name: 'Temperature',

              icon: '\uD83C\uDF21\uFE0F',

              what: 'Fish are ectotherms — their metabolism is controlled by water temperature. Higher temps increase metabolism, oxygen demand, and ammonia toxicity.',

              safeRange: 'Tropical: 75-82\u00B0F (24-28\u00B0C), Coldwater: 60-72\u00B0F (16-22\u00B0C), Marine: 76-82\u00B0F (24-28\u00B0C)',

              danger: 'Every 10\u00B0F increase roughly doubles metabolic rate. Ammonia toxicity increases 10x between 68\u00B0F and 86\u00B0F.',

              math: function (wc, tank) {

                var diff = Math.abs(wc.temp - tank.temp);

                var celsius = ((wc.temp - 32) * 5 / 9).toFixed(1);

                return 'Current: ' + wc.temp.toFixed(1) + '\u00B0F (' + celsius + '\u00B0C) | Target: ' + tank.temp + '\u00B0F\nDeviation: \u00B1' + diff.toFixed(1) + '\u00B0F';

              },

              fix: 'Adjust heater gradually — no more than 2\u00B0F per hour. Rapid changes cause thermal shock.'

            },

            ammonia: {

              name: 'Ammonia (NH\u2083/NH\u2084\u207A)',

              icon: '\u2620\uFE0F',

              what: 'The primary waste product from fish gills and decomposing food. In its un-ionized form (NH\u2083), it is extremely toxic to fish even at low concentrations.',

              safeRange: '0 ppm ideal | < 0.25 ppm tolerable | 0.25-1.0 ppm stressful | > 1.0 ppm lethal',

              danger: 'Ammonia burns gill tissue, causing fish to gasp at the surface. At > 1 ppm, irreversible gill damage occurs within hours.',

              math: function (wc, tank, bioload, fishCount) {

                var gen = bioload * 0.02;

                var converted = wc.ammonia * 0.15;

                return 'Generation: ' + fishCount + ' fish \u00D7 bioload = ' + gen.toFixed(3) + ' ppm/tick\nBacteria (Nitrosomonas) convert: ' + wc.ammonia.toFixed(2) + ' \u00D7 15% = ' + converted.toFixed(3) + ' ppm \u2192 NO\u2082\nNet change: +' + (gen - wc.ammonia * 0.05).toFixed(3) + ' ppm/tick';

              },

              fix: 'Immediate 25% water change. Reduce feeding. Add beneficial bacteria supplement. Do NOT add more fish.'

            },

            nitrite: {

              name: 'Nitrite (NO\u2082\u207B)',

              icon: '\u26A0\uFE0F',

              what: 'Produced by Nitrosomonas bacteria converting ammonia. Still toxic — it binds to hemoglobin, reducing oxygen-carrying capacity (brown blood disease).',

              safeRange: '0 ppm ideal | < 0.25 ppm tolerable | 0.25-1.0 ppm dangerous | > 1.0 ppm critical',

              danger: 'Nitrite replaces oxygen on hemoglobin molecules. Fish blood turns brown and cannot carry O\u2082. Gills appear dark/chocolate colored.',

              math: function (wc, tank) {

                var fromAmmonia = wc.ammonia * 0.15;

                var converted = wc.nitrite * 0.08;

                var toNitrate = wc.nitrite * 0.2;

                return 'Input from NH\u2083: ' + fromAmmonia.toFixed(3) + ' ppm/tick\nNatural decay: ' + converted.toFixed(3) + ' ppm/tick\nConverted to NO\u2083 by Nitrobacter: ' + toNitrate.toFixed(3) + ' ppm/tick';

              },

              fix: 'Water change + add aquarium salt (1 tsp/gal) to block nitrite absorption through gills.'

            },

            nitrate: {

              name: 'Nitrate (NO\u2083\u207B)',

              icon: '\uD83C\uDF3F',

              what: 'The end product of the nitrogen cycle. Much less toxic than ammonia or nitrite, but accumulates over time. Live plants absorb nitrate as fertilizer.',

              safeRange: '< 20 ppm excellent | < 40 ppm acceptable | 40-80 ppm high | > 80 ppm water change needed',

              danger: 'Chronic high nitrate (> 40 ppm) suppresses immune function and stunts growth. Promotes algae blooms that consume oxygen at night.',

              math: function (wc) {

                var fromNitrite = wc.nitrite * 0.2;

                return 'Input from NO\u2082: ' + fromNitrite.toFixed(3) + ' ppm/tick\nAccumulation: ' + wc.nitrate.toFixed(1) + ' ppm total\nOnly removed by: water changes or live plants';

              },

              fix: 'Regular 25% weekly water changes. Add fast-growing plants (hornwort, pothos). Reduce fish load.'

            },

            salinity: {

              name: 'Salinity',

              icon: '\uD83E\uDDC2',

              what: 'The concentration of dissolved salts (primarily NaCl). Freshwater fish maintain internal salt levels higher than their environment; marine fish do the opposite.',

              safeRange: 'Freshwater: 0 ppt | Brackish: 5-15 ppt | Marine: 34-36 ppt',

              danger: 'Incorrect salinity disrupts osmoregulation. Fish cells either swell (too fresh) or shrink (too salty), damaging organs.',

              math: function (wc) {

                return 'Current: ' + wc.salinity + ' ppt (parts per thousand)\n1 ppt = 1g salt per 1000g water\nSeawater: ~35 ppt = 3.5% salt by weight';

              },

              fix: 'Adjust slowly through water changes with correctly mixed water. Never change > 2 ppt per day.'

            },

            dissolvedO2: {

              name: 'Dissolved Oxygen (O\u2082)',

              icon: '\uD83D\uDCA8',

              what: 'The amount of gaseous oxygen dissolved in the water. Fish breathe by passing water over their gills to extract O\u2082. Plants produce O\u2082 during photosynthesis (daytime) and consume it at night during respiration.',

              safeRange: '> 6 mg/L ideal | 5-6 mg/L acceptable | 3-5 mg/L stressful | < 3 mg/L lethal',

              danger: 'Low O\u2082 causes fish to gasp at the surface. Oxygen-starved water becomes anaerobic, producing toxic hydrogen sulfide (H\u2082S) in the substrate.',

              math: function (wc, tank, bioload, fishCount) {

                var fishUse = bioload * 0.05;

                return 'Fish O\u2082 consumption: ' + bioload + ' bioload \u00D7 0.05 = ' + fishUse.toFixed(2) + ' mg/L/tick\nCurrent dissolved O\u2082: ' + wc.dissolvedO2.toFixed(2) + ' mg/L\nPlants produce O\u2082 during daylight, consume at night\nSurface exchange equilibrates toward ~7 mg/L';

              },

              fix: 'Add an air pump/airstone. Increase surface agitation. Add live plants. Reduce fish stocking.'

            },

            co2: {

              name: 'Carbon Dioxide (CO\u2082)',

              icon: '\uD83C\uDF2B\uFE0F',

              what: 'Fish exhale CO\u2082 as a waste product of metabolism. Plants need CO\u2082 for photosynthesis. Excess CO\u2082 dissolves in water to form carbonic acid (H\u2082CO\u2083), lowering pH.',

              safeRange: '< 15 mg/L safe for fish | 15-25 mg/L moderate | 25-35 mg/L dangerous | > 35 mg/L lethal',

              danger: 'High CO\u2082 causes respiratory distress \u2014 fish cannot expel CO\u2082 from their blood when water CO\u2082 is high. Also suppresses pH, creating acidic conditions.',

              math: function (wc, tank, bioload) {

                var fishProduce = bioload * 0.04;

                return 'Fish CO\u2082 production: ' + bioload + ' bioload \u00D7 0.04 = ' + fishProduce.toFixed(2) + ' mg/L/tick\nCurrent CO\u2082: ' + wc.co2.toFixed(2) + ' mg/L\nPlants consume CO\u2082 during daylight\nExcess off-gasses to atmosphere slowly';

              },

              fix: 'Increase surface agitation to off-gas CO\u2082. Reduce fish stocking. Plants consume CO\u2082 during the day but produce it at night.'

            }

          };

          // ── Tank setup helpers ──


          // ═══ ECONOMY & PROGRESSION FUNCTIONS ═══

          var earnCoins = function (amount, reason) {
            if (amount <= 0) return;
            var newCoins = coins + amount;
            var newTotal = totalCoinsEarned + amount;
            updMulti({ coins: newCoins, totalCoinsEarned: newTotal });
            if (addToast) addToast('\uD83D\uDCB0 +' + amount + ' coins: ' + reason, 'success');
            if (newTotal >= 100 && !unlockedAchievements['coin_100']) {
              unlockAchievement('coin_100');
            }
          };

          var spendCoins = function (amount) {
            if (coins < amount) return false;
            upd('coins', coins - amount);
            return true;
          };

          var getSpeciesCost = function (speciesId) {
            return SPECIES_COST[speciesId] !== undefined ? SPECIES_COST[speciesId] : 20;
          };

          var canAffordSpecies = function (speciesId) {
            return coins >= getSpeciesCost(speciesId);
          };

          var unlockAchievement = function (id) {
            if (unlockedAchievements[id]) return;
            var ach = ACHIEVEMENTS.find(function (a) { return a.id === id; });
            if (!ach) return;
            var newAch = Object.assign({}, unlockedAchievements);
            newAch[id] = { unlockedAt: Date.now() };
            var newCoins = coins + ach.coins;
            var newTotal = totalCoinsEarned + ach.coins;
            updMulti({ unlockedAchievements: newAch, coins: newCoins, totalCoinsEarned: newTotal });
            if (addToast) addToast(ach.icon + ' Achievement: ' + ach.name + ' (+' + ach.coins + ' coins)', 'success');
            if (stemCelebrate) stemCelebrate();
          };

          var checkAchievements = function (context) {
            if (context === 'add_fish' && tankFish.length === 0 && !unlockedAchievements['first_fish']) {
              setTimeout(function () { unlockAchievement('first_fish'); }, 500);
            }
            if (context === 'add_fish') {
              var unique = {};
              tankFish.forEach(function (f) { unique[f] = true; });
              if (Object.keys(unique).length >= 5 && !unlockedAchievements['five_species']) {
                unlockAchievement('five_species');
              }
              var tank = TANK_TYPES.find(function (t) { return t.id === selectedTank; });
              if (tank) {
                var load = tankFish.reduce(function (s, f) {
                  var sp = (SPECIES_BY_TANK[selectedTank] || []).find(function (x) { return x.id === f; });
                  return s + (sp ? sp.load : 0);
                }, 0);
                if (load / Math.floor(tank.size / 2) >= 0.8 && !unlockedAchievements['full_tank']) {
                  unlockAchievement('full_tank');
                }
              }
            }
            if (context === 'add_plant' && tankPlants.length >= 4 && !unlockedAchievements['plant_master']) {
              unlockAchievement('plant_master');
            }
            if (context === 'upgrade' && !unlockedAchievements['first_upgrade']) {
              unlockAchievement('first_upgrade');
            }
            if (context === 'upgrade') {
              if (equipment.filter >= 2 && equipment.heater >= 2 && equipment.light >= 2 && equipment.airPump >= 2 && !unlockedAchievements['all_equipment']) {
                unlockAchievement('all_equipment');
              }
            }
            if (context === 'medicate' && !unlockedAchievements['disease_cure']) {
              unlockAchievement('disease_cure');
            }
            if (context === 'anatomy' && Object.keys(anatomiesStudied).length >= 5 && !unlockedAchievements['anatomy_5']) {
              unlockAchievement('anatomy_5');
            }
          };

          var buyEquipment = function (type) {
            var currentLevel = equipment[type] || 0;
            var catalog = EQUIPMENT_CATALOG[type];
            if (!catalog) return;
            var nextLevel = currentLevel + 1;
            if (nextLevel >= catalog.levels.length) {
              if (addToast) addToast(catalog.icon + ' ' + catalog.name + ' is already at max level!', 'info');
              return;
            }
            var upgrade = catalog.levels[nextLevel];
            if (coins < upgrade.cost) {
              if (addToast) addToast('\u274C Need ' + upgrade.cost + ' coins for ' + upgrade.name + ' (have ' + coins + ')', 'warning');
              return;
            }
            var newEquip = Object.assign({}, equipment);
            newEquip[type] = nextLevel;
            var newCoins = coins - upgrade.cost;
            updMulti({ equipment: newEquip, coins: newCoins, eventLog: eventLog.concat([{ tick: simTick, msg: '\u2B06\uFE0F Upgraded ' + catalog.name + ' to ' + upgrade.name }]) });
            if (addToast) addToast(catalog.icon + ' Upgraded to ' + upgrade.name + '!', 'success');
            if (stemBeep) stemBeep();
            checkAchievements('upgrade');
          };

          var advanceTutorial = function () {
            if (tutorialStep < TUTORIAL_STEPS.length - 1) {
              upd('tutorialStep', tutorialStep + 1);
            } else {
              upd('tutorialDismissed', true);
            }
          };

          var dismissTutorial = function () {
            upd('tutorialDismissed', true);
          };

          var initTank = function (tankId) {

            var tank = TANK_TYPES.find(function (t) { return t.id === tankId; });

            if (!tank) return;

            updMulti({

              selectedTank: tankId,

              tankFish: [],

              waterChem: { pH: tank.pH, temp: tank.temp, ammonia: 0, nitrite: 0, nitrate: 5, salinity: tank.salinity, dissolvedO2: 7.0, co2: 3.0 },

              simTick: 0, simRunning: false, fishHealth: {}, eventLog: [{ tick: 0, msg: '🐠 ' + tank.name + ' tank initialized!' }],

              tankPlants: [], plantHealth: {}, plantBiomass: {},

              breedingState: {}, breedingCooldowns: {}, totalFryBorn: 0,
              equipment: equipment.filter !== undefined ? equipment : { filter: 0, heater: 0, light: 0, airPump: 0 },
              perfectWaterTicks: 0, algaeLevel: 0, fishSickness: {}, fishStress: {},
              hungerLevels: {}, simDay: 0, simHour: 8, lightsOn: true

            });

          };



          var addFish = function (speciesId) {

            var tank = TANK_TYPES.find(function (t) { return t.id === selectedTank; });

            var species = (SPECIES_BY_TANK[selectedTank] || []).find(function (s) { return s.id === speciesId; });

            if (!tank || !species) return;

            var currentLoad = tankFish.reduce(function (sum, f) {

              var sp = (SPECIES_BY_TANK[selectedTank] || []).find(function (s) { return s.id === f; });

              return sum + (sp ? sp.load : 0);

            }, 0);

            var maxLoad = Math.floor(tank.size / 2);

            if (currentLoad + species.load > maxLoad) {

              if (addToast) addToast('⚠️ Tank is at capacity! Bioload would exceed safe limits.', 'warning');

              return;

            }

            var newFish = tankFish.concat([speciesId]);

            var newHealth = Object.assign({}, fishHealth);

            newHealth[speciesId] = (newHealth[speciesId] || 0) + 1;

            var newHunger = Object.assign({}, hungerLevels);

            if (newHunger[speciesId] === undefined) newHunger[speciesId] = 50;

            updMulti({ tankFish: newFish, fishHealth: newHealth, hungerLevels: newHunger, eventLog: eventLog.concat([{ tick: simTick, msg: '🐟 Added ' + species.name + ' to tank' }]) });

          };



          var removeFish = function (idx) {

            var newFish = tankFish.slice();

            var removed = newFish.splice(idx, 1)[0];

            var sp = (SPECIES_BY_TANK[selectedTank] || []).find(function (s) { return s.id === removed; });

            updMulti({ tankFish: newFish, eventLog: eventLog.concat([{ tick: simTick, msg: '🔄 Removed ' + (sp ? sp.name : removed) }]) });

          };



          // ── Plant management helpers ──

          var addPlant = function (plantId) {

            var plantCatalog = getPlantsForTank(selectedTank);

            var plant = plantCatalog.find(function (p) { return p.id === plantId; });

            if (!plant) return;

            // Max 8 plant slots

            if (tankPlants.length >= 8) {

              if (addToast) addToast('🌿 Maximum plant slots reached! Remove a plant first.', 'warning');

              return;

            }

            var newPlants = tankPlants.concat([plantId]);

            var newPH = Object.assign({}, plantHealth);

            newPH[plantId] = newPH[plantId] !== undefined ? newPH[plantId] : 80; // start healthy

            var newPB = Object.assign({}, plantBiomass);

            newPB[plantId] = newPB[plantId] !== undefined ? newPB[plantId] : 1; // start at size 1

            updMulti({

              tankPlants: newPlants,

              plantHealth: newPH,

              plantBiomass: newPB,

              eventLog: eventLog.concat([{ tick: simTick, msg: '🌿 Planted ' + plant.name }])

            });

            awardStemXP('aquarium', 3, 'Planted ' + plant.name);

          };



          var removePlant = function (idx) {

            var newPlants = tankPlants.slice();

            var removed = newPlants.splice(idx, 1)[0];

            var plantCatalog = getPlantsForTank(selectedTank);

            var plant = plantCatalog.find(function (p) { return p.id === removed; });

            updMulti({

              tankPlants: newPlants,

              eventLog: eventLog.concat([{ tick: simTick, msg: '🔄 Removed ' + (plant ? plant.name : removed) }])

            });

          };



          // ── Water chemistry helpers ──

          var getChemStatus = function (param, value) {

            var tank = TANK_TYPES.find(function (t) { return t.id === selectedTank; });

            if (!tank) return 'ok';

            if (param === 'ammonia') return value < 0.25 ? 'ok' : value < 1.0 ? 'warn' : 'danger';

            if (param === 'nitrite') return value < 0.25 ? 'ok' : value < 1.0 ? 'warn' : 'danger';

            if (param === 'nitrate') return value < 40 ? 'ok' : value < 80 ? 'warn' : 'danger';

            if (param === 'dissolvedO2') return value > 5.0 ? 'ok' : value > 3.0 ? 'warn' : 'danger';

            if (param === 'co2') return value < 25 ? 'ok' : value < 35 ? 'warn' : 'danger';

            if (param === 'pH') {

              var diff = Math.abs(value - tank.pH);

              return diff < 0.5 ? 'ok' : diff < 1.0 ? 'warn' : 'danger';

            }

            if (param === 'temp') {

              var tdiff = Math.abs(value - tank.temp);

              return tdiff < 3 ? 'ok' : tdiff < 6 ? 'warn' : 'danger';

            }

            return 'ok';

          };



          var statusIcon = function (s) { return s === 'ok' ? '✅' : s === 'warn' ? '⚠️' : '❌'; };

          var statusColor = function (s) { return s === 'ok' ? 'text-green-600' : s === 'warn' ? 'text-amber-600' : 'text-red-600'; };



          var doWaterChange = function () {

            if (!waterChem) return;

            var tank = TANK_TYPES.find(function (t) { return t.id === selectedTank; });

            var newChem = Object.assign({}, waterChem, {

              ammonia: Math.max(0, waterChem.ammonia * 0.5),

              nitrite: Math.max(0, waterChem.nitrite * 0.5),

              nitrate: Math.max(0, waterChem.nitrate * 0.6),

              pH: waterChem.pH + (tank.pH - waterChem.pH) * 0.3

            });

            updMulti({ waterChem: newChem, eventLog: eventLog.concat([{ tick: simTick, msg: '💧 25% water change performed' }]) });

            if (addToast) addToast('💧 Water change complete!', 'success');

          };



          var feedFish = function () {

            if (!waterChem) return;

            var newChem = Object.assign({}, waterChem, {

              ammonia: waterChem.ammonia + 0.15 * (tankFish.length || 1),

            });

            // Reduce hunger for all fish and track feeding impact

            var newHunger = Object.assign({}, hungerLevels);

            var totalDrop = 0;

            var overfedCount = 0;

            tankFish.forEach(function (fId) {

              var cur = newHunger[fId] !== undefined ? newHunger[fId] : 50;

              if (cur < 15) { overfedCount++; }

              var drop = Math.min(cur, 35);

              totalDrop += drop;

              newHunger[fId] = Math.max(0, cur - drop);

            });

            var avgDrop = tankFish.length > 0 ? Math.round(totalDrop / tankFish.length) : 0;

            var tips = [

              'Feed small amounts 2-3 times daily. Fish stomachs are roughly the size of their eyes!',

              'Uneaten food decomposes into ammonia. Remove leftovers after 3 minutes.',

              'Overfeeding is the #1 cause of poor water quality in aquariums.',

              'Bottom feeders like corydoras eat leftover food — nature\'s cleanup crew!',

              'In the wild, fish may go days without food. Don\'t panic if you miss a feeding.'

            ];

            updMulti({

              waterChem: newChem,

              hungerLevels: newHunger,

              feedingLog: { fishCount: tankFish.length, avgHungerDrop: avgDrop, ammoniaAdded: 0.15 * (tankFish.length || 1), overfedCount: overfedCount, tip: tips[Math.floor(Math.random() * tips.length)] },

              eventLog: eventLog.concat([{ tick: simTick, msg: '🍽️ Fish fed — hunger reduced by ' + avgDrop + ' avg' }])

            });

          };



          // ── Live Feed (for carnivores) ──

          var feedLive = function () {

            if (!waterChem) return;

            var newChem = Object.assign({}, waterChem, {

              ammonia: waterChem.ammonia + 0.22 * (tankFish.length || 1)

            });

            var newHunger = Object.assign({}, hungerLevels);

            var fedCarnivores = 0;

            var ignoredHerbivores = 0;

            tankFish.forEach(function (fId) {

              var diet = SPECIES_DIET[fId] || 'omnivore';

              var cur = newHunger[fId] !== undefined ? newHunger[fId] : 50;

              if (diet === 'carnivore') {

                newHunger[fId] = Math.max(0, cur - 45);

                fedCarnivores++;

              } else if (diet === 'omnivore') {

                newHunger[fId] = Math.max(0, cur - 20);

              } else {

                ignoredHerbivores++;

              }

            });

            var tipText = fedCarnivores > 0

              ? '\uD83E\uDD69 Live food satisfies carnivores like pike and oscar. Herbivores like plecos ignore it — they need algae wafers!'

              : '\uD83E\uDD14 No carnivores in tank! Live food was wasted. Try flake/pellet feed instead.';

            updMulti({

              waterChem: newChem,

              hungerLevels: newHunger,

              feedingLog: { fishCount: tankFish.length, avgHungerDrop: fedCarnivores > 0 ? 45 : 0, ammoniaAdded: 0.22 * (tankFish.length || 1), overfedCount: 0, tip: tipText },

              eventLog: eventLog.concat([{ tick: simTick, msg: '\uD83E\uDD90 Live feed added — ' + fedCarnivores + ' carnivores fed' + (ignoredHerbivores > 0 ? ', ' + ignoredHerbivores + ' ignored it' : '') }])

            });

          };



          // ── Toggle Lights ──

          var toggleLights = function () {

            var newState = !lightsOn;

            var msg = newState ? '\uD83D\uDCA1 Lights turned ON' : '\uD83C\uDF19 Lights turned OFF — fish will rest';

            updMulti({

              lightsOn: newState,

              eventLog: eventLog.concat([{ tick: simTick, msg: msg }])

            });

            if (addToast) addToast(msg, 'info');

          };



          // ── Medicate Fish ──

          var medicateFish = function () {

            if (!waterChem) return;

            var sickCount = Object.keys(fishSickness).length;

            if (sickCount === 0) {

              if (addToast) addToast('\uD83D\uDC8A No sick fish detected. Unnecessary medication harms beneficial bacteria!', 'warning');

              return;

            }

            // Medication clears mild/moderate, reduces severe to moderate

            var newSickness = Object.assign({}, fishSickness);

            var cured = 0;

            Object.keys(newSickness).forEach(function (fId) {

              if (newSickness[fId].severity <= 2) {

                delete newSickness[fId];

                cured++;

              } else {

                newSickness[fId] = Object.assign({}, newSickness[fId], { severity: 2 });

              }

            });

            // Medication kills some beneficial bacteria — ammonia spike

            var newChem = Object.assign({}, waterChem, {

              ammonia: waterChem.ammonia + 0.25

            });

            updMulti({

              fishSickness: newSickness,

              waterChem: newChem,

              eventLog: eventLog.concat([{ tick: simTick, msg: '\uD83D\uDC8A Medication applied — ' + cured + ' fish cured. Beneficial bacteria reduced.' }])

            });

            if (addToast) addToast('\uD83D\uDC8A Treated ' + cured + ' fish. Watch ammonia — medication disrupts the nitrogen cycle.', cured > 0 ? 'success' : 'warning');

          };



          // ── Clean Glass ──

          var cleanGlass = function () {

            var newAlgae = Math.max(0, algaeLevel - 40);

            var newChem = waterChem ? Object.assign({}, waterChem, { nitrate: Math.max(0, waterChem.nitrate - 3) }) : waterChem;

            updMulti({

              algaeLevel: newAlgae,

              waterChem: newChem,

              eventLog: eventLog.concat([{ tick: simTick, msg: '\uD83E\uDDF9 Glass cleaned — algae removed' }])

            });

            if (addToast) addToast('\uD83E\uDDF9 Glass cleaned! Algae level: ' + newAlgae + '%', 'success');

          };



          // ── Simulation tick (water chemistry drift) ──

          // Uses functional state update to always read fresh state (avoids stale closures)

          var simStep = function () {

            setLabToolData(function (prev) {

              var aq = Object.assign({}, (prev && prev._aquarium) || {});

              if (!aq.waterChem || !aq.selectedTank) return prev;

              var _tankFish = aq.tankFish || [];

              var _hungerLevels = aq.hungerLevels || {};

              var _eventLog = aq.eventLog || [];

              var _simTick = aq.simTick || 0;

              var _simDay = aq.simDay || 0;

              var _simHour = aq.simHour || 8;

              var _fishSickness = aq.fishSickness || {};

              var _fishStress = aq.fishStress || {};

              var _lightsOn = aq.lightsOn !== undefined ? aq.lightsOn : true;

              var _algaeLevel = aq.algaeLevel || 0;

              var _selectedTank = aq.selectedTank;

              var _waterChem = aq.waterChem;

              // ── Plant state ──

              var _tankPlants = aq.tankPlants || [];

              var _plantHealth = Object.assign({}, aq.plantHealth || {});

              var _plantBiomass = Object.assign({}, aq.plantBiomass || {});

              var _dissolvedO2 = _waterChem.dissolvedO2 !== undefined ? _waterChem.dissolvedO2 : 7.0;

              var _co2 = _waterChem.co2 !== undefined ? _waterChem.co2 : 3.0;

              var plantCatalog = getPlantsForTank(_selectedTank);

              // ── Breeding state ──

              var _breedingState = Object.assign({}, aq.breedingState || {});

              var _breedingCooldowns = Object.assign({}, aq.breedingCooldowns || {});

              var _totalFryBorn = aq.totalFryBorn || 0;

              var breedingChanged = false;

              var bioload = _tankFish.reduce(function (sum, f) {

                var sp = (SPECIES_BY_TANK[_selectedTank] || []).find(function (s) { return s.id === f; });

                return sum + (sp ? sp.load : 0);

              }, 0);

              var ammoniaGen = bioload * 0.02;

              var newAmm = Math.max(0, _waterChem.ammonia + ammoniaGen - _waterChem.ammonia * 0.05);

              var nitriteBact = _waterChem.ammonia * 0.15;

              var newNitrite = Math.max(0, _waterChem.nitrite + nitriteBact - _waterChem.nitrite * 0.08);

              var nitrateBact = _waterChem.nitrite * 0.2;

              var newNitrate = Math.max(0, _waterChem.nitrate + nitrateBact);

              // ── Fish respiration: consume O2, produce CO2 ──

              // Each unit of bioload consumes ~0.05 mg/L O2 and produces ~0.04 mg/L CO2 per tick

              var fishO2Consume = bioload * 0.05;

              var fishCO2Produce = bioload * 0.04;

              var deltaO2 = -fishO2Consume;

              var deltaCO2 = fishCO2Produce;

              // ── Plant photosynthesis & respiration ──

              // Day cycle: if lights are on AND it's daytime (6-20), plants photosynthesize

              var isDaylight = _lightsOn && (_simHour >= 6 && _simHour < 20);

              var plantNitrateAbsorb = 0;

              var plantChanged = false;

              _tankPlants.forEach(function (pId) {

                var pDef = plantCatalog.find(function (p) { return p.id === pId; });

                if (!pDef) return;

                var health = _plantHealth[pId] !== undefined ? _plantHealth[pId] : 80;

                var biomass = _plantBiomass[pId] !== undefined ? _plantBiomass[pId] : 1;

                var healthFactor = health / 100; // 0-1

                var biomassFactor = biomass / pDef.maxSize; // 0-1 relative to max

                if (isDaylight) {

                  // Photosynthesis: produce O2, consume CO2 & nitrate

                  // Scaled by health, biomass, and light requirements

                  var lightEff = 1.0;

                  if (pDef.light === 'high' && _algaeLevel > 50) lightEff = 0.6; // algae blocks light

                  if (pDef.light === 'low') lightEff = 1.0; // low-light plants always fine

                  var photoRate = healthFactor * biomassFactor * lightEff;

                  deltaO2 += pDef.o2 * photoRate;

                  deltaCO2 -= pDef.co2Need * photoRate;

                  plantNitrateAbsorb += pDef.nitrateAbsorb * photoRate;

                } else {

                  // Night respiration: plants consume a small amount of O2 and release CO2

                  deltaO2 -= pDef.o2 * 0.15 * biomassFactor;

                  deltaCO2 += pDef.co2Need * 0.1 * biomassFactor;

                }

                // ── Plant health update ──

                var healthDelta = 0;

                // Good conditions: adequate light, nutrients, CO2

                if (isDaylight && newNitrate > 5 && _co2 > 2) {

                  healthDelta += 1; // thriving

                }

                // Bad: no light when needed

                if (!isDaylight && pDef.light === 'high') healthDelta -= 0.5;

                // Bad: very low nitrates (no nutrients)

                if (newNitrate < 2) healthDelta -= 1;

                // Bad: very low CO2

                if (_co2 < 1) healthDelta -= 0.5;

                // Bad: extreme ammonia damages plants too

                if (newAmm > 2) healthDelta -= 1;

                // Bad: very low O2 (anaerobic stress)

                if (_dissolvedO2 < 2) healthDelta -= 1.5;

                _plantHealth[pId] = Math.max(0, Math.min(100, health + healthDelta));

                // ── Plant growth ──

                if (health > 40 && isDaylight && newNitrate > 3) {

                  _plantBiomass[pId] = Math.min(pDef.maxSize, biomass + pDef.growth * healthFactor);

                } else if (health <= 20) {

                  // Dying plants lose biomass

                  _plantBiomass[pId] = Math.max(0, biomass - 0.02);

                }

                plantChanged = true;

              });

              // Apply plant nitrate absorption

              newNitrate = Math.max(0, newNitrate - plantNitrateAbsorb);

              // Atmospheric O2 exchange (surface equilibration toward ~7 mg/L)

              var surfaceExchange = (_dissolvedO2 < 7 ? 0.15 : -0.05);

              deltaO2 += surfaceExchange;

              var newO2 = Math.max(0, Math.min(14, _dissolvedO2 + deltaO2));

              var newCO2 = Math.max(0, Math.min(50, _co2 + deltaCO2));

              // CO2 atmospheric off-gassing (tendency toward ~3 mg/L)

              if (newCO2 > 3) newCO2 -= Math.min(0.1, (newCO2 - 3) * 0.05);

              var pHdrift = (Math.random() - 0.5) * 0.05;

              // CO2 influences pH: high CO2 lowers pH (carbonic acid)

              if (newCO2 > 10) pHdrift -= 0.02;

              if (newCO2 > 25) pHdrift -= 0.03;

              var tempDrift = (Math.random() - 0.5) * 0.3;

              var newChem = {

                pH: Math.max(5.5, Math.min(9.0, _waterChem.pH + pHdrift)),

                temp: Math.max(40, Math.min(95, _waterChem.temp + tempDrift)),

                ammonia: Math.round(newAmm * 100) / 100,

                nitrite: Math.round(newNitrite * 100) / 100,

                nitrate: Math.round(newNitrate * 10) / 10,

                salinity: _waterChem.salinity,

                dissolvedO2: Math.round(newO2 * 100) / 100,

                co2: Math.round(newCO2 * 100) / 100

              };

              var newTick = _simTick + 1;

              // Advance time: each tick = 1 hour

              var newHour = _simHour + 1;

              var newDay = _simDay;

              if (newHour >= 24) { newHour = 0; newDay++; }

              // ═══ DAILY COIN REWARD (when day advances) ═══
              if (newHour === 0) {
                var _tankHealth = 0;
                if (wc.ammonia < 0.5) _tankHealth += 25;
                if (wc.nitrite < 0.3) _tankHealth += 25;
                if (wc.nitrate < 40) _tankHealth += 25;
                var _avgH = 0; var _hKeys = Object.keys(_hungerLevels || {});
                _hKeys.forEach(function (k) { _avgH += (_hungerLevels[k] || 50); });
                if (_hKeys.length > 0) _avgH = _avgH / _hKeys.length;
                if (_avgH < 70) _tankHealth += 25;
                var _dc = _tankHealth >= 75 ? 3 : _tankHealth >= 50 ? 2 : _tankHealth >= 25 ? 1 : 0;
                if (_finalTankFish.length > 0 && _dc > 0) {
                  aq.coins = (aq.coins || 0) + _dc;
                  aq.totalCoinsEarned = (aq.totalCoinsEarned || 0) + _dc;
                  newLog.push({ tick: newTick, msg: '\uD83D\uDCB0 Daily: +' + _dc + ' coins (health ' + _tankHealth + '%)' });
                }
                // Day milestones
                if (newDay === 30 && !(aq.unlockedAchievements || {})['day_30']) {
                  aq.unlockedAchievements = Object.assign({}, aq.unlockedAchievements || {});
                  aq.unlockedAchievements['day_30'] = { unlockedAt: Date.now() };
                  var _a30 = ACHIEVEMENTS.find(function (a) { return a.id === 'day_30'; });
                  if (_a30) { aq.coins = (aq.coins || 0) + _a30.coins; aq.totalCoinsEarned = (aq.totalCoinsEarned || 0) + _a30.coins; }
                  newLog.push({ tick: newTick, msg: '\u2B50 Achievement: Dedicated Keeper! (Day 30)' });
                }
                if (newDay === 100 && !(aq.unlockedAchievements || {})['day_100']) {
                  aq.unlockedAchievements = Object.assign({}, aq.unlockedAchievements || {});
                  aq.unlockedAchievements['day_100'] = { unlockedAt: Date.now() };
                  var _a100 = ACHIEVEMENTS.find(function (a) { return a.id === 'day_100'; });
                  if (_a100) { aq.coins = (aq.coins || 0) + _a100.coins; aq.totalCoinsEarned = (aq.totalCoinsEarned || 0) + _a100.coins; }
                  newLog.push({ tick: newTick, msg: '\uD83C\uDFC6 Achievement: Master Aquarist! (Day 100)' });
                }
              }
              // Perfect water tracking
              var _safe = wc.ammonia < 0.25 && wc.nitrite < 0.25 && wc.nitrate < 40 && Math.abs(wc.pH - tank.pH) < 0.5;
              aq.perfectWaterTicks = _safe ? (aq.perfectWaterTicks || 0) + 1 : 0;
              if (aq.perfectWaterTicks >= 20 && !(aq.unlockedAchievements || {})['perfect_water']) {
                aq.unlockedAchievements = Object.assign({}, aq.unlockedAchievements || {});
                aq.unlockedAchievements['perfect_water'] = { unlockedAt: Date.now() };
                var _apw = ACHIEVEMENTS.find(function (a) { return a.id === 'perfect_water'; });
                if (_apw) { aq.coins = (aq.coins || 0) + _apw.coins; aq.totalCoinsEarned = (aq.totalCoinsEarned || 0) + _apw.coins; }
                newLog.push({ tick: newTick, msg: '\uD83D\uDCA7 Achievement: Crystal Clear!' });
              }

              var newLog = _eventLog.slice();

              // XP for maintaining healthy parameters

              var allOk = getChemStatus('ammonia', newChem.ammonia) === 'ok' &&

                getChemStatus('nitrite', newChem.nitrite) === 'ok' &&

                getChemStatus('pH', newChem.pH) === 'ok';

              if (allOk && _tankFish.length > 0 && newTick % 5 === 0) {

                awardStemXP('aquarium', 2, 'Healthy tank maintenance');

              }

              // Increase hunger each simulation tick

              var newHunger = Object.assign({}, _hungerLevels);

              _tankFish.forEach(function (fId) {

                var cur = newHunger[fId] !== undefined ? newHunger[fId] : 50;

                newHunger[fId] = Math.min(100, cur + 2);

              });

              // ── Disease progression ──

              var newSickness = Object.assign({}, _fishSickness);

              var sickChanged = false;

              if (_waterChem.ammonia > 0.8 && Math.random() < 0.15 && _tankFish.length > 0) {

                var victim = _tankFish[Math.floor(Math.random() * _tankFish.length)];

                if (!newSickness[victim]) {

                  var diseases = ['ich', 'fin_rot', 'velvet', 'dropsy'];

                  newSickness[victim] = { disease: diseases[Math.floor(Math.random() * diseases.length)], severity: 1, tick: newTick };

                  sickChanged = true;

                  newLog.push({ tick: newTick, msg: '\u26A0\uFE0F A fish is showing signs of illness!' });

                }

              }

              Object.keys(newSickness).forEach(function (fId) {

                if (newSickness[fId] && newTick - newSickness[fId].tick > 10 && newSickness[fId].severity < 3) {

                  newSickness[fId] = Object.assign({}, newSickness[fId], { severity: newSickness[fId].severity + 1, tick: newTick });

                  sickChanged = true;

                }

              });

              // ── Hunger consequences ──

              var species = SPECIES_BY_TANK[_selectedTank] || [];

              var fishToRemove = [];

              var newStress = Object.assign({}, _fishStress);

              _tankFish.forEach(function (fId, idx) {

                var hunger = newHunger[fId] !== undefined ? newHunger[fId] : 50;

                if (hunger >= 100 && Math.random() < 0.25) {

                  var sp = species.find(function (s) { return s.id === fId; });

                  fishToRemove.push(idx);

                  newLog.push({ tick: newTick, msg: '\u2620\uFE0F ' + (sp ? sp.name : fId) + ' has died from starvation!' });

                }

                if (hunger > 80) {

                  var predSp = species.find(function (s) { return s.id === fId; });

                  if (predSp && predSp.diet && /carnivore|piscivore|predator/i.test(predSp.diet)) {

                    var preyIdx = -1;

                    _tankFish.forEach(function (pId, pi) {

                      if (pi === idx || fishToRemove.indexOf(pi) !== -1) return;

                      if (pId === fId) return;

                      var preySp = species.find(function (s) { return s.id === pId; });

                      if (preySp && preySp.load < predSp.load && predSp.compat.indexOf(pId) === -1) {

                        if (preyIdx === -1 || Math.random() < 0.5) preyIdx = pi;

                      }

                    });

                    if (preyIdx !== -1 && Math.random() < 0.12) {

                      var preySp2 = species.find(function (s) { return s.id === _tankFish[preyIdx]; });

                      fishToRemove.push(preyIdx);

                      newHunger[fId] = Math.max(0, hunger - 40);

                      newLog.push({ tick: newTick, msg: '\uD83D\uDE31 ' + predSp.name + ' has eaten a ' + (preySp2 ? preySp2.name : 'tankmate') + '!' });

                    }

                  }

                }

              });

              // ── Species aggression ──

              var tank = TANK_TYPES.find(function (t) { return t.id === _selectedTank; });

              var maxLoad = tank ? Math.floor(tank.size / 2) : 10;

              var currentLoad = _tankFish.reduce(function (s, f) { var sp = species.find(function (x) { return x.id === f; }); return s + (sp ? sp.load : 0); }, 0);

              var overcrowded = currentLoad > maxLoad * 0.85;

              var speciesCounts = {};

              _tankFish.forEach(function (fId) { speciesCounts[fId] = (speciesCounts[fId] || 0) + 1; });

              var uniqueSpecies = Object.keys(speciesCounts);

              for (var si = 0; si < uniqueSpecies.length; si++) {

                for (var sj = si + 1; sj < uniqueSpecies.length; sj++) {

                  var sp1 = species.find(function (s) { return s.id === uniqueSpecies[si]; });

                  var sp2 = species.find(function (s) { return s.id === uniqueSpecies[sj]; });

                  if (!sp1 || !sp2) continue;

                  var compatible = sp1.compat && sp1.compat.indexOf(sp2.id) !== -1;

                  if (!compatible) {

                    var aggressionChance = overcrowded ? 0.08 : 0.03;

                    var avgH = ((newHunger[sp1.id] || 50) + (newHunger[sp2.id] || 50)) / 2;

                    if (avgH > 70) aggressionChance += 0.05;

                    if (Math.random() < aggressionChance) {

                      var attacker = sp1.load >= sp2.load ? sp1 : sp2;

                      var defender = sp1.load >= sp2.load ? sp2 : sp1;

                      newStress[defender.id] = Math.min(100, (newStress[defender.id] || 0) + 15);

                      newStress[attacker.id] = Math.min(100, (newStress[attacker.id] || 0) + 5);

                      newLog.push({ tick: newTick, msg: '\u2694\uFE0F ' + attacker.name + ' is fighting with ' + defender.name + '!' });

                      if ((newStress[defender.id] || 0) >= 90) {

                        var defIdx = _tankFish.indexOf(defender.id);

                        if (defIdx !== -1 && fishToRemove.indexOf(defIdx) === -1) {

                          fishToRemove.push(defIdx);

                          newLog.push({ tick: newTick, msg: '\u2620\uFE0F ' + defender.name + ' has died from aggression injuries!' });

                        }

                      }

                    }

                  }

                }

              }

              // Apply fish removals

              var finalTankFish = _tankFish;

              if (fishToRemove.length > 0) {

                fishToRemove.sort(function (a, b) { return b - a; });

                finalTankFish = _tankFish.slice();

                fishToRemove.forEach(function (ri) { if (ri >= 0 && ri < finalTankFish.length) finalTankFish.splice(ri, 1); });

              }

              // ── Algae growth (competes with plants) ──

              var newAlgae = _algaeLevel;

              var totalPlantBiomass = _tankPlants.reduce(function (s, pId) { return s + (_plantBiomass[pId] || 0); }, 0);

              // Plants compete with algae for nutrients & light

              var plantSuppression = Math.min(0.8, totalPlantBiomass * 0.08); // up to 80% suppression

              if (_lightsOn) {

                var algaeGrowth = (0.5 + (newChem.nitrate > 40 ? 1 : 0) + (newChem.nitrate > 60 ? 0.5 : 0)) * (1 - plantSuppression);

                newAlgae = Math.min(100, newAlgae + algaeGrowth);

              } else {

                newAlgae = Math.max(0, newAlgae - 0.3);

              }

              // Low O2 events

              if (newO2 < 2 && _tankFish.length > 0 && newTick % 3 === 0) {

                newLog.push({ tick: newTick, msg: '⚠️ Fish are gasping at the surface — dangerously low oxygen!' });

              }

              // Plant death event

              _tankPlants.forEach(function (pId) {

                if (_plantHealth[pId] !== undefined && _plantHealth[pId] <= 0 && _plantBiomass[pId] > 0) {

                  var pDef = plantCatalog.find(function (p) { return p.id === pId; });

                  _plantBiomass[pId] = 0;

                  newLog.push({ tick: newTick, msg: '🥀 ' + (pDef ? pDef.name : pId) + ' has died and is decomposing.' });

                  // Dead plant biomass releases ammonia

                  newChem.ammonia = Math.min(5, newChem.ammonia + 0.3);

                  plantChanged = true;

                }

              });

              // ── Breeding ──

              // Count population of each species in the current tank

              var _speciesPopCounts = {};

              finalTankFish.forEach(function (fId) { _speciesPopCounts[fId] = (_speciesPopCounts[fId] || 0) + 1; });

              var speciesList = SPECIES_BY_TANK[_selectedTank] || [];

              var tank = TANK_TYPES.find(function (t) { return t.id === _selectedTank; });

              var _maxLoad = tank ? Math.floor(tank.size / 2) : 10;

              var _currentLoad = finalTankFish.reduce(function (s, f) { var sp = speciesList.find(function (x) { return x.id === f; }); return s + (sp ? sp.load : 0); }, 0);

              var _totalPlantBiomass = _tankPlants.reduce(function (s, pId) { return s + (_plantBiomass[pId] || 0); }, 0);

              var fryToAdd = [];



              // Process each species that has breeding data

              Object.keys(_speciesPopCounts).forEach(function (sId) {

                var bData = BREEDING_DATA[sId];

                if (!bData) return; // species doesn't breed in simulation

                var sp = speciesList.find(function (x) { return x.id === sId; });

                if (!sp) return;

                var popCount = _speciesPopCounts[sId];

                var msgs = BREEDING_MESSAGES[bData.type];



                // ── Active gestation check ──

                if (_breedingState[sId]) {

                  var bs = _breedingState[sId];

                  var elapsed = newTick - bs.startTick;



                  // Abort check: if conditions deteriorated during gestation

                  var abortChance = 0;

                  if (newChem.ammonia > 1.0) abortChance += 0.08;

                  if (newChem.nitrite > 0.8) abortChance += 0.06;

                  if ((newStress[sId] || 0) > 70) abortChance += 0.05;

                  if (newO2 < 3) abortChance += 0.04;

                  if (abortChance > 0 && Math.random() < abortChance) {

                    // Gestation aborted

                    if (msgs && msgs.abort) newLog.push({ tick: newTick, msg: msgs.abort(sp.name) });

                    delete _breedingState[sId];

                    breedingChanged = true;

                    return;

                  }



                  // Egg-layer mid-point event (eggs laid message)

                  if (bData.type === 'egg_layer' && bs.stage === 'gestating' && elapsed >= Math.floor(bData.gestationTicks * 0.5) && !bs.eggsLogged) {

                    if (msgs && msgs.eggs) newLog.push({ tick: newTick, msg: msgs.eggs(sp.name) });

                    _breedingState[sId] = Object.assign({}, bs, { eggsLogged: true });

                    breedingChanged = true;

                  }



                  // Gestation complete — birth!

                  if (elapsed >= bData.gestationTicks) {

                    var fryCount = bs.fryCount;

                    // Fry survival risk: predators reduce survival, plants increase it

                    var hasPredators = false;

                    finalTankFish.forEach(function (fId2) {

                      if (fId2 === sId) return;

                      var otherSp = speciesList.find(function (x) { return x.id === fId2; });

                      if (otherSp && otherSp.diet && /carnivore|piscivore|predator/i.test(otherSp.diet)) hasPredators = true;

                    });

                    var survivalRate = 1.0;

                    if (hasPredators) survivalRate -= 0.4; // predators eat fry

                    if (_totalPlantBiomass > 3) survivalRate += 0.15; // plants provide hiding spots

                    if (_totalPlantBiomass > 6) survivalRate += 0.1;

                    if (newChem.ammonia > 0.5) survivalRate -= 0.2;

                    survivalRate = Math.max(0.1, Math.min(1.0, survivalRate));



                    // Apply survival to each fry individually

                    var survivingFry = 0;

                    for (var fi = 0; fi < fryCount; fi++) {

                      if (Math.random() < survivalRate) survivingFry++;

                    }



                    // Bioload cap: only add fry if there's room

                    var fryLoad = sp.load || 1;

                    var roomForFry = Math.floor((_maxLoad - _currentLoad) / fryLoad);

                    survivingFry = Math.min(survivingFry, Math.max(0, roomForFry));



                    if (survivingFry > 0) {

                      for (var fj = 0; fj < survivingFry; fj++) {

                        fryToAdd.push(sId);

                      }

                      _totalFryBorn += survivingFry;

                      if (msgs && msgs.birth) newLog.push({ tick: newTick, msg: msgs.birth(sp.name, survivingFry) });

                      awardStemXP('aquarium', 5, 'Successful breeding: ' + sp.name);
                      if (!(aq.unlockedAchievements || {})['first_breed']) {
                        aq.unlockedAchievements = Object.assign({}, aq.unlockedAchievements || {});
                        aq.unlockedAchievements['first_breed'] = { unlockedAt: Date.now() };
                        var _ab = ACHIEVEMENTS.find(function (a) { return a.id === 'first_breed'; });
                        if (_ab) { aq.coins = (aq.coins || 0) + _ab.coins; aq.totalCoinsEarned = (aq.totalCoinsEarned || 0) + _ab.coins; }
                      }
                      if (aq.totalFryBorn >= 10 && !(aq.unlockedAchievements || {})['ten_breeds']) {
                        aq.unlockedAchievements = Object.assign({}, aq.unlockedAchievements || {});
                        aq.unlockedAchievements['ten_breeds'] = { unlockedAt: Date.now() };
                        var _at = ACHIEVEMENTS.find(function (a) { return a.id === 'ten_breeds'; });
                        if (_at) { aq.coins = (aq.coins || 0) + _at.coins; aq.totalCoinsEarned = (aq.totalCoinsEarned || 0) + _at.coins; }
                      }

                    } else {

                      newLog.push({ tick: newTick, msg: '\u2620\uFE0F ' + sp.name + ' fry did not survive — too many predators or poor conditions.' });

                    }



                    // Set cooldown and clear gestation

                    _breedingCooldowns[sId] = newTick;

                    delete _breedingState[sId];

                    breedingChanged = true;

                  }

                  return; // already gestating, skip initiation check

                }



                // ── Breeding initiation check ──

                // Condition 1: enough population

                if (popCount < bData.minPop) return;

                // Condition 2: water quality acceptable

                if (newChem.ammonia > 0.5 || newChem.nitrite > 0.5) return;

                // Condition 3: low stress

                if ((newStress[sId] || 0) > 50) return;

                // Condition 4: well-fed

                if ((newHunger[sId] || 50) > 70) return;

                // Condition 5: bioload has room for at least 1 fry

                if (_currentLoad + (sp.load || 1) > _maxLoad) return;

                // Condition 6: cooldown elapsed (1.5x gestation ticks)

                var cooldownNeeded = Math.floor(bData.gestationTicks * 1.5);

                if (_breedingCooldowns[sId] && (newTick - _breedingCooldowns[sId]) < cooldownNeeded) return;

                // Condition 7: adequate O2

                if (newO2 < 3) return;

                // Condition 8: random chance

                if (Math.random() > bData.breedChance) return;



                // Egg-scatterers need plant cover

                if (bData.type === 'egg_scatter' && _totalPlantBiomass < 1) return;



                // All conditions met — initiate breeding!

                var fryMin = bData.fryCount[0];

                var fryMax = bData.fryCount[1];

                var plannedFry = fryMin + Math.floor(Math.random() * (fryMax - fryMin + 1));

                _breedingState[sId] = { stage: 'gestating', startTick: newTick, fryCount: plannedFry };

                breedingChanged = true;

                if (msgs && msgs.court) newLog.push({ tick: newTick, msg: msgs.court(sp.name) });

              });



              // Apply fry additions to tank

              if (fryToAdd.length > 0) {

                finalTankFish = finalTankFish.concat(fryToAdd);

                // Initialize hunger for new fry

                fryToAdd.forEach(function (fId) {

                  if (newHunger[fId] === undefined) newHunger[fId] = 40;

                });

              }



              // Build final update

              var tickUpdate = {

                waterChem: newChem, simTick: newTick, simDay: newDay, simHour: newHour,

                hungerLevels: newHunger, eventLog: newLog.slice(-25),

                algaeLevel: Math.round(newAlgae * 10) / 10, fishStress: newStress

              };

              if (sickChanged) tickUpdate.fishSickness = newSickness;

              if (fishToRemove.length > 0 || fryToAdd.length > 0) tickUpdate.tankFish = finalTankFish;

              if (plantChanged) {

                tickUpdate.plantHealth = _plantHealth;

                tickUpdate.plantBiomass = _plantBiomass;

              }

              if (breedingChanged || fryToAdd.length > 0) {

                tickUpdate.breedingState = _breedingState;

                tickUpdate.breedingCooldowns = _breedingCooldowns;

                tickUpdate.totalFryBorn = _totalFryBorn;

              }

              aq = Object.assign(aq, tickUpdate);

              return Object.assign({}, prev, { _aquarium: aq });

            });

          };



          // (Disease, hunger, aggression, algae all handled inside simStep above via functional update)





          // ── Tank Health Score & Strategy Tips ──

          var getTankHealth = function () {

            if (!waterChem || tankFish.length === 0) return { score: 100, tips: [{ icon: '\uD83D\uDC1F', text: 'Add some fish to get started!', color: 'text-cyan-600' }] };

            var score = 100;

            var tips = [];

            // Ammonia penalty

            var ammSt = getChemStatus('ammonia', waterChem.ammonia);

            if (ammSt === 'warn') { score -= 15; tips.push({ icon: '\u26A0\uFE0F', text: 'Ammonia at ' + waterChem.ammonia.toFixed(2) + ' ppm \u2014 approaching toxic levels. Consider a water change.', color: 'text-amber-600' }); }

            if (ammSt === 'danger') { score -= 35; tips.push({ icon: '\u2620\uFE0F', text: 'CRITICAL: Ammonia at ' + waterChem.ammonia.toFixed(2) + ' ppm! Immediate water change needed. Fish are suffering gill damage.', color: 'text-red-600' }); }

            // Nitrite penalty

            var nitSt = getChemStatus('nitrite', waterChem.nitrite);

            if (nitSt === 'warn') { score -= 12; tips.push({ icon: '\u26A0\uFE0F', text: 'Nitrite rising (' + waterChem.nitrite.toFixed(2) + ' ppm). Your nitrogen cycle may not be established yet.', color: 'text-amber-600' }); }

            if (nitSt === 'danger') { score -= 30; tips.push({ icon: '\u2620\uFE0F', text: 'CRITICAL: Nitrite at ' + waterChem.nitrite.toFixed(2) + ' ppm! Brown blood disease risk. Emergency water change!', color: 'text-red-600' }); }

            // Nitrate penalty

            if (waterChem.nitrate > 80) { score -= 15; tips.push({ icon: '\uD83D\uDE2C', text: 'Nitrate very high (' + waterChem.nitrate.toFixed(0) + ' ppm). Schedule regular water changes or add live plants.', color: 'text-amber-600' }); }

            else if (waterChem.nitrate > 40) { score -= 8; tips.push({ icon: '\uD83C\uDF3F', text: 'Nitrate at ' + waterChem.nitrate.toFixed(0) + ' ppm \u2014 a water change will bring this down.', color: 'text-amber-600' }); }

            // pH penalty

            var phSt = getChemStatus('pH', waterChem.pH);

            if (phSt === 'warn') { score -= 10; tips.push({ icon: '\u2697\uFE0F', text: 'pH drifting (' + waterChem.pH.toFixed(1) + '). Fish prefer stable pH near ' + (TANK_TYPES.find(function (t) { return t.id === selectedTank; }) || { pH: 7 }).pH + '.', color: 'text-amber-600' }); }

            if (phSt === 'danger') { score -= 25; tips.push({ icon: '\u2697\uFE0F', text: 'pH dangerously off-target (' + waterChem.pH.toFixed(1) + ')! Osmotic stress is likely.', color: 'text-red-600' }); }

            // Bioload check

            var species = SPECIES_BY_TANK[selectedTank] || [];

            var currentLoad = tankFish.reduce(function (s, f) { var sp = species.find(function (x) { return x.id === f; }); return s + (sp ? sp.load : 0); }, 0);

            var maxLoad = Math.floor((TANK_TYPES.find(function (t) { return t.id === selectedTank; }) || { size: 20 }).size / 2);

            var loadPct = Math.round(currentLoad / maxLoad * 100);

            if (loadPct > 80) { score -= 10; tips.push({ icon: '\uD83D\uDC1F', text: 'Bioload at ' + loadPct + '% capacity. High bioload = more waste = faster ammonia buildup.', color: 'text-amber-600' }); }

            // Hunger check

            var avgHunger = 0;

            var hungerCount = 0;

            tankFish.forEach(function (fId) { var h = hungerLevels[fId]; if (h !== undefined) { avgHunger += h; hungerCount++; } });

            if (hungerCount > 0) avgHunger = avgHunger / hungerCount;

            if (avgHunger > 75) { score -= 12; tips.push({ icon: '\uD83C\uDF7D\uFE0F', text: 'Fish are very hungry (avg ' + Math.round(avgHunger) + '%). Feed soon to reduce stress!', color: 'text-amber-600' }); }

            // All good!

            if (tips.length === 0) {

              tips.push({ icon: '\uD83C\uDF1F', text: 'Excellent tank management! All parameters in safe range. Your nitrogen cycle is established.', color: 'text-green-600' });

            }

            return { score: Math.max(0, score), tips: tips };

          };

          // ── Ocean Ecology helpers ──

          var OCEAN_SPECIES = [

            { id: 'sardines', name: 'Sardines', icon: '🐟', r: 0.4, K: 1000, value: 1, desc: 'Fast-reproducing small fish. Foundation of the marine food web.' },

            { id: 'tuna', name: 'Tuna', icon: '🐠', r: 0.15, K: 400, value: 8, desc: 'Mid-level predator. High commercial value but slow to recover.' },

            { id: 'sharks', name: 'Sharks', icon: '🦈', r: 0.05, K: 100, value: 3, desc: 'Apex predator. Extremely slow reproduction — vulnerable to overfishing.' }

          ];



          var stepOcean = function () {

            var newPop = Object.assign({}, oceanPop);

            var harvestFactor = isOpenSeason ? harvestRate / 100 : 0;

            var mpaFactor = 1 - mpaPercent / 100;

            var bycatchMult = meshSize === 'small' ? 0.15 : meshSize === 'medium' ? 0.05 : 0.02;

            var yearRevenue = 0;

            var yearBycatch = 0;



            OCEAN_SPECIES.forEach(function (sp) {

              var N = newPop[sp.id];

              var growth = sp.r * N * (1 - N / sp.K);

              var predation = 0;

              if (sp.id === 'sardines') predation = 0.003 * N * newPop.tuna;

              if (sp.id === 'tuna') predation = 0.004 * N * newPop.sharks;

              var harvest = sp.id !== 'sharks' ? harvestFactor * mpaFactor * N * 0.1 : harvestFactor * mpaFactor * N * 0.03;

              var bycatch = sp.id === 'sharks' ? harvest * bycatchMult * 3 : 0;

              yearBycatch += bycatch;

              yearRevenue += harvest * sp.value;

              newPop[sp.id] = Math.max(0, Math.round(N + growth - predation - harvest - bycatch));

            });



            var newYear = oceanYear + 1;

            var newHistory = oceanHistory.concat([{ year: newYear, sardines: newPop.sardines, tuna: newPop.tuna, sharks: newPop.sharks, revenue: Math.round(yearRevenue) }]);

            var collapsed = newPop.sardines < 50 || newPop.tuna < 20;



            updMulti({

              oceanPop: newPop,

              oceanYear: newYear,

              oceanRevenue: oceanRevenue + Math.round(yearRevenue),

              oceanBycatch: oceanBycatch + Math.round(yearBycatch),

              oceanHistory: newHistory.slice(-50),

              oceanCollapsed: collapsed

            });



            if (collapsed && !oceanCollapsed) {

              if (addToast) addToast('🚨 Fish stock collapse! Populations have crashed below sustainable levels.', 'error');

            }

            if (!collapsed && newYear % 5 === 0) {

              awardStemXP('ocean', 3, 'Sustainable fishing for 5 years');

            }

          };



          var resetOcean = function () {

            updMulti({

              oceanPop: { sardines: 800, tuna: 200, sharks: 50 },

              harvestRate: 20, meshSize: 'medium', mpaPercent: 10, isOpenSeason: true,

              oceanHistory: [], oceanYear: 0, oceanRevenue: 0, oceanBycatch: 0,

              oceanCollapsed: false, oceanScenario: null

            });

          };



          // ── Marine Science data ──

          var OCEAN_ZONES = [

            { id: 'sunlight', name: 'Sunlight Zone (Epipelagic)', depth: '0-200m', light: '100%', temp: '20-25°C', color: '#38bdf8', species: ['clownfish', 'dolphin', 'jellyfish', 'turtle'] },

            { id: 'twilight', name: 'Twilight Zone (Mesopelagic)', depth: '200-1000m', light: '1%', temp: '5-20°C', color: '#1e40af', species: ['squid', 'hatchetfish', 'swordfish'] },

            { id: 'midnight', name: 'Midnight Zone (Bathypelagic)', depth: '1000-4000m', light: '0%', temp: '2-5°C', color: '#1e1b4b', species: ['anglerfish', 'gulpereel', 'giantsquid'] },

            { id: 'abyssal', name: 'Abyssal Zone (Abyssopelagic)', depth: '4000-6000m', light: '0%', temp: '1-2°C', color: '#0f0a2e', species: ['tubeworms', 'seacucumber'] },

            { id: 'hadal', name: 'Hadal Zone (Trenches)', depth: '6000-11000m', light: '0%', temp: '1-4°C', color: '#050210', species: ['amphipod', 'snailfish'] }

          ];



          var MARINE_SPECIES = [

            { id: 'clownfish', name: 'Clownfish', icon: '🐠', zone: 'sunlight', habitat: 'Shelters among venomous tentacles of Heteractis magnifica anemones on Indo-Pacific coral reefs', diet: 'Omnivore — algae, zooplankton, and leftover scraps from its host anemone', status: 'LC', fact: 'Lives in symbiosis with venomous sea anemones.', quiz: 'What protects clownfish from anemone stings?' },

            { id: 'dolphin', name: 'Bottlenose Dolphin', icon: '🐬', zone: 'sunlight', habitat: 'Temperate and tropical open oceans, coastal bays, and estuaries worldwide', diet: 'Carnivore — fish, squid, and crustaceans hunted cooperatively using echolocation', status: 'LC', fact: 'Dolphins sleep with one eye open — one brain hemisphere at a time.', quiz: 'How do dolphins breathe while sleeping?' },

            { id: 'jellyfish', name: 'Moon Jellyfish', icon: '🪼', zone: 'sunlight', habitat: 'Surface waters of temperate and tropical coastal seas, often near estuaries and harbors', diet: 'Carnivore — traps plankton, fish eggs, and tiny crustaceans on its mucus-covered bell', status: 'LC', fact: 'Jellyfish have no brain, heart, or blood — just a nerve net.', quiz: 'What body system do jellyfish lack?' },

            { id: 'turtle', name: 'Green Sea Turtle', icon: '🐢', zone: 'sunlight', habitat: 'Tropical seagrass meadows and coral reefs; nests on sandy beaches across the Atlantic and Pacific', diet: 'Herbivore — seagrass and algae; juveniles also eat jellyfish and sponges', status: 'EN', fact: 'Sea turtles navigate using Earth\'s magnetic field.', quiz: 'How do sea turtles find their nesting beaches?' },

            { id: 'squid', name: 'Firefly Squid', icon: '🦑', zone: 'twilight', habitat: 'Western Pacific mesopelagic zone (200-600m), migrating to the surface at night off Japan\'s Toyama Bay', diet: 'Carnivore — small fish, crustaceans, and other squids caught during nightly vertical migrations', status: 'LC', fact: 'Firefly squid produce bioluminescent light from photophores.', quiz: 'What is the light-producing ability of deep sea creatures called?' },

            { id: 'hatchetfish', name: 'Hatchetfish', icon: '🐟', zone: 'twilight', habitat: 'Mesopelagic waters (200-1000m) in tropical and temperate oceans worldwide', diet: 'Carnivore — copepods, ostracods, and other tiny crustaceans caught during diel vertical migration', status: 'LC', fact: 'Uses counter-illumination to hide from predators below.', quiz: 'Why do hatchetfish have light organs on their belly?' },

            { id: 'swordfish', name: 'Swordfish', icon: '🐟', zone: 'twilight', habitat: 'Epipelagic to mesopelagic zones of tropical and temperate oceans; dives to 550m to hunt', diet: 'Carnivore — slashes through schools of mackerel, squid, and crustaceans with its bill', status: 'LC', fact: 'Swordfish heat their eyes and brain to hunt in cold deep waters.', quiz: 'What unique adaptation helps swordfish hunt in cold water?' },

            { id: 'anglerfish', name: 'Anglerfish', icon: '🐡', zone: 'midnight', habitat: 'Bathypelagic darkness (1000-4000m) throughout the world\'s deep oceans', diet: 'Carnivore — ambush predator that lures fish and crustaceans with a bioluminescent esca', status: 'LC', fact: 'The glowing lure is a bioluminescent bacteria colony.', quiz: 'What zone does the anglerfish inhabit?' },

            { id: 'gulpereel', name: 'Gulper Eel', icon: '🐍', zone: 'midnight', habitat: 'Bathypelagic to abyssopelagic zones (1000-3000m) in tropical and temperate deep oceans', diet: 'Carnivore — engulfs fish and shrimp whole using a massively expandable, hinged jaw', status: 'LC', fact: 'Can unhinge its jaw to swallow prey larger than itself.', quiz: 'What adaptation lets the gulper eel eat large prey?' },

            { id: 'giantsquid', name: 'Giant Squid', icon: '🦑', zone: 'midnight', habitat: 'Bathypelagic waters (300-1000m) of all the world\'s oceans, from sub-Arctic to subtropical', diet: 'Carnivore — captures deep-sea fish and other squids with two long, club-tipped tentacles', status: 'LC', fact: 'Has the largest eyes in the animal kingdom — up to 10 inches across.', quiz: 'How large can a giant squid\'s eyes grow?' },

            { id: 'tubeworms', name: 'Giant Tube Worms', icon: '🪱', zone: 'abyssal', habitat: 'Clustered around superheated hydrothermal vents on mid-ocean ridges (e.g., East Pacific Rise)', diet: 'Chemosynthetic — internal sulfur-oxidizing bacteria convert H₂S into organic nutrients', status: 'LC', fact: 'They have no mouth or stomach — bacteria inside them convert chemicals to energy.', quiz: 'What process do tube worm symbionts use instead of photosynthesis?' },

            { id: 'seacucumber', name: 'Sea Cucumber', icon: '🥒', zone: 'abyssal', habitat: 'Soft sediment of the abyssal plain (4000-6000m), comprising 90% of deep-sea megafauna biomass', diet: 'Detritivore — sifts organic particles and bacteria from seafloor sediment through tentacle-like feeding appendages', status: 'LC', fact: 'Can expel their internal organs as a defense and regrow them.', quiz: 'What defense mechanism do sea cucumbers use?' },

            { id: 'amphipod', name: 'Supergiant Amphipod', icon: '🦐', zone: 'hadal', habitat: 'Hadal trenches below 6000m, notably the Mariana and Kermadec Trenches', diet: 'Scavenger — consumes carrion falls (dead fish and whales) that sink to extreme depths', status: 'LC', fact: 'Found 7 miles deep in the Mariana Trench.', quiz: 'What is the deepest ocean trench on Earth?' },

            { id: 'snailfish', name: 'Mariana Snailfish', icon: '🐟', zone: 'hadal', habitat: 'Record-holding depth of 8,178m in the Mariana Trench, living in total darkness under crushing pressure', diet: 'Carnivore — feeds on small amphipods and other hadal invertebrates at extreme depth', status: 'LC', fact: 'Deepest-living fish ever recorded at 8,178 meters.', quiz: 'What is the deepest-living fish species discovered?' },

            { id: 'mantaray', name: 'Manta Ray', icon: '🐟', zone: 'sunlight', habitat: 'Tropical and subtropical surface waters near coral reefs, seamounts, and oceanic islands', diet: 'Filter feeder — strains zooplankton and small fish through gill raker plates while doing barrel rolls', status: 'VU', fact: 'Mantas have the largest brain-to-body ratio of any fish.', quiz: 'What type of feeding do manta rays use?' },

            { id: 'bluewhale', name: 'Blue Whale', icon: '🐋', zone: 'sunlight', habitat: 'All major oceans, migrating between polar feeding grounds and tropical breeding waters', diet: 'Filter feeder — consumes up to 4 tons of Antarctic krill per day using 300+ baleen plates', status: 'EN', fact: 'The largest animal ever — their heart is the size of a small car.', quiz: 'What is the largest animal that has ever lived?' },

            { id: 'seahorse', name: 'Seahorse', icon: '🐟', zone: 'sunlight', habitat: 'Sheltered seagrass beds, mangrove roots, and coral rubble in tropical and temperate shallows', diet: 'Carnivore — ambush-feeds on mysid shrimp and copepods by rapidly snapping its tubular snout', status: 'VU', fact: 'Males carry and give birth to the babies — unique in the animal kingdom.', quiz: 'Which seahorse parent carries the eggs?' },

            { id: 'octopus', name: 'Dumbo Octopus', icon: '🐙', zone: 'midnight', habitat: 'Near the seafloor at extreme depths (3000-7000m) in every ocean, the deepest-living octopus genus', diet: 'Carnivore — swallows worms, copepods, and isopods whole near the deep-ocean floor', status: 'LC', fact: 'Named for their ear-like fins. Three hearts pump blue blood.', quiz: 'How many hearts does an octopus have?' },

            { id: 'nautilus', name: 'Nautilus', icon: '🐚', zone: 'twilight', habitat: 'Deep fore-reef slopes (200-700m) of the Indo-Pacific, ascending to shallow reefs at night to feed', diet: 'Scavenger — dead fish, crustacean molts, and detritus detected by chemosensory tentacles', status: 'VU', fact: 'A living fossil — virtually unchanged for 500 million years.', quiz: 'How long have nautiluses existed?' },

            { id: 'coelacanth', name: 'Coelacanth', icon: '🐟', zone: 'twilight', habitat: 'Deep volcanic caves and overhangs (150-700m) off the Comoros Islands and South Africa', diet: 'Carnivore — slow drift-hunter of cuttlefish, squid, snipefish, and small sharks', status: 'CR', fact: 'Thought extinct for 66 million years until rediscovered in 1938!', quiz: 'When was the coelacanth rediscovered?' }

          ];



          var generateQuiz = function () {

            var sp = MARINE_SPECIES[Math.floor(Math.random() * MARINE_SPECIES.length)];

            var q = {

              species: sp.id, question: sp.quiz, answer: sp.name,

              options: [sp.name].concat(

                MARINE_SPECIES.filter(function (s) { return s.id !== sp.id; })

                  .sort(function () { return Math.random() - 0.5; }).slice(0, 3)

                  .map(function (s) { return s.name; })

              ).sort(function () { return Math.random() - 0.5; })

            };

            updMulti({ quizQ: q, quizActive: true });

          };



          var answerQuiz = function (ans) {

            if (!quizQ) return;

            var correct = ans === quizQ.answer;

            announceToSR(correct ? 'Correct!' : 'Incorrect');

            if (correct) awardXP(3, 'Marine science quiz');

            updMulti({

              quizScore: { correct: quizScore.correct + (correct ? 1 : 0), total: quizScore.total + 1 },

              quizQ: Object.assign({}, quizQ, { answered: ans, correct: correct })

            });

          };







          // ═══ RENDER ═══

          var modeColors = { tank: 'cyan', ocean: 'blue', marine: 'indigo' };

          var mColor = modeColors[mode] || 'cyan';



          return React.createElement("div", { className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-300" },



            // ── Header ──

            React.createElement("div", { className: "flex items-center gap-3 mb-2" },

              React.createElement("button", {

                onClick: function () { setStemLabTool(null); updMulti({ simRunning: false }); },

                className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors", 'aria-label': 'Back to tools'

              }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold bg-gradient-to-r from-cyan-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent" }, "\uD83D\uDC20 Aquaculture & Ocean Lab"),

              React.createElement("div", { className: "flex items-center gap-2 ml-auto" },

                React.createElement("button", { "aria-label": "Snapshot",

                  onClick: function () {

                    var snap = { id: 'aqua-' + Date.now(), tool: 'aquarium', label: mode === 'tank' ? 'Tank: ' + (selectedTank || 'none') : mode === 'ocean' ? 'Ocean Year ' + oceanYear : 'Marine Science', data: Object.assign({}, d), timestamp: Date.now() };

                    setToolSnapshots(function (prev) { return prev.concat([snap]); });

                    if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

                  },

                  className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"

                }, "\uD83D\uDCF8 Snapshot")

              )

            ),



            // ── Mode Tabs ──

            React.createElement("div", { className: "flex gap-1 bg-slate-100 rounded-xl p-1" },

              [

                { id: 'tank', icon: '\uD83D\uDC20', label: 'Aquarium Lab' },

                { id: 'ocean', icon: '\uD83C\uDF0A', label: 'Ocean Ecology' },

                { id: 'marine', icon: '\uD83D\uDD2C', label: 'Marine Science' }

              ].map(function (tab) {

                return React.createElement("button", { "aria-label": "Change mode",

                  key: tab.id,

                  onClick: function () { upd('mode', tab.id); },

                  className: "flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-200 " + (mode === tab.id ? "bg-gradient-to-r from-" + modeColors[tab.id] + "-500 to-" + modeColors[tab.id] + "-600 text-white shadow-lg shadow-" + modeColors[tab.id] + "-500/25" : "text-slate-500 hover:text-slate-700 hover:bg-white/60")

                }, tab.icon, " ", tab.label);

              })

            ),






            // ═══ TUTORIAL OVERLAY ═══
            !tutorialDismissed && tutorialStep < TUTORIAL_STEPS.length && React.createElement("div", {
              className: "bg-gradient-to-r from-cyan-500 to-sky-500 rounded-xl p-3 text-white mb-2",
              style: { animation: 'stemCardIn 0.3s ease-out' }
            },
              React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                React.createElement("span", { className: "text-lg" }, "\uD83D\uDCA1"),
                React.createElement("span", { className: "font-bold text-sm" }, TUTORIAL_STEPS[tutorialStep].title),
                React.createElement("span", { className: "ml-auto text-[10px] opacity-70" }, (tutorialStep + 1) + "/" + TUTORIAL_STEPS.length)
              ),
              React.createElement("p", { className: "text-xs opacity-90 mb-2" }, TUTORIAL_STEPS[tutorialStep].msg),
              React.createElement("div", { className: "flex gap-2" },
                React.createElement("button", { "aria-label": "Skip tutorial",
                  onClick: advanceTutorial,
                  className: "px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all"
                }, tutorialStep < TUTORIAL_STEPS.length - 1 ? "Next \u2192" : "Got it!"),
                React.createElement("button", { "aria-label": "Skip tutorial",
                  onClick: dismissTutorial,
                  className: "px-3 py-1 hover:bg-white/10 rounded-lg text-[10px] opacity-70 transition-all"
                }, "Skip tutorial")
              )
            ),

            // ═══ ANATOMY VIEWER OVERLAY ═══

            viewingAnatomy && (() => {

              // Find species data from all sources

              var allSpecies = [].concat(

                SPECIES_BY_TANK[selectedTank] || [],

                MARINE_SPECIES || []

              );

              var sp = allSpecies.find(function (s) { return s.id === viewingAnatomy; });

              if (!sp) { closeAnatomy(); return null; }

              var bodyPlanKey = SPECIES_BODY_MAP[viewingAnatomy] || 'fish';

              var plan = BODY_PLANS[bodyPlanKey];

              if (!plan) { closeAnatomy(); return null; }

              var extraInfo = SPECIES_ANATOMY[viewingAnatomy] || {};



              return React.createElement("div", { className: "bg-gradient-to-br from-slate-900/95 via-indigo-950/95 to-slate-900/95 rounded-2xl p-5 border-2 border-indigo-400/30 shadow-2xl animate-in fade-in duration-300 relative" },

                // Subtle background pattern

                React.createElement("div", { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(34,211,238,0.06) 0%, transparent 50%)', pointerEvents: 'none' } }),



                // Header

                React.createElement("div", { className: "flex items-center gap-3 mb-4 relative z-10" },

                  React.createElement("div", { className: "text-3xl" }, sp.icon || '\uD83D\uDC1F'),

                  React.createElement("div", null,

                    React.createElement("h4", { className: "text-base font-bold text-white" }, sp.name),

                    React.createElement("p", { className: "text-[11px] text-indigo-300/80" }, plan.label)

                  ),

                  React.createElement("button", { "aria-label": "Close",

                    onClick: closeAnatomy,

                    className: "ml-auto px-3 py-1 text-xs font-bold text-slate-400 bg-slate-800/60 hover:bg-slate-700/80 rounded-full transition-all border border-slate-600/30"

                  }, "\u2715 Close")

                ),



                // ── SVG Diagram with interactive labels ──

                React.createElement("div", { className: "relative bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl p-4 mb-4 border border-slate-700/30", style: { overflow: 'visible' } },

                  // Render SVG diagram

                  React.createElement("div", {

                    dangerouslySetInnerHTML: { __html: plan.svg(400, 250, SPECIES_COLORS[viewingAnatomy]) },

                    className: "max-w-sm mx-auto",

                    style: { filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }

                  }),

                  // Clickable label dots overlaid on the diagram

                  React.createElement("div", { style: { position: 'absolute', top: '16px', left: '16px', right: '16px', bottom: '16px', overflow: 'visible' } },

                    plan.parts.map(function (part, i) {

                      var isHighlighted = anatomyHighlight === i;

                      return React.createElement("div", {

                        key: i,

                        style: {

                          position: 'absolute',

                          left: part.x + '%', top: part.y + '%',

                          transform: 'translate(-50%,-50%)',

                          zIndex: isHighlighted ? 20 : 10,

                          cursor: 'pointer'

                        },

                        onClick: function () { upd('anatomyHighlight', isHighlighted ? null : i); }

                      },

                        // Pulsing dot

                        React.createElement("div", {

                          className: "relative",

                          style: { width: '16px', height: '16px' }

                        },

                          React.createElement("div", {

                            style: {

                              width: '16px', height: '16px', borderRadius: '50%',

                              background: isHighlighted ? '#22d3ee' : 'rgba(255,255,255,0.9)',

                              border: '2px solid ' + (isHighlighted ? '#06b6d4' : 'rgba(99,102,241,0.6)'),

                              boxShadow: isHighlighted ? '0 0 12px rgba(34,211,238,0.6)' : '0 0 6px rgba(255,255,255,0.3)',

                              animation: isHighlighted ? 'none' : 'pulse 2s ease-in-out infinite',

                              transition: 'all 0.2s'

                            }

                          }),

                          // Number label

                          React.createElement("span", {

                            style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '8px', fontWeight: 'bold', color: isHighlighted ? '#164e63' : '#4338ca', lineHeight: 1 }

                          }, String(i + 1))

                        ),

                        // Tooltip on highlight — flip above/below based on dot y-position

                        isHighlighted && (() => {

                          var flipUp = part.y < 30; // dots near top → show tooltip below; near bottom or middle → show above

                          var tooltipStyle = flipUp

                            ? { top: '22px', left: '50%', transform: 'translateX(-50%)', minWidth: '200px' }

                            : { bottom: '22px', left: '50%', transform: 'translateX(-50%)', minWidth: '200px' };

                          return React.createElement("div", {

                            className: "absolute z-30",

                            style: tooltipStyle

                          },

                            React.createElement("div", { className: "bg-slate-800/95 backdrop-blur-sm rounded-lg p-2.5 border border-cyan-500/30 shadow-xl" },

                              React.createElement("p", { className: "text-[11px] font-bold text-cyan-300 mb-0.5" }, part.name),

                              React.createElement("p", { className: "text-[10px] text-slate-300 leading-relaxed" }, part.desc)

                            )

                          );

                        })()

                      );

                    })

                  )

                ),



                // ── Parts Legend ──

                React.createElement("div", { className: "grid grid-cols-2 gap-1.5 mb-3 relative z-10" },

                  plan.parts.map(function (part, i) {

                    var isHighlighted = anatomyHighlight === i;

                    return React.createElement("button", { "aria-label": "Change anatomy highlight",

                      key: i,

                      onClick: function () { upd('anatomyHighlight', isHighlighted ? null : i); },

                      className: "flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all " + (isHighlighted ? "bg-cyan-500/20 border border-cyan-400/40" : "bg-slate-800/40 border border-transparent hover:bg-slate-700/40")

                    },

                      React.createElement("span", { className: "w-4 h-4 flex items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0 " + (isHighlighted ? "bg-cyan-400 text-slate-900" : "bg-slate-600 text-slate-300") }, String(i + 1)),

                      React.createElement("span", { className: "text-[10px] font-bold " + (isHighlighted ? "text-cyan-300" : "text-slate-400") }, part.name)

                    );

                  })

                ),



                // ── Species-Specific Info ──

                React.createElement("div", { className: "space-y-2 relative z-10" },

                  // Fun fact

                  sp.fact && React.createElement("div", { className: "bg-indigo-500/10 rounded-xl p-3 border border-indigo-400/20" },

                    React.createElement("p", { className: "text-[10px] font-bold text-indigo-300 mb-0.5" }, "\uD83D\uDCA1 Did You Know?"),

                    React.createElement("p", { className: "text-[11px] text-indigo-200/80 leading-relaxed" }, sp.fact)

                  ),

                  // Anatomy override (species-specific)

                  extraInfo.override && React.createElement("div", { className: "bg-cyan-500/10 rounded-xl p-3 border border-cyan-400/20" },

                    React.createElement("p", { className: "text-[10px] font-bold text-cyan-300 mb-0.5" }, "\uD83E\uDDAC Unique Anatomy"),

                    React.createElement("p", { className: "text-[11px] text-cyan-200/80 leading-relaxed" }, extraInfo.override)

                  ),

                  // Locomotion

                  extraInfo.locomotion && React.createElement("div", { className: "bg-emerald-500/10 rounded-xl p-3 border border-emerald-400/20" },

                    React.createElement("p", { className: "text-[10px] font-bold text-emerald-300 mb-0.5" }, "\uD83C\uDFCA How It Moves"),

                    React.createElement("p", { className: "text-[11px] text-emerald-200/80 leading-relaxed" }, extraInfo.locomotion)

                  ),

                  // Habitat info from marine species

                  sp.habitat && React.createElement("div", { className: "flex gap-2 flex-wrap" },

                    React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold border border-blue-400/20" }, "\uD83C\uDF0A " + sp.habitat),

                    sp.diet && React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-400/20" }, "\uD83C\uDF7D\uFE0F " + sp.diet),

                    sp.status && React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full font-bold " + (sp.status === 'CR' ? 'bg-red-500/20 text-red-300 border border-red-400/20' : sp.status === 'EN' ? 'bg-red-500/15 text-red-300 border border-red-400/20' : sp.status === 'VU' ? 'bg-amber-500/15 text-amber-300 border border-amber-400/20' : 'bg-green-500/15 text-green-300 border border-green-400/20') },

                      "\uD83D\uDEE1\uFE0F " + ({ LC: 'Least Concern', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered' }[sp.status] || sp.status))

                  ),



                  // XP button

                  React.createElement("button", { "aria-label": "I Studied This! (+2 XP)",

                    onClick: function () {

                      awardStemXP('aquarium', 2, 'Studied anatomy of ' + sp.name);

                      if (addToast) addToast('\uD83E\uDDAC +2 XP for studying ' + sp.name + ' anatomy!', 'success');

                    },

                    className: "w-full py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"

                  }, "\uD83C\uDF93 I Studied This! (+2 XP)")

                )

              );

            })(),





            // ═══════════════ MODE 1: AQUARIUM LAB ═══════════════

            mode === 'tank' && !selectedTank && React.createElement("div", { className: "space-y-3" },

              React.createElement("h4", { className: "text-sm font-bold text-cyan-700" }, "\uD83D\uDC1F Choose Your Tank"),

              React.createElement("div", { className: "grid grid-cols-2 gap-3" },

                TANK_TYPES.map(function (tank) {

                  return React.createElement("button", { "aria-label": "Select option",

                    key: tank.id,

                    onClick: function () { initTank(tank.id); },

                    className: "group p-4 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-cyan-500/10 bg-gradient-to-br from-white via-cyan-50/50 to-sky-50 border-cyan-200/60 hover:border-cyan-400"

                  },

                    React.createElement("div", { className: "flex items-center gap-2 mb-1" },

                      React.createElement("span", { className: "text-xl" }, tank.name.split(' ')[0]),

                      React.createElement("span", { className: "text-xs font-bold text-cyan-800" }, tank.name.split(' ').slice(1).join(' ')),

                      React.createElement("span", { className: "ml-auto text-[10px] text-amber-600 font-bold" }, '\u2B50'.repeat(tank.diff))

                    ),

                    React.createElement("p", { className: "text-[11px] text-slate-500 mb-2" }, tank.desc),

                    React.createElement("div", { className: "flex gap-2 text-[10px] text-cyan-600" },

                      React.createElement("span", null, tank.size + " gal"),

                      React.createElement("span", null, "\u2022"),

                      React.createElement("span", null, tank.temp + "\u00B0F"),

                      React.createElement("span", null, "\u2022"),

                      React.createElement("span", null, "pH " + tank.pH),

                      tank.salinity > 0 && React.createElement("span", null, "\u2022 " + tank.salinity + " ppt")

                    )

                  );

                })

              )

            ),



            // ── Active Tank View ──

            mode === 'tank' && selectedTank && (() => {

              var tank = TANK_TYPES.find(function (t) { return t.id === selectedTank; });

              var species = SPECIES_BY_TANK[selectedTank] || [];

              var currentLoad = tankFish.reduce(function (sum, f) {

                var sp = species.find(function (s) { return s.id === f; });

                return sum + (sp ? sp.load : 0);

              }, 0);

              var maxLoad = Math.floor(tank.size / 2);

              var loadPct = Math.min(100, Math.round(currentLoad / maxLoad * 100));



              return React.createElement("div", { className: "space-y-3" },

                // Tank header with time & speed

                React.createElement("div", { className: "bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl p-3 border border-cyan-200/50" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("button", { "aria-label": "Back",

                      onClick: function () { updMulti({ selectedTank: null, simRunning: false }); },

                      className: "text-xs text-cyan-600 hover:text-cyan-800 font-bold"

                    }, "\u2190 Back"),

                    React.createElement("span", { className: "text-sm font-bold text-cyan-800" }, tank.name),

                    React.createElement("span", { className: "ml-auto text-xs font-mono text-slate-500" },

                      "\uD83D\uDCC5 Day " + simDay + ", " + (simHour < 10 ? '0' : '') + simHour + ":00" + (simHour >= 20 || simHour < 6 ? ' \uD83C\uDF19' : ' \u2600\uFE0F')

                    )

                  ),

                  // Speed controls

                  React.createElement("div", { className: "flex items-center gap-1.5" },

                    React.createElement("span", { className: "text-[10px] font-bold text-slate-500 mr-1" }, "\u23F1 Speed:"),

                    [

                      { spd: 0, label: '\u23F8', tip: 'Pause' },

                      { spd: 1, label: '\u25B6', tip: 'Normal (2s/tick)' },

                      { spd: 2, label: '\u23E9', tip: 'Fast (1s/tick)' },

                      { spd: 5, label: '\u23ED', tip: 'Turbo (0.4s/tick)' }

                    ].map(function (s) {

                      return React.createElement("button", { "aria-label": "Action",

                        key: s.spd,

                        onClick: function () {

                          upd('simSpeed', s.spd);

                          // If sim is running, restart interval at new speed

                          if (simRunning && window._aquaSimInterval) {

                            clearInterval(window._aquaSimInterval);

                            var newInterval = s.spd === 0 ? 99999 : s.spd === 1 ? 2000 : s.spd === 2 ? 1000 : 400;

                            window._aquaSimInterval = setInterval(function () { simStep(); }, newInterval);

                          }

                        },

                        title: s.tip,

                        className: "px-2 py-1 text-xs font-bold rounded-lg transition-all " + (simSpeed === s.spd ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25" : "bg-white text-slate-500 hover:bg-cyan-100 border border-slate-200")

                      }, s.label);

                    }),

                    React.createElement("span", { className: "ml-auto text-[10px] text-slate-500 font-mono" }, "T:" + simTick)

                  )

                ),



                // Water Chemistry Panel (clickable tooltips)

                waterChem && React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 rounded-2xl p-4 border border-cyan-200/60 shadow-sm" },

                  React.createElement("div", { className: "flex items-center justify-between mb-2" },

                    React.createElement("h4", { className: "text-xs font-bold text-cyan-700" }, "\uD83E\uDDEA Water Chemistry"),

                    React.createElement("span", { className: "text-[11px] text-slate-500 italic" }, "Tap any card for details")

                  ),

                  React.createElement("div", { className: "grid grid-cols-3 gap-2" },

                    [

                      { key: 'pH', label: 'pH', val: waterChem.pH.toFixed(1) },

                      { key: 'temp', label: 'Temp', val: waterChem.temp.toFixed(0) + '\u00B0F' },

                      { key: 'ammonia', label: 'NH\u2083', val: waterChem.ammonia.toFixed(2) + ' ppm' },

                      { key: 'nitrite', label: 'NO\u2082', val: waterChem.nitrite.toFixed(2) + ' ppm' },

                      { key: 'nitrate', label: 'NO\u2083', val: waterChem.nitrate.toFixed(1) + ' ppm' },

                      { key: 'salinity', label: 'Salt', val: waterChem.salinity + ' ppt' },

                      { key: 'dissolvedO2', label: 'O\u2082', val: (waterChem.dissolvedO2 !== undefined ? waterChem.dissolvedO2.toFixed(1) : '7.0') + ' mg/L' },

                      { key: 'co2', label: 'CO\u2082', val: (waterChem.co2 !== undefined ? waterChem.co2.toFixed(1) : '3.0') + ' mg/L' }

                    ].map(function (p) {

                      var st = getChemStatus(p.key, waterChem[p.key]);

                      var isActive = chemTooltip === p.key;

                      return React.createElement("div", {

                        key: p.key,

                        onClick: function () { upd('chemTooltip', isActive ? null : p.key); },

                        className: "rounded-lg p-2 text-center cursor-pointer transition-all hover:scale-105 " + (isActive ? "bg-white ring-2 ring-cyan-400 shadow-lg" : "bg-white/70 hover:bg-white/90")

                      },

                        React.createElement("div", { className: "text-[10px] text-slate-500 font-bold" }, (CHEM_INFO[p.key] || {}).icon || '', ' ', p.label),

                        React.createElement("div", { className: "text-sm font-bold " + statusColor(st) }, statusIcon(st) + " " + p.val)

                      );

                    })

                  ),

                  // ── Chemistry Tooltip Overlay ──

                  chemTooltip && CHEM_INFO[chemTooltip] && (() => {

                    var info = CHEM_INFO[chemTooltip];

                    var t = TANK_TYPES.find(function (x) { return x.id === selectedTank; }) || {};

                    var bio = tankFish.reduce(function (s, f) { var sp = (SPECIES_BY_TANK[selectedTank] || []).find(function (x) { return x.id === f; }); return s + (sp ? sp.load : 0); }, 0);

                    var mathStr = info.math ? info.math(waterChem, t, bio, tankFish.length) : '';

                    return React.createElement("div", { className: "mt-3 bg-white rounded-xl p-3 border-2 border-cyan-300/60 shadow-lg animate-in fade-in duration-200" },

                      React.createElement("div", { className: "flex items-center justify-between mb-2" },

                        React.createElement("h5", { className: "text-xs font-bold text-cyan-800" }, info.icon + " " + info.name),

                        React.createElement("button", { "aria-label": "Change chem tooltip", onClick: function () { upd('chemTooltip', null); }, className: "text-[10px] text-slate-500 hover:text-slate-600" }, "\u2715")

                      ),

                      React.createElement("div", { className: "space-y-2 text-[11px] leading-relaxed" },

                        React.createElement("div", { className: "bg-cyan-50 rounded-lg p-2" },

                          React.createElement("p", { className: "font-bold text-cyan-700 mb-0.5" }, "\uD83D\uDCD6 What is it?"),

                          React.createElement("p", { className: "text-slate-600" }, info.what)

                        ),

                        React.createElement("div", { className: "bg-green-50 rounded-lg p-2" },

                          React.createElement("p", { className: "font-bold text-green-700 mb-0.5" }, "\u2705 Safe Range"),

                          React.createElement("p", { className: "text-slate-600" }, info.safeRange)

                        ),

                        React.createElement("div", { className: "bg-red-50 rounded-lg p-2" },

                          React.createElement("p", { className: "font-bold text-red-700 mb-0.5" }, "\u26A0\uFE0F Why It's Dangerous"),

                          React.createElement("p", { className: "text-slate-600" }, info.danger)

                        ),

                        mathStr && React.createElement("div", { className: "bg-indigo-50 rounded-lg p-2" },

                          React.createElement("p", { className: "font-bold text-indigo-700 mb-0.5" }, "\uD83E\uDDEE Current Math"),

                          React.createElement("pre", { className: "text-[10px] text-slate-600 font-mono whitespace-pre-wrap" }, mathStr)

                        ),

                        React.createElement("div", { className: "bg-amber-50 rounded-lg p-2" },

                          React.createElement("p", { className: "font-bold text-amber-700 mb-0.5" }, "\uD83D\uDCA1 How to Fix"),

                          React.createElement("p", { className: "text-slate-600" }, info.fix)

                        )

                      )

                    );

                  })(),

                  // Nitrogen cycle mini-diagram

                  !chemTooltip && React.createElement("div", { className: "mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-500 bg-gradient-to-r from-red-50/50 via-orange-50/50 to-green-50/50 rounded-xl p-2.5 border border-slate-100" },

                    React.createElement("span", { className: "font-bold text-red-500" }, "NH\u2083"),

                    React.createElement("span", null, " \u2192 "),

                    React.createElement("span", { className: "text-[11px] text-slate-500" }, "Nitrosomonas"),

                    React.createElement("span", null, " \u2192 "),

                    React.createElement("span", { className: "font-bold text-orange-500" }, "NO\u2082"),

                    React.createElement("span", null, " \u2192 "),

                    React.createElement("span", { className: "text-[11px] text-slate-500" }, "Nitrobacter"),

                    React.createElement("span", null, " \u2192 "),

                    React.createElement("span", { className: "font-bold text-green-500" }, "NO\u2083"),

                    React.createElement("span", { className: "ml-1 text-slate-500" }, "(Nitrogen Cycle)")

                  )

                ),



                // â”€â”€ Plant Management Panel â”€â”€

                React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 rounded-2xl p-4 border border-emerald-200/60 shadow-sm" },

                  React.createElement("div", { className: "flex items-center justify-between mb-2" },

                    React.createElement("h4", { className: "text-xs font-bold text-emerald-700" }, "\uD83C\uDF31 Aquatic Plants (" + tankPlants.length + "/8)"),

                    tankPlants.length > 0 && React.createElement("span", { className: "text-[11px] text-emerald-500 italic" },

                      "\uD83C\uDF3F " + tankPlants.reduce(function (s, pid) { var b = plantBiomass[pid]; return s + (b ? b : 0); }, 0).toFixed(1) + " total biomass"

                    )

                  ),

                  // Current plants list

                  tankPlants.length === 0

                    ? React.createElement("div", { className: "text-center py-4 text-sm text-emerald-400 italic" },

                      "\uD83C\uDF3E No plants yet \u2014 add some to boost O\u2082 and absorb nitrates!"

                    )

                    : React.createElement("div", { className: "space-y-1.5 mb-3" },

                      tankPlants.map(function (pid, idx) {

                        var pSpec = plantCatalog.find(function (ps) { return ps.id === pid; });

                        if (!pSpec) return null;

                        var hp = (plantHealth[pid] !== undefined ? plantHealth[pid] : 100);

                        var bm = (plantBiomass[pid] !== undefined ? plantBiomass[pid] : 1.0);

                        var hpColor = hp > 70 ? 'bg-green-500' : hp > 40 ? 'bg-yellow-500' : 'bg-red-500';

                        var hpTextColor = hp > 70 ? 'text-green-600' : hp > 40 ? 'text-yellow-600' : 'text-red-600';

                        return React.createElement("div", {

                          key: pid + '-' + idx,

                          className: "flex items-center gap-2 bg-white/80 rounded-lg p-2 border border-emerald-100 hover:border-emerald-300 transition-all"

                        },

                          React.createElement("span", { className: "text-lg" }, pSpec.icon || '\uD83C\uDF3F'),

                          React.createElement("div", { className: "flex-1 min-w-0" },

                            React.createElement("div", { className: "text-[11px] font-bold text-emerald-800 truncate" }, pSpec.name),

                            React.createElement("div", { className: "flex items-center gap-2 mt-0.5" },

                              React.createElement("div", { className: "flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden" },

                                React.createElement("div", { style: { width: Math.max(0, Math.min(100, hp)) + '%', transition: 'width 0.5s' }, className: "h-full rounded-full " + hpColor })

                              ),

                              React.createElement("span", { className: "text-[11px] font-mono " + hpTextColor }, hp.toFixed(0) + '%'),

                              React.createElement("span", { className: "text-[11px] text-slate-500" }, '\uD83C\uDF3F' + bm.toFixed(1))

                            )

                          ),

                          React.createElement("button", { "aria-label": "Remove plant",

                            onClick: function () { removePlant(idx); },

                            className: "text-[10px] text-red-400 hover:text-red-600 font-bold px-1",

                            title: "Remove plant"

                          }, "\u2715")

                        );

                      })

                    ),

                  // Add plant selector

                  tankPlants.length < 8 && React.createElement("div", { className: "mt-2" },

                    React.createElement("div", { className: "text-[10px] font-bold text-emerald-600 mb-1" }, "\u2795 Add a Plant:"),

                    React.createElement("div", { className: "grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto" },

                      plantCatalog.map(function (ps) {

                        var alreadyAdded = tankPlants.indexOf(ps.id) !== -1;

                        return React.createElement("button", { "aria-label": "Aquarium action",

                          key: ps.id,

                          onClick: function () { if (!alreadyAdded) addPlant(ps.id); },

                          disabled: alreadyAdded,

                          className: "text-left rounded-lg p-1.5 text-[10px] transition-all " +

                            (alreadyAdded

                              ? "bg-emerald-100/50 text-emerald-400 cursor-not-allowed opacity-60"

                              : "bg-white/70 hover:bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-sm cursor-pointer")

                        },

                          React.createElement("span", { className: "font-bold" }, (ps.icon || '\uD83C\uDF3F') + ' ' + ps.name),

                          React.createElement("div", { className: "text-[8px] text-slate-500 mt-0.5 leading-tight" },

                            "O\u2082:" + (ps.o2 > 0 ? '+' : '') + ps.o2.toFixed(2) +

                            " | NO\u2083:" + (ps.nitrateAbsorb > 0 ? '-' : '') + ps.nitrateAbsorb.toFixed(2) +

                            " | \u2600\uFE0F" + ps.light

                          )

                        );

                      })

                    )

                  ),

                  // Ecosystem tip

                  tankPlants.length > 0 && React.createElement("div", { className: "mt-2 text-[11px] text-emerald-600/80 bg-emerald-100/40 rounded-lg p-2 leading-relaxed" },

                    "\uD83D\uDCA1 ",

                    React.createElement("strong", null, "Ecosystem Tip: "),

                    "Plants produce O\u2082 during the day via photosynthesis but consume it at night. Balance fish load with plant biomass to keep dissolved oxygen stable. Too many nutrients without enough plants can trigger algae blooms!"

                  )

                ),







                // ── Breeding Status Panel ──

                (function () {

                  var breedableSpecies = [];

                  var seenSpecies = {};

                  tankFish.forEach(function (fId) {

                    if (!seenSpecies[fId] && BREEDING_DATA[fId]) {

                      seenSpecies[fId] = true;

                      breedableSpecies.push(fId);

                    }

                  });

                  if (breedableSpecies.length === 0) return null;

                  var speciesList = SPECIES_BY_TANK[selectedTank] || [];

                  var speciesPopCounts = {};

                  tankFish.forEach(function (fId) { speciesPopCounts[fId] = (speciesPopCounts[fId] || 0) + 1; });

                  var stratIcons = { livebearer: '\uD83E\uDD30', egg_layer: '\uD83E\uDD5A', egg_scatter: '\uD83C\uDF3F\uD83E\uDD5A', mouthbrooder: '\uD83D\uDC41\uFE0F', hermaphrodite: '\u2695\uFE0F' };

                  var stratLabels = { livebearer: 'Livebearer', egg_layer: 'Egg Layer', egg_scatter: 'Egg Scatter', mouthbrooder: 'Mouthbrooder', hermaphrodite: 'Hermaphrodite' };

                  return React.createElement("div", { className: "bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 rounded-2xl p-4 border border-pink-200/60 shadow-sm" },

                    React.createElement("div", { className: "flex items-center justify-between mb-2" },

                      React.createElement("h4", { className: "text-xs font-bold text-pink-700" }, "\uD83D\uDC9E Breeding Status"),

                      React.createElement("span", { className: "text-[11px] text-pink-500 bg-pink-100/60 rounded-full px-2 py-0.5" }, "\uD83D\uDC23 " + totalFryBorn + " fry born")

                    ),

                    React.createElement("div", { className: "space-y-2" },

                      breedableSpecies.map(function (sId) {

                        var bData = BREEDING_DATA[sId];

                        var sp = speciesList.find(function (x) { return x.id === sId; });

                        if (!sp) return null;

                        var pop = speciesPopCounts[sId] || 0;

                        var bs = breedingState[sId];

                        var isGestating = !!bs;

                        var gestPct = isGestating ? Math.min(100, Math.round(((simTick - bs.startTick) / bData.gestationTicks) * 100)) : 0;

                        var cooldownLeft = 0;

                        if (!isGestating && breedingCooldowns[sId]) {

                          var cooldownNeeded = Math.floor(bData.gestationTicks * 1.5);

                          cooldownLeft = Math.max(0, cooldownNeeded - (simTick - breedingCooldowns[sId]));

                        }

                        var popOk = pop >= bData.minPop;

                        var stressOk = (fishStress[sId] || 0) <= 50;

                        var hungerOk = (hungerLevels[sId] || 50) <= 70;

                        return React.createElement("div", { key: sId, className: "bg-white/80 rounded-xl p-2.5 border " + (isGestating ? "border-pink-300 shadow-pink-100 shadow-sm" : "border-pink-100") },

                          React.createElement("div", { className: "flex items-center gap-2 mb-1" },

                            React.createElement("span", { className: "text-base" }, stratIcons[bData.type] || '\uD83D\uDC1F'),

                            React.createElement("div", { className: "flex-1 min-w-0" },

                              React.createElement("div", { className: "text-[11px] font-bold text-pink-800 truncate" }, sp.name),

                              React.createElement("div", { className: "text-[11px] text-pink-400" }, stratLabels[bData.type] + " \u2022 Pop: " + pop + "/" + bData.minPop + " min")

                            ),

                            isGestating && React.createElement("span", { className: "text-[11px] font-mono text-pink-600 bg-pink-100 rounded-full px-1.5 py-0.5 animate-pulse" }, gestPct + "%")

                          ),

                          isGestating && React.createElement("div", { className: "mt-1" },

                            React.createElement("div", { className: "h-2 bg-pink-100 rounded-full overflow-hidden" },

                              React.createElement("div", { style: { width: gestPct + '%', transition: 'width 0.5s' }, className: "h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500" })

                            ),

                            React.createElement("div", { className: "flex justify-between mt-0.5" },

                              React.createElement("span", { className: "text-[8px] text-pink-400" }, bs.stage === 'gestating' && bData.type === 'egg_layer' && bs.eggsLogged ? '\uD83E\uDD5A Eggs developing...' : '\u2764\uFE0F Gestating...'),

                              React.createElement("span", { className: "text-[8px] text-pink-400" }, "Expected: " + bs.fryCount + " fry")

                            )

                          ),

                          !isGestating && cooldownLeft > 0 && React.createElement("div", { className: "mt-1 text-[11px] text-slate-500 italic" }, "\u23F3 Cooldown: " + cooldownLeft + " ticks remaining"),

                          !isGestating && cooldownLeft === 0 && React.createElement("div", { className: "flex gap-1 mt-1 flex-wrap" },

                            React.createElement("span", { className: "text-[8px] rounded px-1 " + (popOk ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500") }, popOk ? "\u2714 Pop" : "\u2718 Pop"),

                            React.createElement("span", { className: "text-[8px] rounded px-1 " + (stressOk ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500") }, stressOk ? "\u2714 Calm" : "\u2718 Stress"),

                            React.createElement("span", { className: "text-[8px] rounded px-1 " + (hungerOk ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500") }, hungerOk ? "\u2714 Fed" : "\u2718 Hungry")

                          )

                        );

                      })

                    ),

                    React.createElement("div", { className: "mt-2 text-[11px] text-pink-600/80 bg-pink-100/40 rounded-lg p-2 leading-relaxed" },

                      "\uD83D\uDCA1 ",

                      React.createElement("strong", null, "Breeding Tip: "),

                      "Keep water clean, stress low, and fish well-fed. Plants provide hiding spots for fry, boosting survival. Predators in the tank will eat vulnerable fry!"

                    )

                  );

                })(),



                // Bioload Meter

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200" },

                  React.createElement("div", { className: "flex items-center justify-between mb-1" },

                    React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "\uD83D\uDC1F Bioload"),

                    React.createElement("span", { className: "text-xs font-mono " + (loadPct > 80 ? 'text-red-600' : loadPct > 60 ? 'text-amber-600' : 'text-green-600') }, currentLoad + " / " + maxLoad + " (" + loadPct + "%)")

                  ),

                  React.createElement("div", { className: "h-3 bg-slate-100 rounded-full overflow-hidden" },

                    React.createElement("div", { style: { width: loadPct + '%', transition: 'width 0.3s' }, className: "h-full rounded-full " + (loadPct > 80 ? 'bg-red-500' : loadPct > 60 ? 'bg-amber-400' : 'bg-green-500') })

                  )

                ),



                // Tank visualization (animated fish)

                React.createElement("div", {

                  className: "relative rounded-2xl overflow-hidden border-2 border-cyan-300/60 shadow-lg shadow-cyan-500/20",

                  style: { height: '240px', background: selectedTank === 'reef' || selectedTank === 'invert' ? 'linear-gradient(180deg, #67e8f9 0%, #22d3ee 15%, #0891b2 40%, #155e75 70%, #164e63 100%)' : selectedTank === 'coldwater' ? 'linear-gradient(180deg, #bae6fd 0%, #7dd3fc 15%, #3b82f6 40%, #1e40af 70%, #1e3a5f 100%)' : selectedTank === 'brackish' ? 'linear-gradient(180deg, #a7f3d0 0%, #6ee7b7 15%, #059669 40%, #065f46 70%, #064e3b 100%)' : 'linear-gradient(180deg, #a5f3fc 0%, #67e8f9 15%, #22d3ee 40%, #0891b2 70%, #155e75 100%)' }

                },

                  // Water surface shimmer (dual-layer)

                  React.createElement("div", {

                    style: { position: 'absolute', top: 0, left: 0, right: 0, height: '30px', background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.12) 40%, transparent 100%)', zIndex: 5 }

                  }),

                  // Animated shimmer wave overlay

                  React.createElement("div", {

                    style: { position: 'absolute', top: 0, left: '-10%', width: '120%', height: '18px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 20%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.18) 80%, transparent 100%)', zIndex: 6, animation: 'aquaShimmerWave 6s ease-in-out infinite', pointerEvents: 'none' }

                  }),

                  // Secondary surface ripple band (slower, deeper)

                  React.createElement("div", {

                    style: { position: 'absolute', top: '14px', left: '-5%', width: '110%', height: '10px', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 70%, transparent 100%)', zIndex: 5, animation: 'aquaShimmerWave 10s ease-in-out 1.5s infinite reverse', pointerEvents: 'none' }

                  }),

                  // Specular highlight (overhead light source)

                  React.createElement("div", {

                    style: { position: 'absolute', top: '6px', left: '12%', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 50%, transparent 75%)', zIndex: 6, animation: 'aquaSpecular 5s ease-in-out infinite', pointerEvents: 'none' }

                  }),

                  // Depth fog (bottom haze)

                  React.createElement("div", {

                    style: { position: 'absolute', bottom: '24px', left: 0, right: 0, height: '40px', background: 'linear-gradient(0deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.04) 60%, transparent 100%)', zIndex: 2, pointerEvents: 'none', animation: 'aquaDepthFog 8s ease-in-out infinite' }

                  }),

                  // Light rays (5 with varied widths/angles)

                  [0, 1, 2, 3, 4].map(function (i) {

                    var widths = [30, 50, 35, 45, 28];

                    var lefts = [10, 25, 45, 65, 82];

                    var skews = [-12, -18, -10, -20, -14];

                    var opacities = [0.08, 0.12, 0.1, 0.14, 0.07];

                    var pulseDelays = [0, 1.5, 0.8, 2.2, 3];

                    return React.createElement("div", {

                      key: 'ray-' + i,

                      style: {

                        position: 'absolute', top: 0, left: lefts[i] + '%',

                        width: widths[i] + 'px', height: '100%',

                        background: 'linear-gradient(180deg, rgba(255,255,255,' + opacities[i] + ') 0%, rgba(255,255,255,' + (opacities[i] * 0.3) + ') 50%, transparent 80%)',

                        transform: 'skewX(' + skews[i] + 'deg)', zIndex: 1,

                        animation: 'aquaShimmerWave ' + (7 + i * 1.5) + 's ease-in-out ' + pulseDelays[i] + 's infinite',

                        pointerEvents: 'none'

                      }

                    });

                  }),

                  // Caustic light pattern on substrate

                  React.createElement("div", {

                    style: { position: 'absolute', bottom: '20px', left: 0, right: 0, height: '50px', background: 'repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 0 0 / 30px 30px', animation: 'aquaCaustic 8s ease-in-out infinite', zIndex: 2, pointerEvents: 'none', opacity: 0.5, mixBlendMode: 'overlay' }

                  }),

                  // Decorative plants (6 with varied heights, widths, and leaf fronds)

                  (selectedTank === 'planted' || selectedTank === 'freshwater' || selectedTank === 'brackish') && [0, 1, 2, 3, 4, 5].map(function (i) {

                    var heights = [55, 38, 65, 42, 72, 30];

                    var widths = [8, 6, 10, 7, 9, 5];

                    var lefts = [5, 18, 32, 50, 68, 88];

                    var greens = ['#22c55e', '#16a34a', '#15803d', '#22c55e', '#16a34a', '#4ade80'];

                    return React.createElement("div", {

                      key: 'plant-' + i,

                      style: { position: 'absolute', bottom: '24px', left: lefts[i] + '%', zIndex: 2 }

                    },

                      // Main stem

                      React.createElement("div", {

                        style: {

                          width: widths[i] + 'px', height: heights[i] + 'px', borderRadius: '4px 4px 0 0',

                          background: 'linear-gradient(180deg, ' + greens[i] + ' 0%, #15803d 100%)',

                          opacity: 0.75, transformOrigin: 'bottom center',

                          animation: 'aquaSeaweed ' + (3 + i * 0.5) + 's ease-in-out ' + (i * 0.7) + 's infinite'

                        }

                      }),

                      // Side frond (left)

                      i % 2 === 0 && React.createElement("div", {

                        style: {

                          position: 'absolute', bottom: (heights[i] * 0.4) + 'px', left: '-6px',

                          width: '10px', height: (heights[i] * 0.35) + 'px', borderRadius: '6px 2px 2px 6px',

                          background: greens[i], opacity: 0.5, transformOrigin: 'bottom right',

                          transform: 'rotate(25deg)',

                          animation: 'aquaPlantGrow ' + (4 + i * 0.3) + 's ease-in-out ' + (i * 0.5) + 's infinite'

                        }

                      }),

                      // Side frond (right)

                      i % 3 !== 2 && React.createElement("div", {

                        style: {

                          position: 'absolute', bottom: (heights[i] * 0.6) + 'px', right: '-5px',

                          width: '8px', height: (heights[i] * 0.28) + 'px', borderRadius: '2px 5px 5px 2px',

                          background: greens[i], opacity: 0.45, transformOrigin: 'bottom left',

                          transform: 'rotate(-20deg)',

                          animation: 'aquaPlantGrow ' + (3.5 + i * 0.4) + 's ease-in-out ' + (i * 0.6 + 0.3) + 's infinite'

                        }

                      }),

                      // Leaf tip cluster

                      React.createElement("div", {

                        style: {

                          position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)',

                          width: (widths[i] + 6) + 'px', height: '6px', borderRadius: '50%',

                          background: 'radial-gradient(circle, ' + greens[i] + ' 40%, transparent 100%)',

                          opacity: 0.6,

                          animation: 'aquaPlantGrow ' + (5 + i * 0.3) + 's ease-in-out ' + (i * 0.4) + 's infinite'

                        }

                      })

                    );

                  }),

                  // Coral for reef tanks (5 with organic sway + polyps)

                  (selectedTank === 'reef' || selectedTank === 'invert') && [0, 1, 2, 3, 4].map(function (i) {

                    var colors = ['#f472b6', '#fb923c', '#a78bfa', '#34d399', '#fbbf24'];

                    var widths = [18, 22, 16, 24, 14];

                    var heights = [28, 35, 22, 40, 18];

                    var lefts = [8, 22, 42, 60, 82];

                    var radii = ['10px 6px 0 0', '6px 10px 0 0', '8px 8px 0 0', '4px 12px 0 0', '12px 4px 0 0'];

                    return React.createElement("div", {

                      key: 'coral-' + i,

                      style: { position: 'absolute', bottom: '24px', left: lefts[i] + '%', zIndex: 2 }

                    },

                      // Main coral body

                      React.createElement("div", {

                        style: {

                          width: widths[i] + 'px', height: heights[i] + 'px', borderRadius: radii[i],

                          background: 'linear-gradient(180deg, ' + colors[i] + ' 0%, ' + colors[i] + '99 100%)',

                          opacity: 0.65, transformOrigin: 'bottom center',

                          animation: 'aquaCoralSway ' + (5 + i * 0.8) + 's ease-in-out ' + (i * 1) + 's infinite'

                        }

                      }),

                      // Polyp dots

                      [0, 1, 2].map(function (j) {

                        return React.createElement("div", {

                          key: 'polyp-' + j,

                          style: {

                            position: 'absolute',

                            top: (4 + j * (heights[i] / 4)) + 'px',

                            left: (2 + (j % 2) * (widths[i] - 6)) + 'px',

                            width: '3px', height: '3px', borderRadius: '50%',

                            background: 'rgba(255,255,255,0.5)',

                            animation: 'aquaCoralSway ' + (3 + j * 0.5) + 's ease-in-out ' + (i * 0.5 + j * 0.3) + 's infinite'

                          }

                        });

                      })

                    );

                  }),

                  // Rocky substrate (dual-layer with sand ripple)

                  React.createElement("div", {

                    style: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '32px', borderRadius: '0 0 12px 12px', zIndex: 3, background: selectedTank === 'reef' || selectedTank === 'invert' ? 'linear-gradient(0deg, #78350f 0%, #92400e 30%, #b45309 60%, transparent 100%)' : 'linear-gradient(0deg, #78350f 0%, #92400e 30%, #d97706 60%, transparent 100%)' }

                  }),

                  // Sand ripple texture overlay

                  React.createElement("div", {

                    style: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '18px', borderRadius: '0 0 12px 12px', zIndex: 3, background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 12px, rgba(255,255,255,0.04) 12px, rgba(255,255,255,0.04) 14px)', pointerEvents: 'none' }

                  }),

                  // Pebbles on substrate (10 with varied sizes and muted colors)

                  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) {

                    var pebbleColors = ['rgba(120,100,80,0.5)', 'rgba(160,140,110,0.4)', 'rgba(100,90,70,0.45)', 'rgba(140,125,100,0.35)', 'rgba(110,95,75,0.5)', 'rgba(150,135,115,0.4)', 'rgba(130,110,90,0.45)', 'rgba(95,85,70,0.5)', 'rgba(145,130,105,0.35)', 'rgba(115,100,80,0.4)'];

                    var pebbleSizes = [[6, 4], [4, 3], [8, 5], [5, 4], [7, 5], [4, 3], [6, 4], [9, 5], [5, 3], [7, 4]];

                    return React.createElement("div", {

                      key: 'pebble-' + i,

                      style: {

                        position: 'absolute', bottom: (2 + (i % 4) * 3) + 'px', left: (3 + i * 9.5) + '%',

                        width: pebbleSizes[i][0] + 'px', height: pebbleSizes[i][1] + 'px',

                        borderRadius: '50%', background: pebbleColors[i],

                        zIndex: 4

                      }

                    });

                  }),

                  // Fish with species-specific swimming animation

                  tankFish.map(function (fId, idx) {

                    var sp = species.find(function (s) { return s.id === fId; });

                    var animInfo = SPECIES_ANIM[fId] || null;

                    var ds = SPECIES_DISPLAY_SIZE[fId] || { w: 52, h: 38, emoji: 28 };

                    // Y-positioning based on zone

                    var yPos;

                    if (animInfo && animInfo.yZone === 'bottom') {

                      yPos = 160 + (idx * 7) % 35; // near substrate

                    } else if (animInfo && animInfo.yZone === 'top') {

                      yPos = 15 + (idx * 11) % 40; // near surface

                    } else {

                      yPos = 40 + (idx * 29 + idx * 7) % 120; // mid-water

                    }

                    var xPos = 5 + (idx * 31 + idx * idx * 11) % 85;

                    var direction = idx % 2 === 0 ? 1 : -1;

                    var svgHtml = getTankSvg(fId);

                    // Species-specific or default animation

                    var swimAnim, swimDuration;

                    if (animInfo) {

                      swimAnim = animInfo.anim;

                      swimDuration = animInfo.speed[0] + (idx % 3) * ((animInfo.speed[1] - animInfo.speed[0]) / 3);

                    } else {

                      swimAnim = 'aquaSwim';

                      swimDuration = 3 + (idx % 3) * 1.5;

                    }

                    var swimDelay = (idx * 0.9) % 4;

                    var swayDuration = 2.5 + (idx % 4) * 0.7;

                    var swayDelay = (idx * 0.6) % 3;

                    // Slow down animations when lights are off

                    if (!lightsOn) { swimDuration *= 2; swayDuration *= 2; }

                    var isSick = fishSickness[fId] ? true : false;

                    return React.createElement("div", {

                      key: idx,

                      className: svgHtml ? 'aqua-fish-svg' : 'aqua-fish',

                      style: {

                        position: 'absolute', top: yPos + 'px', left: xPos + '%',

                        cursor: 'pointer', zIndex: 6, userSelect: 'none',

                        width: svgHtml ? (ds.w + 'px') : 'auto', height: svgHtml ? (ds.h + 'px') : 'auto',

                        fontSize: svgHtml ? undefined : (ds.emoji + 'px'),

                        transform: direction < 0 ? 'scaleX(-1)' : 'none',

                        animation: swimAnim + ' ' + swimDuration + 's ease-in-out ' + swimDelay + 's infinite alternate' + (svgHtml ? ', aquaBodySway ' + swayDuration + 's ease-in-out ' + swayDelay + 's infinite' : ''),

                        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' + (isSick ? ' saturate(0.6) brightness(0.85)' : ''),

                        transition: 'transform 0.3s, filter 0.3s',

                        opacity: lightsOn ? 1 : 0.7

                      },

                      title: sp ? sp.name + (isSick ? ' \u26A0\uFE0F SICK: ' + fishSickness[fId].disease : '') + ': ' + sp.fact : fId,

                      onClick: function () {

                        openAnatomy(fId);

                      }

                    },

                      // Render SVG body plan or fallback to emoji

                      svgHtml

                        ? React.createElement("div", { dangerouslySetInnerHTML: { __html: svgHtml }, style: { width: '100%', height: '100%', pointerEvents: 'none' } })

                        : (sp ? sp.icon : '\uD83D\uDC1F'),

                      // Sickness indicator

                      isSick && React.createElement("div", { className: 'aqua-sick-overlay' },

                        fishSickness[fId].severity >= 3 ? '\uD83D\uDCA9' : fishSickness[fId].severity >= 2 ? '\uD83E\uDE78' : '\u26A0\uFE0F'

                      ),

                      // Hunger bar under fish

                      (() => {

                        var hunger = hungerLevels[fId] !== undefined ? hungerLevels[fId] : 50;

                        var barColor = hunger >= 80 ? '#ef4444' : hunger >= 50 ? '#f59e0b' : '#22c55e';

                        return React.createElement("div", {

                          style: { position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: '24px', height: '3px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px', overflow: 'hidden' }

                        },

                          React.createElement("div", { style: { width: (100 - hunger) + '%', height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.5s, background 0.3s' } })

                        );

                      })()

                    );

                  }),

                  // Animated bubbles

                  [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {

                    var sizes = [3, 5, 4, 6, 3, 7, 4, 5];

                    return React.createElement("div", {

                      key: 'bubble-' + i,

                      style: {

                        position: 'absolute', left: (8 + i * 12) + '%',

                        width: sizes[i] + 'px', height: sizes[i] + 'px',

                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(255,255,255,0.2))',

                        borderRadius: '50%', zIndex: 5,

                        animation: 'aquaBubble ' + (2 + i * 0.5) + 's ease-in-out ' + (i * 0.7) + 's infinite'

                      }

                    });

                  }),

                  // Floating particles (plankton/detritus)

                  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) {

                    var sizes = [1.5, 2, 1, 2.5, 1.5, 3, 1, 2, 1.5, 2, 1, 2.5];

                    var lefts = [5, 12, 22, 30, 40, 52, 60, 70, 78, 85, 92, 48];

                    var drifts = [6, 8, 5, 9, 7, 10, 6, 8, 5, 7, 9, 11];

                    var delays = [0, 1.2, 0.5, 2.8, 1.8, 0.3, 3.5, 2.1, 4, 0.8, 1.5, 3.2];

                    return React.createElement("div", {

                      key: 'particle-' + i,

                      style: {

                        position: 'absolute', left: lefts[i] + '%',

                        width: sizes[i] + 'px', height: sizes[i] + 'px',

                        background: i % 3 === 0 ? 'rgba(255,255,255,0.45)' : i % 3 === 1 ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.3)',

                        borderRadius: '50%', zIndex: 5, pointerEvents: 'none',

                        animation: 'aquaParticle ' + drifts[i] + 's linear ' + delays[i] + 's infinite'

                      }

                    });

                  }),

                  // Day/night + lights-off overlay

                  (!lightsOn || simHour >= 20 || simHour < 6) && React.createElement("div", {

                    style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: !lightsOn ? 'linear-gradient(180deg, rgba(15,23,42,0.5) 0%, rgba(30,41,59,0.45) 50%, rgba(15,23,42,0.55) 100%)' : 'linear-gradient(180deg, rgba(15,23,42,0.3) 0%, rgba(30,41,59,0.25) 50%, rgba(15,23,42,0.35) 100%)', zIndex: 7, pointerEvents: 'none', borderRadius: '16px', transition: 'opacity 0.5s' }

                  }),

                  // Algae tint overlay

                  algaeLevel > 15 && React.createElement("div", {

                    style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(34,197,94,' + Math.min(0.25, algaeLevel / 400) + ')', zIndex: 7, pointerEvents: 'none', borderRadius: '16px', transition: 'background 1s' }

                  }),

                  // Glass edge reflection (left)

                  React.createElement("div", {

                    style: { position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)', zIndex: 8, pointerEvents: 'none', borderRadius: '16px 0 0 16px' }

                  }),

                  // Glass edge reflection (right, animated glint)

                  React.createElement("div", {

                    style: { position: 'absolute', top: 0, right: 0, width: '5px', height: '100%', background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.06) 100%)', zIndex: 8, pointerEvents: 'none', borderRadius: '0 16px 16px 0', overflow: 'hidden' }

                  },

                    React.createElement("div", {

                      style: { position: 'absolute', top: '-20%', left: 0, width: '100%', height: '30%', background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)', animation: 'aquaGlassGlint 6s ease-in-out 2s infinite', pointerEvents: 'none' }

                    })

                  ),

                  // Tank label overlay

                  React.createElement("div", {

                    style: { position: 'absolute', top: '8px', right: '10px', zIndex: 10, padding: '2px 8px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }

                  },

                    React.createElement("span", { style: { fontSize: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' } }, tank.name),

                    React.createElement("span", { style: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '6px' } }, (simHour >= 20 || simHour < 6) ? '\uD83C\uDF19 Night' : '\u2600\uFE0F Day')

                  )

                ),





                // Fish stocking list

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200" },

                  React.createElement("h4", { className: "text-xs font-bold text-slate-600 mb-2" }, "\u2795 Add Fish"),

                  React.createElement("div", { className: "flex flex-wrap gap-1" },

                    species.map(function (sp) {

                      return React.createElement("button", { "aria-label": "Add Fish",

                        key: sp.id,

                        onClick: function () { addFish(sp.id); },

                        className: "px-2 py-1 text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full hover:bg-cyan-100 transition-all",

                        title: sp.fact

                      }, sp.icon + " " + sp.name + " (" + sp.load + ")");

                    })

                  ),

                  tankFish.length > 0 && React.createElement("div", { className: "mt-2 flex flex-wrap gap-1" },

                    tankFish.map(function (fId, idx) {

                      var sp = species.find(function (s) { return s.id === fId; });

                      return React.createElement("span", {

                        key: idx,

                        onClick: function () { removeFish(idx); },

                        className: "px-2 py-0.5 text-[10px] bg-cyan-100 text-cyan-800 rounded-full cursor-pointer hover:bg-red-100 hover:text-red-700 transition-all",

                        title: "Click to remove"

                      }, (sp ? sp.icon + " " + sp.name : fId) + " \u00D7");

                    })

                  )

                ),



                // Action buttons

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("div", { className: "flex gap-2" },

                    React.createElement("button", { "aria-label": "Action",

                      onClick: function () {

                        if (simRunning) {

                          upd('simRunning', false);

                          if (window._aquaSimInterval) { clearInterval(window._aquaSimInterval); window._aquaSimInterval = null; }

                        } else {

                          upd('simRunning', true);

                          var speed = simSpeed || 1;

                          var interval = speed === 0 ? 99999 : speed === 1 ? 2000 : speed === 2 ? 1000 : 400;

                          if (window._aquaSimInterval) clearInterval(window._aquaSimInterval);

                          window._aquaSimInterval = setInterval(function () { simStep(); }, interval);

                        }

                      },

                      className: "flex-1 py-2.5 font-bold rounded-xl text-sm transition-all shadow-md " + (simRunning ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/25" : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-cyan-500/25")

                    }, simRunning ? "\u23F8 Pause" : "\u25B6 Run Simulation"),

                    React.createElement("button", { "aria-label": "Water",

                      onClick: doWaterChange,

                      className: "px-3 py-2.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-bold rounded-xl text-xs hover:from-blue-100 hover:to-blue-200 transition-all border border-blue-200/60"

                    }, "\uD83D\uDCA7 Water"),

                    React.createElement("button", { "aria-label": "Flake",

                      onClick: feedFish,

                      disabled: tankFish.length === 0,

                      className: "px-3 py-2.5 font-bold rounded-xl text-xs transition-all border " + (tankFish.length === 0 ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200 border-amber-200/60")

                    }, "\uD83C\uDF7D\uFE0F Flake"),

                    React.createElement("button", { "aria-label": "Live",

                      onClick: feedLive,

                      disabled: tankFish.length === 0,

                      className: "px-3 py-2.5 font-bold rounded-xl text-xs transition-all border " + (tankFish.length === 0 ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 border-red-200/60")

                    }, "\uD83E\uDD90 Live")

                  ),

                  // ── Second action row ──

                  React.createElement("div", { className: "flex gap-2" },

                    React.createElement("button", { "aria-label": "Toggle Lights",

                      onClick: toggleLights,

                      className: "flex-1 px-3 py-2 font-bold rounded-xl text-xs transition-all border " + (lightsOn ? "bg-gradient-to-r from-yellow-50 to-amber-50 text-amber-700 hover:from-yellow-100 hover:to-amber-100 border-amber-200/60" : "bg-gradient-to-r from-indigo-100 to-slate-100 text-indigo-700 hover:from-indigo-200 hover:to-slate-200 border-indigo-200/60")

                    }, lightsOn ? "\uD83D\uDCA1 Lights On" : "\uD83C\uDF19 Lights Off"),

                    React.createElement("button", { "aria-label": "Medicate Fish",

                      onClick: medicateFish,

                      className: "flex-1 px-3 py-2 font-bold rounded-xl text-xs transition-all border " + (Object.keys(fishSickness).length > 0 ? "bg-gradient-to-r from-pink-50 to-rose-50 text-rose-700 hover:from-pink-100 hover:to-rose-100 border-rose-200/60 animate-pulse" : "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-500 border-slate-200/60")

                    }, "\uD83D\uDC8A Medicate" + (Object.keys(fishSickness).length > 0 ? " (" + Object.keys(fishSickness).length + ")" : "")),

                    React.createElement("button", { "aria-label": "Clean Glass",

                      onClick: cleanGlass,

                      className: "flex-1 px-3 py-2 font-bold rounded-xl text-xs transition-all border " + (algaeLevel > 30 ? "bg-gradient-to-r from-lime-50 to-green-50 text-green-700 hover:from-lime-100 hover:to-green-100 border-green-200/60" : "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-500 border-slate-200/60")

                    }, "\uD83E\uDDF9 Clean" + (algaeLevel > 15 ? " (" + Math.round(algaeLevel) + "%)" : ""))

                  ),



                  // ── Feeding Impact Panel (slides in after feeding) ──

                  feedingLog && React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200/60 animate-in slide-in-from-top duration-300" },

                    React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },

                      React.createElement("span", { className: "text-sm" }, "\uD83C\uDF7D\uFE0F"),

                      React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "Feeding Report"),

                      React.createElement("button", { "aria-label": "Change feeding log", onClick: function () { upd('feedingLog', null); }, className: "ml-auto text-[10px] text-slate-500" }, "\u2715")

                    ),

                    React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center mb-2" },

                      React.createElement("div", { className: "bg-white/70 rounded-lg p-1.5" },

                        React.createElement("div", { className: "text-[11px] text-slate-500" }, "Fish Fed"),

                        React.createElement("div", { className: "text-sm font-bold text-amber-700" }, feedingLog.fishCount)

                      ),

                      React.createElement("div", { className: "bg-white/70 rounded-lg p-1.5" },

                        React.createElement("div", { className: "text-[11px] text-slate-500" }, "Hunger \u2193"),

                        React.createElement("div", { className: "text-sm font-bold text-green-600" }, "-" + feedingLog.avgHungerDrop + " avg")

                      ),

                      React.createElement("div", { className: "bg-white/70 rounded-lg p-1.5" },

                        React.createElement("div", { className: "text-[11px] text-slate-500" }, "NH\u2083 \u2191"),

                        React.createElement("div", { className: "text-sm font-bold text-red-600" }, "+" + feedingLog.ammoniaAdded.toFixed(2))

                      )

                    ),

                    feedingLog.overfedCount > 0 && React.createElement("div", { className: "bg-red-50 rounded-lg p-1.5 text-[10px] text-red-700 font-bold mb-1" },

                      "\u26A0\uFE0F " + feedingLog.overfedCount + " fish already full! Excess food = extra ammonia waste."

                    ),

                    React.createElement("p", { className: "text-[10px] text-amber-700 italic" }, "\uD83D\uDCA1 " + feedingLog.tip)

                  )

                ),



                // ── Tank Health Score & Strategy Tips ──

                (() => {

                  var health = getTankHealth();

                  var scoreColor = health.score >= 80 ? 'text-green-600' : health.score >= 50 ? 'text-amber-600' : 'text-red-600';

                  var scoreBg = health.score >= 80 ? 'from-green-50 to-emerald-50 border-green-200/60' : health.score >= 50 ? 'from-amber-50 to-orange-50 border-amber-200/60' : 'from-red-50 to-rose-50 border-red-200/60';

                  var barColor = health.score >= 80 ? 'bg-green-500' : health.score >= 50 ? 'bg-amber-500' : 'bg-red-500';

                  return React.createElement("div", { className: "bg-gradient-to-r " + scoreBg + " rounded-xl p-3 border shadow-sm" },

                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                      React.createElement("span", { className: "text-sm" }, health.score >= 80 ? '\uD83C\uDF1F' : health.score >= 50 ? '\u26A0\uFE0F' : '\uD83D\uDEA8'),

                      React.createElement("span", { className: "text-xs font-bold " + scoreColor }, "Tank Health"),

                      React.createElement("span", { className: "text-lg font-bold ml-auto " + scoreColor }, health.score + "/100")

                    ),

                    React.createElement("div", { className: "h-2.5 bg-white/50 rounded-full overflow-hidden mb-2" },

                      React.createElement("div", { style: { width: health.score + '%', transition: 'width 0.5s' }, className: "h-full rounded-full " + barColor })

                    ),

                    React.createElement("div", { className: "space-y-1" },

                      health.tips.map(function (tip, i) {

                        return React.createElement("p", { key: i, className: "text-[10px] " + tip.color + " font-bold leading-relaxed" }, tip.icon + " " + tip.text);

                      })

                    )

                  );

                })(),



                // ── Hunger Overview ──

                tankFish.length > 0 && React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200" },

                  React.createElement("h4", { className: "text-xs font-bold text-slate-600 mb-2" }, "\uD83C\uDF7D\uFE0F Fish Hunger Status"),

                  React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },

                    (() => {

                      var seen = {};

                      return tankFish.map(function (fId, idx) {

                        var sp = (SPECIES_BY_TANK[selectedTank] || []).find(function (s) { return s.id === fId; });

                        var hunger = hungerLevels[fId] !== undefined ? hungerLevels[fId] : 50;

                        var stress = fishStress[fId] || 0;

                        var hungerColor = hunger >= 80 ? 'bg-red-500' : hunger >= 50 ? 'bg-amber-400' : 'bg-green-500';

                        var hungerText = hunger >= 80 ? 'Starving!' : hunger >= 50 ? 'Hungry' : hunger >= 20 ? 'Satisfied' : 'Full';

                        var hungerTextColor = hunger >= 80 ? 'text-red-600' : hunger >= 50 ? 'text-amber-600' : 'text-green-600';

                        return React.createElement("div", { key: idx, className: "flex items-center gap-2 bg-slate-50 rounded-lg p-1.5" },

                          React.createElement("span", { className: "text-sm" }, sp ? sp.icon : '\uD83D\uDC1F'),

                          React.createElement("div", { className: "flex-1 min-w-0" },

                            React.createElement("div", { className: "flex items-center justify-between mb-0.5" },

                              React.createElement("span", { className: "text-[11px] font-bold text-slate-600 truncate" }, sp ? sp.name : fId),

                              React.createElement("span", { className: "text-[11px] font-bold " + hungerTextColor }, hungerText)

                            ),

                            React.createElement("div", { className: "h-1.5 bg-slate-200 rounded-full overflow-hidden" },

                              React.createElement("div", { style: { width: (100 - hunger) + '%', transition: 'width 0.5s' }, className: "h-full rounded-full " + hungerColor })

                            )

                          ),

                          stress > 30 && React.createElement("span", { className: "text-[11px] text-red-500", title: 'Stress: ' + Math.round(stress) + '%' }, '\u26A0\uFE0F')

                        );

                      });

                    })()

                  )

                ),



                // ── AI Event Decision Modal ──

                aiEvent && !aiEvent.resolved && React.createElement("div", { className: "ai-event-card rounded-2xl overflow-hidden border-2 border-blue-300/60 shadow-xl shadow-blue-500/10" },

                  // Header bar with category color

                  React.createElement("div", { className: "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-2.5 flex items-center gap-2" },

                    React.createElement("span", { className: "text-lg" }, aiEvent.icon || '\uD83E\uDD16'),

                    React.createElement("span", { className: "text-sm font-bold text-white flex-1" }, aiEvent.title),

                    aiEvent.category && React.createElement("span", { className: "text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/20 text-white/80" }, aiEvent.category === 'ai_generated' ? '\uD83E\uDD16 AI' : aiEvent.category),

                    React.createElement("button", { "aria-label": "Change ai event", onClick: function () { upd('aiEvent', null); }, className: "text-white/60 hover:text-white text-sm ml-1" }, '\u2715')

                  ),

                  // Description

                  React.createElement("div", { className: "px-4 py-3 bg-gradient-to-b from-blue-50 to-white" },

                    React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed mb-2" }, aiEvent.desc),

                    // Educational note

                    aiEvent.educational && React.createElement("div", { className: "bg-indigo-50 rounded-lg p-2.5 mb-3 border border-indigo-100" },

                      React.createElement("div", { className: "flex items-start gap-1.5" },

                        React.createElement("span", { className: "text-xs" }, '\uD83C\uDF93'),

                        React.createElement("p", { className: "text-[10px] text-indigo-700 leading-relaxed italic" }, aiEvent.educational)

                      )

                    ),

                    // Choice buttons

                    React.createElement("div", { className: "space-y-2" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider" }, '\u2696\uFE0F What do you do?'),

                      (aiEvent.choices || []).map(function (choice, idx) {

                        return React.createElement("button", { "aria-label": "Resolve A I Event",

                          key: idx,

                          onClick: function () { resolveAIEvent(idx); },

                          className: "ai-event-choice w-full text-left px-3 py-2.5 rounded-xl border-2 border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/50 group"

                        },

                          React.createElement("div", { className: "flex items-center justify-between" },

                            React.createElement("span", { className: "text-xs font-bold text-slate-700 group-hover:text-blue-700" }, choice.label),

                            choice.xp > 0 && React.createElement("span", { className: "text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700" }, '+' + choice.xp + ' XP')

                          )

                        );

                      })

                    )

                  )

                ),



                // ── AI Event Outcome Display ──

                aiEvent && aiEvent.resolved && React.createElement("div", { className: "ai-event-card rounded-2xl overflow-hidden border-2 shadow-lg " + (aiEvent.chosenXp >= 5 ? 'border-green-300 shadow-green-500/10' : aiEvent.chosenXp >= 3 ? 'border-blue-300 shadow-blue-500/10' : 'border-amber-300 shadow-amber-500/10') },

                  React.createElement("div", { className: "px-4 py-2.5 flex items-center gap-2 " + (aiEvent.chosenXp >= 5 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : aiEvent.chosenXp >= 3 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-amber-500 to-orange-500') },

                    React.createElement("span", { className: "text-lg" }, aiEvent.chosenXp >= 5 ? '\u2705' : aiEvent.chosenXp >= 3 ? '\uD83D\uDCA1' : '\u26A0\uFE0F'),

                    React.createElement("span", { className: "text-sm font-bold text-white flex-1" }, aiEvent.title + ' — Outcome'),

                    React.createElement("span", { style: { animation: 'xpPop 0.5s ease-out' }, className: "text-sm font-bold px-2 py-0.5 rounded-full bg-white/25 text-white" }, '+' + (aiEvent.chosenXp || 0) + ' XP'),

                    React.createElement("button", { "aria-label": "Change ai event", onClick: function () { upd('aiEvent', null); }, className: "text-white/60 hover:text-white text-sm ml-1" }, '\u2715')

                  ),

                  React.createElement("div", { className: "px-4 py-3 bg-gradient-to-b from-slate-50 to-white" },

                    React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, aiEvent.chosenOutcome)

                  )

                ),



                // ── AI Event Loading Indicator ──

                aiEventLoading && React.createElement("div", { className: "ai-event-card rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 text-center" },

                  React.createElement("div", { className: "flex items-center justify-center gap-2" },

                    React.createElement("div", { className: "w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full", style: { animation: 'spin 1s linear infinite' } }),

                    React.createElement("span", { className: "text-xs font-bold text-blue-600" }, '\uD83E\uDD16 AI is analyzing your tank conditions...')

                  )

                ),



                // ── AI Event History (Learning Journal) ──

                aiEventHistory.length > 0 && React.createElement("div", { className: "bg-gradient-to-b from-indigo-50 to-slate-50 rounded-xl p-2.5 border border-indigo-200/60 max-h-36 overflow-y-auto" },

                  React.createElement("h4", { className: "text-[10px] font-bold text-indigo-500 mb-1.5 flex items-center gap-1" },

                    React.createElement("span", null, '\uD83D\uDCD3'),

                    'Event Journal (' + aiEventHistory.length + ' events)'

                  ),

                  aiEventHistory.slice().reverse().slice(0, 8).map(function (entry, i) {

                    return React.createElement("div", { key: i, className: "flex items-start gap-1.5 py-1 border-b border-indigo-100/60 last:border-0" },

                      React.createElement("span", { className: "text-xs flex-shrink-0" }, entry.icon || '\uD83D\uDCCC'),

                      React.createElement("div", { className: "flex-1 min-w-0" },

                        React.createElement("div", { className: "flex items-center gap-1" },

                          React.createElement("span", { className: "text-[10px] font-bold text-slate-600 truncate" }, entry.title),

                          React.createElement("span", { className: "text-[8px] text-slate-500 flex-shrink-0" }, 'Day ' + entry.day)

                        ),

                        React.createElement("p", { className: "text-[11px] text-slate-500 truncate" }, entry.choice + ' → ' + (entry.outcome || '').substring(0, 60) + '...')

                      ),

                      entry.xp > 0 ? React.createElement("span", { className: "text-[8px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-600 flex-shrink-0" }, '+' + entry.xp) : null

                    );

                  })

                ),



                // Event log

                eventLog.length > 0 && React.createElement("div", { className: "bg-slate-50 rounded-xl p-2 border border-slate-200 max-h-32 overflow-y-auto" },

                  React.createElement("h4", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "\uD83D\uDCDC Event Log (Day " + simDay + ")"),

                  eventLog.slice().reverse().slice(0, 10).map(function (evt, i) {

                    return React.createElement("p", { key: i, className: "text-[10px] text-slate-500" }, "[T" + evt.tick + "] " + evt.msg);

                  })

                )

              );

            })(),



            // ═══════════════ MODE 2: OCEAN ECOLOGY ═══════════════

            mode === 'ocean' && React.createElement("div", { className: "space-y-3" },



              // Scenario selector

              React.createElement("div", { className: "flex gap-2 flex-wrap" },

                [

                  { id: 'free', label: '\uD83C\uDF0A Free Play', desc: 'Manage fisheries freely' },

                  { id: 'feed', label: '\uD83C\uDFC6 Feed the Town', desc: 'Sustain harvest for 10 years' },

                  { id: 'recover', label: '\uD83D\uDEE0\uFE0F Recovery Plan', desc: 'Rebuild collapsed stocks' },

                  { id: 'balance', label: '\u2696\uFE0F Balanced Eco', desc: 'Keep all species above 50' }

                ].map(function (sc) {

                  return React.createElement("button", { "aria-label": "Aquarium action",

                    key: sc.id,

                    onClick: function () {

                      if (sc.id === 'recover') {

                        updMulti({ oceanScenario: sc.id, oceanPop: { sardines: 30, tuna: 10, sharks: 5 }, harvestRate: 0, oceanYear: 0, oceanHistory: [], oceanRevenue: 0, oceanBycatch: 0, oceanCollapsed: true });

                      } else if (sc.id === 'free' || sc.id === 'feed' || sc.id === 'balance') {

                        resetOcean();

                        upd('oceanScenario', sc.id);

                      }

                    },

                    className: "px-3 py-2 text-xs font-bold rounded-lg border transition-all " + (oceanScenario === sc.id ? "bg-blue-500 text-white border-blue-600 shadow-md" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100")

                  }, sc.label);

                })

              ),



              // Population Display (enhanced with gradient bars, critical pulse, animated emoji)

              React.createElement("div", { className: "grid grid-cols-3 gap-3" },

                OCEAN_SPECIES.map(function (sp) {

                  var pop = oceanPop[sp.id];

                  var pct = Math.min(100, Math.round(pop / sp.K * 100));

                  var critical = pop < sp.K * 0.1;

                  var gradientColors = { sardines: 'linear-gradient(90deg, #38bdf8, #0284c7)', tuna: 'linear-gradient(90deg, #3b82f6, #4338ca)', sharks: 'linear-gradient(90deg, #6366f1, #7c3aed)' };

                  var critGradient = 'linear-gradient(90deg, #ef4444, #dc2626)';

                  return React.createElement("div", {

                    key: sp.id,

                    className: "rounded-2xl p-3 border-2 text-center transition-all duration-300 shadow-sm " + (critical ? "border-red-300 bg-gradient-to-br from-red-50 to-red-100 shadow-red-500/10" : "border-slate-200/60 bg-gradient-to-br from-white to-slate-50 hover:shadow-md"),

                    style: critical ? { animation: 'aquaCriticalPulse 2s ease-in-out infinite' } : {}

                  },

                    // Animated species emoji

                    React.createElement("div", { className: "text-2xl mb-1", style: { display: 'inline-block', animation: 'oceanPulse 3s ease-in-out infinite' } }, sp.icon),

                    React.createElement("div", { className: "text-xs font-bold " + (critical ? "text-red-700" : "text-slate-700") }, sp.name),

                    React.createElement("div", { className: "text-lg font-bold " + (critical ? "text-red-600" : "text-blue-600") }, pop.toLocaleString()),

                    // Gradient progress bar

                    React.createElement("div", { className: "h-2 bg-slate-100 rounded-full mt-1.5 overflow-hidden shadow-inner" },

                      React.createElement("div", { style: { width: pct + '%', background: critical ? critGradient : (gradientColors[sp.id] || 'linear-gradient(90deg, #22c55e, #16a34a)'), backgroundSize: '200% 100%', transition: 'width 0.5s ease' }, className: "h-full rounded-full aqua-gradient-bar" })

                    ),

                    // Percentage badge

                    React.createElement("div", { className: "mt-1 inline-block px-1.5 py-0.5 rounded-full text-[11px] font-bold " + (critical ? "bg-red-100 text-red-600" : pct > 50 ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600") }, pct + "% K")

                  );

                })

              ),



              // Population history chart (enhanced with gradients, rounded bars, K reference line)

              oceanHistory.length > 1 && React.createElement("div", { className: "bg-white rounded-xl p-3 border border-slate-200" },

                React.createElement("h4", { className: "text-xs font-bold text-slate-700 mb-2 flex items-center gap-2" }, "\uD83D\uDCC8 Population History", React.createElement("span", { className: "text-[10px] text-slate-500 font-normal" }, "last " + Math.min(20, oceanHistory.length) + " years")),

                React.createElement("div", { className: "relative", style: { height: '96px' } },

                  // Carrying capacity reference line (100% K)

                  React.createElement("div", {

                    style: { position: 'absolute', top: '0px', left: 0, right: 0, height: '1px', borderTop: '1.5px dashed rgba(239,68,68,0.35)', zIndex: 2, pointerEvents: 'none' }

                  }),

                  React.createElement("span", {

                    style: { position: 'absolute', top: '-8px', right: 0, fontSize: '8px', fontWeight: 'bold', color: 'rgba(239,68,68,0.5)', zIndex: 2 }

                  }, "K"),

                  // 50% reference line

                  React.createElement("div", {

                    style: { position: 'absolute', top: '40px', left: 0, right: 0, height: '1px', borderTop: '1px dashed rgba(148,163,184,0.25)', zIndex: 2, pointerEvents: 'none' }

                  }),

                  // Bars container

                  React.createElement("div", { className: "flex items-end gap-px h-full" },

                    oceanHistory.slice(-20).map(function (h, i) {

                      var maxPop = 1000;

                      return React.createElement("div", { key: i, className: "flex-1 flex flex-col gap-px justify-end h-full" },

                        React.createElement("div", { style: { height: Math.max(1, h.sardines / maxPop * 80) + 'px', background: 'linear-gradient(180deg, #38bdf8, #0ea5e9)', borderRadius: '3px 3px 0 0' }, title: 'Yr ' + (i + 1) + ' — Sardines: ' + h.sardines }),

                        React.createElement("div", { style: { height: Math.max(1, h.tuna / maxPop * 80) + 'px', background: 'linear-gradient(180deg, #3b82f6, #2563eb)', borderRadius: '1px' }, title: 'Yr ' + (i + 1) + ' — Tuna: ' + h.tuna }),

                        React.createElement("div", { style: { height: Math.max(1, h.sharks / maxPop * 80) + 'px', background: 'linear-gradient(180deg, #6366f1, #4f46e5)', borderRadius: '0 0 3px 3px' }, title: 'Yr ' + (i + 1) + ' — Sharks: ' + h.sharks })

                      );

                    })

                  ),

                  // Year markers (every 5th)

                  React.createElement("div", { className: "flex justify-between", style: { position: 'absolute', bottom: '-12px', left: 0, right: 0 } },

                    oceanHistory.slice(-20).map(function (h, i, arr) {

                      var yearNum = oceanYear - (arr.length - 1 - i);

                      return (i === 0 || i === arr.length - 1 || yearNum % 5 === 0)

                        ? React.createElement("span", { key: i, style: { fontSize: '7px', color: '#94a3b8', fontWeight: 'bold', flex: 1, textAlign: 'center' } }, 'Y' + yearNum)

                        : React.createElement("span", { key: i, style: { flex: 1 } });

                    })

                  )

                ),

                React.createElement("div", { className: "flex gap-3 mt-4 text-[10px]" },

                  React.createElement("span", { className: "font-bold", style: { color: '#0ea5e9' } }, "\u25CF Sardines"),

                  React.createElement("span", { className: "font-bold", style: { color: '#2563eb' } }, "\u25CF Tuna"),

                  React.createElement("span", { className: "font-bold", style: { color: '#4f46e5' } }, "\u25CF Sharks"),

                  React.createElement("span", { className: "ml-auto font-bold", style: { color: 'rgba(239,68,68,0.5)', fontSize: '8px' } }, "- - K = Carrying Capacity")

                )

              ),



              // Controls

              React.createElement("div", { className: "bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 rounded-2xl p-4 border border-blue-200/60 shadow-sm space-y-3" },

                React.createElement("h4", { className: "text-xs font-bold text-blue-700" }, "\u2699\uFE0F Fishery Controls"),



                // Harvest Rate

                React.createElement("div", null,

                  React.createElement("div", { className: "flex justify-between text-xs mb-1" },

                    React.createElement("span", { className: "font-bold text-slate-600" }, "\uD83C\uDFA3 Harvest Rate"),

                    React.createElement("span", { className: "font-mono " + (harvestRate > 50 ? "text-red-600" : "text-green-600") }, harvestRate + "%")

                  ),

                  React.createElement("input", {

                    type: "range", min: "0", max: "100", value: harvestRate,

                    onChange: function (e) { upd('harvestRate', parseInt(e.target.value)); },

                    className: "w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"

                  })

                ),



                // MPA

                React.createElement("div", null,

                  React.createElement("div", { className: "flex justify-between text-xs mb-1" },

                    React.createElement("span", { className: "font-bold text-slate-600" }, "\uD83C\uDFDD\uFE0F Marine Protected Area"),

                    React.createElement("span", { className: "font-mono text-green-600" }, mpaPercent + "% protected")

                  ),

                  React.createElement("input", {

                    type: "range", min: "0", max: "80", value: mpaPercent,

                    onChange: function (e) { upd('mpaPercent', parseInt(e.target.value)); },

                    className: "w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"

                  })

                ),



                // Mesh Size

                React.createElement("div", { className: "flex items-center gap-2" },

                  React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "\uD83E\uDE7A Mesh Size"),

                  ['small', 'medium', 'large'].map(function (m) {

                    return React.createElement("button", { "aria-label": "Select option",

                      key: m,

                      onClick: function () { upd('meshSize', m); },

                      className: "px-3 py-1 text-xs font-bold rounded-full transition-all " + (meshSize === m ? "bg-blue-500 text-white" : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-50")

                    }, m.charAt(0).toUpperCase() + m.slice(1));

                  }),

                  React.createElement("span", { className: "text-[10px] text-slate-500 ml-1" }, meshSize === 'small' ? '\u26A0\uFE0F High bycatch' : meshSize === 'large' ? '\u2705 Low bycatch' : '')

                ),



                // Season toggle

                React.createElement("div", { className: "flex items-center gap-3" },

                  React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "\uD83D\uDCC5 Season"),

                  React.createElement("button", { "aria-label": "Change is open season",

                    onClick: function () { upd('isOpenSeason', !isOpenSeason); },

                    className: "px-4 py-1.5 text-xs font-bold rounded-full transition-all " + (isOpenSeason ? "bg-green-500 text-white" : "bg-red-100 text-red-700 border border-red-200")

                  }, isOpenSeason ? "\uD83D\uDFE2 Open Season" : "\uD83D\uDD34 Closed Season")

                )

              ),



              // Stats row

              React.createElement("div", { className: "grid grid-cols-4 gap-2" },

                [

                  { label: 'Year', val: oceanYear, icon: '\uD83D\uDCC5' },

                  { label: 'Revenue', val: '$' + oceanRevenue.toLocaleString(), icon: '\uD83D\uDCB0' },

                  { label: 'Bycatch', val: oceanBycatch, icon: '\u26A0\uFE0F' },

                  { label: 'Status', val: oceanCollapsed ? 'COLLAPSED' : 'Healthy', icon: oceanCollapsed ? '\u274C' : '\u2705' }

                ].map(function (s) {

                  return React.createElement("div", { key: s.label, className: "bg-white rounded-lg p-2 text-center border border-slate-200" },

                    React.createElement("div", { className: "text-xs text-slate-500" }, s.icon + " " + s.label),

                    React.createElement("div", { className: "text-sm font-bold " + (s.label === 'Status' && oceanCollapsed ? 'text-red-600' : 'text-slate-700') }, s.val)

                  );

                })

              ),



              // Advance button

              React.createElement("div", { className: "flex gap-2" },

                React.createElement("button", { "aria-label": "Advance 1 Year",

                  onClick: stepOcean,

                  className: "flex-1 py-2.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-600/30 active:scale-[0.98]"

                }, "\u23E9 Advance 1 Year"),

                React.createElement("button", { "aria-label": "Reset Ocean",

                  onClick: function () { for (var i = 0; i < 5; i++) stepOcean(); },

                  className: "px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg text-sm hover:bg-indigo-200 transition-all"

                }, "\u23E9\u00D75"),

                React.createElement("button", { "aria-label": "Reset",

                  onClick: resetOcean,

                  className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"

                }, "\u21BA Reset")

              )

            ),



            // ═══════════════ MODE 3: MARINE SCIENCE ═══════════════

            mode === 'marine' && React.createElement("div", { className: "space-y-3" },



              // Ocean Zones Cross-Section

              React.createElement("div", { className: "rounded-xl overflow-hidden border-2 border-blue-300" },

                OCEAN_ZONES.map(function (zone) {

                  var zoneSpecies = MARINE_SPECIES.filter(function (s) { return s.zone === zone.id; });

                  return React.createElement("div", {

                    key: zone.id,

                    role: "button", tabIndex: 0,

                    onClick: function () { upd('selectedZone', selectedZone === zone.id ? null : zone.id); },

                    className: "w-full text-left transition-all hover:brightness-110 cursor-pointer",

                    style: { background: 'linear-gradient(135deg, ' + zone.color + ', ' + zone.color + '88)', padding: selectedZone === zone.id ? '16px 12px' : '10px 12px', transition: 'all 0.3s ease', borderBottom: '1px solid rgba(255,255,255,0.1)' }

                  },

                    React.createElement("div", { className: "flex items-center gap-2" },

                      React.createElement("span", { className: "text-xs font-bold text-white drop-shadow-sm" }, zone.name),

                      React.createElement("span", { className: "text-[10px] text-white/70 ml-auto font-mono bg-white/10 px-1.5 py-0.5 rounded" }, zone.depth),

                      React.createElement("span", { className: "text-[10px] text-white/60 font-mono bg-white/10 px-1.5 py-0.5 rounded" }, zone.temp)

                    ),

                    selectedZone === zone.id && React.createElement("div", { className: "mt-2 flex flex-wrap gap-2" },

                      zoneSpecies.map(function (sp) {

                        return React.createElement("button", { "aria-label": "Aquarium action",

                          key: sp.id,

                          onClick: function (e) { e.stopPropagation(); upd('selectedSpecies', sp.id); openAnatomy(sp.id); },

                          className: "px-2.5 py-1 bg-white/25 rounded-full text-[11px] text-white font-bold hover:bg-white/40 hover:shadow-lg transition-all duration-200 backdrop-blur-sm border border-white/10"

                        }, sp.icon + " " + sp.name);

                      }),

                      zoneSpecies.length === 0 && React.createElement("span", { className: "text-[10px] text-white/50 italic" }, "Few species survive here")

                    )

                  );

                })

              ),



              // Selected Species Card

              selectedSpecies && (() => {

                var sp = MARINE_SPECIES.find(function (s) { return s.id === selectedSpecies; });

                if (!sp) return null;

                var statusColors = { LC: 'text-green-600 bg-green-50', VU: 'text-amber-600 bg-amber-50', EN: 'text-red-600 bg-red-50', CR: 'text-red-800 bg-red-100' };

                var statusLabels = { LC: 'Least Concern', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered' };

                return React.createElement("div", { className: "bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-2xl p-4 border-2 border-indigo-200/60 shadow-lg shadow-indigo-500/10 animate-in fade-in duration-200" },

                  React.createElement("div", { className: "flex items-start gap-3" },

                    React.createElement("div", { className: "text-4xl" }, sp.icon),

                    React.createElement("div", { className: "flex-1" },

                      React.createElement("h4", { className: "text-sm font-bold text-indigo-800" }, sp.name),

                      React.createElement("div", { className: "flex gap-2 mt-1 flex-wrap" },

                        React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold" }, "\uD83C\uDF0A " + sp.habitat),

                        React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 font-bold" }, "\uD83C\uDF7D\uFE0F " + sp.diet),

                        React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full font-bold " + (statusColors[sp.status] || '') }, "\uD83D\uDEE1\uFE0F " + (statusLabels[sp.status] || sp.status))

                      )

                    ),

                    React.createElement("button", { "aria-label": "Change selected species",

                      onClick: function () { upd('selectedSpecies', null); },

                      className: "text-slate-400 hover:text-slate-600 text-lg"

                    }, "\u2715")

                  ),

                  React.createElement("div", { className: "mt-3 bg-indigo-50 rounded-lg p-3" },

                    React.createElement("p", { className: "text-xs text-indigo-800 leading-relaxed" }, "\uD83D\uDCA1 " + sp.fact)

                  ),

                  React.createElement("div", { className: "mt-2 bg-amber-50 rounded-lg p-2" },

                    React.createElement("p", { className: "text-xs text-amber-700 font-bold" }, "\u2753 " + sp.quiz)

                  )

                );

              })(),



              // Quiz Section

              React.createElement("div", { className: "flex gap-2 items-center" },

                React.createElement("button", { "aria-label": "Marine Science Quiz",

                  onClick: generateQuiz,

                  className: "flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"

                }, "\uD83E\uDDE0 Marine Science Quiz"),

                quizScore.total > 0 && React.createElement("span", { className: "text-xs font-bold text-indigo-600" }, "\u2705 " + quizScore.correct + "/" + quizScore.total)

              ),



              quizQ && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 rounded-2xl p-4 border border-indigo-200/60 shadow-sm" },

                React.createElement("p", { className: "text-sm font-bold text-indigo-800 mb-3" }, "\u2753 " + quizQ.question),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  quizQ.options.map(function (opt) {

                    var answered = quizQ.answered != null;

                    var isCorrect = opt === quizQ.answer;

                    var isChosen = opt === quizQ.answered;

                    return React.createElement("button", { "aria-label": "Select option",

                      key: opt,

                      onClick: function () { if (!answered) answerQuiz(opt); },

                      disabled: answered,

                      className: "py-2 px-3 text-xs font-bold rounded-lg border transition-all " + (answered ? (isCorrect ? "bg-green-100 border-green-400 text-green-800" : isChosen ? "bg-red-100 border-red-400 text-red-800" : "bg-slate-50 border-slate-200 text-slate-500") : "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400")

                    }, opt);

                  })

                ),

                quizQ.answered && React.createElement("div", { className: "mt-2" },

                  React.createElement("p", { className: "text-xs font-bold " + (quizQ.correct ? "text-green-600" : "text-red-600") }, quizQ.correct ? "\u2705 Correct! +3 XP" : "\u274C The answer is: " + quizQ.answer),

                  React.createElement("button", { "aria-label": "Next Question",

                    onClick: generateQuiz,

                    className: "mt-1 px-3 py-1 text-[10px] font-bold bg-indigo-500 text-white rounded-full hover:bg-indigo-600"

                  }, "Next Question \u2192")

                )

              )

            )

          );
      })();
    }
  });

})();
