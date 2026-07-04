/**
 * AlloFlow Prim3D — Gemini-designed primitive-assembly 3D objects (p3d/1)
 *
 * Tier C of docs/memory_palace_3d_design.md: "a way for users to generate
 * characters or objects" that is fully in-Canvas — no model downloads, no GPU
 * generators. The SEMANTICS-NOT-GEOMETRY pattern from the ConceptGraph engine,
 * applied to sculpture: Gemini emits a JSON *recipe* of primitive shapes
 * (box / sphere / cylinder / cone / torus with sizes, positions, colors);
 * deterministic JS validates it and assembles a three.js group. The recipe is
 * small, cacheable in the saved resource, remixable by students, and — because
 * it's just data — a scale factor turns the same design into a desk trinket or
 * a building-sized landmark (Aaron's "world made of very large versions").
 *
 * PURE, unit-tested seams: normalizeRecipe / parseRecipe / buildRecipePrompt.
 * buildObject(THREE, recipe) needs a THREE instance but no GL context.
 *
 * RUNTIME: plain JS, no imports; registers window.AlloModules.Prim3D.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.Prim3D) {
    console.log('[Prim3D] Already loaded, skipping');
    return;
  }

  var VERSION = 'p3d/1';
  var SHAPES = { box: 1, sphere: 1, cylinder: 1, cone: 1, torus: 1 };
  var MAX_PARTS = 24;
  var FALLBACK_COLOR = '#818cf8';

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function clamp(v, lo, hi, d) { return isNum(v) ? Math.max(lo, Math.min(hi, v)) : d; }
  function color(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim())) ? v.trim().toLowerCase() : FALLBACK_COLOR; }
  function color2(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim())) ? v.trim().toLowerCase() : null; }   // null when absent/invalid

  // ── normalizeRecipe — PURE: untrusted JSON → safe, renderable recipe ──
  // Unknown shapes are dropped; sizes/positions clamped to a sane sculpting
  // box; part count capped. Returns null when nothing renderable remains.
  function normalizeRecipe(input) {
    if (!input || typeof input !== 'object') return null;
    var rawParts = Array.isArray(input.parts) ? input.parts : [];
    var parts = [];
    for (var i = 0; i < rawParts.length && parts.length < MAX_PARTS; i++) {
      var p = rawParts[i];
      if (!p || typeof p !== 'object') continue;
      var shape = (typeof p.shape === 'string') ? p.shape.toLowerCase().trim() : '';
      if (!SHAPES[shape]) continue;
      var size = Array.isArray(p.size) ? p.size : [];
      var pos = Array.isArray(p.position) ? p.position : [];
      var rot = Array.isArray(p.rotation) ? p.rotation : [];
      parts.push({
        shape: shape,
        // size semantics per shape (documented in the prompt):
        //   box: [w, h, d] · sphere: [radius] · cylinder/cone: [radius, height] · torus: [radius, tube]
        size: [clamp(size[0], 0.02, 4, 0.4), clamp(size[1], 0.02, 4, 0.4), clamp(size[2], 0.02, 4, 0.4)],
        position: [clamp(pos[0], -4, 4, 0), clamp(pos[1], -4, 8, 0.5), clamp(pos[2], -4, 4, 0)],
        rotation: [clamp(rot[0], -360, 360, 0), clamp(rot[1], -360, 360, 0), clamp(rot[2], -360, 360, 0)],
        color: color(p.color)
      });
    }
    if (!parts.length) return null;
    return {
      version: VERSION,
      name: (input.name != null) ? String(input.name).slice(0, 80) : '',
      parts: parts,
      // Optional whole-object transforms (manual refinement — never rewrites parts):
      scale: clamp(input.scale, 0.25, 5, 1),
      rotY: isNum(input.rotY) ? (((input.rotY % 360) + 360) % 360) : 0,
      tint: color2(input.tint)   // null = no recolor
    };
  }

  // ── buildRecipePrompt — PURE: the ask that keeps Gemini in the sandbox ──
  function buildRecipePrompt(subject, opts) {
    opts = opts || {};
    return [
      'Design a simple, charming 3D object built ONLY from these primitive shapes: box, sphere, cylinder, cone, torus.',
      'Subject: "' + String(subject || 'a friendly mascot') + '"',
      (opts.style ? 'Style: ' + opts.style : 'Style: cheerful low-poly toy, bold colors'),
      'Return ONLY JSON of this exact shape:',
      '{ "name": "...", "parts": [ { "shape": "box", "size": [w, h, d], "position": [x, y, z], "rotation": [rx, ry, rz], "color": "#rrggbb" } ] }',
      'Rules:',
      '- 4 to ' + MAX_PARTS + ' parts. y is UP. The object STANDS ON the ground plane y=0 (no part below y=0).',
      '- Overall height about 1.0 unit; position is each part\'s CENTER; rotation in degrees.',
      '- size semantics: box=[width,height,depth]; sphere=[radius]; cylinder=[radius,height]; cone=[radius,height]; torus=[ring radius,tube radius].',
      '- Distinct hex colors per logical body part; school-appropriate, friendly; no text, no letters.'
    ].join('\n');
  }

  function _stripToJson(text) {
    var s = String(text || '').trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return s;
  }

  // ── parseRecipe — PURE: model text → normalized recipe (null on junk) ──
  function parseRecipe(text) {
    var parsed;
    try { parsed = JSON.parse(_stripToJson(text)); } catch (e) { return null; }
    return normalizeRecipe(parsed);
  }

  // ── buildObject — recipe → THREE.Group (no GL context required) ──
  // opts.scale multiplies the whole assembly (1 recipe unit ≈ opts.unit world
  // units, default 1) — the same recipe is a trinket at 70 and a landmark at 900.
  function buildObject(THREE, recipe, opts) {
    opts = opts || {};
    // Always normalize — even a version-stamped recipe may carry malformed parts
    // (missing/short size|position|rotation arrays) that would throw at .set() or
    // produce NaN transforms. normalizeRecipe is idempotent on already-clean input.
    var r = normalizeRecipe(recipe);
    if (!THREE || !r) return null;
    var unit = isNum(opts.unit) ? opts.unit : 1;
    var group = new THREE.Group();
    r.parts.forEach(function (p) {
      var geo = null;
      try {
        if (p.shape === 'box') geo = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
        else if (p.shape === 'sphere') geo = new THREE.SphereGeometry(p.size[0], 18, 18);
        else if (p.shape === 'cylinder') geo = new THREE.CylinderGeometry(p.size[0], p.size[0], p.size[1], 20);
        else if (p.shape === 'cone') geo = new THREE.ConeGeometry(p.size[0], p.size[1], 20);
        else if (p.shape === 'torus') geo = new THREE.TorusGeometry(p.size[0], p.size[1], 12, 28);
      } catch (e) { geo = null; }
      if (!geo) return;
      var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(p.color), roughness: 0.55, metalness: 0.08 }));
      mesh.position.set(p.position[0], p.position[1], p.position[2]);
      mesh.rotation.set(p.rotation[0] * Math.PI / 180, p.rotation[1] * Math.PI / 180, p.rotation[2] * Math.PI / 180);
      group.add(mesh);
    });
    if (!group.children.length) return null;
    // Whole-object refinement transforms (from manual tweaks): scale, spin, recolor.
    group.scale.setScalar(unit * (isNum(r.scale) ? r.scale : 1));
    if (isNum(r.rotY) && r.rotY) group.rotation.y = r.rotY * Math.PI / 180;
    if (r.tint) {
      try {
        var tc = new THREE.Color(r.tint);
        group.traverse(function (o) {
          var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
          mats.forEach(function (mx) { if (mx && mx.color && mx.color.multiply) { try { mx.color.multiply(tc); } catch (e) {} } });
        });
      } catch (e) {}
    }
    group.userData.prim3dName = r.name || '';
    return group;
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.Prim3D = {
    version: VERSION,
    SHAPES: Object.keys(SHAPES),
    MAX_PARTS: MAX_PARTS,
    normalizeRecipe: normalizeRecipe,
    parseRecipe: parseRecipe,
    buildRecipePrompt: buildRecipePrompt,
    buildObject: buildObject
  };
  console.log('[Prim3D] Registered (p3d/1 — Gemini primitive-assembly sculptures)');
})();
