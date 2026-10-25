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

  var FORCEPS = { yellow: hex(0xffd619), gold: hex(0xe6b820), white: hex(0xf1f3e8), ink: hex(0x141e20), clear: hex(0xe4eacb) };
  var PAJAMA = { head: hex(0xc4ce70), pearl: hex(0xf1e6df), silver: hex(0xd4dfd4), ink: hex(0x292a27), spot: hex(0xa6504c), clear: hex(0xdce6dc) };

  var BANGGAI = { silver: hex(0xc9c8c0), pearl: hex(0xe7e7df), white: hex(0xf8f7ef), ink: hex(0x202427), clear: hex(0xd4ddd8) };

  var REGAL = { gold: hex(0xf7c525), orange: hex(0xe9a62a), white: hex(0xe4efe8), blue: hex(0x3078bd), ink: hex(0x1c3142), dorsal: hex(0x28699e), face: hex(0x89aaa7), clear: hex(0xc9d9c4), bars: [0.335, 0.255, 0.175, 0.095, 0.015, -0.065, -0.145, -0.225] };

  var MANDARIN = { orange: hex(0xb87534), amber: hex(0xc99143), olive: hex(0x496e48), blue: hex(0x176f9d), turquoise: hex(0x43b9c0), ink: hex(0x1e4b4c), clear: hex(0x728c87), lip: hex(0x75b6a9) };

  var FISH = {
    // Illustrative adult male Synchiropus splendidus: scaleless skin, raised
    // eyes and a separate extended first dorsal, as in primary aquarium photos.
    mandarin_dragonet: {
      lengthM: 0.06, tex: [192, 128], smoothSkin: true, rough: 0.57, eye: [0.398, 0.083, 0.026], eyeBulge: 1.22, iris: hex(0xc56b36),
      beat: 0.4, tailBeat: 0.68, wiggle: 0.19, pecBeat: 0.23, pecRate: 1.9,
      rows: [[0.5, 0.016, -0.022, 0.018], [0.475, 0.041, -0.038, 0.044], [0.43, 0.082, -0.056, 0.079], [0.365, 0.105, -0.067, 0.104], [0.27, 0.101, -0.073, 0.106], [0.14, 0.091, -0.071, 0.091], [0.015, 0.077, -0.057, 0.066], [-0.1, 0.055, -0.044, 0.041], [-0.2, 0.034, -0.03, 0.024], [-0.27, 0.024, -0.024, 0.016]],
      tail: { type: 'round', span: 0.135, len: 0.225 },
      dorsal: [{ from: 0.255, to: 0.07, h: 0.34, shape: function (u) { return Math.pow(Math.sin(PI * u), 0.43) * (1.48 - 1.32 * u); }, rake: 0.47, nv: 5 }, { from: 0.025, to: -0.23, h: 0.12, shape: 'arch', rake: 0.42, nv: 5 }],
      anal: [{ from: 0.025, to: -0.225, h: 0.098, shape: 'arch', rake: 0.4, nv: 4 }],
      pelvic: { x: 0.245, len: 0.095 }, pectoral: { x: 0.265, y: -0.025, len: 0.255, width: 0.105, arc: 0.98, spread: 0.98, droop: 0.05, nv: 4, shape: function (u) { return 0.64 + 0.36 * Math.sin(PI * u); } },
      paint: function (P, out) {
        mixc(MANDARIN.olive, MANDARIN.amber, 0.3 + 0.2 * Math.sin(P.x * 16 - P.y * 22), out);
        mixc(out, MANDARIN.orange, smooth(0.03, -0.07, P.y) * 0.35, out);
        // Warped contour ribbons wrap the actual smooth skin on both flanks.
        var flow = Math.sin(P.x * 29 + P.y * 57) + 0.62 * Math.sin(P.x * 47 - P.y * 43) + 0.25 * Math.cos(P.x * 61 + P.y * 87);
        var aa = Math.max(P.aa, P.aay) * 35;
        mixc(out, MANDARIN.orange, band(flow, 0.64, aa), out);
        mixc(out, MANDARIN.ink, band(flow, 0.25, aa), out); mixc(out, MANDARIN.blue, band(flow, 0.185, aa), out); mixc(out, MANDARIN.turquoise, band(flow, 0.075, aa), out);
        mulc(out, 0.94 - 0.09 * P.up);
        // Curved facial bands and a blue lip surround; eyes remain seated in skin.
        var head = smooth(0.28, 0.36, P.x), cheek = P.y + 0.032 - 0.035 * Math.sin((P.x - 0.3) * 24);
        mixc(out, MANDARIN.blue, head * band(cheek, 0.008, P.aay), out);
        mixc(out, MANDARIN.turquoise, head * band(cheek, 0.0035, P.aay), out);
        mixc(out, MANDARIN.lip, smooth(0.48, 0.498, P.x) * 0.55, out);
      },
      fin: function (kind, u, v, out) {
        if (kind === 'pectoral') {
          mixc(MANDARIN.clear, MANDARIN.blue, 0.07 + 0.13 * smooth(0.8, 1, v), out);
          mixc(out, MANDARIN.olive, band(Math.sin(u * PI * 8), 0.14, 0.05) * v * 0.16, out);
          mixc(out, MANDARIN.orange, (1 - smooth(0.25, 0.7, v)) * 0.2, out); return;
        }
        if (kind === 'pelvic') { mixc(MANDARIN.olive, MANDARIN.turquoise, 0.3 + 0.6 * smooth(0.65, 1, v), out); return; }
        mixc(MANDARIN.orange, MANDARIN.amber, v * 0.45, out);
        var stripe = Math.sin(u * PI * (kind === 'tail' ? 7 : 5) + v * 5 + 0.7 * Math.sin(u * 9));
        mixc(out, MANDARIN.ink, band(stripe, 0.39, 0.05), out); mixc(out, MANDARIN.blue, band(stripe, 0.3, 0.05), out); mixc(out, MANDARIN.turquoise, band(stripe, 0.14, 0.04), out);
        mixc(out, MANDARIN.blue, smooth(kind === 'tail' ? 0.8 : 0.91, kind === 'tail' ? 0.96 : 1, v), out);
        if (kind === 'tail') mixc(out, MANDARIN.turquoise, smooth(0.96, 1, v) * 0.35, out);
      },
      extra: function (ctx) {
        if (ctx.school) return;
        [-1, 1].forEach(function (side) {
          var pts = [];
          for (var j = 0; j <= 5; j++) { var x = 0.46 + j * 0.0075, y = -0.005 + 0.003 * Math.sin(j / 5 * PI); pts.push([x, y, side * (ctx.surfZ(x, y) + 0.0008)]); }
          ctx.detail.tube(pts, 0.0012, 4, function () { return lin(MANDARIN.ink); });
        });
      }
    },

    // Pacific adult Pygoplites diacanthus: blue-grey chin, not the Indian Ocean
    // orange-chinned form; adult markings follow Australian Museum GBR photos.
    regal_angelfish: {
      lengthM: 0.2, tex: [192, 128], scaleSize: 0.017, eye: [0.382, 0.047, 0.031], iris: hex(0x58655b), sheen: [0xaac6dc, 0xe8e5b0, 0.12],
      beat: 0.64, wiggle: 0.38, pecBeat: 0.48, pecRate: 1.05,
      rows: [[0.5, 0.006, -0.025, 0.008], [0.46, 0.055, -0.07, 0.025], [0.4, 0.112, -0.125, 0.043], [0.32, 0.18, -0.17, 0.053], [0.21, 0.22, -0.198, 0.06], [0.07, 0.227, -0.205, 0.061], [-0.06, 0.2, -0.18, 0.056], [-0.17, 0.133, -0.119, 0.042], [-0.24, 0.07, -0.06, 0.028], [-0.29, 0.045, -0.037, 0.02]],
      tail: { type: 'round', span: 0.13, len: 0.2 },
      dorsal: [{ from: 0.29, to: -0.27, h: 0.105, shape: 'rear', rake: 0.22, nv: 8 }], anal: [{ from: 0.09, to: -0.26, h: 0.14, shape: 'rear', rake: 0.34, nv: 8 }],
      pelvic: { x: 0.19, len: 0.1 }, pectoral: { x: 0.23, y: -0.025, len: 0.14, width: 0.064, spread: 0.4, droop: 0.06, shape: pointed },
      paint: function (P, out) {
        mixc(REGAL.gold, REGAL.orange, 0.24 * smooth(0.2, 0.95, P.up), out);
        // About eight slanted pale bars, edged first in ink then in blue.
        for (var i = 0; i < REGAL.bars.length; i++) {
          var centre = REGAL.bars[i] + (0.11 + i * 0.012) * P.y + 0.022 * P.y * P.y, d = P.x - centre, w = i === 0 ? 0.015 : 0.019;
          mixc(out, REGAL.ink, band(d, w + 0.008, P.aa), out); mixc(out, REGAL.blue, band(d, w + 0.0045, P.aa), out); mixc(out, REGAL.white, band(d, w, P.aa), out);
        }
        var face = smooth(0.27, 0.34, P.x) * smooth(0.015, -0.035, P.y);
        mixc(out, REGAL.face, face * 0.97, out);
        var eye = Math.sqrt(Math.pow((P.x - 0.382) / 0.036, 2) + Math.pow((P.y - 0.047) / 0.042, 2));
        mixc(out, REGAL.blue, (1 - smooth(0.92, 1.18, eye)) * 0.82, out); mixc(out, REGAL.ink, 1 - smooth(0.76, 0.95, eye), out);
      },
      fin: function (kind, u, v, out) {
        if (kind === 'tail') { mixc(REGAL.gold, REGAL.orange, (1 - v) * 0.15, out); return; }
        if (kind === 'pectoral') { mixc(REGAL.clear, REGAL.gold, (1 - v) * 0.28, out); return; }
        if (kind === 'pelvic') { mixc(REGAL.gold, REGAL.blue, smooth(0.76, 0.96, v) * 0.88, out); return; }
        if (kind === 'anal0') {
          setc(out, REGAL.gold); var stripe = fract((v + 0.095 * Math.sin(PI * u)) * 3 + 0.15) - 0.5;
          mixc(out, REGAL.blue, band(stripe, 0.11, 0.045), out); mixc(out, REGAL.blue, smooth(0.9, 0.98, v), out); return;
        }
        var x = lerp(0.29, -0.27, u), rear = smooth(-0.065, -0.15, x);
        setc(out, REGAL.gold);
        for (var i = 0; i < REGAL.bars.length; i++) { var d = x - (REGAL.bars[i] + (0.11 + i * 0.012) * (0.2 + v * 0.08)); mixc(out, REGAL.ink, band(d, 0.027, 0.01), out); mixc(out, REGAL.blue, band(d, 0.023, 0.01), out); mixc(out, REGAL.white, band(d, 0.019, 0.01), out); }
        mixc(out, REGAL.dorsal, rear, out);
        var scribble = band(fract(u * 11 + 0.26 * Math.sin(v * TAU * 1.7 + u * 14)) - 0.5, 0.13, 0.07);
        mixc(out, REGAL.ink, scribble * rear * 0.83, out); mixc(out, REGAL.blue, band(v - 0.91, 0.027, 0.025) * 0.9, out);
      },
      extra: function (c) {
        // A short seated preopercular spine is characteristic of angelfishes.
        [-1, 1].forEach(function (side) { var z = c.surfZ(0.278, -0.068); c.detail.spike([0.278, -0.068, side * z], [-0.72, -0.69, side * 0.05], 0.046, 0.004, lin(REGAL.blue), lin(REGAL.face)); });
      }
    },

    // Pterapogon kauderni: adult silver-and-black daytime pattern (NOAA / National Aquarium).
    banggai_cardinalfish: {
      lengthM: 0.075, tex: [160, 96], scaleSize: 0.019, eye: [0.32, 0.071, 0.052], iris: hex(0x635b49), sheen: [0xe3e7eb, 0xffffff, 0.12],
      beat: 0.52, tailBeat: 0.8, wiggle: 0.3, pecBeat: 0.46, pecRate: 1.18,
      rows: [[0.5, 0.018, -0.035, 0.009], [0.465, 0.066, -0.082, 0.027], [0.405, 0.127, -0.137, 0.051], [0.31, 0.185, -0.188, 0.07], [0.2, 0.224, -0.215, 0.082], [0.075, 0.236, -0.222, 0.08], [-0.055, 0.197, -0.181, 0.065], [-0.16, 0.112, -0.104, 0.041], [-0.235, 0.044, -0.038, 0.022], [-0.265, 0.033, -0.028, 0.016]],
      tail: { type: 'forked', span: 0.26, len: 0.235 },
      dorsal: [{ from: 0.24, to: 0.035, h: 0.25, shape: function (u) { return Math.pow(Math.sin(PI * u), 0.65) * (0.78 + 0.22 * Math.cos(u * PI * 12)); }, rake: 0.3 }, { from: 0.01, to: -0.22, h: 0.48, shape: function (u) { return Math.pow(Math.sin(PI * u), 0.42) * (1.18 - 0.98 * u); }, rake: 0.82 }],
      anal: [{ from: 0.02, to: -0.235, h: 0.29, shape: 'front', rake: 0.7 }], pelvic: { x: 0.18, len: 0.28 }, pectoral: { x: 0.225, y: -0.03, len: 0.16, width: 0.074, spread: 0.48, droop: 0.06 },
      paint: function (P, out) {
        mixc(BANGGAI.silver, BANGGAI.pearl, 0.3 + 0.4 * smooth(0.1, 0.9, -P.up), out);
        var dots = 1 - smooth(0.12, 0.23, Math.sqrt(Math.pow(fract(P.x / 0.046 + Math.floor(P.y / 0.043) * 0.5) - 0.5, 2) + Math.pow(fract(P.y / 0.043) - 0.5, 2)));
        mixc(out, BANGGAI.white, dots * 0.8, out);
        var bars = [[0.32 - 0.065 * P.y, 0.037], [0.075 + 0.045 * P.y, 0.047], [-0.22 - 0.015 * P.y, 0.036]];
        for (var i = 0; i < bars.length; i++) mixc(out, BANGGAI.ink, band(P.x - bars[i][0], bars[i][1], P.aa), out);
      },
      fin: function (kind, u, v, out) {
        if (kind === 'pectoral') { mixc(BANGGAI.clear, BANGGAI.pearl, (1 - v) * 0.18, out); return; }
        setc(out, BANGGAI.ink);
        mixc(out, BANGGAI.silver, smooth(0.94, 1, v) * 0.62, out);
        if (kind !== 'dorsal0') {
          var d = Math.sqrt(Math.pow(fract(u * 5 + 0.18) - 0.5, 2) + Math.pow(fract(v * 3 + 0.1) - 0.5, 2));
          mixc(out, BANGGAI.white, 1 - smooth(0.11, 0.25, d), out);
        }
      },
      extra: function (c) {
        // Small circular pigment patches remain clear on the broad soft fins.
        // They are part of the existing detail batch, with no material or draw.
        function spots(spec, sign) {
          var shape = finShape(spec.shape), samples = [[0.18, 0.46], [0.28, 0.76], [0.4, 0.48], [0.55, 0.71], [0.67, 0.44], [0.79, 0.58]];
          samples.forEach(function (s) {
            var u = s[0], v = s[1], x = lerp(spec.from, spec.to, u), p = c.prof(x), h = spec.h * shape(u), y = sign > 0 ? p[0] : p[1];
            var cx = x - spec.rake * h * v, cy = y + sign * h * v;
            var radius = 0.0085 * (0.8 + 0.2 * v), first = c.detail.count(), n = c.high ? 10 : 6;
            c.detail.v(cx, cy, 0.004, lin(BANGGAI.white), 0, 0);
            for (var j = 0; j < n; j++) c.detail.v(cx + radius * Math.cos(j / n * TAU), cy + radius * Math.sin(j / n * TAU), 0.004, lin(BANGGAI.white), 0, 0);
            for (j = 0; j < n; j++) c.detail.i.push(first, first + 1 + j, first + 1 + (j + 1) % n);
          });
        }
        spots(c.def.dorsal[1], 1); spots(c.def.anal[0], -1);
      }
    },

    // Adult daytime patterns: F. flavissimus (Australian Museum / Fishes of Australia),
    // S. nematoptera (National Museum of Nature and Science, Fishes of Bitung).
    yellow_longnose_butterflyfish: {
      lengthM: 0.18, tex: [160, 96], scaleSize: 0.016, eye: [0.22, 0.085, 0.025], iris: hex(0x302f25), sheen: [0xffe374, 0xffffc5, 0.08],
      beat: 0.72, wiggle: 0.38, pecBeat: 0.5, pecRate: 1.0,
      rows: [[0.5, 0.016, -0.019, 0.004], [0.45, 0.025, -0.023, 0.006], [0.36, 0.043, -0.026, 0.008], [0.29, 0.09, -0.047, 0.014], [0.225, 0.167, -0.105, 0.026], [0.15, 0.249, -0.192, 0.037], [0.035, 0.276, -0.235, 0.043], [-0.1, 0.25, -0.222, 0.04], [-0.22, 0.145, -0.128, 0.026], [-0.29, 0.055, -0.045, 0.014], [-0.32, 0.043, -0.036, 0.012]],
      tail: { type: 'truncate', span: 0.115, len: 0.18 },
      dorsal: [{ from: 0.15, to: -0.298, h: 0.14, shape: 'rear', rake: 0.12 }], anal: [{ from: 0.025, to: -0.295, h: 0.126, shape: 'rear', rake: 0.12 }],
      pelvic: { x: 0.035, len: 0.105 }, pectoral: { x: -0.02, y: -0.025, len: 0.16, width: 0.057, spread: 0.4, droop: 0.06, shape: pointed },
      paint: function (P, out) {
        mixc(FORCEPS.yellow, FORCEPS.gold, smooth(0.15, 0.95, P.up) * 0.14, out);
        var head = smooth(0.13, 0.145, P.x - 0.17 * P.y);
        mixc(out, FORCEPS.white, head, out);
        mixc(out, FORCEPS.ink, head * smooth(0.018, 0.026, P.y + P.x * 0.018), out);
      },
      fin: function (kind, u, v, out) {
        setc(out, FORCEPS.yellow);
        if (kind === 'pectoral' || kind === 'tail') { mixc(out, FORCEPS.clear, 0.76 + 0.18 * v, out); return; }
        mixc(out, FORCEPS.gold, smooth(0.86, 1, v) * 0.2, out);
      },
      extra: function (c) {
        // The diagnostic spot belongs to the rear anal web, below the peduncle.
        // A thin bilateral patch retains the mark when the membrane is simplified.
        blob(c.T, c.detail, -0.237, -0.162, 0, 0.022, 0.024, 0.006, lin(FORCEPS.ink), c.high ? 16 : 8, c.high ? 8 : 4);
      }
    },
    pajama_cardinalfish: {
      lengthM: 0.07, tex: [160, 96], scaleSize: 0.023, eye: [0.32, 0.075, 0.064], iris: hex(0xc94122), eyeBulge: 0.72, sheen: [0xd9e7d1, 0xf5d7e1, 0.11],
      beat: 0.55, tailBeat: 0.8, wiggle: 0.35, pecBeat: 0.5, pecRate: 1.18,
      rows: [[0.5, 0.023, -0.049, 0.013], [0.465, 0.07, -0.085, 0.033], [0.405, 0.132, -0.143, 0.064], [0.31, 0.192, -0.193, 0.085], [0.2, 0.237, -0.23, 0.095], [0.065, 0.257, -0.244, 0.09], [-0.065, 0.221, -0.209, 0.077], [-0.18, 0.143, -0.14, 0.051], [-0.28, 0.058, -0.05, 0.026], [-0.32, 0.038, -0.032, 0.018]],
      tail: { type: 'forked', span: 0.23, len: 0.18 },
      dorsal: [{ from: 0.23, to: 0.025, h: 0.22, shape: 'front', rake: 0.34 }, { from: -0.005, to: -0.255, h: 0.27, shape: function (u) { return Math.pow(Math.sin(PI * u), 0.44) * (1.3 - 0.98 * u); }, rake: 0.68 }],
      anal: [{ from: 0.0, to: -0.267, h: 0.2, shape: 'front', rake: 0.58 }], pelvic: { x: 0.185, len: 0.16 },
      pectoral: { x: 0.22, y: -0.035, len: 0.17, width: 0.081, spread: 0.5, droop: 0.04 },
      paint: function (P, out) {
        mixc(PAJAMA.pearl, PAJAMA.silver, smooth(0.2, 0.95, P.up) * 0.14, out);
        mixc(out, PAJAMA.head, smooth(0.02, 0.095, P.x), out);
        var gy = P.y / 0.087, row = Math.floor(gy), gx = P.x / 0.084 + (row & 1) * 0.5;
        var dx = fract(gx) - 0.5, dy = fract(gy) - 0.5;
        var dots = 1 - smooth(0.22, 0.28 + Math.max(P.aa, P.aay) / 0.085, Math.sqrt(dx * dx + dy * dy));
        mixc(out, PAJAMA.spot, dots * smooth(-0.01, -0.05, P.x) * (1 - smooth(0.85, 1, Math.abs(P.yn))), out);
        mixc(out, PAJAMA.ink, band(P.x - 0.06 + P.y * 0.035, 0.049, P.aa), out);
      },
      fin: function (kind, u, v, out) {
        mixc(PAJAMA.clear, PAJAMA.pearl, 0.18 * (1 - v), out);
        if (kind === 'dorsal0') {
          var x = lerp(0.23, 0.025, u);
          mixc(out, PAJAMA.ink, 0.82 * (1 - smooth(0.88, 1, v)), out);
          mixc(out, PAJAMA.ink, band(x - 0.06, 0.051, 0.014), out);
        }
        if (kind === 'pelvic') mixc(out, PAJAMA.ink, 0.78 * (1 - smooth(0.64, 0.98, v)), out);
        if (kind === 'dorsal1' || kind === 'anal0' || kind === 'tail') {
          var d = Math.sqrt(Math.pow((fract(u * 5) - 0.5) / 0.24, 2) + Math.pow((v - 0.28) / 0.12, 2));
          mixc(out, PAJAMA.spot, (1 - smooth(0.8, 1.2, d)) * 0.24, out);
        }
        mixc(out, PAJAMA.clear, smooth(0.8, 1, v) * 0.45, out);
      }
    },

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


  // One adult Heteroconger hassi in a variable feeding emergence, not its full
  // hidden length: about 0.21 m is visible from a representative 0.4 m eel.
  // Australian Museum and Museums Victoria describe pale skin, fine black
  // spots and gill/midbody/anus patches; the posterior patch stays buried here.
  function buildGardenEel(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(117), k = 0.96 + 0.08 * rng(), lean = 0.9 + 0.2 * rng(), phase = rng() * TAU;
    var body = new Geo(), detail = new Geo(), white = [1, 1, 1], cream = linHex(0xdedcc6), dark = linHex(0x151d1c), silver = linHex(0xc0b34e);
    var route = [[0, -0.006, 0], [0, 0.028, 0], [-0.003, 0.066, 0], [-0.001, 0.107, 0.001], [0.008, 0.147, 0.0015], [0.017, 0.175, 0.0012], [0.025, 0.193, 0.0006], [0.034, 0.201, 0], [0.043, 0.203, 0], [0.048, 0.203, 0]];
    function center(t) {
      var q = t * (route.length - 1), i = Math.min(route.length - 2, Math.floor(q)), f = q - i, a = route[Math.max(0, i - 1)], b = route[i], d = route[i + 1], e = route[Math.min(route.length - 1, i + 2)];
      return [catmull(a[0], b[0], d[0], e[0], f) * lean * k, catmull(a[1], b[1], d[1], e[1], f) * k, catmull(a[2], b[2], d[2], e[2], f) * k];
    }
    function radius(t) { return (0.0042 + 0.0007 * Math.sin(t * PI) - 0.0003 * smooth(0.72, 0.88, t) - 0.0017 * smooth(0.91, 1, t)) * k; }
    var steps = high ? 72 : 36, sides = high ? 20 : 10;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, p = center(t), a = center(Math.max(0, t - 0.0001)), b = center(Math.min(1, t + 0.0001)), dx = b[0] - a[0], dy = b[1] - a[1], den = Math.sqrt(dx * dx + dy * dy) || 1, r = radius(t);
      for (var j = 0; j <= sides; j++) {
        var u = j / sides, ca = Math.cos(u * TAU), sa = Math.sin(u * TAU), edge = r * (1 - 0.12 * smooth(0.89, 1, t));
        body.v(p[0] - dy / den * ca * r, p[1] + dx / den * ca * r, p[2] + sa * edge, white, u, t);
      }
      body.seams.push([i * (sides + 1), i * (sides + 1) + sides]);
    }
    for (i = 0; i < steps; i++) for (j = 0; j < sides; j++) {
      var v = i * (sides + 1) + j, v1 = v + sides + 1;
      body.i.push(v, v + 1, v1, v + 1, v1 + 1, v1);
    }
    // A shallow rounded terminal cap, with a narrow mouth across its lower lip.
    var tip = center(1), cap = body.count(); body.v(tip[0] + 0.00065 * k, tip[1], tip[2], white, 0.5, 1);
    for (j = 0; j < sides; j++) body.i.push(steps * (sides + 1) + j, steps * (sides + 1) + j + 1, cap);
    var pigment = kit.baked('garden-eel-skin|' + c.seed, 128, 512, function (u, v, out) {
      var f = 0.5 + 0.5 * Math.cos(u * TAU), shade = 0.05 * noise3(Math.cos(u * TAU) * 3, Math.sin(u * TAU) * 3, v * 125 + c.seed * 0.13), base = mixc(hex(0xf1ecda), hex(0xaeb6aa), f * 0.34 + shade, out);
      mulc(base, 0.71 + 0.29 * smooth(0, 0.15, v));
      var xx = u * 12, yy = v * 70, ix = Math.floor(xx), iy = Math.floor(yy), spot = 0;
      for (var sx = -1; sx <= 1; sx++) for (var sy = -1; sy <= 1; sy++) {
        var cx = ix + sx, cy = iy + sy, wrapped = ((cx % 12) + 12) % 12, seed = c.seed + 271;
        var px = cx + 0.18 + 0.64 * hash2(wrapped + seed, cy), py = cy + 0.18 + 0.64 * hash2(wrapped, cy + seed), rr = 0.21 + 0.15 * hash2(wrapped + 9, cy - seed);
        spot = Math.max(spot, disc((xx - px) * (0.9 + 0.2 * noise2(v * 35, Math.cos(u * TAU) * 9)), yy - py, rr, 0.055));
      }
      // Bilateral gill patch and the partly exposed lower flank blotch.
      var around = Math.min(Math.abs(u - 0.25), Math.abs(u - 0.75)), edge = 0.07 * (noise3(Math.cos(u * TAU) * 11, Math.sin(u * TAU) * 11, v * 160) - 0.5), patch = Math.max(disc(around / 0.105, (v - 0.80) / 0.037, 1 + edge, 0.10), disc(around / 0.105, (v - 0.19) / 0.034, 1 + edge, 0.10));
      mixc(base, hex(0x1d2422), Math.max(spot * 0.96, patch), out);
    }, true, false);
    var bodyGeo = kit.geo(body, 1), bodyMat = kit.std({ map: pigment, bumpMap: kit.flat('bump'), roughnessMap: kit.flat('rough'), roughness: 0.44 }, { sheen: sheenOf(T, 0xe4efdc, 0xffffff, 0.08) });
    kit.mesh(bodyGeo, bodyMat, 'body', c.root);
    // Small clear eyes, a dark gill aperture and tiny pectoral lobes, kept at
    // the same biological stations at both detail tiers.
    var eye = center(0.925), gill = center(0.80), eyeR = 0.0016 * k;
    [-1, 1].forEach(function (s) {
      blob(T, detail, eye[0], eye[1] + 0.0012 * k, s * 0.00375 * k, eyeR, eyeR, eyeR * 0.55, silver, high ? 10 : 6, high ? 6 : 4);
      blob(T, detail, eye[0] + 0.0003 * k, eye[1] + 0.0013 * k, s * 0.00455 * k, eyeR * 0.62, eyeR * 0.69, eyeR * 0.2, dark, high ? 10 : 6, high ? 6 : 4);
      blob(T, detail, eye[0] + 0.0007 * k, eye[1] + 0.0018 * k, s * 0.0048 * k, 0.0003 * k, 0.0003 * k, 0.00012 * k, white, 5, 3);
      blob(T, detail, gill[0] - 0.0004 * k, gill[1], gill[2] + s * 0.00425 * k, 0.00045 * k, 0.0015 * k, 0.00024 * k, dark, 6, 4);
      blob(T, detail, gill[0] - 0.0001 * k, gill[1] - 0.002 * k, gill[2] + s * 0.0047 * k, 0.0011 * k, 0.0022 * k, 0.00065 * k, cream, high ? 8 : 5, 4);
    });
    var mouth = [], lower = [];
    for (i = 0; i <= 6; i++) {
      var f = i / 6, z = (f - 0.5) * 0.0038 * k;
      mouth.push([tip[0] + (0.00015 + 0.00045 * Math.sin(f * PI)) * k, tip[1] - (0.00055 + 0.00018 * Math.sin(f * PI)) * k, z]);
      lower.push([tip[0] + (0.00010 + 0.00039 * Math.sin(f * PI)) * k, tip[1] - (0.0011 + 0.00013 * Math.sin(f * PI)) * k, z]);
    }
    detail.tube(mouth, 0.00018 * k, high ? 6 : 4, function () { return dark; });
    detail.tube(lower, 0.00030 * k, high ? 6 : 4, function () { return cream; });
    var detailGeo = kit.geo(detail, 1);
    kit.mesh(detailGeo, kit.std({ vertexColors: true, roughness: 0.52 }, { eye: true, iris: hex(0xc0b34e) }), 'detail', c.root);
    var geometries = [bodyGeo, detailGeo], bases = geometries.map(function (g) { return g.attributes.position.array.slice(); }), flow = { x: 0, z: 0, pulse: 0 };
    // Bending uses a frozen rest pose and absolute time. The burrow attachment,
    // root transform and below-sand vertices never translate or rotate.
    c.anim(function (t, dt, motion) {
      currentAt(c.root, motion, t, phase, flow);
      var sway = Math.sin(t * 0.49 + phase) - Math.sin(phase), cross = Math.sin(t * 0.37 + phase * 0.71) - Math.sin(phase * 0.71);
      for (var g = 0; g < geometries.length; g++) {
        var geometry = geometries[g], base = bases[g], out = geometry.attributes.position.array;
        for (var v = 0; v < base.length; v += 3) {
          var reach = smooth(0, 0.20 * k, base[v + 1]);
          out[v] = base[v] + reach * (flow.x * sway + flow.z * cross * 0.22) * 0.006 * k;
          out[v + 1] = base[v + 1];
          out[v + 2] = base[v + 2] + reach * (flow.z * sway - flow.x * cross * 0.22) * 0.006 * k;
        }
        geometry.attributes.position.needsUpdate = true; geometry.computeVertexNormals();
        if (g === 0) {
          var normal = geometry.attributes.normal;
          for (var row = 0; row <= steps; row++) {
            var na = row * (sides + 1), nb = na + sides, nx = normal.getX(na) + normal.getX(nb), ny = normal.getY(na) + normal.getY(nb), nz = normal.getZ(na) + normal.getZ(nb), nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            normal.setXYZ(na, nx / nl, ny / nl, nz / nl); normal.setXYZ(nb, nx / nl, ny / nl, nz / nl);
          }
        }
      }
    });
    // Keep the original bounds conservative throughout the small current bend.
    geometries.forEach(function (g) { g.boundingBox.expandByVector(new T.Vector3(0.016 * k, 0, 0.016 * k)); g.boundingSphere.radius += 0.023 * k; });
  }

  // Museums Victoria and Australian Museum: an angular, ring-armoured pipefish,
  // with bands continuing onto its long tubular snout and a distinct flag tail.
  // This is a 17 cm adult example, not the species maximum length.
  function buildBandedPipefish(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(119), k = 0.97 + 0.06 * rng(), phase = rng() * TAU;
    var body = new Geo(), eye = new Geo(), tail = new Geo(), dorsal = new Geo(), pectoral = new Geo(), white = [1, 1, 1], cream = linHex(0xe9dfc8), dark = linHex(0x291b1b);
    // The narrow head occupies about a quarter of standard length; roughly
    // two thirds of it is the straight feeding tube. No ordinary fish loft.
    var rows = [[-0.067, -0.0018, 0.00095, 0.00080], [-0.054, -0.0010, 0.00115, 0.00095], [-0.033, -0.0002, 0.00155, 0.00132], [-0.010, 0.00015, 0.0020, 0.00175], [0.013, 0.00035, 0.00225, 0.00195], [0.033, 0.00060, 0.00245, 0.0020], [0.043, 0.00085, 0.0020, 0.00185], [0.050, 0.00085, 0.00235, 0.00195], [0.055, 0.00065, 0.00125, 0.00112], [0.060, 0.00050, 0.00092, 0.00082], [0.078, 0.00050, 0.00070, 0.00068], [0.085, 0.00050, 0.00073, 0.00073]];
    function section(x) {
      var i = 1; while (i < rows.length - 1 && rows[i][0] < x) i++;
      var a = rows[i - 1], b = rows[i], t = clamp((x - a[0]) / (b[0] - a[0]), 0, 1); t = t * t * (3 - 2 * t);
      return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
    }
    var steps = high ? 96 : 48, sides = high ? 20 : 10;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps, x = lerp(0.085, -0.067, u), s = section(x);
      for (var j = 0; j <= sides; j++) {
        var a = j / sides * TAU;
        body.v(x * k, (s[0] + sp(Math.cos(a), 0.83) * s[1]) * k, sp(Math.sin(a), 0.83) * s[2] * k, white, u, j / sides);
      }
      body.seams.push([i * (sides + 1), i * (sides + 1) + sides]);
    }
    for (i = 0; i < steps; i++) for (j = 0; j < sides; j++) {
      var v = i * (sides + 1) + j, w = v + sides + 1;
      body.i.push(v, w, v + 1, v + 1, w, w + 1);
    }
    // Close the peduncle, and make an actual recessed terminal mouth rather
    // than leaving an open-ended cylinder through the snout.
    var end = body.count(); body.v(-0.067 * k, -0.0018 * k, 0, white, 1, 0.5);
    for (j = 0; j < sides; j++) body.i.push(end, steps * (sides + 1) + j + 1, steps * (sides + 1) + j);
    var lip = eye.count(), mouthY = 0.00050 * k;
    for (j = 0; j < (high ? 20 : 10); j++) {
      var angle = j / (high ? 20 : 10) * TAU;
      eye.v(0.0851 * k, mouthY + Math.cos(angle) * 0.00073 * k, Math.sin(angle) * 0.00073 * k, cream, 0, 0);
      eye.v(0.0847 * k, mouthY + Math.cos(angle) * 0.00040 * k, Math.sin(angle) * 0.00040 * k, dark, 0, 0);
    }
    var mouthSides = high ? 20 : 10, mouthCap = eye.count(); eye.v(0.08465 * k, mouthY, 0, dark, 0, 0);
    for (j = 0; j < mouthSides; j++) {
      var a0 = lip + j * 2, a1 = lip + ((j + 1) % mouthSides) * 2;
      eye.i.push(a0, a0 + 1, a1, a1, a0 + 1, a1 + 1, mouthCap, a1 + 1, a0 + 1);
    }
    var pigment = kit.baked('banded-pipefish-skin|' + c.seed, 512, 64, function (u, v, out) {
      var x = lerp(0.085, -0.067, u), a = v * TAU, grain = noise3(x * 950 + c.seed * 0.19, Math.cos(a) * 2.3, Math.sin(a) * 2.3) - 0.5;
      var cycle = x / 0.0105 + 0.17 + 0.018 * Math.sin(a * 2 + x * 55), f = fract(cycle), edge = 0.024;
      var red = smooth(0.20 - edge, 0.20 + edge, f) * (1 - smooth(0.70 - edge, 0.70 + edge, f));
      mixc(hex(0xece6d5), hex(0x71332f), red, out); mulc(out, 0.94 + 0.04 * Math.cos(a) + grain * 0.045);
    }, false, true);
    var relief = kit.baked('banded-pipefish-rings', 512, 64, function (u, v, out) {
      var x = lerp(0.085, -0.067, u), joint = band(fract((x + 0.067) / 0.0034) - 0.5, 0.055, 0.03) * (1 - smooth(0.047, 0.060, x));
      var h = 0.55 - joint * 0.24 + (noise2(u * 155, Math.cos(v * TAU) * 5) - 0.5) * 0.03;
      out[0] = out[1] = out[2] = h;
    }, false, true, true);
    var swim = { value: new T.Vector4(0, 0, 45 / k, 0) }, shape = { value: new T.Vector4(0.028 * k, -0.067 * k, 1, 0) };
    var bodyGeo = kit.geo(body, 1), bodyMat = kit.std({ map: pigment, bumpMap: relief, bumpScale: 0.000055 * k, roughnessMap: kit.flat('rough'), roughness: 0.49 }, { swim: swim, swimShape: shape, sheen: sheenOf(T, 0xd9dfd6, 0xc0e1dc, 0.035) });
    kit.mesh(bodyGeo, bodyMat, 'body', c.root);
    // Seated corneal domes at the same biological station at both tiers.
    function eyeProfile(x) { var s = section(x / k); return [(s[0] + s[1]) * k, (s[0] - s[1]) * k, s[2] * k]; }
    [-1, 1].forEach(function (side) {
      addEye(T, eye, eyeProfile, 2.4, [0.050 * k, 0.00145 * k, 0.0010 * k], side, hex(0xb69a65), high, 0.55, false);
      blob(T, eye, 0.040 * k, -0.0001 * k, side * 0.00193 * k, 0.00028 * k, 0.00085 * k, 0.00013 * k, dark, 6, 4);
    });
    // The caudal fan is rounded, with pale upper/lower margins and central
    // spots. It is not an annular bullseye or a curled seahorse tail.
    var tailPivot = kit.node('tail-pivot', c.root); tailPivot.position.set(-0.067 * k, -0.0018 * k, 0);
    var n = high ? 36 : 18, roots = [], edges = [];
    for (i = 0; i <= n; i++) {
      var theta = -PI * 0.5 + i / n * PI, co = Math.cos(theta), si = Math.sin(theta);
      roots.push([0, si * 0.00065 * k, 0]); edges.push([-(0.003 + 0.015 * co) * k, si * 0.009 * k, 0]);
    }
    tail.membrane(roots, edges, high ? 5 : 3, function (u, v, out) { setc(out, white); });
    var dorsalPivot = kit.node('dorsal-pivot', c.root); dorsalPivot.position.set(-0.004 * k, 0.0025 * k, 0);
    roots = []; edges = [];
    for (i = 0; i <= (high ? 20 : 10); i++) { var u = i / (high ? 20 : 10), x = (0.008 - u * 0.015) * k; roots.push([x, 0, 0]); edges.push([x - 0.0008 * k, Math.pow(Math.sin(u * PI), 0.65) * 0.0034 * k, 0]); }
    dorsal.membrane(roots, edges, high ? 3 : 2, function (u, v, out) { mixc(hex(0xbbb69a), hex(0xced7cb), v, out); });
    [-1, 1].forEach(function (side) {
      pectoral.membrane([[0.041 * k, 0.0004 * k, side * 0.0018 * k], [0.040 * k, -0.0008 * k, side * 0.0018 * k], [0.039 * k, -0.0014 * k, side * 0.0018 * k]], [[0.039 * k, 0.0012 * k, side * 0.0041 * k], [0.037 * k, -0.0008 * k, side * 0.0048 * k], [0.037 * k, -0.0023 * k, side * 0.0037 * k]], 2, function (u, v, out) { mixc(hex(0xb1b5a1), hex(0xd8d9c2), v, out); });
    });
    // A small shared pigment map keeps the diagnostic oval pale spot rounded
    // at both tiers. Other fins keep their own rays in a white atlas gutter.
    var tailMap = kit.baked('banded-pipefish-flag', 256, 128, function (u, v, out) {
      var margin = smooth(0.79, 0.985, Math.abs(u - 0.5) * 2) * smooth(0.20, 0.68, v);
      var spot = disc((u - 0.5) / 0.085, (v - 0.64) / 0.16, 1, 0.045);
      mixc(hex(0x9b3b32), hex(0xebe4cf), Math.max(margin, spot), out);
      if (u < 0.012 || u > 0.988) setc(out, white);
    }, false, false);
    [dorsal, pectoral].forEach(function (g) { for (var at = 0; at < g.t.length; at += 2) g.t[at] += 3; });
    var rig = new Float32Array(80), entries = [batchDetail({ geo: eye.build(T, 1), part: 'eyes-mouth' }), { geo: tail.build(T, 1), part: 'tail', node: tailPivot, bend: 0, rough: 0.52, rays: 1, eye: 0 }, { geo: dorsal.build(T, 1), part: 'dorsal', node: dorsalPivot, bend: 0, rough: 0.55, rays: 1, eye: 0 }, { geo: pectoral.build(T, 1), part: 'pectoral', rough: 0.55, bend: 1, rays: 1, eye: 0 }];
    var detailMat = kit.std({ vertexColors: true, side: T.DoubleSide, roughness: 0.52, map: tailMap, bumpMap: kit.flat('bump'), roughnessMap: kit.flat('rough') }, { swim: swim, swimShape: shape, batch: rig, eye: true, iris: hex(0xb69a65), finRelief: 0.05 });
    var batch = batchFish(kit, entries, detailMat, rig, 'fins', c.root, 0.17 * k);
    bodyGeo.boundingBox.expandByVector(new T.Vector3(0, 0, 0.0015 * k)); bodyGeo.boundingSphere.radius += 0.0015 * k;
    c.anim(function (t) {
      // Dorsal propulsion is a fine flutter. The ringed trunk and feeding tube
      // stay composed; only a millimetre-scale posterior correction is used.
      var slow = Math.sin(t * 0.83 + phase) - Math.sin(phase);
      swim.value.set(t * 2.7 + phase, 0.00065 * k, 45 / k, t);
      tailPivot.position.z = 0.00065 * k * Math.sin(t * 2.7 + phase + 45 * 0.067);
      tailPivot.rotation.y = 0.045 * slow; dorsalPivot.rotation.x = 0.20 * Math.sin(t * 24 + phase);
      batchPose(batch);
    });
  }

  // A living Charonia tritonis: rounded whorls, short canal and a genuinely
  // open, orange-lined aperture (FAO Western Central Pacific, gastropods p541).
  function buildGiantTriton(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(197), k = 0.93 + 0.14 * rng(), phase = rng() * TAU;
    var shell = new Geo(), animal = new Geo(), nu = high ? 44 : 20, nv = high ? 16 : 8, end = TAU * 4.8, innerU = high ? 24 : 8, ranges = {};
    var cream = hex(0xeee0bd), ochre = hex(0xc49b63), chestnut = hex(0x75442d), orange = hex(0xdd985f), dark = hex(0x382722), white = [1, 1, 1];
    function point(s, v, inside, rim) {
      var f = Math.exp(0.15 * (s - end)), r = 0.06 * f, travel = Math.pow(f, 0.65), theta = s - end + PI;
      var axis = -0.15 + 0.18 * f, y0 = 0.115 + 0.03 * (1 - f), sn = Math.sin(v), cs = Math.cos(v);
      var cords = inside ? 1 : 1 + 0.018 * Math.cos(v * 4) + 0.008 * Math.cos(v * 8);
      var varix = inside ? 0 : 0.045 * Math.pow(Math.max(0, Math.cos((s - end) / 0.75 + phase)), 16);
      var flare = inside ? 0.9 : 1 + 0.055 * smooth(end - 0.3, end, s), a = 1.75 * r * flare, b = 0.8 * r * (inside ? 0.9 : cords + varix) * flare;
      if (rim !== undefined) { a = 1.75 * r * lerp(0.9, 1.055, rim); b = 0.8 * r * lerp(0.9, cords + varix, rim) * lerp(1, 1.055, rim); }
      // A modest forward notch forms the short siphonal canal, never fingers.
      var canal = 0.008 * f * Math.pow(Math.max(0, cs), 10), radial = r + b * sn * (1 - 0.12 * Math.max(0, cs));
      return [(axis + a * cs + canal) * k, (y0 + radial * Math.cos(theta)) * k, (-radial * Math.sin(theta) + (rim === undefined ? 0 : 0.0025 * Math.sin(PI * rim))) * k];
    }
    function surface(u0, u1, nx, inside, name) {
      var first = shell.count(); ranges[name] = { first: first, rows: nx + 1, columns: nv + 1 };
      for (var i = 0; i <= nx; i++) for (var j = 0; j <= nv; j++) {
        var s = lerp(u0, u1, i / nx), v = j / nv * TAU, p = point(s, v, inside), color = white;
        if (inside) { var d = 1 - i / nx; color = lin(mixc(orange, dark, 0.82 * Math.sqrt(d), [0, 0, 0])); }
        shell.v(p[0], p[1], p[2], color, inside ? 0.5 : s / end, inside ? 0.94 : j / nv * 0.8);
      }
      for (i = 0; i < nx; i++) for (j = 0; j < nv; j++) { var a = first + i * (nv + 1) + j, b = a + nv + 1; if (inside) shell.i.push(a, a + 1, b, a + 1, b + 1, b); else shell.i.push(a, b, a + 1, a + 1, b, b + 1); }
      for (i = 0; i <= nx; i++) shell.seams.push([first + i * (nv + 1), first + i * (nv + 1) + nv]);
    }
    surface(end - TAU * 1.05, end, nu, false, 'outer');
    // The rear construction section is buried against the spire and closed;
    // only the terminal orange-lined aperture is open to the living animal.
    var rearCentre = [0, 0, 0];
    for (var rc = 0; rc < nv; rc++) { rearCentre[0] += shell.p[rc * 3] / nv; rearCentre[1] += shell.p[rc * 3 + 1] / nv; rearCentre[2] += shell.p[rc * 3 + 2] / nv; }
    var rearCap = shell.v(rearCentre[0], rearCentre[1], rearCentre[2], white, (end - TAU * 1.05) / end, 0.4);
    for (rc = 0; rc < nv; rc++) shell.i.push(rearCap, rc + 1, rc);

    // A straight conical spire carries continuous rounded whorls and a helical
    // suture. It overlaps the final swept whorl instead of exposing a loose coil.
    var spireFirst = shell.count(), spireU = high ? 48 : 28, spireV = high ? 24 : 8;
    ranges.spire = { first: spireFirst, rows: spireU + 1, columns: spireV + 1 };
    for (var si = 0; si <= spireU; si++) for (var sj = 0; sj <= spireV; sj++) {
      var su = si / spireU, sa = sj / spireV * TAU, helix = fract(su * 5.2 - sa / TAU), seam = Math.exp(-Math.pow((helix - 0.5) / 0.11, 2));
      var sr = (0.0004 + 0.028 * Math.pow(su, 1.16)) * (1 - 0.16 * seam + 0.016 * Math.cos(sa * 4));
      shell.v((-0.19 + 0.145 * su) * k, (0.17 - 0.025 * su + sr * Math.cos(sa)) * k, sr * Math.sin(sa) * k, white, 0.4 + su * 0.18, sj / spireV * 0.8);
    }
    for (si = 0; si < spireU; si++) for (sj = 0; sj < spireV; sj++) { var sp0 = spireFirst + si * (spireV + 1) + sj, sp1 = sp0 + spireV + 1; shell.i.push(sp0, sp1, sp0 + 1, sp0 + 1, sp1, sp1 + 1); }
    for (si = 0; si <= spireU; si++) shell.seams.push([spireFirst + si * (spireV + 1), spireFirst + si * (spireV + 1) + spireV]);
    var tip = shell.v(-0.191 * k, 0.17 * k, 0, lin(cream), 0.5, 0.94);
    for (var j = 0; j < spireV; j++) shell.i.push(tip, spireFirst + j + 1, spireFirst + j);
    var spireBase = shell.v(-0.045 * k, 0.145 * k, 0, lin(cream), 0.5, 0.94), spireLast = spireFirst + spireU * (spireV + 1);
    for (j = 0; j < spireV; j++) shell.i.push(spireBase, spireLast + j, spireLast + j + 1);

    // The inner wall follows almost a full turn into the shell. Its mouth stays
    // open: no ellipse or disk spans the aperture at the terminal section.
    surface(end - TAU * 0.9, end, innerU, true, 'inner');
    var lipFirst = shell.count(), lipRows = high ? 3 : 2; ranges.lip = { first: lipFirst, rows: lipRows + 1, columns: nv + 1 };
    for (var r = 0; r <= lipRows; r++) for (j = 0; j <= nv; j++) {
      var v = j / nv * TAU, p = point(end, v, false, r / lipRows), col = [0, 0, 0];
      mixc(orange, cream, smooth(0.15, 0.9, r / lipRows), col);
      shell.v(p[0], p[1], p[2], lin(col), j / nv, 0.875);
    }
    for (r = 0; r < lipRows; r++) for (j = 0; j < nv; j++) { var a = lipFirst + r * (nv + 1) + j, b = a + nv + 1; shell.i.push(a, a + 1, b, a + 1, b + 1, b); }
    // Paired, small inward teeth are weak in the central lip, as in the species.
    var teeth = high ? [-2.75, -2.62, -2.12, -1.99, 0.78, 0.91, 1.25, 1.38] : [-2.7, -2.08, 0.84, 1.32];
    teeth.forEach(function (v) { var p = point(end, v, true); shell.spike([p[0], p[1], p[2] + 0.001 * k], [-Math.cos(v), Math.sin(v), 0], 0.0034 * k, 0.001 * k, lin(cream), lin(cream)); });
    // Rounded columellar folds stand just inside one side of the opening.
    for (var f = 0; f < (high ? 8 : 4); f++) {
      var v = 2.0 + f / (high ? 7 : 3) * 0.95, p = point(end, v, true), pts = [[p[0] - 0.004 * k, p[1] - 0.001 * k, p[2]], [p[0], p[1], p[2] + 0.0018 * k], [p[0] + 0.004 * k, p[1] + 0.001 * k, p[2]]];
      shell.tube(pts, 0.001 * k, high ? 4 : 3, function () { return lin(cream); });
    }
    var pigment = kit.baked(c.key('triton-shell'), high ? 512 : 256, high ? 256 : 128, function (u, v, out) {
      if (v > 0.85 && v < 0.9) { mixc(white, chestnut, band(fract(u * 12) - 0.5, 0.22, 0.04) * 0.9, out); return; }
      if (v > 0.815) { setc(out, white); return; }
      var a = v / 0.8 * TAU, s = u * end, flame = Math.sin(s * 6.5 + Math.sin(a * 3) * 1.3 + 0.4 * Math.sin(s * 1.7));
      var bands = smooth(0.18, 0.65, flame) * (0.65 + 0.35 * noise2(s * 3 + phase, Math.cos(a) * 6));
      mixc(cream, ochre, 0.2 + 0.15 * Math.cos(a * 9), out); mixc(out, chestnut, bands * 0.9, out);
      mulc(out, 0.96 + 0.04 * noise2(s * 21, Math.cos(a) * 31));
    }, false, true);
    var relief = kit.baked(c.key('triton-ridges'), high ? 512 : 256, high ? 256 : 128, function (u, v, out) {
      if (v > 0.815) { out[0] = out[1] = out[2] = 0.5; return; }
      var a = v / 0.8 * TAU, ridge = Math.pow(0.5 + 0.5 * Math.cos(a * 15), 0.4), cord = Math.pow(0.5 + 0.5 * Math.cos(a * 30), 4);
      out[0] = out[1] = out[2] = 0.34 + 0.32 * ridge + 0.11 * cord + 0.035 * noise2(u * 270, Math.cos(a) * 100);
    }, false, false, true);
    var shellGeometry = kit.geo(shell, 1); shellGeometry.userData.triton = ranges;
    kit.mesh(shellGeometry, kit.std({ vertexColors: true, map: pigment, bumpMap: relief, bumpScale: 0.0014 * k, roughness: 0.64, side: T.DoubleSide }), 'shell', c.root);
    var pale = hex(0xb79b6e), skinDark = hex(0x594a36), skinLight = hex(0xb99e73), ink = lin(hex(0x171914));
    animal.loft([[0.16, 0.019, 0.004, 0.019], [0.13, 0.034, 0.003, 0.037], [0.07, 0.037, 0.002, 0.047], [-0.015, 0.028, 0.002, 0.043], [-0.07, 0.016, 0.004, 0.027], [-0.095, 0.009, 0.005, 0.008]], high ? 16 : 6, high ? 12 : 8, function (u, a, x, y, z, out) {
      mixc(pale, skinLight, 0.25 * Math.sin(a), out); mixc(out, skinDark, smooth(0.5, 0.69, noise2(x * 130 + phase, z * 140)) * smooth(0.008, 0.025, y) * 0.85, out);
    }, 2.8);
    blob(T, animal, 0.11, 0.035, 0.031, 0.032, 0.018, 0.025, lin(pale), high ? 10 : 6, high ? 6 : 4);
    blob(T, animal, 0.015, 0.038, -0.015, 0.05, 0.026, 0.027, lin(skinDark), high ? 12 : 8, high ? 8 : 4);
    // A short relaxed proboscis; this is an illustrative crawl, not a feeding act.
    animal.tube([[0.125, 0.032, 0.04], [0.139, 0.027, 0.047], [0.148, 0.024, 0.051]], function (u) { return 0.009 - 0.003 * u; }, high ? 6 : 4, function (u) { return lin(mixc(pale, skinDark, u * 0.4, [0, 0, 0])); });
    // Cream-and-ochre mottling continues across the living head and mantle.
    for (var sk = 0; sk < animal.count(); sk++) {
      var sx = animal.p[sk * 3], sy = animal.p[sk * 3 + 1], sz = animal.p[sk * 3 + 2];
      var pigmentAmount = smooth(0.47, 0.67, noise2(sx * 115 + phase, sz * 135)) * smooth(0.006, 0.018, sy);
      var skin = lin(mixc(skinLight, skinDark, pigmentAmount * 0.9, [0, 0, 0]));
      animal.c[sk * 3] = skin[0]; animal.c[sk * 3 + 1] = skin[1]; animal.c[sk * 3 + 2] = skin[2];
      if (sy < 0.022 && Math.abs(sz) > 0.027) animal.p[sk * 3 + 2] += 0.0015 * Math.sin(sx * 83 + phase) * (sz > 0 ? 1 : -1);
    }
    [-1, 1].forEach(function (side) { blob(T, animal, 0.12, 0.048, 0.031 + side * 0.018, 0.0028, 0.003, 0.003, ink, high ? 6 : 4, high ? 4 : 3); });
    var baseY = Infinity; for (var bi = 1; bi < animal.p.length; bi += 3) baseY = Math.min(baseY, animal.p[bi]);
    animal.map(0, function (p) { p[1] -= baseY; }); scaleGeo(animal, k);
    var rig = new Float32Array(80), entries = [{ geo: animal.build(T, 1), part: 'foot-head' }], pivots = [];
    [-1, 1].forEach(function (side) {
      var tentacle = new Geo(), pts = [], n = high ? 8 : 4;
      for (var i = 0; i <= n; i++) { var u = i / n; pts.push([0.053 * u, 0.013 * u + 0.004 * Math.sin(PI * u), side * 0.015 * u]); }
      tentacle.tube(pts, function (u) { return 0.0038 * (1 - 0.84 * u); }, high ? 6 : 4, function (u) { return lin(mixc(skinLight, skinDark, band(fract(u * 3.2) - 0.5, 0.21, 0.08), [0, 0, 0])); });
      var pv = kit.node(side > 0 ? 'tentacle-near' : 'tentacle-far', c.root); pv.position.set(0.122 * k, (0.05 - baseY) * k, (0.031 + side * 0.018) * k); pivots.push(pv);
      entries.push({ geo: tentacle.build(T, k), part: side > 0 ? 'tentacle-near' : 'tentacle-far', node: pv, bend: 0 });
    });
    var animalMaterial = kit.std({ vertexColors: true, roughness: 0.49, side: T.DoubleSide }, { batch: rig });
    var bodyBatch = batchMesh(kit, entries, animalMaterial, rig, 'animal', c.root);
    bodyBatch.geometry.boundingBox.expandByScalar(0.003 * k);
    batchReach(bodyBatch, pivots.map(function (p) { return { center: p.position, reach: 0.058 * k, margin: 0.003 * k }; }));
    c.anim(function (t) { for (var i = 0; i < pivots.length; i++) { pivots[i].rotation.y = 0.045 * Math.sin(t * 0.33 + phase + i * 1.7); pivots[i].rotation.z = 0.022 * Math.sin(t * 0.27 + phase + i); } batchPose(bodyBatch); });
  }

  // Chelidonura varians Eliot, 1903: a headshield slug, not a nudibranch.
  // Broad shield, rolled parapodia and unequal posterior lobes follow the
  // Australian Museum Sea Slug Forum and Lizard Island Field Guide photos.
  // Ascarosepion latimanus (formerly Sepia latimanus): a representative,
  // unsexed brown/cream animal. The nominal .30 m includes mantle, head and
  // posed arm crown; it is not mantle length or a species maximum.
  function buildBroadclubCuttlefish(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(389),L=.30*(.98+.04*rng()),phase=rng()*TAU;
    var body=new Geo(),fins=new Geo(),ranges={},arms=[],cups=[],finParts=[],eyes=[],papillae=[];
    var white=[1,1,1],cream=hex(0xc7ab86),brown=hex(0x70533c),umber=hex(0x65503e),pale=hex(0xe5d6b7),gold=hex(0xbba261),ink=hex(0x172321);
    function mark(name,first){ranges[name]={first:first,count:body.count()-first};}
    function neutral(g,first){for(var j=first;j<g.count();j++){g.t[j*2]=1;g.t[j*2+1]=1;}}
    function skin(t,a,x,y,z,out){mixc(brown,cream,.30+.22*smooth(-.045,.09,y),out);mixc(out,pale,(1-smooth(-.065,-.02,y))*.48,out);}
    var rows=[[.132,.045,-.037,.075],[.095,.087,-.070,.132],[.00,.119,-.086,.182],[-.16,.125,-.079,.196],[-.31,.101,-.064,.165],[-.43,.055,-.032,.095],[-.49,.008,-.006,.012]],prof=profile(rows),sample=[0,0,0],first=body.count();
    body.loft(rows,high?18:7,high?20:10,skin);mark('oval-mantle',first);
    first=body.count();blob(T,body,.178,.003,0,.105,.070,.126,lin(cream),high?14:6,high?8:4);mark('head',first);
    // The mantle collar overlaps the head, while a pale rolled funnel opens
    // beneath it. The lumen is recessed geometry rather than a black decal.
    first=body.count();var funnelSides=high?10:4,frings=[[.09,-.060,.023],[.135,-.072,.022],[.170,-.075,.019],[.190,-.071,.017],[.198,-.068,.016],[.201,-.067,.0145],[.200,-.067,.012],[.191,-.069,.010]];
    for(var r=0;r<frings.length;r++)for(var j=0;j<funnelSides;j++){var a=j/funnelSides*TAU,q=frings[r],col=lin(r<6?cream:r===6?umber:ink);body.v(q[0],q[1]+Math.cos(a)*q[2],Math.sin(a)*q[2],col,1,1);if(r){var b=first+(r-1)*funnelSides+j,d=first+(r-1)*funnelSides+(j+1)%funnelSides;body.i.push(b,d,b+funnelSides,d,d+funnelSides,b+funnelSides);}}
    var end=body.v(.187,-.069,0,lin(ink),1,1);for(j=0;j<funnelSides;j++)body.i.push(first+7*funnelSides+j,first+7*funnelSides+(j+1)%funnelSides,end);mark('recessed-funnel',first);
    // Low rounded skin papillae, including elongated ones beside each fin.
    // These are one calm texture state, not a diagnostic count or a display.
    first=body.count();for(var p=0;p<22;p++){var side=p%2?-1:1,u=Math.floor(p/2)/10,x=lerp(-.40,.065,u)+.008*(rng()-.5),z=side*(p<16?.10:.044)*(1-.35*Math.abs(x+.10))+.012*(rng()-.5),rr=.010+.004*rng(),height=.006+.007*rng();prof(x,sample);var y=(sample[0]+sample[1])*.5+(sample[0]-sample[1])*.5*Math.sqrt(Math.max(0,1-z*z/(sample[2]*sample[2])))-.002,at=body.count(),n=high?7:3;
      for(var ring=0;ring<2;ring++){var f=ring?.42:1;for(j=0;j<n;j++){a=j/n*TAU;body.v(x+Math.cos(a)*rr*f*(p<16?1.45:1),y+ring*height*.76,z+Math.sin(a)*rr*f,lin(mixc(cream,brown,ring?.10:.25,[0,0,0])),.5+.3*x,.5+.8*z);}}
      var tip=body.v(x,y+height,z,lin(cream),.5+.3*x,.5+.8*z);for(j=0;j<n;j++){var b=at+j,d=at+(j+1)%n;body.i.push(b,d,b+n,d,d+n,b+n,b+n,d+n,tip);}papillae.push({first:at,count:body.count()-at,root:[x,y,z],height:height});
    }mark('rounded-skin-papillae',first);
    // Each lateral eye has a pale olive iris, warm ventral rim and an actual
    // W-shaped pupil. The pupil is a softly bent slit, not a round fish pupil.
    [-1,1].forEach(function(side){var at=body.count(),cx=.185,cy=.028,cz=side*.112;
      blob(T,body,cx,cy,cz,.051,.040,.029,lin(mixc(cream,brown,.46,[0,0,0])),high?14:6,high?8:4);
      var iris=body.count();blob(T,body,cx+.004,cy,side*.137,.035,.026,.011,function(x,y){return lin(mixc(hex(0x7d8b70),gold,1-smooth(cy-.018,cy+.004,y),[0,0,0]));},high?12:8,high?6:3);neutral(body,iris);
      var controls=[[-.90,.06],[-.75,.16],[-.54,-.12],[-.30,.11],[-.10,.14],[.12,-.11],[.38,.10],[.66,.15],[.88,.04],[.76,-.06],[.40,-.07],[.13,-.31],[-.10,-.06],[-.30,-.09],[-.54,-.31],[-.75,-.04]],outline=[],samples=high?3:2;
      for(var q=0;q<controls.length;q++)for(var j=0;j<samples;j++){var A=controls[(q+controls.length-1)%controls.length],B=controls[q],C=controls[(q+1)%controls.length],D=controls[(q+2)%controls.length],u=j/samples;outline.push([catmull(A[0],B[0],C[0],D[0],u),catmull(A[1],B[1],C[1],D[1],u)]);}
      var points=outline.map(function(q){return new T.Vector2(q[0],q[1]);}),faces=T.ShapeUtils.triangulateShape(points,[]),pupil=body.count();
      outline.forEach(function(q){var xx=q[0]*.033,yy=q[1]*.030;body.v(cx+.004+xx,cy+yy,side*(.138+.011*Math.sqrt(Math.max(.02,1-xx*xx/(.035*.035)-yy*yy/(.026*.026)))),lin(ink),1,1);});faces.forEach(function(f){body.i.push(pupil+f[0],pupil+f[1],pupil+f[2]);});
      var brow=[];for(var k=0;k<= (high?8:4);k++){var u=k/(high?8:4),a=PI*(.10+.80*u);brow.push([cx+.039*Math.cos(a),cy+.029*Math.sin(a),side*(.132+.009*Math.sin(a))]);}body.tube(brow,function(u){return .0015+.0025*Math.sin(PI*u);},high?5:3,function(){return lin(mixc(cream,brown,.2,[0,0,0]));});neutral(body,body.count()-brow.length*(high?5:3)-1);
      eyes.push({side:side,first:at,count:body.count()-at,center:[cx+.004,cy,side*.137],pupilFirst:pupil,pupilCount:outline.length,pupilShape:'W',yellowLowerRim:true});
    });
    // Eight arms surround the mouth. Both longer feeding tentacles remain
    // stored in their pockets; no extra permanent arms or exposed clubs.
    var segs=high?13:5,sides=high?6:4;
    function armPoint(i,u){var side=i<4?-1:1,pair=i%4,a=(pair-.5)*PI/3.25,ry=Math.cos(a)*.049,rz=side*(.046+.029*Math.sin(a)),reach=.280-(pair===3?.025:0),curl=clamp((u-.62)/.38,0,1),bend=curl*curl;return[.244+reach*(u-.22*bend),.002+ry*(1+1.05*u)+(.020+.012*pair)*Math.sin(PI*u)-.043*bend*(pair<2?-1:1),rz*(1+.60*u)+side*(.020*Math.sin(PI*u)+.012*bend*Math.sin(pair+phase))];}
    function armRadius(u){return .025*Math.pow(1-u,1.12)+.0011;}
    for(var i=0;i<8;i++){var pts=[],at=body.count();for(j=0;j<=segs;j++)pts.push(armPoint(i,j/segs));body.tube(pts,armRadius,sides,function(u,s){var edge=Math.pow(Math.max(0,Math.cos(s*TAU)),12);return lin(mixc(brown,pale,.26+.60*edge+.16*u,[0,0,0]));});for(j=0;j<=segs;j++)for(var k=0;k<sides;k++){body.t[(at+j*sides+k)*2]=j/segs;body.t[(at+j*sides+k)*2+1]=k/sides;}arms.push({index:i,side:i<4?-1:1,pair:i%4,first:at,count:body.count()-at,root:pts[0],tip:pts[segs],points:pts});}
    // Tiny recessed suction cups are arranged in FOUR rows along the inner
    // arm surface. The low tier samples fewer stations, preserving all rows.
    var stations=high?8:3,cupSides=high?6:3,ac=new T.Vector3(),tan=new T.Vector3(),normal=new T.Vector3(),across=new T.Vector3();
    first=body.count();for(i=0;i<8;i++)for(var st=0;st<stations;st++){var station=high?st:st*3,u=.13+.72*station/7,P=armPoint(i,u),A=armPoint(i,Math.max(0,u-.006)),B=armPoint(i,Math.min(1,u+.006)),rad=armRadius(u);tan.set(B[0]-A[0],B[1]-A[1],B[2]-A[2]).normalize();normal.set(0,-P[1],-P[2]).normalize();normal.addScaledVector(tan,-normal.dot(tan)).normalize();across.crossVectors(tan,normal).normalize();
      for(var row=0;row<4;row++){var offset=(row-1.5)*.47,rr=rad*.205,at=body.count();ac.set(P[0],P[1],P[2]).addScaledVector(normal,rad*Math.sqrt(Math.max(.1,1-offset*offset))).addScaledVector(across,rad*offset);
        for(j=0;j<cupSides;j++){a=j/cupSides*TAU;body.v(ac.x+tan.x*Math.cos(a)*rr+across.x*Math.sin(a)*rr+normal.x*rr*.23,ac.y+tan.y*Math.cos(a)*rr+across.y*Math.sin(a)*rr+normal.y*rr*.23,ac.z+tan.z*Math.cos(a)*rr+across.z*Math.sin(a)*rr+normal.z*rr*.23,lin(pale),1,1);}
        var center=body.v(ac.x-normal.x*rr*.12,ac.y-normal.y*rr*.12,ac.z-normal.z*rr*.12,lin(hex(0x957b62)),1,1);for(j=0;j<cupSides;j++)body.i.push(at+j,at+(j+1)%cupSides,center);cups.push({arm:i,row:row,station:station,first:at,count:cupSides+1,radius:rr});
      }
    }mark('four-row-suction-cups',first);
    // Two sheltered pocket folds between the ventral arm roots. The tentacle
    // clubs are retracted and deliberately have no exposed geometry.
    first=body.count();[-1,1].forEach(function(side){blob(T,body,.253,-.036,side*.032,.020,.006,.010,lin(umber),high?8:4,high?4:2);});neutral(body,first);mark('retracted-tentacle-pocket-folds',first);
    // The thin fin skirt joins the whole mantle side, with a subtle travelling
    // wave. The attachment row and both ends are immobile in world space.
    [-1,1].forEach(function(side){var at=fins.count(),n=high?32:20,nw=high?3:1;
      for(var q=0;q<=n;q++)for(var j=0;j<=nw;j++){var u=q/n,v=j/nw,x=lerp(-.48,.112,u);prof(x,sample);var width=.055*Math.pow(Math.max(0,Math.sin(PI*u)),.65),envelope=Math.sin(PI*u)*v*v,angle=phase+u*PI*4.2+side*.6,y=(sample[0]+sample[1])*.5-.007+.009*envelope*Math.sin(angle),z=side*(sample[2]*.985+width*v);fins.v(x,y,z,lin(mixc(cream,pale,smooth(.70,1,v)*.74,[0,0,0])),u,.55+.43*v);if(q&&j){var a=at+(q-1)*(nw+1)+j-1,b=a+nw+1;fins.i.push(a,b,a+1,a+1,b,b+1);}}
      finParts.push({side:side,first:at,count:fins.count()-at,longitudinalSegments:n,widthSegments:nw});
    });
    var map=kit.baked(c.key('cuttlefish-mottled-skin'),high?512:256,high?256:128,function(u,v,out){setc(out,white);if(u>.98&&v>.98)return;var n=fbm2(u*13+phase,v*11,3),small=noise2(u*87+phase,v*63),grain=noise2(u*301+phase,v*199),flecks=(1-smooth(.22,.38,small))*.22,shade=smooth(.49,.72,n)*.39;mixc(white,hex(0x78634f),shade,out);mixc(out,hex(0xb3a38d),smooth(.66,.81,grain)*.13,out);mixc(out,white,flecks,out);},false,false);
    var bump=kit.baked(c.key('cuttlefish-papillose-skin'),high?256:128,high?128:64,function(u,v,out){out[0]=out[1]=out[2]=.4+.17*noise2(u*151+phase,v*99)+.13*smooth(.54,.77,noise2(u*41+phase,v*29));},false,false,true);
    scaleGeo(body,L);scaleGeo(fins,L);var bg=kit.geo(body,1),fg=kit.geo(fins,1);
    bg.userData.broadclubCuttlefish={ranges:ranges,scaleM:L,nominalPosedLengthM:.30,approximateMantleLengthM:.19,appearance:'unsexed-brown-cream-example',arms:arms,visibleArms:8,retractedFeedingTentacles:2,exposedTentacleClubs:0,suckerRows:4,cups:cups,eyes:eyes,papillae:papillae};
    fg.userData.broadclubCuttlefish={fins:finParts,maximumDisplacementM:.0181*L,rootMotion:false};
    var mat=kit.std({vertexColors:true,map:map,bumpMap:bump,bumpScale:.00075*L,roughness:.43,side:T.DoubleSide});kit.mesh(bg,mat,'fixed-mantle-head-arm-crown',c.root);kit.mesh(fg,mat,'continuous-lateral-fin-skirt',c.root);
    var rest=fg.attributes.position.array.slice();fg.boundingBox.expandByScalar(.0181*L);fg.boundingSphere.radius+=.0181*L;
    c.anim(function(t){var out=fg.attributes.position.array;finParts.forEach(function(f){for(var q=1;q<f.longitudinalSegments;q++)for(var j=1;j<=f.widthSegments;j++){var u=q/f.longitudinalSegments,v=j/f.widthSegments,k=(f.first+q*(f.widthSegments+1)+j)*3,a=phase+u*PI*4.2+f.side*.6,weight=.009*L*Math.sin(PI*u)*v*v;out[k+1]=rest[k+1]+weight*(Math.sin(a-t*1.45)-Math.sin(a));}});fg.computeVertexNormals();fg.attributes.position.needsUpdate=true;});
  }


  // Phyllidia varicosa: representative 60 mm animal with five tuberculate
  // blue-grey ridges. The sole stripe and lateral underside gills distinguish
  // this phyllidiid from a dorid with an exposed dorsal gill plume.
  function buildVaricosePhyllidia(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(367),L=.06*(.98+.04*rng()),phase=rng()*TAU;
    var body=new Geo(),sensory=new Geo(),ranges={},ridges=[],tubercles=[],gills=[],rhinophores=[],white=[1,1,1],blue=hex(0x829fb2),pale=hex(0xb2c7cf),ink=hex(0x171f2b),gold=hex(0xe6bb39),yellow=hex(0xf5d15a),sole=hex(0x9cabb8);
    function mark(name,start){ranges[name]={first:start,count:body.count()-start};}
    function neutral(g,first){for(var k=first;k<g.count();k++){g.t[k*2]=.02+.46*clamp(g.p[k*3]+.5,0,1);g.t[k*2+1]=.52+.46*clamp((g.p[k*3+2]+.225)/.45,0,1);}}
    function width(x){return .225*Math.pow(Math.max(0,1-Math.pow(x/.5,2)),.55);}
    function topY(x,z){var u=clamp(Math.sqrt(Math.pow(x/.5,2)+Math.pow(z/.225,2)),0,1);return .043+.105*Math.pow(Math.max(0,1-u*u),.78);}
    function ridgeZ(row,x){return row*.087+.010*Math.sin(x*9+phase+row*.7)*(1-Math.abs(row)*.12);}
    var nr=high?5:3,ns=high?56:20,first=body.count();
    body.polar(nr,ns,function(r,a,out){var x=.5*r*Math.cos(a),z=.225*r*Math.sin(a),fold=1-.035*smooth(.87,1,r);x*=fold;z*=fold;setc(out,white);return[x,topY(x,z),z,.02+.46*(x+.5),.02+.46*(z+.225)/.45];});body.t[first*2]=.25;body.t[first*2+1]=.25;mark('rounded-mantle',first);
    first=body.count();body.polar(high?2:1,ns,function(r,a,out){var fold=1-.035*smooth(.87,1,r),x=.5*r*Math.cos(a)*fold,z=.225*r*Math.sin(a)*fold;setc(out,lin(mixc(blue,pale,.20,[0,0,0])));return[x,.043-.016*Math.sin(PI*r)+(topY(x,z)-.043)*Math.pow(r,12),z,.5,.5];},true);mark('curled-mantle-underside',first);
    // Soft foot, with a flat contact sole. Its black longitudinal stripe is
    // painted only on the true ventral surface, not around the mantle edge.
    first=body.count();var fn=high?2:1,fs=high?40:24,top=body.count();
    body.polar(fn,fs,function(r,a,out){setc(out,lin(sole));return[.455*r*Math.cos(a),.018+.032*Math.pow(Math.max(0,1-r*r),.7),.156*r*Math.sin(a),.5,.5];});
    var bottom=body.count();body.polar(fn,fs,function(r,a,out){var x=.455*r*Math.cos(a),z=.156*r*Math.sin(a);setc(out,white);return[x,0,z,.52+.46*(x+.455)/.91,.02+.46*(z+.156)/.312];},true);body.t[bottom*2]=.75;body.t[bottom*2+1]=.25;
    for(var j=0;j<fs;j++){var a=top+1+(fn-1)*fs+j,b=top+1+(fn-1)*fs+(j+1)%fs,d=bottom+1+(fn-1)*fs+j,e=bottom+1+(fn-1)*fs+(j+1)%fs;body.i.push(a,d,b,b,d,e);}mark('foot-and-striped-sole',first);
    // Three strong ridges, including the diagnostic midline ridge, and two
    // quieter, shorter lateral ridges. Shape and tubercle stations are seeded
    // once and remain identical between detail tiers.
    first=body.count();
    for(var row=-2;row<=2;row++){var outer=Math.abs(row)===2,from=outer?-.30:-.41,to=outer?.24:.32,segments=high?(outer?10:14):(outer?4:6),pts=[],w=outer?.023:.035;
      for(j=0;j<=segments;j++){var u=j/segments,x=lerp(from,to,u),z=ridgeZ(row,x),y=topY(x,z)-.007;pts.push([x,y,z]);}
      var start=body.count();body.tube(pts,function(u){return w*Math.pow(Math.max(0,Math.sin(PI*u)),.43)*(1+.07*Math.sin(u*PI*7+phase+row));},high?7:3,function(u){return lin(mixc(blue,pale,.08+.10*Math.sin(PI*u),[0,0,0]));});neutral(body,start);ridges.push({row:row,first:start,count:body.count()-start,from:from,to:to,width:w});
      var count=outer?7:8;for(j=0;j<count;j++){var u=(j+.25)/(count-.5),x=lerp(from+.025,to-.025,u)+.012*(rng()-.5),z=ridgeZ(row,x)+.004*(rng()-.5),variation=.80+.40*rng(),radius=(outer?.024:.033)*variation,height=(outer?.029:.038)*variation;tubercles.push({row:row,station:j,x:x,z:z,base:topY(x,z)+w*.25,radius:radius,height:height,yellow:outer?(j%3===1?.23:.04):.94});}
    }mark('five-longitudinal-ridges',first);
    // Small marginal nodules follow the rounded head and tail, rather than
    // adding a uniform yellow outer ring. Counts depict one animal only.
    for(j=0;j<16;j++){var a=j/16*TAU+.08,x=.46*Math.cos(a),z=.205*Math.sin(a);if(Math.abs(x)<.18)continue;tubercles.push({row:3,station:j,x:x,z:z,base:topY(x,z)-.001,radius:.018+.004*rng(),height:.021+.007*rng(),yellow:j%4===0?.40:.06});}
    first=body.count();tubercles.forEach(function(q){var sides=high?8:5,levels=high?[0,.40,.72,.93]:[0,.82],at=body.count();q.first=at;
      for(var r=0;r<levels.length;r++){var u=levels[r],rr=q.radius*Math.sqrt(Math.max(0,1-u*u));for(var k=0;k<sides;k++){var a=k/sides*TAU,x=q.x+Math.cos(a)*rr,z=q.z+Math.sin(a)*rr,base=topY(x,z)+.005,col=lin(mixc(mixc(blue,pale,.11,[0,0,0]),mixc(gold,yellow,u*.4,[0,0,0]),q.yellow*smooth(.45,.85,u),[0,0,0]));body.v(x,lerp(base,q.base+q.height,u),z,col,.5,.5);}}
      for(r=0;r<levels.length-1;r++)for(k=0;k<sides;k++){var a=at+r*sides+k,b=at+r*sides+(k+1)%sides;body.i.push(a,b,a+sides,b,b+sides,a+sides);}var tip=body.v(q.x,q.base+q.height,q.z,lin(mixc(pale,yellow,q.yellow,[0,0,0])),.5,.5),last=at+(levels.length-1)*sides;for(k=0;k<sides;k++)body.i.push(last+k,last+(k+1)%sides,tip);q.count=body.count()-at;
    });neutral(body,first);mark('yellow-capped-tubercles',first);
    // Short secondary gill leaflets sit in the groove between mantle and
    // foot on both sides. They do not form a crown on the back.
    first=body.count();[-1,1].forEach(function(side){var count=high?20:10;for(var q=0;q<count;q++){var station=high?q:q*2,u=(station+.5)/20,x=lerp(-.37,.36,u),z=side*(.158*Math.pow(1-Math.pow(x/.47,2),.55)),at=body.count(),w=(high?.009:.014)*(1+.12*Math.sin(station*2.3+phase)),rootY=.036+.0015*Math.sin(station*1.7+phase);
      body.v(x-w,rootY,z,lin(blue),.5,.5);body.v(x+w,rootY,z,lin(blue),.5,.5);body.v(x+w*.35,.021,z+side*.024,lin(mixc(blue,pale,.16,[0,0,0])),.5,.5);body.v(x-w*.45,.020,z+side*.025,lin(mixc(blue,pale,.16,[0,0,0])),.5,.5);body.v(x,.028,z+side*.028,lin(sole),.5,.5);body.i.push(at,at+1,at+4,at+1,at+2,at+4,at+2,at+3,at+4,at+3,at,at+4);gills.push({side:side,station:station,first:at,count:5,root:[x,rootY,z]});}});mark('lateral-secondary-gills',first);
    first=body.count();blob(T,body,.414,.027,0,.012,.007,.017,lin(blue),high?8:4,high?4:2);neutral(body,first);mark('ventral-oral-area',first);
    // Two yellow sensory clubs. The high tier models 28 lamellar collars;
    // the low tier samples alternate collars without changing the club form.
    [-1,1].forEach(function(side){var root=[.352,topY(.352,side*.085),side*.085],height=.145,at=sensory.count(),sides=high?7:3,n=high?6:3,pts=[];for(var k=0;k<=n;k++){var u=k/n;pts.push([root[0]+.016*u,root[1]+height*u,root[2]+side*.009*u]);}
      sensory.tube(pts,function(u){return .012+.009*Math.sin(PI*u);},sides,function(u){return lin(mixc(gold,yellow,.25+.50*u,[0,0,0]));});
      var collars=high?28:14;for(var q=0;q<collars;q++){var station=high?q:q*2,u=.20+.70*station/27,radius=.022*(.62+.38*Math.sin(PI*u)),y=root[1]+height*u,cx=root[0]+.016*u,cz=root[2]+side*.009*u,start=sensory.count();for(k=0;k<sides;k++){var a=k/sides*TAU,ca=Math.cos(a),sa=Math.sin(a);sensory.v(cx+ca*radius,y-.002*ca,cz+sa*radius,lin(mixc(gold,yellow,.55,[0,0,0])),.5,.5);sensory.v(cx+ca*radius*.70,y+.0015-.0014*ca,cz+sa*radius*.70,lin(gold),.5,.5);}for(k=0;k<sides;k++){var a=start+k*2,b=start+(k+1)%sides*2;sensory.i.push(a,b,a+1,b,b+1,a+1);}}
      neutral(sensory,at);rhinophores.push({side:side,first:at,count:sensory.count()-at,root:root,height:height,renderedLamellae:collars,sourceLamellaeRange:[27,30],rootVertices:sides});
    });
    var map=kit.baked(c.key('phyllidia-pigment'),high?256:128,high?256:128,function(u,v,out){setc(out,white);var left=u>=.02&&u<=.48,right=u>=.52&&u<=.98,inside=v>=.02&&v<=.48;if((!left&&!right)||!inside)return;var x=(u-(left?.02:.52))/.46,z=(v-.02)/.46;if(right){var stripe=(1-smooth(.018,.030,Math.abs(z-.5+.009*Math.sin(x*11+phase))))*smooth(.025,.10,x)*(1-smooth(.90,.98,x));mixc(sole,ink,stripe,out);return;}
      var px=x-.5,pz=(z-.5)*.45,edge=Math.sqrt(Math.pow(px/.5,2)+Math.pow(pz/.225,2)),near=9;for(var row=-2;row<=2;row++){var d=Math.abs(pz-ridgeZ(row,px));near=Math.min(near,d);}var ridge=1-smooth(.025,.042,near);mixc(ink,blue,ridge*.77,out);mixc(out,pale,(1-smooth(.10,.24,noise2(x*93+phase,z*71)))*.075,out);mixc(out,blue,smooth(.94,1.03,edge)*.6,out);
    },false,false);
    var bump=kit.baked(c.key('phyllidia-skin'),high?128:64,high?128:64,function(u,v,out){out[0]=out[1]=out[2]=.5+.055*(noise2(u*137+phase,v*127)-.5);},false,false,true);
    scaleGeo(body,L);scaleGeo(sensory,L);var bg=kit.geo(body,1),sg=kit.geo(sensory,1);bg.userData.varicosePhyllidia={ranges:ranges,nominalBodyLengthM:.06,scaleM:L,ridges:ridges,tubercles:tubercles,gills:gills,lateralGillBands:2,dorsalGillPlume:false,soleStripe:true,rhinotubercles:tubercles.filter(function(q){return Math.abs(q.row)===1&&q.station===7;}).map(function(q){return{x:q.x,z:q.z};}),appearance:'blue-grey-yellow-example'};sg.userData.varicosePhyllidia={rhinophores:rhinophores,maximumDisplacementM:.007*L};
    var mat=kit.std({vertexColors:true,map:map,bumpMap:bump,bumpScale:.0007*L,roughness:.54,side:T.DoubleSide});kit.mesh(bg,mat,'fixed-mantle-foot-gills',c.root);kit.mesh(sg,mat,'paired-lamellate-rhinophores',c.root);var rest=sg.attributes.position.array.slice();sg.boundingBox.expandByScalar(.007*L);sg.boundingSphere.radius+=.007*L;
    c.anim(function(t){var out=sg.attributes.position.array;rhinophores.forEach(function(r){var sway=.030*Math.sin(t*.62+phase+r.side*.65),ca=Math.cos(sway),sa=Math.sin(sway),x=r.root[0]*L,y=r.root[1]*L;for(var k=r.rootVertices;k<r.count;k++){var a=(r.first+k)*3,dx=rest[a]-x,dy=rest[a+1]-y;out[a]=x+dx*ca+dy*sa;out[a+1]=y+dy*ca-dx*sa;out[a+2]=rest[a+2];}});sg.computeVertexNormals();sg.attributes.position.needsUpdate=true;});
  }


  // Neopetrolisthes maculatus: an unsexed, finely red-spotted example.
  // This isolated study specimen omits its living anemone host. The .04 m
  // convention is posed leg/claw span, excluding the long slender antennae.
  function buildPorcelainAnemoneCrab(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(347),L=.04*(.98+.04*rng()),phase=rng()*TAU;
    var body=new Geo(),fans=new Geo(),ranges={},legs=[],fanParts=[],antennae=[],white=[1,1,1],cream=hex(0xe8dfca),shade=hex(0xbab49c),wine=hex(0x843b38),ink=linHex(0x252e2b);
    function mark(name,first){ranges[name]={first:first,count:body.count()-first};}
    function neutral(g,first){for(var i=first;i<g.count();i++){g.t[i*2]=.5;g.t[i*2+1]=.5;}}
    // A low convex shield, slightly longer than broad; the three shallow
    // frontal lobes are small shell contours, not a shrimp-like rostrum.
    var nr=high?6:3,ns=high?48:24,first=body.count();
    [-1,1].forEach(function(face){body.polar(nr,ns,function(r,a,out){var ca=Math.cos(a),sa=Math.sin(a),front=Math.max(0,ca),x=.15*ca*r,z=.13*sa*r;
      x+=.008*Math.cos(sa*PI*3)*Math.pow(front,8)*r;var y=.102+face*(face>0?.051:.033)*Math.pow(Math.max(0,1-r*r),.68);setc(out,face>0?white:lin(mixc(shade,cream,.65,[0,0,0])));return[x,y,z,face>0?.02+.46*(x+.17)/.34:.5,face>0?.02+.46*(z+.15)/.30:.5];},face<0);});
    var faceN=1+nr*ns;body.t[(first+faceN)*2]=.25;body.t[(first+faceN)*2+1]=.25;for(var j=0;j<ns;j++)body.seams.push([first+1+(nr-1)*ns+j,first+faceN+1+(nr-1)*ns+j]);mark('convex-carapace',first);
    // Segmented walking legs: three full pairs, with their tapered dactyls
    // resting on the same plane. The tiny fourth pair is folded beside the body.
    [-1,1].forEach(function(side){for(var leg=0;leg<3;leg++){var x=.045-leg*.075,z=side*.105,reach=.38-.018*leg,tipX=.02-leg*.165;
      var pts=[[x,.088,z],[x-.03,.105,side*.215],[tipX+.015,.064,side*(reach-.095)],[tipX+.035,.024,side*(reach-.035)],[tipX,0,side*reach]],start=body.count();
      body.tube(pts,function(u){return u===1?0:.026*Math.pow(1-u,.60)*(1-.12*Math.cos(u*PI*6));},high?7:4,function(u){return lin(mixc(cream,shade,.14*Math.sin(u*PI*4)*Math.sin(u*PI*4),[0,0,0]));});
      for(var k=start;k<body.count();k++){var sides=high?7:4,ring=Math.min(4,Math.floor((k-start)/sides));body.t[k*2]=.52+.46*ring/4;body.t[k*2+1]=.52+.46*((k-start)%sides)/sides;}
      legs.push({side:side,pair:leg,first:start,count:body.count()-start,root:pts[0],contact:pts[4]});
    }});mark('three-walking-leg-pairs',first+faceN*2);
    first=body.count();[-1,1].forEach(function(side){body.tube([[-.095,.078,side*.105],[-.14,.065,side*.145],[-.10,.055,side*.12]],function(u){return .008*(1-.55*u);},high?5:3,function(){return lin(cream);});});neutral(body,first);mark('reduced-folded-fourth-pair',first);
    // A closed, softly inflated paddle. The genuinely open cleft separates
    // fixed and movable fingers; cream fingertips stay free of painted spots.
    var outline=[[0,0],[.025,-.050],[.10,-.078],[.22,-.073],[.31,-.040],[.355,-.014],[.342,-.004],[.292,-.025],[.235,-.004],[.293,.012],[.342,.015],[.347,.035],[.29,.061],[.19,.075],[.09,.069],[.020,.034]];
    var clawStations=[];
    [-1,1].forEach(function(side){var start=body.count(),yaw=side*.42,cx=.065,cz=side*.31;
      body.tube([[.055,.090,side*.095],[.075,.108,side*.235],[.08,.095,side*.335]],function(u){return .036-.010*u;},high?8:4,function(){return lin(cream);});neutral(body,start);
      var at=body.count(),radial=high?4:2,around=high?48:24;
      function edge(a){var q=a/TAU*outline.length,k=Math.floor(q)%outline.length,t=q-Math.floor(q),A=outline[(k+outline.length-1)%outline.length],B=outline[k],C=outline[(k+1)%outline.length],D=outline[(k+2)%outline.length];return[catmull(A[0],B[0],C[0],D[0],t),catmull(A[1],B[1],C[1],D[1],t)];}
      [-1,1].forEach(function(face){body.polar(radial,around,function(r,a,out){var e=edge(a),x=lerp(.145,e[0],r),z=lerp(0,e[1],r),y=.095+.015*x+face*(.006+.026*Math.pow(Math.max(0,1-r*r),.62)),wx=cx+x*Math.cos(yaw)-z*Math.sin(yaw),wz=cz+x*Math.sin(yaw)+side*z*Math.cos(yaw);setc(out,face>0?white:lin(cream));return[wx,y,wz,face>0?.52+.46*x/.37:.5,face>0?.02+.46*(z+.09)/.18:.5];},face<0);});
      var fn=1+radial*around;body.t[(at+fn)*2]=.52+.46*.145/.37;body.t[(at+fn)*2+1]=.25;for(j=0;j<around;j++){var lo=at+1+(radial-1)*around+j,ln=at+1+(radial-1)*around+(j+1)%around,up=lo+fn,un=ln+fn;body.i.push(lo,ln,up,ln,un,up);}clawStations.push({side:side,first:start,count:body.count()-start,openCleft:true,cleftProbe:[cx+.31*Math.cos(yaw),.10,cz+.31*Math.sin(yaw)],palmProbe:[cx+.14*Math.cos(yaw),.10,cz+.14*Math.sin(yaw)]});
    });ranges['flattened-chelae']={first:clawStations[0].first,count:body.count()-clawStations[0].first};
    // Folded abdominal plates and a compact retained tail fan belong below
    // the shield. They are not an exposed swimming tail in this resting pose.
    first=body.count();for(j=0;j<3;j++)blob(T,body,-.07+j*.043,.065-j*.003,0,.036,.009,.071-j*.013,lin(mixc(cream,shade,j*.10,[0,0,0])),high?10:6,high?4:2);
    for(j=-1;j<=1;j++)blob(T,body,-.115,.062,j*.027,.026,.006,.021,lin(cream),high?8:4,high?4:2);neutral(body,first);mark('folded-abdomen-tail-fan',first);
    first=body.count();blob(T,body,.146,.091,0,.013,.010,.017,lin(shade),high?10:6,high?5:3);neutral(body,first);mark('oral-centre',first);
    first=body.count();[-1,1].forEach(function(side){body.tube([[.12,.117,side*.066],[.162,.135,side*.085]],function(u){return .012-.003*u;},high?7:4,function(){return lin(cream);});blob(T,body,.170,.137,side*.088,.018,.016,.016,ink,high?12:6,high?7:4);});neutral(body,first);mark('paired-stalked-eyes',first);
    // Two bristled third maxillipeds, distinct from the claws. Their sparse
    // setae are real geometry and leave open water between the feather combs.
    [-1,1].forEach(function(side){var root=[.153,.089,side*.027],at=fans.count(),stalk=[root.slice(),[.192,.135,side*.055],[.22,.205,side*.092],[.222,.239,side*.103]];
      fans.tube(stalk,function(u){return .007*(1-.65*u);},high?6:3,function(){return lin(cream);});
      var bristleCount=high?32:14;
      for(var b=0;b<bristleCount;b++){var u=(b+.5)/bristleCount,a=lerp(-1.18,1.28,u),length=.095+.044*Math.sin(PI*u),base=[.218,.208+u*.026,side*(.089+u*.015)],tip=[.222+Math.sin(a)*.025,.218+Math.cos(a)*length,side*(.100+Math.sin(a)*length)],mid=[lerp(base[0],tip[0],.55)+.008,lerp(base[1],tip[1],.55),lerp(base[2],tip[2],.55)],q=fans.count(),w=high?.0014:.0018,col=lin(mixc(shade,cream,.68,[0,0,0]));
        var wy=-Math.sin(a)*w,wz=side*Math.cos(a)*w;fans.v(base[0],base[1]-wy,base[2]-wz,col,.5,.5);fans.v(base[0],base[1]+wy,base[2]+wz,col,.5,.5);fans.v(mid[0],mid[1]-wy*.6,mid[2]-wz*.6,lin(cream),.5,.5);fans.v(mid[0],mid[1]+wy*.6,mid[2]+wz*.6,lin(cream),.5,.5);fans.v(tip[0],tip[1],tip[2],lin(cream),.5,.5);fans.i.push(q,q+1,q+2,q+1,q+3,q+2,q+2,q+3,q+4);
        // Fine side setules suggest the filtering mesh without an opaque fan.
        if(high&&b%2===0){var q=fans.count(),p=[lerp(mid[0],tip[0],.4),lerp(mid[1],tip[1],.4),lerp(mid[2],tip[2],.4)];fans.v(p[0],p[1],p[2],col,.5,.5);fans.v(p[0]+.0006,p[1]+.0007,p[2],col,.5,.5);fans.v(p[0]+.002,p[1]+.006,p[2]+side*.004,col,.5,.5);fans.i.push(q,q+1,q+2);}
      }
      neutral(fans,at);fanParts.push({side:side,first:at,count:fans.count()-at,root:root,bristles:bristleCount});
    });
    // Long fine antennae are separate from the filtering mouthparts. Only
    // their distal ends flex; the seated bases and all walking contacts stay put.
    [-1,1].forEach(function(side){var at=fans.count(),pts=[],n=high?12:5;for(var q=0;q<=n;q++){var u=q/n;pts.push([.12+.51*u,.116+.040*Math.sin(PI*u)-.035*u,side*(.09+.40*u+.025*Math.sin(PI*u))]);}fans.tube(pts,function(u){return .0032*Math.pow(1-u,.8)+.00025;},3,function(u){return lin(mixc(cream,wine,.25+.12*u,[0,0,0]));});neutral(fans,at);antennae.push({side:side,first:at,count:fans.count()-at,root:pts[0],segments:n});});
    function dots(u,v,out,kind){var cells=kind==='carapace'?13:kind==='claw'?12:10,x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y),d=9,radius=.2;
      for(var i=-1;i<=1;i++)for(var j=-1;j<=1;j++){var xx=ix+i,yy=iy+j,r=noise2(xx*3.17+phase,yy*5.63),dx=x-xx-(.18+.64*noise2(xx*7.2+phase,yy*3.9)),dy=y-yy-(.18+.64*noise2(xx*4.3,yy*8.1+phase)),dd=Math.hypot(dx,dy)/(.13+.15*r);if(dd<d){d=dd;radius=r;}}
      var coverage=kind==='carapace'?1-smooth(.71,1,Math.hypot((u-.5)/.45,(v-.5)/.45)):kind==='claw'?(1-smooth(.65,.83,u))*smooth(.02,.16,v)*(1-smooth(.86,.98,v)):(1-smooth(.28,.60,u))*smooth(.02,.15,u);
      mixc(cream,hex(0xc6ac89),coverage*(1-smooth(1.1,2.5,d))*.24,out);mixc(out,wine,coverage*(1-smooth(.85,1.05,d))*.96,out);mixc(out,hex(0x5b2930),coverage*(1-smooth(.25,.68,d))*(.40+.15*radius),out);
    }
    var map=kit.baked(c.key('porcelain-crab-spots'),high?512:256,high?512:256,function(u,v,out){setc(out,white);var left=u>=.02&&u<=.48,right=u>=.52&&u<=.98,bottom=v>=.02&&v<=.48,top=v>=.52&&v<=.98;if((!left&&!right)||(!bottom&&!top))return;if(left&&top)return;dots((u-(left?.02:.52))/.46,(v-(bottom?.02:.52))/.46,out,left?'carapace':bottom?'claw':'leg');},false,false);
    var bump=kit.baked(c.key('porcelain-crab-shell'),high?128:64,high?128:64,function(u,v,out){out[0]=out[1]=out[2]=.5+.035*(noise2(u*111+phase,v*109)-.5);},false,false,true);
    scaleGeo(body,L);scaleGeo(fans,L);var bg=kit.geo(body,1),fg=kit.geo(fans,1);
    bg.userData.porcelainCrab={ranges:ranges,nominalLegClawSpanM:.04,nominalCarapaceLengthM:.012,antennaeExcludedFromSpan:true,scaleM:L,appearance:'finely-red-spotted-unsexed',walkingPairs:3,reducedPair:1,legs:legs,claws:clawStations,hostOmitted:true};
    fg.userData.porcelainCrab={fans:fanParts,antennae:antennae,maximumDisplacementM:.050*L};
    var material=kit.std({vertexColors:true,map:map,bumpMap:bump,bumpScale:.00045*L,roughness:.46,side:T.DoubleSide});
    kit.mesh(bg,material,'fixed-shell-chelae-legs',c.root);kit.mesh(fg,material,'feeding-fans-antennae',c.root);
    var rest=fg.attributes.position.array.slice();fg.boundingBox.expandByScalar(.050*L);fg.boundingSphere.radius+=.050*L;
    c.anim(function(t){var out=fg.attributes.position.array;fanParts.forEach(function(f){var angle=.16*Math.sin(t*.73+phase+f.side*.8),ca=Math.cos(angle),sa=Math.sin(angle),rx=f.root[0]*L,ry=f.root[1]*L,rz=f.root[2]*L;for(var j=high?6:3;j<f.count;j++){var k=(f.first+j)*3,x=rest[k]-rx,y=rest[k+1]-ry,z=rest[k+2]-rz;out[k]=rx+x*ca+y*sa;out[k+1]=ry+y*ca-x*sa;out[k+2]=rz+z;}});antennae.forEach(function(a){for(var j=3;j<a.count;j++){var k=(a.first+j)*3,weight=Math.pow(clamp((rest[k]/L-a.root[0])/.51,0,1),2);out[k]=rest[k];out[k+1]=rest[k+1]+.008*L*weight*Math.sin(t*.55+phase+a.side);out[k+2]=rest[k+2]+a.side*.007*L*weight*Math.sin(t*.43+phase);}});fg.computeVertexNormals();fg.attributes.position.needsUpdate=true;});
  }


  // Protoreaster nodosus: illustrative cream/ochre Western Pacific example.
  // Five heavy arms join a single inflated body. Variable dark conical knobs
  // are distinct from the fine granules and the underside's ambulacral grooves.
  function buildChocolateChipSeaStar(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(331),L=.28*(.97+.06*rng()),phase=rng()*TAU,angle=.30;
    var body=new Geo(),feet=new Geo(),ranges={},cream=hex(0xc8ae7d),ochre=hex(0xa17945),pale=hex(0xe8d8b9),brown=hex(0x4c3026),tip=hex(0x241e1a),groove=hex(0x92745f),lilac=hex(0xb394a5),white=[1,1,1];
    var radius=.5/Math.sin(PI*.4),knobs=[],footStations=[];
    function outline(a){return .22+(radius-.22)*Math.pow(.5+.5*Math.cos((a-angle)*5),1.45);}
    function topY(r,a){var u=clamp(r/outline(a),0,1);return .026+.115*Math.pow(Math.max(0,1-u*u),.85);}
    function channel(r,a){var delta=Math.atan2(Math.sin((a-angle)*5),Math.cos((a-angle)*5))/5,side=Math.abs(Math.sin(delta)*r);return (1-smooth(.012,.028,side))*smooth(.025,.07,r)*(1-smooth(.46,.515,r));}
    function bottomY(r,a){var u=clamp(r/outline(a),0,1);return .026+.008*(1-u)+.012*channel(r,a)*(1-smooth(.90,1,u));}
    function mark(name,start){ranges[name]={first:start,count:body.count()-start};}
    var nr=high?6:4,ns=high?100:50,first=body.count();
    body.polar(nr,ns,function(u,a,out){var r=outline(a)*u,x=Math.cos(a)*r,z=Math.sin(a)*r;mixc(cream,ochre,.16+.24*noise2(x*15+phase,z*17),out);mixc(out,pale,.13*(1-u),out);setc(out,lin(out));return[x,topY(r,a),z,.02+.46*(x+radius)/(2*radius),.02+.46*(z+radius)/(2*radius)];});mark('aboral-body',first);
    first=body.count();body.polar(nr,ns,function(u,a,out){var r=outline(a)*u,x=Math.cos(a)*r,z=Math.sin(a)*r;mixc(pale,groove,.70*channel(r,a),out);setc(out,lin(out));return[x,bottomY(r,a),z,.5,.5];},true);mark('oral-body-five-grooves',first);
    // Matching outer rings close the seamless body without open arm ends.
    var outerA=1+(nr-1)*ns,outerB=first+1+(nr-1)*ns;for(var i=0;i<ns;i++)body.seams.push([outerA+i,outerB+i]);
    // Single radial rows of knobs plus five on the central disc. Their count
    // and colour are an example, not a universal diagnostic for every animal.
    for(i=0;i<5;i++){var a=angle+i*TAU/5;knobs.push({r:.085,a:a+.18,height:.046,width:.030});for(var j=0;j<4;j++){var r=.19+j*.078;knobs.push({r:r,a:a,height:.045-.007*j,width:.029-.0035*j});}}
    first=body.count();knobs.forEach(function(k,index){var x=Math.cos(k.a)*k.r,z=Math.sin(k.a)*k.r,base=topY(k.r,k.a)-.003,h=k.height*(.94+.12*rng()),sides=high?8:7,levels=high?[0,.36,.73]:[0],at=body.count();k.position=[x,base,z];k.actualHeight=h;
      for(var row=0;row<levels.length;row++)for(var q=0;q<sides;q++){var u=levels[row],b=q/sides*TAU,w=k.width*Math.pow(1-u,.80),xp=x+Math.cos(b)*w,zp=z+Math.sin(b)*w,seat=topY(Math.hypot(xp,zp),Math.atan2(zp,xp))-.001,col=lin(mixc(mixc(ochre,brown,.76,[0,0,0]),tip,smooth(.02,.90,u),[0,0,0]));body.v(xp,lerp(seat,base+h,u),zp,col,.5,.5);}for(row=0;row<levels.length-1;row++)for(q=0;q<sides;q++){var v=at+row*sides+q,n=at+row*sides+(q+1)%sides;body.i.push(v,n,v+sides,n,n+sides,v+sides);}var apex=body.v(x,base+h,z,lin(tip),.5,.5),last=at+(levels.length-1)*sides;for(q=0;q<sides;q++)body.i.push(last+q,last+(q+1)%sides,apex);
    });mark('dark-conical-knobs',first);
    // One small off-centre madreporite, plus an inconspicuous central mouth
    // on the oral surface. Neither is an eye or a second upper mouth.
    first=body.count();var ma=angle+PI/5,mr=.105,mx=Math.cos(ma)*mr,mz=Math.sin(ma)*mr;blob(T,body,mx,topY(mr,ma)+.001,mz,.013,.0025,.010,lin(pale),high?10:5,high?4:2);mark('madreporite',first);
    first=body.count();body.polar(high?2:1,high?20:10,function(u,a,out){var r=.015*u*(1+.10*Math.cos(a*5));setc(out,lin(mixc(hex(0x58413b),groove,smooth(.40,1,u),[0,0,0])));return[Math.cos(a)*r,.035-.001*u,Math.sin(a)*r,.5,.5];},true);mark('central-oral-mouth',first);
    // Paired tube feet in all five real, recessed oral grooves. The sparse
    // low tier samples the same stations; count is a rendering simplification.
    var pairs=high?12:6,sides=high?4:3;
    for(i=0;i<5;i++){var a=angle+i*TAU/5,ca=Math.cos(a),sa=Math.sin(a);for(j=0;j<pairs;j++){var station=high?j:j*2,r=.065+.375*station/11;[-1,1].forEach(function(side){var across=.0095*(1-.3*station/11),x=ca*r-sa*across*side,z=sa*r+ca*across*side,ry=bottomY(Math.hypot(x,z),Math.atan2(z,x))+.001,start=feet.count(),levels=high?[[ry,.0020],[.004,.0018],[.001,.0038]]:[[ry,.0020],[.001,.0038]];
        for(var row=0;row<levels.length;row++)for(var q=0;q<sides;q++){var aa=q/sides*TAU,col=lin(mixc(lilac,pale,row/(levels.length-1)*.45,[0,0,0]));feet.v(x+Math.cos(aa)*levels[row][1],levels[row][0],z+Math.sin(aa)*levels[row][1],col,.5,.5);}for(row=0;row<levels.length-1;row++)for(q=0;q<sides;q++){var v=start+row*sides+q,n=start+row*sides+(q+1)%sides;feet.i.push(v,n,v+sides,n,n+sides,v+sides);}var sole=feet.v(x,0,z,lin(lilac),.5,.5),last=start+(levels.length-1)*sides;for(q=0;q<sides;q++)feet.i.push(last+q,sole,last+(q+1)%sides);footStations.push({arm:i,station:station,side:side,first:start,count:feet.count()-start,root:[x,ry,z],contact:[x,0,z],probing:station%3===1});
      });}}
    var map=kit.baked(c.key('chip-granules'),high?256:128,high?256:128,function(u,v,out){setc(out,white);if(u<.02||u>.48||v<.02||v>.48)return;var n=noise2(u*370+phase,v*390),grit=smooth(.54,.80,n);mulc(out,.93+.10*noise2(u*80,v*86)-.09*grit);},false,false);
    var bump=kit.baked(c.key('chip-relief'),high?256:128,high?256:128,function(u,v,out){out[0]=out[1]=out[2]=u>=.02&&u<=.48&&v>=.02&&v<=.48?.5+.22*(noise2(u*370+phase,v*390)-.5):.5;},false,false,true);
    scaleGeo(body,L);scaleGeo(feet,L);var bg=kit.geo(body,1),fg=kit.geo(feet,1);bg.userData.chocolateChipStar={ranges:ranges,arms:5,knobs:knobs,nominalTipSpanM:.28,scaleM:L,appearance:'cream-ochre-unsexed',oralGrooves:5,armAngle:angle,armRadiusUnit:radius};fg.userData.chocolateChipStar={feet:footStations,pairsPerArm:pairs,renderedTubeFeet:footStations.length,maximumProbeDisplacementM:.0033*L};
    kit.mesh(bg,kit.std({vertexColors:true,map:map,bumpMap:bump,bumpScale:.0011*L,roughness:.81,side:T.DoubleSide}),'fixed-body-knobs',c.root);
    kit.mesh(fg,kit.std({vertexColors:true,map:map,bumpMap:bump,bumpScale:.0001*L,roughness:.56,side:T.DoubleSide}),'paired-tube-feet',c.root);
    var rest=fg.attributes.position.array.slice();fg.boundingBox.expandByScalar(.0033*L);fg.boundingSphere.radius+=.0033*L;
    // Quiet local probing, not locomotion: two thirds remain attached. Foot
    // roots stay seated in the grooves; body and placement root never sway.
    c.anim(function(t){var out=fg.attributes.position.array;footStations.forEach(function(f){if(!f.probing)return;var ph=phase+f.arm*1.3+f.station*.9+f.side*.6,wave=Math.sin(t*.8+ph),lift=.0015*(1+Math.sin(t*.62+ph));for(var j=0;j<f.count;j++){var at=(f.first+j)*3,weight=Math.pow(clamp(1-rest[at+1]/(f.root[1]*L),0,1),2);out[at]=rest[at]+Math.cos(angle+f.arm*TAU/5)*.0012*L*wave*weight;out[at+1]=rest[at+1]+lift*L*weight;out[at+2]=rest[at+2]+Math.sin(angle+f.arm*TAU/5)*.0012*L*wave*weight;}});fg.computeVertexNormals();fg.attributes.position.needsUpdate=true;});
  }


  // Oxycirrhites typus: an unsexed red/white example on a small illustrative
  // branch perch. Anatomy follows Australian Museum and Smithsonian STRI:
  // long pointed snout, dorsal cirri, stout lower pectoral rays, truncate tail.
  function buildLongnoseHawkfish(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(317),L=.12*(.97+.06*rng()),phase=rng()*TAU;
    var g=new Geo(),ranges={},white=[1,1,1],ivory=hex(0xf1e6da),red=hex(0xbc3e3a),dark=hex(0x692e2d),pink=hex(0xd77a66),perch=hex(0x70685a);
    var rows=[[.50,.337,.321,.006],[.43,.343,.318,.010],[.33,.358,.312,.017],[.24,.386,.292,.030],[.17,.403,.236,.055],[.065,.393,.210,.063],[-.065,.362,.212,.054],[-.21,.325,.236,.029],[-.34,.297,.268,.010]],prof=profile(rows);
    function mark(name,f){ranges[name]={first:f,count:g.count()-f};}
    function guard(f){for(var k=f;k<g.count();k++){g.t[k*2]=.5;g.t[k*2+1]=.5;}}
    g.loft(rows,high?46:17,high?22:8,function(u,a,x,y,z,out){setc(out,white);});
    for(var i=0;i<g.count();i++){g.t[i*2]=.02+.46*clamp((.5-g.p[i*3])/.84,0,1);g.t[i*2+1]=.02+.46*clamp((g.p[i*3+1]-.20)/.21,0,1);}mark('long-snouted-body',0);
    // Pale fin webs with crimson rays, retaining a fine irregular net pattern.
    function finColor(u,v,out){mixc(ivory,pink,.08+.13*v,out);var stripe=1-smooth(.05,.12,Math.abs(Math.sin((u*9+.035*Math.sin(v*8))*PI)));mixc(out,red,stripe*(.25+.35*v),out);}
    var dorsal=[],roots=[],edges=[],first=g.count();
    for(i=0;i<23;i++){var u=i/22,x=.12-.46*u,y=prof(x)[0]-.004,h=i<10?.080+.033*Math.sin(i/9*PI):.074+.025*Math.sin((i-10)/12*PI);dorsal.push({root:[x,y,0],tip:[x-.015,y+h,0],spine:i<10});}
    var sub=high?2:1;for(i=0;i<=22*sub;i++){var q=i/sub,j=Math.min(21,Math.floor(q)),u=q-j,a=dorsal[j],b=dorsal[j+1];roots.push([lerp(a.root[0],b.root[0],u),lerp(a.root[1],b.root[1],u),0]);edges.push([lerp(a.tip[0],b.tip[0],u),lerp(a.tip[1],b.tip[1],u)-.013*Math.sin(u*PI),0]);}
    g.membrane(roots,edges,high?4:2,finColor);guard(first);mark('continuous-dorsal',first);
    first=g.count();for(i=0;i<dorsal.length;i++){var ray=dorsal[i];if(high)g.tube([ray.root,ray.tip],function(u){return .0023*(1-.65*u);},4,function(u){return lin(mixc(red,ivory,.2+.2*u,[0,0,0]));});else{var at=g.count(),col=lin(pink);g.v(ray.root[0]-.002,ray.root[1],.0005,col);g.v(ray.root[0]+.002,ray.root[1],.0005,col);g.v(ray.tip[0],ray.tip[1],.0005,col);g.i.push(at,at+1,at+2);}}guard(first);mark('dorsal-rays',first);
    // Three small tapered cirri at each of the ten hard dorsal spine tips.
    first=g.count();var tufts=[];for(i=0;i<10;i++){var tip=dorsal[i].tip,pts=[];for(var j=-1;j<=1;j++){var p=[[tip[0],tip[1]-.002,0],[tip[0]+j*.006,tip[1]+.010-Math.abs(j)*.002,j*.002],[tip[0]+j*.011,tip[1]+.020-Math.abs(j)*.005,j*.004]];g.tube(high?p:[p[0],p[2]],function(u){return .0015*(1-.9*u);},3,function(u){return lin(mixc(red,ivory,.2+.65*u,[0,0,0]));});pts.push(p[2]);}tufts.push(pts);}guard(first);mark('ten-cirrus-tufts',first);
    // The tail has a blunt trailing edge, with only its outer corners rounded.
    roots=[];edges=[];first=g.count();var n=high?20:10;
    for(i=0;i<=n;i++){var u=i/n,v=2*u-1;roots.push([-.332,.282+.012*v,0]);edges.push([-.50+.018*Math.pow(Math.abs(v),5),.282+.095*v,0]);}
    g.membrane(roots,edges,high?5:2,finColor);guard(first);mark('truncate-caudal',first);
    first=g.count();for(i=0;i<11;i++){var v=-1+2*i/10;g.tube([[-.332,.282+.012*v,0],[-.50+.018*Math.pow(Math.abs(v),5),.282+.095*v,0]],function(u){return .0019*(1-.6*u);},high?4:3,function(){return lin(pink);});}guard(first);mark('caudal-rays',first);
    roots=[];edges=[];first=g.count();n=high?16:8;for(i=0;i<=n;i++){var u=i/n,x=-.02-.29*u;roots.push([x,prof(x)[1]+.004,0]);edges.push([x-.016,prof(x)[1]-.053*Math.sin(u*PI),0]);}g.membrane(roots,edges,high?3:2,finColor);guard(first);mark('anal-fin',first);
    // Upper pectoral webs remain above six thick lower, unbranched rays.
    // The supporting ray ends are planted on the integral transverse branch.
    var supports=[],pectorals=[];function branchPoint(u,side){return [.062+.068*Math.sin(u*PI)-.075*u,.123+.006*Math.sin(u*PI*.5),side*.17*u];}
    [-1,1].forEach(function(side){var start=g.count(),rs=[],es=[],n=high?14:7;for(var j=0;j<=n;j++){var u=j/n;rs.push([.08,.292-.04*u,side*.052]);es.push([.02-.13*u,.290-.040*u,side*(.07+.10*Math.sin(.3+u*PI*.65))]);}g.membrane(rs,es,high?4:2,finColor);guard(start);pectorals.push({side:side,first:start,count:g.count()-start});var f=g.count();for(j=0;j<6;j++){var u=j/5,end=branchPoint(.44+.50*u,side);end[1]+=.012*(1-.22*(.44+.50*u));var attached=end.slice();end[1]+=.055;var start=[.08,.264-.020*u,side*.049],mid=[.060-.025*u,.244-.012*u,side*(.065+.038*u)],ps=[start,mid,[lerp(mid[0],end[0],.6),lerp(mid[1],end[1],.65)+.004*Math.sin(u*PI),lerp(mid[2],end[2],.6)],end];g.tube(high?ps:[start,mid,end],function(v){return .0063*(1-.58*v);},high?5:3,function(v){return lin(mixc(red,ivory,.24+.48*v,[0,0,0]));});if(j>0){var prev=1/5,oldU=u-prev;g.membrane([[.08,.264-.020*oldU,side*.049],start],[[.060-.025*oldU,.244-.012*oldU,side*(.065+.038*oldU)],mid],1,function(a,v,out){mixc(pink,ivory,.28+.2*v,out);});}supports.push({side:side,end:attached});}guard(f);});
    first=g.count();[-1,1].forEach(function(side){g.membrane([[.075,.223,side*.018],[.02,.218,side*.018]],[[.08,.195,side*.04],[-.04,.205,side*.057]],high?3:2,finColor);});guard(first);mark('pelvic-supports',first);
    // Terminal mouth seam follows both narrow jaws; small opercular folds
    // and nostrils sit on the head instead of adding a blunt separate snout.
    first=g.count();[-1,1].forEach(function(side){var ps=[];for(var j=0;j<=7;j++){var u=j/7,x=.499-.21*u,y=.327-.009*u;ps.push([x,y,side*(surfZ(prof,2,x,y)+.0005)]);}g.tube(ps,.00085,3,function(){return lin(dark);});var ps=[];for(j=0;j<=5;j++){var u=j/5,x=.070-.028*Math.sin(u*PI),y=.35-.10*u;ps.push([x,y,side*(surfZ(prof,2,x,y)+.0007)]);}g.tube(ps,.0011,3,function(){return lin(pink);});blob(T,g,.252,.367,side*surfZ(prof,2,.252,.367),.003,.0017,.0017,lin(dark),high?7:4,3);});guard(first);mark('mouth-gills-nostrils',first);
    first=g.count();[-1,1].forEach(function(side){addEye(T,g,prof,2,[.190,.365,.024],side,hex(0xc98065),high,.13,!high);});mark('eyes',first);
    // Lower the whole fish toward its support without changing its anatomy.
    for(i=1;i<g.p.length;i+=3)g.p[i]-=.055;
    // A compact neutral branch is a placement support, not another identified
    // coral species. All its vertices lie below the animation envelope.
    first=g.count();var branchPaths=[[[.05,.014,0],[.058,.040,.005],[.073,.071,.010],[.070,.098,.006],[.062,.123,0]]];[-1,1].forEach(function(side){var ps=[];for(var j=0;j<=6;j++)ps.push(branchPoint(j/6,side));branchPaths.push(ps);});
    branchPaths.forEach(function(ps,b){g.tube(high?ps:ps.filter(function(p,i){return i===0||i===ps.length-1||i%2===0;}),function(u){return (b?.012:.014)*(1-.22*u)*(1+.10*Math.sin(u*13+b));},high?7:4,function(u,s){return lin(mixc(hex(0x514f40),hex(0x9c9077),.16+.40*noise2(u*14+b,s*7+phase),[0,0,0]));});});
    blob(T,g,.072,.086,.010,.016,.017,.014,lin(perch),high?8:5,high?4:3);blob(T,g,.062,.121,0,.019,.014,.016,lin(perch),high?8:5,high?4:3);blob(T,g,.05,.007,0,.032,.007,.025,lin(perch),high?12:6,high?5:3);guard(first);mark('illustrative-perch',first);
    var map=kit.baked(c.key('hawk-crosshatch'),high?256:128,high?256:128,function(u,v,out){setc(out,white);if(u<.02||u>.48||v<.02||v>.48)return;var x=.5-.84*(u-.02)/.46,y=.20+.21*(v-.02)/.46,wx=x+.004*Math.sin(y*55+phase)+.0015*Math.sin(y*120+x*47),wy=y+.003*Math.sin(x*42+phase),vertical=1-smooth(.13,.24,Math.abs(Math.sin((wx+.04)*PI/ .055))),horizontal=1-smooth(.10,.19,Math.abs(Math.sin((wy-.20)*PI/.045))),net=Math.max(vertical*.88,horizontal*.94);mixc(ivory,red,net,out);mulc(out,.96+.04*noise2(x*160+phase,y*170));},false,false);
    var bump=kit.baked(c.key('hawk-skin'),high?128:64,high?128:64,function(u,v,out){out[0]=out[1]=out[2]=u>=.02&&u<=.48&&v>=.02&&v<=.48?.5+.045*(noise2(u*350,v*370)-.5):.5;},false,false,true);
    g.map(0,function(p){var x=p[0],y=p[1];p[0]=-y*L;p[1]=x*L;p[2]*=L;});var geo=kit.geo(g,1),frame=kit.node('perched-frame',c.root);frame.rotation.z=-PI/2;
    var swim={value:new T.Vector4(phase,0,14/L,0)},shape={value:new T.Vector4(-.16*L,-.51*L,1,0)};
    geo.userData.longnoseHawkfish={ranges:ranges,nominalTotalLengthM:.12,scaleM:L,appearance:'red-white-unsexed',bodyPoseOffsetUnit:-.055,bodyRows:rows,dorsalRays:dorsal,spines:10,softRays:13,cirrusTufts:tufts,supportRays:supports,pectorals:pectorals,branchPaths:branchPaths,staticEnvelopeHeightM:.16*L};
    kit.mesh(geo,kit.std({vertexColors:true,map:map,bumpMap:bump,bumpScale:.00007*L,roughness:.48,side:T.DoubleSide},{swim:swim,swimShape:shape,eye:true,iris:hex(0xc98065)}),'fish-and-perch',frame);geo.boundingBox.expandByScalar(.009*L);geo.boundingSphere.radius+=.009*L;
    var flow={x:0,z:0,pulse:0};c.anim(function(t,dt,motion){currentAt(c.root,motion,t,phase,flow);swim.value.set(phase+t*.62,L*(.002+.004*Math.min(1,Math.hypot(flow.x,flow.z)))*flow.pulse,14/L,t);});
  }


  // Taenianotus triacanthus: a cream/pink, unsexed example following the
  // Australian Museum and Museums Victoria photographs. Its papillae, high
  // sail and low supporting fins are distinct from a scaled schooling fish.
  function buildLeafScorpionfish(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(307), L = .10 * (.97 + .06 * rng()), phase = rng() * TAU;
    var g = new Geo(), ranges = {}, cream = hex(0xe6d9be), rose = hex(0xb36d79), pale = hex(0xf0e4cf), ink = hex(0x67504b), white = [1,1,1];
    var rows = [[.50,.315,.286,.008],[.43,.352,.220,.035],[.32,.415,.145,.057],[.16,.400,.080,.060],[-.02,.340,.080,.044],[-.19,.252,.118,.024],[-.33,.205,.155,.010]], prof = profile(rows);
    function mark(name, first) { ranges[name] = {first:first,count:g.count()-first}; }
    function skinUV(first) { for(var i=first;i<g.count();i++){g.t[i*2]=.02+.46*clamp((.50-g.p[i*3])/.84,0,1);g.t[i*2+1]=.02+.46*clamp(g.p[i*3+1]/.43,0,1);} }
    function guard(first) { for(var i=first;i<g.count();i++){g.t[i*2]=.5;g.t[i*2+1]=.5;} }
    g.loft(rows,high?42:13,high?22:8,function(u,a,x,y,z,out){setc(out,white);});skinUV(0);mark('compressed-body',0);
    // A continuous scalloped sail: the third/fourth spines are the tallest.
    // Twelve anterior spines transition to nine soft rays, adjoining the tail.
    var tips=[.52,.66,.78,.80,.76,.71,.65,.60,.55,.50,.46,.43,.41,.40,.39,.38,.36,.34,.31,.28,.245], dorsal=[], roots=[], edges=[], first=g.count(), subdivisions=high?2:1;
    for(var i=0;i<tips.length;i++){var x=.31-.68*i/20, p=prof(Math.max(-.33,x));dorsal.push({root:[x,p[0]-.008,0],tip:[x-.018,tips[i],0],spine:i<12});}
    for(i=0;i<20*subdivisions+1;i++){var f=i/subdivisions,j=Math.min(19,Math.floor(f)),u=f-j,a=dorsal[j],b=dorsal[j+1],y=lerp(a.tip[1],b.tip[1],u)-.020*Math.sin(u*PI);roots.push([lerp(a.root[0],b.root[0],u),lerp(a.root[1],b.root[1],u),0]);edges.push([lerp(a.tip[0],b.tip[0],u),y,.004*Math.sin(i*.7)*Math.sin(u*PI)]);}
    function finColor(u,v,out){var mottling=smooth(.42,.76,noise2(u*13+phase,v*11)),rib=.5+.5*Math.cos(u*TAU*20);mixc(cream,rose,.12+.42*mottling+.13*smooth(.85,1,v),out);mulc(out,.95+.05*rib);}
    g.membrane(roots,edges,high?5:2,finColor);guard(first);mark('dorsal-sail',first);
    first=g.count();for(i=0;i<dorsal.length;i++){var q=dorsal[i];g.tube(high?[q.root,[lerp(q.root[0],q.tip[0],.58),lerp(q.root[1],q.tip[1],.58),.001],q.tip]:[q.root,q.tip],function(u){return .003*(1-.80*u);},high?4:3,function(u){return lin(mixc(rose,pale,.3+.5*u,[0,0,0]));});}guard(first);mark('dorsal-rays',first);
    // Rounded caudal joins the soft dorsal margin rather than a forked tail.
    var tailR=[],tailE=[],n=high?22:10;first=g.count();
    for(i=0;i<=n;i++){var u=i/n,angle=(u-.5)*PI*.95;tailR.push([-.305,.184,0]);tailE.push([-.31-.19*Math.cos(angle),.184+.16*Math.sin(angle),.003*Math.sin(u*PI)]);}
    g.membrane(tailR,tailE,high?5:2,finColor);guard(first);mark('rounded-caudal',first);
    first=g.count();for(i=0;i<=8;i++){var u=i/8,a=(u-.5)*PI*.95;g.tube([[-.305,.184,0],[-.31-.19*Math.cos(a),.184+.16*Math.sin(a),.003*Math.sin(u*PI)]],function(t){return .0025*(1-.65*t);},high?4:3,function(){return lin(cream);});}guard(first);mark('caudal-rays',first);
    // A shallow anal web remains anatomically separate from the pectoral pair.
    roots=[];edges=[];first=g.count();n=high?16:8;
    for(i=0;i<=n;i++){var u=i/n,x=.01-.35*u;roots.push([x,prof(Math.max(-.33,x))[1]+.004,0]);edges.push([x-.016,.025+.11*u-.035*Math.sin(u*PI),0]);}
    g.membrane(roots,edges,high?3:2,finColor);guard(first);mark('anal-fin',first);
    var pectorals=[],contacts=[];
    [-1,1].forEach(function(side){var rs=[],es=[],n=high?20:10,start=g.count();for(var j=0;j<=n;j++){var u=j/n,angle=-.85+1.9*u,reach=.17+.05*Math.sin(u*PI),x=.16-Math.sin(angle)*reach,y=.014+.065*Math.pow(Math.abs(u-.60)*1.8,2),z=side*(.053+Math.cos(angle)*reach);if(j===Math.round(n*.6))y=0;rs.push([.14,.19-.08*u,side*.040]);es.push([x,y,z]);if(y===0)contacts.push([x,y,z]);}g.membrane(rs,es,high?5:2,function(u,v,out){finColor(u,v,out);mixc(out,pale,v*.18,out);});guard(start);pectorals.push({side:side,first:start,count:g.count()-start,root:rs,edge:es});
      var f=g.count();for(var j=0;j<=8;j++){var u=j/8,a=-.85+1.9*u,r=.17+.05*Math.sin(u*PI),tip=[.16-Math.sin(a)*r,.014+.065*Math.pow(Math.abs(u-.60)*1.8,2),side*(.053+Math.cos(a)*r)];g.tube([[.14,.19-.08*u,side*.040],tip],function(v){return .0033*(1-.7*v);},high?4:3,function(v){return lin(mixc(rose,pale,.3+.6*v,[0,0,0]));});}guard(f);
    });
    // Low paired pelvic supports finish at the same substrate plane.
    first=g.count();[-1,1].forEach(function(side){g.membrane([[.18,.11,side*.025],[.11,.09,side*.025]],[[.24,0,side*.08],[.065,.012,side*.105]],high?3:2,finColor);});mark('pelvic-supports',first);
    // Oblique mouth seam and seated opercular folds, never a painted smile.
    first=g.count();[-1,1].forEach(function(side){var path=[];for(var j=0;j<=5;j++){var u=j/5,x=.494-.16*u,y=.302-.103*u;path.push([x,y,side*(surfZ(prof,2,x,y)+.001)]);}g.tube(path,function(u){return .0008+.0006*Math.sin(u*PI);},high?4:3,function(){return lin(ink);});var pts=[];for(j=0;j<=5;j++){var u=j/5,x=.205-.035*Math.sin(u*PI),y=.30-.15*u;pts.push([x,y,side*(surfZ(prof,2,x,y)+.001)]);}g.tube(pts,.0012,3,function(){return lin(rose);});});guard(first);mark('mouth-gill-folds',first);
    first=g.count();[-1,1].forEach(function(side){addEye(T,g,prof,2,[.337,.352,.026],side,hex(0x9f8a6d),high,.18,!high);});mark('eyes',first);
    // Flat leafy brow cirri plus a fine, irregular beard around the lower jaw.
    first=g.count();var cirri=[];
    [-1,1].forEach(function(side){for(var j=0;j<7;j++){var u=j/6,x=.45-.19*u,y=.242-.065*u,z=side*(surfZ(prof,2,x,y)+.002),len=.022+.018*(.5+.5*Math.sin(j*2.7+phase)),pts=[[x,y,z],[x+.006,y-len*.55,z+side*.004],[x+.014,y-len,z+side*.006]];g.tube(pts,function(v){return .0023*(1-.85*v);},high?4:3,function(v){return lin(mixc(rose,pale,.45+.4*v,[0,0,0]));});cirri.push(pts);}
      var z=side*surfZ(prof,2,.335,.38);g.membrane([[.319,.379,z],[.331,.389,z],[.348,.386,z]],[[.305,.441,z+side*.010],[.327,.418,z+side*.008],[.343,.435,z+side*.010]],high?3:2,function(u,v,out){mixc(cream,rose,v*.45,out);});
    });guard(first);mark('facial-cirri',first);
    // Small epidermal papillae with seeded stations shared by both tiers.
    first=g.count();var papillae=[];for(i=0;i<48;i++){var x=.37-.65*rng(),q=prof(x),y=lerp(q[1]+.025,q[0]-.02,rng()),side=i%2?1:-1,z=side*surfZ(prof,2,x,y),r=.0025+.002*rng(),h=.003+.004*rng();papillae.push([x,y,z,r,h]);if(high||i%3===0)g.tube([[x,y,z],[x+.001,y+.001,z+side*h]],function(u){return r*(1-.95*u);},high?5:3,function(u){return lin(mixc(rose,pale,.45+.4*u,[0,0,0]));});}guard(first);mark('papillae',first);
    // Only body UVs address this mottled skin island; fine anatomy stays in
    // the flat white atlas guard, so eye corneas and fin ribs keep their hue.
    var map=kit.baked(c.key('leaf-pigment'),high?256:128,high?256:128,function(u,v,out){setc(out,white);if(u<.02||u>.48||v<.02||v>.48)return;var x=(u-.02)/.46,y=(v-.02)/.46,n=fbm2(x*8+phase,y*7,3),spot=smooth(.53,.73,n)*(1-.75*smooth(.85,1,x));mixc(cream,rose,.12+.65*spot,out);mulc(out,.96+.04*noise2(x*140,y*137));},false,false);
    var bump=kit.baked(c.key('leaf-papillae'),high?128:64,high?128:64,function(u,v,out){var active=u>=.02&&u<=.48&&v>=.02&&v<=.48;out[0]=out[1]=out[2]=active?.5+.06*(noise2(u*340+phase,v*310)-.5):.5;},false,false,true);
    // Rotate into the existing longitudinal swim shader, making its envelope
    // height-based. The lowest fins are immobile; the sail rocks with flow.
    g.map(0,function(p){var x=p[0],y=p[1];p[0]=-y*L;p[1]=x*L;p[2]*=L;});var geo=kit.geo(g,1),frame=kit.node('leaf-frame',c.root);frame.rotation.z=-PI/2;
    var swim={value:new T.Vector4(phase,0,12/L,0)},shape={value:new T.Vector4(-.04*L,-.80*L,1,0)};
    geo.userData.leafScorpionfish={ranges:ranges,nominalTotalLengthM:.10,scaleM:L,appearance:'cream-pink-unsexed',dorsalRays:dorsal,spines:12,softRays:9,pectorals:pectorals,contacts:contacts,papillae:papillae,cirri:cirri,staticEnvelopeHeightM:.04*L};
    kit.mesh(geo,kit.std({vertexColors:true,map:map,bumpMap:bump,bumpScale:.000055*L,roughness:.57,side:T.DoubleSide},{swim:swim,swimShape:shape,eye:true,iris:hex(0x9f8a6d)}),'leaf-body-and-fins',frame);
    geo.boundingBox.expandByScalar(.025*L);geo.boundingSphere.radius+=.025*L;
    var flow={x:0,z:0,pulse:0};c.anim(function(t,dt,motion){currentAt(c.root,motion,t,phase,flow);var strength=Math.min(1,Math.hypot(flow.x,flow.z));swim.value.set(phase+t*.53,L*(.009+.015*strength)*flow.pulse,12/L,t);});
  }


  // Rhinomuraena quaesita: an unsexed blue/yellow appearance, emerging from
  // a small illustrative rubble burrow. The nominal 1 m is TOTAL length;
  // only a curved forebody is visible and the unseen tail is not fabricated.
  function buildRibbonEel(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(293), k = 0.90 * (0.97 + 0.06 * rng()), phase = rng() * TAU;
    var body = new Geo(), upper = new Geo(), eyes = new Geo(), jaw = new Geo(), fins = new Geo(), white = [1, 1, 1], blue = hex(0x236db5), deep = hex(0x143f73), yellow = hex(0xd6bf48), gold = hex(0xb89c37), dark = linHex(0x171d25), inner = linHex(0x553e3b), ranges = {};
    var holder = kit.node('emergence-frame', c.root); holder.rotation.y = PI; holder.position.x = 0.30 * k;
    function guard(g, first) { for (var i = first || 0; i < g.count(); i++) { g.t[i * 2] = 0.5; g.t[i * 2 + 1] = 0.5; } }
    function marked(name, first) { ranges[name] = { first: first, count: body.count() - first }; }
    var route = [[0.30, 0.014, 0], [0.30, 0.070, 0], [0.285, 0.150, 0.001], [0.245, 0.220, 0.0015], [0.180, 0.290, 0.002], [0.105, 0.325, 0.001], [0.050, 0.323, 0]];
    function center(t) { var f = t * (route.length - 1), i = Math.min(route.length - 2, Math.floor(f)), u = f - i, a = route[Math.max(0, i - 1)], b = route[i], d = route[i + 1], e = route[Math.min(route.length - 1, i + 2)]; return [catmull(a[0], b[0], d[0], e[0], u), catmull(a[1], b[1], d[1], e[1], u), catmull(a[2], b[2], d[2], e[2], u)]; }
    function cross(t) { var a = center(Math.max(0, t - 0.0001)), b = center(Math.min(1, t + 0.0001)), dx = b[0] - a[0], dy = b[1] - a[1], den = Math.sqrt(dx * dx + dy * dy) || 1; return [dy / den, -dx / den]; }
    function radius(t) { return [0.009 + 0.0033 * Math.sin(t * PI) - 0.0008 * smooth(0.82, 1, t), 0.0038 + 0.0012 * Math.sin(t * PI)]; }
    var steps = high ? 68 : 30, sides = high ? 18 : 8;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, p = center(t), n = cross(t), r = radius(t);
      for (var j = 0; j <= sides; j++) { var a = j / sides * TAU, co = Math.cos(a), sn = Math.sin(a), col = mixc(blue, deep, 0.25 + 0.18 * (1 - co), [0, 0, 0]); body.v(p[0] + n[0] * co * r[0], p[1] + n[1] * co * r[0], p[2] + sn * r[1], lin(col), .02 + .46 * t, .02 + .46 * j / sides); }
      body.seams.push([i * (sides + 1), i * (sides + 1) + sides]);
    }
    for (i = 0; i < steps; i++) for (j = 0; j < sides; j++) { var v = i * (sides + 1) + j, w = v + sides + 1; body.i.push(v, w, v + 1, v + 1, w, w + 1); }
    marked('compressed-forebody', 0);
    // A narrow upper head and genuinely separate lower jaw leave an actual
    // mouth cavity; the upper jaw is not a dark line painted on a tube.
    var headRows = [[.080,.332,.319,.003],[.056,.333,.311,.0055],[.043,.333,.314,.006],[.026,.334,.321,.005],[.010,.333,.325,.0038],[-.004,.332,.327,.0025]], hp = profile(headRows), first = body.count();
    body.loft(headRows, high ? 24 : 10, high ? 16 : 8, function (u, a, x, y, z, out) { var underside = 1 - smooth(-.65, -.10, Math.sin(a)), mask = smooth(.078,.040,x); mixc(mixc(blue,deep,.30,[0,0,0]),mixc(yellow,gold,.18+.08*noise3(x*210,y*130,z*170),[0,0,0]),mask,out); if (underside > 0) mixc(out, hex(0x553e3b), underside * .88 * smooth(.07,.04,x), out); }); guard(body, first); marked('upper-head', first);
    first = body.count();
    // An inconspicuous broken annulus and dark, closed throat give the partial
    // animal a physical attachment in every inspection angle, including below.
    var ringN = high ? 24 : 12, loops = [[.008,.006,.002],[.011,.008,.013],[.027,.021,.009],[.034,.027,0]], rock = hex(0x80745d);
    for (var row = 0; row < loops.length; row++) for (j = 0; j <= ringN; j++) { var a = j / ringN * TAU, q = loops[row], rough = row < 2 ? 1 : 1 + .10 * Math.sin(a * 5 + phase) + .035 * Math.sin(a * 9); body.v(.30 + Math.cos(a) * q[0] * rough, q[2] * (row === 3 ? 1 : .88 + .12 * Math.sin(a * 3 + phase)), Math.sin(a) * q[1] * rough, row < 2 ? dark : lin(mixc(rock, hex(0xaaa18a), .2 + .22 * Math.sin(a * 7 + phase), [0,0,0])), .5,.5); }
    for (row = 0; row < loops.length - 1; row++) for (j = 0; j < ringN; j++) { var v = first + row * (ringN + 1) + j, w = v + ringN + 1; body.i.push(v,v+1,w,v+1,w+1,w); }
    var floor = body.count(); body.v(.30,0,0,dark,.5,.5); for (j = 0; j < ringN; j++) { body.i.push(floor, first+j,first+j+1); var last = first + 3*(ringN+1)+j; body.i.push(floor,last+1,last); } marked('burrow-support', first);
    // Blue skin keeps subtle attached microtexture. All independently coloured
    // head, eye and burrow surfaces use the flat white guard at the atlas centre.
    var pigment = kit.baked(c.key('ribbon-skin'), high ? 256 : 128, high ? 128 : 64, function (u,v,out) { setc(out,white); if (u < .02 || u > .48 || v < .02 || v > .48) return; var grain = noise2(u*460+phase,v*380), m = .94 + .045*noise2(u*32,v*29) - .025*smooth(.66,.86,grain); mulc(out,m); }, false, false);
    var relief = kit.baked(c.key('ribbon-pores'), high ? 128 : 64, high ? 128 : 64, function (u,v,out) { var n = u>=.02&&u<=.48&&v>=.02&&v<=.48 ? .5 + .025*(noise2(u*630+phase,v*570)-.5) : .5; out[0]=out[1]=out[2]=n; }, false, false, true);
    var swim = { value: new T.Vector4(phase,0,12/k,0) }, shape = { value: new T.Vector4(.25*k,.015*k,1,0) };
    scaleGeo(body,k); var bg = kit.geo(body,1), exposedLength = 0, previous = center(0);
    for(i=1;i<=200;i++){var next=center(i/200);exposedLength+=Math.sqrt(Math.pow(next[0]-previous[0],2)+Math.pow(next[1]-previous[1],2)+Math.pow(next[2]-previous[2],2));previous=next;}
    exposedLength += .054;
    bg.userData.ribbonEel = { ranges:ranges, nominalTotalLengthM:1, exposedCenterlineM:exposedLength*k, scale:k, appearance:'blue-yellow-unsexed', route:route, buriedTailImplied:true, pairedFins:false };
    kit.mesh(bg,kit.std({vertexColors:true,map:pigment,bumpMap:relief,bumpScale:.000045*k,roughness:.43,side:T.DoubleSide},{swim:swim,swimShape:shape}),'forebody-support',holder);
    // The continuous exposed dorsal and anal margins are thin fin membranes,
    // not a set of ordinary paired fins. Their roots remain sewn to the body.
    var finSections = [], finN = high ? 54 : 23, finRows = high ? 3 : 2;
    [-1,1].forEach(function(side){var start=fins.count(), roots=[], edges=[];for(var j=0;j<=finN;j++){var t=.02+.94*j/finN,p=center(t),n=cross(t),r=radius(t),width=(side>0?.014:.0085)*(.40+.60*Math.sin(j/finN*PI))*smooth(0,.08,t)*(1-.55*smooth(.85,1,t));roots.push([p[0]+side*n[0]*r[0]*.96,p[1]+side*n[1]*r[0]*.96,p[2]]);edges.push([p[0]+side*n[0]*(r[0]+width),p[1]+side*n[1]*(r[0]+width),p[2]]);}fins.membrane(roots,edges,finRows,function(u,v,out){mixc(yellow,gold,.10+.20*v,out);});guard(fins,start);finSections.push({first:start,count:fins.count()-start,side:side,rows:finRows,columns:finN});});
    // Small lateral eyes are seated on the head and share the existing wet-eye
    // shader feature. The neck has a separate slitlike gill aperture each side.
    [-1,1].forEach(function(side){addEye(T,eyes,hp,2,[.026,.329,.0027],side,hex(0xc0a343),high,.38,false);var f=upper.count();blob(T,upper,.071,.326,side*surfZ(hp,2,.071,.326)*1.01,.0006,.0024,.00025,dark,high?8:5,4);guard(upper,f);});
    // Paired anterior nostrils are real flaring tubes with recessed openings,
    // separate from the single pointed snout projection at the centre.
    var nostrilData=[];
    [-1,1].forEach(function(side){var start=upper.count(),ns=high?16:8,rings=[[.000,.332,side*.0025,.0012,.0010],[-.005,.338,side*.0045,.0017,.0020],[-.013,.343,side*.007,.0034,.0052]];for(var row=0;row<rings.length;row++)for(var j=0;j<ns;j++){var a=j/ns*TAU,q=rings[row];upper.v(q[0],q[1]+Math.cos(a)*q[3],q[2]+Math.sin(a)*q[4],lin(mixc(yellow,gold,.12+.14*Math.sin(a),[0,0,0])),.5,.5);}for(row=0;row<2;row++)for(j=0;j<ns;j++){var a=start+row*ns+j,b=start+row*ns+(j+1)%ns,w=a+ns,w1=b+ns;upper.i.push(a,b,w,b,w1,w);}var innerRing=upper.count(),q=rings[2];for(j=0;j<ns;j++){var a=j/ns*TAU;upper.v(q[0]+.0011,q[1]+Math.cos(a)*q[3]*.72,q[2]+Math.sin(a)*q[4]*.72,inner,.5,.5);}var cap=upper.count();upper.v(q[0]+.003,q[1],q[2],dark,.5,.5);for(j=0;j<ns;j++){var a=start+2*ns+j,b=start+2*ns+(j+1)%ns,w=innerRing+j,w1=innerRing+(j+1)%ns;upper.i.push(a,b,w,b,w1,w,cap,w,w1);}nostrilData.push({side:side,first:start,count:upper.count()-start,opening:q.slice(0,3)});});
    var f=upper.count();upper.tube([[-.003,.333,0],[-.012,.337,0],[-.022,.335,0]],function(u){return .00135*Math.pow(1-u,.8)+.00008;},high?6:4,function(){return lin(yellow);});guard(upper,f);
    var jawRows=[[0,.001,-.003,.004],[-.015,-.003,-.006,.005],[-.034,-.010,-.014,.004],[-.057,-.016,-.019,.0025]];
    jaw.loft(jawRows,high?20:8,high?12:6,function(u,a,x,y,z,out){mixc(yellow,gold,.12,out);if(Math.sin(a)>.3)mixc(out,hex(0x69534a),.82*smooth(.3,.7,Math.sin(a)),out);});
    var chin=[];for(i=-1;i<=1;i++){var pts=[[-.057,-.018,i*.0015],[-.064,-.019-Math.abs(i)*.003,i*.0027],[-.074+Math.abs(i)*.003,-.020-Math.abs(i)*.009,i*.0040]],start=jaw.count();jaw.tube(pts,function(u){return .0009*Math.pow(1-u,.85)+.00004;},high?5:3,function(){return lin(yellow);});chin.push({side:i,first:start,count:jaw.count()-start,tip:pts[2]});}guard(jaw,0);
    scaleGeo(upper,k);scaleGeo(eyes,k);scaleGeo(jaw,k);scaleGeo(fins,k);
    var jp=kit.node('breathing-jaw',holder);jp.position.set(.05*k,.313*k,0);var rig=new Float32Array(80);
    var entries=[{geo:upper.build(T,1),part:'nostrils-gills-snout'},{geo:eyes.build(T,1),part:'eyes',rough:.24,eye:1,bend:1},{geo:jaw.build(T,1),part:'lower-jaw-three-chin-projections',node:jp,rough:.43,bend:1},{geo:fins.build(T,1),part:'continuous-fin-margins',live:true}];
    var mat=kit.std({vertexColors:true,map:pigment,bumpMap:relief,bumpScale:.000045*k,roughness:.45,side:T.DoubleSide},{batch:rig,swim:swim,swimShape:shape,iris:hex(0xc0a343)}),batch=batchMesh(kit,entries,mat,rig,'head-fin-detail',holder),fg=batch.geometry,finEntry=batch.table[3],finV0=finEntry.first,finI0=finEntry.start,rest=fg.attributes.position.array.slice();
    fg.userData.ribbonEel={nostrils:nostrilData,chinProjections:chin,upperSnoutProjectionCount:1,finSections:finSections,finRange:{first:finV0,count:finEntry.count,start:finI0,length:finEntry.length},mouthInterior:true,independentPectoralFins:false};
    batchReach(batch,[{center:jp.position,reach:.08*k,margin:.006*k}]);bg.boundingBox.expandByScalar(.005*k);bg.boundingSphere.radius+=.009*k;fg.boundingBox.expandByScalar(.005*k);fg.boundingSphere.radius+=.009*k;
    var flow={x:0,z:0,pulse:0};
    c.anim(function(t,dt,motion){currentAt(c.root,motion,t,phase,flow);swim.value.set(t*.38+phase,.0022*k*(.7+.3*flow.pulse),12/k,t);jp.rotation.z=.022*(Math.sin(t*1.5+phase)-Math.sin(phase));batchPose(batch);var out=fg.attributes.position.array;for(var s=0;s<finSections.length;s++){var section=finSections[s];for(var v=0;v<section.count;v++){var row=v%(finRows+1),along=Math.floor(v/(finRows+1))/finN,at=(finV0+section.first+v)*3,weight=Math.pow(row/finRows,2),wave=Math.sin(t*1.1+along*TAU*1.4+phase)-Math.sin(along*TAU*1.4+phase);out[at+2]=rest[at+2]+.00065*k*weight*wave;}}batchNormals(fg,finV0,finV0+finEntry.count,finI0,finI0+finEntry.length);batchDirty(fg,finV0,finV0+finEntry.count);});
  }


  // Odontodactylus scyllarus: illustrative resting green/brown/red adult.
  // Ahyong's revisions distinguish the pale-edged carapace spots, folded
  // smashing dactyli and blue uropods. No sex or striking display is implied.
  function buildPeacockMantisShrimp(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(283), L = 0.14 * (0.96 + 0.08 * rng()), phase = rng() * TAU;
    var body = new Geo(), ranges = {}, segments = [], feet = [], clubs = [], white = [1, 1, 1], green = hex(0x306448), gold = hex(0xa68e4b), red = hex(0xb94835), blue = hex(0x24688a), ink = hex(0x252c27), cream = hex(0xd0c59c);
    function mark(name, first) { ranges[name] = { first: first, count: body.count() - first }; }
    function island(g, first, slot) { for (var i = first; i < g.count(); i++) { g.t[i * 2] = (slot % 2 ? 0.52 : 0.02) + 0.46 * g.t[i * 2]; g.t[i * 2 + 1] = (slot > 1 ? 0.52 : 0.02) + 0.46 * g.t[i * 2 + 1]; } }
    function shellUV(g, first) { for (var i = first; i < g.count(); i++) { g.t[i * 2] = 0.02 + 0.46 * clamp((0.36 - g.p[i * 3]) / 0.91, 0, 1); g.t[i * 2 + 1] = 0.02 + 0.46 * g.t[i * 2 + 1]; } }
    function segment(rows, nx, ns, name) { var f = body.count(); body.loft(rows, nx, ns, function (u, a, x, y, z, out) { mixc(white, red, 0.4 * smooth(0.67, 1, u), out); }); shellUV(body, f); mark(name, f); return { first: f, count: body.count() - f }; }
    segment([[0.36, 0.245, 0.145, 0.036], [0.29, 0.26, 0.12, 0.087], [0.17, 0.255, 0.105, 0.106], [0.055, 0.23, 0.10, 0.105], [-0.025, 0.205, 0.098, 0.084]], high ? 22 : 8, high ? 18 : 8, 'carapace');
    // Three exposed posterior thoracic somites bear the three walking pairs.
    for (var i = 0; i < 3; i++) { var x = -0.035 - i * 0.055, h = 0.198 - i * 0.009; segment([[x + 0.025, h - 0.004, 0.083, 0.077], [x, h, 0.079, 0.086], [x - 0.027, h - 0.007, 0.076, 0.078]], high ? 3 : 2, high ? 14 : 6, 'thorax-' + i); }
    // Six distinct, overlapping abdominal plates, not a decapod's arched tail.
    for (i = 0; i < 6; i++) { var x = -0.20 - i * 0.054, top = 0.175 - i * 0.012, width = 0.09 - i * 0.003; var r = segment([[x + 0.026, top - 0.008, top - 0.076, width * 0.9], [x + 0.014, top, top - 0.075, width], [x - 0.017, top - 0.002, top - 0.076, width], [x - 0.031, top - 0.014, top - 0.074, width * 0.92]], high ? 5 : 2, high ? 14 : 6, 'abdomen-' + i); segments.push(r); }
    var start = body.count();
    [-1, 1].forEach(function (side) {
      for (var j = 0; j < 3; j++) {
        var x = -0.035 - j * 0.055, stride = 0.045 - j * 0.035, pts = [[x, 0.105, side * 0.068], [x + stride, 0.073, side * 0.127], [x + stride * 0.35, 0.027, side * 0.17], [x + stride * 1.25, 0.005, side * 0.185]];
        body.tube(pts, function (u) { return 0.011 * (1 - u * 0.68); }, high ? 5 : 3, function (u) { return lin(mixc(red, cream, 0.17 + 0.3 * Math.pow(Math.cos(u * PI * 3), 6), [0, 0, 0])); }); feet.push(pts[3]);
      }
      // Short feeding appendages remain distinct from the posterior feet.
      for (j = 0; j < 4; j++) { var x = 0.20 - j * 0.032; body.tube([[x, 0.115, side * 0.025], [x + 0.045, 0.085, side * 0.045], [x + 0.056, 0.11, side * 0.025]], function (u) { return 0.007 * (1 - 0.55 * u); }, high ? 4 : 3, function (u) { return lin(mixc(red, cream, 0.4 + 0.3 * u, [0, 0, 0])); }); }
    }); mark('walking-and-feeding-appendages', start);
    // Five small paired swimmerets on the abdominal underside are quiet in
    // this supported resting pose; they do not replace the walking legs.
    start = body.count();
    for (i = 0; i < 5; i++) [-1, 1].forEach(function (side) { var x = -0.20 - i * 0.054, y = 0.09 - i * 0.012; body.membrane([[x, y, side * 0.033], [x - 0.025, y, side * 0.033]], [[x - 0.015, y - 0.018, side * 0.065], [x - 0.04, y - 0.014, side * 0.055]], 1, function (u, v, out) { mixc(red, cream, v * 0.4, out); }); }); mark('quiet-pleopods', start);
    // Folded raptorial second maxillipeds: merus, carpus/propodus and the
    // inflated red dactylar heel. They are neither pincers nor spear displays.
    start = body.count();
    [-1, 1].forEach(function (side) {
      var f = body.count(), merus = new Geo(); merus.loft([[0.29, 0.145, 0.10, 0.018], [0.24, 0.155, 0.075, 0.033], [0.145, 0.13, 0.065, 0.038], [0.11, 0.105, 0.067, 0.021]], high ? 7 : 3, high ? 12 : 6, function (u, a, x, y, z, out) { var spot = 1 - smooth(0.25, 0.38, Math.abs(Math.sin(u * PI * 2.5 + a * 0.7))); mixc(gold, ink, spot * 0.88, out); });
      merus.map(0, function (p) { p[2] += side * 0.118; }); body.append(merus, 0, 0, 0);
      body.tube([[0.115, 0.09, side * 0.12], [0.17, 0.065, side * 0.165], [0.265, 0.08, side * 0.172]], function (u) { return 0.017 - u * 0.005; }, high ? 6 : 3, function (u) { return lin(mixc(red, cream, 0.25 + 0.5 * Math.sin(u * PI), [0, 0, 0])); });
      blob(T, body, 0.265, 0.101, side * 0.17, 0.034, 0.028, 0.022, lin(red), high ? 12 : 6, high ? 6 : 4);
      body.tube([[0.27, 0.115, side * 0.17], [0.235, 0.129, side * 0.165], [0.20, 0.123, side * 0.155]], function (u) { return 0.015 * (1 - u * 0.74); }, high ? 5 : 3, function (u) { return lin(mixc(red, ink, u * 0.5, [0, 0, 0])); });
      clubs.push({ first: f, count: body.count() - f, shoulder: [0.29, 0.12, side * 0.118], elbow: [0.115, 0.09, side * 0.12], foldedHeel: [0.265, 0.101, side * 0.17] });
    }); mark('folded-raptorial-pair', start);
    // A flattened, closed telson carries modest longitudinal ridges and
    // shallow posterior teeth, surrounded by two paddles per uropod.
    start = body.count();
    [-1, 1].forEach(function (face) { body.polar(high ? 4 : 2, high ? 28 : 12, function (r, a, out) { var cs = Math.cos(a), sn = Math.sin(a), outline = 1 + 0.055 * Math.max(0, -cs) * Math.cos(a * 6), x = -0.56 + cs * 0.10 * r * outline, z = sn * 0.098 * r * outline, ridge = Math.exp(-Math.pow(z / 0.012, 2)) + 0.6 * Math.exp(-Math.pow((Math.abs(z) - 0.042) / 0.009, 2)), y = 0.060 + face * 0.009 * Math.sqrt(1 - r * r) + (face > 0 ? 0.006 * ridge * (1 - r) : 0); setc(out, lin(mixc(green, red, smooth(0.79, 1, r) * 0.75, [0, 0, 0]))); return [x, y, z, 0.5, 0.5]; }, face < 0); }); mark('ridged-telson', start);
    start = body.count();
    [-1, 1].forEach(function (side) { for (var lobe = 0; lobe < 2; lobe++) { var f = body.count(), roots = [], edges = [], n = high ? 8 : 4; for (var j = 0; j <= n; j++) { var u = j / n, a = (lobe ? 0.95 : 0.40) + (u - 0.5) * 0.5, r = (lobe ? 0.145 : 0.17) * (0.78 + 0.22 * Math.sin(PI * u)); roots.push([-0.49, 0.066, side * 0.066]); edges.push([-0.49 - Math.cos(a) * r, 0.048 + 0.008 * Math.sin(PI * u), side * (0.066 + Math.sin(a) * r)]); } body.membrane(roots, edges, high ? 4 : 2, function (u, v, out) { setc(out, white); }); island(body, f, 3); } }); mark('four-uropod-paddles', start);
    function scalePlate(g, side) { var f = g.count(); [-1, 1].forEach(function (face) { g.polar(high ? 3 : 2, high ? 20 : 8, function (r, a, out) { var x = 0.085 + 0.095 * Math.cos(a) * r, z = 0.044 * Math.sin(a) * r, y = face * 0.008 * Math.sqrt(1 - r * r); setc(out, white); return [0.33 + x, 0.17 + y, side * (0.092 + z), clamp(x / 0.18, 0, 1), (z / 0.044 + 1) * 0.5]; }, face < 0); }); island(g, f, 2); }
    start = body.count(); scalePlate(body, -1); scalePlate(body, 1); mark('paired-antennal-scales', start);
    // All fixed surfaces share a compact pigment atlas. Its guarded white
    // margins leave independently coloured appendages unmodulated.
    var atlas = kit.baked(c.key('mantis-pigment'), high ? 256 : 128, high ? 256 : 128, function (u, v, out) {
      setc(out, white); var left = u >= 0.02 && u <= 0.48, right = u >= 0.52 && u <= 0.98, lower = v >= 0.02 && v <= 0.48, upper = v >= 0.52 && v <= 0.98; if ((!left && !right) || (!lower && !upper)) return;
      var x = (u - (left ? 0.02 : 0.52)) / 0.46, y = (v - (lower ? 0.02 : 0.52)) / 0.46;
      if (left && lower) { var a = y * TAU - PI / 2, up = Math.sin(a), lateral = Math.abs(Math.cos(a)); mixc(green, gold, 0.12 + 0.23 * (1 - up) + 0.09 * noise2(x * 17 + phase, y * 13), out); mixc(out, red, smooth(0.05, -0.75, up) * 0.6, out); var wx = 0.36 - 0.91 * x, margin = 0; for (var e = 0; e < 6; e++) margin = Math.max(margin, 1 - smooth(0.003, 0.009, Math.abs(wx + 0.229 + e * 0.054))); mixc(out, hex(0xc56b3c), margin * 0.72, out); if (x < 0.43) { var d = 9, sites = [[0.095, 0.12, 0.037], [0.20, 0.43, 0.043], [0.33, 0.20, 0.045], [0.29, -0.25, 0.03], [0.13, -0.39, 0.037]]; for (var j = 0; j < sites.length; j++) { var q = sites[j], dx = (x - q[0]) / q[2], dy = (up - q[1]) / 0.18, angle = Math.atan2(dy, dx); d = Math.min(d, Math.hypot(dx, dy) * (1 + 0.08 * Math.sin(angle * 4 + phase + j))); } var sideMask = smooth(0.60, 0.83, lateral); mixc(out, cream, (1 - smooth(1.17, 1.3, d)) * sideMask, out); mixc(out, ink, (1 - smooth(0.86, 1.01, d)) * sideMask, out); } mulc(out, 0.96 + 0.055 * noise2(x * 173 + phase, y * 139)); }
      else if (right && lower) { var facets = Math.sin(x * 130) * Math.sin(y * 95), stripe = band(y - 0.5, 0.035, 0.012); mixc(hex(0x9caa74), hex(0x617c52), 0.25 + 0.18 * facets, out); mixc(out, hex(0x263b35), stripe * 0.84, out); }
      else if (left) { mixc(hex(0xc6a349), red, 0.27 + 0.15 * Math.sin(y * PI), out); mixc(out, ink, smooth(0.78, 0.94, x), out); mixc(out, red, (1 - band(y - 0.5, 0.46, 0.025)) * 0.8, out); }
      else { mixc(blue, hex(0x1e374b), x * 0.55, out); var rim = Math.max(smooth(0.80, 0.93, y), 1 - smooth(0.02, 0.10, x), smooth(0.9, 0.98, x)); mixc(out, hex(0x4dabc5), rim, out); mixc(out, red, smooth(0.955, 0.995, y) * (0.75 + 0.25 * Math.sin(x * 110)), out); }
    }, false, false);
    var relief = kit.baked(c.key('mantis-shell'), high ? 128 : 64, high ? 128 : 64, function (u, v, out) { out[0] = out[1] = out[2] = 0.5 + 0.03 * (noise2(u * 139 + phase, v * 151) - 0.5); }, true, true, true);
    var baseY = Infinity; for (i = 1; i < body.p.length; i += 3) baseY = Math.min(baseY, body.p[i]); body.map(0, function (p) { p[1] -= baseY; }); scaleGeo(body, L);
    var bodyGeo = kit.geo(body, 1); bodyGeo.userData.mantisShrimp = { ranges: ranges, abdomenSegments: segments, walkingFeet: feet, raptorialClubs: clubs, nominalBodyLengthM: 0.14, scaleM: L, baseYCorrectionUnit: baseY, adultSex: 'unspecified' };
    kit.mesh(bodyGeo, kit.std({ vertexColors: true, map: atlas, bumpMap: relief, bumpScale: L * 0.0007, roughness: 0.46, side: T.DoubleSide }), 'shell-fixed-appendages', c.root);
    var rig = new Float32Array(80), entries = [], pivots = [], reaches = [];
    [-1, 1].forEach(function (side) {
      var eye = new Geo(); eye.tube([[0, 0, 0], [0.012, 0.041, side * 0.019], [0.022, 0.072, side * 0.027]], function (u) { return 0.012 * (1 - u * 0.38); }, high ? 6 : 3, function (u) { return lin(mixc(gold, green, u * 0.5, [0, 0, 0])); }); var f = eye.count(); blob(T, eye, 0.022, 0.079, side * 0.027, 0.034, 0.0248, 0.05375, white, high ? 14 : 8, high ? 10 : 4); island(eye, f, 1);
      var ep = kit.node(side < 0 ? 'eye-left' : 'eye-right', c.root); ep.position.set(0.35 * L, (0.218 - baseY) * L, side * 0.052 * L); pivots.push({ node: ep, side: side, kind: 'eye' }); entries.push({ geo: eye.build(T, L), part: side < 0 ? 'eye-left' : 'eye-right', node: ep, bend: 0, rough: 0.28 }); reaches.push({ center: ep.position, reach: 0.125 * L, margin: 0.006 * L });
      var ant = new Geo(); ant.tube([[0, 0, 0], [0.078, 0.018, side * 0.025], [0.15, 0.012, side * 0.045]], function (u) { return 0.005 * (1 - 0.45 * u); }, high ? 4 : 3, function (u) { return lin(mixc(gold, red, u * 0.6, [0, 0, 0])); });
      for (var branch = -1; branch <= 1; branch++) { var pts = [], n = high ? 6 : 3; for (var j = 0; j <= n; j++) { var u = j / n; pts.push([0.15 + 0.12 * u, 0.012 + (0.035 + branch * 0.025) * u - 0.025 * u * u, side * (0.045 + (0.02 + branch * 0.026) * u)]); } ant.tube(pts, function (u) { return 0.0019 * (1 - 0.7 * u); }, 3, function (u) { return lin(mixc(red, cream, u * 0.55, [0, 0, 0])); }); }
      var ap = kit.node(side < 0 ? 'antennule-left' : 'antennule-right', c.root); ap.position.set(0.37 * L, (0.205 - baseY) * L, side * 0.028 * L); pivots.push({ node: ap, side: side, kind: 'antennule' }); entries.push({ geo: ant.build(T, L), part: side < 0 ? 'antennule-left' : 'antennule-right', node: ap, bend: 0, rough: 0.5 }); reaches.push({ center: ap.position, reach: 0.29 * L, margin: 0.008 * L });
    });
    var mat = kit.std({ vertexColors: true, map: atlas, bumpMap: relief, bumpScale: L * 0.0007, roughness: 0.45, side: T.DoubleSide }, { batch: rig }), batch = batchMesh(kit, entries, mat, rig, 'eyes-antennules', c.root); batchReach(batch, reaches); batch.geometry.userData.mantisShrimp = { independentEyePair: true, trifidAntennulePair: true, eyesSubglobular: true };
    var flow = { x: 0, z: 0, pulse: 0 };
    c.anim(function (t, dt, motion) { currentAt(c.root, motion, t, phase, flow); for (var i = 0; i < pivots.length; i++) { var p = pivots[i], eye = p.kind === 'eye', ph = phase + p.side * 1.7; p.node.rotation.x = (eye ? 0.11 : 0.025) * Math.sin(t * (eye ? 0.47 : 0.74) + ph); p.node.rotation.y = (eye ? 0.17 : 0.035) * Math.sin(t * (eye ? 0.33 : 0.62) + ph * 0.8) + (eye ? 0 : 0.012 * flow.z); p.node.rotation.z = (eye ? 0.075 : 0.018) * Math.sin(t * 0.29 + ph); } batchPose(batch); });
  }


  // Anneissia bennetti: one illustrative golden/brown Australian adult.
  // Five shared basal rays divide successively into fifty terminal arms;
  // their fine alternating pinnules are distinct from the gripping cirri.
  function buildBennettsFeatherStar(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(271), k = 0.96 + 0.08 * rng(), phase = rng() * TAU;
    var fixed = new Geo(), crown = new Geo(), discY = 0.052, arms = [], nodes = [], cirri = [], ranges = {}, gold = hex(0xd1ab46), light = hex(0xe5c463), brown = hex(0x705336), shade = hex(0x98743c);
    function color(u, a, tip) { var out = mixc(brown, gold, 0.34 + 0.48 * smooth(0.03, 0.7, u) + 0.06 * Math.sin(a * 3 + phase), [0, 0, 0]); mixc(out, light, tip * 0.36, out); return lin(out); }
    // Crown space is rotated into the existing longitudinal bend shader:
    // local -X is height, so its zero envelope leaves basal joints attached.
    function cv(p, col, u, v) { return crown.v(-(p[1] - discY) * k, p[0] * k, p[2] * k, col, u, v); }
    function strip(a, b, w0, w1, side, u, col0, col1) {
      var f = crown.count(); cv([a[0] - side[0] * w0, a[1] - side[1] * w0, a[2] - side[2] * w0], col0, u, 0); cv([a[0] + side[0] * w0, a[1] + side[1] * w0, a[2] + side[2] * w0], col0, u, 1); cv([b[0] - side[0] * w1, b[1] - side[1] * w1, b[2] - side[2] * w1], col1, u + 0.05, 0); cv([b[0] + side[0] * w1, b[1] + side[1] * w1, b[2] + side[2] * w1], col1, u + 0.05, 1); crown.i.push(f, f + 1, f + 2, f + 1, f + 3, f + 2);
    }
    var params = [];
    for (var i = 0; i < 50; i++) params.push({ angle: (i + 0.5) / 50 * TAU + 0.032 * (rng() - 0.5), length: 0.124 + 0.026 * rng(), rise: 0.052 + 0.068 * rng(), curl: 0.006 + 0.012 * rng(), twist: (rng() - 0.5) * 0.7, feather: 0.010 + 0.006 * rng() });
    function branch(lo, count, parent, depth) {
      if (count === 1) { arms.push({ index: lo, node: parent, start: nodes[parent].point, params: params[lo] }); nodes[parent].children.push('arm-' + lo); return; }
      var angle = (lo + count / 2) / 50 * TAU, r = 0.004 + depth * 0.0034, p = [Math.cos(angle) * r, discY + depth * 0.0025, Math.sin(angle) * r], at = nodes.length;
      nodes.push({ parent: parent, point: p, children: [] });
      if (parent >= 0) { nodes[parent].children.push(at); var a = nodes[parent].point; strip(a, p, 0.0011, 0.0009, [-Math.sin(angle), 0, Math.cos(angle)], 0, color(0, angle, 0), color(0.05, angle, 0)); }
      var left = Math.floor(count / 2); branch(lo, left, at, depth + 1); branch(lo + left, count - left, at, depth + 1);
    }
    for (i = 0; i < 5; i++) branch(i * 10, 10, -1, 0);
    ranges.divisions = { first: 0, count: crown.count() };
    function point(a, u) {
      var q = a.params, r = q.length * u, az = q.angle + q.twist * u * u * 0.18, bow = Math.sin(PI * u), tip = smooth(0.7, 1, u);
      return [a.start[0] + Math.cos(az) * r, a.start[1] + q.rise * Math.sin(u * PI * 0.56) - q.curl * tip + 0.003 * bow, a.start[2] + Math.sin(az) * r];
    }
    // Every tier retains the same fifty terminal axes and actual branch graph.
    var segments = high ? 10 : 2, nPinnules = high ? 64 : 18;
    for (i = 0; i < arms.length; i++) {
      var arm = arms[i], q = arm.params, side = [-Math.sin(q.angle) * Math.cos(q.twist), Math.sin(q.twist), Math.cos(q.angle) * Math.cos(q.twist)], path = [], start = crown.count();
      for (var j = 0; j <= segments; j++) path.push(point(arm, j / segments));
      for (j = 0; j < segments; j++) strip(path[j], path[j + 1], 0.0008 * Math.pow(1 - j / segments, 0.55) + 0.00012, 0.0008 * Math.pow(1 - (j + 1) / segments, 0.55) + 0.00012, side, j / segments, color(j / segments, q.angle, 0), color((j + 1) / segments, q.angle, 0));
      arm.axis = { first: start, count: crown.count() - start }; arm.pinnules = [];
      for (j = 0; j < nPinnules; j++) {
        var u = 0.075 + 0.89 * (j + 0.5) / nPinnules, cell = Math.min(segments - 1, Math.floor(u * segments)), f = u * segments - cell, a = path[cell], b = path[cell + 1], p = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)], s = j % 2 ? 1 : -1;
        var len = q.feather * Math.pow(Math.sin(PI * u), 0.48) * (1 - 0.35 * u), den = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1, forward = [(b[0] - a[0]) / den, (b[1] - a[1]) / den, (b[2] - a[2]) / den];
        var tip = [p[0] + side[0] * s * len + forward[0] * len * 0.42, p[1] + side[1] * s * len + 0.0012 * Math.sin(PI * u) + forward[1] * len * 0.42, p[2] + side[2] * s * len + forward[2] * len * 0.42], w = high ? 0.00065 : 0.00085, pv = crown.count(), curved = high && j % 4 === 0;
        cv([p[0] - forward[0] * w, p[1] - forward[1] * w, p[2] - forward[2] * w], color(u, q.angle, 0), u, 0); cv([p[0] + forward[0] * w, p[1] + forward[1] * w, p[2] + forward[2] * w], color(u, q.angle, 0), u, 1);
        if (curved) { var mid = [lerp(p[0], tip[0], 0.6), lerp(p[1], tip[1], 0.6) + 0.0008, lerp(p[2], tip[2], 0.6)]; cv([mid[0] + forward[0] * w * 0.5, mid[1] + forward[1] * w * 0.5, mid[2] + forward[2] * w * 0.5], color(u, q.angle, 0.6), u, 1); cv(tip, color(u, q.angle, 1), u, 0); crown.i.push(pv, pv + 1, pv + 2, pv, pv + 2, pv + 3); }
        else { cv(tip, color(u, q.angle, 1), u, 0.5); crown.i.push(pv, pv + 1, pv + 2); }
        arm.pinnules.push({ first: pv, count: curved ? 4 : 3, u: u, side: s, root: p });
      }
    }
    // Small oral disc above the centrodorsal; a subtle eccentric mouth remains
    // on the upper surface rather than a fabricated central underside hole.
    var start = fixed.count(); blob(T, fixed, 0, discY - 0.001, 0, 0.0105, 0.0042, 0.0105, lin(shade), high ? 12 : 8, high ? 4 : 3); ranges.disc = { first: start, count: fixed.count() - start };
    start = fixed.count(); blob(T, fixed, 0.005, discY + 0.0029, 0, 0.0012, 0.00035, 0.0012, lin(brown), high ? 6 : 4, 2); ranges.oralOpening = { first: start, count: fixed.count() - start };
    // Thirty robust segmented cirri grip the illustrated reef perch. Their
    // hooked ends stay fixed; fine pinnules never substitute for gripping feet.
    start = fixed.count();
    for (i = 0; i < 30; i++) {
      var a = i / 30 * TAU + 0.025 * Math.sin(i * 2.1 + phase), reach = 0.021 + 0.011 * (0.5 + 0.5 * Math.sin(i * 2.7 + phase)), pts = [], ns = high ? 5 : 3;
      for (j = 0; j <= ns; j++) { var u = j / ns, r = 0.006 + reach * Math.sin(u * PI * 0.76); pts.push([Math.cos(a) * r, discY - 0.004 - 0.031 * u + 0.002 * Math.sin(u * PI), Math.sin(a) * r]); }
      var f0 = fixed.count(), tube = i < (high ? 8 : 4);
      if (tube) fixed.tube(pts, function (u) { return 0.00155 * (1 - u * 0.65) * (1 + 0.13 * Math.cos(u * ns * PI)); }, 3, function (u) { return lin(mixc(hex(0x4d3b2a), shade, 0.3 + 0.23 * Math.cos(u * ns * PI), [0, 0, 0])); });
      else for (j = 0; j < ns; j++) { var p = pts[j], b = pts[j + 1], w = 0.00125 * (1 - j / ns * 0.65), f = fixed.count(), ca = Math.cos(a), sa = Math.sin(a), col = lin(mixc(hex(0x4d3b2a), shade, j % 2 ? 0.6 : 0.24, [0, 0, 0])); fixed.v(p[0] - sa * w, p[1], p[2] + ca * w, col); fixed.v(p[0] + sa * w, p[1], p[2] - ca * w, col); fixed.v(b[0] - sa * w * 0.7, b[1], b[2] + ca * w * 0.7, col); fixed.v(b[0] + sa * w * 0.7, b[1], b[2] - ca * w * 0.7, col); fixed.i.push(f, f + 1, f + 2, f + 1, f + 3, f + 2); }
      cirri.push({ first: f0, count: fixed.count() - f0, contact: pts[pts.length - 1], tube: tube });
    }
    ranges.cirri = { first: start, count: fixed.count() - start }; start = fixed.count();
    fixed.absorb(T, new T.IcosahedronGeometry(1, high ? 1 : 0), new T.Matrix4().makeScale(0.034, 0.019, 0.031).setPosition(0, 0.019, 0), function (x, y, z) { return lin(mixc(hex(0x4c5951), hex(0x7e7d65), 0.3 + 0.22 * noise3(x * 157 + phase, y * 173, z * 149), [0, 0, 0])); }); ranges.perch = { first: start, count: fixed.count() - start };
    var baseY = Infinity; for (i = 1; i < fixed.p.length; i += 3) baseY = Math.min(baseY, fixed.p[i]);
    for (i = 0; i < fixed.count(); i++) { fixed.p[i * 3] *= k; fixed.p[i * 3 + 1] = (fixed.p[i * 3 + 1] - baseY) * k; fixed.p[i * 3 + 2] *= k; fixed.t[i * 2] = fixed.p[i * 3] * 55; fixed.t[i * 2 + 1] = fixed.p[i * 3 + 2] * 55; }
    var fixedGeo = kit.geo(fixed, 1), crownGeo = kit.geo(crown, 1), map = kit.flat('map'), bump = kit.flat('bump');
    fixedGeo.userData.featherStar = { ranges: ranges, cirri: cirri, baseCorrectionM: baseY * k, scale: k };
    crownGeo.userData.featherStar = { basalRays: 5, nodes: nodes, arms: arms, terminalArmCount: 50, pinnulesPerArm: nPinnules, axisSegments: segments, nominalCrownSpreadM: 0.32, scale: k, discHeightM: (discY - baseY) * k, staticEnvelopeHeightM: 0.014 * k };
    var fixedMat = kit.std({ vertexColors: true, map: map, bumpMap: bump, roughness: 0.78, side: T.DoubleSide });
    kit.mesh(fixedGeo, fixedMat, 'disc-cirri-perch', c.root);
    var swim = { value: new T.Vector4(phase, 0, 25 / k, 0) }, shape = { value: new T.Vector4(-0.014 * k, -0.15 * k, 1, 0) };
    var frame = kit.node('crown-frame', c.root); frame.position.y = (discY - baseY) * k; frame.rotation.z = -PI / 2;
    var crownMat = kit.std({ vertexColors: true, map: map, bumpMap: bump, roughness: 0.71, side: T.DoubleSide }, { swim: swim, swimShape: shape });
    kit.mesh(crownGeo, crownMat, 'feathered-crown', frame); crownGeo.boundingBox.expandByScalar(0.0028 * k); crownGeo.boundingSphere.radius += 0.0028 * k;
    var flow = { x: 0, z: 0, pulse: 0 };
    c.anim(function (t, dt, motion) { currentAt(c.root, motion, t, phase, flow); var strength = Math.min(1, Math.hypot(flow.x, flow.z)); swim.value.set(phase + t * 0.74, k * (0.0006 + 0.0018 * strength) * flow.pulse, 25 / k, t); });
  }


  // Hippocampus kuda: illustrative yellow/ochre Singapore adult, following
  // NUS records. Low rear-turned coronet, thick snout and blunt ring tubercles.
  function buildSpottedSeahorse(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(257), L = 0.12 * (0.97 + 0.06 * rng()), phase = rng() * TAU;
    var body = new Geo(), ranges = {}, white = [1, 1, 1], gold = hex(0xb99a51), pale = hex(0xd7bb70), brown = hex(0x715c38), ink = linHex(0x25251f);
    var trunkRows = [[0.35, -0.025, 0.035, 0.027], [0.42, -0.01, 0.064, 0.045], [0.52, 0.02, 0.102, 0.063], [0.62, 0.022, 0.105, 0.065], [0.72, -0.005, 0.070, 0.048], [0.81, -0.005, 0.045, 0.035], [0.90, 0.015, 0.054, 0.038]];
    var headRows = [[0.30, 0.867, 0.817, 0.018], [0.25, 0.883, 0.833, 0.022], [0.18, 0.935, 0.84, 0.044], [0.10, 0.965, 0.84, 0.050], [0.01, 0.956, 0.875, 0.040], [-0.045, 0.925, 0.88, 0.025]], headProfile = profile(headRows);
    function trunk(u) { var q = u * (trunkRows.length - 1), i = Math.min(trunkRows.length - 2, Math.floor(q)), t = q - i, a = trunkRows[Math.max(0, i - 1)], b = trunkRows[i], d = trunkRows[i + 1], e = trunkRows[Math.min(trunkRows.length - 1, i + 2)]; return [catmull(a[0], b[0], d[0], e[0], t), catmull(a[1], b[1], d[1], e[1], t), catmull(a[2], b[2], d[2], e[2], t), catmull(a[3], b[3], d[3], e[3], t)]; }
    function tail(u) {
      if (u < 0.3) { var t = u / 0.3, t2 = t * t, t3 = t2 * t, A = 2 * t3 - 3 * t2 + 1, B = t3 - 2 * t2 + t, C = -2 * t3 + 3 * t2, D = t3 - t2; return [A * -0.025 + B * -0.07 + C * (0.12 * Math.cos(2.8)) + D * -0.058, A * 0.35 + B * -0.13 + C * (0.14 + 0.12 * Math.sin(2.8)) + D * -0.298, 0]; }
      var t = (u - 0.3) / 0.7, a = 2.8 + TAU * 0.93 * t, r = 0.12 * (1 - 0.875 * t); return [Math.cos(a) * r, 0.14 + Math.sin(a) * r, 0];
    }
    function tailRadius(u) { return 0.004 + 0.024 * Math.pow(1 - u, 0.85); }
    function range(name, first) { ranges[name] = { first: first, count: body.count() - first }; }
    var n = high ? 44 : 22, sides = high ? 18 : 8, start = body.count();
    for (var i = 0; i <= n; i++) {
      var u = i / n, s = trunk(u), joint = Math.pow(Math.abs(Math.cos(u * PI * 11)), 16), ring = 1 - 0.055 * joint;
      for (var j = 0; j <= sides; j++) { var v = j / sides, a = v * TAU, ca = Math.cos(a), sa = Math.sin(a), ridge = 1 + 0.035 * Math.cos(a * 4); body.v(s[1] + sp(ca, 0.79) * s[2] * ring * ridge, s[0], sp(sa, 0.79) * s[3] * ring * ridge, white, 0.02 + 0.46 * u, 0.02 + 0.46 * v); }
      body.seams.push([start + i * (sides + 1), start + i * (sides + 1) + sides]);
    }
    for (i = 0; i < n; i++) for (j = 0; j < sides; j++) { var a = start + i * (sides + 1) + j, b = a + sides + 1; body.i.push(a, a + 1, b, a + 1, b + 1, b); }
    var waist = body.v(-0.025, 0.35, 0, white, 0.02, 0.25); for (var j = 0; j < sides; j++) body.i.push(waist, start + j + 1, start + j);
    range('armoured-trunk', start);
    start = body.count(); n = high ? 72 : 36; sides = high ? 12 : 6;
    for (i = 0; i <= n; i++) {
      var u = i / n, p = tail(u), before = tail(Math.max(0, u - 0.0001)), after = tail(Math.min(1, u + 0.0001)), dx = after[0] - before[0], dy = after[1] - before[1], den = Math.sqrt(dx * dx + dy * dy) || 1, r = tailRadius(u) * (1 - 0.04 * Math.pow(Math.cos(u * PI * 36), 12));
      for (j = 0; j <= sides; j++) { var v = j / sides, a = v * TAU; body.v(p[0] - dy / den * Math.cos(a) * r, p[1] + dx / den * Math.cos(a) * r, Math.sin(a) * r * 0.9, white, 0.02 + 0.46 * u, 0.52 + 0.46 * v); }
      body.seams.push([start + i * (sides + 1), start + i * (sides + 1) + sides]);
    }
    for (i = 0; i < n; i++) for (j = 0; j < sides; j++) { var a = start + i * (sides + 1) + j, b = a + sides + 1; body.i.push(a, b, a + 1, a + 1, b, b + 1); }
    var tailTip = tail(1), cap = body.v(tailTip[0], tailTip[1], tailTip[2], white, 0.48, 0.75), last = start + n * (sides + 1); for (j = 0; j < sides; j++) body.i.push(cap, last + j + 1, last + j); range('prehensile-tail', start);
    start = body.count(); body.loft(headRows, high ? 20 : 8, high ? 18 : 8, function (u, a, x, y, z, out) { setc(out, white); });
    var snoutCap = body.count() - 2, kept = []; for (i = 0; i < body.i.length; i += 3) if (body.i[i] !== snoutCap && body.i[i + 1] !== snoutCap && body.i[i + 2] !== snoutCap) kept.push(body.i[i], body.i[i + 1], body.i[i + 2]); body.i = kept;
    for (i = start; i < body.count(); i++) { body.t[i * 2] = 0.52 + 0.46 * body.t[i * 2]; body.t[i * 2 + 1] = 0.02 + 0.46 * body.t[i * 2 + 1]; } range('head-thick-snout', start);
    start = body.count(); n = high ? 6 : 3; sides = high ? 24 : 12;
    for (i = 0; i <= n; i++) { var u = i / n, r = 0.042 * Math.sqrt(Math.max(0, 1 - u * u)) + 0.0004; for (j = 0; j <= sides; j++) { var a = j / sides * TAU, flange = 1 + 0.045 * Math.cos(a * 5) * Math.sin(PI * u); body.v(-0.016 - 0.012 * u + Math.cos(a) * r * flange, 0.946 + 0.054 * u, Math.sin(a) * r * 0.78 * flange, lin(mixc(gold, pale, u * 0.45, [0, 0, 0])), 0, 0); } body.seams.push([start + i * (sides + 1), start + i * (sides + 1) + sides]); }
    for (i = 0; i < n; i++) for (j = 0; j < sides; j++) { var a = start + i * (sides + 1) + j, b = a + sides + 1; body.i.push(a, a + 1, b, a + 1, b + 1, b); }
    var centre = body.v(-0.028, 1.0, 0, lin(gold), 0, 0), last = start + n * (sides + 1); for (j = 0; j < sides; j++) body.i.push(centre, last + j, last + j + 1); range('rounded-rear-coronet', start);
    start = body.count(); [-1, 1].forEach(function (side) { addEye(T, body, headProfile, 2, [0.137, 0.913, 0.020], side, hex(0xbfa864), high, 0.72, false); }); range('seated-eyes', start);
    // A complete cream lip, dark inner wall and recessed floor: an actual
    // terminal suction opening, not a painted disc across a closed snout.
    start = body.count(); sides = high ? 20 : 10;
    for (j = 0; j < sides; j++) { var a = j / sides * TAU, ca = Math.cos(a), sa = Math.sin(a); body.v(0.302, 0.842 + ca * 0.025, sa * 0.018, lin(pale), 0, 0); body.v(0.301, 0.842 + ca * 0.010, sa * 0.0075, lin(gold), 0, 0); body.v(0.287, 0.842 + ca * 0.008, sa * 0.006, ink, 0, 0); }
    var floor = body.v(0.286, 0.842, 0, ink, 0, 0);
    for (j = 0; j < sides; j++) { var a = start + j * 3, b = start + (j + 1) % sides * 3; body.i.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2, floor, a + 2, b + 2); } range('recessed-terminal-mouth', start);
    start = body.count(); var stem = linHex(0x5d6448), bark = linHex(0x777058);
    body.tube([[-0.025, 0.005, -0.01], [-0.018, 0.065, -0.01], [0, 0.14, 0]], function (t) { return 0.013 - t * 0.002; }, high ? 7 : 4, function (t) { return t > 0.5 ? stem : bark; });
    body.tube([[0, 0.14, -0.07], [0, 0.14, 0], [0.015, 0.16, 0.09]], function (t) { return 0.011 * (1 - 0.35 * t); }, high ? 7 : 4, function () { return stem; }); range('subordinate-holdfast', start);
    var baseY = Infinity; for (i = 1; i < body.p.length; i += 3) baseY = Math.min(baseY, body.p[i]); body.map(0, function (p) { p[1] -= baseY; }); scaleGeo(body, L);
    function pigment(kind, u, v, out) {
      var a = v * TAU, mottle = noise2(u * (kind === 'tail' ? 37 : 13) + phase, Math.cos(a) * 4 + Math.sin(a) * 3), light = 0.25 + 0.42 * mottle + 0.12 * Math.max(0, Math.cos(a)); mixc(gold, pale, light, out);
      var fleck = smooth(0.64, 0.83, noise2(u * 73 + phase, Math.sin(a) * 21 + Math.cos(a) * 13)); mixc(out, brown, fleck * 0.34, out);
      if (kind !== 'head') { var count = kind === 'tail' ? 36 : 11, joint = band(fract(u * count) - 0.5, 0.06, 0.045), saddle = Math.pow(Math.max(0, Math.sin(u * PI * (kind === 'tail' ? 7 : 3) + 0.6)), 8) * smooth(0.2, -0.3, Math.cos(a)); mixc(out, brown, joint * 0.22 + saddle * 0.18, out); }
    }
    var atlas = kit.baked(c.key('spotted-seahorse-pigment'), high ? 256 : 128, high ? 256 : 128, function (u, v, out) {
      setc(out, white); var left = u >= 0.02 && u <= 0.48, right = u >= 0.52 && u <= 0.98, bottom = v >= 0.02 && v <= 0.48, top = v >= 0.52 && v <= 0.98; if ((!left && !right) || (!bottom && !top)) return;
      var x = (u - (left ? 0.02 : 0.52)) / 0.46, y = (v - (bottom ? 0.02 : 0.52)) / 0.46; if (right && top) { mixc(hex(0xa1a88d), hex(0xd3cda8), y * 0.35, out); return; } pigment(right ? 'head' : top ? 'tail' : 'trunk', x, y, out);
    }, false, false);
    var relief = kit.baked(c.key('spotted-seahorse-relief'), high ? 256 : 128, high ? 256 : 128, function (u, v, out) { var left = u >= 0.02 && u <= 0.48, top = v >= 0.52, t = clamp((u - 0.02) / 0.46, 0, 1), joint = left ? band(fract(t * (top ? 36 : 11)) - 0.5, 0.075, 0.04) : 0; out[0] = out[1] = out[2] = 0.5 - joint * 0.11 + 0.022 * (noise2(u * 173 + phase, v * 179) - 0.5); }, false, false, true);
    var bodyGeo = kit.geo(body, 1); bodyGeo.userData.spottedSeahorse = { ranges: ranges, posedHeightNominalM: 0.12, visibleSex: 'unspecified', tailTerminalCentreUnit: tailTip, tailTerminalRadiusUnit: tailRadius(1), holdfastContactCentreUnit: [0, 0.14, 0], baseYCorrectionM: baseY * L };
    kit.mesh(bodyGeo, kit.std({ vertexColors: true, map: atlas, bumpMap: relief, bumpScale: L * 0.00065, roughness: 0.62, side: T.DoubleSide }, { eye: true, iris: hex(0xbfa864) }), 'body-tail-holdfast', c.root);
    var rig = new Float32Array(80), entries = [], pivots = [], reaches = [], dorsal = new Geo(), roots = [], edges = [], n = high ? 18 : 8;
    for (i = 0; i <= n; i++) { var u = i / n, h = Math.pow(Math.sin(PI * u), 0.7) * 0.063; roots.push([0, 0.15 * (u - 0.5), 0]); edges.push([-h, 0.15 * (u - 0.5) + 0.008 * Math.sin(PI * u), 0.004 * Math.sin(u * TAU)]); }
    dorsal.membrane(roots, edges, high ? 4 : 2, function (u, v, out) { mixc(hex(0x9b9e7b), hex(0xc5c3a0), v * 0.5, out); });
    var dp = kit.node('dorsal-fin', c.root); dp.position.set(-0.074 * L, (0.46 - baseY) * L, 0); pivots.push({ node: dp, kind: 'dorsal', side: 0 }); entries.push({ geo: dorsal.build(T, L), part: 'dorsal-fin', node: dp, bend: 0, rays: 1 }); reaches.push({ center: dp.position, reach: 0.102 * L, margin: 0.01 * L });
    [-1, 1].forEach(function (side) { var g = new Geo(), roots = [], edges = [], n = high ? 12 : 6; for (var i = 0; i <= n; i++) { var u = i / n, a = lerp(-0.8, 0.8, u), r = 0.035 * Math.pow(Math.sin(PI * u), 0.45); roots.push([0, 0.02 * (u - 0.5), 0]); edges.push([-r * Math.cos(a), r * Math.sin(a), side * r * 0.3]); } g.membrane(roots, edges, 2, function (u, v, out) { mixc(hex(0xa7a58b), hex(0xd1cba9), v * 0.55, out); }); var pv = kit.node(side < 0 ? 'pectoral-left' : 'pectoral-right', c.root); pv.position.set(0.055 * L, (0.867 - baseY) * L, side * 0.041 * L); pv.rotation.y = side * 0.6; pivots.push({ node: pv, kind: 'pectoral', side: side }); entries.push({ geo: g.build(T, L), part: side < 0 ? 'pectoral-left' : 'pectoral-right', node: pv, bend: 0, rays: 1 }); reaches.push({ center: pv.position, reach: 0.041 * L, margin: 0.006 * L }); });
    var finMat = kit.std({ vertexColors: true, roughness: 0.58, side: T.DoubleSide }, { batch: rig, rays: true, finRelief: 0.12 }), batch = batchMesh(kit, entries, finMat, rig, 'fins', c.root); batchReach(batch, reaches); var flow = { x: 0, z: 0, pulse: 0 };
    c.anim(function (t, dt, motion) { currentAt(c.root, motion, t, phase, flow); for (var i = 0; i < pivots.length; i++) { var p = pivots[i], dorsal = p.kind === 'dorsal', a = dorsal ? 0.065 : 0.055; p.node.rotation.x = a * Math.sin(t * TAU * (dorsal ? 7 : 6) + phase + p.side); p.node.rotation.y = (dorsal ? 0 : p.side * 0.6) + 0.008 * flow.z * flow.pulse; p.node.rotation.z = 0.012 * Math.sin(t * TAU * 3 + phase + i); } batchPose(batch); });
  }

  // Unsexed Pacific Hymenocera picta, following the 2017 Mexican field
  // records: cream, blue-edged wine blotches and expanded second pereopods.
  function buildHarlequinShrimp(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(239), L = 0.045 * (0.94 + 0.12 * rng()), phase = rng() * TAU;
    var cream = hex(0xd9cdb9), shade = hex(0xb7a79f), blue = hex(0x455e9f), pink = hex(0xb36b90), wine = hex(0x783356), ink = lin(hex(0x242329));
    var body = new Geo(), ranges = {}, entries = [], pivots = [], reaches = [], rig = new Float32Array(80);
    var carapaceRows = [[0.40, 0.385, 0.365, 0.008], [0.33, 0.44, 0.25, 0.055], [0.24, 0.48, 0.21, 0.105], [0.11, 0.46, 0.18, 0.125], [-0.035, 0.4, 0.175, 0.11], [-0.08, 0.35, 0.18, 0.092]], abdomenRows = [[-0.045, 0.39, 0.17, 0.107], [-0.13, 0.355, 0.155, 0.099], [-0.22, 0.30, 0.125, 0.085], [-0.31, 0.245, 0.10, 0.067], [-0.4, 0.195, 0.085, 0.048], [-0.47, 0.16, 0.08, 0.032]];
    function blotch(x, y, z) {
      var sites = [[0.23, 0.38, 0.09, 0.095, 0.085, 0.07], [0.02, 0.31, 0.09, 0.075, 0.075, 0.06], [-0.16, 0.28, 0.07, 0.065, 0.07, 0.05], [-0.34, 0.2, 0.045, 0.055, 0.055, 0.05], [0.12, 0.455, 0.0, 0.075, 0.065, 0.075]], d = 9;
      for (var j = 0; j < sites.length; j++) { var s = sites[j], dx = (x - s[0]) / s[3], dy = (y - s[1]) / s[4], dz = (Math.abs(z) - s[2]) / s[5]; d = Math.min(d, Math.sqrt(dx * dx + dy * dy + dz * dz) * (1 + 0.075 * Math.sin(dx * 4 + dz * 3 + phase))); }
      var col = mixc(shade, cream, 0.6 + 0.3 * smooth(0.14, 0.47, y), [0, 0, 0]);
      mixc(col, blue, 1 - smooth(1.07, 1.12, d), col); mixc(col, pink, 1 - smooth(0.91, 0.96, d), col); mixc(col, wine, (1 - smooth(0.72, 0.82, d)) * 0.98, col); return col;
    }
    function markRange(name, first) {
      ranges[name] = { first: first, count: body.count() - first };
      var mapped = name === 'carapace-rostrum' || name === 'segmented-abdomen';
      for (var k = first; k < body.count(); k++) { body.t[k * 2] = mapped ? 0.02 + 0.46 * body.t[k * 2] : 0; body.t[k * 2 + 1] = mapped ? (name === 'carapace-rostrum' ? 0.02 : 0.52) + 0.46 * body.t[k * 2 + 1] : 0; }
    }
    var start = body.count();
    body.loft(carapaceRows, high ? 20 : 8, high ? 18 : 10, function (u, a, x, y, z, out) { setc(out, [1, 1, 1]); }); markRange('carapace-rostrum', start);
    start = body.count();
    body.loft(abdomenRows, high ? 30 : 18, high ? 16 : 8, function (u, a, x, y, z, out) { setc(out, [1, 1, 1]); });
    body.map(start, function (p) { var f = fract((p[0] + 0.47) / (0.425 / 6)), edge = Math.min(f, 1 - f), seam = Math.exp(-Math.pow(edge / 0.12, 2)); p[1] -= 0.019 * seam * smooth(0.1, 0.22, p[1]); p[2] *= 1 - 0.13 * seam; }); markRange('segmented-abdomen', start);
    start = body.count();
    for (var j = 0; j < 3; j++) [-1, 1].forEach(function (side) {
      var x = 0.10 - j * 0.10, z = side * (0.23 + j * 0.025);
      body.tube([[x, 0.22, side * 0.085], [x - 0.025, 0.13, side * 0.18], [x + 0.035, 0.005, z]], function (t) { return 0.011 - 0.007 * t; }, high ? 5 : 3, function (t) { return lin(mixc(cream, wine, band(fract(t * 2.5) - 0.5, 0.18, 0.08), [0, 0, 0])); });
    }); markRange('walking-legs', start);
    start = body.count();
    [-1, 1].forEach(function (side) {
      body.tube([[0.24, 0.26, side * 0.065], [0.36, 0.19, side * 0.1], [0.43, 0.16, side * 0.085]], 0.007, high ? 5 : 3, function () { return lin(cream); });
      body.tube([[0.29, 0.40, side * 0.065], [0.365, 0.49, side * 0.1]], function (t) { return 0.015 - t * 0.004; }, high ? 6 : 4, function () { return lin(cream); });
      blob(T, body, 0.37, 0.495, side * 0.103, 0.025, 0.024, 0.025, ink, high ? 12 : 6, high ? 8 : 4);
    }); markRange('mouthparts-stalked-eyes', start);
    start = body.count();
    for (var f = -2; f <= 2; f++) {
      var theta = f * 0.27, roots = [], edges = [], n = high ? 7 : 4;
      for (var j = 0; j <= n; j++) { var u = j / n, a = theta + (u - 0.5) * 0.27; roots.push([-0.45, 0.11, f * 0.01]); edges.push([-0.45 - Math.cos(a) * (0.14 + 0.022 * Math.sin(PI * u)), 0.075 + 0.009 * Math.sin(PI * u), Math.sin(a) * 0.15]); }
      body.membrane(roots, edges, 2, function (u, v, out) { mixc(cream, pink, band(v - 0.64, 0.19, 0.08), out); mixc(out, blue, smooth(0.88, 1, v) * 0.8, out); });
    } markRange('tail-fan', start);
    // Closed, softly convex plates. The claw outline includes a real finger
    // cleft; its upper and lower faces meet around the full rounded perimeter.
    function plate(g, outline, nr, ns, convert) {
      var centre = [0.18, 0], topFirst = g.count(), nc = outline.length;
      function edge(a) { var q = a / TAU * nc, i = Math.floor(q) % nc, t = q - Math.floor(q), A = outline[(i + nc - 1) % nc], B = outline[i], C = outline[(i + 1) % nc], D = outline[(i + 2) % nc]; return [catmull(A[0], B[0], C[0], D[0], t), catmull(A[1], B[1], C[1], D[1], t)]; }
      [-1, 1].forEach(function (face) {
        g.polar(nr, ns, function (r, a, out) { var e = edge(a), x = lerp(centre[0], e[0], r), z = lerp(centre[1], e[1], r), h = face * 0.023 * Math.pow(Math.max(0, 1 - r * r), 0.7), p = convert(x, z, h); setc(out, [1, 1, 1]); return p; }, face < 0);
      });
      var faceCount = 1 + nr * ns; for (var j = 0; j < ns; j++) g.seams.push([topFirst + 1 + (nr - 1) * ns + j, topFirst + faceCount + 1 + (nr - 1) * ns + j]);
    }
    function platePigment(x, z, petal) {
      var sites = petal ? [[0.14, 0, 0.075, 0.07]] : [[0.12, -0.045, 0.072, 0.07], [0.28, 0.055, 0.075, 0.075], [0.39, -0.075, 0.045, 0.035]], d = 9;
      for (var j = 0; j < sites.length; j++) { var s = sites[j], dx = (x - s[0]) / s[2], dz = (z - s[1]) / s[3], a = Math.atan2(dz, dx); d = Math.min(d, Math.sqrt(dx * dx + dz * dz) * (1 + 0.1 * Math.sin(a * 5 + phase))); }
      var col = mixc(shade, cream, 0.88, [0, 0, 0]); mixc(col, blue, 1 - smooth(1.07, 1.12, d), col); mixc(col, pink, 1 - smooth(0.91, 0.96, d), col); mixc(col, wine, (1 - smooth(0.72, 0.82, d)) * 0.98, col); return col;
    }
    var clawOutline = [[0, 0], [0.035, -0.07], [0.12, -0.14], [0.26, -0.16], [0.39, -0.11], [0.46, -0.045], [0.45, -0.012], [0.385, -0.025], [0.31, 0], [0.385, 0.026], [0.45, 0.065], [0.40, 0.13], [0.28, 0.17], [0.14, 0.15], [0.045, 0.07]];
    var petalOutline = [[0.02, 0], [0.07, -0.055], [0.17, -0.08], [0.27, -0.05], [0.3, 0], [0.27, 0.05], [0.17, 0.08], [0.07, 0.055]];
    var baseY = Infinity; for (var y = 1; y < body.p.length; y += 3) baseY = Math.min(baseY, body.p[y]); body.map(0, function (p) { p[1] -= baseY; }); scaleGeo(body, L);
    var micro = kit.baked(c.key('harlequin-shell'), high ? 128 : 64, high ? 64 : 32, function (u, v, out) { var h = 0.49 + 0.055 * (noise2(u * 67 + phase, v * 79) - 0.5); out[0] = out[1] = out[2] = h; }, true, true, true);
    // Four guarded UV islands share one small pigment atlas. Both faces and
    // both detail tiers sample the same contours, without radial colour fans.
    var carapaceProfile = profile(carapaceRows), abdomenProfile = profile(abdomenRows);
    var atlas = kit.baked(c.key('harlequin-pigment'), high ? 256 : 128, high ? 256 : 128, function (u, v, out) {
      setc(out, [1, 1, 1]);
      var left = u >= 0.02 && u <= 0.48, right = u >= 0.52 && u <= 0.98, bottom = v >= 0.02 && v <= 0.48, top = v >= 0.52 && v <= 0.98;
      if ((!left && !right) || (!bottom && !top)) return;
      var a = (u - (left ? 0.02 : 0.52)) / 0.46, b = (v - (bottom ? 0.02 : 0.52)) / 0.46;
      if (right) { setc(out, platePigment(a * 0.5 - 0.02, b * 0.36 - 0.18, top)); return; }
      var x = bottom ? lerp(0.4, -0.08, a) : lerp(-0.045, -0.47, a), s = (bottom ? carapaceProfile : abdomenProfile)(x), angle = -PI / 2 + b * TAU;
      setc(out, blotch(x, (s[0] + s[1]) / 2 + Math.sin(angle) * (s[0] - s[1]) / 2, Math.cos(angle) * s[2]));
    }, false, false);
    var bodyGeo = kit.geo(body, 1); bodyGeo.userData.harlequinShrimp = { ranges: ranges, nominalBodyLengthM: 0.045, baseYCorrection: baseY * L, adultSex: 'unspecified' };
    kit.mesh(bodyGeo, kit.std({ vertexColors: true, map: atlas, bumpMap: micro, bumpScale: L * 0.0006, roughness: 0.54, side: T.DoubleSide }), 'body-legs-tail', c.root);
    [-1, 1].forEach(function (side) {
      var claw = new Geo(); claw.tube([[0, 0, 0], [0.05, -0.035, side * 0.1], [0.12, 0.02, side * 0.16]], 0.018, high ? 6 : 4, function () { return lin(cream); });
      plate(claw, clawOutline, high ? 7 : 3, high ? 48 : 24, function (x, z, h) { return [0.1 + x, 0.02 + x * 0.28 - z * 0.65 + h, side * (0.16 + z), 0.52 + 0.46 * (x + 0.02) / 0.5, 0.02 + 0.46 * (z + 0.18) / 0.36]; });
      var pv = kit.node(side < 0 ? 'claw-left' : 'claw-right', c.root); pv.position.set(0.19 * L, (0.26 - baseY) * L, side * 0.09 * L); pivots.push({ node: pv, kind: 'claw', side: side });
      entries.push({ geo: claw.build(T, L), part: side < 0 ? 'claw-left' : 'claw-right', node: pv, bend: 0, rough: 0.45 }); reaches.push({ center: pv.position, reach: 0.68 * L, margin: 0.012 * L });
      var petal = new Geo(); plate(petal, petalOutline, high ? 4 : 2, high ? 24 : 12, function (x, z, h) { return [x * 0.3, x * 0.8 + h * 0.45, side * (z + 0.16 * x), 0.52 + 0.46 * (x + 0.02) / 0.5, 0.52 + 0.46 * (z + 0.18) / 0.36]; });
      petal.tube([[0, 0, 0], [0.045, 0.12, side * 0.035], [0.075, 0.28, side * 0.06]], function (t) { return 0.0023 * (1 - 0.6 * t); }, 3, function () { return lin(cream); });
      var ap = kit.node(side < 0 ? 'antennule-left' : 'antennule-right', c.root); ap.position.set(0.31 * L, (0.445 - baseY) * L, side * 0.08 * L); pivots.push({ node: ap, kind: 'antennule', side: side });
      entries.push({ geo: petal.build(T, L), part: side < 0 ? 'antennule-left' : 'antennule-right', node: ap, bend: 0, rough: 0.52 }); reaches.push({ center: ap.position, reach: 0.32 * L, margin: 0.008 * L });
    });
    var mat = kit.std({ vertexColors: true, map: atlas, bumpMap: micro, bumpScale: L * 0.0006, roughness: 0.47, side: T.DoubleSide }, { batch: rig }), batch = batchMesh(kit, entries, mat, rig, 'front-appendages', c.root); batchReach(batch, reaches);
    batch.geometry.userData.harlequinShrimp = { flattenedClawPair: true, petalAntennulePair: true, adultSex: 'unspecified' };
    var localFlow = { x: 0, z: 0, pulse: 0 };
    c.anim(function (t, dt, motion) {
      var flow = currentAt(c.root, motion, t, phase, localFlow);
      for (var i = 0; i < pivots.length; i++) { var p = pivots[i], ant = p.kind === 'antennule', a = ant ? 0.025 : 0.012;
        p.node.rotation.set(a * Math.sin(t * 0.7 + phase + p.side), a * 0.8 * p.side * Math.sin(t * 0.55 + phase) + flow.z * flow.pulse * (ant ? 0.018 : 0.006), a * 0.6 * Math.sin(t * 0.44 + p.side));
      } batchPose(batch);
    });
  }

  function buildBlueVelvetSlug(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(211), L = 0.05 * (0.93 + 0.14 * rng()), phase = rng() * TAU;
    var ink = hex(0x0b1019), blue = hex(0x188ff0), body = new Geo(), ranges = {}, headV = high ? [-1, -0.985, -0.955, -0.9, -0.8, -0.7, -0.55, -0.35, -0.2, -0.045, -0.018, 0, 0.018, 0.045, 0.2, 0.35, 0.55, 0.7, 0.8, 0.9, 0.955, 0.985, 1] : [-1, -0.985, -0.955, -0.9, -0.8, -0.7, -0.5, -0.045, -0.018, 0, 0.018, 0.045, 0.5, 0.7, 0.8, 0.9, 0.955, 0.985, 1];
    function pigment(x, z, edge) { var col = [0, 0, 0]; setc(col, ink); mulc(col, 0.88 + 0.24 * noise2(x * 37 + phase, z * 49)); return lin(mixc(col, blue, edge, col)); }
    function grid(g, us, vs, point, color, name) {
      var first = g.count(), nc = vs.length;
      for (var i = 0; i < us.length; i++) for (var j = 0; j < nc; j++) { var u = us[i], v = vs[j], p = point(u, v); g.v(p[0], p[1], p[2], color(u, v, p), u, (v + 1) / 2); }
      for (i = 0; i < us.length - 1; i++) for (j = 0; j < nc - 1; j++) { var a = first + i * nc + j, b = a + nc; g.i.push(a, b, a + 1, a + 1, b, b + 1); }
      if (name) ranges[name] = { first: first, rows: us.length, columns: nc };
    }
    function steps(n) { var a = []; for (var i = 0; i <= n; i++) a.push(i / n); return a; }
    body.loft([[0.445, 0.05, 0, 0.145], [0.35, 0.067, 0, 0.145], [0.2, 0.078, 0, 0.125], [0.035, 0.082, 0, 0.115], [-0.1, 0.061, 0, 0.1], [-0.19, 0.027, 0, 0.048]], high ? 24 : 12, high ? 24 : 12, function (u, a, x, y, z, out) { setc(out, ink); mulc(out, 0.9 + 0.2 * noise2(x * 34 + phase, z * 40)); }, 2.2);
    var headU = [0, 0.012, 0.03], hn = high ? 24 : 12;
    for (var i = 1; i <= hn; i++) headU.push(0.03 + 0.97 * i / hn);
    function headPoint(u, v) {
      var width = 0.18 * (0.9 + 0.1 * Math.cos(PI * u)) * Math.sqrt(1 - 0.995 * u * u), front = 0.008 * Math.cos(TAU * v) * Math.pow(1 - u, 4) - 0.018 * Math.pow(Math.abs(v), 8) * Math.pow(1 - u, 2);
      return [0.44 - 0.34 * u + front, 0.025 + 0.025 * (1 - v * v) + 0.055 * Math.sin(PI * u) + 0.012 * u, width * v];
    }
    grid(body, headU, headV, headPoint, function (u, v, p) { var edge = Math.abs(v) >= 0.984 || u <= 0.013 || u >= 0.99 || Math.abs(v) <= 0.019 ? 1 : 0; return pigment(p[0], p[2], edge); }, 'headshield');
    scaleGeo(body, L);
    var micro = kit.baked(c.key('velvet-skin'), high ? 128 : 64, high ? 64 : 32, function (u, v, out) { var pores = noise2(u * 110 + phase, v * 97); out[0] = out[1] = out[2] = 0.46 + 0.1 * pores; }, false, false, true);
    function material(rig) { return kit.std({ vertexColors: true, map: kit.flat('map'), bumpMap: micro, bumpScale: L * 0.0008, roughness: 0.49, side: T.DoubleSide }, rig ? { batch: rig, swim: swim, swimShape: shape } : {}); }
    var bodyGeometry = kit.geo(body, 1); bodyGeometry.userData.headshieldSlug = ranges;
    kit.mesh(bodyGeometry, material(), 'body-headshield', c.root);
    var rig = new Float32Array(80), swim = { value: new T.Vector4(0, 0, TAU / (0.45 * L), 0) }, shape = { value: new T.Vector4(0, -0.4 * L, 1, 0) }, entries = [], pivots = [], reaches = [], softParts = {};
    [-1, 1].forEach(function (side) {
      var panel = new Geo(), us = steps(high ? 28 : 14), vs = high ? [0, 0.2, 0.4, 0.6, 0.8, 0.94, 0.965, 1] : [0, 0.33, 0.67, 0.94, 0.965, 1];
      grid(panel, us, vs, function (u, v) { var span = Math.pow(Math.sin(PI * u), 0.45), roll = PI * 0.95 * v; return [0.24 - 0.44 * u, 0.045 * span * (1 - Math.cos(roll)) + 0.003 * span * Math.sin(u * TAU + phase) * Math.sin(PI * v), side * 0.11 * span * Math.sin(roll)]; }, function (u, v, p) { return pigment(p[0], p[2], v >= 0.964 ? 1 : 0); });
      var pv = kit.node(side < 0 ? 'parapodium-left' : 'parapodium-right', c.root); pv.position.set(0, 0.025 * L, side * 0.075 * L); pivots.push({ node: pv, kind: 'panel', side: side });
      entries.push({ geo: panel.build(T, L), part: side < 0 ? 'parapodium-left' : 'parapodium-right', node: pv, bend: 0 }); reaches.push({ center: pv.position, reach: 0.27 * L, margin: 0.004 * L });
    });
    [-1, 1].forEach(function (side) {
      // Facing +X with +Y up, anatomical left is -Z. Preserve its longer lobe
      // at both tiers; these are posterior shield lobes, never head tentacles.
      var tail = new Geo(), length = side < 0 ? 0.4 : 0.23, us = steps(high ? 24 : 12), vs = high ? [-1, -0.97, -0.93, -0.5, 0, 0.5, 0.93, 0.97, 1] : [-1, -0.97, -0.93, 0, 0.93, 0.97, 1];
      grid(tail, us, vs, function (u, v) { var w = 0.055 * Math.pow(1 - u, 0.78) * (0.72 + 0.28 * Math.sin(PI * u)) + 0.0006; return [-length * u, 0.018 * (1 - v * v) * (1 - u) + 0.008 * Math.sin(PI * u), side * 0.03 * u + 0.016 * Math.sin(PI * u + phase) * Math.sin(PI * u) + w * v]; }, function (u, v, p) { return pigment(p[0], p[2], Math.abs(v) >= 0.969 || u >= 0.99 ? 1 : 0); });
      var pv = kit.node(side < 0 ? 'posterior-lobe-left' : 'posterior-lobe-right', c.root); pv.position.set(-0.14 * L, 0.028 * L, side * 0.07 * L); pivots.push({ node: pv, kind: 'tail', side: side });
      entries.push({ geo: tail.build(T, L), part: side < 0 ? 'posterior-lobe-left' : 'posterior-lobe-right', node: pv, bend: 1 }); reaches.push({ center: pv.position, reach: length * L + 0.003 * L, margin: 0.004 * L });
      softParts[side < 0 ? 'left' : 'right'] = { lengthM: length * L, anatomicalSideZ: side };
    });
    var b = batchMesh(kit, entries, material(rig), rig, 'soft-margins', c.root); batchReach(b, reaches); b.geometry.boundingBox.expandByScalar(0.004 * L); b.geometry.userData.headshieldSlug = { posteriorLobes: softParts };
    c.anim(function (t, dt, motion) {
      var flow = motion && motion.current ? clamp(num(motion.current.strength, 0.4), 0, 1) : 0.4;
      swim.value.set(t * 0.72 + phase, L * (0.0012 + 0.0008 * flow), TAU / (0.45 * L), 0);
      for (var i = 0; i < pivots.length; i++) { var p = pivots[i]; if (p.kind === 'panel') p.node.rotation.x = p.side * 0.018 * Math.sin(t * 0.4 + phase + i * 0.6); else p.node.rotation.y = 0.018 * Math.sin(t * 0.31 + phase + i * 1.1); }
      batchPose(b);
    });
  }

  // Arothron nigropunctatus: relaxed, uninflated grey-brown example. Dark
  // irregular spots and the doglike eye/muzzle mask are pigment; the skin has
  // only fine spinules, never the long erected spines of a porcupinefish.
  function buildBlackspottedPuffer(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(419),L=.25*(.98+.04*rng()),phase=rng()*TAU;
    var body=new Geo(),detail=new Geo(),fins=new Geo(),finParts=[],ranges={},white=[1,1,1],ivory=hex(0xdedbc6),grey=hex(0x918d78),dark=hex(0x272c28),finColor=hex(0xc1b894);
    var rows=[[.485,.015,-.055,.035],[.43,.085,-.09,.100],[.32,.16,-.13,.175],[.18,.205,-.185,.215],[.00,.20,-.215,.220],[-.15,.14,-.17,.165],[-.26,.063,-.075,.084],[-.35,.028,-.030,.030]],prof=profile(rows);
    body.loft(rows,high?40:20,high?32:18,function(u,a,x,y,z,out){setc(out,white);},2.15);
    // A small stable set of irregular marks is sampled identically by both
    // tiers; angle distance wraps so the belly seam cannot split a spot.
    var spots=[];for(var i=0;i<48;i++)spots.push([-.29+.73*rng(),rng()*TAU,.018+.021*rng(),.075+.07*rng(),rng()*TAU]);
    var pigment=kit.baked(c.key('dogface-pigment'),high?512:256,high?256:128,function(u,v,out){
      var x=lerp(.485,-.35,u),a=-PI/2+TAU*v,up=Math.sin(a),side=Math.abs(Math.cos(a)),mask=0;
      mixc(grey,ivory,1-smooth(-.32,.38,up),out);mulc(out,.93+.09*noise2(x*17+phase,Math.cos(a)*9));
      for(var k=0;k<spots.length;k++){var s=spots[k],da=Math.atan2(Math.sin(a-s[1]),Math.cos(a-s[1])),dx=(x-s[0])/s[2],dy=da/s[3],r=Math.sqrt(dx*dx+dy*dy),edge=1+.16*Math.sin(Math.atan2(dy,dx)*3+s[4]);mask=Math.max(mask,1-smooth(edge-.16,edge+.16,r));}
      // Eye patch and snout patch separated by a pale transverse nose bar.
      var eye=Math.exp(-Math.pow((x-.317)/.09,4))*smooth(.35,.82,side)*smooth(-.1,.4,up);
      var muzzle=smooth(.411,.449,x)*(1-smooth(.03,.40,up));
      mixc(out,dark,Math.max(mask*.94,Math.max(eye*.97,muzzle*.93)),out);
    },false,true);
    var micro=kit.baked(c.key('dogface-fine-skin'),high?256:128,high?128:64,function(u,v,out){var n=noise2(u*177+phase,v*123);out[0]=out[1]=out[2]=.43+.15*n+.04*Math.pow(n,5);},false,true,true);
    var bg=kit.geo(body,L);bg.userData.blackspottedPuffer={nominalTotalLengthM:.25,scaleM:L,appearance:'relaxed-grey-brown-example',inflated:false,longSpines:0,spots:spots};
    kit.mesh(bg,kit.std({map:pigment,bumpMap:micro,bumpScale:L*.0006,roughness:.57}), 'rounded-body',c.root);
    [-1,1].forEach(function(side){
      addEye(T,detail,prof,2.15,[.318,.102,.035],side,hex(0xb4a16f),high,.63,!high);
      // Short branched nasal papillae sit ahead of each eye, with a small
      // aperture. The gill opening stays just in front of the pectoral root.
      var z=side*surfZ(prof,2.15,.397,.066);blob(T,detail,.397,.066,z,.015,.012,.008,lin(grey),high?8:5,high?5:3);
      detail.tube([[.397,.07,z],[.404,.084,z+side*.005],[.413,.086,z+side*.007]],function(u){return .004*(1-.45*u);},high?5:3,function(){return lin(grey);});
      detail.tube([[.404,.080,z+side*.005],[.398,.086,z+side*.012]],.0027,high?5:3,function(){return lin(grey);});
      var gill=[];for(var j=0;j<= (high?8:4);j++){var v=j/(high?8:4),gy=.021-.073*v;gill.push([.205-.012*Math.sin(PI*v),gy,side*(surfZ(prof,2.15,.205,gy)+.001)]);}detail.tube(gill,.0023,high?5:3,function(){return lin(dark);});
    });
    blob(T,detail,.486,-.010,0,.012,.012,.032,lin(hex(0x777968)),high?12:6,high?6:3);
    blob(T,detail,.487,-.039,0,.011,.012,.030,lin(hex(0xbcbba6)),high?12:6,high?6:3);
    detail.tube([[.494,-.025,-.027],[.498,-.022,0],[.494,-.025,.027]],.0025,high?5:3,function(){return lin(dark);});
    var dg=kit.geo(detail,L);kit.mesh(dg,kit.std({vertexColors:true,roughness:.33,side:T.DoubleSide},{eye:1}), 'eyes-nostrils-mouth-gills',c.root);
    function fin(name,roots,edges,mode,side){var first=fins.count(),columns=roots.length,across=high?4:2;fins.membrane(roots,edges,across,function(u,v,out){mixc(finColor,ivory,.22+.35*v,out);mulc(out,.82+.18*Math.pow(.5+.5*Math.cos(u*TAU*10),4));});finParts.push({name:name,first:first,count:fins.count()-first,columns:columns,across:across,mode:mode,side:side||0});}
    [-1,1].forEach(function(side){var rs=[],es=[],n=high?12:7;for(var j=0;j<=n;j++){var u=j/n;rs.push([.177-.020*u,.008-.046*u,side*.202]);es.push([.10-.16*u,.025-.105*u,side*(.215+.14*Math.pow(Math.sin(PI*u),.5))]);}fin(side<0?'pectoral-left':'pectoral-right',rs,es,'pectoral',side);});
    [-1,1].forEach(function(side){var rs=[],es=[],n=high?12:7;for(var j=0;j<=n;j++){var u=j/n,x=lerp(-.205,-.315,u),s=prof(x),y=side>0?s[0]:s[1];rs.push([x,y,0]);es.push([x-.065*Math.sin(PI*u),y+side*.09*Math.pow(Math.sin(PI*u),.65),0]);}fin(side>0?'dorsal':'anal',rs,es,'median',side);});
    var rs=[],es=[],n=high?14:8;for(var j=0;j<=n;j++){var v=j/n,yy=(v-.5)*2;rs.push([-.35,yy*.026,0]);es.push([-.50+.020*yy*yy,yy*.093,0]);}fin('rounded-tail',rs,es,'tail');
    var fg=kit.geo(fins,L);fg.userData.blackspottedPuffer={fins:finParts,maximumDisplacementM:.037*L,locomotion:'alternating-pectoral-synchronous-median',rootMotion:false};
    kit.mesh(fg,kit.std({vertexColors:true,roughness:.55,side:T.DoubleSide}), 'sculling-fins',c.root);
    var rest=fg.attributes.position.array.slice();fg.boundingBox.expandByScalar(.037*L);fg.boundingSphere.radius+=.037*L;
    c.anim(function(t,dt,motion){var p=fg.attributes.position.array,power=.78+.22*Math.min(1,effort(motion,L));finParts.forEach(function(f){for(var i=0;i<f.count;i++){var row=i%(f.across+1),u=Math.floor(i/(f.across+1))/(f.columns-1),v=row/f.across,at=(f.first+i)*3,weight=v*v*Math.sin(PI*u),a=t*5.2+phase,dy=0,dz=0;if(f.mode==='pectoral'){var beat=Math.sin(a+(f.side<0?0:PI));dy=.026*L*weight*beat*power;dz=f.side*.021*L*weight*Math.cos(a+(f.side<0?0:PI))*power;}else if(f.mode==='median')dz=.025*L*weight*Math.sin(a)*power;else dz=.012*L*v*v*Math.sin(t*1.6+phase);p[at+1]=rest[at+1]+dy;p[at+2]=rest[at+2]+dz;}});fg.computeVertexNormals();fg.attributes.position.needsUpdate=true;});
  }

  // Aetobatus ocellatus: a 1.5 m disc-width example with an intact whip tail.
  // The ~4.2 m snout-to-tip length is deliberately not called wingspan. The
  // detached projecting head, pointed wings and absence of cephalic lobes
  // distinguish an eagle ray from both the manta and round-disc stingray.
  function buildOcellatedEagleRay(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(421),W=1.5*(.98+.04*rng()),phase=rng()*TAU;
    var discGeo=new Geo(),detail=new Geo(),tail=new Geo(),white=[1,1,1],top=hex(0x52665f),shade=hex(0x344943),cream=hex(0xe2e3d4),ink=hex(0x162824),NZ=high?48:24,NC=high?16:8;
    function lead(f){return .18-.25*Math.pow(f,1.35);}
    function trail(f){return -.29+.22*Math.pow(f,.65);}
    function thick(f,u){return (.066*Math.exp(-Math.pow(f/.23,2))+.012*Math.pow(1-f,1.3))*Math.pow(Math.max(0,Math.sin(PI*u)),.55);}
    for(var side=0;side<2;side++)for(var i=0;i<=NZ;i++)for(var j=0;j<=NC;j++){
      var z=.5*Math.sin((i/NZ*2-1)*PI/2),f=Math.abs(z)*2,u=.5-.5*Math.cos(j/NC*PI),x=lerp(lead(f),trail(f),u),h=thick(f,u),y=(side?-.4:.6)*h+.012*f*f;
      discGeo.v(x,y,z,white,(x+.30)/.50,(z+.5)*.46+(side?.52:.01));
      if(i&&j){var a=side*(NZ+1)*(NC+1)+(i-1)*(NC+1)+j-1,b=a+NC+1;if(side)discGeo.i.push(a,b,a+1,a+1,b,b+1);else discGeo.i.push(a,a+1,b,a+1,b+1,b);}
    }
    var cell=[0,0,0,0,0],spotRecords=[];
    var pigment=kit.baked(c.key('eagle-ray-dorsal-ventral'),high?512:256,high?512:256,function(u,v,out){var x=u*.50-.30,below=v>.5,z=((v-(below?.52:.01))/.46)-.5;if(below){setc(out,cream);var gills=0;for(var g=0;g<5;g++){var center=.116-.035*g,az=Math.abs(z),curve=center+.075*Math.pow(az-.065,2);gills=Math.max(gills,band(x-curve,.0025,.0018)*smooth(.044,.055,az)*(1-smooth(.105,.12,az)));}mixc(out,hex(0x616e63),gills*.85,out);mulc(out,.96+.04*noise2(x*29,z*31));return;}
      mixc(top,shade,.22+.32*noise2(x*11+phase,z*13),out);cells(x*22+phase,z*23,43,cell);var rr=.18+.10*cell[2],edge=1-smooth(rr-.035,rr+.035,cell[0]),center=cell[2]>.78?smooth(.055,.12,cell[0]):1;mixc(out,cream,edge*center*.94,out);mulc(out,.94+.06*noise2(x*117,z*127));
    },false,false);
    var skin=kit.baked(c.key('eagle-ray-denticles'),high?256:128,high?256:128,function(u,v,out){out[0]=out[1]=out[2]=.4+.20*noise2(u*149+phase,v*157);},false,false,true);
    var dg=kit.geo(discGeo,W);dg.userData.ocellatedEagleRay={nominalDiscWidthM:1.5,nominalTotalLengthM:4.2,scaleM:W,spanRows:NZ,chordColumns:NC,gillSlitsPerSide:5,cephalicLobes:0,maximumDisplacementM:.181*W};
    kit.mesh(dg,kit.std({map:pigment,bumpMap:skin,bumpScale:W*.0003,roughness:.61}), 'spotted-disc',c.root);
    // A narrow neck frees the head from the pectoral leading edge; the broad
    // rounded bill projects in front of the eyes and is flattened vertically.
    var headRows=[[.302,.012,-.008,.043],[.283,.023,-.018,.063],[.252,.037,-.019,.059],[.218,.051,-.017,.068],[.18,.045,-.015,.061],[.13,.033,-.016,.069]],hp=profile(headRows);
    detail.loft(headRows,high?20:10,high?20:10,function(u,a,x,y,z,out){mixc(top,cream,1-smooth(-.005,.008,y),out);mulc(out,.92+.08*noise2(x*83,z*71));},2.35);
    [-1,1].forEach(function(s){
      addEye(T,detail,hp,2.35,[.225,.026,.011],s,hex(0xb9ab70),high,.55,!high);
      // Spiracles immediately behind each eye; two small pale rolled lips
      // border a dark recess, integrated into the head rather than floating.
      var zz=s*surfZ(hp,2.35,.194,.023);blob(T,detail,.193,.027,zz,.013,.007,.004,lin(shade),high?8:5,high?5:3);blob(T,detail,.195,.028,zz+s*.002,.009,.004,.002,lin(ink),high?8:5,high?4:3);
      var mouth=[];for(var k=0;k<= (high?8:4);k++){var v=k/(high?8:4),z=s*.032*v;mouth.push([.267+.008*v*v,-.020,z]);}detail.tube(mouth,.0016,high?4:3,function(){return lin(ink);});
      blob(T,detail,.282,-.015,s*.024,.005,.002,.003,lin(shade),high?6:4,high?4:3);
      // Small paired pelvic fins sit aft of the diamond disc, not beside the
      // head. No sex-specific claspers are added to this unsexed specimen.
      detail.membrane([[-.225,-.004,s*.041],[-.265,-.004,s*.032]],[[-.31,-.008,s*.095],[-.32,-.009,s*.052]],high?3:1,function(u,v,out){mixc(shade,cream,.25+.22*v,out);});
    });
    detail.membrane([[-.25,.01,0],[-.30,.006,0]],[[-.27,.070,0],[-.33,.012,0]],high?3:1,function(u,v,out){setc(out,shade);});
    var detailG=kit.geo(detail,W);detailG.userData.ocellatedEagleRay={duckbillSnout:true,lateralEyePair:true,spiraclePair:true,ventralMouth:true,pelvicFinPair:true};
    kit.mesh(detailG,kit.std({vertexColors:true,roughness:.47,side:T.DoubleSide},{eye:1}), 'duckbill-head-pelvic-fins',c.root);
    var pts=[],n=high?40:22;for(var i=0;i<=n;i++){var u=i/n;pts.push([-.265-2.235*u,.004+.010*Math.sin(PI*u),.035*Math.sin(PI*u)*Math.sin(u*PI+phase)]);}
    tail.tube(pts,function(u){return .011*Math.pow(1-u,1.9)+.0007;},high?7:4,function(u,s){return lin(mixc(shade,ink,.25+.6*u,[0,0,0]));});
    // Two short barbs at the proximal tail; the distal tail remains a thin
    // uninterrupted whip, without a caudal fin or a manta's short tail.
    for(var b=0;b<2;b++)tail.spike([-.34-b*.020,.012,0],[-.99,.14,0],.061-b*.008,.0032,lin(hex(0xa5ad97)),lin(cream));
    var tg=kit.geo(tail,W);tg.userData.ocellatedEagleRay={whipTail:true,tailBaseX:-.265*W,nominalTotalLengthM:4.2,maximumDisplacementM:.037*W};
    kit.mesh(tg,kit.std({vertexColors:true,roughness:.59}), 'long-whip-tail',c.root);
    var rest=dg.attributes.position.array.slice(),tailRest=tg.attributes.position.array.slice();dg.boundingBox.expandByVector(new T.Vector3(0,.181*W,.025*W));dg.boundingSphere.radius+=.19*W;tg.boundingBox.expandByScalar(.037*W);tg.boundingSphere.radius+=.037*W;
    c.anim(function(t,dt,motion){var p=dg.attributes.position.array,power=.85+.15*Math.min(1,effort(motion,W)),turn=turning(motion),beat=t*1.55+phase;for(var i=0;i<p.length;i+=3){var z=rest[i+2],f=Math.abs(z)/(.5*W),x=rest[i]/W,chord=clamp((lead(f)-x)/Math.max(.001,lead(f)-trail(f)),0,1),side=z<0?-1:1,weight=Math.pow(f,1.8),dy=.165*W*weight*Math.sin(beat-f*.85-chord*.65+side*turn*.10)*power;p[i+1]=rest[i+1]+dy;p[i+2]=z*(1-.045*weight*Math.pow(Math.sin(beat-f*.85-chord*.65),2));}dg.computeVertexNormals();dg.attributes.position.needsUpdate=true;
      var q=tg.attributes.position.array;for(var k=0;k<q.length;k+=3){var u=clamp((-tailRest[k]/W-.265)/2.235,0,1),w=u*u;q[k+1]=tailRest[k+1]+.010*W*w*Math.sin(t*.60-u*2+phase);q[k+2]=tailRest[k+2]+.032*W*w*Math.sin(t*.48-u*2.5+phase);}tg.computeVertexNormals();tg.attributes.position.needsUpdate=true;
    });
  }


  // Conus textile: a representative 9 cm shell, with a narrow, genuinely open
  // aperture. The fixed shell carries the triangular textile pattern; only
  // the soft sensory appendages move (University of Michigan Conus catalogue).
  function buildTextileCone(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(433), k = 0.97 + 0.06 * rng(), phase = rng() * TAU;
    var shell = new Geo(), foot = new Geo(), feelers = new Geo(), ranges = {}, appendages = [];
    var ivory = hex(0xd7ceb3), ochre = hex(0x9c692e), brown = hex(0x4f341e), cream = hex(0xb3a183), skinBrown = hex(0x55442e), white = [1, 1, 1];
    var rows = [[-0.032, 0.017], [-0.027, 0.022], [-0.020, 0.023], [-0.010, 0.0215], [0.004, 0.018], [0.018, 0.013], [0.032, 0.0075], [0.042, 0.0033]];
    var opening = 1.97, gap = 0.34, nx = high ? 22 : 10, ns = high ? 32 : 18;
    function radius(x) { var j = 1; while (j < rows.length - 1 && x > rows[j][0]) j++; return lerp(rows[j - 1][1], rows[j][1], clamp((x - rows[j - 1][0]) / (rows[j][0] - rows[j - 1][0]), 0, 1)); }
    function centre(x) { return 0.026 + 0.002 * smooth(-0.03, 0.042, x); }
    function point(x, a, inside) { var r = radius(x) * (inside ? 0.96 : 1); return [x, centre(x) + Math.cos(a) * r, Math.sin(a) * r]; }
    function surface(columns, sides, inside, name) {
      var first = shell.count(); ranges[name] = { first: first, columns: columns + 1, sides: sides + 1 };
      for (var i = 0; i <= columns; i++) for (var j = 0; j <= sides; j++) {
        var u = i / columns, a = opening + gap / 2 + j / sides * (TAU - gap), x = lerp(-0.032, 0.042, u), p = point(x, a, inside);
        var color = inside ? lin(mixc(cream, hex(0x5b4a36), 0.25 + 0.5 * Math.sin(j / sides * PI), [0, 0, 0])) : white;
        shell.v(p[0], p[1], p[2], color, inside ? 0.5 : u, inside ? 0.95 : j / sides * 0.8);
      }
      for (i = 0; i < columns; i++) for (j = 0; j < sides; j++) { var a0 = first + i * (sides + 1) + j, a1 = a0 + sides + 1; if (inside) shell.i.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1); else shell.i.push(a0, a0 + 1, a1, a0 + 1, a1 + 1, a1); }
    }
    surface(nx, ns, false, 'outer'); surface(high ? 14 : 6, high ? 20 : 12, true, 'inner');
    // Rounded cream lips join the outside to the recessed lining. No flat
    // ellipse fills the opening: the shadowed interior remains visible.
    [-1, 1].forEach(function (side) {
      var first = shell.count(), a = opening + side * gap / 2;
      for (var i = 0; i <= nx; i++) for (var j = 0; j < 3; j++) { var x = lerp(-0.032, 0.042, i / nx), r = radius(x) * lerp(0.96, 1, j / 2), bump = 0.0001 * Math.sin(j / 2 * PI); shell.v(x, centre(x) + Math.cos(a) * (r + bump), Math.sin(a) * (r + bump), lin(mixc(cream, ivory, 0.32, [0, 0, 0])), 0.5, 0.95); }
      for (i = 0; i < nx; i++) for (j = 0; j < 2; j++) { var a0 = first + i * 3 + j, a1 = a0 + 3; shell.i.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1); }
    });
    // A short stepped spire contrasts with the giant triton's long whorls.
    var first = shell.count(), nr = high ? 20 : 8, nv = high ? 26 : 12;
    ranges.spire = { first: first, rows: nr + 1, sides: nv + 1 };
    for (var i = 0; i <= nr; i++) for (var j = 0; j <= nv; j++) {
      var u = i / nr, a = j / nv * TAU, turn = fract(u * 4.2 - a / TAU), suture = Math.exp(-Math.pow((turn - 0.5) / 0.10, 2));
      var r = (0.0002 + 0.0182 * Math.pow(u, 0.82)) * (1 - 0.065 * suture), x = -0.050 + 0.020 * u;
      shell.v(x, centre(x) + r * Math.cos(a), r * Math.sin(a), white, 0.06 + u * 0.29, j / nv * 0.8);
    }
    for (i = 0; i < nr; i++) for (j = 0; j < nv; j++) { var a0 = first + i * (nv + 1) + j, a1 = a0 + nv + 1; shell.i.push(a0, a0 + 1, a1, a0 + 1, a1 + 1, a1); }
    for (i = 0; i <= nr; i++) shell.seams.push([first + i * (nv + 1), first + i * (nv + 1) + nv]);
    var apex = shell.v(-0.0503, centre(-0.05), 0, lin(ivory), 0.5, 0.95);
    for (j = 0; j < nv; j++) shell.i.push(apex, first + j + 1, first + j);
    // Independently offset and warped pale triangles form islands in a warm
    // reticulate ground. They never share straight edges like a wireframe.
    var islands = [];
    for (var iy = -2; iy < 23; iy++) for (var ix = -2; ix < 29; ix++) { var rand = hash2(ix + c.seed * 13, iy * 7), theta = (hash2(ix + 77, iy + c.seed) - 0.5) * 0.7; islands.push({ x: ix + 0.5 + (rand - 0.5) * 0.58, y: iy + 0.5 + (hash2(ix + c.seed, iy + 31) - 0.5) * 0.58, size: 0.62 + 0.65 * hash2(ix - 11, iy + c.seed * 3), cs: Math.cos(theta), sn: Math.sin(theta), sign: rand > 0.5 ? 1 : -1 }); }
    var pigment = kit.baked(c.key('textile-network-organic-v2'), high ? 768 : 384, high ? 384 : 192, function (u, v, out) {
      if (v > 0.82) { setc(out, white); return; }
      var a = v / 0.8 * TAU, warp = noise2(u * 8 + phase, a * 1.4) - 0.5, xx = u * 25 + 0.8 * warp + 0.5 * Math.sin(a * 2), yy = v / 0.8 * 19 + 0.65 * (noise2(u * 9, a * 2 + phase) - 0.5), bx = Math.floor(xx), by = Math.floor(yy), pale = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var island = islands[(by + dy + 2) * 31 + bx + dx + 2]; if (!island) continue; var px = (xx - island.x) / island.size, py = (yy - island.y) / island.size, tx = px * island.cs - py * island.sn, ty = (px * island.sn + py * island.cs) * island.sign, d = Math.min((0.63 - ty) * 0.69 - Math.abs(tx), ty + 0.42); pale = Math.max(pale, smooth(-0.025, 0.035, d)); }
      var banding = smooth(0.37, 0.75, noise2(u * 7.0 + 0.8 * Math.sin(a), a * 0.75 + phase));
      mixc(brown, ochre, 0.24 + 0.65 * banding, out); mixc(out, ivory, pale * (0.86 + 0.14 * noise2(xx * 2, yy * 2)), out);
      mixc(out, ochre, banding * 0.20, out); mulc(out, 0.95 + 0.05 * noise2(u * 180, a * 24));
    }, false, false);
    var relief = kit.baked(c.key('textile-growth-lines'), high ? 512 : 256, high ? 256 : 128, function (u, v, out) {
      var h = v > 0.82 ? 0.5 : 0.5 + 0.035 * Math.sin(u * 540 + 0.8 * Math.sin(v * 12)) + 0.012 * noise2(u * 230, v * 210); out[0] = out[1] = out[2] = h;
    }, false, false, true);
    var sg = kit.geo(shell, k); sg.userData.textileCone = { ranges: ranges, nominalShellLengthM: 0.09, openAperture: true, apertureAngularWidth: gap };
    kit.mesh(sg, kit.std({ vertexColors: true, map: pigment, bumpMap: relief, bumpScale: 0.00015 * k, roughness: 0.39, side: T.DoubleSide }), 'shell', c.root);
    foot.loft([[0.050, 0.007, 0, 0.004], [0.040, 0.012, 0, 0.012], [0.018, 0.014, 0, 0.016], [-0.008, 0.011, 0, 0.018], [-0.027, 0.008, 0, 0.012], [-0.039, 0.003, 0, 0.002]], high ? 18 : 7, high ? 12 : 8, function (u, a, x, y, z, out) { var patch = smooth(0.48, 0.68, noise2(x * 245 + phase, z * 260)); mixc(cream, skinBrown, patch * smooth(0.002, 0.010, y) * 0.85, out); }, 2.8);
    blob(T, foot, 0.023, 0.014, 0.009, 0.014, 0.005, 0.004, lin(cream), high ? 10 : 6, high ? 6 : 4);
    for (var f = 0; f < foot.count(); f++) { var x = foot.p[f * 3], y = foot.p[f * 3 + 1], z = foot.p[f * 3 + 2], patch = smooth(0.40, 0.58, noise2(x * 230 + phase, z * 265 + y * 120)), skin = lin(mixc(cream, skinBrown, patch * smooth(0.001, 0.009, y) * 0.87, [0, 0, 0])); foot.c[f * 3] = skin[0]; foot.c[f * 3 + 1] = skin[1]; foot.c[f * 3 + 2] = skin[2]; }
    [-1, 1].forEach(function (side) { blob(T, foot, 0.041, 0.0135, side * 0.0065, 0.0010, 0.0008, 0.0008, linHex(0x201d15), high ? 7 : 4, high ? 5 : 3); });
    kit.mesh(kit.geo(foot, k), kit.std({ vertexColors: true, roughness: 0.53, side: T.DoubleSide }), 'foot-head', c.root);
    function appendage(name, pts, radius, color, phaseOffset) { var at = feelers.count(), sides = high ? 6 : 4; feelers.tube(pts, radius, sides, color); appendages.push({ name: name, first: at, count: feelers.count() - at, sides: sides, root: pts[0].slice(), phase: phaseOffset }); }
    [-1, 1].forEach(function (side) { var pts = [], n = high ? 7 : 3; for (var j = 0; j <= n; j++) { var u = j / n; pts.push([0.041 + 0.014 * u, 0.014 + 0.004 * u + 0.002 * Math.sin(PI * u), side * (0.006 + 0.006 * u)]); } appendage('tentacle-' + side, pts, function (u) { return 0.0011 * (1 - 0.80 * u); }, function (u) { return lin(mixc(cream, skinBrown, 0.12 + 0.22 * u, [0, 0, 0])); }, side * 1.8); });
    var pts = [], n = high ? 10 : 5;
    for (i = 0; i <= n; i++) { var u = i / n; pts.push([0.022 + 0.036 * u, 0.014 + 0.013 * Math.sin(u * 1.1), 0.016 + 0.003 * Math.sin(u * PI)]); }
    appendage('siphon', pts, function (u) { return 0.0014 - 0.00065 * u; }, function (u) { var col = mixc(cream, hex(0x302921), smooth(0.37, 0.44, u) * (1 - smooth(0.67, 0.74, u)), [0, 0, 0]); mixc(col, hex(0xa54e37), smooth(0.85, 0.98, u), col); return lin(col); }, 0.5);
    var fg = kit.geo(feelers, k), rest = new Float32Array(fg.attributes.position.array); fg.userData.textileCone = { appendages: appendages };
    fg.boundingBox.expandByScalar(0.0014 * k); fg.boundingSphere.radius += 0.002 * k;
    kit.mesh(fg, kit.std({ vertexColors: true, roughness: 0.44, side: T.DoubleSide }), 'sensory-appendages', c.root);
    c.anim(function (t) { var p = fg.attributes.position.array; appendages.forEach(function (a) { for (var j = a.sides; j < a.count; j++) { var at = (a.first + j) * 3, u = clamp((rest[at] / k - a.root[0]) / (a.name === 'siphon' ? 0.036 : 0.014), 0, 1), w = u * u; p[at + 1] = rest[at + 1] + 0.0008 * k * w * Math.sin(t * 0.42 + phase + a.phase); p[at + 2] = rest[at + 2] + 0.0009 * k * w * Math.sin(t * 0.31 + phase + a.phase); } }); fg.computeVertexNormals(); fg.attributes.position.needsUpdate = true; });
  }

  // Tubastraea coccinea: an illustrative small colony of fixed skeletal cups
  // with yellow feeding tentacles. It has no symbiotic algae (Smithsonian / USGS),
  // so a living colony never receives an invented heat-bleached state.
  function buildOrangeCupCoral(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(437), k = (0.97 + 0.06 * rng()) * lerp(0.22, 1, Math.pow(c.growth, 0.78)), phase = rng() * TAU, dead = c.health === 'dead';
    var skeleton = new Geo(), oral = new Geo(), tentacles = new Geo(), cups = [], strands = [], orange = hex(0xb43c12), rim = hex(0xdf6c21), amber = hex(0xed9b22), yellow = hex(0xffcf54), bone = hex(0xa8a28b), shade = hex(0x6d705c);
    // Four central calices and ten offset outer calices share their stations
    // between quality tiers; no cup changes position during close inspection.
    for (var i = 0; i < 14; i++) {
      var a = i < 4 ? i * TAU / 4 + 0.28 : (i - 4) * TAU / 10 + 0.08, rad = i < 4 ? 0.009 : 0.024 + 0.0015 * (rng() - 0.5);
      var x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.9, r = 0.0047 + rng() * 0.0008, h = (i < 4 ? 0.014 : 0.009) + rng() * 0.009, lean = 0.07 + rng() * 0.24;
      cups.push({ x: x, z: z, radius: r, height: h, base: 0.003 + 0.009 * (1 - Math.pow(rad / 0.032, 2)), leanX: Math.cos(a + 0.4 * Math.sin(i)) * lean, leanZ: Math.sin(a + 0.4 * Math.sin(i)) * lean, phase: rng() * TAU });
    }
    // Rounded coalescing tissue replaces a flat display plate. Its asymmetric
    // humps rise into the cup bases and settle gently back onto the substrate.
    var nr = high ? 4 : 2, ns = high ? 40 : 24;
    skeleton.polar(nr, ns, function (r, a, out) { var lobes = 1 + 0.07 * Math.sin(a * 5 + phase) + 0.035 * Math.sin(a * 9), x = r * 0.033 * Math.cos(a) * lobes, z = r * 0.029 * Math.sin(a) * lobes, y = 0.010 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.82 + 0.18 * Math.sin(a * 4 + r * 8 + phase)), grain = noise2(x * 160 + phase, z * 180); setc(out, lin(dead ? mixc(bone, shade, 0.3 + 0.2 * grain, [0, 0, 0]) : mixc(orange, hex(0x762b18), 0.18 + 0.40 * grain, [0, 0, 0]))); return [x, y, z, a / TAU, r]; });
    cups.forEach(function (cup, index) {
      var sides = high ? 10 : 6, rows = high ? 5 : 3, first = skeleton.count(), hue = 0.15 + 0.20 * rng();
      function centre(y) { return [cup.x + cup.leanX * y, y + cup.base, cup.z + cup.leanZ * y]; }
      for (var i = 0; i <= rows; i++) for (var j = 0; j < sides; j++) { var u = i / rows, a = j / sides * TAU, cp = centre(cup.height * u), r = cup.radius * (0.83 + 0.17 * Math.pow(u, 0.7) + 0.08 * Math.sin(u * PI)) * (1 + 0.055 * Math.cos(a * 5 + cup.phase)), grain = noise2(a * 1.6 + cup.phase, u * 4), col = dead ? mixc(shade, bone, 0.45 + 0.45 * u, [0, 0, 0]) : mixc(orange, rim, hue + u * 0.24, [0, 0, 0]); if (!dead) mixc(col, hex(0x8b2c12), 0.20 + 0.36 * grain * (1 - u * 0.4), col); skeleton.v(cp[0] + Math.cos(a) * r, cp[1] + 0.00025 * Math.sin(a * 3 + cup.phase) * u, cp[2] + Math.sin(a) * r, lin(col), j / sides, u); }
      for (i = 0; i < rows; i++) for (j = 0; j < sides; j++) { var a0 = first + i * sides + j, a1 = first + i * sides + (j + 1) % sides; skeleton.i.push(a0, a0 + sides, a1, a1, a0 + sides, a1 + sides); }
      var top = centre(cup.height), rimFirst = skeleton.count();
      for (j = 0; j < sides; j++) { var a = j / sides * TAU; skeleton.v(top[0] + Math.cos(a) * cup.radius * 0.94, top[1] - 0.0013, top[2] + Math.sin(a) * cup.radius * 0.94, lin(dead ? bone : rim), j / sides, 1); }
      for (j = 0; j < sides; j++) { var outer = first + rows * sides + j, next = first + rows * sides + (j + 1) % sides, inner = rimFirst + j, nextInner = rimFirst + (j + 1) % sides; skeleton.i.push(outer, inner, next, next, inner, nextInner); }
      var discFirst = oral.count();
      // A recessed oral disc and central slit keep every cup readable from
      // above. Fine radial septa are exposed on the dead skeletal illustration.
      for (i = 0; i < 2; i++) for (j = 0; j < sides; j++) { var a = j / sides * TAU, r = cup.radius * (i ? 0.14 : 0.90), y = top[1] - (i ? 0.0023 : 0.0013); var col = dead ? mixc(shade, bone, j % 2 ? 0.35 : 0.88, [0, 0, 0]) : mixc(rim, amber, (i ? 0.18 : 0.70) + 0.12 * Math.sin(j * 2 + cup.phase), [0, 0, 0]); oral.v(top[0] + Math.cos(a) * r, y, top[2] + Math.sin(a) * r * (i ? 0.4 : 1), lin(col), j / sides, i ? 0.15 : 1); }
      for (j = 0; j < sides; j++) { var a0 = discFirst + j, a1 = discFirst + (j + 1) % sides; oral.i.push(a0, a0 + sides, a1, a1, a0 + sides, a1 + sides); }
      var mouth = oral.v(top[0], top[1] - 0.0022, top[2], lin(dead ? shade : hex(0x98401b)), 0, 0);
      for (j = 0; j < sides; j++) oral.i.push(mouth, discFirst + sides + j, discFirst + sides + (j + 1) % sides);
      if (dead) return;
      var count = high ? 24 : 12, segments = high ? 4 : 2;
      for (j = 0; j < count; j++) {
        var a = j / count * TAU + cup.phase * 0.08, length = (0.007 + 0.0020 * Math.sin(j * 2.2 + cup.phase)) * (j % 2 ? 0.82 : 1), pts = [];
        for (var s = 0; s <= segments; s++) { var u = s / segments, radial = cup.radius * (j % 2 ? 0.79 : 0.94) + length * (0.48 * u + 0.40 * u * u), y = top[1] + length * ((0.75 + 0.17 * Math.sin(j + cup.phase)) * u - 0.15 * u * u + 0.15 * Math.sin(PI * u)); pts.push([top[0] + Math.cos(a) * radial + 0.0010 * Math.sin(PI * u + cup.phase + j) * u, y, top[2] + Math.sin(a) * radial + 0.0007 * Math.sin(PI * u + j) * u]); }
        var at = tentacles.count(); tentacles.tube(pts, function (u) { return 0.00044 * (1 - 0.78 * u); }, 3, function (u) { return lin(mixc(amber, yellow, 0.20 + 0.78 * u, [0, 0, 0])); }); strands.push({ first: at, count: tentacles.count() - at, root: pts[0].slice(), segments: segments, phase: cup.phase + j * 0.7, length: length });
      }
    });
    var relief = kit.baked(c.key('cup-corallite-ridges-v2'), 256, 128, function (u, v, out) { var ridges = Math.pow(0.5 + 0.5 * Math.cos(u * TAU * 36 + 0.35 * Math.sin(v * 13)), 3), grain = noise2(u * 35, v * 55); out[0] = out[1] = out[2] = 0.35 + 0.22 * ridges + 0.07 * grain; }, true, false, true);
    var sg = kit.geo(skeleton, k); sg.userData.orangeCupCoral = { cups: cups, nominalColonyWidthM: 0.075, photosynthetic: false, fixedSkeletalCups: true };
    kit.mesh(sg, kit.std({ vertexColors: true, roughness: dead ? 0.88 : 0.66, bumpMap: relief, bumpScale: 0.00042 * k, side: T.DoubleSide }), 'skeletal-cups', c.root);
    kit.mesh(kit.geo(oral, k), kit.std({ vertexColors: true, roughness: dead ? 0.86 : 0.53, bumpMap: relief, bumpScale: 0.00018 * k, side: T.DoubleSide }), 'oral-discs', c.root);
    if (dead) return;
    var tg = kit.geo(tentacles, k), rest = new Float32Array(tg.attributes.position.array), flow = { x: 0, z: 0, pulse: 0 };
    tg.userData.orangeCupCoral = { strands: strands, tentaclesPerCup: high ? 24 : 12 };
    tg.boundingBox.expandByScalar(0.0026 * k); tg.boundingSphere.radius += 0.004 * k;
    kit.mesh(tg, kit.std({ vertexColors: true, roughness: 0.43, side: T.DoubleSide }), 'feeding-tentacles', c.root);
    c.anim(function (t, dt, motion) { currentAt(c.root, motion, t, phase, flow); var p = tg.attributes.position.array; strands.forEach(function (s) { for (var j = 3; j < s.count; j++) { var at = (s.first + j) * 3, u = clamp(Math.floor(j / 3) / s.segments, 0, 1), w = u * u, flutter = 0.00035 * Math.sin(t * 0.57 + s.phase); p[at] = rest[at] + k * w * (0.0016 * flow.x * flow.pulse + flutter); p[at + 2] = rest[at + 2] + k * w * (0.0016 * flow.z * flow.pulse + 0.00030 * Math.sin(t * 0.43 + s.phase)); } }); tg.computeVertexNormals(); tg.attributes.position.needsUpdate = true; });
  }

  // Laticauda colubrina: a representative 1.2 m animal. The tail is flattened
  // vertically, rather than furnished with an eel's continuous dorsal fin.
  function buildBandedSeaKrait(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(443), k = 0.97 + 0.06 * rng(), phase = rng() * TAU;
    var body = new Geo(), head = new Geo(), ns = high ? 12 : 8, nr = high ? 116 : 54, blue = hex(0x829eab), pale = hex(0xd6cca0), ink = hex(0x18232a), yellow = hex(0xdbbd59), ranges = {};
    // A gentle S lies in a tilted plane so its curvature remains legible in
    // the side portrait. Shortening its X projection preserves a 1.2 m
    // centreline length (including the head), rather than stretching the animal.
    function centre(u) { var bend = Math.sin(u * TAU * 1.08) * Math.sin(u * PI); return [0.53 - 1.0213 * u, -0.055 * bend, 0.12 * bend]; }
    function radii(u) { var girth = (0.013 + 0.008 * Math.pow(Math.sin(PI * u), 0.6)) * (1 - smooth(0.93, 1, u)), paddle = smooth(0.77, 0.86, u); return [lerp(girth, 0.034 * Math.pow(Math.max(0, Math.sin((u - 0.77) / 0.23 * PI)), 0.65), paddle), lerp(girth * 0.88, 0.0037 * (1 - smooth(0.94, 1, u)), paddle)]; }
    for (var i = 0; i <= nr; i++) for (var j = 0; j <= ns; j++) {
      var u = i / nr, a = j / ns * TAU, p = centre(u), r = radii(u), before = centre(Math.max(0, u - 0.001)), after = centre(Math.min(1, u + 0.001)), tx = after[0] - before[0], tz = after[2] - before[2], length = Math.sqrt(tx * tx + tz * tz) || 1, nz = -tx / length, nx = tz / length;
      body.v(p[0] + nx * Math.sin(a) * r[1], p[1] + Math.cos(a) * r[0], p[2] + nz * Math.sin(a) * r[1], [1, 1, 1], u, j / ns);
    }
    for (i = 0; i < nr; i++) for (j = 0; j < ns; j++) { var a0 = i * (ns + 1) + j, a1 = a0 + ns + 1; body.i.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1); }
    for (i = 0; i <= nr; i++) body.seams.push([i * (ns + 1), i * (ns + 1) + ns]);
    var pigment = kit.baked(c.key('krait-bands'), high ? 1024 : 512, high ? 192 : 96, function (u, v, out) {
      var a = v * TAU, underside = smooth(0.05, 0.65, -Math.cos(a)), warp = 0.047 * Math.sin(a * 3 + u * 17) + 0.05 * (noise2(u * 13 + phase, Math.cos(a) * 2 + Math.sin(a) * 2) - 0.5), q = fract(u * 33.8 + warp), ring = 1 - smooth(0.20, 0.235, Math.abs(q - 0.5));
      mixc(blue, pale, underside * 0.85, out); mixc(out, ink, ring * (0.95 + 0.05 * noise2(u * 98, Math.cos(a) * 23)), out);
      var scales = Math.pow(0.5 + 0.5 * Math.sin(u * 810 + Math.floor(v * 22) % 2 * PI), 12) * Math.pow(0.5 + 0.5 * Math.cos(v * TAU * 22), 7);
      mulc(out, 0.93 + 0.055 * noise2(u * 290, Math.cos(a) * 44) + 0.035 * scales);
    }, false, true);
    var relief = kit.baked(c.key('krait-scale-relief'), high ? 768 : 384, 128, function (u, v, out) { var row = Math.floor(v * 22), f = fract(u * 128 + (row % 2) * 0.5), edge = Math.pow(Math.sin(PI * f), 1.5) * Math.pow(Math.sin(PI * fract(v * 22)), 0.6); out[0] = out[1] = out[2] = 0.38 + 0.24 * edge; }, false, true, true);
    var bg = kit.geo(body, k); bg.userData.bandedSeaKrait = { rings: nr + 1, sides: ns + 1, nominalTotalLengthM: 1.2, verticalPaddleTail: true, paddleStartsAt: 0.77 };
    kit.mesh(bg, kit.std({ vertexColors: true, map: pigment, bumpMap: relief, bumpScale: 0.00013 * k, roughness: 0.47, side: T.DoubleSide }), 'banded-body-paddle', c.root);
    var start = head.count();
    head.loft([[0.601, 0.004, -0.005, 0.006], [0.590, 0.012, -0.010, 0.014], [0.568, 0.017, -0.012, 0.018], [0.549, 0.014, -0.012, 0.015], [0.521, 0.013, -0.013, 0.012]], high ? 18 : 8, high ? 16 : 8, function (u, a, x, y, z, out) { var lip = Math.max(smooth(0.564, 0.583, x), 1 - smooth(-0.006, 0.001, y)); mixc(ink, yellow, lip * 0.97, out); mulc(out, 0.89 + 0.11 * noise2(x * 880 + phase, z * 870)); }, 2.5);
    ranges.head = { first: start, count: head.count() - start };
    [-1, 1].forEach(function (side) {
      blob(T, head, 0.571, 0.0065, side * 0.0168, 0.0034, 0.0037, 0.0019, linHex(0x050b0c), high ? 10 : 5, high ? 6 : 3);
      blob(T, head, 0.572, 0.0078, side * 0.0181, 0.0008, 0.0009, 0.00045, linHex(0x8bacae), high ? 6 : 4, 3);
      blob(T, head, 0.592, 0.0070, side * 0.0088, 0.0010, 0.0007, 0.0006, lin(ink), high ? 6 : 4, 3);
      var mouth = []; for (var j = 0; j <= (high ? 7 : 3); j++) { var u = j / (high ? 7 : 3); mouth.push([0.597 - 0.042 * u, -0.004 - 0.002 * u, side * (0.008 + 0.0083 * Math.sin(u * PI * 0.72))]); }
      head.tube(mouth, 0.00045, 3, function () { return lin(ink); });
    });
    var hg = kit.geo(head, k); hg.userData.bandedSeaKrait = { ranges: ranges, yellowUpperLip: true };
    kit.mesh(hg, kit.std({ vertexColors: true, roughness: 0.42, side: T.DoubleSide }), 'yellow-lipped-head', c.root);
    [bg, hg].forEach(function (g) {
      g.boundingBox.expandByScalar(0.031 * k); g.boundingSphere.radius += 0.042 * k;
      deform(c, g, function (rest, out, t, motion) {
        var e = effort(motion, 1.2), speed = 0.64 + 0.10 * e;
        for (var j = 0; j < rest.length; j += 3) { var u = clamp((0.53 - rest[j] / k) / 1.0213, 0, 1), w = 0.09 + 0.91 * u, wave = t * speed - u * 8.3 + phase; out[j + 2] = rest[j + 2] + k * (0.014 + 0.006 * e) * w * Math.sin(wave); out[j + 1] = rest[j + 1] + k * 0.003 * w * Math.sin(wave * 0.63); }
      }, true);
    });
  }

  // Dardanus megistos: two pairs of walking legs, a larger left cheliped and
  // black-rimmed white spots. The shell is a borrowed, weathered illustration,
  // not a species-specific shell or an exposed soft abdomen.
  function buildWhiteSpottedHermitCrab(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(449), k = 0.97 + 0.06 * rng(), phase = rng() * TAU;
    var shell = new Geo(), animal = new Geo(), fine = new Geo(), limbs = [], hairs = [], sensory = [], ranges = {}, red = hex(0xa74328), rust = hex(0x702d1d), ivory = hex(0xe8dcc1), dark = hex(0x201a16), white = [1, 1, 1];
    var rows = [[-0.086, 0.0008], [-0.075, 0.008], [-0.061, 0.015], [-0.048, 0.022], [-0.032, 0.028], [-0.012, 0.034], [0.013, 0.028]], nx = high ? 28 : 12, ns = high ? 32 : 16;
    function radius(x) { var j = 1; while (j < rows.length - 1 && x > rows[j][0]) j++; return lerp(rows[j - 1][1], rows[j][1], clamp((x - rows[j - 1][0]) / (rows[j][0] - rows[j - 1][0]), 0, 1)); }
    function shellY(x) { return 0.045 + 0.010 * (1 - smooth(-0.086, 0.013, x)); }
    for (var i = 0; i <= nx; i++) for (var j = 0; j <= ns; j++) {
      var u = i / nx, a = j / ns * TAU, x = lerp(-0.086, 0.013, u), turn = fract(u * 3.8 - a / TAU), seam = Math.exp(-Math.pow((turn - 0.50) / 0.075, 2)), r = radius(x) * (1 - 0.075 * seam), grain = noise2(u * 17 + phase, Math.cos(a) * 5 + Math.sin(a) * 5), streak = smooth(0.42, 0.76, noise2(u * 13 + a * 0.55, a * 1.5 + phase)), color = mixc(hex(0xc2ac86), hex(0x68503b), 0.20 + 0.5 * streak + 0.12 * grain, [0, 0, 0]);
      shell.v(x, shellY(x) + r * Math.cos(a), r * Math.sin(a), lin(color), u, j / ns);
    }
    for (i = 0; i < nx; i++) for (j = 0; j < ns; j++) { var a0 = i * (ns + 1) + j, a1 = a0 + ns + 1; shell.i.push(a0, a0 + 1, a1, a0 + 1, a1 + 1, a1); }
    for (i = 0; i <= nx; i++) shell.seams.push([i * (ns + 1), i * (ns + 1) + ns]);
    var first = shell.count(), innerRows = high ? 5 : 2;
    for (i = 0; i <= innerRows; i++) for (j = 0; j <= ns; j++) { var u = i / innerRows, a = j / ns * TAU, x = 0.013 - 0.040 * u, r = 0.026 - 0.007 * u; shell.v(x, 0.045 + Math.cos(a) * r, Math.sin(a) * r, lin(mixc(hex(0x9d7b55), dark, 0.2 + 0.75 * u, [0, 0, 0])), 0.5, 0.5); }
    for (i = 0; i < innerRows; i++) for (j = 0; j < ns; j++) { var a0 = first + i * (ns + 1) + j, a1 = a0 + ns + 1; shell.i.push(a0, a0 + 1, a1, a0 + 1, a1 + 1, a1); }
    for (j = 0; j < ns; j++) { var outer = nx * (ns + 1) + j, inner = first + j; shell.i.push(outer, inner, outer + 1, outer + 1, inner, inner + 1); }
    var relief = kit.baked(c.key('borrowed-shell-growth'), 256, 128, function (u, v, out) { out[0] = out[1] = out[2] = 0.43 + 0.06 * Math.sin(u * 230 + Math.sin(v * TAU * 3)) + 0.07 * noise2(u * 180, v * 160); }, false, true, true);
    var sg = kit.geo(shell, k); sg.userData.whiteSpottedHermitCrab = { borrowedShell: true, openAperture: true, apertureRadiusM: 0.026, illustrativeShellLengthM: 0.099 };
    kit.mesh(sg, kit.std({ vertexColors: true, bumpMap: relief, bumpScale: 0.00043 * k, roughness: 0.76, side: T.DoubleSide }), 'borrowed-shell', c.root);
    var pigment = kit.baked(c.key('hermit-white-spots'), high ? 512 : 256, high ? 256 : 128, function (u, v, out) {
      if (v > 0.84) { setc(out, white); return; }
      var cell = [0, 0, 0, 0, 0]; cells(u * 8.5 + phase, v / 0.8 * 6.0, c.seed & 7, cell); var size = (0.12 + 0.08 * cell[2]) * (1 - 0.30 * u), spot = 1 - smooth(size - 0.025, size + 0.025, cell[0]), rim = 1 - smooth(size + 0.055, size + 0.10, cell[0]), grain = noise2(u * 85, v * 98 + phase);
      mixc(red, rust, 0.12 + 0.40 * noise2(u * 17, v * 14 + phase), out); mixc(out, dark, rim * 0.86, out); mixc(out, ivory, spot * 0.99, out); mulc(out, 0.92 + 0.08 * grain);
    }, false, false);
    function neutral(geo, first) { for (var j = first; j < geo.count(); j++) { geo.t[j * 2] = 0.5; geo.t[j * 2 + 1] = 0.95; } }
    function spottedTube(name, pts, radii, sides, role, side) {
      var at = animal.count(); animal.tube(pts, radii, sides, function () { return white; });
      for (var j = 0; j < animal.count() - at; j++) { animal.t[(at + j) * 2] = Math.min(1, Math.floor(j / sides) / (pts.length - 1)); animal.t[(at + j) * 2 + 1] = j % sides / sides * 0.8; }
      var range = { name: name, first: at, count: animal.count() - at, root: pts[0].slice(), tip: pts[pts.length - 1].slice(), role: role, side: side }; limbs.push(range);
      var count = high ? 27 : 8;
      for (var n = 0; n < count; n++) { var u = 0.15 + 0.78 * rng(), step = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), f = u * (pts.length - 1) - step, p = pts[step], q = pts[step + 1], a = rng() * TAU, r = typeof radii === 'function' ? radii(u) : radii, x = lerp(p[0], q[0], f), y = lerp(p[1], q[1], f) + Math.cos(a) * r, z = lerp(p[2], q[2], f) + Math.sin(a) * r, len = 0.0017 + 0.0024 * rng(), width = high ? 0.00018 : 0.00028, h0 = fine.count();
        var col = lin(mixc(rust, hex(0xc77a43), 0.3 + 0.55 * rng(), [0, 0, 0]));
        fine.v(x - width, y, z, col); fine.v(x + width, y, z, col); fine.v(x + 0.0006, y + Math.cos(a) * len, z + Math.sin(a) * len, col); fine.i.push(h0, h0 + 1, h0 + 2); hairs.push({ first: h0, count: 3, limb: range });
      }
      return range;
    }
    first = animal.count(); blob(T, animal, 0.022, 0.034, 0, 0.026, 0.0145, 0.0195, white, high ? 16 : 8, high ? 10 : 4);
    // The exposed shield has the same irregular pigmentation as the limbs,
    // with a little grain and relief instead of a featureless glossy oval.
    for (var j = first; j < animal.count(); j++) { var at = j * 3, x = animal.p[at], y = animal.p[at + 1], z = animal.p[at + 2], grain = noise3(x * 430 + phase, y * 490, z * 460); animal.p[at + 1] += 0.00035 * (grain - 0.5); animal.t[j * 2] = 0.10 + (x + 0.004) / 0.052 * 0.77; animal.t[j * 2 + 1] = (z + 0.0195) / 0.039 * 0.8; animal.c[at] = animal.c[at + 1] = animal.c[at + 2] = 0.88 + 0.12 * grain; }
    ranges.carapace = { first: first, count: animal.count() - first };
    [-1, 1].forEach(function (side) {
      for (var pair = 0; pair < 2; pair++) { var x = 0.021 - pair * 0.018, pts = [[x, 0.032, side * 0.014], [x + 0.012, 0.038, side * 0.039], [x + 0.024 - pair * 0.008, 0.023, side * 0.060], [x + 0.019 - pair * 0.023, 0.0025, side * (0.066 + pair * 0.004)]]; spottedTube('walking-leg-' + side + '-' + pair, pts, function (u) { return 0.0062 * (1 - 0.80 * u); }, high ? 7 : 4, 'walking', side); }
      var big = side < 0 ? 1.36 : 1, claw = [[0.035, 0.030, side * 0.014], [0.049, 0.021, side * 0.033], [0.067, 0.020, side * 0.038], [0.080, 0.021, side * 0.034]];
      spottedTube(side < 0 ? 'left-cheliped' : 'right-cheliped', claw, function (u) { return big * (0.0050 + 0.0040 * Math.sin(PI * u)); }, high ? 10 : 5, 'claw', side);
      var palm = [0.077, 0.021, side * 0.034], fixed = [[palm[0], palm[1], palm[2] + side * 0.003], [0.093, 0.019, side * 0.036], [0.101, 0.020, side * 0.029]], moving = [[palm[0] - 0.002, palm[1] + 0.004, palm[2] - side * 0.004], [0.089, 0.027, side * 0.024], [0.098, 0.022, side * 0.027]];
      spottedTube('fixed-finger-' + side, fixed, function (u) { return big * (0.0045 * (1 - 0.90 * u)); }, high ? 7 : 4, 'claw', side); spottedTube('moving-finger-' + side, moving, function (u) { return big * (0.0041 * (1 - 0.90 * u)); }, high ? 7 : 4, 'claw', side);
      first = fine.count(); var stalk = [[0.040, 0.041, side * 0.008], [0.047, 0.051, side * 0.011], [0.050, 0.058, side * 0.014]]; fine.tube(stalk, function (u) { return 0.0025 * (1 - u * 0.25); }, high ? 7 : 4, function (u) { return lin(mixc(red, ivory, (1 - smooth(0.08, 0.24, u)) * 0.72, [0, 0, 0])); });
      blob(T, fine, 0.050, 0.059, side * 0.014, 0.0034, 0.0031, 0.0037, linHex(0x161b16), high ? 10 : 5, high ? 6 : 3); blob(T, fine, 0.051, 0.060, side * 0.0165, 0.0007, 0.0008, 0.0006, linHex(0x8da49b), high ? 6 : 4, 3); ranges['eye-' + side] = { first: first, count: fine.count() - first };
      for (var ant = 0; ant < 2; ant++) { var pts = [], count = high ? 9 : 4, length = ant ? 0.036 : 0.074; for (var j = 0; j <= count; j++) { var u = j / count; pts.push([0.046 + length * u, 0.045 + 0.012 * Math.sin(u * PI * 0.82) - 0.005 * u, side * (0.009 + (ant ? 0.012 : 0.028) * u)]); }
        first = fine.count(); fine.tube(pts, function (u) { return (ant ? 0.0009 : 0.00065) * (1 - 0.8 * u); }, 3, function (u) { return lin(ant ? mixc(red, rust, 0.18 + 0.15 * Math.sin(u * PI * 7), [0, 0, 0]) : mixc(ivory, hex(0xc4c0a8), 0.18 + 0.12 * Math.sin(u * PI * 7), [0, 0, 0])); }); sensory.push({ first: first, count: fine.count() - first, sides: 3, segments: count, side: side, phase: ant * 2.2 });
      }
    });
    var ag = kit.geo(animal, k), fg = kit.geo(fine, k); ag.userData.whiteSpottedHermitCrab = { limbs: limbs, walkingLegCount: 4, largerClaw: 'left', illustrativeSpanM: 0.20, carapace: ranges.carapace }; fg.userData.whiteSpottedHermitCrab = { sensory: sensory, hairCount: hairs.length, ranges: ranges };
    var cuticleRelief = kit.baked(c.key('hermit-cuticle-grain'), 256, 128, function (u, v, out) { var grain = noise2(u * 93 + phase, v * 78), pits = Math.pow(noise2(u * 150, v * 120 + phase), 3); out[0] = out[1] = out[2] = 0.40 + 0.19 * grain - 0.09 * pits; }, false, false, true);
    kit.mesh(ag, kit.std({ vertexColors: true, map: pigment, bumpMap: cuticleRelief, bumpScale: 0.00028 * k, roughness: 0.65, side: T.DoubleSide }), 'spotted-legs-claws', c.root); kit.mesh(fg, kit.std({ vertexColors: true, roughness: 0.55, side: T.DoubleSide }), 'eyes-antennae-setae', c.root);
    var restA = new Float32Array(ag.attributes.position.array), restF = new Float32Array(fg.attributes.position.array);
    [ag, fg].forEach(function (g) { g.boundingBox.expandByScalar(0.0035 * k); g.boundingSphere.radius += 0.005 * k; });
    function moveLimb(rest, out, first, count, limb, t) { for (var j = first; j < first + count; j++) { var at = j * 3, dx = (rest[at] / k - limb.root[0]), dz = (rest[at + 2] / k - limb.root[2]), full = Math.hypot(limb.tip[0] - limb.root[0], limb.tip[2] - limb.root[2]) || 1, u = clamp(Math.hypot(dx, dz) / full, 0, 1), w = limb.role === 'walking' ? Math.pow(Math.sin(PI * u), 2) : u * u; out[at + 1] = rest[at + 1] + k * 0.00085 * w * Math.sin(t * 0.51 + phase + limb.side * 1.1); } }
    c.anim(function (t) {
      var a = ag.attributes.position.array, f = fg.attributes.position.array; limbs.forEach(function (limb) { moveLimb(restA, a, limb.first, limb.count, limb, t); }); hairs.forEach(function (hair) { moveLimb(restF, f, hair.first, hair.count, hair.limb, t); });
      sensory.forEach(function (s) { for (var j = s.sides; j < s.count; j++) { var at = (s.first + j) * 3, u = clamp(Math.floor(j / s.sides) / s.segments, 0, 1), w = u * u; f[at + 1] = restF[at + 1] + k * 0.0015 * w * Math.sin(t * 0.77 + phase + s.phase + s.side); f[at + 2] = restF[at + 2] + k * 0.0021 * w * Math.sin(t * 0.57 + phase + s.phase + s.side); } });
      ag.attributes.position.needsUpdate = true; fg.attributes.position.needsUpdate = true; ag.computeVertexNormals(); fg.computeVertexNormals();
    });
  }

  // Heniochus acuminatus: a representative 15 cm total-length animal. The
  // broad white body, two oblique bands, yellow tail and white dorsal banner
  // are intentionally distinct from the existing Zanclus model.
  function buildLongfinBannerfish(c) {
    var T = c.T, kit = c.kit, high = c.high, rng = c.rng(457), k = .98 + .04 * rng(), phase = rng() * TAU;
    var body = new Geo(), fins = new Geo(), detail = new Geo(), parts = [], dorsalRays = [], white = hex(0xf0ede0), ink = hex(0x182321), gold = hex(0xe3b82f), pearl = hex(0xf4e9b8);
    var rows = [[.060,.003,-.003,.0018],[.050,.016,-.012,.005],[.035,.034,-.029,.009],[.010,.045,-.043,.012],[-.020,.038,-.040,.011],[-.042,.018,-.017,.006],[-.050,.007,-.007,.003]], prof = profile(rows), sample = [0,0,0];
    function pigment(x,y,out) { var front = band(x - (.026 + .30*y), .0135, .0018), rear = band(x - (-.027 + .32*y), .012, .0018); mixc(white, ink, Math.max(front, rear), out); }
    body.loft(rows, high ? 28 : 12, high ? 24 : 12, function (u,a,x,y,z,out) { setc(out, [1,1,1]); }, 2.25);
    var map = kit.baked(c.key('bannerfish-oblique-bands'), high ? 512 : 256, high ? 256 : 128, function (u,v,out) {
      var x = lerp(.060,-.050,u), a = -PI/2 + v*TAU; prof(x,sample); var y = (sample[0]+sample[1])*.5 + sp(Math.sin(a),2/2.25)*(sample[0]-sample[1])*.5;
      pigment(x,y,out); var scales = Math.pow(Math.sin(PI*fract(u*57 + (Math.floor(v*36)%2)*.5)),6) * Math.pow(Math.sin(PI*fract(v*36)),3);
      mulc(out,.94+.035*noise2(u*211+phase,v*143)+.025*scales);
    },false,true);
    var relief = kit.baked(c.key('bannerfish-fine-scales'),high?512:256,128,function(u,v,out){var f=fract(u*57+(Math.floor(v*36)%2)*.5);out[0]=out[1]=out[2]=.36+.24*Math.pow(Math.sin(PI*f),.8)*Math.pow(Math.sin(PI*fract(v*36)),.6);},false,true,true);
    function membrane(name,roots,edges,width,paint) { var first=fins.count(); fins.membrane(roots,edges,width,paint); parts.push({name:name,first:first,count:fins.count()-first,rows:roots.length,widthSegments:width}); }
    var roots=[],edges=[],n=high?24:10;
    // Eleven low spiny rays lead into the long fourth dorsal ray. The white
    // filament is a tapering membrane, not a floating disconnected ribbon.
    for(var j=0;j<=n;j++){var u=j/n,x=lerp(.035,-.043,u);prof(x,sample);roots.push([x,sample[0]*.98,0]);var h=.014*Math.pow(Math.sin(PI*u),.6);edges.push([x-.009*Math.sin(PI*u),sample[0]+h,0]);}
    membrane('dorsal-base',roots,edges,high?3:1,function(u,v,out){var x=lerp(.035,-.043,u)-.009*Math.sin(PI*u)*v;prof(lerp(.035,-.043,u),sample);pigment(x,sample[0]+.014*v,out);mixc(out,gold,smooth(.62,.78,u),out);});
    roots=[];edges=[];n=high?25:12;
    for(j=0;j<=n;j++){var u=j/n,x=.027-.083*u*u,y=.044+.084*Math.sin(u*PI*.50),w=(.008*(1-u)+.00045)*(1-.45*u);roots.push([x-w*.42,y,0]);edges.push([x+w*.58,y+.003*(1-u),.0015*Math.sin(PI*u)]);}
    membrane('white-dorsal-banner',roots,edges,high?2:1,function(u,v,out){mixc(white,pearl,.10*(1-u),out);});
    roots=[];edges=[];n=high?20:8;
    for(j=0;j<=n;j++){var u=j/n,x=lerp(.018,-.044,u);prof(x,sample);roots.push([x,sample[1]*.97,0]);edges.push([x-.010*Math.sin(PI*u),sample[1]-.025*Math.pow(Math.sin(PI*u),.75),0]);}
    membrane('anal-fin',roots,edges,high?3:1,function(u,v,out){var x=lerp(.018,-.044,u)-.010*Math.sin(PI*u)*v;prof(lerp(.018,-.044,u),sample);pigment(x,sample[1]-.025*v,out);});
    roots=[];edges=[];n=high?18:8;
    for(j=0;j<=n;j++){var u=j/n,w=u*2-1;roots.push([-.049,.006*w,0]);edges.push([-.085-.005*Math.pow(Math.abs(w),1.3),.024*w,0]);}
    membrane('yellow-caudal-fin',roots,edges,high?4:2,function(u,v,out){mixc(gold,pearl,smooth(.81,1,v)*.36,out);mulc(out,.92+.08*Math.pow(Math.sin(u*PI*14),2));});
    [-1,1].forEach(function(side){
      var rr=[],ee=[],n=high?12:5;for(var j=0;j<=n;j++){var u=j/n;rr.push([.023,-.007+.006*u,side*.010]);ee.push([.003-.007*Math.sin(PI*u),-.013+.023*u,side*(.011+.019*Math.sin(PI*u))]);}
      membrane('pectoral-'+side,rr,ee,high?3:1,function(u,v,out){mixc(pearl,gold,.28+.32*(1-v),out);});
      rr=[[.017,-.036,side*.003],[.010,-.041,side*.003],[-.001,-.044,side*.002]];ee=[[.010,-.040,side*.004],[-.008,-.068,side*.007],[-.004,-.049,side*.003]];membrane('pelvic-'+side,rr,ee,high?2:1,function(u,v,out){setc(out,ink);});
      addEye(T,detail,prof,2.25,[.041,.013,.0042],side,hex(0xafa98c),high,.50,false);
      var mouth=[];for(var j=0;j<= (high?7:3);j++){var u=j/(high?7:3);mouth.push([.060-.007*u,-.0012-.0015*Math.sin(PI*u),side*(.0018+.0016*u)]);}detail.tube(mouth,.00028,3,function(){return lin(ink);});
      var gill=[];for(j=0;j<= (high?12:5);j++){var u=j/(high?12:5),x=.026-.005*Math.sin(PI*u),y=.018-.043*u;gill.push([x,y,side*(surfZ(prof,2.25,x,y)+.0003)]);}detail.tube(gill,.00027,3,function(){return lin(hex(0x62655a));});
    });
    for(var ray=0;ray<11;ray++){var at=detail.count(),pts=[],x=.038-ray*.004,steps=ray===3?(high?18:8):2;prof(x,sample);for(j=0;j<=steps;j++){var u=j/steps;pts.push(ray===3?[.027-.083*u*u,.044+.084*Math.sin(u*PI*.5),.0002]:[x-.007*u,sample[0]+.010*u,.0002]);}detail.tube(pts,function(u){return .00018*(1-.70*u);},3,function(u){var col=[0,0,0];if(ray===3)setc(col,white);else pigment(x-.007*u,sample[0]+.010*u,col);return lin(col);});dorsalRays.push({index:ray,first:at,count:detail.count()-at,extended:ray===3});}
    var bg=kit.geo(body,k),fg=kit.geo(fins,k),dg=kit.geo(detail,k);
    bg.userData.longfinBannerfish={nominalTotalLengthM:.15,bodyBands:2,projectingSnout:true,scale:k};fg.userData.longfinBannerfish={parts:parts,dorsalSpines:11,whiteBanner:true,yellowTail:true};dg.userData.longfinBannerfish={dorsalRays:dorsalRays};
    kit.mesh(bg,kit.std({vertexColors:true,map:map,bumpMap:relief,bumpScale:.00012*k,roughness:.53,side:T.DoubleSide},{sheen:sheenOf(T,0x8da99a,0xe9d8a0,.10)}),'banded-compressed-body',c.root);
    kit.mesh(fg,kit.std({vertexColors:true,roughness:.56,side:T.DoubleSide},{rays:true,finRelief:.12}),'banner-and-fins',c.root);
    kit.mesh(dg,kit.std({vertexColors:true,roughness:.42,side:T.DoubleSide},{eye:true,iris:hex(0xafa98c)}),'eyes-mouth-operculum',c.root);
    [bg,fg,dg].forEach(function(g){g.boundingBox.expandByScalar(.009*k);g.boundingSphere.radius+=.012*k;deform(c,g,function(rest,out,t,motion){var e=effort(motion,.15),a=(.0019+.0011*e)*k;for(var j=0;j<rest.length;j+=3){var x=rest[j]/k,w=clamp((.025-x)/.115,0,1);out[j+2]=rest[j+2]+a*w*w*Math.sin(t*(2.2+.55*e)+phase-x*30);}},true);});
    c.anim(function(t,dt,motion){var out=fg.attributes.position.array,e=effort(motion,.15);parts.forEach(function(p){for(var j=0;j<p.count;j++){var at=(p.first+j)*3,u=Math.floor(j/(p.widthSegments+1))/(p.rows-1),v=(j%(p.widthSegments+1))/p.widthSegments;if(p.name==='white-dorsal-banner')out[at+2]+=.0045*k*u*u*Math.sin(t*.94+phase-u*5.4);else if(p.name.indexOf('pectoral')===0)out[at+2]+=.003*k*v*Math.sin(t*(2.5+.5*e)+phase+u*2);}});fg.attributes.position.needsUpdate=true;fg.computeVertexNormals();var ray=dorsalRays[3],outD=dg.attributes.position.array;for(var j=0;j<ray.count;j++){var u=Math.min(1,Math.floor(j/3)/(high?18:8));outD[(ray.first+j)*3+2]+=.0045*k*u*u*Math.sin(t*.94+phase-u*5.4);}dg.attributes.position.needsUpdate=true;dg.computeVertexNormals();});
  }

  // Sepioteuthis lessoniana species complex: a calm bronze/pearl example.
  // The representative .40 m posed length includes a .25 m mantle, head and
  // partly extended feeding tentacles. Colour is variable, not diagnostic.
  function buildBigfinReefSquid(c) {
    var T=c.T,kit=c.kit,high=c.high,rng=c.rng(463),k=.98+.04*rng(),phase=rng()*TAU,body=new Geo(),fins=new Geo(),armsGeo=new Geo(),ranges={},finParts=[],arms=[],cups=[];
    var pearl=hex(0xbaab8e),bronze=hex(0x88674a),rust=hex(0x825238),pale=hex(0xcec9b6),ink=hex(0x101c23),white=[1,1,1];
    var rows=[[.080,.025,-.025,.032],[.054,.037,-.036,.044],[.005,.041,-.038,.049],[-.060,.034,-.029,.042],[-.120,.022,-.017,.029],[-.158,.010,-.007,.014],[-.170,.002,-.001,.003]],prof=profile(rows),sample=[0,0,0];
    function baseSkin(u,a,x,y,z,out){mixc(pearl,bronze,smooth(-.020,.026,y)*.54,out);mixc(out,pale,(1-smooth(-.029,-.004,y))*.50,out);}
    var first=body.count();body.loft(rows,high?32:10,high?24:10,baseSkin,2);ranges.mantle={first:first,count:body.count()-first};
    first=body.count();blob(T,body,.103,.000,0,.035,.023,.030,function(x,y,z){return lin(mixc(pearl,bronze,.22+.30*smooth(-.015,.02,y)+.10*noise3(x*175+phase,y*180,z*180),[0,0,0]));},high?14:7,high?8:4);ranges.head={first:first,count:body.count()-first};
    // Chromatophore pigment lies over pearl skin. Fine flecks and softer
    // dorsal mottling produce a calm illustrative state without emission.
    var pigment=kit.baked(c.key('squid-chromatophores'),high?512:256,high?256:128,function(u,v,out){setc(out,white);if(u>.98&&v>.98)return;var a=-PI/2+v*TAU,dorsal=.30+.70*smooth(-.6,.35,Math.sin(a)),grain=noise2(u*187+phase,v*113),cells0=[0,0,0,0,0];cells(u*47+phase,v*24,c.seed&7,cells0);var spot=1-smooth(.055,.13,cells0[0]),patch=smooth(.48,.78,fbm2(u*13+phase,v*9,3)),bands=Math.pow(.5+.5*Math.cos(u*TAU*5+Math.sin(a)*.8),4)*.15;mixc(out,hex(0x7d472c),dorsal*(.31*patch+bands+.48*spot),out);mulc(out,.965+.035*grain);},false,true);
    var relief=kit.baked(c.key('squid-skin-microtexture'),high?256:128,128,function(u,v,out){out[0]=out[1]=out[2]=.45+.10*noise2(u*139+phase,v*101);},false,true,true);
    function neutral(g,at){for(var q=at;q<g.count();q++){g.t[q*2]=.995;g.t[q*2+1]=.995;}}
    // Each lateral eye has a smooth silvery iris surrounding a large circular
    // pupil. The lid and head overlap, avoiding separate ball-like eyes.
    var eyes=[];
    [-1,1].forEach(function(side){var at=body.count();blob(T,body,.108,.005,side*.023,.018,.017,.010,lin(mixc(bronze,pearl,.18,[0,0,0])),high?10:6,high?6:3);var e0=body.count(),ns=high?24:10;
      body.v(.111,.005,side*.0343,lin(ink),.995,.995);
      var radii=[.67,.74,.89,1];for(var r=0;r<radii.length;r++)for(var j=0;j<ns;j++){var a=j/ns*TAU,rr=radii[r],color=r===0?ink:mixc(hex(0x617570),hex(0xbac0ae),.35+.22*Math.cos(a*9)*Math.sin(a*7),[0,0,0]);body.v(.111+Math.cos(a)*.0147*rr,.005+Math.sin(a)*.0155*rr,side*(.029+.0052*Math.sqrt(Math.max(.08,1-rr*rr))),lin(color),.995,.995);}
      for(j=0;j<ns;j++)body.i.push(e0,e0+1+j,e0+1+(j+1)%ns);for(r=0;r<radii.length-1;r++)for(j=0;j<ns;j++){var a0=e0+1+r*ns+j,b0=e0+1+r*ns+(j+1)%ns;body.i.push(a0,b0,a0+ns,b0,b0+ns,a0+ns);}
      var lid=[];for(var j=0;j<= (high?10:5);j++){var a=PI*(.08+.84*j/(high?10:5));lid.push([.111+.016*Math.cos(a),.005+.0166*Math.sin(a),side*(.0285+.0038*Math.sin(a))]);}body.tube(lid,.0010,3,function(u){return lin(mixc(bronze,pearl,.16+.16*Math.sin(u*PI),[0,0,0]));});eyes.push({side:side,first:at,count:body.count()-at,pupilShape:'round',seatedDome:true});neutral(body,at);
    });
    // Recessed funnel opens beneath the collar, including a dark lumen.
    first=body.count();var fn=high?10:5,fr=[[.074,-.025,.011],[.091,-.031,.011],[.111,-.033,.010],[.124,-.030,.008],[.126,-.029,.007],[.125,-.029,.005],[.116,-.031,.004]];
    for(var r=0;r<fr.length;r++)for(var j=0;j<fn;j++){var a=j/fn*TAU,q=fr[r];body.v(q[0],q[1]+Math.cos(a)*q[2],Math.sin(a)*q[2],lin(r<5?pearl:r===5?bronze:ink),.995,.995);if(r){var a0=first+(r-1)*fn+j,b0=first+(r-1)*fn+(j+1)%fn;body.i.push(a0,b0,a0+fn,b0,b0+fn,a0+fn);}}
    var tip=body.v(.113,-.031,0,lin(ink),.995,.995);for(j=0;j<fn;j++)body.i.push(first+6*fn+j,first+6*fn+(j+1)%fn,tip);ranges.funnel={first:first,count:body.count()-first};
    // The fins span almost the whole mantle and broaden behind its midpoint.
    // They have no fish-like rays: the continuous edges carry a gentle wave.
    [-1,1].forEach(function(side){var at=fins.count(),n=high?44:18,nw=high?4:1;for(var q=0;q<=n;q++)for(var j=0;j<=nw;j++){var u=q/n,v=j/nw,x=lerp(-.168,.075,u);prof(x,sample);var breadth=.048*Math.pow(Math.sin(PI*u),.70)*(1.80-1.65*u),angle=phase-u*PI*3.4+side*.35,w=Math.sin(PI*u)*v*v,y=(sample[0]+sample[1])*.5+.0038*w*Math.sin(angle),z=side*(sample[2]*.98+breadth*v),color=mixc(pearl,bronze,.12+.48*(1-v),[0,0,0]);mixc(color,pale,smooth(.74,1,v)*.22,color);fins.v(x,y,z,lin(color),1-u,.50+.34*v);if(q&&j){var a0=at+(q-1)*(nw+1)+j-1,b0=a0+nw+1;fins.i.push(a0,b0,a0+1,a0+1,b0,b0+1);}}finParts.push({side:side,first:at,count:fins.count()-at,longitudinalSegments:n,widthSegments:nw});});
    function point(index,u,tentacle){var a=index/8*TAU+PI/8,reach=.068+.009*Math.sin(index*1.7),curl=smooth(.72,1,u);if(tentacle){var side=Math.sin(a)>0?1:-1;return[.126+.108*u-.008*smooth(.78,1,u)+.002*Math.sin(PI*u),.020*Math.cos(a)-.009*Math.sin(PI*u)+.005*u*u,.021*Math.sin(a)+side*(.012*Math.sin(PI*u*.8)+.004*u)];}var radial=.020*(1+.40*u)+.009*Math.sin(PI*u);return[.126+reach*(u-.12*curl)+.003*Math.sin(PI*u)*Math.sin(index),radial*Math.cos(a)+.004*Math.sin(PI*u)*Math.sin(index+phase)+.005*u*u*Math.sin(index+2),radial*Math.sin(a)+.006*Math.sin(PI*u)*Math.cos(index+phase)];}
    function armRadius(u,tentacle){return tentacle?.0034*(1-.35*u):.0073*Math.pow(1-u,1.08)+.0006;}
    // Eight arms, two sucker rows per arm, and two longer club-ended feeding
    // tentacles. Tentacles occupy the gaps beside the ventral arm pair.
    for(var i=0;i<10;i++){var tentacle=i>=8,index=tentacle?(i===8?2.8:4.2):i,segments=high?(tentacle?14:12):(tentacle?6:5),sides=high?6:4,pts=[],at=armsGeo.count();for(j=0;j<=segments;j++)pts.push(point(index,j/segments*(tentacle?.84:1),tentacle));armsGeo.tube(pts,function(u){return armRadius(u,tentacle);},sides,function(u,s){return lin(mixc(bronze,pale,.24+.32*(.5+.5*Math.cos(s*TAU))+.12*u,[0,0,0]));});
      for(j=0;j<armsGeo.count()-at;j++){armsGeo.t[(at+j)*2]=Math.min(1,Math.floor(j/sides)/segments);armsGeo.t[(at+j)*2+1]=(j%sides)/sides;}
      var arm={index:i,tentacle:tentacle,first:at,count:armsGeo.count()-at,root:pts[0],tip:pts[pts.length-1],segments:segments,sides:sides};arms.push(arm);
      if(tentacle){var start=armsGeo.count(),cn=high?10:5,cs=high?8:4;for(var q=0;q<=cn;q++){var u=.79+.24*q/cn,P=point(index,u,true),A=point(index,u-.004,true),B=point(index,u+.004,true),tangent=new T.Vector3(B[0]-A[0],B[1]-A[1],B[2]-A[2]).normalize(),normal=new T.Vector3(0,-P[1],-P[2]).normalize();normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();var across=new T.Vector3().crossVectors(tangent,normal).normalize(),w=Math.pow(Math.max(0,Math.sin(PI*(.08+.92*q/cn))),.65),rr=.001+.004*w;for(var j=0;j<cs;j++){var a=j/cs*TAU,ca=Math.cos(a),sa=Math.sin(a),ww=rr*ca,hh=(.00065+.0016*w)*sa;armsGeo.v(P[0]+across.x*ww+normal.x*hh,P[1]+across.y*ww+normal.y*hh,P[2]+across.z*ww+normal.z*hh,lin(mixc(bronze,pale,.32+.23*Math.max(0,sa),[0,0,0])),q/cn,j/cs);if(q){var a0=start+(q-1)*cs+j,b0=start+(q-1)*cs+(j+1)%cs;armsGeo.i.push(a0,b0,a0+cs,b0,b0+cs,a0+cs);}}}var P=point(index,1.032,true),end=armsGeo.v(P[0],P[1],P[2],lin(pearl),.995,.995);for(j=0;j<cs;j++)armsGeo.i.push(start+cn*cs+j,start+cn*cs+(j+1)%cs,end);arm.club={first:start,count:armsGeo.count()-start,flattened:true};arm.tip=P;arm.count=armsGeo.count()-at;}
      var stations=high?(tentacle?4:7):(tentacle?2:3),cupSides=high?5:3,rowCount=tentacle?4:2;
      for(var st=0;st<stations;st++){var u=tentacle?.86+.12*st/(stations-1):.16+.70*st/(stations-1),P=point(index,u,tentacle),A=point(index,Math.max(0,u-.006),tentacle),B=point(index,Math.min(1,u+.006),tentacle),tangent=new T.Vector3(B[0]-A[0],B[1]-A[1],B[2]-A[2]).normalize(),normal=new T.Vector3(0,-P[1],-P[2]).normalize();normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();var across=new T.Vector3().crossVectors(tangent,normal).normalize(),rad=tentacle?.0032:armRadius(u,false);
        for(var row=0;row<rowCount;row++){var offset=(row-(rowCount-1)*.5)*(tentacle?.42:.72),rr=rad*(tentacle?.19:.29),center=new T.Vector3(P[0],P[1],P[2]).addScaledVector(normal,tentacle?(.00065+.0016*Math.pow(Math.max(0,Math.sin(PI*(.08+.92*(u-.79)/.24))),.65))*.98:rad*.92).addScaledVector(across,rad*offset),firstCup=armsGeo.count();for(j=0;j<cupSides;j++){var a=j/cupSides*TAU;armsGeo.v(center.x+tangent.x*Math.cos(a)*rr+across.x*Math.sin(a)*rr,center.y+tangent.y*Math.cos(a)*rr+across.y*Math.sin(a)*rr,center.z+tangent.z*Math.cos(a)*rr+across.z*Math.sin(a)*rr,lin(pale),.995,.995);}var cupCenter=armsGeo.v(center.x-normal.x*rr*.24,center.y-normal.y*rr*.24,center.z-normal.z*rr*.24,lin(bronze),.995,.995);for(j=0;j<cupSides;j++)armsGeo.i.push(firstCup+j,firstCup+(j+1)%cupSides,cupCenter);cups.push({arm:i,row:row,station:st,first:firstCup,count:cupSides+1});}
      }arm.count=armsGeo.count()-at;
    }
    var bg=kit.geo(body,k),fg=kit.geo(fins,k),ag=kit.geo(armsGeo,k);
    bg.userData.bigfinReefSquid={ranges:ranges,eyes:eyes,nominalPosedLengthM:.40,nominalMantleLengthM:.25,scale:k,appearance:'illustrative-bronze-pearl'};
    fg.userData.bigfinReefSquid={fins:finParts,mantleCoverage:.972,rootMotion:false};ag.userData.bigfinReefSquid={arms:arms,armCount:8,feedingTentacleCount:2,armSuckerRows:2,clubSuckerRows:4,cups:cups};
    kit.mesh(bg,kit.std({vertexColors:true,map:pigment,bumpMap:relief,bumpScale:.00009*k,roughness:.39,side:T.DoubleSide},{sheen:sheenOf(T,0x759994,0xcaa878,.18)}),'mantle-head-eyes-funnel',c.root);
    kit.mesh(fg,kit.std({vertexColors:true,map:pigment,roughness:.43,side:T.DoubleSide},{sheen:sheenOf(T,0x9dbcb6,0xd7bd96,.17)}),'broad-oval-fins',c.root);
    kit.mesh(ag,kit.std({vertexColors:true,map:pigment,bumpMap:relief,bumpScale:.00006*k,roughness:.44,side:T.DoubleSide}),'eight-arms-two-feeding-tentacles',c.root);
    var restB=bg.attributes.position.array.slice(),restF=fg.attributes.position.array.slice(),restA=ag.attributes.position.array.slice();[bg,fg,ag].forEach(function(g){g.boundingBox.expandByScalar(.009*k);g.boundingSphere.radius+=.013*k;});
    c.anim(function(t,dt,motion){var out=bg.attributes.position.array,e=effort(motion,.40),rate=1.10+.23*e,pump=.007*Math.sin(t*1.32+phase);for(var j=ranges.mantle.first;j<ranges.mantle.first+ranges.mantle.count;j++){var at=j*3,x=restB[at]/k,u=clamp((x+.170)/.25,0,1),w=Math.sin(PI*u)*pump;prof(x,sample);var yc=(sample[0]+sample[1])*.5*k;out[at+1]=restB[at+1]+(restB[at+1]-yc)*w;out[at+2]=restB[at+2]*(1+w);}bg.attributes.position.needsUpdate=true;bg.computeVertexNormals();
      out=fg.attributes.position.array;finParts.forEach(function(f){for(var q=0;q<=f.longitudinalSegments;q++)for(var j=0;j<=f.widthSegments;j++){var u=q/f.longitudinalSegments,v=j/f.widthSegments,at=(f.first+q*(f.widthSegments+1)+j)*3,a=phase-u*PI*3.4+f.side*.35,x=restF[at]/k;prof(x,sample);out[at+1]=restF[at+1]+.0038*k*Math.sin(PI*u)*v*v*(Math.sin(a+t*rate)-Math.sin(a));out[at+2]=restF[at+2]+f.side*sample[2]*.98*k*Math.sin(PI*clamp((x+.170)/.25,0,1))*pump;}});fg.attributes.position.needsUpdate=true;fg.computeVertexNormals();
      out=ag.attributes.position.array;arms.forEach(function(arm){for(var j=arm.first+arm.sides;j<arm.first+arm.count;j++){var at=j*3,u=clamp((restA[at]/k-arm.root[0])/(arm.tip[0]-arm.root[0]),0,1),w=u*u;out[at+1]=restA[at+1]+.0024*k*w*Math.sin(t*.84+phase+arm.index*.54);out[at+2]=restA[at+2]+.0020*k*w*Math.sin(t*.63+phase+arm.index*.57);}});ag.attributes.position.needsUpdate=true;ag.computeVertexNormals();
    });
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
    copperband_butterflyfish: I('fish', 'pair', 0.2, [1, 25], null, 'centre'),
    spotted_garden_eel: I('fish', 'crevice', 0.4, [5, 50], null, 'base'),
    banded_pipefish: I('fish', 'hover', 0.17, [5, 56], null, 'centre'),
    yellow_longnose_butterflyfish: I('fish', 'pair', 0.18, [2, 145], null, 'centre'),
    pajama_cardinalfish: I('fish', 'hover', 0.07, [1, 14], null, 'centre'),
    banggai_cardinalfish: I('fish', 'hover', 0.075, [0, 16], null, 'centre'),
    giant_triton: I('invertebrate', 'bottom', 0.3, [1, 40], null, 'base'),
    blue_velvet_headshield_slug: I('invertebrate', 'bottom', 0.05, [5, 30], null, 'base'),
    regal_angelfish: I('fish', 'solitary', 0.2, [1, 80], null, 'centre')
    ,mandarin_dragonet: I('fish', 'bottom', 0.06, [1, 18], null, 'centre')
    ,harlequin_shrimp: I('invertebrate', 'bottom', 0.045, [1, 20], null, 'base')
    ,spotted_seahorse: I('fish', 'bottom', 0.12, [0, 55], null, 'base')
    ,bennetts_feather_star: I('invertebrate', 'bottom', 0.32, [0, 50], null, 'base')
    ,peacock_mantis_shrimp: I('invertebrate', 'bottom', 0.14, [0, 100], null, 'base')
    ,ribbon_eel: I('fish', 'crevice', 1.0, [1, 57], null, 'base')
    ,leaf_scorpionfish: I('fish', 'bottom', 0.10, [1, 135], null, 'base')
    ,longnose_hawkfish: I('fish', 'bottom', 0.12, [10, 100], null, 'base')
    ,chocolate_chip_sea_star: I('invertebrate', 'bottom', 0.28, [0, 30], null, 'base')
    ,porcelain_anemone_crab: I('invertebrate', 'bottom', 0.04, [1, 10], null, 'base')
    ,varicose_phyllidia: I('invertebrate', 'bottom', 0.06, [4, 25], null, 'base')
    ,broadclub_cuttlefish: I('invertebrate', 'hover', 0.30, [5, 30], null, 'centre')
    ,blackspotted_puffer: I('fish', 'hover', 0.25, [3, 25], null, 'centre')
    ,ocellated_eagle_ray: I('fish', 'solitary', 4.2, [0, 60], null, 'centre')
    ,textile_cone: I('invertebrate', 'bottom', 0.09, [0, 50], null, 'base')
    ,orange_cup_coral: I('coral', 'sessile', 0.075, [1, 60], null, 'base')
    ,banded_sea_krait: I('reptile', 'solitary', 1.2, [0, 60], null, 'centre')
    ,white_spotted_hermit_crab: I('invertebrate', 'bottom', 0.20, [0, 50], null, 'base')
    ,longfin_bannerfish: I('fish', 'pair', 0.15, [2, 75], null, 'centre')
    ,bigfin_reef_squid: I('invertebrate', 'hover', 0.40, [0, 100], null, 'centre')
  };
  var BUILDERS = {
    longfin_bannerfish: buildLongfinBannerfish,
    bigfin_reef_squid: buildBigfinReefSquid,
    banded_sea_krait: buildBandedSeaKrait,
    white_spotted_hermit_crab: buildWhiteSpottedHermitCrab,
    textile_cone: buildTextileCone,
    orange_cup_coral: buildOrangeCupCoral,
    blackspotted_puffer: buildBlackspottedPuffer,
    ocellated_eagle_ray: buildOcellatedEagleRay,
    broadclub_cuttlefish: buildBroadclubCuttlefish,
    varicose_phyllidia: buildVaricosePhyllidia,
    porcelain_anemone_crab: buildPorcelainAnemoneCrab,
    chocolate_chip_sea_star: buildChocolateChipSeaStar,
    longnose_hawkfish: buildLongnoseHawkfish,
    leaf_scorpionfish: buildLeafScorpionfish,
    ribbon_eel: buildRibbonEel,
    peacock_mantis_shrimp: buildPeacockMantisShrimp,
    bennetts_feather_star: buildBennettsFeatherStar,
    spotted_seahorse: buildSpottedSeahorse,
    harlequin_shrimp: buildHarlequinShrimp,
    blue_velvet_headshield_slug: buildBlueVelvetSlug,
    giant_triton: buildGiantTriton,
    magnificent_anemone: buildAnemone, giant_clam: buildClam, long_spined_urchin: buildUrchin, nudibranch: buildNudibranch, cleaner_shrimp: buildShrimp,
    christmas_tree_worm: buildTreeWorms, day_octopus: buildOctopus, sea_cucumber: buildCucumber, sea_fan: buildSeaFan, barrel_sponge: buildBarrel, soft_coral: buildSoftCoral,
    crown_of_thorns: function (c) {
      // Colour morphs: purple-red, grey-mauve with red spine tips, and orange-red.
      var morphs = [[0x8a3a52, 0xb0607a, 0x3a1420, 0xc890a0, 0xe8403a], [0x7a5a6a, 0x9a7a8a, 0x2a1a22, 0xd0b0b8, 0xd83a30], [0xa04a32, 0xc87050, 0x3a1808, 0xe0a080, 0xf06a30]], m = morphs[Math.floor(c.rng(83)() * 3)];
      buildStar(c, { salt: 85, arms: function (r) { return 14 + Math.floor(r() * 5); }, R: 0.175, disc: 0.075, thick: 0.03, armR: 0.02, taper: 0.7, curl: 0.012, colors: [m[0], m[1], m[2]], dots: false, spines: [m[3], m[4]], spinesPerArm: [5, 14], spineLen: 0.04, spineR: 0.0045, rough: 0.7, lift: 0.01 });
    },
    blue_sea_star: function (c) { buildStar(c, { salt: 87, arms: function () { return 5; }, R: 0.15, disc: 0.03, thick: 0.016, armR: 0.017, taper: 0.3, curl: 0.0, colors: [0x2f6fe6, 0x4a8af2, 0x1a3a9a], dots: true, rough: 0.72, lift: 0.012 }); },
    brain_coral: buildBrain, staghorn_coral: buildStaghorn, table_coral: buildTable, mushroom_coral: buildMushroom, boulder_coral: buildBoulder, cauliflower_coral: buildCauliflower, foliose_coral: buildFoliose,
    reef_star: buildReefStar, reef_ball: buildReefBall, coral_tree_nursery: buildNursery, spotted_garden_eel: buildGardenEel, banded_pipefish: buildBandedPipefish
  };
  var IDS = Object.keys(INFO);

  // The health states each model can show (info().healthStates). Corals bleach
  // and die. The anemone and the giant clam farm algae in their tissue and bleach
  // in heatwaves too, as does the living Porites head the Christmas tree worms
  // live in. The soft coral (Dendronephthya) and the sea fan (Annella) have no
  // algae partners, and heat bleaching is not documented for the barrel sponge.
  var BLEACHES = { magnificent_anemone: true, giant_clam: true, christmas_tree_worm: true };
  // Tubastraea coccinea has no algal symbionts (Smithsonian / USGS).
  function healthStates(id) { return id === 'orange_cup_coral' ? ['healthy', 'dead'] : INFO[id].group === 'coral' ? ['healthy', 'bleached', 'dead'] : BLEACHES[id] ? ['healthy', 'bleached'] : ['healthy']; }
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
    longfin_bannerfish: V(0.25, 0.30, 2.7, 0.24),
    bigfin_reef_squid: V(1.2, 1.4, 2.7, 0),
    banded_sea_krait: V(0.45, 0.8, 2.7, 0),
    white_spotted_hermit_crab: V(1.8, 1.5, -2.7, 0.20),
    textile_cone: V(0.8, 1.1, 2.7, 0.24),
    orange_cup_coral: V(1.3, 1.8, 2.7, 0.36),
    blackspotted_puffer: V(1.0, 0.45, 2.7, 0),
    ocellated_eagle_ray: V(5.5, 1.6, 1.0, 0),
    broadclub_cuttlefish: V(2.1, 1.4, 2.7, 0.02),
    varicose_phyllidia: V(0.9, 2.0, 2.7, 0.06),
    porcelain_anemone_crab: V(2.7, 2.1, 2.2, 0.04),
    chocolate_chip_sea_star: V(0.7, 2.4, 2.7, 0.28),
    longnose_hawkfish: V(0.8, 0.35, 2.7, 0.12),
    leaf_scorpionfish: V(0.8, 0.35, 2.7, 0.10),
    ribbon_eel: V(1.4, 0.6, 2.7, 0.4),
    peacock_mantis_shrimp: V(1.05, 1.15, 2.7, 0.15),
    bennetts_feather_star: V(0.8, 1.15, 2.7, 0.42),
    spotted_seahorse: V(0.4, 0.2, 2.7, 0.5),
    harlequin_shrimp: V(1.6, 1.2, 2.7, 0.25),
    mandarin_dragonet: V(0.6, 0.58, 2.7, 0.035),
    regal_angelfish: V(0.18, 0.22, 2.7, 0),
    blue_velvet_headshield_slug: V(0.3, 2.0, 2.7, 0.12),
    banggai_cardinalfish: V(0.14, 0.18, 2.7, 0.12),
    giant_triton: V(1.1, 1.0, 2.7, 0.4),
    yellow_longnose_butterflyfish: V(0.12, 0.18, 2.7, 0),
    pajama_cardinalfish: V(0.15, 0.18, 2.7, 0.08),
    banded_pipefish: V(0.12, 0.24, 2.7, 0),
    spotted_garden_eel: V(0.65, 0.12, 2.7, 0.45),
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
