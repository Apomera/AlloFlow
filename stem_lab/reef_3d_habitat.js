/* Reef3DHabitat 1.0.0: the shallow tropical reef (5-12 m) for the Coral Reef
 * Survey Lab 3D view. Rock, coral, plant-flex, sand, caustic, light-shaft and
 * water-surface shading is adapted from Cephalopod Lab's hunt reef
 * (stem_tool_cephalopodlab.js); the water column, caustics, polyps, substrate
 * and decorative forms follow Reef3DExplore, so the survey and the dive share
 * one ocean. Survey objects depend only on the layout: a colony that spans
 * neighbouring points grows as overlapping pieces, one per point. Decoration
 * draws from seeded streams whose draw counts never depend on the quality tier
 * or reduced motion, so neither can move anything.
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;
  var FORMS = ['branching', 'massive', 'plate', 'encrusting'];
  var CORAL = { hard_coral: true, bleached_coral: true, recently_dead_coral: true };
  var warnings = [];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fract(v) { return v - Math.floor(v); }
  function num(v, fallback) {
    if (v === null || v === undefined || v === '') return fallback;
    v = Number(v); return isFinite(v) ? v : fallback;
  }
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedValue(seed) {
    if (typeof seed === 'string') {
      var h = 2166136261;
      for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h | 0;
    }
    return Math.floor(num(seed, 1)) | 0;
  }
  // Each concern owns a stream, so skipping one effect never shifts another.
  function stream(seed, salt) {
    return mulberry32((Math.imul(seed ^ 0x5bd1e995, 0x9E3779B1) ^ Math.imul(salt + 1, 0x85EBCA77)) | 0);
  }
  // Layout-only variation (survey objects) uses a stateless integer hash.
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

  function normalizeLayout(layout) {
    layout = layout || {};
    var length = clamp(num(layout.lengthM, 20), 1, 200);
    var bg = layout.background || {};
    var points = (Array.isArray(layout.points) ? layout.points : []).map(function (p, i) {
      p = p || {};
      var category = typeof p.category === 'string' ? p.category : 'sand';
      var form = CORAL[category] ? (FORMS.indexOf(p.coralForm) >= 0 ? p.coralForm : 'massive') : null;
      // colony: neighbouring points on one colony (or one patch of rock, rubble,
      // sand or seaweed) share it; variant: the point's own small differences.
      var colony = num(p.colony, null), variant = num(p.variant, null);
      return { index: i, distanceM: clamp(num(p.distanceM, 0), 0, length), category: category, coralForm: form,
        colony: colony === null ? null : Math.floor(colony), variant: variant === null ? Math.floor(hash2(i, 977) * 1000) : Math.floor(variant) };
    });
    return {
      lengthM: length,
      beltHalfWidthM: clamp(num(layout.beltHalfWidthM, 2.5), 0.25, 20),
      depthM: clamp(num(layout.depthM, 8), 2, 40),
      points: points,
      background: {
        coralCover: clamp(num(bg.coralCover != null ? bg.coralCover : bg.density, 0.35), 0, 1),
        bleaching: clamp(num(bg.bleaching, 0), 0, 1),
        algae: clamp(num(bg.algae, 0.2), 0, 1)
      }
    };
  }

  // Seafloor height. The survey corridor (|z| below the belt edge) never uses
  // the seed, so survey objects sit at the same height for every seed.
  function createFloor(belt, seed) {
    var r = stream(seed, 101), p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU, p4 = r() * 40;
    var edge = belt + 0.6;
    return function (x, z) {
      var h = 0.045 * Math.sin(x * 0.42 + 0.6) * Math.cos(z * 0.37) + 0.02 * Math.sin(x * 1.13 - z * 0.71 + 1.3);
      var w = smooth(edge, edge + 7, Math.abs(z));
      if (w === 0) return h;
      var mounds = Math.sin(x * 0.19 + p1 + 0.8 * Math.sin(z * 0.15 + p2)) * Math.cos(z * 0.23 + p3);
      var knolls = noise2(x * 0.3 + p4, z * 0.3 - p4);
      // The reef rises toward its crest (-Z) and falls toward deeper sand (+Z).
      var shelves = noise2(x * 0.68 + p4, z * 0.68 - p4);
      return h + w * (0.24 * mounds + 0.58 * knolls + 0.12 * smooth(0.3, 0.7, shelves) - 0.29) + 1.5 * smooth(edge + 2, edge + 20, -z) - 1.1 * smooth(edge + 4, edge + 22, z);
    };
  }

  // ---- Geometry builder -----------------------------------------------------
  function Builder() { this.p = []; this.n = []; this.c = []; this.i = []; this.extra = null; this.caps = 3; }
  Builder.prototype.count = function () { return this.p.length / 3; };
  Builder.prototype.vertex = function (x, y, z, nx, ny, nz, r, g, b) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(r, g, b);
    if (this.extra) this.extra.data.push(this.extra.value);
    return this.p.length / 3 - 1;
  };
  Builder.prototype.useExtra = function (name) { this.extra = { name: name, data: [], value: 0 }; };
  // Copies a geometry through a matrix, writing RGB with tone(); the source is disposed.
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
  // A tapered branch along a cubic curve with a rounded growth tip. The frame is
  // transported along the curve (adapted from Cephalopod Lab's coral grow()).
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
  // r128 spheres duplicate the closing meridian and the pole rows; share their normals.
  function weldSphere(geometry, seg, rings, bothPoles) {
    var n = geometry.attributes.normal, cols = seg + 1, v = [0, 0, 0];
    function avg(list) {
      v[0] = v[1] = v[2] = 0;
      list.forEach(function (k) { v[0] += n.getX(k); v[1] += n.getY(k); v[2] += n.getZ(k); });
      var l = Math.hypot(v[0], v[1], v[2]) || 1;
      list.forEach(function (k) { n.setXYZ(k, v[0] / l, v[1] / l, v[2] / l); });
    }
    for (var row = 0; row <= rings; row++) avg([row * cols, row * cols + seg]);
    var poles = bothPoles ? [0, rings] : [0];
    poles.forEach(function (row) { var list = []; for (var k = 0; k < cols; k++) list.push(row * cols + k); avg(list); });
    n.needsUpdate = true;
  }
  function polar(T, rings, segs, point, skirt) {
    // Center vertex plus closed rings: no seam, so computed normals stay smooth.
    var b = new Builder(), rgb = [1, 1, 1], p;
    p = point(0, 0, rgb); b.vertex(p[0], p[1], p[2], 0, 1, 0, rgb[0], rgb[1], rgb[2]);
    for (var r = 1; r <= rings; r++) for (var s = 0; s < segs; s++) {
      p = point(r / rings, s / segs * TAU, rgb); b.vertex(p[0], p[1], p[2], 0, 1, 0, rgb[0], rgb[1], rgb[2]);
    }
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
  // Distance from a piece's centre to its rounded-box outline along angle a.
  // p 2 is an ellipse; larger p squares off a side that meets the next piece.
  function boxRadius(a, ax, az, pRight, pLeft) {
    var c = Math.abs(Math.cos(a)) / ax, s = Math.abs(Math.sin(a)) / az, p = Math.cos(a) >= 0 ? pRight : pLeft;
    return 1 / Math.max(1e-6, Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p));
  }

  // ---- Decorative forms (metres; base at y = 0), as in Reef3DExplore -----------
  function coralTone(H, tip) {
    tip = tip || [1, 1, 1];
    return function (t, cap, x, y, z, rgb) {
      var height = clamp(y / H, 0, 1), w = smooth(0.76, 1, t) + (cap ? 0.2 : 0), tissue = noise3(x / H * 9 + 3.1, y / H * 9, z / H * 9 - 2.7);
      var g = 0.6 + 0.22 * smooth(0.03, 0.82, height) + 0.1 * w + 0.045 * (tissue - 0.5);
      rgb[0] = g * (1 + (tip[0] - 1) * w); rgb[1] = g * (1 + (tip[1] - 1) * w); rgb[2] = g * (1 + (tip[2] - 1) * w);
    };
  }
  function V(T, x, y, z) { return new T.Vector3(x, y, z); }
  // Pale lilac to blue growing tips on decorative Acropora.
  var ACRO_TIP = [1.12, 1.14, 1.42];
  function buildBranching(T, R, H, variant, sides, detail) {
    var b = new Builder(), style = variant % 3, phase = variant * 1.71 + 0.4, tone = coralTone(H, style === 2 ? [1.25, 1.08, 1.06] : ACRO_TIP), steps = detail ? 4 : 2;
    b.caps = 2;
    var k, a, dx, dz, curve, tmp = new T.Vector3();
    if (style === 0) {
      var fingers = detail ? 14 : 8;
      for (k = 0; k < fingers; k++) {
        a = phase + k * 2.39996; dx = Math.cos(a); dz = Math.sin(a);
        var rr = R * 0.61 * Math.sqrt((k + 0.5) / fingers), top = H * (0.72 + 0.27 * ((k * 0.37 + variant * 0.11) % 1)) * (1 - 0.14 * rr / R), lean = R * (0.05 + 0.11 * ((k * 0.71) % 1)), bend = R * 0.11 * Math.sin(k * 1.8 + phase);
        curve = [V(T, dx * rr * 0.61, -0.01, dz * rr * 0.61), V(T, dx * rr * 0.88 - dz * bend, top * 0.27, dz * rr * 0.88 + dx * bend), V(T, dx * (rr + lean) + dz * bend * 0.35, top * 0.73, dz * (rr + lean) - dx * bend * 0.35), V(T, dx * (rr + lean * 0.78), top, dz * (rr + lean * 0.78))];
        b.tube(T, curve, R * (0.068 + 0.009 * (k % 3)), steps, sides, 0.5, tone);
        if (detail || k < 5) {
          var bud = bez(curve, 0.42 + 0.085 * (k % 3), new T.Vector3()), ba = a + (k % 4 < 2 ? 1.1 : -1.1), br = R * (0.2 + 0.04 * (k % 2)), by = Math.min(H * 0.97, top * (0.85 + 0.07 * (k % 3)));
          b.tube(T, [bud, V(T, bud.x + Math.cos(ba) * br * 0.66, bud.y + (by - bud.y) * 0.13, bud.z + Math.sin(ba) * br * 0.66), V(T, bud.x + Math.cos(ba) * br * 1.05, by - H * 0.13, bud.z + Math.sin(ba) * br * 1.05), V(T, bud.x + Math.cos(ba) * br, by, bud.z + Math.sin(ba) * br)], R * 0.049, 2, sides, 0.43, tone);
        }
      }
      b.absorb(T, new T.SphereGeometry(1, sides + 3, 4, 0, TAU, 0, Math.PI / 2), new T.Matrix4().makeScale(R * 0.62, H * 0.12, R * 0.62), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = rgb[1] = rgb[2] = 0.6; });
    } else if (style === 1) {
      var antlers = detail ? 6 : 5;
      for (k = 0; k < antlers; k++) {
        a = phase + k * 2.399963 + 0.3 * Math.sin(k * 2.1 + variant); dx = Math.cos(a); dz = Math.sin(a);
        var reach = R * (0.76 + 0.21 * ((k * 0.43 + 0.11) % 1)), endY = H * (0.69 + 0.29 * ((k * 0.61 + 0.3) % 1)), curl = R * 0.1 * Math.sin(k * 2.7 + phase);
        curve = [V(T, dx * R * (0.1 + 0.035 * (k % 3)), -0.01, dz * R * (0.1 + 0.035 * (k % 3))), V(T, dx * reach * 0.43 - dz * curl, H * 0.3, dz * reach * 0.43 + dx * curl), V(T, dx * reach * 1.03 - dz * curl * 0.4, endY * 0.72, dz * reach * 1.03 + dx * curl * 0.4), V(T, dx * reach, endY, dz * reach)];
        b.tube(T, curve, R * (0.069 + 0.007 * (k % 3)), steps, sides, 0.52, tone);
        for (var f = 0; f < (detail ? 2 : 1); f++) {
          var base = bez(curve, f ? 0.7 : 0.42, new T.Vector3()), fa = a + (f ? 0.92 : -0.96), fx = Math.cos(fa), fz = Math.sin(fa), len = R * (0.39 - 0.08 * f), rise = H * (0.39 - 0.065 * f);
          b.tube(T, [base, V(T, base.x + fx * len * 0.46, base.y + rise * 0.16, base.z + fz * len * 0.46), V(T, base.x + fx * len * 0.96, base.y + rise * 0.63, base.z + fz * len * 0.96), V(T, base.x + fx * len, Math.min(H * 0.97, base.y + rise), base.z + fz * len)], R * 0.044, 2, sides, 0.43, tone);
        }
      }
    } else {
      b.tube(T, [V(T, 0, -0.01, 0), V(T, 0, H * 0.15, 0), V(T, R * 0.02, H * 0.3, 0), V(T, 0, H * 0.42, 0)], R * 0.145, 2, sides, 0.2, tone);
      var twigs = detail ? 6 : 3, boughs = detail ? 6 : 5;
      for (k = 0; k < boughs; k++) {
        a = phase + k * TAU / boughs + 0.12 * Math.sin(k * 2.3 + phase); dx = Math.cos(a); dz = Math.sin(a);
        var span = R * (0.82 + 0.15 * ((k * 0.57) % 1)), bendY = H * 0.045 * Math.sin(k * 2.1 + phase);
        curve = [V(T, 0, H * 0.38, 0), V(T, dx * span * 0.3, H * 0.46 + bendY, dz * span * 0.3), V(T, dx * span * 0.8, H * 0.49 + bendY, dz * span * 0.8), V(T, dx * span, H * 0.63 + bendY, dz * span)];
        b.tube(T, curve, R * 0.061, 2, sides, 0.35, tone);
        for (var w = 0; w < twigs; w++) {
          var tt = 0.2 + w * (0.72 / Math.max(1, twigs - 1)), tb = bez(curve, tt, tmp).clone(), top2 = H * (0.82 + 0.16 * (((k + w) * 0.39) % 1));
          var spread = (w % 2 ? -1 : 1) * R * (0.12 + 0.06 * (1 - tt)), tx = tb.x + dx * R * 0.055 - dz * spread, tz = tb.z + dz * R * 0.055 + dx * spread;
          b.tube(T, [tb, V(T, lerp(tb.x, tx, 0.65), tb.y + (top2 - tb.y) * 0.2, lerp(tb.z, tz, 0.65)), V(T, tx + dx * R * 0.02, top2 - H * 0.1, tz + dz * R * 0.02), V(T, tx + dx * R * 0.012, top2, tz + dz * R * 0.012)], R * 0.036, detail ? 2 : 1, sides, 0.39, tone);
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
    var shelves = detail ? [[0.73, 0.31, 0.24, 0.09], [1, 0.52, -0.04, -0.015], [0.64, 0.76, -0.23, -0.13]] : [[1, 0.43, 0.02, 0], [0.66, 0.73, -0.21, -0.12]];
    shelves.forEach(function (shelf, layer) {
      var rad = R * shelf[0], top = H * shelf[1], ox = R * shelf[2], oz = R * shelf[3], phase = ph + layer * 1.9;
      function edge(a) { return rad * (0.89 + 0.07 * Math.sin(3 * a + phase) + (detail ? 0.027 * Math.sin(7 * a + 2 * phase) : 0.015 * Math.sin(2 * a - phase))); }
      function surfaceY(r, a) {
        var lip = smooth(0.32, 1, r), folds = Math.sin(a * 3 + phase) * 0.033 + (detail ? Math.sin(a * 7 - phase) * 0.009 : 0);
        return top - H * 0.105 * (1 - r * r) + H * 0.045 * r * r + rad * folds * lip + H * 0.035 * Math.sin(a + phase) * r;
      }
      var plate = new Builder(), tops = [], bottoms = [];
      function vertex(r, a, lower) {
        var e = edge(a) * r, x = ox + Math.cos(a) * e, z = oz + Math.sin(a) * e, y = surfaceY(r, a), growth = smooth(0.78, 1, r);
        y += lower ? -thick * (1.7 - 0.9 * r) : r === 1 ? -thick * 0.42 : thick * 0.12 * smooth(0.76, 0.94, r);
        var light = lower ? 0.6 + 0.12 * r : 0.69 + 0.16 * r + 0.16 * growth + 0.035 * (noise2(x / R * 8 + phase, z / R * 8) - 0.5);
        // The growing rim is paler, with a faint lilac to blue cast.
        return plate.vertex(x, y, z, 0, lower ? -1 : 1, 0, light * (1 + 0.06 * growth), light * (1 + 0.08 * growth), light * (1 + 0.22 * growth));
      }
      var centreTop = vertex(0, 0, false), centreBottom = vertex(0, 0, true);
      radii.forEach(function (r) {
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
      var supportY = surfaceY(0, 0) - thick * 1.4;
      b.tube(T, [V(T, 0, H * 0.025, 0), V(T, ox * 0.1, H * 0.08, oz * 0.1), V(T, ox * 0.8, supportY * 0.8, oz * 0.8), V(T, ox, supportY, oz)], R * 0.12, detail ? 3 : 2, detail ? 5 : 4, 0.3, coralTone(H));
    });
    return b.build(T, false);
  }
  function buildEncrusting(T, R, H, variant, detail) {
    var segs = detail ? 28 : 18, rings = detail ? 4 : 3, ph = variant * 0.91;
    var g = polar(T, rings, segs, function (r, a, rgb) {
      var edge = 0.89 + 0.055 * Math.sin(a * 3 + ph) + 0.027 * Math.sin(a * 5 - ph * 0.7) + 0.025 * Math.sin(a * 2 + ph);
      var e = R * edge * r, x = Math.cos(a) * e, z = Math.sin(a) * e;
      var lumps = noise2(x / R * 3.2 + ph, z / R * 3.2 - ph), rim = smooth(0.74, 1, r), fold = Math.sin(a * 3 + ph + r * 2) * r * r * (1 - r);
      var light = 0.72 + 0.13 * lumps + 0.11 * rim;
      rgb[0] = light; rgb[1] = light * (0.98 + 0.02 * rim); rgb[2] = light * (0.94 + 0.06 * rim);
      return [x, 0.002 + H * (0.075 + Math.pow(Math.max(0, 1 - r * r), 0.72) * (0.48 + 0.32 * lumps)) + H * 0.4 * fold, z];
    }, function (a, p, at, rgb) { rgb[0] = 0.63; rgb[1] = 0.62; rgb[2] = 0.59; return [p[at] * 0.97, -0.01, p[at + 2] * 0.97]; });
    var b = new Builder(), colors = g.attributes.color, index = 0;
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = colors.getX(index); rgb[1] = colors.getY(index); rgb[2] = colors.getZ(index++); });
    return b.build(T, false);
  }
  // Weathered reef rock with baked turf and pink crustose coralline patches
  // (shape adapted from shapeCLHuntReefRock / colorCLHuntReefRock).
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
  // Rubble: broken branch fragments with pale snapped ends, crusts and turf.
  function rubbleTone(palette, variant) {
    return function (x, y, z, nx, ny, nz, rgb) {
      var turfW = smooth(0.4, 0.66, noise3(x * 30 + variant, y * 30, z * 30)) * 0.7 * palette.turfAmount, pink = smooth(0.66, 0.82, noise3(x * 22, y * 22 + 5, z * 22)) * 0.55;
      var base = 0.44 + 0.14 * noise3(x * 60, y * 60, z * 60);
      rgb[0] = base * (1 - turfW) + palette.turf.r * turfW + (palette.cca.r - base) * pink;
      rgb[1] = base * 0.985 * (1 - turfW) + palette.turf.g * turfW + (palette.cca.g - base) * pink;
      rgb[2] = base * 0.95 * (1 - turfW) + palette.turf.b * turfW + (palette.cca.b - base) * pink;
    };
  }
  function brokenBranch(T, len, rad, k, variant) {
    var cyl = new T.CylinderGeometry(rad * 0.85, rad, len, 6, 2, false), cp = cyl.attributes.position;
    // Broken ends: jitter the end rings along the branch axis. Keyed by angle and
    // end, so side and cap vertices that coincide move together.
    for (var j = 0; j < cp.count; j++) if (Math.abs(Math.abs(cp.getY(j)) - len / 2) < 1e-6) {
      var spot = Math.round((Math.atan2(cp.getZ(j), cp.getX(j)) + 4) * 1000) + (cp.getY(j) > 0 ? 7777 : 0) + (Math.hypot(cp.getX(j), cp.getZ(j)) < 1e-6 ? 3333 : 0);
      cp.setY(j, cp.getY(j) + (hash2(k * 31 + spot, variant) - 0.5) * rad * 1.8);
    }
    cyl.computeVertexNormals();
    return cyl;
  }
  function buildRubble(T, R, variant, palette) {
    var b = new Builder(), pieces = 8, m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), p = new T.Vector3(), tone = rubbleTone(palette, variant);
    for (var k = 0; k < pieces; k++) {
      var h1 = hash2(variant, k * 7 + 1), h2 = hash2(variant, k * 7 + 2), h3 = hash2(variant, k * 7 + 3), h4 = hash2(variant, k * 7 + 4);
      var len = 0.05 + 0.1 * h1, rad = 0.011 + 0.012 * h2, ang = h3 * TAU, dist = R * 0.8 * Math.sqrt(h4);
      e.set(Math.PI / 2 + (h1 - 0.5) * 0.3, h2 * TAU, (h3 - 0.5) * 0.25, 'YXZ'); q.setFromEuler(e);
      p.set(Math.cos(ang) * dist, rad * 0.9 + (k % 3 === 2 ? rad * 1.4 : 0), Math.sin(ang) * dist);
      b.absorb(T, brokenBranch(T, len, rad, k, variant), m.compose(p, q, s), tone);
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
    b.tube(T, [V(T, 0, -0.01, 0), V(T, -R * 0.055, H * 0.14, R * 0.025), V(T, R * 0.075, H * 0.26, -R * 0.025), V(T, R * 0.025, H * 0.36, 0)], R * 0.24, 3, sides, 0.35, tone);
    for (var k = 0; k < branches; k++) {
      var a = variant * 1.3 + k * 2.39996 + 0.13 * Math.sin(k * 2.17 + variant), f = 0.55 + 0.45 * hash2(k + variant * 7, 31), dx = Math.cos(a), dz = Math.sin(a);
      var shoulder = 0.76 + 0.22 * hash2(k + 11, variant + 4), curl = R * (0.035 + 0.06 * hash2(k + 71, variant));
      var tip = V(T, dx * R * (0.64 + 0.36 * f) * shoulder, H * (0.57 + 0.31 * f), dz * R * (0.64 + 0.36 * f) * shoulder);
      b.tube(T, [V(T, dx * R * 0.045 + R * 0.025, H * (0.28 + 0.035 * f), dz * R * 0.045), V(T, dx * R * 0.36 - dz * curl, H * 0.43, dz * R * 0.36 + dx * curl), V(T, tip.x * 1.04 - dz * curl * 0.4, tip.y * 0.82, tip.z * 1.04 + dx * curl * 0.4), tip], R * (0.1 + 0.025 * f), steps, sides, 0.24, tone);
      for (var j = 0; j < (detail ? 4 : 2); j++) {
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
  function buildFan(T, R, H, variant, detail) {
    var b = new Builder(), spokes = detail ? 7 : 5, rows = detail ? 4 : 3;
    function tone(t, cap, x, y, z, rgb) { rgb[0] = rgb[1] = rgb[2] = (0.65 + 0.32 * clamp(y / H, 0, 1)) * (0.96 + 0.08 * noise3(x * 21 + variant, y * 25, z * 21)); }
    b.useExtra('reefBladePhase'); b.extra.value = variant; b.caps = 1;
    function point(index, t) {
      var u = index / (spokes - 1), a = -1.15 + u * 2.3 + 0.085 * Math.sin(u * 5.7 + variant), edge = 0.88 + 0.09 * Math.sin(index * 2.7 + variant) + 0.025 * Math.sin(index * 4.1), r = H * 0.84 * edge * t;
      var x = Math.sin(a) * r * R / H * 1.55 * (0.82 + 0.18 * t) + R * 0.07 * Math.sin(variant + t * 2) * t * t;
      var y = H * 0.14 + Math.cos(a) * r + H * 0.035 * Math.sin(index * 2.3 + variant) * t * t;
      var z = R * (0.115 * Math.sin(a * 2 + variant) * t * t + 0.045 * Math.sin(t * 5 + a) * t) + 0.05 * x * t;
      return V(T, x, y, z);
    }
    b.tube(T, [V(T, 0, -0.01, 0), V(T, R * 0.018, H * 0.06, 0), V(T, -R * 0.012, H * 0.12, 0), V(T, 0, H * 0.18, 0)], R * 0.042, 3, 4, 0.6, tone);
    for (var i = 0; i < spokes; i++) {
      b.tube(T, [point(i, 0), point(i, 0.35), point(i, 0.72), point(i, 1)], R * 0.022, detail ? 4 : 3, 3, 0.72, tone);
      if (i < spokes - 1) for (var j = 1; j <= rows; j++) {
        var t = 0.19 + j / (rows + 1) * 0.78 + 0.025 * Math.sin(i * 1.7 + j * 2.9 + variant), skew = (hash2(i + variant, j + 9) - 0.5) * 0.17;
        var start = point(i, t), end = point(i + 1, clamp(t + skew, 0.18, 0.98)), p1 = start.clone().lerp(end, 0.32), p2 = start.clone().lerp(end, 0.7);
        p1.y += H * (0.016 + 0.025 * hash2(i + 5, j + variant)); p2.y += H * (0.012 + 0.025 * hash2(j, i + variant)); p1.z += R * 0.025; p2.z += R * 0.02;
        b.tube(T, [start, p1, p2, end], R * (0.008 + 0.003 * (1 - t)), 2, 3, 0.1, tone);
      }
    }
    var geometry = b.build(T, false);
    geometry.boundingSphere.radius += H * 0.08;
    return geometry;
  }

  // ---- Survey pieces ----------------------------------------------------------
  // A piece fills its point's stretch of tape, lo..hi along x and +-wz across,
  // in the point object's frame (origin on the floor under the point). A side
  // that meets the next piece of the same colony reaches into it; an open side
  // stays inside the point's own stretch, so the next point's plumb line never
  // meets this colony. ground(x, z) is the floor height in the same frame.
  function pieceTone(pc, tint, H) {
    // Shaded toward the base; tint carries the growing tips' accent colour.
    var gain = pc.gain || 1;
    return function (t, cap, x, y, z, rgb) {
      var h = clamp((y - pc.ground(x, z)) / H, 0, 1), tip = cap ? 1 : smooth(0.66, 1, t);
      var s = 0.62 + 0.34 * smooth(0, 0.9, h) + 0.06 * (noise3(x * 29 + pc.h1 * 9, y * 29, z * 29) - 0.5);
      for (var c = 0; c < 3; c++) rgb[c] = s * lerp(gain, tint[c], tip);
    };
  }
  // The colony's skeletal base: a low crust over the footprint, so the plumb
  // line always meets coral under a coral point.
  function pieceBase(T, b, pc, rise, tone) {
    var pr = pc.joinR ? 5 : 2.4, pl = pc.joinL ? 5 : 2.4, ax = pc.ax * 0.96, az = pc.wz * 0.82;
    b.absorb(T, polar(T, 4, 20, function (r, a, rgb) {
      var e = boxRadius(a, ax, az, pr, pl) * r, x = pc.cx + Math.cos(a) * e, z = Math.sin(a) * e;
      return [x, pc.ground(x, z) + 0.004 + rise * Math.pow(Math.max(0, 1 - r * r), 0.6) * (0.75 + 0.5 * noise2(x * 13 + pc.h1 * 7, z * 13)), z];
    }, function (a, p, at) { return [p[at], pc.ground(p[at], p[at + 2]) - 0.02, p[at + 2]]; }), new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) {
      tone(0.15, false, x, y, z, rgb);
    });
  }
  function clampTip(pc, tip) {
    var loLim = pc.joinL ? pc.lo - 0.1 : pc.lo + 0.02, hiLim = pc.joinR ? pc.hi + 0.1 : pc.hi - 0.02;
    tip.x = clamp(tip.x, loLim, hiLim); tip.z = clamp(tip.z, -pc.wz * 1.12, pc.wz * 1.12);
    return tip;
  }
  // Branching: staghorn thicket, corymbose fingers or a Pocillopora head. The
  // number of branches never changes, only their shape.
  function buildBranchPiece(T, pc, tint) {
    var b = new Builder(), style = pc.style, H = pc.H, MAIN = 22, tone = pieceTone(pc, tint, H), k;
    var tmp = new T.Vector3(), dir = new T.Vector3(), root = new T.Vector3(), tip = new T.Vector3();
    pieceBase(T, b, pc, 0.032, tone);
    var radius = style === 0 ? 0.021 : style === 1 ? 0.02 : 0.024, taper = style === 0 ? 0.45 : style === 1 ? 0.3 : 0.2;
    for (k = 0; k < MAIN; k++) {
      var u = fract(0.37 + k * 0.618034 + pc.h1), w = fract(0.21 + k * 0.754878 + pc.h2), h = hash2(pc.key, k * 13 + 1), h2 = hash2(pc.key, k * 13 + 2), h3 = hash2(pc.key, k * 13 + 3);
      var x0 = k === 0 ? 0 : pc.lo + (pc.hi - pc.lo) * (0.06 + 0.88 * u), z0 = k === 0 ? 0 : (w - 0.5) * 1.6 * pc.wz;
      root.set(x0, pc.ground(x0, z0) - 0.008, z0);
      var az = Math.atan2(z0, x0 - pc.cx + 1e-4) + (h - 0.5) * 1.3, el, len;
      if (style === 0) { el = k === 0 ? 1.5707 : 0.62 + 0.5 * h2; len = H * (0.78 + 0.3 * h3) / Math.sin(el); }
      else if (style === 1) { el = k === 0 ? 1.5707 : 1.18 + 0.3 * h2; len = H * (0.72 + 0.26 * h3) / Math.sin(el); }
      else { el = k === 0 ? 1.5707 : 1.05 + 0.38 * h2; len = H * (0.74 + 0.24 * h3) / Math.sin(el); }
      len = Math.min(len, 0.42);
      dir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
      clampTip(pc, tip.copy(root).addScaledVector(dir, len));
      var span = tip.distanceTo(root), bow = style === 0 ? 0.14 : 0.06;
      var c1 = V(T, root.x + (tip.x - root.x) * 0.18, root.y + span * 0.36, root.z + (tip.z - root.z) * 0.18);
      var c2 = V(T, root.x + (tip.x - root.x) * 0.72, lerp(root.y, tip.y, 0.72) + span * bow, root.z + (tip.z - root.z) * 0.72);
      var curve = [root.clone(), c1, c2, tip.clone()];
      b.tube(T, curve, radius * (0.88 + 0.24 * h3), 4, 6, taper, tone);
      // One side branch: antler forks, a second finger, or a knobbly split tip.
      var tf = style === 0 ? 0.42 + 0.18 * h : style === 1 ? 0.3 + 0.2 * h : 0.62 + 0.12 * h, fb = bez(curve, tf, new T.Vector3());
      var faz = az + (h2 < 0.5 ? -1 : 1) * (0.55 + 0.4 * h3), fel = style === 0 ? Math.min(1.3, el + 0.25) : Math.min(1.5, el + 0.08), flen = len * (style === 2 ? 0.34 : 0.38 + 0.14 * h);
      dir.set(Math.cos(fel) * Math.cos(faz), Math.sin(fel), Math.cos(fel) * Math.sin(faz));
      clampTip(pc, tip.copy(fb).addScaledVector(dir, flen));
      b.tube(T, [fb, V(T, lerp(fb.x, tip.x, 0.35), lerp(fb.y, tip.y, 0.35) + flen * 0.12, lerp(fb.z, tip.z, 0.35)), V(T, lerp(fb.x, tip.x, 0.75), lerp(fb.y, tip.y, 0.75) + flen * 0.06, lerp(fb.z, tip.z, 0.75)), tip.clone()],
        radius * 0.68, 3, 5, taper * 0.8, tone);
    }
    tmp.set(0, 0, 0);
    return b.build(T, false);
  }
  // Massive: one lobe of a boulder (Porites, lumpy) or brain coral (smooth dome).
  function buildMassivePiece(T, pc, tint) {
    // The sphere's seam is turned away from the tape line.
    var seg = 40, rings = 16, H = pc.H, g = new T.SphereGeometry(1, seg, rings, 0.37, TAU, 0, Math.PI / 2), pos = g.attributes.position;
    var pr = pc.joinR ? 4.5 : 2.2, pl = pc.joinL ? 4.5 : 2.2, lumpy = pc.brain ? 0.008 : 0.024;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), a = Math.atan2(z, x), rad = Math.sqrt(x * x + z * z);
      var e = boxRadius(a, pc.ax, pc.wz, pr, pl), X = pc.cx + Math.cos(a) * rad * e, Z = Math.sin(a) * rad * e, wx = pc.d + X;
      var lump = noise3(wx * 6.5, Z * 6.5, 1.3 + pc.h1) - 0.5, knob = noise3(wx * 17, Z * 17, 4.1) - 0.5;
      var top = H * Math.pow(Math.max(0, y), 0.78) + (lumpy * lump + lumpy * 0.35 * knob) * Math.min(1, y * 3);
      pos.setXYZ(k, X, pc.ground(X, Z) - 0.025 + (top + 0.025) * Math.min(1, y * 6 + 0.0001) * (y > 0.001 ? 1 : 0), Z);
    }
    g.computeVertexNormals(); weldSphere(g, seg, rings, false);
    var b = new Builder();
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) {
      var hh = clamp((y - pc.ground(x, z)) / H, 0, 1), crown = smooth(0.55, 1, hh);
      var s = 0.52 + 0.44 * smooth(-0.05, 0.6, hh) + 0.06 * (noise3((pc.d + x) * 11, y * 11, z * 11) - 0.5);
      for (var c = 0; c < 3; c++) rgb[c] = s * lerp(pc.gain || 1, tint[c], crown * 0.6);
    });
    return b.build(T, false);
  }
  // Plate: a table on a short stalk; neighbouring pieces of one colony form tiers.
  function buildPlatePiece(T, pc, tint) {
    var b = new Builder(), H = pc.H, ph = pc.h1 * TAU, thick = 0.017, segs = 36, rings = 7, tone = pieceTone(pc, tint, H);
    var rx = pc.ax, rz = pc.wz * 1.04, g0 = pc.ground(0, 0), tilt = (pc.h2 - 0.5) * 0.12;
    b.caps = 2;
    b.tube(T, [V(T, 0, g0 - 0.01, 0), V(T, 0.012, g0 + H * 0.3, -0.006), V(T, -0.01, g0 + H * 0.62, 0.008), V(T, 0, g0 + H - thick * 1.2, 0)], 0.034, 3, 7, 0.4, tone);
    function edge(a) { return 0.9 + 0.06 * Math.sin(3 * a + ph) + 0.03 * Math.sin(7 * a + 2 * ph) + 0.012 * Math.sin(17 * a - ph); }
    function rimAt(r, a) { var e = boxRadius(a, rx, rz, 2.2, 2.2) * edge(a) * r; return [pc.cx + Math.cos(a) * e, Math.sin(a) * e]; }
    function surfaceY(r, a, x) { return g0 + H + H * 0.13 * r * r + 0.012 * Math.sin(a * 5 + ph) * r + tilt * x; }
    var upper = polar(T, rings, segs, function (r, a, rgb) {
      var q = rimAt(r, a), rim = smooth(0.8, 1, r), s = 0.8 + 0.12 * r;
      for (var c = 0; c < 3; c++) rgb[c] = s * lerp(pc.gain || 1, tint[c], rim);
      return [q[0], surfaceY(r, a, q[0]), q[1]];
    }, function (a, p, at, rgb) {
      rgb[0] = tint[0] * 0.92; rgb[1] = tint[1] * 0.92; rgb[2] = tint[2] * 0.92;
      return [pc.cx + (p[at] - pc.cx) * 1.01, p[at + 1] - thick * 0.6, p[at + 2] * 1.01];
    });
    b.absorb(T, upper, new T.Matrix4(), null);
    // Walking the angle backwards reverses the winding, so the underside faces down.
    var under = polar(T, rings, segs, function (r, a, rgb) {
      var back = -a, q = rimAt(r * 0.995, back); rgb[0] = rgb[1] = rgb[2] = 0.48 + 0.1 * r;
      return [q[0], surfaceY(r, back, q[0]) - thick * (1.2 - 0.6 * r), q[1]];
    });
    var under2 = under.attributes.color, ui = 0;
    b.absorb(T, under, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = under2.getX(ui); rgb[1] = under2.getY(ui); rgb[2] = under2.getZ(ui++); });
    return b.build(T, false);
  }
  // Encrusting: a thin, lumpy living sheet over the rock under the point.
  function buildEncrustPiece(T, pc, tint) {
    var pr = pc.joinR ? 5 : 2.3, pl = pc.joinL ? 5 : 2.3, H = pc.H;
    var g = polar(T, 8, 36, function (r, a, rgb) {
      var e = boxRadius(a, pc.ax, pc.wz, pr, pl) * r * (0.94 + 0.06 * Math.sin(a * 5 + pc.h1 * 9)), x = pc.cx + Math.cos(a) * e, z = Math.sin(a) * e, wx = pc.d + x;
      var lumps = noise2(wx * 14, z * 14 + pc.h2 * 5), ridge = noise2(wx * 5, z * 5 - 3), rim = smooth(0.82, 1, r), s = 0.72 + 0.16 * lumps + 0.06 * ridge;
      for (var c = 0; c < 3; c++) rgb[c] = s * lerp(pc.gain || 1, tint[c], rim);
      return [x, pc.ground(x, z) + 0.004 + H * Math.pow(Math.max(0, 1 - r * r), 0.8) * (0.35 + 0.5 * lumps + 0.25 * ridge), z];
    }, function (a, p, at, rgb) { rgb[0] = tint[0] * 0.66; rgb[1] = tint[1] * 0.66; rgb[2] = tint[2] * 0.66; return [p[at] * 1.02, pc.ground(p[at], p[at + 2]) - 0.015, p[at + 2] * 1.02]; });
    var b = new Builder(), col = g.attributes.color, n = 0;
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = col.getX(n); rgb[1] = col.getY(n); rgb[2] = col.getZ(n++); });
    return b.build(T, false);
  }
  // Rock: a low limestone slab, pitted, with pink coralline crusts and turf.
  function buildSlabPiece(T, pc, palette) {
    var pr = pc.joinR ? 6 : 2.6, pl = pc.joinL ? 6 : 2.6, stone = palette.stone, turf = palette.turf, cca = palette.cca;
    var g = polar(T, 7, 32, function (r, a, rgb) {
      var joined = Math.cos(a) > 0 ? pc.joinR : pc.joinL, e = boxRadius(a, pc.ax, pc.wz, pr, pl) * r * (0.95 + 0.05 * Math.sin(a * 4 + pc.h1 * 7)), x = pc.cx + Math.cos(a) * e, z = Math.sin(a) * e, wx = pc.d + x;
      var relief = 0.016 + 0.026 * noise2(wx * 2.6, z * 2.6 + 3.3) + 0.008 * noise2(wx * 9, z * 9), fall = 1 - smooth(0.78, 1, r) * (joined ? 0.25 : 0.85);
      var mottle = 0.84 + 0.3 * noise2(wx * 3.3 + 2, z * 3.3), ccaW = smooth(0.56, 0.7, noise2(wx * 2.4 + 11, z * 2.4 - 4)) * 0.85 * palette.ccaAmount;
      var turfW = smooth(0.42, 0.68, noise2(wx * 3.8 - 5, z * 3.8 + 7)) * palette.turfAmount * (1 - ccaW);
      var rest = Math.max(0, 1 - ccaW - turfW);
      rgb[0] = stone.r * mottle * rest + cca.r * ccaW + turf.r * turfW; rgb[1] = stone.g * mottle * rest + cca.g * ccaW + turf.g * turfW; rgb[2] = stone.b * mottle * rest + cca.b * ccaW + turf.b * turfW;
      return [x, pc.ground(x, z) + relief * fall, z];
    }, function (a, p, at, rgb) { rgb[0] = stone.r * 0.6; rgb[1] = stone.g * 0.6; rgb[2] = stone.b * 0.6; return [p[at] * 1.01, pc.ground(p[at], p[at + 2]) - 0.02, p[at + 2] * 1.01]; });
    var b = new Builder(), col = g.attributes.color, n = 0;
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = col.getX(n); rgb[1] = col.getY(n); rgb[2] = col.getZ(n++); });
    return b.build(T, false);
  }
  // Rubble: loose broken branches, heaped toward the middle, some stacked.
  function buildRubblePiece(T, pc, palette) {
    var b = new Builder(), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), p = new T.Vector3(), tone = rubbleTone(palette, pc.key % 997), PIECES = 22;
    for (var k = 0; k < PIECES; k++) {
      var h1 = hash2(pc.key, k * 7 + 1), h2 = hash2(pc.key, k * 7 + 2), h3 = hash2(pc.key, k * 7 + 3), h4 = hash2(pc.key, k * 7 + 4);
      var len = 0.05 + 0.09 * h1, rad = 0.008 + 0.009 * h2, yaw = h3 * TAU, room = Math.abs(Math.cos(yaw)) * len * 0.5 + rad;
      var x = k === 0 ? 0 : clamp(lerp(pc.lo, pc.hi, (fract(0.29 + k * 0.618034 + pc.h1) + h4) * 0.5), (pc.joinL ? pc.lo - 0.05 : pc.lo) + room, (pc.joinR ? pc.hi + 0.05 : pc.hi) - room);
      var z = k === 0 ? 0 : (fract(0.13 + k * 0.754878 + pc.h2) - 0.5) * 1.7 * pc.wz, heap = 1 - Math.min(1, Math.hypot((x - pc.cx) / (pc.ax + 0.05), z / pc.wz));
      e.set(Math.PI / 2 + (h1 - 0.5) * 0.35, yaw, (h2 - 0.5) * 0.3, 'YXZ'); q.setFromEuler(e);
      p.set(x, pc.ground(x, z) + rad * 0.8 + (k % 4 === 3 ? rad * 1.7 : 0) + 0.012 * heap, z);
      b.absorb(T, brokenBranch(T, len, rad, k, pc.key % 997), m.compose(p, q, s), tone);
      if (k % 3 === 0) {
        // A forked fragment: the stub of a side branch.
        e.set(Math.PI / 2 + (h1 - 0.5) * 0.35, yaw + (h4 < 0.5 ? 0.75 : -0.75), 0, 'YXZ'); q.setFromEuler(e);
        p.x += Math.cos(yaw) * len * 0.12; p.z -= Math.sin(yaw) * len * 0.12;
        b.absorb(T, brokenBranch(T, len * 0.45, rad * 0.7, k + 50, pc.key % 997), m.compose(p, q, s), tone);
      }
    }
    return b.build(T, false);
  }
  // Fleshy seaweed: tufts of olive-brown blades with small air bladders
  // (blades adapted from createCLHuntPlantGeometry's folded ribbons).
  function buildAlgaePiece(T, pc, tint) {
    var b = new Builder(), TUFTS = 3, BLADES = 9, sections = 7, baseC = tint.base, tipC = tint.tip, bladC = tint.bladder;
    b.useExtra('reefBladePhase');
    for (var tuft = 0; tuft < TUFTS; tuft++) {
      var tx = tuft === 0 ? 0 : (tuft === 1 ? pc.lo : pc.hi) * 0.6, tz = tuft === 0 ? 0 : (tuft === 1 ? 1 : -1) * pc.wz * (0.3 + 0.3 * pc.h2);
      var tH = pc.H * (tuft === 0 ? 1 : 0.72 + 0.2 * hash2(pc.key, tuft));
      for (var k = 0; k < BLADES; k++) {
        var id = tuft * BLADES + k, h1 = hash2(pc.key, id * 5 + 1), h2 = hash2(pc.key, id * 5 + 2), h3 = hash2(pc.key, id * 5 + 3);
        var yaw = k * 2.39996 + tuft * 1.3 + pc.h1 * 6, rr = 0.05 * Math.sqrt((k + 0.5) / BLADES), bx = tx + Math.cos(yaw) * rr, bz = tz + Math.sin(yaw) * rr;
        var h = tH * (0.6 + 0.4 * h1), width = 0.05 + 0.035 * h2, lean = 0.55 + 0.6 * h3, dx = Math.cos(yaw), dz = Math.sin(yaw);
        var turn = yaw + (h2 - 0.5) * 0.8;
        // The first blade arches over the point, so the plumb line rests on seaweed.
        if (tuft === 0 && k === 0) { bx = tx - 0.05; bz = tz; dx = 1; dz = 0; lean = 1; turn = 0; h = tH * 0.95; }
        var ax = -Math.sin(turn), az = Math.cos(turn), first = b.count(), row, col, g0 = pc.ground(bx, bz);
        b.extra.value = h1 * TAU;
        for (row = 0; row <= sections; row++) {
          var t = row / sections, env = (0.3 + 0.7 * Math.sin(t * Math.PI * 0.9)) * (1 - Math.pow(t, 5)) + 0.07 + 0.05 * Math.sin(t * 11 + k);
          var out = lean * h * t * t * 0.55, cx = bx + dx * out, cz = bz + dz * out, y = g0 + t * h * (1 - 0.12 * lean * t) - 0.004, light = 0.86 + 0.14 * Math.sin(t * 6 + k);
          for (col = 0; col < 3; col++) {
            var side = col - 1, across = side * width * 0.5 * env, fold = (1 - Math.abs(side)) * width * 0.16 * Math.sin(t * Math.PI), sh = light * (side === 0 ? 1.08 : 0.9);
            b.vertex(cx + ax * across + dx * fold, y, cz + az * across + dz * fold, 0, 1, 0, lerp(baseC.r, tipC.r, t) * sh, lerp(baseC.g, tipC.g, t) * sh, lerp(baseC.b, tipC.b, t) * sh);
          }
        }
        for (row = 0; row < sections; row++) for (col = 0; col < 2; col++) { var a0 = first + row * 3 + col; b.i.push(a0, a0 + 1, a0 + 3, a0 + 1, a0 + 4, a0 + 3); }
        // Small round air bladders hold the blades up in the water.
        for (var v = k % 2; v < 2; v += 2) {
          var bt = 0.45 + 0.25 * v, bo = lean * h * bt * bt * 0.55, br = 0.0075 + 0.003 * h2, ball = new T.IcosahedronGeometry(1, 0);
          ball.scale(br, br, br); ball.translate(bx + dx * bo + ax * width * 0.6 * (v ? -1 : 1), g0 + bt * h, bz + dz * bo + az * width * 0.6 * (v ? -1 : 1));
          b.absorb(T, ball, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { var l = 0.8 + 0.25 * ny; rgb[0] = bladC.r * l; rgb[1] = bladC.g * l; rgb[2] = bladC.b * l; });
        }
      }
    }
    return b.build(T, true);
  }

  // ---- Shaders ---------------------------------------------------------------
  function inject(src, anchor, code, where) {
    if (src.indexOf(anchor) < 0) {
      var message = 'Reef3DHabitat: missing shader anchor ' + anchor + ' (' + where + ')';
      warnings.push(message);
      if (global.console && global.console.warn) global.console.warn(message);
      return src;
    }
    // A function replacement never expands $-patterns in the inserted code.
    return src.replace(anchor, function () { return anchor + '\n' + code; });
  }
  function shaderParts() { return { vCommon: [], vNormal: [], vBegin: [], vProject: [], fCommon: [], fColor: [], fRough: [], fNormal: [], fEmissive: [] }; }
  // Mixes attenuated radiance with water scattering in linear light before the
  // renderer tone-maps it (as in Reef3DExplore): near colours stay vivid while
  // distant ones fade to blue-green. Ordinary output-space fog is removed.
  var WATER_COLUMN = [
    '#ifdef USE_FOG',
    'float reefOpticalDistance=length(vViewPosition);',
    'float reefMeanDepth=max(0.0,reefSurfaceY-0.5*(reefWaterEye.y+vReefWorld.y));',
    'vec3 reefTransmission=exp(-reefWaterExtinction*reefOpticalDistance*(1.0+0.012*reefMeanDepth));',
    'vec3 reefWaterRay=normalize(vReefWorld-reefWaterEye+vec3(0.0,0.00001,0.0));',
    'float reefColumnLight=mix(0.72,1.12,smoothstep(-0.72,0.6,reefWaterRay.y));',
    'float reefForwardGlow=pow(max(0.0,dot(reefWaterRay,normalize(vec3(0.42,1.0,0.3)))),6.0);',
    'vec3 reefInscatter=reefWaterScatter*(reefColumnLight+0.1*reefForwardGlow);',
    'gl_FragColor.rgb=gl_FragColor.rgb*reefTransmission+reefInscatter*(1.0-reefTransmission);',
    '#endif'
  ].join('\n');
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
    if (parts.waterColumn) {
      f = f.replace('#include <tonemapping_fragment>', function () { return WATER_COLUMN + '\n#include <tonemapping_fragment>'; });
      f = f.replace('#include <fog_fragment>', '');
    }
    shader.vertexShader = v; shader.fragmentShader = f;
  }
  // Bounded lattice hash (Cephalopod Lab's clRockHash): no large sine hash.
  var GLSL_NOISE = [
    'float reefHash(vec3 p){p=mod(p,127.0);float h=mod(p.x*7.0+19.0,127.0);h=mod(h*mod(h,13.0)+p.y*5.0+23.0,127.0);h=mod(h*mod(h,11.0)+p.z*3.0+31.0,127.0);h=mod(h*mod(h,7.0)+17.0,127.0);return h/126.0;}',
    'float reefNoise(vec3 p){vec3 i=floor(p),f=p-i;f=f*f*(3.0-2.0*f);',
    'float a=mix(reefHash(i),reefHash(i+vec3(1.0,0.0,0.0)),f.x),b=mix(reefHash(i+vec3(0.0,1.0,0.0)),reefHash(i+vec3(1.0,1.0,0.0)),f.x);',
    'float c=mix(reefHash(i+vec3(0.0,0.0,1.0)),reefHash(i+vec3(1.0,0.0,1.0)),f.x),d=mix(reefHash(i+vec3(0.0,1.0,1.0)),reefHash(i+vec3(1.0,1.0,1.0)),f.x);',
    'return mix(mix(a,b,f.y),mix(c,d,f.y),f.z);}'
  ].join('\n');
  var WORLD_VERTEX = [
    'vec4 reefWorldPos=vec4(transformed,1.0);',
    '#ifdef USE_INSTANCING',
    'reefWorldPos=instanceMatrix*reefWorldPos;',
    '#endif',
    'vReefWorld=(modelMatrix*reefWorldPos).xyz;'
  ].join('\n');
  // Caustics from a baked map of refracted wave focus (as in Reef3DExplore).
  var CAUSTIC_COMMON = [
    'uniform sampler2D reefCausticMap;uniform float reefCausticTime;uniform float reefCausticStrength;',
    'float reefCaustic(vec2 p,float depth){',
    'float t=reefCausticTime;vec2 swell=vec2(sin(p.y*0.47+t*0.23),sin(p.x*0.39-t*0.19))*0.062;',
    'vec2 q=p*0.57+vec2(t*0.010,t*0.006)+swell;',
    'float blur=smoothstep(2.0,15.0,depth)*0.88;',
    'vec2 focus=texture2D(reefCausticMap,q).rg;float c=mix(focus.r,focus.g,blur);',
    '#ifdef REEF_CAUSTIC_LAYERS',
    'vec2 q2=vec2(p.x*0.31-p.y*0.17,p.x*0.17+p.y*0.31)+vec2(t*0.007,t*0.004)-swell*0.65+vec2(0.37,0.61);',
    'vec2 focus2=texture2D(reefCausticMap,q2).rg;float c2=mix(focus2.r,focus2.g,blur);',
    'c=max(c*0.84,c2*0.60)+c*c2*0.24;',
    '#endif',
    'float resolve=1.0;',
    '#ifdef REEF_DERIVATIVES',
    'resolve=1.0-smoothstep(0.025,0.095,max(length(dFdx(q)),length(dFdy(q))));',
    '#endif',
    'return min(c,1.0)*resolve;}'
  ].join('\n');
  // Refracted sun flecks share the sun's slant and soften with depth; upward
  // faces receive them and shadowed ones do not.
  var CAUSTIC_APPLY = [
    'vec3 reefUpWorld=inverseTransformDirection(normal,viewMatrix);',
    'float reefSunFace=max(0.0,dot(reefUpWorld,normalize(vec3(0.42,1.0,0.3))));',
    'float reefOpticalDepth=max(0.0,reefSurfaceY-vReefWorld.y-0.9);',
    'vec2 reefPoolSurface=vReefWorld.xz+(reefSurfaceY-vReefWorld.y)*vec2(0.42,0.3);',
    'float reefSunFleck=reefCaustic(reefPoolSurface,reefOpticalDepth);',
    'float reefLightPatch=reefNoise(vec3(reefPoolSurface*0.18+vec2(reefCausticTime*0.009,reefCausticTime*0.006),2.7));',
    'float reefPool=smoothstep(0.24,0.76,reefLightPatch);',
    'float reefLightCover=mix(0.29,0.80,reefPool);',
    'reflectedLight.directDiffuse*=mix(1.0,mix(0.90,1.08,reefPool),exp(-reefOpticalDepth/22.0));',
    'float reefFleckDistance=1.0-smoothstep(10.0,27.0,length(vViewPosition));',
    'totalEmissiveRadiance+=diffuseColor.rgb*vec3(1.0,0.98,0.88)*reefCausticStrength*getShadowMask()*exp(-reefOpticalDepth/11.0)*reefSunFleck*reefLightCover*reefFleckDistance*smoothstep(0.10,0.95,reefSunFace);'
  ].join('\n');
  // Water soaks up red first: deeper surfaces lose their warm colours.
  var ABSORB = 'diffuseColor.rgb*=mix(vec3(1.0),exp(-vec3(0.14,0.04,0.012)*max(0.0,reefSurfaceY-vReefWorld.y)),0.7);';
  function surfaceRelief(height, limit) {
    // Screen-space surface gradient of a scalar height (metres), as in shadeCLHuntRockSurface.
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

  function create(THREE, options) {
    if (!THREE || !THREE.BufferGeometry) throw new Error('Reef3DHabitat.create needs the THREE namespace.');
    var T = THREE;
    options = options || {};
    var layout = normalizeLayout(options.layout), seed = seedValue(options.seed);
    var quality = options.quality === 'low' ? 'low' : 'high', high = quality === 'high', reducedMotion = !!options.reducedMotion;
    var derivatives = options.derivatives !== false;
    var L = layout.lengthM, belt = layout.beltHalfWidthM, surfaceY = layout.depthM, bg = layout.background;
    var floorHeight = createFloor(belt, seed);
    var geometries = [], materials = [], textures = [], disposed = false, plantMotions = [], shafts = [];
    function G(g) { geometries.push(g); return g; }
    function M(m) { materials.push(m); return m; }
    function lin(hex) { return new T.Color(hex).convertSRGBToLinear(); }
    var root = new T.Group(); root.name = 'reef-habitat';
    var pts = layout.points;
    // The transect's own make-up steers the reef around it (layout only).
    var share = { sand: 0, rubble: 0, rock: 0, algae: 0 };
    pts.forEach(function (p) { if (p.category === 'sand') share.sand++; else if (p.category === 'rubble') share.rubble++; else if (p.category === 'rock') share.rock++; else if (p.category === 'macroalgae') share.algae++; });
    Object.keys(share).forEach(function (k) { share[k] = pts.length ? share[k] / pts.length : 0; });
    var vitality = clamp(bg.coralCover * (1 - 0.75 * bg.bleaching) / 0.45, 0, 1);

    // ---- Water: shared uniforms (the engine refines them with setWater) -----
    var depthK = clamp((surfaceY - 1.4 - 3) / 15, 0, 1), murk = 1 + 0.35 * bg.algae;
    var causticSize = high ? 256 : 128, causticTex = createCausticTexture(T, causticSize), substrateTex = createSubstrateTexture(T); textures.push(causticTex, substrateTex);
    var U = {
      map: { value: causticTex }, time: { value: 4 }, strength: { value: 0.62 }, substrate: { value: substrateTex },
      eye: { value: new T.Vector3(L / 2 - 1.5, 1.5, 0.7) }, surface: { value: surfaceY },
      extinction: { value: new T.Vector3(0.065, 0.042, 0.03).multiplyScalar(murk) },
      scatter: { value: new T.Color(0x096278).lerp(new T.Color(0x062c4b), depthK).convertSRGBToLinear() },
      top: { value: new T.Color(0x79c7d1).lerp(new T.Color(0x3a88a6), depthK) }, deep: { value: new T.Color(0x096278).lerp(new T.Color(0x062c4b), depthK) },
      life: { value: new T.Vector2(vitality, bg.algae) }
    };
    function key(name) { return 'reef3d-' + name + '-v3|' + (derivatives ? 'd' : 'n') + (high ? 'h' : 'l'); }
    function commonFragment(parts, local) {
      parts.waterColumn = true;
      parts.fCommon.push('uniform vec3 reefWaterExtinction;uniform vec3 reefWaterScatter;uniform vec3 reefWaterEye;uniform float reefSurfaceY;');
      if (derivatives) parts.fCommon.push('#ifndef REEF_DERIVATIVES\n#define REEF_DERIVATIVES\n#endif');
      if (high) parts.fCommon.push('#define REEF_CAUSTIC_LAYERS');
      parts.fCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''), GLSL_NOISE, CAUSTIC_COMMON);
      parts.vCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''));
      parts.vProject.push(WORLD_VERTEX + (local ? '\nvReefLocal=position;' : ''));
      parts.fLighting = [CAUSTIC_APPLY];
    }
    function bindCaustics(shader) {
      shader.uniforms.reefCausticMap = U.map; shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefCausticStrength = U.strength;
      shader.uniforms.reefWaterExtinction = U.extinction; shader.uniforms.reefWaterScatter = U.scatter; shader.uniforms.reefWaterEye = U.eye; shader.uniforms.reefSurfaceY = U.surface;
    }
    function patch(material, name, build) {
      if (derivatives) material.extensions = { derivatives: true };
      material.onBeforeCompile = function (shader) { build(shader); };
      material.customProgramCacheKey = function () { return key(name); };
      return material;
    }
    // Puts another module's standard material (the engine's fish) in the same water.
    function immerse(material) {
      if (!material || !(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) return material;
      var original = material.onBeforeCompile, originalKey = material.customProgramCacheKey();
      material.onBeforeCompile = function (shader, renderer) {
        if (original) original.call(this, shader, renderer);
        var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader);
        parts.fColor.push(ABSORB);
        applyParts(shader, parts, 'immerse');
      };
      material.customProgramCacheKey = function () { return originalKey + '|' + key('immerse'); };
      material.needsUpdate = true;
      return material;
    }
    // Sand, ripples, pavement and rubble ground (adapted from Reef3DExplore's floor).
    function floorShader(shader) {
      var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader);
      parts.vCommon.push('attribute vec2 reefGround;varying vec2 vReefGround;'); parts.vBegin.push('vReefGround=reefGround;');
      shader.uniforms.reefLife = U.life; shader.uniforms.reefSubstrateMap = U.substrate;
      parts.fCommon.push('varying vec2 vReefGround;uniform vec2 reefLife;uniform sampler2D reefSubstrateMap;');
      parts.fColor.push([
        'float reefX=vReefWorld.x,reefZ=vReefWorld.z;',
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
        'float reefStoneW=(1.0-reefSandW)*(1.0-reefRubW*0.65);',
        'float reefPavement=reefPavementDetail.r;',
        'float reefCrevice=1.0-smoothstep(0.30,0.44,reefPavement);',
        'float reefShell=reefSandDetail.a;',
        'float reefMineralFleck=(1.0-smoothstep(0.18,0.34,reefSandDetail.g))*reefGrainAA*reefSandW;',
        'diffuseColor.rgb*=1.0+0.05*reefWave+0.17*reefGrain*reefGrainAA*reefSandW+0.045*(reefMottle-0.5)*reefSandW+(0.10*(reefMottle-0.5)+0.32*(reefPavement-0.5)-0.065*reefCrevice)*reefStoneW;',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.91,0.87,0.80),reefMineralFleck*0.42);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.16,1.12,1.04),reefShell*reefSandW*0.6);',
        'float reefChip=reefPavementDetail.a;',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.26,1.22,1.11),reefChip*reefRubW*0.65);',
        // Coralline grows as small muted crusts on the pavement, limestone showing through.
        'float reefSpot=reefPavementDetail.b*(0.3+0.7*reefLife.x)*reefStoneW*(0.35+0.65*reefMottle);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.22,0.77,0.87),reefSpot*0.56);',
        ABSORB
      ].join('\n'));
      parts.fRough.push('roughnessFactor=clamp(roughnessFactor-0.055*reefSandW-0.035*reefShell*reefSandW+0.04*reefCrevice*reefStoneW,0.78,1.0);');
      parts.fNormal.push(surfaceRelief('0.011*reefWave+0.010*reefPavement*reefStoneW+0.002*reefChip*reefRubW+0.0010*reefGrain*reefGrainAA*reefSandW', '0.25'));
      applyParts(shader, parts, 'floor');
    }
    // Triplanar limestone: pores, coralline crusts and turf (as in Reef3DExplore).
    function rockShader(shader) {
      var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
      shader.uniforms.reefRockLife = U.life; shader.uniforms.reefSubstrateMap = U.substrate;
      parts.vCommon.push('varying vec3 vReefStoneNormal;');
      parts.vProject.push('vReefStoneNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
      parts.fCommon.push('uniform vec2 reefRockLife;uniform sampler2D reefSubstrateMap;varying vec3 vReefStoneNormal;');
      parts.fColor.push([
        'vec3 reefStoneQ=vReefWorld,reefStoneBlend=pow(abs(normalize(vReefStoneNormal)),vec3(4.0));',
        'reefStoneBlend/=max(dot(reefStoneBlend,vec3(1.0)),0.001);',
        'vec4 reefStoneDetail=texture2D(reefSubstrateMap,reefStoneQ.yz*0.9+vec2(0.17,0.31))*reefStoneBlend.x+texture2D(reefSubstrateMap,reefStoneQ.xz*0.9+vec2(0.23,0.41))*reefStoneBlend.y+texture2D(reefSubstrateMap,reefStoneQ.xy*0.9+vec2(0.43,0.13))*reefStoneBlend.z;',
        'float reefMineral=reefNoise(reefStoneQ*0.9+vec3(2.6,8.1,4.3)),reefCoarse=reefStoneDetail.r;',
        'float reefGrain=reefStoneDetail.g,reefPits=1.0-smoothstep(0.29,0.44,reefCoarse);',
        'float reefCrust=reefStoneDetail.b*(0.45+0.55*reefMineral)*(0.22+0.78*reefRockLife.x)*(1.0-reefRockLife.y*0.75);',
        'float reefTurf=smoothstep(0.48,0.72,reefMineral)*(0.07+0.68*reefRockLife.y)*(0.65+0.35*reefStoneDetail.b);',
        'diffuseColor.rgb*=(0.96+0.12*(reefMineral-0.5)+0.53*(reefCoarse-0.5)+0.055*(reefGrain-0.5))*(1.0-0.14*reefPits);',
        'vec3 reefCrustTint=mix(vec3(1.28,0.67,0.81),vec3(0.89,0.68,1.07),smoothstep(0.28,0.73,reefMineral));',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*reefCrustTint,reefCrust*0.6);',
        'diffuseColor.rgb*=1.0+0.17*reefStoneDetail.a;',
        'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.67,0.76,0.43),reefTurf);',
        ABSORB
      ].join('\n'));
      parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.05*reefPits-0.045*reefCrust,0.8,1.0);');
      parts.fNormal.push(surfaceRelief('reefCoarse*0.016-reefPits*0.0015+reefCrust*0.0009+(reefGrain-0.5)*0.0008', '0.30'));
      applyParts(shader, parts, 'rock');
    }
    // Polyps on living and bleached tissue, empty cups and turf on dead skeleton,
    // brain-coral valleys (polyp lattice and maze adapted from Reef3DExplore).
    // A: pore depth, turf amount, rim brightness, cups per metre.
    // B: valleys, valley scale, bare skeleton (1 = dead), tissue mottle.
    function coralShader(look) {
      return function (shader) {
        var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
        shader.uniforms.reefCoralA = look.a; shader.uniforms.reefCoralB = look.b; shader.uniforms.reefTurfColor = look.turf;
        parts.vCommon.push('varying vec3 vReefCoralNormal;');
        parts.vBegin.push('vReefCoralNormal=normal;');
        parts.fCommon.push('uniform vec4 reefCoralA;uniform vec4 reefCoralB;uniform vec3 reefTurfColor;varying vec3 vReefCoralNormal;');
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
          'if(reefCoralB.x>0.0){vec3 maze=vReefLocal*reefCoralB.y;reefGrooveN=reefMeander(maze.yz)*reefProjection.x+reefMeander(maze.xz)*reefProjection.y+reefMeander(maze.xy)*reefProjection.z;}',
          '#ifdef REEF_DERIVATIVES',
          'float reefFootprint=max(max(fwidth(reefQ.x),fwidth(reefQ.y)),fwidth(reefQ.z));',
          'reefAA=clamp(reefFootprint*0.6,0.015,0.15);reefDetail=1.0-smoothstep(0.3,0.95,reefFootprint);',
          'reefGrooveAA=max(0.02,fwidth(reefGrooveN)*1.2);',
          '#endif',
          'vec3 reefPolyps=reefPolypField(reefQ.yz,reefDetail,reefAA)*reefProjection.x+reefPolypField(reefQ.xz+vec2(7.2,3.1),reefDetail,reefAA)*reefProjection.y+reefPolypField(reefQ.xy+vec2(2.3,9.1),reefDetail,reefAA)*reefProjection.z;',
          'float reefPore=reefPolyps.x,reefRim=reefPolyps.y,reefSepta=reefPolyps.z;',
          'float reefGrooveRaw=1.0-smoothstep(0.025,0.12,reefGrooveN);',
          'float reefGroove=(1.0-smoothstep(0.025,0.12+reefGrooveAA,reefGrooveN))*reefCoralB.x*(1.0-smoothstep(0.12,0.6,reefGrooveAA));',
          'float reefMantle=smoothstep(0.18,0.82,reefPigment);',
          'vec3 reefTissueTint=mix(vec3(1.0),mix(vec3(0.91,0.955,0.93),vec3(1.045,1.025,1.02),reefMantle),reefCoralB.w);',
          // Brain-coral valleys are paler than the ridges; dead cups gain crisp septa.
          'diffuseColor.rgb*=reefTissueTint*(1.0-reefCoralA.x*reefPore+reefCoralA.z*(reefRim+0.26*reefSepta)-reefCoralB.z*0.12*reefSepta)*(0.94+0.12*reefTissue)*(1.0+0.2*reefGroove);',
          'float reefTurf=0.0;',
          'if(reefCoralA.y>0.0){',
          '  float reefTurfN=reefNoise(vReefLocal*30.0+vec3(2.1,7.7,4.4))*0.65+reefTissue*0.35;',
          '  reefTurf=smoothstep(0.62-reefCoralA.y*0.5,0.82-reefCoralA.y*0.5,reefTurfN)*0.9;',
          '  float reefFuzz=reefNoise(vReefLocal*150.0+vec3(1.1,2.2,3.3));',
          '  diffuseColor.rgb=mix(diffuseColor.rgb,reefTurfColor*(0.6+0.8*reefFuzz),reefTurf*(0.72+0.28*reefNoise(vReefLocal*60.0)));',
          '}',
          ABSORB
        ].join('\n'));
        parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.25*reefTurf-0.045*reefRim+0.035*reefPore+0.035*reefGroove,0.35,1.0);');
        parts.fNormal.push(surfaceRelief('((0.0009*reefRim+0.00022*reefSepta-0.0018*reefPore)*reefCoralA.x*2.0-0.0011*reefGrooveRaw*reefCoralB.x)*(1.0-reefTurf*0.6)', '0.32'));
        applyParts(shader, parts, 'coral');
      };
    }
    // Shared surge pulses carry bounded blade ripples (adapted from shadeCLHuntPlantFlex).
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
          'float reefPlantT=clamp(position.y/max(reefPlantMotion.z,0.001),0.0,1.0);',
          'float reefPlantPhase=reefBladePhase*0.09;vec3 reefPlantSite=modelMatrix[3].xyz;mat3 reefPlantBasis=mat3(modelMatrix);',
          '#ifdef USE_INSTANCING',
          'reefPlantSite=(modelMatrix*vec4(instanceMatrix[3].xyz,1.0)).xyz;reefPlantBasis=mat3(modelMatrix)*mat3(instanceMatrix);',
          '#endif',
          'reefPlantPhase-=dot(reefPlantSite.xz,vec2(0.13,0.09));float reefPlantPulse=0.85+0.15*sin(reefPlantMotion.x-dot(reefPlantSite.xz,vec2(0.075,0.055)));',
          'vec2 reefPlantFlow=normalize(vec2(0.87+0.08*sin(reefPlantMotion.x),0.49));',
          'vec2 reefPlantAlong=vec2(dot(normalize(reefPlantBasis[0].xz),reefPlantFlow),dot(normalize(reefPlantBasis[2].xz),reefPlantFlow));',
          'vec2 reefPlantAcross=vec2(-reefPlantAlong.y,reefPlantAlong.x);',
          'vec2 reefPlantX=reefPlantWave(reefPlantT,reefPlantMotion.y+reefPlantPhase,1.4,0.13);',
          'vec2 reefPlantZ=reefPlantWave(reefPlantT,reefPlantMotion.y*0.73+1.7+reefPlantPhase,2.1,0.035);',
          'vec2 reefPlantShift=reefPlantAlong*(reefPlantX.x+0.025*reefPlantT*reefPlantT)+reefPlantAcross*reefPlantZ.x;',
          'vec3 reefPlantOffset=vec3(reefPlantShift.x,0.0,reefPlantShift.y)*reefPlantMotion.z*reefPlantMotion.w*reefPlantPulse;',
          'vec2 reefPlantSlope=(reefPlantAlong*(reefPlantX.y+0.05*reefPlantT)+reefPlantAcross*reefPlantZ.y)*reefPlantMotion.w*reefPlantPulse;',
          'objectNormal.y-=dot(reefPlantSlope,objectNormal.xz);'
        ].join('\n'));
        parts.vBegin.push('transformed+=reefPlantOffset;');
        parts.fColor.push([
          'float reefTissue=reefNoise(vReefLocal*48.0+vec3(1.7,0.0,2.1));',
          'float reefPlantDetail=1.0-smoothstep(3.0,11.0,length(vViewPosition));',
          'diffuseColor.rgb*=0.94+0.12*reefTissue*reefPlantDetail;',
          ABSORB
        ].join('\n'));
        parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.04*(reefTissue-0.5),0.5,0.95);');
        applyParts(shader, parts, 'plant');
      };
    }
    function plantMotion(height) { var m = { value: new T.Vector4(0, 0, height, reducedMotion ? 0 : 1) }; plantMotions.push(m); return m; }
    // Tape, marks and stakes: no surface detail, the same water.
    function plainShader(shader) { var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader); parts.fColor.push(ABSORB); applyParts(shader, parts, 'tape'); }

    var stone = lin(0x8e8c84), turf = lin(0x646a34), cca = lin(0xc57592);
    var rockPalette = { stone: stone, turf: turf, cca: cca, turfAmount: 0.45 + 0.45 * bg.algae, ccaAmount: 0.25 + 0.35 * vitality };
    var turfColor = { value: lin(0x6f5e34) };
    // One colony keeps one look across its points: tissue colour by growth form.
    var LIVE = {
      acropora: { base: [0x8a6a42, 0x9c7d52, 0x6f7046, 0x7d6448, 0xa38d63], tip: [0xc6b4de, 0xa8c4e6, 0xe3b2c6, 0xe6dcc2] },
      pocillopora: { base: [0x9a6a5e, 0x8c5f55, 0xa27466], tip: [0xe0bfb6, 0xe8cbc0] },
      porites: { base: [0xa58a48, 0xb59d68, 0x8a7a4a], tip: [0xd6c690, 0xd9cfa5, 0xc8bf8a] },
      brain: { base: [0x7a6a3c, 0x6b6e43, 0x82703f], tip: [0xb8ad7a, 0xa9ae80] },
      plate: { base: [0x7f7a4a, 0x8f7f55, 0x6d7c58], tip: [0xc6b4de, 0xa8c4e6, 0xd9d3b4] },
      encrusting: { base: [0x6e5638, 0x6a5a3c, 0x765468], tip: [0xb39a72, 0xab9c76, 0xc1a2b6] }
    };
    // Bleached tissue is clear over white skeleton, some with a pastel glow (as in the 2D close-ups).
    var BLEACHED_TIPS = [0xffffff, 0xfbe3ee, 0xe2edfc, 0xf7f1cf, 0xeee4fa];
    var algaeTints = [
      { base: lin(0x4a3f18), tip: lin(0x9a8638), bladder: lin(0x6e5e22) },
      { base: lin(0x45461c), tip: lin(0x8e8e3a), bladder: lin(0x66642a) },
      { base: lin(0x52381a), tip: lin(0xa07a3c), bladder: lin(0x704e24) }
    ];
    var algaeMotion = plantMotion(0.24), algaeMaterial = null, rockMaterial = null;

    // ---- Ground: what lies on the floor along the tape and around it ----------
    var rp = stream(seed, 203), o1 = rp() * 50, o2 = rp() * 50;
    // Reef patches and sand channels: a seeded density field (two fixed draws).
    function patchField(x, z) { return noise2(x * 0.16 + o1, z * 0.16 + o2) * 0.78 + noise2(x * 0.46 - o2, z * 0.46 + o1) * 0.22; }
    function patchiness(x, z) { return smooth(0.33, 0.68, patchField(x, z)); }
    var SURVEY_GROUND = { sand: [1, 0], rubble: [0.4, 1], rock: [0, 0], macroalgae: [0, 0.15] };
    function surveyGround(x) {
      // The nearest point's bottom type, blended over a few centimetres at each boundary.
      if (!pts.length || x < pts[0].distanceM - 0.5 || x > pts[pts.length - 1].distanceM + 0.5) return null;
      var best = 0, bestD = Infinity, second = -1, secondD = Infinity;
      for (var i = 0; i < pts.length; i++) {
        var dd = Math.abs(pts[i].distanceM - x);
        if (dd < bestD) { second = best; secondD = bestD; best = i; bestD = dd; } else if (dd < secondD) { second = i; secondD = dd; }
      }
      var a = SURVEY_GROUND[pts[best].category] || [0, 0], b = second >= 0 ? SURVEY_GROUND[pts[second].category] || [0, 0] : a;
      var t = second >= 0 ? 0.5 * smooth(-0.06, 0.06, bestD - secondD + 0.0) : 0;
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
    }
    function outsideGround(x, z) {
      var patch = patchField(x, z), sand = 1 - smooth(0.2, 0.27 + 0.25 * share.sand, patch), rub = (0.15 + 0.85 * share.rubble) * smooth(0.45, 0.7, noise2(x * 0.37 + o2, z * 0.37 - o1)) * (1 - sand * 0.4);
      return [sand * (0.7 + 0.3 * share.sand), clamp(rub, 0, 1)];
    }
    function groundAt(x, z) {
      var out = outsideGround(x, z), near = surveyGround(x), w = near ? 1 - smooth(0.34, 0.8, Math.abs(z)) : 0;
      if (near) { out[0] = lerp(out[0], near[0], w); out[1] = lerp(out[1], near[1], w); }
      out[0] = clamp(out[0], 0, 1); return out;
    }
    var SANDC = lin(0xc9c2ae), RUBC = lin(0xb5ae9b), PAVE = lin(0x8d8572), PAVE_CCA = lin(0xa97986), PAVE_TURF = lin(0x5d633b);
    function groundColor(x, z, g, out) {
      var n1 = noise2(x * 0.35 + 3.1, z * 0.35 - 1.7), n2 = noise2(x * 1.7, z * 1.7 + 5.5), turfW = (0.12 + 0.6 * bg.algae) * smooth(0.35, 0.7, noise2(x * 0.9 + 4, z * 0.9));
      var ccaW = (0.1 + 0.25 * vitality) * smooth(0.4, 0.78, noise2(x * 0.8 - 9, z * 0.8 + 3)) * (1 - turfW);
      ['r', 'g', 'b'].forEach(function (c, i) {
        var pave = PAVE[c] * (0.88 + 0.22 * n1) * (1 - turfW - ccaW) + PAVE_TURF[c] * turfW + PAVE_CCA[c] * ccaW;
        var sandC = SANDC[c] * (0.95 + 0.08 * n2), rubC = RUBC[c] * (0.85 + 0.25 * n2) * (1 - 0.3 * bg.algae * n1) + PAVE_TURF[c] * 0.3 * bg.algae * n1;
        out[i] = lerp(lerp(pave, sandC, g[0]), rubC, g[1]);
      });
      return out;
    }

    // ---- Seafloor --------------------------------------------------------------
    var xs = gridAxis(-3, L + 3, high ? 0.25 : 0.5, -45, L + 45, 1.12), zs = gridAxis(-(belt + 4), belt + 4, high ? 0.3 : 0.5, -50, 50, 1.12);
    var floorGeometry = G(buildGrid(T, xs, zs, floorHeight, function (x, z, col, gr) { var g = groundAt(x, z); groundColor(x, z, g, col); gr[0] = g[0]; gr[1] = g[1]; }));
    var floorMaterial = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, metalness: 0 }), 'floor', floorShader));
    var floor = new T.Mesh(floorGeometry, floorMaterial); floor.name = 'reef-floor'; floor.receiveShadow = true; root.add(floor);
    floor.onBeforeRender = function (renderer, scene, camera) { U.eye.value.setFromMatrixPosition(camera.matrixWorld); };

    // ---- Survey objects (layout only) ------------------------------------------
    var surveyRoot = new T.Group(); surveyRoot.name = 'reef-survey-points'; root.add(surveyRoot);
    var surveyObjects = [], colonyMaterials = {}, pieces = [];
    // Neighbouring points on one colony (same colony id, category and form) join.
    pts.forEach(function (p, i) {
      var prev = i > 0 ? pts[i - 1] : null;
      var joined = !!(prev && p.colony !== null && prev.colony === p.colony && prev.category === p.category && prev.coralForm === p.coralForm && Math.abs(p.distanceM - prev.distanceM) <= 1.3);
      pieces.push({ joinL: joined, joinR: false });
      if (joined) pieces[i - 1].joinR = true;
    });
    pts.forEach(function (p, i) {
      var pc = pieces[i], gapL = i > 0 ? p.distanceM - pts[i - 1].distanceM : 0.5, gapR = i < pts.length - 1 ? pts[i + 1].distanceM - p.distanceM : 0.5;
      gapL = clamp(gapL, 0.12, 1.5); gapR = clamp(gapR, 0.12, 1.5);
      var colonySeed = p.colony !== null ? p.colony : 100000 + i;
      pc.index = i; pc.d = p.distanceM; pc.key = (Math.imul(colonySeed + 7, 2654435761) ^ Math.imul(i + 1, 40503)) | 0;
      pc.colonyKey = (Math.imul(colonySeed + 3, 2246822519) ^ (FORMS.indexOf(p.coralForm) + 1) * 977) | 0;
      pc.lo = pc.joinL ? -(gapL * 0.5 + 0.08) : -Math.min(0.215, gapL * 0.43);
      pc.hi = pc.joinR ? gapR * 0.5 + 0.08 : Math.min(0.215, gapR * 0.43);
      pc.cx = (pc.lo + pc.hi) / 2; pc.ax = (pc.hi - pc.lo) / 2;
      pc.h1 = hash2(pc.key, 3); pc.h2 = hash2(pc.key, 5);
      var cs = hash2(pc.colonyKey, 9), base = floorHeight(p.distanceM, 0);
      pc.style = Math.floor(cs * 3) % 3; pc.brain = cs > 0.55;
      pc.ground = function (x, z) { return floorHeight(p.distanceM + x, z) - base; };
      var c = p.category;
      pc.wz = CORAL[c] ? 0.24 + 0.06 * hash2(pc.colonyKey, 11) : c === 'rock' ? 0.34 : c === 'rubble' ? 0.32 : c === 'macroalgae' ? 0.24 : 0.3;
      if (CORAL[c]) pc.H = p.coralForm === 'branching' ? (pc.style === 0 ? 0.29 : pc.style === 1 ? 0.23 : 0.25) * (0.94 + 0.12 * pc.h1)
        : p.coralForm === 'massive' ? (pc.joinL && pc.joinR ? 0.21 : 0.165) * (0.92 + 0.16 * pc.h1) : p.coralForm === 'plate' ? 0.15 + 0.06 * pc.h2 : 0.034 + 0.012 * pc.h1;
      else pc.H = c === 'macroalgae' ? 0.2 + 0.07 * pc.h1 : 0.05;
      var object = buildSurveyObject(p, pc);
      object.position.set(p.distanceM, base, 0);
      object.name = 'reef-survey-' + i;
      object.userData = { surveyPoint: i, category: p.category, coralForm: p.coralForm };
      surveyRoot.add(object); surveyObjects.push(object);
    });
    // Soft contact shade under colonies and seaweed, also where shadow maps are off.
    (function buildContactShade() {
      var b = new Builder(), segments = 24;
      b.useExtra('reefContactWeight');
      pts.forEach(function (p, i) {
        var c = p.category, pc = pieces[i];
        if (!CORAL[c] && c !== 'macroalgae') return;
        var grow = c === 'macroalgae' ? 1.25 : p.coralForm === 'encrusting' ? 1.08 : 1.22, ax = pc.ax * grow + 0.04, az = pc.wz * grow + 0.04, first = b.count();
        b.extra.value = 1;
        var cx = p.distanceM + pc.cx; b.vertex(cx, floorHeight(cx, 0) + 0.003, 0, 0, 1, 0, 1, 1, 1);
        b.extra.value = 0;
        for (var s = 0; s < segments; s++) {
          var a = s / segments * TAU, e = boxRadius(a, ax, az, pc.joinR ? 4 : 2, pc.joinL ? 4 : 2), px = cx + Math.cos(a) * e, pz = Math.sin(a) * e;
          b.vertex(px, floorHeight(px, pz) + 0.003, pz, 0, 1, 0, 1, 1, 1);
          b.i.push(first, first + 1 + (s + 1) % segments, first + 1 + s);
        }
      });
      if (!b.count()) return;
      var mesh = new T.Mesh(G(b.build(T, false)), contactMaterial(high ? 0.3 : 0.36)); mesh.name = 'reef-contact-shade'; mesh.userData.decorative = true; mesh.renderOrder = 1; root.add(mesh);
    })();
    function contactMaterial(opacity) {
      return M(patch(new T.MeshBasicMaterial({ color: lin(0x10302e), transparent: true, opacity: opacity, depthWrite: false }), 'contact-shade', function (shader) {
        var parts = shaderParts(); shader.uniforms.reefWaterEye = U.eye;
        parts.vCommon.push('attribute float reefContactWeight;varying float vReefContact;varying vec3 vReefContactWorld;');
        parts.vBegin.push('vReefContact=reefContactWeight;'); parts.vProject.push('vReefContactWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
        parts.fCommon.push('varying float vReefContact;varying vec3 vReefContactWorld;uniform vec3 reefWaterEye;');
        parts.fColor.push('diffuseColor.a*=smoothstep(0.0,1.0,vReefContact)*(1.0-smoothstep(8.0,14.0,length(reefWaterEye-vReefContactWorld)));');
        applyParts(shader, parts, 'contact-shade');
      }));
    }
    function colonyLook(p, pc) {
      var form = p.coralForm, c = p.category, pick = function (list, salt) { return list[Math.floor(hash2(pc.colonyKey, salt) * list.length) % list.length]; };
      var group = form === 'branching' ? (pc.style === 2 ? 'pocillopora' : 'acropora') : form === 'massive' ? (pc.brain ? 'brain' : 'porites') : form;
      var base = lin(pick(LIVE[group].base, 21)), tipHex = pick(LIVE[group].tip, 23), color, tip, gain = 1;
      if (c === 'hard_coral') { color = base; tip = lin(tipHex); gain = form === 'encrusting' ? 1.1 : 1.3; }
      else if (c === 'bleached_coral') { color = lin(hash2(pc.colonyKey, 25) < 0.5 ? 0xf6f5f0 : 0xf1f4f6); tip = lin(pick(BLEACHED_TIPS, 27)); }
      else { color = lin(0xc8c3b6); tip = lin(0xd8d4ca); }
      // tint scales the vertex colours: 1 at the base of the tissue, the accent at the tips.
      return { color: color, tint: [tip.r / color.r, tip.g / color.g, tip.b / color.b], gain: gain };
    }
    function coralMaterial(p, pc, look) {
      var id = p.category + '|' + p.coralForm + '|' + pc.colonyKey;
      if (colonyMaterials[id]) return colonyMaterials[id];
      var living = p.category === 'hard_coral', bleached = p.category === 'bleached_coral', dead = !living && !bleached, form = p.coralForm;
      var density = form === 'branching' ? 52 : form === 'plate' ? 46 : form === 'encrusting' ? 44 : pc.brain ? 30 : 46;
      var groove = form === 'massive' && pc.brain ? 1 : 0;
      var a = living ? [0.3, 0, 0.16] : bleached ? [0.22, 0, 0.06] : [0.4, form === 'branching' ? 0.32 : 0.4, 0];
      var u = { a: { value: new T.Vector4(a[0], a[1], a[2], density) }, b: { value: new T.Vector4(groove, 22, dead ? 1 : 0, living ? 1 : 0) }, turf: turfColor };
      var m = new T.MeshStandardMaterial({ color: look.color, vertexColors: true, roughness: living ? 0.72 : bleached ? 0.5 : 0.97, metalness: 0 });
      return (colonyMaterials[id] = M(patch(m, 'coral', coralShader(u))));
    }
    function surveyMesh(geometry, material, name) {
      var mesh = new T.Mesh(G(geometry), material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
    }
    function buildSurveyObject(p, pc) {
      var group = new T.Group(), c = p.category;
      if (CORAL[c]) {
        var look = colonyLook(p, pc), form = p.coralForm; pc.gain = look.gain;
        var geometry = form === 'branching' ? buildBranchPiece(T, pc, look.tint) : form === 'plate' ? buildPlatePiece(T, pc, look.tint)
          : form === 'encrusting' ? buildEncrustPiece(T, pc, look.tint) : buildMassivePiece(T, pc, look.tint);
        group.add(surveyMesh(geometry, coralMaterial(p, pc, look), 'reef-coral'));
        if (c === 'recently_dead_coral') group.add(turfFuzz(geometry, pc.key));
      } else if (c === 'macroalgae') {
        algaeMaterial = algaeMaterial || M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62, side: T.DoubleSide }), 'plant', plantShader(algaeMotion)));
        group.add(surveyMesh(buildAlgaePiece(T, pc, algaeTints[Math.floor(hash2(pc.colonyKey, 31) * 3) % 3]), algaeMaterial, 'reef-macroalgae'));
      } else if (c === 'rock' || c === 'rubble') {
        rockMaterial = rockMaterial || M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.93 }), 'rock', rockShader));
        if (c === 'rock') group.add(surveyMesh(buildSlabPiece(T, pc, rockPalette), rockMaterial, 'reef-rock'));
        else group.add(surveyMesh(buildRubblePiece(T, pc, rockPalette), rockMaterial, 'reef-rubble'));
      } else {
        // Sand (and any unknown category): a faintly rippled patch in the floor material.
        var sandPatch = polar(T, 4, 20, function (r, a, rgb) {
          var x = pc.cx + Math.cos(a) * pc.ax * 1.05 * r, z = Math.sin(a) * pc.wz * r;
          groundColor(p.distanceM + x, z, [1, 0], rgb);
          return [x, pc.ground(x, z) + 0.003 + 0.002 * Math.sin(z * 26 + x * 1.5) * (1 - r), z];
        });
        var ground = new Float32Array(sandPatch.attributes.position.count * 2);
        for (var k = 0; k < ground.length; k += 2) ground[k] = 1;
        sandPatch.setAttribute('reefGround', new T.Float32BufferAttribute(ground, 2));
        var sand = surveyMesh(sandPatch, floorMaterial, 'reef-sand'); sand.castShadow = false; group.add(sand);
      }
      return group;
    }
    // Recently dead coral: short brown turf filaments starting to cover the skeleton.
    function turfFuzz(geometry, variant) {
      var pos = geometry.attributes.position, nor = geometry.attributes.normal, out = [], strideK = Math.max(1, Math.floor(pos.count / 900));
      for (var k = 0; k < pos.count; k += strideK) {
        var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
        if (noise3(x * 16 + 2.1, y * 16 + 7.7, z * 16 + 4.4) < 0.44) continue;
        var len = 0.004 + 0.006 * hash2(k, variant), jx = (hash2(k, 3) - 0.5) * 0.5, jz = (hash2(k, 5) - 0.5) * 0.5;
        out.push(x, y, z, x + (nor.getX(k) + jx) * len, y + (nor.getY(k) + 0.2) * len, z + (nor.getZ(k) + jz) * len);
      }
      var g = G(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(out, 3)); g.computeBoundingSphere();
      var lines = new T.LineSegments(g, M(new T.LineBasicMaterial({ color: lin(0x5e4c26), transparent: true, opacity: 0.8 })));
      lines.name = 'reef-turf-fuzz'; return lines;
    }
    // Where the plumb line meets the point's bottom: the first surface straight
    // below the tape at the point (computed on demand; survey objects never move).
    var ray = new T.Raycaster(), rayDown = new T.Vector3(0, -1, 0), rayFrom = new T.Vector3(), contactCache = [], CONTACT_OFFSETS = [[0, 0.0013], [0.009, 0.0013], [-0.009, 0.0013], [0, 0.0103], [0, -0.0077]];
    function contactHeight(i) {
      var p = pts[i]; if (!p) return null;
      if (contactCache[i] !== undefined) return contactCache[i];
      root.updateMatrixWorld(true);
      var meshes = []; surveyObjects[i].traverse(function (o) { if (o.isMesh) meshes.push(o); });
      // The line and its weight are about 2 cm across: the highest surface under any part of it.
      var y = floorHeight(p.distanceM, 0), any = false;
      CONTACT_OFFSETS.forEach(function (o) {
        rayFrom.set(p.distanceM + o[0], tape.at(p.distanceM) + 0.4, o[1]); ray.set(rayFrom, rayDown); ray.near = 0; ray.far = 4;
        var hits = ray.intersectObjects(meshes, false);
        if (hits.length) { any = true; y = Math.max(y, hits[0].point.y); }
      });
      if (!any) {
        // Between thin blades the line settles into the clump: the tallest part within 4 cm.
        var v = new T.Vector3(), top = -Infinity;
        meshes.forEach(function (m) { var pos = m.geometry.attributes.position; for (var k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld); if (Math.hypot(v.x - p.distanceM, v.z) < 0.04) top = Math.max(top, v.y); } });
        if (top > y) y = lerp(y, top, 0.7);
      }
      return (contactCache[i] = y);
    }

    // ---- Transect tape, marks and stakes ----------------------------------------
    var tape = buildTapeProfile();
    function buildTapeProfile() {
      var stepX = 0.02, n = Math.ceil(L / stepX) + 1, top = new Float32Array(n), v = new T.Vector3(), i, k;
      for (i = 0; i < n; i++) top[i] = floorHeight(Math.min(L, i * stepX), 0) + 0.006;
      root.updateMatrixWorld(true);
      surveyObjects.forEach(function (object) {
        object.traverse(function (o) {
          if (!o.isMesh || !o.geometry) return;
          var pos = o.geometry.attributes.position;
          for (var j = 0; j < pos.count; j++) {
            v.fromBufferAttribute(pos, j).applyMatrix4(o.matrixWorld);
            if (Math.abs(v.z) > 0.04) continue;
            var bin = Math.round(v.x / stepX); if (bin >= 0 && bin < n) top[bin] = Math.max(top[bin], v.y + 0.008);
          }
        });
      });
      // A taut tape bridges gaps between tips: dilate, blur, then never dip into an object.
      var dil = new Float32Array(n), out = new Float32Array(n);
      for (i = 0; i < n; i++) { var m = -Infinity; for (k = -4; k <= 4; k++) m = Math.max(m, top[clamp(i + k, 0, n - 1)]); dil[i] = m; }
      for (var pass = 0; pass < 3; pass++) {
        for (i = 0; i < n; i++) { var s = 0; for (k = -4; k <= 4; k++) s += dil[clamp(i + k, 0, n - 1)]; out[i] = Math.max(s / 9, top[i]); }
        dil.set(out);
      }
      return { step: stepX, heights: out, at: function (x) { var f = clamp(x / stepX, 0, n - 1), a = Math.floor(f), b = Math.min(n - 1, a + 1); return out[a] + (out[b] - out[a]) * (f - a); } };
    }
    (function buildTape() {
      var n = Math.max(2, Math.ceil(L / 0.04)), half = 0.017, p = [], nrm = [], idx = [];
      for (var i = 0; i <= n; i++) {
        var x = L * i / n, y = tape.at(x), y0 = tape.at(Math.max(0, x - 0.02)), y1 = tape.at(Math.min(L, x + 0.02)), sl = (y1 - y0) / 0.04, ln = Math.hypot(sl, 1);
        p.push(x, y, -half, x, y, half); nrm.push(-sl / ln, 1 / ln, 0, -sl / ln, 1 / ln, 0);
        if (i < n) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var g = G(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
      g.setIndex(idx); g.computeBoundingBox(); g.computeBoundingSphere();
      var mat = M(patch(new T.MeshStandardMaterial({ color: lin(0xf4c430), roughness: 0.55, emissive: lin(0x6b5000), emissiveIntensity: 0.55, side: T.DoubleSide }), 'tape', plainShader));
      var mesh = new T.Mesh(g, mat); mesh.name = 'reef-tape'; mesh.receiveShadow = true; mesh.castShadow = true; root.add(mesh);
      // Small marks every 0.5 m, larger ones every metre, red every 5 m.
      var sets = { half: [], metre: [], five: [] };
      for (var d = 0; d <= L + 1e-6; d += 0.5) {
        var whole = Math.abs(d - Math.round(d)) < 1e-6, five = whole && Math.round(d) % 5 === 0;
        (five ? sets.five : whole ? sets.metre : sets.half).push(d);
      }
      var dims = { half: [0.007, 0.004, 0.03, 0x1c1c1c], metre: [0.012, 0.006, 0.036, 0x111111], five: [0.018, 0.008, 0.04, 0xc0392b] };
      var mtx = new T.Matrix4();
      Object.keys(sets).forEach(function (name) {
        var list = sets[name]; if (!list.length) return;
        var dm = dims[name], im = new T.InstancedMesh(G(new T.BoxGeometry(dm[0], dm[1], dm[2])), M(patch(new T.MeshStandardMaterial({ color: lin(dm[3]), roughness: 0.6 }), 'tape', plainShader)), list.length);
        list.forEach(function (x, k) { im.setMatrixAt(k, mtx.makeTranslation(x, tape.at(x) + dm[1] * 0.5, 0)); });
        im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.name = 'reef-tape-marks-' + name; im.userData.distancesM = list.slice(); root.add(im);
      });
      var stakeGeo = G(new T.CylinderGeometry(0.007, 0.007, 0.5, 8)), stakeMat = M(patch(new T.MeshStandardMaterial({ color: lin(0x8a8f96), metalness: 0.3, roughness: 0.45 }), 'tape', plainShader));
      [0, L].forEach(function (x, k) {
        var stake = new T.Mesh(stakeGeo, stakeMat); stake.position.set(x + (k ? 0.03 : -0.03), floorHeight(x, 0) + 0.2, 0); stake.name = 'reef-tape-stake'; stake.castShadow = true; root.add(stake);
      });
    })();

    // ---- Decorative reef (seeded; draw counts fixed per slot) ----------------
    var decor = buildDecor();
    function buildDecor() {
      var lists = {}, bommies = [], rb = stream(seed, 202), rd = stream(seed, 201), corridor = 0.45, cover = bg.coralCover, rt = stream(seed, 204);
      function push(kind, x, y, z, yaw, sx, sy, sz, color, tilt, light) { (lists[kind] = lists[kind] || []).push([x, y, z, yaw, sx, sy, sz, color, tilt || 0, !!light]); }
      // Tissue colours by kind (Coral look guide); neighbours share a pigment field.
      var PIGMENT = {
        finger: [0x8a6a42, 0x9c7d52, 0x6f7046, 0x7d6448, 0xa38d63, 0x6c8650], antler: [0x8a6a42, 0x9c7d52, 0x6f7046, 0xa38d63, 0x7d6448],
        corymbose: [0x9a6a5e, 0x8c5f55, 0xa27466, 0x8a6a42], massive: [0xa58a48, 0xb59d68, 0x7f8a4e, 0x7a6a3c, 0x6b6e43],
        plate: [0x7f7a4a, 0x8f7f55, 0x6d7c58, 0x8a6a42], encrusting: [0x6e5638, 0x5f6d40, 0x765468, 0x7a6a3c],
        soft: [0xd8c79a, 0xd9b84a, 0xc8743a, 0x8a4f86, 0xe0d4b0], fan: [0xc8642e, 0xa8323a, 0x7a3f86], sponge: [0x6a3f7a, 0x3f5f92, 0xc0662a, 0x7a5032]
      };
      var pig = {};
      Object.keys(PIGMENT).forEach(function (k) { pig[k] = PIGMENT[k].map(function (h) { var c = lin(h); return [c.r, c.g, c.b]; }); });
      function coralColor(roll, x, z, kind) {
        if (kind !== 'fan' && kind !== 'sponge') {
          if (roll < bg.bleaching) return [1, 1, 1];
          if (roll < bg.bleaching * 1.15) return [0.6, 0.58, 0.52];
        }
        var pal = pig[kind] || pig.massive, pigment = noise2(x * 0.24 + o2, z * 0.24 - o1), c = pal[(Math.floor(pigment * 19) + (roll > 0.84 ? 1 : 0)) % pal.length];
        var tone = (kind === 'finger' || kind === 'antler' || kind === 'corymbose' ? 1.5 : 1.28) + 0.2 * roll;
        return [c[0] * tone, c[1] * tone, c[2] * tone];
      }
      function coralForm(roll) { return roll < 0.18 ? 'finger' : roll < 0.38 ? 'antler' : roll < 0.55 ? 'corymbose' : roll < 0.85 ? 'massive' : 'plate'; }
      function topForm(roll) { return roll < 0.14 ? 'finger' : roll < 0.3 ? 'antler' : roll < 0.43 ? 'corymbose' : roll < 0.64 ? 'massive' : roll < 0.78 ? 'plate' : roll < 0.87 ? 'soft' : roll < 0.93 ? 'fan' : 'sponge'; }
      // Footprint radius per unit scale, to keep colonies off the tape.
      var REACH = { finger: 0.3, antler: 0.38, corymbose: 0.36, massive: 0.4, plate: 0.46, encrusting: 0.44, rock: 0.34, algae: 0.12, sponge: 0.1, rubble: 0.26, soft: 0.2, fan: 0.24 };
      // Bommies: coral heads beyond the belt, every slot drawing the same numbers.
      for (var bx = -12; bx <= L + 12; bx += 4.5) for (var bz = -27; bz <= 27; bz += 4.5) {
        var b1 = rb(), b2 = rb(), b3 = rb(), b4 = rb(), b5 = rb(), b6 = rb(), b7 = rb(), tops = [];
        for (var tk = 0; tk < 10; tk++) tops.push([rt(), rt(), rt(), rt(), rt(), rt(), rt()]);
        var x = bx + (b1 - 0.5) * 3.6, z = bz + (b2 - 0.5) * 3.6;
        if (Math.abs(z) < belt + 1.8 || b3 > 0.5) continue;
        var radius = 0.8 + 1.6 * b4, height = radius * (0.45 + 0.4 * b5), y = floorHeight(x, z) - 0.15 * height;
        bommies.push({ x: x, z: z, r: radius, top: y + height });
        push('bommie', x, y, z, b6 * TAU, radius, height, radius * (0.8 + 0.4 * b7), [0.92 + 0.1 * b7, 0.92 + 0.08 * b5, 0.9], 0);
        for (tk = 0; tk < 10; tk++) {
          var tp = tops[tk];
          if (tp[0] > 0.3 + 0.65 * cover || (!high && tp[6] > 0.4)) continue;
          var ta = tp[1] * TAU, tr = radius * 0.7 * Math.sqrt(tp[2]), ts = 0.82 + 0.86 * tp[3], kind = topForm(tp[4]);
          var ty = y + height * Math.sqrt(Math.max(0, 1 - (tr / radius) * (tr / radius))) * 0.9 - 0.04;
          if (kind === 'soft' || kind === 'fan' || kind === 'sponge') ts *= 1.6;
          push(kind, x + Math.cos(ta) * tr, ty, z + Math.sin(ta) * tr * 0.85, tp[1] * 7 % TAU, ts, ts * (0.8 + 0.3 * tp[3]), ts, coralColor(tp[5], x, z, kind), 0);
        }
      }
      function groundTop(x, z) {
        var y = floorHeight(x, z);
        for (var k = 0; k < bommies.length; k++) {
          var bm = bommies[k], dd = Math.hypot(x - bm.x, z - bm.z) / bm.r;
          if (dd < 0.92) y = Math.max(y, bm.top - (bm.top - floorHeight(bm.x, bm.z)) * (1 - Math.sqrt(1 - dd * dd)) - 0.05);
        }
        return y;
      }
      var cell = 1.1, pCoral = 0.12 + 0.68 * cover, pAlgae = 0.04 + 0.42 * bg.algae, pRubble = 0.04 + 0.12 * bg.bleaching + 0.5 * share.rubble;
      for (var gx = -10; gx <= L + 10; gx += cell) for (var gz = -18; gz <= 18; gz += cell) {
        var jx = rd(), jz = rd(), kindRoll = rd(), variant = rd(), scaleRoll = rd(), yawRoll = rd(), colorRoll = rd(), keepRoll = rd(), tierRoll = rd();
        var dx = gx + (jx - 0.5) * cell * 0.9, dz = gz + (jz - 0.5) * cell * 0.9, az = Math.abs(dz);
        if (az < corridor || (!high && tierRoll > 0.36)) continue;
        var patchHere = patchiness(dx, dz), outside = Math.max(0, -dx, dx - L, az - belt);
        // Put the geometry budget into overlapping near gardens; distant
        // bommies carry the silhouette while open sand channels remain legible.
        var density = (az < belt ? 0.85 : 1) * (1 - (high ? 0.82 : 0.91) * smooth(3, 11, outside)) * (0.28 + 1.05 * patchHere) * (1 - 0.3 * share.sand);
        if (keepRoll > density) continue;
        var pc = pCoral * (0.45 + 0.8 * patchHere), pa = pAlgae * (1.2 - 0.5 * patchHere), pr = 0.07, ps = 0.05 * (0.5 + patchHere), pu = pRubble;
        var total = pc + pa + pr + ps + pu; if (total > 0.97) { var f = 0.97 / total; pc *= f; pa *= f; pr *= f; ps *= f; pu *= f; }
        var yaw = yawRoll * TAU, s = (0.72 + 1.08 * scaleRoll * scaleRoll + 0.14 * patchHere) * (az < belt + 1 ? 0.75 : 1), gy = groundTop(dx, dz) - 0.02 * s, room = az - 0.32, kind2;
        if (kindRoll < pc) {
          kind2 = variant > 0.93 ? 'soft' : variant > 0.88 ? 'fan' : coralForm(variant / 0.88);
          s = Math.min(s * (kind2 === 'soft' || kind2 === 'fan' ? 1.5 : 1), room / REACH[kind2]); if (s < 0.3) continue;
          push(kind2, dx, gy, dz, yaw, s, s * (0.85 + 0.3 * jx), s, coralColor(colorRoll, dx, dz, kind2), kind2 === 'fan' ? 0 : (jz - 0.5) * 0.2);
          if (az > 1.35 && outside < 7 && patchHere > 0.38 && scaleRoll > 0.36) {
            var ex = dx + Math.cos(yaw) * 0.32 * s, ez = dz + Math.sin(yaw) * 0.32 * s, es = Math.min(1.1, s * (0.75 + 0.35 * variant));
            push('encrusting', ex, groundTop(ex, ez) - 0.016, ez, yaw + 0.8, es, es, es, coralColor(colorRoll, ex, ez, 'encrusting'), 0);
            var mx = dx - Math.cos(yaw + 0.4) * 0.52 * s, mz = dz - Math.sin(yaw + 0.4) * 0.52 * s, ms = s * (0.5 + 0.35 * jx);
            if (Math.abs(mz) > 0.9) push('massive', mx, groundTop(mx, mz) - 0.018, mz, yaw - 0.6, ms, ms * 0.76, ms, coralColor(colorRoll, mx, mz, 'massive'), (jx - 0.5) * 0.1);
          }
        }
        else if (kindRoll < pc + pa) push('algae', dx, gy, dz, yaw, s * 1.2, s * (1 + 0.5 * jz), s * 1.2, [1, 1, 1], 0);
        else if (kindRoll < pc + pa + pr) {
          var rs = Math.min(s * 0.8, room / REACH.rock); if (rs < 0.25) continue;
          var tone = 0.85 + 0.2 * colorRoll; push('rock', dx, gy, dz, yaw, rs, rs * (0.55 + 0.5 * jx) / 0.8, rs, [tone, tone * (0.97 + 0.06 * jz), tone * 0.95], 0);
        } else if (kindRoll < pc + pa + pr + ps) push('sponge', dx, gy, dz, yaw, s, s * (0.8 + 0.6 * jx), s, coralColor(colorRoll, dx, dz, 'sponge'), 0);
        else if (kindRoll < pc + pa + pr + ps + pu) push('rubble', dx, gy + 0.01, dz, yaw, 0.7 + 0.3 * s, 0.7 + 0.3 * s, 0.7 + 0.3 * s, [0.9, 0.88, 0.84], 0);
      }
      // A crowded garden along the belt, as on a healthy reef: colonies touch and
      // overlap, every hard surface carries life, sand stays in its channels.
      var rg = stream(seed, 205), gcell = 0.72, gc = 0.22 + 0.85 * cover, ga = 0.05 + 0.5 * bg.algae, gu = 0.03 + 0.45 * share.rubble;
      for (var hx = -1.5; hx <= L + 1.5; hx += gcell) for (var hz = -(belt + 1.5); hz <= belt + 1.5 + 1e-6; hz += gcell) {
        var a1 = rg(), a2 = rg(), a3 = rg(), a4 = rg(), a5 = rg(), a6 = rg(), a7 = rg(), a8 = rg();
        var ux = hx + (a1 - 0.5) * gcell * 0.9, uz = hz + (a2 - 0.5) * gcell * 0.9, uaz = Math.abs(uz);
        if (uaz < 0.42 || (!high && a8 > 0.25)) continue;
        if (a3 > (0.3 + 0.7 * patchiness(ux, uz)) * (1 - 0.45 * share.sand)) continue;
        var uroom = uaz - 0.3, us = 0.5 + 0.6 * a5, uy = groundTop(ux, uz), ukind;
        if (a4 < gc) ukind = a7 > 0.9 ? 'soft' : a7 > 0.84 ? 'sponge' : ['finger', 'corymbose', 'massive', 'corymbose', 'antler', 'massive'][Math.floor(a6 * 6) % 6];
        else if (a4 < gc + ga) ukind = 'algae';
        else if (a4 < gc + ga + gu) ukind = 'rubble';
        else if (a6 < 0.3) ukind = 'rock';
        else continue;
        if (ukind === 'finger' || ukind === 'antler' || ukind === 'corymbose') us = Math.max(us, 0.62);
        us = Math.min(us * (ukind === 'algae' ? 1.3 : ukind === 'soft' || ukind === 'sponge' ? 1.4 : 1), uroom / REACH[ukind]); if (us < 0.28) continue;
        var ucol = ukind === 'algae' ? [1, 1, 1] : ukind === 'rubble' ? [0.9, 0.88, 0.84] : ukind === 'rock' ? [0.9, 0.9, 0.86] : coralColor(a7, ux, uz, ukind);
        push(ukind, ux, uy - 0.02 * us, uz, a6 * TAU, us, us * (0.85 + 0.3 * a7), us, ucol, 0, true);
        // Every hard surface carries life: a young colony settles on top of most rocks.
        if (ukind === 'rock' && a5 > 0.6 - 0.5 * cover) { var top = ['corymbose', 'massive', 'finger'][Math.floor(a8 * 3) % 3], ts2 = us * 0.5; push(top, ux, uy + 0.2 * us * (0.85 + 0.3 * a7), uz, a8 * TAU, ts2, ts2, ts2, coralColor(a8, ux, uz, top), 0, true); }
      }
      // Base forms (decorative detail follows the tier; placement never does).
      var sides = high ? 5 : 4;
      var coralMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8 }), 'coral', coralShader({ a: { value: new T.Vector4(0.25, 0, 0.1, 60) }, b: { value: new T.Vector4(0, 18, 0, 1) }, turf: turfColor })));
      var brainMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8 }), 'coral', coralShader({ a: { value: new T.Vector4(0.12, 0, 0.06, 45) }, b: { value: new T.Vector4(0.8, 24, 0, 1) }, turf: turfColor })));
      var rockMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.94 }), 'rock', rockShader));
      var algaeMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.65, side: T.DoubleSide }), 'plant', plantShader(plantMotion(0.22))));
      var softMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.76, side: T.DoubleSide }), 'plant', plantShader(plantMotion(0.45))));
      var fanMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.7, side: T.DoubleSide }), 'plant', plantShader(plantMotion(0.85))));
      var spongeMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9 }), 'coral', coralShader({ a: { value: new T.Vector4(0.35, 0, 0.0, 30) }, b: { value: new T.Vector4(0, 18, 0, 0) }, turf: turfColor })));
      // Colonies near the tape get the detailed form on the high tier; the rest
      // of the reef, and every colony on low, the light one.
      var bases = {
        finger: [function (d) { return buildBranching(T, 0.35, 0.45, 0, sides, d); }, coralMat, true],
        antler: [function (d) { return buildBranching(T, 0.38, 0.5, 1, sides, d); }, coralMat, true],
        corymbose: [function (d) { return buildBranching(T, 0.38, 0.42, 2, sides, d); }, coralMat, true],
        massive: [function (d) { return buildMassive(T, 0.4, 0.42, 3, d); }, brainMat, true],
        plate: [function (d) { return buildPlate(T, 0.45, 0.4, 5, d); }, coralMat, true],
        encrusting: [function (d) { return buildEncrusting(T, 0.44, 0.07, 7, d); }, coralMat, true],
        rock: [function () { return buildRock(T, 0.4, 7, false, rockPalette); }, rockMat],
        bommie: [function () { var g = buildRock(T, 1, 11, high ? 18 : 12, { stone: lin(0x7e786a), turf: lin(0x5e5840), cca: cca, turfAmount: 0.45 + 0.4 * bg.algae, ccaAmount: 0.3 + 0.4 * vitality }); g.scale(1, 1 / g.boundingBox.max.y, 1); return g; }, rockMat],
        algae: [function () { return buildAlgae(T, 0.18, 0.2, 2, false, algaeTints[0]); }, algaeMat],
        sponge: [function () { return buildSponge(T, 0.18, 0.42, 4, sides + 3); }, spongeMat],
        rubble: [function () { return buildRubble(T, 0.3, 13, rockPalette); }, rockMat],
        soft: [function (d) { return buildSoftCoral(T, 0.22, 0.4, 3, d); }, softMat, true],
        fan: [function (d) { return buildFan(T, 0.22, 0.5, 5, d); }, fanMat, true]
      };
      var mtx = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), pv = new T.Vector3(), sv = new T.Vector3(), color = new T.Color(), meshes = [], instances = 0;
      Object.keys(bases).forEach(function (kind) {
        var list = lists[kind]; if (!list || !list.length) return;
        var lod = high && bases[kind][2], forms = { f: G(bases[kind][0](false)), n: lod ? G(bases[kind][0](true)) : null }, chunks = {};
        // Chunks (10 m; 20 m on low, where draw calls cost most) share the GPU buffers
        // but carry their own bounds, so the diver view culls distant decoration.
        list.forEach(function (it) {
          var near = lod && !it[9] && it[4] > 0.8 && Math.abs(it[2]) < belt + 1.5 && it[0] > -1.5 && it[0] < L + 1.5, c = Math.floor((it[0] + 14) / (high ? 10 : 20)) + (near ? 'n' : 'f');
          (chunks[c] = chunks[c] || []).push(it);
        });
        Object.keys(chunks).forEach(function (c) {
          var items = chunks[c], geometry = forms[c.slice(-1)], reach = geometry.boundingSphere.radius + geometry.boundingSphere.center.length(), part = G(new T.BufferGeometry()), box = new T.Box3();
          Object.keys(geometry.attributes).forEach(function (n) { part.setAttribute(n, geometry.attributes[n]); });
          part.setIndex(geometry.index);
          var mesh = new T.InstancedMesh(part, bases[kind][1], items.length);
          items.forEach(function (it, k) {
            e.set(it[8], it[3], 0, 'YXZ'); q.setFromEuler(e); pv.set(it[0], it[1], it[2]); sv.set(it[4], it[5], it[6]);
            mesh.setMatrixAt(k, mtx.compose(pv, q, sv)); mesh.setColorAt(k, color.setRGB(it[7][0], it[7][1], it[7][2]));
            var r = reach * Math.max(it[4], it[5], it[6]);
            box.expandByPoint(pv.set(it[0] - r, it[1] - r, it[2] - r)); box.expandByPoint(pv.set(it[0] + r, it[1] + r, it[2] + r));
          });
          part.boundingBox = box; part.boundingSphere = box.getBoundingSphere(new T.Sphere());
          mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.receiveShadow = true; mesh.castShadow = kind === 'bommie' || (high && kind !== 'algae' && kind !== 'rubble' && kind !== 'encrusting');
          mesh.name = 'reef-decor-' + kind; mesh.userData.decorative = true; root.add(mesh); meshes.push(mesh); instances += items.length;
        });
      });
      // A single soft shadow layer anchors the garden where shadow maps are
      // unavailable. Only floor-rooted colonies receive it, never bommie tops.
      var shade = new Builder(), shadeSegments = 12;
      shade.useExtra('reefContactWeight');
      ['finger', 'antler', 'corymbose', 'massive', 'plate', 'rock', 'sponge', 'soft'].forEach(function (kind) {
        (lists[kind] || []).forEach(function (it) {
          if (Math.max(0, -it[0], it[0] - L, Math.abs(it[2]) - belt) > 8 || it[1] > floorHeight(it[0], it[2]) + 0.16) return;
          var radius = clamp(Math.max(it[4], it[6]) * (kind === 'plate' ? 0.46 : kind === 'sponge' || kind === 'soft' ? 0.2 : 0.38), 0.12, 0.75), first = shade.count();
          shade.extra.value = 1; shade.vertex(it[0], floorHeight(it[0], it[2]) + 0.004, it[2], 0, 1, 0, 1, 1, 1);
          shade.extra.value = 0;
          for (var s = 0; s < shadeSegments; s++) {
            var a = s / shadeSegments * TAU, px = it[0] + Math.cos(a) * radius, pz = it[2] + Math.sin(a) * radius;
            shade.vertex(px, floorHeight(px, pz) + 0.004, pz, 0, 1, 0, 1, 1, 1);
            shade.i.push(first, first + 1 + (s + 1) % shadeSegments, first + 1 + s);
          }
        });
      });
      if (shade.count()) {
        var shadeMesh = new T.Mesh(G(shade.build(T, false)), contactMaterial(high ? 0.26 : 0.32)); shadeMesh.name = 'reef-decor-contact-shade'; shadeMesh.userData.decorative = true; shadeMesh.renderOrder = 1;
        root.add(shadeMesh); meshes.push(shadeMesh);
      }
      return { meshes: meshes, instances: instances };
    }

    // ---- Water: surface sheet, light shafts and marine snow (visual streams) --
    var surface = (function () {
      // Crossing swells give a continuous water normal; a water-to-air Fresnel
      // term shows Snell's window overhead and a mirror beyond it (as in Reef3DExplore).
      var mat = M(new T.MeshBasicMaterial({ color: lin(0x8acbd2), transparent: true, opacity: 0.46, side: T.DoubleSide, depthWrite: false }));
      if (derivatives) mat.extensions = { derivatives: true };
      mat.onBeforeCompile = function (shader) {
        var parts = shaderParts(); shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefWaterEye = U.eye; shader.uniforms.reefSurfaceTop = U.top; shader.uniforms.reefSurfaceDeep = U.deep;
        if (derivatives) parts.fCommon.push('#define REEF_DERIVATIVES');
        parts.vCommon.push('varying vec3 vReefWorld;'); parts.vProject.push(WORLD_VERTEX);
        parts.fCommon.push('varying vec3 vReefWorld;uniform float reefCausticTime;uniform vec3 reefWaterEye;uniform vec3 reefSurfaceTop;uniform vec3 reefSurfaceDeep;');
        parts.fColor.push([
          'vec2 reefSea=vReefWorld.xz;',
          'float reefSeaWarpA=dot(reefSea,vec2(0.073,-0.061))-reefCausticTime*0.071;',
          'float reefSeaWarpB=dot(reefSea,vec2(-0.049,-0.087))+reefCausticTime*0.053;',
          'vec2 reefSeaP=reefSea+vec2(sin(reefSeaWarpA),sin(reefSeaWarpB))*0.53;',
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
          'vec3 reefSeaNormal=normalize(vec3(-reefSeaSlope.x*1.55,1.0,-reefSeaSlope.y*1.55));',
          'vec3 reefSeaView=normalize(reefWaterEye-vReefWorld);float reefSeaUp=clamp(abs(dot(reefSeaView,reefSeaNormal)),0.001,1.0);',
          'float reefSeaEta=mix(0.7502,1.333,step(reefWaterEye.y,vReefWorld.y));',
          'float reefSeaTransmission=1.0-reefSeaEta*reefSeaEta*(1.0-reefSeaUp*reefSeaUp);',
          'float reefWindow=smoothstep(-0.026,0.046,reefSeaTransmission);float reefSeaCosT=sqrt(max(0.0,reefSeaTransmission));',
          'float reefSeaRs=(reefSeaEta*reefSeaUp-reefSeaCosT)/max(0.001,reefSeaEta*reefSeaUp+reefSeaCosT);',
          'float reefSeaRp=(reefSeaEta*reefSeaCosT-reefSeaUp)/max(0.001,reefSeaEta*reefSeaCosT+reefSeaUp);',
          'float reefSeaFresnel=clamp(0.5*(reefSeaRs*reefSeaRs+reefSeaRp*reefSeaRp),0.0,1.0);',
          'float reefSeaRough=mix(0.02,0.94,pow(1.0-smoothstep(0.51,0.82,reefSeaUp),1.2));reefSeaFresnel=mix(reefSeaRough,reefSeaFresnel,0.27);',
          // The palette colours are output-space; convert before the material encodes.
          'vec3 reefSeaSky=pow(max(reefSurfaceTop,vec3(0.0)),vec3(2.2));vec3 reefSeaDeep=pow(max(reefSurfaceDeep,vec3(0.0)),vec3(2.2));',
          'float reefSeaSwell=dot(sin(vec4(reefSeaA,reefSeaB,reefSeaC,reefSeaD))*reefSeaAA,vec4(0.47,0.34,0.13,0.06));',
          'float reefSeaCross=sin(reefSeaA+sin(reefSeaB)*0.64)*sin(reefSeaC*0.67+sin(reefSeaD)*0.36);',
          'float reefSeaSilver=pow(max(0.0,reefSeaCross*0.68+reefSeaSwell*0.32),3.0);',
          'vec3 reefSeaReflected=reefSeaDeep*(0.83+reefSeaSwell*0.21)+reefSeaSky*(0.14+reefSeaCross*0.10+reefSeaSilver*0.18);',
          'vec3 reefSeaThrough=reefSeaSky*(0.94+reefSeaCross*0.12+reefSeaSilver*0.13)+vec3(0.012,0.026,0.023);',
          'diffuseColor.rgb=mix(reefSeaThrough,reefSeaReflected,reefSeaFresnel);',
          'diffuseColor.a*=mix(0.47,0.96,reefSeaFresnel)*(0.98+reefSeaCross*0.045);'
        ].join('\n'));
        applyParts(shader, parts, 'surface');
      };
      mat.customProgramCacheKey = function () { return key('surface'); };
      var mesh = new T.Mesh(G(new T.PlaneGeometry(400, 400, 1, 1)), mat);
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(L / 2, surfaceY, 0); mesh.name = 'reef-water-surface'; mesh.renderOrder = 2; mesh.frustumCulled = false; root.add(mesh);
      return mesh;
    })();
    if (high) (function buildShafts() {
      // Columns of scattered sunlight under openings in the surface, all along one
      // sun direction; their width faces the eye (adapted from Reef3DExplore).
      // Their own stream: skipping them on low moves nothing else.
      var rs = stream(seed, 701), height = surfaceY + 2, sun = new T.Vector3(0.42, 1, 0.3).normalize();
      var view = new T.Vector3(), across = new T.Vector3(), normal = new T.Vector3(), basis = new T.Matrix4();
      for (var k = 0; k < 7; k++) {
        var w = 1.3 + rs() * 1.7, x = -3 + rs() * (L + 6), z = (rs() - 0.5) * 14, tilt = (rs() - 0.5) * 0.06, phase = rs() * TAU, base = (0.07 + rs() * 0.04) * Math.exp(-Math.max(0, surfaceY - 8) * 0.06);
        var mat = M(new T.MeshBasicMaterial({ color: lin(0xd7eddf), transparent: true, opacity: base, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
        mat.onBeforeCompile = function (shader) {
          var parts = shaderParts(); shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefWaterEye = U.eye; shader.uniforms.reefSurfaceY = U.surface;
          parts.vCommon.push('varying vec2 vReefShaftUv;varying vec3 vReefShaftWorld;'); parts.vBegin.push('vReefShaftUv=uv;');
          parts.vProject.push('vReefShaftWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
          parts.fCommon.push('varying vec2 vReefShaftUv;varying vec3 vReefShaftWorld;uniform float reefCausticTime;uniform vec3 reefWaterEye;uniform float reefSurfaceY;');
          parts.fColor.push([
            'vec3 reefBeamSun=normalize(vec3(0.42,1.0,0.3));',
            'vec2 reefBeamSurface=vReefShaftWorld.xz+(reefSurfaceY-vReefShaftWorld.y)*reefBeamSun.xz/reefBeamSun.y;',
            'float reefBeamWave=sin(dot(reefBeamSurface,vec2(0.63,-0.41))+reefCausticTime*0.13)+0.45*sin(dot(reefBeamSurface,vec2(-0.37,0.81))-reefCausticTime*0.09);',
            'float reefAcross=abs((vReefShaftUv.x-0.5)*2.0+reefBeamWave*0.035)/mix(1.0,0.68,vReefShaftUv.y);',
            'float reefFeather=exp(-3.4*reefAcross*reefAcross)*(1.0-smoothstep(0.60,1.0,reefAcross));',
            'float reefBeamDepth=max(0.0,reefSurfaceY-vReefShaftWorld.y);',
            'float reefFall=smoothstep(0.0,0.28,vReefShaftUv.y)*(1.0-smoothstep(0.94,1.0,vReefShaftUv.y));',
            'vec3 reefBeamView=vReefShaftWorld-reefWaterEye;float reefBeamDistance=length(reefBeamView);',
            'float reefBeamFade=smoothstep(1.0,3.8,reefBeamDistance)*(1.0-smoothstep(14.0,22.0,reefBeamDistance));',
            'float reefBeamCos=dot(reefBeamView/max(reefBeamDistance,0.001),reefBeamSun);',
            'float reefBeamPhase=0.40+0.60*pow(max(0.0,reefBeamCos),3.0);',
            'float reefBeamPath=1.0-exp(-reefBeamDistance*0.23);',
            'diffuseColor.rgb*=exp(-vec3(0.052,0.024,0.014)*reefBeamDepth);',
            'diffuseColor.a*=reefFeather*reefFall*reefBeamFade*reefBeamPhase*reefBeamPath;'
          ].join('\n'));
          applyParts(shader, parts, 'shaft');
        };
        mat.customProgramCacheKey = function () { return key('shaft'); };
        var mesh = new T.Mesh(G(new T.PlaneGeometry(w, height, 1, 1)), mat);
        mesh.position.set(x, surfaceY - height * 0.5 * sun.y, z); mesh.frustumCulled = false; mesh.renderOrder = 3;
        mesh.name = 'reef-light-shaft'; mesh.userData.decorative = true;
        mesh.onBeforeRender = function (renderer, scene, camera) {
          view.setFromMatrixPosition(camera.matrixWorld).sub(this.position); across.crossVectors(sun, view);
          if (across.lengthSq() < 0.0001) across.set(1, 0, 0).cross(sun);
          across.normalize(); normal.crossVectors(across, sun).normalize();
          basis.makeBasis(across, sun, normal); this.quaternion.setFromRotationMatrix(basis); this.updateMatrixWorld();
        };
        root.add(mesh); shafts.push({ mesh: mesh, phase: phase, base: base, tilt: tilt });
      }
    })();
    var snowU = { center: { value: new T.Vector3() }, box: { value: new T.Vector3(10, 6, 10) }, time: { value: 0 }, top: { value: surfaceY - 0.2 } };
    (function buildSnow() {
      // Marine snow drifts through a gently circulating parcel of water around the eye.
      var rv = stream(seed, 801), count = high ? 700 : 240, p = new Float32Array(count * 3), drift = new Float32Array(count * 3);
      for (var k = 0; k < count; k++) {
        p[k * 3] = rv() * 10; p[k * 3 + 1] = rv() * 6; p[k * 3 + 2] = rv() * 10;
        drift[k * 3] = 0.03 + (rv() - 0.5) * 0.014; drift[k * 3 + 1] = -0.004 - rv() * 0.012; drift[k * 3 + 2] = 0.02 + (rv() - 0.5) * 0.014;
      }
      var g = G(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('reefSnowDrift', new T.Float32BufferAttribute(drift, 3));
      g.computeBoundingSphere();
      var mat = M(new T.PointsMaterial({ color: lin(0xb4d9d7), size: 0.02, sizeAttenuation: true, transparent: true, opacity: 0.36, depthWrite: false }));
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.reefWaterEye = U.eye; shader.uniforms.reefSnowCenter = snowU.center; shader.uniforms.reefSnowBox = snowU.box; shader.uniforms.reefSnowTime = snowU.time; shader.uniforms.reefSnowTop = snowU.top;
        var parts = shaderParts();
        parts.vCommon.push('uniform vec3 reefWaterEye;uniform vec3 reefSnowCenter;uniform vec3 reefSnowBox;uniform float reefSnowTime;uniform float reefSnowTop;attribute vec3 reefSnowDrift;varying float vReefSnowDepth;varying float vReefSnowSeed;varying float vReefSnowVeil;');
        parts.vBegin.push('vec3 reefSnowMin=reefSnowCenter-reefSnowBox*0.5;float reefSnowPhase=reefSnowTime*0.19-dot(position.xz,vec2(0.13,0.09));' +
          'vec3 reefSnowSurge=vec3(-0.17*cos(reefSnowPhase),0.05*sin(reefSnowTime*0.13+position.x),-0.12*cos(reefSnowPhase+0.45));' +
          'transformed=reefSnowMin+mod(position+reefSnowDrift*reefSnowTime+reefSnowSurge-reefSnowMin,reefSnowBox);if(transformed.y>reefSnowTop)transformed.y-=reefSnowBox.y;' +
          'vec3 reefSnowEdge=reefSnowBox*0.5-abs(transformed-reefSnowCenter);vReefSnowVeil=smoothstep(0.0,0.7,min(reefSnowEdge.x,min(reefSnowEdge.y,reefSnowEdge.z)));' +
          'vReefSnowDepth=length(transformed-reefWaterEye);vReefSnowSeed=fract(position.x*0.37+position.y*0.61);');
        parts.fCommon.push('varying float vReefSnowDepth;varying float vReefSnowSeed;varying float vReefSnowVeil;');
        parts.fColor.push('vec2 reefPc=gl_PointCoord*2.0-1.0;float reefPr=dot(reefPc,reefPc);if(reefPr>1.0)discard;' +
          'diffuseColor.a*=pow(1.0-reefPr,1.8)*smoothstep(0.6,1.6,vReefSnowDepth)*(1.0-smoothstep(4.0,6.5,vReefSnowDepth))*mix(0.25,0.85,vReefSnowSeed)*vReefSnowVeil;');
        applyParts(shader, parts, 'snow');
        shader.vertexShader = inject(shader.vertexShader, '#include <logdepthbuf_vertex>', 'gl_PointSize*=0.4+0.9*vReefSnowSeed*vReefSnowSeed;', 'snow-size');
      };
      mat.customProgramCacheKey = function () { return key('snow'); };
      var points = new T.Points(g, mat); points.frustumCulled = false; points.name = 'reef-marine-snow'; points.userData.decorative = true; points.renderOrder = 4;
      points.onBeforeRender = function (renderer, scene, camera) { U.eye.value.setFromMatrixPosition(camera.matrixWorld); snowU.center.value.copy(U.eye.value); };
      root.add(points);
    })();

    function update(dt, elapsed) {
      if (disposed) return;
      var t = Number.isFinite(elapsed) ? elapsed : 0;
      if (reducedMotion) { U.time.value = 4; snowU.time.value = 0; }
      else { U.time.value = t; snowU.time.value = t; }
      plantMotions.forEach(function (m) {
        m.value.x = reducedMotion ? 0 : t * 0.27; m.value.y = reducedMotion ? 0 : t * 0.82; m.value.w = reducedMotion ? 0 : 1;
      });
      shafts.forEach(function (s) {
        var k = reducedMotion ? 0 : t;
        s.mesh.material.opacity = s.base * (reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(k * 0.45 + s.phase));
      });
    }
    // The engine's water palette: output-space fog colours, extinction per metre.
    function setWater(o) {
      o = o || {};
      if (o.scatter) U.scatter.value.copy(o.scatter);
      if (o.extinction) U.extinction.value.copy(o.extinction);
      if (o.top) U.top.value.copy(o.top);
      if (o.deep) U.deep.value.copy(o.deep);
    }
    function dispose() {
      if (disposed) return; disposed = true;
      if (root.parent) root.parent.remove(root);
      root.traverse(function (o) { if (o.isInstancedMesh && typeof o.dispose === 'function') o.dispose(); });
      geometries.forEach(function (g) { g.dispose(); });
      materials.forEach(function (m) { m.dispose(); });
      textures.forEach(function (t) { t.dispose(); });
      geometries.length = 0; materials.length = 0; textures.length = 0; plantMotions.length = 0; shafts.length = 0;
      root.clear();
    }
    update(0, 0);
    return {
      root: root, surveyObjects: surveyObjects, update: update, dispose: dispose,
      layout: layout, quality: quality, surfaceY: surfaceY, floorHeight: floorHeight, tapeHeight: tape.at, contactHeight: contactHeight,
      water: { eye: U.eye, extinction: U.extinction, scatter: U.scatter, time: U.time, top: U.top, deep: U.deep }, setWater: setWater, immerse: immerse,
      stats: { decorativeMeshes: decor.meshes.length + shafts.length + 1 + (root.getObjectByName('reef-contact-shade') ? 1 : 0), decorativeInstances: decor.instances }
    };
  }

  function gridAxis(lo, hi, step, outerLo, outerHi, growth) {
    var out = [], v, s;
    for (v = lo; v < hi - 1e-6; v += step) out.push(v);
    out.push(hi);
    for (s = step, v = lo; v > outerLo + 1e-6;) { s *= growth; v = Math.max(outerLo, v - s); out.unshift(v); }
    for (s = step, v = hi; v < outerHi - 1e-6;) { s *= growth; v = Math.min(outerHi, v + s); out.push(v); }
    return out;
  }
  // The floor grid; paint(x, z, rgb, ground) fills each vertex's colour and its
  // sand / rubble weights.
  function buildGrid(T, xs, zs, height, paint) {
    var nx = xs.length, nz = zs.length, n = nx * nz, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), gr = new Float32Array(n * 2), idx = [], rgb = [0, 0, 0], g2 = [0, 0];
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
      var k = j * nx + i; pos[k * 3] = xs[i]; pos[k * 3 + 1] = height(xs[i], zs[j]); pos[k * 3 + 2] = zs[j];
      paint(xs[i], zs[j], rgb, g2); col[k * 3] = rgb[0]; col[k * 3 + 1] = rgb[1]; col[k * 3 + 2] = rgb[2]; gr[k * 2] = g2[0]; gr[k * 2 + 1] = g2[1];
    }
    for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a = j * nx + i, c = a + nx; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('reefGround', new T.BufferAttribute(gr, 2));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  // One small, seamless data map shared by sand and limestone (as in
  // Reef3DExplore): baked grain gives close-range mineral detail without many
  // fragment-noise octaves, and mipmaps turn distant grit into an even surface.
  function createSubstrateTexture(T) {
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
  // Caustics: a periodic mixture of smooth surface waves traced into a receiver
  // plane (as in Reef3DExplore); their focusing gives curved folds and bright
  // crossing cusps. Red holds the focused light, green its softer penumbra.
  function createCausticTexture(T, size) {
    var waves = [[1, 1, 0.050, 0.2], [2, -1, 0.038, 1.7], [1, -3, 0.027, 2.9], [3, 2, 0.023, 4.1], [-2, 4, 0.016, 5.4], [5, 1, 0.011, 0.8], [4, -3, 0.008, 3.6]];
    var flux = new Float32Array(size * size), data = new Uint8Array(size * size * 4), rays = size * 2;
    function wrap(v) { return (v % size + size) % size; }
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
    tex.needsUpdate = true; tex.name = 'reef-caustics';
    return tex;
  }

  global.Reef3DHabitat = {
    version: '1.0.0', create: create, normalizeLayout: normalizeLayout,
    categories: ['hard_coral', 'bleached_coral', 'recently_dead_coral', 'macroalgae', 'rock', 'rubble', 'sand'],
    coralForms: FORMS.slice(), shaderWarnings: warnings
  };
})(window);
