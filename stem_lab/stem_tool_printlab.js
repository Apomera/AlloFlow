// AlloFlow STEM Lab — Print Lab
// Client-only preparation workspace for primitive recipes, GLB, and STL.
(function () {
  'use strict';
  // Translator reachable from module scope, IIFE-private so it is not a global.
  // Installed because this tool had no fallback-aware helper: labels built in
  // helpers defined above render() could not see a render-scoped one, and a
  // helper named `t` is shadowed here by numeric `var t` in inner scopes.
  var __alloPLCtx = null;
  var __alloT = function (k, fb) {
    var v;
    try { v = (__alloPLCtx && typeof __alloPLCtx.t === "function") ? __alloPLCtx.t(k, fb) : null; } catch (e) { v = null; }
    return (v == null) ? (fb != null ? fb : k) : v;
  };
  var __alloAriaFill = function (template, values) { return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m; }); };

  if (typeof window === 'undefined' || !window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('printLab')) return;

  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var MAX_PORTAL_ASSET_BYTES = 4 * 1024 * 1024;
  var MAX_GCODE_BYTES = 25 * 1024 * 1024;
  var GEOMETRY_EDGE_CLEARANCE_MM = 5;
  var DEFAULT_PRINTER_PROFILE = { name: 'School printer', bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250, planningClearanceMm: GEOMETRY_EDGE_CLEARANCE_MM, nozzleMm: 0.4, maxTriangles: 250000, maxBytes: MAX_FILE_BYTES };
  var TABS = ['Design', 'Preflight', 'Materials', 'Submit'];
  var PRINTER_FIELDS = [
    ['bedWidthMm','Bed width (mm)',50,1000],['bedDepthMm','Bed depth (mm)',50,1000],['bedHeightMm','Build height (mm)',50,1000],
    ['planningClearanceMm','Planning clearance (mm)',0,50],['nozzleMm','Nozzle diameter (mm)',0.1,2]
  ];
  function printerProfileDraft(profile) { var draft={};PRINTER_FIELDS.forEach(function(field){draft[field[0]]=String(profile[field[0]]);});return draft; }
  var SHAPES = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'lathe', 'extrude'];
  // Drawn shapes carry a profile. These mirror Prim3D's DEFAULT_PROFILES and
  // normalizeProfile so the cold path (Prim3D not loaded yet) normalizes a
  // persisted recipe identically to the warm path; a test pins that parity.
  var PROFILE_SHAPES = { lathe: 1, extrude: 1 };
  var DEFAULT_PROFILES = {
    lathe: [[0.42, 0], [0.7, 0.08], [0.82, 0.24], [0.62, 0.48], [0.5, 0.66], [0.66, 0.84], [0.56, 1]],
    extrude: [[0, 1], [0.28, 0.32], [0.95, 0.31], [0.45, -0.12], [0.59, -0.81], [0, -0.4], [-0.59, -0.81], [-0.45, -0.12], [-0.95, 0.31], [-0.28, 0.32]]
  };
  function normalizeProfileLocal(shape, raw) {
    if (!PROFILE_SHAPES[shape]) return null;
    var lathe = shape === 'lathe', out = [];
    if (Array.isArray(raw)) {
      for (var i = 0; i < raw.length && out.length < 24; i++) {
        var pt = raw[i];
        if (!Array.isArray(pt) || typeof pt[0] !== 'number' || isNaN(pt[0]) || typeof pt[1] !== 'number' || isNaN(pt[1])) continue;
        out.push(lathe ? [clamp(pt[0], 0.02, 1, 0.5), clamp(pt[1], 0, 1, 0.5)] : [clamp(pt[0], -1, 1, 0), clamp(pt[1], -1, 1, 0)]);
      }
    }
    if (out.length < 3) return DEFAULT_PROFILES[shape].map(function (p) { return p.slice(); });
    return out;
  }
  var MATERIALS = [
    {
      id: 'PLA', name: 'PLA', density: 1.24,
      summary: 'Common and comparatively easy to print; usually stiff rather than impact-tough.',
      lifecycle: 'Bio-based does not mean a finished PLA print will break down in a home compost pile. Check the exact product and local end-of-life route.'
    },
    {
      id: 'PETG', name: 'PETG', density: 1.27,
      summary: 'Often chosen when a design needs more toughness or moisture resistance than a classroom PLA print.',
      lifecycle: 'Recyclability depends on the exact product and the collection systems available locally. Avoid putting prints into a stream that does not accept them.'
    },
    {
      id: 'PHA', name: 'PHA / PHA blend', density: 1.25,
      summary: 'Some PHA formulations can biodegrade under specified conditions, while print behavior and strength vary by formulation.',
      lifecycle: 'Do not treat “PHA” as an automatic green guarantee. Verify the exact filament, additives, certification, required conditions, and disposal option.'
    },
    {
      id: 'TPU', name: 'TPU', density: 1.21,
      summary: 'Flexible and useful for compliant parts, but settings and material handling differ from rigid filaments.',
      lifecycle: 'Choose it for a functional need, minimize waste, and follow the manufacturer’s handling and end-of-life guidance.'
    },
    {
      id: 'ABS', name: 'ABS', density: 1.04,
      summary: 'A higher-temperature material used for durable parts; it is not the default choice for this student pilot.',
      lifecycle: 'Use only under the school’s printer, enclosure, ventilation, supervision, and material-safety procedures.'
    }
  ];

  function clamp(value, lo, hi, fallback) {
    var n = Number(value);
    if (!isFinite(n)) n = fallback;
    return Math.max(lo, Math.min(hi, n));
  }

  // Compare human-entered slicer outputs. These numbers never authorize a quote.
  function compareSlicerPlans(input) {
    input = input || {};
    function positive(value) {
      if (typeof value !== 'number' && typeof value !== 'string') return null;
      if (String(value).trim() === '') return null;
      var n = Number(value);
      return isFinite(n) && n > 0 && n <= 1000000 ? n : null;
    }
    function change(before, after) {
      var a = positive(before), b = positive(after);
      if (a === null || b === null) return null;
      return { before: a, after: b, saved: Math.round((a - b) * 100) / 100, percent: Math.round((a - b) / a * 1000) / 10 };
    }
    return { mass: change(input.baselineGrams, input.candidateGrams), time: change(input.baselineMinutes, input.candidateMinutes) };
  }

  function safeText(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  }

  function normalizePersistedRecipe(candidate, P3D) {
    try {
      if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.parts) || !candidate.parts.length || candidate.parts.length > 24) return null;
      var valid = candidate.parts.every(function (part) {
        if (!part || typeof part !== 'object' || SHAPES.indexOf(String(part.shape || '').toLowerCase()) < 0) return false;
        if (![part.size, part.position, part.rotation].every(function (values) { return Array.isArray(values) && values.length >= 3 && values.slice(0, 3).every(function (value) { return typeof value === 'number' && isFinite(value); }); })) return false;
        return part.color == null || /^#[0-9a-f]{6}$/i.test(String(part.color));
      });
      if (!valid) return null;
      var normalizer = P3D || (window.AlloModules && window.AlloModules.Prim3D);
      if (normalizer && typeof normalizer.normalizeRecipe === 'function') return normalizer.normalizeRecipe(candidate);
      return {
        version: 'p3d/1',
        name: safeText(candidate.name, 80),
        parts: candidate.parts.slice(0, 24).map(function (part) {
          var stretch = Array.isArray(part.stretch) ? part.stretch : [1, 1, 1];
          var deform = part.deform && typeof part.deform === 'object' ? part.deform : {};
          var requestedFinish = typeof part.finish === 'string' ? part.finish.toLowerCase().trim() : '';
          var shapeKey = String(part.shape).toLowerCase();
          var profile = normalizeProfileLocal(shapeKey, part.profile);
          var normalizedPart = {
            shape: shapeKey,
            label: safeText(part.label, 40),
            size: [clamp(part.size[0], 0.02, 4, 0.4), clamp(part.size[1], 0.02, 4, 0.4), clamp(part.size[2], 0.02, 4, 0.4)],
            stretch: [clamp(stretch[0], 0.1, 4, 1), clamp(stretch[1], 0.1, 4, 1), clamp(stretch[2], 0.1, 4, 1)],
            deform: { taper: clamp(deform.taper, -0.85, 0.85, 0), twist: clamp(deform.twist, -180, 180, 0), bulge: clamp(deform.bulge, -0.75, 1.5, 0) },
            position: [clamp(part.position[0], -4, 4, 0), clamp(part.position[1], -4, 8, 0.5), clamp(part.position[2], -4, 4, 0)],
            rotation: [clamp(part.rotation[0], -360, 360, 0), clamp(part.rotation[1], -360, 360, 0), clamp(part.rotation[2], -360, 360, 0)],
            color: part.color && /^#[0-9a-f]{6}$/i.test(String(part.color)) ? String(part.color).toLowerCase() : '#818cf8',
            finish: ['standard', 'matte', 'gloss', 'metal', 'wire'].indexOf(requestedFinish) !== -1 ? requestedFinish : 'standard',
            opacity: clamp(part.opacity, 0.15, 1, 1),
            hidden: part.hidden === true,
            locked: part.locked === true
          };
          // Only drawn shapes carry a profile; other parts keep their exact key set.
          if (profile) normalizedPart.profile = profile;
          return normalizedPart;
        }),
        scale: clamp(candidate.scale, 0.25, 5, 1),
        rotY: ((Number(candidate.rotY) || 0) % 360 + 360) % 360,
        tint: candidate.tint && /^#[0-9a-f]{6}$/i.test(String(candidate.tint)) ? String(candidate.tint).toLowerCase() : null
      };
    } catch (_) { return null; }
  }

  function normalizePrinterProfile(candidate) {
    candidate = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {};
    return {
      name: safeText(candidate.name || DEFAULT_PRINTER_PROFILE.name, 80) || DEFAULT_PRINTER_PROFILE.name,
      bedWidthMm: clamp(candidate.bedWidthMm, 50, 1000, DEFAULT_PRINTER_PROFILE.bedWidthMm),
      bedDepthMm: clamp(candidate.bedDepthMm, 50, 1000, DEFAULT_PRINTER_PROFILE.bedDepthMm),
      bedHeightMm: clamp(candidate.bedHeightMm, 50, 1000, DEFAULT_PRINTER_PROFILE.bedHeightMm),
      planningClearanceMm: clamp(candidate.planningClearanceMm, 0, 50, DEFAULT_PRINTER_PROFILE.planningClearanceMm),
      nozzleMm: clamp(candidate.nozzleMm, 0.1, 2, DEFAULT_PRINTER_PROFILE.nozzleMm),
      maxTriangles: Math.round(clamp(candidate.maxTriangles, 1000, 10000000, DEFAULT_PRINTER_PROFILE.maxTriangles)),
      maxBytes: Math.round(clamp(candidate.maxBytes, 65536, MAX_FILE_BYTES, DEFAULT_PRINTER_PROFILE.maxBytes))
    };
  }

  function canonicalJson(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + canonicalJson(value[key]); }).join(',') + '}';
  }

  function persistedPreflightBinding(recipe, unitMm, profile) {
    var clean = normalizePersistedRecipe(recipe);
    if (!clean) return '';
    return canonicalJson({
      schema: 'alloflow-print-preflight-binding/1',
      sourceFormat: 'RECIPE',
      recipe: clean,
      unitMm: clamp(unitMm, 0.01, 1000, 20),
      printerProfile: normalizePrinterProfile(profile)
    });
  }

  function normalizePersistedPreflight(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || candidate.sourceFormat !== 'RECIPE' || ['PASS', 'WARN', 'FAIL'].indexOf(candidate.status) < 0) return null;
    var dimensions = candidate.dimensionsMm;
    if (!dimensions || ['width', 'depth', 'height'].some(function (key) { return typeof dimensions[key] !== 'number' || !isFinite(dimensions[key]) || dimensions[key] < 0; })) return null;
    var issues = Array.isArray(candidate.issues) ? candidate.issues.slice(0, 50).map(function (item) {
      if (!item || typeof item !== 'object') return null;
      var severity = ['ERROR', 'WARNING', 'INFO'].indexOf(item.severity) >= 0 ? item.severity : 'WARNING';
      return { code: safeText(item.code, 80) || 'PERSISTED_FINDING', severity: severity, message: safeText(item.message, 500) };
    }).filter(Boolean) : [];
    return {
      status: candidate.status,
      sourceFormat: 'RECIPE',
      byteSize: Math.round(clamp(candidate.byteSize, 0, MAX_FILE_BYTES, 0)),
      triangleCount: Math.round(clamp(candidate.triangleCount, 0, 10000000, 0)),
      meshCount: Math.round(clamp(candidate.meshCount, 0, 1000000, 0)),
      dimensionsMm: { width: dimensions.width, depth: dimensions.depth, height: dimensions.height },
      volumeMm3UpperBound: clamp(candidate.volumeMm3UpperBound, 0, 1000000000000, 0),
      degenerateTriangles: Math.round(clamp(candidate.degenerateTriangles, 0, 10000000, 0)),
      openEdges: Math.round(clamp(candidate.openEdges, 0, 10000000, 0)),
      unitDeclaration: safeText(candidate.unitDeclaration, 80),
      issues: issues
    };
  }

  function manufacturingEvidenceBinding(modelHash, sourceFormat, unitMm, materialId, profile) {
    var hash = String(modelHash || '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) return '';
    return canonicalJson({
      schema: 'alloflow-print-evidence-binding/1',
      modelSha256: hash,
      sourceFormat: ['RECIPE', 'STL', 'GLB'].indexOf(sourceFormat) >= 0 ? sourceFormat : '',
      unitMm: clamp(unitMm, 0.01, 1000, 20),
      materialId: safeText(materialId, 40),
      printerProfile: normalizePrinterProfile(profile)
    });
  }

  function schoolRewardsAssetCompatibility(sourceFormat, byteLength) {
    var format = String(sourceFormat || '').toUpperCase();
    var needsAsset = format === 'STL' || format === 'GLB';
    var bytes = Math.max(0, Math.round(Number(byteLength) || 0));
    if (!needsAsset) return { compatible: true, needsAsset: false, byteLength: bytes, maxBytes: MAX_PORTAL_ASSET_BYTES };
    if (!bytes) return { compatible: false, needsAsset: true, byteLength: 0, maxBytes: MAX_PORTAL_ASSET_BYTES, reason: 'The imported model file is not available in this session.' };
    if (bytes > MAX_PORTAL_ASSET_BYTES) return { compatible: false, needsAsset: true, byteLength: bytes, maxBytes: MAX_PORTAL_ASSET_BYTES, reason: 'This model is larger than the School Rewards 4 MiB upload limit.' };
    return { compatible: true, needsAsset: true, byteLength: bytes, maxBytes: MAX_PORTAL_ASSET_BYTES };
  }

  function sourceExtension(name) {
    var match = String(name || '').toLowerCase().match(/\.([a-z0-9-]+)$/);
    return match ? match[1] : '';
  }

  function allowedFile(file) {
    if (!file) return { ok: false, message: 'Choose a recipe JSON, GLB, or STL file.' };
    if (Number(file.size) > MAX_FILE_BYTES) return { ok: false, message: 'This pilot accepts files up to 5 MB.' };
    var ext = sourceExtension(file.name);
    if (['json', 'glb', 'stl'].indexOf(ext) === -1) return { ok: false, message: 'Only recipe JSON, GLB, and STL files are accepted.' };
    return { ok: true, extension: ext, format: ext === 'json' ? 'RECIPE' : ext.toUpperCase() };
  }

  function allowedGcodeFile(file) {
    if (!file) return { ok: false, message: 'Choose a local G-code file exported by the approved school slicer.' };
    if (Number(file.size) > MAX_GCODE_BYTES) return { ok: false, message: 'G-code metadata import is limited to 25 MB in this browser tool.' };
    var ext = sourceExtension(file.name);
    if (['gcode', 'gco', 'gc'].indexOf(ext) === -1) return { ok: false, message: 'Choose a .gcode, .gco, or .gc file.' };
    return { ok: true, extension: ext };
  }

  function normalizeRewardsPortalUrl(value) {
    try {
      var url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password || url.search || url.hash) return '';
      if (!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) return '';
      return url.origin + url.pathname;
    } catch (_) { return ''; }
  }

  function connectedRewardsPortalUrl() {
    try { return normalizeRewardsPortalUrl(window.localStorage.getItem('allo_school_rewards_portal_url_v1')); }
    catch (_) { return ''; }
  }

  function selfAsset(relativePath) {
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || '';
        if (src.indexOf('stem_tool_printlab.js') !== -1) return new URL(relativePath, src).href;
      }
    } catch (_) {}
    return relativePath;
  }

  function loadSidecar(urls, key, check, failMessage) {
    if (check()) return Promise.resolve(true);
    if (!window.StemLab || typeof window.StemLab.loadScriptResilient !== 'function') return Promise.reject(new Error(failMessage));
    return window.StemLab.loadScriptResilient(urls, { cacheKey: key, check: check, failMessage: failMessage });
  }

  function ensurePrintableModel() {
    return loadSidecar(
      [selfAsset('../printable_model_module.js'), 'printable_model_module.js'],
      'print-lab-printable-model',
      function () { return !!(window.AlloModules && window.AlloModules.PrintableModel); },
      'The local print-inspection engine could not be loaded.'
    );
  }

  function ensurePrim3D() {
    return loadSidecar(
      [selfAsset('../prim3d_module.js'), 'prim3d_module.js'],
      'print-lab-prim3d',
      function () { return !!(window.AlloModules && window.AlloModules.Prim3D); },
      'The primitive-modeling engine could not be loaded.'
    );
  }

  // Geometry World is registered later in the shared STEM-tool bundle, so its
  // focused builder UI lives in a small sidecar that can wait for that registry
  // entry. Loading it here keeps the local model handoff owned by the two tools
  // that participate in it and avoids a second copy of Geometry World's engine.
  function ensureGeometryWorldBuilder() {
    return loadSidecar(
      [selfAsset('stem_tool_geometryworld_builder.js'), 'stem_lab/stem_tool_geometryworld_builder.js'],
      'geometry-world-builder-enhancement',
      function () { return !!(window.StemLab && window.StemLab.geometryWorldBuilderPure); },
      'The optional Geometry World free-build enhancement could not be loaded.'
    );
  }

  ensureGeometryWorldBuilder().catch(function (error) {
    try { console.warn('[Print Lab] Geometry World builder enhancement unavailable:', error && error.message ? error.message : error); } catch (_) {}
  });

  function ensurePrintZip() {
    return loadSidecar([selfAsset('../jszip/3.10.1/jszip.min.js'),selfAsset('../vendor/jszip-3.10.1.min.js')],
      'print-lab-zip',function(){return typeof window.JSZip === 'function';},'The local package writer could not load. Individual STL and review downloads remain available.');
  }
  function ensurePrintPackageReader() {
    return loadSidecar([selfAsset('geometry_print_package.js'), 'stem_lab/geometry_print_package.js'], 'geometry-print-package-reader', function () {
      return !!(window.StemLab.geometryPrintPackage && typeof window.StemLab.geometryPrintPackage.read === 'function');
    }, 'The local print package reader could not load. Choose the ZIP again to retry.');
  }
  function editablePackageCopy(candidate) {
    if (!candidate || candidate.schema !== 'alloflow-geometry-world/2' || !Array.isArray(candidate.blocks) || !candidate.blocks.length || candidate.blocks.length > 1500) return null;
    var builder = window.StemLab.geometryWorldBuilderPure;
    if (builder && typeof builder.normalizeEditableWorld === 'function') {
      var checked = builder.normalizeEditableWorld(candidate);
      return checked.ok ? checked.value : null;
    }
    // Standalone Print Lab may open before the builder loads. Keep only its
    // bounded editable fields; the builder validates the intent on arrival.
    var blocks = [], occupied = new Set();
    for (var i = 0; i < candidate.blocks.length; i++) {
      var block = candidate.blocks[i];
      if (!block || ![block.x, block.y, block.z, block.rotation].every(Number.isInteger) || Math.abs(block.x) > 64 || Math.abs(block.z) > 64 || block.y < 1 || block.y > 128 || block.rotation < 0 || block.rotation > 3 || GEOMETRY_WORLD_BLOCK_TYPES.indexOf(block.type) < 0 || GEOMETRY_WORLD_BLOCK_SHAPES.indexOf(block.shape) < 0) return null;
      var key = [block.x, block.y, block.z].join(',');
      if (occupied.has(key)) return null;
      occupied.add(key);
      blocks.push({ x: block.x, y: block.y, z: block.z, type: block.type, shape: block.shape, rotation: block.rotation });
    }
    return { schema: candidate.schema, title: safeText(candidate.title, 80), coordinateSystem: 'x-right,y-up,z-depth', blocks: blocks };
  }

  var changeKinds = ['added','removed','modified'];
  var historyExamplesPerKind = 8;

  function changeKind(entry) {
    if (!entry.before) return 'added';
    return entry.after ? 'modified' : 'removed';
  }
  function validChangeRecipe(recipe) {
    return recipe === null || !!(recipe && GEOMETRY_WORLD_BLOCK_TYPES.includes(recipe.type) &&
      GEOMETRY_WORLD_BLOCK_SHAPES.includes(recipe.shape) && Number.isInteger(recipe.rotation) && recipe.rotation >= 0 && recipe.rotation <= 3);
  }
  function copyRecipe(recipe) {
    return recipe && {type:recipe.type,shape:recipe.shape,rotation:recipe.rotation};
  }
  function normalizeBlockChanges(value, sampled) {
    if (!value || !Array.isArray(value.entries)) return null;
    var keys = ['added','removed','modified','unchanged','materialChanged','shapeChanged','rotationChanged'];
    if (!keys.every(function(key){return Number.isInteger(value[key]) && value[key]>=0 && value[key]<=1500;})) return null;
    if (value.added+value.modified+value.unchanged>1500 || value.removed+value.modified+value.unchanged>1500) return null;
    if (keys.slice(4).some(function(key){return value[key]>value.modified;}) ||
        value.materialChanged+value.shapeChanged+value.rotationChanged<value.modified) return null;
    var limit = sampled ? historyExamplesPerKind*changeKinds.length : 3000;
    if (value.entries.length>limit) return null;
    var result={entries:[]}, seenCells=new Set();
    keys.forEach(function(key){result[key]=value[key];});
    var found={added:0,removed:0,modified:0,materialChanged:0,shapeChanged:0,rotationChanged:0};
    for (var entry of value.entries) {
      if (!entry || ![entry.x,entry.y,entry.z].every(Number.isSafeInteger) ||
          !validChangeRecipe(entry.before) || !validChangeRecipe(entry.after) || (!entry.before && !entry.after)) return null;
      var coordinate=[entry.x,entry.y,entry.z].join(',');
      if (seenCells.has(coordinate)) return null;
      seenCells.add(coordinate);
      var kind=changeKind(entry);
      found[kind]++;
      if (kind==='modified') {
        var material=entry.before.type!==entry.after.type, shape=entry.before.shape!==entry.after.shape, turn=entry.before.rotation!==entry.after.rotation;
        if (!material && !shape && !turn) return null;
        if (material) found.materialChanged++;
        if (shape) found.shapeChanged++;
        if (turn) found.rotationChanged++;
      }
      result.entries.push({x:entry.x,y:entry.y,z:entry.z,before:copyRecipe(entry.before),after:copyRecipe(entry.after)});
    }
    if (!Object.keys(found).every(function(key){return sampled ? found[key]<=value[key] : found[key]===value[key];})) return null;
    if (sampled && !changeKinds.every(function(key){return found[key]===Math.min(value[key],historyExamplesPerKind);})) return null;
    return result;
  }
  function validPrintDimensions(value) {
    return value && ['width','depth','height'].every(function(axis){return Number.isFinite(value[axis]) && value[axis]>=0 && value[axis]<=1e9;});
  }
  function printReference(value) {
    if (!value || !['package','working'].includes(value.basis) || !validPrintDimensions(value.dimensions) ||
        !Number.isFinite(value.unitMm) || value.unitMm<0.01 || value.unitMm>1000 ||
        !MATERIALS.some(function(item){return item.id===value.materialId;}) || ![0,90].includes(value.printTurnDegrees)) return null;
    var size=value.dimensions;
    return {basis:value.basis, dimensions:{width:size.width,depth:size.depth,height:size.height},
      unitMm:value.unitMm,materialId:value.materialId,printTurnDegrees:value.printTurnDegrees};
  }
  function changeHistoryForZip(review, current) {
    var changes=review.blockChanges, previous=review.referencePrint;
    if (!changes || !previous || !current) return null;
    var sampled=Object.assign({},changes,{entries:[]}), used={added:0,removed:0,modified:0};
    changes.entries.forEach(function(entry){
      var kind=changeKind(entry);
      if (used[kind]++ < historyExamplesPerKind) sampled.entries.push(entry);
    });
    return {schema:'geometry-world-changes/1',previous:previous,current:current,blockChanges:sampled};
  }
  function readChangeHistory(result) {
    var manifest=result.manifest, revision=manifest.source.revisionNumber, raw=manifest.revisionComparison;
    if (!Number.isInteger(revision) || revision<2 || revision>9999 || !raw || raw.schema!=='geometry-world-changes/1') return null;
    var previous=printReference(raw.previous), current=printReference(raw.current), changes=normalizeBlockChanges(raw.blockChanges,true);
    if (!previous || !current || !changes) return null;
    var sizeMatches=['width','depth','height'].every(function(axis){return Math.abs(current.dimensions[axis]-result.dimensions[axis])<=0.011;});
    if (!sizeMatches || current.unitMm!==manifest.source.millimetersPerBlock || current.materialId!==manifest.material ||
        current.printTurnDegrees!==(manifest.source.printTurnDegrees || 0)) return null;
    if (result.editableWorld && changes.added+changes.modified+changes.unchanged!==result.editableWorld.blocks.length) return null;
    return {previous:previous,current:current,blockChanges:changes};
  }

  function changeRecipeLabel(recipe) {
    var shapes={cube:'cube',halfA:'diagonal half',halfB:'half slab',quarter:'quarter wedge'};
    return recipe.type+' '+shapes[recipe.shape]+' ('+(recipe.rotation*90)+'°)';
  }
  function RevisionBlockChanges(props) {
    var React=props.React,h=React.createElement,changes=props.changes;
    var [filter,setFilter]=React.useState('all'),[page,setPage]=React.useState(0);
    var entries=React.useMemo(function(){
      return filter==='all' ? changes.entries : changes.entries.filter(function(entry){return changeKind(entry)===filter;});
    },[changes,filter]);
    var perPage=6, lastPage=Math.max(0,Math.ceil(entries.length/perPage)-1), currentPage=Math.min(page,lastPage);
    var offset=currentPage*perPage, count=changes.added+changes.removed+changes.modified;
    var labels={added:'Added',removed:'Removed',modified:'Edited'};
    var counts=changeKinds.concat('unchanged');
    var rangeText='No cells match this filter.';
    if (entries.length===1) rangeText=props.sampled ? 'Showing 1 saved example.' : 'Showing 1 changed cell.';
    if (entries.length>1) rangeText='Showing '+(offset+1)+'–'+Math.min(entries.length,offset+perPage)+' of '+entries.length+(props.sampled?' saved examples.':' changed cells.');
    var navClass='min-h-[44px] rounded-lg border border-slate-500 px-3 text-xs font-bold text-white';
    function move(delta) {setPage(Math.max(0,Math.min(lastPage,currentPage+delta)));}
    return h('div',{'data-print-block-changes':true,className:'mt-4 border-t border-slate-600 pt-3'},
      h('h4',{className:'text-sm font-bold text-white'},'Block changes'),
      h('dl',{className:'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4'},counts.map(function(kind){
        return h('div',{key:kind,className:'min-w-0 rounded-lg bg-slate-900 p-2'},
          h('dt',{className:'text-xs text-slate-200'},labels[kind] || 'Unchanged'),
          h('dd',{className:'text-base font-bold text-white'},String(changes[kind])));
      })),
      changes.modified>0 && h('p',{className:'mt-2 text-xs leading-5 text-slate-200'},[
        [changes.materialChanged,'block material'],[changes.shapeChanged,'shape'],[changes.rotationChanged,'rotation']
      ].filter(function(item){return item[0]>0;}).map(function(item){return item[0]+' with a different '+item[1];}).join(' · ')),
      count===0 ? h('p',{className:'mt-2 text-sm text-white'},'The block positions, materials, shapes, and rotations are unchanged.') :
        h('details',{'data-print-change-details':true,className:'mt-2'},
          h('summary',{className:'min-h-[44px] cursor-pointer py-3 text-sm font-bold text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200'},props.sampled?'Explore saved cell examples':'Explore changed cells'),
          h('p',{className:'text-xs leading-5 text-slate-300'},props.sampled ? 'Positions use the grid from when this revision was edited (X across, Y up, Z in depth). Reopening the editable ZIP may center the blocks on a different origin.' : 'Positions refer to this revision’s editing grid (X across, Y up, Z in depth). A block placed in another cell appears as a removal and an addition.'),
          props.sampled && changes.entries.length<count && h('p',{className:'mt-2 text-xs leading-5 text-slate-200'},'This ZIP keeps up to '+historyExamplesPerKind+' examples of each change type. The totals include all changed cells.'),
          h('label',{className:'mt-3 block text-xs font-bold text-slate-200'},'Show changes',
            h('select',{'data-print-change-filter':true,value:filter,className:'mt-1 min-h-[44px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-sm text-white',
              onChange:function(event){setFilter(event.target.value);setPage(0);}},
              ['all'].concat(changeKinds).map(function(kind){return h('option',{key:kind,value:kind},kind==='all'?'All changes':labels[kind]);}))),
          h('p',{role:'status',className:'mt-2 text-xs leading-5 text-slate-200'},rangeText),
          h('ul',{className:'mt-2 space-y-2'},entries.slice(offset,offset+perPage).map(function(entry){
            var kind=changeKind(entry), cell='X '+entry.x+', Y '+entry.y+', Z '+entry.z;
            return h('li',{key:[entry.x,entry.y,entry.z].join(','),'data-print-change-row':kind,className:'rounded-lg border border-slate-700 p-2 text-xs leading-5 text-slate-200'},
              h('strong',{className:'block text-sm text-white'},labels[kind]+' at '+cell),
              entry.before && h('span',{className:'block'},'Before: '+changeRecipeLabel(entry.before)),
              entry.after && h('span',{className:'block'},'After: '+changeRecipeLabel(entry.after)),
              props.canInspect && props.canInspect(entry) && h('button',{
                type:'button','data-print-inspect-cell':true,'aria-label':__alloAriaFill(__alloT('stem.printlab.a11y_inspect_block_at_in_geometry_world', 'Inspect block at {cell} in Geometry World'), { cell: cell }),
                className:'mt-2 min-h-[44px] w-full rounded-lg border border-cyan-400 px-3 py-2 text-sm font-bold text-cyan-100',
                onClick:function(){props.onInspect(entry);}
              },'Inspect block in Geometry World'));
          })),
          entries.length>perPage && h('div',{className:'mt-2 flex flex-wrap gap-2'},
            h('button',{type:'button',className:navClass+(currentPage===0?' opacity-50':''),'aria-disabled':currentPage===0,onClick:function(){move(-1);}},'Previous cells'),
            h('button',{type:'button',className:navClass+(currentPage===lastPage?' opacity-50':''),'aria-disabled':currentPage===lastPage,onClick:function(){move(1);}},'Next cells'))));
  }
  function normalizePackageReview(candidate, currentBlockCount) {
    if (!candidate || typeof candidate.revisionId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(candidate.revisionId)) return null;
    var details = { revisionId: candidate.revisionId, title: safeText(candidate.title, 100), description: safeText(candidate.description, 500), studentNote: safeText(candidate.studentNote, 300), materialId: materialById(candidate.materialId).id, printTurnDegrees: candidate.printTurnDegrees === 90 ? 90 : 0 };
    details.revisionNumber = Number.isInteger(candidate.revisionNumber) && candidate.revisionNumber >= 2 && candidate.revisionNumber <= 9999 ? candidate.revisionNumber : 2;
    if (Number.isInteger(candidate.previousBlockCount) && candidate.previousBlockCount > 0 && candidate.previousBlockCount <= 1500) details.previousBlockCount = candidate.previousBlockCount;
    var dims = candidate.previousDimensions;
    if (dims && [dims.width, dims.depth, dims.height].every(function (n) { return Number.isFinite(n) && n >= 0 && n <= 1e9; })) details.previousDimensions = { width: dims.width, depth: dims.depth, height: dims.height };
    var reference = printReference(candidate.referencePrint);
    if (reference) details.referencePrint = reference;
    var changes = normalizeBlockChanges(candidate.blockChanges,false);
    if (changes && details.previousBlockCount === changes.removed+changes.modified+changes.unchanged &&
        currentBlockCount === changes.added+changes.modified+changes.unchanged) details.blockChanges = changes;
    return details;
  }
  function editableGeometrySource(source) {
    if(!source || !source.blocks || !source.blocks.length)return null;
    var min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    source.blocks.forEach(function(b){[b.x,b.y,b.z].forEach(function(v,k){min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);});});
    var value={schema:'alloflow-geometry-world/2',title:safeText(source.title,80)||'Geometry World build',coordinateSystem:'x-right,y-up,z-depth',blocks:source.blocks.map(function(b){return {x:b.x-Math.floor((min[0]+max[0])/2),y:b.y-min[1]+1,z:b.z-Math.floor((min[2]+max[2])/2),type:b.type,shape:b.shape,rotation:b.rotation};})};
    var pure=window.StemLab.geometryWorldBuilderPure;
    return pure && pure.normalizeEditableWorld && pure.normalizeEditableWorld(value).ok ? value : null;
  }
  function ensurePrintRuntime() {
    return Promise.all([ensurePrintableModel(), ensurePrim3D()]);
  }

  function ensureThree() {
    if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') return Promise.reject(new Error('The shared 3D engine is unavailable.'));
    return window.StemLab.ensureThree({ orbit: true, orbitRequired: false, failMessage: 'The 3D preview could not be loaded. The accessible preflight report remains available.' });
  }

  // Keep GLTFLoader on the same pinned r128 release as StemLab.ensureThree.
  function ensureGltfLoader(THREE) {
    if (THREE && THREE.GLTFLoader) return Promise.resolve(THREE);
    return loadSidecar(
      [
        selfAsset('../vendor/three-r128/GLTFLoader.js'),
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
        'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'
      ],
      'print-lab-gltf-loader-r128',
      function () { return !!(window.THREE && window.THREE.GLTFLoader); },
      'The GLB reader could not be loaded.'
    ).then(function () { return window.THREE; });
  }

  function exactArrayBuffer(bytes) {
    if (bytes instanceof ArrayBuffer) return bytes;
    if (!bytes || !bytes.buffer) return null;
    if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes.buffer;
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  function readBytes(file) {
    if (file && Number(file.size) > 50 * 1024 * 1024) return Promise.reject(new Error('Files larger than 50 MB cannot be loaded in Print Lab.'));
    if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer().then(function (buffer) { return new Uint8Array(buffer); });
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onload = function () { resolve(new Uint8Array(reader.result)); };
        reader.onerror = function () { reject(new Error('The local file could not be read.')); };
        reader.readAsArrayBuffer(file);
      } catch (error) { reject(error); }
    });
  }

  function utf8(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    try { return decodeURIComponent(escape(out)); } catch (_) { return out; }
  }

  function hasBlockingIssue(report) {
    return !report || (report.issues || []).some(function (item) { return item && item.severity === 'ERROR'; });
  }

  function addReportIssue(report, code, severity, message) {
    var next = Object.assign({}, report || {});
    next.issues = (report && Array.isArray(report.issues) ? report.issues.slice() : []);
    next.issues.push({ code: code, severity: severity, message: message });
    if (severity === 'ERROR') next.status = 'FAIL';
    else if (next.status === 'PASS') next.status = 'WARN';
    return next;
  }

  function inspectObjectCapabilities(root, report) {
    var next = report, found = { skinned: false, instanced: false, morph: false, meshes: 0 };
    if (root && root.traverse) root.traverse(function (node) {
      if (!node) return;
      if (node.isMesh) found.meshes++;
      if (node.isSkinnedMesh) found.skinned = true;
      if (node.isInstancedMesh) found.instanced = true;
      if (node.morphTargetInfluences && node.morphTargetInfluences.length) found.morph = true;
    });
    if (!found.meshes) next = addReportIssue(next, 'NO_PREVIEW_MESH', 'ERROR', 'The GLB scene contains no mesh that this pilot can prepare.');
    if (found.skinned || found.instanced || found.morph) next = addReportIssue(next, 'DEFORMED_GEOMETRY', 'ERROR', 'Animated, skinned, instanced, or morph-target geometry must be converted to a static mesh before submission.');
    return next;
  }

  function parseGlb(THREE, bytes) {
    return ensureGltfLoader(THREE).then(function () {
      return new Promise(function (resolve, reject) {
        try {
          var loader = new THREE.GLTFLoader();
          loader.parse(exactArrayBuffer(bytes), '', function (gltf) {
            var root = gltf && (gltf.scene || (gltf.scenes && gltf.scenes[0]));
            if (!root) { reject(new Error('The GLB has no scene.')); return; }
            resolve(root);
          }, function (error) { reject(error instanceof Error ? error : new Error('The GLB could not be decoded.')); });
        } catch (error) { reject(error); }
      });
    });
  }

  function disposeObject(root, includeTextures) {
    if (!root || !root.traverse) return;
    var geometries = [], materials = [], textures = [];
    root.traverse(function (node) {
      if (node.geometry && geometries.indexOf(node.geometry) === -1) geometries.push(node.geometry);
      var mats = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
      mats.forEach(function (material) {
        if (material && materials.indexOf(material) === -1) materials.push(material);
        if (!includeTextures || !material) return;
        Object.keys(material).forEach(function (key) {
          var value = material[key];
          if (value && value.isTexture && textures.indexOf(value) === -1) textures.push(value);
        });
      });
    });
    geometries.forEach(function (geometry) { try { geometry.dispose(); } catch (_) {} });
    materials.forEach(function (material) { try { material.dispose(); } catch (_) {} });
    textures.forEach(function (texture) { try { texture.dispose(); } catch (_) {} });
  }

  function cloneForPreview(root) {
    if (!root || typeof root.clone !== 'function') return null;
    var cloned = root.clone(true), originalMeshes = [], clonedMeshes = [];
    root.traverse(function (node) { if (node && node.isMesh) originalMeshes.push(node); });
    cloned.traverse(function (node) { if (node && node.isMesh) clonedMeshes.push(node); });
    clonedMeshes.forEach(function (node, index) {
      var original = originalMeshes[index];
      if (original && original.geometry && original.geometry.clone) node.geometry = original.geometry.clone();
      if (original && original.material) {
        node.material = Array.isArray(original.material)
          ? original.material.map(function (material) { return material && material.clone ? material.clone() : material; })
          : (original.material.clone ? original.material.clone() : original.material);
      }
    });
    return cloned;
  }

  function makeModelObject(THREE, format, recipe, bytes, glbRoot, unitMm) {
    var P3D = window.AlloModules && window.AlloModules.Prim3D;
    var Printable = window.AlloModules && window.AlloModules.PrintableModel;
    if (format === 'RECIPE') return P3D && P3D.buildObject(THREE, recipe, { unit: unitMm });
    if (format === 'STL') return Printable && Printable.buildStlObject(THREE, bytes, unitMm);
    if (format === 'GLB' && glbRoot) {
      var cloned = cloneForPreview(glbRoot);
      if (cloned && cloned.scale && cloned.scale.multiplyScalar) cloned.scale.multiplyScalar(unitMm);
      return cloned;
    }
    return null;
  }

  function centerAndGround(THREE, object) {
    if (!object) return null;
    if (object.updateMatrixWorld) object.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty && box.isEmpty()) return null;
    var center = box.getCenter(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= box.min.y;
    if (object.updateMatrixWorld) object.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(object);
  }

  function downloadBlob(blob, filename) {
    if (typeof document === 'undefined' || !document.body) return;
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; link.style.display = 'none';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1500);
  }

  function aiText(response) {
    if (typeof response === 'string') return response;
    if (response && typeof response.text === 'string') return response.text;
    if (response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      return response.candidates[0].content.parts.map(function (part) { return part.text || ''; }).join('\n');
    }
    return String(response == null ? '' : response);
  }

  function materialById(id) {
    for (var i = 0; i < MATERIALS.length; i++) if (MATERIALS[i].id === id) return MATERIALS[i];
    return MATERIALS[0];
  }

  function PrintPreview(props) {
    var React = props.React, h = React.createElement;
    var canvasRef = React.useRef(null), controllerRef = React.useRef(null);
    // Fullscreen stage: the whole preview section, so the rotate / zoom / reset
    // buttons come with the model. The flag follows the stage's marker because
    // Escape leaves fullscreen without passing through the button.
    var fsStageRef = React.useRef(null);
    var _fs = React.useState(false), isFs = _fs[0], setIsFs = _fs[1];
    var _status = React.useState('loading'), status = _status[0], setStatus = _status[1];
    var signature = [props.format, props.unitMm, props.revision, props.glbRoot ? 'glb' : '', props.bytes ? props.bytes.byteLength : 0].join('|');
    // A lost WebGL context (GPU reset, low-memory eviction) swaps the canvas for a
    // restart panel; glGen is what Restart bumps.
    var _glLost = React.useState(false), glLost = _glLost[0], setGlLost = _glLost[1];
    var _glGen = React.useState(0), glGen = _glGen[0], setGlGen = _glGen[1];
    // Every rebuild gets a FRESH canvas: teardown force-loses the old context, and a
    // canvas hands that dead context to the next renderer, so the preview failed.
    var previewDeps = [signature, props.recipe, props.bytes, props.glbRoot, props.ready, glGen];
    var canvasGenRef = React.useRef({ deps: null, n: 0 }), canvasGen = canvasGenRef.current;
    if (!canvasGen.deps || previewDeps.some(function (v, i) { return v !== canvasGen.deps[i]; })) { canvasGen.deps = previewDeps; canvasGen.n++; }

    React.useEffect(function () {
      var alive = true, renderer = null, scene = null, controls = null, model = null, frame = 0, resizeObserver = null, visibilityHandler = null;
      var canvas = canvasRef.current;
      if (!canvas || !props.ready) { setStatus(props.ready ? 'empty' : 'loading'); return function () { alive = false; }; }
      setStatus('loading');
      ensureThree().then(function (THREE) {
        if (!alive || !canvas.isConnected) return;
        try {
          renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
          canvas.addEventListener('webglcontextlost', function (ev) {
            // A teardown that already removed the canvas can still fire this.
            if (!canvas.isConnected) return;
            ev.preventDefault();
            // Our own teardown force-loses the context; that is not a failure.
            if (canvas._printLabTearingDown || !alive) return;
            teardown();
            setTimeout(function () { if (canvas.isConnected) { setGlLost(true); setStatus('failed'); } }, 0);
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          var isContrastView = !!props.isContrast;
          renderer.setClearColor(isContrastView ? 0x000000 : 0x060e1c, 1);
          if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
          if (!isContrastView && THREE.ACESFilmicToneMapping !== undefined) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.08;
          }
          var wantShadow = !isContrastView && renderer.shadowMap && THREE.PCFSoftShadowMap !== undefined;
          if (wantShadow) {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          }
          scene = new THREE.Scene();
          if (!isContrastView && typeof THREE.Fog === 'function') {
            scene.fog = new THREE.Fog(0x060e1c, 420, 1800);
          }
          var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100000);
          var hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, isContrastView ? 1.1 : 0.95);
          scene.add(hemiLight);
          var key = new THREE.DirectionalLight(0xfff7ed, isContrastView ? 0.85 : 1.05);
          key.position.set(160, 260, 180);
          if (wantShadow) {
            key.castShadow = true;
            key.shadow.mapSize.width = 1024;
            key.shadow.mapSize.height = 1024;
            key.shadow.bias = -0.0008;
          }
          scene.add(key);
          var rimLight = new THREE.DirectionalLight(0x38bdf8, isContrastView ? 0.2 : 0.56);
          rimLight.position.set(-180, 140, -170);
          scene.add(rimLight);
          var warmBounce = new THREE.DirectionalLight(0xfdba74, isContrastView ? 0 : 0.24);
          warmBounce.position.set(60, 40, -140);
          scene.add(warmBounce);

          model = makeModelObject(THREE, props.format, props.recipe, props.bytes, props.glbRoot, props.unitMm);
          if (!model) { setStatus('empty'); return; }
          if (wantShadow && model.traverse) {
            model.traverse(function (node) {
              if (node && node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
            });
          }
          scene.add(model);
          var bounds = centerAndGround(THREE, model);
          if (!bounds) { setStatus('empty'); return; }
          var size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
          var radius = Math.max(1, size.length() * 0.55);

          // ── Printer profile, heated PEI build plate, brushed-aluminum gantry & hotend ──
          var prof = props.profile || DEFAULT_PRINTER_PROFILE;
          var bedW = Math.max(80, Math.min(480, Number(prof.bedWidthMm) || 220));
          var bedD = Math.max(80, Math.min(480, Number(prof.bedDepthMm) || 220));
          var bedH = Math.max(80, Math.min(500, Number(prof.bedHeightMm) || 250));
          var clearMm = Math.max(0, Math.min(30, Number(prof.planningClearanceMm) || 5));
          var bedSpan = Math.max(bedW, bedD, Math.max(size.x, size.z) * 1.45);
          if (wantShadow && key.shadow && key.shadow.camera) {
            var sHalf = Math.max(bedSpan * 0.72, radius * 1.6);
            key.shadow.camera.left = -sHalf; key.shadow.camera.right = sHalf;
            key.shadow.camera.top = sHalf; key.shadow.camera.bottom = -sHalf;
            key.shadow.camera.near = 10; key.shadow.camera.far = sHalf * 6;
            key.position.set(sHalf * 0.9, sHalf * 1.55, sHalf * 1.05);
          }

          var hasStd = typeof THREE.MeshStandardMaterial === 'function';
          var hasPhys = typeof THREE.MeshPhysicalMaterial === 'function';
          var hasDataTex = typeof THREE.DataTexture === 'function';
          var hasShaders = !isContrastView && typeof THREE.ShaderMaterial === 'function';
          var printShaderTime = { value: 2.2 };
          var activePrintY = Math.max(0.5, size.y * 0.72);
          var filamentUniforms = {
            uTime: printShaderTime,
            uActiveY: { value: activePrintY },
            uModelHeight: { value: Math.max(1.0, size.y) },
            uLayerFreq: { value: Math.max(1.4, Math.min(8.0, 26.0 / Math.max(4.0, size.y))) },
            uNozzlePos: { value: new THREE.Vector3(Math.max(size.x * 0.35, 8), activePrintY, 0) }
          };

          // GLSL ES 1.00 molten-to-cooled FDM layer-line & thermal gradient shader on 3D printed model
          if (hasShaders && model && model.traverse) {
            var patchedMats = [];
            model.traverse(function (node) {
              if (!node || !node.isMesh || !node.material) return;
              var mList = Array.isArray(node.material) ? node.material : [node.material];
              mList.forEach(function (mat) {
                if (!mat || mat.isShaderMaterial || patchedMats.indexOf(mat) !== -1) return;
                patchedMats.push(mat);
                mat.onBeforeCompile = function (shader) {
                  shader.uniforms.uTime = filamentUniforms.uTime;
                  shader.uniforms.uActiveY = filamentUniforms.uActiveY;
                  shader.uniforms.uModelHeight = filamentUniforms.uModelHeight;
                  shader.uniforms.uLayerFreq = filamentUniforms.uLayerFreq;
                  shader.uniforms.uNozzlePos = filamentUniforms.uNozzlePos;
                  shader.vertexShader = shader.vertexShader
                    .replace('#include <common>', '#include <common>\nvarying vec3 vPrintWorldPos;\nvarying vec3 vPrintWorldN;')
                    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPrintWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPrintWorldN = normalize(mat3(modelMatrix) * objectNormal);');
                  shader.fragmentShader = shader.fragmentShader
                    .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uActiveY;\nuniform float uModelHeight;\nuniform float uLayerFreq;\nuniform vec3 uNozzlePos;\nvarying vec3 vPrintWorldPos;\nvarying vec3 vPrintWorldN;')
                    .replace('#include <dithering_fragment>', [
                      'vec3 pN = normalize(vPrintWorldN);',
                      'vec3 pV = normalize(cameraPosition - vPrintWorldPos);',
                      'float pFres = pow(1.0 - clamp(abs(dot(pN, pV)), 0.0, 1.0), 2.8);',
                      'float pSide = 1.0 - step(0.92, abs(pN.y));',
                      'float pLayer = sin(vPrintWorldPos.y * uLayerFreq * 6.2831853);',
                      'gl_FragColor.rgb *= (1.0 + pLayer * 0.065 * pSide);',
                      'float bandSpan = max(1.8, uModelHeight * 0.14);',
                      'float distY = abs(vPrintWorldPos.y - uActiveY);',
                      'float layerHeat = exp(-pow(distY / bandSpan, 2.0));',
                      'float coolTail = smoothstep(uActiveY - bandSpan * 2.6, uActiveY, vPrintWorldPos.y) * step(vPrintWorldPos.y, uActiveY + bandSpan * 0.65);',
                      'float nozzleDist = length(vPrintWorldPos - uNozzlePos);',
                      'float nozzleHot = exp(-pow(nozzleDist / max(4.0, uModelHeight * 0.35), 2.0));',
                      'float thermal = clamp(layerHeat * 0.72 + coolTail * 0.24 + nozzleHot * 0.65, 0.0, 1.25);',
                      'vec3 ember = mix(vec3(0.92, 0.28, 0.05), vec3(1.0, 0.72, 0.18), clamp(thermal, 0.0, 1.0));',
                      'ember = mix(ember, vec3(1.0, 0.96, 0.76), smoothstep(0.75, 1.2, thermal));',
                      'float pulse = 0.88 + 0.12 * sin(uTime * 3.8 + vPrintWorldPos.x * 0.18);',
                      'gl_FragColor.rgb += ember * thermal * 0.42 * pulse + vec3(0.60, 0.85, 1.0) * pFres * 0.18;',
                      '#include <dithering_fragment>'
                    ].join('\n'));
                };
                mat.customProgramCacheKey = function () { return 'printlab-fdm-thermal-v1'; };
              });
            });
          }

          // Procedural brushed-aluminum texture for anodized gantry extrusions
          var brushedTex = null;
          if (!isContrastView && hasDataTex) {
            var bSz = 64, bBuf = new Uint8Array(bSz * bSz * 4);
            for (var by = 0; by < bSz; by++) {
              var streak = ((by * 41 + (by % 7) * 13) % 24) - 12;
              for (var bx = 0; bx < bSz; bx++) {
                var grain = (((bx * 17 + by * 31) ^ (bx * 5)) & 15) - 7;
                var bv = Math.max(178, Math.min(255, 220 + streak + Math.round(grain * 0.6)));
                var bi = (by * bSz + bx) * 4;
                bBuf[bi] = bv; bBuf[bi + 1] = Math.min(255, bv + 3); bBuf[bi + 2] = Math.min(255, bv + 8); bBuf[bi + 3] = 255;
              }
            }
            brushedTex = new THREE.DataTexture(bBuf, bSz, bSz, THREE.RGBAFormat);
            brushedTex.wrapS = THREE.RepeatWrapping; brushedTex.wrapT = THREE.RepeatWrapping;
            brushedTex.repeat.set(3, 3);
            brushedTex.needsUpdate = true;
          }

          // Procedural heated PEI build-plate texture (calibrated 10mm grid + PEI micro-speckle)
          var bedTex = null;
          if (!isContrastView && hasDataTex) {
            var pSz = 128, pBuf = new Uint8Array(pSz * pSz * 4);
            for (var py = 0; py < pSz; py++) {
              for (var px = 0; px < pSz; px++) {
                var major = (px % 32 === 0 || py % 32 === 0);
                var minor = (px % 8 === 0 || py % 8 === 0);
                var speck = (((px * 73 ^ py * 137) + px * py) & 7) - 3;
                var pi = (py * pSz + px) * 4;
                if (major) { pBuf[pi] = 56; pBuf[pi + 1] = 175; pBuf[pi + 2] = 228; }
                else if (minor) { pBuf[pi] = 38; pBuf[pi + 1] = 66; pBuf[pi + 2] = 96; }
                else { pBuf[pi] = Math.max(10, 18 + speck); pBuf[pi + 1] = Math.max(16, 26 + speck); pBuf[pi + 2] = Math.max(24, 39 + speck); }
                pBuf[pi + 3] = 255;
              }
            }
            bedTex = new THREE.DataTexture(pBuf, pSz, pSz, THREE.RGBAFormat);
            bedTex.wrapS = THREE.RepeatWrapping; bedTex.wrapT = THREE.RepeatWrapping;
            bedTex.repeat.set(Math.max(2, Math.round(bedW / 40)), Math.max(2, Math.round(bedD / 40)));
            bedTex.needsUpdate = true;
          }

          // Soft radial shadow texture for grounded contact beneath the model
          var contactTex = null;
          if (!isContrastView && hasDataTex) {
            var cSz = 64, cBuf = new Uint8Array(cSz * cSz * 4), cHalf = (cSz - 1) / 2;
            for (var cy = 0; cy < cSz; cy++) {
              for (var cx = 0; cx < cSz; cx++) {
                var cd = Math.min(1, Math.sqrt(Math.pow((cx - cHalf) / cHalf, 2) + Math.pow((cy - cHalf) / cHalf, 2)));
                var ca = Math.pow(Math.max(0, 1 - cd), 2.1);
                var ci = (cy * cSz + cx) * 4;
                cBuf[ci] = 2; cBuf[ci + 1] = 6; cBuf[ci + 2] = 18; cBuf[ci + 3] = Math.round(ca * 170);
              }
            }
            contactTex = new THREE.DataTexture(cBuf, cSz, cSz, THREE.RGBAFormat);
            contactTex.needsUpdate = true;
          }

          var plateMat = hasPhys && !isContrastView
            ? new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, map: bedTex, roughness: 0.42, metalness: 0.34, clearcoat: 0.35, clearcoatRoughness: 0.35 })
            : (hasStd && !isContrastView
              ? new THREE.MeshStandardMaterial({ color: 0xdbeafe, map: bedTex, roughness: 0.46, metalness: 0.32 })
              : new THREE.MeshBasicMaterial({ color: isContrastView ? 0x111111 : 0x1e293b }));
          if (hasShaders && plateMat && !plateMat.isMeshBasicMaterial) {
            var bedHalfVec = new THREE.Vector2(bedW * 0.5, bedD * 0.5);
            plateMat.onBeforeCompile = function (shader) {
              shader.uniforms.uTime = printShaderTime;
              shader.uniforms.uBedHalf = { value: bedHalfVec };
              shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vPeiWorldPos;\nvarying vec3 vPeiWorldN;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPeiWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPeiWorldN = normalize(mat3(modelMatrix) * objectNormal);');
              shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec2 uBedHalf;\nvarying vec3 vPeiWorldPos;\nvarying vec3 vPeiWorldN;\nfloat peiHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
                .replace('#include <dithering_fragment>', [
                  'vec3 bN = normalize(vPeiWorldN);',
                  'float topMask = step(0.7, bN.y);',
                  'vec2 bNorm = vPeiWorldPos.xz / max(uBedHalf, vec2(1.0));',
                  'float bRad = length(bNorm);',
                  'float heatCore = smoothstep(1.08, 0.08, bRad);',
                  'float heatRipple = 0.86 + 0.14 * sin(bRad * 9.0 - uTime * 1.4);',
                  'vec3 bV = normalize(cameraPosition - vPeiWorldPos);',
                  'float bFres = pow(1.0 - clamp(dot(bN, bV), 0.0, 1.0), 3.2);',
                  'float speckle = peiHash(floor(vPeiWorldPos.xz * 2.6));',
                  'vec3 thermalGlow = mix(vec3(0.45, 0.12, 0.03), vec3(0.95, 0.42, 0.10), heatCore) * heatCore * heatRipple * 0.24;',
                  'vec3 peiSheen = vec3(0.55, 0.82, 0.98) * bFres * (0.18 + 0.14 * speckle);',
                  'gl_FragColor.rgb += (thermalGlow + peiSheen) * topMask;',
                  '#include <dithering_fragment>'
                ].join('\n'));
            };
            plateMat.customProgramCacheKey = function () { return 'printlab-pei-heat-v1'; };
          }
          var plateThick = Math.max(2.4, bedSpan * 0.018);
          var buildPlate = new THREE.Mesh(new THREE.BoxGeometry(bedW, plateThick, bedD), plateMat);
          buildPlate.position.set(0, -plateThick / 2 - 0.06, 0);
          if (wantShadow) buildPlate.receiveShadow = true;
          scene.add(buildPlate);

          // Warm heated-bed perimeter glow frame (visualizes heated bed thermal rim)
          var heaterRim = new THREE.Mesh(
            new THREE.BoxGeometry(bedW + 2.4, plateThick * 0.55, bedD + 2.4),
            hasStd && !isContrastView
              ? new THREE.MeshStandardMaterial({ color: 0x334155, emissive: new THREE.Color(0x7c2d12), emissiveIntensity: 0.65, roughness: 0.35, metalness: 0.72 })
              : new THREE.MeshBasicMaterial({ color: isContrastView ? 0xffff00 : 0x9a3412 })
          );
          heaterRim.position.set(0, -plateThick * 0.78 - 0.06, 0);
          scene.add(heaterRim);

          // Grounded contact shadow directly beneath the model
          if (contactTex) {
            var contactShadow = new THREE.Mesh(
              new THREE.PlaneGeometry(Math.max(size.x * 1.55, 24), Math.max(size.z * 1.55, 24)),
              new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, opacity: 0.62, depthWrite: false })
            );
            contactShadow.rotation.x = -Math.PI / 2;
            contactShadow.position.set(0, 0.03, 0);
            scene.add(contactShadow);
          }

          // Luminous laser bed-leveling calibration grid + clearance border
          var grid = new THREE.GridHelper(bedSpan, Math.max(10, Math.round(bedSpan / 10)), isContrastView ? 0xffff00 : 0x38bdf8, isContrastView ? 0x555555 : 0x1e3a5f);
          grid.position.y = 0.02;
          if (grid.material && !Array.isArray(grid.material)) {
            grid.material.transparent = true;
            grid.material.opacity = isContrastView ? 0.75 : 0.42;
          }
          scene.add(grid);

          var laserPts = [];
          var cw = Math.max(10, bedW / 2 - clearMm), cd = Math.max(10, bedD / 2 - clearMm);
          laserPts.push(
            new THREE.Vector3(-cw, 0.08, -cd), new THREE.Vector3(cw, 0.08, -cd),
            new THREE.Vector3(cw, 0.08, -cd), new THREE.Vector3(cw, 0.08, cd),
            new THREE.Vector3(cw, 0.08, cd), new THREE.Vector3(-cw, 0.08, cd),
            new THREE.Vector3(-cw, 0.08, cd), new THREE.Vector3(-cw, 0.08, -cd)
          );
          var clearanceLine = null;
          if (typeof THREE.BufferGeometry === 'function' && typeof THREE.LineSegments === 'function') {
            var clGeo = new THREE.BufferGeometry().setFromPoints(laserPts);
            var clMat = new THREE.LineBasicMaterial({
              color: isContrastView ? 0x00ffff : 0x22d3ee,
              transparent: true, opacity: isContrastView ? 0.95 : 0.78,
              blending: isContrastView ? THREE.NormalBlending : THREE.AdditiveBlending
            });
            clearanceLine = new THREE.LineSegments(clGeo, clMat);
            scene.add(clearanceLine);
          }

          // Anodized brushed-aluminum extrusion gantry & hotend assembly (frames bed cleanly behind model)
          var aluMat = hasStd && !isContrastView
            ? new THREE.MeshStandardMaterial({ color: 0xb8c4d4, map: brushedTex, roughness: 0.30, metalness: 0.84 })
            : new THREE.MeshBasicMaterial({ color: isContrastView ? 0xffffff : 0x94a3b8 });
          var darkSlotMat = hasStd && !isContrastView
            ? new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.60 })
            : new THREE.MeshBasicMaterial({ color: 0x1e293b });
          var brassMat = hasStd && !isContrastView
            ? new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.24, metalness: 0.88, emissive: new THREE.Color(0x7c2d12), emissiveIntensity: 0.45 })
            : new THREE.MeshBasicMaterial({ color: 0xf59e0b });

          var gantryH = Math.max(size.y + Math.max(28, radius * 0.65), Math.min(bedH * 0.78, 175));
          var railThick = Math.max(4.5, bedSpan * 0.028);
          var postX = bedW / 2 + railThick * 1.1;
          var gantryZ = -bedD * 0.36;
          var gantryGroup = new THREE.Group();
          [-postX, postX].forEach(function (px) {
            var post = new THREE.Mesh(new THREE.BoxGeometry(railThick, gantryH, railThick), aluMat);
            post.position.set(px, gantryH / 2 - plateThick * 0.4, gantryZ);
            gantryGroup.add(post);
            var vSlot = new THREE.Mesh(new THREE.BoxGeometry(railThick * 0.28, gantryH * 0.94, railThick * 1.04), darkSlotMat);
            vSlot.position.set(px, gantryH / 2 - plateThick * 0.4, gantryZ);
            gantryGroup.add(vSlot);
          });
          var topBridge = new THREE.Mesh(new THREE.BoxGeometry(postX * 2 + railThick, railThick, railThick), aluMat);
          topBridge.position.set(0, gantryH - plateThick * 0.4, gantryZ);
          gantryGroup.add(topBridge);

          // X-carriage rail & warm glowing hotend nozzle hovering near active print layer
          var xRailY = Math.min(gantryH - railThick * 2.2, Math.max(size.y + railThick * 2.1, 28));
          var xRail = new THREE.Mesh(new THREE.BoxGeometry(postX * 2, railThick * 0.75, railThick * 0.75), aluMat);
          xRail.position.set(0, xRailY, gantryZ + railThick * 0.6);
          gantryGroup.add(xRail);

          var hotendGroup = new THREE.Group();
          var nozzleStartX = Math.min(postX - railThick * 2.2, Math.max(size.x * 0.42, 14));
          hotendGroup.position.set(nozzleStartX, xRailY, gantryZ + railThick * 1.15);
          var carriageBlock = new THREE.Mesh(new THREE.BoxGeometry(railThick * 2.2, railThick * 1.8, railThick * 1.4), darkSlotMat);
          hotendGroup.add(carriageBlock);
          var heatsink = new THREE.Mesh(new THREE.CylinderGeometry(railThick * 0.55, railThick * 0.55, railThick * 1.3, 14), aluMat);
          heatsink.position.y = -railThick * 1.15;
          hotendGroup.add(heatsink);
          var nozzleCone = new THREE.Mesh(new THREE.ConeGeometry(railThick * 0.36, railThick * 0.85, 14), brassMat);
          nozzleCone.rotation.x = Math.PI;
          nozzleCone.position.y = -railThick * 2.1;
          hotendGroup.add(nozzleCone);
          var moltenTipMat = hasShaders
            ? new THREE.ShaderMaterial({
                uniforms: { uTime: printShaderTime },
                vertexShader: [
                  'varying vec3 vWorldPos;',
                  'varying vec3 vWorldN;',
                  'void main() {',
                  '  vec4 wp = modelMatrix * vec4(position, 1.0);',
                  '  vWorldPos = wp.xyz;',
                  '  vWorldN = normalize(mat3(modelMatrix) * normal);',
                  '  gl_Position = projectionMatrix * viewMatrix * wp;',
                  '}'
                ].join('\n'),
                fragmentShader: [
                  'uniform float uTime;',
                  'varying vec3 vWorldPos;',
                  'varying vec3 vWorldN;',
                  'void main() {',
                  '  vec3 N = normalize(vWorldN);',
                  '  vec3 V = normalize(cameraPosition - vWorldPos);',
                  '  float core = clamp(dot(N, V), 0.0, 1.0);',
                  '  float pulse = 0.85 + 0.15 * sin(uTime * 5.2);',
                  '  vec3 col = mix(vec3(1.0, 0.36, 0.06), vec3(1.0, 0.94, 0.72), pow(core, 1.4));',
                  '  gl_FragColor = vec4(col * (1.15 * pulse), 0.96);',
                  '}'
                ].join('\n'),
                transparent: true
              })
            : new THREE.MeshBasicMaterial({ color: isContrastView ? 0xffff00 : 0xffa94d });
          var moltenTip = new THREE.Mesh(new THREE.SphereGeometry(railThick * 0.22, 14, 10), moltenTipMat);
          moltenTip.position.y = -railThick * 2.55;
          hotendGroup.add(moltenTip);
          var nozzleLight = !isContrastView && typeof THREE.PointLight === 'function'
            ? new THREE.PointLight(0xff8a2b, 1.35, Math.max(120, bedSpan * 0.95))
            : null;
          if (nozzleLight) {
            nozzleLight.position.set(0, -railThick * 2.9, railThick * 0.6);
            hotendGroup.add(nozzleLight);
          }
          gantryGroup.add(hotendGroup);
          scene.add(gantryGroup);

          // Luminous active toolpath slice contour loop & laser leveling scan bar
          var sliceLoop = null;
          var sliceY = Math.max(0.5, size.y * 0.72);
          if (typeof THREE.BufferGeometry === 'function' && typeof THREE.LineLoop === 'function') {
            var sx = Math.max(4, size.x * 0.52), sz = Math.max(4, size.z * 0.52);
            var loopPts = [
              new THREE.Vector3(-sx, 0, -sz), new THREE.Vector3(sx, 0, -sz),
              new THREE.Vector3(sx, 0, sz), new THREE.Vector3(-sx, 0, sz)
            ];
            sliceLoop = new THREE.LineLoop(
              new THREE.BufferGeometry().setFromPoints(loopPts),
              new THREE.LineBasicMaterial({
                color: isContrastView ? 0xffff00 : 0xfb923c,
                transparent: true, opacity: isContrastView ? 0.9 : 0.72,
                blending: isContrastView ? THREE.NormalBlending : THREE.AdditiveBlending
              })
            );
            sliceLoop.position.y = sliceY;
            scene.add(sliceLoop);
          }
          var laserSweep = null;
          if (!isContrastView) {
            var laserMat = hasShaders
              ? new THREE.ShaderMaterial({
                  uniforms: {
                    uTime: printShaderTime,
                    uScanColor: { value: new THREE.Color(0x22d3ee) },
                    uCoreColor: { value: new THREE.Color(0xecfeff) },
                    uOpacity: { value: 0.72 }
                  },
                  vertexShader: [
                    'varying vec2 vUv;',
                    'void main() {',
                    '  vUv = uv;',
                    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                    '}'
                  ].join('\n'),
                  fragmentShader: [
                    'uniform float uTime;',
                    'uniform vec3 uScanColor;',
                    'uniform vec3 uCoreColor;',
                    'uniform float uOpacity;',
                    'varying vec2 vUv;',
                    'void main() {',
                    '  float dist = abs(vUv.y - 0.5) * 2.0;',
                    '  float beamCore = exp(-pow(dist * 6.5, 2.0));',
                    '  float softAura = exp(-dist * 3.2);',
                    '  float probeDots = pow(0.5 + 0.5 * sin(vUv.x * 56.548 - uTime * 2.8), 10.0);',
                    '  float scanDash = 0.65 + 0.35 * sin(vUv.x * 113.0 + uTime * 6.0);',
                    '  float edgeFade = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);',
                    '  vec3 col = mix(uScanColor, uCoreColor, clamp(beamCore * 0.85 + probeDots * 0.55, 0.0, 1.0));',
                    '  float alpha = clamp((beamCore * 0.92 + softAura * 0.38 * scanDash + probeDots * softAura * 0.45) * edgeFade * uOpacity, 0.0, 0.95);',
                    '  gl_FragColor = vec4(col * (1.0 + beamCore * 0.55), alpha);',
                    '}'
                  ].join('\n'),
                  transparent: true,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                  blending: THREE.AdditiveBlending
                })
              : new THREE.MeshBasicMaterial({
                  color: 0x38bdf8, transparent: true, opacity: 0.22,
                  side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
                });
            laserSweep = new THREE.Mesh(
              new THREE.PlaneGeometry(bedW - clearMm * 2, hasShaders ? Math.max(12, bedD * 0.14) : Math.max(2.2, bedD * 0.018)),
              laserMat
            );
            laserSweep.rotation.x = -Math.PI / 2;
            laserSweep.position.set(0, 0.14, 0);
            if (hasShaders) {
              var curtainH = Math.max(16, Math.min(48, size.y * 0.45));
              var curtainMat = new THREE.ShaderMaterial({
                uniforms: { uTime: printShaderTime },
                vertexShader: [
                  'varying vec2 vUv;',
                  'void main() {',
                  '  vUv = uv;',
                  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                  '}'
                ].join('\n'),
                fragmentShader: [
                  'uniform float uTime;',
                  'varying vec2 vUv;',
                  'void main() {',
                  '  float vFade = pow(1.0 - vUv.y, 2.4);',
                  '  float hFade = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);',
                  '  float rays = 0.65 + 0.35 * sin(vUv.x * 44.0 + uTime * 3.5);',
                  '  vec3 col = mix(vec3(0.08, 0.78, 0.95), vec3(0.85, 0.99, 1.0), pow(1.0 - vUv.y, 4.0));',
                  '  gl_FragColor = vec4(col, clamp(vFade * hFade * rays * 0.34, 0.0, 0.48));',
                  '}'
                ].join('\n'),
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
              });
              var laserCurtain = new THREE.Mesh(new THREE.PlaneGeometry(bedW - clearMm * 2, curtainH), curtainMat);
              laserCurtain.rotation.x = Math.PI / 2;
              laserCurtain.position.set(0, 0, curtainH * 0.5);
              laserSweep.add(laserCurtain);
            }
            scene.add(laserSweep);
          }

          var viewDirection=new THREE.Vector3(1.35,0.9,1.6).normalize();
          function fitCamera(){
            var vertical=camera.fov*Math.PI/360, horizontal=Math.atan(Math.tan(vertical)*camera.aspect);
            var distance=radius/Math.sin(Math.min(vertical,horizontal))*1.08;
            camera.position.copy(center).addScaledVector(viewDirection,distance);camera.lookAt(center);
            if(controls){controls.target.copy(center);controls.update();}
          }
          fitCamera();
          camera.near = Math.max(0.01, radius / 1000); camera.far = Math.max(radius * 30 + 100, bedSpan * 12); camera.lookAt(center); camera.updateProjectionMatrix();
          if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, canvas);
            controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
            controls.target.copy(center); controls.minDistance = radius * 0.55; controls.maxDistance = radius * 8; controls.update();
          }
          function resize() {
            if (!renderer || !alive) return;
            var width = Math.max(1, canvas.clientWidth || 560), height = Math.max(1, canvas.clientHeight || 360);
            renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();fitCamera();
          }
          resize();
          if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); }
          var prefersReducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          var animStart = performance.now();
          function renderOnce() {
            if (!alive || !renderer || document.hidden) return;
            if (!prefersReducedMotion) {
              var elapsedSec = (performance.now() - animStart) / 1000;
              printShaderTime.value = 2.2 + elapsedSec;
              var travelLim = Math.max(8, Math.min(postX - railThick * 2.2, size.x * 0.55 + 10));
              hotendGroup.position.x = Math.sin(elapsedSec * 0.85) * travelLim;
              if (nozzleLight) nozzleLight.intensity = 1.2 + Math.sin(elapsedSec * 4.2) * 0.25;
              var curSliceY = activePrintY;
              if (sliceLoop) {
                curSliceY = 0.4 + ((elapsedSec * 0.16) % 1) * Math.max(1, size.y - 0.6);
                sliceLoop.position.y = curSliceY;
              }
              filamentUniforms.uActiveY.value = curSliceY;
              filamentUniforms.uNozzlePos.value.set(hotendGroup.position.x * 0.65, curSliceY, Math.cos(elapsedSec * 0.85) * Math.max(2, size.z * 0.28));
              if (laserSweep) {
                laserSweep.position.z = Math.sin(elapsedSec * 0.65) * (bedD * 0.42);
                if (laserSweep.material && laserSweep.material.uniforms && laserSweep.material.uniforms.uOpacity) {
                  laserSweep.material.uniforms.uOpacity.value = 0.52 + Math.abs(Math.cos(elapsedSec * 0.65)) * 0.34;
                } else if (laserSweep.material) {
                  laserSweep.material.opacity = 0.14 + Math.abs(Math.cos(elapsedSec * 0.65)) * 0.14;
                }
              }
            } else if (laserSweep) {
              laserSweep.visible = false;
            }
            if (controls) controls.update();
            renderer.render(scene, camera);
          }
          function draw() {
            if (!alive || !renderer) return;
            renderOnce();
            if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
          }
          if (prefersReducedMotion && controls && typeof controls.addEventListener === 'function') {
            controls.addEventListener('change', renderOnce);
          }
          controllerRef.current = {
            rotate: function (delta) { if (model) model.rotation.y += delta; if (prefersReducedMotion) renderOnce(); },
            zoom: function (factor) {
              if (!camera) return;
              var target = controls ? controls.target : center;
              camera.position.sub(target).multiplyScalar(factor).add(target);
              if (controls) controls.update();
              if (prefersReducedMotion) renderOnce();
            },
            reset: function () {
              if (model) model.rotation.y = 0;
              fitCamera();
              camera.lookAt(center); if (controls) { controls.target.copy(center); controls.update(); }
              if (prefersReducedMotion) renderOnce();
            }
          };
          visibilityHandler = function () { if (!document.hidden && renderer) renderer.render(scene, camera); };
          document.addEventListener('visibilitychange', visibilityHandler);
          setStatus('ready'); draw();
        } catch (error) { setStatus('failed'); }
      }).catch(function () { if (alive) setStatus('failed'); });
      // One teardown for unmount, a rebuild and a lost context.
      function teardown() {
        if (!alive) return;
        alive = false; controllerRef.current = null;
        if (frame) cancelAnimationFrame(frame);
        if (resizeObserver) resizeObserver.disconnect();
        if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
        if (controls && controls.dispose) { try { controls.dispose(); } catch (_) {} }
        if (model) disposeObject(model, false);
        if (scene) {
          var _plTex = [];
          scene.traverse(function (node) {
            if (node === model) return;
            if (node.geometry && node.geometry.dispose) { try { node.geometry.dispose(); } catch (_) {} }
            var mats = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
            mats.forEach(function (m) {
              if (!m) return;
              ['map', 'bumpMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'normalMap'].forEach(function (k) {
                var tx = m[k];
                if (tx && tx.dispose && _plTex.indexOf(tx) === -1) _plTex.push(tx);
              });
              if (m.dispose) { try { m.dispose(); } catch (_) {} }
            });
          });
          _plTex.forEach(function (tx) { try { tx.dispose(); } catch (_) {} });
        }
        if (renderer) {
          try { renderer.dispose(); } catch (_) {}
          // Flag first: forcing the loss fires webglcontextlost on this canvas.
          canvas._printLabTearingDown = true;
          try { var gl = renderer.getContext(); if (!(gl && gl.isContextLost && gl.isContextLost())) renderer.forceContextLoss(); } catch (_) {}
        }
      }
      return teardown;
    }, previewDeps);

    React.useEffect(function () {
      var el = fsStageRef.current;
      if (!el || typeof MutationObserver !== 'function') return;
      var sync = function () {
        setIsFs(!!(el.hasAttribute('data-allo-fullscreen-active')
          || document.fullscreenElement === el
          || document.webkitFullscreenElement === el));
      };
      var mo = new MutationObserver(sync);
      mo.observe(el, { attributes: true, attributeFilter: ['data-allo-fullscreen-active'] });
      document.addEventListener('fullscreenchange', sync);
      document.addEventListener('webkitfullscreenchange', sync);
      sync();
      return function () {
        mo.disconnect();
        document.removeEventListener('fullscreenchange', sync);
        document.removeEventListener('webkitfullscreenchange', sync);
      };
    }, []);

    function useController(method, value) { return function () { var c = controllerRef.current; if (c && c[method]) c[method](value); }; }
    return h('section', { ref: fsStageRef, 'data-allo-fs-stage': 'true',
      className: 'rounded-2xl border border-slate-700 bg-slate-950 p-3' + (isFs ? ' flex flex-col' : ''),
      'aria-labelledby': 'print-lab-preview-title' },
      h('div', { className: 'mb-2 flex flex-wrap items-center justify-between gap-2' },
        h('div', null,
          h('h3', { id: 'print-lab-preview-title', className: 'text-sm font-black text-white' }, '3D preview'),
          h('p', { className: 'text-[0.6875rem] text-slate-300' }, status === 'ready' ? 'Drag to orbit. Use the controls below for a keyboard path.' : glLost || status === 'failed' ? '3D preview unavailable; use the complete text preflight below.' : status === 'empty' ? 'Add or import geometry to preview it.' : 'Loading the local 3D preview…')
        ),
        h('div', { className: 'flex gap-1', 'aria-label': __alloT('stem.printlab.a11y_3d_preview_controls', '3D preview controls') },
          h('button', { type: 'button', onClick: useController('rotate', -Math.PI / 8), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': __alloT('stem.printlab.a11y_rotate_model_left', 'Rotate model left') }, '↶'),
          h('button', { type: 'button', onClick: useController('rotate', Math.PI / 8), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': __alloT('stem.printlab.a11y_rotate_model_right', 'Rotate model right') }, '↷'),
          h('button', { type: 'button', onClick: useController('zoom', 0.82), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': __alloT('stem.printlab.a11y_zoom_preview_in', 'Zoom preview in') }, '+'),
          h('button', { type: 'button', onClick: useController('zoom', 1.22), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': __alloT('stem.printlab.a11y_zoom_preview_out', 'Zoom preview out') }, '−'),
          h('button', { type: 'button', onClick: useController('reset'), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white' }, 'Reset'),
          // Sits with the other view controls rather than floating over the model,
          // so it is reachable in the same tab order and never covers the preview.
          h('button', {
            type: 'button',
            onClick: function () { if (typeof window.__alloStemFS === 'function') window.__alloStemFS(fsStageRef.current); },
            'aria-pressed': isFs ? 'true' : 'false',
            'aria-label': isFs
              ? __alloT('stem.printlab.exit_fullscreen', 'Exit fullscreen 3D preview (Escape)')
              : __alloT('stem.printlab.enter_fullscreen', 'View the 3D preview fullscreen'),
            className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white'
          }, h('span', { 'aria-hidden': 'true' }, isFs ? '✕' : '⛶'))
        )
      ),
      glLost ? h('div', { role: 'alert', 'data-print-gl-lost': 'true', className: 'flex flex-col items-center justify-center gap-3 rounded-xl bg-[#07111f] p-6 text-center text-white ' + (isFs ? 'flex-1 min-h-0' : 'h-[360px]') },
        h('h4', { className: 'text-base font-black' }, __alloT('stem.printlab.webgl_lost_title', '3D view paused')),
        h('p', { className: 'max-w-md text-sm text-slate-200' }, __alloT('stem.printlab.webgl_lost_body', 'This device ran low on graphics memory, so the 3D view stopped. Your work is saved. The text preflight report still has every check.')),
        h('button', { type: 'button', ref: function (b) { if (b && !b._printLabFocused) { b._printLabFocused = true; try { b.focus(); } catch (_) {} } },
          onClick: function () { setGlLost(false); setGlGen(function (n) { return n + 1; }); },
          className: 'min-h-[44px] rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800' }, __alloT('stem.printlab.webgl_lost_restart', 'Restart 3D view'))
      ) : h('canvas', { key: 'print-preview-' + canvasGen.n, ref: canvasRef, role: 'img', 'data-a11y-static': 'true', 'aria-describedby': 'printlab-preview-desc',
        // h-[360px] is right in the page; in fullscreen it would leave the model
        // the same size in a screen-tall box, so the canvas takes the free space.
        className: 'block w-full rounded-xl bg-[#07111f] ' + (isFs ? 'flex-1 min-h-0' : 'h-[360px]'), 'aria-label': __alloT('stem.printlab.a11y_interactive_preview_of_the_current_model_a_comp', 'Interactive preview of the current model. A complete text report is available in the Preflight tab.') }),
      h('p', { id: 'printlab-preview-desc', className: 'sr-only' }, __alloT('stem.printlab.a11y_preview_static_description', 'This preview is a still picture of the model. Use the rotate, zoom and reset buttons above it to change the view; the Preflight tab holds the full text report of dimensions and printability checks.'))
    );
  }

  // Geometry World hands a selected build to Print Lab through one ephemeral,
  // in-memory slot.  Model bytes never enter persisted toolData, localStorage, or a
  // network request.  Validate the slot at the receiving boundary before a preview
  // or advisory inspection is allowed to touch it.
  // Every Geometry World material, grass included (a student's own grass blocks
  // print too). An unknown name falls back to stone, so a stale list silently
  // relabels a student's blocks; tests/geometry_world_material_parity.test.js pins it.
  var GEOMETRY_WORLD_BLOCK_TYPES = ['stone', 'grass', 'wood', 'diamond', 'gold', 'sand', 'glass', 'water', 'brick', 'ice', 'lava', 'torch', 'obsidian', 'marble', 'copper', 'emerald', 'amethyst', 'leaves', 'snow', 'wool'];
  var GEOMETRY_WORLD_BLOCK_SHAPES = ['cube', 'halfA', 'halfB', 'quarter'];
  function sanitizeGeometryWorldSource(source) {
    if (!source || source.schema !== 'alloflow-geometry-world-build/1' || !Array.isArray(source.blocks)) return null;
    var seen = {};
    var blocks = [];
    source.blocks.forEach(function (block) {
      if (blocks.length >= 1500 || !block || ![block.x, block.y, block.z].every(function (value) {
        return typeof value === 'number' && isFinite(value) && Math.abs(value) <= 1500;
      })) return;
      var x = Math.round(block.x), y = Math.round(block.y), z = Math.round(block.z);
      var key = x + ',' + y + ',' + z;
      if (seen[key]) return;
      seen[key] = true;
      blocks.push({
        x: x,
        y: y,
        z: z,
        type: GEOMETRY_WORLD_BLOCK_TYPES.indexOf(block.type) >= 0 ? block.type : 'stone',
        shape: GEOMETRY_WORLD_BLOCK_SHAPES.indexOf(block.shape) >= 0 ? block.shape : 'cube',
        rotation: ((Math.round(Number(block.rotation) || 0) % 4) + 4) % 4
      });
    });
    if (!blocks.length) return null;
    blocks.sort(function (a, b) { return a.y - b.y || a.x - b.x || a.z - b.z || a.shape.localeCompare(b.shape) || a.type.localeCompare(b.type) || a.rotation - b.rotation; });
    return {
      schema: 'alloflow-geometry-world-build/1',
      title: safeText(source.title, 100) || 'Geometry World selected build',
      coordinateSystem: 'x-right,y-up,z-depth',
      blocks: blocks
    };
  }
  function inspectGeometryWorldBinaryStl(bytes, triangleCount, zUp) {
    var view;
    try { view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); } catch (_) { return null; }
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (var triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
      var base = 84 + triangleIndex * 50;
      var values = [];
      for (var valueIndex = 0; valueIndex < 12; valueIndex++) values.push(view.getFloat32(base + valueIndex * 4, true));
      if (!values.every(function (value) { return typeof value === 'number' && isFinite(value) && Math.abs(value) <= 100000; })) return null;
      var ax = values[3], ay = values[4], az = values[5];
      var bx = values[6], by = values[7], bz = values[8];
      var cx = values[9], cy = values[10], cz = values[11];
      var ux = bx - ax, uy = by - ay, uz = bz - az;
      var vx = cx - ax, vy = cy - ay, vz = cz - az;
      var crossX = uy * vz - uz * vy, crossY = uz * vx - ux * vz, crossZ = ux * vy - uy * vx;
      if (crossX * crossX + crossY * crossY + crossZ * crossZ <= 0.000000000001) return null;
      [[ax, ay, az], [bx, by, bz], [cx, cy, cz]].forEach(function (vertex) {
        for (var axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], vertex[axis]); max[axis] = Math.max(max[axis], vertex[axis]); }
      });
    }
    function extent(axis) { return Math.round((max[axis] - min[axis]) * 10000) / 10000; }
    return zUp ? { L:extent(0), W:extent(1), H:extent(2) } : { L:extent(0), W:extent(2), H:extent(1) };
  }
  function geometryWorldSourceSummary(source, triangleCount, meshDimensions) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    var shapedCount = 0;
    source.blocks.forEach(function (block) {
      minX = Math.min(minX, block.x); maxX = Math.max(maxX, block.x);
      minY = Math.min(minY, block.y); maxY = Math.max(maxY, block.y);
      minZ = Math.min(minZ, block.z); maxZ = Math.max(maxZ, block.z);
      if (block.shape !== 'cube') shapedCount += 1;
    });
    return {
      blockCount: source.blocks.length,
      triangleCount: triangleCount,
      shapedCount: shapedCount,
      dimensions: { L: maxX - minX + 1, W: maxZ - minZ + 1, H: maxY - minY + 1 },
      meshDimensions: meshDimensions
    };
  }
  function turnGeometryPrintCopy(sourceBytes, reverse) {
    if (!sourceBytes || sourceBytes.byteLength < 84 || sourceBytes.byteLength > MAX_FILE_BYTES) return null;
    var bytes = new Uint8Array(sourceBytes);
    var view = new DataView(bytes.buffer);
    var count = view.getUint32(80, true);
    if (!count || bytes.length !== 84 + 50 * count) return null;
    // Binary STL stores a facet normal followed by its three vertices. Turn
    // all four vectors counterclockwise in the XY plane, keeping Z upright.
    for (var facet = 0; facet < count; facet++) {
      for (var vector = 0; vector < 4; vector++) {
        var offset = 84 + facet * 50 + vector * 12;
        var x = view.getFloat32(offset, true);
        var y = view.getFloat32(offset + 4, true);
        view.setFloat32(offset, reverse ? y : -y, true);
        view.setFloat32(offset + 4, reverse ? -x : x, true);
      }
    }
    var dimensions = inspectGeometryWorldBinaryStl(bytes, count, true);
    return dimensions ? { source: sourceBytes, bytes: bytes, dimensions: dimensions } : null;
  }
  function scaledGeometryWorldDimensions(summary, unitMm) {
    var dimensions = summary && summary.meshDimensions;
    if (!dimensions || ![dimensions.L, dimensions.W, dimensions.H].every(function (value) { return typeof value === 'number' && isFinite(value) && value >= 0; })) return null;
    var scale = clamp(unitMm, 0.01, 1000, 5);
    function scaled(value) { return Math.round(value * scale * 100) / 100; }
    var result = { width: scaled(dimensions.L), depth: scaled(dimensions.W), height: scaled(dimensions.H) };
    result.label = result.width + ' × ' + result.depth + ' × ' + result.height + ' mm';
    return result;
  }
  function geometryWorldPrinterFit(physicalSize, profile) {
    if (!physicalSize || !profile) return null;
    var limits = {
      width: clamp(profile.bedWidthMm, 1, 10000, 220),
      depth: clamp(profile.bedDepthMm, 1, 10000, 220),
      height: clamp(profile.bedHeightMm, 1, 10000, 250)
    };
    var over = [];
    if (physicalSize.width > limits.width) over.push('width');
    if (physicalSize.depth > limits.depth) over.push('depth');
    if (physicalSize.height > limits.height) over.push('height');
    return {
      fits: over.length === 0,
      over: over,
      profileLabel: limits.width + ' × ' + limits.depth + ' × ' + limits.height + ' mm'
    };
  }
  function geometryWorldScaleRecommendation(summary, profile, currentUnitMm, clearanceMm) {
    var dimensions = summary && summary.meshDimensions;
    if (!dimensions || !profile || ![dimensions.L, dimensions.W, dimensions.H].every(function (value) { return typeof value === 'number' && isFinite(value) && value >= 0; })) return null;
    if (!(dimensions.L > 0 || dimensions.W > 0 || dimensions.H > 0)) return null;
    var clearance = clamp(clearanceMm, 0, 1000, GEOMETRY_EDGE_CLEARANCE_MM);
    var profileSize = {
      width: clamp(profile.bedWidthMm, 1, 10000, 220),
      depth: clamp(profile.bedDepthMm, 1, 10000, 220),
      height: clamp(profile.bedHeightMm, 1, 10000, 250)
    };
    var available = {
      width: profileSize.width - clearance * 2,
      depth: profileSize.depth - clearance * 2,
      height: profileSize.height - clearance * 2
    };
    var current = clamp(currentUnitMm, 0.01, 1000, 5);
    if (available.width <= 0 || available.depth <= 0 || available.height <= 0) {
      return { canFit: false, needsReduction: true, recommendedUnitMm: null, clearanceMm: clearance, limitingDimensions: [], availableLabel: 'No usable clearance envelope' };
    }
    var candidates = [
      { name: 'width', size: dimensions.L, available: available.width },
      { name: 'depth', size: dimensions.W, available: available.depth },
      { name: 'height', size: dimensions.H, available: available.height }
    ].filter(function (axis) { return axis.size > 0; }).map(function (axis) {
      return { name: axis.name, size: axis.size, available: axis.available, maxUnitMm: axis.available / axis.size };
    });
    if (!candidates.length) return null;
    var rawMaximum = Math.min.apply(Math, candidates.map(function (axis) { return axis.maxUnitMm; }));
    var safeMaximum = Math.floor(Math.min(1000, rawMaximum) * 100) / 100;
    var canFit = safeMaximum >= 0.01;
    // A requested physical dimension can imply a repeating scale. Compare it
    // to the actual clearance limit; round down only the suggested preset.
    var needsReduction = !canFit || current > rawMaximum + Number.EPSILON * Math.max(1, rawMaximum);
    return {
      canFit: canFit,
      needsReduction: needsReduction,
      recommendedUnitMm: canFit ? safeMaximum : null,
      currentUnitMm: current,
      reductionPercent: canFit && needsReduction ? Math.round((1 - safeMaximum / current) * 1000) / 10 : 0,
      recommendedPhysicalSize: canFit ? scaledGeometryWorldDimensions(summary, safeMaximum) : null,
      clearanceMm: clearance,
      limitingDimensions: candidates.filter(function (axis) { return Math.abs(axis.maxUnitMm - rawMaximum) < 0.000001; }).map(function (axis) { return axis.name; }),
      limitingCalculations: candidates.filter(function (axis) { return Math.abs(axis.maxUnitMm - rawMaximum) < 0.000001; }).map(function (axis) {
        return { dimension: axis.name, availableMm: Math.round(axis.available * 100) / 100, modelUnits: Math.round(axis.size * 1000) / 1000, rawUnitMm: Math.round(axis.maxUnitMm * 1000) / 1000 };
      }),
      availableLabel: available.width + ' \u00D7 ' + available.depth + ' \u00D7 ' + available.height + ' mm'
    };
  }
  function geometryWorldOrientationAdvice(summary, profile, currentUnitMm, clearanceMm) {
    var dimensions = summary && summary.meshDimensions;
    var current = geometryWorldScaleRecommendation(summary, profile, currentUnitMm, clearanceMm);
    if (!dimensions || !current || !current.canFit || !current.needsReduction || !(current.recommendedUnitMm > 0)) return null;
    var rotatedSummary = Object.assign({}, summary, {
      meshDimensions: { L: dimensions.W, W: dimensions.L, H: dimensions.H }
    });
    var rotated = geometryWorldScaleRecommendation(rotatedSummary, profile, currentUnitMm, clearanceMm);
    if (!rotated || !rotated.canFit || !(rotated.recommendedUnitMm > current.recommendedUnitMm + 0.01)) return null;
    var currentScale = clamp(currentUnitMm, 0.01, 1000, 5);
    var currentScaleFitsRotated = !rotated.needsReduction;
    var suggestedUnitMm = currentScaleFitsRotated ? currentScale : rotated.recommendedUnitMm;
    return {
      beneficial: true,
      currentMaximumUnitMm: current.recommendedUnitMm,
      rotatedMaximumUnitMm: rotated.recommendedUnitMm,
      currentScaleFitsRotated: currentScaleFitsRotated,
      suggestedUnitMm: suggestedUnitMm,
      rotatedPhysicalSize: scaledGeometryWorldDimensions(rotatedSummary, suggestedUnitMm),
      improvementPercent: Math.round((rotated.recommendedUnitMm / current.recommendedUnitMm - 1) * 1000) / 10,
      clearanceMm: rotated.clearanceMm
    };
  }
  // Art Studio's sculpt mode builds the same constrained Prim3D recipe the Design
  // tab edits, so its handoff is the recipe itself: no bytes, nothing persisted
  // beyond what the Design tab would keep anyway (2026-09-05).
  function readPendingRecipeHandoff(pending) {
    if (!pending || pending.schema !== 'alloflow-print-source/1' || pending.format !== 'RECIPE' || pending.sourceTool !== 'artStudio') return null;
    var recipe = normalizePersistedRecipe(pending.recipe);
    if (!recipe || !recipe.parts || !recipe.parts.length) return null;
    return {
      id: safeText(pending.id, 80),
      sourceTool: 'artStudio',
      format: 'RECIPE',
      bytes: null,
      sourceName: '',
      title: safeText(pending.title, 100) || safeText(recipe.name, 100) || 'Art Studio sculpture',
      description: safeText(pending.description, 500),
      unitMm: clamp(pending.unitMm, 0.01, 1000, 20),
      aiUse: ['ASSISTED', 'MOSTLY_AI'].indexOf(pending.aiUse) >= 0 ? pending.aiUse : 'NONE',
      aiDisclosure: safeText(pending.aiDisclosure, 500),
      recipe: recipe,
      sourceModel: null,
      summary: { partCount: recipe.parts.length, name: safeText(recipe.name, 80) }
    };
  }
  // Architecture Studio (2026-09-05) exports the same binary STL it already
  // downloads, so its handoff is checked exactly like Geometry World's bytes.
  // It carries no editable source: the studio keeps the block model itself.
  function readPendingArchStudioHandoff(pending) {
    if (!pending || pending.schema !== 'alloflow-print-source/1' || pending.format !== 'STL' || pending.sourceTool !== 'archStudio') return null;
    var bytes = pending.bytes instanceof Uint8Array ? pending.bytes
      : pending.bytes instanceof ArrayBuffer ? new Uint8Array(pending.bytes) : null;
    if (!bytes || bytes.byteLength < 84 || bytes.byteLength > MAX_FILE_BYTES) return null;
    var triangleCount;
    try { triangleCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true); } catch (_) { return null; }
    if (!triangleCount || triangleCount > 250000 || 84 + triangleCount * 50 !== bytes.byteLength) return null;
    var meshDimensions = inspectGeometryWorldBinaryStl(bytes, triangleCount);
    if (!meshDimensions) return null;
    var blockCount = Math.max(0, Math.floor(Number(pending.summary && pending.summary.blockCount) || 0));
    return {
      id: safeText(pending.id, 80),
      sourceTool: 'archStudio',
      format: 'STL',
      bytes: bytes,
      sourceName: safeText(pending.sourceName, 120) || 'architecture-studio-build.stl',
      title: safeText(pending.title, 100) || 'Architecture Studio build',
      description: safeText(pending.description, 500),
      unitMm: clamp(pending.unitMm, 0.01, 1000, 5),
      sourceModel: null,
      summary: { blockCount: blockCount, triangleCount: triangleCount, meshDimensions: meshDimensions }
    };
  }
  function readPendingLocalHandoff(candidate) {
    var pending = arguments.length ? candidate : (typeof window !== 'undefined' ? window.__alloPrintLabPendingHandoff : null);
    var recipeHandoff = readPendingRecipeHandoff(pending);
    if (recipeHandoff) return recipeHandoff;
    var archHandoff = readPendingArchStudioHandoff(pending);
    if (archHandoff) return archHandoff;
    if (!pending || pending.schema !== 'alloflow-print-source/1' || pending.format !== 'STL' || pending.sourceTool !== 'geometryWorld') return null;
    var bytes = pending.bytes instanceof Uint8Array ? pending.bytes
      : pending.bytes instanceof ArrayBuffer ? new Uint8Array(pending.bytes) : null;
    if (!bytes || bytes.byteLength < 84 || bytes.byteLength > MAX_FILE_BYTES) return null;
    var triangleCount;
    try { triangleCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true); } catch (_) { return null; }
    if (!triangleCount || triangleCount > 250000 || 84 + triangleCount * 50 !== bytes.byteLength) return null;
    var meshDimensions = inspectGeometryWorldBinaryStl(bytes, triangleCount, true);
    if (!meshDimensions) return null;
    var source = sanitizeGeometryWorldSource(pending.sourceModel);
    if (!source) return null;
    return {
      id: safeText(pending.id, 80),
      sourceTool: 'geometryWorld',
      format: 'STL',
      bytes: bytes,
      sourceName: safeText(pending.sourceName, 120) || 'geometry-world-build.stl',
      title: safeText(pending.title, 100) || 'Geometry World build',
      description: safeText(pending.description, 500),
      unitMm: clamp(pending.unitMm, 0.01, 1000, 5),
      sourceModel: source, projectId:safeText(pending.projectId,80), draftId:safeText(pending.draftId,80),
      packageReview: normalizePackageReview(pending.packageReview,source.blocks.length),
      aiUse:['ASSISTED','MOSTLY_AI'].indexOf(pending.aiUse)>=0 ? pending.aiUse : 'NONE',
      aiDisclosure:safeText(pending.aiDisclosure,500),
      summary: geometryWorldSourceSummary(source, triangleCount, meshDimensions)
    };
  }

  window.StemLab.printLabPure = {
    MAX_FILE_BYTES: MAX_FILE_BYTES,
    MAX_PORTAL_ASSET_BYTES: MAX_PORTAL_ASSET_BYTES,
    MAX_GCODE_BYTES: MAX_GCODE_BYTES,
    GEOMETRY_EDGE_CLEARANCE_MM: GEOMETRY_EDGE_CLEARANCE_MM,
    DEFAULT_PRINTER_PROFILE: Object.assign({}, DEFAULT_PRINTER_PROFILE),
    TABS: TABS.slice(),
    SHAPES: SHAPES.slice(),
    MATERIALS: MATERIALS.map(function (item) { return Object.assign({}, item); }),
    compareSlicerPlans: compareSlicerPlans,
    allowedFile: allowedFile,
    allowedGcodeFile: allowedGcodeFile,
    sourceExtension: sourceExtension,
    normalizeRewardsPortalUrl: normalizeRewardsPortalUrl,
    normalizePersistedRecipe: normalizePersistedRecipe,
    readPendingRecipeHandoff: readPendingRecipeHandoff,
    readPendingArchStudioHandoff: readPendingArchStudioHandoff,
    editableGeometrySource:editableGeometrySource,
    readPendingLocalHandoff: readPendingLocalHandoff,
    normalizePrinterProfile: normalizePrinterProfile,
    normalizePersistedPreflight: normalizePersistedPreflight,
    persistedPreflightBinding: persistedPreflightBinding,
    manufacturingEvidenceBinding: manufacturingEvidenceBinding,
    schoolRewardsAssetCompatibility: schoolRewardsAssetCompatibility,
    GEOMETRY_WORLD_BLOCK_TYPES: GEOMETRY_WORLD_BLOCK_TYPES.slice(),
    sanitizeGeometryWorldSource: sanitizeGeometryWorldSource,
    inspectGeometryWorldBinaryStl: inspectGeometryWorldBinaryStl,
    scaledGeometryWorldDimensions: scaledGeometryWorldDimensions,
    geometryWorldPrinterFit: geometryWorldPrinterFit,
    geometryWorldScaleRecommendation: geometryWorldScaleRecommendation,
    geometryWorldOrientationAdvice: geometryWorldOrientationAdvice
  };

  window.StemLab.registerTool('printLab', {
    icon: '🖨️',
    label: 'Print Lab',
    desc: 'Design or import a 3D model, inspect it against a school printer profile, compare material tradeoffs, and prepare a staff-review handoff.',
    color: 'cyan',
    category: 'engineering',
    gradeRange: '5-12',
    aliases: ['3D printing', 'STL', 'GLB', 'Minecraft model', 'additive manufacturing', 'PHA'],

    render: function (ctx) {
      __alloPLCtx = ctx;
      var React = ctx.React, h = React.createElement;
      var isContrast = !!ctx.isContrast;
      var _plPlainObj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
      var _plStr = function (v, fb) { return typeof v === 'string' ? v : (fb || ''); };
      var stored = (ctx.toolData && _plPlainObj(ctx.toolData.printLab)) ? ctx.toolData.printLab : {};
      var pendingSlotRef = React.useRef(undefined);
      if (pendingSlotRef.current === undefined) pendingSlotRef.current = window.__alloPrintLabPendingHandoff || null;
      // A Geometry World build stays open for the rest of this page session (still
      // memory only), so leaving Print Lab and coming back no longer empties it.
      var resumedSlotRef = React.useRef(undefined);
      if (resumedSlotRef.current === undefined) {
        var geometrySession = window.__alloPrintLabGeometrySession;
        resumedSlotRef.current = !pendingSlotRef.current && geometrySession && stored.gwProjectId && geometrySession.projectId === stored.gwProjectId ? geometrySession : null;
      }
      var pendingHandoffRef = React.useRef(undefined);
      if (pendingHandoffRef.current === undefined) pendingHandoffRef.current = readPendingLocalHandoff(pendingSlotRef.current || resumedSlotRef.current);
      var pendingHandoff = pendingHandoffRef.current;
      var resumedGeometry = !!(pendingHandoff && resumedSlotRef.current);
      var packageSessionRef = React.useRef(undefined);
      if (packageSessionRef.current === undefined) {
        var savedEdit = window.__alloPrintLabPackageEditSession;
        packageSessionRef.current = savedEdit && stored.packageEditId && savedEdit.id === stored.packageEditId ? savedEdit : null;
      }
      var editSession = packageSessionRef.current;
      var ownedEditIdRef = React.useRef(stored.packageEditId || '');
      var resumedPackage = !pendingSlotRef.current && !resumedGeometry && editSession && editSession.sourceContext && editSession.sourceContext.sourceTool === 'geometryPrintPackage';
      var revisedPackage = !resumedGeometry && pendingHandoff && pendingHandoff.packageReview && editSession && pendingHandoff.packageReview.revisionId === editSession.id ? pendingHandoff.packageReview : null;
      // Re-sent from the same My Worlds project: keep the title and note typed here.
      var unrelatedEditReturn = !!(editSession && pendingHandoff && !resumedGeometry && !revisedPackage);
      var keepTypedDetails = resumedGeometry || !!(!unrelatedEditReturn && pendingHandoff && pendingHandoff.draftId && stored.gwDraftId === pendingHandoff.draftId);
      // The last session held a Geometry World build that did not survive a reload.
      var geometryGone = !pendingHandoff && !!stored.gwProjectId;
      var initialRecipe = resumedPackage ? null : pendingHandoff ? (pendingHandoff.recipe || null) : normalizePersistedRecipe(stored.recipe);
      var initialFormat = resumedPackage ? 'STL' : pendingHandoff ? pendingHandoff.format : 'RECIPE';
      var initialUnitMm = resumedPackage ? clamp(stored.unitMm, 0.01, 1000, editSession.unitMm) : resumedGeometry ? clamp(stored.unitMm, 0.01, 1000, pendingHandoff.unitMm) : pendingHandoff ? pendingHandoff.unitMm : geometryGone && !initialRecipe ? 20 : clamp(stored.unitMm, 0.01, 1000, 20);
      var initialProfile = normalizePrinterProfile(stored.profile);
      var persistedReport = pendingHandoff ? null : normalizePersistedPreflight(stored.preflight);
      var initialReport = initialRecipe && persistedReport && stored.preflightBinding === persistedPreflightBinding(initialRecipe, initialUnitMm, initialProfile) ? persistedReport : null;
      // Persisted under printStage, NOT activeTab: the STEM host folds a tool's toolData.activeTab into the plugin's
      // React key, so every tab change (and the handoff intake's own persist) remounted Print Lab and dropped the
      // in-memory STL bytes; a Geometry World build arrived as an empty Design tab (measured on the live shell, 2026-09-14).
      // A legacy stored activeTab is left as it is: rewriting it would change the key once more.
      var storedStage = TABS.indexOf(stored.printStage) >= 0 ? stored.printStage : (TABS.indexOf(stored.activeTab) >= 0 ? stored.activeTab : 'Design');
      var _tab = React.useState(revisedPackage ? 'Preflight' : pendingHandoff && !resumedGeometry || geometryGone ? 'Design' : storedStage), activeTab = _tab[0], setActiveTab = _tab[1];
      var workflowRootRef = React.useRef(null);
      var focusRevisedDownload = React.useRef(false);
      React.useLayoutEffect(function () {
        if (!focusRevisedDownload.current) return;
        focusRevisedDownload.current = false;
        var root = workflowRootRef.current;
        var download = activeTab === 'Submit' && root && root.querySelector('[data-print-download="package"]');
        if (download && !download.disabled) download.focus();
      }, [activeTab]);
      var _ready = React.useState(!!(window.AlloModules && window.AlloModules.PrintableModel && window.AlloModules.Prim3D)), runtimeReady = _ready[0], setRuntimeReady = _ready[1];
      var _profilePoints = React.useState({}), profilePoints = _profilePoints[0], setProfilePoints = _profilePoints[1];
      var _runtimeError = React.useState(''), runtimeError = _runtimeError[0], setRuntimeError = _runtimeError[1];
      var _format = React.useState(initialFormat), format = _format[0], setFormat = _format[1];
      var _recipe = React.useState(initialRecipe), recipe = _recipe[0], setRecipe = _recipe[1];
      var _bytes = React.useState(resumedPackage ? editSession.bytes : pendingHandoff ? pendingHandoff.bytes : null), sourceBytes = _bytes[0], setFileBytes = _bytes[1];
      var geometrySessionRef = React.useRef(pendingSlotRef.current || resumedSlotRef.current);
      var _turn = React.useState(function () {
        return (revisedPackage && revisedPackage.printTurnDegrees === 90) || (resumedGeometry && resumedSlotRef.current.printTurn90) ? turnGeometryPrintCopy(sourceBytes) : null;
      }), appliedTurn = _turn[0], setAppliedTurn = _turn[1];
      var _turnPreview = React.useState(null), turnPreview = _turnPreview[0], setTurnPreview = _turnPreview[1];
      var turnButtonRef = React.useRef(null);
      var turnActive = !!(appliedTurn && appliedTurn.source === sourceBytes);
      var fileBytes = turnActive ? appliedTurn.bytes : sourceBytes;
      var _glb = React.useState(null), glbRoot = _glb[0], setGlbRoot = _glb[1];
      var _sourceName = React.useState(resumedPackage ? 'model.stl' : pendingHandoff ? pendingHandoff.sourceName : ''), sourceName = _sourceName[0], setSourceName = _sourceName[1];
      var _hash = React.useState(resumedPackage ? editSession.hash : ''), contentHash = _hash[0], setContentHash = _hash[1];
      var _unit = React.useState(initialUnitMm), unitMm = _unit[0], setUnitMm = _unit[1];
      var _unitDraft = React.useState(String(initialUnitMm)), unitDraft = _unitDraft[0], setUnitDraft = _unitDraft[1];
      var _sizeBasis = React.useState('unit'), sizeBasis = _sizeBasis[0], setSizeBasis = _sizeBasis[1];
      var _finishedDraft = React.useState(null), finishedDraft = _finishedDraft[0], setFinishedDraft = _finishedDraft[1];
      var _unitError = React.useState(''), unitError = _unitError[0], setUnitError = _unitError[1];
      var unitInputRef = React.useRef(null), unitFocusRequested = React.useRef(false);
      var unitHasDraft = unitDraft.trim() === '' || Number(unitDraft) !== unitMm;
      React.useEffect(function () {
        if (unitFocusRequested.current && activeTab === 'Design' && unitInputRef.current) {
          unitFocusRequested.current = false; unitInputRef.current.focus();
        }
      }, [activeTab, unitError]);
      var _report = React.useState(initialReport), report = _report[0], setReport = _report[1];
      var packageReturnFocusRequested=React.useRef(!!resumedPackage);
      React.useLayoutEffect(function(){
        if (!packageReturnFocusRequested.current) return;
        if (activeTab!=='Preflight') {packageReturnFocusRequested.current=false;return;}
        var root=workflowRootRef.current;if(!root)return;
        var host=root.closest('[data-stem-lab]'),fallback=host && host.querySelector('.stem-active-tool-back');
        var request={root:root,host:host,fallback:fallback,source:sourceBytes,session:editSession,editId:ownedEditIdRef.current,revision:contextRevisionRef.current,report:null,first:0,second:0,settle:0,cancelled:false};
        packageReturnFocusRequested.current=request;
        request.cancelFrames=function(){window.cancelAnimationFrame(request.first);window.cancelAnimationFrame(request.second);clearTimeout(request.settle);request.first=0;request.second=0;request.settle=0;};
        var events=['pointerdown','touchstart','keydown','click','input','change'];
        function stop(){
          request.cancelled=true;if(packageReturnFocusRequested.current===request)packageReturnFocusRequested.current=false;
          request.cancelFrames();events.forEach(function(name){document.removeEventListener(name,stop,true);});document.removeEventListener('focusin',focusChanged,true);
        }
        function focusChanged(event){if(event.target!==document.body && event.target!==fallback && event.target!==host)stop();}
        request.stop=stop;events.forEach(function(name){document.addEventListener(name,stop,true);});document.addEventListener('focusin',focusChanged,true);
        return stop;
      },[activeTab,sourceBytes]);
      React.useLayoutEffect(function(){
        var request=packageReturnFocusRequested.current;if(!request || request===true || request.cancelled)return;
        if(request.report && request.report!==report){request.stop();return;}
        if(!report)return;request.report=report;
        var root=request.root,target=root.querySelector('[data-print-inspect-connections], [data-edit-package-blocks]');if(!target){request.stop();return;}
        request.first=window.requestAnimationFrame(function(){request.first=0;if(request.cancelled)return;request.second=window.requestAnimationFrame(function(){
          request.second=0;
          function finishReturn(){
            request.settle=0;var active=document.activeElement,blocked=Array.prototype.some.call(document.querySelectorAll('[role="dialog"][aria-modal="true"]'),function(dialog){return !dialog.contains(root) && !dialog.closest('[hidden],[inert]');});
            var current=!request.cancelled && packageReturnFocusRequested.current===request && workflowRootRef.current===root && root.isConnected && target.isConnected && !target.disabled && !target.closest('[hidden],[inert]') && request.source===sourceBytes && request.report===report && ownedEditIdRef.current===request.editId && window.__alloPrintLabPackageEditSession===request.session && contextRevisionRef.current===request.revision;
            if(current && !blocked && (active===document.body || (active===request.fallback || active===request.host) && request.host && request.host.contains(root) && (!request.fallback || request.host.contains(request.fallback))))target.focus();
            request.stop();
          }
          if(request.host && (document.activeElement===document.body || document.activeElement===request.host))request.settle=setTimeout(finishReturn,0);else finishReturn();
        });});
        return request.cancelFrames;
      },[report,activeTab,sourceBytes]);
      var reportFocusRequested=React.useRef(false),revisionReportFocusRef=React.useRef(null),revisionEntryFocusPending=React.useRef(!!revisedPackage);
      var _reportRun=React.useState(0),reportRun=_reportRun[0],setReportRun=_reportRun[1];
      React.useLayoutEffect(function(){
        var request=revisionReportFocusRef.current;
        if(request && request.report && request.report!==report)request.stop();
        if(!reportFocusRequested.current)return;
        var transition=reportFocusRequested.current==='revision';reportFocusRequested.current=false;
        var root=workflowRootRef.current,target=root && root.querySelector('[data-print-report-heading]');
        if(activeTab!=='Preflight' || !root || !root.isConnected || !target)return;
        if(!transition || !root.closest('[data-stem-lab]')){target.focus();return;}
        request=revisionReportFocusRef.current;if(!request || request.cancelled || !report)return;request.report=report;
        request.first=window.requestAnimationFrame(function(){request.first=0;if(request.cancelled)return;request.second=window.requestAnimationFrame(function(){
          request.second=0;
          function finishRevision(){
            request.settle=0;var active=document.activeElement,blocked=Array.prototype.some.call(document.querySelectorAll('[role="dialog"][aria-modal="true"]'),function(dialog){return !dialog.contains(root) && !dialog.closest('[hidden],[inert]');});
            var current=!request.cancelled && revisionReportFocusRef.current===request && workflowRootRef.current===root && root.isConnected && target.isConnected && root.querySelector('[data-print-report-heading]')===target && !target.disabled && !target.closest('[hidden],[inert]') && request.source===sourceBytes && request.report===report && request.handoff===pendingHandoff && request.review===revisedPackage && ownedEditIdRef.current===request.editId && window.__alloPrintLabPackageEditSession===request.session && contextRevisionRef.current===request.revision;
            if(current && !blocked && (active===document.body || (active===request.fallback || active===request.host) && request.host.contains(root) && (!request.fallback || request.host.contains(request.fallback))))target.focus();
            request.stop();
          }
          if(document.activeElement===document.body || document.activeElement===request.host)request.settle=setTimeout(finishRevision,0);else finishRevision();
        });});
        return request.cancelFrames;
      },[report,activeTab,reportRun,sourceBytes]);
      var _status = React.useState(resumedGeometry ? 'The Geometry World build you sent is still open here until this page is closed or reloaded. If you changed it since, send it again from Geometry World.' : pendingHandoff ? (pendingHandoff.sourceTool === 'artStudio' ? 'Loaded an Art Studio sculpture locally as an editable primitive recipe. Set its physical scale, preview, and run the advisory preflight.' : pendingHandoff.sourceTool === 'archStudio' ? 'Loaded an Architecture Studio build locally. Confirm its scale, preview, and advisory preflight.' : 'Loaded your selected Geometry World blocks locally. Confirm the physical size, check the model, then choose filament and prepare your print files.') : geometryGone ? 'The Geometry World build you were checking closed with the page, because models stay only in memory. Send it again from Geometry World to keep going.' : 'Model files stay on this device until you deliberately download a handoff.'), status = _status[0], setStatus = _status[1];
      var _revision = React.useState(0), revision = _revision[0], setRevision = _revision[1];
      var _subject = React.useState(''), aiSubject = _subject[0], setAiSubject = _subject[1];
      var _refine = React.useState(''), aiRefinement = _refine[0], setAiRefinement = _refine[1];
      var _busy = React.useState(false), aiBusy = _busy[0], setAiBusy = _busy[1];
      // Student AI-off: the optional AI modeling assistant renders only when text AI is usable.
      var _aiUsable = function (kind, fn) {
        try { if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable(kind, fn); } catch (_) {}
        return typeof fn === 'function' && !fn._alloQrBlocked && !(typeof window !== 'undefined' && (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true));
      };
      var plAiOn = ctx.aiAvailable !== false && typeof ctx.callGemini === 'function' && !ctx.callGemini._alloQrBlocked && !(typeof window !== 'undefined' && window.__alloAiSecretsLocked === true) && (!!ctx.isTeacherMode || _aiUsable('text', ctx.callGemini));
      var freshHandoff = pendingHandoff && !keepTypedDetails;
      var sourceReview = revisedPackage || (resumedGeometry && pendingHandoff.packageReview) || null;
      // A note written about a different My Worlds project must not ship with this one.
      var otherProject = unrelatedEditReturn || !!(freshHandoff && pendingHandoff.draftId && stored.gwDraftId && stored.gwDraftId !== pendingHandoff.draftId);
      var _title = React.useState(revisedPackage ? _plStr(revisedPackage.title) : freshHandoff ? _plStr(pendingHandoff.title) : (_plStr(stored.title) || (pendingHandoff ? _plStr(pendingHandoff.title) : ''))), title = _title[0], setTitle = _title[1];
      var titleInputRef = React.useRef(null);
      var _description = React.useState(revisedPackage ? _plStr(revisedPackage.description) : freshHandoff ? _plStr(pendingHandoff.description) : (_plStr(stored.description) || (pendingHandoff ? _plStr(pendingHandoff.description) : ''))), description = _description[0], setDescription = _description[1];
      var _sourceContext = React.useState(resumedPackage ? editSession.sourceContext : pendingHandoff ? { sourceTool: pendingHandoff.sourceTool, projectId:pendingHandoff.projectId, draftId:pendingHandoff.draftId || '', sourceModel: pendingHandoff.sourceModel, summary: pendingHandoff.summary, packageReview: sourceReview } : null), originalContext = _sourceContext[0], setSourceContext = _sourceContext[1];
      var sourceContext = React.useMemo(function () {
        if (!turnActive || !originalContext) return originalContext;
        return Object.assign({}, originalContext, { summary: Object.assign({}, originalContext.summary, { meshDimensions: appliedTurn.dimensions }) });
      }, [turnActive, appliedTurn, originalContext]);
      var _note = React.useState(revisedPackage ? _plStr(revisedPackage.studentNote) : otherProject ? '' : _plStr(stored.studentNote)), studentNote = _note[0], setStudentNote = _note[1];
      var _aiUse = React.useState(pendingHandoff && !resumedGeometry ? (_plStr(pendingHandoff.aiUse, 'NONE') || 'NONE') : (_plStr(stored.aiUse, 'NONE') || 'NONE')), aiUse = _aiUse[0], setAiUse = _aiUse[1];
      var _aiDisclosure = React.useState(pendingHandoff && !resumedGeometry ? _plStr(pendingHandoff.aiDisclosure) : _plStr(stored.aiDisclosure)), aiDisclosure = _aiDisclosure[0], setAiDisclosure = _aiDisclosure[1];
      var _aiDisclosureError = React.useState(''), aiDisclosureError = _aiDisclosureError[0], setAiDisclosureError = _aiDisclosureError[1];
      var aiDisclosureInputRef = React.useRef(null);
      var _profile = React.useState(initialProfile), profile = _profile[0], setProfile = _profile[1];
      var _profileDraft=React.useState(function(){return printerProfileDraft(initialProfile);}),profileDraft=_profileDraft[0],setProfileDraft=_profileDraft[1];
      var _profileError=React.useState(''),profileError=_profileError[0],setProfileError=_profileError[1];
      var _profileInvalid=React.useState([]),profileInvalid=_profileInvalid[0],setProfileInvalid=_profileInvalid[1];
      var profileInputRefs=React.useRef({}),profileFocusRequested=React.useRef('');
      var profileHasDraft=PRINTER_FIELDS.some(function(field){return profileDraft[field[0]].trim()==='' || Number(profileDraft[field[0]])!==profile[field[0]];});
      React.useLayoutEffect(function(){var key=profileFocusRequested.current,input=profileInputRefs.current[key];if(key && activeTab==='Preflight' && input && input.isConnected){profileFocusRequested.current='';input.focus();}},[activeTab,profileError]);
      var _material = React.useState(revisedPackage ? _plStr(revisedPackage.materialId, 'PLA') : unrelatedEditReturn ? 'PLA' : (_plStr(stored.materialId, 'PLA') || 'PLA')), materialId = _material[0], setMaterialId = _material[1];
      var _infill = React.useState(clamp(stored.infillPercent, 0, 100, 20)), infillPercent = _infill[0], setInfillPercent = _infill[1];
      var _support = React.useState(clamp(stored.supportPercent, 0, 200, 10)), supportPercent = _support[0], setSupportPercent = _support[1];
      var _comparison = React.useState({}), slicerComparison = _comparison[0], setSlicerComparison = _comparison[1];
      var _saved = React.useState(''), selectedSaved = _saved[0], setSelectedSaved = _saved[1];
      var _repair = React.useState(null), repairResult = _repair[0], setRepairResult = _repair[1];
      var _gcode = React.useState(null), gcodeMetadata = _gcode[0], setGcodeMetadata = _gcode[1];
      var _gcodeHash = React.useState(''), gcodeMetadataHash = _gcodeHash[0], setGcodeMetadataHash = _gcodeHash[1];
      var _gcodeBinding = React.useState(''), gcodeBinding = _gcodeBinding[0], setGcodeBinding = _gcodeBinding[1];
      var _ticket = React.useState(null), jobTicket = _ticket[0], setJobTicket = _ticket[1];
      var _profileReviewed = React.useState(false), profileReviewed = _profileReviewed[0], setProfileReviewed = _profileReviewed[1];
      var _materialReviewed = React.useState(false), materialReviewed = _materialReviewed[0], setMaterialReviewed = _materialReviewed[1];
      var defaultQuoteConfig = { basePoints: 5, setupPoints: 5, pointsPerGram: 2, pointsPerHour: 4, complexityMultiplier: 1, complexityPoints: 0, roundingIncrement: 1, minimumPoints: 10, estimatedMinutes: 0 };
      var _quoteConfig = React.useState(Object.assign({}, defaultQuoteConfig, _plPlainObj(stored.quoteConfig) ? stored.quoteConfig : {})), quoteConfig = _quoteConfig[0], setQuoteConfig = _quoteConfig[1];
      var _simulator = React.useState(null), simulatorSnapshot = _simulator[0], setSimulatorSnapshot = _simulator[1];
      var _simJob = React.useState(''), simulatorJobKey = _simJob[0], setSimulatorJobKey = _simJob[1];
      var _schedule = React.useState(null), simulatedSchedule = _schedule[0], setSimulatedSchedule = _schedule[1];
      var simulatorRef = React.useRef(null);
      var contextRevisionRef = React.useRef(0);
      var operationTokensRef = React.useRef(Object.create(null));
      var _packageRead = React.useState(null), packageRead = _packageRead[0], setPackageRead = _packageRead[1];
      var packageRequestRef = React.useRef(null), packageChooserRef = React.useRef(null), packageInputRef = React.useRef(null);
      var packageLaunchTimerRef = React.useRef(null);
      var packageSectionRef = React.useRef(null), packageResultRef = React.useRef(null);
      React.useLayoutEffect(function () {
        if (!packageRead || packageRead.status === 'reading' || activeTab !== 'Design') return;
        var target = packageResultRef.current, region = packageSectionRef.current;
        if (target && region && (region.contains(document.activeElement) || document.activeElement === document.body)) target.focus();
      }, [packageRead, activeTab]);
      var downloadRequestRef = React.useRef(null);
      var _downloadFeedback = React.useState(null), downloadFeedback = _downloadFeedback[0], setDownloadFeedback = _downloadFeedback[1];

      var savedSculpts = (ctx.toolData && _plPlainObj(ctx.toolData.geoSandbox) && _plPlainObj(ctx.toolData.geoSandbox.savedSculpts)) ? ctx.toolData.geoSandbox.savedSculpts : {};
      var savedNames = Object.keys(savedSculpts).sort();
      var rewardsPortalUrl = connectedRewardsPortalUrl();

      function persist(patch) {
        if (typeof ctx.setToolData !== 'function') return;
        ctx.setToolData(function (previous) {
          var base = (previous && typeof previous === 'object' && !Array.isArray(previous)) ? previous : {};
          var prevPL = (base.printLab && typeof base.printLab === 'object' && !Array.isArray(base.printLab)) ? base.printLab : {};
          return Object.assign({}, base, { printLab: Object.assign({}, prevPL, patch || {}) });
        });
      }

      React.useEffect(function () {
        var alive = true;
        ensurePrintRuntime().then(function () { if (alive) { setRuntimeReady(true); setRuntimeError(''); } }).catch(function (error) { if (alive) setRuntimeError(error && error.message ? error.message : 'Print Lab support files could not be loaded.'); });
        return function () { alive = false; };
      }, []);

      React.useEffect(function () {
        var slot = pendingSlotRef.current;
        if (window.__alloPrintLabPendingHandoff === slot) delete window.__alloPrintLabPendingHandoff;
        if (slot || (!editSession && stored.packageEditId)) forgetPackageEditSession();
        // A model arrived but failed the checks above. Say so, and let the sender
        // save it as a file instead (Geometry World polls for this marker).
        if (slot && !pendingHandoff) {
          window.__alloPrintLabRejectedHandoff = { id: slot.id };
          announce(__alloT('stem.printlab.sr_the_model_sent_to_print_lab_could_not_be_opened_h', 'The model sent to Print Lab could not be opened here. A Geometry World build downloads as an STL file instead.'));
          return;
        }
        if (geometryGone) persist({ gwProjectId: '', printStage: 'Design', unitMm: initialUnitMm });
        if (!pendingHandoff || resumedGeometry) return;
        // Persist only small form defaults. The STL bytes and editable source model
        // stay in memory: in this component, and for a Geometry World build in one
        // page-session slot so reopening Print Lab finds it until the page closes.
        var fromGeometry = pendingHandoff.sourceTool === 'geometryWorld';
        if (fromGeometry) {
          // Never make an unmatched revision marker eligible on a later resume.
          var savedSlot = slot.packageReview ? Object.assign({}, slot, { packageReview: revisedPackage, printTurn90: !!turnActive }) : slot;
          window.__alloPrintLabGeometrySession = savedSlot;
          geometrySessionRef.current = savedSlot;
        } else delete window.__alloPrintLabGeometrySession;
        persist({ printStage: revisedPackage ? 'Preflight' : 'Design', recipe: pendingHandoff.recipe || null, unitMm: pendingHandoff.unitMm, preflight: null, preflightBinding: '', title: title, description: description, studentNote: studentNote, materialId: materialId, aiUse: pendingHandoff.aiUse || 'NONE', aiDisclosure: pendingHandoff.aiDisclosure || '',
          gwProjectId: fromGeometry ? pendingHandoff.projectId : '', gwDraftId: fromGeometry ? (pendingHandoff.draftId || '') : (stored.gwDraftId || '') });
      }, []);

      React.useEffect(function(){
        if(!revisionEntryFocusPending.current)return;revisionEntryFocusPending.current=false;
        var root=workflowRootRef.current,host=root && root.closest('[data-stem-lab]');
        if(activeTab!=='Preflight' || !root || !host)return;
        var request={root:root,host:host,fallback:host.querySelector('.stem-active-tool-back'),source:sourceBytes,session:window.__alloPrintLabPackageEditSession,editId:ownedEditIdRef.current,revision:contextRevisionRef.current,handoff:pendingHandoff,review:revisedPackage,report:null,first:0,second:0,settle:0,cancelled:false};
        revisionReportFocusRef.current=request;
        request.cancelFrames=function(){window.cancelAnimationFrame(request.first);window.cancelAnimationFrame(request.second);clearTimeout(request.settle);request.first=0;request.second=0;request.settle=0;};
        var events=['pointerdown','touchstart','keydown','click','input','change'];
        function stop(){request.cancelled=true;if(revisionReportFocusRef.current===request)revisionReportFocusRef.current=null;request.cancelFrames();events.forEach(function(name){document.removeEventListener(name,stop,true);});document.removeEventListener('focusin',focusChanged,true);}
        function focusChanged(event){if(event.target!==document.body && event.target!==request.fallback && event.target!==host)stop();}
        request.stop=stop;events.forEach(function(name){document.addEventListener(name,stop,true);});document.addEventListener('focusin',focusChanged,true);
        return stop;
      },[activeTab,sourceBytes]);
      var entryCheckRef = React.useRef(!!(revisedPackage || resumedPackage));
      React.useEffect(function () {
        if (!entryCheckRef.current || !runtimeReady || !Printable) return;
        entryCheckRef.current = false;
        var checked = Printable.inspectStl(fileBytes, unitMm, profile);
        if (revisedPackage) { reportFocusRequested.current = 'revision'; setReportRun(function (run) { return run + 1; }); }
        setReport(checked);
        announce(revisedPackage ? 'Revised blocks arrived from Geometry World. Current printer check: '+checked.status+'.' : 'Your reopened package is still here. Current printer check: '+checked.status+'.');
      }, [runtimeReady]);

      // Replacing the model ends the Geometry World session kept for this page.
      React.useEffect(function () {
        if (sourceContext && sourceContext.sourceTool === 'geometryWorld') return;
        if (window.__alloPrintLabGeometrySession) { delete window.__alloPrintLabGeometrySession; persist({ gwProjectId: '' }); }
      }, [sourceContext]);

      React.useEffect(function () {
        return function () {
          clearTimeout(packageLaunchTimerRef.current);
          contextRevisionRef.current += 1;
          ['modelImport', 'gcodeImport', 'ai', 'repair', 'ticket', 'handoff', 'export'].forEach(function (kind) {
            operationTokensRef.current[kind] = (operationTokensRef.current[kind] || 0) + 1;
          });
        };
      }, []);

      React.useEffect(function () {
        return function () { if (glbRoot) disposeObject(glbRoot, true); };
      }, [glbRoot]);

      function announce(message) {
        setStatus(message);
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(message);
      }

      function beginOperation(kind) {
        var next = (operationTokensRef.current[kind] || 0) + 1;
        operationTokensRef.current[kind] = next;
        return next;
      }

      function cancelOperation(kind, message) {
        operationTokensRef.current[kind] = (operationTokensRef.current[kind] || 0) + 1;
        var request = downloadRequestRef.current;
        if (request && request.operation === kind) {
          downloadRequestRef.current = null;
          setDownloadFeedback({ kind: request.kind, status: 'cancelled', message: message || 'Download preparation stopped because the model or details changed. Start the download again when ready.' });
        }
      }

      function beginDownload(kind, operation, message) {
        if (downloadRequestRef.current) return null;
        var request = { kind: kind, operation: operation, token: beginOperation(operation), revision: contextRevisionRef.current };
        downloadRequestRef.current = request;
        setDownloadFeedback({ kind: kind, status: 'busy', message: message });
        return request;
      }

      function finishDownload(request, status, message) {
        if (downloadRequestRef.current !== request || !operationIsCurrent(request.operation, request.token, request.revision)) return;
        downloadRequestRef.current = null;
        setDownloadFeedback({ kind: request.kind, status: status, message: message });
      }

      function cancelDownload() {
        var request = downloadRequestRef.current;
        if (!request) return;
        cancelOperation(request.operation, 'Download preparation cancelled. You can start it again.');
        var root = workflowRootRef.current, trigger = root && root.querySelector('[data-print-download="' + request.kind + '"]');
        if (trigger && trigger.isConnected) trigger.focus();
      }

      function cancelMetadataDownloads() {
        cancelOperation('handoff'); cancelOperation('export');
      }

      function beginDesignOperation(kind) {
        discardPackageRead();
        setTurnPreview(null);
        ['modelImport', 'ai', 'repair'].forEach(function (other) { if (other !== kind) cancelOperation(other); });
        if (kind !== 'ai') setAiBusy(false);
        return { token: beginOperation(kind), revision: contextRevisionRef.current };
      }

      function forgetPackageEditSession() {
        var id = ownedEditIdRef.current;
        if (!id) return;
        if (window.__alloPrintLabPackageEditSession && window.__alloPrintLabPackageEditSession.id === id) delete window.__alloPrintLabPackageEditSession;
        var pending = window.__alloGeometryWorldPendingBuild;
        if (pending && pending.intent === 'reviewPrintPackage' && pending.id === id) delete window.__alloGeometryWorldPendingBuild;
        ownedEditIdRef.current = ''; persist({ packageEditId: '' });
      }

      function operationIsCurrent(kind, token, startedRevision) {
        return operationTokensRef.current[kind] === token && (startedRevision == null || contextRevisionRef.current === startedRevision);
      }

      function bumpContextRevision() {
        contextRevisionRef.current += 1;
        setRevision(contextRevisionRef.current);
      }

      function clearJobArtifacts() {
        cancelOperation('ticket');
        setJobTicket(null); setSimulatorSnapshot(null); setSimulatorJobKey(''); setSimulatedSchedule(null); simulatorRef.current = null;
      }

      function invalidateManufacturingEvidence(options) {
        options = options || {};
        discardPackageRead();
        setTurnPreview(null);
        ['modelImport', 'gcodeImport', 'ai', 'repair', 'ticket', 'handoff', 'export'].forEach(function (kind) {
          if (kind !== options.preserveOperation) cancelOperation(kind);
        });
        bumpContextRevision();
        setGcodeMetadata(null); setGcodeMetadataHash(''); setGcodeBinding('');
        setProfileReviewed(false); setMaterialReviewed(false); setAiBusy(false);
        if (options.clearReport !== false) setReport(null);
        if (options.clearRepair !== false) setRepairResult(null);
        clearJobArtifacts();
      }

      function applyUnitScale(value, message) {
        if(!guardProfileDraft())return;
        var next = clamp(value, 0.01, 1000, unitMm);
        invalidateManufacturingEvidence();
        setUnitMm(next); setUnitDraft(String(next)); setFinishedDraft(null); setUnitError('');
        persist({ unitMm: next, preflight: null, preflightBinding: '' });
        if (message) announce(message);
      }

      function focusUnitDraft() {
        var input = unitInputRef.current;
        if (input && input.isConnected) { unitFocusRequested.current = false; input.focus(); }
        else { unitFocusRequested.current = true; setActiveTab('Design'); persist({ printStage:'Design' }); }
      }
      function guardUnitDraft() {
        if (!unitHasDraft) return true;
        setUnitError('Apply or discard your size edit before continuing. The applied scale is ' + unitMm + ' mm per unit.');
        focusUnitDraft(); return false;
      }
      function focusProfileDraft(key){
        key=key || (PRINTER_FIELDS.find(function(field){return profileDraft[field[0]].trim()==='' || Number(profileDraft[field[0]])!==profile[field[0]];}) || PRINTER_FIELDS[0])[0];
        var input=profileInputRefs.current[key];
        if(input && input.isConnected){profileFocusRequested.current='';input.focus();}
        else{profileFocusRequested.current=key;setActiveTab('Preflight');persist({printStage:'Preflight'});}
      }
      function guardProfileDraft(){
        if(!profileHasDraft)return true;
        setProfileError('Apply or discard your printer profile edit before continuing. The current check still uses the applied profile.');
        focusProfileDraft();return false;
      }
      function guardPrintDrafts(){return guardUnitDraft() && guardProfileDraft();}
      function editPhysicalSize(value) {
        discardPackageRead();
        setTurnPreview(null);
        if (basisExtent) {
          // Keep the typed target intact while using a single uniform scale draft
          // for navigation, preflight and export. Empty input must stay pending.
          setFinishedDraft(value);
          setUnitDraft(value.trim() === '' ? '' : String(Number(value) / basisExtent));
        } else {
          setUnitDraft(value);
        }
        setUnitError('');
        cancelOperation('export'); cancelOperation('handoff');
      }
      function changeSizeBasis(nextBasis) {
        if (unitHasDraft && !validDraftScale) {
          setUnitError('Correct or discard your size edit before choosing another measurement.');
          focusUnitDraft(); return;
        }
        setSizeBasis(nextBasis); setFinishedDraft(null); setUnitError('');
      }
      function commitUnitDraft(event) {
        event.preventDefault();
        if (!validDraftScale) {
          var range = basisExtent ? 'Enter a finished '+sizeBasis+' from '+sizeInputMin+' to '+sizeInputMax+' mm.' : 'Enter a size from 0.01 to 1000 millimeters per unit.';
          setUnitError(range+' Your applied scale is unchanged.'); focusUnitDraft(); return;
        }
        var confirmation = proposedPhysicalSize ? 'Applied print size '+proposedPhysicalSize.label+' (width × depth × height).' : 'Applied '+draftScale+' millimeters per unit.';
        applyUnitScale(draftScale, confirmation+' Check the updated model before exporting.');
      }

      function chooseTab(name) {
        if (TABS.indexOf(name) < 0) return;
        if (name !== 'Design' && !guardUnitDraft()) return;
        if (name !== 'Preflight' && !guardProfileDraft()) return;
        if (name !== activeTab) { setTurnPreview(null); discardPackageRead(); }
        reportFocusRequested.current=false;
        setActiveTab(name); persist({ printStage: name });
        // Stage links live inside panels that are replaced. Move focus to the
        // persistent tab now, so keyboard users can continue into the new panel.
        // No queued callback can later steal focus from a newer action or view.
        var root = workflowRootRef.current, target = root && root.querySelector('[role="tab"][id="print-lab-tab-' + name.toLowerCase() + '"]');
        if (root && root.isConnected && target && target.isConnected) target.focus();
      }

      function onTabKey(event, index) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || (event.nativeEvent && event.nativeEvent.isComposing) || event.keyCode === 229) return;
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        var next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
        chooseTab(TABS[next]);
      }

      function replaceDesign(nextFormat, nextRecipe, nextBytes, nextRoot, nextName, nextUnit, nextReport, nextHash, preserveOperation) {
        forgetPackageEditSession();
        var cleanUnit = clamp(nextUnit, 0.01, 1000, nextFormat === 'RECIPE' ? 20 : 1);
        var persistedNextReport = nextFormat === 'RECIPE' ? normalizePersistedPreflight(nextReport) : null;
        var nextPreflightBinding = persistedNextReport ? persistedPreflightBinding(nextRecipe, cleanUnit, profile) : '';
        var repairedTurn = null;
        if (preserveOperation === 'repair' && originalContext && originalContext.sourceTool === 'geometryWorld') {
          var triangleCount = new DataView(nextBytes.buffer, nextBytes.byteOffset, nextBytes.byteLength).getUint32(80, true);
          var meshDimensions = inspectGeometryWorldBinaryStl(nextBytes, triangleCount, true);
          if (turnActive) {
            // Repair analyzes the active orientation. Keep its changes when the
            // student restores the original orientation or reopens this view.
            var originalOrientation = turnGeometryPrintCopy(nextBytes, true);
            if (!originalOrientation) throw new Error('The repair could not retain this print orientation.');
            repairedTurn = { source: originalOrientation.bytes, bytes: nextBytes, dimensions: meshDimensions };
            nextBytes = originalOrientation.bytes;
            meshDimensions = originalOrientation.dimensions;
          }
          setSourceContext(Object.assign({}, originalContext, { summary: geometryWorldSourceSummary(originalContext.sourceModel, triangleCount, meshDimensions) }));
          rememberGeometryPrintCopy(nextBytes, !!repairedTurn);
        }
        invalidateManufacturingEvidence({ preserveOperation: preserveOperation });
        setAppliedTurn(repairedTurn);
        setFormat(nextFormat); setRecipe(nextRecipe || null); setFileBytes(nextBytes || null); setGlbRoot(nextRoot || null); setSourceName(nextName || '');
        setUnitMm(cleanUnit); setUnitDraft(String(cleanUnit)); setFinishedDraft(null); setSizeBasis('unit'); setUnitError(''); setReport(nextReport || null); setContentHash(nextHash || '');
        persist({ recipe: nextFormat === 'RECIPE' ? nextRecipe : null, unitMm: cleanUnit, preflight: persistedNextReport, preflightBinding: nextPreflightBinding });
      }

      function updateRecipe(next, nextUnitMm, preserveOperation) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        var clean = P3D ? P3D.normalizeRecipe(next) : next;
        if (!clean) { announce(__alloT('stem.printlab.sr_that_primitive_recipe_is_not_valid', 'That primitive recipe is not valid.')); return; }
        forgetPackageEditSession();
        var cleanUnit = clamp(nextUnitMm == null ? unitMm : nextUnitMm, 0.01, 1000, 20);
        invalidateManufacturingEvidence({ preserveOperation: preserveOperation });
        setAppliedTurn(null);
        setRecipe(clean); setFormat('RECIPE'); setFileBytes(null); setGlbRoot(null); setSourceName(''); setReport(null); setContentHash('');
        setUnitMm(cleanUnit); setUnitDraft(String(cleanUnit)); setFinishedDraft(null); setSizeBasis('unit'); setUnitError('');
        setSourceContext(null);
        persist({ recipe: clean, unitMm: cleanUnit, preflight: null, preflightBinding: '' });
      }

      function addPrimitive(shape) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D; if (!P3D) return;
        updateRecipe(P3D.addPart(recipe, shape)); announce('Added a ' + shape + ' primitive.');
      }

      function patchPart(index, patch) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D; if (!P3D || !recipe) return;
        updateRecipe(P3D.updatePart(recipe, index, patch));
      }

      function importSavedRecipe() {
        if (!selectedSaved || !savedSculpts[selectedSaved]) return;
        var P3D = window.AlloModules && window.AlloModules.Prim3D, clean = P3D && P3D.normalizeRecipe(savedSculpts[selectedSaved]);
        if (!clean) { announce(__alloT('stem.printlab.sr_that_saved_geometry_sandbox_design_is_not_a_valid', 'That saved Geometry Sandbox design is not a valid primitive recipe.')); return; }
        updateRecipe(clean, 20); setTitle(clean.name || selectedSaved); announce('Loaded “' + selectedSaved + '” from Geometry Sandbox.');
      }

      function downloadGeometryWorldSource() {
        var source = sourceContext && sourceContext.sourceModel;
        if (!source || source.schema !== 'alloflow-geometry-world-build/1') { announce(__alloT('stem.printlab.sr_no_editable_geometry_world_source_is_available_in', 'No editable Geometry World source is available in this session.')); return; }
        var editable=editableGeometrySource(source);
        if(!editable){announce(__alloT('stem.printlab.sr_this_build_exceeds_editable_sandbox_file_limits_k', 'This build exceeds editable sandbox file limits. Keep its STL and the source recipe in a print package.'));return;}
        downloadBlob(new Blob([JSON.stringify(editable, null, 2)], { type: 'application/json' }), 'geometry-world-editable-build.json');
        announce(__alloT('stem.printlab.sr_downloaded_the_editable_geometry_world_block_reci', 'Downloaded the editable Geometry World block recipe. It contains shapes and rotations, not the physical print settings.'));
      }

      function downloadArtStudioRecipe() {
        var P3D = window.AlloModules && window.AlloModules.Prim3D, clean = recipe && P3D && P3D.normalizeRecipe ? P3D.normalizeRecipe(recipe) : recipe;
        if (!clean || !clean.parts || !clean.parts.length) { announce(__alloT('stem.printlab.sr_there_is_no_primitive_recipe_to_send_back_yet', 'There is no primitive recipe to send back yet.')); return; }
        downloadBlob(new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' }), 'print-lab-sculpture.sculpture.json');
        announce(__alloT('stem.printlab.sr_downloaded_the_editable_sculpture_recipe_load_it', 'Downloaded the editable sculpture recipe. Load it in Art Studio with its Load model button.'));
      }
      function returnToArtStudio() {
        if (!guardPrintDrafts()) return;
        var P3D = window.AlloModules && window.AlloModules.Prim3D, clean = recipe && P3D && P3D.normalizeRecipe ? P3D.normalizeRecipe(recipe) : recipe;
        if (!clean || !clean.parts || !clean.parts.length) { announce(__alloT('stem.printlab.sr_there_is_no_primitive_recipe_to_send_back_yet', 'There is no primitive recipe to send back yet.')); return; }
        if (typeof ctx.setStemLabTool !== 'function') { downloadArtStudioRecipe(); return; }
        window.__alloArtStudioPendingSculpt = {
          schema: 'alloflow-artstudio-sculpt/1',
          id: 'pl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          recipe: JSON.parse(JSON.stringify(clean)),
          printContext: { unitMm: unitMm, aiUse: aiUse, aiDisclosure: safeText(aiDisclosure, 500) }
        };
        if (typeof ctx.updateMulti === 'function') ctx.updateMulti('artStudio', { tab: 'sculpt3d', studioStarted: true });
        announce(__alloT('stem.printlab.sr_returning_the_editable_sculpture_to_art_studio_pr', 'Returning the editable sculpture to Art Studio. Physical scale and AI disclosure travel with the model. Run preflight again after editing.'));
        ctx.setStemLabTool('artStudio');
      }
      // Starting points for a student who opens Print Lab first: the three
      // tools that can build printable geometry, each with its own way back.
      function startInTool(toolId) {
        if (typeof ctx.setStemLabTool !== 'function') { announce(__alloT('stem.printlab.sr_that_tool_is_not_available_here', 'That tool is not available here.')); return; }
        // Geometry World opens on its Home chooser; this intent takes the student
        // straight to Free Build (their current workspace if they have one).
        if (toolId === 'geometryWorld') window.__alloGeometryWorldPendingBuild = { schema: 'alloflow-geometry-world-intent/1', intent: 'freeBuild' };
        if (toolId === 'geometryWorld' && typeof ctx.updateMulti === 'function') ctx.updateMulti('geometryWorld', { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory' });
        if (toolId === 'artStudio' && typeof ctx.updateMulti === 'function') ctx.updateMulti('artStudio', { tab: 'sculpt3d', studioStarted: true });
        ctx.setStemLabTool(toolId);
      }
      function canInspectChangedCell(entry) {
        var saved=window.__alloGeometryWorldReturnProject;
        if (!revisedPrint || !entry.after || typeof ctx.setStemLabTool!=='function' || !saved ||
            saved.id!==sourceContext.projectId || !saved.packageReview || saved.packageReview.revisionId!==revisedPrint.revisionId ||
            !Array.isArray(saved.blocks)) return false;
        return saved.blocks.some(function(block){
          return block.x===entry.x && block.y===entry.y && block.z===entry.z &&
            block.type===entry.after.type && block.shape===entry.after.shape && block.rotation===entry.after.rotation;
        });
      }
      function inspectChangedCell(entry) {
        if (!canInspectChangedCell(entry)) { announce('This block is no longer available in the matching editing workspace. Reopen the revision to inspect it.'); return; }
        returnToGeometryWorld({kind:'cell',cell:{x:entry.x,y:entry.y,z:entry.z},recipe:copyRecipe(entry.after)});
      }
      function returnToGeometryWorld(inspection) {
        if (!guardPrintDrafts()) return;
        var source = sourceContext && sourceContext.sourceModel;
        if (!source || source.schema !== 'alloflow-geometry-world-build/1') { announce(__alloT('stem.printlab.sr_no_editable_geometry_world_source_is_available_in', 'No editable Geometry World source is available in this session.')); return; }
        if (typeof ctx.setStemLabTool !== 'function') { downloadGeometryWorldSource(); return; }
        var inspect=inspection && ['cell','connections'].includes(inspection.kind) ? inspection : null;
        var returning = {
          schema: 'alloflow-geometry-world-build/1',
          id: 'pl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          sourceModel: JSON.parse(JSON.stringify(source)), projectId:sourceContext.projectId, draftId:sourceContext.draftId || '',
          printContext:{unitMm:unitMm, aiUse:aiUse, aiDisclosure:safeText(aiDisclosure,500)}
        };
        if (inspect) returning.printContext.inspect=inspect;
        if (sourceContext.packageReview) {
          var nextReview = inspect ? normalizePackageReview(Object.assign({},sourceContext.packageReview,{
            title:title,description:description,studentNote:studentNote,materialId:materialId,printTurnDegrees:turnActive?90:0
          }),source.blocks.length) : newPackageReview(sourceContext.packageReview.revisionNumber, source.blocks.length, geometryPhysicalSize, turnActive ? 90 : 0);
          returning.printContext.packageReview = nextReview;
          rememberPackageEdit(nextReview.revisionId, false);
        }
        window.__alloGeometryWorldPendingBuild = returning;
        if (typeof ctx.updateMulti === 'function') ctx.updateMulti('geometryWorld', { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory' });
        announce(__alloT('stem.printlab.sr_returning_the_editable_selected_build_to_geometry', 'Returning the editable selected build to Geometry World. Physical scale and AI disclosure travel with the model. Run preflight again after editing.'));
        ctx.setStemLabTool('geometryWorld');
      }

      function newPackageReview(previousNumber, blockCount, dimensions, turnDegrees, reference) {
        var id = 'pl-edit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
        return normalizePackageReview({ revisionId: id, revisionNumber: Number.isInteger(previousNumber) && previousNumber >= 1 && previousNumber <= 9998 ? previousNumber + 1 : 2,
          title: title || 'Geometry World model', description: description, studentNote: studentNote, materialId: materialId,
          printTurnDegrees: turnDegrees, previousBlockCount: blockCount, previousDimensions: dimensions,
          referencePrint: reference || {basis:'working',unitMm:unitMm,materialId:materialId,printTurnDegrees:turnDegrees,dimensions:dimensions} });
      }

      function rememberPackageEdit(id, keepPackage) {
        // Only the matching page session holds bytes or editable blocks. The
        // small stored id prevents returning to an unrelated previous model.
        window.__alloPrintLabPackageEditSession = keepPackage ? { id: id, sourceContext: sourceContext, bytes: sourceBytes, hash: contentHash, unitMm: unitMm } : { id: id };
        ownedEditIdRef.current = id;
        persist({ packageEditId: id, printStage: activeTab, unitMm: unitMm, title: title, description: description, studentNote: studentNote, aiUse: aiUse, aiDisclosure: aiDisclosure, materialId: materialId });
      }

      function editReopenedBlocks(inspection) {
        if (!guardPrintDrafts() || !reopenedPackage || !sourceContext.editableWorld) return;
        if (typeof ctx.setStemLabTool !== 'function') { announce('Open this ZIP in Geometry World to revise its blocks.'); return; }
        var blockSize = sourceContext.millimetersPerBlock * unitMm;
        if (!Number.isFinite(blockSize) || blockSize < 0.01 || blockSize > 1000) {
          chooseTab('Design'); setUnitError('Choose a scale that gives the editable blocks between 0.01 and 1000 millimeters per block.'); focusUnitDraft(); return;
        }
        var dims = sourceContext.packageDimensions;
        var currentDimensions = { width: dims.width * unitMm, depth: dims.depth * unitMm, height: dims.height * unitMm };
        var editable = editablePackageCopy(sourceContext.editableWorld);
        if (!editable) { announce('The editable blocks could not be validated for Geometry World.'); return; }
        var review = newPackageReview(sourceContext.revisionNumber, editable.blocks.length, currentDimensions, sourceContext.printTurnDegrees, {
          basis:'package',dimensions:dims,unitMm:sourceContext.millimetersPerBlock,materialId:sourceContext.packageMaterialId,printTurnDegrees:sourceContext.printTurnDegrees
        });
        var intent = { schema: 'alloflow-geometry-world-intent/1', intent: 'reviewPrintPackage', id: review.revisionId, editableWorld: editable,
          packageName: sourceContext.packageName, dimensions: currentDimensions, printTurnDegrees: review.printTurnDegrees,
          printContext: { unitMm: blockSize, aiUse: aiUse, aiDisclosure: aiUse === 'NONE' ? '' : safeText(aiDisclosure, 300), packageReview: review } };
        if (inspection && inspection.kind==='connections') intent.printContext.inspect={kind:'connections'};
        rememberPackageEdit(intent.id, true);
        window.__alloGeometryWorldPendingBuild = intent;
        announce('Opening the editable block preview in Geometry World.');
        function recoverNavigation() {
          var root = workflowRootRef.current;
          if (!root || !root.isConnected || window.__alloGeometryWorldPendingBuild !== intent || ownedEditIdRef.current !== intent.id) return;
          forgetPackageEditSession();
          announce('Geometry World could not open. Try Edit blocks again, or open this ZIP from Geometry World.');
          var target = root.querySelector('[data-print-inspect-connections], [data-edit-package-blocks]');
          if (target && document.activeElement === document.body) target.focus();
        }
        clearTimeout(packageLaunchTimerRef.current);
        try {
          if (typeof window.__alloEnsureStemPluginLoaded === 'function') Promise.resolve(window.__alloEnsureStemPluginLoaded('geometryWorld')).catch(function () {});
          ctx.setStemLabTool('geometryWorld');
          packageLaunchTimerRef.current = setTimeout(recoverNavigation, 1200);
        } catch (_) { recoverNavigation(); }
      }

      function runPreflight(focusReport) {
        if (!guardPrintDrafts()) return null;
        setTurnPreview(null);
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable) { announce(__alloT('stem.printlab.sr_the_inspection_engine_is_still_loading', 'The inspection engine is still loading.')); return null; }
        var next = format === 'RECIPE' ? Printable.inspectRecipe(recipe, unitMm, profile)
          : format === 'STL' ? Printable.inspectStl(fileBytes, unitMm, profile)
          : Printable.inspectGlb(fileBytes, unitMm, profile);
        if (format === 'GLB' && glbRoot) next = inspectObjectCapabilities(glbRoot, next);
        reportFocusRequested.current=focusReport===true;if(focusReport===true)setReportRun(function(value){return value+1;});setReport(next);
        persist({ preflight: format === 'RECIPE' ? next : null, preflightBinding: format === 'RECIPE' ? persistedPreflightBinding(recipe, unitMm, profile) : '', profile: profile, unitMm: unitMm });
        announce(next.status === 'FAIL' ? 'Preflight found blocking items. Review the report.' : next.status === 'WARN' ? 'Preflight completed with staff-review warnings.' : 'Preflight completed without a blocking geometry error. Staff and slicer review are still required.');
        return next;
      }

      function rememberGeometryPrintCopy(bytes, turned) {
        var slot = geometrySessionRef.current;
        if (!slot || slot !== window.__alloPrintLabGeometrySession) return;
        var next = Object.assign({}, slot, { bytes: bytes, printTurn90: turned });
        geometrySessionRef.current = next;
        window.__alloPrintLabGeometrySession = next;
      }

      function previewPrintTurn() {
        if (!guardPrintDrafts() || turnActive || !geometryOrientationAdvice || !originalContext || originalContext.sourceTool !== 'geometryWorld' || format !== 'STL') return false;
        var copy = turnGeometryPrintCopy(sourceBytes);
        if (!copy) { announce('This STL could not be turned. Its current orientation is still applied.'); return false; }
        var size = scaledGeometryWorldDimensions({ meshDimensions: copy.dimensions }, unitMm);
        setTurnPreview({ copy: copy, size: size, unitMm: unitMm, profile: profile, revision: contextRevisionRef.current });
        announce('Turn preview: '+size.label+' at '+unitMm+' mm per block. Apply to check the turned print copy.');
        return true;
      }

      function commitPrintTurn(restore) {
        if (!guardPrintDrafts() || !Printable || (restore ? !turnActive : !currentTurnPreview)) return;
        var nextTurn = restore ? null : currentTurnPreview.copy;
        var checked = Printable.inspectStl(nextTurn ? nextTurn.bytes : sourceBytes, unitMm, profile);
        invalidateManufacturingEvidence();
        setAppliedTurn(nextTurn); setFinishedDraft(null); setContentHash('');
        rememberGeometryPrintCopy(sourceBytes, !!nextTurn);
        reportFocusRequested.current = true; setReportRun(function (run) { return run + 1; });
        setReport(checked); setActiveTab('Preflight');
        persist({ printStage: 'Preflight', preflight: null, preflightBinding: '', profile: profile, unitMm: unitMm });
        announce((restore ? 'Original print orientation restored. ' : 'Turned the print copy 90 degrees. ')+'Preflight result: '+checked.status+'. Review the updated report.');
      }

      function createRepairCandidate() {
        if(!guardPrintDrafts())return;
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable || format !== 'STL' || !fileBytes) { announce(__alloT('stem.printlab.sr_conservative_local_repair_is_available_for_an_imp', 'Conservative local repair is available for an imported STL.')); return; }
        var result = Printable.repairStl(fileBytes, { unitMm: unitMm, profile: profile, weldTolerance: 0.00001 });
        setRepairResult(result);
        announce(result.ok ? 'Created a local repair candidate. It still requires full slicer and staff review.' : (result.errors || ['The STL could not be repaired.']).join(' '));
      }

      function useRepairCandidate() {
        if(!guardPrintDrafts())return;
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable || !repairResult || !repairResult.ok || !repairResult.buffer) return;
        var bytes = new Uint8Array(repairResult.buffer);
        var operation = beginDesignOperation('repair'), token = operation.token, startedRevision = operation.revision;
        Printable.sha256Hex(bytes).then(function (hash) {
          if (!operationIsCurrent('repair', token, startedRevision)) return;
          replaceDesign('STL', null, bytes, null, 'repaired-model.stl', unitMm, repairResult.report, hash, 'repair');
          if (showRevisionFindings && workflowRootRef.current && workflowRootRef.current.querySelector('[data-print-revision-findings]')) {
            reportFocusRequested.current = true; setReportRun(function (run) { return run + 1; });
          }
          announce(__alloT('stem.printlab.sr_the_conservative_repair_candidate_is_now_the_loca', 'The conservative repair candidate is now the local working copy. Its analysis remains advisory.'));
        }).catch(function () { if (operationIsCurrent('repair', token, startedRevision)) announce(__alloT('stem.printlab.sr_the_repaired_candidate_hash_could_not_be_calculat', 'The repaired candidate hash could not be calculated.')); });
      }

      function downloadRepairCandidate() {
        if(!guardPrintDrafts())return;
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable || !repairResult || !repairResult.ok || !repairResult.buffer) return;
        downloadBlob(new Blob([repairResult.buffer], { type: 'model/stl' }), Printable.safeFilename(title || 'student-model') + '-conservative-repair.stl');
        announce(__alloT('stem.printlab.sr_downloaded_the_conservative_repair_candidate_it_i', 'Downloaded the conservative repair candidate. It is not certified watertight or ready to print.'));
      }

      function setProfileField(key, value) {
        discardPackageRead();
        setTurnPreview(null);
        setProfileDraft(function(previous){var next=Object.assign({},previous);next[key]=value;return next;});
        setProfileError('');setProfileInvalid([]);cancelOperation('export');cancelOperation('handoff');cancelOperation('ticket');
      }
      function commitProfileDraft(event){
        event.preventDefault();var raw=Object.assign({},profile),invalid=[];
        PRINTER_FIELDS.forEach(function(field){var value=profileDraft[field[0]].trim()===''?NaN:Number(profileDraft[field[0]]);if(!Number.isFinite(value) || value<field[2] || value>field[3])invalid.push(field[0]);else raw[field[0]]=value;});
        setProfileInvalid(invalid);
        if(invalid.length){var field=PRINTER_FIELDS.find(function(item){return item[0]===invalid[0];});setProfileError('Enter '+field[1]+' from '+field[2]+' to '+field[3]+'. Your applied printer profile is unchanged.');focusProfileDraft(invalid[0]);return;}
        var next=normalizePrinterProfile(raw);setProfileError('');setProfileDraft(printerProfileDraft(next));
        if(!profileHasDraft)return;
        invalidateManufacturingEvidence();
        setProfile(next); persist({ profile: next, preflight: null, preflightBinding: '' });
        announce('Printer profile applied. Run preflight again for this build area.');
      }

      function discardPackageRead() {
        var request = packageRequestRef.current;
        if (!request) return;
        if (operationIsCurrent('modelImport', request.token, request.revision)) cancelOperation('modelImport');
        packageRequestRef.current = null;
        setPackageRead(null);
      }

      function packageRequestIsCurrent(request) {
        return packageRequestRef.current === request && operationIsCurrent('modelImport', request.token, request.revision);
      }

      function choosePrintPackage(event) {
        var file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        var request = beginDesignOperation('modelImport');
        request.packageName = safeText(file.name, 120) || 'Geometry World print package';
        packageRequestRef.current = request;
        setPackageRead({ status: 'reading' });
        ensurePrintPackageReader().then(function () {
          if (!packageRequestIsCurrent(request)) return null;
          return window.StemLab.geometryPrintPackage.read(file);
        }).then(function (result) {
          if (!packageRequestIsCurrent(request)) return;
          setPackageRead({ status: 'ready', request: request, result: Object.assign({}, result, { editableWorld: editablePackageCopy(result.editableWorld) }) });
        }).catch(function (error) {
          if (!packageRequestIsCurrent(request)) return;
          setPackageRead({ status: 'error', message: error && error.message || 'The print package could not be opened. Choose it again.' });
        });
      }

      function cancelPackagePreview() {
        discardPackageRead();
        if (packageChooserRef.current) packageChooserRef.current.focus();
        announce('Package opening cancelled.');
      }

      function openPackageForPreflight() {
        var request = packageRequestRef.current;
        if (!request || !packageRequestIsCurrent(request) || !packageRead || packageRead.status !== 'ready' || packageRead.request !== request || !guardPrintDrafts()) return;
        if (!Printable) { announce('The inspection engine is still loading.'); return; }
        var result = packageRead.result, manifest = result.manifest, checked;
        try { checked = Printable.inspectStl(result.modelBytes, 1, profile); }
        catch (error) { setPackageRead({ status: 'error', message: error && error.message || 'This STL could not be inspected.' }); return; }
        var details = {
          title: safeText(manifest.title, 100) || 'Geometry World model', description: safeText(manifest.description, 500),
          studentNote: safeText(manifest.studentNote, 300), aiUse: ['ASSISTED', 'MOSTLY_AI'].indexOf(manifest.aiUse) >= 0 ? manifest.aiUse : 'NONE',
          materialId: materialById(manifest.material).id, gwProjectId: '', gwDraftId: '', printStage: 'Preflight'
        };
        details.aiDisclosure = details.aiUse === 'NONE' ? '' : safeText(manifest.aiDisclosure, 300);
        packageRequestRef.current = null; setPackageRead(null);
        setSourceContext({ sourceTool: 'geometryPrintPackage', editableAvailable: !!result.editableWorld, editableWorld: result.editableWorld,
          packageName: request.packageName, packageDimensions: result.dimensions, millimetersPerBlock: manifest.source.millimetersPerBlock,
          packageMaterialId:details.materialId,savedChanges:readChangeHistory(result),
          printTurnDegrees: manifest.source.printTurnDegrees === 90 ? 90 : 0, revisionNumber: manifest.source.revisionNumber });
        replaceDesign('STL', null, result.modelBytes, null, 'model.stl', 1, checked, manifest.model.sha256, 'modelImport');
        setTitle(details.title); setDescription(details.description); setStudentNote(details.studentNote);
        setAiUse(details.aiUse); setAiDisclosure(details.aiDisclosure); setAiDisclosureError(''); setMaterialId(details.materialId);
        setSelectedSaved(''); setAiSubject(''); setAiRefinement(''); setSlicerComparison({});
        setDownloadFeedback(null);
        setProfileDraft(printerProfileDraft(profile)); setProfileError(''); setProfileInvalid([]);
        reportFocusRequested.current = true; setReportRun(function (run) { return run + 1; });
        setActiveTab('Preflight'); persist(details);
        announce('Opened '+details.title+' at its finished millimeter size. Current printer check: '+checked.status+'.');
      }

      function importFile(event) {
        var file = event.target.files && event.target.files[0]; event.target.value = '';
        if (file) discardPackageRead();
        var accepted = allowedFile(file); if (!accepted.ok) { announce(accepted.message); return; }
        if (!runtimeReady) { announce(__alloT('stem.printlab.sr_the_local_inspection_engine_is_still_loading', 'The local inspection engine is still loading.')); return; }
        var operation = beginDesignOperation('modelImport'), token = operation.token, startedRevision = operation.revision;
        var Printable = window.AlloModules.PrintableModel, P3D = window.AlloModules.Prim3D;
        announce('Reading ' + accepted.format + ' locally…');
        readBytes(file).then(function (bytes) {
          return Printable.sha256Hex(bytes).then(function (hash) { return { bytes: bytes, hash: hash }; });
        }).then(function (loaded) {
          if (!operationIsCurrent('modelImport', token, startedRevision)) return null;
          var bytes = loaded.bytes, hash = loaded.hash;
          if (accepted.format === 'RECIPE') {
            var parsed;
            try { parsed = JSON.parse(utf8(bytes)); } catch (_) { parsed = null; }
            var candidate = parsed && parsed.recipe ? parsed.recipe : parsed;
            var clean = P3D.normalizeRecipe(candidate);
            if (!clean) throw new Error('The JSON file does not contain a supported primitive recipe.');
            var recipeReport = Printable.inspectRecipe(clean, 20, profile);
            return Printable.sha256Hex(JSON.stringify(clean)).then(function (normalizedHash) {
              if (!operationIsCurrent('modelImport', token, startedRevision)) return;
              setSourceContext(null);
              replaceDesign('RECIPE', clean, null, null, '', 20, recipeReport, normalizedHash, 'modelImport');
              setTitle(clean.name || safeText(file.name.replace(/\.json$/i, ''), 100));
              announce(__alloT('stem.printlab.sr_import_inspected_locally_confirm_scale_and_review', 'Import inspected locally. Confirm scale and review Preflight before submitting.'));
            });
          } else if (accepted.format === 'STL') {
            var stlReport = Printable.inspectStl(bytes, 1, profile);
            setSourceContext(null);
            replaceDesign('STL', null, bytes, null, file.name, 1, stlReport, hash, 'modelImport');
            announce(__alloT('stem.printlab.sr_import_inspected_locally_confirm_scale_and_review', 'Import inspected locally. Confirm scale and review Preflight before submitting.'));
          } else {
            var glbReport = Printable.inspectGlb(bytes, 10, profile);
            if (hasBlockingIssue(glbReport)) {
              setSourceContext(null);
              replaceDesign('GLB', null, bytes, null, file.name, 10, glbReport, hash, 'modelImport');
              announce(__alloT('stem.printlab.sr_import_inspected_locally_confirm_scale_and_review', 'Import inspected locally. Confirm scale and review Preflight before submitting.'));
              return null;
            }
            return ensureThree().then(function (THREE) { return parseGlb(THREE, bytes); }).then(function (root) {
              if (!operationIsCurrent('modelImport', token, startedRevision)) { disposeObject(root, true); return; }
              glbReport = inspectObjectCapabilities(root, glbReport);
              setSourceContext(null);
              replaceDesign('GLB', null, bytes, root, file.name, 10, glbReport, hash, 'modelImport');
              announce(__alloT('stem.printlab.sr_import_inspected_locally_confirm_scale_and_review', 'Import inspected locally. Confirm scale and review Preflight before submitting.'));
            });
          }
          return null;
        }).catch(function (error) {
          if (operationIsCurrent('modelImport', token, startedRevision)) announce(error && error.message ? error.message : 'The model could not be imported.');
        });
      }

      function importGcodeMetadata(event) {
        var file = event.target.files && event.target.files[0]; event.target.value = '';
        var accepted = allowedGcodeFile(file); if (!accepted.ok) { announce(accepted.message); return; }
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable) { announce(__alloT('stem.printlab.sr_the_local_metadata_reader_is_still_loading', 'The local metadata reader is still loading.')); return; }
        var token = beginOperation('gcodeImport'), startedRevision = contextRevisionRef.current;
        announce(__alloT('stem.printlab.sr_reading_allowlisted_g_code_comments_locally_toolp', 'Reading allowlisted G-code comments locally. Toolpath commands will not be interpreted.'));
        var metadataPromise = readBytes(file).then(function (bytes) {
          var parsed = Printable.parseGcodeMetadata(bytes);
          if (!parsed.ok) throw new Error(parsed.errors.join(' '));
          return Printable.hashGcodeMetadata(parsed.value).then(function (hash) { return { value: parsed.value, hash: hash }; });
        });
        Promise.all([metadataPromise, currentModelHash()]).then(function (results) {
          if (!operationIsCurrent('gcodeImport', token, startedRevision)) return;
          var result = results[0], modelHash = results[1];
          var binding = manufacturingEvidenceBinding(modelHash, format, unitMm, materialId, profile);
          if (!binding) throw new Error('The active model could not be bound to this slicer evidence.');
          setGcodeMetadata(result.value); setGcodeMetadataHash(result.hash); setGcodeBinding(binding); clearJobArtifacts();
          if (result.value.estimatedTimeSeconds > 0) {
            var next = Object.assign({}, quoteConfig, { estimatedMinutes: Math.round(result.value.estimatedTimeSeconds / 6) / 10 });
            setQuoteConfig(next); persist({ quoteConfig: next });
          }
          announce(__alloT('stem.printlab.sr_slicer_comment_metadata_imported_locally_no_g_cod', 'Slicer comment metadata imported locally. No G-code command was stored or executed.'));
        }).catch(function (error) { if (operationIsCurrent('gcodeImport', token, startedRevision)) announce(error && error.message ? error.message : 'G-code comment metadata could not be read.'); });
      }

      function callRecipeAi(kind) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        if (!P3D || !plAiOn || typeof ctx.callGemini !== 'function') { announce(__alloT('stem.printlab.sr_ai_assistance_is_not_configured_manual_primitive', 'AI assistance is not configured. Manual primitive tools remain available.')); return; }
        var userInput = kind === 'refine' ? aiRefinement : aiSubject;
        if (!userInput.trim()) { announce(__alloT('stem.printlab.sr_describe_what_you_want_the_modeling_assistant_to', 'Describe what you want the modeling assistant to do.')); return; }
        if (typeof window !== 'undefined' && window.SelHub && typeof window.SelHub.safeRehearseCheck === 'function') {
          var check = window.SelHub.safeRehearseCheck(userInput, { toolId: 'printLab_ai', onSafetyFlag: ctx.onSafetyFlag });
          if (check && check.blocked) {
            announce(check.message || 'If you are going through a hard time, please reach out to a trusted adult or call/text 988.');
            return;
          }
        }
        var prompt = kind === 'refine' ? P3D.buildRefinePrompt(recipe, aiRefinement) : P3D.buildRecipePrompt(aiSubject);
        var operation = beginDesignOperation('ai'), token = operation.token, startedRevision = operation.revision;
        setAiBusy(true); announce(kind === 'refine' ? 'Preparing an AI-assisted revision…' : 'Preparing an AI-assisted primitive recipe…');
        Promise.resolve().then(function () { return ctx.callGemini(prompt, false, false, 0.5); }).then(function (response) {
          if (!operationIsCurrent('ai', token, startedRevision)) return;
          var next = P3D.parseRecipe(aiText(response));
          if (!next) throw new Error('The modeling response did not contain a valid primitive recipe.');
          updateRecipe(next, unitMm, 'ai'); setTitle(next.name || title); setAiUse(aiUse === 'MOSTLY_AI' ? 'MOSTLY_AI' : 'ASSISTED');
          var nextDisclosure = aiDisclosure || (kind === 'refine' ? 'AI helped revise a primitive-based model from my instruction.' : 'AI proposed a primitive-based starting model that I reviewed and can edit.');
          setAiDisclosure(nextDisclosure);
          persist({ title: next.name || title, aiUse: aiUse === 'MOSTLY_AI' ? 'MOSTLY_AI' : 'ASSISTED', aiDisclosure: nextDisclosure });
          announce(__alloT('stem.printlab.sr_ai_assisted_recipe_ready_review_every_part_and_ru', 'AI-assisted recipe ready. Review every part and run Preflight.'));
        }).catch(function (error) { if (operationIsCurrent('ai', token, startedRevision)) announce(error && error.message ? error.message : 'AI modeling was unavailable.'); }).then(function () { if (operationIsCurrent('ai', token, startedRevision)) setAiBusy(false); });
      }

      var chosenMaterial = materialById(materialId);
      var reopenedPackage = !!(sourceContext && sourceContext.sourceTool === 'geometryPrintPackage');
      var revisedPrint = sourceContext && sourceContext.sourceTool === 'geometryWorld' && sourceContext.packageReview;
      var showRevisionFindings = !!revisedPrint || (reopenedPackage && Number.isInteger(sourceContext.revisionNumber) && sourceContext.revisionNumber >= 2 && sourceContext.revisionNumber <= 9999);
      var versionNumber = revisedPrint && revisedPrint.revisionNumber || 2;
      var usePackageStlBytes = reopenedPackage && format === 'STL' && unitMm === 1 && !!fileBytes;
      var Printable = window.AlloModules && window.AlloModules.PrintableModel;
      var materialEstimate = Printable && report && Number(report.volumeMm3UpperBound) > 0
        ? Printable.estimateMaterial(report, { densityGPerCm3: chosenMaterial.density, infillPercent: infillPercent, supportPercent: supportPercent }) : null;
      var slicerMaterial = gcodeMetadata && gcodeMetadata.filamentGrams > 0 ? { estimatedGrams: gcodeMetadata.filamentGrams, method: 'reviewed-slicer-comment' } : null;
      var quoteMaterial = slicerMaterial || materialEstimate;
      var pointQuote = Printable && quoteMaterial ? Printable.estimatePointQuote(quoteMaterial, quoteConfig) : null;
      var geometryPhysicalSize = scaledGeometryWorldDimensions(sourceContext && sourceContext.summary, unitMm);
      var geometryPrinterFit = geometryWorldPrinterFit(geometryPhysicalSize, profile);
      var geometryPlanningClearanceMm = clamp(profile.planningClearanceMm, 0, 50, GEOMETRY_EDGE_CLEARANCE_MM);
      var geometryScaleRecommendation = geometryWorldScaleRecommendation(sourceContext && sourceContext.summary, profile, unitMm, geometryPlanningClearanceMm);
      var geometryOrientationAdvice = geometryWorldOrientationAdvice(sourceContext && sourceContext.summary, profile, unitMm, geometryPlanningClearanceMm);
      var currentTurnPreview = turnPreview && turnPreview.copy.source === sourceBytes && turnPreview.unitMm === unitMm && turnPreview.profile === profile && turnPreview.revision === contextRevisionRef.current && !unitHasDraft && !profileHasDraft ? turnPreview : null;
      var geometryClearanceFit = geometryPrinterFit && (!geometryScaleRecommendation || !geometryScaleRecommendation.needsReduction);
      var finishedDimensions = sourceContext && sourceContext.sourceTool === 'geometryWorld' && geometryPhysicalSize && sourceContext.summary.meshDimensions;
      var meshAxes = {width:'L', depth:'W', height:'H'};
      var basisExtent = finishedDimensions && finishedDimensions[meshAxes[sizeBasis]];
      var draftScale = unitDraft.trim() === '' ? NaN : Number(unitDraft);
      var validDraftScale = Number.isFinite(draftScale) && draftScale >= 0.01 && draftScale <= 1000;
      // Preserve precision when converting a draft between measurements. Round
      // display noise only, never the scale used by the model or export.
      var sizeInputMin = basisExtent ? Number((basisExtent * 0.01).toPrecision(12)) : 0.01;
      var sizeInputMax = basisExtent ? Number((basisExtent * 1000).toPrecision(12)) : 1000;
      var sizeInputValue = unitDraft;
      if (basisExtent) sizeInputValue = finishedDraft === null ? String(Number((basisExtent * draftScale).toPrecision(12))) : finishedDraft;
      var proposedPhysicalSize = unitHasDraft && validDraftScale && finishedDimensions ? scaledGeometryWorldDimensions(sourceContext.summary, draftScale) : null;
      var proposedPrinterFit = geometryWorldPrinterFit(proposedPhysicalSize, profile);
      var proposedClearance = proposedPhysicalSize && geometryWorldScaleRecommendation(sourceContext.summary, profile, draftScale, geometryPlanningClearanceMm);
      var gcodeEvidenceCurrent = !!(gcodeMetadata && gcodeMetadataHash && gcodeBinding);
      var rewardsAssetCompatibility = schoolRewardsAssetCompatibility(format, fileBytes && fileBytes.byteLength);
      var assetBytes = rewardsAssetCompatibility.byteLength, rewardsAssetSizeLabel = 'No local file';
      if (assetBytes >= 1024 * 1024) rewardsAssetSizeLabel = Number((assetBytes / (1024 * 1024)).toFixed(2)) + ' MiB';
      else if (assetBytes >= 1024) rewardsAssetSizeLabel = Number((assetBytes / 1024).toFixed(1)) + ' KiB';
      else if (assetBytes) rewardsAssetSizeLabel = assetBytes + (assetBytes === 1 ? ' byte' : ' bytes');

      function setQuoteConfigField(key, value) {
        var next = Object.assign({}, quoteConfig); next[key] = Number(value); setQuoteConfig(next); clearJobArtifacts(); persist({ quoteConfig: next });
      }

      function currentModelHash() {
        if (!Printable) return Promise.resolve('');
        if (contentHash) return Promise.resolve(contentHash);
        return Printable.sha256Hex(format === 'RECIPE' ? JSON.stringify(recipe || {}) : fileBytes);
      }

      function createJobTicket() {
        if (!guardPrintDrafts()) return;
        if (!Printable || !report || report.status === 'FAIL') { chooseTab('Preflight'); announce(__alloT('stem.printlab.sr_complete_model_analysis_before_creating_a_job_tic', 'Complete model analysis before creating a job ticket.')); return; }
        if (!gcodeEvidenceCurrent) { announce(__alloT('stem.printlab.sr_import_comment_metadata_from_the_approved_school', 'Import comment metadata from the approved school slicer for this exact model, scale, material, and printer profile before creating a job ticket.')); return; }
        if (!quoteMaterial || !(Number(quoteMaterial.estimatedGrams) > 0)) { announce(__alloT('stem.printlab.sr_the_reviewed_slicer_handoff_must_include_a_positi', 'The reviewed slicer handoff must include a positive material mass in grams before creating a job ticket.')); return; }
        if (!profileReviewed || !materialReviewed) { announce(__alloT('stem.printlab.sr_confirm_the_reviewed_material_and_printer_profile', 'Confirm the reviewed material and printer profile first.')); return; }
        var token = beginOperation('ticket'), startedRevision = contextRevisionRef.current;
        currentModelHash().then(function (hash) {
          if (!operationIsCurrent('ticket', token, startedRevision)) return null;
          var expectedBinding = manufacturingEvidenceBinding(hash, format, unitMm, materialId, profile);
          if (!expectedBinding || expectedBinding !== gcodeBinding) {
            setGcodeMetadata(null); setGcodeMetadataHash(''); setGcodeBinding('');
            throw new Error('The slicer evidence no longer matches the exact active model, scale, material, and printer profile. Import it again.');
          }
          return Printable.createPrintJobTicket({
            modelHash: hash, sourceFormat: format, unitDeclaration: format === 'RECIPE' ? '1 recipe unit = ' + unitMm + ' mm' : '1 source unit = ' + unitMm + ' mm', dimensionsMm: report.dimensionsMm,
            material: { key: materialId, name: chosenMaterial.name, densityGPerCm3: chosenMaterial.density, reviewed: true },
            printerProfile: Object.assign({ key: 'reviewed-school-profile', reviewed: true }, profile),
            advisoryEstimate: { materialGrams: quoteMaterial.estimatedGrams, printMinutes: quoteConfig.estimatedMinutes, pointQuote: pointQuote && pointQuote.totalPoints, method: quoteMaterial.method || 'staff-review-required' },
            gcodeMetadataHash: gcodeMetadataHash, createdAt: new Date().toISOString()
          });
        }).then(function (ticket) {
          if (!ticket || !operationIsCurrent('ticket', token, startedRevision)) return;
          setJobTicket(ticket); setSimulatorSnapshot(null); setSimulatorJobKey(''); setSimulatedSchedule(null); simulatorRef.current = null;
          announce(__alloT('stem.printlab.sr_created_a_privacy_minimized_local_job_ticket_it_c', 'Created a privacy-minimized local job ticket. It contains no G-code commands and does not authorize printing.'));
        }).catch(function (error) { if (operationIsCurrent('ticket', token, startedRevision)) announce(error && error.message ? error.message : 'The job ticket could not be created.'); });
      }

      function downloadJobTicket() {
        if (!guardPrintDrafts()) return;
        if (!Printable || !jobTicket) return;
        try { downloadBlob(new Blob([Printable.serializePrintJobTicket(jobTicket)], { type: 'application/json' }), Printable.safeFilename(title || 'print-job') + '.alloflow-print-job.json'); announce(__alloT('stem.printlab.sr_downloaded_the_versioned_job_ticket_for_staff_rev', 'Downloaded the versioned job ticket for staff review.')); }
        catch (error) { announce(error && error.message ? error.message : 'The job ticket could not be downloaded.'); }
      }

      function simulator() {
        if (!Printable) return null;
        if (!simulatorRef.current) simulatorRef.current = Printable.createPrinterAdapter('SIMULATOR', { printers: [
          { key: 'sim-printer-a', materials: [materialId], bedWidthMm: profile.bedWidthMm, bedDepthMm: profile.bedDepthMm, bedHeightMm: profile.bedHeightMm },
          { key: 'sim-printer-b', materials: [materialId], bedWidthMm: profile.bedWidthMm, bedDepthMm: profile.bedDepthMm, bedHeightMm: profile.bedHeightMm }
        ] });
        return simulatorRef.current;
      }

      function queueSimulation() {
        if (!jobTicket) { announce(__alloT('stem.printlab.sr_create_a_reviewed_job_ticket_before_using_the_sim', 'Create a reviewed job ticket before using the simulator.')); return; }
        try { var adapter=simulator(),job=adapter.submit(jobTicket,'sim-printer-a');setSimulatorJobKey(job.jobKey);setSimulatorSnapshot(adapter.snapshot());announce(__alloT('stem.printlab.sr_queued_a_simulation_only_job_no_printer_was_conta', 'Queued a simulation-only job. No printer was contacted.')); }
        catch(error){announce(error&&error.message?error.message:'The simulated job could not be queued.');}
      }

      function advanceSimulation() {
        var adapter=simulator();if(!adapter||!simulatorJobKey)return;
        try { var state=adapter.snapshot(),job=state.jobs[simulatorJobKey];if(job&&job.state==='PRINTING'&&job.progressPercent<75)adapter.emit({type:'JOB_PROGRESS',jobKey:simulatorJobKey,printerKey:job.printerKey,progressPercent:job.progressPercent+25,atMinute:state.sequence});else adapter.advance(simulatorJobKey);setSimulatorSnapshot(adapter.snapshot());announce(__alloT('stem.printlab.sr_advanced_simulated_telemetry_only_no_physical_act', 'Advanced simulated telemetry only. No physical action occurred.')); }
        catch(error){announce(error&&error.message?error.message:'The simulation could not advance.');}
      }

      function planCapacity() {
        if (!jobTicket) { announce(__alloT('stem.printlab.sr_create_a_job_ticket_before_planning_capacity', 'Create a job ticket before planning capacity.')); return; }
        var adapter=simulator();setSimulatedSchedule(adapter.plan([jobTicket,jobTicket,jobTicket]));announce(__alloT('stem.printlab.sr_planned_a_deterministic_three_copy_example_across', 'Planned a deterministic three-copy example across two simulated printers.'));
      }

      function buildSubmissionPreflight() {
        var next = report ? JSON.parse(JSON.stringify(report)) : null;
        if (next) next.materialEstimate = materialEstimate ? Object.assign({ material: materialId }, materialEstimate) : { material: materialId, method: 'Use the school slicer for this imported mesh.' };
        return next;
      }

      function guardAiDisclosure() {
        if (aiUse === 'NONE' || safeText(aiDisclosure, 300)) { setAiDisclosureError(''); return true; }
        setAiDisclosureError('Explain how AI assisted this design before preparing the print package or review handoff.');
        if (aiDisclosureInputRef.current) aiDisclosureInputRef.current.focus();
        return false;
      }

      function finalStlBytes(THREE) {
        // A reopened ZIP already contains the finished STL. Preserve every byte,
        // including its orientation and checksum, until a different scale is applied.
        if (usePackageStlBytes) return fileBytes.buffer.slice(fileBytes.byteOffset, fileBytes.byteOffset + fileBytes.byteLength);
        var object = makeModelObject(THREE, format, recipe, fileBytes, glbRoot, unitMm);
        if (!object) throw new Error('There is no model ready to export.');
        try {
          centerAndGround(THREE, object);
          var buffer = Printable.exportBinaryStl(THREE, object);
          if (!buffer) throw new Error('The model did not contain exportable triangles.');
          return buffer;
        } finally { disposeObject(object, false); }
      }

      function finalGeometryReview(THREE, filename) {
        var buffer = finalStlBytes(THREE);
        var inspection = Printable.inspectStl(buffer, 1, profile);
        if (inspection.status === 'FAIL') throw new Error('The exported model needs another preflight review.');
        var reviewReport = Object.assign({}, inspection, {
          materialEstimate: { material: materialId, method: 'Use the school slicer for this imported mesh.' }
        });
        return Printable.sha256Hex(buffer).then(function (hash) {
          if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error('The browser could not verify the STL for this review package. Open Print Lab using HTTPS or download the STL on its own.');
          var review = Printable.serializeSubmission({
            title: safeText(title, 100) || 'Geometry World model', description: description, sourceFormat: 'STL', originalFilename: filename,
            contentHash: hash, unitDeclaration: '1 STL unit = 1 mm',
            aiUse: aiUse, aiDisclosure: aiDisclosure, studentNote: studentNote,
            preflight: reviewReport, createdAt: new Date().toISOString()
          });
          return { buffer: buffer, report: reviewReport, hash: hash, review: review };
        });
      }

      function printFileBasename(fallback) {
        var base = Printable.safeFilename(title || fallback);
        return revisedPrint ? base + '-v' + versionNumber : base;
      }

      function downloadHandoff() {
        if (!guardPrintDrafts()) return;
        if (!Printable) { announce(__alloT('stem.printlab.sr_the_handoff_engine_is_still_loading', 'The handoff engine is still loading.')); return; }
        var activeReport = report || runPreflight(); if (!activeReport || activeReport.status === 'FAIL') { chooseTab('Preflight'); announce(__alloT('stem.printlab.sr_resolve_blocking_preflight_items_before_creating', 'Resolve blocking preflight items before creating a handoff.')); return; }
        if (!title.trim()) { if (titleInputRef.current) titleInputRef.current.focus(); return; }
        if (!guardAiDisclosure()) return;
        var request = beginDownload('handoff', 'handoff', 'Preparing the review handoff…'); if (!request) return;
        var token = request.token, startedRevision = request.revision;
        var serializedPromise;
        var geometryHandoff = sourceContext && (sourceContext.sourceTool === 'geometryWorld' || reopenedPackage) && format === 'STL';
        if (geometryHandoff) {
          serializedPromise = (usePackageStlBytes ? Promise.resolve(null) : ensureThree()).then(function (THREE) {
            if (!operationIsCurrent('handoff', token, startedRevision)) return null;
            return finalGeometryReview(THREE, printFileBasename('student-model') + '.stl').then(function (artifact) { return artifact.review; });
          });
        } else {
          serializedPromise = Promise.resolve().then(function () { return contentHash || Printable.sha256Hex(format === 'RECIPE' ? JSON.stringify(recipe || {}) : fileBytes); }).then(function (hash) {
            if (!operationIsCurrent('handoff', token, startedRevision)) return;
            var genericName = format === 'RECIPE' ? '' : 'student-model.' + format.toLowerCase();
            return Printable.serializeSubmission({
              title: title, description: description, sourceFormat: format, originalFilename: genericName,
              contentHash: hash, unitDeclaration: format === 'RECIPE' ? '1 recipe unit = ' + unitMm + ' mm' : '1 source unit = ' + unitMm + ' mm',
              aiUse: aiUse, aiDisclosure: aiDisclosure, studentNote: studentNote, recipe: format === 'RECIPE' ? recipe : null,
              preflight: buildSubmissionPreflight(), createdAt: new Date().toISOString()
            });
          });
        }
        serializedPromise.then(function (serialized) {
          if (!serialized || !operationIsCurrent('handoff', token, startedRevision)) return;
          var name = printFileBasename('student-model') + '.alloflow-print.json';
          downloadBlob(new Blob([serialized], { type: 'application/json' }), name);
          finishDownload(request, 'complete', geometryHandoff ? 'Review handoff download started. Choose Optional STL export for its matching millimeter STL.' : 'Review handoff download started. Share it with the reviewer alongside the model file.');
        }).catch(function (error) { finishDownload(request, 'error', (error && error.message ? error.message : 'The handoff could not be created.') + ' Try the download again.'); });
      }

      function downloadPrintPackage() {
        if (!guardPrintDrafts()) return;
        if(!Printable || !sourceContext || sourceContext.sourceTool!=='geometryWorld' || !report || report.status==='FAIL') {chooseTab('Preflight');return;}
        if (!guardAiDisclosure()) return;
        var request=beginDownload('package','export','Preparing the print package: model, editable source, and review details…');if(!request)return;
        var token=request.token, startedRevision=request.revision;
        Promise.all([ensureThree(),ensurePrintZip()]).then(function(ready){
          if(!operationIsCurrent('export',token,startedRevision))return null;
          return finalGeometryReview(ready[0], 'model.stl').then(function(artifact){
            if(!operationIsCurrent('export',token,startedRevision))return null;
            var buffer = artifact.buffer, inspection = artifact.report;
            var zip=new window.JSZip(), editable=editableGeometrySource(sourceContext.sourceModel);
            var packageTitle = safeText(title, 100) || 'Geometry World model';
            var reviewFile = 'review.alloflow-print.json';
            var manifest={schema:'alloflow-print-package/1',title:packageTitle,description:safeText(description,500),reviewFile:reviewFile,
              model:{file:'model.stl',sha256:artifact.hash,units:'mm',coordinateSystem:'z-up',dimensionsMm:inspection.dimensionsMm},
              source:{tool:'geometryWorld',millimetersPerBlock:unitMm,editableFile:editable?'editable-world.json':null,recipeFile:'block-source.json'},
              material:materialId,printerProfile:profile,preflight:inspection,aiUse:aiUse,aiDisclosure:safeText(aiDisclosure,500),
              studentNote:safeText(studentNote,300),reviewStatus:'AWAITING_SLICER_AND_STAFF_REVIEW'};
            if (turnActive) manifest.source.printTurnDegrees = 90;
            if (revisedPrint) {
              manifest.source.revisionNumber = versionNumber;
              var comparison = changeHistoryForZip(revisedPrint,printReference({
                basis:'working',dimensions:inspection.dimensionsMm,unitMm:unitMm,materialId:materialId,printTurnDegrees:turnActive?90:0
              }));
              if (comparison) manifest.revisionComparison = comparison;
            }
            zip.file('model.stl',new Uint8Array(buffer));zip.file('manifest.json',JSON.stringify(manifest,null,2));
            zip.file(reviewFile, artifact.review);
            zip.file('block-source.json',JSON.stringify(sourceContext.sourceModel,null,2));
            if(editable)zip.file('editable-world.json',JSON.stringify(editable,null,2));
            var reviewInstructions = schoolRewardsAssetCompatibility('STL', buffer.byteLength).compatible
              ? 'In School Rewards, import '+reviewFile+', then choose model.stl from this same folder.'
              : 'Share '+reviewFile+' and model.stl together for local staff review. This STL exceeds the School Rewards 4 MiB upload limit.';
            if (turnActive) reviewInstructions += '\nThe print copy in model.stl is already turned 90 degrees around its vertical axis. The editable world and block source keep their building orientation.';
            if (manifest.revisionComparison) reviewInstructions += '\nReopen this ZIP in Print Lab to see the change totals and saved cell examples.';
            zip.file('READ-ME.txt','Geometry World print package\n\nOpen model.stl in the school slicer. Units are millimeters: import at 100% scale. The chosen '+unitMm+' mm per block is already applied.\nDimensions (width x depth x height): '+inspection.dimensionsMm.width+' x '+inspection.dimensionsMm.depth+' x '+inspection.dimensionsMm.height+' mm.\n\n'+reviewInstructions+'\n\n'+(editable?'To edit the selected creation, open editable-world.json with Geometry World > Open editable world.':'The selection exceeds editable sandbox file limits; block-source.json preserves its source recipe for recovery.')+'\nmanifest.json records the STL hash, dimensions, material, printer profile and advisory checks. Review orientation, supports and the sliced layers before staff approval. This package does not start a printer.\n'+(safeText(studentNote,300)?'\nDesign note from the student: '+safeText(studentNote,300)+'\n':''));
            return zip.generateAsync({type:'blob',compression:'DEFLATE'});
          });
        }).then(function(blob){if(blob && operationIsCurrent('export',token,startedRevision)){downloadBlob(blob,printFileBasename('geometry-world')+'-print-package.zip');finishDownload(request,'complete','Print package download started. Unzip it and open model.stl in your slicer at 100% scale; the millimeter size is already applied.');}})
          .catch(function(error){finishDownload(request,'error',(error && error.message || 'The print package could not be created.')+' Try the download again.');});
      }
      function exportStl() {
        if (!guardPrintDrafts()) return;
        if (!Printable || !report || report.status === 'FAIL') { chooseTab('Preflight'); announce(__alloT('stem.printlab.sr_run_preflight_and_resolve_blocking_items_before_e', 'Run preflight and resolve blocking items before exporting STL.')); return; }
        var request = beginDownload('stl', 'export', 'Preparing the STL at its final millimeter size…'); if (!request) return;
        var token = request.token, startedRevision = request.revision;
        (usePackageStlBytes ? Promise.resolve(null) : ensureThree()).then(function (THREE) {
          if (!operationIsCurrent('export', token, startedRevision)) return;
          var buffer = finalStlBytes(THREE);
          downloadBlob(new Blob([buffer], { type: 'model/stl' }), printFileBasename('student-model') + '.stl');
          finishDownload(request, 'complete', 'STL download started. Open it in your slicer at 100% scale; the millimeter size is already applied.');
        }).catch(function (error) { finishDownload(request, 'error', (error && error.message ? error.message : 'STL export was unavailable.') + ' Try the download again.'); });
      }

      function field(label, value, onChange, options) {
        options = options || {};
        return h('label', { className: 'block text-[0.6875rem] font-bold text-slate-200' },
          h('span', { className: 'mb-1 block' }, label),
          h('input', { id: options.id, ref: options.ref, type: options.type || 'text', value: value, min: options.min, max: options.max, step: options.step, maxLength: options.maxLength, onChange: function (event) { onChange(event.target.value); }, className: 'min-h-[44px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-sm text-white' })
        );
      }

      function renderPart(part, index) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        return h('fieldset', { key: 'part-' + index, className: 'rounded-xl border border-slate-700 bg-slate-950/70 p-3' },
          h('legend', { className: 'px-1 text-xs font-black text-cyan-200' }, 'Part ' + (index + 1)),
          h('div', { className: 'grid gap-2 md:grid-cols-4' },
            h('label', { className: 'text-[0.6875rem] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Shape'), h('select', { value: part.shape, onChange: function (event) { patchPart(index, { shape: event.target.value }); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 px-2 text-white' }, SHAPES.map(function (shape) { return h('option', { key: shape, value: shape }, shape); }))),
            [0, 1, 2].map(function (axis) { return field('Size ' + ['X / radius', 'Y / height', 'Z / depth'][axis], part.size[axis], function (value) { var next = part.size.slice(); next[axis] = Number(value); patchPart(index, { size: next }); }, { type: 'number', min: 0.02, max: 4, step: 0.05 }); })
          ),
          h('div', { className: 'mt-2 grid gap-2 md:grid-cols-4' },
            [0, 1, 2].map(function (axis) { return field('Position ' + ['X', 'Y', 'Z'][axis], part.position[axis], function (value) { var next = part.position.slice(); next[axis] = Number(value); patchPart(index, { position: next }); }, { type: 'number', min: axis === 1 ? -4 : -4, max: axis === 1 ? 8 : 4, step: 0.05 }); }),
            h('label', { className: 'text-[0.6875rem] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Color'), h('input', { type: 'color', value: part.color, onChange: function (event) { patchPart(index, { color: event.target.value }); }, className: 'h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 p-1' }))
          ),
          // Drawn shapes (lathe/extrude) carry a profile; the shared Prim3D pad edits it.
          P3D && typeof P3D.renderProfilePad === 'function' && P3D.PROFILE_SHAPES.indexOf(part.shape) !== -1 && Array.isArray(part.profile)
            ? h('div', { className: 'mt-2' }, P3D.renderProfilePad(React, {
                part: part, selectedPoint: profilePoints[index] || 0, theme: 'dark', idPrefix: 'printlab-part-' + index,
                onSelectPoint: function (i) { var next = Object.assign({}, profilePoints); next[index] = i; setProfilePoints(next); },
                onCommit: function (clean, message) { patchPart(index, { profile: clean }); if (message) announce(message); }
              }))
            : null,
          h('div', { className: 'mt-2 flex flex-wrap gap-2' },
            h('button', { type: 'button', disabled: !P3D || recipe.parts.length >= P3D.MAX_PARTS, onClick: function () { updateRecipe(P3D.duplicatePart(recipe, index)); }, className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white disabled:opacity-50' }, 'Duplicate'),
            h('button', { type: 'button', onClick: function () { updateRecipe(P3D.removePart(recipe, index)); }, className: 'min-h-[40px] rounded-lg border border-rose-700 px-3 text-xs font-bold text-rose-200' }, 'Remove')
          )
        );
      }

      function printOrientationControls() {
        if (!originalContext || originalContext.sourceTool !== 'geometryWorld' || format !== 'STL' || (!turnActive && !geometryOrientationAdvice)) return null;
        var buttonClass = 'min-h-[44px] rounded-lg border border-violet-400 px-3 text-sm font-bold text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200';
        if (turnActive) return h('section', { className: 'mt-3 rounded-xl border border-violet-600 bg-violet-950/30 p-3', 'aria-label': __alloT('stem.printlab.printOrientation', 'Print orientation'), 'data-print-orientation': true, 'data-turn-applied': true },
          h('strong', { className: 'block text-sm text-white' }, 'Print copy turned 90°'),
          h('p', { className: 'my-2 text-xs leading-5 text-slate-200' }, geometryPhysicalSize.label+' (width × depth × height). Your editable blocks keep their building orientation.'),
          h('button', { type: 'button', className: buttonClass, onClick: function () { commitPrintTurn(true); } }, 'Restore original orientation'));
        return h('section', { className: 'mt-3 rounded-xl border border-violet-600 bg-violet-950/30 p-3', 'aria-label': __alloT('stem.printlab.printOrientation', 'Print orientation'), 'data-print-orientation': true },
          currentTurnPreview && h('div', { 'data-turn-preview': true, className: 'mb-3 text-sm leading-6 text-white' },
            h('strong', null, 'Turn preview at '+unitMm+' mm per block'),
            h('p', null, 'Current: '+geometryPhysicalSize.label+'. Turned: '+currentTurnPreview.size.label+' (width × depth × height).'),
            h('p', { className: 'text-xs text-slate-200' }, 'Apply to check this print copy. The editable blocks keep their building orientation.')),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { ref: turnButtonRef, type: 'button', className: buttonClass, onClick: currentTurnPreview ? function () { commitPrintTurn(false); } : previewPrintTurn }, currentTurnPreview ? 'Apply 90° turn' : 'Preview 90° turn'),
            currentTurnPreview && h('button', { type: 'button', className: buttonClass, onClick: function () { setTurnPreview(null); if (turnButtonRef.current) turnButtonRef.current.focus(); announce('Turn preview cancelled.'); } }, 'Cancel turn preview')));
      }

      function editPackageBlocksButton() {
        if (!reopenedPackage || !sourceContext.editableWorld) return null;
        return h('button', { type: 'button', 'data-edit-package-blocks': true, onClick: editReopenedBlocks, className: 'mt-3 min-h-[44px] rounded-lg border border-cyan-400 px-4 text-sm font-bold text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200' }, 'Edit blocks in Geometry World');
      }

      function packageOpenPanel() {
        var result = packageRead && packageRead.status === 'ready' ? packageRead.result : null;
        var dims = result && result.dimensions;
        var sizeText = dims && [dims.width, dims.depth, dims.height].map(function (value) { return value.toLocaleString(undefined, { maximumSignificantDigits: 6 }); }).join(' × ');
        var secondary = 'min-h-[44px] rounded-lg border border-slate-400 px-3 text-sm font-bold text-white';
        return h('section', { ref: packageSectionRef, 'data-print-package-open': true, 'aria-label': __alloT('stem.printlab.openPrintPackage', 'Open a Geometry World print package'), className: 'rounded-2xl border border-cyan-700 bg-slate-900 p-4' },
          h('h2', { className: 'text-base font-black text-white' }, reopenedPackage ? 'Reopened print package' : 'Open a print package'),
          h('p', { className: 'mt-1 text-sm leading-6 text-slate-200' }, reopenedPackage ? title + ' was reopened from its finished STL. '+(sourceContext.editableAvailable ? 'Preview its editable blocks in Geometry World to start a revision.' : 'This package has no editable world.') : 'Choose a Geometry World ZIP to preview the finished model before opening it.'),
          editPackageBlocksButton(),
          h('button', { type: 'button', ref: packageChooserRef, onClick: function () { if (packageInputRef.current) packageInputRef.current.click(); }, className: 'mt-3 min-h-[44px] rounded-lg border border-cyan-400 px-4 text-sm font-bold text-cyan-100' }, 'Choose print package'),
          h('input', { type: 'file', accept: '.zip,application/zip', hidden: true, ref: packageInputRef, onChange: choosePrintPackage, 'aria-label': __alloT('stem.printlab.packageZipLabel', 'Geometry World print package ZIP') }),
          packageRead && packageRead.status === 'reading' && h('div', { className: 'mt-3 flex flex-wrap items-center gap-3' }, h('p', { role: 'status', className: 'text-sm text-white' }, 'Checking the print package…'), h('button', { type: 'button', onClick: cancelPackagePreview, className: secondary }, 'Cancel checking')),
          packageRead && packageRead.status === 'error' && h('p', { ref: packageResultRef, tabIndex: -1, role: 'alert', className: 'mt-3 rounded-lg border border-rose-500 bg-rose-950 p-3 text-sm text-rose-100' }, packageRead.message),
          result && h('div', { 'data-print-package-preview': true, className: 'mt-3 rounded-xl border border-cyan-600 bg-slate-950 p-3' },
            h('h3', { ref: packageResultRef, tabIndex: -1, className: 'text-base font-bold text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-amber-200' }, 'Package preview: '+(safeText(result.manifest.title, 100) || 'Geometry World model')),
            h('p', { className: 'mt-2 text-sm text-white' }, 'Finished size: '+sizeText+' mm (width × depth × height).'),
            h('p', { className: 'mt-2 text-xs leading-5 text-slate-200' }, result.editableWorld ? 'Editable blocks included. Open for preflight, then choose Edit blocks in Geometry World to revise them.' : 'No editable world is included. The finished STL is available for preflight.'),
            h('p', { className: 'mt-2 text-xs leading-5 text-slate-200' }, 'Opening replaces the current Print Lab model and checks this STL against your current printer profile.'),
            h('div', { className: 'mt-3 flex flex-wrap gap-2' },
              h('button', { type: 'button', disabled: !runtimeReady, onClick: openPackageForPreflight, className: 'min-h-[44px] rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white disabled:opacity-50' }, 'Open for preflight'),
              h('button', { type: 'button', onClick: cancelPackagePreview, className: secondary }, 'Cancel preview'))));
      }

      function designPanel() {
        return h('div', { className: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]' },
          h('div', { className: 'space-y-4' },
            sourceContext && sourceContext.sourceTool === 'archStudio' && h('section', { className: 'rounded-2xl border border-amber-500/70 bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-950 p-4', 'aria-labelledby': 'print-lab-archstudio-source-title' },
              h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                h('div', null,
                  h('p', { className: 'text-[0.625rem] font-black uppercase tracking-[.16em] text-amber-300' }, 'Local connected-tool handoff'),
                  h('h2', { id: 'print-lab-archstudio-source-title', className: 'mt-1 text-lg font-black text-white' }, 'From Architecture Studio'),
                  h('p', { className: 'mt-1 max-w-2xl text-xs leading-5 text-slate-200' }, 'The STL preview is the building as physical geometry. The editable block model stays in Architecture Studio, which keeps its own save.')
                ),
                h('span', { className: 'rounded-full border border-amber-400/50 bg-amber-950 px-3 py-1 text-[0.625rem] font-black text-amber-100' }, 'Default: 5 mm / block')
              ),
              h('dl', { className: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3' },
                [['Blocks', sourceContext.summary && sourceContext.summary.blockCount || 0], ['STL triangles', sourceContext.summary && sourceContext.summary.triangleCount || 0], ['Mesh envelope', sourceContext.summary && sourceContext.summary.meshDimensions ? sourceContext.summary.meshDimensions.L + ' × ' + sourceContext.summary.meshDimensions.W + ' × ' + sourceContext.summary.meshDimensions.H + ' units' : '-']].map(function (item) { return h('div', { key: item[0], className: 'rounded-xl border border-slate-700 bg-slate-950/60 p-2' }, h('dt', { className: 'text-[0.5625rem] font-bold uppercase text-slate-300' }, item[0]), h('dd', { className: 'mt-1 text-sm font-black text-white' }, String(item[1]))); })
              ),
              geometryPhysicalSize && h('p', { className: 'mt-3 rounded-xl border border-emerald-400/50 bg-emerald-950/35 p-3 text-sm font-black text-white', 'aria-live': 'polite' }, 'Current physical size: ' + geometryPhysicalSize.label),
              h('div', { className: 'mt-3 flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: function () { if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool('archStudio'); }, className: 'min-h-[42px] rounded-xl bg-amber-700 px-4 text-xs font-black text-white' }, 'Revise in Architecture Studio')
              ),
              h('p', { className: 'mt-3 text-[0.6875rem] leading-5 text-amber-100' }, 'Stone, wood, glass, and the other studio materials describe appearance only. Choose the physical scale below and the actual school filament in Materials.')
            ),
            sourceContext && sourceContext.sourceTool === 'artStudio' && h('section', { className: 'rounded-2xl border border-pink-500/70 bg-gradient-to-br from-pink-950/70 via-slate-900 to-violet-950/80 p-4', 'aria-labelledby': 'print-lab-artstudio-source-title' },
              h('p', { className: 'text-[0.625rem] font-black uppercase tracking-[.16em] text-pink-300' }, 'Local connected-tool handoff'),
              h('h2', { id: 'print-lab-artstudio-source-title', className: 'mt-1 text-lg font-black text-white' }, 'From Art Studio'),
              h('p', { className: 'mt-1 max-w-2xl text-xs leading-5 text-slate-200' }, 'This sculpture arrived as the same editable primitive recipe the Design tab uses, so every part can still be changed here. Nothing was uploaded and nothing about the student travelled with it.'),
              h('dl', { className: 'mt-3 grid grid-cols-2 gap-2' },
                [['Sculpture', sourceContext.summary && sourceContext.summary.name || title || 'Untitled'], ['Parts', sourceContext.summary && sourceContext.summary.partCount || (recipe && recipe.parts ? recipe.parts.length : 0)]].map(function (item) { return h('div', { key: item[0], className: 'rounded-xl border border-slate-700 bg-slate-950/60 p-2' }, h('dt', { className: 'text-[0.5625rem] font-bold uppercase text-slate-300' }, item[0]), h('dd', { className: 'mt-1 text-sm font-black text-white' }, String(item[1]))); })
              ),
              h('div', { className: 'mt-3 flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: returnToArtStudio, className: 'min-h-[42px] rounded-xl bg-pink-700 px-4 text-xs font-black text-white' }, 'Revise in Art Studio'),
                h('button', { type: 'button', onClick: downloadArtStudioRecipe, className: 'min-h-[42px] rounded-xl border border-pink-400 px-4 text-xs font-black text-pink-100' }, 'Download editable sculpture recipe')
              ),
              h('p', { className: 'mt-3 text-[0.6875rem] leading-5 text-amber-100' }, 'Colours and finishes in Art Studio describe appearance only. Choose the physical scale below and the actual school filament in Materials.')
            ),
            sourceContext && sourceContext.sourceTool === 'geometryWorld' && h('section', { className: 'rounded-2xl border border-cyan-500/70 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-violet-950/80 p-4', 'aria-labelledby': 'print-lab-geometry-source-title' },
              h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                h('div', null,
                  h('p', { className: 'text-[0.625rem] font-black uppercase tracking-[.16em] text-cyan-300' }, 'Local connected-tool handoff'),
                  h('h2', { id: 'print-lab-geometry-source-title', className: 'mt-1 text-lg font-black text-white' }, 'From Geometry World'),
                  h('p', { className: 'mt-1 max-w-2xl text-xs leading-5 text-slate-200' }, 'The STL preview is physical geometry. A separate editable block recipe is held only in this open session so shapes and rotations are not lost.')
                ),
                h('span', { className: 'rounded-full border border-cyan-400/50 bg-cyan-950 px-3 py-1 text-[0.625rem] font-black text-cyan-100' }, 'Applied: ' + unitMm + ' mm / block')
              ),
              h('dl', { className: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4' },
                [
                  ['Selected blocks', sourceContext.summary && sourceContext.summary.blockCount || 0],
                  ['Shaped pieces', sourceContext.summary && sourceContext.summary.shapedCount || 0],
                  ['STL triangles', sourceContext.summary && sourceContext.summary.triangleCount || 0],
                  ['Block envelope', sourceContext.summary && sourceContext.summary.dimensions ? sourceContext.summary.dimensions.L + ' × ' + sourceContext.summary.dimensions.W + ' × ' + sourceContext.summary.dimensions.H + ' blocks' : '-']
                ].map(function (item) { return h('div', { key: item[0], className: 'rounded-xl border border-slate-700 bg-slate-950/60 p-2' }, h('dt', { className: 'text-[0.5625rem] font-bold uppercase text-slate-300' }, item[0]), h('dd', { className: 'mt-1 text-sm font-black text-white' }, String(item[1]))); })
              ),
              geometryPhysicalSize && h('div', { className: 'mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/50 bg-emerald-950/35 p-3', 'aria-live': 'polite' },
                h('div', null,
                  h('p', { className: 'text-[0.5625rem] font-black uppercase tracking-[.12em] text-emerald-300' }, 'Current physical size'),
                  h('p', { className: 'mt-1 text-xl font-black text-white' }, geometryPhysicalSize.label),
                  h('p', { className: 'mt-1 text-[0.625rem] leading-4 text-emerald-100' }, 'Exact STL mesh envelope at ' + unitMm + ' mm per Geometry World block. Width × depth × height.')
                ),
                h('button', { type: 'button', disabled: Math.abs(unitMm - 5) < 0.000001, onClick: function () { applyUnitScale(5, 'Restored the Geometry World default scale of 5 millimeters per block.'); }, className: 'min-h-[40px] rounded-lg border border-emerald-400 px-3 text-[0.625rem] font-black text-emerald-100 disabled:cursor-default disabled:opacity-50' }, 'Reset to 5 mm / block')
              ),
              h('div', { className: 'mt-3 flex flex-wrap gap-2' },
                h('button', { type:'button', onClick:function(){chooseTab('Preflight');}, className:'min-h-[44px] rounded-xl bg-emerald-700 px-4 text-sm font-black text-white' }, 'Check this model'),
                h('button', { type: 'button', onClick: returnToGeometryWorld, className: 'min-h-[42px] rounded-xl bg-cyan-700 px-4 text-xs font-black text-white' }, 'Revise in Geometry World'),
                h('button', { type: 'button', onClick: downloadGeometryWorldSource, className: 'min-h-[42px] rounded-xl border border-cyan-400 px-4 text-xs font-black text-cyan-100' }, 'Download editable block source')
              ),
              h('p', { className: 'mt-3 text-[0.6875rem] leading-5 text-amber-100' }, 'Virtual Stone, Wood, Gold, and other block labels describe appearance only. Select the actual school filament in Materials after reviewing its properties and end-of-life limits.')
            ),
            packageOpenPanel(),
            h(sourceContext && sourceContext.sourceTool === 'geometryWorld' ? 'details' : 'div', {className:'space-y-4', 'data-print-alternative-design':true},
            sourceContext && sourceContext.sourceTool === 'geometryWorld' && h('summary', {className:'min-h-[44px] cursor-pointer rounded-xl border border-slate-600 p-3 text-sm font-bold text-slate-200'}, 'Start a different model'),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-create-title' },
              h('h2', { id: 'print-lab-create-title', className: 'text-lg font-black text-white' }, 'Design with primitives'),
              h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'Build directly, bring in a Geometry Sandbox sculpture, or ask AI for an editable starting recipe. Every AI result uses the same constrained primitive format.'),
              !sourceContext && h('div', { className: 'mt-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3' },
                h('p', { className: 'text-[0.625rem] font-black uppercase tracking-wide text-slate-300' }, 'Or start in another tool'),
                h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'Geometry World and Architecture Studio build with blocks; Art Studio sculpts with primitive shapes. Each one has a Print Lab button that brings the model here, and each Print Lab card has a way back.'),
                h('div', { className: 'mt-2 flex flex-wrap gap-2' },
                  h('button', { type: 'button', onClick: function () { startInTool('geometryWorld'); }, className: 'min-h-[40px] rounded-lg border border-cyan-400/60 px-3 text-xs font-black text-cyan-100' }, 'Start in Geometry World'),
                  h('button', { type: 'button', onClick: function () { startInTool('archStudio'); }, className: 'min-h-[40px] rounded-lg border border-amber-400/60 px-3 text-xs font-black text-amber-100' }, 'Start in Architecture Studio'),
                  h('button', { type: 'button', onClick: function () { startInTool('artStudio'); }, className: 'min-h-[40px] rounded-lg border border-pink-400/60 px-3 text-xs font-black text-pink-100' }, 'Start in Art Studio')
                )
              ),
              runtimeError && h('p', { role: 'alert', className: 'mt-2 rounded-lg border border-rose-700 bg-rose-950/40 p-2 text-xs text-rose-100' }, runtimeError),
              h('div', { className: 'mt-3 flex flex-wrap gap-2', 'aria-label': __alloT('stem.printlab.a11y_add_a_primitive', 'Add a primitive') }, SHAPES.map(function (shape) { return h('button', { key: shape, type: 'button', disabled: !runtimeReady, onClick: function () { addPrimitive(shape); }, className: 'min-h-[42px] rounded-xl bg-cyan-700 px-3 text-xs font-black text-white disabled:opacity-50' }, '+ ' + shape); })),
              recipe && field('Model name', recipe.name || '', function (value) { updateRecipe(Object.assign({}, recipe, { name: safeText(value, 80) })); }),
              !recipe && h('p', { className: 'mt-3 rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-300' }, 'No primitive recipe yet. Add a shape, import a file, or use an optional AI starting point.'),
              recipe && h('div', { className: 'mt-3 space-y-3' }, recipe.parts.map(renderPart))
            ),
            (!plAiOn && !ctx.isTeacherMode) ? (recipe ? h('div', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4' },
              h('button', { type: 'button', onClick: returnToArtStudio, className: 'min-h-[44px] rounded-xl bg-pink-800 px-4 text-sm font-bold text-white' }, 'Edit this model in Sculpt 3D')) : null) :
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-ai-title' },
              h('h2', { id: 'print-lab-ai-title', className: 'text-base font-black text-white' }, 'Optional AI modeling assistant'),
              h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Describe the object, its broad base, and its main parts. AI proposes editable shapes using your configured provider. Use your device keyboard dictation in either description field if you prefer speaking; review the text before creating. Leave out names and personal details.'),
              h('div', { className: 'mt-3 grid gap-3 md:grid-cols-2' },
                h('div', null, field('Object to create', aiSubject, function (value) { setAiSubject(value.slice(0, 1000)); }, { maxLength: 1000 }), h('button', { type: 'button', disabled: aiBusy || !plAiOn || !runtimeReady, onClick: function () { callRecipeAi('create'); }, className: 'mt-2 min-h-[42px] rounded-xl bg-violet-700 px-4 text-xs font-black text-white disabled:opacity-50' }, aiBusy ? 'Working…' : 'Create editable recipe')),
                h('div', null, field('Change to the current model', aiRefinement, function (value) { setAiRefinement(value.slice(0, 1000)); }, { maxLength: 1000 }), h('button', { type: 'button', disabled: !recipe || aiBusy || !plAiOn || !runtimeReady, onClick: function () { callRecipeAi('refine'); }, className: 'mt-2 min-h-[42px] rounded-xl border border-violet-500 px-4 text-xs font-black text-violet-100 disabled:opacity-50' }, 'Refine current recipe'))
              ),
              h('div', { className: 'mt-3 flex flex-wrap gap-2', 'aria-label': __alloT('stem.printlab.description_starters','Description starters') }, [
                'A small turtle with a broad flat base and short thick legs',
                'A simple rocket trophy attached to a wide circular base',
                'A chunky flower token with rounded petals on a flat backing'
              ].map(function (example) { return h('button', { key: example, type: 'button', onClick: function () { setAiSubject(example); }, className: 'min-h-[42px] rounded-lg border border-slate-500 px-3 text-left text-xs text-slate-200' }, example); })),
              recipe && h('button', { type: 'button', onClick: returnToArtStudio, className: 'mt-3 min-h-[44px] rounded-xl bg-pink-800 px-4 text-sm font-bold text-white' }, 'Edit this model in Sculpt 3D'),
              !plAiOn && h('p', { className: 'mt-2 text-xs text-amber-200' }, 'AI is not configured in this session. All manual design and import features remain available.')
            ),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-import-title' },
              h('h2', { id: 'print-lab-import-title', className: 'text-base font-black text-white' }, 'Import locally'),
              h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Accepted: primitive recipe JSON, self-contained GLB, or STL. Maximum 5 MB. The file is inspected in this browser and is not uploaded by Print Lab.'),
              h('label', { className: 'mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-sky-700 px-4 text-xs font-black text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-200' }, 'Choose RECIPE / GLB / STL', h('input', { type: 'file', accept: '.json,.glb,.stl,application/json,model/gltf-binary,model/stl', className: 'sr-only', onChange: importFile })),
              sourceName && h('p', { className: 'mt-2 text-xs text-slate-300' }, 'Loaded locally: ', h('strong', { className: 'text-white' }, sourceName), '. The downloaded handoff substitutes a generic file name and a content hash.'),
              savedNames.length > 0 && h('div', { className: 'mt-3 flex flex-wrap items-end gap-2' },
                h('label', { className: 'min-w-[220px] text-[0.6875rem] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Saved Geometry Sandbox sculpture'), h('select', { value: selectedSaved, onChange: function (event) { setSelectedSaved(event.target.value); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 px-2 text-white' }, h('option', { value: '' }, 'Choose a saved sculpture'), savedNames.map(function (name) { return h('option', { key: name, value: name }, name); }))),
                h('button', { type: 'button', disabled: !selectedSaved, onClick: importSavedRecipe, className: 'min-h-[42px] rounded-xl border border-cyan-500 px-4 text-xs font-black text-cyan-100 disabled:opacity-50' }, 'Open in Print Lab')
              )
            )
            )
          ),
          h('div', { className: 'space-y-4' },
            h(PrintPreview, { React: React, ready: runtimeReady, format: format, recipe: recipe, bytes: currentTurnPreview ? currentTurnPreview.copy.bytes : fileBytes, glbRoot: glbRoot, unitMm: unitMm, revision: currentTurnPreview ? revision+'-turn-preview' : revision, profile: profile, isContrast: isContrast }),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4' },
              h('h2', { className: 'text-sm font-black text-white' }, 'Physical scale'),
              sourceContext && (sourceContext.sourceTool === 'geometryWorld' || sourceContext.sourceTool === 'archStudio') && h('div', { className: 'mt-3', 'aria-label': sourceContext.sourceTool === 'archStudio' ? __alloT('stem.printlab.a11y_architecture_studio_scale_presets', 'Architecture Studio scale presets') : __alloT('stem.printlab.a11y_geometry_world_scale_presets', 'Geometry World scale presets') },
                h('p', { className: 'text-[0.625rem] font-black uppercase tracking-wide text-slate-300' }, 'Scale presets'),
                h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
                  [
                    { value: 2.5, label: 'Draft', note: '2.5 mm' },
                    { value: 5, label: 'Default', note: '5 mm' },
                    { value: 10, label: 'Large', note: '10 mm' }
                  ].map(function (preset) {
                    var selected = Math.abs(unitMm - preset.value) < 0.000001;
                    return h('button', {
                      key: preset.value,
                      type: 'button',
                      'aria-pressed': selected ? 'true' : 'false',
                      onClick: function () { applyUnitScale(preset.value, 'Changed Geometry World scale to ' + preset.value + ' millimeters per block. Run preflight again.'); },
                      className: 'min-h-[48px] rounded-xl border px-2 text-center text-[0.625rem] font-black ' + (selected ? 'border-cyan-300 bg-cyan-950 text-white' : 'border-slate-500 bg-slate-950 text-slate-200')
                    }, h('span', { className: 'block' }, preset.label), h('span', { className: 'mt-1 block font-medium text-slate-300' }, preset.note + ' / block'));
                  })
                )
              ),
              h('form', {noValidate:true,onSubmit:commitUnitDraft,'aria-label':__alloT('stem.printlab.physicalModelScale', 'Physical model scale'),'data-print-scale-editor':true,className:'mt-3 space-y-2'},
                finishedDimensions && h(React.Fragment,null,
                  h('label',{htmlFor:'print-lab-size-basis',className:'block text-sm font-bold text-slate-200'},'Set size by'),
                  h('select',{id:'print-lab-size-basis',value:sizeBasis,onChange:function(event){changeSizeBasis(event.target.value);},'aria-describedby':'print-lab-finished-size-help',className:'min-h-[44px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-sm text-white'},
                    h('option',{value:'unit'},'Millimeters per block'),
                    Object.keys(meshAxes).map(function(axis){return h('option',{key:axis,value:axis,disabled:!(finishedDimensions[meshAxes[axis]]>0)},'Finished '+axis); })),
                  h('p',{id:'print-lab-finished-size-help',className:'text-xs leading-5 text-slate-200'},'Choose a finished dimension in millimeters. The other two dimensions scale with it to keep the model’s proportions.')),
                h('label',{htmlFor:'print-lab-scale-input',className:'block text-sm font-bold text-slate-200'},basisExtent ? 'Finished '+sizeBasis+' (mm)' : sourceContext && sourceContext.sourceTool === 'geometryWorld' ? 'Millimeters per Geometry World block' : sourceContext && sourceContext.sourceTool === 'archStudio' ? 'Millimeters per Architecture Studio block' : 'Millimeters per model unit'),
                h('input',{ref:unitInputRef,id:'print-lab-scale-input',type:'number',inputMode:'decimal',min:sizeInputMin,max:sizeInputMax,step:'any',value:sizeInputValue,'aria-invalid':unitError?'true':undefined,'aria-describedby':'print-lab-scale-help'+(unitError?' print-lab-scale-error':''),onChange:function(event){editPhysicalSize(event.target.value);},className:'min-h-[44px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-sm text-white'}),
                h('p',{id:'print-lab-scale-help',className:'text-xs leading-5 text-slate-200'},unitHasDraft?'Size edit not applied. The preview and print files still use '+unitMm+' mm per unit.':'Applied scale: '+unitMm+' mm per unit. This size is used for the preview and print files.'),
                finishedDimensions && h('div',{'data-print-proposed-size':proposedPhysicalSize?true:undefined,role:'status','aria-atomic':'true',className:proposedPhysicalSize?'rounded-lg border border-cyan-700 bg-cyan-950/40 p-3 text-sm text-cyan-100':'sr-only'},proposedPhysicalSize && h(React.Fragment,null,
                  h('strong',null,'Proposed print size · '+proposedPhysicalSize.label),
                  h('p',{className:'mt-1 text-xs'},'Width × depth × height'),
                  h('p',{className:'mt-1 text-xs'},!proposedPrinterFit.fits ? 'Exceeds the printer’s '+proposedPrinterFit.over.join(' and ')+'.' : proposedClearance && proposedClearance.needsReduction ? 'Fits the printer, but leaves less than '+geometryPlanningClearanceMm+' mm planning clearance.' : 'Fits with '+geometryPlanningClearanceMm+' mm planning clearance.'))),
                h('div',{className:'flex flex-wrap gap-2'},h('button',{type:'submit',className:'min-h-[44px] rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white'},'Apply scale'),
                  unitHasDraft && h('button',{type:'button',onClick:function(){setUnitDraft(String(unitMm));setFinishedDraft(null);setUnitError('');focusUnitDraft();},className:'min-h-[44px] rounded-lg border border-slate-500 px-4 text-sm font-bold text-white'},'Discard size edit')),
                unitError && h('p',{id:'print-lab-scale-error',role:'alert',className:'rounded-lg border border-rose-600 bg-rose-950/30 p-3 text-sm text-rose-100'},unitError)),
              geometryPhysicalSize && h('p', { className: 'mt-2 rounded-lg border border-emerald-800 bg-emerald-950/30 p-2 text-xs font-bold text-emerald-100' }, 'Current mesh envelope: ' + geometryPhysicalSize.label + ' (width × depth × height).'),
              geometryPrinterFit && h('div', {
                className: 'mt-2 rounded-lg border p-2 text-[0.6875rem] leading-5 ' + (geometryClearanceFit ? 'border-emerald-700 bg-emerald-950/30 text-emerald-100' : 'border-amber-600 bg-amber-950/30 text-amber-100'),
                role: 'status',
                'data-geometry-printer-fit': geometryClearanceFit ? 'true' : 'false'
              },
                h('strong', null, geometryClearanceFit
                  ? 'Within the current printer envelope with ' + geometryPlanningClearanceMm + ' mm planning clearance. '
                  : geometryPrinterFit.fits
                    ? 'Fits the bed dimensions but not the preferred ' + geometryPlanningClearanceMm + ' mm planning clearance. '
                    : 'Outside the current printer envelope. '),
                geometryClearanceFit
                  ? 'Compared with ' + geometryPrinterFit.profileLabel + '. This is a planning buffer only; preflight and staff review are still required.'
                  : geometryPrinterFit.fits
                    ? 'The mesh remains inside ' + geometryPrinterFit.profileLabel + ', but a smaller scale is suggested before preflight.'
                  : 'The ' + geometryPrinterFit.over.join(', ') + ' dimension' + (geometryPrinterFit.over.length === 1 ? ' is' : 's are') + ' too large for ' + geometryPrinterFit.profileLabel + '. Choose a smaller scale or revise the model.'
              ),
              geometryScaleRecommendation && geometryScaleRecommendation.needsReduction && h('div', {
                className: 'mt-2 rounded-xl border border-cyan-700 bg-cyan-950/30 p-3 text-cyan-50',
                role: 'region',
                'aria-label': __alloT('stem.printlab.a11y_suggested_geometry_world_scale_correction', 'Suggested Geometry World scale correction'),
                'data-geometry-scale-recommendation': geometryScaleRecommendation.canFit ? geometryScaleRecommendation.recommendedUnitMm : 'unavailable'
              },
                h('strong', { className: 'block text-xs' }, geometryScaleRecommendation.canFit
                  ? 'Suggested safe-fit scale: ' + geometryScaleRecommendation.recommendedUnitMm + ' mm per block'
                  : 'No supported scale preserves the planning clearance'),
                h('p', { className: 'mt-1 text-[0.6875rem] leading-5 text-cyan-100' }, geometryScaleRecommendation.canFit
                  ? h(React.Fragment, null,
                    h('span', null, geometryScaleRecommendation.limitingDimensions.join(' and ').replace(/^./, function (character) { return character.toUpperCase(); })),
                    geometryScaleRecommendation.limitingDimensions.length === 1 ? ' is the limiting dimension. ' : ' are the limiting dimensions. ',
                    'This targets a usable ' + geometryScaleRecommendation.availableLabel + ' envelope, preserving ' + geometryScaleRecommendation.clearanceMm + ' mm on every edge. Printer clips, purge lines, and machine keep-out zones still require slicer and staff review.'
                  )
                  : 'Revise the model or choose a different printer profile before preflight.'),
                geometryScaleRecommendation.canFit && geometryScaleRecommendation.recommendedPhysicalSize && h('dl', { className: 'mt-3 grid grid-cols-3 gap-2', 'aria-label': __alloT('stem.printlab.a11y_scale_change_preview', 'Scale change preview') },
                  h('div', { className: 'rounded-lg bg-slate-950/70 p-2' }, h('dt', { className: 'text-[0.5625rem] font-black uppercase tracking-wide text-slate-300' }, 'Current envelope'), h('dd', { className: 'mt-1 text-[0.625rem] font-bold text-white' }, geometryPhysicalSize.label)),
                  h('div', { className: 'rounded-lg bg-slate-950/70 p-2' }, h('dt', { className: 'text-[0.5625rem] font-black uppercase tracking-wide text-slate-300' }, 'Suggested envelope'), h('dd', { className: 'mt-1 text-[0.625rem] font-bold text-white' }, geometryScaleRecommendation.recommendedPhysicalSize.label)),
                  h('div', { className: 'rounded-lg bg-slate-950/70 p-2' }, h('dt', { className: 'text-[0.5625rem] font-black uppercase tracking-wide text-slate-300' }, 'Scale reduction'), h('dd', { className: 'mt-1 text-[0.625rem] font-bold text-white' }, geometryScaleRecommendation.reductionPercent + '%'))
                ),
                geometryScaleRecommendation.canFit && h('details', { className: 'mt-3 rounded-lg border border-cyan-800 bg-slate-950/50 px-3', 'data-geometry-scale-math': 'true' },
                  h('summary', { className: 'flex min-h-[40px] cursor-pointer items-center text-[0.6875rem] font-black text-cyan-100' }, 'How this scale was calculated'),
                  h('div', { className: 'pb-3 text-[0.625rem] leading-5 text-cyan-100' },
                    geometryScaleRecommendation.limitingCalculations.map(function (calculation) {
                      return h('p', { key: calculation.dimension },
                        calculation.dimension.replace(/^./, function (character) { return character.toUpperCase(); }) + ': ' + calculation.availableMm + ' mm usable ÷ ' + calculation.modelUnits + ' mesh units = ' + calculation.rawUnitMm + ' mm per unit.'
                      );
                    }),
                    h('p', { className: 'mt-1 text-slate-300' }, 'Print Lab rounds downward to ' + geometryScaleRecommendation.recommendedUnitMm + ' mm per block so rounding cannot exceed the planning envelope. This assumes the model keeps its current orientation.')
                  )
                ),
                geometryOrientationAdvice && h('div', {
                  className: 'mt-3 rounded-lg border border-violet-600 bg-violet-950/35 p-3 text-violet-50',
                  role: 'note',
                  'aria-label': __alloT('stem.printlab.a11y_alternative_90_degree_model_orientation', 'Alternative 90-degree model orientation'),
                  'data-geometry-orientation-advice': geometryOrientationAdvice.currentScaleFitsRotated ? 'preserve-scale' : 'improve-scale'
                },
                  h('strong', { className: 'block text-xs' }, 'A 90-degree turn may fit better'),
                  h('p', { className: 'mt-1 text-[0.6875rem] leading-5 text-violet-100' }, geometryOrientationAdvice.currentScaleFitsRotated
                    ? 'At the current ' + geometryOrientationAdvice.suggestedUnitMm + ' mm per block, a 90-degree horizontal turn in the school slicer would use an envelope of ' + geometryOrientationAdvice.rotatedPhysicalSize.label + ' and fit the selected planning envelope.'
                    : 'A 90-degree horizontal turn could allow up to ' + geometryOrientationAdvice.rotatedMaximumUnitMm + ' mm per block instead of ' + geometryOrientationAdvice.currentMaximumUnitMm + ' mm per block, a ' + geometryOrientationAdvice.improvementPercent + '% larger fit scale. At that scale, the rotated envelope would be ' + geometryOrientationAdvice.rotatedPhysicalSize.label + '.'),
                  h('p', { className: 'mt-2 text-[0.625rem] leading-5 text-violet-200' }, sourceContext && sourceContext.sourceTool === 'geometryWorld' ? 'This suggestion has not rotated or rewritten the STL. Preview the turn, then apply it to check the print copy.' : 'This suggestion has not rotated or rewritten the STL. Rotate it in the receiving slicer and review bed placement and supports.')
                ),
                geometryScaleRecommendation.canFit && h('button', {
                  type: 'button',
                  onClick: function () { applyUnitScale(geometryScaleRecommendation.recommendedUnitMm, 'Reduced Geometry World scale to ' + geometryScaleRecommendation.recommendedUnitMm + ' millimeters per block to preserve a ' + geometryScaleRecommendation.clearanceMm + ' millimeter planning clearance. Run preflight again.'); },
                  'aria-label': __alloAriaFill(__alloT('stem.printlab.a11y_use_suggested_scale_of_millimeters_per_geometry_world_block', 'Use suggested scale of {recommendedUnitMm} millimeters per Geometry World block'), { recommendedUnitMm: geometryScaleRecommendation.recommendedUnitMm }),
                  className: 'mt-3 min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-xs font-black text-white hover:bg-cyan-700'
                }, 'Use ' + geometryScaleRecommendation.recommendedUnitMm + ' mm / block')
              ),
              printOrientationControls(),
              h('p', { className: 'mt-2 text-[0.6875rem] leading-5 text-amber-100' }, format === 'STL' ? 'STL does not store units. Confirm this value and orientation again in the school slicer.' : format === 'GLB' ? 'GLB scene units and node transforms vary by exporter. Minecraft and other sources still need a deliberate target size.' : 'Recipe units are design units, not automatic millimeters.'),
              h('button', { type: 'button', onClick: function () { chooseTab('Preflight'); }, className: 'mt-3 min-h-[42px] w-full rounded-xl bg-emerald-700 px-4 text-xs font-black text-white' }, 'Continue to Preflight')
            )
          )
        );
      }

      function revisionSummary() {
        var saved=reopenedPackage && sourceContext.savedChanges;
        if (!revisedPrint && !saved) return null;
        var changes=saved ? saved.blockChanges : revisedPrint.blockChanges;
        var previous=saved ? saved.previous : revisedPrint.referencePrint;
        var current=saved ? saved.current : printReference({basis:'working',dimensions:geometryPhysicalSize || report && report.dimensionsMm,
          unitMm:unitMm,materialId:materialId,printTurnDegrees:turnActive ? 90 : 0});
        var previousCount=saved ? changes.removed+changes.modified+changes.unchanged : revisedPrint.previousBlockCount;
        var currentCount=saved ? changes.added+changes.modified+changes.unchanged : (sourceContext && sourceContext.summary ? sourceContext.summary.blockCount : null);
        var beforeSize=previous ? previous.dimensions : revisedPrint.previousDimensions;
        var afterSize=current && current.dimensions;
        function row(label, count, size) {
          var facts=[];
          if (Number.isInteger(count)) facts.push(count+(count===1?' block':' blocks'));
          if (validPrintDimensions(size)) facts.push(['width','depth','height'].map(function(axis){return Number(size[axis].toFixed(2));}).join(' × ')+' mm');
          if (!facts.length) return null;
          return h('div',{className:'mt-2'},h('dt',{className:'text-xs font-bold text-cyan-100'},label),
            h('dd',{className:'mt-1 text-sm text-white'},facts.join(' · ')));
        }
        var settings=[];
        if (previous && current) {
          if (previous.unitMm!==current.unitMm) settings.push('Scale changed from '+Number(previous.unitMm.toPrecision(6))+' to '+Number(current.unitMm.toPrecision(6))+' mm per block.');
          if (previous.materialId!==current.materialId) settings.push('Print filament changed from '+materialById(previous.materialId).name+' to '+materialById(current.materialId).name+'.');
          if (previous.printTurnDegrees!==current.printTurnDegrees) settings.push('Print orientation changed from '+previous.printTurnDegrees+'° to '+current.printTurnDegrees+'°.');
        }
        var dimensionDelta=[];
        if (validPrintDimensions(beforeSize) && validPrintDimensions(afterSize)) {
          ['width','depth','height'].forEach(function(axis){
            var delta=Number((afterSize[axis]-beforeSize[axis]).toFixed(2));
            if (delta!==0) dimensionDelta.push(axis+' '+(delta>0?'+':'−')+Math.abs(delta)+' mm');
          });
        }
        return h('section',{'data-print-revision-summary':true,'data-print-saved-history':saved?true:undefined,
          'aria-label':saved?__alloT('stem.printlab.a11y_saved_revision_comparison', 'Saved revision comparison'):__alloT('stem.printlab.a11y_print_revision', 'Print revision'),className:'mt-3 min-w-0 rounded-xl border border-cyan-700 bg-slate-950 p-3'},
          h('h3',{className:'text-base font-bold text-white'},saved?'Saved changes in revision '+sourceContext.revisionNumber:'Print revision '+versionNumber),
          h('p',{className:'mt-1 text-xs leading-5 text-slate-300'},saved?'This comparison was saved at export. The current printer check is shown in Preflight.':'Finished dimensions are width × depth × height.'),
          h('dl',null,row(previous && previous.basis==='package'?'Earlier print':'Before this edit',previousCount,beforeSize),
            row(saved?'Exported revision':'Revised model',currentCount,afterSize)),
          validPrintDimensions(beforeSize) && validPrintDimensions(afterSize) && h('p',{className:'mt-2 text-sm text-white'},
            dimensionDelta.length?'Size difference · '+dimensionDelta.join(' · ')+'.':'Finished dimensions are unchanged.'),
          settings.length>0 && h('ul',{className:'mt-2 space-y-1 text-xs leading-5 text-slate-200'},settings.map(function(setting){return h('li',{key:setting},setting);})),
          !changes && h('p',{className:'mt-2 text-xs leading-5 text-slate-200'},'Per-cell changes are unavailable for this revision.'),
          changes && changes.materialChanged>0 && h('p',{className:'mt-2 text-xs leading-5 text-slate-200'},'Block materials describe appearance. Selected print filament is '+chosenMaterial.name+'.'),
          changes && h(RevisionBlockChanges,{React:React,changes:changes,sampled:!!saved,
            canInspect:saved?null:canInspectChangedCell,onInspect:inspectChangedCell,key:saved?'saved':revisedPrint.revisionId}));
      }

      function meshRepairPanel() {
        return h('div', { className: 'mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3', 'aria-labelledby': 'repair-title', 'data-print-repair-tools': true },
          h('h3', { id: 'repair-title', className: 'text-sm font-black text-white' }, showRevisionFindings ? 'Preview a triangle repair' : 'Analyze & Repair'),
          h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, showRevisionFindings ? 'Create a separate STL to compare. The repair removes degenerate triangles and welds near-identical vertices. Open edges and separate shells still need inspection.' : 'STL repair only welds near-identical vertices and removes degenerate triangles. It does not fill holes, boolean-union shells, remesh, test wall thickness, or certify safety.'),
          h('button', { type: 'button', disabled: format !== 'STL' || !fileBytes, onClick: createRepairCandidate, className: 'mt-2 min-h-[44px] w-full rounded-lg border border-amber-500 px-3 text-xs font-black text-amber-100 disabled:opacity-50' }, 'Create conservative repair candidate'),
          repairResult && !repairResult.ok && h('p', { className: 'mt-2 text-sm text-amber-100' }, (repairResult.errors || ['The repair candidate could not be created.']).join(' ')),
          repairResult && repairResult.ok && h('div', { className: 'mt-2 space-y-2 text-xs text-slate-200' },
            h('p', null, 'Removed ', repairResult.removedDegenerateTriangles, ' degenerate triangle(s); welded ', repairResult.weldedVertexReferences, ' near-identical vertex reference(s). ', showRevisionFindings ? 'Candidate preflight: '+repairResult.report.status+'. Use it locally to replace the working STL and review its report.' : 'Not a watertightness claim.'),
            h('button', { type: 'button', onClick: useRepairCandidate, className: 'min-h-[44px] w-full rounded-lg bg-amber-700 px-3 font-black text-white' }, 'Use repaired candidate locally'),
            !showRevisionFindings && h('button', { type: 'button', onClick: downloadRepairCandidate, className: 'min-h-[44px] w-full rounded-lg border border-amber-500 px-3 font-black text-amber-100' }, 'Download repaired candidate')));
      }

      function findingCanUseBlockEditor(item) {
        return ['NO_GEOMETRY', 'TOO_MANY_TRIANGLES', 'FILE_TOO_LARGE', 'OPEN_EDGES', 'NON_MANIFOLD_EDGES', 'MULTIPLE_SHELLS', 'ASSEMBLY_NOT_UNIONED'].indexOf(item.code) >= 0;
      }

      function revisionFindings(findings) {
        var blocking = findings.filter(function (item) { return item.severity === 'ERROR'; });
        var warnings = findings.filter(function (item) { return item.severity === 'WARNING'; });
        var notes = findings.filter(function (item) { return item.severity !== 'ERROR' && item.severity !== 'WARNING'; });
        if (!findings.length && report.status === 'PASS') return null;
        var groups = [
          { key: 'blocking', title: 'Fix before downloading', items: blocking, visible: blocking.length || report.status === 'FAIL', style: 'border-rose-700 bg-rose-950/30' },
          { key: 'review', title: 'Review in the slicer', items: warnings, visible: warnings.length || report.status === 'WARN', style: 'border-amber-600 bg-amber-950/20' },
          { key: 'notes', title: 'Inspection notes', items: notes, visible: notes.length, style: 'border-slate-600 bg-slate-950' }
        ];
        var editGroup = groups.find(function (group) { return group.items.some(findingCanUseBlockEditor); });
        var connectionsGroup = groups.find(function (group) { return group.items.some(function(item){return item.code==='MULTIPLE_SHELLS' || item.code==='ASSEMBLY_NOT_UNIONED';}); });
        var fitGroup = groups.find(function (group) { return group.items.some(function (item) { return item.code === 'BED_FIT'; }); });
        var repairGroup = groups.find(function (group) { return group.items.some(function (item) { return item.code === 'DEGENERATE_TRIANGLES'; }); });
        var buttonClass = 'min-h-[44px] rounded-lg border border-cyan-400 px-4 text-sm font-bold text-cyan-100';
        var blocksAvailable = !reopenedPackage || !!sourceContext.editableWorld;
        function findingHint(code) {
          if (code === 'BED_FIT') {
            var size = report.dimensionsMm || {};
            return [['Width',size.width,profile.bedWidthMm],['Depth',size.depth,profile.bedDepthMm],['Height',size.height,profile.bedHeightMm]].filter(function (axis) { return Number.isFinite(axis[1]) && axis[1] > axis[2]; }).map(function (axis) { return axis[0]+' is '+axis[1]+' mm, '+Number((axis[1]-axis[2]).toPrecision(6))+' mm over the '+axis[2]+' mm printer limit.'; }).join(' ');
          }
          if (code === 'FILE_TOO_LARGE' || code === 'TOO_MANY_TRIANGLES') return blocksAvailable ? 'Simplify the block selection and send the revised model back for another check.' : 'Ask for a simpler model that meets the inspection limit and check it again.';
          if (code === 'NO_GEOMETRY') return blocksAvailable ? 'Choose blocks with a printable shape in Geometry World and send the selection again.' : 'A replacement model with printable triangles is needed.';
          if (code === 'MULTIPLE_SHELLS') return blocksAvailable ? 'Inspect each separate part in the sliced layers. If the parts should form one piece, check how their blocks connect.' : 'Inspect each separate part in the sliced layers and confirm whether the separation was intended.';
          if (code === 'OPEN_EDGES' || code === 'NON_MANIFOLD_EDGES') return 'Look for missing walls or unexpected joins in the sliced layers.';
          if (code === 'INCONSISTENT_WINDING' || code === 'INWARD_WINDING_ADVISORY') return 'Check the surface orientation in a mesh tool or slicer before printing.';
          if (code === 'ASSEMBLY_NOT_UNIONED') return 'Inspect the sliced intersections where separate parts are meant to join.';
          return '';
        }
        return h('section', { 'data-print-revision-findings': true, 'aria-label': __alloT('stem.printlab.revisedModelFindings', 'Revised model findings'), className: 'mt-3 space-y-3' }, groups.filter(function (group) { return group.visible; }).map(function (group) {
          var hasFit = group === fitGroup;
          return h('section', { key: group.key, 'data-print-finding-group': group.key, 'aria-label': group.title, className: 'rounded-xl border p-3 '+group.style },
            h('h3', { className: 'text-base font-bold text-white' }, group.title),
            h('p', { className: 'mt-1 text-xs leading-5 text-slate-200' }, group.key === 'blocking' ? 'Print downloads are unavailable until the blocking findings are resolved and the model is checked again.' : group.key === 'review' ? 'These warnings need review before printing. They allow downloads when no blocking findings remain.' : 'These notes accompany the current inspection.'),
            group.items.length ? h('ul', { className: 'mt-2 space-y-2 text-sm leading-6 text-white' }, group.items.map(function (item, index) {
              var hint = findingHint(item.code);
              return h('li', { key: item.code+index }, h('p', null, item.message || item.code || 'No description was provided.'), hint && h('p', { className: 'text-xs leading-5 text-slate-200' }, hint));
            })) : h('p', { className: 'mt-2 text-sm text-white' }, 'The inspector did not provide a specific finding. Review the report with staff.'),
            h('div', { className: 'mt-2 flex flex-wrap gap-2' },
              hasFit && !reopenedPackage && geometryOrientationAdvice && !turnActive && h('button', { type: 'button', className: buttonClass, onClick: function () { if (previewPrintTurn() && turnButtonRef.current) turnButtonRef.current.focus(); } }, 'Review 90° turn'),
              hasFit && h('button', { type: 'button', className: buttonClass, onClick: function () { if (guardPrintDrafts()) { chooseTab('Design'); focusUnitDraft(); } } }, 'Adjust physical size'),
              group === connectionsGroup && blocksAvailable && typeof ctx.setStemLabTool === 'function' && h('button',{type:'button','data-print-inspect-connections':true,className:buttonClass,onClick:function(){
                    if(reopenedPackage)editReopenedBlocks({kind:'connections'});else returnToGeometryWorld({kind:'connections'});
                  }},'Inspect connections in Geometry World'),
              group === editGroup && editGroup !== connectionsGroup && typeof ctx.setStemLabTool === 'function' && (reopenedPackage ? editPackageBlocksButton() : h('button', { type: 'button', className: buttonClass, onClick: returnToGeometryWorld }, 'Revise selected blocks'))),
            group === repairGroup && format === 'STL' && fileBytes && meshRepairPanel());
        }));
      }

      function preflightPanel() {
        var findings=report && report.issues || [],counts={ERROR:0,WARNING:0,INFO:0};
        findings.forEach(function(item){counts[item.severity==='ERROR'?'ERROR':item.severity==='WARNING'?'WARNING':'INFO']++;});
        var findingCodes=findings.map(function(item){return item.code;}),hasSizeFinding=findingCodes.indexOf('BED_FIT')!==-1;
        var hasGeometryFinding=findingCodes.some(function(code){return ['NO_GEOMETRY','TOO_MANY_TRIANGLES','FILE_TOO_LARGE','OPEN_EDGES','NON_MANIFOLD_EDGES','MULTIPLE_SHELLS','DEGENERATE_TRIANGLES','INCONSISTENT_WINDING','INWARD_WINDING_ADVISORY','ASSEMBLY_NOT_UNIONED'].indexOf(code)!==-1;});
        return h('div', { className: 'grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]' },
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-profile-title' },
            h('h2', { id: 'print-profile-title', className: 'text-base font-black text-white' }, 'School printer profile'),
            h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Use the receiving printer’s actual build area. These values are not machine settings.'),
            h('form',{className:'mt-3 space-y-2',noValidate:true,onSubmit:commitProfileDraft,'aria-label':__alloT('stem.printlab.printerProfileSettings', 'Printer profile settings'),'data-print-profile-editor':true},
              PRINTER_FIELDS.map(function(field){var key=field[0],id='print-lab-profile-'+key;return h('label',{key:key,htmlFor:id,className:'block text-[0.6875rem] font-bold text-slate-200'},h('span',{className:'mb-1 block'},field[1]),h('input',{id:id,ref:function(node){profileInputRefs.current[key]=node;},type:'number',inputMode:'decimal',min:field[2],max:field[3],step:'any',value:profileDraft[key],'aria-invalid':profileInvalid.indexOf(key)!==-1?'true':undefined,'aria-describedby':'print-lab-profile-help'+(profileError?' print-lab-profile-error':''),onChange:function(event){setProfileField(key,event.target.value);},className:'min-h-[44px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-sm text-white'}));}),
              h('p',{id:'print-lab-profile-help',className:'text-xs leading-5 text-slate-200'},profileHasDraft?'Profile edit not applied. Size checks still use '+profile.bedWidthMm+' × '+profile.bedDepthMm+' × '+profile.bedHeightMm+' mm.':'Applied build area: '+profile.bedWidthMm+' × '+profile.bedDepthMm+' × '+profile.bedHeightMm+' mm. Width × depth × height.'),
              h('div',{className:'flex flex-wrap gap-2'},h('button',{type:'submit',className:'min-h-[44px] rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white'},'Apply printer profile'),
                profileHasDraft && h('button',{type:'button',onClick:function(){setProfileDraft(printerProfileDraft(profile));setProfileError('');setProfileInvalid([]);focusProfileDraft('bedWidthMm');},className:'min-h-[44px] rounded-lg border border-slate-500 px-4 text-sm font-bold text-white'},'Discard profile edit')),
              profileError && h('p',{id:'print-lab-profile-error',role:'alert',className:'rounded-lg border border-rose-500 bg-rose-950 p-3 text-sm leading-5 text-rose-100'},profileError)),
            h('p', { className: 'mt-2 text-[0.625rem] leading-5 text-slate-300' }, 'Planning clearance is a conservative advisory buffer removed from both sides of each profile dimension. Adjust it for clips, purge lines, and local procedures; it is not a machine setting.'),
            geometryPhysicalSize && geometryPrinterFit && h('div', {
              className: 'mt-3 rounded-xl border p-3 ' + (geometryClearanceFit ? 'border-emerald-700 bg-emerald-950/30 text-emerald-100' : 'border-amber-600 bg-amber-950/30 text-amber-100'),
              role: 'region',
              'aria-live': 'polite',
              'aria-label': __alloT('stem.printlab.a11y_geometry_world_printer_fit_in_preflight', 'Geometry World printer fit in Preflight'),
              'data-geometry-preflight-fit': geometryClearanceFit ? 'true' : 'false'
            },
              h('strong', { className: 'block text-xs' }, geometryClearanceFit ? 'Geometry World scale fits this profile' : 'Geometry World scale needs attention'),
              h('p', { className: 'mt-1 text-[0.6875rem] leading-5' }, 'Model envelope: ' + geometryPhysicalSize.label + '. Printer profile: ' + geometryPrinterFit.profileLabel + '.'),
              h('p', { className: 'mt-1 text-[0.625rem] leading-5 opacity-90' }, geometryClearanceFit
                ? 'Includes the preferred ' + geometryPlanningClearanceMm + ' mm planning clearance. Apply profile changes to update this check; slicer and staff review remain required.'
                : geometryScaleRecommendation && geometryScaleRecommendation.canFit
                  ? 'Suggested scale: ' + geometryScaleRecommendation.recommendedUnitMm + ' mm per block, producing approximately ' + geometryScaleRecommendation.recommendedPhysicalSize.label + '. This assumes the current orientation.'
                  : 'Revise the model or choose a different printer profile before running preflight.'),
              geometryOrientationAdvice && h('div', {
                className: 'mt-2 rounded-lg border border-violet-500/70 bg-violet-950/35 p-2 text-violet-100',
                role: 'note',
                'data-geometry-preflight-orientation': geometryOrientationAdvice.currentScaleFitsRotated ? 'preserve-scale' : 'improve-scale'
              },
                h('strong', { className: 'block text-[0.6875rem]' }, 'Orientation option'),
                h('p', { className: 'mt-1 text-[0.625rem] leading-5' }, geometryOrientationAdvice.currentScaleFitsRotated
                  ? 'A 90-degree turn in the school slicer may preserve the current ' + geometryOrientationAdvice.suggestedUnitMm + ' mm per block scale; its rotated envelope would be ' + geometryOrientationAdvice.rotatedPhysicalSize.label + '.'
                  : 'A 90-degree turn in the school slicer may permit up to ' + geometryOrientationAdvice.rotatedMaximumUnitMm + ' mm per block instead of ' + geometryOrientationAdvice.currentMaximumUnitMm + ' mm per block; at that scale its rotated envelope would be ' + geometryOrientationAdvice.rotatedPhysicalSize.label + '.'),
                h('p', { className: 'mt-1 text-[0.625rem] leading-5 text-violet-200' }, sourceContext && sourceContext.sourceTool === 'geometryWorld' ? 'Print Lab has not rotated the STL. Preview the turn and apply it to recheck the print copy.' : 'Print Lab has not rotated the STL. Make the turn in the receiving slicer, then review bed placement and supports.')
              ),
              !geometryClearanceFit && geometryScaleRecommendation && geometryScaleRecommendation.canFit && h('button', {
                type: 'button',
                onClick: function () { applyUnitScale(geometryScaleRecommendation.recommendedUnitMm, 'Applied the Geometry World safe-fit scale of ' + geometryScaleRecommendation.recommendedUnitMm + ' millimeters per block. Run advisory preflight when ready.'); },
                'aria-label': __alloAriaFill(__alloT('stem.printlab.a11y_apply_suggested_geometry_world_scale_of_millimeters_per_block', 'Apply suggested Geometry World scale of {recommendedUnitMm} millimeters per block'), { recommendedUnitMm: geometryScaleRecommendation.recommendedUnitMm }),
                className: 'mt-2 min-h-[42px] w-full rounded-lg bg-cyan-700 px-3 text-xs font-black text-white hover:bg-cyan-700'
              }, 'Apply ' + geometryScaleRecommendation.recommendedUnitMm + ' mm / block')
            ),
            printOrientationControls(),
            h('button', { type: 'button', disabled: !runtimeReady || (format === 'RECIPE' ? !recipe : !fileBytes), onClick:function(){runPreflight(true);}, className: 'mt-3 min-h-[44px] w-full rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50' }, 'Run advisory preflight'),
            !showRevisionFindings && meshRepairPanel()
          ),
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'preflight-report-title' },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('h2', { id: 'preflight-report-title', 'data-print-report-heading':true, tabIndex:-1,'aria-describedby':report?'print-lab-report-summary':undefined,className: 'text-base font-black text-white focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-amber-200' }, 'Preflight report'),
              report && h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (report.status === 'FAIL' ? 'bg-rose-800 text-white' : report.status === 'WARN' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-700 text-white') }, report.status)
            ),
            !report && h('p', { className: 'mt-3 rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-300' }, 'Run preflight after choosing the model and physical scale.'),
            report && h('p',{id:'print-lab-report-summary',className:'mt-3 rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm leading-6 text-white'},counts.ERROR+' blocking item'+(counts.ERROR===1?'':'s')+' · '+counts.WARNING+' review warning'+(counts.WARNING===1?'':'s')+(counts.INFO?' · '+counts.INFO+' information note'+(counts.INFO===1?'':'s'):'')),
            showRevisionFindings && report && revisionFindings(findings),
            revisionSummary(),
            !(showRevisionFindings && findings.some(findingCanUseBlockEditor) && typeof ctx.setStemLabTool === 'function') && editPackageBlocksButton(),
            report && !showRevisionFindings && (hasSizeFinding || hasGeometryFinding && sourceContext && sourceContext.sourceTool==='geometryWorld') && h('div',{className:'mt-3 flex flex-wrap gap-2','data-print-finding-actions':true},
              hasSizeFinding && geometryOrientationAdvice && !turnActive && sourceContext && sourceContext.sourceTool === 'geometryWorld' && h('button', { type: 'button', onClick: function () { if (previewPrintTurn() && turnButtonRef.current) turnButtonRef.current.focus(); }, className: 'min-h-[44px] rounded-lg border border-violet-400 px-4 text-sm font-bold text-violet-100' }, 'Review 90° turn'),
              hasSizeFinding && h('button',{type:'button',onClick:function(){if(!guardPrintDrafts())return;chooseTab('Design');focusUnitDraft();},className:'min-h-[44px] rounded-lg border border-cyan-400 px-4 text-sm font-bold text-cyan-100'},'Adjust physical size'),
              hasGeometryFinding && sourceContext && sourceContext.sourceTool==='geometryWorld' && h('button',{type:'button',onClick:returnToGeometryWorld,className:'min-h-[44px] rounded-lg border border-cyan-400 px-4 text-sm font-bold text-cyan-100'},'Revise selected blocks')),
            report && h('div', { className: 'mt-3 space-y-3' },
              h('dl', { className: 'grid gap-2 sm:grid-cols-2 xl:grid-cols-4' },
                [['Width', report.dimensionsMm && report.dimensionsMm.width, 'mm'], ['Depth', report.dimensionsMm && report.dimensionsMm.depth, 'mm'], ['Height', report.dimensionsMm && report.dimensionsMm.height, 'mm'], ['Triangles', report.triangleCount, '']].map(function (row) { return h('div', { key: row[0], className: 'rounded-xl bg-slate-950 p-3' }, h('dt', { className: 'text-[0.625rem] font-black uppercase tracking-wide text-slate-300' }, row[0]), h('dd', { className: 'mt-1 text-lg font-black text-white' }, row[1] == null ? '—' : row[1] + (row[2] ? ' ' + row[2] : ''))); })
              ),
              !showRevisionFindings && h('ul', { className: 'space-y-2', 'aria-label': __alloT('stem.printlab.a11y_preflight_findings', 'Preflight findings') }, (report.issues || []).map(function (item, index) { return h('li', { key: item.code + index, className: 'rounded-xl border p-3 text-xs leading-5 ' + (item.severity === 'ERROR' ? 'border-rose-700 bg-rose-950/30 text-rose-100' : 'border-amber-600 bg-amber-950/20 text-amber-100') }, h('strong', null, item.severity + ': '), item.message); })),
              !showRevisionFindings && !(report.issues || []).length && h('p', { className: 'rounded-xl border border-emerald-700 bg-emerald-950/30 p-3 text-xs text-emerald-100' }, 'No blocking condition was found by these limited checks.')
            ),
            h('div', { className: 'mt-4 rounded-xl border border-cyan-800 bg-cyan-950/30 p-3 text-xs leading-5 text-cyan-100' },
              h('strong', null, 'Advisory, not certification. '),
              'Print Lab does not prove wall thickness, self-intersection repair, support success, material suitability, or machine safety. A trained staff member must inspect the sliced result before accepting a request.'
            ),
            report && revisedPrint && report.status !== 'FAIL' && h('div', {'data-print-revision-next':true,className:'mt-4 rounded-xl border border-cyan-700 p-3'},
              h('h3',{className:'text-base font-bold text-white'},'Ready to prepare revised files'),
              h('p',{className:'mt-1 text-sm leading-6 text-slate-200'},'Selected filament: '+chosenMaterial.name+'. The files will be labeled version '+versionNumber+'. '+(report.status === 'WARN' ? 'Check the reported warnings in the sliced layers before printing.' : 'Review the sliced layers before printing.')),
              h('button',{type:'button',onClick:function(){
                if (!guardPrintDrafts()) return;
                focusRevisedDownload.current = true;
                chooseTab('Submit');
              },className:'mt-3 min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-sm font-black text-white'},'Prepare revised files'),
              h('button',{type:'button',onClick:function(){chooseTab('Materials');},className:'mt-2 min-h-[44px] w-full rounded-xl border border-slate-500 px-4 text-sm font-bold text-white'},'Review filament')),
            report && !revisedPrint && !(showRevisionFindings && report.status === 'FAIL') && h('div', { className: 'mt-4 rounded-xl border border-slate-600 p-3', 'data-print-next-step':'preflight' },
              h('p', { className:'text-sm leading-6 text-slate-200' }, report.status === 'FAIL' ? 'Resolve the blocking findings before preparing print files. You can return to the model and its physical size.' : 'Next, choose the physical filament available for your printer. Keep the findings above in mind when reviewing the sliced model.'),
              h('button', { type:'button', onClick:function(){chooseTab(report.status === 'FAIL' ? 'Design' : 'Materials');}, className:'mt-3 min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-sm font-black text-white' }, report.status === 'FAIL' ? 'Review model & scale' : 'Continue to Materials')
            )
          )
        );
      }

      function strengthAndWastePanel() {
        var comparison = compareSlicerPlans(slicerComparison);
        function input(label, key) {
          return field(label, slicerComparison[key] || '', function (value) {
            setSlicerComparison(function (previous) { var next = Object.assign({}, previous); next[key] = value; return next; });
          }, { type: 'number', min: 0.01, max: 1000000, step: 0.01 });
        }
        function result(label, values, unit) {
          if (!values) return h('p', null, label + ': enter both positive values to compare.');
          return h('p', null, label + ': ' + Math.abs(values.saved) + ' ' + unit + (values.saved > 0 ? ' less' : values.saved < 0 ? ' more' : ' change') + ' (' + Math.abs(values.percent) + '%).');
        }
        return h('section', { className: 'rounded-2xl border border-cyan-700 bg-slate-900 p-4', 'aria-labelledby': 'strength-waste-title' },
          h('h2', { id: 'strength-waste-title', className: 'text-lg font-black text-white' }, 'Strength and material savings'),
          h('p', { className: 'mt-2 text-sm leading-6 text-slate-200' }, 'Choose the intended use first: display piece, handled classroom object, or part carrying a load. A closed mesh is not proof of strength. Print Lab does not calculate load capacity or certify structural integrity.'),
          h('div', { className: 'mt-3 grid gap-3 md:grid-cols-2' }, [
            ['Walls and joints', 'Inspect thin features, connections, and top/bottom thickness in the slicer. Compare wall/perimeter counts before assuming that more infill makes a part stronger.'],
            ['Layer direction', 'Review how the part will be loaded relative to its printed layers. Consider orientation, broad contact surfaces, and thicker joints; test the actual printed design for its intended use.'],
            ['Reduce avoidable waste', 'Try an orientation with fewer supports, simplify overhangs, or print a small prototype. Keep needed walls and joints. Include supports, brim, and purge material when comparing slicer totals.'],
            ['Size tradeoff', 'At 80% of each original dimension, geometric volume is 51.2% of the original. Filament savings will differ because walls and supports do not necessarily scale the same way. Smaller joints and holes may stop working.']
          ].map(function (row) { return h('article', { key: row[0], className: 'rounded-xl bg-slate-950 p-3' }, h('h3', { className: 'text-sm font-bold text-cyan-200' }, row[0]), h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, row[1])); })),
          h('h3', { className: 'mt-5 text-base font-bold text-white' }, 'Compare two slicer runs'),
          h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'Change one setting at a time and enter both slicer results, including supports and purge. These scratch comparisons stay in this open session and do not change your model, reviewed evidence, points, or job ticket.'),
          h('div', { className: 'mt-3 grid gap-3 sm:grid-cols-2' }, input('Baseline filament (g)', 'baselineGrams'), input('Candidate filament (g)', 'candidateGrams'), input('Baseline print time (min)', 'baselineMinutes'), input('Candidate print time (min)', 'candidateMinutes')),
          h('div', { role: 'status', className: 'mt-3 rounded-xl bg-cyan-950 p-3 text-sm font-bold text-cyan-100' }, result('Filament', comparison.mass, 'g'), result('Print time', comparison.time, 'min')),
          h('button', { type: 'button', onClick: function () { setSlicerComparison({}); }, className: 'mt-3 min-h-[42px] rounded-lg border border-slate-500 px-3 text-xs text-white' }, 'Clear comparison'),
          h('p', { className: 'mt-3 text-xs leading-5 text-amber-100' }, 'For a functional or load-bearing part, have a qualified reviewer define the load, environment, material, and acceptance test. Select a candidate only after checking fit and performance, then import its final slicer evidence in Submit.'),
          h('p', { className: 'mt-2 flex flex-wrap gap-3 text-xs' }, h('a', { href: 'https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135', target: '_blank', rel: 'noopener noreferrer', className: 'text-cyan-200 underline' }, 'Modeling and orientation guidance'), h('a', { href: 'https://help.prusa3d.com/article/layers-and-perimeters_1748', target: '_blank', rel: 'noopener noreferrer', className: 'text-cyan-200 underline' }, 'Wall and perimeter guidance'))
        );
      }

      function materialsPanel() {
        return h('div', { className: 'space-y-4' },
          strengthAndWastePanel(),
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'materials-science-title' },
            h('h2', { id: 'materials-science-title', className: 'text-lg font-black text-white' }, 'Materials are systems, not labels'),
            h('p', { className: 'mt-1 max-w-4xl text-sm leading-6 text-slate-300' }, 'Compare performance, print conditions, waste, expected lifetime, additives, and the disposal route that actually exists. Reducing size, avoiding failed prints, repairing designs, and reusing parts usually matter before changing a material name.'),
            h('div', { className: 'mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3' }, MATERIALS.map(function (item) { return h('button', { key: item.id, type: 'button', onClick: function () { if (item.id !== materialId) invalidateManufacturingEvidence({ clearReport: false, clearRepair: false }); setMaterialId(item.id); persist({ materialId: item.id }); }, 'aria-pressed': materialId === item.id ? 'true' : 'false', className: 'min-h-[150px] rounded-2xl border p-4 text-left ' + (materialId === item.id ? 'border-cyan-300 bg-cyan-950/50' : 'border-slate-700 bg-slate-950') }, h('span', { className: 'block text-base font-black text-white' }, item.name), h('span', { className: 'mt-2 block text-xs leading-5 text-slate-200' }, item.summary), h('span', { className: 'mt-2 block text-[0.6875rem] leading-5 text-amber-100' }, item.lifecycle)); }))
          ),
          h('section', { className: 'grid gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 lg:grid-cols-[minmax(0,1fr)_320px]', 'aria-labelledby': 'material-estimate-title' },
            h('div', null,
              h('h2', { id: 'material-estimate-title', className: 'text-base font-black text-white' }, 'Advisory material estimate'),
              h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'This is a learning estimate from primitive volume, infill, density, and a support allowance. The receiving slicer determines the real toolpath, time, supports, and mass.'),
              h('div', { className: 'mt-3 grid gap-3 sm:grid-cols-2' },
                field('Infill (%)', infillPercent, function (value) { var next = clamp(value, 0, 100, 20); cancelOperation('handoff'); setInfillPercent(next); clearJobArtifacts(); persist({ infillPercent: next }); }, { type: 'number', min: 0, max: 100, step: 1 }),
                field('Support allowance (%)', supportPercent, function (value) { var next = clamp(value, 0, 200, 10); cancelOperation('handoff'); setSupportPercent(next); clearJobArtifacts(); persist({ supportPercent: next }); }, { type: 'number', min: 0, max: 200, step: 1 })
              )
            ),
            h('div', { className: 'rounded-xl bg-slate-950 p-4' },
              h('p', { className: 'text-[0.625rem] font-black uppercase tracking-wide text-slate-300' }, chosenMaterial.name + ' estimate'),
              h('p', { className: 'mt-2 text-3xl font-black text-white' }, materialEstimate ? materialEstimate.estimatedGrams + ' g' : 'Slicer needed'),
              h('p', { className: 'mt-2 text-[0.6875rem] leading-5 text-slate-300' }, materialEstimate ? 'Rough scenario estimate, not an upper bound on filament use. It assumes a fixed 22% shell fraction; actual walls, supports, overlaps, and purge waste can change the result in either direction.' : 'Imported mesh reports in this pilot do not estimate solid volume reliably enough to quote material.'),
              h('p', { className: 'mt-3 text-[0.6875rem] leading-5 text-amber-100' }, 'Follow the printer manufacturer, filament manufacturer, school ventilation/enclosure, supervision, burn, moving-parts, and post-processing procedures. This tool does not replace them.')
            )
          ),
          h('section', { className:'rounded-2xl border border-cyan-700 bg-slate-900 p-4', 'aria-label':__alloT('stem.printlab.nextPrintStep', 'Next print step'), 'data-print-next-step':'materials' },
            h('p', { className:'text-sm leading-6 text-slate-200' }, 'Selected filament: ' + chosenMaterial.name + '. ' + (!report || report.status === 'FAIL' ? 'Check the model and resolve blocking findings before preparing print files.' : 'Continue to prepare your STL and review package. This does not start a printer.')),
            h('button', { type:'button', onClick:function(){chooseTab(!report || report.status === 'FAIL' ? 'Preflight' : 'Submit');}, className:'mt-3 min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-sm font-black text-white' }, !report || report.status === 'FAIL' ? 'Return to Preflight' : 'Continue to Submit')
          )
        );
      }

      function submitPanel() {
        var downloadBusy = !!(downloadFeedback && downloadFeedback.status === 'busy');
        var needsPreflight = !report || report.status === 'FAIL';
        return h('div', { className: 'space-y-4' },
          h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]' },
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'submission-details-title' },
            h('h2', { id: 'submission-details-title', className: 'text-lg font-black text-white' }, 'Prepare a staff-review handoff'),
            h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'Describe the object, not the student. Do not enter a full name, email, student ID, or other personal information. The package is not a purchase and does not deduct points.'),
            h('div', { className: 'mt-3 space-y-3' },
              field('Model title', title, function (value) { cancelMetadataDownloads(); setTitle(value); persist({ title: safeText(value, 100) }); }, { id: 'print-lab-model-title', ref: titleInputRef }),
              h('label', { className: 'block text-[0.6875rem] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'What is it for?'), h('textarea', { value: description, maxLength: 500, rows: 3, onChange: function (event) { cancelMetadataDownloads(); setDescription(event.target.value); persist({ description: safeText(event.target.value, 500) }); }, className: 'w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white' })),
              h('label', { className: 'block text-[0.6875rem] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Design note for the reviewer'), h('textarea', { value: studentNote, maxLength: 300, rows: 3, onChange: function (event) { cancelMetadataDownloads(); setStudentNote(event.target.value); persist({ studentNote: safeText(event.target.value, 300) }); }, className: 'w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white' })),
              h('label', { className: 'block text-[0.6875rem] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'AI participation'), h('select', { value: aiUse, onChange: function (event) { cancelMetadataDownloads(); setAiDisclosureError(''); setAiUse(event.target.value); persist({ aiUse: event.target.value }); }, className: 'min-h-[44px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-white' }, h('option', { value: 'NONE' }, 'No AI assistance'), h('option', { value: 'ASSISTED' }, 'AI assisted part of the design'), h('option', { value: 'MOSTLY_AI' }, 'AI created most of the starting geometry'))),
              aiUse !== 'NONE' && h('label', { className: 'block text-[0.6875rem] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Explain the AI contribution'), h('textarea', { id: 'print-lab-ai-disclosure', ref: aiDisclosureInputRef, value: aiDisclosure, maxLength: 300, rows: 2, 'aria-required': 'true', 'aria-invalid': aiDisclosureError ? 'true' : undefined, 'aria-describedby': aiDisclosureError ? 'print-lab-ai-disclosure-error' : undefined, onChange: function (event) { cancelMetadataDownloads(); setAiDisclosureError(''); setAiDisclosure(event.target.value); persist({ aiDisclosure: safeText(event.target.value, 300) }); }, className: 'w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white' })),
              aiDisclosureError && h('p', { id: 'print-lab-ai-disclosure-error', role: 'alert', className: 'rounded-xl border border-rose-500 bg-rose-950 p-3 text-sm leading-6 text-rose-100' }, aiDisclosureError)
            )

          ),
          h('aside', { className: 'space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'handoff-summary-title' },
            h('h2', { id: 'handoff-summary-title', className: 'text-base font-black text-white' }, 'Handoff summary'),
            revisionSummary(),
            needsPreflight && h('div', { id: 'print-lab-download-prerequisite', className: 'rounded-xl border border-amber-500 bg-amber-950/30 p-3 text-sm text-amber-100' },
              h('p', null, report ? 'Resolve the blocking preflight findings before downloading print files.' : 'Run preflight to check this model and its physical size before downloading print files.'),
              h('button', { type: 'button', onClick: function () { chooseTab('Preflight'); }, className: 'mt-2 min-h-[44px] rounded-lg border border-amber-400 px-3 font-bold text-white' }, 'Return to Preflight')),
            !title.trim() && h('div', { id: 'print-lab-title-prerequisite', className: 'rounded-xl border border-slate-500 p-3 text-sm text-slate-200' },
              h('p', null, 'Add a model title to include in the review handoff.'),
              h('button', { type: 'button', onClick: function () { if (titleInputRef.current) titleInputRef.current.focus(); }, className: 'mt-2 min-h-[44px] rounded-lg border border-cyan-400 px-3 font-bold text-cyan-100' }, 'Add model title')),
            h('dl', { className: 'space-y-2 text-xs' },
              [['Format', format], ['Preflight', report ? report.status : 'Not run'], ['Scale', unitMm + ' mm per unit'], ['Material study', chosenMaterial.name], ['Review JSON embeds model', 'No'], ['School Rewards asset', rewardsAssetCompatibility.compatible ? (rewardsAssetCompatibility.needsAsset ? rewardsAssetSizeLabel + ' ready' : 'Recipe included') : rewardsAssetSizeLabel + ' too large']].map(function (row) { return h('div', { key: row[0], className: 'flex justify-between gap-3 border-b border-slate-800 pb-2' }, h('dt', { className: 'text-slate-300' }, row[0]), h('dd', { className: 'text-right font-bold text-white' }, row[1])); })
            ),
            h('p', { className: 'rounded-xl border border-cyan-800 bg-cyan-950/30 p-3 text-[0.6875rem] leading-5 text-cyan-100' }, 'The .alloflow-print.json file contains the design recipe when applicable, a generic source-file label, a content hash, scale declaration, AI disclosure, and the advisory report. It contains no account identifier and performs no network submission.'),
            !rewardsAssetCompatibility.compatible && h('div', { className: 'rounded-xl border border-amber-500 bg-amber-950/35 p-3 text-[0.6875rem] leading-5 text-amber-100', role: 'alert', 'data-school-rewards-asset-ready': 'false' },
              h('strong', { className: 'block text-xs text-white' }, 'Reduce the model before opening School Rewards'),
              h('p', { className: 'mt-1' }, rewardsAssetCompatibility.reason + ' Current local file: ' + rewardsAssetSizeLabel + '; portal maximum: 4 MiB. The 5 MiB local inspection allowance is intentionally larger so staff can inspect and simplify a borderline file without uploading it.')
            ),
            sourceContext && sourceContext.sourceTool==='geometryWorld' && h('button',{type:'button',disabled:needsPreflight,'aria-disabled':downloadBusy?'true':undefined,'aria-describedby':needsPreflight?'print-lab-download-prerequisite':undefined,'data-print-download':'package',onClick:downloadPrintPackage,className:'min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50'+(downloadBusy?' opacity-60':'')},downloadBusy && downloadFeedback.kind==='package'?'Preparing print package…':revisedPrint?'Download revised print package':'Download print package'),
            sourceContext && sourceContext.sourceTool==='geometryWorld' && h('p',{className:'text-xs leading-5 text-slate-200'},'Unzip the package and open model.stl in your slicer. For staff review, share model.stl and review.alloflow-print.json from that same folder. The ZIP also includes the block source.'),
            h('button', { type: 'button', disabled: !title.trim() || needsPreflight, 'aria-disabled':downloadBusy?'true':undefined, 'aria-describedby':needsPreflight?'print-lab-download-prerequisite':!title.trim()?'print-lab-title-prerequisite':undefined,'data-print-download':'handoff', onClick: downloadHandoff, className: 'min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-sm font-black text-white disabled:opacity-50'+(downloadBusy?' opacity-60':'') }, downloadBusy && downloadFeedback.kind==='handoff'?'Preparing review handoff…':'Download review handoff'),
            h('button', { type: 'button', disabled: needsPreflight, 'aria-disabled':downloadBusy?'true':undefined,'aria-describedby':needsPreflight?'print-lab-download-prerequisite':undefined,'data-print-download':'stl', onClick: exportStl, className: 'min-h-[44px] w-full rounded-xl border border-cyan-400 px-4 text-sm font-black text-cyan-100 disabled:opacity-50'+(downloadBusy?' opacity-60':'') }, downloadBusy && downloadFeedback.kind==='stl'?'Preparing STL…':'Optional STL export'),
            h('div', { 'data-print-download-feedback': true, 'data-print-download-state': downloadFeedback ? downloadFeedback.status : 'idle', className: downloadFeedback ? 'rounded-xl border border-slate-500 bg-slate-950 p-3' : undefined },
              h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'text-sm leading-6 text-white' }, downloadFeedback ? downloadFeedback.message : ''),
              downloadBusy && h('button', { type: 'button', onClick: cancelDownload, className: 'mt-2 min-h-[44px] rounded-lg border border-slate-400 px-3 text-sm font-bold text-white' }, 'Cancel preparation')),
            rewardsPortalUrl && h('button', { type: 'button', disabled: !rewardsAssetCompatibility.compatible, 'data-school-rewards-asset-ready': rewardsAssetCompatibility.compatible ? 'true' : 'false', onClick: function () { try { var popup = window.open(rewardsPortalUrl, '_blank', 'noopener,noreferrer'); if (popup) popup.opener = null; } catch (_) { announce(__alloT('stem.printlab.sr_the_school_rewards_portal_could_not_open', 'The School Rewards portal could not open.')); } }, className: 'min-h-[44px] w-full rounded-xl border border-emerald-400 bg-emerald-950/30 px-4 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-400' }, 'Open School Rewards portal'),
            !rewardsPortalUrl && h('p', { className: 'text-[0.6875rem] leading-5 text-slate-300' }, 'Connect the Google Education School Rewards portal in AlloFlow Project Settings to open it directly from this step.'),
            h('p', { className: 'text-[0.6875rem] leading-5 text-amber-100' }, sourceContext && (sourceContext.sourceTool === 'geometryWorld' || reopenedPackage) ? 'The separate review handoff matches the STL from Optional STL export. Both use the final millimeter size.' : 'The receiving school workflow must pair the handoff with the original GLB/STL when needed, verify the content hash, inspect the slicer preview, approve a point quote, and only then create a store request.')

          )),
            h('details', { className: 'rounded-2xl border border-violet-700 bg-slate-950 p-4', 'data-print-staff-details': true },
              h('summary', { className: 'min-h-[44px] cursor-pointer py-2 text-base font-bold text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200' }, 'Staff review: slicer evidence and Job Ticket'),
              h('h3', { id: 'job-ticket-title', className: 'text-base font-black text-white' }, 'Job Ticket'),
              h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'First slice in the approved school slicer, then import its comments. Print Lab reads metadata comments only: it never interprets or executes G-code commands.'),
              h('label', { className: 'mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-violet-500 px-4 text-xs font-black text-violet-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-200' }, 'Import local G-code comment metadata', h('input', { type: 'file', accept: '.gcode,.gco,.gc,text/x-gcode', className: 'sr-only', onChange: importGcodeMetadata })),
              gcodeMetadata && h('dl', { className: 'mt-3 grid gap-2 text-xs sm:grid-cols-2' }, [['Slicer', gcodeMetadata.slicer || 'Not named'], ['Time', Math.round(gcodeMetadata.estimatedTimeSeconds / 60) + ' min'], ['Filament', gcodeMetadata.filamentGrams ? gcodeMetadata.filamentGrams + ' g' : gcodeMetadata.filamentLengthMm ? gcodeMetadata.filamentLengthMm + ' mm' : 'Mass not reported'], ['Layers', gcodeMetadata.layerCount || 'Not reported']].map(function (row) { return h('div', { key: row[0], className: 'rounded-lg bg-slate-900 p-2' }, h('dt', { className: 'text-slate-300' }, row[0]), h('dd', { className: 'font-bold text-white' }, row[1])); })),
              gcodeMetadata && !gcodeMetadata.filamentGrams && h('p', { className: 'mt-2 rounded-lg border border-amber-600 bg-amber-950/30 p-2 text-[0.6875rem] leading-5 text-amber-100' }, gcodeMetadata.filamentLengthMm ? 'This metadata reports filament length but not mass. Re-export from the approved slicer with filament grams enabled before creating a ticket.' : 'This metadata does not report filament mass. Re-export from the approved slicer with filament grams enabled before creating a ticket.'),
              h('fieldset', { className: 'mt-4 rounded-xl border border-slate-700 p-3' }, h('legend', { className: 'px-1 text-xs font-black text-white' }, 'Configurable point estimate'),
                h('div', { className: 'grid gap-2 sm:grid-cols-3' },
                  field('Base points', quoteConfig.basePoints, function (v) { setQuoteConfigField('basePoints', v); }, { type: 'number', min: 0, max: 100000, step: 1 }),
                  field('Setup points', quoteConfig.setupPoints, function (v) { setQuoteConfigField('setupPoints', v); }, { type: 'number', min: 0, max: 100000, step: 1 }),
                  field('Points / gram', quoteConfig.pointsPerGram, function (v) { setQuoteConfigField('pointsPerGram', v); }, { type: 'number', min: 0, max: 1000, step: 0.1 }),
                  field('Points / hour', quoteConfig.pointsPerHour, function (v) { setQuoteConfigField('pointsPerHour', v); }, { type: 'number', min: 0, max: 100000, step: 0.1 }),
                  field('Complexity multiplier', quoteConfig.complexityMultiplier, function (v) { setQuoteConfigField('complexityMultiplier', v); }, { type: 'number', min: 0.25, max: 10, step: 0.05 }),
                  field('Round to points', quoteConfig.roundingIncrement, function (v) { setQuoteConfigField('roundingIncrement', v); }, { type: 'number', min: 1, max: 10000, step: 1 })
                ),
                h('p', { className: 'mt-2 text-sm font-black text-cyan-200' }, pointQuote ? pointQuote.totalPoints + ' point advisory estimate' : 'Awaiting estimate'),
                h('p', { className: 'text-[0.6875rem] text-slate-300' }, 'Includes base, setup, material, time, complexity, minimum, and rounding rules. It is not a charge until staff approves it.')
              ),
              h('label', { className: 'mt-3 flex min-h-[44px] items-center gap-2 text-xs text-slate-200' }, h('input', { type: 'checkbox', checked: materialReviewed, onChange: function (event) { setMaterialReviewed(event.target.checked); clearJobArtifacts(); } }), 'Reviewer confirmed the exact material selection'),
              h('label', { className: 'flex min-h-[44px] items-center gap-2 text-xs text-slate-200' }, h('input', { type: 'checkbox', checked: profileReviewed, onChange: function (event) { setProfileReviewed(event.target.checked); clearJobArtifacts(); } }), 'Reviewer confirmed the receiving printer profile'),
              h('button', { type: 'button', disabled: !gcodeEvidenceCurrent || !quoteMaterial || !materialReviewed || !profileReviewed || !report || report.status === 'FAIL', onClick: createJobTicket, className: 'mt-2 min-h-[44px] w-full rounded-xl bg-violet-700 px-4 text-sm font-black text-white disabled:opacity-50' }, 'Create alloflow-print-job/1 ticket'),
              jobTicket && h('button', { type: 'button', onClick: downloadJobTicket, className: 'mt-2 min-h-[44px] w-full rounded-xl border border-violet-400 px-4 text-sm font-black text-violet-100' }, 'Download Job Ticket'),
              h('p', { className: 'mt-2 text-[0.6875rem] leading-5 text-amber-100' }, 'The ticket includes a deterministic SHA-256 digest of its normalized payload, excluding the integrity field. It can reveal later edits, but it is not a signature, authenticity proof, staff authorization, or server approval. It contains no commands, credentials, account identifier, or student identifier and does not authorize a physical print.')
            ),
            h('details', { className: 'rounded-2xl border border-emerald-700 bg-slate-950 p-4', 'data-print-simulator-details': true },
              h('summary', { className: 'min-h-[44px] cursor-pointer py-2 text-base font-bold text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200' }, 'Optional: practice with the simulator'),
              h('h3', { id: 'simulator-title', className: 'text-sm font-black text-white' }, 'Simulator'),
              h('p', { className: 'mt-1 text-[0.6875rem] leading-5 text-slate-300' }, 'Practice queue, telemetry, and two-printer capacity planning locally. OctoPrint, Moonraker, PrusaLink, Bambu, CuraEngine, PrusaSlicer, OrcaSlicer, boolean/remesh, wall-thickness, and text-to-mesh adapters remain disabled.'),
              h('button', { type: 'button', disabled: !jobTicket, onClick: queueSimulation, className: 'mt-2 min-h-[44px] w-full rounded-lg bg-emerald-700 px-3 text-xs font-black text-white disabled:opacity-50' }, 'Queue in simulator'),
              h('button', { type: 'button', disabled: !simulatorJobKey, onClick: advanceSimulation, className: 'mt-2 min-h-[44px] w-full rounded-lg border border-emerald-500 px-3 text-xs font-black text-emerald-100 disabled:opacity-50' }, 'Advance simulated telemetry'),
              h('button', { type: 'button', disabled: !jobTicket, onClick: planCapacity, className: 'mt-2 min-h-[44px] w-full rounded-lg border border-cyan-500 px-3 text-xs font-black text-cyan-100 disabled:opacity-50' }, 'Plan 3-copy / 2-printer example'),
              simulatorSnapshot && simulatorJobKey && h('p', { className: 'mt-2 text-xs font-bold text-white' }, 'Simulated state: ', simulatorSnapshot.jobs[simulatorJobKey] && simulatorSnapshot.jobs[simulatorJobKey].state),
              simulatedSchedule && h('p', { className: 'mt-2 text-[0.6875rem] text-slate-300' }, simulatedSchedule.assignments.length + ' simulated assignment(s); ' + simulatedSchedule.unscheduled.length + ' unscheduled.')
            )
        );
      }

      var panel = activeTab === 'Design' ? designPanel() : activeTab === 'Preflight' ? preflightPanel() : activeTab === 'Materials' ? materialsPanel() : submitPanel();
      var preflightStatus = report ? report.status : 'PENDING';
      var preflightBadgeStyle = preflightStatus === 'PASS'
        ? { backgroundColor: isContrast ? '#000000' : 'rgba(6,78,59,0.72)', color: isContrast ? '#00ff00' : '#a7f3d0', border: isContrast ? '1px solid #00ff00' : '1px solid rgba(52,211,153,0.5)' }
        : preflightStatus === 'WARN'
          ? { backgroundColor: isContrast ? '#000000' : 'rgba(120,53,15,0.72)', color: isContrast ? '#ffff00' : '#fde68a', border: isContrast ? '1px solid #ffff00' : '1px solid rgba(251,191,36,0.5)' }
          : preflightStatus === 'FAIL'
            ? { backgroundColor: isContrast ? '#000000' : 'rgba(136,19,55,0.72)', color: isContrast ? '#ff6b6b' : '#fecdd3', border: isContrast ? '1px solid #ff6b6b' : '1px solid rgba(251,113,133,0.5)' }
            : { backgroundColor: isContrast ? '#000000' : 'rgba(15,23,42,0.72)', color: isContrast ? '#ffffff' : '#cbd5e1', border: isContrast ? '1px solid #ffff00' : '1px solid rgba(148,163,184,0.4)' };
      var activeStepIdx = Math.max(0, TABS.indexOf(activeTab));
      var partCount = recipe && Array.isArray(recipe.parts) ? recipe.parts.length : 0;
      var repDim = report && report.dimensionsMm;
      var dimW = geometryPhysicalSize && typeof geometryPhysicalSize.width === 'number' ? geometryPhysicalSize.width : (repDim && typeof repDim.width === 'number' ? repDim.width : (repDim && typeof repDim.x === 'number' ? repDim.x : null));
      var dimD = geometryPhysicalSize && typeof geometryPhysicalSize.depth === 'number' ? geometryPhysicalSize.depth : (repDim && typeof repDim.depth === 'number' ? repDim.depth : (repDim && typeof repDim.z === 'number' ? repDim.z : null));
      var dimH = geometryPhysicalSize && typeof geometryPhysicalSize.height === 'number' ? geometryPhysicalSize.height : (repDim && typeof repDim.height === 'number' ? repDim.height : (repDim && typeof repDim.y === 'number' ? repDim.y : null));
      var bedW = Math.max(50, profile.bedWidthMm || 220);
      var bedD = Math.max(50, profile.bedDepthMm || 220);
      var bedH = Math.max(50, profile.bedHeightMm || 250);
      var fitsBed = (dimW == null || dimW <= bedW) && (dimD == null || dimD <= bedD) && (dimH == null || dimH <= bedH);
      return h('div', { ref:workflowRootRef, className: 'mx-auto max-w-7xl space-y-4 rounded-3xl bg-slate-950 p-3 text-slate-100 sm:p-5', 'data-print-lab': 'true', style: isContrast ? { backgroundColor: '#000000', color: '#ffffff', border: '2px solid #ffff00' } : undefined },
        h('style',null,
          '.theme-contrast [data-print-lab],.theme-contrast [data-print-lab] :is(header,nav,section,aside,article,details,fieldset,form,dl){background:#000!important;background-image:none!important;color:#fff!important;border-color:#ff0!important;box-shadow:none!important}' +
          '.theme-contrast [data-print-lab] :is(h1,h2,h3,summary,legend,dt){color:#ff0!important}' +
          '.theme-contrast [data-print-lab] button,.theme-contrast [data-print-lab] input,.theme-contrast [data-print-lab] select,.theme-contrast [data-print-lab] textarea{background:#000!important;color:#ff0!important;border:1.5px solid #ff0!important}' +
          'html.theme-contrast [data-print-lab] button[role=tab][aria-selected=true],html.theme-contrast [data-print-lab] button[aria-pressed=true],.theme-contrast [data-print-lab] [role=tab][aria-selected=true],.theme-contrast [data-print-lab] button[aria-pressed=true]{background:#ff0!important;color:#000!important;border:2px solid #ff0!important}' +
          '[data-print-lab] :is(button,input,select,summary){touch-action:manipulation}' +
          '@media(forced-colors:active){[data-print-lab] button{border:1px solid ButtonText!important}[data-print-lab] button:disabled{border-color:GrayText!important;color:GrayText!important}[data-print-lab] [role=tab][aria-selected=true]{border:2px solid Highlight!important;text-decoration:underline;text-underline-offset:4px}[data-print-lab] :focus-visible{outline:3px solid Highlight!important;outline-offset:3px}}'),
        h('header', {
          className: 'rounded-2xl border border-cyan-800 p-4 sm:p-5',
          style: {
            backgroundColor: isContrast ? '#000000' : '#082f49',
            backgroundImage: isContrast ? 'none' : 'linear-gradient(135deg, #083344 0%, #0f172a 52%, #2e1065 100%)',
            border: isContrast ? '2px solid #ffff00' : '1px solid rgba(34,211,238,0.42)'
          }
        },
          h('div', { className: 'flex flex-wrap items-start justify-between gap-4' },
            h('div', { className: 'flex items-start gap-3.5', style: { flex: '1 1 300px', minWidth: 0 } },
              /* Bespoke 3D Extruder Nozzle & Build Plate Layer-Slice Emblem SVG */
              h('svg', {
                width: 50, height: 50, viewBox: '0 0 50 50',
                'aria-hidden': 'true',
                style: { flexShrink: 0, display: 'block', marginTop: 2 }
              },
                h('rect', {
                  x: 1, y: 1, width: 48, height: 48, rx: 13,
                  fill: isContrast ? '#000000' : 'rgba(15,23,42,0.68)',
                  stroke: isContrast ? '#ffff00' : 'rgba(34,211,238,0.55)',
                  strokeWidth: 1.5
                }),
                /* Hotend Extruder Nozzle */
                h('rect', { x: 20, y: 7, width: 10, height: 7, rx: 1.5, fill: isContrast ? '#ffff00' : '#f59e0b' }),
                h('polygon', { points: '21,14 29,14 25,21', fill: isContrast ? '#ffff00' : '#fbbf24' }),
                /* Deposited Layer Stack */
                h('rect', { x: 14, y: 23, width: 22, height: 4, rx: 1.5, fill: isContrast ? '#00ffff' : '#22d3ee' }),
                h('rect', { x: 12, y: 28.5, width: 26, height: 4, rx: 1.5, fill: isContrast ? '#00ffff' : '#38bdf8' }),
                h('rect', { x: 10, y: 34, width: 30, height: 4, rx: 1.5, fill: isContrast ? '#ffffff' : '#818cf8' }),
                /* Heated Build Plate */
                h('line', { x1: 7, y1: 41.5, x2: 43, y2: 41.5, stroke: isContrast ? '#ffff00' : '#94a3b8', strokeWidth: 2.5, strokeLinecap: 'round' })
              ),
              h('div', { style: { minWidth: 0 } },
                h('p', { className: 'text-[0.6875rem] font-black uppercase tracking-[.18em] text-cyan-300', style: isContrast ? { color: '#ffff00' } : undefined }, __alloT('stem.printlab.studio_eyebrow', 'Additive manufacturing studio')),
                h('h1', { className: 'mt-1 text-2xl font-black text-white', style: isContrast ? { color: '#ffff00' } : undefined }, 'Print Lab'),
                h('p', { className: 'mt-1.5 max-w-3xl text-sm leading-6 text-slate-200', style: isContrast ? { color: '#ffffff' } : undefined }, 'Shape a model, understand its physical scale and material tradeoffs, and prepare evidence for a staff-reviewed print request. Nothing here spends points or starts a printer.')
              )
            ),
            /* Live Fabrication Telemetry Pills */
            h('div', { className: 'flex flex-wrap items-center gap-2', 'aria-label': __alloT('stem.printlab.telemetry_aria', 'Active print workspace telemetry') },
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-[0.6875rem] font-bold font-mono',
                style: { backgroundColor: isContrast ? '#000000' : 'rgba(15,23,42,0.72)', color: isContrast ? '#ffff00' : '#67e8f9', border: isContrast ? '1px solid #ffff00' : '1px solid rgba(34,211,238,0.42)' }
              }, format + (partCount > 0 ? ' \u00B7 ' + partCount + (partCount === 1 ? ' part' : ' parts') : '')),
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-[0.6875rem] font-bold font-mono',
                style: { backgroundColor: isContrast ? '#000000' : 'rgba(15,23,42,0.72)', color: isContrast ? '#ffffff' : '#e2e8f0', border: isContrast ? '1px solid #ffff00' : '1px solid rgba(148,163,184,0.4)' }
              }, bedW + '\u00D7' + bedD + '\u00D7' + bedH + ' mm'),
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-[0.6875rem] font-bold',
                style: { backgroundColor: isContrast ? '#000000' : 'rgba(15,23,42,0.72)', color: isContrast ? '#00ffff' : '#ddd6fe', border: isContrast ? '1px solid #00ffff' : '1px solid rgba(167,139,250,0.45)' }
              }, chosenMaterial.name + ' \u00B7 ' + profile.nozzleMm + 'mm'),
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-[0.6875rem] font-black uppercase tracking-wider',
                style: preflightBadgeStyle
              }, 'Preflight: ' + preflightStatus)
            )
          )
        ),
        /* Live 4-Stage Fabrication Pipeline & Build-Bed Footprint Telemetry SVG */
        h('div', {
          className: 'rounded-2xl border border-slate-700 p-2.5',
          style: { backgroundColor: isContrast ? '#000000' : '#0f172a', borderColor: isContrast ? '#ffff00' : '#334155' }
        },
          h('svg', {
            viewBox: '0 0 640 94',
            role: 'img',
            'aria-label': __alloT('stem.printlab.pipeline_svg_aria', 'Print Lab workflow pipeline currently on step {step} of 4 ({tab}), printer bed {bed} millimeters, preflight status {status}.')
              .replace('{step}', String(activeStepIdx + 1)).replace('{tab}', activeTab).replace('{bed}', bedW + ' by ' + bedD + ' by ' + bedH).replace('{status}', preflightStatus),
            style: { width: '100%', height: 'auto', display: 'block' }
          },
            h('rect', { x: 0, y: 0, width: 640, height: 94, rx: 10, fill: isContrast ? '#000000' : '#020617', stroke: isContrast ? '#ffff00' : '#1e293b', strokeWidth: 1.2 }),
            /* Left: 4-Stage Workflow Pipeline */
            h('text', { x: 16, y: 20, fill: isContrast ? '#ffff00' : '#67e8f9', fontSize: 10.5, fontWeight: 900, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.06em' }, 'FABRICATION PIPELINE'),
            h('line', { x1: 42, y1: 50, x2: 374, y2: 50, stroke: isContrast ? '#ffff00' : '#334155', strokeWidth: 3 }),
            activeStepIdx > 0 && h('line', { x1: 42, y1: 50, x2: 42 + activeStepIdx * 110, y2: 50, stroke: isContrast ? '#00ff00' : '#22d3ee', strokeWidth: 3 }),
            TABS.map(function (stageName, idx) {
              var sx = 42 + idx * 110;
              var isCurrent = idx === activeStepIdx;
              var isDone = idx < activeStepIdx;
              return h('g', { key: stageName },
                h('circle', {
                  cx: sx, cy: 50, r: isCurrent ? 13 : 10,
                  fill: isCurrent ? (isContrast ? '#ffff00' : '#06b6d4') : (isDone ? (isContrast ? '#00ff00' : '#047857') : (isContrast ? '#000000' : '#1e293b')),
                  stroke: isContrast ? '#ffff00' : (isCurrent ? '#ecfeff' : '#475569'),
                  strokeWidth: isCurrent ? 2 : 1.5
                }),
                h('text', {
                  x: sx, y: 54, textAnchor: 'middle',
                  fill: (isCurrent || isDone) ? '#000000' : (isContrast ? '#ffffff' : '#cbd5e1'),
                  fontSize: 10.5, fontWeight: 900, fontFamily: 'system-ui, sans-serif'
                }, isDone ? '\u2713' : String(idx + 1)),
                h('text', {
                  x: sx, y: 78, textAnchor: 'middle',
                  fill: isCurrent ? (isContrast ? '#ffff00' : '#67e8f9') : (isContrast ? '#ffffff' : '#94a3b8'),
                  fontSize: 10.5, fontWeight: isCurrent ? 900 : 700, fontFamily: 'system-ui, sans-serif'
                }, stageName)
              );
            }),
            /* Divider */
            h('line', { x1: 424, y1: 12, x2: 424, y2: 82, stroke: isContrast ? '#ffff00' : '#1e293b', strokeWidth: 1.2 }),
            /* Right: Build Plate Envelope & 2D Layer-Slicer Cross-Section Schematic */
            h('text', { x: 438, y: 20, fill: isContrast ? '#ffff00' : '#e2e8f0', fontSize: 10.5, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }, 'LAYER SLICE / BED'),
            h('rect', { x: 438, y: 28, width: 58, height: 54, rx: 4, fill: isContrast ? '#000000' : '#081120', stroke: isContrast ? '#ffff00' : '#475569', strokeWidth: 1.5 }),
            /* Calibrated build-plate millimeter grid lines */
            h('g', { stroke: isContrast ? 'rgba(255,255,0,0.28)' : 'rgba(56,189,248,0.16)', strokeWidth: 0.6 },
              [448, 458, 467, 476, 486].map(function (gx) { return h('line', { key: 'gx' + gx, x1: gx, y1: 29, x2: gx, y2: 81 }); }),
              [38, 47, 55, 63, 72].map(function (gy) { return h('line', { key: 'gy' + gy, x1: 439, y1: gy, x2: 495, y2: gy }); })
            ),
            /* Planning clearance dashed inner box */
            h('rect', { x: 443, y: 33, width: 48, height: 44, rx: 2, fill: 'none', stroke: isContrast ? '#00ffff' : '#38bdf8', strokeWidth: 1, strokeDasharray: '3 2', opacity: 0.8 }),
            /* Scaled 2D layer-slicer cross-section with perimeter contour + infill hatch + hotend nozzle pip */
            (function () {
              var fw = dimW != null ? Math.min(48, Math.max(10, Math.round((dimW / bedW) * 48))) : 26;
              var fd = dimD != null ? Math.min(44, Math.max(10, Math.round((dimD / bedD) * 44))) : 22;
              var fx = 467 - Math.round(fw / 2);
              var fy = 55 - Math.round(fd / 2);
              var hatchLines = [];
              for (var hi = -fd; hi < fw; hi += 6) {
                var hx1 = Math.max(fx + 2, fx + hi);
                var hy1 = fy + Math.max(2, 2 - hi);
                var hx2 = Math.min(fx + fw - 2, fx + hi + fd - 4);
                var hy2 = fy + Math.min(fd - 2, fd - 2 - (fx + hi + fd - 4 - hx2));
                if (hx2 > hx1 && hy2 > hy1) {
                  hatchLines.push(h('line', { key: 'h' + hi, x1: hx1, y1: hy1, x2: hx2, y2: hy2, stroke: isContrast ? '#00ffff' : (fitsBed ? 'rgba(103,232,249,0.55)' : 'rgba(253,164,175,0.6)'), strokeWidth: 0.85 }));
                }
              }
              return h('g', null,
                h('rect', {
                  x: fx, y: fy, width: fw, height: fd, rx: 2,
                  fill: isContrast ? (fitsBed ? '#003300' : '#330000') : (fitsBed ? 'rgba(6,182,212,0.22)' : 'rgba(244,63,94,0.28)'),
                  stroke: isContrast ? '#ffff00' : (fitsBed ? '#22d3ee' : '#fb7185'),
                  strokeWidth: 1.6
                }),
                h('rect', {
                  x: fx + 2.2, y: fy + 2.2, width: Math.max(4, fw - 4.4), height: Math.max(4, fd - 4.4), rx: 1,
                  fill: 'none',
                  stroke: isContrast ? '#00ff00' : (fitsBed ? '#fb923c' : '#fda4af'),
                  strokeWidth: 0.9, strokeDasharray: '2 1.5'
                }),
                hatchLines,
                h('circle', { cx: fx + fw - 2.5, cy: fy + 2.5, r: 2.2, fill: isContrast ? '#ffff00' : '#fb923c' })
              );
            })(),
            h('text', { x: 508, y: 40, fill: isContrast ? '#ffffff' : '#f8fafc', fontSize: 10.5, fontWeight: 800, fontFamily: 'monospace' }, bedW + '\u00D7' + bedD + ' mm'),
            h('text', { x: 508, y: 56, fill: isContrast ? '#00ffff' : '#cbd5e1', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui, sans-serif' },
              dimW != null ? ('Model: ' + Math.round(dimW) + '\u00D7' + Math.round(dimD || 0) + ' mm') : ('Scale: ' + unitMm + ' mm/u')),
            h('text', { x: 508, y: 72, fill: isContrast ? (fitsBed ? '#00ff00' : '#ff6b6b') : (fitsBed ? '#6ee7b7' : '#fda4af'), fontSize: 10, fontWeight: 800, fontFamily: 'system-ui, sans-serif' },
              dimW != null ? (fitsBed ? '\u2713 Inside bed envelope' : '\u26A0 Exceeds bed envelope') : ('Clearance: ' + (profile.planningClearanceMm || 5) + ' mm'))
          )
        ),
        h('nav', { role: 'tablist', 'aria-label': __alloT('stem.printlab.a11y_print_lab_workflow', 'Print Lab workflow'), className: 'grid grid-cols-2 gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 sm:grid-cols-4' }, TABS.map(function (name, index) {
          var lower = name.toLowerCase(), selected = activeTab === name;
          return h('button', { key: name, id: 'print-lab-tab-' + lower, type: 'button', role: 'tab', 'aria-selected': selected ? 'true' : 'false', 'aria-controls': 'print-lab-panel-' + lower, tabIndex: selected ? 0 : -1, onKeyDown: function (event) { onTabKey(event, index); }, onClick: function () { chooseTab(name); }, className: 'min-h-[44px] rounded-xl px-3 text-sm font-black ' + (selected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-200') }, (index + 1) + '. ' + name);
        })),
        h('div', { id: 'print-lab-panel-' + activeTab.toLowerCase(), role: 'tabpanel', 'aria-labelledby': 'print-lab-tab-' + activeTab.toLowerCase() }, panel),
        h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-200' }, status)
      );
    }
  });
})();
