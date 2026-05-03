// ═══════════════════════════════════════════
// stem_tool_birdlab.js — BirdLab: I-Spy Ornithology / Species ID
// Interactive bird-spotting + species-identification tool. Layered SVG
// habitat scenes with animated birds whose movement signatures double as
// field marks (real birders ID partly by behavior). Pairs with Cornell Lab's
// free Merlin Bird ID app for actual photos and audio. Maine-relevant
// without being Maine-only. WCAG 2.1 AA from day one — keyboard alternative
// to spatial-search gameplay; reduced-motion fallback to static scenes.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('birdLab'))) {

(function() {
  'use strict';

  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  var _prefersReducedMotion = (function() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  })();

  // Print stylesheet
  (function() {
    if (document.getElementById('birdlab-print-css')) return;
    var st = document.createElement('style');
    st.id = 'birdlab-print-css';
    st.textContent = [
      '@media print {',
      '  .birdlab-no-print { display: none !important; }',
      '  details.birdlab-teacher-notes { display: block !important; }',
      '  details.birdlab-teacher-notes > summary { list-style: none; cursor: default; }',
      '  details.birdlab-teacher-notes[open] > *,',
      '  details.birdlab-teacher-notes > * { display: block !important; }',
      '  body { background: white !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // Visual flair CSS — bird movement signatures + ambient habitat motion + UI flair
  // Each species gets a movement signature that doubles as a field mark.
  (function() {
    if (document.getElementById('birdlab-flair-css')) return;
    var st = document.createElement('style');
    st.id = 'birdlab-flair-css';
    st.textContent = [
      // Movement signatures — each species's behavioral identity
      '@keyframes birdlab-perch-bob {',
      '  0%, 100% { transform: translateY(0); }',
      '  50%      { transform: translateY(-3px); }',
      '}',
      '@keyframes birdlab-flit {',
      '  0%   { transform: translate(0, 0); }',
      '  20%  { transform: translate(8px, -4px); }',
      '  40%  { transform: translate(-3px, -7px); }',
      '  60%  { transform: translate(6px, 2px); }',
      '  80%  { transform: translate(-5px, 3px); }',
      '  100% { transform: translate(0, 0); }',
      '}',
      '@keyframes birdlab-glide {',
      '  0%   { transform: translateX(0); }',
      '  100% { transform: translateX(40px); }',
      '}',
      '@keyframes birdlab-soar {',
      '  0%, 100% { transform: rotate(0deg) translateX(0); }',
      '  25%      { transform: rotate(2deg) translateX(15px); }',
      '  50%      { transform: rotate(0deg) translateX(30px); }',
      '  75%      { transform: rotate(-2deg) translateX(15px); }',
      '}',
      '@keyframes birdlab-hover {',
      '  0%, 100% { transform: translateY(0) scale(1); }',
      '  50%      { transform: translateY(-2px) scale(1.02); }',
      '}',
      '@keyframes birdlab-walk-down {',
      '  0%   { transform: translateY(0); }',
      '  100% { transform: translateY(35px); }',
      '}',
      '@keyframes birdlab-hidden-rustle {',
      '  0%, 100% { transform: translateX(0); opacity: 0.85; }',
      '  50%      { transform: translateX(2px); opacity: 0.95; }',
      '}',
      '@keyframes birdlab-leaf-sway {',
      '  0%, 100% { transform: rotate(-1deg); }',
      '  50%      { transform: rotate(1deg); }',
      '}',
      '@keyframes birdlab-pulse-ring {',
      '  0%, 100% { box-shadow: 0 0 0 0 rgba(5,150,105,0.55); }',
      '  50%      { box-shadow: 0 0 0 8px rgba(5,150,105,0); }',
      '}',
      // Movement signature classes — applied to bird SVG groups
      '.birdlab-perch-bob   { animation: birdlab-perch-bob 1.6s ease-in-out infinite; }',
      '.birdlab-flit        { animation: birdlab-flit 2.4s ease-in-out infinite; }',
      '.birdlab-glide       { animation: birdlab-glide 5s ease-in-out infinite alternate; }',
      '.birdlab-soar        { animation: birdlab-soar 12s ease-in-out infinite; transform-origin: center; }',
      '.birdlab-hover       { animation: birdlab-hover 0.6s ease-in-out infinite; }',
      '.birdlab-walk-down   { animation: birdlab-walk-down 8s ease-in-out infinite alternate; }',
      '.birdlab-hidden      { animation: birdlab-hidden-rustle 3.5s ease-in-out infinite; }',
      '.birdlab-leaf-sway   { animation: birdlab-leaf-sway 4s ease-in-out infinite; transform-origin: bottom center; }',
      '.birdlab-pulse-ring  { animation: birdlab-pulse-ring 1.6s ease-out infinite; }',
      '.birdlab-card-lift   { transition: transform 200ms ease, box-shadow 200ms ease; }',
      '.birdlab-card-lift:hover { transform: translateY(-3px); }',
      '.birdlab-card-lift:focus-visible { transform: translateY(-3px); }',
      // Bird-button reset (so buttons over SVG don't carry default browser styling)
      '.birdlab-bird-btn {',
      '  background: transparent;',
      '  border: none;',
      '  padding: 0;',
      '  cursor: pointer;',
      '  position: absolute;',
      '}',
      '.birdlab-bird-btn:focus-visible {',
      '  outline: 3px solid #fbbf24;',
      '  outline-offset: 4px;',
      '  border-radius: 50%;',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // Live region (WCAG 4.1.3)
  (function() {
    if (document.getElementById('allo-live-birdlab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-birdlab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(lr);
  })();
  var announce = function(msg) {
    try { var lr = document.getElementById('allo-live-birdlab'); if (lr) lr.textContent = String(msg || ''); } catch(e) {}
  };

  // localStorage helpers
  function lsGet(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
  function lsSet(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  // ─────────────────────────────────────────────────────
  // BIRD SVG BUILDERS — each species rendered as an inline SVG <g> group.
  // Schematic / field-guide style, NOT photoreal. Pairs with Merlin Bird ID
  // for real photos. ~24px tall typical (bigger for raptors).
  // Signatures are color + shape + posture; field marks are accurate per
  // Cornell Lab All About Birds guides.
  // ─────────────────────────────────────────────────────
  var BIRDS = {
    chickadee: {
      id: 'chickadee',
      name: 'Black-capped Chickadee',
      sciName: 'Poecile atricapillus',
      size: '~5 in (small)',
      habitat: 'Forest, woodland edges, backyards',
      mainePresence: 'Year-round — Maine\'s state bird',
      funFact: 'Stores seeds in dozens of locations and remembers them for weeks. Brain neurons regenerate seasonally to hold the spatial maps.',
      callDescription: 'Whistled "fee-bee" (high then low) and the chatty "chick-a-dee-dee-dee" (more "dees" = higher alert)',
      movement: 'perch-bob',
      svg: function(h) {
        return h('g', null,
          // Body (buffy white)
          h('ellipse', { cx: 12, cy: 14, rx: 9, ry: 7, fill: '#f8e8c8', stroke: '#5a4a32', strokeWidth: 0.6 }),
          // Black cap
          h('path', { d: 'M 4 11 Q 4 5 12 5 Q 20 5 20 11 L 18 11 Q 18 7 12 7 Q 6 7 6 11 Z', fill: '#1a1a1a' }),
          // Black bib
          h('ellipse', { cx: 12, cy: 17, rx: 4, ry: 2.5, fill: '#1a1a1a' }),
          // White cheek
          h('ellipse', { cx: 12, cy: 13, rx: 6, ry: 2.2, fill: '#ffffff' }),
          // Wing (gray)
          h('ellipse', { cx: 16, cy: 14, rx: 4, ry: 5, fill: '#8a8a8a' }),
          // Wing edges (white)
          h('path', { d: 'M 14 11 L 19 11 M 14 14 L 19 14', stroke: '#ffffff', strokeWidth: 0.7 }),
          // Tail
          h('path', { d: 'M 19 14 L 25 12 L 25 16 L 19 16 Z', fill: '#5a5a5a' }),
          // Eye (dark, no ring)
          h('circle', { cx: 9, cy: 11, r: 1, fill: '#000' }),
          h('circle', { cx: 9.3, cy: 10.7, r: 0.3, fill: '#fff' }),
          // Bill (short, stout, dark)
          h('path', { d: 'M 4 12 L 1 12.5 L 4 13 Z', fill: '#222' })
        );
      }
    },
    nuthatch: {
      id: 'nuthatch',
      name: 'White-breasted Nuthatch',
      sciName: 'Sitta carolinensis',
      size: '~6 in (small)',
      habitat: 'Mature deciduous forest, oak and hickory',
      mainePresence: 'Year-round',
      funFact: 'The only North American bird that walks DOWN tree trunks headfirst. This gives it access to insects in bark crevices that woodpeckers miss.',
      callDescription: 'Nasal "yank-yank-yank" — sounds like a tiny tin horn',
      movement: 'walk-down',
      svg: function(h) {
        return h('g', null,
          // Body (white belly)
          h('ellipse', { cx: 12, cy: 16, rx: 8, ry: 6, fill: '#ffffff', stroke: '#5a4a32', strokeWidth: 0.6 }),
          // Black cap and back stripe
          h('path', { d: 'M 4 12 Q 4 6 12 6 Q 20 6 20 12 L 20 14 L 4 14 Z', fill: '#1a1a1a' }),
          // Blue-gray back / wings
          h('path', { d: 'M 4 13 Q 4 9 12 9 Q 20 9 20 13 L 20 16 L 4 16 Z', fill: '#7a8da0' }),
          // Wing detail
          h('path', { d: 'M 16 12 L 21 14 L 16 16 Z', fill: '#5a6e80' }),
          // Tail (pointing UP because head-down posture)
          h('path', { d: 'M 17 18 L 23 22 L 17 22 Z', fill: '#5a6e80' }),
          // Eye
          h('circle', { cx: 9, cy: 11, r: 1, fill: '#000' }),
          h('circle', { cx: 9.3, cy: 10.7, r: 0.3, fill: '#fff' }),
          // Bill (long, slender, slightly upturned)
          h('path', { d: 'M 4 11.5 L 0 11 L 4 12.5 Z', fill: '#1a1a1a' })
        );
      }
    },
    pileated: {
      id: 'pileated',
      name: 'Pileated Woodpecker',
      sciName: 'Dryocopus pileatus',
      size: '~17 in (large — crow-sized)',
      habitat: 'Mature forest with large dead trees',
      mainePresence: 'Year-round — common in Maine forests',
      funFact: 'Carves rectangular cavities in trees — distinctive shape that other species (owls, ducks) reuse later. Their drumming can be heard a half-mile away.',
      callDescription: 'Loud, ringing "kuk-kuk-kuk-kuk" laugh; powerful drumming on hollow trees',
      movement: 'perch-bob',
      svg: function(h) {
        return h('g', null,
          // Body (large, mostly black)
          h('ellipse', { cx: 16, cy: 22, rx: 12, ry: 10, fill: '#1a1a1a', stroke: '#000', strokeWidth: 0.6 }),
          // Red crest (the pileatus = "capped")
          h('path', { d: 'M 8 10 Q 12 0 18 4 L 18 12 L 8 12 Z', fill: '#d63a2f' }),
          // White face stripe
          h('path', { d: 'M 6 14 L 14 14 L 14 16 L 6 16 Z', fill: '#ffffff' }),
          // Black malar stripe (cheek)
          h('path', { d: 'M 8 16 L 14 16 L 14 19 L 8 19 Z', fill: '#1a1a1a' }),
          // White on neck side
          h('path', { d: 'M 14 16 L 16 14 L 17 18 L 14 19 Z', fill: '#ffffff' }),
          // Eye
          h('circle', { cx: 11, cy: 13, r: 0.8, fill: '#fff' }),
          h('circle', { cx: 11, cy: 13, r: 0.3, fill: '#000' }),
          // Bill (long, chisel-shaped, ivory)
          h('path', { d: 'M 6 14.5 L -1 14 L 6 16 Z', fill: '#e8d8a8', stroke: '#8a7a4a', strokeWidth: 0.4 })
        );
      }
    },
    vireo: {
      id: 'vireo',
      name: 'Red-eyed Vireo',
      sciName: 'Vireo olivaceus',
      size: '~5.5 in (small)',
      habitat: 'Deciduous forest canopy',
      mainePresence: 'Summer breeder (May–September)',
      funFact: 'One of the most persistent singers in eastern forests — a single male was once recorded singing 22,197 songs in a single day.',
      callDescription: '"Here-I-am, where-are-you" repeated endlessly through the day, even in summer heat',
      movement: 'flit',
      svg: function(h) {
        return h('g', null,
          // Body (olive-green back, white belly)
          h('ellipse', { cx: 12, cy: 14, rx: 9, ry: 6, fill: '#ffffff', stroke: '#5a4a32', strokeWidth: 0.5 }),
          // Olive back
          h('path', { d: 'M 3 11 Q 3 7 12 7 Q 21 7 21 11 L 21 14 L 3 14 Z', fill: '#7a8a4a' }),
          // Gray crown
          h('path', { d: 'M 4 9 Q 4 5 12 5 Q 20 5 20 9 L 18 9 Q 18 7 12 7 Q 6 7 6 9 Z', fill: '#6a7080' }),
          // White supercilium (eyebrow)
          h('path', { d: 'M 4 10 Q 12 9.5 20 10', stroke: '#ffffff', strokeWidth: 1.2, fill: 'none' }),
          // Dark eye line
          h('path', { d: 'M 4 11 Q 12 11 18 11', stroke: '#3a3a3a', strokeWidth: 0.7, fill: 'none' }),
          // Red eye (the namesake)
          h('circle', { cx: 9, cy: 10.8, r: 0.9, fill: '#a82828' }),
          h('circle', { cx: 9, cy: 10.8, r: 0.3, fill: '#000' }),
          // Wing
          h('ellipse', { cx: 16, cy: 13, rx: 4, ry: 4, fill: '#8a9050' }),
          // Tail
          h('path', { d: 'M 19 14 L 24 13 L 24 15 L 19 15 Z', fill: '#7a8a4a' }),
          // Bill (slightly hooked at tip — vireo bills are stubbier than warblers)
          h('path', { d: 'M 4 11.5 L 1 11 L 4 13 Z', fill: '#3a3a3a' })
        );
      }
    },
    robin: {
      id: 'robin',
      name: 'American Robin',
      sciName: 'Turdus migratorius',
      size: '~10 in (medium)',
      habitat: 'Lawns, gardens, forest edges, almost everywhere',
      mainePresence: 'Year-round (some migrate south); huge spring arrival',
      funFact: 'Their famous orange breast is the same pigment family as flamingo pink — carotenoids from berries. A robin\'s color depth tells you how good a forager it is.',
      callDescription: 'Liquid, melodic "cheerily-cheer-up-cheerily" sung at dawn and dusk',
      movement: 'perch-bob',
      svg: function(h) {
        return h('g', null,
          // Dark gray back
          h('ellipse', { cx: 14, cy: 14, rx: 10, ry: 7, fill: '#5a5a5a', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          // Orange breast
          h('ellipse', { cx: 12, cy: 17, rx: 7, ry: 5, fill: '#d65a2a' }),
          // Dark head
          h('ellipse', { cx: 8, cy: 11, rx: 5, ry: 4, fill: '#2a2a2a' }),
          // White eye-arc
          h('path', { d: 'M 5.5 10 Q 7 9 8 10', stroke: '#ffffff', strokeWidth: 0.7, fill: 'none' }),
          h('path', { d: 'M 8 10.5 Q 9 9.5 10 11', stroke: '#ffffff', strokeWidth: 0.7, fill: 'none' }),
          // Eye
          h('circle', { cx: 7, cy: 10.5, r: 0.7, fill: '#000' }),
          // Wing
          h('ellipse', { cx: 17, cy: 14, rx: 5, ry: 5, fill: '#3a3a3a' }),
          // Tail
          h('path', { d: 'M 21 14 L 27 13 L 27 17 L 21 17 Z', fill: '#3a3a3a' }),
          // Yellow bill
          h('path', { d: 'M 3.5 11 L 0 10.5 L 3.5 12 Z', fill: '#e8b020' })
        );
      }
    },
    coopershawk: {
      id: 'coopershawk',
      name: 'Cooper\'s Hawk',
      sciName: 'Accipiter cooperii',
      size: '~16 in (medium raptor)',
      habitat: 'Forest, increasingly suburban',
      mainePresence: 'Year-round; some migrate',
      funFact: 'Specializes in catching other birds — that\'s why songbirds vanish from backyard feeders when one shows up. Surveys their hunting grounds at high speed through the canopy.',
      callDescription: '"Kek-kek-kek" near nests; usually silent in flight',
      movement: 'soar',
      svg: function(h) {
        return h('g', null,
          // Body (slate gray back)
          h('ellipse', { cx: 18, cy: 16, rx: 14, ry: 8, fill: '#6a7080', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          // White underside with rusty barring (rusty horizontal bars)
          h('ellipse', { cx: 15, cy: 19, rx: 10, ry: 5, fill: '#f0e0d0' }),
          h('path', { d: 'M 7 18 L 23 18 M 7 20 L 23 20 M 7 22 L 23 22', stroke: '#a85030', strokeWidth: 0.5 }),
          // Dark cap (Cooper\'s hawk has a darker cap than juveniles)
          h('path', { d: 'M 4 12 Q 4 7 12 7 Q 18 7 18 12 L 16 12 Q 16 9 12 9 Q 6 9 6 12 Z', fill: '#3a3a4a' }),
          // Yellow eye (red in older adults — yellow is more common in Maine)
          h('circle', { cx: 8, cy: 11, r: 1.4, fill: '#e8b820' }),
          h('circle', { cx: 8, cy: 11, r: 0.5, fill: '#000' }),
          // Hooked beak
          h('path', { d: 'M 3 12 L -1 11 Q -1 13 0 13.5 L 3 13 Z', fill: '#3a3a3a' }),
          // Yellow cere (above beak)
          h('path', { d: 'M 3 11 L 0 10.5 L 3 11.5 Z', fill: '#e8c020' }),
          // Long tail with bands (Cooper\'s hawk = long banded tail, key field mark)
          h('path', { d: 'M 28 14 L 38 12 L 38 20 L 28 18 Z', fill: '#5a6070' }),
          h('path', { d: 'M 30 14.5 L 30 17.5 M 33 14 L 33 18 M 36 13 L 36 19', stroke: '#1a1a1a', strokeWidth: 0.7 })
        );
      }
    },
    towhee: {
      id: 'towhee',
      name: 'Eastern Towhee',
      sciName: 'Pipilo erythrophthalmus',
      size: '~7.5 in (medium)',
      habitat: 'Dense undergrowth, brushy edges, thickets',
      mainePresence: 'Summer breeder; rare in winter',
      funFact: 'Forages by "double-scratching" — a quick backward hop with both feet that uncovers seeds and insects under leaf litter. Listen for the distinctive rustle.',
      callDescription: 'Famous "drink-your-tea-EEEEE" song; sharp "chewink!" call when disturbed',
      movement: 'hidden',
      svg: function(h) {
        return h('g', null,
          // Body (rufous flanks, white belly)
          h('ellipse', { cx: 14, cy: 14, rx: 10, ry: 7, fill: '#a85020', stroke: '#5a2a10', strokeWidth: 0.5 }),
          // White belly stripe
          h('ellipse', { cx: 12, cy: 16, rx: 4, ry: 4, fill: '#ffffff' }),
          // Black hood (males — adjust for females in v2)
          h('ellipse', { cx: 9, cy: 11, rx: 6, ry: 5, fill: '#1a1a1a' }),
          // Red eye
          h('circle', { cx: 7, cy: 10.5, r: 1, fill: '#a82020' }),
          h('circle', { cx: 7, cy: 10.5, r: 0.4, fill: '#000' }),
          // Black wing with white spots
          h('ellipse', { cx: 18, cy: 13, rx: 4, ry: 5, fill: '#1a1a1a' }),
          h('circle', { cx: 17, cy: 12, r: 0.6, fill: '#fff' }),
          h('circle', { cx: 19, cy: 14, r: 0.6, fill: '#fff' }),
          // Long black tail with white corners (key field mark)
          h('path', { d: 'M 21 14 L 28 13 L 28 17 L 21 16 Z', fill: '#1a1a1a' }),
          h('path', { d: 'M 27 13 L 28 13 L 28 17 L 27 17 Z', fill: '#fff' }),
          // Stout finch bill
          h('path', { d: 'M 3 11 L 0 11 L 3 13 Z', fill: '#1a1a1a' })
        );
      }
    },

    // ════ MARSH species ════
    greatBlueHeron: {
      id: 'greatBlueHeron',
      name: 'Great Blue Heron',
      sciName: 'Ardea herodias',
      size: '~46 in (very large)',
      habitat: 'Marshes, ponds, slow rivers, shorelines',
      mainePresence: 'Year-round on coast; spring through fall inland',
      funFact: 'Stands motionless for many minutes, then strikes with a snake-fast neck. Each strike is a single S-shaped extension; if it misses, the heron resets and waits again.',
      callDescription: 'Loud, harsh "fraaank!" given when alarmed; usually silent while hunting',
      movement: 'hidden',
      svg: function(h) {
        return h('g', null,
          // Long legs
          h('line', { x1: 14, y1: 30, x2: 14, y2: 50, stroke: '#a8a040', strokeWidth: 1 }),
          h('line', { x1: 18, y1: 30, x2: 18, y2: 50, stroke: '#a8a040', strokeWidth: 1 }),
          // Body (slate gray)
          h('ellipse', { cx: 16, cy: 25, rx: 9, ry: 6, fill: '#7a8090', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          // Long S-curved neck
          h('path', { d: 'M 12 22 Q 8 18 10 12 Q 12 6 18 6', stroke: '#9aa0b0', strokeWidth: 4, fill: 'none' }),
          // Head
          h('ellipse', { cx: 19, cy: 6, rx: 3, ry: 2, fill: '#9aa0b0' }),
          // Black crown stripe
          h('path', { d: 'M 18 4 L 22 5 L 22 6 L 18 6 Z', fill: '#1a1a1a' }),
          // Eye
          h('circle', { cx: 20, cy: 6, r: 0.6, fill: '#e8b020' }),
          h('circle', { cx: 20, cy: 6, r: 0.2, fill: '#000' }),
          // Long yellow dagger bill
          h('path', { d: 'M 22 6 L 30 6 L 22 7 Z', fill: '#e8c040', stroke: '#8a7020', strokeWidth: 0.3 }),
          // Wing edge / shoulder accent
          h('path', { d: 'M 16 22 Q 22 21 24 26', stroke: '#5a5a5a', strokeWidth: 0.7, fill: 'none' }),
          // Tail
          h('path', { d: 'M 24 27 L 28 28 L 28 30 L 24 30 Z', fill: '#5a5a5a' })
        );
      }
    },
    redwingBlackbird: {
      id: 'redwingBlackbird',
      name: 'Red-winged Blackbird',
      sciName: 'Agelaius phoeniceus',
      size: '~9 in (medium)',
      habitat: 'Marshes, wet meadows, brushy field edges',
      mainePresence: 'Spring through fall; one of the first migrants to arrive (March)',
      funFact: 'Males defend territories by perching on high cattails and flashing the red shoulder patch. The flash is voluntary — they hide it when sneaking through other males\' territories.',
      callDescription: 'Loud, raspy "konk-la-REE!" with the rattly final note (males); softer "chek" calls (females + alarm)',
      movement: 'perch-bob',
      svg: function(h) {
        return h('g', null,
          // Body (jet black)
          h('ellipse', { cx: 12, cy: 14, rx: 9, ry: 6, fill: '#0a0a0a' }),
          // Head
          h('ellipse', { cx: 8, cy: 11, rx: 5, ry: 4, fill: '#0a0a0a' }),
          // RED shoulder patch (the field mark)
          h('path', { d: 'M 13 11 L 19 11 L 18 14 L 12 14 Z', fill: '#d62020' }),
          // YELLOW underline (epaulet)
          h('path', { d: 'M 13 14 L 18 14 L 18 15 L 13 15 Z', fill: '#e8c020' }),
          // Wing
          h('ellipse', { cx: 16, cy: 14, rx: 4, ry: 5, fill: '#1a1a1a' }),
          // Tail
          h('path', { d: 'M 19 14 L 25 13 L 25 16 L 19 15 Z', fill: '#0a0a0a' }),
          // Eye
          h('circle', { cx: 6, cy: 10, r: 0.7, fill: '#fff' }),
          h('circle', { cx: 6, cy: 10, r: 0.3, fill: '#000' }),
          // Bill (sharp, conical)
          h('path', { d: 'M 3 11 L 0 11 L 3 12.5 Z', fill: '#1a1a1a' })
        );
      }
    },
    mallard: {
      id: 'mallard',
      name: 'Mallard',
      sciName: 'Anas platyrhynchos',
      size: '~23 in (large duck)',
      habitat: 'Marshes, ponds, lakes, rivers, even city parks',
      mainePresence: 'Year-round; some migrate further south in winter',
      funFact: 'The "duck" of children\'s books. Males have iridescent green heads only when light hits at the right angle — the color comes from microscopic feather structure, not pigment.',
      callDescription: 'Famous "quack-quack" (females); males give softer rasping calls',
      movement: 'glide',
      svg: function(h) {
        return h('g', null,
          // Body (gray-brown)
          h('ellipse', { cx: 18, cy: 18, rx: 12, ry: 6, fill: '#a89878', stroke: '#5a4a32', strokeWidth: 0.5 }),
          // White underside / breast separation
          h('ellipse', { cx: 14, cy: 19, rx: 5, ry: 4, fill: '#7a5a3a' }),
          // Iridescent green head (male)
          h('ellipse', { cx: 8, cy: 12, rx: 5, ry: 4, fill: '#1a8a4a' }),
          h('ellipse', { cx: 9, cy: 11, rx: 3, ry: 2, fill: '#2aa05a', opacity: 0.7 }),
          // White neck ring
          h('path', { d: 'M 4 14.5 Q 8 14 12 15', stroke: '#ffffff', strokeWidth: 1.2, fill: 'none' }),
          // Eye
          h('circle', { cx: 6, cy: 11, r: 0.7, fill: '#fff' }),
          h('circle', { cx: 6, cy: 11, r: 0.3, fill: '#000' }),
          // Yellow bill
          h('path', { d: 'M 3 12.5 L -1 12.5 Q -1 13.5 0 14 L 3 13.5 Z', fill: '#e8c440', stroke: '#8a7020', strokeWidth: 0.3 }),
          // Wing detail (speculum — blue with white borders)
          h('rect', { x: 18, y: 15, width: 8, height: 2, fill: '#3a5aaa' }),
          h('rect', { x: 18, y: 14, width: 8, height: 0.8, fill: '#fff' }),
          h('rect', { x: 18, y: 17, width: 8, height: 0.8, fill: '#fff' }),
          // Curly tail (male feature)
          h('path', { d: 'M 28 17 Q 32 13 30 18 Q 28 20 28 18 Z', fill: '#1a1a1a' }),
          // Tail
          h('path', { d: 'M 28 19 L 33 19 L 33 21 L 28 21 Z', fill: '#7a6840' })
        );
      }
    },
    kingfisher: {
      id: 'kingfisher',
      name: 'Belted Kingfisher',
      sciName: 'Megaceryle alcyon',
      size: '~13 in (medium)',
      habitat: 'Streams, rivers, ponds — anywhere with fish + a perch overlooking water',
      mainePresence: 'Spring through fall; some on coast year-round',
      funFact: 'Hovers above the water before plunge-diving headfirst — one of few North American birds that hovers in still air. Females are MORE colorful than males (rust belt) — unusual among birds.',
      callDescription: 'Loud, dry, mechanical RATTLE — sounds like a wooden noisemaker; given in flight along streams',
      movement: 'hover',
      svg: function(h) {
        return h('g', null,
          // Body (blue-gray)
          h('ellipse', { cx: 14, cy: 16, rx: 9, ry: 7, fill: '#5a8aa0', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          // Big shaggy crest (the namesake)
          h('path', { d: 'M 6 8 L 10 4 L 14 6 L 12 10 Z', fill: '#5a8aa0' }),
          h('path', { d: 'M 14 6 L 18 5 L 16 9 Z', fill: '#5a8aa0' }),
          // White collar
          h('ellipse', { cx: 12, cy: 14, rx: 6, ry: 1.5, fill: '#ffffff' }),
          // White breast
          h('ellipse', { cx: 12, cy: 17, rx: 5, ry: 3, fill: '#ffffff' }),
          // Blue chest band (the "belt")
          h('rect', { x: 7, y: 17, width: 10, height: 1.6, fill: '#5a8aa0' }),
          // Eye
          h('circle', { cx: 7, cy: 9, r: 0.8, fill: '#000' }),
          h('circle', { cx: 7.3, cy: 8.7, r: 0.3, fill: '#fff' }),
          // Long heavy bill
          h('path', { d: 'M 4 10 L -2 10 L 4 11.5 Z', fill: '#1a1a1a' }),
          // Wing
          h('ellipse', { cx: 17, cy: 16, rx: 5, ry: 5, fill: '#3a5a70' }),
          // Tail (short)
          h('path', { d: 'M 22 16 L 26 15 L 26 18 L 22 17 Z', fill: '#3a5a70' })
        );
      }
    },

    // ════ BACKYARD species ════
    cardinal: {
      id: 'cardinal',
      name: 'Northern Cardinal',
      sciName: 'Cardinalis cardinalis',
      size: '~9 in (medium)',
      habitat: 'Backyards, woodland edges, dense shrubs',
      mainePresence: 'Year-round; one of the most reliable winter feeder birds',
      funFact: 'Pairs sing duets — male and female take turns. Both sexes sing year-round. Females sing more complex songs than males in many cases.',
      callDescription: 'Clear whistled "what-cheer-cheer-cheer-cheer" or "pretty-pretty-pretty"; sharp "chip!" call',
      movement: 'perch-bob',
      svg: function(h) {
        return h('g', null,
          // Body (brilliant red — male)
          h('ellipse', { cx: 12, cy: 14, rx: 9, ry: 7, fill: '#d61a1a', stroke: '#7a0a0a', strokeWidth: 0.5 }),
          // Red crest (pointed)
          h('path', { d: 'M 8 8 L 10 0 L 13 8 Z', fill: '#d61a1a' }),
          // Black face mask
          h('ellipse', { cx: 7, cy: 11, rx: 4, ry: 2.5, fill: '#1a1a1a' }),
          // Eye
          h('circle', { cx: 6, cy: 10.5, r: 0.6, fill: '#fff' }),
          h('circle', { cx: 6, cy: 10.5, r: 0.3, fill: '#000' }),
          // Big orange-red conical bill (seedeater)
          h('path', { d: 'M 3 11 L -1 10 L 3 12.5 Z', fill: '#e88030' }),
          // Wing
          h('ellipse', { cx: 16, cy: 14, rx: 4, ry: 5, fill: '#a01010' }),
          // Tail (long)
          h('path', { d: 'M 19 14 L 27 13 L 27 16 L 19 16 Z', fill: '#a01010' })
        );
      }
    },
    bluejay: {
      id: 'bluejay',
      name: 'Blue Jay',
      sciName: 'Cyanocitta cristata',
      size: '~11 in (medium-large)',
      habitat: 'Backyards, oak forests, mixed woods',
      mainePresence: 'Year-round; loud and conspicuous',
      funFact: 'Excellent mimics — can imitate hawk calls almost perfectly. Sometimes uses this to scare other birds away from feeders. Plant acorns by burying them, which has helped oak forests spread.',
      callDescription: '"JAY-jay!" harsh scream; also a musical "queedle-queedle" + perfect Red-shouldered Hawk imitations',
      movement: 'perch-bob',
      svg: function(h) {
        return h('g', null,
          // Body (blue back, white belly)
          h('ellipse', { cx: 12, cy: 14, rx: 10, ry: 7, fill: '#ffffff', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          h('path', { d: 'M 3 7 Q 3 11 12 11 Q 21 11 21 7 Q 21 5 12 4 Q 3 5 3 7 Z', fill: '#3a78c8' }),
          // Wing
          h('ellipse', { cx: 17, cy: 14, rx: 5, ry: 5, fill: '#3a78c8' }),
          // Wing barring (white + black bars)
          h('path', { d: 'M 14 12 L 21 12 M 14 14 L 21 14', stroke: '#fff', strokeWidth: 0.6 }),
          h('path', { d: 'M 14 13 L 21 13 M 14 15 L 21 15', stroke: '#1a1a1a', strokeWidth: 0.4 }),
          // Black necklace
          h('path', { d: 'M 4 12 Q 12 14 20 12', stroke: '#1a1a1a', strokeWidth: 1.2, fill: 'none' }),
          // Crest (pointed back)
          h('path', { d: 'M 6 5 L 4 1 L 8 4 Z', fill: '#3a78c8' }),
          // White face
          h('ellipse', { cx: 8, cy: 9, rx: 4, ry: 2, fill: '#ffffff' }),
          // Black eye line
          h('path', { d: 'M 4 9 L 11 9', stroke: '#1a1a1a', strokeWidth: 0.7 }),
          // Eye
          h('circle', { cx: 7, cy: 10, r: 0.7, fill: '#000' }),
          // Bill (stout, dark)
          h('path', { d: 'M 3 10 L -1 10 L 3 11.5 Z', fill: '#1a1a1a' }),
          // Tail (long, blue with white tip)
          h('path', { d: 'M 21 14 L 30 13 L 30 17 L 21 16 Z', fill: '#3a78c8' }),
          h('rect', { x: 28, y: 13, width: 2, height: 4, fill: '#fff' })
        );
      }
    },
    houseFinch: {
      id: 'houseFinch',
      name: 'House Finch',
      sciName: 'Haemorhous mexicanus',
      size: '~6 in (small)',
      habitat: 'Backyards, urban areas, open woodlands',
      mainePresence: 'Year-round; common at feeders',
      funFact: 'Males\' red color comes from carotenoid pigments in their food — birds with better diets are redder. Females actually prefer redder males because it signals foraging skill.',
      callDescription: 'Long, jumbled warbling song with a downward "zwee" at the end; cheerful "queet!" call',
      movement: 'perch-bob',
      svg: function(h) {
        return h('g', null,
          // Body (brown-streaked)
          h('ellipse', { cx: 12, cy: 14, rx: 8, ry: 6, fill: '#a89070', stroke: '#5a4a32', strokeWidth: 0.5 }),
          // Streaks on belly
          h('path', { d: 'M 8 16 L 10 19 M 12 17 L 13 20 M 16 16 L 17 19', stroke: '#5a4a30', strokeWidth: 0.5 }),
          // RED head + breast (male — females are gray-streaked)
          h('ellipse', { cx: 9, cy: 11, rx: 5, ry: 4, fill: '#d63a40' }),
          h('ellipse', { cx: 10, cy: 14, rx: 4, ry: 2, fill: '#d63a40' }),
          // Eye
          h('circle', { cx: 7, cy: 10.5, r: 0.6, fill: '#000' }),
          // Stout conical bill
          h('path', { d: 'M 3 11 L 0 11 L 3 12.5 Z', fill: '#3a3a3a' }),
          // Wing
          h('ellipse', { cx: 15, cy: 14, rx: 4, ry: 4, fill: '#7a6240' }),
          // Tail (slightly notched)
          h('path', { d: 'M 18 14 L 24 13 L 24 16 L 18 15 Z', fill: '#7a6240' })
        );
      }
    },

    // ════ COAST species ════
    puffin: {
      id: 'puffin',
      name: 'Atlantic Puffin',
      sciName: 'Fratercula arctica',
      size: '~10 in (small but stocky)',
      habitat: 'Open ocean (winter); offshore island colonies (summer breeding)',
      mainePresence: 'Summer breeders ON the offshore islands (Eastern Egg Rock, Matinicus Rock, Petit Manan); rarely seen from shore',
      funFact: 'Maine\'s flagship seabird restoration story. Project Puffin (Audubon, 1973) used decoys and recordings to lure puffins back to nest on Eastern Egg Rock after they\'d been hunted to local extinction. They came back. Today: ~1,300 pairs across Maine islands.',
      callDescription: 'Mostly silent at sea; soft growling "arr-arr-arr" near burrows',
      movement: 'glide',
      svg: function(h) {
        return h('g', null,
          // Stocky body (black above, white below)
          h('ellipse', { cx: 12, cy: 14, rx: 9, ry: 8, fill: '#ffffff', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          // Black back + head
          h('path', { d: 'M 3 7 Q 3 12 12 12 Q 21 12 21 7 Q 21 4 12 3 Q 3 4 3 7 Z', fill: '#0a0a0a' }),
          h('path', { d: 'M 3 12 Q 3 14 6 14 Q 9 14 9 12 Z', fill: '#0a0a0a' }),
          // White face patch (around eye)
          h('ellipse', { cx: 7, cy: 9, rx: 3, ry: 2, fill: '#e8e0d8' }),
          // Eye
          h('circle', { cx: 7, cy: 9, r: 0.7, fill: '#000' }),
          // FAMOUS PARROT-LIKE BILL — orange + yellow + blue stripes (breeding plumage)
          h('path', { d: 'M 3 9.5 L -3 9 Q -4 11 -3 13 L 3 12 Z', fill: '#e85a20', stroke: '#7a3010', strokeWidth: 0.4 }),
          h('path', { d: 'M -2 10 L 1 10 L 1 12 L -2 12 Z', fill: '#e8c020' }),
          h('path', { d: 'M -3 11 L 1 11', stroke: '#3a3a8a', strokeWidth: 0.4 }),
          // Wing
          h('ellipse', { cx: 16, cy: 13, rx: 4, ry: 5, fill: '#0a0a0a' }),
          // Orange feet (visible on island, not at sea)
          h('rect', { x: 9, y: 21, width: 2, height: 2, fill: '#e88030' }),
          h('rect', { x: 13, y: 21, width: 2, height: 2, fill: '#e88030' })
        );
      }
    },
    herringGull: {
      id: 'herringGull',
      name: 'Herring Gull',
      sciName: 'Larus argentatus',
      size: '~25 in (large)',
      habitat: 'Coast, harbors, dumps, parking lots, anywhere food might be',
      mainePresence: 'Year-round; the default "seagull" you see in Portland or Bar Harbor',
      funFact: 'There is no such thing as a "seagull" — there are 50+ gull species, and the Herring Gull is the most common one in eastern North America. Smart enough to drop clams on rocks from height to crack them open.',
      callDescription: 'Long laughing call ("kyow-kyow-kyow"); sharp "kak!" alarm; the iconic "seagull" cry',
      movement: 'soar',
      svg: function(h) {
        return h('g', null,
          // Body (white)
          h('ellipse', { cx: 16, cy: 16, rx: 13, ry: 7, fill: '#ffffff', stroke: '#5a5a5a', strokeWidth: 0.4 }),
          // Light gray back/wings
          h('path', { d: 'M 5 13 Q 5 9 16 9 Q 27 9 27 13 L 27 16 L 5 16 Z', fill: '#b8c0c8' }),
          // BLACK WINGTIPS (key field mark — all our common gulls have black tips with white spots)
          h('path', { d: 'M 25 11 L 36 8 L 36 15 L 25 14 Z', fill: '#1a1a1a' }),
          h('circle', { cx: 32, cy: 11, r: 0.8, fill: '#fff' }),
          h('circle', { cx: 34, cy: 12, r: 0.8, fill: '#fff' }),
          // Yellow bill with red spot (the "begging spot" chicks peck for food)
          h('path', { d: 'M 4 14 L -3 14 L 4 15.5 Z', fill: '#e8c440', stroke: '#8a7020', strokeWidth: 0.3 }),
          h('circle', { cx: -1, cy: 14.7, r: 0.6, fill: '#d62020' }),
          // Eye (pale yellow)
          h('circle', { cx: 8, cy: 12, r: 0.7, fill: '#e8d8a0' }),
          h('circle', { cx: 8, cy: 12, r: 0.3, fill: '#000' }),
          // Pink legs
          h('line', { x1: 14, y1: 22, x2: 14, y2: 27, stroke: '#e8a0a0', strokeWidth: 1 }),
          h('line', { x1: 18, y1: 22, x2: 18, y2: 27, stroke: '#e8a0a0', strokeWidth: 1 }),
          // Tail
          h('path', { d: 'M 27 16 L 33 17 L 33 19 L 27 18 Z', fill: '#fff' })
        );
      }
    },
    eider: {
      id: 'eider',
      name: 'Common Eider',
      sciName: 'Somateria mollissima',
      size: '~24 in (large sea duck)',
      habitat: 'Coastal waters, especially around rocky shores; rafts of dozens common',
      mainePresence: 'Year-round on the Maine coast; most common Atlantic sea duck',
      funFact: 'Eider down (the under-feathers from female nests) is the warmest natural insulator known — used in luxury sleeping bags. Females pluck their own breast feathers to line nests; humans gather them after the ducklings leave.',
      callDescription: 'Distinctive "ah-OOO-uh" cooing from males in spring; surprisingly soft for a large duck',
      movement: 'glide',
      svg: function(h) {
        return h('g', null,
          // Body (white above, black below — male)
          h('ellipse', { cx: 16, cy: 17, rx: 12, ry: 7, fill: '#ffffff', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          // Black underside
          h('path', { d: 'M 6 18 Q 6 23 16 23 Q 26 23 26 18 Z', fill: '#0a0a0a' }),
          // Black on top of head
          h('path', { d: 'M 5 11 Q 5 7 12 7 Q 18 8 18 13 L 12 13 Z', fill: '#0a0a0a' }),
          // Greenish nape (subtle)
          h('ellipse', { cx: 13, cy: 11, rx: 3, ry: 1.5, fill: '#9aa07a' }),
          // White face
          h('ellipse', { cx: 9, cy: 12, rx: 3, ry: 2.5, fill: '#ffffff' }),
          // Eye
          h('circle', { cx: 7, cy: 12, r: 0.6, fill: '#000' }),
          // Long sloping bill (flat-topped, wedge-shaped — diagnostic for eiders)
          h('path', { d: 'M 5 12 L -2 11 L -1 14 L 5 14 Z', fill: '#a8a070', stroke: '#5a5030', strokeWidth: 0.3 }),
          // Wing
          h('ellipse', { cx: 19, cy: 16, rx: 5, ry: 4, fill: '#fff' }),
          // Tail (short, dark)
          h('path', { d: 'M 26 17 L 31 17 L 31 20 L 26 20 Z', fill: '#0a0a0a' })
        );
      }
    },
    baldEagle: {
      id: 'baldEagle',
      name: 'Bald Eagle',
      sciName: 'Haliaeetus leucocephalus',
      size: '~32 in (very large raptor); 7 ft wingspan',
      habitat: 'Lakes, rivers, coast — anywhere with fish + tall trees for nesting',
      mainePresence: 'Year-round; nesting on most large Maine lakes + coast (~700 active nests statewide)',
      funFact: 'Recovered from the brink — DDT pesticide thinned eggshells in the 1960s; Maine had only ~21 nesting pairs in 1972. Today: hundreds. One of the great American conservation comebacks.',
      callDescription: 'Surprisingly small "weak-eek-eek-eek" — not the dramatic scream you hear in movies (that\'s a Red-tailed Hawk overdubbed)',
      movement: 'soar',
      svg: function(h) {
        return h('g', null,
          // Big dark brown body
          h('ellipse', { cx: 20, cy: 18, rx: 16, ry: 8, fill: '#5a3a1a', stroke: '#2a1a0a', strokeWidth: 0.5 }),
          // White head (the "bald" — actually means "white-headed")
          h('ellipse', { cx: 8, cy: 12, rx: 6, ry: 5, fill: '#ffffff', stroke: '#5a5a5a', strokeWidth: 0.4 }),
          // Massive yellow hooked beak
          h('path', { d: 'M 2 12 L -5 11 Q -6 14 -4 15 L 2 14 Z', fill: '#e8c020', stroke: '#8a7020', strokeWidth: 0.4 }),
          // Yellow eye + cere
          h('circle', { cx: 6, cy: 11, r: 1.4, fill: '#e8c020' }),
          h('circle', { cx: 6, cy: 11, r: 0.5, fill: '#000' }),
          // White tail
          h('path', { d: 'M 32 16 L 42 14 L 42 22 L 32 20 Z', fill: '#ffffff', stroke: '#5a5a5a', strokeWidth: 0.4 }),
          // Wing detail (tipped)
          h('path', { d: 'M 25 14 L 30 12 L 30 17 Z', fill: '#3a2a0a' }),
          // Yellow legs/feet
          h('line', { x1: 17, y1: 25, x2: 17, y2: 30, stroke: '#e8c020', strokeWidth: 1.2 }),
          h('line', { x1: 22, y1: 25, x2: 22, y2: 30, stroke: '#e8c020', strokeWidth: 1.2 })
        );
      }
    },

    // ════ MOUNTAIN species ════
    junco: {
      id: 'junco',
      name: 'Dark-eyed Junco',
      sciName: 'Junco hyemalis',
      size: '~6 in (small sparrow)',
      habitat: 'Coniferous and mixed forest in summer; backyards, brushy edges in winter',
      mainePresence: 'Year-round in mountain areas; winters statewide',
      funFact: 'Called "snowbirds" — they appear in backyards as winter starts. The white outer tail feathers flash when they fly, like flicking on a turn signal.',
      callDescription: 'Musical trill on one pitch, like a tiny sewing machine; sharp "tsick" calls',
      movement: 'flit',
      svg: function(h) {
        return h('g', null,
          // Body (slate-gray above, white below)
          h('ellipse', { cx: 12, cy: 14, rx: 8, ry: 6, fill: '#ffffff', stroke: '#3a3a3a', strokeWidth: 0.5 }),
          // Slate-gray hood + back
          h('path', { d: 'M 4 12 Q 4 7 12 7 Q 20 7 20 12 L 20 14 L 4 14 Z', fill: '#5a6a7a' }),
          // Eye
          h('circle', { cx: 7, cy: 10.5, r: 0.6, fill: '#000' }),
          // Pink bill (key field mark)
          h('path', { d: 'M 3 11 L 0 11 L 3 12.5 Z', fill: '#e8b8b0' }),
          // Wing
          h('ellipse', { cx: 15, cy: 13, rx: 4, ry: 4, fill: '#3a4a5a' }),
          // White outer tail feathers (key flash field mark)
          h('path', { d: 'M 18 14 L 25 13 L 25 16 L 18 16 Z', fill: '#3a4a5a' }),
          h('path', { d: 'M 23 13 L 25 13 L 25 16 L 23 16 Z', fill: '#fff' })
        );
      }
    },
    raven: {
      id: 'raven',
      name: 'Common Raven',
      sciName: 'Corvus corax',
      size: '~24 in (very large)',
      habitat: 'Mountains, forests, coast — wide-ranging across nearly all habitats',
      mainePresence: 'Year-round; most common in the western mountains and Down East',
      funFact: 'Among the most intelligent of all birds. Recognizes individual humans, can use tools, plans for the future. The crow you see in Maine is more likely to be a raven if it\'s up north.',
      callDescription: 'Deep, hollow "cronk-cronk" — much deeper and more guttural than a crow\'s caw. Also: knocking sounds, mimicked human words, complex vocabulary',
      movement: 'soar',
      svg: function(h) {
        return h('g', null,
          // Big jet-black body
          h('ellipse', { cx: 15, cy: 15, rx: 12, ry: 7, fill: '#0a0a0a' }),
          // Shaggy throat ("hackles" — distinguishes raven from crow)
          h('path', { d: 'M 8 13 L 5 17 L 9 16 L 7 19 L 11 17 Z', fill: '#1a1a1a' }),
          // Heavy head
          h('ellipse', { cx: 8, cy: 12, rx: 5, ry: 4, fill: '#0a0a0a' }),
          // Big curved bill (much heavier than crow)
          h('path', { d: 'M 3 11 Q -3 11 -3 13 Q -2 14 3 13 Z', fill: '#1a1a1a' }),
          // Eye
          h('circle', { cx: 7, cy: 10.5, r: 0.7, fill: '#fff' }),
          h('circle', { cx: 7, cy: 10.5, r: 0.3, fill: '#000' }),
          // Wedge-shaped tail (distinguishes from crow's fan tail)
          h('path', { d: 'M 26 14 L 35 16 L 26 18 Z', fill: '#0a0a0a' })
        );
      }
    }
  };

  // ─────────────────────────────────────────────────────
  // HABITATS — five layered I-Spy scenes (Phase 1: forest only;
  // Phase 2 ships marsh, backyard, coast, mountain)
  // Each habitat has 4-5 SVG layers + 4-7 birds at various z-layers
  // ─────────────────────────────────────────────────────
  var HABITATS = {
    forest: {
      id: 'forest',
    name: 'Forest',
    description: 'Mixed deciduous + evergreen Northeastern forest. Mid-summer. Listen for layered birdsong: chickadees high, vireo persistent, distant woodpecker drumming.',
    width: 900,
    height: 500,
    bgGradient: 'linear-gradient(180deg, #b8d8e8 0%, #e8f0d8 65%, #c8d8a8 100%)',
    // Birds positioned in scene; layer determines z-order
    birds: [
      // Soaring overhead (top layer)
      { species: 'coopershawk', x: 700, y: 50,  scale: 1.0, layer: 5, hint: 'High in the sky — scan above the canopy' },
      // Mid-flight birds (layer 3 — between back trees and foreground trees)
      { species: 'vireo',       x: 280, y: 130, scale: 1.1, layer: 3, hint: 'Flits in the upper canopy — listen for the persistent song' },
      // On a foreground tree trunk (layer 4 — visible against trunk)
      { species: 'pileated',    x: 60,  y: 200, scale: 1.0, layer: 4, hint: 'Drumming on the tree to your left' },
      // Walking down a tree trunk (layer 4)
      { species: 'nuthatch',    x: 760, y: 180, scale: 1.0, layer: 4, hint: 'Walking head-DOWN the trunk — only one species does that' },
      // Perched on a midground branch (layer 3)
      { species: 'chickadee',   x: 420, y: 200, scale: 1.0, layer: 3, hint: 'Bobbing on a low branch in the middle of the scene' },
      // On the ground (layer 4 — foreground ground)
      { species: 'robin',       x: 500, y: 410, scale: 1.0, layer: 4, hint: 'On the leaf litter, head cocked — listening for worms' },
      // Hidden in undergrowth (layer 2 — back, partly occluded by foreground foliage)
      { species: 'towhee',      x: 180, y: 380, scale: 0.9, layer: 2, hint: 'Rustling in the undergrowth — scratching at leaf litter' }
    ],
    // Render the scene's static elements (trees, foliage, etc) per z-layer
    renderLayer: function(h, z) {
      // Layer 0: distant background (sky already gradient)
      if (z === 0) {
        return h('g', null,
          // Distant tree silhouettes
          h('path', { d: 'M 0 380 Q 50 320 100 380 Q 150 290 200 380 Q 250 310 300 380 Q 350 280 400 380 Q 450 320 500 380 Q 550 290 600 380 Q 650 320 700 380 Q 750 280 800 380 Q 850 310 900 380 L 900 500 L 0 500 Z',
            fill: '#7a9a7a' })
        );
      }
      // Layer 1: middle-distance trees
      if (z === 1) {
        return h('g', null,
          // Back trees
          h('rect', { x: 100, y: 250, width: 12, height: 200, fill: '#5a4a3a' }),
          h('ellipse', { cx: 106, cy: 250, rx: 50, ry: 80, fill: '#5a8a5a' }),
          h('rect', { x: 350, y: 240, width: 10, height: 220, fill: '#4a3a2a' }),
          h('ellipse', { cx: 355, cy: 240, rx: 60, ry: 90, fill: '#6a9a6a' }),
          h('rect', { x: 600, y: 250, width: 11, height: 200, fill: '#5a4a3a' }),
          h('ellipse', { cx: 606, cy: 250, rx: 55, ry: 85, fill: '#5a8a5a' }),
          h('rect', { x: 820, y: 245, width: 10, height: 215, fill: '#4a3a2a' }),
          h('ellipse', { cx: 825, cy: 245, rx: 50, ry: 80, fill: '#6a9a6a' })
        );
      }
      // Layer 2: mid-flight zone background (no static elements — birds at this level)
      // Layer 3: midground trees (closer than back, fewer)
      if (z === 3) {
        return h('g', null,
          // Mid-front tree on the right side, partly framing the nuthatch
          h('rect', { x: 740, y: 150, width: 40, height: 350, fill: '#4a3525' }),
          h('ellipse', { cx: 760, cy: 160, rx: 80, ry: 110, fill: '#3a7a3a', opacity: 0.85 }),
          // Mid-front tree branches stretching across (occludes some birds)
          h('path', { d: 'M 740 200 Q 600 180 460 220', stroke: '#4a3525', strokeWidth: 4, fill: 'none' }),
          h('ellipse', { cx: 590, cy: 200, rx: 30, ry: 18, fill: '#4a8a4a', opacity: 0.7 }),
          h('ellipse', { cx: 470, cy: 210, rx: 25, ry: 14, fill: '#4a8a4a', opacity: 0.7 })
        );
      }
      // Layer 4: foreground (closest trees, ground, foliage occluding undergrowth birds)
      if (z === 4) {
        return h('g', null,
          // Big foreground tree on left
          h('rect', { x: 30, y: 100, width: 50, height: 400, fill: '#3a2a1a' }),
          h('ellipse', { cx: 55, cy: 110, rx: 90, ry: 130, fill: '#2a6a2a' }),
          // Forest floor / leaf litter
          h('path', { d: 'M 0 440 L 900 430 L 900 500 L 0 500 Z', fill: '#8a7050' }),
          // Some leaf-litter detail
          h('ellipse', { cx: 250, cy: 460, rx: 30, ry: 6, fill: '#a8804a', opacity: 0.5 }),
          h('ellipse', { cx: 600, cy: 470, rx: 40, ry: 7, fill: '#a8804a', opacity: 0.5 }),
          // Foreground foliage at bottom-left to occlude the towhee partially (creates "secretive bird" effect)
          h('ellipse', { cx: 160, cy: 410, rx: 70, ry: 30, fill: '#4a7a4a', opacity: 0.85, className: 'birdlab-leaf-sway' }),
          h('ellipse', { cx: 220, cy: 420, rx: 50, ry: 20, fill: '#3a6a3a', opacity: 0.9 }),
          // Cavity in the foreground tree (where nuthatch / chickadee / pileated would enter)
          h('ellipse', { cx: 55, cy: 220, rx: 8, ry: 12, fill: '#0a0a0a' })
        );
      }
      return null;
    }
    },

    // ════ MARSH ════
    marsh: {
      id: 'marsh',
      name: 'Marsh',
      description: 'Freshwater wetland in summer. Cattails, lily pads, slow water. Listen for red-winged blackbirds calling from cattail tops, the kingfisher\'s rattle, frogs, and the occasional heron\'s harsh squawk.',
      width: 900,
      height: 500,
      bgGradient: 'linear-gradient(180deg, #c8e0e8 0%, #d8e8c8 50%, #6a8a7a 100%)',
      birds: [
        // Heron stalks at water's edge (foreground)
        { species: 'greatBlueHeron', x: 200, y: 360, scale: 1.0, layer: 4, hint: 'Tall, statue-still figure at the water\'s edge — neck S-curved, ready to strike' },
        // Kingfisher hovers over open water (mid)
        { species: 'kingfisher', x: 580, y: 200, scale: 1.0, layer: 3, hint: 'Hovering above the water — listening for a fish below. Rattling call.' },
        // Mallards cruise on water (mid-back)
        { species: 'mallard', x: 700, y: 380, scale: 1.0, layer: 3, hint: 'Drifting on open water — green head visible when light hits right' },
        // Red-winged blackbird perched on cattail (foreground)
        { species: 'redwingBlackbird', x: 80, y: 280, scale: 1.0, layer: 4, hint: 'Atop the cattail on the left — flashing the red-and-yellow shoulder' },
        // Common Yellowthroat substitute — use vireo flit in reeds (back layer, hidden)
        { species: 'vireo', x: 380, y: 320, scale: 0.9, layer: 2, hint: 'Hidden in the reeds — only the song betrays it' }
      ],
      renderLayer: function(h, z) {
        if (z === 0) {
          // Distant low marsh horizon
          return h('g', null,
            h('path', { d: 'M 0 340 Q 200 320 400 335 Q 600 350 900 330 L 900 380 L 0 380 Z', fill: '#7a9a7a' })
          );
        }
        if (z === 1) {
          // Open water + lily pads
          return h('g', null,
            h('path', { d: 'M 0 380 L 900 380 L 900 500 L 0 500 Z', fill: '#5a7a8a' }),
            // Lily pads
            h('ellipse', { cx: 450, cy: 410, rx: 28, ry: 8, fill: '#4a7a4a', opacity: 0.9 }),
            h('ellipse', { cx: 600, cy: 430, rx: 22, ry: 6, fill: '#5a8a5a', opacity: 0.9 }),
            h('ellipse', { cx: 320, cy: 440, rx: 25, ry: 7, fill: '#3a6a3a', opacity: 0.9 }),
            h('ellipse', { cx: 750, cy: 410, rx: 30, ry: 9, fill: '#4a7a4a', opacity: 0.9 }),
            // Water reflections
            h('path', { d: 'M 100 420 L 200 420 M 400 460 L 500 460 M 700 450 L 800 450', stroke: '#fff', strokeWidth: 0.8, opacity: 0.5 })
          );
        }
        if (z === 3) {
          // Mid-distance cattails clusters
          return h('g', null,
            // Cattail patch right side
            [0, 1, 2, 3, 4].map(function(i) {
              return h('g', { key: 'cr' + i },
                h('rect', { x: 800 + i * 8, y: 280, width: 1.5, height: 100, fill: '#6a4a2a' }),
                h('ellipse', { cx: 800.7 + i * 8, cy: 275, rx: 2, ry: 5, fill: '#3a2515' })
              );
            })
          );
        }
        if (z === 4) {
          // Foreground cattails (occlude back-layer birds)
          return h('g', null,
            // Left cattail patch
            [0, 1, 2, 3].map(function(i) {
              return h('g', { key: 'cl' + i },
                h('rect', { x: 60 + i * 12, y: 250, width: 2, height: 250, fill: '#5a3a25' }),
                h('ellipse', { cx: 61 + i * 12, cy: 245, rx: 3, ry: 7, fill: '#3a2010' })
              );
            }),
            // Mid-foreground cattail clump
            [0, 1, 2].map(function(i) {
              return h('g', { key: 'cm' + i },
                h('rect', { x: 360 + i * 14, y: 290, width: 1.8, height: 200, fill: '#5a3a25' }),
                h('ellipse', { cx: 361 + i * 14, cy: 285, rx: 2.5, ry: 6, fill: '#3a2010' })
              );
            }),
            // Foreground waving grass at very bottom
            h('path', { d: 'M 0 480 Q 100 470 200 480 Q 300 470 400 480 Q 500 470 600 480 Q 700 470 800 480 Q 900 470 900 480 L 900 500 L 0 500 Z', fill: '#5a7a4a' })
          );
        }
        return null;
      }
    },

    // ════ BACKYARD ════
    backyard: {
      id: 'backyard',
      name: 'Backyard',
      description: 'Suburban backyard in late summer. Bird feeder, tomato garden, deck. Listen for the constant chatter of feeder regulars: chickadees, finches, the occasional cardinal serenade, and the loud squawks of jays.',
      width: 900,
      height: 500,
      bgGradient: 'linear-gradient(180deg, #c8d8e8 0%, #d8e0c0 60%, #a8a070 100%)',
      birds: [
        // Cardinal on a shrub branch
        { species: 'cardinal', x: 160, y: 280, scale: 1.0, layer: 3, hint: 'Brilliant red on the shrub by the fence — male cardinal' },
        // Blue jay on the deck rail
        { species: 'bluejay', x: 600, y: 330, scale: 1.0, layer: 4, hint: 'Loud blue bird on the deck rail — hard to miss' },
        // Chickadee at feeder
        { species: 'chickadee', x: 450, y: 220, scale: 1.0, layer: 4, hint: 'Tiny black-and-white at the feeder — grabs a seed and zips' },
        // House finch at feeder
        { species: 'houseFinch', x: 480, y: 240, scale: 1.0, layer: 4, hint: 'Brown-streaked with red head — at the feeder beside the chickadee' },
        // Robin on the lawn
        { species: 'robin', x: 280, y: 410, scale: 1.0, layer: 4, hint: 'Hopping on the lawn — orange breast unmistakable' },
        // Cooper\'s hawk overhead (raptor over yard)
        { species: 'coopershawk', x: 750, y: 80, scale: 0.9, layer: 5, hint: 'Cruising over the rooftops — songbirds vanish from feeder when hawk shows up' }
      ],
      renderLayer: function(h, z) {
        if (z === 0) {
          // Distant rooftops
          return h('g', null,
            h('path', { d: 'M 0 320 L 200 320 L 220 290 L 280 290 L 300 320 L 500 320 L 530 285 L 600 285 L 620 320 L 900 320 L 900 360 L 0 360 Z', fill: '#9a8a7a' }),
            // Chimneys
            h('rect', { x: 240, y: 270, width: 12, height: 25, fill: '#7a6a5a' }),
            h('rect', { x: 560, y: 265, width: 14, height: 25, fill: '#7a6a5a' })
          );
        }
        if (z === 1) {
          // Backyard fence + tree behind
          return h('g', null,
            h('rect', { x: 0, y: 360, width: 900, height: 6, fill: '#8a7a6a' }),
            // Tree behind right side
            h('rect', { x: 720, y: 200, width: 15, height: 200, fill: '#5a4030' }),
            h('ellipse', { cx: 728, cy: 200, rx: 80, ry: 90, fill: '#5a8a5a' }),
            // Lawn green
            h('path', { d: 'M 0 366 L 900 366 L 900 500 L 0 500 Z', fill: '#7aa05a' })
          );
        }
        if (z === 3) {
          // Shrub on left + bird feeder pole
          return h('g', null,
            // Shrub
            h('ellipse', { cx: 160, cy: 320, rx: 75, ry: 45, fill: '#4a7a4a' }),
            h('ellipse', { cx: 130, cy: 305, rx: 30, ry: 22, fill: '#5a8a5a' }),
            // Bird feeder pole + feeder
            h('rect', { x: 467, y: 220, width: 4, height: 200, fill: '#3a3a3a' }),
            h('rect', { x: 440, y: 215, width: 60, height: 18, fill: '#7a4a2a', stroke: '#3a2010', strokeWidth: 1 }),
            h('rect', { x: 440, y: 215, width: 60, height: 4, fill: '#5a3a20' }),
            // Seed visible
            h('rect', { x: 446, y: 222, width: 48, height: 6, fill: '#c8a060' })
          );
        }
        if (z === 4) {
          // Deck rail + foreground tomato cage
          return h('g', null,
            // Deck rail right side
            h('rect', { x: 580, y: 360, width: 240, height: 6, fill: '#a88860' }),
            h('rect', { x: 590, y: 366, width: 4, height: 50, fill: '#a88860' }),
            h('rect', { x: 660, y: 366, width: 4, height: 50, fill: '#a88860' }),
            h('rect', { x: 730, y: 366, width: 4, height: 50, fill: '#a88860' }),
            h('rect', { x: 800, y: 366, width: 4, height: 50, fill: '#a88860' }),
            // Tomato plant in pot bottom-left
            h('rect', { x: 50, y: 440, width: 50, height: 30, fill: '#a8704a' }),
            h('ellipse', { cx: 75, cy: 415, rx: 30, ry: 28, fill: '#3a6a3a' }),
            h('circle', { cx: 65, cy: 410, r: 4, fill: '#d63030' }),
            h('circle', { cx: 85, cy: 425, r: 4, fill: '#d63030' })
          );
        }
        return null;
      }
    },

    // ════ COAST ════
    coast: {
      id: 'coast',
      name: 'Coast',
      description: 'Maine rocky coast in summer. Granite ledges, kelp, surf. Look for puffins on offshore islands (rare from shore), eiders rafting in the swell, gulls everywhere, an eagle on a high snag.',
      width: 900,
      height: 500,
      bgGradient: 'linear-gradient(180deg, #b0c8d8 0%, #5a8aa0 70%, #3a6a8a 100%)',
      birds: [
        // Bald eagle on tall snag
        { species: 'baldEagle', x: 800, y: 100, scale: 1.0, layer: 4, hint: 'Perched at the very top of the dead pine — white head visible from far away' },
        // Gull soaring overhead
        { species: 'herringGull', x: 350, y: 80, scale: 1.0, layer: 5, hint: 'Soaring overhead — gray back, black wingtips, yellow bill' },
        // Puffin standing on ledge
        { species: 'puffin', x: 180, y: 300, scale: 1.0, layer: 4, hint: 'Stocky black-and-white on the rocks — orange parrot bill is the giveaway' },
        // Eiders rafting on water
        { species: 'eider', x: 550, y: 380, scale: 1.0, layer: 3, hint: 'Out on the swell — large duck, white above black below' },
        { species: 'eider', x: 650, y: 400, scale: 0.9, layer: 3, hint: 'Drifting alongside the first one — rafts of eiders are common' }
      ],
      renderLayer: function(h, z) {
        if (z === 0) {
          // Distant horizon line
          return h('g', null,
            h('rect', { x: 0, y: 240, width: 900, height: 4, fill: '#7a9aa8' }),
            // Distant island
            h('ellipse', { cx: 600, cy: 240, rx: 90, ry: 18, fill: '#5a6a7a' })
          );
        }
        if (z === 1) {
          // Open ocean (water)
          return h('g', null,
            h('path', { d: 'M 0 244 L 900 244 L 900 460 L 0 460 Z', fill: '#3a6a8a' }),
            // Wave crests
            h('path', { d: 'M 0 320 Q 80 315 160 320 Q 240 325 320 320 Q 400 315 480 320 Q 560 325 640 320 Q 720 315 800 320 Q 880 325 900 320',
              stroke: '#a8c0d0', strokeWidth: 1.5, fill: 'none' }),
            h('path', { d: 'M 0 380 Q 80 376 160 380 Q 240 384 320 380 Q 400 376 480 380 Q 560 384 640 380 Q 720 376 800 380 Q 880 384 900 380',
              stroke: '#a8c0d0', strokeWidth: 1.5, fill: 'none' })
          );
        }
        if (z === 3) {
          // Mid-distance: dead snag (pine where eagle perches)
          return h('g', null,
            h('rect', { x: 800, y: 100, width: 8, height: 320, fill: '#7a6a5a' }),
            // Bare branches
            h('path', { d: 'M 800 150 L 770 130 M 808 180 L 840 160 M 800 220 L 760 215', stroke: '#7a6a5a', strokeWidth: 3, fill: 'none' })
          );
        }
        if (z === 4) {
          // Foreground granite ledges + kelp
          return h('g', null,
            // Big granite outcrop on left
            h('path', { d: 'M 0 280 L 50 250 L 120 260 L 180 245 L 230 265 L 270 280 L 280 320 L 0 320 Z', fill: '#9a8a8a' }),
            h('path', { d: 'M 50 280 L 100 270 L 150 280', stroke: '#5a4a4a', strokeWidth: 1, fill: 'none' }),
            // Smaller foreground rock right side
            h('path', { d: 'M 700 440 L 750 430 L 820 445 L 850 470 L 700 490 Z', fill: '#7a6a6a' }),
            // Foreground water at bottom
            h('path', { d: 'M 0 460 L 900 460 L 900 500 L 0 500 Z', fill: '#2a4a6a' }),
            // Kelp / seaweed at base of granite
            h('path', { d: 'M 80 320 Q 75 350 90 380 Q 100 410 85 440', stroke: '#5a8050', strokeWidth: 4, fill: 'none' }),
            h('path', { d: 'M 250 320 Q 245 350 260 380 Q 270 410 255 440', stroke: '#5a8050', strokeWidth: 4, fill: 'none' })
          );
        }
        return null;
      }
    },

    // ════ MOUNTAIN ════
    mountain: {
      id: 'mountain',
      name: 'Mountain',
      description: 'Western Maine high country in fall. Spruce-fir forest meeting alpine zone. Listen for the deep "cronk" of a raven, the trill of juncos, the wind in the conifers.',
      width: 900,
      height: 500,
      bgGradient: 'linear-gradient(180deg, #b8c0d0 0%, #c0c8b8 65%, #6a7a5a 100%)',
      birds: [
        // Raven soaring high
        { species: 'raven', x: 600, y: 90, scale: 1.0, layer: 5, hint: 'Big black bird soaring on a thermal — listen for the deep "cronk"' },
        // Cooper\'s hawk also here (shared with forest)
        { species: 'coopershawk', x: 250, y: 130, scale: 0.9, layer: 5, hint: 'A second raptor cruising lower along the ridgeline' },
        // Junco on rocky slope
        { species: 'junco', x: 450, y: 380, scale: 1.0, layer: 4, hint: 'Slate-gray little bird on the bare ground — pink bill visible up close' },
        // Pileated woodpecker on conifer trunk
        { species: 'pileated', x: 720, y: 280, scale: 1.0, layer: 4, hint: 'Drumming on a conifer trunk — red crest is the giveaway' },
        // Towhee in undergrowth (also shared with forest — many habitats overlap)
        { species: 'towhee', x: 130, y: 410, scale: 0.9, layer: 2, hint: 'Rustling in the brush at the base of the slope' }
      ],
      renderLayer: function(h, z) {
        if (z === 0) {
          // Distant peaks
          return h('g', null,
            h('path', { d: 'M 0 280 L 100 200 L 200 240 L 320 180 L 460 220 L 560 170 L 680 200 L 820 160 L 900 190 L 900 320 L 0 320 Z',
              fill: '#7a8090' }),
            // Snow caps
            h('path', { d: 'M 290 195 L 320 180 L 350 195', fill: '#fff' }),
            h('path', { d: 'M 540 185 L 560 170 L 580 185', fill: '#fff' }),
            h('path', { d: 'M 790 175 L 820 160 L 850 175', fill: '#fff' })
          );
        }
        if (z === 1) {
          // Mid-distance conifer band
          return h('g', null,
            // Many small triangle conifers
            [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function(i) {
              return h('path', { key: 'c' + i, d: 'M ' + (60 + i * 100) + ' 290 L ' + (90 + i * 100) + ' 230 L ' + (120 + i * 100) + ' 290 Z',
                fill: '#3a5a3a' });
            })
          );
        }
        if (z === 3) {
          // Closer conifers (taller, fewer)
          return h('g', null,
            // Tall conifer right
            h('path', { d: 'M 690 460 L 720 200 L 750 460 Z', fill: '#2a4a2a' }),
            h('path', { d: 'M 700 380 L 720 280 L 740 380 Z', fill: '#3a5a3a' }),
            // Tall conifer middle-left
            h('path', { d: 'M 380 480 L 420 240 L 460 480 Z', fill: '#2a4a2a' }),
            h('path', { d: 'M 390 400 L 420 320 L 450 400 Z', fill: '#3a5a3a' })
          );
        }
        if (z === 4) {
          // Foreground rocky slope + boulders + low brush
          return h('g', null,
            // Rocky slope ground
            h('path', { d: 'M 0 380 L 200 360 L 400 375 L 600 365 L 900 380 L 900 500 L 0 500 Z', fill: '#8a8070' }),
            // Boulders
            h('ellipse', { cx: 100, cy: 410, rx: 40, ry: 22, fill: '#7a7060' }),
            h('ellipse', { cx: 350, cy: 430, rx: 35, ry: 18, fill: '#6a6050' }),
            h('ellipse', { cx: 600, cy: 425, rx: 45, ry: 24, fill: '#7a7060' }),
            // Foreground low brush left side (occludes towhee partially)
            h('ellipse', { cx: 150, cy: 410, rx: 60, ry: 28, fill: '#6a8a5a', opacity: 0.85, className: 'birdlab-leaf-sway' })
          );
        }
        return null;
      }
    }
  };

  // ─────────────────────────────────────────────────────
  // FAMOUS CALLS — Phase 3 Bird Call Trainer data
  // Mnemonic phrases birders use to remember calls. Some entries are
  // species we have full SVGs for; others are "audio-only" species
  // (owl, titmouse, etc.) included because their call mnemonics are too
  // pedagogically important to skip. Each entry pairs a Cornell-Lab-style
  // mnemonic with descriptive text + habitat context.
  // ─────────────────────────────────────────────────────
  var FAMOUS_CALLS = [
    {
      id: 'robin_call',
      species: 'American Robin',
      mnemonic: '"Cheerily, cheer-up, cheerio"',
      description: 'Liquid, melodic phrases sung at dawn and dusk. Each phrase rises slightly, then drops. The song of the spring suburb.',
      habitat: 'Lawns, suburbs, forest edges',
      tip: 'The default "songbird at dawn" sound across most of North America.'
    },
    {
      id: 'chickadee_call',
      species: 'Black-capped Chickadee',
      mnemonic: '"Chick-a-dee-dee-dee" (call) or whistled "Fee-bee" (song)',
      description: 'Cheerful chatter all year; whistled two-note song mostly in spring. More "dees" at the end = higher alarm level.',
      habitat: 'Forest, backyards, anywhere with trees',
      tip: 'The number of "dees" literally encodes how much they think you\'re a threat. Researchers verified this.'
    },
    {
      id: 'cardinal_call',
      species: 'Northern Cardinal',
      mnemonic: '"What-cheer cheer cheer" or "Pretty pretty pretty"',
      description: 'Clear whistled phrases, surprisingly loud. Both males AND females sing — unusual among songbirds. Sharp "chip!" call when alarmed.',
      habitat: 'Backyards, dense shrubs, forest edges',
      tip: 'If you hear a clear whistle and can\'t see the bird, scan the dense interior of a shrub at eye level.'
    },
    {
      id: 'towhee_call',
      species: 'Eastern Towhee',
      mnemonic: '"Drink-your-TEEEEE!"',
      description: 'Three-syllable: a couple short notes, then a long buzzy trill. Sharp "chewink!" call when disturbed.',
      habitat: 'Brushy edges, dense undergrowth',
      tip: 'You\'ll often hear them rustling in leaf litter before you hear the song. Two-footed backwards-scratch hop is the giveaway.'
    },
    {
      id: 'wts_call',
      species: 'White-throated Sparrow',
      mnemonic: '"Old Sam Peabody-Peabody-Peabody" (US) or "Oh sweet Canada-Canada-Canada" (Canada)',
      description: 'High clear whistles in a distinctive pattern: 1 long note, 1 medium, then 3 quick triplets. The melancholy soundtrack of northern forests.',
      habitat: 'Coniferous forest, brushy edges (year-round in Maine winters)',
      tip: 'One of the most evocative bird sounds in northeastern North America. If you hear it, you\'re likely in good northern woods.'
    },
    {
      id: 'titmouse_call',
      species: 'Tufted Titmouse',
      mnemonic: '"Peter peter peter peter"',
      description: 'Loud, ringing whistle on one pitch repeated 4-8 times. Sometimes "Pidi-pidi-pidi". A relative of chickadees with a small gray crest.',
      habitat: 'Deciduous forest, backyards',
      tip: 'Often the loudest sound in winter woods. You\'ll hear it before you see the bird.'
    },
    {
      id: 'barredowl_call',
      species: 'Barred Owl',
      mnemonic: '"Who cooks for you? Who cooks for you-ALL?"',
      description: '8-note hooted question with the final "you-all" trailing down. The signature owl of eastern forests. Often calls in daylight.',
      habitat: 'Mature mixed forest, swampy woods',
      tip: 'The most likely owl you\'ll hear in Maine forests. Active in daylight more than other owl species.'
    },
    {
      id: 'mourningdove_call',
      species: 'Mourning Dove',
      mnemonic: '"Hoo-OO, hoo, hoo, hoo"',
      description: 'Soft, mournful cooing. Often mistaken for an owl. The quiet sound of suburban summer mornings.',
      habitat: 'Suburbs, fields, anywhere',
      tip: 'A common mistake: people hear mourning doves and think they\'re hearing owls. Owls hoot at night; doves call in daylight.'
    },
    {
      id: 'rwbb_call',
      species: 'Red-winged Blackbird',
      mnemonic: '"Konk-la-REEEE!" with a rattly final note',
      description: 'Loud, raspy proclamation from cattail tops. Males sing constantly through marsh breeding season. Females give softer "chek" calls.',
      habitat: 'Marshes, cattails, wet meadows',
      tip: 'One of the first migrants to return to Maine in early March. Their song = spring is officially here.'
    },
    {
      id: 'vireo_call',
      species: 'Red-eyed Vireo',
      mnemonic: '"Here-I-am, where-are-you?"',
      description: 'Persistent two-note phrases, repeated all day, even in summer heat. Recorded singing 22,000+ songs in a single day.',
      habitat: 'Deciduous forest canopy',
      tip: 'The bird that just won\'t shut up. If you\'re in summer woods and hear endless two-note phrases, that\'s vireo.'
    },
    {
      id: 'kingfisher_call',
      species: 'Belted Kingfisher',
      mnemonic: 'Mechanical RATTLE — like a wooden noisemaker',
      description: 'Loud, dry, machine-like rattle given in flight along streams and ponds. Distinctive — sounds nothing like a "song."',
      habitat: 'Streams, rivers, ponds, coastal estuaries',
      tip: 'You\'ll often hear them flying along a stream before you see them. Look up — they fly purposeful straight lines.'
    },
    {
      id: 'jay_call',
      species: 'Blue Jay',
      mnemonic: '"JAY-jay!" + perfect Red-shouldered Hawk imitation',
      description: 'Harsh nasal scream most often. Also a musical "queedle-queedle." Famous for mimicking hawk calls perfectly — sometimes uses this to scare other birds away from feeders.',
      habitat: 'Backyards, oak forests, mixed woods',
      tip: 'If you think you heard a hawk but the songbirds didn\'t scatter, it was probably a Blue Jay messing with you.'
    },
    {
      id: 'yellowthroat_call',
      species: 'Common Yellowthroat',
      mnemonic: '"Witchity-witchity-witchity-witch!"',
      description: 'Three-syllable phrases repeated. Bright, bouncy. Males have black masks; very secretive in cattails and reeds.',
      habitat: 'Marshes, brushy wetland edges',
      tip: 'You\'ll hear them constantly in summer marshes; seeing them is the harder challenge.'
    },
    {
      id: 'pileated_call',
      species: 'Pileated Woodpecker',
      mnemonic: 'Loud ringing "kuk-kuk-kuk-kuk" laugh + powerful drumming',
      description: 'Slow, deep "wuk-wuk-wuk" calls; drum is hollow and resonant — can be heard a half-mile away.',
      habitat: 'Mature forest with large dead trees',
      tip: 'The crow-sized woodpecker. Drumming is unmistakably big. Different from smaller woodpecker drumming, which is faster.'
    },
    {
      id: 'loon_call',
      species: 'Common Loon',
      mnemonic: 'Yodeling tremolo (the "iconic Maine lake sound")',
      description: 'Four distinct call types: wail (long note), tremolo (laughing trill), yodel (males only), and hoot. Together they make Maine summer evenings.',
      habitat: 'Large lakes, also coastal in winter',
      tip: 'Maine\'s state bird is the chickadee, but the loon is on the state quarter. Hearing a loon at sunset on a north-Maine lake is a core Maine experience.'
    }
  ];

  // ─────────────────────────────────────────────────────
  // HABITAT BIRD MAP — Phase 3 Habitat Match data
  // For each habitat, the species that legitimately belong + species
  // commonly mistaken to belong (to make the matching game challenging).
  // ─────────────────────────────────────────────────────
  var HABITAT_BIRD_MAP = {
    forest: {
      label: 'Forest',
      icon: '🌲',
      belong: ['Black-capped Chickadee', 'White-breasted Nuthatch', 'Pileated Woodpecker', 'Red-eyed Vireo', 'Eastern Towhee', 'Cooper\'s Hawk', 'Barred Owl'],
      dontBelong: ['Atlantic Puffin', 'Great Blue Heron', 'Mallard', 'Herring Gull']
    },
    marsh: {
      label: 'Marsh',
      icon: '🌾',
      belong: ['Great Blue Heron', 'Red-winged Blackbird', 'Mallard', 'Belted Kingfisher', 'Common Yellowthroat'],
      dontBelong: ['Pileated Woodpecker', 'Atlantic Puffin', 'White-breasted Nuthatch', 'Common Raven']
    },
    backyard: {
      label: 'Backyard',
      icon: '🏡',
      belong: ['Northern Cardinal', 'Blue Jay', 'House Finch', 'Black-capped Chickadee', 'American Robin', 'Mourning Dove'],
      dontBelong: ['Great Blue Heron', 'Atlantic Puffin', 'Common Loon', 'Barred Owl']
    },
    coast: {
      label: 'Coast',
      icon: '🌊',
      belong: ['Atlantic Puffin', 'Herring Gull', 'Common Eider', 'Bald Eagle', 'Common Loon (winter)'],
      dontBelong: ['Pileated Woodpecker', 'Tufted Titmouse', 'Northern Cardinal', 'Eastern Towhee']
    },
    mountain: {
      label: 'Mountain',
      icon: '⛰️',
      belong: ['Common Raven', 'Dark-eyed Junco', 'Cooper\'s Hawk', 'Pileated Woodpecker', 'White-throated Sparrow'],
      dontBelong: ['Atlantic Puffin', 'Great Blue Heron', 'Mallard', 'Belted Kingfisher']
    }
  };

  // Bird→Habitat matching pool (for the reverse-direction game).
  // Each species → the ONE habitat it's most commonly associated with.
  var BIRD_TO_HABITAT = [
    { bird: 'Atlantic Puffin', habitat: 'coast', reason: 'Nests on offshore Maine islands; spends winters at sea' },
    { bird: 'Great Blue Heron', habitat: 'marsh', reason: 'Wades shallow water hunting fish + frogs' },
    { bird: 'Northern Cardinal', habitat: 'backyard', reason: 'Loves backyard shrubs + feeders; expanded northward following bird feeders' },
    { bird: 'Common Raven', habitat: 'mountain', reason: 'Western Maine high country; thrives in remote rocky terrain' },
    { bird: 'Pileated Woodpecker', habitat: 'forest', reason: 'Needs large dead trees for cavities; mature deciduous + mixed forest' },
    { bird: 'Belted Kingfisher', habitat: 'marsh', reason: 'Hovers above water; needs perches over slow streams or marsh edges' },
    { bird: 'Common Eider', habitat: 'coast', reason: 'Saltwater sea duck; rafts in coastal swell year-round in Maine' },
    { bird: 'Red-winged Blackbird', habitat: 'marsh', reason: 'Cattail-perch breeder; among the first spring migrants to return' },
    { bird: 'House Finch', habitat: 'backyard', reason: 'Suburban specialist; feeders and shrubs' },
    { bird: 'Dark-eyed Junco', habitat: 'mountain', reason: '"Snowbird" of cool conifer forests; winters lower elevation' },
    { bird: 'Eastern Towhee', habitat: 'forest', reason: 'Brushy forest understory; double-scratches at leaf litter' },
    { bird: 'Herring Gull', habitat: 'coast', reason: 'The default coastal "seagull"; opportunistic harbor scavenger' }
  ];

  // ─────────────────────────────────────────────────────
  // MAINE BIRDS SPOTLIGHT — Phase 4 data
  // 25 species cards with Maine-specific status, habitat, hotspot suggestion,
  // best season, fun fact, and conservation/citizen-science context.
  // Sources: Maine Audubon, USGS Bird Banding Lab, Cornell Lab All About
  // Birds, Maine.gov state-bird trivia, Project Puffin (Audubon).
  // `speciesKey` (optional) links to a BIRDS SVG when we have one drawn.
  // ─────────────────────────────────────────────────────
  var MAINE_BIRDS = [
    // ── YEAR-ROUND RESIDENTS ──
    {
      name: 'Black-capped Chickadee', sciName: 'Poecile atricapillus', speciesKey: 'chickadee',
      mainStatus: 'year-round', iconicStatus: 'Maine state bird (since 1927)',
      habitat: 'Forests, woodland edges, backyards, almost anywhere with trees',
      bestSeason: 'Year-round; winter feeders are the easiest reliable views',
      seeWhere: 'Anywhere with trees. Backyard feeders work all winter. King Middle\'s playground edge has them.',
      funFact: 'Stores seeds in hundreds of locations and remembers them for weeks. Brain neurons regenerate seasonally to hold the spatial maps.',
      citizen: 'One of the most-reported species on Maine eBird; reliable Project FeederWatch participant.'
    },
    {
      name: 'White-breasted Nuthatch', sciName: 'Sitta carolinensis', speciesKey: 'nuthatch',
      mainStatus: 'year-round',
      habitat: 'Mature deciduous forest with oaks + hickory',
      bestSeason: 'Year-round; winter feeders + spring breeding most active',
      seeWhere: 'Any mature deciduous forest. Fields Pond Audubon Center (Holden) has reliable nuthatches.',
      funFact: 'The only North American bird that walks DOWN tree trunks headfirst — gives it access to insects woodpeckers miss.',
      citizen: 'Common at FeederWatch sites; eBird coverage strong statewide.'
    },
    {
      name: 'Pileated Woodpecker', sciName: 'Dryocopus pileatus', speciesKey: 'pileated',
      mainStatus: 'year-round',
      habitat: 'Mature forest with large dead trees (snags) for cavity excavation',
      bestSeason: 'Year-round; spring drumming + courtship most dramatic April–May',
      seeWhere: 'Baxter State Park, Acadia carriage roads, any mature mixed forest with standing dead trees.',
      funFact: 'Carves rectangular cavities in trees that other species (owls, ducks) reuse. Drumming can be heard a half-mile away.',
      citizen: 'Listed as "Common Bird in Steep Decline" by Partners in Flight (still common but trending down). Report sightings to eBird.'
    },
    {
      name: 'Bald Eagle', sciName: 'Haliaeetus leucocephalus', speciesKey: 'baldEagle',
      mainStatus: 'year-round', iconicStatus: 'Recovery success story',
      habitat: 'Lakes, rivers, coast — anywhere with fish + tall trees for nesting',
      bestSeason: 'Year-round; winter eagles concentrate at unfrozen rivers + harbors',
      seeWhere: 'Sebasticook Lake (renowned eagle hotspot), Kennebec River below dams, Penobscot Bay, Acadia.',
      funFact: 'Maine had only ~21 nesting pairs in 1972 from DDT poisoning. Today: ~700 active nests statewide. One of the great American conservation comebacks.',
      citizen: 'Maine Audubon\'s annual Eagle Survey continues; eBird tracks year-round distribution.'
    },
    {
      name: 'Cooper\'s Hawk', sciName: 'Accipiter cooperii', speciesKey: 'coopershawk',
      mainStatus: 'year-round',
      habitat: 'Forest, increasingly suburban (follows feeders that follow songbirds)',
      bestSeason: 'Year-round; fall migration concentrates them at hawkwatches',
      seeWhere: 'Anywhere with forest. Bradbury Mountain hawkwatch (spring) records fall + spring movements.',
      funFact: 'Specializes in catching other birds — that\'s why songbirds vanish from feeders when one shows up. Surveys hunting grounds at high speed through canopy.',
      citizen: 'Bradbury Mountain Hawkwatch (Pownal) tallies thousands each spring season.'
    },
    {
      name: 'Blue Jay', sciName: 'Cyanocitta cristata', speciesKey: 'bluejay',
      mainStatus: 'year-round',
      habitat: 'Backyards, oak forests, mixed woods',
      bestSeason: 'Year-round; loud and conspicuous especially fall + winter',
      seeWhere: 'Backyards, roadside oaks, any park. Ubiquitous.',
      funFact: 'Excellent mimics — perfect Red-shouldered Hawk imitations. Plant acorns by burying them, which has helped oak forests spread northward.',
      citizen: 'Reports highest concentrations at FeederWatch sites in winter.'
    },
    {
      name: 'Common Raven', sciName: 'Corvus corax', speciesKey: 'raven',
      mainStatus: 'year-round',
      habitat: 'Mountains, forests, coast — wide-ranging across most habitats',
      bestSeason: 'Year-round; winter pairs more conspicuous',
      seeWhere: 'Western Maine mountains (Baxter, Mahoosucs), Down East coast (Cutler Coast). Less common in southern/coastal lowlands.',
      funFact: 'Among the most intelligent of all birds. Recognizes individual humans, uses tools, plans. The crow you see in Maine is more likely a raven if it\'s up north.',
      citizen: 'eBird records distinguish them from American Crows; useful for tracking distribution shifts.'
    },
    {
      name: 'Herring Gull', sciName: 'Larus argentatus', speciesKey: 'herringGull',
      mainStatus: 'year-round',
      habitat: 'Coast, harbors, dumps, parking lots, anywhere food might be',
      bestSeason: 'Year-round; the default Maine coast bird',
      seeWhere: 'Any Maine harbor. Portland Head Light, Bar Harbor, Stonington.',
      funFact: 'There is no such thing as a "seagull." Herring Gull is the most common eastern North American gull. Smart enough to drop clams on rocks from height to crack them open.',
      citizen: 'Listed as a "Common Bird in Steep Decline" by Partners in Flight despite ubiquity.'
    },

    // ── BREEDERS / SUMMER ──
    {
      name: 'Common Loon', sciName: 'Gavia immer',
      mainStatus: 'breeder (spring–fall)', iconicStatus: 'Maine state quarter bird',
      habitat: 'Large clear lakes (summer); coastal saltwater (winter)',
      bestSeason: 'May–October on inland lakes; some on coast in winter',
      seeWhere: 'Sebago Lake, Moosehead Lake, Rangeley Lake, any large unpolluted lake. Hearing a loon yodel at sunset = core Maine experience.',
      funFact: 'Maine has roughly 4,000 nesting loons — among the largest populations in the lower 48. Sensitive to lead fishing tackle (a major cause of mortality). Lead alternatives matter.',
      citizen: 'Maine Audubon Annual Loon Count (one Saturday each July) involves hundreds of citizen scientists statewide.'
    },
    {
      name: 'Atlantic Puffin', sciName: 'Fratercula arctica', speciesKey: 'puffin',
      mainStatus: 'breeder (offshore islands)', iconicStatus: 'Project Puffin success story',
      habitat: 'Open ocean (winter); offshore island colonies (summer)',
      bestSeason: 'June–August on offshore islands; rarely seen from shore',
      seeWhere: 'Eastern Egg Rock (boat tours from New Harbor), Petit Manan (refuge), Matinicus Rock, Seal Island. Project Puffin Visitor Center in Rockland.',
      funFact: 'Project Puffin (Audubon, 1973) used decoys + recordings to lure puffins back to nest on Eastern Egg Rock after they\'d been hunted to local extinction. They came back. Today: ~1,300 pairs across Maine islands.',
      citizen: 'Audubon Seabird Restoration Program continues; observation counts contribute to long-term tracking.'
    },
    {
      name: 'Red-eyed Vireo', sciName: 'Vireo olivaceus', speciesKey: 'vireo',
      mainStatus: 'breeder (May–September)',
      habitat: 'Deciduous forest canopy',
      bestSeason: 'May–August; persistent singer through summer heat',
      seeWhere: 'Any deciduous forest. Wells Reserve, Acadia, Baxter. Hear them anywhere there are big trees.',
      funFact: 'One of the most persistent singers in eastern forests — a single male was recorded singing 22,197 songs in a single day.',
      citizen: 'eBird coverage strong; common during Breeding Bird Survey routes.'
    },
    {
      name: 'Wood Thrush', sciName: 'Hylocichla mustelina',
      mainStatus: 'breeder (May–September)', iconicStatus: 'Steep-decline species — Rosenberg study',
      habitat: 'Mature deciduous + mixed forest with dense understory',
      bestSeason: 'May–July; flute-like song dawn + dusk',
      seeWhere: 'Wells Reserve, Kennebec Valley forests, Vaughan Woods (S. Berwick).',
      funFact: 'Considered to have one of the most beautiful songs of any North American bird — twin "fee-bee-oh" with pure-tone whistles. **Population down 50%+ since 1970** (Rosenberg 2019). Forest fragmentation + tropical wintering-ground loss.',
      citizen: 'Featured in the "3 billion birds lost" study. eBird + Breeding Bird Survey are the primary tracking tools.'
    },
    {
      name: 'Black-throated Green Warbler', sciName: 'Setophaga virens',
      mainStatus: 'breeder (May–August)',
      habitat: 'Coniferous + mixed forest, especially hemlock + spruce',
      bestSeason: 'May–July; high-pitched buzzy "zoo-zee, zoo-zoo-zee" song',
      seeWhere: 'Acadia\'s carriage roads, Baxter, hemlock-rich state forests.',
      funFact: 'One of the most common breeding warblers in Maine\'s coniferous forests. Migrates to Central America + Caribbean for winter.',
      citizen: 'Heard during Breeding Bird Survey routes; eBird strong coverage.'
    },
    {
      name: 'Common Yellowthroat', sciName: 'Geothlypis trichas',
      mainStatus: 'breeder (May–September)',
      habitat: 'Marshes, brushy wetland edges, cattail stands',
      bestSeason: 'May–August; "witchity-witchity" song from cattails',
      seeWhere: 'Scarborough Marsh, any cattail marsh statewide.',
      funFact: 'Males have black masks (the namesake). Despite being a "warbler" they often skulk in low cover and are heard more than seen.',
      citizen: 'Common at marsh-focused eBird hotspots; declining slightly per BBS.'
    },
    {
      name: 'Belted Kingfisher', sciName: 'Megaceryle alcyon', speciesKey: 'kingfisher',
      mainStatus: 'breeder (mostly spring–fall); some on coast year-round',
      habitat: 'Streams, rivers, ponds, coastal estuaries',
      bestSeason: 'April–October on streams; year-round on ice-free coast',
      seeWhere: 'Any flowing water. Royal River, Stroudwater River, Casco Bay coves.',
      funFact: 'Females are MORE colorful than males (rust belt) — unusual among birds. Hovers over water before plunge-diving headfirst.',
      citizen: 'eBird tracks distribution; useful for water-quality indicator (need fish populations).'
    },
    {
      name: 'Eastern Towhee', sciName: 'Pipilo erythrophthalmus', speciesKey: 'towhee',
      mainStatus: 'breeder (May–September)',
      habitat: 'Brushy edges, dense undergrowth, regenerating clearcuts',
      bestSeason: 'May–August; "drink-your-tea" song from cover',
      seeWhere: 'Scarborough Marsh edges, Kennebunk Plains, Wells Reserve scrub habitat.',
      funFact: 'Forages by "double-scratching" — a quick backward hop with both feet that uncovers seeds. Listen for the rustle.',
      citizen: 'Indicator of early-successional shrubland habitat — declining as Maine forests mature.'
    },

    // ── WINTER VISITORS / IRRUPTIVE ──
    {
      name: 'Snowy Owl', sciName: 'Bubo scandiacus',
      mainStatus: 'winter / irruptive', iconicStatus: 'Arctic visitor',
      habitat: 'Open coastal areas — beaches, marshes, airports, fields',
      bestSeason: 'December–March; irruption years bring more (every ~4 years)',
      seeWhere: 'Biddeford Pool, Reid State Park, Popham Beach, Sandy Point, Portland International Jetport perimeter.',
      funFact: 'Coastal Maine is roughly the southernmost regular wintering range. Irruption years (when lemming populations crash up north) push more south. 2013–14 was a famous mass irruption.',
      citizen: 'Project SNOWstorm tracks individuals via solar GPS — Maine Audubon participates.'
    },
    {
      name: 'White-throated Sparrow', sciName: 'Zonotrichia albicollis',
      mainStatus: 'winter (statewide); also breeder in northern Maine',
      habitat: 'Brushy edges, coniferous forest, backyard feeders in winter',
      bestSeason: 'October–April at feeders; June–August in northern Maine forests',
      seeWhere: 'Any backyard feeder in winter. Northern forests (Baxter, Allagash) for breeding song.',
      funFact: 'The "Old Sam Peabody-Peabody-Peabody" whistled song is the soundtrack of northern Maine summers.',
      citizen: 'Common FeederWatch participant in winter; recorded constantly during Breeding Bird Survey in north Maine.'
    },
    {
      name: 'Dark-eyed Junco', sciName: 'Junco hyemalis', speciesKey: 'junco',
      mainStatus: 'winter (statewide); breeder in mountain conifer forests',
      habitat: 'Mountain conifers (summer); backyards + brushy edges (winter)',
      bestSeason: 'October–April at feeders; year-round in mountain forests',
      seeWhere: 'Any backyard feeder once snow flies. Mountain trails (Acadia, Baxter, Mahoosucs) in summer.',
      funFact: 'Called "snowbirds" — they appear as winter starts. White outer tail feathers flash when they fly, like flicking on a turn signal.',
      citizen: 'Top FeederWatch species; reliable winter eBird reports.'
    },
    {
      name: 'Common Eider', sciName: 'Somateria mollissima', speciesKey: 'eider',
      mainStatus: 'year-round on coast (most visible in winter)',
      habitat: 'Coastal saltwater, rocky shores; rafts of dozens common',
      bestSeason: 'November–March in conspicuous rafts; year-round',
      seeWhere: 'Any rocky coast. Schoodic Point, Bar Harbor, Pemaquid Point, Reid State Park.',
      funFact: 'Eider down (under-feathers from female nests) is the warmest natural insulator known. Females pluck their own breast feathers; humans gather them after ducklings leave.',
      citizen: 'Christmas Bird Count (CBC) tallies thousands along Maine coast.'
    },

    // ── PASSAGE MIGRANTS ──
    {
      name: 'Yellow-rumped Warbler', sciName: 'Setophaga coronata',
      mainStatus: 'spring + fall migrant; some breed in northern Maine',
      habitat: 'Coniferous forest (breeding); any wooded area (migration)',
      bestSeason: 'April–May (spring); September–October (fall) — huge waves',
      seeWhere: 'Migration peaks: Monhegan Island, Acadia, Wells Reserve.',
      funFact: 'The most common warbler in eastern North American migration — and the only warbler that can digest bayberries, allowing some to overwinter here.',
      citizen: 'Migration tracking via eBird + Cornell\'s BirdCast radar forecast tool.'
    },
    {
      name: 'Northern Saw-whet Owl', sciName: 'Aegolius acadicus',
      mainStatus: 'fall migrant + winter resident',
      habitat: 'Coniferous forest; migrates along coast in October',
      bestSeason: 'October–November migration; rare day views',
      seeWhere: 'Petit Manan banding station (fall) + Project Owlnet sites Down East. Hard to see without a permitted bander.',
      funFact: 'Smaller than a soda can. North America\'s most common owl in some areas. Migrates secretively at night; banders catch them in mist nets in October.',
      citizen: 'Project Owlnet (saw-whet banding) at multiple Maine sites; volunteer assistance available some seasons.'
    },
    {
      name: 'Red-tailed Hawk', sciName: 'Buteo jamaicensis',
      mainStatus: 'year-round; fall migrants concentrate at hawkwatches',
      habitat: 'Open + edge habitats; perches on roadside trees, telephone poles',
      bestSeason: 'Year-round; September migration spectacular at ridge hawkwatches',
      seeWhere: 'Bradbury Mountain (Pownal), Mount Agamenticus (York), any I-95 / I-295 roadside.',
      funFact: 'The "kee-eer!" you hear in movies as "the eagle scream"? That\'s actually a Red-tailed Hawk dubbed in over Bald Eagle footage.',
      citizen: 'Bradbury Mountain Hawkwatch records 4,000+ raptors each fall season.'
    },

    // ── COMMONERS WORTH NAMING ──
    {
      name: 'American Robin', sciName: 'Turdus migratorius', speciesKey: 'robin',
      mainStatus: 'year-round (huge spring arrival)',
      habitat: 'Lawns, gardens, forest edges, almost everywhere',
      bestSeason: 'Year-round; spring arrival highly visible',
      seeWhere: 'Any lawn. Backyards, parks, school playgrounds.',
      funFact: 'Their orange breast color comes from carotenoid pigments in berries — depth of color signals foraging skill. Females actually prefer redder males.',
      citizen: 'Among the most-reported species globally on eBird.'
    },
    {
      name: 'Mourning Dove', sciName: 'Zenaida macroura',
      mainStatus: 'year-round',
      habitat: 'Suburbs, fields, forest edges',
      bestSeason: 'Year-round; cooing dawn + dusk most noticeable',
      seeWhere: 'Backyards, sidewalks, telephone wires statewide.',
      funFact: 'Often misidentified as an owl because of the soft "hoo" cooing. Owls hoot at night; doves call in daylight.',
      citizen: 'Among the most-reported FeederWatch species.'
    }
  ];

  // Maine Birding Trail / Audubon hotspots — places students could plausibly visit.
  var MAINE_BIRDING_HOTSPOTS = [
    { name: 'Scarborough Marsh', area: 'Scarborough', highlight: 'Largest salt marsh in Maine (~3,000 acres). Maine Audubon\'s Scarborough Marsh Audubon Center has rentals + programs. Premier marsh-bird location.' },
    { name: 'Eastern Egg Rock', area: 'Boat from New Harbor', highlight: 'Project Puffin restoration site. June–August boat tours. Atlantic Puffin, Common + Roseate + Arctic Terns, Razorbill.' },
    { name: 'Acadia National Park', area: 'Bar Harbor / MDI', highlight: 'Migration corridor + alpine + coast in one park. Carriage roads excellent for songbirds; Cadillac Mountain for raptors.' },
    { name: 'Monhegan Island', area: 'Boat from Port Clyde', highlight: 'Fall migration trap — anything could land here. Famous "fallouts" after weather fronts.' },
    { name: 'Bradbury Mountain Hawkwatch', area: 'Pownal', highlight: 'Spring + fall hawkwatch. Counts thousands of raptors each season. Open to public, volunteer counters.' },
    { name: 'Petit Manan NWR', area: 'Steuben (Down East)', highlight: 'Coastal seabirds + migrants. Saw-whet Owl banding station in fall.' },
    { name: 'Sebasticook Lake', area: 'Newport', highlight: 'Bald Eagle hotspot — open water in winter concentrates dozens. Also waterfowl + spring migrants.' },
    { name: 'Baxter State Park', area: 'Millinocket', highlight: 'Boreal species (Spruce Grouse, Gray Jay, Boreal Chickadee, Black-backed Woodpecker). Maine\'s wild interior.' },
    { name: 'Moosehorn NWR', area: 'Baring (near Calais)', highlight: 'American Woodcock displays in spring. Also warblers + waterfowl.' },
    { name: 'Wells Reserve at Laudholm', area: 'Wells', highlight: 'Estuary + forest + field — mosaic of habitats. Excellent for new birders.' },
    { name: 'Project Puffin Visitor Center', area: 'Rockland', highlight: 'Educational center for the Audubon Seabird Restoration Program. Live puffin cams.' },
    { name: 'Capisic Pond Park', area: 'Portland', highlight: 'Urban birding for Portland-area students. Waterfowl, marsh birds, songbirds in season.' }
  ];

  // ─────────────────────────────────────────────────────
  // MIGRATION DATA — Phase 4 Migration Patterns
  // ─────────────────────────────────────────────────────
  var FLYWAYS = [
    { id: 'pacific',    label: 'Pacific Flyway',    desc: 'Alaska / Canadian Pacific → western US → Mexico / Central America. Most western species.', maineRole: 'Doesn\'t reach Maine; westernmost flyway.' },
    { id: 'central',    label: 'Central Flyway',    desc: 'Canadian prairies → Great Plains → Texas Gulf Coast → Mexico. Major waterfowl + cranes.', maineRole: 'Doesn\'t reach Maine; central US route.' },
    { id: 'mississippi', label: 'Mississippi Flyway', desc: 'Canadian Boreal Forest → Mississippi River corridor → Gulf Coast. Heavy waterfowl + warblers.', maineRole: 'Some overlap in northern Maine breeders that funnel west.' },
    { id: 'atlantic',   label: 'Atlantic Flyway',   desc: 'Canadian Maritimes + Boreal → US Atlantic Coast → Caribbean / South America. THE Maine flyway.', maineRole: 'Maine sits squarely on this flyway. Most Maine migrants follow the coast or interior parallel paths.' }
  ];

  // Spring + fall calendar of Maine arrivals/departures (typical, varies by latitude).
  var MAINE_MIGRATION_CALENDAR = [
    { season: 'Spring', month: 'March',     arrivals: 'Red-winged Blackbird (early), American Woodcock displays start, Common Grackle, large robin push',          departures: 'Most snowy owls return north (irruption years).' },
    { season: 'Spring', month: 'April',     arrivals: 'Eastern Phoebe, Tree Swallow, Yellow-rumped Warbler, Hermit Thrush, Loons return to lakes after ice-out',  departures: 'Last waterfowl that wintered move further north.' },
    { season: 'Spring', month: 'May',       arrivals: 'PEAK — most warblers (30+ species), Bobolinks, Baltimore Orioles, Scarlet Tanagers, Ruby-throated Hummingbird, Common Loon arrivals continue', departures: '' },
    { season: 'Summer', month: 'June–July', arrivals: 'Breeding settled. Atlantic Puffin chicks hatch on offshore islands.', departures: '' },
    { season: 'Fall',   month: 'August',    arrivals: 'Shorebird southbound migration peaks at Scarborough Marsh (sandpipers, plovers).', departures: 'Some adult warblers begin southbound; Common Tern colonies dispersing.' },
    { season: 'Fall',   month: 'September', arrivals: 'Hawk migration begins (Bradbury Mountain). Late warblers. Sparrow waves.', departures: 'Most Atlantic Puffins leave colonies; warblers depart en masse.' },
    { season: 'Fall',   month: 'October',   arrivals: 'PEAK raptor migration. Saw-whet owls move along coast at night. Snow Geese pass through.', departures: 'Last warblers (Yellow-rumped lingers); Common Loons start moving to coast.' },
    { season: 'Fall',   month: 'November',  arrivals: 'Snowy Owls arrive in irruption years; sea ducks (Common Eider, scoters) concentrate on coast.', departures: 'Most insectivores gone.' },
    { season: 'Winter', month: 'Dec–Feb',   arrivals: 'Winter visitors only (Snow Bunting, Common Redpoll in irruption years, Snowy Owls in lucky years).', departures: 'Stable population; winter survivors only.' }
  ];

  var FEATURED_MIGRATORS = [
    {
      species: 'Atlantic Puffin', distance: '~200 mi (coastal pelagic)',
      strategy: 'Short pelagic — leaves Maine offshore islands by August, winters at sea on the continental shelf, returns to same nest burrow in May. Stays in North Atlantic.',
      maineNote: 'Puffins are SHORT-distance migrants compared to warblers. They never leave the North Atlantic.'
    },
    {
      species: 'Black-throated Green Warbler', distance: '2,000–4,000 mi',
      strategy: 'Long-distance neotropical — leaves Maine by early September, flies to Central America + Caribbean. Some populations winter in Mexico, others in Costa Rica.',
      maineNote: 'A 4-gram bird crossing the Gulf of Mexico in a single overnight flight. Hard to fathom physiologically.'
    },
    {
      species: 'Common Loon', distance: '~150 mi (typical)',
      strategy: 'Medium-distance — moves from Maine lakes to Maine coastal saltwater for winter. Some go further south but most stay in the Gulf of Maine.',
      maineNote: 'You can sometimes see Maine\'s breeding loons in plumage transition on coast in October–November.'
    },
    {
      species: 'Red-winged Blackbird', distance: '500–1,500 mi',
      strategy: 'Short to medium — winters in southeastern US. Among the FIRST migrants to return to Maine in late February / early March.',
      maineNote: 'Their "konk-la-REE" from a cattail in March is officially-spring-has-arrived for many Mainers.'
    },
    {
      species: 'American Woodcock', distance: '500–1,500 mi',
      strategy: 'Short-distance — winters in southeastern US, flies overnight back to Maine in late March / early April. Famous "sky dance" courtship displays at dusk.',
      maineNote: 'Moosehorn NWR + many Maine fields host classic woodcock displays. April–May at dusk is the magic window.'
    },
    {
      species: 'Bald Eagle', distance: 'Most are SEDENTARY in Maine',
      strategy: 'Maine eagles mostly stay in Maine year-round. Winter eagles concentrate where water stays open (rivers below dams).',
      maineNote: 'You\'re likely to see the SAME eagle in summer and winter at Sebasticook Lake or the Penobscot River.'
    },
    {
      species: 'Snowy Owl', distance: '2,000+ mi (irruption years)',
      strategy: 'Irruptive — Arctic breeder. Most years stays north; in years of lemming-population crashes, large numbers move south. 2013–14 was the famous "mega-irruption."',
      maineNote: 'Coastal Maine is roughly the southernmost regular wintering range. Irruption-year sightings spike at Biddeford Pool, Reid State Park.'
    },
    {
      species: 'Most warblers', distance: '2,000–6,000 mi',
      strategy: 'Long-distance neotropical — most spend more time on wintering grounds than breeding grounds. Some (Blackpoll Warbler) make a single non-stop trans-Atlantic flight from New England to South America.',
      maineNote: 'Acadia + Monhegan in May = peak warbler migration spectacle. Bring binoculars and a sore neck.'
    }
  ];

  // ─────────────────────────────────────────────────────
  // CITIZEN SCIENCE PROGRAMS — Phase 5 data
  // 9 real programs students can join. Cornell Lab anchors the modern
  // citizen-science bird ecosystem (eBird, Merlin, FeederWatch, NestWatch,
  // BirdCast). Audubon runs the longest-running one (Christmas Bird Count,
  // est. 1900). Maine-specific programs noted where they exist.
  // ─────────────────────────────────────────────────────
  var CITIZEN_SCIENCE_PROGRAMS = [
    {
      id: 'ebird',
      name: 'eBird',
      org: 'Cornell Lab of Ornithology',
      site: 'ebird.org',
      cost: 'Free',
      cadence: 'Year-round, any time you go outside',
      what: 'Submit checklists of every bird you see + hear during a birding outing. Logs species, count, location, time, weather. Used in 100+ peer-reviewed papers per year.',
      howToJoin: 'Create a free account at ebird.org. Use the eBird mobile app (iOS / Android) to submit checklists in the field — it handles location automatically.',
      maineRelevance: 'Maine has thousands of eBird hotspots with detailed recent-sighting reports. The Maine Bird Records Committee uses eBird data to track rare species reports.',
      impact: 'Powers Cornell\'s Status & Trends abundance maps used for habitat conservation, climate research, and federal wildlife management.'
    },
    {
      id: 'merlin',
      name: 'Merlin Bird ID',
      org: 'Cornell Lab of Ornithology',
      site: 'merlin.allaboutbirds.org',
      cost: 'Free (no ads)',
      cadence: 'Real-time identification any time',
      what: 'AI-powered bird identification by sound, photo, or step-by-step questions. Sound ID listens through your phone and identifies species in real time as they sing.',
      howToJoin: 'Download the free Merlin Bird ID app (iOS / Android). Download the regional bird pack for your area (Maine = "US: Northeast"). Open Sound ID and start listening.',
      maineRelevance: 'Works perfectly in Maine — covers all common species + most rarities. The single best tool for a beginning birder.',
      impact: 'Anonymized identification data feeds Cornell research on detection accuracy and bird distribution. Used in 2024+ as a teaching aid in classrooms across Maine.'
    },
    {
      id: 'feederwatch',
      name: 'Project FeederWatch',
      org: 'Cornell Lab + Birds Canada',
      site: 'feederwatch.org',
      cost: 'Annual fee (~$18); waivers available for students',
      cadence: 'November–April, count 2 days per week',
      what: 'Count birds visiting your feeder (or any selected count site). Submit weekly checklists. 30+ years of continuous data tracks winter bird populations across North America.',
      howToJoin: 'Sign up at feederwatch.org. They mail a kit with poster, instructions, calendar. Pick 2 count days per week and stick with them.',
      maineRelevance: 'Hundreds of Maine households participate. The data documented the southern expansion of Northern Cardinals + decline of Evening Grosbeaks.',
      impact: 'Documented major range shifts (e.g., cardinals moving north). Identified "irruptive" winter visitor patterns. Frequently cited in winter-bird research.'
    },
    {
      id: 'cbc',
      name: 'Christmas Bird Count (CBC)',
      org: 'National Audubon Society',
      site: 'audubon.org/conservation/science/christmas-bird-count',
      cost: 'Free',
      cadence: 'December 14 to January 5, annually (one count day per circle)',
      what: 'Count every bird in a 15-mile-diameter circle on a single day. Started in 1900 — the world\'s longest-running citizen science project. ~2,500 circles each year.',
      howToJoin: 'Find your local CBC circle on the Audubon site. Most welcome new participants — they\'ll pair you with experienced birders in your area.',
      maineRelevance: 'Maine has ~25 CBC circles: Portland, Bangor, Belfast, Schoodic Point, Acadia, and more. December participation is a Maine birding tradition.',
      impact: '120+ years of continuous data on winter bird populations. Documented the recovery of Bald Eagles, the decline of grassland sparrows, and climate-driven range shifts.'
    },
    {
      id: 'gbbc',
      name: 'Great Backyard Bird Count (GBBC)',
      org: 'Cornell Lab + Audubon + Birds Canada',
      site: 'birdcount.org',
      cost: 'Free',
      cadence: '4 days every February (Friday–Monday)',
      what: 'Count birds anywhere — backyard, park, schoolyard — for as little as 15 minutes during the 4-day window. Global event.',
      howToJoin: 'Sign up at birdcount.org. Use Merlin or eBird app to submit. You can participate from anywhere in the world.',
      maineRelevance: 'Easy entry point for first-time citizen scientists. Many Maine schools run school-wide GBBC events.',
      impact: 'Snapshot of February bird distribution worldwide. ~300,000 participants annually generate millions of observations.'
    },
    {
      id: 'nestwatch',
      name: 'NestWatch',
      org: 'Cornell Lab of Ornithology',
      site: 'nestwatch.org',
      cost: 'Free',
      cadence: 'Spring–summer, when you find a nest',
      what: 'Track nesting attempts: when eggs are laid, hatch dates, how many young fledge or fail. Documents reproductive success across species.',
      howToJoin: 'Take the free online NestWatch certification course (~30 min). Follow nest-monitoring protocol so you don\'t disturb nesting birds. Submit data online.',
      maineRelevance: 'Bluebird trail networks + Maine Audubon nest box programs feed NestWatch directly.',
      impact: 'Documents climate-driven shifts in laying dates. Tracks nest predation rates across landscape types.'
    },
    {
      id: 'birdcast',
      name: 'BirdCast',
      org: 'Cornell Lab of Ornithology',
      site: 'birdcast.info',
      cost: 'Free',
      cadence: 'Real-time during spring + fall migration',
      what: 'Uses national weather radar to detect + forecast nightly bird migration. Predicts migration intensity 3 days out. You watch — don\'t submit data.',
      howToJoin: 'Visit birdcast.info during spring (April–May) or fall (Aug–Oct) migration. Check the local migration map for your area before going outside.',
      maineRelevance: 'Maine\'s Atlantic Flyway position means BirdCast forecasts predict our fallout days reliably. Time your Acadia / Monhegan trips to high-migration nights.',
      impact: 'Lights Out campaigns use BirdCast forecasts to dim city lights on heavy migration nights, reducing window strikes.'
    },
    {
      id: 'inaturalist',
      name: 'iNaturalist',
      org: 'California Academy of Sciences + National Geographic',
      site: 'inaturalist.org',
      cost: 'Free',
      cadence: 'Year-round',
      what: 'Broader naturalist platform for any species — birds, plants, fungi, insects, anything. Photo-based, with AI assistance from "Seek" identification model.',
      howToJoin: 'Free app (Seek for ID; iNaturalist for full submission). Snap a photo, get an AI suggestion, confirm.',
      maineRelevance: 'Maine has active iNaturalist projects: Maine BioBlitz, Acadia Bioblitz events.',
      impact: 'Verified observations become research-grade data accessible to scientists worldwide. Documents non-bird taxa that are harder to track elsewhere.'
    },
    {
      id: 'maineaudubon',
      name: 'Maine Audubon programs',
      org: 'Maine Audubon Society',
      site: 'maineaudubon.org',
      cost: 'Most free; some programs charge nominal fees',
      cadence: 'Year-round events; specific projects seasonal',
      what: 'Maine\'s flagship bird conservation org runs the Annual Loon Count, hawkwatches, monitoring programs, school visits, and the Maine Birding Trail.',
      howToJoin: 'Visit maineaudubon.org/get-involved. Sign up for newsletters, attend chapters\' walks, volunteer for the Loon Count (one Saturday in July statewide).',
      maineRelevance: 'Maine-specific. Coordinates statewide bird data. Best entry point for plugging into the Maine birding community.',
      impact: 'Loon Count documented the recovery of Maine\'s breeding loon population. Hawkwatch records inform federal raptor migration policy.'
    }
  ];

  // ─────────────────────────────────────────────────────
  // CONSERVATION & CAREERS — Phase 5 data
  // Conservation: Rosenberg 2019 "3 billion birds" overview, plus 4 focal
  // species (decline + recovery) + climate-change context.
  // Careers: 9 ornithology / bird-related career pathways with honest pay.
  // ─────────────────────────────────────────────────────
  var CONSERVATION_FOCAL = [
    {
      species: 'Piping Plover', sciName: 'Charadrius melodus',
      status: 'Federal threatened (Atlantic Coast); Maine endangered',
      story: 'Beach-nesting shorebird. Maine has ~80-100 pairs along southern + midcoast beaches. Recovery from <50 pairs in the 1980s through symbolic-fenced nesting areas, dog-leash enforcement, and predator management. Climate-driven sea-level rise + storm surge are the next threat.',
      maineConnection: 'Crescent Beach State Park, Goose Rocks Beach, Popham Beach all host nesting plovers. Maine Audubon coordinates volunteer "plover wardens" who help educate beachgoers.',
      whatYouCanDo: 'Stay on marked trails on plover beaches April–August. Keep dogs leashed. Avoid beach driving in nesting areas. Report disturbances to Maine IFW.'
    },
    {
      species: 'Wood Thrush', sciName: 'Hylocichla mustelina',
      status: 'Common species in steep decline (Partners in Flight Tier 1)',
      story: 'Population down 50%+ since 1970 (Rosenberg 2019). Forest fragmentation in breeding range + tropical wintering-ground deforestation in Central America. The threats are HALF in Maine, HALF outside the country.',
      maineConnection: 'Still common in Maine\'s mature forests, but Breeding Bird Survey trends show steady decline. Future generations may not hear that ethereal "ee-oh-lay" song.',
      whatYouCanDo: 'Support shade-grown coffee (preserves wintering habitat). Keep cats indoors. Reduce window strikes (~1 billion bird deaths/year in US, mostly on residential windows).'
    },
    {
      species: 'Bald Eagle', sciName: 'Haliaeetus leucocephalus',
      status: 'RECOVERED — delisted from federal endangered species 2007',
      story: 'Devastated by DDT pesticide thinning eggshells (1950s-1970s). Maine had ~21 nesting pairs in 1972. EPA banned DDT in 1972. Combined with breeding-pair monitoring + nest protection + lake-front habitat protection, populations rebounded across decades.',
      maineConnection: 'Today: ~700 active nests in Maine. Sebasticook Lake winter eagles concentrate at unfrozen river sections. Real Maine conservation success story.',
      whatYouCanDo: 'Lead-tackle alternatives for fishing (lead poisoning is a leading cause of eagle mortality post-DDT). Support state lead-tackle ban legislation.'
    },
    {
      species: 'Atlantic Puffin', sciName: 'Fratercula arctica',
      status: 'Federally protected; Maine population RECOVERED via active restoration',
      story: 'Hunted to local extinction in Maine by ~1900 (eaten + feathers harvested for hats). 1973: Audubon\'s Stephen Kress initiated Project Puffin on Eastern Egg Rock, using decoys + recorded calls + careful restocking to lure puffins back. Today: ~1,300 pairs across 5 Maine islands.',
      maineConnection: 'Maine\'s flagship seabird recovery. Eastern Egg Rock + Petit Manan + Matinicus Rock + Seal Island colonies. Boat tours from New Harbor (June–August). Project Puffin Visitor Center in Rockland.',
      whatYouCanDo: 'Visit responsibly (boat tours stay 50+ ft from breeding cliffs). Climate change is the new threat — warmer Gulf of Maine waters are pushing puffin food fish north, reducing chick survival.'
    }
  ];

  var ROSENBERG_2019 = {
    citation: 'Rosenberg et al. (2019), "Decline of the North American avifauna," Science vol. 366',
    headline: 'North America has lost ~3 BILLION breeding birds since 1970 — a 29% net decline.',
    methodology: 'Combined data from Breeding Bird Survey, Christmas Bird Count, eBird, and weather-radar migration estimates. Compared 1970 baseline populations to 2017.',
    findings: [
      'Grassland birds: 53% decline (~720 million birds lost) — top decliner',
      'Boreal forest specialists: 33% decline',
      'Eastern forest birds: ~17% decline',
      'Shorebirds: 37% decline',
      'BUT: Raptors UP 200%+ (post-DDT recovery), Waterfowl UP 56% (Duck Stamp habitat funding)'
    ],
    takeaway: 'The losses are NOT evenly distributed. Where conservation investment + habitat protection happened (raptors, waterfowl), populations rebounded. Where it didn\'t (grasslands, shorebirds), losses accelerated. This is a roadmap for what works.'
  };

  var CAREERS_BIRD = [
    {
      role: 'Field Ornithologist (Wildlife Biologist)',
      degree: 'BS Wildlife Biology / Conservation Biology; MS for advancement',
      pathway: 'BS → field tech → MS → senior field biologist',
      payRange: '$35-55K entry; $60-90K experienced',
      who: 'Maine Inland Fisheries & Wildlife (IFW), USFWS Refuges, state Natural Heritage programs, NGOs',
      maineProgram: 'UMaine Wildlife, Fisheries, and Conservation Biology (Orono); Unity College Wildlife Biology',
      reality: 'Lots of seasonal/temporary work early. Most jobs require living in remote areas at some point. Passion field; pay is modest until you reach senior levels.'
    },
    {
      role: 'Research Ornithologist (PhD track)',
      degree: 'PhD in Ornithology, Ecology, or Evolutionary Biology',
      pathway: 'BS → research assistant → PhD → postdoc → tenure-track faculty OR research-org permanent staff',
      payRange: 'Grad: $25-35K stipend; Postdoc: $50-65K; Faculty/senior: $70-130K+',
      who: 'Cornell Lab, university research labs, National Audubon Society research, Smithsonian',
      maineProgram: 'UMaine Ecology + Environmental Sciences PhD program. Many Maine grads go to Cornell.',
      reality: '~7-10 years of school past high school. Funding tight. Few permanent positions. Passion-driven.'
    },
    {
      role: 'Bird Bander',
      degree: 'BS in biology helpful; USGS Bird Banding Lab certification required (multi-year apprentice path)',
      pathway: 'Volunteer at banding station → assistant bander → master bander permit → run station',
      payRange: 'Often volunteer; paid positions $30-50K (banding station coordinator)',
      who: 'USGS Bird Banding Lab, university stations, Audubon stations, MAPS network',
      maineProgram: 'Petit Manan banding station (fall saw-whet owls); Project Owlnet sites Down East. Volunteers welcome.',
      reality: 'The most direct hands-on path. You hold the birds. Multi-year permit process (federal license).'
    },
    {
      role: 'Conservation Policy Advocate',
      degree: 'BS biology + MA/MS policy OR JD environmental law',
      pathway: 'BS → environmental nonprofit entry → grad school → policy specialist',
      payRange: '$40-60K entry; $70-110K mid-career',
      who: 'National Audubon, American Bird Conservancy, NRDC, state Audubon chapters, Maine Audubon',
      maineProgram: 'UMaine Maine Studies + Environmental Policy concentration; Maine Law (Portland) for the legal track',
      reality: 'Hybrid science + advocacy. Less field time; more reports + meetings + lobbying. High impact when you find the right org.'
    },
    {
      role: 'Wildlife Rehabilitator',
      degree: 'Maine Wildlife Rehabilitator Permit (Maine IFW); biology BS helpful',
      pathway: 'Volunteer → assistant → permitted rehabilitator → manage facility',
      payRange: 'Volunteer or low pay; nonprofit-driven; $25-45K typical',
      who: 'Avian Haven (Freedom, Maine — biggest Maine bird rehabber), Center for Wildlife (Cape Neddick), private licensed rehabbers',
      maineProgram: 'No specific degree program; Maine IFW runs the permitting process. Apprenticeship-based.',
      reality: 'Heart-and-hands work. You will see deaths. Funding mostly donations. Rewarding but emotionally hard.'
    },
    {
      role: 'Nature Educator',
      degree: 'BS biology + teaching credential OR informal education path',
      pathway: 'BS → naturalist intern → educator → senior educator',
      payRange: '$30-50K typical; nature-center directors $50-80K',
      who: 'Maine Audubon educators, nature centers (Gilsland Farm, Scarborough Marsh), school districts, Acadia NPS interp staff',
      maineProgram: 'College of the Atlantic (Bar Harbor) Human Ecology — strong field-natural-history training',
      reality: 'Often part-time or seasonal. Passion field. Direct connection with students of all ages. Good entry path for science communicators.'
    },
    {
      role: 'Maine Registered Guide (Bird-focused)',
      degree: 'Maine Guide license (state exam); biology background helpful',
      pathway: 'Take Maine Guide exam → assistant guide → independent guide → tour business owner',
      payRange: 'Variable; tour days $300-600 per group; full-time $35-70K',
      who: 'Self-employed; Maine outfitters; Audubon-affiliated tours',
      maineProgram: 'Maine Guides Association — exam prep + apprenticeship resources',
      reality: 'Seasonal (peak May–October). Build a client base. People skills matter as much as bird knowledge.'
    },
    {
      role: 'Citizen Science Coordinator',
      degree: 'BS biology + project management skills',
      pathway: 'Volunteer → project assistant → coordinator → director',
      payRange: '$45-70K typical',
      who: 'Cornell Lab eBird team, NestWatch, Audubon Christmas Bird Count, Maine Audubon Loon Count',
      maineProgram: 'Maine Audubon hires periodically; UMaine Sustainability Solutions Initiative trains relevant skills',
      reality: 'Hybrid science + community organizing + tech. Growing field as citizen science scales up.'
    },
    {
      role: 'Bird Photography / Illustration',
      degree: 'No degree required — portfolio + persistence + relationships',
      pathway: 'Hobby → social media presence → published work → magazine assignments → books',
      payRange: 'Wide range; freelancers $20-80K; top photographers $100K+',
      who: 'Self-employed; agencies (Cornell Lab licenses photos for Bird Academy)',
      maineProgram: 'No formal program — apprenticeship to working pros; Maine Media Workshops in Rockport offers nature photography programs',
      reality: 'Hard to make a living from. Easier to combine with another bird-adjacent income (guiding, teaching, writing). David Sibley is the model.'
    }
  ];

  // ─────────────────────────────────────────────────────
  // FIELD MARKS — Black-capped Chickadee deep dive (Phase 1 working bird)
  // SVG with clickable plumage hotspots, mirroring aquarium's anatomy pattern
  // ─────────────────────────────────────────────────────
  var CHICKADEE_FIELD_MARKS = {
    species: 'chickadee',
    name: 'Black-capped Chickadee',
    // Big version of the chickadee for detailed teaching (rendered at 320×240)
    bigSvgViewBox: '0 0 320 240',
    bigSvg: function(h) {
      // Larger, more detailed version of the chickadee SVG above
      return h('g', { transform: 'translate(40, 40) scale(13)' },
        // Body (buffy white)
        h('ellipse', { cx: 12, cy: 14, rx: 9, ry: 7, fill: '#f8e8c8', stroke: '#5a4a32', strokeWidth: 0.4 }),
        // Black cap (extends down to eye line)
        h('path', { d: 'M 4 11 Q 4 5 12 5 Q 20 5 20 11 L 18 11 Q 18 7 12 7 Q 6 7 6 11 Z', fill: '#1a1a1a' }),
        // Black bib
        h('ellipse', { cx: 12, cy: 17, rx: 4, ry: 2.5, fill: '#1a1a1a' }),
        // White cheek
        h('ellipse', { cx: 12, cy: 13, rx: 6, ry: 2.2, fill: '#ffffff' }),
        // Wing (gray)
        h('ellipse', { cx: 16, cy: 14, rx: 4, ry: 5, fill: '#8a8a8a' }),
        // Wing edges (white)
        h('path', { d: 'M 14 11 L 19 11 M 14 14 L 19 14', stroke: '#ffffff', strokeWidth: 0.5 }),
        // Tail
        h('path', { d: 'M 19 14 L 25 12 L 25 16 L 19 16 Z', fill: '#5a5a5a' }),
        // Eye (dark, no ring)
        h('circle', { cx: 9, cy: 11, r: 1, fill: '#000' }),
        h('circle', { cx: 9.3, cy: 10.7, r: 0.3, fill: '#fff' }),
        // Bill (short, stout, dark)
        h('path', { d: 'M 4 12 L 1 12.5 L 4 13 Z', fill: '#222' })
      );
    },
    // Hotspots positioned over the big SVG (320×240 coords, matched to the scaled SVG above)
    hotspots: [
      { id: 'cap',     x: 110, y: 70,  r: 32, label: 'Black cap',
        what: 'A solid black "cap" extending from the bill back over the head, ending at the eye line. The "black-capped" in the name comes from this.',
        why: 'Distinguishes chickadees from titmice (which have gray crests, not black caps) and from many other small songbirds.' },
      { id: 'cheek',   x: 130, y: 120, r: 26, label: 'White cheek',
        what: 'A clean white patch from below the eye to the side of the neck.',
        why: 'A reliable field mark even at a glance. Carolina chickadees (a southern lookalike) have a slightly grayer cheek; black-cappeds have crisp white.' },
      { id: 'bib',     x: 130, y: 175, r: 24, label: 'Black bib',
        what: 'A black throat patch right under the bill. Smaller than the cap.',
        why: 'Black-capped chickadees have a "ragged" bib edge. Carolina chickadees have a crisper bib edge — the difference is subtle but real.' },
      { id: 'wing',    x: 215, y: 145, r: 32, label: 'Wing with white edges',
        what: 'Gray wing feathers with white edges visible on the folded wing — the "wing bars" of a chickadee.',
        why: 'Field mark for distinguishing from gnatcatchers and kinglets (which have differently structured wing bars).' },
      { id: 'eye',     x: 100, y: 95,  r: 14, label: 'Dark eye (no ring)',
        what: 'A small, dark, beady eye — no eye ring, no eyebrow, no contrasting markings around it.',
        why: 'Many small birds (vireos, kinglets) have eye rings or eyebrow stripes. Chickadees have neither — a "clean face."' },
      { id: 'bill',    x: 50,  y: 110, r: 16, label: 'Short, stout bill',
        what: 'Short, conical, dark — built for cracking small seeds and probing for insects.',
        why: 'Bill shape tells you about diet. Chickadee\'s short bill = mixed diet (seeds + insects + suet at feeders).' },
      { id: 'flank',   x: 165, y: 195, r: 24, label: 'Buffy flanks',
        what: 'Soft warm-buff color on the sides of the belly, between the white front and the gray wings.',
        why: 'Distinguishes black-capped chickadees from boreal chickadees (which have warmer brown caps and more reddish flanks).' },
      { id: 'tail',    x: 280, y: 145, r: 22, label: 'Long tail',
        what: 'Tail is relatively long compared to body size — about as long as the body itself.',
        why: 'Long tail helps balance during acrobatic foraging in branches. Short-tailed birds (creepers, nuthatches) live differently in trees.' }
    ]
  };

  window.StemLab.registerTool('birdLab', {
    name: 'BirdLab — I-Spy Ornithology',
    icon: '🐦',
    desc: 'Interactive bird-spotting and species ID for adolescents. Layered habitat scenes with animated birds whose movement signatures double as field marks. Pairs with Cornell Lab\'s free Merlin Bird ID app for real photos and audio. Maine-relevant without being Maine-only.',
    render: function(ctx) {
      var React = ctx.React || window.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      var d = (ctx.toolData && ctx.toolData['birdLab']) || {};
      var upd = function(key, val) { ctx.update('birdLab', key, val); };
      var addToast = ctx.addToast || function(msg) { console.log('[BirdLab]', msg); };

      var _hydratedRef = useRef(false);
      if (!_hydratedRef.current) {
        _hydratedRef.current = true;
        var savedBadges = lsGet('birdLab.badges.v1', null);
        if (savedBadges && d.blBadges === undefined) upd('blBadges', savedBadges);
      }

      var viewState = useState(d.view || 'menu');
      var view = viewState[0], setView = viewState[1];

      var BADGE_IDS = ['ispy','fieldMarks','beakFeet','calls','habitatMatch','maineBirds','migration','citizenScience','conservation','fieldObs','photoId'];
      var goto = function(v) {
        setView(v);
        upd('view', v);
        if (BADGE_IDS.indexOf(v) !== -1) {
          var prev = d.blBadges || {};
          if (!prev[v]) {
            var next = Object.assign({}, prev);
            next[v] = true;
            upd('blBadges', next);
            lsSet('birdLab.badges.v1', next);
            announce('Module explored: ' + v);
          }
        }
      };

      // ─────────────────────────────────────────────────────
      // SHARED COMPONENTS
      // ─────────────────────────────────────────────────────

      function BackBar(props) {
        return h('div', { className: 'flex items-center gap-3 bg-gradient-to-r from-emerald-700 to-sky-700 text-white p-4 shadow' },
          h('button', {
            onClick: function() { setView('menu'); upd('view', 'menu'); },
            'aria-label': 'Back to BirdLab menu',
            className: 'px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 font-bold text-sm transition-colors'
          }, '← Menu'),
          h('span', { className: 'text-3xl' }, props.icon),
          h('h1', { className: 'text-xl font-black flex-1' }, props.title)
        );
      }

      // ─────────────────────────────────────────────────────
      // EBIRD species codes (6-letter AOU codes) — used to deep-link
      // bird cards directly to the eBird species page. Codes verified
      // against ebird.org/species lookups for the 25+ Maine species.
      // ─────────────────────────────────────────────────────
      var EBIRD_CODES = {
        'Black-capped Chickadee': 'bkcchi',
        'Common Loon': 'comloo',
        'Atlantic Puffin': 'atlpuf',
        'Bald Eagle': 'baleag',
        'Pileated Woodpecker': 'pilwoo',
        'Wild Turkey': 'wiltur',
        'Ruffed Grouse': 'rufgro',
        'Snowy Owl': 'snoowl',
        'Barred Owl': 'brdowl',
        'Osprey': 'osprey',
        'Northern Cardinal': 'norcar',
        'American Goldfinch': 'amegfi',
        'American Robin': 'amerob',
        'Northern Flicker': 'norfli',
        'Belted Kingfisher': 'belkin1',
        'Great Blue Heron': 'grbher3',
        'Common Eider': 'comeid',
        'Wood Duck': 'wooduc',
        'Yellow Warbler': 'yelwar',
        'Common Yellowthroat': 'comyel',
        'Piping Plover': 'pipplo',
        'Wood Thrush': 'woothr',
        'Roseate Tern': 'rosten',
        'Saw-whet Owl': 'nswowl',
        'Scarlet Tanager': 'scatan',
        'Black-throated Blue Warbler': 'btbwar',
        'Cedar Waxwing': 'cedwax',
        'Eastern Bluebird': 'easblu',
        'Tufted Titmouse': 'tuftit',
        'White-breasted Nuthatch': 'whbnut',
        'Red-tailed Hawk': 'rethaw',
        'Mourning Dove': 'moudov',
        'Blue Jay': 'blujay'
      };
      // Build deep-link URLs for any bird, given a name + optional sciName.
      // Returns object with ebird, allAboutBirds, audubon, wikipedia, inat URLs.
      function birdLinks(name, sciName) {
        var nm = String(name || '').trim();
        var sci = String(sciName || '').trim();
        var ebirdCode = EBIRD_CODES[nm];
        var aabSlug = nm.replace(/\s+/g, '_');
        var audubonSlug = nm.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        var wikiSlug = (sci || nm).replace(/\s+/g, '_');
        var inatSearch = encodeURIComponent(sci || nm);
        return {
          ebird: ebirdCode ? 'https://ebird.org/species/' + ebirdCode
            : 'https://ebird.org/search?q=' + encodeURIComponent(nm),
          allAboutBirds: 'https://www.allaboutbirds.org/guide/' + aabSlug + '/overview',
          audubon: 'https://www.audubon.org/field-guide/bird/' + audubonSlug,
          wikipedia: 'https://en.wikipedia.org/wiki/' + wikiSlug,
          inaturalist: 'https://www.inaturalist.org/taxa/search?q=' + inatSearch + '&sources=Birds'
        };
      }
      // Render the link button cluster — used on bird cards, conservation
      // species cards, and photo-ID results. Compact + accessible.
      function birdLinkButtons(name, sciName, options) {
        var opts = options || {};
        var size = opts.size || 'sm';  // 'sm' or 'xs'
        var links = birdLinks(name, sciName);
        var btnSize = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
        var ITEMS = [
          { key: 'ebird', label: '📊 eBird', url: links.ebird, color: 'bg-sky-100 text-sky-800 border-sky-400 hover:bg-sky-200' },
          { key: 'allAboutBirds', label: '🦅 All About Birds', url: links.allAboutBirds, color: 'bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-200' },
          { key: 'audubon', label: '🐦 Audubon', url: links.audubon, color: 'bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200' },
          { key: 'wikipedia', label: '📖 Wikipedia', url: links.wikipedia, color: 'bg-slate-100 text-slate-800 border-slate-400 hover:bg-slate-200' },
          { key: 'inaturalist', label: '🔎 iNaturalist', url: links.inaturalist, color: 'bg-violet-100 text-violet-800 border-violet-400 hover:bg-violet-200' }
        ];
        return h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': 'External resources for ' + name },
          ITEMS.map(function(item) {
            return h('a', {
              key: item.key,
              href: item.url,
              target: '_blank',
              rel: 'noopener noreferrer',
              'aria-label': item.label + ' (opens in new tab) — ' + name,
              className: 'inline-block rounded-lg border-2 font-bold transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' + btnSize + ' ' + item.color
            }, item.label + ' ↗');
          })
        );
      }

      function StatCard(props) {
        return h('div', { className: 'bg-white rounded-xl shadow border border-slate-300 p-3 text-center' },
          h('div', { className: 'text-[10px] uppercase font-bold tracking-wider text-slate-700' }, props.label),
          h('div', { className: 'text-2xl font-black ' + (props.color || 'text-emerald-700') }, props.value),
          props.unit && h('div', { className: 'text-[10px] text-slate-700' }, props.unit)
        );
      }

      // Gold/silver/bronze rank palette + medallion ribbon — shared by Photo ID and Match Quiz.
      // Pass an optional override label (e.g., 'Strongest match') to customize the ribbon text.
      function rankPalette(i, overrideLabel) {
        var p;
        if (i === 0) p = {
          label: 'Most likely',
          disc: 'radial-gradient(circle at 35% 28%, #fef9c3 0%, #fde68a 30%, #fbbf24 55%, #d97706 90%)',
          ring: '#92400e', text: '#7c2d12',
          ribbon: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
          ribbonBorder: '#d97706',
          cardBorder: '#d97706', cardBorderWidth: '3px',
          cardShadow: '0 0 0 1px #fde68a, 0 8px 22px rgba(217,119,6,0.25), 0 2px 6px rgba(0,0,0,0.06)',
          cardTint: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 70%)',
          glow: true
        };
        else if (i === 1) p = {
          label: 'Second guess',
          disc: 'radial-gradient(circle at 35% 28%, #ffffff 0%, #f1f5f9 30%, #cbd5e1 55%, #64748b 92%)',
          ring: '#475569', text: '#1e293b',
          ribbon: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
          ribbonBorder: '#64748b',
          cardBorder: '#64748b', cardBorderWidth: '2px',
          cardShadow: '0 6px 14px rgba(100,116,139,0.18), 0 1px 3px rgba(0,0,0,0.05)',
          cardTint: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 70%)',
          glow: false
        };
        else if (i === 2) p = {
          label: 'Third candidate',
          disc: 'radial-gradient(circle at 35% 28%, #fed7aa 0%, #fdba74 30%, #ea580c 60%, #9a3412 95%)',
          ring: '#7c2d12', text: '#7c2d12',
          ribbon: 'linear-gradient(180deg, #ffedd5 0%, #fed7aa 100%)',
          ribbonBorder: '#c2410c',
          cardBorder: '#c2410c', cardBorderWidth: '2px',
          cardShadow: '0 6px 14px rgba(194,65,12,0.18), 0 1px 3px rgba(0,0,0,0.05)',
          cardTint: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 70%)',
          glow: false
        };
        else p = {
          label: 'Other candidate',
          disc: 'radial-gradient(circle at 35% 28%, #f1f5f9 0%, #e2e8f0 60%, #94a3b8 95%)',
          ring: '#94a3b8', text: '#334155',
          ribbon: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          ribbonBorder: '#94a3b8',
          cardBorder: '#cbd5e1', cardBorderWidth: '2px',
          cardShadow: '0 4px 10px rgba(15,23,42,0.06)',
          cardTint: '#ffffff',
          glow: false
        };
        if (overrideLabel) p.label = overrideLabel;
        return p;
      }
      function rankMedallion(i, overrideLabel) {
        var p = rankPalette(i, overrideLabel);
        return h('div', {
          'aria-label': 'Rank ' + (i + 1) + ', ' + p.label,
          style: {
            position: 'absolute', top: -16, left: 14,
            display: 'flex', alignItems: 'center', gap: 0,
            filter: p.glow ? 'drop-shadow(0 0 6px rgba(251,191,36,0.55))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
            zIndex: 3
          }
        },
          h('div', {
            'aria-hidden': 'true',
            style: {
              width: 38, height: 38, borderRadius: '50%',
              background: p.disc, border: '2px solid ' + p.ring,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: p.text, fontWeight: 900, fontSize: 18, fontFamily: 'serif',
              textShadow: '0 1px 0 rgba(255,255,255,0.5)',
              position: 'relative', zIndex: 2
            }
          }, String(i + 1)),
          h('div', {
            style: {
              marginLeft: -10, paddingLeft: 14, paddingRight: 12, height: 26,
              display: 'flex', alignItems: 'center',
              background: p.ribbon, border: '2px solid ' + p.ribbonBorder, borderLeft: 'none',
              borderTopRightRadius: 13, borderBottomRightRadius: 13,
              color: p.text, fontWeight: 800, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)'
            }
          }, p.label)
        );
      }

      function TeacherNotes(props) {
        return h('details', { className: 'birdlab-teacher-notes bg-amber-50 border-2 border-amber-300 rounded-xl p-4' },
          h('summary', {
            className: 'cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 select-none flex items-center justify-between gap-3',
            'aria-label': 'Teacher Notes'
          },
            h('span', null, '🍎 Teacher Notes — click to expand'),
            h('span', {
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Print this module page',
              onClick: function(e) { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} } },
              className: 'birdlab-no-print text-xs font-semibold normal-case px-2 py-1 rounded bg-white border border-amber-300 hover:bg-amber-100 text-amber-800'
            }, '🖨️ Print')
          ),
          h('div', { className: 'mt-3 space-y-3 text-sm' },
            props.standards && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'NGSS / CTE Standards'),
              h('div', { className: 'text-slate-700' },
                props.standards.map(function(s, i) {
                  return h('span', { key: i, className: 'inline-block mr-2 mb-1 px-2 py-0.5 bg-white border border-amber-300 rounded text-xs font-mono' }, s);
                })
              )
            ),
            props.questions && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Discussion Questions'),
              h('ol', { className: 'list-decimal list-inside space-y-1 text-slate-700' },
                props.questions.map(function(q, i) { return h('li', { key: i }, q); })
              )
            ),
            props.misconceptions && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Watch for these misconceptions'),
              h('ul', { className: 'space-y-1 text-slate-700' },
                props.misconceptions.map(function(m, i) {
                  return h('li', { key: i, className: 'flex items-start gap-1.5' },
                    h('span', { className: 'text-amber-600 font-bold' }, '⚠'),
                    h('span', null, m)
                  );
                })
              )
            ),
            props.extension && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Extension Activity'),
              h('div', { className: 'text-slate-700 italic' }, props.extension)
            ),
            props.sources && h('div', null,
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, 'Sources'),
              h('div', { className: 'text-xs text-slate-700' }, props.sources)
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MAIN MENU
      // ─────────────────────────────────────────────────────
      function MainMenu() {
        var bigCards = [
          {
            id: 'ispy', title: 'I-Spy Bird Spotter', icon: '🔍',
            subtitle: '5 layered habitat scenes',
            desc: '5 distinct habitat scenes (forest, marsh, backyard, coast, mountain) with animated birds at their species\' real movement signatures. Click any bird to identify. Reduced-motion fallback for users who prefer static. Per-habitat "found" tracking.',
            bullets: ['5 habitats: forest · marsh · backyard · coast · mountain', 'Movement-as-field-mark — chickadees bob, hawks soar, nuthatches walk down, eiders glide', 'Click-to-identify with feedback cards + Merlin Bird ID bridge', 'Keyboard alternative for non-spatial-search users'],
            color: 'from-emerald-600 to-green-700',
            ring: 'ring-emerald-500/40',
            ready: true
          },
          {
            id: 'fieldMarks', title: 'Field Marks Trainer', icon: '🪶',
            subtitle: 'The vocabulary of birding',
            desc: 'Birders identify by looking at specific anatomy: wing bars, eye rings, supercilium, malar stripes, breast streaking, primary projection. Click parts of an annotated bird to learn what each mark is and why it matters. Phase 1 ships with the Black-capped Chickadee deep-dive.',
            bullets: ['Click plumage zones to learn the names', '8 hotspots on the chickadee', 'Why each field mark distinguishes lookalikes', 'More species (warblers, sparrows) in later phases'],
            color: 'from-sky-500 to-cyan-700',
            ring: 'ring-sky-500/40',
            ready: true
          },
          {
            id: 'beakFeet', title: 'Beak & Feet Lab', icon: '🦴',
            subtitle: 'Adaptation match — what does this beak do?',
            desc: 'Match beak shapes to diet (seedeater, fish-spear, raptor hook, nectar tube, insect-tweezer). Match foot shapes to lifestyle (perching, swimming, climbing, raptor talons). Cross-links to EvoLab\'s Galápagos Beak Lab for the deep evolution story.',
            color: 'from-amber-500 to-orange-600',
            ring: 'ring-amber-500/40',
            ready: true
          }
        ];
        var miniCards = [
          {
            id: 'calls', title: 'Bird Call Trainer', icon: '🎶',
            subtitle: 'Songs in plain English',
            desc: '15 mnemonic phrases ("drink-your-tea" for towhee, "who-cooks-for-you" for Barred Owl) + an 8-question matching quiz. Pairs with Cornell\'s free Merlin Bird ID app for the real audio.',
            color: 'from-violet-500 to-purple-700',
            ring: 'ring-violet-500/40',
            ready: true
          },
          {
            id: 'habitatMatch', title: 'Habitat Match', icon: '🌲',
            subtitle: 'Predict birds; predict habitats',
            desc: 'Two reverse-direction reasoning games. Bird → Habitat (where would you find this species?) and Habitat → Birds (multi-select which species belong here). 12 species × 5 habitats.',
            color: 'from-lime-500 to-emerald-600',
            ring: 'ring-lime-500/40',
            ready: true
          },
          {
            id: 'maineBirds', title: 'Maine Birds Spotlight', icon: '🌲',
            subtitle: '25 species + 12 birding hotspots',
            desc: '25 Maine species cards (year-round, breeders, winter visitors, migrants) with real Maine conservation stories: Project Puffin, Bald Eagle DDT recovery, Wood Thrush decline. Plus 12 Maine Birding Trail hotspots (Scarborough Marsh, Eastern Egg Rock, Acadia, Bradbury Hawkwatch, Baxter, more).',
            color: 'from-stone-500 to-stone-700',
            ring: 'ring-stone-500/40',
            ready: true
          },
          {
            id: 'migration', title: 'Migration Patterns', icon: '🗺️',
            subtitle: 'When, where, why birds move',
            desc: '4 North American flyways with Maine\'s role in the Atlantic Flyway. Spring + fall arrival/departure calendar by month. 8 featured migrators with strategies + distances. Cross-links to dedicated Migration & Wind Patterns Lab for flight physics.',
            color: 'from-orange-500 to-red-600',
            ring: 'ring-orange-500/40',
            ready: true
          },
          {
            id: 'citizenScience', title: 'Citizen Science Bridge', icon: '📡',
            subtitle: 'Your sightings = real science',
            desc: '8 projects (eBird, Merlin, FeederWatch, CBC, NestWatch, GBBC, Maine Audubon, iNaturalist) with full cards + a 5-question match quiz that recommends 1–2 projects that fit your time + interests.',
            color: 'from-blue-600 to-indigo-700',
            ring: 'ring-blue-500/40',
            ready: true
          },
          {
            id: 'fieldObs', title: 'Field Observation Challenge', icon: '🔭',
            subtitle: 'Track a bird → log it → reflect',
            desc: 'A three-phase observation activity: (1) keep your binocular reticle on a moving bird for 5 cumulative seconds, (2) fill a structured field log (date, location, behavior, weather, count), (3) write a brief reflective note. Saves to a personal notebook on your device.',
            color: 'from-teal-500 to-emerald-700',
            ring: 'ring-teal-500/40',
            ready: true
          },
          {
            id: 'photoId', title: 'Bird Photo ID (AI)', icon: '📸',
            subtitle: 'Upload a photo, get a probable species + confidence',
            desc: 'Upload any bird photo. Gemini Vision returns up to 3 candidate species with confidence scores, the field marks it noticed, and direct links to verify on eBird, All About Birds, Audubon, Wikipedia, and iNaturalist. Honest about uncertainty.',
            color: 'from-violet-500 to-fuchsia-700',
            ring: 'ring-violet-500/40',
            ready: true
          },
          {
            id: 'conservation', title: 'Conservation & Careers', icon: '🛡️',
            subtitle: '3 billion missing birds + 9 careers',
            desc: 'Rosenberg 2019 "3 billion birds" study with methodology + key findings + the hopeful takeaway. 4 Maine focal species (Piping Plover, Wood Thrush, recovered Bald Eagle + Atlantic Puffin). Climate context (Gulf of Maine warming). 9 ornithology career paths with honest pay + Maine programs.',
            color: 'from-rose-500 to-pink-700',
            ring: 'ring-rose-500/40',
            ready: true
          }
        ];

        var badges = d.blBadges || {};
        var visitedCount = BADGE_IDS.filter(function(id) { return badges[id]; }).length;
        var totalCount = BADGE_IDS.length;
        var allDone = visitedCount === totalCount;

        var renderCard = function(c, isBig) {
          var visited = !!badges[c.id];
          var notReady = !c.ready;
          return h('button', {
            key: c.id,
            onClick: function() {
              if (notReady) { addToast('Coming soon — ships in a later BirdLab phase.'); return; }
              goto(c.id);
            },
            'aria-label': c.title + (visited ? ' (explored)' : '') + (notReady ? ' — coming soon' : ''),
            'aria-disabled': notReady ? 'true' : 'false',
            className: 'relative text-left bg-white rounded-2xl shadow-lg border-2 ' +
              (visited ? 'border-emerald-600' : 'border-slate-200') +
              ' overflow-hidden group focus:outline-none focus:ring-4 ' + c.ring +
              (notReady ? ' opacity-70 cursor-not-allowed' : ' birdlab-card-lift hover:shadow-2xl hover:border-slate-400')
          },
            visited && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-emerald-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md birdlab-pulse-ring'
            }, '✓'),
            notReady && h('span', {
              'aria-hidden': true,
              className: 'absolute top-2 right-2 z-10 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md'
            }, 'Soon'),
            h('div', { className: 'bg-gradient-to-br ' + c.color + ' p-5 text-white' },
              h('div', { className: 'flex items-start justify-between mb-2' },
                h('span', { className: isBig ? 'text-5xl' : 'text-4xl' }, c.icon),
                h('span', { className: 'bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider' }, isBig ? 'Core' : 'Lab')
              ),
              h('h2', { className: isBig ? 'text-2xl font-black' : 'text-xl font-black' }, c.title),
              h('p', { className: 'text-sm opacity-90 font-medium' }, c.subtitle)
            ),
            h('div', { className: 'p-5' },
              h('p', { className: 'text-sm text-slate-700 leading-relaxed ' + (isBig ? 'mb-3' : '') }, c.desc),
              isBig && c.bullets && h('ul', { className: 'space-y-1' },
                c.bullets.map(function(b, i) {
                  return h('li', { key: i, className: 'text-xs text-slate-700 flex items-start gap-1.5' },
                    h('span', { className: 'text-emerald-600 font-bold' }, '✓'),
                    h('span', null, b)
                  );
                })
              )
            )
          );
        };

        // Season-aware tagline
        var __month = (new Date()).getMonth();
        var __seasonTag = (__month >= 2 && __month <= 4)
          ? 'Spring migration is in full swing — warblers are arriving daily.'
          : (__month >= 5 && __month <= 7)
          ? 'Breeding season — listen for territorial songs at dawn.'
          : (__month >= 8 && __month <= 10)
          ? 'Fall migration — hawks and waterfowl are passing through.'
          : 'Winter — feeder birds, irruptive owls, and resilient year-round residents.';
        return h('div', { className: 'p-6 max-w-6xl mx-auto' },
          // ── Hero: layered SVG scene with title overlay ──
          h('div', { className: 'mb-6 rounded-3xl overflow-hidden shadow-lg relative', style: { background: '#0f172a' } },
            h('svg', {
              viewBox: '0 0 800 240', width: '100%',
              role: 'img', 'aria-label': 'BirdLab hero illustration: sky with flying birds over Maine pine silhouettes',
              style: { display: 'block', height: 'auto' }
            },
              // Gradients
              h('defs', null,
                h('linearGradient', { id: 'bl-hero-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
                  h('stop', { offset: '0%', stopColor: '#3b6e9c' }),
                  h('stop', { offset: '40%', stopColor: '#7ec8f5' }),
                  h('stop', { offset: '85%', stopColor: '#fde6c3' }),
                  h('stop', { offset: '100%', stopColor: '#f59e0b' })
                ),
                h('radialGradient', { id: 'bl-hero-sun', cx: '50%', cy: '50%', r: '50%' },
                  h('stop', { offset: '0%', stopColor: '#fff7d6', stopOpacity: 1 }),
                  h('stop', { offset: '40%', stopColor: '#fde68a', stopOpacity: 0.8 }),
                  h('stop', { offset: '100%', stopColor: '#fde68a', stopOpacity: 0 })
                )
              ),
              // Sky
              h('rect', { x: 0, y: 0, width: 800, height: 240, fill: 'url(#bl-hero-sky)' }),
              // Sun
              h('circle', { cx: 660, cy: 95, r: 72, fill: 'url(#bl-hero-sun)' }),
              h('circle', { cx: 660, cy: 95, r: 26, fill: '#fff5c2', opacity: 0.95 }),
              // Distant ridge
              h('path', { d: 'M 0 180 L 80 160 L 160 175 L 240 150 L 340 170 L 420 145 L 520 170 L 620 155 L 720 175 L 800 160 L 800 200 L 0 200 Z',
                fill: '#516e7d', opacity: 0.55 }),
              // Mid ridge
              h('path', { d: 'M 0 200 L 70 185 L 170 205 L 270 180 L 380 205 L 490 190 L 600 210 L 720 195 L 800 200 L 800 220 L 0 220 Z',
                fill: '#3a5266', opacity: 0.75 }),
              // Pine silhouettes — denser cluster across bottom
              (function() {
                var pines = [];
                var xs = [10, 32, 55, 78, 102, 128, 155, 185, 215, 245, 275, 305, 335, 368, 402, 438, 475, 512, 550, 585, 620, 655, 690, 720, 752, 782];
                var hs = [38, 50, 42, 56, 44, 60, 38, 52, 64, 46, 40, 56, 48, 42, 58, 50, 44, 62, 48, 40, 56, 50, 44, 60, 48, 52];
                xs.forEach(function(x, i) {
                  var hgt = hs[i % hs.length];
                  var baseY = 218;
                  pines.push(h('path', { key: 'hp' + i,
                    d: 'M ' + x + ' ' + baseY + ' L ' + (x - 10) + ' ' + (baseY - hgt * 0.4) +
                       ' L ' + (x - 5) + ' ' + (baseY - hgt * 0.4) + ' L ' + (x - 8) + ' ' + (baseY - hgt * 0.7) +
                       ' L ' + (x - 4) + ' ' + (baseY - hgt * 0.7) + ' L ' + x + ' ' + (baseY - hgt) +
                       ' L ' + (x + 4) + ' ' + (baseY - hgt * 0.7) + ' L ' + (x + 8) + ' ' + (baseY - hgt * 0.7) +
                       ' L ' + (x + 5) + ' ' + (baseY - hgt * 0.4) + ' L ' + (x + 10) + ' ' + (baseY - hgt * 0.4) + ' Z',
                    fill: '#1f2f29', opacity: 0.95 }));
                });
                return pines;
              })(),
              // Foreground ground band
              h('rect', { x: 0, y: 218, width: 800, height: 22, fill: '#142420' }),
              // Flying-bird silhouettes in the sky (varied size + position for parallax feel)
              h('path', { d: 'M 130 60 q 12 -10 22 0 q 10 -10 22 0', stroke: '#0f172a', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round', opacity: 0.85 }),
              h('path', { d: 'M 220 95 q 8 -7 16 0 q 8 -7 16 0', stroke: '#0f172a', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', opacity: 0.7 }),
              h('path', { d: 'M 75 130 q 9 -7 18 0 q 9 -7 18 0', stroke: '#0f172a', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', opacity: 0.65 }),
              h('path', { d: 'M 360 50 q 14 -11 26 0 q 13 -11 26 0', stroke: '#0f172a', strokeWidth: 2.8, fill: 'none', strokeLinecap: 'round', opacity: 0.92 }),
              h('path', { d: 'M 480 78 q 9 -7 18 0 q 9 -7 18 0', stroke: '#0f172a', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round', opacity: 0.78 }),
              h('path', { d: 'M 540 130 q 7 -6 14 0 q 7 -6 14 0', stroke: '#0f172a', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', opacity: 0.55 }),
              h('path', { d: 'M 280 155 q 10 -8 20 0 q 10 -8 20 0', stroke: '#0f172a', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', opacity: 0.65 }),
              // V-formation (small flock high in the sky)
              h('g', { transform: 'translate(420 30)', opacity: 0.7 },
                h('path', { d: 'M 0 0 q 5 -4 10 0 q 5 -4 10 0', stroke: '#0f172a', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' }),
                h('path', { d: 'M -8 8 q 4 -3 8 0 q 4 -3 8 0', stroke: '#0f172a', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' }),
                h('path', { d: 'M 28 8 q 4 -3 8 0 q 4 -3 8 0', stroke: '#0f172a', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' }),
                h('path', { d: 'M -16 16 q 3 -2 6 0 q 3 -2 6 0', stroke: '#0f172a', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' }),
                h('path', { d: 'M 36 16 q 3 -2 6 0 q 3 -2 6 0', stroke: '#0f172a', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' })
              )
            ),
            // Title overlay (positioned over the SVG)
            h('div', { className: 'absolute inset-0 flex flex-col justify-center pointer-events-none px-8' },
              h('div', { style: { textShadow: '0 2px 8px rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.35)' } },
                h('h1', { className: 'text-5xl md:text-6xl font-black text-white tracking-tight leading-none' }, '🪶 BirdLab'),
                h('p', { className: 'text-base md:text-lg text-amber-50 mt-2 max-w-2xl font-semibold' },
                  'I-Spy ornithology. Real movement, real field marks, real Cornell Lab science.')
              )
            )
          ),
          // Season ribbon under hero
          h('div', { className: 'mb-5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 via-emerald-50 to-sky-50 border border-emerald-200 flex items-center gap-2 text-sm', role: 'note' },
            h('span', { 'aria-hidden': true, className: 'text-base' },
              (__month >= 2 && __month <= 4) ? '🌱' :
              (__month >= 5 && __month <= 7) ? '☀️' :
              (__month >= 8 && __month <= 10) ? '🍂' : '❄️'),
            h('span', { className: 'font-semibold text-slate-800' },
              (__month >= 2 && __month <= 4) ? 'Spring' :
              (__month >= 5 && __month <= 7) ? 'Summer' :
              (__month >= 8 && __month <= 10) ? 'Fall' : 'Winter'
            ),
            h('span', { className: 'text-slate-700' }, '— ' + __seasonTag)
          ),
          // Framing banner
          h('div', { className: 'mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300' },
            h('div', { className: 'flex items-start gap-3' },
              h('span', { className: 'text-2xl', 'aria-hidden': true }, '🪶'),
              h('div', null,
                h('div', { className: 'font-bold text-emerald-900 mb-1' }, 'BirdLab teaches the skill — Merlin gives you the senses'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'This tool teaches you HOW to identify birds: what to look at, what to listen for, what their behavior tells you. For real photos and recorded songs, download Cornell Lab\'s ',
                  h('strong', { className: 'font-mono' }, 'Merlin Bird ID'),
                  ' app (free, iOS/Android). And if you want to log what you see, ',
                  h('strong', { className: 'font-mono' }, 'eBird'),
                  ' (also from Cornell Lab) is the global citizen-science database every birder uses.')
              )
            )
          ),
          // Progress banner
          h('div', {
            'aria-live': 'polite',
            className: 'mb-6 p-4 rounded-2xl border-2 ' + (allDone ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200') + ' flex items-center justify-between gap-4'
          },
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: 'text-3xl' }, allDone ? '🏆' : '🌿'),
              h('div', null,
                h('div', { className: 'font-bold text-slate-800' },
                  allDone ? 'All modules explored — full birding path complete!' : ('Progress: ' + visitedCount + ' of ' + totalCount + ' modules explored')
                ),
                h('div', { className: 'text-xs text-slate-700' },
                  allDone ? 'Now go look out a window.' : 'Open each card below to learn its specialty.')
              )
            ),
            h('div', { className: 'flex-shrink-0 w-32 h-3 bg-slate-200 rounded-full overflow-hidden', 'aria-hidden': true },
              h('div', {
                className: 'h-full ' + (allDone ? 'bg-emerald-500' : 'bg-emerald-400') + ' transition-all',
                style: { width: Math.round((visitedCount / totalCount) * 100) + '%' }
              })
            )
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-2 px-1' }, 'Core Tools'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' },
            bigCards.map(function(c) { return renderCard(c, true); })
          ),
          h('div', { className: 'text-xs font-bold uppercase tracking-widest text-slate-700 mb-2 px-1' }, 'Quick Labs'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
            miniCards.map(function(c) { return renderCard(c, false); })
          ),
          h('div', { className: 'mt-8 text-center text-xs text-slate-700 italic' },
            'BirdLab v1 complete — all modules live. From I-Spy across 5 habitats to Maine Birds, Migration, Citizen Science, and Conservation & Careers. Pair with Cornell\'s free Merlin Bird ID for real audio + photos.')
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 1: I-SPY BIRD SPOTTER (forest habitat)
      // ─────────────────────────────────────────────────────
      function ISpyHabitat() {
        var habitatId_state = useState(d.activeHabitat || 'forest');
        var habitatId = habitatId_state[0], setHabitatId = habitatId_state[1];
        var picked_state = useState(null);
        var picked = picked_state[0], setPicked = picked_state[1];
        var foundByHabitat_state = useState(d.foundByHabitat || {});
        var foundByHabitat = foundByHabitat_state[0], setFoundByHabitat = foundByHabitat_state[1];

        var habitat = HABITATS[habitatId];
        var found = foundByHabitat[habitatId] || {};
        var totalBirds = habitat.birds.length;
        var foundCount = Object.keys(found).length;

        function switchHabitat(newId) {
          setHabitatId(newId);
          setPicked(null);
          upd('activeHabitat', newId);
          announce('Switched to ' + HABITATS[newId].name + ' habitat. ' + HABITATS[newId].birds.length + ' birds to find.');
        }

        function handleBirdClick(bird) {
          var species = BIRDS[bird.species];
          var habitatFound = Object.assign({}, found); habitatFound[bird.species] = true;
          var nextByHabitat = Object.assign({}, foundByHabitat); nextByHabitat[habitatId] = habitatFound;
          setFoundByHabitat(nextByHabitat);
          upd('foundByHabitat', nextByHabitat);
          setPicked(species);
          announce('Identified: ' + species.name);
        }

        // ARIA label for whole habitat (changes as birds get found)
        var habitatAriaLabel = habitat.name + ' habitat. ' + totalBirds + ' birds visible. Found ' + foundCount + ' so far. Click any bird to identify it.';

        var allHabitatIds = ['forest', 'marsh', 'backyard', 'coast', 'mountain'];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🔍', title: 'I-Spy Bird Spotter — ' + habitat.name }),
          h('div', { className: 'p-4 max-w-6xl mx-auto space-y-4' },
            // Habitat picker (tab strip)
            h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-3' },
              h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Pick a habitat'),
              h('div', { 'role': 'tablist', 'aria-label': 'I-Spy habitats', className: 'flex flex-wrap gap-2' },
                allHabitatIds.map(function(hid) {
                  var hab = HABITATS[hid];
                  var sel = (habitatId === hid);
                  var hf = (foundByHabitat[hid] || {});
                  var hfCount = Object.keys(hf).length;
                  var hbCount = hab.birds.length;
                  var habitatIcon = hid === 'forest' ? '🌲' : hid === 'marsh' ? '🌾' : hid === 'backyard' ? '🏡' : hid === 'coast' ? '🌊' : '⛰️';
                  return h('button', {
                    key: hid,
                    role: 'tab',
                    'aria-selected': sel ? 'true' : 'false',
                    onClick: function() { switchHabitat(hid); },
                    className: 'px-3 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                      (sel ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500')
                  },
                    h('span', { className: 'mr-1', 'aria-hidden': true }, habitatIcon),
                    hab.name,
                    h('span', { className: 'ml-2 text-[11px] font-mono ' + (sel ? 'text-emerald-100' : 'text-slate-700') },
                      hfCount + '/' + hbCount)
                  );
                })
              )
            ),
            // Habitat description + find counter
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex items-start justify-between gap-4 flex-wrap' },
              h('div', { className: 'flex-1 min-w-0' },
                h('h2', { className: 'text-base font-black text-emerald-900 mb-1' }, habitat.name + ' habitat'),
                h('p', { className: 'text-sm text-slate-800' }, habitat.description)
              ),
              h('div', { className: 'text-center flex-shrink-0' },
                h('div', { className: 'text-3xl font-black text-emerald-700' }, foundCount + ' / ' + totalBirds),
                h('div', { className: 'text-[10px] uppercase tracking-wider text-slate-700' }, 'birds found')
              )
            ),
            // The habitat scene
            h('div', { className: 'relative bg-white rounded-2xl border-2 border-slate-300 shadow-lg overflow-hidden', style: { aspectRatio: (habitat.width / habitat.height).toString(), minHeight: '300px' } },
              h('div', {
                role: 'img',
                'aria-label': habitatAriaLabel,
                className: 'relative w-full h-full',
                style: { background: habitat.bgGradient }
              },
                // Layered SVG scene — birds and habitat layers stacked in z-order
                h('svg', {
                  viewBox: '0 0 ' + habitat.width + ' ' + habitat.height,
                  className: 'absolute inset-0 w-full h-full pointer-events-none',
                  preserveAspectRatio: 'xMidYMid slice'
                },
                  // Static habitat layers 0-3
                  habitat.renderLayer(h, 0),
                  habitat.renderLayer(h, 1),
                  // Birds at layer 2 (back / hidden)
                  habitat.birds.filter(function(b) { return b.layer === 2; }).map(function(b, i) {
                    var sp = BIRDS[b.species];
                    return h('g', {
                      key: 'bird2-' + i,
                      transform: 'translate(' + b.x + ',' + b.y + ') scale(' + b.scale + ')',
                      className: 'birdlab-' + sp.movement
                    }, sp.svg(h));
                  }),
                  // Habitat layer 3 (midground trees) on top of layer-2 birds
                  habitat.renderLayer(h, 3),
                  // Birds at layer 3 (mid-flight)
                  habitat.birds.filter(function(b) { return b.layer === 3; }).map(function(b, i) {
                    var sp = BIRDS[b.species];
                    return h('g', {
                      key: 'bird3-' + i,
                      transform: 'translate(' + b.x + ',' + b.y + ') scale(' + b.scale + ')',
                      className: 'birdlab-' + sp.movement
                    }, sp.svg(h));
                  }),
                  // Habitat layer 4 (foreground trees / ground / foliage)
                  habitat.renderLayer(h, 4),
                  // Birds at layer 4 (foreground — robin on ground, nuthatch + woodpecker on foreground tree)
                  habitat.birds.filter(function(b) { return b.layer === 4; }).map(function(b, i) {
                    var sp = BIRDS[b.species];
                    return h('g', {
                      key: 'bird4-' + i,
                      transform: 'translate(' + b.x + ',' + b.y + ') scale(' + b.scale + ')',
                      className: 'birdlab-' + sp.movement
                    }, sp.svg(h));
                  }),
                  // Birds at layer 5 (highest — soaring raptor)
                  habitat.birds.filter(function(b) { return b.layer === 5; }).map(function(b, i) {
                    var sp = BIRDS[b.species];
                    return h('g', {
                      key: 'bird5-' + i,
                      transform: 'translate(' + b.x + ',' + b.y + ') scale(' + b.scale + ')',
                      className: 'birdlab-' + sp.movement
                    }, sp.svg(h));
                  })
                ),
                // Click hotspots — invisible buttons positioned over each bird (uses % positioning to scale with the SVG)
                habitat.birds.map(function(b, i) {
                  var sp = BIRDS[b.species];
                  var leftPct = (b.x / habitat.width) * 100;
                  var topPct  = (b.y / habitat.height) * 100;
                  var isFound = !!found[b.species];
                  return h('button', {
                    key: 'btn-' + i,
                    onClick: function() { handleBirdClick(b); },
                    'aria-label': (isFound ? 'Identified: ' + sp.name + '. Click to review.' : 'Bird at upper area: ' + b.hint + '. Click to identify.'),
                    className: 'birdlab-bird-btn',
                    style: { left: leftPct + '%', top: topPct + '%', width: '40px', height: '40px', transform: 'translate(-50%, -50%)' }
                  },
                    isFound && h('span', {
                      'aria-hidden': true,
                      style: { position: 'absolute', top: '-4px', right: '-4px', background: '#059669', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '999px', padding: '2px 5px' }
                    }, '✓')
                  );
                })
              )
            ),
            // Info panel for picked bird
            picked && h('div', { className: 'bg-white rounded-2xl border-2 border-emerald-400 shadow-lg overflow-hidden', 'aria-live': 'polite' },
              // ── Discovery scene (sun rays + sparkles around the bird) ──
              h('div', { className: 'relative bg-gradient-to-br from-emerald-100 via-amber-50 to-sky-100 px-5 pt-5 pb-4 border-b-2 border-emerald-300 overflow-hidden' },
                // Sun-ray burst behind the bird
                h('svg', {
                  'aria-hidden': 'true',
                  style: { position: 'absolute', top: '50%', left: '60px', transform: 'translate(-50%, -50%)', width: 200, height: 200, opacity: 0.55, pointerEvents: 'none' },
                  viewBox: '-100 -100 200 200'
                },
                  h('defs', null,
                    h('radialGradient', { id: 'discoGlow' },
                      h('stop', { offset: '0%', stopColor: '#fffbeb', stopOpacity: '0.95' }),
                      h('stop', { offset: '60%', stopColor: '#fef3c7', stopOpacity: '0.4' }),
                      h('stop', { offset: '100%', stopColor: '#fde68a', stopOpacity: '0' })
                    )
                  ),
                  h('circle', { cx: 0, cy: 0, r: 90, fill: 'url(#discoGlow)' }),
                  // Sun rays
                  Array.from({length: 12}, function(_, i) {
                    var ang = (i * 30) * Math.PI / 180;
                    var x1 = Math.cos(ang) * 28, y1 = Math.sin(ang) * 28;
                    var x2 = Math.cos(ang) * 80, y2 = Math.sin(ang) * 80;
                    return h('line', { key: 'ry' + i,
                      x1: x1, y1: y1, x2: x2, y2: y2,
                      stroke: '#fbbf24', strokeWidth: i % 2 === 0 ? 2.5 : 1.5,
                      strokeLinecap: 'round', opacity: 0.7 });
                  })
                ),
                // Sparkles scattered
                [{x:30,y:14},{x:90,y:18},{x:140,y:42},{x:160,y:78},{x:96,y:98}].map(function(s, i) {
                  return h('div', { key: 'sp' + i, 'aria-hidden': 'true',
                    style: {
                      position: 'absolute', left: s.x, top: s.y, width: 8, height: 8,
                      background: '#fbbf24',
                      clipPath: 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)',
                      opacity: 0.85
                    }
                  });
                }),
                // "✓ IDENTIFIED" stamp top-right
                h('div', {
                  style: {
                    position: 'absolute', top: 12, right: 12,
                    background: '#065f46', color: '#a7f3d0',
                    padding: '5px 14px', borderRadius: 999,
                    border: '2px solid #10b981',
                    fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }
                }, '✓ Identified'),
                // Bird + name row (in front of all the decoration)
                h('div', { className: 'relative flex items-start gap-4 flex-wrap', style: { zIndex: 1 } },
                  // Bird in white-backed circle with green ring
                  h('div', {
                    className: 'flex-shrink-0',
                    style: {
                      width: 96, height: 96, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.95)',
                      border: '3px solid #10b981',
                      boxShadow: '0 0 0 4px rgba(16,185,129,0.18), 0 6px 14px rgba(0,0,0,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }
                  },
                    h('svg', { viewBox: '0 0 30 30', style: { width: '76px', height: '76px' }, role: 'img', 'aria-label': picked.name + ' illustration' },
                      h('g', { transform: 'translate(2, 2)' }, picked.svg(h))
                    )
                  ),
                  h('div', { className: 'flex-1 min-w-0', style: { paddingTop: 8 } },
                    h('h2', {
                      className: 'text-2xl font-black text-slate-800',
                      style: { textShadow: '0 1px 0 rgba(255,255,255,0.85)', lineHeight: 1.1 }
                    }, picked.name),
                    h('div', {
                      className: 'text-sm italic text-slate-700',
                      style: { textShadow: '0 1px 0 rgba(255,255,255,0.7)' }
                    }, picked.sciName + ' · ' + picked.size),
                    h('div', { className: 'mt-1 flex flex-wrap gap-1.5' },
                      h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-400' },
                        '🐾 ' + (picked.movement || '').replace(/-/g, ' ')),
                      h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200 text-sky-900 border border-sky-400' },
                        '📍 ' + foundCount + '/' + totalBirds + ' in this habitat')
                    )
                  )
                )
              ),
              // ── Body content (info grid) ──
              h('div', { className: 'p-5 space-y-3' },
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-800' },
                  h('div', null, h('strong', null, '🌲 Habitat: '), picked.habitat),
                  h('div', null, h('strong', null, '📍 Maine: '), picked.mainePresence),
                  h('div', { className: 'md:col-span-2' }, h('strong', null, '🎶 Call: '), picked.callDescription),
                  h('div', { className: 'md:col-span-2' }, h('strong', null, '✨ Did you know: '), picked.funFact)
                ),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-slate-800' },
                  h('strong', { className: 'text-blue-900' }, 'Want to hear it? '),
                  'Open the free ',
                  h('strong', { className: 'font-mono' }, 'Merlin Bird ID'),
                  ' app (Cornell Lab) and search "',
                  picked.name,
                  '" — they have professional recordings.'),
                // Deep-link cluster — verify or read more on real ID resources
                h('div', { className: 'p-3 bg-white border-2 border-emerald-300 rounded-lg' },
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5' }, '🔗 Open in real-world resources'),
                  birdLinkButtons(picked.name, picked.sciName, { size: 'xs' })
                )
              )
            ),
            // Keyboard alternative — list of birds for tabbing
            h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-4' },
              h('div', { className: 'flex items-center justify-between mb-2 flex-wrap gap-2' },
                h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700' }, 'Birds in this scene (keyboard alternative)'),
                h('span', { className: 'text-xs text-slate-700' }, 'Use these buttons if you can\'t use the spatial hotspots above')
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2' },
                habitat.birds.map(function(b, i) {
                  var sp = BIRDS[b.species];
                  var isFound = !!found[b.species];
                  return h('button', {
                    key: 'kbd-' + i,
                    onClick: function() { handleBirdClick(b); },
                    className: 'text-left p-2 rounded-lg border-2 transition focus:outline-none focus:ring-2 ring-emerald-500/40 ' +
                      (isFound ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-300 hover:border-emerald-500')
                  },
                    h('div', { className: 'text-xs font-bold text-slate-800 flex items-center gap-1.5' },
                      isFound ? h('span', { className: 'text-emerald-700' }, '✓') : h('span', { className: 'text-slate-400' }, '○'),
                      sp.name
                    ),
                    h('div', { className: 'text-[10px] text-slate-700 mt-0.5 italic' }, b.hint)
                  );
                })
              )
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS2-2 (Ecosystem dynamics)', 'NGSS MS-LS2-1 (Biotic interactions)', 'NGSS HS-LS4-2 (Adaptation evidence)'],
              questions: [
                'The seven birds in this scene specialize in different parts of the forest — canopy, midstory, trunk, undergrowth, ground, sky. What does that division of habitat tell you about how species avoid competing with each other?',
                'A bird\'s movement pattern is a real field mark. Watch the chickadee, the soaring hawk, and the nuthatch. How would you describe each one\'s movement to a friend who couldn\'t see the bird?',
                'The Eastern Towhee is hidden in the undergrowth — that\'s realistic. Why might evolution favor secretive behavior in some songbirds while others perch in plain sight?'
              ],
              misconceptions: [
                '"All small brown birds look the same" — almost never true if you look at field marks. The differences in eye rings, wing bars, breast streaking, and tail length are reliable across species.',
                '"You can identify any bird by its call alone" — partly true, but in dense forest you often hear songs without seeing the bird. Songs and visual ID skills work together.',
                '"Pretty / colorful birds = important; drab birds = boring" — every species fills an ecological role. Drab birds (sparrows, vireos) often have richer songs and more complex territorial behavior than colorful ones.'
              ],
              extension: 'Open Merlin Bird ID, set it to your location, and use Sound ID for 5 minutes outside. Identify whatever it picks up. Note: most North American kids will hear robins, chickadees, and crows even in cities.',
              sources: 'Cornell Lab All About Birds (allaboutbirds.org). Merlin Bird ID app (Cornell Lab). Movement-as-field-mark pedagogy from Sibley Guide to Birds and Cornell Lab\'s Bird Academy courses.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 2: FIELD MARKS TRAINER (chickadee deep dive)
      // ─────────────────────────────────────────────────────
      function FieldMarksTrainer() {
        var picked_state = useState(null);
        var picked = picked_state[0], setPicked = picked_state[1];
        var visited_state = useState({});
        var visited = visited_state[0], setVisited = visited_state[1];

        var fm = CHICKADEE_FIELD_MARKS;

        function pickHotspot(hs) {
          setPicked(hs);
          var nv = Object.assign({}, visited); nv[hs.id] = true;
          setVisited(nv);
          announce('Selected: ' + hs.label);
        }

        var visitedCount = Object.keys(visited).length;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🪶', title: 'Field Marks Trainer' }),
          h('div', { className: 'p-4 max-w-5xl mx-auto space-y-4' },
            h('div', { className: 'bg-sky-50 border-2 border-sky-300 rounded-xl p-4' },
              h('h2', { className: 'text-base font-black text-sky-900 mb-1' }, 'Click parts of the chickadee to learn what each field mark is and why it matters'),
              h('p', { className: 'text-sm text-slate-800' },
                'Real birders identify by looking at specific anatomy: cap, cheek, bib, wing edges, eye ring, bill shape, flank color, tail length. Each part is a clue. Click each circle on the bird below to see the part name, what it looks like, and what it tells you about identification.')
            ),
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', { className: 'text-sm text-slate-700' },
                h('strong', null, 'Hotspots explored: '),
                visitedCount + ' / ' + fm.hotspots.length
              ),
              h('div', { className: 'text-xs text-slate-700 italic' },
                'Black-capped Chickadee · Poecile atricapillus · Maine\'s state bird')
            ),
            // Big bird with clickable hotspots
            h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow-lg overflow-hidden relative', style: { aspectRatio: '320 / 240', minHeight: '300px' } },
              h('svg', {
                viewBox: fm.bigSvgViewBox,
                className: 'w-full h-full',
                role: 'img',
                'aria-label': 'Black-capped Chickadee with ' + fm.hotspots.length + ' clickable field-mark hotspots'
              },
                fm.bigSvg(h),
                // Hotspot circles (visual indicators)
                fm.hotspots.map(function(hs) {
                  var isVisited = !!visited[hs.id];
                  var isPicked = picked && picked.id === hs.id;
                  return h('circle', {
                    key: 'circle-' + hs.id,
                    cx: hs.x, cy: hs.y, r: hs.r,
                    fill: 'none',
                    stroke: isPicked ? '#0284c7' : (isVisited ? '#059669' : '#fbbf24'),
                    strokeWidth: isPicked ? 4 : 2,
                    strokeDasharray: isVisited ? 'none' : '3,3',
                    opacity: isPicked ? 1 : 0.85,
                    'aria-hidden': true
                  });
                })
              ),
              // Hotspot buttons (positioned over the SVG using percent-based positioning)
              fm.hotspots.map(function(hs) {
                var leftPct = (hs.x / 320) * 100;
                var topPct  = (hs.y / 240) * 100;
                var sizePct = (hs.r * 2 / 320) * 100;
                return h('button', {
                  key: 'btn-' + hs.id,
                  onClick: function() { pickHotspot(hs); },
                  'aria-label': hs.label + (visited[hs.id] ? ' (explored)' : ''),
                  'aria-pressed': picked && picked.id === hs.id ? 'true' : 'false',
                  className: 'birdlab-bird-btn',
                  style: { left: leftPct + '%', top: topPct + '%', width: sizePct + '%', aspectRatio: '1', transform: 'translate(-50%, -50%)' }
                });
              })
            ),
            // Detail card for picked hotspot
            picked && h('div', { className: 'bg-white rounded-2xl border-2 border-sky-400 shadow p-5', 'aria-live': 'polite' },
              h('h2', { className: 'text-xl font-black text-slate-800 mb-2' }, picked.label),
              h('div', { className: 'p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-2' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1' }, '👁 What it looks like'),
                h('p', { className: 'text-sm text-slate-800' }, picked.what)
              ),
              h('div', { className: 'p-3 bg-blue-50 border border-blue-200 rounded-lg' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, '🎯 Why it matters for ID'),
                h('p', { className: 'text-sm text-slate-800' }, picked.why)
              )
            ),
            // Hotspot list (keyboard-navigable + secondary access)
            h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-4' },
              h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'All field marks (keyboard list)'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                fm.hotspots.map(function(hs) {
                  var isVisited = !!visited[hs.id];
                  var isPicked = picked && picked.id === hs.id;
                  return h('button', {
                    key: 'kbd-' + hs.id,
                    onClick: function() { pickHotspot(hs); },
                    'aria-pressed': isPicked ? 'true' : 'false',
                    className: 'p-2 rounded-lg border-2 text-xs font-semibold transition focus:outline-none focus:ring-2 ring-sky-500/40 ' +
                      (isPicked ? 'bg-sky-100 border-sky-500 text-sky-900' :
                       isVisited ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                       'bg-white border-slate-300 text-slate-800 hover:border-sky-400')
                  },
                    h('span', { className: 'mr-1' }, isVisited ? '✓' : '○'),
                    hs.label
                  );
                })
              )
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS4-2 (Adaptation evidence)', 'NGSS MS-LS4-2 (Anatomical similarities)', 'CTE Family & Consumer Sciences (observation skills)'],
              questions: [
                'A Carolina Chickadee looks almost identical to a Black-capped Chickadee. Their ranges overlap in a narrow zone. What would you look for to tell them apart?',
                'Why do field marks tend to be on the head, wings, and tail rather than the belly?',
                'The chickadee\'s short, stout bill tells you about its diet. Compare to a heron\'s long spear bill or a hummingbird\'s long thin bill. What does each shape tell you about what the bird eats?'
              ],
              misconceptions: [
                '"You need to see a bird perfectly to identify it" — experienced birders identify from quick glances and partial views by knowing which 1-2 field marks are diagnostic.',
                '"Color is the most important field mark" — color is helpful but unreliable in low light or distance. Shape, posture, and behavior often work better.',
                '"All chickadees are black-capped" — there are seven North American chickadee species: Black-capped, Carolina, Boreal, Mountain, Mexican, Chestnut-backed, and Gray-headed. Each has distinct field marks.'
              ],
              extension: 'Print a photo of any small songbird (or pull up Merlin Bird ID). Try to label five field marks before checking the answer. The skill is in the LOOKING, not the memorizing.',
              sources: 'Cornell Lab All About Birds. Sibley Guide to Birds field marks vocabulary. Pyle Identification Guide for fine-grained identification (the bander\'s bible).'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // STUB MODULES (Phases 2-5)
      // ─────────────────────────────────────────────────────
      // ─────────────────────────────────────────────────────
      // MODULE 3: BEAK & FEET LAB (Phase 2)
      // Adaptation match game. 8 beak categories (with diet) + 6 foot
      // categories (with lifestyle). Cross-links to EvoLab's Galápagos
      // Beak Lab (`'beakLab'` view ID confirmed in Phase 1 Explore) for
      // the deep evolution story of how beak shape can change in a few
      // generations under selection pressure.
      // ─────────────────────────────────────────────────────
      var BEAK_TYPES = [
        {
          id: 'cone', label: 'Cone (seed-cracker)',
          diet: 'Seeds — strong jaw muscles to crack hard shells',
          examples: 'Northern Cardinal, House Finch, Black-capped Chickadee, sparrows',
          svg: function(h) { return h('path', { d: 'M 0 10 L 20 8 L 20 12 Z', fill: '#3a3a3a' }); }
        },
        {
          id: 'hook', label: 'Hook (raptor)',
          diet: 'Tearing meat from prey — hooked tip rips, sharp edges slice',
          examples: 'Bald Eagle, Cooper\'s Hawk, owls, falcons',
          svg: function(h) { return h('path', { d: 'M 0 8 L 18 8 Q 22 8 22 12 Q 20 14 18 12 L 0 12 Z', fill: '#3a3a3a' }); }
        },
        {
          id: 'spear', label: 'Spear (fish)',
          diet: 'Fish — long sharp bill stabs through water at high speed',
          examples: 'Great Blue Heron, egrets, kingfishers (slightly modified version)',
          svg: function(h) { return h('path', { d: 'M 0 9 L 35 10 L 0 11 Z', fill: '#e8c440' }); }
        },
        {
          id: 'tube', label: 'Tube (nectar)',
          diet: 'Flower nectar — long thin bill probes deep flower throats; tongue extends past bill tip',
          examples: 'Hummingbirds (Ruby-throated common in Maine summers)',
          svg: function(h) { return h('path', { d: 'M 0 9.5 L 32 9.5 L 32 10.5 L 0 10.5 Z', fill: '#1a1a1a' }); }
        },
        {
          id: 'chisel', label: 'Chisel (excavator)',
          diet: 'Insects in wood + sap — bill is straight chisel; skull and neck shock-absorb hammering',
          examples: 'Pileated Woodpecker, all woodpeckers',
          svg: function(h) { return h('path', { d: 'M 0 8 L 22 9 L 22 11 L 0 12 Z', fill: '#e8d8a8', stroke: '#8a7a4a', strokeWidth: 0.4 }); }
        },
        {
          id: 'filter', label: 'Filter (dabbler)',
          diet: 'Floating plants + small invertebrates — flat bill with comb-like edges strains water',
          examples: 'Mallard, Common Eider, geese',
          svg: function(h) { return h('path', { d: 'M 0 7 L 20 7 Q 22 8 22 11 Q 22 13 20 13 L 0 13 Z', fill: '#e8c440', stroke: '#8a7020', strokeWidth: 0.4 }); }
        },
        {
          id: 'parrot', label: 'Parrot-like wedge',
          diet: 'Small fish — colorful triangular bill carries multiple fish at once for chicks',
          examples: 'Atlantic Puffin (the Maine icon) — and other auks',
          svg: function(h) { return h('g', null,
            h('path', { d: 'M 0 8 L 15 7 Q 20 8 20 11 Q 18 13 15 12 L 0 12 Z', fill: '#e85a20' }),
            h('path', { d: 'M 8 8.5 L 18 9 L 18 11 L 8 11.5 Z', fill: '#e8c020' })
          ); }
        },
        {
          id: 'thin', label: 'Thin probe (insectivore)',
          diet: 'Insects on leaves + bark — slender bill plucks small bugs',
          examples: 'Red-eyed Vireo, warblers, kinglets',
          svg: function(h) { return h('path', { d: 'M 0 9.5 L 22 10 L 22 10.5 L 0 10.5 Z', fill: '#3a3a3a' }); }
        }
      ];

      var FOOT_TYPES = [
        {
          id: 'perching', label: 'Perching (anisodactyl)',
          lifestyle: 'Songbirds — 3 toes forward + 1 back; tendons LOCK around branch when bird relaxes',
          examples: 'Robin, chickadee, cardinal, blue jay — most birds you\'ll see at a feeder',
          svg: function(h) {
            // 3 toes wrapping a horizontal branch + 1 back toe
            return h('g', null,
              // Branch (cross-section)
              h('ellipse', { cx: 20, cy: 26, rx: 18, ry: 5, fill: '#92400e', stroke: '#451a03', strokeWidth: 0.5 }),
              h('path', { d: 'M 4 26 Q 4 21 8 21 L 32 21 Q 36 21 36 26', fill: '#a16207', stroke: '#451a03', strokeWidth: 0.5 }),
              // Leg
              h('line', { x1: 20, y1: 4, x2: 20, y2: 18, stroke: '#fde68a', strokeWidth: 3, strokeLinecap: 'round' }),
              h('line', { x1: 20, y1: 4, x2: 20, y2: 18, stroke: '#a16207', strokeWidth: 1, strokeLinecap: 'round' }),
              // Front 3 toes curling over branch
              h('path', { d: 'M 20 18 Q 12 22 8 28', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round' }),
              h('path', { d: 'M 20 18 Q 20 24 20 30', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round' }),
              h('path', { d: 'M 20 18 Q 28 22 32 28', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round' }),
              // Back toe (hallux) — wraps backward under branch
              h('path', { d: 'M 20 18 Q 22 25 26 28', fill: 'none', stroke: '#d97706', strokeWidth: 2, strokeLinecap: 'round' }),
              // Toe tips (claws)
              h('circle', { cx: 8, cy: 28, r: 0.8, fill: '#1c1917' }),
              h('circle', { cx: 20, cy: 30, r: 0.8, fill: '#1c1917' }),
              h('circle', { cx: 32, cy: 28, r: 0.8, fill: '#1c1917' })
            );
          }
        },
        {
          id: 'raptor', label: 'Raptor talons',
          lifestyle: 'Hawks, eagles, owls — powerful crushing grip with curved talons',
          examples: 'Bald Eagle, Cooper\'s Hawk, owls — designed to kill prey on contact',
          svg: function(h) {
            return h('g', null,
              // Thick yellow leg
              h('rect', { x: 17, y: 2, width: 6, height: 14, rx: 2, fill: '#fbbf24', stroke: '#92400e', strokeWidth: 0.6 }),
              // Scales
              [5, 8, 11, 14].map(function(y, i) {
                return h('line', { key: 'sc' + i, x1: 17, y1: y, x2: 23, y2: y, stroke: '#92400e', strokeWidth: 0.4, opacity: 0.6 });
              }),
              // 3 forward talons - curved, sharp
              h('path', { d: 'M 20 16 Q 12 20 6 26 Q 4 30 7 32', fill: 'none', stroke: '#1c1917', strokeWidth: 2.5, strokeLinecap: 'round' }),
              h('path', { d: 'M 20 16 Q 20 22 19 30 Q 19 33 20 34', fill: 'none', stroke: '#1c1917', strokeWidth: 2.5, strokeLinecap: 'round' }),
              h('path', { d: 'M 20 16 Q 28 20 34 26 Q 36 30 33 32', fill: 'none', stroke: '#1c1917', strokeWidth: 2.5, strokeLinecap: 'round' }),
              // Back talon (hallux — kill talon, the largest)
              h('path', { d: 'M 20 16 Q 24 22 28 26 Q 30 28 28 30', fill: 'none', stroke: '#1c1917', strokeWidth: 3, strokeLinecap: 'round' }),
              // Talon tips (sharp triangles)
              h('path', { d: 'M 5 32 L 8 30 L 8 33 Z', fill: '#1c1917' }),
              h('path', { d: 'M 18 34 L 21 32 L 21 36 Z', fill: '#1c1917' }),
              h('path', { d: 'M 31 32 L 34 30 L 34 33 Z', fill: '#1c1917' })
            );
          }
        },
        {
          id: 'climbing', label: 'Climbing (zygodactyl)',
          lifestyle: 'Woodpeckers + parrots — 2 toes forward + 2 back; clings to vertical bark while hammering',
          examples: 'Pileated Woodpecker, all woodpeckers, nuthatches (use modified version)',
          svg: function(h) {
            return h('g', null,
              // Vertical tree trunk (textured)
              h('rect', { x: 14, y: 0, width: 12, height: 40, fill: '#6b3410' }),
              h('path', { d: 'M 14 6 L 17 4 M 14 14 L 17 12 M 14 22 L 17 20 M 14 30 L 17 28', stroke: '#3f1d04', strokeWidth: 0.8 }),
              h('path', { d: 'M 26 8 L 23 6 M 26 18 L 23 16 M 26 26 L 23 24 M 26 36 L 23 34', stroke: '#3f1d04', strokeWidth: 0.8 }),
              // Leg (horizontal — bird is clinging)
              h('rect', { x: 17, y: 18, width: 8, height: 4, rx: 1.5, fill: '#fde68a', stroke: '#92400e', strokeWidth: 0.4 }),
              // 2 forward toes (above)
              h('path', { d: 'M 20 19 L 12 12 L 9 14', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round' }),
              h('path', { d: 'M 22 19 L 30 12 L 33 14', fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinecap: 'round' }),
              // 2 back toes (below)
              h('path', { d: 'M 20 22 L 12 30 L 9 28', fill: 'none', stroke: '#d97706', strokeWidth: 2, strokeLinecap: 'round' }),
              h('path', { d: 'M 22 22 L 30 30 L 33 28', fill: 'none', stroke: '#d97706', strokeWidth: 2, strokeLinecap: 'round' }),
              // Claws
              h('circle', { cx: 9, cy: 14, r: 0.7, fill: '#1c1917' }),
              h('circle', { cx: 33, cy: 14, r: 0.7, fill: '#1c1917' }),
              h('circle', { cx: 9, cy: 28, r: 0.7, fill: '#1c1917' }),
              h('circle', { cx: 33, cy: 28, r: 0.7, fill: '#1c1917' })
            );
          }
        },
        {
          id: 'webbed', label: 'Webbed',
          lifestyle: 'Swimming — paddle-like skin between front toes; powerful underwater propulsion',
          examples: 'Mallard, Common Eider, gulls, ducks, geese',
          svg: function(h) {
            return h('g', null,
              // Water surface line
              h('path', { d: 'M 2 8 Q 8 6 14 8 Q 20 6 26 8 Q 32 6 38 8', fill: 'none', stroke: '#0ea5e9', strokeWidth: 1, opacity: 0.6 }),
              h('path', { d: 'M 2 4 Q 8 2 14 4 Q 20 2 26 4 Q 32 2 38 4', fill: 'none', stroke: '#0ea5e9', strokeWidth: 0.7, opacity: 0.4 }),
              // Leg
              h('rect', { x: 18, y: 8, width: 4, height: 8, fill: '#f59e0b', stroke: '#92400e', strokeWidth: 0.4 }),
              // Webbed foot — 3 toes connected by skin
              h('path', { d: 'M 20 16 L 8 32 L 16 34 L 20 24 L 24 34 L 32 32 Z',
                fill: '#fbbf24', stroke: '#92400e', strokeWidth: 0.7 }),
              // Toe bones inside webbing (suggesting structure)
              h('line', { x1: 20, y1: 16, x2: 9, y2: 32, stroke: '#92400e', strokeWidth: 0.5, opacity: 0.7 }),
              h('line', { x1: 20, y1: 16, x2: 20, y2: 30, stroke: '#92400e', strokeWidth: 0.5, opacity: 0.7 }),
              h('line', { x1: 20, y1: 16, x2: 31, y2: 32, stroke: '#92400e', strokeWidth: 0.5, opacity: 0.7 }),
              // Claws
              h('circle', { cx: 9, cy: 32, r: 0.6, fill: '#1c1917' }),
              h('circle', { cx: 20, cy: 24, r: 0.6, fill: '#1c1917' }),
              h('circle', { cx: 31, cy: 32, r: 0.6, fill: '#1c1917' })
            );
          }
        },
        {
          id: 'wading', label: 'Wading (long toes)',
          lifestyle: 'Long unwebbed toes spread weight across mud and lily pads without sinking',
          examples: 'Great Blue Heron, egrets, sandpipers, rails',
          svg: function(h) {
            return h('g', null,
              // Lily pad / mud
              h('ellipse', { cx: 20, cy: 36, rx: 18, ry: 3, fill: '#16a34a', opacity: 0.7 }),
              h('path', { d: 'M 6 36 Q 14 33 22 36 Q 30 33 36 36', fill: 'none', stroke: '#15803d', strokeWidth: 0.6 }),
              // Long thin leg
              h('line', { x1: 20, y1: 0, x2: 20, y2: 22, stroke: '#fde68a', strokeWidth: 2.5, strokeLinecap: 'round' }),
              h('line', { x1: 20, y1: 0, x2: 20, y2: 22, stroke: '#a16207', strokeWidth: 0.8, strokeLinecap: 'round' }),
              // Long thin toes spread in 4 directions (wide stance)
              h('line', { x1: 20, y1: 22, x2: 4, y2: 36, stroke: '#fbbf24', strokeWidth: 1.5, strokeLinecap: 'round' }),
              h('line', { x1: 20, y1: 22, x2: 14, y2: 38, stroke: '#fbbf24', strokeWidth: 1.5, strokeLinecap: 'round' }),
              h('line', { x1: 20, y1: 22, x2: 26, y2: 38, stroke: '#fbbf24', strokeWidth: 1.5, strokeLinecap: 'round' }),
              h('line', { x1: 20, y1: 22, x2: 36, y2: 36, stroke: '#fbbf24', strokeWidth: 1.5, strokeLinecap: 'round' }),
              // Back toe
              h('line', { x1: 20, y1: 22, x2: 20, y2: 30, stroke: '#d97706', strokeWidth: 1.4, strokeLinecap: 'round' }),
              // Claws
              h('circle', { cx: 4, cy: 36, r: 0.5, fill: '#1c1917' }),
              h('circle', { cx: 14, cy: 38, r: 0.5, fill: '#1c1917' }),
              h('circle', { cx: 26, cy: 38, r: 0.5, fill: '#1c1917' }),
              h('circle', { cx: 36, cy: 36, r: 0.5, fill: '#1c1917' })
            );
          }
        },
        {
          id: 'shorebird', label: 'Shorebird (small webbing)',
          lifestyle: 'Mix of running fast on sand + swimming when needed; partial webbing',
          examples: 'Sandpipers, plovers (Piping Plover endangered in Maine), gulls (semi-webbed)',
          svg: function(h) {
            return h('g', null,
              // Sand/wet beach
              h('ellipse', { cx: 20, cy: 36, rx: 18, ry: 2.5, fill: '#fde68a', opacity: 0.7 }),
              h('circle', { cx: 6, cy: 35, r: 0.6, fill: '#a16207', opacity: 0.5 }),
              h('circle', { cx: 12, cy: 36, r: 0.5, fill: '#a16207', opacity: 0.5 }),
              h('circle', { cx: 28, cy: 36, r: 0.6, fill: '#a16207', opacity: 0.5 }),
              h('circle', { cx: 34, cy: 35, r: 0.5, fill: '#a16207', opacity: 0.5 }),
              // Leg
              h('rect', { x: 18.5, y: 6, width: 3, height: 14, fill: '#f59e0b', stroke: '#92400e', strokeWidth: 0.4 }),
              // 3 forward toes with PARTIAL webbing at base
              h('path', { d: 'M 20 20 L 8 32 L 12 34 Q 16 30 20 30 Q 24 30 28 34 L 32 32 Z',
                fill: '#fbbf24', stroke: '#92400e', strokeWidth: 0.6, opacity: 0.55 }),
              // Distinct toes (drawn over the webbing)
              h('line', { x1: 20, y1: 20, x2: 8, y2: 32, stroke: '#92400e', strokeWidth: 1.4, strokeLinecap: 'round' }),
              h('line', { x1: 20, y1: 20, x2: 20, y2: 32, stroke: '#92400e', strokeWidth: 1.4, strokeLinecap: 'round' }),
              h('line', { x1: 20, y1: 20, x2: 32, y2: 32, stroke: '#92400e', strokeWidth: 1.4, strokeLinecap: 'round' }),
              // Tiny back toe
              h('line', { x1: 20, y1: 20, x2: 22, y2: 24, stroke: '#d97706', strokeWidth: 1, strokeLinecap: 'round' }),
              // Claws
              h('circle', { cx: 8, cy: 32, r: 0.5, fill: '#1c1917' }),
              h('circle', { cx: 20, cy: 32, r: 0.5, fill: '#1c1917' }),
              h('circle', { cx: 32, cy: 32, r: 0.5, fill: '#1c1917' })
            );
          }
        }
      ];

      function BeakFeetLab() {
        var pickedBeak_state = useState(null);
        var pickedFoot_state = useState(null);
        var pickedBeak = pickedBeak_state[0], setPickedBeak = pickedBeak_state[1];
        var pickedFoot = pickedFoot_state[0], setPickedFoot = pickedFoot_state[1];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🦴', title: 'Beak & Feet Lab' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-amber-900 mb-2' }, 'Bills and feet are evolution\'s tool kit'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'A bird\'s bill tells you what it eats. Its feet tell you where it lives. Look at any bird and you can read its lifestyle from those two parts alone — without ever seeing it eat or move. This module shows the eight common bill shapes and six common foot patterns, and which species in BirdLab\'s habitats use each.')
            ),
            // Cross-link banner to EvoLab Beak Lab
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-start gap-3' },
              h('span', { className: 'text-3xl flex-shrink-0', 'aria-hidden': true }, '🌋'),
              h('div', null,
                h('h3', { className: 'text-base font-black text-emerald-900 mb-1' }, 'See evolution change a beak: Galápagos finches'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'Charles Darwin watched 13 finch species on the Galápagos Islands and realized they\'d all evolved from a single common ancestor — each one\'s beak shape matched a different food source. Peter and Rosemary Grant later watched these beaks ',
                  h('em', null, 'continue evolving'),
                  ' across droughts in real time. For the deep story: visit ',
                  h('strong', { className: 'font-mono' }, 'EvoLab → Galápagos Beak Lab'),
                  '.')
              )
            ),
            // Beak Reference grid
            h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-5' },
              h('h2', { className: 'text-base font-black text-slate-800 mb-3' }, '8 bill shapes — click to learn what each one eats'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                BEAK_TYPES.map(function(b) {
                  var sel = pickedBeak && pickedBeak.id === b.id;
                  return h('button', {
                    key: b.id,
                    onClick: function() { setPickedBeak(sel ? null : b); announce(sel ? 'Closed ' + b.label : 'Showing ' + b.label); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'text-left p-3 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-amber-500/40 birdlab-card-lift ' +
                      (sel ? 'bg-amber-100 border-amber-600 shadow-lg' : 'bg-white border-slate-300 hover:border-amber-500')
                  },
                    h('div', { className: 'flex items-center justify-center bg-slate-50 rounded-lg p-2 mb-2', style: { height: '40px' } },
                      h('svg', { viewBox: '0 0 35 20', style: { width: '60px', height: '32px' } }, b.svg(h))
                    ),
                    h('div', { className: 'text-xs font-bold text-slate-800' }, b.label)
                  );
                })
              ),
              pickedBeak && h('div', { className: 'mt-3 p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-4 flex-wrap', 'aria-live': 'polite' },
                pickedBeak.svg && h('div', { className: 'flex-shrink-0 bg-white rounded-xl border-2 border-amber-300 p-2 shadow-sm', style: { width: 100, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                  h('svg', { viewBox: '0 0 35 20', style: { width: 84, height: 48 }, role: 'img', 'aria-label': pickedBeak.label + ' diagram' }, pickedBeak.svg(h))
                ),
                h('div', { className: 'flex-1 min-w-0' },
                  h('h3', { className: 'text-base font-black text-amber-900 mb-1' }, pickedBeak.label),
                  h('p', { className: 'text-sm text-slate-800 mb-2' },
                    h('strong', null, '🍽 Diet: '), pickedBeak.diet),
                  h('p', { className: 'text-sm text-slate-800' },
                    h('strong', null, '🐦 Examples: '), pickedBeak.examples)
                )
              )
            ),
            // Feet Reference grid
            h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-5' },
              h('h2', { className: 'text-base font-black text-slate-800 mb-3' }, '6 foot types — click to learn how each one moves'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-3' },
                FOOT_TYPES.map(function(f) {
                  var sel = pickedFoot && pickedFoot.id === f.id;
                  return h('button', {
                    key: f.id,
                    onClick: function() { setPickedFoot(sel ? null : f); announce(sel ? 'Closed ' + f.label : 'Showing ' + f.label); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'text-left p-3 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-amber-500/40 birdlab-card-lift ' +
                      (sel ? 'bg-amber-100 border-amber-600 shadow-lg' : 'bg-white border-slate-300 hover:border-amber-500')
                  },
                    h('div', { className: 'flex items-center justify-center bg-slate-50 rounded-lg p-2 mb-2', style: { height: '60px' } },
                      f.svg ? h('svg', { viewBox: '0 0 40 40', style: { width: '60px', height: '52px' } }, f.svg(h))
                            : h('span', { className: 'text-3xl text-slate-400', 'aria-hidden': true }, '🦶')
                    ),
                    h('div', { className: 'text-xs font-bold text-slate-800' }, f.label)
                  );
                })
              ),
              pickedFoot && h('div', { className: 'mt-3 p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-4 flex-wrap', 'aria-live': 'polite' },
                pickedFoot.svg && h('div', { className: 'flex-shrink-0 bg-white rounded-xl border-2 border-amber-300 p-2 shadow-sm', style: { width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
                  h('svg', { viewBox: '0 0 40 40', style: { width: 64, height: 64 }, role: 'img', 'aria-label': pickedFoot.label + ' diagram' }, pickedFoot.svg(h))
                ),
                h('div', { className: 'flex-1 min-w-0' },
                  h('h3', { className: 'text-base font-black text-amber-900 mb-1' }, pickedFoot.label),
                  h('p', { className: 'text-sm text-slate-800 mb-2' },
                    h('strong', null, '🚶 Lifestyle: '), pickedFoot.lifestyle),
                  h('p', { className: 'text-sm text-slate-800' },
                    h('strong', null, '🐦 Examples: '), pickedFoot.examples)
                )
              )
            ),
            // Beak / foot match observations
            h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-5' },
              h('h3', { className: 'text-base font-black text-blue-900 mb-2' }, 'How to read a bird\'s lifestyle in 5 seconds'),
              h('ul', { className: 'space-y-2 text-sm text-slate-800' },
                h('li', { className: 'flex items-start gap-2' },
                  h('span', { className: 'text-blue-700 font-bold flex-shrink-0' }, '◆'),
                  h('span', null,
                    h('strong', null, 'Bill shape → diet. '),
                    'Cone = seeds. Hook = meat. Spear = fish. Long thin probe = insects. Tube = nectar. Chisel = wood.')),
                h('li', { className: 'flex items-start gap-2' },
                  h('span', { className: 'text-blue-700 font-bold flex-shrink-0' }, '◆'),
                  h('span', null,
                    h('strong', null, 'Foot shape → habitat. '),
                    'Webbed = water. Talons = predator. 2-and-2 = climbing tree. Long toes = mud / lily pads. Songbird foot = anywhere with branches.')),
                h('li', { className: 'flex items-start gap-2' },
                  h('span', { className: 'text-blue-700 font-bold flex-shrink-0' }, '◆'),
                  h('span', null,
                    h('strong', null, 'Together: '),
                    'a hooked bill on a webbed foot? You\'re looking at a fish-eating raptor — Bald Eagle, Osprey. A cone bill on a perching foot? Seedeater songbird — cardinal, finch.'))
              )
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS4-2 (Adaptation evidence)', 'NGSS MS-LS4-4 (Natural selection)', 'NGSS HS-LS4-4 (Adaptation produces species variation)'],
              questions: [
                'Charles Darwin\'s Galápagos finches all share a common ancestor but have very different beaks. What process changes one beak shape into another over generations?',
                'Why is bill shape MORE diagnostic than feather color for inferring what a bird eats?',
                'A bird with a sharp hooked bill AND tiny weak feet — what would you predict about its lifestyle? (Hint: this is most owls — feet are powerful but not graceful for walking.)',
                'Foot adaptations sometimes constrain habitat choice. A duck with webbed feet can\'t perch comfortably on twig branches. How does that limit which trees a duck can nest in?'
              ],
              misconceptions: [
                '"All birds with hooked bills hunt the same way" — owls hunt at night using sound; falcons hunt during day using sight + speed; eagles often steal from osprey. Same tool, different approaches.',
                '"Bill shape is fixed within a species" — Galápagos finch research showed bill shape can shift measurably across a few generations of drought selection. Evolution is observable in real time.',
                '"Feet matter less than bills" — feet often constrain WHERE a bird can live more strictly than bills constrain what it can eat. A heron can\'t live in a tree.'
              ],
              extension: 'Visit a bird feeder or watch any park bird for 5 minutes. Try to identify the bill type without looking up the species. Then guess what it eats based on bill alone. Check Merlin Bird ID afterward.',
              sources: 'Cornell Lab All About Birds. Sibley Guide to Birds. Grant & Grant, "How and Why Species Multiply" (2008) — the Galápagos finch evolution research. EvoLab\'s Galápagos Beak Lab (cross-link).'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 4: BIRD CALL TRAINER (Phase 3)
      // Text-based song descriptions paired with Cornell\'s free Merlin
      // Bird ID app for actual audio. Two modes: Mnemonic Reference Card
      // (browse) + Match the Song (4-option quiz). Most teaching value
      // here is the mnemonic — once you have "drink-your-tea" etched in
      // your head, towhees become unmissable in the field.
      // ─────────────────────────────────────────────────────
      function BirdCallTrainer() {
        var mode_state = useState('reference');
        var mode = mode_state[0], setMode = mode_state[1];
        var quizIdx_state = useState(0);
        var quizIdx = quizIdx_state[0], setQuizIdx = quizIdx_state[1];
        var quizPicks_state = useState({});
        var quizPicks = quizPicks_state[0], setQuizPicks = quizPicks_state[1];
        var quizPool_state = useState(function() {
          // Build a shuffled quiz pool of 8 calls
          var pool = FAMOUS_CALLS.slice();
          for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
          }
          return pool.slice(0, 8);
        });
        var quizPool = quizPool_state[0], setQuizPool = quizPool_state[1];

        function pickAnswer(qi, choice) {
          if (quizPicks[qi] != null) return;
          var nq = Object.assign({}, quizPicks); nq[qi] = choice;
          setQuizPicks(nq);
          var current = quizPool[qi];
          announce(choice === current.species ? 'Correct: ' + current.species : 'Not quite — answer was ' + current.species);
        }
        function restartQuiz() {
          var pool = FAMOUS_CALLS.slice();
          for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
          }
          setQuizPool(pool.slice(0, 8));
          setQuizIdx(0);
          setQuizPicks({});
          announce('Quiz reset');
        }

        // Build distractor list for current quiz question (4 options)
        function getQuizChoices(correctIdx) {
          var current = quizPool[correctIdx];
          var distractors = FAMOUS_CALLS.filter(function(c) { return c.species !== current.species; });
          // Shuffle and pick 3
          for (var i = distractors.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = distractors[i]; distractors[i] = distractors[j]; distractors[j] = t;
          }
          var threeWrong = distractors.slice(0, 3).map(function(c) { return c.species; });
          var choices = threeWrong.concat([current.species]);
          // Shuffle final 4
          for (var k = choices.length - 1; k > 0; k--) {
            var l = Math.floor(Math.random() * (k + 1));
            var t2 = choices[k]; choices[k] = choices[l]; choices[l] = t2;
          }
          return choices;
        }

        // Cache quiz choices per index so re-renders don't reshuffle them
        var quizChoicesRef = useRef({});
        if (!quizChoicesRef.current[quizIdx]) {
          quizChoicesRef.current[quizIdx] = getQuizChoices(quizIdx);
        }
        var currentChoices = quizChoicesRef.current[quizIdx];

        var quizScore = Object.keys(quizPicks).reduce(function(acc, k) {
          var i = parseInt(k, 10);
          return acc + (quizPicks[k] === quizPool[i].species ? 1 : 0);
        }, 0);
        var quizAnswered = Object.keys(quizPicks).length;
        var quizComplete = quizAnswered >= quizPool.length;

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🎶', title: 'Bird Call Trainer' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-violet-900 mb-2' }, 'Songs in plain English'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                'Real birders identify 80%+ of birds by SOUND — visual ID is for confirming. The trick is mnemonic phrases that match the bird\'s rhythm: "drink-your-tea" for towhee, "who-cooks-for-you" for Barred Owl. Once you hear it as those words, you can never un-hear it.'),
              h('div', { className: 'p-3 bg-white border border-violet-300 rounded-lg text-sm text-slate-800 mt-2' },
                h('strong', { className: 'text-violet-900' }, '🎵 For actual audio, '),
                'download Cornell Lab\'s free ',
                h('span', { className: 'font-mono font-bold' }, 'Merlin Bird ID'),
                ' app (iOS / Android). Search any species — they have professional recordings of every common North American bird. Pair each mnemonic below with the actual recording.')
            ),
            // Mode picker
            h('div', { 'role': 'tablist', 'aria-label': 'Bird Call Trainer modes', className: 'flex flex-wrap gap-2' },
              h('button', {
                role: 'tab', 'aria-selected': mode === 'reference' ? 'true' : 'false',
                onClick: function() { setMode('reference'); announce('Mnemonic reference mode'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-violet-500/40 ' +
                  (mode === 'reference' ? 'bg-violet-700 text-white border-violet-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-violet-500')
              }, '📖 Mnemonic Reference (' + FAMOUS_CALLS.length + ' calls)'),
              h('button', {
                role: 'tab', 'aria-selected': mode === 'quiz' ? 'true' : 'false',
                onClick: function() { setMode('quiz'); announce('Match the song quiz mode'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-violet-500/40 ' +
                  (mode === 'quiz' ? 'bg-violet-700 text-white border-violet-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-violet-500')
              }, '🎯 Match the Song (' + quizPool.length + '-question quiz)')
            ),
            // REFERENCE MODE
            mode === 'reference' && h('div', { className: 'space-y-3' },
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                FAMOUS_CALLS.map(function(c) {
                  return h('div', { key: c.id, className: 'bg-white rounded-xl border-2 border-violet-200 shadow p-4' },
                    h('div', { className: 'flex items-baseline justify-between gap-2 mb-2 flex-wrap' },
                      h('h3', { className: 'text-base font-black text-slate-800' }, c.species),
                      h('span', { className: 'text-[11px] text-slate-700 font-mono' }, c.habitat)
                    ),
                    h('div', { className: 'p-3 bg-violet-50 border border-violet-200 rounded-lg mb-2' },
                      h('div', { className: 'text-xs font-bold uppercase tracking-wider text-violet-900 mb-1' }, '🎵 Mnemonic'),
                      h('p', { className: 'text-sm text-slate-800 italic' }, c.mnemonic)
                    ),
                    h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' },
                      h('strong', null, 'What it sounds like: '), c.description),
                    h('p', { className: 'text-xs text-emerald-800 leading-relaxed' },
                      h('strong', null, '💡 Tip: '), c.tip)
                  );
                })
              )
            ),
            // QUIZ MODE
            mode === 'quiz' && h('div', { className: 'space-y-4' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', { className: 'text-sm text-slate-700' },
                  h('strong', null, 'Question ' + Math.min(quizIdx + 1, quizPool.length) + ' of ' + quizPool.length),
                  ' · Score: ', h('strong', null, quizScore + ' / ' + quizAnswered)
                ),
                h('button', {
                  onClick: restartQuiz,
                  className: 'px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300 transition focus:outline-none focus:ring-2 ring-slate-400'
                }, '🔄 Restart with new questions')
              ),
              !quizComplete && (function() {
                var current = quizPool[quizIdx];
                var picked = quizPicks[quizIdx];
                return h('div', { className: 'bg-white rounded-2xl border-2 border-violet-300 shadow p-5 space-y-4' },
                  h('div', { className: 'p-4 bg-slate-100 border-l-4 border-violet-500 rounded-lg' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-violet-700 mb-1' }, 'Match this call to the species'),
                    h('p', { className: 'text-base text-slate-800 italic mb-1' }, current.mnemonic),
                    h('p', { className: 'text-sm text-slate-700' }, current.description),
                    h('p', { className: 'text-xs text-slate-700 mt-1' }, h('strong', null, 'Habitat: '), current.habitat)
                  ),
                  h('div', { 'role': 'radiogroup', 'aria-label': 'Species choices', className: 'space-y-2' },
                    currentChoices.map(function(choice) {
                      var sel = (picked === choice);
                      var revealCorrect = picked != null && choice === current.species;
                      var revealWrong = picked === choice && picked !== current.species;
                      var btnClass = 'w-full text-left p-3 rounded-lg border-2 text-sm transition focus:outline-none focus:ring-2 ring-violet-500/40 ';
                      if (revealCorrect) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900 font-semibold';
                      else if (revealWrong) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                      else if (sel) btnClass += 'bg-violet-100 border-violet-500 text-violet-900';
                      else btnClass += 'bg-white border-slate-300 hover:border-violet-400 text-slate-800';
                      return h('button', {
                        key: choice,
                        onClick: function() { pickAnswer(quizIdx, choice); },
                        role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                        'aria-disabled': picked != null ? 'true' : 'false',
                        className: btnClass
                      }, choice);
                    })
                  ),
                  picked != null && h('div', {
                    className: 'p-3 rounded-lg ' + (picked === current.species ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-amber-50 border border-amber-300 text-amber-900'),
                    'aria-live': 'polite'
                  },
                    h('strong', null, picked === current.species ? '✓ Correct — ' : '⚠ Answer was '),
                    current.species, '. ',
                    h('span', { className: 'text-slate-800' }, current.tip)
                  ),
                  picked != null && quizIdx + 1 < quizPool.length && h('div', { className: 'flex justify-end' },
                    h('button', {
                      onClick: function() { setQuizIdx(quizIdx + 1); },
                      className: 'px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition focus:outline-none focus:ring-4 ring-violet-500/40'
                    }, 'Next question →')
                  )
                );
              })(),
              quizComplete && h('div', { className: 'bg-white rounded-2xl border-2 border-emerald-400 shadow p-6 text-center' },
                h('div', { className: 'text-5xl mb-2' }, quizScore === quizPool.length ? '🏆' : quizScore >= quizPool.length * 0.7 ? '🎉' : '🪶'),
                h('h2', { className: 'text-xl font-black text-slate-800 mb-2' },
                  'Quiz complete · ' + quizScore + ' / ' + quizPool.length),
                h('p', { className: 'text-sm text-slate-700 mb-3' },
                  quizScore === quizPool.length ? 'Perfect score. You\'re ready for the field.' :
                  quizScore >= quizPool.length * 0.7 ? 'Strong work. The mnemonics that tripped you up — review those cards.' :
                  'Keep going. Every birder starts here. The Mnemonic Reference is the next stop.'),
                h('button', {
                  onClick: restartQuiz,
                  className: 'px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition focus:outline-none focus:ring-4 ring-violet-500/40'
                }, '🔄 New quiz with fresh questions')
              )
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS4-2 (Adaptation evidence)', 'NGSS MS-LS1-4 (Behavioral roles in survival)', 'CTE Family & Consumer Sciences (observation skills)'],
              questions: [
                'Why do birds sing more at dawn than at any other time of day? (Hint: vocal carrying distance + competing background sounds + territorial signaling.)',
                'A young songbird raised in isolation never produces a normal species song. What does that tell you about how songs are learned?',
                'Two Black-capped Chickadees in the same flock will end their "chick-a-dee" call with different numbers of "dees." What might that variation encode?',
                'Maine\'s state bird is the chickadee, but the loon is on the state quarter. If you had to pick a single Maine bird sound to put on a "soundtrack of Maine," which would it be and why?'
              ],
              misconceptions: [
                '"Female birds don\'t sing" — many female songbirds DO sing, though sometimes more quietly. Female cardinals sing complex songs from the nest. The "only males sing" idea came from biased early research.',
                '"All birds sing the same way" — songbirds (passerines) learn songs from parents like babies learn language. Non-songbirds (doves, owls) inherit calls genetically and don\'t modify them with experience.',
                '"You need an expensive recorder to study bird sound" — Cornell Lab\'s Merlin Bird ID app is FREE, identifies songs in real time using your phone\'s microphone, and is one of the most-used birding tools in the world.'
              ],
              extension: 'Open Merlin Bird ID outside for 5 minutes with Sound ID active. Note every species it picks up. Then: pick ONE species and learn its mnemonic from this module. Listen for it the next day.',
              sources: 'Cornell Lab All About Birds. Merlin Bird ID app (Cornell Lab). Mnemonic phrases collected from Cornell Bird Academy + Sibley Guide to Birds. Bird-language research from Donald Kroodsma\'s "The Singing Life of Birds" (2005).'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 5: HABITAT MATCH (Phase 3)
      // Two reverse-direction games. Bird → Habitat (single-select) and
      // Habitat → Multiple Birds (multi-select). Builds the bidirectional
      // reasoning birders use: "what bird WOULD I expect here?" and "where
      // WOULD I look for that bird?"
      // ─────────────────────────────────────────────────────
      function HabitatMatchLab() {
        var mode_state = useState('birdToHabitat');
        var mode = mode_state[0], setMode = mode_state[1];

        // Bird → Habitat state
        var b2hIdx_state = useState(0);
        var b2hIdx = b2hIdx_state[0], setB2hIdx = b2hIdx_state[1];
        var b2hPicks_state = useState({});
        var b2hPicks = b2hPicks_state[0], setB2hPicks = b2hPicks_state[1];

        // Habitat → Birds state
        var h2bHabitat_state = useState('forest');
        var h2bHabitat = h2bHabitat_state[0], setH2bHabitat = h2bHabitat_state[1];
        var h2bPicks_state = useState({});
        var h2bPicks = h2bPicks_state[0], setH2bPicks = h2bPicks_state[1];
        var h2bRevealed_state = useState({});
        var h2bRevealed = h2bRevealed_state[0], setH2bRevealed = h2bRevealed_state[1];

        // Bird → Habitat helpers
        function pickB2h(idx, habitat) {
          if (b2hPicks[idx] != null) return;
          var np = Object.assign({}, b2hPicks); np[idx] = habitat;
          setB2hPicks(np);
          var correct = BIRD_TO_HABITAT[idx].habitat === habitat;
          announce(correct ? 'Correct' : 'Not quite');
        }
        var b2hScore = Object.keys(b2hPicks).reduce(function(acc, k) {
          var i = parseInt(k, 10);
          return acc + (b2hPicks[k] === BIRD_TO_HABITAT[i].habitat ? 1 : 0);
        }, 0);
        var b2hAnswered = Object.keys(b2hPicks).length;

        // Habitat → Birds helpers
        function toggleH2b(species) {
          if (h2bRevealed[h2bHabitat]) return;
          var current = h2bPicks[h2bHabitat] || {};
          var next = Object.assign({}, current);
          if (next[species]) delete next[species];
          else next[species] = true;
          var nextAll = Object.assign({}, h2bPicks); nextAll[h2bHabitat] = next;
          setH2bPicks(nextAll);
        }
        function revealH2b() {
          var nr = Object.assign({}, h2bRevealed); nr[h2bHabitat] = true;
          setH2bRevealed(nr);
          announce('Answers revealed');
        }
        function resetH2b() {
          var np = Object.assign({}, h2bPicks); delete np[h2bHabitat];
          var nr = Object.assign({}, h2bRevealed); delete nr[h2bHabitat];
          setH2bPicks(np);
          setH2bRevealed(nr);
        }

        var habitatChoices = ['forest', 'marsh', 'backyard', 'coast', 'mountain'];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🌲', title: 'Habitat Match' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-lime-50 border-2 border-lime-400 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-lime-900 mb-2' }, 'Birds and habitats are matched pairs'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'A bird\'s body is shaped to fit a specific habitat — feet, bill, body shape, behavior. Once you know a species\' habitat, you can predict where to look for it. Once you know a habitat, you can predict which species you\'ll find there. Real birders use both directions of this reasoning.')
            ),
            // Mode picker
            h('div', { 'role': 'tablist', 'aria-label': 'Habitat Match modes', className: 'flex flex-wrap gap-2' },
              h('button', {
                role: 'tab', 'aria-selected': mode === 'birdToHabitat' ? 'true' : 'false',
                onClick: function() { setMode('birdToHabitat'); announce('Bird to Habitat mode'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-lime-500/40 ' +
                  (mode === 'birdToHabitat' ? 'bg-lime-700 text-white border-lime-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-lime-500')
              }, '🐦 → 🌲 Bird to Habitat'),
              h('button', {
                role: 'tab', 'aria-selected': mode === 'habitatToBirds' ? 'true' : 'false',
                onClick: function() { setMode('habitatToBirds'); announce('Habitat to Birds mode'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-lime-500/40 ' +
                  (mode === 'habitatToBirds' ? 'bg-lime-700 text-white border-lime-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-lime-500')
              }, '🌲 → 🐦 Habitat to Birds')
            ),
            // BIRD → HABITAT MODE
            mode === 'birdToHabitat' && h('div', { className: 'space-y-4' },
              h('div', { className: 'flex items-center justify-between text-sm text-slate-700 flex-wrap gap-2' },
                h('div', null, h('strong', null, 'Question ' + (b2hIdx + 1) + ' of ' + BIRD_TO_HABITAT.length), ' · Score: ', h('strong', null, b2hScore + ' / ' + b2hAnswered)),
                h('div', { className: 'flex gap-2' },
                  h('button', {
                    onClick: function() { setB2hIdx(Math.max(0, b2hIdx - 1)); },
                    'aria-disabled': b2hIdx === 0 ? 'true' : 'false',
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 ring-lime-400 ' +
                      (b2hIdx === 0 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-lime-600 text-white hover:bg-lime-700')
                  }, '← Prev'),
                  h('button', {
                    onClick: function() { setB2hIdx(Math.min(BIRD_TO_HABITAT.length - 1, b2hIdx + 1)); },
                    'aria-disabled': b2hIdx === BIRD_TO_HABITAT.length - 1 ? 'true' : 'false',
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition focus:outline-none focus:ring-2 ring-lime-400 ' +
                      (b2hIdx === BIRD_TO_HABITAT.length - 1 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-lime-600 text-white hover:bg-lime-700')
                  }, 'Next →')
                )
              ),
              (function() {
                var current = BIRD_TO_HABITAT[b2hIdx];
                var picked = b2hPicks[b2hIdx];
                return h('div', { className: 'bg-white rounded-2xl border-2 border-lime-300 shadow p-5 space-y-4' },
                  h('div', { className: 'text-center' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-lime-700 mb-1' }, 'Where would you find this species?'),
                    h('h3', { className: 'text-2xl font-black text-slate-800' }, current.bird)
                  ),
                  h('div', { 'role': 'radiogroup', 'aria-label': 'Habitat choices', className: 'grid grid-cols-2 md:grid-cols-5 gap-2' },
                    habitatChoices.map(function(hid) {
                      var hab = HABITAT_BIRD_MAP[hid];
                      var sel = (picked === hid);
                      var revealCorrect = picked != null && current.habitat === hid;
                      var revealWrong = picked === hid && picked !== current.habitat;
                      var btnClass = 'p-3 rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-lime-500/40 ';
                      if (revealCorrect) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900';
                      else if (revealWrong) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                      else if (sel) btnClass += 'bg-lime-100 border-lime-500 text-lime-900';
                      else btnClass += 'bg-white border-slate-300 hover:border-lime-400 text-slate-800';
                      return h('button', {
                        key: hid,
                        onClick: function() { pickB2h(b2hIdx, hid); },
                        role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                        'aria-disabled': picked != null ? 'true' : 'false',
                        className: btnClass
                      },
                        h('div', { className: 'text-2xl mb-1', 'aria-hidden': true }, hab.icon),
                        h('div', null, hab.label)
                      );
                    })
                  ),
                  picked != null && h('div', {
                    className: 'p-3 rounded-lg ' + (picked === current.habitat ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' : 'bg-amber-50 border border-amber-300 text-amber-900'),
                    'aria-live': 'polite'
                  },
                    h('strong', null, picked === current.habitat ? '✓ Correct: ' : '⚠ Best answer: '),
                    HABITAT_BIRD_MAP[current.habitat].label, '. ',
                    h('span', { className: 'text-slate-800' }, current.reason)
                  )
                );
              })()
            ),
            // HABITAT → BIRDS MODE
            mode === 'habitatToBirds' && h('div', { className: 'space-y-4' },
              h('div', null,
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, 'Pick a habitat'),
                h('div', { 'role': 'radiogroup', 'aria-label': 'Habitat selection', className: 'flex flex-wrap gap-2' },
                  habitatChoices.map(function(hid) {
                    var hab = HABITAT_BIRD_MAP[hid];
                    var sel = (h2bHabitat === hid);
                    return h('button', {
                      key: hid,
                      onClick: function() { setH2bHabitat(hid); },
                      role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                      className: 'px-3 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-lime-500/40 ' +
                        (sel ? 'bg-lime-700 text-white border-lime-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-lime-500')
                    },
                      h('span', { className: 'mr-1', 'aria-hidden': true }, hab.icon),
                      hab.label
                    );
                  })
                )
              ),
              (function() {
                var hab = HABITAT_BIRD_MAP[h2bHabitat];
                // Pool: all "belong" + "dontBelong" species, shuffled deterministically per habitat
                var pool = hab.belong.concat(hab.dontBelong);
                // Stable sort by name so layout doesn't reshuffle on each render
                pool.sort();
                var picks = h2bPicks[h2bHabitat] || {};
                var revealed = !!h2bRevealed[h2bHabitat];
                var correctPicks = pool.filter(function(s) { return picks[s] && hab.belong.indexOf(s) !== -1; }).length;
                var wrongPicks = pool.filter(function(s) { return picks[s] && hab.belong.indexOf(s) === -1; }).length;
                var pickedTotal = Object.keys(picks).length;

                return h('div', { className: 'bg-white rounded-2xl border-2 border-lime-300 shadow p-5 space-y-4' },
                  h('h3', { className: 'text-xl font-black text-slate-800' },
                    hab.icon + ' ' + hab.label,
                    h('span', { className: 'ml-2 text-sm font-normal text-slate-700' }, '(pick all the species you\'d find here)')
                  ),
                  h('p', { className: 'text-xs text-slate-700' },
                    revealed ? ('Correct picks: ' + correctPicks + ' of ' + hab.belong.length + ' · Wrong picks: ' + wrongPicks) :
                    ('Selected: ' + pickedTotal + ' (target: ' + hab.belong.length + ')')
                  ),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                    pool.map(function(species) {
                      var picked = !!picks[species];
                      var belongs = hab.belong.indexOf(species) !== -1;
                      var revealCorrect = revealed && belongs;
                      var revealMissed = revealed && belongs && !picked;
                      var revealWrong = revealed && !belongs && picked;
                      var btnClass = 'text-left p-3 rounded-lg border-2 text-sm font-semibold transition focus:outline-none focus:ring-2 ring-lime-500/40 ';
                      if (revealMissed) btnClass += 'bg-amber-100 border-amber-500 text-amber-900';
                      else if (revealWrong) btnClass += 'bg-rose-100 border-rose-500 text-rose-900';
                      else if (revealCorrect && picked) btnClass += 'bg-emerald-100 border-emerald-500 text-emerald-900';
                      else if (revealCorrect) btnClass += 'bg-emerald-50 border-emerald-300 text-emerald-800';
                      else if (revealed && !belongs) btnClass += 'bg-slate-100 border-slate-300 text-slate-700 opacity-70';
                      else if (picked) btnClass += 'bg-lime-100 border-lime-500 text-lime-900';
                      else btnClass += 'bg-white border-slate-300 hover:border-lime-400 text-slate-800';
                      return h('button', {
                        key: species,
                        onClick: function() { toggleH2b(species); },
                        'aria-pressed': picked ? 'true' : 'false',
                        'aria-disabled': revealed ? 'true' : 'false',
                        className: btnClass
                      },
                        h('span', { className: 'mr-1.5' },
                          revealMissed ? '⊘' :
                          revealWrong ? '✗' :
                          (revealCorrect && picked) ? '✓' :
                          revealCorrect ? '✓' :
                          picked ? '☑' : '☐'),
                        species
                      );
                    })
                  ),
                  h('div', { className: 'flex justify-end gap-2' },
                    revealed ? h('button', {
                      onClick: resetH2b,
                      className: 'px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-sm hover:bg-slate-300 transition focus:outline-none focus:ring-2 ring-slate-400'
                    }, '🔄 Reset this habitat') : h('button', {
                      onClick: revealH2b,
                      'aria-disabled': pickedTotal === 0 ? 'true' : 'false',
                      className: 'px-4 py-2 rounded-xl font-bold text-sm transition focus:outline-none focus:ring-4 ring-lime-500/40 ' +
                        (pickedTotal === 0 ? 'bg-slate-200 text-slate-700 cursor-not-allowed' : 'bg-lime-600 text-white hover:bg-lime-700')
                    }, 'Check answers')
                  ),
                  revealed && h('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded-lg text-sm text-slate-800', 'aria-live': 'polite' },
                    h('strong', null, '✓ correct (you got)  '),
                    h('span', null, '⊘ correct (you missed)  '),
                    h('span', null, '✗ incorrect (you picked)')
                  )
                );
              })()
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS2-2 (Ecosystem dynamics)', 'NGSS HS-LS2-7 (Reduce human impact)', 'NGSS MS-LS2-1 (Resource availability)'],
              questions: [
                'Some species (chickadees, robins, Cooper\'s hawks) live in MULTIPLE habitats. What kind of bird tends to be a habitat generalist? What kind tends to be a specialist? Which is more vulnerable when habitats change?',
                'Atlantic Puffins are extreme specialists — they nest only on remote ocean islands. What does that say about their conservation risk?',
                'A backyard with a feeder, water source, and native plants attracts more bird species than one with just lawn. Why? What are the resources each adds?'
              ],
              misconceptions: [
                '"Birds can live anywhere as long as there\'s food" — most birds need specific structural habitat (cavities, water, dense undergrowth) AS WELL AS food. Loss of structure (cutting old trees, draining wetlands) causes population declines even when food is still available.',
                '"Habitat loss = forests cut down" — habitat loss includes wetlands drained, beaches developed, prairies plowed, grasslands converted to monoculture crops. Every type of habitat has its specialist species.'
              ],
              extension: 'Pick the habitat closest to where you live. Spend 15 minutes with Merlin Bird ID open and Sound ID running. Compare what you actually hear to what this module predicted.',
              sources: 'Cornell Lab All About Birds + Birds of the World (subscription, but library access). Audubon Field Guide. Maine Audubon habitat-bird checklists.'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 6: MAINE BIRDS SPOTLIGHT (Phase 4)
      // 25 Maine species cards filterable by status (year-round / breeder /
      // winter / migrant) + Maine Birding Trail hotspot directory.
      // ─────────────────────────────────────────────────────
      function MaineBirdsSpotlight() {
        var filter_state = useState('all');
        var filter = filter_state[0], setFilter = filter_state[1];
        var picked_state = useState(null);
        var picked = picked_state[0], setPicked = picked_state[1];
        var view_state = useState('species');
        var view = view_state[0], setLocalView = view_state[1];

        // Filter buttons
        var STATUS_FILTERS = [
          { id: 'all',                 label: 'All ' + MAINE_BIRDS.length,                                                      match: function(b) { return true; } },
          { id: 'year-round',          label: 'Year-round',          match: function(b) { return /year-round/i.test(b.mainStatus); } },
          { id: 'breeder',             label: 'Breeders (summer)',   match: function(b) { return /breeder/i.test(b.mainStatus); } },
          { id: 'winter',              label: 'Winter / irruptive',  match: function(b) { return /winter|irruptive/i.test(b.mainStatus); } },
          { id: 'migrant',             label: 'Passage migrants',    match: function(b) { return /migrant/i.test(b.mainStatus) && !/breeder|year-round/i.test(b.mainStatus); } }
        ];

        var visibleBirds = MAINE_BIRDS.filter(STATUS_FILTERS.filter(function(f) { return f.id === filter; })[0].match);

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🌲', title: 'Maine Birds Spotlight' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { className: 'bg-stone-100 border-2 border-stone-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-stone-900 mb-2' }, 'Maine birds — 25 species, real Maine stories'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                '25 iconic Maine species with year-round status, where to see them, real Maine conservation stories (Project Puffin, Bald Eagle DDT recovery, Wood Thrush decline), and Maine Audubon-aligned hotspot suggestions. Click any card to see its full story.')
            ),
            // View tabs (Species vs Hotspots)
            h('div', { 'role': 'tablist', 'aria-label': 'Maine birds view', className: 'flex flex-wrap gap-2' },
              h('button', {
                role: 'tab', 'aria-selected': view === 'species' ? 'true' : 'false',
                onClick: function() { setLocalView('species'); announce('Species view'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-stone-500/40 ' +
                  (view === 'species' ? 'bg-stone-700 text-white border-stone-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-stone-500')
              }, '🐦 25 Species'),
              h('button', {
                role: 'tab', 'aria-selected': view === 'hotspots' ? 'true' : 'false',
                onClick: function() { setLocalView('hotspots'); setPicked(null); announce('Maine birding hotspots view'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-stone-500/40 ' +
                  (view === 'hotspots' ? 'bg-stone-700 text-white border-stone-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-stone-500')
              }, '📍 Maine Birding Hotspots (' + MAINE_BIRDING_HOTSPOTS.length + ')')
            ),
            view === 'species' && h('div', { className: 'space-y-4' },
              // Status filter
              h('div', { 'role': 'radiogroup', 'aria-label': 'Filter by status', className: 'flex flex-wrap gap-2' },
                STATUS_FILTERS.map(function(f) {
                  var sel = (filter === f.id);
                  return h('button', {
                    key: f.id,
                    onClick: function() { setFilter(f.id); setPicked(null); },
                    role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                    className: 'px-3 py-1.5 rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-stone-500/40 ' +
                      (sel ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-400')
                  }, f.label);
                })
              ),
              h('div', { className: 'text-xs text-slate-700 italic' },
                'Showing ' + visibleBirds.length + ' species'),
              // Card grid
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' },
                visibleBirds.map(function(b) {
                  var sel = picked && picked.name === b.name;
                  var sp = b.speciesKey ? BIRDS[b.speciesKey] : null;
                  return h('button', {
                    key: b.name,
                    onClick: function() { setPicked(sel ? null : b); announce(sel ? 'Closed ' + b.name : 'Showing ' + b.name); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'text-left p-4 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-stone-500/40 birdlab-card-lift ' +
                      (sel ? 'bg-stone-100 border-stone-600 shadow-lg' : 'bg-white border-slate-300 hover:border-stone-500')
                  },
                    h('div', { className: 'flex items-start gap-2 mb-2' },
                      sp ? h('svg', { viewBox: '0 0 30 30', style: { width: '36px', height: '36px', flexShrink: 0 }, role: 'img', 'aria-label': b.name },
                        h('g', { transform: 'translate(2, 2)' }, sp.svg(h))
                      ) : h('span', { className: 'text-2xl flex-shrink-0', 'aria-hidden': true }, '🐦'),
                      h('div', { className: 'flex-1 min-w-0' },
                        h('div', { className: 'text-sm font-black text-slate-800' }, b.name),
                        h('div', { className: 'text-[11px] italic text-slate-700' }, b.sciName)
                      )
                    ),
                    h('div', { className: 'text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1' }, b.mainStatus),
                    b.iconicStatus && h('div', { className: 'text-[10px] text-amber-700 italic mb-1' }, '⭐ ' + b.iconicStatus),
                    h('p', { className: 'text-xs text-slate-700 leading-relaxed line-clamp-2' }, b.habitat)
                  );
                })
              ),
              // Detail card for picked species
              picked && (function() {
                // ── Habitat-themed hero band ──
                var hb = (picked.habitat || '').toLowerCase();
                var scene;
                if (/marsh|wetland|swamp|estuar/i.test(hb)) {
                  scene = {
                    label: 'Wetland', icon: '🪿',
                    skyA: '#bae6fd', skyB: '#fef9c3',
                    waterTop: '#34d399', waterBot: '#0d9488',
                    silhouettes: function() { return [
                      // Reeds
                      h('g', { key: 'rds', stroke: '#065f46', strokeWidth: 2, strokeLinecap: 'round', opacity: 0.85 },
                        [40, 55, 78, 96, 112, 138, 160, 188, 208, 240, 270, 296, 322, 350, 380, 412, 444, 478, 502, 524].map(function(x, i) {
                          var hgt = 22 + (i % 5) * 4;
                          return h('line', { key: 'r' + i, x1: x, y1: 130, x2: x + (i % 2 ? 1 : -1), y2: 130 - hgt });
                        })
                      ),
                      // Cattail tops
                      [60, 100, 145, 200, 260, 310, 380, 440, 500].map(function(x, i) {
                        var hgt = 18 + (i % 3) * 3;
                        return h('rect', { key: 'ct' + i, x: x - 1.5, y: 130 - hgt - 6, width: 3, height: 6, fill: '#78350f', opacity: 0.85 });
                      })
                    ]; },
                    accent: 'emerald'
                  };
                } else if (/coast|ocean|sea|island|shore|beach|tidal|marine/i.test(hb)) {
                  scene = {
                    label: 'Coastal', icon: '🌊',
                    skyA: '#bfdbfe', skyB: '#fef3c7',
                    waterTop: '#60a5fa', waterBot: '#1e40af',
                    silhouettes: function() { return [
                      // Wave crests
                      h('path', { key: 'w1', d: 'M0,118 Q30,112 60,118 T120,118 T180,118 T240,118 T300,118 T360,118 T420,118 T480,118 T540,118',
                        fill: 'none', stroke: '#f8fafc', strokeWidth: 1.5, opacity: 0.6 }),
                      h('path', { key: 'w2', d: 'M0,128 Q35,123 70,128 T140,128 T210,128 T280,128 T350,128 T420,128 T490,128 T540,128',
                        fill: 'none', stroke: '#f8fafc', strokeWidth: 1.2, opacity: 0.5 }),
                      // Distant rocks/islands
                      h('path', { key: 'rk1', d: 'M40,108 Q60,100 80,108 L80,118 L40,118 Z', fill: '#475569', opacity: 0.7 }),
                      h('path', { key: 'rk2', d: 'M380,112 Q420,102 460,112 L460,118 L380,118 Z', fill: '#334155', opacity: 0.7 }),
                      // Lighthouse silhouette far right
                      h('g', { key: 'lh', opacity: 0.7 },
                        h('path', { d: 'M488,90 L490,108 L502,108 L504,90 L498,84 Z', fill: '#1e293b' }),
                        h('rect', { x: 494, y: 86, width: 4, height: 4, fill: '#fbbf24', opacity: 0.8 })
                      )
                    ]; },
                    accent: 'sky'
                  };
                } else if (/forest|wood|conifer|spruce|pine|hemlock|maple|oak|deciduous/i.test(hb)) {
                  scene = {
                    label: 'Forest', icon: '🌲',
                    skyA: '#dcfce7', skyB: '#fef9c3',
                    waterTop: '#166534', waterBot: '#14532d',
                    silhouettes: function() { return [
                      // Pines (algorithmic)
                      Array.from({length: 18}, function(_, i) {
                        var x = 18 + i * 30 + ((i * 7) % 11);
                        var hgt = 60 + ((i * 13) % 35);
                        return h('path', { key: 'pn' + i,
                          d: 'M' + x + ',' + (130 - hgt) + ' L' + (x - 14) + ',130 L' + (x + 14) + ',130 Z',
                          fill: i % 3 === 0 ? '#14532d' : '#166534',
                          opacity: 0.85 + (i % 4) * 0.04 });
                      })
                    ]; },
                    accent: 'emerald'
                  };
                } else if (/sky|aerial|cliff|mountain|alpine|tundra|raptor|soar/i.test(hb)) {
                  scene = {
                    label: 'Sky / Cliffs', icon: '⛰',
                    skyA: '#dbeafe', skyB: '#fce7f3',
                    waterTop: '#94a3b8', waterBot: '#475569',
                    silhouettes: function() { return [
                      // Mountain layers
                      h('path', { key: 'm1', d: 'M0,124 L60,90 L130,108 L210,82 L290,104 L360,76 L430,98 L510,86 L540,94 L540,140 L0,140 Z',
                        fill: '#94a3b8', opacity: 0.6 }),
                      h('path', { key: 'm2', d: 'M0,138 L80,108 L170,124 L260,100 L340,118 L420,98 L510,114 L540,110 L540,140 L0,140 Z',
                        fill: '#64748b', opacity: 0.85 }),
                      // Soaring birds (V silhouettes)
                      [{x:120,y:50},{x:200,y:42},{x:340,y:48},{x:430,y:38}].map(function(b, i) {
                        return h('path', { key: 'sb' + i,
                          d: 'M' + b.x + ',' + b.y + ' Q' + (b.x + 5) + ',' + (b.y - 4) + ' ' + (b.x + 10) + ',' + b.y + ' Q' + (b.x + 15) + ',' + (b.y - 4) + ' ' + (b.x + 20) + ',' + b.y,
                          fill: 'none', stroke: '#1e293b', strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.8 });
                      })
                    ]; },
                    accent: 'slate'
                  };
                } else if (/grass|meadow|field|prairie|farmland|open/i.test(hb)) {
                  scene = {
                    label: 'Grassland', icon: '🌾',
                    skyA: '#fef3c7', skyB: '#fef9c3',
                    waterTop: '#a3e635', waterBot: '#65a30d',
                    silhouettes: function() { return [
                      // Grass tufts
                      Array.from({length: 30}, function(_, i) {
                        var x = i * 18 + ((i * 5) % 11);
                        var hgt = 8 + ((i * 7) % 12);
                        return h('g', { key: 'g' + i, stroke: '#3f6212', strokeWidth: 1.5, strokeLinecap: 'round' },
                          h('line', { x1: x, y1: 130, x2: x - 2, y2: 130 - hgt }),
                          h('line', { x1: x, y1: 130, x2: x, y2: 130 - hgt - 2 }),
                          h('line', { x1: x, y1: 130, x2: x + 2, y2: 130 - hgt })
                        );
                      })
                    ]; },
                    accent: 'lime'
                  };
                } else if (/urban|backyard|feeder|park|garden|town/i.test(hb)) {
                  scene = {
                    label: 'Urban / Backyard', icon: '🏠',
                    skyA: '#e0f2fe', skyB: '#fef3c7',
                    waterTop: '#86efac', waterBot: '#16a34a',
                    silhouettes: function() { return [
                      // Roofline silhouettes
                      h('path', { key: 'rf1', d: 'M0,128 L0,108 L40,108 L60,90 L80,108 L120,108 L120,128 Z', fill: '#475569', opacity: 0.7 }),
                      h('path', { key: 'rf2', d: 'M180,128 L180,114 L220,114 L240,98 L260,114 L300,114 L300,128 Z', fill: '#334155', opacity: 0.75 }),
                      h('path', { key: 'rf3', d: 'M380,128 L380,104 L420,104 L440,86 L460,104 L500,104 L500,128 Z', fill: '#475569', opacity: 0.7 }),
                      // Trees between houses
                      h('circle', { key: 't1', cx: 150, cy: 110, r: 14, fill: '#15803d', opacity: 0.85 }),
                      h('circle', { key: 't2', cx: 340, cy: 116, r: 12, fill: '#15803d', opacity: 0.85 }),
                      // Bird feeder hanging
                      h('g', { key: 'fdr', opacity: 0.9 },
                        h('line', { x1: 250, y1: 80, x2: 250, y2: 96, stroke: '#1e293b', strokeWidth: 1 }),
                        h('rect', { x: 244, y: 96, width: 12, height: 8, fill: '#78350f' }),
                        h('path', { d: 'M242,96 L250,90 L258,96 Z', fill: '#b45309' })
                      )
                    ]; },
                    accent: 'emerald'
                  };
                } else {
                  scene = {
                    label: 'Habitat', icon: '🌿',
                    skyA: '#e0f2fe', skyB: '#fef3c7',
                    waterTop: '#a7f3d0', waterBot: '#10b981',
                    silhouettes: function() { return []; },
                    accent: 'emerald'
                  };
                }
                return h('div', { className: 'bg-white rounded-2xl border-2 border-stone-500 shadow-lg overflow-hidden', 'aria-live': 'polite' },
                  // Hero band
                  h('div', { className: 'relative', style: { lineHeight: 0 } },
                    h('svg', { viewBox: '0 0 540 140', width: '100%', preserveAspectRatio: 'none',
                      style: { display: 'block', height: 140 },
                      'aria-hidden': 'true'
                    },
                      h('defs', null,
                        h('linearGradient', { id: 'mbsky-' + picked.name.replace(/[^a-z0-9]/gi, ''), x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                          h('stop', { offset: '0%', stopColor: scene.skyA }),
                          h('stop', { offset: '100%', stopColor: scene.skyB })
                        ),
                        h('linearGradient', { id: 'mbgnd-' + picked.name.replace(/[^a-z0-9]/gi, ''), x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                          h('stop', { offset: '0%', stopColor: scene.waterTop }),
                          h('stop', { offset: '100%', stopColor: scene.waterBot })
                        )
                      ),
                      h('rect', { x: 0, y: 0, width: 540, height: 140, fill: 'url(#mbsky-' + picked.name.replace(/[^a-z0-9]/gi, '') + ')' }),
                      h('rect', { x: 0, y: 130, width: 540, height: 10, fill: 'url(#mbgnd-' + picked.name.replace(/[^a-z0-9]/gi, '') + ')' }),
                      scene.silhouettes()
                    ),
                    // Habitat label pill (top-right of band)
                    h('div', {
                      style: {
                        position: 'absolute', top: 10, right: 12,
                        background: 'rgba(255,255,255,0.85)',
                        border: '1.5px solid #94a3b8',
                        borderRadius: 999, padding: '3px 10px',
                        fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                        textTransform: 'uppercase', color: '#334155',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                      }
                    }, scene.icon + ' ' + scene.label),
                    // Bird name + status overlay (bottom-left, above silhouettes)
                    h('div', {
                      style: {
                        position: 'absolute', bottom: 12, left: 16, right: 16,
                        display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap'
                      }
                    },
                      // Bird SVG enlarged with white circle backdrop
                      picked.speciesKey && BIRDS[picked.speciesKey] && h('div', {
                        style: {
                          width: 76, height: 76, flexShrink: 0,
                          borderRadius: '50%', background: 'rgba(255,255,255,0.92)',
                          border: '3px solid #ffffff',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }
                      },
                        h('svg', { viewBox: '0 0 30 30', style: { width: '60px', height: '60px' }, role: 'img', 'aria-label': picked.name },
                          h('g', { transform: 'translate(2, 2)' }, BIRDS[picked.speciesKey].svg(h))
                        )
                      ),
                      h('div', { style: { flex: 1, minWidth: 200 } },
                        h('h3', {
                          style: {
                            fontSize: '1.5rem', fontWeight: 900, color: '#1e293b',
                            textShadow: '0 1px 0 #ffffff, 0 2px 6px rgba(255,255,255,0.85)',
                            lineHeight: 1.1, marginBottom: 2
                          }
                        }, picked.name),
                        h('div', {
                          style: {
                            fontSize: 13, fontStyle: 'italic', color: '#1e293b',
                            textShadow: '0 1px 0 rgba(255,255,255,0.85)'
                          }
                        }, picked.sciName)
                      )
                    )
                  ),
                  // Status row (just below hero)
                  h('div', { className: 'px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-700' }, picked.mainStatus),
                    picked.iconicStatus && h('div', { className: 'text-xs text-amber-700 italic' }, '⭐ ' + picked.iconicStatus)
                  ),
                  // Body content
                  h('div', { className: 'p-5 space-y-3' },
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                  h('div', { className: 'p-3 bg-emerald-50 border border-emerald-200 rounded-lg' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1' }, '🌲 Habitat'),
                    h('p', { className: 'text-sm text-slate-800' }, picked.habitat)
                  ),
                  h('div', { className: 'p-3 bg-blue-50 border border-blue-200 rounded-lg' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, '📅 Best Season'),
                    h('p', { className: 'text-sm text-slate-800' }, picked.bestSeason)
                  )
                ),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, '📍 Where to look'),
                  h('p', { className: 'text-sm text-slate-800' }, picked.seeWhere)
                ),
                h('div', { className: 'p-3 bg-violet-50 border border-violet-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-violet-900 mb-1' }, '✨ Did you know'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, picked.funFact)
                ),
                h('div', { className: 'p-3 bg-slate-100 border border-slate-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '📡 Citizen science'),
                  h('p', { className: 'text-sm text-slate-800' }, picked.citizen)
                ),
                // ── Open in... external resource cluster ──
                h('div', { className: 'p-3 bg-white border-2 border-emerald-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2' }, '🔗 Open in real-world resources'),
                  h('p', { className: 'text-xs text-slate-700 italic mb-2' },
                    'Verify, hear songs, see photos, log a sighting — links open in a new tab.'),
                  birdLinkButtons(picked.name, picked.sciName)
                )
                  )  // close p-5 space-y-3 body-content div
                );   // close return h('div') overflow-hidden card
              })()
            ),
            view === 'hotspots' && h('div', { className: 'space-y-3' },
              h('p', { className: 'text-sm text-slate-700 italic' },
                'Maine has dozens of birding hotspots; these are the most accessible + species-rich. Most are free to visit. Maine Audubon (maineaudubon.org) maintains the official Maine Birding Trail with detailed driving directions.'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                MAINE_BIRDING_HOTSPOTS.map(function(spot) {
                  return h('div', { key: spot.name, className: 'bg-white border-2 border-stone-300 rounded-xl shadow p-4' },
                    h('div', { className: 'flex items-baseline justify-between gap-2 flex-wrap mb-1' },
                      h('h3', { className: 'text-base font-black text-slate-800' }, spot.name),
                      h('span', { className: 'text-xs font-mono text-stone-700' }, '📍 ' + spot.area)
                    ),
                    h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, spot.highlight)
                  );
                })
              ),
              h('div', { className: 'p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-sm text-slate-800' },
                h('strong', { className: 'text-blue-900' }, '🔗 Plan a trip: '),
                'Visit ', h('span', { className: 'font-mono' }, 'maineaudubon.org'),
                ' for the official Maine Birding Trail with directions, accessibility info, parking, and seasonal notes. Most hotspots have free Maine Audubon-led walks during peak migration.')
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS2-2 (Ecosystem dynamics)', 'NGSS HS-LS2-7 (Reduce human impact)', 'NGSS MS-LS2-5 (Biodiversity + ecosystem services)', 'Maine Learning Results — Place-Based Education'],
              questions: [
                'Project Puffin (1973) used decoys + recordings to bring puffins back to Eastern Egg Rock. Why did the puffins disappear in the first place, and why did this restoration approach work?',
                'Wood Thrushes have declined 50%+ since 1970. Their forests in Maine are still mostly intact. Where might the population pressure actually come from?',
                'Bald Eagles in Maine recovered from 21 nesting pairs (1972) to ~700 today. What changed between then and now? (Hint: 1972 EPA action.)',
                'Maine\'s state bird is the Black-capped Chickadee. Maine\'s state quarter shows a Common Loon. If you had to pick a single Maine bird as the "essential Maine experience," which would you pick and why?'
              ],
              misconceptions: [
                '"All Maine birds live here year-round" — only ~8 of these 25 are year-round. Most Maine birds migrate; warblers especially go to Central + South America for half the year.',
                '"Habitat loss in Maine is what threatens Maine birds" — partly true, but for many species (warblers, Wood Thrush, swallows) the threats are on the WINTERING grounds in Latin America. International cooperation matters.',
                '"Snowy Owls only show up in Arctic-tundra movies" — coastal Maine is roughly the southernmost regular wintering range. Most Maine school-age kids could see one in an irruption year if they knew where to look.'
              ],
              extension: 'Pick a Maine birding hotspot near you. Plan a 1-hour visit during peak season (May for migrants, July for breeders, January for winter visitors). Keep an eBird checklist of everything you see + hear.',
              sources: 'Maine Audubon (maineaudubon.org). Cornell Lab All About Birds. Project Puffin (Audubon Seabird Restoration Program). Maine Bird Atlas data. Rosenberg et al. 2019 "Decline of the North American avifauna" (Science).'
            })
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // MODULE 7: MIGRATION PATTERNS (Phase 4)
      // 4 flyways + Maine seasonal calendar + 8 featured migrators with
      // strategy + distance + Maine context. Cross-link to existing
      // stem_tool_migration.js for V-formation flight physics.
      // ─────────────────────────────────────────────────────
      function MigrationPatternsLab() {
        var view_state = useState('flyways');
        var view = view_state[0], setLocalView = view_state[1];
        var pickedFlyway_state = useState('atlantic');
        var pickedFlyway = pickedFlyway_state[0], setPickedFlyway = pickedFlyway_state[1];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🗺️', title: 'Migration Patterns' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { className: 'bg-orange-50 border-2 border-orange-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-orange-900 mb-2' }, 'Why birds move'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                'Migration is one of the most dramatic phenomena in biology. Some birds fly continents twice a year, navigating by stars, magnetic fields, smell, and learned landmarks. Most don\'t. The patterns matter for both science and conservation: a species that breeds in Maine and winters in Costa Rica needs BOTH habitats intact.'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'This module covers the four North American flyways, Maine\'s seasonal calendar, and 8 featured migrator strategies. For the physics of HOW birds fly (V-formation aerodynamics, energy efficiency), see the dedicated ',
                h('strong', { className: 'font-mono' }, 'Migration & Wind Patterns Lab'),
                ' (cross-link below).')
            ),
            // View tabs
            h('div', { 'role': 'tablist', 'aria-label': 'Migration sections', className: 'flex flex-wrap gap-2' },
              h('button', {
                role: 'tab', 'aria-selected': view === 'flyways' ? 'true' : 'false',
                onClick: function() { setLocalView('flyways'); announce('Flyways view'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                  (view === 'flyways' ? 'bg-orange-700 text-white border-orange-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-500')
              }, '🗺️ Flyways'),
              h('button', {
                role: 'tab', 'aria-selected': view === 'calendar' ? 'true' : 'false',
                onClick: function() { setLocalView('calendar'); announce('Maine calendar view'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                  (view === 'calendar' ? 'bg-orange-700 text-white border-orange-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-500')
              }, '📅 Maine Calendar'),
              h('button', {
                role: 'tab', 'aria-selected': view === 'featured' ? 'true' : 'false',
                onClick: function() { setLocalView('featured'); announce('Featured migrators view'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                  (view === 'featured' ? 'bg-orange-700 text-white border-orange-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-500')
              }, '🐦 8 Featured Migrators')
            ),
            // FLYWAYS VIEW
            view === 'flyways' && h('div', { className: 'space-y-4' },
              h('p', { className: 'text-sm text-slate-700' },
                'North America has four major migration flyways — geographic corridors that funnel migrating birds. Maine sits squarely on the ',
                h('strong', null, 'Atlantic Flyway'), '.'),
              // ── Flyways map: distinct colors per route, bird silhouettes along active path, Maine star ──
              (function() {
                var flyways = [
                  { id: 'pacific',     color: '#0ea5e9', label: 'Pacific',     d: 'M 60 60 Q 55 110 65 160 Q 78 210 95 240 Q 110 260 130 268' },
                  { id: 'central',     color: '#f97316', label: 'Central',     d: 'M 175 50 Q 178 110 195 165 Q 212 220 230 250 Q 245 268 260 270' },
                  { id: 'mississippi', color: '#a855f7', label: 'Mississippi', d: 'M 240 50 Q 248 110 270 165 Q 290 215 305 245 Q 318 265 335 270' },
                  { id: 'atlantic',    color: '#dc2626', label: 'Atlantic',    d: 'M 340 60 Q 348 110 360 160 Q 372 210 380 245 Q 384 262 380 270' }
                ];
                var activePath = (flyways.filter(function(x) { return x.id === pickedFlyway; })[0] || flyways[3]).d;
                return h('div', { className: 'bg-gradient-to-b from-sky-50 to-amber-50 rounded-2xl border-2 border-slate-300 shadow p-4', role: 'img', 'aria-label': 'Schematic map of the four North American flyways. ' + (flyways.filter(function(x) { return x.id === pickedFlyway; })[0] || flyways[3]).label + ' Flyway is highlighted. Maine sits on the Atlantic Flyway.' },
                  h('svg', { viewBox: '0 0 440 300', className: 'w-full h-auto', preserveAspectRatio: 'xMidYMid meet' },
                    h('defs', null,
                      h('linearGradient', { id: 'fwLand', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                        h('stop', { offset: '0%', stopColor: '#fef3c7' }),
                        h('stop', { offset: '100%', stopColor: '#d97706' })
                      ),
                      h('linearGradient', { id: 'fwOcean', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                        h('stop', { offset: '0%', stopColor: '#bae6fd' }),
                        h('stop', { offset: '100%', stopColor: '#7dd3fc' })
                      ),
                      // Active flyway gradient
                      h('linearGradient', { id: 'fwActive', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                        h('stop', { offset: '0%', stopColor: '#fef3c7', stopOpacity: '0' }),
                        h('stop', { offset: '50%', stopColor: '#fbbf24', stopOpacity: '0.4' }),
                        h('stop', { offset: '100%', stopColor: '#dc2626', stopOpacity: '0' })
                      ),
                      // Arrowhead marker (for showing southward direction)
                      h('marker', { id: 'fwArrow', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' },
                        h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#1e293b' })
                      )
                    ),
                    // Ocean
                    h('rect', { x: 0, y: 0, width: 440, height: 300, fill: 'url(#fwOcean)' }),
                    // North America landmass (more recognizable shape with peninsulas)
                    h('path', {
                      d: 'M 30 70 ' +
                        'Q 50 50 100 55 ' +                  // Alaska panhandle area
                        'L 130 48 Q 160 38 200 42 ' +        // Canadian arctic / NW territories
                        'L 245 38 Q 280 36 310 42 ' +        // Hudson Bay region
                        'L 340 48 Q 365 56 380 75 ' +        // Newfoundland approach
                        'Q 392 95 400 130 ' +                // East coast
                        'Q 405 165 395 200 ' +
                        'Q 388 230 372 252 ' +
                        'L 350 270 Q 320 282 290 280 ' +     // Florida tip
                        'L 280 295 Q 260 290 250 275 ' +     // Florida indent
                        'Q 220 280 195 278 ' +
                        'L 165 282 Q 145 285 125 282 ' +     // Gulf Coast
                        'Q 105 285 92 270 ' +                // Yucatan curve
                        'Q 84 250 78 225 ' +
                        'Q 65 200 52 175 ' +                 // Baja
                        'Q 40 145 30 115 ' +
                        'Q 24 92 30 70 Z',
                      fill: 'url(#fwLand)', stroke: '#78350f', strokeWidth: 1
                    }),
                    // Great Lakes hint
                    h('path', { d: 'M 270 110 Q 285 105 300 110 Q 305 116 295 120 Q 280 122 270 118 Z',
                      fill: '#7dd3fc', stroke: '#0c4a6e', strokeWidth: 0.6, opacity: 0.85 }),
                    h('path', { d: 'M 305 115 Q 318 112 328 116 Q 332 122 322 124 Q 310 124 305 120 Z',
                      fill: '#7dd3fc', stroke: '#0c4a6e', strokeWidth: 0.6, opacity: 0.85 }),
                    // Compass rose (top-left of ocean)
                    h('g', { transform: 'translate(35, 30)' },
                      h('circle', { cx: 0, cy: 0, r: 14, fill: '#ffffff', stroke: '#1e293b', strokeWidth: 1, opacity: 0.85 }),
                      h('path', { d: 'M 0 -10 L 2 0 L 0 10 L -2 0 Z', fill: '#dc2626' }),
                      h('path', { d: 'M -10 0 L 0 -2 L 10 0 L 0 2 Z', fill: '#1e293b' }),
                      h('text', { x: 0, y: -16, fontSize: 8, textAnchor: 'middle', fontWeight: 'bold', fill: '#1e293b' }, 'N')
                    ),
                    // Inactive flyway routes (background, soft)
                    flyways.map(function(f) {
                      if (f.id === pickedFlyway) return null;
                      return h('path', { key: f.id + '-bg',
                        d: f.d, stroke: f.color, strokeWidth: 2.5, fill: 'none',
                        strokeDasharray: '5,5', opacity: 0.4 });
                    }),
                    // Direction-of-migration glow band on active route
                    h('path', { d: activePath, stroke: 'url(#fwActive)', strokeWidth: 14, fill: 'none', opacity: 0.5 }),
                    // Active flyway route (bold, solid, with arrowhead)
                    flyways.map(function(f) {
                      if (f.id !== pickedFlyway) return null;
                      return h('g', { key: f.id + '-active' },
                        h('path', { d: f.d, stroke: f.color, strokeWidth: 6, fill: 'none', strokeLinecap: 'round',
                          markerEnd: 'url(#fwArrow)' }),
                        // Bird silhouettes (3 birds along the path, V-formation pairs)
                        [{ pos: 0.18 }, { pos: 0.45 }, { pos: 0.72 }].map(function(pt, idx) {
                          // Sample point along path approximately (linear interpolation between control points for simplicity)
                          // Easier: use absolute positions corresponding to flyway curves
                          var byId = {
                            pacific:     [{x:62,y:90},{x:75,y:175},{x:108,y:248}],
                            central:     [{x:178,y:85},{x:200,y:175},{x:235,y:255}],
                            mississippi: [{x:248,y:90},{x:280,y:180},{x:310,y:250}],
                            atlantic:    [{x:344,y:90},{x:368,y:180},{x:382,y:255}]
                          };
                          var pts = byId[f.id] || byId.atlantic;
                          var p = pts[idx];
                          // V-formation of 3 birds
                          return h('g', { key: 'b' + idx, transform: 'translate(' + p.x + ',' + p.y + ')' },
                            h('path', { d: 'M -8,0 q 4,-4 8,0 q 4,-4 8,0',
                              fill: 'none', stroke: '#1e293b', strokeWidth: 2.2, strokeLinecap: 'round' }),
                            h('path', { d: 'M -16,8 q 3,-3 6,0 q 3,-3 6,0',
                              fill: 'none', stroke: '#1e293b', strokeWidth: 1.8, strokeLinecap: 'round' }),
                            h('path', { d: 'M 4,8 q 3,-3 6,0 q 3,-3 6,0',
                              fill: 'none', stroke: '#1e293b', strokeWidth: 1.8, strokeLinecap: 'round' })
                          );
                        })
                      );
                    }),
                    // Maine — emphasized star marker (always visible)
                    h('g', { transform: 'translate(370, 75)' },
                      h('circle', { cx: 0, cy: 0, r: 14, fill: '#dc2626', opacity: 0.18 }),
                      h('path', {
                        d: 'M 0,-7 L 1.8,-2.2 L 7,-2.2 L 2.6,1.2 L 4.4,6 L 0,3.2 L -4.4,6 L -2.6,1.2 L -7,-2.2 L -1.8,-2.2 Z',
                        fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: 1
                      }),
                      h('text', { x: 12, y: 4, fontSize: 11, fill: '#7f1d1d', fontWeight: 'bold',
                        style: { fontFamily: 'system-ui, sans-serif' } }, 'Maine')
                    ),
                    // Title overlay top-right
                    h('g', { transform: 'translate(440, 12)' },
                      h('rect', { x: -110, y: 0, width: 102, height: 24, rx: 12,
                        fill: '#1e293b', opacity: 0.92, stroke: '#94a3b8', strokeWidth: 1 }),
                      h('text', { x: -59, y: 16, textAnchor: 'middle',
                        fill: '#f1f5f9', fontWeight: 800, fontSize: 11, letterSpacing: '0.05em',
                        style: { textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }
                      }, '🦅 4 Flyways')
                    )
                  ),
                  // Legend below
                  h('div', { className: 'flex flex-wrap gap-2 mt-3' },
                    flyways.map(function(f) {
                      var isActive = pickedFlyway === f.id;
                      return h('div', { key: f.id + '-leg',
                        className: 'flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full',
                        style: {
                          background: isActive ? f.color : '#f1f5f9',
                          color: isActive ? '#ffffff' : '#475569',
                          border: '1.5px solid ' + (isActive ? f.color : '#cbd5e1'),
                          boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
                        }
                      },
                        h('span', { 'aria-hidden': true,
                          style: { width: 10, height: 10, borderRadius: '50%', background: f.color, border: '1.5px solid ' + (isActive ? '#ffffff' : f.color) } }),
                        f.label
                      );
                    })
                  )
                );
              })(),
              h('div', { 'role': 'radiogroup', 'aria-label': 'Pick a flyway', className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                FLYWAYS.map(function(f) {
                  var sel = (pickedFlyway === f.id);
                  return h('button', {
                    key: f.id,
                    onClick: function() { setPickedFlyway(f.id); announce(f.label); },
                    role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                    className: 'p-3 rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-orange-500/40 ' +
                      (sel ? 'bg-orange-700 text-white border-orange-800' : 'bg-white text-slate-800 border-slate-300 hover:border-orange-400')
                  }, f.label);
                })
              ),
              (function() {
                var f = FLYWAYS.filter(function(x) { return x.id === pickedFlyway; })[0];
                return h('div', { className: 'bg-white rounded-2xl border-2 border-orange-300 shadow p-5', 'aria-live': 'polite' },
                  h('h3', { className: 'text-xl font-black text-slate-800 mb-2' }, f.label),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                    h('strong', null, 'Path: '), f.desc),
                  h('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded-lg' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, '🌲 Maine\'s role'),
                    h('p', { className: 'text-sm text-slate-800' }, f.maineRole)
                  )
                );
              })()
            ),
            // CALENDAR VIEW
            view === 'calendar' && h('div', { className: 'space-y-3' },
              h('p', { className: 'text-sm text-slate-700 italic' },
                'Spring + fall arrivals/departures are the rhythm of Maine birding. Specific dates shift week-by-week with weather but the broad pattern holds year to year.'),
              MAINE_MIGRATION_CALENDAR.map(function(m, i) {
                var seasonColor = m.season === 'Spring' ? 'border-emerald-400' : m.season === 'Summer' ? 'border-amber-400' : m.season === 'Fall' ? 'border-orange-400' : 'border-blue-400';
                var seasonBg = m.season === 'Spring' ? 'bg-emerald-50' : m.season === 'Summer' ? 'bg-amber-50' : m.season === 'Fall' ? 'bg-orange-50' : 'bg-blue-50';
                return h('div', { key: i, className: 'bg-white border-2 ' + seasonColor + ' rounded-xl shadow p-4' },
                  h('div', { className: 'flex items-baseline gap-3 mb-2 flex-wrap' },
                    h('span', { className: 'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ' + seasonBg + ' text-slate-800' }, m.season),
                    h('h3', { className: 'text-lg font-black text-slate-800' }, m.month)
                  ),
                  m.arrivals && h('p', { className: 'text-sm text-slate-800 mb-1' },
                    h('strong', { className: 'text-emerald-700' }, '⬇️ Arrivals: '), m.arrivals),
                  m.departures && h('p', { className: 'text-sm text-slate-800' },
                    h('strong', { className: 'text-orange-700' }, '⬆️ Departures: '), m.departures)
                );
              }),
              h('div', { className: 'p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-sm text-slate-800' },
                h('strong', { className: 'text-blue-900' }, '🔗 Real-time tracking: '),
                'Cornell\'s ', h('span', { className: 'font-mono' }, 'BirdCast'), ' (birdcast.info) uses weather radar to forecast nightly migration intensity. Check it on a clear May night to see if migrants are pouring in.')
            ),
            // FEATURED MIGRATORS VIEW
            view === 'featured' && h('div', { className: 'space-y-3' },
              h('p', { className: 'text-sm text-slate-700 italic' },
                '8 species + the migration strategy each one uses. Distances are typical one-way; round-trip is double.'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                FEATURED_MIGRATORS.map(function(m) {
                  return h('div', { key: m.species, className: 'bg-white border-2 border-orange-300 rounded-xl shadow p-4' },
                    h('div', { className: 'flex items-baseline justify-between gap-2 mb-2 flex-wrap' },
                      h('h3', { className: 'text-base font-black text-slate-800' }, m.species),
                      h('span', { className: 'text-xs font-mono text-orange-700 font-bold' }, m.distance)
                    ),
                    h('p', { className: 'text-xs text-slate-800 leading-relaxed mb-2' },
                      h('strong', null, 'Strategy: '), m.strategy),
                    h('div', { className: 'p-2 bg-amber-50 border border-amber-200 rounded text-xs text-slate-800' },
                      h('strong', { className: 'text-amber-900' }, '🌲 Maine note: '), m.maineNote)
                  );
                })
              )
            ),
            // CROSS-LINK to migration.js
            h('div', { className: 'bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex items-start gap-3' },
              h('span', { className: 'text-3xl flex-shrink-0', 'aria-hidden': true }, '✈️'),
              h('div', null,
                h('h3', { className: 'text-base font-black text-emerald-900 mb-1' }, 'For HOW birds fly: Migration & Wind Patterns Lab'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  'BirdLab covers WHEN, WHERE, and WHY birds migrate. The dedicated ',
                  h('strong', { className: 'font-mono' }, 'Migration & Wind Patterns Lab'),
                  ' (separate STEM Lab tool) covers HOW: V-formation aerodynamics, wind currents, flight physics, energy efficiency calculations. Open it from the STEM Lab menu — search for "Migration."')
              )
            ),
            h(TeacherNotes, {
              standards: ['NGSS HS-LS2-2 (Ecosystem dynamics)', 'NGSS MS-LS1-4 (Behavioral roles)', 'NGSS HS-ESS3-3 (Human impacts on biosphere)'],
              questions: [
                'A Black-throated Green Warbler weighs ~9 grams. It crosses the Gulf of Mexico in a single overnight flight. What does this say about energy storage + physiological limits?',
                'Most Maine warblers spend MORE time on their wintering grounds in Latin America than on their Maine breeding grounds. What does that imply about which habitat matters most for conservation?',
                'A "fallout" happens when migrating birds run into bad weather + drop to land en masse. Why is Monhegan Island famous for fallouts in fall?',
                'Snowy Owls "irrupt" — sometimes thousands move south, other years almost none. What ecological signal does an irruption transmit?'
              ],
              misconceptions: [
                '"Migration is hard-wired and unchangeable" — many migration patterns shift in response to climate change. Some species have shortened migrations, others changed routes.',
                '"All birds migrate" — most permanent residents (chickadees, ravens, eagles in Maine) don\'t. Migration is one strategy among several.',
                '"Birds know where they\'re going from birth" — partially. Inherited route maps + magnetic compass + sun + stars + landmarks ALL contribute. First migrants do learn from experience and improve route efficiency over years.'
              ],
              extension: 'Visit Bradbury Mountain Hawkwatch (Pownal) on a September day. Spend an hour with the official counters. Compare what they tally to what shows up on Cornell\'s BirdCast forecast that morning.',
              sources: 'Cornell Lab All About Birds + BirdCast (radar migration forecasting). USGS Bird Banding Lab. Audubon Society migration data. eBird Status & Trends maps. Maine Audubon hawkwatch records.'
            })
          )
        );
      }


      // ─────────────────────────────────────────────────────
      // MODULE 9: CONSERVATION & CAREERS (Phase 5)
      // ─────────────────────────────────────────────────────
      function ConservationCareers() {
        var view_state = useState('conservation');
        var view = view_state[0], setLocalView = view_state[1];
        var pickedSpecies_state = useState(null);
        var pickedSpecies = pickedSpecies_state[0], setPickedSpecies = pickedSpecies_state[1];
        var pickedCareer_state = useState(null);
        var pickedCareer = pickedCareer_state[0], setPickedCareer = pickedCareer_state[1];

        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '🛡️', title: 'Conservation & Careers' }),
          h('div', { className: 'p-6 max-w-6xl mx-auto space-y-5' },
            h('div', { 'role': 'tablist', 'aria-label': 'Conservation & Careers sections', className: 'flex flex-wrap gap-2' },
              h('button', {
                role: 'tab', 'aria-selected': view === 'conservation' ? 'true' : 'false',
                onClick: function() { setLocalView('conservation'); announce('Conservation view'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-rose-500/40 ' +
                  (view === 'conservation' ? 'bg-rose-700 text-white border-rose-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-rose-500')
              }, '🛡️ Conservation'),
              h('button', {
                role: 'tab', 'aria-selected': view === 'careers' ? 'true' : 'false',
                onClick: function() { setLocalView('careers'); announce('Careers view'); },
                className: 'px-4 py-2 rounded-xl border-2 font-bold text-sm transition focus:outline-none focus:ring-2 ring-rose-500/40 ' +
                  (view === 'careers' ? 'bg-rose-700 text-white border-rose-800 shadow' : 'bg-white text-slate-800 border-slate-300 hover:border-rose-500')
              }, '🎓 Career Pathways')
            ),
            view === 'conservation' && h('div', { className: 'space-y-4' },
              // ── Big-stat headline: 3 BILLION + 100-bird pictogram showing 29% loss ──
              h('div', { className: 'rounded-2xl overflow-hidden shadow-lg border-2 border-rose-400 bg-gradient-to-br from-rose-50 to-amber-50' },
                h('div', { className: 'p-5 flex flex-col md:flex-row gap-5 items-stretch' },
                  // Big stat — left column
                  h('div', { className: 'flex-shrink-0 flex flex-col justify-center text-center md:text-left',
                    style: { minWidth: 180 } },
                    h('div', { className: 'text-[10px] font-bold uppercase tracking-widest text-rose-700' }, 'Since 1970'),
                    h('div', {
                      style: {
                        fontSize: '3rem', fontWeight: 900, lineHeight: 1,
                        background: 'linear-gradient(180deg, #be123c, #7f1d1d)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text', color: '#7f1d1d',
                        textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                        letterSpacing: '-0.02em'
                      }
                    }, '3 billion'),
                    h('div', { className: 'text-sm font-bold text-rose-900' }, 'breeding birds lost'),
                    h('div', { className: 'text-xs text-slate-700 mt-1' },
                      h('strong', { className: 'text-rose-700' }, '29% '), 'net decline across North America')
                  ),
                  // Pictogram — 100 bird silhouettes, 29 faded (lost since 1970)
                  h('div', { className: 'flex-1 flex flex-col justify-center', style: { minWidth: 0 } },
                    h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5' },
                      '🦅 1 in 4 birds gone — ', h('span', { className: 'text-rose-700' }, '29 of every 100 since 1970')),
                    // 10x10 grid of bird silhouettes
                    h('div', {
                      role: 'img',
                      'aria-label': '100-bird pictogram. 71 birds shown in dark color (still here), 29 birds shown faded and gray (lost since 1970).',
                      style: {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(20, 1fr)',
                        gap: 2,
                        background: '#ffffff',
                        padding: 8,
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                      }
                    },
                      Array.from({length: 100}, function(_, i) {
                        // Distribute the 29 "lost" birds pseudo-randomly but deterministically across the grid
                        var lostIdxs = [3,7,11,15,18,22,27,31,34,38,41,46,50,53,57,61,64,68,71,75,79,82,85,88,91,94,96,98,99];
                        var isLost = lostIdxs.indexOf(i) !== -1;
                        return h('svg', {
                          key: i,
                          viewBox: '0 0 16 12',
                          style: { width: '100%', height: 'auto', opacity: isLost ? 0.22 : 1 },
                          'aria-hidden': 'true'
                        },
                          // Tiny bird silhouette in M shape (V-formation style)
                          h('path', {
                            d: 'M 1 6 q 3.5 -4 7 0 q 3.5 -4 7 0',
                            fill: 'none',
                            stroke: isLost ? '#94a3b8' : '#1e293b',
                            strokeWidth: 1.6,
                            strokeLinecap: 'round'
                          })
                        );
                      })
                    ),
                    h('div', { className: 'flex flex-wrap items-center gap-3 mt-2 text-xs' },
                      h('div', { className: 'flex items-center gap-1' },
                        h('span', { 'aria-hidden': true, style: { width: 12, height: 8, background: '#1e293b', borderRadius: 1 } }),
                        h('span', { className: 'text-slate-700 font-bold' }, '71 still here')
                      ),
                      h('div', { className: 'flex items-center gap-1' },
                        h('span', { 'aria-hidden': true, style: { width: 12, height: 8, background: '#cbd5e1', borderRadius: 1 } }),
                        h('span', { className: 'text-slate-700 font-bold' }, '29 lost')
                      )
                    )
                  )
                ),
                // Citation banner below
                h('div', { className: 'px-5 py-2.5 bg-rose-100 border-t-2 border-rose-300 flex items-center gap-2 flex-wrap' },
                  h('span', { 'aria-hidden': true, className: 'text-base' }, '📊'),
                  h('p', { className: 'text-xs text-rose-900 italic font-mono' }, ROSENBERG_2019.citation)
                )
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                h('div', { className: 'bg-white border-2 border-slate-300 rounded-2xl shadow p-5' },
                  h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700 mb-2' }, '📊 Methodology'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, ROSENBERG_2019.methodology)
                ),
                h('div', { className: 'bg-white border-2 border-slate-300 rounded-2xl shadow p-5' },
                  h('h3', { className: 'text-sm font-bold uppercase tracking-wider text-slate-700 mb-2' }, '🔍 Key findings'),
                  h('ul', { className: 'space-y-1 text-sm text-slate-800' },
                    ROSENBERG_2019.findings.map(function(f, i) {
                      return h('li', { key: i, className: 'flex items-start gap-2' },
                        h('span', { className: 'text-rose-600 font-bold flex-shrink-0' }, '•'),
                        h('span', null, f));
                    })
                  )
                )
              ),
              h('div', { className: 'bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5' },
                h('h3', { className: 'text-base font-black text-emerald-900 mb-2' }, '💡 The takeaway is hopeful, not grim'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, ROSENBERG_2019.takeaway)
              ),
              h('h2', { className: 'text-base font-black text-slate-800 mt-6' }, 'Four Maine-relevant species: 2 in trouble, 2 recovered'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                CONSERVATION_FOCAL.map(function(s) {
                  var sel = pickedSpecies && pickedSpecies.species === s.species;
                  var isRecovery = /RECOVERED/i.test(s.status);
                  return h('button', {
                    key: s.species,
                    onClick: function() { setPickedSpecies(sel ? null : s); announce(sel ? 'Closed ' + s.species : 'Showing ' + s.species); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'text-left p-4 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-rose-500/40 birdlab-card-lift ' +
                      (sel ? 'bg-rose-100 border-rose-600 shadow-lg' : 'bg-white border-slate-300 hover:border-rose-500')
                  },
                    h('div', { className: 'flex items-baseline justify-between gap-2 mb-1 flex-wrap' },
                      h('h3', { className: 'text-base font-black text-slate-800' }, s.species),
                      h('span', { className: 'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ' + (isRecovery ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900') },
                        isRecovery ? 'Recovered' : 'At risk')
                    ),
                    h('div', { className: 'text-[11px] italic text-slate-700 mb-1' }, s.sciName),
                    h('p', { className: 'text-xs text-slate-700 leading-relaxed line-clamp-3' }, s.status)
                  );
                })
              ),
              pickedSpecies && h('div', { className: 'bg-white rounded-2xl border-2 border-rose-500 shadow-lg p-5 space-y-3', 'aria-live': 'polite' },
                h('h3', { className: 'text-2xl font-black text-slate-800' }, pickedSpecies.species),
                h('div', { className: 'text-sm italic text-slate-700' }, pickedSpecies.sciName),
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-700 mt-1 mb-2' }, pickedSpecies.status),
                h('div', { className: 'p-3 bg-rose-50 border border-rose-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-900 mb-1' }, '📖 The story'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, pickedSpecies.story)
                ),
                h('div', { className: 'p-3 bg-stone-100 border border-stone-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-stone-700 mb-1' }, '🌲 Maine connection'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, pickedSpecies.maineConnection)
                ),
                h('div', { className: 'p-3 bg-emerald-50 border border-emerald-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1' }, '✊ What you can do'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, pickedSpecies.whatYouCanDo)
                )
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-400 rounded-2xl p-5' },
                h('h3', { className: 'text-base font-black text-amber-900 mb-2' }, '🌡️ Climate change is the new pressure'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                  'The Gulf of Maine is warming faster than 99% of the world\'s ocean (Gulf of Maine Research Institute). For Maine birds, this means:'),
                h('ul', { className: 'list-disc list-inside space-y-1 text-sm text-slate-800' },
                  h('li', null, 'Atlantic Puffin chicks struggling — warm water pushes preferred fish too deep + too warm to feed chicks'),
                  h('li', null, 'Spring arrival shifting earlier — many warblers arrive 1-2 weeks earlier than the 1960s baseline'),
                  h('li', null, 'Mismatched timing — caterpillar peaks (warbler chick food) shifted faster than warbler arrivals'),
                  h('li', null, 'Range shifts northward — Northern Cardinals + Carolina Wrens have expanded into Maine since 1970')
                )
              ),
              h(TeacherNotes, {
                standards: ['NGSS HS-LS2-7 (Reduce human impact)', 'NGSS HS-ESS3-3 (Climate impacts)', 'NGSS HS-LS4-5 (Environmental change)'],
                questions: [
                  'Bald Eagles recovered. Wood Thrushes are declining. Both share mature forest habitat. What\'s different about the threats they face?',
                  'The Rosenberg 2019 paper found grassland birds had the steepest decline (53%). Maine doesn\'t have much native grassland. Should Mainers care?',
                  'Atlantic Puffins came back to Maine through deliberate restoration (Project Puffin). What does that say about whether species declines can be reversed?',
                  'Climate change is shifting Maine\'s bird community: cardinals expand north, puffin chicks struggle. What does adaptation mean here?'
                ],
                misconceptions: [
                  '"All birds are declining" — raptors and waterfowl have INCREASED since 1970 due to focused conservation. Losses are concentrated in groups without comparable conservation investment.',
                  '"Conservation is too expensive" — Bald Eagle recovery cost ~$28M federal funding over 30+ years per USFWS — small compared to the social value of a recovered national symbol + ecosystem services.',
                  '"Local action doesn\'t matter" — Wood Thrush wintering grounds are in Central America. But local action (window strikes, outdoor cats, breeding-season pesticides) accounts for 1-2 billion bird deaths per year in the US alone.'
                ],
                extension: 'Pick ONE focal species above. Read its Cornell All About Birds page + a recent (2020+) article on its conservation status. Write a 1-paragraph "what\'s the latest?" update.',
                sources: 'Rosenberg et al. 2019 (Science). USFWS. Maine IFW Endangered + Threatened Species List. Cornell Lab All About Birds. Gulf of Maine Research Institute. National Audubon Society Climate Watch.'
              })
            ),
            view === 'careers' && h('div', { className: 'space-y-4' },
              h('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-blue-900 mb-2' }, '9 ways to make birds your work'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                  'Bird-related careers cluster into research, conservation, education, and applied fields. Most are passion-driven — pay is modest until senior levels — but the work is meaningful and the community is unusually supportive.'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                  h('strong', null, 'Honest reality: '),
                  'Most ornithologists didn\'t start with a plan. They volunteered → got hooked → followed where the work led. The seasonal field-tech path (taking 3-month summer jobs in different states) is how many people start.')
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                CAREERS_BIRD.map(function(c) {
                  var sel = pickedCareer && pickedCareer.role === c.role;
                  return h('button', {
                    key: c.role,
                    onClick: function() { setPickedCareer(sel ? null : c); announce(sel ? 'Closed ' + c.role : 'Showing ' + c.role); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'text-left p-4 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-blue-500/40 birdlab-card-lift ' +
                      (sel ? 'bg-blue-100 border-blue-600 shadow-lg' : 'bg-white border-slate-300 hover:border-blue-500')
                  },
                    h('h3', { className: 'text-base font-black text-slate-800 mb-1' }, c.role),
                    h('div', { className: 'text-[11px] uppercase tracking-wider text-blue-700 font-bold mb-1' }, c.payRange),
                    h('p', { className: 'text-xs text-slate-700 leading-relaxed line-clamp-2' }, c.degree)
                  );
                })
              ),
              pickedCareer && h('div', { className: 'bg-white rounded-2xl border-2 border-blue-500 shadow-lg p-5 space-y-3', 'aria-live': 'polite' },
                h('h3', { className: 'text-2xl font-black text-slate-800' }, pickedCareer.role),
                h('div', { className: 'text-sm font-bold text-emerald-700 mt-1' }, '💰 ' + pickedCareer.payRange),
                h('div', { className: 'p-3 bg-blue-50 border border-blue-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-blue-900 mb-1' }, '🎓 Degree / credential'),
                  h('p', { className: 'text-sm text-slate-800' }, pickedCareer.degree)
                ),
                h('div', { className: 'p-3 bg-emerald-50 border border-emerald-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1' }, '🛤 Career pathway'),
                  h('p', { className: 'text-sm text-slate-800' }, pickedCareer.pathway)
                ),
                h('div', { className: 'p-3 bg-amber-50 border border-amber-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-900 mb-1' }, '🏢 Who hires'),
                  h('p', { className: 'text-sm text-slate-800' }, pickedCareer.who)
                ),
                h('div', { className: 'p-3 bg-stone-100 border border-stone-300 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-stone-700 mb-1' }, '🌲 Maine programs'),
                  h('p', { className: 'text-sm text-slate-800' }, pickedCareer.maineProgram)
                ),
                h('div', { className: 'p-3 bg-rose-50 border border-rose-200 rounded-lg' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-rose-900 mb-1' }, '⚠️ Honest reality'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, pickedCareer.reality)
                )
              ),
              h(TeacherNotes, {
                standards: ['CTE Career Exploration', 'Maine Career & Workforce Readiness', 'NGSS Practice 7 (Engaging in argument from evidence)'],
                questions: [
                  'Most bird-career paths start with volunteering or low-paid seasonal work. What does that say about how the field selects? Who benefits, who gets filtered out?',
                  'Photography + writing + guiding are all "no degree required" bird careers. What kind of person succeeds in those vs. PhD-track ornithology?',
                  'Maine has UMaine, Unity College, and College of the Atlantic. All three have different philosophies. How would you research which one fits a specific student?',
                  'A bird career often means living somewhere remote for years. Honest question: would you trade salary for that lifestyle? Where\'s your line?'
                ],
                misconceptions: [
                  '"You need a PhD to work with birds" — most field biologists have a BS or MS. Many never get a PhD. The PhD is for research-leadership tracks specifically.',
                  '"Bird jobs don\'t pay" — entry-level pay IS modest, but mid-career biologists earn $60-90K and senior researchers can clear $130K+. Early-career struggle is real but not permanent.',
                  '"Only certain types can be ornithologists" — the field is increasingly diverse. Black AF in STEM, Latinx Birding Club, Disabled Birders networks are growing the community.'
                ],
                extension: 'Pick ONE career path above. LinkedIn-search for 2-3 people in that role. Note: their education path, current job, years of experience, what they say about the work in their bio.',
                sources: 'BLS Occupational Outlook Handbook. AFO (Association of Field Ornithologists). Cornell Lab Bird Academy career resources. Maine IFW careers page. UMaine WLE program.'
              })
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // CITIZEN SCIENCE BRIDGE — projects + apps students can join now.
      // The point: bird research at scale runs on volunteer data. Every
      // observation entered into eBird becomes a data point in published
      // ornithology research. This is the most direct hands-on conservation
      // path open to students.
      // ─────────────────────────────────────────────────────
      function CitizenScienceBridge() {
        var pickedId_state = useState(null);
        var pickedId = pickedId_state[0], setPickedId = pickedId_state[1];
        var quizState = useState({ idx: 0, score: 0, answers: [], done: false });
        var quiz = quizState[0], setQuiz = quizState[1];
        var view_state = useState('projects');  // 'projects' | 'matchQuiz'
        var subView = view_state[0], setSubView = view_state[1];
        var PROJECTS = [
          {
            id: 'merlin', name: 'Merlin Bird ID', icon: '📱', org: 'Cornell Lab of Ornithology',
            tagline: 'AI bird identification — sound + photo. Free.',
            tier: 'No commitment',
            what: 'Open the app. Tap "Sound ID" or "Photo ID." It identifies the bird in real time. Includes a Maine bird pack. Works offline once you download a pack.',
            cost: 'Free',
            matchFor: 'You\'re curious but new to birds. You hear something or see something and want to know what it is. You don\'t want to commit to anything — yet.',
            timeMin: 0, timeMax: 5,
            url: 'merlin.allaboutbirds.org',
            citation: 'Cornell Lab of Ornithology · uses recordings/photos contributed by users to train its identification models.'
          },
          {
            id: 'ebird', name: 'eBird', icon: '📊', org: 'Cornell Lab of Ornithology',
            tagline: 'Log every bird you see. Becomes science.',
            tier: 'Light participation',
            what: 'Every checklist you submit becomes a data point in the world\'s largest database of bird observations. Used in 700+ peer-reviewed papers and counting. Maine has hundreds of "hotspots" with ranked rarity stats from local birders.',
            cost: 'Free',
            matchFor: 'You take walks. You\'re willing to pause + count + write down what you see for 10–30 minutes. You like maps + lists.',
            timeMin: 15, timeMax: 60,
            url: 'ebird.org',
            citation: 'Cornell Lab · Sullivan et al. 2014 (Biological Conservation) describes scientific use.'
          },
          {
            id: 'feederwatch', name: 'Project FeederWatch', icon: '🪟', org: 'Cornell + Birds Canada',
            tagline: 'Count the birds at your feeder. Two days a week. Nov–Apr.',
            tier: 'Light commitment',
            what: 'Watch a feeder for any amount of time on two consecutive days, then submit counts of each species. Data tracks winter range shifts and feeder-bird population trends across North America.',
            cost: '$18/yr suggested membership (waived if cost is a barrier)',
            matchFor: 'You\'re home in winter. You can put up a feeder + watch from a window. You\'re willing to commit to 2 days a week from November to April.',
            timeMin: 30, timeMax: 90,
            url: 'feederwatch.org',
            citation: 'Cornell Lab + Birds Canada · since 1987. Bonter & Cooper 2012 documents climate-driven range shifts.'
          },
          {
            id: 'cbc', name: 'Christmas Bird Count (CBC)', icon: '❄️', org: 'National Audubon Society',
            tagline: 'One day a year. Count every bird in a 15-mile circle. Since 1900.',
            tier: 'Annual event',
            what: 'On a single day in Dec/early Jan, teams cover assigned circles and count every bird they can identify. Now in its 125th year. The longest-running citizen science project in North America. Maine has ~30 CBC circles.',
            cost: 'Free for participants',
            matchFor: 'You\'re available for one full day in late December or early January. You\'re willing to be assigned to a team and a route. You can dress warm enough to spend hours outside in Maine winter.',
            timeMin: 240, timeMax: 480,
            url: 'audubon.org/conservation/science/christmas-bird-count',
            citation: 'National Audubon · CBC data drives annual State of the Birds reports. Started by ornithologist Frank Chapman to replace Christmas hunts in 1900.'
          },
          {
            id: 'nestwatch', name: 'NestWatch', icon: '🪺', org: 'Cornell Lab',
            tagline: 'Find a nest. Track it. Submit data on egg + chick survival.',
            tier: 'Spring–summer commitment',
            what: 'Find an active nest (in a nest box, tree, shrub) and monitor it every 3–4 days. Record number of eggs, hatchlings, and outcomes. Data informs reproduction-success research across species.',
            cost: 'Free; brief online certification course required',
            matchFor: 'You have a yard with nest boxes or know of a nest you can monitor without disturbing. You can commit to checking it every few days through April–July.',
            timeMin: 10, timeMax: 30,
            url: 'nestwatch.org',
            citation: 'Cornell Lab · used to track Wood Thrush, Chimney Swift, and grassland-bird declines.'
          },
          {
            id: 'gbbc', name: 'Great Backyard Bird Count', icon: '🌍', org: 'Cornell + Audubon + Birds Canada',
            tagline: '4 days every February. Anyone, anywhere, any amount of time.',
            tier: 'Annual event',
            what: 'On the GBBC weekend (Presidents Day weekend in Feb), spend at least 15 minutes counting birds wherever you are — backyard, park, schoolyard. The 2024 GBBC had ~641,000 participants in 200+ countries.',
            cost: 'Free',
            matchFor: 'You want to participate in something global + low-pressure. You can give 15 minutes one weekend in February.',
            timeMin: 15, timeMax: 240,
            url: 'birdcount.org',
            citation: 'Cornell + Audubon + Birds Canada · since 1998. The biggest snapshot of winter-bird distribution available.'
          },
          {
            id: 'maineAudubon', name: 'Maine Audubon volunteer programs', icon: '🌲', org: 'Maine Audubon',
            tagline: 'Local Maine surveys: shorebirds, owls, frogs, loons, more.',
            tier: 'Project-by-project',
            what: 'Maine Audubon runs species-specific surveys you can join: Maine Loon Count (every July, statewide volunteers), Maine Bird Atlas, shorebird surveys at Scarborough Marsh, owl monitoring, and more. They train you.',
            cost: 'Free; annual membership $40 supports the org',
            matchFor: 'You live in or visit Maine + want to connect with a local conservation org. You\'re willing to do a single survey day or commit to a season-long project.',
            timeMin: 60, timeMax: 480,
            url: 'maineaudubon.org/volunteer',
            citation: 'Maine Audubon · founded 1843, Maine\'s oldest environmental nonprofit.'
          },
          {
            id: 'iNat', name: 'iNaturalist', icon: '🔎', org: 'iNaturalist + Cal Academy',
            tagline: 'Photograph any organism. Community + AI ID. Birds + everything else.',
            tier: 'Light participation',
            what: 'A photo of any plant, animal, fungus, or bird gets identified by AI + community of experts. Verified records become "research grade" and feed into GBIF (Global Biodiversity Information Facility). Bird-specific use is a subset, but it lets you log what you find.',
            cost: 'Free',
            matchFor: 'You\'re curious about MORE than just birds — you want to log mosses, bugs, mushrooms, lichens too. You like communities of curious naturalists.',
            timeMin: 5, timeMax: 60,
            url: 'inaturalist.org',
            citation: 'California Academy of Sciences + National Geographic Society · GBIF data provider since 2008.'
          }
        ];
        // Match-me quiz: 5 lifestyle questions → recommend 1-2 projects
        var QUIZ_QS = [
          { q: 'How much time can you commit per week?',
            opts: [
              { id: 'none',     label: 'Almost none — but I\'m curious',                    weight: { merlin: 5, gbbc: 3, iNat: 2 } },
              { id: 'a_little', label: '15 minutes here and there',                          weight: { ebird: 4, gbbc: 5, merlin: 3, iNat: 4 } },
              { id: 'regular',  label: 'A few hours a week, regularly',                      weight: { feederwatch: 5, ebird: 5, nestwatch: 4 } },
              { id: 'serious',  label: 'I\'d join a real project + take training',            weight: { maineAudubon: 5, cbc: 4, nestwatch: 4 } }
            ]
          },
          { q: 'Where do you spend the most time?',
            opts: [
              { id: 'home',     label: 'At home, near windows + a possible feeder',         weight: { feederwatch: 5, merlin: 3 } },
              { id: 'walking',  label: 'Walking outside (parks, trails, neighborhood)',     weight: { ebird: 5, merlin: 4, iNat: 4 } },
              { id: 'school',   label: 'School + structured activities',                     weight: { gbbc: 4, ebird: 3 } },
              { id: 'maine',    label: 'Specifically in Maine, willing to drive to surveys', weight: { maineAudubon: 5, cbc: 4 } }
            ]
          },
          { q: 'How comfortable are you with bird ID right now?',
            opts: [
              { id: 'none',     label: 'I can\'t name 5 birds yet',                          weight: { merlin: 5, gbbc: 3, iNat: 4 } },
              { id: 'basic',    label: 'I know the obvious ones (cardinal, robin, eagle)',  weight: { merlin: 4, gbbc: 4, ebird: 3 } },
              { id: 'good',     label: 'I can ID most of my backyard + park birds',          weight: { ebird: 5, feederwatch: 4, nestwatch: 3 } },
              { id: 'expert',   label: 'I want challenges + real research data',             weight: { cbc: 5, ebird: 5, maineAudubon: 5, nestwatch: 4 } }
            ]
          },
          { q: 'Which season works best for you?',
            opts: [
              { id: 'winter',   label: 'Winter (more time indoors near windows)',           weight: { feederwatch: 5, cbc: 5, gbbc: 4 } },
              { id: 'spring',   label: 'Spring + summer (warm + outside)',                   weight: { nestwatch: 5, ebird: 4, maineAudubon: 4 } },
              { id: 'fall',     label: 'Fall (migration is exciting)',                       weight: { ebird: 5, merlin: 4 } },
              { id: 'any',      label: 'Anytime — flexible',                                  weight: { merlin: 5, ebird: 5, iNat: 4, gbbc: 3 } }
            ]
          },
          { q: 'What hooks you?',
            opts: [
              { id: 'data',     label: 'Maps, charts, contributing to research',             weight: { ebird: 5, feederwatch: 4, nestwatch: 4 } },
              { id: 'community',label: 'Joining a community of people who care',             weight: { maineAudubon: 5, cbc: 5, iNat: 4 } },
              { id: 'mystery',  label: 'Solving the "what is that?" mystery',                weight: { merlin: 5, iNat: 5 } },
              { id: 'event',    label: 'Big group events with energy',                       weight: { cbc: 5, gbbc: 5 } }
            ]
          }
        ];
        function tally(answers) {
          var scores = {};
          PROJECTS.forEach(function(p) { scores[p.id] = 0; });
          answers.forEach(function(ai, qi) {
            if (ai == null) return;
            var opt = QUIZ_QS[qi].opts[ai];
            if (!opt) return;
            Object.keys(opt.weight).forEach(function(k) { scores[k] = (scores[k] || 0) + opt.weight[k]; });
          });
          // Top 2
          var sorted = Object.keys(scores).sort(function(a, b) { return scores[b] - scores[a]; });
          return { scores: scores, top: sorted.slice(0, 2) };
        }
        function tierBadge(tier) {
          var styles = {
            'No commitment':        'bg-emerald-100 text-emerald-800 border-emerald-300',
            'Light participation':  'bg-sky-100 text-sky-800 border-sky-300',
            'Light commitment':     'bg-amber-100 text-amber-800 border-amber-300',
            'Annual event':         'bg-purple-100 text-purple-800 border-purple-300',
            'Spring–summer commitment': 'bg-rose-100 text-rose-800 border-rose-300',
            'Project-by-project':   'bg-stone-100 text-stone-800 border-stone-300'
          };
          return h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ' + (styles[tier] || styles['Light participation']) }, tier);
        }
        var picked = pickedId ? PROJECTS.filter(function(p) { return p.id === pickedId; })[0] : null;
        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '📡', title: 'Citizen Science Bridge' }),
          h('div', { className: 'p-6 max-w-5xl mx-auto space-y-5' },
            h('div', { className: 'bg-sky-50 border-2 border-sky-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-sky-900 mb-2' }, '🌍 Real research runs on volunteers'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                'Bird science at scale — population trends, range shifts, climate-impact tracking, conservation prioritization — runs on the data that ordinary people contribute. Every checklist on eBird, every CBC tally, every nest you monitor becomes a data point in published research.'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' },
                'These projects are the most direct conservation action a student can take that doesn\'t require expert credentials. Pick one that fits your time + interest. ',
                h('strong', null, 'Take the match quiz'), ' (below) for a personalized recommendation, or browse all 8.'
              )
            ),
            // View toggle
            h('div', { 'role': 'tablist', 'aria-label': 'Citizen science view', className: 'flex flex-wrap gap-2' },
              h('button', { role: 'tab', 'aria-selected': subView === 'projects' ? 'true' : 'false',
                onClick: function() { setSubView('projects'); },
                className: 'px-4 py-2 rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-sky-500/40 ' +
                  (subView === 'projects' ? 'bg-sky-700 text-white border-sky-800' : 'bg-white text-slate-800 border-slate-300 hover:border-sky-500')
              }, '📋 Browse all 8 projects'),
              h('button', { role: 'tab', 'aria-selected': subView === 'matchQuiz' ? 'true' : 'false',
                onClick: function() { setSubView('matchQuiz'); if (!quiz.answers || quiz.answers.length === 0) setQuiz({ idx: 0, score: 0, answers: [], done: false }); },
                className: 'px-4 py-2 rounded-xl border-2 text-sm font-bold transition focus:outline-none focus:ring-2 ring-sky-500/40 ' +
                  (subView === 'matchQuiz' ? 'bg-sky-700 text-white border-sky-800' : 'bg-white text-slate-800 border-slate-300 hover:border-sky-500')
              }, '🎯 Match quiz: which project fits you?')
            ),
            // ─── Browse all projects ───
            subView === 'projects' && h('div', null,
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                PROJECTS.map(function(p) {
                  var sel = pickedId === p.id;
                  return h('button', {
                    key: p.id,
                    onClick: function() { setPickedId(sel ? null : p.id); announce(sel ? 'Closed ' + p.name : 'Showing ' + p.name); },
                    'aria-pressed': sel ? 'true' : 'false',
                    className: 'text-left p-4 rounded-2xl border-2 shadow-sm transition focus:outline-none focus:ring-2 ring-sky-500/40 birdlab-card-lift ' +
                      (sel ? 'bg-sky-50 border-sky-600' : 'bg-white border-slate-300 hover:border-sky-500')
                  },
                    h('div', { className: 'flex items-start gap-3 mb-2' },
                      h('span', { 'aria-hidden': true, className: 'text-3xl flex-shrink-0' }, p.icon),
                      h('div', { className: 'flex-1 min-w-0' },
                        h('h3', { className: 'text-sm font-black text-slate-800' }, p.name),
                        h('div', { className: 'text-xs text-slate-700' }, p.org)
                      )
                    ),
                    h('p', { className: 'text-xs text-slate-800 mb-2 italic' }, p.tagline),
                    h('div', { className: 'flex flex-wrap gap-1.5' },
                      tierBadge(p.tier),
                      h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300' },
                        p.cost === 'Free' ? '✓ Free' : p.cost.indexOf('Free') === 0 ? '✓ ' + p.cost : '$ ' + p.cost
                      ),
                      h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300' },
                        '⏱ ' + (p.timeMin === 0 ? 'No commitment' : p.timeMin + '–' + p.timeMax + ' min/session')
                      )
                    )
                  );
                })
              ),
              picked && h('div', { className: 'bg-white rounded-2xl border-2 border-sky-500 shadow-lg p-5 mt-4', 'aria-live': 'polite' },
                h('div', { className: 'flex items-start gap-3 mb-3' },
                  h('span', { 'aria-hidden': true, className: 'text-4xl' }, picked.icon),
                  h('div', { className: 'flex-1' },
                    h('h2', { className: 'text-xl font-black text-slate-800' }, picked.name),
                    h('p', { className: 'text-sm italic text-slate-700' }, picked.org),
                    h('div', { className: 'flex flex-wrap gap-1.5 mt-1' }, tierBadge(picked.tier))
                  )
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' }, picked.what),
                h('div', { className: 'p-3 bg-emerald-50 border border-emerald-300 rounded-xl mb-3' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1' }, '🎯 Best for you if...'),
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, picked.matchFor)
                ),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-3' },
                  h('div', { className: 'p-3 bg-slate-50 border border-slate-300 rounded-xl' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '💰 Cost'),
                    h('p', { className: 'text-sm text-slate-800' }, picked.cost)
                  ),
                  h('div', { className: 'p-3 bg-slate-50 border border-slate-300 rounded-xl' },
                    h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '🔗 Where to start'),
                    h('p', { className: 'text-sm text-slate-800 font-mono break-all' }, picked.url)
                  )
                ),
                h('p', { className: 'text-xs text-slate-600 italic' }, '📚 ' + picked.citation)
              )
            ),
            // ─── Match Quiz ───
            subView === 'matchQuiz' && (function() {
              if (quiz.done) {
                var t = tally(quiz.answers);
                var top = t.top.map(function(id) { return PROJECTS.filter(function(p) { return p.id === id; })[0]; }).filter(Boolean);
                return h('div', { className: 'space-y-4', 'aria-live': 'polite' },
                  h('div', { className: 'bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5' },
                    h('h3', { className: 'text-lg font-black text-emerald-900 mb-2' }, '🎯 Your top matches'),
                    h('p', { className: 'text-sm text-slate-800 mb-4' },
                      'Based on your answers, these two projects fit you best. Start with the first one — it\'s the strongest match. The second is a good "after that" or alternative.'
                    ),
                    top.map(function(p, i) {
                      var pal = rankPalette(i, i === 0 ? 'Strongest match' : 'Also fits');
                      return h('div', { key: p.id,
                        className: 'p-4 pt-6 rounded-xl mb-3 relative',
                        style: {
                          background: pal.cardTint,
                          border: pal.cardBorderWidth + ' solid ' + pal.cardBorder,
                          boxShadow: pal.cardShadow,
                          marginTop: i === 0 ? 18 : 12
                        }
                      },
                        rankMedallion(i, i === 0 ? 'Strongest match' : 'Also fits'),
                        h('div', { className: 'flex items-start gap-3 mb-2' },
                          h('span', { 'aria-hidden': true, className: 'text-3xl flex-shrink-0' }, p.icon),
                          h('div', { className: 'flex-1' },
                            h('h4', { className: 'text-base font-black text-slate-800' }, p.name),
                            h('div', { className: 'text-xs text-slate-700 italic' }, p.tagline)
                          )
                        ),
                        h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' }, p.matchFor),
                        h('div', { className: 'flex flex-wrap gap-1.5' },
                          tierBadge(p.tier),
                          h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300' }, '🔗 ' + p.url)
                        )
                      );
                    })
                  ),
                  h('div', { className: 'flex gap-2 flex-wrap' },
                    h('button', {
                      onClick: function() { setQuiz({ idx: 0, score: 0, answers: [], done: false }); },
                      className: 'px-4 py-2 rounded-xl bg-sky-700 text-white text-sm font-bold hover:bg-sky-800'
                    }, '🔁 Take the quiz again'),
                    h('button', {
                      onClick: function() { setSubView('projects'); },
                      className: 'px-4 py-2 rounded-xl bg-white text-sky-800 border-2 border-sky-300 text-sm font-bold hover:border-sky-500'
                    }, '📋 Browse all 8 projects')
                  )
                );
              }
              var q = QUIZ_QS[quiz.idx];
              var ans = quiz.answers || [];
              var pickedAns = ans[quiz.idx];
              return h('div', { className: 'space-y-4' },
                h('div', { className: 'flex items-center gap-3' },
                  h('div', { className: 'flex-1 h-2 bg-slate-200 rounded-full overflow-hidden' },
                    h('div', { className: 'h-full bg-sky-500', style: { width: ((quiz.idx + 1) / QUIZ_QS.length * 100) + '%' } })
                  ),
                  h('span', { className: 'text-xs font-bold text-slate-700' }, (quiz.idx + 1) + ' / ' + QUIZ_QS.length)
                ),
                h('div', { className: 'bg-white rounded-2xl border-2 border-sky-300 shadow p-5' },
                  h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, q.q),
                  h('div', { role: 'radiogroup', 'aria-label': q.q, className: 'space-y-2' },
                    q.opts.map(function(opt, oi) {
                      var sel = pickedAns === oi;
                      return h('button', { key: opt.id,
                        role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                        onClick: function() {
                          var nextAns = ans.slice();
                          nextAns[quiz.idx] = oi;
                          if (quiz.idx < QUIZ_QS.length - 1) {
                            setQuiz({ idx: quiz.idx + 1, score: quiz.score, answers: nextAns, done: false });
                          } else {
                            setQuiz({ idx: quiz.idx, score: quiz.score, answers: nextAns, done: true });
                          }
                        },
                        className: 'block w-full text-left p-3 rounded-xl border-2 transition focus:outline-none focus:ring-2 ring-sky-500/40 ' +
                          (sel ? 'bg-sky-100 border-sky-600 font-bold' : 'bg-white border-slate-300 hover:border-sky-500 hover:bg-sky-50')
                      }, opt.label);
                    })
                  ),
                  quiz.idx > 0 && h('button', {
                    onClick: function() { setQuiz({ idx: quiz.idx - 1, score: quiz.score, answers: ans, done: false }); },
                    className: 'mt-3 text-xs text-slate-600 hover:text-slate-800'
                  }, '← Back to previous question')
                )
              );
            })(),
            // Why this matters footer
            h('div', { className: 'bg-amber-50 border-2 border-amber-300 rounded-2xl p-4' },
              h('h3', { className: 'text-sm font-black text-amber-900 mb-1' }, '📚 Why this matters'),
              h('p', { className: 'text-xs text-slate-800 leading-relaxed' },
                'eBird alone has been used in 700+ peer-reviewed papers since 2010, including the Rosenberg et al. 2019 ',
                h('em', null, 'Science'),
                ' study that documented a loss of ~3 billion North American birds since 1970. CBC data drove the federal Bald Eagle recovery decision. Citizen scientists are not "amateur" — your data is in the same datasets professional ornithologists use. The barrier to entry is paying attention.'
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // FIELD OBSERVATION — three-phase real-birding activity:
      //   1. Tracking challenge: keep a binocular reticle on a moving bird
      //      for 5 cumulative seconds (within a 30-second window).
      //   2. Field log: structured form (date, location, count, behavior,
      //      weather, notes) — exactly what experienced birders record.
      //   3. Reflection: 2-3 sentences on what stood out.
      // Entries persist in localStorage as a personal field notebook.
      // ─────────────────────────────────────────────────────
      function FieldObservation() {
        var step_state = useState('intro');  // intro | track | log | reflect | done | notebook
        var step = step_state[0], setStep = step_state[1];
        var birdPos_state = useState({ x: 270, y: 160 });
        var birdPos = birdPos_state[0], setBirdPos = birdPos_state[1];
        var reticlePos_state = useState({ x: 300, y: 180 });
        var reticlePos = reticlePos_state[0], setReticlePos = reticlePos_state[1];
        var onTargetMs_state = useState(0);
        var onTargetMs = onTargetMs_state[0], setOnTargetMs = onTargetMs_state[1];
        var elapsedMs_state = useState(0);
        var elapsedMs = elapsedMs_state[0], setElapsedMs = elapsedMs_state[1];
        var trackOutcome_state = useState(null);
        var trackOutcome = trackOutcome_state[0], setTrackOutcome = trackOutcome_state[1];
        var sessionBird_state = useState(null);
        var sessionBird = sessionBird_state[0], setSessionBird = sessionBird_state[1];
        var logForm_state = useState(null);
        var logForm = logForm_state[0], setLogForm = logForm_state[1];
        var notebook_state = useState(function() {
          return lsGet('birdLab.fieldNotebook.v1', []) || [];
        });
        var notebook = notebook_state[0], setNotebook = notebook_state[1];
        var rafId = useRef(0);
        var lastTickAt = useRef(0);
        var birdRef = useRef({ x: 270, y: 160, vx: 1.4, vy: 0.8, dartCdMs: 4000 });
        var reticleRef = useRef({ x: 300, y: 180 });
        var onTargetMsRef = useRef(0);
        var elapsedMsRef = useRef(0);
        var GOAL_MS = 5000;
        var WINDOW_MS = 30000;
        var FIELD_W = 540, FIELD_H = 320;
        var RET_RADIUS = 56;
        var BIRD_RADIUS = 16;
        function pickRandomBird() {
          if (typeof MAINE_BIRDS === 'undefined' || !MAINE_BIRDS.length) {
            return { id: 'unk', name: 'Bird', icon: '🐦', sci: '', fieldMark: '' };
          }
          return MAINE_BIRDS[Math.floor(Math.random() * MAINE_BIRDS.length)];
        }
        function startTracking() {
          var bird = pickRandomBird();
          setSessionBird(bird);
          birdRef.current = { x: 270, y: 160, vx: 1.4, vy: 0.8, dartCdMs: 4000 };
          reticleRef.current = { x: 300, y: 180 };
          onTargetMsRef.current = 0;
          elapsedMsRef.current = 0;
          lastTickAt.current = 0;
          setOnTargetMs(0);
          setElapsedMs(0);
          setTrackOutcome(null);
          setBirdPos({ x: birdRef.current.x, y: birdRef.current.y });
          setReticlePos({ x: 300, y: 180 });
          setStep('track');
        }
        function endTracking(outcome) {
          if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = 0; }
          setTrackOutcome(outcome);
          if (outcome === 'success') {
            var now = new Date();
            var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
            setLogForm({
              date: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()),
              time: pad(now.getHours()) + ':' + pad(now.getMinutes()),
              location: '',
              count: 1,
              behaviors: [],
              weather: 'clear',
              notes: ''
            });
          }
        }
        useEffect(function() {
          if (step !== 'track' || trackOutcome) return;
          function tick(now) {
            if (!lastTickAt.current) lastTickAt.current = now;
            var dt = Math.min(64, now - lastTickAt.current);
            lastTickAt.current = now;
            var b = birdRef.current;
            b.dartCdMs -= dt;
            if (b.dartCdMs <= 0) {
              var theta = Math.random() * Math.PI * 2;
              b.vx = 3.5 * Math.cos(theta);
              b.vy = 3.5 * Math.sin(theta);
              b.dartCdMs = 2500 + Math.random() * 3000;
            } else {
              b.vx += (Math.random() - 0.5) * 0.18 + (FIELD_W / 2 - b.x) * 0.0008;
              b.vy += (Math.random() - 0.5) * 0.15 + (FIELD_H / 2 - b.y) * 0.0008;
              b.vx *= 0.97;
              b.vy *= 0.97;
            }
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < 30) { b.x = 30; b.vx = Math.abs(b.vx); }
            if (b.x > FIELD_W - 30) { b.x = FIELD_W - 30; b.vx = -Math.abs(b.vx); }
            if (b.y < 30) { b.y = 30; b.vy = Math.abs(b.vy); }
            if (b.y > FIELD_H - 30) { b.y = FIELD_H - 30; b.vy = -Math.abs(b.vy); }
            var r = reticleRef.current;
            var dx = r.x - b.x, dy = r.y - b.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var onTargetNow = dist < RET_RADIUS;
            if (onTargetNow) onTargetMsRef.current += dt;
            elapsedMsRef.current += dt;
            setBirdPos({ x: b.x, y: b.y });
            setOnTargetMs(onTargetMsRef.current);
            setElapsedMs(elapsedMsRef.current);
            if (onTargetMsRef.current >= GOAL_MS) {
              endTracking('success');
              return;
            }
            if (elapsedMsRef.current >= WINDOW_MS) {
              endTracking('fail');
              return;
            }
            rafId.current = requestAnimationFrame(tick);
          }
          rafId.current = requestAnimationFrame(tick);
          return function() {
            if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = 0; }
          };
        }, [step, trackOutcome]);
        function onPointerMove(e) {
          var svgEl = e.currentTarget;
          var x, y;
          if (svgEl.createSVGPoint) {
            var pt = svgEl.createSVGPoint();
            pt.x = e.clientX; pt.y = e.clientY;
            var screenCtm = svgEl.getScreenCTM();
            if (screenCtm) {
              var transformed = pt.matrixTransform(screenCtm.inverse());
              x = transformed.x; y = transformed.y;
            } else {
              var rect = svgEl.getBoundingClientRect();
              x = (e.clientX - rect.left) * (FIELD_W / rect.width);
              y = (e.clientY - rect.top) * (FIELD_H / rect.height);
            }
          } else {
            var rect2 = svgEl.getBoundingClientRect();
            x = (e.clientX - rect2.left) * (FIELD_W / rect2.width);
            y = (e.clientY - rect2.top) * (FIELD_H / rect2.height);
          }
          reticleRef.current = { x: x, y: y };
          setReticlePos({ x: x, y: y });
        }
        function saveEntry() {
          var entry = Object.assign({}, logForm, {
            id: 'fn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            speciesId: sessionBird ? sessionBird.id : null,
            speciesName: sessionBird ? sessionBird.name : 'Unidentified',
            speciesIcon: sessionBird ? sessionBird.icon : '🐦',
            speciesSciName: sessionBird ? (sessionBird.sciName || sessionBird.sci || '') : '',
            createdAt: new Date().toISOString()
          });
          var nextNotebook = [entry].concat(notebook);
          setNotebook(nextNotebook);
          lsSet('birdLab.fieldNotebook.v1', nextNotebook);
          if (notebook.length === 0) {
            var prev = d.blBadges || {};
            if (!prev.fieldObs) {
              var nbb = Object.assign({}, prev); nbb.fieldObs = true;
              upd('blBadges', nbb);
              lsSet('birdLab.badges.v1', nbb);
            }
          }
          setStep('done');
        }
        function startOver() {
          setSessionBird(null);
          setLogForm(null);
          setTrackOutcome(null);
          setOnTargetMs(0);
          setElapsedMs(0);
          setStep('intro');
        }
        function deleteEntry(id) {
          var nextNotebook = notebook.filter(function(e) { return e.id !== id; });
          setNotebook(nextNotebook);
          lsSet('birdLab.fieldNotebook.v1', nextNotebook);
        }
        var BEHAVIORS = ['Foraging', 'Flying', 'Calling/singing', 'Perched', 'Hunting', 'Display/courtship', 'Nesting', 'Drinking/bathing', 'In a flock'];
        var WEATHER = [
          { id: 'clear', label: '☀️ Clear' },
          { id: 'partlyCloudy', label: '⛅ Partly cloudy' },
          { id: 'cloudy', label: '☁️ Cloudy' },
          { id: 'rain', label: '🌧 Rain' },
          { id: 'snow', label: '🌨 Snow' },
          { id: 'windy', label: '💨 Windy' },
          { id: 'fog', label: '🌫 Fog' }
        ];
        // Auto-advance from successful track to log
        if (trackOutcome === 'success' && step === 'track') {
          setStep('log');
        }
        if (step === 'intro') {
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🔭', title: 'Field Observation Challenge' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
              h('div', { className: 'bg-teal-50 border-2 border-teal-300 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-teal-900 mb-2' }, '🔭 Real birding is three skills, in order'),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                  'Anyone can spot a bird. The harder skills are: ',
                  h('strong', null, 'holding focus'),
                  ' on a moving target long enough to see field marks, ',
                  h('strong', null, 'recording disciplined notes'),
                  ' before details fade, and ',
                  h('strong', null, 'reflecting'),
                  ' on what you saw so it sticks. This activity practices all three.'),
                h('p', { className: 'text-xs text-slate-700 italic' },
                  'Your saved entries become a personal field notebook (stored on this device only).')
              ),
              h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-5' },
                h('h3', { className: 'text-base font-black text-slate-800 mb-3' }, 'How it works'),
                h('ol', { className: 'space-y-3 text-sm text-slate-800 list-decimal list-inside' },
                  h('li', null, h('strong', null, 'Track. '), 'Move your binocular reticle to keep a moving bird in view. Reach 5 cumulative seconds on target within 30 seconds total.'),
                  h('li', null, h('strong', null, 'Log. '), 'Fill a real field-log entry — date, location, count, behavior, weather, notes. The same fields used by eBird and citizen-science apps.'),
                  h('li', null, h('strong', null, 'Reflect. '), 'Write 2–3 sentences on what stood out. Reflection is what turns observation into learning.')
                )
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', {
                  onClick: startTracking,
                  className: 'px-5 py-3 rounded-xl bg-teal-700 text-white text-base font-bold hover:bg-teal-800 focus:outline-none focus:ring-4 ring-teal-500/40'
                }, '🔭 Begin observation'),
                notebook.length > 0 && h('button', {
                  onClick: function() { setStep('notebook'); },
                  className: 'px-5 py-3 rounded-xl bg-white text-teal-800 border-2 border-teal-400 text-base font-bold hover:border-teal-600 focus:outline-none focus:ring-4 ring-teal-500/40'
                }, '📓 My field notebook (' + notebook.length + ')')
              )
            )
          );
        }
        if (step === 'track' && !trackOutcome) {
          var pctOnTarget = Math.min(100, (onTargetMs / GOAL_MS) * 100);
          var pctElapsed = Math.min(100, (elapsedMs / WINDOW_MS) * 100);
          var rdx = reticlePos.x - birdPos.x, rdy = reticlePos.y - birdPos.y;
          var rdist = Math.sqrt(rdx * rdx + rdy * rdy);
          var onTarget = rdist < RET_RADIUS;
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🔭', title: 'Tracking — keep eyes on the bird' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
              h('div', { className: 'bg-white rounded-2xl border-2 border-teal-300 shadow p-4' },
                h('div', { className: 'mb-3' },
                  h('div', { className: 'flex justify-between text-xs font-bold text-slate-700 mb-1' },
                    h('span', null, '🎯 On-target time'),
                    h('span', { className: 'font-mono text-teal-700' }, (onTargetMs / 1000).toFixed(1) + ' / ' + (GOAL_MS / 1000) + ' s')
                  ),
                  h('div', { className: 'h-3 bg-slate-200 rounded-full overflow-hidden' },
                    h('div', { className: 'h-full bg-emerald-500 transition-all', style: { width: pctOnTarget + '%' } })
                  )
                ),
                h('div', null,
                  h('div', { className: 'flex justify-between text-xs font-bold text-slate-700 mb-1' },
                    h('span', null, '⏱ Time remaining'),
                    h('span', { className: 'font-mono text-amber-700' }, ((WINDOW_MS - elapsedMs) / 1000).toFixed(1) + ' s')
                  ),
                  h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden' },
                    h('div', { className: 'h-full bg-amber-500 transition-all', style: { width: (100 - pctElapsed) + '%' } })
                  )
                )
              ),
              h('div', { className: 'rounded-2xl border-2 border-slate-400 shadow overflow-hidden' },
                h('svg', {
                  viewBox: '0 0 ' + FIELD_W + ' ' + FIELD_H,
                  width: '100%',
                  style: { display: 'block', cursor: 'none', touchAction: 'none' },
                  onMouseMove: onPointerMove,
                  onTouchMove: function(e) {
                    if (e.touches && e.touches[0]) {
                      onPointerMove({ currentTarget: e.currentTarget, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
                      if (e.preventDefault) e.preventDefault();
                    }
                  },
                  role: 'application',
                  'aria-label': 'Bird tracking field. Move your pointer or finger to aim the binocular reticle. Stay on target for 5 cumulative seconds.'
                },
                  // ── Gradients + filters used by the scene ──
                  h('defs', null,
                    h('linearGradient', { id: 'bl-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: '#7ec8f5' }),
                      h('stop', { offset: '55%', stopColor: '#cbe5f8' }),
                      h('stop', { offset: '100%', stopColor: '#fde6c3' })
                    ),
                    h('linearGradient', { id: 'bl-ground', x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: '#5a8c4d' }),
                      h('stop', { offset: '100%', stopColor: '#2f5236' })
                    ),
                    h('radialGradient', { id: 'bl-sun', cx: '50%', cy: '50%', r: '50%' },
                      h('stop', { offset: '0%', stopColor: '#fff7d6', stopOpacity: 1 }),
                      h('stop', { offset: '50%', stopColor: '#fde68a', stopOpacity: 0.9 }),
                      h('stop', { offset: '100%', stopColor: '#fde68a', stopOpacity: 0 })
                    ),
                    h('radialGradient', { id: 'bl-bird-body', cx: '40%', cy: '35%', r: '70%' },
                      h('stop', { offset: '0%', stopColor: '#475569' }),
                      h('stop', { offset: '70%', stopColor: '#1e293b' }),
                      h('stop', { offset: '100%', stopColor: '#0f172a' })
                    ),
                    h('radialGradient', { id: 'bl-reticle-' + (onTarget ? 'on' : 'off'), cx: '50%', cy: '50%', r: '50%' },
                      h('stop', { offset: '60%', stopColor: 'rgba(255,255,255,0)' }),
                      h('stop', { offset: '100%', stopColor: onTarget ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.12)' })
                    )
                  ),
                  // ── Sky ──
                  h('rect', { x: 0, y: 0, width: FIELD_W, height: FIELD_H, fill: 'url(#bl-sky)' }),
                  // ── Sun glow + disc ──
                  h('circle', { cx: 92, cy: 64, r: 42, fill: 'url(#bl-sun)' }),
                  h('circle', { cx: 92, cy: 64, r: 16, fill: '#fff5c2', opacity: 0.95 }),
                  // ── Distant mountain ridge (far) ──
                  h('path', { d: 'M 0 200 L 60 165 L 110 180 L 165 150 L 230 175 L 290 145 L 360 175 L 430 155 L 500 180 L ' + FIELD_W + ' 165 L ' + FIELD_W + ' 220 L 0 220 Z',
                    fill: '#9bb6c4', opacity: 0.55 }),
                  // ── Mid mountain ridge ──
                  h('path', { d: 'M 0 215 L 50 195 L 130 215 L 200 190 L 280 215 L 380 195 L 460 220 L ' + FIELD_W + ' 200 L ' + FIELD_W + ' 240 L 0 240 Z',
                    fill: '#5e7a6a', opacity: 0.7 }),
                  // ── Pine forest silhouette (Maine!) ──
                  (function() {
                    var pines = [];
                    var xs = [10, 35, 60, 85, 110, 135, 160, 190, 220, 250, 280, 310, 345, 380, 415, 450, 485, 520];
                    var heights = [30, 45, 38, 50, 42, 55, 36, 48, 60, 44, 38, 52, 46, 40, 55, 48, 42, 50];
                    xs.forEach(function(x, i) {
                      var hgt = heights[i % heights.length];
                      var baseY = 252;
                      // Triangle pine
                      pines.push(h('path', { key: 'p' + i,
                        d: 'M ' + x + ' ' + baseY + ' L ' + (x - 9) + ' ' + (baseY - hgt * 0.4) +
                           ' L ' + (x - 5) + ' ' + (baseY - hgt * 0.4) + ' L ' + (x - 7) + ' ' + (baseY - hgt * 0.7) +
                           ' L ' + (x - 4) + ' ' + (baseY - hgt * 0.7) + ' L ' + x + ' ' + (baseY - hgt) +
                           ' L ' + (x + 4) + ' ' + (baseY - hgt * 0.7) + ' L ' + (x + 7) + ' ' + (baseY - hgt * 0.7) +
                           ' L ' + (x + 5) + ' ' + (baseY - hgt * 0.4) + ' L ' + (x + 9) + ' ' + (baseY - hgt * 0.4) + ' Z',
                        fill: '#2c4438', opacity: 0.92 }));
                    });
                    return pines;
                  })(),
                  // ── Ground ──
                  h('rect', { x: 0, y: 250, width: FIELD_W, height: FIELD_H - 250, fill: 'url(#bl-ground)' }),
                  // ── Mid bushes ──
                  h('ellipse', { cx: 60, cy: 285, rx: 42, ry: 18, fill: '#3a6b3f', opacity: 0.85 }),
                  h('ellipse', { cx: 250, cy: 295, rx: 70, ry: 22, fill: '#2f5e36', opacity: 0.85 }),
                  h('ellipse', { cx: 480, cy: 282, rx: 48, ry: 18, fill: '#3a6b3f', opacity: 0.9 }),
                  // ── Tall grass blades (detail) ──
                  (function() {
                    var blades = [];
                    for (var i = 0; i < 30; i++) {
                      var bx = (i * 18 + (i % 3) * 5) % FIELD_W;
                      var by = 305 + (i % 4) * 3;
                      blades.push(h('line', { key: 'g' + i,
                        x1: bx, y1: by, x2: bx + (i % 2 === 0 ? 2 : -2), y2: by - 6,
                        stroke: '#4a7651', strokeWidth: 1, opacity: 0.7 }));
                    }
                    return blades;
                  })(),
                  // ── Out-of-focus foreground branch (left edge) ──
                  h('path', { d: 'M -20 90 Q 30 95 60 110 Q 85 122 100 145 L 90 148 Q 70 130 50 120 Q 25 108 -20 105 Z',
                    fill: '#3a2818', opacity: 0.55 }),
                  h('ellipse', { cx: 35, cy: 100, rx: 12, ry: 7, fill: '#2c5a35', opacity: 0.5 }),
                  h('ellipse', { cx: 70, cy: 125, rx: 10, ry: 6, fill: '#2c5a35', opacity: 0.5 }),
                  // ── Out-of-focus foreground branch (right edge, top) ──
                  h('path', { d: 'M ' + (FIELD_W + 20) + ' 50 Q ' + (FIELD_W - 30) + ' 60 ' + (FIELD_W - 70) + ' 85 L ' + (FIELD_W - 60) + ' 95 Q ' + (FIELD_W - 25) + ' 75 ' + (FIELD_W + 20) + ' 65 Z',
                    fill: '#3a2818', opacity: 0.45 }),
                  // ── The bird (with wings + eye + beak + slight motion blur on dart) ──
                  (function() {
                    var b = birdRef.current;
                    var speed = Math.sqrt((b.vx || 0) * (b.vx || 0) + (b.vy || 0) * (b.vy || 0));
                    var blurAlpha = Math.min(0.5, Math.max(0, (speed - 1.5) / 4.0));
                    // Determine flip based on horizontal velocity
                    var facingRight = (b.vx || 0) >= 0;
                    var scaleX = facingRight ? 1 : -1;
                    var children = [];
                    // Motion blur ghost (only when moving fast)
                    if (blurAlpha > 0.05) {
                      var trailX = (b.vx || 0) * -2.5;
                      var trailY = (b.vy || 0) * -2.5;
                      children.push(h('g', { key: 'trail',
                        transform: 'translate(' + (birdPos.x + trailX) + ' ' + (birdPos.y + trailY) + ') scale(' + scaleX + ' 1)' },
                        h('ellipse', { cx: -6, cy: 1, rx: 16, ry: 8, fill: '#1e293b', opacity: blurAlpha * 0.6 }),
                        h('circle', { cx: 4, cy: 0, r: BIRD_RADIUS - 1, fill: '#1e293b', opacity: blurAlpha * 0.6 })
                      ));
                    }
                    children.push(h('g', { key: 'bird',
                      transform: 'translate(' + birdPos.x + ' ' + birdPos.y + ') scale(' + scaleX + ' 1)' },
                      // Tail
                      h('path', { d: 'M -16 -2 L -22 -6 L -22 6 L -16 2 Z', fill: '#1e293b' }),
                      // Body
                      h('ellipse', { cx: -3, cy: 1, rx: 16, ry: 9, fill: 'url(#bl-bird-body)' }),
                      // Folded wing detail
                      h('path', { d: 'M -10 -1 Q -6 -7 2 -5 Q -4 -3 -10 -1 Z', fill: '#0f172a', opacity: 0.85 }),
                      // Head
                      h('circle', { cx: 7, cy: -2, r: BIRD_RADIUS - 4, fill: 'url(#bl-bird-body)' }),
                      // Beak
                      h('polygon', { points: '15,-2 22,0 15,2', fill: '#f59e0b' }),
                      h('polygon', { points: '15,0 22,0 15,1', fill: '#b45309' }),
                      // Eye highlight
                      h('circle', { cx: 9, cy: -4, r: 2.2, fill: '#fef3c7' }),
                      h('circle', { cx: 9.5, cy: -4, r: 1.1, fill: '#0b1220' })
                    ));
                    return children;
                  })(),
                  // ── Binocular reticle (polished, with depth-of-field haze + magnification label) ──
                  h('g', { transform: 'translate(' + reticlePos.x + ' ' + reticlePos.y + ')' },
                    // Outer dim haze (depth-of-field around the field of view)
                    h('circle', { cx: 0, cy: 0, r: RET_RADIUS + 18, fill: 'url(#bl-reticle-' + (onTarget ? 'on' : 'off') + ')' }),
                    // Solid color fill of the field of view
                    h('circle', { cx: 0, cy: 0, r: RET_RADIUS, fill: onTarget ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.04)' }),
                    // Outer ring (binocular barrel)
                    h('circle', { cx: 0, cy: 0, r: RET_RADIUS, fill: 'none', stroke: '#0f172a', strokeWidth: 5, opacity: 0.85 }),
                    h('circle', { cx: 0, cy: 0, r: RET_RADIUS, fill: 'none', stroke: onTarget ? '#10b981' : '#ef4444', strokeWidth: 3, opacity: 0.95 }),
                    // Inner ring (lens edge)
                    h('circle', { cx: 0, cy: 0, r: RET_RADIUS - 8, fill: 'none', stroke: '#fff', strokeWidth: 1, opacity: 0.4 }),
                    // Crosshair
                    h('line', { x1: -RET_RADIUS + 6, y1: 0, x2: -10, y2: 0, stroke: onTarget ? '#10b981' : '#ef4444', strokeWidth: 1.5, opacity: 0.7 }),
                    h('line', { x1: 10, y1: 0, x2: RET_RADIUS - 6, y2: 0, stroke: onTarget ? '#10b981' : '#ef4444', strokeWidth: 1.5, opacity: 0.7 }),
                    h('line', { x1: 0, y1: -RET_RADIUS + 6, x2: 0, y2: -10, stroke: onTarget ? '#10b981' : '#ef4444', strokeWidth: 1.5, opacity: 0.7 }),
                    h('line', { x1: 0, y1: 10, x2: 0, y2: RET_RADIUS - 6, stroke: onTarget ? '#10b981' : '#ef4444', strokeWidth: 1.5, opacity: 0.7 }),
                    // Center crosshair tick marks
                    h('line', { x1: -4, y1: 0, x2: 4, y2: 0, stroke: onTarget ? '#10b981' : '#ef4444', strokeWidth: 2 }),
                    h('line', { x1: 0, y1: -4, x2: 0, y2: 4, stroke: onTarget ? '#10b981' : '#ef4444', strokeWidth: 2 }),
                    // Magnification label (typical 8x or 10x birding binoculars)
                    h('text', { x: -RET_RADIUS + 4, y: -RET_RADIUS + 14, fontSize: 9, fontWeight: 800, fill: '#0f172a', opacity: 0.7 }, '8×42'),
                    // Status label
                    h('text', { x: 0, y: -RET_RADIUS - 10, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: onTarget ? '#10b981' : '#ef4444',
                      style: { textShadow: '0 0 4px rgba(255,255,255,0.7)' } },
                      onTarget ? '🎯 ON TARGET' : 'OFF TARGET')
                  )
                )
              ),
              h('p', { className: 'text-center text-xs text-slate-700 italic' },
                'Move pointer or finger to aim. Birds dart unpredictably — anticipate movement instead of chasing it.')
            )
          );
        }
        if (trackOutcome === 'fail') {
          var __pct = Math.round((onTargetMs / GOAL_MS) * 100);
          // Celebrate any progress, not just the win
          var __headline = __pct >= 70 ? 'So close — the bird flew off at the last moment.'
            : __pct >= 40 ? 'You held it for a while — birds are fast.'
            : __pct >= 15 ? 'Tough start. Even pros lose them in the first few seconds.'
            : 'It darted before you could lock in.';
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🔭', title: 'Tracking — bird flew off' }),
            h('div', { className: 'p-6 max-w-2xl mx-auto space-y-4' },
              // Hero scene: bird flying away into the distance
              h('div', { className: 'rounded-3xl overflow-hidden shadow border-2 border-amber-300' },
                h('svg', { viewBox: '0 0 540 200', width: '100%',
                  role: 'img', 'aria-label': 'Bird flying away into the distance' },
                  h('defs', null,
                    h('linearGradient', { id: 'bl-fail-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: '#fde68a' }),
                      h('stop', { offset: '60%', stopColor: '#fcd34d' }),
                      h('stop', { offset: '100%', stopColor: '#f59e0b' })
                    )
                  ),
                  h('rect', { x: 0, y: 0, width: 540, height: 200, fill: 'url(#bl-fail-sky)' }),
                  // Distant ridge
                  h('path', { d: 'M 0 145 L 70 130 L 150 150 L 230 125 L 320 145 L 410 130 L 490 145 L 540 135 L 540 200 L 0 200 Z',
                    fill: '#854d0e', opacity: 0.4 }),
                  // Pine silhouettes
                  (function() {
                    var pines = [];
                    var xs = [12, 38, 62, 88, 115, 145, 175, 210, 240, 275, 310, 345, 380, 415, 445, 475, 505];
                    var hs = [22, 30, 26, 34, 28, 36, 24, 32, 38, 28, 26, 34, 30, 28, 36, 30, 28];
                    xs.forEach(function(x, i) {
                      var hgt = hs[i % hs.length];
                      var baseY = 155;
                      pines.push(h('path', { key: 'fp' + i,
                        d: 'M ' + x + ' ' + baseY + ' L ' + (x - 7) + ' ' + (baseY - hgt * 0.4) +
                           ' L ' + (x - 4) + ' ' + (baseY - hgt * 0.4) + ' L ' + x + ' ' + (baseY - hgt) +
                           ' L ' + (x + 4) + ' ' + (baseY - hgt * 0.4) + ' L ' + (x + 7) + ' ' + (baseY - hgt * 0.4) + ' Z',
                        fill: '#3a2412', opacity: 0.85 }));
                    });
                    return pines;
                  })(),
                  // Ground
                  h('rect', { x: 0, y: 155, width: 540, height: 45, fill: '#2c1a0d' }),
                  // Trail of fading dots showing the bird's flight path
                  h('circle', { cx: 90,  cy: 105, r: 2, fill: '#0f172a', opacity: 0.20 }),
                  h('circle', { cx: 130, cy: 90,  r: 2.5, fill: '#0f172a', opacity: 0.30 }),
                  h('circle', { cx: 175, cy: 78,  r: 2.8, fill: '#0f172a', opacity: 0.42 }),
                  h('circle', { cx: 225, cy: 68,  r: 3, fill: '#0f172a', opacity: 0.55 }),
                  h('circle', { cx: 280, cy: 58,  r: 3.2, fill: '#0f172a', opacity: 0.68 }),
                  h('circle', { cx: 340, cy: 48,  r: 3.5, fill: '#0f172a', opacity: 0.80 }),
                  // The bird, mid-flight, far from the viewer
                  h('g', { transform: 'translate(420 38)' },
                    h('path', { d: 'M -16 0 q 8 -10 16 0 q 8 -10 16 0', stroke: '#0f172a', strokeWidth: 2.8, fill: 'none', strokeLinecap: 'round' })
                  ),
                  // Even smaller, vanishing further
                  h('g', { transform: 'translate(490 22)' },
                    h('path', { d: 'M -10 0 q 5 -6 10 0 q 5 -6 10 0', stroke: '#0f172a', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', opacity: 0.7 })
                  ),
                  // Empty reticle ghost where the bird used to be (depth-of-field haze still visible)
                  h('g', { transform: 'translate(180 130)' },
                    h('circle', { cx: 0, cy: 0, r: 38, fill: 'none', stroke: '#92400e', strokeWidth: 2, strokeDasharray: '4 4', opacity: 0.5 }),
                    h('text', { x: 0, y: 4, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#92400e', opacity: 0.7 }, '...')
                  )
                )
              ),
              h('div', { className: 'bg-amber-50 border-2 border-amber-400 rounded-2xl p-5' },
                h('h2', { className: 'text-lg font-black text-amber-900 mb-2 text-center' }, __headline),
                // Big visible time stat (turn the failure into useful data)
                h('div', { className: 'flex items-center justify-center gap-3 mb-3 p-3 bg-white rounded-xl' },
                  h('div', { className: 'flex flex-col items-center px-4' },
                    h('div', { className: 'text-3xl font-black font-mono ' + (__pct >= 70 ? 'text-emerald-700' : __pct >= 40 ? 'text-amber-700' : 'text-rose-700') },
                      (onTargetMs / 1000).toFixed(1) + 's'),
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-slate-700 font-bold' }, 'On target')
                  ),
                  h('div', { className: 'text-3xl text-slate-400 font-light' }, '/'),
                  h('div', { className: 'flex flex-col items-center px-4' },
                    h('div', { className: 'text-3xl font-black font-mono text-slate-700' }, (GOAL_MS / 1000) + 's'),
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-slate-700 font-bold' }, 'Goal')
                  ),
                  h('div', { className: 'text-3xl text-slate-400 font-light' }, '='),
                  h('div', { className: 'flex flex-col items-center px-4' },
                    h('div', { className: 'text-3xl font-black font-mono ' + (__pct >= 70 ? 'text-emerald-700' : __pct >= 40 ? 'text-amber-700' : 'text-rose-700') },
                      __pct + '%'),
                    h('div', { className: 'text-[10px] uppercase tracking-wider text-slate-700 font-bold' }, 'Of goal')
                  )
                ),
                h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3 text-center' },
                  __pct >= 70 ? 'Real birding is exactly this hard. You almost had it — that\'s a real skill emerging.'
                    : __pct >= 40 ? 'Most birds don\'t hold still. Track again with a fresh bird and you\'ll likely improve.'
                    : 'Don\'t sweat it. Even Cornell-trained birders lose birds in the first few seconds. Try a different one.'
                ),
                h('div', { className: 'p-3 rounded-xl bg-white border border-amber-200' },
                  h('div', { className: 'text-xs font-bold uppercase tracking-wider text-amber-800 mb-1' }, '💡 Birding tip'),
                  h('p', { className: 'text-xs text-slate-800 leading-relaxed' },
                    'Anticipate movement instead of chasing it. Birds often dart in 2–3 second cycles — predict where they\'re headed, not where they are. Real binoculars use the same trick: lead the bird like a quarterback leading a receiver.')
                )
              ),
              h('div', { className: 'flex gap-2 flex-wrap' },
                h('button', { onClick: startTracking,
                  className: 'flex-1 px-5 py-3 rounded-xl bg-teal-700 text-white text-base font-bold hover:bg-teal-800 focus:outline-none focus:ring-4 ring-teal-500/40 shadow-md hover:shadow-lg transition-all'
                }, '🔁 Try again with a fresh bird'),
                h('button', { onClick: function() { setStep('intro'); },
                  className: 'px-5 py-3 rounded-xl bg-white text-slate-800 border-2 border-slate-300 text-base font-bold hover:border-slate-500 focus:outline-none focus:ring-4 ring-slate-400/40'
                }, '← Back to intro')
              )
            )
          );
        }
        if (step === 'log' && logForm) {
          var sb = sessionBird || { name: 'Bird', icon: '🐦', sci: '', fieldMark: '' };
          function toggleBehavior(b) {
            var current = logForm.behaviors || [];
            var next = current.indexOf(b) === -1 ? current.concat([b]) : current.filter(function(x) { return x !== b; });
            setLogForm(Object.assign({}, logForm, { behaviors: next }));
          }
          var canSubmit = (logForm.location || '').trim().length > 0;
          var __lockSec = (onTargetMs / 1000).toFixed(1);
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '📋', title: 'Field Log Entry' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
              // ── Lock-in celebration scene (parity with tracking-fail) ──
              h('div', { className: 'rounded-2xl overflow-hidden shadow border-2 border-emerald-400 relative', 'aria-live': 'polite' },
                h('svg', {
                  viewBox: '0 0 540 160', width: '100%',
                  style: { display: 'block' },
                  role: 'img', 'aria-label': 'Bird locked in the binocular reticle'
                },
                  h('defs', null,
                    h('linearGradient', { id: 'lockSky', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                      h('stop', { offset: '0%', stopColor: '#a7f3d0' }),
                      h('stop', { offset: '100%', stopColor: '#fef3c7' })
                    ),
                    h('radialGradient', { id: 'lockSun', cx: '85%', cy: '20%', r: '30%' },
                      h('stop', { offset: '0%', stopColor: '#fffbeb', stopOpacity: '0.95' }),
                      h('stop', { offset: '100%', stopColor: '#fef3c7', stopOpacity: '0' })
                    ),
                    h('radialGradient', { id: 'lockBirdBody', cx: '40%', cy: '35%', r: '60%' },
                      h('stop', { offset: '0%', stopColor: '#fde68a' }),
                      h('stop', { offset: '70%', stopColor: '#b45309' }),
                      h('stop', { offset: '100%', stopColor: '#78350f' })
                    )
                  ),
                  // Sky + sun
                  h('rect', { x: 0, y: 0, width: 540, height: 160, fill: 'url(#lockSky)' }),
                  h('circle', { cx: 460, cy: 32, r: 80, fill: 'url(#lockSun)' }),
                  // Distant ridges
                  h('path', { d: 'M0,110 L80,90 L160,100 L240,82 L320,94 L400,78 L480,92 L540,86 L540,160 L0,160 Z', fill: '#86efac', opacity: '0.6' }),
                  h('path', { d: 'M0,128 L60,118 L140,124 L220,114 L300,122 L380,112 L460,120 L540,116 L540,160 L0,160 Z', fill: '#34d399', opacity: '0.85' }),
                  // Perched bird (sharp, in focus, centered)
                  h('g', { transform: 'translate(245, 70)' },
                    // Branch
                    h('path', { d: 'M-40,40 L80,46 M0,42 L-10,52 M28,44 L36,54', stroke: '#78350f', strokeWidth: 3, strokeLinecap: 'round', fill: 'none' }),
                    // Body
                    h('ellipse', { cx: 25, cy: 22, rx: 26, ry: 18, fill: 'url(#lockBirdBody)', stroke: '#451a03', strokeWidth: 1 }),
                    // Head
                    h('circle', { cx: 5, cy: 16, r: 12, fill: 'url(#lockBirdBody)', stroke: '#451a03', strokeWidth: 1 }),
                    // Eye
                    h('circle', { cx: 1, cy: 14, r: 2.5, fill: '#1c1917' }),
                    h('circle', { cx: 0.2, cy: 13, r: 0.8, fill: '#fef3c7' }),
                    // Beak
                    h('path', { d: 'M-7,16 L-13,18 L-7,19 Z', fill: '#f59e0b', stroke: '#78350f', strokeWidth: 0.5 }),
                    // Wing detail
                    h('path', { d: 'M18,18 Q34,16 46,26 Q34,30 18,28 Z', fill: '#78350f', opacity: '0.55' }),
                    // Tail
                    h('path', { d: 'M48,22 L60,18 L60,28 Z', fill: '#78350f' }),
                    // Foot
                    h('path', { d: 'M14,40 L14,46 M18,40 L20,46', stroke: '#451a03', strokeWidth: 1.5, strokeLinecap: 'round' })
                  ),
                  // Locked-on reticle (solid green, success state)
                  h('g', { transform: 'translate(270, 86)' },
                    h('circle', { cx: 0, cy: 0, r: 64, fill: 'none', stroke: '#10b981', strokeWidth: 3, opacity: '0.85' }),
                    h('circle', { cx: 0, cy: 0, r: 50, fill: 'none', stroke: '#10b981', strokeWidth: 1.5, opacity: '0.5' }),
                    // Crosshairs
                    h('line', { x1: -64, y1: 0, x2: -20, y2: 0, stroke: '#10b981', strokeWidth: 2, opacity: '0.8' }),
                    h('line', { x1: 20, y1: 0, x2: 64, y2: 0, stroke: '#10b981', strokeWidth: 2, opacity: '0.8' }),
                    h('line', { x1: 0, y1: -64, x2: 0, y2: -20, stroke: '#10b981', strokeWidth: 2, opacity: '0.8' }),
                    h('line', { x1: 0, y1: 20, x2: 0, y2: 64, stroke: '#10b981', strokeWidth: 2, opacity: '0.8' }),
                    // Corner brackets (success indicator)
                    h('path', { d: 'M-58,-58 L-46,-58 L-46,-46 M-58,-58 L-58,-46', stroke: '#059669', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
                    h('path', { d: 'M58,-58 L46,-58 L46,-46 M58,-58 L58,-46', stroke: '#059669', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
                    h('path', { d: 'M-58,58 L-46,58 L-46,46 M-58,58 L-58,46', stroke: '#059669', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
                    h('path', { d: 'M58,58 L46,58 L46,46 M58,58 L58,46', stroke: '#059669', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' })
                  ),
                  // Sparkles / celebration dots
                  [{x:120,y:35},{x:90,y:60},{x:430,y:60},{x:160,y:18},{x:380,y:25},{x:60,y:90},{x:480,y:50}].map(function(s, idx) {
                    return h('g', { key: 'sp' + idx, transform: 'translate(' + s.x + ',' + s.y + ')' },
                      h('path', { d: 'M0,-5 L1.2,-1.2 L5,0 L1.2,1.2 L0,5 L-1.2,1.2 L-5,0 L-1.2,-1.2 Z',
                        fill: '#fbbf24', opacity: '0.85' })
                    );
                  }),
                  // Big "LOCKED IN" badge top-left
                  h('g', { transform: 'translate(20, 20)' },
                    h('rect', { x: 0, y: 0, width: 110, height: 28, rx: 14,
                      fill: '#065f46', opacity: '0.95',
                      stroke: '#10b981', strokeWidth: 2 }),
                    h('text', { x: 55, y: 19, textAnchor: 'middle',
                      fill: '#a7f3d0', fontWeight: 900, fontSize: 13, letterSpacing: '0.08em',
                      style: { textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }
                    }, '✓ Locked in')
                  )
                ),
                // Time stat banner below scene
                h('div', { className: 'bg-gradient-to-r from-emerald-50 to-amber-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap border-t-2 border-emerald-300' },
                  h('div', null,
                    h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-emerald-800' }, 'Time on target'),
                    h('div', { className: 'flex items-baseline gap-1' },
                      h('span', { className: 'text-3xl font-black text-emerald-700 font-mono' }, __lockSec),
                      h('span', { className: 'text-sm text-emerald-700 font-bold' }, ' / ' + (GOAL_MS / 1000) + ' s ✓')
                    )
                  ),
                  h('p', { className: 'text-sm text-slate-800 max-w-[280px] leading-snug' },
                    h('strong', { className: 'text-emerald-900' }, 'Now log what you saw '),
                    'before the details fade. Field marks vanish from memory faster than you think.')
                )
              ),
              h('div', { className: 'bg-white rounded-2xl border-2 border-emerald-400 shadow p-4 flex items-start gap-3' },
                h('span', { 'aria-hidden': true, className: 'text-4xl' }, sb.icon),
                h('div', { className: 'flex-1' },
                  h('h3', { className: 'text-lg font-black text-slate-800' }, sb.name),
                  sb.sci && h('p', { className: 'text-xs italic text-slate-700 mb-1' }, sb.sci),
                  sb.fieldMark && h('p', { className: 'text-xs text-slate-700 leading-relaxed' },
                    h('strong', null, '👁️ Field marks: '), sb.fieldMark)
                )
              ),
              h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-5 space-y-4' },
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  h('div', null,
                    h('label', { htmlFor: 'fo-date', className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '📅 Date'),
                    h('input', { id: 'fo-date', type: 'date', value: logForm.date,
                      onChange: function(e) { setLogForm(Object.assign({}, logForm, { date: e.target.value })); },
                      className: 'w-full p-2 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-teal-500'
                    })
                  ),
                  h('div', null,
                    h('label', { htmlFor: 'fo-time', className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '⏰ Time'),
                    h('input', { id: 'fo-time', type: 'time', value: logForm.time,
                      onChange: function(e) { setLogForm(Object.assign({}, logForm, { time: e.target.value })); },
                      className: 'w-full p-2 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-teal-500'
                    })
                  )
                ),
                h('div', null,
                  h('label', { htmlFor: 'fo-loc', className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '📍 Location *'),
                  h('input', { id: 'fo-loc', type: 'text',
                    value: logForm.location,
                    placeholder: 'e.g., Scarborough Marsh, my backyard, Mackworth Island',
                    onChange: function(e) { setLogForm(Object.assign({}, logForm, { location: e.target.value })); },
                    className: 'w-full p-2 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-teal-500',
                    'aria-required': 'true'
                  })
                ),
                h('div', null,
                  h('label', { htmlFor: 'fo-count', className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '🔢 Count'),
                  h('input', { id: 'fo-count', type: 'number', min: 1, max: 999,
                    value: logForm.count,
                    onChange: function(e) { setLogForm(Object.assign({}, logForm, { count: parseInt(e.target.value, 10) || 1 })); },
                    className: 'w-full p-2 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-teal-500'
                  })
                ),
                h('div', null,
                  h('div', { className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, '🐦 Behavior (check all that apply)'),
                  h('div', { className: 'flex flex-wrap gap-2' },
                    BEHAVIORS.map(function(b) {
                      var sel = (logForm.behaviors || []).indexOf(b) !== -1;
                      return h('button', { key: b,
                        onClick: function() { toggleBehavior(b); },
                        'aria-pressed': sel ? 'true' : 'false',
                        className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-teal-500/40 ' +
                          (sel ? 'bg-teal-700 text-white border-teal-800' : 'bg-white text-slate-800 border-slate-300 hover:border-teal-500')
                      }, (sel ? '✓ ' : '+ ') + b);
                    })
                  )
                ),
                h('div', null,
                  h('div', { className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2' }, '🌤 Weather'),
                  h('div', { role: 'radiogroup', 'aria-label': 'Weather', className: 'flex flex-wrap gap-2' },
                    WEATHER.map(function(w) {
                      var sel = logForm.weather === w.id;
                      return h('button', { key: w.id,
                        onClick: function() { setLogForm(Object.assign({}, logForm, { weather: w.id })); },
                        role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                        className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition focus:outline-none focus:ring-2 ring-teal-500/40 ' +
                          (sel ? 'bg-teal-700 text-white border-teal-800' : 'bg-white text-slate-800 border-slate-300 hover:border-teal-500')
                      }, w.label);
                    })
                  )
                ),
                h('div', null,
                  h('label', { htmlFor: 'fo-notes', className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '🖋 Notes (optional)'),
                  h('textarea', { id: 'fo-notes', value: logForm.notes, rows: 3,
                    placeholder: 'What was it doing? Habitat? Anything unusual?',
                    onChange: function(e) { setLogForm(Object.assign({}, logForm, { notes: e.target.value })); },
                    className: 'w-full p-2 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-teal-500 resize-y'
                  })
                ),
                h('div', { className: 'flex gap-2 flex-wrap pt-2' },
                  h('button', {
                    onClick: function() { setStep('reflect'); },
                    disabled: !canSubmit,
                    'aria-disabled': !canSubmit,
                    className: 'px-5 py-3 rounded-xl text-white text-base font-bold focus:outline-none focus:ring-4 ring-teal-500/40 ' +
                      (canSubmit ? 'bg-teal-700 hover:bg-teal-800' : 'bg-slate-300 cursor-not-allowed')
                  }, 'Continue to reflection →'),
                  !canSubmit && h('p', { className: 'text-xs text-slate-700 self-center italic' }, 'Add a location to continue.')
                )
              )
            )
          );
        }
        if (step === 'reflect' && logForm) {
          var canFinish = (logForm.reflection || '').trim().length >= 10;
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🪶', title: 'Reflection' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
              // ── Field-journal hero scene ──
              h('div', { className: 'rounded-2xl overflow-hidden shadow border-2 border-violet-300 relative' },
                h('svg', {
                  viewBox: '0 0 540 170', width: '100%',
                  style: { display: 'block' },
                  role: 'img', 'aria-label': 'Open field journal page with a feather quill resting on it'
                },
                  h('defs', null,
                    h('linearGradient', { id: 'reflBg', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                      h('stop', { offset: '0%', stopColor: '#f5f3ff' }),
                      h('stop', { offset: '100%', stopColor: '#ede9fe' })
                    ),
                    h('linearGradient', { id: 'reflPaper', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                      h('stop', { offset: '0%', stopColor: '#fffbeb' }),
                      h('stop', { offset: '100%', stopColor: '#fef3c7' })
                    ),
                    h('linearGradient', { id: 'reflFeather', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
                      h('stop', { offset: '0%', stopColor: '#7c3aed' }),
                      h('stop', { offset: '50%', stopColor: '#a78bfa' }),
                      h('stop', { offset: '100%', stopColor: '#f5f3ff' })
                    )
                  ),
                  h('rect', { x: 0, y: 0, width: 540, height: 170, fill: 'url(#reflBg)' }),
                  // Open journal — left page
                  h('g', { transform: 'rotate(-2 270 90)' },
                    h('path', { d: 'M40,30 L262,30 Q268,30 270,36 L270,150 Q268,156 262,156 L40,156 Q34,156 34,150 L34,36 Q34,30 40,30 Z',
                      fill: 'url(#reflPaper)', stroke: '#a8a29e', strokeWidth: 1 }),
                    // Lines on left page
                    [50, 64, 78, 92, 106, 120, 134].map(function(y, i) {
                      return h('line', { key: 'lL' + i, x1: 48, y1: y, x2: 256, y2: y,
                        stroke: '#fbbf24', strokeWidth: 0.5, opacity: 0.5 });
                    }),
                    // Faint sketches on left page (bird silhouettes)
                    h('path', { d: 'M70,52 Q78,46 86,52 Q90,58 86,62 Z M86,52 L92,55',
                      fill: '#a16207', opacity: 0.55 }),
                    h('path', { d: 'M150,72 Q158,66 168,72 Q172,78 168,82 Z M168,72 L174,76',
                      fill: '#a16207', opacity: 0.45 }),
                    // "Notes" text
                    h('text', { x: 48, y: 44, fontSize: 9, fontFamily: 'cursive, serif',
                      fill: '#7c2d12', opacity: 0.7, fontStyle: 'italic' }, 'Field Notes —')
                  ),
                  // Open journal — right page (the active page, with margin lines)
                  h('g', { transform: 'rotate(1.5 380 90)' },
                    h('path', { d: 'M280,28 L502,28 Q508,28 508,34 L508,148 Q508,154 502,154 L280,154 Q274,154 274,148 L274,34 Q274,28 280,28 Z',
                      fill: 'url(#reflPaper)', stroke: '#a8a29e', strokeWidth: 1 }),
                    // Margin line
                    h('line', { x1: 290, y1: 32, x2: 290, y2: 150, stroke: '#dc2626', strokeWidth: 0.6, opacity: 0.55 }),
                    // Ruled lines
                    [48, 62, 76, 90, 104, 118, 132, 146].map(function(y, i) {
                      return h('line', { key: 'lR' + i, x1: 295, y1: y, x2: 502, y2: y,
                        stroke: '#fbbf24', strokeWidth: 0.5, opacity: 0.5 });
                    }),
                    // "Reflection" header on right page
                    h('text', { x: 298, y: 44, fontSize: 11, fontFamily: 'serif',
                      fill: '#581c87', fontWeight: 'bold' }, 'Reflection —'),
                    // Faint pencil scribbles (waiting to be filled)
                    h('path', { d: 'M296,60 Q310,56 320,60 M324,60 Q330,58 336,60',
                      fill: 'none', stroke: '#a78bfa', strokeWidth: 0.6, opacity: 0.4 }),
                    h('path', { d: 'M296,74 Q314,70 332,74 Q344,76 354,74',
                      fill: 'none', stroke: '#a78bfa', strokeWidth: 0.6, opacity: 0.4 })
                  ),
                  // Center spine binding
                  h('line', { x1: 270, y1: 30, x2: 272, y2: 150, stroke: '#78716c', strokeWidth: 1.2, opacity: 0.7 }),
                  // Feather quill resting diagonally
                  h('g', { transform: 'translate(370, 90) rotate(-32)' },
                    // Shaft
                    h('line', { x1: -90, y1: 0, x2: 90, y2: 0, stroke: '#581c87', strokeWidth: 1.5, strokeLinecap: 'round' }),
                    // Vane (feather barbs)
                    h('path', { d: 'M-90,0 Q-60,-22 -30,-12 Q0,-2 60,-8 Q80,-10 90,-2 L90,2 Q80,10 60,8 Q0,2 -30,12 Q-60,22 -90,0 Z',
                      fill: 'url(#reflFeather)', stroke: '#7c3aed', strokeWidth: 0.5, opacity: 0.95 }),
                    // Barb detail lines
                    [-72, -54, -36, -18, 0, 18, 36, 54, 72].map(function(x, i) {
                      var hgt = 12 - Math.abs(x) / 14;
                      return h('g', { key: 'br' + i },
                        h('line', { x1: x, y1: 0, x2: x - 1, y2: -hgt, stroke: '#581c87', strokeWidth: 0.4, opacity: 0.65 }),
                        h('line', { x1: x, y1: 0, x2: x + 1, y2: hgt, stroke: '#581c87', strokeWidth: 0.4, opacity: 0.65 })
                      );
                    }),
                    // Quill tip
                    h('path', { d: 'M-90,-1 L-100,0 L-90,1 Z', fill: '#1e1b4b' }),
                    // Tiny ink droplet near tip
                    h('ellipse', { cx: -98, cy: 4, rx: 1.5, ry: 0.8, fill: '#1e1b4b', opacity: 0.7 })
                  ),
                  // Title overlay top-left
                  h('g', { transform: 'translate(20, 22)' },
                    h('rect', { x: 0, y: 0, width: 220, height: 32, rx: 16,
                      fill: '#581c87', opacity: 0.92,
                      stroke: '#a78bfa', strokeWidth: 1.5 }),
                    h('text', { x: 110, y: 21, textAnchor: 'middle',
                      fill: '#f5f3ff', fontWeight: 900, fontSize: 14, letterSpacing: '0.04em',
                      style: { fontFamily: 'system-ui, sans-serif' }
                    }, '🪶 What stood out?')
                  )
                ),
                h('div', { className: 'bg-violet-50 px-5 py-3 border-t-2 border-violet-300' },
                  h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-1' },
                    'Two or three sentences on what struck you about this bird. Behavior, sound, color, posture, the surrounding habitat, what it reminded you of, or what you noticed for the first time.'),
                  h('p', { className: 'text-xs text-violet-800 italic' },
                    'Reflection is what turns observation into long-term memory. Birders who reflect retain field marks better than those who just identify-and-move-on.')
                )
              ),
              h('div', { className: 'bg-white rounded-2xl border-2 border-violet-300 shadow p-4' },
                h('label', { htmlFor: 'fo-reflect', className: 'block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' },
                  'Reflective note about this ' + (sessionBird ? sessionBird.name : 'bird')),
                h('textarea', { id: 'fo-reflect', value: logForm.reflection || '', rows: 5,
                  placeholder: 'e.g., "I didn\'t realize how much chickadees move — they barely held still for two seconds at a time. The black bib stood out clearly against the white face."',
                  onChange: function(e) { setLogForm(Object.assign({}, logForm, { reflection: e.target.value })); },
                  className: 'w-full p-3 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-violet-500 resize-y',
                  'aria-required': 'true'
                }),
                h('div', { className: 'mt-2 flex justify-between text-xs text-slate-700' },
                  h('span', null, (logForm.reflection || '').length + ' characters'),
                  h('span', { className: 'italic' }, canFinish ? '✓ ready to save' : 'at least 10 characters')
                )
              ),
              h('div', { className: 'flex gap-2 flex-wrap' },
                h('button', {
                  onClick: saveEntry,
                  disabled: !canFinish,
                  'aria-disabled': !canFinish,
                  className: 'px-5 py-3 rounded-xl text-white text-base font-bold focus:outline-none focus:ring-4 ring-violet-500/40 ' +
                    (canFinish ? 'bg-violet-700 hover:bg-violet-800' : 'bg-slate-300 cursor-not-allowed')
                }, '💾 Save to my field notebook'),
                h('button', {
                  onClick: function() { setStep('log'); },
                  className: 'px-5 py-3 rounded-xl bg-white text-slate-800 border-2 border-slate-400 text-base font-bold hover:border-slate-600 focus:outline-none focus:ring-4 ring-slate-400/40'
                }, '← Back to log')
              )
            )
          );
        }
        if (step === 'done') {
          var lastEntry = notebook[0];
          var sb2 = sessionBird || (lastEntry ? { icon: lastEntry.speciesIcon, name: lastEntry.speciesName } : { icon: '🐦', name: 'Bird' });
          var __today = new Date();
          var __dateLabel = __today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '🎉', title: 'Saved to notebook' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
              // ── Stamped journal-page hero ──
              h('div', { className: 'rounded-2xl overflow-hidden shadow-lg border-2 border-emerald-400 relative', 'aria-live': 'polite' },
                h('svg', {
                  viewBox: '0 0 540 220', width: '100%',
                  style: { display: 'block' },
                  role: 'img', 'aria-label': 'Field journal page with observation stamped in'
                },
                  h('defs', null,
                    h('linearGradient', { id: 'doneBg', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                      h('stop', { offset: '0%', stopColor: '#ecfdf5' }),
                      h('stop', { offset: '100%', stopColor: '#fef9c3' })
                    ),
                    h('linearGradient', { id: 'donePaper', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                      h('stop', { offset: '0%', stopColor: '#fffbeb' }),
                      h('stop', { offset: '100%', stopColor: '#fde68a' })
                    )
                  ),
                  h('rect', { x: 0, y: 0, width: 540, height: 220, fill: 'url(#doneBg)' }),
                  // Confetti ribbons in background
                  [{x:50,y:30,r:-20,c:'#10b981'},{x:480,y:40,r:25,c:'#fbbf24'},{x:90,y:180,r:15,c:'#a78bfa'},{x:460,y:170,r:-25,c:'#f43f5e'},{x:250,y:18,r:-10,c:'#0ea5e9'}].map(function(c, i) {
                    return h('rect', { key: 'cf' + i, x: c.x, y: c.y, width: 14, height: 4,
                      transform: 'rotate(' + c.r + ' ' + (c.x + 7) + ' ' + (c.y + 2) + ')',
                      fill: c.c, opacity: 0.8 });
                  }),
                  // Sparkles
                  [{x:130,y:50},{x:420,y:75},{x:80,y:130},{x:470,y:130},{x:400,y:30},{x:200,y:200}].map(function(s, idx) {
                    return h('path', { key: 'sk' + idx,
                      d: 'M' + s.x + ',' + (s.y - 5) + ' L' + (s.x + 1.2) + ',' + (s.y - 1.2) + ' L' + (s.x + 5) + ',' + s.y + ' L' + (s.x + 1.2) + ',' + (s.y + 1.2) + ' L' + s.x + ',' + (s.y + 5) + ' L' + (s.x - 1.2) + ',' + (s.y + 1.2) + ' L' + (s.x - 5) + ',' + s.y + ' L' + (s.x - 1.2) + ',' + (s.y - 1.2) + ' Z',
                      fill: '#fbbf24', opacity: 0.85 });
                  }),
                  // Journal page (slight tilt)
                  h('g', { transform: 'rotate(-1.5 270 110)' },
                    // Page shadow
                    h('rect', { x: 92, y: 36, width: 358, height: 158, rx: 6, fill: '#0f172a', opacity: 0.12 }),
                    // Page
                    h('path', { d: 'M88,32 L448,32 Q454,32 454,38 L454,188 Q454,194 448,194 L88,194 Q82,194 82,188 L82,38 Q82,32 88,32 Z',
                      fill: 'url(#donePaper)', stroke: '#a16207', strokeWidth: 1 }),
                    // Margin
                    h('line', { x1: 100, y1: 38, x2: 100, y2: 188, stroke: '#dc2626', strokeWidth: 0.7, opacity: 0.5 }),
                    // Ruled lines
                    [62, 80, 98, 116, 134, 152, 170].map(function(y, i) {
                      return h('line', { key: 'dl' + i, x1: 106, y1: y, x2: 446, y2: y,
                        stroke: '#fbbf24', strokeWidth: 0.5, opacity: 0.5 });
                    }),
                    // Date stamp top-right of page
                    h('g', { transform: 'translate(380, 42) rotate(-3)' },
                      h('rect', { x: 0, y: 0, width: 64, height: 18, rx: 2,
                        fill: 'none', stroke: '#065f46', strokeWidth: 1.5, opacity: 0.85 }),
                      h('text', { x: 32, y: 12, textAnchor: 'middle',
                        fontSize: 9, fontWeight: 'bold', fill: '#065f46',
                        style: { fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }
                      }, __dateLabel)
                    ),
                    // Entry header (handwritten-looking)
                    h('text', { x: 108, y: 56, fontSize: 14, fontFamily: 'serif',
                      fontStyle: 'italic', fontWeight: 'bold', fill: '#581c87' }, 'Observation logged'),
                    // Species name
                    h('text', { x: 108, y: 76, fontSize: 16, fontWeight: 'bold',
                      fill: '#1e293b' }, sb2.name),
                    // Entry summary (handwritten-style transcription cues)
                    h('path', { d: 'M108,94 Q150,90 200,94 Q260,98 320,94 Q380,90 440,94',
                      fill: 'none', stroke: '#1e293b', strokeWidth: 0.8, opacity: 0.5 }),
                    h('path', { d: 'M108,112 Q160,108 220,112 Q280,116 340,112 Q400,108 430,112',
                      fill: 'none', stroke: '#1e293b', strokeWidth: 0.8, opacity: 0.5 }),
                    h('path', { d: 'M108,130 Q150,126 200,130 Q260,134 320,130',
                      fill: 'none', stroke: '#1e293b', strokeWidth: 0.8, opacity: 0.5 }),
                    // Bird sketch on right side of page
                    h('g', { transform: 'translate(370, 130)' },
                      h('ellipse', { cx: 0, cy: 0, rx: 22, ry: 16, fill: '#a16207', opacity: 0.4 }),
                      h('circle', { cx: -16, cy: -6, r: 9, fill: '#a16207', opacity: 0.4 }),
                      h('circle', { cx: -19, cy: -8, r: 1.5, fill: '#1c1917' }),
                      h('path', { d: 'M-24,-6 L-30,-4 L-24,-3 Z', fill: '#f59e0b', opacity: 0.7 }),
                      h('path', { d: 'M16,-2 Q26,-4 30,2 Q26,6 16,4 Z', fill: '#78350f', opacity: 0.4 }),
                      h('path', { d: 'M22,2 L32,-2 L32,6 Z', fill: '#78350f', opacity: 0.4 })
                    ),
                    // "✓ SAVED" stamp diagonal across page (the big celebration)
                    h('g', { transform: 'translate(285, 175) rotate(-12)' },
                      h('rect', { x: -70, y: -16, width: 140, height: 32, rx: 4,
                        fill: 'none', stroke: '#dc2626', strokeWidth: 3, opacity: 0.85 }),
                      h('text', { x: 0, y: 6, textAnchor: 'middle',
                        fontSize: 22, fontWeight: 900, fill: '#dc2626', opacity: 0.9,
                        style: { fontFamily: 'serif', letterSpacing: '0.08em' }
                      }, '✓ SAVED')
                    )
                  )
                ),
                // Banner below scene
                h('div', { className: 'bg-gradient-to-r from-emerald-50 to-amber-50 px-5 py-3 border-t-2 border-emerald-400 flex items-center justify-between gap-3 flex-wrap' },
                  h('div', null,
                    h('div', { className: 'text-2xl font-black text-emerald-900', style: { lineHeight: 1.1 } }, 'Entry saved!'),
                    h('div', { className: 'text-sm text-slate-800' },
                      h('strong', { className: 'text-emerald-800' }, sb2.name),
                      ' is now in your field notebook.')
                  ),
                  h('div', { className: 'text-right' },
                    h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-emerald-700' }, 'Total entries'),
                    h('div', { className: 'text-3xl font-black text-emerald-700 font-mono' }, notebook.length)
                  )
                )
              ),
              // Action buttons
              h('div', { className: 'flex gap-2 flex-wrap justify-center' },
                h('button', { onClick: startOver,
                  className: 'px-5 py-3 rounded-xl bg-teal-700 text-white text-base font-bold hover:bg-teal-800 focus:outline-none focus:ring-4 ring-teal-500/40'
                }, '🔭 Start another observation'),
                h('button', { onClick: function() { setStep('notebook'); },
                  className: 'px-5 py-3 rounded-xl bg-white text-emerald-800 border-2 border-emerald-500 text-base font-bold hover:border-emerald-700 focus:outline-none focus:ring-4 ring-emerald-500/40'
                }, '📓 Read my notebook (' + notebook.length + ')')
              )
            )
          );
        }
        if (step === 'notebook') {
          return h('div', { className: 'min-h-screen bg-slate-50' },
            h(BackBar, { icon: '📓', title: 'My Field Notebook' }),
            h('div', { className: 'p-6 max-w-3xl mx-auto space-y-4' },
              h('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
                h('h2', { className: 'text-lg font-black text-slate-800' },
                  notebook.length + ' observation' + (notebook.length === 1 ? '' : 's')),
                h('button', { onClick: startOver,
                  className: 'px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 focus:outline-none focus:ring-2 ring-teal-500/40'
                }, '+ New observation')
              ),
              notebook.length === 0
                ? h('div', { className: 'bg-gradient-to-br from-teal-50 via-emerald-50 to-sky-50 rounded-2xl border-2 border-dashed border-teal-300 p-10 text-center relative overflow-hidden' },
                    // Decorative bird silhouettes flying across the empty page
                    h('svg', { 'aria-hidden': true, style: { position: 'absolute', top: 12, right: 18, opacity: 0.18 }, width: 80, height: 30, viewBox: '0 0 80 30' },
                      h('path', { d: 'M 5 18 Q 12 8 20 18 Q 28 28 35 18', stroke: '#0d9488', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }),
                      h('path', { d: 'M 40 12 Q 47 4 55 12 Q 63 20 70 12', stroke: '#0d9488', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' })
                    ),
                    h('svg', { 'aria-hidden': true, style: { position: 'absolute', bottom: 14, left: 22, opacity: 0.14 }, width: 60, height: 22, viewBox: '0 0 60 22' },
                      h('path', { d: 'M 5 14 Q 12 6 20 14 Q 28 22 35 14', stroke: '#0d9488', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }),
                      h('path', { d: 'M 35 9 Q 42 3 50 9', stroke: '#0d9488', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' })
                    ),
                    h('div', { className: 'text-5xl mb-3', 'aria-hidden': true }, '📓'),
                    h('h3', { className: 'text-lg font-black text-teal-900 mb-2' }, 'Your field notebook is empty'),
                    h('p', { className: 'text-sm text-slate-700 leading-relaxed max-w-md mx-auto mb-1' },
                      'Once you complete a tracking observation or save an AI photo ID, your sightings appear here as a chronological log.'),
                    h('p', { className: 'text-xs text-slate-600 italic' },
                      'Real birders keep field notebooks for years — patterns emerge across seasons that no single observation reveals.'))
                : h('div', { className: 'space-y-3' },
                    notebook.map(function(entry) {
                      var dt = entry.date + (entry.time ? ' ' + entry.time : '');
                      var weatherLabel = (WEATHER.filter(function(w) { return w.id === entry.weather; })[0] || {}).label || entry.weather;
                      return h('div', { key: entry.id, className: 'bg-white rounded-2xl border-2 border-slate-300 shadow p-4' },
                        h('div', { className: 'flex items-start gap-3 mb-2' },
                          h('span', { 'aria-hidden': true, className: 'text-3xl flex-shrink-0' }, entry.speciesIcon || '🐦'),
                          h('div', { className: 'flex-1' },
                            h('h3', { className: 'text-base font-black text-slate-800' },
                              entry.speciesName, entry.count > 1 && h('span', { className: 'text-sm font-normal text-slate-700' }, ' × ' + entry.count)
                            ),
                            h('div', { className: 'text-xs text-slate-700 font-mono' }, dt + ' · ' + entry.location)
                          ),
                          h('button', {
                            onClick: function() { if (window.confirm('Delete this observation?')) deleteEntry(entry.id); },
                            'aria-label': 'Delete entry from ' + dt,
                            className: 'text-rose-600 hover:text-rose-800 text-sm font-bold'
                          }, '✕')
                        ),
                        h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                          weatherLabel && h('span', { className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300' }, weatherLabel),
                          (entry.behaviors || []).map(function(b, i) {
                            return h('span', { key: i, className: 'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300' }, b);
                          })
                        ),
                        entry.notes && h('p', { className: 'text-xs text-slate-700 mb-2' },
                          h('strong', null, '📝 Notes: '), entry.notes),
                        entry.reflection && h('div', { className: 'p-3 bg-violet-50 border border-violet-200 rounded-lg mb-2' },
                          h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-violet-700 mb-1' }, '🪶 Reflection'),
                          h('p', { className: 'text-xs text-slate-800 leading-relaxed italic' }, entry.reflection)
                        ),
                        // Deep-link cluster — verify or read more about this species
                        entry.speciesName && entry.speciesName !== 'Unidentified' && h('div', { className: 'pt-2 border-t border-slate-200' },
                          h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5' }, '🔗 Verify or learn more'),
                          birdLinkButtons(entry.speciesName, entry.speciesSciName, { size: 'xs' })
                        )
                      );
                    })
                  ),
              h('button', { onClick: function() { setStep('intro'); },
                className: 'px-4 py-2 rounded-xl bg-white text-slate-800 border-2 border-slate-300 text-sm font-bold hover:border-slate-500'
              }, '← Back to intro')
            )
          );
        }
        return null;
      }

      // ─────────────────────────────────────────────────────
      // BIRD PHOTO ID — student uploads a photo, Gemini Vision identifies
      // it with confidence scores. Top-3 candidates with deep links to
      // verify on real ID resources (eBird, All About Birds, Audubon, etc.).
      // ─────────────────────────────────────────────────────
      function BirdPhotoID() {
        var photo_state = useState(null);
        var photo = photo_state[0], setPhoto = photo_state[1];
        var loading_state = useState(false);
        var loading = loading_state[0], setLoading = loading_state[1];
        var result_state = useState(null);
        var result = result_state[0], setResult = result_state[1];
        var error_state = useState(null);
        var error = error_state[0], setError = error_state[1];
        var saveState_state = useState(null);  // null | 'prompt' | 'saved'
        var saveState = saveState_state[0], setSaveState = saveState_state[1];
        var saveLocation_state = useState('');
        var saveLocation = saveLocation_state[0], setSaveLocation = saveLocation_state[1];
        var fileInputRef = useRef(null);
        // Save-to-notebook bridge: when user has an AI ID, one click saves
        // a notebook entry (with a brief location prompt) tagged as photo-IDed.
        function saveAsNotebookEntry() {
          if (!result || !result.hasBird || !result.candidates || !result.candidates.length) return;
          var top = result.candidates[0];
          var now = new Date();
          var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
          var entry = {
            id: 'fn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            speciesId: null,
            speciesName: top.name || 'Unidentified',
            speciesIcon: '📸',
            speciesSciName: top.sciName || '',
            date: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()),
            time: pad(now.getHours()) + ':' + pad(now.getMinutes()),
            location: (saveLocation || '').trim() || 'Unspecified',
            count: 1,
            behaviors: [],
            weather: 'clear',
            notes: 'Identified via AI photo analysis. Confidence: ' + Math.round((top.confidence || 0) * 100) + '%. ' +
                   (top.rationale || '') +
                   (result.candidates.length > 1 ? ' Other candidates considered: ' + result.candidates.slice(1).map(function(c) { return c.name + ' (' + Math.round((c.confidence || 0) * 100) + '%)'; }).join(', ') + '.' : ''),
            reflection: '',
            createdAt: now.toISOString(),
            source: 'photoId'
          };
          var nextNotebook = [entry].concat(lsGet('birdLab.fieldNotebook.v1', []) || []);
          lsSet('birdLab.fieldNotebook.v1', nextNotebook);
          // Also award the badge (mirrors FieldObservation badge logic)
          var prev = d.blBadges || {};
          if (!prev.fieldObs) {
            var nbb = Object.assign({}, prev); nbb.fieldObs = true;
            upd('blBadges', nbb);
            lsSet('birdLab.badges.v1', nbb);
          }
          setSaveState('saved');
        }
        function onFile(e) {
          var f = e && e.target && e.target.files && e.target.files[0];
          if (!f) return;
          if (f.size > 6 * 1024 * 1024) { setError('Image is over 6 MB — please choose a smaller photo.'); return; }
          if (f.type && f.type.indexOf('image/') !== 0) { setError('Please pick an image file (JPEG, PNG, or HEIC).'); return; }
          setError(null);
          setResult(null);
          var reader = new FileReader();
          reader.onload = function(evt) {
            var dataUrl = evt.target.result;
            var b64 = dataUrl.indexOf(',') !== -1 ? dataUrl.split(',')[1] : dataUrl;
            setPhoto({ dataUrl: dataUrl, mimeType: f.type || 'image/jpeg', base64: b64, fileName: f.name });
          };
          reader.onerror = function() { setError('Could not read the image file.'); };
          reader.readAsDataURL(f);
        }
        function clearPhoto() {
          setPhoto(null); setResult(null); setError(null);
          setSaveState(null); setSaveLocation('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
        function identify() {
          if (!photo) return;
          if (!ctx.callGeminiVision) {
            setError('The Vision API isn\'t available in this build. Try opening the app in the deployed version.');
            return;
          }
          setLoading(true); setError(null); setResult(null);
          var prompt = 'You are an expert ornithologist analyzing a bird photo. ' +
            'Identify the most likely species. Return ONLY valid JSON, no prose, no markdown:\n' +
            '{"hasBird": true|false, ' +
            '"candidates": [' +
            '{"name": "Common name", "sciName": "Genus species", "confidence": 0.85, "rationale": "1-2 sentences on key field marks visible in this photo"}' +
            '], ' +
            '"keyMarks": ["field mark 1 visible", "field mark 2"], ' +
            '"photoQuality": "good|fair|poor", ' +
            '"photoQualityNote": "1 sentence on what would help identification (sharper focus, side angle, etc.)", ' +
            '"context": "1-2 sentences on habitat/behavior visible if any"}\n' +
            'Provide up to 3 candidates ordered by confidence. ' +
            'IMPORTANT: confidence values 0.0–1.0. Be honest — if uncertain, return multiple candidates with lower confidence each. ' +
            'If photo does not contain a bird, return hasBird=false and candidates=[].';
          ctx.callGeminiVision(prompt, photo.base64, photo.mimeType).then(function(text) {
            try {
              var cleaned = String(text || '').trim();
              if (cleaned.indexOf('```') !== -1) {
                var parts = cleaned.split('```');
                cleaned = parts[1] || parts[0];
                if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n');
                if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'));
              }
              var parsed = JSON.parse(cleaned);
              setResult(parsed);
              setLoading(false);
              if (parsed.hasBird) {
                var prev = d.blBadges || {};
                if (!prev.photoId) {
                  var nbb = Object.assign({}, prev); nbb.photoId = true;
                  upd('blBadges', nbb);
                  lsSet('birdLab.badges.v1', nbb);
                }
              }
            } catch (e) {
              setError('Could not parse the AI response. Try a different photo or retry.');
              setLoading(false);
            }
          }).catch(function(err) {
            setError('Vision API request failed: ' + (err && err.message ? err.message : 'unknown error'));
            setLoading(false);
          });
        }
        function confidenceBar(conf) {
          var pct = Math.round((conf || 0) * 100);
          // Gradient + glow tier
          var gradient, glow, labelColor;
          if (pct >= 80) {
            gradient = 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)';
            glow = '0 0 8px rgba(16,185,129,0.55), inset 0 1px 0 rgba(255,255,255,0.4)';
            labelColor = 'text-emerald-700';
          } else if (pct >= 60) {
            gradient = 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fde68a 100%)';
            glow = '0 0 6px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.4)';
            labelColor = 'text-amber-700';
          } else {
            gradient = 'linear-gradient(90deg, #be123c 0%, #ef4444 50%, #fb7185 100%)';
            glow = '0 0 6px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.3)';
            labelColor = 'text-rose-700';
          }
          // Tick marks at 25/50/75 inside the track for scale
          return h('div', { className: 'flex items-center gap-2' },
            h('div', { className: 'flex-1 h-3 bg-slate-200 rounded-full overflow-hidden relative shadow-inner' },
              // Tick marks
              [25, 50, 75].map(function(t, i) {
                return h('div', { key: i, 'aria-hidden': true,
                  style: { position: 'absolute', top: 0, bottom: 0, left: t + '%', width: '1px', background: 'rgba(255,255,255,0.45)' } });
              }),
              // Filled bar
              h('div', { className: 'h-full transition-all duration-500',
                style: { width: pct + '%', background: gradient, boxShadow: glow, borderRadius: '999px' } }),
              // Confidence threshold marker (vertical line at 80%)
              pct < 80 && h('div', { 'aria-hidden': true,
                style: { position: 'absolute', top: -2, bottom: -2, left: '80%', width: '2px',
                  background: '#10b981', borderRadius: '1px', opacity: 0.6 },
                title: 'High-confidence threshold' })
            ),
            h('span', { className: 'text-sm font-bold font-mono ' + labelColor, style: { minWidth: 44, textAlign: 'right' } }, pct + '%')
          );
        }
        function confidenceLabel(conf) {
          var pct = Math.round((conf || 0) * 100);
          if (pct >= 85) return { text: 'High confidence', tone: 'text-emerald-800', icon: '✓' };
          if (pct >= 65) return { text: 'Moderate confidence', tone: 'text-amber-800', icon: '~' };
          if (pct >= 40) return { text: 'Low confidence — verify before logging', tone: 'text-rose-800', icon: '?' };
          return { text: 'Very uncertain — consider asking a human birder', tone: 'text-rose-800', icon: '?' };
        }
        return h('div', { className: 'min-h-screen bg-slate-50' },
          h(BackBar, { icon: '📸', title: 'Bird Photo ID' }),
          h('div', { className: 'p-6 max-w-3xl mx-auto space-y-5' },
            h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-2xl p-5' },
              h('h2', { className: 'text-lg font-black text-violet-900 mb-2' }, '📸 Identify a bird from a photo'),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-2' },
                'Upload a photo you took (or one you\'re trying to identify) and AI vision analysis returns the top-3 likely species with confidence scores and the field marks it noticed. ',
                h('strong', null, 'AI is a starting point, not a verdict'),
                ' — verify against real species pages on eBird, All About Birds, and Audubon, especially for tricky lookalikes (warblers, sparrows, juvenile gulls).'
              ),
              h('p', { className: 'text-xs text-slate-700 italic' },
                'Your photo is sent to Google\'s Gemini Vision API for analysis. Photos are not stored long-term by AlloFlow. Don\'t upload photos containing other people without their consent.')
            ),
            !photo && h('div', {
              className: 'rounded-2xl border-2 border-dashed border-violet-400 shadow p-10 text-center relative overflow-hidden',
              style: { background: 'radial-gradient(ellipse at center, #faf5ff 0%, #ede9fe 60%, #ddd6fe 100%)' }
            },
              // Decorative flying bird silhouettes
              h('svg', { 'aria-hidden': true, style: { position: 'absolute', top: 18, left: 22, opacity: 0.16 }, width: 70, height: 26, viewBox: '0 0 70 26' },
                h('path', { d: 'M 5 16 Q 12 6 20 16 Q 28 26 35 16', stroke: '#7c3aed', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }),
                h('path', { d: 'M 35 11 Q 42 3 50 11 Q 58 19 65 11', stroke: '#7c3aed', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' })
              ),
              h('svg', { 'aria-hidden': true, style: { position: 'absolute', bottom: 22, right: 28, opacity: 0.12 }, width: 80, height: 28, viewBox: '0 0 80 28' },
                h('path', { d: 'M 5 18 Q 14 6 24 18 Q 34 30 44 18', stroke: '#7c3aed', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }),
                h('path', { d: 'M 44 12 Q 52 4 62 12 Q 72 20 79 12', stroke: '#7c3aed', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' })
              ),
              // Camera-with-bird hero icon
              h('div', { className: 'inline-flex items-center justify-center mb-3 relative', style: { width: 88, height: 88 } },
                h('div', { className: 'absolute inset-0 rounded-full', style: { background: 'radial-gradient(circle, rgba(167,139,250,0.45), transparent 70%)' } }),
                h('div', { className: 'text-6xl relative', 'aria-hidden': true }, '📸'),
                h('div', { className: 'text-2xl absolute', 'aria-hidden': true, style: { top: -6, right: -8 } }, '🐦')
              ),
              h('h3', { className: 'text-lg font-black text-violet-900 mb-2' }, 'Pick a photo to start'),
              h('p', { className: 'text-xs text-slate-700 mb-5 max-w-sm mx-auto leading-relaxed' },
                'JPEG, PNG, or HEIC. Up to 6 MB. Closer + sharper photos work better. Side-angle shots show field marks AI can use.'),
              h('label', { htmlFor: 'birdPhoto-input',
                className: 'inline-block px-6 py-3 rounded-xl text-white text-base font-bold cursor-pointer focus-within:ring-4 ring-violet-500/40 transition-all hover:shadow-lg hover:-translate-y-0.5',
                style: { background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }
              }, '📷 Choose a photo'),
              h('input', {
                id: 'birdPhoto-input', ref: fileInputRef, type: 'file', accept: 'image/*',
                onChange: onFile,
                style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 },
                'aria-label': 'Choose a bird photo to identify'
              }),
              error && h('div', { className: 'mt-4 p-3 bg-rose-50 border border-rose-300 rounded-lg text-sm text-rose-800', role: 'alert' }, '⚠ ' + error)
            ),
            photo && h('div', { className: 'bg-white rounded-2xl border-2 border-violet-400 shadow p-5' },
              h('div', { className: 'flex items-start gap-4 flex-wrap' },
                h('img', { src: photo.dataUrl,
                  alt: 'Bird photo to identify (' + photo.fileName + ')',
                  style: { maxWidth: '280px', maxHeight: '280px', borderRadius: 8, border: '2px solid #e2e8f0' }
                }),
                h('div', { className: 'flex-1 min-w-[180px] space-y-3' },
                  h('div', { className: 'text-xs text-slate-700' }, h('strong', null, '📁 ' + photo.fileName)),
                  !result && !loading && h('button', { onClick: identify,
                    className: 'w-full px-5 py-3 rounded-xl bg-violet-700 text-white text-base font-bold hover:bg-violet-800 focus:outline-none focus:ring-4 ring-violet-500/40'
                  }, '🔬 Identify this bird'),
                  loading && h('div', { className: 'p-4 bg-violet-50 border border-violet-300 rounded-xl text-center', 'aria-live': 'polite', 'aria-busy': 'true' },
                    h('div', { className: 'text-2xl mb-1 animate-pulse' }, '🔬'),
                    h('p', { className: 'text-sm text-violet-800 font-bold' }, 'Analyzing...'),
                    h('p', { className: 'text-xs text-slate-700 mt-1' }, 'Gemini Vision is examining field marks. ~5–15 seconds.')
                  ),
                  h('button', { onClick: clearPhoto,
                    className: 'w-full px-4 py-2 rounded-xl bg-white text-slate-800 border-2 border-slate-300 text-sm font-bold hover:border-slate-500'
                  }, '✕ Choose a different photo')
                )
              ),
              error && h('div', { className: 'mt-4 p-3 bg-rose-50 border border-rose-300 rounded-lg text-sm text-rose-800', role: 'alert' }, '⚠ ' + error)
            ),
            result && h('div', { className: 'space-y-3', 'aria-live': 'polite' },
              !result.hasBird && h('div', { className: 'bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 text-center' },
                h('div', { className: 'text-4xl mb-2' }, '🤔'),
                h('h3', { className: 'text-base font-black text-amber-900 mb-1' }, 'AI didn\'t see a bird in this photo'),
                h('p', { className: 'text-sm text-slate-800' }, 'Try a clearer photo, or one where the bird is more centered.')
              ),
              result.hasBird && Array.isArray(result.candidates) && result.candidates.length > 0 && h('div', { className: 'space-y-3' },
                h('h3', { className: 'text-base font-black text-slate-800' },
                  result.candidates.length === 1 ? '🥇 Best match' : '🎯 Top ' + result.candidates.length + ' candidates'
                ),
                result.candidates.map(function(cand, i) {
                  var conflabel = confidenceLabel(cand.confidence);
                  var pal = rankPalette(i);
                  return h('div', { key: i,
                    className: 'rounded-2xl shadow p-4 pt-6 relative',
                    style: {
                      background: pal.cardTint,
                      border: pal.cardBorderWidth + ' solid ' + pal.cardBorder,
                      boxShadow: pal.cardShadow,
                      marginTop: i === 0 ? 18 : 12
                    }
                  },
                    rankMedallion(i),
                    h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap justify-end' },
                      h('span', { className: 'text-xs font-bold ' + conflabel.tone }, conflabel.icon + ' ' + conflabel.text)
                    ),
                    h('h4', { className: 'text-lg font-black text-slate-800' }, cand.name),
                    cand.sciName && h('p', { className: 'text-sm italic text-slate-700 mb-2' }, cand.sciName),
                    h('div', { className: 'mb-2' }, confidenceBar(cand.confidence)),
                    cand.rationale && h('p', { className: 'text-sm text-slate-800 leading-relaxed mb-3' },
                      h('strong', { className: 'text-violet-800' }, '👁 What the AI noticed: '),
                      cand.rationale
                    ),
                    h('div', null,
                      h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5' }, '🔗 Verify on...'),
                      birdLinkButtons(cand.name, cand.sciName)
                    )
                  );
                })
              ),
              result.keyMarks && result.keyMarks.length > 0 && h('div', { className: 'bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4' },
                h('h4', { className: 'text-sm font-bold uppercase tracking-wider text-emerald-800 mb-2' }, '👁 Field marks the AI used'),
                h('ul', { className: 'space-y-1' },
                  result.keyMarks.map(function(m, i) {
                    return h('li', { key: i, className: 'text-sm text-slate-800 leading-relaxed' }, '• ' + m);
                  })
                )
              ),
              result.photoQuality && h('div', { className: 'bg-slate-50 border border-slate-300 rounded-xl p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-slate-700 mb-1' }, '📷 Photo quality: ' + result.photoQuality),
                result.photoQualityNote && h('p', { className: 'text-xs text-slate-700 italic' }, result.photoQualityNote)
              ),
              result.context && h('div', { className: 'bg-sky-50 border border-sky-300 rounded-xl p-3' },
                h('div', { className: 'text-xs font-bold uppercase tracking-wider text-sky-700 mb-1' }, '🌳 Context'),
                h('p', { className: 'text-xs text-slate-800 italic' }, result.context)
              ),
              h('div', { className: 'bg-amber-50 border border-amber-300 rounded-xl p-3' },
                h('p', { className: 'text-xs text-slate-800 leading-relaxed italic' },
                  h('strong', null, '⚠ Always verify. '),
                  'AI-based bird ID is good but imperfect. Confusing pairs (warblers, sparrows, female ducks, juvenile gulls, immature raptors) trip up both humans and AI. Use the verify links above. For research-grade observations, check with an expert birder via your local Audubon chapter or post on iNaturalist for community ID.'
                )
              ),
              // ── Save-to-notebook flow: prompt → save → confirmed ──
              saveState === null && h('div', { className: 'flex gap-2 flex-wrap' },
                h('button', { onClick: clearPhoto,
                  className: 'px-4 py-2 rounded-xl bg-violet-700 text-white text-sm font-bold hover:bg-violet-800'
                }, '📷 Identify another photo'),
                result && result.hasBird && result.candidates && result.candidates.length > 0 && h('button', {
                  onClick: function() { setSaveState('prompt'); },
                  className: 'px-4 py-2 rounded-xl bg-white text-violet-800 border-2 border-violet-400 text-sm font-bold hover:border-violet-600'
                }, '📓 Save to my field notebook'),
                h('button', { onClick: function() { setView('fieldObs'); upd('view', 'fieldObs'); },
                  className: 'px-4 py-2 rounded-xl bg-white text-slate-700 border-2 border-slate-300 text-sm font-bold hover:border-slate-500'
                }, '🔭 Open field notebook')
              ),
              saveState === 'prompt' && h('div', { className: 'bg-white rounded-2xl border-2 border-violet-500 shadow p-4 space-y-3' },
                h('h4', { className: 'text-base font-black text-slate-800' }, '📓 Save this AI ID to your field notebook'),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed' },
                  'Quick save. The AI\'s top guess (', h('strong', { className: 'text-violet-800' }, result.candidates[0].name), ') will be the species, with the AI rationale + confidence saved as notes. You can edit any details later by opening the entry from the field notebook.'),
                h('label', { htmlFor: 'photoId-loc', className: 'block text-xs font-bold uppercase tracking-wider text-slate-700' }, '📍 Where was this photo taken?'),
                h('input', { id: 'photoId-loc', type: 'text',
                  value: saveLocation,
                  placeholder: 'e.g., Scarborough Marsh, my backyard, "found photo online"',
                  onChange: function(e) { setSaveLocation(e.target.value); },
                  className: 'w-full p-2 rounded-lg border-2 border-slate-300 text-sm focus:outline-none focus:border-violet-500'
                }),
                h('div', { className: 'flex gap-2 flex-wrap' },
                  h('button', { onClick: saveAsNotebookEntry,
                    className: 'px-5 py-2 rounded-xl bg-violet-700 text-white text-sm font-bold hover:bg-violet-800 focus:outline-none focus:ring-4 ring-violet-500/40'
                  }, '💾 Save entry'),
                  h('button', { onClick: function() { setSaveState(null); },
                    className: 'px-5 py-2 rounded-xl bg-white text-slate-700 border-2 border-slate-300 text-sm font-bold hover:border-slate-500'
                  }, 'Cancel')
                )
              ),
              saveState === 'saved' && h('div', { className: 'bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-5 text-center', 'aria-live': 'polite' },
                h('div', { className: 'text-4xl mb-2' }, '✓'),
                h('h3', { className: 'text-base font-black text-emerald-900 mb-1' }, 'Saved to your field notebook'),
                h('p', { className: 'text-sm text-slate-800 mb-3' },
                  result.candidates[0].name + ' was added with the AI rationale + confidence as notes. Open the notebook to add more detail (behavior, weather, reflection).'
                ),
                h('div', { className: 'flex gap-2 flex-wrap justify-center' },
                  h('button', {
                    onClick: function() { setView('fieldObs'); upd('view', 'fieldObs'); },
                    className: 'px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800'
                  }, '📓 Open field notebook'),
                  h('button', {
                    onClick: function() { clearPhoto(); setSaveState(null); setSaveLocation(''); },
                    className: 'px-4 py-2 rounded-xl bg-white text-slate-700 border-2 border-slate-300 text-sm font-bold hover:border-slate-500'
                  }, '📷 Identify another photo')
                )
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────────
      // VIEW DISPATCH
      // ─────────────────────────────────────────────────────
      if (view === 'ispy') return h(ISpyHabitat);
      if (view === 'fieldMarks') return h(FieldMarksTrainer);
      if (view === 'beakFeet') return h(BeakFeetLab);
      if (view === 'calls') return h(BirdCallTrainer);
      if (view === 'habitatMatch') return h(HabitatMatchLab);
      if (view === 'maineBirds') return h(MaineBirdsSpotlight);
      if (view === 'migration') return h(MigrationPatternsLab);
      if (view === 'citizenScience') return h(CitizenScienceBridge);
      if (view === 'fieldObs') return h(FieldObservation);
      if (view === 'conservation') return h(ConservationCareers);
      if (view === 'photoId') return h(BirdPhotoID);
      return h(MainMenu);
    }
  });

})();

}
