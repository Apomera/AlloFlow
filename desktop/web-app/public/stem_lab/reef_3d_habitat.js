/* Reef3DHabitat 1.0.0: the shallow tropical reef (5-12 m) for the Coral Reef
 * Survey Lab 3D view. Rock, coral, plant-flex, sand, caustic, light-shaft and
 * water-surface shading is adapted from Cephalopod Lab's hunt reef
 * (stem_tool_cephalopodlab.js). Survey objects depend only on the layout.
 * Decoration draws from seeded streams whose draw counts never depend on the
 * quality tier or reduced motion, so neither can move anything.
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;
  var FORMS = ['branching', 'massive', 'plate', 'encrusting'];
  var CORAL = { hard_coral: true, bleached_coral: true, recently_dead_coral: true };
  // Living pigmented tissue: browns, olive greens and purples (sRGB).
  var LIVING = [0x8a6a42, 0x6c8650, 0x7c5a8a, 0x9c7a4c, 0x5f7d55, 0x8b5d78, 0x7b5b3c, 0x6e7448];
  var warnings = [];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
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
      return { index: i, distanceM: clamp(num(p.distanceM, 0), 0, length), category: category, coralForm: form };
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

  // ---- Survey and decorative forms (metres; base at y = 0) ------------------
  function coralTone(H) {
    return function (t, cap, x, y, z, rgb) {
      var height = clamp(y / H, 0, 1), tip = smooth(0.72, 1, t);
      var g = 0.58 + 0.34 * height + (cap ? 0.06 : 0) + 0.07 * tip;
      // Pale growing tips catch the light while the branching interior stays rich.
      rgb[0] = g * (1 + 0.05 * tip); rgb[1] = g; rgb[2] = g * (1 + 0.08 * tip);
    };
  }
  function V(T, x, y, z) { return new T.Vector3(x, y, z); }
  function buildBranching(T, R, H, variant, sides, detail) {
    var b = new Builder(), style = variant % 3, phase = variant * 1.71 + 0.4, tone = coralTone(H), steps = detail ? 6 : 3;
    var k, a, dx, dz, curve, tmp = new T.Vector3();
    if (style === 0) {
      // Finger coral: a dense clump of upright, round-tipped fingers.
      var fingers = detail ? 17 : 9;
      for (k = 0; k < fingers; k++) {
        a = phase + k * 2.39996; dx = Math.cos(a); dz = Math.sin(a);
        var rr = R * 0.74 * Math.sqrt((k + 0.5) / fingers), top = H * (0.7 + 0.3 * ((k * 0.37 + variant * 0.11) % 1)) * (1 - 0.25 * rr / R), lean = R * (0.04 + 0.1 * ((k * 0.71) % 1));
        curve = [V(T, dx * rr * 0.6, -0.01, dz * rr * 0.6), V(T, dx * rr * 0.75, top * 0.35, dz * rr * 0.75),
          V(T, dx * (rr + lean * 0.6), top * 0.72, dz * (rr + lean * 0.6)), V(T, dx * (rr + lean), top, dz * (rr + lean))];
        b.tube(T, curve, R * (0.084 + 0.016 * (k % 3)), steps, sides, 0.28, tone);
      }
      var mound = new T.SphereGeometry(1, sides + 3, 4, 0, TAU, 0, Math.PI / 2);
      b.absorb(T, mound, new T.Matrix4().makeScale(R * 0.62, H * 0.12, R * 0.62), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = rgb[1] = rgb[2] = 0.6; });
    } else if (style === 1) {
      // Staghorn: forked cylindrical branches spreading outward and upward.
      var antlers = detail ? 5 : 4;
      for (k = 0; k < antlers; k++) {
        a = phase + k * 2.399963 + 0.3 * Math.sin(k * 2.1 + variant); dx = Math.cos(a); dz = Math.sin(a);
        var reach = R * (0.78 + 0.16 * ((k * 0.43) % 1)), endY = H * (0.72 + 0.28 * ((k * 0.61 + 0.3) % 1));
        curve = [V(T, dx * R * 0.09, -0.01, dz * R * 0.09), V(T, dx * R * 0.17, H * 0.28, dz * R * 0.17), V(T, dx * reach * 0.6, endY * 0.8, dz * reach * 0.6), V(T, dx * reach, endY, dz * reach)];
        b.tube(T, curve, R * (0.074 + 0.009 * (k % 3)), steps, sides, 0.58, tone);
        for (var f = 0; f < (detail ? 2 : 1); f++) {
          var base = bez(curve, f ? 0.7 : 0.37, new T.Vector3()), fa = a + (f ? 0.85 : -0.9), fx = Math.cos(fa), fz = Math.sin(fa);
          var len = R * (0.42 - 0.11 * f), rise = H * (0.34 - 0.08 * f);
          b.tube(T, [base, V(T, base.x + fx * len * 0.3, base.y + rise * 0.3, base.z + fz * len * 0.3), V(T, base.x + fx * len * 0.85, base.y + rise * 0.75, base.z + fz * len * 0.85),
            V(T, base.x + fx * len, base.y + rise, base.z + fz * len)], R * 0.044, Math.max(3, steps - 2), sides, 0.5, tone);
        }
      }
    } else {
      // Corymbose: short stalk, spreading boughs and a flat crown of upright branchlets.
      b.tube(T, [V(T, 0, -0.01, 0), V(T, 0, H * 0.15, 0), V(T, R * 0.02, H * 0.3, 0), V(T, 0, H * 0.42, 0)], R * 0.17, 3, sides, 0.2, tone);
      var twigs = detail ? 4 : 1, boughs = detail ? 6 : 5;
      for (k = 0; k < boughs; k++) {
        a = phase + k * TAU / boughs + 0.12 * Math.sin(k * 2.3 + phase); dx = Math.cos(a); dz = Math.sin(a);
        var span = R * (0.8 + 0.12 * ((k * 0.57) % 1));
        curve = [V(T, 0, H * 0.38, 0), V(T, dx * span * 0.3, H * 0.5, dz * span * 0.3), V(T, dx * span * 0.75, H * 0.55, dz * span * 0.75), V(T, dx * span, H * 0.58, dz * span)];
        b.tube(T, curve, R * 0.065, 4, sides, 0.3, tone);
        for (var w = 0; w < twigs; w++) {
          var tb = bez(curve, 0.35 + w * (0.6 / Math.max(1, twigs - 1)), tmp).clone(), top2 = H * (0.88 + 0.12 * (((k + w) * 0.39) % 1));
          b.tube(T, [tb, V(T, tb.x, tb.y + (top2 - tb.y) * 0.35, tb.z), V(T, tb.x + dx * 0.012, top2 - H * 0.1, tb.z + dz * 0.012), V(T, tb.x + dx * 0.02, top2, tb.z + dz * 0.02)],
            R * 0.041, 3, sides, 0.35, tone);
        }
      }
    }
    return b.build(T, false);
  }
  function buildMassive(T, R, H, variant, detail) {
    var seg = detail ? 40 : 16, rings = detail ? 18 : 8, ph = variant * 2.17, theta = Math.PI * 0.58, low = Math.cos(theta);
    var g = new T.SphereGeometry(1, seg, rings, 0, TAU, 0, theta), pos = g.attributes.position;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      var lump = 1 + 0.22 * (noise3(x * 1.7 + ph, y * 1.7, z * 1.7 - ph) - 0.5) + 0.07 * (noise3(x * 4.3, y * 4.3 + ph, z * 4.3) - 0.5);
      pos.setXYZ(k, (x * lump + 0.055 * y * y) * R, ((y * lump - low) / (1 - low) - 0.03) * H, z * lump * R * 0.94);
    }
    g.computeVertexNormals(); weldSphere(g, seg, rings, false);
    var b = new Builder();
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) {
      var s = 0.55 + 0.45 * smooth(-0.05, 0.6, y / H) + 0.06 * (noise3(x * 9 + ph, y * 9, z * 9) - 0.5);
      rgb[0] = rgb[1] = rgb[2] = s;
    });
    return b.build(T, false);
  }
  function buildPlate(T, R, H, variant, detail) {
    var segs = detail ? 36 : 16, rings = detail ? 7 : 3, ph = variant * 1.3, top = H * 0.62, thick = 0.012 + R * 0.03;
    var b = new Builder();
    b.tube(T, [V(T, 0, -0.01, 0), V(T, 0, top * 0.3, 0), V(T, R * 0.04, top * 0.7, 0), V(T, 0, top - thick * 0.5, 0)], R * 0.13, 3, detail ? 8 : 5, 0.25, coralTone(H));
    function edge(a) { return R * (0.87 + 0.09 * Math.sin(3 * a + ph) + 0.045 * Math.sin(7 * a + 2 * ph) + 0.018 * Math.sin(17 * a - ph)); }
    function surfaceY(r, a) { return top + H * 0.14 * r * r + R * 0.035 * Math.sin(a * 5 + ph) * r + R * 0.015 * Math.sin(a * 9 - ph) * r * r; }
    var upper = polar(T, rings, segs, function (r, a, rgb) {
      var e = edge(a) * r; rgb[0] = rgb[1] = rgb[2] = 0.8 + 0.1 * r + (r > 0.85 ? 0.12 : 0);
      return [Math.cos(a) * e, surfaceY(r, a), Math.sin(a) * e];
    }, function (a, p, at, rgb) {
      // Rim: the growing margin is pale; the plate thins toward it.
      rgb[0] = rgb[1] = rgb[2] = 0.92; return [p[at] * 1.0, p[at + 1] - thick * 0.5, p[at + 2] * 1.0];
    });
    b.absorb(T, upper, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { var s = 0.84 + 0.14 * clamp(Math.hypot(x, z) / R, 0, 1); rgb[0] = rgb[1] = rgb[2] = s; });
    // Walking the angle backwards reverses the winding, so the underside faces down.
    var under = polar(T, rings, segs, function (r, a, rgb) {
      var back = -a, e = edge(back) * r * 0.995; rgb[0] = rgb[1] = rgb[2] = 0.55;
      return [Math.cos(back) * e, surfaceY(r, back) - thick * (1 - 0.5 * r), Math.sin(back) * e];
    });
    b.absorb(T, under, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { rgb[0] = rgb[1] = rgb[2] = 0.55; });
    // The upper face is a fused colony with upright, pale-tipped branchlets.
    var shoots = detail ? 36 : 6;
    for (var q = 0; q < shoots; q++) {
      var a = q * 2.399963 + ph, r = Math.sqrt((q + 0.5) / shoots) * 0.94, e = edge(a) * r;
      var x = Math.cos(a) * e, z = Math.sin(a) * e, y = surfaceY(r, a), sh = H * (0.055 + 0.045 * noise2(q * 0.63, ph));
      b.tube(T, [V(T, x, y - 0.004, z), V(T, x, y + sh * 0.3, z), V(T, x * 1.01, y + sh * 0.8, z * 1.01), V(T, x * 1.015, y + sh, z * 1.015)], R * 0.018, 2, detail ? 5 : 4, 0.38, coralTone(H));
    }
    return b.build(T, false);
  }
  function buildEncrusting(T, R, H, variant, detail) {
    var segs = detail ? 36 : 14, rings = detail ? 8 : 4, ph = variant * 0.91;
    var g = polar(T, rings, segs, function (r, a, rgb) {
      var e = R * (0.75 + 0.25 * noise2(Math.cos(a) * 2.6 + ph, Math.sin(a) * 2.6) + 0.025 * Math.sin(a * 11 + ph)) * r, x = Math.cos(a) * e, z = Math.sin(a) * e;
      var lumps = noise2(x * 28 + ph, z * 28 - ph);
      rgb[0] = rgb[1] = rgb[2] = 0.78 + 0.18 * lumps + (r > 0.9 ? 0.08 : 0);
      return [x, 0.004 + H * Math.pow(Math.max(0, 1 - r * r), 0.52) * (0.55 + 0.45 * lumps) + H * 0.08 * Math.sin(a * 4 + ph) * r * r, z];
    }, function (a, p, at, rgb) { rgb[0] = rgb[1] = rgb[2] = 0.7; return [p[at] * 1.03, -0.012, p[at + 2] * 1.03]; });
    var b = new Builder();
    b.absorb(T, g, new T.Matrix4(), function (x, y, z, nx, ny, nz, rgb) { var s = 0.8 + 0.2 * clamp(y / H, 0, 1); rgb[0] = rgb[1] = rgb[2] = s; });
    return b.build(T, false);
  }
  // Weathered reef rock with baked turf and pink crustose coralline patches
  // (shape adapted from shapeCLHuntReefRock / colorCLHuntReefRock).
  function buildRock(T, R, variant, detail, palette) {
    var seg = typeof detail === 'number' ? detail : detail ? 22 : 12, rings = Math.round(seg * 0.62), ph = variant * 2.399963, g = new T.SphereGeometry(1, seg, rings), pos = g.attributes.position;
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      var bed = Math.sin((y + 0.18 * x) * 6.6 + ph);
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
      for (var c = 0; c < 3; c++) {
        var key = c === 0 ? 'r' : c === 1 ? 'g' : 'b';
        rgb[c] = (stone[key] * mottle * (1 - turfW - ccaW) + turf[key] * turfW + cca[key] * ccaW);
      }
    });
    return b.build(T, false);
  }
  function buildRubble(T, R, variant, palette) {
    var b = new Builder(), pieces = 10 + (variant % 3), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(1, 1, 1), p = new T.Vector3();
    function tone(x, y, z, nx, ny, nz, rgb) {
      var turfW = smooth(0.38, 0.62, noise3(x * 30 + variant, y * 30, z * 30)) * 0.85, pink = smooth(0.72, 0.82, noise3(x * 22, y * 22 + 5, z * 22)) * 0.7;
      var base = 0.66 + 0.14 * noise3(x * 60, y * 60, z * 60);
      rgb[0] = base * (1 - turfW) + palette.turf.r * turfW + (palette.cca.r - base) * pink;
      rgb[1] = base * (1 - turfW) + palette.turf.g * turfW + (palette.cca.g - base) * pink;
      rgb[2] = base * 0.97 * (1 - turfW) + palette.turf.b * turfW + (palette.cca.b - base) * pink;
    }
    for (var k = 0; k < pieces; k++) {
      var h1 = hash2(variant, k * 7 + 1), h2 = hash2(variant, k * 7 + 2), h3 = hash2(variant, k * 7 + 3), h4 = hash2(variant, k * 7 + 4);
      var len = 0.05 + 0.1 * h1, rad = 0.011 + 0.012 * h2, ang = h3 * TAU, dist = R * 0.8 * Math.sqrt(h4);
      var cyl = new T.CylinderGeometry(rad * 0.85, rad, len, 6, 2, false), cp = cyl.attributes.position;
      // Broken ends: jitter the end rings along the branch axis.
      // Keyed by angle and end, so side and cap vertices that coincide move together.
      for (var j = 0; j < cp.count; j++) if (Math.abs(Math.abs(cp.getY(j)) - len / 2) < 1e-6) {
        var spot = Math.round((Math.atan2(cp.getZ(j), cp.getX(j)) + 4) * 1000) + (cp.getY(j) > 0 ? 7777 : 0) + (Math.hypot(cp.getX(j), cp.getZ(j)) < 1e-6 ? 3333 : 0);
        cp.setY(j, cp.getY(j) + (hash2(k * 31 + spot, variant) - 0.5) * rad * 1.8);
      }
      cyl.computeVertexNormals();
      e.set(Math.PI / 2 + (h1 - 0.5) * 0.3, h2 * TAU, (h3 - 0.5) * 0.25, 'YXZ'); q.setFromEuler(e);
      p.set(Math.cos(ang) * dist, rad * 0.9 + (k % 3 === 2 ? rad * 1.4 : 0), Math.sin(ang) * dist);
      b.absorb(T, cyl, m.compose(p, q, s), tone);
    }
    for (k = 0; k < 5; k++) {
      var chip = new T.IcosahedronGeometry(0.008 + 0.006 * hash2(k, variant + 9), 0), ca = hash2(k + 40, variant) * TAU, cd = R * 0.85 * hash2(k + 50, variant);
      b.absorb(T, chip, m.makeScale(1, 0.55, 1).setPosition(Math.cos(ca) * cd, 0.003, Math.sin(ca) * cd), tone);
    }
    return b.build(T, false);
  }
  // Fleshy brown seaweed blades (adapted from createCLHuntPlantGeometry's
  // folded ribbons): each blade carries a phase for the shared surge shader.
  function buildAlgae(T, R, H, variant, detail, tint) {
    var b = new Builder(), blades = detail ? 14 : 7, sections = detail ? 8 : 5;
    b.useExtra('reefBladePhase');
    var baseC = tint.base, tipC = tint.tip;
    for (var k = 0; k < blades; k++) {
      var h1 = hash2(variant, k * 5 + 1), h2 = hash2(variant, k * 5 + 2), h3 = hash2(variant, k * 5 + 3);
      var yaw = k * 2.39996 + variant * 0.37, rr = R * 0.3 * Math.sqrt((k + 0.5) / blades), bx = Math.cos(yaw) * rr, bz = Math.sin(yaw) * rr;
      var h = H * (0.5 + 0.5 * h1), width = (0.05 + 0.04 * h2) * Math.min(1, R / 0.2), lean = 0.5 + 0.6 * h3, dx = Math.cos(yaw), dz = Math.sin(yaw);
      var turn = yaw + (h2 - 0.5) * 0.8, ax = -Math.sin(turn), az = Math.cos(turn), first = b.count();
      b.extra.value = h1 * TAU;
      for (var row = 0; row <= sections; row++) {
        var t = row / sections, env = (0.35 + 0.65 * Math.sin(t * Math.PI * 0.85)) * (1 - Math.pow(t, 4)) + 0.08 + 0.06 * Math.sin(t * 9 + k);
        var out = lean * h * t * t * 0.6, cx = bx + dx * out, cz = bz + dz * out, y = t * h * (1 - 0.12 * lean * t) - 0.004;
        var light = 0.9 + 0.1 * Math.sin(t * 7 + k);
        for (var col = 0; col < 3; col++) {
          var side = col - 1, across = side * width * 0.5 * env, fold = (1 - Math.abs(side)) * width * 0.12 * Math.sin(t * Math.PI);
          var r = (baseC.r + (tipC.r - baseC.r) * t) * light * (side === 0 ? 1.06 : 0.94);
          var gg = (baseC.g + (tipC.g - baseC.g) * t) * light * (side === 0 ? 1.06 : 0.94);
          var bb = (baseC.b + (tipC.b - baseC.b) * t) * light * (side === 0 ? 1.06 : 0.94);
          b.vertex(cx + ax * across + dx * fold, y, cz + az * across + dz * fold, 0, 1, 0, r, gg, bb);
        }
      }
      for (row = 0; row < sections; row++) for (col = 0; col < 2; col++) {
        var a0 = first + row * 3 + col; b.i.push(a0, a0 + 1, a0 + 3, a0 + 1, a0 + 4, a0 + 3);
      }
    }
    return b.build(T, true);
  }
  function buildSponge(T, R, H, variant, sides) {
    var b = new Builder();
    for (var k = 0; k < 3; k++) {
      var a = variant + k * 2.1, d = k ? R * 0.35 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, h = H * (1 - k * 0.22);
      b.tube(T, [V(T, x, -0.01, z), V(T, x, h * 0.35, z), V(T, x * 1.2, h * 0.7, z * 1.2), V(T, x * 1.3, h, z * 1.3)], R * (0.26 - k * 0.04), 4, sides, -0.25,
        function (t, cap, px, py, pz, rgb) { var s = cap ? 0.45 : 0.7 + 0.25 * t; rgb[0] = rgb[1] = rgb[2] = s; });
    }
    return b.build(T, false);
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
  function applyParts(shader, parts, where) {
    var v = shader.vertexShader, f = shader.fragmentShader;
    function put(src, anchor, list) { return list.length ? inject(src, anchor, list.join('\n'), where) : src; }
    v = put(v, '#include <common>', parts.vCommon); v = put(v, '#include <beginnormal_vertex>', parts.vNormal);
    v = put(v, '#include <begin_vertex>', parts.vBegin); v = put(v, '#include <project_vertex>', parts.vProject);
    f = put(f, '#include <common>', parts.fCommon); f = put(f, '#include <color_fragment>', parts.fColor);
    f = put(f, '#include <roughnessmap_fragment>', parts.fRough); f = put(f, '#include <normal_fragment_maps>', parts.fNormal);
    f = put(f, '#include <emissivemap_fragment>', parts.fEmissive);
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
  // Caustic light (adapted from shadeCLHuntCausticFlow): one or two warped
  // samples of the cellular map, added as light on up-facing surfaces only.
  var CAUSTIC_COMMON = [
    'uniform sampler2D reefCausticMap;uniform float reefCausticTime;uniform float reefCausticStrength;',
    'float reefCaustic(vec2 p){',
    'float t=reefCausticTime;vec2 w=vec2(sin(p.y*0.83+t*0.61),sin(p.x*0.71-t*0.53))*0.045;',
    'float c=texture2D(reefCausticMap,p*0.8+vec2(t*0.021,t*0.013)+w).r;',
    '#ifdef REEF_CAUSTIC_LAYERS',
    'c=c*0.66+texture2D(reefCausticMap,p*0.52-vec2(t*0.017,-t*0.011)-w*1.3).r*0.34;',
    '#endif',
    'return c;}'
  ].join('\n');
  var CAUSTIC_APPLY = [
    'vec3 reefUpWorld=inverseTransformDirection(normal,viewMatrix);',
    'float reefLightOpen=0.66+0.34*reefNoise(vec3(vReefWorld.xz*0.42,reefCausticTime*0.035));',
    'totalEmissiveRadiance+=diffuseColor.rgb*vec3(0.95,1.0,0.88)*reefCausticStrength*reefCaustic(vReefWorld.xz-vReefWorld.y*vec2(0.28,0.22))*smoothstep(0.05,0.85,reefUpWorld.y)*reefLightOpen;'
  ].join('\n');
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

    // Shared caustic map and clocks.
    var causticSize = high ? 256 : 128, causticTex = createCausticTexture(T, causticSize); textures.push(causticTex);
    var U = {
      map: { value: causticTex }, time: { value: 4 },
      strength: { value: 0.58 * Math.exp(-(layout.depthM - 3) / 7) }
    };
    function key(name) { return 'reef3d-' + name + '-v2|' + (derivatives ? 'd' : 'n') + (high ? 'h' : 'l'); }
    function commonFragment(parts, local) {
      if (derivatives) parts.fCommon.push('#define REEF_DERIVATIVES');
      if (high) parts.fCommon.push('#define REEF_CAUSTIC_LAYERS');
      parts.fCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''), GLSL_NOISE, CAUSTIC_COMMON);
      parts.vCommon.push('varying vec3 vReefWorld;' + (local ? 'varying vec3 vReefLocal;' : ''));
      parts.vProject.push(WORLD_VERTEX + (local ? '\nvReefLocal=position;' : ''));
      parts.fEmissive.push(CAUSTIC_APPLY);
    }
    function bindCaustics(shader) {
      shader.uniforms.reefCausticMap = U.map; shader.uniforms.reefCausticTime = U.time; shader.uniforms.reefCausticStrength = U.strength;
    }
    function patch(material, name, build) {
      if (derivatives) material.extensions = { derivatives: true };
      material.onBeforeCompile = function (shader) { build(shader); };
      material.customProgramCacheKey = function () { return key(name); };
      return material;
    }
    // Sand, ripples and turf-covered pavement (adapted from shadeCLHuntSandLight).
    var sandZone = { value: new T.Vector4(belt, bg.algae, 0, 0) };
    function floorShader(shader) {
      var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader);
      shader.uniforms.reefSandZone = sandZone;
      parts.fCommon.push('uniform vec4 reefSandZone;');
      parts.fColor.push([
        'float reefX=vReefWorld.x,reefZ=vReefWorld.z,reefBend=reefX*0.22+reefZ*0.17;',
        'float reefRipple=reefZ*19.5+sin(reefX*0.92)*1.8+sin(reefBend*2.1)*1.2;',
        'float reefRippleAA=0.3,reefGrainAA=0.3;',
        '#ifdef REEF_DERIVATIVES',
        'reefRippleAA=1.0-smoothstep(0.35,1.6,fwidth(reefRipple));',
        'reefGrainAA=1.0-smoothstep(0.3,1.2,max(fwidth(reefX),fwidth(reefZ))*40.0);',
        '#endif',
        'float reefPatch=reefNoise(vec3(vReefWorld.xz*0.7,4.8))-0.5;',
        'float reefGrain=reefNoise(vec3(vReefWorld.xz*40.0,1.7))-0.5;',
        'float reefOut=abs(reefZ)-reefSandZone.x;',
        'float reefStone=reefNoise(vec3(vReefWorld.xz*1.8,7.1));',
        'float reefPave=smoothstep(-0.3,3.8,reefOut)*smoothstep(0.31,0.66,reefNoise(vec3(vReefWorld.xz*0.29,4.2))+0.12*(reefStone-0.5)+0.22*smoothstep(3.0,14.0,-reefZ-reefSandZone.x));',
        'float reefRipplePatch=0.32+0.68*smoothstep(0.25,0.7,reefNoise(vec3(vReefWorld.xz*0.38,8.6)));',
        'float reefWave=(sin(reefRipple)+0.18*sin(reefRipple*2.0))*reefRippleAA*(1.0-reefPave)*reefRipplePatch;',
        'vec3 reefSand=vec3(0.88,0.86,0.8)*(1.0+0.022*reefWave+0.045*reefPatch+0.065*reefGrain*reefGrainAA);',
        'float reefPore=smoothstep(0.61,0.8,reefNoise(vec3(vReefWorld.xz*28.0,2.7)))*reefGrainAA;',
        'float reefCrust=smoothstep(0.62,0.79,reefNoise(vec3(vReefWorld.xz*1.35,6.1)));',
        'vec3 reefLimestone=mix(vec3(0.63,0.59,0.47),vec3(0.45,0.47,0.31),reefSandZone.y*0.6);',
        'reefLimestone=mix(reefLimestone,vec3(0.52,0.39,0.42),reefCrust*0.28)*(0.86+0.22*reefStone-0.12*reefPore);',
        'diffuseColor.rgb*=mix(reefSand,reefLimestone,reefPave);'
      ].join('\n'));
      parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.02*reefPatch,0.85,1.0);');
      parts.fNormal.push([
        '#ifdef REEF_DERIVATIVES',
        'vec2 reefRippleGrad=vec2(1.656*cos(reefX*0.92)+0.5544*cos(reefBend*2.1),19.5+0.4284*cos(reefBend*2.1));',
        'vec2 reefSlope=0.0045*(cos(reefRipple)+0.36*cos(reefRipple*2.0))*reefRippleAA*(1.0-reefPave)*reefRipplePatch*reefRippleGrad;',
        'reefSlope*=min(1.0,0.3/max(length(reefSlope),0.000001));',
        'vec3 reefViewSlope=mat3(viewMatrix)*vec3(reefSlope.x,0.0,reefSlope.y);',
        'normal=normalize(normal-reefViewSlope+normal*dot(normal,reefViewSlope));',
        '#endif'
      ].join('\n'));
      parts.fNormal.push(surfaceRelief('(reefStone*0.022-reefPore*0.002)*reefPave+reefGrain*0.0008*reefGrainAA', '0.22'));
      applyParts(shader, parts, 'floor');
    }
    function rockShader(shader) {
      var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
      parts.fColor.push([
        'float reefCoarse=reefNoise(vReefLocal*3.1+vec3(11.7,3.1,17.3));',
        'float reefGrain=reefNoise(vReefLocal*23.0+vec3(29.1,47.7,11.3));',
        'float reefGrainAA=0.4;',
        '#ifdef REEF_DERIVATIVES',
        'reefGrainAA=1.0-smoothstep(0.35,1.1,max(max(fwidth(vReefLocal.x),fwidth(vReefLocal.y)),fwidth(vReefLocal.z))*23.0);',
        '#endif',
        'float reefPit=smoothstep(0.65,0.83,reefGrain)*reefGrainAA;',
        'diffuseColor.rgb*=0.87+0.2*reefCoarse+0.1*(reefGrain-0.5)*reefGrainAA-0.08*reefPit;'
      ].join('\n'));
      parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.05*(reefCoarse-0.5),0.8,1.0);');
      parts.fNormal.push(surfaceRelief('reefCoarse*0.018+reefGrain*0.002*reefGrainAA-reefPit*0.0018', '0.3'));
      applyParts(shader, parts, 'rock');
    }
    // Polyp cups, tissue tone, brain-coral grooves and dead-coral turf
    // (adapted from shadeCLHuntCoralSurface; local space, no extra attributes).
    function coralShader(look) {
      return function (shader) {
        var parts = shaderParts(); commonFragment(parts, true); bindCaustics(shader);
        shader.uniforms.reefCoralA = look.a; shader.uniforms.reefCoralB = look.b; shader.uniforms.reefTurfColor = look.turf;
        parts.fCommon.push('uniform vec4 reefCoralA;uniform vec4 reefCoralB;uniform vec3 reefTurfColor;');
        parts.fColor.push([
          'vec3 reefQ=vReefLocal*reefCoralA.w,reefCell=floor(reefQ);vec3 reefJit=vec3(reefHash(reefCell),reefHash(reefCell+vec3(17.0,5.0,3.0)),reefHash(reefCell+vec3(3.0,11.0,7.0)))-0.5;float reefD=length(fract(reefQ)-0.5-reefJit*0.32);',
          'float reefAA=0.08,reefDetail=0.55,reefGrooveAA=0.06;',
          'float reefTissue=reefNoise(vReefLocal*6.5+vec3(5.2,1.3,8.1));',
          'float reefGrooveN=reefNoise(vReefLocal*reefCoralB.y+vec3(3.7,9.1,1.9));',
          '#ifdef REEF_DERIVATIVES',
          'reefAA=fwidth(reefD);reefDetail=1.0-smoothstep(0.3,0.9,max(max(fwidth(reefQ.x),fwidth(reefQ.y)),fwidth(reefQ.z)));',
          'reefGrooveAA=max(0.02,fwidth(reefGrooveN)*1.2);',
          '#endif',
          'float reefPoreRaw=1.0-smoothstep(0.12,0.26,reefD);',
          'float reefPore=(1.0-smoothstep(0.12,0.24+reefAA,reefD))*reefDetail;',
          'float reefRim=smoothstep(0.19,0.27,reefD)*(1.0-smoothstep(0.30,0.40+reefAA,reefD))*reefDetail;',
          'float reefGrooveRaw=1.0-smoothstep(0.018,0.065,abs(reefGrooveN-0.5));',
          'float reefGroove=(1.0-smoothstep(0.018,0.065+reefGrooveAA,abs(reefGrooveN-0.5)))*reefCoralB.x;',
          'diffuseColor.rgb*=(1.0-reefCoralA.x*reefPore+reefCoralA.z*reefRim)*(0.84+0.28*reefTissue)*(1.0-0.36*reefGroove);',
          'float reefTurf=0.0;',
          'if(reefCoralA.y>0.0){',
          '  float reefTurfN=reefNoise(vReefLocal*14.0+vec3(2.1,7.7,4.4))*0.65+reefTissue*0.35;',
          '  reefTurf=smoothstep(0.62-reefCoralA.y*0.5,0.82-reefCoralA.y*0.5,reefTurfN)*0.92;',
          '  diffuseColor.rgb=mix(diffuseColor.rgb,reefTurfColor*(0.55+0.9*reefNoise(vReefLocal*140.0+vec3(1.1,2.2,3.3))),reefTurf*(0.7+0.3*reefNoise(vReefLocal*60.0)));',
          '}'
        ].join('\n'));
        parts.fRough.push('roughnessFactor=clamp(roughnessFactor+0.25*reefTurf-0.06*reefRim+0.05*reefGroove,0.35,1.0);');
        parts.fNormal.push(surfaceRelief('((0.0011*reefRim-0.0024*reefPoreRaw*reefDetail)*reefCoralA.x-0.004*reefGrooveRaw*reefCoralB.x)*(1.0-reefTurf*0.6)', '0.38'));
        applyParts(shader, parts, 'coral');
      };
    }
    // Shared surge pulses carry bounded blade ripples (adapted from shadeCLHuntPlantFlex).
    function plantShader(motion) {
      return function (shader) {
        var parts = shaderParts(); commonFragment(parts, false); bindCaustics(shader);
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
        applyParts(shader, parts, 'plant');
      };
    }
    function plantMotion(height) { var m = { value: new T.Vector4(0, 0, height, reducedMotion ? 0 : 1) }; plantMotions.push(m); return m; }

    var stone = lin(0x857b6c), turf = lin(0x5c5338), cca = lin(0xb48a98);
    var rockPalette = { stone: stone, turf: turf, cca: cca, turfAmount: 0.75, ccaAmount: 1 };
    var algaeTints = [{ base: lin(0x5a4a1c), tip: lin(0xc2a24a) }, { base: lin(0x4b5a22), tip: lin(0xa7b04a) }, { base: lin(0x5c3d1e), tip: lin(0xb88a4a) }];
    var turfColor = { value: lin(0x7a6a3e) };

    // ---- Seafloor --------------------------------------------------------------
    var step = high ? 0.3 : 0.6;
    var xs = gridAxis(-3, L + 3, step, -45, L + 45, 1.12), zs = gridAxis(-(belt + 4), belt + 4, step, -50, 50, 1.12);
    var floorGeometry = G(buildGrid(T, xs, zs, floorHeight));
    var floorMaterial = M(patch(new T.MeshStandardMaterial({ color: lin(0xc9bda3), roughness: 0.94, metalness: 0 }), 'floor', floorShader));
    var floor = new T.Mesh(floorGeometry, floorMaterial); floor.name = 'reef-floor'; floor.receiveShadow = true; root.add(floor);

    // ---- Survey objects (layout only) ------------------------------------------
    var surveyRoot = new T.Group(); surveyRoot.name = 'reef-survey-points'; root.add(surveyRoot);
    var pts = layout.points, surveyObjects = [];
    pts.forEach(function (p, i) {
      var gap = Infinity;
      for (var j = 0; j < pts.length; j++) if (j !== i) gap = Math.min(gap, Math.abs(pts[j].distanceM - p.distanceM));
      var R = clamp(0.44 * (isFinite(gap) ? gap : 1), 0.09, 0.3), variant = Math.floor(hash2(i, 17) * 9973);
      var object = buildSurveyObject(p, R, variant);
      object.position.set(p.distanceM, floorHeight(p.distanceM, 0), 0);
      object.rotation.y = hash2(i, 41) * TAU;
      object.name = 'reef-survey-' + i;
      object.userData = { surveyPoint: i, category: p.category, coralForm: p.coralForm };
      surveyRoot.add(object); surveyObjects.push(object);
    });
    // One soft contact-shade mesh grounds colonies even on devices without
    // shadow maps. It follows the floor and never changes a survey object.
    (function buildContactShade() {
      var b = new Builder(), box = new T.Box3(), size = new T.Vector3(), segments = 20;
      b.useExtra('reefContactWeight'); root.updateMatrixWorld(true);
      surveyObjects.forEach(function (object, index) {
        if (pts[index].category === 'sand') return;
        box.setFromObject(object); if (box.isEmpty()) return; box.getSize(size);
        var radius = clamp(Math.max(size.x, size.z) * 0.72, 0.1, 0.46), x = object.position.x, z = object.position.z;
        var first = b.count(); b.extra.value = 1;
        b.vertex(x, floorHeight(x, z) + 0.003, z, 0, 1, 0, 1, 1, 1);
        b.extra.value = 0;
        for (var s = 0; s < segments; s++) {
          var angle = s / segments * TAU, px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
          b.vertex(px, floorHeight(px, pz) + 0.003, pz, 0, 1, 0, 1, 1, 1);
          b.i.push(first, first + 1 + (s + 1) % segments, first + 1 + s);
        }
      });
      if (!b.count()) return;
      var mat = M(patch(new T.MeshBasicMaterial({ color: lin(0x183c3a), transparent: true, opacity: high ? 0.24 : 0.3, depthWrite: false }), 'contact-shade', function (shader) {
        var parts = shaderParts();
        parts.vCommon.push('attribute float reefContactWeight;varying float vReefContact;');
        parts.vBegin.push('vReefContact=reefContactWeight;'); parts.fCommon.push('varying float vReefContact;');
        parts.fColor.push('diffuseColor.a*=smoothstep(0.0,1.0,vReefContact);');
        applyParts(shader, parts, 'contact-shade');
      }));
      var mesh = new T.Mesh(G(b.build(T, false)), mat); mesh.name = 'reef-contact-shade'; mesh.userData.decorative = true; root.add(mesh);
    })();
    function coralLook(category, form, variant) {
      var density = form === 'branching' ? 95 : form === 'plate' ? 85 : form === 'encrusting' ? 80 : 70;
      var groove = form === 'massive' ? (variant % 2 ? 1.0 : 0.5) : 0;
      var a = category === 'hard_coral' ? [0.3, 0, 0.1] : category === 'bleached_coral' ? [0.16, 0, 0.05] : [0.3, 0.55, 0];
      return { a: { value: new T.Vector4(a[0], a[1], a[2], density) }, b: { value: new T.Vector4(groove, 22, 0, 0) }, turf: turfColor };
    }
    function coralMaterial(category, form, variant) {
      var living = category === 'hard_coral', bleached = category === 'bleached_coral';
      var color = living ? LIVING[variant % LIVING.length] : bleached ? (variant % 2 ? 0xf6f4ee : 0xf0f3f6) : 0xc4bfb2;
      var m = new T.MeshStandardMaterial({ color: lin(color), vertexColors: true, roughness: living ? 0.74 : bleached ? 0.5 : 0.97, metalness: 0 });
      return M(patch(m, 'coral', coralShader(coralLook(category, form, variant))));
    }
    function coralGeometry(form, R, variant, detail, sides) {
      if (form === 'branching') return buildBranching(T, R, R * 1.45, variant, sides, detail);
      if (form === 'plate') return buildPlate(T, R, R * 0.95, variant, detail);
      if (form === 'encrusting') return buildEncrusting(T, R, 0.035 + R * 0.12, variant, detail);
      return buildMassive(T, R, R * 1.05, variant, detail);
    }
    function surveyMesh(geometry, material, name) {
      var mesh = new T.Mesh(G(geometry), material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
    }
    function buildSurveyObject(p, R, variant) {
      var group = new T.Group(), c = p.category;
      if (CORAL[c]) {
        var geometry = coralGeometry(p.coralForm, R, variant, true, 8);
        group.add(surveyMesh(geometry, coralMaterial(c, p.coralForm, variant), 'reef-coral'));
        if (c === 'recently_dead_coral') group.add(turfFuzz(geometry, variant));
      } else if (c === 'macroalgae') {
        var motion = plantMotion(R * 1.05);
        var mat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62, side: T.DoubleSide }), 'plant', plantShader(motion)));
        group.add(surveyMesh(buildAlgae(T, R, R * 1.05, variant, true, algaeTints[variant % algaeTints.length]), mat, 'reef-macroalgae'));
      } else if (c === 'rock') {
        var rockMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.93 }), 'rock', rockShader));
        var rock = surveyMesh(buildRock(T, R, variant, true, rockPalette), rockMat, 'reef-rock'); rock.scale.y = 0.95; group.add(rock);
      } else if (c === 'rubble') {
        var rubbleMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95 }), 'rock', rockShader));
        group.add(surveyMesh(buildRubble(T, R, variant, rockPalette), rubbleMat, 'reef-rubble'));
      } else {
        // Sand (and any unknown category): a faintly rippled patch in the floor material.
        var sandPatch = polar(T, 4, 20, function (r, a, rgb) {
          rgb[0] = rgb[1] = rgb[2] = 1; var x = Math.cos(a) * R * 1.1 * r, z = Math.sin(a) * R * 1.1 * r;
          return [x, 0.003 + 0.002 * Math.sin(z * 26 + x * 1.5) * (1 - r), z];
        });
        var sand = surveyMesh(sandPatch, floorMaterial, 'reef-sand'); sand.castShadow = false; group.add(sand);
      }
      return group;
    }
    // Recently dead coral: short brown turf filaments starting to cover the skeleton.
    function turfFuzz(geometry, variant) {
      var pos = geometry.attributes.position, nor = geometry.attributes.normal, out = [], strideK = Math.max(1, Math.floor(pos.count / 700));
      for (var k = 0; k < pos.count; k += strideK) {
        var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
        if (noise3(x * 14 + 2.1, y * 14 + 7.7, z * 14 + 4.4) < 0.42) continue;
        var len = 0.004 + 0.006 * hash2(k, variant), jx = (hash2(k, 3) - 0.5) * 0.5, jz = (hash2(k, 5) - 0.5) * 0.5;
        out.push(x, y, z, x + (nor.getX(k) + jx) * len, y + (nor.getY(k) + 0.2) * len, z + (nor.getZ(k) + jz) * len);
      }
      var g = G(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(out, 3)); g.computeBoundingSphere();
      var lines = new T.LineSegments(g, M(new T.LineBasicMaterial({ color: lin(0x6f5e38), transparent: true, opacity: 0.85 })));
      lines.name = 'reef-turf-fuzz'; return lines;
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
      for (i = 0; i < n; i++) { var m = -Infinity; for (k = -3; k <= 3; k++) m = Math.max(m, top[clamp(i + k, 0, n - 1)]); dil[i] = m; }
      for (var pass = 0; pass < 2; pass++) {
        for (i = 0; i < n; i++) { var s = 0; for (k = -3; k <= 3; k++) s += dil[clamp(i + k, 0, n - 1)]; out[i] = Math.max(s / 7, top[i]); }
        dil.set(out);
      }
      return { step: stepX, heights: out, at: function (x) { var f = clamp(x / stepX, 0, n - 1), a = Math.floor(f), b = Math.min(n - 1, a + 1); return out[a] + (out[b] - out[a]) * (f - a); } };
    }
    (function buildTape() {
      var n = Math.max(2, Math.ceil(L / 0.04)), half = 0.02, p = [], nrm = [], idx = [];
      for (var i = 0; i <= n; i++) {
        var x = L * i / n, y = tape.at(x), y0 = tape.at(Math.max(0, x - 0.02)), y1 = tape.at(Math.min(L, x + 0.02)), sl = (y1 - y0) / 0.04, ln = Math.hypot(sl, 1);
        p.push(x, y, -half, x, y, half); nrm.push(-sl / ln, 1 / ln, 0, -sl / ln, 1 / ln, 0);
        if (i < n) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var g = G(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
      g.setIndex(idx); g.computeBoundingBox(); g.computeBoundingSphere();
      var mat = M(new T.MeshStandardMaterial({ color: lin(0xf4c430), roughness: 0.5, emissive: lin(0x7a5c00), emissiveIntensity: 0.7, side: T.DoubleSide }));
      var mesh = new T.Mesh(g, mat); mesh.name = 'reef-tape'; mesh.receiveShadow = true; root.add(mesh);
      // Small marks every 0.5 m, larger ones every metre, red every 5 m.
      var sets = { half: [], metre: [], five: [] };
      for (var d = 0; d <= L + 1e-6; d += 0.5) {
        var whole = Math.abs(d - Math.round(d)) < 1e-6, five = whole && Math.round(d) % 5 === 0;
        (five ? sets.five : whole ? sets.metre : sets.half).push(d);
      }
      var dims = { half: [0.007, 0.004, 0.034, 0x1c1c1c], metre: [0.012, 0.007, 0.05, 0x111111], five: [0.018, 0.009, 0.064, 0xc0392b] };
      var mtx = new T.Matrix4();
      Object.keys(sets).forEach(function (name) {
        var list = sets[name]; if (!list.length) return;
        var dm = dims[name], im = new T.InstancedMesh(G(new T.BoxGeometry(dm[0], dm[1], dm[2])), M(new T.MeshStandardMaterial({ color: lin(dm[3]), roughness: 0.6 })), list.length);
        list.forEach(function (x, k) { im.setMatrixAt(k, mtx.makeTranslation(x, tape.at(x) + dm[1] * 0.5, 0)); });
        im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.name = 'reef-tape-marks-' + name; im.userData.distancesM = list.slice(); root.add(im);
      });
      var stakeGeo = G(new T.CylinderGeometry(0.007, 0.007, 0.5, 8)), stakeMat = M(new T.MeshStandardMaterial({ color: lin(0x6f7378), metalness: 0.6, roughness: 0.4 }));
      [0, L].forEach(function (x, k) {
        var stake = new T.Mesh(stakeGeo, stakeMat); stake.position.set(x + (k ? 0.03 : -0.03), floorHeight(x, 0) + 0.2, 0); stake.name = 'reef-tape-stake'; stake.castShadow = true; root.add(stake);
      });
    })();

    // ---- Decorative reef (seeded; draw counts fixed per slot) ----------------
    var decor = buildDecor();
    function buildDecor() {
      var lists = {}, bommies = [], rb = stream(seed, 202), rd = stream(seed, 201), corridor = 0.6, cover = bg.coralCover;
      function push(kind, x, y, z, yaw, sx, sy, sz, color, tilt) { (lists[kind] = lists[kind] || []).push([x, y, z, yaw, sx, sy, sz, color, tilt || 0]); }
      // Reef patches and sand channels: a seeded density field (two fixed draws).
      var rp = stream(seed, 203), o1 = rp() * 50, o2 = rp() * 50, rt = stream(seed, 204);
      function patchiness(x, z) {
        return smooth(0.33, 0.68, noise2(x * 0.16 + o1, z * 0.16 + o2) * 0.78 + noise2(x * 0.46 - o2, z * 0.46 + o1) * 0.22);
      }
      function coralColor(roll, x, z) {
        if (roll < bg.bleaching) return [1, 1, 1];
        if (roll < bg.bleaching * 1.15) return [0.55, 0.5, 0.4];
        // Neighbouring colonies share a dominant pigment; occasional individuals
        // vary within the garden, rather than every slot choosing a new hue.
        var pigment = noise2(x * 0.24 + o2, z * 0.24 - o1), index = (Math.floor(pigment * 19) + (roll > 0.84 ? 2 : 0)) % LIVING.length;
        var c = lin(LIVING[index]), tone = 1.32 + 0.18 * roll; return [c.r * tone, c.g * tone, c.b * tone];
      }
      function coralForm(roll) { return roll < 0.18 ? 'finger' : roll < 0.38 ? 'antler' : roll < 0.55 ? 'corymbose' : roll < 0.85 ? 'massive' : 'plate'; }
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
          var ta = tp[1] * TAU, tr = radius * 0.7 * Math.sqrt(tp[2]), ts = 0.82 + 0.86 * tp[3];
          var ty = y + height * Math.sqrt(Math.max(0, 1 - (tr / radius) * (tr / radius))) * 0.9 - 0.04;
          push(coralForm(tp[4]), x + Math.cos(ta) * tr, ty, z + Math.sin(ta) * tr * 0.85, tp[1] * 7 % TAU, ts, ts * (0.8 + 0.3 * tp[3]), ts, coralColor(tp[5], x, z), 0);
        }
      }
      function groundAt(x, z) {
        var y = floorHeight(x, z);
        for (var k = 0; k < bommies.length; k++) {
          var bm = bommies[k], dd = Math.hypot(x - bm.x, z - bm.z) / bm.r;
          if (dd < 0.92) y = Math.max(y, bm.top - (bm.top - floorHeight(bm.x, bm.z)) * (1 - Math.sqrt(1 - dd * dd)) - 0.05);
        }
        return y;
      }
      var cell = 1.1, pCoral = 0.12 + 0.68 * cover, pAlgae = 0.04 + 0.42 * bg.algae, pRubble = 0.04 + 0.12 * bg.bleaching;
      for (var gx = -10; gx <= L + 10; gx += cell) for (var gz = -18; gz <= 18; gz += cell) {
        var jx = rd(), jz = rd(), kindRoll = rd(), variant = rd(), scaleRoll = rd(), yawRoll = rd(), colorRoll = rd(), keepRoll = rd(), tierRoll = rd();
        var dx = gx + (jx - 0.5) * cell * 0.9, dz = gz + (jz - 0.5) * cell * 0.9, az = Math.abs(dz);
        if (az < corridor || (!high && tierRoll > 0.36)) continue;
        var patchHere = patchiness(dx, dz), outside = Math.max(0, -dx, dx - L, az - belt);
        // Put the geometry budget into overlapping near gardens; distant
        // bommies carry the silhouette while open sand channels remain legible.
        var density = (az < belt ? 0.5 : 1) * (1 - (high ? 0.82 : 0.91) * smooth(3, 11, outside)) * (0.28 + 1.05 * patchHere);
        if (keepRoll > density) continue;
        var pc = pCoral * (0.45 + 0.8 * patchHere), pa = pAlgae * (1.2 - 0.5 * patchHere), pr = 0.14, ps = 0.05 * (0.5 + patchHere), pu = pRubble;
        var total = pc + pa + pr + ps + pu; if (total > 0.97) { var f = 0.97 / total; pc *= f; pa *= f; pr *= f; ps *= f; pu *= f; }
        var yaw = yawRoll * TAU, s = 0.72 + 1.08 * scaleRoll * scaleRoll + 0.14 * patchHere, gy = groundAt(dx, dz) - 0.02 * s;
        if (kindRoll < pc) {
          push(coralForm(variant), dx, gy, dz, yaw, s, s * (0.85 + 0.3 * jx), s, coralColor(colorRoll, dx, dz), (jz - 0.5) * 0.2);
          if (az > 1.35 && outside < 7 && patchHere > 0.38 && scaleRoll > 0.36) {
            var ex = dx + Math.cos(yaw) * 0.32 * s, ez = dz + Math.sin(yaw) * 0.32 * s, es = s * (0.9 + 0.45 * variant);
            push('encrusting', ex, groundAt(ex, ez) - 0.016, ez, yaw + 0.8, es, es, es, coralColor(colorRoll, ex, ez), 0);
            var mx = dx - Math.cos(yaw + 0.4) * 0.52 * s, mz = dz - Math.sin(yaw + 0.4) * 0.52 * s, ms = s * (0.5 + 0.35 * jx);
            if (Math.abs(mz) > 0.9) push('massive', mx, groundAt(mx, mz) - 0.018, mz, yaw - 0.6, ms, ms * 0.76, ms, coralColor(colorRoll, mx, mz), (jx - 0.5) * 0.1);
          }
        }
        else if (kindRoll < pc + pa) push('algae', dx, gy, dz, yaw, s * 1.2, s * (1 + 0.5 * jz), s * 1.2, [1, 1, 1], 0);
        else if (kindRoll < pc + pa + pr) {
          var tone = 0.85 + 0.2 * colorRoll; push('rock', dx, gy, dz, yaw, s * 0.8, s * (0.5 + 0.5 * jx), s * 0.8, [tone, tone * (0.97 + 0.06 * jz), tone * 0.95], 0);
        } else if (kindRoll < pc + pa + pr + ps) {
          var sp = [[0.95, 0.45, 0.18], [0.55, 0.32, 0.6], [0.85, 0.7, 0.25]][Math.floor(colorRoll * 3) % 3];
          push('sponge', dx, gy, dz, yaw, s, s * (0.8 + 0.6 * jx), s, sp, 0);
        } else if (kindRoll < pc + pa + pr + ps + pu) push('rubble', dx, gy + 0.01, dz, yaw, 0.7 + 0.3 * s, 0.7 + 0.3 * s, 0.7 + 0.3 * s, [0.85, 0.83, 0.78], 0);
      }
      // Base forms (decorative detail follows the tier; placement never does).
      var sides = high ? 5 : 4;
      var coralLookDecor = { a: { value: new T.Vector4(0.25, 0, 0.08, 75) }, b: { value: new T.Vector4(0.35, 18, 0, 0) }, turf: turfColor };
      var coralMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.78 }), 'coral', coralShader(coralLookDecor)));
      var rockMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.94 }), 'rock', rockShader));
      var decorAlgaeMotion = plantMotion(0.22);
      var algaeMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.65, side: T.DoubleSide }), 'plant', plantShader(decorAlgaeMotion)));
      var spongeMat = M(patch(new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9 }), 'coral',
        coralShader({ a: { value: new T.Vector4(0.35, 0, 0.0, 30) }, b: { value: new T.Vector4(0, 18, 0, 0) }, turf: turfColor })));
      var bases = {
        finger: [function () { return buildBranching(T, 0.35, 0.45, 0, sides, false); }, coralMat],
        antler: [function () { return buildBranching(T, 0.38, 0.5, 1, sides, false); }, coralMat],
        corymbose: [function () { return buildBranching(T, 0.38, 0.42, 2, sides, false); }, coralMat],
        massive: [function () { return buildMassive(T, 0.4, 0.42, 3, false); }, coralMat],
        plate: [function () { return buildPlate(T, 0.45, 0.4, 5, false); }, coralMat],
        encrusting: [function () { return buildEncrusting(T, 0.44, 0.065, 7, false); }, coralMat],
        rock: [function () { return buildRock(T, 0.4, 7, false, rockPalette); }, rockMat],
        bommie: [function () { var g = buildRock(T, 1, 11, high ? 18 : 12, { stone: lin(0x7a7266), turf: lin(0x5e5840), cca: cca, turfAmount: 0.45 + 0.4 * bg.algae, ccaAmount: 0.45 }); g.scale(1, 1 / g.boundingBox.max.y, 1); return g; }, rockMat],
        algae: [function () { return buildAlgae(T, 0.18, 0.2, 2, false, algaeTints[0]); }, algaeMat],
        sponge: [function () { return buildSponge(T, 0.18, 0.42, 4, sides); }, spongeMat],
        rubble: [function () { return buildRubble(T, 0.3, 13, rockPalette); }, rockMat]
      };
      var mtx = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), pv = new T.Vector3(), sv = new T.Vector3(), color = new T.Color(), meshes = [], instances = 0;
      Object.keys(bases).forEach(function (kind) {
        var list = lists[kind]; if (!list || !list.length) return;
        var geometry = G(bases[kind][0]()), reach = geometry.boundingSphere.radius + geometry.boundingSphere.center.length(), chunks = {};
        // 10 m chunks share the GPU buffers but carry their own bounds, so the
        // diver view culls distant decoration instead of drawing every instance.
        list.forEach(function (it) { var c = Math.floor((it[0] + 14) / 10); (chunks[c] = chunks[c] || []).push(it); });
        Object.keys(chunks).forEach(function (c) {
          var items = chunks[c], part = G(new T.BufferGeometry()), box = new T.Box3();
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
          mesh.receiveShadow = true; mesh.castShadow = kind === 'bommie';
          mesh.name = 'reef-decor-' + kind; mesh.userData.decorative = true; root.add(mesh); meshes.push(mesh); instances += items.length;
        });
      });
      // A single soft shadow layer anchors the garden where shadow maps are
      // unavailable. Only floor-rooted colonies receive it, never bommie tops.
      var shade = new Builder(), shadeSegments = 12;
      shade.useExtra('reefContactWeight');
      ['finger', 'antler', 'corymbose', 'massive', 'plate', 'rock', 'sponge'].forEach(function (kind) {
        (lists[kind] || []).forEach(function (it) {
          if (Math.max(0, -it[0], it[0] - L, Math.abs(it[2]) - belt) > 8 || it[1] > floorHeight(it[0], it[2]) + 0.16) return;
          var radius = clamp(Math.max(it[4], it[6]) * (kind === 'plate' ? 0.42 : 0.34), 0.16, 0.7), first = shade.count();
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
        var shadeMat = M(patch(new T.MeshBasicMaterial({ color: lin(0x153936), transparent: true, opacity: high ? 0.24 : 0.3, depthWrite: false }), 'contact-shade', function (shader) {
          var parts = shaderParts(); parts.vCommon.push('attribute float reefContactWeight;varying float vReefContact;');
          parts.vBegin.push('vReefContact=reefContactWeight;'); parts.fCommon.push('varying float vReefContact;');
          parts.fColor.push('diffuseColor.a*=smoothstep(0.0,1.0,vReefContact);'); applyParts(shader, parts, 'contact-shade');
        }));
        var shadeMesh = new T.Mesh(G(shade.build(T, false)), shadeMat); shadeMesh.name = 'reef-decor-contact-shade'; shadeMesh.userData.decorative = true;
        root.add(shadeMesh); meshes.push(shadeMesh);
      }
      return { meshes: meshes, instances: instances };
    }

    // ---- Water: surface sheet, light shafts and marine snow (visual streams) --
    var surface = (function () {
      var mat = M(new T.MeshBasicMaterial({ color: lin(0xa4d9db), transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false }));
      if (derivatives) mat.extensions = { derivatives: true };
      // Snell's window: a bright disc overhead, a darker mirror beyond about 49 degrees.
      mat.onBeforeCompile = function (shader) {
        var parts = shaderParts(); shader.uniforms.reefCausticTime = U.time;
        if (derivatives) parts.fCommon.push('#define REEF_DERIVATIVES');
        parts.vCommon.push('varying vec3 vReefWorld;'); parts.vProject.push(WORLD_VERTEX);
        parts.fCommon.push('varying vec3 vReefWorld;uniform float reefCausticTime;');
        parts.fColor.push([
          'vec2 reefSea=vReefWorld.xz;',
          'float reefSeaA=dot(reefSea,vec2(0.51,0.19))+sin(dot(reefSea,vec2(0.11,-0.14)))*0.70-reefCausticTime*0.23;',
          'float reefSeaB=dot(reefSea,vec2(-0.23,0.67))+sin(dot(reefSea,vec2(0.15,0.08)))*0.55+reefCausticTime*0.17;',
          'float reefSeaAA=0.0,reefSeaBA=0.0;',
          '#ifdef REEF_DERIVATIVES',
          'reefSeaAA=1.0-smoothstep(0.55,1.75,fwidth(reefSeaA));reefSeaBA=1.0-smoothstep(0.55,1.75,fwidth(reefSeaB));',
          '#endif',
          'float reefSwell=sin(reefSeaA)*reefSeaAA*0.5+sin(reefSeaB)*reefSeaBA*0.5;',
          'float reefCrest=smoothstep(0.35,0.94,sin(reefSeaA))*reefSeaAA*0.55+smoothstep(0.45,0.97,sin(reefSeaB))*reefSeaBA*0.45;',
          'vec3 reefSeaView=normalize(cameraPosition-vReefWorld);',
          'vec3 reefSeaNormal=normalize(vec3(-0.055*cos(reefSeaA)*reefSeaAA,1.0,-0.065*cos(reefSeaB)*reefSeaBA));',
          'float reefSeaUp=abs(dot(reefSeaView,reefSeaNormal));float reefWindow=smoothstep(0.64,0.69,reefSeaUp);',
          'float reefSeaAngle=smoothstep(0.035,0.18,reefSeaUp);',
          'diffuseColor.rgb*=mix(vec3(0.31,0.54,0.62),vec3(1.05,1.08,0.98),reefWindow)*(1.0+reefSeaAngle*(reefSwell*0.09+reefCrest*0.17));',
          'diffuseColor.a*=(0.75+0.25*reefWindow)*(1.0+reefSeaAngle*(reefSwell*0.18+reefCrest*0.3-(reefSeaAA*0.55+reefSeaBA*0.45)*0.2));'
        ].join('\n'));
        applyParts(shader, parts, 'surface');
      };
      mat.customProgramCacheKey = function () { return key('surface'); };
      var mesh = new T.Mesh(G(new T.PlaneGeometry(400, 400, 1, 1)), mat);
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(L / 2, surfaceY, 0); mesh.name = 'reef-water-surface'; mesh.renderOrder = 2; root.add(mesh);
      return mesh;
    })();
    if (high) (function buildShafts() {
      // Tall additive planes hung from the surface (adapted from Cephalopod Lab's
      // sun shafts). Their own stream: skipping them on low moves nothing else.
      var rs = stream(seed, 701), height = surfaceY + 1.5;
      for (var k = 0; k < 7; k++) {
        var w = 1.2 + rs() * 1.8, x = -3 + rs() * (L + 6), z = (rs() - 0.5) * 14, tilt = (rs() - 0.5) * 0.06, phase = rs() * TAU, base = (0.032 + rs() * 0.025) * Math.exp(-Math.max(0, surfaceY - 8) * 0.06);
        var mat = M(new T.MeshBasicMaterial({ color: new T.Color(0xcdefff), transparent: true, opacity: base, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
        mat.onBeforeCompile = function (shader) {
          var parts = shaderParts();
          parts.vCommon.push('varying vec2 vReefShaftUv;varying float vReefShaftDistance;'); parts.vBegin.push('vReefShaftUv=uv;');
          parts.vProject.push('vReefShaftDistance=length(mvPosition.xyz);');
          shader.uniforms.reefCausticTime = U.time;
          parts.fCommon.push('varying vec2 vReefShaftUv;varying float vReefShaftDistance;uniform float reefCausticTime;');
          parts.fColor.push('float reefAcross=abs(vReefShaftUv.x-0.5)*2.0/(0.95-0.58*vReefShaftUv.y);float reefFeather=1.0-smoothstep(0.0,1.0,reefAcross);' +
            'float reefFall=smoothstep(0.0,0.22,vReefShaftUv.y)*(1.0-smoothstep(0.78,1.0,vReefShaftUv.y));' +
            'float reefStrands=0.82+0.18*sin(vReefShaftUv.x*47.0+sin(vReefShaftUv.y*4.0+reefCausticTime*0.17));' +
            'float reefShaftFade=smoothstep(0.8,2.6,vReefShaftDistance)*(1.0-smoothstep(18.0,40.0,vReefShaftDistance));' +
            'diffuseColor.a*=reefFeather*reefFeather*reefFall*reefStrands*reefShaftFade*(0.42+0.58*vReefShaftUv.y);');
          applyParts(shader, parts, 'shaft');
        };
        mat.customProgramCacheKey = function () { return key('shaft'); };
        var mesh = new T.Mesh(G(new T.PlaneGeometry(w, height, 1, 1)), mat);
        mesh.position.set(x, surfaceY - height / 2, z); mesh.rotation.order = 'YXZ'; mesh.rotation.z = tilt; mesh.frustumCulled = false; mesh.renderOrder = 3;
        mesh.name = 'reef-light-shaft'; mesh.userData.decorative = true;
        mesh.onBeforeRender = function (renderer, scene, camera) {
          this.rotation.y = Math.atan2(camera.position.x - this.position.x, camera.position.z - this.position.z);
          // Project one common sun direction into each camera-facing ribbon.
          this.rotation.z = -Math.atan(0.28 * Math.cos(this.rotation.y) - 0.22 * Math.sin(this.rotation.y)); this.updateMatrixWorld();
        };
        root.add(mesh); shafts.push({ mesh: mesh, phase: phase, base: base, tilt: tilt });
      }
    })();
    var snowU = { center: { value: new T.Vector3() }, box: { value: new T.Vector3(8, 5, 8) }, time: { value: 0 }, top: { value: surfaceY - 0.15 } };
    (function buildSnow() {
      var rv = stream(seed, 801), count = high ? 700 : 240, p = new Float32Array(count * 3), drift = new Float32Array(count * 3);
      for (var k = 0; k < count; k++) {
        p[k * 3] = rv() * 8; p[k * 3 + 1] = rv() * 5; p[k * 3 + 2] = rv() * 8;
        drift[k * 3] = (rv() - 0.5) * 0.03; drift[k * 3 + 1] = -0.004 - rv() * 0.01; drift[k * 3 + 2] = (rv() - 0.5) * 0.03;
      }
      var g = G(new T.BufferGeometry()); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('reefSnowDrift', new T.Float32BufferAttribute(drift, 3));
      g.computeBoundingSphere();
      var mat = M(new T.PointsMaterial({ color: new T.Color(0xd5e6de), size: 0.012, sizeAttenuation: true, transparent: true, opacity: 0.3, depthWrite: false }));
      mat.onBeforeCompile = function (shader) {
        shader.uniforms.reefSnowCenter = snowU.center; shader.uniforms.reefSnowBox = snowU.box; shader.uniforms.reefSnowTime = snowU.time; shader.uniforms.reefSnowTop = snowU.top;
        var parts = shaderParts();
        parts.vCommon.push('uniform vec3 reefSnowCenter;uniform vec3 reefSnowBox;uniform float reefSnowTime;uniform float reefSnowTop;attribute vec3 reefSnowDrift;varying float vReefSnowFade;');
        parts.vBegin.push('vec3 reefSnowMin=reefSnowCenter-reefSnowBox*0.5;transformed=reefSnowMin+mod(position+reefSnowDrift*reefSnowTime-reefSnowMin,reefSnowBox);if(transformed.y>reefSnowTop)transformed.y-=reefSnowBox.y;');
        parts.vProject.push('vec3 reefSnowEdge=abs((transformed-reefSnowCenter)/reefSnowBox)*2.0;vReefSnowFade=(1.0-smoothstep(0.72,1.0,max(reefSnowEdge.x,reefSnowEdge.z)))*smoothstep(0.25,0.9,length(mvPosition.xyz));');
        parts.fCommon.push('varying float vReefSnowFade;');
        parts.fColor.push('vec2 reefPc=gl_PointCoord*2.0-1.0;float reefPr=dot(reefPc,reefPc);if(reefPr>1.0)discard;diffuseColor.a*=(1.0-reefPr)*vReefSnowFade;');
        applyParts(shader, parts, 'snow');
      };
      mat.customProgramCacheKey = function () { return key('snow'); };
      var points = new T.Points(g, mat); points.frustumCulled = false; points.name = 'reef-marine-snow'; points.userData.decorative = true; points.renderOrder = 4;
      points.onBeforeRender = function (renderer, scene, camera) { snowU.center.value.copy(camera.position); };
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
        s.mesh.rotation.z = s.tilt + (reducedMotion ? 0 : 0.04 * Math.sin(k * 0.27 + s.phase));
        s.mesh.material.opacity = s.base * (reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(k * 0.45 + s.phase));
      });
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
      layout: layout, quality: quality, surfaceY: surfaceY, floorHeight: floorHeight, tapeHeight: tape.at,
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
  function buildGrid(T, xs, zs, height) {
    var nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), idx = [];
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
      var k = (j * nx + i) * 3; pos[k] = xs[i]; pos[k + 1] = height(xs[i], zs[j]); pos[k + 2] = zs[j];
    }
    for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a = j * nx + i, c = a + nx; idx.push(a, c, a + 1, a + 1, c, c + 1); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(idx);
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  // Seamless cellular caustic network (adapted from Cephalopod Lab's canvas
  // version as a DataTexture: no DOM canvas, and its own fixed generator).
  function createCausticTexture(T, size) {
    var r = mulberry32(928371), cells = [], n = 4, data = new Uint8Array(size * size * 4);
    for (var cy = 0; cy < n; cy++) for (var cx = 0; cx < n; cx++) cells.push([cx + 0.18 + r() * 0.64, cy + 0.18 + r() * 0.64]);
    for (var py = 0; py < size; py++) for (var px = 0; px < size; px++) {
      var ux = (px / size * n + 0.18 * Math.sin(py / size * TAU * 2) + n) % n, uy = (py / size * n + 0.14 * Math.sin(px / size * TAU * 2 + 0.7) + n) % n, first = 100, second = 100;
      for (var c = 0; c < cells.length; c++) {
        var dx = Math.abs(ux - cells[c][0]), dy = Math.abs(uy - cells[c][1]); dx = Math.min(dx, n - dx); dy = Math.min(dy, n - dy);
        var d2 = dx * dx + dy * dy; if (d2 < first) { second = first; first = d2; } else if (d2 < second) second = d2;
      }
      var gap = Math.sqrt(second) - Math.sqrt(first), v = Math.round(255 * Math.exp(-gap * gap * 520)), at = (py * size + px) * 4;
      data[at] = data[at + 1] = data[at + 2] = v; data[at + 3] = 255;
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
