/* Reef3DExplore 1.0.0: the free-swim scuba EXPLORE view of the Coral Reef
 * Survey Lab. Renderer setup, quality tiers, context loss, ResizeObserver,
 * visibility pause, throttled onState and dispose follow Reef3D
 * (reef_3d_engine.js). The coral, rock, rubble, algae and sponge builders,
 * the rock/coral/plant/caustic/water-surface/light-shaft/marine-snow shaders
 * and the caustic texture are copied and adapted from Reef3DHabitat
 * (reef_3d_habitat.js, itself adapted from Cephalopod Lab). Pointer look and
 * pinch follow BirdLab3D. Organisms come from window.Reef3DSpecies when it is
 * loaded, else from simple placeholders. Placement draws from seeded streams
 * keyed by species id; visual effects draw from their own streams, so the
 * quality tier, reduced motion and skipped effects never move an organism.
 * Keys are handled on the canvas only; options.THREE is required and no
 * global THREE is ever read.
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;
  var SOFT_EDGE = 25, HARD_EDGE = 29.5, SURFACE_Y = -0.9, NEAR_M = 8, NEARBY_MAX = 12;
  var DIVER_CLEAR = 0.8, DIVER_FLOOR = 0.45, GRID_MIN = -34, GRID_STEP = 0.5, GRID_N = 137, NONE = -1000;
  var STRUCTURES = ['reef_star', 'reef_ball', 'coral_tree_nursery'];
  var GROUPS = ['fish', 'reptile', 'invertebrate', 'coral', 'structure'];
  var HABITS = ['school', 'solitary', 'pair', 'sessile', 'bottom', 'crevice', 'hover'];
  var DECOR_H = { finger: 0.45, antler: 0.5, corym: 0.42, table: 0.42, massive: 0.42, brain: 0.4, plate: 0.47, encrust: 0.1, soft: 0.45, fan: 0.85, sponge: 0.42, algae: 0.34, deadstand: 0.36, rubble: 0.06, rock: 0.3 };
  var warnings = [];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function damp(rate, dt) { return 1 - Math.exp(-rate * dt); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(v, fallback) {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return fallback;
    v = Number(v); return isFinite(v) ? v : fallback;
  }
  function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashInt(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function seedValue(seed) { return typeof seed === 'string' ? hashInt(seed) | 0 : Math.floor(num(seed, 1)) | 0; }
  // Each concern owns a stream, so skipping one effect never shifts another.
  function stream(seed, salt) { return mulberry32((Math.imul(seed ^ 0x5bd1e995, 0x9E3779B1) ^ Math.imul(salt + 1, 0x85EBCA77)) | 0); }
  function hash2(a, b) {
    var h = Math.imul((a | 0) ^ 0x27D4EB2D, 0x9E3779B1) ^ Math.imul(((b | 0) + 0x165667B1) | 0, 0x85EBCA77);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  function noise2(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function noise3(x, y, z) {
    var iz = Math.floor(z), fz = z - iz; fz = fz * fz * (3 - 2 * fz);
    var a = noise2(x + iz * 31.7, y - iz * 17.3), b = noise2(x + (iz + 1) * 31.7, y - (iz + 1) * 17.3);
    return a + (b - a) * fz;
  }
  // Bearings are compass angles: 0 = north (-Z, up the slope), 90 = east (+X).
  function fwdX(b) { return Math.sin(b); }
  function fwdZ(b) { return -Math.cos(b); }
  function bearingTo(dx, dz) { return Math.atan2(dx, -dz); }
  function yawFor(b) { return Math.PI / 2 - b; } // models face +X
  function selectQuality(requested) {
    if (requested === 'low' || requested === 'high') return requested;
    var nav = global.navigator || {};
    // School Chromebooks report 4 or fewer cores and little memory.
    if ((nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) || (nav.deviceMemory && nav.deviceMemory <= 4)) return 'low';
    if (!(global.innerWidth < 640)) return 'high';
    var fine = false;
    try { fine = typeof global.matchMedia === 'function' && global.matchMedia('(pointer: fine)').matches; } catch (ignore) {}
    return fine ? 'high' : 'low';
  }
  function monotone(knots) {
    var n = knots.length, xs = [], ys = [], d = [], m = [], i;
    for (i = 0; i < n; i++) { xs.push(knots[i][0]); ys.push(knots[i][1]); }
    for (i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m.push(d[0]); for (i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2]);
    for (i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { var t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      var k = 0; while (x > xs[k + 1]) k++;
      var h = xs[k + 1] - xs[k], t = (x - xs[k]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
    };
  }

  // ---- Species facts used when Reef3DSpecies is absent or silent --------------
  // [group, habit, lengthM, depth min, depth max, school min, school max]
  var INFO = {
    clownfish: ['fish', 'pair', 0.09, 1, 15], blue_tang: ['fish', 'school', 0.25, 2, 25, 6, 16],
    parrotfish: ['fish', 'solitary', 0.45, 1, 25], bumphead_parrotfish: ['fish', 'school', 1.1, 1, 30, 4, 10],
    moorish_idol: ['fish', 'pair', 0.18, 2, 30], threadfin_butterflyfish: ['fish', 'pair', 0.2, 1, 25],
    emperor_angelfish: ['fish', 'solitary', 0.35, 3, 30], anthias: ['fish', 'school', 0.1, 3, 30, 18, 44],
    blue_green_chromis: ['fish', 'school', 0.08, 1, 15, 14, 36], lionfish: ['fish', 'hover', 0.32, 2, 30],
    peacock_grouper: ['fish', 'hover', 0.45, 2, 30], humphead_wrasse: ['fish', 'solitary', 1.5, 2, 30],
    cleaner_wrasse: ['fish', 'hover', 0.1, 1, 30], clown_triggerfish: ['fish', 'solitary', 0.45, 3, 30],
    porcupinefish: ['fish', 'solitary', 0.5, 2, 30], yellow_boxfish: ['fish', 'solitary', 0.3, 1, 30],
    giant_moray: ['fish', 'crevice', 2.2, 1, 30], whitetip_reef_shark: ['fish', 'solitary', 1.6, 2, 40],
    bluespotted_stingray: ['fish', 'bottom', 0.7, 1, 25], bluestripe_snapper: ['fish', 'school', 0.3, 3, 30, 12, 30],
    oriental_sweetlips: ['fish', 'school', 0.5, 2, 25, 5, 12], reef_manta: ['fish', 'solitary', 3.5, 1, 40],
    green_turtle: ['reptile', 'solitary', 1.0, 1, 30], hawksbill_turtle: ['reptile', 'solitary', 0.85, 1, 30],
    magnificent_anemone: ['invertebrate', 'sessile', 0.6, 1, 20], giant_clam: ['invertebrate', 'sessile', 0.9, 1, 20],
    crown_of_thorns: ['invertebrate', 'bottom', 0.35, 1, 25], blue_sea_star: ['invertebrate', 'bottom', 0.3, 1, 15],
    long_spined_urchin: ['invertebrate', 'bottom', 0.35, 1, 25], nudibranch: ['invertebrate', 'bottom', 0.06, 1, 30],
    cleaner_shrimp: ['invertebrate', 'crevice', 0.06, 1, 30], christmas_tree_worm: ['invertebrate', 'sessile', 0.04, 1, 30],
    day_octopus: ['invertebrate', 'crevice', 0.8, 1, 25], sea_cucumber: ['invertebrate', 'bottom', 0.45, 1, 30],
    sea_fan: ['invertebrate', 'sessile', 1.0, 4, 40], barrel_sponge: ['invertebrate', 'sessile', 1.0, 6, 40],
    soft_coral: ['invertebrate', 'sessile', 0.5, 1, 30], brain_coral: ['coral', 'sessile', 1.0, 1, 25],
    staghorn_coral: ['coral', 'sessile', 1.2, 1, 20], table_coral: ['coral', 'sessile', 1.6, 1, 15],
    mushroom_coral: ['coral', 'sessile', 0.22, 1, 25], boulder_coral: ['coral', 'sessile', 1.8, 1, 25],
    cauliflower_coral: ['coral', 'sessile', 0.45, 1, 20], foliose_coral: ['coral', 'sessile', 0.85, 2, 20],
    reef_star: ['structure', 'sessile', 1.0, 1, 20], reef_ball: ['structure', 'sessile', 1.2, 1, 30],
    coral_tree_nursery: ['structure', 'sessile', 2.6, 3, 20],
    firefish: ['fish', 'hover', 0.09, 6, 60], copperband_butterflyfish: ['fish', 'pair', 0.2, 1, 25],
    spotted_garden_eel: ['fish', 'crevice', 0.4, 5, 50],
    banded_pipefish: ['fish', 'hover', 0.17, 5, 56],
    yellow_longnose_butterflyfish: ['fish', 'pair', 0.18, 2, 145], pajama_cardinalfish: ['fish', 'hover', 0.07, 1, 14],
    banggai_cardinalfish: ['fish', 'hover', 0.075, 0, 16], giant_triton: ['invertebrate', 'bottom', 0.30, 1, 40],
    blue_velvet_headshield_slug: ['invertebrate', 'bottom', 0.05, 5, 30],
    regal_angelfish: ['fish', 'solitary', 0.20, 1, 80],
    mandarin_dragonet: ['fish', 'bottom', 0.06, 1, 18],
    harlequin_shrimp: ['invertebrate', 'bottom', 0.045, 1, 20],
    spotted_seahorse: ['fish', 'bottom', 0.12, 0, 55],
    bennetts_feather_star: ['invertebrate', 'bottom', 0.32, 0, 50],
    peacock_mantis_shrimp: ['invertebrate', 'bottom', 0.14, 0, 100],
    ribbon_eel: ['fish', 'crevice', 1.0, 1, 57],
    leaf_scorpionfish: ['fish', 'bottom', 0.10, 1, 135],
    longnose_hawkfish: ['fish', 'bottom', 0.12, 10, 100],
    chocolate_chip_sea_star: ['invertebrate', 'bottom', 0.28, 0, 30],
    porcelain_anemone_crab: ['invertebrate', 'bottom', 0.04, 1, 10], varicose_phyllidia: ['invertebrate', 'bottom', 0.06, 4, 25],
    broadclub_cuttlefish: ['invertebrate', 'hover', 0.30, 5, 30], blackspotted_puffer: ['fish', 'hover', 0.25, 3, 25],
    ocellated_eagle_ray: ['fish', 'solitary', 4.2, 0, 60], textile_cone: ['invertebrate', 'bottom', 0.09, 0, 50],
    orange_cup_coral: ['coral', 'sessile', 0.075, 1, 60], banded_sea_krait: ['reptile', 'solitary', 1.2, 0, 60],
    white_spotted_hermit_crab: ['invertebrate', 'bottom', 0.20, 0, 50], longfin_bannerfish: ['fish', 'pair', 0.15, 2, 75],
    bigfin_reef_squid: ['invertebrate', 'hover', 0.40, 0, 100]
  };
  var SPECIAL = {
    whitetip_reef_shark: 'cruise', reef_manta: 'manta', green_turtle: 'turtle', hawksbill_turtle: 'turtle', giant_moray: 'moray',
    bluespotted_stingray: 'ray', clownfish: 'clown', cleaner_wrasse: 'cleaner', cleaner_shrimp: 'cleaner', humphead_wrasse: 'roam', day_octopus: 'den',
    // Living reef interactions: grazers bite the rock, clients visit the cleaning
    // stations, and a crown-of-thorns starfish sits on the coral it is eating.
    parrotfish: 'graze', bumphead_parrotfish: 'graze', peacock_grouper: 'client', crown_of_thorns: 'cots',
    ocellated_eagle_ray: 'eagle', bigfin_reef_squid: 'squid', broadclub_cuttlefish: 'cuttle', blackspotted_puffer: 'puffer', banded_sea_krait: 'krait'
  };
  // A client's poses at a cleaning station: [pitch, roll] (head up, head down, tilted).
  var POSES = [[0.55, 0], [-0.48, 0], [0.12, 0.5]];
  // Where a cleaner works on a client: [x forward, y up, out from the flank], in body lengths.
  var INSPECT = [[0.28, 0.03, 1], [0.06, 0.08, 1], [-0.2, 0.05, 0.9], [0.1, -0.16, 0.5], [0.46, 0.0, 0.2], [0.3, 0.0, 1], [0.0, 0.2, 0.3], [-0.08, -0.1, 0.9]];
  // Corals a crown-of-thorns starfish is placed on, most preferred first (plate Acropora).
  var COTS_HOST = { table_coral: 0, foliose_coral: 0.5, boulder_coral: 0.8, brain_coral: 0.9 };
  var PUFF_LIFE = 5, PUFF_RIM = 8;
  var ZONE = {
    magnificent_anemone: 'anemone', giant_clam: 'flat', sea_fan: 'slope', barrel_sponge: 'slope', christmas_tree_worm: 'bommie', soft_coral: 'bommie',
    blue_sea_star: 'flat', sea_cucumber: 'sand', bluespotted_stingray: 'channel', long_spined_urchin: 'reef', crown_of_thorns: 'garden', nudibranch: 'reef',
    mushroom_coral: 'garden', brain_coral: 'garden', staghorn_coral: 'garden', boulder_coral: 'garden', table_coral: 'crest', cauliflower_coral: 'crest', foliose_coral: 'slope',
    reef_star: 'rubble', reef_ball: 'rubble', coral_tree_nursery: 'rubble', lionfish: 'bommieSide', peacock_grouper: 'bommieSide',
    porcupinefish: 'bommieSide', day_octopus: 'rubbleEdge', anthias: 'bommieAbove', blue_green_chromis: 'bommieAbove', yellow_boxfish: 'garden',
    firefish: 'bommieAbove', copperband_butterflyfish: 'garden', spotted_garden_eel: 'sand', banded_pipefish: 'bommieSide', yellow_longnose_butterflyfish: 'garden', pajama_cardinalfish: 'bommieAbove', banggai_cardinalfish: 'bommieAbove', giant_triton: 'rubbleEdge', blue_velvet_headshield_slug: 'sand', regal_angelfish: 'garden', mandarin_dragonet: 'rubbleEdge', harlequin_shrimp: 'rubbleEdge', spotted_seahorse: 'rubbleEdge', bennetts_feather_star: 'bommie', peacock_mantis_shrimp: 'rubble', ribbon_eel: 'sand', leaf_scorpionfish: 'rubble', longnose_hawkfish: 'slope', chocolate_chip_sea_star: 'sand',
    porcelain_anemone_crab: 'anemone', varicose_phyllidia: 'reef', broadclub_cuttlefish: 'rubbleEdge', blackspotted_puffer: 'garden',
    ocellated_eagle_ray: 'channel', textile_cone: 'rubbleEdge', orange_cup_coral: 'shadedRock', banded_sea_krait: 'bommieSide',
    white_spotted_hermit_crab: 'rubble', longfin_bannerfish: 'slope', bigfin_reef_squid: 'channel'
  };
  function speciesInfo(Species, id) {
    var raw = null, fb = INFO[id] || null;
    if (Species && typeof Species.info === 'function') { try { raw = Species.info(id) || null; } catch (ignore) { raw = null; } }
    var group = raw && GROUPS.indexOf(raw.group) >= 0 ? raw.group : fb ? fb[0] : 'fish';
    var habit = raw && HABITS.indexOf(raw.habit) >= 0 ? raw.habit : fb ? fb[1] : (group === 'coral' || group === 'structure' ? 'sessile' : 'solitary');
    var length = clamp(num(raw && raw.lengthM, fb ? fb[2] : 0.3), 0.02, 8);
    var dm = raw && Array.isArray(raw.depthM) && raw.depthM.length >= 2 ? raw.depthM : fb ? [fb[3], fb[4]] : [1, 40];
    var lo = clamp(num(dm[0], 1), 0, 200), hi = Math.max(lo, clamp(num(dm[1], 40), 0, 200));
    var school = raw && Array.isArray(raw.schoolSize) ? raw.schoolSize : fb && fb[5] ? [fb[5], fb[6]] : null;
    if (habit !== 'school') school = null; else if (!school) school = [6, 14];
    var smin = school ? clamp(Math.round(num(school[0], 6)), 1, 120) : 0, smax = school ? clamp(Math.round(num(school[1], smin)), smin, 120) : 0;
    var origin = raw && typeof raw.origin === 'string' ? raw.origin : id === 'giant_moray' ? 'crevice' : group === 'coral' || group === 'structure' || habit === 'sessile' || habit === 'bottom' ? 'base' : 'centre';
    return { id: id, group: group, habit: habit, lengthM: length, depthM: [lo, hi], schoolSize: school ? [smin, smax] : null, origin: origin };
  }
  function behaviorFor(info) {
    if (SPECIAL[info.id]) return SPECIAL[info.id];
    if (info.group === 'coral' || info.group === 'structure' || info.habit === 'sessile' || info.habit === 'bottom') return 'fixed';
    if (info.habit === 'school') return 'school';
    if (info.habit === 'crevice') return 'den';
    if (info.habit === 'hover') return 'hover';
    if (info.habit === 'pair') return 'pair';
    if (info.group === 'reptile') return 'turtle';
    return 'wander';
  }
  function normalizeSite(site) {
    site = site || {};
    var h = site.health || {}, r = site.restoration || {}, seen = {}, population = [];
    (Array.isArray(site.population) ? site.population : []).forEach(function (p) {
      if (!p || typeof p.id !== 'string' || !p.id) return;
      var count = clamp(Math.round(num(p.count, 1)), 0, 60);
      if (seen[p.id] !== undefined) { population[seen[p.id]].count = Math.min(60, population[seen[p.id]].count + count); return; }
      seen[p.id] = population.length; population.push({ id: p.id, count: count });
    });
    var kind = STRUCTURES.indexOf(r.kind) >= 0 ? r.kind : null, units = kind ? clamp(Math.round(num(r.units, 12)), 0, 60) : 0;
    return {
      seed: seedValue(site.seed), depthM: clamp(num(site.depthM, 9), 5, 16),
      health: { coralCover: clamp(num(h.coralCover, 0.6), 0, 1), bleaching: clamp(num(h.bleaching, 0.05), 0, 1), algae: clamp(num(h.algae, 0.15), 0, 1) },
      population: population,
      restoration: kind && units > 0 ? { kind: kind, units: units, yearsSince: clamp(num(r.yearsSince, 0), 0, 10) } : null
    };
  }

  // ---- Terrain: a reef flat at ~4 m sloping to sand at ~18 m (+Z is deeper) ----
  function createTerrain(seed, depthM, patchRadius) {
    var r = stream(seed, 101), o1 = r() * 60, o2 = r() * 60, o3 = r() * 60, ph1 = r() * TAU, chX = -1 + r() * 9, chPh = r() * TAU;
    var rubX = -17 + r() * 6, rubZ = -3 + r() * 7, mid = clamp(depthM, 6, 15);
    var profile = monotone([[-80, 3], [-30, 4], [-18, 5.2], [0, mid], [19, 16.6], [30, 18], [45, 24], [80, 30]]);
    function channelX(z) { return chX + 3.2 * Math.sin(z * 0.075 + chPh) + 1.2 * Math.sin(z * 0.19 + chPh * 2); }
    function channelMask(x, z) {
      var edge = 0.38 * Math.sin(z * 0.48 + chPh) + 0.28 * (noise2(x * 0.55 + o1, z * 0.55) - 0.5);
      return (1 - smooth(1.2 + edge, 2.8 + edge, Math.abs(x - channelX(z)))) * smooth(-24, -17, z);
    }
    function deepMask(z) { return smooth(16.5, 22.5, z); }
    function rubbleMask(x, z) { return 1 - smooth(patchRadius, patchRadius + 2.2, Math.hypot(x - rubX, (z - rubZ) * 1.1)); }
    function slopeZone(z) { return smooth(-20, -12, z) * (1 - smooth(10, 18, z)); }
    // Broad, uneven spur crests rise above sheltered grooves. Warping the
    // crest lines and their widths avoids evenly spaced corrugations.
    function ridgeField(x, z) { return noise2(x * 0.12 + o3, z * 0.12 + o1); }
    function ridgeWave(x, z, rf) { return Math.sin(x * 0.57 + 1.15 * Math.sin(z * 0.09 + ph1) + 0.7 * (rf - 0.5)); }
    // Sand collects in the floors of the deeper grooves, in broken streaks: a
    // patch reef keeps its sand in channels between the coral, not on the spurs.
    function sandFrom(x, z, rw, slope) {
      var pocket = smooth(0.7, 0.9, noise2(x * 0.18 + o2, z * 0.18 + o3));
      var groove = (1 - smooth(-0.94, -0.62, rw)) * slope * smooth(0.34, 0.58, noise2(x * 0.21 + o2, z * 0.21 + o1));
      return Math.max(channelMask(x, z), deepMask(z), pocket * 0.75, groove * 0.92);
    }
    function sandMask(x, z) { return sandFrom(x, z, ridgeWave(x, z, ridgeField(x, z)), slopeZone(z)); }
    // 1 on spur crests and reef flats, 0 in groove floors: where coral heads rise.
    function spurMask(x, z) { var s = slopeZone(z); return s * smooth(-0.35, 0.65, ridgeWave(x, z, ridgeField(x, z))) + (1 - s) * 0.62; }
    function floorY(x, z) {
      var slope = slopeZone(z), rf = ridgeField(x, z), rw = ridgeWave(x, z, rf);
      var ch = channelMask(x, z), flat = Math.max(ch * 0.9, deepMask(z) * 0.9, sandFrom(x, z, rw, slope) * 0.55, rubbleMask(x, z) * 0.9);
      var spur = (1.75 * smooth(-0.5, 0.78, rw) - 0.55) * (0.65 + 0.55 * rf) * slope;
      var und = 1.15 * (noise2(x * 0.09 + o1, z * 0.09 + o2) - 0.5) + 0.44 * (noise2(x * 0.31 + o3, z * 0.31 - o1) - 0.5) + 0.14 * (noise2(x * 1.3, z * 1.3 + o2) - 0.5);
      // Eroded limestone shelves give the reef a readable middle scale between
      // tiny pavement texture and isolated bommies. Sand softens every margin.
      var shelf = 0.92 * smooth(0.32, 0.72, noise2(x * 0.13 + o1, z * 0.16 + o3)) * slope;
      shelf += 0.45 * (smooth(-19, -14, z) - smooth(-8, -3, z)) * (0.65 + 0.35 * rf);
      und += 0.18 * smooth(0.42, 0.66, noise2(x * 0.61 + o1, z * 0.61 + o3));
      var depth = profile(z), relief = (spur + shelf + und) * (1 - flat);
      // Compress shallow crests smoothly, retaining swimming room without a
      // flat clipped summit. Deeper relief remains almost unchanged.
      var headroom = Math.max(0.1, depth - 3.2);
      if (relief > 0) relief = headroom * Math.tanh(relief / headroom);
      return -depth + relief - 0.72 * ch;
    }
    // The dive starts on the reef beside the sand channel, clear of the rubble patch.
    var spawn = { x: 0, z: 3 }, tries = [-7, 7, -11, 11, -4, 4];
    for (var k = 0; k < tries.length; k++) {
      var sx = channelX(3) + tries[k];
      if (Math.abs(sx) <= 15 && Math.hypot(sx - rubX, (3 - rubZ) * 1.1) > patchRadius + 4) { spawn.x = sx; break; }
    }
    return { floorY: floorY, channelX: channelX, channelMask: channelMask, deepMask: deepMask, rubbleMask: rubbleMask, sandMask: sandMask, spurMask: spurMask, rubble: { x: rubX, z: rubZ, r: patchRadius }, spawn: spawn };
  }
  function makeBommie(x, z, R, H, f, g, h, terrain) {
    var b = { x: x, z: z, r: R, h: H, yaw: f * TAU, ph: g * 40, k: 2.15 + 0.7 * h, m: 0.52 + 0.16 * g, c: 0, s: 0 };
    b.c = Math.cos(b.yaw); b.s = Math.sin(b.yaw);
    b.edge = function (a) { return b.r * (1 + 0.19 * Math.sin(2 * a + b.ph) + 0.12 * Math.sin(3 * a + b.ph * 1.7) + 0.045 * Math.sin(5 * a + b.ph * 0.3)); };
    b.toWorld = function (lx, lz, out) { out = out || {}; out.x = b.x + lx * b.c - lz * b.s; out.z = b.z + lx * b.s + lz * b.c; return out; };
    b.heightLocal = function (lx, lz) {
      var a = Math.atan2(lz, lx), rn = Math.hypot(lx, lz) / b.edge(a);
      if (rn >= 1) return NONE;
      // A colony grows over connected limestone shoulders, not a single smooth
      // dome. The broad bench and worn clefts stay in this shared height field,
      // so attached corals and swimming clearance follow the visible rock.
      var u = lx / b.r, v = lz / b.r;
      var shoulder = 0.49 + 0.085 * Math.sin(a * 2 + b.ph) + 0.035 * Math.sin(a * 3 - b.ph);
      var prof = 0.8 * Math.pow(1 - Math.pow(rn, b.k), b.m) + 0.2 * (1 - smooth(shoulder, shoulder + 0.19, rn));
      var lobes = 0.11 * Math.sin(a * 3 + b.ph * 0.7) * smooth(0.05, 0.52, rn);
      lobes += 0.065 * Math.sin(a * 2 - b.ph) * smooth(0.08, 0.6, rn);
      var cleftX = u + 0.06 + 0.1 * Math.sin(v * 3.1 + b.ph);
      var cleft = 0.12 * Math.exp(-cleftX * cleftX / 0.022) * (1 - smooth(0.42, 0.9, Math.abs(v)));
      var wear = 0.055 * (noise3(u * 4.2 + b.ph, v * 4.2, b.ph) - 0.5);
      var crown = 1 - 0.09 * u + 0.045 * v + lobes - cleft + wear;
      return b.base + b.h * Math.min(1.22, prof * crown);
    };
    b.heightAt = function (wx, wz) { var dx = wx - b.x, dz = wz - b.z; return b.heightLocal(dx * b.c + dz * b.s, -dx * b.s + dz * b.c); };
    var low = Infinity;
    for (var k = 0; k < 12; k++) { var a = k / 12 * TAU, e = b.edge(a), rim = b.toWorld(Math.cos(a) * e, Math.sin(a) * e); low = Math.min(low, terrain.floorY(rim.x, rim.z)); }
    var centreFloor = terrain.floorY(x, z);
    b.base = Math.min(low, centreFloor) - 0.25;
    // Keep the exposed crown at its intended height on a slope: the buried
    // downhill skirt must not swallow half of a bommie. Leave room for coral
    // above shallow crowns, including the maximum surface irregularity.
    b.h = Math.max(0.35, Math.min(H + Math.max(0, centreFloor - b.base - 0.25), (SURFACE_Y - 1.65 - b.base) / 1.23));
    b.top = b.base + b.h;
    return b;
  }
  function placeBommies(seed, terrain) {
    var r = stream(seed, 102), list = [], k, q;
    // A large coral head just up the slope from the start, so the dive opens
    // on the reef rather than across the sand toward deep water.
    var sp = terrain.spawn, away = sp.x < terrain.channelX(sp.z - 5.9) ? -1 : 1, spots = [[1.2, 5.1], [3.2, 4.4], [-1.2, 5.1], [4.4, 2.6]];
    for (k = 0; k < spots.length; k++) {
      var shx = sp.x + away * spots[k][0], shz = sp.z - spots[k][1];
      if (terrain.sandMask(shx, shz) < 0.45 && terrain.rubbleMask(shx, shz) < 0.01) { list.push(makeBommie(shx, shz, 3.1, 3.4, 0.37, 0.62, 0.55, terrain)); break; }
    }
    // A patch reef: coral heads crowd the spur crests and the reef flat and may
    // coalesce at their shoulders; grooves, the channel and the deep sand keep
    // only scattered heads. Every cell draws the same eight values, kept or not.
    for (var gx = -26; gx <= 26.01; gx += 5.8) for (var gz = -26; gz <= 26.01; gz += 5.8) {
      var a = r(), b = r(), c = r(), d = r(), e = r(), f = r(), g = r(), h = r();
      var x = gx + (a - 0.5) * 4.4, z = gz + (b - 0.5) * 4.4, reef = (1 - terrain.sandMask(x, z)) * (1 - terrain.rubbleMask(x, z));
      var p = 0.86 * reef * (0.42 + 0.58 * terrain.spurMask(x, z)) + 0.16 * terrain.deepMask(z) * (1 - terrain.channelMask(x, z));
      // Down the slope from the start, keep a wider clearing: the opening view
      // faces up the reef, not over a tall head toward deep water.
      var fromStart = Math.hypot(x - sp.x, z - sp.z);
      if (c > p || Math.abs(x) > 27 || Math.abs(z) > 27 || fromStart < 5.6 || z > sp.z + 1 && fromStart < 10) continue;
      if (terrain.rubbleMask(x, z) > 0.01 || Math.hypot(x - terrain.rubble.x, z - terrain.rubble.z) < terrain.rubble.r + 3.4) continue;
      var R = 1.35 + 1.85 * d, H = R * (0.6 + 0.5 * e) * (z > 14 ? 0.8 : 1), apart = true;
      for (q = 0; q < list.length && apart; q++) if (Math.hypot(list[q].x - x, list[q].z - z) < (list[q].r + R) * 0.72) apart = false;
      if (apart) list.push(makeBommie(x, z, R, H, f, g, h, terrain));
    }
    // Every reef keeps a cleaning station and a crevice.
    var spare = [[7, 9], [-9, -9], [12, -12]];
    for (k = 0; list.filter(function (b) { return b.r >= 1.4; }).length < 3 && k < spare.length; k++) list.push(makeBommie(spare[k][0], spare[k][1], 2.4, 1.8, 0.3 * k, 0.5, 0.4, terrain));
    // Knolls: small coral heads nestled between the large ones, which give the
    // reef its broken, three-dimensional floor.
    var rk = stream(seed, 104), g1 = rk() * 40, g2 = rk() * 40;
    for (gx = -27; gx <= 27.01; gx += 2.8) for (gz = -27; gz <= 27.01; gz += 2.8) {
      var ka = rk(), kb = rk(), kc = rk(), kd = rk(), ke = rk(), kf = rk(), kg = rk(), kh = rk();
      var kx = gx + (ka - 0.5) * 2.4, kz = gz + (kb - 0.5) * 2.4, KR = 0.55 + 0.85 * kd, clear = true;
      var kp = 0.7 * (1 - terrain.sandMask(kx, kz)) * (1 - terrain.rubbleMask(kx, kz)) * (0.4 + 0.6 * terrain.spurMask(kx, kz)) * (0.45 + 0.8 * noise2(kx * 0.12 + g1, kz * 0.12 + g2));
      if (kc > kp || Math.abs(kx) > 27.5 || Math.abs(kz) > 27.5 || Math.hypot(kx - terrain.spawn.x, kz - terrain.spawn.z) < 3.2 || Math.hypot(kx - terrain.rubble.x, kz - terrain.rubble.z) < terrain.rubble.r + 2) continue;
      for (q = 0; q < list.length && clear; q++) if (Math.hypot(list[q].x - kx, list[q].z - kz) < list[q].r * 1.02 + KR * 1.05 + 0.15) clear = false;
      if (clear) list.push(makeBommie(kx, kz, KR, KR * (0.5 + 0.5 * ke), kf, kg, kh, terrain));
    }
    return list;
  }

  // ---- Benthic cover: what grows on each patch of hard reef ------------------
  // The bottom is a mosaic of colony-sized patches, each holding one state.
  // Quantiles of seeded fields fix every state's share of the hard bottom to the
  // site's numbers (what a point-intercept survey of this reef would record),
  // while a broad noise term keeps related patches together. Hashes, not the
  // placement streams, decide every patch, so no quality tier can move one.
  var SAND = 0, LIVE = 1, BLEACHED = 2, FRESH = 3, MACRO = 4, RUBBLE = 5, ROCK = 6, LIFE = 7;
  var PATCH = 1.05, PATCH_LO = -31.5, PATCH_N = 61;
  function benthicField(seed, terrain, bommies, health, restored) {
    var n = PATCH_N, total = n * n, cx = new Float32Array(total), cz = new Float32Array(total), state = new Uint8Array(total);
    var roll = new Float32Array(total * 4), onReef = new Uint8Array(total), salt = (seed % 100003 + 100003) % 100003;
    var cover = health.coralCover, bleach = health.bleaching, algae = health.algae;
    function h(k, s) { return hash2(k * 7 + s, salt + s * 7919); }
    var nf = stream(seed, 211), f1 = nf() * 50, f2 = nf() * 50, f3 = nf() * 50, f4 = nf() * 50, f5 = nf() * 50;
    function headAt(x, z) {
      for (var q = 0; q < bommies.length; q++) { var b = bommies[q]; if (Math.abs(b.x - x) < b.r * 1.25 && Math.abs(b.z - z) < b.r * 1.25 && b.heightAt(x, z) > NONE) return b; }
      return null;
    }
    var hard = [], k, i, j;
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      k = j * n + i;
      var x = PATCH_LO + (i + 0.18 + 0.64 * h(k, 1)) * PATCH, z = PATCH_LO + (j + 0.18 + 0.64 * h(k, 2)) * PATCH;
      cx[k] = x; cz[k] = z;
      roll[k * 4] = h(k, 3); roll[k * 4 + 1] = h(k, 4); roll[k * 4 + 2] = h(k, 5); roll[k * 4 + 3] = h(k, 6);
      var head = headAt(x, z), sand = terrain.sandMask(x, z), rub = terrain.rubbleMask(x, z);
      if (head) { state[k] = ROCK; onReef[k] = 2; }
      // A restoration patch is all rubble; a natural one is being recolonised and
      // joins the reef mosaic, where it holds most of the reef's rubble.
      else if (rub > 0.5 && restored) { state[k] = RUBBLE; continue; }
      else if (sand > 0.5) {
        // On a broken reef, storm rubble fills the groove floors; the main
        // channel and the deep sand stay sand.
        state[k] = terrain.channelMask(x, z) < 0.3 && terrain.deepMask(z) < 0.3 && h(k, 7) < 0.7 * clamp((0.5 - cover) / 0.4, 0, 1) ? RUBBLE : SAND;
        continue;
      }
      else { state[k] = ROCK; onReef[k] = 1; }
      if (Math.abs(x) <= 28 && Math.abs(z) <= 28) hard.push(k);
    }
    // Shares of the hard bottom. Points on sand count as sand in a survey, so
    // the live share of rock runs a little above the reef-wide cover.
    var coral = clamp(cover / 0.85, 0, 0.9), macro = clamp(algae / 0.85, 0, 1 - coral), rest = Math.max(0, 1 - coral - macro);
    var damage = clamp((0.5 - cover) / 0.4, 0, 1);
    var shares = { fresh: rest * (0.06 + 0.25 * bleach + 0.12 * damage), rubble: rest * (0.1 + 0.42 * damage) };
    shares.life = rest * 0.3 * (1 - 0.7 * damage);
    function take(list, count, score, as) {
      var ranked = list.map(function (k) { return [score(k), k]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      var chosen = {};
      for (var m = 0; m < ranked.length; m++) { if (m < count) { state[ranked[m][1]] = as; chosen[ranked[m][1]] = true; } }
      return list.filter(function (k) { return !chosen[k]; });
    }
    var N = hard.length;
    function field(k, off, scale) { return noise2(cx[k] * scale + off, cz[k] * scale - off * 0.7); }
    // Coral heads are the most coral-rich places; groove floors the least.
    var left = take(hard, Math.round(coral * N), function (k) { return 0.56 * h(k, 11) + 0.44 * field(k, f1, 0.15) - (onReef[k] === 2 ? 0.1 : 0) + 0.08 * (1 - terrain.spurMask(cx[k], cz[k])); }, LIVE);
    var corals = hard.filter(function (k) { return state[k] === LIVE; });
    // Heat stress bleaches shallow water first, in patches.
    take(corals, Math.round(bleach * corals.length), function (k) { return 0.55 * h(k, 12) + 0.3 * field(k, f2, 0.2) + 0.15 * clamp((-terrain.floorY(cx[k], cz[k]) - 4) / 12, 0, 1); }, BLEACHED);
    left = take(left, Math.round(macro * N), function (k) { return 0.5 * h(k, 13) + 0.5 * field(k, f3, 0.19); }, MACRO);
    left = take(left, Math.round(shares.rubble * N), function (k) { return 0.45 * h(k, 14) + 0.55 * field(k, f4, 0.17) + (onReef[k] === 2 ? 0.6 : 0) - 0.45 * terrain.rubbleMask(cx[k], cz[k]); }, RUBBLE);
    left = take(left, Math.round(shares.fresh * N), function (k) { return 0.6 * h(k, 15) + 0.4 * field(k, f5, 0.2); }, FRESH);
    take(left, Math.round(shares.life * N), function (k) { return h(k, 16) - (onReef[k] === 2 ? 0.15 : 0); }, LIFE);
    // Nearest patch centre: the cells are a jittered grid, so the 3 x 3 block around a point holds it.
    function at(x, z) {
      var fi = Math.floor((x - PATCH_LO) / PATCH), fj = Math.floor((z - PATCH_LO) / PATCH), best = -1, bd = Infinity;
      for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
        var ii = fi + di, jj = fj + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
        var kk = jj * n + ii, dx = cx[kk] - x, dz = cz[kk] - z, dd = dx * dx + dz * dz;
        if (dd < bd) { bd = dd; best = kk; }
      }
      return best;
    }
    function count() { var c = {}; hard.forEach(function (k) { c[state[k]] = (c[state[k]] || 0) + 1; }); c.hard = N; return c; }
    return { n: n, size: PATCH, cx: cx, cz: cz, state: state, roll: roll, onReef: onReef, at: at, count: count, damage: damage };
  }

  // ---- Geometry builder (Reef3DHabitat) ---------------------------------------
  function Builder() { this.p = []; this.n = []; this.c = []; this.i = []; this.extra = null; this.caps = 3; }
  Builder.prototype.count = function () { return this.p.length / 3; };
  Builder.prototype.vertex = function (x, y, z, nx, ny, nz, r, g, b) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(r, g, b);
    if (this.extra) this.extra.data.push(this.extra.value);
    return this.p.length / 3 - 1;
  };
  Builder.prototype.useExtra = function (name) { this.extra = { name: name, data: [], value: 0 }; };
  Builder.prototype.absorb = function (T, geometry, matrix, tone) {
    var pos = geometry.attributes.position, nor = geometry.attributes.normal, base = this.count();
    var nm = new T.Matrix3().getNormalMatrix(matrix), v = new T.Vector3(), w = new T.Vector3(), rgb = [1, 1, 1], k;
    for (k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(matrix);
      if (nor) w.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize(); else w.set(0, 1, 0);
      if (tone) tone(v.x, v.y, v.z, w.x, w.y, w.z, rgb);
      this.vertex(v.x, v.y, v.z, w.x, w.y, w.z, rgb[0], rgb[1], rgb[2]);
    }
    if (geometry.index) { var idx = geometry.index.array; for (k = 0; k < idx.length; k++) this.i.push(base + idx[k]); }
    else for (k = 0; k < pos.count; k++) this.i.push(base + k);
    geometry.dispose();
  };
  Builder.prototype.tri = function (a, b, c, rgb) {
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1, self = this;
    [a, b, c].forEach(function (p) { self.i.push(self.vertex(p[0], p[1], p[2], nx / l, ny / l, nz / l, rgb[0], rgb[1], rgb[2])); });
  };
  Builder.prototype.build = function (T, recomputeNormals) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    if (this.extra) g.setAttribute(this.extra.name, new T.Float32BufferAttribute(this.extra.data, 1));
    g.setIndex(this.i);
    if (recomputeNormals) g.computeVertexNormals();
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  };
  function bez(c, t, out) {
    var u = 1 - t;
    return out.copy(c[0]).multiplyScalar(u * u * u).addScaledVector(c[1], 3 * u * u * t).addScaledVector(c[2], 3 * u * t * t).addScaledVector(c[3], t * t * t);
  }
  function bezTangent(c, t, out, tmp) {
    var u = 1 - t;
    out.subVectors(c[1], c[0]).multiplyScalar(3 * u * u);
    out.addScaledVector(tmp.subVectors(c[2], c[1]), 6 * u * t);
    return out.addScaledVector(tmp.subVectors(c[3], c[2]), 3 * t * t);
  }
  Builder.prototype.tube = function (T, curve, radius, steps, sides, taper, tone) {
    var caps = this.caps, first = this.count(), last = steps + caps, endR = radius * (1 - taper), rgb = [1, 1, 1];
    var center = new T.Vector3(), tangent = new T.Vector3(), tmp = new T.Vector3(), across = new T.Vector3();
    var around = new T.Vector3(), radial = new T.Vector3(), nrm = new T.Vector3();
    for (var row = 0; row <= last; row++) {
      var t = Math.min(1, row / steps), cap = row > steps ? (row - steps) / caps * Math.PI / 2 : 0, speed = 1;
      if (row <= steps) {
        bez(curve, t, center); bezTangent(curve, t, tangent, tmp);
        speed = Math.max(1e-6, tangent.length()); tangent.divideScalar(speed);
        if (row === 0) { across.set(0, 0, 1).cross(tangent); if (across.lengthSq() < 1e-6) across.set(1, 0, 0).cross(tangent); }
        else across.addScaledVector(tangent, -across.dot(tangent));
        if (across.lengthSq() < 1e-10) across.set(1, 0, 0).addScaledVector(tangent, -tangent.x);
        across.normalize(); around.crossVectors(tangent, across).normalize();
      } else center.copy(curve[3]).addScaledVector(tangent, endR * Math.sin(cap));
      var r = row <= steps ? radius * (1 - taper * t * t * (3 - 2 * t)) : endR * Math.cos(cap);
      var slope = row <= steps ? -radius * taper * 6 * t * (1 - t) / speed : 0;
      for (var s = 0; s <= sides; s++) {
        var a = s / sides * TAU;
        radial.copy(across).multiplyScalar(Math.cos(a)).addScaledVector(around, Math.sin(a));
        var px = center.x + radial.x * r, py = center.y + radial.y * r, pz = center.z + radial.z * r;
        if (row > steps) nrm.copy(radial).multiplyScalar(Math.cos(cap)).addScaledVector(tangent, Math.sin(cap));
        else nrm.copy(radial).addScaledVector(tangent, -slope).normalize();
        tone(t, row > steps, px, py, pz, rgb);
        this.vertex(px, py, pz, nrm.x, nrm.y, nrm.z, rgb[0], rgb[1], rgb[2]);
        if (row < last && s < sides) {
          var i0 = first + row * (sides + 1) + s, i1 = i0 + sides + 1;
          this.i.push(i0, i0 + 1, i1);
          if (row < last - 1) this.i.push(i0 + 1, i1 + 1, i1);
        }
      }
    }
  };
  function weldSphere(geometry, seg, rings, bothPoles) {
    var n = geometry.attributes.normal, cols = seg + 1, v = [0, 0, 0];
    function avg(list) {
      v[0] = v[1] = v[2] = 0;
      list.forEach(function (k) { v[0] += n.getX(k); v[1] += n.getY(k); v[2] += n.getZ(k); });
      var l = Math.hypot(v[0], v[1], v[2]) || 1;
      list.forEach(function (k) { n.setXYZ(k, v[0] / l, v[1] / l, v[2] / l); });
    }
    for (var row = 0; row <= rings; row++) avg([row * cols, row * cols + seg]);
    (bothPoles ? [0, rings] : [0]).forEach(function (row) { var list = []; for (var k = 0; k < cols; k++) list.push(row * cols + k); avg(list); });
    n.needsUpdate = true;
  }
  function polar(T, rings, segs, point, skirt) {
    var b = new Builder(), rgb = [1, 1, 1], p, r, s;
    p = point(0, 0, rgb); b.vertex(p[0], p[1], p[2], 0, 1, 0, rgb[0], rgb[1], rgb[2]);
    for (r = 1; r <= rings; r++) for (s = 0; s < segs; s++) { p = point(r / rings, s / segs * TAU, rgb); b.vertex(p[0], p[1], p[2], 0, 1, 0, rgb[0], rgb[1], rgb[2]); }
    for (s = 0; s < segs; s++) b.i.push(0, 1 + (s + 1) % segs, 1 + s);
    for (r = 1; r < rings; r++) for (s = 0; s < segs; s++) {
      var a = 1 + (r - 1) * segs + s, a1 = 1 + (r - 1) * segs + (s + 1) % segs, c = a + segs, c1 = a1 + segs;
      b.i.push(a, a1, c, a1, c1, c);
    }
    if (skirt) {
      var outer = 1 + (rings - 1) * segs, start = b.count();
      for (s = 0; s < segs; s++) { p = skirt(s / segs * TAU, b.p, (outer + s) * 3, rgb); b.vertex(p[0], p[1], p[2], 0, 0, 1, rgb[0], rgb[1], rgb[2]); }
      for (s = 0; s < segs; s++) { var o = outer + s, o1 = outer + (s + 1) % segs, k = start + s, k1 = start + (s + 1) % segs; b.i.push(o, o1, k, o1, k1, k); }
    }
    return b.build(T, true);
  }
  // Growing tips are pale: an Acropora axial corallite holds few algae and
  // shows the coral's own lilac-blue pigment. Vertex tones multiply the colony
  // colour, so one geometry serves every pigment; a dead skeleton has no accent.
  function coralTone(H, accent) {
    var ar = accent ? accent[0] : 1.24, ag = accent ? accent[1] : 1.2, ab = accent ? accent[2] : 1.62;
    return function (t, cap, x, y, z, rgb) {
      var height = clamp(y / H, 0, 1), tip = smooth(0.68, 1, t) * (cap ? 1 : 0.85), tissue = noise3(x / H * 9 + 3.1, y / H * 9, z / H * 9 - 2.7);
      var g = 0.56 + 0.26 * smooth(0.03, 0.82, height) + 0.06 * (tissue - 0.5);
      rgb[0] = g * lerp(1, ar, tip); rgb[1] = g * lerp(1, ag, tip); rgb[2] = g * lerp(1, ab, tip);
    };
  }
  function V(T, x, y, z) { return new T.Vector3(x, y, z); }
  function buildBranching(T, R, H, variant, sides, detail, lite, broken) {
    var far = lite || detail === 'far'; detail = detail === true;
    var b = new Builder(), style = variant % 3, phase = variant * 1.71 + 0.4, tone = coralTone(H, broken ? [1, 1, 1] : null), steps = detail ? 4 : 2;
    // Spend long-shaft subdivisions on more live growing tips. Short, plump
    // branchlets give the crown its density; two cap rings soften the ends.
    b.caps = far ? 1 : 2;
    // Every tier samples the same colony. Dropping branches or changing the
    // denominator in their radial layout made anchored coral appear to move.
    var k, a, dx, dz, curve, tmp = new T.Vector3();
    if (style === 0) {
      var fingers = 14;
      for (k = 0; k < fingers; k++) {
        a = phase + k * 2.39996; dx = Math.cos(a); dz = Math.sin(a);
        var rr = R * 0.61 * Math.sqrt((k + 0.5) / fingers), top = H * (0.72 + 0.27 * ((k * 0.37 + variant * 0.11) % 1)) * (1 - 0.14 * rr / R), lean = R * (0.05 + 0.11 * ((k * 0.71) % 1)), bend = R * 0.11 * Math.sin(k * 1.8 + phase);
        // Stems rise from an encrusting base, arc into the light, then turn
        // upward at their tips. Lateral growth replaces a few bare main shafts.
        curve = [V(T, dx * rr * 0.61, -0.01, dz * rr * 0.61), V(T, dx * rr * 0.88 - dz * bend, top * 0.27, dz * rr * 0.88 + dx * bend), V(T, dx * (rr + lean) + dz * bend * 0.35, top * 0.73, dz * (rr + lean) - dx * bend * 0.35), V(T, dx * (rr + lean * 0.78), top, dz * (rr + lean * 0.78))];
        b.tube(T, curve, R * (0.068 + 0.009 * (k % 3)), steps, sides, 0.5, tone);
        {
          var bud = bez(curve, 0.42 + 0.085 * (k % 3), new T.Vector3()), ba = a + (k % 4 < 2 ? 1.1 : -1.1), br = R * (0.2 + 0.04 * (k % 2)), by = Math.min(H * 0.97, top * (0.85 + 0.07 * (k % 3)));
          b.tube(T, [bud, V(T, bud.x + Math.cos(ba) * br * 0.66, bud.y + (by - bud.y) * 0.13, bud.z + Math.sin(ba) * br * 0.66), V(T, bud.x + Math.cos(ba) * br * 1.05, by - H * 0.13, bud.z + Math.sin(ba) * br * 1.05), V(T, bud.x + Math.cos(ba) * br, by, bud.z + Math.sin(ba) * br)], R * 0.049, far ? 1 : 2, sides, 0.43, tone);
        }
      }
      b.absorb(T, new T.SphereGeometry(1, sides + 3, far ? 2 : 4, 0, TAU, 0, Math.PI / 2), new T.Matrix4().makeScale(R * 0.62, H * 0.12, R * 0.62), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = rgb[1] = rgb[2] = 0.6; });
    } else if (style === 1) {
      // A long-dead stand keeps a few eroded stumps of its antlers.
      var antlers = broken ? 5 : 6;
      for (k = 0; k < antlers; k++) {
        a = phase + k * 2.399963 + 0.3 * Math.sin(k * 2.1 + variant); dx = Math.cos(a); dz = Math.sin(a);
        var reach = R * (0.76 + 0.21 * ((k * 0.43 + 0.11) % 1)) * (broken ? 0.82 : 1), endY = H * (0.69 + 0.29 * ((k * 0.61 + 0.3) % 1)) * (broken ? 0.4 + 0.5 * ((k * 0.37 + 0.2) % 1) : 1);
        var curl = R * 0.1 * Math.sin(k * 2.7 + phase);
        curve = [V(T, dx * R * (0.1 + 0.035 * (k % 3)), -0.01, dz * R * (0.1 + 0.035 * (k % 3))), V(T, dx * reach * 0.43 - dz * curl, H * 0.3, dz * reach * 0.43 + dx * curl), V(T, dx * reach * 1.03 - dz * curl * 0.4, endY * 0.72, dz * reach * 1.03 + dx * curl * 0.4), V(T, dx * reach, endY, dz * reach)];
        b.tube(T, curve, R * (0.069 + 0.007 * (k % 3)), steps, sides, 0.52, tone);
        for (var f = 0; f < (broken ? k % 2 : 2); f++) {
          var base = bez(curve, f ? 0.7 : 0.42, new T.Vector3()), fa = a + (f ? 0.92 : -0.96), fx = Math.cos(fa), fz = Math.sin(fa), len = R * (0.39 - 0.08 * f), rise = H * (0.39 - 0.065 * f);
          var fork = [base, V(T, base.x + fx * len * 0.46, base.y + rise * 0.16, base.z + fz * len * 0.46), V(T, base.x + fx * len * 0.96, base.y + rise * 0.63, base.z + fz * len * 0.96), V(T, base.x + fx * len, Math.min(H * 0.97, base.y + rise), base.z + fz * len)];
          b.tube(T, fork, R * 0.044, far ? 1 : 2, sides, 0.43, tone);
          if (!broken && f === 0) {
            var forkBase = bez(fork, 0.55, new T.Vector3()), forkA = fa + (f ? -0.9 : 0.9), reach2 = R * (0.16 + 0.04 * (k % 2)), end2 = Math.min(H * 0.98, forkBase.y + H * (0.23 + 0.02 * (k % 3)));
            b.tube(T, [forkBase, V(T, forkBase.x + Math.cos(forkA) * reach2 * 0.5, forkBase.y + H * 0.045, forkBase.z + Math.sin(forkA) * reach2 * 0.5), V(T, forkBase.x + Math.cos(forkA) * reach2, end2 - H * 0.06, forkBase.z + Math.sin(forkA) * reach2), V(T, forkBase.x + Math.cos(forkA) * reach2, end2, forkBase.z + Math.sin(forkA) * reach2)], R * 0.027, far ? 1 : 2, sides, 0.35, tone);
          }
        }
      }
    } else {
      b.tube(T, [V(T, 0, -0.01, 0), V(T, 0, H * 0.15, 0), V(T, R * 0.02, H * 0.3, 0), V(T, 0, H * 0.42, 0)], R * 0.145, 2, sides, 0.2, tone);
      var twigs = 6, boughs = 6;
      for (k = 0; k < boughs; k++) {
        a = phase + k * TAU / boughs + 0.12 * Math.sin(k * 2.3 + phase); dx = Math.cos(a); dz = Math.sin(a);
        var span = R * (0.82 + 0.15 * ((k * 0.57) % 1));
        var bendY = H * 0.045 * Math.sin(k * 2.1 + phase);
        curve = [V(T, 0, H * 0.38, 0), V(T, dx * span * 0.3, H * 0.46 + bendY, dz * span * 0.3), V(T, dx * span * 0.8, H * 0.49 + bendY, dz * span * 0.8), V(T, dx * span, H * 0.63 + bendY, dz * span)];
        b.tube(T, curve, R * 0.061, 2, sides, 0.35, tone);
        for (var w = 0; w < twigs; w++) {
          var tt = 0.2 + w * (0.72 / Math.max(1, twigs - 1)), tb = bez(curve, tt, tmp).clone(), top2 = H * (0.82 + 0.16 * (((k + w) * 0.39) % 1));
          var spread = (w % 2 ? -1 : 1) * R * (0.12 + 0.06 * (1 - tt)), tx = tb.x + dx * R * 0.055 - dz * spread, tz = tb.z + dz * R * 0.055 + dx * spread;
          b.tube(T, [tb, V(T, lerp(tb.x, tx, 0.65), tb.y + (top2 - tb.y) * 0.2, lerp(tb.z, tz, 0.65)), V(T, tx + dx * R * 0.02, top2 - H * 0.1, tz + dz * R * 0.02), V(T, tx + dx * R * 0.012, top2, tz + dz * R * 0.012)], R * 0.034, far ? 1 : 2, sides, 0.39, tone);
        }
      }
    }
    return b.build(T, false);
  }
  // knobby: a lobed Porites head of rounded hummocks with pale crowns; without
  // it, the smooth dome of a brain coral (its valleys come from the material).
  function buildMassive(T, R, H, variant, detail, knobby) {
    var far = detail === 'far'; detail = detail === true;
    var seg = far ? 12 : detail ? 34 : 16, rings = far ? 6 : detail ? 15 : 8, ph = variant * 2.17, theta = Math.PI * 0.58, low = Math.cos(theta), knobs = [];
    var g = new T.SphereGeometry(1, seg, rings, 0, TAU, 0, theta), pos = g.attributes.position;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      var shoulder = Math.max(0, 1 - y * y), lobes = Math.sin(Math.atan2(z, x) * 4 + ph) * shoulder;
      var knob = knobby ? smooth(0.42, 0.82, noise3(x * 2.7 + ph, y * 2.7 + 1.3, z * 2.7 - ph)) * (0.35 + 0.65 * y) : 0;
      var lump = 1 + 0.3 * (noise3(x * 1.7 + ph, y * 1.7, z * 1.7 - ph) - 0.5) + 0.09 * (noise3(x * 4.3, y * 4.3 + ph, z * 4.3) - 0.5) + 0.055 * lobes + 0.17 * knob - (knobby ? 0.05 : 0);
      knobs.push(knob);
      pos.setXYZ(k, (x * lump + 0.065 * y * y) * R, ((y * lump - low) / (1 - low) - 0.03 + 0.035 * x * shoulder) * H, z * lump * R * 0.94);
    }
    g.computeVertexNormals(); weldSphere(g, seg, rings, false);
    var b = new Builder(), at = 0;
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) {
      var s = 0.5 + 0.42 * smooth(-0.05, 0.6, y / H) + 0.16 * knobs[at++] + 0.06 * (noise3(x * 9 + ph, y * 9, z * 9) - 0.5);
      rgb[0] = s * 1.02; rgb[1] = s; rgb[2] = s * 0.97;
    });
    return b.build(T, false);
  }
  function buildPlate(T, R, H, variant, detail) {
    var far = detail === 'far'; detail = detail === true;
    var segs = far ? 10 : detail ? 22 : 14, radii = far ? [0.62, 0.86, 1] : detail ? [0.3, 0.62, 0.86, 0.96, 1] : [0.52, 0.86, 0.96, 1], ph = variant * 1.3, thick = 0.013 + R * 0.031, b = new Builder();
    b.caps = 2;
    b.tube(T, [V(T, 0, -0.01, 0), V(T, -R * 0.03, H * 0.1, 0), V(T, R * 0.04, H * 0.22, -R * 0.02), V(T, 0, H * 0.3, 0)], R * 0.19, 3, detail ? 6 : 5, 0.66, coralTone(H));
    // The growing rim is one continuous, rounded surface shared by the upper
    // and lower faces. Most radial detail is reserved for that curved lip.
    var shelves = [[0.73, 0.31, 0.24, 0.09], [1, 0.52, -0.04, -0.015], [0.64, 0.76, -0.23, -0.13]];
    shelves.forEach(function (shelf, layer) {
      var rad = R * shelf[0], top = H * shelf[1], ox = R * shelf[2], oz = R * shelf[3], phase = ph + layer * 1.9;
      // Lobed, notched margins: a growing plate is never a cut-out disc.
      function edge(a) { return rad * (0.86 + 0.085 * Math.sin(3 * a + phase) + 0.05 * Math.sin(5 * a + 2 * phase) + 0.028 * Math.sin(9 * a - phase) - 0.12 * Math.pow(Math.max(0, Math.sin(2 * a + 1.3 * phase)), 10)); }
      function surfaceY(r, a) {
        // Broad shallow cups remain smooth at the middle LOD. Restrict the
        // small folds to the detailed perimeter so they cannot alias into spikes.
        var lip = smooth(0.24, 1, r), folds = Math.sin(a * 3 + phase + r * 0.45) * 0.047 + Math.sin(a * 5 - phase + r * 0.7) * 0.012;
        folds += Math.sin(a * 7 - phase) * 0.004;
        return top - H * 0.13 * (1 - r * r) + H * 0.045 * r * r + H * 0.07 * r * r * r + rad * folds * lip + H * 0.035 * Math.sin(a + phase) * r;
      }
      var plate = new Builder(), tops = [], bottoms = [];
      function vertex(r, a, lower, j) {
        var e = edge(a) * r, x = ox + Math.cos(a) * e, z = oz + Math.sin(a) * e, y = surfaceY(r, a), growth = smooth(0.78, 1, r);
        // Continuous shallow folds carry through both faces. Alternating vertex
        // heights made a corrugated fan and changed its shape abruptly at LOD.
        y += thick * 0.25 * Math.sin(a * 4 + phase + r * 1.4) * smooth(0.1, 0.65, r);
        // A sampled elliptical cross-section rolls the tissue over a rounded
        // growing edge; upper and lower faces meet at one shared outer ring.
        var rimT = clamp((r - 0.86) / 0.14, 0, 1), half = thick * (1.7 - 0.9 * r) * 0.5;
        y += -half + (lower ? -1 : 1) * half * Math.sqrt(Math.max(0, 1 - rimT * rimT));
        // Concentric growth bands, a shaded underside and a pale growing rim.
        var light = lower ? 0.5 + 0.14 * r : (0.66 + 0.14 * r + 0.035 * (noise2(x / R * 8 + phase, z / R * 8) - 0.5)) * (0.94 + 0.06 * Math.cos(r * 15 + phase)) + 0.1 * growth;
        return plate.vertex(x, y, z, 0, lower ? -1 : 1, 0, light * (1 + 0.16 * growth), light * (1 + 0.12 * growth), light * (1 + 0.4 * growth));
      }
      var centreTop = vertex(0, 0, false, 0), centreBottom = vertex(0, 0, true, 0);
      radii.forEach(function (r, ring) {
        var upper = [], lower = [];
        for (var j = 0; j < segs; j++) { var a = j / segs * TAU; upper.push(vertex(r, a, false, j)); lower.push(r === 1 ? upper[j] : vertex(r, a, true, j)); }
        tops.push(upper); bottoms.push(lower);
      });
      function face(indices, lower) { if (lower) plate.i.push(indices[0], indices[2], indices[1]); else plate.i.push(indices[0], indices[1], indices[2]); }
      for (var j = 0; j < segs; j++) {
        var next = (j + 1) % segs;
        face([centreTop, tops[0][next], tops[0][j]], false); face([centreBottom, bottoms[0][next], bottoms[0][j]], true);
        for (var ring = 1; ring < radii.length; ring++) [false, true].forEach(function (lower) {
          var rows = lower ? bottoms : tops, inner = rows[ring - 1], outer = rows[ring];
          face([inner[j], inner[next], outer[j]], lower); face([inner[next], outer[next], outer[j]], lower);
        });
      }
      var plateGeometry = plate.build(T, true), plateColor = plateGeometry.attributes.color, colorIndex = 0;
      b.absorb(T, plateGeometry, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = plateColor.getX(colorIndex); rgb[1] = plateColor.getY(colorIndex); rgb[2] = plateColor.getZ(colorIndex++); });
      // Short branching buttresses fuse the offset cups to a broad root. The
      // support ends below each cup rather than projecting through its interior.
      var supportY = surfaceY(0, 0) - thick * 1.4;
      b.tube(T, [V(T, 0, H * 0.025, 0), V(T, ox * 0.1, H * 0.08, oz * 0.1), V(T, ox * 0.8, supportY * 0.8, oz * 0.8), V(T, ox, supportY, oz)], R * 0.12, detail ? 3 : 2, detail ? 5 : 4, 0.3, coralTone(H));
    });
    return b.build(T, false);
  }
  // Table coral (Acropora hyacinthus and kin): a short stalk holds a flat,
  // lobed table of fused branchlets whose upturned tips fringe the margin.
  function buildTable(T, R, H, variant, detail) {
    var far = detail === 'far'; detail = detail === true;
    var b = new Builder(), ph = variant * 1.37 + 0.3, segs = far ? 10 : detail ? 30 : 16, radii = far ? [0.45, 0.86, 1] : detail ? [0.22, 0.45, 0.68, 0.86, 0.96, 1] : [0.45, 0.86, 0.96, 1];
    var deck = H * 0.56, thick = R * 0.05, tone = coralTone(H), k, j;
    b.caps = 1;
    b.tube(T, [V(T, 0, -0.01, 0), V(T, R * 0.05, H * 0.18, 0), V(T, -R * 0.04, H * 0.36, R * 0.02), V(T, 0, deck - thick, 0)], R * 0.2, detail ? 3 : 2, detail ? 6 : 4, 0.4, tone);
    function edge(a) { return R * (0.85 + 0.08 * Math.sin(3 * a + ph) + 0.05 * Math.sin(5 * a - ph) + 0.015 * Math.sin(11 * a + 2 * ph) - 0.09 * Math.pow(Math.max(0, Math.sin(2 * a + ph)), 12)); }
    function deckY(r, a) { return deck + H * 0.07 * r * r + H * 0.05 * Math.sin(a + ph) * r - H * 0.035 * (1 - r) * (1 - r) + thick * 0.32 * Math.sin(a * 5 + ph + r * 1.8) * smooth(0.08, 0.68, r); }
    var tops = [], lows = [], c0 = b.count();
    b.vertex(0, deckY(0, 0), 0, 0, 1, 0, 0.72, 0.72, 0.72);
    b.vertex(0, deckY(0, 0) - thick * 1.6, 0, 0, -1, 0, 0.42, 0.42, 0.42);
    radii.forEach(function (r) {
      var up = [], dn = [];
      for (j = 0; j < segs; j++) {
        var a = j / segs * TAU, e = edge(a) * r, x = Math.cos(a) * e, z = Math.sin(a) * e, y = deckY(r, a), rim = smooth(0.8, 1, r);
        var rimT = clamp((r - 0.86) / 0.14, 0, 1), half = thick * (1.6 - 0.9 * r) * 0.5, round = half * Math.sqrt(Math.max(0, 1 - rimT * rimT));
        var l = (0.7 + 0.14 * r) * (0.95 + 0.05 * Math.cos(r * 13 + ph));
        up.push(b.vertex(x, y - half + round, z, 0, 1, 0, l * (1 + 0.2 * rim), l * (1 + 0.16 * rim), l * (1 + 0.5 * rim)));
        dn.push(r === 1 ? up[j] : b.vertex(x, y - half - round, z, 0, -1, 0, 0.4 + 0.1 * r, 0.4 + 0.1 * r, 0.4 + 0.1 * r));
      }
      tops.push(up); lows.push(dn);
    });
    for (j = 0; j < segs; j++) {
      var nx = (j + 1) % segs;
      b.i.push(c0, tops[0][nx], tops[0][j], c0 + 1, lows[0][j], lows[0][nx]);
      for (k = 1; k < radii.length; k++) {
        b.i.push(tops[k - 1][j], tops[k - 1][nx], tops[k][j], tops[k - 1][nx], tops[k][nx], tops[k][j]);
        b.i.push(lows[k - 1][j], lows[k][j], lows[k - 1][nx], lows[k - 1][nx], lows[k][j], lows[k][nx]);
      }
    }
    // Upturned branchlet tips fringe the growing margin and stud the deck.
    var fringe = 26, studs = 14;
    for (k = 0; k < fringe + studs; k++) {
      var on = k < fringe, aa = on ? (k + 0.5 * hash2(variant, k)) / fringe * TAU : ph + k * 2.39996, rr = on ? 0.95 : 0.25 + 0.65 * Math.sqrt((k - fringe + 0.5) / Math.max(1, studs));
      var ee = edge(aa) * rr, px = Math.cos(aa) * ee, pz = Math.sin(aa) * ee, py = deckY(rr, aa), len = H * (on ? 0.1 + 0.05 * hash2(k, variant + 3) : 0.055), out = on ? R * 0.05 : 0;
      b.tube(T, [V(T, px * 0.97, py - thick * 0.5, pz * 0.97), V(T, px + Math.cos(aa) * out * 0.5, py + len * 0.4, pz + Math.sin(aa) * out * 0.5), V(T, px + Math.cos(aa) * out, py + len * 0.8, pz + Math.sin(aa) * out), V(T, px + Math.cos(aa) * out, py + len, pz + Math.sin(aa) * out)], R * (on ? 0.024 : 0.02), far ? 1 : 2, 3, 0.3, function (t, cap, x, y, z, rgb) { tone(0.6 + 0.4 * t, cap, x, y, z, rgb); });
    }
    return b.build(T, true);
  }
  function buildEncrusting(T, R, H, variant, detail) {
    var far = detail === 'far'; detail = detail === true;
    var segs = far ? 12 : detail ? 28 : 18, rings = detail ? 6 : 3, ph = variant * 0.91;
    var g = polar(T, rings, segs, function (r, a, rgb) {
      // Lobed growth margins meet neighbouring colonies without the repeated
      // circular-pad silhouette. Broad relief remains legible at both LODs;
      // the material supplies the much finer corallites between those folds.
      var edge = 0.86 + 0.075 * Math.sin(a * 3 + ph) + 0.04 * Math.sin(a * 5 - ph * 0.7) + 0.025 * Math.sin(a * 2 + ph) + 0.02 * Math.sin(a * 8 + ph * 2);
      var e = R * edge * r, x = Math.cos(a) * e, z = Math.sin(a) * e;
      var lumps = noise2(x / R * 3.2 + ph, z / R * 3.2 - ph), rim = smooth(0.74, 1, r);
      var fold = Math.sin(a * 3 + ph + r * 2) * r * r * (1 - r);
      // Knobs and short columns crowd the centre (Montipora, encrusting Porites).
      var knob = smooth(0.55, 0.84, noise2(x / R * 5.5 + ph * 2, z / R * 5.5 - ph)) * (1 - rim);
      var light = 0.66 + 0.13 * lumps + 0.14 * rim + 0.12 * knob;
      rgb[0] = light * (1 + 0.1 * rim); rgb[1] = light * (1 + 0.08 * rim); rgb[2] = light * (1 + 0.3 * rim);
      // A fleshy low mound rolls into the growing margin, with more of the
      // original triangle budget moved to its smooth outer outline.
      return [x, 0.002 + H * (0.075 + Math.pow(Math.max(0, 1 - r * r), 0.72) * (0.48 + 0.32 * lumps)) + H * 0.4 * fold + H * 0.9 * knob, z];
    }, function (a, p, at, rgb) { rgb[0] = 0.63; rgb[1] = 0.62; rgb[2] = 0.59; return [p[at] * 0.97, -0.01, p[at + 2] * 0.97]; });
    var b = new Builder();
    var colors = g.attributes.color, index = 0;
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = colors.getX(index); rgb[1] = colors.getY(index); rgb[2] = colors.getZ(index++); });
    return b.build(T, false);
  }
  function buildRock(T, R, variant, detail, palette) {
    var seg = typeof detail === 'number' ? detail : detail ? 18 : 10, rings = Math.round(seg * 0.62), ph = variant * 2.399963, g = new T.SphereGeometry(1, seg, rings), pos = g.attributes.position;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), bed = Math.sin((y + 0.18 * x) * 6.6 + ph);
      var lump = 0.86 + 0.26 * noise3(x * 1.7 + ph, y * 1.7, z * 1.7) + 0.1 * noise3(x * 4.6, y * 4.6 + ph, z * 4.6) + 0.04 * noise3(x * 9, y * 9, z * 9 + ph) + 0.025 * bed / Math.sqrt(0.36 + bed * bed);
      var yy = y * lump * 0.66; if (yy < -0.12) yy = -0.12 + (yy + 0.12) * 0.25;
      pos.setXYZ(k, x * lump * R, (yy + 0.1) * R, z * lump * R);
    }
    g.computeVertexNormals(); weldSphere(g, seg, rings, true);
    var b = new Builder(), stone = palette.stone, turf = palette.turf, cca = palette.cca;
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) {
      var u = x / R, v = y / R, w = z / R, mottle = 0.85 + 0.3 * noise3(u * 4 + ph, v * 4, w * 4);
      var turfW = smooth(0.15, 0.7, ny) * smooth(0.35, 0.6, noise3(u * 3.1, v * 3.1 + 7, w * 3.1 + ph)) * palette.turfAmount;
      var ccaW = smooth(0.64, 0.75, noise3(u * 3.4 + 11, v * 3.4, w * 3.4 - ph)) * (1 - turfW * 0.7) * palette.ccaAmount;
      rgb[0] = stone.r * mottle * (1 - turfW - ccaW) + turf.r * turfW + cca.r * ccaW;
      rgb[1] = stone.g * mottle * (1 - turfW - ccaW) + turf.g * turfW + cca.g * ccaW;
      rgb[2] = stone.b * mottle * (1 - turfW - ccaW) + turf.b * turfW + cca.b * ccaW;
    });
    return b.build(T, false);
  }
  function buildRubble(T, R, variant, palette) {
    var b = new Builder(), pieces = 7 + (variant % 2), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), p = new T.Vector3(), k;
    function tone(x, y, z, nx, ny, nz, rgb) {
      var turfW = smooth(0.38, 0.62, noise3(x * 30 + variant, y * 30, z * 30)) * 0.85 * palette.turfAmount, pink = smooth(0.66, 0.82, noise3(x * 22, y * 22 + 5, z * 22)) * 0.45, base = 0.38 + 0.16 * noise3(x * 60, y * 60, z * 60);
      rgb[0] = base * (1 - turfW) + palette.turf.r * turfW + (palette.cca.r - base) * pink;
      rgb[1] = base * (1 - turfW) + palette.turf.g * turfW + (palette.cca.g - base) * pink;
      rgb[2] = base * 0.97 * (1 - turfW) + palette.turf.b * turfW + (palette.cca.b - base) * pink;
    }
    for (k = 0; k < pieces; k++) {
      var h1 = hash2(variant, k * 7 + 1), h2 = hash2(variant, k * 7 + 2), h3 = hash2(variant, k * 7 + 3), h4 = hash2(variant, k * 7 + 4);
      var len = 0.05 + 0.1 * h1, rad = 0.011 + 0.012 * h2, ang = h3 * TAU, dist = R * 0.8 * Math.sqrt(h4);
      // Broken branch fragments mingle with flatter pieces of reef limestone.
      var chunk = k % 4 === 0, cyl = chunk ? new T.IcosahedronGeometry(1, 0) : new T.CylinderGeometry(rad * 0.85, rad, len, 5, 1, false);
      if (chunk) cyl.scale(rad * 1.7, len * 0.4, rad * 1.2);
      var cp = cyl.attributes.position;
      for (var j = 0; j < cp.count; j++) if (Math.abs(Math.abs(cp.getY(j)) - len / 2) < 1e-6) {
        var spot = Math.round((Math.atan2(cp.getZ(j), cp.getX(j)) + 4) * 1000) + (cp.getY(j) > 0 ? 7777 : 0) + (Math.hypot(cp.getX(j), cp.getZ(j)) < 1e-6 ? 3333 : 0);
        cp.setY(j, cp.getY(j) + (hash2(k * 31 + spot, variant) - 0.5) * rad * 1.8);
      }
      cyl.computeVertexNormals();
      e.set(Math.PI / 2 + (h1 - 0.5) * 0.3, h2 * TAU, (h3 - 0.5) * 0.25, 'YXZ'); q.setFromEuler(e);
      p.set(Math.cos(ang) * dist, rad * 0.9 + (k % 3 === 2 ? rad * 1.4 : 0), Math.sin(ang) * dist);
      b.absorb(T, cyl, m.compose(p, q, s), tone);
    }
    return b.build(T, false);
  }
  // Fleshy seaweed (Sargassum, Turbinaria): leafy fronds rise and arch from one
  // holdfast; each frond twists, so its leaves catch the light at many angles.
  function buildAlgae(T, R, H, variant, detail, tint) {
    var far = detail === 'far', b = new Builder(), blades = 10, sections = far ? 3 : detail ? 10 : 6, baseC = tint.base, tipC = tint.tip;
    b.useExtra('reefBladePhase');
    for (var k = 0; k < blades; k++) {
      var h1 = hash2(variant, k * 5 + 1), h2 = hash2(variant, k * 5 + 2), h3 = hash2(variant, k * 5 + 3);
      var yaw = k * 2.39996 + variant * 0.37, rr = R * 0.32 * Math.sqrt((k + 0.5) / blades), bx = Math.cos(yaw) * rr, bz = Math.sin(yaw) * rr;
      var h = H * (0.55 + 0.45 * h1), width = (0.075 + 0.05 * h2) * Math.min(1.4, R / 0.2), lean = 0.45 + 0.6 * h3, dx = Math.cos(yaw), dz = Math.sin(yaw), first = b.count(), row, col;
      b.extra.value = h1 * TAU;
      for (row = 0; row <= sections; row++) {
        var t = row / sections, turn = yaw + (h2 - 0.5) * 0.8 + t * (1.1 + h3), ax = -Math.sin(turn), az = Math.cos(turn);
        // Leaf lobes along the frond, narrowing to a fine tip.
        var env = (0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 3.5 + k * 1.3))) * (1 - 0.75 * Math.pow(t, 3)) * smooth(0, 0.18, t) + 0.12;
        var out = lean * h * t * t * 0.65, cx = bx + dx * out, cz = bz + dz * out, y = t * h * (1 - 0.15 * lean * t) - 0.004, light = 0.86 + 0.14 * Math.sin(t * 7 + k);
        for (col = 0; col < 3; col++) {
          var side = col - 1, across = side * width * 0.5 * env, fold = (1 - Math.abs(side)) * width * 0.16 * Math.sin(t * Math.PI), sh = light * (side === 0 ? 1.06 : 0.94);
          b.vertex(cx + ax * across + dx * fold, y, cz + az * across + dz * fold, 0, 1, 0, (baseC.r + (tipC.r - baseC.r) * t) * sh, (baseC.g + (tipC.g - baseC.g) * t) * sh, (baseC.b + (tipC.b - baseC.b) * t) * sh);
        }
      }
      for (row = 0; row < sections; row++) for (col = 0; col < 2; col++) { var a0 = first + row * 3 + col; b.i.push(a0, a0 + 1, a0 + 3, a0 + 1, a0 + 4, a0 + 3); }
    }
    return b.build(T, true);
  }
  function buildSponge(T, R, H, variant, sides) {
    var b = new Builder();
    // Every detail tier samples the same three tubes and rounded wall profile.
    // Additional rim samples soften the osculum without moving its centre.
    var profile = [[0, 0.82, 0.65], [0.32, 0.94, 0.73], [0.7, 1.10, 0.825], [0.91, 1.11, 0.87], [0.985, 1.08, 0.89], [1.012, 1.01, 0.88], [1.018, 0.94, 0.84], [1.005, 0.86, 0.77], [0.96, 0.76, 0.61], [0.86, 0.70, 0.38], [0.68, 0.40, 0.22], [0.56, 0.08, 0.15]];
    for (var k = 0; k < 3; k++) {
      var a = variant + k * 2.1, d = k ? R * (0.33 + 0.045 * Math.sin(k + variant)) : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, h = H * (1 - k * 0.22);
      var bulge = 0.045 + 0.035 * hash2(k + 12, variant);
      var radius = R * (0.26 - k * 0.04), first = b.count();
      for (var row = 0; row < profile.length; row++) for (var j = 0; j < sides; j++) {
        var ang = j / sides * TAU, t = profile[row][0], r = radius * profile[row][1] * (1 + bulge * Math.sin(ang * 3 + a + t * 0.8) + 0.025 * Math.sin(ang * 5 - t * 2));
        var lip = Math.pow(t, 4) * h * (0.026 * Math.sin(ang * 2 + k) + 0.012 * Math.sin(ang * 3 + a));
        var tone = profile[row][2] * (0.96 + 0.07 * noise3(Math.cos(ang) * 4, t * 7, Math.sin(ang) * 4));
        b.vertex(x * (1 + 0.3 * t * t) + Math.cos(ang) * r * (1.04 - 0.035 * t) + radius * 0.2 * t * t * Math.cos(a), h * t + lip, z * (1 + 0.3 * t * t) + Math.sin(ang) * r * (0.96 + 0.025 * t) + radius * 0.2 * t * t * Math.sin(a), 0, 1, 0, tone, tone, tone);
        if (row) { var q = first + (row - 1) * sides + j, qn = first + (row - 1) * sides + (j + 1) % sides; b.i.push(q, q + sides, qn, qn, q + sides, qn + sides); }
      }
      // The tapered inner wall closes well below the lip, retaining a shaded
      // opening instead of letting the background show through its floor.
      var floor = b.count(), last = first + (profile.length - 1) * sides, fx = 0, fy = 0, fz = 0;
      for (j = 0; j < sides; j++) { var pi = (last + j) * 3; fx += b.p[pi]; fy += b.p[pi + 1]; fz += b.p[pi + 2]; }
      b.vertex(fx / sides, fy / sides, fz / sides, 0, 1, 0, 0.15, 0.15, 0.15);
      for (j = 0; j < sides; j++) b.i.push(last + j, floor, last + (j + 1) % sides);
    }
    return b.build(T, true);
  }
  // Soft coral: a fleshy trunk with branches ending in polyp lobes (sways).
  function buildSoftCoral(T, R, H, variant, detail) {
    var far = detail === 'far'; detail = detail === true;
    var b = new Builder(), sides = far ? 3 : detail ? 5 : 4, steps = far ? 2 : 3, branches = 6;
    function tone(t, cap, x, y, z, rgb) {
      var h = clamp(y / H, 0, 1), tissue = noise3(x * 27 + variant, y * 31, z * 27);
      rgb[0] = rgb[1] = rgb[2] = (0.61 + 0.32 * smooth(0.04, 0.85, h) + 0.07 * h) * (0.94 + 0.12 * tissue);
    }
    b.useExtra('reefBladePhase'); b.extra.value = variant; b.caps = detail ? 2 : 1;
    // A single phase keeps every fleshy junction joined as the shared current
    // flexes the colony. Height-dependent lag still relaxes its outer crown.
    b.tube(T, [V(T, 0, -0.01, 0), V(T, -R * 0.055, H * 0.14, R * 0.025), V(T, R * 0.075, H * 0.26, -R * 0.025), V(T, R * 0.025, H * 0.36, 0)], R * 0.24, 3, sides, 0.35, tone);
    for (var k = 0; k < branches; k++) {
      var a = variant * 1.3 + k * 2.39996 + 0.13 * Math.sin(k * 2.17 + variant), f = 0.55 + 0.45 * hash2(k + variant * 7, 31), dx = Math.cos(a), dz = Math.sin(a);
      var shoulder = 0.76 + 0.22 * hash2(k + 11, variant + 4), curl = R * (0.035 + 0.06 * hash2(k + 71, variant));
      var tip = V(T, dx * R * (0.64 + 0.36 * f) * shoulder, H * (0.57 + 0.31 * f), dz * R * (0.64 + 0.36 * f) * shoulder);
      b.tube(T, [V(T, dx * R * 0.045 + R * 0.025, H * (0.28 + 0.035 * f), dz * R * 0.045), V(T, dx * R * 0.36 - dz * curl, H * 0.43, dz * R * 0.36 + dx * curl), V(T, tip.x * 1.04 - dz * curl * 0.4, tip.y * 0.82, tip.z * 1.04 + dx * curl * 0.4), tip], R * (0.1 + 0.025 * f), steps, sides, 0.24, tone);
      // Split the fleshy crown into irregular finger-like lobes, rather than
      // ending every branch with an identical round bead.
      var fingers = 3;
      for (var j = 0; j < fingers; j++) {
        var fa = a + j * 2.39996 + 0.2 * Math.sin(k + j * 1.73), reach = R * (0.12 + 0.13 * hash2(k + variant, j + 41)), tx = tip.x + Math.cos(fa) * reach, tz = tip.z + Math.sin(fa) * reach;
        var top = tip.y + R * (0.18 + 0.23 * hash2(k + 73, j + variant)), rad = R * (0.069 + 0.013 * hash2(k + 93, j + variant));
        b.tube(T, [V(T, tip.x, tip.y - R * 0.06, tip.z), V(T, tip.x + (tx - tip.x) * 0.65, tip.y + R * 0.02, tip.z + (tz - tip.z) * 0.65), V(T, tx, top - rad, tz), V(T, tx, top, tz)], rad, far ? 1 : detail ? 3 : 2, sides, 0.25, tone);
      }
    }
    var geometry = b.build(T, false);
    geometry.boundingSphere.radius += H * 0.13;
    return geometry;
  }
  // Sea fan: a flat branching lattice that faces across the current (sways).
  function buildFan(T, R, H, variant, detail, sparse) {
    var b = new Builder(), spokes = 7, rows = 4;
    function tone(t, cap, x, y, z, rgb) { rgb[0] = rgb[1] = rgb[2] = (0.65 + 0.32 * clamp(y / H, 0, 1)) * (0.96 + 0.08 * noise3(x * 21 + variant, y * 25, z * 21)); }
    b.useExtra('reefBladePhase'); b.extra.value = variant; b.caps = 1;
    // Linked veins share a phase: a net must bend as one living surface,
    // including where each crossing joins the adjacent curved branch.
    function point(index, t) {
      var u = index / (spokes - 1), a = -1.15 + u * 2.3 + 0.085 * Math.sin(u * 5.7 + variant), edge = 0.88 + 0.09 * Math.sin(index * 2.7 + variant) + 0.025 * Math.sin(index * 4.1), r = H * 0.84 * edge * t;
      // Unequal branch spacing, swept shoulders and cupping replace a rigid
      // radial lattice while preserving its open, light-catching windows.
      var x = Math.sin(a) * r * R / H * 1.55 * (0.82 + 0.18 * t) + R * 0.07 * Math.sin(variant + t * 2) * t * t;
      var y = H * 0.14 + Math.cos(a) * r + H * 0.035 * Math.sin(index * 2.3 + variant) * t * t;
      var z = R * (0.115 * Math.sin(a * 2 + variant) * t * t + 0.045 * Math.sin(t * 5 + a) * t) + 0.05 * x * t;
      return V(T, x, y, z);
    }
    b.tube(T, [V(T, 0, -0.01, 0), V(T, R * 0.018, H * 0.06, 0), V(T, -R * 0.012, H * 0.12, 0), V(T, 0, H * 0.18, 0)], R * 0.042, sparse ? 2 : 3, sparse ? 3 : 4, 0.6, tone);
    for (var i = 0; i < spokes; i++) {
      b.tube(T, [point(i, 0), point(i, 0.35), point(i, 0.72), point(i, 1)], R * 0.022, sparse ? 2 : detail ? 4 : 3, 3, 0.72, tone);
      // Anastomosing side veins make open, irregular windows between the
      // radiating branches. Their slight cupping catches the passing light.
      if (i < spokes - 1) for (var j = 1; j <= rows; j++) {
        var t = 0.19 + j / (rows + 1) * 0.78 + 0.025 * Math.sin(i * 1.7 + j * 2.9 + variant), skew = (hash2(i + variant, j + 9) - 0.5) * 0.17;
        var start = point(i, t), end = point(i + 1, clamp(t + skew, 0.18, 0.98));
        var p1 = start.clone().lerp(end, 0.32), p2 = start.clone().lerp(end, 0.7);
        p1.y += H * (0.016 + 0.025 * hash2(i + 5, j + variant)); p2.y += H * (0.012 + 0.025 * hash2(j, i + variant));
        p1.z += R * 0.025; p2.z += R * 0.02;
        b.tube(T, [start, p1, p2, end], R * (0.008 + 0.003 * (1 - t)), sparse ? 1 : 2, 3, 0.1, tone);
      }
      for (var side = -1; side <= 1; side += 2) {
        var tip = point(i, 0.82), twig = point(i, 1);
        twig.x += side * R * (0.06 + 0.05 * hash2(i + variant, side + 3)); twig.y -= H * (0.018 + 0.035 * hash2(i + 27, side + variant));
        b.tube(T, [tip, tip.clone().lerp(twig, 0.36), tip.clone().lerp(twig, 0.72), twig], R * 0.008, sparse ? 1 : 2, 3, 0.7, tone);
      }
    }
    var geometry = b.build(T, false);
    geometry.boundingSphere.radius += H * 0.08;
    return geometry;
  }
  // Barrel sponge: a ridged vase with a dark open interior.
  function buildBarrel(T, R, H, variant, detail) {
    var pts = [], n = detail ? 10 : 6, k, t;
    for (k = 0; k <= n; k++) { t = k / n; pts.push(new T.Vector2(R * (0.55 + 0.48 * smooth(0, 0.84, t) - 0.11 * smooth(0.68, 1, t)), H * t)); }
    pts.push(new T.Vector2(R * 0.87, H * 1.014));
    for (k = n; k >= 1; k--) { t = k / n; pts.push(new T.Vector2(R * (0.39 + 0.42 * smooth(0, 1, t)), H * (0.12 + 0.86 * t))); }
    pts.push(new T.Vector2(0.001, H * 0.12));
    var g = new T.LatheGeometry(pts, detail ? 22 : 12), pos = g.attributes.position;
    for (k = 0; k < pos.count; k++) {
      // Knobbly vertical ridges and a wavy, uneven lip: a sponge, not a pot.
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), a = Math.atan2(z, x), f = clamp(y / H, 0, 1), ridge = 1 + 0.065 * Math.pow(0.5 + 0.5 * Math.sin(a * 7 + variant + f * 0.8), 2);
      var lump = 1 + 0.06 * Math.sin(a * 3 + variant) + 0.05 * (noise3(x / R * 3 + variant, f * 4, z / R * 3) - 0.5), lip = H * Math.pow(f, 4) * (0.024 * Math.sin(a * 3 + variant * 2) + 0.012 * Math.sin(a * 7));
      pos.setXYZ(k, x * ridge * lump + R * 0.035 * f * f * Math.cos(variant), y + lip, z * ridge * lump + R * 0.035 * f * f * Math.sin(variant));
    }
    g.computeVertexNormals();
    var b = new Builder();
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) {
      var inner = nx * x + nz * z < 0, h = clamp(y / H, 0, 1);
      rgb[0] = rgb[1] = rgb[2] = (inner ? 0.14 + 0.31 * Math.pow(h, 4) : 0.65 + 0.24 * h) * (0.91 + 0.16 * noise3(x / R * 6, y / H * 8, z / R * 6));
    });
    return b.build(T, false);
  }

  // ---- Shaders (Reef3DHabitat) ----------------------------------------------
  function inject(src, anchor, code, where) {
    if (src.indexOf(anchor) < 0) {
      var message = 'Reef3DExplore: missing shader anchor ' + anchor + ' (' + where + ')';
      warnings.push(message);
      if (global.console && global.console.warn) global.console.warn(message);
      return src;
    }
    return src.replace(anchor, function () { return anchor + '\n' + code; });
  }
  // A cheap single-scattering segment integral. Sunlit particles near the
  // surface contribute more than the same water below a deep viewpoint.
  // The scalar form is inlined per colour channel and has a stable horizon.
  var WATER_COLUMN_SOURCE = [
    'float reefWaterSource(float extinction,float distanceM,float eyeDepth,float rayUp,float sunFalloff){',
    'float d=max(0.0,distanceM),k=max(extinction,0.0001);',
    'float transmission=exp(-k*d);',
    'float sunPath=max(0.001,k-sunFalloff*clamp(rayUp,-1.0,1.0));',
    'float sunIntegral=(1.0-exp(-sunPath*d))*k/sunPath;',
    'float sunlight=exp(-max(0.0,sunFalloff)*max(0.0,eyeDepth));',
    'return min(1.08*(1.0-transmission),0.36*(1.0-transmission)+0.72*sunlight*sunIntegral);}'
  ].join('\n');
  // Normalized Schlick phase: a restrained forward lobe shared by the water
  // veil and the visible shafts, without additional texture or scene passes.
  var WATER_SCATTER_PHASE = 'float reefScatterPhase(float cosine){float g=0.48;float denominator=1.0-g*clamp(cosine,-1.0,1.0);return (1.0-g*g)/(denominator*denominator);}';

  // Display choices, not measured spectral data. Fluorescence is a teaching
  // illustration of visible emission under blue excitation, never UV vision.
  // It is restricted to living hard coral; other organisms keep their markings.
  var VISION_SURFACE = [
    'if(reefVision.y>0.5){',
    'gl_FragColor.rgb*=0.55;',
    'float reefGlowLiving=reefFluorescent;',
    '#ifdef REEF_DECOR_CORAL',
    'reefGlowLiving*=1.0-step(0.5,vReefSkeleton.x);',
    '#endif',
    'if(reefGlowLiving>0.5){',
    'float reefGlowSeed=reefFluorSeed,reefGlowStructure=0.62,reefGlowPigment=0.5;',
    '#ifdef REEF_DECOR_CORAL',
    // Use the colony's existing local tissue field. The palette and polyp
    // pattern stay attached to that colony through every detail tier.
    'reefGlowSeed=reefColonySeed;',
    'reefGlowPigment=reefTissue;',
    'reefGlowStructure=clamp(0.38+0.60*reefRim+0.20*reefSepta-0.23*reefPore-0.17*reefGroove+0.045*reefGrowthBands,0.16,1.0);',
    '#endif',
    // Illustrative pigment families, not species-specific spectral records.
    // One family per colony avoids world-space red/green patches crossing it.
    'float reefGlowFamily=reefHash(vec3(reefGlowSeed*79.0,13.7,5.3));',
    'vec3 reefGlowGreen=mix(vec3(0.055,0.86,0.16),vec3(0.035,0.72,0.54),smoothstep(0.05,0.70,reefGlowFamily));',
    'vec3 reefGlowAmber=mix(vec3(1.0,0.34,0.025),vec3(0.95,0.095,0.025),reefGlowSeed);',
    'vec3 reefGlowColor=mix(reefGlowGreen,reefGlowAmber,smoothstep(0.70,0.84,reefGlowFamily));',
    // Blue excitation reaches upward-facing tissue more strongly. This
    // leaves the undersides and recessed cups readable without extra lights.
    'float reefBlueFacing=0.72;',
    '#if defined(STANDARD) || defined(PHYSICAL)',
    'vec3 reefGlowNormal=inverseTransformDirection(normal,viewMatrix);',
    'reefBlueFacing=0.24+0.76*max(0.0,dot(reefGlowNormal,normalize(vec3(0.42,1.0,0.3))));',
    '#endif',
    'float reefGlowTissue=clamp(dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722))*2.3,0.12,0.88);',
    'float reefExcitation=exp(-0.018*max(0.0,-vReefWorld.y))*reefBlueFacing;',
    'gl_FragColor.rgb+=reefGlowColor*(0.28+0.86*reefGlowTissue)*(0.72+0.48*reefGlowPigment)*reefGlowStructure*reefExcitation;',
    '}}'
  ].join('\n');
  // Enhance colored midtones while protecting pale sand and highlights. Limit
  // the gain to available RGB headroom instead of clipping individual channels;
  // this preserves hue, luminance and the water's distance attenuation.
  var VISION_GRADE = [
    'if(reefVision.x>0.5){',
    'float reefLuma=dot(gl_FragColor.rgb,vec3(0.2126,0.7152,0.0722));',
    'vec3 reefColorDelta=gl_FragColor.rgb-vec3(reefLuma);',
    'float reefColorMax=max(max(gl_FragColor.r,gl_FragColor.g),gl_FragColor.b),reefColorMin=min(min(gl_FragColor.r,gl_FragColor.g),gl_FragColor.b);',
    'float reefColorfulness=smoothstep(0.035,0.22,reefColorMax-reefColorMin);',
    'float reefChroma=1.0+0.40*reefColorfulness*(1.0-0.55*smoothstep(0.50,0.92,reefLuma));',
    'float reefHeadroom=min((1.0-reefLuma)/max(0.0001,reefColorMax-reefLuma),reefLuma/max(0.0001,reefLuma-reefColorMin));',
    'reefChroma=min(reefChroma,max(1.0,reefHeadroom));',
    'gl_FragColor.rgb=clamp(vec3(reefLuma)+reefColorDelta*reefChroma,0.0,1.0);}'
  ].join('\n');
  function visionMode(value) { return value === 'vivid' || value === 'fluorescence' ? value : 'natural'; }

  function shaderParts() { return { vCommon: [], vNormal: [], vBegin: [], vProject: [], fCommon: [], fColor: [], fRough: [], fNormal: [], fEmissive: [] }; }
  function applyParts(shader, parts, where) {
    var v = shader.vertexShader, f = shader.fragmentShader;
    function put(src, anchor, list) { return list.length ? inject(src, anchor, list.join('\n'), where) : src; }
    v = put(v, '#include <common>', parts.vCommon); v = put(v, '#include <beginnormal_vertex>', parts.vNormal);
    v = put(v, '#include <begin_vertex>', parts.vBegin); v = put(v, '#include <project_vertex>', parts.vProject);
    f = put(f, '#include <common>', parts.fCommon); f = put(f, '#include <color_fragment>', parts.fColor);
    f = put(f, '#include <roughnessmap_fragment>', parts.fRough); f = put(f, '#include <normal_fragment_maps>', parts.fNormal);
    f = put(f, '#include <emissivemap_fragment>', parts.fEmissive);
    if (parts.fLighting && parts.fLighting.length) {
      f = inject(f, '#include <shadowmap_pars_fragment>', '#include <shadowmask_pars_fragment>', where);
      f = put(f, '#include <lights_fragment_end>', parts.fLighting);
    }
    // Mix attenuated radiance with water scattering in linear light, before
    // the renderer tone-maps and encodes it. Applying ordinary fog afterward
    // would add a second, output-space veil and flatten the reef's colours.
    if (parts.waterColumn) {
      f = f.replace('#include <tonemapping_fragment>', VISION_SURFACE + '\n#include <tonemapping_fragment>');
      f = f.replace('#include <tonemapping_fragment>', "#ifdef USE_FOG\nfloat reefOpticalDistance=length(vViewPosition);\nvec3 reefTransmission=exp(-reefWaterExtinction*reefOpticalDistance);\nvec3 reefWaterRay=(vReefWorld-reefWaterEye)/max(reefOpticalDistance,0.0001);\nfloat reefEyeDepth=max(0.0,-reefWaterEye.y);\nvec3 reefColumnSource=vec3(reefWaterSource(reefWaterExtinction.r,reefOpticalDistance,reefEyeDepth,reefWaterRay.y,reefWaterSunFalloff),reefWaterSource(reefWaterExtinction.g,reefOpticalDistance,reefEyeDepth,reefWaterRay.y,reefWaterSunFalloff),reefWaterSource(reefWaterExtinction.b,reefOpticalDistance,reefEyeDepth,reefWaterRay.y,reefWaterSunFalloff));\nfloat reefForwardPhase=reefScatterPhase(dot(reefWaterRay,normalize(vec3(0.42,1.0,0.3))));\nvec3 reefInscatter=reefWaterScatter*reefColumnSource*(0.88+0.1*reefForwardPhase);\ngl_FragColor.rgb=gl_FragColor.rgb*reefTransmission+reefInscatter;\n#endif" + '\n#include <tonemapping_fragment>');
      f = f.replace('#include <fog_fragment>', '');
      f = f.replace('#include <encodings_fragment>', VISION_GRADE + '\n#include <encodings_fragment>');
    }
    shader.vertexShader = v; shader.fragmentShader = f;
  }
  var GLSL_NOISE = [
    'float reefHash(vec3 p){p=mod(p,127.0);float h=mod(p.x*7.0+19.0,127.0);h=mod(h*mod(h,13.0)+p.y*5.0+23.0,127.0);h=mod(h*mod(h,11.0)+p.z*3.0+31.0,127.0);h=mod(h*mod(h,7.0)+17.0,127.0);return h/126.0;}',
    'float reefNoise(vec3 p){vec3 i=floor(p),f=p-i;f=f*f*(3.0-2.0*f);',
    'float a=mix(reefHash(i),reefHash(i+vec3(1.0,0.0,0.0)),f.x),b=mix(reefHash(i+vec3(0.0,1.0,0.0)),reefHash(i+vec3(1.0,1.0,0.0)),f.x);',
    'float c=mix(reefHash(i+vec3(0.0,0.0,1.0)),reefHash(i+vec3(1.0,0.0,1.0)),f.x),d=mix(reefHash(i+vec3(0.0,1.0,1.0)),reefHash(i+vec3(1.0,1.0,1.0)),f.x);',
    'return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);}'
  ].join('\n');
  var WORLD_VERTEX = ['vec4 reefWorldPos=vec4(transformed,1.0);', '#ifdef USE_INSTANCING', 'reefWorldPos=instanceMatrix*reefWorldPos;', '#endif', 'vReefWorld=(modelMatrix*reefWorldPos).xyz;'].join('\n');
  var CAUSTIC_COMMON = [
    'uniform sampler2D reefCausticMap;uniform float reefCausticTime;uniform float reefCausticStrength;',
    'float reefCaustic(vec2 p,float depth){',
    // All scales follow one slow current; a small evolving wave warp supplies
    // the relative motion of ripples without two visibly sliding grids.
    'float t=reefCausticTime;vec2 swell=vec2(sin(p.y*0.47+t*0.23),sin(p.x*0.39-t*0.19))*0.062;',
    'vec2 q=p*0.57+vec2(t*0.010,t*0.006)+swell;',
    'float blur=smoothstep(2.0,15.0,depth)*0.88;',
    'vec2 focus=texture2D(reefCausticMap,q).rg;float c=mix(focus.r,focus.g,blur);',
    '#ifdef REEF_CAUSTIC_LAYERS',
    'vec2 q2=vec2(p.x*0.31-p.y*0.17,p.x*0.17+p.y*0.31)+vec2(t*0.007,t*0.004)-swell*0.65+vec2(0.37,0.61);',
    'vec2 focus2=texture2D(reefCausticMap,q2).rg;float c2=mix(focus2.r,focus2.g,blur);',
    'c=max(c*0.84,c2*0.60)+c*c2*0.24;',
    '#endif',
    // Mipmaps soften subpixel folds; this final footprint fade prevents the
    // residual sparkle on grazing faces. The base path needs no derivatives.
    'float resolve=1.0;',
    '#ifdef REEF_DERIVATIVES',
    'resolve=1.0-smoothstep(0.025,0.095,max(length(dFdx(q)),length(dFdy(q))));',
    '#endif',
    'return min(c,1.0)*resolve;}'
  ].join('\n');
  // Refracted sun flecks share the sun's slant. Their focused core broadens
  // gradually with depth; upward faces receive light while overhangs stay cool.
  var CAUSTIC_APPLY = [
    'vec3 reefUpWorld=inverseTransformDirection(normal,viewMatrix);',
    'float reefSunFace=max(0.0,dot(reefUpWorld,normalize(vec3(0.42,1.0,0.3))));',
    'float reefOpticalDepth=max(0.0,-vReefWorld.y-0.9);',
    'float reefSunFleck=reefCaustic(vReefWorld.xz-vReefWorld.y*vec2(0.42,0.3),reefOpticalDepth);',
    // The broad light pool and its finer caustics share a surface projection.
    // A quiet change in direct light lets the reef's contours catch each swell.
    'vec2 reefPoolSurface=vReefWorld.xz-vReefWorld.y*vec2(0.42,0.3);',
    'float reefLightPatch=reefNoise(vec3(reefPoolSurface*0.18+vec2(reefCausticTime*0.009,reefCausticTime*0.006),2.7));',
    'float reefPool=smoothstep(0.24,0.76,reefLightPatch);',
    'float reefLightCover=mix(0.29,0.80,reefPool);',
    'reflectedLight.directDiffuse*=mix(1.0,mix(0.90,1.08,reefPool),exp(-reefOpticalDepth/22.0));',
    'float reefFleckDistance=1.0-smoothstep(10.0,27.0,length(vViewPosition));',
    'totalEmissiveRadiance+=diffuseColor.rgb*vec3(1.0,0.98,0.88)*reefCausticStrength*exp(-reefOpticalDepth/11.0)*reefSunFleck*reefLightCover*reefFleckDistance*smoothstep(0.10,0.95,reefSunFace);'
  ].join('\n');
  var ABSORB = 'diffuseColor.rgb*=mix(vec3(1.0),exp(-vec3(0.065,0.018,0.008)*max(0.0,-vReefWorld.y)),0.62);';
  // The dive light. Its light crosses only the short path from the diver, so it
  // brings back the colour that the long path down from the surface took away:
  // the albedo is recovered by undoing ABSORB (every patch only multiplies it).
  // Uniforms only, so switching it on never builds another shader program.
  var TORCH_POWER = 7, TORCH_REACH = 5.5, TORCH_OUTER = Math.cos(30 * Math.PI / 180), TORCH_INNER = Math.cos(12 * Math.PI / 180);
  var TORCH_COMMON = 'uniform vec3 reefTorchPos;uniform vec3 reefTorchDir;uniform vec4 reefTorch;';
  var TORCH_LIGHT = [
    'if(reefTorch.x>0.0){',
    'vec3 reefTorchTo=reefTorchPos-vReefWorld;float reefTorchD=max(length(reefTorchTo),0.001);reefTorchTo/=reefTorchD;',
    // A soft-edged cone, spreading with distance (softened close up, as from a
    // lamp face, not a point) and a smooth end of reach.
    'float reefTorchBeam=reefTorch.x*smoothstep(reefTorch.y,reefTorch.z,-dot(reefTorchTo,reefTorchDir))*(1.0-smoothstep(reefTorch.w*0.45,reefTorch.w,reefTorchD))/(reefTorchD*reefTorchD+2.5);',
    'if(reefTorchBeam>0.0001){',
    'vec3 reefTorchAlbedo=material.diffuseColor/mix(vec3(1.0),exp(-vec3(0.065,0.018,0.008)*max(0.0,-vReefWorld.y)),0.62);',
    'IncidentLight reefTorchLight;reefTorchLight.direction=normalize((viewMatrix*vec4(reefTorchTo,0.0)).xyz);reefTorchLight.visible=true;',
    'reefTorchLight.color=vec3(1.0,0.82,0.62)*reefTorchBeam*exp(-reefWaterExtinction*reefTorchD);',
    'float reefTorchNL=saturate(dot(geometry.normal,reefTorchLight.direction));',
    'reflectedLight.directDiffuse+=reefTorchLight.color*reefTorchNL*reefTorchAlbedo;',
    // A lamp beside the eyes puts a highlight on every facing surface; a light
    // one keeps the wet sheen without bleaching the colour it brings back.
    '#ifdef REEF_TORCH_SPECULAR',
    'reflectedLight.directSpecular+=reefTorchLight.color*reefTorchNL*PI*0.35*BRDF_Specular_GGX(reefTorchLight,geometry.viewDir,geometry.normal,material.specularColor,material.specularRoughness);',
    '#endif',
    '}}'
  ].join('\n');
  function surfaceRelief(height, limit) {
    return [
      '#ifdef REEF_DERIVATIVES',
      '{float reefH=' + height + ';',
      'vec3 reefDx=dFdx(-vViewPosition),reefDy=dFdy(-vViewPosition);',
      'vec3 reefRx=cross(reefDy,normal),reefRy=cross(normal,reefDx);',
      'float reefDet=dot(reefDx,reefRx);',
      '#ifdef DOUBLE_SIDED',
      'reefDet*=faceDirection;',
      '#endif',
      'float reefHx=dFdx(reefH),reefHy=dFdy(reefH);',
      'if(abs(reefDet)>0.0000000001){vec3 reefG=(reefRx*reefHx+reefRy*reefHy)/reefDet;reefG-=normal*dot(normal,reefG);',
      'reefG*=min(1.0,' + limit + '/max(length(reefG),0.000001));normal=normalize(normal-reefG);}}',
      '#endif'
    ].join('\n');
  }
  function createSubstrateTexture(T) {
    // One small, seamless data map is shared by sand and limestone. Baking the
    // grain once gives close-range mineral detail without many fragment-noise
    // octaves, and mipmaps turn distant grit into an even, stable surface.
    var size = 256, data = new Uint8Array(size * size * 4);
    function tiled(u, v, n, salt) {
      var x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var x0 = (ix % n + n) % n, x1 = (x0 + 1) % n, y0 = (iy % n + n) % n, y1 = (y0 + 1) % n;
      return lerp(lerp(hash2(x0 + salt, y0), hash2(x1 + salt, y0), fx), lerp(hash2(x0 + salt, y1), hash2(x1 + salt, y1), fx), fy);
    }
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var u = (x + 0.5) / size, v = (y + 0.5) / size;
      var warp = tiled(u, v, 5, 101), wu = u + (warp - 0.5) * 0.055, wv = v + (tiled(u, v, 7, 337) - 0.5) * 0.055;
      var body = tiled(wu, wv, 13, 193), fragments = tiled(wu, wv, 39, 761), grit = tiled(u, v, 113, 1811);
      var pores = 1 - smooth(0.16, 0.36, tiled(wu, wv, 61, 1237));
      var crust = 0.54 * tiled(wu, wv, 11, 2347) + 0.31 * tiled(wu, wv, 29, 3313) + 0.15 * fragments;
      var chip = smooth(0.69, 0.86, fragments) * (0.65 + 0.35 * grit), at = (y * size + x) * 4;
      data[at] = Math.round(255 * clamp(0.5 + (body - 0.5) * 0.38 + (fragments - 0.5) * 0.24 + (grit - 0.5) * 0.12 - pores * 0.25, 0, 1));
      data[at + 1] = Math.round(255 * grit);
      data[at + 2] = Math.round(255 * smooth(0.49, 0.65, crust));
      data[at + 3] = Math.round(255 * chip);
    }
    var texture = new T.DataTexture(data, size, size, T.RGBAFormat);
    texture.name = 'reef-carbonate-grain'; texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.magFilter = T.LinearFilter; texture.minFilter = T.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.anisotropy = 4; texture.needsUpdate = true;
    return texture;
  }
  function createCausticTexture(T, size) {
    // Trace a periodic mixture of smooth surface waves into a receiver plane.
    // Their focusing produces curved folds and bright crossing cusps rather
    // than the straight, equally spaced cells of a Voronoi edge map. Baking
    // the ray density once keeps the underwater shader to one sample per layer.
    var waves = [[1, 1, 0.050, 0.2], [2, -1, 0.038, 1.7], [1, -3, 0.027, 2.9], [3, 2, 0.023, 4.1], [-2, 4, 0.016, 5.4], [5, 1, 0.011, 0.8], [4, -3, 0.008, 3.6]];
    var flux = new Float32Array(size * size), data = new Uint8Array(size * size * 4), rays = size * 2;
    function wrap(v) { return (v % size + size) % size; }
    // Separate the phase into X and Y tables. This keeps the one-time bake
    // inexpensive even on the low tier: no trigonometry runs in the ray loop.
    var fields = waves.map(function (wave) {
      var kn = Math.sqrt(wave[0] * wave[0] + wave[1] * wave[1]);
      var f = { dx: wave[2] * wave[0] / kn, dy: wave[2] * wave[1] / kn, cx: new Float32Array(rays), sx: new Float32Array(rays), cy: new Float32Array(rays), sy: new Float32Array(rays) };
      for (var i = 0; i < rays; i++) {
        var xPhase = TAU * wave[0] * (i + 0.5) / rays + wave[3], yPhase = TAU * wave[1] * (i + 0.5) / rays;
        f.cx[i] = Math.cos(xPhase); f.sx[i] = Math.sin(xPhase); f.cy[i] = Math.cos(yPhase); f.sy[i] = Math.sin(yPhase);
      }
      return f;
    });
    for (var sy = 0; sy < rays; sy++) for (var sx = 0; sx < rays; sx++) {
      var qx = (sx + 0.5) / rays, qy = (sy + 0.5) / rays;
      for (var w = 0; w < fields.length; w++) {
        var field = fields[w], deflect = field.cx[sx] * field.cy[sy] - field.sx[sx] * field.sy[sy];
        qx += field.dx * deflect; qy += field.dy * deflect;
      }
      var x = qx * size - 0.5, y = qy * size - 0.5, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      flux[wrap(iy) * size + wrap(ix)] += (1 - fx) * (1 - fy) * 0.25;
      flux[wrap(iy) * size + wrap(ix + 1)] += fx * (1 - fy) * 0.25;
      flux[wrap(iy + 1) * size + wrap(ix)] += (1 - fx) * fy * 0.25;
      flux[wrap(iy + 1) * size + wrap(ix + 1)] += fx * fy * 0.25;
    }
    // Red carries focused irradiance; green stores its wider, dimmer penumbra.
    // The two share a wave field, so deeper light softens without a second fetch.
    var sharp = new Float32Array(size * size), soft = new Float32Array(size * size), blurRadius = Math.max(1, Math.round(size / 64));
    for (var i = 0; i < flux.length; i++) sharp[i] = Math.min(1, Math.pow(Math.max(0, flux[i] - 0.84) * 0.34, 0.92));
    for (var by = 0; by < size; by++) for (var bx = 0; bx < size; bx++) {
      var sum = 0;
      for (var dx = -blurRadius; dx <= blurRadius; dx++) sum += sharp[by * size + wrap(bx + dx)];
      soft[by * size + bx] = sum / (blurRadius * 2 + 1);
    }
    for (var py = 0; py < size; py++) for (var px = 0; px < size; px++) {
      var broad = 0;
      for (var dy = -blurRadius; dy <= blurRadius; dy++) broad += soft[wrap(py + dy) * size + px];
      var at = (py * size + px) * 4;
      data[at] = Math.round(255 * sharp[py * size + px]);
      data[at + 1] = Math.round(255 * broad / (blurRadius * 2 + 1));
      data[at + 2] = data[at]; data[at + 3] = 255;
    }
    var tex = new T.DataTexture(data, size, size, T.RGBAFormat);
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    tex.needsUpdate = true; tex.name = 'reef-explore-caustics';
    return tex;
  }
  function gridAxis(lo, hi, step, outerLo, outerHi, growth) {
    var out = [], v, s;
    for (v = lo; v < hi - 1e-6; v += step) out.push(v);
    out.push(hi);
    for (s = step, v = lo; v > outerLo + 1e-6;) { s *= growth; v = Math.max(outerLo, v - s); out.unshift(v); }
    for (s = step, v = hi; v < outerHi - 1e-6;) { s *= growth; v = Math.min(outerHi, v + s); out.push(v); }
    return out;
  }

  // ---- Placeholder organisms (only when Reef3DSpecies is absent) ---------------
  // [shape, colour A, colour B, height ratio, width ratio, bands]
  var LOOKS = {
    clownfish: ['fish', 0xf2761c, 0xffffff, 0.42, 0.24, [0.24, -0.04, -0.3]], blue_tang: ['fish', 0x2a5fd0, 0xf2d03a, 0.55, 0.16],
    parrotfish: ['fish', 0x2fae96, 0xe0806a, 0.36, 0.22], bumphead_parrotfish: ['fish', 0x5f7a6a, 0xa8c0b0, 0.42, 0.26],
    moorish_idol: ['disc', 0xf3e9c8, 0x111111, 0.8, 0.12, [0.15, -0.15]], threadfin_butterflyfish: ['disc', 0xf0f0e0, 0xf2c81e, 0.66, 0.12],
    emperor_angelfish: ['disc', 0x23409e, 0xf2c522, 0.62, 0.14], anthias: ['fish', 0xf07aa0, 0xf5b03c, 0.34, 0.16],
    blue_green_chromis: ['fish', 0x6fd6c8, 0x2a8fb0, 0.42, 0.18], lionfish: ['fish', 0xb84a3a, 0xf5e6d8, 0.4, 0.2, [0.2, 0.05, -0.1, -0.25]],
    peacock_grouper: ['fish', 0x2a3550, 0x6fb6ff, 0.34, 0.24], humphead_wrasse: ['fish', 0x3f8a6a, 0x9ed0a8, 0.38, 0.24],
    cleaner_wrasse: ['fish', 0x2a6fd8, 0x111111, 0.2, 0.12], clown_triggerfish: ['fish', 0x1a1a1a, 0xf2f2e8, 0.48, 0.2],
    porcupinefish: ['puffer', 0xb8a070, 0x2a2a2a], yellow_boxfish: ['box', 0xf2d02a, 0x2a2a2a], giant_moray: ['eel', 0x6f7a3a, 0x3a4220],
    whitetip_reef_shark: ['shark', 0x8a8f96, 0xffffff], bluespotted_stingray: ['ray', 0xb89a60, 0x3fa0ff], bluestripe_snapper: ['fish', 0xf2c01e, 0x3f9fff, 0.32, 0.16],
    oriental_sweetlips: ['fish', 0xe8e0c8, 0x1a1a1a, 0.34, 0.2, [0.1, -0.12]], reef_manta: ['manta', 0x1d2228, 0xf2f2f2],
    green_turtle: ['turtle', 0x6f6a3a, 0xc8b88a], hawksbill_turtle: ['turtle', 0x8a5a2a, 0xe0c080],
    magnificent_anemone: ['anemone', 0xd8b060, 0xc23a6a], giant_clam: ['clam', 0x9a9070, 0x3a7fd0], crown_of_thorns: ['star', 0x9a3a6a, 0xd84a3a, 13],
    blue_sea_star: ['star', 0x2f6fe0, 0x5f8ff0, 5], long_spined_urchin: ['urchin', 0x111116, 0x2a2a3a], nudibranch: ['slug', 0x7a3ad8, 0xf5a01e],
    cleaner_shrimp: ['slug', 0xd83a2a, 0xffffff], christmas_tree_worm: ['worm', 0x3fb0ff, 0xf5f5f5], day_octopus: ['octopus', 0x9a6a4a, 0xd0a080],
    sea_cucumber: ['cucumber', 0x2a2a20, 0x5a5040], sea_fan: ['fan', 0xc84a6a, 0xe07a8a], barrel_sponge: ['barrel', 0x9a4a3a, 0xc07050],
    soft_coral: ['soft', 0xe07ab0, 0xf5c0d8], brain_coral: ['brain', 0xb8a050, 0x7a8a40], staghorn_coral: ['staghorn', 0xc8a070, 0xe8d0a0],
    table_coral: ['table', 0x8a9a5a, 0xb0c080], mushroom_coral: ['mushroom', 0xb8a080, 0xd8c8a0], boulder_coral: ['boulder', 0x8a7a50, 0xa89a60],
    cauliflower_coral: ['staghorn', 0xb68180, 0xe4c5bd], foliose_coral: ['table', 0xb78675, 0xe8cbb5],
    reef_star: ['reefstar', 0x4a3a2a, 0xe08a6a], reef_ball: ['reefball', 0xb8b4a8, 0xe08a6a], coral_tree_nursery: ['nursery', 0xf2f2ea, 0xe8a070]
  };
  var FRAGMENT_HEX = [0xe07aa0, 0x9a5bd0, 0xf28a3a, 0x8fd14f, 0xe9c84a, 0x3fb8c8];
  function placeholderGeometry(T, id, info, growth, healthValue, detail) {
    var look = LOOKS[id] || (info.group === 'coral' ? ['brain', 0xa89060, 0x8a7a50] : info.group === 'structure' ? ['reefball', 0xb8b4a8, 0xe08a6a] :
      info.group === 'invertebrate' ? ['slug', 0xd0805a, 0xf0d0a0] : info.group === 'reptile' ? ['turtle', 0x6f6a3a, 0xc8b88a] : ['fish', 0x8a9ab0, 0xd0d8e0, 0.38, 0.2]);
    var shape = look[0], L = info.lengthM, b = new Builder(), seg = detail ? 11 : 8, k;
    function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }
    var A = lin(look[1]), B = lin(look[2]), white = new T.Color(0.92, 0.91, 0.86);
    if (info.group === 'coral') { var bl = clamp(1 - healthValue, 0, 1); A.lerp(white, bl); B.lerp(white, bl); }
    function M(x, y, z, sx, sy, sz, rx, ry, rz) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx, sy, sz)); }
    function paint(c, shade) { return function (x, y, z, nx, ny, nz, rgb) { var s = shade === false ? 1 : 0.78 + 0.26 * ny; rgb[0] = c.r * s; rgb[1] = c.g * s; rgb[2] = c.b * s; }; }
    function ball(x, y, z, sx, sy, sz, tone, rx, ry, rz) { b.absorb(T, new T.SphereGeometry(1, seg, Math.max(5, seg - 4)), M(x, y, z, sx, sy, sz, rx, ry, rz), tone); }
    function tube(pts, r, taper, c) { var tone = function (t, cap, x, y, z, rgb) { rgb[0] = c.r; rgb[1] = c.g; rgb[2] = c.b; }; b.tube(T, pts.map(function (p) { return V(T, p[0], p[1], p[2]); }), r, detail ? 4 : 3, detail ? 5 : 4, taper, tone); }
    function rgbOf(c) { return [c.r, c.g, c.b]; }
    function fin(a, c, d, col) { b.tri(a, c, d, rgbOf(col)); }
    function clump(x, y, z, size, k2) {
      var g = buildBranching(T, size, size * 1.1, k2 % 3, 4, false), col = lin(FRAGMENT_HEX[k2 % FRAGMENT_HEX.length]);
      b.absorb(T, g, M(x, y, z, 1, 1, 1, 0, k2 * 1.3, 0), function (px, py, pz, nx, ny, nz, rgb) { var s = 0.7 + 0.3 * ny; rgb[0] = col.r * s; rgb[1] = col.g * s; rgb[2] = col.b * s; });
    }
    if (shape === 'fish' || shape === 'disc' || shape === 'shark') {
      var hr = shape === 'shark' ? 0.2 : look[3] || 0.4, wr = shape === 'shark' ? 0.2 : look[4] || 0.2, bands = look[5] || [], tail = shape === 'shark' ? A : B;
      ball(0.04 * L, 0, 0, 0.5 * L, hr * 0.5 * L, wr * 0.5 * L, function (x, y, z, nx, ny, nz, rgb) {
        var u = x / L, band = false; bands.forEach(function (c) { if (Math.abs(u - c) < 0.035) band = true; });
        var c = band ? B : shape === 'shark' && ny < -0.3 ? B : A, s = 0.74 + 0.3 * ny; rgb[0] = c.r * s; rgb[1] = c.g * s; rgb[2] = c.b * s;
      });
      var ty = hr * (shape === 'shark' ? 0.9 : 0.42) * L;
      fin([-0.4 * L, 0, 0], [-0.68 * L, ty, 0], [-0.58 * L, 0, 0], tail); fin([-0.4 * L, 0, 0], [-0.58 * L, 0, 0], [-0.66 * L, -ty * (shape === 'shark' ? 0.6 : 1), 0], tail);
      var dh = shape === 'disc' ? hr * 0.95 : shape === 'shark' ? 0.17 : hr * 0.75;
      fin([0.16 * L, hr * 0.45 * L, 0], [-0.24 * L, hr * 0.4 * L, 0], [(shape === 'shark' ? 0.02 : -0.1) * L, dh * L, 0], shape === 'disc' ? B : tail);
      fin([0.08 * L, -hr * 0.45 * L, 0], [-0.2 * L, -hr * 0.4 * L, 0], [-0.12 * L, -hr * 0.75 * L, 0], tail);
      if (shape === 'shark') { fin([0.12 * L, -0.06 * L, 0.06 * L], [-0.02 * L, -0.08 * L, 0.06 * L], [-0.06 * L, -0.12 * L, 0.26 * L], A); fin([0.12 * L, -0.06 * L, -0.06 * L], [-0.06 * L, -0.12 * L, -0.26 * L], [-0.02 * L, -0.08 * L, -0.06 * L], A); }
      ball(0.36 * L, hr * 0.12 * L, wr * 0.36 * L, 0.03 * L, 0.03 * L, 0.012 * L, paint(new T.Color(0.02, 0.02, 0.03), false));
      ball(0.36 * L, hr * 0.12 * L, -wr * 0.36 * L, 0.03 * L, 0.03 * L, 0.012 * L, paint(new T.Color(0.02, 0.02, 0.03), false));
    } else if (shape === 'puffer' || shape === 'box') {
      ball(0, 0.0, 0, 0.4 * L, (shape === 'box' ? 0.26 : 0.34) * L, (shape === 'box' ? 0.24 : 0.32) * L, function (x, y, z, nx, ny, nz, rgb) {
        var spot = noise3(x / L * 9, y / L * 9, z / L * 9) > 0.7, c = spot ? B : A, s = 0.75 + 0.28 * ny; rgb[0] = c.r * s; rgb[1] = c.g * s; rgb[2] = c.b * s;
      });
      fin([-0.36 * L, 0, 0], [-0.55 * L, 0.14 * L, 0], [-0.55 * L, -0.14 * L, 0], A);
    } else if (shape === 'eel') {
      tube([[0.5 * L, 0, 0], [0.18 * L, 0.03 * L, 0.04 * L], [-0.18 * L, -0.03 * L, -0.04 * L], [-0.5 * L, 0, 0]], 0.042 * L, 0.8, A);
      ball(0.47 * L, 0.01 * L, 0, 0.06 * L, 0.045 * L, 0.04 * L, paint(B));
    } else if (shape === 'ray') {
      ball(0, 0.02 * L, 0, 0.32 * L, 0.05 * L, 0.3 * L, function (x, y, z, nx, ny, nz, rgb) { var c = noise3(x / L * 14, 0, z / L * 14) > 0.72 && ny > 0 ? B : A; rgb[0] = c.r; rgb[1] = c.g; rgb[2] = c.b; });
      tube([[-0.28 * L, 0.02 * L, 0], [-0.42 * L, 0.02 * L, 0], [-0.58 * L, 0.02 * L, 0], [-0.75 * L, 0.02 * L, 0]], 0.025 * L, 0.8, A);
    } else if (shape === 'manta') {
      ball(0, 0, 0, 0.22 * L, 0.035 * L, 0.5 * L, function (x, y, z, nx, ny, nz, rgb) { var c = ny < -0.2 ? B : A; rgb[0] = c.r; rgb[1] = c.g; rgb[2] = c.b; });
      ball(0.05 * L, 0, 0, 0.18 * L, 0.06 * L, 0.12 * L, paint(A));
      fin([0.2 * L, 0, 0.08 * L], [0.3 * L, -0.02 * L, 0.07 * L], [0.22 * L, 0, 0.02 * L], A); fin([0.2 * L, 0, -0.08 * L], [0.22 * L, 0, -0.02 * L], [0.3 * L, -0.02 * L, -0.07 * L], A);
      tube([[-0.18 * L, 0, 0], [-0.25 * L, 0, 0], [-0.32 * L, 0, 0], [-0.4 * L, 0, 0]], 0.01 * L, 0.7, A);
    } else if (shape === 'turtle') {
      ball(0, 0.04 * L, 0, 0.4 * L, 0.15 * L, 0.32 * L, function (x, y, z, nx, ny, nz, rgb) { var c = ny < -0.2 ? B : A, s = 0.7 + 0.35 * smooth(0.4, 0.8, noise3(x / L * 8, y / L * 8, z / L * 8)); rgb[0] = c.r * s; rgb[1] = c.g * s; rgb[2] = c.b * s; });
      ball(0.47 * L, 0.04 * L, 0, 0.1 * L, 0.07 * L, 0.075 * L, paint(B));
      [-1, 1].forEach(function (side) {
        ball(0.2 * L, 0.0, side * 0.36 * L, 0.12 * L, 0.02 * L, 0.26 * L, paint(B), 0, side * 0.5, 0);
        ball(-0.32 * L, 0.0, side * 0.2 * L, 0.08 * L, 0.018 * L, 0.12 * L, paint(B), 0, -side * 0.6, 0);
      });
    } else if (shape === 'anemone') {
      b.absorb(T, new T.CylinderGeometry(0.22 * L, 0.24 * L, 0.14 * L, seg + 4, 1), M(0, 0.07 * L, 0, 1, 1, 1), paint(B));
      var tent = detail ? 30 : 18;
      for (k = 0; k < tent; k++) {
        var ta = k * 2.39996, tr = 0.21 * L * Math.sqrt((k + 0.5) / tent), tx = Math.cos(ta), tz = Math.sin(ta), tl = 0.12 * L * (0.8 + 0.4 * hash2(k, 3));
        tube([[tx * tr, 0.13 * L, tz * tr], [tx * (tr + tl * 0.3), 0.13 * L + tl * 0.5, tz * (tr + tl * 0.3)], [tx * (tr + tl * 0.6), 0.13 * L + tl * 0.8, tz * (tr + tl * 0.6)], [tx * (tr + tl * 0.9), 0.13 * L + tl, tz * (tr + tl * 0.9)]], 0.012 * L, 0.3, A);
      }
    } else if (shape === 'clam') {
      ball(0, 0.12 * L, 0.06 * L, 0.5 * L, 0.2 * L, 0.24 * L, paint(A), 0.25, 0, 0);
      ball(0, 0.12 * L, -0.06 * L, 0.5 * L, 0.2 * L, 0.24 * L, paint(A), -0.25, 0, 0);
      ball(0, 0.24 * L, 0, 0.46 * L, 0.05 * L, 0.12 * L, function (x, y, z, nx, ny, nz, rgb) { var s = 0.75 + 0.35 * smooth(0.45, 0.7, noise3(x / L * 18, 0, z / L * 18)); rgb[0] = B.r * s; rgb[1] = B.g * s; rgb[2] = B.b * s; });
    } else if (shape === 'star') {
      var arms = look[3] || 5;
      ball(0, 0.03 * L, 0, 0.12 * L, 0.04 * L, 0.12 * L, paint(A));
      for (k = 0; k < arms; k++) { var aa = k / arms * TAU, cx = Math.cos(aa), cz = Math.sin(aa); tube([[cx * 0.04 * L, 0.03 * L, cz * 0.04 * L], [cx * 0.2 * L, 0.035 * L, cz * 0.2 * L], [cx * 0.35 * L, 0.03 * L, cz * 0.35 * L], [cx * 0.5 * L, 0.02 * L, cz * 0.5 * L]], (arms > 6 ? 0.04 : 0.06) * L, 0.75, k % 2 ? B : A); }
    } else if (shape === 'urchin') {
      ball(0, 0.1 * L, 0, 0.14 * L, 0.11 * L, 0.14 * L, paint(B));
      var spines = detail ? 32 : 18;
      for (k = 0; k < spines; k++) {
        var sy = 1 - (k + 0.5) / spines * 0.9, sr = Math.sqrt(1 - sy * sy), sa = k * 2.39996, dir = new T.Vector3(Math.cos(sa) * sr, sy, Math.sin(sa) * sr);
        var cone = new T.ConeGeometry(0.01 * L, 0.5 * L, 4, 1); cone.translate(0, 0.25 * L, 0);
        b.absorb(T, cone, new T.Matrix4().compose(new T.Vector3(0, 0.1 * L, 0), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir), new T.Vector3(1, 1, 1)), paint(A));
      }
    } else if (shape === 'slug' || shape === 'cucumber') {
      var cuc = shape === 'cucumber';
      ball(0, (cuc ? 0.12 : 0.1) * L, 0, 0.5 * L, (cuc ? 0.13 : 0.16) * L, (cuc ? 0.15 : 0.2) * L, function (x, y, z, nx, ny, nz, rgb) { var e = !cuc && Math.abs(nz) > 0.75, c = e ? B : A, s = 0.75 + 0.3 * ny; rgb[0] = c.r * s; rgb[1] = c.g * s; rgb[2] = c.b * s; });
      if (!cuc) { fin([0.34 * L, 0.2 * L, 0.05 * L], [0.38 * L, 0.42 * L, 0.06 * L], [0.3 * L, 0.2 * L, 0.06 * L], B); fin([0.34 * L, 0.2 * L, -0.05 * L], [0.3 * L, 0.2 * L, -0.06 * L], [0.38 * L, 0.42 * L, -0.06 * L], B); }
    } else if (shape === 'worm') {
      [-1, 1].forEach(function (side) { var g = new T.ConeGeometry(0.42 * L, 1.1 * L, detail ? 10 : 6, 4); g.translate(0, 0.55 * L, 0); b.absorb(T, g, M(side * 0.32 * L, 0, 0, 1, 1, 1), function (x, y, z, nx, ny, nz, rgb) { var c = Math.sin(y / L * 30) > 0.6 ? B : A; rgb[0] = c.r; rgb[1] = c.g; rgb[2] = c.b; }); });
    } else if (shape === 'octopus') {
      ball(-0.12 * L, 0.24 * L, 0, 0.24 * L, 0.2 * L, 0.2 * L, paint(A));
      for (k = 0; k < 8; k++) { var oa = k / 8 * TAU + 0.2, ox = Math.cos(oa), oz = Math.sin(oa); tube([[0.02 * L + ox * 0.06 * L, 0.12 * L, oz * 0.06 * L], [ox * 0.22 * L, 0.04 * L, oz * 0.22 * L], [ox * 0.36 * L, 0.03 * L, oz * 0.36 * L + 0.05 * L], [ox * 0.46 * L, 0.06 * L, oz * 0.46 * L]], 0.035 * L, 0.85, k % 2 ? A : B); }
    } else if (shape === 'fan' || shape === 'soft' || shape === 'barrel' || shape === 'brain' || shape === 'staghorn' || shape === 'table' || shape === 'boulder') {
      var src = shape === 'fan' ? buildFan(T, 0.5 * L, L, 3, detail) : shape === 'soft' ? buildSoftCoral(T, 0.45 * L, 0.8 * L, 2, detail) : shape === 'barrel' ? buildBarrel(T, 0.42 * L, 0.85 * L, 2, detail) :
        shape === 'brain' ? buildMassive(T, 0.5 * L, 0.45 * L, 3, detail) : shape === 'staghorn' ? buildBranching(T, 0.5 * L, 0.55 * L, 1, detail ? 5 : 4, detail) :
          shape === 'table' ? buildPlate(T, 0.5 * L, 0.45 * L, 4, detail) : buildMassive(T, 0.5 * L, 0.55 * L, 7, detail);
      var groove = shape === 'brain';
      b.absorb(T, src, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) {
        var g2 = groove && Math.abs(noise3(x / L * 9, y / L * 9, z / L * 9) - 0.5) < 0.05 ? 0.55 : 1, c = groove && noise3(x / L * 3, y / L * 3, 5) > 0.6 ? B : A, s = (0.72 + 0.3 * ny) * g2;
        rgb[0] = c.r * s; rgb[1] = c.g * s; rgb[2] = c.b * s;
      });
    } else if (shape === 'mushroom') {
      var mg = polar(T, 4, detail ? 30 : 16, function (r, a, rgb) { rgb[0] = rgb[1] = rgb[2] = 1; return [Math.cos(a) * r * 0.5 * L, 0.02 * L + 0.18 * L * (1 - r * r), Math.sin(a) * r * 0.5 * L * 0.85]; });
      b.absorb(T, mg, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { var s = Math.sin(Math.atan2(z, x) * 36) > 0.2 ? 1 : 0.7; rgb[0] = A.r * s; rgb[1] = A.g * s; rgb[2] = A.b * s; });
    } else if (shape === 'reefstar') {
      var frame = new T.Color(0.2, 0.15, 0.1).lerp(lin(0xc89a8a), 0.6 * growth);
      for (k = 0; k < 6; k++) {
        var ra = k / 6 * TAU, rx = Math.cos(ra), rz = Math.sin(ra);
        tube([[0, 0.2 * L, 0], [rx * 0.17 * L, 0.21 * L, rz * 0.17 * L], [rx * 0.34 * L, 0.2 * L, rz * 0.34 * L], [rx * 0.5 * L, 0.18 * L, rz * 0.5 * L]], 0.016 * L, 0, frame);
        if (k % 2 === 0) tube([[rx * 0.4 * L, 0.19 * L, rz * 0.4 * L], [rx * 0.45 * L, 0.12 * L, rz * 0.45 * L], [rx * 0.5 * L, 0.06 * L, rz * 0.5 * L], [rx * 0.55 * L, 0, rz * 0.55 * L]], 0.014 * L, 0, frame);
      }
      // Young fragments at year 0 grow into clumps that cover the frame by year 4.
      var fs = (0.07 + 0.2 * growth) * L;
      clump(0, 0.2 * L, 0, fs, 0);
      for (k = 0; k < 6; k++) { var fa = k / 6 * TAU + 0.5; clump(Math.cos(fa) * 0.33 * L, 0.2 * L, Math.sin(fa) * 0.33 * L, fs * (0.85 + 0.3 * hash2(k, 5)), k + 1); }
    } else if (shape === 'reefball') {
      var holes = []; for (k = 0; k < 10; k++) { var hy = 0.15 + 0.6 * hash2(k, 1), hr2 = Math.sqrt(1 - hy * hy), ha = k * 2.39996; holes.push(new T.Vector3(Math.cos(ha) * hr2, hy, Math.sin(ha) * hr2)); }
      var conc = A.clone().lerp(lin(0xb06a8a), 0.5 * growth), tmp = new T.Vector3();
      b.absorb(T, new T.SphereGeometry(1, seg + 6, seg, 0, TAU, 0, Math.PI / 2), M(0, 0, 0, 0.5 * L, 0.6 * L, 0.5 * L), function (x, y, z, nx, ny, nz, rgb) {
        tmp.set(x / (0.5 * L), y / (0.6 * L), z / (0.5 * L)).normalize(); var hole = false; holes.forEach(function (hd) { if (tmp.dot(hd) > 0.965) hole = true; });
        var c = hole ? new T.Color(0.05, 0.05, 0.06) : conc, s = hole ? 1 : 0.75 + 0.25 * ny; rgb[0] = c.r * s; rgb[1] = c.g * s; rgb[2] = c.b * s;
      });
      var bs = (0.07 + 0.2 * growth) * L;
      for (k = 0; k < 6; k++) { var ba = k / 6 * TAU, br = k ? 0.3 : 0, by = 0.6 * L * Math.sqrt(Math.max(0, 1 - br * br * 4)) * 0.97; clump(Math.cos(ba) * br * L, by - 0.02 * L, Math.sin(ba) * br * L, bs, k + 2); }
    } else if (shape === 'nursery') {
      var pole = A;
      b.absorb(T, new T.BoxGeometry(0.12 * L, 0.04 * L, 0.12 * L), M(0, 0.02 * L, 0, 1, 1, 1), paint(new T.Color(0.4, 0.4, 0.38)));
      tube([[0, 0, 0], [0, 0.33 * L, 0], [0, 0.66 * L, 0], [0, 0.94 * L, 0]], 0.012 * L, 0, pole);
      ball(0, 0.97 * L, 0, 0.05 * L, 0.05 * L, 0.05 * L, paint(B));
      for (k = 0; k < 4; k++) {
        var bh = (0.32 + 0.17 * k) * L, bar = k * Math.PI / 4, bx = Math.cos(bar) * 0.26 * L, bz = Math.sin(bar) * 0.26 * L;
        tube([[-bx, bh, -bz], [-bx / 3, bh, -bz / 3], [bx / 3, bh, bz / 3], [bx, bh, bz]], 0.008 * L, 0, pole);
        for (var q = 0; q < 4; q++) { var u = -0.75 + q * 0.5; clump(bx * u, bh - (0.05 + 0.1 * growth) * L, bz * u, (0.035 + 0.075 * growth) * L, k * 4 + q); }
      }
    } else {
      ball(0, 0.1 * L, 0, 0.3 * L, 0.2 * L, 0.3 * L, paint(A));
    }
    return b.build(T, false);
  }

  // ---- Parallel shader warm-up ------------------------------------------------------
  // r128 links each new program and at once reads back its uniforms, which waits
  // for the driver, so a cold first render links every program in turn with the
  // page frozen (about 11 s for this reef on a laptop GPU). With
  // KHR_parallel_shader_compile that read is held back instead: renderer.compile
  // creates the programs, the driver links them on its own threads, and poll()
  // says when all are done; the first real render then finds them linked. Without
  // the extension submit() compiles one object at a time, so no single task is long.
  // Link failures are read back afterwards (three's own check is the blocking read).
  var HOLD = { reefShaderHold: true };
  // Staged loading: a task's time budget (ms) and a step's "call me again" answers.
  var LOAD_SLICE = 24, MORE = 1, WAIT = 2;
  function shaderWarmup(renderer, scene, camera, clock) {
    var gl = renderer && typeof renderer.getContext === 'function' ? renderer.getContext() : null;
    var list = renderer && renderer.info && renderer.info.programs;
    if (!gl || typeof renderer.compile !== 'function' || !Array.isArray(list)) return null;
    var khr = null;
    try { khr = gl.getExtension('KHR_parallel_shader_compile'); } catch (ignore) {}
    var created = [], seen = new Set(), queue = [], holding = false, polled = 0, prepared = 0, has = Object.prototype.hasOwnProperty;
    function capture(program) {
      created.push(program);
      if (!khr || typeof program.getUniforms !== 'function') return;
      var read = program.getUniforms;
      // Thrown from inside compile() after the program is stored on its
      // material, so the first real render finishes that material's setup.
      program.getUniforms = function () { if (holding) throw HOLD; program.getUniforms = read; return read.call(program); };
    }
    function compile(objects) {
      var debug = renderer.debug, check = debug ? debug.checkShaderErrors : undefined, ownTraverse = has.call(scene, 'traverse'), traverse = scene.traverse;
      list.push = function (program) { capture(program); return Array.prototype.push.apply(this, arguments); };
      if (debug) debug.checkShaderErrors = false;
      scene.traverse = function (visit) {
        objects.forEach(function (o) {
          // One visit per material, so a held program does not skip the rest of a material array.
          var parts = Array.isArray(o.material) ? o.material.map(function (m) { return Object.create(o, { material: { value: m } }); }) : [o];
          parts.forEach(function (part) { try { visit(part); } catch (error) { if (error !== HOLD) throw error; } });
        });
      };
      holding = !!khr;
      try { renderer.compile(scene, camera); } finally {
        holding = false; delete list.push;
        if (ownTraverse) scene.traverse = traverse; else delete scene.traverse;
        if (debug) debug.checkShaderErrors = check;
      }
    }
    function shaderLog(shader) {
      if (!shader || gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return '';
      return String(gl.getShaderInfoLog(shader) || '').replace(/\u0000/g, '').trim();
    }
    return {
      parallel: !!khr,
      // Queue every drawable object added since the last call.
      collect: function () {
        scene.traverse(function (o) { if (o.material && !seen.has(o)) { seen.add(o); queue.push(o); } });
      },
      // Creates programs for queued objects for up to budget ms; true once the queue is empty.
      submit: function (budget) {
        var t0 = clock();
        while (queue.length) {
          compile(queue.splice(0, khr ? 4 : 1));
          if (clock() - t0 >= budget) break;
        }
        return !queue.length;
      },
      // True when every program created so far has finished linking.
      poll: function (budget) {
        if (!khr) return true;
        var t0 = clock();
        while (polled < created.length) {
          var p = created[polled];
          if (p.program && !gl.getProgramParameter(p.program, khr.COMPLETION_STATUS_KHR)) return false;
          polled++;
          if (clock() - t0 >= budget) break;
        }
        return polled >= created.length;
      },
      progress: function () { return created.length ? polled / created.length : 1; },
      // Reads each linked program's uniform and attribute tables (hundreds of small
      // driver round trips) before the first frame, a few programs per call.
      prepare: function (budget) {
        var t0 = clock();
        while (prepared < created.length) {
          var p = created[prepared++];
          if (p.program) { p.getUniforms(); if (typeof p.getAttributes === 'function') p.getAttributes(); }
          if (clock() - t0 >= budget) break;
        }
        return prepared >= created.length;
      },
      // Programs that did not link, with the driver's messages (the compiler's first).
      failures: function () {
        if (typeof gl.isContextLost === 'function' && gl.isContextLost()) return [];
        return created.filter(function (p) { return p.program && !gl.getProgramParameter(p.program, gl.LINK_STATUS); }).map(function (p) {
          var log = [shaderLog(p.fragmentShader), shaderLog(p.vertexShader), String(gl.getProgramInfoLog(p.program) || '').replace(/\u0000/g, '').trim()].filter(Boolean).join('\n');
          return { name: p.name || 'shader', log: log };
        });
      }
    };
  }
  // A staged load draws nothing for a few seconds: show the water colour (the
  // canvas's CSS background) rather than an empty black canvas meanwhile.
  function clearToWater(T, renderer) {
    if (typeof renderer.setClearColor !== 'function' || typeof renderer.clear !== 'function' || typeof renderer.getClearColor !== 'function') return;
    var keep = renderer.getClearColor(new T.Color()), alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x0b3a4d, 1); renderer.clear(); renderer.setClearColor(keep, alpha);
  }
  // Every 2D texture on the scene's materials (and their custom uniforms), to upload before the first frame.
  function sceneTextures(scene, extra) {
    var found = new Set();
    function add(t) { if (t && t.isTexture && !t.isCubeTexture && !t.isDataTexture3D && !t.isDataTexture2DArray && !t.isVideoTexture && !t.isRenderTargetTexture) found.add(t); }
    scene.traverse(function (o) {
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function (m) {
        Object.keys(m).forEach(function (k) { add(m[k]); });
        if (m.uniforms) Object.keys(m.uniforms).forEach(function (k) { add(m.uniforms[k] && m.uniforms[k].value); });
      });
    });
    (extra || []).forEach(add);
    return Array.from(found);
  }

  // ---- Mount ----------------------------------------------------------------------
  function mount(canvas, options) {
    options = options || {};
    var THREE = options.THREE;
    if (!canvas || typeof canvas.addEventListener !== 'function') throw new Error('Reef3DExplore.mount needs a canvas element.');
    if (!THREE || typeof THREE.WebGLRenderer !== 'function') throw new Error('Reef3DExplore.mount needs options.THREE (three.js r128).');
    if (canvas._reef3dExplore && typeof canvas._reef3dExplore.dispose === 'function') canvas._reef3dExplore.dispose();
    var T = THREE, doc = canvas.ownerDocument || global.document || null;
    var Species = global.Reef3DSpecies && typeof global.Reef3DSpecies.create === 'function' ? global.Reef3DSpecies : null;
    var quality = selectQuality(options.quality), high = quality === 'high', reducedMotion = !!options.reducedMotion;
    var site = normalizeSite(options.site), health = site.health, seed = site.seed, restoration = site.restoration;
    var growth = restoration ? clamp(restoration.yearsSince / 4, 0, 1) : 0;
    var vitality = clamp(0.55 * health.coralCover + 0.25 * (1 - health.bleaching) + 0.2 * (1 - health.algae), 0, 1);
    var view = options.view === 'first' ? 'first' : 'third', vision = visionMode(options.vision), magnification = 1;
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(60, 1, 0.05, 70), renderer = null;
    var disposed = false, contextLost = false, raf = 0, rafIsTimer = false, lastStamp = null, worldTime = 0, visualTime = 0, frames = 0, paused = false;
    var listeners = [], resizeObserver = null, notifyTimer = 0, lastNotify = -Infinity, lastCheck = -Infinity, lastKey = '', pendingNotify = false;
    var owned = [], canvasW = 0, canvasH = 0, derivatives = false, cullDist = high ? 34 : 24;
    var terrain = null, bommies = [], station = null, crevice = null, obstacle = new Float32Array(GRID_N * GRID_N), blocked = new Uint8Array(GRID_N * GRID_N);
    var organisms = [], byUid = {}, owner = new Map(), protos = [], groups = [], anemones = [], sessiles = [], decorMeshes = [], decorKinds = [];
    // Decor level of detail: full models near the diver, stand-ins further out, nothing in the fog beyond.
    var nearDist = high ? 17 : 13, farDist = high ? 34 : 25, smallFar = high ? 19 : 14;
    // Budget governor: the measured frame (renderer.info) scales the decor and organism draw
    // distances, then thins the planktivore crowd, then refreshes the shadows less often;
    // the frame's script time slices more work and thins the crowd too (perfGovern).
    var gov = { scale: 1, frames: 0, level: 0, cpu: 0, cpuMs: 0, frameMs: 0, seen: 0, up: 0, down: 0, slice: 1, crowd: 1, shadowEvery: 1, t0: null }, TRI_BUDGET = high ? 860000 : 330000, CALL_BUDGET = high ? 400 : 170;
    var floorMesh = null, bommieMesh = null, orgRoot = null, diver = null, bubbles = null, focusRing = null, mask = null, backdrop = null, surface = null, motes = null, sun = null, hemi = null;
    var shafts = [], U = null, snowU = null, plantMotions = [], fogNear = new T.Color(), fogFar = new T.Color(), topNear = new T.Color(), topFar = new T.Color(), lastWaterDepth = -1;
    var diverPos = new T.Vector3(), bearing = 0, speed = 0, vy = 0, turnRate = 0, bodyPitch = 0, bodyRoll = 0, kick = 0, swimEffort = 0, autopilot = null;
    var keys = { forward: 0, back: 0, left: 0, right: 0, up: 0, down: 0 }, ext = { forward: 0, turn: 0, rise: 0 };
    var look = { yaw: 0, pitch: 0 }, camDist = 4.2, camPos = new T.Vector3(), camTarget = new T.Vector3(), dragging = false, observationAim = null;
    var eyeMotion = { pitch: 0, yaw: 0, roll: 0, heave: 0, sway: 0, surge: 0 };
    var focusedUid = null, cycle = { list: [], at: -Infinity }, pointers = new Map(), pinch = 0, press = null;
    var frustum = new T.Frustum(), projScreen = new T.Matrix4(), sphere = new T.Sphere(), raycaster = new T.Raycaster(), tmpA = { x: 0, y: 0, z: 0 }, tmpB = { x: 0, y: 0, z: 0 }, aheadPoint = { x: 0, y: 0, z: 0 };
    var mats = {}, phMaterial = null, phGeometry = {}, legs = [], diverBody = null, HEAD = new T.Vector3(0.74, 0.09, 0), REG = new T.Vector3(0.66, -0.05, 0.16);
    var bubbleState = [], bubbleClock = 0, bubbleBudget = 0, bubbleSide = 1, rbub = stream(seed, 901), BUBBLES = 64, apSpot = {}, settle = 0;
    var desired = new T.Vector3(), lookAt = new T.Vector3(), headW = new T.Vector3(), ndc = new T.Vector2(), closest = new T.Vector3(), controller = null;
    // Staged loading (options.staged): the build runs as a queue of short steps; see "Loading" below.
    var staged = options.staged === true, loaded = false, loadQueue = [], loadAt = 0, loadInsert = 0, loadTimer = 0, loadRaf = 0, loadShown = -1, warm = null, uploads = null;
    function own(resource) { owned.push(resource); return resource; }
    function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }
    function lin3(hex) { var c = lin(hex); return [c.r, c.g, c.b]; }
    function listen(target, type, fn, opts) {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(type, fn, opts); listeners.push(function () { target.removeEventListener(type, fn, opts); });
    }
    function now() { var p = global.performance; return p && typeof p.now === 'function' ? p.now() : Date.now(); }
    function setTimer(fn, ms) { return (global.setTimeout || setTimeout)(fn, ms); }
    function clearTimer(id) { if (id) (global.clearTimeout || clearTimeout)(id); }
    function reportError(error) {
      if (typeof options.onError === 'function') { try { options.onError(error instanceof Error ? error : new Error(String(error))); } catch (ignore) {} }
      else if (global.console && global.console.error) global.console.error(error);
    }
    function warn(message) { warnings.push(message); if (global.console && global.console.warn) global.console.warn(message); }

    function dispose() {
      if (disposed) return; disposed = true;
      stopLoop(); cancelLoad(); clearTimer(notifyTimer); notifyTimer = 0;
      listeners.forEach(function (off) { off(); }); listeners.length = 0;
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      pointers.clear(); autopilot = null;
      observationAim = null;
      encounterKit = null;
      organisms.forEach(function (o) { if (o.model && !o.instanced) { try { o.model.dispose(); } catch (ignore) {} } });
      protos.forEach(function (p) { try { p.dispose(); } catch (ignore) {} });
      if (sun && sun.shadow && typeof sun.shadow.dispose === 'function') sun.shadow.dispose();
      var geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(function (o) {
        if (o.isInstancedMesh && typeof o.dispose === 'function') o.dispose();
        if (o.geometry) geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function (m) { materials.add(m); });
      });
      owned.forEach(function (r) { if (r.isBufferGeometry) geometries.add(r); else if (r.isMaterial) materials.add(r); else if (r.isTexture) textures.add(r); });
      materials.forEach(function (m) { Object.keys(m).forEach(function (k) { if (m[k] && m[k].isTexture) textures.add(m[k]); }); });
      geometries.forEach(function (g) { g.dispose(); }); materials.forEach(function (m) { m.dispose(); }); textures.forEach(function (t) { t.dispose(); });
      owned.length = 0; organisms.length = 0; protos.length = 0; groups.length = 0; decorMeshes.length = 0; owner.clear();
      if (renderer) {
        renderer.dispose();
        if (!contextLost && typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
        renderer = null;
      }
      scene.clear();
      if (canvas._reef3dExplore === controller) delete canvas._reef3dExplore;
    }

    // ---- Obstacle grid: tops of bommies, tall corals and sessile organisms ------
    for (var gi = 0; gi < obstacle.length; gi++) obstacle[gi] = NONE;
    function cellOf(v) { return clamp(Math.round((v - GRID_MIN) / GRID_STEP), 0, GRID_N - 1); }
    function stampTop(x, z, radius, top) {
      var i0 = cellOf(x - radius), i1 = cellOf(x + radius), j0 = cellOf(z - radius), j1 = cellOf(z + radius);
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
        var px = GRID_MIN + i * GRID_STEP, pz = GRID_MIN + j * GRID_STEP;
        if (Math.hypot(px - x, pz - z) <= radius + GRID_STEP * 0.5) { var k = j * GRID_N + i; if (top > obstacle[k]) obstacle[k] = top; }
      }
    }
    function block(x, z, radius) {
      var i0 = cellOf(x - radius), i1 = cellOf(x + radius), j0 = cellOf(z - radius), j1 = cellOf(z + radius);
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) if (Math.hypot(GRID_MIN + i * GRID_STEP - x, GRID_MIN + j * GRID_STEP - z) <= radius) blocked[j * GRID_N + i] = 1;
    }
    function isBlocked(x, z) { return blocked[cellOf(z) * GRID_N + cellOf(x)] === 1; }
    function obstacleTop(x, z) {
      var fx = clamp((x - GRID_MIN) / GRID_STEP, 0, GRID_N - 1), fz = clamp((z - GRID_MIN) / GRID_STEP, 0, GRID_N - 1);
      var i = Math.min(GRID_N - 2, Math.floor(fx)), j = Math.min(GRID_N - 2, Math.floor(fz)), k = j * GRID_N + i;
      return Math.max(obstacle[k], obstacle[k + 1], obstacle[k + GRID_N], obstacle[k + GRID_N + 1]);
    }
    function groundTop(x, z) { return Math.max(terrain.floorY(x, z), obstacleTop(x, z)); }

    // The same slow surge drives swimmers, soft colonies and suspended particles.
    // Small differences across the reef give a travelling current, not a global wobble.
    function currentAt(x, z, t, out) {
      var phase = t * 0.35 - x * 0.075 - z * 0.055;
      out.x = 0.035 + 0.018 * Math.sin(phase);
      out.z = 0.022 + 0.012 * Math.sin(phase + 0.4);
      out.strength = Math.min(1, Math.hypot(out.x, out.z) / 0.065);
      return out;
    }
    var ambientMotion = { speed: 0, turn: 0, current: { x: 0, z: 0, strength: 0 } };

    var waterDepth = function (depth) { return clamp((depth - 3) / 15, 0, 1); };
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: high, alpha: false, powerPreference: high ? 'high-performance' : 'low-power' });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, high ? 1.75 : 1));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
      if (renderer.shadowMap) { renderer.shadowMap.enabled = high; renderer.shadowMap.type = T.PCFSoftShadowMap; }
      var caps = renderer.capabilities || {}, ext2 = renderer.extensions;
      derivatives = !!(caps.isWebGL2 || (ext2 && typeof ext2.has === 'function' && ext2.has('OES_standard_derivatives')));
      if (staged) clearToWater(T, renderer);
      build();
      if (staged) { warm = shaderWarmup(renderer, scene, camera, now); queueFirstFrame(); } else runQueue();
    } catch (error) {
      dispose();
      throw new Error('This device could not start the 3D reef dive. ' + (error && error.message ? error.message : 'Please use the 2D survey.'));
    }

    // The build is a queue of steps in this order; a step may queue its own parts,
    // which run straight after it. A plain mount runs them all at once.
    function build() {
      var unitArea = restoration ? { reef_star: 1.5, reef_ball: 4.8, coral_tree_nursery: 9.5 }[restoration.kind] : 0;
      var patchRadius = restoration ? clamp(Math.sqrt(restoration.units * unitArea / Math.PI) + 1.4, 4, 9.5) : 4.5;
      loadStep(2, function () {
        terrain = createTerrain(seed, site.depthM, patchRadius);
        bommies = placeBommies(seed, terrain);
        bommies.forEach(function (b) {
          var reach = b.r * 1.35;
          var i0 = cellOf(b.x - reach), i1 = cellOf(b.x + reach), j0 = cellOf(b.z - reach), j1 = cellOf(b.z + reach);
          for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) { var hgt = b.heightAt(GRID_MIN + i * GRID_STEP, GRID_MIN + j * GRID_STEP), k = j * GRID_N + i; if (hgt > obstacle[k]) obstacle[k] = hgt; }
        });
        var big = bommies.filter(function (b) { return b.r >= 1.4; });
        station = big.slice().sort(function (a, b) { return Math.hypot(a.x - 4, a.z - 4) - Math.hypot(b.x - 4, b.z - 4); })[0];
        crevice = big.filter(function (b) { return b !== station; }).sort(function (a, b) { return b.r * b.h - a.r * a.h; })[0] || station;
        (function crevicePoint() {
          var a = bearingTo(-crevice.x, -crevice.z), dx = fwdX(a), dz = fwdZ(a), lx = dx * crevice.c + dz * crevice.s, lz = -dx * crevice.s + dz * crevice.c, la = Math.atan2(lz, lx);
          var e = crevice.edge(la) * 0.9, px = crevice.x + dx * e, pz = crevice.z + dz * e, py = Math.max(crevice.heightAt(px, pz) - crevice.h * 0.15, terrain.floorY(px, pz) + 0.25);
          crevice.mouth = { x: px, y: py, z: pz, nx: dx, nz: dz };
        })();
      });
      loadStep(4, function () {
        var causticTex = own(createCausticTexture(T, high ? 256 : 128));
        U = { map: { value: causticTex }, time: { value: 4 }, strength: { value: 0.62 }, eye: { value: new T.Vector3() }, extinction: { value: new T.Vector3(0.065, 0.042, 0.030) }, scatter: { value: new T.Color() }, sunFalloff: { value: 0.024 }, vision: { value: new T.Vector2(vision === 'vivid' ? 1 : 0, vision === 'fluorescence' ? 1 : 0) } };
        buildMaterials();
      });
      loadStep(4, buildFloor); loadStep(3, buildBommieMesh);
      loadStep(1, function () { orgRoot = new T.Group(); orgRoot.name = 'reef-explore-organisms'; scene.add(orgRoot); });
      loadStep(60, buildOrganisms); loadStep(1, immerseOrganisms);
      loadStep(10, buildDecor);
      loadStep(2, buildWater);
      loadStep(3, function () {
        buildDiver(); buildBubbles(); buildFocusRing(); buildMask();
        spawnDiver();
        organisms.forEach(function (o) { if (o.path) { if (o.school) planSchoolRoute(o); poseMobile(o, 0, true); } });
      });
    }

    // ---- Materials (shaders adapted from Reef3DHabitat) ---------------------
    function key(name) { return 'reef3dx-' + name + '-v1|' + (derivatives ? 'd' : 'n') + (high ? 'h' : 'l'); }
    function commonFragment(parts, local) {
      parts.waterColumn = true;
      parts.fCommon.push('uniform vec2 reefVision;uniform float reefFluorescent;uniform float reefFluorSeed;');
      parts.fCommon.push('uniform vec3 reefWaterExtinction;uniform vec3 reefWaterScatter;uniform vec3 reefWaterEye;uniform float reefWaterSunFalloff;', WATER_COLUMN_SOURCE, WATER_SCATTER_PHASE);
      if (derivatives) parts.fCommon.push('#define REEF_DERIVATIVES');
      if (high) parts.fCommon.push('#define REEF_CAUSTIC_LAYERS');
      parts.fCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''), GLSL_NOISE, CAUSTIC_COMMON);
      // The light tier's torch is diffuse only, with no highlight.
      parts.fCommon.push(TORCH_COMMON + (high ? '\n#define REEF_TORCH_SPECULAR' : ''));
      parts.vCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''));
      parts.vProject.push(WORLD_VERTEX + (local ? '\nvReefLocal=position;' : ''));
      parts.fLighting = [CAUSTIC_APPLY.replace('reefCausticStrength*', 'reefCausticStrength*getShadowMask()*'), TORCH_LIGHT];
    }
    function bindCaustics(shader) { shader.uniforms.reefCausticMap = U.map; shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefCausticStrength = U.strength; shader.uniforms.reefWaterExtinction = U.extinction; shader.uniforms.reefWaterScatter = U.scatter; shader.uniforms.reefWaterEye = U.eye; shader.uniforms.reefWaterSunFalloff = U.sunFalloff; shader.uniforms.reefVision = U.vision; shader.uniforms.reefFluorescent = { value: 0 }; shader.uniforms.reefFluorSeed = { value: 0.37 }; bindTorch(shader); }
    function bindTorch(shader) { shader.uniforms.reefTorchPos = U.torchPos; shader.uniforms.reefTorchDir = U.torchDir; shader.uniforms.reefTorch = U.torch; }
    function immerseOrganisms() {
      // The species guide also uses these models in neutral studio light.
      // Apply the dive's water treatment here, preserving each species' own
      // scale, mantle and swimming shaders and its original resource owner.
      var seen = new Set();
      orgRoot.traverse(function (object) {
        if (!object.isMesh) return;
        object.receiveShadow = true;
        var materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(function (material) {
          if (!material || seen.has(material) || !(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) return;
          seen.add(material);
          var habitatRoot = object;
          while (habitatRoot && !habitatRoot.userData.exploreUid) habitatRoot = habitatRoot.parent;
          // Fixed colonies are batched by species and health; their first UID
          // identifies the shared material without adding a per-instance channel.
          var organism = object.userData.exploreUids ? byUid[object.userData.exploreUids[0]] : habitatRoot && byUid[habitatRoot.userData.exploreUid];
          var fluorescent = material !== phMaterial && organism && organism.info.group === 'coral' && coralState(organism) !== 'dead' ? 1 : 0;
          var original = material.onBeforeCompile, originalKey = material.customProgramCacheKey();
          material.onBeforeCompile = function (shader, renderer) {
            if (original) original.call(this, shader, renderer);
            var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader);
            shader.uniforms.reefFluorescent.value = fluorescent;
            shader.uniforms.reefFluorSeed.value = organism ? hash2(organism.seedInt, 31) : 0.37;
            parts.fColor.push(ABSORB);
            applyParts(shader, parts, 'organism-water');
          };
          material.customProgramCacheKey = function () { return originalKey + '|' + key('organism-water'); };
          material.needsUpdate = true;
        });
      });
    }
    function patch(material, name, buildShader) {
      if (derivatives) material.extensions = { derivatives: true };
      material.onBeforeCompile = function (shader) { buildShader(shader); };
      material.customProgramCacheKey = function () { return key(name) + (name === 'coral' ? '|tissue-v1' : ''); };
      return own(material);
    }
    function floorShader(shader) {
      var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader);
      parts.vCommon.push('attribute vec2 reefGround;varying vec2 vReefGround;'); parts.vBegin.push('vReefGround=reefGround;');
      shader.uniforms.reefVitality = { value: vitality * vitality };
      shader.uniforms.reefSubstrateMap = U.substrate;
      parts.fCommon.push('varying vec2 vReefGround;uniform float reefVitality;uniform sampler2D reefSubstrateMap;');
      parts.fColor.push([
        'float reefX=vReefWorld.x,reefZ=vReefWorld.z;',
        // Current-aligned, gently turning ripples have broad lee faces and
        // rounded crests. Their amplitude fades between patches of sand.
        'vec2 reefSandFlow=vec2(reefX*0.963-reefZ*0.269,reefX*0.269+reefZ*0.963);',
        'float reefBend=reefSandFlow.x*0.22+reefSandFlow.y*0.17;',
        'float reefRipple=reefSandFlow.y*16.6+sin(reefSandFlow.x*0.54)*2.2+sin(reefBend*1.8)*0.85+0.35*sin(reefSandFlow.x*1.65+reefSandFlow.y*0.62);',
        'float reefRippleAA=0.3,reefGrainAA=0.3;',
        '#ifdef REEF_DERIVATIVES',
        'reefRippleAA=1.0-smoothstep(0.35,1.6,fwidth(reefRipple));',
        'reefGrainAA=1.0-smoothstep(0.3,1.2,max(fwidth(reefX),fwidth(reefZ))*64.0);',
        '#endif',
        'float reefSandW=vReefGround.x,reefRubW=vReefGround.y;',
        'vec4 reefSandDetail=texture2D(reefSubstrateMap,reefSandFlow*1.3);',
        'vec4 reefPavementDetail=texture2D(reefSubstrateMap,vReefWorld.xz*0.63+vec2(0.23,0.41));',
        'float reefGrain=reefSandDetail.g-0.5;',
        'float reefMottle=reefNoise(vec3(vReefWorld.xz*0.8,4.2));',
        'float reefRippleField=0.24+0.76*smoothstep(0.28,0.72,reefNoise(vec3(vReefWorld.xz*0.6,8.1)));',
        'float reefWave=(sin(reefRipple)+0.23*sin(reefRipple*2.0+0.62))*reefRippleAA*reefSandW*reefRippleField;',
        'float reefFine=reefPavementDetail.r;',
        'float reefStoneW=(1.0-reefSandW)*(1.0-reefRubW*0.65);',
        'float reefPavement=reefPavementDetail.r;',
        'float reefCrevice=1.0-smoothstep(0.30,0.44,reefFine);',
        'float reefShell=reefSandDetail.a;',
        // Pale shell fragments and sparse darker mineral grains share the
        // same mipmapped map. Warm tones stay local to exposed sand.
        'float reefMineralFleck=(1.0-smoothstep(0.18,0.34,reefSandDetail.g))*reefGrainAA*reefSandW;',
        'diffuseColor.rgb*=1.0+0.038*reefWave+0.17*reefGrain*reefGrainAA*reefSandW+0.045*(reefMottle-0.5)*reefSandW+(0.10*(reefMottle-0.5)+0.32*(reefPavement-0.5)-0.065*reefCrevice)*reefStoneW;',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.91,0.87,0.80),reefMineralFleck*0.42);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,1.16,1.055),reefShell*reefSandW*0.78);',
        'float reefChip=reefPavementDetail.a;',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.26,1.22,1.11),reefChip*reefRubW*0.65);',
        // Coralline grows as small muted crusts, with limestone showing through.
        'float reefSpot=reefPavementDetail.b*reefVitality*reefStoneW*(0.35+0.65*reefMottle);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,0.77,0.87),reefSpot*0.56);',
        ABSORB
      ].join('\n'));
      parts.fRough.push('roughnessFactor=clamp(roughnessFactor-0.055*reefSandW-0.035*reefShell*reefSandW+0.04*reefCrevice*reefStoneW,0.78,1.0);');
      // Millimetre grain is seen close up; broader sand undulations stay soft
      // as the texture mipmaps and ripple derivatives fade with distance.
      parts.fNormal.push(surfaceRelief('0.011*reefWave+0.010*reefPavement*reefStoneW+0.002*reefChip*reefRubW+0.0010*reefGrain*reefGrainAA*reefSandW', '0.25'));
      applyParts(shader, parts, 'floor');
    }
    function rockShader(shader) {
      var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
      // Coralline crust is a pink accent on living rock, not its whole skin: the
      // coral patches painted into the vertex colours carry the reef's colour.
      shader.uniforms.reefRockLife = { value: new T.Vector2(vitality * 0.45, health.algae) };
      shader.uniforms.reefSubstrateMap = U.substrate;
      parts.vCommon.push('varying vec3 vReefStoneNormal;');
      parts.vProject.push('vReefStoneNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
      parts.fCommon.push('uniform vec2 reefRockLife;uniform sampler2D reefSubstrateMap;varying vec3 vReefStoneNormal;');
      parts.fColor.push([
        // Triplanar projection keeps the same pore scale on a steep bommie and
        // a flat fragment. The packed map has soft, irregular mineral edges;
        // it avoids the large round spots of thresholded low-frequency noise.
        'vec3 reefStoneQ=vReefWorld,reefStoneBlend=pow(abs(normalize(vReefStoneNormal)),vec3(4.0));',
        'reefStoneBlend/=max(dot(reefStoneBlend,vec3(1.0)),0.001);',
        'vec4 reefStoneDetail=texture2D(reefSubstrateMap,reefStoneQ.yz*0.63+vec2(0.17,0.31))*reefStoneBlend.x+texture2D(reefSubstrateMap,reefStoneQ.xz*0.63+vec2(0.23,0.41))*reefStoneBlend.y+texture2D(reefSubstrateMap,reefStoneQ.xy*0.63+vec2(0.43,0.13))*reefStoneBlend.z;',
        'float reefMineral=reefNoise(reefStoneQ*0.57+vec3(2.6,8.1,4.3)),reefCoarse=reefStoneDetail.r;',
        'float reefGrain=reefStoneDetail.g,reefPits=1.0-smoothstep(0.29,0.44,reefCoarse);',
        'float reefCrust=reefStoneDetail.b*(0.45+0.55*reefMineral)*(0.22+0.78*reefRockLife.x)*(1.0-reefRockLife.y*0.75);',
        'float reefCrustRim=reefStoneDetail.b*(1.0-reefStoneDetail.b)*2.2;',
        'float reefTurf=smoothstep(0.48,0.72,reefMineral)*(0.07+0.68*reefRockLife.y)*(0.65+0.35*reefStoneDetail.b);',
        'diffuseColor.rgb*=(0.96+0.12*(reefMineral-0.5)+0.53*(reefCoarse-0.5)+0.055*(reefGrain-0.5))*(1.0-0.11*reefPits);',
        'vec3 reefCrustTint=mix(vec3(1.28,0.67,0.81),vec3(0.89,0.68,1.07),smoothstep(0.28,0.73,reefMineral));',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*reefCrustTint,reefCrust*0.74);',
        'diffuseColor.rgb*=1.0+0.045*reefCrustRim*reefRockLife.x+0.17*reefStoneDetail.a;',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.67,0.76,0.43),reefTurf);',
        ABSORB
      ].join('\n'));
      parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.05*reefPits-0.045*reefCrust,0.8,1.0);');
      parts.fNormal.push(surfaceRelief('reefCoarse*0.020-reefPits*0.0015+reefCrust*0.0009+(reefGrain-0.5)*0.0008', '0.30'));
      applyParts(shader, parts, 'rock');
    }
    function coralShader(look) {
      return function (shader) {
        var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
        shader.uniforms.reefCoralA = look.a; shader.uniforms.reefCoralB = look.b;
        shader.uniforms.reefFluorescent.value = look.a.value.y;
        parts.vCommon.push('attribute float reefSkeleton;varying vec2 vReefSkeleton;varying vec4 vReefCoralNormal;');
        // Pale bleached instance colours and recently dead skeletons retain
        // their diagnostic appearance. Pack the pigment gate into the existing
        // varying slot; no extra varying register or instance buffer is needed.
        parts.vBegin.push(['vReefSkeleton=vec2(reefSkeleton,1.0);','#ifdef USE_INSTANCING_COLOR','vReefSkeleton.y=1.0-smoothstep(0.72,0.84,min(min(instanceColor.r,instanceColor.g),instanceColor.b));','#endif'].join('\n'));
        parts.fCommon.push('#define REEF_DECOR_CORAL\n varying vec2 vReefSkeleton;');
        parts.vBegin.push('vReefCoralNormal=vec4(normal,0.0);');
        // A colony keeps its own pigment and cup pattern across near/middle/far
        // LODs. The seed shares the normal varying so mobile varying limits stay
        // unchanged; its origin is constant within an instance.
        parts.vProject.push(['mat4 reefColonyFrame=modelMatrix;', '#ifdef USE_INSTANCING', 'reefColonyFrame=modelMatrix*instanceMatrix;', '#endif', 'vReefCoralNormal.w=fract(sin(dot(reefColonyFrame[3].xyz,vec3(12.9898,78.233,39.425)))*43758.5453);'].join('\n'));
        parts.fCommon.push('uniform vec4 reefCoralA;uniform vec4 reefCoralB;varying vec4 vReefCoralNormal;');
        // A staggered, slightly irregular surface lattice gives actual circular
        // cups instead of slicing spheres through a square 3D voxel grid.
        parts.fCommon.push([
          'vec3 reefPolypField(vec2 p,float detail,float aa){',
          'p+=vec2(sin(p.y*0.73+sin(p.x*0.39)),cos(p.x*0.67+sin(p.y*0.43)))*0.13;',
          'float row=floor(p.y/0.8660254),rowB=row+1.0;',
          'vec2 cellA=vec2(floor(p.x-mod(row,2.0)*0.5+0.5),row);',
          'vec2 cellB=vec2(floor(p.x-mod(rowB,2.0)*0.5+0.5),rowB);',
          'float seedA=reefHash(vec3(cellA,2.7)),seedB=reefHash(vec3(cellB,2.7));',
          'vec2 jitterA=vec2(seedA,fract(seedA*17.37))-0.5;',
          'vec2 jitterB=vec2(seedB,fract(seedB*17.37))-0.5;',
          'vec2 a=p-vec2(cellA.x+mod(row,2.0)*0.5,row*0.8660254)-jitterA*0.14;',
          'vec2 b=p-vec2(cellB.x+mod(rowB,2.0)*0.5,rowB*0.8660254)-jitterB*0.14;',
          'bool useA=dot(a,a)<dot(b,b);vec2 q=useA?a:b;float cellSeed=useA?seedA:seedB;',
          'float cupScale=0.86+0.27*cellSeed;float d=length(q*vec2(0.96+0.08*cellSeed,1.04-0.08*cellSeed))/cupScale;',
          'float cup=1.0-smoothstep(0.10-aa,0.23+aa,d);',
          'float rim=smoothstep(0.19-aa,0.28+aa,d)*(1.0-smoothstep(0.31-aa,0.40+aa,d));',
          'float septa=(0.5+0.5*cos(atan(q.y,q.x+0.00001)*12.0+d*5.0+cellSeed))*rim;',
          'return vec3(cup,rim,septa)*detail;}',
          // Joined quarter-circle valleys run continuously across tile borders.
          // The shallow warp avoids a mechanically regular brain-coral maze.
          'float reefMeander(vec2 p){',
          'p+=0.16*vec2(sin(p.y*0.61),sin(p.x*0.57));vec2 cell=floor(p),q=fract(p);',
          'if(reefHash(vec3(cell,8.1))>0.5)q.x=1.0-q.x;',
          'return min(abs(length(q)-0.5),abs(length(1.0-q)-0.5));}'
        ].join('\n'));
        parts.fColor.push([
          'float reefColonySeed=vReefCoralNormal.w;',
          'vec3 reefColonyOffset=reefColonySeed*vec3(17.3,41.7,29.1);',
          'vec3 reefQ=vReefLocal*reefCoralA.w+reefColonyOffset;',
          'float reefPigment=reefNoise(vReefLocal*11.0+reefColonyOffset+vec3(1.7,5.2,2.9));',
          'float reefAA=0.08,reefDetail=0.55,reefGrooveAA=0.06;',
          'float reefTissue=reefNoise(vReefLocal*6.5+reefColonyOffset+vec3(5.2,1.3,8.1));',
          'vec3 reefProjection=pow(abs(normalize(vReefCoralNormal.xyz)),vec3(8.0));reefProjection/=max(dot(reefProjection,vec3(1.0)),0.0001);',
          'float reefGrooveN=0.4;',
          'if(reefCoralB.x>0.5){vec3 maze=vReefLocal*reefCoralB.y;reefGrooveN=reefMeander(maze.yz)*reefProjection.x+reefMeander(maze.xz)*reefProjection.y+reefMeander(maze.xy)*reefProjection.z;}',
          '#ifdef REEF_DERIVATIVES',
          'float reefFootprint=max(max(fwidth(reefQ.x),fwidth(reefQ.y)),fwidth(reefQ.z));',
          'reefAA=clamp(reefFootprint*0.6,0.015,0.15);reefDetail=1.0-smoothstep(0.22,0.85,reefFootprint);',
          'reefGrooveAA=max(0.02,fwidth(reefGrooveN)*1.2);',
          '#endif',
          // Sponges have fine irregular intake pores, not coral polyp cups.
          // This uniform branch keeps their texture on the same shader family.
          'vec3 reefPolyps;',
          'if(reefCoralB.z< -0.5){reefPolyps=vec3(smoothstep(0.53-reefAA,0.77+reefAA,reefNoise(reefQ))*reefDetail,0.0,0.0);}',
          'else {reefPolyps=reefPolypField(reefQ.yz,reefDetail,reefAA)*reefProjection.x+reefPolypField(reefQ.xz+vec2(7.2,3.1),reefDetail,reefAA)*reefProjection.y+reefPolypField(reefQ.xy+vec2(2.3,9.1),reefDetail,reefAA)*reefProjection.z;}',
          'float reefPore=reefPolyps.x,reefRim=reefPolyps.y,reefSepta=reefPolyps.z;',
          // Fine growth ridges belong to the upper faces of plates, not to
          // every coral. Uniform mode branches keep the other forms cheap.
          'float reefGrowthBands=0.0;',
          'if(reefCoralB.z>1.5){float reefGrowthPhase=length(vReefLocal.xz)*reefCoralB.w+reefTissue*2.1;float reefGrowthDetail=1.0;',
          '#ifdef REEF_DERIVATIVES',
          'reefGrowthDetail=1.0-smoothstep(0.45,1.7,fwidth(reefGrowthPhase));',
          '#endif',
          'reefGrowthBands=(sin(reefGrowthPhase)+0.23*sin(reefGrowthPhase*2.0+0.6))*reefProjection.y*reefGrowthDetail;}',
          'float reefGroove=(1.0-smoothstep(0.025,0.12+reefGrooveAA,reefGrooveN))*reefCoralB.x*(1.0-smoothstep(0.12,0.6,reefGrooveAA));',
          // Slow pigment changes sit beneath tiny polyp cups; the growing
          // skeletal ridges remain softly pale instead of sharp white dots.
          'float reefMantle=smoothstep(0.18,0.82,reefPigment);',
          'vec3 reefTissueTint=mix(vec3(0.91,0.955,0.93),vec3(1.045,1.025,1.02),reefMantle);',
          'diffuseColor.rgb*=reefTissueTint*(1.0-reefCoralA.x*reefPore+reefCoralA.z*(reefRim+0.26*reefSepta))*(0.92+0.16*reefTissue)*(1.0-0.23*reefGroove+0.026*reefGrowthBands);',
          // Broad pigment provinces remain visible when individual cups are
          // subpixel. Every colony keeps one restrained accent family and its
          // own soft boundaries across LOD; reuse the two existing noise fields.
          'float reefLivingPigment=reefCoralA.y*(1.0-step(0.5,vReefSkeleton.x))*vReefSkeleton.y;',
          'float reefPigmentProvince=smoothstep(0.28,0.76,reefTissue*0.72+reefPigment*0.28);',
          'vec3 reefPigmentShade=mix(vec3(0.72,0.87,0.85),vec3(0.88,0.72,0.91),smoothstep(0.22,0.78,reefColonySeed));',
          'vec3 reefPigmentCrown=mix(vec3(1.20,1.07,0.86),vec3(0.95,1.16,1.20),smoothstep(0.30,0.82,reefColonySeed));',
          'vec3 reefColonyPigment=mix(reefPigmentShade,reefPigmentCrown,reefPigmentProvince);',
          'float reefCrownFacing=smoothstep(-0.15,0.85,normalize(vReefCoralNormal.xyz).y);',
          'float reefLivingRidge=(reefRim*0.65+reefSepta*0.25+max(reefGrowthBands,0.0)*0.18)*(0.45+0.55*reefCrownFacing);',
          'diffuseColor.rgb*=mix(vec3(1.0),reefColonyPigment*(0.93+0.13*reefCrownFacing)*(1.0-0.18*reefPore+0.19*reefLivingRidge),reefLivingPigment);',
          ABSORB
        ].join('\n'));
        // Broad tissue folds stay legible after the tiny cups become subpixel.
        // Reuse colony-local fields so texture stays attached across every LOD.
        parts.fRough.push('roughnessFactor=clamp(roughnessFactor-0.045*reefRim+0.035*reefPore+0.055*reefGroove-0.012*reefGrowthBands+0.065*(0.5-reefTissue)-0.025*reefMantle+reefLivingPigment*(0.10*(0.5-reefPigmentProvince)-0.045*reefLivingRidge),0.35,1.0);');
        // Filter both colour and relief at the same footprint to avoid distant
        // maze shimmer. Raised lips surround recessed, gently folded tissue.
        parts.fNormal.push(surfaceRelief('(0.0013*reefRim+0.0003*reefSepta-0.0022*reefPore)*reefCoralA.x-0.0024*reefGroove+0.00045*reefGrowthBands+0.0045*(reefTissue-0.5)+reefLivingPigment*(0.004*(reefPigmentProvince-0.5)+0.0006*reefLivingRidge)', '0.28'));
        // Small cavities occlude diffuse skylight rather than baking another
        // dark stripe into the pigment. Direct sun and the torch still light them.
        parts.fLighting.push('float reefCavity=clamp(1.0-0.22*reefPore*reefCoralA.x-0.34*reefGroove,0.55,1.0);reflectedLight.indirectDiffuse*=reefCavity;reflectedLight.indirectSpecular*=mix(1.0,reefCavity,0.45);');
        applyParts(shader, parts, 'coral');
      };
    }
    function plantShader(motion, fleshy, blade) {
      return function (shader) {
        var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
        shader.uniforms.reefPlantMotion = motion;
        shader.uniforms.reefPlantTissue = { value: fleshy ? 1 : 0 };
        shader.uniforms.reefPlantBlade = { value: blade ? 1 : 0 };
        parts.fCommon.push('uniform vec4 reefPlantMotion;uniform float reefPlantTissue;uniform float reefPlantBlade;');
        parts.vCommon.push([
          'uniform vec4 reefPlantMotion;attribute float reefBladePhase;',
          'vec2 reefPlantWave(float t,float phase,float travel,float amplitude){float angle=phase-travel*t;float ripple=phase*2.0+0.8-(travel+4.0)*t;',
          'float s=0.84*sin(angle)+0.16*sin(ripple);float c=0.84*travel*cos(angle)+0.16*(travel+4.0)*cos(ripple);',
          'return vec2(amplitude*t*t*s,amplitude*(2.0*t*s-t*t*c));}'
        ].join('\n'));
        parts.vNormal.push([
          'float reefPlantT=clamp(position.y/max(reefPlantMotion.z,0.001),0.0,1.12);',
          'mat4 reefPlantFrame=modelMatrix;',
          '#ifdef USE_INSTANCING',
          'reefPlantFrame=modelMatrix*instanceMatrix;',
          '#endif',
          // Every branch of one colony shares its lag. Neighbouring colonies
          // respond a little differently to the same world-aligned current.
          'float reefPlantPhase=reefBladePhase*0.12+fract(dot(reefPlantFrame[3].xyz,vec3(0.1031,0.11369,0.13787)))*1.7;',
          'float reefSurge=reefPlantMotion.x-dot(reefPlantFrame[3].xz,vec2(0.075,0.055));',
          'vec3 reefFlow=vec3(0.035+0.018*sin(reefSurge),0.0,0.022+0.012*sin(reefSurge+0.4));',
          'float reefPlantPulse=length(reefFlow)/0.065;reefFlow=normalize(reefFlow);',
          // Convert the shared world current into each rotated colony's frame.
          'vec2 reefFlowLocal=vec2(dot(reefFlow,normalize(reefPlantFrame[0].xyz)),dot(reefFlow,normalize(reefPlantFrame[2].xyz)));',
          'vec2 reefFlex=reefPlantWave(reefPlantT,reefPlantMotion.y+reefPlantPhase-reefSurge*0.25,2.2,0.027);',
          'vec2 reefCross=reefPlantWave(reefPlantT,reefPlantMotion.y-reefPlantPhase+reefSurge*0.17,3.1,0.008);',
          'vec2 reefAcross=vec2(-reefFlowLocal.y,reefFlowLocal.x);',
          'vec2 reefDrift=vec2(0.14*reefPlantT*reefPlantT,0.28*reefPlantT)+reefFlex;',
          'vec2 reefPlantOffset2=(reefFlowLocal*reefDrift.x+reefAcross*reefCross.x)*reefPlantMotion.z*reefPlantMotion.w*reefPlantPulse;',
          'vec3 reefPlantOffset=vec3(reefPlantOffset2.x,0.0,reefPlantOffset2.y);',
          'vec2 reefPlantSlope=(reefFlowLocal*reefDrift.y+reefAcross*reefCross.y)*reefPlantMotion.w*reefPlantPulse;',
          'objectNormal.y-=dot(reefPlantSlope,objectNormal.xz);'
        ].join('\n'));
        parts.vBegin.push('transformed+=reefPlantOffset;');
        parts.fColor.push([
          'float reefTissue=reefNoise(vReefLocal*48.0+vec3(1.7,0.0,2.1));',
          'float reefPolyp=reefNoise(vReefLocal*185.0+vec3(0.0,7.1,0.0));',
          'float reefPlantDetail=1.0-smoothstep(3.0,11.0,length(vViewPosition));',
          '#ifdef REEF_DERIVATIVES',
          'reefPlantDetail*=1.0-smoothstep(0.4,1.5,max(length(dFdx(vReefLocal)),length(dFdy(vReefLocal)))*185.0);',
          '#endif',
          'float reefPolypCups=smoothstep(0.59,0.76,reefPolyp)*reefPlantDetail*(1.0-reefPlantBlade);',
          // Broad, softly striated blade tissue replaces coral-like cups on algae.
          'float reefBladeGrain=0.5;',
          'if(reefPlantBlade>0.5){reefBladeGrain+=(reefNoise(vReefLocal*vec3(96.0,17.0,96.0)+vec3(3.7,0.0,1.9))-0.5)*reefPlantDetail;}',
          'float reefSoftCrown=reefPlantTissue*smoothstep(0.22,0.72,vReefLocal.y/max(reefPlantMotion.z,0.001));',
          'float reefPolypCollar=smoothstep(0.46,0.62,reefPolyp)*(1.0-smoothstep(0.62,0.76,reefPolyp))*reefPlantDetail*reefSoftCrown;',
          'diffuseColor.rgb*=0.95+0.09*reefTissue-0.085*reefPolypCups+0.065*reefPolypCollar-0.035*reefPolypCups*reefSoftCrown+0.11*(reefBladeGrain-0.5)*reefPlantBlade;',
          'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.08,1.045,1.02),smoothstep(0.72,0.9,reefPolyp)*reefPlantDetail*0.45*(1.0-reefPlantBlade));',
          ABSORB
        ].join('\n'));
        parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.035*reefPolypCups+reefPlantBlade*(-0.07+0.06*(reefBladeGrain-0.5)),0.55,0.95);');
        parts.fNormal.push(surfaceRelief('(reefTissue*0.0007-reefPolypCups*0.00075+reefPolypCollar*0.0005+reefPlantBlade*(reefBladeGrain-0.5)*0.00045)*reefPlantDetail', '0.16'));
        // A restrained thin-blade light approximation follows the existing sun,
        // deformed normal and shadow. It vanishes with the light, not an emission.
        parts.fLighting.push([
          '#if NUM_DIR_LIGHTS > 0',
          'if(reefPlantBlade>0.5){',
          'float reefBladeBack=max(0.0,-dot(normal,directionalLights[0].direction));',
          'float reefBladeThrough=0.08*reefBladeBack*reefBladeBack*getShadowMask()*(0.85+0.3*reefBladeGrain);',
          'reflectedLight.directDiffuse+=material.diffuseColor*directionalLights[0].color*reefBladeThrough;',
          '}',
          '#endif'
        ].join('\n'));
        applyParts(shader, parts, 'plant');
      };
    }
    function plantMotion(height, amount) { var m = { value: new T.Vector4(0, 0, height, reducedMotion ? 0 : amount) }; m.amount = amount; plantMotions.push(m); return m; }
    function buildMaterials() {
      function std(params) { params.color = params.color || 0xffffff; params.vertexColors = true; return new T.MeshStandardMaterial(params); }
      var look = { a: { value: new T.Vector4(0.25, 1, 0.08, 75) }, b: { value: new T.Vector4(0.0, 18, 0, 0) } };
      var brain = { a: { value: new T.Vector4(0.08, 1, 0.05, 60) }, b: { value: new T.Vector4(1.0, 28, 0, 0) } };
      // The same shader family gives Porites-like heads fine compact cups,
      // and foliose/table colonies subtle growth ridges on their upper faces.
      var massive = { a: { value: new T.Vector4(0.17, 1, 0.055, 118) }, b: { value: new T.Vector4(0, 18, 1, 0) } };
      var plate = { a: { value: new T.Vector4(0.2, 1, 0.075, 96) }, b: { value: new T.Vector4(0, 18, 2, 135) } };
      var sponge = { a: { value: new T.Vector4(0.35, 0, 0.0, 132) }, b: { value: new T.Vector4(0, 18, -1, 0) } };
      U.substrate = { value: own(createSubstrateTexture(T)) };
      // Dive light: x = power (0 when off), y and z = cone edge cosines, w = reach in metres.
      U.torchPos = { value: new T.Vector3() }; U.torchDir = { value: new T.Vector3(0, -0.3, -1).normalize() }; U.torch = { value: new T.Vector4(0, TORCH_OUTER, TORCH_INNER, TORCH_REACH) };
      mats.floor = patch(std({ roughness: 0.95, metalness: 0 }), 'floor', floorShader);
      mats.rock = patch(std({ roughness: 0.92 }), 'rock', rockShader);
      mats.coral = patch(std({ roughness: 0.82 }), 'coral', coralShader(look));
      mats.brain = patch(std({ roughness: 0.8 }), 'coral', coralShader(brain));
      mats.massive = patch(std({ roughness: 0.88 }), 'coral', coralShader(massive));
      mats.plate = patch(std({ roughness: 0.82 }), 'coral', coralShader(plate));
      mats.sponge = patch(std({ roughness: 0.88 }), 'coral', coralShader(sponge));
      mats.algae = patch(std({ roughness: 0.65, side: T.DoubleSide }), 'plant', plantShader(plantMotion(0.22, 1), false, true));
      mats.soft = patch(std({ roughness: 0.76 }), 'plant', plantShader(plantMotion(0.45, 0.55), true));
      mats.fan = patch(std({ roughness: 0.7 }), 'plant', plantShader(plantMotion(0.85, 0.35)));
    }

    // ---- Seafloor and bommies -------------------------------------------------
    // Living reef crust: dark rock under pink and purple coralline, tan turf, green
    // algae on a degraded reef and bright encrusting sponges on a healthy one.
    var CRUST = null, SANDC = null, RUBC = null, benthos = null, PALETTE = null;
    // Every patch of hard reef holds one state (benthicField); the floor, the
    // bommies and the decorative colonies all read it, so they agree.
    function cover() { return benthos || (benthos = benthicField(seed, terrain, bommies, health, !!restoration)); }
    // Living colonies are mostly browns, tans, olives and greens (the algae in
    // their tissue) with fluorescent accents; soft corals, fans and sponges
    // carry the reds, oranges, purples and blues. Linear colours, lifted a little
    // because the water column removes red even close to the diver.
    function palette() {
      if (PALETTE) return PALETTE;
      // warm: the shared water treatment turns a plain brown grey-olive at 8 m;
      // living tissue keeps its warmth close to the diver, as the guide asks.
      function cols(list, boost, warm) { warm = warm || 1; return list.map(function (hex) { var c = lin(hex); return [Math.min(1.4, c.r * boost * warm), Math.min(1.4, c.g * boost), Math.min(1.4, c.b * boost / Math.sqrt(warm))]; }); }
      PALETTE = {
        acro: cols([0x9a643a, 0xa87a46, 0x8a7a3c, 0x6e7a3e, 0x945470, 0x7c5c94, 0x5a7890, 0xa88a50, 0x9c6040], 1.12, 1.18),
        pocillo: cols([0xc07468, 0xb45e58, 0xa87048, 0xcc8676, 0x96844a], 1.12, 1.18),
        porites: cols([0xb48c42, 0xb49462, 0x84924a, 0xa87c42, 0xa08c58, 0x8c6a70], 1.1, 1.15),
        brain: cols([0x8a6e3c, 0x8a8044, 0x6c7444, 0xa07848, 0x845c34], 1.12, 1.18),
        plate: cols([0x8a7c44, 0x9c6c42, 0x6c7650, 0xa88452, 0x80628a, 0x8a6a3c], 1.12, 1.18),
        crust: cols([0x7a4884, 0x8c5434, 0x5c7848, 0xb46036, 0xaa6080, 0x7c6a3a], 1.12, 1.15),
        soft: cols([0xdccb96, 0xdcb042, 0xd8782e, 0xc03c34, 0x924aa2, 0xcc96aa, 0x9ea66c], 1.22),
        fan: cols([0xd8682a, 0xbc2e2c, 0x7e388e, 0xd09c30], 1.25),
        sponge: cols([0x803aa4, 0x3a6abc, 0xd86e2a, 0x8e5a36, 0xd0a632, 0xa8384c], 1.25),
        weed: cols([0x9c7a2c, 0x7c7226, 0xae8a36, 0x6c742a, 0x8c6024], 1.35, 1.1),
        white: [1.05, 1.04, 1.0], sheen: [[0.94, 1.0, 1.1], [1.08, 0.95, 1.01], [1.05, 1.03, 0.86]],
        skeleton: [[0.82, 0.8, 0.73], [0.7, 0.66, 0.54], [0.58, 0.54, 0.4]], turf: cols([0x5e5630, 0x6a5c32, 0x56532c], 1.25)
      };
      PALETTE.form = { finger: PALETTE.acro, antler: PALETTE.acro, table: PALETTE.acro, corym: PALETTE.pocillo, massive: PALETTE.porites, brain: PALETTE.brain, plate: PALETTE.plate, encrust: PALETTE.crust };
      return PALETTE;
    }
    function pickC(list, roll) { return list[Math.floor(roll * list.length) % list.length]; }
    // The colour a patch shows between and beneath its colonies. Living tissue
    // drifts slowly through warm browns, tans and olives across the reef: a
    // patch-by-patch mix of unrelated hues would average to grey on the rock.
    var TISSUE = null;
    function patchTint(k, x, z, out) {
      var F = cover(), st = k < 0 ? ROCK : F.state[k], P = palette(), r1 = k < 0 ? 0.5 : F.roll[k * 4 + 1], c = null, w = 0;
      if (!TISSUE) TISSUE = [0xa8643a, 0xb47c48, 0x946a30, 0x8a7434, 0xa25a40, 0xb88a52].map(function (h) { var q = lin(h); return [q.r * 1.3, q.g * 1.12, q.b]; });
      if (st === LIVE) {
        var u = noise2(x * 0.16 + 3.7, z * 0.16 - 1.9) * (TISSUE.length - 1), i0 = Math.floor(u), f = u - i0, a = TISSUE[i0], b = TISSUE[Math.min(TISSUE.length - 1, i0 + 1)], sh = 0.9 + 0.2 * r1;
        out[0] = lerp(a[0], b[0], f) * sh; out[1] = lerp(a[1], b[1], f) * sh; out[2] = lerp(a[2], b[2], f) * sh;
        return 0.9;
      }
      if (st === BLEACHED) { c = P.white; w = 0.7; }
      else if (st === FRESH) { c = pickC(P.skeleton, r1); w = 0.5; }
      else if (st === MACRO) { c = pickC(P.turf, r1); w = 0.82; }
      else if (st === LIFE) { c = pickC(P.sponge, r1); w = 0.22; }
      if (!w) return 0;
      out[0] = c[0] * 1.05; out[1] = c[1] * 0.92; out[2] = c[2] * 0.85;
      return w;
    }
    // Declared here but first used while mount() is still running its build.
    var tintRgb = null;
    function crustColor(x, y, z, up, out, floor) {
      if (!tintRgb) tintRgb = [0, 0, 0];
      if (!CRUST) CRUST = { stone: lin3(0x92866d), cca: lin3(0xb07488), purple: lin3(0x86688e), turf: lin3(0x5d5a34), tan: lin3(0xaca080) };
      // Vertex colour carries only broad pigment washes. Fine crust boundaries
      // belong in the material: sampling them on a coarse rock mesh creates
      // conspicuous triangular patches as the detail level changes.
      // Long-dead framework darkens under its turf.
      // A warped lookup gives the painted patches ragged, organic margins.
      var F = cover(), k = F.at(x + 0.9 * (noise3(x * 0.8 + 5, y * 0.8, z * 0.8) - 0.5), z + 0.9 * (noise3(x * 0.8, y * 0.8 + 3, z * 0.8 - 7) - 0.5)), algae = health.algae, damage = F.damage, m = (0.88 + 0.24 * noise3(x * 0.3, y * 0.3, z * 0.3)) * (1 - 0.45 * damage);
      // Bare reef rock is never bare: long-dead framework wears a brown-olive
      // turf, living reef rock pink and purple coralline crusts.
      var turfW = clamp((0.14 + 0.5 * algae + 0.4 * damage) * smooth(0.25, 0.65, noise3(x * 0.45 + 4, y * 0.45, z * 0.45)) * (0.45 + 0.55 * up), 0, 0.92);
      var ccaW = (1 - 0.8 * damage) * 0.3 * smooth(0.3, 0.72, noise3(x * 0.38 - 9, y * 0.38, z * 0.38 + 3)) * (1 - turfW);
      var purW = (1 - damage) * 0.12 * smooth(0.36, 0.78, noise3(x * 0.46 + 2, y * 0.46 - 5, z * 0.46)) * Math.max(0, 1 - turfW - ccaW);
      var tanW = 0.4 * (1 - 0.7 * damage) * smooth(0.4, 0.75, noise3(x * 0.5 + 9, y * 0.5, z * 0.5 - 4)) * Math.max(0, 1 - turfW - ccaW - purW);
      var rest = Math.max(0, 1 - turfW - ccaW - purW - tanW);
      for (var c = 0; c < 3; c++) out[c] = CRUST.stone[c] * m * rest + CRUST.turf[c] * turfW + CRUST.cca[c] * ccaW + CRUST.purple[c] * purW + CRUST.tan[c] * tanW * m;
      var w = patchTint(k, x, z, tintRgb) * (floor ? 1 : 0.9 + 0.1 * up) * (0.88 + 0.24 * noise3(x * 1.3 + 2, y * 1.3, z * 1.3));
      if (w > 0) for (c = 0; c < 3; c++) out[c] = lerp(out[c], tintRgb[c] * m, clamp(w, 0, 1));
      return out;
    }
    function buildFloor() {
      var step = high ? 0.5 : 1.0, xs = gridAxis(-31, 31, step, -80, 80, 1.18), zs = gridAxis(-31, 31, step, -80, 80, 1.18);
      var nx = xs.length, nz = zs.length, n = nx * nz, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), gr = new Float32Array(n * 2), idx = [], i, j;
      var algae = health.algae, rgb = [0, 0, 0];
      SANDC = lin3(0xcac1a7); RUBC = lin3(0xb1aa97); cover();
      for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) {
        var x = xs[i], z = zs[j], k = j * nx + i, sand = terrain.sandMask(x, z), rub = terrain.rubbleMask(x, z);
        pos[k * 3] = x; pos[k * 3 + 1] = terrain.floorY(x, z); pos[k * 3 + 2] = z;
        var n1 = noise2(x * 0.35 + 3.1, z * 0.35 - 1.7), n2 = noise2(x * 1.7, z * 1.7 + 5.5);
        crustColor(x, pos[k * 3 + 1], z, 1, rgb, true);
        for (var c = 0; c < 3; c++) {
          var turf = CRUST.turf[c], sandC = SANDC[c] * (0.95 + 0.08 * n2), rubC = RUBC[c] * (0.85 + 0.25 * n2) * 0.66 + turf * (0.22 + 0.3 * algae * n1) + CRUST.cca[c] * 0.12 * (1 - n1);
          rgb[c] = lerp(lerp(rgb[c], sandC, sand), rubC, restoration ? rub : rub * 0.5);
        }
        // Rubble patches of a damaged reef share the rubble field's chips and tone.
        var cell = benthos.at(x, z), loose = cell >= 0 && benthos.state[cell] === RUBBLE ? 0.75 : 0;
        if (loose > rub) for (c = 0; c < 3; c++) rgb[c] = lerp(rgb[c], lerp(RUBC[c] * (0.85 + 0.25 * n2), CRUST.turf[c] * 1.4, 0.3 + 0.5 * benthos.damage * (0.6 + 0.4 * n1)), loose - rub);
        col[k * 3] = rgb[0]; col[k * 3 + 1] = rgb[1]; col[k * 3 + 2] = rgb[2]; gr[k * 2] = sand * (1 - loose); gr[k * 2 + 1] = Math.max(restoration ? rub : rub * 0.5, loose);
      }
      for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a = j * nx + i, cc = a + nx; idx.push(a, cc, a + 1, a + 1, cc, cc + 1); }
      var g = own(new T.BufferGeometry());
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('reefGround', new T.BufferAttribute(gr, 2));
      g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
      floorMesh = new T.Mesh(g, mats.floor); floorMesh.name = 'reef-explore-floor'; floorMesh.receiveShadow = true; scene.add(floorMesh);
    }
    function buildBommieMesh() {
      var b = new Builder(), w = {}, spans = [];
      bommies.forEach(function (bm) {
        // Spend detail on the large exposed shoulders; small knolls need fewer
        // vertices. Total rock geometry stays below the previous uniform grid.
        var large = bm.r >= 1.65, rings = high ? (large ? 14 : 8) : (large ? 9 : 6), segs = high ? (large ? 34 : 22) : (large ? 20 : 14);
        var first = b.count(), k, s;
        spans.push({ x: bm.x, z: bm.z, v0: first, i0: b.i.length, crownEnd: first + 1 + (rings - 1) * segs });
        b.vertex(bm.x, bm.heightAt(bm.x, bm.z), bm.z, 0, 1, 0, 1, 1, 1);
        for (k = 1; k <= rings; k++) {
          var rn = Math.pow(k / rings, 0.82);
          for (s = 0; s < segs; s++) {
            var a = s / segs * TAU, e = bm.edge(a) * Math.min(rn, 0.999), lx = Math.cos(a) * e, lz = Math.sin(a) * e; bm.toWorld(lx, lz, w);
            b.vertex(w.x, k === rings ? bm.base : bm.heightLocal(lx, lz), w.z, 0, 1, 0, 1, 1, 1);
          }
        }
        var outer = first + 1 + (rings - 1) * segs, skirt = b.count();
        for (s = 0; s < segs; s++) b.vertex(b.p[(outer + s) * 3], bm.base - 1.6, b.p[(outer + s) * 3 + 2], 0, 0, 1, 1, 1, 1);
        for (s = 0; s < segs; s++) b.i.push(first, first + 1 + (s + 1) % segs, first + 1 + s);
        for (k = 1; k < rings; k++) for (s = 0; s < segs; s++) {
          var p0 = first + 1 + (k - 1) * segs + s, p1 = first + 1 + (k - 1) * segs + (s + 1) % segs; b.i.push(p0, p1, p0 + segs, p1, p1 + segs, p0 + segs);
        }
        for (s = 0; s < segs; s++) { var o = outer + s, o1 = outer + (s + 1) % segs, q = skirt + s, q1 = skirt + (s + 1) % segs; b.i.push(o, o1, q, o1, q1, q); }
      });
      var g = own(b.build(T, true)), pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, rgb = [0, 0, 0];
      for (var i = 0; i < pos.count; i++) { crustColor(pos.getX(i), pos.getY(i), pos.getZ(i), smooth(0.2, 0.8, nor.getY(i)), rgb); col.setXYZ(i, rgb[0], rgb[1], rgb[2]); }
      col.needsUpdate = true;
      // Let light follow the same continuous limestone surface used by the
      // attached colonies. Area-averaged radial triangles otherwise leave
      // broad spokes across the shoulders. Keep their original pigment, all
      // picking vertices, and the forced rim/skirt normals exactly as built.
      spans.forEach(function (sp, bi) {
        var bm = bommies[bi], epsilon = Math.min(0.025, bm.r * 0.02);
        for (var j = sp.v0; j < sp.crownEnd; j++) {
          var x = pos.getX(j), z = pos.getZ(j), dx = x - bm.x, dz = z - bm.z;
          var lx = dx * bm.c + dz * bm.s, lz = -dx * bm.s + dz * bm.c;
          var radius = Math.hypot(lx, lz) / bm.edge(Math.atan2(lz, lx));
          var blend = 1 - smooth(0.76, 0.96, radius);
          if (blend <= 0) continue;
          var xp = bm.heightAt(x + epsilon, z), xm = bm.heightAt(x - epsilon, z);
          var zp = bm.heightAt(x, z + epsilon), zm = bm.heightAt(x, z - epsilon);
          if (!(xp > NONE && xm > NONE && zp > NONE && zm > NONE)) continue;
          var nx = -(xp - xm) / (2 * epsilon), nz = -(zp - zm) / (2 * epsilon);
          var length = Math.sqrt(nx * nx + 1 + nz * nz);
          if (!isFinite(length) || length <= 0) continue;
          nx = lerp(nor.getX(j), nx / length, blend);
          var ny = lerp(nor.getY(j), 1 / length, blend);
          nz = lerp(nor.getZ(j), nz / length, blend);
          length = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (length > 0) nor.setXYZ(j, nx / length, ny / length, nz / length);
        }
      });
      nor.needsUpdate = true;
      // One identity instance with a white tint draws exactly as a plain mesh and
      // shares the decor rocks' instanced program: one less shader to link.
      bommieMesh = new T.InstancedMesh(g, mats.rock, 1); bommieMesh.setMatrixAt(0, new T.Matrix4()); bommieMesh.setColorAt(0, new T.Color(1, 1, 1));
      bommieMesh.name = 'reef-explore-bommies'; bommieMesh.castShadow = high; bommieMesh.receiveShadow = true; scene.add(bommieMesh);
      leanRockChunks(g, spans);
    }
    // On the high tier the rock is drawn in chunks: whole bommies grouped by which of
    // 3 x 3 cells their centre lies in, so the camera and the shadow camera skip the
    // chunks they cannot see. A chunk copies its bommies' vertices exactly and no bommie
    // is split, so no seam can open. bommieMesh keeps the whole rock, undrawn, for
    // picking and queries. Finer cells cull little more rock for many more draw calls,
    // and the light tier (no shadow pass, a lighter rock) gains nothing from them.
    function leanRockChunks(g, spans) {
      if (!high) return;
      var cells = {}, keys = [], P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color.array, I = g.index.array;
      function band(v) { return clamp(Math.floor((v + 31.5) / 21), 0, 2); }
      spans.forEach(function (sp, k) {
        sp.v1 = k + 1 < spans.length ? spans[k + 1].v0 : P.length / 3; sp.i1 = k + 1 < spans.length ? spans[k + 1].i0 : I.length;
        var key = band(sp.x) + ':' + band(sp.z);
        if (!cells[key]) { cells[key] = []; keys.push(key); }
        cells[key].push(sp);
      });
      keys.forEach(function (key) {
        var list = cells[key], nv = 0, ni = 0, at = 0, n = 0;
        list.forEach(function (sp) { nv += sp.v1 - sp.v0; ni += sp.i1 - sp.i0; });
        var pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
        list.forEach(function (sp) {
          pos.set(P.subarray(sp.v0 * 3, sp.v1 * 3), at * 3); nor.set(N.subarray(sp.v0 * 3, sp.v1 * 3), at * 3); col.set(C.subarray(sp.v0 * 3, sp.v1 * 3), at * 3);
          for (var q = sp.i0; q < sp.i1; q++) idx[n++] = I[q] - sp.v0 + at;
          at += sp.v1 - sp.v0;
        });
        var cg = own(new T.BufferGeometry());
        cg.setAttribute('position', new T.BufferAttribute(pos, 3)); cg.setAttribute('normal', new T.BufferAttribute(nor, 3)); cg.setAttribute('color', new T.BufferAttribute(col, 3));
        cg.setIndex(new T.BufferAttribute(idx, 1)); cg.computeBoundingBox(); cg.computeBoundingSphere();
        // An InstancedMesh is never culled by default; with one identity instance its geometry's bounds are exact.
        var chunk = new T.InstancedMesh(cg, mats.rock, 1); chunk.setMatrixAt(0, new T.Matrix4()); chunk.setColorAt(0, new T.Color(1, 1, 1)); chunk.frustumCulled = true;
        chunk.name = 'reef-explore-bommies-chunk'; chunk.castShadow = high; chunk.receiveShadow = true; scene.add(chunk);
      });
      bommieMesh.visible = false;
    }

    // ---- Organisms ----------------------------------------------------------------
    function candidate(zone, u, v, w, info) {
      var x, z, bm, a, rn, e, lx, lz, p = {}, sessile = info.habit === 'sessile' || info.group === 'coral' || info.group === 'structure';
      var rb = terrain.rubble;
      function reefScore(px, pz) { return (1 - terrain.sandMask(px, pz)) * (1 - terrain.rubbleMask(px, pz)); }
      function onBommie(b2, a2, rn2) {
        e = b2.edge(a2) * rn2; lx = Math.cos(a2) * e; lz = Math.sin(a2) * e; b2.toWorld(lx, lz, p);
        var y = b2.heightLocal(lx, lz); if (!(y > NONE)) return null;
        return { x: p.x, z: p.z, y: y, bommie: b2, score: 1 };
      }
      if (zone === 'bommie' || zone === 'anemone' || zone === 'bommieAbove') {
        bm = bommies[Math.floor(u * bommies.length) % bommies.length];
        var c = onBommie(bm, v * TAU, (zone === 'bommieAbove' ? 0.4 : 0.78) * Math.sqrt(w));
        if (c && zone === 'anemone') c.score = 1 + c.y * 0.05;
        return c;
      }
      if (zone === 'shadedRock') {
        bm = bommies[Math.floor(u * bommies.length) % bommies.length];
        // Opposite the scene's daylight direction (0.42, 1, 0.3): a hard rock
        // shoulder, not the sun-facing coral garden or an invented cave ceiling.
        a = Math.atan2(-0.3, -0.42) - Math.atan2(bm.s, bm.c) + (v - 0.5) * 0.7;
        return onBommie(bm, a, 0.76 + 0.13 * w);
      }
      if (zone === 'station' || zone === 'stationBase') {
        bm = station; a = v * TAU;
        if (zone === 'station') return onBommie(bm, a, 0.6 + 0.3 * w);
        e = bm.edge(a) * 1.05; lx = Math.cos(a) * e; lz = Math.sin(a) * e; bm.toWorld(lx, lz, p);
        return { x: p.x, z: p.z, y: terrain.floorY(p.x, p.z), bommie: bm, score: 1 };
      }
      if (zone === 'bommieSide') {
        bm = bommies[Math.floor(u * bommies.length) % bommies.length]; a = v * TAU; e = bm.edge(a) * (1.1 + 0.3 * w); lx = Math.cos(a) * e; lz = Math.sin(a) * e; bm.toWorld(lx, lz, p);
        return { x: p.x, z: p.z, y: groundTop(p.x, p.z), bommie: bm, score: 1 };
      }
      if (zone === 'rubble' || zone === 'rubbleEdge') {
        a = v * TAU; rn = zone === 'rubble' ? rb.r * 0.85 * Math.sqrt(u) : rb.r * (0.95 + 0.4 * u);
        x = rb.x + Math.cos(a) * rn; z = rb.z + Math.sin(a) * rn / 1.1;
        return { x: x, z: z, y: terrain.floorY(x, z), score: 1 };
      }
      if (zone === 'channel' || zone === 'sand') {
        if (zone === 'sand' && w > 0.5) { x = -24 + 48 * u; z = 18 + 8 * v; }
        else { z = -12 + 30 * v; x = terrain.channelX(z) + (u - 0.5) * 2.4; }
        return { x: x, z: z, y: terrain.floorY(x, z), score: terrain.sandMask(x, z) };
      }
      x = -24 + 48 * u;
      z = zone === 'crest' ? -27 + 13 * v : zone === 'slope' ? -2 + 18 * v : zone === 'flat' ? -27 + 16 * v : -24 + 46 * v;
      var score = reefScore(x, z) + (zone === 'garden' ? 0.6 * smooth(0.3, 0.7, noise2(x * 0.15 + 7, z * 0.15 + 3)) : 0) + 0.2 * w;
      if (sessile && obstacleTop(x, z) > terrain.floorY(x, z) + 0.1) score -= 2;
      if (!sessile) {
        // Reef fish stay close to structure: bommies and knolls.
        var near = 99; bommies.forEach(function (b2) { near = Math.min(near, Math.hypot(b2.x - x, b2.z - z) - b2.r); });
        score += 0.8 * (1 - smooth(1, 9, near)) + 0.5 * (1 - smooth(6, 22, Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z)));
      }
      return { x: x, z: z, y: sessile ? terrain.floorY(x, z) : groundTop(x, z), score: score };
    }
    function defaultZone(info, beh) {
      if (info.group === 'coral') return 'garden';
      if (info.group === 'structure') return 'rubble';
      if (beh === 'den') return 'rubbleEdge';
      if (beh === 'school') return info.lengthM < 0.15 ? 'bommieAbove' : 'reef';
      if (beh === 'hover') return 'bommieSide';
      return 'reef';
    }
    function placeHome(o, zone, members) {
      var d = o.draws, info = o.info, beh = o.behavior, L = info.lengthM, k;
      o.scale = 0.85 + 0.3 * d[24]; o.yaw = d[25] * TAU; o.phase = d[26] * TAU; o.dir = d[27] < 0.5 ? 1 : -1;
      if (o.speciesId === 'porcelain_anemone_crab' && anemones.length) {
        var host = anemones[o.index % anemones.length], mat = anemoneMat(host), side = d[25] * TAU, ring = 0.035 + 0.015 * d[28];
        o.anchor = host; o.ground = mat.y + 0.002; o.home = new T.Vector3(mat.x + Math.cos(side) * ring, o.ground, mat.z + Math.sin(side) * ring);
        return;
      }
      if (beh === 'squid' && members.length) {
        o.leader = members[0]; o.home = o.leader.home.clone(); o.ground = o.leader.ground; return;
      }
      if (beh === 'eagle') {
        var ez = 7 + 6 * d[0], ex = terrain.channelX(ez);
        o.ground = terrain.floorY(ex, ez); o.home = new T.Vector3(ex, o.ground + 2.4, ez); return;
      }
      if ((beh === 'pair' || beh === 'clown') && o.index % 2 === 1 && members.length) {
        var lead = members[members.length - 1]; o.leader = lead; o.home = lead.home.clone(); o.ground = lead.ground; o.anchor = lead.anchor; return;
      }
      if (beh === 'clown') {
        var an = anemones.length ? anemones[Math.floor(o.index / 2) % anemones.length] : null;
        if (an) { o.anchor = an; o.ground = an.top; o.home = new T.Vector3(an.x, an.top + 0.14, an.z); return; }
        zone = 'bommie';
      }
      if (beh === 'cleaner' && placeCleaner(o)) return;
      if (beh === 'cots' && placeCots(o)) return;
      if (beh === 'graze' && info.habit === 'school') o.school = schoolSize(info, d[31]);
      if (beh === 'moray') { var mo = crevice.mouth; o.home = new T.Vector3(mo.x, mo.y, mo.z); o.ground = mo.y; o.yaw = bearingTo(mo.nx, mo.nz); o.viewDir = { x: mo.nx, z: mo.nz }; return; }
      if (beh === 'manta') { placeManta(o); return; }
      if (beh === 'cruise') { var hx = -18 + 36 * d[0]; o.ground = terrain.floorY(hx, 21); o.home = new T.Vector3(hx, o.ground + 1.6, 21); return; }
      var best = null, bestScore = -Infinity, sessile = beh === 'fixed' || beh === 'den' || beh === 'ray' || beh === 'cleaner' && info.group !== 'fish';
      for (k = 0; k < 8; k++) {
        var c = candidate(zone, d[k * 3], d[k * 3 + 1], d[k * 3 + 2], info);
        if (!c || Math.abs(c.x) > 27.5 || Math.abs(c.z) > 27.5) continue;
        var depth = -c.y, score = c.score;
        // Planktivore schools gather over the larger coral heads.
        if (zone === 'bommieAbove' && c.bommie) score += 0.6 * Math.min(1, c.bommie.r / 2);
        if (depth < info.depthM[0]) score -= (info.depthM[0] - depth) * 0.3;
        if (depth > info.depthM[1]) score -= (depth - info.depthM[1]) * 0.3;
        if (sessile) {
          var mine = Math.max(0.2, L * 0.5);
          for (var s = 0; s < sessiles.length; s++) if (Math.hypot(sessiles[s].x - c.x, sessiles[s].z - c.z) < mine + sessiles[s].r + 0.35) score -= 2;
          if (zone !== 'rubble' && zone !== 'rubbleEdge' && terrain.rubbleMask(c.x, c.z) > 0.2) score -= 1.5;
        }
        if (score > bestScore) { bestScore = score; best = c; }
      }
      if (!best) best = { x: 2, z: -2, y: terrain.floorY(2, -2) };
      o.ground = best.y; o.bommie = best.bommie || null;
      if (sessile) sessiles.push({ x: best.x, z: best.z, r: Math.max(0.2, L * 0.5) });
      var alt = 0;
      if (beh === 'wander' || beh === 'turtle') alt = 0.5 + 1.6 * d[29] + 0.4 * Math.min(L, 1);
      else if (beh === 'pair') alt = 0.35 + 1.0 * d[29];
      else if (beh === 'hover' || beh === 'cleaner' && info.group === 'fish') alt = 0.3 + 0.7 * d[29];
      else if (beh === 'school') alt = zone === 'bommieAbove' ? 0.6 + 1.2 * d[29] : 1.1 + 2.4 * d[29];
      else if (beh === 'roam') alt = 1.0 + 2.0 * d[29];
      else if (beh === 'squid') alt = 1.8 + 0.7 * d[29];
      else if (beh === 'cuttle') alt = 0.45 + 0.3 * d[29];
      else if (beh === 'puffer') alt = 0.6 + 0.55 * d[29];
      else if (beh === 'krait') alt = 0.45 + 0.2 * d[29];
      o.home = new T.Vector3(best.x, best.y + alt, best.z);
      if (sessile && best.bommie) {
        var h1 = best.bommie.heightAt(best.x + 0.15, best.z), h0 = best.bommie.heightAt(best.x - 0.15, best.z), h2 = best.bommie.heightAt(best.x, best.z + 0.15), h3 = best.bommie.heightAt(best.x, best.z - 0.15);
        if (h1 > NONE && h0 > NONE && h2 > NONE && h3 > NONE) o.normal = new T.Vector3(-(h1 - h0) / 0.3, 1, -(h2 - h3) / 0.3).normalize();
      }
      if (sessile && !o.normal) {
        var f1 = terrain.floorY(best.x + 0.3, best.z), f0 = terrain.floorY(best.x - 0.3, best.z), f2 = terrain.floorY(best.x, best.z + 0.3), f3 = terrain.floorY(best.x, best.z - 0.3);
        o.normal = new T.Vector3(-(f1 - f0) / 0.6, 1, -(f2 - f3) / 0.6).normalize();
      }
    }
    function loopPath(cx, cy, cz, a, b, rot, w, ph, dirSign, bob, wob) {
      var lim = 27.5 - Math.max(Math.abs(cx), Math.abs(cz)), s = Math.max(0.2, Math.min(1, lim / Math.max(a, b, 0.01)));
      a *= s; b *= s; var c = Math.cos(rot), si = Math.sin(rot);
      return function (t, out) {
        // An integrated speed envelope gives short swimming efforts and glides
        // without changing direction abruptly or accumulating frame-rate drift.
        var travel = w * (t + 0.18 / 0.52 * (Math.sin(t * 0.52 + ph) - Math.sin(ph)) + 0.08 / 0.17 * (Math.sin(t * 0.17 + ph * 0.7) - Math.sin(ph * 0.7)));
        var th = ph + dirSign * travel, lx = a * Math.cos(th) + wob * a * Math.cos(3 * th + ph), lz = b * Math.sin(th) + wob * b * Math.sin(2 * th + ph * 1.3);
        out.x = cx + lx * c - lz * si; out.z = cz + lx * si + lz * c; out.y = cy + bob * Math.sin(0.5 * th + ph); return out;
      };
    }
    function setupMotion(o) {
      var d = o.draws, L = o.info.lengthM, h = o.home, beh = o.behavior, a, b, sp;
      o.clear = 0.22 + 0.35 * Math.min(L, 1.6); o.lift = 0; o.sweep = null; o.bank = 0.12;
      if (beh === 'cleaner' || beh === 'client' || beh === 'graze') { if (setupForager(o)) return; beh = 'wander'; o.pathPeriod = 60; }
      if (o.leader && beh === 'pair') {
        var lead = o.leader, ox = (d[28] - 0.5) * 0.8, oz = 0.25 + 0.3 * d[30], pairAhead = { x: 0, y: 0, z: 0 };
        // A companion follows the leader's wake, keeping its flank offset as
        // they turn instead of sliding sideways along fixed world axes.
        o.path = function (t, out) {
          lead.path(t - 0.7, out); lead.path(t - 0.4, pairAhead);
          var dx = pairAhead.x - out.x, dz = pairAhead.z - out.z, length = Math.hypot(dx, dz) || 1;
          out.x += (dx * ox - dz * oz) / length; out.z += (dz * ox + dx * oz) / length; out.y += 0.1; return out;
        };
        return;
      }
      if (beh === 'eagle') {
        // The long whip tail is not the wing disc. Keep its complete bounds for
        // visibility, but use a disc-sized clearance and an open, broad route.
        var ep = loopPath(h.x, 0, h.z, 7.5 + 2 * d[28], 4.5 + d[30], o.yaw, 0.055, o.phase, o.dir, 0, 0.04), eph = o.phase;
        o.path = function (t, out) { ep(t, out); out.y = terrain.floorY(out.x, out.z) + 2.0 + 0.35 * Math.sin(t * 0.09 + eph); return out; };
        o.clear = 0.85; o.bank = 0.16;
        // The disc is centred on the model origin. Its tail shifts centerLocal,
        // which is useful for visibility but must not move the wing footprint.
        o.groundReach = 0.78 * o.scale;
        o.observationCenter = o.root.position; o.observationRadius = 0.9 * o.scale;
      } else if (beh === 'squid') {
        o.clear = 0.45; o.bank = 0.025;
        if (o.leader) {
          var sqLead = o.leader, sqAhead = { x: 0, y: 0, z: 0 }, sqSide = (o.index % 2 ? 1 : -1) * (0.5 + 0.18 * d[28]), sqLag = 1.6 + 0.4 * o.index;
          o.path = function (t, out) {
            sqLead.path(t - sqLag, out); sqLead.path(t - sqLag + 0.2, sqAhead);
            var dx = sqAhead.x - out.x, dz = sqAhead.z - out.z, mag = Math.hypot(dx, dz) || 1;
            out.x -= dz / mag * sqSide; out.z += dx / mag * sqSide; out.y += 0.12 * Math.sin(o.index + t * 0.16); return out;
          };
        } else {
          a = 2.2 + 1.4 * d[28]; b = 1.2 + 0.7 * d[30]; sp = 0.22 + 0.07 * d[29];
          o.path = loopPath(h.x, h.y, h.z, a, b, o.yaw, sp / ((a + b) / 2), o.phase, o.dir, 0.18, 0.06);
        }
      } else if (beh === 'cuttle') {
        // Keep the fin-driven hover near the smooth rock surface while the
        // clearance planner anticipates colonies. The small scanning turn
        // follows the patrol rather than holding one world heading all the way.
        var cp = loopPath(h.x, h.y, h.z, 0.65 + 0.35 * d[28], 0.4 + 0.25 * d[30], o.yaw, 0.09, o.phase, o.dir, 0.06, 0.05);
        var cPhase = o.phase, cHere = { x: 0, y: 0, z: 0 }, cAhead = { x: 0, y: 0, z: 0 };
        o.path = function (t, out) { cp(t, out); out.y += rockSurfaceAt(out.x, out.z) - o.ground; return out; };
        o.sweep = function (t) {
          cp(t, cHere); cp(t + 0.3, cAhead);
          return bearingTo(cAhead.x - cHere.x, cAhead.z - cHere.z) + 0.22 * Math.sin(t * 0.075 + cPhase);
        };
        o.clear = 0.22; o.bank = 0.015;
      } else if (beh === 'puffer') {
        a = 1.2 + 0.7 * d[28]; b = 0.75 + 0.4 * d[30]; sp = 0.12 + 0.035 * d[29];
        o.path = loopPath(h.x, h.y, h.z, a, b, o.yaw, sp / ((a + b) / 2), o.phase, o.dir, 0.10, 0.055);
        o.clear = 0.30; o.bank = 0.025;
      } else if (beh === 'krait') {
        // A separate near-reef search path keeps this snake out of the turtle
        // flipper and scheduled breathing event logic. Body waves come from its
        // own species model; this route provides only forward progress.
        var kp = loopPath(h.x, 0, h.z, 2.2 + d[28], 1.4 + 0.6 * d[30], o.yaw, 0.065, o.phase, o.dir, 0, 0.13), kph = o.phase;
        o.path = function (t, out) { kp(t, out); out.y = terrain.floorY(out.x, out.z) + 0.48 + 0.08 * Math.sin(t * 0.17 + kph); return out; };
        o.clear = 0.24; o.bank = 0.035;
      } else if (beh === 'wander' || beh === 'pair' || beh === 'roam') {
        a = clamp((beh === 'roam' ? 5 : 1.2) + 3 * L, 1.2, 9) * (0.7 + 0.6 * d[28]); b = a * (0.55 + 0.35 * d[30]);
        sp = clamp(0.2 + 0.45 * L, 0.15, 0.85) * (0.8 + 0.4 * d[30]);
        o.path = loopPath(h.x, h.y, h.z, a, b, o.yaw, sp / ((a + b) / 2), o.phase, o.dir, 0.3, 0.22);
      } else if (beh === 'school' && L < 0.15) {
        // Planktivores hold station over their coral head, facing into the current
        // to pick plankton from it, and drop into the coral when a diver comes close.
        a = 0.3 + 0.35 * d[28]; b = a * (0.55 + 0.3 * d[30]); sp = 0.06 + 0.05 * d[30];
        o.path = loopPath(h.x, h.y, h.z, a, b, o.yaw, sp / ((a + b) / 2), o.phase, o.dir, 0.18, 0.15);
        o.pathPeriod = TAU * ((a + b) / 2) / sp; o.bank = 0.04; o.planktivore = true;
        o.sweep = intoCurrent(h.x, h.z, o.phase);
        o.clear = Math.max(o.clear, (o.radius || 0.5) * 0.7 + 0.3);
        o.shelterClear = 0.12 + 0.3 * (o.radius || 0.5);
        partSchool(o);
      } else if (beh === 'school') {
        var small = L < 0.15; a = (small ? 1.2 : 3.5) + (small ? 1.5 : 5) * d[28]; b = a * (0.5 + 0.3 * d[30]);
        sp = (small ? 0.25 : 0.45) + 0.25 * d[30];
        o.path = loopPath(h.x, h.y, h.z, a, b, o.yaw, sp / ((a + b) / 2), o.phase, o.dir, 0.4, 0.12);
        o.pathPeriod = TAU * ((a + b) / 2) / sp; o.bank = 0.08;
        o.clear = Math.max(o.clear, (o.radius || 0.5) * 0.7 + 0.3);
        partSchool(o);
      } else if (beh === 'hover' || beh === 'cleaner') {
        var hp = loopPath(h.x, h.y, h.z, 0.25 + 0.35 * d[28], 0.2 + 0.2 * d[30], o.yaw, 0.15 + 0.15 * d[30], o.phase, o.dir, 0.12, 0.1), base = o.yaw, ph = o.phase;
        o.path = hp; o.sweep = function (t) { return base + 0.8 * Math.sin(0.17 * t + ph) + 0.3 * Math.sin(0.41 * t + ph * 2); };
        o.clear = 0.12 + 0.3 * Math.min(L, 1); o.bank = 0.025;
      } else if (beh === 'clown') {
        var an = o.anchor, mat = an ? anemoneMat(an) : null, cx = mat ? mat.x : h.x, cz = mat ? mat.z : h.z, top = mat ? mat.y : h.y - 0.14, rr = 0.16 + 0.12 * d[28], ph2 = o.phase + (o.leader ? Math.PI * 0.8 : 0);
        // When the diver comes close, the fish drop in among the tentacles (clownAct).
        var cl = o.eco = { kind: 'clown', hide: 0, x: cx, y: top, z: cz };
        o.path = function (t, out) {
          var th = ph2 + 0.9 * t, k = cl.hide, r = rr * (1 - 0.7 * k), wob = 1 - k;
          out.x = cx + r * Math.cos(th) + 0.06 * wob * Math.sin(3.1 * th); out.z = cz + r * Math.sin(th) + 0.05 * wob * Math.cos(2.3 * th);
          out.y = Math.max(top + 0.12 + 0.07 * wob * Math.sin(1.7 * th + ph2) - 0.1 * k, rockSurfaceAt(out.x, out.z) + 0.05); return out;
        };
        // The path keeps them just over the rock itself. The obstacle grid would hold
        // them well above their anemone: it is coarse on a sloping coral head, and the
        // anemone's own stamp there follows its bounding box (see anemoneTop).
        o.clear = -1.2; o.bank = 0.055; o.act = function (dt) { clownAct(o, dt); };
      } else if (beh === 'turtle') {
        a = 6 + 6 * d[28]; b = a * (0.6 + 0.25 * d[30]); var tp = loopPath(h.x, 0, h.z, a, b, o.yaw, 0.3 / ((a + b) / 2), o.phase, o.dir, 0, 0.15), tph = o.phase, br = turtleBreath(o);
        // Keep the cruise height continuous. The clearance planner below
        // anticipates tall colonies without stepping through their grid tops.
        o.eco = { kind: 'turtle', breath: br, env: { v: 0 }, cruise: function (t, out) { tp(t, out); var th = tph + 0.3 / ((a + b) / 2) * t; out.y = terrain.floorY(out.x, out.z) + 0.65 + 2.2 * (0.5 + 0.5 * Math.sin(1.5 * th + tph)); return out; } };
        // Now and then the turtle climbs to the surface to breathe (turtleBreath).
        o.path = function (t, out) { o.eco.cruise(t, out); out.y += (br.y - out.y) * breathAt(o, br, t, null); return out; };
        o.clear = 0.35; o.ceiling = Math.max(o.ceiling, br.y + 0.05); o.act = function () { turtleAct(o); };
      } else if (beh === 'manta') {
        // A wide loop over the reef, then slow circles over the cleaning station.
        var mst = o.eco && o.eco.station, C = mst ? mst.top : { x: o.anchor.x, y: o.anchor.top, z: o.anchor.z }, mph = o.phase, mrot = o.yaw, mw = 0.1, mdir = o.dir;
        var reachM = clamp((26 - Math.max(Math.abs(C.x), Math.abs(C.z))) / 8.5, 0.3, 1), cleanY = Math.min(C.y + 1.35, -1.45);
        o.path = function (t, out) {
          var th = mph + mdir * mw * t, v = mst ? mantaVisitW(o, t) : 0, u = th - mrot, rc = 8.5 * 6.5 / Math.hypot(6.5 * Math.cos(u), 8.5 * Math.sin(u)) * reachM, r = rc + (2.3 - rc) * v;
          var yc = Math.min(C.y + 2.4 + 0.7 * Math.sin(2 * th), -1.6);
          out.x = C.x + r * Math.cos(th); out.z = C.z + r * Math.sin(th); out.y = yc + (cleanY - yc) * v; return out;
        };
        o.clear = 1.2; o.bank = 0.35;
      } else if (beh === 'cruise') {
        var sx = 18 + 3 * d[28], sz = 4.5 + 1.5 * d[30], sph = o.phase, sw = 0.85 / ((sx + sz) / 2), sdir = o.dir;
        o.path = function (t, out) { var th = sph + sdir * sw * t; out.x = sx * Math.cos(th); out.z = 21 + sz * Math.sin(th); out.y = terrain.floorY(out.x, out.z) + 1.4 + 0.5 * Math.sin(3 * th); return out; };
        o.clear = 0.8; o.bank = 0.2;
      } else o.path = null;
    }
    // ---- Living reef interactions ---------------------------------------------------
    // Cleaning stations, grazing parrotfish, breathing turtles, a crown-of-thorns
    // feeding scar and anemonefish taking cover. Schedules are hashed per cycle and
    // every swimmer's position is a closed-form function of worldTime, so any split
    // of the frame times gives the same visits, bites and breaths; only the
    // clownfish's retreat follows the diver and keeps a little state.
    // Declared without values: a plain mount runs its whole build before this line
    // is reached, so ecoPlan() fills them on first use.
    var eco, ecoP, ecoQ, ecoR, ecoS, ecoW, ecoV, ecoRight, ecoUp, ecoHead;
    function eh(a, b, c) { return hash2(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul((c | 0) + 7, 83492791), seed ^ 0x2545F491); }
    function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
    function ease5(x) { x = clamp(x, 0, 1); return x * x * x * (x * (6 * x - 15) + 10); }
    function countOf(id) { for (var i = 0; i < site.population.length; i++) if (site.population[i].id === id) return site.population[i].count; return 0; }
    // The rock or coral surface itself (the obstacle grid, and the touch sensor's
    // surfaceAt built on it, are coarser and higher on a sloping coral head).
    function rockSurfaceAt(x, z) {
      var y = terrain.floorY(x, z);
      for (var q = 0; q < bommies.length; q++) {
        var b = bommies[q]; if (Math.abs(b.x - x) > b.r * 1.3 || Math.abs(b.z - z) > b.r * 1.3) continue;
        var hb = b.heightAt(x, z); if (hb > y) y = hb;
      }
      return y;
    }
    function ecoPlan() {
      if (eco) return eco;
      ecoP = { x: 0, y: 0, z: 0 }; ecoQ = { x: 0, y: 0, z: 0 }; ecoR = { x: 0, y: 0, z: 0 }; ecoS = { x: 0, y: 0, z: 0 }; ecoW = { x: 0, y: 0, z: 0 };
      ecoV = new T.Vector3(); ecoRight = new T.Vector3(); ecoUp = new T.Vector3(); ecoHead = new T.Vector3();
      eco = { stations: [], grazers: [], puffs: null, manta: null, hosts: [], cleanersPlaced: 0, cleanerFish: 0 };
      // Station 0 is on the coral head the dive opens on (spawnDiver's choice of a
      // large head), unless that head is the moray's crevice; a second pair of
      // cleaners keeps a station elsewhere, about a dozen metres away.
      var sp = terrain.spawn, first = null, best = 0, second = null, view = null, viewS = 0;
      bommies.forEach(function (b) {
        var d = Math.hypot(b.x - sp.x, b.z - sp.z);
        if (!(d > 3 && d < 17)) return;
        var s = b.r * b.h / d * (b === station ? 1.6 : 1);
        if (s > viewS) { viewS = s; view = b; }
        if (b.r >= 1.4 && b !== crevice && s > best) { best = s; first = b; }
      });
      // The heading the dive opens on (spawnDiver's choice).
      eco.openBearing = view ? bearingTo(view.x - sp.x, view.z - sp.z) : 0;
      first = first || station;
      if (countOf('cleaner_wrasse') >= 2) {
        if (station !== first && station !== crevice && Math.hypot(station.x - first.x, station.z - first.z) > 7) second = station;
        else bommies.forEach(function (b) {
          if (b.r < 1.4 || b === first || b === crevice) return;
          var d = Math.abs(Math.hypot(b.x - first.x, b.z - first.z) - 12);
          if (Math.hypot(b.x - first.x, b.z - first.z) > 7 && (!second || d < Math.abs(Math.hypot(second.x - first.x, second.z - first.z) - 12))) second = b;
        });
      }
      [first, second].forEach(function (b, i) { if (b) eco.stations.push(makeStation(b, i)); });
      // Readable for the lab's checks: where each cleaning station is.
      if (orgRoot) orgRoot.userData.cleaningStations = eco.stations.map(function (st) { return { spot: [st.spot.x, st.spot.y, st.spot.z], out: [st.out.x, st.out.z], top: [st.top.x, st.top.y, st.top.z] }; });
      return eco;
    }
    // A cleaning station sits on the upper shoulder of a prominent coral head
    // (station 0 faces the diver's start), clear of colonies so it can be seen.
    function makeStation(b, index) {
      var sp = terrain.spawn, tx = index ? 0 : sp.x, tz = index ? 0 : sp.z;
      if (Math.hypot(tx - b.x, tz - b.z) < 0.5) tx = b.x + 1;
      var a = bearingTo(tx - b.x, tz - b.z), dx = fwdX(a), dz = fwdZ(a), lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c, la = Math.atan2(lz, lx);
      var e = b.edge(la) * 0.6, w = b.toWorld(Math.cos(la) * e, Math.sin(la) * e), y = b.heightLocal(Math.cos(la) * e, Math.sin(la) * e);
      if (!(y > NONE)) y = terrain.floorY(w.x, w.z);
      block(w.x, w.z, 0.5);
      return { index: index, bommie: b, spot: { x: w.x, y: y, z: w.z }, out: { x: dx, z: dz }, bearing: a, top: { x: b.x, y: b.top, z: b.z },
        clients: [], cleaners: [], shrimp: 0, n: -1, P: 64, t0: 13 + 7 * eh(index, 12, 3) + 9 * index };
    }
    function freeze(st) { if (st.n < 0) { st.n = st.clients.length; st.P = Math.max(64, 24 * st.n); } }
    // Visit j of cycle c at a station: most cycles each client comes once, in its
    // own slot, so two clients never pose together; some cycles it stays away.
    function visitOf(st, j, c) {
      if (c < 0 || j >= st.n) return null;
      var salt = st.index * 97, o = st.clients[j], S = st.P / st.n;
      if (!(c === 0 && j === 0) && eh(salt + 5, j, c) < 0.3) return null;
      var hs = st.t0 + c * st.P + j * S + Math.max(0, S - 18) * eh(salt + 6, j, c), A = o.eco.approach;
      return { o: o, st: st, j: j, c: c, hs: hs, hd: 9 + 6 * eh(salt + 7, j, c), W: eh(salt + 8, j, c) < 0.45 ? 0 : 1 + 3.5 * eh(salt + 9, j, c), A: A, D: A * 0.9, pose: Math.floor(eh(salt + 10, j, c) * 3) };
    }
    function clientVisit(o, t) {
      var e = o.eco, st = e && e.station; if (!st) return null;
      freeze(st); if (e.slot >= st.n) return null;
      var S = st.P / st.n, c0 = Math.floor((t - st.t0 - e.slot * S) / st.P);
      for (var c = c0 - 1; c <= c0 + 1; c++) { var v = visitOf(st, e.slot, c); if (v && t >= v.hs - v.W - v.A && t <= v.hs + v.hd + v.D) return v; }
      return null;
    }
    // The visit currently posing (or just arriving) at a station, if any.
    function stationVisit(st, t, lead, tail) {
      freeze(st);
      for (var j = 0; j < st.n; j++) {
        var S = st.P / st.n, c0 = Math.floor((t - st.t0 - j * S) / st.P);
        for (var c = c0 - 1; c <= c0 + 1; c++) { var v = visitOf(st, j, c); if (v && t >= v.hs - lead && t <= v.hs + v.hd + tail) return v; }
      }
      return null;
    }
    // Hover and waiting points beside a station for a client of length L.
    // Both clear the coarse obstacle grid, so poseMobile never lifts a posing client
    // off the point the cleaner works around.
    function clientSpots(o, st) {
      var L = o.eco.L, d = 0.55 + 0.55 * L, x = st.spot.x + st.out.x * d, z = st.spot.z + st.out.z * d, side = eh(st.index, o.serial, 21) < 0.5 ? 1 : -1;
      o.eco.H = { x: x, y: Math.max(st.spot.y + 0.12, rockSurfaceAt(x, z) + 0.28 + 0.3 * L, groundTop(x, z) + o.clear + 0.06), z: z };
      var wa = st.bearing + side * 0.75, wx = st.spot.x + fwdX(wa) * (d + 1.1), wz = st.spot.z + fwdZ(wa) * (d + 1.1);
      o.eco.Q = { x: wx, y: Math.max(o.eco.H.y + 0.3, rockSurfaceAt(wx, wz) + 0.4 + 0.3 * L, groundTop(wx, wz) + o.clear + 0.1), z: wz };
      // Posing side-on along the coral head: one flank faces the reef, one the open water.
      o.eco.bh = wrapAngle(st.bearing + side * Math.PI / 2);
    }
    // Moves a client from its own route (base) to the station and back.
    function visitBlend(o, v, t, base, out) {
      var e = o.eco, H = e.H, Q = v.W > 0.5 ? e.Q : H, t1 = v.hs - v.W, he = v.hs + v.hd, w = 1, g, tx, ty, tz;
      if (t < t1) { w = ease((t - (t1 - v.A)) / v.A); tx = Q.x; ty = Q.y; tz = Q.z; }
      else if (t < v.hs) { g = ease((t - (v.hs - Math.min(1.2, v.W))) / Math.min(1.2, v.W)); tx = lerp(Q.x, H.x, g); ty = lerp(Q.y, H.y, g) + 0.03 * Math.sin(0.9 * t); tz = lerp(Q.z, H.z, g); }
      else { tx = H.x + 0.025 * Math.sin(0.5 * t + o.phase); ty = H.y + 0.02 * Math.sin(0.7 * t); tz = H.z + 0.025 * Math.cos(0.43 * t); if (t > he) w = 1 - ease((t - he) / v.D); }
      out.x = lerp(base.x, tx, w); out.y = lerp(base.y, ty, w); out.z = lerp(base.z, tz, w);
      return w;
    }
    // Head-up, head-down or tilted on its side, fins spread: the client's pose.
    function posing(v, t) { return v ? ease((t - v.hs) / 1.2) * (1 - ease((t - (v.hs + v.hd - 1)) / 1)) : 0; }

    // Bearing for clients and grazers: along their motion when they swim, else held.
    // Small shifts (a lunge back from a bite, a sidestep to the next bite mark) never
    // turn the fish; a fish does not swim backwards. On the way to or from a station
    // the swim itself sets the heading.
    function forageFace(o, t) {
      var p = ecoP, q = ecoQ; o.path(t, p); o.path(t + 0.4, q);
      var dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), hold = o.eco.hold(t);
      if (d < 1e-6) return hold;
      var mv = bearingTo(dx, dz), v = o.eco.station ? clientVisit(o, t) : null, k;
      if (v && (t < v.hs - v.W || t > v.hs + v.hd)) k = smooth(0.005, 0.03, d);
      else k = smooth(0.05, 0.14, d) * Math.max(smooth(-0.2, 0.35, Math.cos(mv - hold)), travelTurn(o, t));
      return hold + wrapAngle(mv - hold) * k;
    }

    // ---- Grazers and clients notice the diver on their journeys ----------------------
    // A parrotfish crossing to its next patch, a bumphead group on the move and a
    // grouper between visits keep their flight distance from the diver (the same
    // distance as other fish, flightSize, shrinking for a calm diver): they veer away,
    // or hang back while the diver is in their way, and the window below brings them
    // back onto their own route before they arrive. While a grazer bites and while a
    // client comes in to pose, waits and is cleaned the window is zero, so the bite
    // marks, the sediment puffs and the cleaner's work over the client follow H2's
    // schedules exactly. The state steps in fixed 1/60 s steps of world time (as the
    // flight state does), the first time the route is read in a frame.
    var travelTmp;
    function travelFleeWrap(o) {
      var raw = o.path, f = o.travel = { base: flightSize(o), tick: null, x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, r: 0, h: 0 };
      o.pathRaw = raw;
      o.path = function (t, out) { raw(t, out); return travelFlee(o, f, t, out); };
    }
    // 1 while the fish is free to change its way, easing to 0 at both ends of a
    // journey (a grazer) and through a station visit (any client).
    function travelWindow(o, t) {
      var e = o.eco, w = 1, v;
      if (e.kind === 'graze') {
        var sa = segAt(e, t), s = sa.seg;
        if (s.kind !== 'travel') return 0;
        w = smooth(0, Math.min(0.8, s.dur * 0.2), sa.u) * smooth(0, Math.min(2.5, s.dur * 0.4), s.dur - sa.u);
      }
      if (e.station && w > 0 && (v = clientVisit(o, t))) w *= 1 - visitWeight(v, t);
      return w;
    }
    function travelFlee(o, f, t, out) {
      var k = Math.floor(worldTime * 60 + 1e-6);
      if (f.tick === null) f.tick = k;
      else if (k > f.tick) { for (var j = Math.max(f.tick + 1, k - 29); j <= k; j++) travelTick(o, f, j / 60); f.tick = k; }
      var w = travelWindow(o, t);
      if (!(w > 0)) return out;
      var off = fleeOffset(f, t, travelScratch().a);
      out.x = clamp(out.x + off.x * w, -27, 27); out.z = clamp(out.z + off.z * w, -27, 27);
      return out;
    }
    function travelScratch() { return travelTmp || (travelTmp = { p: { x: 0, y: 0, z: 0 }, a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 0 } }); }
    // One fixed step, like fleeTick but level: a grazer keeps low over the reef.
    function travelTick(o, f, t) {
      var p = o.pathRaw(t, travelScratch().p), w = travelWindow(o, t), give = o.school ? o.radius * 0.5 : 0, F = flightDistance(f.base, o.uid === focusedUid, f.h);
      var home = Math.max(0, Math.hypot(p.x - diverPos.x, p.y - diverPos.y, p.z - diverPos.z) - give);
      // Measured from where the fish is drawn now (its offset times the window).
      var dx = p.x + f.x * w - diverPos.x, dy = p.y - diverPos.y, dz = p.z + f.z * w - diverPos.z, dh = Math.hypot(dx, dz), dist = Math.max(0, Math.hypot(dh, dy) - give);
      if (dist < F) {
        var want = (F - dist) * 0.95;
        if (dh < 0.05) { dx = Math.cos(bearing); dz = Math.sin(bearing); dh = 1; }
        f.tx = f.x + dx / dh * want; f.tz = f.z + dz / dh * want; f.ty = 0;
        var m = Math.hypot(f.tx, f.tz), cap = Math.min(1.6 * F, o.school ? 3 : 2), g0 = groundTop(p.x, p.z);
        if (m > cap) { f.tx *= cap / m; f.tz *= cap / m; }
        // Around the coral, not over it: climbing a colony would leave the fish too high
        // when it reaches its next bite.
        for (var q = 0; q < 4 && groundTop(p.x + f.tx, p.z + f.tz) > g0 + 0.25; q++) { f.tx *= 0.6; f.tz *= 0.6; }
      } else if (home >= F) { f.tx = 0; f.ty = 0; f.tz = 0; }
      else { f.tx = f.x; f.ty = 0; f.tz = f.z; }
      var cur = f.x * f.x + f.z * f.z, goal = f.tx * f.tx + f.tz * f.tz;
      f.r = goal > cur ? (reducedMotion ? 2 : 2.6) : (reducedMotion ? 0.4 : 0.5);
      var a = 1 - Math.exp(-f.r / 60);
      f.x += (f.tx - f.x) * a; f.z += (f.tz - f.z) * a;
      f.h = calmHabituate(f.h, dist + give, calmAlert(f, dist), false);
    }
    // While it veers or hangs back, the fish turns with its swim (it never swims backwards).
    function travelTurn(o, t) {
      var f = o.travel; if (!f || f.tick === null) return 0;
      var w0 = travelWindow(o, t), w1 = travelWindow(o, t + 0.3); if (!(w0 > 0 || w1 > 0)) return 0;
      var a = fleeOffset(f, t, travelScratch().a), b = fleeOffset(f, t + 0.3, travelScratch().b);
      return smooth(0.05, 0.3, Math.hypot(b.x * w1 - a.x * w0, b.z * w1 - a.z * w0) / 0.3);
    }
    function pathPitch(o, t) {
      var p = ecoP, q = ecoQ; o.path(t, p); o.path(t + 0.4, q);
      var d = Math.hypot(q.x - p.x, q.z - p.z);
      return clamp(Math.atan2(q.y - p.y, Math.max(d, 0.05)), -0.38, 0.38) * smooth(0.01, 0.05, d + Math.abs(q.y - p.y));
    }
    // Adds a closed-form pitch and roll to the pose poseMobile just set.
    function lean(o, pitch, roll) {
      var root = o.root; if (!root) return;
      root.rotation.z += pitch; root.rotation.x += roll;
      root.updateMatrix(); o.center.copy(o.centerLocal).applyMatrix4(root.matrix);
    }

    // ---- Clients: peacock groupers hover near a station's coral head between visits.
    function setupClient(o) {
      var plan = ecoPlan(), st = plan.stations[o.index % plan.stations.length], d = o.draws, b = st.bommie;
      var a = st.bearing + (o.index % 2 ? -1 : 1) * (1.5 + 0.6 * d[28]), e2 = b.r * 1.2 + 0.3, hx = clamp(b.x + fwdX(a) * e2, -26, 26), hz = clamp(b.z + fwdZ(a) * e2, -26, 26);
      var hy = rockSurfaceAt(hx, hz) + 0.35 + 0.35 * d[29], base = loopPath(hx, hy, hz, 0.3 + 0.35 * d[28], 0.2 + 0.2 * d[30], o.yaw, 0.12 + 0.12 * d[30], o.phase, o.dir, 0.1, 0.1), face = bearingTo(st.top.x - hx, st.top.z - hz) + Math.PI, ph = o.phase;
      o.home.set(hx, hy, hz);
      o.eco = { kind: 'client', station: st, slot: st.clients.length, L: o.info.lengthM * o.scale, approach: clamp(Math.hypot(hx - st.spot.x, hz - st.spot.z) / 0.3, 5, 14) };
      o.clear = 0.16 + 0.2 * Math.min(o.info.lengthM, 1); o.bank = 0.03;
      st.clients.push(o); clientSpots(o, st);
      o.eco.hold = function (t) { var v = clientVisit(o, t); return v && t >= v.hs - v.W ? o.eco.bh : face + 0.7 * Math.sin(0.15 * t + ph) + 0.25 * Math.sin(0.37 * t + ph * 2); };
      o.path = function (t, out) { base(t, ecoR); var v = clientVisit(o, t); if (v) visitBlend(o, v, t, ecoR, out); else { out.x = ecoR.x; out.y = ecoR.y; out.z = ecoR.z; } return out; };
      travelFleeWrap(o);
      o.sweep = function (t) { return forageFace(o, t); };
      o.act = function () { clientAct(o); };
    }
    function clientAct(o) {
      var t = worldTime, v = clientVisit(o, t), k = posing(v, t), pose = v ? POSES[v.pose] : POSES[0];
      o.motion.spread = k;
      lean(o, pathPitch(o, t) * (1 - k) + pose[0] * k, pose[1] * k);
    }

    // ---- Grazers: parrotfish swim from one patch of dead coral or rock to the
    // next and take short head-down bites; bumpheads graze as a group. Every bite
    // leaves a small puff of sediment that drifts and settles.
    function grazeCentre(o, plan) {
      var st0 = plan.stations[0], st1 = plan.stations[1] || null, sp = terrain.spawn, k = o.index;
      if (o.school) {
        // A wide, fairly level stretch of the reef slope a little way from the start.
        var best = null, bestS = -Infinity;
        for (var i = 0; i < 24; i++) for (var r = 8; r <= 15; r += 3.5) {
          var a = i / 24 * TAU, x = sp.x + Math.sin(a) * r, z = sp.z - Math.cos(a) * r;
          if (Math.abs(x) > 22 || Math.abs(z) > 22) continue;
          var y0 = groundTop(x, z), lo = y0, hi = y0;
          for (var q = 0; q < 8; q++) { var g = groundTop(x + Math.cos(q * 0.785) * 2, z + Math.sin(q * 0.785) * 2); lo = Math.min(lo, g); hi = Math.max(hi, g); }
          var s = -(hi - lo) - 2 * terrain.sandMask(x, z) - 4 * Math.max(0, hi - (o.ceiling - o.clear - 0.9)) + 0.3 * eh(31, i, Math.round(r));
          if (s > bestS) { bestS = s; best = { x: x, z: z }; }
        }
        return best || { x: o.home.x, z: o.home.z };
      }
      // The first parrotfish feeds between the opening coral head and the start, the
      // second near the other station; the rest keep the homes the reef gave them.
      if (k === 0 && st0) return { x: (st0.spot.x + st0.out.x * 3.5 + sp.x) / 2, z: (st0.spot.z + st0.out.z * 3.5 + sp.z) / 2 };
      if (k === 1 && st0) { var s1 = st1 || st0, a1 = s1.bearing + (st1 ? 0 : 2.1); return { x: s1.spot.x + fwdX(a1) * 3.5, z: s1.spot.z + fwdZ(a1) * 3.5 }; }
      return { x: o.home.x, z: o.home.z };
    }
    function grazeSpots(o, c, L, school) {
      // On a coral-rich reef bare rock is scarce: look further out until there is enough.
      for (var R = school ? 6 : 4.5, out = []; out.length < 3 && R <= 12; R += 3) out = grazeSpotsWithin(o, c, school, R);
      return out;
    }
    function grazeSpotsWithin(o, c, school, R) {
      var F = cover(), list = [], want = school ? 4 : 5, gap = school ? 3.2 : 1.5, q;
      var fi = Math.floor((c.x - PATCH_LO) / PATCH), fj = Math.floor((c.z - PATCH_LO) / PATCH), span = Math.ceil(R / PATCH) + 1;
      for (var dj = -span; dj <= span; dj++) for (var di = -span; di <= span; di++) {
        var i = fi + di, j = fj + dj; if (i < 0 || j < 0 || i >= F.n || j >= F.n) continue;
        var k = j * F.n + i, st = F.state[k], x = F.cx[k], z = F.cz[k], dd = Math.hypot(x - c.x, z - c.z);
        if (dd > R || Math.abs(x) > 25.5 || Math.abs(z) > 25.5) continue;
        if (!(st === ROCK || st === FRESH || st === RUBBLE || school && (st === LIVE || st === BLEACHED))) continue;
        var y = rockSurfaceAt(x, z), sx = rockSurfaceAt(x + 0.25, z) - rockSurfaceAt(x - 0.25, z), sz = rockSurfaceAt(x, z + 0.25) - rockSurfaceAt(x, z - 0.25);
        if (-y < 2.5 || Math.abs(sx) > 0.25 || Math.abs(sz) > 0.25 || obstacleTop(x, z) > y + 0.15 || isBlocked(x, z)) continue;
        if (school) {
          var hi = y; for (q = 0; q < 6; q++) hi = Math.max(hi, groundTop(x + Math.cos(q * 1.05) * 1.6, z + Math.sin(q * 1.05) * 1.6));
          if (hi - y > 0.45 || hi + 0.9 + o.clear > o.ceiling) continue;
        }
        // Prefer open dead rock: colonies planted on neighbouring coral patches would
        // otherwise overhang the bite marks (the decor is placed after the animals).
        var coralN = 0, ring = school ? 2 : 1, cells = 0;
        for (var nj = -ring; nj <= ring; nj++) for (var ni = -ring; ni <= ring; ni++) { var ii = i + ni, jj = j + nj; if (ii >= 0 && jj >= 0 && ii < F.n && jj < F.n && (ni || nj)) { cells++; var sn = F.state[jj * F.n + ii]; if (sn === LIVE || sn === BLEACHED || sn === FRESH) coralN++; } }
        list.push({ x: x, y: y, z: z, s: 0.6 * eh(41 + o.serial, k, 2) + 0.5 * dd / R + 1.8 * coralN / cells });
      }
      list.sort(function (a, b) { return a.s - b.s; });
      var out = [];
      for (q = 0; q < list.length && out.length < want; q++) {
        var ok = true; for (var m = 0; m < out.length; m++) if (Math.hypot(out[m].x - list[q].x, out[m].z - list[q].z) < gap) ok = false;
        if (ok) out.push(list[q]);
      }
      var mx = 0, mz = 0; out.forEach(function (s) { mx += s.x / out.length; mz += s.z / out.length; });
      out.sort(function (a, b) { return Math.atan2(a.z - mz, a.x - mx) - Math.atan2(b.z - mz, b.x - mx); });
      return out;
    }
    function setupGraze(o) {
      var plan = ecoPlan(), school = !!o.school, L = o.info.lengthM * (school ? 1 : o.scale);
      // A grazing group settles low over the reef; its members dip their heads to the rock.
      var clear0 = o.clear, bank0 = o.bank;
      if (school) { o.clear = 0.26; o.bank = 0.06; } else { o.clear = 0.1; o.bank = 0.05; }
      var spots = grazeSpots(o, grazeCentre(o, plan), L, school);
      if (spots.length < 2) { o.clear = clear0; o.bank = bank0; return false; }
      // The first parrotfish's round begins at its patch nearest the start and most
      // in front of the opening view: the dive opens on it biting the rock.
      var opening = !school && o.index === 0;
      if (opening) {
        var sp0 = terrain.spawn, near = 0, nearS = Infinity;
        spots.forEach(function (sp, i) { var s0 = Math.hypot(sp.x - sp0.x, sp.z - sp0.z) + 3 * (1 - Math.cos(bearingTo(sp.x - sp0.x, sp.z - sp0.z) - plan.openBearing)); if (s0 < nearS) { nearS = s0; near = i; } });
        spots = spots.slice(near).concat(spots.slice(0, near));
      }
      // Keep each patch bare so the bites land on rock, not on a colony planted later.
      spots.forEach(function (sp) { block(sp.x, sp.z, school ? 1.7 : 1.05); });
      var segs = [], t = 0, fm = 0.47 * L, phi = -0.68, n = spots.length, speed = school ? 0.32 : 0.38, prevH = bearingTo(spots[0].x - spots[n - 1].x, spots[0].z - spots[n - 1].z);
      for (var k = 0; k < n; k++) {
        var a = spots[(k + n - 1) % n], b = spots[k], h = bearingTo(b.x - a.x, b.z - a.z), chord = Math.hypot(b.x - a.x, b.z - a.z);
        var tt = 1.2 + chord / speed, nb = 3 + Math.floor(4 * eh(51 + o.serial, k, 1)), bi = 1.5 + 0.4 * eh(52 + o.serial, k, 1);
        var feed = school ? 11 + 6 * eh(53 + o.serial, k, 1) : 0.9 + nb * bi + 0.9;
        segs.push({ kind: 'travel', t0: t, dur: tt, h0: prevH, h1: h, arc: (school ? 0.8 : 0.35) + 0.3 * eh(54 + o.serial, k, 1), a: a, b: b }); t += tt;
        var bites = [];
        if (!school) for (var i = 0; i < nb; i++) {
          var ja = eh(55 + o.serial, k, i) * TAU, jr = 0.07 * eh(56 + o.serial, k, i), bx = b.x + Math.cos(ja) * jr, bz = b.z + Math.sin(ja) * jr;
          bites.push({ t: t + 0.9 + i * bi + 0.22, x: bx, y: rockSurfaceAt(bx, bz), z: bz, n: i });
        }
        segs.push({ kind: 'feed', t0: t, dur: feed, h: h, spot: b, bites: bites, bi: bi }); t += feed;
        prevH = h;
      }
      var e = o.eco = { kind: 'graze', segs: segs, period: t, fm: fm, phi: phi, L: L, school: school, station: null, slot: -1, approach: 0, lift: school ? 0.3 : 0 };
      // Start mid-way along the first journey, so the fish is swimming when the dive
      // opens; the opening fish is already at its first patch.
      e.offset = opening ? segs[1].t0 + 0.4 : segs[0].dur * (0.25 + 0.2 * eh(57, o.serial, 1));
      if (!school && o.index < 2 && plan.stations.length) {
        var st = plan.stations[o.index % plan.stations.length];
        e.station = st; e.slot = st.clients.length; st.clients.push(o); clientSpots(o, st);
        var far = 0; spots.forEach(function (s) { far = Math.max(far, Math.hypot(s.x - st.spot.x, s.z - st.spot.z)); });
        e.approach = clamp(far / 0.4, 6, 18);
      }
      o.home.set(spots[0].x, spots[0].y + 0.5, spots[0].z);
      e.hold = function (t) { var v = e.station ? clientVisit(o, t) : null; return v && t >= v.hs - v.W ? e.bh : grazeHeading(o, t); };
      o.path = function (t, out) {
        grazePoint(o, t, ecoR); var v = e.station ? clientVisit(o, t) : null;
        if (v) visitBlend(o, v, t, ecoR, out); else { out.x = ecoR.x; out.y = ecoR.y; out.z = ecoR.z; }
        return out;
      };
      travelFleeWrap(o);
      o.pathPeriod = e.period;
      o.sweep = function (t) { return forageFace(o, t); };
      o.act = function () { grazeAct(o); };
      plan.grazers.push(o); puffPool();
      return true;
    }
    function segAt(e, t) {
      var u = ((t + e.offset) % e.period + e.period) % e.period, s = e.segs, lo = 0, hi = s.length - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (s[mid].t0 <= u) lo = mid; else hi = mid - 1; }
      return { seg: s[lo], u: u - s[lo].t0, base: t - u };
    }
    // Feeding envelope 0..1 (head down) and the mouth's height above the bite.
    function feedEnv(e, sa) {
      if (sa.seg.kind !== 'feed') return 0;
      return e.school ? ease(sa.u / 1.5) * (1 - ease((sa.u - sa.seg.dur + 1.5) / 1.5)) : ease(sa.u / 0.9) * (1 - ease((sa.u - sa.seg.dur + 0.9) / 0.9));
    }
    function grazeHeading(o, t) {
      var e = o.eco, sa = segAt(e, t), s = sa.seg;
      if (s.kind === 'feed') return s.h;
      var f = ease(sa.u / s.dur); return s.h0 + wrapAngle(s.h1 - s.h0) * f;
    }
    // Where the mouth is during a bite cycle: settle, lunge to the rock, scrape, lift.
    function biteDip(seg, u) {
      var dip = 0;
      for (var i = 0; i < seg.bites.length; i++) {
        var c = seg.bites[i].t - seg.t0, x = u - (c - 0.22);
        if (x > -0.01 && x < 0.75) dip = Math.max(dip, x < 0.22 ? ease(x / 0.22) : x < 0.34 ? 1 : 1 - ease((x - 0.34) / 0.38));
      }
      return dip;
    }
    // Body height over the rock between bites and while travelling.
    function restLift(e) { return e.school ? e.lift + 0.6 : 0.37; }
    function grazePoint(o, t, out) {
      var e = o.eco, sa = segAt(e, t), s = sa.seg, u = sa.u, ax, az, bx, bz;
      if (s.kind === 'travel') {
        // A Hermite curve leaves along the last heading and arrives along the new
        // one; easing the progress lets the fish stop at each patch.
        var f = ease(u / s.dur), a = s.a, b = s.b, ch = Math.hypot(b.x - a.x, b.z - a.z) * 0.9, back = e.school ? -0.8 : e.fm;
        var h00 = 2 * f * f * f - 3 * f * f + 1, h10 = f * f * f - 2 * f * f + f, h01 = -2 * f * f * f + 3 * f * f, h11 = f * f * f - f * f;
        ax = a.x - fwdX(s.h0) * back; az = a.z - fwdZ(s.h0) * back; bx = b.x - fwdX(s.h1) * Math.abs(back); bz = b.z - fwdZ(s.h1) * Math.abs(back);
        out.x = h00 * ax + h10 * fwdX(s.h0) * ch + h01 * bx + h11 * fwdX(s.h1) * ch;
        out.z = h00 * az + h10 * fwdZ(s.h0) * ch + h01 * bz + h11 * fwdZ(s.h1) * ch;
        out.y = lerp(a.y, b.y, f) + restLift(e) + s.arc * Math.sin(Math.PI * f);
        return out;
      }
      var env = feedEnv(e, sa), sp = s.spot;
      if (e.school) {
        // The group drifts slowly across the patch while it feeds.
        var g = ease(u / s.dur) - 0.5; out.x = sp.x + fwdX(s.h) * 1.6 * g; out.z = sp.z + fwdZ(s.h) * 1.6 * g; out.y = sp.y + e.lift + 0.6 * (1 - env);
        return out;
      }
      // The mouth moves from one bite mark to the next between bites; the body
      // hangs head down behind it.
      var bites = s.bites, i = 0, tx, ty, tz;
      while (i < bites.length - 1 && bites[i + 1].t - s.t0 <= u) i++;
      if (i < bites.length - 1 && u > bites[i].t - s.t0) {
        var c = bites[i].t - s.t0, m = ease((u - c - 0.55) / (s.bi - 0.8));
        tx = lerp(bites[i].x, bites[i + 1].x, m); ty = lerp(bites[i].y, bites[i + 1].y, m); tz = lerp(bites[i].z, bites[i + 1].z, m);
      } else { tx = bites[i].x; ty = bites[i].y; tz = bites[i].z; }
      var dip = biteDip(s, u) * (reducedMotion ? 0.5 : 1), lift = 0.32 * (1 - env) + 0.05 * (1 - dip), pitch = e.phi * env;
      var mx = lerp(sp.x, tx, env), mz = lerp(sp.z, tz, env), my = lerp(sp.y, ty, env) + lift;
      out.x = mx - fwdX(s.h) * e.fm * Math.cos(pitch) + fwdX(s.h) * 0.03 * dip;
      out.z = mz - fwdZ(s.h) * e.fm * Math.cos(pitch) + fwdZ(s.h) * 0.03 * dip;
      out.y = Math.max(my - e.fm * Math.sin(pitch), rockSurfaceAt(out.x, out.z) + 0.14);
      return out;
    }
    function grazeAct(o) {
      var e = o.eco, t = worldTime, sa = segAt(e, t), env = feedEnv(e, sa), v = e.station ? clientVisit(o, t) : null, w = v ? visitWeight(v, t) : 0, k = posing(v, t);
      env *= 1 - w;
      if (e.school) { o.motion.graze = env; lean(o, pathPitch(o, t) * (1 - env), 0); return; }
      var dip = sa.seg.kind === 'feed' ? biteDip(sa.seg, sa.u) * (reducedMotion ? 0.5 : 1) * (1 - w) : 0, pose = v ? POSES[v.pose] : POSES[0];
      // While it feeds the fish keeps itself off the rock (grazePoint): the coarse
      // obstacle grid next to a coral head would hold its mouth off the bite mark.
      o.clear = env > 0.05 ? -0.5 : 0.1;
      o.motion.spread = k;
      lean(o, pathPitch(o, t) * (1 - env) * (1 - k) + (e.phi * env - 0.12 * dip) + pose[0] * k, pose[1] * k);
    }
    function visitWeight(v, t) { var t1 = v.hs - v.W, he = v.hs + v.hd; return t < t1 ? ease((t - (t1 - v.A)) / v.A) : t <= he ? 1 : 1 - ease((t - he) / v.D); }
    // Every bite that happened in (t - life, t]: closed-form, so puffs never drift
    // with the frame rate. A bite taken while the fish is away being cleaned is skipped.
    function grazerBites(o, t, life, list) {
      var e = o.eco, from = t - life, k0 = Math.floor((from + e.offset) / e.period), k1 = Math.floor((t + e.offset) / e.period);
      for (var k = k0; k <= k1; k++) {
        var base = k * e.period - e.offset;
        e.segs.forEach(function (s) {
          if (s.kind !== 'feed') return;
          if (e.school) { schoolBites(o, s, base, from, t, list); return; }
          s.bites.forEach(function (b) {
            var tb = base + b.t;
            if (tb <= from || tb > t || tb < 0) return;
            if (reducedMotion && b.n % 2) return;
            if (e.station && clientVisit(o, tb)) return;
            list.push({ x: b.x, y: b.y, z: b.z, t: tb, r: 0.055 + 0.02 * (b.n % 3) / 2, key: o.serial * 1000 + k * 50 + b.n });
          });
        });
      }
    }
    // A grazing group's bites follow the schedule its model publishes (model.graze):
    // member i bites when fract(t / period + i * stagger) reaches contact.
    function schoolBites(o, s, base, from, t, list) {
      var g = o.model && o.model.graze, n = g ? g.members.length : 8, period = g ? g.period : 6, stagger = g ? g.stagger : 0.618034, contact = g ? g.contact : 0.15;
      var close = 1 - (g ? g.squeeze || 0 : 0.3), mouth = g ? g.mouth : 0.43, t0 = Math.max(from, base + s.t0 + 1.5), t1 = Math.min(t, base + s.t0 + s.dur - 1.5);
      if (t1 <= t0) return;
      for (var i = 0; i < n; i++) {
        var m = g ? g.members[i] : { x: Math.cos(i * 2.4) * 0.8, z: Math.sin(i * 2.4) * 0.8 }, lx = m.x * close + mouth, lz = m.z * close;
        // Members at the edge of the group bite the living coral around the clearing;
        // only bites on the open rock in the middle raise a visible puff.
        if (reducedMotion && i % 2 || Math.hypot(lx, lz) > 1.35) continue;
        var ph = (contact - i * stagger) % 1, tb = (Math.ceil(t0 / period - ph) + ph) * period;
        for (; tb <= t1; tb += period) {
          if (tb <= t0) continue;
          var hb = grazeHeading(o, tb), c = Math.cos(yawFor(hb)), sn = Math.sin(yawFor(hb));
          grazePoint(o, tb, ecoS);
          var x = ecoS.x + lx * c + lz * sn, z = ecoS.z - lx * sn + lz * c;
          list.push({ x: x, y: rockSurfaceAt(x, z), z: z, t: tb, r: 0.09, key: o.serial * 100000 + i * 997 + Math.round(tb * 4) });
        }
      }
    }

    // ---- Sediment puffs: discs drawn with the contact shade's program ------------
    // A second material with the same shader and cache key as the decor contact
    // shade: three links one program for both, and only the colour differs.
    function contactShade(shader) {
      var parts = shaderParts();
      shader.uniforms.reefWaterEye = U.eye;
      parts.vCommon.push('attribute float reefContactWeight;varying float vReefContact;varying vec3 vReefContactWorld;');
      parts.vBegin.push('vReefContact=reefContactWeight;'); parts.vProject.push('vReefContactWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
      parts.fCommon.push('varying float vReefContact;varying vec3 vReefContactWorld;uniform vec3 reefWaterEye;');
      parts.fColor.push('diffuseColor.a*=smoothstep(0.0,1.0,vReefContact)*(1.0-smoothstep(8.0,13.0,length(reefWaterEye-vReefContactWorld)));');
      applyParts(shader, parts, 'contact');
    }
    function puffPool() {
      var plan = ecoPlan();
      if (plan.puffs) return plan.puffs;
      var max = high ? 36 : 16, per = PUFF_RIM + 1, pos = new Float32Array(max * per * 3), wt = new Float32Array(max * per), idx = [];
      for (var k = 0; k < max; k++) for (var j = 0; j < PUFF_RIM; j++) idx.push(k * per, k * per + 1 + j, k * per + 1 + (j + 1) % PUFF_RIM);
      var g = own(new T.BufferGeometry());
      g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('reefContactWeight', new T.BufferAttribute(wt, 1).setUsage(T.DynamicDrawUsage));
      g.setIndex(idx); g.setDrawRange(0, 0); g.boundingSphere = new T.Sphere(new T.Vector3(), 200);
      var m = patch(new T.MeshBasicMaterial({ color: lin(0xc9cbb8), transparent: true, opacity: reducedMotion ? 0.42 : 0.6, depthWrite: false }), 'contact', contactShade);
      var mesh = new T.Mesh(g, m);
      mesh.name = 'reef-explore-sediment'; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.userData.decorative = true; mesh.userData.puffs = [];
      mesh.onBeforeRender = function (r, sc, cam) { U.eye.value.setFromMatrixPosition(cam.matrixWorld); drawPuffs(cam); };
      scene.add(mesh);
      plan.puffs = { mesh: mesh, max: max, bites: [] };
      return plan.puffs;
    }
    // One bite's puff at age a: kicked up off the rock, carried by the surge,
    // spreading and thinning, then settling back.
    function puffShapeAt(b, a, out) {
      var calm = reducedMotion ? 0.5 : 1, life = reducedMotion ? 4 : PUFF_LIFE;
      currentAt(b.x, b.z, b.t, ambientMotion.current);
      // Downstream with the surge, spreading a little to one side or the other.
      var cx = ambientMotion.current.x, cz = ambientMotion.current.z, side = 0.3 * Math.sin(b.key * 1.7);
      out.x = b.x + (cx - cz * side) * a * 0.8;
      out.z = b.z + (cz + cx * side) * a * 0.8;
      out.r = b.r * (0.45 + 0.85 * (1 - Math.exp(-1.6 * a))) * (0.8 + 0.2 * calm);
      out.y = b.y + 0.015 + out.r * 0.35 + Math.max(0, (0.14 * calm) * (1 - Math.exp(-3 * a)) - 0.035 * calm * a);
      out.alpha = clamp(a / 0.12, 0, 1) * (1 - smooth(life * 0.4, life, a));
      return out;
    }
    function collectPuffs() {
      var pool = puffPool(), list = pool.bites, t = worldTime, life = reducedMotion ? 4 : PUFF_LIFE;
      list.length = 0;
      eco.grazers.forEach(function (o) {
        // Puffs fade out beyond 13 m (the shade's distance fade); skip grazers far away.
        if (Math.hypot(o.home.x - camera.position.x, o.home.z - camera.position.z) > 26) return;
        grazerBites(o, t, life, list);
      });
      list.sort(function (a, b) { return b.t - a.t || a.key - b.key; });
      if (list.length > pool.max) list.length = pool.max;
      return list;
    }
    function drawPuffs(cam) {
      var pool = puffPool(), list = collectPuffs(), g = pool.mesh.geometry, pos = g.attributes.position.array, wt = g.attributes.reefContactWeight.array, per = PUFF_RIM + 1, out = pool.mesh.userData.puffs, p = {};
      ecoRight.setFromMatrixColumn(cam.matrixWorld, 0); ecoUp.setFromMatrixColumn(cam.matrixWorld, 1);
      out.length = 0;
      for (var k = 0; k < list.length; k++) {
        var b = list[k]; puffShapeAt(b, worldTime - b.t, p);
        out.push({ x: p.x, y: p.y, z: p.z, r: p.r, alpha: p.alpha, t: b.t, bx: b.x, by: b.y, bz: b.z, key: b.key, size: b.r });
        var o = k * per;
        pos[o * 3] = p.x; pos[o * 3 + 1] = p.y; pos[o * 3 + 2] = p.z; wt[o] = p.alpha;
        for (var j = 0; j < PUFF_RIM; j++) {
          var a = j / PUFF_RIM * TAU, rr = p.r * (1 + 0.12 * Math.sin(3 * a + b.key)), cx = Math.cos(a) * rr, cy = Math.sin(a) * rr, q = (o + 1 + j) * 3;
          pos[q] = p.x + ecoRight.x * cx + ecoUp.x * cy; pos[q + 1] = p.y + ecoRight.y * cx + ecoUp.y * cy; pos[q + 2] = p.z + ecoRight.z * cx + ecoUp.z * cy; wt[o + 1 + j] = 0;
        }
      }
      g.setDrawRange(0, list.length * PUFF_RIM * 3);
      g.attributes.position.needsUpdate = true; g.attributes.reefContactWeight.needsUpdate = true;
    }

    // ---- Cleaners: the wrasse dances at its station, inspects each client and
    // rises to a manta circling overhead; the shrimp waits on the rock.
    function placeCleaner(o) {
      var plan = ecoPlan(), fish = o.info.group === 'fish', k = fish ? plan.cleanerFish++ : plan.cleanersPlaced++, st = plan.stations[k % plan.stations.length], tang = st.bearing + Math.PI / 2;
      if (fish) {
        var rank = st.cleaners.length, side = rank % 2 ? -1 : 1, hx = st.spot.x + st.out.x * 0.24 + fwdX(tang) * 0.2 * side * Math.min(1, rank), hz = st.spot.z + st.out.z * 0.24 + fwdZ(tang) * 0.2 * side * Math.min(1, rank);
        o.home = new T.Vector3(hx, Math.max(st.spot.y + 0.16, rockSurfaceAt(hx, hz) + 0.1), hz); o.ground = st.spot.y;
        o.eco = { kind: 'cleaner', station: st, rank: rank, side: side };
        st.cleaners.push(o);
        return true;
      }
      // The shrimp sits on the rock of the station itself, facing the open water.
      var n = st.shrimp++, a = tang + (n % 2 ? 1 : -1) * 0.5 * Math.ceil(n / 2), b = st.bommie, sx = st.spot.x + fwdX(a) * 0.12 * Math.min(1, n), sz = st.spot.z + fwdZ(a) * 0.12 * Math.min(1, n);
      var y = b.heightAt(sx, sz); if (!(y > NONE)) y = rockSurfaceAt(sx, sz);
      o.ground = y; o.home = new T.Vector3(sx, y, sz); o.bommie = b; o.yaw = st.bearing;
      var h1 = rockSurfaceAt(sx + 0.12, sz), h0 = rockSurfaceAt(sx - 0.12, sz), h2 = rockSurfaceAt(sx, sz + 0.12), h3 = rockSurfaceAt(sx, sz - 0.12);
      o.normal = new T.Vector3(-(h1 - h0) / 0.24, 1, -(h2 - h3) / 0.24).normalize();
      sessiles.push({ x: sx, z: sz, r: 0.2 });
      return true;
    }
    function clientFrame(v, t, out, lx, ly, lz) {
      var o = v.o, e = o.eco, k = posing(v, t), pose = POSES[v.pose], pitch = pose[0] * k, roll = pose[1] * k;
      // Rotation order YZX: roll about x, then pitch about z, then the heading.
      var y1 = ly * Math.cos(roll) - lz * Math.sin(roll), z1 = ly * Math.sin(roll) + lz * Math.cos(roll);
      var x2 = lx * Math.cos(pitch) - y1 * Math.sin(pitch), y2 = lx * Math.sin(pitch) + y1 * Math.cos(pitch), b = e.bh;
      o.path(t, out);
      out.x += fwdX(b) * x2 + Math.cos(b) * z1; out.z += fwdZ(b) * x2 + Math.sin(b) * z1; out.y += y2;
      return out;
    }
    // Which inspection point the cleaner is at (or darting between) and on which flank.
    var ecoStep;
    function inspectStep(c, v, t) {
      ecoStep = ecoStep || {};
      var u = t - (v.hs - 0.3), step = 0, start = Math.floor(eh(61, v.j, v.c) * INSPECT.length), acc = 0, dwell = 1;
      // Out-facing flank first; a second cleaner works the other side.
      var e = v.o.eco, flank = Math.cos(e.bh) * v.st.out.x + Math.sin(e.bh) * v.st.out.z >= 0 ? 1 : -1;
      if (c.eco.rank % 2) flank = -flank;
      for (;;) { dwell = 0.8 + 0.7 * eh(62 + c.serial, v.c * 31 + v.j, step); if (acc + dwell + 0.28 > u || step > 60) break; acc += dwell + 0.28; step++; }
      ecoStep.a = INSPECT[(start + step) % INSPECT.length]; ecoStep.b = INSPECT[(start + step + 1) % INSPECT.length];
      ecoStep.f = ease((u - acc - dwell) / 0.28); ecoStep.step = step; ecoStep.flank = flank; ecoStep.tail = eh(63 + c.serial, v.c * 31 + v.j, step) < 0.3;
      return ecoStep;
    }
    function inspectPoint(c, v, t, out) {
      var L = v.o.eco.L, s = inspectStep(c, v, t), a = s.a, b = s.b, f = s.f, peck = reducedMotion ? 0 : 0.008 * Math.sin(t * 19) * (1 - f);
      // Just off the skin: the client's half width is about a tenth of its length.
      var lx = lerp(a[0], b[0], f) * L, ly = lerp(a[1], b[1], f) * L + peck, lz = s.flank * (lerp(a[2], b[2], f) * 0.1 * L + 0.022);
      return clientFrame(v, t, out, lx, ly, lz);
    }
    function cleanerIdle(o, t, out) {
      var h = o.home, ph = o.phase, dance = danceEnv(o, t) * (reducedMotion ? 0.4 : 1);
      out.x = h.x + 0.12 * Math.sin(0.41 * t + ph) * (1 - 0.5 * dance); out.z = h.z + 0.12 * Math.cos(0.33 * t + ph * 1.3) * (1 - 0.5 * dance);
      out.y = Math.max(h.y + 0.04 * Math.sin(0.7 * t + ph) + 0.035 * dance * Math.sin(3.4 * t), rockSurfaceAt(out.x, out.z) + 0.07);
      return out;
    }
    // The "dance": bursts of bobbing while a client approaches, and now and then on its own.
    function danceEnv(o, t) {
      var st = o.eco.station, v = stationVisit(st, t, 14, -6), d = 0;
      if (v) d = ease((t - (v.hs - v.W - 0.6 * v.A)) / 2) * (1 - ease((t - v.hs + 0.6) / 0.6));
      var w = Math.floor(t / 14), u = t - w * 14;
      if (eh(71 + o.serial, w, 1) < 0.3) d = Math.max(d, ease((u - 3) / 1.5) * (1 - ease((u - 9) / 1.5)));
      return d;
    }
    function mantaReach(st, t, out) {
      var m = eco && eco.manta; if (!m || m.eco.station !== st || !m.path) return 0;
      m.path(t, out); var d = Math.hypot(out.x - st.spot.x, out.z - st.spot.z), w = smooth(2.6, 1.3, d) * mantaVisitW(m, t);
      if (w <= 0) return 0;
      m.path(t + 0.5, ecoS); var b = bearingTo(ecoS.x - out.x, ecoS.z - out.z);
      out.x += fwdX(b) * 0.25 + Math.cos(b) * 0.45; out.z += fwdZ(b) * 0.25 + Math.sin(b) * 0.45; out.y -= 0.3;
      return w;
    }
    function cleanerAt(o, t, out) {
      var st = o.eco.station, v = stationVisit(st, t, 1.2, 0.9), wi = 0;
      cleanerIdle(o, t, out);
      if (v) {
        wi = ease((t - (v.hs - 1.0)) / 0.9) * (1 - ease((t - v.hs - v.hd) / 0.8));
        if (wi > 0) { inspectPoint(o, v, t, ecoS); out.x = lerp(out.x, ecoS.x, wi); out.y = lerp(out.y, ecoS.y, wi); out.z = lerp(out.z, ecoS.z, wi); }
      }
      var m = (1 - wi) * mantaReach(st, t, ecoV);
      if (m > 0) { out.x = lerp(out.x, ecoV.x, m); out.y = lerp(out.y, ecoV.y, m); out.z = lerp(out.z, ecoV.z, m); }
      return out;
    }
    function setupCleaner(o) {
      if (!o.eco) placeCleaner(o);
      var hold = o.eco.station.bearing;
      o.path = function (t, out) { return cleanerAt(o, t, out); };
      o.sweep = function (t) {
        var v = stationVisit(o.eco.station, t, 1.2, 0.9);
        var idle = hold + 0.6 * Math.sin(0.23 * t + o.phase);
        if (!v || t <= v.hs - 1) return idle;
        // Along the client's body, snout angled in to the skin (now and then facing its tail).
        var s = inspectStep(o, v, t), along = wrapAngle(v.o.eco.bh + (s.tail ? Math.PI - 0.35 * s.flank : 0.35 * s.flank));
        cleanerAt(o, t, ecoW); v.o.path(t, ecoQ);
        var w = ease((t - (v.hs - 1.0)) / 0.9) * (1 - ease((t - v.hs - v.hd) / 0.8)), near = smooth(0.45, 0.15, Math.hypot(ecoQ.x - ecoW.x, ecoQ.z - ecoW.z));
        var toward = bearingTo(ecoQ.x - ecoW.x, ecoQ.z - ecoW.z), aim = toward + wrapAngle(along - toward) * near;
        return idle + wrapAngle(aim - idle) * w;
      };
      // Its path keeps it just off the rock and the client; the coarse obstacle grid
      // on the coral head's shoulder would otherwise hold it well above its station.
      o.clear = -0.4; o.bank = 0.02;
      o.act = function () {
        var t = worldTime, d = danceEnv(o, t);
        // Rear up and down: the cleaner's advertising display.
        lean(o, d * (reducedMotion ? 0.1 : 0.3) * Math.sin(t * (reducedMotion ? 4 : 9.5)), 0);
      };
    }

    // ---- Manta: cruises over the reef, then circles slowly over the cleaning station.
    function placeManta(o) {
      var st = ecoPlan().stations[0];
      o.anchor = st.bommie; o.ground = st.top.y; o.home = new T.Vector3(st.top.x, st.top.y + 2.4, st.top.z);
      o.eco = { kind: 'manta', station: st, first: 16 + 10 * eh(81, o.serial, 1), period: 170 + 40 * eh(82, o.serial, 1) };
      eco.manta = o;
    }
    function mantaVisitW(o, t) {
      var e = o.eco, c0 = Math.floor((t - e.first) / e.period);
      for (var c = Math.max(0, c0 - 1); c <= c0; c++) {
        var s = e.first + c * e.period + 12 * eh(83, o.serial, c), hold = 70 + 30 * eh(84, o.serial, c), u = t - s;
        if (u >= 0 && u <= hold + 32) return ease5(u / 16) * (1 - ease5((u - 16 - hold) / 16));
      }
      return 0;
    }

    // ---- Turtles surface to breathe -------------------------------------------------
    // Active turtles in shallow water make short dives (about 1.5 minutes on average
    // in one study), so each turtle here comes up every two to three minutes: an
    // unhurried climb, a few breaths at the surface, then a long glide back down.
    function turtleBreath(o) {
      var L = o.info.lengthM * o.scale, fm = 0.48 * L;
      ecoPlan();
      return { first: 42 + 50 * eh(91, o.serial, 1), period: 150 + 40 * eh(92, o.serial, 1), hold: 5 + 3 * eh(93, o.serial, 1), y: 0.02 - fm * Math.sin(0.42) - 0.06 };
    }
    // 0..1 toward the surface; env.v is the breathing pause at the top. The climb's
    // length is set by the depth the turtle starts from, read at the breath's start.
    function breathAt(o, br, t, env) {
      var c0 = Math.floor((t - br.first) / br.period);
      for (var c = Math.max(0, c0 - 1); c <= c0; c++) {
        var s = br.first + c * br.period + 8 * eh(94, o.serial, c), u = t - s;
        if (u < 0) continue;
        var up = clamp((br.y - o.eco.cruise(s, ecoS).y) / 0.24, 16, 46), down = up * 1.2;
        if (u > up + br.hold + down) continue;
        if (env) env.v = ease((u - up + 1.5) / 1.5) * (1 - ease((u - up - br.hold) / 2));
        return u < up ? ease5(u / up) : u < up + br.hold ? 1 : 1 - ease5((u - up - br.hold) / down);
      }
      if (env) env.v = 0;
      return 0;
    }
    function turtleAct(o) {
      var t = worldTime, p = ecoP, q = ecoQ, env = o.eco.env;
      o.path(t, p); o.path(t + 0.5, q);
      var vh = Math.hypot(q.x - p.x, q.z - p.z) / 0.5, vy = (q.y - p.y) / 0.5, want = Math.atan2(vy, Math.max(vh, 0.1));
      breathAt(o, o.eco.breath, t, env);
      // poseMobile limits pitch to 0.38; a climbing or diving turtle angles more steeply,
      // and lifts its head clear of the water while it breathes.
      lean(o, clamp(want, -0.6, 0.6) - clamp(want, -0.38, 0.38) + env.v * (0.42 + (reducedMotion ? 0 : 0.04 * Math.sin(t * 2.1))), 0);
    }

    // ---- Crown-of-thorns starfish on a coral colony, beside its feeding scar --------
    // The starfish turns its stomach out over the coral and digests the tissue,
    // leaving bare white skeleton (COTS_HOST: the colonies it prefers).
    function hostMeshes(h) {
      var list = [], root = h.instanced ? h.model.root : h.root, inv = new T.Matrix4();
      root.updateMatrixWorld(true);
      if (h.instanced) inv.copy(root.matrixWorld).invert();
      root.traverse(function (m) {
        if (!m.isMesh || m.isInstancedMesh || !m.geometry || !m.geometry.attributes.position) return;
        var w = new T.Matrix4();
        if (h.instanced) w.multiplyMatrices(h.matrix, new T.Matrix4().multiplyMatrices(inv, m.matrixWorld)); else w.copy(m.matrixWorld);
        list.push({ g: m.geometry, w: w });
      });
      return list;
    }
    // The colony's upper surface as a 4 cm height grid (empty cells are NONE).
    function colonyTop(h) {
      var meshes = hostMeshes(h), cx = h.center.x, cz = h.center.z, R = Math.max(0.3, h.radius * 1.1), cell = 0.04, n = Math.ceil(2 * R / cell) + 1, top = new Float32Array(n * n), p = new T.Vector3(), lo = Infinity;
      for (var q = 0; q < top.length; q++) top[q] = NONE;
      function stamp(i, j, y) { if (i >= 0 && j >= 0 && i < n && j < n && y > top[j * n + i]) top[j * n + i] = y; }
      // Every triangle is rasterised into the grid (seen from above), so a coarse
      // mesh with large faces gives the same surface as a fine one.
      meshes.forEach(function (m) {
        var a = m.g.attributes.position, idx = m.g.index, w = new Float32Array(a.count * 3), k;
        for (k = 0; k < a.count; k++) {
          p.fromBufferAttribute(a, k).applyMatrix4(m.w); w[k * 3] = p.x; w[k * 3 + 1] = p.y; w[k * 3 + 2] = p.z; lo = Math.min(lo, p.y);
          stamp(Math.round((p.x - cx + R) / cell), Math.round((p.z - cz + R) / cell), p.y);
        }
        for (var f = 0, nf = idx ? idx.count : a.count; f + 2 < nf; f += 3) {
          var i0 = (idx ? idx.getX(f) : f) * 3, i1 = (idx ? idx.getX(f + 1) : f + 1) * 3, i2 = (idx ? idx.getX(f + 2) : f + 2) * 3;
          var ax = w[i0], az = w[i0 + 2], bx = w[i1], bz = w[i1 + 2], qx = w[i2], qz = w[i2 + 2], det = (bz - qz) * (ax - qx) + (qx - bx) * (az - qz);
          if (Math.abs(det) < 1e-9) continue;
          var gi0 = Math.ceil((Math.min(ax, bx, qx) - cx + R) / cell), gi1 = Math.floor((Math.max(ax, bx, qx) - cx + R) / cell);
          var gj0 = Math.ceil((Math.min(az, bz, qz) - cz + R) / cell), gj1 = Math.floor((Math.max(az, bz, qz) - cz + R) / cell);
          for (var gj = Math.max(0, gj0); gj <= Math.min(n - 1, gj1); gj++) for (var gi = Math.max(0, gi0); gi <= Math.min(n - 1, gi1); gi++) {
            var px = cx - R + gi * cell, pz = cz - R + gj * cell, l0 = ((bz - qz) * (px - qx) + (qx - bx) * (pz - qz)) / det, l1 = ((qz - az) * (px - qx) + (ax - qx) * (pz - qz)) / det, l2 = 1 - l0 - l1;
            if (l0 >= -1e-6 && l1 >= -1e-6 && l2 >= -1e-6) stamp(gi, gj, l0 * w[i0 + 1] + l1 * w[i1 + 1] + l2 * w[i2 + 1]);
          }
        }
      });
      function at(x, z) {
        var i = Math.round((x - cx + R) / cell), j = Math.round((z - cz + R) / cell), y = NONE;
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) { var ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < n && jj < n && top[jj * n + ii] > y) y = top[jj * n + ii]; }
        return y;
      }
      // The cell itself, without its neighbours: where the colony really ends.
      function raw(x, z) { var i = Math.round((x - cx + R) / cell), j = Math.round((z - cz + R) / cell); return i >= 0 && j >= 0 && i < n && j < n ? top[j * n + i] : NONE; }
      var reach = 0;
      for (var a2 = 0; a2 < 16; a2++) for (var rr = 0.04; rr < R; rr += 0.04) if (at(cx + Math.cos(a2 * 0.3927) * rr, cz + Math.sin(a2 * 0.3927) * rr) > lo + 0.25 * (h.boxMaxY - h.boxMinY) * h.scale) reach = Math.max(reach, rr);
      return { at: at, raw: raw, x: cx, z: cz, reach: reach, low: lo };
    }
    function placeCots(o) {
      var plan = ecoPlan(), sp = terrain.spawn, list = [], best = null, top = null, a, rho, cx, cz, cy, rs, sx, sz;
      // The first starfish takes the preferred colony nearest the start; the others are spread by hash.
      organisms.forEach(function (h) {
        if (COTS_HOST[h.speciesId] === undefined || h.restoration || plan.hosts.indexOf(h) >= 0 || !h.center || coralState(h) !== 'healthy' || h.radius < 0.3) return;
        list.push([COTS_HOST[h.speciesId] + (plan.hosts.length ? eh(101, h.serial, o.index) : 0.04 * Math.hypot(h.center.x - sp.x, h.center.z - sp.z)), h.serial, h]);
      });
      list.sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; });
      for (var i = 0; i < list.length && !best && i < 6; i++) {
        var h = list[i][2], tp = colonyTop(h);
        if (tp.reach < 0.28) continue;
        // The starfish sits on living tissue at the scar's edge; the scar lies beside it.
        a = eh(102, o.serial, i) * TAU; rho = Math.max(0.12, tp.reach * 0.5); cx = tp.x + Math.cos(a) * rho; cz = tp.z + Math.sin(a) * rho; cy = tp.at(cx, cz);
        rs = clamp(tp.reach * 0.32, 0.1, 0.2);
        var turn = (0.2 + rs) / rho * (eh(103, o.serial, i) < 0.5 ? 1 : -1);
        sx = tp.x + Math.cos(a + turn) * rho; sz = tp.z + Math.sin(a + turn) * rho;
        if (cy > NONE && tp.at(sx, sz) > NONE) { best = h; top = tp; }
      }
      if (!best) return false;
      plan.hosts.push(best);
      var g1 = top.at(cx + 0.08, cz), g0 = top.at(cx - 0.08, cz), g2 = top.at(cx, cz + 0.08), g3 = top.at(cx, cz - 0.08);
      o.ground = cy + 0.015; o.home = new T.Vector3(cx, o.ground, cz); o.bommie = best.bommie || null; o.cotsHost = best.uid;
      o.normal = g1 > NONE && g0 > NONE && g2 > NONE && g3 > NONE ? new T.Vector3(-(g1 - g0) / 0.16, 1, -(g2 - g3) / 0.16).normalize() : null;
      o.scar = buildScar(top, sx, sz, rs, o.serial, best.uid);
      return true;
    }
    // A lobed patch of bare skeleton laid over the colony's surface, drawn as one
    // more instanced decor coral (same material and program, white instance colour).
    function buildScar(top, x0, z0, rs, salt, hostUid) {
      var b = new Builder(), rings = 5, segs = high ? 22 : 14, ph = eh(104, salt, 1) * TAU, ph2 = eh(105, salt, 1) * TAU, k, r, ring = [], first;
      function edgeR(a) { return rs * (1 + 0.17 * Math.sin(3 * a + ph) + 0.1 * Math.sin(5 * a + ph2) + 0.05 * Math.sin(9 * a + ph)); }
      // Each spoke stops where the colony ends.
      for (k = 0; k < segs; k++) {
        var a = k / segs * TAU, er = edgeR(a);
        for (r = er; r > rs * 0.3 && !(top.raw(x0 + Math.cos(a) * (r + 0.03), z0 + Math.sin(a) * (r + 0.03)) > NONE); r -= 0.02);
        ring.push(r);
      }
      function put(x, z, y, sh) {
        var hx = top.at(x + 0.03, z), hx0 = top.at(x - 0.03, z), hz = top.at(x, z + 0.03), hz0 = top.at(x, z - 0.03);
        var nx = hx > NONE && hx0 > NONE ? -(hx - hx0) / 0.06 : 0, nz = hz > NONE && hz0 > NONE ? -(hz - hz0) / 0.06 : 0, l = Math.hypot(nx, 1, nz);
        return b.vertex(x, y, z, nx / l, 1 / l, nz / l, sh, sh * 0.985, sh * 0.94);
      }
      var cy = top.at(x0, z0);
      first = put(x0, z0, cy + 0.006, 1.02);
      var grid = [];
      for (var i = 1; i <= rings; i++) {
        var row = [];
        for (k = 0; k < segs; k++) {
          var aa = k / segs * TAU, rr = ring[k] * i / rings, x = x0 + Math.cos(aa) * rr, z = z0 + Math.sin(aa) * rr, y = top.at(x, z);
          if (!(y > NONE)) y = cy;
          // Fresh skeleton is bright white; the far rim is a day or two older and greyer.
          var age = 0.5 + 0.5 * Math.cos(aa - ph), sh = 1.02 - 0.12 * age * (i / rings) - 0.03 * hash2(k * 7 + i, salt);
          row.push(put(x, z, y + 0.006, sh));
        }
        grid.push(row);
      }
      for (k = 0; k < segs; k++) b.i.push(first, grid[0][(k + 1) % segs], grid[0][k]);
      for (i = 1; i < rings; i++) for (k = 0; k < segs; k++) { var p0 = grid[i - 1][k], p1 = grid[i - 1][(k + 1) % segs], q0 = grid[i][k], q1 = grid[i][(k + 1) % segs]; b.i.push(p0, p1, q1, p0, q1, q0); }
      // A short skirt down to the living surface hides the gap under the patch edge.
      var skirt = [];
      for (k = 0; k < segs; k++) { var ak = k / segs * TAU, xs = x0 + Math.cos(ak) * ring[k], zs = z0 + Math.sin(ak) * ring[k], ys = top.at(xs, zs); skirt.push(put(xs, zs, (ys > NONE ? ys : cy) - 0.05, 0.86)); }
      for (k = 0; k < segs; k++) { var e0 = grid[rings - 1][k], e1 = grid[rings - 1][(k + 1) % segs]; b.i.push(e0, e1, skirt[(k + 1) % segs], e0, skirt[(k + 1) % segs], skirt[k]); }
      var geo = own(b.build(T, false));
      geo.setAttribute('reefSkeleton', new T.InstancedBufferAttribute(new Float32Array([1]), 1));
      var mesh = new T.InstancedMesh(geo, mats.coral, 1);
      mesh.setMatrixAt(0, new T.Matrix4()); mesh.setColorAt(0, new T.Color(1, 1, 1));
      mesh.name = 'reef-explore-feeding-scar'; mesh.receiveShadow = high; mesh.userData = { decorative: true, scar: true, hostUid: hostUid, centre: [x0, cy, z0], radius: rs };
      scene.add(mesh);
      return mesh;
    }

    // ---- Anemonefish drop into their anemone's tentacles when the diver comes close.
    // The middle of the tentacle mat and its height: from the anemone model's hostSlots
    // (where a clownfish pair hovers, 12 cm over the mat) when it has them. Its bounding
    // box is no guide: the tentacles are instances of a one-metre unit tentacle.
    function anemoneMat(an) {
      if (an.mat) return an.mat;
      var best = null, bd = 0.6;
      organisms.forEach(function (a) { if (a.speciesId === 'magnificent_anemone' && a.center) { var dd = Math.hypot(a.center.x - an.x, a.center.z - an.z); if (dd < bd) { bd = dd; best = a; } } });
      var slots = best && best.model && Array.isArray(best.model.hostSlots) ? best.model.hostSlots : null, m = best && (best.instanced ? best.matrix : best.root && best.root.matrix);
      if (!slots || !m) {
        // A placeholder's tessellated bounds can move its centre by centimetres
        // between detail tiers. Its placement origin is the stable host anchor.
        var base = m ? new T.Vector3().setFromMatrixPosition(m) : null;
        return (an.mat = { x: base ? base.x : an.x, y: an.top, z: base ? base.z : an.z });
      }
      var c = new T.Vector3(0, slots[0][1] - 0.12, 0).applyMatrix4(m);
      return (an.mat = { x: c.x, y: c.y, z: c.z });
    }
    function clownAct(o, dt) {
      // From the diver's head (it leads the body by most of a metre) to the anemone.
      var c = o.eco, head = diver ? (ecoHead = ecoHead || new T.Vector3()).copy(HEAD).applyMatrix4(diver.matrixWorld) : diverPos;
      var d = Math.min(Math.hypot(diverPos.x - c.x, diverPos.y - c.y, diverPos.z - c.z), Math.hypot(head.x - c.x, head.y - c.y, head.z - c.z)), want = smooth(2, 1.1, d);
      // Quick to take cover, slow to come back out.
      c.hide += (want - c.hide) * damp(want > c.hide ? (reducedMotion ? 3 : 7) : 0.35, Math.min(0.1, dt));
    }
    function setupForager(o) {
      if (o.behavior === 'cleaner') { setupCleaner(o); return true; }
      if (o.behavior === 'client') { setupClient(o); return true; }
      return setupGraze(o);
    }
    // Which Reef3DSpecies health states a species can show (info().healthStates):
    // corals all three, animals with algae partners 'bleached' too, the rest none.
    // Filled lazily: build() runs before this line is reached.
    var healthStatesOf;
    function healthStates(o) {
      var id = o.speciesId, s, raw = null;
      healthStatesOf = healthStatesOf || {}; s = healthStatesOf[id];
      if (s) return s;
      if (Species && typeof Species.info === 'function') { try { raw = Species.info(id); } catch (ignore) { raw = null; } }
      s = raw && Array.isArray(raw.healthStates) ? raw.healthStates : id === 'orange_cup_coral' ? ['healthy', 'dead'] : o.info.group === 'coral' ? ['healthy', 'bleached', 'dead'] : ['healthy'];
      return (healthStatesOf[id] = s);
    }
    // Reef3DSpecies health: 'healthy', 'bleached' or 'dead' (algae-covered), by one
    // per-organism draw, so an anemone or clam bleaches at the site's coral rate.
    function coralState(o) {
      if (o.restoration) return 'healthy';
      var states = healthStates(o);
      if (states.length < 2) return 'healthy';
      var r = o.draws[31], dead = 0.45 * health.algae * (1 - 0.5 * health.coralCover);
      var bleaching = states.indexOf('bleached') >= 0 ? health.bleaching : 0;
      var state = r < bleaching ? 'bleached' : r < bleaching + dead ? 'dead' : 'healthy';
      return states.indexOf(state) >= 0 ? state : 'healthy';
    }
    // Within info().schoolSize; a degraded reef keeps its smallest schools, and each tier caps the crowd.
    function schoolSize(info, roll, fullPopulation) {
      var lo = info.schoolSize[0], hi = Math.max(lo, Math.min(info.schoolSize[1], high || fullPopulation ? 60 : 30));
      return Math.round(lo + (hi - lo) * clamp(0.15 + 0.85 * vitality * (0.75 + 0.25 * roll), 0, 1));
    }
    function placeholder(id, info, o, schoolCount) {
      if (!phMaterial) phMaterial = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02, side: T.DoubleSide }));
      var state = coralState(o), hv = state === 'bleached' ? 0.15 : state === 'dead' ? 0.4 : 1, g = o.restoration ? growth : 1, keyName = id + '|' + g.toFixed(2) + '|' + state;
      var geo = phGeometry[keyName] || (phGeometry[keyName] = own(placeholderGeometry(T, id, info, g, hv, high)));
      var root = new T.Group(), radius = geo.boundingSphere ? geo.boundingSphere.radius : info.lengthM * 0.5;
      root.userData.speciesId = id;
      if (schoolCount > 0) {
        var r = mulberry32(o.seedInt), im = new T.InstancedMesh(geo, phMaterial, schoolCount), slots = [], m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3();
        var spread = Math.max(0.35, info.lengthM * 2.4 * Math.cbrt(schoolCount));
        for (var k = 0; k < schoolCount; k++) slots.push([(r() - 0.5) * spread * 1.6, (r() - 0.5) * spread * 0.6, (r() - 0.5) * spread, r() * TAU, 0.85 + 0.3 * r()]);
        var place = function (t) {
          for (var k2 = 0; k2 < slots.length; k2++) {
            var sl = slots[k2]; p.set(sl[0] + 0.12 * spread * Math.sin(t * 0.7 + sl[3]), sl[1] + 0.06 * spread * Math.sin(t * 0.9 + sl[3] * 1.3), sl[2] + 0.1 * spread * Math.cos(t * 0.6 + sl[3]));
            e.set(0, 0.15 * Math.sin(t * 1.1 + sl[3]), 0); q.setFromEuler(e); sc.setScalar(sl[4]); im.setMatrixAt(k2, m.compose(p, q, sc));
          }
          im.instanceMatrix.needsUpdate = true;
        };
        place(0); im.frustumCulled = false; im.userData.speciesId = id; im.name = 'reef-explore-placeholder-school'; root.add(im);
        return { root: root, update: function (dt, t) { place(t); }, dispose: function () {}, radius: spread * 0.9 + radius * 0.5, placeholder: true };
      }
      var mesh = new T.Mesh(geo, phMaterial); mesh.userData.speciesId = id; mesh.name = 'reef-explore-placeholder'; root.add(mesh);
      var mobile = info.group === 'fish' || info.group === 'reptile', ph = o.phase || 0;
      return { root: root, update: function (dt, t) { if (mobile) mesh.rotation.y = 0.07 * Math.sin(t * 5 + ph); }, dispose: function () {}, radius: radius, placeholder: true };
    }
    function validModel(m) { return m && m.root && m.root.isObject3D && typeof m.update === 'function' && typeof m.dispose === 'function'; }
    function makeModel(id, info, o, schoolCount) {
      var opts = { seed: o.seedInt, quality: quality, reducedMotion: reducedMotion, derivatives: derivatives, growth: o.restoration ? growth : 1, health: coralState(o) };
      if (Species) {
        try {
          var m = schoolCount > 0 && typeof Species.createSchool === 'function' ? Species.createSchool(T, id, schoolCount, opts) : Species.create(T, id, opts);
          if (validModel(m)) return m;
          if (m && typeof m.dispose === 'function') m.dispose();
          warn('Reef3DExplore: Reef3DSpecies returned no model for ' + id + '; using a placeholder.');
        } catch (error) { warn('Reef3DExplore: Reef3DSpecies could not build ' + id + ' (' + (error && error.message) + '); using a placeholder.'); }
      }
      return placeholder(id, info, o, schoolCount);
    }
    function tag(root, id, uid) {
      root.userData.exploreUid = uid; if (root.userData.speciesId === undefined) root.userData.speciesId = id;
      root.traverse(function (c) { if ((c.isMesh || c.isPoints || c.isLine) && c.userData.speciesId === undefined) c.userData.speciesId = id; });
    }
    function localBounds(root) {
      root.position.set(0, 0, 0); root.quaternion.identity(); root.scale.set(1, 1, 1); root.updateMatrixWorld(true);
      // r128's Box3.setFromObject omits instance transforms and counts an instanced mesh's raw
      // geometry where it was modelled (a 1 m unit tentacle made every anemone 1 m tall). Measure
      // ordinary meshes by their vertices and instanced ones only through every instance, so
      // surface clearance covers a whole shoal but no phantom template.
      var box = new T.Box3(), point = new T.Vector3();
      var instance = new T.Matrix4(), world = new T.Matrix4(), part = new T.Box3();
      root.traverse(function (mesh) {
        if (!mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) return;
        if (!mesh.isInstancedMesh) {
          var pos = mesh.geometry.attributes.position;
          for (var v = 0; v < pos.count; v++) box.expandByPoint(point.fromBufferAttribute(pos, v).applyMatrix4(mesh.matrixWorld));
          return;
        }
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        for (var i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, instance); world.multiplyMatrices(mesh.matrixWorld, instance);
          box.union(part.copy(mesh.geometry.boundingBox).applyMatrix4(world));
        }
      });
      if (box.isEmpty()) box.set(new T.Vector3(-0.1, -0.1, -0.1), new T.Vector3(0.1, 0.1, 0.1));
      return box;
    }
    function restQuaternion(o, out) {
      var up = new T.Vector3(0, 1, 0), qy = new T.Quaternion().setFromAxisAngle(up, yawFor(o.yaw));
      if (o.normal) { var n = up.clone().lerp(o.normal, o.substrateMatched ? 1 : 0.45).normalize(); out.setFromUnitVectors(up, n).multiply(qy); } else out.copy(qy);
      return out;
    }
    function register(o) {
      organisms.push(o); byUid[o.uid] = o;
      if (o.root) o.root.traverse(function (c) { owner.set(c, o); });
    }
    function isMobile(o) { var b = o.behavior; return !(b === 'fixed' || b === 'moray' || b === 'den' || b === 'ray' || (b === 'cleaner' && o.info.group !== 'fish')); }
    // High tier shadow casters: animals over 0.35 m in radius (a school's radius is the
    // whole school's, so that is every school). Schools are InstancedMeshes, which three.js
    // never culls, so each was drawn in the shadow pass wherever it swam. A caster now casts
    // only while it can reach the shadow map's square (leanShadowCasters, before each shadow
    // pass): beyond it a shadow falls nowhere that is drawn. Same-frame renders match exactly.
    // (Dropping small fish by size was measured: their schools' soft shade still shows.)
    function leanCasters(o, root) {
      if (!(o.radius > 0.35)) return;
      var list = [];
      root.traverse(function (c) { if (c.isMesh) list.push(c); });
      o.leanCasters = list; o.leanCasting = null;
    }
    function leanShadowCasters() {
      var box = perfShadowBox();
      if (!box) return;
      for (var i = 0; i < organisms.length; i++) {
        var o = organisms[i], list = o.leanCasters, on;
        if (!list) continue;
        on = perfInShadow(box, o.center, o.radius);
        if (on === o.leanCasting) continue;
        o.leanCasting = on;
        for (var k = 0; k < list.length; k++) list[k].castShadow = on;
      }
    }
    function baseSeat(o) {
      // Their feet or mantle are millimetres above the model's base. Keep them
      // seated on the substrate rather than burying most of the living body.
      if (o.speciesId === 'nudibranch' || o.speciesId === 'cleaner_shrimp' || o.speciesId === 'harlequin_shrimp') return 0.0005;
      // A two-centimetre burial hides most of these small real specimens.
      return o.speciesId === 'porcelain_anemone_crab' || o.speciesId === 'white_spotted_hermit_crab' || o.speciesId === 'varicose_phyllidia' || o.speciesId === 'textile_cone' || o.speciesId === 'orange_cup_coral' ? 0.002 : 0.02;
    }
    var substrateProbe;
    function matchSmallSubstrate(o) {
      if (o.substrateMatched || (o.speciesId !== 'nudibranch' && o.speciesId !== 'cleaner_shrimp' && o.speciesId !== 'harlequin_shrimp')) return;
      // The rock's rendered triangles can lie centimetres above its smooth
      // analytic placement surface. Match these centimetre-sized animals to
      // the actual supporting face once, so their feet and bodies remain above
      // the reef. Larger colonies retain their established placement and tilt.
      var surfaces = [floorMesh, bommieMesh].filter(Boolean);
      surfaces.forEach(function (mesh) { mesh.updateMatrixWorld(true); });
      var probe = substrateProbe || (substrateProbe = new T.Raycaster());
      probe.ray.origin.set(o.home.x, 1, o.home.z); probe.ray.direction.set(0, -1, 0);
      var hits = probe.intersectObjects(surfaces, false), hit = hits[0];
      if (!hit || !hit.face || !isFinite(hit.point.y)) return;
      o.ground = hit.point.y; o.home.y = hit.point.y;
      o.normal = hit.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld));
      o.substrateMatched = true;
    }
    function attachObject(o, model) {
      var root = model.root, box = localBounds(root), id = o.speciesId;
      o.model = model; o.root = root; o.instanced = false; root.rotation.order = 'YZX';
      o.motion = { speed: 0, turn: 0, current: { x: 0, z: 0, strength: 0 } };
      tag(root, id, o.uid);
      o.centerLocal = box.getCenter(new T.Vector3());
      var r0 = num(model.radius, 0) > 0 ? model.radius : box.getBoundingSphere(new T.Sphere()).radius;
      // The low tier draws fewer members, but their shared route still belongs
      // to the full shoal. A conservative envelope in body lengths contains the
      // relaxed school, fin sweep and breathing motion without depending on its
      // tessellation or currently drawn population. Otherwise a quality switch
      // can move a school several metres when a ledge crosses its surface limit.
      if (o.school) r0 = Math.max(0.35, o.info.lengthM * (1.55 * Math.cbrt(schoolSize(o.info, o.draws[31], true)) + 0.7));
      if (o.school) o.centerLocal.set(0, 0, 0); else root.scale.setScalar(o.scale);
      o.radius = r0 * (o.school ? 1 : o.scale); o.center = new T.Vector3(); o.boxMinY = box.min.y; o.boxMaxY = box.max.y;
      o.ceiling = o.school ? -0.25 - o.radius * 0.75 - o.info.lengthM * 0.15 : -0.55;
      orgRoot.add(root);
      if (high) leanCasters(o, root);
      o.path = null;
      if (isMobile(o)) setupMotion(o);
      // Reef3DSpecies says where a model's origin is (info().origin); placeholders are placed by their bounds.
      var origin = model.placeholder ? null : o.info.origin;
      if (o.behavior === 'moray') {
        var mo = crevice.mouth, out = origin === 'crevice' ? 0 : Math.max(0.1, box.max.x * o.scale - 0.35 * o.info.lengthM * o.scale);
        root.position.set(mo.x - mo.nx * out, mo.y, mo.z - mo.nz * out); root.rotation.set(0, yawFor(o.yaw), origin === 'crevice' ? 0 : 0.12);
      } else if (!o.path) {
        if (origin === 'base') matchSmallSubstrate(o);
        restQuaternion(o, root.quaternion);
        root.position.set(o.home.x, o.ground - (origin === 'base' ? 0 : box.min.y * o.scale) - baseSeat(o), o.home.z);
      }
      root.updateMatrix(); root.updateMatrixWorld(true);
      if (!o.path) o.center.copy(o.centerLocal).applyMatrix4(root.matrix);
      register(o);
    }
    function instanceable(root) {
      var ok = true;
      root.traverse(function (c) { if (c.isInstancedMesh || c.isPoints || c.isLine || c.isSkinnedMesh || c.isSprite || (c.isMesh && Array.isArray(c.material))) ok = false; });
      return ok;
    }
    function instanceMembers(id, info, members) {
      var buckets = {}, names = [];
      members.forEach(function (o) {
        var k = coralState(o).charAt(0) + (o.restoration ? o.index % 2 : 0);
        if (!buckets[k]) { buckets[k] = []; names.push(k); }
        buckets[k].push(o);
      });
      names.sort().forEach(function (k) {
        var list = buckets[k], model = makeModel(id, info, list[0], 0);
        if (!instanceable(model.root)) { attachObject(list[0], model); list.slice(1).forEach(function (o) { attachObject(o, makeModel(id, info, o, 0)); }); return; }
        protos.push(model);
        var box = localBounds(model.root), centerLocal = box.getCenter(new T.Vector3()), r0 = num(model.radius, 0) > 0 ? model.radius : box.getBoundingSphere(new T.Sphere()).radius;
        var q = new T.Quaternion(), pv = new T.Vector3(), sv = new T.Vector3(), mtx = new T.Matrix4(), uids = [], lift = model.placeholder || info.origin !== 'base' ? box.min.y : 0;
        list.forEach(function (o) {
          if (!model.placeholder && info.origin === 'base') matchSmallSubstrate(o);
          restQuaternion(o, q); pv.set(o.home.x, o.ground - lift * o.scale - baseSeat(o), o.home.z); sv.setScalar(o.scale);
          o.matrix = new T.Matrix4().compose(pv, q, sv); o.center = centerLocal.clone().applyMatrix4(o.matrix); o.radius = r0 * o.scale; o.instanced = true; o.model = model;
          o.boxMinY = box.min.y; o.boxMaxY = box.max.y; uids.push(o.uid); register(o);
        });
        var inv = new T.Matrix4().copy(model.root.matrixWorld).invert(), meshes = [];
        model.root.traverse(function (c) { if (c.isMesh) meshes.push(c); });
        // Members are refilled by distance and view like the decor (refreshDecor), so a far group costs nothing.
        var group = { meshes: [], members: list, all: [] };
        meshes.forEach(function (mesh) {
          var rel = new T.Matrix4().multiplyMatrices(inv, mesh.matrixWorld), src = mesh.geometry, part = own(new T.BufferGeometry()), all = new Float32Array(list.length * 16);
          Object.keys(src.attributes).forEach(function (n) { part.setAttribute(n, src.attributes[n]); });
          if (src.index) part.setIndex(src.index);
          src.groups.forEach(function (gr) { part.addGroup(gr.start, gr.count, gr.materialIndex); });
          part.drawRange.start = src.drawRange.start; part.drawRange.count = src.drawRange.count;
          if (!src.boundingSphere) src.computeBoundingSphere();
          part.boundingSphere = src.boundingSphere.clone(); part.boundingBox = src.boundingBox ? src.boundingBox.clone() : null;
          var im = new T.InstancedMesh(part, mesh.material, list.length);
          list.forEach(function (o, i) { mtx.multiplyMatrices(o.matrix, rel).toArray(all, i * 16); im.setMatrixAt(i, mtx); });
          im.instanceMatrix.setUsage(T.DynamicDrawUsage); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false;
          im.castShadow = high && r0 > 0.35; im.receiveShadow = true;
          im.name = 'reef-explore-group'; im.userData = { speciesId: id, exploreUids: uids.slice(), exploreMatrices: all };
          orgRoot.add(im); group.meshes.push(im); group.all.push(all);
        });
        groups.push(group);
      });
    }
    // The decor and the coral groups are refilled only after the camera has moved or
    // turned a little (PERF_STEP m, PERF_TURN as a cosine: 0.75 m or 10 degrees on the
    // light tier, 0.4 m or 5 degrees on the high one), so their view cone carries a margin
    // for both. A turn needs the same margin at every distance; a step shifts near things
    // most. Near things keep the old margin (0.45 rad beyond the view's half diagonal);
    // from 6 m and 12 m out it is the turn plus the step's angle there, so far colonies
    // behind the edges of the screen are no longer drawn.
    var PERF_STEP = high ? 0.4 : 0.75, PERF_TURN = high ? 0.9962 : 0.985, perfCone = { near: 0, mid: 0, far: 0 };
    function perfConeFor(fov, aspect) {
      var half = Math.atan(Math.tan(fov * Math.PI / 360) * Math.hypot(1, aspect)), turn = Math.acos(PERF_TURN);
      perfCone.near = Math.cos(Math.min(Math.PI * 0.95, half + 0.45));
      perfCone.mid = Math.cos(Math.min(Math.PI * 0.95, half + turn + Math.asin(PERF_STEP / 6) + 0.02));
      perfCone.far = Math.cos(Math.min(Math.PI * 0.95, half + turn + Math.asin(PERF_STEP / 12) + 0.02));
      return perfCone;
    }
    function perfConeAt(cone, d) { return d < 6 ? cone.near : d < 12 ? cone.mid : cone.far; }
    // Shadows (high tier): the sun's shadow map covers a 28 m square around the diver.
    // A coral group is drawn in the shadow pass with only its members inside that square
    // (they come first in its buffer; scene.onBeforeRender swaps the count before the
    // shadow pass, each group mesh restores it for its own draw), so the colonies whose
    // shadows fall outside the map are no longer drawn twice. Nothing visible changes.
    var perfLight = null;
    function perfShadowBox() {
      if (!high || !sun || !sun.castShadow || !sun.userData.dir) return null;
      var L = perfLight || (perfLight = { x: new T.Vector3(), y: new T.Vector3(), z: new T.Vector3(), cx: 0, cy: 0, cz: 0, half: 0 });
      L.z.copy(sun.userData.dir).normalize(); L.x.set(0, 1, 0).cross(L.z).normalize(); L.y.crossVectors(L.z, L.x);
      // Where the light's target will be (the rounded diver), with room for a step between refills.
      L.cx = Math.round(diverPos.x); L.cy = Math.round(diverPos.y); L.cz = Math.round(diverPos.z); L.half = sun.shadow.camera.right + 1.6;
      return L;
    }
    function perfInShadow(L, p, r) {
      var dx = p.x - L.cx, dy = p.y - L.cy, dz = p.z - L.cz;
      return Math.abs(dx * L.x.x + dy * L.x.y + dz * L.x.z) <= L.half + r && Math.abs(dx * L.y.x + dy * L.y.y + dz * L.y.z) <= L.half + r;
    }
    function perfShadowPass() { leanShadowCasters(); for (var i = 0; i < groups.length; i++) for (var m = 0; m < groups[i].meshes.length; m++) { var mesh = groups[i].meshes[m]; if (mesh.perfShadowCount !== undefined) mesh.count = mesh.perfShadowCount; } }
    function perfMainCount() { if (this.perfMainCount !== undefined) this.count = this.perfMainCount; }
    // Small animals vanish into the haze sooner; only mobile life uses adaptive reach.
    function drawDistance(o) {
      var reach = Math.min(cullDist, 8 + o.radius * 30);
      // Anchored life remains part of the same landscape under renderer load.
      return o.path ? reach * (0.5 + 0.5 * gov.scale) : reach;
    }
    function refreshGroups(cx, cy, cz, cone) {
      var box = perfShadowBox();
      if (box && scene.onBeforeRender !== perfShadowPass) scene.onBeforeRender = perfShadowPass;
      groups.forEach(function (g) {
        var n = 0, lit = 0, k, q, m, passes = box && g.meshes[0] && g.meshes[0].castShadow ? 2 : 1;
        for (var pass = 0; pass < passes; pass++) {
          for (k = 0; k < g.members.length; k++) {
            var o = g.members[k], dx = o.center.x - cx, dy = o.center.y - cy, dz = o.center.z - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d - o.radius > drawDistance(o)) continue;
            if (d > o.radius + 1.5 && dx * camFwd.x + dy * camFwd.y + dz * camFwd.z < perfConeAt(cone, d) * d - o.radius) continue;
            // Two passes: members inside the shadow map first, then the rest.
            if (passes === 2 && perfInShadow(box, o.center, o.radius) !== (pass === 0)) continue;
            for (m = 0; m < g.meshes.length; m++) { var dst = g.meshes[m].instanceMatrix.array, src = g.all[m]; for (q = 0; q < 16; q++) dst[n * 16 + q] = src[k * 16 + q]; }
            n++;
          }
          if (pass === 0) lit = n;
        }
        for (m = 0; m < g.meshes.length; m++) {
          var mesh = g.meshes[m];
          mesh.count = n; mesh.visible = n > 0; mesh.perfMainCount = n; mesh.perfShadowCount = passes === 2 ? lit : n;
          if (mesh.onBeforeRender !== perfMainCount) mesh.onBeforeRender = perfMainCount;
          mesh.instanceMatrix.updateRange.offset = 0; mesh.instanceMatrix.updateRange.count = Math.max(16, n * 16); mesh.instanceMatrix.needsUpdate = true;
        }
      });
    }
    function buildOrganisms() {
      var serial = 0, entries = [];
      site.population.forEach(function (p, ei) {
        var info = speciesInfo(Species, p.id), uids = [];
        for (var k = 0; k < p.count; k++) uids.push('r' + (++serial));
        entries.push({ id: p.id, info: info, behavior: behaviorFor(info), uids: uids, order: ei });
      });
      var resUids = [];
      for (var u = 0; restoration && u < restoration.units; u++) resUids.push('r' + (++serial));
      function pass(e) { return e.behavior === 'fixed' && (e.info.habit === 'sessile' || e.info.group === 'coral' || e.info.group === 'structure') ? 0 : e.behavior === 'fixed' || e.behavior === 'den' || e.behavior === 'ray' || e.behavior === 'moray' ? 1 : 2; }
      // Restoration units claim the rubble patch before anything else settles.
      if (restoration) loadStep(3, function () { placeRestoration(resUids); });
      // One step per species, in placement order (a staged mount yields between them).
      entries.slice().sort(function (a, b) { return pass(a) - pass(b) || a.order - b.order; }).forEach(function (e) { loadStep(1 + e.uids.length, function () {
        // This species depends on a host. Explicit custom populations may omit
        // anemones; do not invent one or place a hostless crab on the seabed.
        if (e.id === 'porcelain_anemone_crab' && !anemones.length) return;
        var rnd = stream(seed, 3001 + (hashInt(e.id) % 99991)), zone = ZONE[e.id] || defaultZone(e.info, e.behavior), members = [];
        for (var k = 0; k < e.uids.length; k++) {
          var draws = []; for (var q = 0; q < 32; q++) draws.push(rnd());
          var o = { uid: e.uids[k], serial: Number(e.uids[k].slice(1)), speciesId: e.id, info: e.info, behavior: e.behavior, index: k, draws: draws, restoration: false, school: 0 };
          o.seedInt = (Math.imul(seed, 7919) + hashInt(e.id) + Math.imul(k + 1, 104729)) | 0;
          placeHome(o, zone, members); members.push(o);
        }
        var beh = e.behavior, info = e.info;
        if (beh === 'school') members.forEach(function (o) { o.school = schoolSize(info, o.draws[31]); });
        var sessile = beh === 'fixed' && (info.habit === 'sessile' || info.group === 'coral' || info.group === 'structure');
        if (sessile && members.length >= 2 && (info.group === 'coral' || info.group === 'structure' || members.length >= 5)) instanceMembers(e.id, info, members);
        // Each model is its own step (painting its textures can take a while); the
        // grid stamps follow once the species is complete, as before.
        else members.forEach(function (o) { loadStep(1, function () { attachObject(o, makeModel(e.id, info, o, o.school)); }); });
        loadStep(0, function () { members.forEach(function (o) {
          if (!o.path && o.center) {
            block(o.center.x, o.center.z, o.radius * 0.85 + 0.2);
            var top = o.center.y + (o.boxMaxY - (o.boxMinY + o.boxMaxY) / 2) * o.scale;
            if (top - o.ground > 0.3) stampTop(o.center.x, o.center.z, o.radius * 0.7, top);
          }
          if (e.id === 'magnificent_anemone' && o.center) anemones.push({ x: o.center.x, z: o.center.z, top: o.ground + (o.boxMaxY - o.boxMinY) * o.scale * 0.85 });
        }); });
      }); });
      loadStep(0, function () { organisms.sort(function (a, b) { return a.serial - b.serial; }); });
    }
    function placeRestoration(uids) {
      var kind = restoration.kind, info = speciesInfo(Species, kind), rr = stream(seed, 4001), rb = terrain.rubble, spacing = kind === 'reef_star' ? 1.25 : kind === 'reef_ball' ? 2.3 : 3.2;
      var lattice = [], n = Math.ceil(Math.sqrt(uids.length)) + 4;
      for (var j = -n; j <= n; j++) for (var i = -n; i <= n; i++) {
        var lx = (i + (kind === 'coral_tree_nursery' ? 0 : (j & 1) * 0.5)) * spacing, lz = j * spacing * (kind === 'coral_tree_nursery' ? 1 : 0.866);
        lattice.push([lx, lz, Math.hypot(lx, lz) + (i * 0.001 + j * 0.0001)]);
      }
      lattice.sort(function (a, b) { return a[2] - b[2]; });
      var members = [];
      uids.forEach(function (uid, k) {
        var d1 = rr(), d2 = rr(), d3 = rr(), jit = kind === 'reef_star' ? 0.05 : 0.25, x = rb.x + lattice[k][0] + (d1 - 0.5) * jit, z = rb.z + lattice[k][1] + (d2 - 0.5) * jit;
        var draws = []; for (var q = 0; q < 32; q++) draws.push(0.5);
        var o = { uid: uid, serial: Number(uid.slice(1)), speciesId: kind, info: info, behavior: 'fixed', index: k, draws: draws, restoration: true, school: 0, scale: 1,
          yaw: kind === 'reef_star' ? (k % 2) * Math.PI / 6 : d3 * TAU, phase: 0, dir: 1 };
        o.seedInt = (Math.imul(seed, 7919) + hashInt(kind) + Math.imul((k % 2) + 1, 104729)) | 0;
        o.ground = terrain.floorY(x, z); o.home = new T.Vector3(x, o.ground, z); o.normal = null;
        sessiles.push({ x: x, z: z, r: Math.max(0.3, info.lengthM * 0.5) }); members.push(o);
      });
      if (members.length >= 2) instanceMembers(kind, info, members);
      else members.forEach(function (o) { attachObject(o, makeModel(kind, info, o, 0)); });
      members.forEach(function (o) { block(o.center.x, o.center.z, o.radius * 0.8 + 0.15); var top = o.ground + (o.boxMaxY - o.boxMinY) * o.scale; stampTop(o.center.x, o.center.z, o.radius * 0.6, top); });
    }
    function planSchoolRoute(o) {
      // A large shoal needs a column of open water. Move its whole patrol
      // gently down-slope at placement time, instead of squeezing it against
      // the surface or letting individual members pass through a reef crest.
      // Planktivores stay over their own head instead, among clouds on the heads around.
      if (o.planktivore) { joinCrowd(o); return; }
      var path = o.path, point = { x: 0, y: 0, z: 0 }, samples = [], maxZ = -Infinity;
      for (var i = 0; i < 64; i++) { path(i / 64 * o.pathPeriod, point); samples.push({ x: point.x, z: point.z }); maxZ = Math.max(maxZ, point.z); }
      var maxShift = Math.max(0, 27.5 - maxZ), shift = 0, reach = o.radius * 0.7;
      for (; shift < maxShift; shift = Math.min(maxShift, shift + 0.75)) {
        var safe = true;
        for (var k = 0; k < samples.length && safe; k++) {
          var p = samples[k];
          for (var a = 0; a < 9; a++) {
            var dx = a ? reach * Math.cos((a - 1) * TAU / 8) : 0, dz = a ? reach * Math.sin((a - 1) * TAU / 8) : 0;
            if (groundTop(p.x + dx, p.z + shift + dz) + o.clear + 0.25 > o.ceiling) { safe = false; break; }
          }
        }
        if (safe) break;
      }
      if (shift > 0) o.path = function (t, out) { path(t, out); out.z += shift; return out; };
    }
    function mobilePoint(o, t, out) {
      o.path(t, out);
      // Territory-bound animals hold their station; roaming animals gently yield
      // to the surge, then compensate. Displacement is bounded to a few cm.
      var loose = o.behavior === 'school' ? 0.16 : o.behavior === 'wander' || o.behavior === 'roam' || o.behavior === 'turtle' || o.behavior === 'manta' || o.behavior === 'cruise' ? 0.1 : 0.025;
      var phase = t * 0.35 - o.home.x * 0.075 - o.home.z * 0.055;
      out.x += loose * Math.sin(phase); out.z += loose * 0.65 * Math.sin(phase + 0.4);
      if (o.flight && o.flight.tick !== null) fleeFrom(o, t, out);
      if (o.encounter && o.encounter.tick !== null) encounterFrom(o, t, out);
      return out;
    }
    function mobileGround(o, x, z) {
      var top = groundTop(x, z), r = o.groundReach;
      if (!r) return top;
      // Eight points cover the ray's disc even while its heading and bank
      // change. This intentionally excludes the long, narrow trailing tail.
      var d = r * 0.7071067811865476;
      return Math.max(top, groundTop(x + r, z), groundTop(x - r, z), groundTop(x, z + r), groundTop(x, z - r),
        groundTop(x + d, z + d), groundTop(x + d, z - d), groundTop(x - d, z + d), groundTop(x - d, z - d));
    }
    // The lift a swimmer needs over the terrain ahead (eight path points, the costly part
    // of a pose). Far and unseen swimmers redo it on their slice (perfRate) and keep the
    // last answer in between; the footprint under them (nowLift) is always current.
    function perfLookAhead(o, q, clear, nowLift, init) {
      if (!init && o.perfAhead !== undefined && !perfDue(o, o.perfM || 1)) return Math.max(nowLift, o.perfAhead);
      var target = Math.max(nowLift, mobileGround(o, q.x, q.z) + clear - q.y);
      for (var lead = 1; lead <= 7; lead++) {
        var ahead = mobilePoint(o, worldTime + lead * 0.6, aheadPoint);
        target = Math.max(target, mobileGround(o, ahead.x, ahead.z) + clear - ahead.y - lead * 0.06);
      }
      o.perfAhead = target;
      return target;
    }
    function poseMobile(o, dt, init) {
      if (o.flight === undefined) o.flight = flightState(o);
      if (o.flight) stepFlight(o, init);
      if (o.encounter === undefined) o.encounter = encounterState(o);
      if (o.encounter) stepEncounter(o, init);
      // A sheltering planktivore may sink to just above the coral it hides in.
      var shelter = Math.max(o.flight ? shelterAt(o.flight, worldTime) : 0, o.encounter ? encounterAt(o.encounter, worldTime, 's') : 0);
      var clear = o.shelterClear ? lerp(o.clear, o.shelterClear, shelter) : o.clear;
      var p = mobilePoint(o, worldTime, tmpA), q = mobilePoint(o, worldTime + 0.3, tmpB), root = o.root;
      var floor = mobileGround(o, p.x, p.z) + clear, nowLift = Math.max(0, floor - p.y);
      // Start climbing before a ledge and settle slowly on its far side. Keep
      // the current footprint clear even at a sharp coral-grid boundary.
      var target = perfLookAhead(o, q, clear, nowLift, init);
      if (init) o.lift = target;
      else o.lift = Math.max(nowLift, o.lift + (target - o.lift) * damp(target > o.lift ? 2.8 : 1.1, dt));
      var dx = q.x - p.x, dz = q.z - p.z, horiz = Math.hypot(dx, dz), rawBear = o.sweep ? o.sweep(worldTime) : horiz > 1e-5 ? bearingTo(dx, dz) : (o.bearingNow || o.yaw);
      if (o.sweep && o.flight && o.flight.tick !== null) rawBear = fleeBearing(o, rawBear);
      var previous = o.bearingNow, bear = init || previous === undefined ? rawBear : previous + wrapAngle(rawBear - previous) * damp(4.5, dt);
      var rate = dt > 0 && previous !== undefined ? wrapAngle(bear - previous) / dt : 0;
      var yGoal = Math.min(o.ceiling, p.y + o.lift);
      var y = init || dt <= 0 ? yGoal : Math.min(o.ceiling, Math.max(floor, root.position.y + clamp(yGoal - root.position.y, -0.7 * dt, 0.85 * dt)));
      var vy = init || dt <= 0 ? (q.y - p.y) / 0.3 : (y - root.position.y) / dt;
      var pitchLimit = o.school ? 0.16 : 0.38;
      var pitchT = o.sweep ? 0 : clamp(Math.atan2(vy, Math.max(horiz / 0.3, 0.12)), -pitchLimit, pitchLimit);
      var rollT = clamp(rate * 2.5, -1, 1) * o.bank;
      o.pitchNow = init || o.pitchNow === undefined ? pitchT : lerp(o.pitchNow, pitchT, damp(2.8, dt));
      o.rollNow = init || o.rollNow === undefined ? rollT : lerp(o.rollNow, rollT, damp(2.6, dt));
      o.bearingNow = bear;
      // Effort drives tail and fin articulation; filter the terrain solver's
      // small corrections so a ledge does not produce a sudden power stroke.
      var speed = Math.hypot(horiz / 0.3, clamp(vy, -0.6, 0.6));
      o.motion.speed = init ? speed : lerp(o.motion.speed, speed, damp(3.2, dt));
      o.motion.turn = init ? -rate : lerp(o.motion.turn, -rate, damp(3.6, dt));
      currentAt(p.x, p.z, worldTime, o.motion.current);
      root.position.set(p.x, y, p.z); root.rotation.set(o.rollNow, yawFor(bear), o.pitchNow);
      root.updateMatrix(); o.center.copy(o.centerLocal).applyMatrix4(root.matrix);
    }

    // ---- Encounters between fish ----------------------------------------------------
    // A close predator changes the living scene even when the diver is still: small
    // fish give it space, while coral-associated schools dip toward shelter.
    // This is an illustrative response, not a calibrated predation model; no animals
    // are removed. Refuge responses are documented in doi:10.1038/s41598-018-26090-4.
    // Keep this separate from diver habituation: focusing an animal must not turn
    // off its response to other fish, and being used to divers is not predator tameness.
    var encounterKit;
    function encounterCache() {
      if (encounterKit) return encounterKit;
      var predators = organisms.filter(function (o) { return o.path && (o.speciesId === 'whitetip_reef_shark' || o.speciesId === 'peacock_grouper' || o.speciesId === 'lionfish'); });
      return encounterKit = { predators: predators, frames: new Array(32), p: { x: 0, y: 0, z: 0 } };
    }
    function encounterState(o) {
      return flightBase(o) > 0 && o.info.group === 'fish' && o.info.lengthM <= 0.5 && o.speciesId !== 'lionfish' ?
        { tick: null, x: 0, z: 0, s: 0, tx: 0, tz: 0, ts: 0, r: 0 } : null;
    }
    // Cache each fixed-time sample, shared by all fish and ambient clouds. The ring
    // is bounded, and a predator's route is sampled without calling mobilePoint or
    // its flight wrapper (which could advance state or depend on update order).
    function encounterPredators(t) {
      var K = encounterCache(), tick = Math.floor(t * 60 + 1e-6), slot = ((tick % 32) + 32) % 32, frame = K.frames[slot];
      if (frame && frame.tick === tick) return frame.list;
      var list = [];
      K.predators.forEach(function (o) {
        var visit = o.eco && o.eco.station && clientVisit(o, t);
        if (visit && visitWeight(visit, t) > 0.25) return; // clients and cleaners can meet safely
        var p = { x: 0, y: 0, z: 0 };
        (o.pathRaw || o.path)(t, p);
        p.y = Math.min(o.ceiling, Math.max(p.y, groundTop(p.x, p.z) + o.clear));
        p.length = o.info.lengthM; p.uid = o.uid;
        list.push(p);
      });
      K.frames[slot] = { tick: tick, list: list };
      return list;
    }
    // Return the strongest visible encounter; a rock between two animals blocks
    // the cue. Distance is measured in all three dimensions so a shark cruising
    // far below a shallow coral head does not empty its school.
    function encounterCue(length, x, y, z, t, uid) {
      var list = encounterPredators(t), best = null, amount = 0;
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (p.uid === uid || length > p.length * 0.72) continue;
        var dx = x - p.x, dy = y - p.y, dz = z - p.z, d = Math.hypot(dx, dy, dz), reach = clamp(1.1 + p.length * 1.9, 1.6, 4.8);
        var strength = 1 - smooth(reach * 0.25, reach, d);
        if (strength <= amount) continue;
        var blocked = false;
        for (var j = 1; j <= 3; j++) { var f = j / 4; if (rockSurfaceAt(lerp(x, p.x, f), lerp(z, p.z, f)) > lerp(y, p.y, f) - 0.08) { blocked = true; break; } }
        if (!blocked) { best = p; amount = strength; }
      }
      return best ? { predator: best, amount: amount } : null;
    }
    function stepEncounter(o, init) {
      var e = o.encounter, tick = Math.floor(worldTime * 60 + 1e-6);
      if (init || e.tick === null) { e.tick = tick; return; }
      var K = encounterCache(), p = K.p;
      if (!K.predators.length) { e.tick = tick; return; }
      for (var k = Math.max(e.tick + 1, tick - 29); k <= tick; k++) {
        var t = k / 60;
        o.path(t, p);
        if (o.flight && o.flight.tick !== null) fleeFrom(o, t, p);
        var cue = encounterCue(o.info.lengthM, p.x, Math.max(p.y, groundTop(p.x, p.z) + o.clear), p.z, t, o.uid);
        e.tx = 0; e.tz = 0; e.ts = 0;
        if (cue) {
          var dx = p.x - cue.predator.x, dz = p.z - cue.predator.z, d = Math.hypot(dx, dz);
          if (d < 0.01) { dx = Math.cos(o.phase); dz = Math.sin(o.phase); d = 1; }
          var amount = cue.amount * (reducedMotion ? 0.35 : 1), distance = amount * Math.min(1.7, 0.6 + o.info.lengthM * 2) * (o.shelterClear ? 0.3 : 1);
          e.tx = dx / d * distance; e.tz = dz / d * distance; e.ts = o.shelterClear ? amount : 0;
        }
        var increasing = e.tx * e.tx + e.tz * e.tz + e.ts * e.ts > e.x * e.x + e.z * e.z + e.s * e.s;
        e.r = increasing ? (reducedMotion ? 1.3 : 2.3) : 0.35;
        var a = damp(e.r, 1 / 60);
        e.x += (e.tx - e.x) * a; e.z += (e.tz - e.z) * a; e.s += (e.ts - e.s) * a;
      }
      e.tick = Math.max(e.tick, tick);
    }
    function encounterAt(e, t, key) {
      if (e.tick === null) return 0;
      var target = e['t' + key], ahead = Math.max(0, t - e.tick / 60);
      return target + (e[key] - target) * Math.exp(-e.r * ahead);
    }
    function encounterFrom(o, t, out) {
      var e = o.encounter;
      out.x = clamp(out.x + encounterAt(e, t, 'x'), -28, 28); out.z = clamp(out.z + encounterAt(e, t, 'z'), -28, 28);
      if (o.shelterClear) out.y -= encounterAt(e, t, 's') * Math.max(0, out.y - groundTop(out.x, out.z) - o.shelterClear);
      return out;
    }

    // ---- Diver awareness ------------------------------------------------------------
    // A reef fish lets a calm diver come to about its flight distance, then swims
    // off just far enough to keep it. A fast diver startles fish sooner; fish that
    // people hunt (parrotfish, groupers, snappers) leave earlier than small fish,
    // venomous lionfish hardly move, and planktivores drop into their coral instead.
    // Sharks, rays, turtles and the other special swimmers keep their own ways.
    // Flight state advances in fixed 1/60 s steps of world time, so any split of the
    // same frames swims the same; reduced motion keeps every reaction smaller and
    // slower. Scratch values are made on first use: a plain mount builds the reef
    // before this line runs.
    var flightTmp;
    function flightScratch() { return flightTmp || (flightTmp = { p: { x: 0, y: 0, z: 0 }, a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 0 } }); }
    function flightBase(o) {
      var b = o.behavior;
      if (b !== 'school' && b !== 'hover' && b !== 'pair' && b !== 'wander') return 0;
      return flightSize(o);
    }
    // Grazers and cleaning-station clients use the same distance on their journeys (travelFleeWrap).
    function flightSize(o) {
      var wary = { parrotfish: 1.6, bumphead_parrotfish: 1.7, peacock_grouper: 1.3, bluestripe_snapper: 1.3, oriental_sweetlips: 1.2, emperor_angelfish: 1.1, clown_triggerfish: 1.1, porcupinefish: 0.6, yellow_boxfish: 0.7, lionfish: 0.3 };
      return Math.min(4.5, clamp(1 + 2.2 * o.info.lengthM, 1.1, 3.4) * (wary[o.speciesId] || 1));
    }
    function flightState(o) {
      var base = flightBase(o);
      return base > 0 ? { base: base, tick: null, x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, r: 0, s: 0, ts: 0, rs: 0, shelter: o.shelterClear || 0, h: 0, visit: calmCurious(o), va: 0, sx: 0, sy: 0, sz: 0 } : null;
    }
    // A focused animal tolerates the student who is identifying it; h is how used
    // the animal has grown to a calm diver (calmFactor).
    function flightDistance(base, focused, h) {
      var v = Math.min(1.6, Math.hypot(speed, vy));
      return base * (0.7 + 0.75 * v) * (reducedMotion ? 0.6 : 1) * (focused ? 0.25 : 1) * calmFactor(h);
    }

    // ---- Calm diving ----------------------------------------------------------------
    // Fish judge a diver by how it moves: a fast, direct approach scares them sooner,
    // and fish that meet divers often learn to tolerate them, though only partly
    // (Stankowich & Blumstein 2005; Titus et al. 2015). So while the diver hangs
    // still, each animal that can see it calmly grows used to it (h, 0..1, in fixed
    // 1/60 s steps of world time like the flight state): its flight distance and a
    // cloud's alarm radius shrink to as little as 45% (floor), hidden clouds come
    // back up, and a few roaming fish living close by drift in to swim a smaller
    // round in front of the diver. A burst of speed, a quick climb or a brush with
    // the reef undoes it within a second; ordinary swimming wears it off slowly.
    // A fish the diver keeps inside its flight distance stays alert and does not
    // settle (a planktivore cloud or school hiding in its coral slowly re-emerges).
    // Made on first use, like the flight scratch.
    var calmKit;
    function calmState() {
      if (calmKit) return calmKit;
      var k = function (rate) { return Math.exp(-rate / 60); };
      // Per-step multipliers: build (time constant 10 s), reset (0.25 s), fade after slow
      // swimming (15 s), after ordinary swimming (4 s), out of sight (30 s).
      calmKit = { at: null, mode: 2, floor: 0.45, build: k(0.1), build3: k(0.1 / 3), reset: k(4), slow: k(1 / 15), swim: k(0.25), away: k(1 / 30), sight: 14,
        vx: 0, vy: 0, vz: 0, rx: 1, rz: 0, vb: 0, vd: 2.2, off: 0, ex: 0, ey: 0, ez: 0 };
      return calmKit;
    }
    // How much smaller a habituated animal's flight distance is.
    function calmFactor(h) { return h > 0 ? 1 - (1 - calmState().floor) * h : 1; }
    // What the diver is doing this frame: 0 a burst (fast swim, fast climb or dive, or
    // a brush with the reef: Lane H3's contact state), 1 a still hover (H3's steady
    // calm, at any height above the reef, and all but stopped), 2 a slow swim or a
    // Swim to glide, 3 ordinary swimming.
    function calmInput() {
      var s = touch, v = Math.abs(speed), up = Math.abs(vy);
      if (autopilot) return 2;
      if (v > 0.8 || up > 0.5 || s && s.state === 'touch') return 0;
      var steady = !s || s.calmRun > 0 || Math.abs(turnRate) < 0.4 && up < 0.25;
      return steady && v < 0.12 && up < 0.15 ? 1 : v < 0.4 ? 2 : 3;
    }
    // Once per frame: the diver's mode and the open water just in front of its mask,
    // where calm visitors gather (straight ahead, or the nearest of six headings to
    // the side, still in view, when the reef blocks the way within a couple of metres).
    function calmFrame() {
      var K = calmState();
      if (K.at === worldTime) return K;
      K.at = worldTime; K.mode = calmInput();
      // The spot moves only while the diver hovers: visitors stay where they gathered when it leaves.
      if (K.mode !== 1) return K;
      // From the mask (the head leads the body by about 0.74 m).
      var ex = diverPos.x + fwdX(bearing) * 0.74, ez = diverPos.z + fwdZ(bearing) * 0.74, eyeY = diverPos.y + 0.1, free = -1, bestB = bearing, list = [0, -0.3, 0.3, -0.5, 0.5, -0.65, 0.65];
      for (var i = 0; i < list.length && free < 1.8; i++) {
        var b = bearing + list[i], s = 0.6;
        for (; s < 3; s += 0.3) if (groundTop(ex + fwdX(b) * s, ez + fwdZ(b) * s) > eyeY - 0.4) break;
        if (s > free + 0.3 || !i) { free = s; bestB = b; }
      }
      K.ex = ex; K.ey = eyeY; K.ez = ez; K.vd = clamp(free - 0.4, 1.5, 2.4);
      K.vx = ex + fwdX(bestB) * K.vd; K.vz = ez + fwdZ(bestB) * K.vd; K.vy = Math.max(eyeY - 0.2, groundTop(K.vx, K.vz) + 0.35);
      K.rx = Math.cos(bestB); K.rz = Math.sin(bestB); K.vb = bestB; K.off = wrapAngle(bestB - bearing);
      return K;
    }
    // One fixed step of an animal's habituation. d is how far the diver is; alert when
    // the diver is too close for the animal to settle (calmAlert).
    function calmHabituate(h, d, alert, shelter) {
      var K = calmFrame(), m = K.mode;
      h = h || 0;
      if (m === 0) return h * K.reset;
      if (m === 2) return h * K.slow;
      if (m === 3) return h * K.swim;
      if (d > K.sight) return h * K.away;
      if (alert && !shelter) return h;
      return 1 - (1 - h) * (alert ? K.build3 : K.build);
    }
    // A fish with the diver inside its own flight distance (even one kept close while it
    // is identified) stays alert and does not settle.
    function calmAlert(f, dist) { return dist < flightDistance(f.base, false, f.h); }
    // Roaming fish that are not hunted much (H1's wary table) may come for a look.
    function calmCurious(o) {
      var b = o.behavior, size = clamp(1 + 2.2 * o.info.lengthM, 1.1, 3.4);
      return (b === 'wander' || b === 'pair') && !o.planktivore && flightSize(o) <= size * 1.1 + 1e-6 ? 1 : 0;
    }
    // A settled visitor swims its own route at 30% of its size around its spot in front
    // of the diver: p + va * (S + 0.3 (p - c) - p), with c the middle of the route (a pair
    // shares its leader's), S the spot and va the visit weight. Applied to the flight
    // step's home point and to every pose sample (fleeFrom), so the terrain look-ahead
    // sees the same smaller route.
    function calmVisitAt(o, f, out) {
      if (!(f.va > 0)) return out;
      var c = (o.leader || o).home, w = f.va;
      out.x += w * (f.sx + 0.3 * (out.x - c.x) - out.x); out.y += w * (f.sy + 0.3 * (out.y - c.y) - out.y); out.z += w * (f.sz + 0.3 * (out.z - c.z) - out.z);
      return out;
    }
    // One fixed step of a visit: the weight follows how settled the fish is (and how
    // close it lives), and both it and the spot move at an easy swimming pace.
    function calmVisitStep(o, f) {
      var K = calmFrame(), lead = o.leader || o, c = lead.home, want = 0;
      if (f.visit && !reducedMotion) want = smooth(0.35, 0.85, f.h) * smooth(12, 8, Math.hypot(c.x - diverPos.x, c.z - diverPos.z));
      if (!(want > 0) && !(f.va > 0)) return;
      // Its own place near the others (a pair as one): nearer or farther, a little to
      // either side (toward the middle of the view when the spot is off to one side),
      // above or below; never inside the reef, never closer to the diver than its
      // settled flight distance nor within 1.5 m of the mask.
      var side = (hash2(lead.serial, 71) - 0.5) * (0.4 + 0.3 * K.vd) - clamp(K.off, -0.3, 0.3), along = (hash2(lead.serial, 73) - 0.5) * 0.8;
      var sx = K.vx + K.rx * side + fwdX(K.vb) * along, sz = K.vz + K.rz * side + fwdZ(K.vb) * along;
      var sy = Math.max(K.vy + (hash2(lead.serial, 72) - 0.4) * 0.5, groundTop(sx, sz) + 0.35);
      var near = Math.max(1.2, 1.3 * 0.7 * f.base * K.floor), ex = sx - diverPos.x, ey = sy - diverPos.y, ez = sz - diverPos.z, e = Math.hypot(ex, ey, ez);
      if (e < near) { sx = diverPos.x + ex / Math.max(e, 0.01) * near; sy = diverPos.y + ey / Math.max(e, 0.01) * near; sz = diverPos.z + ez / Math.max(e, 0.01) * near; }
      ex = sx - K.ex; ey = sy - K.ey; ez = sz - K.ez; e = Math.hypot(ex, ey, ez);
      if (e < 1.5) { sx = K.ex + ex / Math.max(e, 0.01) * 1.5; sy = K.ey + ey / Math.max(e, 0.01) * 1.5; sz = K.ez + ez / Math.max(e, 0.01) * 1.5; }
      if (!(f.va > 0)) { f.sx = sx; f.sy = sy; f.sz = sz; }
      else { var dx = sx - f.sx, dy = sy - f.sy, dz = sz - f.sz, d = Math.hypot(dx, dy, dz), q = d > 0.4 / 60 ? 0.4 / 60 / d : 1; f.sx += dx * q; f.sy += dy * q; f.sz += dz * q; }
      var stepW = 0.35 / 60 / Math.max(1, Math.hypot(f.sx - c.x, f.sy - c.y, f.sz - c.z));
      f.va = want > f.va ? Math.min(want, f.va + stepW) : Math.max(want, f.va - stepW * 1.5);
    }
    function stepFlight(o, init) {
      var f = o.flight, k = Math.floor(worldTime * 60 + 1e-6);
      if (init || f.tick === null) { f.tick = k; return; }
      for (var j = Math.max(f.tick + 1, k - 29); j <= k; j++) fleeTick(o, f, j / 60);
      f.tick = Math.max(f.tick, k);
    }
    function fleeTick(o, f, t) {
      var p = o.path(t, flightScratch().p), give = o.school ? o.radius * 0.5 : 0, F = flightDistance(f.base, o.uid === focusedUid, f.h);
      // A calm diver's visitor swims its round in front of the diver (calmVisitAt).
      calmVisitAt(o, f, p);
      var home = Math.max(0, Math.hypot(p.x - diverPos.x, p.y - diverPos.y, p.z - diverPos.z) - give);
      // Measured from where the fish is now, so a diver swimming past never draws it back through itself.
      var dx = p.x + f.x - diverPos.x, dy = p.y + f.y - diverPos.y, dz = p.z + f.z - diverPos.z, dh = Math.hypot(dx, dz), dist = Math.max(0, Math.hypot(dh, dy) - give);
      if (dist < F) {
        // Planktivores mostly sink into their coral; the rest swim away, never far from home.
        var want = (F - dist) * (f.shelter ? 0.35 : 0.95), up = clamp(dy / Math.max(0.05, Math.hypot(dh, dy)), -0.5, 0.5) * 0.6, side = Math.sqrt(1 - up * up);
        if (dh < 0.05) { dx = Math.cos(bearing) * o.dir; dz = Math.sin(bearing) * o.dir; dh = 1; }
        f.tx = f.x + dx / dh * want * side; f.tz = f.z + dz / dh * want * side; f.ty = f.y + want * up;
        var m = Math.hypot(f.tx, f.ty, f.tz), cap = (f.shelter ? 0.6 : 1.6) * F;
        if (m > cap) { f.tx *= cap / m; f.ty *= cap / m; f.tz *= cap / m; }
      } else if (home >= F) { f.tx = 0; f.ty = 0; f.tz = 0; } // the way home is clear
      else { f.tx = f.x; f.ty = f.y; f.tz = f.z; } // hold until the diver moves on
      var cur = f.x * f.x + f.y * f.y + f.z * f.z, goal = f.tx * f.tx + f.ty * f.ty + f.tz * f.tz;
      f.r = goal > cur ? (reducedMotion ? 2 : 2.6) : (reducedMotion ? 0.4 : 0.5);
      var a = 1 - Math.exp(-f.r / 60);
      f.x += (f.tx - f.x) * a; f.y += (f.ty - f.y) * a; f.z += (f.tz - f.z) * a;
      if (f.shelter) {
        // Judged from its station above the coral, so sinking out of reach does not call it back up.
        f.ts = 1 - smooth(F * 0.8, F * 1.7, home); f.rs = f.ts > f.s ? (reducedMotion ? 1.6 : 2.2) : (reducedMotion ? 0.35 : 0.45);
        f.s += (f.ts - f.s) * (1 - Math.exp(-f.rs / 60));
      }
      f.h = calmHabituate(f.h, dist + give, calmAlert(f, dist), !!f.shelter);
      calmVisitStep(o, f);
    }
    // Between steps (and for the look-ahead samples) the state keeps easing toward its goal.
    function fleeOffset(f, t, out) {
      var h = t - f.tick / 60, e = h > 0 ? Math.exp(-f.r * h) : 1;
      out.x = f.tx + (f.x - f.tx) * e; out.y = f.ty + (f.y - f.ty) * e; out.z = f.tz + (f.z - f.tz) * e;
      return out;
    }
    function shelterAt(f, t) { var h = t - f.tick / 60; return f.tick === null ? 0 : f.ts + (f.s - f.ts) * (h > 0 ? Math.exp(-f.rs * h) : 1); }
    function fleeFrom(o, t, out) {
      var f = o.flight, off = fleeOffset(f, t, flightScratch().a);
      calmVisitAt(o, f, out);
      out.x = clamp(out.x + off.x, -28, 28); out.y += off.y; out.z = clamp(out.z + off.z, -28, 28);
      if (f.shelter) { var s = shelterAt(f, t); if (s > 0.001) out.y -= s * Math.max(0, out.y - groundTop(out.x, out.z) - f.shelter); }
      return out;
    }
    // A station-holding fish turns to swim away while it flees, then faces back.
    function fleeBearing(o, rest) {
      var a = fleeOffset(o.flight, worldTime, flightScratch().a), b = fleeOffset(o.flight, worldTime + 0.3, flightScratch().b), fx = b.x - a.x, fz = b.z - a.z, v = Math.hypot(fx, fz) / 0.3;
      return v > 0.05 ? rest + wrapAngle(bearingTo(fx, fz) - rest) * smooth(0.05, 0.35, v) : rest;
    }
    // Facing into the current that brings the plankton, with a slow sway.
    function intoCurrent(x, z, ph) {
      var cur = { x: 0, z: 0, strength: 0 };
      return function (t) { currentAt(x, z, t, cur); return bearingTo(-cur.x, -cur.z) + 0.35 * Math.sin(0.13 * t + ph) + 0.12 * Math.sin(0.37 * t + ph * 2); };
    }
    // School members near the diver part around it and close up behind; the shift
    // is undone before every update, so a frozen (reduced motion) school never drifts.
    function partSchool(o) {
      var model = o.model, meshes = model && model.meshes;
      var base = flightBase(o);
      if (!(base > 0) || !Array.isArray(meshes) || !meshes.length || !meshes.every(function (m) { return m && m.isInstancedMesh; })) return;
      var body = meshes.filter(function (m) { return m.userData && m.userData.part === 'body'; })[0] || meshes[0], n = body.count, shift = new Float32Array(n * 3), inner = model.update, shifted = false;
      var inv = new T.Matrix4(), local = new T.Vector3();
      function move(sign) {
        meshes.forEach(function (m) {
          var a = m.instanceMatrix.array;
          for (var i = 0; i < Math.min(n, m.count); i++) { a[i * 16 + 12] += sign * shift[i * 3]; a[i * 16 + 13] += sign * shift[i * 3 + 1]; a[i * 16 + 14] += sign * shift[i * 3 + 2]; }
          m.instanceMatrix.needsUpdate = true;
        });
      }
      model.update = function (dt, t, motion) {
        if (shifted) { move(-1); shifted = false; }
        inner.call(model, dt, t, motion);
        local.copy(diverPos).applyMatrix4(inv.copy(o.root.matrix).invert());
        var R = Math.max(0.5, flightDistance(base, o.uid === focusedUid, o.flight ? o.flight.h : 0) * 0.75), a = body.instanceMatrix.array;
        if (local.length() > R + o.radius * 1.2) return;
        for (var i = 0; i < n; i++) {
          var dx = a[i * 16 + 12] - local.x, dy = a[i * 16 + 13] - local.y, dz = a[i * 16 + 14] - local.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz), push = d < R ? (R - d) * 0.8 / Math.max(d, 0.05) : 0;
          shift[i * 3] = dx * push; shift[i * 3 + 1] = dy * push * 0.6; shift[i * 3 + 2] = dz * push;
          if (push) shifted = true;
        }
        if (shifted) move(1);
      };
    }

    // ---- Planktivore clouds ------------------------------------------------------------
    // Clouds of anthias and chromis hover over the coral heads and thickets, more and
    // denser where the coral is alive. Each species is drawn as one instanced crowd
    // that borrows a school's meshes, shaders and fin strokes. The crowd is scenery,
    // not organisms (never in Nearby or the counts); a tap on one of its fish focuses
    // the nearest school of that species. Made on first use, like the flight scratch.
    var crowdKit;
    function crowdState() {
      return crowdKit || (crowdKit = { list: [], heads: [], M: new T.Matrix4(), W: new T.Matrix4(), Q: new T.Quaternion(), E: new T.Euler(0, 0, 0, 'YZX'),
        P: new T.Vector3(), S: new T.Vector3(), fwd: new T.Vector3(), cur: { x: 0, z: 0, strength: 0 } });
    }
    // How much living shelter the reef offers its planktivores (about 1 on the healthy site).
    function shelterIndex() { return clamp(health.coralCover / 0.5, 0, 1.1) * (1 - 0.45 * health.bleaching) * (1 - 0.4 * health.algae); }
    function crowdTemplate(o) {
      var meshes = o.model && o.model.meshes;
      if (!Array.isArray(meshes) || !meshes.length || !meshes.every(function (m) { return m && m.isInstancedMesh && m.instanceColor && m.geometry && m.geometry.attributes.reefSchoolBeat; })) return null;
      var body = meshes.filter(function (m) { return m.userData && m.userData.part === 'body'; })[0];
      return body && body.count > 0 ? { meshes: meshes, body: body } : null;
    }
    // The school body is a lofted tube: crowd fish skip every second ring and side
    // of it, far ones more. Any other layout keeps its own index.
    function thinBody(g, coarse) {
      var idx = g.index, V = g.attributes.position.count;
      if (!idx || idx.count < 12) return idx;
      var a = idx.array, na = a[2] - 1, nx = (V - 2) / (na + 1) - 1;
      if (na < 2 || nx !== Math.round(nx) || nx < 2 || idx.count !== (nx + 1) * na * 6) return idx;
      var sr = coarse && nx % 3 === 0 && nx >= 12 ? 3 : nx % 2 === 0 && nx >= 8 ? 2 : 1, out = [], r, c;
      var sa = na % 2 === 0 && na >= 8 ? 2 : coarse && na % 3 === 0 && na >= 9 ? 3 : 1;
      if (sr === 1 && sa === 1) return idx;
      for (r = 0; r < nx; r += sr) for (c = 0; c < na; c += sa) { var i0 = r * (na + 1) + c, j0 = i0 + sr * (na + 1); out.push(i0, i0 + sa, j0, i0 + sa, j0 + sa, j0); }
      for (c = 0; c < na; c += sa) out.push(c + sa, c, V - 2, nx * (na + 1) + c, nx * (na + 1) + c + sa, V - 1);
      return new T.BufferAttribute(V > 65535 ? new Uint32Array(out) : new Uint16Array(out), 1);
    }
    // Every coral head may hold a cloud: the big heads mostly the larger planktivore
    // (anthias), the knolls and thickets mostly the smaller one (chromis). Living,
    // unbleached coral (the shelter index) sets how many clouds there are and how
    // full; a species with fewer schools on the site (lower abundance) has fewer.
    // Plans are made for the high tier; the light tier keeps a subset with fewer fish.
    function joinCrowd(o) {
      var K = crowdState();
      if (K.planned) return;
      K.planned = true;
      var S = Math.min(1, shelterIndex()), kinds = {}, ids = [], salt = (seed % 65521 + 65521) % 65521;
      organisms.forEach(function (x) {
        if (!x.planktivore || !x.path) return;
        if (!kinds[x.speciesId]) { kinds[x.speciesId] = { id: x.speciesId, tpl: null, L: x.info.lengthM, clouds: [], fish: [], schools: 0 }; ids.push(x.speciesId); }
        var kind = kinds[x.speciesId];
        kind.schools++;
        if (!kind.tpl && (kind.tpl = crowdTemplate(x))) kind.tpl.owner = x;
        K.heads.push([x.home.x, x.home.z]);
      });
      ids = ids.filter(function (id) { return kinds[id].tpl; }).sort(function (a, b) { return kinds[b].L - kinds[a].L || (a < b ? -1 : 1); });
      if (!ids.length) return;
      // size: 2 a big head, 1 a knoll, 0 a branching thicket. Rolls hash the spot, so
      // a thicket that both tiers draw gets the same cloud on both.
      function place(x0, z0, r, size) {
        var key = salt + Math.round(x0 * 37) * 7919 + Math.round(z0 * 37) * 104729, h = function (s) { return hash2(key, s); };
        if (Math.abs(x0) > 26 || Math.abs(z0) > 26) return;
        var pick = ids.length < 2 ? 0 : h(2) < 0.75 ? (size === 2 ? 0 : ids.length - 1) : (size === 2 ? 1 + Math.floor(h(3) * (ids.length - 1)) : Math.floor(h(3) * (ids.length - 1)));
        var kind = kinds[ids[pick]];
        if (h(1) > [0.5, 0.95, 1][size] * S * Math.sqrt(S) * Math.sqrt(Math.min(1, kind.schools / 3))) return;
        var px = x0 + (h(4) - 0.5) * 0.3 * r, pz = z0 + (h(5) - 0.5) * 0.3 * r;
        if (K.heads.some(function (u) { return Math.hypot(u[0] - px, u[1] - pz) < (size ? 1.8 : 2.4); })) return;
        K.heads.push([px, pz]);
        var nHigh = Math.max(4, Math.round([5 + 8 * S, 8 + 14 * S, 16 + 34 * S][size] * (0.7 + 0.6 * h(6)))), n = high ? nHigh : Math.max(3, Math.round(nHigh * 0.6));
        if (!high && h(7) > 0.75) return;
        var R = Math.min(Math.max(0.3, r * (size === 2 ? 0.75 : 0.9)), 0.25 + 0.08 * Math.sqrt(n)), Ry = 0.14 + 0.03 * Math.sqrt(n), top = -Infinity;
        for (var s = 0; s < 7; s++) top = Math.max(top, groundTop(px + (s ? Math.cos(s * TAU / 6) * R : 0), pz + (s ? Math.sin(s * TAU / 6) * R : 0)));
        // Anthias hang higher in the water column than chromis over their thicket.
        var alt = Math.min([0.15 + 0.3 * h(8), 0.4 + 0.6 * h(8), 0.8 + 1.2 * h(8)][size] + Ry * 0.5, SURFACE_Y - 0.6 - Ry - top);
        if (alt < 0.15) return;
        var cl = { x: px, z: pz, top: top, alt: alt, R: R, Ry: Ry, first: kind.fish.length / 7, n: n, a: 0, ta: 0, r: 0, ph: h(9) * TAU };
        // Per fish: spiral radius and angle, height, phase, rate, size, heading offset.
        for (var k = 0; k < n; k++) {
          kind.fish.push(Math.sqrt((k + 0.5) / n), k * 2.39996 + cl.ph, (hash2(key + k, 3) - 0.5) * 2 * (1 - 0.4 * Math.sqrt((k + 0.5) / n)), hash2(key + k, 5) * TAU,
            0.8 + 0.45 * hash2(key + k, 7), 0.85 + 0.3 * hash2(key + k, 11), (hash2(key + k, 13) - 0.5) * 0.5);
        }
        kind.clouds.push(cl);
      }
      bommies.forEach(function (b) { place(b.x, b.z, b.r, b.r >= 1.4 ? 2 : 1); });
      decorKinds.forEach(function (dk) {
        if (dk.kind !== 'finger' && dk.kind !== 'antler' && dk.kind !== 'corym') return;
        for (var k = 0; k < dk.n; k++) if (dk.p[k * 4 + 3] >= 0.25) place(dk.p[k * 4], dk.p[k * 4 + 2], dk.p[k * 4 + 3], 0);
      });
      ids.forEach(function (id) { if (kinds[id].clouds.length) buildCrowd(K, kinds[id]); });
      // The crowd moves with the shared prototypes: every frame, never while paused.
      if (K.list.length) protos.push({ update: function (dt) { updateCrowds(dt); }, dispose: function () { K.list.length = 0; } });
    }
    function buildCrowd(K, kind) {
      var tpl = kind.tpl, cap = kind.fish.length / 7, nT = Math.min(24, tpl.body.count), white = new T.Color(1, 1, 1), parts = [];
      var beat = new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4), farBeat = new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
      beat.setUsage(T.DynamicDrawUsage); farBeat.setUsage(T.DynamicDrawUsage);
      // Close fish draw every part, nearer ones the body and tail, far ones a coarser body.
      tpl.meshes.concat([tpl.body]).forEach(function (src, si) {
        var g = own(new T.BufferGeometry()), sg = src.geometry, isBody = src === tpl.body, far = si === tpl.meshes.length, part = far ? 'body-far' : src.userData.part || '';
        Object.keys(sg.attributes).forEach(function (name) { if (name !== 'reefSchoolBeat') g.setAttribute(name, sg.attributes[name]); });
        g.setAttribute('reefSchoolBeat', far ? farBeat : beat); g.setIndex(isBody ? thinBody(sg, far) : sg.index); g.computeBoundingSphere();
        var im = new T.InstancedMesh(g, src.material, cap);
        im.instanceMatrix.setUsage(T.DynamicDrawUsage); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = src.receiveShadow;
        for (var i = 0; i < cap; i++) im.setColorAt(i, white);
        im.instanceColor.setUsage(T.DynamicDrawUsage); im.count = 0; im.visible = false;
        im.name = 'reef-explore-ambient'; im.userData = { speciesId: kind.id, ambient: true, part: part, fish: cap, clouds: kind.clouds.length };
        orgRoot.add(im);
        // Fins and eyes ride on the body; the tail and pectorals keep their own strokes.
        var same = true, sa = src.instanceMatrix.array, ba = tpl.body.instanceMatrix.array;
        for (var e = 0; e < nT * 16 && same; e++) if (sa[e] !== ba[e]) same = false;
        parts.push({ mesh: im, src: src, role: far ? 'far' : isBody || part === 'tail' ? 'mid' : 'close', same: same, A: same ? null : new Float32Array(nT * 16) });
      });
      K.list.push({ id: kind.id, owner: tpl.owner, body: tpl.body, parts: parts, beat: beat, farBeat: farBeat, clouds: kind.clouds, fish: new Float32Array(kind.fish), cap: cap, nT: nT, L: kind.L,
        base: flightBase(tpl.owner), tick: null, pos: new Float32Array(cap * 3), drawn: 0, still: false, close: [], near: [], away: [] });
    }
    // The crowd's share of the slicing: an unseen school lends its strokes on the light
    // tier every 2nd frame (more on a slow device), and the governor's density (gov.crowd)
    // keeps an even subset of every cloud's fish, the same fish at any frame.
    function perfStrokes(c, unseen, dt) {
      c.perfAcc = (c.perfAcc || 0) + dt;
      var n = unseen ? (high ? 1 : 2) * gov.slice : 1;
      if (n > 1 && (perfFrame + c.cap) % n !== 0) return -1;
      var step = c.perfAcc; c.perfAcc = 0;
      return step;
    }
    function perfCrowdKeeps(k) { return gov.crowd >= 1 || (k * 0.618034) % 1 < gov.crowd; }
    function updateCrowds(dt) {
      var K = crowdState(), half = Math.min(Math.PI * 0.95, Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.hypot(1, camera.aspect)) + 0.45), cosHalf = Math.cos(half);
      camera.getWorldDirection(K.fwd);
      // The crowd's reach answers to its own stage of the governor (after the decor's).
      K.list.forEach(function (c) { updateCrowd(K, c, dt, cosHalf, (high ? 15 : 12) * (0.5 + 0.5 * gov.crowd)); });
    }
    function updateCrowd(K, c, dt, cosHalf, reach) {
      var t = worldTime, k = Math.floor(t * 60 + 1e-6), i, j, p, cl, F = flightDistance(c.base, false), calm = reducedMotion ? 0.5 : 1;
      // The borrowed strokes keep beating while the school itself is out of sight.
      var owner = c.owner, unseen = owner.root && !owner.root.visible, beat = perfStrokes(c, unseen, dt);
      if (unseen && !c.still && beat >= 0) { try { owner.model.update(beat * (reducedMotion ? 0.45 : 1), t, owner.motion); } catch (ignore) {} }
      var ba = c.body.instanceMatrix.array;
      if (!c.still && beat >= 0) for (p = 0; p < c.parts.length; p++) {
        var part = c.parts[p]; if (part.same) continue;
        var sa = part.src.instanceMatrix.array;
        for (j = 0; j < c.nT; j++) K.M.fromArray(ba, j * 16).invert().multiply(K.W.fromArray(sa, j * 16)).toArray(part.A, j * 16);
      }
      // A reduced-motion school never moves its members, so its strokes are read once.
      c.still = reducedMotion;
      // Each cloud's alarm: it sinks into its coral and draws together as the diver
      // comes close, and rises again once the diver has passed. A cloud that has grown
      // used to a calm diver (calmHabituate) lets it come much closer.
      if (c.tick === null) c.tick = k;
      for (var tk = Math.max(c.tick + 1, k - 29); tk <= k; tk++) {
        for (i = 0; i < c.clouds.length; i++) {
          cl = c.clouds[i];
          var dd = Math.hypot(cl.x - diverPos.x, cl.top + cl.alt - diverPos.y, cl.z - diverPos.z) - cl.R * 0.7, Fc = F * calmFactor(cl.h);
          var threat = encounterCue(owner.info.lengthM, cl.x, cl.top + cl.alt, cl.z, tk / 60, owner.uid);
          cl.ta = Math.max(1 - smooth(Fc * 0.8, Fc * 1.5, dd), threat ? threat.amount * (reducedMotion ? 0.35 : 1) : 0);
          cl.r = cl.ta > cl.a ? (reducedMotion ? 1.6 : 2.2) : (reducedMotion ? 0.35 : 0.45);
          cl.a += (cl.ta - cl.a) * (1 - Math.exp(-cl.r / 60));
          cl.h = calmHabituate(cl.h, dd, dd < Fc * 0.8, true);
        }
      }
      c.tick = Math.max(c.tick, k);
      // Which clouds are drawn, and in how much detail.
      var h = t - c.tick / 60, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, nearD = high ? 7 : 5;
      c.close.length = 0; c.near.length = 0; c.away.length = 0;
      for (i = 0; i < c.clouds.length; i++) {
        cl = c.clouds[i];
        cl.now = cl.ta + (cl.a - cl.ta) * (h > 0 ? Math.exp(-cl.r * h) : 1);
        var sway = t * 0.35 - cl.x * 0.075 - cl.z * 0.055;
        cl.ox = cl.x + 0.1 * Math.sin(sway) * calm; cl.oz = cl.z + 0.065 * Math.sin(sway + 0.4) * calm; cl.oy = cl.top + cl.alt * (1 - 0.85 * cl.now);
        var dx = cl.ox - cx, dy = cl.oy - cy, dz = cl.oz - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d - cl.R > reach) continue;
        if (d > cl.R + 1.5 && dx * K.fwd.x + dy * K.fwd.y + dz * K.fwd.z < cosHalf * d - cl.R) continue;
        // Small fish fade into the haze by shrinking over the last few metres, and
        // every second fish of a far cloud shrinks away first.
        cl.fade = 0.35 + 0.65 * clamp((reach - (d - cl.R)) / 3, 0, 1); cl.thin = smooth(reach * 0.45, reach * 0.75, d - cl.R);
        (d - cl.R < 3.5 ? c.close : d - cl.R < nearD ? c.near : c.away).push(i);
      }
      var n = 0, nClose = 0, nNear = 0, bodyColor = c.body.instanceColor.array, srcBeat = c.body.geometry.attributes.reefSchoolBeat.array;
      for (var pass = 0; pass < 3; pass++) {
        var list = pass === 0 ? c.close : pass === 1 ? c.near : c.away;
        for (var li = 0; li < list.length; li++) {
          cl = c.clouds[list[li]];
          var a = cl.now, R = cl.R * (1 - 0.35 * a), Ry = cl.Ry * (1 - 0.5 * a), ox = cl.ox, oy = cl.oy, oz = cl.oz;
          currentAt(cl.x, cl.z, t, K.cur);
          var face = bearingTo(-K.cur.x, -K.cur.z);
          for (var f = cl.first; f < cl.first + cl.n && n < c.cap; f++) {
            var size = c.fish[f * 7 + 5] * cl.fade * ((f - cl.first) & 1 ? 1 - cl.thin : 1);
            if (size < 0.05 || !perfCrowdKeeps(f - cl.first)) continue;
            var q = f * 7, ru = c.fish[q] * R, th = c.fish[q + 1], ph = c.fish[q + 3], w = c.fish[q + 4];
            var x = ox + ru * Math.cos(th) + 0.07 * calm * Math.sin(t * 0.9 * w + ph), y = oy + c.fish[q + 2] * Ry + 0.035 * calm * Math.sin(t * 0.7 * w + 2 * ph), z = oz + ru * Math.sin(th) + 0.06 * calm * Math.cos(t * 0.8 * w + 1.3 * ph);
            var yaw = face + c.fish[q + 6] + calm * (0.3 * Math.sin(t * 0.23 * w + ph) + 0.1 * Math.sin(t * 0.61 + 2 * ph)), dart = 0.05 * calm * Math.sin(t * 1.3 * w + 3 * ph);
            x += fwdX(yaw) * dart; z += fwdZ(yaw) * dart;
            if (y < cl.top + 0.1) y = Math.max(y, groundTop(x, z) + 0.04);
            y = Math.min(y, SURFACE_Y - 0.3);
            K.E.set(0, yawFor(yaw), 0.12 * calm * Math.sin(t * 0.5 * w + ph)); K.Q.setFromEuler(K.E);
            K.W.compose(K.P.set(x, y, z), K.Q, K.S.setScalar(size));
            j = f % c.nT;
            for (p = 0; p < c.parts.length; p++) {
              var pp = c.parts[p], at = pp.role === 'far' ? n - nNear : n, pa = pp.mesh.instanceMatrix.array;
              if (pass === 2 ? pp.role !== 'far' : pp.role === 'far' || pass === 1 && pp.role === 'close') continue;
              if (pp.same) K.W.toArray(pa, at * 16);
              else K.M.fromArray(pp.A, j * 16).premultiply(K.W).toArray(pa, at * 16);
              if (pp.src === c.body) { var col = pp.mesh.instanceColor.array; col[at * 3] = bodyColor[j * 3]; col[at * 3 + 1] = bodyColor[j * 3 + 1]; col[at * 3 + 2] = bodyColor[j * 3 + 2]; }
            }
            for (p = 0; p < 4; p++) { c.beat.array[n * 4 + p] = srcBeat[j * 4 + p]; if (pass === 2) c.farBeat.array[(n - nNear) * 4 + p] = srcBeat[j * 4 + p]; }
            c.pos[n * 3] = x; c.pos[n * 3 + 1] = y; c.pos[n * 3 + 2] = z;
            n++;
          }
        }
        if (pass === 0) nClose = n;
        if (pass === 1) nNear = n;
      }
      c.drawn = n;
      c.parts.forEach(function (pp) {
        var m = pp.mesh, count = pp.role === 'close' ? nClose : pp.role === 'mid' ? nNear : n - nNear; m.count = count; m.visible = count > 0;
        m.instanceMatrix.updateRange.offset = 0; m.instanceMatrix.updateRange.count = Math.max(16, count * 16); m.instanceMatrix.needsUpdate = true;
        if (pp.src === c.body) { m.instanceColor.updateRange.offset = 0; m.instanceColor.updateRange.count = Math.max(3, count * 3); m.instanceColor.needsUpdate = true; }
      });
      c.beat.updateRange.offset = 0; c.beat.updateRange.count = Math.max(4, nNear * 4); c.beat.needsUpdate = true;
      c.farBeat.updateRange.offset = 0; c.farBeat.updateRange.count = Math.max(4, (n - nNear) * 4); c.farBeat.needsUpdate = true;
    }
    // A tap on a crowd fish (within a few pixels) focuses the nearest school of its species, if one is within reach.
    function pickAmbient(ray, wall, h) {
      var list = crowdState().list;
      if (!list.length) return null;
      var perPx = 2 * Math.tan(camera.fov * Math.PI / 360) / h, o = ray.origin, dir = ray.direction, hit = null, hitAlong = Infinity;
      list.forEach(function (c) {
        for (var i = 0; i < c.drawn; i++) {
          var x = c.pos[i * 3] - o.x, y = c.pos[i * 3 + 1] - o.y, z = c.pos[i * 3 + 2] - o.z, along = x * dir.x + y * dir.y + z * dir.z;
          if (along <= 0 || along > wall || along >= hitAlong) continue;
          var r = Math.max(c.L * 0.6, along * perPx * 8);
          if (x * x + y * y + z * z - along * along <= r * r) { hitAlong = along; hit = { id: c.id, x: c.pos[i * 3], y: c.pos[i * 3 + 1], z: c.pos[i * 3 + 2] }; }
        }
      });
      if (!hit) return null;
      var best = null, bestD = 20;
      organisms.forEach(function (x) {
        if (x.speciesId !== hit.id || !x.center) return;
        var d = Math.hypot(x.center.x - hit.x, x.center.y - hit.y, x.center.z - hit.z);
        if (d < bestD) { bestD = d; best = x; }
      });
      return best;
    }

    // ---- Decorative reef (non-pickable; seeded, draw counts fixed per slot) -------
    function buildDecor() {
      // Stream 203 keeps its first two draws, so the prevailing current (fan
      // orientation) is unchanged; every other decor roll is a hash.
      var lists = {}, F = cover(), P = palette(), rg = stream(seed, 203); rg(); rg();
      var current = rg() * Math.PI;
      // Clearance belongs to the terrain and pickable organisms. Using the live
      // navigation grid here made every newly planted coral exclude its neighbours:
      // the result was a sparse, evenly spaced orchard instead of an interlocking reef.
      // Keep stamping the live grid for safe swimming, but let colony crowns meet.
      var substrateTop = new Float32Array(obstacle);
      function substrateClear(x, z, y) {
        var fx = clamp((x - GRID_MIN) / GRID_STEP, 0, GRID_N - 1), fz = clamp((z - GRID_MIN) / GRID_STEP, 0, GRID_N - 1);
        var i = Math.min(GRID_N - 2, Math.floor(fx)), j = Math.min(GRID_N - 2, Math.floor(fz)), k = j * GRID_N + i;
        return Math.max(substrateTop[k], substrateTop[k + 1], substrateTop[k + GRID_N], substrateTop[k + GRID_N + 1]) <= y + 0.15;
      }
      var algae = health.algae, damage = F.damage, salt = (seed % 99991 + 99991) % 99991;
      // Every roll is a hash of the patch (or slot) and a purpose, so skipping an
      // item on the light tier never shifts another.
      function hr(k, s) { return hash2(k * 31 + s, salt + s * 4111); }
      // Rubble carries pink coralline on a healthy reef, a brown turf on a damaged one.
      var RUBBLE_C = [lerp(0.78, 0.5, damage), lerp(0.68, 0.46, damage), lerp(0.64, 0.32, damage)];
      // Footprint radius of each prototype at scale 1, so a colony can be sized to its patch.
      var BRANCH_CAP = { finger: 1.15, antler: 1.35, corym: 1.3 };
      var KIND_R = { finger: 0.33, antler: 0.38, corym: 0.37, table: 0.46, massive: 0.4, brain: 0.4, plate: 0.42, encrust: 0.4, deadstand: 0.36 };
      var ZONES = [
        [['finger', 0.19], ['antler', 0.11], ['corym', 0.15], ['table', 0.15], ['massive', 0.2], ['brain', 0.09], ['plate', 0.05], ['encrust', 0.06]],
        [['antler', 0.19], ['finger', 0.11], ['corym', 0.09], ['table', 0.14], ['massive', 0.17], ['brain', 0.11], ['plate', 0.13], ['encrust', 0.06]],
        [['plate', 0.32], ['encrust', 0.12], ['massive', 0.24], ['brain', 0.12], ['antler', 0.08], ['table', 0.12]]];
      function weighted(list, f) { for (var q = 0, acc = 0; q < list.length; q++) { acc += list[q][1]; if (f < acc) return list[q][0]; } return list[list.length - 1][0]; }
      // A third of the patches join the growth form of their neighbourhood, so
      // thickets and plate gardens form among an otherwise mixed community.
      function formFor(k, depth, steep, alt) {
        var f = hr(k, alt ? 41 : 3);
        if (steep) return f < 0.34 ? 'plate' : f < 0.9 ? 'encrust' : 'massive';
        if (!alt && hr(k, 4) < 0.34) f = hash2(Math.floor(F.cx[k] / 3.4 + 40) * 131 + Math.floor(F.cz[k] / 3.4 + 40), salt + 7);
        return weighted(ZONES[depth < 6.5 ? 0 : depth < 12 ? 1 : 2], f);
      }
      function colonyColor(k, form, st, roll) {
        var c1 = roll === undefined ? F.roll[k * 4 + 1] : roll, c2 = F.roll[k * 4 + 2];
        // Bleached tissue is stark white, some with a pale fluorescent sheen.
        if (st === BLEACHED) return c2 < 0.6 ? P.white : pickC(P.sheen, c1);
        // A recently dead skeleton greys under a creeping film of turf.
        if (st === FRESH) { var sk = pickC(P.skeleton, c1), tf = pickC(P.turf, c2), fw = 0.2 + 0.6 * algae; return [lerp(sk[0], tf[0] * 2.2, fw), lerp(sk[1], tf[1] * 2.2, fw), lerp(sk[2], tf[2] * 2.2, fw)]; }
        var c = pickC(P.form[form], c1), sh = 0.88 + 0.24 * c2;
        return [c[0] * sh, c[1] * sh, c[2] * sh];
      }
      function add(kind, x, y, z, yaw, sx, sy, sz, color, tx, tz, tier, skeleton) {
        var tall = DECOR_H[kind] * sy > 0.42;
        // Obstacles never depend on the tier, so the diver and fish move the same on both.
        if (tall) stampTop(x, z, 0.38 * Math.max(sx, sz), y + DECOR_H[kind] * sy * 0.9);
        // The light tier keeps every large colony and thins the small ones.
        if (!high && (tall ? tier > 0.6 && DECOR_H[kind] * sy < 0.62 : tier > 0.36)) return;
        (lists[kind] = lists[kind] || []).push([x, y, z, yaw, sx, sy, sz, color, tx || 0, tz || 0, skeleton || 0]);
      }
      function floorTilt(x, z, out) {
        out[0] = clamp(-(terrain.floorY(x + 0.16, z) - terrain.floorY(x - 0.16, z)) / 0.32, -0.85, 0.85);
        out[1] = clamp(-(terrain.floorY(x, z + 0.16) - terrain.floorY(x, z - 0.16)) / 0.32, -0.85, 0.85);
        return out;
      }
      var tilt = [0, 0];
      // One colony sized to fill (and slightly overlap) its patch: colonies touch.
      // k picks the patch colour (roll overrides it), jk the slot's own size and turn.
      function colony(form, st, k, x, y, z, rt, tx, tz, tier, roll, jk, head) {
        if (jk === undefined) jk = k * 3 + (roll === undefined ? 0 : 1);
        var j1 = hr(jk, 21), j2 = hr(jk, 22), s = rt / KIND_R[form], yaw = hr(jk, 23) * TAU;
        var tallness = form === 'encrust' ? 1.1 + 0.7 * j1 : form === 'massive' ? 0.75 + 0.45 * j1 : form === 'brain' ? 0.7 + 0.3 * j1 : form === 'plate' ? 0.72 + 0.3 * j1 : form === 'table' ? 0.8 + 0.35 * j1 : 0.85 + 0.35 * j1;
        // A recently dead colony keeps its shape for a while, then breaks.
        if (st === FRESH) tallness *= 0.8;
        var anchor = form === 'massive' || form === 'brain' || form === 'encrust' ? 0.7 : form === 'plate' ? 0.4 : 0.28, c = colonyColor(k, form, st, roll), cap = BRANCH_CAP[form];
        // A wide branching patch is a thicket of several colonies, not one
        // colony with swollen branches.
        if (cap && s > cap * 1.15) {
          var parts = s > cap * 1.7 ? 3 : 2, sub = s / Math.sqrt(parts) * 1.1;
          for (var q = 0; q < parts; q++) {
            var pa = yaw + q * TAU / parts, pd = rt * 0.42, ps = Math.min(cap, sub) * (0.85 + 0.3 * hr(jk * 4 + q, 24)), px = x + Math.cos(pa) * pd, pz = z + Math.sin(pa) * pd;
            var py = head ? head.heightAt(px, pz) : terrain.floorY(px, pz);
            add(form, px, (py > NONE && Math.abs(py - y) < 0.6 ? py : y) - 0.025 * ps, pz, yaw + q * 2.1, ps, ps * tallness, ps, c, tx * anchor, tz * anchor, q ? hr(jk * 4 + q, 25) : tier, st === FRESH ? 1 : 0);
          }
          return;
        }
        add(form, x, y - 0.025 * s, z, yaw, s * (0.9 + 0.2 * j2), s * tallness, s * (1.1 - 0.2 * j2), c, tx * anchor, tz * anchor, tier, st === FRESH ? 1 : 0);
      }
      function companions(k, x, y, z, depth, st, onHead) {
        // Soft corals, fans and sponges live among the hard corals on every
        // healthy patch, whatever the hard-coral cover.
        var u = hr(k, 50), a = hr(k, 51) * TAU, d = 0.38 * F.size, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        var pSoft = 0.05 + 0.1 * vitality, pFan = depth > 6 ? 0.025 + 0.04 * vitality : 0, pSponge = 0.04;
        if (u > pSoft + pFan + pSponge) return;
        var py = onHead ? onHead.heightAt(px, pz) : terrain.floorY(px, pz);
        if (!(py > NONE) || isBlocked(px, pz) || (!onHead && !substrateClear(px, pz, py))) return;
        var s = 0.7 + 0.6 * hr(k, 52), soft = st === BLEACHED ? (hr(k, 53) < 0.7 ? P.white : pickC(P.sheen, hr(k, 54))) : pickC(P.soft, hr(k, 54));
        if (u < pSoft) add('soft', px, py - 0.02, pz, a, s, s * (0.8 + 0.4 * hr(k, 55)), s, soft, 0, 0, hr(k, 56));
        else if (u < pSoft + pFan) add('fan', px, py - 0.03, pz, current + (hr(k, 55) - 0.5) * 0.8, 0.7 + 0.7 * hr(k, 52), 0.75 + 0.7 * hr(k, 52), 0.8 + 0.5 * hr(k, 52), pickC(P.fan, hr(k, 54)), 0, 0, hr(k, 56));
        else add('sponge', px, py - 0.02, pz, a, s, s * (0.8 + 0.6 * hr(k, 55)), s, pickC(P.sponge, hr(k, 54)), 0, 0, hr(k, 56));
      }
      function seaweed(k, n, x, z, spread, base, onHead) {
        for (var q = 0; q < n; q++) {
          var a = hr(k, 60 + q) * TAU, d = spread * Math.sqrt(hr(k, 64 + q)), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
          var py = onHead ? onHead.heightAt(px, pz) : terrain.floorY(px, pz);
          if (!(py > NONE) || isBlocked(px, pz) || (!onHead && !substrateClear(px, pz, py))) continue;
          var s = (0.85 + 0.65 * hr(k, 68 + q)) * base, c = pickC(P.weed, hr(k, 72 + q)), sh = 0.85 + 0.3 * hr(k, 76 + q);
          add('algae', px, py - 0.01, pz, a * 1.7, s * 1.15, s * (0.85 + 0.5 * hr(k, 80 + q)), s * 1.15, [c[0] * sh, c[1] * sh, c[2] * sh], 0, 0, hr(k, 84 + q));
        }
      }
      function rubblePieces(k, n, x, z, spread, onHead) {
        for (var q = 0; q < n; q++) {
          var a = hr(k, 90 + q) * TAU, d = spread * Math.sqrt(hr(k, 94 + q)), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
          var py = onHead ? onHead.heightAt(px, pz) : terrain.floorY(px, pz);
          if (!(py > NONE) || isBlocked(px, pz)) continue;
          var s = 1.3 + 0.9 * hr(k, 98 + q);
          add('rubble', px, py + 0.005, pz, a * 2.3, s, s, s, RUBBLE_C, 0, 0, hr(k, 102 + q));
        }
      }
      // A natural rubble patch on a healthy reef is already being recolonised.
      var rec = restoration ? 0.08 + 0.5 * growth : 0.06 + 0.5 * health.coralCover * (1 - damage), rubKeep = restoration ? 1 - 0.55 * growth : 1 - 0.4 * health.coralCover * (1 - damage);
      // ---- The reef floor between the coral heads, one patch at a time.
      for (var k = 0; k < F.n * F.n; k++) {
        var st = F.state[k], x = F.cx[k], z = F.cz[k];
        if (Math.abs(x) > 31 || Math.abs(z) > 31 || F.onReef[k] === 2) continue;
        var y = terrain.floorY(x, z), depth = -y, tierK = hr(k, 5);
        if (st === SAND) { if (hr(k, 6) < 0.03) rubblePieces(k, 1, x, z, 0.4); continue; }
        floorTilt(x, z, tilt);
        var open = !isBlocked(x, z) && substrateClear(x, z, y);
        if (st === LIVE || st === BLEACHED || st === FRESH) {
          var form = formFor(k, depth, false);
          if (st === FRESH && !(form === 'finger' || form === 'antler' || form === 'table' || form === 'corym')) form = hr(k, 7) < 0.5 ? 'antler' : 'table';
          var rt = F.size * (0.5 + 0.2 * hr(k, 8)) * ((form === 'massive' || form === 'table' || form === 'brain') && hr(k, 9) < 0.07 ? 1.7 : form === 'encrust' ? 0.7 : 1);
          if (open) colony(form, st, k, x + (hr(k, 10) - 0.5) * 0.2, y, z + (hr(k, 11) - 0.5) * 0.2, rt, tilt[0], tilt[1], tierK);
          // A second, smaller colony of another kind shares most patches.
          if (hr(k, 12) < 0.6) {
            var a2 = hr(k, 13) * TAU, d2 = 0.42 * F.size, x2 = x + Math.cos(a2) * d2, z2 = z + Math.sin(a2) * d2, y2 = terrain.floorY(x2, z2), f2 = hr(k, 14);
            var form2 = f2 < 0.3 ? 'encrust' : f2 < 0.6 ? 'massive' : f2 < 0.75 ? 'brain' : st === FRESH ? 'antler' : 'finger';
            if (!isBlocked(x2, z2) && substrateClear(x2, z2, y2) && terrain.sandMask(x2, z2) < 0.4) colony(form2, st, k, x2, y2, z2, F.size * (0.24 + 0.12 * hr(k, 15)), tilt[0], tilt[1], hr(k, 16), hr(k, 17));
          }
          if (st !== FRESH) companions(k, x, y, z, depth, st, null);
        } else if (st === MACRO) seaweed(k, 2 + (hr(k, 7) < 0.55 ? 1 : 0), x, z, 0.42 * F.size, 1.35);
        else if (st === RUBBLE) {
          var inPatch = terrain.rubbleMask(x, z) > 0.5;
          // Restoration frames stabilise the rubble; recruits settle as they grow.
          if (hr(k, 7) < (inPatch ? rec : 0.06)) colony(hr(k, 8) < 0.4 ? 'finger' : hr(k, 8) < 0.65 ? 'corym' : hr(k, 8) < 0.85 ? 'massive' : 'encrust', LIVE, k, x, y, z, F.size * (inPatch && restoration ? 0.18 + 0.32 * growth : 0.22) * (0.8 + 0.4 * hr(k, 9)), 0, 0, tierK);
          if (hr(k, 10) < rubKeep) rubblePieces(k, inPatch ? 3 : 2 + (hr(k, 11) < damage ? 1 : 0), x, z, 0.45 * F.size);
          // Broken stands of dead branching coral stick out of a storm-rubble field.
          if (!inPatch && hr(k, 12) < 0.25 * damage && !isBlocked(x, z)) add('deadstand', x, y - 0.03, z, hr(k, 13) * TAU, 0.9 + 0.5 * hr(k, 14), 0.7 + 0.4 * hr(k, 15), 0.9 + 0.5 * hr(k, 14), pickC(P.turf, hr(k, 16)), tilt[0] * 0.3, tilt[1] * 0.3, tierK);
        } else if (st === ROCK) {
          var u = hr(k, 7);
          // Long-dead framework: eroded stands of branching coral under turf.
          if (open && u < 0.08 + 0.5 * damage) add('deadstand', x, y - 0.03, z, hr(k, 8) * TAU, 1.1 + 0.6 * hr(k, 9), 0.9 + 0.5 * hr(k, 10), 1.1 + 0.6 * hr(k, 9), pickC(P.turf, hr(k, 11)), tilt[0] * 0.3, tilt[1] * 0.3, tierK);
          else if (open && u < 0.2 + 0.5 * damage) add('rock', x, y - 0.04, z, hr(k, 8) * TAU, 0.6 + 0.4 * hr(k, 9), 0.4 + 0.4 * hr(k, 10), 0.6 + 0.4 * hr(k, 9), [0.95, 0.93, 0.9], 0, 0, tierK);
          if (algae > 0.15 && hr(k, 12) < algae) seaweed(k, 1, x, z, 0.4 * F.size, 0.8);
          companions(k, x, y, z, depth, ROCK, null);
        } else if (st === LIFE && open) {
          var v = hr(k, 7), s = 0.9 + 0.6 * hr(k, 8);
          if (v < 0.45 || depth < 5.5 && v < 0.75) add('soft', x, y - 0.02, z, hr(k, 9) * TAU, s * 1.1, s * (0.9 + 0.4 * hr(k, 10)), s * 1.1, pickC(P.soft, hr(k, 11)), 0, 0, tierK);
          else if (v < 0.75) add('sponge', x, y - 0.02, z, hr(k, 9) * TAU, s * 1.2, s * (0.9 + 0.5 * hr(k, 10)), s * 1.2, pickC(P.sponge, hr(k, 11)), 0, 0, tierK);
          else add('fan', x, y - 0.03, z, current + (hr(k, 9) - 0.5) * 0.85, 0.8 + 0.7 * hr(k, 10), 0.8 + 0.7 * hr(k, 10), 0.8 + 0.5 * hr(k, 10), pickC(P.fan, hr(k, 11)), 0, 0, tierK);
        }
      }
      // ---- Colonies crowd every coral head: crowns on top, shelves and crusts on its flanks.
      bommies.forEach(function (bm, bi) {
        var area = Math.PI * bm.r * bm.r * (1 + 0.45 * (bm.h / bm.r) * (bm.h / bm.r)), slots = Math.max(6, Math.round(area / 0.42)), spacing = Math.sqrt(area / slots), w = {};
        for (var q = 0; q < slots; q++) {
          var sk = 500000 + bi * 1000 + q, a = q * 2.39996323 + bm.ph + 0.5 * hr(sk, 1), e = bm.edge(a) * 0.97 * Math.pow((q + 0.3 + 0.4 * hr(sk, 2)) / slots, 0.42), lx = Math.cos(a) * e, lz = Math.sin(a) * e; bm.toWorld(lx, lz, w);
          var y2 = bm.heightLocal(lx, lz);
          if (!(y2 > NONE) || isBlocked(w.x, w.z)) continue;
          var hx1 = bm.heightAt(w.x + 0.12, w.z), hx0 = bm.heightAt(w.x - 0.12, w.z), hz1 = bm.heightAt(w.x, w.z + 0.12), hz0 = bm.heightAt(w.x, w.z - 0.12);
          var nx = hx1 > NONE && hx0 > NONE ? -(hx1 - hx0) / 0.24 : 0, nz = hz1 > NONE && hz0 > NONE ? -(hz1 - hz0) / 0.24 : 0, grade = Math.hypot(nx, nz), steep = grade > 1.4;
          var cell = F.at(w.x, w.z), st2 = cell < 0 ? ROCK : F.state[cell], depth2 = -y2, tier2 = hr(sk, 3);
          if (st2 === SAND || st2 === RUBBLE) st2 = ROCK;
          var tx = clamp(nx, -1.2, 1.2) * 0.55, tz = clamp(nz, -1.2, 1.2) * 0.55;
          if (st2 === LIVE || st2 === BLEACHED || st2 === FRESH) {
            var form3 = formFor(cell, depth2, steep || grade > 0.9 && hr(sk, 4) < 0.5);
            if (st2 === FRESH && !(form3 === 'finger' || form3 === 'antler' || form3 === 'table' || form3 === 'corym')) form3 = steep ? 'encrust' : 'antler';
            var rt2 = spacing * (0.55 + 0.22 * hr(sk, 5));
            if (form3 === 'encrust') {
              // Compact cushions follow a curved shoulder: sink each foot along the normal.
              var cnx = clamp(nx, -2.8, 2.8), cnz = clamp(nz, -2.8, 2.8), sc = rt2 / KIND_R.encrust * 1.25, inset = (0.03 + sc * 0.018) / Math.hypot(cnx, 1, cnz);
              add('encrust', w.x - cnx * inset, y2 - inset, w.z - cnz * inset, hr(sk, 6) * TAU, sc, 1.2 + 0.5 * hr(sk, 7), sc * 0.92, colonyColor(cell, 'encrust', st2), cnx, cnz, tier2, st2 === FRESH ? 1 : 0);
            } else colony(form3, st2, cell, w.x, y2, w.z, rt2, form3 === 'plate' ? tx * 0.8 : tx * 1.8, form3 === 'plate' ? tz * 0.8 : tz * 1.8, tier2, undefined, sk, bm);
            if (st2 !== FRESH && hr(sk, 9) < 0.5) companions(sk, w.x, y2, w.z, depth2, st2, bm);
          } else if (st2 === MACRO) seaweed(sk, 1 + (hr(sk, 4) < 0.5 ? 1 : 0), w.x, w.z, spacing * 0.35, 0.95, bm);
          else if (st2 === LIFE) {
            var v2 = hr(sk, 4), s2 = 0.9 + 0.5 * hr(sk, 7);
            if (steep && v2 < 0.35) add('fan', w.x, y2 - 0.035, w.z, current + (hr(sk, 5) - 0.5) * 0.65, s2 * 0.8, s2 * 0.85, s2 * 0.8, pickC(P.fan, hr(sk, 6)), tx * 0.45, tz * 0.45, tier2);
            else if (v2 < 0.65) add('soft', w.x, y2 - 0.03, w.z, hr(sk, 5) * TAU, s2, s2, s2, pickC(P.soft, hr(sk, 6)), tx, tz, tier2);
            else add('sponge', w.x, y2 - 0.03, w.z, hr(sk, 5) * TAU, s2, s2, s2, pickC(P.sponge, hr(sk, 6)), tx, tz, tier2);
          }
          else {
            if (!steep && hr(sk, 4) < 0.05 + 0.4 * damage) add('deadstand', w.x, y2 - 0.03, w.z, hr(sk, 5) * TAU, 1 + 0.5 * hr(sk, 6), 0.85 + 0.4 * hr(sk, 7), 1 + 0.5 * hr(sk, 6), pickC(P.turf, hr(sk, 8)), tx * 0.4, tz * 0.4, tier2);
            else if (hr(sk, 9) < 0.3) companions(sk, w.x, y2, w.z, depth2, ROCK, bm);
          }
        }
      });
      // The moray's crevice: a dark recess under two overhanging ledges.
      var mo = crevice.mouth, tang = Math.atan2(mo.nz, mo.nx);
      add('rock', mo.x - mo.nx * 0.12, mo.y - 0.25, mo.z - mo.nz * 0.12, 0, 0.9, 0.9, 0.9, [0.14, 0.13, 0.12], 0, 0, 0);
      add('rock', mo.x + mo.nx * 0.2, mo.y + 0.32, mo.z + mo.nz * 0.2, -tang, 1.6, 0.55, 1.1, [0.8, 0.76, 0.7], 0, 0, 0);
      add('rock', mo.x + mo.nx * 0.1 + mo.nz * 0.55, mo.y - 0.05, mo.z + mo.nz * 0.1 - mo.nx * 0.55, -tang + 0.6, 0.9, 0.8, 0.8, [0.78, 0.74, 0.68], 0, 0, 0);
      var sides = high ? 5 : 4, rockPalette = { stone: lin(0x857b6c), turf: lin(0x5c5338), cca: lin(0xb48a98), turfAmount: 0.3 + 0.6 * algae, ccaAmount: 1 - 0.6 * algae };
      // Seaweed takes its hue from the instance; the blades shade dark to pale.
      var algaeTint = { base: new T.Color(0.46, 0.45, 0.38), tip: new T.Color(1.02, 1.0, 0.84) };
      // Distance changes tessellation, never the colony or its placement.
      var KINDS = {
        finger: [function () { return buildBranching(T, 0.35, 0.45, 0, sides, high); }, mats.coral, function () { return buildBranching(T, 0.35, 0.45, 0, 3, false, true); }],
        antler: [function () { return buildBranching(T, 0.4, 0.5, 1, sides, high); }, mats.coral, function () { return buildBranching(T, 0.4, 0.5, 1, 3, false, true); }],
        corym: [function () { return buildBranching(T, 0.38, 0.42, 2, sides, high); }, mats.coral, function () { return buildBranching(T, 0.38, 0.42, 2, 3, false, true); }],
        table: [function () { return buildTable(T, 0.5, 0.5, 3, high); }, mats.plate, function () { return buildTable(T, 0.5, 0.5, 3, 'far'); }],
        massive: [function () { return buildMassive(T, 0.4, 0.42, 3, high, true); }, mats.massive, function () { return buildMassive(T, 0.4, 0.42, 3, 'far', true); }],
        brain: [function () { return buildMassive(T, 0.4, 0.4, 5, high, false); }, mats.brain, function () { return buildMassive(T, 0.4, 0.4, 5, 'far', false); }],
        plate: [function () { return buildPlate(T, 0.45, 0.4, 5, high); }, mats.plate, function () { return buildPlate(T, 0.45, 0.4, 5, 'far'); }],
        encrust: [function () { return buildEncrusting(T, 0.4, 0.08, 2, high); }, mats.massive, function () { return buildEncrusting(T, 0.4, 0.08, 2, 'far'); }],
        soft: [function () { return buildSoftCoral(T, 0.25, 0.45, 3, high); }, mats.soft, function () { return buildSoftCoral(T, 0.25, 0.45, 3, 'far'); }],
        fan: [function () { return buildFan(T, 0.5, 0.85, 2, high); }, mats.fan, function () { return buildFan(T, 0.5, 0.85, 2, false, true); }],
        sponge: [function () { return buildSponge(T, 0.18, 0.42, 4, high ? 10 : 6); }, mats.sponge, function () { return buildSponge(T, 0.18, 0.42, 4, 5); }],
        algae: [function () { return buildAlgae(T, 0.22, 0.34, 2, high, algaeTint); }, mats.algae, function () { return buildAlgae(T, 0.22, 0.34, 2, 'far', algaeTint); }],
        deadstand: [function () { return buildBranching(T, 0.4, 0.5, 1, sides, high, false, true); }, mats.rock, function () { return buildBranching(T, 0.4, 0.5, 1, 3, false, true, true); }],
        rubble: [function () { return buildRubble(T, 0.3, 13, rockPalette); }, mats.rock, null],
        rock: [function () { return buildRock(T, 0.4, 7, high, rockPalette); }, mats.rock, function () { return buildRock(T, 0.4, 7, 7, rockPalette); }]
      };
      // All detail tiers retain the same branch, cup and frond layout. The
      // middle distance reduces surface tessellation while the far tier uses
      // coarser cross-sections on the same anchored shapes.
      var MIDDLE = high ? {
        finger: function () { return buildBranching(T, 0.35, 0.45, 0, 4, false); },
        antler: function () { return buildBranching(T, 0.4, 0.5, 1, 4, false); },
        corym: function () { return buildBranching(T, 0.38, 0.42, 2, 4, false); },
        table: function () { return buildTable(T, 0.5, 0.5, 3, false); },
        massive: function () { return buildMassive(T, 0.4, 0.42, 3, false, true); },
        brain: function () { return buildMassive(T, 0.4, 0.4, 5, false, false); },
        plate: function () { return buildPlate(T, 0.45, 0.4, 5, false); },
        encrust: function () { return buildEncrusting(T, 0.4, 0.08, 2, false); },
        soft: function () { return buildSoftCoral(T, 0.25, 0.45, 3, false); },
        fan: function () { return buildFan(T, 0.5, 0.85, 2, false); },
        algae: function () { return buildAlgae(T, 0.22, 0.34, 2, false, algaeTint); },
        deadstand: function () { return buildBranching(T, 0.4, 0.5, 1, 4, false, false, true); }
      } : {};
      var mtx = new T.Matrix4(), qt = new T.Quaternion(), qy = new T.Quaternion(), pv = new T.Vector3(), sv = new T.Vector3(), nv = new T.Vector3(), up = new T.Vector3(0, 1, 0), color = new T.Color();
      function lodMesh(geometry, material, n, kind, lod) {
        // Keep living tissue and bare skeleton in the same draw batch. The
        // health buffer follows the instance when it changes detail tiers.
        geometry.setAttribute('reefSkeleton', new T.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(T.DynamicDrawUsage));
        var mesh = new T.InstancedMesh(geometry, material, n);
        mesh.setColorAt(0, color.setRGB(1, 1, 1));
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.instanceColor.setUsage(T.DynamicDrawUsage);
        mesh.count = 0; mesh.frustumCulled = false; mesh.receiveShadow = high;
        mesh.name = 'reef-explore-decor-' + kind + (lod === 'near' ? '' : '-' + lod); mesh.userData = { decorative: true, kind: kind, lod: lod, instances: n };
        scene.add(mesh); decorMeshes.push(mesh);
        return mesh;
      }
      // Each kind is its own loading step (a staged mount yields between them).
      Object.keys(KINDS).forEach(function (kind) { loadStep(1, function () {
        var list = lists[kind];
        if (!list || !list.length) return;
        var geometry = own(KINDS[kind][0]()), reach = geometry.boundingSphere.radius + geometry.boundingSphere.center.length(), n = list.length;
        var dk = { kind: kind, n: n, m: new Float32Array(n * 16), c: new Float32Array(n * 3), s: new Float32Array(n), lod: new Uint8Array(n), p: new Float32Array(n * 4), maxD: DECOR_H[kind] < 0.3 ? smallFar : farDist };
        list.forEach(function (it, k) {
          nv.set(it[8], 1, it[9]).normalize(); qt.setFromUnitVectors(up, nv); qy.setFromAxisAngle(up, it[3]); qt.multiply(qy);
          pv.set(it[0], it[1], it[2]); sv.set(it[4], it[5], it[6]);
          mtx.compose(pv, qt, sv).toArray(dk.m, k * 16);
          dk.s[k] = it[10];
          dk.c[k * 3] = it[7][0]; dk.c[k * 3 + 1] = it[7][1]; dk.c[k * 3 + 2] = it[7][2];
          dk.p[k * 4] = it[0]; dk.p[k * 4 + 1] = it[1] + DECOR_H[kind] * it[5] * 0.5; dk.p[k * 4 + 2] = it[2]; dk.p[k * 4 + 3] = reach * Math.max(it[4], it[5], it[6]);
        });
        dk.near = lodMesh(geometry, KINDS[kind][1], n, kind, 'near');
        // Every placed item stays readable (positions and colours) for the lab's checks.
        dk.near.userData.items = { matrices: dk.m, colors: dk.c, centres: dk.p, skeletons: dk.s };
        dk.mid = MIDDLE[kind] ? lodMesh(own(MIDDLE[kind]()), KINDS[kind][1], n, kind, 'mid') : null;
        dk.far = KINDS[kind][2] ? lodMesh(own(KINDS[kind][2]()), KINDS[kind][1], n, kind, 'far') : null;
        decorKinds.push(dk);
      }); });
      // A single soft contact layer anchors the foreground colonies, including
      // on the low tier where real-time shadow maps are deliberately disabled.
      // Elevated bommie colonies are skipped so no shade is projected through rock.
      loadStep(1, function () {
        var contact = new Builder(), segments = 12;
        contact.useExtra('reefContactWeight');
        Object.keys(lists).forEach(function (kind) {
          if (DECOR_H[kind] < 0.3 || kind === 'fan' || kind === 'algae') return;
          lists[kind].forEach(function (it) {
            var x = it[0], z = it[2], baseY = terrain.floorY(x, z);
            if (it[1] > baseY + 0.2 || Math.max(it[4], it[6]) < 0.8) return;
            var radius = clamp(0.34 * Math.max(it[4], it[6]), 0.12, 0.85), first = contact.count();
            contact.extra.value = 1; contact.vertex(x, baseY + 0.018, z, 0, 1, 0, 1, 1, 1);
            contact.extra.value = 0;
            for (var j = 0; j < segments; j++) {
              var angle = j / segments * TAU, px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
              contact.vertex(px, terrain.floorY(px, pz) + 0.018, pz, 0, 1, 0, 1, 1, 1);
              contact.i.push(first, first + 1 + (j + 1) % segments, first + 1 + j);
            }
          });
        });
        if (!contact.count()) return;
        var contactMat = patch(new T.MeshBasicMaterial({ color: lin(0x183c3a), transparent: true, opacity: high ? 0.24 : 0.3, depthWrite: false }), 'contact', function (shader) {
          var parts = shaderParts();
          shader.uniforms.reefWaterEye = U.eye;
          parts.vCommon.push('attribute float reefContactWeight;varying float vReefContact;varying vec3 vReefContactWorld;');
          parts.vBegin.push('vReefContact=reefContactWeight;'); parts.vProject.push('vReefContactWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
          parts.fCommon.push('varying float vReefContact;varying vec3 vReefContactWorld;uniform vec3 reefWaterEye;');
          parts.fColor.push('diffuseColor.a*=smoothstep(0.0,1.0,vReefContact)*(1.0-smoothstep(8.0,13.0,length(reefWaterEye-vReefContactWorld)));');
          applyParts(shader, parts, 'contact');
        });
        var contactMesh = new T.Mesh(own(contact.build(T, false)), contactMat);
        contactMesh.onBeforeRender = function (r, sc, cam) { U.eye.value.setFromMatrixPosition(cam.matrixWorld); };
        contactMesh.name = 'reef-explore-contact-shade'; contactMesh.renderOrder = 1; contactMesh.userData.decorative = true; scene.add(contactMesh);
      });
    }
    // Fill the near and far instance buffers with what lies within reach of the
    // camera and inside a widened view cone; skipped while the camera holds still.
    var camFwd = new T.Vector3(), decorCam = { x: NaN, y: 0, z: 0, fx: 0, fy: 0, fz: 0, aspect: 0, fov: 0 };
    function refreshDecor(force) {
      camera.getWorldDirection(camFwd);
      var cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      var moved = Math.hypot(cx - decorCam.x, cy - decorCam.y, cz - decorCam.z), facing = camFwd.x * decorCam.fx + camFwd.y * decorCam.fy + camFwd.z * decorCam.fz;
      if (!force && moved < PERF_STEP && facing > PERF_TURN && decorCam.aspect === camera.aspect && decorCam.fov === camera.fov) return;
      decorCam.x = cx; decorCam.y = cy; decorCam.z = cz; decorCam.fx = camFwd.x; decorCam.fy = camFwd.y; decorCam.fz = camFwd.z; decorCam.aspect = camera.aspect; decorCam.fov = camera.fov;
      var cone = perfConeFor(camera.fov, camera.aspect);
      refreshGroups(cx, cy, cz, cone);
      decorKinds.forEach(function (dk) {
        var P = dk.p, M = dk.m, C = dk.c, S = dk.s, ns = dk.near.geometry.getAttribute('reefSkeleton').array, ms = dk.mid ? dk.mid.geometry.getAttribute('reefSkeleton').array : null, fs = dk.far ? dk.far.geometry.getAttribute('reefSkeleton').array : null, nearN = 0, midN = 0, farN = 0, nearD = nearDist, maxD = dk.maxD, na = dk.near.instanceMatrix.array, nc = dk.near.instanceColor.array;
        var ma = dk.mid ? dk.mid.instanceMatrix.array : null, mc = dk.mid ? dk.mid.instanceColor.array : null;
        var fa = dk.far ? dk.far.instanceMatrix.array : null, fc = dk.far ? dk.far.instanceColor.array : null, q;
        for (var k = 0; k < dk.n; k++) {
          // A hero colony's reach is capped for the detail choice, so no full-detail
          // model is drawn from beyond the near ring.
          var dx = P[k * 4] - cx, dy = P[k * 4 + 1] - cy, dz = P[k * 4 + 2] - cz, r = Math.min(2, P[k * 4 + 3]), d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d - r > maxD) continue;
          if (d > r + 1.5 && dx * camFwd.x + dy * camFwd.y + dz * camFwd.z < perfConeAt(cone, d) * d - r) continue;
          // Fixed distance bands and hysteresis stop hovering or a frame-time
          // fluctuation from repeatedly replacing a familiar colony's shape.
          var edge = d - r, oldTier = dk.lod[k], nearEdge = nearD * (ma ? 0.52 : 0.85), margin = high ? 1.0 : 0.8;
          var tier = !fa || edge < nearEdge + (oldTier === 1 ? margin : oldTier ? -margin : 0) ? 1
            : ma && edge < nearD + (oldTier === 2 ? margin : oldTier === 3 ? -margin : 0) ? 2 : 3;
          dk.lod[k] = tier;
          if (tier === 1) { for (q = 0; q < 16; q++) na[nearN * 16 + q] = M[k * 16 + q]; nc[nearN * 3] = C[k * 3]; nc[nearN * 3 + 1] = C[k * 3 + 1]; nc[nearN * 3 + 2] = C[k * 3 + 2]; ns[nearN] = S[k]; nearN++; }
          else if (tier === 2) { for (q = 0; q < 16; q++) ma[midN * 16 + q] = M[k * 16 + q]; mc[midN * 3] = C[k * 3]; mc[midN * 3 + 1] = C[k * 3 + 1]; mc[midN * 3 + 2] = C[k * 3 + 2]; ms[midN] = S[k]; midN++; }
          else { for (q = 0; q < 16; q++) fa[farN * 16 + q] = M[k * 16 + q]; fc[farN * 3] = C[k * 3]; fc[farN * 3 + 1] = C[k * 3 + 1]; fc[farN * 3 + 2] = C[k * 3 + 2]; fs[farN] = S[k]; farN++; }
        }
        perfShow(dk.near, nearN); perfShow(dk.mid, midN); perfShow(dk.far, farN);
      });
    }
    function perfShow(mesh, n) {
      if (!mesh) return;
      mesh.count = n; mesh.visible = n > 0;
      mesh.instanceMatrix.updateRange.offset = 0; mesh.instanceMatrix.updateRange.count = Math.max(16, n * 16); mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.updateRange.offset = 0; mesh.instanceColor.updateRange.count = Math.max(3, n * 3); mesh.instanceColor.needsUpdate = true;
      var skeleton = mesh.geometry.getAttribute('reefSkeleton');
      if (skeleton) { skeleton.updateRange.offset = 0; skeleton.updateRange.count = Math.max(1, n); skeleton.needsUpdate = true; }
    }

    // ---- Water, light, shafts and motes (visual streams only) --------------------
    function buildWater() {
      // r128 does not refresh built-in cameraPosition for Basic/Points
      // materials without an environment map. Bind the actual camera below.
      // Fog, background and backdrop are output-space colours: r128 fogs after encoding.
      fogNear.copy(new T.Color(0x096278)); fogFar.copy(new T.Color(0x062c4b)); topNear.copy(new T.Color(0x79c7d1)); topFar.copy(new T.Color(0x3a88a6));
      scene.fog = new T.FogExp2(fogNear.clone(), 0.05); scene.background = fogNear.clone();
      var sunDir = new T.Vector3(0.42, 1, 0.3).normalize();
      backdrop = new T.Mesh(own(new T.SphereGeometry(1, 24, 16)), own(new T.ShaderMaterial({
        side: T.BackSide, depthWrite: false, fog: false,
        uniforms: { topColor: { value: topNear.clone() }, bottomColor: { value: fogNear.clone() }, sunDir: { value: sunDir }, reefCausticTime: U.time, reefVision: U.vision },
        vertexShader: 'varying vec3 vReefDir;void main(){vReefDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 sunDir;uniform float reefCausticTime;uniform vec2 reefVision;varying vec3 vReefDir;void main(){vec3 d=normalize(vReefDir);' +
          'float sunward=max(0.0,dot(d,sunDir));float up=smoothstep(-0.10,0.98,d.y);' +
          'vec3 column=bottomColor*mix(0.63,1.0,smoothstep(-0.85,-0.06,d.y));column=mix(column,topColor,up*0.70);' +
          'float swell=sin(d.x*15.0+d.z*8.0-reefCausticTime*0.16+sin(d.z*7.0)*0.55);' +
          'float ripple=sin(d.z*24.0-d.x*11.0+reefCausticTime*0.21+sin(d.x*9.0+d.z*5.0)*0.60);' +
          'float window=smoothstep(0.43,0.89,d.y+swell*0.030+ripple*0.018);' +
          'float lace=sin(d.x*48.0-d.z*31.0+sin(d.z*17.0+d.x*8.0)*1.1+reefCausticTime*0.24);' +
          'float waterfold=sin(d.z*37.0+d.x*19.0+sin(d.x*13.0-d.z*9.0)*0.8-reefCausticTime*0.19);' +
          'float silver=pow(max(0.0,swell*ripple*0.6+lace*waterfold*0.4),4.0);' +
          'column=mix(column,topColor,window*0.35);column*=1.0+(swell*ripple*0.042+lace*waterfold*0.027)*window;' +
          'column+=topColor*silver*window*0.065;' +
          'vec3 scatter=max(topColor-bottomColor,vec3(0.0))*(0.13*pow(sunward,4.0)+0.22*pow(sunward,25.0))*smoothstep(0.05,0.72,d.y);' +
          'float sunHalo=pow(sunward,92.0)*0.045;float sunDisc=pow(sunward,1350.0)*0.24;' +
          'vec3 sunlight=vec3(1.0,0.97,0.85)*(sunHalo+sunDisc)*window*mix(1.0,0.14,reefVision.y);' +
          'gl_FragColor=vec4(min(column+scatter+sunlight,vec3(1.0)),1.0);}'
      })));
      backdrop.name = 'reef-explore-backdrop'; backdrop.renderOrder = -10; backdrop.frustumCulled = false;
      backdrop.onBeforeRender = function (r, s, cam) { this.position.setFromMatrixPosition(cam.matrixWorld); this.scale.setScalar(cam.far * 0.9); this.updateMatrixWorld(); };
      scene.add(backdrop);
      var k = waterDepth(site.depthM);
      hemi = new T.HemisphereLight(new T.Color().setRGB(0.39, 0.69, 0.81).lerp(new T.Color().setRGB(0.17, 0.43, 0.65), k), new T.Color().setRGB(0.20, 0.26, 0.22).lerp(new T.Color().setRGB(0.07, 0.14, 0.18), k), 0.42 - 0.08 * k);
      hemi.name = 'reef-explore-ambient'; scene.add(hemi);
      sun = new T.DirectionalLight(new T.Color().setRGB(1.0, 0.96, 0.84).lerp(new T.Color().setRGB(0.57, 0.82, 0.97), k), 1.27 - 0.28 * k);
      sun.name = 'reef-explore-sun'; sun.position.copy(sunDir).multiplyScalar(30);
      sun.userData.dir = sunDir; scene.add(sun); scene.add(sun.target);
      if (high) {
        sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
        sun.shadow.camera.near = 1; sun.shadow.camera.far = 60; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
      }
      // Four crossing swells supply a continuous water normal. A water-to-air
      // Fresnel term gives the underside its reflected rim and refracted window.
      var smat = own(new T.MeshBasicMaterial({ color: lin(0x8acbd2), transparent: true, opacity: 0.46, side: T.DoubleSide, depthWrite: false }));
      if (derivatives) smat.extensions = { derivatives: true };
      smat.onBeforeCompile = function (shader) {
        var parts = shaderParts(); shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefWaterEye = U.eye;
        shader.uniforms.reefVision = U.vision; parts.fCommon.push('uniform vec2 reefVision;');
        shader.uniforms.reefSurfaceTop = backdrop.material.uniforms.topColor; shader.uniforms.reefSurfaceDeep = backdrop.material.uniforms.bottomColor;
        if (derivatives) parts.fCommon.push('#define REEF_DERIVATIVES');
        parts.vCommon.push('varying vec3 vReefWorld;'); parts.vProject.push(WORLD_VERTEX);
        parts.fCommon.push('varying vec3 vReefWorld;uniform float reefCausticTime;uniform vec3 reefWaterEye;uniform vec3 reefSurfaceTop;uniform vec3 reefSurfaceDeep;');
        parts.fColor.push([
          'vec2 reefSea=vReefWorld.xz;',
          'float reefSeaWarpA=dot(reefSea,vec2(0.073,-0.061))-reefCausticTime*0.071;',
          'float reefSeaWarpB=dot(reefSea,vec2(-0.049,-0.087))+reefCausticTime*0.053;',
          'vec2 reefSeaWarp=vec2(sin(reefSeaWarpA),sin(reefSeaWarpB))*0.53;',
          'vec2 reefSeaP=reefSea+reefSeaWarp;',
          'float reefSeaA=dot(reefSeaP,vec2(0.39,0.18))-reefCausticTime*0.31;',
          'float reefSeaB=dot(reefSeaP,vec2(-0.21,0.54))+reefCausticTime*0.26;',
          'float reefSeaC=dot(reefSeaP,vec2(0.92,-0.57))+reefCausticTime*0.39;',
          'float reefSeaD=dot(reefSeaP,vec2(-1.33,-0.81))-reefCausticTime*0.44;',
          'vec4 reefSeaAA=vec4(1.0);',
          '#ifdef REEF_DERIVATIVES',
          'reefSeaAA=vec4(1.0)-smoothstep(vec4(0.55),vec4(1.75),vec4(fwidth(reefSeaA),fwidth(reefSeaB),fwidth(reefSeaC),fwidth(reefSeaD)));',
          '#endif',
          'vec4 reefSeaCos=cos(vec4(reefSeaA,reefSeaB,reefSeaC,reefSeaD))*reefSeaAA;',
          'vec2 reefSeaSlope=vec2(0.39,0.18)*reefSeaCos.x*0.105+vec2(-0.21,0.54)*reefSeaCos.y*0.074+vec2(0.92,-0.57)*reefSeaCos.z*0.022+vec2(-1.33,-0.81)*reefSeaCos.w*0.010;',
          'vec2 reefSeaGradient=reefSeaSlope+vec2(0.073,-0.061)*cos(reefSeaWarpA)*reefSeaSlope.x*0.53+vec2(-0.049,-0.087)*cos(reefSeaWarpB)*reefSeaSlope.y*0.53;',
          'vec3 reefSeaNormal=normalize(vec3(-reefSeaGradient.x*1.55,1.0,-reefSeaGradient.y*1.55));',
          'vec3 reefSeaView=normalize(reefWaterEye-vReefWorld);float reefSeaUp=clamp(abs(dot(reefSeaView,reefSeaNormal)),0.001,1.0);',
          'float reefSeaEta=mix(0.7502,1.333,step(reefWaterEye.y,vReefWorld.y));',
          'float reefSeaTransmission=1.0-reefSeaEta*reefSeaEta*(1.0-reefSeaUp*reefSeaUp);',
          'float reefWindow=smoothstep(-0.026,0.046,reefSeaTransmission);float reefSeaCosT=sqrt(max(0.0,reefSeaTransmission));',
          'float reefSeaRs=(reefSeaEta*reefSeaUp-reefSeaCosT)/max(0.001,reefSeaEta*reefSeaUp+reefSeaCosT);',
          'float reefSeaRp=(reefSeaEta*reefSeaCosT-reefSeaUp)/max(0.001,reefSeaEta*reefSeaCosT+reefSeaUp);',
          'float reefSeaFresnel=clamp(0.5*(reefSeaRs*reefSeaRs+reefSeaRp*reefSeaRp),0.0,1.0);' +
          'float reefSeaRough=mix(0.02,0.94,pow(1.0-smoothstep(0.51,0.82,reefSeaUp),1.2));reefSeaFresnel=mix(reefSeaRough,reefSeaFresnel,0.27);',
          // These palette uniforms also drive the backdrop; convert from its
          // output-space colours before the Basic material encodes the surface.
          'vec3 reefSeaSky=pow(max(reefSurfaceTop,vec3(0.0)),vec3(2.2));vec3 reefSeaDeep=pow(max(reefSurfaceDeep,vec3(0.0)),vec3(2.2));',
          'float reefSeaSwell=dot(sin(vec4(reefSeaA,reefSeaB,reefSeaC,reefSeaD))*reefSeaAA,vec4(0.47,0.34,0.13,0.06));',
          'float reefSeaCross=sin(reefSeaA+sin(reefSeaB)*0.64)*sin(reefSeaC*0.67+sin(reefSeaD)*0.36);',
          'float reefSeaSilver=pow(max(0.0,reefSeaCross*0.68+reefSeaSwell*0.32),3.0);',
          'vec3 reefSeaReflected=reefSeaDeep*(0.83+reefSeaSwell*0.21)+reefSeaSky*(0.14+reefSeaCross*0.10+reefSeaSilver*0.18);',
          'vec3 reefSeaThrough=reefSeaSky*(0.94+reefSeaCross*0.12+reefSeaSilver*0.13)+vec3(0.012,0.026,0.023);',
          'float reefSeaSun=max(0.0,dot(normalize(-reefSeaView+vec3(reefSeaNormal.x*0.28,0.0,reefSeaNormal.z*0.28)),normalize(vec3(0.42,1.0,0.3))));',
          'vec3 reefSeaWarm=vec3(1.0,0.91,0.72)*(pow(reefSeaSun,72.0)*0.040+pow(reefSeaSun,1150.0)*0.37)*reefWindow*mix(1.0,0.14,reefVision.y);',
          'diffuseColor.rgb=mix(reefSeaThrough,reefSeaReflected,reefSeaFresnel)+reefSeaWarm;',
          'diffuseColor.a*=mix(0.47,0.96,reefSeaFresnel)*(0.98+reefSeaCross*0.045);'
        ].join('\n'));
        applyParts(shader, parts, 'surface');
      };
      smat.customProgramCacheKey = function () { return key('surface-fresnel'); };
      surface = new T.Mesh(own(new T.PlaneGeometry(260, 260, 1, 1)), smat);
      surface.rotation.x = -Math.PI / 2; surface.name = 'reef-explore-surface'; surface.renderOrder = 2; surface.frustumCulled = false; scene.add(surface);
      surface.onBeforeRender = function (r, sc, cam) { U.eye.value.setFromMatrixPosition(cam.matrixWorld); };
      // Sun shafts are fixed columns through small openings in the surface.
      // Their width faces the eye, while every long axis keeps the same world
      // sunlight direction. Broad, slowly changing light replaces hard ribbons.
      var rs = stream(seed, 701), height = 24;
      var shaftView = new T.Vector3(), shaftAcross = new T.Vector3(), shaftNormal = new T.Vector3(), shaftAxis = new T.Vector3(), shaftBasis = new T.Matrix4();
      for (var s = 0; s < (high ? 8 : 4); s++) {
        // Stratified openings keep a quiet scattering shaft in each sector,
        // with the same six seeded draws and the same eight/four ribbons.
        var w = 1.55 + rs() * 1.8, bx = ((s % 2) * 20 + 4 + rs() * 12 + (s > 3 ? 10 : 0)) % 40, bz = ((Math.floor(s / 2) % 2) * 20 + 4 + rs() * 12 + (s > 3 ? 10 : 0)) % 40, tilt = -0.2 + (rs() - 0.5) * 0.11, phase = rs() * TAU, base = 0.085 + rs() * 0.045;
        var mat = own(new T.MeshBasicMaterial({ color: lin(0xd7eddf), transparent: true, opacity: base, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
        mat.onBeforeCompile = function (shader) {
          var parts = shaderParts();
          shader.uniforms.reefVision = U.vision; parts.fCommon.push('uniform vec2 reefVision;');
          parts.vCommon.push('varying vec2 vReefShaftUv;varying vec3 vReefShaftWorld;'); parts.vBegin.push('vReefShaftUv=uv;');
          parts.vProject.push('vReefShaftWorld=(modelMatrix*vec4(transformed,1.0)).xyz;'); parts.fCommon.push('varying vec2 vReefShaftUv;varying vec3 vReefShaftWorld;uniform float reefCausticTime;uniform vec3 reefWaterEye;uniform vec3 reefWaterExtinction;', WATER_SCATTER_PHASE); shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefWaterEye = U.eye; shader.uniforms.reefWaterExtinction = U.extinction;
          parts.fColor.push([
            'vec3 reefBeamSun=normalize(vec3(0.42,1.0,0.3));',
            // Project every point back to the water plane. Light texture then
            // follows the refracted sunlight instead of sliding with the diver.
            'vec2 reefBeamSurface=vReefShaftWorld.xz-vReefShaftWorld.y*reefBeamSun.xz/reefBeamSun.y;',
            'float reefBeamWave=sin(dot(reefBeamSurface,vec2(0.63,-0.41))+reefCausticTime*0.13)+0.45*sin(dot(reefBeamSurface,vec2(-0.37,0.81))-reefCausticTime*0.09);',
            'float reefAcross=abs((vReefShaftUv.x-0.5)*2.0+reefBeamWave*0.035)/mix(1.0,0.68,vReefShaftUv.y);',
            'float reefFeather=exp(-3.4*reefAcross*reefAcross)*(1.0-smoothstep(0.60,1.0,reefAcross));',
            // Both endpoints disappear gently; the submerged endpoint cannot
            // leave a horizontal cut through the open water or a deep reef.
            'float reefBeamDepth=max(0.0,-vReefShaftWorld.y)/reefBeamSun.y;',
            'float reefFall=smoothstep(0.0,0.28,vReefShaftUv.y)*(1.0-smoothstep(0.94,1.0,vReefShaftUv.y));',
            'vec3 reefBeamView=vReefShaftWorld-reefWaterEye;float reefBeamDistance=length(reefBeamView);',
            'float reefBeamFade=smoothstep(1.0,3.8,reefBeamDistance)*(1.0-smoothstep(11.5,16.5,reefBeamDistance));',
            'float reefAperture=0.78+0.14*sin(dot(reefBeamSurface,vec2(1.21,0.48))+0.65*reefBeamWave+reefCausticTime*0.08)+0.08*sin(dot(reefBeamSurface,vec2(-0.57,1.83))-reefCausticTime*0.11);',
            // A forward scattering lobe makes rays strongest toward the sun,
            // with a quiet ambient component at the edges of the dive view.
            'float reefBeamCos=dot(reefBeamView/max(reefBeamDistance,0.001),reefBeamSun);',
            'float reefBeamPhase=0.24+0.267*reefScatterPhase(reefBeamCos);',
            'float reefBeamPath=1.0-exp(-reefBeamDistance*0.23);',
            'vec3 reefBeamTransmission=exp(-reefWaterExtinction*reefBeamDepth);',
            'diffuseColor.rgb*=reefBeamTransmission;',
            'diffuseColor.a*=reefFeather*reefFall*reefBeamFade*reefAperture*reefBeamPhase*reefBeamPath*mix(1.0,0.14,reefVision.y);'
          ].join('\n'));
          applyParts(shader, parts, 'shaft');
        };
        mat.customProgramCacheKey = function () { return key('shaft'); };
        var mesh = new T.Mesh(own(new T.PlaneGeometry(w, height, 1, 1)), mat);
        mesh.position.y = -height / 2; mesh.rotation.order = 'YXZ'; mesh.frustumCulled = false; mesh.renderOrder = 3;
        mesh.name = 'reef-explore-shaft'; mesh.userData.decorative = true; mesh.userData.phase = phase;
        mesh.onBeforeRender = function (r, sc, cam) {
          U.eye.value.setFromMatrixPosition(cam.matrixWorld);
          shaftAxis.copy(sunDir);
          this.position.y = -height * 0.5 * shaftAxis.y;
          shaftView.copy(U.eye.value).sub(this.position); shaftAcross.crossVectors(shaftAxis, shaftView);
          if (shaftAcross.lengthSq() < 0.0001) shaftAcross.set(1, 0, 0).cross(shaftAxis);
          shaftAcross.normalize(); shaftNormal.crossVectors(shaftAcross, shaftAxis).normalize();
          shaftBasis.makeBasis(shaftAcross, shaftAxis, shaftNormal); this.quaternion.setFromRotationMatrix(shaftBasis); this.updateMatrixWorld();
        };
        scene.add(mesh); shafts.push({ mesh: mesh, bx: bx, bz: bz, phase: phase, base: base, tilt: tilt });
      }
      // World-anchored marine snow drifts through a gently circulating water parcel.
      // Fade every wrapping face so a camera ascent never reveals a teleporting mote.
      snowU = { center: { value: new T.Vector3() }, box: { value: new T.Vector3(12, 7, 12) }, time: { value: 0 }, top: { value: -0.2 } };
      var rv = stream(seed, 801), count = high ? 680 : 240, p = new Float32Array(count * 3), drift = new Float32Array(count * 3);
      for (var m = 0; m < count; m++) {
        p[m * 3] = rv() * 12; p[m * 3 + 1] = rv() * 7; p[m * 3 + 2] = rv() * 12;
        drift[m * 3] = 0.035 + (rv() - 0.5) * 0.014; drift[m * 3 + 1] = -0.004 - rv() * 0.012; drift[m * 3 + 2] = 0.022 + (rv() - 0.5) * 0.014;
      }
      var g = own(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('reefSnowDrift', new T.Float32BufferAttribute(drift, 3)); g.computeBoundingSphere();
      var pm = own(new T.PointsMaterial({ color: lin(0xb4d9d7), size: 0.023, sizeAttenuation: true, transparent: true, opacity: 0.38, depthWrite: false }));
      pm.onBeforeCompile = function (shader) {
        shader.uniforms.reefWaterEye = U.eye;
        shader.uniforms.reefVision = U.vision;
        shader.uniforms.reefSnowCenter = snowU.center; shader.uniforms.reefSnowBox = snowU.box; shader.uniforms.reefSnowTime = snowU.time; shader.uniforms.reefSnowTop = snowU.top;
        var parts = shaderParts();
        parts.fCommon.push('uniform vec2 reefVision;');
        parts.vCommon.push('uniform vec3 reefWaterEye;uniform vec3 reefSnowCenter;uniform vec3 reefSnowBox;uniform float reefSnowTime;uniform float reefSnowTop;attribute vec3 reefSnowDrift;varying float vReefSnowDepth;varying float vReefSnowSeed;varying float vReefSnowGlow;varying float vReefSnowVeil;');
        parts.vBegin.push('vec3 reefSnowMin=reefSnowCenter-reefSnowBox*0.5;float reefSnowPhase=reefSnowTime*0.19-dot(position.xz,vec2(0.13,0.09));float reefSnowLift=reefSnowTime*0.13+dot(position.xz,vec2(0.08,-0.11));vec3 reefSnowSurge=vec3(-0.17*cos(reefSnowPhase),0.055*sin(reefSnowLift),-0.12*cos(reefSnowPhase+0.45));transformed=reefSnowMin+mod(position+reefSnowDrift*reefSnowTime+reefSnowSurge-reefSnowMin,reefSnowBox);if(transformed.y>reefSnowTop)transformed.y-=reefSnowBox.y;vec3 reefSnowEdge=reefSnowBox*0.5-abs(transformed-reefSnowCenter);float reefSnowEdgeFade=smoothstep(0.0,0.7,min(reefSnowEdge.x,min(reefSnowEdge.y,reefSnowEdge.z)));vReefSnowDepth=length(transformed-reefWaterEye);vReefSnowSeed=fract(position.x*0.37+position.y*0.61);vReefSnowGlow=pow(max(0.0,dot((transformed-reefWaterEye)/max(vReefSnowDepth,0.001),normalize(vec3(0.42,1.0,0.3)))),4.0);float reefSnowPulse=0.91+0.09*sin(reefSnowTime*(0.22+vReefSnowSeed*0.08)+vReefSnowSeed*6.283185);vReefSnowVeil=reefSnowEdgeFade*smoothstep(0.0,0.4,reefSnowTop-transformed.y)*exp(-max(-transformed.y-3.0,0.0)*0.024)*reefSnowPulse;');
        parts.fCommon.push('varying float vReefSnowDepth;varying float vReefSnowSeed;varying float vReefSnowGlow;varying float vReefSnowVeil;');
        parts.fColor.push('vec2 reefPc=gl_PointCoord*2.0-1.0;float reefSnowAngle=vReefSnowSeed*6.283185;reefPc=mat2(cos(reefSnowAngle),-sin(reefSnowAngle),sin(reefSnowAngle),cos(reefSnowAngle))*reefPc;reefPc.x*=mix(1.0,1.5,vReefSnowSeed);float reefPr=dot(reefPc,reefPc);if(reefPr>1.0)discard;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.82,0.92,0.86),vReefSnowGlow*0.24);diffuseColor.a*=pow(1.0-reefPr,1.8)*smoothstep(0.65,1.8,vReefSnowDepth)*(1.0-smoothstep(4.8,7.5,vReefSnowDepth))*mix(0.22,0.78,vReefSnowSeed)*(0.72+vReefSnowGlow*0.58)*vReefSnowVeil;');
        // Specks inside the dive light's beam catch it: the backscatter divers see.
        bindTorch(shader);
        parts.vCommon.push(TORCH_COMMON + 'varying float vReefSnowTorch;');
        parts.vBegin.push('vec3 reefSnowTorchTo=transformed-reefTorchPos;float reefSnowTorchD=max(length(reefSnowTorchTo),0.001);vReefSnowTorch=reefTorch.x*smoothstep(reefTorch.y,reefTorch.z,dot(reefSnowTorchTo/reefSnowTorchD,reefTorchDir))*(1.0-smoothstep(reefTorch.w*0.45,reefTorch.w,reefSnowTorchD))/(reefSnowTorchD*reefSnowTorchD+2.5);');
        parts.fCommon.push('varying float vReefSnowTorch;');
        parts.fColor.push('float reefSnowLit=min(1.0,vReefSnowTorch*0.3);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,0.95,0.86),reefSnowLit);diffuseColor.a=min(1.0,diffuseColor.a*(1.0+12.0*reefSnowLit))*mix(1.0,0.25,reefVision.y);');
        applyParts(shader, parts, 'snow');
        shader.vertexShader = inject(shader.vertexShader, '#include <logdepthbuf_vertex>', 'gl_PointSize*=(0.36+0.95*vReefSnowSeed*vReefSnowSeed*vReefSnowSeed)*(1.0+0.8*min(1.0,vReefSnowTorch*0.3));', 'snow-size');
      };
      pm.customProgramCacheKey = function () { return key('snow-parcel-v2'); };
      motes = new T.Points(g, pm); motes.frustumCulled = false; motes.name = 'reef-explore-motes'; motes.userData.decorative = true; motes.renderOrder = 4;
      motes.onBeforeRender = function (r, sc, cam) { U.eye.value.setFromMatrixPosition(cam.matrixWorld); snowU.center.value.copy(U.eye.value); };
      scene.add(motes);
    }
    function updateWater() {
      U.eye.value.setFromMatrixPosition(camera.matrixWorld); updateTorch();
      var depth = clamp(-camera.position.y, 0, 25);
      if (Math.abs(depth - lastWaterDepth) < 0.05) return;
      lastWaterDepth = depth;
      var k = waterDepth(depth), murk = 1 + 0.35 * health.algae;
      var fluorescent = vision === 'fluorescence', ambient = fluorescent ? 0.34 : 1;
      U.vision.value.set(vision === 'vivid' ? 1 : 0, fluorescent ? 1 : 0);
      U.strength.value = 0.62 * (vision === 'vivid' ? 1.14 : 1);
      scene.fog.color.copy(fogNear).lerp(fogFar, k);
      if (fluorescent) scene.fog.color.multiplyScalar(0.32);
      scene.background.copy(scene.fog.color);
      U.extinction.value.set(0.065, 0.042, 0.030).multiplyScalar(murk);
      U.scatter.value.copy(scene.fog.color).convertSRGBToLinear();
      scene.fog.density = (0.027 + 0.0011 * depth) * murk * (high ? 1 : 1.1);
      backdrop.material.uniforms.topColor.value.copy(topNear).lerp(topFar, k); backdrop.material.uniforms.bottomColor.value.copy(scene.fog.color);
      if (fluorescent) backdrop.material.uniforms.topColor.value.multiplyScalar(0.28);
      // The water column cools gradually as the diver descends, on both quality tiers.
      hemi.color.setRGB(lerp(0.39, 0.17, k), lerp(0.69, 0.43, k), lerp(0.81, 0.65, k));
      hemi.groundColor.setRGB(lerp(0.20, 0.07, k), lerp(0.26, 0.14, k), lerp(0.22, 0.18, k)); hemi.intensity = (0.42 - 0.08 * k) * ambient;
      sun.color.setRGB(lerp(1.0, 0.57, k), lerp(0.96, 0.82, k), lerp(0.84, 0.97, k)); sun.intensity = (1.27 - 0.28 * k) * ambient;
    }
    function setVision(value) {
      if (disposed) return;
      var mode = visionMode(value);
      if (mode !== vision) {
        vision = mode;
        if (U && U.vision) U.vision.value.set(mode === 'vivid' ? 1 : 0, mode === 'fluorescence' ? 1 : 0);
        lastWaterDepth = -1;
        if (loaded) updateWater();
        notify(true);
      }
      refresh();
    }
    // ---- Dive light ----------------------------------------------------------------
    // Held at the mask in the first view, along the gaze. In the third it is in
    // the diver's hand at the head: shone on the focused organism when that is in
    // front and within reach, otherwise ahead, angled down to the reef.
    var lightOn = options.light === true, torchAt = new T.Vector3(), torchFwd = new T.Vector3(), torchAim = new T.Vector3();
    function updateTorch() {
      if (!U || !U.torch) return;
      U.torch.value.x = lightOn ? TORCH_POWER : 0;
      if (!lightOn) return;
      if (view === 'first' || !diver) { torchAt.setFromMatrixPosition(camera.matrixWorld); camera.getWorldDirection(torchFwd); torchAt.y -= 0.08; torchFwd.y -= 0.12; }
      else {
        torchAt.copy(HEAD).applyMatrix4(diver.matrixWorld); torchFwd.set(1, 0, 0).transformDirection(diver.matrixWorld);
        var fo = focusedUid && byUid[focusedUid];
        if (fo) torchAim.copy(observationCenter(fo)).sub(torchAt);
        var reach = fo ? torchAim.length() : 0;
        if (reach > 0.2 && reach < TORCH_REACH * 0.8 && torchAim.x * fwdX(bearing) + torchAim.z * fwdZ(bearing) > 0) torchFwd.copy(torchAim);
        else torchFwd.y -= 0.58;
      }
      torchFwd.normalize();
      U.torchPos.value.copy(torchAt); U.torchDir.value.copy(torchFwd);
    }
    function setLight(on) {
      if (disposed) return;
      on = !!on;
      if (on !== !!lightOn) { lightOn = on; updateTorch(); notify(true); }
      refresh();
    }

    // ---- Diver -----------------------------------------------------------------
    function buildDiver() {
      diver = new T.Group(); diver.name = 'reef-explore-diver'; diver.rotation.order = 'YZX';
      var suit = lin(0x263e4b), panel = lin(0x3f727b), teal = lin(0x65b8b3), rubber = lin(0x17252d), bcd = lin(0x293944), webbing = lin(0x111e26);
      var amber = lin(0xe2b347), finAmber = lin(0xe8b94f), alloy = lin(0xbac6c5), steel = lin(0x8caaa9), skin = lin(0xb58e72), seam = lin(0x536a72);
      var mat = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.035 }));
      var hardwareMat = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.52 }));
      var finMat = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.49, metalness: 0.02, side: T.DoubleSide }));
      // The lenses' vertex colours are white, so vertexColors changes nothing but lets them share the fins' program.
      var glass = own(new T.MeshStandardMaterial({ color: lin(0xa3e0dc), roughness: 0.12, metalness: 0.22, transparent: true, opacity: 0.48, depthWrite: false, side: T.DoubleSide, vertexColors: true }));
      var b = new Builder(), hw = new Builder(), lenses = new Builder(), axis = new T.Vector3(1, 0, 0), direction = new T.Vector3(), q = new T.Quaternion();
      function M(x, y, z, sx, sy, sz, rx, ry, rz) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(sx, sy, sz)); }
      function solid(c) { return function (x, y, z, nx, ny, nz, rgb) { var shade = 0.94 + 0.06 * ny; rgb[0] = c.r * shade; rgb[1] = c.g * shade; rgb[2] = c.b * shade; }; }
      function oval(builder, x, y, z, sx, sy, sz, c, segments) { builder.absorb(T, new T.SphereGeometry(1, segments || 14, 10), M(x, y, z, sx, sy, sz), solid(c)); }
      function box(builder, x, y, z, sx, sy, sz, c, rx, ry, rz) { builder.absorb(T, new T.BoxGeometry(sx, sy, sz), M(x, y, z, 1, 1, 1, rx, ry, rz), solid(c)); }
      function pipe(builder, points, radius, c, steps, sides) {
        builder.tube(T, points.map(function (p) { return V(T, p[0], p[1], p[2]); }), radius, steps || 9, sides || 6, 0, function (t, cap, x, y, z, rgb) { rgb[0] = c.r; rgb[1] = c.g; rgb[2] = c.b; });
      }
      // Elliptical cross sections keep neoprene limbs continuous instead of a
      // chain of cylinders. The profile normals remain smooth at the UV seam.
      function loft(builder, sections, matrix, tone, sides) {
        sides = sides || 16;
        var positions = [], normals = [], indices = [], rings = sections.length;
        for (var r = 0; r < rings; r++) {
          var section = sections[r], prev = sections[Math.max(0, r - 1)], next = sections[Math.min(rings - 1, r + 1)], dx = next[0] - prev[0] || 1;
          for (var j = 0; j <= sides; j++) {
            var a = TAU * j / sides, cy = Math.cos(a), sz = Math.sin(a), ny = cy / section[1], nz = sz / section[2];
            var nx = -ny * ((next[1] - prev[1]) * cy + (next[3] - prev[3])) / dx - nz * (next[2] - prev[2]) * sz / dx;
            var length = Math.hypot(nx, ny, nz);
            positions.push(section[0], section[3] + section[1] * cy, section[2] * sz); normals.push(nx / length, ny / length, nz / length);
            if (r < rings - 1 && j < sides) { var a0 = r * (sides + 1) + j, a1 = a0 + sides + 1; indices.push(a0, a0 + 1, a1, a0 + 1, a1 + 1, a1); }
          }
        }
        var geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3)); geometry.setIndex(indices);
        builder.absorb(T, geometry, matrix, tone);
      }
      function limb(builder, a, end, radii, c) {
        var length = direction.set(end[0] - a[0], end[1] - a[1], end[2] - a[2]).length(); q.setFromUnitVectors(axis, direction.normalize());
        var matrix = new T.Matrix4().compose(new T.Vector3(a[0], a[1], a[2]), q, new T.Vector3(1, 1, 1));
        loft(builder, [[-0.025, 0.018, 0.018, 0], [0, radii[0], radii[0], 0], [length * 0.32, radii[1], radii[1] * 0.94, 0], [length * 0.78, radii[2], radii[2] * 0.94, 0], [length, radii[2] * 0.9, radii[2] * 0.9, 0], [length + 0.025, 0.015, 0.015, 0]], matrix, solid(c), 12);
      }
      function ring(builder, x, y, z, radius, tube, c, sy, sz) { builder.absorb(T, new T.TorusGeometry(radius, tube, 5, 18), M(x, y, z, 1, sy || 1, sz || 1, 0, Math.PI / 2, 0), solid(c)); }

      loft(b, [[-0.50, 0.055, 0.10, -0.015], [-0.40, 0.105, 0.15, -0.01], [-0.23, 0.115, 0.145, 0], [0.03, 0.15, 0.18, 0], [0.24, 0.155, 0.215, 0.01], [0.36, 0.12, 0.18, 0.025], [0.405, 0.06, 0.09, 0.045]], M(0, 0, 0, 1, 1, 1), function (x, y, z, nx, ny, nz, rgb) {
        var c = Math.abs(z) > 0.13 && y < 0.03 ? panel : suit; solid(c)(x, y, z, nx, ny, nz, rgb);
      }, 20);
      oval(b, 0.43, 0.06, 0, 0.105, 0.075, 0.077, rubber);
      oval(b, 0.595, 0.082, 0, 0.134, 0.137, 0.118, rubber, 20);
      // A small exposed face sits behind two individually framed mask lenses.
      oval(b, 0.688, 0.08, 0, 0.044, 0.094, 0.086, skin, 16);
      oval(b, 0.70, 0.015, 0, 0.031, 0.036, 0.057, skin, 12);
      [-1, 1].forEach(function (s) {
        var outline = [[0.017, 0.142], [0.081, 0.145], [0.104, 0.121], [0.099, 0.072], [0.065, 0.058], [0.022, 0.069]];
        var centre = [0.738, 0.103, s * 0.059];
        for (var j = 0; j < outline.length; j++) {
          var a = outline[j], c = outline[(j + 1) % outline.length], pa = [0.725 - 0.045 * a[0], a[1], s * a[0]], pc = [0.725 - 0.045 * c[0], c[1], s * c[0]];
          lenses.tri(centre, s > 0 ? pa : pc, s > 0 ? pc : pa, [1, 1, 1]);
          pipe(b, [pa, [lerp(pa[0], pc[0], 0.33), lerp(pa[1], pc[1], 0.33), lerp(pa[2], pc[2], 0.33)], [lerp(pa[0], pc[0], 0.67), lerp(pa[1], pc[1], 0.67), lerp(pa[2], pc[2], 0.67)], pc], 0.008, rubber, 2, 5);
        }
        oval(b, 0.718, 0.108, s * 0.054, 0.003, 0.011, 0.018, webbing, 10);
        pipe(b, [[0.705, 0.119, s * 0.104], [0.64, 0.145, s * 0.127], [0.53, 0.145, s * 0.122], [0.477, 0.10, s * 0.025]], 0.012, webbing, 8, 5);
        box(b, 0.664, 0.124, s * 0.118, 0.037, 0.021, 0.012, alloy, 0, s * 0.16, 0);
      });
      oval(b, 0.721, 0.058, 0, 0.027, 0.031, 0.023, rubber, 12);
      // Regulator face, mouthpiece and exhaust tee align with the bubble anchors.
      b.absorb(T, new T.CylinderGeometry(0.043, 0.038, 0.038, 16), M(0.737, -0.024, 0, 1, 1, 1, 0, 0, Math.PI / 2), solid(rubber));
      hw.absorb(T, new T.CylinderGeometry(0.030, 0.030, 0.005, 16), M(0.759, -0.024, 0, 1, 1, 1, 0, 0, Math.PI / 2), solid(steel));
      oval(b, 0.764, -0.024, 0, 0.004, 0.017, 0.017, rubber, 10);
      [-1, 1].forEach(function (s) { pipe(b, [[0.719, -0.044, 0], [0.706, -0.071, s * 0.052], [0.67, -0.072, s * 0.114], [0.66, -0.05, s * 0.156]], 0.012, rubber, 7, 5); });

      // The BCD is two padded wings around a visible backplate and cylinder.
      box(b, -0.015, 0.17, 0, 0.58, 0.042, 0.22, webbing);
      [-1, 1].forEach(function (s) {
        oval(b, 0.015, 0.09, s * 0.172, 0.335, 0.13, 0.086, bcd, 18);
        oval(b, -0.115, 0.025, s * 0.226, 0.13, 0.072, 0.035, rubber, 12);
        pipe(b, [[-0.24, 0.082, s * 0.241], [-0.17, 0.11, s * 0.257], [-0.07, 0.105, s * 0.257], [-0.018, 0.072, s * 0.245]], 0.004, seam, 7, 4);
        pipe(b, [[0.25, 0.16, s * 0.12], [0.40, 0.08, s * 0.16], [0.37, -0.13, s * 0.15], [0.13, -0.159, s * 0.10]], 0.024, webbing, 10, 6);
        pipe(b, [[0.31, 0.095, s * 0.194], [0.36, 0.04, s * 0.20], [0.35, -0.06, s * 0.183], [0.27, -0.117, s * 0.144]], 0.005, teal, 8, 4);
        hw.absorb(T, new T.TorusGeometry(0.021, 0.0045, 5, 12), M(0.29, -0.108, s * 0.165, 1, 1, 0.8, Math.PI / 2, 0, 0), solid(steel));
        box(b, 0.20, -0.141, s * 0.13, 0.05, 0.014, 0.04, rubber);
        box(hw, 0.20, -0.15, s * 0.13, 0.026, 0.006, 0.021, steel);
      });
      ring(b, -0.26, -0.005, 0, 0.143, 0.018, webbing, 0.91, 1.12);
      box(b, -0.255, -0.143, 0, 0.064, 0.018, 0.075, rubber);
      box(hw, -0.255, -0.154, 0, 0.035, 0.006, 0.047, steel);

      loft(hw, [[-0.359, 0.032, 0.032, 0], [-0.347, 0.069, 0.069, 0], [-0.31, 0.09, 0.09, 0], [0.20, 0.09, 0.09, 0], [0.258, 0.075, 0.075, 0], [0.294, 0.032, 0.032, 0], [0.302, 0.021, 0.021, 0]], M(0, 0.258, 0, 1, 1, 1), function (x, y, z, nx, ny, nz, rgb) {
        var c = x > 0.206 ? amber : alloy, brushed = 0.965 + 0.035 * Math.sin(x * 680); rgb[0] = c.r * brushed; rgb[1] = c.g * brushed; rgb[2] = c.b * brushed;
      }, 24);
      hw.absorb(T, new T.CircleGeometry(0.032, 24), M(-0.359, 0.258, 0, 1, 1, 1, 0, -Math.PI / 2, 0), solid(alloy));
      hw.absorb(T, new T.CircleGeometry(0.021, 16), M(0.302, 0.258, 0, 1, 1, 1, 0, Math.PI / 2, 0), solid(amber));
      [-0.20, 0.115].forEach(function (x) {
        ring(b, x, 0.258, 0, 0.091, 0.013, webbing);
        box(b, x, 0.268, 0.094, 0.044, 0.043, 0.016, rubber);
        box(hw, x, 0.268, 0.105, 0.025, 0.025, 0.006, steel);
      });
      ring(b, -0.326, 0.258, 0, 0.076, 0.013, rubber);
      box(b, -0.041, 0.348, 0, 0.106, 0.003, 0.054, amber);
      box(b, -0.041, 0.351, 0, 0.072, 0.002, 0.006, rubber);
      limb(hw, [0.30, 0.258, 0], [0.355, 0.258, 0], [0.019, 0.020, 0.017], steel);
      oval(hw, 0.35, 0.258, 0.01, 0.035, 0.029, 0.033, alloy, 12);
      b.absorb(T, new T.CylinderGeometry(0.025, 0.025, 0.022, 10), M(0.35, 0.286, -0.027, 1, 1, 1), solid(rubber));
      pipe(b, [[0.37, 0.26, 0.022], [0.57, 0.35, 0.19], [0.77, 0.15, 0.21], [0.735, -0.023, 0.044]], 0.011, rubber, 16, 6);
      pipe(b, [[0.34, 0.255, -0.024], [0.39, 0.26, -0.22], [0.34, -0.02, -0.285], [0.16, -0.085, -0.255]], 0.013, rubber, 12, 6);
      oval(b, 0.16, -0.085, -0.255, 0.044, 0.024, 0.024, rubber, 12);
      box(b, 0.178, -0.108, -0.255, 0.021, 0.009, 0.025, amber);
      pipe(b, [[0.34, 0.245, -0.02], [0.38, 0.06, -0.245], [0.04, -0.16, -0.29], [-0.07, -0.07, -0.239]], 0.009, amber, 12, 5);
      oval(b, -0.073, -0.075, -0.244, 0.043, 0.035, 0.023, amber, 12);
      oval(b, -0.073, -0.075, -0.266, 0.025, 0.021, 0.004, rubber, 10);

      [-1, 1].forEach(function (s) {
        limb(b, [0.29, 0.015, s * 0.19], [0.47, -0.16, s * 0.235], [0.074, 0.068, 0.05], suit);
        oval(b, 0.46, -0.159, s * 0.236, 0.057, 0.055, 0.05, rubber, 12);
        limb(b, [0.465, -0.16, s * 0.232], [0.57, -0.18, s * 0.115], [0.047, 0.05, 0.034], suit);
        pipe(b, [[0.31, 0.04, s * 0.24], [0.35, -0.005, s * 0.271], [0.42, -0.09, s * 0.278], [0.46, -0.14, s * 0.276]], 0.009, teal, 7, 5);
        oval(b, 0.58, -0.18, s * 0.10, 0.062, 0.032, 0.042, rubber, 12);
        oval(b, 0.613, -0.174, s * 0.077, 0.038, 0.024, 0.032, rubber, 10);
        oval(b, 0.573, -0.155, s * 0.064, 0.03, 0.017, 0.023, rubber, 10);
        pipe(b, [[0.575, -0.149, s * 0.12], [0.59, -0.144, s * 0.107], [0.61, -0.148, s * 0.094], [0.624, -0.155, s * 0.078]], 0.003, seam, 4, 4);
      });
      box(b, 0.531, -0.134, -0.157, 0.053, 0.018, 0.048, rubber, 0, -0.7, 0);
      box(hw, 0.531, -0.123, -0.157, 0.036, 0.004, 0.031, teal, 0, -0.7, 0);
      // The thighs and shins share the body's material, so they draw with it: their
      // vertices join the body mesh and are posed from their rig nodes (leanSkin).
      var limbs = [];
      diverBody = new T.Mesh(undefined, mat); diverBody.name = 'reef-explore-diver-body'; diver.add(diverBody);
      var hardware = new T.Mesh(own(hw.build(T, false)), hardwareMat); hardware.name = 'reef-explore-diver-equipment'; diver.add(hardware);
      var glassMesh = new T.Mesh(own(lenses.build(T, false)), glass); glassMesh.name = 'reef-explore-diver-mask-lenses'; glassMesh.renderOrder = 2; diver.add(glassMesh);

      [-1, 1].forEach(function (s) {
        var sideName = s < 0 ? 'left' : 'right', hip = new T.Group(); hip.name = 'reef-explore-diver-hip-' + sideName; hip.position.set(-0.48, -0.02, s * 0.095); diver.add(hip);
        var thighB = new Builder();
        limb(thighB, [0, 0, 0], [-0.42, 0, 0], [0.085, 0.081, 0.059], suit);
        oval(thighB, -0.335, -0.006, 0, 0.104, 0.063, 0.065, rubber, 12);
        pipe(thighB, [[-0.015, 0.018, s * 0.079], [-0.14, 0.025, s * 0.086], [-0.27, 0.018, s * 0.071], [-0.345, 0.011, s * 0.059]], 0.009, panel, 8, 5);
        leanLimb(limbs, thighB, hip, 'reef-explore-diver-thigh');
        var knee = new T.Group(); knee.name = 'reef-explore-diver-knee-' + sideName; knee.position.set(-0.42, 0, 0); hip.add(knee);
        var shinB = new Builder(); limb(shinB, [0, 0, 0], [-0.4, 0, 0], [0.059, 0.064, 0.036], suit);
        pipe(shinB, [[-0.07, 0.018, s * 0.057], [-0.15, 0.021, s * 0.062], [-0.28, 0.01, s * 0.047], [-0.33, 0.007, s * 0.037]], 0.006, teal, 8, 5);
        leanLimb(limbs, shinB, knee, 'reef-explore-diver-shin');
        var ankle = new T.Group(); ankle.name = 'reef-explore-diver-ankle-' + sideName; ankle.position.set(-0.4, 0, 0); knee.add(ankle);
        var fb = new Builder(), rows = 16, columns = 12;
        oval(fb, -0.045, -0.004, 0, 0.115, 0.047, 0.061, rubber, 14);
        oval(fb, 0.018, 0.002, 0, 0.052, 0.044, 0.052, rubber, 12);
        pipe(fb, [[0.025, 0.012, -0.052], [0.073, 0.052, -0.04], [0.073, 0.052, 0.04], [0.025, 0.012, 0.052]], 0.009, webbing, 7, 5);
        [-1, 1].forEach(function (side) { box(fb, 0.014, 0.009, side * 0.059, 0.028, 0.026, 0.009, steel); });
        var base = fb.count();
        function finPoint(t, u) {
          var width = 0.060 + 0.076 * Math.sin(t * Math.PI * 0.61), notch = 0.027 * Math.pow(t, 10) * (1 - u * u);
          return [-0.083 - 0.495 * t + notch, -0.019 - 0.025 * t * t + 0.015 * u * u * Math.sin(t * Math.PI), u * width];
        }
        for (var row = 0; row <= rows; row++) for (var column = 0; column <= columns; column++) {
          var t = row / rows, u = column / columns * 2 - 1, point = finPoint(t, u), end = t > 0.94, edge = Math.abs(u) > 0.86;
          var c = end || edge || Math.abs(u) < 0.14 ? rubber : finAmber;
          var dxdt = -0.495 + 0.27 * Math.pow(t, 9) * (1 - u * u), dxdu = -0.054 * Math.pow(t, 10) * u;
          var dydt = -0.05 * t + 0.015 * u * u * Math.PI * Math.cos(t * Math.PI), dydu = 0.03 * u * Math.sin(t * Math.PI);
          var dzdt = u * 0.076 * Math.PI * 0.61 * Math.cos(t * Math.PI * 0.61), dzdu = 0.060 + 0.076 * Math.sin(t * Math.PI * 0.61);
          var nx = dydt * dzdu - dzdt * dydu, ny = dzdt * dxdu - dxdt * dzdu, nz = dxdt * dydu - dydt * dxdu, nl = Math.hypot(nx, ny, nz);
          fb.vertex(point[0], point[1], point[2], nx / nl, ny / nl, nz / nl, c.r, c.g, c.b);
          if (row < rows && column < columns) { var i0 = base + row * (columns + 1) + column, i1 = i0 + columns + 1; fb.i.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); }
        }
        [-0.95, -0.43, 0.43, 0.95].forEach(function (u) {
          var pts = [finPoint(0.05, u), finPoint(0.34, u), finPoint(0.69, u), finPoint(0.98, u)];
          pts.forEach(function (p) { p[1] += 0.005; }); pipe(fb, pts, Math.abs(u) > 0.9 ? 0.007 : 0.0045, rubber, 12, 5);
        });
        var finGeometry = own(fb.build(T, false)), fin = new T.Mesh(finGeometry, finMat), finRest = new Float32Array(finGeometry.attributes.position.array), finRestNormal = new Float32Array(finGeometry.attributes.normal.array), finFlex = new Float32Array(finGeometry.attributes.position.count);
        for (var k = 0; k < finFlex.length; k++) finFlex[k] = Math.pow(clamp((-finRest[k * 3] - 0.12) / 0.46, 0, 1), 2);
        finGeometry.computeBoundingSphere(); finGeometry.boundingSphere.radius += 0.065;
        finGeometry.computeBoundingBox(); finGeometry.boundingBox.min.y -= 0.065; finGeometry.boundingBox.max.y += 0.065;
        fin.name = 'reef-explore-diver-fin-' + sideName; ankle.add(fin);
        legs.push({ hip: hip, knee: knee, ankle: ankle, side: s, fin: fin, finRest: finRest, finRestNormal: finRestNormal, finFlex: finFlex });
      });
      leanBody(diverBody, b, limbs);
      diver.traverse(function (c) { if (c.isMesh) { c.castShadow = high && c !== glassMesh; c.receiveShadow = true; c.userData.diver = true; } });
      scene.add(diver);
    }

    function animateDiver(dt) {
      // Preserve the exact pose, including blade deformation, when the reef is paused.
      if (paused) return;
      var effort = clamp(Math.abs(speed) / 1.5 + Math.abs(vy) * 0.6 + Math.abs(turnRate) * 0.3, 0, 1);
      swimEffort += (effort - swimEffort) * damp(4.5, dt);
      var calm = reducedMotion ? 0 : 1, amp = (0.035 * calm + 0.23 * swimEffort) * (reducedMotion ? 0.55 : 1);
      kick += dt * (1.15 * calm + 3.65 * swimEffort);
      legs.forEach(function (lg, i) {
        var ph = kick + (i ? Math.PI : 0), stroke = Math.sin(ph);
        // Hip-led flutter, with flexed knees and a delayed ankle recovery.
        lg.hip.rotation.z = 0.015 + amp * stroke;
        lg.hip.rotation.y = lg.side * (0.035 + 0.014 * swimEffort * Math.cos(ph - 0.3));
        lg.knee.rotation.z = -0.3 - 0.16 * swimEffort * (0.5 + 0.5 * Math.sin(ph - 0.65));
        lg.ankle.rotation.z = 0.22 + amp * 0.48 * Math.sin(ph - 1.1);
        if (lg.fin && lg.finRest && lg.finRestNormal && lg.finFlex) {
          var pos = lg.fin.geometry.attributes.position, normal = lg.fin.geometry.attributes.normal;
          var flex = (0.008 * calm + 0.052 * swimEffort) * Math.sin(ph - 1.55) * (reducedMotion ? 0.5 : 1);
          for (var j = 0; j < pos.count; j++) {
            var at = j * 3, rest = lg.finRest, nr = lg.finRestNormal, w = lg.finFlex[j];
            pos.setXYZ(j, rest[at], rest[at + 1] + flex * w, rest[at + 2]);
            // The fin weights are a squared distance from the foot pocket.
            var slope = w > 0 ? -2 * Math.sqrt(w) / 0.46 : 0;
            var nx = nr[at] - flex * slope * nr[at + 1], ny = nr[at + 1], nz = nr[at + 2];
            var length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            normal.setXYZ(j, nx / length, ny / length, nz / length);
          }
          pos.needsUpdate = true; normal.needsUpdate = true;
        }
      });
      bodyPitch += (clamp(vy * 0.35, -0.3, 0.3) - bodyPitch) * damp(3, dt);
      bodyRoll += (clamp(turnRate * 0.25, -0.22, 0.22) - bodyRoll) * damp(3, dt);
      var bob = reducedMotion ? 0 : 0.012 * Math.sin(visualTime * TAU / 4.2);
      diver.position.set(diverPos.x, diverPos.y + bob, diverPos.z); diver.rotation.set(bodyRoll, yawFor(bearing), bodyPitch);
      diver.updateMatrixWorld(true);
      leanSkin(diverBody);
    }
    // A limb of the body mesh: its vertices in a rig node's space, posed by leanSkin.
    // The node keeps the place and the name the limb's own mesh had in the rig.
    function leanLimb(list, builder, parent, name) {
      var node = new T.Group(); node.name = name; parent.add(node);
      list.push({ node: node, builder: builder });
      return node;
    }
    // Appends the limbs to the body's builder and gives the body its one mesh. The
    // bounds hold every pose: the body as built, plus around each hip the farthest
    // limb vertex and the joints in between.
    function leanBody(mesh, b, limbs) {
      var pieces = [];
      limbs.forEach(function (limb) {
        var src = limb.builder, start = b.count(), k;
        for (k = 0; k < src.count(); k++) b.vertex(src.p[k * 3], src.p[k * 3 + 1], src.p[k * 3 + 2], src.n[k * 3], src.n[k * 3 + 1], src.n[k * 3 + 2], src.c[k * 3], src.c[k * 3 + 1], src.c[k * 3 + 2]);
        for (k = 0; k < src.i.length; k++) b.i.push(start + src.i[k]);
        pieces.push({ node: limb.node, start: start, rest: new Float32Array(src.p), restNormal: new Float32Array(src.n), last: [] });
      });
      var geometry = own(b.build(T, false)), pos = geometry.attributes.position, nor = geometry.attributes.normal, first = pieces.length ? pieces[0].start : pos.count;
      mesh.geometry = geometry; mesh.userData.leanSkin = { pieces: pieces, m: new T.Matrix4() };
      leanSkin(mesh);
      // Nothing is uploaded yet: the first draw sends the whole buffer.
      pos.updateRange.count = -1; nor.updateRange.count = -1;
      var box = new T.Box3(), v = new T.Vector3();
      for (var i = 0; i < first; i++) box.expandByPoint(v.fromBufferAttribute(pos, i));
      pieces.forEach(function (p) {
        var reach = 0, o = p.node, j;
        for (j = 0; j < p.rest.length; j += 3) reach = Math.max(reach, Math.hypot(p.rest[j], p.rest[j + 1], p.rest[j + 2]));
        for (; o.parent !== diver; o = o.parent) reach += o.position.length();
        box.expandByPoint(v.copy(o.position).addScalar(reach)); box.expandByPoint(v.copy(o.position).addScalar(-reach));
      });
      geometry.boundingBox = box; geometry.boundingSphere = box.getBoundingSphere(new T.Sphere());
    }
    // Poses the limbs inside the body mesh from their rig nodes: the vertices the
    // separate thigh and shin meshes drew. The rig only turns and moves its nodes (no
    // scale), so each normal turns with its vertex. An unchanged limb is not re-sent.
    function leanSkin(mesh) {
      var S = mesh && mesh.userData.leanSkin;
      if (!S) return;
      var pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal, P = pos.array, N = nor.array, m = S.m, e = m.elements, lo = Infinity, hi = -1;
      for (var k = 0; k < S.pieces.length; k++) {
        var p = S.pieces[k], o, q, same = true;
        m.identity();
        for (o = p.node; o && o !== diver; o = o.parent) { o.updateMatrix(); m.premultiply(o.matrix); }
        for (q = 0; q < 16; q++) if (p.last[q] !== e[q]) { same = false; p.last[q] = e[q]; }
        if (same) continue;
        var R = p.rest, RN = p.restNormal, at = p.start * 3;
        for (var j = 0; j < R.length; j += 3) {
          var x = R[j], y = R[j + 1], z = R[j + 2], nx = RN[j], ny = RN[j + 1], nz = RN[j + 2];
          P[at + j] = e[0] * x + e[4] * y + e[8] * z + e[12]; P[at + j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P[at + j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          N[at + j] = e[0] * nx + e[4] * ny + e[8] * nz; N[at + j + 1] = e[1] * nx + e[5] * ny + e[9] * nz; N[at + j + 2] = e[2] * nx + e[6] * ny + e[10] * nz;
        }
        lo = Math.min(lo, p.start); hi = Math.max(hi, p.start + R.length / 3);
      }
      if (hi < 0) return;
      pos.updateRange.offset = nor.updateRange.offset = lo * 3; pos.updateRange.count = nor.updateRange.count = (hi - lo) * 3;
      pos.needsUpdate = true; nor.needsUpdate = true;
    }


    // ---- Bubbles from the regulator (visual stream) -------------------------------
    function buildBubbles() {
      var g = own(new T.BufferGeometry()), pos = new Float32Array(BUBBLES * 3), size = new Float32Array(BUBBLES), alpha = new Float32Array(BUBBLES);
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('reefBubbleSize', new T.BufferAttribute(size, 1));
      g.setAttribute('reefBubbleAlpha', new T.BufferAttribute(alpha, 1));
      var m = own(new T.PointsMaterial({ color: new T.Color(0xeafcff), size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.88, depthWrite: false }));
      m.onBeforeCompile = function (shader) {
        shader.vertexShader = inject(shader.vertexShader, '#include <common>', 'attribute float reefBubbleSize;attribute float reefBubbleAlpha;varying float vReefBubbleAlpha;varying float vReefBubbleShape;', 'bubble');
        shader.vertexShader = shader.vertexShader.replace('gl_PointSize = size;', function () { return 'gl_PointSize = size * reefBubbleSize;vReefBubbleAlpha=reefBubbleAlpha;vReefBubbleShape=1.0+0.1*sin(reefBubbleSize*7.0);'; });
        shader.vertexShader = inject(shader.vertexShader, '#include <fog_vertex>', 'gl_PointSize=min(gl_PointSize,38.0);', 'bubble');
        shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', 'varying float vReefBubbleAlpha;varying float vReefBubbleShape;', 'bubble');
        // A transparent centre, a cool lower reflection and two small sun glints read as clear air instead of white foam.
        shader.fragmentShader = inject(shader.fragmentShader, '#include <color_fragment>',
          'vec2 reefB=gl_PointCoord*2.0-1.0;reefB.y*=vReefBubbleShape;float reefR=length(reefB);if(reefR>1.0||vReefBubbleAlpha<0.001)discard;' +
          'float reefEdge=1.0-smoothstep(0.91,1.0,reefR);float reefRim=smoothstep(0.68,0.91,reefR)*reefEdge;' +
          'float reefGlint=1.0-smoothstep(0.045,0.17,length(reefB-vec2(-0.35,-0.53)));float reefGlint2=1.0-smoothstep(0.025,0.085,length(reefB-vec2(0.42,0.41)));' +
          'float reefTop=clamp(0.48-reefB.y*0.65,0.0,1.0);vec3 reefGlass=mix(vec3(0.18,0.48,0.56),vec3(0.83,0.97,1.0),reefTop);' +
          'diffuseColor.rgb=mix(reefGlass,vec3(1.0),clamp(reefGlint+reefGlint2,0.0,1.0));' +
          'diffuseColor.a*=vReefBubbleAlpha*clamp(0.015*reefEdge+reefRim*(0.34+0.32*reefTop)+reefGlint*0.88+reefGlint2*0.45,0.0,1.0);', 'bubble');
      };
      m.customProgramCacheKey = function () { return key('bubble-exhale'); };
      bubbles = new T.Points(g, m); bubbles.frustumCulled = false; bubbles.name = 'reef-explore-bubbles'; bubbles.renderOrder = 5; scene.add(bubbles);
      for (var k = 0; k < BUBBLES; k++) bubbleState.push({ on: false, x: 0, y: 0, z: 0, ox: 0, oy: 0, oz: 0, jx: 0, jy: 0, jz: 0, v: 0, terminal: 0, ph: 0, s: 0, life: 0, birth: 0 });
    }
    function updateBubbles(dt) {
      // Two uneven exhalation clumps share the camera's 4.2 second breathing cycle.
      // Crossing absolute emission times preserves the breath cadence at any refresh rate.
      var before = bubbleClock, after = before + Math.max(0, dt), period = 4.2;
      var releases = reducedMotion ? [2.08, 2.38, 2.70] : [2.03, 2.07, 2.12, 2.18, 2.26, 2.36, 2.54, 2.60, 2.67, 2.75, 2.83, 2.91];
      bubbleClock = after; bubbleBudget = 0;
      if (typeof options.onEvent === 'function') soundEventStep(before, after, period, releases);
      for (var cycle = Math.floor(before / period); cycle <= Math.floor(after / period); cycle++) {
        for (var release = 0; release < releases.length; release++) {
          var birth = cycle * period + releases[release];
          if (birth <= before || birth > after) continue;
          bubbleSide = -bubbleSide;
          for (var k = 0; k < bubbleState.length; k++) {
            var b = bubbleState[k]; if (b.on) continue;
            // The exhaust starts at the real regulator tee, then rolls forward and out along each cheek.
            var reg = diver.localToWorld(new T.Vector3(REG.x + (rbub() - 0.5) * 0.012, REG.y, REG.z * bubbleSide));
            var lag = after - birth;
            reg.x -= fwdX(bearing) * speed * lag; reg.y -= vy * lag; reg.z -= fwdZ(bearing) * speed * lag;
            var jet = new T.Vector3(0.68 + rbub() * 0.14, 0.015 + rbub() * 0.018, bubbleSide * (0.035 + rbub() * 0.025)).applyQuaternion(diver.quaternion);
            b.on = true; b.ox = reg.x; b.oy = reg.y; b.oz = reg.z; b.jx = jet.x; b.jy = jet.y; b.jz = jet.z;
            b.v = 0.17 + rbub() * 0.07; b.terminal = 0.66 + rbub() * 0.22; b.ph = rbub() * TAU;
            b.s = 0.38 + Math.pow(rbub(), 1.1) * 0.88; b.birth = birth; b.life = lag;
            break;
          }
        }
      }
      var pos = bubbles.geometry.attributes.position, size = bubbles.geometry.attributes.reefBubbleSize, alpha = bubbles.geometry.attributes.reefBubbleAlpha;
      bubbleState.forEach(function (b, k) {
        if (b.on) {
          b.life = after - b.birth;
          var life = b.life, jet = 1 - Math.exp(-2.8 * life), rise = b.terminal * life - (b.terminal - b.v) * (1 - Math.exp(-1.9 * life)) / 1.9;
          var eddy = (reducedMotion ? 0.25 : 1) * (1 - Math.exp(-2 * life));
          // Sample the slow current at the middle of the bubble's life; position, rise, wobble and expansion are analytic.
          currentAt(b.ox, b.oz, visualTime - life * 0.5, ambientMotion.current);
          b.x = b.ox + b.jx * jet + ambientMotion.current.x * life + Math.sin(life * 5.2 + b.ph) * 0.016 * eddy;
          b.y = b.oy + b.jy * jet + rise;
          b.z = b.oz + b.jz * jet + ambientMotion.current.z * life + Math.cos(life * 4.6 + b.ph) * 0.022 * eddy;
          if (b.y > -0.15 || life > 10) b.on = false;
        }
        var fade = b.on ? clamp(b.life / 0.055, 0, 1) * clamp((10 - b.life) / 0.8, 0, 1) * clamp((-0.15 - b.y) / 0.2, 0, 1) : 0;
        pos.setXYZ(k, b.x, b.y, b.z); size.setX(k, b.on ? b.s * Math.min(1.34, Math.exp(0.027 * b.life)) : 0); alpha.setX(k, fade);
      });
      pos.needsUpdate = true; size.needsUpdate = true; alpha.needsUpdate = true;
    }

    // ---- Sound events for the lab's reef soundscape (options.onEvent) ---------------
    // Optional: each breath and each parrotfish bite as it happens, read from the same
    // closed-form schedules as the bubbles and the sediment puffs, so a crunch lands on
    // its puff and an exhale on its bubbles. Runs from updateBubbles (unpaused frames
    // only) and never changes the dive. The inhale sits on the rising half of the
    // camera's 4.2 s breathing sway, before the exhale's first bubbles.
    var soundEventWorld = null, soundEventBites = [];
    function soundEventStep(before, after, period, releases) {
      for (var cycle = Math.floor(before / period); cycle <= Math.floor(after / period); cycle++) {
        var tin = (cycle + 1) * period - 0.65, tout = cycle * period + releases[0];
        if (tin > before && tin <= after) soundEventSend({ type: 'inhale', lag: after - tin, duration: 1.45 });
        if (tout > before && tout <= after) soundEventSend({ type: 'exhale', lag: after - tout, duration: releases[releases.length - 1] - releases[0] + 0.4, clumps: releases.map(function (r) { return r - releases[0]; }) });
      }
      // Bites in (the last world time seen, now], as grazerBites finds them for the puffs.
      var from = soundEventWorld; soundEventWorld = worldTime;
      if (from === null || !(worldTime > from) || !eco) return;
      eco.grazers.forEach(function (o) {
        if (Math.hypot(o.home.x - diverPos.x, o.home.z - diverPos.z) > 40) return;
        soundEventBites.length = 0;
        grazerBites(o, worldTime, worldTime - from, soundEventBites);
        soundEventBites.forEach(function (b) {
          var dx = b.x - diverPos.x, dz = b.z - diverPos.z, dist = Math.hypot(dx, b.y - diverPos.y, dz);
          if (dist > 25) return;
          soundEventSend({ type: 'bite', key: b.key, t: b.t, speciesId: o.speciesId, school: !!o.eco.school, distanceM: r1(dist),
            pan: Math.round(Math.sin(wrapAngle(bearingTo(dx, dz) - bearing)) * 100) / 100, lag: (worldTime - b.t) / (reducedMotion ? 0.45 : 1) });
        });
      });
    }
    // A listener's error never stops the dive.
    function soundEventSend(event) { try { options.onEvent(event); } catch (ignore) {} }

    // ---- Focus ring and first-view mask ---------------------------------------------
    function buildFocusRing() {
      var m = own(new T.ShaderMaterial({
        uniforms: { opacity: { value: 0.9 }, color: { value: new T.Color(1.0, 0.94, 0.66) } }, transparent: true, depthTest: false, depthWrite: false,
        vertexShader: 'varying float vR;void main(){vR=length(position.xy);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform float opacity;uniform vec3 color;varying float vR;void main(){float a=smoothstep(0.8,0.92,vR)*(1.0-smoothstep(0.95,1.0,vR))+0.3*smoothstep(1.0,1.04,vR)*(1.0-smoothstep(1.04,1.16,vR));gl_FragColor=vec4(color,a*opacity);}'
      }));
      focusRing = new T.Mesh(own(new T.RingGeometry(0.78, 1.18, 64, 1)), m);
      focusRing.name = 'reef-explore-focus'; focusRing.renderOrder = 900; focusRing.frustumCulled = false; focusRing.visible = false; scene.add(focusRing);
    }
    function buildMask() {
      var m = own(new T.ShaderMaterial({
        uniforms: { aspect: { value: 1.6 }, breath: { value: 0.5 }, motion: { value: new T.Vector2() } },
        transparent: true, depthTest: false, depthWrite: false,
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
        fragmentShader: [
          'uniform float aspect;uniform float breath;uniform vec2 motion;varying vec2 vUv;',
          'float maskSmoothMax(float a,float b,float k){float h=clamp(0.5+0.5*(a-b)/k,0.0,1.0);return mix(b,a,h)+k*h*(1.0-h);}',
          'float maskBand(float d,float width){float v=d/width;return exp(-v*v);}',
          'void main(){',
          // The aperture follows the viewport; rim thickness and the nose pocket
          // use screen-height units, so portrait views retain an open field of view.
          ' vec2 p=(vUv*2.0-1.0)*vec2(aspect,1.0);',
          ' float span=max(aspect,0.3)*1.045;float ax=abs(p.x);float lateral=ax/span;',
          ' float brow=0.985-0.14*pow(lateral,2.4);',
          ' float cheek=-0.965+0.10*pow(lateral,2.0);',
          ' float shell=maskSmoothMax(max(p.y-brow,cheek-p.y),ax-span,0.22);',
          // A softly moulded silicone nose pocket below the binocular opening.
          // No central bar or tint crosses the scene in front of the diver.
          ' vec2 n=vec2(p.x/0.23,(p.y+1.13)/0.43);',
          ' float nose=(1.0-length(n))*0.23;',
          ' float d=maskSmoothMax(shell,nose,0.018);',
          ' float solid=smoothstep(-0.008,0.033,d);',
          ' float falloff=maskBand(d+0.030,0.042)*(1.0-solid);',
          ' float seal=maskBand(d-0.032,0.012);',
          ' float lip=maskBand(d-0.006,0.008);',
          // Light catches two thin interfaces: tempered glass and the inner seal.
          // Glints are local to the rim; breathing never changes central visibility.
          ' float upper=smoothstep(-0.25,0.85,p.y);',
          ' float grazing=0.22+0.78*pow(0.5+0.5*sin(p.x*2.6+0.65+motion.x*0.08),4.0);',
          ' float glint=maskBand(d+0.032,0.005)*(0.30+0.70*upper)*grazing;',
          ' float glass=maskBand(d+0.048,0.011)*(0.35+0.65*upper);',
          ' float warm=maskBand(d+0.023,0.004)*upper*pow(0.5+0.5*sin(p.x*3.1-1.0),6.0);',
          ' float noseFace=smoothstep(0.0,0.07,nose)*(1.0-smoothstep(0.12,0.24,ax));',
          ' vec3 silicone=mix(vec3(0.008,0.020,0.024),vec3(0.033,0.052,0.056),0.25+0.45*upper+0.30*noseFace);',
          ' silicone+=lip*vec3(0.030,0.046,0.047);silicone*=1.0-seal*0.5;',
          ' float bodyAlpha=solid*0.95+falloff*0.070;',
          ' float glassAlpha=glass*0.048+glint*(0.20+0.004*breath)+warm*0.065;',
          ' vec3 reflected=vec3(0.30,0.63,0.65)*glass*0.048+vec3(0.65,0.87,0.86)*glint*(0.20+0.004*breath)+vec3(0.74,0.72,0.54)*warm*0.065;',
          ' float alpha=clamp(bodyAlpha+glassAlpha,0.0,0.97);',
          ' if(alpha<0.001)discard;',
          ' gl_FragColor=vec4((silicone*bodyAlpha+reflected)/max(alpha,0.001),alpha);',
          '}'
        ].join('\n')
      }));
      mask = new T.Mesh(own(new T.PlaneGeometry(2, 2)), m);
      mask.name = 'reef-explore-mask'; mask.renderOrder = 1000; mask.frustumCulled = false; mask.visible = view === 'first'; scene.add(mask);
    }

    // ---- Diver movement ---------------------------------------------------------------
    function spawnDiver() {
      // Start facing the most striking bommie nearby (the cleaning station when it is close).
      var best = null, score = 0;
      var sp = terrain.spawn;
      bommies.forEach(function (b) { var d = Math.hypot(b.x - sp.x, b.z - sp.z); if (d > 3 && d < 17) { var s = b.r * b.h / d * (b === station ? 1.6 : 1); if (s > score) { score = s; best = b; } } });
      bearing = best ? bearingTo(best.x - sp.x, best.z - sp.z) : 0;
      // Just inside the calm-hover band (senseReef counts calm below CALM_NEAR, 2.2 m), so a
      // still hover at the start counts.
      diverPos.set(sp.x, Math.min(SURFACE_Y, groundTop(sp.x, sp.z) + 2), sp.z);
      // Each mount is one dive: its reef contacts, calm time and depth start here.
      touch = freshTouch(); touch.maxDepth = -diverPos.y;
    }
    function currentInput() {
      return { forward: clamp(keys.forward - keys.back + ext.forward, -1, 1), turn: clamp(keys.right - keys.left + ext.turn, -1, 1), rise: clamp(keys.up - keys.down + ext.rise, -1, 1) };
    }
    function updateDiver(dt) {
      var input = currentInput(), active = Math.abs(input.forward) > 0.02 || Math.abs(input.turn) > 0.02 || Math.abs(input.rise) > 0.02, ease = reducedMotion ? 2.5 : 1;
      if (active && restoreWideLens()) notify(true);
      if (active || Math.abs(speed) > 0.15 || Math.abs(vy) > 0.15) observationAim = null;
      if (autopilot && active) cancelSwim();
      if (autopilot) stepAutopilot(dt);
      else {
        var targetV = input.forward >= 0 ? input.forward * 1.5 : input.forward * 0.7;
        speed += (targetV - speed) * damp((Math.abs(targetV) > Math.abs(speed) ? 1.6 : 1.1) * ease, dt);
        turnRate += (input.turn * 1.05 - turnRate) * damp(4.5 * ease, dt);
        vy += (input.rise * 0.8 - vy) * damp(2.2 * ease, dt);
        bearing = wrapAngle(bearing + turnRate * dt);
        diverPos.x += fwdX(bearing) * speed * dt; diverPos.z += fwdZ(bearing) * speed * dt; diverPos.y += vy * dt;
        var edge = Math.max(Math.abs(diverPos.x), Math.abs(diverPos.z));
        if (edge > SOFT_EDGE) {
          // The diver is turned gently back toward the reef.
          var push = clamp((edge - SOFT_EDGE) / (HARD_EDGE - SOFT_EDGE), 0, 1), home = bearingTo(-diverPos.x, -diverPos.z);
          if (speed > 0.05) bearing = wrapAngle(bearing + wrapAngle(home - bearing) * damp(0.9 + 2.5 * push, dt) * push);
          if (Math.abs(diverPos.x) > SOFT_EDGE) diverPos.x -= Math.sign(diverPos.x) * (Math.abs(diverPos.x) - SOFT_EDGE) * damp(0.8, dt);
          if (Math.abs(diverPos.z) > SOFT_EDGE) diverPos.z -= Math.sign(diverPos.z) * (Math.abs(diverPos.z) - SOFT_EDGE) * damp(0.8, dt);
        }
      }
      constrainDiver(dt);
      senseReef(dt);
    }
    function constrainDiver(dt) {
      diverPos.x = clamp(diverPos.x, -HARD_EDGE, HARD_EDGE); diverPos.z = clamp(diverPos.z, -HARD_EDGE, HARD_EDGE);
      var ahead = Math.max(0, speed) * 1.2, top = Math.max(groundTop(diverPos.x, diverPos.z), groundTop(diverPos.x + fwdX(bearing) * ahead, diverPos.z + fwdZ(bearing) * ahead) - 0.1);
      var minY = top + DIVER_CLEAR;
      // The climb over a coral head ahead is quick but never a lurch (diverClear keeps the
      // body out of the rock meanwhile; before it, a head 2 m tall lifted 0.5 m in a frame).
      if (diverPos.y < minY) { diverPos.y += Math.min((minY - diverPos.y) * damp(reducedMotion ? 10 : 5, dt), CLEAR_CLIMB * dt); if (vy < 0) vy *= 0.5; }
      var hard = diverClearFloor(diverPos.x, diverPos.z);
      if (diverPos.y < hard) diverPos.y = hard;
      diverClear(dt);
      if (diverPos.y > SURFACE_Y) { diverPos.y = SURFACE_Y; if (vy > 0) vy = 0; }
    }
    // ---- Diver clearance: no part of the diver inside rock -------------------------
    // The checks above hold the body's centre over the reef and climb ahead; the legs
    // trail up to 1.9 m behind, so backing or turning low could put the fins deep into
    // a coral head. Points along the whole rig (fin blades, ankles, knees, hips, hands,
    // chest, face) are tested against the rock itself, the floor and each bommie's own
    // height field, and the diver moves out the shortest way: up off a gentle surface,
    // out from a steep wall. A fin can rest on rock (a brush the contact sensing still
    // notices), never sink into it. Swimming into the rock eases the stroke; nothing sticks.
    var CLEAR_SKIN = 0.02, CLEAR_CLIMB = 2.5;
    var CLEAR_FIN = [[-0.578, -0.044, 0], [-0.578, -0.044, 0.13], [-0.578, -0.044, -0.13], [-0.4, -0.035, 0.12], [-0.4, -0.035, -0.12], [-0.2, -0.025, 0]];
    var CLEAR_BODY = [[0.77, 0.06, 0], [0.56, -0.21, 0], [0.15, -0.17, 0], [-0.42, -0.12, 0], [-0.2, -0.15, 0.15], [-0.2, -0.15, -0.15]];
    var CLEAR_ANKLE = [0, -0.05, 0], CLEAR_KNEE = [0, -0.06, 0], clearKit = null;
    // The lowest the body's centre may go: continuous, so crossing a 0.5 m grid cell
    // never pops the diver up (the cell-maximum floor did, by up to 0.4 m in one frame).
    function diverClearFloor(x, z) {
      var top = surfaceAt(x, z);
      for (var i = 0; i < bommies.length; i++) {
        var b = bommies[i], dx = x - b.x, dz = z - b.z, reach = b.r * 1.36;
        if (dx * dx + dz * dz < reach * reach) top = Math.max(top, b.heightAt(x, z));
      }
      return Math.max(terrain.floorY(x, z) + DIVER_FLOOR, top + DIVER_CLEAR * 0.5);
    }
    function diverClearKit() {
      if (clearKit) return clearKit;
      var n = legs.length * (CLEAR_FIN.length + 2) + CLEAR_BODY.length;
      clearKit = { n: n, pts: new Float32Array(n * 3), near: [], hit: { b: null }, push: new T.Vector3(), v: new T.Vector3(), inv: new T.Matrix4(), now: new T.Matrix4(), carry: new T.Matrix4(), m: new T.Matrix4(),
        pos: new T.Vector3(), q: new T.Quaternion(), e: new T.Euler(0, 0, 0, 'YZX'), one: new T.Vector3(1, 1, 1) };
      return clearKit;
    }
    // The rig as animateDiver posed it last frame, carried to this frame's place and heading.
    function diverClearPoints(K) {
      K.inv.copy(diver.matrixWorld).invert();
      K.now.compose(K.pos.set(diverPos.x, diverPos.y, diverPos.z), K.q.setFromEuler(K.e.set(bodyRoll, yawFor(bearing), bodyPitch, 'YZX')), K.one);
      K.carry.multiplyMatrices(K.now, K.inv);
      var at = 0, i, j;
      for (i = 0; i < legs.length; i++) {
        K.m.multiplyMatrices(K.carry, legs[i].fin.matrixWorld);
        for (j = 0; j < CLEAR_FIN.length; j++) at = diverClearPut(K, K.m, CLEAR_FIN[j], at);
        at = diverClearPut(K, K.m.multiplyMatrices(K.carry, legs[i].ankle.matrixWorld), CLEAR_ANKLE, at);
        at = diverClearPut(K, K.m.multiplyMatrices(K.carry, legs[i].knee.matrixWorld), CLEAR_KNEE, at);
      }
      for (j = 0; j < CLEAR_BODY.length; j++) at = diverClearPut(K, K.now, CLEAR_BODY[j], at);
    }
    function diverClearPut(K, m, p, at) { K.v.set(p[0], p[1], p[2]).applyMatrix4(m); K.pts[at] = K.v.x; K.pts[at + 1] = K.v.y; K.pts[at + 2] = K.v.z; return at + 3; }
    // The rock under (x, z): the floor or the highest bommie there (hit.b names it).
    function diverClearRock(K, x, z) {
      var top = terrain.floorY(x, z); K.hit.b = null;
      for (var i = 0; i < K.near.length; i++) {
        var b = K.near[i], dx = x - b.x, dz = z - b.z, reach = b.r * 1.36;
        if (dx * dx + dz * dz >= reach * reach) continue;
        var h = b.heightAt(x, z); if (h > top) { top = h; K.hit.b = b; }
      }
      return top;
    }
    // Distance out through a bommie's wall, along its radius, to where it is lower than y.
    function diverClearExit(b, x, y, z) {
      var dx = x - b.x, dz = z - b.z, lx = dx * b.c + dz * b.s, lz = -dx * b.s + dz * b.c, a = Math.atan2(lz, lx), e = b.edge(a), ca = Math.cos(a) * e, sa = Math.sin(a) * e;
      var start = Math.hypot(lx, lz) / e, lo = start, hi = 1;
      for (var k = 0; k < 8; k++) { var mid = (lo + hi) * 0.5; if (b.heightLocal(mid * ca, mid * sa) > y) lo = mid; else hi = mid; }
      return Math.max(0.005, (hi - start) * e);
    }
    function diverClear(dt) {
      if (!diver || !legs.length || !terrain) return;
      var K = diverClearKit(), i, low = diverPos.y - 1.1;
      // Only rock within reach of the legs can matter; high above the reef nothing does.
      K.near.length = 0;
      for (i = 0; i < bommies.length; i++) { var bm = bommies[i]; if (bm.base + bm.h * 1.23 > low && Math.hypot(bm.x - diverPos.x, bm.z - diverPos.z) < bm.r * 1.36 + 2.1) K.near.push(bm); }
      if (!K.near.length && low > terrain.floorY(diverPos.x, diverPos.z) + 1.6) return;
      diverClearPoints(K);
      var push = K.push.set(0, 0, 0);
      for (var it = 0; it < 4; it++) {
        var worst = 0, sx = 0, sy = 0, sz = 0;
        for (i = 0; i < K.n; i++) {
          var x = K.pts[i * 3] + push.x, y = K.pts[i * 3 + 1] + push.y, z = K.pts[i * 3 + 2] + push.z, dv = diverClearRock(K, x, z) + CLEAR_SKIN - y;
          if (dv <= 0) continue;
          var px = 0, py = dv, pz = 0, d2 = dv * dv, b = K.hit.b;
          if (b) {
            // Up and out are both ways clear; the push takes the shorter, blended as for a plane.
            var dh = diverClearExit(b, x, y - CLEAR_SKIN, z), rx = x - b.x, rz = z - b.z, rl = Math.hypot(rx, rz);
            if (rl < 1e-3) { rx = diverPos.x - b.x; rz = diverPos.z - b.z; rl = Math.hypot(rx, rz) || 1; }
            d2 = 1 / (1 / (dh * dh) + 1 / (dv * dv));
            px = rx / rl * d2 / dh; pz = rz / rl * d2 / dh; py = d2 / dv;
          }
          if (d2 > worst) { worst = d2; sx = px; sy = py; sz = pz; }
        }
        if (!(worst > 0)) break;
        push.x += sx; push.y += sy; push.z += sz;
      }
      if (push.x === 0 && push.y === 0 && push.z === 0) return;
      diverPos.add(push);
      diverPos.x = clamp(diverPos.x, -HARD_EDGE, HARD_EDGE); diverPos.z = clamp(diverPos.z, -HARD_EDGE, HARD_EDGE);
      // Swimming into rock eases the stroke (and a sink onto it stops), so the diver
      // rests against it instead of pressing on, and answers at once to a new direction.
      var ph = Math.hypot(push.x, push.z), ease = damp(10, dt);
      if (ph > 1e-6 && Math.abs(speed) > 1e-6) {
        var into = -(fwdX(bearing) * push.x + fwdZ(bearing) * push.z) / ph * (speed > 0 ? 1 : -1);
        if (into > 0) speed *= 1 - into * ease;
      }
      if (push.y > 0 && vy < 0) vy *= 1 - ease;
    }

    // ---- Reef contact: hover, don't touch -------------------------------------------
    // Points on the diver (hands, chest, face, hips, knees, fin tips) are checked
    // against the reef each unpaused frame. A brush of living coral or other
    // attached life counts once, then rests (TOUCH_REST s from the last contact);
    // the bare bottom counts apart, and so does a hard fin kick just above sand.
    // Nothing pushes or harms anything: the dive notices, and a little sediment
    // puffs up. Steady, slow hovering near the reef adds up as calm time.
    var TOUCH_SKIN = 0.06, TOUCH_FREE = 0.15, TOUCH_CLOSE = 0.3, TOUCH_REST = 2, STIR_M = 0.3, CALM_NEAR = 2.2;
    var TOUCH_BODY = [[0.56, -0.21, 0], [0.15, -0.17, 0], [0.7, -0.04, 0], [-0.42, -0.12, 0]];
    var touch, lifeIndex, puff, touchV = new T.Vector3(), touchShift = new T.Vector3(), touchFound = { gap: 0, kind: null }, touchFlow = { x: 0, z: 0, strength: 0 };
    function freshTouch() {
      return { reef: 0, sand: 0, time: 0, calm: 0, calmRun: 0, maxDepth: 0, reefAt: -Infinity, sandAt: -Infinity, onReef: false, onSand: false, close: false, kind: null, state: 'swim' };
    }
    // The reef top between the grid's corners (bilinear, so a colony's edge slopes instead of stepping).
    function surfaceAt(x, z) {
      var fy = terrain.floorY(x, z), fx = clamp((x - GRID_MIN) / GRID_STEP, 0, GRID_N - 1), fz = clamp((z - GRID_MIN) / GRID_STEP, 0, GRID_N - 1);
      var i = Math.min(GRID_N - 2, Math.floor(fx)), j = Math.min(GRID_N - 2, Math.floor(fz)), k = j * GRID_N + i, u = fx - i, v = fz - j;
      return lerp(lerp(Math.max(fy, obstacle[k]), Math.max(fy, obstacle[k + 1]), u), lerp(Math.max(fy, obstacle[k + GRID_N]), Math.max(fy, obstacle[k + GRID_N + 1]), u), v);
    }
    // Attached living organisms (corals, restoration units, anemones, clams, fans,
    // sponges), bucketed in 2 m cells; short ones never reach the grid, so they need this.
    function buildLifeIndex() {
      var index = {};
      organisms.forEach(function (o) {
        if (o.path || !o.center || o.behavior !== 'fixed') return;
        var g = o.info.group;
        if (!(g === 'coral' || g === 'structure' || o.info.habit === 'sessile') || coralState(o) === 'dead') return;
        var half = (o.boxMaxY - o.boxMinY) * 0.5 * (o.scale || 1), cell = Math.floor((o.center.z - GRID_MIN) / 2) * 64 + Math.floor((o.center.x - GRID_MIN) / 2);
        (index[cell] = index[cell] || []).push({ x: o.center.x, z: o.center.z, r: o.radius * 0.85 + 0.1, top: o.center.y + half, bottom: o.center.y - half - 0.15, kind: g === 'invertebrate' ? 'life' : 'coral' });
      });
      return index;
    }
    function lifeAt(x, y, z) {
      if (!lifeIndex) lifeIndex = buildLifeIndex();
      var ci = Math.floor((x - GRID_MIN) / 2), cj = Math.floor((z - GRID_MIN) / 2), found = null;
      for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
        var list = lifeIndex[(cj + dj) * 64 + ci + di];
        for (var q = 0; list && q < list.length; q++) {
          var e = list[q];
          if (y < e.bottom || Math.hypot(e.x - x, e.z - z) > e.r || (found && y - e.top >= found.gap)) continue;
          found = touchFound; found.gap = y - e.top; found.kind = e.kind;
        }
      }
      return found;
    }
    // Living coral, bleached coral (still alive) and other attached life; the rest is bottom.
    function patchState(x, z) { var F = cover(), k = F.at(x, z); return k < 0 ? SAND : F.onReef[k] === 2 && (F.state[k] === SAND || F.state[k] === RUBBLE) ? ROCK : F.state[k]; }
    function touchPoint(i, out) {
      var n = TOUCH_BODY.length;
      if (i < n) diver.localToWorld(out.set(TOUCH_BODY[i][0], TOUCH_BODY[i][1], TOUCH_BODY[i][2]));
      else if ((i - n) & 1) legs[(i - n) >> 1].fin.localToWorld(out.set(-0.5, -0.04, 0));
      else legs[(i - n) >> 1].knee.localToWorld(out.set(0, -0.06, 0));
      return out.add(touchShift);
    }
    function senseReef(dt) {
      var s = touch || (touch = freshTouch());
      if (!(dt > 0) || !diver || !terrain) return;
      s.time += dt; s.maxDepth = Math.max(s.maxDepth, -diverPos.y);
      // The rig was posed last frame; carry its points to where the diver is now.
      touchShift.set(diverPos.x - diver.position.x, diverPos.y - diver.position.y, diverPos.z - diver.position.z);
      var reefMin = Infinity, kind = null, rx = 0, ry = 0, rz = 0, bottomMin = Infinity, bx = 0, bz = 0, stir = false, count = TOUCH_BODY.length + legs.length * 2;
      for (var i = 0; i < count; i++) {
        var p = touchPoint(i, touchV), life = lifeAt(p.x, p.y, p.z);
        if (life) { if (life.gap < reefMin) { reefMin = life.gap; kind = life.kind; rx = p.x; ry = p.y; rz = p.z; } continue; }
        var g = p.y - surfaceAt(p.x, p.z), st = patchState(p.x, p.z);
        if (st === LIVE || st === BLEACHED || st === LIFE) { if (g < reefMin) { reefMin = g; kind = st === LIFE ? 'life' : 'coral'; rx = p.x; ry = p.y; rz = p.z; } continue; }
        if (g < bottomMin) { bottomMin = g; bx = p.x; bz = p.z; }
        // A strong fin stroke just above loose sand or rubble lifts it.
        if (i >= TOUCH_BODY.length && ((i - TOUCH_BODY.length) & 1) && g < STIR_M && swimEffort > 0.5 && (st === SAND || st === RUBBLE)) { stir = true; bx = p.x; bz = p.z; }
      }
      var onReef = reefMin < (s.onReef ? TOUCH_FREE : TOUCH_SKIN), onSand = bottomMin < (s.onSand ? TOUCH_FREE : TOUCH_SKIN) || stir;
      // A swim the student is not steering (Swim to) never counts, and a brush
      // that continues, or comes back within the rest, is the same contact.
      if (onReef) {
        if (!s.onReef && s.time - s.reefAt > TOUCH_REST && !autopilot) { s.reef++; s.kind = kind; puffAt(rx, Math.max(ry, surfaceAt(rx, rz)), rz, false); }
        s.reefAt = s.time;
      }
      if (onSand) {
        if (!s.onSand && s.time - s.sandAt > TOUCH_REST && !autopilot) { s.sand++; puffAt(bx, surfaceAt(bx, bz) + 0.03, bz, true); }
        s.sandAt = s.time;
      }
      s.onReef = onReef; s.onSand = onSand;
      s.close = reefMin < (s.close ? TOUCH_CLOSE + 0.1 : TOUCH_CLOSE);
      var calm = !autopilot && !onReef && s.time - s.reefAt > TOUCH_REST && Math.abs(speed) < 0.4 && Math.abs(vy) < 0.25 && Math.abs(turnRate) < 0.4 && diverPos.y - groundTop(diverPos.x, diverPos.z) < CALM_NEAR;
      s.calmRun = calm ? s.calmRun + dt : 0; if (calm) s.calm += dt;
      s.state = onReef || s.time - s.reefAt < 1.5 ? 'touch' : s.close ? 'close' : s.calmRun >= 1.5 ? 'calm' : 'swim';
      updatePuff(dt);
    }
    function buoyancyState() {
      var s = touch;
      if (!s) return { reefContacts: 0, sandContacts: 0, calmS: 0, diveS: 0, maxDepthM: 0, state: 'swim', lastReef: null, touching: false };
      return { reefContacts: s.reef, sandContacts: s.sand, calmS: r1(s.calm), diveS: r1(s.time), maxDepthM: r1(s.maxDepth), state: s.state, lastReef: s.kind, touching: s.onReef };
    }
    // Calm time is news every 5 s, so a still hover still refreshes the tool's indicator.
    function buoyancyKey(b) { return b ? b.reefContacts + '/' + b.sandContacts + b.state + Math.floor(b.calmS / 5) : ''; }
    // The sediment puff shares the marine snow's program (same material settings and
    // cache key) with its own, never-wrapping parcel; one puff plays at a time.
    function buildPuff() {
      var src = motes.material, m = own(src.clone()), n = reducedMotion ? 8 : high ? 26 : 18;
      var cell = { center: { value: new T.Vector3(0, -100, 0) }, box: { value: new T.Vector3(400, 400, 400) }, time: { value: 0 }, top: { value: 0 } };
      m.color.copy(lin(0xd8d0b4)); m.size = 0.36; m.opacity = 0;
      m.onBeforeCompile = function (shader, r) {
        src.onBeforeCompile(shader, r);
        shader.uniforms.reefSnowCenter = cell.center; shader.uniforms.reefSnowBox = cell.box; shader.uniforms.reefSnowTime = cell.time; shader.uniforms.reefSnowTop = cell.top;
      };
      m.customProgramCacheKey = src.customProgramCacheKey;
      var g = own(new T.BufferGeometry());
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('reefSnowDrift', new T.BufferAttribute(new Float32Array(n * 3), 3));
      var points = new T.Points(g, m); points.frustumCulled = false; points.visible = false; points.renderOrder = 4; points.name = 'reef-explore-touch-puff'; points.userData.decorative = true;
      scene.add(points);
      return { points: points, n: n, age: 0, life: 1, sandy: false, x: 0, y: 0, z: 0, cx: 0, cz: 0, sx: 0, sy: 0, sz: 0, serial: 0 };
    }
    function puffAt(x, y, z, sandy) {
      if (!motes || !motes.material) return;
      var p = puff || (puff = buildPuff());
      p.serial++; p.age = 0; p.sandy = sandy; p.life = reducedMotion ? 1.8 : sandy ? 3.2 : 2.6; p.x = x; p.y = y; p.z = z;
      currentAt(x, z, worldTime, touchFlow); p.cx = touchFlow.x; p.cz = touchFlow.z;
      // The snow shader adds its slow surge; at time 0 it is a fixed offset, taken off here.
      var phase = -(x * 0.13 + z * 0.09), lift = x * 0.08 - z * 0.11;
      p.sx = -0.17 * Math.cos(phase); p.sy = 0.055 * Math.sin(lift); p.sz = -0.12 * Math.cos(phase + 0.45);
      p.points.visible = true; updatePuff(0);
    }
    function updatePuff(dt) {
      var p = puff;
      if (!p || !p.points.visible) return;
      p.age += dt;
      var u = p.age / p.life;
      if (u >= 1) { p.points.visible = false; p.points.material.opacity = 0; return; }
      var pos = p.points.geometry.attributes.position, calm = reducedMotion ? 0.3 : 1, spread = (p.sandy ? 1.5 : 1) * calm;
      var out = 1 - Math.exp(-2.2 * p.age), up = 1 - Math.exp(-1.5 * p.age);
      for (var i = 0; i < p.n; i++) {
        var a = hash2(i, p.serial * 7 + 1) * TAU, r = hash2(i, p.serial * 7 + 2), h = hash2(i, p.serial * 7 + 3), d = (0.06 + 0.3 * r) * spread * out;
        pos.setXYZ(i, p.x - p.sx + Math.cos(a) * d + p.cx * p.age, p.y - p.sy + (0.03 + 0.22 * h) * spread * up - 0.03 * p.age * calm, p.z - p.sz + Math.sin(a) * d + p.cz * p.age);
      }
      pos.needsUpdate = true;
      // Fades in at once, holds, then thins away as it settles. The snow shader thins
      // each speck to about a fifth (it is made for faint motes), so the peak is above 1.
      p.points.material.opacity = (p.sandy ? 3.4 : 2.8) * smooth(0, 0.06, u) * (1 - smooth(0.3, 1, u));
    }
    // A long trailing appendage still belongs to the visibility bounds. Guide
    // cues and deliberate observation can frame the animal's body separately.
    function observationCenter(o) { return o.observationCenter || o.center; }
    function observationRadius(o) { return o.observationRadius || o.radius; }
    function viewDistance(o) { return clamp(0.9 + observationRadius(o) * 2.2, 1.4, 5); }
    function spotFor(ap, out) {
      var c = observationCenter(ap.o), D = ap.D;
      out.x = clamp(c.x + ap.dirX * D, -HARD_EDGE + 0.5, HARD_EDGE - 0.5); out.z = clamp(c.z + ap.dirZ * D, -HARD_EDGE + 0.5, HARD_EDGE - 0.5);
      out.y = Math.min(SURFACE_Y, Math.max(c.y + 0.25 + 0.2 * D, groundTop(out.x, out.z) + DIVER_CLEAR));
      return out;
    }
    function startAutopilot(o) {
      observationAim = null;
      restoreWideLens();
      var c = observationCenter(o), dx = diverPos.x - c.x, dz = diverPos.z - c.z, d = Math.hypot(dx, dz);
      if (o.viewDir) { dx = o.viewDir.x; dz = o.viewDir.z; d = 1; }
      if (d < 0.01) { dx = -fwdX(bearing); dz = -fwdZ(bearing); d = 1; }
      var ap = { o: o, dirX: dx / d, dirZ: dz / d, from: diverPos.clone(), fromBearing: bearing, t: 0, D: viewDistance(o), lift: 0 }, spot = spotFor(ap, {});
      var dist = Math.hypot(spot.x - diverPos.x, spot.y - diverPos.y, spot.z - diverPos.z);
      ap.duration = reducedMotion ? clamp(0.5 + dist * 0.02, 0.5, 1.0) : clamp(dist / 1.3, 1.2, 16);
      autopilot = ap; speed = 0; vy = 0; turnRate = 0;
    }
    function stepAutopilot(dt) {
      var ap = autopilot; ap.t += dt;
      var u = clamp(ap.t / ap.duration, 0, 1), e = u * u * u * (u * (u * 6 - 15) + 10), sp = spotFor(ap, apSpot);
      var px = lerp(ap.from.x, sp.x, e), pz = lerp(ap.from.z, sp.z, e), py = lerp(ap.from.y, sp.y, e);
      var ahead = Math.min(1, u + 0.08), ax = lerp(ap.from.x, sp.x, ahead), az = lerp(ap.from.z, sp.z, ahead);
      var need = Math.max(0, Math.max(groundTop(px, pz), groundTop(ax, az)) + DIVER_CLEAR - py);
      ap.lift += (need - ap.lift) * damp(need > ap.lift ? 5 : 2, dt);
      var ox = diverPos.x, oz = diverPos.z;
      diverPos.set(px, py + ap.lift * (1 - e * e), pz);
      speed = dt > 0 ? Math.hypot(diverPos.x - ox, diverPos.z - oz) / dt : 0;
      var c = observationCenter(ap.o), face = bearingTo(c.x - diverPos.x, c.z - diverPos.z);
      bearing = wrapAngle(ap.fromBearing + wrapAngle(face - ap.fromBearing) * smooth(0, 0.7, u));
      if (u >= 1) {
        bearing = face; speed = 0; vy = 0; turnRate = 0; autopilot = null;
        // Swing the third-person camera to a rear quarter so the diver does not hide what it came to see.
        var side = 1, best = Infinity;
        [1, -1].forEach(function (sgn) { var yw = face + 0.62 * sgn, top = groundTop(diverPos.x - fwdX(yw) * camDist, diverPos.z - fwdZ(yw) * camDist); if (top < best) { best = top; side = sgn; } });
        look.yaw = view === 'third' ? 0.62 * side : 0; look.pitch = view === 'third' ? 0.06 : 0;
        // Small animals get a closer camera (the wheel or a pinch still changes it).
        camDist = clamp(1.9 + observationRadius(ap.o) * 3.5, 2.2, 6.5);
        notify(true);
      }
    }

    // ---- Camera ---------------------------------------------------------------------------
    // A flat mask: light bends where the water meets the air behind the glass, so a thing
    // ahead looks 4/3 as big (its image sits at three quarters of its distance) and the
    // mask takes in a narrower slice of the water (NOAA Diving Manual 1991, 2.8.1.1). The
    // unmasked view is 60 degrees tall; through the glass that is 46.8 degrees of water.
    // A narrow or portrait screen still keeps at least 54 degrees across (up to 82 tall):
    // there peripheral vision wins over the magnification.
    var LENS_WATER = 4 / 3;
    function lensWaterFov(airFov) { return 2 * Math.atan(Math.tan(airFov * Math.PI / 360) / LENS_WATER) * 180 / Math.PI; }
    function lensMaskFov(aspect) { return clamp(2 * Math.atan(Math.tan(27 * Math.PI / 180) / aspect) * 180 / Math.PI, lensWaterFov(60), 82); }
    function baseLensFov() { return view === 'first' ? lensMaskFov(camera.aspect) : 60; }
    function updateLens() {
      // Optical magnification narrows the projection at the existing eye point.
      // Dividing its tangent gives the same image-size ratio in either camera
      // and any aspect ratio; breathing never zooms or distorts the reef.
      var base = baseLensFov();
      camera.fov = magnification === 1 ? base : 2 * Math.atan(Math.tan(base * Math.PI / 360) / magnification) * 180 / Math.PI;
      camera.updateProjectionMatrix();
    }
    function restoreWideLens() {
      if (magnification === 1) return false;
      magnification = 1; updateLens();
      if (loaded) refreshDecor(true);
      return true;
    }
    // The dive starts facing a striking bommie, chosen for the view from behind; through
    // the mask it is a wall of rock. Until the diver first swims, the eyes lift so the top
    // of the reef ahead (the highest rock within 9 m of the gaze) sits just above the middle
    // of the view, with water and reef beyond. Once the diver sets off it eases away.
    var lensOpen = { on: true, lift: 0 };
    function lensSkyline(yaw) {
      var top = -Math.PI / 2, x = diverPos.x, y = diverPos.y + 0.09, z = diverPos.z;
      for (var d = 1; d <= 9; d += 0.5) top = Math.max(top, Math.atan2(rockSurfaceAt(x + fwdX(yaw) * d, z + fwdZ(yaw) * d) - y, d));
      return top;
    }
    function lensLift(yaw, snap, dt) {
      if (paused && !snap) return lensOpen.lift;
      var input = currentInput();
      if (autopilot || Math.abs(input.forward) > 0.02 || Math.abs(input.rise) > 0.02 || Math.hypot(diverPos.x - terrain.spawn.x, diverPos.z - terrain.spawn.z) > 0.6) lensOpen.on = false;
      var aim = lensOpen.on ? clamp(lensSkyline(yaw) - Math.atan(Math.tan(baseLensFov() * Math.PI / 360) * 0.15) + 0.12, 0, 0.45) : 0;
      lensOpen.lift += (aim - lensOpen.lift) * (snap ? 1 : damp(lensOpen.on ? 3 : 1.2, dt));
      return lensOpen.lift;
    }
    function updateCamera(dt, snap) {
      if (!paused && !dragging && (Math.abs(speed) > 0.15 || autopilot)) { var rc = damp(0.7, dt); look.yaw -= wrapAngle(look.yaw) * rc; look.pitch -= look.pitch * rc; }
      var yaw = bearing + look.yaw, a = snap ? 1 : damp(reducedMotion ? 9 : 4.5, dt);
      // Move only a few millimetres about the eye anchor. Automatic head motion
      // follows breathing and fin effort; pointer look stays immediate.
      if (!paused && !reducedMotion) {
        var breath = visualTime * TAU / 4.2, drift = visualTime * 0.43, ease = damp(3.5, dt);
        eyeMotion.pitch += (0.0032 * Math.sin(breath - 0.35) + 0.0025 * swimEffort * Math.sin(kick * 2 - 0.5) - eyeMotion.pitch) * ease;
        eyeMotion.yaw += (0.0018 * Math.sin(drift) - 0.022 * turnRate - eyeMotion.yaw) * ease;
        eyeMotion.roll += (0.0027 * Math.sin(drift + 0.6) + 0.0045 * swimEffort * Math.sin(kick - 0.8) - 0.016 * turnRate - eyeMotion.roll) * ease;
        eyeMotion.heave += (0.006 * Math.sin(breath - 0.2) - eyeMotion.heave) * ease;
        eyeMotion.sway += (0.004 * Math.sin(drift + 0.4) - eyeMotion.sway) * ease;
        eyeMotion.surge += (0.007 * Math.sin(breath - 0.6) + 0.004 * swimEffort * Math.sin(kick * 2) - eyeMotion.surge) * ease;
      }
      if (view === 'third') {
        var pitch = clamp(0.32 + look.pitch, -0.35, 1.25), cp = Math.cos(pitch), bob = reducedMotion || paused ? 0 : 0.03 * Math.sin(visualTime * 1.3);
        var tx = diverPos.x, ty = diverPos.y + 0.35 + bob, tz = diverPos.z;
        desired.set(tx - fwdX(yaw) * cp * camDist, ty + Math.sin(pitch) * camDist, tz - fwdZ(yaw) * cp * camDist);
        desired.y = Math.max(Math.min(desired.y, -0.3), groundTop(desired.x, desired.z) + 0.35);
        // Aim a little past the diver so the reef ahead fills the view and the diver sits low in the frame.
        camPos.lerp(desired, a); lookAt.set(tx + fwdX(yaw) * 1.8 * cp, ty, tz + fwdZ(yaw) * 1.8 * cp);
        // A focused organism close by pulls the framing toward itself.
        var fo = focusedUid && byUid[focusedUid];
        if (fo && !autopilot && observationCenter(fo).distanceTo(diverPos) < 7) lookAt.lerp(observationCenter(fo), 0.45);
        if (observationAim) lookAt.copy(observationAim);
        camTarget.lerp(lookAt, snap ? 1 : damp(reducedMotion ? 12 : 8, dt));
        camera.position.copy(camPos); camera.lookAt(camTarget);
      } else {
        headW.copy(HEAD).applyMatrix4(diver.matrixWorld);
        headW.x += Math.cos(yaw) * eyeMotion.sway + fwdX(yaw) * eyeMotion.surge;
        headW.y += eyeMotion.heave;
        headW.z += Math.sin(yaw) * eyeMotion.sway + fwdZ(yaw) * eyeMotion.surge;
        var lift = lensLift(yaw, snap, dt);
        yaw += eyeMotion.yaw;
        var p = clamp(-0.12 + lift + look.pitch + bodyPitch * 0.5 + eyeMotion.pitch, -1.2, 1.2);
        camera.position.copy(headW); camPos.copy(headW);
        lookAt.set(headW.x + fwdX(yaw) * Math.cos(p), headW.y + Math.sin(p), headW.z + fwdZ(yaw) * Math.cos(p)); camTarget.copy(lookAt);
        if (observationAim) { lookAt.copy(observationAim); camTarget.copy(observationAim); }
        camera.lookAt(lookAt); camera.rotateZ(eyeMotion.roll);
      }
      if (mask && mask.material.uniforms.breath) mask.material.uniforms.breath.value = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(visualTime * TAU / 4.2);
      camera.updateMatrixWorld();
    }

    // ---- Culling, organisms, focus ring -----------------------------------------------------
    // Time slicing. A school Chromebook has a quarter of this laptop's CPU or less, and
    // most of a frame's script is animals re-posing and re-animating. Near animals and
    // the focused one do everything every frame; the rest redo the slow parts on a
    // slice (every 2nd to 8th frame, at a phase set by their serial number), so the work
    // spreads evenly and the same frames always update the same animals: deterministic
    // for given frame times. Positions stay exact every frame (each path is a function
    // of worldTime); what waits its turn is a swimmer's terrain look-ahead and a model's
    // animation, which then takes the whole time since its last turn. Animals out of
    // sight wait longest; the light tier slices more than the high one, and a slow
    // device more again (perfGovern).
    var perfFrame = 0, perfFwd = null, perfCos = 0, PERF_NEAR = high ? 12 : 8, PERF_SWIM = 10, PERF_MAX = 8;
    function perfBegin(dt) {
      if (!paused) perfFrame++;
      gov.t0 = now();
      // The frame interval, smoothed: the size budget only trims a frame that is slow.
      if (!paused && dt > 0) gov.frameMs = gov.frameMs > 0 ? gov.frameMs + (dt * 1000 - gov.frameMs) * 0.1 : dt * 1000;
      if (!perfFwd) perfFwd = new T.Vector3();
      camera.getWorldDirection(perfFwd);
      perfCos = Math.cos(Math.min(Math.PI * 0.95, Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.hypot(1, camera.aspect)) + 0.25));
    }
    // Frames between an organism's turns. The swimming look-ahead (o.perfM) depends only on
    // where the camera is, so both tiers, and a focused or unfocused animal, swim exactly
    // alike. The animation (returned) is 1 near or focused, more when far or out of view.
    function perfRate(o, gap, visible) {
      var dx = o.center.x - camera.position.x, dy = o.center.y - camera.position.y, dz = o.center.z - camera.position.z, d = gap + o.radius;
      var seen = gap < 1.5 || dx * perfFwd.x + dy * perfFwd.y + dz * perfFwd.z >= perfCos * d - o.radius;
      o.perfM = gap < 4 ? 1 : Math.min(PERF_MAX, (!seen ? 6 : gap < PERF_SWIM ? 2 : 3) * gov.slice);
      // A sessile colony's slow sway reads the same at half rate, even close, on the light tier.
      if (o.uid === focusedUid || gap < PERF_NEAR) return o.path || high ? 1 : 2;
      return Math.min(PERF_MAX, (!seen || !visible ? 4 : o.path ? (high ? 1 : 2) : (high ? 2 : 3)) * gov.slice);
    }
    // Under the governor's last stage the shadow map is redrawn every 2nd or 3rd frame,
    // and at once whenever its square moves on with the diver.
    var perfSunAt = { x: NaN, y: 0, z: 0 };
    function perfShadowRefresh() {
      var sm = renderer && renderer.shadowMap, p = sun.target.position;
      if (!sm || !sm.enabled) return;
      var moved = p.x !== perfSunAt.x || p.y !== perfSunAt.y || p.z !== perfSunAt.z;
      perfSunAt.x = p.x; perfSunAt.y = p.y; perfSunAt.z = p.z;
      if (gov.shadowEvery <= 1) { sm.autoUpdate = true; return; }
      sm.autoUpdate = false;
      if (moved || perfFrame % gov.shadowEvery === 0) sm.needsUpdate = true;
    }
    function perfDue(o, n) { return n <= 1 || (perfFrame + (o.serial | 0)) % n === 0; }
    // The time to animate a model by this frame, or -1 while it waits for its slice.
    // A model coming back into sight moves at once.
    function perfAnimate(o, dt, n) {
      var fresh = o.perfLast !== perfFrame - 1;
      o.perfLast = perfFrame; o.perfAcc = (fresh ? 0 : o.perfAcc) + dt;
      if (!fresh && !perfDue(o, n)) return -1;
      var step = o.perfAcc; o.perfAcc = 0;
      return step;
    }
    function updateWorld(dt) {
      perfBegin(dt);
      organisms.forEach(function (o) {
        if (o.path && !paused) poseMobile(o, dt, false);
        if (o.act && !paused) o.act(dt);
        if (!o.instanced && o.root) {
          // Small animals vanish into the haze sooner than big ones.
          var gap = camera.position.distanceTo(o.center) - o.radius, visible = gap < drawDistance(o), step = -1;
          o.root.visible = visible;
          if (!paused) { var rate = perfRate(o, gap, visible); if (visible) step = perfAnimate(o, dt, rate); }
          if (step >= 0) {
            if (!o.path) currentAt(o.root.position.x, o.root.position.z, worldTime, o.motion.current);
            try { o.model.update(step * (reducedMotion ? 0.45 : 1), worldTime, o.motion); } catch (error) { warn('Reef3DExplore: update failed for ' + o.speciesId); o.model.update = function () {}; }
          }
        }
      });
      if (!paused) { currentAt(0, 0, worldTime, ambientMotion.current); protos.forEach(function (p) { try { p.update(dt, worldTime, ambientMotion); } catch (ignore) { p.update = function () {}; } }); }
      refreshDecor(false);
      shafts.forEach(function (s) {
        // Wrap around the eye projected back to the surface along the sun.
        // Every opening remains fixed in the world; a beam moves one forty-metre
        // tile only when it is 22 m past the eye, long after it has faded.
        var beamAxis = sun.userData.dir;
        var eyeSurfaceX = camera.position.x - camera.position.y * beamAxis.x / beamAxis.y, eyeSurfaceZ = camera.position.z - camera.position.y * beamAxis.z / beamAxis.y;
        if (s.wx == null) { s.wx = eyeSurfaceX - 20 + (((s.bx - eyeSurfaceX + 20) % 40) + 40) % 40; s.wz = eyeSurfaceZ - 20 + (((s.bz - eyeSurfaceZ + 20) % 40) + 40) % 40; }
        while (s.wx - eyeSurfaceX > 22) s.wx -= 40; while (eyeSurfaceX - s.wx > 22) s.wx += 40;
        while (s.wz - eyeSurfaceZ > 22) s.wz -= 40; while (eyeSurfaceZ - s.wz > 22) s.wz += 40;
        var wx = s.wx, wz = s.wz;
        s.mesh.position.x = wx - beamAxis.x * 12; s.mesh.position.z = wz - beamAxis.z * 12;
        s.mesh.material.opacity = s.base * (reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(visualTime * 0.17 + s.phase));
      });
      surface.position.set(camera.position.x, 0, camera.position.z);
      U.time.value = reducedMotion ? 4 + visualTime * 0.2 : 4 + visualTime; snowU.time.value = reducedMotion ? visualTime * 0.3 : visualTime;
      plantMotions.forEach(function (m) { var t = visualTime; m.value.x = t * 0.35; m.value.y = (t * (reducedMotion ? 0.4 : 1.15)) % TAU; m.value.w = m.amount * (reducedMotion ? 0.35 : 1); });
      if (sun) {
        var c = diverPos, dir = sun.userData.dir;
        sun.target.position.set(Math.round(c.x), Math.round(c.y), Math.round(c.z)); sun.position.copy(sun.target.position).addScaledVector(dir, 30); sun.target.updateMatrixWorld();
        perfShadowRefresh();
      }
      var f = focusedUid ? byUid[focusedUid] : null;
      focusRing.visible = !!f;
      if (f) {
        var r = observationRadius(f) * 1.15 + 0.12; focusRing.position.copy(observationCenter(f)); focusRing.scale.set(r, r, r); focusRing.quaternion.copy(camera.quaternion);
        focusRing.material.uniforms.opacity.value = reducedMotion ? 0.85 : 0.72 + 0.2 * Math.sin(visualTime * 2.6);
      }
    }

    // ---- State ------------------------------------------------------------------------------
    function updateFrustum() { camera.updateMatrixWorld(); projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projScreen); }
    function surfaceDistance(o) { return Math.max(0, observationCenter(o).distanceTo(diverPos) - observationRadius(o)); }
    function nearbyList(limitM) {
      if (disposed) return [];
      updateFrustum();
      var out = [], kinds = {}, res = [], lim = limitM || NEAR_M;
      organisms.forEach(function (o) {
        var d = surfaceDistance(o); if (d > lim) return;
        out.push({ o: o, d: d, inView: frustum.intersectsSphere(sphere.set(observationCenter(o), Math.max(observationRadius(o), 0.05))) });
      });
      out.sort(function (a, b) { return a.d - b.d || a.o.serial - b.o.serial; });
      // A restoration patch counts once per structure kind, so its units never crowd out animals.
      for (var i = 0; i < out.length && res.length < (limitM ? 24 : NEARBY_MAX); i++) {
        if (out[i].o.restoration) { if (kinds[out[i].o.speciesId]) continue; kinds[out[i].o.speciesId] = 1; }
        res.push(out[i]);
      }
      return res;
    }
    // Where an organism lies from the diver's eyes: bearingDeg from the heading
    // (-180..180, positive = to the right, as the camera sees it) and riseM, its
    // height above the eyes. Measured from the head, which leads the body.
    var cueEye = new T.Vector3();
    function cueFrom() { if (diver) cueEye.copy(HEAD).applyMatrix4(diver.matrixWorld); else cueEye.copy(diverPos); return cueEye; }
    function cue(o, eye, out) {
      var c = observationCenter(o), dx = c.x - eye.x, dz = c.z - eye.z;
      out.bearingDeg = Math.hypot(dx, dz) < 0.05 ? 0 : Math.round(wrapAngle(bearingTo(dx, dz) - bearing) * 180 / Math.PI) || 0;
      out.riseM = r1(c.y - eye.y) || 0;
      return out;
    }
    // A change of 30 degree sector (rounded the same way both sides, so ahead ends at
    // 45 and behind starts at 135 on a sector edge), or of a rise of 1.5 m or more
    // (worded as above or below by the tool), is news.
    function cueKey(c) { var a = Math.abs(c.bearingDeg); return (c.bearingDeg < 0 ? '-' : '') + Math.round(a / 30) + (c.riseM >= 1.5 ? 'u' : c.riseM <= -1.5 ? 'd' : ''); }
    // ---- Reef moments ---------------------------------------------------------------
    // Which living-reef interactions are happening within about 10 m of the diver
    // now: a client posing at a cleaning station, the manta circling one, a grazer
    // feeding, a turtle's breath, a crown-of-thorns starfish on its feeding scar,
    // anemonefish down in their anemone, a plankton cloud sheltering in its coral.
    // Read from the behaviour state, never changing it, at most four times a second.
    // snapshot() reports the nearest of each kind, main animal first in uids; the
    // tool decides what to call them. Made on first use, after the reef is built.
    var momentKit;
    function momentCast() {
      if (momentKit) return momentKit;
      var k = momentKit = { at: -Infinity, list: [], turtles: [], cots: [], clowns: [], schools: [], hosts: {}, env: { v: 0 } };
      organisms.forEach(function (o) {
        var e = o.eco;
        if (e && e.kind === 'turtle' && e.breath) k.turtles.push(o);
        else if (e && e.kind === 'clown') k.clowns.push(o);
        else if (o.scar && o.cotsHost) k.cots.push(o);
        else if (o.planktivore) k.schools.push(o);
      });
      return k;
    }
    // The anemone a clownfish pair lives in (the organism under its anchor).
    function momentHost(k, o) {
      if (k.hosts[o.uid] !== undefined) return k.hosts[o.uid];
      var c = o.eco, best = null, bd = 0.8;
      organisms.forEach(function (a) { if (a.speciesId === 'magnificent_anemone' && a.center) { var d = Math.hypot(a.center.x - c.x, a.center.z - c.z); if (d < bd) { bd = d; best = a; } } });
      return (k.hosts[o.uid] = best);
    }
    // The nearest school of a crowd cloud's species, as a tap on one of its fish picks.
    function momentSchool(k, id, p) {
      var best = null, bd = 20;
      k.schools.forEach(function (o) { if (o.speciesId === id && o.center) { var d = Math.hypot(o.center.x - p.x, o.center.y - p.y, o.center.z - p.z); if (d < bd) { bd = d; best = o; } } });
      return best;
    }
    function momentScan() {
      var k = momentCast(), t = worldTime, best = {}, MOMENT_M = 10;
      function offer(kind, o, others, extra) {
        var d = surfaceDistance(o); if (!(d <= MOMENT_M) || best[kind] && best[kind].d <= d) return;
        best[kind] = Object.assign({ kind: kind, o: o, d: d, with: (others || []).filter(Boolean) }, extra || null);
      }
      if (eco) {
        eco.stations.forEach(function (st) {
          // A client holding its pose while the cleaners work over it; the manta once it
          // has closed in to circle the station.
          var v = stationVisit(st, t, 0, 0);
          if (v && v.o.center && posing(v, t) > 0.5) offer('cleaning', v.o, st.cleaners);
          var m = eco.manta;
          if (m && m.center && m.eco.station === st && mantaVisitW(m, t) > 0.8) offer('manta_cleaning', m, st.cleaners);
        });
        eco.grazers.forEach(function (o) {
          if (!o.center) return;
          var e = o.eco, v = e.station ? clientVisit(o, t) : null, w = v ? visitWeight(v, t) : 0;
          if (feedEnv(e, segAt(e, t)) * (1 - w) > 0.5) offer('grazing', o, null, { group: !!e.school });
        });
      }
      k.turtles.forEach(function (o) {
        var br = o.eco.breath, b = breathAt(o, br, t, k.env), breathing = k.env.v > 0.5;
        if (!o.center || b < 0.1) return;
        var up = breathAt(o, br, t + 0.5, null) >= b;
        // The climb, the breaths at the top, then the first part of the glide down.
        if (breathing || up || b > 0.5) offer('turtle_breath', o, null, { phase: breathing ? 'breathing' : up ? 'up' : 'down' });
      });
      k.cots.forEach(function (o) { if (o.center) offer('cots_scar', o, [byUid[o.cotsHost]]); });
      k.clowns.forEach(function (o) {
        if (!o.center || !(o.eco.hide > 0.4)) return;
        offer('anemonefish_hide', o, k.clowns.filter(function (p) { return p !== o && p.anchor === o.anchor && p.eco.hide > 0.4; }).concat([momentHost(k, o)]));
      });
      k.schools.forEach(function (o) {
        var f = o.flight, shelter = Math.max(f && f.shelter ? shelterAt(f, t) : 0, o.encounter ? encounterAt(o.encounter, t, 's') : 0);
        if (o.center && shelter > 0.35) offer('cloud_shelter', o);
      });
      // The crowd's clouds are scenery: the moment points at the cloud, and Look picks
      // the nearest school of its species.
      if (crowdKit && crowdKit.list) crowdKit.list.forEach(function (c) {
        c.clouds.forEach(function (cl) {
          if (!(cl.now > 0.35) || cl.ox === undefined) return;
          var p = { center: new T.Vector3(cl.ox, cl.oy, cl.oz), radius: cl.R, speciesId: c.id, uid: null };
          offer('cloud_shelter', p, null, { scenery: true });
          if (best.cloud_shelter && best.cloud_shelter.o === p) best.cloud_shelter.school = momentSchool(k, c.id, p.center);
        });
      });
      return Object.keys(best).map(function (kind) { return best[kind]; });
    }
    function momentList(eye) {
      if (disposed) return [];
      var k = momentCast(), t = now();
      if (t - k.at >= 250) { k.at = t; try { k.list = momentScan(); } catch (error) { k.list = []; if (!k.failed) { k.failed = true; warn('Reef3DExplore: reef moments scan failed'); } } }
      return k.list.map(function (m) {
        var o = m.o, lead = m.scenery ? m.school : o, actors = (lead ? [lead] : []).concat(m.with);
        // speciesIds runs alongside uids; speciesId is the main animal's (a crowd cloud's species).
        var out = cue(o, eye, { kind: m.kind, speciesId: o.speciesId, uids: actors.map(function (a) { return a.uid; }), speciesIds: actors.map(function (a) { return a.speciesId; }),
          distanceM: r1(surfaceDistance(o)), inView: frustum.intersectsSphere(sphere.set(observationCenter(o), Math.max(observationRadius(o) || 0, 0.05))) });
        if (m.phase) out.phase = m.phase;
        if (m.group) out.group = true;
        if (m.scenery) out.scenery = true;
        return out;
      }).sort(function (a, b) { return a.distanceM - b.distanceM || (a.kind < b.kind ? -1 : 1); });
    }
    function momentKey(list) { return (list || []).map(function (m) { return m.kind + ':' + (m.uids[0] || '') + (m.phase || '') + ':' + cueKey(m); }).join(','); }
    function snapshot() {
      var info = renderer && renderer.info && renderer.info.render, near = loaded ? nearbyList() : [], f = focusedUid && byUid[focusedUid], eye = cueFrom();
      return {
        ready: !disposed && !contextLost && loaded, paused: paused, view: view, quality: quality, reducedMotion: reducedMotion, light: !!lightOn, vision: vision, magnification: magnification,
        diver: { x: r2(diverPos.x), y: r2(diverPos.y), z: r2(diverPos.z), depthM: r1(-diverPos.y), headingDeg: (Math.round(bearing * 180 / Math.PI) % 360 + 360) % 360 },
        // health ('healthy' | 'bleached' | 'dead') is fixed for the dive, so stateKey leaves it out.
        nearby: near.map(function (n) { return cue(n.o, eye, { uid: n.o.uid, speciesId: n.o.speciesId, distanceM: r1(n.d), inView: n.inView, health: coralState(n.o) }); }),
        focused: f ? cue(f, eye, { uid: f.uid, speciesId: f.speciesId, distanceM: r1(surfaceDistance(f)), health: coralState(f) }) : null,
        navigation: autopilot ? { uid: autopilot.o.uid } : null,
        buoyancy: buoyancyState(),
        moments: loaded ? momentList(eye) : [],
        frames: frames, drawCalls: info ? info.calls : 0, triangles: info ? info.triangles : 0
      };
    }
    function stateKey(s) {
      return [s.ready, s.paused, s.view, s.quality, s.light, s.vision, s.magnification, s.focused ? s.focused.uid + ':' + Math.round(s.focused.distanceM * 2) + ':' + cueKey(s.focused) : '-', s.nearby.map(function (n) { return n.uid + (n.inView ? '+' : '-') + cueKey(n); }).join(','),
        momentKey(s.moments), s.navigation ? s.navigation.uid : '-',
        Math.round(s.diver.x), Math.round(s.diver.z), Math.round(s.diver.depthM * 2), Math.round(s.diver.headingDeg / 15), buoyancyKey(s.buoyancy)].join('|');
    }
    function emit(s, t) { pendingNotify = false; lastNotify = t; lastKey = stateKey(s); try { options.onState(s); } catch (error) { reportError(error); } }
    // At most one call per 200 ms; a change inside the window is delivered at its end.
    function notify(force) {
      if (typeof options.onState !== 'function' || disposed) return;
      if (force) pendingNotify = true;
      var t = now();
      if (t - lastNotify < 200) { if (pendingNotify && !notifyTimer) notifyTimer = setTimer(flush, Math.max(1, 200 - (t - lastNotify))); return; }
      if (!pendingNotify && t - lastCheck < 200) return;
      lastCheck = t;
      var s = snapshot();
      if (pendingNotify || stateKey(s) !== lastKey) emit(s, t);
    }
    function flush() { notifyTimer = 0; if (!disposed && pendingNotify) notify(false); }

    // ---- Loop ---------------------------------------------------------------------------------
    function hidden() { return !!(doc && doc.hidden); }
    function requestFrame() {
      if (disposed || contextLost || raf || hidden() || !loaded) return;
      if (typeof global.requestAnimationFrame === 'function') { rafIsTimer = false; raf = global.requestAnimationFrame(tick); }
      else { rafIsTimer = true; raf = setTimer(function () { tick(now()); }, 16); }
    }
    function stopLoop() {
      if (!raf) return;
      if (rafIsTimer) clearTimer(raf); else if (typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(raf);
      raf = 0;
    }
    function refresh() { requestFrame(); }
    function govern() {
      // Pausing preserves the scene while a diver studies it or compares views.
      // Settling frames are not evidence of interactive performance pressure.
      if (paused) { gov.t0 = null; return; }
      var info = renderer && renderer.info && renderer.info.render;
      if (!info) return;
      // Script time of this frame (world update and draw, from perfBegin), smoothed; the
      // first second is skipped, while late uploads and programs still settle.
      if (gov.t0 !== null) { if (++gov.seen > 60) gov.cpuMs += (Math.max(0, now() - gov.t0) - gov.cpuMs) * 0.1; gov.t0 = null; }
      if (++gov.frames < 10) return;
      gov.frames = 0;
      perfGovern(Math.max((info.triangles || 0) / TRI_BUDGET, (info.calls || 0) / CALL_BUDGET), gov.cpuMs);
    }
    // Two pressures: the frame's size against the budgets (level 0..3) and its script
    // time (cpu 0..3). Level spends itself in stages: mobile animals' reach
    // first (scale 1 to 0.45), then the crowd's density, then how often the shadows are
    // redrawn. It trims only a frame that is over budget AND slow (under about 50 fps): a
    // device that draws the whole reef in time keeps all of it. Script time spends itself
    // too: first more slicing (no visible change), then the crowd's density, then some
    // reach (fewer far animals to draw, scale down to 0.6). Anchored scenery keeps
    // fixed distance bands and never disappears just because a frame was slow.
    // A short peak never trims: a
    // mild overrun must last two checks, and what was trimmed comes back once the frame
    // is well inside the budget or fast again.
    function perfGovern(over, cpuMs) {
      var slow = gov.frameMs > 20;
      gov.up = over > 1 && slow ? gov.up + 1 : 0; gov.down = over < 0.9 || gov.frameMs < 18 ? gov.down + 1 : 0;
      var level = gov.level + (over > 1.3 && slow ? 0.2 : gov.up >= 2 ? 0.08 : gov.down >= 2 ? -0.1 : 0);
      var cpu = gov.cpu + (cpuMs > 22 ? 0.25 : cpuMs < 16 ? -0.1 : 0);
      gov.level = clamp(level, 0, 3); gov.cpu = clamp(cpu, 0, 3);
      gov.crowd = 1 - 0.5 * Math.max(clamp(gov.level - 1, 0, 1), clamp(gov.cpu - 1, 0, 1));
      gov.shadowEvery = gov.level > 2.5 ? 3 : gov.level > 2 ? 2 : 1;
      gov.slice = gov.cpu > 0.5 ? 2 : 1;
      var scale = r2(Math.min(1 - 0.55 * clamp(gov.level, 0, 1), 1 - 0.4 * clamp(gov.cpu - 2, 0, 1)));
      if (scale !== gov.scale) { gov.scale = scale; refreshDecor(true); }
    }
    function tick(stamp) {
      raf = 0;
      if (disposed || contextLost || hidden()) return;
      try {
        var dt = lastStamp === null ? 0 : clamp((stamp - lastStamp) / 1000, 0, 0.1); lastStamp = stamp;
        if (!paused) { worldTime += dt * (reducedMotion ? 0.45 : 1); visualTime += dt; updateDiver(dt); }
        animateDiver(dt); if (!paused) updateBubbles(dt);
        updateCamera(Math.max(dt, 0.016), false); updateWater(); updateWorld(dt);
        renderer.render(scene, camera); frames++;
        govern(); notify(false);
        settle = paused ? settle + 1 : 0;
        if (!paused || settle < 40 || dragging) requestFrame();
      } catch (error) { stopLoop(); paused = true; reportError(error); }
    }

    // ---- Loading ------------------------------------------------------------------------------
    // A staged mount (options.staged) returns at once and runs the build queue a
    // few steps per task, so the page keeps painting. Then every shader program is
    // created and links in parallel (shaderWarmup; only once the lights and fog
    // exist, as they are part of each program), uniforms are read, textures
    // upload, and the first frame is drawn. getState().ready and onProgress(1)
    // wait for that frame. A plain mount runs the same build and draws at once.
    function loadStep(weight, run, part) { loadQueue.splice(loadInsert++, 0, { w: weight, run: run, part: part }); }
    function queueFirstFrame() {
      loadStep(4, function () { if (!warm) return; warm.collect(); return warm.submit(LOAD_SLICE) ? undefined : MORE; });
      loadStep(30, function () { return !warm || warm.poll(8) ? undefined : WAIT; }, function () { return warm ? warm.progress() : 1; });
      loadStep(1, function () { var failed = warm ? warm.failures() : []; if (failed.length) shaderFailed(failed); });
      loadStep(2, function () { return !warm || warm.prepare(LOAD_SLICE) ? undefined : MORE; });
      loadStep(4, function () {
        if (typeof renderer.initTexture !== 'function') return;
        if (!uploads) uploads = sceneTextures(scene, owned);
        for (var t0 = now(); uploads.length && now() - t0 < LOAD_SLICE;) renderer.initTexture(uploads.shift());
        return uploads.length ? MORE : undefined;
      });
    }
    function runStep() {
      var step = loadQueue[loadAt], size = loadQueue.length, k;
      loadInsert = loadAt + 1;
      var result = step.run(), added = loadQueue.length - size;
      if (added > 0) {
        // Parts a step queues share its weight, so progress never steps back.
        var sum = 0;
        for (k = 1; k <= added; k++) sum += loadQueue[loadAt + k].w;
        for (k = 1; k <= added; k++) loadQueue[loadAt + k].w = step.w * 0.95 * (sum > 0 ? loadQueue[loadAt + k].w / sum : 1 / added);
        step.w *= 0.05;
      }
      if (result !== MORE && result !== WAIT) loadAt++;
      return result;
    }
    function runQueue() { while (loadAt < loadQueue.length) runStep(); }
    function loadFraction() {
      var total = 0, done = 0, step = loadQueue[loadAt];
      loadQueue.forEach(function (s, i) { total += s.w; if (i < loadAt) done += s.w; });
      if (step && step.part) done += step.w * clamp(step.part(), 0, 1);
      return total > 0 ? done / total : 0;
    }
    function showProgress(f) {
      if (!(f > loadShown)) return;
      loadShown = f;
      if (typeof options.onProgress === 'function') { try { options.onProgress(f); } catch (error) { reportError(error); } }
    }
    function pump() {
      loadTimer = 0; loadRaf = 0;
      if (disposed || contextLost) return;
      var start = now(), result;
      try {
        while (loadAt < loadQueue.length) {
          result = runStep();
          if (disposed || result === WAIT || now() - start >= LOAD_SLICE) break;
        }
        if (!disposed && loadAt >= loadQueue.length) { firstFrame(); return; }
      } catch (error) { loadFailed(error); return; }
      if (disposed || contextLost) return;
      showProgress(Math.min(0.99, loadFraction()));
      if (disposed) return;
      // Polling waits for the next frame; building continues as soon as the page has had its turn.
      if (result === WAIT && typeof global.requestAnimationFrame === 'function') loadRaf = global.requestAnimationFrame(pump);
      else loadTimer = setTimer(pump, result === WAIT ? 16 : 0);
    }
    function cancelLoad() {
      clearTimer(loadTimer); loadTimer = 0;
      if (loadRaf && typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(loadRaf);
      loadRaf = 0; loadQueue.length = 0; loadAt = 0; uploads = null;
    }
    function loadFailed(error) {
      dispose();
      reportError(new Error('This device could not start the 3D reef dive. ' + (error && error.message ? error.message : 'Please use the 2D survey.')));
    }
    function shaderFailed(list) {
      // three's own check is off while programs link in parallel; report what it would have.
      var detail = list.map(function (f) { return f.name + ': ' + f.log; }).join('\n');
      if (global.console && global.console.error) global.console.error('Reef3DExplore: ' + list.length + ' shader program(s) did not link.\n' + detail);
      reportError(new Error('The 3D reef dive could not build ' + list.length + ' of its shaders. ' + (list[0].log.split('\n')[0] || list[0].name)));
    }
    function firstFrame() {
      // Pose everything as an unpaused mount does, even if pause was pressed while loading.
      var hold = paused; paused = false;
      diver.visible = view === 'third'; mask.visible = view === 'first';
      canvasW = canvasH = 0; // a resize while loading ran before the mask existed; size everything now
      resize(); updateLens(); animateDiver(0); updateCamera(0, true); updateWater(); refreshDecor(true); updateWorld(0);
      paused = hold;
      renderer.render(scene, camera); frames++;
      loaded = true; showProgress(1);
      notify(true); requestFrame();
    }

    // ---- Controller ---------------------------------------------------------------------------
    // A field-guide request looks up the nearest real organism across the
    // whole reef, without changing focus, movement, population or dive credit.
    function findSpecies(speciesId) {
      if (disposed || contextLost || !loaded || typeof speciesId !== 'string' || !Object.prototype.hasOwnProperty.call(INFO, speciesId) || INFO[speciesId][0] === 'structure') return null;
      var best = null, distance = Infinity;
      organisms.forEach(function (o) {
        if (o.speciesId !== speciesId || !o.center || o.restoration || !o.info || ['fish', 'reptile', 'invertebrate', 'coral'].indexOf(o.info.group) < 0) return;
        var d = surfaceDistance(o);
        if (d < distance || d === distance && best && o.serial < best.serial) { best = o; distance = d; }
      });
      if (!best) return null;
      updateFrustum();
      return cue(best, cueFrom(), { uid: best.uid, speciesId: best.speciesId, distanceM: r1(distance),
        inView: frustum.intersectsSphere(sphere.set(observationCenter(best), Math.max(observationRadius(best), 0.05))), health: coralState(best) });
    }
    function focus(uid) {
      if (disposed || !loaded || uid === null || uid === undefined || !byUid[uid]) return false;
      if (focusedUid !== uid) { focusedUid = uid; observationAim = null; restoreWideLens(); notify(true); }
      refresh(); return true;
    }
    function clearFocus() { if (disposed) return; var wide = restoreWideLens(); if (focusedUid !== null || wide) { focusedUid = null; observationAim = null; notify(true); } refresh(); }
    function candidates() {
      var near = nearbyList(), front = near.filter(function (n) { return n.inView; }), list = front.length ? front : near;
      if (!list.length) list = nearbyList(20).slice(0, 6);
      return list.map(function (n) { return n.o.uid; });
    }
    function cycleFocus(step) {
      if (disposed || !loaded) return null;
      var t = now();
      if (t - cycle.at > 4000 || !focusedUid || cycle.list.indexOf(focusedUid) < 0) cycle.list = candidates();
      cycle.at = t;
      var list = cycle.list; if (!list.length) return null;
      var i = focusedUid ? list.indexOf(focusedUid) : -1, next = i < 0 ? list[0] : list[(i + step + list.length) % list.length];
      focus(next); return next;
    }
    function swimTo(uid) {
      if (disposed || !loaded) return false;
      var o = byUid[uid]; if (!o) return false;
      focus(uid); startAutopilot(o); notify(true); refresh(); return true;
    }
    function cancelSwim() {
      if (disposed || contextLost || !loaded || !autopilot) return false;
      autopilot = null; speed = 0; vy = 0; turnRate = 0;
      notify(true); refresh(); return true;
    }
    function setView(v) {
      if (disposed || (v !== 'third' && v !== 'first')) return;
      if (v !== view) restoreWideLens();
      observationAim = null;
      if (!loaded) { view = v; notify(true); return; } // the first frame applies it
      view = v; diver.visible = v === 'third'; mask.visible = v === 'first'; look.pitch = 0;
      updateLens(); animateDiver(0); updateCamera(0, true); notify(true); refresh();
    }
    function setPaused(value) { if (disposed) return; paused = !!value; lastStamp = null; settle = 0; notify(true); refresh(); }
    function setReducedMotion(value) {
      if (disposed || reducedMotion === !!value) return;
      reducedMotion = !!value;
      // A changed preference stops the current dive without rebuilding its reef.
      // Disabling the preference leaves the learner in control of resuming.
      if (reducedMotion) paused = true;
      lastStamp = null; settle = 0;
      if (loaded) updateCamera(0, true);
      notify(true); refresh();
    }
    function setInput(input) {
      if (disposed) return;
      if (!input) { ext.forward = ext.turn = ext.rise = 0; return; }
      ['forward', 'turn', 'rise'].forEach(function (k) { if (input[k] !== undefined) ext[k] = clamp(num(input[k], 0), -1, 1); });
      var active = currentInput();
      if (!paused && (Math.abs(active.forward) > 0.02 || Math.abs(active.turn) > 0.02 || Math.abs(active.rise) > 0.02) && restoreWideLens()) notify(true);
      if ((ext.forward || ext.turn || ext.rise) && autopilot) cancelSwim();
      refresh();
    }
    // Button equivalents of drag-look and wheel-zoom. Camera-only changes stay available while paused.
    function lookCamera(dx, dy) {
      if (disposed || !loaded) return false;
      lookBy(clamp(num(dx, 0), -1000, 1000), clamp(num(dy, 0), -1000, 1000));
      updateCamera(0, true); return true;
    }
    // A deliberate observation frames the animal where it is now. It never turns
    // or moves the diver, advances the simulation, follows a swimming animal, or
    // competes with automatic swimming. Drag-look, reset, selection/view changes
    // and swimming restore the ordinary camera. Terrain can still obscure a target;
    // this turns the existing camera, rather than moving through a reef to reveal it.
    function lookAtFocused() {
      if (disposed || contextLost || !loaded || autopilot || !focusedUid) return false;
      var o = byUid[focusedUid], target = o && observationCenter(o);
      if (!target || !isFinite(target.x) || !isFinite(target.y) || !isFinite(target.z) || target.distanceToSquared(camera.position) < 0.0025) return false;
      var from = view === 'first' ? camera.position : diverPos;
      var dx = target.x - from.x, dy = target.y - from.y, dz = target.z - from.z, horizontal = Math.hypot(dx, dz);
      var yaw = horizontal > 0.001 ? bearingTo(dx, dz) : bearing + look.yaw;
      // Keep the stored manual angles inside their established limits so releasing
      // the observation never leaves drag-look with an unbounded pitch or yaw.
      look.pitch = view === 'first' ? clamp(Math.atan2(dy, horizontal) + 0.12 - lensOpen.lift - bodyPitch * 0.5 - eyeMotion.pitch, -1, 1)
        : clamp(-Math.atan2(dy, horizontal) * 0.45, -0.3, 0.65);
      if (view === 'third' && horizontal > 0.001) {
        // Keep the rear-quarter view established on arrival. A camera directly
        // behind the diver aims through its tank at a close, small organism.
        // When there is no existing quarter to preserve, use the lower terrain
        // side of the same orbit; the ordinary camera clearance still applies.
        var quarter = wrapAngle(bearing + look.yaw - yaw), side = Math.abs(quarter) >= 0.4 && Math.abs(quarter) <= 0.9 ? Math.sign(quarter) : 0;
        if (!side) {
          var reach = camDist * Math.cos(clamp(0.32 + look.pitch, -0.35, 1.25));
          var rightTop = groundTop(diverPos.x - fwdX(yaw + 0.62) * reach, diverPos.z - fwdZ(yaw + 0.62) * reach);
          var leftTop = groundTop(diverPos.x - fwdX(yaw - 0.62) * reach, diverPos.z - fwdZ(yaw - 0.62) * reach);
          side = leftTop < rightTop ? -1 : 1;
        }
        yaw += 0.62 * side;
      }
      look.yaw = wrapAngle(yaw - bearing - (view === 'first' ? eyeMotion.yaw : 0));
      observationAim = target.clone();
      updateCamera(0, true); notify(true); refresh(); return true;
    }
    function zoomCamera(amount) {
      if (disposed || !loaded || view !== 'third') return false;
      zoomBy(clamp(num(amount, 0), -1, 1));
      updateCamera(0, true); return true;
    }
    function setMagnification(value) {
      if (disposed || contextLost || !loaded || typeof value !== 'number' || [1, 2, 4, 8].indexOf(value) < 0 || value > 1 && autopilot) return false;
      if (magnification === value) return true;
      magnification = value; updateLens();
      // Refill visibility only, without a world/camera update. This also makes
      // an immediate image capture complete when returning to the wide view.
      refreshDecor(true); notify(true); refresh(); return true;
    }
    function resetCamera() {
      if (disposed || !loaded) return false;
      observationAim = null;
      var wide = restoreWideLens();
      look.yaw = 0; look.pitch = 0; camDist = 4.2;
      updateCamera(0, true); if (wide) { refreshDecor(true); notify(true); } refresh(); return true;
    }
    // Encode immediately after a render-only redraw: WebGL may discard its
    // default drawing buffer once the browser presents it. Do not run tick or
    // camera/animation updates here; a photograph must preserve the current dive,
    // including paused observations and automatic swimming. Keep no image cache.
    function captureImage() {
      if (disposed || contextLost || !loaded || !renderer || !canvas.width || !canvas.height || typeof canvas.toDataURL !== 'function') return null;
      try {
        var context = typeof renderer.getContext === 'function' ? renderer.getContext() : null;
        if (context && typeof context.isContextLost === 'function' && context.isContextLost()) return null;
        renderer.render(scene, camera);
        if (disposed || contextLost || context && typeof context.isContextLost === 'function' && context.isContextLost()) return null;
        var data = canvas.toDataURL('image/png'), prefixLength = 22;
        // Reject empty/unsupported canvas results and malformed PNG encodings.
        return typeof data === 'string' && data.length > prefixLength + 12 && (data.length - prefixLength) % 4 === 0 &&
          /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(data) ? data : null;
      } catch (error) { return null; } // An export failure must not end a healthy dive.
    }
    function resize() {
      if (disposed || !renderer) return;
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.clientWidth, height: canvas.clientHeight };
      var w = Math.max(1, Math.round(rect.width || 0)), h = Math.max(1, Math.round(rect.height || 0));
      if (w === canvasW && h === canvasH) return;
      canvasW = w; canvasH = h; renderer.setSize(w, h, false); camera.aspect = w / h; updateLens();
      if (staged && !loaded) clearToWater(T, renderer); // a resize blanks the canvas
      if (mask) mask.material.uniforms.aspect.value = w / h;
      refresh();
    }
    controller = {
      lookCamera: lookCamera, lookAtFocused: lookAtFocused, zoomCamera: zoomCamera, setMagnification: setMagnification, resetCamera: resetCamera, captureImage: captureImage,
      setView: setView, setPaused: setPaused, setReducedMotion: setReducedMotion, setInput: setInput, focusNext: function () { return cycleFocus(1); }, focusPrevious: function () { return cycleFocus(-1); },
      focus: focus, findSpecies: findSpecies, clearFocus: clearFocus, swimTo: swimTo, cancelSwim: cancelSwim, setLight: setLight, setVision: setVision, getState: snapshot, resize: resize, dispose: dispose
    };

    // ---- Picking ---------------------------------------------------------------------------------
    function pick(clientX, clientY) {
      if (!loaded) return null;
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: canvasW, height: canvasH };
      var w = rect.width || canvasW || 1, h = rect.height || canvasH || 1;
      ndc.set(((clientX - (rect.left || 0)) / w) * 2 - 1, -((clientY - (rect.top || 0)) / h) * 2 + 1);
      camera.updateMatrixWorld(); raycaster.setFromCamera(ndc, camera);
      var ray = raycaster.ray, terrainHits = raycaster.intersectObjects([floorMesh, bommieMesh], false), wall = terrainHits.length ? terrainHits[0].distance : Infinity;
      var roots = organisms.filter(function (o) { return !o.instanced && o.root && o.root.visible; }).map(function (o) { return o.root; }), best = null;
      raycaster.intersectObjects(roots, true).some(function (hit) {
        var o = null, c = hit.object; while (c && !o) { o = owner.get(c) || null; c = c.parent; }
        if (o && hit.distance < wall) { best = o; return true; }
        return false;
      });
      if (!best) best = pickAmbient(ray, wall, h);
      if (!best) {
        // Small or quick organisms: an inflated sphere of at least ~16 px.
        var perPx = 2 * Math.tan(camera.fov * Math.PI / 360) / h, bestT = Infinity, bestMiss = Infinity;
        organisms.forEach(function (o) {
          var toC = closest.copy(o.center).sub(ray.origin), along = toC.dot(ray.direction); if (along <= 0) return;
          var r = Math.max(o.radius, along * perPx * 16), miss = Math.sqrt(Math.max(0, toC.lengthSq() - along * along)) / r;
          if (miss > 1 || along - r > wall) return;
          var entry = along - r * Math.sqrt(Math.max(0, 1 - miss * miss));
          if ((miss < 0.85) !== (bestMiss < 0.85) ? miss < 0.85 : entry < bestT) { bestT = entry; bestMiss = miss; best = o; }
        });
      }
      if (best) focus(best.uid);
      return best ? best.uid : null;
    }

    // ---- Input (keys on the canvas only) --------------------------------------------------------
    var HELD = { w: 'forward', arrowup: 'forward', s: 'back', arrowdown: 'back', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', r: 'up', pageup: 'up', f: 'down', pagedown: 'down' };
    function clearKeys() { Object.keys(keys).forEach(function (k) { keys[k] = 0; }); }
    listen(canvas, 'keydown', function (event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      var k = String(event.key || '').toLowerCase(), held = HELD[k];
      if (held) { keys[held] = 1; if (!paused && restoreWideLens()) notify(true); if (autopilot) cancelSwim(); refresh(); }
      else if (k === ' ' || k === 'spacebar') { if (!event.repeat) setPaused(!paused); }
      else if (k === 'n') { if (!event.repeat) cycleFocus(event.shiftKey ? -1 : 1); }
      else if (k === 'l') { if (!event.repeat) setLight(!lightOn); }
      else if (k === 'enter') { if (!focusedUid) return; if (!event.repeat) swimTo(focusedUid); }
      else { if (k === 'escape' && autopilot) cancelSwim(); return; }
      if (event.preventDefault) event.preventDefault();
    });
    listen(canvas, 'keyup', function (event) { var held = HELD[String(event.key || '').toLowerCase()]; if (held) keys[held] = 0; });
    listen(canvas, 'blur', function () { clearKeys(); pointers.clear(); pinch = 0; press = null; dragging = false; });
    function pid(event) { return event.pointerId !== undefined && event.pointerId !== null ? event.pointerId : 1; }
    function lookBy(dx, dy) {
      if ((dx || dy) && restoreWideLens()) notify(true);
      observationAim = null;
      look.yaw += dx * 0.005; look.pitch = clamp(look.pitch + (view === 'third' ? dy : -dy) * 0.004, view === 'third' ? -0.6 : -1.0, view === 'third' ? 0.9 : 1.0);
      if (loaded && (view === 'first' || reducedMotion)) updateCamera(0, true);
      refresh();
    }
    function zoomBy(amount) { if (view !== 'third') return; if (amount && restoreWideLens()) notify(true); camDist = clamp(camDist * Math.exp(amount), 2.2, 9); refresh(); }
    listen(canvas, 'pointerdown', function (event) {
      if (event.button && event.pointerType !== 'touch') return;
      var id = pid(event); pointers.set(id, { x: event.clientX, y: event.clientY });
      press = pointers.size === 1 ? { id: id, x: event.clientX, y: event.clientY, t: now(), moved: 0 } : null;
      try { if (canvas.setPointerCapture && event.pointerId !== undefined) canvas.setPointerCapture(event.pointerId); } catch (ignore) {}
      try { if (canvas.focus) canvas.focus({ preventScroll: true }); } catch (ignore) {}
      if (pointers.size === 2) { var p = Array.from(pointers.values()); pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
    });
    listen(canvas, 'pointermove', function (event) {
      var id = pid(event), old = pointers.get(id); if (!old) return;
      var dx = event.clientX - old.x, dy = event.clientY - old.y; pointers.set(id, { x: event.clientX, y: event.clientY });
      if (pointers.size > 1) { var p = Array.from(pointers.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (pinch > 0 && d > 0) zoomBy(Math.log(pinch / d)); pinch = d; press = null; return; }
      if (press && press.id === id) press.moved += Math.abs(dx) + Math.abs(dy);
      if (!press || press.moved > 6) { dragging = true; lookBy(dx, dy); }
    });
    listen(canvas, 'pointerup', function (event) {
      var id = pid(event);
      if (press && press.id === id && press.moved <= 6 && now() - press.t < 800) pick(event.clientX, event.clientY);
      pointers.delete(id); press = null; pinch = 0; dragging = pointers.size > 0;
    });
    function pointerGone(event) { pointers.delete(pid(event)); press = null; pinch = 0; dragging = pointers.size > 0; }
    listen(canvas, 'pointercancel', pointerGone); listen(canvas, 'lostpointercapture', pointerGone);
    listen(canvas, 'wheel', function (event) { if (event.preventDefault) event.preventDefault(); zoomBy(clamp(event.deltaY || 0, -200, 200) * 0.0015); }, { passive: false });
    listen(canvas, 'webglcontextlost', function (event) {
      if (event && event.preventDefault) event.preventDefault();
      contextLost = true; stopLoop(); cancelLoad(); pointers.clear(); clearKeys(); autopilot = null;
      reportError(new Error('The 3D reef dive lost its graphics context. Reopen the dive or use the 2D survey.'));
      notify(true);
    });
    listen(doc, 'visibilitychange', function () { lastStamp = null; if (hidden()) { stopLoop(); clearKeys(); } else refresh(); });
    if (typeof global.ResizeObserver === 'function') { resizeObserver = new global.ResizeObserver(function () { resize(); }); resizeObserver.observe(canvas); }
    else listen(global, 'resize', resize);

    canvas._reef3dExplore = controller;
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    if (canvas.style) canvas.style.touchAction = 'none';
    if (staged) loadTimer = setTimer(pump, 0); else firstFrame();
    return controller;
  }

  global.Reef3DExplore = { version: '1.0.0', mount: mount };
})(window);
