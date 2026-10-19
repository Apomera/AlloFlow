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
  var DECOR_H = { finger: 0.45, antler: 0.5, corym: 0.42, massive: 0.42, plate: 0.47, encrust: 0.08, soft: 0.45, fan: 0.85, sponge: 0.42, algae: 0.22, rubble: 0.06, rock: 0.3 };
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
    coral_tree_nursery: ['structure', 'sessile', 2.6, 3, 20]
  };
  var SPECIAL = {
    whitetip_reef_shark: 'cruise', reef_manta: 'manta', green_turtle: 'turtle', hawksbill_turtle: 'turtle', giant_moray: 'moray',
    bluespotted_stingray: 'ray', clownfish: 'clown', cleaner_wrasse: 'cleaner', cleaner_shrimp: 'cleaner', humphead_wrasse: 'roam', day_octopus: 'den'
  };
  var ZONE = {
    magnificent_anemone: 'anemone', giant_clam: 'flat', sea_fan: 'slope', barrel_sponge: 'slope', christmas_tree_worm: 'bommie', soft_coral: 'bommie',
    blue_sea_star: 'flat', sea_cucumber: 'sand', bluespotted_stingray: 'channel', long_spined_urchin: 'reef', crown_of_thorns: 'garden', nudibranch: 'reef',
    mushroom_coral: 'garden', brain_coral: 'garden', staghorn_coral: 'garden', boulder_coral: 'garden', table_coral: 'crest', cauliflower_coral: 'crest', foliose_coral: 'slope',
    reef_star: 'rubble', reef_ball: 'rubble', coral_tree_nursery: 'rubble', lionfish: 'bommieSide', peacock_grouper: 'bommieSide',
    porcupinefish: 'bommieSide', day_octopus: 'rubbleEdge', anthias: 'bommieAbove', blue_green_chromis: 'bommieAbove', yellow_boxfish: 'garden'
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
      return (1 - smooth(1.6 + edge, 3.4 + edge, Math.abs(x - channelX(z)))) * smooth(-24, -17, z);
    }
    function deepMask(z) { return smooth(15, 21, z); }
    function rubbleMask(x, z) { return 1 - smooth(patchRadius, patchRadius + 2.2, Math.hypot(x - rubX, (z - rubZ) * 1.1)); }
    function sandMask(x, z) {
      var pocket = smooth(0.6, 0.84, noise2(x * 0.18 + o2, z * 0.18 + o3));
      return Math.max(channelMask(x, z), deepMask(z), pocket * 0.82);
    }
    function floorY(x, z) {
      var ch = channelMask(x, z), flat = Math.max(ch * 0.9, deepMask(z) * 0.9, sandMask(x, z) * 0.55, rubbleMask(x, z) * 0.9);
      var slope = smooth(-20, -12, z) * (1 - smooth(10, 18, z));
      // Broad, uneven spur crests rise above sheltered grooves. Warping the
      // crest lines and their widths avoids evenly spaced corrugations.
      var ridgeField = noise2(x * 0.12 + o3, z * 0.12 + o1);
      var ridgeWave = Math.sin(x * 0.57 + 1.15 * Math.sin(z * 0.09 + ph1) + 0.7 * (ridgeField - 0.5));
      var spur = (1.75 * smooth(-0.5, 0.78, ridgeWave) - 0.55) * (0.65 + 0.55 * ridgeField) * slope;
      var und = 1.15 * (noise2(x * 0.09 + o1, z * 0.09 + o2) - 0.5) + 0.44 * (noise2(x * 0.31 + o3, z * 0.31 - o1) - 0.5) + 0.14 * (noise2(x * 1.3, z * 1.3 + o2) - 0.5);
      // Eroded limestone shelves give the reef a readable middle scale between
      // tiny pavement texture and isolated bommies. Sand softens every margin.
      var shelf = 0.92 * smooth(0.32, 0.72, noise2(x * 0.13 + o1, z * 0.16 + o3)) * slope;
      shelf += 0.45 * (smooth(-19, -14, z) - smooth(-8, -3, z)) * (0.65 + 0.35 * ridgeField);
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
    return { floorY: floorY, channelX: channelX, channelMask: channelMask, deepMask: deepMask, rubbleMask: rubbleMask, sandMask: sandMask, rubble: { x: rubX, z: rubZ, r: patchRadius }, spawn: spawn };
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
    var r = stream(seed, 102), list = [];
    for (var gx = -26; gx <= 26.01; gx += 8.6) for (var gz = -26; gz <= 26.01; gz += 8.6) {
      var a = r(), b = r(), c = r(), d = r(), e = r(), f = r(), g = r(), h = r();
      var x = gx + (a - 0.5) * 5.2, z = gz + (b - 0.5) * 5.2;
      var p = 0.62 * (1 - terrain.sandMask(x, z)) * (1 - terrain.rubbleMask(x, z)) + 0.14 * terrain.deepMask(z) * (1 - terrain.channelMask(x, z));
      if (c > p || Math.abs(x) > 27 || Math.abs(z) > 27 || Math.hypot(x - terrain.spawn.x, z - terrain.spawn.z) < 6.5) continue;
      if (terrain.rubbleMask(x, z) > 0.01 || Math.hypot(x - terrain.rubble.x, z - terrain.rubble.z) < terrain.rubble.r + 3.6) continue;
      var R = 1.5 + 2.1 * d, H = R * (0.6 + 0.55 * e) * (z > 14 ? 0.8 : 1);
      list.push(makeBommie(x, z, R, H, f, g, h, terrain));
    }
    // Every reef keeps a cleaning station and a crevice.
    var spare = [[7, 9], [-9, -9], [12, -12]];
    for (var k = 0; list.filter(function (b) { return b.r >= 1.4; }).length < 3 && k < spare.length; k++) list.push(makeBommie(spare[k][0], spare[k][1], 2.4, 1.8, 0.3 * k, 0.5, 0.4, terrain));
    // Knolls: small coral heads that give the reef its broken, three-dimensional floor.
    var rk = stream(seed, 104), g1 = rk() * 40, g2 = rk() * 40;
    for (gx = -27; gx <= 27.01; gx += 3.7) for (gz = -27; gz <= 27.01; gz += 3.7) {
      var ka = rk(), kb = rk(), kc = rk(), kd = rk(), ke = rk(), kf = rk(), kg = rk(), kh = rk();
      var kx = gx + (ka - 0.5) * 3, kz = gz + (kb - 0.5) * 3, KR = 0.6 + 0.9 * kd, clear = true;
      var kp = 0.55 * (1 - terrain.sandMask(kx, kz)) * (1 - terrain.rubbleMask(kx, kz)) * (0.35 + 0.9 * noise2(kx * 0.12 + g1, kz * 0.12 + g2));
      if (kc > kp || Math.abs(kx) > 27.5 || Math.abs(kz) > 27.5 || Math.hypot(kx - terrain.spawn.x, kz - terrain.spawn.z) < 4 || Math.hypot(kx - terrain.rubble.x, kz - terrain.rubble.z) < terrain.rubble.r + 2) continue;
      for (var q = 0; q < list.length && clear; q++) if (Math.hypot(list[q].x - kx, list[q].z - kz) < list[q].r * 1.3 + KR * 1.3 + 0.3) clear = false;
      if (clear) list.push(makeBommie(kx, kz, KR, KR * (0.45 + 0.5 * ke), kf, kg, kh, terrain));
    }
    return list;
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
  function coralTone(H) {
    return function (t, cap, x, y, z, rgb) {
      var height = clamp(y / H, 0, 1), tip = smooth(0.76, 1, t), tissue = noise3(x / H * 9 + 3.1, y / H * 9, z / H * 9 - 2.7);
      var g = 0.64 + 0.19 * smooth(0.03, 0.82, height) + 0.16 * tip + 0.045 * (tissue - 0.5) + (cap ? 0.022 : 0);
      rgb[0] = g * (1.02 - 0.035 * tip); rgb[1] = g; rgb[2] = g * (0.96 + 0.075 * tip);
    };
  }
  function V(T, x, y, z) { return new T.Vector3(x, y, z); }
  function buildBranching(T, R, H, variant, sides, detail, lite) {
    var b = new Builder(), style = variant % 3, phase = variant * 1.71 + 0.4, tone = coralTone(H), steps = detail ? 4 : 2;
    // Spend long-shaft subdivisions on more live growing tips. Short, plump
    // branchlets give the crown its density; two cap rings soften the ends.
    b.caps = lite ? 1 : 2;
    var k, a, dx, dz, curve, tmp = new T.Vector3();
    if (style === 0) {
      var fingers = detail ? 14 : lite ? 6 : 8;
      for (k = 0; k < fingers; k++) {
        a = phase + k * 2.39996; dx = Math.cos(a); dz = Math.sin(a);
        var rr = R * 0.61 * Math.sqrt((k + 0.5) / fingers), top = H * (0.72 + 0.27 * ((k * 0.37 + variant * 0.11) % 1)) * (1 - 0.14 * rr / R), lean = R * (0.05 + 0.11 * ((k * 0.71) % 1)), bend = R * 0.11 * Math.sin(k * 1.8 + phase);
        // Stems rise from an encrusting base, arc into the light, then turn
        // upward at their tips. Lateral growth replaces a few bare main shafts.
        curve = [V(T, dx * rr * 0.61, -0.01, dz * rr * 0.61), V(T, dx * rr * 0.88 - dz * bend, top * 0.27, dz * rr * 0.88 + dx * bend), V(T, dx * (rr + lean) + dz * bend * 0.35, top * 0.73, dz * (rr + lean) - dx * bend * 0.35), V(T, dx * (rr + lean * 0.78), top, dz * (rr + lean * 0.78))];
        b.tube(T, curve, R * (0.068 + 0.009 * (k % 3)), steps, sides, 0.5, tone);
        if (!lite && (detail || k < 5)) {
          var bud = bez(curve, 0.42 + 0.085 * (k % 3), new T.Vector3()), ba = a + (k % 4 < 2 ? 1.1 : -1.1), br = R * (0.2 + 0.04 * (k % 2)), by = Math.min(H * 0.97, top * (0.85 + 0.07 * (k % 3)));
          b.tube(T, [bud, V(T, bud.x + Math.cos(ba) * br * 0.66, bud.y + (by - bud.y) * 0.13, bud.z + Math.sin(ba) * br * 0.66), V(T, bud.x + Math.cos(ba) * br * 1.05, by - H * 0.13, bud.z + Math.sin(ba) * br * 1.05), V(T, bud.x + Math.cos(ba) * br, by, bud.z + Math.sin(ba) * br)], R * 0.049, 2, sides, 0.43, tone);
        }
      }
      if (!lite) b.absorb(T, new T.SphereGeometry(1, sides + 3, 4, 0, TAU, 0, Math.PI / 2), new T.Matrix4().makeScale(R * 0.62, H * 0.12, R * 0.62), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = rgb[1] = rgb[2] = 0.6; });
    } else if (style === 1) {
      var antlers = detail ? 6 : lite ? 4 : 5;
      for (k = 0; k < antlers; k++) {
        a = phase + k * 2.399963 + 0.3 * Math.sin(k * 2.1 + variant); dx = Math.cos(a); dz = Math.sin(a);
        var reach = R * (0.76 + 0.21 * ((k * 0.43 + 0.11) % 1)), endY = H * (0.69 + 0.29 * ((k * 0.61 + 0.3) % 1));
        var curl = R * 0.1 * Math.sin(k * 2.7 + phase);
        curve = [V(T, dx * R * (0.1 + 0.035 * (k % 3)), -0.01, dz * R * (0.1 + 0.035 * (k % 3))), V(T, dx * reach * 0.43 - dz * curl, H * 0.3, dz * reach * 0.43 + dx * curl), V(T, dx * reach * 1.03 - dz * curl * 0.4, endY * 0.72, dz * reach * 1.03 + dx * curl * 0.4), V(T, dx * reach, endY, dz * reach)];
        b.tube(T, curve, R * (0.069 + 0.007 * (k % 3)), steps, sides, 0.52, tone);
        for (var f = 0; f < (detail ? 2 : 1); f++) {
          var base = bez(curve, f ? 0.7 : 0.42, new T.Vector3()), fa = a + (f ? 0.92 : -0.96), fx = Math.cos(fa), fz = Math.sin(fa), len = R * (0.39 - 0.08 * f), rise = H * (0.39 - 0.065 * f);
          var fork = [base, V(T, base.x + fx * len * 0.46, base.y + rise * 0.16, base.z + fz * len * 0.46), V(T, base.x + fx * len * 0.96, base.y + rise * 0.63, base.z + fz * len * 0.96), V(T, base.x + fx * len, Math.min(H * 0.97, base.y + rise), base.z + fz * len)];
          b.tube(T, fork, R * 0.044, 2, sides, 0.43, tone);
          if (!lite && (detail ? f === 0 : k < 2)) {
            var forkBase = bez(fork, 0.55, new T.Vector3()), forkA = fa + (f ? -0.9 : 0.9), reach2 = R * (0.16 + 0.04 * (k % 2)), end2 = Math.min(H * 0.98, forkBase.y + H * (0.23 + 0.02 * (k % 3)));
            b.tube(T, [forkBase, V(T, forkBase.x + Math.cos(forkA) * reach2 * 0.5, forkBase.y + H * 0.045, forkBase.z + Math.sin(forkA) * reach2 * 0.5), V(T, forkBase.x + Math.cos(forkA) * reach2, end2 - H * 0.06, forkBase.z + Math.sin(forkA) * reach2), V(T, forkBase.x + Math.cos(forkA) * reach2, end2, forkBase.z + Math.sin(forkA) * reach2)], R * 0.027, 2, sides, 0.35, tone);
          }
        }
      }
    } else {
      b.tube(T, [V(T, 0, -0.01, 0), V(T, 0, H * 0.15, 0), V(T, R * 0.02, H * 0.3, 0), V(T, 0, H * 0.42, 0)], R * 0.145, lite ? 3 : 2, sides, 0.2, tone);
      var twigs = detail ? 6 : lite ? 1 : 3, boughs = detail ? 6 : lite ? 4 : 5;
      for (k = 0; k < boughs; k++) {
        a = phase + k * TAU / boughs + 0.12 * Math.sin(k * 2.3 + phase); dx = Math.cos(a); dz = Math.sin(a);
        var span = R * (0.82 + 0.15 * ((k * 0.57) % 1));
        var bendY = H * 0.045 * Math.sin(k * 2.1 + phase);
        curve = [V(T, 0, H * 0.38, 0), V(T, dx * span * 0.3, H * 0.46 + bendY, dz * span * 0.3), V(T, dx * span * 0.8, H * 0.49 + bendY, dz * span * 0.8), V(T, dx * span, H * 0.63 + bendY, dz * span)];
        b.tube(T, curve, R * 0.061, lite ? 4 : 2, sides, 0.35, tone);
        for (var w = 0; w < twigs; w++) {
          var tt = 0.2 + w * (0.72 / Math.max(1, twigs - 1)), tb = bez(curve, tt, tmp).clone(), top2 = H * (0.82 + 0.16 * (((k + w) * 0.39) % 1));
          var spread = (w % 2 ? -1 : 1) * R * (0.12 + 0.06 * (1 - tt)), tx = tb.x + dx * R * 0.055 - dz * spread, tz = tb.z + dz * R * 0.055 + dx * spread;
          b.tube(T, [tb, V(T, lerp(tb.x, tx, 0.65), tb.y + (top2 - tb.y) * 0.2, lerp(tb.z, tz, 0.65)), V(T, tx + dx * R * 0.02, top2 - H * 0.1, tz + dz * R * 0.02), V(T, tx + dx * R * 0.012, top2, tz + dz * R * 0.012)], R * (detail ? 0.034 : 0.037), lite ? 3 : detail || (k < 3 && w === 1) ? 2 : 1, sides, 0.39, tone);
        }
      }
    }
    return b.build(T, false);
  }
  function buildMassive(T, R, H, variant, detail) {
    var seg = detail ? 34 : 16, rings = detail ? 15 : 8, ph = variant * 2.17, theta = Math.PI * 0.58, low = Math.cos(theta);
    var g = new T.SphereGeometry(1, seg, rings, 0, TAU, 0, theta), pos = g.attributes.position;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      var shoulder = Math.max(0, 1 - y * y), lobes = Math.sin(Math.atan2(z, x) * 4 + ph) * shoulder;
      var lump = 1 + 0.3 * (noise3(x * 1.7 + ph, y * 1.7, z * 1.7 - ph) - 0.5) + 0.09 * (noise3(x * 4.3, y * 4.3 + ph, z * 4.3) - 0.5) + 0.055 * lobes;
      pos.setXYZ(k, (x * lump + 0.065 * y * y) * R, ((y * lump - low) / (1 - low) - 0.03 + 0.035 * x * shoulder) * H, z * lump * R * 0.94);
    }
    g.computeVertexNormals(); weldSphere(g, seg, rings, false);
    var b = new Builder();
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { var s = 0.55 + 0.45 * smooth(-0.05, 0.6, y / H) + 0.06 * (noise3(x * 9 + ph, y * 9, z * 9) - 0.5); rgb[0] = rgb[1] = rgb[2] = s; });
    return b.build(T, false);
  }
  function buildPlate(T, R, H, variant, detail) {
    var segs = detail ? 32 : 14, radii = detail ? [0.26, 0.52, 0.76, 0.94, 1] : [0.52, 0.9, 1], ph = variant * 1.3, thick = 0.013 + R * 0.031, b = new Builder();
    b.caps = 2;
    b.tube(T, [V(T, 0, -0.01, 0), V(T, -R * 0.03, H * 0.1, 0), V(T, R * 0.04, H * 0.22, -R * 0.02), V(T, 0, H * 0.3, 0)], R * 0.19, 3, detail ? 6 : 5, 0.66, coralTone(H));
    // The growing rim is one continuous, rounded surface shared by the upper
    // and lower faces. Most radial detail is reserved for that curved lip.
    var shelves = detail ? [[0.73, 0.31, 0.24, 0.09], [1, 0.52, -0.04, -0.015], [0.64, 0.76, -0.23, -0.13]] : [[1, 0.43, 0.02, 0], [0.66, 0.73, -0.21, -0.12]];
    shelves.forEach(function (shelf, layer) {
      var rad = R * shelf[0], top = H * shelf[1], ox = R * shelf[2], oz = R * shelf[3], phase = ph + layer * 1.9;
      function edge(a) { return rad * (0.89 + 0.07 * Math.sin(3 * a + phase) + (detail ? 0.027 * Math.sin(7 * a + 2 * phase) : 0.015 * Math.sin(2 * a - phase))); }
      function surfaceY(r, a) {
        // Broad shallow cups remain smooth at the middle LOD. Restrict the
        // small folds to the detailed perimeter so they cannot alias into spikes.
        var lip = smooth(0.32, 1, r), folds = Math.sin(a * 3 + phase) * 0.033 + (detail ? Math.sin(a * 7 - phase) * 0.009 : 0);
        return top - H * 0.105 * (1 - r * r) + H * 0.045 * r * r + rad * folds * lip + H * 0.035 * Math.sin(a + phase) * r;
      }
      var plate = new Builder(), tops = [], bottoms = [];
      function vertex(r, a, lower) {
        var e = edge(a) * r, x = ox + Math.cos(a) * e, z = oz + Math.sin(a) * e, y = surfaceY(r, a), growth = smooth(0.78, 1, r);
        // Rolling over at the outer edge removes the sharp cut-paper silhouette.
        y += lower ? -thick * (1.7 - 0.9 * r) : r === 1 ? -thick * 0.42 : thick * 0.12 * smooth(0.76, 0.94, r);
        var light = lower ? 0.73 + 0.12 * r : 0.69 + 0.16 * r + 0.16 * growth + 0.035 * (noise2(x / R * 8 + phase, z / R * 8) - 0.5);
        return plate.vertex(x, y, z, 0, lower ? -1 : 1, 0, light * (1.02 - 0.03 * growth), light, light * (0.96 + 0.07 * growth));
      }
      var centreTop = vertex(0, 0, false), centreBottom = vertex(0, 0, true);
      radii.forEach(function (r, ring) {
        var upper = [], lower = [];
        for (var j = 0; j < segs; j++) { var a = j / segs * TAU; upper.push(vertex(r, a, false)); lower.push(r === 1 ? upper[j] : vertex(r, a, true)); }
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
  function buildEncrusting(T, R, H, variant, detail) {
    var segs = detail ? 28 : 18, rings = detail ? 4 : 3, ph = variant * 0.91;
    var g = polar(T, rings, segs, function (r, a, rgb) {
      // Lobed growth margins meet neighbouring colonies without the repeated
      // circular-pad silhouette. Broad relief remains legible at both LODs;
      // the material supplies the much finer corallites between those folds.
      var edge = 0.89 + 0.055 * Math.sin(a * 3 + ph) + 0.027 * Math.sin(a * 5 - ph * 0.7) + 0.025 * Math.sin(a * 2 + ph);
      var e = R * edge * r, x = Math.cos(a) * e, z = Math.sin(a) * e;
      var lumps = noise2(x / R * 3.2 + ph, z / R * 3.2 - ph), rim = smooth(0.74, 1, r);
      var fold = Math.sin(a * 3 + ph + r * 2) * r * r * (1 - r);
      var light = 0.72 + 0.13 * lumps + 0.11 * rim;
      rgb[0] = light; rgb[1] = light * (0.98 + 0.02 * rim); rgb[2] = light * (0.94 + 0.06 * rim);
      // A fleshy low mound rolls into the growing margin, with more of the
      // original triangle budget moved to its smooth outer outline.
      return [x, 0.002 + H * (0.075 + Math.pow(Math.max(0, 1 - r * r), 0.72) * (0.48 + 0.32 * lumps)) + H * 0.4 * fold, z];
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
    var b = new Builder(), pieces = 10 + (variant % 3), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), p = new T.Vector3(), k;
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
      var chunk = k % 4 === 0, cyl = chunk ? new T.IcosahedronGeometry(1, 0) : new T.CylinderGeometry(rad * 0.85, rad, len, 6, 2, false);
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
  function buildAlgae(T, R, H, variant, detail, tint) {
    var b = new Builder(), blades = detail ? 14 : 7, sections = detail ? 8 : 5, baseC = tint.base, tipC = tint.tip;
    b.useExtra('reefBladePhase');
    for (var k = 0; k < blades; k++) {
      var h1 = hash2(variant, k * 5 + 1), h2 = hash2(variant, k * 5 + 2), h3 = hash2(variant, k * 5 + 3);
      var yaw = k * 2.39996 + variant * 0.37, rr = R * 0.3 * Math.sqrt((k + 0.5) / blades), bx = Math.cos(yaw) * rr, bz = Math.sin(yaw) * rr;
      var h = H * (0.5 + 0.5 * h1), width = (0.05 + 0.04 * h2) * Math.min(1, R / 0.2), lean = 0.5 + 0.6 * h3, dx = Math.cos(yaw), dz = Math.sin(yaw);
      var turn = yaw + (h2 - 0.5) * 0.8, ax = -Math.sin(turn), az = Math.cos(turn), first = b.count(), row, col;
      b.extra.value = h1 * TAU;
      for (row = 0; row <= sections; row++) {
        var t = row / sections, env = (0.35 + 0.65 * Math.sin(t * Math.PI * 0.85)) * (1 - Math.pow(t, 4)) + 0.08 + 0.06 * Math.sin(t * 9 + k);
        var out = lean * h * t * t * 0.6, cx = bx + dx * out, cz = bz + dz * out, y = t * h * (1 - 0.12 * lean * t) - 0.004, light = 0.9 + 0.1 * Math.sin(t * 7 + k);
        for (col = 0; col < 3; col++) {
          var side = col - 1, across = side * width * 0.5 * env, fold = (1 - Math.abs(side)) * width * 0.12 * Math.sin(t * Math.PI), sh = light * (side === 0 ? 1.06 : 0.94);
          b.vertex(cx + ax * across + dx * fold, y, cz + az * across + dz * fold, 0, 1, 0, (baseC.r + (tipC.r - baseC.r) * t) * sh, (baseC.g + (tipC.g - baseC.g) * t) * sh, (baseC.b + (tipC.b - baseC.b) * t) * sh);
        }
      }
      for (row = 0; row < sections; row++) for (col = 0; col < 2; col++) { var a0 = first + row * 3 + col; b.i.push(a0, a0 + 1, a0 + 3, a0 + 1, a0 + 4, a0 + 3); }
    }
    return b.build(T, true);
  }
  function buildSponge(T, R, H, variant, sides) {
    var b = new Builder();
    for (var k = 0; k < 3; k++) {
      var a = variant + k * 2.1, d = k ? R * (0.33 + 0.045 * Math.sin(k + variant)) : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, h = H * (1 - k * 0.22);
      var bulge = 0.045 + 0.035 * hash2(k + 12, variant);
      var radius = R * (0.26 - k * 0.04), profile = [[0, 0.82], [0.32, 0.94], [0.7, 1.10], [0.992, 1.08], [1.012, 0.91], [0.86, 0.70], [0.56, 0.08]], first = b.count();
      // A rolled lip and recessed cavity leave a real opening at each osculum.
      for (var row = 0; row < profile.length; row++) for (var j = 0; j < sides; j++) {
        var ang = j / sides * TAU, t = profile[row][0], r = radius * profile[row][1] * (1 + bulge * Math.sin(ang * 3 + a + t * 0.8) + 0.025 * Math.sin(ang * 5 - t * 2));
        var lip = Math.pow(t, 4) * h * (0.026 * Math.sin(ang * 2 + k) + 0.012 * Math.sin(ang * 3 + a));
        var tone = (row < 4 ? 0.65 + t * 0.25 : row === 4 ? 0.86 : row === 5 ? 0.31 : 0.15) * (0.96 + 0.07 * noise3(Math.cos(ang) * 4, t * 7, Math.sin(ang) * 4));
        b.vertex(x * (1 + 0.3 * t * t) + Math.cos(ang) * r * (1.04 - 0.035 * t) + radius * 0.2 * t * t * Math.cos(a), h * t + lip, z * (1 + 0.3 * t * t) + Math.sin(ang) * r * (0.96 + 0.025 * t) + radius * 0.2 * t * t * Math.sin(a), 0, 1, 0, tone, tone, tone);
        if (row) { var q = first + (row - 1) * sides + j, qn = first + (row - 1) * sides + (j + 1) % sides; b.i.push(q, q + sides, qn, qn, q + sides, qn + sides); }
      }
    }
    return b.build(T, true);
  }
  // Soft coral: a fleshy trunk with branches ending in polyp lobes (sways).
  function buildSoftCoral(T, R, H, variant, detail) {
    var b = new Builder(), sides = detail ? 6 : 4, steps = detail ? 4 : 3, branches = detail ? 7 : 5;
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
      var fingers = detail ? 4 : 2;
      for (var j = 0; j < fingers; j++) {
        var fa = a + j * 2.39996 + 0.2 * Math.sin(k + j * 1.73), reach = R * (0.12 + 0.13 * hash2(k + variant, j + 41)), tx = tip.x + Math.cos(fa) * reach, tz = tip.z + Math.sin(fa) * reach;
        var top = tip.y + R * (0.18 + 0.23 * hash2(k + 73, j + variant)), rad = R * (0.069 + 0.013 * hash2(k + 93, j + variant));
        b.tube(T, [V(T, tip.x, tip.y - R * 0.06, tip.z), V(T, tip.x + (tx - tip.x) * 0.65, tip.y + R * 0.02, tip.z + (tz - tip.z) * 0.65), V(T, tx, top - rad, tz), V(T, tx, top, tz)], rad, detail ? 3 : 2, detail ? 5 : 4, 0.25, tone);
      }
    }
    var geometry = b.build(T, false);
    geometry.boundingSphere.radius += H * 0.13;
    return geometry;
  }
  // Sea fan: a flat branching lattice that faces across the current (sways).
  function buildFan(T, R, H, variant, detail, sparse) {
    var b = new Builder(), spokes = sparse ? 3 : detail ? 7 : 5, rows = sparse ? 1 : detail ? 4 : 3;
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
        b.tube(T, [start, p1, p2, end], R * (0.008 + 0.003 * (1 - t)), 2, 3, 0.1, tone);
      }
      if (!sparse) for (var side = -1; side <= 1; side += 2) {
        var tip = point(i, 0.82), twig = point(i, 1);
        twig.x += side * R * (0.06 + 0.05 * hash2(i + variant, side + 3)); twig.y -= H * (0.018 + 0.035 * hash2(i + 27, side + variant));
        b.tube(T, [tip, tip.clone().lerp(twig, 0.36), tip.clone().lerp(twig, 0.72), twig], R * 0.008, 2, 3, 0.7, tone);
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
      f = f.replace('#include <tonemapping_fragment>', "#ifdef USE_FOG\nfloat reefOpticalDistance=length(vViewPosition);\nfloat reefMeanDepth=max(0.0,-0.5*(reefWaterEye.y+vReefWorld.y));\nvec3 reefTransmission=exp(-reefWaterExtinction*reefOpticalDistance*(1.0+0.012*reefMeanDepth));\nvec3 reefWaterRay=normalize(vReefWorld-reefWaterEye+vec3(0.0,0.00001,0.0));\nfloat reefColumnLight=mix(0.72,1.12,smoothstep(-0.72,0.6,reefWaterRay.y));\nfloat reefForwardGlow=pow(max(0.0,dot(reefWaterRay,normalize(vec3(0.42,1.0,0.3)))),6.0);\nvec3 reefInscatter=reefWaterScatter*(reefColumnLight+0.1*reefForwardGlow);\ngl_FragColor.rgb=gl_FragColor.rgb*reefTransmission+reefInscatter*(1.0-reefTransmission);\n#endif" + '\n#include <tonemapping_fragment>');
      f = f.replace('#include <fog_fragment>', '');
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
    var view = options.view === 'first' ? 'first' : 'third';
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(60, 1, 0.05, 70), renderer = null;
    var disposed = false, contextLost = false, raf = 0, rafIsTimer = false, lastStamp = null, worldTime = 0, visualTime = 0, frames = 0, paused = false;
    var listeners = [], resizeObserver = null, notifyTimer = 0, lastNotify = -Infinity, lastCheck = -Infinity, lastKey = '', pendingNotify = false;
    var owned = [], canvasW = 0, canvasH = 0, derivatives = false, cullDist = high ? 34 : 24;
    var terrain = null, bommies = [], station = null, crevice = null, obstacle = new Float32Array(GRID_N * GRID_N), blocked = new Uint8Array(GRID_N * GRID_N);
    var organisms = [], byUid = {}, owner = new Map(), protos = [], groups = [], anemones = [], sessiles = [], decorMeshes = [], decorKinds = [];
    // Decor level of detail: full models near the diver, stand-ins further out, nothing in the fog beyond.
    var nearDist = high ? 17 : 13, farDist = high ? 34 : 25, smallFar = high ? 19 : 14;
    // Budget governor: the measured frame (renderer.info) scales the decor and organism draw distances.
    var gov = { scale: 1, frames: 0 }, TRI_BUDGET = high ? 860000 : 330000, CALL_BUDGET = high ? 400 : 170;
    var floorMesh = null, bommieMesh = null, orgRoot = null, diver = null, bubbles = null, focusRing = null, mask = null, backdrop = null, surface = null, motes = null, sun = null, hemi = null;
    var shafts = [], U = null, snowU = null, plantMotions = [], fogNear = new T.Color(), fogFar = new T.Color(), topNear = new T.Color(), topFar = new T.Color(), lastWaterDepth = -1;
    var diverPos = new T.Vector3(), bearing = 0, speed = 0, vy = 0, turnRate = 0, bodyPitch = 0, bodyRoll = 0, kick = 0, swimEffort = 0, autopilot = null;
    var keys = { forward: 0, back: 0, left: 0, right: 0, up: 0, down: 0 }, ext = { forward: 0, turn: 0, rise: 0 };
    var look = { yaw: 0, pitch: 0 }, camDist = 4.2, camPos = new T.Vector3(), camTarget = new T.Vector3(), dragging = false;
    var eyeMotion = { pitch: 0, yaw: 0, roll: 0, heave: 0, sway: 0, surge: 0 };
    var focusedUid = null, cycle = { list: [], at: -Infinity }, pointers = new Map(), pinch = 0, press = null;
    var frustum = new T.Frustum(), projScreen = new T.Matrix4(), sphere = new T.Sphere(), raycaster = new T.Raycaster(), tmpA = { x: 0, y: 0, z: 0 }, tmpB = { x: 0, y: 0, z: 0 }, aheadPoint = { x: 0, y: 0, z: 0 };
    var mats = {}, phMaterial = null, phGeometry = {}, legs = [], diverBody = null, HEAD = new T.Vector3(0.74, 0.09, 0), REG = new T.Vector3(0.66, -0.05, 0.16);
    var bubbleState = [], bubbleClock = 0, bubbleBudget = 0, bubbleSide = 1, rbub = stream(seed, 901), BUBBLES = 64, apSpot = {}, settle = 0;
    var desired = new T.Vector3(), lookAt = new T.Vector3(), headW = new T.Vector3(), ndc = new T.Vector2(), closest = new T.Vector3(), controller = null;
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
      stopLoop(); clearTimer(notifyTimer); notifyTimer = 0;
      listeners.forEach(function (off) { off(); }); listeners.length = 0;
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      pointers.clear(); autopilot = null;
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
      build();
    } catch (error) {
      dispose();
      throw new Error('This device could not start the 3D reef dive. ' + (error && error.message ? error.message : 'Please use the 2D survey.'));
    }

    function build() {
      var unitArea = restoration ? { reef_star: 1.5, reef_ball: 4.8, coral_tree_nursery: 9.5 }[restoration.kind] : 0;
      var patchRadius = restoration ? clamp(Math.sqrt(restoration.units * unitArea / Math.PI) + 1.4, 4, 9.5) : 4.5;
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
      var causticTex = own(createCausticTexture(T, high ? 256 : 128));
      U = { map: { value: causticTex }, time: { value: 4 }, strength: { value: 0.62 }, eye: { value: new T.Vector3() }, extinction: { value: new T.Vector3(0.065, 0.042, 0.030) }, scatter: { value: new T.Color() } };
      buildMaterials();
      buildFloor(); buildBommieMesh();
      orgRoot = new T.Group(); orgRoot.name = 'reef-explore-organisms'; scene.add(orgRoot);
      buildOrganisms(); immerseOrganisms();
      buildDecor();
      buildWater();
      buildDiver(); buildBubbles(); buildFocusRing(); buildMask();
      spawnDiver();
      organisms.forEach(function (o) { if (o.path) { if (o.school) planSchoolRoute(o); poseMobile(o, 0, true); } });
    }

    // ---- Materials (shaders adapted from Reef3DHabitat) ---------------------
    function key(name) { return 'reef3dx-' + name + '-v1|' + (derivatives ? 'd' : 'n') + (high ? 'h' : 'l'); }
    function commonFragment(parts, local) {
      parts.waterColumn = true;
      parts.fCommon.push('uniform vec3 reefWaterExtinction;uniform vec3 reefWaterScatter;uniform vec3 reefWaterEye;');
      if (derivatives) parts.fCommon.push('#define REEF_DERIVATIVES');
      if (high) parts.fCommon.push('#define REEF_CAUSTIC_LAYERS');
      parts.fCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''), GLSL_NOISE, CAUSTIC_COMMON);
      parts.vCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''));
      parts.vProject.push(WORLD_VERTEX + (local ? '\nvReefLocal=position;' : ''));
      parts.fLighting = [CAUSTIC_APPLY.replace('reefCausticStrength*', 'reefCausticStrength*getShadowMask()*')];
    }
    function bindCaustics(shader) { shader.uniforms.reefCausticMap = U.map; shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefCausticStrength = U.strength; shader.uniforms.reefWaterExtinction = U.extinction; shader.uniforms.reefWaterScatter = U.scatter; shader.uniforms.reefWaterEye = U.eye; }
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
          var original = material.onBeforeCompile, originalKey = material.customProgramCacheKey();
          material.onBeforeCompile = function (shader, renderer) {
            if (original) original.call(this, shader, renderer);
            var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader);
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
      material.customProgramCacheKey = function () { return key(name); };
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
      shader.uniforms.reefRockLife = { value: new T.Vector2(vitality, health.algae) };
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
        parts.vCommon.push('varying vec3 vReefCoralNormal;');
        parts.vBegin.push('vReefCoralNormal=normal;');
        parts.fCommon.push('uniform vec4 reefCoralA;uniform vec4 reefCoralB;varying vec3 vReefCoralNormal;');
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
          'vec3 reefQ=vReefLocal*reefCoralA.w;',
          'float reefPigment=reefNoise(vReefLocal*11.0+vec3(1.7,5.2,2.9));',
          'float reefAA=0.08,reefDetail=0.55,reefGrooveAA=0.06;',
          'float reefTissue=reefNoise(vReefLocal*6.5+vec3(5.2,1.3,8.1));',
          'vec3 reefProjection=pow(abs(normalize(vReefCoralNormal)),vec3(8.0));reefProjection/=max(dot(reefProjection,vec3(1.0)),0.0001);',
          'float reefGrooveN=0.4;',
          'if(reefCoralB.x>0.5){vec3 maze=vReefLocal*reefCoralB.y;reefGrooveN=reefMeander(maze.yz)*reefProjection.x+reefMeander(maze.xz)*reefProjection.y+reefMeander(maze.xy)*reefProjection.z;}',
          '#ifdef REEF_DERIVATIVES',
          'float reefFootprint=max(max(fwidth(reefQ.x),fwidth(reefQ.y)),fwidth(reefQ.z));',
          'reefAA=clamp(reefFootprint*0.6,0.015,0.15);reefDetail=1.0-smoothstep(0.22,0.85,reefFootprint);',
          'reefGrooveAA=max(0.02,fwidth(reefGrooveN)*1.2);',
          '#endif',
          'vec3 reefPolyps=reefPolypField(reefQ.yz,reefDetail,reefAA)*reefProjection.x+reefPolypField(reefQ.xz+vec2(7.2,3.1),reefDetail,reefAA)*reefProjection.y+reefPolypField(reefQ.xy+vec2(2.3,9.1),reefDetail,reefAA)*reefProjection.z;',
          'float reefPore=reefPolyps.x,reefRim=reefPolyps.y,reefSepta=reefPolyps.z;',
          'float reefGrooveRaw=1.0-smoothstep(0.025,0.12,reefGrooveN);',
          'float reefGroove=(1.0-smoothstep(0.025,0.12+reefGrooveAA,reefGrooveN))*reefCoralB.x*(1.0-smoothstep(0.12,0.6,reefGrooveAA));',
          // Slow pigment changes sit beneath tiny polyp cups; the growing
          // skeletal ridges remain softly pale instead of sharp white dots.
          'float reefMantle=smoothstep(0.18,0.82,reefPigment);',
          'vec3 reefTissueTint=mix(vec3(0.91,0.955,0.93),vec3(1.045,1.025,1.02),reefMantle);',
          'diffuseColor.rgb*=reefTissueTint*(1.0-reefCoralA.x*reefPore+reefCoralA.z*(reefRim+0.26*reefSepta))*(0.94+0.12*reefTissue)*(1.0-0.23*reefGroove);',
          ABSORB
        ].join('\n'));
        parts.fRough.push('roughnessFactor=clamp(roughnessFactor-0.045*reefRim+0.035*reefPore+0.035*reefGroove,0.35,1.0);');
        // Small raised corallite rims catch light around the recessed polyp cups.
        parts.fNormal.push(surfaceRelief('(0.0009*reefRim+0.00022*reefSepta-0.0018*reefPore)*reefCoralA.x-0.0011*reefGrooveRaw*reefCoralB.x', '0.28'));
        applyParts(shader, parts, 'coral');
      };
    }
    function plantShader(motion) {
      return function (shader) {
        var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
        shader.uniforms.reefPlantMotion = motion;
        parts.vCommon.push([
          'uniform vec4 reefPlantMotion;attribute float reefBladePhase;',
          'vec2 reefPlantWave(float t,float phase,float travel,float amplitude){float angle=phase-travel*t;float ripple=phase*2.0+0.8-(travel+4.0)*t;',
          'float s=0.84*sin(angle)+0.16*sin(ripple);float c=0.84*travel*cos(angle)+0.16*(travel+4.0)*cos(ripple);',
          'return vec2(amplitude*t*t*s,amplitude*(2.0*t*s-t*t*c));}'
        ].join('\n'));
        parts.vNormal.push([
          'float reefPlantT=clamp(position.y/max(reefPlantMotion.z,0.001),0.0,1.12);',
          'float reefPlantPhase=reefBladePhase*0.12;mat4 reefPlantFrame=modelMatrix;',
          '#ifdef USE_INSTANCING',
          'reefPlantFrame=modelMatrix*instanceMatrix;',
          '#endif',
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
          'float reefPolypCups=smoothstep(0.59,0.76,reefPolyp)*reefPlantDetail;',
          'diffuseColor.rgb*=0.95+0.09*reefTissue-0.085*reefPolypCups;',
          'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.08,1.045,1.02),smoothstep(0.72,0.9,reefPolyp)*reefPlantDetail*0.45);',
          ABSORB
        ].join('\n'));
        parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.035*reefPolypCups,0.55,0.95);');
        parts.fNormal.push(surfaceRelief('(reefTissue*0.0007-reefPolypCups*0.00075)*reefPlantDetail', '0.16'));
        applyParts(shader, parts, 'plant');
      };
    }
    function plantMotion(height, amount) { var m = { value: new T.Vector4(0, 0, height, reducedMotion ? 0 : amount) }; m.amount = amount; plantMotions.push(m); return m; }
    function buildMaterials() {
      function std(params) { params.color = params.color || 0xffffff; params.vertexColors = true; return new T.MeshStandardMaterial(params); }
      var look = { a: { value: new T.Vector4(0.25, 0, 0.08, 75) }, b: { value: new T.Vector4(0.0, 18, 0, 0) } };
      var brain = { a: { value: new T.Vector4(0.08, 0, 0.05, 60) }, b: { value: new T.Vector4(1.0, 28, 0, 0) } };
      var sponge = { a: { value: new T.Vector4(0.35, 0, 0.0, 30) }, b: { value: new T.Vector4(0, 18, 0, 0) } };
      U.substrate = { value: own(createSubstrateTexture(T)) };
      mats.floor = patch(std({ roughness: 0.95, metalness: 0 }), 'floor', floorShader);
      mats.rock = patch(std({ roughness: 0.92 }), 'rock', rockShader);
      mats.coral = patch(std({ roughness: 0.82 }), 'coral', coralShader(look));
      mats.brain = patch(std({ roughness: 0.8 }), 'coral', coralShader(brain));
      mats.sponge = patch(std({ roughness: 0.88 }), 'coral', coralShader(sponge));
      mats.algae = patch(std({ roughness: 0.65, side: T.DoubleSide }), 'plant', plantShader(plantMotion(0.22, 1)));
      mats.soft = patch(std({ roughness: 0.76 }), 'plant', plantShader(plantMotion(0.45, 0.55)));
      mats.fan = patch(std({ roughness: 0.7 }), 'plant', plantShader(plantMotion(0.85, 0.35)));
    }

    // ---- Seafloor and bommies -------------------------------------------------
    // Living reef crust: dark rock under pink and purple coralline, tan turf, green
    // algae on a degraded reef and bright encrusting sponges on a healthy one.
    var CRUST = null, SANDC = null, RUBC = null;
    function crustColor(x, y, z, up, out, floor) {
      if (!CRUST) CRUST = { stone: lin3(0x92866d), cca: lin3(0xa97986), purple: lin3(0x83718b), turf: lin3(0x5d633b), tan: lin3(0xaca080),
        vivid: [0xa77959, 0x88708c, 0xa79864, 0x65878b, 0x9e717a, 0x648d80].map(function (h) { var c = lin(h); return [c.r, c.g, c.b]; }) };
      // Vertex colour carries only broad pigment washes. Fine crust boundaries
      // belong in the material: sampling them on a coarse rock mesh creates
      // conspicuous triangular patches as the detail level changes.
      var algae = health.algae, m = 0.88 + 0.24 * noise3(x * 0.3, y * 0.3, z * 0.3);
      var turfW = clamp((0.1 + 0.8 * algae) * smooth(0.3, 0.7, noise3(x * 0.45 + 4, y * 0.45, z * 0.45)) * (0.4 + 0.6 * up), 0, 0.95);
      var ccaW = (1 - algae * 0.8) * 0.25 * smooth(0.35, 0.78, noise3(x * 0.38 - 9, y * 0.38, z * 0.38 + 3)) * (1 - turfW);
      var purW = (1 - algae) * 0.14 * smooth(0.38, 0.8, noise3(x * 0.46 + 2, y * 0.46 - 5, z * 0.46)) * Math.max(0, 1 - turfW - ccaW);
      var tanW = 0.6 * smooth(0.4, 0.75, noise3(x * 0.5 + 9, y * 0.5, z * 0.5 - 4)) * Math.max(0, 1 - turfW - ccaW - purW);
      var vivW = (floor ? 0 : 0.13) * vitality * vitality * smooth(0.4, 0.78, noise3(x * 0.4 + 11, y * 0.4, z * 0.4)) * (1 - turfW), vc = CRUST.vivid[Math.floor(noise3(x * 0.24, y * 0.24, z * 0.24 + 8) * 6) % 6];
      var rest = Math.max(0, 1 - turfW - ccaW - purW - tanW - vivW);
      for (var c = 0; c < 3; c++) out[c] = CRUST.stone[c] * m * rest + CRUST.turf[c] * turfW + CRUST.cca[c] * ccaW + CRUST.purple[c] * purW + CRUST.tan[c] * tanW * m + vc[c] * vivW;
      return out;
    }
    function buildFloor() {
      var step = high ? 0.5 : 1.0, xs = gridAxis(-31, 31, step, -80, 80, 1.18), zs = gridAxis(-31, 31, step, -80, 80, 1.18);
      var nx = xs.length, nz = zs.length, n = nx * nz, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), gr = new Float32Array(n * 2), idx = [], i, j;
      var algae = health.algae, rgb = [0, 0, 0];
      SANDC = lin3(0xcac1a7); RUBC = lin3(0xb1aa97);
      for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) {
        var x = xs[i], z = zs[j], k = j * nx + i, sand = terrain.sandMask(x, z), rub = terrain.rubbleMask(x, z);
        pos[k * 3] = x; pos[k * 3 + 1] = terrain.floorY(x, z); pos[k * 3 + 2] = z;
        var n1 = noise2(x * 0.35 + 3.1, z * 0.35 - 1.7), n2 = noise2(x * 1.7, z * 1.7 + 5.5);
        crustColor(x, pos[k * 3 + 1], z, 1, rgb, true);
        for (var c = 0; c < 3; c++) {
          var turf = CRUST.turf[c], sandC = SANDC[c] * (0.95 + 0.08 * n2), rubC = RUBC[c] * (0.85 + 0.25 * n2) * (1 - 0.35 * algae * n1) + turf * 0.35 * algae * n1;
          rgb[c] = lerp(lerp(rgb[c], sandC, sand), rubC, rub);
        }
        col[k * 3] = rgb[0]; col[k * 3 + 1] = rgb[1]; col[k * 3 + 2] = rgb[2]; gr[k * 2] = sand; gr[k * 2 + 1] = rub;
      }
      for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a = j * nx + i, cc = a + nx; idx.push(a, cc, a + 1, a + 1, cc, cc + 1); }
      var g = own(new T.BufferGeometry());
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('reefGround', new T.BufferAttribute(gr, 2));
      g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
      floorMesh = new T.Mesh(g, mats.floor); floorMesh.name = 'reef-explore-floor'; floorMesh.receiveShadow = true; scene.add(floorMesh);
    }
    function buildBommieMesh() {
      var b = new Builder(), w = {};
      bommies.forEach(function (bm) {
        // Spend detail on the large exposed shoulders; small knolls need fewer
        // vertices. Total rock geometry stays below the previous uniform grid.
        var large = bm.r >= 1.65, rings = high ? (large ? 14 : 8) : (large ? 9 : 6), segs = high ? (large ? 34 : 22) : (large ? 20 : 14);
        var first = b.count(), k, s;
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
      bommieMesh = new T.Mesh(g, mats.rock); bommieMesh.name = 'reef-explore-bommies'; bommieMesh.castShadow = high; bommieMesh.receiveShadow = true; scene.add(bommieMesh);
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
      if ((beh === 'pair' || beh === 'clown') && o.index % 2 === 1 && members.length) {
        var lead = members[members.length - 1]; o.leader = lead; o.home = lead.home.clone(); o.ground = lead.ground; o.anchor = lead.anchor; return;
      }
      if (beh === 'clown') {
        var an = anemones.length ? anemones[Math.floor(o.index / 2) % anemones.length] : null;
        if (an) { o.anchor = an; o.ground = an.top; o.home = new T.Vector3(an.x, an.top + 0.14, an.z); return; }
        zone = 'bommie';
      }
      if (beh === 'cleaner') zone = info.group === 'fish' ? 'station' : 'stationBase';
      if (beh === 'moray') { var mo = crevice.mouth; o.home = new T.Vector3(mo.x, mo.y, mo.z); o.ground = mo.y; o.yaw = bearingTo(mo.nx, mo.nz); o.viewDir = { x: mo.nx, z: mo.nz }; return; }
      if (beh === 'manta') { o.anchor = station; o.ground = station.top; o.home = new T.Vector3(station.x, station.top + 2.4, station.z); return; }
      if (beh === 'cruise') { var hx = -18 + 36 * d[0]; o.ground = terrain.floorY(hx, 21); o.home = new T.Vector3(hx, o.ground + 1.6, 21); return; }
      var best = null, bestScore = -Infinity, sessile = beh === 'fixed' || beh === 'den' || beh === 'ray' || beh === 'cleaner' && info.group !== 'fish';
      for (k = 0; k < 8; k++) {
        var c = candidate(zone, d[k * 3], d[k * 3 + 1], d[k * 3 + 2], info);
        if (!c || Math.abs(c.x) > 27.5 || Math.abs(c.z) > 27.5) continue;
        var depth = -c.y, score = c.score;
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
      if (beh === 'wander' || beh === 'pair' || beh === 'roam') {
        a = clamp((beh === 'roam' ? 5 : 1.2) + 3 * L, 1.2, 9) * (0.7 + 0.6 * d[28]); b = a * (0.55 + 0.35 * d[30]);
        sp = clamp(0.2 + 0.45 * L, 0.15, 0.85) * (0.8 + 0.4 * d[30]);
        o.path = loopPath(h.x, h.y, h.z, a, b, o.yaw, sp / ((a + b) / 2), o.phase, o.dir, 0.3, 0.22);
      } else if (beh === 'school') {
        var small = L < 0.15; a = (small ? 1.2 : 3.5) + (small ? 1.5 : 5) * d[28]; b = a * (0.5 + 0.3 * d[30]);
        sp = (small ? 0.25 : 0.45) + 0.25 * d[30];
        o.path = loopPath(h.x, h.y, h.z, a, b, o.yaw, sp / ((a + b) / 2), o.phase, o.dir, 0.4, 0.12);
        o.pathPeriod = TAU * ((a + b) / 2) / sp; o.bank = 0.08;
        o.clear = Math.max(o.clear, (o.radius || 0.5) * 0.7 + 0.3);
      } else if (beh === 'hover' || beh === 'cleaner') {
        var hp = loopPath(h.x, h.y, h.z, 0.25 + 0.35 * d[28], 0.2 + 0.2 * d[30], o.yaw, 0.15 + 0.15 * d[30], o.phase, o.dir, 0.12, 0.1), base = o.yaw, ph = o.phase;
        o.path = hp; o.sweep = function (t) { return base + 0.8 * Math.sin(0.17 * t + ph) + 0.3 * Math.sin(0.41 * t + ph * 2); };
        o.clear = 0.12 + 0.3 * Math.min(L, 1); o.bank = 0.025;
      } else if (beh === 'clown') {
        var an = o.anchor, cx = h.x, cz = h.z, top = an ? an.top : h.y - 0.14, rr = 0.16 + 0.12 * d[28], ph2 = o.phase + (o.leader ? Math.PI * 0.8 : 0);
        o.path = function (t, out) { var th = ph2 + 0.9 * t; out.x = cx + rr * Math.cos(th) + 0.06 * Math.sin(3.1 * th); out.z = cz + rr * Math.sin(th) + 0.05 * Math.cos(2.3 * th); out.y = top + 0.12 + 0.07 * Math.sin(1.7 * th + ph2); return out; };
        o.clear = 0.05; o.bank = 0.055;
      } else if (beh === 'turtle') {
        a = 6 + 6 * d[28]; b = a * (0.6 + 0.25 * d[30]); var tp = loopPath(h.x, 0, h.z, a, b, o.yaw, 0.3 / ((a + b) / 2), o.phase, o.dir, 0, 0.15), tph = o.phase;
        // Keep the cruise height continuous. The clearance planner below
        // anticipates tall colonies without stepping through their grid tops.
        o.path = function (t, out) { tp(t, out); var th = tph + 0.3 / ((a + b) / 2) * t; out.y = terrain.floorY(out.x, out.z) + 0.65 + 2.2 * (0.5 + 0.5 * Math.sin(1.5 * th + tph)); return out; };
        o.clear = 0.35;
      } else if (beh === 'manta') {
        var st = o.anchor, mx = st.x + Math.cos(o.yaw) * st.r * 0.6, mz = st.z + Math.sin(o.yaw) * st.r * 0.6, ma = 8.5, mb = 6.5, mw = 0.75 / 7.5, mph = o.phase, mrot = o.yaw;
        var mp = loopPath(mx, 0, mz, ma, mb, mrot, mw, mph, o.dir, 0, 0.08);
        o.path = function (t, out) { mp(t, out); out.y = st.top + 2.4 + 0.7 * Math.sin(2 * (mph + mw * t)); return out; };
        o.clear = 1.2; o.bank = 0.35;
      } else if (beh === 'cruise') {
        var sx = 18 + 3 * d[28], sz = 4.5 + 1.5 * d[30], sph = o.phase, sw = 0.85 / ((sx + sz) / 2), sdir = o.dir;
        o.path = function (t, out) { var th = sph + sdir * sw * t; out.x = sx * Math.cos(th); out.z = 21 + sz * Math.sin(th); out.y = terrain.floorY(out.x, out.z) + 1.4 + 0.5 * Math.sin(3 * th); return out; };
        o.clear = 0.8; o.bank = 0.2;
      } else o.path = null;
    }
    // Reef3DSpecies coral health: 'healthy', 'bleached' or 'dead' (algae-covered); other groups are always 'healthy'.
    function coralState(o) {
      if (o.info.group !== 'coral' || o.restoration) return 'healthy';
      var r = o.draws[31], dead = 0.45 * health.algae * (1 - 0.5 * health.coralCover);
      return r < health.bleaching ? 'bleached' : r < health.bleaching + dead ? 'dead' : 'healthy';
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
      var box = new T.Box3().setFromObject(root);
      // r128's Box3 omits instance transforms. Include every school member so
      // surface clearance is based on the entire shoal, not a single fish.
      var instance = new T.Matrix4(), world = new T.Matrix4(), part = new T.Box3();
      root.traverse(function (mesh) {
        if (!mesh.isInstancedMesh) return;
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
      if (o.normal) { var n = up.clone().lerp(o.normal, 0.45).normalize(); out.setFromUnitVectors(up, n).multiply(qy); } else out.copy(qy);
      return out;
    }
    function register(o) {
      organisms.push(o); byUid[o.uid] = o;
      if (o.root) o.root.traverse(function (c) { owner.set(c, o); });
    }
    function isMobile(o) { var b = o.behavior; return !(b === 'fixed' || b === 'moray' || b === 'den' || b === 'ray' || (b === 'cleaner' && o.info.group !== 'fish')); }
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
      if (high && o.radius > 0.35) root.traverse(function (c) { if (c.isMesh) c.castShadow = true; });
      o.path = null;
      if (isMobile(o)) setupMotion(o);
      // Reef3DSpecies says where a model's origin is (info().origin); placeholders are placed by their bounds.
      var origin = model.placeholder ? null : o.info.origin;
      if (o.behavior === 'moray') {
        var mo = crevice.mouth, out = origin === 'crevice' ? 0 : Math.max(0.1, box.max.x * o.scale - 0.35 * o.info.lengthM * o.scale);
        root.position.set(mo.x - mo.nx * out, mo.y, mo.z - mo.nz * out); root.rotation.set(0, yawFor(o.yaw), origin === 'crevice' ? 0 : 0.12);
      } else if (!o.path) {
        restQuaternion(o, root.quaternion);
        root.position.set(o.home.x, o.ground - (origin === 'base' ? 0 : box.min.y * o.scale) - 0.02, o.home.z);
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
          restQuaternion(o, q); pv.set(o.home.x, o.ground - lift * o.scale - 0.02, o.home.z); sv.setScalar(o.scale);
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
    // How far an organism stays drawn: small animals vanish into the haze sooner; the governor shortens it.
    function drawDistance(o) { return Math.min(cullDist, 8 + o.radius * 30) * (0.5 + 0.5 * gov.scale); }
    function refreshGroups(cx, cy, cz, cosHalf) {
      groups.forEach(function (g) {
        var n = 0, k, q, m;
        for (k = 0; k < g.members.length; k++) {
          var o = g.members[k], dx = o.center.x - cx, dy = o.center.y - cy, dz = o.center.z - cz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d - o.radius > drawDistance(o)) continue;
          if (d > o.radius + 1.5 && dx * camFwd.x + dy * camFwd.y + dz * camFwd.z < cosHalf * d - o.radius) continue;
          for (m = 0; m < g.meshes.length; m++) { var dst = g.meshes[m].instanceMatrix.array, src = g.all[m]; for (q = 0; q < 16; q++) dst[n * 16 + q] = src[k * 16 + q]; }
          n++;
        }
        g.meshes.forEach(function (mesh) {
          mesh.count = n; mesh.visible = n > 0;
          mesh.instanceMatrix.updateRange.offset = 0; mesh.instanceMatrix.updateRange.count = Math.max(16, n * 16); mesh.instanceMatrix.needsUpdate = true;
        });
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
      if (restoration) placeRestoration(resUids);
      entries.slice().sort(function (a, b) { return pass(a) - pass(b) || a.order - b.order; }).forEach(function (e) {
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
        else members.forEach(function (o) { attachObject(o, makeModel(e.id, info, o, o.school)); });
        members.forEach(function (o) {
          if (!o.path && o.center) {
            block(o.center.x, o.center.z, o.radius * 0.85 + 0.2);
            var top = o.center.y + (o.boxMaxY - (o.boxMinY + o.boxMaxY) / 2) * o.scale;
            if (top - o.ground > 0.3) stampTop(o.center.x, o.center.z, o.radius * 0.7, top);
          }
          if (e.id === 'magnificent_anemone' && o.center) anemones.push({ x: o.center.x, z: o.center.z, top: o.ground + (o.boxMaxY - o.boxMinY) * o.scale * 0.85 });
        });
      });
      organisms.sort(function (a, b) { return a.serial - b.serial; });
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
      return out;
    }
    function poseMobile(o, dt, init) {
      var p = mobilePoint(o, worldTime, tmpA), q = mobilePoint(o, worldTime + 0.3, tmpB), root = o.root;
      var floor = groundTop(p.x, p.z) + o.clear, nowLift = Math.max(0, floor - p.y);
      // Start climbing before a ledge and settle slowly on its far side. Keep
      // the current footprint clear even at a sharp coral-grid boundary.
      var target = Math.max(nowLift, groundTop(q.x, q.z) + o.clear - q.y);
      for (var lead = 1; lead <= 7; lead++) {
        var ahead = mobilePoint(o, worldTime + lead * 0.6, aheadPoint);
        target = Math.max(target, groundTop(ahead.x, ahead.z) + o.clear - ahead.y - lead * 0.06);
      }
      if (init) o.lift = target;
      else o.lift = Math.max(nowLift, o.lift + (target - o.lift) * damp(target > o.lift ? 2.8 : 1.1, dt));
      var dx = q.x - p.x, dz = q.z - p.z, horiz = Math.hypot(dx, dz), rawBear = o.sweep ? o.sweep(worldTime) : horiz > 1e-5 ? bearingTo(dx, dz) : (o.bearingNow || o.yaw);
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

    // ---- Decorative reef (non-pickable; seeded, draw counts fixed per slot) -------
    function buildDecor() {
      var lists = {}, rd = stream(seed, 201), rbm = stream(seed, 202), rg = stream(seed, 203), g1 = rg() * 40, g2 = rg() * 40, current = rg() * Math.PI;
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
      var cover = health.coralCover, bleach = health.bleaching, algae = health.algae, deadShare = 0.55 * algae * (1 - 0.5 * cover);
      function cols(list, boost) { return list.map(function (hex) { var c = lin(hex); return [Math.min(1.4, c.r * boost), Math.min(1.4, c.g * boost), Math.min(1.4, c.b * boost)]; }); }
      // Neighbouring colonies share a hue family; fish and growth tips remain the brightest accents.
      var VIVID = cols([0xc98564, 0xd1ab71, 0xbd857e, 0xba7188, 0x9478a8, 0x8274a2, 0x7099a5, 0x629d93, 0x80a385, 0x9eaa79, 0xb5b17a, 0xc2a173], 1.18);
      var NATURAL = cols([0xa07c54, 0x8b9160, 0xa3916d, 0xaf9163, 0x7d926e, 0xa58979, 0x967b57], 1.22), DEAD = cols([0x6a6a3c, 0x5c5a34, 0x7a7244], 1.2);
      var SOFT = cols([0xc27f9b, 0xd2926d, 0xb6af72, 0xa58db5, 0xce8588, 0xd7a2af], 1.15), FAN = cols([0xb85069, 0xc68a50, 0x946d9b, 0xb3a05b], 1.2), SPONGE = cols([0xc4774b, 0x8b6b9c, 0xb5a166, 0x5c87a0, 0xac6663], 1.2);
      var WHITE = [1.05, 1.03, 0.98], RUBBLE = [0.95, 0.93, 0.88];
      function pick(list, roll) { return list[Math.floor(roll * list.length) % list.length]; }
      function pastel(c) { return [lerp(c[0], WHITE[0], 0.65), lerp(c[1], WHITE[1], 0.65), lerp(c[2], WHITE[2], 0.65)]; }
      // Related colonies share an irregular neighbourhood. The nearest seeded
      // nursery centre gives each thicket its own habit and pigment, while the
      // broader colour field keeps adjacent thickets in the same reef palette.
      // Hashes are independent of the fixed placement streams on both tiers.
      function colonyPatch(x, z) {
        var cellSize = 3.15, ix = Math.floor(x / cellSize), iz = Math.floor(z / cellSize), best = Infinity, p;
        for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
          var cx = ix + dx, cz = iz + dz, id = hash2(cx + seed * 0.37, cz - seed * 0.19);
          var px = (cx + 0.18 + 0.64 * id) * cellSize, pz = (cz + 0.18 + 0.64 * hash2(cx + 53.7, cz + seed * 0.61)) * cellSize;
          // Colonies share broad, irregular ribbons along the prevailing current,
          // rather than circular patches repeated over the seabed.
          var flow = current + (id - 0.5) * 0.65, dxp = x - px, dzp = z - pz;
          var along = dxp * Math.cos(flow) + dzp * Math.sin(flow), across = -dxp * Math.sin(flow) + dzp * Math.cos(flow);
          var distance = Math.hypot(along / 1.18, across / 0.86);
          if (distance < best) { best = distance; p = { x: px, z: pz, id: id, distance: distance, habit: hash2(cx - 31.2, cz + seed * 0.43) }; }
        }
        return p;
      }
      function coralColor(c1, c2, x, z) {
        var p = colonyPatch(x, z), colony = noise2(p.x * 0.14 + g1, p.z * 0.14 + g2);
        var hue = (Math.floor(colony * 19) + (p.id > 0.72 ? 1 : 0)) % VIVID.length / VIVID.length;
        if (c1 < bleach) return c2 < 0.6 ? WHITE : pastel(pick(VIVID, hue));
        if (c1 < bleach + deadShare) return pick(DEAD, c2);
        // Blend pigments within a family instead of alternating unrelated pink,
        // green and brown heads in the same colony. A little individual shade
        // variation retains the living texture of a densely intergrown crown.
        var vivid = pick(VIVID, hue), natural = pick(NATURAL, colony), mix = 0.35 + p.id * 0.5, shade = 0.9 + 0.2 * c2;
        return [lerp(natural[0], vivid[0], mix) * shade, lerp(natural[1], vivid[1], mix) * shade, lerp(natural[2], vivid[2], mix) * shade];
      }
      function lifeColor(list, c1, c2) { return c1 < bleach * 0.7 ? pastel(pick(list, c2)) : pick(list, c2); }
      function coralKind(depth, f) {
        if (depth < 6.5) return f < 0.18 ? 'plate' : f < 0.38 ? 'corym' : f < 0.58 ? 'finger' : f < 0.86 ? 'massive' : 'encrust';
        if (depth < 12) return f < 0.28 ? 'antler' : f < 0.42 ? 'finger' : f < 0.56 ? 'corym' : f < 0.8 ? 'massive' : f < 0.88 ? 'plate' : 'encrust';
        return f < 0.12 ? 'antler' : f < 0.22 ? 'finger' : f < 0.5 ? 'massive' : f < 0.78 ? 'plate' : 'encrust';
      }
      function growthHabit(depth, roll, patch, edge, slope) {
        var kind = coralKind(depth, roll);
        // Each neighbourhood has a recognizable canopy, but its growing margin
        // carries recruits and low crusts. Plate gardens now occur as actual
        // shelves, alongside branching, knobby and massive coral communities.
        if (roll < 0.7) kind = ['antler', 'corym', 'plate', 'massive', 'finger', 'plate'][Math.floor(patch.habit * 6)];
        if (edge > 0.7 && roll > 0.46 && roll < 0.72) kind = 'encrust';
        if (slope > 0.75 && kind === 'antler') kind = 'plate';
        if (depth < 6.5 && kind === 'antler') kind = 'corym';
        return kind;
      }
      function add(kind, x, y, z, yaw, sx, sy, sz, color, tx, tz, tier) {
        var tall = DECOR_H[kind] * sy > 0.42;
        // Obstacles never depend on the tier, so the diver and fish move the same on both.
        if (tall) stampTop(x, z, 0.38 * Math.max(sx, sz), y + DECOR_H[kind] * sy * 0.9);
        if (!high && !tall && tier > 0.5) return;
        (lists[kind] = lists[kind] || []).push([x, y, z, yaw, sx, sy, sz, color, tx || 0, tz || 0]);
      }
      var cell = 0.66, pCoral = 0.1 + 0.88 * cover, pAlgae = 0.03 + 0.5 * algae, pRubble = 0.02 + 0.18 * (1 - cover) * (0.35 + bleach);
      var pSoft = 0.03 + 0.12 * vitality, pFan = 0.05 + 0.07 * vitality, pSponge = 0.05, pRock = 0.05;
      for (var gx = -31.5; gx <= 31.5; gx += cell) for (var gz = -31.5; gz <= 31.5; gz += cell) {
        var jx = rd(), jz = rd(), kr = rd(), fr = rd(), sr = rd(), yr = rd(), c1 = rd(), c2 = rd(), keep = rd(), tier = rd();
        var x = gx + (jx - 0.5) * cell * 0.9, z = gz + (jz - 0.5) * cell * 0.9;
        var colonyField = colonyPatch(x, z), gather = 0.26 * (1 - terrain.sandMask(x, z)) * (1 - terrain.rubbleMask(x, z));
        // Pull the same number of crowns into loose interlocking thickets, with
        // little channels between them. Recheck all exclusions after the move.
        x += (colonyField.x - x) * gather; z += (colonyField.z - z) * gather;
        if (isBlocked(x, z)) continue;
        var y = terrain.floorY(x, z), depth = -y;
        if (!substrateClear(x, z, y)) continue;
        var sand = terrain.sandMask(x, z), rub = terrain.rubbleMask(x, z), reef = (1 - sand) * (1 - rub), yaw = yr * TAU;
        // Broad gardens contain smaller thickets, with young colonies at their
        // edges and mature crowns in their centres; the sand channel stays open.
        var garden = noise2(x * 0.13 + g1, z * 0.13 + g2), patchy = smooth(0.24, 0.74, garden * 0.72 + noise2(x * 0.43 + g2, z * 0.43 - g1) * 0.28);
        // A few mature crowns rise above a wider apron of juveniles. Stretch
        // their footprints independently so neighbouring heads knit together
        // without turning every colony into the same circular mound.
        var core = 1 - smooth(0.3, 1.85, colonyField.distance), maturity = clamp(sr * 0.83 + core * 0.24, 0, 1);
        var s = (0.46 + 1.48 * maturity * maturity) * (0.92 + 0.28 * patchy);
        if (rub > 0.45) {
          var rec = restoration ? 0.05 + 0.45 * growth : 0.04, rubP = 0.8 - (restoration ? 0.5 * growth : 0);
          if (kr < rec) { var rs = (restoration ? 0.3 + 0.6 * growth : 0.35) * (0.7 + 0.6 * sr); add(fr < 0.35 ? 'finger' : fr < 0.6 ? 'corym' : fr < 0.85 ? 'massive' : 'encrust', x, y - 0.01, z, yaw, rs, rs, rs, coralColor(c1, c2, x, z), 0, 0, tier); }
          else if (kr < rec + rubP) { var rbs = 0.9 + 0.5 * sr; add('rubble', x, y + 0.005, z, yaw, rbs, rbs, rbs, RUBBLE, 0, 0, tier); }
          continue;
        }
        if (reef < 0.4) {
          if (kr < 0.02) add('rubble', x, y + 0.005, z, yaw, 0.8, 0.8, 0.8, RUBBLE, 0, 0, tier);
          else if (kr < 0.03) add('rock', x, y - 0.03, z, yaw, s * 0.6, s * 0.45, s * 0.6, [0.9, 0.88, 0.84], 0, 0, tier);
          continue;
        }
        // Encrusting growth stitches the gaps between taller colonies. These
        // shallow pads use an existing instanced mesh, disappear with the near
        // understory, and never turn a sand channel into another coral garden.
        // A spatial hash keeps the ten placement-stream draws per slot intact.
        if (patchy > 0.28 && reef > 0.64 && hash2(gx * 17 + seed, gz * 19) < cover * (0.2 + 0.32 * patchy)) {
          var ua = (c2 * 17.37 % 1) * TAU, ur = 0.2 + 0.17 * jx, ux = x + Math.cos(ua) * ur, uz = z + Math.sin(ua) * ur, uy = terrain.floorY(ux, uz);
          if (!isBlocked(ux, uz) && substrateClear(ux, uz, uy) && terrain.sandMask(ux, uz) < 0.25 && terrain.rubbleMask(ux, uz) < 0.25) {
            var us = (0.84 + 0.8 * c2) * (0.8 + 0.4 * patchy);
            var unx = -(terrain.floorY(ux + 0.15, uz) - terrain.floorY(ux - 0.15, uz)) / 0.3, unz = -(terrain.floorY(ux, uz + 0.15) - terrain.floorY(ux, uz - 0.15)) / 0.3;
            add('encrust', ux, uy - 0.008, uz, current + (ua - Math.PI) * 0.32, us * 1.3, 0.31 + 0.2 * jz, us * 0.86, coralColor(c1, c2, ux, uz), unx, unz, tier);
          }
        }
        if (keep > (0.34 + 0.88 * patchy) * reef) continue;
        var slope = smooth(-8, 0, z), acc = 0, pc = pCoral * (0.62 + 0.56 * patchy), pf = depth > 6 ? pFan * (0.45 + 0.55 * slope) : 0;
        var ps = pSoft * (0.8 + 0.5 * (1 - garden)), pp = pSponge * (0.7 + 0.6 * garden);
        // Normalize a full habitat mixture: in a healthy thicket the old coral
        // threshold could exceed one, silently starving the moving soft corals,
        // fans and sponges that should still live among its hard coral crowns.
        var habitatRoll = kr * Math.max(1, pc + ps + pf + pp + pAlgae + pRock + pRubble);
        if (habitatRoll < (acc += pc)) {
          var floorNx = -(terrain.floorY(x + 0.16, z) - terrain.floorY(x - 0.16, z)) / 0.32, floorNz = -(terrain.floorY(x, z + 0.16) - terrain.floorY(x, z - 0.16)) / 0.32;
          var kind = patchy > 0.35 ? growthHabit(depth, fr, colonyField, 1 - core, Math.hypot(floorNx, floorNz)) : coralKind(depth, fr);
          var big = kind === 'massive' && sr > 0.91 ? 1.12 : 1;
          var spread = kind === 'encrust' ? 1.34 : kind === 'plate' ? 1.22 + 0.22 * patchy : 1.1 + 0.24 * patchy;
          var height = kind === 'plate' ? 0.66 + 0.3 * core : kind === 'encrust' ? 0.55 : 0.8 + 0.3 * jx;
          var anchor = kind === 'massive' || kind === 'encrust' ? 0.7 : 0.28;
          add(kind, x, y - 0.025 * s, z, yaw, s * big * spread * (0.88 + 0.28 * jx), s * big * height, s * big * spread * (1.02 - 0.18 * jx), coralColor(c1, c2, x, z), clamp(floorNx, -0.85, 0.85) * anchor + (jz - 0.5) * 0.12, clamp(floorNz, -0.85, 0.85) * anchor + (jx - 0.5) * 0.12, tier);
        } else if (habitatRoll < (acc += ps)) add('soft', x, y - 0.02, z, yaw, s, s * (0.8 + 0.4 * jx), s * (0.82 + 0.25 * jz), lifeColor(SOFT, c1, c2), 0, 0, tier);
        else if (habitatRoll < (acc += pf)) add('fan', x, y - 0.03, z, current + (yr - 0.5) * 0.85, 0.7 + 0.75 * sr, 0.72 + 0.76 * sr, 0.8 + 0.6 * sr, lifeColor(FAN, c1, c2), 0, 0, tier);
        else if (habitatRoll < (acc += pp)) add('sponge', x, y - 0.02, z, yaw, s, s * (0.8 + 0.6 * jx), s, pick(SPONGE, c2), 0, 0, tier);
        else if (habitatRoll < (acc += pAlgae)) add('algae', x, y, z, yaw, s * 1.2, s * (1 + 0.5 * jz), s * 1.2, [1, 1, 1], 0, 0, tier);
        else if (habitatRoll < (acc += pRock)) add('rock', x, y - 0.04, z, yaw, s * 0.7, s * (0.45 + 0.4 * jx), s * 0.7, [0.95, 0.93, 0.9], 0, 0, tier);
        else if (habitatRoll < (acc += pRubble)) add('rubble', x, y + 0.005, z, yaw, 0.8 + 0.4 * s, 0.8 + 0.4 * s, 0.8 + 0.4 * s, RUBBLE, 0, 0, tier);
      }
      // Coral heads crowd the bommie tops; walls carry sponges and soft corals.
      bommies.forEach(function (bm) {
        var slots = Math.max(9, Math.round(bm.r * bm.r * 7.2)), w = {};
        for (var k = 0; k < slots; k++) {
          var u = rbm(), v = rbm(), kr2 = rbm(), fr2 = rbm(), sr2 = rbm(), c12 = rbm(), c22 = rbm(), keep2 = rbm(), tier2 = rbm();
          var a = k * 2.39996323 + u * 0.55, e = bm.edge(a) * 0.96 * Math.sqrt((k + 0.2 + 0.6 * v) / slots), lx = Math.cos(a) * e, lz = Math.sin(a) * e; bm.toWorld(lx, lz, w);
          var y2 = bm.heightLocal(lx, lz);
          if (!(y2 > NONE) || isBlocked(w.x, w.z)) continue;
          var hx1 = bm.heightAt(w.x + 0.12, w.z), hx0 = bm.heightAt(w.x - 0.12, w.z), hz1 = bm.heightAt(w.x, w.z + 0.12), hz0 = bm.heightAt(w.x, w.z - 0.12);
          var nx = hx1 > NONE && hx0 > NONE ? -(hx1 - hx0) / 0.24 : 0, nz = hz1 > NONE && hz0 > NONE ? -(hz1 - hz0) / 0.24 : 0, steep = Math.hypot(nx, nz) > 1.6;
          var s2 = (0.55 + 1.25 * sr2 * sr2) * clamp(0.6 + bm.r * 0.25, 0.75, 1.15), yaw2 = fr2 * 43.7 % TAU, tx = clamp(nx, -1.2, 1.2) * 0.55, tz = clamp(nz, -1.2, 1.2) * 0.55, d2 = -y2;
          var shoulder = colonyPatch(w.x, w.z), shoulderKind = growthHabit(d2, fr2, shoulder, smooth(0.3, 1.85, shoulder.distance), Math.hypot(nx, nz));
          // Shallow ledges support outward-spreading plates; crest colonies
          // retain their height and leave the limestone relief readable.
          var ledge = !steep && Math.hypot(nx, nz) > 0.5;
          if (ledge && kr2 > 0.26 && kr2 < 0.62) shoulderKind = 'plate';
          // Compact cushions can follow a curved shoulder without bridging its
          // surface like a flat sheet. Sink each foot along the actual normal;
          // their rounded crowns remain proud of the limestone.
          var crustScale = clamp(s2 * 0.72, 0.5, 1.04), crustNx = clamp(nx, -2.8, 2.8), crustNz = clamp(nz, -2.8, 2.8);
          var crustInset = (0.03 + crustScale * 0.018) / Math.hypot(crustNx, 1, crustNz), crustX = w.x - crustNx * crustInset, crustY = y2 - crustInset, crustZ = w.z - crustNz * crustInset;
          if (keep2 < cover * 0.55 && kr2 > 0.5) add('encrust', crustX, crustY, crustZ, yaw2 + 0.6, crustScale, 1.15 + 0.35 * sr2, crustScale * 0.92, coralColor(c12, c22, w.x, w.z), crustNx, crustNz, tier2);
          if (keep2 > (0.2 + 0.84 * cover) * (steep ? 0.72 : 1)) { if (kr2 < pAlgae * 1.6) add('algae', w.x, y2, w.z, yaw2, s2 * 1.2, s2, s2 * 1.2, [1, 1, 1], tx, tz, tier2); continue; }
          // Low cushions cling to the steeper faces; horizontal crowns belong
          // on the tops. Keep the silhouettes of the underlying ledges.
          if (steep && kr2 < 0.5) add('encrust', crustX, crustY, crustZ, yaw2, crustScale * 1.08, 1.3 + 0.4 * sr2, crustScale, coralColor(c12, c22, w.x, w.z), crustNx, crustNz, tier2);
          else if (kr2 < 0.62) {
            var shelf = shoulderKind === 'plate', cushion = shoulderKind === 'encrust';
            add(shoulderKind, w.x, y2 - 0.04, w.z, yaw2, s2 * (shelf ? 1.32 : 1 + 0.22 * u), s2 * (shelf ? 0.76 : cushion ? 0.65 : 0.82 + 0.3 * sr2), s2 * (shelf ? 1.17 : 1.15 - 0.15 * u), coralColor(c12, c22, w.x, w.z), shelf ? tx * 0.4 : tx, shelf ? tz * 0.4 : tz, tier2);
          } else if (kr2 < 0.7) add('soft', w.x, y2 - 0.03, w.z, yaw2, s2, s2, s2, lifeColor(SOFT, c12, c22), tx, tz, tier2);
          else if (kr2 < 0.76) add('fan', w.x, y2 - 0.035, w.z, current + (fr2 - 0.5) * 0.65, s2 * 0.75, s2 * 0.8, s2 * 0.75, lifeColor(FAN, c12, c22), tx * 0.45, tz * 0.45, tier2);
          else if (kr2 < 0.84) add('sponge', w.x, y2 - 0.03, w.z, yaw2, s2, s2, s2, pick(SPONGE, c22), tx, tz, tier2);
          else if (kr2 < 0.9) add('encrust', crustX, crustY, crustZ, yaw2, crustScale * 1.12, 1.25 + 0.35 * sr2, crustScale, coralColor(c12, c22, w.x, w.z), crustNx, crustNz, tier2);
          else if (kr2 < 0.9 + pAlgae * 0.4) add('algae', w.x, y2, w.z, yaw2, s2 * 1.2, s2, s2 * 1.2, [1, 1, 1], tx, tz, tier2);
        }
      });
      // The moray's crevice: a dark recess under two overhanging ledges.
      var mo = crevice.mouth, tang = Math.atan2(mo.nz, mo.nx);
      add('rock', mo.x - mo.nx * 0.12, mo.y - 0.25, mo.z - mo.nz * 0.12, 0, 0.9, 0.9, 0.9, [0.14, 0.13, 0.12], 0, 0, 0);
      add('rock', mo.x + mo.nx * 0.2, mo.y + 0.32, mo.z + mo.nz * 0.2, -tang, 1.6, 0.55, 1.1, [0.8, 0.76, 0.7], 0, 0, 0);
      add('rock', mo.x + mo.nx * 0.1 + mo.nz * 0.55, mo.y - 0.05, mo.z + mo.nz * 0.1 - mo.nx * 0.55, -tang + 0.6, 0.9, 0.8, 0.8, [0.78, 0.74, 0.68], 0, 0, 0);
      var sides = high ? 5 : 4, rockPalette = { stone: lin(0x857b6c), turf: lin(0x5c5338), cca: lin(0xb48a98), turfAmount: 0.3 + 0.6 * algae, ccaAmount: 1 - 0.6 * algae };
      var algaeTint = { base: lin(0x4b5a22), tip: lin(0xa7b04a) };
      // Distant stand-ins: a few dozen triangles each, coloured by the instance.
      function proxy(parts, plant) {
        var b = new Builder(); if (plant) b.useExtra('reefBladePhase');
        parts.forEach(function (p) { b.absorb(T, p[0], p[1], function (x, y, z, nx, ny, nz, rgb) { rgb[0] = rgb[1] = rgb[2] = 0.68 + 0.26 * ny; }); });
        return b.build(T, false);
      }
      function S(x, y, z, sx, sy, sz, ry) { return new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new T.Vector3(sx, sy, sz)); }
      function dome() { return new T.SphereGeometry(1, 7, 3, 0, TAU, 0, Math.PI / 2); }
      var KINDS = {
        finger: [function () { return buildBranching(T, 0.35, 0.45, 0, sides, high); }, mats.coral, function () { return buildBranching(T, 0.35, 0.45, 0, 3, false, true); }],
        antler: [function () { return buildBranching(T, 0.4, 0.5, 1, sides, high); }, mats.coral, function () { return buildBranching(T, 0.4, 0.5, 1, 3, false, true); }],
        corym: [function () { return buildBranching(T, 0.38, 0.42, 2, sides, high); }, mats.coral, function () { return buildBranching(T, 0.38, 0.42, 2, 3, false, true); }],
        massive: [function () { return buildMassive(T, 0.4, 0.42, 3, high); }, mats.brain, function () { return proxy([[new T.SphereGeometry(1, 9, 4, 0, TAU, 0, Math.PI / 2), S(0, -0.02, 0, 0.4, 0.44, 0.4)]]); }],
        plate: [function () { return buildPlate(T, 0.45, 0.4, 5, high); }, mats.coral, function () { return proxy([[new T.CylinderGeometry(0.42, 0.36, 0.06, 10), S(0, 0.28, 0, 1, 1, 1)], [new T.CylinderGeometry(0.05, 0.07, 0.26, 5), S(0, 0.13, 0, 1, 1, 1)]]); }],
        encrust: [function () { return buildEncrusting(T, 0.4, 0.08, 2, high); }, mats.coral, function () { return proxy([[new T.CylinderGeometry(0.34, 0.38, 0.07, 9), S(0, 0.02, 0, 1, 1, 1)]]); }],
        soft: [function () { return buildSoftCoral(T, 0.25, 0.45, 3, high); }, mats.soft, function () { return proxy([[dome(), S(0, 0.08, 0, 0.27, 0.42, 0.27)]], true); }],
        fan: [function () { return buildFan(T, 0.5, 0.85, 2, high); }, mats.fan, function () { return buildFan(T, 0.5, 0.85, 2, false, true); }],
        sponge: [function () { return buildSponge(T, 0.18, 0.42, 4, sides); }, mats.sponge, function () { return proxy([[new T.CylinderGeometry(0.1, 0.08, 0.4, 6), S(0, 0.2, 0, 1, 1, 1)]]); }],
        algae: [function () { return buildAlgae(T, 0.18, 0.2, 2, high, algaeTint); }, mats.algae, null],
        rubble: [function () { return buildRubble(T, 0.3, 13, rockPalette); }, mats.rock, null],
        rock: [function () { return buildRock(T, 0.4, 7, high, rockPalette); }, mats.rock, function () { return proxy([[new T.IcosahedronGeometry(0.4, 0), S(0, 0.08, 0, 1, 0.6, 1)]]); }]
      };
      // Spend extra branches and corallites where they can be seen. The middle
      // distance keeps complete colony silhouettes using low-tier geometry;
      // a dense landscape need not trade its whole horizon for tiny branchlets.
      var MIDDLE = high ? {
        finger: function () { return buildBranching(T, 0.35, 0.45, 0, 4, false); },
        antler: function () { return buildBranching(T, 0.4, 0.5, 1, 4, false); },
        corym: function () { return buildBranching(T, 0.38, 0.42, 2, 4, false); },
        massive: function () { return buildMassive(T, 0.4, 0.42, 3, false); },
        plate: function () { return buildPlate(T, 0.45, 0.4, 5, false); },
        encrust: function () { return buildEncrusting(T, 0.4, 0.08, 2, false); },
        soft: function () { return buildSoftCoral(T, 0.25, 0.45, 3, false); },
        fan: function () { return buildFan(T, 0.5, 0.85, 2, false); }
      } : {};
      var mtx = new T.Matrix4(), qt = new T.Quaternion(), qy = new T.Quaternion(), pv = new T.Vector3(), sv = new T.Vector3(), nv = new T.Vector3(), up = new T.Vector3(0, 1, 0), color = new T.Color();
      function lodMesh(geometry, material, n, kind, lod) {
        var mesh = new T.InstancedMesh(geometry, material, n);
        mesh.setColorAt(0, color.setRGB(1, 1, 1));
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.instanceColor.setUsage(T.DynamicDrawUsage);
        mesh.count = 0; mesh.frustumCulled = false; mesh.receiveShadow = high;
        mesh.name = 'reef-explore-decor-' + kind + (lod === 'near' ? '' : '-' + lod); mesh.userData = { decorative: true, kind: kind, lod: lod, instances: n };
        scene.add(mesh); decorMeshes.push(mesh);
        return mesh;
      }
      Object.keys(KINDS).forEach(function (kind) {
        var list = lists[kind];
        if (!list || !list.length) return;
        var geometry = own(KINDS[kind][0]()), reach = geometry.boundingSphere.radius + geometry.boundingSphere.center.length(), n = list.length;
        var dk = { kind: kind, n: n, m: new Float32Array(n * 16), c: new Float32Array(n * 3), p: new Float32Array(n * 4), maxD: DECOR_H[kind] < 0.3 ? smallFar : farDist };
        list.forEach(function (it, k) {
          nv.set(it[8], 1, it[9]).normalize(); qt.setFromUnitVectors(up, nv); qy.setFromAxisAngle(up, it[3]); qt.multiply(qy);
          pv.set(it[0], it[1], it[2]); sv.set(it[4], it[5], it[6]);
          mtx.compose(pv, qt, sv).toArray(dk.m, k * 16);
          dk.c[k * 3] = it[7][0]; dk.c[k * 3 + 1] = it[7][1]; dk.c[k * 3 + 2] = it[7][2];
          dk.p[k * 4] = it[0]; dk.p[k * 4 + 1] = it[1] + DECOR_H[kind] * it[5] * 0.5; dk.p[k * 4 + 2] = it[2]; dk.p[k * 4 + 3] = reach * Math.max(it[4], it[5], it[6]);
        });
        dk.near = lodMesh(geometry, KINDS[kind][1], n, kind, 'near');
        dk.mid = MIDDLE[kind] ? lodMesh(own(MIDDLE[kind]()), KINDS[kind][1], n, kind, 'mid') : null;
        dk.far = KINDS[kind][2] ? lodMesh(own(KINDS[kind][2]()), KINDS[kind][1], n, kind, 'far') : null;
        decorKinds.push(dk);
      });
      // A single soft contact layer anchors the foreground colonies, including
      // on the low tier where real-time shadow maps are deliberately disabled.
      // Elevated bommie colonies are skipped so no shade is projected through rock.
      var contact = new Builder(), segments = 12;
      contact.useExtra('reefContactWeight');
      Object.keys(lists).forEach(function (kind) {
        if (DECOR_H[kind] < 0.3 || kind === 'fan') return;
        lists[kind].forEach(function (it) {
          var x = it[0], z = it[2], baseY = terrain.floorY(x, z);
          if (it[1] > baseY + 0.2) return;
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
      if (contact.count()) {
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
      }
    }
    // Fill the near and far instance buffers with what lies within reach of the
    // camera and inside a widened view cone; skipped while the camera holds still.
    var camFwd = new T.Vector3(), decorCam = { x: NaN, y: 0, z: 0, fx: 0, fy: 0, fz: 0, aspect: 0 };
    function refreshDecor(force) {
      camera.getWorldDirection(camFwd);
      var cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      var moved = Math.hypot(cx - decorCam.x, cy - decorCam.y, cz - decorCam.z), facing = camFwd.x * decorCam.fx + camFwd.y * decorCam.fy + camFwd.z * decorCam.fz;
      if (!force && moved < 0.75 && facing > 0.985 && decorCam.aspect === camera.aspect) return;
      decorCam = { x: cx, y: cy, z: cz, fx: camFwd.x, fy: camFwd.y, fz: camFwd.z, aspect: camera.aspect };
      var half = Math.min(Math.PI * 0.95, Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.hypot(1, camera.aspect)) + 0.45), cosHalf = Math.cos(half);
      refreshGroups(cx, cy, cz, cosHalf);
      decorKinds.forEach(function (dk) {
        var P = dk.p, M = dk.m, C = dk.c, nearN = 0, midN = 0, farN = 0, nearD = nearDist * gov.scale, maxD = dk.maxD * (0.64 + 0.36 * gov.scale), na = dk.near.instanceMatrix.array, nc = dk.near.instanceColor.array;
        var ma = dk.mid ? dk.mid.instanceMatrix.array : null, mc = dk.mid ? dk.mid.instanceColor.array : null;
        var fa = dk.far ? dk.far.instanceMatrix.array : null, fc = dk.far ? dk.far.instanceColor.array : null, q;
        for (var k = 0; k < dk.n; k++) {
          var dx = P[k * 4] - cx, dy = P[k * 4 + 1] - cy, dz = P[k * 4 + 2] - cz, r = P[k * 4 + 3], d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d - r > maxD) continue;
          if (d > r + 1.5 && dx * camFwd.x + dy * camFwd.y + dz * camFwd.z < cosHalf * d - r) continue;
          if (d - r < nearD * (ma ? 0.64 : 1) || !fa) { for (q = 0; q < 16; q++) na[nearN * 16 + q] = M[k * 16 + q]; nc[nearN * 3] = C[k * 3]; nc[nearN * 3 + 1] = C[k * 3 + 1]; nc[nearN * 3 + 2] = C[k * 3 + 2]; nearN++; }
          else if (ma && d - r < nearD) { for (q = 0; q < 16; q++) ma[midN * 16 + q] = M[k * 16 + q]; mc[midN * 3] = C[k * 3]; mc[midN * 3 + 1] = C[k * 3 + 1]; mc[midN * 3 + 2] = C[k * 3 + 2]; midN++; }
          else { for (q = 0; q < 16; q++) fa[farN * 16 + q] = M[k * 16 + q]; fc[farN * 3] = C[k * 3]; fc[farN * 3 + 1] = C[k * 3 + 1]; fc[farN * 3 + 2] = C[k * 3 + 2]; farN++; }
        }
        [[dk.near, nearN], [dk.mid, midN], [dk.far, farN]].forEach(function (pair) {
          var mesh = pair[0]; if (!mesh) return;
          mesh.count = pair[1]; mesh.visible = pair[1] > 0;
          mesh.instanceMatrix.updateRange.offset = 0; mesh.instanceMatrix.updateRange.count = Math.max(16, pair[1] * 16); mesh.instanceMatrix.needsUpdate = true;
          mesh.instanceColor.updateRange.offset = 0; mesh.instanceColor.updateRange.count = Math.max(3, pair[1] * 3); mesh.instanceColor.needsUpdate = true;
        });
      });
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
        uniforms: { topColor: { value: topNear.clone() }, bottomColor: { value: fogNear.clone() }, sunDir: { value: sunDir }, reefCausticTime: U.time },
        vertexShader: 'varying vec3 vReefDir;void main(){vReefDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 sunDir;uniform float reefCausticTime;varying vec3 vReefDir;void main(){vec3 d=normalize(vReefDir);' +
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
          'vec3 sunlight=vec3(1.0,0.97,0.85)*(sunHalo+sunDisc)*window;' +
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
          'vec3 reefSeaWarm=vec3(1.0,0.91,0.72)*(pow(reefSeaSun,72.0)*0.040+pow(reefSeaSun,1150.0)*0.37)*reefWindow;',
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
          parts.vCommon.push('varying vec2 vReefShaftUv;varying vec3 vReefShaftWorld;'); parts.vBegin.push('vReefShaftUv=uv;');
          parts.vProject.push('vReefShaftWorld=(modelMatrix*vec4(transformed,1.0)).xyz;'); parts.fCommon.push('varying vec2 vReefShaftUv;varying vec3 vReefShaftWorld;uniform float reefCausticTime;uniform vec3 reefWaterEye;'); shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefWaterEye = U.eye;
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
            'float reefBeamDepth=max(0.0,-vReefShaftWorld.y);',
            'float reefFall=smoothstep(0.0,0.28,vReefShaftUv.y)*(1.0-smoothstep(0.94,1.0,vReefShaftUv.y));',
            'vec3 reefBeamView=vReefShaftWorld-reefWaterEye;float reefBeamDistance=length(reefBeamView);',
            'float reefBeamFade=smoothstep(1.0,3.8,reefBeamDistance)*(1.0-smoothstep(11.5,16.5,reefBeamDistance));',
            'float reefAperture=0.78+0.14*sin(dot(reefBeamSurface,vec2(1.21,0.48))+0.65*reefBeamWave+reefCausticTime*0.08)+0.08*sin(dot(reefBeamSurface,vec2(-0.57,1.83))-reefCausticTime*0.11);',
            // A forward scattering lobe makes rays strongest toward the sun,
            // with a quiet ambient component at the edges of the dive view.
            'float reefBeamCos=dot(reefBeamView/max(reefBeamDistance,0.001),reefBeamSun);',
            'float reefBeamPhase=0.40+0.60*pow(max(0.0,reefBeamCos),3.0);',
            'float reefBeamPath=1.0-exp(-reefBeamDistance*0.23);',
            'vec3 reefBeamTransmission=exp(-vec3(0.052,0.024,0.014)*reefBeamDepth);',
            'diffuseColor.rgb*=reefBeamTransmission;',
            'diffuseColor.a*=reefFeather*reefFall*reefBeamFade*reefAperture*reefBeamPhase*reefBeamPath;'
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
        shader.uniforms.reefSnowCenter = snowU.center; shader.uniforms.reefSnowBox = snowU.box; shader.uniforms.reefSnowTime = snowU.time; shader.uniforms.reefSnowTop = snowU.top;
        var parts = shaderParts();
        parts.vCommon.push('uniform vec3 reefWaterEye;uniform vec3 reefSnowCenter;uniform vec3 reefSnowBox;uniform float reefSnowTime;uniform float reefSnowTop;attribute vec3 reefSnowDrift;varying float vReefSnowDepth;varying float vReefSnowSeed;varying float vReefSnowGlow;varying float vReefSnowVeil;');
        parts.vBegin.push('vec3 reefSnowMin=reefSnowCenter-reefSnowBox*0.5;float reefSnowPhase=reefSnowTime*0.19-dot(position.xz,vec2(0.13,0.09));float reefSnowLift=reefSnowTime*0.13+dot(position.xz,vec2(0.08,-0.11));vec3 reefSnowSurge=vec3(-0.17*cos(reefSnowPhase),0.055*sin(reefSnowLift),-0.12*cos(reefSnowPhase+0.45));transformed=reefSnowMin+mod(position+reefSnowDrift*reefSnowTime+reefSnowSurge-reefSnowMin,reefSnowBox);if(transformed.y>reefSnowTop)transformed.y-=reefSnowBox.y;vec3 reefSnowEdge=reefSnowBox*0.5-abs(transformed-reefSnowCenter);float reefSnowEdgeFade=smoothstep(0.0,0.7,min(reefSnowEdge.x,min(reefSnowEdge.y,reefSnowEdge.z)));vReefSnowDepth=length(transformed-reefWaterEye);vReefSnowSeed=fract(position.x*0.37+position.y*0.61);vReefSnowGlow=pow(max(0.0,dot((transformed-reefWaterEye)/max(vReefSnowDepth,0.001),normalize(vec3(0.42,1.0,0.3)))),4.0);float reefSnowPulse=0.91+0.09*sin(reefSnowTime*(0.22+vReefSnowSeed*0.08)+vReefSnowSeed*6.283185);vReefSnowVeil=reefSnowEdgeFade*smoothstep(0.0,0.4,reefSnowTop-transformed.y)*exp(-max(-transformed.y-3.0,0.0)*0.024)*reefSnowPulse;');
        parts.fCommon.push('varying float vReefSnowDepth;varying float vReefSnowSeed;varying float vReefSnowGlow;varying float vReefSnowVeil;');
        parts.fColor.push('vec2 reefPc=gl_PointCoord*2.0-1.0;float reefSnowAngle=vReefSnowSeed*6.283185;reefPc=mat2(cos(reefSnowAngle),-sin(reefSnowAngle),sin(reefSnowAngle),cos(reefSnowAngle))*reefPc;reefPc.x*=mix(1.0,1.5,vReefSnowSeed);float reefPr=dot(reefPc,reefPc);if(reefPr>1.0)discard;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.82,0.92,0.86),vReefSnowGlow*0.24);diffuseColor.a*=pow(1.0-reefPr,1.8)*smoothstep(0.65,1.8,vReefSnowDepth)*(1.0-smoothstep(4.8,7.5,vReefSnowDepth))*mix(0.22,0.78,vReefSnowSeed)*(0.72+vReefSnowGlow*0.58)*vReefSnowVeil;');
        applyParts(shader, parts, 'snow');
        shader.vertexShader = inject(shader.vertexShader, '#include <logdepthbuf_vertex>', 'gl_PointSize*=0.36+0.95*vReefSnowSeed*vReefSnowSeed*vReefSnowSeed;', 'snow-size');
      };
      pm.customProgramCacheKey = function () { return key('snow-parcel-v2'); };
      motes = new T.Points(g, pm); motes.frustumCulled = false; motes.name = 'reef-explore-motes'; motes.userData.decorative = true; motes.renderOrder = 4;
      motes.onBeforeRender = function (r, sc, cam) { U.eye.value.setFromMatrixPosition(cam.matrixWorld); snowU.center.value.copy(U.eye.value); };
      scene.add(motes);
    }
    function updateWater() {
      U.eye.value.setFromMatrixPosition(camera.matrixWorld);
      var depth = clamp(-camera.position.y, 0, 25);
      if (Math.abs(depth - lastWaterDepth) < 0.05) return;
      lastWaterDepth = depth;
      var k = waterDepth(depth), murk = 1 + 0.35 * health.algae;
      scene.fog.color.copy(fogNear).lerp(fogFar, k); scene.background.copy(scene.fog.color);
      U.extinction.value.set(0.065, 0.042, 0.030).multiplyScalar(murk);
      U.scatter.value.copy(scene.fog.color).convertSRGBToLinear();
      scene.fog.density = (0.027 + 0.0011 * depth) * murk * (high ? 1 : 1.1);
      backdrop.material.uniforms.topColor.value.copy(topNear).lerp(topFar, k); backdrop.material.uniforms.bottomColor.value.copy(scene.fog.color);
      // The water column cools gradually as the diver descends, on both quality tiers.
      hemi.color.setRGB(lerp(0.39, 0.17, k), lerp(0.69, 0.43, k), lerp(0.81, 0.65, k));
      hemi.groundColor.setRGB(lerp(0.20, 0.07, k), lerp(0.26, 0.14, k), lerp(0.22, 0.18, k)); hemi.intensity = 0.42 - 0.08 * k;
      sun.color.setRGB(lerp(1.0, 0.57, k), lerp(0.96, 0.82, k), lerp(0.84, 0.97, k)); sun.intensity = 1.27 - 0.28 * k;
    }

    // ---- Diver -----------------------------------------------------------------
    function buildDiver() {
      diver = new T.Group(); diver.name = 'reef-explore-diver'; diver.rotation.order = 'YZX';
      var suit = lin(0x263e4b), panel = lin(0x3f727b), teal = lin(0x65b8b3), rubber = lin(0x17252d), bcd = lin(0x293944), webbing = lin(0x111e26);
      var amber = lin(0xe2b347), finAmber = lin(0xe8b94f), alloy = lin(0xbac6c5), steel = lin(0x8caaa9), skin = lin(0xb58e72), seam = lin(0x536a72);
      var mat = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.035 }));
      var hardwareMat = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.52 }));
      var finMat = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.49, metalness: 0.02, side: T.DoubleSide }));
      var glass = own(new T.MeshStandardMaterial({ color: lin(0xa3e0dc), roughness: 0.12, metalness: 0.22, transparent: true, opacity: 0.48, depthWrite: false, side: T.DoubleSide }));
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
      diverBody = new T.Mesh(own(b.build(T, false)), mat); diverBody.name = 'reef-explore-diver-body'; diver.add(diverBody);
      var hardware = new T.Mesh(own(hw.build(T, false)), hardwareMat); hardware.name = 'reef-explore-diver-equipment'; diver.add(hardware);
      var glassMesh = new T.Mesh(own(lenses.build(T, false)), glass); glassMesh.name = 'reef-explore-diver-mask-lenses'; glassMesh.renderOrder = 2; diver.add(glassMesh);

      [-1, 1].forEach(function (s) {
        var sideName = s < 0 ? 'left' : 'right', hip = new T.Group(); hip.name = 'reef-explore-diver-hip-' + sideName; hip.position.set(-0.48, -0.02, s * 0.095); diver.add(hip);
        var thighB = new Builder();
        limb(thighB, [0, 0, 0], [-0.42, 0, 0], [0.085, 0.081, 0.059], suit);
        oval(thighB, -0.335, -0.006, 0, 0.104, 0.063, 0.065, rubber, 12);
        pipe(thighB, [[-0.015, 0.018, s * 0.079], [-0.14, 0.025, s * 0.086], [-0.27, 0.018, s * 0.071], [-0.345, 0.011, s * 0.059]], 0.009, panel, 8, 5);
        var thigh = new T.Mesh(own(thighB.build(T, false)), mat); thigh.name = 'reef-explore-diver-thigh'; hip.add(thigh);
        var knee = new T.Group(); knee.name = 'reef-explore-diver-knee-' + sideName; knee.position.set(-0.42, 0, 0); hip.add(knee);
        var shinB = new Builder(); limb(shinB, [0, 0, 0], [-0.4, 0, 0], [0.059, 0.064, 0.036], suit);
        pipe(shinB, [[-0.07, 0.018, s * 0.057], [-0.15, 0.021, s * 0.062], [-0.28, 0.01, s * 0.047], [-0.33, 0.007, s * 0.037]], 0.006, teal, 8, 5);
        var shin = new T.Mesh(own(shinB.build(T, false)), mat); shin.name = 'reef-explore-diver-shin'; knee.add(shin);
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
      diverPos.set(sp.x, Math.min(SURFACE_Y, groundTop(sp.x, sp.z) + 2.2), sp.z);
    }
    function currentInput() {
      return { forward: clamp(keys.forward - keys.back + ext.forward, -1, 1), turn: clamp(keys.right - keys.left + ext.turn, -1, 1), rise: clamp(keys.up - keys.down + ext.rise, -1, 1) };
    }
    function updateDiver(dt) {
      var input = currentInput(), active = Math.abs(input.forward) > 0.02 || Math.abs(input.turn) > 0.02 || Math.abs(input.rise) > 0.02, ease = reducedMotion ? 2.5 : 1;
      if (autopilot && active) { autopilot = null; notify(true); }
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
    }
    function constrainDiver(dt) {
      diverPos.x = clamp(diverPos.x, -HARD_EDGE, HARD_EDGE); diverPos.z = clamp(diverPos.z, -HARD_EDGE, HARD_EDGE);
      var ahead = Math.max(0, speed) * 1.2, top = Math.max(groundTop(diverPos.x, diverPos.z), groundTop(diverPos.x + fwdX(bearing) * ahead, diverPos.z + fwdZ(bearing) * ahead) - 0.1);
      var minY = top + DIVER_CLEAR;
      if (diverPos.y < minY) { diverPos.y += (minY - diverPos.y) * damp(reducedMotion ? 10 : 5, dt); if (vy < 0) vy *= 0.5; }
      var hard = Math.max(terrain.floorY(diverPos.x, diverPos.z) + DIVER_FLOOR, groundTop(diverPos.x, diverPos.z) + DIVER_CLEAR * 0.5);
      if (diverPos.y < hard) diverPos.y = hard;
      if (diverPos.y > SURFACE_Y) { diverPos.y = SURFACE_Y; if (vy > 0) vy = 0; }
    }
    function viewDistance(o) { return clamp(0.9 + o.radius * 2.2, 1.4, 5); }
    function spotFor(ap, out) {
      var c = ap.o.center, D = ap.D;
      out.x = clamp(c.x + ap.dirX * D, -HARD_EDGE + 0.5, HARD_EDGE - 0.5); out.z = clamp(c.z + ap.dirZ * D, -HARD_EDGE + 0.5, HARD_EDGE - 0.5);
      out.y = Math.min(SURFACE_Y, Math.max(c.y + 0.25 + 0.2 * D, groundTop(out.x, out.z) + DIVER_CLEAR));
      return out;
    }
    function startAutopilot(o) {
      var dx = diverPos.x - o.center.x, dz = diverPos.z - o.center.z, d = Math.hypot(dx, dz);
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
      var face = bearingTo(ap.o.center.x - diverPos.x, ap.o.center.z - diverPos.z);
      bearing = wrapAngle(ap.fromBearing + wrapAngle(face - ap.fromBearing) * smooth(0, 0.7, u));
      if (u >= 1) {
        bearing = face; speed = 0; vy = 0; turnRate = 0; autopilot = null;
        // Swing the third-person camera to a rear quarter so the diver does not hide what it came to see.
        var side = 1, best = Infinity;
        [1, -1].forEach(function (sgn) { var yw = face + 0.62 * sgn, top = groundTop(diverPos.x - fwdX(yw) * camDist, diverPos.z - fwdZ(yw) * camDist); if (top < best) { best = top; side = sgn; } });
        look.yaw = view === 'third' ? 0.62 * side : 0; look.pitch = view === 'third' ? 0.06 : 0;
        // Small animals get a closer camera (the wheel or a pinch still changes it).
        camDist = clamp(1.9 + ap.o.radius * 3.5, 2.2, 6.5);
        notify(true);
      }
    }

    // ---- Camera ---------------------------------------------------------------------------
    function updateLens() {
      // Preserve peripheral vision on a portrait screen. This changes only on
      // resize/view selection; breathing never zooms or distorts the reef.
      camera.fov = view === 'first' ? clamp(2 * Math.atan(Math.tan(27 * Math.PI / 180) / camera.aspect) * 180 / Math.PI, 60, 82) : 60;
      camera.updateProjectionMatrix();
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
        if (fo && !autopilot && fo.center.distanceTo(diverPos) < 7) lookAt.lerp(fo.center, 0.45);
        camTarget.lerp(lookAt, snap ? 1 : damp(reducedMotion ? 12 : 8, dt));
        camera.position.copy(camPos); camera.lookAt(camTarget);
      } else {
        headW.copy(HEAD).applyMatrix4(diver.matrixWorld);
        headW.x += Math.cos(yaw) * eyeMotion.sway + fwdX(yaw) * eyeMotion.surge;
        headW.y += eyeMotion.heave;
        headW.z += Math.sin(yaw) * eyeMotion.sway + fwdZ(yaw) * eyeMotion.surge;
        yaw += eyeMotion.yaw;
        var p = clamp(-0.12 + look.pitch + bodyPitch * 0.5 + eyeMotion.pitch, -1.2, 1.2);
        camera.position.copy(headW); camPos.copy(headW);
        lookAt.set(headW.x + fwdX(yaw) * Math.cos(p), headW.y + Math.sin(p), headW.z + fwdZ(yaw) * Math.cos(p)); camTarget.copy(lookAt);
        camera.lookAt(lookAt); camera.rotateZ(eyeMotion.roll);
      }
      if (mask && mask.material.uniforms.breath) mask.material.uniforms.breath.value = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(visualTime * TAU / 4.2);
      camera.updateMatrixWorld();
    }

    // ---- Culling, organisms, focus ring -----------------------------------------------------
    function updateWorld(dt) {
      organisms.forEach(function (o) {
        if (o.path && !paused) poseMobile(o, dt, false);
        if (!o.instanced && o.root) {
          // Small animals vanish into the haze sooner than big ones.
          var visible = camera.position.distanceTo(o.center) - o.radius < drawDistance(o);
          o.root.visible = visible;
          if (visible && !paused) {
            if (!o.path) currentAt(o.root.position.x, o.root.position.z, worldTime, o.motion.current);
            try { o.model.update(dt * (reducedMotion ? 0.45 : 1), worldTime, o.motion); } catch (error) { warn('Reef3DExplore: update failed for ' + o.speciesId); o.model.update = function () {}; }
          }
        }
      });
      if (!paused) { currentAt(0, 0, worldTime, ambientMotion.current); protos.forEach(function (p) { try { p.update(dt, worldTime, ambientMotion); } catch (ignore) { p.update = function () {}; } }); }
      refreshDecor(false);
      shafts.forEach(function (s) {
        // Wrap around the eye projected back to the surface along the sun.
        // Every opening remains fixed in the world; even a tilted beam has
        // faded completely before its forty-metre tile can be recycled.
        var beamAxis = sun.userData.dir;
        var eyeSurfaceX = camera.position.x - camera.position.y * beamAxis.x / beamAxis.y, eyeSurfaceZ = camera.position.z - camera.position.y * beamAxis.z / beamAxis.y;
        var wx = eyeSurfaceX - 20 + (((s.bx - eyeSurfaceX + 20) % 40) + 40) % 40, wz = eyeSurfaceZ - 20 + (((s.bz - eyeSurfaceZ + 20) % 40) + 40) % 40;
        s.mesh.position.x = wx - beamAxis.x * 12; s.mesh.position.z = wz - beamAxis.z * 12;
        s.mesh.material.opacity = s.base * (reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(visualTime * 0.17 + s.phase));
      });
      surface.position.set(camera.position.x, 0, camera.position.z);
      U.time.value = reducedMotion ? 4 + visualTime * 0.2 : 4 + visualTime; snowU.time.value = reducedMotion ? visualTime * 0.3 : visualTime;
      plantMotions.forEach(function (m) { var t = visualTime; m.value.x = t * 0.35; m.value.y = (t * (reducedMotion ? 0.4 : 1.15)) % TAU; m.value.w = m.amount * (reducedMotion ? 0.35 : 1); });
      if (sun) {
        var c = diverPos, dir = sun.userData.dir;
        sun.target.position.set(Math.round(c.x), Math.round(c.y), Math.round(c.z)); sun.position.copy(sun.target.position).addScaledVector(dir, 30); sun.target.updateMatrixWorld();
      }
      var f = focusedUid ? byUid[focusedUid] : null;
      focusRing.visible = !!f;
      if (f) {
        var r = f.radius * 1.15 + 0.12; focusRing.position.copy(f.center); focusRing.scale.set(r, r, r); focusRing.quaternion.copy(camera.quaternion);
        focusRing.material.uniforms.opacity.value = reducedMotion ? 0.85 : 0.72 + 0.2 * Math.sin(visualTime * 2.6);
      }
    }

    // ---- State ------------------------------------------------------------------------------
    function updateFrustum() { camera.updateMatrixWorld(); projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projScreen); }
    function surfaceDistance(o) { return Math.max(0, o.center.distanceTo(diverPos) - o.radius); }
    function nearbyList(limitM) {
      if (disposed) return [];
      updateFrustum();
      var out = [], kinds = {}, res = [], lim = limitM || NEAR_M;
      organisms.forEach(function (o) {
        var d = surfaceDistance(o); if (d > lim) return;
        out.push({ o: o, d: d, inView: frustum.intersectsSphere(sphere.set(o.center, Math.max(o.radius, 0.05))) });
      });
      out.sort(function (a, b) { return a.d - b.d || a.o.serial - b.o.serial; });
      // A restoration patch counts once per structure kind, so its units never crowd out animals.
      for (var i = 0; i < out.length && res.length < (limitM ? 24 : NEARBY_MAX); i++) {
        if (out[i].o.restoration) { if (kinds[out[i].o.speciesId]) continue; kinds[out[i].o.speciesId] = 1; }
        res.push(out[i]);
      }
      return res;
    }
    function snapshot() {
      var info = renderer && renderer.info && renderer.info.render, near = nearbyList(), f = focusedUid && byUid[focusedUid];
      return {
        ready: !disposed && !contextLost, paused: paused, view: view, quality: quality, reducedMotion: reducedMotion,
        diver: { x: r2(diverPos.x), y: r2(diverPos.y), z: r2(diverPos.z), depthM: r1(-diverPos.y), headingDeg: (Math.round(bearing * 180 / Math.PI) % 360 + 360) % 360 },
        nearby: near.map(function (n) { return { uid: n.o.uid, speciesId: n.o.speciesId, distanceM: r1(n.d), inView: n.inView }; }),
        focused: f ? { uid: f.uid, speciesId: f.speciesId, distanceM: r1(surfaceDistance(f)) } : null,
        frames: frames, drawCalls: info ? info.calls : 0, triangles: info ? info.triangles : 0
      };
    }
    function stateKey(s) {
      return [s.ready, s.paused, s.view, s.quality, s.focused ? s.focused.uid + ':' + Math.round(s.focused.distanceM * 2) : '-', s.nearby.map(function (n) { return n.uid + (n.inView ? '+' : '-'); }).join(','),
        Math.round(s.diver.x), Math.round(s.diver.z), Math.round(s.diver.depthM * 2), Math.round(s.diver.headingDeg / 15)].join('|');
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
      if (disposed || contextLost || raf || hidden()) return;
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
      var info = renderer && renderer.info && renderer.info.render;
      if (!info || ++gov.frames < 10) return;
      gov.frames = 0;
      var over = Math.max((info.triangles || 0) / TRI_BUDGET, (info.calls || 0) / CALL_BUDGET), next = gov.scale;
      if (over > 1) next = Math.max(0.45, gov.scale * (over > 1.3 ? 0.8 : 0.92));
      else if (over < 0.75) next = Math.min(1, gov.scale + 0.04);
      if (next !== gov.scale) { gov.scale = next; refreshDecor(true); }
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

    // ---- Controller ---------------------------------------------------------------------------
    function focus(uid) {
      if (disposed || uid === null || uid === undefined || !byUid[uid]) return false;
      if (focusedUid !== uid) { focusedUid = uid; notify(true); }
      refresh(); return true;
    }
    function clearFocus() { if (disposed) return; if (focusedUid !== null) { focusedUid = null; notify(true); } refresh(); }
    function candidates() {
      var near = nearbyList(), front = near.filter(function (n) { return n.inView; }), list = front.length ? front : near;
      if (!list.length) list = nearbyList(20).slice(0, 6);
      return list.map(function (n) { return n.o.uid; });
    }
    function cycleFocus(step) {
      if (disposed) return null;
      var t = now();
      if (t - cycle.at > 4000 || !focusedUid || cycle.list.indexOf(focusedUid) < 0) cycle.list = candidates();
      cycle.at = t;
      var list = cycle.list; if (!list.length) return null;
      var i = focusedUid ? list.indexOf(focusedUid) : -1, next = i < 0 ? list[0] : list[(i + step + list.length) % list.length];
      focus(next); return next;
    }
    function swimTo(uid) {
      if (disposed) return false;
      var o = byUid[uid]; if (!o) return false;
      focus(uid); startAutopilot(o); notify(true); refresh(); return true;
    }
    function setView(v) {
      if (disposed || (v !== 'third' && v !== 'first')) return;
      view = v; diver.visible = v === 'third'; mask.visible = v === 'first'; look.pitch = 0;
      updateLens(); animateDiver(0); updateCamera(0, true); notify(true); refresh();
    }
    function setPaused(value) { if (disposed) return; paused = !!value; lastStamp = null; settle = 0; notify(true); refresh(); }
    function setInput(input) {
      if (disposed) return;
      if (!input) { ext.forward = ext.turn = ext.rise = 0; return; }
      ['forward', 'turn', 'rise'].forEach(function (k) { if (input[k] !== undefined) ext[k] = clamp(num(input[k], 0), -1, 1); });
      if ((ext.forward || ext.turn || ext.rise) && autopilot) autopilot = null;
      refresh();
    }
    function resize() {
      if (disposed || !renderer) return;
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.clientWidth, height: canvas.clientHeight };
      var w = Math.max(1, Math.round(rect.width || 0)), h = Math.max(1, Math.round(rect.height || 0));
      if (w === canvasW && h === canvasH) return;
      canvasW = w; canvasH = h; renderer.setSize(w, h, false); camera.aspect = w / h; updateLens();
      if (mask) mask.material.uniforms.aspect.value = w / h;
      refresh();
    }
    controller = {
      setView: setView, setPaused: setPaused, setInput: setInput, focusNext: function () { return cycleFocus(1); }, focusPrevious: function () { return cycleFocus(-1); },
      focus: focus, clearFocus: clearFocus, swimTo: swimTo, getState: snapshot, resize: resize, dispose: dispose
    };

    // ---- Picking ---------------------------------------------------------------------------------
    function pick(clientX, clientY) {
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
      if (held) { keys[held] = 1; if (autopilot) autopilot = null; refresh(); }
      else if (k === ' ' || k === 'spacebar') { if (!event.repeat) setPaused(!paused); }
      else if (k === 'n') { if (!event.repeat) cycleFocus(event.shiftKey ? -1 : 1); }
      else if (k === 'enter') { if (!focusedUid) return; if (!event.repeat) swimTo(focusedUid); }
      else { if (k === 'escape' && autopilot) { autopilot = null; notify(true); } return; }
      if (event.preventDefault) event.preventDefault();
    });
    listen(canvas, 'keyup', function (event) { var held = HELD[String(event.key || '').toLowerCase()]; if (held) keys[held] = 0; });
    listen(canvas, 'blur', function () { clearKeys(); pointers.clear(); pinch = 0; press = null; dragging = false; });
    function pid(event) { return event.pointerId !== undefined && event.pointerId !== null ? event.pointerId : 1; }
    function lookBy(dx, dy) {
      look.yaw += dx * 0.005; look.pitch = clamp(look.pitch + (view === 'third' ? dy : -dy) * 0.004, view === 'third' ? -0.6 : -1.0, view === 'third' ? 0.9 : 1.0);
      if (view === 'first' || reducedMotion) updateCamera(0, true);
      refresh();
    }
    function zoomBy(amount) { if (view !== 'third') return; camDist = clamp(camDist * Math.exp(amount), 2.2, 9); refresh(); }
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
      contextLost = true; stopLoop(); pointers.clear(); clearKeys(); autopilot = null;
      reportError(new Error('The 3D reef dive lost its graphics context. Reopen the dive or use the 2D survey.'));
      notify(true);
    });
    listen(doc, 'visibilitychange', function () { lastStamp = null; if (hidden()) { stopLoop(); clearKeys(); } else refresh(); });
    if (typeof global.ResizeObserver === 'function') { resizeObserver = new global.ResizeObserver(function () { resize(); }); resizeObserver.observe(canvas); }
    else listen(global, 'resize', resize);

    canvas._reef3dExplore = controller;
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    if (canvas.style) canvas.style.touchAction = 'none';
    diver.visible = view === 'third';
    resize(); animateDiver(0); updateCamera(0, true); updateWater(); refreshDecor(true); updateWorld(0);
    renderer.render(scene, camera); frames++;
    notify(true); requestFrame();
    return controller;
  }

  global.Reef3DExplore = { version: '1.0.0', mount: mount };
})(window);
