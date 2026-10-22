/* Reef3DSpecies 1.0.0: organism models for the Coral Reef Survey Lab 3D reef:
 * reef fish, turtles, invertebrates, corals and restoration structures.
 * three.js r128 is always passed in; this file never reads a global THREE.
 * Metres at real-world scale, facing +X. Swimmers have their origin at the
 * body centre; bottom, sessile and crevice organisms at their base or at the
 * crevice mouth (info(id).origin says which).
 * Fish bodies are lofted like Reef3D's fish (reef_3d_engine.js), which adapts
 * Cephalopod Lab's createCLHuntFish; the day octopus (arm rig, mottled skin,
 * pattern change) adapts createCLHuntAnimal (stem_tool_cephalopodlab.js);
 * the seeded streams and lattice noise follow reef_3d_habitat.js.
 * Field marks follow standard reef ID guides (FishBase, Reef Life Survey).
 * Patterns are painted procedurally into DataTextures and vertex colours (no
 * canvas). Seeded streams only, never Math.random: same seed, same model.
 * Pixels are baked once per page and their textures shared, reference
 * counted, per THREE namespace (Kit.share), so repeated species and later
 * dives reuse them; every material shares one shader patch (patchSource).
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2, PI = Math.PI;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function fract(x) { return x - Math.floor(x); }
  function num(v, f) { if (v === null || v === undefined || v === '') return f; v = Number(v); return isFinite(v) ? v : f; }
  // Optional scene motion is expressed in metres/second and yaw radians/second.
  // Local animation never writes the placement root. Analytic time functions
  // keep a culled creature in phase when it becomes visible again.
  function effort(motion, length) { return motion && motion.speed !== undefined ? clamp(num(motion.speed, length) / Math.max(0.08, length * 1.25), 0, 1.7) : 0.8; }
  function turning(motion) { return clamp(num(motion && motion.turn, 0), -1.2, 1.2); }
  function currentAt(root, motion, t, phase, out) {
    var c = motion && motion.current, x, z, strength;
    if (c) { x = num(c.x, 0); z = num(c.z, 0); strength = clamp(num(c.strength, Math.sqrt(x * x + z * z)), 0, 1); }
    else { x = 0.85; z = 0.35; strength = 0.42 + 0.12 * Math.sin(t * 0.27 + root.position.x * 0.11 + root.position.z * 0.08); }
    var l = Math.sqrt(x * x + z * z), cs = Math.cos(root.rotation.y), sn = Math.sin(root.rotation.y);
    if (l > 0.00001) { x /= l; z /= l; }
    // Inverse of Three's Y rotation: world flow into the organism's frame.
    out.x = (cs * x - sn * z) * strength; out.z = (sn * x + cs * z) * strength;
    out.pulse = 0.78 + 0.22 * Math.sin(t * 0.62 + root.position.x * 0.21 + root.position.z * 0.17 - phase * 0.13);
    return out;
  }
  function paddleStroke(phase) {
    // Smooth downstroke, unhurried recovery, then an extended gliding hold.
    var p = fract(phase / TAU);
    if (p < 0.28) return 0.46 - 0.98 * smooth(0, 0.28, p);
    if (p < 0.78) return -0.52 + 0.98 * smooth(0.28, 0.78, p);
    return 0.46;
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
  // Each concern owns a stream, so a tier or option never shifts another draw.
  function stream(seed, salt) { return mulberry32((Math.imul(seed ^ 0x5bd1e995, 0x9E3779B1) ^ Math.imul(salt + 1, 0x85EBCA77)) | 0); }
  function hash2(a, b) {
    var h = Math.imul((a | 0) ^ 0x27D4EB2D, 0x9E3779B1) ^ Math.imul(((b | 0) + 0x165667B1) | 0, 0x85EBCA77);
    h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; h = Math.imul(h, 0x297A2D39); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  // Value noise on a 256-periodic lattice of hashed values: one table read per
  // corner. Every pattern spans well under 256 lattice cells.
  var LATTICE = new Float64Array(65536);
  for (var li = 0; li < 65536; li++) LATTICE[li] = hash2(li & 255, li >> 8);
  function noise2(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var x0 = ix & 255, x1 = (ix + 1) & 255, y0 = (iy & 255) << 8, y1 = ((iy + 1) & 255) << 8;
    var a = LATTICE[y0 | x0], b = LATTICE[y0 | x1], c = LATTICE[y1 | x0], d = LATTICE[y1 | x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function noise3(x, y, z) {
    var iz = Math.floor(z), fz = z - iz; fz = fz * fz * (3 - 2 * fz);
    var a = noise2(x + iz * 31.7, y - iz * 17.3), b = noise2(x + (iz + 1) * 31.7, y - (iz + 1) * 17.3);
    return a + (b - a) * fz;
  }
  function fbm2(x, y, oct) {
    var s = 0, a = 0.5, f = 1, n = 0;
    for (var o = 0; o < oct; o++) { s += a * noise2(x * f + o * 17.1, y * f - o * 9.3); n += a; a *= 0.5; f *= 2.03; }
    return s / n;
  }
  // Jittered-grid cells: out = [nearest distance, second distance, cell id 0..1, dx, dy].
  // Neighbouring texels share a 3x3 neighbourhood, so each salt keeps the last
  // neighbourhood's feature points; squared distances defer the square roots.
  var CELL_MEMO = [];
  for (var cm = 0; cm < 8; cm++) CELL_MEMO.push({ ix: NaN, iy: NaN, salt: NaN, px: new Float64Array(9), py: new Float64Array(9) });
  function cells(x, y, salt, out) {
    var ix = Math.floor(x), iy = Math.floor(y), m = CELL_MEMO[salt & 7], k, dx, dy;
    if (m.ix !== ix || m.iy !== iy || m.salt !== salt) {
      m.ix = ix; m.iy = iy; m.salt = salt; k = 0;
      for (dx = -1; dx <= 1; dx++) for (dy = -1; dy <= 1; dy++, k++) {
        var cx = ix + dx, cy = iy + dy;
        m.px[k] = cx + 0.12 + 0.76 * hash2(cx * 7 + salt, cy); m.py[k] = cy + 0.12 + 0.76 * hash2(cx, cy * 13 + salt + 5);
      }
    }
    var b1 = 81, b2 = 81, best = 0;
    for (k = 0; k < 9; k++) {
      var ex = x - m.px[k], ey = y - m.py[k], d = ex * ex + ey * ey;
      if (d < b1) { b2 = b1; b1 = d; best = k; } else if (d < b2) b2 = d;
    }
    out[0] = Math.sqrt(b1); out[1] = Math.sqrt(b2);
    out[2] = hash2(ix + ((best / 3) | 0) - 1 + salt * 3, iy + (best % 3) - 1 - salt); out[3] = x - m.px[best]; out[4] = y - m.py[best];
    return out;
  }
  function hex(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
  function toLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lin(c) { return [toLin(c[0]), toLin(c[1]), toLin(c[2])]; }
  function linHex(h) { return lin(hex(h)); }
  function mixc(a, b, t, out) { out = out || [0, 0, 0]; out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return out; }
  function setc(out, c) { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
  function mulc(out, k) { out[0] *= k; out[1] *= k; out[2] *= k; return out; }
  // Soft-edged marks; aa is half a texel in the same units.
  function band(d, w, aa) { return 1 - smooth(w - aa, w + aa, Math.abs(d)); }
  function disc(dx, dy, r, aa) { return 1 - smooth(r - aa, r + aa, Math.sqrt(dx * dx + dy * dy)); }
  function catmull(a, b, c, d, t) { return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t); }
  function sp(c, e) { return c < 0 ? -Math.pow(-c, e) : Math.pow(c, e); }
  // Distance from p to a polyline of [x, y] points.
  function polyDist(px, py, pts) {
    var best = 9;
    for (var i = 0; i < pts.length - 1; i++) {
      var ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0] - ax, by = pts[i + 1][1] - ay, l2 = bx * bx + by * by;
      var t = l2 > 0 ? clamp(((px - ax) * bx + (py - ay) * by) / l2, 0, 1) : 0, dx = px - ax - bx * t, dy = py - ay - by * t;
      best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
    }
    return best;
  }

  // ---- Resources: every geometry, material and texture made is kept ---------
  function Kit(T, id, group, high, derivatives) { this.T = T; this.id = id; this.group = group; this.high = high; this.derivatives = derivatives !== false; this.res = []; this.done = false; }
  Kit.prototype.keep = function (r) { this.res.push(r); return r; };
  Kit.prototype.tag = function (o, part) {
    o.name = this.id + (part ? '-' + part : '');
    o.userData.speciesId = this.id; o.userData.group = this.group; if (part) o.userData.part = part;
    return o;
  };
  Kit.prototype.root = function () { var g = new this.T.Group(); g.name = 'reef-species-' + this.id; g.userData = { speciesId: this.id, group: this.group }; return g; };
  Kit.prototype.node = function (part, parent) { var g = this.tag(new this.T.Group(), part); if (parent) parent.add(g); return g; };
  Kit.prototype.mesh = function (geo, mat, part, parent) { var m = this.tag(new this.T.Mesh(geo, mat), part); if (parent) parent.add(m); return m; };
  Kit.prototype.geo = function (g, scale) { return this.keep(g.build(this.T, scale)); };
  Kit.prototype.std = function (params, patch) {
    // Three's bump and tangent-space normal chunks require screen derivatives.
    // The WebGL1 fallback preserves pigment and geometry on older devices.
    if (!this.derivatives) { delete params.bumpMap; delete params.normalMap; }
    var m = this.keep(new this.T.MeshStandardMaterial(params)); patchMaterial(this, m, patch); return m;
  };
  Kit.prototype.dispose = function () {
    if (this.done) return; this.done = true;
    for (var i = 0; i < this.res.length; i++) { try { this.res[i].dispose(); } catch (ignore) {} }
    this.res.length = 0;
  };
  // One texture object per THREE namespace and key, shared by every model that
  // asks for it; the last model to be disposed disposes it.
  var LIVE = typeof WeakMap === 'function' ? new WeakMap() : null;
  Kit.prototype.share = function (key, make) {
    var table = LIVE ? LIVE.get(this.T) : null;
    if (LIVE && !table) { table = new Map(); LIVE.set(this.T, table); }
    var e = table ? table.get(key) : null;
    if (!e) { e = { tex: make(), refs: 0 }; if (table) table.set(key, e); }
    e.refs++;
    this.res.push({ dispose: function () {
      if (--e.refs > 0) return;
      if (table && table.get(key) === e) table.delete(key);
      e.tex.dispose();
    } });
    return e.tex;
  };
  // A procedural texture through both caches: pixels once per page, the
  // texture object once per THREE namespace. The key names every input.
  Kit.prototype.baked = function (key, w, h, fn, wrapS, wrapT, linear, repeat) {
    var T = this.T, full = key + '|' + w + 'x' + h + (wrapS ? 'r' : 'c') + (wrapT ? 'r' : 'c') + (linear ? 'L' : 'S');
    return this.share(full + '|' + (repeat || 1), function () {
      var tex = dataTexture(T, bake(full, function () { return paintData(w, h, fn); }), w, h, wrapS, wrapT, linear);
      if (repeat) tex.repeat.set(repeat, repeat);
      return tex;
    });
  };
  // Tangent-space normal map baked the same way; height(u, v) over the square.
  Kit.prototype.bakedNormal = function (key, w, h, height, strength, wrap, repeat) {
    var T = this.T, full = key + '|n' + w + 'x' + h + '|' + strength;
    return this.share(full + (wrap ? 'r' : 'c') + (repeat || 1), function () {
      var tex = new T.DataTexture(bake(full, function () { return normalData(w, h, height, strength); }), w, h, T.RGBAFormat);
      tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true;
      if (wrap) tex.wrapS = tex.wrapT = T.RepeatWrapping;
      if (repeat) tex.repeat.set(repeat, repeat);
      tex.needsUpdate = true; return tex;
    });
  };
  // Constant textures that let a material join a shared shader program without
  // changing its look: a white pigment map, a flat bump map and full roughness.
  Kit.prototype.flat = function (kind) {
    var T = this.T, v = kind === 'bump' ? 128 : 255;
    return this.share('flat|' + kind, function () {
      var data = new Uint8Array(64); for (var i = 0; i < 64; i++) data[i] = v;
      return dataTexture(T, data, 4, 4, true, true, kind !== 'map');
    });
  };

  // ---- Baked pixels: computed once per page, least recently used out first ----
  var BAKED = new Map(), bakedBytes = 0, BAKE_LIMIT = 48 * 1048576;
  function bakeSize(v, depth) {
    if (!v || depth > 3) return 0;
    if (v.byteLength !== undefined) return v.byteLength;
    if (Array.isArray(v)) { if (typeof v[0] === 'number') return v.length * 8; var n = 0; for (var i = 0; i < v.length; i++) n += bakeSize(v[i], depth + 1); return n; }
    if (typeof v === 'object') { var m = 0; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) m += bakeSize(v[k], depth + 1); return m; }
    return 0;
  }
  function bake(key, make) {
    var e = BAKED.get(key);
    if (e) { BAKED.delete(key); BAKED.set(key, e); return e.v; }
    e = { v: make() }; e.bytes = bakeSize(e.v, 0);
    BAKED.set(key, e); bakedBytes += e.bytes;
    while (bakedBytes > BAKE_LIMIT && BAKED.size > 1) { var first = BAKED.keys().next().value; bakedBytes -= BAKED.get(first).bytes; BAKED.delete(first); }
    return e.v;
  }

  // ---- One shader patch for every species material -----------------------------
  // Fresnel sheen, the swimming bend, flexing fin roots, fin-ray webbing and
  // wet corneal eyes are all switched by uniforms, so the patch never splits a
  // shader program: programs differ only by three's own maps. Each new program
  // stalls the first frame that shows it, worst on school laptops.
  function inject(src, anchor, code) { return src.indexOf(anchor) < 0 ? src : src.replace(anchor, function () { return anchor + '\n' + code; }); }
  var DERIV = '#if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300\n';
  // Batches (batchMerge): parts that share a material draw as one mesh. A
  // vertex of a part on its own pivot carries attribute reefPart: its position
  // in the part's own frame (xyz, exactly as its separate mesh had it) and its
  // slot k (w). Slot k's 5 rows of reefRig hold the pivot now (3 rows), the
  // fin flex and [bend, roughness, fin rays, eye] (a switch of -1 leaves it to
  // the material). Part 0 is drawn as it is. reefBatch is a uniform, so a batch
  // shares every program; other meshes never read reefPart.
  var BATCH_VERTEX = 'uniform float reefBatch;uniform vec4 reefRig[20];attribute vec4 reefPart;varying float vReefRough;varying vec2 vReefFlags;';
  var BATCH_PART = 'vec3 reefPos=position;vec4 reefFlex=reefFinFlex;float reefBend=reefSwimShape.z;float reefRough=-1.0;float reefRigged=0.0;vec2 reefFlags=vec2(-1.0);' +
    'vec4 reefTo0=vec4(1.0,0.0,0.0,0.0);vec4 reefTo1=vec4(0.0,1.0,0.0,0.0);vec4 reefTo2=vec4(0.0,0.0,1.0,0.0);' +
    'if(reefBatch>0.5&&reefPart.w>0.5){int reefB=int(reefPart.w-0.5)*5;reefPos=reefPart.xyz;' +
    'reefTo0=reefRig[reefB];reefTo1=reefRig[reefB+1];reefTo2=reefRig[reefB+2];reefFlex=reefRig[reefB+3];reefBend=reefRig[reefB+4].x;reefRough=reefRig[reefB+4].y;reefFlags=reefRig[reefB+4].zw;reefRigged=1.0;}\n';
  function patchSource(shader, derivatives) {
    var v = shader.vertexShader, f = shader.fragmentShader;
    v = inject(v, '#include <common>', 'uniform vec4 reefSwim;uniform vec4 reefSwimShape;uniform vec4 reefFinFlex;varying vec2 vReefUv;' + BATCH_VERTEX + '\n#ifdef USE_INSTANCING\nattribute vec4 reefSchoolBeat;\n#endif');
    // A travelling wave holds the head steady and grows smoothly toward the
    // tail (reefSwimShape.z switches it on). School members alternate strokes
    // and glides independently. The inverse-transpose of the same bend keeps
    // highlights on the flexing flank. Fin roots (local x >= 0) stay attached
    // while the trailing membrane yields (reefFinFlex.w switches that on).
    // In a batch (batchMerge) a part on its own pivot bends and flexes in its
    // own frame, exactly as its separate mesh did, and then follows the pivot.
    v = inject(v, '#include <beginnormal_vertex>',
      '#ifdef USE_INSTANCING\nfloat reefPhase=reefSwim.x*reefSchoolBeat.x+reefSchoolBeat.y;float reefAmp=reefSwim.y*(0.42+0.58*smoothstep(-0.38,0.72,sin(reefSwim.w*0.62*reefSchoolBeat.x+reefSchoolBeat.z)))*reefSchoolBeat.w;\n' +
      '#else\nfloat reefPhase=reefSwim.x;float reefAmp=reefSwim.y;\n#endif\n' + BATCH_PART +
      'float reefAmplitude=reefAmp*reefBend;' +
      'float reefNW=clamp((reefSwimShape.x-reefPos.x)/max(reefSwimShape.x-reefSwimShape.y,0.0001),0.0,1.0);' +
      'float reefNE=reefNW*reefNW*(3.0-2.0*reefNW);float reefND=-12.0*reefNE*reefNW*(1.0-reefNW)/max(reefSwimShape.x-reefSwimShape.y,0.0001);' +
      'if(reefPos.x<=reefSwimShape.y||reefPos.x>=reefSwimShape.x)reefND=0.0;' +
      'float reefSlope=reefAmplitude*(reefND*sin(reefPhase-reefSwim.z*reefPos.x)-reefNE*reefNE*reefSwim.z*cos(reefPhase-reefSwim.z*reefPos.x));objectNormal.x-=reefSlope*objectNormal.z;' +
      'float reefFinPhase=reefPhase*reefFlex.x+reefFlex.y-reefSwim.z*reefPos.x;float reefFinAmp=reefAmp*reefFlex.w;' +
      'float reefFinReach=max(-reefPos.x,0.0);float reefFinDen=reefFinReach*reefFinReach+reefFlex.z;' +
      'float reefFinEnvelope=reefFinReach*reefFinReach/reefFinDen;' +
      'float reefFinSlope=-reefFinAmp*(2.0*reefFinReach*reefFlex.z/(reefFinDen*reefFinDen)*sin(reefFinPhase)+reefFinEnvelope*reefSwim.z*cos(reefFinPhase));' +
      'objectNormal.x-=reefFinSlope*objectNormal.z;' +
      'if(reefRigged>0.5)objectNormal=vec3(dot(reefTo0.xyz,objectNormal),dot(reefTo1.xyz,objectNormal),dot(reefTo2.xyz,objectNormal));');
    v = inject(v, '#include <begin_vertex>', 'transformed=reefPos;float reefW=clamp((reefSwimShape.x-transformed.x)/max(reefSwimShape.x-reefSwimShape.y,0.0001),0.0,1.0);' +
      'reefW=reefW*reefW*(3.0-2.0*reefW);transformed.z+=reefAmplitude*reefW*reefW*sin(reefPhase-reefSwim.z*transformed.x);' +
      'transformed.z+=reefFinAmp*reefFinEnvelope*sin(reefFinPhase);' +
      'if(reefRigged>0.5){vec4 reefT1=vec4(transformed,1.0);transformed=vec3(dot(reefTo0,reefT1),dot(reefTo1,reefT1),dot(reefTo2,reefT1));}' +
      'vReefUv=uv;vReefRough=reefRough;vReefFlags=reefFlags;');
    f = inject(f, '#include <common>', 'uniform vec3 reefSheenA;uniform vec3 reefSheenB;uniform float reefSheenK;uniform vec3 reefIrisColor;uniform vec4 reefFeature;varying vec2 vReefUv;varying float vReefRough;varying vec2 vReefFlags;' +
      (derivatives ? 'float reefFinRidgeSlope(float phase,float width){float x=(fract(phase)-0.5)/width;return 2.0*x*exp(-1.6*x*x);}' : ''));
    f = inject(f, '#include <color_fragment>',
      'float reefWeb=0.0;float reefDistal=0.0;float reefRayDetail=0.0;float reefEyeMask=0.0;float reefEyeR=0.0;vec2 reefFinSlope=vec2(0.0);\n' +
      // A batch part may switch rays or eyes for itself (a whole triangle at once).
      'float reefRaysOn=vReefFlags.x<-0.5?reefFeature.x:vReefFlags.x;float reefEyeOn=vReefFlags.y<-0.5?reefFeature.y:vReefFlags.y;\n' +
      // Fin rays: each supporting ray forks continuously towards the free edge.
      'if(reefRaysOn>0.5){' +
      'float reefRayU=vReefUv.x*14.0+0.035*sin(vReefUv.y*4.0+vReefUv.x*19.0);' +
      'float reefRay=abs(fract(reefRayU)-0.5);float reefAA=0.1;\n' +
      (derivatives ? DERIV + 'reefAA=max(fwidth(reefRayU),0.025);\n#endif\n' : '') +
      'float reefRayWidth=mix(0.045,0.014,vReefUv.y);' +
      'float reefRib=1.0-smoothstep(reefRayWidth,reefRayWidth+reefAA,reefRay);' +
      'reefDistal=smoothstep(0.34,0.93,vReefUv.y);float reefFork=reefDistal*0.19;' +
      'float reefSplitD=min(abs(fract(reefRayU+reefFork)-0.5),abs(fract(reefRayU-reefFork)-0.5));' +
      'float reefSplit=1.0-smoothstep(0.013,0.013+reefAA,reefSplitD);' +
      'reefRib=mix(reefRib,reefSplit,reefDistal*0.86);reefWeb=1.0-reefRib;' +
      'reefRayDetail=1.0-smoothstep(0.35,0.9,reefAA);' +
      // Supporting ribs catch directional light while the softer web rolls
      // between them. Their shallow relief fades before it becomes subpixel.
      (derivatives ? 'float reefReliefWidth=max(0.11,reefAA*0.65);' +
        'float reefRootRelief=reefFinRidgeSlope(reefRayU,reefReliefWidth);' +
        'float reefSplitRelief=0.5*(reefFinRidgeSlope(reefRayU+reefFork,reefReliefWidth)+reefFinRidgeSlope(reefRayU-reefFork,reefReliefWidth));' +
        'float reefReliefFade=smoothstep(0.04,0.20,vReefUv.y)*(1.0-smoothstep(0.94,1.0,vReefUv.y))*reefRayDetail*reefFeature.z;' +
        'reefFinSlope.x=(mix(reefRootRelief,reefSplitRelief,reefDistal*0.86)+sin(reefRayU*6.2831853)*reefWeb*0.08)*reefReliefFade;' +
        'reefFinSlope.y=cos(vReefUv.y*3.1415927)*reefWeb*0.065*reefReliefFade;' : '') +
      'diffuseColor.rgb*=0.965+reefRayDetail*(reefRib*0.095-0.045);' +
      'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.97,1.01,1.02),reefWeb*reefDistal*0.32);}\n' +
      // Eyes: vertices with u above 2 carry a wet cornea inside the detail mesh.
      'if(reefEyeOn>0.5){' +
      'reefEyeMask=step(1.8,vReefUv.x);vec2 reefEyeUV=(vReefUv-vec2(2.5,0.5))*2.0;' +
      'reefEyeR=length(reefEyeUV);float reefIrisAngle=atan(reefEyeUV.y,reefEyeUV.x+0.00001);float reefEyeDetail=1.0;float reefPupilAA=0.012;\n' +
      (derivatives ? DERIV + 'float reefEyeFootprint=length(fwidth(reefEyeUV));reefEyeDetail=1.0-smoothstep(0.012,0.065,reefEyeFootprint);reefPupilAA=max(reefPupilAA,reefEyeFootprint*0.55);\n#endif\n' : '') +
      // Pigment sits behind the smooth corneal finish. A circular boundary
      // avoids polygonal pupils on school meshes; irregular, tapered streaks
      // break up the wheel-like iris without adding a fixed white glint.
      'float reefPupil=smoothstep(0.475-reefPupilAA,0.475+reefPupilAA,reefEyeR);' +
      'float reefIrisGrain=sin(reefIrisAngle*31.0+sin(reefIrisAngle*7.0)*0.8+reefEyeR*12.0)*sin(reefIrisAngle*47.0-reefEyeR*15.0);' +
      'float reefIrisStreak=smoothstep(0.48,0.62,reefEyeR)*(1.0-smoothstep(0.86,1.0,reefEyeR));' +
      'float reefIrisPigment=0.94+reefEyeDetail*(reefIrisGrain*0.11*reefIrisStreak+sin(reefIrisAngle*5.0+reefEyeR*16.0)*0.035);' +
      'float reefIrisRim=(0.76+0.24*smoothstep(0.48,0.61,reefEyeR))*(1.0-0.68*smoothstep(0.78,1.06,reefEyeR));' +
      'vec3 reefEyePigment=mix(vec3(0.0006966,0.0012384,0.0016254),reefIrisColor*reefIrisPigment*reefIrisRim,reefPupil);' +
      'diffuseColor.rgb=mix(diffuseColor.rgb,reefEyePigment*diffuse,reefEyeMask);}');
    f = inject(f, '#include <roughnessmap_fragment>',
      'if(vReefRough>=0.0)roughnessFactor=vReefRough;' +
      'roughnessFactor=mix(roughnessFactor,0.48,reefWeb*reefDistal*reefRayDetail);' +
      'roughnessFactor=mix(roughnessFactor,0.14+0.22*smoothstep(0.77,1.05,reefEyeR),reefEyeMask);');
    if (derivatives) f = inject(f, '#include <normal_fragment_maps>', DERIV +
      // The deformed view-space surface supplies the same cotangent basis as
      // Three's normal-map chunk, including the reverse face of thin fins.
      // Guard collapsed UVs at fin roots; no tangent buffers or maps are added.
      'if(reefFeature.z>0.0&&reefRaysOn>0.5){' +
      'vec3 reefDx=dFdx(-vViewPosition),reefDy=dFdy(-vViewPosition);vec2 reefUvDx=dFdx(vReefUv),reefUvDy=dFdy(vReefUv);' +
      'vec3 reefPerpY=cross(reefDy,normal),reefPerpX=cross(normal,reefDx);' +
      'vec3 reefTangent=reefPerpY*reefUvDx.x+reefPerpX*reefUvDy.x,reefBitangent=reefPerpY*reefUvDx.y+reefPerpX*reefUvDy.y;' +
      'float reefBasis=max(dot(reefTangent,reefTangent),dot(reefBitangent,reefBitangent));' +
      'if(reefBasis>1e-20){float reefReliefScale=faceDirection*inversesqrt(reefBasis);' +
      'normal=normalize(normal+(reefTangent*reefFinSlope.x+reefBitangent*reefFinSlope.y)*reefReliefScale);}}\n#endif');
    // A restrained transmission lobe makes the fin web read thinner than its
    // rays; the iridescent sheen shifts hue at grazing angles.
    f = inject(f, '#include <emissivemap_fragment>', 'float reefFr=1.0-abs(dot(normalize(normal),normalize(vViewPosition)));' +
      'totalEmissiveRadiance+=diffuseColor.rgb*(0.012+0.03*reefFr*reefFr)*reefDistal*reefWeb;' +
      'float reefFr3=reefFr*reefFr*reefFr;totalEmissiveRadiance+=mix(reefSheenA,reefSheenB,reefFr3)*reefSheenK*reefFr3;');
    shader.vertexShader = v; shader.fragmentShader = f;
  }
  // cfg: swim/swimShape/flex uniform objects, sheen [a, b, k], rays, eye, and
  // batch (the Float32Array(80) rig of a batchMerge mesh).
  function patchMaterial(kit, m, cfg) {
    var T = kit.T, derivatives = kit.derivatives; cfg = cfg || {};
    var sheen = cfg.sheen, U = {
      reefSwim: cfg.swim || { value: new T.Vector4(0, 0, 0, 0) },
      reefSwimShape: cfg.swimShape || { value: new T.Vector4(0, 0, 0, 0) },
      reefFinFlex: cfg.flex || { value: new T.Vector4(0, 0, 1, 0) },
      reefSheenA: { value: sheen ? sheen[0] : new T.Color(0, 0, 0) }, reefSheenB: { value: sheen ? sheen[1] : new T.Color(0, 0, 0) }, reefSheenK: { value: sheen ? sheen[2] : 0 },
      reefIrisColor: { value: new T.Color().fromArray(cfg.iris || [0.75, 0.6, 0.2]).convertSRGBToLinear() },
      reefFeature: { value: new T.Vector4(cfg.rays ? 1 : 0, cfg.eye ? 1 : 0, derivatives ? (cfg.finRelief || 0) : 0, 0) },
      reefBatch: { value: cfg.batch ? 1 : 0 }
    };
    // Only a batch uploads a rig; the others never read theirs (reefBatch 0).
    if (cfg.batch) U.reefRig = { value: cfg.batch };
    if (derivatives) m.extensions = { derivatives: true };
    m.onBeforeCompile = function (shader) {
      for (var k in U) shader.uniforms[k] = U[k];
      patchSource(shader, derivatives);
    };
    m.customProgramCacheKey = function () { return 'reef3d-species-v7|' + (derivatives ? 'd' : 'n'); };
  }
  function sheenOf(T, a, b, k) { return [new T.Color(a).convertSRGBToLinear(), new T.Color(b).convertSRGBToLinear(), k]; }

  // ---- Batches: parts that share a material draw as one mesh -------------------------
  // Each draw call costs the CPU far more than its triangles on school laptops.
  // entries: { geo: indexed BufferGeometry with position, normal, color and uv;
  // part: name; node: its pivot, a child of the batch's parent; flex: [x, y, z, w];
  // bend: 0 | 1; rough: a roughness of its own; rays, eye: 0 | 1, switching the
  // patch's fin rays or wet eyes for this part alone; live: the model writes this
  // part's vertices itself each update; matrix: a live part's pose (kept
  // current by the model); boxMargin: [x, y, z] its own mesh's box had }.
  // A part with a node (or its own roughness) gets a rig slot (at most four):
  // its position is stored at its rest pose in the batch's space, so the
  // shadow pass, bounds and picking find it where its own mesh was; its own
  // frame position (reefPart) and normal go to the shader, and batchPose hands
  // the shader its pivot. The batch's box is the union of the parts' own boxes
  // where their meshes stood (Box3.setFromObject sees no change); batchBox
  // follows the live parts.
  // geometry.userData.batch lists every part's vertex and index ranges.
  var BATCH_FLEX0 = [0, 0, 1, 0];
  // Each moved part's own frame (the node its mesh hung on) and own-frame
  // vertices, so radiusOf measures a batch exactly as it measured the meshes.
  var BATCH_FRAMES = typeof WeakMap === 'function' ? new WeakMap() : null;
  function batchRow(rig, at, m, row) { var e = m.elements; rig[at] = e[row]; rig[at + 1] = e[row + 4]; rig[at + 2] = e[row + 8]; rig[at + 3] = e[row + 12]; }
  function batchMerge(kit, entries, rig) {
    var T = kit.T, nv = 0, ni = 0, slot = 0, m = new T.Matrix4(), table = [], nodes = [], boxes = [], frames = [], v = 0, q = 0;
    entries.forEach(function (e) { nv += e.geo.attributes.position.count; ni += e.geo.index.count; });
    var P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), U = new Float32Array(nv * 2), S = new Float32Array(nv * 4), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    entries.forEach(function (e) {
      var g = e.geo, p = g.attributes.position.array, n = g.attributes.normal.array, c = g.attributes.color.array, uv = g.attributes.uv.array, idx = g.index.array, count = p.length / 3, s = 0, k;
      var rigged = !e.live && (e.node || e.rough !== undefined), moved = rigged || e.matrix || (e.live && e.node);
      var box = new T.Box3().setFromBufferAttribute(g.attributes.position);
      if (e.boxMargin) box.expandByVector(new T.Vector3(e.boxMargin[0], e.boxMargin[1], e.boxMargin[2]));
      m.identity();
      if (e.matrix) m.copy(e.matrix); else if (e.node) { e.node.updateMatrix(); m.copy(e.node.matrix); }
      if (rigged) {
        s = ++slot;
        var at = (s - 1) * 20, f = e.flex || BATCH_FLEX0;
        for (k = 0; k < 3; k++) batchRow(rig, at + k * 4, m, k);
        rig[at + 12] = f[0] === undefined ? f.x : f[0]; rig[at + 13] = f[1] === undefined ? f.y : f[1]; rig[at + 14] = f[2] === undefined ? f.z : f[2]; rig[at + 15] = f[3] === undefined ? f.w : f[3];
        rig[at + 16] = e.bend || 0; rig[at + 17] = e.rough === undefined ? -1 : e.rough;
        rig[at + 18] = e.rays === undefined ? -1 : e.rays; rig[at + 19] = e.eye === undefined ? -1 : e.eye;
        if (e.node) nodes.push({ node: e.node, at: at });
      }
      var me = m.elements;
      for (k = 0; k < count; k++) {
        var a = k * 3, b = (v + k) * 3, x = p[a], y = p[a + 1], z = p[a + 2], nx = n[a], ny = n[a + 1], nz = n[a + 2];
        if (moved) { P[b] = me[0] * x + me[4] * y + me[8] * z + me[12]; P[b + 1] = me[1] * x + me[5] * y + me[9] * z + me[13]; P[b + 2] = me[2] * x + me[6] * y + me[10] * z + me[14]; }
        else { P[b] = x; P[b + 1] = y; P[b + 2] = z; }
        // A rigged part keeps its own-frame normal (the pivot turns it in the
        // shader); a live part's normals turn with it here.
        if (moved && !rigged) { N[b] = me[0] * nx + me[4] * ny + me[8] * nz; N[b + 1] = me[1] * nx + me[5] * ny + me[9] * nz; N[b + 2] = me[2] * nx + me[6] * ny + me[10] * nz; }
        else { N[b] = nx; N[b + 1] = ny; N[b + 2] = nz; }
        C[b] = c[a]; C[b + 1] = c[a + 1]; C[b + 2] = c[a + 2];
        U[(v + k) * 2] = uv[k * 2]; U[(v + k) * 2 + 1] = uv[k * 2 + 1];
        if (s) { var w = (v + k) * 4; S[w] = x; S[w + 1] = y; S[w + 2] = z; S[w + 3] = s; }
      }
      for (k = 0; k < idx.length; k++) I[q + k] = v + idx[k];
      table.push({ part: e.part, slot: s, first: v, count: count, start: q, length: idx.length });
      boxes.push({ box: box, pose: !moved ? null : e.live ? (e.matrix || e.node.matrix) : m.clone() });
      frames.push(moved && (e.frame || e.node) ? { node: e.frame || e.node, local: new Float32Array(p) } : null);
      v += count; q += idx.length;
    });
    var geo = kit.keep(new T.BufferGeometry());
    geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3));
    geo.setAttribute('color', new T.BufferAttribute(C, 3)); geo.setAttribute('uv', new T.BufferAttribute(U, 2));
    // A batch material reads every vertex's part, so its geometry always has one.
    if (rig) geo.setAttribute('reefPart', new T.BufferAttribute(S, 4));
    geo.setIndex(new T.BufferAttribute(I, 1));
    geo.computeBoundingSphere();
    geo.userData.batch = table;
    if (BATCH_FRAMES) BATCH_FRAMES.set(geo, frames);
    var b = { geometry: geo, rig: rig, nodes: nodes, table: table, boxes: boxes, tmp: new T.Box3() };
    geo.boundingBox = new T.Box3(); batchBox(b);
    return b;
  }
  // The union of the parts' own boxes, each where its part now stands.
  function batchBox(b) {
    var box = b.geometry.boundingBox.makeEmpty();
    for (var i = 0; i < b.boxes.length; i++) { var e = b.boxes[i]; b.tmp.copy(e.box); if (e.pose) b.tmp.applyMatrix4(e.pose); box.union(b.tmp); }
  }
  // A batch from its entries (temporary geometries, disposed here once), and
  // its mesh.
  function batchGeometry(kit, entries, rig) {
    var b = batchMerge(kit, entries, rig), seen = [];
    entries.forEach(function (e) { if (seen.indexOf(e.geo) < 0) { seen.push(e.geo); e.geo.dispose(); } });
    return b;
  }
  function batchMesh(kit, entries, mat, rig, part, parent) {
    if (!entries.length) return null;
    var b = batchGeometry(kit, entries, rig);
    b.mesh = kit.mesh(b.geometry, mat, part, parent);
    return b;
  }
  // A fish's eyes and other details as a part of its membrane batch: their own
  // roughness, the body bend, no fin rays and the wet eye (as the detail mesh).
  function batchDetail(e) { e.rough = 0.57; e.bend = 1; e.rays = 0; e.eye = 1; return e; }
  function batchSlots(entries) { return entries.filter(function (e) { return !e.live && (e.node || e.rough !== undefined); }).length; }
  // Hands the shader each pivot's pose (its matrix in the batch's space).
  function batchPose(b) {
    if (!b) return;
    for (var i = 0; i < b.nodes.length; i++) { var s = b.nodes[i]; s.node.updateMatrix(); for (var k = 0; k < 3; k++) batchRow(b.rig, s.at + k * 4, s.node.matrix, k); }
  }
  // The culling sphere covers every part through its motion: a sphere of
  // reach (plus margin) round each moving part's pivot, joined to the rest.
  function batchReach(b, parts) {
    var s = b.geometry.boundingSphere, R = s.radius;
    parts.forEach(function (p) { R = Math.max(R, s.center.distanceTo(p.center) + p.reach + (p.margin || 0)); });
    s.radius = R;
  }
  // A fish's batch: its bounds hold each pivoted part's whole sweep and flex.
  function batchFish(kit, entries, mat, rig, part, parent, L) {
    var reach = entries.filter(function (e) { return e.node; }).map(function (e) { return { center: e.node.position.clone(), reach: batchExtent(e.geo), margin: 0.05 * L }; });
    var b = batchMesh(kit, entries, mat, rig, part, parent);
    if (b) batchReach(b, reach);
    return b;
  }
  // Distance of a geometry's farthest vertex from its origin.
  function batchExtent(geo) { var p = geo.attributes.position.array, r = 0; for (var k = 0; k < p.length; k += 3) r = Math.max(r, Math.sqrt(p[k] * p[k] + p[k + 1] * p[k + 1] + p[k + 2] * p[k + 2])); return r; }
  // Uploads only the vertices [v0, v1) that an update rewrote (positions and normals).
  function batchDirty(geo, v0, v1) {
    ['position', 'normal'].forEach(function (name) { var a = geo.attributes[name]; a.updateRange.offset = v0 * 3; a.updateRange.count = (v1 - v0) * 3; a.needsUpdate = true; });
  }
  // Vertex normals of triangles [i0, i1) over vertices [v0, v1): the same
  // arithmetic, in the same order, as three's computeVertexNormals, so a batch
  // range gets the very normals its own geometry did, without the static rest.
  function batchNormals(geo, v0, v1, i0, i1) {
    var p = geo.attributes.position.array, n = geo.attributes.normal.array, idx = geo.index.array, k;
    for (k = v0 * 3; k < v1 * 3; k++) n[k] = 0;
    for (k = i0; k < i1; k += 3) {
      var a = idx[k] * 3, b = idx[k + 1] * 3, c = idx[k + 2] * 3, bx = p[b], by = p[b + 1], bz = p[b + 2];
      var cx = p[c] - bx, cy = p[c + 1] - by, cz = p[c + 2] - bz, ax = p[a] - bx, ay = p[a + 1] - by, az = p[a + 2] - bz;
      var x = cy * az - cz * ay, y = cz * ax - cx * az, z = cx * ay - cy * ax;
      var na = n[a], nb = n[a + 1], nc = n[a + 2], ma = n[b], mb = n[b + 1], mc = n[b + 2], la = n[c], lb = n[c + 1], lc = n[c + 2];
      n[a] = na + x; n[a + 1] = nb + y; n[a + 2] = nc + z; n[b] = ma + x; n[b + 1] = mb + y; n[b + 2] = mc + z; n[c] = la + x; n[c + 1] = lb + y; n[c + 2] = lc + z;
    }
    for (k = v0 * 3; k < v1 * 3; k += 3) {
      var u = n[k], w = n[k + 1], t = n[k + 2], s = 1 / (Math.sqrt(u * u + w * w + t * t) || 1);
      n[k] = u * s; n[k + 1] = w * s; n[k + 2] = t * s;
    }
    geo.attributes.normal.needsUpdate = true;
  }

  // ---- Procedural textures (sRGB DataTextures; no canvas) --------------------
  function byte(x) { return x <= 0 ? 0 : x >= 1 ? 255 : (x * 255 + 0.5) | 0; }
  function paintData(w, h, fn) {
    var data = new Uint8Array(w * h * 4), c = [0, 0, 0, 1], k = 0;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      c[3] = 1; fn((i + 0.5) / w, (j + 0.5) / h, c, i, j);
      data[k] = byte(c[0]); data[k + 1] = byte(c[1]); data[k + 2] = byte(c[2]); data[k + 3] = byte(c[3]); k += 4;
    }
    return data;
  }
  // Two maps from one pass, where pigment and relief share costly inputs.
  function paintPair(w, h, fn) {
    var a = new Uint8Array(w * h * 4), b = new Uint8Array(w * h * 4), ca = [0, 0, 0, 1], cb = [0, 0, 0, 1], k = 0;
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      ca[3] = cb[3] = 1; fn((i + 0.5) / w, (j + 0.5) / h, ca, cb, i, j);
      a[k] = byte(ca[0]); a[k + 1] = byte(ca[1]); a[k + 2] = byte(ca[2]); a[k + 3] = byte(ca[3]);
      b[k] = byte(cb[0]); b[k + 1] = byte(cb[1]); b[k + 2] = byte(cb[2]); b[k + 3] = byte(cb[3]); k += 4;
    }
    return [a, b];
  }
  function dataTexture(T, data, w, h, wrapS, wrapT, linear) {
    var tex = new T.DataTexture(data, w, h, T.RGBAFormat);
    tex.encoding = linear ? T.LinearEncoding : T.sRGBEncoding;
    tex.wrapS = wrapS ? T.RepeatWrapping : T.ClampToEdgeWrapping; tex.wrapT = wrapT ? T.RepeatWrapping : T.ClampToEdgeWrapping;
    tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }
  // A baked pair: both textures share one pass and one cache entry.
  function bakedPair(kit, key, w, h, fn, wrap, linear) {
    var T = kit.T, full = key + '|' + w + 'x' + h + (wrap ? 'r' : 'c'), pair = null;
    function get() { return pair || (pair = bake(full, function () { return paintPair(w, h, fn); })); }
    return [kit.share(full + '|a', function () { return dataTexture(T, get()[0], w, h, wrap, wrap, linear && linear[0]); }),
      kit.share(full + '|b', function () { return dataTexture(T, get()[1], w, h, wrap, wrap, linear && linear[1]); })];
  }

  // ---- Geometry builder (unit space; build() scales to metres) ---------------
  function Geo() { this.p = []; this.c = []; this.t = []; this.i = []; this.seams = []; }
  Geo.prototype.count = function () { return this.p.length / 3; };
  Geo.prototype.v = function (x, y, z, c, u, w) { this.p.push(x, y, z); this.c.push(c[0], c[1], c[2]); this.t.push(u || 0, w || 0); return this.p.length / 3 - 1; };
  Geo.prototype.tris = function () { return this.i.length / 3; };
  Geo.prototype.build = function (T, scale) {
    var s = scale || 1, p = this.p, out = new Float32Array(p.length), k;
    for (k = 0; k < p.length; k++) out[k] = p[k] * s;
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(out, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.t, 2));
    g.setIndex(this.i);
    g.computeVertexNormals();
    if (this.seams.length) {
      var n = g.attributes.normal;
      for (k = 0; k < this.seams.length; k++) {
        var a = this.seams[k][0], b = this.seams[k][1], x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.sqrt(x * x + y * y + z * z) || 1;
        n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
      }
    }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  };
  // Copies a three.js geometry through a matrix; col is an RGB array or fn(x, y, z, k).
  Geo.prototype.absorb = function (T, g, m, col) {
    var pos = g.attributes.position, uv = g.attributes.uv, base = this.count(), v = new T.Vector3(), k, flip = m && m.determinant() < 0;
    for (k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k); if (m) v.applyMatrix4(m);
      this.v(v.x, v.y, v.z, typeof col === 'function' ? col(v.x, v.y, v.z, k) : col, uv ? uv.getX(k) : 0, uv ? uv.getY(k) : 0);
    }
    var idx = g.index ? g.index.array : null, n = idx ? idx.length : pos.count;
    for (k = 0; k < n; k += 3) {
      var a = idx ? idx[k] : k, b = idx ? idx[k + 1] : k + 1, c = idx ? idx[k + 2] : k + 2;
      if (flip) this.i.push(base + a, base + c, base + b); else this.i.push(base + a, base + b, base + c);
    }
    g.dispose();
  };
  Geo.prototype.append = function (o, dx, dy, dz) {
    var base = this.count(), k;
    for (k = 0; k < o.p.length; k += 3) this.p.push(o.p[k] + dx, o.p[k + 1] + dy, o.p[k + 2] + dz);
    for (k = 0; k < o.c.length; k++) this.c.push(o.c[k]);
    for (k = 0; k < o.t.length; k++) this.t.push(o.t[k]);
    for (k = 0; k < o.i.length; k++) this.i.push(base + o.i[k]);
  };
  // A sphere-like blob through a matrix (eyes, polyps, beads).
  function blob(T, geo, x, y, z, sx, sy, sz, col, ws, hs) {
    geo.absorb(T, new T.SphereGeometry(1, ws || 8, hs || 6), new T.Matrix4().makeScale(sx, sy, sz).setPosition(x, y, z), col);
  }
  // Parallel-transport rings along a polyline: emit(x, y, z, i, s) for each ring vertex.
  // Each ring's cosines and sines are the same for a given side count: tabled once
  // (the very values Math.cos and Math.sin give), as animated arms rebuild every frame.
  var RING_TRIG = {};
  function ringTrig(sides) {
    var t = RING_TRIG[sides];
    if (!t) { t = RING_TRIG[sides] = new Float64Array(sides * 2); for (var s = 0; s < sides; s++) { var ang = s / sides * TAU; t[s * 2] = Math.cos(ang); t[s * 2 + 1] = Math.sin(ang); } }
    return t;
  }
  function rings(pts, radius, sides, emit) {
    var n = pts.length, Nx = 0, Ny = 0, Nz = 0, trig = ringTrig(sides);
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2], tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      if (i === 0) { if (Math.abs(ty) < 0.9) { Nx = -tz; Ny = 0; Nz = tx; } else { Nx = 0; Ny = tz; Nz = -ty; } }
      else { var d = Nx * tx + Ny * ty + Nz * tz; Nx -= tx * d; Ny -= ty * d; Nz -= tz * d; }
      var nl = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz);
      if (nl < 1e-6) { if (Math.abs(ty) < 0.9) { Nx = -tz; Ny = 0; Nz = tx; } else { Nx = 0; Ny = tz; Nz = -ty; } nl = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz) || 1; }
      Nx /= nl; Ny /= nl; Nz /= nl;
      var Bx = ty * Nz - tz * Ny, By = tz * Nx - tx * Nz, Bz = tx * Ny - ty * Nx, r = typeof radius === 'function' ? radius(n > 1 ? i / (n - 1) : 0, i) : radius;
      for (var s = 0; s < sides; s++) {
        var ca = trig[s * 2], sa = trig[s * 2 + 1];
        emit(pts[i][0] + (Nx * ca + Bx * sa) * r, pts[i][1] + (Ny * ca + By * sa) * r, pts[i][2] + (Nz * ca + Bz * sa) * r, i, s);
      }
      if (i === n - 1) emit(pts[i][0] + tx * r * 0.9, pts[i][1] + ty * r * 0.9, pts[i][2] + tz * r * 0.9, i, -1);
    }
  }
  // Tapered tube with a rounded tip; col(t, s) -> linear RGB. Returns the first vertex.
  Geo.prototype.tube = function (pts, radius, sides, col) {
    var self = this, first = this.count(), n = pts.length;
    rings(pts, radius, sides, function (x, y, z, i, s) { self.v(x, y, z, col(n > 1 ? i / (n - 1) : 0, s < 0 ? 0.5 : s / sides), 0, 0); });
    for (var i = 0; i < n - 1; i++) for (var s = 0; s < sides; s++) {
      var a = first + i * sides + s, b = first + i * sides + (s + 1) % sides, c = a + sides, d = b + sides;
      this.i.push(a, b, d, a, d, c);
    }
    var tip = first + n * sides, last = first + (n - 1) * sides;
    for (s = 0; s < sides; s++) this.i.push(last + s, last + (s + 1) % sides, tip);
    return first;
  };
  // Rewrites a tube's positions in place (for animated arms and stalks).
  function tubeWrite(arr, first, pts, radius, sides, scale) {
    var k = first * 3;
    rings(pts, radius, sides, function (x, y, z) { arr[k] = x * scale; arr[k + 1] = y * scale; arr[k + 2] = z * scale; k += 3; });
  }
  // Double-sided membrane between a root curve and an edge curve; col(u, v, out) writes sRGB.
  Geo.prototype.membrane = function (roots, edges, nv, col) {
    var n = roots.length, first = this.count(), c = [0, 0, 0], i, j;
    for (i = 0; i < n; i++) for (j = 0; j <= nv; j++) {
      var t = j / nv, r = roots[i], e = edges[i];
      col(n > 1 ? i / (n - 1) : 0, t, c);
      this.v(lerp(r[0], e[0], t), lerp(r[1], e[1], t), lerp(r[2], e[2], t), lin(c), i / Math.max(1, n - 1), t);
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < nv; j++) {
      var a = first + i * (nv + 1) + j; this.i.push(a, a + nv + 1, a + 1, a + 1, a + nv + 1, a + nv + 2);
    }
    return first;
  };
  // A closed polar cap: centre vertex plus rings; point(r, a, out) returns [x, y, z] and writes linear RGB.
  Geo.prototype.polar = function (nr, ns, point, down) {
    var first = this.count(), c = [1, 1, 1], p = point(0, 0, c), r, s;
    this.v(p[0], p[1], p[2], c, 0.5, 0.5);
    for (r = 1; r <= nr; r++) for (s = 0; s < ns; s++) { p = point(r / nr, s / ns * TAU, c); this.v(p[0], p[1], p[2], c, p[3] || 0, p[4] || 0); }
    for (s = 0; s < ns; s++) if (down) this.i.push(first, first + 1 + s, first + 1 + (s + 1) % ns); else this.i.push(first, first + 1 + (s + 1) % ns, first + 1 + s);
    for (r = 1; r < nr; r++) for (s = 0; s < ns; s++) {
      var a = first + 1 + (r - 1) * ns + s, a1 = first + 1 + (r - 1) * ns + (s + 1) % ns, b = a + ns, b1 = a1 + ns;
      if (down) this.i.push(a, b, a1, a1, b, b1); else this.i.push(a, a1, b, a1, b1, b);
    }
    return first;
  };

  // ---- Fish: lofted bodies, fins, tails and eyes ------------------------------
  // Rows are [x, top, bottom, half width] in body lengths, snout (+X) first.
  function profile(rows) {
    var table = [], n = rows.length;
    for (var s = 0; s <= 160; s++) {
      var t = s / 160 * (n - 1), i = Math.min(n - 2, Math.floor(t)), f = t - i, a = rows[Math.max(0, i - 1)], b = rows[i], c = rows[i + 1], d = rows[Math.min(n - 1, i + 2)], row = [];
      for (var k = 0; k < 4; k++) row.push(k === 0 ? lerp(b[0], c[0], f) : catmull(a[k], b[k], c[k], d[k], f));
      row[3] = Math.max(0.002, row[3]);
      if (row[1] - row[2] < 0.004) { var mid = (row[1] + row[2]) / 2; row[1] = mid + 0.002; row[2] = mid - 0.002; }
      table.push(row);
    }
    return function (x, out) {
      out = out || [0, 0, 0];
      var q = 1;
      if (x >= table[0][0]) q = 1; else { while (q < table.length - 1 && table[q][0] > x) q++; }
      var A = table[q - 1], B = table[q], u = clamp((A[0] - x) / Math.max(1e-6, A[0] - B[0]), 0, 1);
      out[0] = lerp(A[1], B[1], u); out[1] = lerp(A[2], B[2], u); out[2] = lerp(A[3], B[3], u);
      return out;
    };
  }
  var FIN_SHAPES = {
    arch: function (u) { return Math.pow(Math.sin(PI * u), 0.7); },
    plateau: function (u) { return Math.pow(Math.sin(PI * (0.06 + 0.88 * u)), 0.3); },
    rear: function (u) { return (0.45 + 0.55 * u) * Math.pow(Math.sin(PI * u), 0.45); },
    front: function (u) { return (1 - 0.65 * u) * Math.pow(Math.sin(PI * u), 0.35); },
    // Spiny front, a notch, then a taller soft rear.
    spiny: function (u) { var n = 1 - 0.45 * Math.exp(-Math.pow((u - 0.45) / 0.08, 2)); return Math.pow(Math.sin(PI * u), 0.4) * n * (u < 0.45 ? 0.85 : 1); }
  };
  function finShape(s) { return typeof s === 'function' ? s : FIN_SHAPES[s || 'arch']; }
  function tailEdge(s, vv) {
    var a = Math.abs(vv), L = s.len, S = s.span;
    if (s.type === 'lunate') return [-L * (0.55 + 0.45 * Math.pow(a, 1.6)), vv * S];
    if (s.type === 'forked') return [-L * (0.38 + 0.62 * Math.pow(a, 1.2)), vv * S];
    if (s.type === 'lyre') return [-L * (0.3 + 0.7 * Math.pow(a, 0.8)) * (1 + 0.5 * smooth(0.75, 1, a)), vv * S];
    if (s.type === 'truncate') return [-L * (0.92 - 0.06 * vv * vv), vv * S * 0.9];
    if (s.type === 'hetero') return vv > 0 ? [-L * (0.25 + 0.75 * Math.pow(vv, 0.85)), vv * S] : [-L * (0.25 + 0.28 * Math.pow(a, 0.8)), vv * S * 0.55];
    return [-L * (0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - vv * vv))), vv * S * 0.85];
  }
  function defaultFin(def) {
    var base = hex(def.finBase || 0x888888), edge = hex(def.finEdge || def.finBase || 0x888888);
    return function (kind, u, v, out) { mixc(base, edge, smooth(0.7, 1, v), out); };
  }
  // Body-surface z at (x, y) for the superellipse section.
  function surfZ(prof, sq, x, y) {
    var s = prof(x), yc = (s[0] + s[1]) / 2, hh = (s[0] - s[1]) / 2, yn = clamp(Math.abs(y - yc) / hh, 0, 0.999);
    return s[2] * Math.pow(1 - Math.pow(yn, sq), 1 / sq);
  }
  function addEye(T, geo, prof, sq, eye, side, iris, high, bulge, school) {
    // Seat the cornea against the actual head surface, including its slope.
    // UVs above 2 identify eyes inside the shared detail mesh, allowing a wet
    // cornea over a matte operculum without another mesh or material.
    var x = eye[0], y = eye[1], r = eye[2] * 0.88, z = surfZ(prof, sq, x, y), b = bulge || 0.6;
    var radii = school ? [0.51, 1] : [0.44, 0.53, 0.79, 0.95, 1.06], ns = school ? 6 : high ? 24 : 12;
    var first = geo.count(), pupil = lin([0.009, 0.016, 0.021]);
    geo.v(x, y, side * (z + r * b * 0.72), pupil, 2.5, 0.5);
    for (var q = 0; q < radii.length; q++) for (var a = 0; a < ns; a++) {
      var rr = radii[q], th = a / ns * TAU, c = [0, 0, 0];
      if (q === 0) setc(c, pupil);
      else {
        var fiber = 0.92 + 0.08 * Math.sin(th * 7 + 0.6) * Math.sin(th * 5);
        setc(c, lin(iris)); mulc(c, rr > 0.95 ? 0.28 : fiber * (rr < 0.7 ? 1.12 : 0.88) * (1 - 0.1 * Math.max(0, Math.sin(th))));
      }
      var ex = x + Math.cos(th) * rr * r, ey = y + Math.sin(th) * rr * r;
      // The clear dome rolls smoothly back into a narrow, seated limbus.
      // Pulling the outer ring down avoids a raised, coin-like iris outline.
      geo.v(ex, ey, side * (surfZ(prof, sq, ex, ey) + r * b * (0.72 - 0.59 * rr * rr) * (1 - 0.52 * smooth(0.79, 1.06, rr))),
        c, 2.5 + Math.cos(th) * rr * 0.5, 0.5 + Math.sin(th) * rr * 0.5);
    }
    function tri(a, b0, c0) { if (side > 0) geo.i.push(a, b0, c0); else geo.i.push(a, c0, b0); }
    for (a = 0; a < ns; a++) tri(first, first + 1 + a, first + 1 + (a + 1) % ns);
    for (q = 0; q < radii.length - 1; q++) for (a = 0; a < ns; a++) {
      var i = first + 1 + q * ns + a, j = first + 1 + q * ns + (a + 1) % ns;
      tri(i, i + ns, j); tri(j, i + ns, j + ns);
    }
  }

  // Scales follow the body rather than the UV grid, and soften over the head.
  // Smooth-skinned species retain pores instead of acquiring teleost scales.
  function fishSurface(P, def) {
    var pores = noise2(P.x * 480 + 7.3, P.y * 480 - 3.1), smoothSkin = !!def.smoothSkin;
    var poreDetail = 1 - smooth(0.0013, 0.004, Math.max(P.aa, P.aay));
    if (smoothSkin) return 0.48 + (pores - 0.5) * 0.065 * poreDetail;
    var step = def.scaleSize || 0.022;
    // Ordinary small scales flow with the shoulder rather than forming a
    // rectangular stamp. Preserve alignment with the large parrotfish marks.
    var flow = def.scaleSize ? 0 : 0.14 * Math.sin(P.x * 4.3) * (1 - Math.min(1, Math.abs(P.yn)));
    var gy = P.y / (step * 0.78) + flow, row = Math.floor(gy), gx = P.x / step + (row & 1) * 0.5;
    var fx = fract(gx) - 0.5, fy = fract(gy) - 0.5, rr = Math.sqrt(fx * fx + fy * fy * 1.45);
    var aa = Math.min(0.2, Math.max(P.aa, P.aay) / step), cell = hash2(Math.floor(gx), row);
    // Overlapping scales have a raised posterior crescent and recessed joint,
    // with a broad smooth centre rather than a uniformly embossed grid.
    var outline = rr - (0.452 + 0.016 * cell) + fx * 0.12, edge = band(outline, 0.028, aa);
    var lip = band(outline + 0.055, 0.035, aa) * smooth(0.12, -0.4, fx);
    var cup = (1 - smooth(0.18, 0.5, rr)) * (0.82 + 0.18 * cell);
    var body = smooth(0.38, 0.25, P.x) * (1 - 0.6 * smooth(0.8, 1, Math.abs(P.yn)));
    var scaleDetail = 1 - smooth(0.3, 0.7, Math.max(P.aa, P.aay) / step);
    return 0.48 + body * scaleDetail * (0.065 * cup + 0.045 * lip - edge * 0.1) +
      (pores - 0.5) * 0.022 * poreDetail - (P.lateral || 0) * 0.028 - (P.gill || 0) * 0.05;
  }

  // Give the cheek a quiet volume change into the opercular edge, using the
  // existing rings. The same surface seats the eyes, mouth and pectoral roots;
  // field-mark coordinates and the top/bottom silhouette remain unchanged.
  // Rigid box forms, smooth-skinned fish and curved spines keep their own form.
  function fishProfile(def) {
    var base = profile(def.rows);
    if (!def.eye || def.spine || def.smoothSkin || (def.square || 2) > 2.5) return base;
    var cheekX = def.eye[0] - 0.055, rimX = def.eye[0] - 0.118;
    return function (x, out) {
      var p = base(x, out), cheek = (x - cheekX) / 0.065, rim = (x - rimX) / 0.018;
      p[2] *= 1 + 0.06 * Math.exp(-cheek * cheek) - 0.025 * Math.exp(-rim * rim);
      return p;
    };
  }

  // Every fish part as unit-space Geo plus the body pixels. They depend only on
  // the species and tier, so a reef's repeated species bake them once per page.
  function fishParts(T, id, def, high, school) {
    return bake('fish|' + id + '|' + (high ? 'h' : 'l') + (school ? 's' : 'i'), function () { return fishBake(T, def, high, school); });
  }
  // A colour phase picked by the seed (such as initial-phase parrotfish).
  function fishLook(id, def, seed) {
    var name = def.variant ? def.variant(seed) : null;
    if (!name) return { def: def, key: id };
    var v = def.variants[name], out = {}, k;
    for (k in def) if (Object.prototype.hasOwnProperty.call(def, k)) out[k] = def[k];
    for (k in v) if (Object.prototype.hasOwnProperty.call(v, k)) out[k] = v[k];
    return { def: out, key: id + '~' + name };
  }
  // The body's pigment (sRGB) and relief (linear) textures, shared per THREE.
  function fishMaps(kit, id, high, school, parts) {
    var key = 'fish|' + id + '|' + (high ? 'h' : 'l') + (school ? 's' : 'i');
    return [kit.share(key + '|pigment', function () { return dataTexture(kit.T, parts.tex, parts.W, parts.H, false, true, false); }),
      kit.share(key + '|relief', function () { return dataTexture(kit.T, parts.surface, parts.W, parts.H, false, true, true); })];
  }
  function fishBake(T, def, high, school) {
    var rows = def.rows, x0 = rows[0][0], xP = rows[rows.length - 1][0], sq = def.square || 2, prof = fishProfile(def);
    var nx = school ? (high ? 18 : 10) : (high ? 44 : 20), na = school ? (high ? 14 : 9) : (high ? 32 : 14);
    var nseg = school ? 5 : (high ? 22 : 7), nv = school ? 1 : (high ? 4 : 2);
    var body = new Geo(), fins = new Geo(), detail = new Geo(), sec = [0, 0, 0], e = 2 / sq, white = [1, 1, 1], r, a;
    var spine = def.spine || null;
    for (r = 0; r <= nx; r++) {
      var t = r / nx, x = lerp(x0, xP, t), off = spine ? spine(x) : null; prof(x, sec);
      var yc = (sec[0] + sec[1]) / 2, hh = (sec[0] - sec[1]) / 2, row0 = body.count();
      for (a = 0; a <= na; a++) {
        var ang = -PI / 2 + a / na * TAU;
        body.v(x, yc + sp(Math.sin(ang), e) * hh + (off ? off[0] : 0), sp(Math.cos(ang), e) * sec[2] + (off ? off[1] : 0), white, t, a / na);
      }
      body.seams.push([row0, row0 + na]);
    }
    for (r = 0; r < nx; r++) for (a = 0; a < na; a++) {
      var i0 = r * (na + 1) + a, i1 = i0 + 1, j0 = i0 + na + 1, j1 = j0 + 1;
      body.i.push(i0, i1, j0, i1, j1, j0);
    }
    var o0 = spine ? spine(x0) : [0, 0], o1 = spine ? spine(xP) : [0, 0];
    prof(x0, sec); var snout = body.v(x0 + 0.003, (sec[0] + sec[1]) / 2 + o0[0], o0[1], white, 0, 0.5);
    prof(xP, sec); var end = body.v(xP - 0.002, (sec[0] + sec[1]) / 2 + o1[0], o1[1], white, 1, 0.5), last = nx * (na + 1);
    for (a = 0; a < na; a++) { body.i.push(a + 1, a, snout); body.i.push(last + a, last + a + 1, end); }

    // Body texture: u runs snout to peduncle, v around from the belly.
    var size = def.tex || [128, 64], W = school ? size[0] : (high ? size[0] * 2 : size[0]), H = school ? size[1] : (high ? size[1] * 2 : size[1]);
    var cols = [], P = { aa: 0.75 * (x0 - xP) / W, L: def.lengthM };
    // Column (along the body) and row (around it) terms are tabulated once.
    var marks = def.eye && !spine && !def.smoothSkin, rowsUp = [], rowsYn = [], rowsSide = [];
    for (var ci = 0; ci < W; ci++) {
      var cx = lerp(x0, xP, (ci + 0.5) / W), cs = prof(cx, [0, 0, 0]), yc0 = (cs[0] + cs[1]) / 2, hh0 = (cs[0] - cs[1]) / 2;
      cols.push([cx, cs[0], cs[1], cs[2], yc0, hh0, 0.75 * PI * (hh0 + cs[2]) / H,
        marks ? yc0 + hh0 * (0.23 + 0.16 * smooth(-0.18, 0.24, cx)) : 0,
        marks ? smooth(xP + 0.025, xP + 0.09, cx) * smooth(def.eye[0] - 0.035, def.eye[0] - 0.11, cx) : 0]);
    }
    for (var ri = 0; ri < H; ri++) { var ra = -PI / 2 + (ri + 0.5) / H * TAU; rowsUp.push(Math.sin(ra)); rowsSide.push(Math.cos(ra)); rowsYn.push(sp(Math.sin(ra), e)); }
    function surfacePoint(u, v, i, j) {
      var col = cols[i], up = rowsUp[j];
      P.u = u; P.v = v; P.x = col[0]; P.top = col[1]; P.bottom = col[2]; P.hw = col[3]; P.yc = col[4]; P.hh = col[5];
      P.up = up; P.side = rowsSide[j]; P.yn = rowsYn[j]; P.y = P.yc + P.yn * P.hh;
      P.aay = col[6];
      P.lateral = 0; P.gill = 0; P.gillD = 0; P.gillFace = 0;
      if (marks) {
        var lateralY = col[7], lateralSpan = col[8];
        P.lateral = lateralSpan > 0 ? band(P.y - lateralY, 0.001, Math.max(0.0014, P.aay)) * lateralSpan : 0;
        var gf = clamp((P.top * 0.68 - P.y) / Math.max(0.01, P.top * 0.68 - P.bottom * 0.76), 0, 1);
        P.gillD = P.x - (def.eye[0] - 0.07 - 0.045 * Math.sin(PI * gf));
        P.gillFace = Math.sin(PI * gf);
        P.gill = band(P.gillD, 0.002, Math.max(P.aa, 0.0018)) * P.gillFace;
      }
    }
    // Pigment and relief come from one pass over the body (fishSurface once).
    var maps = paintPair(W, H, function (u, v, out, rel, i, j) {
      surfacePoint(u, v, i, j);
      def.paint(P, out);
      // Fine pigment sits under the mucus layer. Preserve species field marks
      // while giving the lit flank a gentle transition into the darker back.
      var relief = fishSurface(P, def), pigment = noise2(P.x * 35.0 + 1.7, P.y * 43.0);
      var flank = smooth(0.37, 0.23, P.x) * (1 - smooth(0.72, 1, Math.abs(P.yn)));
      mulc(out, 0.985 + (pigment - 0.5) * 0.035 + (relief - 0.48) * flank * 0.32 - 0.055 * smooth(0.35, 1, P.up));
      // The operculum blends into its shallow recessed edge, rather than
      // reading as a drawn line floating above an otherwise featureless head.
      if (def.eye && !spine && !def.smoothSkin) {
        mulc(out, 1 - 0.105 * P.gill - 0.045 * P.lateral);
        mulc(out, 1 + 0.025 * Math.exp(-Math.pow((P.gillD - 0.018) / 0.022, 2)) * P.gillFace);
      }
      rel[0] = relief;
      // A smoother mucus layer on the cheek and scale centres catches broad
      // highlights; the joints stay matte, not covered in uniform glitter.
      rel[1] = 0.88 - (relief - 0.48) * 0.6 - 0.085 * smooth(0.19, 0.42, P.x) +
        0.035 * smooth(0.38, 0.9, Math.abs(P.yn));
      rel[2] = relief;
    });

    var finCol = def.fin || defaultFin(def), dorsal = def.dorsal || [], anal = def.anal || [];
    // Billow the existing membrane vertices between each root and free edge.
    // Ray tips stay supported while the webbing bows gently under water load.
    function billow(geo, first, amount, rays) {
      for (var k = first; k < geo.count(); k++) {
        var u = geo.t[k * 2], v = geo.t[k * 2 + 1];
        // The soft web cups farther behind its leading support; both attached
        // and free edges retain the species' outline and the root cannot drift.
        var camber = Math.sin(PI * v) * (0.6 + 0.4 * v);
        geo.p[k * 3 + 2] += amount * camber * (0.68 + 0.32 * Math.cos(u * PI * rays));
      }
    }
    function median(spec, sign, kind) {
      var roots = [], edges = [], shape = finShape(spec.shape), s2 = [0, 0, 0], n = spec.n || nseg;
      for (var q = 0; q <= n; q++) {
        var u = q / n, x = lerp(spec.from, spec.to, u); prof(x, s2);
        var off2 = spine ? spine(x) : [0, 0], y0 = (sign > 0 ? s2[0] - 0.12 * (s2[0] - s2[1]) * 0.1 : s2[1] + 0.012 * (s2[0] - s2[1])) + off2[0];
        var hgt = (q === 0 || q === n) ? 0 : spec.h * shape(u);
        if (high && !school && !def.smoothSkin) hgt *= 1 - 0.035 * (q % 2);
        roots.push([x, y0, off2[1]]); edges.push([x - (spec.rake === undefined ? 0.35 : spec.rake) * hgt, y0 + sign * hgt, off2[1] + 0.035 * hgt * Math.sin(u * PI * 2)]);
      }
      var start = fins.membrane(roots, edges, spec.nv || nv, function (u, v, out) { finCol(kind, u, v, out); });
      billow(fins, start, spec.h * 0.075, Math.min(n, 12));
    }
    dorsal.forEach(function (spec, k) { median(spec, 1, 'dorsal' + k); });
    anal.forEach(function (spec, k) { median(spec, -1, 'anal' + k); });
    if (def.pelvic) {
      var pv = def.pelvic, ps = prof(pv.x, [0, 0, 0]);
      [-1, 1].forEach(function (side) {
        var w = ps[2] * 0.35;
        fins.membrane([[pv.x + 0.01, ps[1] + 0.01, side * w], [pv.x - 0.025, ps[1] + 0.006, side * w]],
          [[pv.x - pv.len * 0.75, ps[1] - pv.len * 0.6, side * (w + pv.len * 0.25)], [pv.x - pv.len, ps[1] - pv.len * 0.25, side * (w + pv.len * 0.2)]], nv, function (u, v, out) { finCol('pelvic', u, v, out); });
      });
    }
    // Caudal fin on its own pivot at the peduncle.
    var tail = new Geo();
    if (def.tail) {
      prof(xP, sec); var tyc = (sec[0] + sec[1]) / 2 + o1[0], thh = (sec[0] - sec[1]) / 2, troots = [], tedges = [], tn = school ? 6 : (high ? 22 : 9);
      for (var q = 0; q <= tn; q++) {
        var vv = q / tn * 2 - 1, te = tailEdge(def.tail, vv);
        if (high && !school && !def.smoothSkin) te[0] *= 1 - 0.026 * (q % 2) * Math.sin(PI * q / tn);
        troots.push([0.02, tyc + vv * thh * 0.85, 0]); tedges.push([te[0], tyc + te[1], 0.006 * Math.sin(vv * PI)]);
      }
      tail.membrane(troots, tedges, school ? 2 : (high ? 6 : 3), function (u, v, out) { finCol('tail', u, v, out); });
      billow(tail, 0, def.tail.len * 0.065, Math.min(tn, 12));
    }
    var pecs = [];
    if (def.pectoral) {
      var pc = def.pectoral, pg = new Geo(), proots = [], pedges = [], pn = pc.rays || (school ? 4 : high ? 9 : 6), arc = pc.arc || 0.5, pshape = pc.shape || function (u) { return 0.72 + 0.28 * Math.sin(PI * u); };
      for (var k = 0; k <= pn; k++) {
        var u2 = k / pn, th = lerp(-arc, arc, u2), Lq = pc.len * pshape(u2);
        if (high && !school && !def.smoothSkin && !pc.rays) Lq *= 1 - 0.025 * (k % 2) * Math.sin(PI * u2);
        proots.push([0, lerp(-pc.width, pc.width, u2) * 0.5, 0]); pedges.push([-Math.cos(th) * Lq, Math.sin(th) * Lq * 0.9, Lq * 0.09 * Math.sin(PI * u2)]);
      }
      pg.membrane(proots, pedges, pc.nv || (school ? 1 : high ? 5 : 2), function (u, v, out) { finCol('pectoral', u, v, out); });
      billow(pg, 0, pc.len * 0.045, Math.min(pn, 12));
      var pz = surfZ(prof, sq, pc.x, pc.y);
      pecs.push({ geo: pg, pos: [pc.x, pc.y, pz + 0.004], side: 1 }, { geo: pg, pos: [pc.x, pc.y, -pz - 0.004], side: -1 });
    }
    if (def.eye) { addEye(T, detail, prof, sq, def.eye, 1, def.iris || [0.75, 0.6, 0.2], high, def.eyeBulge, school); addEye(T, detail, prof, sq, def.eye, -1, def.iris || [0.75, 0.6, 0.2], high, def.eyeBulge, school); }
    if (!school && def.eye && !def.spine && !def.smoothSkin) {
      // The opercular edge is supplied by the continuous colour/relief map;
      // a narrow surface tube aliased into dark dots at swimming distance.
      // Keep a fine, physically seated mouth crease on each flank.
      [-1, 1].forEach(function (side) {
        var mx = x0 - 0.045, mp = [], ink = lin([0.21, 0.235, 0.22]);
        for (var j = 0; j <= 4; j++) {
          var xx = lerp(mx, x0 + 0.0005, j / 4), ms = prof(Math.min(x0, xx)), yy = (ms[0] + ms[1]) / 2 - 0.003;
          mp.push([xx, yy, side * (surfZ(prof, sq, Math.min(x0, xx), yy) + 0.0007)]);
        }
        detail.tube(mp, 0.0011, 3, function () { return ink; });
      });
    }
    var extras = [];
    var ctx = { T: T, def: def, prof: prof, sq: sq, high: high, school: school, fins: fins, detail: detail, body: body, xP: xP, x0: x0,
      surfZ: function (x, y) { return surfZ(prof, sq, x, y); }, part: function (name, geo, pos, kind) { extras.push({ name: name, geo: geo, pos: pos, kind: kind || 'fin' }); } };
    if (def.extra) def.extra(ctx);
    // A school draws each part as one instanced mesh, so extras join their part.
    if (school) extras.forEach(function (ex) { (ex.kind === 'detail' ? detail : fins).append(ex.geo, ex.pos[0], ex.pos[1], ex.pos[2]); });
    return { body: body, fins: fins, detail: detail, tail: tail, pecs: pecs, extras: school ? [] : extras, tex: maps[0], surface: maps[1], W: W, H: H, xP: xP, x0: x0, prof: prof };
  }
  // The fins material carries a batch rig (a fish's eyes and details draw in
  // its batch). batched (a single fish): the tail and pectoral flexes come back
  // as the values of their slots; a school keeps their own materials.
  function fishMaterials(kit, def, tex, surface, swim, batched) {
    var T = kit.T, sh = def.sheen ? sheenOf(T, def.sheen[0], def.sheen[1], def.sheen[2] * 0.62) : null;
    // Membranes on their own pivots (tail, pectorals, free extras) take no
    // body bend; the tail and pectorals flex behind their attached roots.
    var still = { value: new T.Vector4(swim.shape.value.x, swim.shape.value.y, 0, 0) };
    function flexOf(flexKind) {
      return new T.Vector4(flexKind === 'tail' ? 1 : (def.pecRate || 1.3),
        flexKind === 'tail' ? -swim.u.value.z * swim.shape.value.y - 0.9 : -1.62,
        Math.pow(TAU / (swim.u.value.z * 1.15) * 0.2, 2), 0.42);
    }
    function membrane(bending, flexKind, rig) {
      var flex = flexKind ? { value: flexOf(flexKind) } : null;
      return kit.std({ vertexColors: true, side: T.DoubleSide, roughness: 0.59, metalness: 0 }, { swim: swim.u, swimShape: bending ? swim.shape : still, flex: flex, rays: true, iris: def.iris, finRelief: def.smoothSkin ? 0 : 0.22, batch: rig });
    }
    var free = null, finsRig = new Float32Array(80), detailRig = null, detail = null;
    var out = {
      body: kit.std({ map: tex, bumpMap: surface, bumpScale: def.lengthM * (def.smoothSkin ? 0.00065 : 0.00165), roughnessMap: surface,
        roughness: def.rough === undefined ? 0.62 : def.rough, metalness: def.metal === undefined ? 0 : def.metal }, { swim: swim.u, swimShape: swim.shape, sheen: sh }),
      fins: membrane(true, null, finsRig), finsRig: finsRig
    };
    if (batched) { out.tailFlex = def.tail ? flexOf('tail') : null; out.pectoralFlex = def.pectoral ? flexOf('pectoral') : null; }
    else {
      out.free = function () { return free || (free = membrane(false)); };
      out.tailFlex = def.tail ? membrane(false, 'tail') : null;
      out.pectoralFlex = def.pectoral ? membrane(false, 'pectoral') : null;
    }
    // Details draw in the fins' batch; a separate detail mesh only if the batch has no slot left.
    out.detail = function () { return detail || (detail = kit.std({ vertexColors: true, roughness: 0.57, metalness: 0 }, { swim: swim.u, swimShape: swim.shape, eye: true, iris: def.iris, batch: detailRig = new Float32Array(80) })); };
    out.detailRig = function () { return detailRig; };
    return out;
  }
  // Bounding radius about the root origin, from the vertices (instances by their spheres).
  function radiusOf(T, root) {
    root.updateMatrixWorld(true);
    var inv = new T.Matrix4().copy(root.matrixWorld).invert(), m = new T.Matrix4(), im = new T.Matrix4(), v = new T.Vector3(), r = 0.01;
    root.traverse(function (o) {
      if (!o.isMesh) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      if (o.isInstancedMesh) {
        var g = o.geometry;
        for (var i = 0; i < o.count; i++) {
          o.getMatrixAt(i, im); im.premultiply(m);
          var pos = g.attributes.position;
          for (var k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(im); r = Math.max(r, v.length()); }
        }
        return;
      }
      var p = o.geometry.attributes.position, frames = BATCH_FRAMES && BATCH_FRAMES.get(o.geometry), table = o.geometry.userData.batch;
      if (frames && table) {
        // A batch: each moved part in its own frame, as when it was a mesh.
        for (var t = 0; t < table.length; t++) {
          var f = frames[t];
          if (!f) { for (var a = table[t].first; a < table[t].first + table[t].count; a++) { v.fromBufferAttribute(p, a).applyMatrix4(m); r = Math.max(r, v.length()); } continue; }
          im.multiplyMatrices(inv, f.node.matrixWorld);
          for (var c = 0; c < f.local.length; c += 3) { v.set(f.local[c], f.local[c + 1], f.local[c + 2]).applyMatrix4(im); r = Math.max(r, v.length()); }
        }
        return;
      }
      for (var j = 0; j < p.count; j++) { v.fromBufferAttribute(p, j).applyMatrix4(m); r = Math.max(r, v.length()); }
    });
    return r;
  }

  // A broad stroke recovers edge-first instead of paddling the same flat
  // membrane in both directions. Only the existing pivot rotates: there are
  // no frame-dependent integrators, allocations or extra geometry uploads.
  function featherPectoral(rotation, side, spread, droop, fan, beat, steering, posing) {
    var stroke = 0.5 + 0.42 * Math.sin(beat) + 0.08 * Math.sin(beat * 2 - 0.35);
    var recovery = smooth(0.22, -0.48, Math.cos(beat));
    var feather = fan * (0.16 * Math.cos(beat - 0.7) + 0.72 * recovery);
    rotation.set(side * feather, side * (spread + fan * stroke + steering + 0.75 * posing), droop + fan * 0.2 * Math.sin(beat - 0.8) - 0.12 * posing);
  }

  function makeFish(T, id, info, def, o) {
    var kit = new Kit(T, id, info.group, o.high, o.derivatives), rng = stream(o.seed, 11);
    var L = def.lengthM * (0.92 + 0.16 * rng()), unit = L * (def.unit || 1), ph0 = rng() * TAU;
    var look = fishLook(id, def, o.seed); def = look.def;
    var parts = fishParts(T, look.key, def, o.high, false), maps = fishMaps(kit, look.key, o.high, false, parts);
    var amp = 0.045 * L * (def.wiggle === undefined ? 1 : def.wiggle), kWave = TAU / (1.15 * L);
    var swim = { u: { value: new T.Vector4(0, 0, kWave, 0) }, shape: { value: new T.Vector4(0.22 * unit, parts.xP * unit, 1, 0) } };
    var mats = fishMaterials(kit, def, maps[0], maps[1], swim, true), root = kit.root(), pose0 = kit.node('pose', root), pose = kit.node('holder', pose0);
    if (def.offset) pose.position.set(-def.offset[0] * unit, -def.offset[1] * unit, -def.offset[2] * unit);
    kit.mesh(kit.geo(parts.body, unit), mats.body, 'body', pose);
    // The membranes (fins, tail, pectorals), the eyes and the other details
    // draw as one batch. The tail, the pectorals and any free part keep their
    // pivots, which batchPose hands to the shared shader every update.
    var finParts = [], detailParts = [];
    if (parts.fins.count()) finParts.push({ geo: parts.fins.build(T, unit), part: 'fins' });
    if (parts.detail.count()) detailParts.push(batchDetail({ geo: parts.detail.build(T, unit), part: 'detail' }));
    var tailPivot = kit.node('tail-pivot', pose); tailPivot.position.set(parts.xP * unit, 0, 0);
    if (parts.tail.count()) finParts.push({ geo: parts.tail.build(T, unit), part: 'tail', node: tailPivot, flex: mats.tailFlex, bend: 0 });
    var pecGeo = null, pecs = [], spread = def.pectoral ? (def.pectoral.spread || 0.35) : 0, droop = def.pectoral ? (def.pectoral.droop || 0.1) : 0;
    parts.pecs.forEach(function (pc) {
      if (!pecGeo) pecGeo = pc.geo.build(T, unit);
      var pv = kit.node('pectoral-pivot', pose); pv.position.set(pc.pos[0] * unit, pc.pos[1] * unit, pc.pos[2] * unit);
      pv.rotation.set(0, pc.side * spread, droop); finParts.push({ geo: pecGeo, part: 'pectoral', node: pv, flex: mats.pectoralFlex, bend: 0 }); pecs.push({ node: pv, side: pc.side });
    });
    var named = {};
    parts.extras.forEach(function (ex) {
      var pv = kit.node(ex.name + '-pivot', pose); pv.position.set(ex.pos[0] * unit, ex.pos[1] * unit, ex.pos[2] * unit);
      // A detail part bends with the body like the detail mesh; a free fin does not.
      if (ex.kind === 'detail') detailParts.push(batchDetail({ geo: ex.geo.build(T, unit), part: ex.name, node: pv }));
      else finParts.push({ geo: ex.geo.build(T, unit), part: ex.name, node: pv, bend: 0 });
      named[ex.name] = pv;
    });
    var hz = (def.beat || 1) * clamp(0.95 / Math.pow(L, 0.35), 0.5, 3.2), disposed = false, rm = !!o.reducedMotion, localFlow = { x: 0, z: 0, pulse: 0 };
    var actx = { T: T, root: root, pose: pose0, parts: named, unit: unit, L: L, pecs: pecs, tail: tailPivot, def: def };
    if (def.rest) def.rest(actx);
    // A rig has four slots; past that the details keep a batch of their own.
    var together = batchSlots(finParts) + batchSlots(detailParts) <= 4;
    var batches = together ? [batchFish(kit, finParts.concat(detailParts), mats.fins, mats.finsRig, 'fins', pose, L)] :
      [batchFish(kit, finParts, mats.fins, mats.finsRig, 'fins', pose, L), batchFish(kit, detailParts, mats.detail(), mats.detailRig(), 'detail', pose, L)];
    function bendZ(x, ph, amplitude) { var w = smooth(0, 1, clamp((0.22 * unit - x) / (0.22 * unit - parts.xP * unit), 0, 1)); return amplitude * w * w * Math.sin(ph - kWave * x); }
    function update(dt, t, motion) {
      if (disposed || rm) return;
      // Absolute phase survives culling and changes in swimming speed. Effort
      // changes stroke depth, never multiplies elapsed time and snaps the tail.
      t = num(t, 0); var ph = t * hz * TAU + ph0 + 0.16 * Math.sin(t * 0.47 + ph0), xp = parts.xP * unit;
      var drive = effort(motion, L), turn = turning(motion), glide = smooth(-0.38, 0.72, Math.sin(t * 0.62 + ph0));
      currentAt(root, motion, t, ph0, localFlow);
      var amplitude = amp * (0.29 + 0.71 * Math.min(1.3, drive)) * (0.42 + 0.58 * glide);
      swim.u.value.set(ph, amplitude, kWave, 0);
      var z0 = bendZ(xp, ph, amplitude), theta = ph - kWave * xp;
      // The envelope has zero derivative at the peduncle; its tangent is
      // continuous with the shader bend, including the tail attachment.
      var slope = -amplitude * kWave * Math.cos(theta);
      var tailFlex = 0.18 * amplitude / Math.max(L * 0.045, 0.0001) * Math.sin(theta - 0.72);
      tailPivot.position.z = z0; tailPivot.rotation.y = (-Math.atan(slope) * 1.08 + tailFlex) * (def.tailBeat === undefined ? 1 : def.tailBeat);
      pose0.rotation.set(0.004 * Math.sin(ph - 0.4) + turn * 0.04 + localFlow.z * localFlow.pulse * 0.012, 0.004 * Math.sin(ph + 0.6) * drive, 0.006 * Math.sin(t * 0.65 + ph0));
      var pa = def.pecBeat === undefined ? 0.35 : def.pecBeat;
      // A client posing at a cleaning station (motion.spread 0..1) holds its
      // side fins out and still, so the cleaner can reach its body.
      var posing = clamp(num(motion && motion.spread, 0), 0, 1);
      for (var i = 0; i < pecs.length; i++) {
        var fin = pecs[i], beat = ph * (def.pecRate || 1.3) + i * 0.14 - 0.82, steering = turn * fin.side * 0.1 + localFlow.z * fin.side * 0.018;
        var fan = pa * (0.38 + 0.62 * (1 - Math.min(1, drive) * 0.58)) * (0.82 + 0.18 * (1 - glide)) * (1 - 0.75 * posing);
        // A broad power stroke feathers into a narrower recovery. Slow fish
        // scull more actively; fast swimmers fold the fins closer to the body.
        featherPectoral(fin.node.rotation, fin.side, spread, droop, fan, beat, steering, posing);
      }
      if (def.anim) def.anim(actx, t, ph);
      batchPose(batches[0]); batchPose(batches[1]);
    }
    function dispose() { if (disposed) return; disposed = true; if (root.parent) root.parent.remove(root); kit.dispose(); }
    return { root: root, update: update, dispose: dispose, radius: radiusOf(T, root), animated: true };
  }

  // An irregular, separated cloud deforms with a shared travelling flow.
  // Every motion is analytic: skipped frames, different rendering tiers and
  // a late return from culling all produce the same gently turning shoal.
  function makeSchool(T, id, info, def, count, o) {
    var kit = new Kit(T, id, info.group, o.high, o.derivatives), rng = stream(o.seed, 23), L = def.lengthM, unit = L * (def.unit || 1);
    var look = fishLook(id, def, o.seed); def = look.def;
    var parts = fishParts(T, look.key, def, o.high, true), maps = fishMaps(kit, look.key, o.high, true, parts), n = Math.max(1, Math.floor(num(count, 12))), root = kit.root();
    var fins = parts.fins;
    var amp = 0.032 * L * (def.wiggle === undefined ? 1 : def.wiggle), kWave = TAU / (1.15 * L);
    var swim = { u: { value: new T.Vector4(0, 0, kWave, 0) }, shape: { value: new T.Vector4(0.22 * unit, parts.xP * unit, 1, 0) }, school: true };
    var mats = fishMaterials(kit, def, maps[0], maps[1], swim), spacing = L * (def.spacing || 1.7);
    var slots = [], selected = [], far = 0, extent = Math.pow(n, 1 / 3), layout = stream(o.seed, 67), i;
    // Best-candidate points fill an ellipsoid instead of inheriting rows from
    // a lattice. Layout has its own stream: changing packing cannot retime
    // members' strokes or change their individual colour and size variation.
    for (i = 0; i < n; i++) {
      var best = null, bestGap = -1;
      for (var attempt = 0; attempt < (i ? 16 : 1); attempt++) {
        var x, y, z, r;
        do { x = layout() * 2 - 1; y = layout() * 2 - 1; z = layout() * 2 - 1; r = x * x + y * y + z * z; } while (r > 1);
        var candidate = i ? { x: x * spacing * extent * 0.52, y: y * spacing * extent * 0.22, z: z * spacing * extent * 0.40 } : { x: 0, y: 0, z: 0 };
        var gap = Infinity;
        for (var k = 0; k < selected.length; k++) {
          var dx = candidate.x - selected[k].x, dy = (candidate.y - selected[k].y) * 0.55, dz = candidate.z - selected[k].z;
          gap = Math.min(gap, dx * dx + dy * dy + dz * dz);
        }
        if (gap > bestGap) { bestGap = gap; best = candidate; }
      }
      selected.push(best);
    }
    var minGap = L * 0.82;
    // Reserve vertical room for the existing grazing flattening as well as
    // cruising. Setup-only relaxation is bounded; frames never search pairs.
    for (var pass = 0; pass < 10; pass++) for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
      var ax = selected[j].x - selected[i].x, ay = selected[j].y - selected[i].y, az = selected[j].z - selected[i].z;
      var distance = Math.sqrt(ax * ax + ay * ay * 0.3025 + az * az);
      if (distance < minGap && distance > 0.000001) {
        var push = (minGap - distance) / distance * 0.51;
        selected[i].x -= ax * push; selected[i].y -= ay * push; selected[i].z -= az * push;
        selected[j].x += ax * push; selected[j].y += ay * push; selected[j].z += az * push;
      }
    }
    var cx = 0, cy = 0, cz = 0;
    for (i = 0; i < n; i++) { cx += selected[i].x; cy += selected[i].y; cz += selected[i].z; }
    for (i = 0; i < n; i++) {
      var station = selected[i], sx = station.x - cx / n, sy = station.y - cy / n, sz = station.z - cz / n;
      slots.push({ x: sx, y: sy, z: sz, s: 0.86 + 0.22 * rng(), ph: rng() * TAU, yaw: (rng() - 0.5) * 0.08, w: 0.92 + 0.16 * rng(), tint: rng() });
      far = Math.max(far, Math.sqrt(sx * sx + sy * sy + sz * sz));
    }
    var R = Math.max(L, far), reach = far * 1.2 + L * 1.5, meshes = [], beatData = new Float32Array(n * 4);
    // Rate, stroke phase, glide phase and strength share one instanced
    // attribute, with no extra random draws or per-frame buffer uploads.
    for (i = 0; i < n; i++) { beatData[i * 4] = slots[i].w; beatData[i * 4 + 1] = slots[i].ph * 3; beatData[i * 4 + 2] = slots[i].ph; beatData[i * 4 + 3] = 0.9 + slots[i].tint * 0.2; }
    function inst(geo, mat, part) {
      geo.setAttribute('reefSchoolBeat', new T.InstancedBufferAttribute(beatData, 4));
      var m = kit.tag(new T.InstancedMesh(geo, mat, n), part); m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      geo.boundingSphere = new T.Sphere(new T.Vector3(), reach); root.add(m); meshes.push(m); return m;
    }
    // The fins and the eyes and other details share one instanced draw (a batch;
    // the details keep their own roughness, the body bend and the wet eye).
    var finEntries = fins.count() ? [{ geo: fins.build(T, unit), part: 'fins' }] : [];
    if (parts.detail.count()) finEntries.push(batchDetail({ geo: parts.detail.build(T, unit), part: 'detail' }));
    var body = inst(kit.geo(parts.body, unit), mats.body, 'body'), finM = finEntries.length ? inst(batchGeometry(kit, finEntries, mats.finsRig).geometry, mats.fins, 'fins') : null;
    var tail = parts.tail.count() ? inst(kit.geo(parts.tail, unit), mats.tailFlex, 'tail') : null;
    // Reuse the same membrane vertices, but articulate each side separately.
    // There are two extra instanced draws and no additional triangles.
    var pecGeo = parts.pecs.length ? kit.geo(parts.pecs[0].geo, unit) : null, pectorals = [];
    parts.pecs.forEach(function (pc) { pectorals.push({ mesh: inst(pecGeo, mats.pectoralFlex, 'pectoral-' + (pc.side > 0 ? 'left' : 'right')), side: pc.side, pos: pc.pos }); });
    // Every part carries an instance colour (white unless tinted): the parts
    // then share shader programs with other tinted instanced organisms.
    var tc = new T.Color();
    for (i = 0; i < n; i++) {
      if (def.schoolTint) def.schoolTint(slots[i].tint, tc); else tc.setRGB(1, 1, 1);
      body.setColorAt(i, tc);
    }
    tc.setRGB(1, 1, 1);
    meshes.forEach(function (m) { if (m !== body) for (var k = 0; k < n; k++) m.setColorAt(k, tc); });
    var m4 = new T.Matrix4(), tm = new T.Matrix4(), lm = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3(), one = new T.Vector3(1, 1, 1), tq = new T.Quaternion(), tp = new T.Vector3(), groupQ = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
    var hz = (def.beat || 1) * clamp(0.95 / Math.pow(L, 0.35), 0.5, 3.2), disposed = false, rm = !!o.reducedMotion, xp = parts.xP * unit, localFlow = { x: 0, z: 0, pulse: 0 };
    // Grazing (motion.graze 0..1): the members settle low and still over the reef
    // and take head-down bites in turn, member i at fract(t / period + i * stagger)
    // = contact. The schedule is published (handle.graze) so the dive can place
    // each bite's puff of sediment under the fish that took it.
    var GRAZE = { period: 6, stagger: 0.618034, window: 0.3, contact: 0.15, squeeze: 0.15 };
    function place(t, moving, motion) {
      var drive = effort(motion, L), turn = turning(motion), graze = moving ? clamp(num(motion && motion.graze, 0), 0, 1) : 0, flow = moving ? 1 - 0.8 * graze : 0;
      var phase = t * hz * TAU + 0.16 * Math.sin(t * 0.44), amplitude = amp * (0.34 + 0.66 * Math.min(1.3, drive)) * flow;
      swim.u.value.set(phase, amplitude, kWave, t);
      currentAt(root, motion, t, 0, localFlow);
      // A cruising school lengthens gently along its route and draws its
      // cross-section in. Relax it before grazing so the published feeding
      // stations and their bite timing stay independent of swimming effort.
      var paceStretch = 1 + flow * (1 - graze) * 0.09 * smooth(0.35, 1.35, drive), paceWidth = 1 / Math.sqrt(paceStretch);
      var breathe = (1 + flow * 0.04 * Math.sin(t * 0.32)) * paceWidth, stretch = (1 + flow * 0.055 * Math.sin(t * 0.24 + 1.2)) * paceStretch, cruise = Math.max(L * 0.6, num(motion && motion.speed, L * 1.3));
      var breatheRate = flow * 0.04 * 0.32 * Math.cos(t * 0.32) * paceWidth, stretchRate = flow * 0.055 * 0.24 * Math.cos(t * 0.24 + 1.2) * paceStretch;
      var curve = flow * clamp(turn * R / Math.max(cruise, L * 1.3) * 0.22, -0.18, 0.18);
      var yaw = flow * (0.095 * Math.sin(t * 0.24) + 0.035 * Math.sin(t * 0.41));
      var yawRate = flow * (0.095 * 0.24 * Math.cos(t * 0.24) + 0.035 * 0.41 * Math.cos(t * 0.41));
      // A slight travelling tilt redistributes a cross-section without
      // revolving the whole school. It settles out before grazing contact.
      var reshape = flow * (1 - graze), rollPhase = t * 0.19;
      groupQ.setFromAxisAngle(up, yaw);
      for (var i = 0; i < n; i++) {
        var s = slots[i], a = t * 0.68 - s.x / R * 0.9, b = t * 0.43 - s.x / R * 0.65 + s.z / R * 0.4;
        var memberGlide = smooth(-0.38, 0.72, Math.sin(t * 0.62 * s.w + s.ph));
        var individual = t * 0.48 * s.w + s.ph, lateral = L * (0.34 * Math.sin(a) + 0.045 * Math.sin(individual));
        var rise = L * (0.11 * Math.sin(b) + 0.022 * Math.cos(individual * 0.8));
        var cyc = fract(t / GRAZE.period + i * GRAZE.stagger), nod = graze * (cyc < GRAZE.window ? Math.sin(PI * cyc / GRAZE.window) : 0);
        var close = 1 - GRAZE.squeeze * graze;
        p.set(s.x * stretch * close + flow * 0.075 * L * Math.cos(individual * 0.73), s.y * breathe * (1 - 0.5 * graze) + flow * rise - nod * 0.05 * L, s.z * breathe * close + flow * lateral);
        // Derivatives of this same flow field orient each fish along its path.
        // The small independent drift is bounded, so neighbours keep room.
        var vx = s.x * stretchRate * close - flow * 0.075 * L * 0.73 * 0.48 * s.w * Math.sin(individual * 0.73);
        var vz = s.z * breatheRate * close + flow * L * (0.34 * 0.68 * Math.cos(a) + 0.045 * 0.48 * s.w * Math.cos(individual));
        var vy = s.y * breatheRate * (1 - 0.5 * graze) + flow * L * (0.11 * 0.43 * Math.cos(b) - 0.022 * 0.8 * 0.48 * s.w * Math.sin(individual * 0.8));
        var roll = reshape * 0.065 * Math.sin(rollPhase - s.x / R * 0.65), rollRate = reshape * 0.065 * 0.19 * Math.cos(rollPhase - s.x / R * 0.65);
        var rc = Math.cos(roll), rs = Math.sin(roll), py = p.y, pz = p.z, localVy = vy, localVz = vz;
        p.y = py * rc - pz * rs; p.z = py * rs + pz * rc;
        vy = localVy * rc - localVz * rs - rollRate * p.z;
        vz = localVy * rs + localVz * rc + rollRate * p.y;
        // Bend the whole cross-section around a smooth streamline. Simply
        // subtracting x squared from z sheared the outside members sideways.
        // The small-angle limits make straight swimming continuous through zero.
        var bend = curve * p.x / R, bs = Math.sin(bend), bc = Math.cos(bend), bend2 = bend * bend;
        var along = Math.abs(bend) > 0.0001 ? bs / bend : 1 - bend2 / 6;
        var inward = Math.abs(bend) > 0.0001 ? (1 - bc) / bend : bend * (0.5 - bend2 / 24);
        var beforeX = p.x, beforeZ = p.z, beforeVx = vx, beforeVz = vz, arcSpeed = 1 + curve * beforeZ / R;
        p.x = beforeX * along + beforeZ * bs; p.z = beforeZ * bc - beforeX * inward;
        vx = bc * arcSpeed * beforeVx + bs * beforeVz + yawRate * p.z;
        vz = -bs * arcSpeed * beforeVx + bc * beforeVz - yawRate * p.x;
        // Members align with their local velocity; a turn travels backward
        // through the school instead of every fish swivelling on one frame.
        var lag = clamp(-turn * (0.12 + 0.12 * (1 - s.x / R)), -0.25, 0.25);
        e.set(flow * (0.024 * Math.sin(a) + 0.065 * turn + localFlow.z * localFlow.pulse * 0.012), s.yaw + flow * (-Math.atan2(vz, cruise + vx) + lag + bend), flow * Math.atan2(vy, cruise + vx) - graze * 0.5 - nod * 0.25);
        q.setFromEuler(e).premultiply(groupQ); p.applyQuaternion(groupQ); sc.setScalar(s.s);
        m4.compose(p, q, sc); body.setMatrixAt(i, m4); if (finM) finM.setMatrixAt(i, m4);
        if (tail) {
          var ph = phase * s.w + s.ph * 3, theta = ph - kWave * xp;
          var glide = 0.42 + 0.58 * memberGlide;
          var memberAmp = amplitude * glide * (0.9 + s.tint * 0.2);
          var slope = -memberAmp * kWave * Math.cos(theta);
          var tailFlex = 0.18 * memberAmp / Math.max(L * 0.045, 0.0001) * Math.sin(theta - 0.72);
          e.set(0, (-Math.atan(slope) * 1.08 + tailFlex) * (def.tailBeat === undefined ? 1 : def.tailBeat), 0); tq.setFromEuler(e); tp.set(xp, 0, memberAmp * Math.sin(theta));
          lm.compose(tp, tq, one); tm.multiplyMatrices(m4, lm); tail.setMatrixAt(i, tm);
        }
        for (var pi = 0; pi < pectorals.length; pi++) {
          var pc = pectorals[pi], beat = (phase * s.w + s.ph * 3) * (def.pecRate || 1.3) - 0.82 + pi * 0.14;
          var pa = def.pecBeat === undefined ? 0.35 : def.pecBeat, fan = pa * (0.38 + 0.62 * (1 - Math.min(1, drive) * 0.58)) * (0.82 + 0.18 * (1 - memberGlide)) * flow;
          var steering = turn * pc.side * 0.1 * flow;
          featherPectoral(e, pc.side, def.pectoral.spread || 0.35, def.pectoral.droop || 0.1, fan, beat, steering, 0);
          tq.setFromEuler(e); tp.set(pc.pos[0] * unit, pc.pos[1] * unit, pc.pos[2] * unit);
          lm.compose(tp, tq, one); tm.multiplyMatrices(m4, lm); pc.mesh.setMatrixAt(i, tm);
        }
      }
      for (var k = 0; k < meshes.length; k++) meshes[k].instanceMatrix.needsUpdate = true;
    }
    place(0, !rm);
    function update(dt, t, motion) { if (disposed || rm) return; place(num(t, 0), true, motion); }
    function dispose() {
      if (disposed) return; disposed = true; if (root.parent) root.parent.remove(root);
      meshes.forEach(function (m) { if (typeof m.dispose === 'function') m.dispose(); }); kit.dispose();
    }
    var members = slots.map(function (s) { return { x: s.x, y: s.y, z: s.z }; });
    return { root: root, update: update, dispose: dispose, radius: reach, count: n, meshes: meshes, animated: true,
      graze: { period: GRAZE.period, stagger: GRAZE.stagger, contact: GRAZE.contact, squeeze: GRAZE.squeeze, mouth: 0.48 * unit, members: members } };
  }

  // ---- Fish species (rows: [x, top, bottom, half width] in body lengths) -----
  var K = { black: hex(0x0d0d10), white: hex(0xf5f5f1), cream: hex(0xf2ecd8) };
  function pointed(u) { return 0.55 + 0.45 * Math.pow(u, 1.3); }
  function counter(P, out, dark, pale) { if (P.up > 0) mixc(out, dark, smooth(0.15, 1, P.up) * 0.6, out); else mixc(out, pale, smooth(0.1, 0.9, -P.up) * 0.7, out); }
  // A ribbon along points (unit space) with a width direction; col(t, s, out) writes sRGB.
  function ribbon(geo, pts, width, dir, col) {
    var first = geo.count(), c = [0, 0, 0], n = pts.length;
    for (var i = 0; i < n; i++) {
      var t = n > 1 ? i / (n - 1) : 0, w = typeof width === 'function' ? width(t) : width, p = pts[i];
      col(t, 0, c); geo.v(p[0], p[1], p[2], lin(c), t, 0);
      col(t, 1, c); geo.v(p[0] + dir[0] * w, p[1] + dir[1] * w, p[2] + dir[2] * w, lin(c), t, 1);
    }
    for (i = 0; i < n - 1; i++) { var a = first + i * 2; geo.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  function lineTo(a, b, n, sag) {
    var pts = [];
    for (var i = 0; i <= n; i++) { var t = i / n; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + (sag || 0) * Math.sin(PI * t), lerp(a[2], b[2], t)]); }
    return pts;
  }

  var CLOWN = { o: hex(0xf2650e), od: hex(0xc9420a), w: hex(0xf7f6f0), k: hex(0x111111) };
  var TANG = { b: hex(0x1d4fd8), d: hex(0x15339c), l: hex(0x3f78ea), k: hex(0x0a0d1c), y: hex(0xffd21c),
    up: [[0.4, 0.05], [0.3, 0.115], [0.17, 0.152], [0.02, 0.15], [-0.12, 0.102], [-0.2, 0.05], [-0.27, 0.012]],
    low: [[-0.22, 0.025], [-0.13, -0.052], [0.0, -0.06], [0.14, -0.025], [0.2, 0.0]] };
  var PARROT = { t: hex(0x24b39f), g: hex(0x168a74), b: hex(0x8fe0c8), p: hex(0xf0849a), o: hex(0xf09a62), beak: hex(0xd9efe6), cheek: hex(0xe8efcf), frame: hex(0x1e8a5c),
    fb: hex(0x4e3c30), fd: hex(0x352820), fl: hex(0x8a7a6a), fp: hex(0xcfc4b0), fr: hex(0x8a4a3e) };
  var BUMP = { g: hex(0x6d8b7c), d: hex(0x4b6458), l: hex(0x98ad9e), head: hex(0xc9d2c2), pink: hex(0xd8aeb0), line: hex(0x3e5248) };
  var IDOL = { w: hex(0xf6f3e6), y: hex(0xffd23a), k: hex(0x101012), o: hex(0xf0862a) };
  var AURIGA = { w: hex(0xf7f6f0), y: hex(0xffc81e), line: hex(0x3d342d), k: hex(0x0e0e10) };
  var EMP = { b: hex(0x1f40c8), d: hex(0x142c92), y: hex(0xffd41e), k: hex(0x0a0c18), e: hex(0x7fb2ff), face: hex(0x5b78d6), t: hex(0xffbe1a) };
  var ANTH = { base: hex(0xf8904a), v: hex(0xb05ad6), y: hex(0xffd36a) };
  var CHROMIS = { b: hex(0x8ae6dc), d: hex(0x58bfc2), l: hex(0xc8f6ee) };
  var LION = { m: hex(0x7b1c1c), r: hex(0xa9352a), w: hex(0xf4e7dc), pale: hex(0xf6ece4) };
  var ARGUS = { b: hex(0x3a281d), d: hex(0x24180f), s: hex(0x45b0ff), bar: hex(0x8c735a), chest: hex(0xa48c74) };
  var NAPO = { g: hex(0x2d8f86), l: hex(0x4cb0a2), d: hex(0x1b5a51), head: hex(0x4f8fb0), wave: hex(0xc2c46a), lip: hex(0xa8c48a) };
  var CLEANER = { k: hex(0x0b0b14), b: hex(0x2c68f0), pale: hex(0xdde8f2), w: hex(0xf3f6f8) };

  var FIRE = { w: hex(0xf7eee7), pink: hex(0xf5b5b7), yellow: hex(0xf5ce6b), orange: hex(0xef6632), red: hex(0xbc302e), dark: hex(0x39202d), violet: hex(0x9b4c92) };
  var COPPER = { w: hex(0xf3f2df), silver: hex(0xd5e3df), orange: hex(0xf2a136), deep: hex(0xb96a24), ink: hex(0x303333), blue: hex(0x8bb7c9) };

  var FISH = {
    firefish: {
      lengthM: 0.09, tex: [160, 64], scaleSize: 0.014, eye: [0.365, 0.022, 0.038], iris: hex(0xbb8849), sheen: [0xf5cbd1, 0xffe9c5, 0.12],
      beat: 0.72, wiggle: 0.48, pecBeat: 0.48, pecRate: 1.05,
      rows: [[0.5, 0.006, -0.018, 0.007], [0.47, 0.039, -0.038, 0.022], [0.41, 0.067, -0.054, 0.035], [0.33, 0.083, -0.066, 0.043], [0.23, 0.088, -0.073, 0.047], [0.1, 0.082, -0.073, 0.046], [-0.04, 0.071, -0.062, 0.039], [-0.16, 0.052, -0.045, 0.029], [-0.26, 0.033, -0.027, 0.019], [-0.31, 0.022, -0.019, 0.014]],
      tail: { type: 'round', span: 0.1, len: 0.19 },
      dorsal: [{ from: 0.26, to: 0.025, n: 22, h: 0.43, shape: function (u) { return 2 * Math.pow(Math.sin(PI * u), 0.22) * Math.exp(-8 * u); }, rake: 0.035 }, { from: 0.0, to: -0.285, h: 0.082, shape: 'plateau', rake: 0.2 }],
      anal: [{ from: 0.005, to: -0.285, h: 0.065, shape: 'plateau', rake: 0.28 }],
      pelvic: { x: 0.18, len: 0.07 }, pectoral: { x: 0.245, y: -0.025, len: 0.13, width: 0.054, spread: 0.48, droop: 0.05, shape: pointed },
      paint: function (P, out) {
        var rear = smooth(0.045, -0.225, P.x);
        mixc(FIRE.w, FIRE.orange, rear, out); mixc(out, FIRE.red, rear * smooth(-0.08, -0.3, P.x) * 0.72, out);
        mixc(out, FIRE.pink, (1 - rear) * smooth(0.15, 0.95, P.up) * 0.22, out);
        mixc(out, FIRE.yellow, smooth(0.3, 0.47, P.x) * smooth(0.15, 0.9, P.up) * 0.28, out);
        mixc(out, FIRE.violet, band(P.y - P.top + 0.01, 0.006, P.aay) * smooth(0.25, 0.43, P.x) * 0.6, out);
      },
      fin: function (kind, u, v, out) {
        if (kind === 'dorsal0') { setc(out, FIRE.w); mixc(out, FIRE.orange, (1 - smooth(0.18, 0.32, u)) * (1 - smooth(0.28, 0.55, v)), out); return; }
        if (kind === 'pelvic' || kind === 'pectoral') { mixc(FIRE.w, FIRE.pink, 0.18 * v, out); return; }
        mixc(FIRE.orange, FIRE.red, 0.35 + 0.45 * u, out);
        mixc(out, FIRE.dark, smooth(0.7, 0.96, v) * (kind === 'tail' ? 0.88 : 0.72), out);
        if (kind === 'tail') mixc(out, FIRE.dark, band(Math.abs(u - 0.5) - (0.36 - 0.13 * v), 0.025, 0.025) * smooth(0.2, 0.6, v) * 0.75, out);
      }
    },
    copperband_butterflyfish: {
      lengthM: 0.2, tex: [160, 96], scaleSize: 0.018, eye: [0.28, 0.065, 0.026], iris: hex(0xc28a3d), sheen: [0xd7e6e6, 0xffedc6, 0.14],
      beat: 0.78, wiggle: 0.5, pecBeat: 0.52, pecRate: 1.0,
      rows: [[0.5, -0.002, -0.026, 0.006], [0.46, 0.006, -0.031, 0.009], [0.4, 0.025, -0.049, 0.014], [0.345, 0.069, -0.082, 0.023], [0.29, 0.126, -0.132, 0.029], [0.2, 0.21, -0.202, 0.037], [0.085, 0.258, -0.233, 0.043], [-0.045, 0.25, -0.224, 0.043], [-0.15, 0.198, -0.181, 0.036], [-0.225, 0.12, -0.104, 0.026], [-0.28, 0.052, -0.042, 0.018], [-0.3, 0.043, -0.036, 0.016]],
      tail: { type: 'truncate', span: 0.115, len: 0.18 },
      dorsal: [{ from: 0.21, to: -0.277, h: 0.165, shape: 'rear', rake: 0.14 }], anal: [{ from: 0.12, to: -0.267, h: 0.135, shape: 'rear', rake: 0.16 }],
      pelvic: { x: 0.15, len: 0.1 }, pectoral: { x: 0.21, y: -0.033, len: 0.125, width: 0.061, spread: 0.42, droop: 0.07, shape: pointed },
      paint: function (P, out) {
        mixc(COPPER.w, COPPER.silver, smooth(0.25, 0.95, P.up) * 0.12, out);
        var bands = [[0.278 - 0.035 * P.y, 0.026], [0.117 - 0.05 * P.y, 0.032], [-0.075 - 0.11 * P.y, 0.038], [-0.227 - 0.03 * P.y, 0.034]];
        for (var i = 0; i < bands.length; i++) {
          var d = P.x - bands[i][0], w = bands[i][1];
          mixc(out, i === 3 ? COPPER.blue : COPPER.ink, band(d, w + 0.006, P.aa) * (i === 3 ? 0.8 : 0.72), out);
          mixc(out, COPPER.orange, band(d, w, P.aa), out);
          mixc(out, COPPER.deep, band(d - w * 0.55, w * 0.18, P.aa) * 0.26, out);
        }
      },
      fin: function (kind, u, v, out) {
        setc(out, COPPER.w);
        if (kind === 'pectoral') { mixc(out, COPPER.silver, v * 0.25, out); return; }
        if (kind === 'tail') { mixc(out, COPPER.orange, band(v - 0.3, 0.07, 0.03) * 0.88, out); mixc(out, COPPER.blue, band(v - 0.42, 0.018, 0.025) * 0.8, out); return; }
        if (kind === 'pelvic') { mixc(out, COPPER.orange, 0.72 * (1 - v), out); return; }
        var from = kind === 'dorsal0' ? 0.21 : 0.12, to = kind === 'dorsal0' ? -0.277 : -0.267, x = lerp(from, to, u);
        for (var i = 0; i < 3; i++) {
          var center = [0.108, -0.108, -0.23][i], width = [0.035, 0.047, 0.038][i];
          mixc(out, COPPER.ink, band(x - center, width + 0.005, 0.012) * 0.62, out);
          mixc(out, COPPER.orange, band(x - center, width, 0.012), out);
        }
        mixc(out, COPPER.orange, smooth(0.85, 0.98, v) * 0.6, out); mixc(out, COPPER.blue, band(v - 0.96, 0.016, 0.016) * 0.6, out);
      },
      extra: function (c) {
        // The soft dorsal's false eye is a pale ring around a dark centre.
        // Flattened geometry keeps the field mark legible on both flanks.
        blob(c.T, c.detail, -0.166, 0.267, 0, 0.031, 0.031, 0.006, lin(COPPER.w), c.high ? 16 : 8, c.high ? 8 : 4);
        blob(c.T, c.detail, -0.166, 0.267, 0, 0.023, 0.023, 0.008, lin(COPPER.ink), c.high ? 16 : 8, c.high ? 8 : 4);
      }
    },

    clownfish: {
      lengthM: 0.09, tex: [128, 64], eye: [0.37, 0.045, 0.042], iris: hex(0xe48a2a),
      rows: [[0.5, -0.005, -0.035, 0.012], [0.47, 0.045, -0.075, 0.04], [0.42, 0.1, -0.11, 0.065], [0.34, 0.15, -0.145, 0.085], [0.24, 0.178, -0.162, 0.095], [0.12, 0.184, -0.165, 0.096], [0.0, 0.172, -0.155, 0.09], [-0.1, 0.14, -0.125, 0.074], [-0.18, 0.1, -0.085, 0.054], [-0.24, 0.07, -0.058, 0.04], [-0.28, 0.058, -0.048, 0.032]],
      tail: { type: 'round', span: 0.13, len: 0.2 },
      dorsal: [{ from: 0.24, to: -0.22, h: 0.11, shape: 'spiny', rake: 0.2 }], anal: [{ from: -0.02, to: -0.22, h: 0.1, shape: 'arch', rake: 0.3 }],
      pelvic: { x: 0.2, len: 0.09 }, pectoral: { x: 0.27, y: -0.03, len: 0.12, width: 0.06, spread: 0.45 }, beat: 1.3, pecBeat: 0.5,
      paint: function (P, out) {
        setc(out, CLOWN.o); mixc(out, CLOWN.od, 0.4 * smooth(0.2, 1, P.up), out);
        var x = P.x, yn = P.yn, aa = P.aa, bars = [[0.29 - 0.05 * (1 - yn * yn), 0.034], [-0.01 + 0.06 * (1 - Math.abs(yn)), 0.04], [-0.215, 0.027]];
        // Ocellaris bands carry at most a hairline of black (percula's is thick).
        for (var i = 0; i < 3; i++) { var d = x - bars[i][0]; mixc(out, CLOWN.k, 0.75 * band(d, bars[i][1] + 0.0055, aa), out); mixc(out, CLOWN.w, band(d, bars[i][1], aa), out); }
      },
      fin: function (kind, u, v, out) {
        setc(out, CLOWN.o);
        if (kind === 'dorsal0') { var x = lerp(0.24, -0.22, u); mixc(out, CLOWN.w, band(x - 0.0, 0.035, 0.012) * (1 - smooth(0.6, 0.8, v)), out); }
        mixc(out, CLOWN.k, smooth(0.78, 0.9, v), out);
      }
    },
    blue_tang: {
      lengthM: 0.25, tex: [128, 64], eye: [0.36, 0.06, 0.038], iris: hex(0x1a2440), sheen: [0x2a6cff, 0x7fd0ff, 0.25],
      rows: [[0.5, 0.0, -0.03, 0.008], [0.47, 0.065, -0.085, 0.025], [0.42, 0.13, -0.13, 0.038], [0.34, 0.19, -0.17, 0.048], [0.22, 0.22, -0.19, 0.053], [0.1, 0.225, -0.19, 0.054], [-0.02, 0.21, -0.18, 0.05], [-0.13, 0.16, -0.14, 0.04], [-0.21, 0.095, -0.085, 0.03], [-0.26, 0.06, -0.05, 0.022], [-0.29, 0.05, -0.04, 0.02]],
      tail: { type: 'truncate', span: 0.17, len: 0.2 },
      dorsal: [{ from: 0.3, to: -0.24, h: 0.07, shape: 'plateau', rake: 0.35 }], anal: [{ from: 0.1, to: -0.24, h: 0.065, shape: 'plateau', rake: 0.35 }],
      pelvic: { x: 0.24, len: 0.07 }, pectoral: { x: 0.26, y: -0.01, len: 0.14, width: 0.07, spread: 0.3, shape: pointed }, pecBeat: 0.45,
      paint: function (P, out) {
        setc(out, TANG.b); mixc(out, TANG.d, 0.5 * smooth(0.3, 1, P.up), out); mixc(out, TANG.l, 0.35 * smooth(0.2, 1, -P.up), out);
        var x = P.x, y = P.y, aa = Math.max(P.aa, P.aay), d = Math.min(polyDist(x, y, TANG.up) - 0.042, polyDist(x, y, TANG.low) - 0.034);
        mixc(out, TANG.k, 1 - smooth(-aa, aa, d), out);
        var dy = Math.abs(y - P.yc), tri = -(x + 0.215) * 0.95 - dy;
        mixc(out, TANG.y, smooth(-aa, aa, tri), out);
      },
      fin: function (kind, u, v, out) {
        if (kind === 'tail') { setc(out, TANG.y); mixc(out, TANG.k, Math.max(1 - smooth(0.13, 0.2, u), smooth(0.8, 0.87, u)), out); return; }
        if (kind === 'pectoral') { setc(out, TANG.b); mixc(out, TANG.y, smooth(0.5, 0.75, v), out); return; }
        setc(out, TANG.b); mixc(out, TANG.k, smooth(0.62, 0.8, v), out);
      }
    },
    parrotfish: {
      scaleSize: 0.044,
      lengthM: 0.45, tex: [128, 64], eye: [0.38, 0.05, 0.026], iris: hex(0xe0c050), sheen: [0x30d0b0, 0x9a8cff, 0.18], beat: 0.8, pecBeat: 0.55, pecRate: 1.0, wiggle: 0.7,
      rows: [[0.5, 0.01, -0.038, 0.014], [0.48, 0.06, -0.072, 0.042], [0.44, 0.1, -0.1, 0.07], [0.37, 0.134, -0.126, 0.09], [0.28, 0.158, -0.142, 0.104], [0.16, 0.168, -0.148, 0.11], [0.02, 0.166, -0.146, 0.108], [-0.1, 0.146, -0.134, 0.098], [-0.2, 0.119, -0.111, 0.08], [-0.27, 0.087, -0.083, 0.058], [-0.31, 0.06, -0.06, 0.042], [-0.34, 0.046, -0.046, 0.032]],
      tail: { type: 'lunate', span: 0.15, len: 0.17 },
      dorsal: [{ from: 0.3, to: -0.3, h: 0.055, shape: 'plateau', rake: 0.3 }], anal: [{ from: 0.02, to: -0.28, h: 0.045, shape: 'plateau', rake: 0.3 }],
      pelvic: { x: 0.22, len: 0.07 }, pectoral: { x: 0.27, y: -0.02, len: 0.11, width: 0.06, spread: 0.3, shape: pointed },
      paint: function (P, out) {
        setc(out, PARROT.t); mixc(out, PARROT.g, 0.55 * smooth(0.2, 1, P.up), out); mixc(out, PARROT.b, 0.6 * smooth(0.2, 1, -P.up), out);
        var x = P.x, y = P.y, gy = y / 0.04, row = Math.floor(gy), gx = x / 0.048 + (row & 1) * 0.5, fx = fract(gx) - 0.5, fy = fract(gy) - 0.5;
        // Pink gathers along the exposed posterior margin of overlapping
        // scales. A full bright ring made the flank look covered in bubbles.
        var cell = hash2(Math.floor(gx), row), r = Math.sqrt(fx * fx + fy * fy * 1.3);
        var scaleAA = Math.max(P.aa / 0.048, P.aay / 0.04);
        var edge = band(r - 0.452 - 0.055 * fx, 0.06, Math.max(0.025, Math.min(0.055, scaleAA * 0.22)));
        var posterior = smooth(0.34, -0.18, fx), flank = smooth(0.36, 0.26, x) * (1 - smooth(0.82, 1, Math.abs(P.yn)));
        mulc(out, 1 + (cell - 0.5) * 0.055 * flank);
        mixc(out, PARROT.p, edge * posterior * flank * (0.8 + 0.12 * cell), out);
        var head = smooth(0.26, 0.32, x), aa = P.aay;
        var s1 = band(y - (0.055 + 0.3 * (x - 0.36)), 0.009 + aa, aa);
        mixc(out, PARROT.o, s1 * head, out);
        // Terminal males: a large whitish rectangle on the cheek below the eye,
        // framed by a thick green line (FishBase).
        var cx = Math.abs(x - 0.365) - 0.062, cy = Math.abs(y + 0.038) - 0.05, cheek = Math.max(cx, cy) + 0.012 * smooth(-0.012, 0.012, Math.min(cx, cy) + 0.012), caa = Math.max(P.aa, aa) * 1.5;
        mixc(out, PARROT.frame, 1 - smooth(0.013 - caa, 0.013 + caa, cheek), out);
        mixc(out, PARROT.cheek, (1 - smooth(-caa, caa, cheek)) * (0.9 + 0.1 * smooth(0.0, -0.04, cheek)), out);
      },
      fin: function (kind, u, v, out) {
        // Tail pink with a green central zone and green outer margins.
        if (kind === 'tail') { setc(out, PARROT.p); mixc(out, PARROT.g, Math.max(smooth(0.82, 0.92, v), 1 - smooth(0.06, 0.14, u), smooth(0.86, 0.94, u), (1 - smooth(0.42, 0.62, v)) * smooth(0.22, 0.34, u) * smooth(0.78, 0.66, u)), out); return; }
        setc(out, PARROT.p); mixc(out, PARROT.t, smooth(0.45, 0.6, v) * (1 - smooth(0.8, 0.95, v)) * (kind === 'pectoral' ? 0.4 : 1), out);
      },
      // About a third are drab initial-phase fish (mostly females).
      variant: function (seed) { return stream(seed, 132)() < 0.34 ? 'female' : null; },
      variants: {
        female: {
          sheen: null,
          paint: function (P, out) {
            // Dark brown with 3-4 broad pale bars and a pale tail base.
            var x = P.x, aa = P.aa;
            setc(out, PARROT.fb); mixc(out, PARROT.fd, 0.5 * smooth(0.2, 1, P.up), out); mixc(out, PARROT.fl, 0.35 * smooth(0.3, 1, -P.up), out);
            var gy = P.y / 0.04, row = Math.floor(gy), gx = x / 0.048 + (row & 1) * 0.5, fx = fract(gx) - 0.5, fy = fract(gy) - 0.5;
            mulc(out, 1 - 0.12 * band(Math.sqrt(fx * fx + fy * fy * 1.3) - 0.452 - 0.055 * fx, 0.04, 0.05) * smooth(0.36, 0.26, x));
            var bars = [0.13, -0.02, -0.16], pale = 0;
            for (var i = 0; i < 3; i++) pale = Math.max(pale, band(x - bars[i] - 0.02 * P.yn, 0.034, aa + 0.006));
            pale = Math.max(pale, smooth(-0.255, -0.28, x));
            mixc(out, PARROT.fp, pale * (1 - 0.35 * smooth(0.4, 1, P.up)), out);
          },
          fin: function (kind, u, v, out) {
            setc(out, PARROT.fd); mixc(out, PARROT.fr, kind === 'tail' ? 0.35 : 0.5 * smooth(0.3, 1, v), out);
          }
        }
      },
      extra: function (c) {
        var b = hex(0xd9efe6);
        blob(c.T, c.detail, 0.492, -0.003, 0, 0.022, 0.018, 0.026, lin(b), 10, 6);
        blob(c.T, c.detail, 0.486, -0.03, 0, 0.02, 0.015, 0.024, lin(b), 10, 6);
      }
    },
    bumphead_parrotfish: {
      scaleSize: 0.046,
      lengthM: 0.9, tex: [128, 64], eye: [0.37, 0.07, 0.022], iris: hex(0xc8b860), beat: 0.7, pecBeat: 0.5, pecRate: 1.0, wiggle: 0.6, spacing: 1.4,
      rows: [[0.5, 0.03, -0.07, 0.03], [0.487, 0.13, -0.095, 0.055], [0.46, 0.215, -0.12, 0.078], [0.42, 0.27, -0.14, 0.097], [0.36, 0.285, -0.16, 0.112], [0.26, 0.27, -0.175, 0.122], [0.14, 0.255, -0.18, 0.126], [0.02, 0.235, -0.175, 0.12], [-0.1, 0.19, -0.15, 0.1], [-0.19, 0.13, -0.105, 0.075], [-0.26, 0.085, -0.068, 0.05], [-0.3, 0.066, -0.055, 0.042]],
      tail: { type: 'lunate', span: 0.16, len: 0.17 },
      dorsal: [{ from: 0.26, to: -0.26, h: 0.05, shape: 'plateau', rake: 0.3 }], anal: [{ from: 0.0, to: -0.25, h: 0.045, shape: 'plateau', rake: 0.3 }],
      pelvic: { x: 0.2, len: 0.07 }, pectoral: { x: 0.27, y: -0.01, len: 0.11, width: 0.06, spread: 0.28, shape: pointed },
      paint: function (P, out) {
        setc(out, BUMP.g); mixc(out, BUMP.d, 0.55 * smooth(0.2, 1, P.up), out); mixc(out, BUMP.l, 0.45 * smooth(0.2, 1, -P.up), out);
        var x = P.x, y = P.y, gy = y / 0.045, row = Math.floor(gy), gx = x / 0.05 + (row & 1) * 0.5, fx = fract(gx) - 0.5, fy = fract(gy) - 0.5;
        mulc(out, 1 - 0.1 * smooth(0.42, 0.5, Math.sqrt(fx * fx + fy * fy * 1.3)) * smooth(0.36, 0.26, x));
        var bump = smooth(0.36, 0.44, x) * smooth(0.0, 0.1, y);
        mixc(out, BUMP.head, bump * 0.8, out); mixc(out, BUMP.pink, bump * smooth(0.18, 0.26, y) * 0.35, out);
      },
      fin: function (kind, u, v, out) { setc(out, BUMP.d); mixc(out, BUMP.g, 0.4 * smooth(0.6, 1, v), out); },
      extra: function (c) {
        // School members keep only the exposed teeth, coarsely.
        var tooth = lin(hex(0xeef0e6)), lip = lin(hex(0x8ea596)), ws = c.school ? 4 : 10, hs = c.school ? 3 : 6;
        if (!c.school) blob(c.T, c.detail, 0.497, 0.0, 0, 0.02, 0.026, 0.05, lip, 10, 6);
        blob(c.T, c.detail, 0.505, -0.012, 0, 0.012, 0.016, 0.042, tooth, ws, hs);
        blob(c.T, c.detail, 0.5, -0.048, 0, 0.012, 0.014, 0.04, tooth, ws, hs);
      }
    },
    moorish_idol: {
      lengthM: 0.18, tex: [128, 96], eye: [0.3, 0.06, 0.03], iris: hex(0xe8d27a), beat: 1.0, pecBeat: 0.5,
      rows: [[0.5, 0.035, 0.012, 0.006], [0.46, 0.045, 0.0, 0.01], [0.41, 0.066, -0.025, 0.016], [0.36, 0.12, -0.075, 0.026], [0.29, 0.22, -0.15, 0.04], [0.2, 0.3, -0.21, 0.048], [0.08, 0.32, -0.235, 0.05], [-0.04, 0.285, -0.21, 0.046], [-0.13, 0.19, -0.135, 0.036], [-0.2, 0.095, -0.06, 0.024], [-0.24, 0.055, -0.035, 0.017], [-0.27, 0.048, -0.03, 0.015]],
      tail: { type: 'lunate', span: 0.12, len: 0.17 },
      dorsal: [{ from: 0.2, to: -0.2, h: 0.32, rake: 0.85, shape: function (u) { return u < 0.18 ? Math.pow(u / 0.18, 0.7) : Math.pow(1 - (u - 0.18) / 0.82, 1.6) * 0.9 + 0.1 * (1 - u); } }],
      anal: [{ from: 0.04, to: -0.19, h: 0.2, rake: 0.75, shape: function (u) { return u < 0.2 ? Math.pow(u / 0.2, 0.7) : Math.pow(1 - (u - 0.2) / 0.8, 1.4); } }],
      pelvic: { x: 0.2, len: 0.08 }, pectoral: { x: 0.22, y: -0.04, len: 0.1, width: 0.05, spread: 0.35 },
      paint: function (P, out) {
        var x = P.x, aa = P.aa;
        setc(out, IDOL.w);
        mixc(out, IDOL.y, Math.max(1 - smooth(-0.16, -0.12, x), smooth(0.3, 0.6, P.yn) * smooth(-0.01, 0.02, x) * (1 - smooth(0.18, 0.22, x))) * 0.95, out);
        mixc(out, IDOL.k, band(x - (0.275 + 0.02 * P.yn), 0.062, aa), out);
        mixc(out, IDOL.k, band(x - (-0.07 - 0.015 * P.yn), 0.064, aa), out);
        mixc(out, IDOL.o, smooth(0.36, 0.38, x) * (1 - smooth(0.43, 0.45, x)) * smooth(0.2, 0.5, P.up), out);
      },
      fin: function (kind, u, v, out) {
        setc(out, IDOL.w);
        if (kind === 'dorsal0') { var x = lerp(0.2, -0.2, u); mixc(out, IDOL.k, band(x + 0.07, 0.07, 0.015) * (1 - smooth(0.55, 0.75, v)), out); mixc(out, IDOL.y, 0.5 * smooth(0.0, -0.2, x), out); }
        else if (kind === 'anal0') { var x2 = lerp(0.04, -0.19, u); mixc(out, IDOL.k, Math.max(band(x2 + 0.07, 0.075, 0.015), 0.6 * smooth(0.5, 0.0, u)) * (1 - smooth(0.85, 1, v)), out); mixc(out, IDOL.y, smooth(0.8, 1, v) * 0.7, out); }
        else if (kind === 'tail') { setc(out, IDOL.k); mixc(out, IDOL.w, smooth(0.8, 0.95, v), out); }
        else if (kind === 'pelvic') setc(out, IDOL.k);
        else mixc(IDOL.w, IDOL.y, 0.5, out);
      },
      extra: function (c) {
        // The long trailing white dorsal filament springs from the fin's peak.
        var px = 0.2 - 0.4 * 0.18 - 0.85 * 0.32, py = c.prof(0.2 - 0.4 * 0.18)[0] + 0.32, pts = [];
        for (var i = 0; i <= (c.high ? 14 : 8); i++) { var t = i / (c.high ? 14 : 8); pts.push([px - t * 0.62, py + 0.04 * Math.sin(PI * t) - t * 0.22, 0]); }
        ribbon(c.fins, pts, function (t) { return 0.03 * (1 - t) + 0.006; }, [0.35, -0.94, 0], function (t, s, o) { setc(o, IDOL.w); });
      }
    },
    threadfin_butterflyfish: {
      lengthM: 0.2, tex: [128, 96], eye: [0.37, 0.045, 0.03], iris: hex(0x2a2018), pecBeat: 0.5, beat: 1.1,
      rows: [[0.5, 0.02, 0.0, 0.006], [0.46, 0.045, -0.025, 0.013], [0.4, 0.11, -0.08, 0.024], [0.32, 0.2, -0.15, 0.034], [0.2, 0.27, -0.205, 0.04], [0.06, 0.285, -0.215, 0.042], [-0.07, 0.245, -0.185, 0.038], [-0.17, 0.155, -0.115, 0.03], [-0.23, 0.085, -0.06, 0.021], [-0.27, 0.055, -0.042, 0.016], [-0.29, 0.048, -0.038, 0.015]],
      tail: { type: 'truncate', span: 0.12, len: 0.17 },
      dorsal: [{ from: 0.22, to: -0.24, h: 0.1, shape: 'rear', rake: 0.45 }], anal: [{ from: 0.02, to: -0.22, h: 0.09, shape: 'rear', rake: 0.4 }],
      pelvic: { x: 0.2, len: 0.08 }, pectoral: { x: 0.26, y: -0.04, len: 0.1, width: 0.05, spread: 0.35 },
      paint: function (P, out) {
        var x = P.x, y = P.y, aa = Math.max(P.aa, P.aay);
        setc(out, AURIGA.w);
        mixc(out, AURIGA.y, Math.max(smooth(-0.04, -0.17, x), smooth(0.1, 0.2, y) * smooth(0.06, -0.06, x)) * 0.95, out);
        // Chevrons: lines rise backwards on the fore-body and fall backwards behind, meeting at right angles.
        var sp2 = 0.048, front = x - (0.12 + (y - 0.28) * 0.5) > 0, s = front ? (x + y) / sp2 : (x - y) / sp2, f = fract(s) - 0.5;
        mixc(out, AURIGA.line, band(f, 0.06 + aa / sp2, aa / sp2) * 0.75 * smooth(0.33, 0.29, x) * smooth(-0.2, -0.12, x), out);
        mixc(out, AURIGA.k, band(x - 0.372, 0.026, P.aa) * smooth(-0.19, -0.15, y), out);
      },
      fin: function (kind, u, v, out) {
        setc(out, AURIGA.y);
        if (kind === 'dorsal0') {
          mixc(out, AURIGA.w, 1 - smooth(0.3, 0.5, u), out);
          var d = Math.sqrt(Math.pow((u - 0.84) / 0.07, 2) + Math.pow((v - 0.55) / 0.3, 2));
          mixc(out, AURIGA.w, 1 - smooth(1.15, 1.4, d), out); mixc(out, AURIGA.k, 1 - smooth(0.85, 1.05, d), out);
        } else if (kind === 'tail') { mixc(out, AURIGA.k, band(v - 0.78, 0.06, 0.03), out); mixc(out, AURIGA.w, smooth(0.88, 1, v), out); }
        else if (kind === 'anal0') mixc(out, AURIGA.k, band(v - 0.8, 0.05, 0.03) * 0.8, out);
        else if (kind === 'pectoral') mixc(out, AURIGA.w, 0.6, out);
      },
      extra: function (c) {
        // Thread trailing from the rear of the soft dorsal fin.
        var px = -0.13, py = c.prof(-0.13)[0] + 0.09;
        ribbon(c.fins, lineTo([px, py, 0], [px - 0.16, py - 0.05, 0], c.high ? 8 : 4, 0.02), function (t) { return 0.012 * (1 - t) + 0.003; }, [0.3, -0.95, 0], function (t, s, o) { setc(o, AURIGA.y); });
        // The small black spot on the soft dorsal fin (fins are vertex-coloured, so it is geometry).
        var sx = -0.15, sy = c.prof(-0.15)[0] + 0.035;
        blob(c.T, c.detail, sx, sy, 0, 0.026, 0.026, 0.006, lin(K.white), 10, 6);
        blob(c.T, c.detail, sx, sy, 0, 0.019, 0.019, 0.009, lin(AURIGA.k), 10, 6);
      }
    },
    emperor_angelfish: {
      lengthM: 0.35, tex: [128, 128], eye: [0.37, 0.05, 0.032], iris: hex(0x2a3060), sheen: [0x3060ff, 0x80c0ff, 0.2], beat: 0.9, pecBeat: 0.5,
      rows: [[0.5, 0.01, -0.035, 0.012], [0.47, 0.07, -0.08, 0.03], [0.42, 0.14, -0.135, 0.048], [0.34, 0.21, -0.185, 0.058], [0.22, 0.25, -0.215, 0.064], [0.08, 0.262, -0.222, 0.065], [-0.06, 0.235, -0.2, 0.06], [-0.16, 0.165, -0.14, 0.046], [-0.23, 0.095, -0.075, 0.031], [-0.27, 0.065, -0.052, 0.023], [-0.29, 0.058, -0.046, 0.021]],
      tail: { type: 'round', span: 0.14, len: 0.2 },
      dorsal: [{ from: 0.26, to: -0.25, h: 0.085, shape: 'rear', rake: 0.4 }], anal: [{ from: 0.06, to: -0.23, h: 0.08, shape: 'rear', rake: 0.4 }],
      pelvic: { x: 0.22, len: 0.09 }, pectoral: { x: 0.25, y: -0.03, len: 0.12, width: 0.06, spread: 0.32 },
      paint: function (P, out) {
        var x = P.x, y = P.y, aa = Math.max(P.aa, P.aay);
        setc(out, EMP.b); mixc(out, EMP.d, 0.45 * smooth(0.3, 1, P.up), out);
        var s = (y + 0.32 * x) / 0.024, f = fract(s) - 0.5;
        mixc(out, EMP.y, band(f, 0.17 + aa / 0.024, aa / 0.024) * smooth(0.25, 0.22, x) * smooth(-0.3, -0.26, x), out);
        mixc(out, EMP.face, smooth(0.3, 0.36, x) * 0.5, out);
        var mask = polyDist(x, y, [[0.43, 0.15], [0.37, 0.04], [0.33, -0.1]]);
        mixc(out, EMP.e, 1 - smooth(0.034 - aa, 0.034 + aa, mask), out); mixc(out, EMP.k, 1 - smooth(0.026 - aa, 0.026 + aa, mask), out);
        // A large black patch behind the head and gills, down over the pectoral base.
        var nape = Math.abs(x - (0.262 - 0.02 * P.yn));
        mixc(out, EMP.e, (1 - smooth(0.046 - aa, 0.046 + aa, nape)) * smooth(-0.16, -0.06, y), out); mixc(out, EMP.k, (1 - smooth(0.038 - aa, 0.038 + aa, nape)) * smooth(-0.16, -0.06, y), out);
        mixc(out, EMP.w || K.white, smooth(0.455, 0.48, x) * 0.7, out);
      },
      fin: function (kind, u, v, out) {
        if (kind === 'tail') { setc(out, EMP.t); return; }
        if (kind === 'dorsal0') { setc(out, EMP.b); mixc(out, EMP.y, band(fract(v * 4 + u * 2) - 0.5, 0.18, 0.08) * 0.8, out); mixc(out, K.white, smooth(0.85, 1, v), out); return; }
        if (kind === 'anal0') { setc(out, EMP.d); mixc(out, EMP.e, band(fract(v * 3 - u) - 0.5, 0.1, 0.06), out); return; }
        setc(out, EMP.k); mixc(out, EMP.e, smooth(0.75, 1, v), out);
      }
    },
    anthias: {
      lengthM: 0.1, tex: [128, 64], eye: [0.39, 0.04, 0.04], iris: hex(0xd87830), beat: 1.4, spacing: 1.8,
      rows: [[0.5, 0.01, -0.012, 0.008], [0.47, 0.042, -0.042, 0.02], [0.42, 0.082, -0.078, 0.034], [0.33, 0.122, -0.11, 0.044], [0.2, 0.142, -0.122, 0.049], [0.06, 0.137, -0.117, 0.048], [-0.08, 0.112, -0.096, 0.04], [-0.18, 0.077, -0.062, 0.03], [-0.25, 0.052, -0.042, 0.021], [-0.28, 0.044, -0.036, 0.018]],
      tail: { type: 'lyre', span: 0.16, len: 0.22 },
      dorsal: [{ from: 0.3, to: -0.24, h: 0.07, shape: 'plateau', rake: 0.3 }], anal: [{ from: 0.02, to: -0.2, h: 0.07, shape: 'arch', rake: 0.3 }],
      pelvic: { x: 0.24, len: 0.09 }, pectoral: { x: 0.28, y: -0.02, len: 0.11, width: 0.05, spread: 0.3 },
      paint: function (P, out) {
        setc(out, ANTH.base); mulc(out, 1 - 0.12 * smooth(0.3, 1, P.up)); mixc(out, K.white, 0.25 * smooth(0.3, 1, -P.up), out);
        var aa = Math.max(P.aa, P.aay);
        mixc(out, ANTH.v, 1 - smooth(0.011 - aa, 0.011 + aa, polyDist(P.x, P.y, [[0.37, 0.0], [0.31, -0.045], [0.25, -0.06]])), out);
        mixc(out, ANTH.y, 0.35 * band(fract(P.y / 0.03) - 0.5, 0.12, 0.1) * smooth(0.25, 0.1, P.x), out);
      },
      fin: function (kind, u, v, out) {
        setc(out, ANTH.base); mixc(out, ANTH.y, 0.4, out);
        if (kind === 'tail') mixc(out, ANTH.v, Math.max(1 - smooth(0.1, 0.22, u), smooth(0.78, 0.9, u)) * smooth(0.5, 0.9, v), out);
        if (kind === 'pelvic') mixc(out, ANTH.v, 0.5, out);
        if (kind === 'dorsal0') mixc(out, ANTH.v, 0.3 * smooth(0.6, 1, v), out);
      },
      extra: function (c) {
        // The elongated third dorsal spine (long in males).
        var y0 = c.prof(0.26)[0];
        ribbon(c.fins, lineTo([0.26, y0, 0], [0.18, y0 + 0.17, 0], c.school ? 2 : 5, 0.01), function (t) { return 0.012 * (1 - t) + 0.003; }, [-1, 0, 0], function (t, s, o) { mixc(ANTH.base, ANTH.v, 0.6, o); });
      },
      schoolTint: function (r, color) {
        // About one in eight are magenta males; females are orange-gold.
        if (r < 0.13) color.setRGB(0.82, 0.32 + 0.3 * r, 4.6); else color.setRGB(0.96 + 0.06 * r, 0.9 + 0.2 * r, 0.85 + 0.3 * r);
      }
    },
    blue_green_chromis: {
      lengthM: 0.08, tex: [64, 32], eye: [0.38, 0.04, 0.045], iris: hex(0x40a0a0), sheen: [0x40e0d0, 0x60a0ff, 0.45], beat: 1.5, spacing: 1.7,
      rows: [[0.5, 0.0, -0.02, 0.008], [0.47, 0.05, -0.055, 0.022], [0.42, 0.1, -0.095, 0.036], [0.33, 0.15, -0.13, 0.046], [0.2, 0.17, -0.145, 0.05], [0.06, 0.165, -0.14, 0.049], [-0.08, 0.135, -0.115, 0.041], [-0.18, 0.09, -0.075, 0.03], [-0.25, 0.058, -0.046, 0.02], [-0.28, 0.048, -0.038, 0.017]],
      tail: { type: 'forked', span: 0.15, len: 0.22 },
      dorsal: [{ from: 0.28, to: -0.22, h: 0.075, shape: 'plateau', rake: 0.35 }], anal: [{ from: 0.02, to: -0.2, h: 0.07, shape: 'arch', rake: 0.35 }],
      pelvic: { x: 0.24, len: 0.08 }, pectoral: { x: 0.27, y: -0.02, len: 0.1, width: 0.05, spread: 0.3 },
      paint: function (P, out) {
        setc(out, CHROMIS.b);
        // Hold more turquoise in the upper flank so the light-facing scales
        // remain blue-green after the silver grazing sheen is applied.
        mixc(out, CHROMIS.d, 0.22 + 0.5 * smooth(-0.15, 0.95, P.up), out);
        mulc(out, 0.9 + 0.075 * smooth(0.18, 0.92, -P.up));
        mixc(out, CHROMIS.l, 0.3 * smooth(0.25, 1, -P.up), out);
        var shoulder = Math.exp(-Math.pow((P.x - 0.29) / 0.13, 2)) * (1 - smooth(0.18, 0.82, Math.abs(P.yn)));
        mixc(out, CHROMIS.d, shoulder * 0.1, out);
      },
      fin: function (kind, u, v, out) { mixc(CHROMIS.b, CHROMIS.l, 0.5 + 0.3 * v, out); },
      schoolTint: function (r, color) { color.setRGB(0.92 + 0.16 * r, 0.96 + 0.08 * r, 1.0); }
    },
    lionfish: {
      lengthM: 0.3, tex: [128, 64], eye: [0.37, 0.06, 0.032], iris: hex(0x9a3020), beat: 0.6, wiggle: 0.35, pecBeat: 0.14, pecRate: 0.25, tailBeat: 0.5,
      rows: [[0.5, 0.01, -0.035, 0.015], [0.46, 0.085, -0.085, 0.042], [0.38, 0.16, -0.13, 0.066], [0.28, 0.19, -0.15, 0.076], [0.15, 0.19, -0.15, 0.076], [0.0, 0.17, -0.135, 0.066], [-0.12, 0.13, -0.1, 0.05], [-0.21, 0.08, -0.06, 0.035], [-0.27, 0.05, -0.04, 0.022], [-0.3, 0.042, -0.035, 0.018]],
      tail: { type: 'round', span: 0.13, len: 0.2 },
      dorsal: [{ from: -0.02, to: -0.24, h: 0.1, shape: 'arch', rake: 0.35 }], anal: [{ from: -0.05, to: -0.22, h: 0.1, shape: 'arch', rake: 0.4 }],
      pelvic: { x: 0.22, len: 0.16 },
      pectoral: { x: 0.25, y: -0.04, len: 0.44, width: 0.16, arc: 0.95, rays: 24, spread: 0.95, droop: 0.45,
        shape: function (u) { return (0.7 + 0.3 * Math.sin(PI * u)) * (Math.round(u * 24) % 2 ? 0.84 : 1); } },
      paint: function (P, out) {
        var x = P.x, y = P.y, aa = Math.max(P.aa, P.aay);
        setc(out, LION.w);
        // Unequal maroon bars bend into chevrons; facial bands cross the eye.
        // NOAA's identification guide describes wide/thin and V-shaped bars.
        var s = (x + 0.18 * Math.abs(y) + 0.008 * Math.sin(y * 51 + x * 19)) / 0.067, f = fract(s);
        var width = 0.52 + 0.16 * noise2(Math.floor(s) * 7.2, y * 10);
        var maroon = smooth(0.045, 0.045 + aa / 0.067, f) * (1 - smooth(width, width + aa / 0.067, f));
        var thin = band(f - 0.82, 0.035, aa / 0.067);
        maroon = Math.max(maroon, thin * 0.8);
        if (x > 0.29) {
          var face = (x - 0.43 * y + 0.006 * Math.sin(y * 45)) / 0.063;
          var faceBand = band(fract(face) - 0.5, 0.29, aa / 0.063);
          maroon = lerp(maroon, faceBand, smooth(0.29, 0.34, x));
        }
        mixc(out, (Math.floor(s) & 1) ? LION.r : LION.m, maroon, out);
        mulc(out, 0.93 + 0.09 * noise2(x * 90 + 2, y * 90));
        mixc(out, LION.pale, 0.4 * smooth(0.3, 1, -P.up), out);
      },
      fin: function (kind, u, v, out) {
        if (kind === 'pectoral') {
          var ray = Math.round(u * 24) % 2 === 0;
          if (ray) mixc(LION.w, LION.m, band(fract(v * 7) - 0.5, 0.25, 0.08), out); else { mixc(LION.pale, LION.r, 0.25 + 0.35 * band(fract(v * 5 + 0.3) - 0.5, 0.2, 0.1), out); }
          return;
        }
        setc(out, LION.pale); mixc(out, LION.m, 0.75 * band(fract(u * 6 + v * 2) - 0.5, 0.12, 0.08), out);
      },
      extra: function (c) {
        // Long venomous dorsal spines: banded, with small feathery membranes.
        var n = 13, s2 = [0, 0, 0];
        for (var i = 0; i < n; i++) {
          var u = i / (n - 1), x = lerp(0.3, -0.02, u), top = c.prof(x, s2)[0], h = 0.36 * Math.pow(Math.sin(PI * (0.12 + 0.88 * u) * 0.9), 0.8) * (1 - 0.35 * u) + 0.06;
          var tipx = x - 0.18 * h - 0.04, pts = lineTo([x, top - 0.004, 0], [tipx, top + h, 0], c.high ? 9 : 4, 0.0);
          ribbon(c.fins, pts, function (t) { return 0.006 + 0.034 * Math.pow(Math.sin(PI * t * 1.05), 2) * (t < 0.85 ? 1 : 0.2); }, [-0.94, -0.34, 0],
            function (t, s, o) { if (s === 0) mixc(LION.w, LION.m, band(fract(t * 7) - 0.5, 0.26, 0.1), o); else mixc(LION.pale, LION.r, 0.3, o); });
        }
        // Fleshy tentacles above the eyes.
        [-1, 1].forEach(function (side) {
          var z = side * c.surfZ(0.37, 0.1);
          ribbon(c.fins, lineTo([0.37, 0.1, z], [0.35, 0.17, z * 1.05], c.high ? 4 : 2, 0), function (t) { return 0.014 * (1 - t) + 0.004; }, [-1, 0, 0], function (t, s, o) { mixc(LION.w, LION.m, band(fract(t * 3) - 0.5, 0.25, 0.1), o); });
        });
      },
      anim: function (a, t) { var s = Math.sin(t * 0.9); a.pose.rotation.z = 0.02 * s; }
    },
    peacock_grouper: {
      lengthM: 0.4, tex: [128, 64], eye: [0.38, 0.065, 0.026], iris: hex(0x9a6a2a), beat: 0.8, wiggle: 0.8,
      rows: [[0.5, 0.0, -0.045, 0.02], [0.48, 0.05, -0.08, 0.05], [0.43, 0.11, -0.12, 0.075], [0.35, 0.15, -0.14, 0.09], [0.24, 0.165, -0.15, 0.095], [0.12, 0.165, -0.15, 0.095], [0.0, 0.155, -0.14, 0.09], [-0.11, 0.13, -0.12, 0.075], [-0.2, 0.09, -0.08, 0.055], [-0.26, 0.065, -0.055, 0.04], [-0.29, 0.058, -0.05, 0.036]],
      tail: { type: 'round', span: 0.13, len: 0.19 },
      dorsal: [{ from: 0.28, to: -0.24, h: 0.07, shape: 'rear', rake: 0.3 }], anal: [{ from: -0.04, to: -0.23, h: 0.08, shape: 'arch', rake: 0.3 }],
      pelvic: { x: 0.24, len: 0.09 }, pectoral: { x: 0.28, y: -0.03, len: 0.13, width: 0.07, spread: 0.3 },
      paint: function (P, out) {
        var x = P.x, y = P.y, cc = P.cc || (P.cc = [0, 0, 0, 0, 0]);
        setc(out, ARGUS.b); mixc(out, ARGUS.d, 0.5 * smooth(0.2, 1, P.up), out);
        // Five or six pale bars on the rear half, and a large pale area over the chest.
        mixc(out, ARGUS.bar, 0.72 * band(fract((x + 0.012) / 0.056) - 0.5, 0.2, 0.1) * smooth(0.03, -0.03, x) * smooth(-0.75, 0.05, P.yn), out);
        mixc(out, ARGUS.chest, 0.8 * smooth(0.18, 0.25, x) * smooth(0.42, 0.35, x) * smooth(-0.1, -0.45, P.yn), out);
        cells(x / 0.034, y / 0.034, 3, cc);
        var aa = Math.max(P.aa, P.aay) / 0.034;
        mixc(out, ARGUS.d, 1 - smooth(0.3 - aa, 0.3 + aa, cc[0]), out);
        mixc(out, ARGUS.s, 1 - smooth(0.2 - aa, 0.2 + aa, cc[0]), out);
      },
      fin: function (kind, u, v, out) {
        setc(out, ARGUS.b);
        var spot = noise2(u * 9 + v * 3, v * 5) > 0.72 ? 0.8 : 0;
        mixc(out, ARGUS.s, spot, out);
        if (kind !== 'pectoral') mixc(out, ARGUS.s, smooth(0.88, 1, v) * 0.6, out);
      }
    },
    humphead_wrasse: {
      lengthM: 1.4, tex: [128, 64], eye: [0.39, 0.075, 0.018], iris: hex(0xd09030), beat: 0.6, pecBeat: 0.6, pecRate: 1.0, wiggle: 0.6,
      rows: [[0.5, 0.015, -0.06, 0.03], [0.48, 0.075, -0.09, 0.055], [0.445, 0.16, -0.125, 0.08], [0.4, 0.232, -0.15, 0.1], [0.36, 0.258, -0.162, 0.108], [0.3, 0.24, -0.172, 0.114], [0.2, 0.245, -0.18, 0.118], [0.08, 0.235, -0.178, 0.117], [-0.04, 0.21, -0.165, 0.108], [-0.14, 0.165, -0.13, 0.088], [-0.22, 0.115, -0.088, 0.064], [-0.27, 0.085, -0.066, 0.049], [-0.3, 0.076, -0.058, 0.043]],
      tail: { type: 'round', span: 0.14, len: 0.19 },
      dorsal: [{ from: 0.28, to: -0.26, h: 0.08, shape: 'rear', rake: 0.3 }], anal: [{ from: -0.02, to: -0.25, h: 0.085, shape: 'rear', rake: 0.3 }],
      pelvic: { x: 0.24, len: 0.09 }, pectoral: { x: 0.29, y: -0.02, len: 0.13, width: 0.07, spread: 0.3 },
      paint: function (P, out) {
        var x = P.x, y = P.y, aa = Math.max(P.aa, P.aay);
        setc(out, NAPO.g); mixc(out, NAPO.d, 0.35 * smooth(0.3, 1, P.up), out); mixc(out, NAPO.l, 0.4 * smooth(0.2, 1, -P.up), out);
        var gy = y / 0.05, row = Math.floor(gy), fx = fract(x / 0.045 + (row & 1) * 0.5) - 0.5;
        mixc(out, NAPO.d, band(fx, 0.06 + aa / 0.045, aa / 0.045) * 0.75 * smooth(0.3, 0.24, x), out);
        var head = smooth(0.27, 0.33, x);
        mixc(out, NAPO.head, head * 0.55, out);
        var w = fract(y * 26 + Math.sin(x * 70) * 0.55);
        mixc(out, NAPO.wave, band(w - 0.5, 0.14, 0.12) * head * 0.85, out);
        var lines = Math.min(polyDist(x, y, [[0.38, 0.065], [0.33, 0.05], [0.28, 0.045]]), polyDist(x, y, [[0.38, 0.045], [0.33, 0.015], [0.29, 0.0]]));
        mixc(out, NAPO.d, 1 - smooth(0.006 - aa, 0.006 + aa, lines), out);
      },
      fin: function (kind, u, v, out) {
        setc(out, kind === 'pectoral' ? hex(0xd2c660) : NAPO.g);
        if (kind !== 'pectoral') { mixc(out, NAPO.wave, band(fract(u * 7 + v * 2) - 0.5, 0.12, 0.1) * 0.6, out); mixc(out, NAPO.d, smooth(0.85, 1, v), out); }
      },
      extra: function (c) {
        var lip = lin(NAPO.lip);
        blob(c.T, c.detail, 0.49, -0.012, 0, 0.026, 0.02, 0.05, lip, 12, 6);
        blob(c.T, c.detail, 0.485, -0.05, 0, 0.022, 0.018, 0.044, lip, 12, 6);
      }
    },
    cleaner_wrasse: {
      lengthM: 0.1, tex: [128, 32], eye: [0.42, 0.012, 0.03], iris: hex(0x1a1a20), beat: 1.6, pecBeat: 0.6, pecRate: 1.6,
      rows: [[0.5, 0.0, -0.012, 0.008], [0.47, 0.025, -0.032, 0.02], [0.42, 0.05, -0.052, 0.032], [0.33, 0.07, -0.07, 0.04], [0.2, 0.08, -0.075, 0.045], [0.05, 0.08, -0.072, 0.044], [-0.1, 0.07, -0.062, 0.038], [-0.2, 0.055, -0.048, 0.03], [-0.27, 0.042, -0.036, 0.022], [-0.3, 0.038, -0.032, 0.02]],
      tail: { type: 'truncate', span: 0.1, len: 0.19 },
      dorsal: [{ from: 0.28, to: -0.26, h: 0.035, shape: 'plateau', rake: 0.3 }], anal: [{ from: 0.05, to: -0.25, h: 0.032, shape: 'plateau', rake: 0.3 }],
      pelvic: { x: 0.26, len: 0.06 }, pectoral: { x: 0.3, y: -0.01, len: 0.09, width: 0.04, spread: 0.35 },
      paint: function (P, out) {
        var x = P.x, aa = Math.max(P.aa, P.aay), rear = smooth(0.25, -0.15, x);
        mixc(CLEANER.pale, CLEANER.b, rear, out); mixc(out, CLEANER.w, 0.6 * smooth(0.2, 0.8, -P.up) * (1 - 0.6 * rear), out);
        var hw = lerp(0.012, 0.04, clamp((0.5 - x) / 0.8, 0, 1)), cy = P.yc - 0.004;
        mixc(out, CLEANER.k, band(P.y - cy, hw, aa) * smooth(0.505, 0.48, x), out);
      },
      fin: function (kind, u, v, out) {
        setc(out, CLEANER.b);
        if (kind === 'tail') mixc(out, CLEANER.k, band(u - 0.5, 0.2, 0.06), out);
        if (kind === 'dorsal0' || kind === 'anal0') mixc(out, CLEANER.k, band(v - 0.55, 0.15, 0.1), out);
        if (kind === 'pectoral' || kind === 'pelvic') mixc(out, CLEANER.pale, 0.7, out);
      }
    },
  };

  var TRIG = { k: hex(0x111113), w: hex(0xf4f4ee), y: hex(0xf2c21a), o: hex(0xf6a21a) };
  var PORC = { b: hex(0xcdbf9e), d: hex(0x2a2117), w: hex(0xf2eee2), sp: hex(0xe6dcc4) };
  var BOX = { y: hex(0xffd418), d: hex(0xe8a60e), k: hex(0x141414), w: hex(0xf8f8ff), b: hex(0x6aa0ff) };
  var MORAY = { b: hex(0x8f6d3c), l: hex(0xb08c52), k: hex(0x2a1a0e), m: hex(0xe2bcae) };
  var SHARK = { g: hex(0x7a838e), d: hex(0x5a626c), w: hex(0xeceff0), tip: hex(0xfafcfc) };
  var KAS = { y: hex(0xffcc1a), d: hex(0xeaa812), b: hex(0x2f80f0), e: hex(0x173c8c), w: hex(0xf8f4e8) };
  var SWEET = { w: hex(0xf7f6f0), k: hex(0x121214), y: hex(0xf6c51e), lip: hex(0xe8b49a) };

  FISH.clown_triggerfish = {
    lengthM: 0.35, tex: [128, 96], eye: [0.25, 0.12, 0.03], iris: hex(0xd8b020), beat: 0.7, wiggle: 0.25, pecBeat: 0.6, pecRate: 2.2,
    rows: [[0.5, 0.03, -0.02, 0.012], [0.46, 0.08, -0.07, 0.03], [0.38, 0.17, -0.14, 0.05], [0.28, 0.24, -0.19, 0.065], [0.15, 0.27, -0.22, 0.07], [0.02, 0.26, -0.22, 0.068], [-0.1, 0.2, -0.17, 0.055], [-0.19, 0.12, -0.1, 0.04], [-0.25, 0.07, -0.06, 0.028], [-0.29, 0.06, -0.05, 0.024]],
    tail: { type: 'truncate', span: 0.13, len: 0.18 },
    dorsal: [{ from: 0.19, to: 0.1, h: 0.06, shape: 'front', rake: 0.9 }, { from: -0.02, to: -0.21, h: 0.11, shape: 'front', rake: 0.4 }],
    anal: [{ from: -0.02, to: -0.21, h: 0.1, shape: 'front', rake: 0.4 }],
    pectoral: { x: 0.2, y: 0.02, len: 0.07, width: 0.05, spread: 0.4 },
    paint: function (P, out) {
      var x = P.x, y = P.y, aa = Math.max(P.aa, P.aay), cc = P.cc || (P.cc = [0, 0, 0, 0, 0]);
      setc(out, TRIG.k);
      cells(x / 0.085, y / 0.075, 5, cc);
      mixc(out, TRIG.w, (1 - smooth(0.36 - aa / 0.08, 0.36 + aa / 0.08, cc[0])) * smooth(0.0, -0.06, y - P.yc) * smooth(0.36, 0.3, x) * smooth(-0.22, -0.16, x), out);
      cells(x / 0.036, y / 0.036, 7, cc);
      var net = 1 - smooth(0.06, 0.14, cc[1] - cc[0]);
      mixc(out, TRIG.y, net * smooth(0.04, 0.1, y - P.yc) * smooth(0.22, 0.17, x) * smooth(-0.16, -0.1, x), out);
      mixc(out, TRIG.o, smooth(0.43, 0.46, x), out);
      mixc(out, TRIG.y, band(x - 0.32, 0.018, P.aa) * smooth(-0.02, 0.05, y), out);
    },
    fin: function (kind, u, v, out) {
      setc(out, TRIG.k);
      if (kind === 'tail') { mixc(out, TRIG.w, band(v - 0.45, 0.14, 0.06), out); mixc(out, TRIG.y, 0.4 * smooth(0.0, 0.2, v) * (1 - smooth(0.2, 0.3, v)), out); }
      else if (kind === 'dorsal1' || kind === 'anal0') mixc(out, TRIG.y, 0.5 * (1 - smooth(0.2, 0.4, v)), out);
      else if (kind === 'pectoral') mixc(out, TRIG.y, 0.5, out);
    }
  };
  FISH.porcupinefish = {
    smoothSkin: true,
    lengthM: 0.45, tex: [128, 64], eye: [0.36, 0.05, 0.062], iris: hex(0xc8c070), eyeBulge: 0.85, beat: 0.7, wiggle: 0.12, tailBeat: 0.6, pecBeat: 0.7, pecRate: 1.6,
    rows: [[0.5, 0.0, -0.035, 0.04], [0.47, 0.07, -0.08, 0.085], [0.42, 0.125, -0.12, 0.125], [0.34, 0.16, -0.15, 0.155], [0.22, 0.175, -0.162, 0.168], [0.08, 0.168, -0.158, 0.162], [-0.06, 0.142, -0.132, 0.138], [-0.17, 0.09, -0.085, 0.09], [-0.24, 0.055, -0.05, 0.05], [-0.28, 0.045, -0.04, 0.04]],
    tail: { type: 'round', span: 0.12, len: 0.18 },
    dorsal: [{ from: -0.12, to: -0.24, h: 0.09, shape: 'arch', rake: 0.3 }], anal: [{ from: -0.12, to: -0.24, h: 0.08, shape: 'arch', rake: 0.3 }],
    pectoral: { x: 0.25, y: 0.0, len: 0.1, width: 0.09, spread: 0.45 },
    paint: function (P, out) {
      var cc = P.cc || (P.cc = [0, 0, 0, 0, 0]), aa = Math.max(P.aa, P.aay) / 0.045;
      mixc(PORC.b, PORC.w, smooth(-0.1, -0.6, P.yn), out);
      cells(P.x / 0.045, P.y / 0.045, 11, cc);
      var r = 0.16 + 0.14 * cc[2];
      mixc(out, PORC.d, (1 - smooth(r - aa, r + aa, cc[0])) * smooth(-0.55, -0.2, P.yn), out);
    },
    fin: function (kind, u, v, out) { mixc(PORC.b, PORC.w, 0.4, out); if (noise2(u * 8, v * 6) > 0.7) setc(out, PORC.d); },
    extra: function (c) {
      // Folded spines lie back over the body (they stand only when it inflates).
      var n = c.school ? 24 : (c.high ? 150 : 56), s = [0, 0, 0], tip = lin(PORC.sp), root = lin(PORC.b);
      for (var i = 0; i < n; i++) {
        var f = (i + 0.5) / n, x = lerp(0.36, -0.14, f), ang = i * 2.39996 - PI / 2;
        c.prof(x, s);
        var yc = (s[0] + s[1]) / 2, hh = (s[0] - s[1]) / 2, ca = Math.cos(ang), sa = Math.sin(ang);
        var b = [x, yc + sa * hh * 0.97, ca * s[2] * 0.97], nl = Math.sqrt(sa * sa + ca * ca);
        var d = [-0.95, 0.3 * sa / nl, 0.3 * ca / nl], dl = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        c.detail.spike(b, [d[0] / dl, d[1] / dl, d[2] / dl], 0.075, 0.007, root, tip);
      }
      blob(c.T, c.detail, 0.497, -0.015, 0, 0.012, 0.02, 0.03, lin(PORC.w), 8, 6);
    }
  };
  FISH.yellow_boxfish = {
    smoothSkin: true,
    lengthM: 0.12, tex: [128, 96], square: 4.5, eye: [0.38, 0.06, 0.04], iris: hex(0x3a3618), beat: 0.6, wiggle: 0.04, tailBeat: 0.7, pecBeat: 0.6, pecRate: 3.2,
    rows: [[0.5, 0.02, -0.035, 0.018], [0.47, 0.08, -0.09, 0.075], [0.42, 0.13, -0.13, 0.12], [0.33, 0.155, -0.155, 0.14], [0.2, 0.165, -0.165, 0.145], [0.05, 0.16, -0.16, 0.14], [-0.08, 0.14, -0.14, 0.12], [-0.16, 0.1, -0.1, 0.085], [-0.21, 0.06, -0.05, 0.045], [-0.25, 0.045, -0.038, 0.032]],
    tail: { type: 'round', span: 0.12, len: 0.24 },
    dorsal: [{ from: -0.12, to: -0.2, h: 0.07, shape: 'arch', rake: 0.3 }], anal: [{ from: -0.12, to: -0.2, h: 0.065, shape: 'arch', rake: 0.3 }],
    pectoral: { x: 0.24, y: 0.0, len: 0.08, width: 0.07, spread: 0.5 },
    paint: function (P, out) {
      var cc = P.cc || (P.cc = [0, 0, 0, 0, 0]), aa = Math.max(P.aa, P.aay) / 0.055;
      // Young boxfish: bright yellow with black spots (adults turn dull mustard to bluish).
      setc(out, BOX.y); mixc(out, BOX.d, 0.35 * smooth(0.5, 1, P.up), out);
      cells(P.x / 0.055 + P.side * 3.1, P.y / 0.055, 9, cc);
      var r = 0.2 + 0.07 * cc[2];
      mixc(out, BOX.k, 1 - smooth(r - aa, r + aa, cc[0]), out);
    },
    fin: function (kind, u, v, out) { mixc(BOX.y, BOX.w, 0.25, out); },
    extra: function (c) { blob(c.T, c.detail, 0.5, -0.01, 0, 0.015, 0.018, 0.022, lin(hex(0xf2c060)), 8, 6); }
  };
  FISH.giant_moray = {
    smoothSkin: true,
    lengthM: 1.5, unit: 0.57, tex: [256, 32], eye: [0.43, 0.05, 0.013], iris: hex(0xd0b040), beat: 0.3, wiggle: 0.12, offset: [-0.22, 0, 0],
    rows: [[0.5, 0.012, -0.012, 0.014], [0.47, 0.034, -0.026, 0.03], [0.42, 0.06, -0.034, 0.045], [0.35, 0.082, -0.042, 0.055], [0.27, 0.094, -0.05, 0.06], [0.15, 0.098, -0.06, 0.062], [0.0, 0.097, -0.064, 0.062], [-0.2, 0.092, -0.064, 0.06], [-0.5, 0.086, -0.062, 0.058]],
    spine: function (x) { return [0.16 * smooth(-0.35, 0.25, x) - 0.08 - 0.04 * smooth(0.25, 0.5, x), 0.04 * Math.sin(x * 4.2 + 0.6) * smooth(0.45, -0.1, x)]; },
    dorsal: [{ from: 0.33, to: -0.5, h: 0.03, shape: 'plateau', rake: 0.1, n: 16 }], anal: [{ from: 0.0, to: -0.5, h: 0.024, shape: 'plateau', rake: 0.1, n: 10 }],
    paint: function (P, out) {
      var cc = P.cc || (P.cc = [0, 0, 0, 0, 0]), head = smooth(0.25, 0.35, P.x), sc = lerp(0.05, 0.026, head), aa = Math.max(P.aa, P.aay) / sc;
      mixc(MORAY.b, MORAY.l, 0.35 * smooth(0.0, -0.8, P.yn) + 0.15 * noise2(P.x * 30, P.y * 30), out);
      cells(P.x / sc, P.y / sc + P.side * 2.3, 13, cc);
      var r = 0.3 + 0.12 * noise2(P.x * 50, P.y * 50);
      mixc(out, MORAY.k, (1 - smooth(r - aa, r + aa, cc[0])) * 0.9, out);
      mixc(out, MORAY.k, disc((P.x - 0.245) * 0.8, P.y - (P.yc - 0.01), 0.02, P.aa), out);
      mixc(out, MORAY.m, smooth(0.32, 0.4, P.x) * smooth(-0.55, -0.85, P.yn), out);
    },
    fin: function (kind, u, v, out) { mixc(MORAY.b, MORAY.k, 0.35 + 0.3 * smooth(0.5, 1, v), out); },
    extra: function (c) {
      // The detail prefix here contains only the two eyes built by fishParts.
      // Seat their limbus on the same curved spine as the head before appending
      // the separately positioned jaw and teeth; otherwise the eyes are buried.
      c.detail.map(0, function (p) { var offset = c.def.spine(p[0]); p[1] += offset[0]; p[2] += offset[1]; });
      // Open lower jaw on a hinge, with fang rows along both jaws.
      var jaw = new Geo(), hinge = [0.355, c.prof(0.355)[1] + c.def.spine(0.355)[0] + 0.006, c.def.spine(0.355)[1]];
      jaw.loft([[0.155, 0.006, -0.008, 0.008], [0.13, 0.012, -0.02, 0.022], [0.09, 0.014, -0.03, 0.034], [0.04, 0.014, -0.036, 0.042], [0.0, 0.016, -0.036, 0.046]], c.high ? 10 : 6, c.high ? 12 : 8,
        function (t, ang, x, y, z, o) { if (Math.sin(ang) > 0.3) setc(o, MORAY.m); else { mixc(MORAY.b, MORAY.k, noise2(x * 140, z * 140) > 0.62 ? 0.85 : 0.1, o); } });
      var tooth = lin(K.white);
      for (var i = 0; i < (c.high ? 7 : 4); i++) {
        var f = i / (c.high ? 6 : 3), tx = lerp(0.14, 0.03, f);
        [-1, 1].forEach(function (side) {
          var zz = side * lerp(0.016, 0.036, f);
          jaw.spike([tx, 0.012, zz], [0, 1, 0], 0.016, 0.0035, tooth, tooth);
          var ux = hinge[0] + tx, uy = c.prof(ux)[1] + c.def.spine(ux)[0] + 0.004;
          c.detail.spike([ux, uy, hinge[2] + zz * 0.9], [0, -1, 0], 0.014, 0.0035, tooth, tooth);
        });
      }
      c.part('jaw', jaw, hinge, 'detail');
    },
    anim: function (a, t) {
      a.parts.jaw.rotation.z = -(0.2 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.15)));
      a.pose.rotation.y = 0.07 * Math.sin(t * 0.37); a.pose.rotation.z = 0.025 * Math.sin(t * 0.29 + 1);
    },
    rest: function (a) { a.parts.jaw.rotation.z = -0.27; }
  };
  FISH.whitetip_reef_shark = {
    smoothSkin: true,
    lengthM: 1.5, tex: [256, 64], eye: [0.42, 0.022, 0.011], iris: hex(0x9aa070), eyeBulge: 0.7, beat: 0.75, wiggle: 1.5, tailBeat: 1.2, pecBeat: 0.05, pecRate: 0.5,
    rows: [[0.5, 0.004, -0.012, 0.016], [0.475, 0.024, -0.03, 0.04], [0.43, 0.045, -0.05, 0.06], [0.35, 0.062, -0.062, 0.07], [0.24, 0.072, -0.068, 0.075], [0.12, 0.072, -0.064, 0.072], [0.0, 0.063, -0.054, 0.062], [-0.1, 0.048, -0.04, 0.047], [-0.18, 0.033, -0.026, 0.032], [-0.24, 0.022, -0.017, 0.021], [-0.27, 0.019, -0.015, 0.018]],
    tail: { type: 'hetero', span: 0.17, len: 0.25 },
    dorsal: [{ from: 0.13, to: -0.03, h: 0.13, shape: 'front', rake: 0.55 }, { from: -0.16, to: -0.21, h: 0.045, shape: 'front', rake: 0.45 }],
    anal: [{ from: -0.15, to: -0.2, h: 0.038, shape: 'front', rake: 0.5 }],
    pelvic: { x: -0.04, len: 0.06 },
    pectoral: { x: 0.27, y: -0.05, len: 0.17, width: 0.08, arc: 0.3, spread: 1.15, droop: 0.32, shape: pointed },
    paint: function (P, out) {
      var x = P.x, aa = P.aa;
      mixc(SHARK.d, SHARK.g, smooth(1, 0.2, P.up), out);
      mixc(out, SHARK.w, smooth(-0.15, -0.45, P.yn), out);
      if (noise2(x * 40, P.y * 40) > 0.8) mixc(out, SHARK.d, 0.5 * smooth(-0.2, 0.3, P.yn), out);
      for (var g = 0; g < 5; g++) mixc(out, SHARK.d, band(x - (0.31 - g * 0.016), 0.0028, aa) * smooth(-0.55, -0.35, P.yn) * smooth(0.35, 0.15, P.yn) * 0.8, out);
    },
    fin: function (kind, u, v, out) {
      setc(out, SHARK.d);
      if (kind === 'dorsal0') mixc(out, SHARK.tip, smooth(0.6, 0.68, v) * smooth(0.0, 0.12, u), out);
      if (kind === 'tail') mixc(out, SHARK.tip, smooth(0.7, 0.78, u) * smooth(0.5, 0.6, v), out);
      if (kind === 'pectoral' || kind === 'pelvic') mixc(out, SHARK.w, 0.25, out);
    }
  };
  FISH.bluestripe_snapper = {
    lengthM: 0.3, tex: [128, 96], eye: [0.39, 0.035, 0.032], iris: hex(0xe0b040), beat: 1.1, spacing: 1.6,
    rows: [[0.5, 0.01, -0.012, 0.008], [0.48, 0.032, -0.03, 0.02], [0.44, 0.065, -0.06, 0.04], [0.36, 0.1, -0.088, 0.058], [0.26, 0.12, -0.108, 0.066], [0.14, 0.128, -0.115, 0.07], [0.02, 0.124, -0.111, 0.066], [-0.1, 0.108, -0.097, 0.058], [-0.2, 0.084, -0.076, 0.044], [-0.27, 0.06, -0.056, 0.032], [-0.31, 0.042, -0.038, 0.024], [-0.34, 0.034, -0.031, 0.02]],
    tail: { type: 'forked', span: 0.14, len: 0.18 },
    dorsal: [{ from: 0.3, to: -0.26, h: 0.065, shape: 'spiny', rake: 0.3 }], anal: [{ from: 0.0, to: -0.24, h: 0.05, shape: 'arch', rake: 0.35 }],
    pelvic: { x: 0.22, len: 0.07 }, pectoral: { x: 0.27, y: -0.03, len: 0.12, width: 0.05, spread: 0.3, shape: pointed },
    paint: function (P, out) {
      var yn = P.yn, w = Math.max(P.aay / P.hh, 0.01);
      setc(out, KAS.y); mixc(out, KAS.d, 0.3 * smooth(0.5, 1, P.up), out); mixc(out, KAS.w, smooth(-0.42, -0.62, yn), out);
      var st = [0.64, 0.33, 0.02, -0.29], on = smooth(0.47, 0.44, P.x);
      for (var i = 0; i < 4; i++) { mixc(out, KAS.e, band(yn - st[i], 0.075 + w, w) * on, out); mixc(out, KAS.b, band(yn - st[i], 0.05 + w, w) * on, out); }
    },
    fin: function (kind, u, v, out) { setc(out, KAS.y); if (kind === 'dorsal0') mixc(out, KAS.k || K.black, smooth(0.8, 0.95, v) * 0.7, out); if (kind === 'pelvic' || kind === 'pectoral') mixc(out, KAS.w, 0.4, out); },
    schoolTint: function (r, color) { color.setRGB(0.95 + 0.1 * r, 0.95 + 0.08 * r, 0.95 + 0.05 * r); }
  };
  FISH.oriental_sweetlips = {
    lengthM: 0.5, tex: [128, 96], eye: [0.38, 0.06, 0.026], iris: hex(0x302010), beat: 0.8, pecBeat: 0.5, spacing: 1.5,
    rows: [[0.5, 0.005, -0.045, 0.02], [0.48, 0.05, -0.075, 0.045], [0.43, 0.11, -0.11, 0.07], [0.35, 0.155, -0.14, 0.088], [0.24, 0.18, -0.155, 0.096], [0.12, 0.185, -0.158, 0.097], [0.0, 0.175, -0.15, 0.092], [-0.12, 0.145, -0.125, 0.078], [-0.21, 0.1, -0.085, 0.056], [-0.27, 0.07, -0.058, 0.04], [-0.3, 0.06, -0.05, 0.034]],
    tail: { type: 'truncate', span: 0.14, len: 0.19 },
    dorsal: [{ from: 0.28, to: -0.25, h: 0.085, shape: 'spiny', rake: 0.3 }], anal: [{ from: -0.02, to: -0.22, h: 0.08, shape: 'arch', rake: 0.35 }],
    pelvic: { x: 0.22, len: 0.09 }, pectoral: { x: 0.27, y: -0.04, len: 0.12, width: 0.06, spread: 0.3 },
    paint: function (P, out) {
      var yn = P.yn, w = Math.max(P.aay / P.hh, 0.012), st = [0.82, 0.55, 0.28, 0.0, -0.28, -0.56];
      setc(out, SWEET.w);
      for (var i = 0; i < st.length; i++) mixc(out, SWEET.k, band(yn - st[i] - 0.03 * P.x, 0.055 + 0.05 * smooth(-0.4, 0.85, st[i]) + w, w) * smooth(0.49, 0.46, P.x), out);
      // Yellow snout and forehead.
      mixc(out, SWEET.y, Math.max(smooth(0.41, 0.46, P.x), smooth(0.3, 0.4, P.x) * smooth(0.45, 0.75, yn)), out);
    },
    fin: function (kind, u, v, out) { setc(out, SWEET.y); if (noise2(u * 10 + 3, v * 6) > 0.66) setc(out, SWEET.k); },
    extra: function (c) { var lip = lin(SWEET.lip); blob(c.T, c.detail, 0.494, -0.012, 0, 0.02, 0.016, 0.034, lip, 10, 6); blob(c.T, c.detail, 0.488, -0.044, 0, 0.018, 0.015, 0.032, lip, 10, 6); }
  };
  KAS.k = K.black;

  // ---- Generic vertex-coloured shapes ------------------------------------------
  // Loft along -X; rows [x, top, bottom, hw] with x descending; col(t, ang, x, y, z, out) writes sRGB.
  Geo.prototype.loft = function (rows, nx, na, col, sq) {
    var prof = profile(rows), x0 = rows[0][0], x1 = rows[rows.length - 1][0], e = 2 / (sq || 2), s = [0, 0, 0], c = [0, 0, 0], first = this.count(), r, a, m = na + 1;
    for (r = 0; r <= nx; r++) {
      var t = r / nx, x = lerp(x0, x1, t); prof(x, s);
      var yc = (s[0] + s[1]) / 2, hh = (s[0] - s[1]) / 2;
      for (a = 0; a <= na; a++) {
        var ang = -PI / 2 + a / na * TAU, y = yc + sp(Math.sin(ang), e) * hh, z = sp(Math.cos(ang), e) * s[2];
        col(t, ang, x, y, z, c); this.v(x, y, z, lin(c), t, a / na);
      }
      this.seams.push([first + r * m, first + r * m + na]);
    }
    for (r = 0; r < nx; r++) for (a = 0; a < na; a++) {
      var i0 = first + r * m + a, i1 = i0 + 1, j0 = i0 + m, j1 = i1 + m;
      this.i.push(i0, i1, j0, i1, j1, j0);
    }
    prof(x0, s); col(0, PI / 2, x0, (s[0] + s[1]) / 2, 0, c); var p0 = this.v(x0 + 0.002, (s[0] + s[1]) / 2, 0, lin(c), 0, 0.5);
    prof(x1, s); col(1, PI / 2, x1, (s[0] + s[1]) / 2, 0, c); var p1 = this.v(x1 - 0.002, (s[0] + s[1]) / 2, 0, lin(c), 1, 0.5), last = first + nx * m;
    for (a = 0; a < na; a++) { this.i.push(first + a + 1, first + a, p0); this.i.push(last + a, last + a + 1, p1); }
    return first;
  };
  // Remaps vertices [from, count) with fn(p) on an [x, y, z] array.
  Geo.prototype.map = function (from, fn) {
    var p = [0, 0, 0];
    for (var k = from * 3; k < this.p.length; k += 3) { p[0] = this.p[k]; p[1] = this.p[k + 1]; p[2] = this.p[k + 2]; fn(p); this.p[k] = p[0]; this.p[k + 1] = p[1]; this.p[k + 2] = p[2]; }
  };
  // A three-sided spike from base b along unit direction d.
  Geo.prototype.spike = function (b, d, len, r, colBase, colTip) {
    var ax = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    var n1 = [d[1] * ax[2] - d[2] * ax[1], d[2] * ax[0] - d[0] * ax[2], d[0] * ax[1] - d[1] * ax[0]], l = Math.sqrt(n1[0] * n1[0] + n1[1] * n1[1] + n1[2] * n1[2]) || 1;
    n1[0] /= l; n1[1] /= l; n1[2] /= l;
    var n2 = [d[1] * n1[2] - d[2] * n1[1], d[2] * n1[0] - d[0] * n1[2], d[0] * n1[1] - d[1] * n1[0]], first = this.count();
    for (var k = 0; k < 3; k++) {
      var a = k / 3 * TAU, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      this.v(b[0] + n1[0] * ca + n2[0] * sa, b[1] + n1[1] * ca + n2[1] * sa, b[2] + n1[2] * ca + n2[2] * sa, colBase, 0, 0);
    }
    var tip = this.v(b[0] + d[0] * len, b[1] + d[1] * len, b[2] + d[2] * len, colTip, 1, 1);
    for (k = 0; k < 3; k++) this.i.push(first + k, first + (k + 1) % 3, tip);
  };

  // ---- Rays: a planform grid with top and bottom skins --------------------------
  // Five paired ventral openings follow the curve of the chest. Keep the
  // opening, rounded lip and skin fold in one field so pigment and relief
  // agree at both texture tiers. This is shallow skin detail, not extra meshes.
  function rayVentralField(Q, manta, out) {
    var x = Q.x / Q.k, az = Math.abs(Q.z / Q.k), aa = Q.aa / Q.k * 0.7;
    var across = (az - (manta ? 0.29 : 0.039)) / (manta ? 0.105 : 0.015);
    var span = 1 - smooth(0.72, 1.03, Math.abs(across)), width = manta ? 0.006 : 0.001;
    var opening = 0, lip = 0, fold = 0;
    for (var g = 0; g < 5; g++) {
      var centre = (manta ? 0.34 : 0.046) - g * (manta ? 0.085 : 0.014);
      var d = x - centre + (manta ? 0.026 : 0.0038) * (across * across - 0.3);
      opening = Math.max(opening, band(d, width, aa) * span);
      lip = Math.max(lip, band(d + width * 2.1, width * 0.6, aa) * span);
      fold = Math.max(fold, band(d + width * 4.1, width * 1.5, aa * 1.4) * span);
    }
    // The stingray's small underside mouth sits ahead of the gill rows.
    // Mantas retain their terminal mouth in the existing head geometry.
    var mouth = manta ? 0 : band(x - 0.079 + 0.006 * Math.pow(az / 0.02, 2), 0.0015, aa) * (1 - smooth(0.015, 0.021, az));
    out[0] = opening; out[1] = lip; out[2] = fold; out[3] = mouth;
    return out;
  }
  function makeRay(T, id, info, def, o) {
    var kit = new Kit(T, id, info.group, o.high, o.derivatives), rng = stream(o.seed, 31), high = o.high, rm = !!o.reducedMotion;
    var k = 0.93 + 0.14 * rng(), S = def.span * k, ph0 = rng() * TAU, res = high ? def.res[1] : def.res[0], NZ = res[0], NC = res[1];
    var top = new Geo(), bot = new Geo(), white = [1, 1, 1], i, j, f, xmin = Infinity, xmax = -Infinity;
    for (i = 0; i <= 64; i++) { f = i / 64; xmin = Math.min(xmin, def.trail(f) * k); xmax = Math.max(xmax, def.lead(f) * k); }
    var lift = 0;
    for (i = 0; i <= NZ; i++) for (j = 0; j <= NC; j++) {
      var sz = Math.sin((i / NZ * 2 - 1) * PI / 2), z = sz * S, c = 0.5 - 0.5 * Math.cos(j / NC * PI); f = Math.abs(sz);
      var x = lerp(def.lead(f) * k, def.trail(f) * k, c), th = def.thick(f, c) * k, u = (x - xmin) / (xmax - xmin), v = (sz + 1) / 2;
      var camber = id === 'reef_manta' ? 0.06 * S * Math.pow(f, 2.5) : 0;
      top.v(x, th * def.upper + camber, z, white, u, v); bot.v(x, -th * (1 - def.upper) + camber, z, white, u, v);
      lift = Math.max(lift, th * (1 - def.upper));
    }
    for (i = 0; i < NZ; i++) for (j = 0; j < NC; j++) {
      var a = i * (NC + 1) + j, b = a + 1, cI = a + NC + 1, d = cI + 1;
      top.i.push(a, b, cI, b, d, cI); bot.i.push(a, cI, b, b, cI, d);
    }
    // Skins are painted on the unit-size disc (marks scale with the animal),
    // so every ray of a species and tier shares them.
    var tw = high ? def.tex[0] * 2 : def.tex[0], th2 = high ? def.tex[1] * 2 : def.tex[1], manta = id === 'reef_manta', tier = high ? 'h' : 'l';
    var x0 = xmin / k, x1 = xmax / k, S0 = def.span, Q = { S: S0, k: 1, ventral: [0, 0, 0, 0] };
    var topTex = kit.baked('ray|' + id + '|top|' + tier, tw, th2, function (u, v, out) {
      Q.x = lerp(x0, x1, u); Q.z = lerp(-S0, S0, v); Q.f = Math.abs(Q.z) / S0; Q.aa = 0.75 * (x1 - x0) / tw; def.paintTop(Q, out);
      // Broad skin variation survives at swimming distance; tiny denticles are
      // reserved for the relief map so dark wings do not become glittery.
      mulc(out, 0.94 + 0.08 * noise2(u * 11 + 4, v * 9) - 0.055 * Math.pow(Q.f, 5));
    });
    var bottomMaps = bakedPair(kit, 'ray|' + id + '|bottom|' + tier, tw, th2, function (u, v, out, rel) {
      Q.x = lerp(x0, x1, u); Q.z = lerp(-S0, S0, v); Q.f = Math.abs(Q.z) / S0; Q.aa = 0.75 * (x1 - x0) / tw;
      var detail = rayVentralField(Q, manta, Q.ventral);
      def.paintBottom(Q, out);
      mulc(out, (0.94 + 0.055 * noise2(u * 8, v * 10)) * (1 + 0.035 * detail[1] - 0.025 * detail[2]));
      // Red stores subtle relief; green varies wet-skin roughness. Sharing
      // this map keeps the underside in the existing skin shader program.
      rel[0] = 0.5 - 0.18 * detail[0] + 0.075 * detail[1] - 0.028 * detail[2] - 0.16 * detail[3];
      rel[1] = 0.86 + 0.06 * noise2(u * 17 + 2, v * 15) + 0.07 * detail[0] - 0.045 * detail[1];
      rel[2] = 0.5;
    }, false, [false, true]);
    var botTex = bottomMaps[0], bottomSurface = bottomMaps[1];
    var root = kit.root(), pose = kit.node('pose', root), holder = kit.node('holder', pose);
    if (info.origin === 'base') holder.position.y = lift;
    var topGeo = kit.geo(top, 1), botGeo = kit.geo(bot, 1);
    // Fine dermal denticles break up broad, plastic-looking highlights; the
    // cosine chord sampling gives the leading edge a continuous rounded roll.
    var rayRelief = kit.baked('ray|relief', tw, th2, function (u, v, out) {
      var pore = noise2(u * 165 + 3, v * 165), folds = Math.sin(u * 90 + Math.sin(v * 18) * 0.8);
      out[0] = out[1] = out[2] = 0.45 + pore * 0.3 + folds * 0.025;
    }, false, false, true);
    var rayRoughness = kit.baked('ray|roughness', high ? 128 : 64, high ? 128 : 64, function (u, v, out) {
      out[0] = out[1] = out[2] = 0.83 + 0.15 * noise2(u * 15 + 7, v * 18);
    }, false, false, true);
    var topMat = kit.std({ map: topTex, bumpMap: rayRelief, bumpScale: Math.min(0.00055, S * 0.0025), roughnessMap: rayRoughness, roughness: (def.rough || 0.55) + 0.09, metalness: 0 }, def.sheen ? { sheen: sheenOf(T, def.sheen[0], def.sheen[1], def.sheen[2]) } : null);
    var botMat = kit.std({ map: botTex, bumpMap: bottomSurface, bumpScale: Math.min(0.0016, S * 0.0035), roughnessMap: bottomSurface, roughness: 0.64 });
    kit.mesh(topGeo, topMat, 'disc-top', holder); kit.mesh(botGeo, botMat, 'disc-bottom', holder);
    var det = new Geo(), parts = {}, live = [], detMat = kit.std({ vertexColors: true, roughness: manta ? 0.48 : 0.35, side: T.DoubleSide });
    var ctx = { T: T, kit: kit, k: k, S: S, high: high, detail: det, thick: def.thick, lead: def.lead, trail: def.trail, upper: def.upper,
      part: function (name, geo, pos) { var pv = kit.node(name + '-pivot', holder); pv.position.set(pos[0], pos[1], pos[2]); live.push({ name: name, node: pv, geo: geo.build(T, 1) }); parts[name] = pv; return pv; } };
    def.extra(ctx);
    // The eyes and mouth, the cephalic fins and the tail draw as one batch.
    // Each update writes the flexing parts into it, posed by their pivots.
    var tailMargin = (manta ? 0.75 : 0.33) * k * 0.11, entries = det.count() ? [{ geo: det.build(T, 1), part: 'detail' }] : [], reachList = [];
    live.forEach(function (lp) {
      lp.base = new Float32Array(lp.geo.attributes.position.array); lp.horn = /^cephalic/.test(lp.name); lp.side = lp.name === 'cephalic-right' ? 1 : -1;
      // The flex margins their own meshes' bounds carried.
      var margin = lp.horn ? 0.015 * k : tailMargin;
      reachList.push({ center: lp.node.position.clone(), reach: batchExtent(lp.geo), margin: margin });
      entries.push({ geo: lp.geo, part: lp.name, node: lp.node, live: true, boxMargin: [0, margin, margin] });
    });
    var detail = batchMesh(kit, entries, detMat, null, 'detail', holder), liveV0 = 0, liveI0 = 0;
    if (detail) {
      batchReach(detail, reachList);
      live.forEach(function (lp, i) { var r = detail.table[entries.length - live.length + i]; lp.first = r.first; lp.geo = null; if (!i) { liveV0 = r.first; liveI0 = r.start; } });
    }
    var baseTop = new Float32Array(topGeo.attributes.position.array), baseBot = new Float32Array(botGeo.attributes.position.array), disposed = false;
    // Everything in the wing beat that does not change with time, per vertex
    // (the same products as before, so every frame comes out bit for bit).
    var NV = baseTop.length / 3, W = new Float64Array(NV * 8);
    for (i = 0; i < NV; i++) {
      var wx = baseTop[i * 3], wz = baseTop[i * 3 + 2], wside = wz < 0 ? -1 : 1, wf = Math.abs(wz) / S, wxn = wx / k, o8 = i * 8;
      var wchord = clamp((def.lead(wf) - wxn) / Math.max(0.012, def.lead(wf) - def.trail(wf)), 0, 1);
      W[o8] = wside; W[o8 + 1] = Math.max(S * 0.025, Math.abs(wz));
      if (manta) { W[o8 + 2] = 1.12 * wf; W[o8 + 3] = 0.63 * wchord; W[o8 + 4] = Math.pow(wf, 1.7); W[o8 + 5] = 0.035 * wf * wf * Math.sin(PI * wchord); }
      else { var wv = def.wavePrep(wxn, wf, wside); W[o8 + 2] = wv[0]; W[o8 + 3] = wv[1]; W[o8 + 4] = wv[2]; W[o8 + 5] = 0.0028 * Math.pow(wf, 2.4); W[o8 + 6] = wchord * 4.4; W[o8 + 7] = wside * 0.3; }
    }
    // The render bounds include the full wing beat, even when the resting disc
    // lies flat. The public placement radius still comes from the rest model.
    [topGeo, botGeo].forEach(function (g) {
      g.computeBoundingSphere(); g.boundingSphere.radius += S * (manta ? 0.42 : 0.13);
      // Raycasting also uses the box before testing triangles. Keep flexible
      // wing tips selectable throughout their stroke, not just at rest.
      g.boundingBox.expandByVector(new T.Vector3(0, S * (manta ? 0.5 : 0.18), 0));
    });
    function stroke(p) {
      var u = fract(p / TAU), x;
      // Quintic easing makes acceleration continuous at the glide transition.
      if (u < 0.31) { x = u / 0.31; return 0.45 - 0.98 * x * x * x * (10 + x * (-15 + 6 * x)); }
      if (u < 0.86) { x = (u - 0.31) / 0.55; return -0.53 + 0.98 * x * x * x * (10 + x * (-15 + 6 * x)); }
      return 0.45;
    }
    function update(dt, t, motion) {
      if (disposed || rm) return;
      t = num(t, 0);
      var pt = topGeo.attributes.position.array, pb = botGeo.attributes.position.array, ph = t * def.hz * TAU + ph0 + 0.07 * Math.sin(t * 0.27 + ph0);
      var power = 0.65 + 0.35 * Math.min(1.3, effort(motion, info.lengthM)), turn = turning(motion), q, o;
      // Per side: the turn's phase lead and the stroke's scale (side * turn * 0.12).
      var leadR = turn * 0.12, leadL = -turn * 0.12, scaleR = k * power * (1 + leadR), scaleL = k * power * (1 + leadL), ph18 = ph * 1.8;
      for (q = 0, o = 0; q < pt.length; q += 3, o += 8) {
        var right = W[o] > 0, dy;
        if (manta) {
          // A pressure wave starts at the leading shoulder and travels aft and
          // outward. The soft trailing edge follows rather than hinging flat.
          var phase = ph - W[o + 2] - W[o + 3] + (right ? leadR : leadL);
          dy = W[o + 4] * (0.79 * stroke(phase) - 0.22);
          dy += W[o + 5] * Math.sin(phase - 0.8);
        } else dy = def.waveAt(W, o + 2, ph) + W[o + 5] * Math.sin(ph18 - W[o + 6] + W[o + 7]);
        dy *= right ? scaleR : scaleL;
        pt[q + 1] = baseTop[q + 1] + dy; pb[q + 1] = baseBot[q + 1] + dy;
        // A bending wing draws its tip inward. Without this span correction,
        // vertical displacement stretches the disc like an elastic sheet.
        var slope = dy / W[o + 1], shorten = Math.min(0.16, 0.58 * slope * slope);
        pt[q + 2] = pb[q + 2] = baseTop[q + 2] * (1 - shorten);
      }
      topGeo.attributes.position.needsUpdate = true; botGeo.attributes.position.needsUpdate = true;
      batchNormals(topGeo, 0, NV, 0, topGeo.index.count); batchNormals(botGeo, 0, NV, 0, botGeo.index.count);
      if (def.anim) def.anim({ parts: parts, pose: pose, k: k }, t, ph);
      if (live.length && detail) {
        var dp = detail.geometry.attributes.position.array, reach = (manta ? 0.75 : 0.33) * k;
        for (var h = 0; h < live.length; h++) {
          var lp = live[h], b = lp.base, e;
          lp.node.updateMatrix(); e = lp.node.matrix.elements;
          for (q = 0, o = lp.first * 3; q < b.length; q += 3, o += 3) {
            var lx = b[q], ly, lz;
            if (lp.horn) {
              var u = clamp(b[q] / (0.29 * k), 0, 1), flexible = u * u;
              ly = b[q + 1] + 0.009 * k * flexible * Math.sin(ph * 0.72 - u * 1.1 + lp.side * 0.24);
              lz = b[q + 2] + lp.side * 0.008 * k * flexible * Math.sin(ph * 0.53 - u * 0.8);
            } else {
              var along = clamp(-b[q] / reach, 0, 1), bend = along * along;
              ly = b[q + 1] + reach * 0.022 * bend * Math.sin(ph * 0.72 - along * 1.8);
              lz = b[q + 2] + reach * 0.065 * bend * (Math.sin(ph * 0.61 - along * 2.1) + turn * 0.45);
            }
            dp[o] = e[0] * lx + e[4] * ly + e[8] * lz + e[12]; dp[o + 1] = e[1] * lx + e[5] * ly + e[9] * lz + e[13]; dp[o + 2] = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
          }
        }
        var dg = detail.geometry, nv = dg.attributes.position.count;
        batchDirty(dg, liveV0, nv); batchNormals(dg, liveV0, nv, liveI0, dg.index.count); batchBox(detail);
      }
      if (manta) {
        // The broad central body remains quiet while the wings carry the beat.
        pose.position.y = -0.025 * k * Math.sin(ph - 0.4);
        pose.rotation.z = 0.010 * Math.sin(ph - 0.8); pose.rotation.x = turn * 0.025;
      }
    }
    function dispose() { if (disposed) return; disposed = true; if (root.parent) root.parent.remove(root); kit.dispose(); }
    return { root: root, update: update, dispose: dispose, radius: radiusOf(T, root), animated: true };
  }

  var LYMMA = { b: hex(0xb08a3c), d: hex(0x8a6a2a), s: hex(0x2f8cff), e: hex(0x3a9cff), w: hex(0xf2f0e8) };
  var MANTA = { k: hex(0x15171a), g: hex(0x3a3f44), w: hex(0xeef0ee), sp: hex(0x2a2c30), m: hex(0x30343a) };
  var RAYS = {
    bluespotted_stingray: {
      span: 0.125, upper: 0.62, res: [[20, 10], [44, 22]], tex: [128, 128], hz: 0.55, rough: 0.4, sheen: [0x406080, 0x40a0ff, 0.15],
      lead: function (f) { return 0.15 * Math.pow(Math.max(0, 1 - f * f), 0.55) - 0.01 * f; },
      trail: function (f) { return -0.13 * Math.pow(Math.max(0, 1 - f * f), 0.5) - 0.01 * f; },
      thick: function (f, c) { return (0.026 * Math.pow(Math.max(0, 1 - f * f), 1.2) + 0.002) * Math.pow(Math.sin(PI * c), 0.6) * (f > 0.999 ? 0 : 1); },
      // The disc's travelling wave, 0.012 f^1.6 sin(ph - 30x + 0.4 side), in two
      // halves: per-vertex constants once, then each beat.
      wavePrep: function (x, f, side) { return [0.012 * Math.pow(f, 1.6), x * 30, side * 0.4]; },
      waveAt: function (w, o, ph) { return w[o] * Math.sin(ph - w[o + 1] + w[o + 2]); },
      paintTop: function (Q, out) {
        var cc = Q.cc || (Q.cc = [0, 0, 0, 0, 0]), x = Q.x / Q.k, z = Q.z / Q.k, sc = 0.016, aa = Q.aa / sc;
        mixc(LYMMA.b, LYMMA.d, 0.4 * noise2(x * 40, z * 40), out);
        cells(x / sc, z / sc, 17, cc);
        var r = 0.18 + 0.16 * cc[2];
        mixc(out, LYMMA.s, 1 - smooth(r - aa, r + aa, cc[0]), out);
        var edge = 1 - Math.sqrt(Math.pow(x / (x > 0 ? 0.15 : 0.13), 2) + Math.pow(z / 0.125, 2));
        mixc(out, LYMMA.e, band(edge - 0.03, 0.015, 0.012), out);
      },
      // White underside with small paired gill slits and a short curved mouth.
      // Taeniura lymma: Cabebe-Barnuevo et al. (2025), doi:10.3897/aiep.55.139721.
      paintBottom: function (Q, out) {
        setc(out, LYMMA.w);
        mixc(out, hex(0x6e706b), Q.ventral[0] * 0.74, out);
        mixc(out, hex(0x626963), Q.ventral[3] * 0.82, out);
      },
      extra: function (c) {
        var k = c.k, eye = lin(hex(0xd8b040)), dark = lin(hex(0x101418)), skin = lin(LYMMA.b);
        [-1, 1].forEach(function (side) {
          var ty = c.thick(0.2, 0.25) * k * c.upper;
          blob(c.T, c.detail, 0.06 * k, ty + 0.004 * k, side * 0.026 * k, 0.011 * k, 0.009 * k, 0.009 * k, skin, 10, 6);
          blob(c.T, c.detail, 0.063 * k, ty + 0.009 * k, side * 0.027 * k, 0.006 * k, 0.005 * k, 0.006 * k, eye, 8, 6);
          blob(c.T, c.detail, 0.065 * k, ty + 0.0115 * k, side * 0.027 * k, 0.0035 * k, 0.002 * k, 0.003 * k, dark, 6, 4);
          blob(c.T, c.detail, 0.035 * k, ty + 0.002 * k, side * 0.03 * k, 0.008 * k, 0.003 * k, 0.005 * k, dark, 6, 4);
        });
        // Tail with the two blue stripes along its sides and the venomous spine.
        var tail = new Geo(), pts = [], n = c.high ? 14 : 7;
        for (var i = 0; i <= n; i++) { var t = i / n; pts.push([-0.33 * t * k, 0.004 * k * Math.sin(PI * t), 0]); }
        tail.tube(pts, function (t) { return (0.011 * (1 - t) + 0.0015) * k; }, c.high ? 8 : 5, function (t, s) {
          // Ring direction is (0, -sin a, -cos a): the sides carry the blue stripes.
          var a = s * TAU, side = Math.abs(Math.cos(a)), up = -Math.sin(a);
          return lin(side > 0.8 && t < 0.88 ? LYMMA.s : up > 0 ? LYMMA.b : LYMMA.w);
        });
        tail.spike([-0.15 * k, 0.008 * k, 0], [-0.96, 0.28, 0], 0.045 * k, 0.003 * k, lin(hex(0xd8d0c0)), lin(hex(0xf0ece0)));
        c.part('tail', tail, [-0.12 * k, 0.004 * k, 0]);
      },
      anim: function (a, t, ph) { a.parts.tail.rotation.y = 0.12 * Math.sin(ph * 0.6); a.parts.tail.rotation.z = 0.04 * Math.sin(ph * 0.4); }
    },
    reef_manta: {
      span: 1.75, upper: 0.6, res: [[30, 8], [68, 16]], tex: [128, 128], hz: 0.2, rough: 0.5,
      lead: function (f) { return 0.6 - 0.75 * Math.pow(f, 1.4); },
      trail: function (f) { return -0.62 + 0.62 * Math.pow(f, 0.8) - 0.15 * f * f * f; },
      thick: function (f, c) { var z = f * 1.75; return (0.3 * Math.exp(-(z / 0.42) * (z / 0.42)) + 0.07 * Math.pow(1 - f, 1.2)) * Math.pow(Math.sin(PI * c), 0.55); },
      wave: function (x, f, side, ph) { return Math.pow(f, 1.7) * (0.8 * paddleStroke(ph - 0.85 * f + x * 0.3) - 0.24) + 0.035 * f * Math.sin(ph - 2.5 * x); },
      paintTop: function (Q, out) {
        var x = Q.x / Q.k, az = Math.abs(Q.z / Q.k), aa = Q.aa * 2;
        setc(out, MANTA.k);
        // Shoulder chevrons follow the curved wing roots with softly mottled,
        // irregular margins instead of crisp, geometrically cut triangles.
        var mottling = noise2(x * 28 + 5, Q.z / Q.k * 19), feather = (mottling - 0.5) * 0.045;
        var front = 0.4 - 0.52 * (az - 0.22) - 0.17 * Math.pow(az - 0.22, 2) + 0.018 * Math.sin(az * 16), backEdge = -0.015 + 0.15 * (az - 0.22) + 0.02 * Math.sin(az * 11 + 1);
        var edge = Math.min(front - x + feather, x - backEdge - feather * 0.7);
        var patch = smooth(-aa - 0.022, aa + 0.035, edge) * smooth(0.18, 0.29, az + feather) * (1 - smooth(0.76, 1.02, az));
        var shoulder = mixc(hex(0xb9bbb3), MANTA.w, smooth(0.0, 0.1, edge), [0, 0, 0]);
        mixc(out, shoulder, patch * (0.85 + 0.1 * mottling), out);
        mixc(out, MANTA.g, 0.15 * noise2(x * 6, Q.z * 6), out);
      },
      paintBottom: function (Q, out) {
        var x = Q.x / Q.k, z = Q.z / Q.k, az = Math.abs(z), cc = Q.cc || (Q.cc = [0, 0, 0, 0, 0]);
        setc(out, MANTA.w);
        var te = -0.62 + 0.62 * Math.pow(Math.min(1, az / 1.75), 0.8);
        mixc(out, MANTA.g, smooth(te + 0.25, te + 0.05, x) * smooth(0.4, 0.9, az / 1.75), out);
        mixc(out, MANTA.g, Q.ventral[0], out);
        cells(x / 0.09, z / 0.09, 21, cc);
        mixc(out, MANTA.sp, (1 - smooth(0.12, 0.2, cc[0])) * (az < 0.3 ? 1 : 0) * (x < 0.3 && x > -0.4 ? 1 : 0) * (cc[2] > 0.45 ? 1 : 0), out);
        mixc(out, MANTA.m, smooth(0.5, 0.56, x) * (1 - smooth(0.24, 0.3, az)), out);
      },
      extra: function (c) {
        var k = c.k, dark = lin(MANTA.k), mouth = lin(hex(0xd8dcd4)), eye = lin(hex(0x101010)), n = c.high ? 7 : 4;
        [-1, 1].forEach(function (side) {
          // Cephalic fins: the two rolled lobes in front of the mouth.
          var horn = new Geo(), sides = c.high ? 8 : 5;
          // An open, rolled sheet gives each lobe a visible trough and a blunt
          // flexible rim. The tips bend slightly inward toward the mouth.
          for (var i = 0; i <= n; i++) for (var j = 0; j <= sides; j++) {
            var t = i / n, a = lerp(-0.32 * PI, 1.42 * PI, j / sides), r = (0.052 * (1 - 0.45 * t) + 0.006 * Math.sin(PI * t)) * k;
            var y = -0.025 * k * Math.sin(t * PI * 0.7), z = side * (-0.035 * t + 0.028 * Math.sin(PI * t)) * k;
            // Reef mantas have pale mouths and pale inner head fins (oceanic: dark).
            var hc = Math.sin(a) < -0.15 ? lin(hex(0xd4d8d2)) : j === 0 || j === sides ? lin(hex(0x4a5051)) : dark;
            horn.v(t * 0.29 * k, y + Math.sin(a) * r, z + side * Math.cos(a) * r, hc, t, j / sides);
          }
          for (i = 0; i < n; i++) for (j = 0; j < sides; j++) {
            var h0 = i * (sides + 1) + j, h1 = h0 + sides + 1;
            if (side > 0) horn.i.push(h0, h1, h0 + 1, h0 + 1, h1, h1 + 1);
            else horn.i.push(h0, h0 + 1, h1, h0 + 1, h1 + 1, h1);
          }
          c.part(side < 0 ? 'cephalic-left' : 'cephalic-right', horn, [0.5 * k, 0.0, side * 0.31 * k]);
          blob(c.T, c.detail, 0.47 * k, 0.03 * k, side * 0.36 * k, 0.03 * k, 0.03 * k, 0.025 * k, eye, 8, 6);
        });
        blob(c.T, c.detail, 0.57 * k, -0.025 * k, 0, 0.05 * k, 0.06 * k, 0.27 * k, mouth, c.high ? 16 : 10, 6);
        var tail = new Geo(), tp = [], tn = c.high ? 10 : 5;
        for (var i = 0; i <= tn; i++) { var t = i / tn; tp.push([-0.75 * t * k, 0.02 * k * Math.sin(PI * t), 0]); }
        tail.tube(tp, function (t) { return (0.04 * (1 - t) + 0.006) * k; }, c.high ? 6 : 4, function () { return dark; });
        tail.membrane([[0.0, 0.03 * k, 0], [-0.12 * k, 0.03 * k, 0]], [[-0.06 * k, 0.12 * k, 0], [-0.14 * k, 0.04 * k, 0]], 1, function (u, v, out) { setc(out, MANTA.k); });
        c.part('tail', tail, [-0.58 * k, 0.04 * k, 0]);
      },
      anim: function (a, t, ph) {
        a.parts.tail.rotation.y = 0.08 * Math.sin(ph * 0.7);
        a.parts['cephalic-left'].rotation.y = 0.05 * Math.sin(ph * 1.3); a.parts['cephalic-right'].rotation.y = -0.05 * Math.sin(ph * 1.3);
        a.pose.position.y = -0.06 * a.k * Math.sin(ph + 0.6);
      }
    }
  };

  // ---- Generic models (turtles, invertebrates, corals, structures) --------------
  function makeModel(T, id, info, o, build) {
    var kit = new Kit(T, id, info.group, o.high, o.derivatives), root = kit.root(), anims = [], disposed = false;
    var ctx = { T: T, kit: kit, root: root, id: id, high: o.high, seed: o.seed, growth: o.growth, health: o.health, info: info, rm: o.reducedMotion,
      rng: function (salt) { return stream(o.seed, salt); }, anim: function (fn) { anims.push(fn); },
      // Bake key for maps drawn from this model's own random draws.
      key: function (name) { return id + '|' + name + '|' + o.seed + '|' + (o.high ? 'h' : 'l') + '|' + o.growth + '|' + o.health; } };
    var extra = build(ctx) || {};
    function update(dt, t, motion) { if (disposed || o.reducedMotion) return; t = num(t, 0); for (var i = 0; i < anims.length; i++) anims[i](t, dt, motion); }
    function dispose() {
      if (disposed) return; disposed = true; if (root.parent) root.parent.remove(root);
      root.traverse(function (m) { if (m.isInstancedMesh && typeof m.dispose === 'function') m.dispose(); });
      kit.dispose();
    }
    var h = { root: root, update: update, dispose: dispose, radius: radiusOf(T, root), animated: anims.length > 0 };
    Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }
  // CPU vertex animation from a frozen copy of the positions.
  function deform(ctx, geometry, fn, normals) {
    var pos = geometry.attributes.position, base = new Float32Array(pos.array);
    ctx.anim(function (t, dt, motion) { fn(base, pos.array, t, motion); pos.needsUpdate = true; if (normals) geometry.computeVertexNormals(); });
  }
  function scaleGeo(geo, s, from) { for (var k = (from || 0) * 3; k < geo.p.length; k++) geo.p[k] *= s; }

  // ---- Sea turtles ------------------------------------------------------------------
  var TURTLES = {
    // Green: smooth, juxtaposed scutes; short rounded beak; one pair of prefrontal scales.
    green_turtle: { CL: 1.0, b: 0.42, h: 0.17, taper: 0.06, serr: 0, imb: 0, HL: 0.19, FL: 0.47, pre: 1,
      head: [[1.0, 0.03, -0.12, 0.06], [0.95, 0.17, -0.2, 0.18], [0.85, 0.28, -0.24, 0.26], [0.65, 0.34, -0.26, 0.3], [0.4, 0.33, -0.26, 0.3], [0.1, 0.28, -0.24, 0.27], [-0.3, 0.22, -0.22, 0.24]],
      shell: [hex(0x5b5937), hex(0x9b985f), hex(0x353527), hex(0x9b9160)], skin: hex(0x5e5038), edge: hex(0xd2c08a), plastron: hex(0xe6d6a0), beak: hex(0x3e3828) },
    // Hawksbill: overlapping amber scutes with a serrated rear edge; narrow hooked beak; two pairs of prefrontals.
    hawksbill_turtle: { CL: 0.8, b: 0.36, h: 0.16, taper: 0.16, serr: 0.05, imb: 0.016, HL: 0.22, FL: 0.43, pre: 2,
      head: [[1.0, -0.02, -0.09, 0.025], [0.92, 0.09, -0.16, 0.07], [0.8, 0.2, -0.21, 0.14], [0.6, 0.3, -0.24, 0.21], [0.38, 0.32, -0.25, 0.24], [0.1, 0.28, -0.23, 0.24], [-0.3, 0.22, -0.21, 0.22]],
      shell: [hex(0xb8701e), hex(0xeaa848), hex(0x2c180a), hex(0x4a2a10)], skin: hex(0x4e3a28), edge: hex(0xd8a458), plastron: hex(0xeed49a), beak: hex(0xcdb488) }
  };
  var VERT = [[0.52, 0], [0.27, 0], [0.01, 0], [-0.26, 0], [-0.52, 0]], COST = [[0.33, 0.56], [0.08, 0.63], [-0.18, 0.61], [-0.42, 0.5]];
  // Scute map: out = [id, seam distance, local dx, local dz]; nx, nz normalised (-1..1), rho = radius / outline.
  function scuteAt(nx, nz, rho, phi, out) {
    if (rho > 0.8) {
      var seg = (phi + PI) / (TAU / 26), id = Math.floor(seg), f = seg - id;
      out[0] = 100 + id; out[1] = Math.min(Math.min(f, 1 - f) * 0.25, rho - 0.8); out[2] = f - 0.5; out[3] = rho - 0.9; return out;
    }
    var b1 = 81, b2 = 81, id2 = 0, cx = 0, cz = 0;
    for (var i = 0; i < 13; i++) {
      var c = i < 5 ? VERT[i] : COST[(i - 5) >> 1], sz = i < 5 ? 0 : ((i - 5) & 1 ? -1 : 1), dx = nx - c[0], dz = (nz - sz * c[1]) * 0.9, d = dx * dx + dz * dz;
      if (d < b1) { b2 = b1; b1 = d; id2 = i; cx = dx; cz = dz; } else if (d < b2) b2 = d;
    }
    out[0] = id2; out[1] = Math.min((Math.sqrt(b2) - Math.sqrt(b1)) * 0.5, 0.8 - rho); out[2] = cx; out[3] = cz; return out;
  }
  function turtleOutline(def, a, b) {
    // cs and sn may be passed in when the caller already has the direction.
    return function (phi, cs, sn) {
      if (cs === undefined) { cs = Math.cos(phi); sn = Math.sin(phi); }
      var r = 1 / Math.sqrt(cs * cs + sn * sn * (a * a) / (b * b)), back = cs < 0 ? -cs : 0;
      r *= 1 - def.taper * back * back * back;
      if (def.serr) { var tooth = 1 - Math.abs(fract((phi + PI) / (TAU / 26)) * 2 - 1); r *= 1 + def.serr * (tooth - 0.5) * smooth(0.3, 0.75, -cs); }
      return r * a;
    };
  }
  function makeTurtle(T, id, info, def, o) {
    return makeModel(T, id, info, o, function (c) {
      var kit = c.kit, high = c.high, rng = c.rng(61), k = 0.92 + 0.16 * rng(), CL = def.CL * k, a = CL / 2, b = CL * def.b, H = CL * def.h;
      var pose = kit.node('pose', c.root), holder = kit.node('holder', pose); holder.position.y = -0.04 * CL;
      var outline = turtleOutline(def, a, b), tier = high ? 'h' : 'l';
      var nr = high ? 13 : 5, ns = high ? 104 : 52, cara = new Geo(), sc = [0, 0, 0, 0], white = [1, 1, 1], i, j;
      function shellY(rho, phi, x, z) {
        var y = H * Math.pow(Math.max(0, 1 - Math.pow(rho, 2.2)), 0.6);
        // The vault is fullest over the shoulders and settles across the hips;
        // individual scutes add restrained relief to the continuous carapace.
        y *= 1 + 0.075 * x / a - 0.06 * z * z / (b * b);
        scuteAt(x / a, z / b, rho, phi, sc);
        y += CL * 0.0018 * smooth(0.004, 0.085, sc[1]) * (1 - smooth(0.83, 0.98, rho));
        if (def.imb && rho < 0.97) { scuteAt(x / a, z / b, rho, phi, sc); var ramp = sc[0] >= 100 ? clamp(0.5 - sc[3] * 4, 0, 1) : clamp(0.5 - sc[2] / 0.26, 0, 1); y += def.imb * CL * 0.35 * ramp * (1 - smooth(0.9, 0.97, rho)); }
        return y;
      }
      var xmax = 0, zmax = 0;
      for (j = 0; j < ns; j++) { var ph0 = j / ns * TAU, ro = outline(ph0); xmax = Math.max(xmax, Math.abs(Math.cos(ph0) * ro)); zmax = Math.max(zmax, Math.abs(Math.sin(ph0) * ro)); }
      cara.polar(nr, ns, function (r, phi, col) {
        var rho = Math.pow(r, 0.85), ro = outline(phi), x = Math.cos(phi) * ro * rho, z = Math.sin(phi) * ro * rho;
        setc(col, white); return [x, shellY(rho, phi, x, z), z, x / (2 * xmax) + 0.5, z / (2 * zmax) + 0.5];
      });
      // Skirt under the rim to the plastron edge.
      var rim = cara.count() - ns, skirt = cara.count(), pl = lin(def.plastron);
      for (j = 0; j < ns; j++) { var p = rim + j; cara.v(cara.p[p * 3] * 0.86, -0.085 * CL, cara.p[p * 3 + 2] * 0.86, white, cara.t[p * 2], cara.t[p * 2 + 1]); }
      for (j = 0; j < ns; j++) { var r0 = rim + j, r1 = rim + (j + 1) % ns, s0 = skirt + j, s1 = skirt + (j + 1) % ns; cara.i.push(r0, r1, s0, r1, s1, s0); }
      // Shell maps are painted on the unit-size shell (CL = def.CL), so they
      // are shared by every turtle of the species: pigment and relief together.
      var shell = def.shell, P = [0, 0, 0, 0], scuteTone = {}, a1 = def.CL / 2, b1 = def.CL * def.b, CL1 = def.CL, outline1 = turtleOutline(def, a1, b1), xm = 0, zm = 0;
      for (j = 0; j < ns; j++) { var q0 = j / ns * TAU, q1 = outline1(q0); xm = Math.max(xm, Math.abs(Math.cos(q0) * q1)); zm = Math.max(zm, Math.abs(Math.sin(q0) * q1)); }
      // 384 texels across a metre-long shell still out-resolve the dive and guide views.
      var shellMaps = bakedPair(kit, 'turtle|' + c.id + '|shell|' + tier, high ? 384 : 256, high ? 384 : 256, function (u, v, out, rel) {
        var x = (u - 0.5) * 2 * xm, z = (v - 0.5) * 2 * zm, len = Math.sqrt(x * x + z * z) || 1e-9, phi = Math.atan2(z, x), rho = len / outline1(phi, x / len, z / len), CL = CL1;
        scuteAt(x / a1, z / b1, rho, phi, P);
        var growth = Math.sqrt(P[2] * P[2] + P[3] * P[3]);
        // Low, rounded scutes catch the light without turning adjoining green
        // turtle plates into deep grooves. Only the hawksbill has a shallow
        // posterior overlap lip; the shell silhouette and pigment stay shared.
        var inset = smooth(0.002, 0.038, P[1]), crown = smooth(0.012, 0.15, P[1]);
        var grain = noise2(u * 56 + P[0] * 0.7, v * 56), growthWarp = noise2(P[2] * 19 + P[0], P[3] * 19);
        var rings = Math.cos(growth * 145 + growthWarp * 2.6) * (0.008 + 0.006 * grain);
        var overlap = def.imb && P[0] < 100 ? smooth(0.01, -0.08, P[2]) * smooth(0.002, 0.012, P[1]) * (1 - smooth(0.022, 0.06, P[1])) : 0;
        rel[0] = rel[1] = rel[2] = 0.29 + (def.imb ? 0.38 : 0.30) * inset + (def.imb ? 0.055 : 0.035) * crown + rings * inset + 0.018 * grain * inset + 0.075 * overlap;
        if (rho > 1.02) { setc(out, def.plastron); return; }
        var id2 = P[0], h1 = scuteTone[id2] !== undefined ? scuteTone[id2] : (scuteTone[id2] = hash2(id2 * 7 + 3, 11)), ang = Math.atan2(P[3], P[2] + 0.05);
        var streak = 0.65 * noise2(x / CL * 18 + id2 * 1.5, z / CL * 18) + 0.35 * noise2(ang * 6.2 + id2 * 5.3, rho * 14);
        mixc(shell[0], shell[1], smooth(0.5, 0.75, streak) * (def.imb ? 0.85 : 0.55), out);
        mixc(out, shell[2], smooth(0.5, 0.78, noise2(x / CL * 24 + id2 * 2.1, z / CL * 24 + id2 * 3.9)) * (def.imb ? 0.68 : 0.28), out);
        var rays = noise2(ang * 16 + id2 * 1.7, growth * 5);
        mixc(out, shell[1], smooth(0.57, 0.78, rays) * (def.imb ? 0.34 : 0.22), out);
        mulc(out, 0.96 + 0.04 * Math.cos(growth * 145 + noise2(ang * 8, id2) * 2));
        mulc(out, 0.9 + 0.2 * h1);
        if (def.imb) mixc(out, shell[2], smooth(0.025, 0.0, P[1]) * 0.45, out);
        mixc(out, shell[3], band(P[1] - 0.012, 0.004, 0.003) * 0.5, out);
        mixc(out, shell[2], 1 - smooth(0.002, 0.008, P[1]), out);
      }, false, [false, true]);
      var tex = shellMaps[0], shellRelief = shellMaps[1];
      var shellRoughness = kit.baked('turtle|' + c.id + '|roughness', high ? 128 : 64, high ? 128 : 64, function (u, v, out) {
        var x = (u - 0.5) * 2 * xm, z = (v - 0.5) * 2 * zm, phi = Math.atan2(z, x), rho = Math.sqrt(x * x + z * z) / outline1(phi);
        scuteAt(x / a1, z / b1, rho, phi, P);
        // Worn scute crowns have a soft sheen; boundaries scatter the light.
        // Cell-locked grain breaks up broad highlights rather than adding gloss.
        var edge = 1 - smooth(0.008, 0.065, P[1]), grain = noise2(P[2] * 32 + P[0] * 3.1, P[3] * 32);
        out[0] = out[1] = out[2] = 0.82 + 0.065 * noise2(u * 18, v * 18) + 0.035 * grain + 0.075 * edge;
      }, false, false, true);
      var shellMat = kit.std({ map: tex, bumpMap: shellRelief, bumpScale: CL * (def.imb ? 0.004 : 0.003), roughnessMap: shellRoughness, roughness: def.imb ? 0.57 : 0.64, metalness: 0 });
      kit.mesh(kit.geo(cara, 1), shellMat, 'carapace', holder);
      var plas = new Geo();
      plas.polar(high ? 6 : 2, ns / 2, function (r, phi, col) {
        var ro = outline(phi) * 0.86 * r, x = Math.cos(phi) * ro, z = Math.sin(phi) * ro;
        setc(col, white); return [x, -0.085 * CL - 0.01 * CL * (1 - r * r), z, x / CL + 0.5, z / CL + 0.5];
      }, true);
      var plastronTex = kit.baked('turtle|' + c.id + '|plastron', high ? 256 : 128, high ? 256 : 128, function (u, v, out) {
        var x = u - 0.5, z = v - 0.5, line = Math.abs(z + 0.003 * Math.sin(x * 37)), ends = [-0.31, -0.20, -0.065, 0.08, 0.22, 0.34];
        for (var p = 0; p < ends.length; p++) line = Math.min(line, Math.abs(x - ends[p] - Math.abs(z) * (p < 3 ? 0.15 : -0.16)));
        mixc(def.plastron, def.edge, 0.08 + 0.13 * noise2(u * 16, v * 16), out);
        mixc(out, def.skin, (1 - smooth(0.0015, 0.0055, line)) * 0.48, out);
        mulc(out, 0.96 + 0.04 * noise2(u * 65, v * 65));
      });
      // The neck, tail and eyes draw as one skin batch (the eyes keep their own
      // wet roughness); the four paddles as another, written each update.
      var skinRig = new Float32Array(80), skinMat = kit.std({ vertexColors: true, roughness: 0.5, side: T.DoubleSide }, { batch: skinRig }), skinParts = [];
      kit.mesh(kit.geo(plas, 1), kit.std({ map: plastronTex, bumpMap: kit.flat('bump'), roughnessMap: kit.flat('rough'), roughness: 0.62 }), 'plastron', holder);

      // Head on a neck pivot, painted with scales and the diagnostic prefrontals.
      var HL = def.HL * CL, head = new Geo(), hp = kit.node('head-pivot', holder);
      hp.position.set(a * 0.9, -0.01 * CL, 0);
      head.loft(def.head, high ? 16 : 8, high ? 20 : 10, function (t, ang, x, y, z, out) { setc(out, white); });
      var hx1 = def.head[def.head.length - 1][0], cc = [0, 0, 0, 0, 0];
      var headMaps = bakedPair(kit, 'turtle|' + c.id + '|head|' + tier, high ? 256 : 128, high ? 256 : 128, function (u, v, out, rel) {
        var hx = lerp(1, hx1, u), ang = -PI / 2 + v * TAU, up = Math.sin(ang), side = Math.cos(ang);
        cells(hx * 9, (v - 0.5) * 14, 5, cc);
        rel[0] = rel[1] = rel[2] = 0.3 + 0.55 * smooth(0.018, 0.1, cc[1] - cc[0]) + 0.025 * noise2(u * 120, v * 120);
        setc(out, def.skin); mixc(out, def.edge, 1 - smooth(0.03, 0.1, cc[1] - cc[0]), out);
        mixc(out, def.edge, 0.5 * smooth(-0.2, -0.7, up), out);
        // Prefrontal scales on top between the eyes: one pair (green) or two (hawksbill).
        if (up > 0.5 && hx > 0.58 && hx < 0.88) {
          var dv = Math.abs(v - 0.5), seam = Math.min(dv, Math.abs(hx - 0.58), Math.abs(hx - 0.88), Math.abs(up - 0.5) * 0.3);
          if (def.pre === 2) seam = Math.min(seam, Math.abs(hx - 0.73));
          mixc(def.skin, [0, 0, 0], 0.35, out); mixc(out, def.edge, 1 - smooth(0.012, 0.03, seam), out);
        }
        if (hx > 0.9) mixc(out, def.beak, smooth(0.9, 0.93, hx), out);
        // A curved jaw seam continues behind the beak on each cheek.
        var jaw = -0.24 + (hx - 0.55) * 0.22;
        mixc(out, hex(0x25261b), band(up - jaw, 0.028, 0.02) * smooth(0.46, 0.6, hx) * (1 - smooth(0.96, 1, hx)), out);
      }, true, [false, true]);
      scaleGeo(head, HL);
      var headMat = kit.std({ map: headMaps[0], bumpMap: headMaps[1], bumpScale: CL * 0.00065, roughnessMap: kit.flat('rough'), roughness: 0.51 });
      kit.mesh(kit.geo(head, 1), headMat, 'head', hp);
      var eyes = new Geo(), ez = (def.pre === 2 ? 0.17 : 0.24) * HL;
      [-1, 1].forEach(function (s) {
        blob(T, eyes, 0.7 * HL, 0.13 * HL, s * ez, 0.07 * HL, 0.06 * HL, 0.05 * HL, lin(hex(0xb8a070)), high ? 10 : 6, high ? 8 : 4);
        blob(T, eyes, 0.72 * HL, 0.135 * HL, s * (ez + 0.025 * HL), 0.045 * HL, 0.04 * HL, 0.03 * HL, lin(hex(0x0c0c0c)), high ? 10 : 6, high ? 8 : 4);
        blob(T, eyes, 0.73 * HL, 0.153 * HL, s * (ez + 0.051 * HL), 0.009 * HL, 0.009 * HL, 0.004 * HL, lin(hex(0xdce9d7)), high ? 6 : 4, high ? 4 : 3);
        blob(T, eyes, 0.95 * HL, 0.072 * HL, s * 0.044 * HL, 0.017 * HL, 0.008 * HL, 0.012 * HL, lin(hex(0x27271b)), high ? 6 : 4, high ? 4 : 3);
      });
      skinParts.push({ geo: eyes.build(T, 1), part: 'eyes', node: hp, rough: 0.2 });

      // Long flattened front paddles, with one claw for green turtles and two
      // for hawksbills. Scales follow the paddle instead of random blotches.
      var flipperMaps = bakedPair(kit, 'turtle|' + c.id + '|flipper|' + tier, high ? 256 : 128, high ? 128 : 64, function (u, v, out, rel) {
        var up = Math.sin(-PI / 2 + v * TAU);
        cells(u * 20, v * 16, 29, cc);
        mixc(def.skin, def.edge, 0.12 + 0.48 * smooth(0.05, -0.8, up), out);
        mulc(out, 0.8 + 0.24 * cc[2]);
        mixc(out, def.edge, (1 - smooth(0.015, 0.06, cc[1] - cc[0])) * 0.68, out);
        rel[0] = rel[2] = 0.32 + 0.55 * smooth(0.012, 0.07, cc[1] - cc[0]);
        // R remains the original scale relief. G shares this linear texture as
        // roughness, with softer scale margins and a restrained worn crown.
        var margin = 1 - smooth(0.015, 0.075, cc[1] - cc[0]);
        rel[1] = 0.77 + 0.09 * cc[2] + 0.035 * noise2(u * 80, v * 64) + 0.095 * margin;
      }, true, [false, true]);
      // Reuse the map only where relief is already uploaded. The lightweight
      // derivative-free path keeps its original shared flat-roughness texture.
      var flipperMat = kit.std({ map: flipperMaps[0], bumpMap: flipperMaps[1], bumpScale: CL * 0.00055, roughnessMap: kit.derivatives ? flipperMaps[1] : kit.flat('rough'), roughness: kit.derivatives ? 0.68 : 0.57 });
      function flipper(len, rear) {
        var g = new Geo();
        g.loft([[1, 0.008, -0.008, 0.05], [0.9, 0.022, -0.018, 0.12], [0.6, 0.036, -0.028, 0.16], [0.3, 0.05, -0.04, 0.15], [0.0, 0.06, -0.05, 0.1]], high ? 10 : 5, high ? 12 : 8,
          function (t, ang, x, y, z, out) { setc(out, white); });
        g.map(0, function (p) {
          var span = clamp(p[0], 0, 1);
          // Swept, slightly cupped paddles taper from the muscular shoulder to
          // a soft tip; the two sides are mirrored after this resting shape.
          p[2] += (rear ? 0.07 : 0.105) * span * span;
          p[1] -= 0.028 * span * span + 0.008 * Math.sin(PI * span);
        });
        if (!rear) g.spike([0.72, 0.02, 0.12], [0.3, 0.1, 0.95], 0.05, 0.012, lin(def.edge), lin(def.beak));
        if (!rear && def.pre === 2) g.spike([0.6, 0.022, 0.17], [0.2, 0.1, 0.97], 0.038, 0.01, lin(def.edge), lin(def.beak));
        scaleGeo(g, len);
        return g;
      }
      var fl = [], fGeo = flipper(def.FL * CL, false).build(T, 1), rGeo = flipper(def.FL * CL * 0.42, true).build(T, 1);
      function oppositeFlipper(geometry) {
        var mirrored = geometry.clone(); mirrored.scale(1, 1, -1);
        // Reflect the swept paddle in its own frame and restore winding;
        // rotating a single asymmetric paddle alone reverses one side's sweep.
        var idx = mirrored.index.array;
        for (var q = 0; q < idx.length; q += 3) { var swap = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = swap; }
        mirrored.computeVertexNormals(); return mirrored;
      }
      var fOpposite = oppositeFlipper(fGeo), rOpposite = oppositeFlipper(rGeo), flipperParts = [];
      [-1, 1].forEach(function (s) {
        var fp = kit.node('front-flipper-pivot', holder); fp.position.set(a * 0.5, -0.06 * CL, s * b * 0.72);
        var inner = kit.node('front-flipper', fp); inner.rotation.set(0, -s * (PI / 2 + 0.3), 0);
        var fg = s < 0 ? fOpposite : fGeo;
        fl.push({ node: fp, inner: inner, side: s, rear: false, geometry: fg, base: new Float32Array(fg.attributes.position.array), len: def.FL * CL });
        var rp = kit.node('rear-flipper-pivot', holder); rp.position.set(-a * 0.78, -0.04 * CL, s * b * 0.4);
        var rin = kit.node('rear-flipper', rp); rin.rotation.set(0, -s * (PI / 2 + 1.1), 0);
        var rg = s < 0 ? rOpposite : rGeo;
        fl.push({ node: rp, inner: rin, side: s, rear: true, geometry: rg, base: new Float32Array(rg.attributes.position.array), len: def.FL * CL * 0.42 });
      });
      // Each paddle's pose in the holder: its shoulder pivot, then its fixed sweep.
      fl.forEach(function (f) {
        f.node.updateMatrix(); f.inner.updateMatrix(); f.pose = new T.Matrix4().multiplyMatrices(f.node.matrix, f.inner.matrix);
        flipperParts.push({ geo: f.geometry, part: f.rear ? 'rear-flipper' : 'front-flipper', live: true, matrix: f.pose, frame: f.inner, boxMargin: [0, f.len * 0.12, f.len * 0.12] });
      });
      var flipperReach = fl.map(function (f) { return { center: f.node.position.clone(), reach: batchExtent(f.geometry), margin: f.len * 0.12 }; });
      var flippers = batchMesh(kit, flipperParts, flipperMat, null, 'flippers', holder), fpos = flippers.geometry.attributes.position.array;
      batchReach(flippers, flipperReach);
      fl.forEach(function (f, i) { f.first = flippers.table[i].first; f.geometry = null; });
      var tailNode = kit.node('tail', holder); tailNode.position.set(-a * 0.9, -0.03 * CL, 0);
      skinParts.push({ geo: (function () { var g = new Geo(); g.tube([[0, 0, 0], [-0.06 * CL, -0.01 * CL, 0], [-0.11 * CL, -0.025 * CL, 0]], function (t) { return 0.032 * CL * (1 - t) + 0.003; }, high ? 8 : 5, function () { return lin(def.skin); }); return g; })().build(T, 1), part: 'tail', node: tailNode });
      var neck = new Geo(); neck.tube([[a * 0.55, -0.02 * CL, 0], [a * 0.8, -0.015 * CL, 0], [a * 0.97, -0.012 * CL, 0]], 0.06 * CL, high ? 10 : 6, function () { return lin(def.skin); });
      skinParts.unshift({ geo: neck.build(T, 1), part: 'neck' });
      var skinReach = skinParts.filter(function (e) { return e.node; }).map(function (e) { return { center: e.node.position.clone(), reach: batchExtent(e.geo), margin: 0.01 * CL }; });
      var skin = batchMesh(kit, skinParts, skinMat, skinRig, 'neck', holder);
      batchReach(skin, skinReach);
      var w = TAU * 0.26, ph = rng() * TAU;
      function turtleStroke(p) {
        var u = fract(p / TAU), x;
        if (u < 0.29) { x = u / 0.29; return 0.44 - 0.96 * x * x * x * (10 + x * (-15 + 6 * x)); }
        if (u < 0.82) { x = (u - 0.29) / 0.53; return -0.52 + 0.96 * x * x * x * (10 + x * (-15 + 6 * x)); }
        return 0.44;
      }
      function turtleStrokeSlope(p) {
        var u = fract(p / TAU), x, rate;
        if (u < 0.29) { x = u / 0.29; rate = -0.96 / (0.29 * TAU); }
        else if (u < 0.82) { x = (u - 0.29) / 0.53; rate = 0.96 / (0.53 * TAU); }
        else return 0;
        return rate * 30 * x * x * (1 - x) * (1 - x);
      }
      c.anim(function (t, dt, motion) {
        var phase = t * w + ph + 0.065 * Math.sin(t * 0.31 + ph), s = turtleStroke(phase), q = Math.sin(phase - 0.5), turn = turning(motion);
        var power = 0.62 + 0.38 * Math.min(1.3, effort(motion, CL));
        for (var i = 0; i < fl.length; i++) {
          var f = fl[i], localPhase = phase + f.side * turn * 0.11, stroke = turtleStroke(localPhase), velocity = turtleStrokeSlope(localPhase);
          if (f.rear) f.node.rotation.set(-f.side * (0.045 * q + turn * f.side * 0.09), f.side * 0.07 * Math.sin(phase * 0.5) - turn * 0.07, 0);
          else f.node.rotation.set(-f.side * (stroke * power - 0.12), f.side * (0.10 * q + turn * f.side * 0.08), 0.10 * Math.sin(localPhase - 0.85));
          // The shoulder drives the stroke; the flattened outer paddle twists
          // and lags gently through the water while the root stays attached.
          // Each paddle is written straight into the batch, in the holder.
          f.node.updateMatrix();
          var base = f.base, e = f.pose.multiplyMatrices(f.node.matrix, f.inner.matrix).elements;
          for (var j = 0, o = f.first * 3; j < base.length; j += 3, o += 3) {
            var u = clamp(base[j] / f.len, 0, 1), flex = u * u;
            // Feather into recovery and cup under load. Bending follows the
            // shoulder's earlier position, so the paddle settles during glide.
            var twist = f.side * flex * (f.rear ? 0.055 * Math.sin(localPhase - 1.05) : 0.33 * velocity + 0.025 * Math.sin(localPhase - 0.8));
            var cs = Math.cos(twist), sn = Math.sin(twist);
            var bend = f.len * flex * (f.rear ? 0.028 * Math.sin(localPhase - u * 1.35 - 0.65) : 0.12 * (turtleStroke(localPhase - u * 0.68) - stroke) + 0.004 * Math.sin(localPhase - u * 1.1)) * power;
            var px = base[j], py = base[j + 1] * cs - base[j + 2] * sn + bend, pz = base[j + 1] * sn + base[j + 2] * cs;
            fpos[o] = e[0] * px + e[4] * py + e[8] * pz + e[12]; fpos[o + 1] = e[1] * px + e[5] * py + e[9] * pz + e[13]; fpos[o + 2] = e[2] * px + e[6] * py + e[10] * pz + e[14];
          }
        }
        flippers.geometry.attributes.position.needsUpdate = true;
        batchNormals(flippers.geometry, 0, flippers.geometry.attributes.position.count, 0, flippers.geometry.index.count); batchBox(flippers);
        var pitch = 0.014 * (s + 0.04) * power;
        hp.rotation.set(0.012 * Math.sin(t * 0.29 + ph), 0.028 * Math.sin(t * 0.4 + ph) + turn * 0.075, -pitch * 0.7 + 0.006 * Math.sin(t * 0.23 + ph));
        pose.position.y = 0.007 * CL * Math.sin(phase - 0.4);
        pose.rotation.z = pitch; pose.rotation.x = turn * 0.022;
        tailNode.rotation.y = 0.025 * Math.sin(phase - 1.3) - turn * 0.04;
        batchPose(skin);
      });
    });
  }

  // ---- Invertebrates --------------------------------------------------------------
  function buildAnemone(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(51), bleached = c.health === 'bleached', pastel = PASTELS[(c.seed >>> 0) % PASTELS.length];
    var cols = [[0xc81e3a, 0xf06a78], [0x8a2fb0, 0xc88ae6], [0x2f5fd0, 0x7aa8f2], [0xd84a1e, 0xf09050], [0xd02a8a, 0xf080c0]];
    var pal = cols[Math.floor(rng() * cols.length)], colA = hex(pal[0]), colB = hex(pal[1]);
    var tips = [[0xd8c890, 0xa8c050], [0xe4d4a8, 0xc8b070], [0xc8d088, 0x70b040]][Math.floor(rng() * 3)];
    var R = 0.22 * (0.92 + 0.16 * rng()), H = 0.14, geo = new Geo(), ns = high ? 32 : 16, nh = high ? 6 : 3, i, j, col = [0, 0, 0];
    var first = geo.count();
    for (i = 0; i <= nh; i++) for (j = 0; j < ns; j++) {
      var t = i / nh, a = j / ns * TAU, r = R * lerp(0.82, 1.04, smooth(0, 1, t)) * (1 + 0.04 * Math.sin(a * 5 + t * 3)) * (1 + 0.025 * noise2(j * 0.7, i * 1.3));
      mixc(colA, colB, 0.3 * t + 0.3 * noise2(j * 1.7, i * 2.1), col); if (noise2(j * 3.1, i * 3.3) > 0.7) mixc(col, colB, 0.6, col);
      geo.v(Math.cos(a) * r, H * t, Math.sin(a) * r, lin(col), 0, 0);
    }
    for (i = 0; i < nh; i++) for (j = 0; j < ns; j++) { var a0 = first + i * ns + j, a1 = first + i * ns + (j + 1) % ns; geo.i.push(a0, a0 + ns, a1, a1, a0 + ns, a1 + ns); }
    var disc = hex(tips[0]), mouth = hex(0xf0a060);
    // Its algae live in the oral disc and tentacles, so a bleached anemone goes
    // white on top, often with a pastel tint, while the column keeps its own colour.
    if (bleached) { disc = mixc(BLEACH, hex(pastel[0]), 0.6, [0, 0, 0]); mouth = mixc(BLEACH, mouth, 0.18, [0, 0, 0]); }
    geo.polar(high ? 6 : 3, ns, function (r, a, out) {
      mixc(mouth, disc, smooth(0.05, 0.2, r), out); setc(out, lin(out));
      var rr = R * 1.04 * r * (1 + 0.04 * Math.sin(a * 5));
      return [Math.cos(a) * rr, H + 0.02 * Math.sin(a * 6) * r * r - 0.008 * (1 - r), Math.sin(a) * rr];
    });
    var body = kit.mesh(kit.geo(geo, 1), kit.std({ vertexColors: true, roughness: 0.42, metalness: 0.02 }, { sheen: sheenOf(T, pal[1], 0xffffff, 0.15) }), 'column', c.root);
    // Tentacles: one finger geometry instanced over the oral disc.
    var tg = new Geo(), tip = lin(hex(tips[1])), base = lin(hex(tips[0])), segs = high ? 3 : 2, sides = high ? 6 : 5, pts = [];
    // Bleached fingers: a cool, see-through-looking white base and pastel tips.
    if (bleached) { tip = lin(hex(pastel[0])); base = lin(mixc(BLEACH, BLEACH_SH, 0.5, [0, 0, 0])); }
    for (i = 0; i <= segs; i++) { var tt = i / segs; pts.push([0.2 * Math.sin(tt * PI * 0.8), tt, 0.08 * tt * tt]); }
    // A small terminal ring rounds the blunt end instead of closing the whole
    // finger with one shallow polygon. Keep the original centreline stations,
    // pigment progression and final tip position; only the cap is softened.
    pts.push([pts[segs][0], 1.026, pts[segs][2]]);
    tg.tube(pts, function (t, ring) { var u = Math.min(ring / segs, 1); return ring > segs ? 0.038 : 0.1 * (0.82 + 0.15 * Math.sin(u * PI) - 0.22 * Math.pow(u, 5)); }, sides,
      function (t) { return mixc(base, tip, smooth(0.48, 1, Math.min(t * (segs + 1) / segs, 1)), [0, 0, 0]); });
    // The instanced finger has different length/radius scales. Keep its cap
    // short in this unit space so it remains a rounded tentacle, not a spike.
    var capIndex = tg.p.length - 3; tg.p[capIndex] = pts[segs][0]; tg.p[capIndex + 1] = 1.045; tg.p[capIndex + 2] = pts[segs][2];
    var n = high ? 140 : 64, tGeo = kit.geo(tg, 1), tMat = kit.std({ vertexColors: true, roughness: 0.48 }, { sheen: bleached ? sheenOf(T, pastel[0], pastel[1], 0.22) : sheenOf(T, tips[1], 0xb0ff80, 0.1) });
    var mesh = kit.tag(new T.InstancedMesh(tGeo, tMat, n), 'tentacles'); c.root.add(mesh);
    var slots = [], m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(), tc = new T.Color(), reach = 0;
    var tilt = new T.Quaternion(), q2 = new T.Quaternion(), flowTilt = new T.Quaternion(), zAxis = new T.Vector3(0, 0, 1), current = {};
    for (i = 0; i < n; i++) {
      // Up to about 7.5 cm long, packed so the oral disc barely shows between them.
      var f = (i + 0.5) / n, rr = R * (0.12 + 0.86 * Math.sqrt(f)), ang = i * 2.39996, len = 0.05 + 0.028 * rng(), lean = 0.18 + 0.85 * (rr / R);
      slots.push({ x: Math.cos(ang) * rr, z: Math.sin(ang) * rr, a: ang, len: len, lean: lean, ph: rng() * TAU, rad: (high ? 0.0095 : 0.011) + 0.0025 * rng() });
      tc.setRGB(0.88 + 0.2 * rng(), 0.9 + 0.15 * rng(), 0.9 + 0.1 * rng()); mesh.setColorAt(i, tc);
      reach = Math.max(reach, rr + len * Math.sin(lean));
    }
    function place(t, moving, motion) {
      currentAt(c.root, motion, t, 0, current);
      for (var i = 0; i < n; i++) {
        var sl = slots[i], sway = moving ? 0.055 * Math.sin(t * 1.05 + sl.ph) : 0;
        e.set(0, -sl.a, 0, 'YXZ'); q.setFromEuler(e);
        tilt.setFromAxisAngle(zAxis, -(sl.lean + sway)); q2.copy(q).multiply(tilt);
        // A common flow bends the whole tentacle field; tiny phase differences
        // keep individual tips supple while their attachment points stay put.
        if (moving) {
          var wave = current.pulse + 0.12 * Math.sin(t * 0.85 - sl.x * 7 - sl.z * 5);
          e.set(current.z * wave * 0.25, 0, -current.x * wave * 0.25); flowTilt.setFromEuler(e); q2.premultiply(flowTilt);
        }
        var yy = H + 0.02 * Math.sin(sl.a * 6) * Math.pow(Math.sqrt(sl.x * sl.x + sl.z * sl.z) / R, 2);
        p.set(sl.x, yy, sl.z); s.set(sl.rad * 10, sl.len, sl.rad * 10); m4.compose(p, q2, s); mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    place(0, false);
    c.anim(function (t, dt, motion) { place(t, true, motion); });
    tGeo.boundingSphere = new T.Sphere(new T.Vector3(0, H, 0), R + 0.12);
    // hostSlots: where a clownfish pair can hover over the tentacle mat (root space, metres).
    return { hostSlots: [[0.04, H + 0.12, 0.03], [-0.06, H + 0.1, -0.04]], count: n };
  }
  // Raised scale rows on the clam's rib crests: u along the shell, w toward the gape.
  function clamScale(u, w) {
    var crest = Math.cos(5 * TAU * u), f = fract(w * 17 + 0.3 * Math.sin(u * 31));
    return smooth(0.55, 0.9, crest) * smooth(0.04, 0.2, f) * (1 - smooth(0.42, 0.62, f)) * smooth(0.12, 0.3, w);
  }
  function buildClam(c) {
    // Tridacna maxima is commonly 20-30 cm long (a 0.3 m shell at k = 1).
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(53), k = (0.9 + 0.2 * rng()) * 0.667, L = 0.45 * k, W = 0.11 * k, H = 0.2 * k, gap = 0.035 * k;
    var nu = high ? 56 : 20, nw = high ? 14 : 6, folds = 5, A = 0.03 * k, shell = new Geo(), i, j, col = [0, 0, 0];
    var cream = hex(0xd8cfba), grey = hex(0x968c7a), pinky = hex(0xc8a8a0);
    function valve(u, w, side) {
      var x = (u - 0.5) * L, h = H * Math.pow(Math.sin(PI * u), 0.55) + 0.01, rib = A * Math.cos(folds * TAU * u) * (0.25 + 0.75 * w) * Math.sin(PI * u);
      return [x, h * Math.pow(w, 0.85), side * (W * Math.pow(Math.sin(PI * Math.min(1, w * 1.1)), 0.8) * (1 - 0.3 * w) * Math.pow(Math.sin(PI * u), 0.4) + gap * w + rib)];
    }
    [-1, 1].forEach(function (side) {
      var first = shell.count();
      for (i = 0; i <= nu; i++) for (j = 0; j <= nw; j++) {
        var u = i / nu, w = j / nw, p = valve(u, w, side);
        // Growth bands across the valve and darker troughs between the radial folds.
        mixc(cream, grey, 0.4 * band(fract(w * 7) - 0.5, 0.14, 0.1) + 0.25 * noise2(i * 0.9, j * 1.3) + 0.35 * smooth(0.3, -0.9, Math.cos(folds * TAU * u)) * w, col); mixc(col, pinky, 0.25 * smooth(0.8, 1, w), col);
        // Short, close-set scales catch light along each rib crest.
        mixc(col, cream, 0.5 * clamScale(u, w), col);
        shell.v(p[0], p[1], p[2], lin(col), u, w);
      }
      for (i = 0; i < nu; i++) for (j = 0; j < nw; j++) {
        var a0 = first + i * (nw + 1) + j, b0 = a0 + nw + 1;
        if (side > 0) shell.i.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); else shell.i.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0);
      }
      // Rows of short, close-set scales stand on each rib crest toward the gape
      // (the fluted clam's would be big and leaf-like).
      var rows = high ? 9 : 5, lip = lin(hex(0xe8e0d0)), root = lin(hex(0xbdb2a0));
      for (var rib = 1; rib <= 4; rib++) for (var sc = 0; sc < rows; sc++) {
        var uc = rib / 5, wc = 0.4 + 0.56 * sc / (rows - 1), q0 = valve(uc - 0.022, wc, side), q1 = valve(uc + 0.022, wc, side), q2 = valve(uc, wc + 0.05, side);
        var tip = [q2[0], q2[1], q2[2] + side * 0.016 * k], b = shell.count();
        shell.v(q0[0], q0[1], q0[2], root, uc, wc); shell.v(q1[0], q1[1], q1[2], root, uc, wc); shell.v(tip[0], tip[1], tip[2], lip, uc, wc);
        if (side > 0) shell.i.push(b, b + 1, b + 2); else shell.i.push(b, b + 2, b + 1);
      }
    });
    var shellRelief = kit.baked('clam|shell-scales', high ? 256 : 128, high ? 128 : 64, function (u, v, out) {
      var growth = Math.pow(0.5 + 0.5 * Math.sin(v * 180 + noise2(u * 20, v * 6) * 1.5), 5);
      out[0] = out[1] = out[2] = 0.4 + growth * 0.26 + noise2(u * 160, v * 120) * 0.1 + 0.3 * clamScale(u, v);
    }, false, false, true);
    kit.mesh(kit.geo(shell, 1), kit.std({ vertexColors: true, map: kit.flat('map'), bumpMap: shellRelief, bumpScale: 0.0035 * k, roughness: 0.72, side: T.DoubleSide }), 'shell', c.root);
    // Mantle spans the gape and folds over the scalloped rim. Extra samples
    // around the centre form a recessed inhalant opening with soft tissue lips;
    // its floor stays inside the valve instead of exposing the background.
    var mantle = new Geo(), mantleRows = high ? [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 0.435, 0.465, 0.5, 0.535, 0.565, 8 / 12, 9 / 12, 10 / 12, 11 / 12, 1] : [0, 0.2, 0.4, 0.465, 0.5, 0.535, 0.6, 0.8, 1];
    var nm = mantleRows.length - 1;
    for (i = 0; i <= nu; i++) for (j = 0; j <= nm; j++) {
      var u2 = i / nu, s = mantleRows[j], l = valve(u2, 1, -1), r = valve(u2, 1, 1), over = 0.018 * k * Math.cos(PI * s) * Math.pow(Math.sin(PI * u2), 0.3);
      var bulge = (0.028 + 0.004 * Math.sin(u2 * folds * TAU + s * PI)) * k * Math.sin(PI * s) * Math.pow(Math.sin(PI * u2), 0.6), drop = 0.012 * k * Math.pow(Math.abs(Math.cos(PI * s)), 3);
      var inlet = smooth(0.29, 0.36, u2) * smooth(0.79, 0.72, u2), inset = 1 - smooth(0.015, 0.065, Math.abs(s - 0.5));
      var lip = band(Math.abs(s - 0.5) - 0.068, 0.009, 0.018), shade = 1 - 0.64 * inlet * inset;
      mantle.v(lerp(l[0], r[0], s), lerp(l[1], r[1], s) + bulge - drop + inlet * k * (0.003 * lip - 0.022 * inset), lerp(l[2], r[2], s) - over * 1.6, [shade, shade, shade], u2, s);
    }
    for (i = 0; i < nu; i++) for (j = 0; j < nm; j++) { var m0 = i * (nm + 1) + j, m1 = m0 + nm + 1; mantle.i.push(m0, m0 + 1, m1, m0 + 1, m1 + 1, m1); }
    var pals = [[0x1f5fe0, 0x40c8f0, 0x0c2a80], [0x14a07a, 0x60f0c0, 0x0a5040], [0x6a3ab8, 0xf0c040, 0x2a1460], [0x2a8ad8, 0x9af060, 0x123a70]];
    var palIndex = Math.floor(rng() * pals.length), pal = pals[palIndex], m1c = hex(pal[0]), m2c = hex(pal[1]), m3c = hex(pal[2]), cc = [0, 0, 0, 0, 0];
    // Bleached: the algae that colour the mantle are gone, so it turns a pale
    // cream-white and its own pattern shows only faintly. The shell is unchanged.
    var bleached = c.health === 'bleached', pastel = PASTELS[(c.seed >>> 0) % PASTELS.length], pale = mixc(hex(0xe8e2d2), hex(pastel[0]), 0.3, [0, 0, 0]);
    var mtex = kit.baked('clam|mantle|' + palIndex + (bleached ? '|bleached' : ''), high ? 256 : 128, high ? 128 : 64, function (u, v, out) {
      var edge = Math.min(v, 1 - v);
      setc(out, m1c); mixc(out, m3c, 0.45 * noise2(u * 14, v * 6), out);
      cells(u * 26 + noise2(u * 12, v * 6) * 1.4, v * 7, 3, cc); mixc(out, m2c, (1 - smooth(0.18, 0.3, cc[0])) * 0.85, out);
      mixc(out, m2c, (1 - smooth(0.015, 0.055, cc[1] - cc[0])) * 0.28, out);
      mulc(out, 0.92 + 0.12 * noise2(u * 200, v * 90));
      mixc(out, m2c, band(edge - 0.1, 0.03, 0.02), out);
      cells(u * 40, edge * 20, 9, cc); mixc(out, hex(0xd8f8ff), (1 - smooth(0.1, 0.18, cc[0])) * smooth(0.12, 0.05, edge), out);
      // Fine pigment ripples follow the fleshy folds instead of a flat decal.
      var ripple = Math.sin(v * 68 + 3 * Math.sin(u * folds * TAU) + noise2(u * 22, v * 13) * 2);
      mixc(out, m2c, Math.pow(Math.max(0, ripple), 6) * 0.17, out);
      mixc(out, m3c, band(v - 0.5, 0.025, 0.015) * smooth(0.25, 0.32, u) * smooth(0.78, 0.7, u), out);
      // A ghost of the pattern survives as light and shade, not colour.
      if (bleached) { var lu = 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]; mixc(out, pale, 0.86, out); mulc(out, 0.7 + 0.52 * lu); }
    }, false, false);
    var mantleRelief = kit.baked('clam|mantle-relief', high ? 128 : 64, high ? 64 : 32, function (u, v, out) {
      var h = 0.46 + 0.10 * Math.sin(v * 68 + 3 * Math.sin(u * folds * TAU)) + 0.08 * noise2(u * 90, v * 45);
      out[0] = out[1] = out[2] = h;
    }, false, false, true);
    var mantleGeo = kit.geo(mantle, 1), mantleMesh = kit.mesh(mantleGeo, kit.std({ vertexColors: true, map: mtex, bumpMap: mantleRelief, bumpScale: 0.00045 * k, roughness: 0.4, metalness: 0, side: T.DoubleSide }, { sheen: bleached ? sheenOf(T, pastel[0], pastel[1], 0.2) : sheenOf(T, pal[1], 0x9ae8ff, 0.22) }), 'mantle', c.root);
    // Exhalant siphon: a short raised collar in the mantle near one end.
    var siphon = new Geo(), sx = -0.32 * L, sy = valve(0.18, 1, 1)[1] + 0.024 * k * Math.pow(Math.sin(PI * 0.18), 0.6) - 0.012 * k;
    var sn = high ? 10 : 5, sipProfile = [[0, 0.012], [0.012, 0.014], [0.016, 0.011], [0.006, 0.0075]];
    for (i = 0; i < sipProfile.length; i++) for (j = 0; j < sn; j++) {
      var sa = j / sn * TAU, sc = i === 3 ? setc([0, 0, 0], m3c) : mixc(m3c, m2c, 0.25 + i * 0.15, [0, 0, 0]);
      if (bleached) mixc(sc, pale, i === 3 ? 0.6 : 0.8, sc);
      sc = lin(sc);
      siphon.v(Math.cos(sa) * sipProfile[i][1] * k, sipProfile[i][0] * k, Math.sin(sa) * sipProfile[i][1] * k, sc, j / sn, i / 3);
      if (i) { var si = (i - 1) * sn + j, sj = (i - 1) * sn + (j + 1) % sn; siphon.i.push(si, si + sn, sj, sj, si + sn, sj + sn); }
    }
    var sip = kit.mesh(kit.geo(siphon, 1), kit.std({ vertexColors: true, roughness: 0.35 }), 'siphon', c.root);
    sip.position.set(sx, sy, 0);
    var ph = rng() * TAU, current = {};
    // Attachment points remain seated on the shell; only the soft mantle
    // flexes, with a faint travelling ripple across its overhanging edges.
    mantleGeo.computeBoundingSphere(); mantleGeo.boundingSphere.radius += 0.005 * k;
    deform(c, mantleGeo, function (base, out, t, motion) {
      currentAt(c.root, motion, t, ph, current);
      for (var q = 0; q < base.length; q += 3) {
        var uv = q / 3 * 2, u = mantleGeo.attributes.uv.array[uv], v = mantleGeo.attributes.uv.array[uv + 1], ends = Math.pow(Math.sin(PI * u), 2), across = Math.sin(PI * v);
        var breath = 0.0025 * k * Math.sin(t * 0.7 + ph) * ends * across;
        var flutter = 0.0016 * k * Math.sin(t * 0.85 - u * 8 + ph) * ends * Math.pow(Math.abs(Math.cos(PI * v)), 3) * current.pulse;
        out[q + 1] = base[q + 1] + breath + flutter * Math.hypot(current.x, current.z);
        out[q + 2] = base[q + 2] + flutter * current.z * 0.55;
      }
      sip.position.y = sy + 0.0025 * k * Math.sin(t * 0.7 + ph) * Math.pow(Math.sin(PI * 0.18), 2);
      sip.scale.set(1 + 0.045 * Math.sin(t * 1.05 + ph), 1, 1 + 0.045 * Math.sin(t * 1.05 + ph));
    }, true);
  }
  // Sea stars share a builder: a domed disc plus tapering arms, spines optional.
  function buildStar(c, cfg) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(cfg.salt), k = 0.9 + 0.2 * rng(), geo = new Geo(), n = cfg.arms(rng), R = cfg.R * k, rd = cfg.disc * k;
    var body = hex(cfg.colors[0]), alt = hex(cfg.colors[1]), dark = hex(cfg.colors[2]), col = [0, 0, 0], i, j;
    geo.polar(high ? 8 : 4, high ? 48 : 20, function (r, a, out) {
      mixc(body, alt, 0.5 * noise2(Math.cos(a) * r * 9 + 4, Math.sin(a) * r * 9), out); setc(out, lin(out));
      return [Math.cos(a) * rd * r, cfg.thick * k * (1.1 - 0.6 * r * r), Math.sin(a) * rd * r];
    });
    var segs = high ? 10 : 4, sides = high ? 8 : 5, armCaps = [];
    for (i = 0; i < n; i++) {
      var a = i / n * TAU + 0.3, pts = [];
      // Arms start at the centre so their open start rings stay buried under the disc.
      for (j = 0; j <= segs; j++) { var t = j / segs, r = lerp(rd * 0.08, R, t); pts.push([Math.cos(a) * r, cfg.thick * k * (0.75 - 0.35 * t) + cfg.curl * k * t * t, Math.sin(a) * r]); }
      var armFirst = geo.tube(pts, function (t) { return cfg.armR * k * (1 - cfg.taper * t); }, sides, function (t, s) { mixc(body, alt, 0.45 * noise2(t * 9 + i * 3, s * 5), col); if (cfg.dots && noise2(t * 30 + i, s * 12) > 0.72) mixc(col, dark, 0.6, col); return lin(col); });
      if (c.id === 'blue_sea_star') armCaps.push({ last: armFirst + segs * sides, tip: armFirst + (segs + 1) * sides, index: geo.i.length - sides * 3, centre: pts[segs] });
    }
    // Linckia has blunt, rounded arm ends. Add a shoulder inside the existing
    // terminal envelope, leaving every original shaft station and apex intact.
    // Append after all arms so their original positions and pigment samples keep
    // their indices; the shared crown-of-thorns builder takes no new geometry.
    for (i = 0; i < armCaps.length; i++) {
      var cap = armCaps[i], ring = geo.count(), tip = cap.tip * 3, centre = cap.centre;
      for (j = 0; j < sides; j++) {
        var last = (cap.last + j) * 3;
        geo.v(centre[0] + (geo.p[tip] - centre[0]) * 0.25 + (geo.p[last] - centre[0]) * 0.85,
          centre[1] + (geo.p[tip + 1] - centre[1]) * 0.25 + (geo.p[last + 1] - centre[1]) * 0.85,
          centre[2] + (geo.p[tip + 2] - centre[2]) * 0.25 + (geo.p[last + 2] - centre[2]) * 0.85,
          [lerp(geo.c[last], geo.c[tip], 0.25), lerp(geo.c[last + 1], geo.c[tip + 1], 0.25), lerp(geo.c[last + 2], geo.c[tip + 2], 0.25)], 0, 0);
      }
      for (j = 0; j < sides; j++) {
        var next = (j + 1) % sides, ci = cap.index + j * 3;
        geo.i[ci] = ring + j; geo.i[ci + 1] = ring + next;
        geo.i.push(cap.last + j, cap.last + next, ring + next, cap.last + j, ring + next, ring + j);
      }
    }
    if (cfg.spines) {
      var sb = lin(hex(cfg.spines[0])), st = lin(hex(cfg.spines[1])), per = high ? cfg.spinesPerArm[1] : cfg.spinesPerArm[0];
      for (i = 0; i < n; i++) {
        var a2 = i / n * TAU + 0.3;
        for (j = 0; j < per; j++) {
          var t2 = (j + 0.5) / per, r2 = lerp(rd * 0.7, R * 0.95, t2), side = (j % 3) - 1, ao = a2 + side * 0.18 * (1 - t2 * 0.5);
          var y2 = cfg.thick * k * (0.75 - 0.35 * t2) + cfg.curl * k * t2 * t2 + cfg.armR * k * 0.5, d = [Math.cos(ao) * 0.45 * side + Math.cos(a2) * 0.25, 0.85, Math.sin(ao) * 0.45 * side + Math.sin(a2) * 0.25], dl = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
          geo.spike([Math.cos(ao) * r2, y2, Math.sin(ao) * r2], [d[0] / dl, d[1] / dl, d[2] / dl], cfg.spineLen * k * (0.8 + 0.4 * rng()), (cfg.spineR || 0.003) * k, sb, st);
        }
      }
      for (j = 0; j < (high ? 60 : 18); j++) {
        var f = (j + 0.5) / (high ? 60 : 18), rr = rd * 0.85 * Math.sqrt(f), aa = j * 2.39996, dd = [Math.cos(aa) * rr / rd * 0.5, 1, Math.sin(aa) * rr / rd * 0.5], dl2 = Math.sqrt(dd[0] * dd[0] + 1 + dd[2] * dd[2]);
        geo.spike([Math.cos(aa) * rr, cfg.thick * k * (1.1 - 0.6 * f), Math.sin(aa) * rr], [dd[0] / dl2, dd[1] / dl2, dd[2] / dl2], cfg.spineLen * k, (cfg.spineR || 0.003) * k, sb, st);
      }
    }
    var g = kit.geo(geo, 1);
    kit.mesh(g, kit.std({ vertexColors: true, roughness: cfg.rough }), 'body', c.root);
    var ph = rng() * TAU;
    deform(c, g, function (base, out, t) {
      for (var q = 0; q < base.length; q += 3) {
        var x = base[q], z = base[q + 2], r = Math.sqrt(x * x + z * z) / R, a = Math.atan2(z, x);
        out[q] = x; out[q + 2] = z; out[q + 1] = base[q + 1] + cfg.lift * k * r * r * (0.5 + 0.5 * Math.sin(t * 0.35 + a * 2 + ph));
      }
    }, true);
  }
  function buildUrchin(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(57), k = 0.9 + 0.2 * rng(), R = 0.042 * k, cy = 0.028 * k, test = new Geo();
    var black = lin(hex(0x101114)), white = lin(hex(0xf0f0f0)), orange = lin(hex(0xf07020));
    test.absorb(T, new T.SphereGeometry(1, high ? 20 : 10, high ? 14 : 7), new T.Matrix4().makeScale(R, R * 0.68, R).setPosition(0, cy, 0), black);
    for (var i = 0; i < 5; i++) { var a = i / 5 * TAU + 0.3; blob(T, test, Math.cos(a) * R * 0.44, cy + R * 0.6, Math.sin(a) * R * 0.44, R * 0.11, R * 0.06, R * 0.11, white, 6, 4); }
    test.absorb(T, new T.TorusGeometry(R * 0.2, R * 0.06, 5, high ? 16 : 8), new T.Matrix4().makeRotationX(PI / 2).setPosition(0, cy + R * 0.66, 0), orange);
    kit.mesh(kit.geo(test, 1), kit.std({ vertexColors: true, roughness: 0.25 }, { sheen: sheenOf(T, 0x2040ff, 0x40c0ff, 0.6) }), 'test', c.root);
    var sp2 = new Geo(), n = high ? 240 : 90, tipc = lin(hex(0x2a2a30)), spineMotion = [];
    for (i = 0; i < n; i++) {
      var f = (i + 0.5) / n, yy = 1 - f * 1.75, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), aa = i * 2.39996;
      // The anal cone and its orange ring stay visible among the spines.
      if (yy < -0.55 || yy > 0.86) continue;
      var d = [Math.cos(aa) * rr, yy * 0.9 + 0.25, Math.sin(aa) * rr], dl = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      d = [d[0] / dl, d[1] / dl, d[2] / dl];
      var len = (0.1 + 0.08 * smooth(-0.3, 0.9, yy) + 0.03 * rng()) * k;
      var bx = d[0] * R * 0.9, by = cy + d[1] * R * 0.6, bz = d[2] * R * 0.9;
      sp2.spike([bx, by, bz], d, len, 0.0026 * k, black, tipc);
      spineMotion.push(bx, by, bz, aa, 0.42 + 0.17 * f, 0.31 + 0.13 * (1 - f));
    }
    var g = kit.geo(sp2, 1);
    kit.mesh(g, kit.std({ vertexColors: true, roughness: 0.3 }), 'spines', c.root);
    // Each rigid spine turns about its attachment to the test. A quiet shared
    // drift sits under independent, slower probing; the skin never stretches.
    var spineRig = new Float32Array(spineMotion), base = new Float32Array(g.attributes.position.array), normal = new Float32Array(g.attributes.normal.array);
    g.boundingBox.expandByScalar(0.023 * k); g.boundingSphere.radius += 0.023 * k;
    c.anim(function (t) {
      var out = g.attributes.position.array, norm = g.attributes.normal.array, drift = 0.018 * Math.sin(t * 0.23);
      for (var s = 0, q = 0; s < spineRig.length; s += 6) {
        var ax = 0.04 * Math.sin(t * spineRig[s + 4] + spineRig[s + 3]) + drift;
        var az = 0.035 * Math.sin(t * spineRig[s + 5] + spineRig[s + 3] * 1.37);
        var sx = Math.sin(ax), cx = Math.cos(ax), sz = Math.sin(az), cz = Math.cos(az);
        for (var v = 0; v < 4; v++, q += 3) {
          var x = base[q] - spineRig[s], y = base[q + 1] - spineRig[s + 1], z = base[q + 2] - spineRig[s + 2], ry = cx * y - sx * z;
          out[q] = spineRig[s] + cz * x - sz * ry; out[q + 1] = spineRig[s + 1] + sz * x + cz * ry; out[q + 2] = spineRig[s + 2] + sx * y + cx * z;
          x = normal[q]; y = normal[q + 1]; z = normal[q + 2]; ry = cx * y - sx * z;
          norm[q] = cz * x - sz * ry; norm[q + 1] = sz * x + cz * ry; norm[q + 2] = sx * y + cx * z;
        }
      }
      g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    });
  }
  function buildNudibranch(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(59), L = 0.05 * (0.9 + 0.2 * rng()), g = new Geo(), white = [1, 1, 1];
    g.loft([[0.5, 0.05, -0.05, 0.1], [0.42, 0.11, -0.07, 0.19], [0.25, 0.14, -0.08, 0.24], [0.0, 0.145, -0.08, 0.25], [-0.25, 0.13, -0.08, 0.23], [-0.42, 0.085, -0.06, 0.16], [-0.5, 0.03, -0.04, 0.07]], high ? 20 : 10, high ? 24 : 12, function () { setc(arguments[5], white); }, 3);
    // Anna's chromodoris (seaslug.world): blue mantle with black lengthwise lines
    // and tiny dark specks, a white band and an orange-yellow border.
    var blue = hex(0x3d7cf0), pale = hex(0x7fb0ff), ink = hex(0x101420), speck = hex(0x26324a), wht = hex(0xf4f6ff), orng = hex(0xffb21a), foot = hex(0xd6def4);
    var cc = [0, 0, 0, 0, 0];
    var tex = kit.baked('nudibranch|annae', high ? 256 : 128, high ? 128 : 64, function (u, v, out) {
      var ang = -PI / 2 + v * TAU, up = Math.sin(ang);
      if (up < -0.1) { setc(out, foot); return; }
      mixc(blue, pale, 0.35 * smooth(0.75, 1, up) + 0.15 * noise2(u * 20, v * 30), out);
      // Tiny dark specks scattered over the blue (the key clue).
      cells(u * 70, v * 42, 19, cc);
      if (up > 0.34 && cc[2] > 0.45) mixc(out, speck, 0.85 * (1 - smooth(0.16, 0.24, cc[0])), out);
      mixc(out, ink, band(up - 0.6, 0.045, 0.03), out);
      mixc(out, wht, smooth(0.36, 0.3, up), out);
      mixc(out, orng, smooth(0.17, 0.1, up), out);
    }, false, true);
    // The narrow fleshy mantle margin has shallow, irregular folds rather than
    // a rigid straight rim. Keep the head, tail, back and sole exactly in place;
    // UVs carry the same identifying bands over the gently folded tissue.
    var mantlePhase = hash2(c.seed, 59) * 11;
    for (var mv = 0; mv < g.count(); mv++) {
      var mu = g.t[mv * 2], ma = -PI / 2 + g.t[mv * 2 + 1] * TAU, mup = Math.sin(ma), side = Math.cos(ma);
      var margin = smooth(-0.08, 0.08, mup) * (1 - smooth(0.32, 0.58, mup));
      var ends = smooth(0.06, 0.22, mu) * (1 - smooth(0.78, 0.94, mu));
      var fold = 1.3 * (noise2(mu * 4.7 + mantlePhase, side * 0.8 + 4.1) - 0.5) + 0.7 * (noise2(mu * 9.3 - mantlePhase, side * 1.3 + 7.4) - 0.5);
      g.p[mv * 3 + 1] += 0.008 * margin * ends * fold;
    }
    scaleGeo(g, L); g.map(0, function (p) { p[1] += 0.004 * L / 0.05; });
    kit.mesh(kit.geo(g, 1), kit.std({ map: tex, bumpMap: kit.flat('bump'), roughnessMap: kit.flat('rough'), roughness: 0.35 }, { sheen: sheenOf(T, 0x6090ff, 0xffffff, 0.2) }), 'body', c.root);
    var org = lin(orng), wh = lin(wht), rh = new Geo(), gills = new Geo();
    [-1, 1].forEach(function (s) {
      // The sensory clubs have stacked lamellae around a narrow stalk, with a
      // smooth tip. Build the collars into the existing batched crown.
      rh.tube(lineTo([0.36 * L, 0.12 * L, s * 0.08 * L], [0.4 * L, 0.36 * L, s * 0.11 * L], high ? 5 : 3, 0), function (t) { return 0.021 * L * (0.7 + 0.5 * Math.sin(PI * t)); }, high ? 6 : 4, function (t) { return mixc(org, wh, 0.15 * smooth(0.82, 1, t), [0, 0, 0]); });
      var collars = high ? 10 : 6, sides = high ? 8 : 5;
      for (var r = 0; r < collars; r++) {
        var u = 0.27 + r / collars * 0.62, radius = L * (0.023 + 0.014 * Math.sin(PI * u));
        var centre = [L * (0.36 + u * 0.04), L * (0.12 + u * 0.24), s * L * (0.08 + u * 0.03)], first = rh.count();
        for (var j = 0; j < sides; j++) {
          var a = j / sides * TAU, ca = Math.cos(a), sa = Math.sin(a);
          rh.v(centre[0] + radius * ca, centre[1] - radius * (ca * 0.04 + sa * s * 0.03) / 0.24, centre[2] + radius * sa, mixc(org, wh, 0.16 + 0.06 * u, [0, 0, 0]), u, j / sides);
          rh.v(centre[0] + radius * 0.62 * ca, centre[1] + 0.005 * L - radius * 0.62 * (ca * 0.04 + sa * s * 0.03) / 0.24, centre[2] + radius * 0.62 * sa, org, u, j / sides);
        }
        for (j = 0; j < sides; j++) { var a0 = first + j * 2, a1 = first + ((j + 1) % sides) * 2; rh.i.push(a0, a0 + 1, a1, a1, a0 + 1, a1 + 1); }
      }
    });
    var gn = high ? 9 : 6;
    for (var i = 0; i < gn; i++) {
      var a = i / gn * TAU;
      var gx = Math.cos(a), gz = Math.sin(a);
      gills.tube(lineTo([0, 0, 0], [gx * 0.1 * L, 0.18 * L, gz * 0.1 * L], high ? 4 : 2, 0.02 * L), function (t) { return 0.013 * L * (1 - 0.7 * t); }, high ? 5 : 3, function (t) { return mixc(org, wh, 0.2 * smooth(0.6, 1, t), [0, 0, 0]); });
      var feathers = high ? 5 : 3;
      for (var f = 0; f < feathers; f++) {
        var u = 0.22 + f / feathers * 0.63, length = L * (0.045 * (1 - u) + 0.01), y = 0.18 * L * u + 0.02 * L * Math.sin(PI * u);
        [-1, 1].forEach(function (s) {
          gills.tube([[gx * 0.1 * L * u, y, gz * 0.1 * L * u], [gx * 0.1 * L * u - gz * length * s, y + length * 0.38, gz * 0.1 * L * u + gx * length * s]], function (t) { return L * 0.0045 * (1 - t * 0.76); }, 3, function (t) { return mixc(org, wh, 0.12 + 0.18 * t, [0, 0, 0]); });
        });
      }
    }
    // The rhinophores and the gill crown draw as one batch, each on its pivot.
    var rig = new Float32Array(80), mat = kit.std({ vertexColors: true, roughness: 0.4 }, { batch: rig });
    var rp = kit.node('rhinophores', c.root), gp = kit.node('gills-pivot', c.root); gp.position.set(-0.3 * L, 0.13 * L, 0);
    var rhg = rh.build(T, 1), gg = gills.build(T, 1), reach = [{ center: rp.position.clone(), reach: batchExtent(rhg), margin: 0.01 * L }, { center: gp.position.clone(), reach: batchExtent(gg) * 1.08, margin: 0.01 * L }];
    var crown = batchMesh(kit, [{ geo: rhg, part: 'rhinophores', node: rp }, { geo: gg, part: 'gills', node: gp }], mat, rig, 'gills', c.root);
    batchReach(crown, reach);
    var ph = rng() * TAU;
    c.anim(function (t) { gp.rotation.set(0.12 * Math.sin(t * 1.1 + ph), 0.2 * Math.sin(t * 0.5), 0.1 * Math.cos(t * 0.9)); var s = 1 + 0.08 * Math.sin(t * 1.7); gp.scale.set(s, s, s); rp.rotation.z = 0.05 * Math.sin(t * 0.8 + ph); batchPose(crown); });
  }
  function buildShrimp(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(63), L = 0.05 * (0.9 + 0.2 * rng()), g = new Geo(), white = [1, 1, 1], lift = 0.28;
    g.loft([[0.5, 0.0, -0.02, 0.01], [0.42, 0.05, -0.05, 0.05], [0.3, 0.09, -0.07, 0.085], [0.12, 0.1, -0.08, 0.09], [-0.05, 0.085, -0.07, 0.075], [-0.22, 0.065, -0.055, 0.058], [-0.38, 0.045, -0.04, 0.042], [-0.46, 0.035, -0.03, 0.03]], high ? 18 : 9, high ? 16 : 10, function () { setc(arguments[5], white); });
    g.map(0, function (p) { p[1] += -0.16 * Math.pow(smooth(-0.05, -0.5, p[0]), 1.5) + lift; });
    var red = hex(0xd8201e), wht = hex(0xf6f6f2), yel = hex(0xf2a836), pale = hex(0xf0d8c0);
    var tex = kit.baked('shrimp|body', high ? 128 : 64, high ? 64 : 32, function (u, v, out) {
      var ang = -PI / 2 + v * TAU, up = Math.sin(ang), side = Math.abs(Math.cos(ang));
      mixc(yel, pale, smooth(-0.2, -0.7, up), out);
      mixc(out, red, smooth(0.15, 0.35, up), out);
      mixc(out, wht, smooth(0.9, 0.95, up), out);
      mixc(out, wht, 0.5 * band(fract(u * 6) - 0.5, 0.04, 0.03) * smooth(0.3, 0.6, up) * (1 - smooth(0.9, 0.95, up)), out);
    }, false, true);
    scaleGeo(g, L);
    kit.mesh(kit.geo(g, 1), kit.std({ map: tex, bumpMap: kit.flat('bump'), roughnessMap: kit.flat('rough'), roughness: 0.3, metalness: 0.02 }), 'body', c.root);
    var leg = new Geo(), rl = lin(red), wl = lin(wht), i;
    for (i = 0; i < 5; i++) {
      var x = (0.26 - i * 0.085) * L;
      [-1, 1].forEach(function (s) { leg.tube([[x, lift * L - 0.04 * L, s * 0.05 * L], [x + 0.02 * L, lift * L * 0.5, s * 0.17 * L], [x + 0.03 * L, 0.0, s * 0.22 * L]], 0.006 * L, 3, function (t) { return t > 0.5 ? wl : rl; }); });
    }
    // Paired stalked compound eyes sit beside the rostrum. Their dark rounded
    // surfaces catch the existing light; the supports share the amber shell.
    var stalk = lin(yel), eye = lin(hex(0x111b1d));
    [-1, 1].forEach(function (s) {
      leg.tube([[0.36 * L, (lift + 0.04) * L, s * 0.052 * L], [0.43 * L, (lift + 0.08) * L, s * 0.092 * L]], function (t) { return L * (0.014 - 0.003 * t); }, high ? 6 : 4, function () { return stalk; });
      blob(T, leg, 0.43 * L, (lift + 0.08) * L, s * 0.092 * L, 0.024 * L, 0.022 * L, 0.024 * L, eye, high ? 10 : 8, high ? 6 : 5);
    });
    var tail = new Geo();
    for (i = 0; i < 5; i++) {
      var a = (i - 2) * 0.32;
      tail.membrane([[-0.44 * L, lift * L - 0.12 * L, 0], [-0.44 * L, lift * L - 0.13 * L, 0]], [[-0.44 * L - Math.cos(a) * 0.14 * L, lift * L - 0.17 * L, Math.sin(a) * 0.14 * L], [-0.44 * L - Math.cos(a + 0.2) * 0.14 * L, lift * L - 0.17 * L, Math.sin(a + 0.2) * 0.14 * L]], 2, function (u, v, out) { setc(out, v > 0.6 && v < 0.85 ? wht : red); });
    }
    // The legs, tail fan and antennae draw as one batch; the antennae keep their pivot.
    var rig = new Float32Array(80), mat = kit.std({ vertexColors: true, roughness: 0.4, side: T.DoubleSide }, { batch: rig }), limbs = [{ geo: leg.build(T, 1), part: 'legs' }, { geo: tail.build(T, 1), part: 'tail-fan' }];
    var ant = new Geo(), sides = 3, shafts = [];
    [[0.0, 2.2, 0.06], [0.25, 2.0, -0.05], [-0.2, 1.3, 0.1]].forEach(function (cfg) {
      [-1, 1].forEach(function (s) {
        var pts = [], n = high ? 10 : 5;
        for (var j = 0; j <= n; j++) { var t = j / n, ang = cfg[0] * s + 0.25 * s * t; pts.push([Math.cos(ang) * t * cfg[1] * L * 0.5 + t * t * -0.3 * L, (cfg[2] + 0.4 * t - 0.6 * t * t) * L * 0.5, Math.sin(ang) * t * cfg[1] * L * 0.5]); }
        shafts.push({ first: ant.count(), pts: pts });
        ant.tube(pts, function (t) { return 0.0016 * (1 - 0.6 * t); }, sides, function () { return wl; });
      });
    });
    var ap = kit.node('antennae-pivot', c.root); ap.position.set(0.46 * L, lift * L + 0.02 * L, 0);
    var antGeo = ant.build(T, 1), originalAnt = antGeo.attributes.position.array.slice(), originalNormals = antGeo.attributes.normal.array.slice();
    // Keep a few original envelope samples, never indexed or rendered, so
    // narrowing the filaments cannot move scene placement or culling bounds.
    // The merged sphere uses Float32 root-space positions, while placement's
    // radius measures the antenna's own frame through its pivot.
    var mergedBox = new T.Box3(), point = new T.Vector3(), offset = ap.position;
    limbs.forEach(function (part) {
      var pos = part.geo.attributes.position;
      for (var v = 0; v < pos.count; v++) mergedBox.expandByPoint(point.fromBufferAttribute(pos, v));
    });
    for (var v = 0; v < originalAnt.length; v += 3) {
      point.set(Math.fround(originalAnt[v] + offset.x), Math.fround(originalAnt[v + 1] + offset.y), Math.fround(originalAnt[v + 2] + offset.z)); mergedBox.expandByPoint(point);
    }
    var mergedCenter = mergedBox.getCenter(new T.Vector3()), best = [], chosen = [], anchors = [];
    for (v = 0; v < originalAnt.length; v += 3) {
      var x = originalAnt[v], y = originalAnt[v + 1], z = originalAnt[v + 2], rx = x + offset.x, ry = y + offset.y, rz = z + offset.z;
      var fx = Math.fround(rx), fy = Math.fround(ry), fz = Math.fround(rz), dx = fx - mergedCenter.x, dy = fy - mergedCenter.y, dz = fz - mergedCenter.z;
      var scores = [x, -x, y, -y, z, -z, x * x + y * y + z * z, rx * rx + ry * ry + rz * rz, fx * fx + fy * fy + fz * fz, dx * dx + dy * dy + dz * dz];
      for (var k = 0; k < scores.length; k++) if (best[k] === undefined || scores[k] > best[k]) { best[k] = scores[k]; chosen[k] = v / 3; }
    }
    chosen.forEach(function (index) { if (anchors.indexOf(index) < 0) anchors.push(index); });
    shafts.forEach(function (shaft) {
      // Fine, tapering white filaments; preserve every centreline station and
      // the existing terminal point instead of shortening the antenna.
      tubeWrite(antGeo.attributes.position.array, shaft.first, shaft.pts, function (t) { return L * 0.0064 * (1 - 0.8 * t); }, sides, 1);
      var tip = (shaft.first + shaft.pts.length * sides) * 3;
      for (var k = 0; k < 3; k++) antGeo.attributes.position.array[tip + k] = originalAnt[tip + k];
    });
    antGeo.computeVertexNormals();
    Object.keys(antGeo.attributes).forEach(function (name) {
      var attr = antGeo.attributes[name], size = attr.itemSize, old = name === 'position' ? originalAnt : name === 'normal' ? originalNormals : attr.array;
      var data = new Float32Array(attr.array.length + anchors.length * size); data.set(attr.array);
      for (var a = 0; a < anchors.length; a++) for (var k = 0; k < size; k++) data[attr.array.length + a * size + k] = old[anchors[a] * size + k];
      antGeo.setAttribute(name, new T.BufferAttribute(data, size));
    });
    var reach = [{ center: ap.position.clone(), reach: batchExtent(antGeo), margin: 0.01 * L }];
    limbs.push({ geo: antGeo, part: 'antennae', node: ap });
    var batch = batchMesh(kit, limbs, mat, rig, 'legs', c.root);
    batchReach(batch, reach);
    var ph = rng() * TAU;
    c.anim(function (t) { ap.rotation.set(0.15 * Math.sin(t * 1.9 + ph), 0.2 * Math.sin(t * 1.3), 0.1 * Math.sin(t * 2.3 + 1)); batchPose(batch); });
  }

  // A lumpy coral-head dome (used under christmas tree worms).
  function lumpDome(T, geo, R, H, seg, rings, ph, colFn) {
    var g = new T.SphereGeometry(1, seg, rings, 0, TAU, 0, PI * 0.55), pos = g.attributes.position, low = Math.cos(PI * 0.55);
    for (var k = 0; k < pos.count; k++) {
      var x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), lump = 1 + 0.12 * (noise3(x * 2.2 + ph, y * 2.2, z * 2.2) - 0.5) + 0.05 * (noise3(x * 6, y * 6 + ph, z * 6) - 0.5);
      pos.setXYZ(k, x * lump * R, Math.max(0, (y * lump - low) / (1 - low)) * H, z * lump * R);
    }
    geo.absorb(T, g, null, colFn);
  }
  function buildTreeWorms(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(71), k = 0.9 + 0.2 * rng(), R = 0.12 * k, H = 0.11 * k, head = new Geo();
    // They bore into living massive Porites, so the head is that coral: lumpy, finely pored.
    var cream = hex(0xae9862), mauve = hex(0x86704e), col = [0, 0, 0], h = c.health, bl = [0, 0, 0];
    // Porites has algae partners and bleaches in a heatwave; the worms have none
    // and keep their own colours, so a bleached head shows them off.
    lumpDome(T, head, R, H, high ? 32 : 14, high ? 16 : 7, rng() * 9, function (x, y, z) {
      var pore = noise3(x * 90, y * 90, z * 90);
      mixc(cream, mauve, 0.5 * noise3(x * 30, y * 30, z * 30), col); mulc(col, 0.72 + 0.22 * smooth(0, H, y) + 0.2 * pore);
      return lin(h === 'bleached' ? health(h, col, x, y, z, bl, 0.45 * (1 - smooth(0, H, y)) + 0.5 * pore) : col);
    });
    // Vertex colours only: a mapped head would add a shader program to the dive.
    kit.mesh(kit.geo(head, 1), kit.std({ vertexColors: true, roughness: h === 'bleached' ? coralRough(h) : 0.85 }, coralSheen(c)), 'coral-head', c.root);
    // One spiral plume, instanced twice per worm (they live in pairs of crowns).
    // Radioles spiral up a cone like a Christmas tree; the frilly band slopes down and out.
    var plume = new Geo(), turns = high ? 5 : 4, segs = Math.round(turns * (high ? 16 : 10)), ph = 0.04 * k, pr = 0.005 * k, pw = 0.012 * k, rim = [1.3, 1.3, 1.3], core = [0.7, 0.7, 0.7], dim = [0.95, 0.95, 0.95], first = plume.count(), i;
    for (i = 0; i <= segs; i++) {
      var t = i / segs, a = t * turns * TAU, w = pw * (1 - 0.75 * t), r = pr * (1 - 0.6 * t), y = ph * t, cx = Math.cos(a), cz = Math.sin(a);
      plume.v(cx * r, y, cz * r, core, t, 0);
      // Bands of radioles: alternating bright and darker filaments along the spiral.
      plume.v(cx * (r + w), y - w * 0.8, cz * (r + w), i % 2 ? dim : rim, t, 1);
    }
    // Separate the radiolar tips instead of closing the whole crown into a ribbon.
    // Keep the original spiral stations and terminal segment: only points inside
    // each old quad are added, preserving the exact placement and culling envelope.
    function plumeBetween(a, b, f) {
      var ap = a * 3, bp = b * 3, at = a * 2, bt = b * 2;
      return plume.v(lerp(plume.p[ap], plume.p[bp], f), lerp(plume.p[ap + 1], plume.p[bp + 1], f), lerp(plume.p[ap + 2], plume.p[bp + 2], f),
        [lerp(plume.c[ap], plume.c[bp], f), lerp(plume.c[ap + 1], plume.c[bp + 1], f), lerp(plume.c[ap + 2], plume.c[bp + 2], f)],
        lerp(plume.t[at], plume.t[bt], f), lerp(plume.t[at + 1], plume.t[bt + 1], f));
    }
    for (i = 0; i < segs; i++) {
      var b = first + i * 2, inner = i === segs - 1 ? b + 2 : plumeBetween(b, b + 2, 0.82), outer = i === segs - 1 ? b + 3 : plumeBetween(b + 1, b + 3, 0.34);
      plume.i.push(b, inner, b + 1, b + 1, inner, outer);
    }
    var nWorms = high ? 14 : 8, n = nWorms * 2, pGeo = kit.geo(plume, 1);
    var mesh = kit.tag(new T.InstancedMesh(pGeo, kit.std({ vertexColors: true, roughness: 0.45, side: T.DoubleSide }), n), 'worms'); c.root.add(mesh);
    var palette = [0xe8281e, 0xf08a1a, 0xffd21e, 0x2a6ae8, 0xf4f4f4, 0x9a3ad8, 0x20b0a0], tc = new T.Color(), worms = [];
    var m4 = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), up = new T.Vector3(0, 1, 0), nrm = new T.Vector3(), qs = new T.Quaternion();
    for (i = 0; i < nWorms; i++) {
      var f = (i + 0.5) / nWorms, ang = i * 2.39996 + rng(), rr = R * 0.78 * Math.sqrt(f) + 0.01;
      var yy = H * Math.pow(Math.max(0, 1 - Math.pow(rr / R, 2)), 0.7);
      nrm.set(Math.cos(ang) * rr / R * 0.9, 1, Math.sin(ang) * rr / R * 0.9).normalize();
      tc.setHex(palette[Math.floor(rng() * palette.length)]).convertSRGBToLinear();
      var tint = tc.clone(), period = 12 + 14 * rng(), phase = rng() * 40;
      for (var j = 0; j < 2; j++) {
        var side = j ? 1 : -1, off = new T.Vector3(-Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(side * 0.016 * k);
        worms.push({ pos: new T.Vector3(Math.cos(ang) * rr, yy - 0.004, Math.sin(ang) * rr).add(off), q: new T.Quaternion().setFromUnitVectors(up, nrm), spin: rng() * TAU, period: period, phase: phase });
        mesh.setColorAt(i * 2 + j, tint);
      }
    }
    var forced = false, held = 1;
    function place(t, moving) {
      for (var i = 0; i < n; i++) {
        var w = worms[i], ext = 1;
        if (forced) ext = 0.04;
        else if (moving) { var x = fract((t + w.phase) / w.period); ext = x < 0.015 ? 1 - 0.96 * x / 0.015 : x < 0.07 ? 0.04 : Math.min(1, 0.04 + (x - 0.07) / 0.16); }
        // Anchored crowns gently twist around their resting pose; never accumulate a full turn.
        // Existing worm phases keep each pair together and neighbouring worms independent.
        var twist = moving ? 0.06 * (Math.sin(t * TAU / w.period + w.phase) - Math.sin(w.phase)) : 0;
        qs.setFromAxisAngle(up, w.spin + twist); q.copy(w.q).multiply(qs);
        s.set(ext, ext, ext); m4.compose(w.pos, q, s); mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    place(0, false);
    var lastT = 0;
    c.anim(function (t) { lastT = t; place(t, true); });
    pGeo.boundingSphere = new T.Sphere(new T.Vector3(0, H * 0.5, 0), R + 0.06);
    // retract(true) pulls every crown into its tube (as when a diver's shadow passes).
    return { count: nWorms, retract: function (on) { forced = !!on; place(lastT, !c.rm && lastT > 0); } };
  }

  // Day octopus: rig, mottled skin and pattern change adapted from Cephalopod Lab.
  function buildOctopus(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(73), k = 0.9 + 0.2 * rng(), body = new Geo(), white = [1, 1, 1];
    body.loft([[0.03, 0.05, -0.02, 0.035], [0.0, 0.075, -0.035, 0.05], [-0.04, 0.085, -0.04, 0.06], [-0.09, 0.08, -0.035, 0.055], [-0.14, 0.055, -0.02, 0.04], [-0.17, 0.03, 0.0, 0.02]], high ? 18 : 9, high ? 20 : 10, function (t, a, x, y, z, o) { setc(o, white); });
    // Tilt the mantle so it rises behind the head, as when the octopus sits.
    body.map(0, function (p) { var x = p[0], y = p[1] - 0.02; p[0] = x * Math.cos(0.45) + y * Math.sin(0.45); p[1] = 0.08 - x * Math.sin(0.45) + y * Math.cos(0.45); });
    blob(T, body, 0.045, 0.06, 0, 0.045, 0.035, 0.05, white, high ? 14 : 8, high ? 10 : 6);
    var eyes = new Geo(), gold = lin(hex(0xd8b048)), black = lin(hex(0x080808));
    [-1, 1].forEach(function (s) {
      blob(T, body, 0.05, 0.085, s * 0.032, 0.018, 0.018, 0.016, white, high ? 10 : 6, high ? 8 : 4);
      blob(T, eyes, 0.055, 0.092, s * 0.04, 0.011, 0.011, 0.007, gold, high ? 10 : 6, high ? 8 : 4);
      blob(T, eyes, 0.058, 0.093, s * 0.045, 0.008, 0.0028, 0.003, black, 6, 4);
      body.spike([0.05, 0.1, s * 0.03], [0.1, 0.95, s * 0.2], 0.018, 0.005, white, white);
    });
    // A single muscular funnel emerges beneath the head, forward of the
    // mantle. Its rolled lip opens into a recessed lumen, not a painted spot.
    // It shares the skin batch and both colour states of the surrounding tissue.
    var funnelSides = high ? 10 : 6, funnelFirst = body.count();
    var funnelAxis = new T.Vector3(0.044, -0.007, 0.027).normalize(), funnelSide = new T.Vector3().crossVectors(funnelAxis, new T.Vector3(0, 1, 0)).normalize(), funnelUp = new T.Vector3().crossVectors(funnelAxis, funnelSide);
    var funnelRings = [[0.008, 0.045, 0.034, 0.012], [0.025, 0.042, 0.047, 0.0105], [0.052, 0.038, 0.061, 0.0085], [0.052, 0.038, 0.061, 0.0065], [0.052 - funnelAxis.x * 0.012, 0.038 - funnelAxis.y * 0.012, 0.061 - funnelAxis.z * 0.012, 0.0045]];
    for (var fr = 0; fr < funnelRings.length; fr++) {
      var ring = funnelRings[fr];
      for (var fs = 0; fs < funnelSides; fs++) {
        var fa = fs / funnelSides * TAU, fx = Math.cos(fa) * ring[3], fy = Math.sin(fa) * ring[3];
        body.v(ring[0] + funnelSide.x * fx + funnelUp.x * fy, ring[1] + funnelSide.y * fx + funnelUp.y * fy, ring[2] + funnelSide.z * fx + funnelUp.z * fy, white, fr / 4, fs / funnelSides);
        if (fr) { var fi = funnelFirst + (fr - 1) * funnelSides + fs, fj = funnelFirst + (fr - 1) * funnelSides + (fs + 1) % funnelSides; body.i.push(fi, fj, fi + funnelSides, fj, fj + funnelSides, fi + funnelSides); }
      }
    }
    var funnelEnd = body.count(); body.v(0.052 - funnelAxis.x * 0.014, 0.038 - funnelAxis.y * 0.014, 0.061 - funnelAxis.z * 0.014, white, 1, 0.5);
    for (var fs = 0; fs < funnelSides; fs++) body.i.push(funnelFirst + 4 * funnelSides + fs, funnelFirst + 4 * funnelSides + (fs + 1) % funnelSides, funnelEnd);
    var nb = body.count();
    scaleGeo(body, k); scaleGeo(eyes, k);
    // Arms: eight tapered tubes rebuilt each frame (reach, meander and curl).
    var arms = [], segs = high ? 20 : 8, sides = high ? 7 : 4, armGeo = new Geo(), Larm = 0.36 * k, rbase = 0.017 * k;
    function armPts(i, t, out) {
      var a = arms[i], pts = out || [];
      for (var j = 0; j <= segs; j++) {
        var u = j / segs, reach = Larm * u, wav = (0.05 + 0.07 * u) * u * Math.sin(u * 5 + a.ph + t * a.w) * a.amp;
        var dir = a.ang + wav * 2.2, curl = smooth(0.6, 1, u) * (1.0 + 0.55 * Math.sin(t * a.w * 0.7 + a.ph)) * a.amp2;
        var rx = Math.cos(dir), rz = Math.sin(dir), cr = reach - 0.06 * k * curl * (u - 0.7) / 0.3;
        var y = 0.035 * k * (1 - smooth(0, 0.18, u)) + rbase * (1 - u) + 0.05 * k * curl * Math.sin((u - 0.7) / 0.3 * PI * 0.9);
        var p = pts[j] || (pts[j] = [0, 0, 0]); p[0] = 0.035 * k + rx * cr; p[1] = y; p[2] = rz * cr;
      }
      return pts;
    }
    for (var i = 0; i < 8; i++) arms.push({ ang: (i + 0.5) / 8 * TAU, ph: rng() * TAU, w: 0.4 + 0.3 * rng(), amp: 0.7 + 0.6 * rng(), amp2: 0.5 + 0.5 * rng(), first: 0, pts: null });
    function armRadius(t) { return rbase * Math.pow(1 - t, 1.15) + 0.0006 * k; }
    // The arms' ring radii never change: tabled for the per-frame rebuild.
    var ringR = []; for (var ri = 0; ri <= segs; ri++) ringR.push(armRadius(segs > 0 ? ri / segs : 0));
    function ringRadius(t, ring) { return ringR[ring]; }
    for (i = 0; i < 8; i++) { arms[i].pts = armPts(i, 0); arms[i].first = armGeo.tube(arms[i].pts, armRadius, sides, function () { return white; }); }
    // A shallow web joins the arm bases. Its scalloped edge follows the arms
    // as they reach, keeping the animal's underside continuous while moving.
    var webFirst = armGeo.count(), webRows = high ? 2 : 1, webCols = 4;
    // out: an array to reuse (each update rewrites every web point).
    function webPoint(sector, row, col, out) {
      var f = col / webCols, r = row / webRows, ix = Math.max(1, Math.floor(segs * 0.3)), p = out || [0, 0, 0];
      var A = arms[sector].pts[ix], B = arms[(sector + 1) % 8].pts[ix], edge = 1 - 0.28 * Math.sin(f * PI);
      p[0] = 0.035 * k + (lerp(A[0], B[0], f) - 0.035 * k) * r * edge;
      p[1] = lerp(0.05 * k, lerp(A[1], B[1], f) + 0.004 * k, r) - 0.009 * k * Math.sin(f * PI) * r;
      p[2] = lerp(A[2], B[2], f) * r * edge;
      return p;
    }
    for (i = 0; i < 8; i++) {
      var wf = armGeo.count();
      for (var wr = 0; wr <= webRows; wr++) for (var wc = 0; wc <= webCols; wc++) {
        var wp = webPoint(i, wr, wc); armGeo.v(wp[0], wp[1], wp[2], white, wc / webCols, wr / webRows);
      }
      for (wr = 0; wr < webRows; wr++) for (wc = 0; wc < webCols; wc++) {
        var wi = wf + wr * (webCols + 1) + wc, wj = wi + webCols + 1;
        armGeo.i.push(wi, wi + 1, wj, wi + 1, wj + 1, wj);
      }
    }
    var na = armGeo.count();
    // Two colour states per vertex: mottled camouflage and a pale display with dark patches.
    var brown = hex(0x6a4428), olive = hex(0x7e6c3a), dark = hex(0x2a180c), pale = hex(0xe0c8a8), rust = hex(0xa04a2a), ring = hex(0x1a120c);
    function paint(p, i, out) {
      var x = p[0] / k, y = p[1] / k, z = p[2] / k, m = noise3(x * 20, y * 20, z * 20), m2 = noise3(x * 25 + 3, y * 25, z * 25);
      var A = mixc(brown, olive, m, [0, 0, 0]); mixc(A, dark, smooth(0.58, 0.8, m2) * 0.48, A);
      var B = mixc(pale, rust, smooth(0.45, 0.65, noise3(x * 25 + 7, y * 25, z * 25)), [0, 0, 0]);
      var eyeSpot = Math.abs(Math.sqrt(Math.pow(x - 0.02, 2) + Math.pow(Math.abs(z) - 0.06, 2)) - 0.012);
      if (y < 0.05) mixc(A, ring, (1 - smooth(0.003, 0.006, eyeSpot)) * 0.85, A);
      out.push(lin(A), lin(B), m2);
    }
    var bodyCols = [], armCols = [];
    for (i = 0; i < nb; i++) {
      paint([body.p[i * 3], body.p[i * 3 + 1], body.p[i * 3 + 2]], i, bodyCols);
      if (i >= funnelFirst + 3 * funnelSides) { var shade = i < funnelFirst + 4 * funnelSides ? 0.65 : i < funnelEnd ? 0.18 : 0.08; mulc(bodyCols[i * 3], shade); mulc(bodyCols[i * 3 + 1], shade); }
    }
    for (i = 0; i < na; i++) paint([armGeo.p[i * 3], armGeo.p[i * 3 + 1], armGeo.p[i * 3 + 2]], i, armCols);
    var bg = body.build(T, 1), ag = armGeo.build(T, 1);
    // Fine chromatophore stippling adds scale-independent skin detail while
    // the broad, animated colour fields remain in the vertex colours.
    var skinRelief = kit.baked('octopus|relief', high ? 256 : 128, high ? 128 : 64, function (u, v, out) {
      var n = noise2(u * 160, v * 90);
      out[0] = out[1] = out[2] = 0.3 + n * 0.45 + smooth(0.66, 0.8, n) * 0.18;
    }, true, true, true);
    var skinPigment = kit.baked('octopus|pigment', high ? 512 : 256, high ? 256 : 128, function (u, v, out) {
      var mottles = fbm2(u * 14 + 4, v * 10, 3), fine = noise2(u * 230, v * 130);
      var pigment = 0.82 + 0.15 * mottles - 0.21 * smooth(0.57, 0.74, mottles) - 0.12 * smooth(0.6, 0.76, fine);
      out[0] = pigment; out[1] = pigment * 0.97; out[2] = pigment * 0.91;
    }, true, true);
    // Tubes normally have unused UVs; unwrap each arm along its length so
    // relief stays attached to the flexing skin rather than swimming in space.
    var auv = ag.attributes.uv.array;
    for (i = 0; i < 8; i++) for (var ringI = 0; ringI <= segs; ringI++) for (var sideI = 0; sideI < sides; sideI++) {
      var uvI = (arms[i].first + ringI * sides + sideI) * 2; auv[uvI] = ringI / segs; auv[uvI + 1] = sideI / sides;
    }
    var skin = kit.std({ vertexColors: true, map: skinPigment, bumpMap: skinRelief, bumpScale: 0.0008 * k, roughness: 0.62, metalness: 0, side: T.DoubleSide });
    // The body and arms draw as one mesh (each update rewrites the arms), the
    // suckers and eyes as another (the eyes keep their own wet roughness).
    var skinBatch = batchMesh(kit, [{ geo: bg, part: 'body' }, { geo: ag, part: 'arms', live: true }], skin, null, 'body', c.root), sg = skinBatch.geometry;
    var armV0 = skinBatch.table[1].first, armI0 = skinBatch.table[1].start;
    // Paired rows of recessed suction cups follow the underside of every arm.
    // Each cup uses a single concave fan, keeping the full animal within budget.
    var cups = new Geo(), cupsPerRow = high ? 10 : 4, cupSides = high ? 6 : 4, cupRim = lin(hex(0xc9a98b)), cupWell = lin(hex(0x684b3c));
    var ct = new T.Vector3(), cs = new T.Vector3(), cd = new T.Vector3(), cn = new T.Vector3(), cb = new T.Vector3(), cp = new T.Vector3();
    function placeCups(out) {
      var q = 0;
      for (var ai = 0; ai < 8; ai++) for (var ci = 0; ci < cupsPerRow; ci++) {
        var u = 0.16 + 0.74 * ci / Math.max(1, cupsPerRow - 1), f = u * segs, a0 = Math.floor(f), a1 = Math.min(segs, a0 + 1), A = arms[ai].pts[a0], B = arms[ai].pts[a1];
        ct.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]).normalize(); cs.set(-ct.z, 0, ct.x).normalize(); cd.crossVectors(ct, cs).normalize();
        var rr = armRadius(u), cr = rr * 0.36;
        for (var side = -1; side <= 1; side += 2) {
          cn.copy(cd).addScaledVector(cs, side * 0.48).normalize(); cb.crossVectors(cn, ct).normalize();
          cp.set(lerp(A[0], B[0], f - a0), lerp(A[1], B[1], f - a0), lerp(A[2], B[2], f - a0)).addScaledVector(cd, rr * 0.89).addScaledVector(cs, side * rr * 0.48);
          for (var s = 0; s <= cupSides; s++) {
            var ang = s / cupSides * TAU, edge = s < cupSides, ax = edge ? Math.cos(ang) * cr : 0, bx = edge ? Math.sin(ang) * cr : 0, recess = edge ? cr * 0.16 : -cr * 0.25;
            var px = cp.x + ct.x * ax + cb.x * bx + cn.x * recess, py = cp.y + ct.y * ax + cb.y * bx + cn.y * recess, pz = cp.z + ct.z * ax + cb.z * bx + cn.z * recess;
            if (out) { out[q++] = px; out[q++] = py; out[q++] = pz; }
            else cups.v(px, py, pz, edge ? cupRim : cupWell, 0, 0);
          }
        }
      }
    }
    placeCups(null);
    for (i = 0; i < 8 * cupsPerRow * 2; i++) for (var cv = 0; cv < cupSides; cv++) {
      var cf = i * (cupSides + 1); cups.i.push(cf + cv, cf + (cv + 1) % cupSides, cf + cupSides);
    }
    var suckRig = new Float32Array(80), suckers = batchMesh(kit, [{ geo: cups.build(T, 1), part: 'suckers', live: true }, { geo: eyes.build(T, 1), part: 'eyes', rough: 0.15 }],
      kit.std({ vertexColors: true, roughness: 0.54, side: T.DoubleSide }, { batch: suckRig }), suckRig, 'suckers', c.root), cg = suckers.geometry, nCups = suckers.table[0].count, iCups = suckers.table[0].length;
    // The colours change only while the pattern changes; most of the time the
    // mix holds at 0 (mottled), and an unchanged mix is neither redone nor sent.
    var cols = bodyCols.concat(armCols), lastMix = null;
    function recolor(mix) {
      if (mix === lastMix) return;
      lastMix = mix;
      var arr = sg.attributes.color.array;
      for (var q = 0, v = 0; q < cols.length; q += 3, v += 3) {
        var A = cols[q], B = cols[q + 1], w = clamp((mix - cols[q + 2] * 0.6) * 2.5, 0, 1);
        arr[v] = lerp(A[0], B[0], w); arr[v + 1] = lerp(A[1], B[1], w); arr[v + 2] = lerp(A[2], B[2], w);
      }
      sg.attributes.color.needsUpdate = true;
    }
    recolor(0);
    var arr = sg.attributes.position.array.subarray(armV0 * 3), wpt = [0, 0, 0];
    c.anim(function (t) {
      for (var i = 0; i < 8; i++) { armPts(i, t, arms[i].pts); tubeWrite(arr, arms[i].first, arms[i].pts, ringRadius, sides, 1); }
      var wq = webFirst * 3;
      for (i = 0; i < 8; i++) for (var wr = 0; wr <= webRows; wr++) for (var wc = 0; wc <= webCols; wc++) {
        var wp = webPoint(i, wr, wc, wpt); arr[wq++] = wp[0]; arr[wq++] = wp[1]; arr[wq++] = wp[2];
      }
      batchDirty(sg, armV0, armV0 + na); batchNormals(sg, armV0, armV0 + na, armI0, sg.index.count);
      placeCups(cg.attributes.position.array); batchDirty(cg, 0, nCups); batchNormals(cg, 0, nCups, 0, iCups);
      // Mostly mottled camouflage, flashing to the pale display now and then.
      recolor(0.9 * smooth(0.45, 0.95, Math.sin(t * 0.22)));
    });
    return { patterns: ['mottled', 'pale-display'] };
  }
  // Pinkfish (Holothuria edulis): smooth soft skin, round in cross-section,
  // about 20 cm; black to reddish-black above and pink below (SeaLifeBase; WA Museum).
  function buildCucumber(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(75), L = 0.24 * (0.88 + 0.24 * rng()), g = new Geo();
    var black = hex(0x1c1012), dusk = hex(0x4a1c24), pink = hex(0xe8869a), rose = hex(0xc8566e), mouth = hex(0x8a8a86), ph0 = rng() * 9;
    g.loft([[0.5, 0.025, -0.025, 0.028], [0.46, 0.068, -0.062, 0.07], [0.36, 0.096, -0.082, 0.094], [0.12, 0.104, -0.088, 0.1], [-0.18, 0.102, -0.087, 0.099], [-0.38, 0.09, -0.078, 0.088], [-0.47, 0.06, -0.054, 0.058], [-0.5, 0.02, -0.02, 0.02]], high ? 32 : 14, high ? 24 : 12,
      function (t, a, x, y, z, o) {
        // Dark back fades through dusky red flanks to a pink underside.
        var up = Math.sin(a), m = noise2(x * 30 + ph0, z * 30 + y * 20);
        mixc(black, dusk, 0.25 + 0.35 * m, o);
        mixc(o, rose, smooth(0.15, -0.25, up), o); mixc(o, pink, smooth(-0.2, -0.65, up), o);
        if (t < 0.03) mixc(o, mouth, 0.6, o);
      });
    var bend = (rng() - 0.5) * 0.16;
    scaleGeo(g, L); g.map(0, function (p) { var t = p[0] / L; p[2] += bend * L * (0.25 - t * t) * 2; p[1] += 0.087 * L; });
    var geo = kit.geo(g, 1);
    // Smooth, pliable skin has a fine surface grain, not raised spines. Pack
    // tiny relief and roughness into one linear map; the dark/pink pigment
    // stays in the original vertex colours. Circular sampling closes the seam.
    var skin = kit.baked('cucumber|skin', high ? 256 : 128, high ? 128 : 64, function (u, v, out) {
      var a = v * TAU, ca = Math.cos(a), sa = Math.sin(a), edge = smooth(0.02, 0.1, u) * (1 - smooth(0.9, 0.98, u));
      var grain = noise3(u * 82, ca * 16, sa * 16), tissue = noise3(u * 26 + 7, ca * 7, sa * 7);
      var crease = Math.sin(u * 210 + 2 * noise3(u * 10, ca * 4, sa * 4));
      out[0] = 0.5 + edge * ((grain - 0.5) * 0.13 + (tissue - 0.5) * 0.045 + crease * 0.012);
      out[1] = 0.91 + edge * ((tissue - 0.5) * 0.17 + (grain - 0.5) * 0.06);
      out[2] = 0.5;
    }, false, true, true);
    kit.mesh(geo, kit.std({ vertexColors: true, bumpMap: skin, bumpScale: L * 0.0014, roughnessMap: skin, roughness: 0.66 }), 'body', c.root);
    var ph = rng() * TAU;
    deform(c, geo, function (base, out, t) {
      for (var q = 0; q < base.length; q += 3) {
        var x = base[q] / L, w = 1 + 0.035 * Math.sin(t * 0.5 - x * 9 + ph);
        out[q] = base[q] * (1 + 0.01 * Math.sin(t * 0.5 + ph)); out[q + 1] = base[q + 1] * w; out[q + 2] = base[q + 2] * w;
      }
    }, true);
  }
  // An alpha-tested map whose smaller mip levels keep the share of solid texels:
  // plain averaging thins a fine net below the cutoff, and a distant fan would
  // melt away to its outline.
  function coverageMips(w, h, data, cutoff) {
    function cover(d, s) { var n = 0; for (var k = 3; k < d.length; k += 4) if (d[k] * s >= cutoff * 255) n++; return n / (d.length / 4); }
    var target = cover(data, 1), levels = [{ data: data, width: w, height: h }], prev = data, pw = w, ph = h;
    while (pw > 1 || ph > 1) {
      var nw = Math.max(1, pw >> 1), nh = Math.max(1, ph >> 1), d = new Uint8Array(nw * nh * 4), i, j, q;
      for (j = 0; j < nh; j++) for (i = 0; i < nw; i++) for (q = 0; q < 4; q++) {
        var x0 = Math.min(pw - 1, i * 2), x1 = Math.min(pw - 1, i * 2 + 1), y0 = Math.min(ph - 1, j * 2), y1 = Math.min(ph - 1, j * 2 + 1);
        d[(j * nw + i) * 4 + q] = (prev[(y0 * pw + x0) * 4 + q] + prev[(y0 * pw + x1) * 4 + q] + prev[(y1 * pw + x0) * 4 + q] + prev[(y1 * pw + x1) * 4 + q] + 2) >> 2;
      }
      // Scale alpha so this level keeps the full-size coverage (bisection).
      var lo = 0.5, hi = 6;
      for (q = 0; q < 14; q++) { var mid = (lo + hi) / 2; if (cover(d, mid) < target) lo = mid; else hi = mid; }
      for (q = 3; q < d.length; q += 4) d[q] = Math.min(255, Math.round(d[q] * hi));
      levels.push({ data: d, width: nw, height: nh }); prev = d; pw = nw; ph = nh;
    }
    return levels;
  }
  // Sea fan: a lacy alpha-cut fan in the YZ plane (faces the current along X), on a real trunk.
  function buildSeaFan(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(77), k = 0.85 + 0.3 * rng(), W = 1.0 * k, H = 0.85 * k, fan = new Geo(), white = [1, 1, 1];
    // Orange, red or purple gorgonians, with pale polyps.
    var colonyPhase = rng() * TAU, palette = [[0xc4512e, 0xe8874a], [0xb02e34, 0xd8604e], [0x7e3c94, 0xb070c0]][Math.floor(rng() * 3)];
    var na = high ? 40 : 16, nr = high ? 16 : 8, y0 = 0.08 * k, i, j, span = 1.35;
    function rad(phi) { return H * (0.9 + 0.055 * Math.cos(phi * 3) + 0.045 * Math.sin(phi * 7 + colonyPhase) + 0.018 * Math.sin(phi * 17 + 1)); }
    for (i = 0; i <= na; i++) for (j = 0; j <= nr; j++) {
      var phi = lerp(-span, span, i / na), r = rad(phi) * (0.06 + 0.94 * j / nr), z = Math.sin(phi) * r * (W / H) * 0.62, y = y0 + Math.cos(phi) * r;
      var cup = 0.025 * k * Math.sin(z / W * 5 + colonyPhase) * Math.pow(j / nr, 2) + 0.018 * k * Math.pow(z / W, 2);
      fan.v(cup, y, z, white, z / W + 0.5, (y - y0 * 0.5) / (H * 1.08));
    }
    for (i = 0; i < na; i++) for (j = 0; j < nr; j++) { var a0 = i * (nr + 1) + j, b0 = a0 + nr + 1; fan.i.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0); }
    var red = hex(palette[0]), org = hex(palette[1]), polyp = hex(0xf6e2c4), cc = [0, 0, 0, 0, 0], N = 26, tw = high ? 512 : 256;
    // The mesh: anastomosing branchlets round small, irregular windows, thicker
    // primary branches fanning from the trunk, and a solid growing rim.
    function paint(u, v, out) {
      var z = (u - 0.5) * W, y = v * H * 1.08 + y0 * 0.5, ang = Math.atan2(z / 0.62 * (H / W), y - y0), r = Math.sqrt(Math.pow(z / 0.62 * (H / W), 2) + Math.pow(y - y0, 2)) / rad(ang);
      if (r > 1 || r < 0.05 || Math.abs(ang) > span) { out[3] = 0; setc(out, red); return; }
      cells(u * N + 0.55 * noise2(u * 9, v * 7), v * N * 1.1 + 0.5 * noise2(u * 8 + 2, v * 9), 5, cc);
      var net = 1 - smooth(0.14 + 0.06 * (1 - r), 0.22 + 0.06 * (1 - r), cc[1] - cc[0]);
      var near = 9; for (var q = 0; q < 7; q++) near = Math.min(near, Math.abs(ang - (lerp(-1.15, 1.15, q / 6) + 0.08 * Math.sin(r * 6 + q))));
      var main = (1 - smooth(0.008, 0.016, near * r * H * (1 - 0.4 * r))) * smooth(0.95, 0.6, r);
      var a = Math.max(net, main, 1 - smooth(0.0, 0.035, (1 - r) * H));
      mixc(red, org, 0.4 * noise2(u * 9, v * 9) + 0.4 * r, out);
      mixc(out, polyp, net * smooth(0.6, 0.78, noise2(u * 170, v * 170)) * 0.7, out);
      mulc(out, 0.86 + 0.14 * smooth(0.03, 0.6, r) + 0.06 * noise2(u * 95, v * 95) - 0.12 * main);
      out[3] = a;
    }
    var full = c.key('fan') + '|' + tw, tex = kit.share(full + '|cov', function () {
      var mips = bake(full + '|mips', function () { return coverageMips(tw, tw, paintData(tw, tw, paint), 0.42); }), t = new T.DataTexture(mips[0].data, tw, tw, T.RGBAFormat);
      t.mipmaps = mips; t.generateMipmaps = false; t.encoding = T.sRGBEncoding; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; t.needsUpdate = true;
      return t;
    });
    var mat = kit.std({ map: tex, alphaTest: 0.42, side: T.DoubleSide, roughness: 0.77 });
    var sway = kit.node('sway', c.root);
    var fanGeo = kit.geo(fan, 1); kit.mesh(fanGeo, mat, 'fan', sway);
    var trunk = new Geo(), tc = lin(mixc(red, hex(0x5a2418), 0.4, [0, 0, 0])), base = lin(hex(0x5a4a3a));
    trunk.tube([[0, -0.01, 0], [0, y0 * 0.6, 0], [0, y0 * 1.2, 0], [0, y0 * 2.2, 0]], function (t) { return (0.03 - 0.012 * t) * k; }, high ? 10 : 6, function (t) { return t < 0.2 ? base : tc; });
    var nb = high ? 7 : 4;
    for (i = 0; i < nb; i++) {
      var am = lerp(-1.0, 1.0, i / (nb - 1)), pts = [];
      for (j = 0; j <= (high ? 8 : 4); j++) {
        var t = j / (high ? 8 : 4), rr = rad(am) * (0.12 + 0.75 * t), zz = Math.sin(am) * rr * (W / H) * 0.62;
        var xx = 0.025 * k * Math.sin(zz / W * 5 + colonyPhase) * Math.pow(0.12 + 0.75 * t, 2) + 0.018 * k * Math.pow(zz / W, 2);
        pts.push([xx + 0.003, y0 + Math.cos(am) * rr, zz]);
      }
      trunk.tube(pts, function (t) { return (0.012 - 0.008 * t) * k; }, high ? 6 : 4, function () { return tc; });
    }
    var trunkGeo = kit.geo(trunk, 1); kit.mesh(trunkGeo, kit.std({ vertexColors: true, roughness: 0.7 }), 'trunk', sway);
    var ph = rng() * TAU, current = {};
    function fanSway(base, out, t, motion) {
      currentAt(c.root, motion, t, ph, current);
      for (var q = 0; q < base.length; q += 3) {
        var h = clamp((base[q + 1] - y0 * 0.45) / H, 0, 1.2), flex = h * h;
        var lag = t * 0.83 - h * 2.5 + base[q + 2] / W * 2 + ph;
        var ripple = (0.008 * Math.sin(lag) + 0.002 * Math.sin(lag * 2 - h * 2)) * (0.25 + Math.hypot(current.x, current.z));
        var dx = H * flex * (0.105 * current.x * current.pulse + ripple), dz = H * flex * (0.045 * current.z * current.pulse + ripple * 0.18);
        out[q] = base[q] + dx; out[q + 2] = base[q + 2] + dz;
        out[q + 1] = base[q + 1] - (dx * dx + dz * dz) / Math.max(H * h * 1.6, 0.1);
      }
    }
    [fanGeo, trunkGeo].forEach(function (g) { g.computeBoundingSphere(); g.boundingSphere.radius += H * 0.17; });
    deform(c, fanGeo, fanSway, true); deform(c, trunkGeo, fanSway, true);
    return { plane: 'yz' };
  }
  function buildBarrel(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(79), k = 0.85 + 0.3 * rng(), Hh = 1.0 * k, g = new Geo(), col = [0, 0, 0], i, j;
    // Midpoint stations smooth the deep cavity while retaining every original
    // inner ring; the outer wall, rolled lip and cavity floor stay in place.
    var ns = high ? 96 : 40, nh = high ? 17 : 8, ni = high ? 10 : 6, ridges = 13 + Math.floor(rng() * 4), ph = rng() * TAU;
    // Brownish red, pinkish brown or purple-brown; ridge crests paler, grooves deep.
    var pal = [[0x9b5b43, 0xc08a68, 0x5e3628], [0x9a6a6a, 0xc49c90, 0x5a3c3e], [0x80566e, 0xae8aa0, 0x4a3044]][Math.floor(rng() * 3)];
    var red = hex(pal[0]), ridge = hex(pal[1]), deep = hex(pal[2]), inner = mixc(red, hex(0xc8a890), 0.25, [0, 0, 0]), dark = hex(0x1a1711);
    // Thin, wavy, knobbly flanges stand off the wall with deep grooves between them.
    function ridgeAt(a, f) { return Math.pow(0.5 + 0.5 * Math.sin(a * ridges + 0.7 * Math.sin(f * 6 + ph) + 0.3 * Math.sin(f * 15 - a * 2)), high ? 3 : 2) * (0.6 + 0.4 * Math.pow(Math.sin(f * 26 + a * 3 + ph), 2)) * smooth(0.02, 0.2, f); }
    function radius(a, f) {
      var body = 0.3 + 0.22 * smooth(0, 0.84, f) - 0.055 * smooth(0.68, 1, f);
      var lobes = 1 + 0.055 * Math.sin(a * 3 + ph) + 0.025 * Math.sin(a * 7 - f * 2);
      return k * body * lobes * (1 + 0.13 * ridgeAt(a, f));
    }
    function crown(a) { return Hh * (0.022 * Math.sin(a * 3 + ph) + 0.012 * Math.sin(a * 7 - ph)); }
    // One continuous wall rolls over an irregular fleshy lip into the cavity.
    // A swollen upper body, asymmetric growth and a slight lean break the
    // straight sides and flat rim of a manufactured vessel.
    g.seams = [];
    function ring(f, inset, lift, cavity) {
      var first = g.count();
      for (var q = 0; q <= ns; q++) {
        var a = q / ns * TAU, r = radius(a, f) - inset * k, y = Hh * f + crown(a) * Math.pow(f, 4) + lift * k;
        var rd = ridgeAt(a, f), grain = noise3(Math.cos(a) * 5, f * 8, Math.sin(a) * 5);
        if (cavity > 0) mixc(inner, dark, cavity, col);
        else { mixc(deep, red, 0.45 + 0.55 * smooth(0, 0.5, rd), col); mixc(col, ridge, smooth(0.5, 1, rd) * 0.45 + smooth(0.92, 1, f) * 0.2, col); }
        mulc(col, 0.9 + grain * 0.15);
        g.v(Math.cos(a) * r + 0.026 * k * f * f * Math.cos(ph), y, Math.sin(a) * r + 0.018 * k * f * f * Math.sin(ph), lin(col), q / ns, f);
      }
      g.seams.push([first, first + ns]);
      if (first) for (var q2 = 0; q2 < ns; q2++) { var p = first - ns - 1 + q2, n = p + ns + 1; g.i.push(p, n, p + 1, p + 1, n, n + 1); }
    }
    for (i = 0; i <= nh; i++) ring(i / nh, 0, -0.012 * Math.pow(i / nh, 8), 0);
    ring(1, 0.023, 0.004, 0);
    ring(1, 0.052, -0.009, 0.12);
    for (i = 1; i <= ni; i++) { var t = i / ni; ring(1 - 0.77 * t, 0.052 + 0.06 * t, -0.009 * (1 - t), 0.12 + 0.88 * smooth(0, 0.8, t)); }
    var innerBase = g.count() - ns - 1, cavityCenter = g.count(); g.v(0, Hh * 0.23, 0, lin(dark), 0.5, 0.23);
    for (j = 0; j < ns; j++) g.i.push(cavityCenter, innerBase + j + 1, innerBase + j);
    var bottomC = g.count(); g.v(0, 0.002, 0, lin(dark), 0.5, 0);
    for (j = 0; j < ns; j++) g.i.push(bottomC, j, j + 1);
    var pores = [0, 0, 0, 0, 0], poreMap = kit.baked('barrel|pores', high ? 512 : 256, high ? 256 : 128, function (u, v, out) {
      // Sponges are porous tissue: tiny irregular ostia sit between the coarse
      // ridges, with larger pits scattered through the rough outer wall.
      cells(u * 75, v * 40, 37, pores);
      var pit = 1 - smooth(0.08, 0.18 + pores[2] * 0.06, pores[0]);
      var h = 0.54 + noise2(u * 180, v * 90) * 0.11 - pit * 0.28;
      out[0] = out[1] = out[2] = h;
    }, true, false, true);
    var pigment = kit.baked('barrel|pigment', high ? 256 : 128, high ? 128 : 64, function (u, v, out) {
      cells(u * 44, v * 25, 41, pores);
      var pore = (1 - smooth(0.07, 0.2, pores[0])) * 0.2, mottling = noise3(Math.cos(u * TAU) * 9, v * 18, Math.sin(u * TAU) * 9);
      var value = 0.88 + 0.12 * mottling - pore;
      out[0] = value; out[1] = value * (0.98 + 0.02 * mottling); out[2] = value * 0.97;
    }, true, false);
    kit.mesh(kit.geo(g, 1), kit.std({ vertexColors: true, map: pigment, bumpMap: poreMap, bumpScale: 0.0035 * k, roughness: 0.91, side: T.DoubleSide }), 'sponge', c.root);
  }
  function buildSoftCoral(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(81), k = 0.85 + 0.3 * rng(), stalk = new Geo(), polyps = new Geo(), i;
    // Pink, red, orange, purple or cream polyp clusters on a pale, see-through-looking
    // trunk freckled with sclerites (the coral's tiny skeletal spicules).
    var pals = [[0xd0487a, 0xf2a6c4], [0xc8382e, 0xf08a6a], [0xe07428, 0xf8b860], [0x8a4ab0, 0xc89ae0], [0xd8a020, 0xf8e070]], pal = pals[Math.floor(rng() * pals.length)];
    var stalkC = mixc(hex(0xe2d6d2), hex(pal[0]), 0.3, [0, 0, 0]), spicule = hex(pal[0]), pc = lin(hex(pal[0])), pt = lin(hex(pal[1]));
    function scol(t, s) {
      var n = noise2(t * 30 + s * 7, s * 13), c2 = mixc(stalkC, spicule, 0.06 + smooth(0.6, 0.78, n) * 0.5 + 0.25 * t * t, [0, 0, 0]);
      return lin(mulc(c2, 0.86 + 0.14 * t + 0.06 * n));
    }
    stalk.tube([[0, -0.01, 0], [0, 0.04 * k, 0], [0.005, 0.09 * k, 0], [0, 0.13 * k, 0]], function (t) { return (0.044 - 0.014 * t) * k; }, high ? 10 : 6, scol);
    var tips = [], sides = high ? 6 : 4;
    function grow(p, dir, len, r, depth) {
      var end = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len], mid = [(p[0] + end[0]) / 2 + dir[2] * len * 0.08, (p[1] + end[1]) / 2, (p[2] + end[2]) / 2 - dir[0] * len * 0.08];
      // Bury each narrow branch collar inside its parent, then swell gently
      // into the fleshy branch. This avoids exposed overlapping tube rims.
      var buried = [p[0] - dir[0] * r * 0.5, p[1] - dir[1] * r * 0.5, p[2] - dir[2] * r * 0.5];
      stalk.tube([buried, mid, end], function (t) { return r * (0.73 + 0.19 * Math.sin(t * PI) - 0.08 * t); }, sides, scol);
      if (depth === 0) { tips.push(end); return; }
      var kids = depth === 2 ? (high ? 3 : 2) : 2;
      for (var q = 0; q < kids; q++) {
        var a = q / kids * TAU + rng() * 0.8, spread = 0.58 + 0.3 * rng(), d = [dir[0] + Math.cos(a) * spread, dir[1] + 0.18, dir[2] + Math.sin(a) * spread], l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        grow(end, [d[0] / l, d[1] / l, d[2] / l], len * 0.72, r * 0.62, depth - 1);
      }
    }
    var lobes = high ? 5 : 4;
    for (i = 0; i < lobes; i++) {
      var la = i / lobes * TAU + 0.4, spread = 0.54 + 0.23 * hash2(i, c.seed + 21), ld = [Math.cos(la) * spread, 1, Math.sin(la) * spread], ll = Math.sqrt(ld[0] * ld[0] + 1 + ld[2] * ld[2]);
      grow([0, (0.106 + 0.018 * hash2(i + 11, 32)) * k, 0], [ld[0] / ll, ld[1] / ll, ld[2] / ll], (0.059 + 0.016 * hash2(i + 3, 24)) * k, 0.021 * k, 2);
    }
    // Each twig ends in a rounded cluster of eight-armed polyps facing outward,
    // like a carnation head (the octocoral crown).
    var per = high ? 8 : 4, arms = high ? 8 : 6, cr = 0.017 * k;
    for (i = 0; i < tips.length; i++) for (var j = 0; j < per; j++) {
      var p = tips[i], f = (j + 0.5) / per, el = Math.acos(1 - 1.4 * f), az = j * 2.399963 + i;
      var nx = Math.sin(el) * Math.cos(az), ny = Math.cos(el), nz = Math.sin(el) * Math.sin(az);
      var px = p[0] + nx * cr, py = p[1] + ny * cr * 0.8, pz = p[2] + nz * cr;
      var tx = -nz, tz = nx, tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      var bx = ny * tz, by = nz * tx - nx * tz, bz = -ny * tx;
      var core = polyps.v(px, py, pz, pc, 0.5, 0.5), rimFirst = polyps.count(), reach = 0.0075 * k, lift = 0.0055 * k;
      for (var arm = 0; arm < arms; arm++) {
        var pa2 = arm / arms * TAU + az, ca = Math.cos(pa2), sa = Math.sin(pa2);
        polyps.v(px + (tx * ca + bx * sa) * reach * 0.35, py + by * sa * reach * 0.35, pz + (tz * ca + bz * sa) * reach * 0.35, pc, 0, 0);
        polyps.v(px + (tx * ca + bx * sa) * reach + nx * lift, py + by * sa * reach + ny * lift, pz + (tz * ca + bz * sa) * reach + nz * lift, pt, 1, 0);
      }
      for (arm = 0; arm < arms; arm++) {
        var r0 = rimFirst + arm * 2, r1 = rimFirst + ((arm + 1) % arms) * 2;
        polyps.i.push(core, r1, r0);
        if (high) polyps.i.push(r0, r1, r0 + 1);
        else if (arm % 2 === 0) polyps.i.push(r0, r1, r0 + 1);
      }
    }
    for (i = 0; i < stalk.count(); i++) {
      stalk.t[i * 2] = (stalk.p[i * 3] + stalk.p[i * 3 + 2] * 0.45) / (0.09 * k);
      stalk.t[i * 2 + 1] = stalk.p[i * 3 + 1] / (0.2 * k);
    }
    var sGeo = kit.geo(stalk, 1), pGeo = kit.geo(polyps, 1);
    var tissueMap = kit.baked('soft-coral|tissue', high ? 128 : 64, high ? 128 : 64, function (u, v, out) {
      var pores = noise2(u * 49, v * 57), folds = noise2(u * 17, v * 9);
      out[0] = out[1] = out[2] = 0.46 + 0.2 * folds + 0.13 * pores - 0.14 * smooth(0.66, 0.84, pores);
    }, true, true, true);
    kit.mesh(sGeo, kit.std({ vertexColors: true, map: kit.flat('map'), roughness: 0.76, bumpMap: tissueMap, bumpScale: 0.00065 * k, side: T.DoubleSide }, { sheen: sheenOf(T, 0xffffff, 0xffd0e2, 0.055) }), 'stalks', c.root);
    kit.mesh(pGeo, kit.std({ vertexColors: true, roughness: 0.68, side: T.DoubleSide }, { sheen: sheenOf(T, pal[1], 0xffffff, 0.075) }), 'polyps', c.root);
    var ph = rng() * TAU, Hm = 0.35 * k, current = {};
    function swayFn(base, out, t, motion) {
      currentAt(c.root, motion, t, ph, current);
      for (var q = 0; q < base.length; q += 3) {
        var y = Math.max(0, base[q + 1] - 0.012 * k) / Hm, w = y * y * 0.04 * k;
        var phase = t * 0.91 - y * 2.9 + base[q] * 7 + base[q + 2] * 4 + ph;
        var flutter = 0.08 * Math.sin(phase) + 0.018 * Math.sin(phase * 2 - y * 1.7);
        var dx = w * (current.x * current.pulse + flutter), dz = w * (current.z * current.pulse + flutter * 0.4);
        out[q] = base[q] + dx; out[q + 2] = base[q + 2] + dz;
        out[q + 1] = base[q + 1] - (dx * dx + dz * dz) / Math.max(Hm * y * 1.7, 0.06);
      }
    }
    [sGeo, pGeo].forEach(function (g) { g.computeBoundingSphere(); g.boundingSphere.radius += 0.045 * k; });
    deform(c, sGeo, swayFn, true); deform(c, pGeo, swayFn, true);
  }

  // ---- Corals: growth (0 recruit .. 1 mature) and health ----------------------------
  var BLEACH = hex(0xf4f6f5), BLEACH_SH = hex(0xcbdae2), SKEL = hex(0xc8c6be), SKEL_D = hex(0x8e8c84), TURF = hex(0x6a5e40), TURF2 = hex(0x5a5c40), HEALTH_MIX = [0, 0, 0];
  // Healthy keeps its pigment. Bleached tissue is clear over the white skeleton,
  // a cool grey only in its hollows. Dead skeleton is grey under a patchy, fuzzy
  // brown-olive turf film that fills the hollows first. cav: 0 exposed .. 1 deep hollow.
  function health(h, live, x, y, z, out, cav) {
    var hollow = cav === undefined ? 0.35 : cav, l0 = live[0], l1 = live[1], l2 = live[2];
    if (h === 'bleached') { mixc(BLEACH, BLEACH_SH, 0.6 * hollow, out); out[0] += (l0 - out[0]) * 0.06; out[1] += (l1 - out[1]) * 0.06; out[2] += (l2 - out[2]) * 0.06; return out; }
    if (h === 'dead') {
      var n = noise3(x * 11 + 5, y * 11, z * 11), f = noise3(x * 70, y * 70 + 3, z * 70);
      mixc(SKEL, SKEL_D, 0.3 * noise3(x * 30, y * 30, z * 30 + 7) + 0.45 * hollow, out);
      mixc(out, mixc(TURF, TURF2, f, HEALTH_MIX), smooth(0.5, 0.7, 0.6 * n + 0.18 * f + 0.4 * hollow) * 0.72, out);
      return mulc(out, 0.86 + 0.26 * noise3(x * 160, y * 160, z * 160));
    }
    return setc(out, live);
  }
  function coralRough(h) { return h === 'dead' ? 0.96 : h === 'bleached' ? 0.78 : 0.73; }
  // Bleached colonies keep a faint pastel glow at grazing angles ("colourful
  // bleaching"); living tips a faint fluorescent one. Uniforms only: no new program.
  var PASTELS = [[0xfbe3ee, 0xe2edfc], [0xe2edfc, 0xeee4fa], [0xf7f1cf, 0xfbe3ee], [0xeee4fa, 0xe2f6ec]];
  function coralSheen(c, glow) {
    if (c.health === 'bleached') { var p = PASTELS[(c.seed >>> 0) % PASTELS.length]; return { sheen: sheenOf(c.T, p[0], p[1], 0.2) }; }
    return c.health === 'healthy' && glow ? { sheen: sheenOf(c.T, glow, 0xffffff, 0.06) } : null;
  }
  // Seamless (periodic) jittered cells and value noise for tiled coral maps.
  function cellsP(x, y, P, salt, out) {
    var ix = Math.floor(x), iy = Math.floor(y), b1 = 81, b2 = 81, id = 0, bx = 0, by = 0;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      var cx = ix + dx, cy = iy + dy, wx = ((cx % P) + P) % P, wy = ((cy % P) + P) % P;
      var px = cx + 0.12 + 0.76 * hash2(wx * 7 + salt, wy), py = cy + 0.12 + 0.76 * hash2(wx, wy * 13 + salt + 5), ex = x - px, ey = y - py, d = ex * ex + ey * ey;
      if (d < b1) { b2 = b1; b1 = d; id = hash2(wx + salt * 3, wy - salt); bx = ex; by = ey; } else if (d < b2) b2 = d;
    }
    out[0] = Math.sqrt(b1); out[1] = Math.sqrt(b2); out[2] = id; out[3] = bx; out[4] = by;
    return out;
  }
  function noiseP(x, y, P) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var x0 = ((ix % P) + P) % P, x1 = (x0 + 1) % P, y0 = (((iy % P) + P) % P) << 8, y1 = ((((iy + 1) % P) + P) % P) << 8;
    var a = LATTICE[y0 | x0], b = LATTICE[y0 | x1], c = LATTICE[y1 | x0], d = LATTICE[y1 | x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  // A dead colony's tiled skeleton: crisp rims round empty cups under a fuzzy
  // turf film of short filaments (sRGB, multiplied over grey vertex colours).
  function deadGrain(kit, size, pore, rep) {
    var cc = [0, 0, 0, 0, 0], turf = [0.58, 0.53, 0.43], olive = [0.53, 0.53, 0.43], q = size >> 1;
    return kit.baked('grain-dead|' + pore, size, size, function (u, v, out) {
      cellsP(u * pore, v * pore, pore, 31, cc);
      var cup = 1 - smooth(0.06, 0.18, cc[0]), lip = band(cc[0] - 0.27, 0.07, 0.05), g = 0.94 + 0.06 * lip - 0.5 * cup;
      var patch = 0.62 * noiseP(u * 4, v * 4, 4) + 0.38 * noiseP(u * 16, v * 16, 16), hair = noiseP(u * q, v * q, q);
      var film = smooth(0.46, 0.66, patch + 0.12 * cup) * (0.5 + 0.5 * smooth(0.25, 0.75, hair));
      out[0] = out[1] = out[2] = g;
      mixc(out, mixc(turf, olive, noiseP(u * 8, v * 8, 8), HEALTH_MIX), film * 0.9, out);
      mulc(out, 0.9 + 0.2 * hair * film);
    }, true, true, false, rep);
  }
  function deadNormal(kit, size, pore, rep) {
    var cc = [0, 0, 0, 0, 0];
    return kit.bakedNormal('corallite-dead|' + pore, size, size, function (u, v) {
      cellsP(u * pore, v * pore, pore, 31, cc);
      return 0.75 * band(cc[0] - 0.27, 0.07, 0.07) - 0.4 * (1 - smooth(0.06, 0.18, cc[0])) + 0.05 * noiseP(u * 64, v * 64, 64);
    }, 1.7, true, rep);
  }
  // The grain and relief for a colony in its health state.
  function coralMaps(kit, h, size, pore, rep) {
    return h === 'dead' ? [deadGrain(kit, size, pore, rep), deadNormal(kit, size, pore, rep)] : [grainTexture(kit, size, pore, rep), coralliteNormal(kit, size, pore, rep)];
  }
  // Tiled corallite grain multiplied over vertex colours.
  function grainTexture(kit, size, pore, rep) {
    var cc = [0, 0, 0, 0, 0];
    return kit.baked('grain|' + pore, size, size, function (u, v, out) {
      cells(u * pore, v * pore, 31, cc);
      var lip = band(cc[0] - 0.27, 0.075, 0.055), cup = 1 - smooth(0.08, 0.21, cc[0]);
      var g = 0.86 + 0.12 * lip - 0.21 * cup - 0.035 * (1 - smooth(0.0, 0.08, cc[1] - cc[0]));
      out[0] = out[1] = out[2] = g;
    }, true, true, false, rep);
  }
  function coralliteNormal(kit, size, pore, rep) {
    var cc = [0, 0, 0, 0, 0];
    return kit.bakedNormal('corallite|' + pore, size, size, function (u, v) {
      cells(u * pore, v * pore, 31, cc);
      return 0.65 * band(cc[0] - 0.27, 0.075, 0.075) - 0.25 * (1 - smooth(0.08, 0.21, cc[0]));
    }, 1.3, true, rep);
  }
  // A per-texel field shared by a pigment map and its normal map, computed at
  // most once and only if one of them is not baked yet. at(i, j) -> offset.
  function lazyField(w, h, n, fn) {
    var f = { data: null, at: function (i, j) {
      if (!f.data) {
        var d = new Float32Array(w * h * n), r, q, ii, jj;
        for (jj = 0; jj < h; jj++) for (ii = 0; ii < w; ii++) { r = fn((ii + 0.5) / w, (jj + 0.5) / h); for (q = 0; q < n; q++) d[(jj * w + ii) * n + q] = r[q]; }
        f.data = d;
      }
      return (j * w + i) * n;
    } };
    return f;
  }
  // Tangent-space normal map from a height function over the texture square.
  function normalData(w, h, height, strength) {
    var hs = new Float32Array(w * h), data = new Uint8Array(w * h * 4), i, j;
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) hs[j * w + i] = height((i + 0.5) / w, (j + 0.5) / h, i, j);
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      var dx = hs[j * w + Math.min(w - 1, i + 1)] - hs[j * w + Math.max(0, i - 1)], dy = hs[Math.min(h - 1, j + 1) * w + i] - hs[Math.max(0, j - 1) * w + i];
      var nx = -dx * strength, ny = -dy * strength, l = Math.sqrt(nx * nx + ny * ny + 1), k = (j * w + i) * 4;
      data[k] = (0.5 + 0.5 * nx / l) * 255; data[k + 1] = (0.5 + 0.5 * ny / l) * 255; data[k + 2] = (0.5 + 0.5 / l) * 255; data[k + 3] = 255;
    }
    return data;
  }
  // A dome with arc-length UVs (azimuthal equidistant), so a pattern keeps its size.
  function dome(c, R, H, nr, ns, shape, colFn) {
    var g = new Geo(), steps = 64, arc = [0], prev = [0, H], i;
    for (i = 1; i <= steps; i++) { var r = i / steps, y = H * Math.pow(Math.max(0, 1 - r * r), 0.55); arc.push(arc[i - 1] + Math.hypot(R / steps, y - prev[1])); prev = [r, y]; }
    var Smax = arc[steps] * 1.02;
    g.polar(nr, ns, function (r, a, col) {
      var rr = Math.pow(r, 0.9), s = arc[Math.round(rr * steps)], m = shape(rr, a), x = Math.cos(a) * R * rr * m, z = Math.sin(a) * R * rr * m, y = H * Math.pow(Math.max(0, 1 - rr * rr), 0.55) * m;
      colFn(x, y, z, col); return [x, y, z, 0.5 + Math.cos(a) * s / (2 * Smax), 0.5 + Math.sin(a) * s / (2 * Smax)];
    });
    var rim = g.count() - ns, first = g.count(), c0 = [0, 0, 0];
    for (i = 0; i < ns; i++) { var p = rim + i; colFn(g.p[p * 3], -0.02, g.p[p * 3 + 2], c0); g.v(g.p[p * 3] * 0.97, -0.03, g.p[p * 3 + 2] * 0.97, c0, g.t[p * 2], g.t[p * 2 + 1]); }
    for (i = 0; i < ns; i++) { var r0 = rim + i, r1 = rim + (i + 1) % ns, s0 = first + i, s1 = first + (i + 1) % ns; g.i.push(r0, r1, s0, r1, s1, s0); }
    return { geo: g, Smax: Smax };
  }
  // A monochromatic random wave field (band-limited noise): its positive and
  // negative regions meander with a near-constant width, like the walls and
  // valleys of a maze coral. The same draws on both tiers keep one pattern.
  function waveField(rng, n, pitch) {
    // Random directions and a little spread in wavelength: evenly spaced ones
    // would build a quasi-crystal of rings instead of a maze.
    var w = [];
    for (var i = 0; i < n; i++) { var a = rng() * PI, k = TAU / pitch * (0.86 + 0.28 * rng()); w.push([k * Math.cos(a), k * Math.sin(a), rng() * TAU]); }
    return w;
  }
  // The field (unit variance) on a w x h grid from (x0, z0) in steps of d. Each
  // row advances every wave by a fixed rotation: multiply-adds, not cosines.
  function waveGrid(waves, w, h, x0, z0, d) {
    var n = waves.length, out = new Float32Array(w * h), c = new Float64Array(n), s = new Float64Array(n), cr = new Float64Array(n), sr = new Float64Array(n), norm = 1 / Math.sqrt(n / 2), i, j, q;
    for (q = 0; q < n; q++) { cr[q] = Math.cos(waves[q][0] * d); sr[q] = Math.sin(waves[q][0] * d); }
    for (j = 0; j < h; j++) {
      var z = z0 + (j + 0.5) * d;
      for (q = 0; q < n; q++) { var p = waves[q][0] * (x0 + 0.5 * d) + waves[q][1] * z + waves[q][2]; c[q] = Math.cos(p); s[q] = Math.sin(p); }
      for (i = 0; i < w; i++) {
        var f = 0;
        for (q = 0; q < n; q++) { var cq = c[q], sq = s[q]; f += cq; c[q] = cq * cr[q] - sq * sr[q]; s[q] = sq * cr[q] + cq * sr[q]; }
        out[j * w + i] = f * norm;
      }
    }
    return out;
  }
  function buildBrain(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(91), gr = c.growth, s = lerp(0.12, 1, Math.pow(gr, 0.8)) * (0.92 + 0.16 * rng());
    var R = 0.4 * s, H = R * lerp(0.38, 0.66, gr), ph = rng() * 9, h = c.health;
    // Brown walls over paler green, grey or cream valleys (Platygyra).
    var pals = [[0x70553a, 0x7f9a52], [0x66593a, 0x9a9a6e], [0x5a4630, 0x6f9050], [0x625f40, 0x8c9a76], [0x7a5e3e, 0x95a25a]];
    var pal = pals[Math.floor(rng() * pals.length)], wall = hex(pal[0]), valley = hex(pal[1]);
    // Broad, asymmetric growth lobes break the hemisphere without changing its footprint.
    var d = dome(c, R, H, high ? 44 : 24, high ? 128 : 72, function (r, a) {
      var x = Math.cos(a) * r, z = Math.sin(a) * r;
      return 1 + 0.22 * (noise2(x * 2.6 + ph, z * 2.6) - 0.5) + 0.06 * r * Math.sin(a * 3 + ph) + 0.04 * r * Math.sin(a - ph);
    }, function (x, y, z, col) {
      // Shade only (the pigment is in the map): low flanks and the tucked-under rim sit in shadow.
      var shade = 0.66 + 0.32 * smooth(-0.02, H * 0.85, y) + 0.06 * (noise3(x * 9, y * 9, z * 9 + ph) - 0.5); col[0] = col[1] = col[2] = shade;
    });
    // Valleys about 1.2 cm wide between walls of the same width, readable from a diver's distance.
    var Smax = d.Smax, tw = high ? 384 : 256, waves = waveField(rng, 20, 0.025), key = c.key('brain'), field = null, cw = [0, 0, 0];
    function fields() { return field || (field = waveGrid(waves, tw, tw, -Smax, -Smax, 2 * Smax / tw)); }
    var tex = kit.baked(key + '|pigment', tw, tw, function (u, v, out, i, j) {
      var f = fields()[j * tw + i], x = (u - 0.5) * 2 * Smax, z = (v - 0.5) * 2 * Smax, wallT = smooth(-0.3, 0.4, f), floor = 1 - smooth(-1.3, -0.4, f);
      mixc(valley, wall, wallT, cw);
      // Paler and darker patches across the colony; ragged septal grain on the valley floors.
      mulc(cw, 0.92 + 0.22 * (noise2(x * 4.5 + ph, z * 4.5) - 0.5) - 0.26 * floor + 0.16 * (noise2(x * 240, z * 240) - 0.5) * (1 - wallT));
      health(h, cw, x, f * 0.01, z, out, 0.85 * (1 - wallT));
    });
    var nmap = kit.bakedNormal(key, tw, tw, function (u, v, i, j) {
      var f = fields()[j * tw + i], wallT = smooth(-0.55, 0.55, f);
      return wallT + 0.06 * (1 - wallT) * noise2(u * 700, v * 700);
    }, (high ? 2.6 : 1.8) * (h === 'dead' ? 1.25 : 1));
    // Vertices carry a shallow share of the wall relief, so a grazing silhouette is ragged too.
    var vf = 0;
    for (var i = 0; i < d.geo.count(); i++) {
      var k = i * 3, y = d.geo.p[k + 1]; if (y <= 0) continue;
      var u = clamp(d.geo.t[i * 2], 0, 0.99999), v = clamp(d.geo.t[i * 2 + 1], 0, 0.99999);
      vf = 0; for (var q = 0; q < waves.length; q++) vf += Math.cos(waves[q][0] * (u - 0.5) * 2 * Smax + waves[q][1] * (v - 0.5) * 2 * Smax + waves[q][2]);
      var relief = (smooth(-0.6, 0.6, vf / Math.sqrt(waves.length / 2)) - 0.5) * 0.004 * s;
      var nx = d.geo.p[k] / (R * R), ny = y / (H * H), nz = d.geo.p[k + 2] / (R * R), nl = Math.hypot(nx, ny, nz) || 1;
      d.geo.p[k] += nx / nl * relief; d.geo.p[k + 1] += ny / nl * relief; d.geo.p[k + 2] += nz / nl * relief;
    }
    var mat = kit.std({ map: tex, normalMap: nmap, vertexColors: true, roughness: Math.min(0.98, coralRough(h) + 0.06), metalness: 0 }, coralSheen(c, null));
    kit.mesh(kit.geo(d.geo, 1), mat, 'colony', c.root);
  }
  function buildBoulder(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(93), gr = c.growth, s = lerp(0.12, 1, Math.pow(gr, 0.75)) * (0.9 + 0.2 * rng());
    var R = 0.75 * s, H = R * lerp(0.3, 0.7, gr), ph = rng() * 9, h = c.health;
    // Massive Porites: cream, yellow-brown, green or blue-grey tissue, paler on sunlit tops.
    var pals = [[0xae9862, 0x806b40], [0x9e7f4e, 0x6f5634], [0x7e8250, 0x5a603a], [0x8290a0, 0x5c6878]];
    var pal = pals[Math.floor(rng() * pals.length)], a1 = hex(pal[0]), a2 = hex(pal[1]), live = [0, 0, 0], tmp = [0, 0, 0], lobes = lerp(0.06, 0.2, gr);
    // Rounded hummocks rise over the dome: Porites lobata grows lumpy, knobbly tops.
    var knobs = [], nk = Math.round(lerp(1, 13, gr));
    for (var k = 0; k < nk; k++) { var kr = 0.85 * Math.sqrt(rng()), ka = rng() * TAU; knobs.push([Math.cos(ka) * kr, Math.sin(ka) * kr, 0.11 + 0.12 * rng(), (0.05 + 0.08 * rng()) * Math.min(1, gr * 1.4)]); }
    function bump(x, z) {
      var m = 0;
      for (var q = 0; q < knobs.length; q++) { var kb = knobs[q], dx = x - kb[0], dz = z - kb[1]; m += kb[3] * Math.exp(-(dx * dx + dz * dz) / (kb[2] * kb[2])); }
      return m;
    }
    function shape(x, z) { return 1 + bump(x, z) + lobes * (noise2(x * 3 + ph, z * 3) - 0.5) * 2 + 0.06 * (noise2(x * 9, z * 9 + ph) - 0.5); }
    var d = dome(c, R, H, high ? 40 : 20, high ? 120 : 60, function (r, a) { return shape(Math.cos(a) * r, Math.sin(a) * r) + 0.04 * r * Math.sin(a * 3 - ph); }, function (x, y, z, col) {
      // Hollows between hummocks and the low flanks hold shadow (and, on a dead colony, turf first).
      var px = x / R, pz = z / R, e = 0.06, m0 = shape(px, pz), lap = (shape(px + e, pz) + shape(px - e, pz) + shape(px, pz + e) + shape(px, pz - e) - 4 * m0) / (e * e);
      var cav = clamp(0.5 * smooth(0, 9, lap) + 0.55 * (1 - smooth(0, H * 0.7, y)), 0, 1);
      var patch = noise3(x * 6 + ph, y * 6, z * 6), fine = noise3(x * 34, y * 34, z * 34 + ph);
      mixc(a1, a2, smooth(0.3, 0.75, patch) * 0.8 + 0.3 * cav, live); mulc(live, 0.86 + 0.16 * smooth(0, H, y) + 0.1 * fine - 0.18 * cav);
      setc(col, lin(health(h, live, x, y, z, tmp, cav)));
    });
    // A compact rosette of septa around each recessed corallite, rather than
    // uniform stippling. Pigment and relief share the same cell field.
    var cc = [0, 0, 0, 0, 0], repeats = Math.max(3, Math.round(R * 14)), tw = high ? 256 : 128;
    function surface(u, v) {
      cellsP(u * 16, v * 16, 16, 31, cc);
      var a = Math.atan2(cc[4], cc[3]), ribs = 0.5 + 0.5 * Math.cos(a * 12 + cc[2] * 4), ring = band(cc[0] - 0.27, 0.075, 0.055), cup = 1 - smooth(0.07, 0.2, cc[0]);
      return [ring, cup, ribs, cc[2], 1 - smooth(0, 0.09, cc[1] - cc[0])];
    }
    var field = lazyField(tw, tw, 5, surface), tex, nmap;
    if (h === 'dead') { tex = deadGrain(kit, tw, 16, repeats); nmap = deadNormal(kit, tw, 16, repeats); }
    else {
      tex = kit.baked('boulder|pores', tw, tw, function (u, v, out, i, j) {
        var o = field.at(i, j), p = field.data, shade = 0.88 + 0.08 * p[o] - 0.24 * p[o + 1] + 0.05 * p[o + 2] * p[o] - 0.04 * p[o + 4] + 0.03 * (p[o + 3] - 0.5);
        out[0] = out[1] = out[2] = shade;
      }, true, true, false, repeats);
      nmap = kit.bakedNormal('boulder|pores', tw, tw, function (u, v, i, j) { var o = field.at(i, j), p = field.data; return 0.64 * p[o] - 0.38 * p[o + 1] + 0.13 * p[o + 2] * p[o] - 0.08 * p[o + 4]; }, high ? 2.0 : 1.5, true, repeats);
    }
    var mat = kit.std({ map: tex, normalMap: nmap, vertexColors: true, roughness: Math.min(0.98, coralRough(h) + 0.08) }, coralSheen(c, null));
    kit.mesh(kit.geo(d.geo, 1), mat, 'colony', c.root);
  }
  // Pocillopora: a compact rounded crown of stout, forking upright branches
  // covered in verrucae (warty knobs), pink-brown with paler blunt tips.
  // The limestone skeleton stays rigid; nearby soft polyps carry flow.
  function buildCauliflower(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(107), gr = c.growth, h = c.health;
    var s = lerp(0.14, 1, Math.pow(gr, 0.78)) * (0.92 + rng() * 0.16), ph = rng() * TAU;
    var g = new Geo(), pals = [[0x9a6a5a, 0xdab2a2], [0x957656, 0xdcc6a2], [0x86687a, 0xd6b6c6], [0x7e6a4c, 0xd2c09c]], pal = pals[Math.floor(rng() * pals.length)];
    var base = hex(pal[0]), tips = hex(pal[1]), live = [0, 0, 0], tmp = [0, 0, 0], sides = high ? 6 : 4, segs = high ? 3 : 2, Rc = 0.17 * s, up = [0, 1, 0];
    function colour(x, y, z, tip) {
      var cav = 1 - smooth(0, Rc * 1.1, y);
      mixc(base, tips, 0.06 + 0.62 * tip, live);
      mulc(live, 0.76 + 0.2 * smooth(0, Rc * 1.2, y) + 0.1 * noise3(x * 37 + ph, y * 37, z * 37));
      return lin(health(h, live, x, y, z, tmp, cav * 0.8));
    }
    function unit(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    // A short, fused foot.
    var foot = g.tube([[0, -0.012, 0], [0, 0.015 * s, 0], [0, 0.035 * s, 0]], function (t) { return 0.05 * s * (1 - 0.3 * t); }, sides + 2, function (t) { return colour(0, 0.05 * s * t, 0, 0); });
    for (var q = foot; q < g.count(); q++) { g.t[q * 2] = (q - foot) % (sides + 2) / (sides + 2); g.t[q * 2 + 1] = g.p[q * 3 + 1] / (0.04 * s); }
    var levels = gr > 0.5 ? 2 : gr > 0.18 ? 1 : 0, prim = Math.max(3, Math.round(lerp(4, 10, gr))), knobs = high ? 6 : 1, L0 = Rc * (levels === 2 ? 0.44 : levels === 1 ? 0.62 : 1);
    function branch(p, d, len, r, level) {
      var b1 = rng(), b2 = rng(), side = unit([d[2] + 0.01, 0, -d[0]]), lift = 0.25 * (1 - d[1]);
      var e = [p[0] + (d[0] + side[0] * (b1 - 0.5) * 0.3) * len, p[1] + (d[1] + lift) * len, p[2] + (d[2] + side[2] * (b1 - 0.5) * 0.3) * len], m = [p[0] + d[0] * len * 0.5, p[1] + d[1] * len * 0.5, p[2] + d[2] * len * 0.5], pts = [];
      for (var k = 0; k <= segs; k++) { var t = k / segs, u = 1 - t; pts.push([u * u * p[0] + 2 * u * t * m[0] + t * t * e[0], u * u * p[1] + 2 * u * t * m[1] + t * t * e[1], u * u * p[2] + 2 * u * t * m[2] + t * t * e[2]]); }
      var first = g.tube(pts, function (t) { return r * (1 - 0.12 * t) * (level === 0 && t > 0.99 ? 0.72 : 1); }, sides, function (t) { var pp = pts[Math.round(t * segs)]; return colour(pp[0], pp[1], pp[2], level === 0 ? smooth(0.55, 1, t) : 0); });
      for (var vi = first; vi < g.count(); vi++) { g.t[vi * 2] = (vi - first) % sides / sides; g.t[vi * 2 + 1] = Math.min(segs, Math.floor((vi - first) / sides)) / segs * len / (r * TAU); }
      // Verrucae: rounded knobs grown from a buried collar on the branch wall.
      // Six draws per branch on both tiers, so a tier never reshapes the colony.
      for (k = 0; k < 6; k++) {
        var kt = 0.18 + 0.72 * (k + rng() * 0.8) / 6, ka = rng() * TAU, kq = rng(); if (k >= knobs) continue;
        var at = pts[Math.min(segs, Math.round(kt * segs))], n0 = unit([Math.cos(ka) * side[0] + Math.sin(ka) * (d[1] * side[2] - d[2] * side[1]), Math.sin(ka) * (d[2] * side[0] - d[0] * side[2]), Math.cos(ka) * side[2] + Math.sin(ka) * (d[0] * side[1] - d[1] * side[0])]);
        var kr = r * (0.5 + 0.14 * kq), k0 = g.tube([[at[0] + n0[0] * r * 0.55, at[1] + n0[1] * r * 0.55, at[2] + n0[2] * r * 0.55], [at[0] + n0[0] * (r + kr * 0.55) + d[0] * kr * 0.4, at[1] + n0[1] * (r + kr * 0.55) + d[1] * kr * 0.4, at[2] + n0[2] * (r + kr * 0.55) + d[2] * kr * 0.4]], kr, high ? 4 : 3, function () { return colour(at[0], at[1], at[2], level === 0 ? 0.25 : 0.1); });
        for (vi = k0; vi < g.count(); vi++) { g.t[vi * 2] = g.p[vi * 3] / (0.05 * s); g.t[vi * 2 + 1] = (g.p[vi * 3 + 1] + g.p[vi * 3 + 2]) / (0.05 * s); }
      }
      if (level <= 0) return;
      var nd = unit([e[0] - m[0], e[1] - m[1], e[2] - m[2]]);
      for (var f = 0; f < 2; f++) {
        var ang = (f ? 1 : -1) * (0.3 + 0.2 * b2), ca = Math.cos(ang), sa = Math.sin(ang);
        branch(e, unit([nd[0] * ca + side[0] * sa, nd[1] * ca + 0.12, nd[2] * ca + side[2] * sa]), len * 0.76, r * 0.86, level - 1);
      }
    }
    for (var i = 0; i < prim; i++) {
      // Inner branches stand upright; outer ones lean out to round the crown.
      var a = i * 2.399963 + ph, rho = Math.sqrt((i + 0.5) / prim), el = (1.45 - 0.75 * rho) + 0.1 * (rng() - 0.5);
      branch([Math.cos(a) * 0.03 * s * rho, 0.03 * s, Math.sin(a) * 0.03 * s * rho], [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)], L0 * (0.9 + 0.2 * rng()), 0.015 * s * (1 + 0.15 * (1 - rho)), levels);
    }
    var maps = coralMaps(kit, h, 128, 11, 2);
    var mat = kit.std({ map: maps[0], normalMap: maps[1], vertexColors: true, roughness: Math.min(0.98, coralRough(h) + 0.06) }, coralSheen(c, pal[1]));
    kit.mesh(kit.geo(g, 1), mat, 'colony', c.root);
  }
  // Montipora foliosa: thin leaf-like plates that spiral up in tiers and whorls,
  // tilted toward the light, with pale growing margins and fine ridges that
  // radiate toward the rim. It is distinct from a branching table.
  function buildFoliose(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(109), gr = c.growth, h = c.health;
    var s = lerp(0.1, 1, Math.pow(gr, 0.8)) * (0.92 + 0.16 * rng()), ph = rng() * TAU;
    var pals = [[0x7c5a48, 0xd8c2a8], [0x6c5e42, 0xd6cca6], [0x76546a, 0xdcc2ce], [0x626040, 0xd0cc9c]], pal = pals[Math.floor(rng() * pals.length)];
    var base = hex(pal[0]), rim = hex(pal[1]), g = new Geo(), live = [0, 0, 0], tmp = [0, 0, 0];
    var nr = high ? 8 : 4, na = high ? 30 : 12, plates = Math.max(1, Math.round(lerp(1, 9, gr))), top = 0.03 * s;
    // A low lumpy core that every plate grows from.
    blob(T, g, 0, 0.03 * s, 0, 0.075 * s, 0.05 * s, 0.07 * s, function (x, y, z) { return lin(health(h, mulc(setc(live, base), 0.7), x, y, z, tmp, 0.8)); }, high ? 12 : 8, high ? 6 : 4);
    for (var p = 0; p < plates; p++) {
      var f = plates > 1 ? p / (plates - 1) : 0, az = p * 2.399963 + ph, Rp = s * (0.42 - 0.18 * f) * (0.88 + 0.24 * rng()), y0 = s * (0.035 + 0.17 * f), span = PI * (0.85 + 0.45 * rng());
      var tilt = 0.08 + 0.2 * rng() + 0.1 * f, curl = 0.06 + 0.12 * rng(), cx = Math.cos(az) * 0.05 * s * f, cz = Math.sin(az) * 0.05 * s * f, wph = rng() * TAU, first = g.count(), i, j;
      top = Math.max(top, y0);
      for (i = 0; i <= nr; i++) for (j = 0; j <= na; j++) {
        var rr = 0.12 + 0.88 * i / nr, ja = j / na, ang = az + (ja - 0.5) * span;
        // The leaf narrows toward the ends of its arc; its margin undulates.
        var e = Rp * (0.9 + 0.07 * Math.sin(ang * 3 + wph) + 0.04 * Math.sin(ang * 7 - wph)) * (0.5 + 0.5 * Math.pow(Math.sin(PI * ja), 0.6)), d = e * rr;
        var x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d, y = y0 + d * tilt + curl * d * d / Math.max(0.05, Rp) + 0.03 * s * Math.sin(ang * 5 + wph) * rr * rr;
        var margin = Math.max(smooth(0.86, 1, rr), smooth(0.9, 1, Math.abs(ja - 0.5) * 2));
        mixc(base, rim, 0.02 + 0.85 * margin, live); mulc(live, 0.78 + 0.18 * f + 0.1 * noise3(x * 18 + ph, p * 2, z * 18));
        g.v(x, y, z, lin(health(h, live, x, y, z, tmp, 0.55 * (1 - rr) * (1 - f))), 0.5 + Math.cos(ang) * rr * 0.48, 0.5 + Math.sin(ang) * rr * 0.48);
      }
      for (i = 0; i < nr; i++) for (j = 0; j < na; j++) { var a0 = first + i * (na + 1) + j, b0 = a0 + na + 1; g.i.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      // A short fold joins each raised plate to the core.
      if (p && y0 > 0.07 * s) g.tube([[cx * 0.3, 0.03 * s, cz * 0.3], [cx + Math.cos(az) * Rp * 0.06, y0 * 0.6, cz + Math.sin(az) * Rp * 0.06], [cx + Math.cos(az) * Rp * 0.12, y0 + Rp * 0.12 * tilt, cz + Math.sin(az) * Rp * 0.12]], function (t) { return (0.03 - 0.012 * t) * s; }, high ? 6 : 4,
        function (t) { return lin(health(h, mulc(setc(live, base), 0.72), cx, y0 * t, cz, tmp, 0.7)); });
    }
    var cc = [0, 0, 0, 0, 0], tw = high ? 256 : 128;
    function relief(u, v) {
      var x = u - 0.5, y = v - 0.5, r = Math.hypot(x, y), a = Math.atan2(y, x);
      var ridges = Math.pow(0.5 + 0.5 * Math.cos(a * 68 + 1.4 * Math.sin(r * 35 + a * 5)), 4) * smooth(0.035, 0.18, r);
      cells(u * 62, v * 62, 47, cc);
      var cup = 1 - smooth(0.07, 0.2, cc[0]), lip = band(cc[0] - 0.25, 0.06, 0.06);
      return [ridges, cup, lip];
    }
    var field = lazyField(tw, tw, 3, relief);
    var tex = kit.baked('foliose|relief', tw, tw, function (u, v, out, i, j) { var o = field.at(i, j), p = field.data; out[0] = out[1] = out[2] = 0.88 + 0.065 * p[o] + 0.035 * p[o + 2] - 0.14 * p[o + 1]; });
    var normal = kit.bakedNormal('foliose|relief', tw, tw, function (u, v, i, j) { var o = field.at(i, j), p = field.data; return 0.6 * p[o] - 0.28 * p[o + 1] + 0.12 * p[o + 2]; }, h === 'dead' ? 2.2 : 1.7);
    var mat = kit.std({ map: tex, normalMap: normal, vertexColors: true, roughness: coralRough(h), side: T.DoubleSide }, coralSheen(c, pal[1]));
    kit.mesh(kit.geo(g, 1), mat, 'colony', c.root);
  }
  // Branching Acropora (staghorn, fragments on restoration frames). Shape draws are tier independent.
  function acropora(geo, rng, o) {
    var tips = 0, made = 0, max = o.max || 1e9;
    function branch(p, d, len, r, depth) {
      made++;
      var b1 = rng(), b2 = rng(), b3 = rng(), b4 = rng(), side = [d[2], 0, -d[0]], sl = Math.sqrt(side[0] * side[0] + side[2] * side[2]) || 1;
      side = [side[0] / sl, 0, side[2] / sl];
      var bend = (b1 - 0.5) * 0.5, lift = o.up * (0.3 + 0.4 * b2), pts = [];
      var e = [p[0] + (d[0] + side[0] * bend) * len, p[1] + (d[1] + lift) * len, p[2] + (d[2] + side[2] * bend) * len];
      var m = [p[0] + d[0] * len * 0.5, p[1] + d[1] * len * 0.5, p[2] + d[2] * len * 0.5];
      for (var s = 0; s <= o.segs; s++) { var t = s / o.segs, u = 1 - t; pts.push([u * u * p[0] + 2 * u * t * m[0] + t * t * e[0], u * u * p[1] + 2 * u * t * m[1] + t * t * e[1], u * u * p[2] + 2 * u * t * m[2] + t * t * e[2]]); }
      var first = geo.tube(pts, function (t) { return r * (1 - 0.38 * t) * (1 + 0.035 * Math.sin(t * 17 + b2 * 9)); }, o.sides, function (t, s) { var c2 = o.col(depth, t); return mulc(c2, 0.91 + 0.09 * Math.sin(s * TAU * 3 + t * 24 + b1 * 9)); });
      // Tube UVs follow branch length and circumference, keeping the corallite cups visible.
      for (var vi = first; vi < geo.count(); vi++) { var row = Math.min(o.segs, Math.floor((vi - first) / o.sides)); geo.t[vi * 2] = (vi - first) % o.sides / o.sides; geo.t[vi * 2 + 1] = row / o.segs * len / Math.max(0.012, r * TAU); }
      // Radial corallites make the close-up branch outline a living skeleton, not a smooth rod.
      if (o.polyps && depth < 3) for (var polyp = 0; polyp < 2; polyp++) {
        var at = 0.38 + polyp * 0.28, ring = Math.round(at * o.segs), pp = pts[ring], angle = b4 * TAU + polyp * 2.4;
        var ux = Math.cos(angle), uz = Math.sin(angle), rr = r * (1 - 0.38 * at), bump = r * 0.38;
        geo.tube([[pp[0] + ux * rr * 0.82, pp[1], pp[2] + uz * rr * 0.82], [pp[0] + ux * (rr + bump), pp[1] + bump * 0.7, pp[2] + uz * (rr + bump)]], bump * 0.58, 4, function () { return o.col(depth, at); });
      }
      var nd = [e[0] - m[0], e[1] - m[1], e[2] - m[2]], nl = Math.sqrt(nd[0] * nd[0] + nd[1] * nd[1] + nd[2] * nd[2]) || 1;
      nd = [nd[0] / nl, nd[1] / nl, nd[2] / nl];
      if (depth <= 0 || made >= max) { tips++; return; }
      var forks = b3 < o.fork && made + 1 < max ? 2 : 1;
      for (var f = 0; f < forks; f++) {
        var ang = (forks === 1 ? 0 : (f ? 1 : -1)) * (0.38 + 0.25 * b4), ca = Math.cos(ang), sa = Math.sin(ang);
        var dir = [nd[0] * ca + side[0] * sa, nd[1] + 0.05, nd[2] * ca + side[2] * sa], dl = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
        var join = f && forks > 1 ? [0.0784 * p[0] + 0.4032 * m[0] + 0.5184 * e[0], 0.0784 * p[1] + 0.4032 * m[1] + 0.5184 * e[1], 0.0784 * p[2] + 0.4032 * m[2] + 0.5184 * e[2]] : e;
        branch(join, [dir[0] / dl, dir[1] / dl, dir[2] / dl], len * (0.65 + 0.22 * (f ? b2 : b1)), r * (f ? 0.68 : 0.78), depth - 1);
      }
    }
    var cap = o.max ? Math.max(1, Math.floor(o.max / o.primaries)) : 1e9;
    for (var i = 0; i < o.primaries; i++) {
      max = made + cap;
      var a = i / o.primaries * TAU + rng() * 0.9, el = o.elev + rng() * 0.3, d = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)];
      branch([o.base[0], o.base[1], o.base[2]], d, o.len * (0.8 + 0.4 * rng()), o.rad, o.depth);
    }
    return tips;
  }
  function acroColor(h, base, tip) {
    var live = [0, 0, 0], out = [0, 0, 0];
    return function (depth, t) { mixc(base, tip, depth === 0 ? smooth(0.65, 1, t) : 0, live); health(h, live, depth * 1.7 + t, t * 3.1, depth * 0.7, out); return lin(out); };
  }
  // Branching Acropora thicket: stout antler branches whose leading tips keep
  // growing while side branches split off and turn upward. Every growing tip
  // ends in a pale axial corallite; tubular radial corallites roughen the walls.
  // The branching draws are tier independent: both tiers grow the same colony.
  function buildStaghorn(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(95), gr = c.growth, g = new Geo(), h = c.health;
    var pals = [[0x8a6a46, 0xece4f4], [0x7a6649, 0xbcd4f2], [0x8e7c50, 0xf2eee0], [0x6c5c46, 0xe2c6ec]], pal = pals[Math.floor(rng() * pals.length)];
    var base = hex(pal[0]), tipC = hex(pal[1]), live = [0, 0, 0], tmp = [0, 0, 0], sides = high ? 6 : 4, segs = high ? 3 : 2;
    var depth = Math.round(lerp(0, 4, gr)), prim = Math.max(1, Math.round(lerp(1, 7, gr))), MAX = 130, made = 0, cap = 0, top = 0.3;
    function unit(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    function colour(x, y, z, tip) {
      mixc(base, tipC, tip, live); mulc(live, 0.72 + 0.26 * smooth(0, top, y) + 0.08 * noise3(x * 23, y * 23, z * 23));
      return lin(health(h, live, x, y, z, tmp, 0.75 * (1 - smooth(0, top * 0.8, y))));
    }
    function branch(p, d, len, r, level) {
      made++;
      var b1 = rng(), b2 = rng(), b3 = rng(), b4 = rng(), side = unit([d[2] + 0.001, 0, -d[0]]);
      var e = [p[0] + (d[0] * 0.85 + side[0] * (b1 - 0.5) * 0.35) * len, p[1] + (d[1] * 0.85 + 0.16) * len, p[2] + (d[2] * 0.85 + side[2] * (b1 - 0.5) * 0.35) * len];
      var m = [p[0] + d[0] * len * 0.5, p[1] + d[1] * len * 0.5, p[2] + d[2] * len * 0.5], pts = [], last = level <= 0 || made >= cap;
      for (var k = 0; k <= segs; k++) { var t = k / segs, u = 1 - t; pts.push([u * u * p[0] + 2 * u * t * m[0] + t * t * e[0], u * u * p[1] + 2 * u * t * m[1] + t * t * e[1], u * u * p[2] + 2 * u * t * m[2] + t * t * e[2]]); }
      // A growing tip: about the last 2.5 cm is pale, with a slightly swollen axial corallite.
      var tipFrom = 1 - Math.min(0.35, 0.022 / len);
      var first = g.tube(pts, function (t) { return r * (1 - 0.16 * t) * (last && t > 0.99 ? 1.08 : 1); }, sides, function (t) {
        var pp = pts[Math.round(t * segs)]; return colour(pp[0], pp[1], pp[2], last ? (t > 0.99 ? 0.62 : 0.3 * smooth(tipFrom - 0.1, 1, t)) : 0.08 * t);
      });
      for (var vi = first; vi < g.count(); vi++) { g.t[vi * 2] = (vi - first) % sides / sides; g.t[vi * 2 + 1] = Math.min(segs, Math.floor((vi - first) / sides)) / segs * len / Math.max(0.01, r * TAU); }
      if (high) for (k = 0; k < 3; k++) {
        // Radial corallites: short tubes angled toward the tip.
        var at = pts[1 + (k % (segs - 1))], ang = b4 * TAU + k * 2.1, n0 = [Math.cos(ang) * side[0] + Math.sin(ang) * (d[1] * side[2] - d[2] * side[1]), Math.sin(ang) * (d[2] * side[0] - d[0] * side[2]), Math.cos(ang) * side[2] + Math.sin(ang) * (d[0] * side[1] - d[1] * side[0])];
        var rr = r * 0.95, bump = r * 0.5;
        g.tube([[at[0] + n0[0] * rr * 0.7, at[1] + n0[1] * rr * 0.7, at[2] + n0[2] * rr * 0.7], [at[0] + n0[0] * (rr + bump) + d[0] * bump, at[1] + n0[1] * (rr + bump) + d[1] * bump, at[2] + n0[2] * (rr + bump) + d[2] * bump]], bump * 0.55, 3, function () { return colour(at[0], at[1], at[2], 0.25); });
      }
      if (last) return;
      var nd = unit([e[0] - m[0], e[1] - m[1], e[2] - m[2]]);
      // The leader carries on; a side branch splits off below the tip and turns upward.
      branch(e, unit([nd[0], nd[1] + 0.04, nd[2]]), len * (0.8 + 0.1 * b2), r * 0.92, level - 1);
      if (b3 < 0.82 && made < cap) {
        var sa = (b4 < 0.5 ? 1 : -1) * (0.62 + 0.3 * b2), at2 = pts[Math.max(1, segs - 1)], ca = Math.cos(sa), sn = Math.sin(sa);
        branch(at2, unit([nd[0] * ca + side[0] * sn, nd[1] * ca + 0.2, nd[2] * ca + side[2] * sn]), len * (0.68 + 0.14 * b1), r * 0.8, level - 1);
      }
    }
    var len0 = lerp(0.07, 0.2, Math.pow(gr, 0.7)), r0 = lerp(0.009, 0.017, gr), per = Math.max(1, Math.floor(MAX / prim));
    top = len0 * (1 + 0.85 * depth);
    for (var i = 0; i < prim; i++) {
      cap = made + per;
      var a = i / prim * TAU + rng() * 0.9, el = 0.32 + rng() * 0.5;
      branch([0, 0, 0], [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)], len0 * (0.85 + 0.3 * rng()), r0, depth);
    }
    var maps = coralMaps(kit, h, 128, 8, 1);
    var mat = kit.std({ map: maps[0], normalMap: maps[1], vertexColors: true, roughness: coralRough(h) }, coralSheen(c, pal[1]));
    kit.mesh(kit.geo(g, 1), mat, 'colony', c.root);
  }
  // Tabular Acropora: a flat-topped table of fused horizontal branches on a
  // central stalk. Seen from above it is a brush of short upturned branchlets
  // with pale tips; the thin margin ends in a fringe of outward finger tips.
  function buildTable(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(97), gr = c.growth, s = lerp(0.07, 1, Math.pow(gr, 0.85)) * (0.9 + 0.2 * rng());
    var R = 0.75 * s, top = lerp(0.04, 0.26, gr) * (0.9 + 0.2 * rng()), thick = 0.009 + 0.023 * s, ph = rng() * 9, h = c.health;
    // Brown, olive or tan tissue; branchlet tips pale lilac, blue or pink.
    var pals = [[0x6c6444, 0xcfc4ec], [0x786448, 0xbcd6f0], [0x5e6648, 0xd0e6f0], [0x80704c, 0xeccce0]], palIndex = Math.floor(rng() * pals.length), pal = pals[palIndex], baseC = hex(pal[0]), rimC = hex(pal[1]);
    var g = new Geo(), live = [0, 0, 0], tmp = [0, 0, 0], nr = high ? 8 : 6, ns = high ? 96 : 48, white = [1, 1, 1], under = [0.5, 0.5, 0.5];
    function shoot(x, y, z, t) { mixc(baseC, rimC, t, live); return lin(health(h, live, x, y, z, tmp, 0.3 * (1 - t))); }
    // The stalk, darker in the table's shade.
    var st = g.tube([[0, -0.02, 0], [R * 0.035, top * 0.38, 0], [R * 0.025, top * 0.75, R * 0.018], [0, top - thick, 0]], function (t) { return (0.04 + 0.065 * s) * (1 - 0.28 * t); }, high ? 12 : 6, function (t) { return lin(health(h, mixc(baseC, [0.3, 0.26, 0.2], 0.35, tmp), t, t, 0, live, 0.8)); });
    for (var q = st; q < g.count(); q++) { g.t[q * 2] = 0.012; g.t[q * 2 + 1] = 0.012; }
    function edge(a) { return R * (0.86 + 0.085 * Math.sin(3 * a + ph) + 0.055 * Math.sin(7 * a + 2 * ph) + 0.028 * Math.sin(25 * a + ph) + 0.01 * Math.sin(53 * a)); }
    function surf(r, a) {
      return top + 0.055 * R * r * r + R * 0.045 * Math.sin(a * 3 + ph) * r + R * 0.019 * Math.sin(a * 11 - ph) * r * r + R * 0.012 * Math.sin(a * 22 + r * 9) * r;
    }
    // Plate vertices carry shade only; the brush pigment is in the map. Plate UVs
    // fill a disc of radius 0.47; one corner of the map is plain white, where the
    // branchlets, stalk and fringe sample it and keep their own vertex colours.
    g.polar(nr, ns, function (r, a, col) {
      var e = edge(a) * r, x = Math.cos(a) * e, z = Math.sin(a) * e, sh = 0.8 + 0.2 * noise2(x * 9 + ph, z * 9);
      col[0] = col[1] = col[2] = sh;
      return [x, surf(r, a), z, 0.5 + 0.47 * x / R, 0.5 + 0.47 * z / R];
    });
    var rimStart = g.count() - ns;
    g.polar(Math.max(2, nr >> 1), ns, function (r, a, col) {
      var e = edge(a) * r * 0.995, x = Math.cos(a) * e, z = Math.sin(a) * e;
      setc(col, under);
      return [x, surf(r, a) - thick * (1 - 0.68 * r), z, 0.5 + 0.47 * x / R, 0.5 + 0.47 * z / R];
    }, true);
    var low = g.count() - ns;
    for (var i = 0; i < ns; i++) { var t0 = rimStart + i, t1 = rimStart + (i + 1) % ns, u0 = low + i, u1 = low + (i + 1) % ns; g.i.push(t0, u0, t1, t1, u0, u1); }
    var plateEnd = g.count();
    // Radiating, partly fused primary branches carry the canopy from the stalk;
    // they show beneath the thin growing edge when swimming past it.
    var spokes = high ? 12 : 6;
    for (i = 0; i < spokes; i++) {
      var sa = i / spokes * TAU + ph, pts = [];
      for (var sj = 0; sj < 4; sj++) {
        var sr = 0.12 + sj * 0.27, aa = sa + 0.075 * Math.sin(sj * 1.7 + ph), er = edge(aa) * sr;
        pts.push([Math.cos(aa) * er, surf(sr, aa) - thick * (0.9 - sr * 0.6) - 0.022 * s * (1 - sr), Math.sin(aa) * er]);
      }
      g.tube(pts, function (t) { return s * lerp(0.038, 0.008, t); }, high ? 5 : 3, function (t) { return mulc(shoot(Math.cos(sa) * t, top, Math.sin(sa) * t, t * 0.1), 0.6); });
    }
    // Upturned branchlets over the plate, densest and shortest toward the margin,
    // then a fringe of outward finger tips around the thin edge.
    var shoots = Math.max(6, Math.round((high ? 220 : 64) * (0.2 + 0.8 * gr))), fringe = Math.max(8, Math.round((high ? 120 : 52) * (0.3 + 0.7 * gr))), stalkSides = high ? 5 : 4;
    for (i = 0; i < shoots; i++) {
      var a = i * 2.399963 + ph + 0.025 * Math.sin(i * 7.1), rad = Math.sqrt((i + 0.5) / shoots) * 0.93, e = edge(a) * rad, x = Math.cos(a) * e, z = Math.sin(a) * e, y = surf(rad, a);
      var variation = noise2(i * 0.47 + ph, 2.3), sh = s * (0.035 + 0.05 * variation) * (1 - 0.4 * smooth(0.7, 1, rad)), lean = sh * (0.2 + 0.35 * variation) * rad, width = s * (0.009 + 0.004 * variation);
      g.tube([[x, y - 0.006 * s, z], [x + Math.cos(a) * lean * 0.3, y + sh * 0.55, z + Math.sin(a) * lean * 0.3], [x + Math.cos(a) * lean, y + sh, z + Math.sin(a) * lean]], function (t) { return width * (1 - 0.4 * t); }, stalkSides, function (t) { return shoot(x, y + sh * t, z, 0.08 + 0.8 * smooth(0.55, 1, t)); });
    }
    for (i = 0; i < fringe; i++) {
      var fa = (i + 0.5 * noise2(i * 0.9, 4.1)) / fringe * TAU, fr = edge(fa) * 0.97, fx = Math.cos(fa) * fr, fz = Math.sin(fa) * fr, fy = surf(0.97, fa) - thick * 0.25, reach = s * (0.03 + 0.03 * noise2(i * 0.61, 7.7)), fw = s * 0.008;
      g.tube([[fx - Math.cos(fa) * reach * 0.3, fy, fz - Math.sin(fa) * reach * 0.3], [fx + Math.cos(fa) * reach * 0.5, fy + reach * 0.15, fz + Math.sin(fa) * reach * 0.5], [fx + Math.cos(fa) * reach, fy + reach * 0.45, fz + Math.sin(fa) * reach]], function (t) { return fw * (1 - 0.35 * t); }, stalkSides - 1, function (t) { return shoot(fx, fy, fz, 0.25 + 0.7 * smooth(0.4, 1, t)); });
    }
    for (i = plateEnd; i < g.count(); i++) { g.t[i * 2] = 0.012; g.t[i * 2 + 1] = 0.012; }
    // The brush seen from above: one branchlet per cell, its pale axial corallite
    // ringed by darker living tissue, deep shade between them. Plates of similar
    // size, palette and health share it.
    var cc = [0, 0, 0, 0, 0], tw = high ? 512 : 256, tips = Math.max(4, Math.round(R * 2 / 0.018)), col = [0, 0, 0];
    var pair = [0, 0], field = lazyField(tw, tw, 2, function (u, v) { cells(u * tips, v * tips, 41, cc); pair[0] = cc[0]; pair[1] = cc[2]; return pair; });
    var tex = kit.baked('table|brush|' + tips + '|' + palIndex + '|' + h, tw, tw, function (u, v, out, i, j) {
      var ru = Math.min(1, Math.hypot(u - 0.5, v - 0.5) / 0.47);
      if (u < 0.04 && v < 0.04) { setc(out, white); return; }
      var o = field.at(i, j), d0 = field.data[o], tipT = 1 - smooth(0.1, 0.24, d0), gap = smooth(0.3, 0.48, d0);
      // Paler, bluer tips crowd the actively growing margin.
      mixc(baseC, rimC, clamp(tipT * (0.55 + 0.45 * smooth(0.6, 1, ru)) + 0.15 * smooth(0.85, 1, ru), 0, 1), col);
      mulc(col, (1 - 0.45 * gap) * (0.92 + 0.16 * (field.data[o + 1] - 0.5)));
      health(h, col, u * R * 2, tipT * 0.01, v * R * 2, out, 0.45 * gap);
    });
    var nmap = kit.bakedNormal('table|tips|' + tips, tw, tw, function (u, v, i, j) { var o = field.at(i, j), d0 = field.data[o]; return 0.8 * band(d0 - 0.29, 0.07, 0.06) - 0.3 * (1 - smooth(0.07, 0.22, d0)) - 0.5 * smooth(0.3, 0.5, d0); }, high ? 2 : 1.4);
    var mat = kit.std({ map: tex, normalMap: nmap, vertexColors: true, roughness: coralRough(h), side: T.DoubleSide }, coralSheen(c, pal[1]));
    kit.mesh(kit.geo(g, 1), mat, 'colony', c.root);
  }
  // Fungia: one free-living polyp, a low domed disc lying loose on the sand.
  // Fine septa radiate from a slit mouth; their toothed crests catch the light.
  function buildMushroom(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(99), gr = c.growth, s = lerp(0.15, 1, Math.pow(gr, 0.8)) * (0.9 + 0.2 * rng()), R = 0.11 * s, H = 0.032 * s, h = c.health;
    var pals = [[0x74583a, 0xc4aa84], [0x667046, 0xb4c48c], [0x86684a, 0xd4bc98], [0x7a6250, 0xcab49a]], pal = pals[Math.floor(rng() * pals.length)], body = hex(pal[0]), tipC = hex(pal[1]);
    var g = new Geo(), ns = high ? 192 : 96, nr = high ? 16 : 8, live = [0, 0, 0], tmp = [0, 0, 0], elong = 1 + 0.2 * rng();
    g.polar(nr, ns, function (r, a, col) {
      var k = Math.round(a / TAU * ns), spoke = k % 2 === 0, major = k % 4 === 0, slit = Math.exp(-Math.pow(Math.sin(a) * r / 0.05, 2)) * (1 - smooth(0.0, 0.28, r));
      var ridge = (spoke ? (major ? 1 : 0.6) : 0) * smooth(0.1, 0.3, r), y = H * Math.pow(Math.max(0, 1 - r * r), 0.6) + 0.0009 * s * ridge - 0.01 * s * slit;
      var rr = R * r * (1 + 0.012 * (spoke ? 1 : -1) * smooth(0.92, 1, r) + 0.02 * Math.sin(a * 5 + elong * 9)), x = Math.cos(a) * rr * elong, z = Math.sin(a) * rr;
      // Septal crests paler, grooves darker; the margin is the palest growing edge.
      mixc(body, tipC, ridge * (0.25 + 0.45 * r) + 0.25 * smooth(0.85, 1, r), live); mulc(live, 0.82 + 0.14 * ridge + 0.06 * noise2(x * 60, z * 60)); if (slit > 0.5) mixc(live, [0.22, 0.17, 0.15], 0.55, live);
      setc(col, lin(health(h, live, x, y, z, tmp, spoke ? 0.15 : 0.55)));
      return [x, y, z, 0.5 + x / (2.2 * R * elong), 0.5 + z / (2.2 * R)];
    });
    var rim = g.count() - ns;
    g.polar(2, ns, function (r, a, col) { setc(col, lin(health(h, mixc(body, [0.3, 0.25, 0.2], 0.4, live), r, 0, a, tmp, 0.8))); return [Math.cos(a) * R * r * 0.99 * elong, 0.002, Math.sin(a) * R * r * 0.99]; }, true);
    var bot = g.count() - ns;
    for (var i = 0; i < ns; i++) { var t0 = rim + i, t1 = rim + (i + 1) % ns, b0 = bot + i, b1 = bot + (i + 1) % ns; g.i.push(t0, b0, t1, t1, b0, b1); }
    // Many more septa than the mesh carries, each with a row of small teeth.
    function septa(u, v) { var x = u - 0.5, z = v - 0.5, r = Math.hypot(x, z), a = Math.atan2(z, x), crest = Math.pow(0.5 + 0.5 * Math.cos(a * 144), 3); return [crest * smooth(0.025, 0.1, r), 0.5 + 0.5 * Math.sin(r * 700 + a * 3)]; }
    var tw = high ? 256 : 128, field = lazyField(tw, tw, 2, septa);
    var tex = kit.baked('mushroom|septa-shade', tw, tw, function (u, v, out, i, j) { var o = field.at(i, j), p = field.data; out[0] = out[1] = out[2] = 0.8 + 0.2 * p[o] * (0.7 + 0.3 * p[o + 1]); });
    var nmap = kit.bakedNormal('mushroom|septa-teeth', tw, tw, function (u, v, i, j) { var o = field.at(i, j), p = field.data; return p[o] * (0.75 + 0.25 * p[o + 1]); }, h === 'dead' ? 1.5 : 1.2);
    kit.mesh(kit.geo(g, 1), kit.std({ vertexColors: true, map: tex, normalMap: nmap, roughness: coralRough(h) }, coralSheen(c, pal[1] === 0xb4c48c ? 0x60f090 : null)), 'colony', c.root);
  }

  // ---- Restoration structures (growth = how overgrown) ------------------------------
  var SAND = hex(0xb8ab8a), SAND_D = hex(0x8e8468), TIE = hex(0x1a1a1a);
  function sandCol(x, y, z) { var c2 = mixc(SAND, SAND_D, 0.5 * noise3(x * 70, y * 70, z * 70) + 0.3 * noise3(x * 9, y * 9, z * 9), [0, 0, 0]); return lin(c2); }
  function fragmentColors(rng) { var p = [[0xb08a52, 0xf0eada], [0x9a6a8a, 0xe8c0f0], [0x8a8a50, 0xd0f0e0], [0xc09060, 0xf0e0b0]][Math.floor(rng() * 4)]; return acroColor('healthy', hex(p[0]), hex(p[1])); }
  function buildReefStar(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(101), gr = c.growth, frame = new Geo(), coral = new Geo(), ties = new Geo(), i, j;
    var R = 0.55, hub = 0.32, rad = 0.0095, sides = high ? 6 : 4, segs = high ? 10 : 6, tips = [];
    for (i = 0; i < 6; i++) {
      var a = i / 6 * TAU, pts = [];
      for (j = 0; j <= segs; j++) { var t = j / segs, r = R * t; pts.push([Math.cos(a) * r, 0.02 + (hub - 0.02) * Math.cos(t * PI / 2) * (1 + 0.15 * Math.sin(t * PI)), Math.sin(a) * r]); }
      frame.tube(pts, rad, sides, function (t, s) { return sandCol(t * 3 + i, s, i); });
      tips.push([Math.cos(a) * R, 0.02, Math.sin(a) * R]);
    }
    for (i = 0; i < 6; i++) {
      var p0 = tips[i], p1 = tips[(i + 1) % 6];
      frame.tube(lineTo(p0, p1, high ? 6 : 3, 0.0), rad * 0.85, sides, function (t, s) { return sandCol(t * 5 + i * 2, s, 1); });
      // Cable-tie links where neighbouring stars are joined.
      ties.absorb(T, new T.TorusGeometry(0.018, 0.004, 4, high ? 10 : 6), new T.Matrix4().makeRotationY(i / 6 * TAU).setPosition(p0[0] * 1.02, 0.03, p0[2] * 1.02), lin(TIE));
    }
    // Fragments tied along the spokes grow into branching colonies that hide the frame.
    var per = 2, depth = Math.round(lerp(0, 2, gr)), col = null;
    for (i = 0; i < 6; i++) for (j = 0; j < per; j++) {
      var a2 = i / 6 * TAU, t2 = 0.3 + 0.38 * j, r2 = R * t2, y2 = 0.02 + (hub - 0.02) * Math.cos(t2 * PI / 2) * (1 + 0.15 * Math.sin(t2 * PI)) + rad;
      col = fragmentColors(rng);
      acropora(coral, rng, { base: [Math.cos(a2) * r2, y2, Math.sin(a2) * r2], primaries: gr < 0.15 ? 1 : 2, depth: depth, len: lerp(0.05, 0.19, gr), rad: lerp(0.006, 0.014, gr), elev: 0.75, up: 0.3, fork: 0.9, max: 14, sides: high ? 5 : 3, segs: high ? 4 : 2, col: col });
      ties.absorb(T, new T.TorusGeometry(0.012, 0.0025, 3, high ? 8 : 5), new T.Matrix4().makeRotationY(a2 + PI / 2).setPosition(Math.cos(a2) * r2, y2, Math.sin(a2) * r2), lin(TIE));
    }
    // The frame and its cable ties draw as one batch; the ties keep their own roughness.
    var rig = new Float32Array(80);
    batchMesh(kit, [{ geo: frame.build(T, 1), part: 'frame' }, { geo: ties.build(T, 1), part: 'ties', rough: 0.5 }], kit.std({ vertexColors: true, roughness: 0.95 }, { batch: rig }), rig, 'frame', c.root);
    kit.mesh(kit.geo(coral, 1), kit.std({ map: grainTexture(kit, 64, 10, 1), normalMap: coralliteNormal(kit, 64, 10, 1), vertexColors: true, roughness: 0.55 }), 'corals', c.root);
    return { links: tips.map(function (p) { return [p[0], p[1], p[2]]; }) };
  }
  function buildReefBall(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(103), gr = c.growth, H = 1.0, Rb = 0.7, wall = 0.075, i, j;
    var ns = high ? 72 : 40, nh = high ? 22 : 12, phiTop = 0.88, holes = [], shell = new Geo(), white = [1, 1, 1];
    function prof(f) { return [Rb * Math.pow(Math.max(0, 1 - f * f), 0.5) * (1 + 0.08 * (1 - f)), H * Math.sin(f * PI / 2)]; }
    var rows = [[3, 0.22, 0.11], [7, 0.45, 0.1], [6, 0.68, 0.085]];
    rows.forEach(function (rw, ri) { for (var q = 0; q < rw[0]; q++) holes.push({ u: (q + 0.5 * ri) / rw[0], f: rw[1], r: rw[2] * (0.85 + 0.3 * rng()) }); });
    function holeAt(u, f) {
      var best = 9, pr = prof(f);
      for (var q = 0; q < holes.length; q++) { var hh = holes[q], du = (fract(u - hh.u + 0.5) - 0.5) * TAU * pr[0], df = (f - hh.f) * H * 1.3, d = Math.sqrt(du * du + df * df) - hh.r; if (d < best) best = d; }
      return best;
    }
    [0, 1].forEach(function (inner) {
      var first = shell.count();
      for (i = 0; i <= nh; i++) for (j = 0; j <= ns; j++) {
        var f = i / nh * phiTop, u = j / ns, p = prof(f), r = p[0] - (inner ? wall : 0), a = u * TAU;
        shell.v(Math.cos(a) * r, p[1] - (inner ? wall * 0.6 : 0), Math.sin(a) * r, white, u, f / phiTop);
      }
      for (i = 0; i < nh; i++) for (j = 0; j < ns; j++) {
        var a0 = first + i * (ns + 1) + j, b0 = a0 + ns + 1;
        if (inner) shell.i.push(a0, a0 + 1, b0, a0 + 1, b0 + 1, b0); else shell.i.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
      }
    });
    var grey = hex(0x9c9c94), dark = hex(0x6c6c66), cca = hex(0xc88aa0), sponge = [hex(0xf07a1e), hex(0xf0c820), hex(0x8a3ab0), hex(0xd83040)], algae = hex(0x6a7a3a), cc = [0, 0, 0, 0, 0];
    var tex = kit.baked(c.key('shell'), high ? 512 : 256, high ? 256 : 128, function (u, v, out) {
      var f = v * phiTop, d = holeAt(u, f), x = u * 9, y = v * 4;
      if (d < 0) { out[3] = 0; setc(out, dark); return; }
      mixc(grey, dark, 0.35 * noise2(x * 8, y * 8) + 0.3 * (1 - smooth(0.0, 0.03, d)), out);
      cells(x * 3, y * 3, 13, cc); mulc(out, 0.85 + 0.15 * smooth(0.1, 0.35, cc[0]));
      var cover = gr * (0.5 + 0.5 * v);
      mixc(out, cca, smooth(0.62 - cover * 0.4, 0.7 - cover * 0.4, noise2(x * 2.5 + 3, y * 2.5)) * 0.85, out);
      mixc(out, algae, smooth(0.6, 0.75, noise2(x * 4, y * 4 + 9)) * gr * 0.7, out);
      // Encrusting sponges: irregular patches that spread with growth.
      cells(x * 1.3, y * 1.3, 17, cc);
      var lobe = cc[0] + 0.16 * (noise2(x * 9, y * 9) - 0.5) + 0.08 * (noise2(x * 23, y * 23) - 0.5);
      mixc(out, sponge[Math.floor(cc[2] * 4)], (1 - smooth(0.26 * gr - 0.03, 0.26 * gr, lobe)) * (gr > 0 ? 0.9 : 0), out);
    }, true, false);
    // The holes are a hard 0/1 mask; the sea fan's threshold shares its program.
    var mat = kit.std({ map: tex, alphaTest: 0.42, side: T.DoubleSide, roughness: 0.92 });
    kit.mesh(kit.geo(shell, 1), mat, 'shell', c.root);
    // Rims give each hole its concrete thickness.
    var rims = new Geo(), rimC = lin(dark), seg = high ? 16 : 8;
    holes.forEach(function (hh) {
      var first = rims.count();
      for (var q = 0; q <= seg; q++) {
        var t = q / seg * TAU, du = Math.cos(t) * hh.r, df = Math.sin(t) * hh.r, f = hh.f + df / (H * 1.3), pr = prof(f), a = hh.u * TAU + du / pr[0];
        rims.v(Math.cos(a) * pr[0], pr[1], Math.sin(a) * pr[0], rimC, 0, 0);
        rims.v(Math.cos(a) * (pr[0] - wall), pr[1] - wall * 0.6, Math.sin(a) * (pr[0] - wall), rimC, 0, 0);
      }
      for (q = 0; q < seg; q++) { var b = first + q * 2; rims.i.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    });
    kit.mesh(kit.geo(rims, 1), kit.std({ vertexColors: true, roughness: 0.95, side: T.DoubleSide }), 'rims', c.root);
    // Coral colonies settle on the upper dome as it is overgrown.
    var nCol = Math.round(gr * 6), colGeo = new Geo(), live = [0, 0, 0], pals = [[0xc8a862, 0xa88a50], [0xa8829a, 0x8a6a80], [0x9aa060, 0x7a8048]];
    for (i = 0; i < nCol; i++) {
      var u2 = rng(), f2 = 0.55 + 0.3 * rng(), pr2 = prof(f2), a2 = u2 * TAU, size = 0.05 + 0.1 * gr * (0.6 + 0.6 * rng()), pal = pals[Math.floor(rng() * 3)], base = colGeo.count();
      if (holeAt(u2, f2) < size * 0.6) continue;
      lumpDome(T, colGeo, size, size * 0.7, high ? 16 : 8, high ? 8 : 4, rng() * 9, function (x, y, z) { return lin(mixc(hex(pal[0]), hex(pal[1]), noise3(x * 30, y * 30, z * 30), live)); });
      var nrm = new T.Vector3(Math.cos(a2) * Math.cos(f2 * PI / 2), Math.sin(f2 * PI / 2) * 1.2, Math.sin(a2) * Math.cos(f2 * PI / 2)).normalize(), qn = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), nrm), v3 = new T.Vector3();
      colGeo.map(base, function (p) { v3.set(p[0], p[1], p[2]).applyQuaternion(qn); p[0] = v3.x + Math.cos(a2) * pr2[0] * 0.98; p[1] = v3.y + pr2[1] - 0.01; p[2] = v3.z + Math.sin(a2) * pr2[0] * 0.98; });
    }
    if (colGeo.count()) kit.mesh(kit.geo(colGeo, 1), kit.std({ vertexColors: true, roughness: 0.7 }), 'corals', c.root);
  }
  function buildNursery(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(105), gr = c.growth, i, j, sides = high ? 8 : 5;
    var tree = kit.node('tree', c.root), pole = new Geo(), white = lin(hex(0xe8e8e2)), foul = lin(hex(0x8a8a5a)), base0 = 0.45, top = 2.45;
    function pipe(t) { return lin(mixc(hex(0xeaeae4), hex(0x7a8050), gr * 0.6 * noise2(t * 20, 3), [0, 0, 0])); }
    pole.tube([[0, base0, 0], [0, (base0 + top) / 2, 0], [0, top, 0]], 0.021, sides, function (t) { return pipe(t); });
    pole.tube([[0, 0.0, 0], [0, base0 * 0.5, 0], [0, base0, 0]], 0.004, 3, function () { return lin(hex(0xd8d0b0)); });
    blob(T, pole, 0, top + 0.13, 0, 0.14, 0.15, 0.14, lin(hex(0xf2c21a)), high ? 16 : 10, high ? 12 : 6);
    blob(T, pole, 0, 0.02, 0, 0.06, 0.03, 0.06, lin(hex(0x5a5a5a)), 8, 4);
    var levels = 3, arms = 4, per = 2, frag = new Geo(), pivots = [], depth = Math.round(lerp(0, 2, gr));
    for (i = 0; i < levels; i++) {
      var y = base0 + 0.45 + i * 0.5, rot = i * PI / 4;
      for (j = 0; j < arms; j++) {
        var a = rot + j / arms * TAU, ex = Math.cos(a) * 0.5, ez = Math.sin(a) * 0.5;
        pole.tube([[0, y, 0], [ex * 0.5, y, ez * 0.5], [ex, y, ez]], 0.011, sides - 1, function (t) { return pipe(t + 1); });
        for (var q = 0; q < per; q++) {
          var f = 0.45 + 0.45 * q, hx = ex * f, hz = ez * f, line = 0.12 + 0.05 * rng(), first = frag.count(), fy = y - line;
          frag.tube([[hx, y, hz], [hx, y - line * 0.5, hz], [hx, fy, hz]], 0.0012, 3, function () { return white; });
          acropora(frag, rng, { base: [hx, fy, hz], primaries: 1, depth: depth, len: lerp(0.05, 0.14, gr), rad: lerp(0.006, 0.013, gr), elev: 0.25, up: 0.1, fork: 0.9, max: 7, sides: high ? 6 : 3, segs: high ? 3 : 2, col: fragmentColors(rng) });
          pivots.push({ first: first, end: frag.count(), x: hx, y: y, z: hz, ph: rng() * TAU });
        }
      }
    }
    kit.mesh(kit.geo(pole, 1), kit.std({ vertexColors: true, roughness: 0.6 }), 'tree', tree);
    var fg = kit.geo(frag, 1);
    kit.mesh(fg, kit.std({ map: grainTexture(kit, 64, 10, 1), normalMap: coralliteNormal(kit, 64, 10, 1), vertexColors: true, roughness: 0.55 }), 'fragments', tree);
    var owner = new Int16Array(frag.count());
    pivots.forEach(function (p, k) { for (var v = p.first; v < p.end; v++) owner[v] = k; });
    deform(c, fg, function (base, out, t) {
      for (var q = 0, v = 0; q < base.length; q += 3, v++) {
        var p = pivots[owner[v]], ax = 0.1 * Math.sin(t * 0.7 + p.ph), az = 0.08 * Math.cos(t * 0.55 + p.ph), dy = base[q + 1] - p.y;
        out[q] = base[q] + ax * dy; out[q + 1] = base[q + 1]; out[q + 2] = base[q + 2] + az * dy;
      }
    }, false);
    var ph = rng() * TAU;
    c.anim(function (t) { tree.rotation.set(0.015 * Math.sin(t * 0.3 + ph), 0, 0.015 * Math.cos(t * 0.23 + ph)); });
  }

  // ---- Registry -----------------------------------------------------------------------------
  function I(group, habit, lengthM, depth, school, origin) { return { group: group, habit: habit, lengthM: lengthM, depthM: depth, schoolSize: school, origin: origin }; }
  var INFO = {
    clownfish: I('fish', 'pair', 0.09, [1, 15], null, 'centre'),
    blue_tang: I('fish', 'solitary', 0.25, [2, 40], null, 'centre'),
    parrotfish: I('fish', 'solitary', 0.45, [1, 30], null, 'centre'),
    bumphead_parrotfish: I('fish', 'school', 0.9, [1, 30], [5, 30], 'centre'),
    moorish_idol: I('fish', 'pair', 0.18, [3, 40], null, 'centre'),
    threadfin_butterflyfish: I('fish', 'pair', 0.2, [1, 30], null, 'centre'),
    emperor_angelfish: I('fish', 'solitary', 0.35, [3, 40], null, 'centre'),
    anthias: I('fish', 'school', 0.1, [2, 35], [20, 120], 'centre'),
    blue_green_chromis: I('fish', 'school', 0.08, [1, 20], [10, 60], 'centre'),
    lionfish: I('fish', 'hover', 0.3, [2, 50], null, 'centre'),
    peacock_grouper: I('fish', 'solitary', 0.4, [1, 40], null, 'centre'),
    humphead_wrasse: I('fish', 'solitary', 1.4, [2, 40], null, 'centre'),
    cleaner_wrasse: I('fish', 'pair', 0.1, [1, 40], null, 'centre'),
    clown_triggerfish: I('fish', 'solitary', 0.35, [3, 40], null, 'centre'),
    porcupinefish: I('fish', 'solitary', 0.45, [2, 50], null, 'centre'),
    yellow_boxfish: I('fish', 'solitary', 0.12, [1, 40], null, 'centre'),
    giant_moray: I('fish', 'crevice', 1.5, [1, 50], null, 'crevice'),
    whitetip_reef_shark: I('fish', 'solitary', 1.5, [5, 40], null, 'centre'),
    bluespotted_stingray: I('fish', 'bottom', 0.6, [1, 30], null, 'base'),
    bluestripe_snapper: I('fish', 'school', 0.3, [3, 40], [10, 80], 'centre'),
    oriental_sweetlips: I('fish', 'hover', 0.5, [2, 30], null, 'centre'),
    reef_manta: I('fish', 'solitary', 3.5, [1, 40], null, 'centre'),
    green_turtle: I('reptile', 'solitary', 1.0, [1, 20], null, 'centre'),
    hawksbill_turtle: I('reptile', 'solitary', 0.8, [1, 30], null, 'centre'),
    magnificent_anemone: I('invertebrate', 'sessile', 0.5, [1, 20], null, 'base'),
    giant_clam: I('invertebrate', 'sessile', 0.3, [1, 20], null, 'base'),
    crown_of_thorns: I('invertebrate', 'bottom', 0.35, [1, 30], null, 'base'),
    blue_sea_star: I('invertebrate', 'bottom', 0.3, [1, 20], null, 'base'),
    long_spined_urchin: I('invertebrate', 'bottom', 0.4, [1, 30], null, 'base'),
    nudibranch: I('invertebrate', 'bottom', 0.05, [1, 30], null, 'base'),
    cleaner_shrimp: I('invertebrate', 'crevice', 0.05, [5, 40], null, 'base'),
    christmas_tree_worm: I('invertebrate', 'sessile', 0.04, [1, 30], null, 'base'),
    day_octopus: I('invertebrate', 'bottom', 0.8, [1, 30], null, 'base'),
    sea_cucumber: I('invertebrate', 'bottom', 0.24, [1, 30], null, 'base'),
    sea_fan: I('invertebrate', 'sessile', 1.0, [5, 40], null, 'base'),
    barrel_sponge: I('invertebrate', 'sessile', 1.0, [5, 40], null, 'base'),
    soft_coral: I('invertebrate', 'sessile', 0.35, [3, 40], null, 'base'),
    brain_coral: I('coral', 'sessile', 0.8, [1, 30], null, 'base'),
    staghorn_coral: I('coral', 'sessile', 1.2, [1, 20], null, 'base'),
    table_coral: I('coral', 'sessile', 1.5, [1, 20], null, 'base'),
    mushroom_coral: I('coral', 'sessile', 0.2, [1, 30], null, 'base'),
    boulder_coral: I('coral', 'sessile', 1.5, [1, 30], null, 'base'),
    cauliflower_coral: I('coral', 'sessile', 0.45, [1, 20], null, 'base'),
    foliose_coral: I('coral', 'sessile', 0.85, [2, 20], null, 'base'),
    reef_star: I('structure', 'sessile', 1.1, [2, 12], null, 'base'),
    reef_ball: I('structure', 'sessile', 1.0, [3, 20], null, 'base'),
    coral_tree_nursery: I('structure', 'sessile', 2.6, [5, 15], null, 'base'),
    firefish: I('fish', 'hover', 0.09, [6, 60], null, 'centre'),
    copperband_butterflyfish: I('fish', 'pair', 0.2, [1, 25], null, 'centre')
  };
  var BUILDERS = {
    magnificent_anemone: buildAnemone, giant_clam: buildClam, long_spined_urchin: buildUrchin, nudibranch: buildNudibranch, cleaner_shrimp: buildShrimp,
    christmas_tree_worm: buildTreeWorms, day_octopus: buildOctopus, sea_cucumber: buildCucumber, sea_fan: buildSeaFan, barrel_sponge: buildBarrel, soft_coral: buildSoftCoral,
    crown_of_thorns: function (c) {
      // Colour morphs: purple-red, grey-mauve with red spine tips, and orange-red.
      var morphs = [[0x8a3a52, 0xb0607a, 0x3a1420, 0xc890a0, 0xe8403a], [0x7a5a6a, 0x9a7a8a, 0x2a1a22, 0xd0b0b8, 0xd83a30], [0xa04a32, 0xc87050, 0x3a1808, 0xe0a080, 0xf06a30]], m = morphs[Math.floor(c.rng(83)() * 3)];
      buildStar(c, { salt: 85, arms: function (r) { return 14 + Math.floor(r() * 5); }, R: 0.175, disc: 0.075, thick: 0.03, armR: 0.02, taper: 0.7, curl: 0.012, colors: [m[0], m[1], m[2]], dots: false, spines: [m[3], m[4]], spinesPerArm: [5, 14], spineLen: 0.04, spineR: 0.0045, rough: 0.7, lift: 0.01 });
    },
    blue_sea_star: function (c) { buildStar(c, { salt: 87, arms: function () { return 5; }, R: 0.15, disc: 0.03, thick: 0.016, armR: 0.017, taper: 0.3, curl: 0.0, colors: [0x2f6fe6, 0x4a8af2, 0x1a3a9a], dots: true, rough: 0.72, lift: 0.012 }); },
    brain_coral: buildBrain, staghorn_coral: buildStaghorn, table_coral: buildTable, mushroom_coral: buildMushroom, boulder_coral: buildBoulder, cauliflower_coral: buildCauliflower, foliose_coral: buildFoliose,
    reef_star: buildReefStar, reef_ball: buildReefBall, coral_tree_nursery: buildNursery
  };
  var IDS = Object.keys(INFO);

  // The health states each model can show (info().healthStates). Corals bleach
  // and die. The anemone and the giant clam farm algae in their tissue and bleach
  // in heatwaves too, as does the living Porites head the Christmas tree worms
  // live in. The soft coral (Dendronephthya) and the sea fan (Annella) have no
  // algae partners, and heat bleaching is not documented for the barrel sponge.
  var BLEACHES = { magnificent_anemone: true, giant_clam: true, christmas_tree_worm: true };
  function healthStates(id) { return INFO[id].group === 'coral' ? ['healthy', 'bleached', 'dead'] : BLEACHES[id] ? ['healthy', 'bleached'] : ['healthy']; }
  function options(THREE, id, opts) {
    if (!THREE || typeof THREE.BufferGeometry !== 'function' || typeof THREE.Mesh !== 'function') throw new Error('Reef3DSpecies needs the THREE namespace (three.js r128) passed in.');
    if (!Object.prototype.hasOwnProperty.call(INFO, id)) throw new RangeError('Unknown reef species: ' + id);
    opts = opts || {};
    var info = INFO[id], growthDefault = info.group === 'structure' ? 0.3 : 1;
    return { seed: seedValue(opts.seed), high: opts.quality === 'high', reducedMotion: !!opts.reducedMotion, derivatives: opts.derivatives !== false,
      growth: clamp(num(opts.growth, growthDefault), 0, 1), health: healthStates(id).indexOf(opts.health) > 0 ? opts.health : 'healthy' };
  }
  function create(THREE, id, opts) {
    var o = options(THREE, id, opts), info = INFO[id];
    if (FISH[id]) return makeFish(THREE, id, info, FISH[id], o);
    if (RAYS[id]) return makeRay(THREE, id, info, RAYS[id], o);
    if (TURTLES[id]) return makeTurtle(THREE, id, info, TURTLES[id], o);
    return makeModel(THREE, id, info, o, BUILDERS[id]);
  }
  function createSchool(THREE, id, count, opts) {
    var o = options(THREE, id, opts);
    if (!FISH[id] || FISH[id].offset) throw new RangeError('No school model for ' + id + '; schools are lofted reef fish.');
    return makeSchool(THREE, id, INFO[id], FISH[id], count, o);
  }
  // Guide portrait views where the default reads badly: camera position (dir)
  // and look-at height (lookY) in model radii, for a 360 x 240 picture.
  function V(x, y, z, lookY) { return { dir: [x, y, z], lookY: lookY }; }
  var PORTRAIT = {
    firefish: V(0.2, 0.22, 2.65, 0.13), copperband_butterflyfish: V(0.24, 0.2, 2.65, 0),
    cleaner_wrasse: V(0, 0.22, 2.55, 0), whitetip_reef_shark: V(0.25, 0.4, 2.5, 0), giant_moray: V(1.5, 0.55, 1.75, 0.05),
    bluespotted_stingray: V(0.95, 1.65, 1.05, 0), reef_manta: V(2.25, 2.0, 0.85, 0),
    green_turtle: V(1.35, 1.2, 2.45, 0), hawksbill_turtle: V(1.35, 1.2, 2.45, 0),
    giant_clam: V(1.3, 2.0, 2.2, 0.25), crown_of_thorns: V(0.65, 3.0, 1.7, 0), blue_sea_star: V(0.5, 3.1, 1.75, 0),
    long_spined_urchin: V(0.55, 1.35, 1.05, 0.15), nudibranch: V(0.85, 1.25, 2.25, 0.3), cleaner_shrimp: V(0.7, 0.95, 2.2, 0.35),
    day_octopus: V(1.2, 1.8, 2.5, 0.05), sea_cucumber: V(0.7, 1.35, 2.45, 0.15), sea_fan: V(2.75, 0.75, 0.35, 0.5),
    soft_coral: V(1.2, 0.9, 2.4, 0.5), mushroom_coral: V(1.0, 2.3, 2.2, 0.1), table_coral: V(1.4, 1.75, 2.5, 0.25),
    reef_star: V(1.2, 2.0, 2.6, 0.1), coral_tree_nursery: V(0.75, 0.55, 1.6, 0.5)
  };
  function info(id) {
    var d = INFO[id];
    if (!d) return null;
    var out = { id: id, group: d.group, habit: d.habit, lengthM: d.lengthM, depthM: d.depthM.slice(), schoolSize: d.schoolSize ? d.schoolSize.slice() : null, origin: d.origin, healthStates: healthStates(id) };
    if (PORTRAIT[id]) out.portrait = { dir: PORTRAIT[id].dir.slice(), lookY: PORTRAIT[id].lookY };
    return out;
  }
  global.Reef3DSpecies = { version: '1.0.0', ids: IDS.slice(), info: info, create: create, createSchool: createSchool };
})(typeof window !== 'undefined' ? window : globalThis);
