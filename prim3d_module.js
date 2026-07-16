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

  // ── buildRefinePrompt — PURE: ask the AI to EDIT an existing recipe ──
  // Canonical home for recipe-editing (moved here from memory_palace so the
  // sculpting primitive is self-contained for reuse). Parse the reply with parseRecipe.
  function buildRefinePrompt(recipe, instruction, opts) {
    opts = opts || {};
    var json = '';
    try { json = JSON.stringify(recipe); } catch (e) { json = '{}'; }
    return [
      'Here is a small 3D object built from primitive shapes, as JSON:',
      json,
      'The student wants this change: "' + String(instruction || '') + '"',
      'Modify the JSON to make that change while keeping it a recognizable, charming low-poly object.',
      'Use ONLY box, sphere, cylinder, cone, torus. Keep the SAME JSON shape:',
      '{ "name": "...", "parts": [ { "shape": "box", "size": [w,h,d], "position": [x,y,z], "rotation": [rx,ry,rz], "color": "#rrggbb" } ] }',
      'Rules: 4-' + MAX_PARTS + ' parts; y is UP; the object STANDS ON y=0; sizes/positions in the same small range as the input; school-appropriate; no text.',
      'Return ONLY the updated JSON.'
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

  // ── Voice-directed sculpting (accessible, hands-free making) ──
  // The student SPEAKS; an LLM routes the natural-language intent into ONE
  // structured action over the sculpting tools. This is the agentic "distributed
  // embodiment" seam: a learner who can't sculpt by hand directs the AI to enact
  // the form, by voice. buildSculptCommandPrompt is the ask; parseSculptCommand
  // is the PURE, testable validator of the reply.
  var SCULPT_ACTIONS = { create: 1, refine: 1, bigger: 1, smaller: 1, rotate: 1, recolor: 1, remove: 1, none: 1 };
  function buildSculptCommandPrompt(transcript, hasSculpture) {
    return [
      'You route the spoken command of a student who is sculpting a 3D object entirely BY VOICE (hands-free).',
      'The student just said: "' + String(transcript || '') + '"',
      hasSculpture ? 'There IS already a sculpture on screen.' : 'There is NO sculpture yet.',
      'Choose the single best action and return ONLY JSON of this exact shape:',
      '{ "action": "create|refine|bigger|smaller|rotate|recolor|remove|none", "subject": "...", "instruction": "..." }',
      'Rules:',
      '- "create": they name a NEW object to make ("make a rocket", "I want a friendly cat") — put the object in "subject".',
      '- "refine": change the CURRENT sculpture\'s parts ("add a tail", "make the nose pointier") — put the change in "instruction" (needs an existing sculpture).',
      '- "bigger" / "smaller" / "rotate" / "recolor": those simple whole-object tweaks ("bigger", "turn it", "new color").',
      '- "remove": clear it. "none": not a sculpting command.',
      '- With NO sculpture yet, a shape word almost always means "create".',
      'Return ONLY the JSON.'
    ].join('\n');
  }
  // parseSculptCommand — PURE: model text → { action, subject, instruction } | null.
  function parseSculptCommand(text) {
    var parsed;
    try { parsed = JSON.parse(_stripToJson(text)); } catch (e) { return null; }
    if (!parsed || typeof parsed !== 'object') return null;
    var action = (typeof parsed.action === 'string') ? parsed.action.toLowerCase().trim() : '';
    if (!SCULPT_ACTIONS[action]) return null;
    return {
      action: action,
      subject: (parsed.subject != null) ? String(parsed.subject).slice(0, 120) : '',
      instruction: (parsed.instruction != null) ? String(parsed.instruction).slice(0, 200) : ''
    };
  }

  // ── Voice-directed dimensional stretch (HandWaver point→line→plane→solid) ──
  // The most embodiment-resonant target: a learner who can't gesture instead
  // SPEAKS the dimensional moves ("add a point", "stretch it up", "sweep it
  // across", "pull it out") and the agent enacts the point→segment→rect→prism
  // build. Same PURE/testable seam shape as the sculpt router.
  var STRETCH_ACTIONS = { point: 1, stretch: 1, undo: 1, reset: 1, none: 1 };
  var STRETCH_AXES = { x: 1, y: 1, z: 1 };
  function buildStretchCommandPrompt(transcript, selType) {
    return [
      'A student is building a shape BY VOICE by stretching lower dimensions into higher ones: point → segment(line) → rectangle(plane) → prism(solid).',
      'The student just said: "' + String(transcript || '') + '"',
      'Currently selected object: ' + (selType ? String(selType) : 'none') + '.',
      'Return ONLY JSON: { "action": "point|stretch|undo|reset|none", "axis": "x|y|z" }',
      'Rules:',
      '- "point": start a new point ("add a point", "start", "give me a dot").',
      '- "stretch": extend the selected object into the next dimension along an axis. Put the axis in "axis": x = left/right/across/width, y = up/down/tall/height, z = forward/back/out/depth. ("stretch it up" → y; "sweep it sideways" → x; "pull it out" → z).',
      '- "undo": undo the last step. "reset": clear everything. "none": not a build command.',
      'Return ONLY the JSON.'
    ].join('\n');
  }
  // parseStretchCommand — PURE: model text → { action, axis } | null.
  function parseStretchCommand(text) {
    var parsed;
    try { parsed = JSON.parse(_stripToJson(text)); } catch (e) { return null; }
    if (!parsed || typeof parsed !== 'object') return null;
    var action = (typeof parsed.action === 'string') ? parsed.action.toLowerCase().trim() : '';
    if (!STRETCH_ACTIONS[action]) return null;
    var axis = (typeof parsed.axis === 'string') ? parsed.axis.toLowerCase().trim() : '';
    return { action: action, axis: STRETCH_AXES[axis] ? axis : 'y' };   // default up
  }

  // ── PRESETS — curated, hand-authored decoration recipes ──
  // A zero-AI decoration shelf: the same recipe format Gemini emits, but built
  // in. Placing one costs nothing (no credits, no network, works offline) and
  // flows through the exact same normalize → buildObject path as generated
  // sculptures, so refine/tweak/persist all keep working. Labels here are
  // English fallbacks; hosts localize via their own t() keyed on the id.
  var PRESETS = [
    { id: 'trophy', emoji: '🏆', label: 'Trophy', parts: [
      { shape: 'box', size: [0.5, 0.1, 0.5], position: [0, 0.05, 0], color: '#334155' },
      { shape: 'box', size: [0.34, 0.08, 0.34], position: [0, 0.14, 0], color: '#475569' },
      { shape: 'cylinder', size: [0.06, 0.3], position: [0, 0.33, 0], color: '#fbbf24' },
      { shape: 'cone', size: [0.32, 0.42], position: [0, 0.69, 0], rotation: [180, 0, 0], color: '#fbbf24' },
      { shape: 'torus', size: [0.3, 0.045], position: [0, 0.9, 0], rotation: [90, 0, 0], color: '#f59e0b' },
      { shape: 'torus', size: [0.12, 0.03], position: [0.38, 0.66, 0], color: '#f59e0b' },
      { shape: 'torus', size: [0.12, 0.03], position: [-0.38, 0.66, 0], color: '#f59e0b' }
    ] },
    { id: 'plant', emoji: '🪴', label: 'Potted plant', parts: [
      { shape: 'cylinder', size: [0.24, 0.3], position: [0, 0.15, 0], color: '#b45309' },
      { shape: 'torus', size: [0.24, 0.035], position: [0, 0.3, 0], rotation: [90, 0, 0], color: '#92400e' },
      { shape: 'cylinder', size: [0.045, 0.35], position: [0, 0.48, 0], color: '#8b5a2b' },
      { shape: 'sphere', size: [0.3], position: [0, 0.85, 0], color: '#16a34a' },
      { shape: 'sphere', size: [0.22], position: [0.22, 0.72, 0.06], color: '#22c55e' },
      { shape: 'sphere', size: [0.22], position: [-0.2, 0.75, -0.08], color: '#15803d' }
    ] },
    { id: 'lamp', emoji: '💡', label: 'Lamp', parts: [
      { shape: 'cylinder', size: [0.2, 0.06], position: [0, 0.03, 0], color: '#334155' },
      { shape: 'cylinder', size: [0.035, 0.75], position: [0, 0.44, 0], color: '#64748b' },
      { shape: 'sphere', size: [0.12], position: [0, 0.8, 0], color: '#fef3c7' },
      { shape: 'cone', size: [0.3, 0.32], position: [0, 0.98, 0], color: '#fbbf24' }
    ] },
    { id: 'books', emoji: '📚', label: 'Book stack', parts: [
      { shape: 'box', size: [0.62, 0.12, 0.44], position: [0, 0.06, 0], rotation: [0, 8, 0], color: '#dc2626' },
      { shape: 'box', size: [0.58, 0.12, 0.4], position: [0.02, 0.18, 0], rotation: [0, -10, 0], color: '#2563eb' },
      { shape: 'box', size: [0.55, 0.11, 0.38], position: [-0.02, 0.29, 0], rotation: [0, 4, 0], color: '#16a34a' },
      { shape: 'box', size: [0.5, 0.1, 0.36], position: [0, 0.4, 0], rotation: [0, -6, 0], color: '#f59e0b' },
      { shape: 'box', size: [0.05, 0.02, 0.2], position: [0.18, 0.46, 0.05], color: '#f472b6' }
    ] },
    { id: 'rocket', emoji: '🚀', label: 'Rocket', parts: [
      { shape: 'cylinder', size: [0.22, 0.72], position: [0, 0.56, 0], color: '#e2e8f0' },
      { shape: 'cone', size: [0.22, 0.32], position: [0, 1.08, 0], color: '#ef4444' },
      { shape: 'torus', size: [0.09, 0.03], position: [0, 0.68, 0.21], color: '#ef4444' },
      { shape: 'sphere', size: [0.08], position: [0, 0.68, 0.18], color: '#7dd3fc' },
      { shape: 'box', size: [0.3, 0.26, 0.045], position: [0.26, 0.16, 0], rotation: [0, 0, -18], color: '#ef4444' },
      { shape: 'box', size: [0.3, 0.26, 0.045], position: [-0.26, 0.16, 0], rotation: [0, 0, 18], color: '#ef4444' },
      { shape: 'box', size: [0.045, 0.26, 0.3], position: [0, 0.16, -0.26], rotation: [18, 0, 0], color: '#ef4444' },
      { shape: 'cone', size: [0.14, 0.22], position: [0, 0.11, 0], rotation: [180, 0, 0], color: '#f97316' }
    ] },
    { id: 'robot', emoji: '🤖', label: 'Robot', parts: [
      { shape: 'box', size: [0.12, 0.22, 0.14], position: [0.12, 0.11, 0], color: '#475569' },
      { shape: 'box', size: [0.12, 0.22, 0.14], position: [-0.12, 0.11, 0], color: '#475569' },
      { shape: 'box', size: [0.46, 0.42, 0.3], position: [0, 0.43, 0], color: '#64748b' },
      { shape: 'sphere', size: [0.05], position: [0, 0.46, 0.16], color: '#22d3ee' },
      { shape: 'box', size: [0.09, 0.34, 0.12], position: [0.31, 0.45, 0], color: '#475569' },
      { shape: 'box', size: [0.09, 0.34, 0.12], position: [-0.31, 0.45, 0], color: '#475569' },
      { shape: 'box', size: [0.32, 0.26, 0.26], position: [0, 0.79, 0], color: '#94a3b8' },
      { shape: 'sphere', size: [0.045], position: [0.08, 0.81, 0.14], color: '#22d3ee' },
      { shape: 'sphere', size: [0.045], position: [-0.08, 0.81, 0.14], color: '#22d3ee' },
      { shape: 'cylinder', size: [0.02, 0.14], position: [0, 0.98, 0], color: '#64748b' },
      { shape: 'sphere', size: [0.04], position: [0, 1.07, 0], color: '#ef4444' }
    ] },
    { id: 'castle', emoji: '🏰', label: 'Castle', parts: [
      { shape: 'box', size: [0.5, 0.5, 0.42], position: [0, 0.25, 0], color: '#94a3b8' },
      { shape: 'box', size: [0.16, 0.22, 0.05], position: [0, 0.11, 0.21], color: '#713f12' },
      { shape: 'cylinder', size: [0.13, 0.62], position: [0.3, 0.31, 0.18], color: '#cbd5e1' },
      { shape: 'cylinder', size: [0.13, 0.62], position: [-0.3, 0.31, 0.18], color: '#cbd5e1' },
      { shape: 'cone', size: [0.16, 0.22], position: [0.3, 0.73, 0.18], color: '#dc2626' },
      { shape: 'cone', size: [0.16, 0.22], position: [-0.3, 0.73, 0.18], color: '#dc2626' },
      { shape: 'cylinder', size: [0.015, 0.2], position: [0, 0.6, 0], color: '#64748b' },
      { shape: 'box', size: [0.12, 0.07, 0.02], position: [0.07, 0.66, 0], color: '#ef4444' }
    ] },
    { id: 'telescope', emoji: '🔭', label: 'Telescope', parts: [
      { shape: 'cylinder', size: [0.03, 0.6], position: [0.18, 0.28, 0], rotation: [0, 0, -20], color: '#475569' },
      { shape: 'cylinder', size: [0.03, 0.6], position: [-0.09, 0.28, 0.16], rotation: [20, 0, 10], color: '#475569' },
      { shape: 'cylinder', size: [0.03, 0.6], position: [-0.09, 0.28, -0.16], rotation: [-20, 0, 10], color: '#475569' },
      { shape: 'sphere', size: [0.07], position: [0, 0.58, 0], color: '#334155' },
      { shape: 'cylinder', size: [0.09, 0.6], position: [0, 0.72, 0.05], rotation: [55, 0, 0], color: '#1d4ed8' },
      { shape: 'cylinder', size: [0.045, 0.12], position: [0, 0.5, -0.22], rotation: [55, 0, 0], color: '#f59e0b' }
    ] },
    { id: 'chest', emoji: '🪙', label: 'Treasure chest', parts: [
      { shape: 'box', size: [0.56, 0.3, 0.38], position: [0, 0.15, 0], color: '#92400e' },
      { shape: 'box', size: [0.56, 0.14, 0.38], position: [0, 0.36, -0.08], rotation: [-25, 0, 0], color: '#7c2d12' },
      { shape: 'box', size: [0.06, 0.32, 0.4], position: [0.16, 0.15, 0], color: '#f59e0b' },
      { shape: 'box', size: [0.06, 0.32, 0.4], position: [-0.16, 0.15, 0], color: '#f59e0b' },
      { shape: 'sphere', size: [0.05], position: [0, 0.28, 0.2], color: '#fbbf24' },
      { shape: 'sphere', size: [0.07], position: [0.05, 0.34, 0.02], color: '#fde047' },
      { shape: 'sphere', size: [0.06], position: [-0.09, 0.33, 0.05], color: '#facc15' }
    ] },
    { id: 'snowman', emoji: '⛄', label: 'Snowman', parts: [
      { shape: 'sphere', size: [0.34], position: [0, 0.3, 0], color: '#f8fafc' },
      { shape: 'sphere', size: [0.26], position: [0, 0.78, 0], color: '#f1f5f9' },
      { shape: 'sphere', size: [0.19], position: [0, 1.15, 0], color: '#f8fafc' },
      { shape: 'cone', size: [0.05, 0.16], position: [0, 1.16, 0.24], rotation: [90, 0, 0], color: '#f97316' },
      { shape: 'sphere', size: [0.03], position: [0.07, 1.2, 0.15], color: '#1e293b' },
      { shape: 'sphere', size: [0.03], position: [-0.07, 1.2, 0.15], color: '#1e293b' },
      { shape: 'sphere', size: [0.03], position: [0, 0.82, 0.24], color: '#1e293b' },
      { shape: 'sphere', size: [0.03], position: [0, 0.72, 0.25], color: '#1e293b' },
      { shape: 'cylinder', size: [0.22, 0.03], position: [0, 1.31, 0], color: '#1e293b' },
      { shape: 'cylinder', size: [0.14, 0.18], position: [0, 1.41, 0], color: '#1e293b' }
    ] },
    { id: 'mushroom', emoji: '🍄', label: 'Mushroom', parts: [
      { shape: 'cylinder', size: [0.13, 0.42], position: [0, 0.21, 0], color: '#fef3c7' },
      { shape: 'cylinder', size: [0.34, 0.05], position: [0, 0.42, 0], color: '#fecaca' },
      { shape: 'sphere', size: [0.4], position: [0, 0.48, 0], color: '#dc2626' },
      { shape: 'sphere', size: [0.06], position: [0.18, 0.68, 0.12], color: '#ffffff' },
      { shape: 'sphere', size: [0.05], position: [-0.16, 0.7, -0.1], color: '#ffffff' },
      { shape: 'sphere', size: [0.045], position: [0.02, 0.78, -0.18], color: '#ffffff' }
    ] },
    { id: 'globe', emoji: '🌍', label: 'Globe', parts: [
      { shape: 'cylinder', size: [0.2, 0.06], position: [0, 0.03, 0], color: '#334155' },
      { shape: 'cylinder', size: [0.03, 0.25], position: [0, 0.16, 0], color: '#64748b' },
      { shape: 'sphere', size: [0.32], position: [0, 0.55, 0], color: '#2563eb' },
      { shape: 'sphere', size: [0.11], position: [0.24, 0.6, 0.12], color: '#16a34a' },
      { shape: 'sphere', size: [0.09], position: [-0.2, 0.5, 0.18], color: '#22c55e' },
      { shape: 'sphere', size: [0.08], position: [0.05, 0.66, -0.26], color: '#16a34a' },
      { shape: 'torus', size: [0.36, 0.02], position: [0, 0.55, 0], rotation: [0, 0, 23], color: '#cbd5e1' }
    ] }
  ];

  // getPreset — id → a fresh, normalized recipe (safe to mutate/persist).
  // Returns null for unknown ids; never throws.
  function getPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i].id === id) return normalizeRecipe({ name: PRESETS[i].label, parts: PRESETS[i].parts });
    }
    return null;
  }

  // ── Recipe editing ops — PURE seams for HAND-BUILT sculpting ──
  // Students author their own shapes part-by-part (no AI needed): every op
  // takes a recipe (or null), returns a fresh NORMALIZED recipe — clamping,
  // shape whitelisting, and the MAX_PARTS cap all ride the same
  // normalizeRecipe path AI recipes use, so hand-built and AI-built sculptures
  // are indistinguishable downstream (buildObject, persistence, refine).
  // These are deliberately UI-agnostic: Free Forms uses them today; a fuller
  // sculpting suite (e.g. in Art Studio) can reuse them unchanged.
  var PART_PALETTE = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f8fafc', '#334155'];
  var PART_DEFAULT_SIZE = {
    box: [0.4, 0.4, 0.4], sphere: [0.25, 0.25, 0.25], cylinder: [0.15, 0.5, 0.15],
    cone: [0.2, 0.45, 0.2], torus: [0.25, 0.06, 0.06]
  };
  function _copyParts(r) {
    return r.parts.map(function (p) {
      return { shape: p.shape, size: p.size.slice(), position: p.position.slice(), rotation: p.rotation.slice(), color: p.color };
    });
  }
  function _rebuild(r, parts) {
    return normalizeRecipe({ name: r ? r.name : '', parts: parts, scale: r ? r.scale : 1, rotY: r ? r.rotY : 0, tint: r ? r.tint : null });
  }
  // newPart — a sensible starter part; color cycles the palette by index.
  function newPart(shape, index) {
    var sh = SHAPES[shape] ? shape : 'box';
    return {
      shape: sh,
      size: (PART_DEFAULT_SIZE[sh] || PART_DEFAULT_SIZE.box).slice(),
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      color: PART_PALETTE[(isNum(index) ? index : 0) % PART_PALETTE.length]
    };
  }
  // addPart — append a starter part (no-op at the MAX_PARTS cap).
  function addPart(recipe, shape) {
    var r = recipe ? normalizeRecipe(recipe) : null;
    var parts = r ? _copyParts(r) : [];
    if (parts.length >= MAX_PARTS) return r;
    parts.push(newPart(shape, parts.length));
    return _rebuild(r, parts);
  }
  // updatePart — shallow-patch one part ({shape|size|position|rotation|color}).
  function updatePart(recipe, index, patch) {
    var r = normalizeRecipe(recipe);
    if (!r || !r.parts[index]) return r;
    var parts = _copyParts(r);
    parts[index] = Object.assign(parts[index], patch || {});
    return _rebuild(r, parts);
  }
  // removePart — returns NULL when the last part goes (callers treat as "cleared").
  function removePart(recipe, index) {
    var r = normalizeRecipe(recipe);
    if (!r || !r.parts[index]) return r;
    var parts = _copyParts(r);
    parts.splice(index, 1);
    return _rebuild(r, parts);
  }
  // duplicatePart — copy inserted right after the original, offset so it's visible.
  function duplicatePart(recipe, index) {
    var r = normalizeRecipe(recipe);
    if (!r || !r.parts[index] || r.parts.length >= MAX_PARTS) return r;
    var parts = _copyParts(r);
    var copy = { shape: parts[index].shape, size: parts[index].size.slice(), position: parts[index].position.slice(), rotation: parts[index].rotation.slice(), color: parts[index].color };
    copy.position[0] += 0.2;
    parts.splice(index + 1, 0, copy);
    return _rebuild(r, parts);
  }
  // nudgePart — move/spin one part along one axis ('position' units, 'rotation' degrees).
  function nudgePart(recipe, index, field, axis, delta) {
    var r = normalizeRecipe(recipe);
    if (!r || !r.parts[index]) return r;
    if (field !== 'position' && field !== 'rotation') return r;
    var a = (axis === 0 || axis === 1 || axis === 2) ? axis : 1;
    var parts = _copyParts(r);
    parts[index][field][a] += (isNum(delta) ? delta : 0);
    return _rebuild(r, parts);   // normalize clamps to the sculpting box
  }
  // scalePart — grow/shrink one part (all size dims; normalize clamps).
  function scalePart(recipe, index, factor) {
    var r = normalizeRecipe(recipe);
    if (!r || !r.parts[index] || !isNum(factor) || factor <= 0) return r;
    var parts = _copyParts(r);
    parts[index].size = parts[index].size.map(function (s) { return s * factor; });
    return _rebuild(r, parts);
  }
  // recolorPart — step the part's color through the palette.
  function recolorPart(recipe, index) {
    var r = normalizeRecipe(recipe);
    if (!r || !r.parts[index]) return r;
    var cur = PART_PALETTE.indexOf(r.parts[index].color);
    return updatePart(r, index, { color: PART_PALETTE[(cur + 1) % PART_PALETTE.length] });
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
    buildRefinePrompt: buildRefinePrompt,
    buildSculptCommandPrompt: buildSculptCommandPrompt,
    parseSculptCommand: parseSculptCommand,
    buildStretchCommandPrompt: buildStretchCommandPrompt,
    parseStretchCommand: parseStretchCommand,
    PRESETS: PRESETS,
    getPreset: getPreset,
    PART_PALETTE: PART_PALETTE,
    newPart: newPart,
    addPart: addPart,
    updatePart: updatePart,
    removePart: removePart,
    duplicatePart: duplicatePart,
    nudgePart: nudgePart,
    scalePart: scalePart,
    recolorPart: recolorPart,
    buildObject: buildObject
  };
  console.log('[Prim3D] Registered (p3d/1 — Gemini primitive-assembly sculptures)');
})();
