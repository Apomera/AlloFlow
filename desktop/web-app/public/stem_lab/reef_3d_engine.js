/* Reef3D 1.0.0: renderer, water, light, fish, camera and input for the Coral
 * Reef Survey Lab 3D view. Lifecycle (quality tiers, context loss,
 * ResizeObserver, visibility pause, throttled state, dispose) follows
 * BirdLab3D. Fish bodies are lofted like Cephalopod Lab's prey fish
 * (createCLHuntFish), one silhouette and pattern per family; the water
 * backdrop adapts its createCLHuntWaterBackdrop. Needs window.Reef3DHabitat
 * and options.THREE; it never reads a global THREE. Keys are handled on the
 * canvas only.
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;
  var FAMILIES = ['parrotfish', 'surgeonfish', 'butterflyfish', 'grouper', 'snapper'];
  var DIVER = { yaw: -Math.PI / 2 + 0.38, pitch: 0.86, dist: 2.0 };
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function damp(rate, dt) { return 1 - Math.exp(-rate * dt); }
  function num(v, fallback) { if (v === null || v === undefined || v === '') return fallback; v = Number(v); return isFinite(v) ? v : fallback; }
  function hashString(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

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

  // ---- Fish -------------------------------------------------------------------
  // Unit-length bodies: rows are [z, half width, half height, centre offset],
  // snout (+Z) to peduncle. Each family keeps a recognisable outline.
  var FISH = {
    parrotfish: { length: 0.42, speed: 0.16, loop: 0.38, tail: 'lunate', tailSpan: 0.13, tailLength: 0.17, dorsal: [0.3, -0.3, 0.055, 0], anal: [0.02, -0.28, 0.045], pectoral: 0.08, eye: [0.38, 0.045, 0.018], beak: true,
      rows: [[0.5, 0.014, 0.024, -0.014], [0.48, 0.042, 0.066, -0.006], [0.44, 0.07, 0.1, 0], [0.37, 0.09, 0.13, 0.004], [0.28, 0.104, 0.15, 0.008], [0.16, 0.11, 0.158, 0.01], [0.02, 0.108, 0.156, 0.01], [-0.1, 0.098, 0.14, 0.006], [-0.2, 0.08, 0.115, 0.004], [-0.27, 0.058, 0.085, 0.002], [-0.31, 0.042, 0.06, 0], [-0.34, 0.032, 0.046, 0]],
      colors: { back: 0x1a7a6a, flank: 0x34b79c, belly: 0x9be2c6, fin: 0x2e9f8c, edge: 0xe8875a, tail: 0x2e9f8c, eye: 0xd8c25a } },
    surgeonfish: { length: 0.26, speed: 0.14, loop: 0.32, tail: 'lunate', tailSpan: 0.17, tailLength: 0.16, dorsal: [0.3, -0.3, 0.075, 1], anal: [0.16, -0.3, 0.065], pectoral: 0.08, eye: [0.34, 0.07, 0.022],
      rows: [[0.5, 0.008, 0.02, -0.03], [0.48, 0.02, 0.07, -0.02], [0.43, 0.034, 0.15, -0.01], [0.35, 0.044, 0.21, 0], [0.24, 0.05, 0.245, 0.005], [0.1, 0.05, 0.26, 0.005], [-0.04, 0.047, 0.25, 0.004], [-0.16, 0.04, 0.21, 0.002], [-0.25, 0.03, 0.14, 0], [-0.3, 0.022, 0.075, 0], [-0.33, 0.016, 0.045, 0], [-0.35, 0.014, 0.036, 0]],
      colors: { back: 0x1b3fa8, flank: 0x2f62cf, belly: 0x4a7fdc, fin: 0x22459e, edge: 0x0c1c55, tail: 0x22459e, eye: 0x1c2a44 } },
    butterflyfish: { length: 0.15, speed: 0.1, loop: 0.25, tail: 'truncate', tailSpan: 0.14, tailLength: 0.13, dorsal: [0.24, -0.3, 0.075, 1], anal: [0.1, -0.3, 0.065], pectoral: 0.07, eye: [0.33, 0.05, 0.026],
      rows: [[0.5, 0.006, 0.012, 0], [0.47, 0.012, 0.022, 0], [0.42, 0.022, 0.06, 0.005], [0.35, 0.034, 0.16, 0.01], [0.26, 0.042, 0.25, 0.01], [0.14, 0.046, 0.3, 0.008], [0.02, 0.046, 0.32, 0.006], [-0.1, 0.042, 0.3, 0.004], [-0.2, 0.034, 0.24, 0.002], [-0.27, 0.024, 0.15, 0], [-0.31, 0.016, 0.075, 0], [-0.34, 0.014, 0.05, 0]],
      colors: { back: 0xe4a812, flank: 0xf3c624, belly: 0xf7df7a, fin: 0xf0bf1e, edge: 0x1a1a1a, tail: 0xf3d55a, eye: 0x2a2116 } },
    grouper: { length: 0.75, speed: 0.09, loop: 0.3, tail: 'round', tailSpan: 0.12, tailLength: 0.15, dorsal: [0.3, -0.3, 0.06, 0], anal: [-0.02, -0.28, 0.05], pectoral: 0.1, eye: [0.39, 0.05, 0.017],
      rows: [[0.5, 0.03, 0.03, -0.022], [0.48, 0.06, 0.06, -0.014], [0.44, 0.086, 0.09, -0.006], [0.36, 0.106, 0.116, 0], [0.26, 0.116, 0.13, 0.004], [0.14, 0.118, 0.136, 0.006], [0.02, 0.114, 0.132, 0.006], [-0.1, 0.1, 0.118, 0.004], [-0.2, 0.082, 0.098, 0.002], [-0.27, 0.062, 0.074, 0], [-0.31, 0.048, 0.056, 0], [-0.34, 0.04, 0.048, 0]],
      colors: { back: 0x5a4130, flank: 0x7b5c40, belly: 0xa88b6a, fin: 0x6a4e36, edge: 0x2c2018, tail: 0x6a4e36, eye: 0x9a7a3c } },
    snapper: { length: 0.38, speed: 0.2, loop: 0.45, tail: 'forked', tailSpan: 0.13, tailLength: 0.18, dorsal: [0.28, -0.26, 0.06, 0], anal: [0.0, -0.24, 0.045], pectoral: 0.08, eye: [0.39, 0.035, 0.02],
      rows: [[0.5, 0.008, 0.012, -0.008], [0.48, 0.02, 0.03, -0.005], [0.44, 0.04, 0.062, 0], [0.36, 0.058, 0.092, 0.004], [0.26, 0.066, 0.112, 0.006], [0.14, 0.07, 0.12, 0.006], [0.02, 0.066, 0.116, 0.005], [-0.1, 0.058, 0.102, 0.003], [-0.2, 0.044, 0.08, 0.002], [-0.27, 0.032, 0.058, 0], [-0.31, 0.024, 0.04, 0], [-0.34, 0.02, 0.032, 0]],
      colors: { back: 0xb4503f, flank: 0xe39a8c, belly: 0xf3ddd3, fin: 0xd98272, edge: 0xf2c22a, tail: 0xf2c22a, eye: 0xd8a040 } }
  };
  // Crisp markings per family in body units (linear colours); vertex colours carry the shading.
  var FISH_PAINT = {
    parrotfish: 'float sc=abs(length(vec2(fract(p.z*46.0+mod(floor(p.y*52.0),2.0)*0.5)-0.5,(fract(p.y*52.0)-0.28)*1.5))-0.64);' +
      'c*=1.0-0.14*(1.0-smoothstep(0.04,0.12,sc))*detail*step(p.z,0.3);float head=smoothstep(0.22,0.3,p.z);' +
      'c=mix(c,vec3(0.87,0.30,0.16),max(reefBand(p.y-(0.06+0.3*(p.z-0.36)),0.012),reefBand(p.y-(-0.03-0.4*(p.z-0.34)),0.012))*head);',
    surgeonfish: 'c*=1.0-0.35*reefBand(fract(p.y*14.0+sin(p.z*18.0)*0.25)-0.5,0.08)*detail*smoothstep(-0.25,0.2,p.z);' +
      'c=mix(c,vec3(0.92,0.80,0.40),1.0-smoothstep(0.012,0.02,length(vec2(p.z+0.31,p.y*0.8))));',
    butterflyfish: 'c=mix(c,vec3(0.02),reefBand(p.z-0.33+p.y*0.25,0.035)*step(-0.24,p.y));float o=length(vec2(p.z+0.2,p.y-0.13));' +
      'c=mix(c,vec3(0.9,0.88,0.78),1.0-smoothstep(0.034,0.042,o));c=mix(c,vec3(0.02,0.02,0.03),1.0-smoothstep(0.022,0.03,o));' +
      'c*=1.0-0.25*reefBand(fract((p.y+p.z*0.6)*18.0)-0.5,0.1)*detail;',
    grouper: 'float n=reefFishNoise(p.zy*14.0+vec2(3.1,7.7));float spot=smoothstep(0.72,0.8,reefFishNoise(p.zy*34.0+vec2(9.2,1.3)))*detail;' +
      'float bars=smoothstep(0.35,0.8,sin(p.z*24.0+1.2))*smoothstep(-0.2,0.05,p.y)*0.6;c*=1.0-0.45*max(smoothstep(0.55,0.7,n),bars);' +
      'c=mix(c,vec3(0.55,0.45,0.32),spot*0.7);c*=1.0-0.6*reefBand(p.y-(-0.03+0.12*(p.z-0.44)),0.006)*smoothstep(0.38,0.42,p.z);',
    snapper: 'float s1=reefBand(p.y-0.004+0.06*(p.z-0.1)*(p.z-0.1),0.014);float s2=reefBand(p.y-0.045+0.03*p.z,0.008)*step(-0.25,p.z);' +
      'float s3=reefBand(p.y+0.04,0.008)*step(-0.1,p.z)*step(p.z,0.38);c=mix(c,vec3(0.90,0.55,0.03),max(s1,max(s2,s3)));'
  };
  var FISH_COMMON = [
    'varying vec3 vReefFishPos;varying float vReefFishPart;varying vec2 vReefFishFin;',
    'float reefBand(float d,float w){return 1.0-smoothstep(w*0.6,w,abs(d));}',
    'float reefFishHash(vec2 p){p=mod(p,97.0);float h=mod(p.x*7.0+13.0,97.0);h=mod(h*mod(h,11.0)+p.y*5.0+29.0,97.0);h=mod(h*mod(h,7.0)+17.0,97.0);return h/96.0;}',
    'float reefFishNoise(vec2 p){vec2 i=floor(p),f=p-i;f=f*f*(3.0-2.0*f);return mix(mix(reefFishHash(i),reefFishHash(i+vec2(1.0,0.0)),f.x),mix(reefFishHash(i+vec2(0.0,1.0)),reefFishHash(i+vec2(1.0,1.0)),f.x),f.y);}',
    'float reefFishScale(vec3 p){float gy=p.y*48.0;vec2 sc=vec2(fract(p.z*42.0+mod(floor(gy),2.0)*0.5)-0.5,(fract(gy)-0.5)*1.2);float r=length(sc);return (0.3*(1.0-r)-reefBand(r-0.46+sc.x*0.1,0.08)*0.4)*(1.0-smoothstep(0.25,0.38,p.z));}'
  ].join('\n');

  function catmull(a, b, c, d, t) { return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t); }
  function FishParts() { this.p = []; this.c = []; this.k = []; this.i = []; this.uv = []; }
  FishParts.prototype.vertex = function (x, y, z, col, part, u, v) { this.p.push(x, y, z); this.c.push(col.r, col.g, col.b); this.k.push(part); this.uv.push(u || 0, v || 0); return this.p.length / 3 - 1; };
  FishParts.prototype.fin = function (roots, edges, rootColor, edgeColor) {
    // Fine curved membranes, with shared normals and UVs for the fin rays.
    var first = this.p.length / 3, nv = 4, col = rootColor.clone();
    for (var i = 0; i < roots.length; i++) for (var j = 0; j <= nv; j++) {
      var t = j / nv, u = i / Math.max(1, roots.length - 1), r = roots[i], e = edges[i];
      col.copy(rootColor).lerp(edgeColor, t);
      this.vertex(r[0] + (e[0] - r[0]) * t + 0.003 * Math.sin(Math.PI * t) * Math.sin(Math.PI * u),
        r[1] + (e[1] - r[1]) * t, r[2] + (e[2] - r[2]) * t, col, 1, u, t);
    }
    for (i = 0; i < roots.length - 1; i++) for (j = 0; j < nv; j++) {
      var a = first + i * (nv + 1) + j, b = a + nv + 1;
      this.i.push(a, a + 1, b, a + 1, b + 1, b);
    }
  };
  FishParts.prototype.build = function (T) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('reefFishPart', new T.Float32BufferAttribute(this.k, 1)); g.setIndex(this.i);
    g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  };
  function buildFishModel(T, family, derivatives) {
    var def = FISH[family], rows = def.rows, lin = function (hex) { return new T.Color(hex).convertSRGBToLinear(); };
    var col = {}; Object.keys(def.colors).forEach(function (k) { col[k] = lin(def.colors[k]); });
    var body = new FishParts(), nRows = 32, cols = 28, table = [], s, r, c, k;
    for (s = 0; s <= 200; s++) {
      var t = s / 200 * (rows.length - 1), i = Math.min(rows.length - 2, Math.floor(t)), f = t - i, a = rows[Math.max(0, i - 1)], b = rows[i], cc = rows[i + 1], d = rows[Math.min(rows.length - 1, i + 2)], row = [];
      for (k = 0; k < 4; k++) row.push(catmull(a[k], b[k], cc[k], d[k], f));
      row[1] = Math.max(0.002, row[1]); row[2] = Math.max(0.002, row[2]); table.push(row);
    }
    function at(z) {
      for (var q = 1; q < table.length; q++) if (table[q][0] <= z) { var u = (table[q - 1][0] - z) / Math.max(1e-6, table[q - 1][0] - table[q][0]), out = []; for (var m = 0; m < 4; m++) out.push(table[q - 1][m] + (table[q][m] - table[q - 1][m]) * u); return out; }
      return table[table.length - 1].slice();
    }
    var shade = new T.Color();
    for (r = 0; r < nRows; r++) {
      var sec = table[Math.round(r / (nRows - 1) * 200)];
      for (c = 0; c < cols; c++) {
        var ang = c / cols * TAU, up = Math.sin(ang);
        if (up >= 0) shade.copy(col.flank).lerp(col.back, Math.min(1, Math.max(0, (up - 0.1) / 0.8)));
        else shade.copy(col.flank).lerp(col.belly, Math.min(1, Math.max(0, (-up - 0.1) / 0.7)));
        body.vertex(Math.cos(ang) * sec[1], up * sec[2] + sec[3], sec[0], shade, 0);
      }
    }
    for (r = 0; r < nRows - 1; r++) for (c = 0; c < cols; c++) { var a0 = r * cols + c, b0 = r * cols + (c + 1) % cols; body.i.push(a0, a0 + cols, b0, b0, a0 + cols, b0 + cols); }
    [0, nRows - 1].forEach(function (rr, end) {
      var sec2 = table[end ? 200 : 0], pole = body.vertex(0, sec2[3], sec2[0] + (end ? -0.004 : 0.004), col.flank, 0);
      for (var q = 0; q < cols; q++) { var a1 = rr * cols + q, b1 = rr * cols + (q + 1) % cols; if (end) body.i.push(a1, pole, b1); else body.i.push(a1, b1, pole); }
    });
    // Median fins on the dorsal and ventral ridges.
    function median(range, height, sign, plateau) {
      var roots = [], edges = [];
      for (var q = 0; q <= 9; q++) {
        var u = q / 9, z = range[0] + (range[1] - range[0]) * u, sec3 = at(z), env = plateau ? Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * u)), 0.35) : Math.pow(Math.sin(Math.PI * u), 0.7);
        if (q === 0 || q === 9) env = 0;
        var y0 = sec3[3] + sign * sec3[2] * 0.96;
        roots.push([0, y0, z]); edges.push([0, y0 + sign * height * env, z - 0.035 * u]);
      }
      body.fin(roots, edges, col.fin, col.edge);
    }
    median(def.dorsal, def.dorsal[2], 1, def.dorsal[3]);
    median(def.anal, def.anal[2], -1, def.dorsal[3]);
    var e = at(def.eye[0]), pz = def.eye[0] - 0.12, ps = at(pz), P = def.pectoral;
    [-1, 1].forEach(function (side) {
      var pecRoots = [], pecEdges = [];
      for (var pi = 0; pi <= 7; pi++) {
        var pu = pi / 7, fan = Math.sin(Math.PI * pu);
        pecRoots.push([side * ps[1] * 0.94, ps[3] - ps[2] * 0.14 + (pu - 0.5) * P * 0.36, pz + (0.5 - pu) * 0.026]);
        pecEdges.push([side * (ps[1] + 0.024 + fan * 0.024), ps[3] - ps[2] * 0.16 + (pu - 0.5) * P * 0.74, pz - P * (0.65 + 0.35 * fan)]);
      }
      body.fin(pecRoots, pecEdges, col.fin, col.fin);
      var pv = at(pz - 0.04);
      body.fin([[side * pv[1] * 0.35, pv[3] - pv[2] * 0.95, pz - 0.02], [side * pv[1] * 0.3, pv[3] - pv[2] * 0.96, pz - 0.07]],
        [[side * pv[1] * 0.6, pv[3] - pv[2] - 0.04, pz - 0.08], [side * pv[1] * 0.45, pv[3] - pv[2] - 0.02, pz - 0.12]], col.fin, col.edge);
      // Eye: iris and pupil on the body surface.
      var upE = clamp((def.eye[1] - e[3]) / e[2], -0.95, 0.95), ex = side * e[1] * Math.sqrt(1 - upE * upE), rE = def.eye[2];
      [[rE, col.eye, 0.25], [rE * 0.55, lin(0x0a0a0a), 0.8]].forEach(function (layer) {
        var sphere = new T.SphereGeometry(layer[0], 12, 8), g = sphere.toNonIndexed(), gp = g.attributes.position, first = body.p.length / 3;
        sphere.dispose();
        for (var q = 0; q < gp.count; q++) body.vertex(ex + side * rE * layer[2] + gp.getX(q) * 0.5, def.eye[1] + gp.getY(q), def.eye[0] + gp.getZ(q), layer[1], 2);
        for (q = 0; q < gp.count; q++) body.i.push(first + q);
        g.dispose();
      });
    });
    if (def.beak) {
      // Parrotfish beak: fused pale teeth at the blunt snout.
      var bk = new T.SphereGeometry(1, 10, 6), bp = bk.attributes.position, first2 = body.p.length / 3, beak = lin(0xd8efe6), snout = at(0.49);
      for (var q2 = 0; q2 < bp.count; q2++) body.vertex(bp.getX(q2) * 0.022, snout[3] - 0.004 + bp.getY(q2) * 0.02, 0.49 + bp.getZ(q2) * 0.024, beak, 1);
      var bi = bk.index.array; for (q2 = 0; q2 < bi.length; q2++) body.i.push(first2 + bi[q2]);
      bk.dispose();
    }
    // Caudal fin on its own pivot at the peduncle.
    var tail = new FishParts(), ped = table[200], v, roots2 = [], edges2 = [], S = def.tailSpan, Lt = def.tailLength;
    for (k = 0; k <= 10; k++) {
      v = k / 5 - 1; var av = Math.abs(v), y, z2;
      if (def.tail === 'lunate') { y = v * S; z2 = -Lt * (0.62 + 0.38 * Math.pow(av, 1.6)); }
      else if (def.tail === 'forked') { y = v * S; z2 = -Lt * (0.42 + 0.58 * Math.pow(av, 1.3)); }
      else if (def.tail === 'truncate') { y = v * S * 0.85; z2 = -Lt * (0.95 - 0.1 * v * v); }
      else { y = v * S * 0.8; z2 = -Lt * (0.7 + 0.3 * Math.sqrt(Math.max(0, 1 - v * v))); }
      roots2.push([0, ped[3] + v * ped[2] * 0.9, 0.012]); edges2.push([0, ped[3] + y, z2]);
    }
    tail.fin(roots2, edges2, col.tail, family === 'snapper' || family === 'butterflyfish' ? col.tail : col.edge);
    var material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.48, metalness: 0.025, side: T.DoubleSide });
    if (derivatives) material.extensions = { derivatives: true };
    material.onBeforeCompile = function (shader) {
      shader.uniforms.reefFishMotion = this.userData.reefFishMotion;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', function (m) { return m + '\nattribute float reefFishPart;attribute float reefFishTail;uniform vec4 reefFishMotion;varying vec3 vReefFishPos;varying float vReefFishPart;varying vec2 vReefFishFin;'; })
        .replace('#include <beginnormal_vertex>', function (m) { return m + '\nfloat reefFlex=clamp((0.28-position.z)/reefFishMotion.z,0.0,1.0);float reefBeat=reefFishMotion.x-reefFlex*1.6;' +
          'float reefBend=reefFishMotion.y*reefFlex*reefFlex*sin(reefBeat)*(1.0-reefFishTail);' +
          'float reefBendSlope=-reefFishMotion.y*(2.0*reefFlex*sin(reefBeat)-1.6*reefFlex*reefFlex*cos(reefBeat))/reefFishMotion.z*(1.0-reefFishTail);objectNormal.z-=reefBendSlope*objectNormal.x;'; })
        .replace('#include <begin_vertex>', function (m) { return m + '\nvReefFishPos=position;vReefFishPart=reefFishPart;vReefFishFin=uv;transformed.x+=reefBend;'; });
      var paint = (derivatives ? '#define REEF_DERIVATIVES\n' : '') + FISH_COMMON + '\nvec3 reefFishPaint(vec3 p,vec3 c,float detail){' + FISH_PAINT[family] + 'return c;}';
      var apply = 'if(vReefFishPart<0.5){float reefDetail=0.5;\n#ifdef REEF_DERIVATIVES\nreefDetail=1.0-smoothstep(0.01,0.035,length(fwidth(vReefFishPos)));\n#endif\n' +
        'diffuseColor.rgb=reefFishPaint(vReefFishPos,diffuseColor.rgb,reefDetail);diffuseColor.rgb*=1.0+reefFishScale(vReefFishPos)*0.13*reefDetail;' +
        'float reefGill=reefBand(vReefFishPos.z-(0.27+2.0*vReefFishPos.y*vReefFishPos.y),0.0025)*(1.0-smoothstep(0.06,0.14,abs(vReefFishPos.y)));' +
        'float reefMouth=reefBand(vReefFishPos.y+0.018,0.002)*smoothstep(0.44,0.48,vReefFishPos.z);diffuseColor.rgb*=1.0-0.38*max(reefGill,reefMouth);}' +
        'else if(vReefFishPart<1.5){float reefFinAA=0.08;\n#ifdef REEF_DERIVATIVES\nreefFinAA=max(fwidth(vReefFishFin.x*14.0),0.025);\n#endif\n' +
        'float reefRib=1.0-smoothstep(0.035,0.035+reefFinAA,abs(fract(vReefFishFin.x*14.0)-0.5));diffuseColor.rgb*=0.86+0.14*reefRib;}';
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', function (m) { return m + '\n' + paint; })
        .replace('#include <color_fragment>', function (m) { return m + '\n' + apply; })
        .replace('#include <roughnessmap_fragment>', function (m) { return m + '\nif(vReefFishPart>1.5)roughnessFactor=0.19;else if(vReefFishPart<0.5)roughnessFactor+=reefFishScale(vReefFishPos)*0.2;'; })
        .replace('#include <normal_fragment_maps>', function (m) { return m + '\n#ifdef REEF_DERIVATIVES\nif(vReefFishPart<0.5){float reefH=reefFishScale(vReefFishPos)*0.00016;vec3 reefSX=dFdx(-vViewPosition),reefSY=dFdy(-vViewPosition);vec3 reefR1=cross(reefSY,normal),reefR2=cross(normal,reefSX);float reefDet=dot(reefSX,reefR1);normal=normalize(abs(reefDet)*normal-sign(reefDet)*(dFdx(reefH)*reefR1+dFdy(reefH)*reefR2));}\n#endif'; });
    };
    material.customProgramCacheKey = function () { return 'reef3d-fish-' + family + '-v3|' + (derivatives ? 'd' : 'n'); };
    var bodyGeo = body.build(T), tailGeo = tail.build(T);
    bodyGeo.setAttribute('reefFishTail', new T.Float32BufferAttribute(new Float32Array(bodyGeo.attributes.position.count), 1));
    tailGeo.setAttribute('reefFishTail', new T.Float32BufferAttribute(new Float32Array(tailGeo.attributes.position.count).fill(1), 1));
    return { body: bodyGeo, tail: tailGeo, material: material, pedZ: ped[0], halfHeight: Math.max.apply(null, rows.map(function (q) { return q[2]; })) };
  }

  function normalizeFish(list, layout) {
    return (Array.isArray(list) ? list : []).map(function (f, i) {
      f = f || {};
      var offset = num(f.offsetM, 0);
      return {
        id: f.id !== undefined && f.id !== null ? String(f.id) : 'fish-' + i,
        family: FAMILIES.indexOf(f.family) >= 0 ? f.family : 'snapper',
        alongM: clamp(num(f.alongM, layout.lengthM / 2), 0, layout.lengthM), offsetM: offset,
        heightM: clamp(num(f.heightM, 0.8), 0.1, Math.max(0.2, layout.depthM - 0.4)),
        inBelt: Math.abs(offset) <= layout.beltHalfWidthM
      };
    });
  }

  function mount(canvas, options) {
    options = options || {};
    var THREE = options.THREE;
    if (!canvas || typeof canvas.addEventListener !== 'function') throw new Error('Reef3D.mount needs a canvas element.');
    if (!THREE || typeof THREE.WebGLRenderer !== 'function') throw new Error('Reef3D.mount needs options.THREE (three.js r128).');
    var Habitat = global.Reef3DHabitat;
    if (!Habitat || typeof Habitat.create !== 'function' || typeof Habitat.normalizeLayout !== 'function') throw new Error('The reef habitat did not finish loading. Please retry.');
    if (canvas._reef3d && typeof canvas._reef3d.dispose === 'function') canvas._reef3d.dispose();
    var doc = canvas.ownerDocument || global.document || null;
    var quality = selectQuality(options.quality), high = quality === 'high', reducedMotion = !!options.reducedMotion;
    var layout = Habitat.normalizeLayout(options.layout), points = layout.points, L = layout.lengthM, belt = layout.beltHalfWidthM;
    var fishDefs = normalizeFish(options.layout && options.layout.fish, layout);
    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.05, 80), renderer = null, habitat = null;
    var disposed = false, contextLost = false, raf = 0, rafIsTimer = false, lastStamp = null, elapsed = 0, frames = 0, paused = false, lastCheck = -Infinity;
    var cameraMode = 'diver', pointIndex = points.length ? 0 : -1, highlightIndex = pointIndex, fogBase = 0.035, fogScale = 1;
    var listeners = [], resizeObserver = null, notifyTimer = 0, lastNotify = -Infinity, lastKey = '', pendingNotify = false;
    var fish = [], fishModels = {}, owned = [], boxes = [], pointers = new Map(), pinch = 0, canvasW = 0, canvasH = 0;
    var view = { target: new THREE.Vector3(), yaw: DIVER.yaw, pitch: DIVER.pitch, dist: DIVER.dist };
    var goal = { target: new THREE.Vector3(), yaw: DIVER.yaw, pitch: DIVER.pitch, dist: DIVER.dist };
    var user = { diver: { yaw: DIVER.yaw, pitch: DIVER.pitch, dist: DIVER.dist }, overview: { yaw: 0, pitch: 0.62, scale: 1 } };
    var frustum = new THREE.Frustum(), projScreen = new THREE.Matrix4(), sphere = new THREE.Sphere();
    var highlight = null, ringThin = null, ringThick = null, plumb = null, bob = null;
    function own(resource) { owned.push(resource); return resource; }
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

    function dispose() {
      if (disposed) return; disposed = true;
      stopLoop(); clearTimer(notifyTimer); notifyTimer = 0;
      listeners.forEach(function (off) { off(); }); listeners.length = 0;
      if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
      pointers.clear();
      if (habitat) { habitat.dispose(); habitat = null; }
      var geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(function (o) {
        if (o.geometry) geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(function (m) { materials.add(m); });
      });
      owned.forEach(function (r) { if (r.isBufferGeometry) geometries.add(r); else if (r.isMaterial) materials.add(r); else if (r.isTexture) textures.add(r); });
      materials.forEach(function (m) { Object.keys(m).forEach(function (k) { if (m[k] && m[k].isTexture) textures.add(m[k]); }); });
      geometries.forEach(function (g) { g.dispose(); }); materials.forEach(function (m) { m.dispose(); }); textures.forEach(function (t) { t.dispose(); });
      owned.length = 0; fish.length = 0;
      if (renderer) {
        renderer.dispose();
        if (!contextLost && typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
        renderer = null;
      }
      scene.clear();
      if (canvas._reef3d === controller) delete canvas._reef3d;
    }

    var pal = waterPalette(layout.depthM), sunDir = new THREE.Vector3(0.28, 1, 0.22).normalize();
    function waterPalette(depth) {
      var k = clamp((depth - 5) / 7, 0, 1), C = THREE.Color;
      // Fog, background and backdrop are output-space colours: r128 fogs after encoding.
      // Light loses red with depth; deeper water is bluer and hazier.
      return {
        fog: new C(0x1e7489).lerp(new C(0x123e61), k), top: new C(0x8ccfd0).lerp(new C(0x4789ae), k), density: 0.033 + 0.0026 * Math.max(0, depth - 5),
        sun: new C().setRGB(1.0, 0.96, 0.83).lerp(new C().setRGB(0.64, 0.85, 0.94), k), sunIntensity: 1.5 - 0.3 * k,
        sky: new C().setRGB(0.48, 0.76, 0.86).lerp(new C().setRGB(0.27, 0.53, 0.76), k), ground: new C().setRGB(0.3, 0.28, 0.21).lerp(new C().setRGB(0.12, 0.17, 0.2), k), hemi: 0.54 - 0.12 * k
      };
    }
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: high, alpha: false, powerPreference: high ? 'high-performance' : 'low-power' });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, high ? 1.75 : 1));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
      if (renderer.shadowMap) { renderer.shadowMap.enabled = high; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
      var caps = renderer.capabilities || {}, ext = renderer.extensions;
      var derivatives = !!(caps.isWebGL2 || (ext && typeof ext.has === 'function' && ext.has('OES_standard_derivatives')));
      habitat = Habitat.create(THREE, { layout: options.layout, seed: options.seed, quality: quality, reducedMotion: reducedMotion, derivatives: derivatives });
      scene.add(habitat.root);
      fogBase = pal.density;
      scene.fog = new THREE.FogExp2(pal.fog.clone(), fogBase); scene.background = pal.fog.clone();
      // Water column dome (adapted from createCLHuntWaterBackdrop); follows the camera.
      var backdrop = new THREE.Mesh(own(new THREE.SphereGeometry(1, 24, 16)), own(new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { topColor: { value: pal.top }, bottomColor: { value: pal.fog.clone() }, sunDir: { value: sunDir } },
        vertexShader: 'varying vec3 vReefDir;void main(){vReefDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: 'uniform vec3 topColor;uniform vec3 bottomColor;uniform vec3 sunDir;varying vec3 vReefDir;void main(){vec3 d=normalize(vReefDir);float up=smoothstep(-0.12,0.82,d.y);' +
          'float sunward=pow(max(0.0,dot(d,sunDir)),5.0);float sunHalo=pow(max(0.0,dot(d,sunDir)),42.0);vec3 column=mix(bottomColor,topColor,up);' +
          'column+=max(topColor-bottomColor,vec3(0.0))*(0.2*sunward+0.16*sunHalo)*up;gl_FragColor=vec4(min(column,vec3(1.0)),1.0);}'
      })));
      backdrop.name = 'reef-water-backdrop'; backdrop.renderOrder = -10; backdrop.frustumCulled = false;
      backdrop.onBeforeRender = function (r, s, cam) { this.position.setFromMatrixPosition(cam.matrixWorld); this.scale.setScalar(cam.far * 0.9); this.updateMatrixWorld(); };
      scene.add(backdrop);
      var hemi = new THREE.HemisphereLight(pal.sky, pal.ground, pal.hemi); scene.add(hemi);
      var sun = new THREE.DirectionalLight(pal.sun, pal.sunIntensity), center = new THREE.Vector3(L / 2, 0, 0);
      sun.position.copy(center).addScaledVector(sunDir, 30); sun.target.position.copy(center); scene.add(sun); scene.add(sun.target);
      if (high) {
        var span = Math.max(L / 2 + 4, 9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -span; sun.shadow.camera.right = span; sun.shadow.camera.top = span; sun.shadow.camera.bottom = -span;
        sun.shadow.camera.near = 1; sun.shadow.camera.far = 70; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
      }
      buildFish(derivatives); buildHighlight(); if (options.showBelt !== false) buildBelt();
    } catch (error) {
      dispose();
      throw new Error('This device could not start the 3D reef. ' + (error && error.message ? error.message : 'Please use the 2D survey.'));
    }

    function buildFish(derivatives) {
      var group = new THREE.Group(); group.name = 'reef-fish'; scene.add(group);
      fishDefs.forEach(function (f) {
        var model = fishModels[f.family] || (fishModels[f.family] = (function () { var m = buildFishModel(THREE, f.family, derivatives); own(m.body); own(m.tail); own(m.material); return m; })());
        var def = FISH[f.family], h = hashString(f.id), h2 = hashString(f.id + '#'), size = def.length * (0.85 + 0.3 * h);
        var material = own(model.material.clone()), motion = { value: new THREE.Vector4(h * TAU, 0, 0.28 - model.pedZ, 0) };
        material.onBeforeCompile = model.material.onBeforeCompile; material.customProgramCacheKey = model.material.customProgramCacheKey; material.userData.reefFishMotion = motion;
        var root = new THREE.Group(), body = new THREE.Mesh(model.body, material), tail = new THREE.Mesh(model.tail, material);
        tail.position.z = model.pedZ; root.add(body); root.add(tail); root.scale.setScalar(size); root.rotation.order = 'YXZ';
        body.castShadow = tail.castShadow = high;
        root.name = 'reef-fish-' + f.id;
        [root, body, tail].forEach(function (o) { o.userData = { fishId: f.id, family: f.family, inBelt: f.inBelt }; });
        // Give edge fish room to turn on their own side, including an exact edge
        // or an outside fish only millimetres away. Counts never change in flight.
        var rx = def.loop * (0.8 + 0.4 * h2), rz = Math.min(rx, def.loop * (0.68 + 0.2 * h), belt * 0.4), sign = f.offsetM < 0 ? -1 : 1;
        var centerZ = f.inBelt ? clamp(f.offsetM, -belt + rz + 0.003, belt - rz - 0.003) : sign * Math.max(Math.abs(f.offsetM), belt + rz + 0.003);
        var floorY = habitat.floorHeight(f.alongM, f.offsetM), minY = floorY + 0.1 + model.halfHeight * size;
        if (Math.abs(f.offsetM) < 0.6) minY = Math.max(minY, habitat.tapeHeight(f.alongM) + 0.12 + model.halfHeight * size);
        var y = Math.max(minY, floorY + f.heightM);
        fish.push({ def: f, root: root, tail: tail, motion: motion, pedZ: model.pedZ, halfHeight: model.halfHeight * size, size: size,
          center: new THREE.Vector3(f.alongM, y, centerZ), rest: new THREE.Vector3(f.alongM, y, f.offsetM), rx: rx, rz: rz, phase: h * TAU,
          dir: h2 < 0.5 ? 1 : -1, omega: def.speed / def.loop, radius: size * 0.55, still: h < 0.5 ? 0 : Math.PI,
          target: new THREE.Vector3(), velocity: new THREE.Vector3(), beat: h2 * TAU, lastT: null, neighbors: [] });
        group.add(root);
      });
      // Nearby conspecifics share a loose travelling rhythm, while groupers keep
      // their solitary patrol. Build the small neighborhoods once, not per frame.
      fish.forEach(function (f) {
        f.neighbors = fish.filter(function (other) { return other !== f && other.def.inBelt === f.def.inBelt && other.center.distanceToSquared(f.center) < 5.76; })
          .sort(function (a, b) { return a.center.distanceToSquared(f.center) - b.center.distanceToSquared(f.center); }).slice(0, 6);
        if (f.def.family === 'grouper') return;
        var shoal = f.neighbors.filter(function (other) { return other.def.family === f.def.family; }).concat(f);
        var leader = shoal.slice().sort(function (a, b) { return a.def.id < b.def.id ? -1 : a.def.id > b.def.id ? 1 : 0; })[0];
        var rhythm = hashString(leader.def.id + ':shoal');
        f.phase = rhythm * TAU + (hashString(f.def.id + ':lag') - 0.5) * 0.4; f.dir = rhythm < 0.5 ? 1 : -1;
      });
    }
    function updateFish(t) {
      fish.forEach(function (f) {
        if (reducedMotion) {
          // Hold still, broadside to the diver view.
          f.root.position.copy(f.rest); f.root.rotation.set(0, f.still, 0); f.tail.rotation.y = 0; f.tail.position.x = 0; f.motion.value.y = 0; return;
        }
        var th = f.phase + f.dir * f.omega * (t + 0.5 * Math.sin(t * 0.39 + f.phase));
        // Broad turns, a little meander, and slow surge: no mechanical orbit or
        // sudden dash. The excursions remain within each survey fish's home range.
        f.target.set(f.center.x + f.rx * (0.8 * Math.cos(th) + 0.08 * Math.cos(th * 2 + f.phase) + 0.035 * Math.sin(t * 0.22)),
          f.center.y + 0.025 * Math.sin(th * 1.7 + f.phase) + 0.012 * Math.sin(t * 0.44 - f.center.x * 0.08),
          f.center.z + f.rz * (0.82 * Math.sin(th) + 0.065 * Math.sin(th * 3 + f.phase) + 0.035 * Math.sin(t * 0.22 + 0.7)));
      });
      if (reducedMotion) return;
      fish.forEach(function (f) {
        var dt = f.lastT === null ? 0 : Math.max(0, t - f.lastT), px = f.target.x, pz = f.target.z, pushX = 0, pushZ = 0;
        f.neighbors.forEach(function (other) {
          var dx = px - other.target.x, dz = pz - other.target.z, dy = f.target.y - other.target.y;
          var distance = Math.sqrt(dx * dx + dy * dy + dz * dz), room = (f.size + other.size) * 0.48;
          if (distance > 0.0001 && distance < room) { var strength = 0.055 * Math.pow(1 - distance / room, 2) / distance; pushX += dx * strength; pushZ += dz * strength; }
        });
        px = clamp(px + pushX, f.center.x - f.rx * 0.97, f.center.x + f.rx * 0.97);
        pz = clamp(pz + pushZ, f.center.z - f.rz * 0.97, f.center.z + f.rz * 0.97);
        var clearance = habitat.floorHeight(px, pz) + 0.1 + f.halfHeight;
        if (Math.abs(pz) < 0.6) clearance = Math.max(clearance, habitat.tapeHeight(px) + 0.12 + f.halfHeight);
        var py = Math.min(layout.depthM - f.halfHeight - 0.15, Math.max(clearance, f.target.y));
        if (dt > 0) f.velocity.set(px - f.root.position.x, py - f.root.position.y, pz - f.root.position.z).divideScalar(dt);
        else f.velocity.set(-Math.sin(f.phase) * f.dir * f.rx, 0, Math.cos(f.phase) * f.dir * f.rz).multiplyScalar(f.omega);
        f.root.position.set(px, py, pz);
        var speed = f.velocity.length(), horizontal = Math.hypot(f.velocity.x, f.velocity.z), heading = Math.atan2(f.velocity.x, f.velocity.z);
        var turn = wrapAngle(heading - f.root.rotation.y), turnStep = dt ? clamp(turn * damp(5, dt), -dt * 1.6, dt * 1.6) : turn;
        var pitch = -Math.atan2(f.velocity.y, Math.max(0.04, horizontal)), bank = dt ? clamp(-turnStep / dt * 0.13, -0.16, 0.16) : 0;
        f.root.rotation.y += turnStep;
        f.root.rotation.x += (clamp(pitch, -0.18, 0.18) - f.root.rotation.x) * (dt ? damp(4, dt) : 1);
        f.root.rotation.z += (bank - f.root.rotation.z) * (dt ? damp(3, dt) : 1);
        var effort = clamp(speed / (FISH[f.def.family].speed || 0.1), 0.2, 1.5), glide = 0.78 + 0.22 * Math.sin(t * 0.74 + f.phase);
        f.beat += dt * (4.3 + effort * 3.8) * (f.def.family === 'grouper' ? 0.72 : 1);
        var amplitude = (0.012 + effort * 0.02) * glide, endPhase = f.beat - 1.6;
        f.motion.value.set(f.beat, amplitude, 0.28 - f.pedZ, 0);
        f.tail.position.x = amplitude * Math.sin(endPhase);
        f.tail.rotation.y = Math.atan(-amplitude * (2 * Math.sin(endPhase) - 1.6 * Math.cos(endPhase)) / (0.28 - f.pedZ)) + (0.16 + effort * 0.12) * glide * Math.sin(endPhase - 0.45);
        f.lastT = t;
      });
    }
    function buildHighlight() {
      highlight = new THREE.Group(); highlight.name = 'reef-highlight';
      var ringMat = own(new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.9, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      ringThin = new THREE.Mesh(own(new THREE.RingGeometry(0.9, 1, 48)), ringMat); ringThick = new THREE.Mesh(own(new THREE.RingGeometry(0.62, 1, 48)), ringMat);
      [ringThin, ringThick].forEach(function (ring) { ring.rotation.x = -Math.PI / 2; ring.renderOrder = 6; highlight.add(ring); });
      var lineGeo = own(new THREE.BufferGeometry()); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));
      var orange = own(new THREE.LineBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
      plumb = new THREE.Line(lineGeo, orange); plumb.renderOrder = 6; plumb.frustumCulled = false;
      bob = new THREE.Mesh(own(new THREE.ConeGeometry(0.012, 0.035, 10)), own(new THREE.MeshBasicMaterial({ color: 0xff8a2a, fog: false })));
      bob.rotation.x = Math.PI; bob.renderOrder = 6;
      highlight.add(plumb); highlight.add(bob); scene.add(highlight);
    }
    function placeHighlight() {
      var i = highlightIndex;
      if (!highlight) return;
      if (i < 0 || !points[i]) { highlight.visible = false; return; }
      highlight.visible = true;
      var d = points[i].distanceM, floorY = habitat.floorHeight(d, 0), tapeY = habitat.tapeHeight(d);
      if (!boxes[i]) {
        var box = new THREE.Box3().setFromObject(habitat.surveyObjects[i]);
        boxes[i] = { top: box.isEmpty() ? floorY : box.max.y };
      }
      // As in a real survey, the plumb line hangs from the tape and touches what
      // lies under the point. The ring stays small (points are 0.5 m apart) so a
      // neighbouring colony never sits inside it.
      var contact = Math.min(tapeY, Math.max(floorY, boxes[i].top)), r = 0.14;
      ringThin.position.set(d, contact + 0.012, 0); ringThin.scale.set(r, r, 1);
      ringThick.position.copy(ringThin.position); ringThick.scale.set(r * 1.35, r * 1.35, 1);
      ringThin.visible = cameraMode === 'diver'; ringThick.visible = cameraMode !== 'diver';
      var above = cameraMode === 'diver' ? 0.42 : 1.2;
      plumb.position.set(d, contact, 0); plumb.scale.set(1, Math.max(0.02, tapeY - contact) + above, 1);
      bob.position.set(d, contact + 0.0185, 0);
    }
    function buildBelt() {
      // Dashed guide lines at the belt edges help judge which fish are inside it.
      var mat = own(new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.3, gapSize: 0.25, transparent: true, opacity: 0.32, depthWrite: false }));
      [-belt, belt].forEach(function (z) {
        var pts = [];
        for (var x = 0; x <= L + 1e-6; x += 0.25) pts.push(x, habitat.floorHeight(x, z) + 0.03, z);
        var g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        var line = new THREE.Line(g, mat); line.computeLineDistances(); line.name = 'reef-belt-edge'; scene.add(line);
      });
    }

    // ---- Camera -----------------------------------------------------------------
    function pointTarget(i, out) { var p = points[i], d = p ? p.distanceM : 0; return out.set(d, habitat.floorHeight(d, 0) + 0.12, 0); }
    function overviewDistance() {
      var v = camera.fov * Math.PI / 180, h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
      return clamp(Math.max((L / 2 + 1.5) / Math.tan(h / 2), (belt + 2) / Math.tan(v / 2)) * 1.08, 4, 90);
    }
    function setGoal() {
      if (cameraMode === 'diver') {
        pointTarget(pointIndex, goal.target); goal.yaw = user.diver.yaw; goal.pitch = user.diver.pitch; goal.dist = user.diver.dist;
      } else {
        // The overview keeps the whole belt framed; the thick ring marks the point.
        goal.target.set(L / 2, 0.15, 0);
        goal.yaw = user.overview.yaw; goal.pitch = user.overview.pitch; goal.dist = overviewDistance() * user.overview.scale;
      }
    }
    function applyCamera(dt, snap) {
      var a = snap ? 1 : damp(4.5, dt);
      view.target.lerp(goal.target, a); view.yaw += wrapAngle(goal.yaw - view.yaw) * a;
      view.pitch += (goal.pitch - view.pitch) * a; view.dist += (goal.dist - view.dist) * a;
      // The overview thins the haze so about a third of the colour is lost at the belt centre.
      var fogGoal = cameraMode === 'overview' ? Math.min(0.7, 0.66 / Math.max(0.001, goal.dist * fogBase)) : 1;
      fogScale += (fogGoal - fogScale) * a;
      // Stay under the surface by flattening the view, which keeps the framing distance.
      var pitch = Math.min(view.pitch, Math.asin(clamp((habitat.surfaceY - 0.35 - view.target.y) / Math.max(view.dist, 0.01), -1, 1)));
      var cp = Math.cos(pitch);
      camera.position.set(view.target.x + view.dist * cp * Math.sin(view.yaw), view.target.y + view.dist * Math.sin(pitch), view.target.z + view.dist * cp * Math.cos(view.yaw));
      camera.position.y = Math.max(camera.position.y, habitat.floorHeight(camera.position.x, camera.position.z) + 0.25);
      camera.up.set(0, 1, 0); camera.lookAt(view.target);
      var far = cameraMode === 'overview' ? view.dist + 60 : 45;
      if (Math.abs(camera.far - far) > 0.5) { camera.far = far; camera.updateProjectionMatrix(); }
      if (scene.fog) scene.fog.density = fogBase * fogScale;
      return view.target.distanceToSquared(goal.target) > 1e-6 || Math.abs(wrapAngle(goal.yaw - view.yaw)) > 1e-4 || Math.abs(goal.pitch - view.pitch) > 1e-4 ||
        Math.abs(goal.dist - view.dist) > 1e-3 || Math.abs(fogScale - fogGoal) > 1e-3;
    }

    // ---- State ------------------------------------------------------------------
    function visibleFish() {
      if (!fish.length) return [];
      camera.updateMatrixWorld();
      projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projScreen);
      return fish.filter(function (f) { return frustum.intersectsSphere(sphere.set(f.root.position, f.radius)); })
        .map(function (f) { return { fishId: f.def.id, family: f.def.family, inBelt: f.def.inBelt }; });
    }
    function snapshot() {
      var p = points[pointIndex] || null, info = renderer && renderer.info && renderer.info.render;
      return {
        pointIndex: p ? pointIndex : -1, distanceM: p ? p.distanceM : null, category: p ? p.category : null, coralForm: p ? p.coralForm : null,
        cameraMode: cameraMode, paused: paused, quality: quality, fishVisible: disposed ? [] : visibleFish(),
        highlightIndex: highlightIndex, pointCount: points.length, reducedMotion: reducedMotion, ready: !disposed && !contextLost,
        frames: frames, drawCalls: info ? info.calls : 0, triangles: info ? info.triangles : 0
      };
    }
    function stateKey(s) { return [s.pointIndex, s.highlightIndex, s.cameraMode, s.paused, s.ready, s.fishVisible.map(function (f) { return f.fishId; }).join(',')].join('|'); }
    function emit(s, t) {
      pendingNotify = false; lastNotify = t; lastKey = stateKey(s);
      try { options.onState(s); } catch (error) { reportError(error); }
    }
    // At most one call per 200 ms; a change inside the window is delivered at its end.
    function notify(force) {
      if (typeof options.onState !== 'function' || disposed) return;
      if (force) pendingNotify = true;
      var t = now();
      if (t - lastNotify < 200) {
        if (pendingNotify && !notifyTimer) notifyTimer = setTimer(flush, Math.max(1, 200 - (t - lastNotify)));
        return;
      }
      if (!pendingNotify && t - lastCheck < 200) return;
      lastCheck = t;
      var s = snapshot();
      if (pendingNotify || stateKey(s) !== lastKey) emit(s, t);
    }
    function flush() { notifyTimer = 0; if (!disposed && pendingNotify) notify(false); }

    // ---- Loop ---------------------------------------------------------------------
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
    function tick(stamp) {
      raf = 0;
      if (disposed || contextLost || hidden()) return;
      try {
        var dt = lastStamp === null ? 0 : clamp((stamp - lastStamp) / 1000, 0, 0.1); lastStamp = stamp;
        var animating = !paused && !reducedMotion;
        if (animating) { elapsed += dt; updateFish(elapsed); habitat.update(dt, elapsed); }
        var moving = applyCamera(Math.max(dt, 0.016), false);
        if (animating) {
          var pulse = 0.68 + 0.27 * Math.sin(elapsed * 3);
          ringThin.material.opacity = pulse;
        }
        renderer.render(scene, camera); frames++;
        notify(false);
        if (animating || moving) requestFrame();
      } catch (error) { stopLoop(); paused = true; reportError(error); }
    }

    // ---- Controller -------------------------------------------------------------------
    function goToPoint(i) {
      if (disposed || !points.length) return;
      pointIndex = clamp(Math.round(num(i, 0)), 0, points.length - 1); highlightIndex = pointIndex;
      placeHighlight(); setGoal(); if (reducedMotion) applyCamera(0, true);
      notify(true); refresh();
    }
    function highlightPoint(i) {
      if (disposed) return;
      highlightIndex = i === null || i === undefined || num(i, -1) < 0 || !points.length ? -1 : clamp(Math.round(num(i, 0)), 0, points.length - 1);
      placeHighlight(); notify(true); refresh();
    }
    function setCameraMode(mode) {
      if (disposed || (mode !== 'diver' && mode !== 'overview')) return;
      cameraMode = mode; setGoal(); placeHighlight(); if (reducedMotion) applyCamera(0, true);
      notify(true); refresh();
    }
    function setPaused(value) { if (disposed) return; paused = !!value; lastStamp = null; notify(true); refresh(); }
    function resize() {
      if (disposed || !renderer) return;
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.clientWidth, height: canvas.clientHeight };
      var w = Math.max(1, Math.round(rect.width || 0)), h = Math.max(1, Math.round(rect.height || 0));
      if (w === canvasW && h === canvasH) return;
      canvasW = w; canvasH = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      if (cameraMode === 'overview') { setGoal(); applyCamera(0, true); }
      refresh();
    }
    var controller = { goToPoint: goToPoint, highlightPoint: highlightPoint, setCameraMode: setCameraMode, setPaused: setPaused, getState: snapshot, resize: resize, dispose: dispose };

    // ---- Input (canvas only for keys) -------------------------------------------------
    function jump(direction) {
      if (pointIndex < 0) return;
      var target = points[pointIndex].distanceM + 2 * direction, i;
      if (direction > 0) { for (i = pointIndex + 1; i < points.length; i++) if (points[i].distanceM >= target - 1e-6) break; goToPoint(Math.min(i, points.length - 1)); }
      else { for (i = pointIndex - 1; i >= 0; i--) if (points[i].distanceM <= target + 1e-6) break; goToPoint(Math.max(i, 0)); }
    }
    function look(dx, dy) {
      if (cameraMode === 'diver') { user.diver.yaw -= dx * 0.006; user.diver.pitch = clamp(user.diver.pitch + dy * 0.005, 0.12, 1.45); }
      else { user.overview.yaw -= dx * 0.005; user.overview.pitch = clamp(user.overview.pitch + dy * 0.004, 0.2, 1.4); }
      setGoal(); view.yaw = goal.yaw; view.pitch = goal.pitch; refresh();
    }
    function zoom(amount) {
      if (cameraMode === 'diver') user.diver.dist = clamp(user.diver.dist * Math.exp(amount), 0.7, 4.5);
      else user.overview.scale = clamp(user.overview.scale * Math.exp(amount), 0.45, 1.6);
      setGoal(); if (reducedMotion) applyCamera(0, true); refresh();
    }
    listen(canvas, 'keydown', function (event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      var key = event.key;
      if (key === 'ArrowRight') goToPoint(pointIndex + 1);
      else if (key === 'ArrowLeft') goToPoint(pointIndex - 1);
      else if (key === 'PageUp') jump(1);
      else if (key === 'PageDown') jump(-1);
      else if (key === 'Home') goToPoint(0);
      else if (key === 'End') goToPoint(points.length - 1);
      else if (key === ' ' || key === 'Spacebar') setPaused(!paused);
      else return;
      if (event.preventDefault) event.preventDefault();
    });
    listen(canvas, 'pointerdown', function (event) {
      if (event.button && event.pointerType !== 'touch') return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try { canvas.setPointerCapture(event.pointerId); } catch (ignore) {}
      try { if (canvas.focus) canvas.focus({ preventScroll: true }); } catch (ignore) {}
      if (pointers.size === 2) { var p = Array.from(pointers.values()); pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
    });
    listen(canvas, 'pointermove', function (event) {
      var old = pointers.get(event.pointerId); if (!old) return;
      var dx = event.clientX - old.x, dy = event.clientY - old.y; pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size > 1) { var p = Array.from(pointers.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (pinch > 0 && d > 0) zoom(Math.log(pinch / d)); pinch = d; }
      else look(dx, dy);
    });
    function pointerUp(event) { pointers.delete(event.pointerId); pinch = 0; }
    listen(canvas, 'pointerup', pointerUp); listen(canvas, 'pointercancel', pointerUp); listen(canvas, 'lostpointercapture', pointerUp);
    listen(canvas, 'wheel', function (event) { if (event.preventDefault) event.preventDefault(); zoom(clamp(event.deltaY || 0, -200, 200) * 0.0015); }, { passive: false });
    listen(canvas, 'blur', function () { pointers.clear(); pinch = 0; });
    listen(canvas, 'webglcontextlost', function (event) {
      if (event && event.preventDefault) event.preventDefault();
      contextLost = true; stopLoop(); pointers.clear();
      reportError(new Error('The 3D reef view lost its graphics context. Reopen the 3D view or use the 2D survey.'));
      notify(true);
    });
    listen(doc, 'visibilitychange', function () { lastStamp = null; if (hidden()) stopLoop(); else refresh(); });
    if (typeof global.ResizeObserver === 'function') { resizeObserver = new global.ResizeObserver(function () { resize(); }); resizeObserver.observe(canvas); }
    else listen(global, 'resize', resize);

    canvas._reef3d = controller;
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    if (canvas.style) canvas.style.touchAction = 'none';
    placeHighlight(); updateFish(0); habitat.update(0, 0); resize(); setGoal(); applyCamera(0, true);
    renderer.render(scene, camera); frames++;
    notify(true); requestFrame();
    return controller;
  }

  global.Reef3D = { version: '1.0.0', mount: mount, selectQuality: selectQuality, fishFamilies: FAMILIES.slice() };
})(window);
