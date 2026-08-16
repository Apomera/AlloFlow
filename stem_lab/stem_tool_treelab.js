// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_treelab.js — Tree Life Lab (standalone CDN module)
//
// The whole-ORGANISM scale of photosynthesis. Two other tools already own the
// neighbouring scales and this one deliberately does not duplicate either:
//   chemBalance — the balanced equation, Calvin cycle stoichiometry, dH
//   cell        — the chloroplast as an organelle, energy + redox lens
// Neither answers "what is limiting the rate RIGHT NOW", which is the question a
// living tree answers every hour and records permanently in its rings. That gap
// (rate limitation, source-sink transport, the respiration cost of living wood,
// and clonal vs sexual reproduction) is what this tool teaches.
//
// Grade span: every band. ctx.gradeBand ('k2'|'g35'|'g68'|'g912') selects depth,
// with a local override so a teacher can pin a band for a mixed group.
// ═══════════════════════════════════════════

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

// Dedup: skip if already registered (hub may have loaded an inline copy)
if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('treeLab'))) {

(function() {
  'use strict';

  // ── Typography constants. Kept as escapes so the file stays ASCII on disk and
  //    survives the Windows/PowerShell write paths that have truncated multibyte
  //    literals in this repo before. ──
  var CO2 = 'CO₂';
  var H2O = 'H₂O';
  var O2  = 'O₂';
  var ARROW = '→';
  var DEG = '°';

  // ── Audio (shared house style: short, quiet, never blocking) ──
  var _treeAC = null;
  function getTreeAC() {
    if (!_treeAC) { try { _treeAC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (_treeAC && _treeAC.state === 'suspended') { try { _treeAC.resume(); } catch (e) {} }
    return _treeAC;
  }
  function treeTone(f, d, tp, v) {
    var ac = getTreeAC(); if (!ac) return;
    try {
      var o = ac.createOscillator(); var g = ac.createGain();
      o.type = tp || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.06, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.1));
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (d || 0.1));
    } catch (e) {}
  }
  function sfxTick()  { treeTone(420, 0.03, 'sine', 0.03); }
  function sfxGrow()  { treeTone(392, 0.07, 'sine', 0.05); setTimeout(function () { treeTone(523, 0.09, 'sine', 0.05); }, 60); }
  function sfxBad()   { treeTone(180, 0.16, 'sawtooth', 0.05); }

  // WCAG 4.1.3: status live region for dynamic announcements
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-treelab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-treelab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
    if (document.body) document.body.appendChild(lr);
  })();
  function srSay(msg) {
    try {
      var lr = document.getElementById('allo-live-treelab');
      if (lr) lr.textContent = String(msg || '');
    } catch (e) {}
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round(v, n) { var m = Math.pow(10, n || 0); return Math.round(v * m) / m; }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: GRADE BANDS
  //
  // ctx.gradeBand is host-derived from the user's grade setting and is part of the
  // published ctx surface, so this tool consumes it rather than re-deriving it from
  // gradeLevel with its own regex (which is how watercycle predates the host helper
  // and why the two disagree on both spelling and default). A local override lets a
  // teacher pin one band for a mixed group.
  //
  // Host contract: 'k2' | 'g35' | 'g68' | 'g912', defaulting to 'g68'.
  // ─────────────────────────────────────────────────────────
  var BANDS = ['k2', 'g35', 'g68', 'g912'];
  var BAND_LABEL = { k2: 'K-2', g35: 'Grades 3-5', g68: 'Grades 6-8', g912: 'Grades 9-12' };

  function resolveBand(ctx, d) {
    var ov = d && d.bandOverride;
    if (ov && BANDS.indexOf(ov) >= 0) return ov;
    var hb = ctx && ctx.gradeBand;
    if (hb && BANDS.indexOf(hb) >= 0) return hb;
    return 'g68';
  }
  function bandRank(b) { var i = BANDS.indexOf(b); return i < 0 ? 2 : i; }
  // atLeast('g68') is the gate used throughout: a feature appears from that band up.
  function atLeast(band, floor) { return bandRank(band) >= bandRank(floor); }

  // ─────────────────────────────────────────────────────────
  // SECTION 2: SPECIES
  //
  // Each species carries the traits the simulation actually reads, so a species
  // choice changes outcomes rather than only the label. Reproduction modes are the
  // ones that species genuinely uses; that list drives which strategies are legal
  // in the Spread game, which is what keeps the game honest.
  // ─────────────────────────────────────────────────────────
  var SPECIES = [
    {
      id: 'oak', name: 'White Oak', emoji: '🌳',
      leafType: 'broadleaf', maxHeight: 30, maxAgeYears: 400,
      amax: 2.9,            // kg C fixed per m2 of leaf per full year, well-watered
      respRate: 0.055,       // kg C per kg of living tissue per year (maintenance)
      barkThick: 0.85,       // 0-1, fire resistance
      droughtTol: 0.75,      // 0-1
      shadeTol: 0.45,
      woodDensity: 640, slenderness: 30, crownWidth: 1.18, tiers: 4,
      modes: ['seed_animal', 'mast', 'basal_resprout'],
      note: 'Thick bark protects the cambium from ground fire. Acorns are carried and buried by jays and squirrels, which plants them further than the tree could throw them.'
    },
    {
      id: 'aspen', name: 'Quaking Aspen', emoji: '🍂',
      leafType: 'broadleaf', maxHeight: 20, maxAgeYears: 120,
      amax: 2.7, respRate: 0.075, barkThick: 0.2, droughtTol: 0.35, shadeTol: 0.15,
      woodDensity: 380, slenderness: 65, crownWidth: 0.70, tiers: 4,
      modes: ['seed_wind', 'root_sucker', 'basal_resprout'],
      note: 'Aspen spreads mostly by root suckers. A whole stand can be one genetic individual sharing one root system, which is a strength against fire and a weakness against disease.'
    },
    {
      id: 'willow', name: 'Black Willow', emoji: '🌿',
      leafType: 'broadleaf', maxHeight: 18, maxAgeYears: 75,
      amax: 2.95, respRate: 0.085, barkThick: 0.25, droughtTol: 0.15, shadeTol: 0.2,
      woodDensity: 350, slenderness: 45, crownWidth: 1.08, tiers: 4,
      modes: ['seed_wind', 'fragment', 'layering', 'basal_resprout'],
      note: 'Willow wood is brittle and its twigs break away easily. Broken pieces wash downstream, lodge in wet gravel and root, so the flood that breaks the tree is also what plants it.'
    },
    {
      id: 'pine', name: 'Eastern White Pine', emoji: '🌲',
      leafType: 'needle', maxHeight: 45, maxAgeYears: 300,
      amax: 2.4, respRate: 0.04, barkThick: 0.7, droughtTol: 0.6, shadeTol: 0.3,
      woodDensity: 380, slenderness: 50, crownWidth: 1.12, tiers: 4,
      modes: ['seed_wind', 'mast'],
      note: 'Needles hold on through winter, so a pine can fix carbon on a mild day in February when the oak beside it is bare. It has no clonal route at all: seed is its only way forward.'
    },
    {
      id: 'redwood', name: 'Coast Redwood', emoji: '🎄',
      leafType: 'needle', maxHeight: 90, maxAgeYears: 2000,
      amax: 2.8, respRate: 0.03, barkThick: 1.0, droughtTol: 0.4, shadeTol: 0.6,
      woodDensity: 420, slenderness: 55, crownWidth: 0.60, tiers: 7,
      modes: ['seed_wind', 'basal_resprout', 'layering'],
      note: 'Bark up to a foot thick and very low flammability. After damage it resprouts from the base, which is why redwoods often stand in a ring around where a parent trunk used to be.'
    }
  ];
  function speciesById(id) {
    for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].id === id) return SPECIES[i];
    return SPECIES[0];
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 3: THE CARBON ENGINE
  //
  // This is a QUALITATIVE TEACHING MODEL, not a forest growth model. The shapes are
  // real (saturating light response, a minimum-of-limiting-factors gate, maintenance
  // respiration that scales with living tissue, ring width falling as circumference
  // grows) and the magnitudes are the right order for a temperate broadleaf, but no
  // number here should be quoted as a measurement. That caveat is surfaced in the UI
  // rather than buried here, following the precedent set by waterCycle's precipitation
  // note.
  //
  // Everything in this section is a pure function of its arguments so the engine can
  // be exercised without a DOM.
  // ─────────────────────────────────────────────────────────

  // Saturating light response. Doubling light near zero nearly doubles the rate;
  // doubling it in full sun barely moves. This is why an understory seedling is
  // light-limited and a canopy tree is not.
  function lightFactor(light) {
    var L = clamp(light, 0, 1);
    return L / (L + 0.22);
  }
  // CO2 only enters through open stomata, so the CO2 term is gated by aperture.
  function co2Factor(co2ppm, aperture) {
    var c = clamp(co2ppm, 150, 1200);
    var half = 260;
    return (c / (c + half)) * clamp(aperture, 0, 1);
  }
  // Temperature response: broad optimum, hard fall-off at both ends. Below freezing a
  // broadleaf is not fixing carbon at all.
  function tempFactor(tempC, leafType) {
    var opt = leafType === 'needle' ? 18 : 24;
    var width = leafType === 'needle' ? 16 : 13;
    if (tempC <= 0) return leafType === 'needle' ? 0.04 : 0;
    var z = (tempC - opt) / width;
    return clamp(Math.exp(-z * z), 0, 1);
  }
  // Soil water drives stomatal aperture. A drought-tolerant species holds its stomata
  // open further at the same soil water, which is the whole trade: it keeps fixing
  // carbon but spends water doing it.
  function stomatalAperture(soilWater, droughtTol, forcedClose) {
    if (forcedClose) return 0.02;
    var w = clamp(soilWater, 0, 1);
    var threshold = 0.55 - droughtTol * 0.3;
    if (w >= threshold) return 1;
    // Squared falloff. Conductance does not decline linearly with soil water: past the
    // threshold the pore shuts hard. This is what makes extra CO2 worth almost nothing
    // in ABSOLUTE terms to a drought-stressed tree, even though the ratio between two
    // CO2 levels is unchanged — the ratio applies to a rate that is already near zero.
    var rel = w / threshold;
    return clamp(rel * rel, 0.01, 1);
  }

  // Which factor is actually holding the rate down. This is the tool's core question
  // and it is deliberately computed, not narrated: the label follows the numbers.
  function limitingFactor(parts, opts) {
    var o = opts || {};
    var order = [
      { id: 'temperature', v: parts.temp },
      { id: 'light', v: parts.light },
      { id: 'co2', v: parts.co2 },
      { id: 'water', v: parts.water }
    ];
    var min = order[0];
    for (var i = 1; i < order.length; i++) if (order[i].v < min.v) min = order[i];

    // Attribution, not just arithmetic. In a drought the CO2 term IS the smallest
    // number — but only because water stress shut the stomata that admit CO2. Naming
    // CO2 there would send a student off to add CO2, which this same tool teaches is
    // useless to a tree that cannot open its pores. Report the cause they can act on.
    if (min.id === 'co2' && o.aperture != null && o.aperture < 0.9 && o.co2AtFullAperture != null) {
      var othersMin = Math.min(parts.light, parts.temp, parts.water);
      if (o.co2AtFullAperture > othersMin) return { id: 'water', v: parts.water, viaStomata: true };
    }
    return min;
  }

  // Beer-Lambert self-shading. This is the brake on the whole system: a tree with
  // twice the leaf area does NOT gain twice the carbon, because the extra leaves sit
  // in the shade of the existing ones. Leaf area index (leaf area per unit of ground
  // the crown covers) climbs as the canopy thickens, and each added layer intercepts
  // what is left of the light rather than a fresh share of it.
  function effectiveLeafArea(leafArea) {
    if (!leafArea || leafArea <= 0) return 0;
    var crownGround = Math.pow(leafArea, 0.66) * 1.2;   // canopy footprint on the ground
    var lai = leafArea / crownGround;
    return crownGround * (1 - Math.exp(-0.5 * lai));
  }

  // Gross photosynthesis for one year, in kg of carbon.
  function grossPhotosynthesis(sp, env, leafArea, aperture) {
    var fT = tempFactor(env.tempC, sp.leafType);
    var fL = lightFactor(env.light);
    var fC = co2Factor(env.co2ppm, aperture);
    var fW = clamp(env.soilWater, 0, 1);
    // Liebig gate on the two supply terms (light and CO2 are substitutable only up to
    // the smaller of the two), then temperature and water scale the whole rate.
    var supply = Math.min(fL, fC);
    var seasonLen = sp.leafType === 'needle' ? 1.0 : 0.62; // needles work a longer year
    var gross = sp.amax * effectiveLeafArea(leafArea) * supply * fT * fW * seasonLen;
    return {
      gross: Math.max(0, gross),
      factors: { light: fL, co2: fC, temp: fT, water: fW },
      limiting: limitingFactor(
        { light: fL, co2: fC, temp: fT, water: fW },
        { aperture: aperture, co2AtFullAperture: co2Factor(env.co2ppm, 1) }
      )
    };
  }

  // Maintenance respiration. The point students consistently miss: a big tree does not
  // just gain more, it SPENDS more, every hour, forever, just to stay alive. Heartwood
  // is dead and costs nothing; sapwood, leaves and fine roots all cost.
  function maintenanceRespiration(sp, st) {
    var living = st.leafMass + st.rootMass + st.sapwoodMass;
    return sp.respRate * living;
  }

  // Convert a year's wood carbon into a ring width. Ring width falls as the tree
  // widens even when the tree is gaining MORE wood each year, because the same volume
  // is spread around a longer circumference. Students read narrow outer rings as
  // decline; often it is just geometry.
  function ringWidthMm(woodC, dbhCm, heightM, woodDensity) {
    if (woodC <= 0) return 0;
    var carbonPerM3 = woodDensity * 0.5;          // wood is roughly half carbon by mass
    var volume = woodC / carbonPerM3;             // m3 added this year
    var radiusM = Math.max(0.02, dbhCm / 200);
    var stemArea = 2 * Math.PI * radiusM * Math.max(1, heightM) * 0.55; // form factor
    return (volume / stemArea) * 1000;
  }

  // Coerce anything that came out of storage into a tree the renderer can survive.
  // Missing numbers fall back to a fresh seedling's, arrays are forced to arrays.
  function normaliseTree(raw, speciesId) {
    var base = newTree(speciesId);
    if (!raw || typeof raw !== 'object') return base;
    var out = Object.assign({}, base, raw);
    ['age', 'heightM', 'dbhCm', 'leafArea', 'leafMass', 'rootMass', 'sapwoodMass',
      'heartwoodMass', 'reserves', 'seedsBanked', 'deficitYears'].forEach(function (k) {
      var v = out[k];
      if (typeof v !== 'number' || !isFinite(v)) out[k] = base[k];
    });
    if (!Array.isArray(out.rings)) out.rings = [];
    if (!Array.isArray(out.history)) out.history = [];
    // A ring with a non-numeric width would reach the SVG as NaN and silently
    // collapse the chart, so drop anything malformed rather than draw it.
    out.rings = out.rings.filter(function (r) {
      return r && typeof r === 'object' && typeof r.widthMm === 'number' && isFinite(r.widthMm);
    });
    out.alive = out.alive !== false;
    if (typeof out.speciesId !== 'string') out.speciesId = base.speciesId;
    return out;
  }

  function newTree(speciesId) {
    var sp = speciesById(speciesId);
    return {
      speciesId: sp.id,
      age: 1,
      heightM: 0.4,
      dbhCm: 0.5,
      leafArea: 0.09,
      leafMass: 0.006,
      rootMass: 0.02,
      sapwoodMass: 0.02,
      heartwoodMass: 0,
      reserves: 0.12,
      rings: [],
      seedsBanked: 0,
      deficitYears: 0,
      alive: true,
      causeOfDeath: null,
      history: []
    };
  }

  // One simulated year. alloc is the student's allocation of surplus carbon and must
  // sum to 1; it is normalised here rather than trusted.
  function simulateYear(st, sp, env, alloc) {
    var next = Object.assign({}, st);
    next.rings = st.rings.slice();
    next.history = st.history.slice();
    if (!st.alive) return next;

    var aperture = stomatalAperture(env.soilWater, sp.droughtTol, env.forcedClose);
    var photo = grossPhotosynthesis(sp, env, st.leafArea, aperture);
    var resp = maintenanceRespiration(sp, st);
    var net = photo.gross - resp;

    // Transpiration: the cost side of the same open stoma that let the carbon in.
    var vpd = clamp((env.tempC - 5) / 30, 0.05, 1);
    var transpiration = st.leafArea * aperture * vpd * 210; // litres over the season

    // A negative year is survivable out of reserves; a long run of them is not.
    var reserves = st.reserves + (net < 0 ? net : 0);
    var surplus = Math.max(0, net);

    var a = normaliseAlloc(alloc);
    var toLeaf = surplus * a.leaf;
    var toRoot = surplus * a.root;
    var toWood = surplus * a.wood;
    var toRepro = surplus * a.repro;

    // Reserves refill from whatever the student did not spend, capped by tree size.
    reserves = clamp(reserves + surplus * a.store, -3 - st.sapwoodMass * 0.4, 0.6 + st.sapwoodMass * 0.4);

    // Wood first, because the canopy the tree can support depends on the plumbing it
    // has built. Wood splits between height and girth; height growth slows sharply as
    // the tree gets taller, because lifting water higher costs more and every species
    // runs into a hydraulic ceiling.
    // Allometry as a self-correcting controller rather than a fixed schedule. A tree
    // has to hold itself up, so height and diameter stay coupled: a stem already
    // fatter than its species-typical slenderness puts the next year's wood into
    // height, and an over-slender one puts it into girth. Open-loop shares produced
    // 5 m aspens carrying 25 cm trunks, which is a fence post, not a tree.
    // A missing or bad trait must not silently poison the whole run: NaN propagates
    // straight through clamp() (Math.min/max return NaN), so one undefined field
    // turned every height and ring in the record into NaN while the carbon numbers
    // still looked healthy. Default rather than trust.
    var slenderness = (typeof sp.slenderness === 'number' && sp.slenderness > 0) ? sp.slenderness : 40;
    var targetDbh = (st.heightM * 100) / slenderness;
    var slendernessErr = clamp((st.dbhCm - targetDbh) / Math.max(0.5, targetDbh), -1, 1);
    var heightShare = clamp(0.42 + slendernessErr * 0.42 - st.heightM / (sp.maxHeight * 3), 0.05, 0.92);
    var heightGain = (toWood * heightShare) * (0.3 / Math.pow(Math.max(1, st.heightM), 0.42)) / (1 + st.heightM / 22);
    next.heightM = clamp(st.heightM + heightGain, 0.3, sp.maxHeight);

    var girthC = toWood * (1 - heightShare);
    var ring = ringWidthMm(girthC, st.dbhCm, st.heightM, sp.woodDensity);
    next.dbhCm = st.dbhCm + (ring / 10) * 2;      // ring is a radius, dbh is a diameter
    next.rings = next.rings.concat([{ year: st.age, widthMm: round(ring, 3), stress: net < 0 }]);

    // Sapwood converts to heartwood as the tree ages. That is why an old tree's
    // respiration bill does not rise forever: the dead core is free to carry.
    var converted = st.sapwoodMass * 0.022;
    next.sapwoodMass = clamp(st.sapwoodMass + toWood * 0.74 - converted, 0.05, 90000);
    next.heartwoodMass = st.heartwoodMass + converted;

    next.rootMass = clamp(st.rootMass + toRoot * 0.7 - st.rootMass * 0.06, 0.05, 4000);

    // Leaf area is capped by sapwood cross-section — the pipe model. A canopy cannot
    // outrun the plumbing that feeds it, which is why leaf area tracks tree size
    // rather than the size of one year's leaf investment. Without this the canopy
    // equilibrates at a few times the annual flux and the tree can never accumulate:
    // a 60-year oak came out barely two metres tall.
    var leafCap = 0.52 * Math.pow(Math.max(0.02, next.sapwoodMass), 0.8);
    var leafGrown = st.leafMass * 0.62 + toLeaf * 3.4;
    next.leafMass = clamp(Math.min(leafGrown, leafCap), 0.01, 600);
    next.leafArea = clamp(next.leafMass * 14, 0.05, 900);

    next.reserves = reserves;
    next.seedsBanked = st.seedsBanked + toRepro;
    next.age = st.age + 1;

    // A tree that shrinks its canopy in the dark drops its respiration bill with it,
    // so a pure reserves test lets it idle at a twig forever. Real trees do not: a bad
    // year is survivable, a decade of them is not. Deficit YEARS is the honest test,
    // and drought tolerance buys a few extra.
    next.deficitYears = net < 0 ? (st.deficitYears || 0) + 1 : 0;
    var deficitTolerance = Math.round(6 + sp.droughtTol * 8);

    if (reserves <= -Math.max(0.15, st.sapwoodMass * 0.35)) { next.alive = false; next.causeOfDeath = 'carbon_starvation'; }
    if (next.deficitYears >= deficitTolerance) { next.alive = false; next.causeOfDeath = 'carbon_starvation'; }
    if (next.age > sp.maxAgeYears) { next.alive = false; next.causeOfDeath = 'senescence'; }

    next.history = next.history.concat([{
      year: st.age,
      gross: round(photo.gross, 3),
      resp: round(resp, 3),
      net: round(net, 3),
      ring: round(ring, 3),
      heightM: round(next.heightM, 2),
      dbhCm: round(next.dbhCm, 2),
      limiting: photo.limiting.id,
      aperture: round(aperture, 3),
      transpiration: Math.round(transpiration),
      reserves: round(reserves, 2)
    }]);
    if (next.history.length > 400) next.history = next.history.slice(-400);
    return next;
  }

  function normaliseAlloc(a) {
    var src = a || {};
    var out = {
      leaf: Math.max(0, src.leaf == null ? 0.3 : src.leaf),
      root: Math.max(0, src.root == null ? 0.25 : src.root),
      wood: Math.max(0, src.wood == null ? 0.3 : src.wood),
      repro: Math.max(0, src.repro == null ? 0.05 : src.repro),
      store: Math.max(0, src.store == null ? 0.1 : src.store)
    };
    var sum = out.leaf + out.root + out.wood + out.repro + out.store;
    if (sum <= 0) return { leaf: 0.3, root: 0.25, wood: 0.3, repro: 0.05, store: 0.1 };
    ['leaf', 'root', 'wood', 'repro', 'store'].forEach(function (k) { out[k] = out[k] / sum; });
    return out;
  }

  // Environment for a given year. Season is a phase 0-1 through the year; the yearly
  // step integrates it, so this returns the growing-season average the yearly step needs.
  function envForYear(cfg, yearIndex) {
    var drought = cfg.droughtYears && cfg.droughtYears.indexOf(yearIndex) >= 0;
    return {
      tempC: cfg.tempC,
      light: cfg.light,
      co2ppm: cfg.co2ppm,
      soilWater: drought ? clamp(cfg.soilWater * 0.35, 0.05, 1) : cfg.soilWater,
      forcedClose: false,
      drought: !!drought
    };
  }

  // ─────────────────────────────────────────────────────────
  // Investigation snapshots. Notebook entries must survive later slider and tree
  // changes, so every helper here returns plain JSON with no live array references.
  function finiteOr(v, fallback) {
    return typeof v === 'number' && isFinite(v) ? v : fallback;
  }

  function cloneTreeSnapshot(raw, speciesId) {
    var t = normaliseTree(raw, speciesId);
    var out = Object.assign({}, t);
    out.rings = t.rings.map(function (r) { return Object.assign({}, r); });
    out.history = t.history.map(function (r) { return Object.assign({}, r); });
    return out;
  }

  function normaliseExperimentEnv(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    return {
      tempC: clamp(finiteOr(r.tempC, 22), -5, 45),
      light: clamp(finiteOr(r.light, 0.8), 0, 1),
      co2ppm: clamp(finiteOr(r.co2ppm, 420), 180, 900),
      soilWater: clamp(finiteOr(r.soilWater, 0.7), 0, 1),
      droughtYears: Array.isArray(r.droughtYears)
        ? r.droughtYears.filter(function (n) { return typeof n === 'number' && isFinite(n); }).slice(0, 100)
        : []
    };
  }

  function dominantLimiter(counts) {
    var best = 'light', bestN = -1;
    ['light', 'water', 'temperature', 'co2'].forEach(function (id) {
      var n = finiteOr(counts && counts[id], 0);
      if (n > bestN) { best = id; bestN = n; }
    });
    return best;
  }

  function safeTrialSummary(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var counts = {};
    ['light', 'water', 'temperature', 'co2'].forEach(function (id) {
      counts[id] = Math.max(0, Math.round(finiteOr(r.limiterCounts && r.limiterCounts[id], 0)));
    });
    var observed = ['thrive', 'struggle', 'die'].indexOf(r.observedOutcome) >= 0
      ? r.observedOutcome : (r.alive === false ? 'die' : 'struggle');
    return {
      requestedYears: clamp(Math.round(finiteOr(r.requestedYears, 10)), 1, 100),
      yearsCompleted: Math.max(0, Math.round(finiteOr(r.yearsCompleted, 0))),
      startAge: Math.max(0, Math.round(finiteOr(r.startAge, 0))),
      endAge: Math.max(0, Math.round(finiteOr(r.endAge, 0))),
      alive: r.alive !== false,
      causeOfDeath: typeof r.causeOfDeath === 'string' ? r.causeOfDeath : null,
      dominantLimiter: ['light', 'water', 'temperature', 'co2'].indexOf(r.dominantLimiter) >= 0
        ? r.dominantLimiter : dominantLimiter(counts),
      limiterCounts: counts,
      observedOutcome: observed,
      meanNet: finiteOr(r.meanNet, 0),
      meanRingWidth: finiteOr(r.meanRingWidth, 0),
      heightDelta: finiteOr(r.heightDelta, 0),
      dbhDelta: finiteOr(r.dbhDelta, 0),
      reservesDelta: finiteOr(r.reservesDelta, 0),
      reproductionDelta: finiteOr(r.reproductionDelta, 0),
      endHeight: Math.max(0, finiteOr(r.endHeight, 0)),
      endDbh: Math.max(0, finiteOr(r.endDbh, 0)),
      endReserves: finiteOr(r.endReserves, 0)
    };
  }
  function runExperimentTrial(startTree, speciesId, envRaw, allocRaw, yearsRaw) {
    var sid = speciesById(speciesId).id;
    var sp = speciesById(sid);
    var start = cloneTreeSnapshot(startTree, sid);
    var st = cloneTreeSnapshot(start, sid);
    var envCfg = normaliseExperimentEnv(envRaw);
    var alloc = normaliseAlloc(allocRaw);
    var requested = clamp(Math.round(finiteOr(yearsRaw, 10)), 1, 100);
    var counts = { light: 0, water: 0, temperature: 0, co2: 0 };
    var netTotal = 0, ringTotal = 0, completed = 0;

    for (var i = 0; i < requested && st.alive; i++) {
      var env = envForYear(envCfg, st.age);
      var aperture = stomatalAperture(env.soilWater, sp.droughtTol, false);
      var probe = grossPhotosynthesis(sp, env, st.leafArea, aperture);
      counts[probe.limiting.id] = (counts[probe.limiting.id] || 0) + 1;
      var historyBefore = st.history.length;
      var ringsBefore = st.rings.length;
      st = simulateYear(st, sp, env, alloc);
      completed++;
      var rec = st.history.length > historyBefore ? st.history[st.history.length - 1] : null;
      var ring = st.rings.length > ringsBefore ? st.rings[st.rings.length - 1] : null;
      netTotal += finiteOr(rec && rec.net, 0);
      ringTotal += finiteOr(ring && ring.widthMm, 0);
    }

    var meanNet = completed ? netTotal / completed : 0;
    var reservesDelta = st.reserves - start.reserves;
    var observed = !st.alive ? 'die' : ((meanNet < 0 || reservesDelta < 0) ? 'struggle' : 'thrive');
    return {
      tree: cloneTreeSnapshot(st, sid),
      summary: safeTrialSummary({
        requestedYears: requested, yearsCompleted: completed,
        startAge: start.age, endAge: st.age, alive: st.alive,
        causeOfDeath: st.causeOfDeath, dominantLimiter: dominantLimiter(counts),
        limiterCounts: counts, observedOutcome: observed,
        meanNet: meanNet, meanRingWidth: completed ? ringTotal / completed : 0,
        heightDelta: st.heightM - start.heightM,
        dbhDelta: st.dbhCm - start.dbhCm,
        reservesDelta: reservesDelta,
        reproductionDelta: st.seedsBanked - start.seedsBanked,
        endHeight: st.heightM, endDbh: st.dbhCm, endReserves: st.reserves
      })
    };
  }
  function normalisePrediction(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    return {
      limiter: ['light', 'water', 'temperature', 'co2'].indexOf(r.limiter) >= 0 ? r.limiter : null,
      outcome: ['thrive', 'struggle', 'die'].indexOf(r.outcome) >= 0 ? r.outcome : null,
      reason: typeof r.reason === 'string' ? r.reason.slice(0, 1200) : ''
    };
  }

  function normaliseTrialResult(raw, speciesId) {
    if (!raw || typeof raw !== 'object' || !raw.tree || !raw.summary) return null;
    return { tree: cloneTreeSnapshot(raw.tree, speciesId), summary: safeTrialSummary(raw.summary) };
  }

  function normaliseExperiment(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var phase = ['idle', 'predict', 'ready', 'explain'].indexOf(r.phase) >= 0 ? r.phase : 'idle';
    var sid = speciesById(r.baseline && r.baseline.speciesId).id;
    var baseline = r.baseline && r.baseline.tree ? {
      speciesId: sid,
      tree: cloneTreeSnapshot(r.baseline.tree, sid),
      env: normaliseExperimentEnv(r.baseline.env),
      alloc: normaliseAlloc(r.baseline.alloc)
    } : null;
    var treatment = r.treatment && typeof r.treatment === 'object' ? {
      env: normaliseExperimentEnv(r.treatment.env),
      alloc: normaliseAlloc(r.treatment.alloc)
    } : null;
    var result = normaliseTrialResult(r.result, sid);
    if (phase !== 'idle' && !baseline) phase = 'idle';
    if ((phase === 'ready' || phase === 'explain') && !treatment) phase = 'predict';
    if (phase === 'explain' && !result) phase = 'ready';
    return {
      phase: phase,
      duration: clamp(Math.round(finiteOr(r.duration, 10)), 1, 100),
      prediction: normalisePrediction(r.prediction),
      baseline: baseline, treatment: treatment, result: result,
      explanation: typeof r.explanation === 'string' ? r.explanation.slice(0, 4000) : ''
    };
  }

  function normaliseTrialRecord(raw) {
    if (!raw || typeof raw !== 'object' || !raw.baseline || !raw.result) return null;
    var sid = speciesById(raw.speciesId || raw.baseline.speciesId).id;
    var result = normaliseTrialResult(raw.result, sid);
    if (!result || !raw.baseline.tree) return null;
    return {
      speciesId: sid,
      duration: clamp(Math.round(finiteOr(raw.duration, result.summary.requestedYears)), 1, 100),
      prediction: normalisePrediction(raw.prediction),
      baseline: {
        speciesId: sid,
        tree: cloneTreeSnapshot(raw.baseline.tree, sid),
        env: normaliseExperimentEnv(raw.baseline.env),
        alloc: normaliseAlloc(raw.baseline.alloc)
      },
      treatment: {
        env: normaliseExperimentEnv(raw.treatment && raw.treatment.env),
        alloc: normaliseAlloc(raw.treatment && raw.treatment.alloc)
      },
      result: result,
      explanation: typeof raw.explanation === 'string' ? raw.explanation.slice(0, 4000) : ''
    };
  }

  function normaliseExperimentTrials(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    return { A: normaliseTrialRecord(r.A), B: normaliseTrialRecord(r.B) };
  }
  // SECTION 4: REPRODUCTION STRATEGIES
  //
  // The honest tradeoff. Clonal routes are cheap and nearly always take, but they
  // produce a genetic copy attached to the parent's root system, so distance is short
  // and a pathogen that beats the parent beats every copy. Seed is expensive with
  // dreadful survival, but it travels and it recombines.
  //
  // cost      — kg C per attempt
  // establish — probability one attempt becomes an established individual
  // distance  — 0-1, how far from the parent it lands
  // diversity — 0 for a clone, 1 for an outcrossed seedling
  // ─────────────────────────────────────────────────────────
  var STRATEGIES = [
    {
      id: 'seed_wind', name: 'Wind-carried seed', icon: '🍃',
      cost: 0.6, establish: 0.05, distance: 0.9, diversity: 1,
      blurb: 'Cheap per seed and travels far, but almost every seed lands somewhere it cannot grow.',
      strongAgainst: ['pathogen'], weakAgainst: []
    },
    {
      id: 'seed_animal', name: 'Animal-planted seed', icon: '🐿️',
      cost: 1.4, establish: 0.13, distance: 0.75, diversity: 1,
      blurb: 'Expensive to build, but a jay buries it at the right depth in the open. An eaten acorn is gone; the ones that grow are the ones cached and never dug up again.',
      strongAgainst: ['pathogen'], weakAgainst: ['browsing']
    },
    {
      id: 'mast', name: 'Mast year', icon: '🌰',
      cost: 3.2, establish: 0.2, distance: 0.75, diversity: 1,
      blurb: 'Save for years, then flood the forest in one autumn. Predators cannot eat them all, so some get through.',
      strongAgainst: ['browsing', 'pathogen'], weakAgainst: [], episodic: true
    },
    {
      id: 'root_sucker', name: 'Root sucker', icon: '🌱',
      cost: 0.45, establish: 0.72, distance: 0.18, diversity: 0,
      blurb: 'A new stem pushed up from the parent root system. It arrives with a root network already feeding it.',
      strongAgainst: ['fire', 'browsing'], weakAgainst: ['pathogen']
    },
    {
      id: 'layering', name: 'Layering', icon: '🪵',
      cost: 0.35, establish: 0.6, distance: 0.1, diversity: 0,
      blurb: 'A low branch touches damp ground and roots where it touches. Almost free, and it goes almost nowhere.',
      strongAgainst: ['browsing'], weakAgainst: ['pathogen', 'fire']
    },
    {
      id: 'basal_resprout', name: 'Basal resprout', icon: '♻️',
      cost: 0.3, establish: 0.85, distance: 0.05, diversity: 0,
      blurb: 'Not really a new tree: the same root system rebuilding a top after losing one. The fastest recovery there is.',
      strongAgainst: ['fire', 'browsing'], weakAgainst: ['pathogen']
    },
    {
      id: 'fragment', name: 'Broken fragment', icon: '🌊',
      cost: 0.5, establish: 0.4, distance: 0.85, diversity: 0,
      blurb: 'A snapped branch washes downstream and roots in wet gravel. The flood that breaks the tree also plants it.',
      strongAgainst: ['flood'], weakAgainst: ['drought', 'pathogen']
    }
  ];
  function strategyById(id) {
    for (var i = 0; i < STRATEGIES.length; i++) if (STRATEGIES[i].id === id) return STRATEGIES[i];
    return null;
  }

  var EVENTS = [
    { id: 'fire',     name: 'Ground fire',      icon: '🔥', blurb: 'A low fire runs through the understory.' },
    { id: 'drought',  name: 'Drought',          icon: '☀️', blurb: 'Two dry summers in a row. Stomata stay shut.' },
    { id: 'pathogen', name: 'Root pathogen',    icon: '🦠', blurb: 'A fungus moves through connected root systems.' },
    { id: 'browsing', name: 'Deer browsing',    icon: '🦌', blurb: 'A heavy deer year. Anything short gets eaten.' },
    { id: 'flood',    name: 'Spring flood',     icon: '🌊', blurb: 'The river tops its banks and scours the gravel bars.' },
    { id: 'calm',     name: 'A quiet decade',   icon: '☀️', blurb: 'Nothing much happens. Everything grows.' }
  ];
  function eventById(id) {
    for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i];
    return EVENTS[EVENTS.length - 1];
  }

  // Deterministic PRNG. A seeded LCG keeps a round reproducible so a class can compare
  // two strategies against the SAME weather, which is the only way the comparison means
  // anything. Math.random() here would make every run incomparable.
  function lcg(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (1103515245 * s + 12345) >>> 0; return s / 4294967296; };
  }

  // Resolve one round of the Spread game.
  function resolveSpread(spend, event, rng) {
    var results = [];
    var established = 0;
    var diverseCount = 0;
    var clonalCount = 0;

    Object.keys(spend).forEach(function (sid) {
      var carbon = spend[sid];
      if (!carbon || carbon <= 0) return;
      var strat = strategyById(sid);
      if (!strat) return;

      var attempts = Math.floor(carbon / strat.cost);
      if (attempts <= 0) { results.push({ id: sid, attempts: 0, took: 0, note: 'Not enough carbon for even one attempt.' }); return; }

      var p = strat.establish;
      var note = '';
      var noteKind = null;
      if (strat.strongAgainst.indexOf(event.id) >= 0) { p = clamp(p * 2.1, 0, 0.95); noteKind = 'favoured'; note = 'Comes through this one better than the alternatives.'; }
      else if (strat.weakAgainst.indexOf(event.id) >= 0) { p = p * 0.25; noteKind = 'hurt'; note = 'Badly hurt by what happened this decade.'; }

      // The clonal penalty that makes the game a real decision: a pathogen travelling
      // through a shared root system does not roll per offspring, it takes the lot.
      var wiped = false;
      if (event.id === 'pathogen' && strat.diversity === 0 && rng() < 0.55) {
        wiped = true;
        noteKind = 'wiped';
        note = 'The shared root system carried the fungus to every copy at once.';
      }

      var took = 0;
      if (!wiped) for (var i = 0; i < attempts; i++) if (rng() < p) took++;

      results.push({ id: sid, name: strat.name, icon: strat.icon, attempts: attempts, took: took, note: note, noteKind: noteKind, wiped: wiped, diversity: strat.diversity });
      established += took;
      if (strat.diversity === 1) diverseCount += took; else clonalCount += took;
    });

    return {
      results: results,
      established: established,
      diverseCount: diverseCount,
      clonalCount: clonalCount,
      // Simpson-style: the chance two random descendants are NOT genetically identical.
      diversityIndex: established > 0 ? round(diverseCount / established, 2) : 0
    };
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 5: KNOWLEDGE CHECK
  //
  // Correct answers are rotated at MODULE scope, once, by a per-question offset. The
  // banks are re-read by index on every render, so a render-time shuffle would move
  // the answer under the student mid-question; and an unrotated bank lets a student
  // score by position instead of by biology.
  // ─────────────────────────────────────────────────────────
  var QUIZ_RAW = [
    { q: 'A seedling on the forest floor grows faster when a gap opens in the canopy above it. What was limiting it before?', a: ['Light', 'Carbon dioxide', 'Soil nitrogen', 'Temperature'], correct: 0, band: 'k2',
      why: 'Under a closed canopy almost no light reaches the floor, so the light term is the smallest one. Open a gap and the same seedling is suddenly limited by something else instead.' },
    { q: 'On a hot, dry afternoon a tree closes its stomata. What does it lose by doing that?', a: ['Nothing, it is purely protective', 'It stops taking in ' + CO2 + ', so photosynthesis nearly stops', 'It stops respiring', 'It loses its leaves'], correct: 1, band: 'g35',
      why: 'The same pore that lets water out is the one that lets ' + CO2 + ' in. Closing it saves water and costs carbon. There is no setting that does only the good half.' },
    { q: 'Which tissue carries sugar DOWN from the leaves to the roots?', a: ['Xylem', 'Phloem', 'Cambium', 'Heartwood'], correct: 1, band: 'g68',
      why: 'Xylem carries water up under tension. Phloem carries sugar from wherever it is made to wherever it is spent, which is usually downward but reverses in spring.' },
    { q: 'An old tree lays down narrower rings than it did at fifty. Does that always mean it is growing less wood?', a: ['Yes, narrow rings always mean decline', 'No, the same volume spread around a bigger trunk makes a thinner ring', 'Yes, old trees always shrink', 'No, rings have nothing to do with wood'], correct: 1, band: 'g68',
      why: 'Circumference grows with diameter, so an identical volume of new wood spreads thinner every year. Many old trees add MORE wood per year while their rings get narrower.' },
    { q: 'Why does a very large tree need so much more photosynthesis than a sapling just to break even?', a: ['Its leaves are less efficient', 'Maintenance respiration scales with the living tissue it must keep alive', 'It has more competitors', 'Large trees photosynthesise at night'], correct: 1, band: 'g912',
      why: 'Every kilogram of living sapwood, fine root and leaf costs energy every hour. The tree pays that bill before a single gram goes into a ring.' },
    { q: 'An aspen stand spreading by root suckers is hit by a root pathogen. Why is the whole stand at risk at once?', a: ['Suckers are weaker than seedlings', 'The stems are genetically identical and share a root system', 'Suckers cannot photosynthesise', 'Pathogens only attack aspen'], correct: 1, band: 'g68',
      why: 'Clonal spread trades genetic diversity for reliability. Every stem has the same susceptibility and a physical root connection to carry the infection.' },
    { q: 'Heartwood is dead tissue. What follows from that?', a: ['The tree is dying', 'It costs nothing to maintain, so it is cheap structural support', 'It cannot hold weight', 'It must be shed each year'], correct: 1, band: 'g912',
      why: 'Converting sapwood to heartwood is how a tree gets bigger without its respiration bill rising forever. Dead wood is free to carry.' },
    { q: 'Which of these is NOT a way a tree makes more of itself without seeds?', a: ['Root suckers', 'Layering', 'Basal resprouting', 'Pollination'], correct: 3, band: 'k2',
      why: 'Pollination is part of making seeds. The other three make a new stem from the parent tree itself, with no seed involved.' },
    { q: 'A pine keeps its needles through winter. What advantage does that give over a bare oak in February?', a: ['It can fix carbon on a mild winter day', 'It needs no water', 'It cannot freeze', 'It grows only in winter'], correct: 0, band: 'g35',
      why: 'Leaves already built and in place mean the pine can work whenever conditions allow, instead of spending the first weeks of spring rebuilding a canopy.' },
    { q: 'Raising ' + CO2 + ' boosts a tree that is CO2-limited but does little for one that is water-limited. Why?', a: ['CO2 damages dry trees', 'A stoma that is mostly shut admits very little CO2, so the extra buys almost nothing', 'Water-limited trees do not photosynthesise', 'CO2 only helps needles'], correct: 1, band: 'g912',
      why: 'The PERCENTAGE gain from extra CO2 is about the same at any water status. What drought changes is the rate that percentage applies to: a tree with its stomata mostly shut gains a large share of almost nothing. Absolute gain, not percentage, is the honest measure.' }
  ];
  // Rotate once, at module scope, deterministically.
  var QUIZ = QUIZ_RAW.map(function (item, i) {
    var shift = (i * 3 + 1) % item.a.length;
    var opts = item.a.slice(shift).concat(item.a.slice(0, shift));
    var newCorrect = (item.correct - shift + item.a.length * 2) % item.a.length;
    return Object.assign({}, item, { a: opts, correct: newCorrect });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 6: 3D SCENE
  //
  // The viewer shell lives on the host (window.StemLab.makeBayViewer) beside
  // ensureThree, so this tool gets attach/teardown, pause-when-unseen, WebGL
  // context-loss recovery, theme rebuild, picking, keyboard camera and label chips
  // without copying that lifecycle. Scene CONTENT is all that lives here.
  //
  // The viewer is a module-scope singleton mounted through a STABLE ref callback.
  // It cannot be a hook: every view below lives inside a switch, so a hook here
  // would be conditionally called and would blow up on navigation.
  // ─────────────────────────────────────────────────────────
  var TREE_PARTS = [
    { id: 'crown',  label: 'Crown (leaves)',  color: '#4ade80' },
    { id: 'trunk',  label: 'Trunk (wood)',    color: '#a16207' },
    { id: 'roots',  label: 'Root system',     color: '#78350f' },
    { id: 'clones', label: 'Clonal offspring', color: '#86efac' }
  ];

  // Resolved LAZILY, on first use, rather than captured at module load.
  //
  // The rest of the makeBayViewer family calls mk(cfg) at module scope, which is only
  // safe because the host happens to load at boot while plugins load on first hub-open.
  // If that ordering ever slips — a slow CDN response for stem_lab_module.js, a user
  // who opens the hub the instant the app boots — the tool captures a null viewer ONCE
  // and 3D is silently dead for the whole session with no error anywhere.
  //
  // Resolving on demand costs nothing and cannot get stuck: whichever render first
  // finds the host wins, and every call before that degrades to the 2D profile.
  var TREE3D = (function () {
    var real = null;
    var lastProps = null;
    var warned = false;
    var CFG = {
      parts: TREE_PARTS,
      buildScene: buildTreeScene,
      // The shell takes `home` once, which is why buildTreeScene normalises every tree
      // into VIS_H and centres it on the shell's fixed lookAt target. dist follows from
      // that budget: the camera is 42 degrees VERTICAL, so fitting 2.6 units needs
      // 1.3/tan(21 deg) = 3.39, and the rest is margin for sway and a wide crown.
      //
      // Pitch was 0.42 (24 degrees above horizontal), which is a specimen-on-a-bench
      // angle: it puts the horizon near the top of the frame, fills three quarters of
      // the picture with grass and looks DOWN at the tree. Nearer eye level the sky
      // does most of the work and the tree reads as tall, which is the whole point of
      // the subject. Tilt-down is still one keypress away for the root cutaway.
      home: { yaw: 0.62, pitch: 0.20, dist: 4.3 }
    };
    function resolve() {
      if (real) return real;
      var mk = window.StemLab && window.StemLab.makeBayViewer;
      if (!mk) {
        if (!warned) {
          warned = true;
          console.warn('[TreeLab] host viewer shell not present yet - 3D deferred, 2D profile intact');
        }
        return null;
      }
      real = mk(CFG);
      // React calls sync() during render and attach() during commit, so props can
      // arrive before the viewer exists. Replay the last ones into it.
      if (lastProps) { try { real.sync(lastProps); } catch (e) {} }
      return real;
    }
    // attach MUST keep a stable identity: an inline ref gets a new one every render,
    // which makes React call ref(null)+ref(node) each pass and re-initialise the
    // canvas endlessly. These wrappers are created once, here.
    var lastNode = null;
    // Re-point the home distance at whatever the scene last built, for the box it is
    // actually being drawn into. `apply` snaps the live camera as well; without it the
    // new framing only takes effect the next time the student presses Reset view.
    //
    // Deliberately NOT applied on every scene rebuild: the clock rebuilds the scene as
    // the tree grows, and snapping the camera back would throw away an orbit the
    // student had just set up. Home is always current, so Reset view always frames.
    function frame(apply) {
      var v = resolve();
      if (!v) return CFG.home.dist;
      // Measure the CANVAS, not the div we were handed. The shell builds its camera
      // aspect from the renderer's own size, and in full screen the container is a
      // flex child whose measured box is not what ends up being drawn into: reading
      // the div gave 0.69 for a stage that was actually rendering at 1.88, so every
      // tree was framed for a portrait phone and the crown still ran off the top.
      var aspect = 1.6;
      var cv = lastNode && lastNode.querySelector ? lastNode.querySelector('canvas') : null;
      var mw = cv ? cv.clientWidth : (lastNode ? lastNode.clientWidth : 0);
      var mh = cv ? cv.clientHeight : (lastNode ? lastNode.clientHeight : 0);
      if (mw > 0 && mh > 0) aspect = mw / mh;
      // A tall narrow box has no room to spare; a wide full-screen stage does.
      var fill = aspect >= 1.9 ? 0.66 : (aspect >= 1.5 ? 0.72 : 0.78);
      CFG.home.dist = fitDistance(LAST_EXTENT, aspect, fill);
      // Pitch is the difference between a portrait of a tree and a photograph of a
      // lawn. The camera tilts DOWN toward its target, so the higher the pitch the
      // more ground fills the frame: at 0.20 on a wide stage the bottom third was
      // featureless grass. A wide stage has room to sit nearer eye level, which drops
      // the horizon, gives the sky something to do and lets the tree read as tall.
      CFG.home.pitch = aspect >= 1.7 ? 0.13 : 0.20;
      // Framing is judged by eye and tuned by number; this is what the eye is looking
      // at. Also what the framing test reads, so it never has to scrape pixels.
      try {
        window.__alloTreeLabCam = {
          extent: LAST_EXTENT, aspect: aspect, fill: fill, dist: CFG.home.dist,
          applied: !!apply
        };
      } catch (e) {}
      if (apply) { try { v.reset(); } catch (e) {} }
      return CFG.home.dist;
    }
    // ── Re-frame when the BOX changes, not only when the tree does. ──
    //
    // The shell resizes off `window.resize` and has no ResizeObserver of its own, and
    // framing depends on the canvas aspect, so a CSS-only size change left the camera
    // framed for the box it used to be in. That is not hypothetical: mounting straight
    // into full screen (which is what a student who left in full screen gets back)
    // framed a 1400x733 stage using the 520px column's aspect of 0.61.
    //
    // Only a MATERIAL change re-frames. Entering or leaving full screen and rotating a
    // tablet clear that bar; nudging a window edge does not, so an orbit the student
    // set up is not thrown away by a few stray pixels.
    var lastAspect = 0;
    var ro = null;
    function watchBox(node) {
      if (!node || typeof ResizeObserver === 'undefined') return;
      if (ro) { try { ro.disconnect(); } catch (e) {} }
      try {
        ro = new ResizeObserver(function () {
          var cv = node.querySelector ? node.querySelector('canvas') : null;
          var w = cv ? cv.clientWidth : node.clientWidth;
          var hgt = cv ? cv.clientHeight : node.clientHeight;
          if (!(w > 0 && hgt > 0)) return;
          var a = w / hgt;
          if (lastAspect && Math.abs(a - lastAspect) / lastAspect < 0.1) return;
          lastAspect = a;
          frame(true);
        });
        ro.observe(node);
      } catch (e) { ro = null; }
    }
    return {
      attach: function (node) {
        if (node) { lastNode = node; watchBox(node); }
        else {
          if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
          // The tool is going away. Full screen hides the hub's toolbar via a body
          // class, and leaving that behind would strand the student in a STEAM Lab
          // with no way back to the tool list, in every tool they opened next.
          setImmersiveBodyClass(false);
        }
        var v = resolve(); if (v) v.attach(node);
      },
      sync: function (p) { lastProps = p; var v = resolve(); if (v) v.sync(p); },
      nudge: function (a, b) { var v = resolve(); if (v) v.nudge(a, b); },
      zoom: function (delta) { var v = resolve(); if (v) v.zoom(delta); },
      // Reset re-frames first, so "Reset view" is always a good view of THIS tree
      // rather than a good view of whatever tree was on screen when the tool loaded.
      reset: function () { frame(true); },
      frame: frame,
      node: function () { return lastNode; },
      status: function () { var v = resolve(); return v ? v.status() : 'idle'; }
    };
  })();

  // ── Palettes ──────────────────────────────────────────────────────────────
  // Hex only, everywhere in this section: a THREE material cannot resolve
  // var(--token), and a canvas fillStyle silently IGNORES one, leaving the previous
  // fill in place rather than erroring.
  var AUTUMN  = ['#d8930f', '#c26a05', '#a8380e', '#9c4707', '#d9a406', '#8f4715', '#e0a41c'];
  var SPRING  = ['#79c47f', '#8ecb88', '#63b672', '#84c98c', '#9ed494'];
  var SUMMER  = ['#227a3a', '#1c6b33', '#2a8b45', '#175f2e', '#31954d'];
  var NEEDLES = ['#1a5c33', '#20693b', '#154e2c', '#257642'];
  function clusterHex(season, leafType, stressed, i) {
    if (leafType === 'needle') return stressed ? ['#6b7c2a', '#4d7c0f'][i % 2] : NEEDLES[i % NEEDLES.length];
    if (season === 'winter') return '#7c6244';
    if (stressed) return ['#a3541a', '#8a7a30', '#94722a'][i % 3];
    var pal = season === 'autumn' ? AUTUMN : (season === 'spring' ? SPRING : SUMMER);
    return pal[i % pal.length];
  }
  var BARK = { oak: '#6b4f2a', aspen: '#c9c6b4', willow: '#5b4636', pine: '#7a4b2a', redwood: '#8a4a2f' };
  var TREE_FORM = {
    oak:     { branchSpread: 0.88, branchLift: 0.42, asymmetry: 0.10, wind: 0.72 },
    aspen:   { branchSpread: 0.56, branchLift: 0.78, asymmetry: 0.04, wind: 1.28 },
    willow:  { branchSpread: 0.92, branchLift: 0.34, asymmetry: 0.12, wind: 1.18 },
    pine:    { branchSpread: 0.68, branchLift: 0.54, asymmetry: 0.03, wind: 0.62 },
    redwood: { branchSpread: 0.54, branchLift: 0.64, asymmetry: 0.02, wind: 0.48 }
  };
  var BARK_CANVAS_CACHE = {};

  // One source of truth for visual state. Water stress changes turgor and soil;
  // carbon stress thins and dulls the crown. Keeping those channels separate avoids
  // drawing a shaded tree as though it were dehydrated.
  function deriveTreeVisualState(treeRaw, speciesRaw, envRaw, seasonRaw) {
    var st = treeRaw && typeof treeRaw === 'object' ? treeRaw : {};
    var sp = speciesRaw && typeof speciesRaw === 'object' ? speciesRaw : speciesById('oak');
    var env = envRaw && typeof envRaw === 'object' ? envRaw : {};
    var season = ['spring', 'summer', 'autumn', 'winter'].indexOf(seasonRaw) >= 0 ? seasonRaw : 'summer';
    var water = clamp(typeof env.soilWater === 'number' && isFinite(env.soilWater) ? env.soilWater : 0.7, 0, 1);
    var aperture = stomatalAperture(water, typeof sp.droughtTol === 'number' ? sp.droughtTol : 0.5, false);
    var waterStress = clamp(1 - aperture, 0, 1);
    var deficitTolerance = Math.max(1, Math.round(6 + (sp.droughtTol || 0) * 8));
    var carbonStress = clamp((typeof st.deficitYears === 'number' ? st.deficitYears : 0) / deficitTolerance, 0, 1);
    var broad = sp.leafType !== 'needle';
    var leafDensity = broad
      ? (season === 'spring' ? 0.64 : (season === 'autumn' ? 0.90 : (season === 'winter' ? 0 : 1)))
      : 1;
    var leafScale = broad ? (season === 'spring' ? 0.66 : (season === 'autumn' ? 0.92 : 1)) : 1;
    var rootMass = Math.max(0, typeof st.rootMass === 'number' ? st.rootMass : 0);
    var leafMass = Math.max(0, typeof st.leafMass === 'number' ? st.leafMass : 0);
    var rootShare = rootMass / Math.max(0.01, rootMass + leafMass);
    return {
      waterStress: waterStress,
      carbonStress: carbonStress,
      severeWaterStress: waterStress > 0.62,
      chronicDeficit: carbonStress > 0.45,
      leafDensity: leafDensity * (1 - carbonStress * 0.28),
      leafScale: leafScale * (1 - carbonStress * 0.16),
      rootVigor: clamp(0.30 + rootShare * 0.76, 0.30, 1),
      springGrowth: season === 'spring' ? 1 : 0
    };
  }

  function visualLeafHex(season, leafType, visual, i) {
    var h = clusterHex(season, leafType, visual.carbonStress > 0.72, i);
    if (leafType === 'needle' && visual.springGrowth && i % 7 < 2) {
      h = mixHex(h, '#91d36a', 0.46);
    }
    if (visual.waterStress > 0.18) {
      h = mixHex(h, leafType === 'needle' ? '#77722a' : '#a98735', visual.waterStress * 0.24);
    }
    if (visual.carbonStress > 0.08) {
      h = mixHex(h, '#76502a', visual.carbonStress * 0.38);
    }
    return h;
  }

  // The four limiting factors, as a categorical palette. Assigned in a fixed order and
  // never cycled: a factor keeps its hue whatever else is on screen.
  //
  // Validated, not eyeballed. The previous set put CO2 on #60a5fa and water on
  // #38bdf8 — 6.7 ΔE apart for normal vision (floor 15) and 5.0 under deuteranopia —
  // which are precisely the two the tool teaches students to distinguish.
  function FACTOR_HUES(dark) {
    return {
      light: dark ? '#bf8700' : '#ca8a04',
      co2: '#7c3aed',
      water: '#0284c7',
      temperature: '#dc2626'
    };
  }

  function mixHex(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function rgba(hex, a) {
    var p = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')';
  }

  // Deterministic PRNG. Every procedural detail below — bark relief, cloud placement,
  // the scatter of the distant wood — is seeded from a constant, so the same tree
  // looks the SAME on every rebuild. A scene that reshuffles itself each time the
  // season ticks is more distracting than a plain one.
  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function seeded(s) {
    var a = (s >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Displacement hash keyed on POSITION rather than vertex index. three's
  // IcosahedronGeometry is NON-indexed, so one corner of the solid appears as several
  // separate vertices; keying on the index moves them apart and the surface tears
  // into loose flakes instead of deforming.
  function hash3(x, y, z, seed) {
    var h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 0.137) * 43758.5453;
    return h - Math.floor(h);
  }

  // A 2D context, or null. Canvas is unavailable in the SSR render-robustness
  // harness and can be blocked by hardened browser profiles; every texture below is
  // optional and the scene falls back to flat colour without it.
  function canvas2d(w, hh) {
    try {
      var cv = document.createElement('canvas');
      if (!cv || typeof cv.getContext !== 'function') return null;
      cv.width = w; cv.height = hh;
      var ctx = cv.getContext('2d');
      return ctx ? { cv: cv, ctx: ctx } : null;
    } catch (e) { return null; }
  }

  // Species-specific bark without another draw call. The cached object is only the
  // source canvas; each scene gets its own disposable CanvasTexture.
  function barkTexture(THREE, speciesId, baseHex) {
    var cv = BARK_CANVAS_CACHE[speciesId];
    if (!cv) {
      var c = canvas2d(256, 512);
      if (!c) return null;
      var ctx = c.ctx;
      var rnd = seeded(hashStr('bark:' + speciesId));
      // Detail-only neutral texture: the material supplies species colour exactly
      // once. Painting colour into both texture and material makes bark nearly black.
      var bg = ctx.createLinearGradient(0, 0, 256, 0);
      var barkLight = speciesId === 'aspen' ? '#f1f1f1' : '#d2d2d2';
      var barkDark = speciesId === 'aspen' ? '#a8a8a8' : '#747474';
      bg.addColorStop(0, barkDark);
      bg.addColorStop(0.45, barkLight);
      bg.addColorStop(1, mixHex(barkDark, '#000000', 0.12));
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 512);
      if (speciesId === 'aspen') {
        ctx.strokeStyle = rgba('#303030', 0.72);
        ctx.lineCap = 'round';
        for (var a = 0; a < 74; a++) {
          var ay = rnd() * 512, ax = rnd() * 256, aw = 5 + rnd() * 22;
          ctx.lineWidth = 1 + rnd() * 2.2;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + aw, ay + (rnd() - 0.5) * 2); ctx.stroke();
        }
      } else if (speciesId === 'pine') {
        ctx.strokeStyle = rgba('#303030', 0.58); ctx.lineWidth = 3;
        for (var py = -20; py < 540; py += 34) {
          for (var px = -24; px < 280; px += 32) {
            var jx = px + (rnd() - 0.5) * 13, jy = py + (rnd() - 0.5) * 12;
            ctx.strokeRect(jx, jy, 22 + rnd() * 17, 20 + rnd() * 24);
          }
        }
      } else {
        var groove = speciesId === 'redwood' ? '#2b2b2b' : (speciesId === 'willow' ? '#343434' : '#292929');
        var lines = speciesId === 'redwood' ? 54 : 38;
        ctx.strokeStyle = rgba(groove, speciesId === 'redwood' ? 0.64 : 0.56);
        ctx.lineCap = 'round';
        for (var g2 = 0; g2 < lines; g2++) {
          var gx = rnd() * 256;
          ctx.lineWidth = 1.5 + rnd() * (speciesId === 'oak' ? 5 : 3.5);
          ctx.beginPath(); ctx.moveTo(gx, -10);
          for (var gy = 0; gy <= 540; gy += 36) ctx.lineTo(gx + Math.sin(gy * 0.025 + g2) * (3 + rnd() * 4), gy);
          ctx.stroke();
        }
      }
      // Fine mottle keeps the pattern from reading like wallpaper in close-up.
      for (var m = 0; m < 1200; m++) {
        ctx.fillStyle = rgba(rnd() < 0.58 ? '#000000' : '#ffffff', 0.025 + rnd() * 0.07);
        ctx.fillRect(rnd() * 256, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 5);
      }
      cv = c.cv;
      BARK_CANVAS_CACHE[speciesId] = cv;
    }
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 5);
    return tex;
  }

  // ── Sky ───────────────────────────────────────────────────────────────────
  // A flat background colour is the single strongest "this is a 3D demo" cue there
  // is. A real subject stands under a sky that is pale at the horizon and deep
  // overhead, and it takes its fill light from that whole dome. This paints one,
  // with clouds, onto a BackSide sphere. A sphere rather than scene.background
  // because a background texture is screen-space: it would slide with the camera
  // instead of staying put when the student orbits.
  var SKY_DAY = {
    spring: { hi: '#2d6fcc', mid: '#7fbdee', lo: '#e4f2e6', sun: '#fff3d0' },
    summer: { hi: '#1a63c8', mid: '#6fb4ef', lo: '#e9f3e0', sun: '#fff6d8' },
    autumn: { hi: '#2b62a6', mid: '#87aed4', lo: '#f7e3ba', sun: '#ffe2a8' },
    winter: { hi: '#42699c', mid: '#9db6d2', lo: '#eef4fa', sun: '#fdf3e2' }
  };
  var SKY_DUSK = {
    spring: { hi: '#101f3d', mid: '#2c4d7a', lo: '#8e6a55', sun: '#ffc46b' },
    summer: { hi: '#0d1b36', mid: '#284873', lo: '#9c6f4e', sun: '#ffb95a' },
    autumn: { hi: '#111a33', mid: '#33456e', lo: '#a76c3c', sun: '#ff9f45' },
    winter: { hi: '#0e1a30', mid: '#2b3f63', lo: '#6d7d94', sun: '#ffd9a8' }
  };
  function skyPalette(season, dark, dry) {
    var set = dark ? SKY_DUSK : SKY_DAY;
    var base = set[season] || set.summer;
    if (!dry) return base;
    // Drought is DRAWN, not only tabulated. The limiting-factor card, the ring scars
    // and the sky now tell one story instead of three.
    return {
      hi: mixHex(base.hi, '#8a6a3a', 0.30),
      mid: mixHex(base.mid, '#c9a15a', 0.42),
      lo: mixHex(base.lo, '#e0c187', 0.52),
      sun: mixHex(base.sun, '#ff9d3d', 0.45)
    };
  }
  function skyTexture(THREE, pal, cloudHex, cloudy) {
    // `cloudy` is a PUFF count, not a cloud count: three or four overlapping puffs
    // make one cloud, which is why the number is in the dozens.
    var c = canvas2d(512, 256);
    if (!c) return null;
    var ctx = c.ctx;
    // A CanvasTexture is flipY by default, so canvas ROW 0 lands at v = 1, which on a
    // sphere is the top pole. Paint zenith first.
    var g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.00, pal.hi);
    g.addColorStop(0.44, pal.mid);
    g.addColorStop(0.82, pal.lo);
    g.addColorStop(1.00, pal.lo);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    var rnd = seeded(4211);
    for (var i = 0; i < cloudy; i++) {
      var cx = rnd() * 512, cy = 76 + rnd() * 54, rr = 5 + rnd() * 15;
      var al = 0.30 + rnd() * 0.48;
      // Drawn three times, at x-512 / x / x+512, so a puff that straddles the wrap
      // seam continues round the dome instead of being sliced off where u returns to 0.
      for (var w = -1; w <= 1; w++) {
        var ox = cx + w * 512;
        var rg = ctx.createRadialGradient(ox, cy, 0, ox, cy, rr);
        rg.addColorStop(0.00, rgba(cloudHex, al));
        rg.addColorStop(0.50, rgba(cloudHex, al * 0.42));
        rg.addColorStop(1.00, rgba(cloudHex, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(ox - rr, cy - rr, rr * 2, rr * 2);
      }
    }
    return new THREE.CanvasTexture(c.cv);
  }
  // The sun. There is no post-processing on this shell, so the glow is PAINTED: a
  // white core inside two falloffs, blended additively over the sky.
  function sunTexture(THREE, hex) {
    var c = canvas2d(128, 128);
    if (!c) return null;
    var ctx = c.ctx;
    var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0.00, rgba('#ffffff', 1));
    g.addColorStop(0.09, rgba(hex, 0.95));
    g.addColorStop(0.22, rgba(hex, 0.36));
    g.addColorStop(0.52, rgba(hex, 0.10));
    g.addColorStop(1.00, rgba(hex, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c.cv);
  }
  // A leaf-cluster card, drawn in WHITE on transparent so a per-instance colour can
  // tint it. Alpha-TESTED rather than blended: the cards then need no depth sorting,
  // the whole canopy costs one draw call, and they still cast real shadows, because
  // three copies map + alphaTest onto the depth material.
  function leafTexture(THREE, needleType) {
    var c = canvas2d(128, 128);
    if (!c) return null;
    var ctx = c.ctx;
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    var rnd = seeded(1801);
    if (needleType) {
      // A fan of needles off one shoot.
      ctx.lineCap = 'round';
      ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(5, 64); ctx.lineTo(122, 64); ctx.stroke();
      for (var n = 0; n < 40; n++) {
        var xx = 7 + (n / 39) * 112;
        var side = (n % 2) ? 1 : -1;
        var ln = 24 + rnd() * 26;
        ctx.lineWidth = 3.8 + rnd() * 1.8;
        ctx.beginPath();
        ctx.moveTo(xx, 64);
        // Swept back toward the shoot's base, which is what gives a conifer spray its
        // direction rather than looking like a bottle brush.
        ctx.lineTo(xx + ln * (0.45 + rnd() * 0.4), 64 + side * ln);
        ctx.stroke();
      }
    } else {
      for (var i = 0; i < 8; i++) {
        var cx = 26 + rnd() * 76, cy = 24 + rnd() * 80;
        var len = 34 + rnd() * 30, wid = 10 + rnd() * 9, ang = rnd() * 6.2832;
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, -len / 2);
        ctx.quadraticCurveTo(wid, 0, 0, len / 2);
        ctx.quadraticCurveTo(-wid, 0, 0, -len / 2);
        ctx.fill();
        ctx.restore();
      }
    }
    return new THREE.CanvasTexture(c.cv);
  }
  // A clump of grass blades rising from the bottom edge of the card, so an upright
  // quad reads as a tuft. Built the same alpha-tested way as the leaves.
  function grassTexture(THREE) {
    var c = canvas2d(64, 64);
    if (!c) return null;
    var ctx = c.ctx;
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    var rnd = seeded(5507);
    for (var i = 0; i < 11; i++) {
      var x0 = 8 + rnd() * 48;
      var lean = (rnd() - 0.5) * 30;
      var top = 6 + rnd() * 26;
      ctx.lineWidth = 2.2 + rnd() * 1.8;
      ctx.beginPath();
      ctx.moveTo(x0, 64);
      ctx.quadraticCurveTo(x0 + lean * 0.4, (64 + top) / 2, x0 + lean, top);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(c.cv);
  }
  // Ground. Mottled, with a contact pool at the centre and a rim that dissolves into
  // the far ground colour so the lawn disc has no visible edge. The speckles are kept
  // FINE and low-contrast: a first pass used 8px blobs at 0.55 alpha and, stretched
  // over a two-metre disc, they read as litter strewn across the lawn.
  // ONE disc, not a detailed lawn sitting on a plain plate. That earlier arrangement
  // left a visible ring in the grass wherever the textured disc ended, because a lit
  // TEXTURED surface and a lit FLAT one of the nominally same colour do not resolve to
  // the same brightness. `poolFrac` is the contact shadow's radius as a fraction of
  // the disc, so the pool stays sized to the tree while the ground stays huge.
  function groundTexture(THREE, near, far, poolFrac) {
    var c = canvas2d(1024, 1024);
    if (!c) return null;
    var ctx = c.ctx;
    ctx.fillStyle = near;
    ctx.fillRect(0, 0, 1024, 1024);
    var rnd = seeded(7717);
    // Broad patches first, then fine mottle over them: one scale of noise alone reads
    // as film grain rather than as ground.
    ctx.globalAlpha = 0.5;
    for (var j = 0; j < 90; j++) {
      var px = rnd() * 1024, py = rnd() * 1024, pr = 30 + rnd() * 120;
      var pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      var ph = mixHex(near, rnd() < 0.55 ? '#000000' : far, 0.06 + rnd() * 0.14);
      pg.addColorStop(0, rgba(ph, 0.75));
      pg.addColorStop(1, rgba(ph, 0));
      ctx.fillStyle = pg; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    ctx.globalAlpha = 0.30;
    for (var i = 0; i < 9000; i++) {
      var x = rnd() * 1024, y = rnd() * 1024, r = 1 + rnd() * 4.5;
      ctx.fillStyle = mixHex(near, rnd() < 0.62 ? '#000000' : '#ffffff', 0.03 + rnd() * 0.13);
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // CircleGeometry puts its centre at uv 0.5,0.5 — exactly where the trunk stands —
    // so a soft dark pool here grounds the tree on the frames where the shadow map is
    // too coarse to.
    var pr2 = Math.max(10, 512 * poolFrac);
    var sg = ctx.createRadialGradient(512, 512, pr2 * 0.06, 512, 512, pr2);
    sg.addColorStop(0, 'rgba(0,0,0,0.30)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, 1024, 1024);
    // The rim dissolves into the horizon so the world has no visible edge.
    var eg = ctx.createRadialGradient(512, 512, 360, 512, 512, 512);
    eg.addColorStop(0, rgba(far, 0));
    eg.addColorStop(1, rgba(far, 1));
    ctx.fillStyle = eg; ctx.fillRect(0, 0, 1024, 1024);
    return new THREE.CanvasTexture(c.cv);
  }

  // ── Procedural geometry ───────────────────────────────────────────────────
  // A straight cylinder is the single strongest "computer drawing" cue on a tree.
  // This builds a limb as ONE cylinder whose vertices are then pushed onto a gentle
  // curve and given a shallow bark relief: organic shape for the price of one
  // geometry and no extra draw call.
  function limbGeom(THREE, len, rBase, rTop, bendX, bendZ, rough, seed, radial) {
    var seg = rough > 0 ? 7 : 4;
    var geo = new THREE.CylinderGeometry(rTop, rBase, len, radial || 8, seg, false);
    var pos = geo.attributes.position;
    for (var v = 0; v < pos.count; v++) {
      var x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      var t = clamp((y + len / 2) / len, 0, 1);
      if (rough > 0) {
        var r = Math.sqrt(x * x + z * z);
        if (r > 1e-6) {
          var a = Math.atan2(z, x);
          // Two ripple frequencies fading upward: fluted low down where real bark is
          // deepest, smooth out toward the twigs.
          var f = 1 + rough * (0.60 * Math.sin(a * 7 + t * 8.5 + seed)
                             + 0.40 * Math.sin(a * 3 - t * 4.2 + seed)) * (1 - t * 0.55);
          x *= f; z *= f;
        }
      }
      // t^1.7 keeps the foot planted and lets the top wander, which is how a stem that
      // has leaned toward the light for a century actually sits.
      var k = Math.pow(t, 1.7);
      pos.setXYZ(v, x + bendX * k, y, z + bendZ * k);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }
  // Merge static limb geometry for bare winter crowns. Keeping the curved geometry
  // while collapsing hundreds of twigs into one mesh removes the winter draw-call
  // and raycast spike without changing the silhouette.
  function mergeStaticGeometries(THREE, sources) {
    if (!sources || !sources.length) return null;
    var geos = [];
    for (var gi = 0; gi < sources.length; gi++) {
      var source = sources[gi];
      var ready = source.index ? source.toNonIndexed() : source;
      if (ready !== source && source.dispose) source.dispose();
      geos.push(ready);
    }
    var merged = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(function (name) {
      var itemSize = 0, total = 0, ArrayType = null;
      for (var ai = 0; ai < geos.length; ai++) {
        var attr = geos[ai].getAttribute(name);
        if (!attr) return;
        if (!itemSize) { itemSize = attr.itemSize; ArrayType = attr.array.constructor; }
        if (attr.itemSize !== itemSize) return;
        total += attr.array.length;
      }
      var joined = new ArrayType(total);
      var offset = 0;
      for (var aj = 0; aj < geos.length; aj++) {
        var array = geos[aj].getAttribute(name).array;
        joined.set(array, offset);
        offset += array.length;
      }
      merged.setAttribute(name, new THREE.BufferAttribute(joined, itemSize));
    });
    for (var di = 0; di < geos.length; di++) if (geos[di].dispose) geos[di].dispose();
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }
  // A foliage mass. Lumpy, flat-shaded, and never a sphere: a smooth sphere is
  // exactly what makes a procedural canopy read as a bunch of balloons.
  function blobGeom(THREE, r, seed) {
    var geo = new THREE.IcosahedronGeometry(r, 1);
    var pos = geo.attributes.position;
    for (var v = 0; v < pos.count; v++) {
      var x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      var f = 0.72 + hash3(x / r, y / r, z / r, seed) * 0.50;
      pos.setXYZ(v, x * f, y * f * 0.88, z * f);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }
  // A conifer tier: a cone with a ragged skirt, so the silhouette breaks up the way a
  // whorl of branches does instead of reading as a traffic cone.
  function tierGeom(THREE, r, hgt, seed) {
    var geo = new THREE.ConeGeometry(r, hgt, 16, 3);
    var pos = geo.attributes.position;
    for (var v = 0; v < pos.count; v++) {
      var x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      var rr = Math.sqrt(x * x + z * z);
      if (rr > 1e-6) {
        var f = 0.80 + hash3(x / r, y / hgt, z / r, seed) * 0.42;
        x *= f; z *= f;
      }
      pos.setXYZ(v, x, y, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  // ── Scene geometry constants ──────────────────────────────────────────────
  //
  // The shell hard-codes `camera.lookAt(0, 0.30, 0)` and takes a FIXED home distance
  // at module load, so it cannot re-frame per tree. It was built for compact objects
  // sitting near the origin (an engine bay, a wheel corner). A tree is the opposite:
  // tall, growing upward from y=0, and spanning four orders of magnitude in size
  // between a seedling and a redwood.
  //
  // So the tree is normalised into a FIXED visual budget and then CENTRED on the
  // point the camera actually looks at. The first version did neither: it scaled
  // height to 3.6 units, let crown radius reach 3.5, and left the whole thing sitting
  // on y=0 — the camera stared at its ankles and the crown grew straight out of frame.
  // True metres are reported in the HUD; this is presentation only.
  var VIS_H = 2.6;              // roots-to-crown-top budget, world units
  var VIS_CENTER_Y = 0.30;      // must match the shell's lookAt target
  var ROOT_FRAC = 0.16;         // share of the budget spent below ground

  // ── Camera framing ────────────────────────────────────────────────────────
  //
  // The shell's camera is a 42-degree VERTICAL perspective looking at a fixed point,
  // with one home distance for the whole life of the tool. That is fine for an engine
  // bay. It is wrong for a subject that spans a 0.4 m seedling to a 90 m redwood, and
  // it was wrong in BOTH directions: the seedling was a dot in an empty field and the
  // mature oak's crown was cropped off the top and both sides.
  //
  // buildTreeScene measures what it actually built into LAST_EXTENT; fitDistance turns
  // that into the distance which frames it. Kept as a pure function so the arithmetic
  // is testable without a GPU.
  var SHELL_FOV_DEG = 42;
  var LAST_EXTENT = null;
  // The very first scene deserves a snap to a good view. Every later rebuild only
  // updates where Reset view goes, so growing a tree never steals the camera.
  var FRAMED_ONCE = false;

  // ★ The camera may only ever back AWAY from this baseline, never come closer.
  //
  // This is the whole trick, and getting it wrong is instructive: a camera that simply
  // fits each tree makes every tree the same size on screen, so a 0.4 m seedling and a
  // 20 m oak are indistinguishable and the tool's entire subject — growth — disappears.
  // That is the same defect the log compression in visH was written to avoid, arriving
  // from the opposite direction.
  //
  // Allowing only outward movement gives both properties at once: nothing is ever
  // cropped, because a big tree pushes the camera back, and small trees stay small,
  // because a seedling cannot pull it in.
  var BASE_DIST = 4.0;

  // halfV / radius are world units; aspect is width/height of the canvas.
  // `fill` is how much of the frame the subject should occupy (0-1), which is the one
  // knob worth tuning by eye: full screen can afford a tighter crop than a 420px box
  // because there is simply more room for the tree to breathe into.
  function fitDistance(extent, aspect, fill) {
    var e = extent && isFinite(extent.halfV) ? extent : { halfV: 1.3, radius: 0.8 };
    var a = isFinite(aspect) && aspect > 0.2 ? aspect : 1.6;
    var f = clamp(isFinite(fill) ? fill : 0.78, 0.35, 0.98);
    var tanHalf = Math.tan(SHELL_FOV_DEG * Math.PI / 360);
    // Vertical is the honest constraint; horizontal only bites on a wide crown in a
    // narrow box, which is exactly the portrait-phone case.
    var dv = (Math.max(0.08, e.halfV) / f) / tanHalf;
    var dh = (Math.max(0.02, e.radius || 0) / f) / (tanHalf * a);
    // The shell clamps its own zoom to 2.6-8.5 and reset() writes home straight in, so
    // staying inside that range keeps a student's first zoom from jumping.
    return clamp(Math.max(dv, dh, BASE_DIST), BASE_DIST, 8.5);
  }

  function buildTreeScene(THREE, api) {
    var props = api.sceneProps || {};
    var sp = props.species || {};
    var st = props.tree || {};
    var season = props.season || 'summer';
    var clones = props.clones || 0;
    var dry = !!props.dry;
    var cracked = !!props.cracked;
    var reduced = !!props.reduced || !!api.reduced;
    var lightLevel = typeof props.light === 'number' ? clamp(props.light, 0, 1) : 0.8;
    var needle = sp.leafType === 'needle';
    var alive = st.alive !== false;
    var visual = props.visual || deriveTreeVisualState(st, sp, { soilWater: props.soilWater }, season);
    var stressed = visual.chronicDeficit;
    var form = TREE_FORM[sp.id] || TREE_FORM.oak;
    // High contrast exists to make every edge legible. Weather, haze and mood light
    // all work against that, so the whole atmosphere layer is skipped there and the
    // scene falls back to the flat, maximally readable version.
    var flat = !!api.contrast;

    var meshes = {};
    var picks = [];
    var group = new THREE.Group();
    function registerPick(mesh, id) {
      mesh.userData.partId = id;
      picks.push(mesh);
      return mesh;
    }

    // Organic surfaces want a dark, weak specular. The shell's shared trim() uses a
    // pale blue-grey one (0x6b7688) tuned for painted metal, and on dark bark it
    // dominated the diffuse colour completely: the first render turned near-black
    // roots into pale pink sticks.
    function mat(hex, opts) {
      var o = opts || {};
      var m = new THREE.MeshPhongMaterial({
        color: flat ? 0xffffff : new THREE.Color(hex).getHex(),
        shininess: flat ? 0 : (o.shininess == null ? 4 : o.shininess),
        specular: flat ? 0x000000 : (o.specular == null ? 0x140f0a : o.specular),
        flatShading: !!o.flat,
        side: o.side || THREE.FrontSide,
        map: flat ? null : (o.map || null)
      });
      // A little self-colour so foliage does not go muddy in its own shade. Leaves
      // TRANSMIT light; a purely reflective material cannot, and that missing
      // translucency is most of why procedural canopies look like plastic.
      if (!flat && o.glow) {
        m.emissive = new THREE.Color(hex).multiplyScalar(o.glow);
        m.userData._preserveBaseEmissive = true;
      }
      return m;
    }

    var heightM = Math.max(0.3, st.heightM || 1);
    var dbhCm = Math.max(0.4, st.dbhCm || 1);
    var leafArea = Math.max(0.02, st.leafArea || 1);

    // Normalising EVERY tree to one visual height made a 0.4 m seedling exactly as
    // tall on screen as a 30 m oak — a bare pole with two tufts stuck to it, and no
    // sense of growth at all in a tool whose whole subject is growth. The camera
    // cannot re-frame (fixed lookAt and a fixed home distance taken at module load),
    // so compress the 0.4 m - 90 m range LOGARITHMICALLY instead: everything fits,
    // and a seedling still reads as roughly a quarter the height of a mature tree.
    // The floor was 0.45, which left a 0.4 m seedling a speck in an empty field once
    // the stage went full screen. 0.58 lifts it to something worth looking at while
    // keeping the growth cue intact: against the fixed baseline camera distance a
    // seedling still reads at roughly a third of a mature tree's on-screen height.
    // Raising it much past this makes a seedling look like a shrub-sized adult.
    var visH = 0.58 + (VIS_H - 0.58) * clamp(
      Math.log(1 + heightM / 0.5) / Math.log(1 + 180), 0, 1);
    var rootDepth = visH * ROOT_FRAC;
    var H = visH - rootDepth;             // above-ground height, world units
    // How far along its own species' life this tree is. A young tree is leafy nearly
    // to the ground; a mature one carries a clear bole under the crown.
    var maturity = clamp(heightM / Math.max(1, (sp.maxHeight || 30) * 0.6), 0, 1);

    // Trunk radius from the REAL slenderness the simulation produced, so a stout oak
    // and a pole-like aspen actually look different, then exaggerated slightly
    // because a true-to-scale trunk is nearly invisible at this size.
    var realRatio = dbhCm / (heightM * 100);
    var trunkR = clamp(H * realRatio * 1.9, H * 0.011, H * 0.075);

    // Canopy fullness against a species-typical mature canopy. A seedling gets a
    // tuft; a closed mature crown gets roughly a third of tree height in radius.
    var fullness = clamp(0.55 + 0.55 * Math.pow(leafArea / 400, 0.3), 0.55, 1.15);
    var crownR = H * (needle ? 0.26 : 0.32) * fullness * (sp.crownWidth || 1);
    // A mature broadleaf carries a clear BOLE: several metres of bare trunk before the
    // first limb. Starting the crown at 0.46H buried it, and the tree read as a shrub.
    var crownBaseY = H * (needle ? 0.16 : (0.20 + 0.36 * maturity));
    var barkHex = BARK[sp.id] || '#6b4f2a';
    var bare = (season === 'winter' && !needle);
    var weeping = sp.id === 'willow';
    // Only loss of water pressure changes leaf angle. Carbon shortage instead thins
    // and dulls the crown, so shade/cold no longer masquerade as dehydration.
    var wilt = clamp((visual.waterStress - 0.16) / 0.74, 0, 1);

    // ── Light direction. The sun's HEIGHT follows the light slider, so turning the
    //    light down no longer just changes a number: the sun sinks toward the
    //    horizon, the shadows stretch, and the whole scene goes long and orange. ──
    var sunEl = 0.20 + 0.62 * lightLevel;                  // ~11 deg to ~47 deg
    var sunAz = 0.85 + (season === 'winter' ? 0.45 : 0) - (season === 'summer' ? 0.18 : 0);
    var sunDir = new THREE.Vector3(
      Math.cos(sunEl) * Math.sin(sunAz), Math.sin(sunEl), Math.cos(sunEl) * Math.cos(sunAz)
    ).normalize();
    var pal = skyPalette(season, !!api.dark, dry);
    // A low sun reddens everything, which is most of what makes late light beautiful.
    var sunHex = mixHex(pal.sun, '#ff8a3c', clamp(1 - lightLevel, 0, 1) * 0.6);

    var groundNear, groundFar;
    if (season === 'winter') { groundNear = api.dark ? '#43463d' : '#918a78'; groundFar = api.dark ? '#353b38' : '#7b7a6b'; }
    else if (dry)            { groundNear = api.dark ? '#6b5c3e' : '#c3ab6c'; groundFar = api.dark ? '#4a3f2b' : '#a28d57'; }
    else if (season === 'autumn') { groundNear = api.dark ? '#55502c' : '#8a8b4c'; groundFar = api.dark ? '#464426' : '#7c7d44'; }
    else { groundNear = api.dark ? '#3d5230' : '#688f4d'; groundFar = api.dark ? '#33452a' : '#5c8144'; }

    // ── Sky dome, sun, fog ────────────────────────────────────────────────
    var sky = null;
    if (!flat) {
      var cloudHex = api.dark ? mixHex(pal.mid, '#ffd9a8', 0.35) : '#ffffff';
      var skyTex = skyTexture(THREE, pal, cloudHex, season === 'winter' ? 210 : 150);
      sky = new THREE.Mesh(
        new THREE.SphereGeometry(42, 24, 16),
        new THREE.MeshBasicMaterial({
          map: skyTex || null,
          color: skyTex ? 0xffffff : new THREE.Color(pal.mid).getHex(),
          side: THREE.BackSide, fog: false, depthTest: false, depthWrite: false
        })
      );
      // Drawn first with depth off and never written to: the classic skybox setup, so
      // every other object in the scene simply paints over it.
      sky.renderOrder = -1000;
      group.add(sky);

      api.scene.background = new THREE.Color(pal.lo);
      // The shell fogs 5.2 to 11.0, tuned for a compact object on a bench. Push it
      // out so the tree itself stays crisp and only the distant wood dissolves.
      api.scene.fog = new THREE.Fog(new THREE.Color(mixHex(pal.lo, pal.mid, 0.30)).getHex(), 14, 62);

      var sunTex = sunTexture(THREE, sunHex);
      if (sunTex) {
        var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: sunTex, transparent: true, depthTest: false, depthWrite: false,
          fog: false, blending: THREE.AdditiveBlending, opacity: api.dark ? 0.95 : 0.8
        }));
        sunSprite.scale.setScalar(10);
        sunSprite.position.copy(sunDir).multiplyScalar(26);
        sunSprite.renderOrder = -999;
        group.add(sunSprite);
      }

      // ── Lighting. The shell lights a workbench: ambient 0.44 under a 0.92 key,
      //    deliberately flat so no part of a diagram can hide in shadow. Outdoors
      //    that flatness is precisely what makes foliage read as plastic. Drop the
      //    ambient to almost nothing, aim the key at the sun we just drew, and let a
      //    hemisphere light do the filling — which is also what tints shaded leaves
      //    blue from the sky above and earth-brown from the ground below. ──
      //
      //    These four numbers have to be read TOGETHER, because MeshPhong sums them:
      //    the first attempt left the shell's ambient in place and added a 0.85
      //    hemisphere under a 1.5 key, which put lit surfaces past 2.5x their own
      //    colour and turned every green in the scene fluorescent.
      var keyLight = null;
      api.scene.traverse(function (o) {
        if (o.isAmbientLight) o.intensity = 0.13;
        else if (o.isDirectionalLight) {
          if (o.castShadow && !keyLight) keyLight = o;
          else o.intensity *= 0.34;
        }
      });
      if (keyLight) {
        keyLight.color.set(new THREE.Color(sunHex));
        keyLight.intensity = 0.78 + 0.40 * lightLevel;
        keyLight.position.copy(sunDir).multiplyScalar(7);
        // The shell sizes its shadow frustum +-3.2 to cover a whole engine bay. The
        // tree occupies barely a third of that, so two thirds of every texel was
        // being spent on empty grass and the leaf shadows came back as chunks.
        if (keyLight.shadow) {
          // Same texel budget as the shell, spent on a third of the area: 1024 over
          // +-2.1 is half again as sharp as 1024 over +-3.2, and a 2048 map costs four
          // times as much every frame for a shadow nobody could tell apart. The shadow
          // pass re-renders the whole scene, and this one has ~1000 alpha-tested cards
          // in it, so that multiplier is the single most expensive knob here.
          keyLight.shadow.mapSize.width = 1024;
          keyLight.shadow.mapSize.height = 1024;
          var scam = keyLight.shadow.camera;
          scam.left = -2.1; scam.right = 2.1; scam.top = 2.1; scam.bottom = -2.1;
          scam.updateProjectionMatrix();
          if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; }
        }
      }
      group.add(new THREE.HemisphereLight(
        new THREE.Color(pal.mid).getHex(),
        new THREE.Color(mixHex(groundNear, '#4a3a24', 0.35)).getHex(),
        api.dark ? 0.26 : 0.40
      ));
    }

    // ── Trunk: curved, tapered, fluted, with a root flare. ──
    var barkTex = flat ? null : barkTexture(THREE, sp.id, barkHex);
    var barkMat = mat(barkHex, { shininess: 2, specular: 0x1a120a, map: barkTex });
    var trunkGroup = new THREE.Group();
    var trunkTopR = trunkR * (needle ? 0.13 : 0.42);
    var trunkH = needle ? H * 0.86 : Math.min(H, crownBaseY + crownR * 0.85);
    var leanAmt = trunkH * (weeping ? 0.055 : 0.030);
    var trunk = new THREE.Mesh(
      limbGeom(THREE, trunkH, trunkR, trunkTopR, leanAmt * 0.8, -leanAmt * 0.45, 0.11, 11, 16),
      barkMat);
    trunk.position.y = trunkH / 2;
    if (api.wantShadow) { trunk.castShadow = true; trunk.receiveShadow = true; }
    trunkGroup.add(trunk);
    registerPick(trunk, 'trunk');

    // Basal flare — a short, much wider cone buried at the foot of the trunk.
    var flare = new THREE.Mesh(tierGeom(THREE, trunkR * 1.55, H * 0.065, 5),
      mat(mixHex(barkHex, '#1d140c', 0.30), { shininess: 1, specular: 0x1a120a, map: barkTex }));
    flare.position.y = H * 0.031;
    if (api.wantShadow) flare.castShadow = true;
    trunkGroup.add(flare);
    registerPick(flare, 'trunk');

    // ── Branches. Drawn for every tree, but they only READ on a bare winter
    //    broadleaf; in leaf they are the armature the foliage hangs from. ──
    var branchTips = [];
    var bareBranchGeometries = [];
    var UP = new THREE.Vector3(0, 1, 0);
    var DOWN = new THREE.Vector3(0, -1, 0);
    function branch(depth, origin, dir, len, rad) {
      if (depth <= 0 || len < H * (bare ? 0.006 : 0.010)) return;
      var d = dir.clone().normalize();
      var q = new THREE.Quaternion().setFromUnitVectors(UP, d);
      // Every branch ARCS. It leaves the trunk steeply and levels off under its own
      // weight, which is the difference between a tree and a candelabra. The bend has
      // to be expressed in the limb's OWN frame, so world-down is projected
      // perpendicular to the branch axis and then rotated back.
      var wd = DOWN.clone().addScaledVector(d, -DOWN.dot(d));
      if (wd.lengthSq() > 1e-8) wd.normalize(); else wd.set(0, 0, 0);
      var lb = wd.clone().applyQuaternion(q.clone().conjugate());
      var droop = len * (weeping ? (0.34 + 0.20 * (3 - depth)) : (0.13 + 0.08 * (3 - depth)));
      var bx = lb.x * droop, bz = lb.z * droop;
      var branchGeo = limbGeom(THREE, len, rad, rad * 0.5, bx, bz, depth >= 2 ? 0.08 : 0,
        17 + depth * 7 + Math.round(len * 997), depth >= 2 ? 8 : 5);
      var branchPos = origin.clone().addScaledVector(d, len / 2);
      if (bare) {
        var branchMatrix = new THREE.Matrix4().compose(
          branchPos, q, new THREE.Vector3(1, 1, 1)
        );
        branchGeo.applyMatrix4(branchMatrix);
        bareBranchGeometries.push(branchGeo);
      } else {
        var m = new THREE.Mesh(branchGeo, barkMat);
        m.position.copy(branchPos);
        m.quaternion.copy(q);
        if (api.wantShadow) m.castShadow = true;
        trunkGroup.add(m);
        registerPick(m, 'trunk');
      }
      // The tip is the far END of the curve, not of the straight axis. Hanging
      // foliage off the axis end left every cluster floating clear of its branch.
      var end = origin.clone().addScaledVector(d, len)
        .add(new THREE.Vector3(bx, 0, bz).applyQuaternion(q));
      if (depth === 1) branchTips.push(end);
      var n = depth > 1 ? 3 : 0;
      for (var i = 0; i < n; i++) {
        // Golden-angle rotation between whorls, so successive levels do not stack
        // into the flat rosette a fixed step produces.
        var ang = i * 2.39996 + depth * 1.7;
        var spread = 0.58 + (i % 2) * 0.22;
        // Each order rises less steeply than its parent, so the outer twigs level off
        // instead of every branch pointing at the sky.
        var lift = Math.max(0.06, d.y * 0.62 - 0.1);
        var nd = new THREE.Vector3(
          d.x * 0.5 + Math.cos(ang) * spread, lift, d.z * 0.5 + Math.sin(ang) * spread
        ).normalize();
        branch(depth - 1, end, nd, len * (0.58 + (i % 3) * 0.07), rad * (bare ? 0.48 : 0.6));
      }
    }
    if (!needle) {
      // A bare tree IS its branch structure, so winter earns a third order of twigs.
      // In leaf that would be 45 hidden tips and 45 masses hung off them.
      var orders = bare ? 4 : 2;
      var nPrimary = 6;
      for (var b = 0; b < nPrimary; b++) {
        var a0 = b * 2.39996 + (b % 2 ? form.asymmetry : -form.asymmetry);
        // Spread the origins along the trunk rather than clustering them at one fork
        // height, and vary reach so no two primaries are the same length.
        var startY = crownBaseY - H * 0.05 + (b % 5) * H * 0.105;
        var lean = form.branchLift + (b % 4) * 0.10;
        var dir0 = new THREE.Vector3(
          Math.cos(a0) * form.branchSpread, lean, Math.sin(a0) * form.branchSpread
        ).normalize();
        branch(orders, new THREE.Vector3(0, startY, 0), dir0,
          crownR * (0.70 + form.branchSpread * 0.13 + (b % 3) * 0.11),
          trunkR * (bare ? 0.42 : 0.52));
      }
    }
    if (bareBranchGeometries.length) {
      var winterBranchGeo = mergeStaticGeometries(THREE, bareBranchGeometries);
      if (winterBranchGeo) {
        var winterBranches = new THREE.Mesh(winterBranchGeo, barkMat);
        if (api.wantShadow) winterBranches.castShadow = true;
        trunkGroup.add(winterBranches);
        registerPick(winterBranches, 'trunk');
      }
    }
    trunkGroup.userData.labelAnchor = new THREE.Vector3(0, trunkH * 0.46, 0);
    trunkGroup.userData.noSelectionScale = true;
    meshes.trunk = trunkGroup;
    group.add(trunkGroup);

    // ── Crown ─────────────────────────────────────────────────────────────
    // Two layers, which is how a canopy is built in any game engine and the reason
    // the first pass read as a bunch of balloons:
    //   1. dark inner MASSES, which give the crown its body, its shadow and something
    //      other than sky behind the gaps;
    //   2. an outer layer of alpha-tested LEAF CARDS, which is what actually breaks
    //      the silhouette into something the eye accepts as foliage.
    // The cards are one InstancedMesh, so a three-hundred-card canopy is one draw call.
    var crownGroup = new THREE.Group();
    var crownTopY = crownBaseY + crownR * (needle ? 0 : 1.5);
    // The crown's real HORIZONTAL reach, grown the same way crownTopY is. crownR is
    // only the nominal cluster radius: the branch system hangs masses well outside it,
    // so a mature oak's silhouette is several times crownR across and framing the
    // camera off crownR alone still cropped both sides of the canopy.
    var crownMaxR = crownR * 0.6;
    var foliage = [];          // inner masses, for per-mass wind
    var cardSpec = [];         // {p, sc, q, phase, hue}

    function addMass(p, r, i) {
      // Spring unfolding and carbon limitation open real gaps in the crown. The dark
      // inner mass shrinks with the leaf layer instead of remaining a solid green ball.
      var massR = r * (0.52 + visual.leafDensity * 0.48);
      var leafHex = visualLeafHex(season, sp.leafType, visual, i);
      var m = new THREE.Mesh(blobGeom(THREE, massR, i * 31 + 7),
        mat(mixHex(leafHex, '#0b2412', 0.56),
          { shininess: 3, specular: 0x0a1f10, flat: true, glow: 0.025 }));
      m.position.copy(p);
      if (api.wantShadow) m.castShadow = true;
      crownGroup.add(m);
      registerPick(m, 'crown');
      foliage.push({ m: m, base: p.clone(), phase: (i % 9) * 0.71, h: clamp(p.y / Math.max(0.001, H), 0, 1) });
      if (p.y + massR > crownTopY) crownTopY = p.y + massR;
      var massRad = Math.sqrt(p.x * p.x + p.z * p.z) + massR;
      if (massRad > crownMaxR) crownMaxR = massRad;
      return m;
    }
    // Scatter leaf cards over the shell of a mass. Facing OUTWARD from the cluster
    // centre with a random twist, so they catch the sun as a surface does rather than
    // as a cloud of randomly angled flakes.
    function scatterCards(centre, r, n, seed, hueBase) {
      n = Math.max(6, Math.round(n * visual.leafDensity));
      var rnd = seeded(seed);
      for (var i = 0; i < n; i++) {
        // Golden-angle spiral on the sphere: an even shell, where uniform random
        // leaves visible clumps and bald patches at these counts.
        var u = (i + 0.5) / n;
        var phi = Math.acos(1 - 2 * u);
        var th = i * 2.39996;
        var dir = new THREE.Vector3(
          Math.sin(phi) * Math.cos(th), Math.cos(phi) * 0.85, Math.sin(phi) * Math.sin(th));
        // Wilted foliage hangs closer to the twig as turgor goes.
        var p = centre.clone().addScaledVector(dir, r * (0.78 + rnd() * 0.42) * (1 - wilt * 0.16));
        var dummy = new THREE.Object3D();
        dummy.position.copy(p);
        dummy.lookAt(p.clone().addScaledVector(dir, 1));   // PlaneGeometry faces +Z
        dummy.rotateZ(rnd() * 6.2832);
        // A turgid leaf is held out to the light; a wilted one folds down. This is the
        // only instant, honest sign of water stress the tree itself can show.
        dummy.rotateX((rnd() - 0.5) * 1.1 + wilt * (0.55 + rnd() * 0.35));
        cardSpec.push({
          p: p, sc: r * (0.66 + rnd() * 0.40) * visual.leafScale, q: dummy.quaternion.clone(),
          phase: rnd() * 6.2832, hue: hueBase + i,
          // How much sky this card faces. Foliage is not one green: the top of a crown
          // is bleached by full sun and the underside sits in its own shade, and
          // carrying that gradient is most of what separates a canopy from a hedge.
          up: clamp(dir.y * 0.85 + 0.15, -1, 1)
        });
        if (p.y + r * 0.5 > crownTopY) crownTopY = p.y + r * 0.5;
        var cardRad = Math.sqrt(p.x * p.x + p.z * p.z) + r * 0.5;
        if (cardRad > crownMaxR) crownMaxR = cardRad;
      }
    }

    // A weeping willow's signature is not its branches, it is the long pendulous
    // SHOOT hanging off each one. Without these the species renders as an oak with a
    // slightly droopier limb, which is exactly what the first pass produced.
    function hangStrands(tip, r, k, hueBase) {
      var rnd = seeded(k * 613 + 41);
      var reach = Math.min(crownR * 1.7, Math.max(0, tip.y - H * 0.12));
      if (reach < r * 0.6) return;
      for (var w = 0; w < 3; w++) {
        var wa = (k * 2.1) + w * 2.39996;
        var out = new THREE.Vector3(Math.cos(wa), 0, Math.sin(wa)).multiplyScalar(r * (0.3 + rnd() * 0.5));
        var len = reach * (0.55 + rnd() * 0.45);
        var n = Math.max(3, Math.round(7 * visual.leafDensity));
        for (var q = 0; q < n; q++) {
          var f = (q + 0.6) / n;
          var p = new THREE.Vector3(
            tip.x + out.x * Math.pow(f, 0.5),
            tip.y - len * f,
            tip.z + out.z * Math.pow(f, 0.5));
          var dd = new THREE.Object3D();
          dd.position.copy(p);
          dd.lookAt(p.clone().add(new THREE.Vector3(Math.cos(wa), 0.15, Math.sin(wa))));
          dd.rotateZ((rnd() - 0.5) * 0.5);
          cardSpec.push({
            p: p, sc: r * (0.30 + rnd() * 0.16) * visual.leafScale, q: dd.quaternion.clone(),
            phase: rnd() * 6.2832, hue: hueBase + q + w,
            up: -0.25,
            // Whole strands swing, and they swing far more than a rigid twig does.
            swing: 1 + f * 2.2
          });
        }
      }
    }

    if (needle) {
      // Stacked ragged tiers, narrowing upward, with the leader poking out of the top.
      var tiers = Math.max(3, sp.tiers || 5);
      var coneBase = H * (0.13 + 0.16 * maturity);
      var coneTop = H * 1.02;   // the top tier must CLOTHE the leader, not sit under it
      for (var t2 = 0; t2 < tiers; t2++) {
        var f2 = t2 / tiers;
        var y0 = coneBase + (coneTop - coneBase) * f2 * 0.70;
        var ch = (coneTop - y0) * (t2 === tiers - 1 ? 1.0 : 0.66);
        var cr = crownR * (1 - f2 * 0.66);
        var coneR = cr * 0.84;   // the mass sits inside the spray shell
        var cone = new THREE.Mesh(tierGeom(THREE, coneR, ch, t2 * 13 + 3),
          mat(mixHex(visualLeafHex(season, 'needle', visual, t2), '#04180f', 0.62),
            { shininess: 2, specular: 0x0a1f10, flat: true, glow: 0.02 }));
        cone.position.y = y0 + ch * (t2 === tiers - 1 ? 0.5 : 0.42);
        if (api.wantShadow) cone.castShadow = true;
        crownGroup.add(cone);
        registerPick(cone, 'crown');
        foliage.push({ m: cone, base: cone.position.clone(), phase: t2 * 0.8, h: clamp(cone.position.y / Math.max(0.001, H), 0, 1) });
        // Needle sprays around the skirt of each tier, where a conifer's foliage
        // actually is. Scattering them through the cone body would hide them inside it.
        var rimN = Math.max(26, Math.round(96 * (cr / Math.max(0.001, crownR))));
        var rrnd = seeded(t2 * 71 + 5);
        for (var rc = 0; rc < rimN; rc++) {
          var ra2 = rc * 2.39996 + t2;
          // Anywhere on the cone's flank, not just its hem: v is the fraction of the
          // way up the tier, and the radius narrows with it exactly as the cone does.
          var vv = rrnd();
          var pr = cr * (1 - vv) * (0.92 + rrnd() * 0.30);
          var py = cone.position.y - ch * 0.46 + ch * vv * 0.98;
          var pp = new THREE.Vector3(Math.cos(ra2) * pr, py, Math.sin(ra2) * pr);
          var dd = new THREE.Object3D();
          dd.position.copy(pp);
          // Sprays hang OUT and DOWN off the branch they sit on.
          dd.lookAt(pp.clone().add(new THREE.Vector3(Math.cos(ra2), -0.55, Math.sin(ra2))));
          dd.rotateZ((rrnd() - 0.5) * 1.0);
          cardSpec.push({
            p: pp, sc: cr * (0.46 + rrnd() * 0.30), q: dd.quaternion.clone(),
            phase: rrnd() * 6.2832, hue: t2 * 3 + rc,
            // Sun-bleached on top, deep in shade beneath, same as a broadleaf.
            up: clamp(vv * 1.3 - 0.35, -1, 1)
          });
        }
      }
      crownTopY = coneTop;
      // A conifer's widest tier is the bottom one, at full crownR, and the needle
      // spray sits outside the cone mass it clothes.
      if (crownR * 1.1 > crownMaxR) crownMaxR = crownR * 1.1;
    } else if (!bare) {
      var ci = 0;
      for (var k = 0; k < branchTips.length; k++) {
        var tip = branchTips[k];
        var cr2 = crownR * (0.30 + ((k * 7) % 5) / 21);
        addMass(tip, cr2 * 0.60, ci);
        scatterCards(tip, cr2, weeping ? 26 : 40, k * 977 + 13, ci);
        if (weeping) hangStrands(tip, cr2, k, ci);
        ci += 4;
      }
      // Core mass, so the canopy is not a ring of separate clumps around a hole.
      var corePt = new THREE.Vector3(crownR * form.asymmetry, crownBaseY + crownR * 0.78, 0);
      addMass(corePt, crownR * 0.64, ci);
      scatterCards(corePt, crownR * 0.90, 96, 4441, ci);
    } else {
      crownTopY = H;   // bare winter: the branches ARE the silhouette
    }

    // ── The leaf layer itself. Alpha-TESTED, never blended: blended foliage needs a
    //    back-to-front sort that no instanced mesh can give you, and the usual symptom
    //    is leaves winking in and out as the camera turns. ──
    var cards = null, cardMat = null;
    var leafTex = cardSpec.length ? leafTexture(THREE, needle) : null;
    if (leafTex) {
      cardMat = new THREE.MeshPhongMaterial({
        map: leafTex, alphaTest: 0.42, transparent: false, side: THREE.DoubleSide,
        color: 0xffffff, shininess: flat ? 0 : 9,
        specular: flat ? 0x000000 : 0x16331d
      });
      if (!flat) {
        cardMat.emissive = new THREE.Color(0x0b1f10);
        cardMat.userData._preserveBaseEmissive = true;
      }
      cardMat.userData._keepOpaqueOnRecede = true;
      cards = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), cardMat, cardSpec.length);
      if (api.wantShadow) { cards.castShadow = true; cards.receiveShadow = true; }
      var cdummy = new THREE.Object3D();
      var ccol = new THREE.Color();
      for (var cs = 0; cs < cardSpec.length; cs++) {
        var spec = cardSpec[cs];
        cdummy.position.copy(spec.p);
        cdummy.quaternion.copy(spec.q);
        cdummy.scale.setScalar(spec.sc);
        cdummy.updateMatrix();
        cards.setMatrixAt(cs, cdummy.matrix);
        var chex = visualLeafHex(season, sp.leafType, visual, spec.hue);
        if (!flat) {
          var u2 = spec.up == null ? 0 : spec.up;
          chex = u2 >= 0 ? mixHex(chex, season === 'autumn' ? '#ffd25e' : '#cdec8e', u2 * 0.48)
                         : mixHex(chex, '#0a2413', -u2 * 0.26);
        }
        ccol.set(flat ? '#ffffff' : chex);
        cards.setColorAt(cs, ccol);
      }
      cards.instanceMatrix.needsUpdate = true;
      if (cards.instanceColor) cards.instanceColor.needsUpdate = true;
      crownGroup.add(cards);
      registerPick(cards, 'crown');
    }
    crownGroup.userData.labelAnchor = new THREE.Vector3(
      crownR * form.asymmetry, needle ? H * 0.74 : crownBaseY + crownR * 0.78, 0
    );
    crownGroup.userData.noSelectionScale = true;
    meshes.crown = crownGroup;
    group.add(crownGroup);

    // ── Roots. Kept visible on purpose: the shared root system is the mechanism
    //    behind the clonal-vs-seed tradeoff the Spread game is built on. They sit
    //    under a cutaway ground disc so they read as underground rather than as legs,
    //    which is exactly how the first version looked. ──
    var rootGroup = new THREE.Group();
    // The cutaway is schematic: most structural roots spread through shallow soil,
    // with two sinkers and a finer absorbing network. Root allocation changes the
    // spread and branch density, so the model's below-ground investment is visible.
    var rootMat = mat('#3f2d1e', { shininess: 0 });
    rootMat.depthTest = false;
    var rootSpread = (crownR * 0.85 + trunkR * 3) * (0.80 + visual.rootVigor * 0.25);
    // Furthest a clonal stem can land (the loop below uses 1.15 + (i % 3) * 0.3),
    // plus its own crown. Framing has to include the whole stand, not just the
    // parent, or an aspen's suckers sit outside the picture.
    var cloneReachR = clones > 0 ? rootSpread * 1.75 + crownR * 0.5 : 0;
    var structuralEnds = [];
    for (var ri = 0; ri < 5; ri++) {
      var ra = ri * 2.39996 + 0.18;
      var lateral = rootSpread * (0.65 + (ri % 3) * 0.13);
      var drop = rootDepth * (0.20 + (ri % 2) * 0.16);
      var rend = new THREE.Vector3(Math.cos(ra) * lateral, -drop, Math.sin(ra) * lateral);
      var rl = rend.length();
      var rdir = rend.clone().normalize();
      var rq = new THREE.Quaternion().setFromUnitVectors(UP, rdir);
      var rwd = new THREE.Vector3(Math.cos(ra), 0, Math.sin(ra));
      rwd.addScaledVector(rdir, -rwd.dot(rdir)).normalize();
      var rlb = rwd.applyQuaternion(rq.clone().conjugate()).multiplyScalar(rl * 0.12);
      var rm = new THREE.Mesh(
        limbGeom(THREE, rl, trunkR * (0.34 + visual.rootVigor * 0.10), trunkR * 0.075,
          rlb.x, rlb.z, 0.06, 23 + ri, 6), rootMat);
      rm.position.copy(rend).multiplyScalar(0.5);
      rm.quaternion.copy(rq);
      rm.renderOrder = 3;
      rootGroup.add(rm);
      registerPick(rm, 'roots');
      structuralEnds.push({ angle: ra, end: rend });
    }
    // A pair of deeper sinkers keeps the cutaway from implying that every tree root
    // occupies a single flat layer.
    for (var si = 0; si < 2; si++) {
      var sa = 0.85 + si * Math.PI;
      var send = new THREE.Vector3(
        Math.cos(sa) * rootSpread * 0.18, -rootDepth * (0.82 + si * 0.10),
        Math.sin(sa) * rootSpread * 0.18
      );
      var sl = send.length();
      var sd = send.clone().normalize();
      var sm = new THREE.Mesh(
        limbGeom(THREE, sl, trunkR * 0.25, trunkR * 0.055, 0, 0, 0.04, 81 + si, 6), rootMat);
      sm.position.copy(send).multiplyScalar(0.5);
      sm.quaternion.setFromUnitVectors(UP, sd);
      sm.renderOrder = 3;
      rootGroup.add(sm);
      registerPick(sm, 'roots');
    }
    // Fine absorbing roots are one non-shadow-casting instanced batch.
    var finePerRoot = Math.max(3, Math.round(3 + visual.rootVigor * 3));
    var fineCount = structuralEnds.length * finePerRoot;
    var fineRoots = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 5), rootMat, fineCount
    );
    var fineDummy = new THREE.Object3D();
    var fineIndex = 0;
    for (var fri = 0; fri < structuralEnds.length; fri++) {
      var fr = structuralEnds[fri];
      for (var fj = 0; fj < finePerRoot; fj++) {
        var along = 0.34 + (fj + 1) / (finePerRoot + 2) * 0.58;
        var side = (fj % 2 ? 1 : -1) * (0.58 + (fj % 3) * 0.15);
        var fl = rootSpread * (0.11 + (fj % 3) * 0.025) * (0.82 + visual.rootVigor * 0.18);
        var fa = fr.angle + side;
        var fp0 = fr.end.clone().multiplyScalar(along);
        var fd = new THREE.Vector3(Math.cos(fa), -0.20, Math.sin(fa)).normalize();
        fineDummy.position.copy(fp0).addScaledVector(fd, fl * 0.5);
        fineDummy.quaternion.setFromUnitVectors(UP, fd);
        var fineRadius = Math.max(trunkR * 0.09, H * 0.0014);
        fineDummy.scale.set(fineRadius, fl, fineRadius);
        fineDummy.updateMatrix();
        fineRoots.setMatrixAt(fineIndex++, fineDummy.matrix);
      }
    }
    fineRoots.instanceMatrix.needsUpdate = true;
    fineRoots.renderOrder = 3;
    rootGroup.add(fineRoots);
    registerPick(fineRoots, 'roots');
    rootGroup.userData.labelAnchor = new THREE.Vector3(0, -rootDepth * 0.38, 0);
    rootGroup.userData.noSelectionScale = true;
    meshes.roots = rootGroup;
    group.add(rootGroup);

    // ── Clonal offspring: separate stems joined underground. The join is drawn
    //    because it IS the lesson. ──
    var cloneGroup = new THREE.Group();
    var cloneCards = [];
    var nClones = clamp(clones, 0, 6);
    // Clone only when used; unreferenced Three materials are invisible to scene
    // traversal and would otherwise survive every no-clone scene rebuild.
    var cloneBarkMat = nClones ? barkMat.clone() : null;
    var cloneRootMat = nClones ? rootMat.clone() : null;
    for (var c2 = 0; c2 < nClones; c2++) {
      var cang = c2 * 2.39996 + 0.6;
      var cdist = rootSpread * (1.15 + (c2 % 3) * 0.3);
      var chh = H * (0.15 + ((c2 * 7) % 5) / 42);
      var cr3 = trunkR * 0.62;
      var cstem = new THREE.Mesh(
        limbGeom(THREE, chh, cr3, cr3 * 0.55, chh * 0.05, chh * 0.03, 0.07, 31 + c2, 8), cloneBarkMat);
      cstem.position.set(Math.cos(cang) * cdist, chh / 2, Math.sin(cang) * cdist);
      if (api.wantShadow) cstem.castShadow = true;
      cloneGroup.add(cstem);
      registerPick(cstem, 'clones');
      if (!cloneGroup.userData.labelAnchor) {
        cloneGroup.userData.labelAnchor = new THREE.Vector3(
          Math.cos(cang) * cdist, chh * 1.15, Math.sin(cang) * cdist
        );
      }
      if (!bare) {
        var ctop = new THREE.Mesh(
          needle ? tierGeom(THREE, chh * 0.44, chh * 1.15, c2 * 9 + 2)
                 : blobGeom(THREE, chh * 0.36, c2 * 17 + 5),
          // Same rule as the parent crown: the geometry is the dark mass BEHIND the
          // leaves, not the thing you look at. Left bright, it reads as a green crystal
          // with a few leaves stuck on.
          mat(mixHex(visualLeafHex(season, sp.leafType, visual, c2 + 3), '#0b2412', 0.56),
            { shininess: 3, specular: 0x0a1f10, flat: true, glow: 0.025 }));
        ctop.position.set(Math.cos(cang) * cdist, chh * (needle ? 1.15 : 1.12), Math.sin(cang) * cdist);
        if (api.wantShadow) ctop.castShadow = true;
        cloneGroup.add(ctop);
        registerPick(ctop, 'clones');
        foliage.push({ m: ctop, base: ctop.position.clone(), phase: c2 * 1.3 + 0.4, h: 0.5 });
        var crnd = seeded(c2 * 331 + 19);
        var ctopR = chh * 0.52;
        var cloneLeafCount = Math.max(8, Math.round(20 * visual.leafDensity));
        for (var cc = 0; cc < cloneLeafCount; cc++) {
          var cu = (cc + 0.5) / cloneLeafCount;
          var cphi = Math.acos(1 - 2 * cu);
          var cdir = new THREE.Vector3(
            Math.sin(cphi) * Math.cos(cc * 2.39996), Math.cos(cphi) * 0.85, Math.sin(cphi) * Math.sin(cc * 2.39996));
          var cp = ctop.position.clone().addScaledVector(cdir, ctopR * (0.72 + crnd() * 0.44));
          var cdd = new THREE.Object3D();
          cdd.position.copy(cp);
          cdd.lookAt(cp.clone().addScaledVector(cdir, 1));
          cdd.rotateZ(crnd() * 6.2832);
          cloneCards.push({
            p: cp, sc: ctopR * (0.55 + crnd() * 0.35) * visual.leafScale, q: cdd.quaternion.clone(),
            hue: c2 * 3 + cc, up: clamp(cdir.y * 0.85 + 0.15, -1, 1)
          });
        }
      }
      // The root connection that carries a pathogen to every copy at once.
      var link = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.13, trunkR * 0.13, cdist, 5), cloneRootMat);
      var ldir = new THREE.Vector3(Math.cos(cang), -0.1, Math.sin(cang)).normalize();
      link.position.set(Math.cos(cang) * cdist * 0.5, -rootDepth * 0.3, Math.sin(cang) * cdist * 0.5);
      link.quaternion.setFromUnitVectors(UP, ldir);
      link.renderOrder = 3;
      cloneGroup.add(link);
      registerPick(link, 'clones');
    }
    if (cloneCards.length && !flat) {
      var cloneTex = leafTexture(THREE, needle);
      if (cloneTex) {
        var cloneMat = new THREE.MeshPhongMaterial({
          map: cloneTex, alphaTest: 0.42, transparent: false, side: THREE.DoubleSide,
          color: 0xffffff, shininess: 9, specular: 0x16331d
        });
        cloneMat.emissive = new THREE.Color(0x0b1f10);
        cloneMat.userData._preserveBaseEmissive = true;
        cloneMat.userData._keepOpaqueOnRecede = true;
        var cMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), cloneMat, cloneCards.length);
        if (api.wantShadow) cMesh.castShadow = true;
        var cdum = new THREE.Object3D();
        var ccol2 = new THREE.Color();
        for (var ck = 0; ck < cloneCards.length; ck++) {
          var csp = cloneCards[ck];
          cdum.position.copy(csp.p);
          cdum.quaternion.copy(csp.q);
          cdum.scale.setScalar(csp.sc);
          cdum.updateMatrix();
          cMesh.setMatrixAt(ck, cdum.matrix);
          var chx = visualLeafHex(season, sp.leafType, visual, csp.hue);
          chx = csp.up >= 0 ? mixHex(chx, season === 'autumn' ? '#ffd25e' : '#cdec8e', csp.up * 0.48)
                            : mixHex(chx, '#0a2413', -csp.up * 0.26);
          ccol2.set(chx);
          cMesh.setColorAt(ck, ccol2);
        }
        cMesh.instanceMatrix.needsUpdate = true;
        if (cMesh.instanceColor) cMesh.instanceColor.needsUpdate = true;
        cloneGroup.add(cMesh);
        registerPick(cMesh, 'clones');
      }
    }
    cloneGroup.userData.noSelectionScale = true;
    meshes.clones = cloneGroup;
    group.add(cloneGroup);

    // ── Ground. A near lawn carrying the detail and the contact shading, sitting on a
    //    far plate that runs out into the fog, so there is no disc edge hanging in
    //    space where the world stops. ──
    var lawnR = Math.max(rootSpread * 2.2, crownR * 2.0, trunkR * 12, 2.2);
    var GROUND_R = 30;
    var groundMat = new THREE.MeshPhongMaterial({
      color: flat ? 0x333333 : 0xffffff,
      map: flat ? null : groundTexture(THREE, groundNear, groundFar, lawnR * 0.85 / GROUND_R),
      side: THREE.DoubleSide, shininess: 0
    });
    if (!groundMat.map && !flat) groundMat.color = new THREE.Color(groundNear);
    var ground = new THREE.Mesh(new THREE.CircleGeometry(flat ? lawnR : GROUND_R, 56), groundMat);
    ground.rotation.x = -Math.PI / 2;
    if (api.wantShadow) ground.receiveShadow = true;
    group.add(ground);

    // A dark soil window explains why the roots remain visible. It is deliberately
    // compact and slightly above the lawn to avoid a false full-depth excavation.
    var soilWindow = new THREE.Mesh(
      new THREE.CircleGeometry(Math.min(lawnR * 0.42, rootSpread * 1.28), 40),
      new THREE.MeshPhongMaterial({
        color: flat ? 0x111111 : new THREE.Color(dry ? '#6f5131' : '#59412c').getHex(),
        side: THREE.DoubleSide, shininess: 0
      })
    );
    soilWindow.rotation.x = -Math.PI / 2;
    soilWindow.position.y = 0.003;
    soilWindow.renderOrder = 1;
    group.add(soilWindow);

    // One seasonal ground-detail draw call: drought cracks OR fallen autumn leaves.
    // Shape carries the cue, so it remains useful without depending on colour alone.
    if (!flat && (cracked || (season === 'autumn' && !needle && alive))) {
      if (cracked) {
        var crackSegments = 32;
        var crackPos = new Float32Array(crackSegments * 6);
        for (var crk = 0; crk < crackSegments; crk++) {
          var ca = (crk % 16) * 2.39996 + (crk >= 16 ? 0.18 : 0);
          var cr0 = rootSpread * (0.42 + (crk >= 16 ? 0.26 : 0));
          var cr1 = cr0 + lawnR * (0.12 + (crk % 4) * 0.015);
          var cj = Math.sin(crk * 7.1) * 0.10;
          var co = crk * 6;
          crackPos[co] = Math.cos(ca) * cr0;
          crackPos[co + 1] = 0.012;
          crackPos[co + 2] = Math.sin(ca) * cr0;
          crackPos[co + 3] = Math.cos(ca + cj) * cr1;
          crackPos[co + 4] = 0.012;
          crackPos[co + 5] = Math.sin(ca + cj) * cr1;
        }
        var crackGeo = new THREE.BufferGeometry();
        crackGeo.setAttribute('position', new THREE.BufferAttribute(crackPos, 3));
        group.add(new THREE.LineSegments(crackGeo,
          new THREE.LineBasicMaterial({ color: new THREE.Color('#4a2f20').getHex() })));
      } else {
        var litterCount = 52;
        var litter = new THREE.InstancedMesh(
          new THREE.CircleGeometry(1, 5),
          new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), litterCount
        );
        var litterDummy = new THREE.Object3D();
        var litterColor = new THREE.Color();
        var litterRnd = seeded(7717);
        for (var lit = 0; lit < litterCount; lit++) {
          var la = litterRnd() * 6.2832;
          var ld = rootSpread * (0.44 + litterRnd() * 1.05);
          var ls = crownR * (0.020 + litterRnd() * 0.025);
          litterDummy.position.set(Math.cos(la) * ld, 0.014, Math.sin(la) * ld);
          litterDummy.rotation.set(-Math.PI / 2, 0, litterRnd() * 6.2832);
          litterDummy.scale.set(ls * 1.45, ls, ls);
          litterDummy.updateMatrix();
          litter.setMatrixAt(lit, litterDummy.matrix);
          litterColor.set(AUTUMN[lit % AUTUMN.length]);
          litter.setColorAt(lit, litterColor);
        }
        litter.instanceMatrix.needsUpdate = true;
        if (litter.instanceColor) litter.instanceColor.needsUpdate = true;
        group.add(litter);
      }
    }

    if (!flat) {

      // ── The wood beyond. A subject standing in a void reads as a specimen on a
      //    table; a horizon gives it somewhere to BE. Three InstancedMeshes, so the
      //    whole treeline costs three draw calls rather than two hundred. ──
      //
      // Two earlier passes got this wrong in opposite directions. Mixing the colour
      // 40% toward the horizon to fake aerial perspective turned them into pale
      // cut-outs floating over the grass; making every one an identical cone turned
      // them into a Christmas tree farm. Fog does the distance properly, so the
      // colour only wants a hint of it, and the wood needs BOTH silhouettes.
      var farHex = mixHex('#16351f', pal.lo, 0.10);
      if (season === 'winter') farHex = mixHex('#2c3644', pal.lo, 0.22);
      else if (season === 'autumn') farHex = mixHex('#5c4413', pal.lo, 0.13);
      else if (dry) farHex = mixHex('#4e4520', pal.lo, 0.14);
      // UNLIT on purpose. A lit distant tree picks up the same key and hemisphere as
      // the subject, comes back brighter than the thing in front of it, and reads as
      // pale cardboard. A treeline wants to be a SILHOUETTE that only the fog lifts,
      // which is exactly what a fogged MeshBasicMaterial gives.
      function farMat(hex) {
        return new THREE.MeshBasicMaterial({
          color: flat ? 0xffffff : new THREE.Color(hex).getHex(), fog: true
        });
      }
      var farTreeMat = farMat(farHex);
      var farRoundMat = farMat(mixHex(farHex, '#000000', 0.22));
      var farTrunkMat = farMat(mixHex('#221a12', pal.lo, 0.10));
      var NCONE = 46, NROUND = 46;
      var fCone = new THREE.InstancedMesh(new THREE.ConeGeometry(0.30, 1, 7), farTreeMat, NCONE);
      var fRound = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 14, 10), farRoundMat, NROUND);
      var fTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.030, 0.048, 1, 5), farTrunkMat, NCONE + NROUND);
      var dummy = new THREE.Object3D();
      var frnd = seeded(2029);
      function farStand(i, mesh, yFrac, hScale) {
        var fa = frnd() * 6.2832;
        // Two belts. A single random band leaves obvious gaps you can see the void
        // through; a near belt backed by a taller far one reads as depth in the wood.
        var belt = i % 3 === 0;
        var fd = belt ? (9.5 + frnd() * 5) : (15 + frnd() * 10);
        var fh = (belt ? 0.7 + frnd() * 1.1 : 1.2 + frnd() * 2.6);
        var fx = Math.cos(fa) * fd, fz = Math.sin(fa) * fd;
        dummy.position.set(fx, fh * yFrac, fz);
        dummy.scale.set(fh * hScale, fh, fh * hScale);
        dummy.rotation.set(0, fa, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        dummy.position.set(fx, fh * 0.15, fz);
        dummy.scale.set(1, fh * 0.34, 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        return dummy.matrix.clone();
      }
      for (var fi = 0; fi < NCONE; fi++) fTrunk.setMatrixAt(fi, farStand(fi, fCone, 0.62, 0.85));
      for (var fj = 0; fj < NROUND; fj++) fTrunk.setMatrixAt(NCONE + fj, farStand(fj, fRound, 0.74, 0.80));
      fCone.instanceMatrix.needsUpdate = true;
      fRound.instanceMatrix.needsUpdate = true;
      fTrunk.instanceMatrix.needsUpdate = true;
      group.add(fCone);
      group.add(fRound);
      group.add(fTrunk);

      // ── Undergrowth. A handful of grass tufts and low scrub around the foot of the
      //    tree. They cost one draw call and they are the only thing in frame that
      //    gives the trunk a SCALE to be read against. ──
      // A first pass used little CONES for these and scattered what looked like a
      // hundred toy Christmas trees over the lawn. Grass is blades, so it gets the
      // same alpha-tested card treatment the canopy does.
      var grassTex = grassTexture(THREE);
      if (grassTex) {
        var NTUFT = 150;
        var tuftMat = new THREE.MeshPhongMaterial({
          map: grassTex, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide,
          color: new THREE.Color(
            season === 'winter' ? mixHex(groundNear, '#94825f', 0.58)
            : season === 'autumn' ? mixHex(groundNear, '#b8a54e', 0.6)
            : dry ? mixHex(groundNear, '#c4b070', 0.6)
            : mixHex(groundNear, '#69a94e', 0.60)).getHex(),
          shininess: 0
        });
        // A vertical card catches almost nothing from a key light overhead, so without
        // this the tufts render as dark scribbles on a lit lawn.
        if (!flat) tuftMat.emissive = new THREE.Color(tuftMat.color).multiplyScalar(0.11);
        var tufts = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), tuftMat, NTUFT);
        var trnd = seeded(3331);
        for (var ti = 0; ti < NTUFT; ti++) {
          var ta = trnd() * 6.2832;
          // Nothing right at the foot: trampled bare ground under a canopy is real,
          // and tufts there would bury the root flare the Spread view needs to show.
          var td = lawnR * (0.30 + trnd() * 0.85);
          var ts = 0.055 + trnd() * 0.048;
          dummy.position.set(Math.cos(ta) * td, ts * 0.48, Math.sin(ta) * td);
          dummy.scale.set(ts, ts, ts);
          dummy.rotation.set(0, trnd() * 6.2832, (trnd() - 0.5) * 0.24);
          dummy.updateMatrix();
          tufts.setMatrixAt(ti, dummy.matrix);
        }
        tufts.instanceMatrix.needsUpdate = true;
        group.add(tufts);
      }
    }

    // ── Weather. Leaf fall in autumn, snow in winter, and NOTHING when the student
    //    has asked for reduced motion — the system is not BUILT in that case rather
    //    than being built and paused, because a shower frozen in mid-air is worse than
    //    no shower at all. ──
    var leafFall = null, leafSeeds = null, leafDummy = null, leafTop = 1;
    var falling = season === 'autumn' && !needle && alive;
    if (!flat && !reduced && falling) {
      var NL = 44;
      var lgeo = new THREE.PlaneGeometry(1, 1);
      var lmat = new THREE.MeshPhongMaterial({
        color: 0xffffff, side: THREE.DoubleSide, shininess: 8, flatShading: true
      });
      leafFall = new THREE.InstancedMesh(lgeo, lmat, NL);
      leafDummy = new THREE.Object3D();
      leafSeeds = [];
      var spread = crownR * 1.3;
      leafTop = crownTopY;
      var lrnd = seeded(6151);
      var col = new THREE.Color();
      for (var li = 0; li < NL; li++) {
        var lang = lrnd() * 6.2832;
        var lrad = spread * Math.sqrt(lrnd());
        leafSeeds.push({
          x: Math.cos(lang) * lrad, z: Math.sin(lang) * lrad,
          t0: lrnd(), sp: 0.05 + lrnd() * 0.10,
          sc: crownR * (0.055 + lrnd() * 0.05),
          spin: 0.6 + lrnd() * 1.6, sway: 0.30
        });
        col.set(clusterHex('autumn', 'broad', stressed, li));
        leafFall.setColorAt(li, col);
      }
      if (leafFall.instanceColor) leafFall.instanceColor.needsUpdate = true;
      group.add(leafFall);
    }

    // Dead trees keep their frame but lose their colour, so "it died" is visible in
    // the picture and not only in the toast that has already gone.
    if (!alive) {
      crownGroup.visible = false;
      // Neutral bark detail remains, while every parent stem/flare material is
      // desaturated. Clone materials stay independent because offspring may survive.
      trunkGroup.traverse(function (deadPart) {
        if (!deadPart.isMesh || !deadPart.material) return;
        var deadMats = Array.isArray(deadPart.material) ? deadPart.material : [deadPart.material];
        deadMats.forEach(function (deadMat) {
          if (deadMat.color) deadMat.color.setHex(flat ? 0xffffff : 0x574c40);
        });
      });
    }

    // ── Centre the tree on the point the shell actually looks at. ──
    var minY = -rootDepth;
    var maxY = Math.max(crownTopY, H);
    group.position.y = VIS_CENTER_Y - (minY + maxY) / 2;
    api.scene.add(group);

    // ── Report the tree's real extent so the camera can FRAME it. ──
    //
    // The shell takes one home distance at module load and keeps it for every tree,
    // which is wrong at both ends of a subject that spans 0.4 m to 90 m: a seedling
    // was a speck in an empty field, and a mature oak's crown ran off the top and
    // both sides of the frame. Neither is visible in a static check; both are
    // obvious the moment you look at it.
    //
    // The log compression in visH stays exactly as it was — that is what makes
    // growth read as growth — and the CAMERA adapts instead. Measured here rather
    // than predicted from visH, because crownTopY is grown by the crown builder
    // (masses, cones and cards each push it up) and is not knowable in advance.
    LAST_EXTENT = {
      halfV: Math.max(0.12, (maxY - minY) / 2),
      // crownMaxR is MEASURED from where the masses and cards actually landed, not
      // predicted from crownR: the branch system carries them several times crownR
      // out, which is why framing off crownR still cropped both sides of the canopy.
      radius: Math.max(crownMaxR, trunkR * 3, cloneReachR),
      visH: visH, heightM: heightM
    };
    // Out of band: this runs inside the shell's build, and reset() re-points the very
    // camera it is still setting up. A zero timeout lets the build finish first.
    if (typeof setTimeout === 'function') {
      setTimeout(function () {
        try { TREE3D.frame(!FRAMED_ONCE); FRAMED_ONCE = true; } catch (e) {}
      }, 0);
    }

    // Scene-owned motion. The shell owns the RAF, the visibility pause and the
    // reduced-motion preference; this only nudges nodes it already built, and
    // returns immediately when motion is reduced.
    //
    // `now` arrives as Date.now(), so it is a ~1.7e12 epoch value. Every phase below
    // is taken RELATIVE to the first frame: feeding the raw epoch into the fall
    // fraction would leave only microsecond resolution for the modulo.
    var t0 = 0;
    var cardDummy = new THREE.Object3D();
    function frame(now, sceneProps, reducedNow) {
      if (reducedNow || (sceneProps && sceneProps.reduced)) return;
      var wind = sceneProps && typeof sceneProps.wind === 'number' ? sceneProps.wind : 0.35;
      if (wind <= 0) return;
      wind *= form.wind;
      if (!t0) t0 = now;
      var t = (now - t0) / 1000;
      // Gusts. Constant-amplitude sway is exactly what gives a sine wave away as a
      // sine wave; real wind arrives in pulses, so the amplitude is itself modulated
      // by two slow beats that never quite line up.
      var gust = wind * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.21) * Math.sin(t * 0.37 + 1.1)));

      // The whole tree bends from the base. Both groups share that origin, so they
      // have to rotate together or the canopy shears off the trunk.
      var bendZ = Math.sin(t * 0.52) * gust * 0.024;
      var bendX = Math.cos(t * 0.41) * gust * 0.016;
      trunkGroup.rotation.z = bendZ; trunkGroup.rotation.x = bendX;
      crownGroup.rotation.z = bendZ; crownGroup.rotation.x = bendX;
      cloneGroup.rotation.z = Math.sin(t * 0.9 + 1.2) * gust * 0.030;

      // Then each mass moves on its own, more the higher it sits. A canopy that sways
      // as one rigid lump is the second giveaway after constant amplitude.
      for (var i = 0; i < foliage.length; i++) {
        var f = foliage[i];
        var amp = gust * 0.05 * (0.35 + f.h);
        f.m.position.x = f.base.x + Math.sin(t * 1.15 + f.phase) * amp;
        f.m.position.z = f.base.z + Math.cos(t * 0.93 + f.phase * 1.4) * amp * 0.7;
        f.m.position.y = f.base.y + Math.sin(t * 1.6 + f.phase) * amp * 0.30;
        f.m.rotation.z = Math.sin(t * 0.9 + f.phase) * gust * 0.10;
      }

      // Leaf cards flutter individually. This is the detail that sells wind: the
      // masses behind them move as lumps, and only the leaf layer shimmers.
      if (cards) {
        for (var ci2 = 0; ci2 < cardSpec.length; ci2++) {
          var sc2 = cardSpec[ci2];
          // A hanging shoot is not a twig: it swings, and it swings further the
          // further down the strand the leaf sits.
          var sw2 = sc2.swing == null ? 1 : sc2.swing;
          var a2 = Math.sin(t * 2.1 + sc2.phase) * gust * 0.30 * sw2;
          cardDummy.position.set(
            sc2.p.x + Math.sin(t * 1.5 + sc2.phase) * gust * sc2.sc * 0.16 * sw2,
            sc2.p.y + Math.sin(t * 1.9 + sc2.phase * 1.3) * gust * sc2.sc * 0.10,
            sc2.p.z + Math.cos(t * 1.3 + sc2.phase) * gust * sc2.sc * 0.14 * sw2
          );
          cardDummy.quaternion.copy(sc2.q);
          cardDummy.rotateY(a2);
          cardDummy.rotateX(a2 * 0.6);
          cardDummy.scale.setScalar(sc2.sc);
          cardDummy.updateMatrix();
          cards.setMatrixAt(ci2, cardDummy.matrix);
        }
        cards.instanceMatrix.needsUpdate = true;
      }

      if (sky) sky.rotation.y = t * 0.004;    // cloud drift, slow enough to be felt

      if (leafFall) {
        for (var li = 0; li < leafSeeds.length; li++) {
          var s = leafSeeds[li];
          var fall = (t * s.sp + s.t0) % 1;
          var drift = fall * 6.2832;
          var sw = crownR * (s.sway == null ? 0.30 : s.sway);
          leafDummy.position.set(
            s.x + Math.sin(drift + s.t0 * 6.28) * sw,
            leafTop - fall * (leafTop + rootDepth * 0.2),
            s.z + Math.cos(drift * 0.8 + s.t0 * 6.28) * sw * 0.87
          );
          leafDummy.rotation.set(t * s.spin, t * s.spin * 1.3 + s.t0 * 6.28, fall * 6.0);
          leafDummy.scale.setScalar(s.sc);
          leafDummy.updateMatrix();
          leafFall.setMatrixAt(li, leafDummy.matrix);
        }
        leafFall.instanceMatrix.needsUpdate = true;
      }
    }

    return { meshes: meshes, picks: picks, anchor: trunk, frame: frame };
  }


  var TICK_MS = 200;                 // 5 Hz: smooth enough to read, cheap enough to run
  var HEARTBEAT_STALE_MS = 1500;     // ~7 missed renders means nobody is watching

  var CLOCK = (function () {
    var id = null;
    var onTick = null;
    var lastSeen = 0;
    var lastTickAt = 0;
    function stop() {
      if (id) { clearInterval(id); id = null; }
      lastTickAt = 0;
    }
    function beat(fn) { onTick = fn; lastSeen = Date.now(); }
    function ensure(running) {
      if (!running) { stop(); return; }
      if (id) return;
      lastTickAt = Date.now();
      id = setInterval(function () {
        var now = Date.now();
        if (now - lastSeen > HEARTBEAT_STALE_MS) { stop(); return; }
        if (!onTick) return;
        // setInterval is delayed by WebGL and busy school devices. Advance by real
        // elapsed time, but cap one callback at a second so a suspended tab cannot
        // jump centuries when it becomes visible again.
        var elapsedMs = clamp(now - lastTickAt, TICK_MS, 1000);
        lastTickAt = now;
        try { onTick(elapsedMs); } catch (e) { console.warn('[TreeLab] clock stopped', e); stop(); }
      }, TICK_MS);
    }
    return { beat: beat, ensure: ensure, stop: stop, running: function () { return !!id; } };
  })();

  // ── The immersive body class ──────────────────────────────────────────────
  //
  // Full screen hides the hub's own toolbar, which lives in a file this tool must not
  // edit. A class on <body> is the whole coupling, and the risk it carries is obvious:
  // leave it behind and the STEAM Lab hub has no toolbar and no way back to the tool
  // list, across every OTHER tool the student opens next.
  //
  // renderTool() inlines this tool's render into the host's fiber, so there is no
  // unmount hook to hang cleanup on — the same constraint that makes the playback clock
  // a module-scope heartbeat rather than an effect.
  //
  // ★ A render heartbeat is the WRONG signal here, and it was the first thing I tried.
  // The clock can use one because a running clock re-renders constantly. A full-screen
  // scene is static: a student can watch it for minutes without a single re-render, so
  // the stamps stop, the watchdog concludes the tool is gone and puts the hub's toolbar
  // back over the top of a live full-screen view.
  //
  // The canvas ref IS a real unmount signal — React calls it with null when the tool
  // goes away, and TREE3D.attach already receives it — so cleanup hangs off that.
  var IMMERSIVE_CLASS = 'allo-treelab-immersive';
  function setImmersiveBodyClass(on) {
    if (typeof document === 'undefined' || !document.body) return;
    try {
      if (on) document.body.classList.add(IMMERSIVE_CLASS);
      else document.body.classList.remove(IMMERSIVE_CLASS);
    } catch (e) {}
  }

  // Playback speeds in simulated years per real second. The slowest is deliberately
  // sub-year so the seasons actually cycle on screen; above that they would only
  // strobe, so the scene pins to summer and the speed buys decades instead.
  var SPEEDS = [
    { id: 'seasons', label: 'Seasons', yps: 0.5, seasonal: true, hint: 'One year every two seconds. Watch the canopy come and go.' },
    { id: 'slow', label: '1 yr/s', yps: 1, seasonal: false, hint: 'A ring a second.' },
    { id: 'fast', label: '5 yr/s', yps: 5, seasonal: false, hint: 'A decade every two seconds.' },
    { id: 'century', label: '25 yr/s', yps: 25, seasonal: false, hint: 'A century every four seconds.' }
  ];
  function speedById(id) {
    for (var i = 0; i < SPEEDS.length; i++) if (SPEEDS[i].id === id) return SPEEDS[i];
    return SPEEDS[1];
  }
  // Sub-year phase drives the visible season at the slow speed. Northern-hemisphere
  // ordering, starting at leaf-out.
  // Seasons the student can choose, and what is actually going on in each. The scene
  // could always DRAW four seasons; until now the only way to see one was to run the
  // clock at its slowest speed and catch the right half-second.
  //
  // These notes describe real phenology. They are NOT engine output: simulateYear runs
  // a whole year at a time and has no seasonal term, so the season changes what is on
  // screen and what is described here, and nothing the model has computed. Saying so is
  // the honest version, and the panel does say so.
  var SEASONS = [
    { id: 'spring', label: 'Spring', emoji: '🌱' },
    { id: 'summer', label: 'Summer', emoji: '☀️' },
    { id: 'autumn', label: 'Autumn', emoji: '🍂' },
    { id: 'winter', label: 'Winter', emoji: '❄️' }
  ];
  var SEASON_NOTE = {
    spring: {
      broad: 'Bud break. A broadleaf has to build a whole new canopy out of stored sugar before it can earn anything back, so it starts the year in debt.',
      needle: 'A conifer starts spring with its leaves already built and in place, so it can work as soon as it is warm enough instead of spending the first weeks rebuilding.'
    },
    summer: {
      broad: 'Full canopy and the longest days. Most of the year’s carbon is made now, and most of the year’s water goes out through the stomata to get it.',
      needle: 'Full light and warm soil. Conifer needles are built to lose less water, which costs them some maximum rate but keeps them working in drier air.'
    },
    autumn: {
      broad: 'Before the leaves go, the tree pulls nitrogen and phosphorus back into the twigs and reuses them next spring. The yellows underneath were there all season, masked by the green.',
      needle: 'The needles stay, but the season still closes: shortening days and falling temperatures stop growth whether or not a tree has leaves to lose.'
    },
    winter: {
      broad: 'No leaves, so no photosynthesis — but the living wood goes on respiring. A dormant broadleaf runs at a loss all winter and pays for it out of reserves.',
      needle: 'Needles stay on, but frozen ground means no water to replace what transpires, so the stomata stay shut. An evergreen in deep winter earns very little either.'
    }
  };
  function seasonForPhase(phase) {
    var p = phase - Math.floor(phase);
    if (p < 0.25) return 'spring';
    if (p < 0.55) return 'summer';
    if (p < 0.78) return 'autumn';
    return 'winter';
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 7: REGISTRATION + RENDER
  // ─────────────────────────────────────────────────────────
  window.StemLab.registerTool('treeLab', {
    // Contract-required field names (label/desc/color). title/description are kept as
    // aliases because older hub call sites read those.
    label: 'Tree Life Lab',
    title: 'Tree Life Lab',
    desc: 'Run a tree’s carbon budget across centuries: what limits photosynthesis hour to hour, what it costs to stay alive, and how a tree makes more of itself with and without seeds.',
    description: 'Run a tree’s carbon budget across centuries: what limits photosynthesis hour to hour, what it costs to stay alive, and how a tree makes more of itself with and without seeds.',
    color: 'emerald',
    icon: '🌳',
    category: 'Life Science',
    gradeRange: 'K-12',
    ready: true,
    questHooks: [
      { id: 'grow_50', label: 'Grow a tree past 50 years', icon: '🌳',
        check: function (d) { return ((d.tree && d.tree.age) || 0) >= 50; },
        progress: function (d) { return ((d.tree && d.tree.age) || 0) + ' / 50 years'; } },
      { id: 'find_limit', label: 'Identify all four limiting factors', icon: '🔍',
        check: function (d) { return Object.keys(d.limitsSeen || {}).length >= 4; },
        progress: function (d) { return Object.keys(d.limitsSeen || {}).length + ' / 4 found'; } },
      { id: 'spread_round', label: 'Finish a Spread round', icon: '🌱',
        check: function (d) { return (d.spreadRounds || 0) >= 1; },
        progress: function (d) { return (d.spreadRounds || 0) + ' round(s)'; } },
      { id: 'mixed_strategy', label: 'Establish descendants both ways', icon: '🧬',
        check: function (d) { return (d.bestDiverse || 0) >= 1 && (d.bestClonal || 0) >= 1; },
        progress: function (d) { return 'seed ' + (d.bestDiverse || 0) + ' / clonal ' + (d.bestClonal || 0); } }
    ],

    render: function (ctx) {
      var h = ctx.React.createElement;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var d = (ctx.toolData && ctx.toolData.treeLab) || {};
      var addToast = ctx.addToast;
      var a11yClick = ctx.a11yClick;
      var isDark = !!ctx.isDark;
      var isContrast = !!ctx.isContrast;
      var reduceMotion = !!ctx.reduceMotion;
      var band = resolveBand(ctx, d);

      function upd(k, v) {
        if (k && typeof k === 'object') { return updMulti(k); }
        ctx.setToolData(function (prev) {
          var copy = Object.assign({}, prev);
          var td = Object.assign({}, copy.treeLab || {});
          td[k] = (typeof v === 'function') ? v(td[k]) : v;
          copy.treeLab = td;
          return copy;
        });
      }
      function updMulti(obj) {
        ctx.setToolData(function (prev) {
          var copy = Object.assign({}, prev);
          var td = Object.assign({}, copy.treeLab || {});
          Object.keys(obj).forEach(function (k) { td[k] = obj[k]; });
          copy.treeLab = td;
          return copy;
        });
      }
      function xp(n) { try { if (ctx.awardXP) ctx.awardXP(n); } catch (e) {} }

      // ── Theme tokens. Plain hex so the same token is safe in a style object, an SVG
      //    presentation attribute and a THREE material. High contrast flattens to
      //    black/white/yellow. ──
      // onAccent is the ink for anything FILLED with the accent (a selected tab, a
      // pressed button). White on the accent measured 3.76:1 light and 1.92:1 dark,
      // both below AA. A near-black green clears it comfortably in both.
      var T = isContrast
        ? { bg: '#000000', card: '#000000', cardAlt: '#0a0a0a', border: '#ffffff', text: '#ffffff', dim: '#e5e5e5', accent: '#ffff00', onAccent: '#000000', good: '#00ff00', bad: '#ff6666', warn: '#ffcc00' }
        : (isDark
          ? { bg: '#0f172a', card: '#1e293b', cardAlt: '#172033', border: '#334155', text: '#e2e8f0', dim: '#94a3b8', accent: '#34d399', onAccent: '#04241a', good: '#4ade80', bad: '#f87171', warn: '#fbbf24' }
          : { bg: '#f8fafc', card: '#ffffff', cardAlt: '#f1f5f9', border: '#cbd5e1', text: '#0f172a', dim: '#475569', accent: '#059669', onAccent: '#00150e', good: '#15803d', bad: '#dc2626', warn: '#b45309' });

      // Scoped interaction and responsive polish. Everything lives below
      // .allo-tree-lab so neighbouring STEAM tools remain untouched.
      var visualCss = [
        '.allo-tree-lab{position:relative;isolation:isolate;overflow:visible;}',
        '.allo-tree-lab:before{content:"";position:absolute;inset:0 0 auto 0;height:280px;pointer-events:none;z-index:-1;background:radial-gradient(circle at 8% 5%,var(--tree-glow),transparent 36%),radial-gradient(circle at 92% 0,var(--sun-glow),transparent 30%);}',
        '.allo-tree-hero{position:relative;overflow:hidden;}',
        '.allo-tree-hero:after{content:"";position:absolute;width:180px;height:180px;right:-72px;bottom:-112px;border-radius:50%;border:28px solid var(--hero-ring);pointer-events:none;}',
        '.allo-tree-workbench{display:grid;grid-template-columns:minmax(360px,540px) minmax(420px,1fr);gap:16px;align-items:start;}',
        '.allo-tree-workbench>*{min-width:0;}',
        '.allo-tree-workbench-sticky{position:sticky;top:12px;}',
        // ── Full screen actually being full screen. ──
        //
        // The stage is `position:fixed; z-index:<high>`, which ought to be enough and
        // was not, for two reasons that are invisible in the markup:
        //   1. `position:sticky` ALWAYS creates a stacking context, whatever its
        //      z-index. The stage lives inside .allo-tree-workbench-sticky, so its
        //      z-index could only ever compete with its siblings in there — the tool's
        //      own hero header painted straight over the top of it.
        //   2. .allo-tree-lab sets `isolation:isolate`, a second stacking context, so
        //      even winning inside the tool could not lift the stage above the STEAM
        //      Lab hub's own toolbar (z-index 100) outside it.
        // Both are switched off for the duration, and the page furniture the stage is
        // replacing is hidden rather than left to be painted over.
        '.allo-tree-lab.is-full{isolation:auto;}',
        '.allo-tree-lab.is-full .allo-tree-workbench-sticky{position:static;}',
        // !important is load-bearing, not defensive: the hero and the tab strip both
        // carry an inline `display:flex`, and an inline style beats a stylesheet rule
        // of any specificity. Without it the rule matches, computes, and loses.
        '.allo-tree-lab.is-full .allo-tree-hero,.allo-tree-lab.is-full .allo-tree-tabs{display:none!important;}',
        // The hub chrome belongs to stem_lab_module.js, which this tool must not edit
        // (three host copies, and a reachability gate that byte-matches two of them).
        // Hiding it from here is scoped to the one class, and to the moment the class
        // is on the body — it is removed on exit and on unmount.
        'body.allo-treelab-immersive .stem-active-toolbar{display:none!important;}',
        'body.allo-treelab-immersive .stem-lab-topbar,body.allo-treelab-immersive .stem-lab-tablist{display:none!important;}',
        '.allo-tree-card{transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease;}',

        '.allo-tree-button,.allo-tree-tab{transition:transform .14s ease,box-shadow .14s ease,background .14s ease,border-color .14s ease;}',
        '.allo-tree-button:not(:disabled):hover,.allo-tree-tab:hover{transform:translateY(-1px);box-shadow:0 5px 14px var(--tree-shadow);}',
        '.allo-tree-button:focus-visible,.allo-tree-tab:focus-visible,.allo-tree-lab select:focus-visible,.allo-tree-lab input:focus-visible,.allo-tree-lab textarea:focus-visible{outline:3px solid var(--tree-focus);outline-offset:2px;}',
        '.allo-tree-tabs{scrollbar-width:thin;}',
        '.allo-tree-tab[aria-selected="true"]{box-shadow:0 6px 16px var(--accent-shadow);}',
        '.allo-tree-panel{animation:tree-panel-in .22s ease-out;}',
        '@keyframes tree-panel-in{from{opacity:.45;transform:translateY(4px)}to{opacity:1;transform:none}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-card,.allo-tree-button,.allo-tree-tab,.allo-tree-panel{transition:none!important;animation:none!important}}',
        '@media (max-width:960px){.allo-tree-workbench{grid-template-columns:minmax(0,1fr)}.allo-tree-workbench-sticky{position:static}}',
        '@media (max-width:620px){.allo-tree-lab{padding:10px!important}.allo-tree-hero{padding:15px!important}.allo-tree-hero-controls{width:100%;justify-content:flex-start!important}.allo-tree-hero-field{flex:1 1 130px;flex-direction:column;align-items:stretch!important}.allo-tree-hero-field select{width:100%}.allo-tree-tabs{flex-wrap:nowrap!important;overflow-x:auto;padding-bottom:7px!important}.allo-tree-tab{flex:0 0 auto}.allo-tree-card{border-radius:14px!important;padding:12px!important}.allo-tree-workbench-scene [role="img"]{height:clamp(280px,55svh,420px)!important}}'
      ].join('');
      var view = d.view || 'grow';
      var sp = speciesById(d.speciesId || 'oak');
      var tree = normaliseTree(d.tree, sp.id);
      var speed = speedById(d.speed || 'slow');
      var playing = !!d.playing && tree.alive;
      var yearPhase = typeof d.yearPhase === 'number' && isFinite(d.yearPhase) ? d.yearPhase : 0;
      // Seasons only cycle at the slow speed. Above that they would strobe, and every
      // change rebuilds the whole WebGL scene — at 25 yr/s that is 100 rebuilds a
      // second for something nobody can see.
      var season = (playing && speed.seasonal) ? seasonForPhase(yearPhase) : (d.season || 'summer');

      var envCfg = {
        tempC: d.tempC == null ? 22 : d.tempC,
        light: d.light == null ? 0.8 : d.light,
        co2ppm: d.co2ppm == null ? 420 : d.co2ppm,
        soilWater: d.soilWater == null ? 0.7 : d.soilWater,
        droughtYears: d.droughtYears || []
      };
      var alloc = normaliseAlloc(d.alloc);
      var experiment = normaliseExperiment(d.experiment);
      var experimentTrials = normaliseExperimentTrials(d.experimentTrials);
      var experimentActive = experiment.phase !== 'idle';
      var experimentLocked = experiment.phase === 'ready' || experiment.phase === 'explain';
      playing = playing && !experimentActive;

      // Live readout for the CURRENT settings, independent of the yearly step.
      // Same environment the next simulated year will see, so a drought is visible in
      // the headline numbers and in the limiting factor immediately, not only in
      // hindsight once the ring has already been laid.
      var liveEnv = envForYear(envCfg, tree.age);
      var inDrought = !!liveEnv.drought;
      var aperture = stomatalAperture(liveEnv.soilWater, sp.droughtTol, false);
      var live = grossPhotosynthesis(sp, liveEnv, tree.leafArea, aperture);
      var liveResp = maintenanceRespiration(sp, tree);
      var liveNet = live.gross - liveResp;
      // Season total spread over a ~180-day growing season. The prose beside this
      // quotes gallons per DAY, so a seasonal total in litres made the two unreadable
      // against each other.
      var transpirationPerDay =
        (tree.leafArea * aperture * clamp((envCfg.tempC - 5) / 30, 0.05, 1) * 210) / 180;
      function fmtInt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

      // ── Shared UI atoms ──
      function card(children, extra) {
        return h('div', {
          className: 'allo-tree-card',
          style: Object.assign({
            background: T.card, border: '1px solid ' + T.border, borderRadius: 16,
            padding: 16, marginBottom: 14,
            boxShadow: isContrast ? 'none' : (isDark ? '0 10px 28px rgba(2,6,23,.22)' : '0 10px 30px rgba(15,23,42,.07)')
          }, extra || {})
        }, children);
      }
      // Grow assembles helper-returned panels into one sibling array. React cannot
      // see the key that belongs to a helper's root element, so assign the stable
      // panel identity at the point where the siblings are assembled.
      function pushKeyed(list, node, key) {
        if (node == null) return;
        if (Array.isArray(node)) {
          node.forEach(function (child, i) { pushKeyed(list, child, key + '-' + i); });
          return;
        }
        if (ctx.React && typeof ctx.React.isValidElement === 'function' &&
            ctx.React.isValidElement(node) && node.key == null) {
          node = ctx.React.cloneElement(node, { key: key });
        }
        list.push(node);
      }
      function heading(txt, sub) {
        return h('div', { key: 'hd', style: { marginBottom: 13 } }, [
          h('div', { key: 'h', style: { fontWeight: 800, fontSize: 16, color: T.text, letterSpacing: '-0.01em' } }, txt),
          sub ? h('div', { key: 's', style: { fontSize: 12, color: T.dim, marginTop: 4, lineHeight: 1.55, maxWidth: 760 } }, sub) : null
        ]);
      }
      // opts.ariaLabel names a button whose visible content is a glyph. The six
      // 3D view controls read as "◀ ▶ ▲ ▼ + −", which a screen reader announces
      // as punctuation or nothing at all, so the accessible name has to come
      // from somewhere other than the label text.
      function btn(key, labelTxt, onClick, opts) {
        var o = opts || {};
        return h('button', {
          className: 'allo-tree-button',
          key: key, type: 'button', onClick: onClick, disabled: !!o.disabled,
          'aria-label': o.ariaLabel || undefined,
          title: o.ariaLabel || undefined,
          'aria-pressed': o.pressed == null ? undefined : !!o.pressed,
          style: {
            padding: o.small ? '5px 10px' : '8px 14px',
            borderRadius: 10, cursor: o.disabled ? 'not-allowed' : 'pointer',
            fontSize: o.small ? 12 : 13, fontWeight: 600,
            border: '1px solid ' + (o.pressed ? T.accent : T.border),
            background: o.pressed ? T.accent : (o.tone === 'ghost' ? 'transparent' : T.cardAlt),
            color: o.pressed ? T.onAccent : T.text,
            opacity: o.disabled ? 0.5 : 1, minHeight: o.small ? 32 : 38,
            marginRight: 6, marginBottom: 6
          }
        }, labelTxt);
      }
      // Sliders are native inputs on purpose: they are keyboard operable and screen
      // reader labelled for free, which a div with role="slider" is not.
      function slider(key, labelTxt, value, min, max, step, onChange, fmt, disabled) {
        var id = 'treelab-' + key;
        return h('div', { key: key, style: { marginBottom: 10 } }, [
          h('label', { key: 'l', htmlFor: id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 4 } }, [
            h('span', { key: 'a' }, labelTxt),
            h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, fmt ? fmt(value) : String(value))
          ]),
          h('input', {
            key: 'i', id: id, type: 'range', min: min, max: max, step: step, value: value,
            disabled: !!disabled,
            onChange: function (e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: T.accent, opacity: disabled ? 0.55 : 1 }
          })
        ]);
      }
      function bar(labelTxt, frac, hex, note) {
        return h('div', { key: labelTxt, style: { marginBottom: 8 } }, [
          h('div', { key: 'r', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 3 } }, [
            h('span', { key: 'a' }, labelTxt),
            h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, Math.round(frac * 100) + '%')
          ]),
          h('div', { key: 't', style: { height: 9, background: T.cardAlt, borderRadius: 5, overflow: 'hidden', border: '1px solid ' + T.border } },
            h('div', { style: { height: '100%', width: Math.round(clamp(frac, 0, 1) * 100) + '%', background: hex, borderRadius: 5 } })),
          note ? h('div', { key: 'n', style: { fontSize: 11, color: T.dim, marginTop: 2 } }, note) : null
        ]);
      }
      function modelNote(txt) {
        return h('p', {
          key: 'modelnote',
          role: 'note',
          style: { fontSize: 11, color: T.dim, lineHeight: 1.55, marginTop: 10, paddingTop: 8, borderTop: '1px dashed ' + T.border }
        }, txt);
      }

      // ── Simulation actions ──
      function freshExperiment(baseTree, speciesId, baseEnv, baseAlloc, duration) {
        var sid = speciesById(speciesId).id;
        return {
          phase: 'predict', duration: clamp(Math.round(finiteOr(duration, 10)), 1, 100),
          prediction: { limiter: null, outcome: null, reason: '' },
          baseline: {
            speciesId: sid,
            tree: cloneTreeSnapshot(baseTree, sid),
            env: normaliseExperimentEnv(baseEnv),
            alloc: normaliseAlloc(baseAlloc)
          },
          treatment: null, result: null, explanation: ''
        };
      }

      function beginExperiment() {
        CLOCK.stop();
        updMulti({
          playing: false,
          experiment: freshExperiment(tree, sp.id, envCfg, alloc, experiment.duration)
        });
        sfxTick();
        srSay(__alloT('stem.treelab.experiment_started', 'Investigation started. Set the conditions, then make a prediction.'));
      }

      function updatePrediction(field, value) {
        var next = Object.assign({}, experiment, {
          prediction: Object.assign({}, experiment.prediction)
        });
        next.prediction[field] = value;
        upd('experiment', next);
      }

      function lockPrediction() {
        if (!experiment.prediction.limiter || !experiment.prediction.outcome) {
          sfxBad();
          srSay(__alloT('stem.treelab.prediction_needed', 'Choose a limiting factor and an outcome before locking the prediction.'));
          return;
        }
        upd('experiment', Object.assign({}, experiment, {
          phase: 'ready',
          treatment: { env: normaliseExperimentEnv(envCfg), alloc: normaliseAlloc(alloc) },
          result: null,
          explanation: ''
        }));
        sfxTick();
        srSay(__alloT('stem.treelab.prediction_locked', 'Prediction locked. Conditions are frozen and the trial is ready to run.'));
      }

      function editPrediction() {
        upd('experiment', Object.assign({}, experiment, {
          phase: 'predict', treatment: null, result: null, explanation: ''
        }));
        srSay(__alloT('stem.treelab.prediction_editing', 'Prediction unlocked. You can change the conditions again.'));
      }

      function runLockedExperiment() {
        if (!experiment.baseline || !experiment.treatment) { sfxBad(); return; }
        var sid = experiment.baseline.speciesId;
        var outcome = runExperimentTrial(
          experiment.baseline.tree, sid,
          experiment.treatment.env, experiment.treatment.alloc,
          experiment.duration
        );
        var seen = Object.assign({}, d.limitsSeen || {});
        Object.keys(outcome.summary.limiterCounts).forEach(function (id) {
          if (outcome.summary.limiterCounts[id] > 0) seen[id] = true;
        });
        updMulti({
          tree: outcome.tree,
          speciesId: sid,
          limitsSeen: seen,
          playing: false,
          yearPhase: 0,
          experiment: Object.assign({}, experiment, { phase: 'explain', result: outcome })
        });
        outcome.tree.alive ? sfxGrow() : sfxBad();
        xp(6);
        srSay(__alloT('stem.treelab.trial_complete', 'Trial complete. Compare the observation with your prediction, then explain what happened.'));
      }

      function saveExperimentTrial(slot) {
        if (experiment.phase !== 'explain' || !experiment.baseline || !experiment.result) return;
        var trial = normaliseTrialRecord({
          speciesId: experiment.baseline.speciesId,
          duration: experiment.duration,
          prediction: experiment.prediction,
          baseline: experiment.baseline,
          treatment: experiment.treatment,
          result: experiment.result,
          explanation: experiment.explanation
        });
        var next = { A: experimentTrials.A, B: experimentTrials.B };
        next[slot] = trial;
        upd('experimentTrials', next);
        sfxGrow();
        srSay(__alloT('stem.treelab.trial_saved', 'Trial saved in the lab notebook.'));
        if (addToast) addToast(__alloT('stem.treelab.trial_saved_short', 'Trial ') + slot + ' ' + __alloT('stem.treelab.saved', 'saved'), 'success');
      }

      function prepareTrialBFromA() {
        var a = experimentTrials.A;
        if (!a) return;
        var base = a.baseline;
        CLOCK.stop();
        updMulti({
          tree: cloneTreeSnapshot(base.tree, a.speciesId),
          speciesId: a.speciesId,
          tempC: a.treatment.env.tempC,
          light: a.treatment.env.light,
          co2ppm: a.treatment.env.co2ppm,
          soilWater: a.treatment.env.soilWater,
          droughtYears: a.treatment.env.droughtYears.slice(),
          alloc: Object.assign({}, a.treatment.alloc),
          playing: false,
          yearPhase: 0,
          experiment: freshExperiment(base.tree, a.speciesId, base.env, base.alloc, a.duration)
        });
        srSay(__alloT('stem.treelab.trial_b_ready', 'Trial B starts from the same tree as Trial A. Change one condition and make a new prediction.'));
      }

      function finishExperiment() {
        upd('experiment', {
          phase: 'idle', duration: experiment.duration,
          prediction: { limiter: null, outcome: null, reason: '' },
          baseline: null, treatment: null, result: null, explanation: ''
        });
        srSay(__alloT('stem.treelab.investigation_closed', 'Investigation closed. Ordinary playback is available again.'));
      }
      function stepYears(n) {
        if (experimentActive) {
          srSay(__alloT('stem.treelab.use_trial_run', 'Finish or close the investigation before using ordinary year steps.'));
          return;
        }
        var st = tree;
        var seen = Object.assign({}, d.limitsSeen || {});
        for (var i = 0; i < n && st.alive; i++) {
          var env = envForYear(envCfg, st.age);
          var probe = grossPhotosynthesis(sp, env, st.leafArea, stomatalAperture(env.soilWater, sp.droughtTol, false));
          seen[probe.limiting.id] = true;
          st = simulateYear(st, sp, env, alloc);
        }
        updMulti({ tree: st, limitsSeen: seen });
        if (!st.alive) {
          sfxBad();
          srSay('The tree died at age ' + st.age + '.');
          if (addToast) addToast('The tree died at age ' + st.age, 'error');
        } else {
          sfxGrow();
          srSay('Advanced ' + n + ' year' + (n === 1 ? '' : 's') + '. Age ' + st.age + ', height ' + round(st.heightM, 1) + ' metres.');
        }
        if (n >= 10) xp(4);
      }
      // One clock tick. Fractional years accumulate in yearPhase; simulateYear runs
      // only when a whole one has passed, so the seasons animate smoothly without
      // running the engine five times a second.
      function tick(elapsedMs) {
        var clockMs = typeof elapsedMs === 'number' && isFinite(elapsedMs) ? elapsedMs : TICK_MS;
        var advance = (speed.yps * clockMs) / 1000;
        var phase = yearPhase + advance;
        var whole = Math.floor(phase);
        if (whole < 1) { upd('yearPhase', phase); return; }
        var st = tree;
        var seen = Object.assign({}, d.limitsSeen || {});
        for (var i = 0; i < whole && st.alive; i++) {
          var env = envForYear(envCfg, st.age);
          var probe = grossPhotosynthesis(sp, env, st.leafArea, stomatalAperture(env.soilWater, sp.droughtTol, false));
          seen[probe.limiting.id] = true;
          st = simulateYear(st, sp, env, alloc);
        }
        var patch = { tree: st, limitsSeen: seen, yearPhase: phase - whole };
        if (!st.alive) {
          patch.playing = false;
          sfxBad();
          srSay('The tree died at age ' + st.age + '. ' +
            (st.causeOfDeath === 'senescence' ? 'It reached the end of its lifespan.' : 'It spent more than it made for too long.'));
          if (addToast) addToast('The tree died at age ' + st.age, 'error');
        }
        updMulti(patch);
      }
      // Hand the clock this render's closure, then start or stop it. beat() also
      // stamps the heartbeat that stops the clock if the tool is unmounted.
      CLOCK.beat(tick);
      CLOCK.ensure(playing);
      // Stamps the immersive heartbeat AND re-asserts the class, which matters on the
      // path nobody thinks about: viewerFull is persisted state, so a student who left
      // in full screen comes back in full screen without setFull ever being called.
      setImmersiveBodyClass(!!d.viewerFull);

      function togglePlay() {
        if (experimentActive) {
          sfxBad();
          srSay(__alloT('stem.treelab.use_trial_run', 'Finish or close the investigation before using ordinary playback.'));
          return;
        }
        var next = !d.playing;
        if (next && !tree.alive) { sfxBad(); srSay('This tree has died. Start a new seedling first.'); return; }
        upd('playing', next);
        sfxTick();
        srSay(next ? 'Playing at ' + speed.label + '.' : 'Paused at age ' + tree.age + '.');
      }

      function sendDrought(years) {
        var list = [];
        for (var i = 0; i < years; i++) list.push(tree.age + i);
        upd('droughtYears', list);
        sfxBad();
        srSay(__alloT('stem.treelab.drought_started', 'A drought begins. It will last ') + years +
          __alloT('stem.treelab.drought_years', ' years.'));
        if (addToast) addToast('☀️ ' + __alloT('stem.treelab.drought_toast', 'Drought'), 'error');
      }
      function endDrought() {
        upd('droughtYears', []);
        srSay(__alloT('stem.treelab.drought_over', 'The rains return.'));
      }

      function resetTree(newSpeciesId) {
        var sid = newSpeciesId || sp.id;
        // Committed carbon and the last result belong to the OLD species. Left in
        // place, a student who set up an aspen root-sucker run and then switched to
        // oak would carry that commitment across and resolve a strategy oak does not
        // have — the Spread list would offer three routes while the results reported
        // a fourth. Reproduction carbon is reset with the tree anyway.
        updMulti({
          tree: newTree(sid), speciesId: sid, spend: {}, lastSpread: null, playing: false,
          selectedPart: null,
          yearPhase: 0, droughtYears: [],
          // The record belongs to the tree that earned it, and the 3D scene reads its
          // clone count from spreadTotals — a fresh seedling was inheriting the
          // previous tree's whole stand of clones.
          spreadTotals: { diverse: 0, clonal: 0 }, spreadLog: [], spreadRounds: 0,
          experiment: {
            phase: 'idle', duration: experiment.duration,
            prediction: { limiter: null, outcome: null, reason: '' },
            baseline: null, treatment: null, result: null, explanation: ''
          }
        });
        CLOCK.stop();
        srSay('Reset to a new ' + speciesById(sid).name + ' seedling.');
      }

      // ── 3D panel. TREE3D.attach is a stable module-scope function, so React mounts
      //    the canvas once instead of tearing it down every render. ──
      var cloneCount = (d.spreadTotals && d.spreadTotals.clonal) || 0;
      var treeVisual = deriveTreeVisualState(tree, sp, liveEnv, season);
      var isSceneDry = inDrought || liveEnv.soilWater < 0.35;
      var isSceneCracked = liveEnv.soilWater < 0.12;
      var crownSelectable = tree.alive && !(season === 'winter' && sp.leafType !== 'needle');
      var sceneSelection = d.selectedPart || null;
      if ((sceneSelection === 'clones' && cloneCount <= 0) ||
          (sceneSelection === 'crown' && !crownSelectable)) sceneSelection = null;
      // Geometry rebuilds destroy and recreate a WebGL renderer. During playback one
      // age bucket per real second is enough to show growth, while pause immediately
      // restores the exact height/DBH/canopy/root bands for close inspection.
      var growthCadence = speed.yps >= 20 ? 25 : (speed.yps >= 5 ? 5 : 1);
      var sceneGrowthKey = playing
        ? 'age:' + Math.floor(Math.max(0, tree.age) / growthCadence)
        : [
          Math.round(tree.heightM * 4), Math.round(tree.dbhCm),
          Math.round(Math.log(1 + Math.max(0, tree.leafArea || 0)) * 2),
          Math.round(treeVisual.rootVigor * 4)
        ].join(':');
      TREE3D.sync({
        selected: sceneSelection,
        dark: isDark,
        contrast: isContrast,
        onPick: function (id) { upd('selectedPart', id); },
        onStatus: function (next) { upd('viewerStatus', next); },
        sceneKey: [
          sp.id,
          sceneGrowthKey,

          season, cloneCount, tree.alive ? 1 : 0,
          // The sun's HEIGHT is baked into the scene, so the light slider has to be in
          // the key — but quantised to six steps, because a rebuild is a full WebGL
          // teardown and dragging a continuous slider would fire one per pixel.
          Math.round(liveEnv.light * 5), isSceneDry ? 'dry' : '-', isSceneCracked ? 'cracked' : '-',
          // Water angle and carbon-driven canopy density are baked into the scene;
          // four quantised states avoid rebuilding for every slider pixel.
          Math.round(treeVisual.waterStress * 3),
          Math.round(treeVisual.carbonStress * 3),
          reduceMotion ? 'still' : 'anim'
        ].join('|'),
        sceneProps: {
          species: sp, tree: tree, season: season, clones: cloneCount,
          visual: treeVisual, wind: reduceMotion ? 0 : 0.4,
          light: liveEnv.light, soilWater: liveEnv.soilWater,
          // Drought reads as a dusty amber sky and dry ground, so the picture and the
          // limiting-factor card tell one story rather than two.
          dry: isSceneDry, cracked: isSceneCracked,
          // The falling-leaf system is NOT BUILT under reduced motion. A shower of
          // leaves frozen in mid-air is worse than no leaves at all.
          reduced: reduceMotion
        }
      });

      // Full-screen is a STYLE change on a stage that is always in the tree, never a
      // different tree shape. Moving the canvas div between two parents would make
      // React unmount and remount it, and that is a full WebGL teardown and rebuild
      // every time the student toggles.
      function setFull(next) {
        upd('viewerFull', next);
        setImmersiveBodyClass(next);
        // The shell resizes off the window `resize` event and has no ResizeObserver on
        // its node, so a purely CSS size change is invisible to it and the canvas keeps
        // its old aspect until something else happens to fire one. Twice, because the
        // first can land before React has committed the new layout.
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 60);
          setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 280);
          // Re-frame AFTER the renderer has taken the new size: the stage goes from a
          // 420px box to the whole viewport, and the aspect that framing depends on
          // changes with it. Entering full screen on a mature oak with the small-box
          // distance is exactly the crop this replaced.
          setTimeout(function () { try { TREE3D.frame(true); } catch (e) {} }, 320);
        }
        srSay(next
          ? __alloT('stem.treelab.full_on', 'Full screen view. Press Escape to leave.')
          : __alloT('stem.treelab.full_off', 'Left full screen view.'));
      }

      // A read-out chip for the full-screen HUD. Painted on its own solid surface
      // rather than straight onto the sky: the scene behind it runs from near-white
      // cloud to near-black winter, so text alone has no contrast it can rely on.
      // Same T tokens as every other control, so high contrast and dark mode come for
      // free instead of being a hardcoded strip nobody re-checks.
      function hudChip(key, label, strong, accentHex) {
        return h('span', {
          key: 'hud-' + key,
          style: {
            display: 'inline-flex', alignItems: 'center',
            padding: strong ? '5px 11px' : '4px 9px',
            borderRadius: 999,
            background: T.card,
            border: '1px solid ' + (accentHex || T.border),
            color: accentHex || T.text,
            fontSize: strong ? 13 : 11.5,
            fontWeight: strong ? 800 : 700,
            lineHeight: 1.25,
            whiteSpace: 'nowrap'
          }
        }, label);
      }

      // ── What the student CONTROLS, opposite what the tree IS. ──
      //
      // Full screen had the whole causal loop cut in half: you could watch a tree, and
      // trigger a drought, but the three conditions the tool is actually about were on
      // the page behind the stage. So the one lesson — change a condition, watch which
      // factor becomes the limit, watch the tree answer — could not be run in the view
      // where the tree is actually legible.
      //
      // Laid out as the mirror of the HUD: left is what the tree IS, right is what you
      // can change. The limiting factor appears on BOTH, because it is the hinge
      // between them.
      //
      // The slider keys are prefixed. `slider()` builds its DOM id from the key, the
      // page's own Conditions card stays mounted behind the stage, and two elements
      // sharing an id break every label/htmlFor association on the screen.
      function fullConditionsPanel() {
        var lim = live.limiting || {};
        var limLabel = experimentFactorLabel(lim.id);
        return h('div', {
          key: 'conds',
          role: 'group',
          'aria-label': __alloT('stem.treelab.conditions', 'Conditions'),
          'data-tree-fullconds': 'true',
          style: {
            position: 'absolute', top: 12, right: 14, zIndex: 3,
            width: 250, maxWidth: 'calc(100% - 28px)',
            maxHeight: 'calc(100% - 24px)', overflowY: 'auto',
            padding: '10px 12px 6px', borderRadius: 12,
            background: T.card, border: '1px solid ' + T.border
          }
        }, [
          h('div', {
            key: 'hd',
            style: { fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 8 }
          }, __alloT('stem.treelab.conditions', 'Conditions')),
          slider('fs-light', __alloT('stem.treelab.light', 'Light'), envCfg.light, 0, 1, 0.05,
            function (v) { upd('light', v); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked),
          slider('fs-water', __alloT('stem.treelab.soil_water', 'Soil water'), envCfg.soilWater, 0, 1, 0.05,
            function (v) { upd('soilWater', v); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked),
          atLeast(band, 'g68')
            ? slider('fs-co2', CO2, envCfg.co2ppm, 180, 900, 10,
              function (v) { upd('co2ppm', v); }, function (v) { return v + ' ppm'; }, experimentLocked)
            : null,
          // The reason, not just the verdict. Under drought the CO2 term genuinely IS
          // the smallest number, and reporting that alone sends a student off to add
          // CO2 — which this tool exists to teach is useless while the stomata are
          // shut. Same attribution the Chemistry view uses; not re-derived here.
          h('div', {
            key: 'why',
            style: {
              marginTop: 4, paddingTop: 8, borderTop: '1px dashed ' + T.border,
              fontSize: 11.5, lineHeight: 1.5, color: T.text
            }
          }, lim.viaStomata
            ? __alloT('stem.treelab.full_why_stomata',
              'Water is the limit. ' + CO2 + ' is running lower, but only because water stress has closed the stomata that let it in.')
            : __alloT('stem.treelab.full_why_' + (lim.id || 'none'),
              limLabel + ' is the limit right now. Raise it and the rate moves; raise anything else and it will not.'))
        ]);
      }

      function viewerPanel() {
        var status = d.viewerStatus || 'idle';
        var full = !!d.viewerFull;
        var viewerLimit = experimentFactorLabel(live.limiting && live.limiting.id);
        var sceneCondition = !tree.alive
          ? ' The tree is dead and its bare frame remains visible.'
          : (treeVisual.severeWaterStress
            ? ' Its leaves are visibly wilted by water stress.'
            : (treeVisual.waterStress > 0.28 ? ' Its foliage shows mild water stress.' : ''));
        if (tree.alive && treeVisual.chronicDeficit) {
          sceneCondition += ' Its canopy is thinned by a chronic carbon deficit.';
        }
        var sceneAlt = 'Three-dimensional ' + season + ' view of ' + sp.name +
          ', age ' + tree.age + ' years, ' + round(tree.heightM, 1) +
          ' metres tall, with ' + cloneCount + ' clonal stems.' + sceneCondition +
          ' Current limiting factor: ' + viewerLimit + '.';
        var anatomyParts = [
          { id: 'crown', icon: '🍃', label: __alloT('stem.treelab.part_leaves', 'Leaves') },
          { id: 'trunk', icon: '🪵', label: __alloT('stem.treelab.part_trunk', 'Trunk') },
          { id: 'roots', icon: '〰', label: __alloT('stem.treelab.part_roots', 'Roots') },
          { id: 'clones', icon: '🌱', label: __alloT('stem.treelab.part_clones', 'Clones') }
        ];
        var stageStyle = full
          ? {
            // The STEAM Lab modal root carries a backdrop-filter, which makes it the
            // containing block for fixed descendants — but it is itself `fixed inset-0`,
            // so this still resolves to the whole viewport.
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120,
            display: 'flex', flexDirection: 'column',
            background: isContrast ? T.bg : (isDark ? '#020617' : '#0f172a'), padding: 0
          }
          : { position: 'relative' };
        return card([
          h('div', { key: 'hd', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 } }, [
            h('div', { key: 'a', style: { fontWeight: 700, color: T.text, fontSize: 14 } },
              sp.emoji + ' ' + sp.name + ' · ' + __alloT('stem.treelab.age', 'age') + ' ' + tree.age),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim } },
              round(tree.heightM, 1) + ' m tall · ' + round(tree.dbhCm, 1) + ' cm across'),
            h('div', { key: 'lim', style: { padding: '4px 8px', borderRadius: 999, background: T.cardAlt, border: '1px solid ' + T.accent, fontSize: 10, fontWeight: 800, color: T.text } },
              __alloT('stem.treelab.limiting_now_short', 'Limiting now: ') + viewerLimit)
          ]),
          h('div', {
            key: 'stage', style: stageStyle,
            // Escape leaves full screen. Bound to the STAGE rather than to window: a
            // window key listener from a tool outranks the host's own handling and
            // keeps firing after the student has moved on to a different tool.
            onKeyDown: full ? function (e) {
              if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); setFull(false); }
            } : undefined
          }, [
            h('div', {
              key: 'canvas', ref: TREE3D.attach,
              role: 'img',
              'aria-label': sceneAlt,
              style: full
                ? { flex: '1 1 auto', minHeight: 0, width: '100%', background: isContrast ? T.bg : (isDark ? '#020617' : '#e2e8f0') }
                : {
                  // A tree is a TALL subject. At 320 the box came out 842x320 (2.6:1) and
                  // the shell's 42-degree VERTICAL field of view cropped the crown off the
                  // top of every mature tree.
                  width: '100%', height: 420, borderRadius: 10, overflow: 'hidden',
                  background: isDark ? '#020617' : '#e2e8f0', border: '1px solid ' + T.border
                }
            }),
            // ── Full-screen read-out, over the scene rather than beside it. ──
            //
            // Going full screen used to hide the very numbers the picture is a picture
            // OF: age, height, and what is currently limiting growth all live in the
            // page header, which full screen covers. A student watching a tree grow
            // could not see the age it was growing to. It sits over the sky, which is
            // the one part of the frame that never carries the subject.
            full ? h('div', {
              key: 'hud',
              // The page's own header carries the same figures and stays mounted behind
              // the stage, so "the age chip" is ambiguous without a handle.
              'data-tree-fullhud': 'true',
              style: {
                position: 'absolute', top: 12, left: 14, zIndex: 3,
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
                pointerEvents: 'none', maxWidth: 'calc(100% - 28px)'
              }
            }, [
              hudChip('sp', sp.emoji + ' ' + __alloT('stem.treelab.species_' + sp.id, sp.name), true),
              hudChip('age', __alloT('stem.treelab.age', 'age') + ' ' + tree.age + ' yr'),
              hudChip('ht', round(tree.heightM, 1) + ' m'),
              hudChip('dbh', round(tree.dbhCm, 1) + ' cm'),
              // Named with its CAUSE where they differ. "Limiting now: CO2" is true
              // during a drought and still the wrong thing to tell a student, because
              // the stomata are shut and adding CO2 changes nothing.
              tree.alive
                ? hudChip('lim', __alloT('stem.treelab.limiting_now_short', 'Limiting now: ') + viewerLimit +
                  (live.limiting && live.limiting.viaStomata
                    ? ' ' + __alloT('stem.treelab.via_stomata_short', '(stomata closed)') : ''),
                  false, T.accent)
                : hudChip('dead', __alloT('stem.treelab.dead_chip', 'This tree has died'), false, T.bad),
              inDrought ? hudChip('dry', '☀️ ' + __alloT('stem.treelab.drought_chip', 'Drought'), false, T.warn) : null,
              playing ? hudChip('run', '▶ ' + speed.label, false, tone('#22c55e')) : null
            ]) : null,
            full ? fullConditionsPanel() : null,
            h('div', {
              key: 'ctl',
              // The page's own playback controls stay mounted behind the stage, so
              // "the Play button" is ambiguous without this. Named so a test can say
              // which one it means rather than relying on document order.
              'data-tree-fullbar': full ? 'true' : undefined,
              role: full ? 'toolbar' : undefined,
              'aria-label': full ? __alloT('stem.treelab.full_toolbar', 'Full screen tree controls') : undefined,
              style: full
                ? {
                  flex: '0 0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                  // The SAME surface the buttons are drawn for. A first version made
                  // this a navy strip regardless of theme, and the one ghost button in
                  // the row — which is transparent and inherits T.text — became dark
                  // navy on dark navy. Every control here is themed, so the bar under
                  // them has to be too.
                  padding: '8px 12px 2px', background: T.card,
                  borderTop: '1px solid ' + T.border
                }
                : { marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }
            }, [
              btn('fs', full
                ? '⤡ ' + __alloT('stem.treelab.exit_full', 'Exit full screen')
                : '⤢ ' + __alloT('stem.treelab.go_full', 'Full screen'),
                function () { setFull(!full); },
                { small: true, pressed: full, ariaLabel: full
                  ? __alloT('stem.treelab.exit_full', 'Exit full screen')
                  : __alloT('stem.treelab.go_full', 'Full screen') }),
              // ── Running the simulation, from inside full screen. ──
              //
              // Full screen used to be look-only: orbit, zoom and pick. Every control
              // that CHANGES anything — the clock that grows the tree, the drought that
              // is the tool's central causal chain — was on the page behind it, so
              // watching a tree grow at full size meant leaving full size to press
              // play. These are the two that alter the simulation; the sliders stay on
              // the page, where their numbers are.
              full ? h('span', {
                key: 'runsep', 'aria-hidden': 'true',
                style: { display: 'inline-block', width: 1, height: 22, background: T.border, margin: '0 8px 6px' }
              }) : null,
              full ? btn('fplay', (playing ? '⏸ ' : '▶ ') + (playing
                ? __alloT('stem.treelab.pause', 'Pause')
                : __alloT('stem.treelab.play', 'Play')), togglePlay,
                { small: true, pressed: playing, disabled: !tree.alive || experimentActive }) : null,
              full ? SPEEDS.map(function (option) {
                return btn('fsp-' + option.id, option.label, function () {
                  updMulti({ speed: option.id });
                  srSay('Speed set to ' + option.label + '. ' + option.hint);
                }, { small: true, pressed: speed.id === option.id, disabled: experimentActive });
              }) : null,
              full ? btn('fdry', inDrought
                ? '💧 ' + __alloT('stem.treelab.end_drought', 'End drought')
                : '☀️ ' + __alloT('stem.treelab.start_drought', 'Drought'),
                function () { if (inDrought) endDrought(); else sendDrought(5); },
                { small: true, pressed: inDrought, disabled: !tree.alive || experimentActive }) : null,
              full ? h('span', {
                key: 'viewsep', 'aria-hidden': 'true',
                style: { display: 'inline-block', width: 1, height: 22, background: T.border, margin: '0 8px 6px' }
              }) : null,
              btn('l', '◀', function () { TREE3D.nudge(-0.25, 0); }, { small: true, ariaLabel: __alloT('stem.treelab.rotate_left', 'Rotate view left') }),
              btn('r', '▶', function () { TREE3D.nudge(0.25, 0); }, { small: true, ariaLabel: __alloT('stem.treelab.rotate_right', 'Rotate view right') }),
              btn('u', '▲', function () { TREE3D.nudge(0, -0.12); }, { small: true, ariaLabel: __alloT('stem.treelab.tilt_up', 'Tilt view up') }),
              btn('dn', '▼', function () { TREE3D.nudge(0, 0.12); }, { small: true, ariaLabel: __alloT('stem.treelab.tilt_down', 'Tilt view down') }),
              btn('zi', '+', function () { TREE3D.zoom(-0.6); }, { small: true, ariaLabel: __alloT('stem.treelab.zoom_in', 'Zoom in') }),
              btn('zo', '−', function () { TREE3D.zoom(0.6); }, { small: true, ariaLabel: __alloT('stem.treelab.zoom_out', 'Zoom out') }),
              btn('rs', __alloT('stem.treelab.reset_view', 'Reset view'), function () { TREE3D.reset(); }, { small: true, tone: 'ghost' }),
              h('span', {
                key: 'anatomy', role: 'group', 'aria-label': __alloT('stem.treelab.anatomy_controls', 'Tree anatomy'),
                'data-tree-anatomy': 'true', style: { display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center' }
              }, anatomyParts.map(function (part) {
                var selected = sceneSelection === part.id;
                var disabled = (part.id === 'clones' && cloneCount <= 0) ||
                  (part.id === 'crown' && !crownSelectable);
                return btn('part-' + part.id, part.icon + ' ' + part.label, function () {
                  var nextPart = selected ? null : part.id;
                  upd('selectedPart', nextPart);
                  srSay(nextPart
                    ? part.label + ' selected in the three-dimensional view.'
                    : 'Anatomy selection cleared.');
                }, {
                  small: true, pressed: selected, disabled: disabled,
                  ariaLabel: __alloT('stem.treelab.inspect_part', 'Inspect ') + part.label
                });
              })),
              h('span', {
                key: 'root-note', style: { fontSize: 10, color: T.dim, margin: '0 8px 6px 2px' }
              }, __alloT('stem.treelab.root_schematic', 'Roots shown as a schematic soil cutaway')),
              // Full screen is exactly where flipping between seasons pays off, so the
              // control comes with it rather than being left behind on the page below.
              // Emoji only for width; the accessible name carries the season.
              // Emoji-only was a width saving that cost the meaning: four unlabelled
              // icons at the end of a long bar are unreadable, and a student cannot
              // guess that a green sprout means spring rather than "grow". The name is
              // back, and the accessible name still carries it for the icon-blind case.
              full ? SEASONS.map(function (s3) {
                return btn('fsea-' + s3.id, s3.emoji + ' ' + __alloT('stem.treelab.season_' + s3.id, s3.label), function () {
                  upd('season', s3.id);
                  srSay(s3.label + '. ' + seasonNote(s3.id));
                }, {
                  small: true, pressed: season === s3.id,
                  disabled: playing && speed.seasonal,
                  ariaLabel: __alloT('stem.treelab.season_' + s3.id, s3.label)
                });
              }) : null,
              // Pushed to the far right rather than trailing the buttons: as the bar
              // grew it kept being the thing that wrapped onto a line of its own, which
              // reads as a stray caption under the controls rather than a hint about
              // them. marginLeft:auto keeps it on the row and hard right.
              full ? h('span', {
                key: 'hint',
                style: {
                  fontSize: 11, color: T.dim, marginLeft: 'auto', marginBottom: 6,
                  paddingLeft: 12, whiteSpace: 'nowrap'
                }
              }, __alloT('stem.treelab.full_hint', 'Drag to orbit · Escape to leave')) : null
            ])
          ]),
          status === 'failed' ? h('div', { key: 'fb', style: { fontSize: 12, color: T.warn, marginTop: 8, lineHeight: 1.5 } },
            __alloT('stem.treelab.threed_failed', 'The 3D engine could not load, which school network filters sometimes cause. Every number and control on this page still works.')) : null,
          full ? null : seasonRow()
        ]);
      }

      // A conifer and a broadleaf have genuinely different seasons, and that difference
      // is the lesson the Check view already asks about, so the note is keyed on both.
      function seasonNote(id) {
        var kind = sp.leafType === 'needle' ? 'needle' : 'broad';
        var table = SEASON_NOTE[id] || SEASON_NOTE.summer;
        return __alloT('stem.treelab.season_note_' + id + '_' + kind, table[kind]);
      }

      // ── Season. The scene has always been able to draw four of them; until now the
      //    only way to SEE one was to run the clock at its slowest speed and catch the
      //    right half-second, which is no way to compare anything.
      //
      //    While the seasonal speed is running, playback owns the season — so the row
      //    becomes a read-out rather than pretending to be a control that does nothing.
      function seasonRow() {
        var driven = playing && speed.seasonal;
        var note = seasonNote(season);
        return h('div', { key: 'seasonrow', style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + T.border } }, [
          h('div', {
            key: 'lbl', id: 'treelab-season-label',
            style: { fontSize: 12, color: T.dim, marginBottom: 6 }
          }, driven
            ? __alloT('stem.treelab.season_driven', 'Season (set by playback)')
            : __alloT('stem.treelab.season_pick', 'Season')),
          h('div', {
            key: 'btns', role: 'group', 'aria-labelledby': 'treelab-season-label',
            style: { display: 'flex', flexWrap: 'wrap' }
          }, SEASONS.map(function (s2) {
            return btn('sea-' + s2.id, s2.emoji + ' ' + __alloT('stem.treelab.season_' + s2.id, s2.label), function () {
              upd('season', s2.id);
              srSay(s2.label + '. ' + seasonNote(s2.id));
            }, { small: true, pressed: season === s2.id, disabled: driven });
          })),
          h('div', { key: 'note', style: { fontSize: 12, color: T.text, lineHeight: 1.55, marginTop: 4 } }, note),
          // The tool's whole credibility rests on never letting a picture stand in for a
          // number it did not compute. simulateYear has no seasonal term.
          h('div', { key: 'hon', style: { fontSize: 11, color: T.dim, lineHeight: 1.5, marginTop: 6 } },
            __alloT('stem.treelab.season_honest',
              'The carbon budget on this page is a whole YEAR. Changing the season changes what you are looking at and what is described here, not a figure the model has recalculated.'))
        ]);
      }

      // ── Views ──
      function viewGrow() {
        var lim = live.limiting;
        var limName = { light: 'Light', co2: CO2, water: 'Water', temperature: 'Temperature' }[lim.id] || lim.id;
        var kids = [];
        var scene = viewerPanel();

        pushKeyed(kids, experimentPanel(), 'grow-experiment');
        pushKeyed(kids, playbackPanel(), 'grow-playback');

        pushKeyed(kids, card([
          heading(__alloT('stem.treelab.this_year', 'This year’s carbon budget'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.budget_sub_g68', 'Gross photosynthesis minus maintenance respiration is what is left to grow with. Everything below is spent out of that surplus.')
              : __alloT('stem.treelab.budget_sub_k2', 'Sugar made, minus sugar used just to stay alive. What is left is what the tree can grow with.')),
          h('div', { key: 'nums', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginBottom: 10 } }, [
            statTile('made', atLeast(band, 'g68') ? 'Gross photosynthesis' : 'Sugar made', round(live.gross, 2) + ' kg C', T.good),
            statTile('spent', atLeast(band, 'g68')
              ? __alloT('stem.treelab.tile_resp', 'Maintenance respiration')
              : __alloT('stem.treelab.tile_resp_k2', 'Sugar used to stay alive'), round(liveResp, 2) + ' kg C', T.warn),
            statTile('net', atLeast(band, 'g68') ? 'Net carbon' : 'Left to grow with', round(liveNet, 2) + ' kg C', liveNet >= 0 ? T.accent : T.bad)
          ]),
          h('div', {
            key: 'lim',
            style: {
              padding: 10, borderRadius: 8, background: T.cardAlt,
              border: '1px solid ' + T.border, borderLeft: '4px solid ' + T.accent, fontSize: 13, color: T.text, lineHeight: 1.55
            }
          }, [
            h('strong', { key: 'a' }, __alloT('stem.treelab.limiting_now', 'Limiting right now: ') + limName),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 4 } },
              atLeast(band, 'g912')
                ? __alloT('stem.treelab.limit_note_g912', 'The rate follows the smallest term. Raising any other input changes nothing until this one stops being the smallest.')
                : (atLeast(band, 'g35')
                  ? __alloT('stem.treelab.limit_note_g35', 'This is the one running short. Adding more of anything else will not help until you fix this one.')
                  : __alloT('stem.treelab.limit_note_k2', 'This is what the tree needs more of.'))),
            // Drought makes the CO2 term the smallest NUMBER, but water is the cause:
            // the stomata that admit CO2 are shut. Saying "CO2" here would send a
            // student off to add CO2, which this tool teaches is useless.
            lim.viaStomata ? h('div', { key: 'c', style: { fontSize: 12, color: T.warn, marginTop: 6, lineHeight: 1.5 } },
              __alloT('stem.treelab.via_stomata',
                'Strictly, ' + CO2 + ' is the number running lowest — but only because water stress has closed the stomata that let ' + CO2 + ' in. Water is the cause. Adding ' + CO2 + ' here would change almost nothing.')) : null
          ]),
          inDrought ? h('div', { key: 'dr', style: { marginTop: 8, padding: 8, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.warn, fontSize: 12, color: T.text, lineHeight: 1.5 } },
            '☀️ ' + __alloT('stem.treelab.drought_banner', 'Drought year. The tree has closed its stomata to save water, so it is taking in very little carbon.')) : null,
          liveNet < 0 ? h('div', { key: 'warn', style: { marginTop: 8, fontSize: 12, color: T.bad, lineHeight: 1.5 } },
            __alloT('stem.treelab.negative_year', 'The tree is spending more than it makes and is living off reserves. A few years of this is survivable. Many are not.')) : null,
          modelNote(__alloT('stem.treelab.model_note',
            'Qualitative teaching model, not a forest growth model or a measurement. The shapes are real (saturating light response, a smallest-factor gate, respiration that scales with living tissue) and the magnitudes are the right order for a temperate tree, but no figure here should be quoted as data.'))
        ]), 'grow-budget');

        pushKeyed(kids, card([
          heading(__alloT('stem.treelab.conditions', 'Conditions'),
            __alloT('stem.treelab.conditions_sub', 'Change one thing at a time and watch which factor takes over as the limit.')),
          slider('light', __alloT('stem.treelab.light', 'Light reaching the leaves'), envCfg.light, 0, 1, 0.05,
            function (v) { upd('light', v); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked),
          slider('water', __alloT('stem.treelab.soil_water', 'Soil water'), envCfg.soilWater, 0, 1, 0.05,
            function (v) { upd('soilWater', v); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked),
          slider('temp', __alloT('stem.treelab.temperature', 'Temperature'), envCfg.tempC, -5, 45, 1,
            function (v) { upd('tempC', v); }, function (v) { return v + ' ' + DEG + 'C'; }, experimentLocked),
          atLeast(band, 'g68') ? slider('co2', CO2 + ' concentration', envCfg.co2ppm, 180, 900, 10,
            function (v) { upd('co2ppm', v); }, function (v) { return v + ' ppm'; }, experimentLocked) : null,
          h('div', { key: 'drought', style: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed ' + T.border } }, [
            h('div', { key: 'lbl', style: { fontSize: 12, color: T.dim, marginBottom: 6, lineHeight: 1.5 } },
              inDrought
                ? __alloT('stem.treelab.drought_on', 'A drought is running. Soil water is a third of what you set, the stomata are closing, and the ring this year will show it.')
                : __alloT('stem.treelab.drought_off', 'Send a dry spell and watch what it does to the ring and to the limiting factor.')),
            inDrought
              ? btn('rain', '🌧 ' + __alloT('stem.treelab.end_drought', 'End the drought'), endDrought, { small: true, disabled: experimentLocked })
              : btn('dry3', '☀️ ' + __alloT('stem.treelab.drought_3', 'Drought for 3 years'), function () { sendDrought(3); }, { small: true, disabled: experimentLocked }),
            !inDrought && atLeast(band, 'g68')
              ? btn('dry8', '☀️ ' + __alloT('stem.treelab.drought_8', 'Drought for 8 years'), function () { sendDrought(8); }, { small: true, tone: 'ghost', disabled: experimentLocked })
              : null
          ]),
          atLeast(band, 'g68') ? h('div', { key: 'ap', style: { marginTop: 6 } },
            bar(__alloT('stem.treelab.stomata_open', 'Stomata open'), aperture, T.accent,
              aperture < 0.9
                ? __alloT('stem.treelab.stomata_closing', 'Closing to save water. Less ' + H2O + ' out, but also less ' + CO2 + ' in.')
                : __alloT('stem.treelab.stomata_open_note', 'Wide open. Carbon is coming in and water is going out through the same pores.'))) : null
        ]), 'grow-conditions');

        pushKeyed(kids, card([
          heading(__alloT('stem.treelab.spend_it', 'Where does the surplus go?'),
            __alloT('stem.treelab.spend_it_sub', 'The tree cannot do all of these at once. More wood means fewer seeds this year.')),
          allocSlider('leaf', __alloT('stem.treelab.leaves', 'Leaves'), '#22c55e'),
          allocSlider('root', __alloT('stem.treelab.roots', 'Roots'), '#a16207'),
          allocSlider('wood', __alloT('stem.treelab.wood', 'Wood (height and rings)'), '#f59e0b'),
          allocSlider('repro', __alloT('stem.treelab.reproduction', 'Reproduction'), '#ec4899'),
          allocSlider('store', __alloT('stem.treelab.reserves', 'Stored reserves'), '#38bdf8'),
          h('div', { key: 'run', style: { marginTop: 10, display: 'flex', flexWrap: 'wrap' } }, [
            btn('y1', __alloT('stem.treelab.plus_1', '+1 year'), function () { stepYears(1); }, { disabled: !tree.alive || experimentActive }),
            btn('y10', __alloT('stem.treelab.plus_10', '+10 years'), function () { stepYears(10); }, { disabled: !tree.alive || experimentActive }),
            btn('y50', __alloT('stem.treelab.plus_50', '+50 years'), function () { stepYears(50); }, { disabled: !tree.alive || experimentActive }),
            btn('rst', __alloT('stem.treelab.new_seedling', 'New seedling'), function () { resetTree(); }, { tone: 'ghost' })
          ]),
          !tree.alive ? postMortem() : null
        ]), 'grow-spend');

        pushKeyed(kids, trialComparisonPanel(), 'grow-trial-comparison');
        if (tree.rings.length > 0) pushKeyed(kids, ringPanel(), 'grow-rings');
        return h('div', { key: 'workbench', className: 'allo-tree-workbench' }, [
          h('div', { key: 'scene', className: 'allo-tree-workbench-scene' },
            h('div', { key: 'sticky', className: 'allo-tree-workbench-sticky' }, scene)),
          h('div', { key: 'controls', className: 'allo-tree-workbench-controls' }, kids)
        ]);
      }

      // ── Post-mortem. A tree dying is the most informative thing that happens in this
      //    tool and it used to produce one sentence. Two deaths that look identical on
      //    screen have opposite lessons: reaching the end of a lifespan is not a
      //    failure and there is nothing to fix, while starving is a budget the student
      //    set and can set differently. So the panel names which one it was, shows the
      //    life it actually had, and only offers advice when advice makes sense.
      function postMortem() {
        var starved = tree.causeOfDeath !== 'senescence';
        var stressRings = tree.rings.filter(function (r) { return r && r.stress; }).length;
        var seeds = (d.spreadTotals && d.spreadTotals.diverse) || 0;
        var clonalKids = (d.spreadTotals && d.spreadTotals.clonal) || 0;
        function factRow(k, labelTxt, valueTxt) {
          return h('div', { key: k, style: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontSize: 12 } }, [
            h('span', { key: 'a', style: { color: T.dim } }, labelTxt),
            h('span', { key: 'b', style: { color: T.text, fontWeight: 700, textAlign: 'right' } }, valueTxt)
          ]);
        }
        return h('div', {
          key: 'dead', role: 'group', 'aria-label': __alloT('stem.treelab.pm_group', 'What happened to this tree'),
          style: {
            marginTop: 10, padding: 12, borderRadius: 8, background: T.cardAlt,
            border: '1px solid ' + T.border, borderLeft: '4px solid ' + (starved ? T.bad : T.dim),
            color: T.text, fontSize: 13, lineHeight: 1.55
          }
        }, [
          h('div', { key: 'h', style: { fontWeight: 700, marginBottom: 6 } },
            (starved ? '💀 ' : '🍂 ') + (starved
              ? __alloT('stem.treelab.pm_starved_h', 'It starved at ' + tree.age + ' years')
              : __alloT('stem.treelab.pm_old_h', 'It died of old age at ' + tree.age + ' years'))),
          h('p', { key: 'p', style: { margin: '0 0 8px' } }, starved
            ? __alloT('stem.treelab.pm_starved_p',
              'It spent more carbon than it made for ' + tree.deficitYears + ' years running and ran its reserves down to nothing. A few bad years are survivable; a run of them is not.')
            : (tree.age > (sp.maxAgeYears || 0)
              // Claim what the NUMBERS support, not what the flag implies. Reading
              // "it passed the typical maximum age for a white oak (400 years)" off a
              // 71-year-old tree is the tool stating a falsehood, and stored state can
              // always be older than the code that wrote it.
              ? __alloT('stem.treelab.pm_old_p',
                'Nothing went wrong here. It passed the typical maximum age for a ' + sp.name.toLowerCase() + ' (' + sp.maxAgeYears + ' years) with its budget still in credit. This is the ending a tree is aiming for.')
              : __alloT('stem.treelab.pm_old_early_p',
                'Nothing went wrong here. Its life ended with the carbon budget still in credit rather than by starving. A ' + sp.name.toLowerCase() + ' typically lives up to about ' + sp.maxAgeYears + ' years.'))),
          h('div', { key: 'facts', style: { padding: '6px 0', borderTop: '1px dashed ' + T.border, borderBottom: '1px dashed ' + T.border, marginBottom: 8 } }, [
            factRow('ht', __alloT('stem.treelab.pm_height', 'Height reached'), round(tree.heightM, 1) + ' m'),
            factRow('db', __alloT('stem.treelab.pm_dbh', 'Trunk across'), round(tree.dbhCm, 1) + ' cm'),
            factRow('rg', __alloT('stem.treelab.pm_rings', 'Rings laid'),
              tree.rings.length + (stressRings
                ? ' (' + stressRings + ' ' + __alloT('stem.treelab.pm_stressed', 'stressed') + ')'
                : '')),
            factRow('kd', __alloT('stem.treelab.pm_kids', 'Descendants established'),
              (seeds + clonalKids) === 0
                ? __alloT('stem.treelab.pm_none', 'none')
                : (seeds + ' ' + __alloT('stem.treelab.pm_from_seed', 'from seed') + ' · ' + clonalKids + ' ' + __alloT('stem.treelab.pm_clonal', 'clonal')))
          ]),
          // The genet outliving the individual stem IS the clonal lesson, so it is worth
          // saying out loud at exactly the moment the stem has died.
          clonalKids > 0 ? h('p', { key: 'genet', style: { margin: '0 0 8px', fontSize: 12 } },
            __alloT('stem.treelab.pm_genet',
              'The clonal stems share this tree’s root system and its genes, so in the sense that matters to a botanist this individual is not finished. That is how an aspen clone can outlive every stem in it by thousands of years.')) : null,
          starved ? h('div', { key: 'fix', style: { fontSize: 12, color: T.dim, lineHeight: 1.55 } }, [
            h('strong', { key: 'a', style: { color: T.text } }, __alloT('stem.treelab.pm_try', 'To get further next time: ')),
            __alloT('stem.treelab.pm_try_body',
              'raise whatever the limiting-factor card kept naming, or spend less. Reproduction and stored reserves both come out of the same surplus as leaves and roots, and leaves are the only line on that list that earns any of it back.')
          ]) : null,
          h('div', { key: 'again', style: { marginTop: 10 } },
            btn('pm-new', __alloT('stem.treelab.new_seedling', 'New seedling'), function () { resetTree(); }, { small: true }))
        ]);
      }

      // Playback. Step buttons jump; a clock lets a student WATCH, which is the only
      // way the slow parts of the story (a canopy closing, rings narrowing, a stand of
      // clones appearing) read as processes rather than as before-and-after numbers.
      function playbackPanel() {
        var seasonLabel = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }[season] || 'Summer';
        return card([
          heading(__alloT('stem.treelab.playback', 'Run the clock'),
            atLeast(band, 'g35')
              ? __alloT('stem.treelab.playback_sub', 'Different parts of a tree run on wildly different clocks. Seasons take months, one ring takes a year, closing a canopy takes decades.')
              : __alloT('stem.treelab.playback_sub_k2', 'Press play and watch the tree grow.')),
          h('div', { key: 'row', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 } }, [
            btn('play', (playing ? '⏸ ' : '▶ ') + (playing
              ? __alloT('stem.treelab.pause', 'Pause')
              : __alloT('stem.treelab.play', 'Play')), togglePlay, { pressed: playing, disabled: !tree.alive || experimentActive }),
            h('span', { key: 'gap', style: { display: 'inline-block', width: 10 } }),
            SPEEDS.map(function (option) {
              return btn('sp-' + option.id, option.label, function () {
                updMulti({ speed: option.id });
                srSay('Speed set to ' + option.label + '. ' + option.hint);
              }, { small: true, pressed: speed.id === option.id, disabled: experimentActive });
            })
          ]),
          h('div', { key: 'read', style: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 } }, [
            statTile('age', __alloT('stem.treelab.age_label', 'Age'), tree.age + ' yr', T.accent),
            statTile('ht', __alloT('stem.treelab.height_label', 'Height'), round(tree.heightM, 1) + ' m', tone('#22c55e')),
            speed.seasonal
              ? statTile('sea', __alloT('stem.treelab.season_label', 'Season'), seasonLabel, tone('#f59e0b'))
              : statTile('rings', __alloT('stem.treelab.rings_laid', 'Rings laid'), String(tree.rings.length), tone('#a16207'))
          ]),
          h('div', { key: 'hint', style: { fontSize: 11, color: T.dim, marginTop: 6, lineHeight: 1.5 } }, speed.hint),
          !tree.alive ? h('div', { key: 'dead', style: { fontSize: 12, color: T.bad, marginTop: 6, lineHeight: 1.5 } },
            __alloT('stem.treelab.clock_stopped', 'The clock stopped when the tree died. Start a new seedling to run it again.')) : null
        ]);
      }

      function experimentFactorLabel(id) {
        return {
          light: __alloT('stem.treelab.light', 'Light'),
          water: __alloT('stem.treelab.water', 'Water'),
          temperature: __alloT('stem.treelab.temperature', 'Temperature'),
          co2: CO2
        }[id] || __alloT('stem.treelab.not_selected', 'Not selected');
      }

      function experimentOutcomeLabel(id) {
        return {
          thrive: __alloT('stem.treelab.outcome_thrive', 'Grow well'),
          struggle: __alloT('stem.treelab.outcome_struggle', 'Struggle'),
          die: __alloT('stem.treelab.outcome_die', 'Die')
        }[id] || __alloT('stem.treelab.not_selected', 'Not selected');
      }

      function experimentPanel() {
        var phase = experiment.phase;
        var stepIndex = phase === 'predict' ? 0 : (phase === 'ready' ? 1 : (phase === 'explain' ? 2 : -1));
        var canLock = !!experiment.prediction.limiter && !!experiment.prediction.outcome;
        var result = experiment.result && experiment.result.summary;
        var predictionMatched = result &&
          experiment.prediction.limiter === result.dominantLimiter &&
          experiment.prediction.outcome === result.observedOutcome;
        var children = [
          heading(__alloT('stem.treelab.investigation_title', 'Investigation studio'),
            __alloT('stem.treelab.investigation_sub', 'Freeze a starting tree, predict what will happen, run a controlled trial, and explain the evidence.')),
          h('div', { key: 'steps', 'aria-label': __alloT('stem.treelab.investigation_steps', 'Investigation steps'), style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 7, marginBottom: 13 } }, [
            ['1', __alloT('stem.treelab.step_predict', 'Predict')],
            ['2', __alloT('stem.treelab.step_run', 'Run')],
            ['3', __alloT('stem.treelab.step_explain', 'Explain')]
          ].map(function (item, i) {
            var active = i === stepIndex;
            var done = stepIndex > i;
            return h('div', { key: item[0], style: { padding: '7px 8px', borderRadius: 9, textAlign: 'center', border: '1px solid ' + (active || done ? T.accent : T.border), background: active ? T.accent : (done ? T.cardAlt : 'transparent'), color: active ? T.onAccent : T.text, fontSize: 11, fontWeight: 800 } },
              (done ? '✓ ' : item[0] + '. ') + item[1]);
          }))
        ];

        if (phase === 'idle') {
          children.push(h('div', { key: 'idle', style: { padding: 12, borderRadius: 11, background: T.cardAlt, border: '1px solid ' + T.border } }, [
            h('p', { key: 'p', style: { margin: '0 0 10px', fontSize: 12, color: T.text, lineHeight: 1.55 } },
              __alloT('stem.treelab.investigation_intro', 'Start from the tree you have now. During prediction you can change the conditions and carbon allocation before locking the trial.')),
            h('label', { key: 'l', htmlFor: 'treelab-experiment-years', style: { display: 'block', fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 4 } },
              __alloT('stem.treelab.trial_length', 'Trial length')),
            h('select', { key: 's', id: 'treelab-experiment-years', value: experiment.duration,
              onChange: function (e) { upd('experiment', Object.assign({}, experiment, { duration: parseInt(e.target.value, 10) })); },
              style: { width: '100%', padding: '8px 10px', borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, marginBottom: 10 }
            }, [1, 10, 25, 50, 100].map(function (n) {
              return h('option', { key: n, value: n }, n + ' ' + __alloT('stem.treelab.years', 'years'));
            })),
            btn('begin-investigation', '🔬 ' + __alloT('stem.treelab.begin_investigation', 'Start investigation'), beginExperiment)
          ]));
        }

        if (phase === 'predict') {
          children.push(h('fieldset', { key: 'predict', style: { margin: 0, padding: 12, borderRadius: 11, border: '1px solid ' + T.border, background: T.cardAlt } }, [
            h('legend', { key: 'leg', style: { padding: '0 6px', fontSize: 12, fontWeight: 800, color: T.text } },
              __alloT('stem.treelab.make_prediction', 'Make your prediction')),
            h('p', { key: 'hint', style: { margin: '0 0 10px', fontSize: 11, color: T.dim, lineHeight: 1.5 } },
              __alloT('stem.treelab.predict_hint', 'Set the Conditions and allocation below first. Then predict the dominant limit and the overall outcome.')),
            h('label', { key: 'll', htmlFor: 'treelab-predict-limit', style: { display: 'block', fontSize: 11, color: T.dim, marginBottom: 4 } },
              __alloT('stem.treelab.predict_limit', 'Which factor will limit growth most often?')),
            h('select', { key: 'ls', id: 'treelab-predict-limit', value: experiment.prediction.limiter || '',
              onChange: function (e) { updatePrediction('limiter', e.target.value || null); },
              style: { width: '100%', padding: '8px 10px', borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, marginBottom: 9 }
            }, [
              h('option', { key: 'blank', value: '' }, __alloT('stem.treelab.choose_factor', 'Choose a factor')),
              h('option', { key: 'light', value: 'light' }, experimentFactorLabel('light')),
              h('option', { key: 'water', value: 'water' }, experimentFactorLabel('water')),
              h('option', { key: 'temperature', value: 'temperature' }, experimentFactorLabel('temperature')),
              atLeast(band, 'g68') ? h('option', { key: 'co2', value: 'co2' }, experimentFactorLabel('co2')) : null
            ]),
            h('label', { key: 'ol', htmlFor: 'treelab-predict-outcome', style: { display: 'block', fontSize: 11, color: T.dim, marginBottom: 4 } },
              __alloT('stem.treelab.predict_outcome', 'What will happen to the tree?')),
            h('select', { key: 'os', id: 'treelab-predict-outcome', value: experiment.prediction.outcome || '',
              onChange: function (e) { updatePrediction('outcome', e.target.value || null); },
              style: { width: '100%', padding: '8px 10px', borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, marginBottom: 9 }
            }, [
              h('option', { key: 'blank', value: '' }, __alloT('stem.treelab.choose_outcome', 'Choose an outcome')),
              h('option', { key: 'thrive', value: 'thrive' }, experimentOutcomeLabel('thrive')),
              h('option', { key: 'struggle', value: 'struggle' }, experimentOutcomeLabel('struggle')),
              h('option', { key: 'die', value: 'die' }, experimentOutcomeLabel('die'))
            ]),
            h('label', { key: 'rl', htmlFor: 'treelab-predict-reason', style: { display: 'block', fontSize: 11, color: T.dim, marginBottom: 4 } },
              __alloT('stem.treelab.predict_reason', 'Why do you think so? (optional)')),
            h('textarea', { key: 'r', id: 'treelab-predict-reason', value: experiment.prediction.reason,
              onChange: function (e) { updatePrediction('reason', e.target.value); }, rows: 2,
              style: { width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 9, borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, font: 'inherit', fontSize: 12, marginBottom: 9 }
            }),
            h('div', { key: 'buttons' }, [
              btn('lock-prediction', '🔒 ' + __alloT('stem.treelab.lock_prediction', 'Lock prediction'), lockPrediction, { disabled: !canLock }),
              btn('cancel-prediction', __alloT('stem.treelab.cancel', 'Cancel'), finishExperiment, { tone: 'ghost' })
            ])
          ]));
        }
        if (phase === 'ready') {
          children.push(h('div', { key: 'ready', style: { padding: 12, borderRadius: 11, background: T.cardAlt, border: '1px solid ' + T.accent } }, [
            h('div', { key: 'h', style: { fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 7 } },
              __alloT('stem.treelab.ready_title', 'Prediction locked — ready to run')),
            h('div', { key: 'pred', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 7, marginBottom: 9 } }, [
              statTile('pl', __alloT('stem.treelab.predicted_limit', 'Predicted limit'), experimentFactorLabel(experiment.prediction.limiter), T.accent),
              statTile('po', __alloT('stem.treelab.predicted_outcome', 'Predicted outcome'), experimentOutcomeLabel(experiment.prediction.outcome), T.warn),
              statTile('py', __alloT('stem.treelab.trial_length', 'Trial length'), experiment.duration + ' ' + __alloT('stem.treelab.years', 'years'), tone('#38bdf8'))
            ]),
            h('p', { key: 'frozen', style: { margin: '0 0 9px', fontSize: 11, color: T.dim, lineHeight: 1.5 } },
              __alloT('stem.treelab.conditions_frozen', 'The treatment is frozen. Run uses the saved starting tree even if the live tree changes later.')),
            h('div', { key: 'buttons' }, [
              btn('run-investigation', '▶ ' + __alloT('stem.treelab.run_trial', 'Run trial'), runLockedExperiment),
              btn('edit-prediction', __alloT('stem.treelab.edit_prediction', 'Edit prediction'), editPrediction, { tone: 'ghost' }),
              btn('cancel-ready', __alloT('stem.treelab.cancel', 'Cancel'), finishExperiment, { tone: 'ghost' })
            ])
          ]));
        }

        if (phase === 'explain' && result) {
          children.push(h('div', { key: 'result', role: 'status', 'aria-live': 'polite', style: { padding: 12, borderRadius: 11, background: T.cardAlt, border: '1px solid ' + (predictionMatched ? T.good : T.warn) } }, [
            h('div', { key: 'h', style: { fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 4 } },
              predictionMatched
                ? '✓ ' + __alloT('stem.treelab.prediction_matched', 'The evidence matched your prediction')
                : '↺ ' + __alloT('stem.treelab.prediction_surprised', 'The evidence changed the story')),
            h('p', { key: 'p', style: { margin: '0 0 9px', fontSize: 11, color: T.dim, lineHeight: 1.5 } },
              __alloT('stem.treelab.observed_summary', 'Compare predicted and observed results. A mismatch is useful evidence, not a wrong experiment.')),
            h('div', { key: 'grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(125px,1fr))', gap: 7, marginBottom: 10 } }, [
              statTile('ol', __alloT('stem.treelab.observed_limit', 'Observed limit'), experimentFactorLabel(result.dominantLimiter), T.accent),
              statTile('oo', __alloT('stem.treelab.observed_outcome', 'Observed outcome'), experimentOutcomeLabel(result.observedOutcome), result.observedOutcome === 'die' ? T.bad : T.good),
              statTile('oh', __alloT('stem.treelab.height_change', 'Height change'), (result.heightDelta >= 0 ? '+' : '') + round(result.heightDelta, 2) + ' m', tone('#22c55e')),
              statTile('on', __alloT('stem.treelab.mean_net', 'Mean net carbon'), round(result.meanNet, 2) + ' kg C', result.meanNet >= 0 ? T.good : T.bad)
            ]),
            h('label', { key: 'el', htmlFor: 'treelab-explanation', style: { display: 'block', fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 4 } },
              __alloT('stem.treelab.explanation_prompt', 'Explain what caused the result. Use the limiting factor and carbon evidence.')),
            h('textarea', { key: 'e', id: 'treelab-explanation', value: experiment.explanation, rows: 3,
              onChange: function (e) { upd('experiment', Object.assign({}, experiment, { explanation: e.target.value })); },
              style: { width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 9, borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, font: 'inherit', fontSize: 12, marginBottom: 9 }
            }),
            h('div', { key: 'buttons', style: { display: 'flex', flexWrap: 'wrap' } }, [
              btn('save-a', 'A · ' + __alloT('stem.treelab.save_trial', 'Save trial'), function () { saveExperimentTrial('A'); }),
              btn('save-b', 'B · ' + __alloT('stem.treelab.save_trial', 'Save trial'), function () { saveExperimentTrial('B'); }),
              btn('new-investigation', __alloT('stem.treelab.new_investigation', 'New investigation'), beginExperiment, { tone: 'ghost' }),
              btn('close-investigation', __alloT('stem.treelab.close', 'Close'), finishExperiment, { tone: 'ghost' })
            ])
          ]));
        }

        return card(children, { borderTop: '4px solid ' + T.accent });
      }
      function signedMetric(v, unit) {
        return (v > 0 ? '+' : '') + round(v, 2) + (unit ? ' ' + unit : '');
      }

      function trialSlot(slot, trial) {
        if (!trial) {
          return h('div', { key: slot, style: { padding: 12, minHeight: 92, borderRadius: 11, border: '1px dashed ' + T.border, background: T.cardAlt } }, [
            h('div', { key: 'h', style: { fontSize: 14, fontWeight: 900, color: T.text } },
              __alloT('stem.treelab.trial', 'Trial') + ' ' + slot),
            h('div', { key: 'p', style: { fontSize: 11, color: T.dim, lineHeight: 1.5, marginTop: 5 } },
              __alloT('stem.treelab.empty_trial', 'Complete an investigation, then save its evidence here.'))
          ]);
        }
        var sum = trial.result.summary;
        var species = speciesById(trial.speciesId);
        return h('div', { key: slot, style: { padding: 12, minHeight: 92, borderRadius: 11, border: '1px solid ' + T.accent, background: T.cardAlt } }, [
          h('div', { key: 'top', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 } }, [
            h('div', { key: 'h', style: { fontSize: 14, fontWeight: 900, color: T.text } },
              __alloT('stem.treelab.trial', 'Trial') + ' ' + slot),
            h('div', { key: 's', style: { fontSize: 11, color: T.dim } }, species.emoji + ' ' + species.name)
          ]),
          h('div', { key: 'out', style: { fontSize: 12, color: T.text, marginTop: 6, fontWeight: 700 } },
            experimentOutcomeLabel(sum.observedOutcome) + ' · ' + experimentFactorLabel(sum.dominantLimiter)),
          h('div', { key: 'metrics', style: { fontSize: 11, color: T.dim, marginTop: 4, lineHeight: 1.45 } },
            signedMetric(sum.heightDelta, 'm') + ' · ' + signedMetric(sum.meanNet, 'kg C') + ' · ' + sum.yearsCompleted + ' ' + __alloT('stem.treelab.years', 'years')),
          btn('clear-' + slot, __alloT('stem.treelab.clear_trial', 'Clear trial'), function () {
            var next = { A: experimentTrials.A, B: experimentTrials.B };
            next[slot] = null;
            upd('experimentTrials', next);
          }, { small: true, tone: 'ghost' })
        ]);
      }

      function trialComparisonPanel() {
        var a = experimentTrials.A, b = experimentTrials.B;
        var kids = [
          heading(__alloT('stem.treelab.notebook_title', 'A/B lab notebook'),
            __alloT('stem.treelab.notebook_sub', 'Save two trials, then compare evidence from the same starting tree under different conditions.')),
          h('div', { key: 'slots', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 9, marginBottom: 10 } }, [
            trialSlot('A', a), trialSlot('B', b)
          ])
        ];
        if (a && !b) {
          kids.push(h('div', { key: 'prep', style: { padding: 10, borderRadius: 9, background: T.cardAlt, border: '1px solid ' + T.border } }, [
            h('div', { key: 'p', style: { fontSize: 11, color: T.dim, lineHeight: 1.5, marginBottom: 7 } },
              __alloT('stem.treelab.prepare_b_note', 'Restore Trial A’s exact starting tree, then change one condition to make a controlled Trial B.')),
            btn('prepare-b', __alloT('stem.treelab.prepare_b', 'Prepare Trial B from A'), prepareTrialBFromA, { small: true })
          ]));
        }
        if (a && b) {
          var controlled = a.speciesId === b.speciesId &&
            a.baseline.tree.age === b.baseline.tree.age &&
            Math.abs(a.baseline.tree.heightM - b.baseline.tree.heightM) < 0.001;
          var rows = [
            [__alloT('stem.treelab.height_change', 'Height change'), a.result.summary.heightDelta, b.result.summary.heightDelta, 'm'],
            [__alloT('stem.treelab.mean_net', 'Mean net carbon'), a.result.summary.meanNet, b.result.summary.meanNet, 'kg C'],
            [__alloT('stem.treelab.reserve_change', 'Reserve change'), a.result.summary.reservesDelta, b.result.summary.reservesDelta, 'kg C'],
            [__alloT('stem.treelab.mean_ring', 'Mean ring width'), a.result.summary.meanRingWidth, b.result.summary.meanRingWidth, 'mm'],
            [__alloT('stem.treelab.reproduction_change', 'Reproduction banked'), a.result.summary.reproductionDelta, b.result.summary.reproductionDelta, 'kg C']
          ];
          kids.push(h('div', { key: 'control', role: 'note', style: { padding: 9, borderRadius: 9, border: '1px solid ' + (controlled ? T.good : T.warn), background: T.cardAlt, color: T.text, fontSize: 11, lineHeight: 1.5, marginBottom: 9 } },
            controlled
              ? '✓ ' + __alloT('stem.treelab.controlled_pair', 'Controlled pair: both trials began with the same species, age and height.')
              : '⚠ ' + __alloT('stem.treelab.uncontrolled_pair', 'These trials began from different trees. Compare cautiously, or prepare Trial B from A.')));
          kids.push(h('div', { key: 'tablewrap', style: { overflowX: 'auto' } },
            h('table', { style: { width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 11, color: T.text } }, [
              h('caption', { key: 'cap', style: { textAlign: 'left', color: T.dim, paddingBottom: 6 } },
                __alloT('stem.treelab.compare_caption', 'Trial evidence; difference is Trial B minus Trial A.')),
              h('thead', { key: 'head' }, h('tr', {}, [
                h('th', { key: 'm', scope: 'col', style: { textAlign: 'left', padding: 7, borderBottom: '2px solid ' + T.border } }, __alloT('stem.treelab.metric', 'Metric')),
                h('th', { key: 'a', scope: 'col', style: { textAlign: 'right', padding: 7, borderBottom: '2px solid ' + T.border } }, 'A'),
                h('th', { key: 'b', scope: 'col', style: { textAlign: 'right', padding: 7, borderBottom: '2px solid ' + T.border } }, 'B'),
                h('th', { key: 'd', scope: 'col', style: { textAlign: 'right', padding: 7, borderBottom: '2px solid ' + T.border } }, __alloT('stem.treelab.difference', 'Difference'))
              ])),
              h('tbody', { key: 'body' }, rows.map(function (r, i) {
                return h('tr', { key: i }, [
                  h('th', { key: 'm', scope: 'row', style: { textAlign: 'left', fontWeight: 600, padding: 7, borderBottom: '1px solid ' + T.border } }, r[0]),
                  h('td', { key: 'a', style: { textAlign: 'right', padding: 7, borderBottom: '1px solid ' + T.border } }, signedMetric(r[1], r[3])),
                  h('td', { key: 'b', style: { textAlign: 'right', padding: 7, borderBottom: '1px solid ' + T.border } }, signedMetric(r[2], r[3])),
                  h('td', { key: 'd', style: { textAlign: 'right', padding: 7, borderBottom: '1px solid ' + T.border, fontWeight: 800 } }, signedMetric(r[2] - r[1], r[3]))
                ]);
              }))
            ])));
        }
        return card(kids);
      }
      function statTile(key, labelTxt, valueTxt, hex) {
        return h('div', {
          key: key,
          style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, borderTop: '3px solid ' + hex }
        }, [
          h('div', { key: 'l', style: { fontSize: 11, color: T.dim, marginBottom: 3, lineHeight: 1.35 } }, labelTxt),
          h('div', { key: 'v', style: { fontSize: 17, fontWeight: 700, color: T.text } }, valueTxt)
        ]);
      }

      // Decorative hues are meaningful in normal themes and actively harmful in high
      // contrast, where everything must resolve to the black/white/yellow ramp.
      function tone(hex) { return isContrast ? T.accent : hex; }

      function allocSlider(k, labelTxt, hex) {
        var pct = Math.round(alloc[k] * 100);
        var id = 'treelab-alloc-' + k;
        return h('div', { key: k, style: { marginBottom: 9 } }, [
          h('label', { key: 'l', htmlFor: id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 4 } }, [
            h('span', { key: 'a', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
              h('span', { key: 'sw', style: { width: 10, height: 10, borderRadius: 2, background: tone(hex), display: 'inline-block', border: isContrast ? '1px solid ' + T.text : 'none' } }),
              labelTxt
            ]),
            h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, pct + '%')
          ]),
          h('input', {
            key: 'i', id: id, type: 'range', min: 0, max: 100, step: 5, value: pct,
            disabled: experimentLocked,
            onChange: function (e) {
              var next = Object.assign({}, alloc);
              next[k] = parseFloat(e.target.value) / 100;
              upd('alloc', next);
            },
            style: { width: '100%', accentColor: tone(hex), opacity: experimentLocked ? 0.55 : 1 }
          })
        ]);
      }

      // Ring panel. Drawn as SVG rects with hex fills: an SVG presentation attribute
      // cannot resolve var(--token) any more than a canvas fillStyle can.
      // Colours match the factor bars on the Chemistry tab, so the same idea reads the
      // same way in both places.
      var LIMIT_HUE = FACTOR_HUES(isDark);
      function FACTOR_HUE(id) { return LIMIT_HUE[id] || '#94a3b8'; }
      var LIMIT_NAME = {
        light: __alloT('stem.treelab.light', 'Light'),
        co2: CO2,
        water: __alloT('stem.treelab.water', 'Water'),
        temperature: __alloT('stem.treelab.temperature', 'Temperature')
      };

      function limitBand() {
        var hist = (tree.history || []).slice(-60);
        if (!hist.length || !atLeast(band, 'g35')) return null;
        var W = 100, BH = 10;
        var bw = W / hist.length;
        var seen = {};
        var cells = hist.map(function (rec, i) {
          var id = rec && rec.limiting;
          if (id) seen[id] = true;
          return h('rect', {
            key: 'l' + i, x: i * bw, y: 0, width: Math.max(0.6, bw * 0.94), height: BH,
            fill: tone(LIMIT_HUE[id] || '#94a3b8')
          });
        });
        var legend = Object.keys(seen);
        return h('div', { key: 'limband', style: { marginTop: 8 } }, [
          h('div', { key: 'lbl', style: { fontSize: 11, color: T.dim, marginBottom: 3 } },
            __alloT('stem.treelab.limit_band', 'What was limiting, year by year')),
          h('svg', {
            key: 'svg', viewBox: '0 0 ' + W + ' ' + BH, preserveAspectRatio: 'none',
            style: { width: '100%', height: 14, borderRadius: 4, border: '1px solid ' + T.border },
            role: 'img',
            'aria-label': __alloT('stem.treelab.limit_band_alt', 'Limiting factor for each of the last ')
              + hist.length + __alloT('stem.treelab.limit_band_alt2', ' years. Most recent: ')
              + (LIMIT_NAME[hist[hist.length - 1].limiting] || '')
          }, cells),
          h('div', { key: 'key', style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 5 } },
            legend.map(function (id) {
              return h('span', { key: id, style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.dim } }, [
                h('span', { key: 's', style: { width: 9, height: 9, borderRadius: 2, background: tone(LIMIT_HUE[id] || '#94a3b8'), display: 'inline-block', border: isContrast ? '1px solid ' + T.text : 'none' } }),
                LIMIT_NAME[id] || id
              ]);
            }))
        ]);
      }

      function ringPanel() {
        var rings = tree.rings.slice(-60);
        var maxW = 0.4;
        for (var i = 0; i < rings.length; i++) if (rings[i].widthMm > maxW) maxW = rings[i].widthMm;
        var W = 100, H = 96;
        var bw = rings.length ? (W / rings.length) : W;
        var bars = rings.map(function (r, i) {
          var hgt = clamp((r.widthMm / maxW) * (H - 18), 1, H - 18);
          return h('rect', {
            key: 'r' + i, x: i * bw, y: (H - 14) - hgt, width: Math.max(0.6, bw * 0.82), height: hgt,
            fill: isContrast ? (r.stress ? '#ff6666' : '#ffff00') : (r.stress ? '#dc2626' : '#a16207')
          });
        });
        return card([
          heading(__alloT('stem.treelab.rings', 'Growth rings'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.rings_sub_g68', 'One bar per year, red where the tree ran a deficit. Rings usually narrow with age even in a healthy tree: the same volume of wood spread around a longer circumference is thinner.')
              : __alloT('stem.treelab.rings_sub_k2', 'One bar for each year. Taller means the tree grew a wider ring that year.')),
          h('svg', {
            key: 'svg', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none',
            style: { width: '100%', height: 120, background: T.cardAlt, borderRadius: 8, border: '1px solid ' + T.border },
            role: 'img',
            'aria-label': 'Ring width for the last ' + rings.length + ' years. Widest ring ' + round(maxW, 2) + ' millimetres.'
          }, bars.concat([
            h('line', { key: 'base', x1: 0, y1: H - 14, x2: W, y2: H - 14, stroke: T.border, strokeWidth: 0.5 })
          ])),
          limitBand(),
          h('div', { key: 'lg', style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.dim, marginTop: 4 } }, [
            h('span', { key: 'a' }, __alloT('stem.treelab.year', 'Year') + ' ' + (rings.length ? rings[0].year : 0)),
            h('span', { key: 'b' }, __alloT('stem.treelab.widest', 'Widest ') + round(maxW, 2) + ' mm'),
            h('span', { key: 'c' }, __alloT('stem.treelab.year', 'Year') + ' ' + (rings.length ? rings[rings.length - 1].year : 0))
          ])
        ]);
      }

      // ── Response curves ──────────────────────────────────────────────────────
      // The Chemistry view was tiles, bars and prose — no picture at all — for the one
      // idea in this tool that a picture settles instantly.
      //
      // What is plotted is NOT the isolated factor. It is the WHOLE RATE, swept over
      // one input with everything else held where the student left it, and every point
      // comes from calling grossPhotosynthesis itself rather than from a re-derivation
      // that could drift from it. That distinction is the entire lesson: when CO2 is
      // the smaller of the two supply terms, the light curve comes back FLAT, and
      // "raising any other input changes nothing until this one stops being the
      // smallest" stops being a sentence and becomes a shape.
      //
      // Four inputs on four different scales, so: small multiples sharing ONE y axis.
      // A second y axis would invent a relationship between ppm and degrees.
      var CURVES = [
        { id: 'light', label: __alloT('stem.treelab.light', 'Light'), min: 0, max: 1,
          at: liveEnv.light, fmt: function (v) { return Math.round(v * 100) + '%'; },
          set: function (e, v) { e.light = v; } },
        { id: 'co2', label: CO2, min: 180, max: 900,
          at: liveEnv.co2ppm, fmt: function (v) { return Math.round(v) + ' ppm'; },
          set: function (e, v) { e.co2ppm = v; } },
        { id: 'water', label: __alloT('stem.treelab.soil_water', 'Soil water'), min: 0, max: 1,
          at: liveEnv.soilWater, fmt: function (v) { return Math.round(v * 100) + '%'; },
          set: function (e, v) { e.soilWater = v; } },
        { id: 'temperature', label: __alloT('stem.treelab.temperature', 'Temperature'), min: -5, max: 45,
          at: liveEnv.tempC, fmt: function (v) { return Math.round(v) + DEG + 'C'; },
          set: function (e, v) { e.tempC = v; } }
      ];

      function sampleCurve(c) {
        var N = 40, pts = [];
        for (var i = 0; i <= N; i++) {
          var x = c.min + (c.max - c.min) * (i / N);
          var e = Object.assign({}, liveEnv);
          c.set(e, x);
          // Aperture is recomputed per sample, not carried over: sweeping soil water
          // while holding the stomata where they were would draw a tree that keeps
          // breathing through a drought.
          var ap = stomatalAperture(e.soilWater, sp.droughtTol, false);
          pts.push({ x: x, y: grossPhotosynthesis(sp, e, tree.leafArea, ap).gross });
        }
        return pts;
      }

      function curvePanel() {
        var series = CURVES.map(function (c) {
          var pts = sampleCurve(c);
          var peak = 0;
          pts.forEach(function (p) { if (p.y > peak) peak = p.y; });
          return { c: c, pts: pts, peak: peak };
        });
        // One shared y scale across all four panels, so a flat curve reads as flat
        // AGAINST the others rather than being silently rescaled to fill its own box.
        var yMax = 0;
        series.forEach(function (s2) { if (s2.peak > yMax) yMax = s2.peak; });
        if (yMax <= 0) yMax = 1;

        var W = 260, H = 140, PADL = 34, PADR = 10, PADT = 10, PADB = 26;
        var PW = W - PADL - PADR, PH = H - PADT - PADB;

        function panel(s2) {
          var c = s2.c;
          var limiting = live.limiting && live.limiting.id === c.id;
          var hue = tone(FACTOR_HUE(c.id));
          var sx = function (x) { return PADL + PW * ((x - c.min) / (c.max - c.min)); };
          var sy = function (y) { return PADT + PH * (1 - clamp(y / yMax, 0, 1)); };
          var line = s2.pts.map(function (p, i) {
            return (i ? 'L' : 'M') + round(sx(p.x), 1) + ' ' + round(sy(p.y), 1);
          }).join(' ');
          var area = line + ' L' + round(sx(c.max), 1) + ' ' + (PADT + PH) + ' L' + round(sx(c.min), 1) + ' ' + (PADT + PH) + ' Z';
          var atX = clamp(c.at, c.min, c.max);
          var here = { x: sx(atX), y: sy(live.gross) };

          return h('div', {
            key: c.id,
            style: {
              background: T.cardAlt, border: '1px solid ' + (limiting ? hue : T.border),
              borderRadius: 8, padding: 8
            }
          }, [
            h('div', { key: 'hd', style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } }, [
              // Identity comes from a swatch BESIDE the text, never by colouring the
              // text: these hues are chosen to read as marks, not as type.
              h('span', {
                key: 'sw', 'aria-hidden': 'true',
                style: { width: 10, height: 10, borderRadius: 2, background: hue, flex: '0 0 auto' }
              }),
              h('span', { key: 'l', style: { fontSize: 12, fontWeight: 700, color: T.text } }, c.label),
              limiting ? h('span', {
                key: 'b',
                style: {
                  marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: 0.2,
                  color: T.onAccent, background: T.accent, borderRadius: 4, padding: '1px 6px'
                }
              }, __alloT('stem.treelab.limiting_badge', 'LIMITING')) : null
            ]),
            h('svg', {
              key: 'svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img',
              'aria-label': __alloT('stem.treelab.curve_alt_' + c.id,
                c.label + ' response curve. At ' + c.fmt(atX) + ' the tree makes '
                + round(live.gross, 2) + ' kg C a year'
                + (limiting ? ', and this is the factor holding the rate down.'
                            : '. Raising this alone would not lift the rate, because something else is smaller.')),
              style: { width: '100%', height: 'auto', display: 'block' }
            }, [
              // Hairline, SOLID, one step off the surface. Dashed grid reads as a
              // threshold or a projection when it is only a ruler.
              h('g', { key: 'grid', stroke: T.border, strokeWidth: 1, fill: 'none' }, [
                h('line', { key: 'x', x1: PADL, y1: PADT + PH, x2: PADL + PW, y2: PADT + PH }),
                h('line', { key: 'y', x1: PADL, y1: PADT, x2: PADL, y2: PADT + PH })
              ]),
              h('path', { key: 'area', d: area, fill: hue, fillOpacity: 0.1, stroke: 'none' }),
              h('path', {
                key: 'line', d: line, fill: 'none', stroke: hue,
                strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round'
              }),
              // Where this tree is standing right now. Drag a condition slider on the
              // Grow view and it slides along the curve: that is the interaction, and
              // it beats a tooltip because it changes the tree as well as the readout.
              h('line', {
                key: 'drop', x1: here.x, y1: here.y, x2: here.x, y2: PADT + PH,
                stroke: hue, strokeWidth: 1, strokeOpacity: 0.45
              }),
              h('circle', {
                key: 'dot', cx: here.x, cy: here.y, r: 5,
                fill: hue, stroke: T.cardAlt, strokeWidth: 2
              }),
              h('text', {
                key: 'y1', x: PADL - 5, y: PADT + 4, textAnchor: 'end',
                style: { fontSize: '10px', fill: T.dim, fontVariantNumeric: 'tabular-nums' }
              }, round(yMax, 1)),
              h('text', {
                key: 'y0', x: PADL - 5, y: PADT + PH, textAnchor: 'end',
                style: { fontSize: '10px', fill: T.dim, fontVariantNumeric: 'tabular-nums' }
              }, '0'),
              h('text', {
                key: 'x0', x: PADL, y: H - 14, textAnchor: 'start',
                style: { fontSize: '10px', fill: T.dim }
              }, c.fmt(c.min)),
              h('text', {
                key: 'x1', x: PADL + PW, y: H - 14, textAnchor: 'end',
                style: { fontSize: '10px', fill: T.dim }
              }, c.fmt(c.max)),
              // ONE direct label, on the only point that matters. A number on every
              // sample would be noise nobody reads.
              h('text', {
                key: 'here',
                x: clamp(here.x, PADL + 2, PADL + PW - 2),
                y: H - 3,
                textAnchor: here.x > PADL + PW * 0.7 ? 'end' : (here.x < PADL + PW * 0.3 ? 'start' : 'middle'),
                style: { fontSize: '10px', fill: T.text, fontWeight: 700 }
              }, c.fmt(atX))
            ])
          ]);
        }

        return card([
          heading(__alloT('stem.treelab.curves_title', 'What happens if you change one thing'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.curves_sub_g68', 'Each panel sweeps ONE condition across its whole range and leaves the other three where you set them. Upward on every panel is gross photosynthesis in kg of carbon a year, on one shared scale. The dot is where this tree is standing, and a curve that has gone flat under the dot is telling you that more of that input buys nothing.')
              : __alloT('stem.treelab.curves_sub_k2', 'Each picture shows what happens if you change just one thing. Higher means more sugar made. The dot is where your tree is now.')),
          h('div', {
            key: 'grid',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }
          }, series.map(panel)),
          h('p', { key: 'read', style: { fontSize: 12, color: T.text, lineHeight: 1.55, marginTop: 10 } },
            live.limiting && live.limiting.viaStomata
              ? __alloT('stem.treelab.curves_read_stomata',
                'Look at the ' + CO2 + ' panel and the water panel together. ' + CO2 + ' is the smaller number, but the reason is that drought has closed the stomata that let it in — which is why the water panel is the one marked.')
              : __alloT('stem.treelab.curves_read',
                'The flat panels are the ones where this tree already has more than it can use. The marked one is where the next improvement would actually come from.')),
          modelNote(__alloT('stem.treelab.curves_note',
            'Every point on every curve is the model’s own annual figure for this tree, re-run with that one input changed — not a sketch of the shape. The shapes are the standard ones (a saturating light response, a saturating ' + CO2 + ' response, a temperature optimum), and the magnitudes are the right order for a temperate tree, but no figure here should be quoted as data.'))
        ]);
      }

      function viewChem() {
        var kids = [];
        if (!atLeast(band, 'g35')) {
          kids.push(card([
            heading('☀️ ' + __alloT('stem.treelab.how_trees_eat', 'How a tree feeds itself'),
              __alloT('stem.treelab.k2_sub', 'A tree does not eat food from the soil. It builds its own, out of air, water and sunlight.')),
            h('div', { key: 'flow', style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '10px 0' } }, [
              chip('sun', '☀️', 'Sunlight'), plus('p1'),
              chip('air', '💨', 'Air'), plus('p2'),
              chip('wat', '💧', 'Water'),
              h('div', { key: 'ar', style: { fontSize: 20, color: T.accent, margin: '0 4px' } }, ARROW),
              chip('sug', '🍯', 'Sugar'), plus('p3'), chip('oxy', '🫧', 'Air we breathe')
            ]),
            h('p', { key: 'p', style: { fontSize: 13, color: T.text, lineHeight: 1.6, marginTop: 6 } },
              __alloT('stem.treelab.k2_body', 'The tree makes sugar in its leaves and uses it to grow taller, grow roots, and make seeds. The wood in a tree trunk came mostly out of the air.'))
          ]));
          return kids;
        }

        // Picture first, then the same four numbers as labelled bars directly beneath
        // it. The bars are the chart's accessible twin, not a duplicate: nothing here
        // is reachable only by reading a shape.
        kids.push(curvePanel());

        kids.push(card([
          heading(__alloT('stem.treelab.what_limits', 'What is limiting the rate?'),
            atLeast(band, 'g912')
              ? __alloT('stem.treelab.limits_sub_g912', 'Four factors, and the rate follows the smallest of them. This is the question a living tree answers every hour, and its answer is recorded permanently in the rings.')
              : __alloT('stem.treelab.limits_sub_g68', 'Four things a tree needs. Whichever is shortest sets the speed, no matter how much of the others there is.')),
          bar(__alloT('stem.treelab.light', 'Light'), live.factors.light, tone(FACTOR_HUE('light'))),
          bar(CO2, live.factors.co2, tone(FACTOR_HUE('co2'))),
          bar(__alloT('stem.treelab.temperature', 'Temperature'), live.factors.temp, tone(FACTOR_HUE('temperature'))),
          bar(__alloT('stem.treelab.water', 'Water'), live.factors.water, tone(FACTOR_HUE('water'))),
          h('div', { key: 'note', style: { marginTop: 6, fontSize: 12, color: T.dim, lineHeight: 1.55 } },
            __alloT('stem.treelab.liebig',
              'This is why enriching ' + CO2 + ' does little for a tree that is short of water. A stoma pulled most of the way shut admits very little ' + CO2 + ' however much is outside, so the extra arrives as a large share of almost nothing.'))
        ]));

        if (atLeast(band, 'g68')) {
          kids.push(card([
            heading(__alloT('stem.treelab.the_trade', 'The trade the tree cannot avoid'),
              __alloT('stem.treelab.the_trade_sub', 'The pore that admits ' + CO2 + ' is the pore that loses ' + H2O + '. There is no setting that does only the good half.')),
            h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 } }, [
              // The same two quantities the curves and the bars above plot, in the same
              // view, so they carry the same two hues. Left on the old pair they were
              // the only place in Chemistry still showing CO2 and water as one blue.
              statTile('in', CO2 + ' entering', Math.round(aperture * 100) + '%', tone(FACTOR_HUE('co2'))),
              statTile('out', H2O + ' lost', fmtInt(Math.round(transpirationPerDay)) + ' L/day', tone(FACTOR_HUE('water')))
            ]),
            h('p', { key: 'p', style: { fontSize: 12, color: T.dim, marginTop: 8, lineHeight: 1.55 } },
              __alloT('stem.treelab.trade_body', 'A large tree can move well over 100 gallons of water in a day this way. Almost all of it is the unavoidable price of leaving the stomata open long enough to take carbon in.'))
          ]));
        }

        if (atLeast(band, 'g912')) {
          kids.push(card([
            heading(__alloT('stem.treelab.the_bill', 'The respiration bill'),
              __alloT('stem.treelab.the_bill_sub', 'The part students most often miss: a big tree does not only gain more, it SPENDS more, every hour, forever.')),
            h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 } }, [
              statTile('lm', 'Living leaf', round(tree.leafMass, 1) + ' kg C', tone('#22c55e')),
              statTile('rm', 'Fine root', round(tree.rootMass, 1) + ' kg C', tone('#a16207')),
              statTile('sm', 'Sapwood (living)', round(tree.sapwoodMass, 1) + ' kg C', tone('#f59e0b')),
              statTile('hm', 'Heartwood (dead, free)', round(tree.heartwoodMass, 1) + ' kg C', tone('#78716c'))
            ]),
            h('p', { key: 'p', style: { fontSize: 12, color: T.dim, marginTop: 8, lineHeight: 1.55 } },
              __alloT('stem.treelab.bill_body', 'Converting sapwood to heartwood is how a tree keeps getting bigger without its maintenance cost rising forever. Dead wood still holds the tree up and costs nothing to keep.')),
            h('div', { key: 'ho', style: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed ' + T.border } }, [
              h('div', { key: 't', style: { fontSize: 12, color: T.dim, marginBottom: 6, lineHeight: 1.5 } },
                __alloT('stem.treelab.handoff_intro', 'Two other labs own the neighbouring scales of this same reaction, and both go deeper than this one does. Chemical Balance has the equation and its energy cost; Cell Explorer opens on the organelles, where the chloroplast is:')),
              btn('hc', __alloT('stem.treelab.open_chembalance', 'Balance the equation in Chemical Balance →'),
                function () { handoff('chemBalance', 'Chemical Balance'); }, { small: true }),
              btn('hcell', __alloT('stem.treelab.open_cell', 'See the chloroplast in Cell Explorer →'),
                function () { handoff('cell', 'Cell Explorer'); }, { small: true })
            ])
          ]));
        }
        return kids;
      }

      function chip(key, icon, txt) {
        return h('div', { key: key, style: { textAlign: 'center', minWidth: 62 } }, [
          h('div', { key: 'i', style: { fontSize: 24 } }, icon),
          h('div', { key: 't', style: { fontSize: 11, color: T.dim, marginTop: 2 } }, txt)
        ]);
      }
      function plus(key) { return h('div', { key: key, style: { fontSize: 16, color: T.dim } }, '+'); }

      // Cross-tool handoff. Follows the Cell Atlas pattern: seed the target tool's own
      // slice of shared toolData, tag the source so the target can tell it arrived on a
      // journey, then navigate. This is why the deep chemistry is NOT duplicated here.
      // Seed ONLY keys the destination actually reads. The first version invented
      // requestedEquation / requestedOrganelle / requestedType — plausible names that
      // appear nowhere in either target, so the handoff navigated and then dropped the
      // student on the tool's default screen while the button implied otherwise. A
      // test now pins each key below against the destination's source.
      //
      //   chemBalance: subtool defaults to 'balance' and tierFilter to 'all', which is
      //     already where the photosynthesis equation is reachable, so there is nothing
      //     useful to seed. Navigate and leave it alone rather than invent a key.
      //   cell: mode defaults to 'observe'; the organelles live in 'interior'.
      function handoff(toolId, labelTxt) {
        ctx.setToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          if (toolId === 'cell') {
            next.cell = Object.assign({}, next.cell || {}, { mode: 'interior' });
          }
          return next;
        });
        try { if (ctx.setStemLabTab) ctx.setStemLabTab('explore'); } catch (e) {}
        try { if (ctx.setStemLabTool) ctx.setStemLabTool(toolId); } catch (e) {}
        srSay('Opening ' + labelTxt + '.');
        if (addToast) addToast('Opening ' + labelTxt, 'info');
      }

      // Where this year's sugar is actually going, straight from the student's own
      // allocation. In spring the phloem runs the other way: the tree spends stored
      // reserves building leaves BEFORE it has leaves to make sugar with, which is the
      // detail that makes "direction is not fixed" land.
      function sinkRows() {
        var springDraw = (season === 'spring');
        var rows = [
          ['leaf', __alloT('stem.treelab.leaves', 'Leaves'), alloc.leaf, '#22c55e'],
          ['root', __alloT('stem.treelab.roots', 'Roots'), alloc.root, '#a16207'],
          ['wood', __alloT('stem.treelab.wood', 'Wood (height and rings)'), alloc.wood, '#f59e0b'],
          ['repro', __alloT('stem.treelab.reproduction', 'Reproduction'), alloc.repro, '#ec4899'],
          ['store', __alloT('stem.treelab.reserves', 'Stored reserves'), alloc.store, '#38bdf8']
        ].filter(function (r) { return !(springDraw && r[0] === 'store'); });
        var surplus = Math.max(0, liveNet);
        if (surplus <= 0 && !springDraw) {
          return h('div', { key: 'deficit', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.bad, borderLeft: '4px solid ' + T.bad } }, [
            h('div', { key: 'a', style: { fontWeight: 700, color: T.text, fontSize: 13 } },
              __alloT('stem.treelab.no_surplus', 'Nothing to send out')),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 1.55 } },
              __alloT('stem.treelab.no_surplus_note', 'The tree is spending more than it makes, so there is no surplus to divide. The phloem is running the other way: stored sugar is being pulled back OUT of the roots and trunk to keep the living tissue alive. Sinks become the source.'))
          ]);
        }
        return h('div', { key: 'sinks' }, [
          h('div', { key: 'src', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '4px solid ' + (springDraw ? tone('#38bdf8') : tone('#22c55e')), marginBottom: 8 } }, [
            h('div', { key: 'a', style: { fontWeight: 700, color: T.text, fontSize: 13 } },
              springDraw
                ? __alloT('stem.treelab.source_spring', 'Source right now: stored reserves in the roots and trunk')
                : __alloT('stem.treelab.source_summer', 'Source right now: the leaves')),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 1.5 } },
              springDraw
                ? __alloT('stem.treelab.source_spring_note', 'The canopy is not built yet, so sugar runs UP from store to build it. The tree is spending last year to pay for this one.')
                : round(surplus, 2) + ' kg C ' + __alloT('stem.treelab.to_spend', 'to send out this year'))
          ]),
          h('div', { key: 'rows' }, rows.map(function (r) {
            var share = r[2];
            return h('div', { key: r[0], style: { marginBottom: 7 } }, [
              h('div', { key: 'l', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 3 } }, [
                h('span', { key: 'a', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
                  h('span', { key: 's', style: { width: 9, height: 9, borderRadius: 2, background: tone(r[3]), display: 'inline-block', border: isContrast ? '1px solid ' + T.text : 'none' } }),
                  (springDraw ? '↑ ' : '↓ ') + r[1]
                ]),
                h('span', { key: 'b', style: { fontWeight: 700, color: T.text } },
                  round(surplus * share, 2) + ' kg C')
              ]),
              h('div', { key: 't', style: { height: 8, background: T.cardAlt, borderRadius: 4, overflow: 'hidden', border: '1px solid ' + T.border } },
                h('div', { style: { height: '100%', width: Math.round(clamp(share, 0, 1) * 100) + '%', background: tone(r[3]) } }))
            ]);
          }))
        ]);
      }

      // Radii come from the tree's OWN masses and rings, so a young tree shows almost
      // all sapwood and an old one shows a wide dead core. Drawn as SVG with hex fills:
      // a presentation attribute cannot resolve var(--token) any more than a canvas can.
      function trunkSection() {
        var R = 78;                       // outer bark radius, viewBox units
        var live = Math.max(0.01, tree.sapwoodMass);
        var dead = Math.max(0, tree.heartwoodMass);
        // Areas are proportional to mass, so the radii go as the square root — a
        // linear split would make the heartwood look far bigger than it is.
        var heartFrac = Math.sqrt(dead / (dead + live));
        var barkW = 7, phloemW = 3.5, cambiumW = 2;
        var woodR = R - barkW - phloemW - cambiumW;
        var heartR = Math.max(0, woodR * heartFrac);

        var rings = (tree.rings || []).slice(-40);
        var ringEls = [];
        if (rings.length) {
          var total = 0;
          for (var i = 0; i < rings.length; i++) total += Math.max(0.05, rings[i].widthMm);
          var acc = 0;
          for (var j = rings.length - 1; j >= 0; j--) {
            acc += Math.max(0.05, rings[j].widthMm);
            // Across the WHOLE wood, not just the sapwood: heartwood is former rings, and
            // confining them to the living annulus squeezed forty years into a sliver.
            var rr = woodR * (acc / total);
            var stressed = rings[j].stress;
            ringEls.push(h('circle', {
              key: 'ring' + j, cx: 0, cy: 0, r: rr,
              fill: 'none',
              stroke: stressed ? (isContrast ? '#ff6666' : '#b91c1c') : (isContrast ? '#ffffff' : '#5a3b1c'),
              strokeWidth: stressed ? 1.8 : 0.6,
              opacity: stressed ? 1 : 0.75
            }));
          }
        }

        var layers = [
          ['heart', heartR, isContrast ? '#555555' : '#6b4b2a',
            __alloT('stem.treelab.xs_heart', 'Heartwood — dead, and free to carry')],
          ['sap', woodR, isContrast ? '#aaaaaa' : '#c89b62',
            __alloT('stem.treelab.xs_sap', 'Sapwood — living, carries water up')],
          ['cambium', woodR + cambiumW, tone('#4ade80'),
            __alloT('stem.treelab.xs_cambium', 'Cambium — the one living layer that makes new wood')],
          ['phloem', woodR + cambiumW + phloemW, tone('#f59e0b'),
            __alloT('stem.treelab.xs_phloem', 'Phloem — carries sugar, just inside the bark')],
          ['bark', R, isContrast ? '#ffffff' : '#4a3524',
            __alloT('stem.treelab.xs_bark', 'Bark — the outer protection')]
        ];

        return h('div', { key: 'xs' }, [
          h('div', { key: 'wrap', style: { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' } }, [
            h('svg', {
              key: 'svg', viewBox: '-84 -84 168 168',
              style: { width: 172, height: 172, flex: '0 0 auto', background: T.cardAlt, borderRadius: 10, border: '1px solid ' + T.border },
              role: 'img',
              'aria-label': __alloT('stem.treelab.xs_alt', 'Cross-section of the trunk. From the outside in: bark, phloem, cambium, sapwood, heartwood. ')
                + round(tree.dbhCm, 1) + ' cm across, '
                + (tree.rings || []).length + ' growth rings, '
                + round(tree.heartwoodMass, 1) + ' kg of carbon in dead heartwood.'
            },
              // Outermost first, so each inner layer paints over the one before it.
              layers.slice().reverse().map(function (L) {
                return h('circle', { key: L[0], cx: 0, cy: 0, r: L[1], fill: L[2] });
              }).concat(ringEls)),
            h('div', { key: 'key', style: { flex: '1 1 190px', minWidth: 170 } },
              layers.slice().reverse().map(function (L) {
                return h('div', { key: L[0], style: { display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5, fontSize: 11, color: T.dim, lineHeight: 1.45 } }, [
                  h('span', { key: 's', style: { width: 10, height: 10, borderRadius: 2, background: L[2], display: 'inline-block', flex: '0 0 auto', marginTop: 2, border: '1px solid ' + T.border } }),
                  h('span', { key: 't' }, L[3])
                ]);
              }))
          ]),
          rings.length ? h('p', { key: 'rn', style: { fontSize: 11, color: T.dim, lineHeight: 1.5, marginTop: 8 } },
            __alloT('stem.treelab.xs_rings_note', 'The rings are this tree’s own record, newest at the outside. Red rings are years it spent more than it made.')) : null
        ]);
      }

      function viewTransport() {
        var kids = [];
        var flowUp = Math.round(aperture * 100);
        kids.push(card([
          heading(__alloT('stem.treelab.two_pipes', 'Two separate plumbing systems'),
            __alloT('stem.treelab.two_pipes_sub', 'Water goes up one way. Sugar goes wherever it is needed by another. They run side by side and they are not the same tissue.')),
          h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 } }, [
            h('div', { key: 'x', style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '4px solid ' + tone('#38bdf8') } }, [
              h('div', { key: 'h', style: { fontWeight: 700, color: T.text, marginBottom: 4 } }, '↑ ' + (atLeast(band, 'g68') ? 'Xylem' : 'Water pipes')),
              h('div', { key: 'b', style: { fontSize: 12, color: T.dim, lineHeight: 1.55 } },
                atLeast(band, 'g912')
                  ? __alloT('stem.treelab.xylem_g912', 'Dead, hollow cells. Water is pulled up under tension by evaporation at the leaf surface, not pushed from below. The column is under negative pressure and an air bubble can break it.')
                  : (atLeast(band, 'g68')
                    ? __alloT('stem.treelab.xylem_g68', 'Dead hollow cells carrying water up from the roots. Evaporation at the leaves does the pulling.')
                    : __alloT('stem.treelab.xylem_k2', 'Carries water up from the roots to the leaves.'))),
              h('div', { key: 'm', style: { marginTop: 8 } }, bar(__alloT('stem.treelab.flow_now', 'Flow right now'), aperture, tone('#38bdf8'),
                fmtInt(Math.round(transpirationPerDay)) + ' ' + __alloT('stem.treelab.litres_day', 'litres a day') + ' · ' + flowUp + '%')),
              inDrought && atLeast(band, 'g912') ? h('div', { key: 'cav', style: { marginTop: 6, fontSize: 11, color: T.warn, lineHeight: 1.5 } },
                __alloT('stem.treelab.tension_note', 'Under drought the column is pulled harder against a drier soil. Push the tension far enough and an air bubble breaks the thread, and that segment of xylem never carries water again.')) : null
            ]),
            h('div', { key: 'p', style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '4px solid ' + tone('#f59e0b') } }, [
              h('div', { key: 'h', style: { fontWeight: 700, color: T.text, marginBottom: 4 } }, '↓ ' + (atLeast(band, 'g68') ? 'Phloem' : 'Sugar pipes')),
              h('div', { key: 'b', style: { fontSize: 12, color: T.dim, lineHeight: 1.55 } },
                atLeast(band, 'g912')
                  ? __alloT('stem.treelab.phloem_g912', 'Living cells moving sugar from any SOURCE to any SINK. Direction is not fixed: in autumn sugar runs down to the roots, and in early spring it runs back up to build leaves before there are leaves to make it.')
                  : (atLeast(band, 'g68')
                    ? __alloT('stem.treelab.phloem_g68', 'Living cells carrying sugar from where it is made to where it is spent. In spring the flow reverses and runs upward.')
                    : __alloT('stem.treelab.phloem_k2', 'Carries food from the leaves to the rest of the tree.')))
            ])
          ])
        ]));

        if (atLeast(band, 'g68')) {
          kids.push(card([
            heading(__alloT('stem.treelab.where_sugar', 'Where this year’s sugar is going'),
              __alloT('stem.treelab.where_sugar_sub', 'Straight from the allocation you set on the Grow tab. Phloem has no fixed direction: it runs from wherever sugar IS to wherever it is being spent.')),
            sinkRows()
          ]));

          kids.push(card([
            heading(__alloT('stem.treelab.xs_title', 'Inside the trunk'),
              atLeast(band, 'g68')
                ? __alloT('stem.treelab.xs_sub_g68', 'Cut across the trunk and the two systems are in different places: phloem in a thin band just under the bark, xylem filling the wood beneath it. The rings are this tree’s own.')
                : __alloT('stem.treelab.xs_sub_k2', 'A slice through the trunk. Each ring is one year of growing.')),
            trunkSection()
          ]));

          kids.push(card([
            heading(__alloT('stem.treelab.girdling', 'Why cutting a ring of bark kills a tree'),
              __alloT('stem.treelab.girdling_sub', 'A useful test of whether the two systems have really landed.')),
            h('p', { key: 'p', style: { fontSize: 13, color: T.text, lineHeight: 1.6 } },
              __alloT('stem.treelab.girdling_body',
                'Phloem sits just inside the bark; xylem is deeper in the wood. Remove a complete ring of bark and the leaves keep receiving water, so the tree looks fine for a whole season. But no sugar can reach the roots. The roots starve first, and only then does the top die.')),
            atLeast(band, 'g912') ? h('p', { key: 'p2', style: { fontSize: 12, color: T.dim, lineHeight: 1.55, marginTop: 8 } },
              __alloT('stem.treelab.girdling_adv',
                'This is also why the cambium matters so much: it is the single living layer between the two, and it is what a ground fire has to get through. A species with thick bark is buying insulation for that one layer.')) : null
          ]));
        }
        return kids;
      }

      function viewSpread() {
        var legal = STRATEGIES.filter(function (s) { return sp.modes.indexOf(s.id) >= 0; });
        var spend = d.spend || {};
        var budget = round(tree.seedsBanked, 2);
        var totalSpent = 0;
        Object.keys(spend).forEach(function (k) { totalSpent += spend[k] || 0; });
        var remaining = round(budget - totalSpent, 2);
        // Same class as the tree above: a half-written result object would throw on
        // `res.results.map` and take the entire view with it.
        var lastRaw = d.lastSpread;
        var last = (lastRaw && lastRaw.res && Array.isArray(lastRaw.res.results)) ? lastRaw : null;

        var kids = [];
        kids.push(card([
          heading('🌱 ' + __alloT('stem.treelab.spread', 'Making more trees'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.spread_sub_g68', 'Seeds recombine and travel, but almost none survive. Clonal routes nearly always take and cost little, but they produce genetic copies on a shared root system. Spend the reproduction carbon you banked and see what a decade throws at you.')
              : __alloT('stem.treelab.spread_sub_k2', 'Trees make new trees in more than one way. Some grow from seeds. Some grow straight out of the parent tree. Try spending your seed budget different ways.')),
          h('div', { key: 'bud', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginBottom: 10 } }, [
            statTile('b', __alloT('stem.treelab.banked', 'Carbon banked'), budget + ' kg C', T.accent),
            statTile('s', __alloT('stem.treelab.committed', 'Committed'), round(totalSpent, 2) + ' kg C', T.warn),
            statTile('r', __alloT('stem.treelab.left', 'Left'), remaining + ' kg C', remaining >= 0 ? T.good : T.bad)
          ]),
          budget <= 0 ? h('div', { key: 'nb', style: { fontSize: 13, color: T.warn, lineHeight: 1.55 } },
            __alloT('stem.treelab.no_budget', 'No reproduction carbon banked yet. Go back to Grow, put some of the surplus into Reproduction, and run some years.')) : null,
          modelNote(__alloT('stem.treelab.spread_model_note',
            'The take rates below are tuned so that one decade is playable, not measured. What is real is the ORDER: a clonal shoot establishes far more reliably than a seed, and a wind-carried seed in the wild succeeds far more rarely than the figure here suggests. Compare the strategies against each other, not against the world.'))
        ]));

        legal.forEach(function (s) {
          var val = spend[s.id] || 0;
          var id = 'treelab-spend-' + s.id;
          kids.push(card([
            h('div', { key: 'hd', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } }, [
              h('div', { key: 'a', style: { flex: '1 1 200px' } }, [
                h('div', { key: 'n', style: { fontWeight: 700, color: T.text, fontSize: 14 } },
                  s.icon + ' ' + __alloT('stem.treelab.strategy_' + s.id, s.name)),
                h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 1.55 } },
                  __alloT('stem.treelab.strategy_blurb_' + s.id, s.blurb))
              ]),
              h('div', { key: 'c', style: { textAlign: 'right', fontSize: 11, color: T.dim, minWidth: 96 } }, [
                h('div', { key: '1' }, __alloT('stem.treelab.cost', 'Cost ') + s.cost + ' kg C'),
                h('div', { key: '2' }, __alloT('stem.treelab.takes', 'Takes ') + Math.round(s.establish * 100) + '%'),
                h('div', { key: '3', style: { color: s.diversity ? T.good : T.warn } },
                  s.diversity ? __alloT('stem.treelab.new_mix', 'New genetic mix') : __alloT('stem.treelab.exact_copy', 'Exact copy'))
              ])
            ]),
            h('div', { key: 'sl', style: { marginTop: 8 } }, [
              h('label', { key: 'l', htmlFor: id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 4 } }, [
                h('span', { key: 'a' }, __alloT('stem.treelab.commit', 'Commit carbon')),
                h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, round(val, 2) + ' kg (' + Math.floor(val / s.cost) + ' attempts)')
              ]),
              h('input', {
                key: 'i', id: id, type: 'range', min: 0, max: Math.max(1, budget), step: 0.1, value: Math.min(val, Math.max(1, budget)),
                onChange: function (e) {
                  var next = Object.assign({}, spend);
                  next[s.id] = parseFloat(e.target.value);
                  upd('spend', next);
                },
                style: { width: '100%', accentColor: T.accent }
              })
            ])
          ]));
        });

        kids.push(card([
          h('div', { key: 'run', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center' } }, [
            btn('go', __alloT('stem.treelab.run_decade', 'Run the decade'), function () { runSpread(spend, remaining); },
              { disabled: totalSpent <= 0 || remaining < 0 }),
            btn('clr', __alloT('stem.treelab.clear', 'Clear'), function () { upd('spend', {}); }, { tone: 'ghost' })
          ]),
          remaining < 0 ? h('div', { key: 'over', style: { fontSize: 12, color: T.bad, marginTop: 6 } },
            __alloT('stem.treelab.overcommitted', 'You have committed more carbon than the tree banked. Pull something back.')) : null
        ]));

        if (last) {
          var mapCard = spreadMap(last);
          if (mapCard) kids.push(mapCard);
          kids.push(spreadResult(last));
        }
        var rec = spreadRecord();
        if (rec) kids.push(rec);
        return kids;
      }

      function runSpread(rawSpend, remaining) {
        if (remaining < 0) { sfxBad(); return; }
        // Defence in depth behind the reset in resetTree: never resolve a strategy
        // this species does not actually use, whatever is sitting in stored state.
        var spend = {};
        Object.keys(rawSpend || {}).forEach(function (k) {
          if (sp.modes.indexOf(k) >= 0 && rawSpend[k] > 0) spend[k] = rawSpend[k];
        });
        if (!Object.keys(spend).length) { sfxBad(); return; }
        var rounds = (d.spreadRounds || 0);
        // Seeded from the round number so a class can replay the same decade and
        // compare two strategies against identical weather.
        var rng = lcg(1337 + rounds * 7919);
        var evPool = EVENTS.filter(function (e) { return e.id !== 'calm'; });
        var ev = rng() < 0.28 ? eventById('calm') : evPool[Math.floor(rng() * evPool.length)];
        var res = resolveSpread(spend, ev, rng);

        var totals = Object.assign({ diverse: 0, clonal: 0 }, d.spreadTotals || {});
        totals.diverse += res.diverseCount;
        totals.clonal += res.clonalCount;
        var log = (Array.isArray(d.spreadLog) ? d.spreadLog : []).concat([{
          event: ev.id, diverse: res.diverseCount, clonal: res.clonalCount
        }]).slice(-12);

        updMulti({
          lastSpread: { event: ev.id, res: res },
          spreadRounds: rounds + 1,
          spreadTotals: totals,
          spreadLog: log,
          bestDiverse: Math.max(d.bestDiverse || 0, res.diverseCount),
          bestClonal: Math.max(d.bestClonal || 0, res.clonalCount),
          spend: {},
          tree: Object.assign({}, tree, { seedsBanked: Math.max(0, tree.seedsBanked - (function () { var t = 0; Object.keys(spend).forEach(function (k) { t += spend[k] || 0; }); return t; })()) })
        });
        if (res.established > 0) { sfxGrow(); xp(6); } else { sfxBad(); }
        srSay(ev.name + '. ' + res.established + ' descendant' + (res.established === 1 ? '' : 's') + ' established.');
        if (addToast) addToast(ev.icon + ' ' + ev.name + ': ' + res.established + ' established', res.established > 0 ? 'success' : 'error');
      }

      function spreadRecord() {
        var log = Array.isArray(d.spreadLog) ? d.spreadLog : [];
        if (!log.length) return null;
        var totals = d.spreadTotals || { diverse: 0, clonal: 0 };
        var all = totals.diverse + totals.clonal;

        // Say what the student's OWN rounds show, rather than restating the lesson.
        // With one round there is nothing to compare, so it says so.
        var verdict;
        if (log.length < 2) {
          verdict = __alloT('stem.treelab.record_one_round', 'One decade is an anecdote. Run another against a different event before drawing a conclusion.');
        } else if (totals.clonal > totals.diverse * 2) {
          verdict = __alloT('stem.treelab.record_clonal', 'Your descendants are overwhelmingly clonal: reliable, close to home, and every one of them carrying the same susceptibility. One root pathogen reaches all of them.');
        } else if (totals.diverse > totals.clonal * 2) {
          verdict = __alloT('stem.treelab.record_seed', 'Your descendants are overwhelmingly from seed: genetically varied and spread wide, and you paid for that in how few of them took.');
        } else {
          verdict = __alloT('stem.treelab.record_mixed', 'You are hedging — copies close by that almost always take, plus seedlings further out that mostly do not. Most real trees settle here too.');
        }

        return card([
          heading(__alloT('stem.treelab.record', 'Your record so far'),
            __alloT('stem.treelab.record_sub', 'Every decade you have run with this tree.')),
          h('div', { key: 'tot', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginBottom: 10 } }, [
            statTile('r', __alloT('stem.treelab.decades', 'Decades run'), String(log.length), T.accent),
            statTile('d', __alloT('stem.treelab.from_seed', 'From seed'), String(totals.diverse), tone('#ec4899')),
            statTile('c', __alloT('stem.treelab.clonal', 'Clonal copies'), String(totals.clonal), tone('#86efac')),
            atLeast(band, 'g68')
              ? statTile('x', __alloT('stem.treelab.diversity', 'Genetic diversity'),
                (all > 0 ? Math.round((totals.diverse / all) * 100) : 0) + '%', T.accent)
              : null
          ].filter(Boolean)),
          h('div', { key: 'rows' }, log.map(function (r, i) {
            var e = eventById(r.event);
            var took = r.diverse + r.clonal;
            return h('div', {
              key: 'lr' + i,
              style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid ' + T.border, fontSize: 12 }
            }, [
              h('span', { key: 'a', style: { color: T.dim } },
                (i + 1) + '. ' + e.icon + ' ' + __alloT('stem.treelab.event_' + e.id, e.name)),
              h('span', { key: 'b', style: { color: took > 0 ? T.text : T.dim, fontWeight: 600 } },
                took + ' ' + __alloT('stem.treelab.established_short', 'established')
                + (took > 0 ? '  (' + r.diverse + ' / ' + r.clonal + ')' : ''))
            ]);
          })),
          h('p', { key: 'v', style: { fontSize: 12, color: T.dim, lineHeight: 1.55, marginTop: 10 } }, verdict)
        ]);
      }

      // ── The forest floor ────────────────────────────────────────────────────
      // Every strategy carries a `distance`, and until now that number was printed
      // nowhere at all: the entire spatial half of the seed-versus-clone trade was
      // invisible. Read as a table, "72% establish, distance 0.18" and "5% establish,
      // distance 0.9" are two pairs of numbers. Drawn, they are a tight ring of stems
      // crowding the parent versus a scatter of failures across the whole clearing with
      // two survivors at the edge, and the trade explains itself.
      //
      // The map NEVER re-rolls anything. resolveSpread has already decided how many of
      // each strategy took; this only places that many, from a hash of the result
      // itself, so the picture is stable across re-renders and agrees with the table.
      function spreadMap(last) {
        var res = last.res;
        var ev = eventById(last.event) || { id: last.event, name: last.event };
        var drawn = res.results.filter(function (r) { return (r.attempts || 0) > 0; });
        if (!drawn.length) return null;

        var SIZE = 320, C = SIZE / 2, R = 142;
        var PARENT_R = 13, INNER = PARENT_R + 8;
        var PER_STRATEGY_CAP = 70;
        var nodes = [];
        var dropped = 0;

        drawn.forEach(function (r, si) {
          var strat = strategyById(r.id) || { distance: 0.5, diversity: r.diversity ? 1 : 0 };
          var show = Math.min(r.attempts, PER_STRATEGY_CAP);
          dropped += r.attempts - show;
          // How many of the DRAWN markers are survivors, keeping the on-screen ratio
          // equal to the real one when the count is capped.
          var showTook = r.wiped ? 0 : Math.round(r.took * (show / r.attempts));
          // Seeded from the result, not from a counter: same result, same picture.
          var rnd = seeded(hashStr(r.id + '|' + r.attempts + '|' + r.took + '|' + ev.id) + si);
          for (var i = 0; i < show; i++) {
            // sqrt keeps the scatter even over AREA. Without it everything crowds the
            // rim, because a ring's area grows with its radius.
            var frac = Math.sqrt((i + 0.35) / show);
            var reach = clamp(strat.distance, 0.06, 1);
            var rad = INNER + (R - INNER) * reach * (0.34 + 0.66 * frac) * (0.82 + rnd() * 0.36);
            var ang = i * 2.39996 + si * 1.1 + rnd() * 0.5;
            nodes.push({
              x: C + Math.cos(ang) * rad, y: C + Math.sin(ang) * rad,
              alive: i < showTook, wiped: !!r.wiped, clonal: strat.diversity === 0,
              icon: r.icon
            });
          }
        });
        // Survivors last, so a live stem is never hidden under a dead one.
        nodes.sort(function (a, b) { return (a.alive ? 1 : 0) - (b.alive ? 1 : 0); });

        var diverseHex = tone('#22c55e');
        var clonalHex = tone('#f59e0b');
        var deadHex = tone('#94a3b8');
        var wipedHex = tone('#dc2626');

        var marks = [];
        nodes.forEach(function (n, i) {
          // A clonal stem is JOINED to the parent. That shared root system is the whole
          // reason a pathogen can take every copy at once, so it is drawn, not implied.
          if (n.clonal && (n.alive || n.wiped)) {
            marks.push(h('line', {
              key: 'k' + i, 'data-mark': 'root', x1: C, y1: C, x2: n.x, y2: n.y,
              stroke: n.wiped ? wipedHex : clonalHex,
              strokeWidth: 1.6, strokeOpacity: n.wiped ? 0.75 : 0.6
            }));
          }
        });
        nodes.forEach(function (n, i) {
          if (n.wiped) {
            // Killed by the event rather than simply failing to take.
            marks.push(h('g', { key: 'm' + i, 'data-mark': 'wiped', stroke: wipedHex, strokeWidth: 1.6, strokeLinecap: 'round' }, [
              h('line', { key: 'a', x1: n.x - 3.2, y1: n.y - 3.2, x2: n.x + 3.2, y2: n.y + 3.2 }),
              h('line', { key: 'b', x1: n.x - 3.2, y1: n.y + 3.2, x2: n.x + 3.2, y2: n.y - 3.2 })
            ]));
          } else if (!n.alive) {
            marks.push(h('circle', {
              key: 'm' + i, 'data-mark': 'fail', cx: n.x, cy: n.y, r: 2.2,
              fill: 'none', stroke: deadHex, strokeWidth: 1, strokeOpacity: 0.55
            }));
          } else if (n.clonal) {
            // Shape carries the distinction as well as colour: in high contrast every
            // decorative hue collapses to the same accent, and colour alone is not a
            // channel a colour-blind student can read either.
            marks.push(h('rect', {
              key: 'm' + i, 'data-mark': 'clone', x: n.x - 4, y: n.y - 4, width: 8, height: 8, rx: 1.5,
              fill: clonalHex, stroke: T.card, strokeWidth: 1
            }));
          } else {
            marks.push(h('circle', {
              key: 'm' + i, 'data-mark': 'seed', cx: n.x, cy: n.y, r: 4.4,
              fill: diverseHex, stroke: T.card, strokeWidth: 1
            }));
          }
        });

        function legendItem(k, swatch, labelTxt) {
          return h('span', { key: k, style: { display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 12, fontSize: 11, color: T.dim } }, [
            swatch, h('span', { key: 't' }, labelTxt)
          ]);
        }
        var sw = function (kind) {
          var base = { width: 11, height: 11, viewBox: '0 0 11 11', 'aria-hidden': 'true', key: 's' };
          if (kind === 'diverse') return h('svg', base, h('circle', { cx: 5.5, cy: 5.5, r: 4.4, fill: diverseHex }));
          if (kind === 'clonal') return h('svg', base, h('rect', { x: 1.5, y: 1.5, width: 8, height: 8, rx: 1.5, fill: clonalHex }));
          if (kind === 'wiped') return h('svg', base, h('g', { stroke: wipedHex, strokeWidth: 1.6, strokeLinecap: 'round' }, [
            h('line', { key: 'a', x1: 1.8, y1: 1.8, x2: 9.2, y2: 9.2 }),
            h('line', { key: 'b', x1: 1.8, y1: 9.2, x2: 9.2, y2: 1.8 })
          ]));
          return h('svg', base, h('circle', { cx: 5.5, cy: 5.5, r: 2.2, fill: 'none', stroke: deadHex, strokeWidth: 1 }));
        };

        var anyWiped = nodes.some(function (n) { return n.wiped; });
        var alt = __alloT('stem.treelab.map_alt',
          'Overhead map of the clearing. ' + res.established + ' descendants established: '
          + res.diverseCount + ' grown from seed, scattered across the clearing, and '
          + res.clonalCount + ' clonal stems joined to the parent tree by its own roots.'
          + (anyWiped ? ' The clonal stems marked with a cross were killed together.' : ''));

        return card([
          heading(__alloT('stem.treelab.map_title', 'Where they landed'),
            atLeast(band, 'g35')
              ? __alloT('stem.treelab.map_sub_g35', 'The same decade, seen from above. Distance is the half of this trade the numbers do not show: a clonal stem almost always takes, and it arrives next to its parent.')
              : __alloT('stem.treelab.map_sub_k2', 'Looking down at the ground around the tree. Each mark is one try.')),
          h('svg', {
            key: 'map', viewBox: '0 0 ' + SIZE + ' ' + SIZE, role: 'img', 'aria-label': alt,
            style: { width: '100%', maxWidth: 420, height: 'auto', display: 'block', margin: '0 auto' }
          }, [
            h('circle', { key: 'bg', cx: C, cy: C, r: R + 6, fill: T.cardAlt, stroke: T.border }),
            h('g', { key: 'rings' }, [0.34, 0.67, 1].map(function (f, i) {
              return h('circle', {
                key: 'r' + i, cx: C, cy: C, r: R * f, fill: 'none',
                stroke: T.border, strokeWidth: 1, strokeDasharray: '3 4'
              });
            })),
            h('g', { key: 'marks' }, marks),
            // The parent, drawn last so nothing sits on top of it.
            h('circle', { key: 'p1', cx: C, cy: C, r: PARENT_R, fill: tone('#166534'), stroke: T.card, strokeWidth: 2 }),
            h('circle', { key: 'p2', cx: C, cy: C, r: 4, fill: tone('#78350f') })
          ]),
          h('div', { key: 'leg', style: { marginTop: 8, textAlign: 'center' } }, [
            legendItem('a', sw('diverse'), __alloT('stem.treelab.map_leg_seed', 'Grew from seed')),
            legendItem('b', sw('clonal'), __alloT('stem.treelab.map_leg_clone', 'Clonal stem')),
            legendItem('c', sw('dead'), __alloT('stem.treelab.map_leg_failed', 'Did not take')),
            anyWiped ? legendItem('d', sw('wiped'), __alloT('stem.treelab.map_leg_wiped', 'Killed together')) : null
          ]),
          dropped > 0 ? h('div', { key: 'cap', style: { fontSize: 11, color: T.dim, marginTop: 6, textAlign: 'center' } },
            __alloT('stem.treelab.map_capped',
              'Showing ' + (nodes.length) + ' of ' + (nodes.length + dropped) + ' attempts, in the same proportion. The table above is the full count.')) : null,
          modelNote(__alloT('stem.treelab.map_note',
            'Distances here are RELATIVE, not a scale in metres — what is real is the ordering, that a wind-carried seed can travel orders of magnitude further than a root sucker can push. The counts are exactly the ones resolved above; nothing is re-rolled to draw this.'))
        ]);
      }

      function spreadResult(last) {
        var ev = eventById(last.event);
        var res = last.res;
        return card([
          h('div', { key: 'ev', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '4px solid ' + T.accent, marginBottom: 10 } }, [
            h('div', { key: 'a', style: { fontWeight: 700, color: T.text } },
              ev.icon + ' ' + __alloT('stem.treelab.event_' + ev.id, ev.name)),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3 } },
              __alloT('stem.treelab.event_blurb_' + ev.id, ev.blurb))
          ]),
          h('div', { key: 'g', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, marginBottom: 10 } }, [
            statTile('e', __alloT('stem.treelab.established', 'Established'), String(res.established), T.good),
            statTile('d', __alloT('stem.treelab.from_seed', 'From seed'), String(res.diverseCount), '#ec4899'),
            statTile('c', __alloT('stem.treelab.clonal', 'Clonal copies'), String(res.clonalCount), '#86efac'),
            atLeast(band, 'g68') ? statTile('x', __alloT('stem.treelab.diversity', 'Genetic diversity'), Math.round(res.diversityIndex * 100) + '%', T.accent) : null
          ].filter(Boolean)),
          h('div', { key: 'rows' }, res.results.map(function (r) {
            return h('div', {
              key: r.id,
              style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid ' + T.border, fontSize: 12, flexWrap: 'wrap' }
            }, [
              h('span', { key: 'a', style: { color: T.text, fontWeight: 600 } },
                (r.icon || '') + ' ' + __alloT('stem.treelab.strategy_' + r.id, r.name || r.id)),
              h('span', { key: 'b', style: { color: r.took > 0 ? T.good : T.dim } }, r.took + ' / ' + r.attempts),
              r.note ? h('span', { key: 'c', style: { color: r.wiped ? T.bad : T.dim, flex: '1 1 100%', lineHeight: 1.45 } },
                __alloT('stem.treelab.spread_note_' + (r.noteKind || 'plain'), r.note)) : null
            ]);
          })),
          atLeast(band, 'g68') ? h('p', { key: 'lesson', style: { fontSize: 12, color: T.dim, lineHeight: 1.55, marginTop: 10 } },
            res.clonalCount > 0 && res.diverseCount === 0
              ? __alloT('stem.treelab.all_clonal', 'Every descendant this round is a genetic copy sharing one root system. That is reliable now and fragile against anything that beats this exact genotype.')
              : (res.diverseCount > 0 && res.clonalCount === 0
                ? __alloT('stem.treelab.all_seed', 'Every descendant came from seed, so each one is genetically different and landed away from the parent. You paid for that in how few of them took.')
                : __alloT('stem.treelab.mixed', 'A mixed strategy: copies close by that almost always take, plus a few genetically different seedlings further out. Most real trees hedge exactly like this.'))) : null
        ]);
      }

      // One dot per question in this band: filled when answered, and the running score
      // counts only questions this band actually shows.
      function scoreStrip(pool) {
        var seen = d.quizSeen || {};
        var right = 0, done = 0;
        pool.forEach(function (q) {
          var st = seen[QUIZ.indexOf(q)];
          if (!st) return;
          done++;
          if (st === 'right') right++;
        });
        return h('div', { key: 'score', style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 } }, [
          h('div', { key: 'dots', style: { display: 'flex', gap: 4 } }, pool.map(function (q, i) {
            var st = seen[QUIZ.indexOf(q)];
            return h('span', {
              key: 'd' + i,
              style: {
                width: 9, height: 9, borderRadius: 5, display: 'inline-block',
                border: '1px solid ' + T.border,
                background: st === 'right' ? T.good : (st === 'wrong' ? T.bad : 'transparent')
              }
            });
          })),
          h('span', { key: 'n', style: { fontSize: 12, color: T.dim } },
            done === 0
              ? __alloT('stem.treelab.score_none', 'Not answered yet')
              : right + ' / ' + done + ' ' + __alloT('stem.treelab.score_right', 'right'))
        ]);
      }

      // Runs every species under the CURRENT conditions and allocation. Same weather,
      // same budget split, so any difference on screen is the species' own strategy and
      // not a hidden change of setup. ~500 pure-math steps, and only on this tab.
      function compareRuns(years) {
        return SPECIES.map(function (sp2) {
          var t = newTree(sp2.id);
          var track = [];
          for (var y = 0; y < years && t.alive; y++) {
            t = simulateYear(t, sp2, envForYear(envCfg, t.age), alloc);
            if (y % 2 === 0) track.push(t.heightM);
          }
          return {
            sp: sp2, tree: t, track: track,
            diedAt: t.alive ? null : t.age,
            cause: t.causeOfDeath,
            clonal: sp2.modes.some(function (m) { var st = strategyById(m); return st && st.diversity === 0; })
          };
        });
      }

      // ── The comparison itself ────────────────────────────────────────────────
      // Five species were drawn as five separate sparklines in five separate boxes,
      // each stretched to its own width with preserveAspectRatio="none". To compare
      // them you had to compare five pictures — which is the one thing a comparison
      // view must not make you do. Overlaid on shared axes, the whole point of the
      // view lands in a glance: which one is fastest early, which one is still going
      // at 300 years, and which ones never got there at all.
      //
      // Slots are assigned by the species' fixed position in SPECIES, never by how
      // tall they finished. A palette that follows rank repaints every survivor the
      // moment the years slider changes the ordering.
      var SPECIES_HUE_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
      var SPECIES_HUE_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
      // High contrast collapses every decorative hue onto one accent, so five lines
      // would be five identical yellow lines. There the identity channel becomes the
      // dash pattern — the line equivalent of the texture fallback.
      // Solid / medium dash / fine dot / long dash / dash-dot. A first set put two
      // dash-dot patterns next to each other and they read as the same line.
      var SPECIES_DASH = ['', '9 5', '2 4', '16 5', '7 4 2 4'];

      function compareChart(runs, years, maxH) {
        var W = 640, H = 250, PADL = 42, PADR = 14, PADT = 12, PADB = 30;
        var PW = W - PADL - PADR, PH = H - PADT - PADB;
        var yTop = Math.max(1, Math.ceil(maxH / 5) * 5);
        var sx = function (yr) { return PADL + PW * clamp(yr / Math.max(1, years), 0, 1); };
        var sy = function (m) { return PADT + PH * (1 - clamp(m / yTop, 0, 1)); };

        function hueFor(i) { return isDark ? SPECIES_HUE_DARK[i % 5] : SPECIES_HUE_LIGHT[i % 5]; }

        var lines = [], marks = [], labels = [];
        runs.forEach(function (r, i) {
          if (!r.track.length) return;
          var hue = isContrast ? T.accent : hueFor(i);
          var dash = isContrast ? SPECIES_DASH[i % 5] : '';
          var mine = r.sp.id === sp.id;
          var pts = r.track.map(function (v, k) {
            // compareRuns samples every OTHER year, so the index is half the age.
            return round(sx(k * 2), 1) + ',' + round(sy(v), 1);
          }).join(' ');
          lines.push(h('polyline', {
            key: 'l' + r.sp.id, 'data-species': r.sp.id, points: pts, fill: 'none', stroke: hue,
            strokeWidth: mine ? 3 : 2, strokeLinejoin: 'round', strokeLinecap: 'round',
            strokeDasharray: dash || undefined,
            strokeOpacity: 1
          }));
          var lastX = sx((r.track.length - 1) * 2);
          var lastY = sy(r.track[r.track.length - 1]);
          if (r.diedAt != null) {
            // Where a run STOPS is the most informative point on it, so it gets a mark
            // rather than being left as a line that merely runs out.
            marks.push(h('g', {
              key: 'd' + r.sp.id, 'data-died': r.sp.id, stroke: hue, strokeWidth: 2, strokeLinecap: 'round'
            }, [
              h('line', { key: 'a', x1: lastX - 4, y1: lastY - 4, x2: lastX + 4, y2: lastY + 4 }),
              h('line', { key: 'b', x1: lastX - 4, y1: lastY + 4, x2: lastX + 4, y2: lastY - 4 })
            ]));
          } else {
            marks.push(h('circle', {
              key: 'e' + r.sp.id, cx: lastX, cy: lastY, r: 4,
              fill: hue, stroke: T.card, strokeWidth: 2
            }));
          }
          // ONE direct label, on the student's own species. Five end-labels on curves
          // that finish close together stack into noise; the legend carries the rest.
          if (mine) {
            labels.push(h('text', {
              key: 'lab' + r.sp.id,
              x: clamp(lastX - 6, PADL, PADL + PW - 4), y: clamp(lastY - 9, PADT + 9, PADT + PH),
              textAnchor: 'end',
              style: { fontSize: '11px', fontWeight: 700, fill: T.text }
            }, __alloT('stem.treelab.your_tree', 'your tree')));
          }
        });

        var alt = __alloT('stem.treelab.compare_alt',
          'Height against age for five species under identical conditions over ' + years + ' years. '
          + runs.map(function (r) {
            return __alloT('stem.treelab.species_' + r.sp.id, r.sp.name) + ' '
              + (r.diedAt != null
                ? 'died at ' + r.diedAt + ' years'
                : 'reached ' + round(r.tree.heightM, 1) + ' metres');
          }).join('; ') + '.');

        return h('div', { key: 'chart', style: { marginTop: 4 } }, [
          h('svg', {
            key: 'svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': alt,
            style: { width: '100%', height: 'auto', display: 'block' }
          }, [
            h('g', { key: 'grid', stroke: T.border, strokeWidth: 1, fill: 'none' }, [
              h('line', { key: 'x', x1: PADL, y1: PADT + PH, x2: PADL + PW, y2: PADT + PH }),
              h('line', { key: 'y', x1: PADL, y1: PADT, x2: PADL, y2: PADT + PH }),
              h('line', { key: 'h', x1: PADL, y1: PADT, x2: PADL + PW, y2: PADT, strokeOpacity: 0.5 })
            ]),
            h('g', { key: 'lines' }, lines),
            h('g', { key: 'marks' }, marks),
            h('g', { key: 'labels' }, labels),
            h('text', {
              key: 'yt', x: PADL - 6, y: PADT + 4, textAnchor: 'end',
              style: { fontSize: '10px', fill: T.dim, fontVariantNumeric: 'tabular-nums' }
            }, yTop + ' m'),
            h('text', {
              key: 'y0', x: PADL - 6, y: PADT + PH, textAnchor: 'end',
              style: { fontSize: '10px', fill: T.dim, fontVariantNumeric: 'tabular-nums' }
            }, '0'),
            h('text', {
              key: 'x0', x: PADL, y: H - 10, textAnchor: 'start',
              style: { fontSize: '10px', fill: T.dim }
            }, '0 ' + __alloT('stem.treelab.yr', 'yr')),
            h('text', {
              key: 'x1', x: PADL + PW, y: H - 10, textAnchor: 'end',
              style: { fontSize: '10px', fill: T.dim }
            }, years + ' ' + __alloT('stem.treelab.yr', 'yr'))
          ]),
          // A legend is always present once there is more than one series: it is the
          // dependable identity channel, and nobody should have to match hues by eye.
          h('div', {
            key: 'legend',
            style: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6, justifyContent: 'center' }
          }, runs.map(function (r, i) {
            return h('span', {
              key: r.sp.id,
              style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.dim }
            }, [
              h('svg', {
                key: 'k', width: 18, height: 8, viewBox: '0 0 18 8', 'aria-hidden': 'true',
                style: { flex: '0 0 auto' }
              }, h('line', {
                x1: 0, y1: 4, x2: 18, y2: 4,
                stroke: isContrast ? T.accent : hueFor(i), strokeWidth: 2, strokeLinecap: 'round',
                strokeDasharray: (isContrast ? SPECIES_DASH[i % 5] : '') || undefined
              })),
              h('span', { key: 'n', style: { color: r.sp.id === sp.id ? T.text : T.dim, fontWeight: r.sp.id === sp.id ? 700 : 400 } },
                __alloT('stem.treelab.species_' + r.sp.id, r.sp.name)
                + (r.diedAt != null ? ' ✕' + r.diedAt : ''))
            ]);
          })),
          h('div', { key: 'key', style: { fontSize: 11, color: T.dim, marginTop: 4, textAlign: 'center' } },
            __alloT('stem.treelab.compare_key', 'A cross is where a run ended. Every figure is also written out species by species below.'))
        ]);
      }

      function viewCompare() {
        var years = clamp(d.compareYears || 120, 20, 400);
        var runs = compareRuns(years);
        var maxH = 1;
        runs.forEach(function (r) { r.track.forEach(function (v) { if (v > maxH) maxH = v; }); });

        var kids = [card([
          heading(__alloT('stem.treelab.compare', 'Five strategies, one set of conditions'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.compare_sub_g68', 'Every species below is grown under exactly the conditions and the allocation you set on the Grow tab. Nothing else differs, so what you see is the strategy each one is built around.')
              : __alloT('stem.treelab.compare_sub_k2', 'The same weather for all five trees. They still grow differently.')),
          h('div', { key: 'yrs', style: { marginBottom: 10 } }, [
            h('label', { key: 'l', htmlFor: 'treelab-compare-years', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 4 } }, [
              h('span', { key: 'a' }, __alloT('stem.treelab.compare_years', 'Years to run')),
              h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, String(years))
            ]),
            h('input', {
              key: 'i', id: 'treelab-compare-years', type: 'range', min: 20, max: 400, step: 10, value: years,
              onChange: function (e) { upd('compareYears', parseInt(e.target.value, 10)); },
              style: { width: '100%', accentColor: T.accent }
            })
          ]),
          compareChart(runs, years, maxH)
        ])];

        runs.forEach(function (r) {
          var isCurrent = r.sp.id === sp.id;
          var W = 100, H = 44;
          var span = Math.max(1, Math.ceil(years / 2));   // one sample every other year
          var pts = r.track.map(function (v, i) {
            var x = (i / span) * W;
            return x.toFixed(1) + ',' + (H - (v / maxH) * (H - 2)).toFixed(1);
          }).join(' ');
          kids.push(card([
            h('div', { key: 'hd', style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' } }, [
              h('div', { key: 'a', style: { fontWeight: 700, color: T.text, fontSize: 14 } },
                r.sp.emoji + ' ' + __alloT('stem.treelab.species_' + r.sp.id, r.sp.name)
                + (isCurrent ? ' · ' + __alloT('stem.treelab.your_tree', 'your tree') : '')),
              h('div', { key: 'b', style: { fontSize: 12, color: T.dim } },
                r.diedAt
                  ? __alloT('stem.treelab.died_at', 'died at ') + r.diedAt + ' ' + __alloT('stem.treelab.yr', 'yr')
                    + ' · ' + (r.cause === 'senescence'
                      ? __alloT('stem.treelab.of_old_age', 'old age')
                      : __alloT('stem.treelab.starved', 'starved'))
                  : round(r.tree.heightM, 1) + ' m · ' + round(r.tree.dbhCm, 0) + ' cm')
            ]),
            h('svg', {
              key: 'spark', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none',
              style: { width: '100%', height: 52, marginTop: 6, background: T.cardAlt, borderRadius: 6, border: '1px solid ' + (isCurrent ? T.accent : T.border) },
              role: 'img',
              'aria-label': __alloT('stem.treelab.species_' + r.sp.id, r.sp.name) + ': '
                + (r.diedAt ? __alloT('stem.treelab.died_at', 'died at ') + r.diedAt : round(r.tree.heightM, 1) + ' metres')
                + ' ' + __alloT('stem.treelab.after_years', 'after ') + years + ' ' + __alloT('stem.treelab.yr', 'yr')
            }, [
              h('line', { key: 'base', x1: 0, y1: H - 1, x2: W, y2: H - 1, stroke: T.border, strokeWidth: 0.6 }),
              pts ? h('polyline', { key: 'ln', points: pts, fill: 'none', stroke: isCurrent ? T.accent : tone('#22c55e'), strokeWidth: isCurrent ? 2 : 1.3, vectorEffect: 'non-scaling-stroke' }) : null,
              // Mark where a run stopped, so a short life reads as a short life rather
              // than as a line that happens to end.
              (r.diedAt && r.track.length) ? h('line', {
                key: 'end',
                x1: ((r.track.length - 1) / span) * W,
                x2: ((r.track.length - 1) / span) * W,
                y1: Math.max(0, H - (r.track[r.track.length - 1] / maxH) * (H - 2) - 5),
                y2: H - 1,
                stroke: tone(r.cause === 'senescence' ? '#94a3b8' : '#dc2626'),
                strokeWidth: 2, vectorEffect: 'non-scaling-stroke'
              }) : null
            ]),
            atLeast(band, 'g35') ? h('div', { key: 'why', style: { fontSize: 11, color: T.dim, marginTop: 6, lineHeight: 1.5 } },
              (r.clonal
                ? __alloT('stem.treelab.cmp_clonal', 'Can copy itself without seeds. ')
                : __alloT('stem.treelab.cmp_seed', 'Seed only — no clonal route. '))
              + __alloT('stem.treelab.cmp_life', 'Lifespan about ') + r.sp.maxAgeYears + ' ' + __alloT('stem.treelab.yr', 'yr')
              + ', ' + __alloT('stem.treelab.cmp_max', 'tops out near ') + r.sp.maxHeight + ' m.') : null
          ]));
        });

        kids.push(card([
          modelNote(__alloT('stem.treelab.compare_note',
            'One run each, under one set of conditions. A species that loses here is not a worse tree — it is a tree built for different conditions. Change the light or the water on the Grow tab and the order can change.'))
        ]));
        return kids;
      }

      function viewQuiz() {
        var pool = QUIZ.filter(function (q) { return bandRank(band) >= bandRank(q.band); });
        if (pool.length === 0) pool = QUIZ.slice(0, 3);
        var idx = clamp(d.quizIdx || 0, 0, pool.length - 1);
        var q = pool[idx];
        // Key against the full bank, not the filtered pool: a different grade band shows a
        // different subset, and a pool-relative key would hand question 3 the translation
        // written for question 5.
        var qKey = QUIZ.indexOf(q);
        var picked = d.quizPick;
        var answered = picked != null;

        return [card([
          heading(__alloT('stem.treelab.check', 'Knowledge check'),
            __alloT('stem.treelab.check_sub', 'Question ') + (idx + 1) + ' / ' + pool.length + ' · ' + BAND_LABEL[band]),
          scoreStrip(pool),
          h('p', { key: 'q', style: { fontSize: 14, color: T.text, lineHeight: 1.6, marginBottom: 10, fontWeight: 600 } },
            __alloT('stem.treelab.quiz' + qKey + '_q', q.q)),
          h('div', { key: 'opts', role: 'group', 'aria-label': 'Answer choices' }, q.a.map(function (opt, i) {
            var isCorrect = i === q.correct;
            var chosen = picked === i;
            var bg = T.cardAlt, bd = T.border;
            if (answered && isCorrect) { bg = isContrast ? '#003300' : (isDark ? '#14532d' : '#dcfce7'); bd = T.good; }
            else if (answered && chosen) { bg = isContrast ? '#330000' : (isDark ? '#7f1d1d' : '#fee2e2'); bd = T.bad; }
            return h('button', {
              key: 'o' + i, type: 'button', disabled: answered,
              onClick: function () {
                var seen = Object.assign({}, d.quizSeen || {});
                var first = !seen[qKey];
                seen[qKey] = isCorrect ? 'right' : 'wrong';
                updMulti({ quizPick: i, quizSeen: seen });
                if (isCorrect) {
                  sfxGrow();
                  if (first) xp(3);
                  srSay(__alloT('stem.treelab.correct', 'Correct.'));
                } else {
                  sfxBad();
                  srSay(__alloT('stem.treelab.not_quite', 'Not quite.'));
                }
              },
              style: {
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                marginBottom: 6, borderRadius: 8, border: '1px solid ' + bd, background: bg,
                color: T.text, fontSize: 13, cursor: answered ? 'default' : 'pointer', lineHeight: 1.5
              }
            }, String.fromCharCode(65 + i) + '. ' + __alloT('stem.treelab.quiz' + qKey + '_opt' + i, opt));
          })),
          answered ? h('div', { key: 'why', style: { marginTop: 8, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '4px solid ' + T.accent, fontSize: 12, color: T.text, lineHeight: 1.6 } },
            __alloT('stem.treelab.quiz' + qKey + '_why', q.why)) : null,
          h('div', { key: 'nav', style: { marginTop: 10 } }, [
            btn('prev', '← ' + __alloT('stem.treelab.prev', 'Previous'), function () { updMulti({ quizIdx: Math.max(0, idx - 1), quizPick: null }); }, { small: true, disabled: idx === 0 }),
            btn('next', __alloT('stem.treelab.next', 'Next') + ' →', function () { updMulti({ quizIdx: Math.min(pool.length - 1, idx + 1), quizPick: null }); }, { small: true, disabled: idx >= pool.length - 1 })
          ])
        ])];
      }

      // ── Tab bar ──
      var TABS = [
        { id: 'grow', label: __alloT('stem.treelab.tab_grow', 'Grow'), icon: '🌳' },
        { id: 'chem', label: __alloT('stem.treelab.tab_chem', 'Chemistry'), icon: '☀️' },
        { id: 'transport', label: __alloT('stem.treelab.tab_transport', 'Transport'), icon: '↕️', min: 'g35' },
        { id: 'spread', label: __alloT('stem.treelab.tab_spread', 'Spread'), icon: '🌱' },
        { id: 'compare', label: __alloT('stem.treelab.tab_compare', 'Compare'), icon: '⚖️', min: 'g35' },
        { id: 'quiz', label: __alloT('stem.treelab.tab_quiz', 'Check'), icon: '✓' }
      ].filter(function (t) { return !t.min || atLeast(band, t.min); });
      if (!TABS.some(function (t) { return t.id === view; })) view = 'grow';

      var body;
      switch (view) {
        case 'chem': body = viewChem(); break;
        case 'transport': body = viewTransport(); break;
        case 'spread': body = viewSpread(); break;
        case 'compare': body = viewCompare(); break;
        case 'quiz': body = viewQuiz(); break;
        default: body = viewGrow();
      }

      return h('div', {
        className: 'allo-tree-lab' + (d.viewerFull ? ' is-full' : ''),
        style: {
          '--tree-glow': isContrast ? 'transparent' : (isDark ? 'rgba(52,211,153,.11)' : 'rgba(16,185,129,.14)'),
          '--sun-glow': isContrast ? 'transparent' : (isDark ? 'rgba(251,191,36,.07)' : 'rgba(250,204,21,.13)'),
          '--hero-ring': isContrast ? 'transparent' : (isDark ? 'rgba(52,211,153,.08)' : 'rgba(255,255,255,.24)'),
          '--tree-shadow': isDark ? 'rgba(2,6,23,.32)' : 'rgba(15,23,42,.12)',
          '--accent-shadow': isDark ? 'rgba(52,211,153,.2)' : 'rgba(5,150,105,.2)',
          '--tree-focus': isContrast ? '#ffffff' : (isDark ? '#a7f3d0' : '#34d399'),
          '--tree-accent': T.accent,
          background: T.bg, color: T.text, padding: 16, borderRadius: 18, minHeight: 400
        }
      }, [
        h('style', { key: 'visual-css' }, visualCss),
        h('div', {
          key: 'top', className: 'allo-tree-hero',
          style: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18,
            flexWrap: 'wrap', marginBottom: 14, padding: '20px 22px', borderRadius: 18,
            border: '1px solid ' + (isContrast ? T.border : (isDark ? '#2f5c50' : '#a7d7c4')),
            background: isContrast ? T.card : (isDark
              ? 'linear-gradient(135deg,#102c2a 0%,#172033 62%,#2a2415 100%)'
              : 'linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 58%,#fffbeb 100%)'),
            boxShadow: isContrast ? 'none' : (isDark ? '0 18px 42px rgba(2,6,23,.25)' : '0 18px 42px rgba(5,46,22,.09)')
          }
        }, [
          h('div', { key: 'a', style: { flex: '1 1 330px', position: 'relative', zIndex: 1 } }, [
            h('div', { key: 'eyebrow', style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', marginBottom: 8, borderRadius: 999, border: '1px solid ' + T.border, background: isContrast ? T.cardAlt : (isDark ? 'rgba(52,211,153,.1)' : 'rgba(255,255,255,.7)'), color: T.accent, fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' } },
              '● ' + __alloT('stem.treelab.studio_label', 'Living systems studio')),
            h('h3', { key: 't', style: { fontSize: 25, lineHeight: 1.08, fontWeight: 900, letterSpacing: '-0.035em', margin: 0, color: T.text } },
              '🌳 ' + __alloT('stem.treelab.title', 'Tree Life Lab')),
            h('div', { key: 's', style: { fontSize: 13, color: T.dim, marginTop: 7, maxWidth: 570, lineHeight: 1.55 } },
              __alloT('stem.treelab.subtitle', 'What limits a tree, what it costs to stay alive, and how it makes more of itself')),
            h('div', { key: 'quick', style: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 13 } }, [
              h('span', { key: 'age', style: { padding: '5px 9px', borderRadius: 8, background: isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.28)' : 'rgba(255,255,255,.78)'), border: '1px solid ' + T.border, color: T.text, fontSize: 11, fontWeight: 700 } },
                __alloT('stem.treelab.age', 'Age') + ' ' + tree.age),
              h('span', { key: 'height', style: { padding: '5px 9px', borderRadius: 8, background: isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.28)' : 'rgba(255,255,255,.78)'), border: '1px solid ' + T.border, color: T.text, fontSize: 11, fontWeight: 700 } },
                round(tree.heightM, 1) + ' m ' + __alloT('stem.treelab.tall_short', 'tall')),
              h('span', { key: 'carbon', style: { padding: '5px 9px', borderRadius: 8, background: isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.28)' : 'rgba(255,255,255,.78)'), border: '1px solid ' + T.border, color: tree.seedsBanked > 0 ? T.accent : T.dim, fontSize: 11, fontWeight: 700 } },
                round(tree.seedsBanked, 1) + ' kg C ' + __alloT('stem.treelab.banked_short', 'banked'))
            ])
          ]),
          h('div', { key: 'b', className: 'allo-tree-hero-controls', style: { display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1, padding: 8, borderRadius: 12, background: isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.34)' : 'rgba(255,255,255,.7)'), border: '1px solid ' + T.border } }, [
            h('div', { key: 'band-field', className: 'allo-tree-hero-field', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
              h('label', { key: 'bl', htmlFor: 'treelab-band', style: { fontSize: 11, color: T.dim } },
              __alloT('stem.treelab.level', 'Level')),
            h('select', {
              key: 'bs', id: 'treelab-band', value: band,
              onChange: function (e) { upd('bandOverride', e.target.value); srSay('Level set to ' + BAND_LABEL[e.target.value] + '.'); },
              style: { padding: '7px 10px', minHeight: 34, borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, fontSize: 12, fontWeight: 600 }
              }, BANDS.map(function (b) { return h('option', { key: b, value: b }, BAND_LABEL[b]); }))
            ]),
            h('div', { key: 'species-field', className: 'allo-tree-hero-field', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
              h('label', { key: 'sl', htmlFor: 'treelab-species', style: { fontSize: 11, color: T.dim } },
                __alloT('stem.treelab.species', 'Species')),
              h('select', {
              key: 'ss', id: 'treelab-species', value: sp.id,
              onChange: function (e) { resetTree(e.target.value); },
              style: { padding: '7px 10px', minHeight: 34, borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, fontSize: 12, fontWeight: 600 }
              }, SPECIES.map(function (s) { return h('option', { key: s.id, value: s.id }, s.emoji + ' ' + s.name); }))
            ])
          ])
        ]),
        h('div', { key: 'tabs', className: 'allo-tree-tabs', role: 'tablist', 'aria-label': 'Tree Life Lab sections', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, padding: 6, borderRadius: 14, background: T.card, border: '1px solid ' + T.border, boxShadow: isContrast ? 'none' : (isDark ? '0 8px 24px rgba(2,6,23,.2)' : '0 8px 24px rgba(15,23,42,.06)') } },
          TABS.map(function (t, ti) {
            var selected = view === t.id;
            return h('button', {
              className: 'allo-tree-tab',
              key: t.id, type: 'button', role: 'tab',
              id: 'treelab-tab-' + t.id,
              'aria-selected': selected,
              'aria-controls': 'treelab-panel',
              // Roving tabindex: one Tab press reaches the tab strip, then the arrows
              // move within it. Without this a keyboard user has to Tab through every
              // section header to get past the strip, which is the whole reason the
              // tab pattern exists.
              tabIndex: selected ? 0 : -1,
              onClick: function () { sfxTick(); updMulti({ view: t.id, quizPick: null }); },
              onKeyDown: function (e) {
                var k = e.key;
                if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
                e.preventDefault();
                var next = ti;
                if (k === 'ArrowRight') next = (ti + 1) % TABS.length;
                else if (k === 'ArrowLeft') next = (ti - 1 + TABS.length) % TABS.length;
                else if (k === 'Home') next = 0;
                else next = TABS.length - 1;
                sfxTick();
                updMulti({ view: TABS[next].id, quizPick: null });
                srSay(TABS[next].label + ' section.');
                // Follow the selection with focus, as the tab pattern requires.
                try {
                  var el = document.getElementById('treelab-tab-' + TABS[next].id);
                  if (el && el.focus) setTimeout(function () { el.focus(); }, 0);
                } catch (err) {}
              },
              style: {
                padding: '9px 13px', minHeight: 38, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: '1px solid ' + (selected ? T.accent : T.border),
                background: selected ? ('linear-gradient(135deg,' + T.accent + ',' + (isContrast ? T.accent : (isDark ? '#6ee7b7' : '#10b981')) + ')') : 'transparent',
                color: selected ? T.onAccent : T.dim
              }
            }, t.icon + ' ' + t.label);
          })),
        h('div', {
          key: 'body', className: 'allo-tree-panel',
          role: 'tabpanel',
          id: 'treelab-panel',
          'aria-labelledby': 'treelab-tab-' + view,
          tabIndex: 0
        }, Array.isArray(body)
          ? body.map(function (node, i) {
            if (!node || typeof node !== 'object' || node.key != null) return node;
            return ctx.React.cloneElement(node, { key: 'card' + i });
          })
          : body),
        h('div', {
          key: 'sp-note',
          style: {
            marginTop: 4, padding: '10px 12px', borderRadius: 10,
            background: T.card, border: '1px solid ' + T.border,
            borderLeft: '4px solid ' + T.accent
          }
        }, [
          h('div', { key: 'n', style: { fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 } },
            sp.emoji + ' ' + __alloT('stem.treelab.species_' + sp.id, sp.name)),
          h('p', { key: 'b', style: { fontSize: 11, color: T.dim, lineHeight: 1.55, margin: 0 } },
            __alloT('stem.treelab.species_note_' + sp.id, sp.note))
        ])
      ]);
    }
  });

  // Expose the pure engine for tests. No DOM, no ctx, no React.
  window.__alloTreeLabEngine = {
    lightFactor: lightFactor, co2Factor: co2Factor, tempFactor: tempFactor,
    stomatalAperture: stomatalAperture, limitingFactor: limitingFactor,
    grossPhotosynthesis: grossPhotosynthesis, maintenanceRespiration: maintenanceRespiration,
    ringWidthMm: ringWidthMm, newTree: newTree, simulateYear: simulateYear,
    normaliseAlloc: normaliseAlloc, normaliseTree: normaliseTree, envForYear: envForYear,
    cloneTreeSnapshot: cloneTreeSnapshot, normaliseExperimentEnv: normaliseExperimentEnv,
    dominantLimiter: dominantLimiter, safeTrialSummary: safeTrialSummary,
    runExperimentTrial: runExperimentTrial, normaliseExperiment: normaliseExperiment,
    normaliseTrialRecord: normaliseTrialRecord, normaliseExperimentTrials: normaliseExperimentTrials,
    seasonForPhase: seasonForPhase, speedById: speedById, SPEEDS: SPEEDS, CLOCK: CLOCK,
    resolveSpread: resolveSpread, lcg: lcg, speciesById: speciesById,
    deriveTreeVisualState: deriveTreeVisualState, buildTreeScene: buildTreeScene, TREE_FORM: TREE_FORM,
    // Camera framing is pure arithmetic, so it can be tested without a GPU. BASE_DIST
    // goes with it because the property that matters is relative to it: the camera may
    // only ever move OUT from the baseline, which is what keeps a seedling small.
    fitDistance: fitDistance, BASE_DIST: BASE_DIST,
    strategyById: strategyById, resolveBand: resolveBand, atLeast: atLeast,
    SPECIES: SPECIES, STRATEGIES: STRATEGIES, QUIZ: QUIZ, BANDS: BANDS
  };

})();

}
