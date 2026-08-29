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
      reserves: round(reserves, 2),
      tempC: round(env.tempC, 1),
      light: round(env.light, 3),
      co2ppm: Math.round(env.co2ppm),
      soilWater: round(env.soilWater, 3),
      drought: !!env.drought
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
  function configForHistorySnapshot(record, currentConfig, currentYear) {
    var r = record || {};
    if (typeof r.tempC !== 'number' || !isFinite(r.tempC) ||
        typeof r.light !== 'number' || !isFinite(r.light) ||
        typeof r.co2ppm !== 'number' || !isFinite(r.co2ppm) ||
        typeof r.soilWater !== 'number' || !isFinite(r.soilWater)) return null;
    var cfg = Object.assign({}, currentConfig || {});
    cfg.tempC = clamp(r.tempC, -5, 45);
    cfg.light = clamp(r.light, 0, 1);
    cfg.co2ppm = clamp(r.co2ppm, 180, 900);
    cfg.soilWater = clamp(r.soilWater, 0, 1);
    cfg.droughtYears = Array.isArray(cfg.droughtYears)
      ? cfg.droughtYears.filter(function (year) { return year !== currentYear; })
      : [];
    return cfg;
  }

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
    { q: 'A young tree grows in deep shade. Then sunlight reaches it, and it grows faster. What did it need more of?', a: ['Sunlight', 'Wind', 'Cold air', 'Darkness'], correct: 0, band: 'k2',
      why: 'Leaves use sunlight to make sugar. Deep shade gave the young tree too little light, so more sunlight helped it grow.' },
    { q: 'On a hot, dry afternoon a tree closes its stomata. What does it lose by doing that?', a: ['Nothing important, because closing the pore is purely protective', 'It stops taking in ' + CO2 + ', so photosynthesis nearly stops', 'It stops respiring, so it can no longer use its stored sugar', 'It drops its leaves to cut the water loss even further'], correct: 1, band: 'g35',
      why: 'The same pore that lets water out is the one that lets ' + CO2 + ' in. Closing it saves water and costs carbon. There is no setting that does only the good half.' },
    { q: 'Which tissue carries sugar DOWN from the leaves to the roots?', a: ['Xylem', 'Phloem', 'Cambium', 'Heartwood'], correct: 1, band: 'g68',
      why: 'Xylem carries water up under tension. Phloem carries sugar from wherever it is made to wherever it is spent, which is usually downward but reverses in spring.' },
    { q: 'An old tree lays down narrower rings than it did at fifty. Does that always mean it is growing less wood?', a: ['Yes, a narrower ring is always less wood than a wider one', 'No, the same volume spread around a bigger trunk makes a thinner ring', 'Yes, old trees always add less wood than they did when young', 'No, ring width records only the rainfall of that year and nothing about wood'], correct: 1, band: 'g68',
      why: 'Circumference grows with diameter, so an identical volume of new wood spreads thinner every year. Many old trees add MORE wood per year while their rings get narrower.' },
    { q: 'Why does a very large tree need so much more photosynthesis than a sapling just to break even?', a: ['Its leaves become steadily less efficient at making sugar as it ages', 'Maintenance respiration scales with the living tissue it must keep alive', 'It has to share the light, water and nutrients with far more competitors nearby', 'Its height means it can only photosynthesise late in the day'], correct: 1, band: 'g912',
      why: 'Every kilogram of living sapwood, fine root and leaf costs energy every hour. The tree pays that bill before a single gram goes into a ring.' },
    { q: 'An aspen stand spreading by root suckers is hit by a root pathogen. Why is the whole stand at risk at once?', a: ['Root suckers are always weaker than trees grown from seed', 'The stems are genetically identical and share a root system', 'Suckers cannot photosynthesise until they are several years old', 'This pathogen can only infect aspen and no other species'], correct: 1, band: 'g68',
      why: 'Clonal spread trades genetic diversity for reliability. Every stem has the same susceptibility and a physical root connection to carry the infection.' },
    { q: 'Heartwood is dead tissue. What follows from that?', a: ['The tree is dying from the inside out and will soon fall', 'It costs nothing to maintain, so it is cheap structural support', 'It cannot hold weight, so the sapwood carries the whole load', 'It must be shed and replaced each year like leaves to keep the trunk sound'], correct: 1, band: 'g912',
      why: 'Converting sapwood to heartwood is how a tree gets bigger without its respiration bill rising forever. Dead wood is free to carry.' },
    { q: 'Which one starts a new tree from a seed?', a: ['An acorn sprouts', 'A new shoot grows from a root', 'A low branch grows roots in the soil', 'A cut stump sends up a shoot'], correct: 0, band: 'k2',
      why: 'An acorn is a seed. The other choices grow a new shoot from part of a tree that is already living.' },
    { q: 'A pine keeps its needles through winter. What advantage does that give over a bare oak in February?', a: ['It can fix carbon on a mild winter day', 'It stops losing water once the soil has frozen', 'Its needles cannot freeze in any weather', 'It does all of its growing during the winter'], correct: 0, band: 'g35',
      why: 'Leaves already built and in place mean the pine can work whenever conditions allow, instead of spending the first weeks of spring rebuilding a canopy.' },
    { q: 'Raising ' + CO2 + ' boosts a tree that is CO2-limited but does little for one that is water-limited. Why?', a: ['Extra ' + CO2 + ' becomes toxic to a tree that is already short of water', 'A stoma mostly shut admits very little ' + CO2 + ', so the extra buys almost nothing', 'A tree short of water stops photosynthesising altogether, so nothing at all helps', 'Extra ' + CO2 + ' can only be used by needles, and this tree has broad leaves'], correct: 1, band: 'g912',
      why: 'The PERCENTAGE gain from extra CO2 is about the same at any water status. What drought changes is the rate that percentage applies to: a tree with its stomata mostly shut gains a large share of almost nothing. Absolute gain, not percentage, is the honest measure.' },
    // Appended, never inserted: the rotation shift is a function of the index, and
    // quizSeen / the translation keys are indexed too, so inserting mid-bank would
    // silently re-key every question after it.
    { q: 'Someone cuts a complete ring of bark from all the way around a trunk. The leaves stay green all summer. Why does the tree die anyway?', a: ['The cut stops water from reaching the leaves, so they dry out slowly', 'The phloem is cut, so no sugar can reach the roots and they starve', 'The wound lets in disease that spreads through the whole trunk', 'The tree loses its stored heartwood through the open wound'], correct: 1, band: 'g68',
      why: 'Phloem sits in a thin band just inside the bark; xylem is deeper in the wood. Water keeps arriving, so the canopy looks fine for a season. The roots are the ones cut off from sugar, and they starve first.' },
    { q: 'In early spring, before a broadleaf has opened any leaves, which way is sugar moving in its phloem?', a: ['Downward, because sugar in a tree can only travel from leaves to roots', 'Upward, from stored reserves to the buds that are being built', 'It is not moving at all until the first leaves have opened', 'Both ways at once and in equal amounts, all through the year'], correct: 1, band: 'g912',
      why: 'Phloem runs from any source to any sink, and neither is fixed. In spring the source is stored carbon in the roots and trunk and the sink is the canopy being built, so the flow runs upward.' },
    { q: 'You want to find out whether more light makes your tree grow taller. You run one trial, then a second. What must be true of the second trial?', a: ['Everything is kept the same as the first trial except the light', 'The light and the water are both raised so the tree grows faster', 'A different species is used so the result is more general', 'It runs for many more years so the difference has time to show'], correct: 0, band: 'g35',
      why: 'A comparison points at one cause only when one thing differs. Raise the light and the water together and any difference in growth cannot be pinned on either of them.' },
    { q: 'A tree\'s leaves droop when the soil becomes very dry. What does the tree need more of?', a: ['Water', 'Wind', 'Darkness', 'Cold air'], correct: 0, band: 'k2',
      why: 'Roots take up water from the soil. When the soil is too dry, the leaves lose water and may droop.' },
    { q: 'Which part of a tree catches sunlight to help make sugar?', a: ['Leaves', 'Roots', 'Bark', 'Seeds'], correct: 0, band: 'k2',
      why: 'Leaves catch sunlight. They use light, water, and carbon dioxide from the air to help make sugar for the tree.' },
    { q: 'Mia wants to learn whether extra water helps a seedling grow. What is the fairest test?', a: ['Keep everything the same except the water', 'Give one tree more water and more sunlight', 'Use two different kinds of tree', 'Measure one tree now and another next year'], correct: 0, band: 'k2',
      why: 'A fair test changes one thing at a time. Then the result can show whether the extra water made the difference.' },
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
  // `en` is the source string, `label` is what the shell renders. The shell reads
  // cfg.parts[i].label at CALL time (not at mk(cfg) time), so render refreshes the
  // labels through ctx.t each pass — the same live-config trick CFG.home uses. The
  // English text has to be kept separately because label is overwritten in place,
  // and a fallback that has already been translated once is not a fallback.
  var TREE_PARTS = [
    { id: 'crown',  en: 'Crown (leaves)',    label: 'Crown (leaves)',   color: '#4ade80' },
    { id: 'trunk',  en: 'Trunk (wood)',      label: 'Trunk (wood)',     color: '#a16207' },
    { id: 'roots',  en: 'Root system',       label: 'Root system',      color: '#78350f' },
    { id: 'clones', en: 'Clonal offspring',  label: 'Clonal offspring', color: '#86efac' }
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
          FULLSCREEN_RETURN_FOCUS = null;
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
  function skyTexture(THREE, pal, cloudHex, cloudy, stars, dusk) {
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
    // The dusk band. Two wrong guesses taught the dome's geography: flipY puts the
    // TOP pole at row 0 and the EQUATOR — which is where the ground plane, hills and
    // treeline cut the dome, i.e. the visible horizon — at row 128. Everything below
    // row 128 is under the ground. Warming pal.lo (rows 210+) was a sunset buried in
    // the earth; a band at rows 70-215 was mostly buried too. The sky a student can
    // actually see is rows ~55-128, so THAT is where dusk goes: strongest at the
    // horizon row, gone by mid-sky, the way dusk actually grades.
    if (dusk && dusk.a > 0) {
      var dg = ctx.createLinearGradient(0, 55, 0, 133);
      dg.addColorStop(0.00, rgba(dusk.hex, 0));
      dg.addColorStop(0.72, rgba(dusk.hex, dusk.a * 0.75));
      dg.addColorStop(1.00, rgba(dusk.hex, dusk.a));
      ctx.fillStyle = dg;
      ctx.fillRect(0, 55, 512, 78);
    }
    var rnd = seeded(4211);
    // Stars, before the clouds so a puff drifts OVER them. Dark mode's sky is dusk;
    // dusk has stars, and they are the single cheapest thing that makes it read as
    // evening rather than as an underexposed noon. Kept high (the top half of the
    // dome) and faint: the first pinpricks after sunset, not a planetarium.
    if (stars) {
      for (var st = 0; st < 130; st++) {
        var sx = rnd() * 512, sy = rnd() * 100, sr = 0.5 + rnd() * 0.9;
        ctx.fillStyle = rgba('#ffffff', 0.16 + rnd() * 0.5);
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.2832); ctx.fill();
      }
    }
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
  // A bird at distance is a chevron; anything more detailed is noise at the size these
  // are drawn. White on transparent so the material colour tints it per theme.
  function birdTexture(THREE) {
    var c = canvas2d(64, 32);
    if (!c) return null;
    var ctx = c.ctx;
    ctx.clearRect(0, 0, 64, 32);
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.quadraticCurveTo(20, 24, 32, 22);
    ctx.quadraticCurveTo(44, 24, 60, 8);
    ctx.stroke();
    return new THREE.CanvasTexture(c.cv);
  }

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

  // The bare earth the roots are exposed through. It was a flat-coloured circle, and a
  // hard-edged disc of one colour is the most obviously drawn thing that can sit on a
  // ground plane — a brown ellipse pasted on the grass, with a rim the eye locks onto
  // immediately because nothing in a wood has an edge like that.
  //
  // So: an alpha falloff instead of a rim, and clods and pebbles rather than one flat
  // fill. The centre stays fully opaque, because the point of the window is to explain
  // why the roots are visible at all; only the last third of the radius dissolves.
  function soilTexture(THREE, hex, wetness) {
    var c = canvas2d(512, 512);
    if (!c) return null;
    var ctx = c.ctx;
    var rnd = seeded(4211);
    // Damp earth is darker and more saturated than dry earth, so the soil answers the
    // water slider along with the lawn rather than staying the one fixed brown.
    //
    // The fixed 0.16 on top is not decoration: the roots are drawn in a pale tan, and
    // this window exists so they can be READ. Softening its edge cost contrast the old
    // flat disc got for free, and on dry ground — where the lawn is nearly the same tan
    // as the soil — the cutaway had almost vanished while the control bar still called
    // it one. Legibility of the thing being explained outranks the surface explaining it.
    var base = mixHex(hex, '#000000', 0.16 + clamp(wetness, 0, 1) * 0.26);
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.arc(256, 256, 250, 0, 6.2832); ctx.fill();
    // Clods: broad, soft, low contrast. Big enough to read as turned earth at the size
    // this disc is actually drawn, which is most of a mature tree's root spread.
    ctx.globalAlpha = 0.55;
    for (var j = 0; j < 60; j++) {
      var px = rnd() * 512, py = rnd() * 512, pr = 14 + rnd() * 54;
      var g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      var ph = mixHex(base, rnd() < 0.5 ? '#000000' : '#c9a173', 0.08 + rnd() * 0.18);
      g.addColorStop(0, rgba(ph, 0.8));
      g.addColorStop(1, rgba(ph, 0));
      ctx.fillStyle = g; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    // Grit, fine and sparse. Same lesson as the lawn: one scale of noise alone reads as
    // film grain rather than as a surface.
    ctx.globalAlpha = 0.34;
    for (var i = 0; i < 2600; i++) {
      var x = rnd() * 512, y = rnd() * 512, r = 0.7 + rnd() * 2.4;
      ctx.fillStyle = mixHex(base, rnd() < 0.6 ? '#000000' : '#d8b184', 0.05 + rnd() * 0.2);
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // The edge. Punched out with destination-out so the falloff is in ALPHA, not a
    // fade toward the lawn's colour — the lawn's colour changes with season, moisture
    // and theme, and matching it in the texture would go wrong in every one of them.
    ctx.globalCompositeOperation = 'destination-out';
    // Falloff over the outer quarter only. Starting it at 0.62 dissolved so much of the
    // disc that the roots lost the surface they are read against.
    var eg = ctx.createRadialGradient(256, 256, 250 * 0.76, 256, 256, 250);
    eg.addColorStop(0, 'rgba(0,0,0,0)');
    eg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = eg; ctx.fillRect(0, 0, 512, 512);
    ctx.globalCompositeOperation = 'source-over';
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
    // The `+ r` on each is perspective, not padding. A crown of radius r reaches r
    // TOWARD the camera as well as sideways, and that nearest sweep is framed at
    // (dist - r), not at dist, so it projects larger than a flat fit assumes. Without
    // it a wide bare winter canopy sat right on the frame edges at a distance the
    // arithmetic said was comfortable.
    var r = Math.max(0.02, e.radius || 0);
    var dv = (Math.max(0.08, e.halfV) / f) / tanHalf + r;
    var dh = (r / f) / (tanHalf * a) + r;
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
    // ~7 deg to ~38 deg. The top of the default frame is ~21 deg above the look
    // point, so the lower half of this range keeps the DISC on screen: turn the light
    // down and the sun visibly sinks into frame instead of hovering just off the top
    // edge. Full light puts it above the frame, which is honest — nobody frames the
    // noon sun with a tree.
    var sunEl = 0.12 + 0.54 * lightLevel;
    // 3.35, not the old 0.85: at 0.85 the sun sat BEHIND the default camera (home yaw
    // 0.62), so the disc, the glow and the whole low-sun spectacle were painted into a
    // part of the sky the student never faced, and the scene was front-lit — the
    // flattest light there is. Across the sky from the camera, the default view is
    // gently backlit: the sun hangs in frame beside the crown, shadows reach toward
    // the viewer, and turning the light slider down now visibly sets the sun instead
    // of dimming a lamp somewhere off-stage.
    // Three-quarter BACK light: ~52 degrees left of the view axis. The progression
    // that landed here: the original 0.85 sat behind the camera — flat front light and
    // a sun no student ever saw; dead-opposite (3.76-ish) was pure backlight, which is
    // atmospheric but muted the whole front of the canopy, and the canopy's colour
    // carries the stress cues this tool teaches with. Three-quarter back keeps the
    // long shadows reaching toward the viewer and the warm glow bleeding in at the
    // frame's left edge, while the crown's lit flank still shows its true greens. A
    // mature crown fills the frame, so the disc itself belongs to seedlings, winter
    // silhouettes and anyone who orbits — which is an invitation, not a loss.
    var sunAz = 2.85 + (season === 'winter' ? 0.45 : 0) - (season === 'summer' ? 0.18 : 0);
    var sunDir = new THREE.Vector3(
      Math.cos(sunEl) * Math.sin(sunAz), Math.sin(sunEl), Math.cos(sunEl) * Math.cos(sunAz)
    ).normalize();
    var pal = skyPalette(season, !!api.dark, dry);
    // ── The SKY answers the low sun, not just the disc. ──
    //
    // The disc was already reddening and sinking as the light slider fell, but the sky
    // behind it stayed full midday blue — half a sunset. Real dusk warms the horizon
    // hardest, the mid-sky a little, and deepens the zenith; doing exactly that, keyed
    // to the same slider, is what turns "the lamp got dimmer" into "the day is ending".
    // The fog, the scene background and the hemisphere light are all derived from pal
    // downstream, so the whole landscape inherits the hour without touching them.
    var lowSun = clamp((clamp(1 - lightLevel, 0, 1) - 0.25) / 0.75, 0, 1);
    if (!flat && lowSun > 0) {
      // Dark mode's dusk palette is already warm-dimmed; full strength on top of it
      // pushes to muddy orange.
      var warmAmt = api.dark ? lowSun * 0.6 : lowSun;
      pal = {
        hi: mixHex(pal.hi, '#3d5a8c', warmAmt * 0.30),
        mid: mixHex(pal.mid, '#e79b62', warmAmt * 0.30),
        lo: mixHex(pal.lo, '#ffb469', warmAmt * 0.58),
        sun: pal.sun
      };
    }
    // A low sun reddens everything, which is most of what makes late light beautiful.
    var sunHex = mixHex(pal.sun, '#ff8a3c', clamp(1 - lightLevel, 0, 1) * 0.6);

    // ── Light reaching the FLOOR. ──
    //
    // Not invented for the picture: this is the same Beer-Lambert extinction the engine
    // uses to shade a tree's own leaves (effectiveLeafArea), applied to the light that
    // gets past them. A closed canopy really does starve its own understorey, and it is
    // the mechanism behind the tool's central brake — twice the leaf area is not twice
    // the carbon — so drawing it costs nothing in honesty and shows the student the
    // consequence of a number they are already watching.
    //
    // What is drawn is the LIGHT FIELD, not a vegetation simulation. The engine models
    // no ground plants, so ground cover thins and thickens as an illustration of shade,
    // and nothing anywhere reads a number back off it.
    var canopyGround = Math.pow(Math.max(0.01, leafArea), 0.66) * 1.2;
    // Scaled by the canopy that is actually DRAWN. leafArea is an annual figure and the
    // engine has no seasonal term, so on its own it shaded the ground just as hard under
    // a bare winter tree as under a closed summer one — the picture contradicting
    // itself, deep shade beneath a tree with no leaves in it. This does not invent a
    // number; it stops the drawing disagreeing with the drawing.
    var canopyLai = (leafArea / canopyGround) * clamp(visual.leafDensity, 0, 1);
    var floorLight = clamp(lightLevel * Math.exp(-0.5 * canopyLai), 0, 1);

    // Soil moisture as a CONTINUOUS ground tint rather than a dry/not-dry switch. The
    // student moves soil water on a slider; the biggest surface in frame should answer
    // in kind instead of waiting for a threshold to trip.
    var soilWet = clamp(typeof props.soilWater === 'number' ? props.soilWater : 0.7, 0, 1);
    // 0 at parched, 1 at saturated, centred so ordinary conditions sit mid-range.
    var damp = clamp((soilWet - 0.15) / 0.65, 0, 1);

    var groundNear, groundFar;
    if (season === 'winter') { groundNear = api.dark ? '#43463d' : '#918a78'; groundFar = api.dark ? '#353b38' : '#7b7a6b'; }
    else if (dry)            { groundNear = api.dark ? '#6b5c3e' : '#c3ab6c'; groundFar = api.dark ? '#4a3f2b' : '#a28d57'; }
    else if (season === 'autumn') { groundNear = api.dark ? '#55502c' : '#8a8b4c'; groundFar = api.dark ? '#464426' : '#7c7d44'; }
    else { groundNear = api.dark ? '#3d5230' : '#688f4d'; groundFar = api.dark ? '#33452a' : '#5c8144'; }
    // Applied on top of the seasonal choice above so it composes with all four, and
    // only outside high contrast, where every decorative tint is suppressed anyway.
    if (!flat && season !== 'winter') {
      var parchHex = api.dark ? '#7a6636' : '#c9b477';
      var lushHex = api.dark ? '#2f4a27' : '#4f7d3c';
      groundNear = mixHex(mixHex(groundNear, parchHex, (1 - damp) * 0.45), lushHex, damp * 0.22);
      groundFar = mixHex(mixHex(groundFar, parchHex, (1 - damp) * 0.38), lushHex, damp * 0.18);
      // Low light gilds the grass the way it gilds the sky — faintly, or the lawn
      // reads as autumn when the student only moved the light slider.
      if (lowSun > 0) {
        groundNear = mixHex(groundNear, '#d99a55', lowSun * 0.14);
        groundFar = mixHex(groundFar, '#d99a55', lowSun * 0.10);
      }
    }

    // ── Sky dome, sun, fog ────────────────────────────────────────────────
    var sky = null;
    // Declared HERE, above the background block that assigns them — an initialiser
    // lower down would hoist its declaration and then RUN later, wiping the
    // assignment. That is the exact bug that ate crownMaxR.
    var birdMesh = null, birdSeeds = null;
    if (!flat) {
      var cloudHex = api.dark ? mixHex(pal.mid, '#ffd9a8', 0.35) : '#ffffff';
      // Sunset clouds are lit from below and carry the dusk colour; pure white puffs
      // over a warm band read as pasted on.
      if (lowSun > 0) cloudHex = mixHex(cloudHex, '#ffbd8c', lowSun * 0.55);
      var skyTex = skyTexture(THREE, pal, cloudHex, season === 'winter' ? 210 : 150, !!api.dark,
        lowSun > 0 ? { hex: '#ffab5e', a: (api.dark ? 0.6 : 1) * lowSun * 0.55 } : null);
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
        // The warm WASH around the sun, not the sun. Real sky is not a flat gradient
        // with a disc on it: the air around the sun is bright for tens of degrees, and
        // that wash is most of what makes a sky read as luminous rather than painted.
        // A second, much larger and much fainter sprite at the SAME position — built
        // from the same sunDir, so it can never sit off-axis from the disc the way a
        // glow painted into the sky texture's UV space could.
        var glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: sunTex, transparent: true, depthTest: false, depthWrite: false,
          fog: false, blending: THREE.AdditiveBlending,
          // Stronger when the sun is low: haze scatters more light near the horizon,
          // and the low-sun scene is the one that wants to feel golden.
          opacity: (api.dark ? 0.30 : 0.22) + clamp(1 - lightLevel, 0, 1) * 0.18
        }));
        glowSprite.scale.setScalar(30);
        glowSprite.position.copy(sunDir).multiplyScalar(25);
        glowSprite.renderOrder = -999;
        group.add(glowSprite);

        var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: sunTex, transparent: true, depthTest: false, depthWrite: false,
          fog: false, blending: THREE.AdditiveBlending, opacity: api.dark ? 0.95 : 0.8
        }));
        sunSprite.scale.setScalar(10);
        sunSprite.position.copy(sunDir).multiplyScalar(26);
        sunSprite.renderOrder = -998;
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
    // ★ Declared HERE, above the branch builder, and not beside crownTopY below.
    // `var` hoists, so an initialiser further down still RUNS later: the branch loop
    // accumulated into these correctly and then the assignment underneath reset them to
    // their seed values. A bare winter tree, whose only extent comes from branches, was
    // framed as if it were a fifth of its real width.
    var crownMaxR = 0;
    var bareTopY = 0;
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
      // Every branch END counts toward the silhouette, not just the ones that end up
      // carrying foliage. In leaf this is redundant — the masses hung off these tips
      // reach further anyway — but a BARE winter broadleaf has no masses and no cards,
      // so without this its extent was never measured at all: crownMaxR stayed at its
      // seed value, the camera framed a tree far smaller than the one on screen, and
      // every branch ran off all four edges.
      var tipRad = Math.sqrt(end.x * end.x + end.z * end.z);
      if (tipRad > crownMaxR) crownMaxR = tipRad;
      if (end.y > bareTopY) bareTopY = end.y;
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
    // Seeded, never reset: the branch builder above has already contributed to this.
    if (crownMaxR < crownR * 0.6) crownMaxR = crownR * 0.6;
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
      // Bare winter: the branches ARE the silhouette, so the crown top is wherever the
      // highest branch end actually reached rather than the nominal trunk height. The
      // 4th branch order a bare tree earns carries limbs well above H.
      crownTopY = Math.max(H, bareTopY);
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
      // Slender, from the CLONE's own height — not a fraction of the parent's trunk.
      // At 62% of the parent's radius and a sixth of its height, every sucker was a
      // squat white cone with a pancake of leaves: mushrooms ringing the tree. A root
      // sucker is a pole. The parent's radius only caps it so a seedling parent cannot
      // have suckers thicker than itself.
      var cr3 = Math.min(trunkR * 0.5, chh * 0.032);
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
        // A young broadleaf's crown is a narrow COLUMN of foliage on its pole, not a
        // ball balanced on top. Stretched vertically and dropped slightly, so the
        // foliage clothes the upper stem the way a real sucker's does.
        if (!needle) {
          ctop.scale.set(0.8, 1.5, 0.8);
          ctop.position.y = chh * 0.98;
        }
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
          // Same elongation as the mass beneath them, or the column wears a spherical
          // halo of leaves and the pancake is back.
          var cOff = cdir.clone().multiplyScalar(ctopR * (0.72 + crnd() * 0.44));
          if (!needle) { cOff.x *= 0.8; cOff.z *= 0.8; cOff.y *= 1.5; }
          var cp = ctop.position.clone().add(cOff);
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
    var soilHex = dry ? '#6f5131' : '#59412c';
    var soilTex = flat ? null : soilTexture(THREE, soilHex, damp);
    var soilWindow = new THREE.Mesh(
      // A few more segments now the rim is meant to be invisible: at 40 the alpha
      // falloff was landing on a faintly polygonal outline.
      new THREE.CircleGeometry(Math.min(lawnR * 0.42, rootSpread * 1.28), 64),
      new THREE.MeshPhongMaterial({
        color: flat ? 0x111111 : (soilTex ? 0xffffff : new THREE.Color(soilHex).getHex()),
        map: soilTex,
        transparent: !!soilTex,
        // The disc sits 3mm above the lawn and is drawn after it. Writing depth from a
        // transparent edge would punch a hole in the ground for anything behind it.
        depthWrite: !soilTex,
        side: THREE.DoubleSide, shininess: 0
      })
    );
    soilWindow.rotation.x = -Math.PI / 2;
    soilWindow.position.y = 0.003;
    soilWindow.renderOrder = 1;
    group.add(soilWindow);

    // One seasonal ground-detail draw call: drought cracks OR fallen autumn leaves.
    // Shape carries the cue, so it remains useful without depending on colour alone.
    // Needle duff is the evergreen counterpart to autumn leaf fall, and the reason a
    // conifer's floor looks the way it does all year: needles shed continuously and rot
    // slowly, so the litter is always there rather than arriving in one season.
    var needleDuff = needle && alive && !cracked;
    if (!flat && (cracked || needleDuff || (season === 'autumn' && !needle && alive))) {
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
        // Duff is denser and finer than leaf fall, and it is needles rather than
        // blades, so it gets a longer, thinner card and a rust-brown palette.
        var DUFF = ['#6b4a2c', '#7d5733', '#5c3f26', '#8a6238', '#6f5130'];
        var litterCount = needleDuff ? 76 : 52;
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
          var ls = crownR * (needleDuff ? (0.012 + litterRnd() * 0.014) : (0.020 + litterRnd() * 0.025));
          litterDummy.position.set(Math.cos(la) * ld, 0.014, Math.sin(la) * ld);
          litterDummy.rotation.set(-Math.PI / 2, 0, litterRnd() * 6.2832);
          // Needles are long and thin; a fallen broadleaf is closer to round.
          litterDummy.scale.set(ls * (needleDuff ? 3.4 : 1.45), ls, ls);
          litterDummy.updateMatrix();
          litter.setMatrixAt(lit, litterDummy.matrix);
          litterColor.set(needleDuff ? DUFF[lit % DUFF.length] : AUTUMN[lit % AUTUMN.length]);
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

      // ── Hills beyond the wood. ──
      //
      // The treeline ended at a flat horizon line, so the world visibly stopped where
      // the trees did. One ring of low domes behind it gives the landscape a third
      // depth plane, and aerial perspective comes free: they are unlit and fogged like
      // the treeline (a lit distant hill comes back brighter than the subject), and at
      // 20-28 units they sit deep in the 14-62 fog band, so each is hazier the further
      // back it stands. One InstancedMesh, one draw call.
      var NHILL = 9;
      var hillMat = farMat(mixHex(farHex, pal.lo, 0.35));
      var hills = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), hillMat, NHILL);
      var hrnd = seeded(9377);
      for (var hI = 0; hI < NHILL; hI++) {
        var ha = hrnd() * 6.2832;
        var hd = 20 + hrnd() * 8;
        var hw = 6 + hrnd() * 7;
        var hh2 = 1.1 + hrnd() * 1.9;
        // Centre sits at y=0 so only the upper half shows: a dome, not a ball.
        dummy.position.set(Math.cos(ha) * hd, 0, Math.sin(ha) * hd);
        dummy.scale.set(hw, hh2, hw * (0.7 + hrnd() * 0.5));
        dummy.rotation.set(0, ha + hrnd(), 0);
        dummy.updateMatrix();
        hills.setMatrixAt(hI, dummy.matrix);
      }
      hills.instanceMatrix.needsUpdate = true;
      group.add(hills);

      // ── A far flock. ──
      //
      // Nothing in this scene was ALIVE except the tree. A handful of distant birds
      // circling the wood is the cheapest life a landscape can carry: six instances of
      // one chevron card, repositioned in frame(). Built only when motion runs — under
      // reduced motion a flock frozen mid-air reads as debris, the same rule as the
      // falling leaves. Winter keeps them; geese do not leave with the leaves.
      if (!reduced) {
        var birdTex = birdTexture(THREE);
        if (birdTex) {
          var NBIRD = 6;
          birdMesh = new THREE.InstancedMesh(
            new THREE.PlaneGeometry(1, 0.5),
            new THREE.MeshBasicMaterial({
              map: birdTex, alphaTest: 0.35, transparent: false,
              color: new THREE.Color(api.dark ? '#1c2430' : '#2a3038').getHex(),
              side: THREE.DoubleSide, fog: true
            }), NBIRD);
          birdSeeds = [];
          for (var bI = 0; bI < NBIRD; bI++) {
            var seed = {
              // Loose formation: shared centre, individual radius, height and phase.
              // Heights in WORLD units, and the whole normalised scene is 2.6 of them:
              // a first pass at 5.2 put every bird above the frame for the default
              // camera, which is a flock nobody would ever see.
              r: 10 + (bI % 3) * 1.4,
              h: 2.7 + ((bI * 5) % 4) * 0.35,
              ph: bI * 1.05,
              sc: 0.34 + (bI % 2) * 0.10,
              flap: 2.6 + (bI % 3) * 0.5
            };
            birdSeeds.push(seed);
            // Placed at build, not left for the first frame(): a fresh InstancedMesh
            // is six identity matrices, which is six chevrons inside the trunk for
            // one visible frame.
            dummy.position.set(Math.cos(seed.ph) * seed.r, seed.h, Math.sin(seed.ph) * seed.r);
            dummy.rotation.set(-1.25, -seed.ph, 0);
            dummy.scale.setScalar(seed.sc);
            dummy.updateMatrix();
            birdMesh.setMatrixAt(bI, dummy.matrix);
          }
          birdMesh.instanceMatrix.needsUpdate = true;
          birdMesh.renderOrder = -500;   // over the sky, under everything near
          group.add(birdMesh);
        }
      }

      // ── Undergrowth. A handful of grass tufts and low scrub around the foot of the
      //    tree. They cost one draw call and they are the only thing in frame that
      //    gives the trunk a SCALE to be read against. ──
      // A first pass used little CONES for these and scattered what looked like a
      // hundred toy Christmas trees over the lawn. Grass is blades, so it gets the
      // same alpha-tested card treatment the canopy does.
      var grassTex = grassTexture(THREE);
      if (grassTex) {
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
        // ── Where the ground cover actually grows. ──
        //
        // Uniform scatter is what made the foreground read as empty wallpaper: the same
        // 150 tufts at the same spacing whatever the tree or the light was doing. Now
        // each candidate is KEPT against the light at that spot, so the shade of a
        // closed crown is drawn as a thinning, and a bright gap fills in.
        //
        // Candidates are collected first and the mesh is sized to what survived: an
        // InstancedMesh renders its full count, so leftover instances would pile up at
        // the origin as a bright tuft growing out of the trunk.
        var placed = [];
        var trnd = seeded(3331);
        var CANDIDATES = 210;
        for (var ti = 0; ti < CANDIDATES; ti++) {
          var ta = trnd() * 6.2832;
          // Nothing right at the foot: trampled bare ground under a canopy is real,
          // and tufts there would bury the root flare the Spread view needs to show.
          var td = lawnR * (0.30 + trnd() * 0.95);
          // Under the crown a plant gets floorLight; past the drip line it gets the
          // open sky. Softened across the edge rather than switched, so there is no
          // ring of grass tracing the canopy outline.
          var edge = clamp((td - crownR * 0.55) / Math.max(0.001, crownR * 0.9), 0, 1);
          var here = floorLight + (lightLevel - floorLight) * edge;
          // Sparse everywhere is still a lawn, so keep a floor: bare earth under a
          // dense canopy is the point, empty frame is not.
          if (trnd() > 0.20 + here * 0.80) continue;
          var ts = 0.055 + trnd() * 0.048;
          placed.push({
            x: Math.cos(ta) * td, z: Math.sin(ta) * td, s: ts,
            r: trnd() * 6.2832, t: (trnd() - 0.5) * 0.24,
            // Shade plants are darker and lankier. A subtle cue, but it is the one the
            // eye reads as depth rather than as a different kind of plant.
            dim: 1 - clamp(1 - here, 0, 1) * 0.30
          });
        }
        if (placed.length) {
          var tufts = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), tuftMat, placed.length);
          var tuftColor = new THREE.Color();
          for (var tp = 0; tp < placed.length; tp++) {
            var P = placed[tp];
            dummy.position.set(P.x, P.s * 0.48, P.z);
            dummy.scale.set(P.s, P.s, P.s);
            dummy.rotation.set(0, P.r, P.t);
            dummy.updateMatrix();
            tufts.setMatrixAt(tp, dummy.matrix);
            if (!flat) {
              tuftColor.set(tuftMat.color).multiplyScalar(P.dim);
              tufts.setColorAt(tp, tuftColor);
            }
          }
          tufts.instanceMatrix.needsUpdate = true;
          if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
          group.add(tufts);
        }
        // What the shade actually did, for a test that would otherwise have to count
        // pixels. floorLight is the claim; groundCover is the drawing of it.
        try {
          window.__alloTreeLabScene = {
            floorLight: floorLight, lightLevel: lightLevel, canopyLai: canopyLai,
            groundCover: placed.length, candidates: CANDIDATES, damp: damp
          };
        } catch (e) {}
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

      // Clouds drift. One rotation write on the sky dome per frame: the slowest motion
      // in the scene, and the one that makes a still frame feel like a paused video
      // rather than a poster. Under reduced motion this function has already returned.
      if (sky) sky.rotation.y = t * 0.0035;

      // The flock. A slow shared circuit with per-bird radius, height and phase, plus
      // a wing-flap squash. Distance does the rest: at nine units out a chevron card
      // and a real silhouette are the same thing.
      if (birdMesh && birdSeeds) {
        for (var bi2 = 0; bi2 < birdSeeds.length; bi2++) {
          var B = birdSeeds[bi2];
          var ba = t * 0.10 + B.ph;
          cardDummy.position.set(
            Math.cos(ba) * B.r,
            B.h + Math.sin(t * 0.5 + B.ph * 2) * 0.25,
            Math.sin(ba) * B.r
          );
          // Face along the flight path, laid nearly flat so the chevron reads from
          // the low camera angle.
          cardDummy.rotation.set(-1.25, -ba, 0);
          var flap = 1 + Math.sin(t * B.flap * 2.4 + B.ph) * 0.35;
          cardDummy.scale.set(B.sc, B.sc * flap, B.sc);
          cardDummy.updateMatrix();
          birdMesh.setMatrixAt(bi2, cardDummy.matrix);
        }
        birdMesh.instanceMatrix.needsUpdate = true;
      }
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
  var FULLSCREEN_RETURN_FOCUS = null;
  function setImmersiveBodyClass(on) {
    if (typeof document === 'undefined' || !document.body) return;
    try {
      if (on) document.body.classList.add(IMMERSIVE_CLASS);
      else document.body.classList.remove(IMMERSIVE_CLASS);
    } catch (e) {}
  }

  // ── Places, expressed as CONDITIONS. ──
  //
  // The temptation with scenery is a biome picker: rainforest, desert, tundra. This
  // engine has no biome term, so those would be costumes, and the tool would owe the
  // same disclaimer the season panel already carries ("changing this changes what you
  // are looking at, not a figure the model recalculated"). A caption admitting the
  // scenery means nothing is worse than no scenery.
  //
  // These are not costumes. Each one WRITES the light, water and temperature the engine
  // already models, so the picture changes because the conditions changed — and the
  // limiting factor moves with it, which is the lesson rather than a backdrop. Each is
  // a real place a tree grows, and each one makes a different factor the limit.
  var ENV_PLACES = [
    {
      id: 'open', emoji: '🌤', label: 'Open field',
      light: 0.95, soilWater: 0.65, tempC: 22,
      note: 'Full sun and nothing competing for it. Most trees are limited by something else here.'
    },
    {
      id: 'understory', emoji: '🌑', label: 'Deep shade',
      light: 0.18, soilWater: 0.75, tempC: 20,
      note: 'The floor of a closed wood. Plenty of water, almost no light, and light becomes the limit.'
    },
    {
      id: 'grassland', emoji: '🏜', label: 'Dry grassland',
      light: 0.95, soilWater: 0.20, tempC: 28,
      note: 'Bright and hot with little soil water. The stomata close, and water limits everything.'
    },
    {
      id: 'valley', emoji: '⛰', label: 'Sheltered valley',
      light: 0.70, soilWater: 0.85, tempC: 18,
      note: 'Damp, mild and part-shaded. Close to comfortable for most of these species.'
    },
    {
      id: 'cold', emoji: '❄️', label: 'Cold mountainside',
      light: 0.85, soilWater: 0.55, tempC: 6,
      note: 'Light and water are fine; it is simply too cold for the chemistry to run quickly.'
    }
  ];

  // Playback speeds in simulated years per real second.
  //
  // "Above that they would only strobe" used to be the reason every speed past the
  // slowest pinned the scene to summer. That strobe was the shared viewer tearing
  // down and rebuilding its WebGL renderer on each key change, and it is fixed:
  // content now swaps in place. Seasons therefore run at 1 yr/s too, where a season
  // lasts a quarter second and the canopy cycle is brisk but legible.
  //
  // 5 and 25 yr/s stay pinned to summer, and that is now a READABILITY judgement
  // rather than a technical limit: twenty season changes a second is a flicker no
  // student can read, flash or no flash.
  var SPEEDS = [
    { id: 'seasons', label: 'Seasons', yps: 0.5, seasonal: true, hint: 'One year every two seconds. Watch the canopy come and go.' },
    { id: 'slow', label: '1 yr/s', yps: 1, seasonal: true, hint: 'A ring a second, seasons and all.' },
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
      // The 3-D shell owns the part labels and reads them from cfg on demand, so they
      // are refreshed here rather than at module load, where ctx.t does not exist yet.
      TREE_PARTS.forEach(function (p) { p.label = __alloT('stem.treelab.part_' + p.id, p.en); });
      // Grade band names reach the screen in the quiz subtitle and the level menu.
      function bandLabel(b) { return __alloT('stem.treelab.band_' + b, BAND_LABEL[b] || b); }
      // Clock speeds: the label is on the button, the hint under it, and both are
      // spoken on change. All three read the same two keys.
      function speedLabel(o) { return __alloT('stem.treelab.speed_' + o.id, o.label); }
      function speedHint(o) { return __alloT('stem.treelab.speed_hint_' + o.id, o.hint); }
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
        // width:100% + border-box, because the mounting context is not always a block
        // formatting context. As a flex item (the e2e harness wrap, and any hub layout
        // that reaches for flex) a block div shrinks to fit-content, so the tool was
        // a different width on every tab — as wide as its widest fixed element. And
        // align-self:flex-start, because a fixed-height flex row STRETCHES the item to
        // that height: content past it overflowed the painted background. The explicit
        // width keeps flex-column parents from shrink-wrapping the width instead.
        '.allo-tree-lab{position:relative;isolation:isolate;overflow:visible;width:100%;box-sizing:border-box;min-width:0;align-self:flex-start;border:1px solid var(--lab-edge);}',
        '.allo-tree-lab:before{content:"";position:absolute;inset:0 0 auto 0;height:430px;pointer-events:none;z-index:-1;background:radial-gradient(circle at 7% 4%,var(--tree-glow),transparent 32%),radial-gradient(circle at 91% 2%,var(--sun-glow),transparent 26%),linear-gradient(155deg,var(--canopy-wash),transparent 58%);}',
        '.allo-tree-hero{position:relative;overflow:hidden;isolation:isolate;}',
        '.allo-tree-hero:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 76% 18%,var(--hero-speck) 0 2px,transparent 2.5px);background-size:24px 24px;opacity:.72;}',
        '.allo-tree-hero:after{content:"";position:absolute;width:260px;height:260px;right:-98px;bottom:-174px;border-radius:50%;border:42px solid var(--hero-ring);box-shadow:0 0 0 26px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-hero-copy{max-width:680px;}',
        '.allo-tree-hero-title{font-size:clamp(27px,3vw,38px)!important;}',
        '.allo-tree-hero-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;}',
        '.allo-tree-hero-stat{display:grid;gap:1px;min-width:104px;padding:8px 11px;border-radius:12px;background:var(--hero-chip);border:1px solid var(--hero-chip-border);box-shadow:0 7px 18px var(--tree-shadow);}',
        '.allo-tree-hero-stat-label{font-size:9px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-hero-stat-value{font-size:13px;font-weight:850;color:var(--tree-ink);}',
        '.allo-tree-setup-label{flex:1 0 100%;font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-workbench{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);grid-template-areas:"scene mission" "scene controls";grid-template-rows:auto minmax(0,1fr);gap:20px;align-items:start;}',
        '.allo-tree-workbench-mission{grid-area:mission;min-width:0;}',
        '.allo-tree-workbench-mission>.allo-tree-mission>.allo-tree-card{margin-bottom:0!important;}',
        '.allo-tree-workbench-scene{grid-area:scene;min-width:0;}',
        '.allo-tree-workbench-controls{grid-area:controls;min-width:0;}',
        '.allo-tree-workbench>*{min-width:0;}',
        '.allo-tree-workbench-sticky{position:sticky;top:12px;}',
        '.allo-tree-workbench-scene>.allo-tree-workbench-sticky>.allo-tree-card{border-color:var(--scene-edge)!important;box-shadow:0 22px 50px var(--scene-shadow)!important;}',
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
        'body.allo-treelab-immersive{overflow:hidden!important;overscroll-behavior:none;}',
        '.allo-tree-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;}',
        '.allo-tree-card{transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease;background-clip:padding-box;}',
        '.allo-tree-quiz-opt{transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;}',
        '.allo-tree-quiz-opt:not(:disabled):hover{border-color:var(--tree-accent);transform:translateY(-1px);box-shadow:0 4px 12px var(--tree-shadow);}',

        '.allo-tree-button,.allo-tree-tab{transition:transform .14s ease,box-shadow .14s ease,background .14s ease,border-color .14s ease;}',
        '.allo-tree-button:not(:disabled):hover,.allo-tree-tab:hover{transform:translateY(-1px);box-shadow:0 5px 14px var(--tree-shadow);}',
        '.allo-tree-button.is-primary{box-shadow:0 7px 16px var(--accent-shadow);font-weight:850;}',
        '.allo-tree-button:focus-visible,.allo-tree-tab:focus-visible,.allo-tree-lab select:focus-visible,.allo-tree-lab input:focus-visible,.allo-tree-lab textarea:focus-visible{outline:3px solid var(--tree-focus);outline-offset:2px;}',
        '.allo-tree-tabs{scrollbar-width:thin;position:relative;scroll-snap-type:x proximity;scroll-padding-inline:8px;}',
        '.allo-tree-tab{position:relative;text-align:left;scroll-snap-align:center;scroll-margin-inline:8px;}',
        '.allo-tree-tab-icon{display:inline-flex;flex:0 0 32px;width:32px;height:32px;align-items:center;justify-content:center;border-radius:10px;background:var(--tab-icon);font-size:16px;}',
        '.allo-tree-tab-copy{display:grid;min-width:0;gap:1px;}',
        '.allo-tree-tab-label{font-size:13px;font-weight:850;line-height:1.15;}',
        '.allo-tree-tab-hint{font-size:9.5px;font-weight:650;line-height:1.2;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.allo-tree-tab[aria-selected="true"]{box-shadow:0 8px 20px var(--accent-shadow);}',
        '.allo-tree-tab[aria-selected="true"]:after{content:"";position:absolute;left:13px;right:13px;bottom:4px;height:3px;border-radius:99px;background:currentColor;opacity:.48;}',
        '.allo-tree-chapter{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;margin:-2px 0 16px;padding:12px 15px;border-radius:15px;background:var(--chapter-bg);border:1px solid var(--chapter-border);box-shadow:0 10px 28px var(--tree-shadow);}',
        '.allo-tree-chapter-number{display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:var(--tree-accent);color:var(--accent-ink);font-size:12px;font-weight:950;box-shadow:0 8px 18px var(--accent-shadow);}',
        '.allo-tree-chapter-title{margin:0;font-size:15px;font-weight:900;line-height:1.2;color:var(--tree-ink);}',
        '.allo-tree-chapter-title:focus-visible{outline:3px solid var(--tree-focus);outline-offset:4px;border-radius:5px;}',
        '.allo-tree-chapter-copy{font-size:11px;line-height:1.45;color:var(--tree-muted);margin-top:2px;}',
        '.allo-tree-chapter-cue{max-width:205px;padding-left:12px;border-left:1px solid var(--chapter-border);font-size:10px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-chapter-bridge{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;margin:16px 0 10px;padding:15px 16px;border:1px solid var(--mission-border);border-radius:16px;background:var(--mission-bg);box-shadow:0 14px 32px var(--mission-shadow);}',
        '.allo-tree-chapter-bridge:after{content:"";position:absolute;width:120px;height:120px;right:-58px;top:-72px;border-radius:50%;background:var(--mission-orb);pointer-events:none;}',
        '.allo-tree-chapter-bridge-copy,.allo-tree-chapter-bridge-actions{position:relative;z-index:1;}',
        '.allo-tree-chapter-bridge-copy{display:grid;gap:4px;min-width:0;}',
        '.allo-tree-chapter-bridge-eyebrow{font-size:9.5px;font-weight:950;letter-spacing:.09em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-chapter-bridge-title{font-size:15px;line-height:1.25;color:var(--tree-ink);}',
        '.allo-tree-chapter-bridge-note{max-width:720px;font-size:11px;line-height:1.5;color:var(--tree-muted);}',
        '.allo-tree-chapter-bridge-path{display:flex;align-items:center;gap:7px;margin-top:4px;color:var(--tree-muted);font-size:10px;font-weight:850;}',
        '.allo-tree-chapter-bridge-node{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--hero-chip);}',
        '.allo-tree-chapter-bridge-node.is-next{border-color:var(--tree-accent);color:var(--tree-ink);}',
        '.allo-tree-chapter-bridge-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;}',
        '.allo-tree-chapter-bridge-actions .allo-tree-button{margin:0!important;}',
        '.allo-tree-flow-marker{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;margin:7px 2px 11px;padding:2px 4px;}',
        '.allo-tree-flow-number{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:var(--flow-badge);border:1px solid var(--chapter-border);color:var(--tree-accent);font-size:11px;font-weight:950;}',
        '.allo-tree-flow-title{font-size:12px;font-weight:900;color:var(--tree-ink);}',
        '.allo-tree-flow-copy{font-size:10.5px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-science-trail{position:relative;overflow:hidden;margin:0 0 14px;padding:14px;border:1px solid var(--chapter-border);border-radius:18px;background:linear-gradient(135deg,var(--chapter-bg),var(--mission-bg));box-shadow:0 15px 34px var(--tree-shadow);}',
        '.allo-tree-science-trail:after{content:"";position:absolute;width:150px;height:150px;right:-78px;top:-94px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 22px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-science-head,.allo-tree-science-grid{position:relative;z-index:1;}',
        '.allo-tree-science-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px 11px;align-items:center;}',
        '.allo-tree-science-compass{grid-row:1/3;display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:var(--tree-accent);color:var(--accent-ink);font-size:20px;box-shadow:0 9px 20px var(--accent-shadow);}',
        '.allo-tree-science-kicker{font-size:9.5px;font-weight:950;letter-spacing:.1em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-science-title{margin:0;font-size:14px;font-weight:950;line-height:1.25;color:var(--tree-ink);}',
        '.allo-tree-science-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;list-style:none;margin:12px 0 0;padding:0;}',
        '.allo-tree-science-step{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;align-content:start;min-width:0;padding:11px;border:1px solid var(--chapter-border);border-top:3px solid var(--tree-accent);border-radius:13px;background:var(--hero-chip);box-shadow:0 8px 18px var(--tree-shadow);}',
        '.allo-tree-science-step:not(:last-child):after{content:"\\2192";position:absolute;z-index:2;right:-16px;top:50%;display:grid;place-items:center;width:20px;height:20px;margin-top:-10px;border:1px solid var(--chapter-border);border-radius:50%;background:var(--chapter-bg);color:var(--tree-accent);font-size:12px;font-weight:950;}',
        '.allo-tree-science-index{grid-row:1/3;display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:var(--flow-badge);color:var(--tree-accent);font-size:11px;font-weight:950;}',
        '.allo-tree-science-label{font-size:9.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-science-step strong{font-size:11.5px;line-height:1.3;color:var(--tree-ink);}',
        '.allo-tree-science-copy{grid-column:1/-1;margin-top:3px;font-size:10.5px;line-height:1.48;color:var(--tree-muted);}',
        '@media (max-width:760px){.allo-tree-science-grid{grid-template-columns:minmax(0,1fr)}.allo-tree-science-step:not(:last-child):after{display:none}.allo-tree-science-step{grid-template-columns:auto minmax(0,1fr);padding:10px 11px}.allo-tree-science-copy{grid-column:2}}',
        '.allo-tree-mission>.allo-tree-card{position:relative;overflow:hidden;border-color:var(--mission-border)!important;background:var(--mission-bg)!important;box-shadow:0 16px 36px var(--mission-shadow)!important;}',
        '.allo-tree-mission>.allo-tree-card:after{content:"";position:absolute;width:130px;height:130px;right:-54px;top:-72px;border-radius:50%;background:var(--mission-orb);pointer-events:none;}',
        '.allo-tree-mission-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0;}',
        '.allo-tree-mission-step{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:center;padding:8px;border-radius:10px;background:var(--mission-step);border:1px solid var(--chapter-border);font-size:10.5px;line-height:1.3;color:var(--tree-ink);}',
        '.allo-tree-mission-dot{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--flow-badge);border:1px solid var(--chapter-border);color:var(--tree-accent);font-size:10px;font-weight:950;}',
        '.allo-tree-viewer-card{position:relative;padding:12px!important;background:var(--chapter-bg)!important;border-color:var(--scene-edge)!important;box-shadow:0 24px 54px var(--scene-shadow)!important;}',
        '.allo-tree-viewer-card:before{content:"";position:absolute;inset:0 0 auto;height:4px;border-radius:16px 16px 0 0;background:linear-gradient(90deg,var(--tree-accent),transparent 72%);pointer-events:none;}',
        '.allo-tree-viewer-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 12px;align-items:center;padding:7px 6px 10px;}',
        '.allo-tree-viewer-name{font-size:15px;font-weight:900;line-height:1.2;color:var(--tree-ink);}',
        '.allo-tree-viewer-metrics{font-size:10.5px;font-weight:750;color:var(--tree-muted);text-align:right;}',
        '.allo-tree-viewer-limit{grid-column:1/-1;justify-self:start;display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;background:var(--mission-step);font-size:9.5px;font-weight:850;color:var(--tree-ink);}',
        '.allo-tree-viewer-limit:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--tree-accent);box-shadow:0 0 0 3px var(--flow-badge);}',
        '.allo-tree-habitat-ribbon{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:0 0 9px;padding:7px;border-radius:13px;background:var(--mission-step);border:1px solid var(--chapter-border);}',
        '.allo-tree-habitat-item{position:relative;min-width:0;padding:7px 8px;border-radius:9px;background:var(--hero-chip);border:1px solid var(--chapter-border);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-habitat-item.is-limiting{transform:translateY(-1px);box-shadow:0 6px 15px var(--tree-shadow);}',
        '.allo-tree-habitat-top{display:flex;align-items:center;justify-content:space-between;gap:4px;}',
        '.allo-tree-habitat-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-habitat-value{display:block;margin-top:2px;font-size:12px;font-weight:900;color:var(--tree-ink);}',
        '.allo-tree-habitat-badge{padding:2px 4px;border-radius:999px;background:var(--flow-badge);font-size:8.5px;font-weight:950;letter-spacing:.05em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-habitat-track{display:block;height:3px;margin-top:6px;border-radius:99px;background:var(--chapter-border);overflow:hidden;}',
        '.allo-tree-habitat-fill{display:block;height:100%;border-radius:99px;}',
        '.allo-tree-season-observatory{position:relative;overflow:hidden;margin-top:11px;padding:12px;border:1px solid var(--chapter-border);border-radius:17px;background:var(--mission-bg);box-shadow:0 12px 26px var(--tree-shadow);}',
        '.allo-tree-season-observatory:after{content:"";position:absolute;width:150px;height:150px;right:-88px;top:-98px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 23px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-season-head,.allo-tree-season-choices,.allo-tree-season-portrait,.allo-tree-season-note,.allo-tree-season-boundary{position:relative;z-index:1;}',
        '.allo-tree-season-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;}',
        '.allo-tree-season-kicker{display:flex;align-items:center;gap:6px;font-size:9.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--season-hue);}',
        '.allo-tree-season-status{padding:3px 7px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--hero-chip);font-size:9px;font-weight:850;color:var(--tree-muted);}',
        '.allo-tree-season-choices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}',
        '.allo-tree-season-choice{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 7px;align-items:center;min-width:0;min-height:46px;padding:7px 8px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--hero-chip);color:var(--tree-ink);font:inherit;text-align:left;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-season-choice:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 8px 17px var(--tree-shadow);}',
        '.allo-tree-season-choice:focus-visible{outline:3px solid var(--tree-focus);outline-offset:2px;}',
        '.allo-tree-season-choice:disabled{cursor:not-allowed;opacity:.65;}',
        '.allo-tree-season-choice.is-current{border-color:var(--season-hue);box-shadow:inset 0 -3px 0 var(--season-hue),0 8px 18px var(--tree-shadow);}',
        '.allo-tree-season-choice-icon{grid-row:1/3;font-size:20px;line-height:1;}',
        '.allo-tree-season-choice strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;}',
        '.allo-tree-season-choice span:last-child{font-size:8.5px;font-weight:850;color:var(--tree-muted);}',
        '.allo-tree-season-portrait{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;margin-top:9px;padding:11px;border:1px solid var(--chapter-border);border-radius:14px;background:var(--chapter-bg);}',
        '.allo-tree-season-orb{display:grid;place-items:center;width:64px;height:64px;border:1px solid var(--chapter-border);border-radius:50%;background:radial-gradient(circle at 34% 28%,var(--hero-chip),var(--flow-badge));font-size:30px;box-shadow:inset 0 -4px 0 var(--season-hue),0 10px 22px var(--tree-shadow);animation:tree-season-breathe 3.2s ease-in-out infinite;}',
        '.allo-tree-season-title{display:block;font-size:14px;line-height:1.2;color:var(--tree-ink);}',
        '.allo-tree-season-copy{display:block;margin-top:3px;font-size:10.5px;line-height:1.48;color:var(--tree-muted);}',
        '.allo-tree-season-signals{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:0;}',
        '.allo-tree-season-signal{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1px 7px;align-items:center;min-width:0;padding:8px;border:1px solid var(--chapter-border);border-radius:11px;background:var(--mission-step);}',
        '.allo-tree-season-signal-icon{grid-row:1/3;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--flow-badge);font-size:15px;}',
        '.allo-tree-season-signal dt{font-size:8.5px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-season-signal dd{margin:0;font-size:10.5px;font-weight:900;line-height:1.3;color:var(--tree-ink);}',
        '.allo-tree-phenology{position:relative;z-index:1;margin-top:9px;padding:10px;border:1px solid var(--chapter-border);border-radius:14px;background:var(--chapter-bg);}',
        '.allo-tree-phenology-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 10px;margin-bottom:8px}.allo-tree-phenology-head strong{font-size:10.5px;color:var(--tree-ink)}.allo-tree-phenology-head span{font-size:8.5px;font-weight:850;color:var(--tree-muted)}',
        '.allo-tree-phenology-trail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0;padding:0;list-style:none}.allo-tree-phenology-stage{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 7px;align-items:center;min-width:0;padding:8px;border:1px solid var(--chapter-border);border-top:3px solid var(--phenology-tone);border-radius:11px;background:var(--mission-step)}.allo-tree-phenology-stage:not(:last-child):after{content:"\\2192";position:absolute;right:-13px;top:50%;z-index:2;display:grid;place-items:center;width:18px;height:18px;margin-top:-9px;border:1px solid var(--chapter-border);border-radius:50%;background:var(--chapter-bg);color:var(--tree-muted);font-size:10px;font-weight:950}',
        '.allo-tree-phenology-stage[aria-current="step"]{border-color:var(--season-hue);box-shadow:inset 0 -3px 0 var(--season-hue),0 7px 16px var(--tree-shadow)}.allo-tree-phenology-icon{grid-row:1/3;display:grid;place-items:center;width:29px;height:29px;border-radius:9px;background:var(--flow-badge);font-size:15px}.allo-tree-phenology-stage strong{font-size:9.5px;color:var(--tree-ink)}.allo-tree-phenology-stage span:last-child{font-size:8px;line-height:1.3;color:var(--tree-muted)}',
        '.allo-tree-phenology-stage.is-leaf-fall[aria-current="step"] .allo-tree-phenology-icon{animation:tree-leaf-drift 2.4s ease-in-out infinite}.allo-tree-phenology-process{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:start;margin-top:8px;padding-top:8px;border-top:1px dashed var(--chapter-border);font-size:9px;line-height:1.48;color:var(--tree-muted)}.allo-tree-phenology-process b{color:var(--season-hue)}',
        '.allo-tree-autumn-lab{position:relative;z-index:1;overflow:hidden;margin-top:9px;padding:10px;border:1px solid var(--chapter-border);border-left:4px solid var(--season-hue);border-radius:14px;background:linear-gradient(135deg,var(--chapter-bg),var(--mission-bg));}',
        '.allo-tree-autumn-lab-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 8px;align-items:center;margin-bottom:8px}.allo-tree-autumn-lab-mark{grid-row:1/3;display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:var(--flow-badge);font-size:17px}.allo-tree-autumn-lab-head strong{font-size:10.5px;color:var(--tree-ink)}.allo-tree-autumn-lab-head span:last-child{font-size:8.5px;line-height:1.4;color:var(--tree-muted)}',
        '.allo-tree-autumn-evidence-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.allo-tree-autumn-lab[data-tree-autumn-lab="needle-cohorts"] .allo-tree-autumn-evidence-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.allo-tree-autumn-evidence{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 7px;align-items:center;min-width:0;padding:7px 8px;border:1px solid var(--chapter-border);border-top:3px solid var(--autumn-tone);border-radius:10px;background:var(--mission-step)}',
        '.allo-tree-autumn-swatch{grid-row:1/3;display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:var(--autumn-tone);border:1px solid var(--chapter-border);color:#fff;font-size:7px;font-weight:950;text-shadow:0 1px 2px #000}.allo-tree-autumn-evidence strong{font-size:9px;color:var(--tree-ink)}.allo-tree-autumn-evidence span:last-child{font-size:7.8px;line-height:1.32;color:var(--tree-muted)}',
        '.allo-tree-autumn-boundary{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:start;margin-top:8px;padding-top:8px;border-top:1px dashed var(--chapter-border);font-size:8.5px;line-height:1.45;color:var(--tree-muted)}.allo-tree-autumn-boundary b{color:var(--season-hue)}',
        '.allo-tree-season-note{margin-top:8px;padding:9px 10px;border-left:4px solid var(--season-hue);border-radius:10px;background:var(--hero-chip);font-size:11px;line-height:1.55;color:var(--tree-ink);}',
        '.allo-tree-season-note strong{color:var(--season-hue);}',
        '.allo-tree-season-boundary{display:flex;gap:7px;align-items:flex-start;margin-top:7px;font-size:9.5px;line-height:1.45;color:var(--tree-muted);}',
        '.allo-tree-species-context{position:relative;overflow:hidden;display:grid;grid-template-columns:auto minmax(0,1fr);gap:11px 13px;margin-top:4px;padding:13px;border:1px solid var(--chapter-border);border-left:4px solid var(--tree-accent);border-radius:15px;background:var(--chapter-bg);box-shadow:0 12px 28px var(--tree-shadow);}',
        '.allo-tree-species-context:after{content:"";position:absolute;width:135px;height:135px;right:-75px;bottom:-91px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 21px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-species-portrait,.allo-tree-species-identity,.allo-tree-species-lens,.allo-tree-species-tradeoff{position:relative;z-index:1;}',
        '.allo-tree-species-portrait{display:grid;place-items:center;width:56px;height:56px;border:1px solid var(--chapter-border);border-radius:19px 19px 19px 7px;background:var(--flow-badge);font-size:27px;box-shadow:0 9px 20px var(--tree-shadow);}',
        '.allo-tree-species-identity{align-self:center;}',
        '.allo-tree-species-eyebrow{display:block;font-size:8.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-species-name{display:block;margin-top:2px;font-size:13px;color:var(--tree-ink);}',
        '.allo-tree-species-story{display:block;margin-top:3px;font-size:10.5px;line-height:1.48;color:var(--tree-muted);}',
        '.allo-tree-species-lens{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0;}',
        '.allo-tree-species-trait{min-width:0;padding:8px;border:1px solid var(--chapter-border);border-radius:11px;background:var(--mission-step);}',
        '.allo-tree-species-trait dt{font-size:8.5px;font-weight:950;letter-spacing:.055em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-species-trait dd{overflow:hidden;text-overflow:ellipsis;margin:3px 0 0;font-size:10px;font-weight:900;line-height:1.3;color:var(--tree-ink);}',
        '.allo-tree-species-meter{display:block;height:4px;margin-top:6px;border-radius:99px;background:var(--chapter-border);overflow:hidden;}',
        '.allo-tree-species-meter>span{display:block;height:100%;border-radius:inherit;background:var(--tree-accent);}',
        '.allo-tree-species-tradeoff{grid-column:1/-1;margin:0;padding-top:8px;border-top:1px dashed var(--chapter-border);font-size:9.5px;line-height:1.45;color:var(--tree-muted);}',
        '@keyframes tree-season-breathe{50%{transform:translateY(-2px) scale(1.025)}}',
        '@keyframes tree-leaf-drift{0%,100%{transform:translate(0,-1px) rotate(-7deg)}50%{transform:translate(3px,3px) rotate(9deg)}}',
        '@media (max-width:700px){.allo-tree-season-choices,.allo-tree-phenology-trail,.allo-tree-autumn-evidence-grid,.allo-tree-autumn-lab[data-tree-autumn-lab="needle-cohorts"] .allo-tree-autumn-evidence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.allo-tree-phenology-stage:after{display:none}.allo-tree-species-lens{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:460px){.allo-tree-season-portrait{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}.allo-tree-season-signals,.allo-tree-phenology-trail,.allo-tree-autumn-evidence-grid,.allo-tree-autumn-lab[data-tree-autumn-lab="needle-cohorts"] .allo-tree-autumn-evidence-grid{grid-template-columns:minmax(0,1fr);width:100%;text-align:left}.allo-tree-species-lens{grid-template-columns:minmax(0,1fr)}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-season-orb,.allo-tree-phenology-stage.is-leaf-fall .allo-tree-phenology-icon{animation:none}.allo-tree-season-choice{transition:none}.allo-tree-season-choice:hover{transform:none}}',
        '@media (forced-colors:active){.allo-tree-season-observatory,.allo-tree-season-choice,.allo-tree-season-portrait,.allo-tree-season-signal,.allo-tree-phenology,.allo-tree-phenology-stage,.allo-tree-autumn-lab,.allo-tree-autumn-evidence,.allo-tree-species-context,.allo-tree-species-portrait,.allo-tree-species-trait{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}.allo-tree-season-choice.is-current,.allo-tree-phenology-stage[aria-current="step"]{outline:3px solid Highlight;outline-offset:1px}.allo-tree-season-orb{border:2px solid ButtonText;background:Canvas;box-shadow:none}.allo-tree-autumn-swatch{forced-color-adjust:auto;border:2px solid ButtonText;background:Canvas;color:CanvasText;text-shadow:none}}',
        '.allo-tree-timescales{position:relative;overflow:hidden;margin:0 0 14px;padding:14px;border:1px solid var(--scene-edge);border-radius:18px;background:linear-gradient(135deg,var(--chapter-bg),var(--mission-bg));box-shadow:0 16px 36px var(--scene-shadow);}',
        '.allo-tree-timescales:after{content:"";position:absolute;width:185px;height:185px;right:-112px;top:-125px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 28px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-timescales-head,.allo-tree-clock-grid,.allo-tree-timescales-story{position:relative;z-index:1;}',
        '.allo-tree-timescales-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 10px;align-items:center;margin-bottom:11px;}',
        '.allo-tree-timescales-mark{grid-row:1/3;display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--chapter-border);border-radius:15px;background:var(--flow-badge);font-size:22px;box-shadow:0 9px 20px var(--tree-shadow);}',
        '.allo-tree-timescales-head h3{margin:0;font-size:15px;line-height:1.2;color:var(--tree-ink);}',
        '.allo-tree-timescales-head p{margin:0;font-size:10.5px;line-height:1.45;color:var(--tree-muted);}',
        '.allo-tree-clock-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:0;padding:0;list-style:none;}',
        '.allo-tree-clock{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 9px;align-content:start;min-width:0;padding:11px;border:1px solid var(--chapter-border);border-top:4px solid var(--clock-tone);border-radius:14px;background:var(--hero-chip);box-shadow:0 9px 21px var(--tree-shadow);}',
        '.allo-tree-clock:not(:last-child):after{content:"\\2192";position:absolute;z-index:2;right:-20px;top:50%;display:grid;place-items:center;width:22px;height:22px;margin-top:-11px;border:1px solid var(--chapter-border);border-radius:50%;background:var(--chapter-bg);color:var(--tree-accent);font-size:12px;font-weight:950;}',
        '.allo-tree-clock-icon{grid-row:1/5;display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--flow-badge);font-size:19px;}',
        '.allo-tree-clock-horizon{font-size:8.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--clock-tone);}',
        '.allo-tree-clock-title{font-size:10px;color:var(--tree-muted);}',
        '.allo-tree-clock-value{margin-top:2px;font-size:13px;line-height:1.22;color:var(--tree-ink);}',
        '.allo-tree-clock-copy{margin-top:2px;font-size:9.5px;line-height:1.42;color:var(--tree-muted);}',
        '.allo-tree-timescales-story{display:flex;gap:8px;align-items:flex-start;margin-top:10px;padding:9px 10px;border-left:4px solid var(--tree-accent);border-radius:11px;background:var(--mission-step);font-size:10.5px;line-height:1.5;color:var(--tree-ink);}',
        '.allo-tree-timescales-boundary{display:block;margin-top:4px;font-size:9px;line-height:1.42;color:var(--tree-muted);}',
        '@media (max-width:760px){.allo-tree-clock-grid{grid-template-columns:minmax(0,1fr);gap:9px}.allo-tree-clock:not(:last-child):after{content:"\\2193";right:auto;left:50%;top:auto;bottom:-17px;margin:0 0 0 -11px}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-clock{transition:none}}',
        '@media (forced-colors:active){.allo-tree-timescales,.allo-tree-timescales-mark,.allo-tree-clock,.allo-tree-clock-icon,.allo-tree-timescales-story{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}.allo-tree-clock:not(:last-child):after{border-color:ButtonText;background:Canvas;color:CanvasText}}',
        '.allo-tree-memory{position:relative;overflow:hidden;border-color:var(--scene-edge)!important;background:linear-gradient(145deg,var(--chapter-bg),var(--mission-bg))!important;box-shadow:0 17px 38px var(--scene-shadow)!important;}',
        '.allo-tree-memory:after{content:"";position:absolute;width:175px;height:175px;right:-105px;bottom:-118px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 26px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-memory-head,.allo-tree-memory-timeline,.allo-tree-memory-detail,.allo-tree-memory-empty{position:relative;z-index:1;}',
        '.allo-tree-memory-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:3px 11px;align-items:center;margin-bottom:11px;}',
        '.allo-tree-memory-mark{grid-row:1/3;display:grid;place-items:center;width:48px;height:48px;border:1px solid var(--chapter-border);border-radius:50%;background:repeating-radial-gradient(circle,var(--flow-badge) 0 5px,var(--chapter-border) 6px 7px,var(--hero-chip) 8px 11px);font-size:21px;box-shadow:0 10px 22px var(--tree-shadow);}',
        '.allo-tree-memory-title{margin:0;font-size:15px;line-height:1.2;color:var(--tree-ink);}',
        '.allo-tree-memory-copy{margin:0;font-size:10.5px;line-height:1.45;color:var(--tree-muted);}',
        '.allo-tree-memory-count{grid-row:1/3;align-self:center;padding:4px 8px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--hero-chip);font-size:9px;font-weight:900;color:var(--tree-muted);}',
        '.allo-tree-memory-timeline{display:flex;gap:7px;align-items:stretch;overflow-x:auto;padding:4px 2px 9px;margin:0;list-style:none;scrollbar-width:thin;overscroll-behavior-inline:contain;}',
        '.allo-tree-memory-item{display:contents;}',
        '.allo-tree-memory-year{flex:1 0 54px;display:grid;grid-template-rows:54px auto auto;gap:3px;align-items:end;justify-items:center;min-width:54px;padding:7px 5px;border:1px solid var(--chapter-border);border-top:3px solid var(--memory-limit);border-radius:12px;background:var(--hero-chip);color:var(--tree-ink);font:inherit;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-memory-year:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 9px 19px var(--tree-shadow);}',
        '.allo-tree-memory-year:focus-visible{outline:3px solid var(--tree-focus);outline-offset:2px;}',
        '.allo-tree-memory-year.is-selected{border-color:var(--memory-limit);box-shadow:inset 0 -3px 0 var(--memory-limit),0 10px 22px var(--tree-shadow);}',
        '.allo-tree-memory-year.is-stress{border-style:dashed;box-shadow:inset 0 0 0 2px var(--memory-stress);}',
        '.allo-tree-memory-year.is-selected.is-stress{box-shadow:inset 0 0 0 2px var(--memory-stress),inset 0 -3px 0 var(--memory-limit),0 10px 22px var(--tree-shadow);}',
        '.allo-tree-memory-ring{align-self:end;width:21px;min-height:10px;border:2px solid var(--memory-limit);border-radius:999px 999px 8px 8px;background:linear-gradient(90deg,var(--flow-badge),var(--hero-chip),var(--flow-badge));transition:height .2s ease,transform .2s ease;}',
        '.allo-tree-memory-year.is-selected .allo-tree-memory-ring{transform:scaleX(1.13);}',
        '.allo-tree-memory-year-label{font-size:9px;font-weight:950;color:var(--tree-ink);}',
        '.allo-tree-memory-year-state{font-size:8px;font-weight:850;color:var(--tree-muted);}',
        '.allo-tree-memory-detail{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(240px,.9fr);gap:10px;margin-top:3px;padding:11px;border:1px solid var(--chapter-border);border-left:4px solid var(--memory-selected);border-radius:14px;background:var(--chapter-bg);}',
        '.allo-tree-memory-detail-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 9px;align-items:center;}',
        '.allo-tree-memory-detail-year{grid-row:1/3;display:grid;place-items:center;width:45px;height:45px;border-radius:14px;background:var(--flow-badge);color:var(--tree-accent);font-size:11px;font-weight:950;}',
        '.allo-tree-memory-detail-head strong{font-size:13px;color:var(--tree-ink);}',
        '.allo-tree-memory-detail-head span:last-child{font-size:9.5px;color:var(--tree-muted);}',
        '.allo-tree-memory-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:9px 0 0;}',
        '.allo-tree-memory-fact{min-width:0;padding:7px;border:1px solid var(--chapter-border);border-radius:10px;background:var(--mission-step);}',
        '.allo-tree-memory-fact dt{font-size:8px;font-weight:950;letter-spacing:.05em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-memory-fact dd{overflow:hidden;text-overflow:ellipsis;margin:3px 0 0;font-size:10px;font-weight:900;color:var(--tree-ink);}',
        '.allo-tree-memory-story{align-self:stretch;padding:9px 10px;border:1px solid var(--chapter-border);border-radius:11px;background:var(--mission-step);font-size:10.5px;line-height:1.5;color:var(--tree-ink);}',
        '.allo-tree-memory-story strong{display:block;margin-bottom:3px;color:var(--tree-accent);}',
        '.allo-tree-memory-note{display:block;margin-top:6px;padding-top:6px;border-top:1px dashed var(--chapter-border);font-size:9px;line-height:1.42;color:var(--tree-muted);}',
        '.allo-tree-memory-key{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 9px;padding:0;list-style:none;}',
        '.allo-tree-memory-key-item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:center;padding:6px 8px;border:1px solid var(--chapter-border);border-radius:10px;background:var(--mission-step);font-size:9px;line-height:1.35;color:var(--tree-muted);}',
        '.allo-tree-memory-key-item strong{display:block;color:var(--tree-ink);font-size:9px;}',
        '.allo-tree-memory-key-swatch{position:relative;display:grid;place-items:end center;width:25px;height:28px;border-radius:7px;background:var(--hero-chip);}',
        '.allo-tree-memory-key-swatch.is-height:before{content:"";width:8px;height:20px;border:2px solid var(--tree-accent);border-radius:999px 999px 4px 4px;background:var(--flow-badge);}',
        '.allo-tree-memory-key-swatch.is-limit{border-top:4px solid transparent;background:linear-gradient(var(--hero-chip),var(--hero-chip)) padding-box,linear-gradient(90deg,var(--memory-light),var(--memory-water),var(--memory-co2),var(--memory-temperature)) border-box;}',
        '.allo-tree-memory-key-swatch.is-deficit{border:2px dashed var(--memory-stress-key);}',
        '.allo-tree-memory-compare{grid-column:1/-1;display:grid;grid-template-columns:minmax(180px,.72fr) minmax(0,1.28fr);gap:9px;align-items:stretch;padding-top:9px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-memory-compare-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 8px;align-items:center;padding:8px 9px;border:1px solid var(--chapter-border);border-left:4px solid var(--memory-trend);border-radius:11px;background:var(--mission-step);}',
        '.allo-tree-memory-compare-arrow{grid-row:1/3;display:grid;place-items:center;width:31px;height:31px;border-radius:50%;background:var(--flow-badge);color:var(--memory-trend);font-size:17px;font-weight:950;}',
        '.allo-tree-memory-compare-head strong{font-size:10px;color:var(--tree-ink);}.allo-tree-memory-compare-head span:last-child{font-size:9px;line-height:1.35;color:var(--tree-muted);}',
        '.allo-tree-memory-deltas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}',
        '.allo-tree-memory-delta{padding:7px 8px;border:1px solid var(--chapter-border);border-radius:10px;background:var(--hero-chip);}',
        '.allo-tree-memory-delta span{display:block;font-size:8px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--tree-muted);}.allo-tree-memory-delta strong{display:block;margin-top:3px;font-size:11px;color:var(--tree-ink);}',
        '.allo-tree-memory-compare-copy{grid-column:1/-1;margin:0;font-size:9px;line-height:1.45;color:var(--tree-muted);}',
        '.allo-tree-memory-causal{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:0;padding:0;list-style:none;}',
        '.allo-tree-memory-causal-step{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 7px;align-content:start;min-width:0;padding:8px;border:1px solid var(--chapter-border);border-top:3px solid var(--causal-tone);border-radius:11px;background:var(--hero-chip);}',
        '.allo-tree-memory-causal-step:not(:last-child):after{content:"\\2192";position:absolute;z-index:2;right:-13px;top:50%;display:grid;place-items:center;width:18px;height:18px;margin-top:-9px;border:1px solid var(--chapter-border);border-radius:50%;background:var(--chapter-bg);color:var(--tree-accent);font-size:10px;font-weight:950;}',
        '.allo-tree-memory-causal-icon{grid-row:1/4;display:grid;place-items:center;width:29px;height:29px;border-radius:9px;background:var(--flow-badge);font-size:14px;}',
        '.allo-tree-memory-causal-label{font-size:8px;font-weight:950;letter-spacing:.05em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-memory-causal-value{overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:900;color:var(--tree-ink);}',
        '.allo-tree-memory-causal-copy{font-size:8.5px;line-height:1.35;color:var(--tree-muted);}',
        '.allo-tree-memory-field{grid-column:1/-1;border:1px solid var(--chapter-border);border-radius:12px;background:var(--hero-chip);overflow:hidden;}',
        '.allo-tree-memory-field>summary{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:4px 8px;align-items:center;padding:9px 10px;cursor:pointer;list-style:none;color:var(--tree-ink);}',
        '.allo-tree-memory-field>summary::-webkit-details-marker{display:none}.allo-tree-memory-field>summary:focus-visible{outline:3px solid var(--tree-focus);outline-offset:-3px;}',
        '.allo-tree-memory-field-icon{grid-row:1/3;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--flow-badge);font-size:17px;}',
        '.allo-tree-memory-field-title{font-size:10.5px;font-weight:900}.allo-tree-memory-field-teaser{font-size:8.5px;line-height:1.35;color:var(--tree-muted);}',
        '.allo-tree-memory-field-chevron{grid-row:1/3;transition:transform .16s ease;color:var(--tree-accent);font-size:15px;font-weight:950}.allo-tree-memory-field[open] .allo-tree-memory-field-chevron{transform:rotate(90deg);}',
        '.allo-tree-memory-field-body{padding:0 10px 10px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-memory-field-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding-top:9px;}',
        '.allo-tree-memory-field-note{min-width:0;padding:7px 8px;border-top:3px solid var(--field-tone);border-radius:9px;background:var(--mission-step);}',
        '.allo-tree-memory-field-note span{display:block;font-size:8px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:var(--tree-muted)}.allo-tree-memory-field-note strong{display:block;margin-top:3px;font-size:11px;color:var(--tree-ink)}.allo-tree-memory-field-note em{display:block;margin-top:2px;font-size:8.5px;font-style:normal;color:var(--tree-muted);}',
        '.allo-tree-memory-field-meter{height:4px;margin-top:6px;border-radius:999px;background:var(--chapter-border);overflow:hidden}.allo-tree-memory-field-meter>span{display:block;height:100%;width:var(--field-level);border-radius:inherit;background:var(--field-tone);}',
        '.allo-tree-memory-field-compare{margin-top:9px;padding-top:9px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-memory-field-compare-head{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;margin-bottom:7px}.allo-tree-memory-field-compare-head strong{font-size:10px;color:var(--tree-ink)}.allo-tree-memory-field-compare-head span{font-size:8.5px;color:var(--tree-muted);}',
        '.allo-tree-memory-field-deltas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}',
        '.allo-tree-memory-field-delta{min-width:0;padding:6px 7px;border:1px solid var(--chapter-border);border-radius:9px;background:var(--mission-step);}',
        '.allo-tree-memory-field-delta.is-largest{border-color:var(--delta-tone);box-shadow:inset 0 -3px 0 var(--delta-tone);}',
        '.allo-tree-memory-field-delta span{display:block;font-size:8px;font-weight:900;color:var(--tree-muted)}.allo-tree-memory-field-delta strong{display:block;margin-top:3px;font-size:10px;color:var(--tree-ink)}',
        '.allo-tree-memory-field-compare-copy{margin:7px 0 0;font-size:8.5px;line-height:1.42;color:var(--tree-muted);}',
        '@media (max-width:760px){.allo-tree-memory-field-deltas{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:520px){.allo-tree-memory-field-deltas{grid-template-columns:minmax(0,1fr)}}',
        '@media (forced-colors:active){.allo-tree-memory-field-delta{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important}.allo-tree-memory-field-delta.is-largest{outline:3px solid Highlight;outline-offset:1px}}',
        '.allo-tree-memory-field-action{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;margin-top:8px;padding:8px 9px;border-left:4px solid var(--tree-accent);border-radius:9px;background:var(--mission-step);}',
        '.allo-tree-memory-field-action-copy strong{display:block;font-size:9.5px;color:var(--tree-ink)}.allo-tree-memory-field-action-copy span{display:block;margin-top:2px;font-size:8.5px;line-height:1.4;color:var(--tree-muted)}',
        '.allo-tree-memory-field-action>.allo-tree-button{margin:0!important;}',
        '.allo-tree-memory-replay{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:5px 9px;align-items:center;margin-top:8px;padding:9px;border:1px solid var(--chapter-border);border-left:4px solid var(--replay-tone);border-radius:10px;background:var(--hero-chip);}',
        '.allo-tree-memory-replay-mark{grid-row:1/3;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--flow-badge);font-size:17px}.allo-tree-memory-replay-copy strong{display:block;font-size:10px;color:var(--tree-ink)}.allo-tree-memory-replay-copy span{display:block;margin-top:2px;font-size:8.5px;line-height:1.4;color:var(--tree-muted)}',
        '.allo-tree-memory-replay>.allo-tree-button{margin:0!important;}',
        '.allo-tree-memory-replay-controls,.allo-tree-memory-replay-context{grid-column:2/-1;margin-top:4px;padding-top:7px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-memory-replay-controls-head,.allo-tree-memory-replay-context-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:3px 8px;margin-bottom:6px}.allo-tree-memory-replay-controls-head strong,.allo-tree-memory-replay-context-head strong{font-size:9px;color:var(--tree-ink)}.allo-tree-memory-replay-controls-head span,.allo-tree-memory-replay-context-head span{font-size:8px;line-height:1.4;color:var(--tree-muted)}',
        '.allo-tree-memory-replay-control-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.allo-tree-memory-replay-control{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1px 6px;align-items:center;min-width:0;padding:6px 7px;border:1px solid var(--chapter-border);border-radius:9px;background:linear-gradient(135deg,var(--mission-step),var(--hero-chip))}.allo-tree-memory-replay-control[data-control-state="changed"]{border-color:var(--replay-tone);box-shadow:inset 0 -3px 0 var(--replay-tone)}',
        '.allo-tree-memory-replay-control-mark{grid-row:1/3;display:grid;place-items:center;width:20px;height:20px;border-radius:7px;background:var(--flow-badge);font-size:10px;font-weight:950;color:var(--tree-accent)}.allo-tree-memory-replay-control[data-control-state="changed"] .allo-tree-memory-replay-control-mark{color:var(--replay-tone)}.allo-tree-memory-replay-control span:nth-child(2){font-size:7.5px;font-weight:900;color:var(--tree-muted)}.allo-tree-memory-replay-control strong{overflow-wrap:anywhere;font-size:8.5px;color:var(--tree-ink)}',
        '.allo-tree-memory-replay-context-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.allo-tree-memory-replay-context-card{position:relative;overflow:hidden;padding:7px 8px 7px 11px;border-radius:9px;background:var(--mission-step)}.allo-tree-memory-replay-context-card:before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:var(--tree-accent)}.allo-tree-memory-replay-context-card span{display:block;font-size:7.5px;font-weight:900;color:var(--tree-muted)}.allo-tree-memory-replay-context-card strong{display:block;margin-top:3px;font-size:9px;color:var(--tree-ink)}',
        '.allo-tree-memory-replay-specimens{grid-column:2/-1;margin-top:4px;padding:8px;border:1px solid var(--chapter-border);border-radius:11px;background:linear-gradient(135deg,var(--hero-chip),var(--mission-step));}',
        '.allo-tree-memory-replay-specimens-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:3px 8px;margin-bottom:7px}.allo-tree-memory-replay-specimens-head strong{font-size:9.5px;color:var(--tree-ink)}.allo-tree-memory-replay-specimens-head span{font-size:8px;color:var(--tree-muted)}',
        '.allo-tree-memory-replay-specimen-stage{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:8px;align-items:center}.allo-tree-memory-replay-specimen-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 9px;align-items:center;min-width:0;padding:7px 9px;border-radius:10px;background:var(--hero-chip)}',
        '.allo-tree-memory-ring-disc{grid-row:1/4;position:relative;width:58px;height:58px;box-sizing:border-box;border:var(--specimen-band) solid var(--specimen-tone);border-radius:50%;background:repeating-radial-gradient(circle at center,#f3d8a7 0 5px,#b87938 6px 7px,#e8c486 8px 12px);box-shadow:0 6px 14px var(--tree-shadow),inset 0 0 0 2px var(--hero-chip)}.allo-tree-memory-ring-disc:after{content:"";position:absolute;inset:50% auto auto 50%;width:9px;height:9px;border-radius:50%;background:#7c3f18;transform:translate(-50%,-50%)}',
        '.allo-tree-memory-replay-specimen-card span{font-size:7.5px;font-weight:900;color:var(--tree-muted)}.allo-tree-memory-replay-specimen-card strong{font-size:10px;color:var(--tree-ink)}.allo-tree-memory-replay-specimen-card em{font-size:8px;font-style:normal;color:var(--tree-muted)}.allo-tree-memory-replay-specimen-bridge{text-align:center;color:var(--tree-muted)}.allo-tree-memory-replay-specimen-bridge b{display:block;font-size:17px;color:var(--tree-accent)}.allo-tree-memory-replay-specimen-bridge strong{display:block;font-size:9px;color:var(--tree-ink)}.allo-tree-memory-replay-specimen-bridge span{display:block;margin-top:2px;font-size:7.5px}',
        '.allo-tree-memory-replay-specimen-note{margin:7px 0 0;font-size:8px;line-height:1.4;color:var(--tree-muted)}',
        '.allo-tree-memory-replay-metrics{grid-column:2/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:3px}.allo-tree-memory-replay-metric{padding:6px 7px;border-radius:8px;background:var(--mission-step)}.allo-tree-memory-replay-metric span{display:block;font-size:8px;font-weight:900;color:var(--tree-muted)}.allo-tree-memory-replay-metric strong{display:block;margin-top:2px;font-size:10px;color:var(--tree-ink)}',
        '.allo-tree-memory-replay-note{grid-column:2/-1;margin:2px 0 0;font-size:8.5px;line-height:1.42;color:var(--tree-muted);}',
        '@media (max-width:760px){.allo-tree-memory-replay-control-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:520px){.allo-tree-memory-field-action,.allo-tree-memory-replay{grid-template-columns:auto minmax(0,1fr)}.allo-tree-memory-field-action>.allo-tree-button,.allo-tree-memory-replay>.allo-tree-button{grid-column:1/-1;width:100%}.allo-tree-memory-replay-controls,.allo-tree-memory-replay-context,.allo-tree-memory-replay-specimens,.allo-tree-memory-replay-metrics,.allo-tree-memory-replay-note{grid-column:1/-1}.allo-tree-memory-replay-control-grid,.allo-tree-memory-replay-context-grid,.allo-tree-memory-replay-specimen-stage{grid-template-columns:minmax(0,1fr)}.allo-tree-memory-replay-specimen-bridge b{transform:rotate(90deg)}}',
        '@media (forced-colors:active){.allo-tree-memory-field-action,.allo-tree-memory-replay,.allo-tree-memory-replay-control,.allo-tree-memory-replay-context-card,.allo-tree-memory-replay-specimens,.allo-tree-memory-replay-specimen-card,.allo-tree-memory-replay-metric{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important}.allo-tree-memory-replay-context-card:before{background:Highlight!important}.allo-tree-memory-ring-disc{border-color:Highlight!important;background:Canvas!important;box-shadow:none!important}.allo-tree-memory-ring-disc:after{background:ButtonText!important}}',
        '.allo-tree-memory-field-caution{margin:8px 0 0;font-size:8.5px;line-height:1.42;color:var(--tree-muted);}',
        '.allo-tree-memory-field-missing{margin:9px 0 0;padding:8px;border-radius:9px;background:var(--mission-step);font-size:9px;line-height:1.45;color:var(--tree-muted);}',
        '@media (max-width:760px){.allo-tree-memory-field-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:520px){.allo-tree-memory-field-grid{grid-template-columns:minmax(0,1fr)}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-memory-field-chevron{transition:none!important}}',
        '@media (forced-colors:active){.allo-tree-memory-field,.allo-tree-memory-field-note,.allo-tree-memory-field-missing{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important}.allo-tree-memory-field-meter{background:CanvasText!important}.allo-tree-memory-field-meter>span{background:Highlight!important}}',
        '@media (max-width:760px){.allo-tree-memory-causal{grid-template-columns:repeat(2,minmax(0,1fr))}.allo-tree-memory-causal-step:nth-child(2):after{display:none}}',
        '@media (max-width:520px){.allo-tree-memory-causal{grid-template-columns:minmax(0,1fr)}.allo-tree-memory-causal-step:after{content:"\\2193"!important;right:auto!important;left:50%!important;top:auto!important;bottom:-13px!important;margin:0 0 0 -9px!important}.allo-tree-memory-causal-step:last-child:after{display:none!important}}',
        '@media (forced-colors:active){.allo-tree-memory-causal-step{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important}.allo-tree-memory-causal-step:after{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important}}',
        '.allo-tree-memory-detective{grid-column:1/-1;display:grid;grid-template-columns:minmax(190px,.65fr) minmax(0,1.35fr);gap:9px;padding:10px;border:1px solid var(--chapter-border);border-radius:13px;background:var(--mission-step);}',
        '.allo-tree-memory-detective-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;align-content:start;}',
        '.allo-tree-memory-detective-icon{grid-row:1/3;display:grid;place-items:center;width:35px;height:35px;border-radius:11px;background:var(--flow-badge);font-size:17px;}',
        '.allo-tree-memory-detective-head strong{font-size:11px;color:var(--tree-ink);}.allo-tree-memory-detective-head span:last-child{font-size:9.5px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-memory-claim-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}',
        '.allo-tree-memory-claim{min-width:0;padding:7px 8px;border:1px solid var(--chapter-border);border-radius:10px;background:var(--hero-chip);color:var(--tree-ink);font:inherit;font-size:9.5px;font-weight:850;line-height:1.35;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;}',
        '.allo-tree-memory-claim:hover{transform:translateY(-1px);box-shadow:0 6px 13px var(--tree-shadow);}.allo-tree-memory-claim:focus-visible{outline:3px solid var(--tree-focus);outline-offset:2px;}',
        '.allo-tree-memory-claim[aria-pressed="true"]{border-color:var(--detective-tone);box-shadow:inset 0 -3px 0 var(--detective-tone);}',
        '.allo-tree-memory-feedback{grid-column:1/-1;margin:0;padding:8px 9px;border-left:4px solid var(--detective-tone);border-radius:9px;background:var(--hero-chip);font-size:9.5px;line-height:1.45;color:var(--tree-ink);}',
        '@media (max-width:760px){.allo-tree-memory-detective{grid-template-columns:minmax(0,1fr)}}',
        '@media (max-width:520px){.allo-tree-memory-claim-options{grid-template-columns:minmax(0,1fr)}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-memory-claim{transition:none!important}.allo-tree-memory-claim:hover{transform:none!important}}',
        '@media (forced-colors:active){.allo-tree-memory-detective,.allo-tree-memory-claim,.allo-tree-memory-feedback{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}.allo-tree-memory-claim[aria-pressed="true"]{outline:3px solid Highlight;outline-offset:1px}}',
        '@media (max-width:760px){.allo-tree-memory-compare{grid-template-columns:minmax(0,1fr)}}',
        '@media (max-width:520px){.allo-tree-memory-key{grid-template-columns:minmax(0,1fr)}.allo-tree-memory-deltas{grid-template-columns:minmax(0,1fr)}}',
        '@media (forced-colors:active){.allo-tree-memory-key-item,.allo-tree-memory-key-swatch,.allo-tree-memory-compare-head,.allo-tree-memory-delta{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}}',
        '.allo-tree-memory-empty{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px;border:1px dashed var(--chapter-border);border-radius:14px;background:var(--mission-step);}',
        '.allo-tree-memory-empty-icon{display:grid;place-items:center;width:54px;height:54px;border:1px solid var(--chapter-border);border-radius:50%;background:var(--flow-badge);font-size:25px;}',
        '.allo-tree-memory-empty-copy strong{display:block;font-size:12px;color:var(--tree-ink);}.allo-tree-memory-empty-copy span{display:block;margin-top:3px;font-size:10px;line-height:1.45;color:var(--tree-muted);}',
        '@media (max-width:760px){.allo-tree-memory-detail{grid-template-columns:minmax(0,1fr)}.allo-tree-memory-facts{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:520px){.allo-tree-memory-head{grid-template-columns:auto minmax(0,1fr)}.allo-tree-memory-count{grid-column:1/-1;grid-row:auto;justify-self:start}.allo-tree-memory-empty{grid-template-columns:auto minmax(0,1fr)}.allo-tree-memory-empty>.allo-tree-button{grid-column:1/-1;width:100%;margin:0!important}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-memory-year,.allo-tree-memory-ring{transition:none!important}.allo-tree-memory-year:hover,.allo-tree-memory-year.is-selected .allo-tree-memory-ring{transform:none!important}}',
        '@media (forced-colors:active){.allo-tree-memory,.allo-tree-memory-mark,.allo-tree-memory-year,.allo-tree-memory-detail,.allo-tree-memory-fact,.allo-tree-memory-story,.allo-tree-memory-empty,.allo-tree-memory-empty-icon{border-color:ButtonText!important;background:Canvas!important;color:CanvasText!important;box-shadow:none!important}.allo-tree-memory-year.is-selected{outline:3px solid Highlight;outline-offset:1px}}',
        '.allo-tree-budget-card,.allo-tree-conditions-card{position:relative;overflow:hidden;}',
        '.allo-tree-budget-card:before,.allo-tree-conditions-card:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--tree-accent),transparent 76%);pointer-events:none;}',
        '.allo-tree-budget-equation{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr);gap:6px;align-items:stretch;margin-bottom:10px;}',
        '.allo-tree-budget-equation>.allo-tree-budget-operator{display:grid;place-items:center;padding:0;color:var(--tree-muted);font-size:20px;font-weight:950;}',
        '.allo-tree-budget-equation>div{margin:0;min-width:0;}',
        '.allo-tree-factor-control{position:relative;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-factor-control:hover{transform:translateY(-1px);box-shadow:0 7px 17px var(--tree-shadow);}',
        '.allo-tree-factor-control input[type="range"]{display:block;height:20px;margin:1px 0 0;cursor:pointer;}',
        '.allo-tree-factor-control input[type="range"]:disabled{cursor:not-allowed;}',
        '.allo-tree-mission-step.is-done{background:var(--flow-badge);border-color:var(--mission-border);}',
        '.allo-tree-mission-step.is-done strong{color:var(--tree-accent);}',
        '.allo-tree-mission-step.is-done .allo-tree-mission-dot{background:var(--tree-accent);color:var(--accent-ink);}',
        '.allo-tree-mission-step.is-next{border-color:var(--tree-accent);box-shadow:0 6px 14px var(--tree-shadow);}',
        '.allo-tree-chem-story,.allo-tree-transport-story{position:relative;overflow:hidden;border-color:var(--scene-edge)!important;box-shadow:0 18px 42px var(--scene-shadow)!important;}',
        '.allo-tree-chem-story:after,.allo-tree-transport-story:after{content:"";position:absolute;width:190px;height:190px;right:-96px;top:-106px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 24px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-chem-story>*,.allo-tree-transport-story>*{position:relative;z-index:1;}',
        '.allo-tree-chem-stopped{position:relative;overflow:hidden;border-color:var(--scene-edge)!important;background:var(--mission-bg)!important;box-shadow:0 18px 42px var(--scene-shadow)!important;}',
        '.allo-tree-chem-stopped:before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,var(--tree-muted),var(--tree-accent),transparent 78%);}',
        '.allo-tree-stopped-scene{display:grid;grid-template-columns:auto minmax(0,1fr);gap:15px;align-items:center;padding:14px;border:1px solid var(--chapter-border);border-radius:17px;background:var(--chapter-bg);}',
        '.allo-tree-stopped-mark{display:grid;place-items:center;width:78px;height:78px;border:1px solid var(--chapter-border);border-radius:25px 25px 25px 9px;background:var(--mission-step);font-size:35px;filter:grayscale(.72);box-shadow:0 12px 25px var(--tree-shadow);}',
        '.allo-tree-stopped-copy p{margin:0;font-size:12px;line-height:1.6;color:var(--tree-muted);}',
        '.allo-tree-stopped-chain{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0;}',
        '.allo-tree-stopped-step{display:grid;gap:3px;padding:10px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--mission-step);}',
        '.allo-tree-stopped-step strong{font-size:11px;color:var(--tree-ink);}.allo-tree-stopped-step span{font-size:10px;line-height:1.45;color:var(--tree-muted);}',
        '.allo-tree-stopped-actions{display:flex;justify-content:flex-end;}',
        '.allo-tree-story-eyebrow{display:inline-flex;align-items:center;gap:6px;margin-bottom:8px;padding:4px 8px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--flow-badge);font-size:9.5px;font-weight:950;letter-spacing:.09em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-story-eyebrow:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--tree-accent);box-shadow:0 0 0 3px var(--hero-ring-soft);}',
        '.allo-tree-reaction{display:grid;grid-template-columns:minmax(0,1.25fr) 28px minmax(130px,.72fr) 28px minmax(0,.9fr);gap:8px;align-items:stretch;margin-top:12px;}',
        '.allo-tree-reaction-inputs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}',
        '.allo-tree-reaction-outputs{display:grid;grid-template-rows:repeat(2,minmax(0,1fr));gap:6px;}',
        '.allo-tree-molecule{display:grid;align-content:center;justify-items:center;min-width:0;padding:10px 7px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--mission-step);text-align:center;box-shadow:0 7px 16px var(--tree-shadow);}',
        '.allo-tree-molecule.is-limiting,.allo-tree-leaf-engine.is-limiting{border-color:var(--tree-accent)!important;box-shadow:inset 0 0 0 2px var(--hero-ring-soft),0 10px 24px var(--accent-shadow);}',
        '.allo-tree-pace-badge{display:inline-flex;margin-top:6px;padding:3px 6px;border-radius:999px;background:var(--tree-accent);color:var(--accent-ink);font-size:8.5px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;}',
        '.allo-tree-molecule-icon{display:grid;place-items:center;min-height:27px;font-size:23px;font-weight:950;color:var(--tree-accent);}',
        '.allo-tree-molecule-label{margin-top:4px;font-size:9px;font-weight:900;line-height:1.2;letter-spacing:.045em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-molecule-value{margin-top:3px;font-size:11px;font-weight:900;line-height:1.25;color:var(--tree-ink);font-variant-numeric:tabular-nums;}',
        '.allo-tree-reaction-arrow{display:grid;place-items:center;color:var(--tree-accent);font-size:21px;font-weight:950;}',
        '.allo-tree-leaf-engine{display:grid;place-items:center;align-content:center;min-height:142px;padding:12px 9px;border:1px solid var(--mission-border);border-radius:18px;background:linear-gradient(145deg,var(--flow-badge),var(--chapter-bg));box-shadow:inset 0 0 0 5px var(--hero-ring-soft),0 12px 25px var(--tree-shadow);text-align:center;}',
        '.allo-tree-leaf-orbit{display:grid;place-items:center;width:51px;height:51px;border-radius:50%;background:var(--tree-accent);color:var(--accent-ink);font-size:27px;box-shadow:0 9px 20px var(--accent-shadow);}',
        '.allo-tree-engine-kicker{margin-top:8px;font-size:8px;font-weight:950;letter-spacing:.1em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-engine-name{margin-top:2px;font-size:12px;font-weight:950;line-height:1.15;color:var(--tree-ink);}',
        '.allo-tree-engine-setting{margin-top:4px;font-size:10px;font-weight:800;color:var(--tree-accent);}',
        '.allo-tree-story-verdict{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:7px 10px;align-items:center;margin-top:11px;padding:10px 12px;border:1px solid var(--chapter-border);border-left:4px solid var(--tree-accent);border-radius:12px;background:var(--chapter-bg);}',
        '.allo-tree-story-verdict-label{font-size:8.5px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-story-verdict strong{font-size:12px;color:var(--tree-ink);}',
        '.allo-tree-story-verdict-copy{font-size:10.5px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-curves-card,.allo-tree-chem-limits,.allo-tree-chem-trade,.allo-tree-chem-bill,.allo-tree-sugar-map,.allo-tree-trunk-card,.allo-tree-girdling-card{position:relative;overflow:hidden;}',
        '.allo-tree-curves-card:before,.allo-tree-chem-limits:before,.allo-tree-chem-trade:before,.allo-tree-chem-bill:before,.allo-tree-sugar-map:before,.allo-tree-trunk-card:before,.allo-tree-girdling-card:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--tree-accent),transparent 74%);pointer-events:none;}',
        '.allo-tree-curve-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;}',
        '.allo-tree-curve-key{display:flex;flex-wrap:wrap;gap:6px 10px;margin:-2px 0 10px;padding:8px 9px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--mission-step);}',
        '.allo-tree-curve-key>span{display:inline-flex;align-items:center;gap:6px;flex:1 1 190px;min-width:0;font-size:10px;line-height:1.35;color:var(--tree-muted);}',
        '.allo-tree-curve-mark{display:inline-grid;place-items:center;flex:0 0 auto;width:13px;height:13px;color:var(--tree-accent);font-style:normal;font-size:13px;font-weight:950;}',
        '.allo-tree-curve-mark.is-now{width:9px;height:9px;margin:2px;border-radius:50%;background:var(--tree-accent);box-shadow:0 0 0 2px var(--chapter-bg);}',
        '.allo-tree-curve-mark.is-best{width:9px;height:9px;margin:2px;border:2px solid var(--tree-accent);border-radius:50%;}',
        '.allo-tree-curve-mark.is-flat{height:8px;border-bottom:2px solid var(--tree-accent);}',
        '.allo-tree-curve-panel{min-width:0;padding:10px;border:1px solid var(--chapter-border);border-top:3px solid var(--tree-accent);border-radius:13px;background:var(--mission-step);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-curve-panel:hover{transform:translateY(-1px);box-shadow:0 9px 20px var(--tree-shadow);}',
        '.allo-tree-curve-panel.is-limiting{transform:translateY(-2px);box-shadow:0 12px 26px var(--tree-shadow),inset 0 0 0 1px var(--flow-badge);}',
        '.allo-tree-pipe-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;}',
        '.allo-tree-pipe-card{position:relative;overflow:hidden;padding:13px;border:1px solid var(--chapter-border);border-left:4px solid var(--tree-accent);border-radius:14px;background:var(--mission-step);box-shadow:0 9px 22px var(--tree-shadow);}',
        '.allo-tree-pipe-card:after{content:"";position:absolute;width:76px;height:76px;right:-37px;bottom:-41px;border-radius:50%;background:var(--flow-badge);pointer-events:none;}',
        '.allo-tree-pipe-card>*{position:relative;z-index:1;}',
        '.allo-tree-pipe-heading{margin:0 0 4px;font-size:14px;font-weight:900;line-height:1.3;color:var(--tree-ink);}',
        '.allo-tree-pipe-key{display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto;gap:7px;align-items:stretch;margin-top:10px;padding:8px;border:1px solid var(--chapter-border);border-radius:13px;background:var(--mission-step);}',
        '.allo-tree-pipe-term{display:grid;gap:2px;padding:7px 9px;border-radius:9px;background:var(--hero-chip);}',
        '.allo-tree-pipe-term strong{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-pipe-term span,.allo-tree-pipe-now{font-size:10.5px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-pipe-now{display:flex;align-items:center;padding:7px 9px;border-left:1px dashed var(--chapter-border);color:var(--tree-ink);font-weight:800;}',
        '@media (max-width:620px){.allo-tree-pipe-key{grid-template-columns:repeat(2,minmax(0,1fr))}.allo-tree-pipe-now{grid-column:1/-1;border-left:0;border-top:1px dashed var(--chapter-border)}}',
        '.allo-tree-pipe-path{display:grid;grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr) 18px minmax(0,1fr);gap:4px;align-items:center;margin:10px 0;padding:8px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--chapter-bg);}',
        '.allo-tree-pipe-node{display:grid;align-content:center;justify-items:center;min-width:0;min-height:64px;padding:5px 3px;border-radius:9px;background:var(--hero-chip);text-align:center;}',
        '.allo-tree-pipe-icon{font-size:19px;font-weight:950;color:var(--tree-accent);}',
        '.allo-tree-pipe-label{margin-top:2px;font-size:9.5px;font-weight:950;line-height:1.15;color:var(--tree-ink);}',
        '.allo-tree-pipe-note{margin-top:2px;font-size:7.5px;font-weight:800;line-height:1.15;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-pipe-arrow{display:grid;place-items:center;color:var(--tree-accent);font-size:15px;font-weight:950;}',
        '.allo-tree-sink-list{display:grid;gap:8px;}',
        '.allo-tree-source-card,.allo-tree-sink-deficit{padding:11px!important;border-radius:12px!important;box-shadow:0 8px 18px var(--tree-shadow);}',
        '.allo-tree-sink-rows{display:grid;gap:2px;padding:3px 2px 0;}',
        '.allo-tree-winter-flow{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:center;margin-top:8px;padding:10px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--chapter-bg);}',
        '.allo-tree-winter-flow-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:var(--flow-badge);font-size:18px;}.allo-tree-winter-flow strong{display:block;font-size:11px;color:var(--tree-ink);}.allo-tree-winter-flow span:last-child{display:block;margin-top:2px;font-size:10px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-sink-row{padding:7px 8px;border:1px solid var(--chapter-border);border-radius:10px;background:var(--mission-step);}',
        '.allo-tree-trunk-section>div:first-child{padding:9px;border:1px solid var(--chapter-border);border-radius:13px;background:var(--chapter-bg);}',
        '.allo-tree-consequence{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 4px;}',
        '.allo-tree-consequence-step{position:relative;min-width:0;padding:11px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--mission-step);box-shadow:0 8px 18px var(--tree-shadow);}',
        '.allo-tree-consequence-number{display:grid;place-items:center;width:24px;height:24px;margin-bottom:7px;border-radius:8px;background:var(--tree-accent);color:var(--accent-ink);font-size:10px;font-weight:950;}',
        '.allo-tree-consequence-title{font-size:11px;font-weight:950;line-height:1.25;color:var(--tree-ink);}',
        '.allo-tree-consequence-copy{margin-top:3px;font-size:9.5px;line-height:1.4;color:var(--tree-muted);}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-curve-panel,.allo-tree-pipe-card,.allo-tree-consequence-step{transition:none!important;animation:none!important}}',
        '@media (max-width:760px){.allo-tree-reaction{grid-template-columns:minmax(0,1fr)}.allo-tree-reaction-arrow{min-height:16px;transform:rotate(90deg)}.allo-tree-leaf-engine{min-height:126px}.allo-tree-reaction-outputs{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:none}.allo-tree-story-verdict{grid-template-columns:minmax(0,1fr)}.allo-tree-pipe-grid{grid-template-columns:minmax(0,1fr)}.allo-tree-consequence,.allo-tree-stopped-chain{grid-template-columns:minmax(0,1fr)}}',
        '@media (max-width:460px){.allo-tree-stopped-scene{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}.allo-tree-stopped-actions>.allo-tree-button{width:100%}}',
        '@media (max-width:420px){.allo-tree-reaction-inputs{grid-template-columns:minmax(0,1fr)}.allo-tree-pipe-path{grid-template-columns:minmax(0,1fr)}.allo-tree-pipe-arrow{min-height:13px;transform:rotate(90deg)}}',
        '.allo-tree-spread-hero,.allo-tree-compare-hero{position:relative;overflow:hidden;border-color:var(--scene-edge)!important;box-shadow:0 20px 46px var(--scene-shadow)!important;}',
        '.allo-tree-spread-hero:after,.allo-tree-compare-hero:after{content:"";position:absolute;width:230px;height:230px;right:-128px;top:-138px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 30px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-spread-hero>*,.allo-tree-compare-hero>*{position:relative;z-index:1;}',
        '.allo-tree-spread-journey{display:grid;grid-template-columns:minmax(0,1fr) 20px minmax(0,1fr) 20px minmax(0,1fr) 20px minmax(0,1fr);gap:5px;align-items:stretch;margin:12px 0;}',
        '.allo-tree-spread-journey-step{display:grid;align-content:center;justify-items:center;min-width:0;min-height:104px;padding:10px 7px;border:1px solid var(--chapter-border);border-radius:14px;background:var(--mission-step);text-align:center;box-shadow:0 8px 18px var(--tree-shadow);}',
        '.allo-tree-spread-journey-icon{display:grid;place-items:center;width:38px;height:38px;margin-bottom:6px;border-radius:12px;background:var(--flow-badge);font-size:21px;}',
        '.allo-tree-spread-journey-step strong{font-size:10.5px;line-height:1.2;color:var(--tree-ink);}',
        '.allo-tree-spread-journey-step>span:last-child{margin-top:3px;font-size:8.5px;line-height:1.3;color:var(--tree-muted);}',
        '.allo-tree-spread-journey-arrow{display:grid;place-items:center;color:var(--tree-accent);font-size:16px;font-weight:950;}',
        '.allo-tree-spread-budget-meter{margin:12px 0 8px;padding:11px 12px;border:1px solid var(--chapter-border);border-radius:13px;background:var(--chapter-bg);}',
        '.allo-tree-spread-budget-meter.is-over{border-color:var(--tree-accent);box-shadow:0 7px 17px var(--tree-shadow);}',
        '.allo-tree-spread-budget-head{display:flex;justify-content:space-between;gap:10px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:var(--tree-muted);}',
        '.allo-tree-spread-budget-head strong{font-size:11px;color:var(--tree-ink);}',
        '.allo-tree-spread-budget-track{display:block;height:9px;margin-top:7px;border:1px solid var(--chapter-border);border-radius:99px;background:var(--mission-step);overflow:hidden;}',
        '.allo-tree-spread-budget-fill{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--tree-accent),var(--tree-focus));transition:width .18s ease;}',
        '.allo-tree-spread-budget-note{margin-top:5px;font-size:9.5px;font-weight:750;color:var(--tree-muted);text-align:right;}',
        '.allo-tree-spread-budget-grid,.allo-tree-spread-record-totals,.allo-tree-spread-outcome-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px;}',
        '.allo-tree-strategy-stage,.allo-tree-spread-results-stage,.allo-tree-species-stage{margin-bottom:14px;}',
        '.allo-tree-strategy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:12px;align-items:stretch;}',
        '.allo-tree-strategy-slot,.allo-tree-species-slot{min-width:0;}',
        '.allo-tree-strategy-slot>.allo-tree-card,.allo-tree-species-slot>.allo-tree-card{height:100%;margin-bottom:0!important;box-sizing:border-box;}',
        '.allo-tree-strategy-card{position:relative;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-strategy-card:before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,var(--tree-accent),transparent 78%);pointer-events:none;}',
        '.allo-tree-strategy-card:hover,.allo-tree-strategy-card.is-active{transform:translateY(-2px);border-color:var(--tree-accent)!important;box-shadow:0 15px 32px var(--tree-shadow)!important;}',
        '.allo-tree-strategy-head{min-height:92px;}',
        '.allo-tree-strategy-meta{display:grid;justify-items:end;gap:3px;}',
        '.allo-tree-strategy-meta>div{padding:3px 6px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--mission-step);font-size:8.5px;font-weight:800;}',
        '.allo-tree-strategy-profile{display:grid;gap:7px;margin:10px 0;padding:9px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--chapter-bg);}',
        '.allo-tree-strategy-metric-head,.allo-tree-species-trait-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:8.5px;font-weight:850;color:var(--tree-muted);}',
        '.allo-tree-strategy-metric-head strong,.allo-tree-species-trait-head strong{color:var(--tree-ink);font-variant-numeric:tabular-nums;}',
        '.allo-tree-strategy-track,.allo-tree-species-trait-track{display:block;height:5px;margin-top:4px;border-radius:99px;background:var(--chapter-border);overflow:hidden;}',
        '.allo-tree-strategy-fill,.allo-tree-species-trait-fill{display:block;height:100%;border-radius:99px;}',
        '.allo-tree-strategy-slider{padding-top:9px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-spread-launch{position:relative;overflow:hidden;border-color:var(--mission-border)!important;background:var(--mission-bg)!important;box-shadow:0 16px 36px var(--mission-shadow)!important;}',
        '.allo-tree-spread-plan{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;margin:8px 0 12px;padding:11px;border:1px solid var(--chapter-border);border-radius:13px;background:var(--mission-step);}',
        '.allo-tree-spread-plan-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--flow-badge);font-size:21px;}',
        '.allo-tree-spread-plan strong{display:block;font-size:12px;color:var(--tree-ink);}',
        '.allo-tree-spread-plan div div{margin-top:3px;font-size:10px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-spread-actions{gap:7px;padding-top:2px;}',
        '.allo-tree-spread-results-stage{animation:tree-panel-in .3s ease-out;}',
        '.allo-tree-spread-results-grid{display:grid;grid-template-columns:minmax(280px,.78fr) minmax(380px,1.22fr);gap:14px;align-items:stretch;}',
        '.allo-tree-spread-result-slot>.allo-tree-card,.allo-tree-spread-map-slot>.allo-tree-card{height:100%;margin-bottom:0!important;box-sizing:border-box;}',
        '.allo-tree-spread-outcome-card,.allo-tree-spread-map-card,.allo-tree-spread-record-card{position:relative;overflow:hidden;}',
        '.allo-tree-spread-outcome-card:before,.allo-tree-spread-map-card:before,.allo-tree-spread-record-card:before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--tree-accent),transparent 74%);pointer-events:none;}',
        '.allo-tree-spread-event{position:relative;overflow:hidden;padding:13px!important;border-radius:13px!important;box-shadow:0 9px 20px var(--tree-shadow);}',
        '.allo-tree-spread-event:after{content:"";position:absolute;width:64px;height:64px;right:-32px;top:-35px;border-radius:50%;background:var(--flow-badge);pointer-events:none;}',
        '.allo-tree-spread-outcome-rows{display:grid;gap:5px;}',
        '.allo-tree-spread-outcome-row{padding:8px 9px!important;border:1px solid var(--chapter-border)!important;border-radius:10px;background:var(--mission-step);}',
        '.allo-tree-spread-lesson,.allo-tree-spread-record-verdict{padding:10px 11px;border-left:4px solid var(--tree-accent);border-radius:10px;background:var(--chapter-bg);color:var(--tree-ink)!important;}',
        '.allo-tree-spread-map{padding:8px;border:1px solid var(--chapter-border);border-radius:18px;background:var(--chapter-bg);filter:drop-shadow(0 12px 18px var(--tree-shadow));}',
        '.allo-tree-spread-map-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;}',
        '.allo-tree-spread-map-legend>span{margin:0!important;padding:4px 7px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--mission-step);}',
        '.allo-tree-spread-record-timeline{display:grid;gap:6px;margin-top:6px;}',
        '.allo-tree-spread-record-row{padding:8px 10px!important;border:1px solid var(--chapter-border)!important;border-radius:10px;background:var(--mission-step);}',
        '.allo-tree-compare-controls{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0 12px;}',
        '.allo-tree-compare-control{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 7px;align-items:center;min-width:0;padding:9px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--mission-step);}',
        '.allo-tree-compare-control.is-variable{border-color:var(--tree-accent);background:var(--flow-badge);box-shadow:0 8px 18px var(--tree-shadow);}',
        '.allo-tree-compare-control-icon{grid-row:1/3;display:grid;place-items:center;width:29px;height:29px;border-radius:9px;background:var(--hero-chip);font-size:15px;}',
        '.allo-tree-compare-control-label{font-size:8px;font-weight:950;letter-spacing:.07em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-compare-control-value{overflow:hidden;font-size:9.5px;line-height:1.3;color:var(--tree-ink);}',
        '.allo-tree-compare-timeline{padding:10px 12px;border:1px solid var(--chapter-border);border-radius:13px;background:var(--chapter-bg);}',
        '.allo-tree-compare-timeline input{display:block;height:22px;cursor:pointer;}',
        '.allo-tree-compare-timeline-ticks{display:flex;justify-content:space-between;margin-top:1px;font-size:8px;font-weight:800;color:var(--tree-muted);}',
        '.allo-tree-compare-chart-shell{padding:10px;border:1px solid var(--chapter-border);border-radius:16px;background:var(--mission-step);box-shadow:inset 0 0 0 4px var(--hero-ring-soft);}',
        '.allo-tree-compare-chart{border-radius:10px;background:var(--hero-chip);}',
        '.allo-tree-compare-legend{gap:6px!important;}',
        '.allo-tree-compare-legend>span{padding:4px 7px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--chapter-bg);}',
        '.allo-tree-compare-chart-key{padding-top:6px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-compare-insights{margin-top:12px;padding:11px;border:1px solid var(--chapter-border);border-radius:14px;background:var(--chapter-bg);}',
        '.allo-tree-compare-insights-title{margin-bottom:8px;font-size:11px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;color:var(--tree-ink);}',
        '.allo-tree-compare-insights-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}',
        '.allo-tree-compare-insight{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 7px;align-items:center;min-width:0;padding:9px;border:1px solid var(--chapter-border);border-radius:11px;background:var(--mission-step);}',
        '.allo-tree-compare-insight-icon{grid-row:1/4;display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:var(--flow-badge);font-size:15px;}',
        '.allo-tree-compare-insight-kicker{font-size:7.5px;font-weight:950;letter-spacing:.05em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-compare-insight-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--tree-ink);}',
        '.allo-tree-compare-insight-detail{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8.5px;color:var(--tree-muted);}',
        '.allo-tree-compare-insight-prompt{margin:9px 0 0;padding-top:8px;border-top:1px dashed var(--chapter-border);font-size:10px;line-height:1.45;color:var(--tree-muted);}',
        '.allo-tree-species-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:12px;align-items:stretch;}',
        '.allo-tree-species-card{position:relative;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-species-card:hover{transform:translateY(-2px);box-shadow:0 15px 32px var(--tree-shadow)!important;}',
        '.allo-tree-species-card.is-current{border-color:var(--tree-accent)!important;box-shadow:0 15px 34px var(--accent-shadow)!important;}',
        '.allo-tree-species-card-head{min-height:45px;}',
        '.allo-tree-species-spark{filter:drop-shadow(0 6px 10px var(--tree-shadow));}',
        '.allo-tree-species-traits{margin-top:9px;padding:9px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--chapter-bg);}',
        '.allo-tree-species-traits-label{margin-bottom:7px;font-size:8px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-species-trait-meters{display:grid;gap:6px;}',
        '.allo-tree-species-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;padding-top:7px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-species-pills span{padding:3px 6px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--mission-step);font-size:8px;font-weight:800;color:var(--tree-muted);}',
        '.allo-tree-species-why{padding-top:7px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-compare-conclusion{position:relative;overflow:hidden;border-style:dashed!important;background:var(--chapter-bg)!important;}',
        '.allo-tree-compare-next{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;margin-top:10px;padding:11px;border:1px solid var(--chapter-border);border-radius:13px;background:var(--mission-step);}',
        '.allo-tree-compare-next-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--flow-badge);font-size:20px;}',
        '.allo-tree-compare-next-copy{display:grid;gap:2px;}',
        '.allo-tree-compare-next-copy strong{font-size:11px;color:var(--tree-ink);}',
        '.allo-tree-compare-next-copy span{font-size:9.5px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-spread-lesson{margin-top:10px;padding:10px 11px;border:1px solid var(--chapter-border);border-left:4px solid var(--tree-accent);border-radius:12px;background:var(--flow-badge);}',
        '.allo-tree-spread-lesson-title{display:block;font-size:10px;font-weight:950;letter-spacing:.07em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-spread-lesson p{margin:4px 0 0;font-size:11px;line-height:1.52;color:var(--tree-ink);}',
        '.allo-tree-compare-scroll-cue{display:none;}',
        '.allo-tree-compare-chart-shell:focus-visible{outline:3px solid var(--tree-focus);outline-offset:2px;}',
        '@media (max-width:620px){.allo-tree-compare-chart-shell{overflow-x:auto;overscroll-behavior-inline:contain}.allo-tree-compare-chart{min-width:520px}.allo-tree-compare-scroll-cue{position:sticky;left:0;display:inline-flex;margin:0 0 7px;padding:4px 8px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--flow-badge);font-size:9.5px;font-weight:850;color:var(--tree-ink)}.allo-tree-compare-insight-name,.allo-tree-compare-insight-detail{overflow:visible;text-overflow:clip;white-space:normal}}',
        '@media (max-width:460px){.allo-tree-spread-journey-step{grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto;align-content:center;justify-items:start;column-gap:9px;min-height:0;text-align:left}.allo-tree-spread-journey-icon{grid-row:1/3;margin-bottom:0}.allo-tree-spread-budget-grid>:last-child:nth-child(odd),.allo-tree-spread-outcome-grid>:last-child:nth-child(odd){grid-column:1/-1}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-strategy-card,.allo-tree-species-card,.allo-tree-spread-results-stage,.allo-tree-spread-budget-fill{transition:none!important;animation:none!important}}',
        '@media (max-width:900px){.allo-tree-spread-results-grid{grid-template-columns:minmax(0,1fr)}.allo-tree-compare-controls{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:760px){.allo-tree-spread-journey{grid-template-columns:minmax(0,1fr)}.allo-tree-spread-journey-step{min-height:82px}.allo-tree-spread-journey-arrow{min-height:13px;transform:rotate(90deg)}.allo-tree-compare-insights-grid{grid-template-columns:minmax(0,1fr)}.allo-tree-compare-next{grid-template-columns:auto minmax(0,1fr)}.allo-tree-compare-next>.allo-tree-button{grid-column:1/-1;width:100%;margin:0!important}}',
        '@media (max-width:620px){.allo-tree-strategy-grid,.allo-tree-species-grid{grid-template-columns:minmax(0,1fr)}.allo-tree-spread-budget-grid,.allo-tree-spread-record-totals,.allo-tree-spread-outcome-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.allo-tree-compare-controls{grid-template-columns:minmax(0,1fr)}.allo-tree-strategy-head{min-height:0}.allo-tree-strategy-meta{justify-items:start;text-align:left!important}}',
        '.allo-tree-quiz-experience,.allo-tree-quiz-finale{position:relative;overflow:hidden;border-color:var(--scene-edge)!important;box-shadow:0 20px 46px var(--scene-shadow)!important;}',
        '.allo-tree-quiz-experience:after,.allo-tree-quiz-finale:after{content:"";position:absolute;width:240px;height:240px;right:-138px;top:-148px;border-radius:50%;background:var(--flow-badge);box-shadow:0 0 0 30px var(--hero-ring-soft);pointer-events:none;}',
        '.allo-tree-quiz-experience>*,.allo-tree-quiz-finale>*{position:relative;z-index:1;}',
        '.allo-tree-quiz-story{margin:12px 0;padding:11px;border:1px solid var(--chapter-border);border-radius:15px;background:var(--chapter-bg);}',
        '.allo-tree-quiz-story-title{margin-bottom:8px;font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-quiz-story-path{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:7px;}',
        '.allo-tree-quiz-story-node{display:grid;grid-template-columns:auto auto minmax(0,1fr);gap:6px;align-items:center;min-width:0;padding:8px;border:1px solid var(--chapter-border);border-radius:11px;background:var(--mission-step);}',
        '.allo-tree-quiz-story-number{display:grid;place-items:center;width:19px;height:19px;border-radius:7px;background:var(--tree-accent);color:var(--accent-ink);font-size:8px;font-weight:950;}',
        '.allo-tree-quiz-story-icon{display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:var(--flow-badge);font-size:14px;}',
        '.allo-tree-quiz-story-copy{display:grid;min-width:0;gap:1px;}',
        '.allo-tree-quiz-story-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;color:var(--tree-ink);}',
        '.allo-tree-quiz-story-copy>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;color:var(--tree-muted);}',
        '.allo-tree-quiz-progress{display:grid;grid-template-columns:auto minmax(0,1fr);gap:13px;align-items:center;margin:12px 0 15px;padding:12px;border:1px solid var(--mission-border);border-radius:16px;background:var(--mission-bg);box-shadow:0 12px 28px var(--mission-shadow);}',
        '.allo-tree-quiz-progress-ring{position:relative;display:grid;place-items:center;align-content:center;width:88px;height:88px;border-radius:50%;background:conic-gradient(var(--tree-accent) var(--quiz-progress),var(--mission-step) 0);box-shadow:0 10px 23px var(--tree-shadow);}',
        '.allo-tree-quiz-progress-ring:before{content:"";position:absolute;inset:7px;border:1px solid var(--chapter-border);border-radius:50%;background:var(--hero-chip);}',
        '.allo-tree-quiz-progress-ring>*{position:relative;z-index:1;}',
        '.allo-tree-quiz-progress-leaf{font-size:20px;line-height:1;}',
        '.allo-tree-quiz-progress-ring strong{margin-top:2px;font-size:13px;line-height:1;color:var(--tree-ink);font-variant-numeric:tabular-nums;}',
        '.allo-tree-quiz-progress-ring>span:last-child{margin-top:3px;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-quiz-progress-body{display:grid;min-width:0;gap:3px;}',
        '.allo-tree-quiz-progress-kicker{font-size:9px;font-weight:950;letter-spacing:.09em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-quiz-progress-title{font-size:13px;line-height:1.25;color:var(--tree-ink);}',
        '.allo-tree-quiz-progress-score{font-size:10.5px;color:var(--tree-muted);}',
        '.allo-tree-quiz-progress-track{display:block;height:8px;margin-top:5px;border:1px solid var(--chapter-border);border-radius:99px;background:var(--mission-step);overflow:hidden;}',
        '.allo-tree-quiz-progress-fill{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--tree-accent),var(--tree-focus));transition:width .24s ease;}',
        '.allo-tree-quiz-leaf-trail{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;}',
        '.allo-tree-quiz-leaf{display:grid;place-items:center;width:22px;height:22px;border:1px solid var(--chapter-border);border-radius:8px;background:var(--hero-chip);color:var(--tree-muted);font-size:9px;font-weight:950;}',
        '.allo-tree-quiz-leaf.is-right{border-color:var(--mission-border);background:var(--flow-badge);color:var(--tree-accent);}',
        '.allo-tree-quiz-leaf.is-wrong{border-style:dashed;color:var(--tree-ink);}',
        '.allo-tree-quiz-leaf.is-current{outline:2px solid var(--tree-focus);outline-offset:2px;}',
        '.allo-tree-quiz-question-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;margin-top:13px;padding:11px;border:1px solid var(--chapter-border);border-radius:14px;background:var(--chapter-bg);}',
        '.allo-tree-quiz-topic-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--flow-badge);font-size:21px;box-shadow:0 8px 18px var(--tree-shadow);}',
        '.allo-tree-quiz-topic-copy{display:grid;gap:2px;min-width:0;}',
        '.allo-tree-quiz-topic-copy>span{font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-quiz-topic-copy strong{font-size:12px;line-height:1.25;color:var(--tree-ink);}',
        '.allo-tree-quiz-question-count{padding:4px 8px;border:1px solid var(--chapter-border);border-radius:999px;background:var(--mission-step);font-size:9.5px;font-weight:850;color:var(--tree-muted);}',
        '.allo-tree-quiz-revisit{display:flex;align-items:center;gap:7px;margin-top:8px;padding:8px 10px;border:1px dashed var(--chapter-border);border-radius:10px;background:var(--mission-step);font-size:10.5px;line-height:1.4;color:var(--tree-muted);}',
        '.allo-tree-quiz-revisit>span:first-child{display:grid;place-items:center;width:23px;height:23px;border-radius:8px;background:var(--flow-badge);color:var(--tree-accent);font-weight:950;}',
        '.allo-tree-quiz-question{margin:12px 0!important;padding:13px 14px;border-left:4px solid var(--tree-accent);border-radius:12px;background:var(--mission-step);font-size:15px!important;}',
        '.allo-tree-quiz-options{display:grid;gap:7px;}',
        '.allo-tree-quiz-opt{min-height:48px!important;margin:0!important;border-radius:12px!important;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
        '.allo-tree-quiz-opt:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 9px 20px var(--tree-shadow);border-color:var(--tree-accent)!important;}',
        '.allo-tree-quiz-opt:disabled{opacity:1;}',
        '.allo-tree-quiz-opt.is-correct{box-shadow:inset 4px 0 0 var(--tree-accent),0 7px 16px var(--tree-shadow);}',
        '.allo-tree-quiz-opt.is-chosen-wrong{border-style:dashed!important;box-shadow:inset 4px 0 0 var(--tree-ink);}',
        '.allo-tree-quiz-feedback{margin-top:12px;padding:12px;border:1px solid var(--chapter-border);border-left:4px solid var(--tree-accent);border-radius:14px;background:var(--chapter-bg);box-shadow:0 12px 26px var(--tree-shadow);}',
        '.allo-tree-quiz-feedback.is-rethink{border-left-style:dashed;}',
        '.allo-tree-quiz-feedback-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:center;}',
        '.allo-tree-quiz-feedback-icon{display:grid;place-items:center;width:37px;height:37px;border-radius:12px;background:var(--tree-accent);color:var(--accent-ink);font-size:17px;font-weight:950;}',
        '.allo-tree-quiz-feedback-copy{display:grid;gap:2px;}',
        '.allo-tree-quiz-feedback-copy>span{font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-quiz-feedback-copy strong{font-size:12px;color:var(--tree-ink);}',
        '.allo-tree-quiz-evidence{margin-top:10px;padding-top:9px;border-top:1px dashed var(--chapter-border);}',
        '.allo-tree-quiz-evidence strong,.allo-tree-quiz-scientist-move>span{font-size:9px;font-weight:950;letter-spacing:.075em;text-transform:uppercase;color:var(--tree-accent);}',
        '.allo-tree-quiz-evidence p,.allo-tree-quiz-scientist-move p{margin:4px 0 0;font-size:11px;line-height:1.55;color:var(--tree-ink);}',
        '.allo-tree-quiz-scientist-move{margin-top:9px;padding:9px 10px;border:1px solid var(--chapter-border);border-radius:11px;background:var(--mission-step);}',
        '.allo-tree-quiz-feedback-actions{display:flex;justify-content:flex-end;margin-top:9px;}',
        '.allo-tree-quiz-nav{display:grid;grid-template-columns:auto minmax(50px,1fr) auto;gap:8px;align-items:center;margin-top:12px;padding-top:11px;border-top:1px solid var(--chapter-border);}',
        '.allo-tree-quiz-nav-position{justify-self:center;font-size:10.5px;font-weight:900;color:var(--tree-muted);font-variant-numeric:tabular-nums;}',
        '.allo-tree-quiz-celebration{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center;padding:13px;border:1px solid var(--mission-border);border-radius:16px;background:var(--mission-bg);}',
        '.allo-tree-quiz-finale-mark{position:relative;display:grid;place-items:center;width:76px;height:76px;border-radius:24px 24px 24px 8px;background:var(--tree-accent);color:var(--accent-ink);font-size:31px;box-shadow:0 13px 27px var(--accent-shadow);transform:rotate(-4deg);}',
        '.allo-tree-quiz-finale-mark>span:last-child{position:absolute;right:-5px;bottom:-5px;display:grid;place-items:center;width:27px;height:27px;border:3px solid var(--chapter-bg);border-radius:50%;background:var(--hero-chip);color:var(--tree-accent);font-size:12px;}',
        '.allo-tree-quiz-finale-copy h2{margin:0;font-size:19px;line-height:1.15;color:var(--tree-ink);}',
        '.allo-tree-quiz-finale-copy p{margin:5px 0;font-size:11px;line-height:1.5;color:var(--tree-muted);}',
        '.allo-tree-quiz-finale-copy strong{font-size:11px;color:var(--tree-accent);}',
        '.allo-tree-quiz-reasoning-ladder{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0;}',
        '.allo-tree-quiz-reasoning-step{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 8px;align-items:center;padding:10px;border:1px solid var(--chapter-border);border-radius:12px;background:var(--mission-step);}',
        '.allo-tree-quiz-reasoning-number{grid-row:1/3;display:grid;place-items:center;width:29px;height:29px;border-radius:10px;background:var(--flow-badge);color:var(--tree-accent);font-size:10px;font-weight:950;}',
        '.allo-tree-quiz-reasoning-step strong{font-size:11px;color:var(--tree-ink);}',
        '.allo-tree-quiz-reasoning-step>span:last-child{font-size:9.5px;line-height:1.35;color:var(--tree-muted);}',
        '.allo-tree-quiz-finale-note{margin:0;padding:10px 11px;border-left:4px solid var(--tree-accent);border-radius:10px;background:var(--chapter-bg);font-size:10.5px;line-height:1.5;color:var(--tree-muted);}',
        '.allo-tree-quiz-finale-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;margin-top:11px;}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-quiz-progress-fill,.allo-tree-quiz-opt{transition:none!important}.allo-tree-quiz-opt:hover{transform:none!important}.allo-tree-quiz-finale-mark{transform:none!important}}',
        '@media (max-width:760px){.allo-tree-quiz-story-path{grid-template-columns:repeat(2,minmax(0,1fr))}.allo-tree-quiz-progress{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}.allo-tree-quiz-progress-body{width:100%;text-align:left}.allo-tree-quiz-leaf-trail{justify-content:center}.allo-tree-quiz-reasoning-ladder{grid-template-columns:minmax(0,1fr)}}',
        '@media (max-width:460px){.allo-tree-quiz-story-path{grid-template-columns:minmax(0,1fr)}.allo-tree-quiz-question-head{grid-template-columns:auto minmax(0,1fr)}.allo-tree-quiz-question-count{grid-column:1/-1;justify-self:start}.allo-tree-quiz-celebration{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}.allo-tree-quiz-nav{grid-template-columns:1fr 1fr}.allo-tree-quiz-nav-position{grid-column:1/-1;grid-row:1}.allo-tree-quiz-nav>.allo-tree-button{width:100%;margin:0!important}}',
        '@media (forced-colors:active){.allo-tree-quiz-progress-ring,.allo-tree-quiz-topic-icon,.allo-tree-quiz-finale-mark,.allo-tree-quiz-feedback-icon{border:2px solid ButtonText;background:Canvas;color:CanvasText}.allo-tree-quiz-leaf,.allo-tree-quiz-opt,.allo-tree-quiz-feedback,.allo-tree-quiz-reasoning-step{border-color:ButtonText!important}.allo-tree-quiz-leaf.is-current{outline-color:Highlight}}',
        '.allo-tree-effect{position:relative;overflow:hidden;margin-top:12px;padding:12px;border:1px solid var(--chapter-border);border-left:4px solid var(--tree-accent);border-radius:13px;background:var(--chapter-bg);box-shadow:0 10px 24px var(--tree-shadow);animation:tree-effect-in .28s ease-out;}',
        '.allo-tree-effect:after{content:"";position:absolute;width:92px;height:92px;right:-42px;top:-54px;border-radius:50%;background:var(--flow-badge);pointer-events:none;}',
        '.allo-tree-effect-title{position:relative;z-index:1;display:flex;align-items:center;gap:7px;margin-bottom:8px;font-size:11px;font-weight:900;color:var(--tree-ink);}',
        '.allo-tree-effect-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}',
        '.allo-tree-effect-tile{min-width:0;padding:8px 9px;border:1px solid var(--chapter-border);border-radius:10px;background:var(--mission-step);}',
        '.allo-tree-effect-kicker{font-size:9.5px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--tree-muted);}',
        '.allo-tree-effect-value{margin-top:2px;font-size:12px;font-weight:900;line-height:1.25;color:var(--tree-ink);}',
        '.allo-tree-effect-detail{margin-top:2px;font-size:10px;line-height:1.35;color:var(--tree-muted);}',
        '.allo-tree-effect-response{position:relative;z-index:1;margin-top:8px;padding-top:8px;border-top:1px dashed var(--chapter-border);font-size:11px;line-height:1.5;color:var(--tree-ink);}',
        '.allo-tree-scene-effect{animation:tree-effect-chip .32s ease-out;box-shadow:0 10px 24px var(--scene-shadow);}',
        '.allo-tree-advanced-gateway>.allo-tree-card{border-style:dashed!important;background:var(--chapter-bg)!important;}',
        '.allo-tree-advanced-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;}',
        '.allo-tree-advanced-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--flow-badge);border:1px solid var(--chapter-border);font-size:20px;}',
        '.allo-tree-advanced-title{font-size:14px;font-weight:900;color:var(--tree-ink);}',
        '.allo-tree-advanced-copy{margin-top:2px;font-size:10.5px;line-height:1.45;color:var(--tree-muted);}',
        '.allo-tree-advanced-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;}',
        '.allo-tree-advanced-pill{padding:3px 7px;border-radius:999px;background:var(--mission-step);border:1px solid var(--chapter-border);font-size:9px;font-weight:800;color:var(--tree-muted);}',
        '.allo-tree-advanced-work{animation:tree-panel-in .24s ease-out;}',
        '@keyframes tree-effect-in{from{opacity:.35;transform:translateY(-5px) scale(.99)}to{opacity:1;transform:none}}',
        '@keyframes tree-effect-chip{from{opacity:.25;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}',
        '.allo-tree-panel{animation:tree-panel-in .22s ease-out;}',
        '@keyframes tree-panel-in{from{opacity:.45;transform:translateY(4px)}to{opacity:1;transform:none}}',
        '@media (prefers-reduced-motion:reduce){.allo-tree-card,.allo-tree-button,.allo-tree-tab,.allo-tree-panel,.allo-tree-quiz-opt,.allo-tree-effect,.allo-tree-scene-effect,.allo-tree-advanced-work,.allo-tree-habitat-item,.allo-tree-factor-control{transition:none!important;animation:none!important}}',
        '.allo-tree-pipe-note,.allo-tree-spread-journey-step>span:last-child,.allo-tree-compare-insight-detail,.allo-tree-species-pills span{font-size:10.5px;}',
        '.allo-tree-strategy-meta>div,.allo-tree-strategy-metric-head,.allo-tree-species-trait-head,.allo-tree-compare-control-label,.allo-tree-compare-insight-kicker,.allo-tree-species-traits-label{font-size:10px;}',
        '.allo-tree-compare-control-value{font-size:10.5px;}',
        '@media (pointer:coarse){.allo-tree-lab .allo-tree-button,.allo-tree-lab .allo-tree-tab,.allo-tree-lab .allo-tree-quiz-opt,.allo-tree-lab select{min-height:44px!important}.allo-tree-lab input[type="range"]{min-height:32px}}',
        '.allo-tree-lab.is-reduced-motion *,.allo-tree-lab.is-reduced-motion *:before,.allo-tree-lab.is-reduced-motion *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}',
        '.allo-tree-lab.is-reduced-motion .allo-tree-button:hover,.allo-tree-lab.is-reduced-motion .allo-tree-tab:hover,.allo-tree-lab.is-reduced-motion .allo-tree-factor-control:hover,.allo-tree-lab.is-reduced-motion .allo-tree-curve-panel:hover,.allo-tree-lab.is-reduced-motion .allo-tree-strategy-card:hover,.allo-tree-lab.is-reduced-motion .allo-tree-species-card:hover,.allo-tree-lab.is-reduced-motion .allo-tree-quiz-opt:hover{transform:none!important;}',
        '@media (max-width:960px){.allo-tree-workbench{grid-template-columns:minmax(0,1fr);grid-template-areas:"mission" "scene" "controls";grid-template-rows:auto}.allo-tree-workbench-sticky{position:static}.allo-tree-chapter{grid-template-columns:auto minmax(0,1fr)}.allo-tree-chapter-cue{grid-column:1/-1;max-width:none;padding:8px 10px;border:1px solid var(--chapter-border);border-left:4px solid var(--tree-accent);border-radius:10px;background:var(--mission-step)}}',
        '@media (max-width:620px){.allo-tree-viewer-head{grid-template-columns:minmax(0,1fr)}.allo-tree-viewer-metrics{text-align:left}.allo-tree-habitat-ribbon{grid-template-columns:repeat(2,minmax(0,1fr))}.allo-tree-budget-equation{grid-template-columns:minmax(0,1fr) 12px minmax(0,1fr) 12px minmax(0,1fr);gap:3px}.allo-tree-budget-equation>div{padding:7px 4px!important}.allo-tree-budget-equation>.allo-tree-budget-operator{padding:0!important;font-size:15px}.allo-tree-factor-control{padding:8px!important}}',
        '@media (max-width:620px){.allo-tree-lab{padding:10px!important;border-radius:15px!important}.allo-tree-hero{padding:17px!important}.allo-tree-hero-controls{width:100%;justify-content:flex-start!important}.allo-tree-hero-field{flex:1 1 130px;flex-direction:column;align-items:stretch!important}.allo-tree-hero-field select{width:100%}.allo-tree-hero-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%}.allo-tree-hero-stat{min-width:0;padding:7px 8px}.allo-tree-tabs{flex-wrap:nowrap!important;overflow-x:auto;padding-bottom:8px!important;overscroll-behavior-inline:contain}.allo-tree-tab{flex:0 0 146px!important}.allo-tree-tab-hint{white-space:normal}.allo-tree-chapter{padding:10px 11px}.allo-tree-chapter-number{width:36px;height:36px}.allo-tree-mission-steps{grid-template-columns:minmax(0,1fr)}.allo-tree-effect-grid{grid-template-columns:minmax(0,1fr)}.allo-tree-advanced-head{grid-template-columns:auto minmax(0,1fr)}.allo-tree-advanced-head>.allo-tree-button{grid-column:1/-1;width:100%;margin:2px 0 0!important}.allo-tree-card{border-radius:14px!important;padding:12px!important}.allo-tree-chapter-bridge{grid-template-columns:minmax(0,1fr)}.allo-tree-chapter-bridge-actions{justify-content:stretch}.allo-tree-chapter-bridge-actions .allo-tree-button{flex:1 1 150px}.allo-tree-workbench-scene [role="img"]{height:clamp(300px,55svh,430px)!important}}',
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
      var advancedHasEvidence = !!(experimentTrials.A || experimentTrials.B);
      var advancedPinned = experimentActive;
      var advancedOpen = advancedPinned || d.growAdvancedOpen === true ||
        (advancedHasEvidence && d.growAdvancedOpen !== false);
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
      var effectRaw = d.lastEffect;
      var lastEffect = effectRaw && typeof effectRaw === 'object' &&
        ['light', 'water', 'temperature', 'co2'].indexOf(effectRaw.factor) >= 0 &&
        typeof effectRaw.before === 'number' && isFinite(effectRaw.before) &&
        typeof effectRaw.after === 'number' && isFinite(effectRaw.after) &&
        typeof effectRaw.netBefore === 'number' && isFinite(effectRaw.netBefore) &&
        typeof effectRaw.netAfter === 'number' && isFinite(effectRaw.netAfter)
        ? effectRaw : null;

      function buildConditionEffect(factor, before, after, nextCfg, mode) {
        var nextEnv = envForYear(nextCfg, tree.age);
        var nextAperture = stomatalAperture(nextEnv.soilWater, sp.droughtTol, false);
        var nextLive = grossPhotosynthesis(sp, nextEnv, tree.leafArea, nextAperture);
        var nextResp = maintenanceRespiration(sp, tree);
        var nextLim = nextLive.limiting || live.limiting || {};
        return {
          seq: lastEffect && typeof lastEffect.seq === 'number' ? lastEffect.seq + 1 : 1,
          factor: factor,
          before: before,
          after: after,
          netBefore: liveNet,
          netAfter: nextLive.gross - nextResp,
          limiting: nextLim.viaStomata ? 'water' : (nextLim.id || factor),
          mode: mode || 'slider'
        };
      }

      function changeCondition(field, value, factor) {
        if (!tree.alive || experimentLocked) return;
        var nextCfg = Object.assign({}, envCfg);
        nextCfg[field] = value;
        var patch = { lastEffect: buildConditionEffect(factor, envCfg[field], value, nextCfg, 'slider') };
        patch[field] = value;
        updMulti(patch);
      }

      function causeAwareLimiter(result) {
        var nextLim = result && result.limiting;
        return nextLim && nextLim.viaStomata ? 'water' : (nextLim && nextLim.id);
      }

      function effectValue(effect, value) {
        if (effect.factor === 'temperature') return round(value, 0) + ' ' + DEG + 'C';
        if (effect.factor === 'co2') return round(value, 0) + ' ppm';
        return Math.round(value * 100) + '%';
      }

      // ── Shared UI atoms ──
      function card(children, extra, className) {
        return h('div', {
          className: 'allo-tree-card' + (className ? ' ' + className : ''),
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
          h('h3', { key: 'h', style: { margin: 0, fontWeight: 800, fontSize: 16, color: T.text, letterSpacing: '-0.01em' } }, txt),
          sub ? h('p', { key: 's', style: { fontSize: 12, color: T.dim, margin: '4px 0 0', lineHeight: 1.55, maxWidth: 760 } }, sub) : null
        ]);
      }
      // opts.ariaLabel names a button whose visible content is a glyph. The six
      // 3D view controls read as "◀ ▶ ▲ ▼ + −", which a screen reader announces
      // as punctuation or nothing at all, so the accessible name has to come
      // from somewhere other than the label text.
      function btn(key, labelTxt, onClick, opts) {
        var o = opts || {};
        return h('button', {
          className: 'allo-tree-button' + (o.primary ? ' is-primary' : ''),
          key: key, type: 'button', onClick: onClick, disabled: !!o.disabled,
          id: o.id || undefined,
          'aria-label': o.ariaLabel || undefined,
          title: o.ariaLabel || undefined,
          'aria-pressed': o.pressed == null ? undefined : !!o.pressed,
          'aria-expanded': o.expanded == null ? undefined : !!o.expanded,
          'aria-haspopup': o.hasPopup || undefined,
          'aria-controls': o.controls || undefined,
          style: {
            padding: o.small ? '5px 10px' : '8px 14px',
            borderRadius: 10, cursor: o.disabled ? 'not-allowed' : 'pointer',
            fontSize: o.small ? 12 : 13, fontWeight: 600,
            border: '1px solid ' + (o.pressed ? T.accent : T.border),
            background: (o.pressed || o.primary) ? T.accent : (o.tone === 'ghost' ? 'transparent' : T.cardAlt),
            color: (o.pressed || o.primary) ? T.onAccent : T.text,
            opacity: o.disabled ? 0.5 : 1, minHeight: o.small ? 32 : 38,
            marginRight: 6, marginBottom: 6
          }
        }, labelTxt);
      }
      // Sliders are native inputs on purpose: they are keyboard operable and screen
      // reader labelled for free, which a div with role="slider" is not.
      function slider(key, labelTxt, value, min, max, step, onChange, fmt, disabled, hue) {
        var id = 'treelab-' + key;
        var factorId = key === 'temp' ? 'temperature' : key;
        var sliderStyle = { marginBottom: 10 };
        if (hue) {
          sliderStyle.padding = '9px 10px';
          sliderStyle.borderRadius = 11;
          sliderStyle.background = T.cardAlt;
          sliderStyle.border = '1px solid ' + T.border;
          sliderStyle.borderLeft = '4px solid ' + hue;
        }
        return h('div', {
          key: key, className: hue ? 'allo-tree-factor-control' : undefined,
          'data-factor': hue ? factorId : undefined, style: sliderStyle
        }, [
          h('label', { key: 'l', htmlFor: id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 4 } }, [
            h('span', { key: 'a', style: hue ? { display: 'flex', alignItems: 'center', gap: 6 } : undefined }, hue ? [
              h('span', { key: 'sw', 'aria-hidden': 'true', style: { width: 10, height: 10, borderRadius: 2, background: hue, display: 'inline-block', flex: '0 0 auto', border: isContrast ? '1px solid ' + T.text : 'none' } }),
              h('span', { key: 'tx' }, labelTxt)
            ] : labelTxt),
            h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, fmt ? fmt(value) : String(value))
          ]),
          h('input', {
            key: 'i', id: id, type: 'range', min: min, max: max, step: step, value: value,
            disabled: !!disabled,
            onChange: function (e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: hue || T.accent, opacity: disabled ? 0.55 : 1 }
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
      function treeGoalReached(st) {
        if (!st || !st.alive) return false;
        var goalHeight = Math.max(0.5, (sp.maxHeight || 30) * 0.6);
        var cheapest = null;
        for (var goalIdx = 0; goalIdx < STRATEGIES.length; goalIdx++) {
          if (sp.modes.indexOf(STRATEGIES[goalIdx].id) < 0) continue;
          if (!cheapest || STRATEGIES[goalIdx].cost < cheapest.cost) cheapest = STRATEGIES[goalIdx];
        }
        return st.heightM >= goalHeight && (st.seedsBanked || 0) >= (cheapest ? cheapest.cost : 0.6);
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
        var stepPatch = { tree: st, limitsSeen: seen };
        var reachedGoal = !d.goalReached && treeGoalReached(st);
        if (reachedGoal) {
          stepPatch.goalReached = st.age;
          xp(8);
          sfxGrow();
          srSay(__alloT('stem.treelab.goal_reached_say', 'Goal reached at age ') + st.age
            + __alloT('stem.treelab.goal_reached_say2', '. This tree is full grown and can reproduce.'));
          if (addToast) addToast('\uD83C\uDFAF ' + __alloT('stem.treelab.goal_toast', 'A tree that made it'), 'success');
        }
        updMulti(stepPatch);
        if (!st.alive) {
          sfxBad();
          srSay(__alloT('stem.treelab.say_died_age', 'The tree died at age ') + st.age + '.');
          if (addToast) addToast(__alloT('stem.treelab.say_died_age', 'The tree died at age ') + st.age, 'error');
        } else if (!reachedGoal) {
          sfxGrow();
          srSay(__alloT('stem.treelab.say_advanced', 'Advanced ') + n + ' '
            + (n === 1 ? __alloT('stem.treelab.year_one', 'year') : __alloT('stem.treelab.year_many', 'years'))
            + '. ' + __alloT('stem.treelab.say_age', 'Age ') + st.age + ', '
            + __alloT('stem.treelab.say_height', 'height ') + round(st.heightM, 1) + ' '
            + __alloT('stem.treelab.metres', 'metres') + '.');
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
        // Goal completion is detected HERE rather than in the render body, so the
        // award fires once, on the year it is actually earned. Same two model-owned
        // targets the card draws: the renderer's own maturity height, and the
        // cheapest strategy this species has.
        if (!d.goalReached && st.alive) {
          if (treeGoalReached(st)) {
            patch.goalReached = st.age;
            xp(8);
            sfxGrow();
            srSay(__alloT('stem.treelab.goal_reached_say', 'Goal reached at age ') + st.age +
              __alloT('stem.treelab.goal_reached_say2', '. This tree is full grown and can reproduce.'));
            if (addToast) addToast('🎯 ' + __alloT('stem.treelab.goal_toast', 'A tree that made it'), 'success');
          }
        }
        if (!st.alive) {
          patch.playing = false;
          sfxBad();
          srSay(__alloT('stem.treelab.say_died_age', 'The tree died at age ') + st.age + '. ' +
            (st.causeOfDeath === 'senescence'
              ? __alloT('stem.treelab.say_died_old', 'It reached the end of its lifespan.')
              : __alloT('stem.treelab.say_died_starved', 'It spent more than it made for too long.')));
          if (addToast) addToast(__alloT('stem.treelab.say_died_age', 'The tree died at age ') + st.age, 'error');
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
        if (next && !tree.alive) { sfxBad(); srSay(__alloT('stem.treelab.say_dead_first', 'This tree has died. Start a new seedling first.')); return; }
        upd('playing', next);
        sfxTick();
        srSay(next
          ? __alloT('stem.treelab.say_playing', 'Playing at ') + speedLabel(speed) + '.'
          : __alloT('stem.treelab.say_paused', 'Paused at age ') + tree.age + '.');
      }

      function sendDrought(years) {
        var list = [];
        for (var i = 0; i < years; i++) list.push(tree.age + i);
        var nextCfg = Object.assign({}, envCfg, { droughtYears: list });
        var nextWater = envForYear(nextCfg, tree.age).soilWater;
        updMulti({
          droughtYears: list,
          lastEffect: buildConditionEffect('water', liveEnv.soilWater, nextWater, nextCfg, 'drought-start')
        });
        sfxBad();
        srSay(__alloT('stem.treelab.drought_started', 'A drought begins. It will last ') + years +
          __alloT('stem.treelab.drought_years', ' years.'));
        if (addToast) addToast('☀️ ' + __alloT('stem.treelab.drought_toast', 'Drought'), 'error');
      }
      function endDrought() {
        var nextCfg = Object.assign({}, envCfg, { droughtYears: [] });
        var nextWater = envForYear(nextCfg, tree.age).soilWater;
        updMulti({
          droughtYears: [],
          lastEffect: buildConditionEffect('water', liveEnv.soilWater, nextWater, nextCfg, 'drought-end')
        });
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
          historyFocusYear: null,
          historyReplay: null,
          historyClaimYear: null, historyClaim: null,
          yearPhase: 0, droughtYears: [], lastEffect: null, growAdvancedOpen: false, goalReached: null,
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
        srSay(__alloT('stem.treelab.say_reset_pre', 'Reset to a new ')
          + __alloT('stem.treelab.species_' + sid, speciesById(sid).name)
          + __alloT('stem.treelab.say_reset_post', ' seedling.'));
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
      // Growth cadence: how many simulated years pass between scene updates.
      //
      // This used to be 25 / 5 / 1 because "geometry rebuilds destroy and recreate a
      // WebGL renderer", so one update per real second was all the budget allowed.
      // That premise is gone: the shared viewer now swaps scene content in place and
      // keeps the renderer, so an update costs a geometry rebuild rather than a GPU
      // context. Bucketing by 25 years was what made fast-forward read as a slideshow
      // of snapshots instead of a tree growing.
      //
      // Now targeted in REAL time rather than sim years. Measured cost of one
      // buildTreeScene for a mature 81-year oak (16.5 m, 52.7 cm DBH) on a desktop:
      // 29 ms, cheap because the foliage is InstancedMesh. Three a second is ~9% of
      // one core there and leaves headroom on a school Chromebook, which is the
      // machine that decides this number. Reduced motion drops to one, matching the
      // rest of the tool's motion budget.
      //
      // At 1 yr/s that is every year, the finest the yearly biology can offer; at
      // 25 yr/s it is every eighth year rather than every twenty-fifth. Pause still
      // restores the exact height/DBH/canopy/root bands for close inspection.
      var growthUpdatesPerSecond = reduceMotion ? 1 : 3;
      var growthCadence = Math.max(1, Math.round(speed.yps / growthUpdatesPerSecond));
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
        if (next && typeof document !== 'undefined') {
          try { FULLSCREEN_RETURN_FOCUS = document.activeElement; }
          catch (e) { FULLSCREEN_RETURN_FOCUS = null; }
        }

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
        if (typeof document !== 'undefined') {
          var returnFocus = next ? null : FULLSCREEN_RETURN_FOCUS;
          setTimeout(function () {
            var focusTarget = next
              ? document.getElementById('treelab-full-stage')
              : returnFocus;
            try {
              if (focusTarget && focusTarget.focus &&
                  (!focusTarget.ownerDocument || focusTarget.ownerDocument.contains(focusTarget))) focusTarget.focus();
            } catch (e) {}
            if (!next) FULLSCREEN_RETURN_FOCUS = null;
          }, 80);
        }
      }

      function handleFullScreenKey(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          e.stopPropagation();
          setFull(false);
          return;
        }
        if (e.key !== 'Tab') return;
        var stage = e.currentTarget;
        if (!stage || !stage.querySelectorAll) return;
        var focusable = Array.prototype.slice.call(stage.querySelectorAll(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
        ));
        if (!focusable.length) {
          e.preventDefault();
          if (stage.focus) stage.focus();
          return;
        }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        var active = typeof document !== 'undefined' ? document.activeElement : null;
        if (active === stage || !stage.contains(active) || (e.shiftKey && active === first) || (!e.shiftKey && active === last)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
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
      // One row of the full-screen carbon budget. `kg C`, never a bare `kg`: every mass
      // in this engine is carbon, and the tool's own guard rejects a number followed by
      // a bare kg because it reads as biomass and is about double.
      function budgetLine(key, label, value, hex) {
        return h('div', {
          key: 'bl-' + key,
          style: { display: 'flex', justifyContent: 'space-between', gap: 8 }
        }, [
          h('span', { key: 'a', style: { color: T.dim } }, label),
          h('span', { key: 'b', style: { fontWeight: 800, color: hex, whiteSpace: 'nowrap' } },
            round(value, 2) + ' kg C')
        ]);
      }

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
            style: { fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 6 }
          }, __alloT('stem.treelab.conditions', 'Conditions')),
          // Somewhere to START. Three sliders with no reference points is a lot to ask
          // of a student who does not yet know what a limiting factor feels like; a
          // named place they can picture gets them to an interesting state in one
          // click, and the sliders then show them what that place actually IS.
          h('div', {
            key: 'places', role: 'group',
            'aria-label': __alloT('stem.treelab.places', 'Places'),
            style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 }
          }, ENV_PLACES.map(function (pl) {
            var on = Math.abs(envCfg.light - pl.light) < 0.03 &&
              Math.abs(envCfg.soilWater - pl.soilWater) < 0.03 &&
              Math.abs(envCfg.tempC - pl.tempC) < 1;
            return btn('place-' + pl.id, pl.emoji + ' ' + __alloT('stem.treelab.place_' + pl.id, pl.label), function () {
              // Writes the SAME inputs the sliders write, so a place is a shortcut
              // through the model rather than a costume laid over it.
              updMulti({ light: pl.light, soilWater: pl.soilWater, tempC: pl.tempC, lastEffect: null });
              srSay(pl.label + '. ' + __alloT('stem.treelab.place_note_' + pl.id, pl.note));
            }, { small: true, pressed: on, disabled: experimentLocked || !tree.alive });
          })),
          slider('fs-light', __alloT('stem.treelab.light', 'Light'), envCfg.light, 0, 1, 0.05,
            function (v) { changeCondition('light', v, 'light'); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked || !tree.alive),
          slider('fs-water', __alloT('stem.treelab.soil_water', 'Soil water'), envCfg.soilWater, 0, 1, 0.05,
            function (v) { changeCondition('soilWater', v, 'water'); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked || !tree.alive),
          atLeast(band, 'g68')
            ? slider('fs-co2', CO2, envCfg.co2ppm, 180, 900, 10,
              function (v) { changeCondition('co2ppm', v, 'co2'); }, function (v) { return v + ' ppm'; }, experimentLocked || !tree.alive)
            : null,
          // ── What it COSTS to stay alive. ──
          //
          // "What limits a tree, what it costs to stay alive, and how it makes more of
          // itself" is the tool's own subtitle, and full screen showed the first third
          // of it. A tree can be in full leaf, in bright light, and still be spending
          // more than it earns — that is the fact behind every carbon-starvation death
          // in this model, and it was invisible in the view a student actually watches.
          //
          // Read from the same `live` / `liveResp` the budget card uses. Deriving them
          // again here is how a picture starts disagreeing with the table under it.
          // A DEAD tree earns nothing and spends nothing. live.gross is computed from
          // the stored leafArea whether or not the tree is alive, so without this gate
          // the panel showed a corpse with a healthy income — "This tree has died" in
          // the HUD, "Left to grow with 47 kg C" right under it. Same claim-audit class
          // as the post-mortem trusting a stale flag: never let a surface report a
          // number the state it describes could not produce.
          h('div', {
            key: 'budget',
            style: {
              marginTop: 2, paddingTop: 8, borderTop: '1px dashed ' + T.border,
              fontSize: 11.5, lineHeight: 1.55, color: T.text
            }
          }, !tree.alive ? [
            h('div', {
              key: 'bh',
              style: { fontWeight: 800, marginBottom: 4, color: T.dim, fontSize: 11 }
            }, __alloT('stem.treelab.this_year', 'This year')),
            h('div', { key: 'gone', style: { color: T.dim, lineHeight: 1.5 } },
              __alloT('stem.treelab.dead_budget',
                'Nothing. A dead tree makes no sugar and spends none. Its stored carbon stays in the wood.'))
          ] : [
            h('div', {
              key: 'bh',
              style: { fontWeight: 800, marginBottom: 4, color: T.dim, fontSize: 11 }
            }, __alloT('stem.treelab.this_year', 'This year')),
            budgetLine('made', __alloT('stem.treelab.made_short', 'Made'), live.gross, T.good),
            budgetLine('spent', __alloT('stem.treelab.spent_short', 'Spent staying alive'), liveResp, T.warn),
            budgetLine('net', __alloT('stem.treelab.left_short', 'Left to grow with'), liveNet,
              liveNet >= 0 ? T.accent : T.bad),
            // A negative year is the whole drama of the model and deserves saying, not
            // just a red number a student is left to interpret.
            liveNet < 0 ? h('div', {
              key: 'defic',
              style: { marginTop: 5, color: T.bad, fontSize: 11, lineHeight: 1.45 }
            }, __alloT('stem.treelab.full_deficit',
              'Spending more than it makes, and living off its reserves.')) : null
          ]),
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
          }, !tree.alive
            // Diagnosing a limiting factor for a corpse invites the student to fix it.
            ? __alloT('stem.treelab.full_why_dead',
              'Nothing limits a dead tree. Start a new seedling to keep experimenting.')
            : lim.viaStomata
              ? __alloT('stem.treelab.full_why_stomata',
                'Water is the limit. ' + CO2 + ' is running lower, but only because water stress has closed the stomata that let it in.')
              : __alloT('stem.treelab.full_why_' + (lim.id || 'none'),
                limLabel + ' is the limit right now. Raise it and the rate moves; raise anything else and it will not.'))
        ]);
      }

      function conditionResponse(effect, delta) {
        if (effect.factor === 'water') {
          if (effect.mode === 'drought-start') {
            return __alloT('stem.treelab.effect_drought_start',
              'Visible response: leaves droop and dull as water pressure falls. Stomata close, so less ' + CO2 + ' reaches the leaf.');
          }
          if (effect.mode === 'drought-end') {
            return __alloT('stem.treelab.effect_drought_end',
              'Visible response: leaves lift and green as water stress eases. Stomata can reopen and admit more ' + CO2 + '.');
          }
          return effect.after < effect.before
            ? __alloT('stem.treelab.effect_water_down',
              'Visible response: the crown wilts as water pressure falls. Closing stomata save water but also slow carbon intake.')
            : __alloT('stem.treelab.effect_water_up',
              'Visible response: the crown recovers as water pressure rises. Reopening stomata can restore carbon intake.');
        }
        if (Math.abs(delta) < 0.005) {
          return __alloT('stem.treelab.effect_limited_elsewhere',
            'The budget barely moved because another factor is still setting the rate. Fix the factor named above, then try this change again.');
        }
        if (effect.factor === 'light') {
          return delta > 0
            ? __alloT('stem.treelab.effect_light_up',
              'More usable light raises this year\'s carbon surplus. Run the clock to turn that surplus into leaves, roots, wood, or seeds.')
            : __alloT('stem.treelab.effect_light_down',
              'Less usable light shrinks this year\'s carbon surplus. Run the clock and the slower growth will appear in the tree and its next ring.');
        }
        if (effect.factor === 'temperature') {
          var closer = Math.abs(effect.after - sp.optTemp) < Math.abs(effect.before - sp.optTemp);
          return closer
            ? __alloT('stem.treelab.effect_temp_closer',
              'The temperature moved closer to this species\' optimum, so its carbon-making machinery can work more effectively.')
            : __alloT('stem.treelab.effect_temp_farther',
              'The temperature moved away from this species\' optimum, so the carbon budget tightens before the tree visibly grows.');
        }
        return delta > 0
          ? __alloT('stem.treelab.effect_co2_up',
            'More ' + CO2 + ' reached open stomata and lifted the carbon budget. Run the clock to turn that gain into visible growth.')
          : __alloT('stem.treelab.effect_co2_down',
            'Less ' + CO2 + ' reached the leaves, reducing the carbon available for visible growth.');
      }

      function causeEffectPanel() {
        if (!lastEffect || !tree.alive) return null;
        var delta = lastEffect.netAfter - lastEffect.netBefore;
        var factorLabel = experimentFactorLabel(lastEffect.factor);
        var limitingLabel = experimentFactorLabel(lastEffect.limiting || lastEffect.factor);
        var factorTone = tone(FACTOR_HUE(lastEffect.factor));
        var limitingTone = tone(FACTOR_HUE(lastEffect.limiting || lastEffect.factor));
        var deltaTone = delta > 0.005 ? T.good : (delta < -0.005 ? T.bad : T.dim);
        var signedDelta = (delta > 0.005 ? '+' : '') + round(delta, 2) + ' kg C';
        function effectTile(key, kicker, value, detail, valueTone) {
          return h('div', { key: key, className: 'allo-tree-effect-tile' }, [
            h('div', { key: 'k', className: 'allo-tree-effect-kicker' }, kicker),
            h('div', { key: 'v', className: 'allo-tree-effect-value', style: valueTone ? { color: valueTone } : undefined }, value),
            h('div', { key: 'd', className: 'allo-tree-effect-detail' }, detail)
          ]);
        }
        return h('section', {
          key: 'effect-' + (lastEffect.seq || 0),
          className: 'allo-tree-effect',
          'data-tree-effect': lastEffect.factor,
          role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
          style: { borderLeftColor: factorTone }
        }, [
          h('div', { key: 'title', className: 'allo-tree-effect-title' }, [
            h('span', { key: 'dot', 'aria-hidden': 'true', style: { width: 9, height: 9, borderRadius: 99, background: factorTone } }),
            h('span', { key: 'text' }, __alloT('stem.treelab.effect_title', 'Cause \u2192 effect'))
          ]),
          h('div', { key: 'grid', className: 'allo-tree-effect-grid' }, [
            effectTile('changed',
              __alloT('stem.treelab.effect_changed', 'You changed'),
              factorLabel,
              effectValue(lastEffect, lastEffect.before) + ' \u2192 ' + effectValue(lastEffect, lastEffect.after)),
            effectTile('budget',
              __alloT('stem.treelab.effect_budget', 'Carbon budget'),
              round(lastEffect.netBefore, 2) + ' \u2192 ' + round(lastEffect.netAfter, 2) + ' kg C',
              signedDelta + __alloT('stem.treelab.effect_from_change', ' from this change'),
              deltaTone),
            effectTile('limit',
              __alloT('stem.treelab.effect_limiting', 'Now limiting'),
              limitingLabel,
              __alloT('stem.treelab.effect_smallest', 'The smallest input sets the rate.'),
              limitingTone)
          ]),
          h('div', { key: 'response', className: 'allo-tree-effect-response' }, [
            h('strong', { key: 'label' }, __alloT('stem.treelab.effect_tree_response', 'Tree response: ')),
            h('span', { key: 'copy' }, conditionResponse(lastEffect, delta).replace(/^Visible response:\s*/, ''))
          ])
        ]);
      }

      function sceneEffectChip(full) {
        if (!lastEffect || !tree.alive) return null;
        var delta = lastEffect.netAfter - lastEffect.netBefore;
        var arrow = delta > 0.005 ? '\u2191' : (delta < -0.005 ? '\u2193' : '\u2192');
        var signed = (delta > 0.005 ? '+' : '') + round(delta, 2) + ' kg C';
        var factorTone = tone(FACTOR_HUE(lastEffect.factor));
        return h('div', {
          key: 'scene-effect-' + (lastEffect.seq || 0),
          className: 'allo-tree-scene-effect',
          'data-tree-scene-effect': lastEffect.factor,
          'aria-hidden': 'true',
          style: {
            position: 'absolute', top: full ? 56 : 14, left: 14, zIndex: 4,
            display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: 'calc(100% - 28px)',
            padding: '6px 9px', borderRadius: 999, pointerEvents: 'none',
            background: T.card, color: T.text, border: '1px solid ' + T.border,
            borderLeft: '4px solid ' + factorTone, fontSize: 10.5, fontWeight: 850
          }
        }, [
          h('span', { key: 'factor' }, experimentFactorLabel(lastEffect.factor)),
          h('span', { key: 'delta', style: { color: delta > 0.005 ? T.good : (delta < -0.005 ? T.bad : T.dim) } },
            arrow + ' ' + signed)
        ]);
      }
      function habitatRibbon() {
        var limiterId = causeAwareLimiter(live);
        var items = [
          {
            id: 'light',
            label: __alloT('stem.treelab.light', 'Light'),
            value: Math.round(envCfg.light * 100) + '%',
            strength: live.factors.light
          },
          {
            id: 'water',
            label: __alloT('stem.treelab.water', 'Water'),
            value: Math.round(liveEnv.soilWater * 100) + '%',
            strength: live.factors.water
          },
          {
            id: 'temperature',
            label: __alloT('stem.treelab.temperature', 'Temperature'),
            value: round(envCfg.tempC, 0) + ' ' + DEG + 'C',
            strength: live.factors.temp
          }
        ];
        if (atLeast(band, 'g68')) {
          items.push({
            id: 'co2',
            label: CO2,
            value: round(envCfg.co2ppm, 0) + ' ppm',
            strength: live.factors.co2
          });
        }
        return h('div', {
          key: 'habitat', className: 'allo-tree-habitat-ribbon',
          role: 'group',
          'aria-label': __alloT('stem.treelab.habitat_now', 'Current growing conditions')
        }, items.map(function (item) {
          var limiting = tree.alive && limiterId === item.id;
          var itemTone = tone(FACTOR_HUE(item.id));
          var valueLabel = item.label + ': ' + item.value + (limiting
            ? '. ' + __alloT('stem.treelab.current_limit', 'Current limiting factor') : '');
          return h('div', {
            key: item.id,
            className: 'allo-tree-habitat-item' + (limiting ? ' is-limiting' : ''),
            'aria-label': valueLabel,
            style: { borderTop: '3px solid ' + itemTone }
          }, [
            h('div', { key: 'top', className: 'allo-tree-habitat-top' }, [
              h('span', { key: 'label', className: 'allo-tree-habitat-label' }, item.label),
              limiting ? h('span', { key: 'badge', className: 'allo-tree-habitat-badge' },
                __alloT('stem.treelab.limit_badge', 'Limiting')) : null
            ]),
            h('strong', { key: 'value', className: 'allo-tree-habitat-value' }, item.value),
            h('span', { key: 'track', className: 'allo-tree-habitat-track', 'aria-hidden': 'true' },
              h('span', {
                className: 'allo-tree-habitat-fill',
                style: { width: Math.round(clamp(item.strength, 0, 1) * 100) + '%', background: itemTone }
              }))
          ]);
        }));
      }
      function viewerPanel() {
        var status = d.viewerStatus || 'idle';
        var full = !!d.viewerFull;
        var viewerLimit = experimentFactorLabel(causeAwareLimiter(live));
        // This is the ONLY description of the scene a screen-reader user gets, so it
        // is translated like any other visible text rather than left in English.
        var sceneCondition = !tree.alive
          ? ' ' + __alloT('stem.treelab.alt_dead', 'The tree is dead and its bare frame remains visible.')
          : (treeVisual.severeWaterStress
            ? ' ' + __alloT('stem.treelab.alt_wilted', 'Its leaves are visibly wilted by water stress.')
            : (treeVisual.waterStress > 0.28 ? ' ' + __alloT('stem.treelab.alt_mild_stress', 'Its foliage shows mild water stress.') : ''));
        if (tree.alive && treeVisual.chronicDeficit) {
          sceneCondition += ' ' + __alloT('stem.treelab.alt_thinned', 'Its canopy is thinned by a chronic carbon deficit.');
        }
        var sceneAlt = __alloT('stem.treelab.alt_3d', 'Three-dimensional ')
          + __alloT('stem.treelab.season_' + season, season) + ' '
          + __alloT('stem.treelab.alt_view_of', 'view of ')
          + __alloT('stem.treelab.species_' + sp.id, sp.name)
          + ', ' + __alloT('stem.treelab.age', 'age') + ' ' + tree.age + ' '
          + __alloT('stem.treelab.year_many', 'years') + ', ' + round(tree.heightM, 1) + ' '
          + __alloT('stem.treelab.alt_tall_with', 'metres tall, with ') + cloneCount + ' '
          + __alloT('stem.treelab.alt_clonal_stems', 'clonal stems.') + sceneCondition + ' '
          + __alloT('stem.treelab.alt_limiting_now', 'Current limiting factor: ') + viewerLimit + '.';
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
          h('div', { key: 'hd', className: 'allo-tree-viewer-head' }, [
            h('div', { key: 'a', className: 'allo-tree-viewer-name' },
              sp.emoji + ' ' + __alloT('stem.treelab.species_' + sp.id, sp.name) + ' · ' + __alloT('stem.treelab.age', 'age') + ' ' + tree.age),
            h('div', { key: 'b', className: 'allo-tree-viewer-metrics' },
              round(tree.heightM, 1) + ' ' + __alloT('stem.treelab.m_tall', 'm tall') + ' · '
              + round(tree.dbhCm, 1) + ' ' + __alloT('stem.treelab.cm_across', 'cm across')),
            // Same dead-gate the full-screen HUD carries: naming a limiting factor for
            // a dead tree invites the student to go and fix it.
            h('div', { key: 'lim', className: 'allo-tree-viewer-limit', style: { border: '1px solid ' + (tree.alive ? T.accent : T.bad), color: tree.alive ? T.text : T.bad } },
              tree.alive
                ? __alloT('stem.treelab.limiting_now_short', 'Limiting now: ') + viewerLimit
                : __alloT('stem.treelab.dead_chip', 'This tree has died'))
          ]),
          full ? null : habitatRibbon(),
          h('div', {
            id: 'treelab-full-stage',
            'data-tree-fullstage': full ? 'true' : undefined,
            role: full ? 'dialog' : undefined,
            'aria-modal': full ? true : undefined,
            'aria-labelledby': full ? 'treelab-full-title' : undefined,
            'aria-describedby': full ? 'treelab-full-description' : undefined,
            tabIndex: full ? -1 : undefined,
            autoFocus: full ? true : undefined,
            key: 'stage', className: 'allo-tree-stage', style: stageStyle,
            // Escape leaves full screen. Bound to the STAGE rather than to window: a
            // window key listener from a tool outranks the host's own handling and
            // keeps firing after the student has moved on to a different tool.
            onKeyDown: full ? handleFullScreenKey : undefined
          }, [
            full ? h('h2', {
              key: 'full-title', id: 'treelab-full-title', className: 'allo-tree-sr-only'
            }, __alloT('stem.treelab.full_title', 'Immersive tree viewer: ') + __alloT('stem.treelab.species_' + sp.id, sp.name)) : null,
            full ? h('p', {
              key: 'full-description', id: 'treelab-full-description', className: 'allo-tree-sr-only'
            }, __alloT('stem.treelab.full_description', 'Explore the tree with the controls below. Press Escape to leave full screen.')) : null,
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
                  //
                  // Responsive rather than a fixed 420: a laptop at 900px tall and a 27in
                  // monitor were getting an identically small window on the one thing the
                  // tool is actually about. The floor keeps the old height as the WORST
                  // case, so nothing shrinks; the ceiling stops the controls below being
                  // pushed off-screen on a very tall display. The shell's ResizeObserver
                  // re-frames on a material aspect change, and frame() already raises
                  // fill and pitch for a squarer box, so the camera follows this on its
                  // own.
                  width: '100%', height: 'clamp(420px, 58vh, 660px)', borderRadius: 10, overflow: 'hidden',
                  background: isDark ? '#020617' : '#e2e8f0', border: '1px solid ' + T.border
                }
            }),
            sceneEffectChip(full),
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
                { small: true, pressed: full, id: 'treelab-fullscreen-toggle', hasPopup: 'dialog', controls: 'treelab-full-stage', ariaLabel: full
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
                return btn('fsp-' + option.id, speedLabel(option), function () {
                  updMulti({ speed: option.id });
                  srSay(__alloT('stem.treelab.say_speed_set', 'Speed set to ') + speedLabel(option) + '. ' + speedHint(option));
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
                    ? part.label + ' ' + __alloT('stem.treelab.say_part_selected', 'selected in the three-dimensional view.')
                    : __alloT('stem.treelab.say_part_cleared', 'Anatomy selection cleared.'));
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
        ], undefined, 'allo-tree-viewer-card');
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
      function seasonPortrait(id) {
        var needle = sp.leafType === 'needle';
        var leafLabel = band === 'k2'
          ? __alloT('stem.treelab.season_signal_leaves_k2', 'Leaves')
          : __alloT('stem.treelab.season_signal_canopy', 'Canopy');
        var carbonLabel = band === 'k2'
          ? __alloT('stem.treelab.season_signal_food_k2', 'Food making')
          : __alloT('stem.treelab.season_signal_carbon', 'Carbon work');
        var insideLabel = band === 'k2'
          ? __alloT('stem.treelab.season_signal_inside_k2', 'Inside work')
          : __alloT('stem.treelab.season_signal_inside', 'Transport and reserves');
        var portraits = {
          spring: {
            title: __alloT('stem.treelab.season_portrait_spring', 'A canopy wakes'),
            copy: needle
              ? __alloT('stem.treelab.season_portrait_spring_needle', 'Needles are already in place, so work can restart as soon as warmth and water return.')
              : __alloT('stem.treelab.season_portrait_spring_broad', 'Stored carbon pays for buds and a brand-new canopy before those leaves can repay the tree.'),
            signals: [
              ['\uD83C\uDF3F', leafLabel, needle
                ? __alloT('stem.treelab.season_value_needles_ready', 'Needles ready')
                : __alloT('stem.treelab.season_value_leaves_opening', 'Leaves opening')],
              ['\u2600\uFE0F', carbonLabel, __alloT('stem.treelab.season_value_waking', 'Waking up')],
              ['\u2191', insideLabel, __alloT('stem.treelab.season_value_sap_rising', 'Sap rising')]
            ]
          },
          summer: {
            title: __alloT('stem.treelab.season_portrait_summer', 'The solar factory is open'),
            copy: needle
              ? __alloT('stem.treelab.season_portrait_summer_needle', 'Needles trade some peak speed for tighter water control while long days power growth.')
              : __alloT('stem.treelab.season_portrait_summer_broad', 'A full broadleaf canopy captures long days while xylem replaces water lost through open stomata.'),
            signals: [
              ['\uD83C\uDF3F', leafLabel, __alloT('stem.treelab.season_value_canopy_full', 'Canopy full')],
              ['\u2600\uFE0F', carbonLabel, __alloT('stem.treelab.season_value_busiest', 'Busiest season')],
              ['\uD83D\uDCA7', insideLabel, needle
                ? __alloT('stem.treelab.season_value_water_guarded', 'Water guarded')
                : __alloT('stem.treelab.season_value_water_pull', 'Strong water pull')]
            ]
          },
          autumn: {
            title: __alloT('stem.treelab.season_portrait_autumn', 'Useful materials come home'),
            copy: needle
              ? __alloT('stem.treelab.season_portrait_autumn_needle', 'The needles remain, but shortening days slow growth and shift the tree toward storage.')
              : __alloT('stem.treelab.season_portrait_autumn_broad', 'Before leaves fall, the tree retrieves useful nutrients and moves resources back into living wood.'),
            signals: [
              ['\uD83C\uDF42', leafLabel, needle
                ? __alloT('stem.treelab.season_value_needles_stay', 'Needles stay')
                : __alloT('stem.treelab.season_value_leaves_closing', 'Leaves closing')],
              ['\u2600\uFE0F', carbonLabel, __alloT('stem.treelab.season_value_slowing', 'Slowing down')],
              ['\u21A9', insideLabel, __alloT('stem.treelab.season_value_save_store', 'Save and store')]
            ]
          },
          winter: {
            title: __alloT('stem.treelab.season_portrait_winter', 'Survival shifts to stored carbon'),
            copy: needle
              ? __alloT('stem.treelab.season_portrait_winter_needle', 'Needles remain, but frozen soil keeps stomata mostly shut and photosynthesis very low.')
              : __alloT('stem.treelab.season_portrait_winter_broad', 'With no leaves, photosynthesis stops while living tissues keep drawing from stored carbon.'),
            signals: [
              ['\u2744\uFE0F', leafLabel, needle
                ? __alloT('stem.treelab.season_value_needles_stay', 'Needles stay')
                : __alloT('stem.treelab.season_value_bare', 'Bare')],
              ['\u2600\uFE0F', carbonLabel, needle
                ? __alloT('stem.treelab.season_value_very_low', 'Very low')
                : __alloT('stem.treelab.season_value_stopped', 'Stopped')],
              ['\uD83C\uDF30', insideLabel, __alloT('stem.treelab.season_value_stores_pay', 'Stores pay costs')]
            ]
          }
        };
        return portraits[id] || portraits.summer;
      }

      function phenologyTrail() {
        var needle = sp.leafType === 'needle';
        var stageTone = {
          spring: '#22c55e', summer: '#15803d', autumn: '#ea580c', winter: '#38bdf8'
        };
        var broadStages = [
          {
            id: 'spring', icon: '\uD83C\uDF31', action: 'budburst',
            title: __alloT('stem.treelab.phenology_broad_spring_title', 'Budburst'),
            detail: __alloT('stem.treelab.phenology_broad_spring_detail', 'New leaves unfold')
          },
          {
            id: 'summer', icon: '\uD83C\uDF3F', action: 'working',
            title: __alloT('stem.treelab.phenology_broad_summer_title', 'Full green canopy'),
            detail: __alloT('stem.treelab.phenology_broad_summer_detail', 'Chlorophyll captures light')
          },
          {
            id: 'autumn', icon: '\uD83C\uDF42', action: 'falling',
            title: __alloT('stem.treelab.phenology_broad_autumn_title', 'Color + leaf fall'),
            detail: __alloT('stem.treelab.phenology_broad_autumn_detail', 'Pigments show; leaves detach')
          },
          {
            id: 'winter', icon: '\u2744\uFE0F', action: 'bare',
            title: __alloT('stem.treelab.phenology_broad_winter_title', 'Bare branches'),
            detail: __alloT('stem.treelab.phenology_broad_winter_detail', 'Dormant buds wait')
          }
        ];
        var needleStages = [
          {
            id: 'spring', icon: '\uD83C\uDF31', action: 'new-needles',
            title: __alloT('stem.treelab.phenology_needle_spring_title', 'New candle growth'),
            detail: __alloT('stem.treelab.phenology_needle_spring_detail', 'Fresh needles expand')
          },
          {
            id: 'summer', icon: '\uD83C\uDF32', action: 'working',
            title: __alloT('stem.treelab.phenology_needle_summer_title', 'Needles working'),
            detail: __alloT('stem.treelab.phenology_needle_summer_detail', 'Several age groups stay green')
          },
          {
            id: 'autumn', icon: '\uD83C\uDF42', action: 'gradual-shed',
            title: __alloT('stem.treelab.phenology_needle_autumn_title', 'Older needles shed'),
            detail: __alloT('stem.treelab.phenology_needle_autumn_detail', 'Small cohorts turn and drop')
          },
          {
            id: 'winter', icon: '\uD83C\uDF32', action: 'retained',
            title: __alloT('stem.treelab.phenology_needle_winter_title', 'Needles retained'),
            detail: __alloT('stem.treelab.phenology_needle_winter_detail', 'Foliage spans seasons')
          }
        ];
        var stages = needle ? needleStages : broadStages;
        var process = needle
          ? __alloT('stem.treelab.phenology_needle_process', 'Evergreen means foliage is retained across seasons, not forever. Pines shed older needle cohorts gradually, and the accumulating needles form forest-floor duff.')
          : (band === 'k2'
            ? __alloT('stem.treelab.phenology_broad_process_k2', 'Green fades, the tree saves useful materials, a tiny seal forms, and the leaves let go.')
            : __alloT('stem.treelab.phenology_broad_process', 'As chlorophyll breaks down, other pigments become visible. The tree reclaims some nutrients, forms an abscission layer that seals the twig, and the leaf detaches. Species and weather change the timing and colors.'));
        return h('section', {
          key: 'phenology',
          className: 'allo-tree-phenology',
          'data-tree-phenology': needle ? 'evergreen' : 'deciduous',
          'data-current-phenology-stage': season,
          'aria-label': __alloT('stem.treelab.phenology_label', 'Seasonal leaf-life calendar')
        }, [
          h('div', { key: 'head', className: 'allo-tree-phenology-head' }, [
            h('strong', { key: 'title' }, band === 'k2'
              ? __alloT('stem.treelab.phenology_title_k2', 'A leaf\'s year')
              : __alloT('stem.treelab.phenology_title', 'Leaf-life calendar')),
            h('span', { key: 'habit' }, needle
              ? __alloT('stem.treelab.phenology_habit_needle', 'Evergreen needles')
              : __alloT('stem.treelab.phenology_habit_broad', 'Deciduous broadleaf'))
          ]),
          h('ol', { key: 'trail', className: 'allo-tree-phenology-trail' }, stages.map(function (stage) {
            var current = stage.id === season;
            return h('li', {
              key: stage.id,
              className: 'allo-tree-phenology-stage' + (stage.action === 'falling' ? ' is-leaf-fall' : ''),
              'data-phenology-stage': stage.id,
              'data-leaf-action': stage.action,
              'aria-current': current ? 'step' : undefined,
              style: { '--phenology-tone': tone(stageTone[stage.id]) }
            }, [
              h('span', { key: 'icon', className: 'allo-tree-phenology-icon', 'aria-hidden': 'true' }, stage.icon),
              h('strong', { key: 'title' }, stage.title),
              h('span', { key: 'detail' }, stage.detail)
            ]);
          })),
          h('div', { key: 'process', className: 'allo-tree-phenology-process' }, [
            h('b', { key: 'icon', 'aria-hidden': 'true' }, '\u2192'),
            h('span', { key: 'copy' }, process)
          ])
        ]);
      }

      function autumnLeafLab() {
        if (season !== 'autumn') return null;
        var needle = sp.leafType === 'needle';
        var items = needle ? [
          {
            id: 'newest', mark: '1', tone: '#22c55e',
            title: __alloT('stem.treelab.autumn_needle_newest_title', 'Current-year needles'),
            copy: __alloT('stem.treelab.autumn_needle_newest_copy', 'Newest needles stay bright and usually remain.')
          },
          {
            id: 'middle', mark: '2+', tone: '#15803d',
            title: __alloT('stem.treelab.autumn_needle_middle_title', 'Middle cohorts'),
            copy: __alloT('stem.treelab.autumn_needle_middle_copy', 'Older green needles keep working across seasons.')
          },
          {
            id: 'oldest', mark: 'old', tone: '#a16207',
            title: __alloT('stem.treelab.autumn_needle_oldest_title', 'Oldest cohort'),
            copy: __alloT('stem.treelab.autumn_needle_oldest_copy', 'Some yellow or brown, detach, and join the duff.')
          }
        ] : [
          {
            id: 'chlorophyll', mark: 'Chl', tone: '#15803d',
            title: __alloT('stem.treelab.autumn_chlorophyll_title', 'Chlorophyll'),
            copy: __alloT('stem.treelab.autumn_chlorophyll_copy', 'Green pigment breaks down and recedes.')
          },
          {
            id: 'carotenoids', mark: 'Car', tone: '#eab308',
            title: __alloT('stem.treelab.autumn_carotenoids_title', 'Carotenoids'),
            copy: __alloT('stem.treelab.autumn_carotenoids_copy', 'Yellow and orange pigments already present become visible.')
          },
          {
            id: 'anthocyanins', mark: 'Ant', tone: '#be123c',
            title: __alloT('stem.treelab.autumn_anthocyanins_title', 'Anthocyanins'),
            copy: __alloT('stem.treelab.autumn_anthocyanins_copy', 'Red and purple pigments can be produced in some leaves.')
          },
          {
            id: 'tannins', mark: 'Tan', tone: '#92400e',
            title: __alloT('stem.treelab.autumn_tannins_title', 'Tannins'),
            copy: __alloT('stem.treelab.autumn_tannins_copy', 'Brown compounds often dominate late in the season.')
          }
        ];
        var title = needle
          ? (band === 'k2'
            ? __alloT('stem.treelab.autumn_needle_lab_title_k2', 'A pine holds needles of different ages')
            : __alloT('stem.treelab.autumn_needle_lab_title', 'Evergreen needle-age map'))
          : (band === 'k2'
            ? __alloT('stem.treelab.autumn_pigment_lab_title_k2', 'Why do leaves change color?')
            : __alloT('stem.treelab.autumn_pigment_lab_title', 'Autumn pigment decoder'));
        var copy = needle
          ? __alloT('stem.treelab.autumn_needle_lab_copy', 'Several needle cohorts share the canopy, so shedding is staggered.')
          : __alloT('stem.treelab.autumn_pigment_lab_copy', 'Yellow and orange colors and red colors do not appear for exactly the same reason.');
        var boundary = needle
          ? __alloT('stem.treelab.autumn_needle_boundary', 'Evergreen describes overlapping foliage cohorts, not immortal needles. Older needles still fall, and their slow-decaying litter builds duff.')
          : __alloT('stem.treelab.autumn_pigment_boundary', 'Evidence boundary: leaf color alone cannot reconstruct one exact temperature, rainfall amount, or weather event. Species, leaf chemistry, light, sugar, and weather interact.');
        return h('section', {
          key: 'autumn-lab',
          className: 'allo-tree-autumn-lab',
          'data-tree-autumn-lab': needle ? 'needle-cohorts' : 'pigment-decoder',
          'aria-label': title
        }, [
          h('div', { key: 'head', className: 'allo-tree-autumn-lab-head' }, [
            h('span', { key: 'mark', className: 'allo-tree-autumn-lab-mark', 'aria-hidden': 'true' },
              needle ? '\uD83C\uDF32' : '\uD83C\uDF41'),
            h('strong', { key: 'title' }, title),
            h('span', { key: 'copy' }, copy)
          ]),
          h('div', { key: 'evidence', className: 'allo-tree-autumn-evidence-grid', role: 'list' },
            items.map(function (item) {
              return h('div', {
                key: item.id,
                className: 'allo-tree-autumn-evidence',
                'data-autumn-evidence': item.id,
                role: 'listitem',
                style: { '--autumn-tone': tone(item.tone) }
              }, [
                h('span', { key: 'swatch', className: 'allo-tree-autumn-swatch', 'aria-hidden': 'true' }, item.mark),
                h('strong', { key: 'title' }, item.title),
                h('span', { key: 'copy' }, item.copy)
              ]);
            })),
          h('div', { key: 'boundary', className: 'allo-tree-autumn-boundary' }, [
            h('b', { key: 'icon', 'aria-hidden': 'true' }, '\u24D8'),
            h('span', { key: 'copy' }, boundary)
          ])
        ]);
      }

      // A qualitative observatory: it makes phenology comparable without pretending
      // that the annual engine has suddenly acquired monthly carbon accounting.
      function seasonRow() {
        var driven = playing && speed.seasonal;
        var note = seasonNote(season);
        var portrait = seasonPortrait(season);
        var currentSeason = SEASONS.filter(function (item) { return item.id === season; })[0] || SEASONS[1];
        var seasonHue = {
          spring: '#22c55e', summer: '#f59e0b', autumn: '#ea580c', winter: '#38bdf8'
        }[season] || T.accent;
        if (isContrast) seasonHue = T.accent;
        return h('section', {
          key: 'seasonrow',
          className: 'allo-tree-season-observatory',
          'data-tree-season-guide': season,
          'aria-label': __alloT('stem.treelab.season_observatory_label', 'Season field guide'),
          style: { '--season-hue': tone(seasonHue) }
        }, [
          h('div', { key: 'head', className: 'allo-tree-season-head' }, [
            h('span', { key: 'k', id: 'treelab-season-label', className: 'allo-tree-season-kicker' }, [
              h('span', { key: 'i', 'aria-hidden': 'true' }, '\uD83E\uDDED'),
              h('span', { key: 't' }, __alloT('stem.treelab.season_observatory', 'Season field guide'))
            ]),
            h('span', { key: 's', className: 'allo-tree-season-status' }, driven
              ? __alloT('stem.treelab.season_driven_short', 'Playback is choosing')
              : __alloT('stem.treelab.season_choose_short', 'Choose a season'))
          ]),
          h('div', {
            key: 'choices', className: 'allo-tree-season-choices',
            role: 'group', 'aria-labelledby': 'treelab-season-label'
          }, SEASONS.map(function (choice) {
            var selected = season === choice.id;
            return h('button', {
              key: choice.id, type: 'button',
              className: 'allo-tree-season-choice' + (selected ? ' is-current' : ''),
              'aria-pressed': selected,
              'aria-current': selected ? 'true' : undefined,
              disabled: driven,
              onClick: function () {
                upd('season', choice.id);
                srSay(choice.label + '. ' + seasonNote(choice.id));
              }
            }, [
              h('span', { key: 'i', className: 'allo-tree-season-choice-icon', 'aria-hidden': 'true' }, choice.emoji),
              h('strong', { key: 'l' }, __alloT('stem.treelab.season_' + choice.id, choice.label)),
              h('span', { key: 'c' }, selected
                ? __alloT('stem.treelab.season_now', 'Now')
                : __alloT('stem.treelab.season_explore', 'Explore'))
            ]);
          })),
          h('div', { key: 'portrait', className: 'allo-tree-season-portrait' }, [
            h('span', { key: 'orb', className: 'allo-tree-season-orb', 'aria-hidden': 'true' }, currentSeason.emoji),
            h('div', { key: 'copy' }, [
              h('strong', { key: 't', className: 'allo-tree-season-title' },
                __alloT('stem.treelab.season_' + currentSeason.id, currentSeason.label) + ': ' + portrait.title),
              h('span', { key: 'c', className: 'allo-tree-season-copy' }, portrait.copy)
            ]),
            h('dl', { key: 'signals', className: 'allo-tree-season-signals' },
              portrait.signals.map(function (signal, index) {
                return h('div', { key: index, className: 'allo-tree-season-signal' }, [
                  h('span', { key: 'i', className: 'allo-tree-season-signal-icon', 'aria-hidden': 'true' }, signal[0]),
                  h('dt', { key: 'l' }, signal[1]),
                  h('dd', { key: 'v' }, signal[2])
                ]);
              }))
          ]),
          phenologyTrail(),
          autumnLeafLab(),
          h('div', { key: 'note', className: 'allo-tree-season-note' }, [
            h('strong', { key: 'l' }, __alloT('stem.treelab.season_field_note', 'Field note: ')),
            h('span', { key: 'n' }, note)
          ]),
          h('div', { key: 'boundary', className: 'allo-tree-season-boundary' }, [
            h('span', { key: 'i', 'aria-hidden': 'true' }, '\u24D8'),
            h('span', { key: 't' }, __alloT('stem.treelab.season_honest',
              'The carbon budget on this page is a whole YEAR. Changing the season changes what you are looking at and what is described here, not a figure the model has recalculated.'))
          ])
        ]);
      }
      // ── Views ──
      function flowMarker(number, title, copy) {
        return h('div', {
          className: 'allo-tree-flow-marker', role: 'group',
          'aria-label': __alloT('stem.treelab.step', 'Step') + ' ' + number + ': ' + title
        }, [
          h('span', { key: 'n', className: 'allo-tree-flow-number', 'aria-hidden': 'true' }, number),
          h('div', { key: 'c' }, [
            h('div', { key: 't', className: 'allo-tree-flow-title' }, title),
            h('div', { key: 'p', className: 'allo-tree-flow-copy' }, copy)
          ])
        ]);
      }

      function scienceTrail(key, title, items) {
        var labels = band === 'k2'
          ? [__alloT('stem.treelab.notice', 'Notice'), __alloT('stem.treelab.make_a_guess', 'Make a guess'), __alloT('stem.treelab.tell_why', 'Tell why')]
          : [__alloT('stem.treelab.observe', 'Observe'), __alloT('stem.treelab.predict', 'Predict'), __alloT('stem.treelab.explain', 'Explain')];
        return h('section', {
          key: 'science-' + key,
          className: 'allo-tree-science-trail',
          'data-science-trail': key,
          'aria-label': band === 'k2'
            ? __alloT('stem.treelab.science_path_k2', 'Your science path')
            : __alloT('stem.treelab.science_path', 'Observe, predict, and explain')
        }, [
          h('div', { key: 'head', className: 'allo-tree-science-head' }, [
            h('span', { key: 'i', className: 'allo-tree-science-compass', 'aria-hidden': 'true' }, '\uD83E\uDDED'),
            h('span', { key: 'k', className: 'allo-tree-science-kicker' }, band === 'k2'
              ? __alloT('stem.treelab.scientist_path_k2', 'Think like a tree scientist')
              : __alloT('stem.treelab.scientist_path', 'Scientist\'s path')),
            h('h3', { key: 't', className: 'allo-tree-science-title' }, title)
          ]),
          h('ol', { key: 'steps', className: 'allo-tree-science-grid' }, items.map(function (item, i) {
            return h('li', { key: 's' + i, className: 'allo-tree-science-step', 'data-reasoning-step': ['observe', 'predict', 'explain'][i] }, [
              h('span', { key: 'n', className: 'allo-tree-science-index', 'aria-hidden': 'true' }, String(i + 1)),
              h('span', { key: 'l', className: 'allo-tree-science-label' }, labels[i]),
              h('strong', { key: 't' }, item.title),
              h('span', { key: 'c', className: 'allo-tree-science-copy' }, item.copy)
            ]);
          }))
        ]);
      }

      function missionPanel() {
        var changed = inDrought || d.alloc != null ||
          d.light != null || d.soilWater != null || d.tempC != null || d.co2ppm != null;
        var grown = tree.age > 1;
        var explained = experiment.phase === 'explain' ||
          !!(experimentTrials.A || experimentTrials.B);
        var steps = [
          [changed, band === 'k2' ? __alloT('stem.treelab.mission_change_k2', 'Change sunlight or water') : __alloT('stem.treelab.mission_change', 'Change one thing'),
            band === 'k2' ? __alloT('stem.treelab.mission_change_note_k2', 'Move one slider or try a short drought.') : __alloT('stem.treelab.mission_change_note', 'Shape the conditions or carbon split.')],
          [grown, band === 'k2' ? __alloT('stem.treelab.mission_grow_k2', 'Let 10 years pass') : __alloT('stem.treelab.mission_grow', 'Let time pass'),
            band === 'k2' ? __alloT('stem.treelab.mission_grow_note_k2', 'Watch what changes in the tree.') : __alloT('stem.treelab.mission_grow_note', 'Grow the tree and watch its budget respond.')],
          [explained, band === 'k2' ? __alloT('stem.treelab.mission_explain_k2', 'Tell what happened') : __alloT('stem.treelab.mission_explain', 'Explain the evidence'),
            band === 'k2' ? __alloT('stem.treelab.mission_explain_note_k2', 'Use a clue from what you saw.') : __alloT('stem.treelab.mission_explain_note', 'Predict, test, and tell the biological story.')]
        ];
        var nextStepIndex = -1;
        for (var mi = 0; mi < steps.length; mi++) {
          if (!steps[mi][0]) { nextStepIndex = mi; break; }
        }
        var nextStepId = ['change', 'grow', 'explain'][nextStepIndex] || 'complete';
        return h('div', { className: 'allo-tree-mission', 'data-mission-next': nextStepId }, card([
          h('div', {
            key: 'eyebrow',
            style: {
              position: 'relative', zIndex: 1, display: 'inline-flex', padding: '4px 8px',
              borderRadius: 999, background: T.card, border: '1px solid ' + T.border,
              color: (isDark || isContrast) ? T.accent : '#047857', fontSize: 9, fontWeight: 900, letterSpacing: '.09em',
              textTransform: 'uppercase'
            }
          }, __alloT('stem.treelab.mission_label', 'Your field mission')),
          h('div', { key: 'title', style: { position: 'relative', zIndex: 1, marginTop: 9 } },
            heading(__alloT('stem.treelab.mission_title', 'Grow a tree that can make the next generation'),
              band === 'k2' ? __alloT('stem.treelab.mission_sub_k2', 'Try one change. Grow 10 years. Then tell what helped or hurt your tree.') : __alloT('stem.treelab.mission_sub', 'Start small: change one thing, let time pass, then use the limiting factor and carbon budget to explain what happened.'))),
          h('div', { key: 'steps', className: 'allo-tree-mission-steps', style: { position: 'relative', zIndex: 1 } },
            steps.map(function (item, i) {
              var stepClass = 'allo-tree-mission-step' + (item[0] ? ' is-done' : (i === nextStepIndex ? ' is-next' : ''));
              return h('div', { key: i, className: stepClass, 'aria-current': i === nextStepIndex ? 'step' : undefined }, [
                h('span', { key: 'd', className: 'allo-tree-mission-dot', 'aria-hidden': 'true' },
                  item[0] ? '\u2713' : String(i + 1)),
                h('span', { key: 't' }, [
                  h('strong', { key: 'h', style: { display: 'block' } }, item[1]),
                  h('span', { key: 'p', style: { display: 'block', color: T.dim, marginTop: 2 } }, item[2])
                ])
              ]);
            })),
          h('div', { key: 'actions', style: { position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap' } }, [
            btn('mission-weather', inDrought
              ? '\uD83C\uDF27 ' + __alloT('stem.treelab.end_drought', 'Bring back the rain')
              : '\u2600 ' + __alloT('stem.treelab.mission_try_drought', 'Try a 3-year drought'),
              function () { if (inDrought) endDrought(); else sendDrought(3); },
              { small: true, pressed: inDrought, primary: nextStepIndex === 0, tone: nextStepIndex === 0 ? undefined : 'ghost', disabled: !tree.alive || experimentLocked }),
            btn('mission-grow', '\u2192 ' + __alloT('stem.treelab.mission_grow_10', 'Grow 10 years'),
              function () { stepYears(10); },
              { small: true, primary: nextStepIndex === 1, tone: nextStepIndex === 1 ? undefined : 'ghost', disabled: !tree.alive || experimentActive }),
            btn('mission-investigate', '\uD83D\uDD2C ' + (band === 'k2' ? __alloT('stem.treelab.begin_investigation_k2', 'Tell what happened') : __alloT('stem.treelab.begin_investigation', 'Start investigation')),
              function () {
                beginExperiment();
                setTimeout(function () {
                  var target = document.getElementById('treelab-investigation');
                  if (target && target.scrollIntoView) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                }, 0);
              },
              { small: true, primary: nextStepIndex === 2, tone: nextStepIndex === 2 ? undefined : 'ghost', disabled: experimentActive })
          ])
        ], { borderTop: '4px solid ' + T.accent }));
      }
      function advancedGateway() {
        var copy = advancedPinned
          ? __alloT('stem.treelab.advanced_active_copy',
            'Advanced tools stay open while an investigation is active.')
          : (advancedOpen
            ? __alloT('stem.treelab.advanced_open_copy',
              'The evidence workspace is open below. Hide it whenever you want a calmer Grow view.')
            : __alloT('stem.treelab.advanced_closed_copy',
              'Open the Investigation studio, survival diagnostics, A/B notebook, and ring evidence when you are ready.'));
        var buttonLabel = advancedPinned
          ? __alloT('stem.treelab.advanced_in_use', 'Advanced tools in use')
          : (advancedOpen
            ? __alloT('stem.treelab.advanced_hide', 'Hide advanced tools')
            : __alloT('stem.treelab.advanced_show', 'Go deeper'));
        return h('div', { className: 'allo-tree-advanced-gateway' }, card([
          h('div', { key: 'head', className: 'allo-tree-advanced-head' }, [
            h('span', { key: 'icon', className: 'allo-tree-advanced-icon', 'aria-hidden': 'true' }, '\uD83D\uDD2C'),
            h('div', { key: 'copy' }, [
              h('div', { key: 'title', className: 'allo-tree-advanced-title' },
                __alloT('stem.treelab.advanced_title', 'Ready to go deeper?')),
              h('div', { key: 'body', className: 'allo-tree-advanced-copy' }, copy),
              h('div', { key: 'pills', className: 'allo-tree-advanced-pills', 'aria-hidden': 'true' }, [
                __alloT('stem.treelab.advanced_survival', 'Survival'),
                __alloT('stem.treelab.investigation_title', 'Investigation studio'),
                __alloT('stem.treelab.advanced_notebook', 'A/B notebook'),
                __alloT('stem.treelab.advanced_rings', 'Ring evidence')
              ].map(function (label, i) {
                return h('span', { key: i, className: 'allo-tree-advanced-pill' }, label);
              }))
            ]),
            btn('advanced-toggle', buttonLabel, function () {
              if (advancedPinned) return;
              var next = !advancedOpen;
              upd('growAdvancedOpen', next);
              if (next) {
                setTimeout(function () {
                  var target = document.getElementById('treelab-advanced-work');
                  if (target && target.scrollIntoView) {
                    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                  }
                }, 0);
              }
            }, {
              small: true, tone: 'ghost', disabled: advancedPinned,
              expanded: advancedOpen, controls: 'treelab-advanced-work'
            })
          ])
        ], { borderLeft: '4px solid ' + T.accent }));
      }

      function treeLifeStage() {
        if (!tree.alive) {
          return {
            id: 'ended',
            value: band === 'k2'
              ? __alloT('stem.treelab.clock_stage_ended_k2', 'This stem has died')
              : __alloT('stem.treelab.clock_stage_ended', 'Stem ended'),
            copy: __alloT('stem.treelab.clock_stage_ended_copy', 'Its rings and stored wood still record the life it lived.')
          };
        }
        var matureHeight = Math.max(0.5, (sp.maxHeight || 30) * 0.6);
        var fraction = tree.heightM / matureHeight;
        if (tree.age <= 2 || tree.heightM < 1) {
          return {
            id: 'seedling',
            value: band === 'k2'
              ? __alloT('stem.treelab.clock_stage_seedling_k2', 'Baby tree')
              : __alloT('stem.treelab.clock_stage_seedling', 'Seedling'),
            copy: __alloT('stem.treelab.clock_stage_seedling_copy', 'A small leaf area must earn enough carbon to establish roots and stem.')
          };
        }
        if (fraction < 0.35) {
          return {
            id: 'sapling',
            value: band === 'k2'
              ? __alloT('stem.treelab.clock_stage_sapling_k2', 'Young tree')
              : __alloT('stem.treelab.clock_stage_sapling', 'Sapling'),
            copy: __alloT('stem.treelab.clock_stage_sapling_copy', 'The crown is expanding while each year adds another ring.')
          };
        }
        if (fraction < 1) {
          return {
            id: 'growing',
            value: __alloT('stem.treelab.clock_stage_growing', 'Growing tree'),
            copy: __alloT('stem.treelab.clock_stage_growing_copy', 'Repeated carbon surpluses are becoming height, roots, wood, and reserves.')
          };
        }
        if (tree.age >= (sp.maxAgeYears || 100) * 0.65) {
          return {
            id: 'veteran',
            value: band === 'k2'
              ? __alloT('stem.treelab.clock_stage_veteran_k2', 'Very old tree')
              : __alloT('stem.treelab.clock_stage_veteran', 'Veteran tree'),
            copy: __alloT('stem.treelab.clock_stage_veteran_copy', 'Growth is slower, but the long record of rings and stored carbon continues.')
          };
        }
        return {
          id: 'mature',
          value: band === 'k2'
            ? __alloT('stem.treelab.clock_stage_mature_k2', 'Full-grown tree')
            : __alloT('stem.treelab.clock_stage_mature', 'Mature tree'),
          copy: __alloT('stem.treelab.clock_stage_mature_copy', 'The tree has reached the model\'s mature height and can invest more in the next generation.')
        };
      }

      function timeScaleRibbon() {
        var lim = live.limiting || {};
        var limId = lim.viaStomata ? 'water' : (lim.id || 'light');
        var limName = {
          light: __alloT('stem.treelab.light', 'Light'),
          co2: CO2,
          water: __alloT('stem.treelab.water', 'Water'),
          temperature: __alloT('stem.treelab.temperature', 'Temperature')
        }[limId] || __alloT('stem.treelab.current_conditions', 'Current conditions');
        var exchangeState = !tree.alive
          ? __alloT('stem.treelab.clock_exchange_stopped', 'No active exchange')
          : (aperture < 0.2
            ? __alloT('stem.treelab.clock_exchange_closed', 'Mostly closed')
            : (aperture < 0.7
              ? __alloT('stem.treelab.clock_exchange_partial', 'Partly open')
              : __alloT('stem.treelab.clock_exchange_open', 'Open')));
        var exchangeCopy = !tree.alive
          ? __alloT('stem.treelab.clock_exchange_stopped_copy', 'Gas exchange has ended in this stem.')
          : ((lim.viaStomata || aperture < 0.4)
            ? __alloT('stem.treelab.clock_exchange_water_copy', 'Water stress is restricting carbon dioxide entry.')
            : __alloT('stem.treelab.clock_exchange_limit_copy', 'The smallest current input is ') + limName + '.');
        var annualValue = !tree.alive
          ? __alloT('stem.treelab.clock_budget_stopped', 'No carbon income')
          : (liveNet >= 0
            ? '+' + round(liveNet, 2) + ' kg C ' + __alloT('stem.treelab.clock_surplus', 'surplus')
            : round(Math.abs(liveNet), 2) + ' kg C ' + __alloT('stem.treelab.clock_deficit', 'deficit'));
        var annualCopy = !tree.alive
          ? __alloT('stem.treelab.clock_budget_stopped_copy', 'The annual carbon budget stops when the living tree does.')
          : __alloT('stem.treelab.clock_budget_copy', 'Current settings projected across one whole model year.');
        var stage = treeLifeStage();
        var lifeCopy = stage.copy + ' ' + tree.age + ' ' + __alloT('stem.treelab.years', 'years')
          + ' \u00B7 ' + round(tree.heightM, 1) + ' ' + __alloT('stem.treelab.metres_tall_short', 'm tall')
          + ' \u00B7 ' + tree.rings.length + ' ' + __alloT('stem.treelab.rings', 'rings');

        function clock(key, icon, horizon, title, value, copy, color, state) {
          return h('li', {
            key: key,
            className: 'allo-tree-clock',
            'data-tree-clock': key,
            'data-clock-state': state,
            style: { '--clock-tone': tone(color) }
          }, [
            h('span', { key: 'i', className: 'allo-tree-clock-icon', 'aria-hidden': 'true' }, icon),
            h('span', { key: 'h', className: 'allo-tree-clock-horizon' }, horizon),
            h('span', { key: 't', className: 'allo-tree-clock-title' }, title),
            h('strong', { key: 'v', className: 'allo-tree-clock-value' }, value),
            h('span', { key: 'c', className: 'allo-tree-clock-copy' }, copy)
          ]);
        }

        return h('section', {
          className: 'allo-tree-timescales',
          'data-tree-timescales': 'now-year-life',
          'aria-labelledby': 'treelab-timescales-title'
        }, [
          h('div', { key: 'head', className: 'allo-tree-timescales-head' }, [
            h('span', { key: 'i', className: 'allo-tree-timescales-mark', 'aria-hidden': 'true' }, '\u23F3'),
            h('h3', { key: 't', id: 'treelab-timescales-title' },
              band === 'k2'
                ? __alloT('stem.treelab.clocks_title_k2', 'A tree works on three clocks')
                : __alloT('stem.treelab.clocks_title', 'One tree, three biological clocks')),
            h('p', { key: 'p' },
              band === 'k2'
                ? __alloT('stem.treelab.clocks_sub_k2', 'Look at what happens now, over one year, and across the tree\'s whole life.')
                : __alloT('stem.treelab.clocks_sub', 'Leaf responses happen quickly; carbon is balanced across a year; wood and rings accumulate across a lifetime.'))
          ]),
          h('ol', { key: 'grid', className: 'allo-tree-clock-grid' }, [
            clock('now', '\uD83C\uDF43',
              band === 'k2' ? __alloT('stem.treelab.clock_now_k2', 'Right now') : __alloT('stem.treelab.clock_now', 'Minutes to hours'),
              band === 'k2' ? __alloT('stem.treelab.clock_leaf_title_k2', 'Tiny leaf doors') : __alloT('stem.treelab.clock_leaf_title', 'Leaf gas exchange'),
              exchangeState, exchangeCopy, aperture < 0.4 ? T.warn : T.accent,
              tree.alive ? (aperture < 0.2 ? 'closed' : (aperture < 0.7 ? 'partial' : 'open')) : 'stopped'),
            clock('year', '\u2600\uFE0F',
              __alloT('stem.treelab.clock_year', 'One whole year'),
              band === 'k2' ? __alloT('stem.treelab.clock_budget_title_k2', 'Food left after living') : __alloT('stem.treelab.clock_budget_title', 'Carbon balance'),
              annualValue, annualCopy, !tree.alive || liveNet < 0 ? T.bad : T.good,
              !tree.alive ? 'stopped' : (liveNet < 0 ? 'deficit' : 'surplus')),
            clock('lifetime', '\uD83E\uDEB5',
              __alloT('stem.treelab.clock_lifetime', 'Across a lifetime'),
              band === 'k2' ? __alloT('stem.treelab.clock_life_title_k2', 'The tree\'s life story') : __alloT('stem.treelab.clock_life_title', 'Structure and history'),
              stage.value, lifeCopy, T.accent, stage.id)
          ]),
          h('div', { key: 'story', className: 'allo-tree-timescales-story' }, [
            h('span', { key: 'i', 'aria-hidden': 'true' }, '\u2192'),
            h('span', { key: 'c' }, [
              h('strong', { key: 'l' }, band === 'k2'
                ? __alloT('stem.treelab.clocks_story_label_k2', 'Read the tree\'s story: ')
                : __alloT('stem.treelab.clocks_story_label', 'Read the causal chain: ')),
              h('span', { key: 'v' }, band === 'k2'
                ? __alloT('stem.treelab.clocks_story_k2', 'leaf doors change food making; many years of food choices build the tree you see.')
                : __alloT('stem.treelab.clocks_story', 'leaf responses shape the yearly carbon budget; repeated years become rings, height, roots, and stored carbon.')),
              h('span', { key: 'b', className: 'allo-tree-timescales-boundary' },
                __alloT('stem.treelab.clocks_boundary', 'Model boundary: current-condition snapshot \u2192 whole-year projection \u2192 stored lifetime history.'))
            ])
          ])
        ]);
      }

      function treeMemoryPanel() {
        var validHistory = Array.isArray(tree.history) ? tree.history.filter(function (rec) {
          return rec && typeof rec === 'object'
            && typeof rec.year === 'number' && isFinite(rec.year)
            && typeof rec.net === 'number' && isFinite(rec.net)
            && typeof rec.ring === 'number' && isFinite(rec.ring)
            && typeof rec.limiting === 'string';
        }) : [];
        var shown = validHistory.slice(-(band === 'k2' ? 8 : 12));

        function memoryHead(count) {
          return h('div', { key: 'head', className: 'allo-tree-memory-head' }, [
            h('span', { key: 'mark', className: 'allo-tree-memory-mark', 'aria-hidden': 'true' }, '\uD83E\uDEB5'),
            h('h3', { key: 'title', className: 'allo-tree-memory-title', id: 'treelab-memory-title' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_title_k2', 'The tree remembers every year')
                : __alloT('stem.treelab.memory_title', 'Tree Memory: a yearbook written in wood')),
            h('p', { key: 'copy', className: 'allo-tree-memory-copy' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_copy_k2', 'Each year leaves a ring. Choose one to discover what helped or challenged the tree.')
                : __alloT('stem.treelab.memory_copy', 'Each annual carbon budget leaves evidence. Choose a recent ring to connect conditions, carbon, and growth.')),
            count ? h('span', { key: 'count', className: 'allo-tree-memory-count' },
              __alloT('stem.treelab.memory_showing', 'Showing last ') + shown.length
                + __alloT('stem.treelab.memory_of', ' of ') + validHistory.length
                + __alloT('stem.treelab.memory_years', ' years')) : null
          ]);
        }

        if (!shown.length) {
          return card([
            memoryHead(false),
            h('div', { key: 'empty', className: 'allo-tree-memory-empty', 'data-tree-memory': 'empty' }, [
              h('span', { key: 'icon', className: 'allo-tree-memory-empty-icon', 'aria-hidden': 'true' }, '\uD83C\uDF31'),
              h('span', { key: 'copy', className: 'allo-tree-memory-empty-copy' }, [
                h('strong', { key: 'title' },
                  band === 'k2'
                    ? __alloT('stem.treelab.memory_empty_title_k2', 'The first ring is waiting')
                    : __alloT('stem.treelab.memory_empty_title', 'A lifetime record begins with one year')),
                h('span', { key: 'text' },
                  band === 'k2'
                    ? __alloT('stem.treelab.memory_empty_copy_k2', 'Grow one year to help the seedling write its first wooden memory.')
                    : __alloT('stem.treelab.memory_empty_copy', 'Advance one year to turn today\'s conditions and carbon budget into the first ring.'))
              ]),
              btn('memory-first-year', __alloT('stem.treelab.memory_grow_first', 'Grow first year'), function () {
                stepYears(1);
              }, { small: true, disabled: !tree.alive || experimentActive })
            ])
          ], undefined, 'allo-tree-memory');
        }

        var requestedYear = typeof d.historyFocusYear === 'number' && isFinite(d.historyFocusYear)
          ? d.historyFocusYear : null;
        var selectedIndex = -1;
        shown.forEach(function (rec, i) {
          if (rec.year === requestedYear) selectedIndex = i;
        });
        if (selectedIndex < 0) selectedIndex = shown.length - 1;
        var selected = shown[selectedIndex];
        var widest = shown.reduce(function (max, rec) {
          return Math.max(max, Math.max(0, rec.ring));
        }, 0.1);
        var selectedStress = selected.net < 0;
        function memoryLimitId(rec) {
          return rec.limiting === 'co2'
            && typeof rec.aperture === 'number' && rec.aperture < 0.6
            ? 'water' : rec.limiting;
        }
        var selectedLimitId = memoryLimitId(selected);
        var selectedTone = tone(FACTOR_HUE(selectedLimitId));
        var limiterLabels = {
          light: __alloT('stem.treelab.light', 'Light'),
          co2: CO2,
          water: __alloT('stem.treelab.water', 'Water'),
          temperature: __alloT('stem.treelab.temperature', 'Temperature')
        };
        var selectedLimiter = limiterLabels[selectedLimitId]
          || __alloT('stem.treelab.memory_unknown_limit', 'Unknown factor');
        var selectedFullIndex = validHistory.indexOf(selected);
        var previous = selectedFullIndex > 0 ? validHistory[selectedFullIndex - 1] : null;
        var previousLimitId = previous ? memoryLimitId(previous) : null;
        var netDelta = previous ? selected.net - previous.net : 0;
        var ringDelta = previous ? selected.ring - previous.ring : 0;
        var ringThreshold = previous ? Math.max(0.05, Math.abs(previous.ring) * 0.08) : 0;
        var trendId = 'baseline';
        if (previous) {
          if (previous.net < 0 && selected.net >= 0) trendId = 'recovery';
          else if (previous.net >= 0 && selected.net < 0) trendId = 'setback';
          else if (ringDelta > ringThreshold) trendId = 'wider';
          else if (ringDelta < -ringThreshold) trendId = 'narrower';
          else trendId = 'steady';
        }
        var trendTone = {
          baseline: T.accent, recovery: T.good, setback: T.bad,
          wider: T.good, narrower: T.warn, steady: T.accent
        }[trendId] || T.accent;
        var trendArrow = {
          baseline: '\u25CF', recovery: '\u2191', setback: '\u2193',
          wider: '\u2197', narrower: '\u2198', steady: '\u2192'
        }[trendId];

        function causeText(rec) {
          var limitId = memoryLimitId(rec);
          if (limitId === 'water' && typeof rec.aperture === 'number' && rec.aperture < 0.6) {
            return band === 'k2'
              ? __alloT('stem.treelab.memory_cause_water_k2', 'Dry soil made the tiny leaf doors close, so less carbon dioxide could enter.')
              : __alloT('stem.treelab.memory_cause_water', 'Water stress closed the stomata, reducing carbon dioxide entry and photosynthesis.');
          }
          if (limitId === 'water') {
            return __alloT('stem.treelab.memory_cause_water_supply', 'Water was the smallest input controlling the photosynthetic rate.');
          }
          if (limitId === 'light') {
            return band === 'k2'
              ? __alloT('stem.treelab.memory_cause_light_k2', 'Light was the ingredient in shortest supply, so it set the pace.')
              : __alloT('stem.treelab.memory_cause_light', 'Light was the smallest input, so extra carbon dioxide, water, or warmth could not raise the rate.');
          }
          if (limitId === 'temperature') {
            return band === 'k2'
              ? __alloT('stem.treelab.memory_cause_temp_k2', 'The temperature kept the leaf machinery from working at its best.')
              : __alloT('stem.treelab.memory_cause_temp', 'Temperature held the photosynthetic machinery furthest from its working range.');
          }
          if (limitId === 'co2') {
            return band === 'k2'
              ? __alloT('stem.treelab.memory_cause_co2_k2', 'Carbon dioxide was the ingredient in shortest supply at the leaf doors.')
              : __alloT('stem.treelab.memory_cause_co2', 'Carbon dioxide supply was the smallest input at the stomata, so it set the photosynthetic ceiling.');
          }
          return __alloT('stem.treelab.memory_cause_unknown', 'The smallest model input set the photosynthetic rate for this year.');
        }

        var resultText = selectedStress
          ? (band === 'k2'
            ? __alloT('stem.treelab.memory_result_stress_k2', 'The tree used more carbon than it made, borrowed from its stored food, and marked a hard year.')
            : __alloT('stem.treelab.memory_result_stress', 'The tree spent more carbon than it made, drew on reserves, and recorded a stress year.'))
          : (selected.ring >= widest * 0.7 && selected.ring > 0
            ? (band === 'k2'
              ? __alloT('stem.treelab.memory_result_wide_k2', 'Plenty of carbon reached the wood, making one of the wider rings shown.')
              : __alloT('stem.treelab.memory_result_wide', 'Carbon allocated to wood produced one of the wider rings in the years shown.'))
            : (band === 'k2'
              ? __alloT('stem.treelab.memory_result_narrow_k2', 'Less carbon reached the wood, making a narrower ring.')
              : __alloT('stem.treelab.memory_result_narrow', 'Carbon allocated to wood produced a narrower ring; age and allocation also shape ring width.')));

        function memoryKeyItem(key, swatchClass, title, copy) {
          return h('li', { key: key, className: 'allo-tree-memory-key-item' }, [
            h('span', {
              key: 'swatch',
              className: 'allo-tree-memory-key-swatch ' + swatchClass,
              'aria-hidden': 'true'
            }),
            h('span', { key: 'copy' }, [
              h('strong', { key: 'title' }, title),
              h('span', { key: 'text' }, copy)
            ])
          ]);
        }

        var memoryKey = h('ul', {
          key: 'key',
          className: 'allo-tree-memory-key',
          'data-memory-key': 'height-color-outline',
          'aria-label': __alloT('stem.treelab.memory_key_label', 'How to read the ring yearbook'),
          style: {
            '--memory-stress-key': tone(T.bad),
            '--memory-light': tone(FACTOR_HUE('light')),
            '--memory-water': tone(FACTOR_HUE('water')),
            '--memory-co2': tone(FACTOR_HUE('co2')),
            '--memory-temperature': tone(FACTOR_HUE('temperature'))
          }
        }, [
          memoryKeyItem('height', 'is-height',
            band === 'k2'
              ? __alloT('stem.treelab.memory_key_height_k2', 'Taller means more wood')
              : __alloT('stem.treelab.memory_key_height', 'Height shows wood growth'),
            band === 'k2'
              ? __alloT('stem.treelab.memory_key_height_copy_k2', 'A taller mark means a wider ring.')
              : __alloT('stem.treelab.memory_key_height_copy', 'Taller marks represent wider modelled rings.')),
          memoryKeyItem('limit', 'is-limit',
            band === 'k2'
              ? __alloT('stem.treelab.memory_key_color_k2', 'Color shows what ran short')
              : __alloT('stem.treelab.memory_key_color', 'Top color shows the limiter'),
            band === 'k2'
              ? __alloT('stem.treelab.memory_key_color_copy_k2', 'The color names the ingredient setting the pace.')
              : __alloT('stem.treelab.memory_key_color_copy', 'It uses the same factor colors as the Chemistry view.')),
          memoryKeyItem('deficit', 'is-deficit',
            band === 'k2'
              ? __alloT('stem.treelab.memory_key_dash_k2', 'Dashes mark a hard year')
              : __alloT('stem.treelab.memory_key_dash', 'Dashed means carbon deficit'),
            band === 'k2'
              ? __alloT('stem.treelab.memory_key_dash_copy_k2', 'The tree used more stored food than it made.')
              : __alloT('stem.treelab.memory_key_dash_copy', 'Maintenance exceeded carbon income, so reserves were used.'))
        ]);

        var timeline = h('ol', {
          key: 'timeline',
          className: 'allo-tree-memory-timeline',
          'data-tree-memory': 'yearbook',
          'aria-label': __alloT('stem.treelab.memory_timeline_label', 'Recent annual growth rings')
        }, shown.map(function (rec, i) {
          var isSelected = i === selectedIndex;
          var isStress = rec.net < 0;
          var limitTone = tone(FACTOR_HUE(memoryLimitId(rec)));
          var ringHeight = 12 + Math.round((Math.max(0, rec.ring) / widest) * 38);
          var yearLabel = __alloT('stem.treelab.year', 'Year') + ' ' + rec.year;
          var stateLabel = isStress
            ? __alloT('stem.treelab.memory_deficit', 'deficit')
            : __alloT('stem.treelab.memory_surplus', 'surplus');
          return h('li', { key: 'year-' + rec.year, className: 'allo-tree-memory-item' },
            h('button', {
              type: 'button',
              className: 'allo-tree-memory-year' + (isSelected ? ' is-selected' : '') + (isStress ? ' is-stress' : ''),
              'data-memory-year': rec.year,
              'data-memory-stress': isStress ? 'true' : 'false',
              'aria-pressed': isSelected,
              'aria-label': yearLabel + ', ' + stateLabel + ', '
                + (limiterLabels[memoryLimitId(rec)] || __alloT('stem.treelab.memory_unknown_limit', 'Unknown factor'))
                + ' ' + __alloT('stem.treelab.memory_limited', 'limited'),
              style: {
                '--memory-limit': limitTone,
                '--memory-stress': tone(T.bad)
              },
              onClick: function () {
                upd('historyFocusYear', rec.year);
                srSay(__alloT('stem.treelab.memory_selected', 'Selected ') + yearLabel + '.');
              }
            }, [
              h('span', {
                key: 'ring',
                className: 'allo-tree-memory-ring',
                'aria-hidden': 'true',
                style: { height: ringHeight + 'px' }
              }),
              h('span', { key: 'year', className: 'allo-tree-memory-year-label' }, yearLabel),
              h('span', { key: 'state', className: 'allo-tree-memory-year-state' }, stateLabel)
            ]));
        }));

        function fact(key, label, value) {
          return h('div', { key: key, className: 'allo-tree-memory-fact' }, [
            h('dt', { key: 'term' }, label),
            h('dd', { key: 'value' }, value)
          ]);
        }

        var trendTitle = {
          baseline: band === 'k2'
            ? __alloT('stem.treelab.memory_trend_baseline_k2', 'The story starts here')
            : __alloT('stem.treelab.memory_trend_baseline', 'First recorded year'),
          recovery: band === 'k2'
            ? __alloT('stem.treelab.memory_trend_recovery_k2', 'The tree bounced back')
            : __alloT('stem.treelab.memory_trend_recovery', 'Recovery after stress'),
          setback: band === 'k2'
            ? __alloT('stem.treelab.memory_trend_setback_k2', 'A harder year arrived')
            : __alloT('stem.treelab.memory_trend_setback', 'A new stress signal'),
          wider: band === 'k2'
            ? __alloT('stem.treelab.memory_trend_wider_k2', 'More wood than last year')
            : __alloT('stem.treelab.memory_trend_wider', 'A wider ring'),
          narrower: band === 'k2'
            ? __alloT('stem.treelab.memory_trend_narrower_k2', 'Less wood than last year')
            : __alloT('stem.treelab.memory_trend_narrower', 'A narrower ring'),
          steady: band === 'k2'
            ? __alloT('stem.treelab.memory_trend_steady_k2', 'A similar year')
            : __alloT('stem.treelab.memory_trend_steady', 'A similar ring')
        }[trendId];

        var trendCopy = trendId === 'baseline'
          ? (band === 'k2'
            ? __alloT('stem.treelab.memory_compare_baseline_k2', 'There is no earlier ring yet. This year becomes the first comparison point.')
            : __alloT('stem.treelab.memory_compare_baseline', 'There is no earlier valid record. This year establishes the baseline for later comparisons.'))
          : (trendId === 'recovery'
            ? (band === 'k2'
              ? __alloT('stem.treelab.memory_compare_recovery_k2', 'The food balance climbed back above zero after a hard year.')
              : __alloT('stem.treelab.memory_compare_recovery', 'Net carbon returned to surplus after the previous year ended in deficit.'))
            : (trendId === 'setback'
              ? (band === 'k2'
                ? __alloT('stem.treelab.memory_compare_setback_k2', 'The food balance fell below zero after a better year.')
                : __alloT('stem.treelab.memory_compare_setback', 'Net carbon crossed from surplus into deficit, signalling a new stress year.'))
              : (trendId === 'wider'
                ? __alloT('stem.treelab.memory_compare_wider', 'The model allocated enough carbon to wood to make a wider ring than the year before.')
                : (trendId === 'narrower'
                  ? __alloT('stem.treelab.memory_compare_narrower', 'The model produced a narrower ring than the year before.')
                  : __alloT('stem.treelab.memory_compare_steady', 'Ring width stayed close to the previous year.')))));

        var limiterComparison = '';
        if (previous) {
          var previousLimiter = limiterLabels[previousLimitId]
            || __alloT('stem.treelab.memory_unknown_limit', 'Unknown factor');
          limiterComparison = previousLimitId === selectedLimitId
            ? selectedLimiter + ' ' + __alloT('stem.treelab.memory_compare_same_limit', 'remained the limiting factor.')
            : __alloT('stem.treelab.memory_compare_limit_changed', 'The limiting factor changed from ')
                + previousLimiter + __alloT('stem.treelab.memory_compare_limit_to', ' to ') + selectedLimiter + '.';
        }

        function signedChange(value, unit) {
          if (!previous) return '\u2014';
          return (value > 0 ? '+' : '') + round(value, 2) + ' ' + unit;
        }

        var apertureKnown = typeof selected.aperture === 'number' && isFinite(selected.aperture);
        var apertureState = !apertureKnown
          ? 'unknown' : (selected.aperture < 0.2 ? 'closed' : (selected.aperture < 0.7 ? 'partial' : 'open'));
        var apertureValue = apertureState === 'closed'
          ? __alloT('stem.treelab.memory_causal_closed', 'Mostly closed')
          : (apertureState === 'partial'
            ? __alloT('stem.treelab.memory_causal_partial', 'Partly open')
            : (apertureState === 'open'
              ? __alloT('stem.treelab.memory_causal_open', 'Open')
              : __alloT('stem.treelab.memory_causal_unknown', 'Not recorded')));
        var apertureCopy = apertureState === 'unknown'
          ? __alloT('stem.treelab.memory_causal_aperture_missing', 'This older record did not store a stomatal opening value.')
          : (selectedLimitId === 'water' && selected.aperture < 0.6
            ? __alloT('stem.treelab.memory_causal_aperture_water', 'Water stress restricted carbon dioxide entry.')
            : __alloT('stem.treelab.memory_causal_aperture_active', 'Leaf gas exchange responded to the limiting input.'));
        var conditionIcon = {
          light: '\u2600\uFE0F', water: '\uD83D\uDCA7',
          temperature: '\uD83C\uDF21\uFE0F', co2: '\uD83C\uDF2C\uFE0F'
        }[selectedLimitId] || '\uD83C\uDF24\uFE0F';

        function causalStep(key, icon, label, value, copy, color, state) {
          return h('li', {
            key: key,
            className: 'allo-tree-memory-causal-step',
            'data-memory-causal-step': key,
            'data-causal-state': state,
            style: { '--causal-tone': tone(color) }
          }, [
            h('span', { key: 'icon', className: 'allo-tree-memory-causal-icon', 'aria-hidden': 'true' }, icon),
            h('span', { key: 'label', className: 'allo-tree-memory-causal-label' }, label),
            h('strong', { key: 'value', className: 'allo-tree-memory-causal-value' }, value),
            h('span', { key: 'copy', className: 'allo-tree-memory-causal-copy' }, copy)
          ]);
        }

        var causalTrail = h('ol', {
          key: 'causal',
          className: 'allo-tree-memory-causal',
          'data-memory-causal': 'condition-leaf-carbon-wood',
          'aria-label': __alloT('stem.treelab.memory_causal_label', 'Causal trail from annual conditions to the growth ring')
        }, [
          causalStep('condition', conditionIcon,
            band === 'k2'
              ? __alloT('stem.treelab.memory_causal_condition_k2', 'What set the pace')
              : __alloT('stem.treelab.memory_causal_condition', 'Limiting condition'),
            selectedLimiter,
            selectedLimitId === 'water' && apertureKnown && selected.aperture < 0.6
              ? __alloT('stem.treelab.memory_causal_condition_water', 'Dryness triggered the leaf response.')
              : __alloT('stem.treelab.memory_causal_condition_copy', 'The smallest model input set the rate.'),
            FACTOR_HUE(selectedLimitId), selectedLimitId),
          causalStep('leaf', '\uD83C\uDF43',
            band === 'k2'
              ? __alloT('stem.treelab.memory_causal_leaf_k2', 'Tiny leaf doors')
              : __alloT('stem.treelab.memory_causal_leaf', 'Leaf response'),
            apertureValue, apertureCopy,
            apertureState === 'closed' ? T.warn : (apertureState === 'unknown' ? T.dim : T.good),
            apertureState),
          causalStep('carbon', '\u2696\uFE0F',
            band === 'k2'
              ? __alloT('stem.treelab.memory_causal_carbon_k2', 'Food balance')
              : __alloT('stem.treelab.memory_causal_carbon', 'Carbon balance'),
            (selected.net >= 0 ? '+' + round(selected.net, 2) : round(Math.abs(selected.net), 2))
              + ' kg C ' + (selectedStress
                ? __alloT('stem.treelab.memory_deficit', 'deficit')
                : __alloT('stem.treelab.memory_surplus', 'surplus')),
            band === 'k2'
              ? __alloT('stem.treelab.memory_causal_carbon_copy_k2', 'Carbon made minus carbon used to stay alive.')
              : __alloT('stem.treelab.memory_causal_carbon_copy', 'Photosynthetic income minus maintenance respiration.'),
            selectedStress ? T.bad : T.good, selectedStress ? 'deficit' : 'surplus'),
          causalStep('wood', '\uD83E\uDEB5',
            band === 'k2'
              ? __alloT('stem.treelab.memory_causal_wood_k2', 'Wooden memory')
              : __alloT('stem.treelab.memory_causal_wood', 'Growth-ring record'),
            round(Math.max(0, selected.ring), 2) + ' mm',
            selectedStress
              ? __alloT('stem.treelab.memory_causal_wood_stress', 'A deficit marked a stress year with little carbon available for wood.')
              : __alloT('stem.treelab.memory_causal_wood_growth', 'A share of the surplus was allocated to stem wood.'),
            selectedStress ? T.bad : T.accent, selectedStress ? 'stress' : 'growth')
        ]);

        var hasFieldSnapshot = typeof selected.tempC === 'number' && isFinite(selected.tempC)
          && typeof selected.light === 'number' && isFinite(selected.light)
          && typeof selected.co2ppm === 'number' && isFinite(selected.co2ppm)
          && typeof selected.soilWater === 'number' && isFinite(selected.soilWater);
        var hasPreviousFieldSnapshot = !!previous
          && typeof previous.tempC === 'number' && isFinite(previous.tempC)
          && typeof previous.light === 'number' && isFinite(previous.light)
          && typeof previous.co2ppm === 'number' && isFinite(previous.co2ppm)
          && typeof previous.soilWater === 'number' && isFinite(previous.soilWater);
        var fieldDeltas = hasFieldSnapshot && hasPreviousFieldSnapshot ? [
          {
            key: 'temperature',
            label: __alloT('stem.treelab.memory_field_temperature', 'Temperature'),
            value: selected.tempC - previous.tempC,
            scale: 15,
            unit: '\u00B0C',
            digits: 1,
            color: FACTOR_HUE('temperature')
          },
          {
            key: 'light',
            label: band === 'k2'
              ? __alloT('stem.treelab.memory_field_light_k2', 'Sunlight')
              : __alloT('stem.treelab.memory_field_light', 'Relative light'),
            value: (selected.light - previous.light) * 100,
            scale: 50,
            unit: __alloT('stem.treelab.memory_field_points', ' points'),
            digits: 0,
            color: FACTOR_HUE('light')
          },
          {
            key: 'water',
            label: __alloT('stem.treelab.memory_field_water', 'Soil water'),
            value: (selected.soilWater - previous.soilWater) * 100,
            scale: 50,
            unit: __alloT('stem.treelab.memory_field_points', ' points'),
            digits: 0,
            color: FACTOR_HUE('water')
          },
          {
            key: 'co2',
            label: band === 'k2'
              ? __alloT('stem.treelab.memory_field_co2_k2', 'Carbon dioxide in air')
              : __alloT('stem.treelab.memory_field_co2', 'Atmospheric carbon dioxide'),
            value: selected.co2ppm - previous.co2ppm,
            scale: 300,
            unit: ' ppm',
            digits: 0,
            color: FACTOR_HUE('co2')
          }
        ] : [];
        var largestFieldDelta = null;
        var largestFieldScore = 0;
        fieldDeltas.forEach(function (item) {
          var score = Math.abs(item.value) / item.scale;
          if (score > largestFieldScore) {
            largestFieldScore = score;
            largestFieldDelta = item;
          }
        });
        if (largestFieldScore < 0.01) largestFieldDelta = null;

        function fieldNote(key, label, value, state, level, color) {
          var pct = clamp(level, 0, 1) * 100;
          return h('div', {
            key: key,
            className: 'allo-tree-memory-field-note',
            'data-memory-field-note': key,
            'data-field-state': state,
            style: {
              '--field-tone': tone(color),
              '--field-level': Math.round(pct) + '%'
            }
          }, [
            h('span', { key: 'label' }, label),
            h('strong', { key: 'value' }, value),
            h('em', { key: 'state' }, state),
            h('div', {
              key: 'meter',
              className: 'allo-tree-memory-field-meter',
              role: 'img',
              'aria-label': label + ': ' + Math.round(pct)
                + __alloT('stem.treelab.memory_field_relative', ' percent of the displayed model range')
            }, h('span', { 'aria-hidden': 'true' }))
          ]);
        }

        var fieldTeaser = hasFieldSnapshot
          ? round(selected.tempC, 1) + '\u00B0C \u00B7 '
              + Math.round(selected.light * 100) + '% ' + __alloT('stem.treelab.memory_field_light_short', 'light')
              + ' \u00B7 ' + Math.round(selected.soilWater * 100) + '% '
              + __alloT('stem.treelab.memory_field_water_short', 'soil water')
              + ' \u00B7 ' + Math.round(selected.co2ppm) + ' ppm ' + CO2
          : __alloT('stem.treelab.memory_field_legacy_teaser', 'Older ring: annual input snapshot was not stored.');

        function signedFieldDelta(item) {
          var value = Math.abs(item.value) < 0.005 ? 0 : item.value;
          return (value > 0 ? '+' : '') + round(value, item.digits) + item.unit;
        }

        var fieldCompare = fieldDeltas.length ? h('section', {
          key: 'compare',
          className: 'allo-tree-memory-field-compare',
          'data-memory-field-compare': previous.year + '-to-' + selected.year,
          'data-largest-input-shift': largestFieldDelta ? largestFieldDelta.key : 'steady',
          'aria-label': __alloT('stem.treelab.memory_field_compare_label', 'Annual input changes from the previous year')
        }, [
          h('div', { key: 'head', className: 'allo-tree-memory-field-compare-head' }, [
            h('strong', { key: 'title' },
              largestFieldDelta
                ? __alloT('stem.treelab.memory_field_largest_shift', 'Largest input shift: ')
                    + largestFieldDelta.label + ' ' + signedFieldDelta(largestFieldDelta)
                : __alloT('stem.treelab.memory_field_steady', 'The stored annual inputs held steady')),
            h('span', { key: 'years' },
              __alloT('stem.treelab.memory_compared_with', 'Compared with Year ') + previous.year)
          ]),
          h('div', { key: 'deltas', className: 'allo-tree-memory-field-deltas' },
            fieldDeltas.map(function (item) {
              var isLargest = largestFieldDelta && item.key === largestFieldDelta.key;
              var deltaState = item.value > 0.005
                ? 'increased' : (item.value < -0.005 ? 'decreased' : 'steady');
              return h('div', {
                key: item.key,
                className: 'allo-tree-memory-field-delta' + (isLargest ? ' is-largest' : ''),
                'data-memory-condition-delta': item.key,
                'data-delta-state': deltaState,
                style: { '--delta-tone': tone(item.color) }
              }, [
                h('span', { key: 'label' }, item.label),
                h('strong', { key: 'value' }, signedFieldDelta(item))
              ]);
            })),
          h('p', { key: 'copy', className: 'allo-tree-memory-field-compare-copy' },
            largestFieldDelta
              ? (band === 'k2'
                ? __alloT('stem.treelab.memory_field_compare_caution_k2', 'This shows what changed most. Check the leaf and carbon clues before deciding why the ring changed.')
                : __alloT('stem.treelab.memory_field_compare_caution', 'This highlights what changed most, not what caused the ring. Check the limiting factor and leaf response before making a causal claim.'))
              : (band === 'k2'
                ? __alloT('stem.treelab.memory_field_compare_steady_k2', 'The settings stayed the same, but the tree itself became one year older.')
                : __alloT('stem.treelab.memory_field_compare_steady', 'The four stored inputs were unchanged. Growth can still differ because the tree became older and larger.')))
        ]) : null;

        function loadHistoricalConditions() {
          var loaded = configForHistorySnapshot(selected, envCfg, tree.age);
          if (!loaded) {
            srSay(__alloT('stem.treelab.memory_field_load_unavailable', 'These historical conditions are not available.'));
            return;
          }
          CLOCK.stop();
          updMulti({
            tempC: loaded.tempC,
            light: loaded.light,
            co2ppm: loaded.co2ppm,
            soilWater: loaded.soilWater,
            droughtYears: loaded.droughtYears,
            historyReplay: {
              sourceYear: selected.year,
              startAge: tree.age,
              sourceRing: selected.ring,
              sourceNet: selected.net,
              tempC: loaded.tempC,
              light: loaded.light,
              co2ppm: loaded.co2ppm,
              soilWater: loaded.soilWater
            },
            playing: false,
            lastEffect: null
          });
          srSay(__alloT('stem.treelab.memory_field_loaded_pre', 'Loaded Year ') + selected.year
            + __alloT('stem.treelab.memory_field_loaded_post', ' conditions into the current controls. Tree age was not changed.'));
        }

        var fieldAction = hasFieldSnapshot ? h('div', {
          key: 'action',
          className: 'allo-tree-memory-field-action',
          'data-memory-field-action': 'load-conditions'
        }, [
          h('span', { key: 'copy', className: 'allo-tree-memory-field-action-copy' }, [
            h('strong', { key: 'title' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_field_action_title_k2', 'Try this year\'s settings again')
                : __alloT('stem.treelab.memory_field_action_title', 'Recreate the annual inputs')),
            h('span', { key: 'note' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_field_action_copy_k2', 'This changes the sliders, not the tree\'s age. An older tree may grow differently.')
                : __alloT('stem.treelab.memory_field_action_copy', 'Loads these values into the current controls. It does not rewind tree age or guarantee the same ring.'))
          ]),
          btn('memory-load-conditions',
            band === 'k2'
              ? __alloT('stem.treelab.memory_field_action_button_k2', 'Try these settings')
              : __alloT('stem.treelab.memory_field_action_button', 'Load these conditions'),
            loadHistoricalConditions,
            { small: true, tone: 'ghost', disabled: !tree.alive || experimentActive })
        ]) : null;

        function replayFieldMatches(record, replay, key) {
          var tolerance = key === 'tempC' ? 0.051 : (key === 'co2ppm' ? 0.51 : 0.0011);
          return !!record && Number.isFinite(record[key])
            && Math.abs(record[key] - replay[key]) < tolerance;
        }

        function replayInputsMatch(record, replay) {
          return ['tempC', 'light', 'co2ppm', 'soilWater'].every(function (key) {
            return replayFieldMatches(record, replay, key);
          });
        }

        var replayRaw = d.historyReplay;
        var replay = replayRaw && typeof replayRaw === 'object'
          && Number.isFinite(replayRaw.sourceYear) && Number.isFinite(replayRaw.startAge)
          && Number.isFinite(replayRaw.sourceRing) && Number.isFinite(replayRaw.sourceNet)
          && Number.isFinite(replayRaw.tempC) && Number.isFinite(replayRaw.light)
          && Number.isFinite(replayRaw.co2ppm) && Number.isFinite(replayRaw.soilWater)
          && replayRaw.sourceYear === selected.year && replayRaw.startAge > replayRaw.sourceYear
          ? replayRaw : null;
        var replayTarget = null;
        if (replay) {
          validHistory.forEach(function (record) {
            if (record.year === replay.startAge) replayTarget = record;
          });
        }
        var replayState = replayTarget
          ? (replayInputsMatch(replayTarget, replay) ? 'complete' : 'modified')
          : (replay && replayInputsMatch(liveEnv, replay) ? 'ready' : (replay ? 'changed' : null));
        var replayObserved = replayTarget || liveEnv;
        var replayControlSpecs = replay ? [
          {
            key: 'tempC',
            label: __alloT('stem.treelab.memory_field_temperature', 'Temperature'),
            format: function (value) { return round(value, 1) + '\u00B0C'; }
          },
          {
            key: 'light',
            label: __alloT('stem.treelab.memory_replay_light', 'Light'),
            format: function (value) { return Math.round(value * 100) + '%'; }
          },
          {
            key: 'soilWater',
            label: __alloT('stem.treelab.memory_field_water', 'Soil water'),
            format: function (value) { return Math.round(value * 100) + '%'; }
          },
          {
            key: 'co2ppm',
            label: __alloT('stem.treelab.memory_replay_co2', 'Carbon dioxide'),
            format: function (value) { return Math.round(value) + ' ppm'; }
          }
        ] : [];
        var replayMatchedCount = replayControlSpecs.reduce(function (count, spec) {
          return count + (replayFieldMatches(replayObserved, replay, spec.key) ? 1 : 0);
        }, 0);
        var replayContextRecord = replayTarget || tree;
        var hasReplayContext = replay && (replayState === 'ready' || replayState === 'complete')
          && Number.isFinite(selected.heightM) && Number.isFinite(selected.dbhCm)
          && Number.isFinite(replayContextRecord.heightM) && Number.isFinite(replayContextRecord.dbhCm);

        function replaySigned(value, digits, unit) {
          var clean = Math.abs(value) < Math.pow(10, -digits) / 2 ? 0 : value;
          return (clean > 0 ? '+' : '') + round(clean, digits) + unit;
        }

        function replayRingCard(key, label, year, width, color, scale) {
          var relative = clamp(Math.abs(width) / Math.max(0.001, scale), 0, 1);
          return h('div', {
            key: key,
            className: 'allo-tree-memory-replay-specimen-card',
            'data-replay-ring-specimen': key
          }, [
            h('div', {
              key: 'disc', className: 'allo-tree-memory-ring-disc', 'aria-hidden': 'true',
              style: { '--specimen-band': round(4 + relative * 8, 1) + 'px', '--specimen-tone': tone(color) }
            }),
            h('span', { key: 'label' }, label),
            h('strong', { key: 'width' }, round(width, 2) + ' mm'),
            h('em', { key: 'year' }, __alloT('stem.treelab.memory_replay_context_year', 'Year ') + year)
          ]);
        }

        var replayPanel = replay ? h('section', {
          key: 'replay',
          className: 'allo-tree-memory-replay',
          'data-memory-replay': replayState,
          'data-replay-source-year': replay.sourceYear,
          style: { '--replay-tone': tone(replayState === 'complete' ? T.good : (replayState === 'ready' ? T.accent : T.warn)) }
        }, [
          h('span', { key: 'mark', className: 'allo-tree-memory-replay-mark', 'aria-hidden': 'true' },
            replayState === 'ready' ? '\u23F3' : (replayState === 'complete' ? '\u2713' : '\u26A0\uFE0F')),
          h('span', {
            key: 'copy', className: 'allo-tree-memory-replay-copy',
            role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'
          }, [
            h('strong', { key: 'title' }, replayState === 'ready'
              ? (band === 'k2'
                ? __alloT('stem.treelab.memory_replay_ready_title_k2', 'Ready to try the old settings at age ') + replay.startAge
                : __alloT('stem.treelab.memory_replay_ready_title', 'Replay ready at age ') + replay.startAge)
              : (replayState === 'complete'
                ? __alloT('stem.treelab.memory_replay_complete_title', 'Same inputs, a different tree')
                : (replayState === 'modified'
                  ? __alloT('stem.treelab.memory_replay_modified_title', 'Replay year used different inputs')
                  : __alloT('stem.treelab.memory_replay_changed_title', 'Replay settings changed')))),
            h('span', { key: 'note' }, replayState === 'ready'
              ? (band === 'k2'
                ? __alloT('stem.treelab.memory_replay_ready_copy_k2', 'The old settings are on the sliders. Grow one year to see what this older tree does.')
                : __alloT('stem.treelab.memory_replay_ready_copy_pre', 'Year ') + replay.sourceYear
                    + __alloT('stem.treelab.memory_replay_ready_copy_post', ' inputs are loaded. Grow one year to test them on the tree as it exists now.'))
              : (replayState === 'complete'
                ? __alloT('stem.treelab.memory_replay_complete_copy_pre', 'Year ') + replay.startAge
                    + __alloT('stem.treelab.memory_replay_complete_copy_mid', ' used the loaded Year ') + replay.sourceYear
                    + __alloT('stem.treelab.memory_replay_complete_copy_post', ' conditions.')
                : (replayState === 'modified'
                  ? __alloT('stem.treelab.memory_replay_modified_copy', 'The new record is still useful, but it is not a same-input replay.')
                  : __alloT('stem.treelab.memory_replay_changed_copy', 'Reload the historical conditions before growing to make a same-input comparison.'))))
          ]),
          replayState === 'ready' ? btn('memory-grow-replay',
            band === 'k2'
              ? __alloT('stem.treelab.memory_replay_grow_k2', 'Grow and compare')
              : __alloT('stem.treelab.memory_replay_grow', 'Grow one test year'),
            function () { stepYears(1); },
            { small: true, tone: 'ghost', disabled: !tree.alive || experimentActive }) : null,
          h('section', {
            key: 'controls',
            className: 'allo-tree-memory-replay-controls',
            'data-replay-controlled-inputs': replayMatchedCount + '-of-' + replayControlSpecs.length,
            'aria-label': __alloT('stem.treelab.memory_replay_controls_label', 'Controlled-input match')
          }, [
            h('div', { key: 'head', className: 'allo-tree-memory-replay-controls-head' }, [
              h('strong', { key: 'title' }, band === 'k2'
                ? __alloT('stem.treelab.memory_replay_controls_title_k2', 'Settings to keep the same')
                : __alloT('stem.treelab.memory_replay_controls_title', 'Controlled inputs')),
              h('span', { key: 'count' }, replayMatchedCount
                + __alloT('stem.treelab.memory_replay_controls_count_mid', ' of ') + replayControlSpecs.length
                + __alloT('stem.treelab.memory_replay_controls_count_post', ' controlled inputs matched'))
            ]),
            h('div', { key: 'grid', className: 'allo-tree-memory-replay-control-grid', role: 'list' },
              replayControlSpecs.map(function (spec) {
                var matched = replayFieldMatches(replayObserved, replay, spec.key);
                var sourceValue = spec.format(replay[spec.key]);
                var observedValue = spec.format(replayObserved[spec.key]);
                var displayValue = matched ? sourceValue : sourceValue + ' \u2192 ' + observedValue;
                return h('div', {
                  key: spec.key,
                  className: 'allo-tree-memory-replay-control',
                  'data-replay-control': spec.key,
                  'data-control-state': matched ? 'matched' : 'changed',
                  role: 'listitem',
                  'aria-label': spec.label + '. '
                    + (matched
                      ? __alloT('stem.treelab.memory_replay_control_matched', 'Matched')
                      : __alloT('stem.treelab.memory_replay_control_changed', 'Changed'))
                    + '. ' + displayValue
                }, [
                  h('span', { key: 'mark', className: 'allo-tree-memory-replay-control-mark', 'aria-hidden': 'true' }, matched ? '\u2713' : '\u2260'),
                  h('span', { key: 'label' }, spec.label),
                  h('strong', { key: 'value' }, displayValue)
                ]);
              }))
          ]),
          hasReplayContext ? h('section', {
            key: 'context',
            className: 'allo-tree-memory-replay-context',
            'data-replay-context': replayState,
            'aria-label': __alloT('stem.treelab.memory_replay_context_label', 'Tree context comparison')
          }, [
            h('div', { key: 'head', className: 'allo-tree-memory-replay-context-head' }, [
              h('strong', { key: 'title' }, band === 'k2'
                ? __alloT('stem.treelab.memory_replay_context_title_k2', 'The tree changed too')
                : __alloT('stem.treelab.memory_replay_context_title', 'Tree context changed')),
              h('span', { key: 'copy' }, replayState === 'complete'
                ? __alloT('stem.treelab.memory_replay_context_complete', 'Inputs stayed controlled while age, size, and maintenance demands continued changing.')
                : __alloT('stem.treelab.memory_replay_context_ready', 'The controls match, but the tree receiving them is now older and larger.'))
            ]),
            h('div', { key: 'grid', className: 'allo-tree-memory-replay-context-grid' }, [
              h('div', { key: 'age', className: 'allo-tree-memory-replay-context-card', 'data-replay-context-metric': 'age' }, [
                h('span', { key: 'label' }, __alloT('stem.treelab.memory_replay_context_age', 'Annual record')),
                h('strong', { key: 'value' }, __alloT('stem.treelab.memory_replay_context_year', 'Year ') + replay.sourceYear
                  + ' \u2192 ' + __alloT('stem.treelab.memory_replay_context_year', 'Year ') + replay.startAge)
              ]),
              h('div', { key: 'height', className: 'allo-tree-memory-replay-context-card', 'data-replay-context-metric': 'height' }, [
                h('span', { key: 'label' }, __alloT('stem.treelab.memory_replay_context_height', 'Tree height')),
                h('strong', { key: 'value' }, round(selected.heightM, 2) + ' m \u2192 ' + round(replayContextRecord.heightM, 2) + ' m')
              ]),
              h('div', { key: 'diameter', className: 'allo-tree-memory-replay-context-card', 'data-replay-context-metric': 'diameter' }, [
                h('span', { key: 'label' }, __alloT('stem.treelab.memory_replay_context_diameter', 'Trunk diameter')),
                h('strong', { key: 'value' }, round(selected.dbhCm, 2) + ' cm \u2192 ' + round(replayContextRecord.dbhCm, 2) + ' cm')
              ])
            ])
          ]) : null,
          replayState === 'complete' ? h('section', {
            key: 'specimens',
            className: 'allo-tree-memory-replay-specimens',
            'data-replay-ring-specimens': 'paired',
            'data-ring-relation': Math.abs(replayTarget.ring - replay.sourceRing) <= Math.max(0.05, Math.abs(replay.sourceRing) * 0.08)
              ? 'similar' : (replayTarget.ring > replay.sourceRing ? 'wider' : 'narrower'),
            'aria-label': __alloT('stem.treelab.memory_replay_specimens_label_pre', 'Historical ring width ')
              + round(replay.sourceRing, 2) + ' mm. '
              + __alloT('stem.treelab.memory_replay_specimens_label_mid', 'Replay ring width ')
              + round(replayTarget.ring, 2) + ' mm.'
          }, [
            h('div', { key: 'head', className: 'allo-tree-memory-replay-specimens-head' }, [
              h('strong', { key: 'title' }, band === 'k2'
                ? __alloT('stem.treelab.memory_replay_specimens_title_k2', 'Look closely at the two rings')
                : __alloT('stem.treelab.memory_replay_specimens_title', 'Paired ring specimens')),
              h('span', { key: 'copy' }, __alloT('stem.treelab.memory_replay_specimens_copy', 'Historical evidence beside the replay outcome'))
            ]),
            h('div', { key: 'stage', className: 'allo-tree-memory-replay-specimen-stage' }, [
              replayRingCard('historical',
                __alloT('stem.treelab.memory_replay_specimen_historical', 'Historical ring'),
                replay.sourceYear, replay.sourceRing, T.accent,
                Math.max(Math.abs(replay.sourceRing), Math.abs(replayTarget.ring))),
              h('div', { key: 'bridge', className: 'allo-tree-memory-replay-specimen-bridge', 'aria-hidden': 'true' }, [
                h('b', { key: 'arrow' }, '\u2192'),
                h('strong', { key: 'delta' }, replaySigned(replayTarget.ring - replay.sourceRing, 2, ' mm')),
                h('span', { key: 'label' }, __alloT('stem.treelab.memory_replay_specimen_difference', 'ring-width difference'))
              ]),
              replayRingCard('replay',
                __alloT('stem.treelab.memory_replay_specimen_replay', 'Replay ring'),
                replay.startAge, replayTarget.ring, T.good,
                Math.max(Math.abs(replay.sourceRing), Math.abs(replayTarget.ring)))
            ]),
            h('p', { key: 'note', className: 'allo-tree-memory-replay-specimen-note' },
              __alloT('stem.treelab.memory_replay_specimen_note', 'The outer band is scaled within this pair to compare annual ring width. It is not a literal reconstruction of the whole trunk.'))
          ]) : null,
          replayState === 'complete' ? h('div', { key: 'metrics', className: 'allo-tree-memory-replay-metrics' }, [
            h('div', { key: 'net', className: 'allo-tree-memory-replay-metric' }, [
              h('span', { key: 'label' }, __alloT('stem.treelab.memory_replay_net', 'Net carbon change')),
              h('strong', { key: 'value' }, replaySigned(replayTarget.net - replay.sourceNet, 2, ' kg C'))
            ]),
            h('div', { key: 'ring', className: 'allo-tree-memory-replay-metric' }, [
              h('span', { key: 'label' }, __alloT('stem.treelab.memory_replay_ring', 'Ring-width change')),
              h('strong', { key: 'value' }, replaySigned(replayTarget.ring - replay.sourceRing, 2, ' mm'))
            ])
          ]) : null,
          replayState === 'complete' ? h('p', { key: 'meaning', className: 'allo-tree-memory-replay-note' },
            (Math.abs(replayTarget.ring - replay.sourceRing) <= Math.max(0.05, Math.abs(replay.sourceRing) * 0.08)
              ? __alloT('stem.treelab.memory_replay_ring_similar', 'The replay ring stayed similar in width. ')
              : (replayTarget.ring > replay.sourceRing
                ? __alloT('stem.treelab.memory_replay_ring_wider', 'The replay ring was wider. ')
                : __alloT('stem.treelab.memory_replay_ring_narrower', 'The replay ring was narrower. ')))
              + __alloT('stem.treelab.memory_replay_boundary', 'Same annual inputs do not freeze tree age, size, maintenance costs, or carbon allocation.')) : null
        ]) : null;

        var fieldNotes = h('details', {
          key: 'field',
          className: 'allo-tree-memory-field',
          'data-memory-field-notes': hasFieldSnapshot ? 'available' : 'legacy'
        }, [
          h('summary', { key: 'summary' }, [
            h('span', { key: 'icon', className: 'allo-tree-memory-field-icon', 'aria-hidden': 'true' }, '\uD83D\uDCD3'),
            h('strong', { key: 'title', className: 'allo-tree-memory-field-title' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_field_title_k2', 'Open this year\'s nature notes')
                : __alloT('stem.treelab.memory_field_title', 'Open the annual Field Notes')),
            h('span', { key: 'teaser', className: 'allo-tree-memory-field-teaser' }, fieldTeaser),
            h('span', { key: 'chevron', className: 'allo-tree-memory-field-chevron', 'aria-hidden': 'true' }, '\u203A')
          ]),
          h('div', { key: 'body', className: 'allo-tree-memory-field-body' }, hasFieldSnapshot
            ? [
                h('div', { key: 'grid', className: 'allo-tree-memory-field-grid' }, [
                  fieldNote('temperature',
                    __alloT('stem.treelab.memory_field_temperature', 'Temperature'),
                    round(selected.tempC, 1) + '\u00B0C',
                    selected.tempC < 5
                      ? __alloT('stem.treelab.memory_field_cold', 'cold')
                      : (selected.tempC > 30
                        ? __alloT('stem.treelab.memory_field_hot', 'hot')
                        : __alloT('stem.treelab.memory_field_working', 'working range')),
                    (selected.tempC + 10) / 50, FACTOR_HUE('temperature')),
                  fieldNote('light',
                    band === 'k2'
                      ? __alloT('stem.treelab.memory_field_light_k2', 'Sunlight')
                      : __alloT('stem.treelab.memory_field_light', 'Relative light'),
                    Math.round(selected.light * 100) + '%',
                    selected.light < 0.3
                      ? __alloT('stem.treelab.memory_field_dim', 'dim')
                      : (selected.light > 0.75
                        ? __alloT('stem.treelab.memory_field_bright', 'bright')
                        : __alloT('stem.treelab.memory_field_moderate', 'moderate')),
                    selected.light, FACTOR_HUE('light')),
                  fieldNote('water',
                    __alloT('stem.treelab.memory_field_water', 'Soil water'),
                    Math.round(selected.soilWater * 100) + '%',
                    selected.soilWater < 0.2
                      ? __alloT('stem.treelab.memory_field_dry', 'dry')
                      : (selected.soilWater > 0.7
                        ? __alloT('stem.treelab.memory_field_moist', 'moist')
                        : __alloT('stem.treelab.memory_field_available', 'available')),
                    selected.soilWater, FACTOR_HUE('water')),
                  fieldNote('co2',
                    band === 'k2'
                      ? __alloT('stem.treelab.memory_field_co2_k2', 'Carbon dioxide in air')
                      : __alloT('stem.treelab.memory_field_co2', 'Atmospheric carbon dioxide'),
                    Math.round(selected.co2ppm) + ' ppm',
                    selected.co2ppm < 350
                      ? __alloT('stem.treelab.memory_field_co2_low', 'low')
                      : (selected.co2ppm > 700
                        ? __alloT('stem.treelab.memory_field_co2_enriched', 'enriched')
                        : __alloT('stem.treelab.memory_field_co2_ambient', 'ambient range')),
                    (selected.co2ppm - 250) / 750, FACTOR_HUE('co2'))
                ]),
                fieldCompare,
                fieldAction,
                replayPanel,
                h('p', { key: 'caution', className: 'allo-tree-memory-field-caution' },
                  band === 'k2'
                    ? __alloT('stem.treelab.memory_field_caution_k2', 'These are the settings the model used to grow this ring.')
                    : __alloT('stem.treelab.memory_field_caution', 'Evidence boundary: this snapshot records inputs supplied to the model for the annual step. It is not weather reconstructed from the ring.'))
              ]
            : h('p', { key: 'missing', className: 'allo-tree-memory-field-missing' },
                band === 'k2'
                  ? __alloT('stem.treelab.memory_field_missing_k2', 'This older ring still tells a growth story, but its weather settings were not saved.')
                  : __alloT('stem.treelab.memory_field_missing', 'This older record predates annual condition snapshots. Its carbon, limiter, and ring evidence remain available.')))
        ]);

        var comparisonPanel = h('section', {
          key: 'compare',
          className: 'allo-tree-memory-compare',
          'data-memory-compare': previous ? previous.year + '-to-' + selected.year : 'baseline',
          'data-memory-trend': trendId,
          'aria-label': __alloT('stem.treelab.memory_compare_label', 'Comparison with the previous recorded year'),
          style: { '--memory-trend': tone(trendTone) }
        }, [
          h('div', { key: 'head', className: 'allo-tree-memory-compare-head' }, [
            h('span', { key: 'arrow', className: 'allo-tree-memory-compare-arrow', 'aria-hidden': 'true' }, trendArrow),
            h('strong', { key: 'title' }, trendTitle),
            h('span', { key: 'years' }, previous
              ? __alloT('stem.treelab.memory_compared_with', 'Compared with Year ') + previous.year
              : __alloT('stem.treelab.memory_no_previous', 'No earlier year to compare'))
          ]),
          h('div', { key: 'deltas', className: 'allo-tree-memory-deltas' }, [
            h('div', { key: 'net', className: 'allo-tree-memory-delta' }, [
              h('span', { key: 'label' }, __alloT('stem.treelab.memory_net_change', 'Net carbon change')),
              h('strong', { key: 'value' }, signedChange(netDelta, 'kg C'))
            ]),
            h('div', { key: 'ring', className: 'allo-tree-memory-delta' }, [
              h('span', { key: 'label' }, __alloT('stem.treelab.memory_ring_change', 'Ring-width change')),
              h('strong', { key: 'value' }, signedChange(ringDelta, 'mm'))
            ])
          ]),
          h('p', { key: 'copy', className: 'allo-tree-memory-compare-copy' }, [
            h('span', { key: 'trend' }, trendCopy + (limiterComparison ? ' ' + limiterComparison : '')),
            h('span', { key: 'caution', className: 'allo-tree-memory-note' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_compare_caution_k2', 'Use more than one clue: age and where the tree sends its food can change ring size too.')
                : __alloT('stem.treelab.memory_compare_caution', 'Pattern-reading caution: a year-to-year change is evidence, not proof that the limiting factor alone caused the ring difference. Age and carbon allocation also matter.'))
          ])
        ]);

        var claimAnswer = trendId === 'recovery'
          ? 'recovery' : (trendId === 'setback' ? 'setback' : 'continuity');
        var currentClaim = d.historyClaimYear === selected.year
          && (d.historyClaim === 'recovery' || d.historyClaim === 'setback' || d.historyClaim === 'continuity')
          ? d.historyClaim : null;
        var claimCorrect = currentClaim ? currentClaim === claimAnswer : false;
        var claimTone = !currentClaim ? T.accent : (claimCorrect ? T.good : T.warn);

        function claimOption(id, label) {
          return h('button', {
            key: id,
            type: 'button',
            className: 'allo-tree-memory-claim',
            'data-memory-claim': id,
            'aria-pressed': currentClaim === id,
            'aria-describedby': 'treelab-memory-detective-feedback',
            onClick: function () {
              var correct = id === claimAnswer;
              updMulti({ historyClaimYear: selected.year, historyClaim: id });
              srSay(correct
                ? __alloT('stem.treelab.memory_claim_correct_say', 'That claim matches the evidence.')
                : __alloT('stem.treelab.memory_claim_retry_say', 'Look again at the two carbon balance labels.'));
            }
          }, label);
        }

        var claimFeedback;
        if (!currentClaim) {
          claimFeedback = band === 'k2'
            ? __alloT('stem.treelab.memory_claim_wait_k2', 'Choose the story that matches the two rings.')
            : __alloT('stem.treelab.memory_claim_wait', 'Choose the claim best supported by the two surplus or deficit labels.');
        } else if (!claimCorrect) {
          claimFeedback = band === 'k2'
            ? __alloT('stem.treelab.memory_claim_retry_k2', 'Look again. Read the word under each ring, then see whether the tree crossed zero.')
            : __alloT('stem.treelab.memory_claim_retry', 'Not yet. Read the surplus or deficit label beneath each ring, then check whether the carbon balance crossed zero.');
        } else if (claimAnswer === 'recovery') {
          claimFeedback = __alloT('stem.treelab.memory_claim_recovery_pre', 'Yes. Year ')
            + previous.year + __alloT('stem.treelab.memory_claim_recovery_mid', ' ended in deficit, then Year ')
            + selected.year + __alloT('stem.treelab.memory_claim_recovery_post', ' returned to surplus. That is recovery in this model.');
        } else if (claimAnswer === 'setback') {
          claimFeedback = __alloT('stem.treelab.memory_claim_setback_pre', 'Yes. Year ')
            + previous.year + __alloT('stem.treelab.memory_claim_setback_mid', ' ended in surplus, then Year ')
            + selected.year + __alloT('stem.treelab.memory_claim_setback_post', ' fell into deficit. That is a new stress signal.');
        } else {
          claimFeedback = previous.net >= 0 && selected.net >= 0
            ? __alloT('stem.treelab.memory_claim_continuity_surplus', 'Yes. Both years stayed in carbon surplus, even though their ring widths may differ.')
            : __alloT('stem.treelab.memory_claim_continuity_deficit', 'Yes. Both years stayed in carbon deficit, even though the size of the deficit may differ.');
        }

        var detectivePanel = previous ? h('section', {
          key: 'detective',
          className: 'allo-tree-memory-detective',
          'data-memory-detective': previous.year + '-to-' + selected.year,
          'data-memory-claim-result': !currentClaim ? 'waiting' : (claimCorrect ? 'correct' : 'retry'),
          'aria-labelledby': 'treelab-memory-detective-title',
          style: { '--detective-tone': tone(claimTone) }
        }, [
          h('div', { key: 'head', className: 'allo-tree-memory-detective-head' }, [
            h('span', { key: 'icon', className: 'allo-tree-memory-detective-icon', 'aria-hidden': 'true' }, '\uD83D\uDD0E'),
            h('strong', { key: 'title', id: 'treelab-memory-detective-title' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_detective_title_k2', 'Be a tree detective')
                : __alloT('stem.treelab.memory_detective_title', 'Make an evidence-based claim')),
            h('span', { key: 'prompt' },
              band === 'k2'
                ? __alloT('stem.treelab.memory_detective_prompt_k2', 'What story do these two rings tell?')
                : __alloT('stem.treelab.memory_detective_prompt', 'Which claim best describes the carbon-balance change from the previous year?'))
          ]),
          h('div', {
            key: 'options',
            className: 'allo-tree-memory-claim-options',
            role: 'group',
            'aria-label': __alloT('stem.treelab.memory_claim_options_label', 'Choose a claim about the two years')
          }, [
            claimOption('recovery', band === 'k2'
              ? __alloT('stem.treelab.memory_claim_recovery_k2', 'The tree bounced back')
              : __alloT('stem.treelab.memory_claim_recovery', 'Recovery: deficit to surplus')),
            claimOption('setback', band === 'k2'
              ? __alloT('stem.treelab.memory_claim_setback_k2', 'The year got harder')
              : __alloT('stem.treelab.memory_claim_setback', 'New stress: surplus to deficit')),
            claimOption('continuity', band === 'k2'
              ? __alloT('stem.treelab.memory_claim_continuity_k2', 'The balance stayed on one side')
              : __alloT('stem.treelab.memory_claim_continuity', 'No crossing: same side of zero'))
          ]),
          h('p', {
            key: 'feedback',
            id: 'treelab-memory-detective-feedback',
            className: 'allo-tree-memory-feedback',
            role: 'status',
            'aria-live': 'polite'
          }, claimFeedback)
        ]) : null;

        return card([
          memoryHead(true),
          memoryKey,
          timeline,
          h('div', {
            key: 'detail',
            className: 'allo-tree-memory-detail',
            'data-memory-detail-year': selected.year
          }, [
            h('div', { key: 'evidence' }, [
              h('div', { key: 'head', className: 'allo-tree-memory-detail-head' }, [
                h('span', { key: 'year', className: 'allo-tree-memory-detail-year' },
                  __alloT('stem.treelab.year', 'Year') + ' ' + selected.year),
                h('strong', { key: 'title' },
                  selectedStress
                    ? __alloT('stem.treelab.memory_stress_year', 'A stress year in the wood')
                    : __alloT('stem.treelab.memory_growth_year', 'A growth year in the wood')),
                h('span', { key: 'state' },
                  selectedLimiter + ' ' + __alloT('stem.treelab.memory_limited', 'limited')
                    + ' \u00B7 ' + (selectedStress
                      ? __alloT('stem.treelab.memory_deficit', 'deficit')
                      : __alloT('stem.treelab.memory_surplus', 'surplus')))
              ]),
              h('dl', { key: 'facts', className: 'allo-tree-memory-facts' }, [
                fact('net', __alloT('stem.treelab.memory_net', 'Net carbon'),
                  (selected.net >= 0 ? '+' : '') + round(selected.net, 2) + ' kg C'),
                fact('ring', __alloT('stem.treelab.memory_ring_width', 'Ring width'),
                  round(Math.max(0, selected.ring), 2) + ' mm'),
                fact('limit', __alloT('stem.treelab.memory_limiting_factor', 'Limiting factor'), selectedLimiter),
                fact('reserves', __alloT('stem.treelab.memory_reserves', 'Reserves'),
                  typeof selected.reserves === 'number' && isFinite(selected.reserves)
                    ? round(selected.reserves, 2) + ' kg C'
                    : '\u2014')
              ])
            ]),
            h('div', { key: 'story', className: 'allo-tree-memory-story' }, [
              h('strong', { key: 'label' },
                band === 'k2'
                  ? __alloT('stem.treelab.memory_story_label_k2', 'What this ring remembers')
                  : __alloT('stem.treelab.memory_story_label', 'What this year records')),
              h('span', { key: 'cause' }, causeText(selected) + ' ' + resultText),
              h('span', { key: 'note', className: 'allo-tree-memory-note' },
                band === 'k2'
                  ? __alloT('stem.treelab.memory_note_k2', 'A ring is a clue about how much wood the tree built, not a weather report by itself.')
                  : __alloT('stem.treelab.memory_note', 'Ring width remembers carbon sent to wood. It is not a direct weather measurement, and rings often narrow as a tree gets older.'))
            ]),
            causalTrail,
            fieldNotes,
            comparisonPanel,
            detectivePanel
          ])
        ], { '--memory-selected': selectedTone }, 'allo-tree-memory');
      }

      function viewGrow() {
        var lim = live.limiting;
        var limId = lim.viaStomata ? 'water' : lim.id;
        var limName = { light: 'Light', co2: CO2, water: 'Water', temperature: 'Temperature' }[limId] || limId;
        var kids = [];
        var scene = viewerPanel();
        var mission = missionPanel();
        pushKeyed(kids, flowMarker('1',
          __alloT('stem.treelab.flow_observe', 'Observe and grow'),
          __alloT('stem.treelab.flow_observe_note', 'Read the living tree, move time forward, and see what its carbon budget can afford.')), 'grow-flow-observe');
        pushKeyed(kids, timeScaleRibbon(), 'grow-timescales');
        pushKeyed(kids, playbackPanel(), 'grow-playback');

        pushKeyed(kids, card([
          heading(__alloT('stem.treelab.this_year', 'This year’s carbon budget'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.budget_sub_g68', 'Gross photosynthesis minus maintenance respiration is what is left to grow with. Everything below is spent out of that surplus.')
              : __alloT('stem.treelab.budget_sub_k2', 'Sugar made, minus sugar used just to stay alive. What is left is what the tree can grow with.')),
          // Same gate as the full-screen panel, for the same reason: live.gross is
          // computed from stored leafArea whether or not the tree is alive, so these
          // tiles reported a healthy income for a corpse while postMortem() below
          // explained the death. Two cards on one screen telling opposite stories.
          !tree.alive
            ? h('div', {
              key: 'nums-dead',
              style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 13, color: T.dim, lineHeight: 1.55, marginBottom: 10 }
            }, __alloT('stem.treelab.dead_budget',
              'Nothing. A dead tree makes no sugar and spends none. Its stored carbon stays in the wood.'))
            : h('div', { key: 'nums', className: 'allo-tree-budget-equation', role: 'group', 'aria-label': __alloT('stem.treelab.budget_equation', 'Carbon budget equation') }, [
              statTile('made', atLeast(band, 'g68') ? 'Gross photosynthesis' : 'Sugar made', round(live.gross, 2) + ' kg C', T.good),
              h('span', { key: 'minus', className: 'allo-tree-budget-operator', 'aria-hidden': 'true' }, '\u2212'),
              statTile('spent', atLeast(band, 'g68')
                ? __alloT('stem.treelab.tile_resp', 'Maintenance respiration')
                : __alloT('stem.treelab.tile_resp_k2', 'Sugar used to stay alive'), round(liveResp, 2) + ' kg C', T.warn),
              h('span', { key: 'equals', className: 'allo-tree-budget-operator', 'aria-hidden': 'true' }, '='),
              statTile('net', atLeast(band, 'g68') ? 'Net carbon' : 'Left to grow with', round(liveNet, 2) + ' kg C', liveNet >= 0 ? T.accent : T.bad)
            ]),
          // The three tiles are one subtraction, so it is also drawn AS one: a single
          // bar of the year's gross, split into the slice burned to stay alive and
          // the slice left to grow with. In a deficit year the bar is the spending
          // instead, and the uncovered slice is the draw on reserves — the same red
          // as the warning text below it.
          !tree.alive ? null : (function () {
            var gross = Math.max(0, live.gross), resp = Math.max(0, liveResp);
            var total = Math.max(gross, resp);
            if (total <= 0) return null;
            var deficit = liveNet < 0;
            // Slice colours repeat the tile colours above them: gross/good,
            // respiration/warn, net/accent, deficit/bad — one legend, learned once.
            var segs = deficit
              ? [[gross, T.good], [resp - gross, T.bad]]
              : [[resp, T.warn], [Math.max(0, liveNet), T.accent]];
            var lbl = deficit
              ? __alloT('stem.treelab.budget_bar_deficit', 'Respiration exceeds what was made; the difference is drawn from reserves.')
              : __alloT('stem.treelab.budget_bar_credit', 'Spent to stay alive · left to grow with');
            return h('div', {
              key: 'eq', role: 'img',
              'aria-label': __alloT('stem.treelab.budget_bar_alt', 'Budget bar. ')
                + round(gross, 2) + ' ' + __alloT('stem.treelab.alt_kgc_made', 'kg C made') + ', '
                + round(resp, 2) + ' ' + __alloT('stem.treelab.alt_kgc_maint', 'kg C spent on maintenance') + ', '
                + (deficit
                  ? round(-liveNet, 2) + ' ' + __alloT('stem.treelab.alt_kgc_reserves', 'kg C drawn from reserves.')
                  : round(liveNet, 2) + ' ' + __alloT('stem.treelab.alt_kgc_left', 'kg C left to grow with.')),
              style: { marginBottom: 10 }
            }, [
              h('div', { key: 'bar', style: { display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', border: '1px solid ' + T.border } },
                segs.map(function (s, i) {
                  var w = Math.max(0, Math.round((s[0] / total) * 1000) / 10);
                  return h('div', {
                    key: 'seg' + i,
                    style: {
                      width: w + '%', background: s[1],
                      borderRight: i === 0 && w > 0 && w < 100 ? '2px solid ' + T.card : 'none'
                    }
                  });
                })),
              h('div', { key: 'cap', style: { fontSize: 11, color: T.dim, marginTop: 3 } }, lbl)
            ]);
          })(),
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
        ], undefined, 'allo-tree-budget-card'), 'grow-budget');
        pushKeyed(kids, treeMemoryPanel(), 'grow-memory');

        // ── The objective ───────────────────────────────────────────────────
        //
        // The tool had no stated goal, so "am I doing well?" had no answer and the
        // allocation sliders were a guess with no destination.
        //
        // Both targets are the MODEL'S own, not numbers picked for a game. Maturity
        // is the same clamp(heightM / (maxHeight * 0.6)) the renderer already uses to
        // decide when a tree looks mature and starts carrying cones, so the goal is
        // met exactly when the tree on screen looks grown. The reproduction target is
        // the cheapest strategy THIS species actually has in sp.modes, read from
        // STRATEGIES, so an aspen (root sucker, 0.45) and an oak (animal seed, 1.4)
        // are asked for different things because their biology differs.
        //
        // Framed as "a tree that made it" rather than a score: no timer, no par age,
        // nothing to lose. Reaching it late is still reaching it.
        var goalHeightM = Math.max(0.5, (sp.maxHeight || 30) * 0.6);
        var cheapestMode = null;
        for (var gm = 0; gm < STRATEGIES.length; gm++) {
          if (sp.modes.indexOf(STRATEGIES[gm].id) < 0) continue;
          if (!cheapestMode || STRATEGIES[gm].cost < cheapestMode.cost) cheapestMode = STRATEGIES[gm];
        }
        var goalSeedCost = cheapestMode ? cheapestMode.cost : 0.6;
        var grownFrac = clamp(tree.heightM / goalHeightM, 0, 1);
        var seedFrac = clamp((tree.seedsBanked || 0) / goalSeedCost, 0, 1);
        // Derived for display only. The award and the state write happen in tick(),
        // NOT here: a set*/upd() in a render body is the documented host-update
        // crash class, and this tool cannot use an effect to escape it because its
        // views live inside a switch, so any hook here would be conditional.
        var goalMet = grownFrac >= 1 && seedFrac >= 1;
        if (tree.alive) {
          function goalRow(label, frac, detail) {
            var tone = frac >= 1 ? T.good : (frac >= 0.5 ? T.warn : T.dim);
            return h('div', { key: label, style: { marginBottom: 8 } }, [
              h('div', { key: 'l', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 3 } }, [
                h('span', { key: 'a' }, (frac >= 1 ? '✓ ' : '') + label),
                h('span', { key: 'b', style: { color: tone, fontWeight: 700 } }, detail)
              ]),
              h('div', { key: 'bar', role: 'img', 'aria-label': label + ': ' + detail,
                style: { height: 8, borderRadius: 999, background: T.cardAlt, border: '1px solid ' + T.border, overflow: 'hidden' } },
                h('div', { key: 'f', style: { width: Math.round(frac * 100) + '%', height: '100%', background: tone } }))
            ]);
          }
          pushKeyed(kids, card([
            heading('🎯 ' + __alloT('stem.treelab.goal', 'A tree that made it'),
              __alloT('stem.treelab.goal_sub', 'Grow to full size and bank enough carbon to make the next generation. There is no clock: reaching it late still counts.')),
            goalRow(__alloT('stem.treelab.goal_grown', 'Grown to full size'), grownFrac,
              round(tree.heightM, 1) + ' / ' + round(goalHeightM, 1) + ' m'),
            goalRow(__alloT('stem.treelab.goal_seed', 'Banked enough to reproduce') +
              (cheapestMode ? ' (' + __alloT('stem.treelab.strategy_' + cheapestMode.id, cheapestMode.name) + ')' : ''),
              seedFrac, round(tree.seedsBanked || 0, 2) + ' / ' + round(goalSeedCost, 2)),
            h('div', { key: 'msg', style: { fontSize: 12, color: goalMet ? T.good : T.dim, lineHeight: 1.5, marginTop: 6 } },
              goalMet
                ? __alloT('stem.treelab.goal_done', 'Done. This tree reached full size and can seed the next generation. Open Spread to send it out.')
                : (grownFrac >= 1
                  ? __alloT('stem.treelab.goal_need_seed', 'Full size. Move some carbon into reproduction to finish it.')
                  : (seedFrac >= 1
                    ? __alloT('stem.treelab.goal_need_height', 'Enough banked to reproduce. It still has growing to do.')
                    : __alloT('stem.treelab.goal_hint', 'Leaves earn the carbon, wood buys height, roots buy water. The split is yours.'))))
          ]), 'grow-goal');
        }

        // ── Survival margin ─────────────────────────────────────────────────
        //
        // The engine already decides death from two running quantities: a count of
        // consecutive negative-carbon years against a species tolerance, and a
        // reserve pool that can be overdrawn. Neither was ever shown. deficitYears
        // appeared in exactly one place in the whole tool — the sentence explaining
        // the death, after it had happened — so a student could not see the failure
        // coming, and "spend less than you make" had no visible dial.
        //
        // Nothing here is a new rule or a new threshold. It is the engine's own
        // carbon_starvation test, drawn.
        if (tree.alive) {
          var stressYears = typeof tree.deficitYears === 'number' ? tree.deficitYears : 0;
          var stressLimit = Math.max(1, Math.round(6 + (sp.droughtTol || 0) * 8));
          var stressFrac = clamp(stressYears / stressLimit, 0, 1);
          var reserveFloor = Math.max(0.15, (tree.sapwoodMass || 0) * 0.35);
          var reserveFrac = clamp(1 - (-(Math.min(0, tree.reserves || 0)) / reserveFloor), 0, 1);
          var margin = Math.min(1 - stressFrac, reserveFrac);
          var marginTone = margin > 0.66 ? T.good : (margin > 0.33 ? T.warn : T.bad);
          function meter(label, frac, tone, detail) {
            return h('div', { key: label, style: { marginBottom: 8 } }, [
              h('div', { key: 'l', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 3 } }, [
                h('span', { key: 'a' }, label), h('span', { key: 'b', style: { color: tone, fontWeight: 700 } }, detail)
              ]),
              h('div', { key: 'bar', role: 'img', 'aria-label': label + ': ' + detail,
                style: { height: 8, borderRadius: 999, background: T.cardAlt, border: '1px solid ' + T.border, overflow: 'hidden' } },
                h('div', { key: 'f', style: { width: Math.round(frac * 100) + '%', height: '100%', background: tone } }))
            ]);
          }
          var survivalNode = card([
            heading(__alloT('stem.treelab.survival', 'Survival margin'),
              __alloT('stem.treelab.survival_sub', 'How much room this tree has left before it starves. Both bars refill on any year it makes more than it spends.')),
            meter(__alloT('stem.treelab.good_years_left', 'Years of deficit it can still take'),
              1 - stressFrac, stressFrac > 0.66 ? T.bad : (stressFrac > 0.33 ? T.warn : T.good),
              (stressLimit - stressYears) + ' / ' + stressLimit),
            meter(__alloT('stem.treelab.reserves_left', 'Stored sugar reserves'),
              reserveFrac, reserveFrac < 0.34 ? T.bad : (reserveFrac < 0.67 ? T.warn : T.good),
              Math.round(reserveFrac * 100) + '%'),
            h('div', { key: 'why', style: { fontSize: 12, color: marginTone, lineHeight: 1.5, marginTop: 6 } },
              stressYears === 0
                ? __alloT('stem.treelab.survival_ok', 'Making more than it spends. Reserves are refilling and the deficit count is back to zero.')
                : (margin > 0.33
                  ? __alloT('stem.treelab.survival_warn', 'Running a deficit. Give it more leaf area, easier conditions, or less to pay for, and both bars recover.')
                  : __alloT('stem.treelab.survival_bad', 'Close to starving. The next few negative years will kill it unless something changes now.'))),
            h('div', { key: 'lim', style: { fontSize: 12, color: T.dim, lineHeight: 1.5, marginTop: 4 } },
              __alloT('stem.treelab.survival_limit_is', 'What is holding it back right now: ') + limName + '.')
          ]);
        }

        pushKeyed(kids, flowMarker('2',
          __alloT('stem.treelab.flow_shape', 'Shape the next year'),
          __alloT('stem.treelab.flow_shape_note', 'Change the environment and choose where the tree invests whatever carbon remains.')), 'grow-flow-shape');
        pushKeyed(kids, card([
          heading(__alloT('stem.treelab.conditions', 'Conditions'),
            __alloT('stem.treelab.conditions_sub', 'Change one thing at a time and watch which factor takes over as the limit.')),
          // Each condition wears the same hue its factor carries everywhere else —
          // the Chemistry curves, the limit bars, the ring strip. Same idea, same ink.
          slider('light', __alloT('stem.treelab.light', 'Light reaching the leaves'), envCfg.light, 0, 1, 0.05,
            function (v) { changeCondition('light', v, 'light'); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked || !tree.alive, tone(FACTOR_HUE('light'))),
          slider('water', __alloT('stem.treelab.soil_water', 'Soil water'), envCfg.soilWater, 0, 1, 0.05,
            function (v) { changeCondition('soilWater', v, 'water'); }, function (v) { return Math.round(v * 100) + '%'; }, experimentLocked || !tree.alive, tone(FACTOR_HUE('water'))),
          slider('temp', __alloT('stem.treelab.temperature', 'Temperature'), envCfg.tempC, -5, 45, 1,
            function (v) { changeCondition('tempC', v, 'temperature'); }, function (v) { return v + ' ' + DEG + 'C'; }, experimentLocked || !tree.alive, tone(FACTOR_HUE('temperature'))),
          atLeast(band, 'g68') ? slider('co2', CO2 + ' concentration', envCfg.co2ppm, 180, 900, 10,
            function (v) { changeCondition('co2ppm', v, 'co2'); }, function (v) { return v + ' ppm'; }, experimentLocked || !tree.alive, tone(FACTOR_HUE('co2'))) : null,
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
          causeEffectPanel(),
          atLeast(band, 'g68') ? h('div', { key: 'ap', style: { marginTop: 6 } },
            bar(__alloT('stem.treelab.stomata_open', 'Stomata open'), aperture, T.accent,
              aperture < 0.9
                ? __alloT('stem.treelab.stomata_closing', 'Closing to save water. Less ' + H2O + ' out, but also less ' + CO2 + ' in.')
                : __alloT('stem.treelab.stomata_open_note', 'Wide open. Carbon is coming in and water is going out through the same pores.'))) : null
        ], undefined, 'allo-tree-conditions-card'), 'grow-conditions');

        pushKeyed(kids, card([
          heading(__alloT('stem.treelab.spend_it', 'Where does the surplus go?'),
            __alloT('stem.treelab.spend_it_sub', 'The tree cannot do all of these at once. More wood means fewer seeds this year.')),
          // The five sliders are shares of ONE surplus, so the whole is drawn as one
          // strip. `alloc` is already normalised by the time it renders, so the strip
          // and the slider percentages always agree — no ≠100% case exists here.
          (function () {
            var parts = [
              ['leaf', '#22c55e', __alloT('stem.treelab.leaves', 'Leaves')],
              ['root', '#a16207', __alloT('stem.treelab.roots', 'Roots')],
              ['wood', '#f59e0b', __alloT('stem.treelab.wood', 'Wood (height and rings)')],
              ['repro', '#ec4899', __alloT('stem.treelab.reproduction', 'Reproduction')],
              ['store', '#38bdf8', __alloT('stem.treelab.reserves', 'Stored reserves')]
            ];
            var sum = 0;
            parts.forEach(function (p) { sum += Math.max(0, alloc[p[0]] || 0); });
            if (sum <= 0) return null;
            return h('div', { key: 'mix', style: { marginBottom: 12 } }, [
              h('div', {
                key: 'strip', role: 'img',
                'aria-label': __alloT('stem.treelab.alloc_strip_alt', 'How the surplus divides: ')
                  + parts.map(function (p) { return p[2] + ' ' + Math.round((Math.max(0, alloc[p[0]] || 0) / sum) * 100) + '%'; }).join(', '),
                style: { display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', border: '1px solid ' + T.border }
              }, parts.map(function (p, i) {
                var w = Math.round((Math.max(0, alloc[p[0]] || 0) / sum) * 1000) / 10;
                return h('div', {
                  key: p[0],
                  style: {
                    width: w + '%', background: tone(p[1]),
                    borderRight: i < parts.length - 1 && w > 0 ? '1px solid ' + T.card : 'none'
                  }
                });
              }))
            ]);
          })(),
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

        pushKeyed(kids, advancedGateway(), 'grow-advanced-gateway');
        var advancedKids = [];
        if (advancedOpen) {
          pushKeyed(advancedKids, flowMarker('3',
            __alloT('stem.treelab.flow_evidence', 'Turn the pattern into evidence'),
            __alloT('stem.treelab.flow_evidence_note', 'Make a prediction, run a controlled trial, and compare what the tree actually did.')), 'grow-flow-evidence');
          if (survivalNode) pushKeyed(advancedKids, survivalNode, 'grow-survival');
          pushKeyed(advancedKids, h('div', { id: 'treelab-investigation' }, experimentPanel()), 'grow-experiment');
          pushKeyed(advancedKids, trialComparisonPanel(), 'grow-trial-comparison');
          if (tree.rings.length > 0) pushKeyed(advancedKids, ringPanel(), 'grow-rings');
        }
        pushKeyed(kids, h('div', {
          id: 'treelab-advanced-work', className: 'allo-tree-advanced-work', hidden: !advancedOpen,
          'aria-label': __alloT('stem.treelab.advanced_workspace', 'Advanced evidence workspace')
        }, advancedKids), 'grow-advanced-work');
        return h('div', { key: 'workbench', className: 'allo-tree-workbench' }, [
          h('div', { key: 'mission', className: 'allo-tree-workbench-mission' }, mission),
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
              return btn('sp-' + option.id, speedLabel(option), function () {
                updMulti({ speed: option.id });
                srSay(__alloT('stem.treelab.say_speed_set', 'Speed set to ') + speedLabel(option) + '. ' + speedHint(option));
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
          h('div', { key: 'hint', style: { fontSize: 11, color: T.dim, marginTop: 6, lineHeight: 1.5 } }, speedHint(speed)),
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

      // The Explain step asks the student to "use the limiting factor and carbon
      // evidence" — and then showed four end-point tiles. The per-year record was
      // sitting in result.tree.history all along (simulateYear logs net, height and
      // the limiter every year, and trial snapshots keep it through save/load), so
      // the evidence is drawn: net carbon bars above/below a zero line, with the
      // year's limiting factor as a strip underneath in the factor hues every other
      // panel already uses. No engine change — this is a window onto stored truth.
      function experimentEvidence(sum2, tr) {
        if (!tr || !sum2 || !Array.isArray(tr.history)) return null;
        var yrs = tr.history.slice(-Math.max(1, Math.min(sum2.yearsCompleted || 0, tr.history.length)));
        if (!yrs.length || sum2.yearsCompleted <= 0) return null;

        var W = 300, H = 104, PADL = 34, PADR = 6, PADT = 8, STRIP = 11, GAPY = 3, PADB = 4;
        var plotW = W - PADL - PADR, plotH = H - PADT - STRIP - GAPY - PADB;
        var maxAbs = 0.01;
        yrs.forEach(function (y2) {
          var n2 = typeof y2.net === 'number' && isFinite(y2.net) ? Math.abs(y2.net) : 0;
          if (n2 > maxAbs) maxAbs = n2;
        });
        var y0 = PADT + plotH / 2;
        var n = yrs.length;
        var slot = plotW / n;
        var barW = Math.max(1, Math.min(10, slot * 0.72));

        var bars = [], strip = [], seen = {};
        yrs.forEach(function (y2, i) {
          var x = PADL + slot * i + (slot - barW) / 2;
          var net2 = typeof y2.net === 'number' && isFinite(y2.net) ? y2.net : 0;
          var hgt = Math.abs(net2) / maxAbs * (plotH / 2);
          bars.push(h('rect', {
            key: 'b' + i, x: round(x, 2), width: round(barW, 2),
            y: round(net2 >= 0 ? y0 - hgt : y0, 2), height: round(Math.max(0.5, hgt), 2),
            fill: net2 >= 0 ? T.good : T.bad
          }));
          seen[y2.limiting] = true;
          strip.push(h('rect', {
            key: 's' + i, x: round(PADL + slot * i, 2), width: round(Math.max(0.5, slot - 1), 2),
            y: PADT + plotH + GAPY, height: STRIP, rx: 1.5,
            fill: tone(FACTOR_HUE(y2.limiting))
          }));
        });

        // "Water set the limit in 7 of 10 years" — the counts the summary already
        // keeps, said in one sentence next to the picture of the same thing.
        var domN = (sum2.limiterCounts && sum2.limiterCounts[sum2.dominantLimiter]) || 0;
        var countsLine = LIMIT_NAME[sum2.dominantLimiter]
          ? __alloT('stem.treelab.evidence_counts_pre', 'Limit, year by year — ')
            + LIMIT_NAME[sum2.dominantLimiter]
            + __alloT('stem.treelab.evidence_counts_mid', ' set it in ')
            + domN + ' / ' + sum2.yearsCompleted + ' ' + __alloT('stem.treelab.years', 'years')
          : '';

        var alt = __alloT('stem.treelab.evidence_alt', 'Trial evidence, year by year. Bars above the line are years the tree made more than it spent; bars below are deficit years. The strip underneath shows which factor limited each year. ')
          + countsLine;

        return h('div', { key: 'evidence', style: { marginBottom: 10 } }, [
          h('svg', {
            key: 'svg', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': alt,
            style: { width: '100%', height: 'auto', display: 'block', background: T.card, borderRadius: 8, border: '1px solid ' + T.border }
          }, [
            h('line', { key: 'zero', x1: PADL, y1: y0, x2: PADL + plotW, y2: y0, stroke: T.border, strokeWidth: 1 }),
            h('text', { key: 'ymax', x: PADL - 4, y: PADT + 6, textAnchor: 'end', style: { fontSize: '8.5px', fill: T.dim, fontVariantNumeric: 'tabular-nums' } }, '+' + round(maxAbs, 1)),
            h('text', { key: 'y0', x: PADL - 4, y: y0 + 3, textAnchor: 'end', style: { fontSize: '8.5px', fill: T.dim } }, '0'),
            h('text', { key: 'ymin', x: PADL - 4, y: PADT + plotH, textAnchor: 'end', style: { fontSize: '8.5px', fill: T.dim, fontVariantNumeric: 'tabular-nums' } }, '-' + round(maxAbs, 1)),
            h('g', { key: 'bars' }, bars),
            h('g', { key: 'strip' }, strip)
          ]),
          h('div', { key: 'cap', style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 11, color: T.dim, marginTop: 3, lineHeight: 1.45 } }, [
            h('span', { key: 'a' }, __alloT('stem.treelab.evidence_cap', 'Net carbon each year (kg C), above or below zero')),
            countsLine ? h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, countsLine) : null
          ])
        ]);
      }

      function experimentPanel() {
        var phase = experiment.phase;
        var stepIndex = phase === 'predict' ? 0 : (phase === 'ready' ? 1 : (phase === 'explain' ? 2 : -1));
        var canLock = !!experiment.prediction.limiter && !!experiment.prediction.outcome;
        var result = experiment.result && experiment.result.summary;
        var limitHit = !!result && experiment.prediction.limiter === result.dominantLimiter;
        var outcomeHit = !!result && experiment.prediction.outcome === result.observedOutcome;
        var predictionMatched = limitHit && outcomeHit;
        var predictionHalf = !!result && !predictionMatched && (limitHit || outcomeHit);
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
                : (predictionHalf
                  // Half right is its own result, and calling it a miss teaches that a
                  // prediction is one lump rather than separate claims that each stand
                  // or fall on their own evidence.
                  ? '◐ ' + __alloT('stem.treelab.prediction_half', 'You had one of the two right')
                  : '↺ ' + __alloT('stem.treelab.prediction_surprised', 'The evidence changed the story'))),
            h('p', { key: 'p', style: { margin: '0 0 9px', fontSize: 11, color: T.dim, lineHeight: 1.5 } },
              __alloT('stem.treelab.observed_summary', 'Compare predicted and observed results. A mismatch is useful evidence, not a wrong experiment.')),
            // "Compare predicted and observed results" was impossible to do here: the
            // prediction was displayed in the Ready phase and then disappeared at the
            // exact moment the student is asked to compare against it. Both sides are
            // now on screen together, per row, with the row marked where they differ —
            // and a prediction can be half right, which two summary states could not
            // express and this can.
            (function () {
              var pr = experiment.prediction;
              if (!pr || !pr.limiter || !pr.outcome) return null;
              var rows2 = [
                ['lim', __alloT('stem.treelab.limit_word', 'Limit'),
                  experimentFactorLabel(pr.limiter), experimentFactorLabel(result.dominantLimiter),
                  pr.limiter === result.dominantLimiter],
                ['out', __alloT('stem.treelab.outcome_word', 'Outcome'),
                  experimentOutcomeLabel(pr.outcome), experimentOutcomeLabel(result.observedOutcome),
                  pr.outcome === result.observedOutcome]
              ];
              return h('div', { key: 'vs', style: { marginBottom: 10, border: '1px solid ' + T.border, borderRadius: 9, overflow: 'hidden' } }, [
                h('div', { key: 'hd', style: { display: 'grid', gridTemplateColumns: '64px 1fr 1fr 22px', gap: 6, padding: '5px 8px', background: T.card, fontSize: 10, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: '.05em' } }, [
                  h('span', { key: 'a' }, ''),
                  h('span', { key: 'b' }, __alloT('stem.treelab.you_said', 'You said')),
                  h('span', { key: 'c' }, __alloT('stem.treelab.trial_showed', 'The trial showed')),
                  h('span', { key: 'd' }, '')
                ])
              ].concat(rows2.map(function (r2) {
                return h('div', {
                  key: r2[0],
                  style: {
                    display: 'grid', gridTemplateColumns: '64px 1fr 1fr 22px', gap: 6, alignItems: 'center',
                    padding: '6px 8px', fontSize: 12, borderTop: '1px solid ' + T.border,
                    background: r2[4] ? 'transparent' : (isContrast ? T.cardAlt : (isDark ? 'rgba(251,191,36,.08)' : 'rgba(251,191,36,.10)'))
                  }
                }, [
                  h('span', { key: 'l', style: { fontSize: 11, color: T.dim, fontWeight: 700 } }, r2[1]),
                  h('span', { key: 'p', style: { color: T.text } }, r2[2]),
                  h('span', { key: 'o', style: { color: T.text, fontWeight: r2[4] ? 400 : 700 } }, r2[3]),
                  h('span', { key: 'm', 'aria-hidden': 'true', style: { textAlign: 'right', fontWeight: 800, color: r2[4] ? T.good : T.warn } }, r2[4] ? '✓' : '↺')
                ]);
              })));
            })(),
            // What they wrote BEFORE running, brought back to be argued with.
            (experiment.prediction && (experiment.prediction.reason || '').trim())
              ? h('div', { key: 'because', style: { marginBottom: 10, padding: '6px 9px', borderRadius: 8, background: T.card, borderLeft: '3px solid ' + T.border, fontSize: 11, color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, [
                h('span', { key: 'l', style: { color: T.dim, fontWeight: 700 } }, __alloT('stem.treelab.you_reasoned', 'Before the run you wrote: ')),
                h('span', { key: 't' }, experiment.prediction.reason.trim())
              ])
              : null,
            h('div', { key: 'grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(125px,1fr))', gap: 7, marginBottom: 10 } }, [
              statTile('ol', __alloT('stem.treelab.observed_limit', 'Observed limit'), experimentFactorLabel(result.dominantLimiter), T.accent),
              statTile('oo', __alloT('stem.treelab.observed_outcome', 'Observed outcome'), experimentOutcomeLabel(result.observedOutcome), result.observedOutcome === 'die' ? T.bad : T.good),
              statTile('oh', __alloT('stem.treelab.height_change', 'Height change'), (result.heightDelta >= 0 ? '+' : '') + round(result.heightDelta, 2) + ' m', tone('#22c55e')),
              statTile('on', __alloT('stem.treelab.mean_net', 'Mean net carbon'), round(result.meanNet, 2) + ' kg C', result.meanNet >= 0 ? T.good : T.bad)
            ]),
            experimentEvidence(result, experiment.result.tree),
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
          // What the student PREDICTED, kept next to what happened. The record stored
          // it all along and only the live Explain step ever showed it, so a saved
          // trial lost the half of the investigation that makes it an investigation.
          // A miss is not marked wrong: it is marked as the thing worth explaining.
          (function () {
            var pr = trial.prediction;
            if (!pr || !pr.limiter || !pr.outcome) return null;
            // Same three states as the Explain step, so a trial does not change its
            // own verdict on the way into the notebook.
            var lHit = pr.limiter === sum.dominantLimiter, oHit = pr.outcome === sum.observedOutcome;
            var hit = lHit && oHit, half = !hit && (lHit || oHit);
            return h('div', {
              key: 'pred',
              style: {
                fontSize: 11, marginTop: 6, padding: '4px 7px', borderRadius: 6,
                background: T.card, border: '1px solid ' + (hit ? T.good : T.warn),
                color: T.dim, lineHeight: 1.45
              }
            }, [
              h('span', { key: 'k', style: { fontWeight: 700, color: hit ? T.good : T.warn } },
                (hit ? '✓ ' : (half ? '◐ ' : '↺ ')) + __alloT('stem.treelab.you_predicted', 'You predicted: ')),
              h('span', { key: 'v', style: { color: T.text } },
                experimentOutcomeLabel(pr.outcome) + ' · ' + experimentFactorLabel(pr.limiter))
            ]);
          })(),
          // The saved snapshot keeps the whole history, so each slot wears its own
          // year-by-year limiter strip — two strips side by side ARE the comparison.
          (function () {
            var tr2 = trial.result.tree;
            if (!tr2 || !Array.isArray(tr2.history) || sum.yearsCompleted <= 0) return null;
            var yrs2 = tr2.history.slice(-Math.min(sum.yearsCompleted, tr2.history.length));
            if (!yrs2.length) return null;
            return h('div', {
              key: 'strip', role: 'img',
              'aria-label': __alloT('stem.treelab.trial_strip_alt', 'Limiting factor, year by year: ')
                + yrs2.map(function (y2) { return LIMIT_NAME[y2.limiting] || y2.limiting; }).join(', '),
              style: { display: 'flex', gap: 1, height: 8, borderRadius: 4, overflow: 'hidden', margin: '7px 0 8px' }
            }, yrs2.map(function (y2, i) {
              return h('div', { key: i, style: { flex: '1 1 0', background: tone(FACTOR_HUE(y2.limiting)) } });
            }));
          })(),
          // The student's own words, kept. Writing an explanation into a box that
          // then swallows it teaches that the writing was busywork; a notebook that
          // holds the reasoning next to the evidence is the point of a notebook.
          // Scrolls rather than truncates — nobody's sentence gets cut mid-thought.
          (function () {
            var why = (trial.explanation || '').trim();
            if (!why) return null;
            return h('div', {
              key: 'why', 'data-trial-explanation': slot,
              style: {
                fontSize: 11, color: T.text, lineHeight: 1.5, marginBottom: 8,
                padding: '6px 8px', borderRadius: 6, background: T.card,
                borderLeft: '3px solid ' + T.accent, maxHeight: 78, overflowY: 'auto',
                whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'
              }
            }, [
              h('div', { key: 'l', style: { fontSize: 10, fontWeight: 700, color: T.dim, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.05em' } },
                __alloT('stem.treelab.your_explanation', 'Your explanation')),
              h('div', { key: 't' }, why)
            ]);
          })(),
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
          // "Controlled" used to mean only "same starting tree" — but a controlled
          // experiment is same start AND exactly one changed variable, and the
          // treatments were never inspected. Both are stored, so the panel now names
          // what changed between A and B: one change is the only case where the
          // difference column has a single cause. This is the whole scientific
          // method of the notebook, said at the moment it applies.
          var diffs = [];
          (function () {
            var ea = a.treatment.env, eb = b.treatment.env;
            function pctS(v) { return Math.round(v * 100) + '%'; }
            if (Math.abs(ea.light - eb.light) > 0.001) diffs.push(LIMIT_NAME.light + ' ' + pctS(ea.light) + ' → ' + pctS(eb.light));
            if (Math.abs(ea.soilWater - eb.soilWater) > 0.001) diffs.push(__alloT('stem.treelab.soil_water', 'Soil water') + ' ' + pctS(ea.soilWater) + ' → ' + pctS(eb.soilWater));
            if (Math.abs(ea.tempC - eb.tempC) > 0.001) diffs.push(LIMIT_NAME.temperature + ' ' + round(ea.tempC, 0) + ' → ' + round(eb.tempC, 0) + ' ' + DEG + 'C');
            if (Math.abs(ea.co2ppm - eb.co2ppm) > 0.5) diffs.push(CO2 + ' ' + Math.round(ea.co2ppm) + ' → ' + Math.round(eb.co2ppm) + ' ppm');
            // Without this line a drought-vs-no-drought pair would read as
            // "identical treatments" — the drought lives in env.droughtYears.
            if ((ea.droughtYears || []).join(',') !== ((eb.droughtYears || []).join(',')))
              diffs.push(__alloT('stem.treelab.diff_drought', 'Drought schedule'));
            var allocDiff = ['leaf', 'root', 'wood', 'repro', 'store'].some(function (k2) {
              return Math.abs((a.treatment.alloc[k2] || 0) - (b.treatment.alloc[k2] || 0)) > 0.001;
            });
            if (allocDiff) diffs.push(__alloT('stem.treelab.diff_alloc', 'Carbon allocation'));
            if (a.duration !== b.duration) diffs.push(__alloT('stem.treelab.trial_length', 'Trial length') + ' ' + a.duration + ' → ' + b.duration + ' ' + __alloT('stem.treelab.years', 'years'));
          })();
          var oneVariable = controlled && diffs.length === 1;
          var diffLine;
          if (!controlled) {
            diffLine = null;   // the start mismatch is the bigger problem; say only that
          } else if (diffs.length === 1) {
            diffLine = '✓ ' + __alloT('stem.treelab.one_variable', 'One variable changed: ') + diffs[0] + '. '
              + __alloT('stem.treelab.one_variable_note', 'Whatever differs in the evidence below, this change caused it.');
          } else if (diffs.length === 0) {
            diffLine = __alloT('stem.treelab.zero_variables', 'Identical treatments — the two trials should match, and every difference below should be zero.');
          } else {
            diffLine = '⚠ ' + diffs.length + ' ' + __alloT('stem.treelab.many_variables', 'things changed: ') + diffs.join(' · ') + '. '
              + __alloT('stem.treelab.many_variables_note', 'The differences below cannot be pinned on any one of them. Change one thing at a time.');
          }
          kids.push(h('div', {
            key: 'control', role: 'note',
            style: {
              padding: 9, borderRadius: 9,
              border: '1px solid ' + (controlled ? (oneVariable ? T.good : (diffs.length > 1 ? T.warn : T.border)) : T.warn),
              background: T.cardAlt, color: T.text, fontSize: 11, lineHeight: 1.5, marginBottom: 9
            }
          }, [
            h('div', { key: 'start' },
              controlled
                ? '✓ ' + __alloT('stem.treelab.controlled_pair', 'Controlled pair: both trials began with the same species, age and height.')
                : '⚠ ' + __alloT('stem.treelab.uncontrolled_pair', 'These trials began from different trees. Compare cautiously, or prepare Trial B from A.')),
            diffLine ? h('div', { key: 'vars', style: { marginTop: 4 } }, diffLine) : null
          ]));
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
            'aria-label': __alloT('stem.treelab.alt_rings_pre', 'Ring width for the last ') + rings.length + ' '
              + __alloT('stem.treelab.year_many', 'years') + '. '
              + __alloT('stem.treelab.alt_rings_widest', 'Widest ring ') + round(maxW, 2) + ' '
              + __alloT('stem.treelab.millimetres', 'millimetres') + '.'
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

      function chemStoryPanel() {
        var isK2Chem = band === 'k2';
        var limiterId = causeAwareLimiter(live) || 'light';
        var limiterLabel = experimentFactorLabel(limiterId);
        var inputs = [
          { id: 'light', icon: '\u2600\uFE0F', label: __alloT('stem.treelab.light', 'Light'), value: Math.round(liveEnv.light * 100) + '%' },
          { id: 'water', icon: '\uD83D\uDCA7', label: __alloT('stem.treelab.water', 'Water'), value: Math.round(liveEnv.soilWater * 100) + '%' },
          { id: 'co2', icon: '\uD83D\uDCA8', label: isK2Chem ? __alloT('stem.treelab.co2_from_air_k2', 'Carbon dioxide from air') : CO2, value: Math.round(liveEnv.co2ppm) + ' ppm' }
        ];
        return card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' }, isK2Chem
            ? __alloT('stem.treelab.leaf_kitchen_k2', 'Leaf kitchen')
            : __alloT('stem.treelab.chem_story_eyebrow', 'Live reaction')),
          heading(isK2Chem
              ? __alloT('stem.treelab.how_trees_eat', 'How a tree feeds itself')
              : __alloT('stem.treelab.chem_story_title', 'From sky to sugar'),
            isK2Chem
              ? __alloT('stem.treelab.k2_sub', 'A tree does not eat food from the soil. It builds its own, out of air, water and sunlight.')
              : __alloT('stem.treelab.chem_story_sub', 'Follow the live reaction: three inputs meet in the leaf, and the slowest usable input sets the pace.')),
          h('div', {
            key: 'reaction', className: 'allo-tree-reaction', role: 'group',
            'data-limiting-factor': isK2Chem ? undefined : limiterId,
            'aria-label': isK2Chem
              ? __alloT('stem.treelab.chem_story_alt_k2', 'Sunlight, water and carbon dioxide from the air enter a leaf. The leaf makes sugar and releases oxygen back to the air.')
              : __alloT('stem.treelab.chem_story_alt', 'Sunlight, water and carbon dioxide enter a leaf. The leaf produces sugar carbon and oxygen.')
          }, [
            h('div', { key: 'inputs', className: 'allo-tree-reaction-inputs' },
              inputs.map(function (item) {
                var setsPace = !isK2Chem && item.id === limiterId;
                return h('div', {
                  key: item.id, className: 'allo-tree-molecule' + (setsPace ? ' is-limiting' : ''),
                  style: { borderTop: '3px solid ' + tone(FACTOR_HUE(item.id)) }
                }, [
                  h('span', { key: 'i', className: 'allo-tree-molecule-icon', 'aria-hidden': 'true' }, item.icon),
                  h('span', { key: 'l', className: 'allo-tree-molecule-label' }, item.label),
                  h('strong', { key: 'v', className: 'allo-tree-molecule-value' }, item.value),
                  setsPace ? h('span', { key: 'b', className: 'allo-tree-pace-badge' }, __alloT('stem.treelab.sets_the_pace', 'Sets the pace')) : null
                ]);
              })),
            h('span', { key: 'a1', className: 'allo-tree-reaction-arrow', 'aria-hidden': 'true' }, ARROW),
            h('div', {
              key: 'engine',
              className: 'allo-tree-leaf-engine' + (!isK2Chem && limiterId === 'temperature' ? ' is-limiting' : '')
            }, [
              h('span', { key: 'leaf', className: 'allo-tree-leaf-orbit', 'aria-hidden': 'true' }, '\uD83C\uDF43'),
              h('span', { key: 'k', className: 'allo-tree-engine-kicker' }, isK2Chem
                ? __alloT('stem.treelab.inside_leaf_k2', 'Inside a leaf')
                : __alloT('stem.treelab.leaf_engine', 'Leaf engine')),
              h('strong', { key: 'n', className: 'allo-tree-engine-name' }, isK2Chem
                ? __alloT('stem.treelab.make_tree_food_k2', 'Makes tree food')
                : __alloT('stem.treelab.photosynthesis', 'Photosynthesis')),
              h('span', { key: 's', className: 'allo-tree-engine-setting' },
                (isK2Chem ? __alloT('stem.treelab.warmth_k2', 'Warmth') : __alloT('stem.treelab.temperature', 'Temperature')) + ' \u00B7 ' + round(liveEnv.tempC, 0) + ' ' + DEG + 'C'),
              !isK2Chem && limiterId === 'temperature'
                ? h('span', { key: 'b', className: 'allo-tree-pace-badge' }, __alloT('stem.treelab.sets_the_pace', 'Sets the pace'))
                : null
            ]),
            h('span', { key: 'a2', className: 'allo-tree-reaction-arrow', 'aria-hidden': 'true' }, ARROW),
            h('div', { key: 'outputs', className: 'allo-tree-reaction-outputs' }, [
              h('div', { key: 'sugar', className: 'allo-tree-molecule' }, [
                h('span', { key: 'i', className: 'allo-tree-molecule-icon', 'aria-hidden': 'true' }, '\uD83C\uDF6F'),
                h('span', { key: 'l', className: 'allo-tree-molecule-label' }, isK2Chem ? __alloT('stem.treelab.sugar_k2', 'Sugar') : __alloT('stem.treelab.sugar_carbon', 'Sugar carbon')),
                h('strong', { key: 'v', className: 'allo-tree-molecule-value' }, isK2Chem ? __alloT('stem.treelab.food_for_growing_k2', 'Food for growing') : round(live.gross, 2) + ' kg C/year')
              ]),
              h('div', { key: 'oxygen', className: 'allo-tree-molecule' }, [
                h('span', { key: 'i', className: 'allo-tree-molecule-icon', 'aria-hidden': 'true' }, O2),
                h('span', { key: 'l', className: 'allo-tree-molecule-label' }, __alloT('stem.treelab.oxygen_output', 'Oxygen')),
                h('strong', { key: 'v', className: 'allo-tree-molecule-value' }, isK2Chem ? __alloT('stem.treelab.back_to_air_k2', 'Back to the air') : __alloT('stem.treelab.released_to_air', 'Released to air'))
              ])
            ])
          ]),
          h('div', { key: 'verdict', className: 'allo-tree-story-verdict', style: { borderLeftColor: tone(FACTOR_HUE(limiterId)) } }, [
            h('span', { key: 'l', className: 'allo-tree-story-verdict-label' }, isK2Chem ? __alloT('stem.treelab.follow_food_k2', 'Follow the food') : __alloT('stem.treelab.bottleneck_now', 'Bottleneck right now')),
            h('strong', { key: 'v' }, isK2Chem ? __alloT('stem.treelab.sugar_moves_k2', 'Sugar moves through the tree') : limiterLabel),
            h('span', { key: 'c', className: 'allo-tree-story-verdict-copy' }, isK2Chem
              ? __alloT('stem.treelab.k2_body', 'The tree uses sugar to build leaves, roots, wood, and seeds. Much of the trunk began as carbon dioxide in the air.')
              : __alloT('stem.treelab.bottleneck_explain', 'The reaction can only run as fast as its scarcest usable input.'))
          ])
        ], undefined, 'allo-tree-chem-story' + (isK2Chem ? ' allo-tree-chem-k2' : ''));
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
          var limiting = causeAwareLimiter(live) === c.id;
          var hue = tone(FACTOR_HUE(c.id));
          var sx = function (x) { return PADL + PW * ((x - c.min) / (c.max - c.min)); };
          var sy = function (y) { return PADT + PH * (1 - clamp(y / yMax, 0, 1)); };
          var line = s2.pts.map(function (p, i) {
            return (i ? 'L' : 'M') + round(sx(p.x), 1) + ' ' + round(sy(p.y), 1);
          }).join(' ');
          var area = line + ' L' + round(sx(c.max), 1) + ' ' + (PADT + PH) + ' L' + round(sx(c.min), 1) + ' ' + (PADT + PH) + ' Z';
          var atX = clamp(c.at, c.min, c.max);
          var here = { x: sx(atX), y: sy(live.gross) };
          // The best this factor could do ALONE, from the same sweep the curve is
          // drawn from — for the saturating curves that is the right end, for
          // temperature it is the optimum, never the (lethal) maximum.
          var peakPt = s2.pts[0] || { x: c.min, y: 0 };
          s2.pts.forEach(function (p) { if (p.y > peakPt.y) peakPt = p; });
          var headroom = Math.max(0, peakPt.y - live.gross);
          // Annotate only a gap worth acting on, and never on top of the here-dot:
          // when the dot sits at the peak the headroom IS the flatness being shown.
          var peakX = sx(peakPt.x), peakY = sy(peakPt.y);
          var showHeadroom = tree.alive && headroom > yMax * 0.04
            && (Math.abs(peakX - here.x) > 26 || Math.abs(peakY - here.y) > 16);

          return h('div', {
            key: c.id,
            className: 'allo-tree-curve-panel' + (limiting ? ' is-limiting' : ''),
            style: { borderColor: limiting ? hue : T.border, borderTopColor: hue }
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
                            : '. Raising this alone would not lift the rate, because something else is smaller.'))
                + (showHeadroom
                  ? ' ' + __alloT('stem.treelab.curve_alt_headroom', 'At its best value this factor alone would add ')
                    + round(headroom, 2) + ' kg C.'
                  : ''),
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
              showHeadroom ? h('g', { key: 'head' }, [
                h('circle', {
                  key: 'pk', cx: peakX, cy: peakY, r: 2.8,
                  fill: 'none', stroke: hue, strokeWidth: 1.4
                }),
                h('text', {
                  key: 'tx',
                  x: peakX > PADL + PW * 0.6 ? peakX - 7 : peakX + 7,
                  y: clamp(peakY + 4, PADT + 10, PADT + PH - 4),
                  textAnchor: peakX > PADL + PW * 0.6 ? 'end' : 'start',
                  style: { fontSize: '10px', fontWeight: 700, fill: T.text }
                }, '+' + round(headroom, 2) + ' kg C')
              ]) : null,
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
          h('div', { key: 'key', className: 'allo-tree-curve-key', 'aria-label': __alloT('stem.treelab.curve_key_label', 'How to read the response curves') }, [
            h('span', { key: 'now' }, [h('i', { key: 'm', className: 'allo-tree-curve-mark is-now', 'aria-hidden': 'true' }), __alloT('stem.treelab.curve_key_now', 'your tree now')]),
            h('span', { key: 'best' }, [h('i', { key: 'm', className: 'allo-tree-curve-mark is-best', 'aria-hidden': 'true' }), __alloT('stem.treelab.curve_key_best', 'best result from changing only this factor')]),
            h('span', { key: 'flat' }, [h('i', { key: 'm', className: 'allo-tree-curve-mark is-flat', 'aria-hidden': 'true' }), __alloT('stem.treelab.curve_key_flat', 'flat means something else is limiting')]),
            h('span', { key: 'up' }, [h('i', { key: 'm', className: 'allo-tree-curve-mark is-up', 'aria-hidden': 'true' }, '\u2191'), __alloT('stem.treelab.curve_key_up', 'higher means more sugar made')])
          ]),
          h('div', { key: 'grid', className: 'allo-tree-curve-grid' }, series.map(panel)),
          h('p', { key: 'read', style: { fontSize: 12, color: T.text, lineHeight: 1.55, marginTop: 10 } },
            live.limiting && live.limiting.viaStomata
              ? __alloT('stem.treelab.curves_read_stomata',
                'Look at the ' + CO2 + ' panel and the water panel together. ' + CO2 + ' is the smaller number, but the reason is that drought has closed the stomata that let it in — which is why the water panel is the one marked.')
              : __alloT('stem.treelab.curves_read',
                'The flat panels are the ones where this tree already has more than it can use. The marked one is where the next improvement would actually come from.')),
          modelNote(__alloT('stem.treelab.curves_note',
            'Every point on every curve is the model’s own annual figure for this tree, re-run with that one input changed — not a sketch of the shape. The shapes are the standard ones (a saturating light response, a saturating ' + CO2 + ' response, a temperature optimum), and the magnitudes are the right order for a temperate tree, but no figure here should be quoted as data.'))
        ], undefined, 'allo-tree-curves-card');
      }

      function viewChem() {
        var kids = [];
        if (!tree.alive) {
          var stoppedTitle = band === 'k2'
            ? __alloT('stem.treelab.photosynthesis_stopped_k2', 'This tree has stopped making food')
            : __alloT('stem.treelab.photosynthesis_stopped', 'Photosynthesis has stopped');
          var stoppedCopy = band === 'k2'
            ? __alloT('stem.treelab.photosynthesis_stopped_copy_k2', 'Its leaves can no longer use sunlight, water, and air to make sugar. Start a new seedling to watch the leaf kitchen work again.')
            : __alloT('stem.treelab.photosynthesis_stopped_copy', 'After a tree dies, its leaves no longer exchange gases or add sugar to the carbon budget. The response curves and bottleneck only describe a living tree, so they pause here.');
          var stoppedSteps = band === 'k2' ? [
            { title: __alloT('stem.treelab.stopped_leaf_k2', 'Leaves stop working'), copy: __alloT('stem.treelab.stopped_leaf_copy_k2', 'No new sugar is made.') },
            { title: __alloT('stem.treelab.stopped_budget_k2', 'The food path ends'), copy: __alloT('stem.treelab.stopped_budget_copy_k2', 'No new food reaches growing parts.') },
            { title: __alloT('stem.treelab.stopped_restart_k2', 'Begin a new life story'), copy: __alloT('stem.treelab.stopped_restart_copy_k2', 'A seedling can start the cycle again.') }
          ] : [
            { title: __alloT('stem.treelab.stopped_exchange', 'Gas exchange stops'), copy: __alloT('stem.treelab.stopped_exchange_copy', 'Stomata no longer regulate carbon dioxide and water.') },
            { title: __alloT('stem.treelab.stopped_carbon', 'Carbon income becomes zero'), copy: __alloT('stem.treelab.stopped_carbon_copy', 'No photosynthetic sugar enters the annual budget.') },
            { title: __alloT('stem.treelab.stopped_model', 'The living model pauses'), copy: __alloT('stem.treelab.stopped_model_copy', 'A limiter is meaningful only while photosynthesis is running.') }
          ];
          return [card([
            h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' }, __alloT('stem.treelab.life_cycle_boundary', 'Life-cycle boundary')),
            h('div', { key: 'scene', className: 'allo-tree-stopped-scene' }, [
              h('div', { key: 'mark', className: 'allo-tree-stopped-mark', 'aria-hidden': 'true' }, '\uD83C\uDF42'),
              h('div', { key: 'copy', className: 'allo-tree-stopped-copy' }, [
                heading(stoppedTitle, stoppedCopy),
                h('p', { key: 'why' }, tree.causeOfDeath === 'senescence'
                  ? __alloT('stem.treelab.stopped_old_age', 'This tree reached the end of its modelled lifespan. Nothing went wrong; every individual tree has a finite life.')
                  : __alloT('stem.treelab.stopped_starvation', 'This tree ran out of usable carbon. Its stored history remains evidence for planning the next run.'))
              ])
            ]),
            h('div', { key: 'chain', className: 'allo-tree-stopped-chain', 'aria-label': __alloT('stem.treelab.stopped_sequence', 'What changes when photosynthesis stops') }, stoppedSteps.map(function (step, i) {
              return h('div', { key: i, className: 'allo-tree-stopped-step' }, [
                h('strong', { key: 't' }, (i + 1) + '. ' + step.title),
                h('span', { key: 'c' }, step.copy)
              ]);
            })),
            h('div', { key: 'actions', className: 'allo-tree-stopped-actions' },
              btn('new-seedling', __alloT('stem.treelab.new_seedling', 'Start a new seedling'), function () { resetTree(sp.id); }, { primary: true }))
          ], undefined, 'allo-tree-chem-stopped')];
        }
        var chemLimiterId = causeAwareLimiter(live) || 'light';
        var chemLimiterLabel = experimentFactorLabel(chemLimiterId);
        if (!atLeast(band, 'g35')) {
          kids.push(chemStoryPanel());
          kids.push(scienceTrail('chem', __alloT('stem.treelab.chem_reasoning_k2', 'Follow what a leaf does'), [
            { title: __alloT('stem.treelab.chem_notice_k2', 'A leaf gathers three things'), copy: __alloT('stem.treelab.chem_notice_copy_k2', 'Sunlight, water, and carbon dioxide from air meet inside the leaf.') },
            { title: __alloT('stem.treelab.chem_guess_k2', 'Less of one means less food'), copy: __alloT('stem.treelab.chem_guess_copy_k2', 'If one need runs low, guess that the leaf will make less sugar.') },
            { title: __alloT('stem.treelab.chem_explain_k2', 'Sugar becomes new tree parts'), copy: __alloT('stem.treelab.chem_explain_copy_k2', 'The sugar helps build roots, leaves, wood, flowers, and seeds.') }
          ]));
          return kids;
        }

        // The same reasoning rhythm now connects the reaction picture to the response
        // curves: notice the live constraint, predict one controlled change, then use
        // the curve shape to explain why the rate did or did not move.
        kids.push(chemStoryPanel());
        kids.push(scienceTrail('chem', __alloT('stem.treelab.chem_reasoning', 'Turn the live reaction into a testable explanation'), [
          { title: chemLimiterLabel + ' ' + __alloT('stem.treelab.sets_pace_now', 'sets the pace now'), copy: __alloT('stem.treelab.chem_observe_copy', 'The marked input matches the smallest usable factor. This tree is making ') + round(live.gross, 2) + ' kg C/year.' },
          { title: __alloT('stem.treelab.change_bottleneck', 'Change the bottleneck first'), copy: __alloT('stem.treelab.chem_predict_copy', 'Raise ') + chemLimiterLabel + __alloT('stem.treelab.chem_predict_copy_2', '; the dot should climb until a different factor becomes smallest.') },
          { title: __alloT('stem.treelab.scarce_sets_rate', 'Extra supply cannot replace what is scarce'), copy: __alloT('stem.treelab.chem_explain_copy', 'Use the marked response curve as evidence, then change just one condition in Grow to test the prediction.') }
        ]));
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
        ], undefined, 'allo-tree-chem-limits'));

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
          ], undefined, 'allo-tree-chem-trade'));
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
          ], undefined, 'allo-tree-chem-bill'));
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
        srSay(__alloT('stem.treelab.say_opening', 'Opening ') + labelTxt + '.');
        if (addToast) addToast(__alloT('stem.treelab.say_opening', 'Opening ') + labelTxt, 'info');
      }

      function transportPath(kind) {
        var isXylem = kind === 'xylem';
        var springDraw = season === 'spring';
        var winterRest = season === 'winter';
        var winterBare = winterRest && sp.leafType !== 'needle';
        var autumnStore = season === 'autumn';
        var steps = isXylem ? (winterBare ? [
          { icon: '\uD83C\uDF31', label: __alloT('stem.treelab.roots', 'Roots'), note: __alloT('stem.treelab.route_uptake_slows', 'Uptake slows') },
          { icon: '\uD83D\uDCA7', label: __alloT('stem.treelab.xylem', 'Xylem'), note: __alloT('stem.treelab.route_column_rests', 'Water column rests') },
          { icon: '\uD83C\uDF33', label: __alloT('stem.treelab.bare_crown', 'Bare crown'), note: __alloT('stem.treelab.route_no_leaf_pull', 'No leaf pull') }
        ] : (winterRest ? [
          { icon: '\u2744\uFE0F', label: __alloT('stem.treelab.frozen_soil', 'Frozen soil'), note: __alloT('stem.treelab.route_uptake_limited', 'Uptake is limited') },
          { icon: '\uD83D\uDCA7', label: __alloT('stem.treelab.xylem', 'Xylem'), note: __alloT('stem.treelab.route_flow_very_slow', 'Very slow flow') },
          { icon: '\uD83C\uDF32', label: __alloT('stem.treelab.needles', 'Needles'), note: __alloT('stem.treelab.route_stomata_shut', 'Stomata mostly shut') }
        ] : [
          { icon: '\uD83C\uDF31', label: __alloT('stem.treelab.roots', 'Roots'), note: __alloT('stem.treelab.route_absorb', 'Absorb from soil') },
          { icon: '\uD83D\uDCA7', label: __alloT('stem.treelab.xylem', 'Xylem'), note: __alloT('stem.treelab.route_carries_up', 'Carries upward') },
          { icon: '\uD83C\uDF43', label: __alloT('stem.treelab.leaves', 'Leaves'), note: __alloT('stem.treelab.route_evap_pull', 'Evaporation pulls') }
        ])) : (springDraw ? [
          { icon: '\uD83C\uDF30', label: __alloT('stem.treelab.reserves', 'Stored reserves'), note: __alloT('stem.treelab.source', 'Source') },
          { icon: '\u21C5', label: __alloT('stem.treelab.phloem', 'Phloem'), note: __alloT('stem.treelab.route_moves_sugar', 'Moves sugar') },
          { icon: '\uD83C\uDF43', label: __alloT('stem.treelab.new_leaves', 'New leaves'), note: __alloT('stem.treelab.sink', 'Sink') }
        ] : (winterRest ? [
          { icon: '\uD83C\uDF30', label: __alloT('stem.treelab.reserves', 'Stored reserves'), note: __alloT('stem.treelab.source', 'Source') },
          { icon: '\u21C5', label: __alloT('stem.treelab.phloem', 'Phloem'), note: __alloT('stem.treelab.route_moves_sugar', 'Moves sugar') },
          { icon: '\u2744\uFE0F', label: __alloT('stem.treelab.living_tissues', 'Living tissues'), note: __alloT('stem.treelab.maintenance_sinks', 'Maintenance sinks') }
        ] : (autumnStore ? [
          { icon: '\uD83C\uDF42', label: __alloT('stem.treelab.leaves', 'Leaves'), note: __alloT('stem.treelab.source', 'Source') },
          { icon: '\u21C5', label: __alloT('stem.treelab.phloem', 'Phloem'), note: __alloT('stem.treelab.route_moves_sugar', 'Moves sugar') },
          { icon: '\uD83C\uDF30', label: __alloT('stem.treelab.roots_trunk', 'Roots + trunk'), note: __alloT('stem.treelab.storage_sinks', 'Storage sinks') }
        ] : [
          { icon: '\uD83C\uDF43', label: __alloT('stem.treelab.leaves', 'Leaves'), note: __alloT('stem.treelab.source', 'Source') },
          { icon: '\u21C5', label: __alloT('stem.treelab.phloem', 'Phloem'), note: __alloT('stem.treelab.route_moves_sugar', 'Moves sugar') },
          { icon: '\uD83C\uDF32', label: __alloT('stem.treelab.growth_roots', 'Growth + roots'), note: __alloT('stem.treelab.sinks', 'Sinks') }
        ])));
        var route = [];
        steps.forEach(function (step, i) {
          route.push(h('div', { key: 'n' + i, className: 'allo-tree-pipe-node' }, [
            h('span', { key: 'i', className: 'allo-tree-pipe-icon', 'aria-hidden': 'true' }, step.icon),
            h('strong', { key: 'l', className: 'allo-tree-pipe-label' }, step.label),
            h('span', { key: 'n', className: 'allo-tree-pipe-note' }, step.note)
          ]));
          if (i < steps.length - 1) route.push(h('span', { key: 'a' + i, className: 'allo-tree-pipe-arrow', 'aria-hidden': 'true' }, ARROW));
        });
        var phloemAlt = springDraw
          ? __alloT('stem.treelab.phloem_route_spring_alt', 'Sugar route right now: stored reserves to phloem to new leaves.')
          : (winterRest
            ? __alloT('stem.treelab.phloem_route_winter_alt', 'Winter sugar route: stored reserves through phloem to living tissues.')
            : (autumnStore
              ? __alloT('stem.treelab.phloem_route_autumn_alt', 'Autumn sugar route: leaves through phloem to storage in roots and trunk.')
              : __alloT('stem.treelab.phloem_route_summer_alt', 'Sugar route right now: leaves to phloem to growing tissues and roots.')));
        return h('div', {
          key: 'route',
          className: 'allo-tree-pipe-path ' + (isXylem ? 'is-xylem' : 'is-phloem'),
          role: 'group',
          'aria-label': isXylem
            ? (winterBare
              ? __alloT('stem.treelab.xylem_route_winter_bare_alt', 'Winter water route: root uptake slows, the xylem column rests, and the bare crown has no leaf pull.')
              : (winterRest
                ? __alloT('stem.treelab.xylem_route_winter_needle_alt', 'Winter water route: frozen soil limits uptake, xylem flow is very slow, and needle stomata are mostly shut.')
                : __alloT('stem.treelab.xylem_route_alt', 'Water route: roots absorb, xylem carries upward, and evaporation at leaves provides the pull.')))
            : phloemAlt
        }, route);
      }

      function sinkRows() {
        var rows = [
          ['leaf', __alloT('stem.treelab.leaves', 'Leaves'), alloc.leaf, '#22c55e'],
          ['root', __alloT('stem.treelab.roots', 'Roots'), alloc.root, '#a16207'],
          ['wood', __alloT('stem.treelab.wood', 'Wood (height and rings)'), alloc.wood, '#f59e0b'],
          ['repro', __alloT('stem.treelab.reproduction', 'Reproduction'), alloc.repro, '#ec4899'],
          ['store', __alloT('stem.treelab.reserves', 'Stored reserves'), alloc.store, '#38bdf8']
        ];
        var surplus = Math.max(0, liveNet);
        if (surplus <= 0) {
          return h('div', { key: 'deficit', className: 'allo-tree-sink-deficit', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.bad, borderLeft: '4px solid ' + T.bad } }, [
            h('div', { key: 'a', style: { fontWeight: 700, color: T.text, fontSize: 13 } },
              __alloT('stem.treelab.no_annual_surplus', 'No whole-year surplus to divide')),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 1.55 } },
              __alloT('stem.treelab.no_annual_surplus_note', 'Across the modelled year, the tree spends more than it makes. Stored sugar covers the deficit, so the annual growth plan pauses until carbon income returns. Sinks become the source.'))
          ]);
        }
        return h('div', { key: 'sinks', className: 'allo-tree-sink-list' }, [
          h('div', { key: 'src', className: 'allo-tree-source-card', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '4px solid ' + tone('#22c55e'), marginBottom: 8 } }, [
            h('div', { key: 'a', style: { fontWeight: 700, color: T.text, fontSize: 13 } },
              __alloT('stem.treelab.annual_source', 'Whole-year source: canopy photosynthesis')),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 1.5 } },
              round(surplus, 2) + ' kg C ' + __alloT('stem.treelab.annual_surplus_to_divide', 'of annual surplus to divide among five destinations'))
          ]),
          h('div', { key: 'rows', className: 'allo-tree-sink-rows' }, rows.map(function (r) {
            var share = r[2];
            return h('div', { key: r[0], className: 'allo-tree-sink-row', style: { marginBottom: 7 } }, [
              h('div', { key: 'l', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 3 } }, [
                h('span', { key: 'a', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
                  h('span', { key: 's', style: { width: 9, height: 9, borderRadius: 2, background: tone(r[3]), display: 'inline-block', border: isContrast ? '1px solid ' + T.text : 'none' } }),
                  r[1]
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

        // Numbered leader lines from the disc to the legend, because three of the five
        // layers are under 8 units wide: a swatch-only legend left the reader to find
        // a 2-unit green ring by eye. Numbers, not text, inside the SVG — the labels
        // are localized strings and belong in HTML. All five anchor dots sit on one
        // ray (up-right, 40°), so the fan to the vertically-ordered badges cannot
        // self-cross: sources are ordered along a line, targets along another.
        var outsideIn = layers.slice().reverse();   // bark, phloem, cambium, sap, heart
        var anchorR = {
          bark: R - barkW / 2,
          phloem: woodR + cambiumW + phloemW / 2,
          cambium: woodR + cambiumW / 2,
          sap: (heartR + woodR) / 2,
          heart: Math.max(2.5, heartR / 2)
        };
        var UX = 0.766, UY = -0.643;                // cos/sin of the anchor ray
        var BADGE_X = 106, BADGE_Y = [-64, -36, -8, 20, 48];
        var callouts = [];
        outsideIn.forEach(function (L, i) {
          var ar = anchorR[L[0]];
          var ax = round(UX * ar, 1), ay = round(UY * ar, 1);
          var by = BADGE_Y[i];
          callouts.push(h('g', { key: 'co' + L[0], 'aria-hidden': 'true' }, [
            h('line', {
              key: 'ln', x1: ax, y1: ay, x2: BADGE_X - 9, y2: by,
              stroke: T.dim, strokeWidth: 0.8, strokeOpacity: 0.8
            }),
            // In high contrast the number carries the mapping and every ring goes to
            // the text colour: a #555 ring on black fails the 3:1 graphics minimum.
            h('circle', { key: 'dt', cx: ax, cy: ay, r: 2.2, fill: L[2], stroke: isContrast ? T.text : T.card, strokeWidth: 1 }),
            h('circle', { key: 'bg', cx: BADGE_X, cy: by, r: 8, fill: T.card, stroke: isContrast ? T.text : L[2], strokeWidth: 1.6 }),
            h('text', {
              key: 'n', x: BADGE_X, y: by + 3.4, textAnchor: 'middle',
              style: { fontSize: '9.5px', fontWeight: 700, fill: T.text }
            }, String(i + 1))
          ]));
        });

        return h('div', { key: 'xs', className: 'allo-tree-trunk-section' }, [
          h('div', { key: 'wrap', style: { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' } }, [
            h('svg', {
              key: 'svg', viewBox: '-84 -84 204 168',
              style: { width: '100%', maxWidth: 250, flex: '1 1 210px', background: T.cardAlt, borderRadius: 10, border: '1px solid ' + T.border },
              role: 'img',
              'aria-label': __alloT('stem.treelab.xs_alt', 'Cross-section of the trunk. From the outside in: bark, phloem, cambium, sapwood, heartwood. ')
                + round(tree.dbhCm, 1) + ' ' + __alloT('stem.treelab.cm_across', 'cm across') + ', '
                + (tree.rings || []).length + ' ' + __alloT('stem.treelab.alt_growth_rings', 'growth rings') + ', '
                + round(tree.heartwoodMass, 1) + ' ' + __alloT('stem.treelab.alt_kgc_heartwood', 'kg of carbon in dead heartwood.')
            },
              // Outermost first, so each inner layer paints over the one before it.
              layers.slice().reverse().map(function (L) {
                return h('circle', { key: L[0], cx: 0, cy: 0, r: L[1], fill: L[2] });
              }).concat(ringEls).concat(callouts)),
            h('div', { key: 'key', style: { flex: '1 1 190px', minWidth: 170 } },
              outsideIn.map(function (L, i) {
                return h('div', { key: L[0], style: { display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5, fontSize: 11, color: T.dim, lineHeight: 1.45 } }, [
                  h('span', {
                    key: 's',
                    style: {
                      width: 16, height: 16, borderRadius: '50%', flex: '0 0 auto',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid ' + (isContrast ? T.text : L[2]), color: T.text, background: T.card,
                      fontSize: 9, fontWeight: 700
                    }
                  }, String(i + 1)),
                  h('span', { key: 't' }, L[3])
                ]);
              }))
          ]),
          rings.length ? h('p', { key: 'rn', style: { fontSize: 11, color: T.dim, lineHeight: 1.5, marginTop: 8 } },
            __alloT('stem.treelab.xs_rings_note', 'The rings are this tree’s own record, newest at the outside. Red rings are years it spent more than it made.')) : null
        ]);
      }

      function girdlingSequence() {
        var steps = [
          { title: __alloT('stem.treelab.girdle_step_water', 'Water still rises'), copy: __alloT('stem.treelab.girdle_step_water_copy', 'The deeper xylem stays intact.') },
          { title: __alloT('stem.treelab.girdle_step_sugar', 'Sugar route breaks'), copy: __alloT('stem.treelab.girdle_step_sugar_copy', 'The shallow phloem ring is removed.') },
          { title: __alloT('stem.treelab.girdle_step_roots', 'Roots starve first'), copy: __alloT('stem.treelab.girdle_step_roots_copy', 'The crown dies later, after the roots fail.') }
        ];
        return h('div', {
          key: 'chain', className: 'allo-tree-consequence', role: 'group',
          'aria-label': __alloT('stem.treelab.girdle_sequence_alt', 'What happens after a complete ring of bark is removed')
        }, steps.map(function (step, i) {
          return h('div', { key: i, className: 'allo-tree-consequence-step' }, [
            h('span', { key: 'n', className: 'allo-tree-consequence-number' }, String(i + 1)),
            h('div', { key: 't', className: 'allo-tree-consequence-title' }, step.title),
            h('div', { key: 'c', className: 'allo-tree-consequence-copy' }, step.copy)
          ]);
        }));
      }


      function viewTransport() {
        var kids = [];
        var flowUp = Math.round(aperture * 100);
        var winterRest = season === 'winter';
        var winterBare = winterRest && sp.leafType !== 'needle';
        var sugarSource = season === 'spring' || winterRest
          ? __alloT('stem.treelab.stored_reserves_short', 'stored reserves')
          : __alloT('stem.treelab.leaves_lower', 'leaves');
        var sugarDestination = season === 'spring'
          ? __alloT('stem.treelab.new_leaves_lower', 'new leaves')
          : (winterRest
            ? __alloT('stem.treelab.living_tissues_lower', 'living tissues')
            : (season === 'autumn'
              ? __alloT('stem.treelab.roots_trunk_lower', 'roots and trunk')
              : __alloT('stem.treelab.growing_parts_lower', 'growing parts and roots')));
        kids.push(card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' }, __alloT('stem.treelab.transport_story_eyebrow', 'Trace the flow')),
          heading(__alloT('stem.treelab.two_pipes', 'Two separate plumbing systems'),
            __alloT('stem.treelab.two_pipes_sub', 'Water goes up one way. Sugar goes from a source to wherever it is needed by another. Change the season and watch that sugar direction switch.')),
          seasonRow(),
          h('div', { key: 'g', className: 'allo-tree-pipe-grid' }, [
            h('div', { key: 'x', className: 'allo-tree-pipe-card is-xylem', style: { borderLeftColor: tone('#38bdf8') } }, [
              h('h3', { key: 'h', className: 'allo-tree-pipe-heading' }, '\u2191 ' + (atLeast(band, 'g68') ? __alloT('stem.treelab.xylem', 'Xylem') : __alloT('stem.treelab.water_pipes', 'Water pipes'))),
              h('div', { key: 'b', style: { fontSize: 12, color: T.dim, lineHeight: 1.55 } },
                winterBare
                  ? __alloT('stem.treelab.xylem_winter_bare', 'A leafless broadleaf is dormant. Root uptake slows, the xylem water column largely rests, and there is almost no crown evaporation to pull it upward.')
                  : (winterRest
                    ? __alloT('stem.treelab.xylem_winter_needles', 'Needles remain, but frozen soil limits water uptake and their stomata stay mostly shut. Deep-winter xylem flow is very low.')
                    : (atLeast(band, 'g912')
                      ? __alloT('stem.treelab.xylem_g912', 'Dead, hollow cells. Water is pulled up under tension by evaporation at the leaf surface, not pushed from below. The column is under negative pressure and an air bubble can break it.')
                      : (atLeast(band, 'g68')
                        ? __alloT('stem.treelab.xylem_g68', 'Dead hollow cells carrying water up from the roots. Evaporation at the leaves does the pulling.')
                        : __alloT('stem.treelab.xylem_k2', 'Carries water up from the roots to the leaves.'))))),
              transportPath('xylem'),
              winterRest ? h('div', { key: 'winter', className: 'allo-tree-winter-flow' }, [
                h('span', { key: 'i', className: 'allo-tree-winter-flow-icon', 'aria-hidden': 'true' }, '\u2744\uFE0F'),
                h('span', { key: 'c' }, [
                  h('strong', { key: 't' }, __alloT('stem.treelab.winter_flow_low', 'Winter flow is very low')),
                  h('span', { key: 'p' }, winterBare
                    ? __alloT('stem.treelab.winter_flow_bare_copy', 'No leaves means almost no evaporation pull in the crown.')
                    : __alloT('stem.treelab.winter_flow_needle_copy', 'Needles remain, but frozen soil and mostly closed stomata sharply limit movement.'))
                ])
              ]) : h('div', { key: 'm', style: { marginTop: 8 } }, bar(__alloT('stem.treelab.modelled_daily_flow', 'Modelled daily flow'), aperture, tone('#38bdf8'),
                fmtInt(Math.round(transpirationPerDay)) + ' ' + __alloT('stem.treelab.litres_day', 'litres a day') + ' \u00B7 ' + flowUp + '%')),
              inDrought && atLeast(band, 'g912') ? h('div', { key: 'cav', style: { marginTop: 6, fontSize: 11, color: T.warn, lineHeight: 1.5 } },
                __alloT('stem.treelab.tension_note', 'Under drought the column is pulled harder against a drier soil. Push the tension far enough and an air bubble breaks the thread, and that segment of xylem never carries water again.')) : null
            ]),
            h('div', { key: 'p', className: 'allo-tree-pipe-card is-phloem', style: { borderLeftColor: tone('#f59e0b') } }, [
              h('h3', { key: 'h', className: 'allo-tree-pipe-heading' }, '\u21C5 ' + (atLeast(band, 'g68') ? __alloT('stem.treelab.phloem', 'Phloem') : __alloT('stem.treelab.sugar_pipes', 'Sugar pipes'))),
              h('div', { key: 'b', style: { fontSize: 12, color: T.dim, lineHeight: 1.55 } },
                atLeast(band, 'g912')
                  ? __alloT('stem.treelab.phloem_g912', 'Living cells moving sugar from any SOURCE to any SINK. Direction is not fixed: in autumn sugar runs down to the roots, and in early spring it runs back up to build leaves before there are leaves to make it.')
                  : (atLeast(band, 'g68')
                    ? __alloT('stem.treelab.phloem_g68', 'Living cells carrying sugar from where it is made or stored to where it is spent. Its direction changes with the source and sink.')
                    : __alloT('stem.treelab.phloem_k2', 'Carries food from where it starts to the parts that need it.'))),
              transportPath('phloem')
            ])
          ]),
          h('div', { key: 'key', className: 'allo-tree-pipe-key' }, [
            h('div', { key: 'source', className: 'allo-tree-pipe-term' }, [
              h('strong', { key: 't' }, __alloT('stem.treelab.source_word', 'Source')),
              h('span', { key: 'c' }, __alloT('stem.treelab.source_key', 'where sugar starts'))
            ]),
            h('div', { key: 'sink', className: 'allo-tree-pipe-term' }, [
              h('strong', { key: 't' }, __alloT('stem.treelab.sink_word', 'Sink')),
              h('span', { key: 'c' }, __alloT('stem.treelab.sink_key', 'where sugar is used or stored'))
            ]),
            h('span', { key: 'now', className: 'allo-tree-pipe-now' },
              __alloT('stem.treelab.route_now', 'Right now: ') + sugarSource + ' ' + ARROW + ' ' + sugarDestination)
          ])
        ], undefined, 'allo-tree-transport-story'));

        kids.push(scienceTrail('transport', __alloT('stem.treelab.transport_reasoning', 'Use direction to explain the hidden mechanism'), [
          { title: winterRest ? __alloT('stem.treelab.winter_flow_observe', 'Winter flow slows almost to a stop') : fmtInt(Math.round(transpirationPerDay)) + ' ' + __alloT('stem.treelab.litres_move_daily', 'litres move daily'), copy: (winterRest ? __alloT('stem.treelab.transport_observe_winter', 'Trace the resting water route, then follow stored sugar to the tissues that still need maintenance.') : __alloT('stem.treelab.transport_observe_copy', 'Trace water from soil to leaf, then trace sugar from ') + sugarSource + ' ' + __alloT('stem.treelab.to_word', 'to') + ' ' + sugarDestination + '.') },
          { title: __alloT('stem.treelab.transport_predict_title', 'Changing season can reverse the sugar route'), copy: season === 'spring' ? __alloT('stem.treelab.transport_predict_spring', 'As the canopy opens, predict when leaves will replace stored reserves as the source.') : __alloT('stem.treelab.transport_predict_other', 'Switch to spring and predict why stored sugar must travel upward before new leaves can feed themselves.') },
          { title: __alloT('stem.treelab.two_tissues_two_failures', 'Two tissues mean two different failures'), copy: __alloT('stem.treelab.transport_explain_copy', 'Removing bark blocks phloem sugar before it blocks xylem water, so the roots run out of food while the crown can still look green.') }
        ]));

        if (atLeast(band, 'g68')) {
          kids.push(card([
            heading(__alloT('stem.treelab.where_sugar', 'Where the whole-year carbon plan goes'),
              __alloT('stem.treelab.where_sugar_sub', 'These bars come from the annual allocation you set on Grow. The seasonal route above shows direction; this plan shows how the year\'s surplus is divided.')),
            sinkRows()
          ], undefined, 'allo-tree-sugar-map'));

          kids.push(card([
            heading(__alloT('stem.treelab.xs_title', 'Inside the trunk'),
              atLeast(band, 'g68')
                ? __alloT('stem.treelab.xs_sub_g68', 'Cut across the trunk and the two systems are in different places: phloem in a thin band just under the bark, xylem filling the wood beneath it. The rings are this tree\'s own.')
                : __alloT('stem.treelab.xs_sub_k2', 'A slice through the trunk. Each ring is one year of growing.')),
            trunkSection()
          ], undefined, 'allo-tree-trunk-card'));

          kids.push(card([
            heading(__alloT('stem.treelab.girdling', 'Why cutting a ring of bark kills a tree'),
              __alloT('stem.treelab.girdling_sub', 'A useful test of whether the two systems have really landed.')),
            h('p', { key: 'p', style: { fontSize: 13, color: T.text, lineHeight: 1.6 } },
              __alloT('stem.treelab.girdling_body',
                'Phloem sits just inside the bark; xylem is deeper in the wood. Remove a complete ring of bark and the leaves keep receiving water, so the tree looks fine for a whole season. But no sugar can reach the roots. The roots starve first, and only then does the top die.')),
            girdlingSequence(),
            atLeast(band, 'g912') ? h('p', { key: 'p2', style: { fontSize: 12, color: T.dim, lineHeight: 1.55, marginTop: 8 } },
              __alloT('stem.treelab.girdling_adv',
                'This is also why the cambium matters so much: it is the single living layer between the two, and it is what a ground fire has to get through. A species with thick bark is buying insulation for that one layer.')) : null
          ], undefined, 'allo-tree-girdling-card'));
        }
        return kids;
      }

      function spreadJourney() {
        var steps = band === 'k2' ? [
          { icon: '\uD83C\uDF33', title: __alloT('stem.treelab.journey_parent_k2', 'Parent tree'), copy: __alloT('stem.treelab.journey_parent_copy_k2', 'Saves food') },
          { icon: '\u2728', title: __alloT('stem.treelab.journey_choice_k2', 'Choose a way'), copy: __alloT('stem.treelab.journey_choice_copy_k2', 'Seeds, shoots, or both') },
          { icon: '\u26C5', title: __alloT('stem.treelab.journey_decade_k2', 'Ten years pass'), copy: __alloT('stem.treelab.journey_decade_copy_k2', 'Weather and luck act') },
          { icon: '\uD83C\uDF31', title: __alloT('stem.treelab.journey_forest_k2', 'New trees'), copy: __alloT('stem.treelab.journey_forest_copy_k2', 'Count what started growing') }
        ] : [
          { icon: '\uD83C\uDF33', title: __alloT('stem.treelab.journey_parent', 'Parent tree'), copy: __alloT('stem.treelab.journey_parent_copy', 'Banks reproduction carbon') },
          { icon: '\u2728', title: __alloT('stem.treelab.journey_choice', 'Your wager'), copy: __alloT('stem.treelab.journey_choice_copy', 'Seeds, clones, or both') },
          { icon: '\u26C5', title: __alloT('stem.treelab.journey_decade', 'A decade passes'), copy: __alloT('stem.treelab.journey_decade_copy', 'Chance and disturbance intervene') },
          { icon: '\uD83C\uDF31', title: __alloT('stem.treelab.journey_forest', 'Next generation'), copy: __alloT('stem.treelab.journey_forest_copy', 'Survivors establish') }
        ];
        var path = [];
        steps.forEach(function (step, i) {
          path.push(h('div', { key: 's' + i, className: 'allo-tree-spread-journey-step' }, [
            h('span', { key: 'i', className: 'allo-tree-spread-journey-icon', 'aria-hidden': 'true' }, step.icon),
            h('strong', { key: 't' }, step.title),
            h('span', { key: 'c' }, step.copy)
          ]));
          if (i < steps.length - 1) path.push(h('span', { key: 'a' + i, className: 'allo-tree-spread-journey-arrow', 'aria-hidden': 'true' }, ARROW));
        });
        return h('div', {
          key: 'journey', className: 'allo-tree-spread-journey', role: 'group',
          'aria-label': band === 'k2'
            ? __alloT('stem.treelab.journey_alt_k2', 'The new-tree journey: save food, choose seeds or shoots, let ten years pass, and count what grows.')
            : __alloT('stem.treelab.journey_alt', 'The reproduction journey: bank carbon, choose a strategy, pass through a decade of chance, and count the next generation.')
        }, path);
      }

      function spreadAmount(value) {
        return round(value, 2) + (band === 'k2'
          ? ' ' + __alloT('stem.treelab.food_points', 'food points')
          : ' kg C');
      }

      function spreadBudgetMeter(budget, totalSpent, remaining) {
        var rawPct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
        var fillPct = clamp(rawPct, 0, 100);
        return h('div', { key: 'meter', className: 'allo-tree-spread-budget-meter' + (remaining < 0 ? ' is-over' : '') }, [
          h('div', { key: 'head', className: 'allo-tree-spread-budget-head' }, [
            h('span', { key: 'l' }, band === 'k2' ? __alloT('stem.treelab.carbon_bank_meter_k2', 'Saved food used') : __alloT('stem.treelab.carbon_bank_meter', 'Carbon bank committed')),
            h('strong', { key: 'v' }, rawPct + '%')
          ]),
          h('div', {
            key: 'track', className: 'allo-tree-spread-budget-track', role: 'progressbar',
            'aria-label': band === 'k2' ? __alloT('stem.treelab.carbon_bank_meter_k2', 'Saved food used') : __alloT('stem.treelab.carbon_bank_meter', 'Carbon bank committed'),
            'aria-valuemin': 0, 'aria-valuemax': budget > 0 ? budget : 1,
            'aria-valuenow': budget > 0 ? clamp(totalSpent, 0, budget) : 0
          }, h('span', { className: 'allo-tree-spread-budget-fill', style: { width: fillPct + '%' } })),
          h('div', { key: 'note', className: 'allo-tree-spread-budget-note' },
            remaining >= 0
              ? spreadAmount(remaining) + ' ' + (band === 'k2' ? __alloT('stem.treelab.uncommitted_k2', 'still available') : __alloT('stem.treelab.uncommitted', 'still uncommitted'))
              : spreadAmount(Math.abs(remaining)) + ' ' + (band === 'k2' ? __alloT('stem.treelab.over_bank_k2', 'too much used') : __alloT('stem.treelab.over_bank', 'beyond the bank')))
        ]);
      }

      function strategyProfile(s) {
        var metrics = [
          { key: 'take', label: band === 'k2' ? __alloT('stem.treelab.establishment_k2', 'Starts growing') : __alloT('stem.treelab.establishment', 'Establishment'), value: Math.round(s.establish * 100) + '%', strength: s.establish, hue: tone('#22c55e') },
          { key: 'reach', label: band === 'k2' ? __alloT('stem.treelab.relative_reach_k2', 'How far it goes') : __alloT('stem.treelab.relative_reach', 'Relative reach'), value: Math.round(s.distance * 100) + '%', strength: s.distance, hue: tone('#38bdf8') },
          { key: 'genes', label: band === 'k2' ? __alloT('stem.treelab.genetic_variety_k2', 'Like the parent') : __alloT('stem.treelab.genetic_variety', 'Genetic variety'), value: s.diversity ? (band === 'k2' ? __alloT('stem.treelab.new_mix_k2', 'Different') : __alloT('stem.treelab.new_mix', 'New genetic mix')) : (band === 'k2' ? __alloT('stem.treelab.exact_copy_k2', 'Same copy') : __alloT('stem.treelab.exact_copy', 'Exact copy')), strength: s.diversity ? 1 : 0.16, hue: tone(s.diversity ? '#ec4899' : '#f59e0b') }
        ];
        return h('div', {
          key: 'profile', className: 'allo-tree-strategy-profile', role: 'group',
          'aria-label': band === 'k2' ? __alloT('stem.treelab.strategy_signature_k2', 'How this way works') : __alloT('stem.treelab.strategy_signature', 'Strategy signature')
        }, metrics.map(function (m) {
          return h('div', { key: m.key, className: 'allo-tree-strategy-metric', 'aria-label': m.label + ': ' + m.value }, [
            h('div', { key: 'h', className: 'allo-tree-strategy-metric-head' }, [
              h('span', { key: 'l' }, m.label),
              h('strong', { key: 'v' }, m.value)
            ]),
            h('span', { key: 't', className: 'allo-tree-strategy-track' },
              h('span', { className: 'allo-tree-strategy-fill', style: { width: Math.round(m.strength * 100) + '%', background: m.hue } }))
          ]);
        }));
      }

      function strategyDisplayName(strategy) {
        var s = strategy || {};
        if (band !== 'k2') return __alloT('stem.treelab.strategy_' + (s.id || ''), s.name || s.id || '');
        var names = {
          seed_wind: __alloT('stem.treelab.strategy_seed_wind_k2', 'Seed carried by wind'),
          seed_animal: __alloT('stem.treelab.strategy_seed_animal_k2', 'Seed planted by an animal'),
          mast_seed: __alloT('stem.treelab.strategy_mast_seed_k2', 'Lots of seeds at once'),
          seed_mast: __alloT('stem.treelab.strategy_seed_mast_k2', 'Lots of seeds at once'),
          root_sucker: __alloT('stem.treelab.strategy_root_sucker_k2', 'New shoot from a root'),
          layering: __alloT('stem.treelab.strategy_layering_k2', 'Branch grows its own roots'),
          basal_resprout: __alloT('stem.treelab.strategy_basal_resprout_k2', 'New shoot from the trunk')
        };
        return names[s.id] || s.name || s.id || '';
      }

      function strategyDisplayBlurb(strategy) {
        var s = strategy || {};
        if (band !== 'k2') return __alloT('stem.treelab.strategy_blurb_' + (s.id || ''), s.blurb || '');
        var blurbs = {
          seed_wind: __alloT('stem.treelab.strategy_blurb_seed_wind_k2', 'Light seeds ride the wind to new places.'),
          seed_animal: __alloT('stem.treelab.strategy_blurb_seed_animal_k2', 'Animals carry or bury seeds away from the parent.'),
          mast_seed: __alloT('stem.treelab.strategy_blurb_mast_seed_k2', 'The tree makes many seeds at the same time.'),
          seed_mast: __alloT('stem.treelab.strategy_blurb_seed_mast_k2', 'The tree makes many seeds at the same time.'),
          root_sucker: __alloT('stem.treelab.strategy_blurb_root_sucker_k2', 'A new shoot grows from a root near the parent.'),
          layering: __alloT('stem.treelab.strategy_blurb_layering_k2', 'A low branch touches the soil and grows roots.'),
          basal_resprout: __alloT('stem.treelab.strategy_blurb_basal_resprout_k2', 'A new shoot grows from the trunk after damage.')
        };
        return blurbs[s.id] || s.blurb || '';
      }

      function eventDisplay(event) {
        var e = event || eventById('calm');
        if (band !== 'k2') {
          return {
            name: __alloT('stem.treelab.event_' + e.id, e.name),
            blurb: __alloT('stem.treelab.event_blurb_' + e.id, e.blurb)
          };
        }
        var young = {
          fire: { name: 'Fire on the forest floor', blurb: 'A low fire moves under the trees.' },
          drought: { name: 'Two very dry summers', blurb: 'There is little water in the soil for two summers.' },
          pathogen: { name: 'Root sickness', blurb: 'A fungus can spread through roots that are joined together.' },
          browsing: { name: 'Hungry deer', blurb: 'Deer eat many of the short new plants.' },
          flood: { name: 'River flood', blurb: 'The river rises and moves soil and small plants.' },
          calm: { name: 'Ten quiet years', blurb: 'No big trouble happens, so more tries can keep growing.' }
        };
        var item = young[e.id] || { name: e.name, blurb: e.blurb };
        return {
          name: __alloT('stem.treelab.event_' + e.id + '_k2', item.name),
          blurb: __alloT('stem.treelab.event_blurb_' + e.id + '_k2', item.blurb)
        };
      }

      function spreadReasoningTrail(last, legal, spend, budget, totalSpent) {
        var seedPlan = 0, shootPlan = 0;
        legal.forEach(function (s) {
          var amount = spend[s.id] || 0;
          if (s.diversity) seedPlan += amount; else shootPlan += amount;
        });
        if (last && totalSpent <= 0) {
          (last.res.results || []).forEach(function (r) {
            var strategy = strategyById(r.id);
            if (strategy && strategy.diversity) seedPlan += r.attempts || 0;
            else shootPlan += r.attempts || 0;
          });
        }
        var event = last ? eventById(last.event) : null;
        var eventCopy = event ? eventDisplay(event) : null;
        var totalAttempts = last ? (last.res.results || []).reduce(function (sum, r) { return sum + (r.attempts || 0); }, 0) : 0;
        var observeTitle = last
          ? (band === 'k2'
            ? last.res.established + ' ' + __alloT('stem.treelab.new_trees_started_k2', 'new trees started')
            : (eventCopy ? eventCopy.name : last.event) + ': ' + last.res.established + ' ' + __alloT('stem.treelab.established_short', 'established'))
          : (band === 'k2'
            ? spreadAmount(budget) + ' ' + __alloT('stem.treelab.ready_to_use_k2', 'ready to use')
            : spreadAmount(budget) + ' ' + __alloT('stem.treelab.available_to_invest', 'available to invest'));
        var observeCopy = last
          ? (band === 'k2'
            ? (eventCopy ? eventCopy.name + '. ' : '') + __alloT('stem.treelab.spread_observe_result_k2', 'Count the growing marks, then notice how near or far they landed.')
            : totalAttempts + ' ' + __alloT('stem.treelab.attempts_word', 'attempts') + '. ' + __alloT('stem.treelab.spread_observe_result', 'Read the event, survivor count, and map as one piece of evidence.'))
          : (band === 'k2'
            ? __alloT('stem.treelab.spread_observe_plan_k2', 'The parent tree can spend this saved food on seeds or shoots.')
            : __alloT('stem.treelab.spread_observe_plan', 'The carbon bank is finite, so every route chosen means less carbon for another route.'));
        var predictTitle, predictCopy;
        if (seedPlan > 0 && shootPlan > 0) {
          predictTitle = band === 'k2' ? __alloT('stem.treelab.predict_mix_k2', 'Seeds should spread; shoots should stay close') : __alloT('stem.treelab.predict_mix', 'A mixed plan trades reach for reliability');
          predictCopy = band === 'k2' ? __alloT('stem.treelab.predict_mix_copy_k2', 'Guess which kind will start more often and which will travel farther.') : __alloT('stem.treelab.predict_mix_copy', 'Predict more nearby establishment from clones and more distance and variation from seeds.');
        } else if (seedPlan > 0) {
          predictTitle = band === 'k2' ? __alloT('stem.treelab.predict_seed_k2', 'Seeds may travel farther') : __alloT('stem.treelab.predict_seed', 'Reach and variation lead the wager');
          predictCopy = band === 'k2' ? __alloT('stem.treelab.predict_seed_copy_k2', 'Many seeds may not grow, but the ones that do can land far from the parent.') : __alloT('stem.treelab.predict_seed_copy', 'Expect lower establishment but wider dispersal and new genetic combinations.');
        } else if (shootPlan > 0) {
          predictTitle = band === 'k2' ? __alloT('stem.treelab.predict_shoot_k2', 'Shoots may start more often nearby') : __alloT('stem.treelab.predict_clone', 'Reliability leads the wager');
          predictCopy = band === 'k2' ? __alloT('stem.treelab.predict_shoot_copy_k2', 'The new shoots should stay close and grow much like the parent.') : __alloT('stem.treelab.predict_clone_copy', 'Expect high nearby establishment, low genetic variety, and shared vulnerabilities.');
        } else {
          predictTitle = band === 'k2' ? __alloT('stem.treelab.no_prediction_k2', 'Choose before you guess') : __alloT('stem.treelab.no_prediction', 'No strategy prediction yet');
          predictCopy = band === 'k2' ? __alloT('stem.treelab.no_prediction_copy_k2', 'Move a slider, then say what you think will grow and where.') : __alloT('stem.treelab.no_prediction_copy', 'Commit carbon, then predict establishment, distance, and diversity before running the decade.');
        }
        var explainTitle = last
          ? (last.res.established === 0
            ? __alloT('stem.treelab.zero_is_evidence', 'Zero is evidence, not a final verdict')
            : (band === 'k2' ? __alloT('stem.treelab.explain_this_time_k2', 'Explain what happened this time') : __alloT('stem.treelab.explain_this_time', 'Explain this decade, not every decade')))
          : (band === 'k2' ? __alloT('stem.treelab.wait_for_clues_k2', 'Run, then use the clues') : __alloT('stem.treelab.wait_for_evidence', 'Run once, then explain the evidence'));
        var explainCopy = last
          ? (last.res.established === 0
            ? (band === 'k2' ? __alloT('stem.treelab.zero_copy_k2', 'No new tree started this time. Change one choice and try again before deciding why.') : __alloT('stem.treelab.zero_copy', 'This event and wager produced no establishment. Change one variable and repeat before generalizing.'))
            : (band === 'k2' ? __alloT('stem.treelab.result_explain_k2', 'Use the event, the number that grew, and the map to tell why this result makes sense.') : __alloT('stem.treelab.result_explain', 'Connect the disturbance to each route\'s establishment, distance, and shared or varied genes.')))
          : (band === 'k2' ? __alloT('stem.treelab.before_run_explain_k2', 'After the run, point to a number and a mark on the map when you tell why.') : __alloT('stem.treelab.before_run_explain', 'After the run, connect the event, counts, and spatial pattern into one cautious claim.'));
        return scienceTrail('spread', band === 'k2'
          ? __alloT('stem.treelab.spread_reasoning_k2', 'Look, guess, and tell the new-tree story')
          : __alloT('stem.treelab.spread_reasoning', 'Turn one uncertain decade into evidence'), [
          { title: observeTitle, copy: observeCopy },
          { title: predictTitle, copy: predictCopy },
          { title: explainTitle, copy: explainCopy }
        ]);
      }

      function spreadPlanInsight(legal, spend, totalSpent) {
        var seedCarbon = 0, cloneCarbon = 0;
        legal.forEach(function (s) {
          if (s.diversity) seedCarbon += spend[s.id] || 0;
          else cloneCarbon += spend[s.id] || 0;
        });
        var icon, title, copy;
        if (totalSpent <= 0) {
          icon = '\uD83E\uDDED';
          title = band === 'k2' ? __alloT('stem.treelab.plan_empty_k2', 'Pick a way to begin') : __alloT('stem.treelab.plan_empty', 'Build your strategy');
          copy = band === 'k2' ? __alloT('stem.treelab.plan_empty_copy_k2', 'Move one slider. You can try seeds, shoots, or both.') : __alloT('stem.treelab.plan_empty_copy', 'Move at least one carbon slider. The model will turn that investment into attempts.');
        } else if (seedCarbon > 0 && cloneCarbon > 0) {
          icon = '\u2696\uFE0F';
          title = band === 'k2' ? __alloT('stem.treelab.plan_mixed_k2', 'Two kinds of chances') : __alloT('stem.treelab.plan_mixed', 'A hedged forest');
          copy = band === 'k2' ? __alloT('stem.treelab.plan_mixed_copy_k2', 'Seeds can travel farther. Shoots often start growing close to the parent.') : __alloT('stem.treelab.plan_mixed_copy', 'Some descendants can travel and differ; others stay close and establish more reliably.');
        } else if (seedCarbon > 0) {
          icon = '\uD83C\uDF2C\uFE0F';
          title = band === 'k2' ? __alloT('stem.treelab.plan_seed_k2', 'Sending seeds out') : __alloT('stem.treelab.plan_seed', 'Betting on variation');
          copy = band === 'k2' ? __alloT('stem.treelab.plan_seed_copy_k2', 'Seeds may land far away and be different from the parent, but many will not start growing.') : __alloT('stem.treelab.plan_seed_copy', 'Your attempts can travel and recombine, but most will fail before establishment.');
        } else {
          icon = '\uD83C\uDF3F';
          title = band === 'k2' ? __alloT('stem.treelab.plan_clone_k2', 'Growing near the parent') : __alloT('stem.treelab.plan_clone', 'Betting on reliability');
          copy = band === 'k2' ? __alloT('stem.treelab.plan_clone_copy_k2', 'New shoots often start nearby and grow much like the parent tree.') : __alloT('stem.treelab.plan_clone_copy', 'Your copies are likely to establish nearby, with the same genes and often the same roots.');
        }
        return h('div', { key: 'insight', className: 'allo-tree-spread-plan' }, [
          h('span', { key: 'i', className: 'allo-tree-spread-plan-icon', 'aria-hidden': 'true' }, icon),
          h('div', { key: 'c' }, [
            h('strong', { key: 't' }, title),
            h('div', { key: 'p' }, copy)
          ])
        ]);
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
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' }, __alloT('stem.treelab.spread_story_eyebrow', 'From one tree to a forest')),
          heading('🌱 ' + __alloT('stem.treelab.spread', 'Making more trees'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.spread_sub_g68', 'Seeds recombine and travel, but almost none survive. Clonal routes nearly always take and cost little, but they produce genetic copies on a shared root system. Spend the reproduction carbon you banked and see what a decade throws at you.')
              : __alloT('stem.treelab.spread_sub_k2', 'Trees make new trees in more than one way. Some grow from seeds. Some grow as new shoots from the parent. Try using the tree\'s saved food in different ways.')),
          spreadJourney(),
          spreadBudgetMeter(budget, totalSpent, remaining),
          h('div', { key: 'bud', className: 'allo-tree-spread-budget-grid' }, [
            statTile('b', band === 'k2' ? __alloT('stem.treelab.banked_k2', 'Food saved') : __alloT('stem.treelab.banked', 'Carbon banked'), spreadAmount(budget), T.accent),
            statTile('s', band === 'k2' ? __alloT('stem.treelab.committed_k2', 'Food used') : __alloT('stem.treelab.committed', 'Committed'), spreadAmount(totalSpent), T.warn),
            statTile('r', band === 'k2' ? __alloT('stem.treelab.left_k2', 'Food left') : __alloT('stem.treelab.left', 'Left'), spreadAmount(remaining), remaining >= 0 ? T.good : T.bad)
          ]),
          budget <= 0 ? h('div', { key: 'nb', style: { fontSize: 13, color: T.warn, lineHeight: 1.55 } },
            (band === 'k2' ? __alloT('stem.treelab.no_budget_k2', 'No food is saved for new trees yet. Go back to Grow, save some food for seeds, and let years pass.') : __alloT('stem.treelab.no_budget', 'No reproduction carbon banked yet. Go back to Grow, put some of the surplus into Reproduction, and run some years.'))) : null,
          atLeast(band, 'g35') ? modelNote(__alloT('stem.treelab.spread_model_note',
            'The take rates below are tuned so that one decade is playable, not measured. What is real is the ORDER: a clonal shoot establishes far more reliably than a seed, and a wind-carried seed in the wild succeeds far more rarely than the figure here suggests. Compare the strategies against each other, not against the world.')) : null
        ], undefined, 'allo-tree-spread-hero'));
        kids.push(spreadReasoningTrail(last, legal, spend, budget, totalSpent));

        var strategyCards = [];
        legal.forEach(function (s) {
          var val = spend[s.id] || 0;
          var id = 'treelab-spend-' + s.id;
          strategyCards.push(h('div', { key: s.id, className: 'allo-tree-strategy-slot' }, card([
            h('div', { key: 'hd', className: 'allo-tree-strategy-head', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' } }, [
              h('div', { key: 'a', style: { flex: '1 1 200px' } }, [
                h('div', { key: 'n', style: { fontWeight: 700, color: T.text, fontSize: 14 } },
                  s.icon + ' ' + strategyDisplayName(s)),
                h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3, lineHeight: 1.55 } },
                  strategyDisplayBlurb(s))
              ]),
              band === 'k2' ? null : h('div', { key: 'c', className: 'allo-tree-strategy-meta', style: { textAlign: 'right', fontSize: 11, color: T.dim, minWidth: 96 } }, [
                h('div', { key: '1' }, __alloT('stem.treelab.cost', 'Cost ') + s.cost + ' kg C'),
                h('div', { key: '2' }, __alloT('stem.treelab.takes', 'Takes ') + Math.round(s.establish * 100) + '%'),
                h('div', { key: '3', style: { color: s.diversity ? T.good : T.warn } },
                  s.diversity ? __alloT('stem.treelab.new_mix', 'New genetic mix') : __alloT('stem.treelab.exact_copy', 'Exact copy'))
              ])
            ]),
            strategyProfile(s),
            h('div', { key: 'sl', className: 'allo-tree-strategy-slider', style: { marginTop: 8 } }, [
              h('label', { key: 'l', htmlFor: id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 4 } }, [
                h('span', { key: 'a' }, band === 'k2' ? __alloT('stem.treelab.commit_k2', 'Use saved food') : __alloT('stem.treelab.commit', 'Commit carbon')),
                h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, band === 'k2' ? spreadAmount(val) + ' \u00B7 ' + Math.floor(val / s.cost) + ' ' + __alloT('stem.treelab.tries_k2', 'tries') : round(val, 2) + ' kg (' + Math.floor(val / s.cost) + ' attempts)')
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
          ], undefined, 'allo-tree-strategy-card ' + (s.diversity ? 'is-seed' : 'is-clone') + (val > 0 ? ' is-active' : ''))));
        });
        kids.push(h('section', {
          key: 'strategies', className: 'allo-tree-strategy-stage',
          'aria-label': band === 'k2' ? __alloT('stem.treelab.choose_strategy_k2', 'Choose how to make new trees') : __alloT('stem.treelab.choose_strategy', 'Choose a reproduction strategy')
        }, [
          h('div', { key: 'guide' }, flowMarker('1',
            band === 'k2' ? __alloT('stem.treelab.choose_wager_k2', 'Choose how new trees begin') : __alloT('stem.treelab.choose_wager', 'Choose the wager'),
            band === 'k2' ? __alloT('stem.treelab.choose_wager_copy_k2', 'Try seeds, shoots, or both. Watch how far they go and how often they grow.') : __alloT('stem.treelab.choose_wager_copy', 'Balance reliability, distance, and genetic variety.'))),
          h('div', { key: 'grid', className: 'allo-tree-strategy-grid' }, strategyCards)
        ]));

        kids.push(card([
          h('div', { key: 'guide' }, flowMarker('2',
            band === 'k2' ? __alloT('stem.treelab.release_decade_k2', 'Let 10 years pass') : __alloT('stem.treelab.release_decade', 'Release the decade'),
            band === 'k2' ? __alloT('stem.treelab.release_decade_copy_k2', 'Use the saved food, then see which new trees start growing.') : __alloT('stem.treelab.release_decade_copy', 'Lock in the carbon wager, then let chance and disturbance act.'))),
          spreadPlanInsight(legal, spend, totalSpent),
          h('div', { key: 'run', className: 'allo-tree-spread-actions', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center' } }, [
            btn('go', band === 'k2' ? __alloT('stem.treelab.run_decade_k2', 'Try 10 years') : __alloT('stem.treelab.run_decade', 'Run the decade'), function () { runSpread(spend, remaining); },
              { disabled: totalSpent <= 0 || remaining < 0 }),
            btn('clr', __alloT('stem.treelab.clear', 'Clear'), function () { upd('spend', {}); }, { tone: 'ghost' })
          ]),
          remaining < 0 ? h('div', { key: 'over', style: { fontSize: 12, color: T.bad, marginTop: 6 } },
            band === 'k2' ? __alloT('stem.treelab.overcommitted_k2', 'You used more saved food than the tree has. Pull one slider back.') : __alloT('stem.treelab.overcommitted', 'You have committed more carbon than the tree banked. Pull something back.')) : null
        ], undefined, 'allo-tree-spread-launch'));

        if (last) {
          var mapCard = spreadMap(last);
          var resultItems = [
            h('div', { key: 'outcome', className: 'allo-tree-spread-result-slot' }, spreadResult(last))
          ];
          if (mapCard) resultItems.push(h('div', { key: 'map', className: 'allo-tree-spread-map-slot' }, mapCard));
          kids.push(h('section', {
            key: 'results', className: 'allo-tree-spread-results-stage',
            'aria-label': band === 'k2' ? __alloT('stem.treelab.decade_reveal_k2', 'What happened in 10 years') : __alloT('stem.treelab.decade_reveal', 'Decade reveal')
          }, [
            h('div', { key: 'guide' }, flowMarker('3',
              band === 'k2' ? __alloT('stem.treelab.read_decade_k2', 'Read what happened') : __alloT('stem.treelab.read_decade', 'Read the decade'),
              band === 'k2' ? __alloT('stem.treelab.read_decade_copy_k2', 'Use the weather card, the number that grew, and where the marks landed.') : __alloT('stem.treelab.read_decade_copy', 'Connect the event, the survivor counts, and the spatial pattern.'))),
            h('div', { key: 'grid', className: 'allo-tree-spread-results-grid' }, resultItems)
          ]));
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
        var eventCopy = eventDisplay(ev);
        var spreadCount = band === 'k2'
          ? res.established + ' ' + (res.established === 1 ? __alloT('stem.treelab.new_tree_started_one_k2', 'new tree started growing') : __alloT('stem.treelab.new_tree_started_many_k2', 'new trees started growing'))
          : res.established + ' descendant' + (res.established === 1 ? '' : 's') + ' established';
        srSay(eventCopy.name + '. ' + spreadCount + '.');
        if (addToast) addToast(ev.icon + ' ' + eventCopy.name + ': ' + spreadCount, res.established > 0 ? 'success' : 'error');
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
          verdict = band === 'k2'
            ? __alloT('stem.treelab.record_one_round_k2', 'One try is a clue, not the whole answer. Try another plan or another kind of weather.')
            : __alloT('stem.treelab.record_one_round', 'One decade is an anecdote. Run another against a different event before drawing a conclusion.');
        } else if (totals.clonal > totals.diverse * 2) {
          verdict = band === 'k2'
            ? __alloT('stem.treelab.record_clonal_k2', 'Most of your new trees grew as nearby shoots. They started often, stayed close, and shared the parent\'s traits.')
            : __alloT('stem.treelab.record_clonal', 'Your descendants are overwhelmingly clonal: reliable, close to home, and every one of them carrying the same susceptibility. One root pathogen reaches all of them.');
        } else if (totals.diverse > totals.clonal * 2) {
          verdict = band === 'k2'
            ? __alloT('stem.treelab.record_seed_k2', 'Most of your new trees came from seeds. They spread farther and were different from the parent, but many tries did not grow.')
            : __alloT('stem.treelab.record_seed', 'Your descendants are overwhelmingly from seed: genetically varied and spread wide, and you paid for that in how few of them took.');
        } else {
          verdict = band === 'k2'
            ? __alloT('stem.treelab.record_mixed_k2', 'You used both ways: nearby shoots that started often and seeds that reached farther.')
            : __alloT('stem.treelab.record_mixed', 'You are hedging \u2014 copies close by that almost always take, plus seedlings further out that mostly do not. Most real trees settle here too.');
        }

        return card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' },
            __alloT('stem.treelab.record_eyebrow', 'Forest legacy')),
          heading(band === 'k2' ? __alloT('stem.treelab.record_k2', 'Your forest story so far') : __alloT('stem.treelab.record', 'Your record so far'),
            band === 'k2' ? __alloT('stem.treelab.record_sub_k2', 'Every ten-year try you have made with this tree.') : __alloT('stem.treelab.record_sub', 'Every decade you have run with this tree.')),
          h('div', { key: 'tot', className: 'allo-tree-spread-record-totals' }, [
            statTile('r', __alloT('stem.treelab.decades', 'Decades run'), String(log.length), T.accent),
            statTile('d', band === 'k2' ? __alloT('stem.treelab.from_seed_k2', 'From seeds') : __alloT('stem.treelab.from_seed', 'From seed'), String(totals.diverse), tone('#ec4899')),
            statTile('c', band === 'k2' ? __alloT('stem.treelab.from_shoots_k2', 'New shoots') : __alloT('stem.treelab.clonal', 'Clonal copies'), String(totals.clonal), tone('#86efac')),
            atLeast(band, 'g68')
              ? statTile('x', __alloT('stem.treelab.diversity', 'Genetic diversity'),
                (all > 0 ? Math.round((totals.diverse / all) * 100) : 0) + '%', T.accent)
              : null
          ].filter(Boolean)),
          h('div', { key: 'rows', className: 'allo-tree-spread-record-timeline' }, log.map(function (r, i) {
            var e = eventById(r.event);
            var eventCopy = eventDisplay(e);
            var took = r.diverse + r.clonal;
            return h('div', {
              key: 'lr' + i,
              className: 'allo-tree-spread-record-row',
              style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid ' + T.border, fontSize: 12 }
            }, [
              h('span', { key: 'a', style: { color: T.dim } },
                (i + 1) + '. ' + e.icon + ' ' + eventCopy.name),
              h('span', { key: 'b', style: { color: took > 0 ? T.text : T.dim, fontWeight: 600 } },
                took + ' ' + (band === 'k2' ? __alloT('stem.treelab.started_growing_k2', 'started growing') : __alloT('stem.treelab.established_short', 'established'))
                + (took > 0 ? (band === 'k2'
                  ? '  (' + __alloT('stem.treelab.seeds_lower_k2', 'seeds') + ' ' + r.diverse + ' · ' + __alloT('stem.treelab.shoots_lower_k2', 'shoots') + ' ' + r.clonal + ')'
                  : '  (' + r.diverse + ' / ' + r.clonal + ')') : ''))
            ]);
          })),
          h('p', { key: 'v', className: 'allo-tree-spread-record-verdict', style: { fontSize: 12, color: T.dim, lineHeight: 1.55, marginTop: 10 } }, verdict)
        ], null, 'allo-tree-spread-record-card');
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
        var alt = band === 'k2'
          ? __alloT('stem.treelab.map_alt_k2',
            'Looking down at the ground around the parent tree. ' + res.established + ' new trees started: '
            + res.diverseCount + ' from seeds spread across the clearing, and '
            + res.clonalCount + ' new shoots stayed joined to the parent roots.')
          : __alloT('stem.treelab.map_alt',
            'Overhead map of the clearing. ' + res.established + ' descendants established: '
            + res.diverseCount + ' grown from seed, scattered across the clearing, and '
            + res.clonalCount + ' clonal stems joined to the parent tree by its own roots.'
            + (anyWiped ? ' The clonal stems marked with a cross were killed together.' : ''));

        return card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' },
            band === 'k2' ? __alloT('stem.treelab.map_eyebrow_k2', 'New-tree map') : __alloT('stem.treelab.map_eyebrow', 'Dispersal map')),
          heading(__alloT('stem.treelab.map_title', 'Where they landed'),
            atLeast(band, 'g35')
              ? __alloT('stem.treelab.map_sub_g35', 'The same decade, seen from above. Distance is the half of this trade the numbers do not show: a clonal stem almost always takes, and it arrives next to its parent.')
              : __alloT('stem.treelab.map_sub_k2', 'Looking down at the ground around the tree. Each mark is one try.')),
          h('svg', {
            key: 'map', className: 'allo-tree-spread-map', viewBox: '0 0 ' + SIZE + ' ' + SIZE, role: 'img', 'aria-label': alt,
            style: { width: '100%', maxWidth: 420, height: 'auto', display: 'block', margin: '0 auto' }
          }, (function () {
            // An overhead map that is supposed to be the ground around a tree was a
            // flat grey disc. Drawn as one — pale grass falling off toward the edge,
            // a lobed canopy with a shadow — the "seen from above" framing lands
            // before the caption is read. High contrast keeps the flat disc: every
            // decorative green would collapse onto the one accent anyway, and the
            // texture would cost mark legibility.
            var kids = [];
            if (!isContrast) {
              kids.push(h('defs', { key: 'defs' }, [
                h('radialGradient', { key: 'g1', id: 'treelab-ground-g' }, [
                  h('stop', { key: 'a', offset: '0%', stopColor: isDark ? '#233420' : '#edf5df' }),
                  h('stop', { key: 'b', offset: '70%', stopColor: isDark ? '#1b2a1a' : '#dcebc9' }),
                  h('stop', { key: 'c', offset: '100%', stopColor: isDark ? '#152114' : '#c9deb2' })
                ]),
                h('radialGradient', { key: 'g2', id: 'treelab-canopy-g', cx: '38%', cy: '32%', r: '85%' }, [
                  h('stop', { key: 'a', offset: '0%', stopColor: isDark ? '#35854a' : '#46a55f' }),
                  h('stop', { key: 'b', offset: '100%', stopColor: isDark ? '#14532d' : '#166534' })
                ])
              ]));
            }
            kids.push(h('circle', {
              key: 'bg', cx: C, cy: C, r: R + 6,
              fill: isContrast ? T.cardAlt : 'url(#treelab-ground-g)',
              stroke: isContrast ? T.border : (isDark ? '#2e4128' : '#aac48d')
            }));
            if (!isContrast) {
              // Sparse tufts, seeded once — the same ground on every render.
              var trand = seeded(20260817);
              var tufts = [];
              for (var ti = 0; ti < 54; ti++) {
                var ta = trand() * Math.PI * 2;
                var trr = Math.sqrt(trand()) * (R - 4);
                if (trr < INNER + 4) continue;   // keep the parent's footprint clean
                var tx = C + Math.cos(ta) * trr, ty = C + Math.sin(ta) * trr;
                tufts.push(h('line', {
                  key: 'tf' + ti, x1: round(tx - 1.5, 1), y1: round(ty + 1.1, 1),
                  x2: round(tx + 0.4, 1), y2: round(ty - 1.4, 1),
                  stroke: isDark ? '#324629' : '#b5cd94', strokeWidth: 1, strokeLinecap: 'round'
                }));
              }
              kids.push(h('g', { key: 'tufts', 'aria-hidden': 'true' }, tufts));
            }
            kids.push(h('g', { key: 'rings' }, [0.34, 0.67, 1].map(function (f, i) {
              return h('circle', {
                key: 'r' + i, cx: C, cy: C, r: R * f, fill: 'none',
                stroke: isContrast ? T.border : (isDark ? '#4a6140' : '#8fa974'),
                strokeWidth: 1, strokeDasharray: '3 4'
              });
            })));
            kids.push(h('g', { key: 'marks' }, marks));
            // The parent, drawn last so nothing sits on top of it.
            if (isContrast) {
              kids.push(h('circle', { key: 'p1', cx: C, cy: C, r: PARENT_R, fill: tone('#166534'), stroke: T.card, strokeWidth: 2 }));
              kids.push(h('circle', { key: 'p2', cx: C, cy: C, r: 4, fill: tone('#78350f') }));
            } else {
              var lobes = [
                [C - 7.5, C - 4, 7], [C + 7, C - 5, 6.5],
                [C + 5.5, C + 6.5, 6.5], [C - 5, C + 7, 6], [C, C, PARENT_R]
              ];
              kids.push(h('ellipse', {
                key: 'psh', cx: C + 2.5, cy: C + 3.5, rx: PARENT_R + 4.5, ry: PARENT_R + 2,
                fill: '#000000', opacity: isDark ? 0.30 : 0.14
              }));
              // Rim first, gradient clumps over it: stroking the lobes themselves
              // would draw every internal overlap line.
              kids.push(h('g', { key: 'prim', fill: isDark ? '#0d3b20' : '#0f4d28' }, lobes.map(function (l, i) {
                return h('circle', { key: 'u' + i, cx: l[0], cy: l[1], r: l[2] + 1.2 });
              })));
              kids.push(h('g', { key: 'pcan', fill: 'url(#treelab-canopy-g)' }, lobes.map(function (l, i) {
                return h('circle', { key: 'c' + i, cx: l[0], cy: l[1], r: l[2] });
              })));
              kids.push(h('circle', { key: 'p2', cx: C, cy: C, r: 3.4, fill: '#78350f', opacity: 0.9 }));
            }
            return kids;
          })()),
          h('div', { key: 'leg', className: 'allo-tree-spread-map-legend', style: { marginTop: 8, textAlign: 'center' } }, [
            legendItem('a', sw('diverse'), __alloT('stem.treelab.map_leg_seed', 'Grew from seed')),
            legendItem('b', sw('clonal'), band === 'k2' ? __alloT('stem.treelab.map_leg_clone_k2', 'New shoot') : __alloT('stem.treelab.map_leg_clone', 'Clonal stem')),
            legendItem('c', sw('dead'), band === 'k2' ? __alloT('stem.treelab.map_leg_failed_k2', 'Did not grow') : __alloT('stem.treelab.map_leg_failed', 'Did not take')),
            anyWiped ? legendItem('d', sw('wiped'), band === 'k2' ? __alloT('stem.treelab.map_leg_wiped_k2', 'Hurt together') : __alloT('stem.treelab.map_leg_wiped', 'Killed together')) : null
          ]),
          dropped > 0 ? h('div', { key: 'cap', style: { fontSize: 11, color: T.dim, marginTop: 6, textAlign: 'center' } },
            band === 'k2'
              ? __alloT('stem.treelab.map_capped_k2', 'Showing ' + nodes.length + ' of ' + (nodes.length + dropped) + ' tries so the map stays easy to read. The numbers above count them all.')
              : __alloT('stem.treelab.map_capped', 'Showing ' + nodes.length + ' of ' + (nodes.length + dropped) + ' attempts, in the same proportion. The table above is the full count.')) : null,
          modelNote(band === 'k2'
            ? __alloT('stem.treelab.map_note_k2', 'This map shows near and far, not real metres. Filled marks started growing; open marks did not.')
            : __alloT('stem.treelab.map_note', 'Distances here are RELATIVE, not a scale in metres — what is real is the ordering, that a wind-carried seed can travel orders of magnitude further than a root sucker can push. The counts are exactly the ones resolved above; nothing is re-rolled to draw this.'))
        ], null, 'allo-tree-spread-map-card');
      }

      function spreadResult(last) {
        var ev = eventById(last.event);
        var eventCopy = eventDisplay(ev);
        var res = last.res;
        var lesson;
        if (band === 'k2') {
          lesson = res.established === 0
            ? __alloT('stem.treelab.none_established_lesson_k2', 'No new tree started this time. One try is not enough to know. Change one choice and try again.')
            : (res.clonalCount > 0 && res.diverseCount === 0
              ? __alloT('stem.treelab.all_clonal_k2', 'The nearby shoots started this time. They stayed close to the parent tree.')
              : (res.diverseCount > 0 && res.clonalCount === 0
                ? __alloT('stem.treelab.all_seed_k2', 'The new trees came from seed and reached farther. Many seed tries still did not grow.')
                : __alloT('stem.treelab.mixed_k2', 'Shoots stayed close while seeds reached farther. Both ways added new trees this time.')));
        } else {
          lesson = res.established === 0
            ? __alloT('stem.treelab.none_established_lesson', 'No descendants established this decade. That is evidence about this event and this wager, not proof that the strategy can never work. Change one part of the plan and compare another decade.')
            : (res.clonalCount > 0 && res.diverseCount === 0
              ? __alloT('stem.treelab.all_clonal', 'Every descendant this round is a genetic copy sharing one root system. That is reliable now and fragile against anything that beats this exact genotype.')
              : (res.diverseCount > 0 && res.clonalCount === 0
                ? __alloT('stem.treelab.all_seed', 'Every descendant came from seed, so each one is genetically different and landed away from the parent. You paid for that in how few of them took.')
                : __alloT('stem.treelab.mixed', 'A mixed strategy: copies close by that almost always take, plus a few genetically different seedlings further out. Most real trees hedge exactly like this.')));
        }
        return card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' },
            __alloT('stem.treelab.outcome_eyebrow', 'Decade outcome')),
          h('div', { key: 'ev', className: 'allo-tree-spread-event', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, borderLeft: '4px solid ' + T.accent, marginBottom: 10 } }, [
            h('div', { key: 'a', style: { fontWeight: 700, color: T.text } },
              ev.icon + ' ' + eventCopy.name),
            h('div', { key: 'b', style: { fontSize: 12, color: T.dim, marginTop: 3 } },
              eventCopy.blurb)
          ]),
          h('div', { key: 'g', className: 'allo-tree-spread-outcome-grid' }, [
            statTile('e', band === 'k2' ? __alloT('stem.treelab.established_k2', 'Started growing') : __alloT('stem.treelab.established', 'Established'), String(res.established), T.good),
            statTile('d', band === 'k2' ? __alloT('stem.treelab.from_seed_k2', 'From seeds') : __alloT('stem.treelab.from_seed', 'From seed'), String(res.diverseCount), '#ec4899'),
            statTile('c', band === 'k2' ? __alloT('stem.treelab.from_shoots_k2', 'New shoots') : __alloT('stem.treelab.clonal', 'Clonal copies'), String(res.clonalCount), '#86efac'),
            atLeast(band, 'g68') ? statTile('x', __alloT('stem.treelab.diversity', 'Genetic diversity'), Math.round(res.diversityIndex * 100) + '%', T.accent) : null
          ].filter(Boolean)),
          h('div', { key: 'rows', className: 'allo-tree-spread-outcome-rows' }, res.results.map(function (r) {
            return h('div', {
              key: r.id,
              className: 'allo-tree-spread-outcome-row',
              style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid ' + T.border, fontSize: 12, flexWrap: 'wrap' }
            }, [
              h('span', { key: 'a', style: { color: T.text, fontWeight: 600 } },
                (r.icon || '') + ' ' + strategyDisplayName(strategyById(r.id) || r)),
              h('span', { key: 'b', style: { color: r.took > 0 ? T.good : T.dim } }, band === 'k2'
                ? r.took + ' ' + __alloT('stem.treelab.grew_from_k2', 'grew from') + ' ' + r.attempts + ' ' + __alloT('stem.treelab.tries_k2', 'tries')
                : r.took + ' / ' + r.attempts),
              r.note && band !== 'k2' ? h('span', { key: 'c', style: { color: r.wiped ? T.bad : T.dim, flex: '1 1 100%', lineHeight: 1.45 } },
                __alloT('stem.treelab.spread_note_' + (r.noteKind || 'plain'), r.note)) : null
            ]);
          })),
          h('div', { key: 'lesson', className: 'allo-tree-spread-lesson' }, [
            h('strong', { key: 'h', className: 'allo-tree-spread-lesson-title' }, band === 'k2'
              ? __alloT('stem.treelab.what_happened_k2', 'What happened this time')
              : __alloT('stem.treelab.what_evidence_says', 'What this evidence says')),
            h('p', { key: 'p' }, lesson)
          ])
        ], null, 'allo-tree-spread-outcome-card');
      }

      function quizProgress(pool) {
        var seen = d.quizSeen || {};
        var right = 0, done = 0;
        pool.forEach(function (q) {
          var st = seen[QUIZ.indexOf(q)];
          if (st !== 'right' && st !== 'wrong') return;
          done++;
          if (st === 'right') right++;
        });
        return {
          right: right,
          done: done,
          total: pool.length,
          percent: Math.round(done / Math.max(1, pool.length) * 100)
        };
      }

      function scoreStrip(pool, currentIdx) {
        var seen = d.quizSeen || {};
        var progress = quizProgress(pool);
        var scoreText = progress.done === 0
          ? __alloT('stem.treelab.score_none', 'Not answered yet')
          : progress.right + ' / ' + progress.done + ' ' + __alloT('stem.treelab.score_right', 'right');
        var title = progress.done === 0
          ? __alloT('stem.treelab.canopy_ready', 'Ready to grow your canopy')
          : (progress.done === progress.total
            ? __alloT('stem.treelab.canopy_complete', 'Every idea has been explored')
            : (progress.total - progress.done) + ' ' + __alloT('stem.treelab.canopy_waiting', 'ideas still waiting'));

        return h('section', {
          key: 'score', className: 'allo-tree-quiz-progress',
          'aria-label': __alloT('stem.treelab.canopy_progress', 'Canopy progress')
        }, [
          h('div', {
            key: 'ring', className: 'allo-tree-quiz-progress-ring',
            style: { '--quiz-progress': progress.percent + '%' }, 'aria-hidden': 'true'
          }, [
            h('span', { key: 'leaf', className: 'allo-tree-quiz-progress-leaf' }, '\uD83C\uDF3F'),
            h('strong', { key: 'count' }, progress.done + ' / ' + progress.total),
            h('span', { key: 'label' }, __alloT('stem.treelab.explored', 'explored'))
          ]),
          h('div', { key: 'body', className: 'allo-tree-quiz-progress-body' }, [
            h('div', { key: 'kicker', className: 'allo-tree-quiz-progress-kicker' },
              __alloT('stem.treelab.canopy_progress', 'Canopy progress')),
            h('strong', { key: 'title', className: 'allo-tree-quiz-progress-title' }, title),
            h('span', { key: 'scoreline', className: 'allo-tree-quiz-progress-score' }, scoreText),
            h('div', {
              key: 'bar', className: 'allo-tree-quiz-progress-track', role: 'progressbar',
              'aria-label': __alloT('stem.treelab.questions_explored', 'Questions explored'),
              'aria-valuemin': 0, 'aria-valuemax': progress.total, 'aria-valuenow': progress.done
            }, h('span', {
              className: 'allo-tree-quiz-progress-fill',
              style: { width: progress.percent + '%' }
            })),
            h('div', { key: 'trail', className: 'allo-tree-quiz-leaf-trail', 'aria-hidden': 'true' },
              pool.map(function (q, i) {
                var st = seen[QUIZ.indexOf(q)];
                if (st !== 'right' && st !== 'wrong') st = 'open';
                return h('span', {
                  key: 'd' + i,
                  className: 'allo-tree-quiz-leaf is-' + st + (i === currentIdx ? ' is-current' : '')
                }, st === 'right' ? '\u2713' : (st === 'wrong' ? '\u21BB' : (i + 1)));
              }))
          ])
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

        return h('div', {
          key: 'chart', className: 'allo-tree-compare-chart-shell', style: { marginTop: 4 },
          role: 'region', tabIndex: 0,
          'aria-label': __alloT('stem.treelab.compare_chart_region', 'Scrollable chart comparing tree height through time')
        }, [
          h('div', { key: 'cue', className: 'allo-tree-compare-scroll-cue', 'aria-hidden': 'true' },
            __alloT('stem.treelab.scroll_chart_cue', 'Swipe sideways to read the full chart')),
          h('svg', {
            key: 'svg', className: 'allo-tree-compare-chart', viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': alt,
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
            key: 'legend', className: 'allo-tree-compare-legend',
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
          h('div', { key: 'key', className: 'allo-tree-compare-chart-key', style: { fontSize: 11, color: T.dim, marginTop: 4, textAlign: 'center' } },
            __alloT('stem.treelab.compare_key', 'A cross marks when a tree died. Every figure is also written out species by species below.'))
        ]);
      }
      function compareExperimentStrip(years) {
        var controls = [
          { key: 'climate', icon: '\u2600\uFE0F', label: __alloT('stem.treelab.control_climate', 'Climate'), value: round(envCfg.tempC, 0) + ' ' + DEG + 'C / ' + Math.round(envCfg.light * 100) + '% ' + __alloT('stem.treelab.light', 'Light') + ' / ' + Math.round(envCfg.soilWater * 100) + '% ' + __alloT('stem.treelab.water', 'Water') + ' / ' + Math.round(envCfg.co2ppm) + ' ppm ' + CO2 + ' / ' + ((envCfg.droughtYears || []).length ? (envCfg.droughtYears || []).length + ' ' + __alloT('stem.treelab.scheduled_drought_years', 'scheduled drought years') : __alloT('stem.treelab.no_scheduled_drought', 'No scheduled drought')) },
          { key: 'carbon', icon: '\u25C8', label: __alloT('stem.treelab.control_carbon', 'Carbon plan'), value: Math.round(alloc.leaf * 100) + '% ' + __alloT('stem.treelab.leaves', 'Leaves') + ' / ' + Math.round(alloc.root * 100) + '% ' + __alloT('stem.treelab.roots', 'Roots') + ' / ' + Math.round(alloc.wood * 100) + '% ' + __alloT('stem.treelab.wood_short', 'Wood') + ' / ' + Math.round(alloc.repro * 100) + '% ' + __alloT('stem.treelab.reproduction', 'Reproduction') + ' / ' + Math.round(alloc.store * 100) + '% ' + __alloT('stem.treelab.reserves', 'Stored reserves') },
          { key: 'time', icon: '\u23F3', label: __alloT('stem.treelab.control_time', 'Time window'), value: years + ' ' + __alloT('stem.treelab.yr', 'yr') },
          { key: 'species', icon: '\uD83C\uDF32', label: __alloT('stem.treelab.only_variable', 'Only variable'), value: __alloT('stem.treelab.species_biology', 'Species biology'), variable: true }
        ];
        return h('div', {
          key: 'controls', className: 'allo-tree-compare-controls', role: 'group',
          'aria-label': __alloT('stem.treelab.controlled_comparison', 'Controlled comparison setup')
        }, controls.map(function (item) {
          return h('div', { key: item.key, className: 'allo-tree-compare-control' + (item.variable ? ' is-variable' : '') }, [
            h('span', { key: 'i', className: 'allo-tree-compare-control-icon', 'aria-hidden': 'true' }, item.icon),
            h('span', { key: 'l', className: 'allo-tree-compare-control-label' }, item.label),
            h('strong', { key: 'v', className: 'allo-tree-compare-control-value' }, item.value)
          ]);
        }));
      }

      function compareInsightPanel(runs, years) {
        var earlyYear = Math.min(20, years);
        var earlyIndex = Math.floor(earlyYear / 2);
        function earlyHeight(r) {
          if (!r.track.length) return 0;
          return r.track[Math.min(earlyIndex, r.track.length - 1)] || 0;
        }
        var early = runs[0], tallest = runs[0], alive = [];
        runs.forEach(function (r) {
          if (earlyHeight(r) > earlyHeight(early)) early = r;
          if (r.tree.heightM > tallest.tree.heightM) tallest = r;
          if (r.tree.alive) alive.push(r);
        });
        var aliveNames = alive.map(function (r) { return __alloT('stem.treelab.species_' + r.sp.id, r.sp.name); }).join(', ');
        var insights = [
          { icon: '\u26A1', kicker: __alloT('stem.treelab.fastest_first', 'Fastest first') + ' ' + earlyYear + ' ' + __alloT('stem.treelab.years_word', 'years'), name: __alloT('stem.treelab.species_' + early.sp.id, early.sp.name), detail: round(earlyHeight(early), 1) + ' m' },
          { icon: '\u2191', kicker: __alloT('stem.treelab.greatest_height', 'Greatest height reached'), name: __alloT('stem.treelab.species_' + tallest.sp.id, tallest.sp.name), detail: round(tallest.tree.heightM, 1) + ' m' },
          { icon: '\uD83C\uDF3F', kicker: __alloT('stem.treelab.still_alive_at', 'Still alive at') + ' ' + years + ' ' + __alloT('stem.treelab.yr', 'yr'), name: alive.length + ' / ' + runs.length, detail: alive.length ? aliveNames : __alloT('stem.treelab.none_survived', 'No species survived the full run') }
        ];
        return h('div', {
          key: 'insights', className: 'allo-tree-compare-insights',
          'aria-label': __alloT('stem.treelab.run_reveals', 'What this run reveals')
        }, [
          h('div', { key: 'title', className: 'allo-tree-compare-insights-title' }, __alloT('stem.treelab.run_reveals', 'What this run reveals')),
          h('div', { key: 'grid', className: 'allo-tree-compare-insights-grid' }, insights.map(function (item) {
            return h('div', { key: item.kicker, className: 'allo-tree-compare-insight' }, [
              h('span', { key: 'i', className: 'allo-tree-compare-insight-icon', 'aria-hidden': 'true' }, item.icon),
              h('span', { key: 'k', className: 'allo-tree-compare-insight-kicker' }, item.kicker),
              h('strong', { key: 'n', className: 'allo-tree-compare-insight-name' }, item.name),
              h('span', { key: 'd', className: 'allo-tree-compare-insight-detail' }, item.detail)
            ]);
          })),
          h('p', { key: 'prompt', className: 'allo-tree-compare-insight-prompt' },
            __alloT('stem.treelab.insight_prompt', 'These are outcomes in this environment, not a universal ranking. Use each strategy signature below to explain why the lines separate.'))
        ]);
      }

      function speciesTraitProfile(sp2, hasClonalRoute) {
        var traits = [
          { key: 'shade', label: __alloT('stem.treelab.shade_tolerance', 'Shade tolerance'), value: sp2.shadeTol, hue: tone('#8b5cf6') },
          { key: 'drought', label: __alloT('stem.treelab.drought_tolerance', 'Drought tolerance'), value: sp2.droughtTol, hue: tone('#38bdf8') },
          { key: 'bark', label: __alloT('stem.treelab.bark_defense', 'Bark defense'), value: sp2.barkThick, hue: tone('#f59e0b') }
        ];
        return h('div', {
          key: 'traits', className: 'allo-tree-species-traits', role: 'group',
          'aria-label': __alloT('stem.treelab.strategy_signature', 'Strategy signature')
        }, [
          h('div', { key: 'label', className: 'allo-tree-species-traits-label' }, __alloT('stem.treelab.strategy_signature', 'Strategy signature')),
          h('div', { key: 'meters', className: 'allo-tree-species-trait-meters' }, traits.map(function (trait) {
            var pct = Math.round(clamp(trait.value, 0, 1) * 100);
            return h('div', { key: trait.key, className: 'allo-tree-species-trait', 'aria-label': trait.label + ': ' + pct + '%' }, [
              h('div', { key: 'h', className: 'allo-tree-species-trait-head' }, [
                h('span', { key: 'l' }, trait.label),
                h('strong', { key: 'v' }, pct + '%')
              ]),
              h('span', { key: 't', className: 'allo-tree-species-trait-track' },
                h('span', { className: 'allo-tree-species-trait-fill', style: { width: pct + '%', background: trait.hue } }))
            ]);
          })),
          h('div', { key: 'pills', className: 'allo-tree-species-pills' }, [
            h('span', { key: 'leaf' }, sp2.leafType === 'needle' ? __alloT('stem.treelab.needles', 'Needles') : __alloT('stem.treelab.broad_leaves', 'Broad leaves')),
            h('span', { key: 'route' }, hasClonalRoute ? __alloT('stem.treelab.seed_and_clone', 'Seed + clonal routes') : __alloT('stem.treelab.seed_only', 'Seed only')),
            h('span', { key: 'life' }, __alloT('stem.treelab.typical_lifespan', 'Typical lifespan') + ': ~' + sp2.maxAgeYears + ' ' + __alloT('stem.treelab.yr', 'yr')),
            h('span', { key: 'height' }, __alloT('stem.treelab.height_ceiling', 'Height ceiling') + ': ' + sp2.maxHeight + ' m')
          ])
        ]);
      }


      function compareReasoningTrail(runs, years) {
        var tallest = runs[0], alive = 0;
        runs.forEach(function (r) {
          if (r.tree.heightM > tallest.tree.heightM) tallest = r;
          if (r.tree.alive) alive++;
        });
        return scienceTrail('compare', __alloT('stem.treelab.compare_reasoning', 'Read a controlled comparison like a scientist'), [
          {
            title: __alloT('stem.treelab.tallest_this_run', 'Tallest in this run: ') + __alloT('stem.treelab.species_' + tallest.sp.id, tallest.sp.name),
            copy: round(tallest.tree.heightM, 1) + ' m \u00B7 ' + alive + ' / ' + runs.length + ' ' + __alloT('stem.treelab.still_alive_after', 'still alive after') + ' ' + years + ' ' + __alloT('stem.treelab.years', 'years') + '.'
          },
          {
            title: __alloT('stem.treelab.compare_predict_title', 'Change one condition and the order may change'),
            copy: __alloT('stem.treelab.compare_predict_copy', 'Predict which tolerance or defense will matter more if only light or water changes.')
          },
          {
            title: __alloT('stem.treelab.compare_explain_title', 'Same inputs make biology the explanation'),
            copy: __alloT('stem.treelab.compare_explain_copy', 'Use growth speed, tolerance, bark, lifespan, and height ceiling to explain why the lines separate without calling one species best everywhere.')
          }
        ]);
      }

      function viewCompare() {
        var years = clamp(d.compareYears || 120, 20, 400);
        var runs = compareRuns(years);
        var maxH = 1;
        runs.forEach(function (r) { r.track.forEach(function (v) { if (v > maxH) maxH = v; }); });

        var kids = [card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' }, __alloT('stem.treelab.compare_eyebrow', 'A controlled forest experiment')),
          heading(__alloT('stem.treelab.compare', 'Five strategies, one set of conditions'),
            atLeast(band, 'g68')
              ? __alloT('stem.treelab.compare_sub_g68', 'Every species below is grown under exactly the conditions and the allocation you set on the Grow tab. Nothing else differs, so what you see is the strategy each one is built around.')
              : __alloT('stem.treelab.compare_sub_k2', 'The same weather for all five trees. They still grow differently.')),
          h('div', { key: 'guide' }, flowMarker('1',
            __alloT('stem.treelab.hold_still', 'Hold everything else still'),
            __alloT('stem.treelab.hold_still_copy', 'The same climate, carbon plan, and time window expose the biology.'))),
          compareExperimentStrip(years),
          h('div', { key: 'yrs', className: 'allo-tree-compare-timeline', style: { marginBottom: 10 } }, [
            h('label', { key: 'l', htmlFor: 'treelab-compare-years', style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.dim, marginBottom: 4 } }, [
              h('span', { key: 'a' }, __alloT('stem.treelab.compare_years', 'Years to run')),
              h('span', { key: 'b', style: { fontWeight: 700, color: T.text } }, String(years))
            ]),
            h('input', {
              key: 'i', id: 'treelab-compare-years', type: 'range', min: 20, max: 400, step: 10, value: years,
              onChange: function (e) { upd('compareYears', parseInt(e.target.value, 10)); },
              style: { width: '100%', accentColor: T.accent }
            }),
            h('div', { key: 'ticks', className: 'allo-tree-compare-timeline-ticks', 'aria-hidden': 'true' }, [
              h('span', { key: '20' }, '20'), h('span', { key: '100' }, '100'),
              h('span', { key: '200' }, '200'), h('span', { key: '400' }, '400')
            ])
          ]),
          compareChart(runs, years, maxH),
          compareInsightPanel(runs, years)
        ], undefined, 'allo-tree-compare-hero')];
        kids.push(compareReasoningTrail(runs, years));

        var speciesCards = [];
        runs.forEach(function (r, ri) {
          var isCurrent = r.sp.id === sp.id;
          var W = 100, H = 44;
          var span = Math.max(1, Math.ceil(years / 2));   // one sample every other year
          var pts = r.track.map(function (v, i) {
            var x = (i / span) * W;
            return x.toFixed(1) + ',' + (H - (v / maxH) * (H - 2)).toFixed(1);
          }).join(' ');
          // The card wears the same hue (and, in high contrast, the same dash) as the
          // species' line on the shared chart above — one identity, two places.
          var cardHue = isContrast ? T.accent : (isDark ? SPECIES_HUE_DARK : SPECIES_HUE_LIGHT)[ri % 5];
          var cardDash = isContrast ? SPECIES_DASH[ri % 5] : '';
          var lastPX = r.track.length ? ((r.track.length - 1) / span) * W : 0;
          speciesCards.push(h('div', { key: r.sp.id, className: 'allo-tree-species-slot' }, card([
            h('div', { key: 'hd', className: 'allo-tree-species-card-head', style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' } }, [
              h('div', { key: 'a', style: { fontWeight: 700, color: T.text, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 } }, [
                isContrast ? null : h('span', {
                  key: 'sw', 'aria-hidden': 'true',
                  style: { width: 10, height: 10, borderRadius: 3, background: cardHue, flex: '0 0 auto', display: 'inline-block' }
                }),
                h('span', { key: 'tx' },
                  r.sp.emoji + ' ' + __alloT('stem.treelab.species_' + r.sp.id, r.sp.name)
                  + (isCurrent ? ' · ' + __alloT('stem.treelab.your_tree', 'your tree') : ''))
              ]),
              h('div', { key: 'b', style: { fontSize: 12, color: T.dim } },
                r.diedAt
                  ? __alloT('stem.treelab.died_at', 'died at ') + r.diedAt + ' ' + __alloT('stem.treelab.yr', 'yr')
                    + ' · ' + (r.cause === 'senescence'
                      ? __alloT('stem.treelab.of_old_age', 'old age')
                      : __alloT('stem.treelab.starved', 'starved'))
                  : round(r.tree.heightM, 1) + ' m · ' + round(r.tree.dbhCm, 0) + ' cm')
            ]),
            h('svg', {
              key: 'spark', className: 'allo-tree-species-spark', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none',
              style: { width: '100%', height: 52, marginTop: 6, background: T.cardAlt, borderRadius: 6, border: '1px solid ' + (isCurrent ? T.accent : T.border) },
              role: 'img',
              'aria-label': __alloT('stem.treelab.species_' + r.sp.id, r.sp.name) + ': '
                + (r.diedAt ? __alloT('stem.treelab.died_at', 'died at ') + r.diedAt : round(r.tree.heightM, 1) + ' metres')
                + ' ' + __alloT('stem.treelab.after_years', 'after ') + years + ' ' + __alloT('stem.treelab.yr', 'yr')
            }, [
              h('line', { key: 'base', x1: 0, y1: H - 1, x2: W, y2: H - 1, stroke: T.border, strokeWidth: 0.6 }),
              // Area under the curve, so the card reads as a filled height profile
              // rather than a hairline in a grey box. Skipped in high contrast, where
              // a translucent fill is just a smear over black.
              (pts && !isContrast) ? h('polygon', {
                key: 'fill', points: pts + ' ' + lastPX.toFixed(1) + ',' + (H - 1) + ' 0,' + (H - 1),
                fill: cardHue, fillOpacity: isDark ? 0.16 : 0.12, stroke: 'none'
              }) : null,
              pts ? h('polyline', { key: 'ln', points: pts, fill: 'none', stroke: cardHue, strokeWidth: isCurrent ? 2 : 1.4, strokeDasharray: cardDash || undefined, vectorEffect: 'non-scaling-stroke' }) : null,
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
            speciesTraitProfile(r.sp, r.clonal),
            atLeast(band, 'g35') ? h('div', { key: 'why', className: 'allo-tree-species-why', style: { fontSize: 11, color: T.dim, marginTop: 6, lineHeight: 1.5 } },
              (r.clonal
                ? __alloT('stem.treelab.cmp_clonal', 'Can copy itself without seeds. ')
                : __alloT('stem.treelab.cmp_seed', 'Seed only — no clonal route. '))
              + __alloT('stem.treelab.cmp_life', 'Lifespan about ') + r.sp.maxAgeYears + ' ' + __alloT('stem.treelab.yr', 'yr')
              + ', ' + __alloT('stem.treelab.cmp_max', 'tops out near ') + r.sp.maxHeight + ' m.') : null
          ], { borderTop: '4px solid ' + cardHue }, 'allo-tree-species-card' + (isCurrent ? ' is-current' : ''))));
        });
        kids.push(h('section', {
          key: 'species', className: 'allo-tree-species-stage',
          'aria-label': __alloT('stem.treelab.species_strategies', 'Five species strategies')
        }, [
          h('div', { key: 'guide' }, flowMarker('2',
            __alloT('stem.treelab.read_strategies', 'Read the strategies'),
            __alloT('stem.treelab.read_strategies_copy', 'Trace each outcome back to tolerance, defense, lifespan, and reproductive route.'))),
          h('div', { key: 'grid', className: 'allo-tree-species-grid' }, speciesCards)
        ]));

        kids.push(card([
          modelNote(__alloT('stem.treelab.compare_note',
            'One run each, under one set of conditions. A species that loses here is not a worse tree — it is a tree built for different conditions. Change the light or the water on the Grow tab and the order can change.'))
          ,h('div', { key: 'next', className: 'allo-tree-compare-next' }, [
            h('span', { key: 'i', className: 'allo-tree-compare-next-icon', 'aria-hidden': 'true' }, '\uD83D\uDD0E'),
            h('div', { key: 'c', className: 'allo-tree-compare-next-copy' }, [
              h('strong', { key: 't' }, __alloT('stem.treelab.try_controlled_change', 'Try one controlled change')),
              h('span', { key: 'p' }, __alloT('stem.treelab.try_controlled_change_copy', 'Change only light or water, run the same time window, and explain why the order changed.'))
            ]),
            btn('grow', __alloT('stem.treelab.change_in_grow', 'Change conditions in Grow') + ' ' + ARROW, function () { activateChapter('grow', 'heading'); }, { small: true })
          ])
        ], undefined, 'allo-tree-compare-conclusion'));
        return kids;
      }

      function quizMeta(qKey) {
        var kind = 'evidence';
        if ([0, 9, 13, 14].indexOf(qKey) >= 0) kind = 'limiting';
        else if (qKey === 1) kind = 'tradeoff';
        else if ([2, 10, 11].indexOf(qKey) >= 0) kind = 'transport';
        else if ([3, 4, 6].indexOf(qKey) >= 0) kind = 'structure';
        else if ([5, 7].indexOf(qKey) >= 0) kind = 'reproduction';
        else if (qKey === 8) kind = 'adaptation';

        var raw = {
          limiting: {
            icon: '\u2600\uFE0F', topic: 'Limiting factors', move: 'Find the bottleneck',
            prompt: 'Name the resource or process with the least headroom, then predict what changing it can and cannot fix.'
          },
          tradeoff: {
            icon: '\uD83D\uDCA7', topic: 'Water-carbon trade-off', move: 'Trace both sides',
            prompt: 'Follow what the stomata save and what their closure prevents from entering.'
          },
          transport: {
            icon: '\u2195\uFE0F', topic: 'Transport', move: 'Trace source to sink',
            prompt: 'Name what moves, the tissue it uses, and where it is needed.'
          },
          structure: {
            icon: '\u25CE', topic: 'Structure and carbon', move: 'Connect form to cost',
            prompt: 'Ask how size or tissue changes both physical support and the maintenance bill.'
          },
          reproduction: {
            icon: '\uD83C\uDF31', topic: 'Reproduction', move: 'Weigh benefit and risk',
            prompt: 'Name what the strategy gains in reliability and what it gives up in distance or diversity.'
          },
          adaptation: {
            icon: '\uD83C\uDF32', topic: 'Seasonal adaptation', move: 'Match trait to opportunity',
            prompt: 'Connect a physical trait to the brief conditions in which it becomes useful.'
          },
          evidence: {
            icon: '\uD83D\uDD0E', topic: 'Scientific evidence', move: 'Change one thing',
            prompt: 'Hold every other condition steady so the result can point to one cause.'
          }
        };
        var item = raw[kind];
        if (band === 'k2') {
          var young = {
            limiting: { icon: item.icon, topic: 'What the tree needs', move: 'Find what is missing', prompt: 'Look for what the tree needs most. Then say what might happen if it gets more.' },
            reproduction: { icon: item.icon, topic: 'New trees', move: 'See how it begins', prompt: 'Decide whether the new tree begins from a seed or from part of the parent tree.' },
            evidence: { icon: item.icon, topic: 'Tree clues', move: 'Change one thing', prompt: 'Keep everything else the same so you can tell which change mattered.' }
          };
          item = young[kind] || item;
        }
        var metaKey = kind + (band === 'k2' ? '_k2' : '');
        return {
          icon: item.icon,
          topic: __alloT('stem.treelab.quiz_topic_' + metaKey, item.topic),
          move: __alloT('stem.treelab.quiz_move_' + metaKey, item.move),
          prompt: __alloT('stem.treelab.quiz_prompt_' + metaKey, item.prompt)
        };
      }

      function quizFinale(progress, pool) {
        var ratio = progress.right / Math.max(1, progress.total);
        var title, copy;
        if (progress.right === progress.total) {
          title = __alloT('stem.treelab.finale_full_title', 'A full canopy of explanations');
          copy = __alloT('stem.treelab.finale_full_copy', 'You can trace the tree story from resources to descendants and defend each link with evidence.');
        } else if (ratio >= 0.7) {
          title = __alloT('stem.treelab.finale_strong_title', 'Strong branches of understanding');
          copy = __alloT('stem.treelab.finale_strong_copy', 'Most branches are strong. Revisit the looping leaves to strengthen the mechanisms that still feel uncertain.');
        } else {
          title = __alloT('stem.treelab.finale_growing_title', 'Your canopy is still growing');
          copy = __alloT('stem.treelab.finale_growing_copy', 'This is a map of where to explore next. Revisit the looping leaves, use the explanation, and try again.');
        }
        if (band === 'k2') {
          if (progress.right === progress.total) {
            title = __alloT('stem.treelab.finale_full_title_k2', 'A full canopy of ideas');
            copy = __alloT('stem.treelab.finale_full_copy_k2', 'You followed the tree from sunlight and water to seeds and new shoots.');
          } else if (ratio >= 0.7) {
            title = __alloT('stem.treelab.finale_strong_title_k2', 'Your ideas have strong branches');
            copy = __alloT('stem.treelab.finale_strong_copy_k2', 'Most ideas are connected. Try the looping questions again to grow the last few leaves.');
          } else {
            title = __alloT('stem.treelab.finale_growing_title_k2', 'Your ideas are still growing');
            copy = __alloT('stem.treelab.finale_growing_copy_k2', 'Use the clue under each question, then try the looping leaves again.');
          }
        }

        var ladder = [
          {
            n: '1', title: __alloT('stem.treelab.claim', 'Claim'),
            copy: band === 'k2' ? __alloT('stem.treelab.claim_copy_k2', 'Say what you think.') : __alloT('stem.treelab.claim_copy', 'State what the tree is doing.')
          },
          {
            n: '2', title: __alloT('stem.treelab.evidence', 'Evidence'),
            copy: band === 'k2' ? __alloT('stem.treelab.evidence_copy_k2', 'Point to what you saw.') : __alloT('stem.treelab.evidence_copy', 'Name the observation or model output.')
          },
          {
            n: '3', title: __alloT('stem.treelab.reasoning', 'Reasoning'),
            copy: band === 'k2' ? __alloT('stem.treelab.reasoning_copy_k2', 'Tell how the clue supports your idea.') : __alloT('stem.treelab.reasoning_copy', 'Link the evidence to a biological mechanism.')
          }
        ];
        var finaleSeen = d.quizSeen || {};
        var firstWrong = 0;
        for (var reviewIdx = 0; reviewIdx < pool.length; reviewIdx++) {
          if (finaleSeen[QUIZ.indexOf(pool[reviewIdx])] === 'wrong') {
            firstWrong = reviewIdx;
            break;
          }
        }

        return card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' },
            __alloT('stem.treelab.reflection_clearing', 'Reflection clearing')),
          h('div', { key: 'celebrate', className: 'allo-tree-quiz-celebration' }, [
            h('div', { key: 'mark', className: 'allo-tree-quiz-finale-mark', 'aria-hidden': 'true' }, [
              h('span', { key: 'a' }, '\uD83C\uDF3F'),
              h('span', { key: 'b' }, '\u2713')
            ]),
            h('div', { key: 'copy', className: 'allo-tree-quiz-finale-copy' }, [
              h('h2', { key: 'title' }, title),
              h('p', { key: 'body' }, copy),
              h('strong', { key: 'score' },
                progress.right + ' / ' + progress.total + ' ' + __alloT('stem.treelab.finale_score', 'ideas connected on your latest attempts'))
            ])
          ]),
          h('div', {
            key: 'ladder', className: 'allo-tree-quiz-reasoning-ladder',
            'aria-label': __alloT('stem.treelab.explanation_structure', 'Explanation structure')
          }, ladder.map(function (step) {
            return h('div', { key: step.n, className: 'allo-tree-quiz-reasoning-step' }, [
              h('span', { key: 'n', className: 'allo-tree-quiz-reasoning-number' }, step.n),
              h('strong', { key: 't' }, step.title),
              h('span', { key: 'c' }, step.copy)
            ]);
          })),
          h('p', { key: 'note', className: 'allo-tree-quiz-finale-note' },
            band === 'k2'
              ? __alloT('stem.treelab.finale_note_k2', 'The score shows where you are today. The big goal is to tell the tree story and point to clues.')
              : __alloT('stem.treelab.finale_note', 'A score is a trail marker, not the destination. The real goal is an explanation you can defend with evidence.')),
          h('div', { key: 'actions', className: 'allo-tree-quiz-finale-actions' }, [
            btn('review', __alloT('stem.treelab.review_questions', 'Review the questions'), function () {
              updMulti({ quizIdx: firstWrong, quizPick: null });
            }, { small: true }),
            btn('experiment', (band === 'k2' ? __alloT('stem.treelab.run_another_experiment_k2', 'Try another tree test') : __alloT('stem.treelab.run_another_experiment', 'Run another experiment')) + ' ' + ARROW, function () {
              activateChapter('grow', 'heading');
            }, { small: true })
          ])
        ], undefined, 'allo-tree-quiz-finale');
      }

      function viewQuiz() {
        var pool = QUIZ.filter(function (q) { return bandRank(band) >= bandRank(q.band); });
        if (pool.length === 0) pool = QUIZ.slice(0, 3);
        var idx = clamp(Math.round(Number(d.quizIdx) || 0), 0, pool.length - 1);
        var q = pool[idx];
        // Key against the full bank, not the filtered pool: a different grade band shows a
        // different subset, and a pool-relative key would hand question 3 the translation
        // written for question 5.
        var qKey = QUIZ.indexOf(q);
        var savedPicks = d.quizPicks && typeof d.quizPicks === 'object' ? d.quizPicks : {};
        var hasStoredPick = Object.prototype.hasOwnProperty.call(savedPicks, qKey);
        var rawPickValue = hasStoredPick ? savedPicks[qKey] : (d.quizPickKey === qKey ? d.quizPick : null);
        var rawPicked = rawPickValue == null || rawPickValue === '' ? NaN : Number(rawPickValue);
        var pickMatchesQuestion = hasStoredPick || d.quizPickKey === qKey;
        var picked = pickMatchesQuestion && isFinite(rawPicked) && Math.floor(rawPicked) === rawPicked
          && rawPicked >= 0 && rawPicked < q.a.length ? rawPicked : null;
        var answered = picked != null;
        var progress = quizProgress(pool);
        var meta = quizMeta(qKey);
        var prior = (d.quizSeen || {})[qKey] || null;
        if (prior !== 'right' && prior !== 'wrong') prior = null;
        var storyTabs = (TABS || []).filter(function (tab) { return tab.id !== 'quiz'; });

        var kids = [card([
          h('div', { key: 'eyebrow', className: 'allo-tree-story-eyebrow' },
            __alloT('stem.treelab.quiz_eyebrow', 'Canopy of understanding')),
          heading(band === 'k2' ? __alloT('stem.treelab.check_k2', 'Show what you know') : __alloT('stem.treelab.check', 'Knowledge check'),
            __alloT('stem.treelab.check_sub', 'Question ') + (idx + 1) + ' / ' + pool.length + ' · ' + bandLabel(band)),
          h('section', {
            key: 'story', className: 'allo-tree-quiz-story',
            'aria-label': __alloT('stem.treelab.forest_story', 'The forest story you built')
          }, [
            h('div', { key: 'title', className: 'allo-tree-quiz-story-title' },
              __alloT('stem.treelab.forest_story', 'The forest story you built')),
            h('div', { key: 'path', className: 'allo-tree-quiz-story-path' }, storyTabs.map(function (tab, storyIdx) {
              return h('div', {
                key: tab.id, className: 'allo-tree-quiz-story-node',
                'data-story-chapter': tab.id
              }, [
                h('span', { key: 'n', className: 'allo-tree-quiz-story-number', 'aria-hidden': 'true' }, String(storyIdx + 1)),
                h('span', { key: 'i', className: 'allo-tree-quiz-story-icon', 'aria-hidden': 'true' }, tab.icon),
                h('span', { key: 'copy', className: 'allo-tree-quiz-story-copy' }, [
                  h('strong', { key: 'label' }, tab.label),
                  h('span', { key: 'hint' }, tab.hint)
                ])
              ]);
            }))
          ]),
          scoreStrip(pool, idx),
          h('div', { key: 'qhead', className: 'allo-tree-quiz-question-head' }, [
            h('span', { key: 'icon', className: 'allo-tree-quiz-topic-icon', 'aria-hidden': 'true' }, meta.icon),
            h('span', { key: 'topic', className: 'allo-tree-quiz-topic-copy' }, [
              h('span', { key: 'label' }, meta.topic),
              h('strong', { key: 'move' }, meta.move)
            ]),
            h('span', { key: 'count', className: 'allo-tree-quiz-question-count' },
              __alloT('stem.treelab.idea', 'Idea') + ' ' + (idx + 1) + ' / ' + pool.length)
          ]),
          prior && !answered ? h('div', {
            key: 'revisit', className: 'allo-tree-quiz-revisit ' + (prior === 'wrong' ? 'is-retry' : 'is-connected')
          }, [
            h('span', { key: 'i', 'aria-hidden': 'true' }, prior === 'wrong' ? '\u21BB' : '\u2713'),
            h('span', { key: 't' }, prior === 'wrong'
              ? (band === 'k2'
                ? __alloT('stem.treelab.try_idea_again_k2', 'Try this idea again and use the clue to help.')
                : __alloT('stem.treelab.try_idea_again', 'Try this idea again and use the reasoning move as your guide.'))
              : __alloT('stem.treelab.revisit_connected', 'You connected this idea before. Revisit it to make the explanation even stronger.'))
          ]) : null,
          h('p', { key: 'q', className: 'allo-tree-quiz-question', style: { fontSize: 14, color: T.text, lineHeight: 1.6, marginBottom: 10, fontWeight: 600 } },
            __alloT('stem.treelab.quiz' + qKey + '_q', q.q)),
          h('div', { key: 'opts', className: 'allo-tree-quiz-options', role: 'group', 'aria-label': __alloT('stem.treelab.answer_choices', 'Answer choices') }, q.a.map(function (opt, i) {
            var isCorrect = i === q.correct;
            var chosen = picked === i;
            var bg = T.cardAlt, bd = T.border;
            if (answered && isCorrect) { bg = isContrast ? '#003300' : (isDark ? '#14532d' : '#dcfce7'); bd = T.good; }
            else if (answered && chosen) { bg = isContrast ? '#330000' : (isDark ? '#7f1d1d' : '#fee2e2'); bd = T.bad; }
            // The letter lives in a chip rather than running into the sentence, and
            // once answered the chip flips to ✓/✕ — the verdict is readable at the
            // left edge without re-parsing row colours. The letter stays in the
            // accessible name via aria-label on the button.
            // Dark theme's good/bad are light tints, so the glyph goes dark there.
            var chipBg = T.cardAlt, chipBd = T.border, chipTx = T.dim, chipGlyph = String.fromCharCode(65 + i);
            if (answered && isCorrect) { chipBg = T.good; chipBd = T.good; chipTx = isContrast ? '#000000' : (isDark ? '#052e16' : '#ffffff'); chipGlyph = '✓'; }
            else if (answered && chosen) { chipBg = T.bad; chipBd = T.bad; chipTx = isContrast ? '#000000' : (isDark ? '#450a0a' : '#ffffff'); chipGlyph = '✕'; }
            return h('button', {
              key: 'o' + i, type: 'button', disabled: answered,
              className: 'allo-tree-quiz-opt'
                + (answered && isCorrect ? ' is-correct' : (answered && chosen ? ' is-chosen-wrong' : '')),
              'aria-label': String.fromCharCode(65 + i) + '. ' + __alloT('stem.treelab.quiz' + qKey + '_opt' + i, opt),
              onClick: function () {
                var seen = Object.assign({}, d.quizSeen || {});
                var picks = Object.assign({}, d.quizPicks || {});
                var wasRight = seen[qKey] === 'right';
                seen[qKey] = isCorrect ? 'right' : 'wrong';
                picks[qKey] = i;
                updMulti({ quizPick: i, quizPickKey: qKey, quizPicks: picks, quizSeen: seen });
                if (isCorrect) {
                  sfxGrow();
                  if (!wasRight) xp(3);
                  srSay(__alloT('stem.treelab.correct', 'Correct.'));
                } else {
                  sfxBad();
                  srSay(__alloT('stem.treelab.not_quite', 'Not quite.'));
                }
              },
              style: {
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '9px 12px', marginBottom: 6, borderRadius: 10, border: '1px solid ' + bd,
                background: bg, color: T.text, fontSize: 13,
                cursor: answered ? 'default' : 'pointer', lineHeight: 1.5
              }
            }, [
              h('span', {
                key: 'chip', 'aria-hidden': 'true',
                style: {
                  flex: '0 0 auto', width: 26, height: 26, borderRadius: '50%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid ' + chipBd, background: chipBg, color: chipTx,
                  fontSize: 12, fontWeight: 800
                }
              }, chipGlyph),
              h('span', { key: 'tx' }, __alloT('stem.treelab.quiz' + qKey + '_opt' + i, opt))
            ]);
          })),
          answered ? h('section', {
            key: 'why',
            className: 'allo-tree-quiz-feedback ' + (picked === q.correct ? 'is-connected' : 'is-rethink')
          }, [
            h('div', { key: 'status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, [
              h('div', { key: 'head', className: 'allo-tree-quiz-feedback-head' }, [
                h('span', { key: 'icon', className: 'allo-tree-quiz-feedback-icon', 'aria-hidden': 'true' },
                  picked === q.correct ? '\u2713' : '\u21BB'),
                h('span', { key: 'copy', className: 'allo-tree-quiz-feedback-copy' }, [
                  h('span', { key: 'label' }, picked === q.correct
                    ? (band === 'k2' ? __alloT('stem.treelab.evidence_connected_k2', 'You used the clue') : __alloT('stem.treelab.evidence_connected', 'Evidence connected'))
                    : (band === 'k2' ? __alloT('stem.treelab.revise_model_k2', 'Not yet - look at the clue') : __alloT('stem.treelab.revise_model', 'Not yet - revise the model'))),
                  h('strong', { key: 'move' }, meta.move)
                ])
              ]),
              h('div', { key: 'evidence', className: 'allo-tree-quiz-evidence' }, [
                h('strong', { key: 'label' }, band === 'k2' ? __alloT('stem.treelab.evidence_from_tree_k2', 'Clue from the tree') : __alloT('stem.treelab.evidence_from_tree', 'Evidence from the tree')),
                h('p', { key: 'why' }, __alloT('stem.treelab.quiz' + qKey + '_why', q.why))
              ]),
              h('div', { key: 'reason', className: 'allo-tree-quiz-scientist-move' }, [
                h('span', { key: 'label' }, band === 'k2' ? __alloT('stem.treelab.scientist_move_k2', 'Try this thinking move') : __alloT('stem.treelab.scientist_move', 'Scientist move')),
                h('p', { key: 'prompt' }, meta.prompt)
              ])
            ]),
            picked !== q.correct ? h('div', { key: 'retry', className: 'allo-tree-quiz-feedback-actions' }, [
              btn('retry', __alloT('stem.treelab.try_again', 'Try again'), function () {
                var retryPicks = Object.assign({}, d.quizPicks || {});
                delete retryPicks[qKey];
                updMulti({ quizPick: null, quizPickKey: qKey, quizPicks: retryPicks });
                srSay(__alloT('stem.treelab.try_again_ready', 'Ready to try this idea again.'));
              }, { small: true })
            ]) : null
          ]) : null,
          h('div', { key: 'nav', className: 'allo-tree-quiz-nav', 'aria-label': __alloT('stem.treelab.question_navigation', 'Question navigation') }, [
            btn('prev', '← ' + __alloT('stem.treelab.prev', 'Previous'), function () { updMulti({ quizIdx: Math.max(0, idx - 1), quizPick: null }); }, { small: true, disabled: idx === 0 }),
            h('span', { key: 'position', className: 'allo-tree-quiz-nav-position' },
              (idx + 1) + ' / ' + pool.length),
            btn('next', __alloT('stem.treelab.next', 'Next') + ' →', function () { updMulti({ quizIdx: Math.min(pool.length - 1, idx + 1), quizPick: null }); }, { small: true, disabled: idx >= pool.length - 1 })
          ])
        ], undefined, 'allo-tree-quiz-experience')];
        if (progress.done === progress.total) kids.push(quizFinale(progress, pool));
        return kids;
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
      if (band === 'k2') {
        TABS.forEach(function (tab) {
          if (tab.id === 'chem') tab.label = __alloT('stem.treelab.tab_chem_k2', 'Tree Food');
          else if (tab.id === 'spread') tab.label = __alloT('stem.treelab.tab_spread_k2', 'New Trees');
          else if (tab.id === 'quiz') tab.label = __alloT('stem.treelab.tab_quiz_k2', 'Show It');
        });
      }
      var TAB_GUIDE = {
        grow: {
          hint: band === 'k2' ? __alloT('stem.treelab.tab_grow_hint_k2', 'Help a tree grow') : __alloT('stem.treelab.tab_grow_hint', 'Run the life cycle'),
          title: __alloT('stem.treelab.chapter_grow', 'Grow a tree through time'),
          intro: band === 'k2' ? __alloT('stem.treelab.chapter_grow_intro_k2', 'Change sunlight, water, air, or warmth. Let years pass and see how the tree responds.') : __alloT('stem.treelab.chapter_grow_intro', 'Change one condition, advance the years, and watch the living carbon budget respond.'),
          cue: __alloT('stem.treelab.chapter_grow_cue', 'Start here: try one change, then grow 10 years.')
        },
        chem: {
          hint: band === 'k2' ? __alloT('stem.treelab.tab_chem_hint_k2', 'See what the tree needs') : __alloT('stem.treelab.tab_chem_hint', 'Find the bottleneck'),
          title: band === 'k2' ? __alloT('stem.treelab.chapter_chem_k2', 'See how a tree makes food') : __alloT('stem.treelab.chapter_chem', 'Discover what limits growth'),
          intro: band === 'k2' ? __alloT('stem.treelab.chapter_chem_intro_k2', 'Change light, water, air, or warmth and see which ingredient the tree needs more of.') : __alloT('stem.treelab.chapter_chem_intro', 'Read the response curves and see why adding more of everything does not always help.'),
          cue: band === 'k2' ? __alloT('stem.treelab.chapter_chem_cue_k2', 'Find the ingredient with the smallest help bar.') : __alloT('stem.treelab.chapter_chem_cue', 'Look for the factor with the least headroom.')
        },
        transport: {
          hint: __alloT('stem.treelab.tab_transport_hint', 'Trace two flows'),
          title: __alloT('stem.treelab.chapter_transport', 'Follow water and sugar'),
          intro: __alloT('stem.treelab.chapter_transport_intro', 'Trace xylem upward and phloem from each carbon source to the places that need it.'),
          cue: __alloT('stem.treelab.chapter_transport_cue', 'Water and sugar move through different tissues.')
        },
        spread: {
          hint: band === 'k2' ? __alloT('stem.treelab.tab_spread_hint_k2', 'Try seeds and shoots') : __alloT('stem.treelab.tab_spread_hint', 'Build a forest'),
          title: band === 'k2' ? __alloT('stem.treelab.chapter_spread_k2', 'Help new trees begin') : __alloT('stem.treelab.chapter_spread', 'Make the next generation'),
          intro: band === 'k2' ? __alloT('stem.treelab.chapter_spread_intro_k2', 'Use the tree\'s saved food for seeds or new shoots. See which ones start growing.') : __alloT('stem.treelab.chapter_spread_intro', 'Spend stored carbon on seeds or clones and see how distance, survival, and diversity trade off.'),
          cue: band === 'k2'
            ? (sp.modes.some(function (modeId) { var mode = strategyById(modeId); return mode && mode.diversity === 0; })
              ? __alloT('stem.treelab.chapter_spread_cue_k2', 'Try seeds and shoots, then let 10 years pass.')
              : __alloT('stem.treelab.chapter_spread_seed_cue_k2', 'Try the two kinds of seed, then let 10 years pass.'))
            : (sp.modes.some(function (modeId) {
              var mode = strategyById(modeId);
              return mode && mode.diversity === 0;
            })
              ? __alloT('stem.treelab.chapter_spread_cue', 'Try a mixed strategy, then run another decade.')
              : __alloT('stem.treelab.chapter_spread_seed_cue', 'Compare two seed routes, then run another decade.'))
        },
        compare: {
          hint: __alloT('stem.treelab.tab_compare_hint', 'Test tree strategies'),
          title: __alloT('stem.treelab.chapter_compare', 'Compare five ways to be a tree'),
          intro: __alloT('stem.treelab.chapter_compare_intro', 'Keep the climate fixed and reveal how each species strategy changes the outcome.'),
          cue: __alloT('stem.treelab.chapter_compare_cue', 'Same conditions. Different biology.')
        },
        quiz: {
          hint: band === 'k2' ? __alloT('stem.treelab.tab_quiz_hint_k2', 'Show what you know') : __alloT('stem.treelab.tab_quiz_hint', 'Show your thinking'),
          title: band === 'k2' ? __alloT('stem.treelab.chapter_quiz_k2', 'Tell the tree\'s story') : __alloT('stem.treelab.chapter_quiz', 'Check the story you can explain'),
          intro: band === 'k2' ? __alloT('stem.treelab.chapter_quiz_intro_k2', 'Answer one idea at a time. Use each clue to make your thinking stronger.') : __alloT('stem.treelab.chapter_quiz_intro', 'Answer one idea at a time and use the feedback to strengthen your biological reasoning.'),
          cue: band === 'k2' ? __alloT('stem.treelab.chapter_quiz_cue_k2', 'Read the clue after every answer.') : __alloT('stem.treelab.chapter_quiz_cue', 'Read the explanation after every answer.')
        }
      };
      TABS.forEach(function (tab) {
        var guide = TAB_GUIDE[tab.id] || TAB_GUIDE.grow;
        tab.hint = guide.hint;
        tab.chapterTitle = guide.title;
        tab.chapterIntro = guide.intro;
        tab.chapterCue = guide.cue;
      });
      if (!TABS.some(function (t) { return t.id === view; })) view = 'grow';
      var activeTabIndex = Math.max(0, TABS.map(function (t) { return t.id; }).indexOf(view));
      var activeTab = TABS[activeTabIndex] || TABS[0];
      function revealTabNode(node, focusTarget) {
        if (!node || !node.parentElement) return;
        var rail = node.parentElement;
        var left = Math.max(0, node.offsetLeft - Math.max(0, rail.clientWidth - node.offsetWidth) / 2);
        if (rail.getAttribute('data-tree-revealed') !== node.id) {
          rail.setAttribute('data-tree-revealed', node.id);
          if (rail.scrollWidth > rail.clientWidth) {
            try {
              if (rail.scrollTo) rail.scrollTo({ left: left, behavior: reduceMotion ? 'auto' : 'smooth' });
              else rail.scrollLeft = left;
            } catch (e) { rail.scrollLeft = left; }
          }
        }
        if (focusTarget === 'tab' && node.focus) {
          try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); }
        } else if (focusTarget === 'heading' && typeof document !== 'undefined') {
          var chapterHeading = document.getElementById('treelab-chapter-title');
          if (chapterHeading && chapterHeading.focus) {
            try { chapterHeading.focus({ preventScroll: true }); } catch (e) { chapterHeading.focus(); }
          }
        }
      }

      function activateChapter(id, focusTarget) {
        var target = TABS.filter(function (tab) { return tab.id === id; })[0];
        if (!target) return;
        sfxTick();
        updMulti({ view: target.id, quizPick: null });
        srSay(target.label + ' ' + __alloT('stem.treelab.section', 'section') + '.');
        if (typeof document !== 'undefined') {
          setTimeout(function () {
            revealTabNode(document.getElementById('treelab-tab-' + target.id), focusTarget);
          }, 60);
        }
      }

      function bridgeCopy(fromId, toId) {
        var seams = {
          'grow:chem': 'You saw what helps growth. Next, discover how leaves turn those ingredients into food.',
          'chem:transport': 'You found the bottleneck. Next, follow water and sugar through the living tree.',
          'chem:spread': 'Leaves made sugar. Now use some of that saved food to help new trees begin.',
          'transport:spread': 'You traced the tree\'s supplies. Next, decide how stored food can begin a new generation.',
          'spread:compare': 'You tried ways to make new trees. Next, compare how whole species solve the same challenges.',
          'spread:quiz': 'You tried ways to make new trees. Now show the tree story you can explain.',
          'compare:quiz': 'You compared different tree strategies. Now connect the evidence into one explanation.'
        };
        var seamKey = fromId + ':' + toId;
        return __alloT('stem.treelab.bridge_' + fromId + '_' + toId,
          seams[seamKey] || 'Carry this idea into the next chapter and look for the new connection.');
      }

      function chapterBridge() {
        var previousTab = activeTabIndex > 0 ? TABS[activeTabIndex - 1] : null;
        var nextTab = activeTabIndex < TABS.length - 1 ? TABS[activeTabIndex + 1] : null;
        if (!nextTab) return null;
        return h('nav', {
          key: 'chapter-bridge', className: 'allo-tree-chapter-bridge',
          'aria-label': __alloT('stem.treelab.chapter_navigation', 'Chapter navigation'),
          'data-tree-next': nextTab.id
        }, [
          h('div', { key: 'copy', className: 'allo-tree-chapter-bridge-copy' }, [
            h('span', { key: 'eyebrow', className: 'allo-tree-chapter-bridge-eyebrow' },
              __alloT('stem.treelab.next_discovery', 'Next discovery')),
            h('strong', { key: 'title', className: 'allo-tree-chapter-bridge-title' }, nextTab.chapterTitle),
            h('span', { key: 'note', className: 'allo-tree-chapter-bridge-note' }, bridgeCopy(activeTab.id, nextTab.id)),
            h('span', { key: 'path', className: 'allo-tree-chapter-bridge-path', 'aria-hidden': 'true' }, [
              h('span', { key: 'from', className: 'allo-tree-chapter-bridge-node is-current' }, activeTab.icon + ' ' + activeTab.label),
              h('span', { key: 'arrow', className: 'allo-tree-chapter-bridge-path-arrow' }, ARROW),
              h('span', { key: 'to', className: 'allo-tree-chapter-bridge-node is-next' }, nextTab.icon + ' ' + nextTab.label)
            ])
          ]),
          h('div', { key: 'actions', className: 'allo-tree-chapter-bridge-actions' }, [
            previousTab ? btn('bridge-prev', '\u2190 ' + __alloT('stem.treelab.back_to', 'Back to') + ' ' + previousTab.label,
              function () { activateChapter(previousTab.id, 'heading'); }, { small: true, tone: 'ghost' }) : null,
            btn('bridge-next', __alloT('stem.treelab.continue_to', 'Continue to') + ' ' + nextTab.label + ' ' + ARROW,
              function () { activateChapter(nextTab.id, 'heading'); }, { small: true })
          ])
        ]);
      }

      function speciesContextText() {
        if (band !== 'k2') return __alloT('stem.treelab.species_note_' + sp.id, sp.note);
        var youngNotes = {
          oak: 'Oak trees grow slowly, become strong, and make acorns.',
          aspen: 'Aspen trees can grow new shoots from their roots, so many trunks may be connected.',
          willow: 'Willow trees grow quickly near water. A fallen twig can sometimes grow roots.',
          pine: 'Pine trees keep their needles in winter and send their seeds away in cones.',
          redwood: 'Redwood trees can grow very tall, wear thick bark, and make new shoots after damage.'
        };
        return __alloT('stem.treelab.species_note_' + sp.id + '_k2', youngNotes[sp.id] || sp.note);
      }

      function speciesToleranceLabel(value) {
        if (value >= 0.65) return __alloT('stem.treelab.trait_high', 'High');
        if (value >= 0.35) return __alloT('stem.treelab.trait_moderate', 'Moderate');
        return __alloT('stem.treelab.trait_low', 'Low');
      }

      function speciesIdentityCard() {
        var leafPlan = sp.leafType === 'needle'
          ? (band === 'k2'
            ? __alloT('stem.treelab.trait_needles_k2', 'Needles that stay')
            : __alloT('stem.treelab.trait_needles', 'Evergreen needles'))
          : (band === 'k2'
            ? __alloT('stem.treelab.trait_broadleaf_k2', 'Leaves that fall')
            : __alloT('stem.treelab.trait_broadleaf', 'Seasonal broad leaves'));
        var droughtLabel = speciesToleranceLabel(sp.droughtTol);
        var shadeLabel = speciesToleranceLabel(sp.shadeTol);
        var routeLabel = sp.modes.length + ' ' + (sp.modes.length === 1
          ? __alloT('stem.treelab.trait_route_one', 'route')
          : __alloT('stem.treelab.trait_route_many', 'routes'));

        function trait(key, label, value, meter) {
          return h('div', { key: key, className: 'allo-tree-species-trait' }, [
            h('dt', { key: 'l' }, label),
            h('dd', { key: 'v' }, value),
            meter == null ? null : h('span', { key: 'm', className: 'allo-tree-species-meter', 'aria-hidden': 'true' },
              h('span', { style: { width: Math.round(clamp(meter, 0, 1) * 100) + '%' } }))
          ]);
        }

        return h('aside', {
          key: 'sp-note',
          className: 'allo-tree-species-context',
          role: 'note',
          'data-tree-species-lens': sp.id,
          'aria-labelledby': 'treelab-species-context-name'
        }, [
          h('span', { key: 'portrait', className: 'allo-tree-species-portrait', 'aria-hidden': 'true' }, sp.emoji),
          h('div', { key: 'identity', className: 'allo-tree-species-identity' }, [
            h('span', { key: 'e', className: 'allo-tree-species-eyebrow' },
              band === 'k2'
                ? __alloT('stem.treelab.meet_tree_k2', 'Meet your tree')
                : __alloT('stem.treelab.species_lens', 'Species lens')),
            h('strong', { key: 'n', id: 'treelab-species-context-name', className: 'allo-tree-species-name' },
              __alloT('stem.treelab.species_' + sp.id, sp.name)),
            h('span', { key: 's', className: 'allo-tree-species-story' }, speciesContextText())
          ]),
          h('dl', { key: 'lens', className: 'allo-tree-species-lens' }, [
            trait('leaf',
              band === 'k2' ? __alloT('stem.treelab.trait_leaf_k2', 'Leaf kind') : __alloT('stem.treelab.trait_leaf', 'Leaf design'),
              leafPlan),
            trait('drought',
              band === 'k2' ? __alloT('stem.treelab.trait_drought_k2', 'Dry-weather fit') : __alloT('stem.treelab.trait_drought', 'Drought tolerance'),
              droughtLabel, sp.droughtTol),
            trait('shade',
              band === 'k2' ? __alloT('stem.treelab.trait_shade_k2', 'Shade fit') : __alloT('stem.treelab.trait_shade', 'Shade tolerance'),
              shadeLabel, sp.shadeTol),
            trait('routes',
              band === 'k2' ? __alloT('stem.treelab.trait_new_trees_k2', 'Ways to make new trees') : __alloT('stem.treelab.trait_reproduction', 'Reproduction'),
              routeLabel)
          ]),
          h('p', { key: 'trade', className: 'allo-tree-species-tradeoff' },
            band === 'k2'
              ? __alloT('stem.treelab.traits_tradeoff_k2', 'Every kind of tree has things it does well and places where another tree may do better.')
              : __alloT('stem.treelab.traits_tradeoff', 'These model traits are tradeoffs, not grades. An advantage in one environment can carry a cost in another.'))
        ]);
      }

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
        className: 'allo-tree-lab' + (d.viewerFull ? ' is-full' : '') + (reduceMotion ? ' is-reduced-motion' : ''),
        style: {
          '--tree-glow': isContrast ? 'transparent' : (isDark ? 'rgba(52,211,153,.11)' : 'rgba(16,185,129,.14)'),
          '--sun-glow': isContrast ? 'transparent' : (isDark ? 'rgba(251,191,36,.07)' : 'rgba(250,204,21,.13)'),
          '--hero-ring': isContrast ? 'transparent' : (isDark ? 'rgba(52,211,153,.08)' : 'rgba(255,255,255,.24)'),
          '--tree-shadow': isDark ? 'rgba(2,6,23,.32)' : 'rgba(15,23,42,.12)',
          '--accent-shadow': isDark ? 'rgba(52,211,153,.2)' : 'rgba(5,150,105,.2)',
          '--tree-focus': isContrast ? '#ffffff' : (isDark ? '#a7f3d0' : '#34d399'),
          '--tree-accent': T.accent,
          '--lab-edge': isContrast ? T.border : (isDark ? 'rgba(52,211,153,.16)' : 'rgba(5,150,105,.14)'),
          '--canopy-wash': isContrast ? 'transparent' : (isDark ? 'rgba(6,78,59,.2)' : 'rgba(167,243,208,.22)'),
          '--hero-speck': isContrast ? 'transparent' : (isDark ? 'rgba(167,243,208,.08)' : 'rgba(5,150,105,.08)'),
          '--hero-ring-soft': isContrast ? 'transparent' : (isDark ? 'rgba(52,211,153,.025)' : 'rgba(255,255,255,.13)'),
          '--hero-chip': isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.38)' : 'rgba(255,255,255,.78)'),
          '--hero-chip-border': T.border,
          '--tree-muted': T.dim,
          '--tree-ink': T.text,
          '--scene-edge': isContrast ? T.border : (isDark ? 'rgba(52,211,153,.35)' : 'rgba(5,150,105,.26)'),
          '--scene-shadow': isContrast ? 'transparent' : (isDark ? 'rgba(2,6,23,.45)' : 'rgba(6,78,59,.15)'),
          '--tab-icon': isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.28)' : 'rgba(255,255,255,.55)'),
          '--chapter-bg': isContrast ? T.card : (isDark ? 'linear-gradient(120deg,rgba(30,41,59,.96),rgba(16,53,48,.9))' : 'linear-gradient(120deg,rgba(255,255,255,.96),rgba(236,253,245,.94))'),
          '--chapter-border': T.border,
          '--accent-ink': T.onAccent,
          '--flow-badge': isContrast ? T.cardAlt : (isDark ? 'rgba(52,211,153,.08)' : 'rgba(5,150,105,.07)'),
          '--mission-border': isContrast ? T.border : (isDark ? '#2f6a5b' : '#86c9ae'),
          '--mission-bg': isContrast ? T.card : (isDark ? 'linear-gradient(145deg,#15322d,#172033)' : 'linear-gradient(145deg,#ecfdf5,#ffffff)'),
          '--mission-shadow': isContrast ? 'transparent' : (isDark ? 'rgba(2,6,23,.28)' : 'rgba(6,78,59,.1)'),
          '--mission-orb': isContrast ? 'transparent' : (isDark ? 'rgba(52,211,153,.07)' : 'rgba(16,185,129,.08)'),
          '--mission-step': isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.22)' : 'rgba(255,255,255,.7)'),
          background: isContrast ? T.bg : (isDark ? 'linear-gradient(180deg,#0b1f1c 0,#0f172a 390px,#0f172a 100%)' : 'linear-gradient(180deg,#eefaf4 0,#f8fafc 390px,#f8fafc 100%)'), color: T.text, padding: 16, borderRadius: 20, minHeight: 400, boxShadow: isContrast ? 'none' : (isDark ? '0 26px 70px rgba(2,6,23,.28)' : '0 26px 70px rgba(15,23,42,.08)')
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
          h('div', { key: 'a', className: 'allo-tree-hero-copy', style: { flex: '1 1 330px', position: 'relative', zIndex: 1 } }, [
            h('div', { key: 'eyebrow', style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', marginBottom: 8, borderRadius: 999, border: '1px solid ' + T.border, background: isContrast ? T.cardAlt : (isDark ? 'rgba(52,211,153,.1)' : 'rgba(255,255,255,.7)'), color: (isDark || isContrast) ? T.accent : '#047857', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' } },
              '● ' + __alloT('stem.treelab.studio_label', 'Living systems studio')),
            h('h3', { key: 't', className: 'allo-tree-hero-title', style: { fontSize: 25, lineHeight: 1.04, fontWeight: 900, letterSpacing: '-0.045em', margin: 0, color: T.text } },
              '🌳 ' + __alloT('stem.treelab.title', 'Tree Life Lab')),
            h('div', { key: 's', style: { fontSize: 13, color: T.dim, marginTop: 7, maxWidth: 570, lineHeight: 1.55 } },
              __alloT('stem.treelab.subtitle', 'Grow a tree through changing conditions, discover what limits it, and help it make the next generation.')),
            h('div', { key: 'quick', className: 'allo-tree-hero-stats' }, [
              h('span', { key: 'age', className: 'allo-tree-hero-stat' }, [
                h('span', { key: 'l', className: 'allo-tree-hero-stat-label' }, __alloT('stem.treelab.age', 'Age')),
                h('strong', { key: 'v', className: 'allo-tree-hero-stat-value' }, tree.age + ' ' + (tree.age === 1 ? __alloT('stem.treelab.year_one', 'year') : __alloT('stem.treelab.year_many', 'years')))
              ]),
              h('span', { key: 'height', className: 'allo-tree-hero-stat' }, [
                h('span', { key: 'l', className: 'allo-tree-hero-stat-label' }, __alloT('stem.treelab.height_label', 'Height')),
                h('strong', { key: 'v', className: 'allo-tree-hero-stat-value' }, round(tree.heightM, 1) + ' m ' + __alloT('stem.treelab.tall_short', 'tall'))
              ]),
              h('span', { key: 'carbon', className: 'allo-tree-hero-stat' }, [
                h('span', { key: 'l', className: 'allo-tree-hero-stat-label' }, band === 'k2' ? __alloT('stem.treelab.reproduction_bank_k2', 'Food saved for new trees') : __alloT('stem.treelab.reproduction_bank', 'Reproduction bank')),
                h('strong', { key: 'v', className: 'allo-tree-hero-stat-value', style: { color: tree.seedsBanked > 0 ? T.accent : T.text } }, spreadAmount(tree.seedsBanked))
              ])
            ])
          ]),
          h('div', { key: 'b', className: 'allo-tree-hero-controls', style: { display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1, padding: 8, borderRadius: 12, background: isContrast ? T.cardAlt : (isDark ? 'rgba(2,6,23,.34)' : 'rgba(255,255,255,.7)'), border: '1px solid ' + T.border } }, [
            h('div', { key: 'setup-label', className: 'allo-tree-setup-label' }, __alloT('stem.treelab.setup_tree', 'Set up your tree')),
            h('div', { key: 'band-field', className: 'allo-tree-hero-field', style: { display: 'flex', alignItems: 'center', gap: 6 } }, [
              h('label', { key: 'bl', htmlFor: 'treelab-band', style: { fontSize: 11, color: T.dim } },
              __alloT('stem.treelab.level', 'Level')),
            h('select', {
              key: 'bs', id: 'treelab-band', value: band,
              onChange: function (e) { upd('bandOverride', e.target.value); srSay(__alloT('stem.treelab.say_level_set', 'Level set to ') + bandLabel(e.target.value) + '.'); },
              style: { padding: '7px 10px', minHeight: 34, borderRadius: 9, background: T.card, color: T.text, border: '1px solid ' + T.border, fontSize: 12, fontWeight: 600 }
              }, BANDS.map(function (b) { return h('option', { key: b, value: b }, bandLabel(b)); }))
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
        h('div', { key: 'tabs', className: 'allo-tree-tabs', role: 'tablist', 'aria-label': __alloT('stem.treelab.tabs_label', 'Tree Life Lab sections'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, padding: 6, borderRadius: 14, background: T.card, border: '1px solid ' + T.border, boxShadow: isContrast ? 'none' : (isDark ? '0 8px 24px rgba(2,6,23,.2)' : '0 8px 24px rgba(15,23,42,.06)') } },
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
              'data-tree-current': selected ? 'true' : undefined,
              ref: selected ? function (node) { revealTabNode(node, null); } : undefined,
              onClick: function () { activateChapter(t.id, null); },
              onKeyDown: function (e) {
                var k = e.key;
                if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
                e.preventDefault();
                var next = ti;
                if (k === 'ArrowRight') next = (ti + 1) % TABS.length;
                else if (k === 'ArrowLeft') next = (ti - 1 + TABS.length) % TABS.length;
                else if (k === 'Home') next = 0;
                else next = TABS.length - 1;
                activateChapter(TABS[next].id, 'tab');
              },
              style: {
                display: 'flex', alignItems: 'center', gap: 9, flex: '1 1 152px', padding: '9px 12px', minHeight: 56, borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: '1px solid ' + (selected ? T.accent : T.border),
                background: selected ? ('linear-gradient(135deg,' + T.accent + ',' + (isContrast ? T.accent : (isDark ? '#6ee7b7' : '#10b981')) + ')') : 'transparent',
                color: selected ? T.onAccent : T.dim
              }
            }, [
              h('span', { key: 'i', className: 'allo-tree-tab-icon', 'aria-hidden': 'true' }, t.icon),
              h('span', { key: 'c', className: 'allo-tree-tab-copy' }, [
                h('span', { key: 'l', className: 'allo-tree-tab-label' }, t.label),
                h('span', { key: 'h', className: 'allo-tree-tab-hint' }, t.hint)
              ])
            ]);
          })),
        h('section', {
          key: 'chapter', className: 'allo-tree-chapter',
          'data-tree-chapter': activeTab.id,
          'aria-labelledby': 'treelab-chapter-title'
        }, [
          h('span', { key: 'n', className: 'allo-tree-chapter-number', 'aria-label': __alloT('stem.treelab.chapter_position', 'Chapter') + ' ' + (activeTabIndex + 1) + ' ' + __alloT('stem.treelab.of', 'of') + ' ' + TABS.length },
            (activeTabIndex + 1) + ' / ' + TABS.length),
          h('div', { key: 'copy' }, [
            h('h2', { key: 't', id: 'treelab-chapter-title', className: 'allo-tree-chapter-title', tabIndex: -1 }, activeTab.chapterTitle),
            h('div', { key: 'p', className: 'allo-tree-chapter-copy' }, activeTab.chapterIntro)
          ]),
          h('div', { key: 'cue', className: 'allo-tree-chapter-cue' }, activeTab.chapterCue)
        ]),
        h('div', {
          key: 'body-' + view, className: 'allo-tree-panel',
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
        view === 'quiz' ? null : speciesIdentityCard(),
        chapterBridge()
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
    configForHistorySnapshot: configForHistorySnapshot,
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
