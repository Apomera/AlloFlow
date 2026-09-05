// AlloFlow STEM Lab — Print Lab
// Client-only preparation workspace for primitive recipes, GLB, and STL.
(function () {
  'use strict';

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('printLab')) return;

  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var MAX_PORTAL_ASSET_BYTES = 4 * 1024 * 1024;
  var MAX_GCODE_BYTES = 25 * 1024 * 1024;
  var GEOMETRY_EDGE_CLEARANCE_MM = 5;
  var DEFAULT_PRINTER_PROFILE = { name: 'School printer', bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250, planningClearanceMm: GEOMETRY_EDGE_CLEARANCE_MM, nozzleMm: 0.4, maxTriangles: 250000, maxBytes: MAX_FILE_BYTES };
  var TABS = ['Design', 'Preflight', 'Materials', 'Submit'];
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
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename; link.style.display = 'none';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
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
    var _status = React.useState('loading'), status = _status[0], setStatus = _status[1];
    var signature = [props.format, props.unitMm, props.revision, props.glbRoot ? 'glb' : '', props.bytes ? props.bytes.byteLength : 0].join('|');

    React.useEffect(function () {
      var alive = true, renderer = null, scene = null, controls = null, model = null, frame = 0, resizeObserver = null, visibilityHandler = null;
      var canvas = canvasRef.current;
      if (!canvas || !props.ready) { setStatus(props.ready ? 'empty' : 'loading'); return function () { alive = false; }; }
      setStatus('loading');
      ensureThree().then(function (THREE) {
        if (!alive || !canvas.isConnected) return;
        try {
          renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setClearColor(0x07111f, 1);
          if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
          scene = new THREE.Scene();
          var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100000);
          scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172033, 1.15));
          var key = new THREE.DirectionalLight(0xffffff, 0.82); key.position.set(5, 8, 6); scene.add(key);
          var grid = new THREE.GridHelper(220, 22, 0x38bdf8, 0x334155); grid.position.y = -0.02; scene.add(grid);
          model = makeModelObject(THREE, props.format, props.recipe, props.bytes, props.glbRoot, props.unitMm);
          if (!model) { setStatus('empty'); return; }
          scene.add(model);
          var bounds = centerAndGround(THREE, model);
          if (!bounds) { setStatus('empty'); return; }
          var size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
          var radius = Math.max(1, size.length() * 0.55);
          camera.position.set(center.x + radius * 1.35, center.y + radius * 0.9, center.z + radius * 1.6);
          camera.near = Math.max(0.01, radius / 1000); camera.far = radius * 30 + 100; camera.lookAt(center); camera.updateProjectionMatrix();
          if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, canvas);
            controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
            controls.target.copy(center); controls.minDistance = radius * 0.55; controls.maxDistance = radius * 8; controls.update();
          }
          function resize() {
            if (!renderer || !alive) return;
            var width = Math.max(1, canvas.clientWidth || 560), height = Math.max(1, canvas.clientHeight || 360);
            renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
          }
          resize();
          if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); }
          function draw() {
            if (!alive || !renderer) return;
            frame = requestAnimationFrame(draw);
            if (document.hidden) return;
            if (controls) controls.update();
            renderer.render(scene, camera);
          }
          controllerRef.current = {
            rotate: function (delta) { if (model) model.rotation.y += delta; },
            zoom: function (factor) {
              if (!camera) return;
              var target = controls ? controls.target : center;
              camera.position.sub(target).multiplyScalar(factor).add(target);
              if (controls) controls.update();
            },
            reset: function () {
              if (model) model.rotation.y = 0;
              camera.position.set(center.x + radius * 1.35, center.y + radius * 0.9, center.z + radius * 1.6);
              camera.lookAt(center); if (controls) { controls.target.copy(center); controls.update(); }
            }
          };
          visibilityHandler = function () { if (!document.hidden && renderer) renderer.render(scene, camera); };
          document.addEventListener('visibilitychange', visibilityHandler);
          setStatus('ready'); draw();
        } catch (error) { setStatus('failed'); }
      }).catch(function () { if (alive) setStatus('failed'); });
      return function () {
        alive = false; controllerRef.current = null;
        if (frame) cancelAnimationFrame(frame);
        if (resizeObserver) resizeObserver.disconnect();
        if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
        if (controls && controls.dispose) { try { controls.dispose(); } catch (_) {} }
        if (model) disposeObject(model, false);
        if (scene) {
          scene.traverse(function (node) {
            if (node === model) return;
            if (node.geometry && node.geometry.dispose) { try { node.geometry.dispose(); } catch (_) {} }
            if (node.material && node.material.dispose) { try { node.material.dispose(); } catch (_) {} }
          });
        }
        if (renderer) { try { renderer.dispose(); } catch (_) {} try { renderer.forceContextLoss(); } catch (_) {} }
      };
    }, [signature, props.recipe, props.bytes, props.glbRoot, props.ready]);

    function useController(method, value) { return function () { var c = controllerRef.current; if (c && c[method]) c[method](value); }; }
    return h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-950 p-3', 'aria-labelledby': 'print-lab-preview-title' },
      h('div', { className: 'mb-2 flex flex-wrap items-center justify-between gap-2' },
        h('div', null,
          h('h3', { id: 'print-lab-preview-title', className: 'text-sm font-black text-white' }, '3D preview'),
          h('p', { className: 'text-[11px] text-slate-300' }, status === 'ready' ? 'Drag to orbit. Use the controls below for a keyboard path.' : status === 'failed' ? '3D preview unavailable; use the complete text preflight below.' : status === 'empty' ? 'Add or import geometry to preview it.' : 'Loading the local 3D preview…')
        ),
        h('div', { className: 'flex gap-1', 'aria-label': '3D preview controls' },
          h('button', { type: 'button', onClick: useController('rotate', -Math.PI / 8), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': 'Rotate model left' }, '↶'),
          h('button', { type: 'button', onClick: useController('rotate', Math.PI / 8), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': 'Rotate model right' }, '↷'),
          h('button', { type: 'button', onClick: useController('zoom', 0.82), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': 'Zoom preview in' }, '+'),
          h('button', { type: 'button', onClick: useController('zoom', 1.22), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white', 'aria-label': 'Zoom preview out' }, '−'),
          h('button', { type: 'button', onClick: useController('reset'), className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white' }, 'Reset')
        )
      ),
      h('canvas', { ref: canvasRef, role: 'img', className: 'block h-[360px] w-full rounded-xl bg-[#07111f]', 'aria-label': 'Interactive preview of the current model. A complete text report is available in the Preflight tab.' })
    );
  }

  // Geometry World hands a selected build to Print Lab through one ephemeral,
  // in-memory slot.  Model bytes never enter persisted toolData, localStorage, or a
  // network request.  Validate the slot at the receiving boundary before a preview
  // or advisory inspection is allowed to touch it.
  var GEOMETRY_WORLD_BLOCK_TYPES = ['stone', 'wood', 'diamond', 'gold', 'sand', 'glass', 'water', 'brick', 'ice', 'lava', 'torch'];
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
  function inspectGeometryWorldBinaryStl(bytes, triangleCount) {
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
    return { L: extent(0), W: extent(2), H: extent(1) };
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
    return {
      canFit: canFit,
      needsReduction: !canFit || current > safeMaximum,
      recommendedUnitMm: canFit ? safeMaximum : null,
      currentUnitMm: current,
      reductionPercent: canFit && current > safeMaximum ? Math.round((1 - safeMaximum / current) * 1000) / 10 : 0,
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
    var currentScaleFitsRotated = currentScale <= rotated.recommendedUnitMm;
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
  function readPendingLocalHandoff(candidate) {
    var pending = arguments.length ? candidate : (typeof window !== 'undefined' ? window.__alloPrintLabPendingHandoff : null);
    if (!pending || pending.schema !== 'alloflow-print-source/1' || pending.format !== 'STL' || pending.sourceTool !== 'geometryWorld') return null;
    var bytes = pending.bytes instanceof Uint8Array ? pending.bytes
      : pending.bytes instanceof ArrayBuffer ? new Uint8Array(pending.bytes) : null;
    if (!bytes || bytes.byteLength < 84 || bytes.byteLength > MAX_FILE_BYTES) return null;
    var triangleCount;
    try { triangleCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true); } catch (_) { return null; }
    if (!triangleCount || triangleCount > 250000 || 84 + triangleCount * 50 !== bytes.byteLength) return null;
    var meshDimensions = inspectGeometryWorldBinaryStl(bytes, triangleCount);
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
      sourceModel: source,
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
    allowedFile: allowedFile,
    allowedGcodeFile: allowedGcodeFile,
    sourceExtension: sourceExtension,
    normalizeRewardsPortalUrl: normalizeRewardsPortalUrl,
    normalizePersistedRecipe: normalizePersistedRecipe,
    normalizePrinterProfile: normalizePrinterProfile,
    normalizePersistedPreflight: normalizePersistedPreflight,
    persistedPreflightBinding: persistedPreflightBinding,
    manufacturingEvidenceBinding: manufacturingEvidenceBinding,
    schoolRewardsAssetCompatibility: schoolRewardsAssetCompatibility,
    sanitizeGeometryWorldSource: sanitizeGeometryWorldSource,
    inspectGeometryWorldBinaryStl: inspectGeometryWorldBinaryStl,
    scaledGeometryWorldDimensions: scaledGeometryWorldDimensions,
    geometryWorldPrinterFit: geometryWorldPrinterFit,
    geometryWorldScaleRecommendation: geometryWorldScaleRecommendation,
    geometryWorldOrientationAdvice: geometryWorldOrientationAdvice,
    readPendingLocalHandoff: readPendingLocalHandoff
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
      var React = ctx.React, h = React.createElement;
      var stored = (ctx.toolData && ctx.toolData.printLab) || {};
      var pendingSlotRef = React.useRef(undefined);
      if (pendingSlotRef.current === undefined) pendingSlotRef.current = window.__alloPrintLabPendingHandoff || null;
      var pendingHandoffRef = React.useRef(undefined);
      if (pendingHandoffRef.current === undefined) pendingHandoffRef.current = readPendingLocalHandoff(pendingSlotRef.current);
      var pendingHandoff = pendingHandoffRef.current;
      var initialRecipe = pendingHandoff ? null : normalizePersistedRecipe(stored.recipe);
      var initialFormat = pendingHandoff ? pendingHandoff.format : 'RECIPE';
      var initialUnitMm = pendingHandoff ? pendingHandoff.unitMm : clamp(stored.unitMm, 0.01, 1000, 20);
      var initialProfile = normalizePrinterProfile(stored.profile);
      var persistedReport = pendingHandoff ? null : normalizePersistedPreflight(stored.preflight);
      var initialReport = initialRecipe && persistedReport && stored.preflightBinding === persistedPreflightBinding(initialRecipe, initialUnitMm, initialProfile) ? persistedReport : null;
      var _tab = React.useState(pendingHandoff ? 'Design' : (TABS.indexOf(stored.activeTab) >= 0 ? stored.activeTab : 'Design')), activeTab = _tab[0], setActiveTab = _tab[1];
      var _ready = React.useState(!!(window.AlloModules && window.AlloModules.PrintableModel && window.AlloModules.Prim3D)), runtimeReady = _ready[0], setRuntimeReady = _ready[1];
      var _runtimeError = React.useState(''), runtimeError = _runtimeError[0], setRuntimeError = _runtimeError[1];
      var _format = React.useState(initialFormat), format = _format[0], setFormat = _format[1];
      var _recipe = React.useState(initialRecipe), recipe = _recipe[0], setRecipe = _recipe[1];
      var _bytes = React.useState(pendingHandoff ? pendingHandoff.bytes : null), fileBytes = _bytes[0], setFileBytes = _bytes[1];
      var _glb = React.useState(null), glbRoot = _glb[0], setGlbRoot = _glb[1];
      var _sourceName = React.useState(pendingHandoff ? pendingHandoff.sourceName : ''), sourceName = _sourceName[0], setSourceName = _sourceName[1];
      var _hash = React.useState(''), contentHash = _hash[0], setContentHash = _hash[1];
      var _unit = React.useState(initialUnitMm), unitMm = _unit[0], setUnitMm = _unit[1];
      var _report = React.useState(initialReport), report = _report[0], setReport = _report[1];
      var _status = React.useState(pendingHandoff ? 'Loaded a connected Geometry World build locally. Confirm its scale, preview, and advisory preflight.' : 'Model files stay on this device until you deliberately download a handoff.'), status = _status[0], setStatus = _status[1];
      var _revision = React.useState(0), revision = _revision[0], setRevision = _revision[1];
      var _subject = React.useState(''), aiSubject = _subject[0], setAiSubject = _subject[1];
      var _refine = React.useState(''), aiRefinement = _refine[0], setAiRefinement = _refine[1];
      var _busy = React.useState(false), aiBusy = _busy[0], setAiBusy = _busy[1];
      var _title = React.useState(pendingHandoff ? pendingHandoff.title : (stored.title || '')), title = _title[0], setTitle = _title[1];
      var _description = React.useState(pendingHandoff ? pendingHandoff.description : (stored.description || '')), description = _description[0], setDescription = _description[1];
      var _sourceContext = React.useState(pendingHandoff ? { sourceTool: pendingHandoff.sourceTool, sourceModel: pendingHandoff.sourceModel, summary: pendingHandoff.summary } : null), sourceContext = _sourceContext[0], setSourceContext = _sourceContext[1];
      var _note = React.useState(stored.studentNote || ''), studentNote = _note[0], setStudentNote = _note[1];
      var _aiUse = React.useState(stored.aiUse || 'NONE'), aiUse = _aiUse[0], setAiUse = _aiUse[1];
      var _aiDisclosure = React.useState(stored.aiDisclosure || ''), aiDisclosure = _aiDisclosure[0], setAiDisclosure = _aiDisclosure[1];
      var _profile = React.useState(initialProfile), profile = _profile[0], setProfile = _profile[1];
      var _material = React.useState(stored.materialId || 'PLA'), materialId = _material[0], setMaterialId = _material[1];
      var _infill = React.useState(clamp(stored.infillPercent, 0, 100, 20)), infillPercent = _infill[0], setInfillPercent = _infill[1];
      var _support = React.useState(clamp(stored.supportPercent, 0, 200, 10)), supportPercent = _support[0], setSupportPercent = _support[1];
      var _saved = React.useState(''), selectedSaved = _saved[0], setSelectedSaved = _saved[1];
      var _repair = React.useState(null), repairResult = _repair[0], setRepairResult = _repair[1];
      var _gcode = React.useState(null), gcodeMetadata = _gcode[0], setGcodeMetadata = _gcode[1];
      var _gcodeHash = React.useState(''), gcodeMetadataHash = _gcodeHash[0], setGcodeMetadataHash = _gcodeHash[1];
      var _gcodeBinding = React.useState(''), gcodeBinding = _gcodeBinding[0], setGcodeBinding = _gcodeBinding[1];
      var _ticket = React.useState(null), jobTicket = _ticket[0], setJobTicket = _ticket[1];
      var _profileReviewed = React.useState(false), profileReviewed = _profileReviewed[0], setProfileReviewed = _profileReviewed[1];
      var _materialReviewed = React.useState(false), materialReviewed = _materialReviewed[0], setMaterialReviewed = _materialReviewed[1];
      var defaultQuoteConfig = { basePoints: 5, setupPoints: 5, pointsPerGram: 2, pointsPerHour: 4, complexityMultiplier: 1, complexityPoints: 0, roundingIncrement: 1, minimumPoints: 10, estimatedMinutes: 0 };
      var _quoteConfig = React.useState(Object.assign({}, defaultQuoteConfig, stored.quoteConfig || {})), quoteConfig = _quoteConfig[0], setQuoteConfig = _quoteConfig[1];
      var _simulator = React.useState(null), simulatorSnapshot = _simulator[0], setSimulatorSnapshot = _simulator[1];
      var _simJob = React.useState(''), simulatorJobKey = _simJob[0], setSimulatorJobKey = _simJob[1];
      var _schedule = React.useState(null), simulatedSchedule = _schedule[0], setSimulatedSchedule = _schedule[1];
      var simulatorRef = React.useRef(null);
      var contextRevisionRef = React.useRef(0);
      var operationTokensRef = React.useRef(Object.create(null));

      var savedSculpts = (ctx.toolData && ctx.toolData.geoSandbox && ctx.toolData.geoSandbox.savedSculpts) || {};
      var savedNames = Object.keys(savedSculpts).sort();
      var rewardsPortalUrl = connectedRewardsPortalUrl();

      function persist(patch) {
        if (typeof ctx.setToolData !== 'function') return;
        ctx.setToolData(function (previous) {
          return Object.assign({}, previous, { printLab: Object.assign({}, previous.printLab || {}, patch || {}) });
        });
      }

      React.useEffect(function () {
        var alive = true;
        ensurePrintRuntime().then(function () { if (alive) { setRuntimeReady(true); setRuntimeError(''); } }).catch(function (error) { if (alive) setRuntimeError(error && error.message ? error.message : 'Print Lab support files could not be loaded.'); });
        return function () { alive = false; };
      }, []);

      React.useEffect(function () {
        if (window.__alloPrintLabPendingHandoff === pendingSlotRef.current) delete window.__alloPrintLabPendingHandoff;
        if (!pendingHandoff) return;
        // Persist only small form defaults. The STL bytes and editable source model
        // intentionally remain in component memory and disappear when Print Lab closes.
        persist({ activeTab: 'Design', recipe: null, unitMm: pendingHandoff.unitMm, preflight: null, preflightBinding: '', title: pendingHandoff.title, description: pendingHandoff.description });
      }, []);

      React.useEffect(function () {
        return function () {
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

      function cancelOperation(kind) {
        operationTokensRef.current[kind] = (operationTokensRef.current[kind] || 0) + 1;
      }

      function beginDesignOperation(kind) {
        ['modelImport', 'ai', 'repair'].forEach(function (other) { if (other !== kind) cancelOperation(other); });
        if (kind !== 'ai') setAiBusy(false);
        return { token: beginOperation(kind), revision: contextRevisionRef.current };
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
        var next = clamp(value, 0.01, 1000, unitMm);
        invalidateManufacturingEvidence();
        setUnitMm(next);
        persist({ unitMm: next, preflight: null, preflightBinding: '' });
        if (message) announce(message);
      }

      function chooseTab(name) {
        setActiveTab(name); persist({ activeTab: name });
      }

      function onTabKey(event, index) {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        var next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
        chooseTab(TABS[next]);
        var target = document.getElementById('print-lab-tab-' + TABS[next].toLowerCase()); if (target) target.focus();
      }

      function replaceDesign(nextFormat, nextRecipe, nextBytes, nextRoot, nextName, nextUnit, nextReport, nextHash, preserveOperation) {
        var cleanUnit = clamp(nextUnit, 0.01, 1000, nextFormat === 'RECIPE' ? 20 : 1);
        var persistedNextReport = nextFormat === 'RECIPE' ? normalizePersistedPreflight(nextReport) : null;
        var nextPreflightBinding = persistedNextReport ? persistedPreflightBinding(nextRecipe, cleanUnit, profile) : '';
        invalidateManufacturingEvidence({ preserveOperation: preserveOperation });
        setFormat(nextFormat); setRecipe(nextRecipe || null); setFileBytes(nextBytes || null); setGlbRoot(nextRoot || null); setSourceName(nextName || '');
        setUnitMm(cleanUnit); setReport(nextReport || null); setContentHash(nextHash || '');
        persist({ recipe: nextFormat === 'RECIPE' ? nextRecipe : null, unitMm: cleanUnit, preflight: persistedNextReport, preflightBinding: nextPreflightBinding });
      }

      function updateRecipe(next, nextUnitMm, preserveOperation) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        var clean = P3D ? P3D.normalizeRecipe(next) : next;
        if (!clean) { announce('That primitive recipe is not valid.'); return; }
        var cleanUnit = clamp(nextUnitMm == null ? unitMm : nextUnitMm, 0.01, 1000, 20);
        invalidateManufacturingEvidence({ preserveOperation: preserveOperation });
        setRecipe(clean); setFormat('RECIPE'); setFileBytes(null); setGlbRoot(null); setSourceName(''); setReport(null); setContentHash('');
        setUnitMm(cleanUnit);
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
        if (!clean) { announce('That saved Geometry Sandbox design is not a valid primitive recipe.'); return; }
        updateRecipe(clean, 20); setTitle(clean.name || selectedSaved); announce('Loaded “' + selectedSaved + '” from Geometry Sandbox.');
      }

      function downloadGeometryWorldSource() {
        var source = sourceContext && sourceContext.sourceModel;
        if (!source || source.schema !== 'alloflow-geometry-world-build/1') { announce('No editable Geometry World source is available in this session.'); return; }
        downloadBlob(new Blob([JSON.stringify(source, null, 2)], { type: 'application/json' }), 'geometry-world-editable-build.json');
        announce('Downloaded the editable Geometry World block recipe. It contains shapes and rotations, not the physical print settings.');
      }

      function returnToGeometryWorld() {
        var source = sourceContext && sourceContext.sourceModel;
        if (!source || source.schema !== 'alloflow-geometry-world-build/1') { announce('No editable Geometry World source is available in this session.'); return; }
        if (typeof ctx.setStemLabTool !== 'function') { downloadGeometryWorldSource(); return; }
        window.__alloGeometryWorldPendingBuild = {
          schema: 'alloflow-geometry-world-build/1',
          id: 'pl-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          sourceModel: JSON.parse(JSON.stringify(source))
        };
        if (typeof ctx.updateMulti === 'function') ctx.updateMulti('geometryWorld', { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory' });
        announce('Returning the editable selected build to Geometry World. Print settings remain in Print Lab only.');
        ctx.setStemLabTool('geometryWorld');
      }

      function runPreflight() {
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable) { announce('The inspection engine is still loading.'); return null; }
        var next = format === 'RECIPE' ? Printable.inspectRecipe(recipe, unitMm, profile)
          : format === 'STL' ? Printable.inspectStl(fileBytes, unitMm, profile)
          : Printable.inspectGlb(fileBytes, unitMm, profile);
        if (format === 'GLB' && glbRoot) next = inspectObjectCapabilities(glbRoot, next);
        setReport(next);
        persist({ preflight: format === 'RECIPE' ? next : null, preflightBinding: format === 'RECIPE' ? persistedPreflightBinding(recipe, unitMm, profile) : '', profile: profile, unitMm: unitMm });
        announce(next.status === 'FAIL' ? 'Preflight found blocking items. Review the report.' : next.status === 'WARN' ? 'Preflight completed with staff-review warnings.' : 'Preflight completed without a blocking geometry error. Staff and slicer review are still required.');
        return next;
      }

      function createRepairCandidate() {
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable || format !== 'STL' || !fileBytes) { announce('Conservative local repair is available for an imported STL.'); return; }
        var result = Printable.repairStl(fileBytes, { unitMm: unitMm, profile: profile, weldTolerance: 0.00001 });
        setRepairResult(result);
        announce(result.ok ? 'Created a local repair candidate. It still requires full slicer and staff review.' : (result.errors || ['The STL could not be repaired.']).join(' '));
      }

      function useRepairCandidate() {
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable || !repairResult || !repairResult.ok || !repairResult.buffer) return;
        var bytes = new Uint8Array(repairResult.buffer);
        var operation = beginDesignOperation('repair'), token = operation.token, startedRevision = operation.revision;
        Printable.sha256Hex(bytes).then(function (hash) {
          if (!operationIsCurrent('repair', token, startedRevision)) return;
          replaceDesign('STL', null, bytes, null, 'repaired-model.stl', unitMm, repairResult.report, hash, 'repair');
          announce('The conservative repair candidate is now the local working copy. Its analysis remains advisory.');
        }).catch(function () { if (operationIsCurrent('repair', token, startedRevision)) announce('The repaired candidate hash could not be calculated.'); });
      }

      function downloadRepairCandidate() {
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable || !repairResult || !repairResult.ok || !repairResult.buffer) return;
        downloadBlob(new Blob([repairResult.buffer], { type: 'model/stl' }), Printable.safeFilename(title || 'student-model') + '-conservative-repair.stl');
        announce('Downloaded the conservative repair candidate. It is not certified watertight or ready to print.');
      }

      function setProfileField(key, value) {
        var raw = Object.assign({}, profile); raw[key] = Number(value);
        var next = normalizePrinterProfile(raw);
        invalidateManufacturingEvidence();
        setProfile(next); persist({ profile: next, preflight: null, preflightBinding: '' });
      }

      function importFile(event) {
        var file = event.target.files && event.target.files[0]; event.target.value = '';
        var accepted = allowedFile(file); if (!accepted.ok) { announce(accepted.message); return; }
        if (!runtimeReady) { announce('The local inspection engine is still loading.'); return; }
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
              announce('Import inspected locally. Confirm scale and review Preflight before submitting.');
            });
          } else if (accepted.format === 'STL') {
            var stlReport = Printable.inspectStl(bytes, 1, profile);
            setSourceContext(null);
            replaceDesign('STL', null, bytes, null, file.name, 1, stlReport, hash, 'modelImport');
            announce('Import inspected locally. Confirm scale and review Preflight before submitting.');
          } else {
            var glbReport = Printable.inspectGlb(bytes, 10, profile);
            if (hasBlockingIssue(glbReport)) {
              setSourceContext(null);
              replaceDesign('GLB', null, bytes, null, file.name, 10, glbReport, hash, 'modelImport');
              announce('Import inspected locally. Confirm scale and review Preflight before submitting.');
              return null;
            }
            return ensureThree().then(function (THREE) { return parseGlb(THREE, bytes); }).then(function (root) {
              if (!operationIsCurrent('modelImport', token, startedRevision)) { disposeObject(root, true); return; }
              glbReport = inspectObjectCapabilities(root, glbReport);
              setSourceContext(null);
              replaceDesign('GLB', null, bytes, root, file.name, 10, glbReport, hash, 'modelImport');
              announce('Import inspected locally. Confirm scale and review Preflight before submitting.');
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
        if (!Printable) { announce('The local metadata reader is still loading.'); return; }
        var token = beginOperation('gcodeImport'), startedRevision = contextRevisionRef.current;
        announce('Reading allowlisted G-code comments locally. Toolpath commands will not be interpreted.');
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
          announce('Slicer comment metadata imported locally. No G-code command was stored or executed.');
        }).catch(function (error) { if (operationIsCurrent('gcodeImport', token, startedRevision)) announce(error && error.message ? error.message : 'G-code comment metadata could not be read.'); });
      }

      function callRecipeAi(kind) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        if (!P3D || typeof ctx.callGemini !== 'function') { announce('AI assistance is not configured. Manual primitive tools remain available.'); return; }
        var prompt = kind === 'refine' ? P3D.buildRefinePrompt(recipe, aiRefinement) : P3D.buildRecipePrompt(aiSubject);
        if ((kind === 'refine' && !aiRefinement.trim()) || (kind !== 'refine' && !aiSubject.trim())) { announce('Describe what you want the modeling assistant to do.'); return; }
        var operation = beginDesignOperation('ai'), token = operation.token, startedRevision = operation.revision;
        setAiBusy(true); announce(kind === 'refine' ? 'Preparing an AI-assisted revision…' : 'Preparing an AI-assisted primitive recipe…');
        Promise.resolve(ctx.callGemini(prompt, false, false, 0.5)).then(function (response) {
          if (!operationIsCurrent('ai', token, startedRevision)) return;
          var next = P3D.parseRecipe(aiText(response));
          if (!next) throw new Error('The modeling response did not contain a valid primitive recipe.');
          updateRecipe(next, unitMm, 'ai'); setTitle(next.name || title); setAiUse('ASSISTED');
          if (!aiDisclosure) setAiDisclosure(kind === 'refine' ? 'AI helped revise a primitive-based model from my instruction.' : 'AI proposed a primitive-based starting model that I reviewed and can edit.');
          announce('AI-assisted recipe ready. Review every part and run Preflight.');
        }).catch(function (error) { if (operationIsCurrent('ai', token, startedRevision)) announce(error && error.message ? error.message : 'AI modeling was unavailable.'); }).then(function () { if (operationIsCurrent('ai', token, startedRevision)) setAiBusy(false); });
      }

      var chosenMaterial = materialById(materialId);
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
      var geometryClearanceFit = geometryPrinterFit && (!geometryScaleRecommendation || !geometryScaleRecommendation.needsReduction);
      var gcodeEvidenceCurrent = !!(gcodeMetadata && gcodeMetadataHash && gcodeBinding);
      var rewardsAssetCompatibility = schoolRewardsAssetCompatibility(format, fileBytes && fileBytes.byteLength);
      var rewardsAssetSizeLabel = rewardsAssetCompatibility.byteLength ? (Math.round(rewardsAssetCompatibility.byteLength / 1024 / 1024 * 100) / 100) + ' MiB' : 'No local file';

      function setQuoteConfigField(key, value) {
        var next = Object.assign({}, quoteConfig); next[key] = Number(value); setQuoteConfig(next); clearJobArtifacts(); persist({ quoteConfig: next });
      }

      function currentModelHash() {
        if (!Printable) return Promise.resolve('');
        if (contentHash) return Promise.resolve(contentHash);
        return Printable.sha256Hex(format === 'RECIPE' ? JSON.stringify(recipe || {}) : fileBytes);
      }

      function createJobTicket() {
        if (!Printable || !report || report.status === 'FAIL') { chooseTab('Preflight'); announce('Complete model analysis before creating a job ticket.'); return; }
        if (!gcodeEvidenceCurrent) { announce('Import comment metadata from the approved school slicer for this exact model, scale, material, and printer profile before creating a job ticket.'); return; }
        if (!quoteMaterial || !(Number(quoteMaterial.estimatedGrams) > 0)) { announce('The reviewed slicer handoff must include a positive material mass in grams before creating a job ticket.'); return; }
        if (!profileReviewed || !materialReviewed) { announce('Confirm the reviewed material and printer profile first.'); return; }
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
          announce('Created a privacy-minimized local job ticket. It contains no G-code commands and does not authorize printing.');
        }).catch(function (error) { if (operationIsCurrent('ticket', token, startedRevision)) announce(error && error.message ? error.message : 'The job ticket could not be created.'); });
      }

      function downloadJobTicket() {
        if (!Printable || !jobTicket) return;
        try { downloadBlob(new Blob([Printable.serializePrintJobTicket(jobTicket)], { type: 'application/json' }), Printable.safeFilename(title || 'print-job') + '.alloflow-print-job.json'); announce('Downloaded the versioned job ticket for staff review.'); }
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
        if (!jobTicket) { announce('Create a reviewed job ticket before using the simulator.'); return; }
        try { var adapter=simulator(),job=adapter.submit(jobTicket,'sim-printer-a');setSimulatorJobKey(job.jobKey);setSimulatorSnapshot(adapter.snapshot());announce('Queued a simulation-only job. No printer was contacted.'); }
        catch(error){announce(error&&error.message?error.message:'The simulated job could not be queued.');}
      }

      function advanceSimulation() {
        var adapter=simulator();if(!adapter||!simulatorJobKey)return;
        try { var state=adapter.snapshot(),job=state.jobs[simulatorJobKey];if(job&&job.state==='PRINTING'&&job.progressPercent<75)adapter.emit({type:'JOB_PROGRESS',jobKey:simulatorJobKey,printerKey:job.printerKey,progressPercent:job.progressPercent+25,atMinute:state.sequence});else adapter.advance(simulatorJobKey);setSimulatorSnapshot(adapter.snapshot());announce('Advanced simulated telemetry only. No physical action occurred.'); }
        catch(error){announce(error&&error.message?error.message:'The simulation could not advance.');}
      }

      function planCapacity() {
        if (!jobTicket) { announce('Create a job ticket before planning capacity.'); return; }
        var adapter=simulator();setSimulatedSchedule(adapter.plan([jobTicket,jobTicket,jobTicket]));announce('Planned a deterministic three-copy example across two simulated printers.');
      }

      function buildSubmissionPreflight() {
        var next = report ? JSON.parse(JSON.stringify(report)) : null;
        if (next) next.materialEstimate = materialEstimate ? Object.assign({ material: materialId }, materialEstimate) : { material: materialId, method: 'Use the school slicer for this imported mesh.' };
        return next;
      }

      function downloadHandoff() {
        if (!Printable) { announce('The handoff engine is still loading.'); return; }
        var activeReport = report || runPreflight(); if (!activeReport || activeReport.status === 'FAIL') { chooseTab('Preflight'); announce('Resolve blocking preflight items before creating a handoff.'); return; }
        var token = beginOperation('handoff'), startedRevision = contextRevisionRef.current;
        var hashPromise = contentHash ? Promise.resolve(contentHash) : Printable.sha256Hex(format === 'RECIPE' ? JSON.stringify(recipe || {}) : fileBytes);
        hashPromise.then(function (hash) {
          if (!operationIsCurrent('handoff', token, startedRevision)) return;
          var genericName = format === 'RECIPE' ? '' : 'student-model.' + format.toLowerCase();
          var serialized = Printable.serializeSubmission({
            title: title, description: description, sourceFormat: format, originalFilename: genericName,
            contentHash: hash, unitDeclaration: format === 'RECIPE' ? '1 recipe unit = ' + unitMm + ' mm' : '1 source unit = ' + unitMm + ' mm',
            aiUse: aiUse, aiDisclosure: aiDisclosure, studentNote: studentNote, recipe: format === 'RECIPE' ? recipe : null,
            preflight: buildSubmissionPreflight(), createdAt: new Date().toISOString()
          });
          var name = Printable.safeFilename(title || 'student-model') + '.alloflow-print.json';
          downloadBlob(new Blob([serialized], { type: 'application/json' }), name);
          announce('Downloaded a privacy-minimized staff-review handoff. The model file itself was not embedded.');
        }).catch(function (error) { if (operationIsCurrent('handoff', token, startedRevision)) announce(error && error.message ? error.message : 'The handoff could not be created.'); });
      }

      function exportStl() {
        if (!Printable || !report || report.status === 'FAIL') { chooseTab('Preflight'); announce('Run preflight and resolve blocking items before exporting STL.'); return; }
        var token = beginOperation('export'), startedRevision = contextRevisionRef.current;
        ensureThree().then(function (THREE) {
          if (!operationIsCurrent('export', token, startedRevision)) return;
          var object = makeModelObject(THREE, format, recipe, fileBytes, glbRoot, unitMm);
          if (!object) throw new Error('There is no model ready to export.');
          centerAndGround(THREE, object);
          var buffer = Printable.exportBinaryStl(THREE, object);
          disposeObject(object, false);
          if (!buffer) throw new Error('The model did not contain exportable triangles.');
          downloadBlob(new Blob([buffer], { type: 'model/stl' }), Printable.safeFilename(title || 'student-model') + '.stl');
          announce('STL exported. Re-open it in the school’s slicer to confirm orientation, supports, scale, and machine settings.');
        }).catch(function (error) { if (operationIsCurrent('export', token, startedRevision)) announce(error && error.message ? error.message : 'STL export was unavailable.'); });
      }

      function field(label, value, onChange, options) {
        options = options || {};
        return h('label', { className: 'block text-[11px] font-bold text-slate-200' },
          h('span', { className: 'mb-1 block' }, label),
          h('input', { type: options.type || 'text', value: value, min: options.min, max: options.max, step: options.step, onChange: function (event) { onChange(event.target.value); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-sm text-white' })
        );
      }

      function renderPart(part, index) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        return h('fieldset', { key: 'part-' + index, className: 'rounded-xl border border-slate-700 bg-slate-950/70 p-3' },
          h('legend', { className: 'px-1 text-xs font-black text-cyan-200' }, 'Part ' + (index + 1)),
          h('div', { className: 'grid gap-2 md:grid-cols-4' },
            h('label', { className: 'text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Shape'), h('select', { value: part.shape, onChange: function (event) { patchPart(index, { shape: event.target.value }); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 px-2 text-white' }, SHAPES.map(function (shape) { return h('option', { key: shape, value: shape }, shape); }))),
            [0, 1, 2].map(function (axis) { return field('Size ' + ['X / radius', 'Y / height', 'Z / depth'][axis], part.size[axis], function (value) { var next = part.size.slice(); next[axis] = Number(value); patchPart(index, { size: next }); }, { type: 'number', min: 0.02, max: 4, step: 0.05 }); })
          ),
          h('div', { className: 'mt-2 grid gap-2 md:grid-cols-4' },
            [0, 1, 2].map(function (axis) { return field('Position ' + ['X', 'Y', 'Z'][axis], part.position[axis], function (value) { var next = part.position.slice(); next[axis] = Number(value); patchPart(index, { position: next }); }, { type: 'number', min: axis === 1 ? -4 : -4, max: axis === 1 ? 8 : 4, step: 0.05 }); }),
            h('label', { className: 'text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Color'), h('input', { type: 'color', value: part.color, onChange: function (event) { patchPart(index, { color: event.target.value }); }, className: 'h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 p-1' }))
          ),
          h('div', { className: 'mt-2 flex flex-wrap gap-2' },
            h('button', { type: 'button', disabled: !P3D || recipe.parts.length >= P3D.MAX_PARTS, onClick: function () { updateRecipe(P3D.duplicatePart(recipe, index)); }, className: 'min-h-[40px] rounded-lg border border-slate-600 px-3 text-xs font-bold text-white disabled:opacity-50' }, 'Duplicate'),
            h('button', { type: 'button', onClick: function () { updateRecipe(P3D.removePart(recipe, index)); }, className: 'min-h-[40px] rounded-lg border border-rose-700 px-3 text-xs font-bold text-rose-200' }, 'Remove')
          )
        );
      }

      function designPanel() {
        return h('div', { className: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.9fr)]' },
          h('div', { className: 'space-y-4' },
            sourceContext && sourceContext.sourceTool === 'geometryWorld' && h('section', { className: 'rounded-2xl border border-cyan-500/70 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-violet-950/80 p-4', 'aria-labelledby': 'print-lab-geometry-source-title' },
              h('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                h('div', null,
                  h('p', { className: 'text-[10px] font-black uppercase tracking-[.16em] text-cyan-300' }, 'Local connected-tool handoff'),
                  h('h2', { id: 'print-lab-geometry-source-title', className: 'mt-1 text-lg font-black text-white' }, 'From Geometry World'),
                  h('p', { className: 'mt-1 max-w-2xl text-xs leading-5 text-slate-200' }, 'The STL preview is physical geometry. A separate editable block recipe is held only in this open session so shapes and rotations are not lost.')
                ),
                h('span', { className: 'rounded-full border border-cyan-400/50 bg-cyan-950 px-3 py-1 text-[10px] font-black text-cyan-100' }, 'Default: 5 mm / block')
              ),
              h('dl', { className: 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4' },
                [
                  ['Connected blocks', sourceContext.summary && sourceContext.summary.blockCount || 0],
                  ['Shaped pieces', sourceContext.summary && sourceContext.summary.shapedCount || 0],
                  ['STL triangles', sourceContext.summary && sourceContext.summary.triangleCount || 0],
                  ['Block envelope', sourceContext.summary && sourceContext.summary.dimensions ? sourceContext.summary.dimensions.L + ' × ' + sourceContext.summary.dimensions.W + ' × ' + sourceContext.summary.dimensions.H + ' blocks' : '-']
                ].map(function (item) { return h('div', { key: item[0], className: 'rounded-xl border border-slate-700 bg-slate-950/60 p-2' }, h('dt', { className: 'text-[9px] font-bold uppercase text-slate-400' }, item[0]), h('dd', { className: 'mt-1 text-sm font-black text-white' }, String(item[1]))); })
              ),
              geometryPhysicalSize && h('div', { className: 'mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/50 bg-emerald-950/35 p-3', 'aria-live': 'polite' },
                h('div', null,
                  h('p', { className: 'text-[9px] font-black uppercase tracking-[.12em] text-emerald-300' }, 'Current physical size'),
                  h('p', { className: 'mt-1 text-xl font-black text-white' }, geometryPhysicalSize.label),
                  h('p', { className: 'mt-1 text-[10px] leading-4 text-emerald-100' }, 'Exact STL mesh envelope at ' + unitMm + ' mm per Geometry World block. Width × depth × height.')
                ),
                h('button', { type: 'button', disabled: Math.abs(unitMm - 5) < 0.000001, onClick: function () { applyUnitScale(5, 'Restored the Geometry World default scale of 5 millimeters per block.'); }, className: 'min-h-[40px] rounded-lg border border-emerald-400 px-3 text-[10px] font-black text-emerald-100 disabled:cursor-default disabled:opacity-50' }, 'Reset to 5 mm / block')
              ),
              h('div', { className: 'mt-3 flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: returnToGeometryWorld, className: 'min-h-[42px] rounded-xl bg-cyan-700 px-4 text-xs font-black text-white' }, 'Revise in Geometry World'),
                h('button', { type: 'button', onClick: downloadGeometryWorldSource, className: 'min-h-[42px] rounded-xl border border-cyan-400 px-4 text-xs font-black text-cyan-100' }, 'Download editable block source')
              ),
              h('p', { className: 'mt-3 text-[11px] leading-5 text-amber-100' }, 'Virtual Stone, Wood, Gold, and other block labels describe appearance only. Select the actual school filament in Materials after reviewing its properties and end-of-life limits.')
            ),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-create-title' },
              h('h2', { id: 'print-lab-create-title', className: 'text-lg font-black text-white' }, 'Design with primitives'),
              h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'Build directly, bring in a Geometry Sandbox sculpture, or ask AI for an editable starting recipe. Every AI result uses the same constrained primitive format.'),
              runtimeError && h('p', { role: 'alert', className: 'mt-2 rounded-lg border border-rose-700 bg-rose-950/40 p-2 text-xs text-rose-100' }, runtimeError),
              h('div', { className: 'mt-3 flex flex-wrap gap-2', 'aria-label': 'Add a primitive' }, SHAPES.map(function (shape) { return h('button', { key: shape, type: 'button', disabled: !runtimeReady, onClick: function () { addPrimitive(shape); }, className: 'min-h-[42px] rounded-xl bg-cyan-700 px-3 text-xs font-black text-white disabled:opacity-50' }, '+ ' + shape); })),
              recipe && field('Model name', recipe.name || '', function (value) { updateRecipe(Object.assign({}, recipe, { name: safeText(value, 80) })); }),
              !recipe && h('p', { className: 'mt-3 rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-300' }, 'No primitive recipe yet. Add a shape, import a file, or use an optional AI starting point.'),
              recipe && h('div', { className: 'mt-3 space-y-3' }, recipe.parts.map(renderPart))
            ),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-ai-title' },
              h('h2', { id: 'print-lab-ai-title', className: 'text-base font-black text-white' }, 'Optional AI modeling assistant'),
              h('p', { className: 'mt-1 text-xs text-slate-300' }, 'AI proposes only editable boxes, spheres, cylinders, cones, and toruses. Do not include a student name, email, or other identifying information in a prompt.'),
              h('div', { className: 'mt-3 grid gap-3 md:grid-cols-2' },
                h('div', null, field('Object to create', aiSubject, setAiSubject), h('button', { type: 'button', disabled: aiBusy || typeof ctx.callGemini !== 'function' || !runtimeReady, onClick: function () { callRecipeAi('create'); }, className: 'mt-2 min-h-[42px] rounded-xl bg-violet-700 px-4 text-xs font-black text-white disabled:opacity-50' }, aiBusy ? 'Working…' : 'Create editable recipe')),
                h('div', null, field('Change to the current model', aiRefinement, setAiRefinement), h('button', { type: 'button', disabled: !recipe || aiBusy || typeof ctx.callGemini !== 'function' || !runtimeReady, onClick: function () { callRecipeAi('refine'); }, className: 'mt-2 min-h-[42px] rounded-xl border border-violet-500 px-4 text-xs font-black text-violet-100 disabled:opacity-50' }, 'Refine current recipe'))
              ),
              typeof ctx.callGemini !== 'function' && h('p', { className: 'mt-2 text-xs text-amber-200' }, 'AI is not configured in this session. All manual design and import features remain available.')
            ),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-lab-import-title' },
              h('h2', { id: 'print-lab-import-title', className: 'text-base font-black text-white' }, 'Import locally'),
              h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Accepted: primitive recipe JSON, self-contained GLB, or STL. Maximum 5 MB. The file is inspected in this browser and is not uploaded by Print Lab.'),
              h('label', { className: 'mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-sky-700 px-4 text-xs font-black text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-200' }, 'Choose RECIPE / GLB / STL', h('input', { type: 'file', accept: '.json,.glb,.stl,application/json,model/gltf-binary,model/stl', className: 'sr-only', onChange: importFile })),
              sourceName && h('p', { className: 'mt-2 text-xs text-slate-300' }, 'Loaded locally: ', h('strong', { className: 'text-white' }, sourceName), '. The downloaded handoff substitutes a generic file name and a content hash.'),
              savedNames.length > 0 && h('div', { className: 'mt-3 flex flex-wrap items-end gap-2' },
                h('label', { className: 'min-w-[220px] text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Saved Geometry Sandbox sculpture'), h('select', { value: selectedSaved, onChange: function (event) { setSelectedSaved(event.target.value); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 px-2 text-white' }, h('option', { value: '' }, 'Choose a saved sculpture'), savedNames.map(function (name) { return h('option', { key: name, value: name }, name); }))),
                h('button', { type: 'button', disabled: !selectedSaved, onClick: importSavedRecipe, className: 'min-h-[42px] rounded-xl border border-cyan-500 px-4 text-xs font-black text-cyan-100 disabled:opacity-50' }, 'Open in Print Lab')
              )
            )
          ),
          h('div', { className: 'space-y-4' },
            h(PrintPreview, { React: React, ready: runtimeReady, format: format, recipe: recipe, bytes: fileBytes, glbRoot: glbRoot, unitMm: unitMm, revision: revision }),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4' },
              h('h2', { className: 'text-sm font-black text-white' }, 'Physical scale'),
              sourceContext && sourceContext.sourceTool === 'geometryWorld' && h('div', { className: 'mt-3', 'aria-label': 'Geometry World scale presets' },
                h('p', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-400' }, 'Scale presets'),
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
                      className: 'min-h-[48px] rounded-xl border px-2 text-center text-[10px] font-black ' + (selected ? 'border-cyan-300 bg-cyan-950 text-white' : 'border-slate-500 bg-slate-950 text-slate-200')
                    }, h('span', { className: 'block' }, preset.label), h('span', { className: 'mt-1 block font-medium text-slate-400' }, preset.note + ' / block'));
                  })
                )
              ),
              field(sourceContext && sourceContext.sourceTool === 'geometryWorld' ? 'Millimeters per Geometry World block' : 'Millimeters per model unit', unitMm, function (value) { applyUnitScale(value); }, { type: 'number', min: 0.01, max: 1000, step: 0.1 }),
              geometryPhysicalSize && h('p', { className: 'mt-2 rounded-lg border border-emerald-800 bg-emerald-950/30 p-2 text-xs font-bold text-emerald-100' }, 'Current mesh envelope: ' + geometryPhysicalSize.label + ' (width × depth × height).'),
              geometryPrinterFit && h('div', {
                className: 'mt-2 rounded-lg border p-2 text-[11px] leading-5 ' + (geometryClearanceFit ? 'border-emerald-700 bg-emerald-950/30 text-emerald-100' : 'border-amber-600 bg-amber-950/30 text-amber-100'),
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
                'aria-label': 'Suggested Geometry World scale correction',
                'data-geometry-scale-recommendation': geometryScaleRecommendation.canFit ? geometryScaleRecommendation.recommendedUnitMm : 'unavailable'
              },
                h('strong', { className: 'block text-xs' }, geometryScaleRecommendation.canFit
                  ? 'Suggested safe-fit scale: ' + geometryScaleRecommendation.recommendedUnitMm + ' mm per block'
                  : 'No supported scale preserves the planning clearance'),
                h('p', { className: 'mt-1 text-[11px] leading-5 text-cyan-100' }, geometryScaleRecommendation.canFit
                  ? h(React.Fragment, null,
                    h('span', null, geometryScaleRecommendation.limitingDimensions.join(' and ').replace(/^./, function (character) { return character.toUpperCase(); })),
                    geometryScaleRecommendation.limitingDimensions.length === 1 ? ' is the limiting dimension. ' : ' are the limiting dimensions. ',
                    'This targets a usable ' + geometryScaleRecommendation.availableLabel + ' envelope, preserving ' + geometryScaleRecommendation.clearanceMm + ' mm on every edge. Printer clips, purge lines, and machine keep-out zones still require slicer and staff review.'
                  )
                  : 'Revise the model or choose a different printer profile before preflight.'),
                geometryScaleRecommendation.canFit && geometryScaleRecommendation.recommendedPhysicalSize && h('dl', { className: 'mt-3 grid grid-cols-3 gap-2', 'aria-label': 'Scale change preview' },
                  h('div', { className: 'rounded-lg bg-slate-950/70 p-2' }, h('dt', { className: 'text-[9px] font-black uppercase tracking-wide text-slate-400' }, 'Current envelope'), h('dd', { className: 'mt-1 text-[10px] font-bold text-white' }, geometryPhysicalSize.label)),
                  h('div', { className: 'rounded-lg bg-slate-950/70 p-2' }, h('dt', { className: 'text-[9px] font-black uppercase tracking-wide text-slate-400' }, 'Suggested envelope'), h('dd', { className: 'mt-1 text-[10px] font-bold text-white' }, geometryScaleRecommendation.recommendedPhysicalSize.label)),
                  h('div', { className: 'rounded-lg bg-slate-950/70 p-2' }, h('dt', { className: 'text-[9px] font-black uppercase tracking-wide text-slate-400' }, 'Scale reduction'), h('dd', { className: 'mt-1 text-[10px] font-bold text-white' }, geometryScaleRecommendation.reductionPercent + '%'))
                ),
                geometryScaleRecommendation.canFit && h('details', { className: 'mt-3 rounded-lg border border-cyan-800 bg-slate-950/50 px-3', 'data-geometry-scale-math': 'true' },
                  h('summary', { className: 'flex min-h-[40px] cursor-pointer items-center text-[11px] font-black text-cyan-100' }, 'How this scale was calculated'),
                  h('div', { className: 'pb-3 text-[10px] leading-5 text-cyan-100' },
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
                  'aria-label': 'Alternative 90-degree model orientation',
                  'data-geometry-orientation-advice': geometryOrientationAdvice.currentScaleFitsRotated ? 'preserve-scale' : 'improve-scale'
                },
                  h('strong', { className: 'block text-xs' }, 'A 90-degree turn may fit better'),
                  h('p', { className: 'mt-1 text-[11px] leading-5 text-violet-100' }, geometryOrientationAdvice.currentScaleFitsRotated
                    ? 'At the current ' + geometryOrientationAdvice.suggestedUnitMm + ' mm per block, a 90-degree horizontal turn in the school slicer would use an envelope of ' + geometryOrientationAdvice.rotatedPhysicalSize.label + ' and fit the selected planning envelope.'
                    : 'A 90-degree horizontal turn could allow up to ' + geometryOrientationAdvice.rotatedMaximumUnitMm + ' mm per block instead of ' + geometryOrientationAdvice.currentMaximumUnitMm + ' mm per block, a ' + geometryOrientationAdvice.improvementPercent + '% larger fit scale. At that scale, the rotated envelope would be ' + geometryOrientationAdvice.rotatedPhysicalSize.label + '.'),
                  h('p', { className: 'mt-2 text-[10px] leading-5 text-violet-200' }, 'This is an orientation option, not an automatic fix. Print Lab has not rotated or rewritten the STL. Rotate it in the receiving slicer, then confirm bed placement, supports, clearance, and the slicer preview before printing.')
                ),
                geometryScaleRecommendation.canFit && h('button', {
                  type: 'button',
                  onClick: function () { applyUnitScale(geometryScaleRecommendation.recommendedUnitMm, 'Reduced Geometry World scale to ' + geometryScaleRecommendation.recommendedUnitMm + ' millimeters per block to preserve a ' + geometryScaleRecommendation.clearanceMm + ' millimeter planning clearance. Run preflight again.'); },
                  'aria-label': 'Use suggested scale of ' + geometryScaleRecommendation.recommendedUnitMm + ' millimeters per Geometry World block',
                  className: 'mt-3 min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-xs font-black text-white hover:bg-cyan-700'
                }, 'Use ' + geometryScaleRecommendation.recommendedUnitMm + ' mm / block')
              ),
              h('p', { className: 'mt-2 text-[11px] leading-5 text-amber-100' }, format === 'STL' ? 'STL does not store units. Confirm this value and orientation again in the school slicer.' : format === 'GLB' ? 'GLB scene units and node transforms vary by exporter. Minecraft and other sources still need a deliberate target size.' : 'Recipe units are design units, not automatic millimeters.'),
              h('button', { type: 'button', onClick: function () { chooseTab('Preflight'); }, className: 'mt-3 min-h-[42px] w-full rounded-xl bg-emerald-700 px-4 text-xs font-black text-white' }, 'Continue to Preflight')
            )
          )
        );
      }

      function preflightPanel() {
        return h('div', { className: 'grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]' },
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'print-profile-title' },
            h('h2', { id: 'print-profile-title', className: 'text-base font-black text-white' }, 'School printer profile'),
            h('p', { className: 'mt-1 text-xs text-slate-300' }, 'Use the receiving printer’s actual build area. These values are not machine settings.'),
            h('div', { className: 'mt-3 space-y-2' },
              field('Bed width (mm)', profile.bedWidthMm, function (v) { setProfileField('bedWidthMm', v); }, { type: 'number', min: 50, max: 1000, step: 1 }),
              field('Bed depth (mm)', profile.bedDepthMm, function (v) { setProfileField('bedDepthMm', v); }, { type: 'number', min: 50, max: 1000, step: 1 }),
              field('Build height (mm)', profile.bedHeightMm, function (v) { setProfileField('bedHeightMm', v); }, { type: 'number', min: 50, max: 1000, step: 1 }),
              field('Planning clearance (mm)', geometryPlanningClearanceMm, function (v) { setProfileField('planningClearanceMm', v); }, { type: 'number', min: 0, max: 50, step: 1 }),
              field('Nozzle diameter (mm)', profile.nozzleMm, function (v) { setProfileField('nozzleMm', v); }, { type: 'number', min: 0.1, max: 2, step: 0.05 })
            ),
            h('p', { className: 'mt-2 text-[10px] leading-5 text-slate-400' }, 'Planning clearance is a conservative advisory buffer removed from both sides of each profile dimension. Adjust it for clips, purge lines, and local procedures; it is not a machine setting.'),
            geometryPhysicalSize && geometryPrinterFit && h('div', {
              className: 'mt-3 rounded-xl border p-3 ' + (geometryClearanceFit ? 'border-emerald-700 bg-emerald-950/30 text-emerald-100' : 'border-amber-600 bg-amber-950/30 text-amber-100'),
              role: 'region',
              'aria-live': 'polite',
              'aria-label': 'Geometry World printer fit in Preflight',
              'data-geometry-preflight-fit': geometryClearanceFit ? 'true' : 'false'
            },
              h('strong', { className: 'block text-xs' }, geometryClearanceFit ? 'Geometry World scale fits this profile' : 'Geometry World scale needs attention'),
              h('p', { className: 'mt-1 text-[11px] leading-5' }, 'Model envelope: ' + geometryPhysicalSize.label + '. Printer profile: ' + geometryPrinterFit.profileLabel + '.'),
              h('p', { className: 'mt-1 text-[10px] leading-5 opacity-90' }, geometryClearanceFit
                ? 'Includes the preferred ' + geometryPlanningClearanceMm + ' mm planning clearance. Profile changes update this check immediately; slicer and staff review remain required.'
                : geometryScaleRecommendation && geometryScaleRecommendation.canFit
                  ? 'Suggested scale: ' + geometryScaleRecommendation.recommendedUnitMm + ' mm per block, producing approximately ' + geometryScaleRecommendation.recommendedPhysicalSize.label + '. This assumes the current orientation.'
                  : 'Revise the model or choose a different printer profile before running preflight.'),
              geometryOrientationAdvice && h('div', {
                className: 'mt-2 rounded-lg border border-violet-500/70 bg-violet-950/35 p-2 text-violet-100',
                role: 'note',
                'data-geometry-preflight-orientation': geometryOrientationAdvice.currentScaleFitsRotated ? 'preserve-scale' : 'improve-scale'
              },
                h('strong', { className: 'block text-[11px]' }, 'Orientation option'),
                h('p', { className: 'mt-1 text-[10px] leading-5' }, geometryOrientationAdvice.currentScaleFitsRotated
                  ? 'A 90-degree turn in the school slicer may preserve the current ' + geometryOrientationAdvice.suggestedUnitMm + ' mm per block scale; its rotated envelope would be ' + geometryOrientationAdvice.rotatedPhysicalSize.label + '.'
                  : 'A 90-degree turn in the school slicer may permit up to ' + geometryOrientationAdvice.rotatedMaximumUnitMm + ' mm per block instead of ' + geometryOrientationAdvice.currentMaximumUnitMm + ' mm per block; at that scale its rotated envelope would be ' + geometryOrientationAdvice.rotatedPhysicalSize.label + '.'),
                h('p', { className: 'mt-1 text-[10px] leading-5 text-violet-200' }, 'Print Lab has not rotated the STL. Make the turn in the receiving slicer, then recheck bed placement, supports, clearance, and the slicer preview before printing.')
              ),
              !geometryClearanceFit && geometryScaleRecommendation && geometryScaleRecommendation.canFit && h('button', {
                type: 'button',
                onClick: function () { applyUnitScale(geometryScaleRecommendation.recommendedUnitMm, 'Applied the Geometry World safe-fit scale of ' + geometryScaleRecommendation.recommendedUnitMm + ' millimeters per block. Run advisory preflight when ready.'); },
                'aria-label': 'Apply suggested Geometry World scale of ' + geometryScaleRecommendation.recommendedUnitMm + ' millimeters per block',
                className: 'mt-2 min-h-[42px] w-full rounded-lg bg-cyan-700 px-3 text-xs font-black text-white hover:bg-cyan-700'
              }, 'Apply ' + geometryScaleRecommendation.recommendedUnitMm + ' mm / block')
            ),
            h('button', { type: 'button', disabled: !runtimeReady || (format === 'RECIPE' ? !recipe : !fileBytes), onClick: runPreflight, className: 'mt-3 min-h-[44px] w-full rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50' }, 'Run advisory preflight'),
            h('div', { className: 'mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3', 'aria-labelledby': 'repair-title' },
              h('h3', { id: 'repair-title', className: 'text-sm font-black text-white' }, 'Analyze & Repair'),
              h('p', { className: 'mt-1 text-[11px] leading-5 text-slate-300' }, 'STL repair only welds near-identical vertices and removes degenerate triangles. It does not fill holes, boolean-union shells, remesh, test wall thickness, or certify safety.'),
              h('button', { type: 'button', disabled: format !== 'STL' || !fileBytes, onClick: createRepairCandidate, className: 'mt-2 min-h-[42px] w-full rounded-lg border border-amber-500 px-3 text-xs font-black text-amber-100 disabled:opacity-50' }, 'Create conservative repair candidate'),
              repairResult && repairResult.ok && h('div', { className: 'mt-2 space-y-2 text-[11px] text-slate-200' },
                h('p', null, 'Removed ', repairResult.removedDegenerateTriangles, ' degenerate triangle(s); welded ', repairResult.weldedVertexReferences, ' near-identical vertex reference(s). Not a watertightness claim.'),
                h('button', { type: 'button', onClick: useRepairCandidate, className: 'min-h-[40px] w-full rounded-lg bg-amber-700 px-3 font-black text-white' }, 'Use repaired candidate locally'),
                h('button', { type: 'button', onClick: downloadRepairCandidate, className: 'min-h-[40px] w-full rounded-lg border border-amber-500 px-3 font-black text-amber-100' }, 'Download repaired candidate')
              )
            )
          ),
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'preflight-report-title' },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('h2', { id: 'preflight-report-title', className: 'text-base font-black text-white' }, 'Preflight report'),
              report && h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (report.status === 'FAIL' ? 'bg-rose-800 text-white' : report.status === 'WARN' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-700 text-white') }, report.status)
            ),
            !report && h('p', { className: 'mt-3 rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-300' }, 'Run preflight after choosing the model and physical scale.'),
            report && h('div', { className: 'mt-3 space-y-3' },
              h('dl', { className: 'grid gap-2 sm:grid-cols-2 xl:grid-cols-4' },
                [['Width', report.dimensionsMm && report.dimensionsMm.width, 'mm'], ['Depth', report.dimensionsMm && report.dimensionsMm.depth, 'mm'], ['Height', report.dimensionsMm && report.dimensionsMm.height, 'mm'], ['Triangles', report.triangleCount, '']].map(function (row) { return h('div', { key: row[0], className: 'rounded-xl bg-slate-950 p-3' }, h('dt', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-400' }, row[0]), h('dd', { className: 'mt-1 text-lg font-black text-white' }, row[1] == null ? '—' : row[1] + (row[2] ? ' ' + row[2] : ''))); })
              ),
              h('ul', { className: 'space-y-2', 'aria-label': 'Preflight findings' }, (report.issues || []).map(function (item, index) { return h('li', { key: item.code + index, className: 'rounded-xl border p-3 text-xs leading-5 ' + (item.severity === 'ERROR' ? 'border-rose-700 bg-rose-950/30 text-rose-100' : 'border-amber-600 bg-amber-950/20 text-amber-100') }, h('strong', null, item.severity + ': '), item.message); })),
              !(report.issues || []).length && h('p', { className: 'rounded-xl border border-emerald-700 bg-emerald-950/30 p-3 text-xs text-emerald-100' }, 'No blocking condition was found by these limited checks.')
            ),
            h('div', { className: 'mt-4 rounded-xl border border-cyan-800 bg-cyan-950/30 p-3 text-xs leading-5 text-cyan-100' },
              h('strong', null, 'Advisory, not certification. '),
              'Print Lab does not prove wall thickness, self-intersection repair, support success, material suitability, or machine safety. A trained staff member must inspect the sliced result before accepting a request.'
            )
          )
        );
      }

      function materialsPanel() {
        return h('div', { className: 'space-y-4' },
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'materials-science-title' },
            h('h2', { id: 'materials-science-title', className: 'text-lg font-black text-white' }, 'Materials are systems, not labels'),
            h('p', { className: 'mt-1 max-w-4xl text-sm leading-6 text-slate-300' }, 'Compare performance, print conditions, waste, expected lifetime, additives, and the disposal route that actually exists. Reducing size, avoiding failed prints, repairing designs, and reusing parts usually matter before changing a material name.'),
            h('div', { className: 'mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3' }, MATERIALS.map(function (item) { return h('button', { key: item.id, type: 'button', onClick: function () { if (item.id !== materialId) invalidateManufacturingEvidence({ clearReport: false, clearRepair: false }); setMaterialId(item.id); persist({ materialId: item.id }); }, 'aria-pressed': materialId === item.id ? 'true' : 'false', className: 'min-h-[150px] rounded-2xl border p-4 text-left ' + (materialId === item.id ? 'border-cyan-300 bg-cyan-950/50' : 'border-slate-700 bg-slate-950') }, h('span', { className: 'block text-base font-black text-white' }, item.name), h('span', { className: 'mt-2 block text-xs leading-5 text-slate-200' }, item.summary), h('span', { className: 'mt-2 block text-[11px] leading-5 text-amber-100' }, item.lifecycle)); }))
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
              h('p', { className: 'text-[10px] font-black uppercase tracking-wide text-slate-400' }, chosenMaterial.name + ' estimate'),
              h('p', { className: 'mt-2 text-3xl font-black text-white' }, materialEstimate ? materialEstimate.estimatedGrams + ' g' : 'Slicer needed'),
              h('p', { className: 'mt-2 text-[11px] leading-5 text-slate-300' }, materialEstimate ? 'Upper-bound educational estimate; overlapping primitive parts can overstate volume.' : 'Imported mesh reports in this pilot do not estimate solid volume reliably enough to quote material.'),
              h('p', { className: 'mt-3 text-[11px] leading-5 text-amber-100' }, 'Follow the printer manufacturer, filament manufacturer, school ventilation/enclosure, supervision, burn, moving-parts, and post-processing procedures. This tool does not replace them.')
            )
          )
        );
      }

      function submitPanel() {
        return h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]' },
          h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'submission-details-title' },
            h('h2', { id: 'submission-details-title', className: 'text-lg font-black text-white' }, 'Prepare a staff-review handoff'),
            h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'Describe the object, not the student. Do not enter a full name, email, student ID, or other personal information. The package is not a purchase and does not deduct points.'),
            h('div', { className: 'mt-3 space-y-3' },
              field('Model title', title, function (value) { cancelOperation('handoff'); setTitle(value); persist({ title: safeText(value, 100) }); }),
              h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'What is it for?'), h('textarea', { value: description, maxLength: 500, rows: 3, onChange: function (event) { cancelOperation('handoff'); setDescription(event.target.value); persist({ description: safeText(event.target.value, 500) }); }, className: 'w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white' })),
              h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Design note for the reviewer'), h('textarea', { value: studentNote, maxLength: 300, rows: 3, onChange: function (event) { cancelOperation('handoff'); setStudentNote(event.target.value); persist({ studentNote: safeText(event.target.value, 300) }); }, className: 'w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white' })),
              h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'AI participation'), h('select', { value: aiUse, onChange: function (event) { cancelOperation('handoff'); setAiUse(event.target.value); persist({ aiUse: event.target.value }); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-500 bg-slate-950 px-3 text-white' }, h('option', { value: 'NONE' }, 'No AI assistance'), h('option', { value: 'ASSISTED' }, 'AI assisted part of the design'), h('option', { value: 'MOSTLY_AI' }, 'AI created most of the starting geometry'))),
              aiUse !== 'NONE' && h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Explain the AI contribution'), h('textarea', { value: aiDisclosure, maxLength: 300, rows: 2, onChange: function (event) { cancelOperation('handoff'); setAiDisclosure(event.target.value); persist({ aiDisclosure: safeText(event.target.value, 300) }); }, className: 'w-full rounded-lg border border-slate-500 bg-slate-950 p-3 text-sm text-white' }))
            ),
            h('div', { className: 'mt-5 rounded-2xl border border-violet-700 bg-slate-950 p-4', 'aria-labelledby': 'job-ticket-title' },
              h('h3', { id: 'job-ticket-title', className: 'text-base font-black text-white' }, 'Job Ticket'),
              h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'First slice in the approved school slicer, then import its comments. Print Lab reads metadata comments only: it never interprets or executes G-code commands.'),
              h('label', { className: 'mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-violet-500 px-4 text-xs font-black text-violet-100' }, 'Import local G-code comment metadata', h('input', { type: 'file', accept: '.gcode,.gco,.gc,text/x-gcode', className: 'sr-only', onChange: importGcodeMetadata })),
              gcodeMetadata && h('dl', { className: 'mt-3 grid gap-2 text-xs sm:grid-cols-2' }, [['Slicer', gcodeMetadata.slicer || 'Not named'], ['Time', Math.round(gcodeMetadata.estimatedTimeSeconds / 60) + ' min'], ['Filament', gcodeMetadata.filamentGrams ? gcodeMetadata.filamentGrams + ' g' : gcodeMetadata.filamentLengthMm ? gcodeMetadata.filamentLengthMm + ' mm' : 'Mass not reported'], ['Layers', gcodeMetadata.layerCount || 'Not reported']].map(function (row) { return h('div', { key: row[0], className: 'rounded-lg bg-slate-900 p-2' }, h('dt', { className: 'text-slate-400' }, row[0]), h('dd', { className: 'font-bold text-white' }, row[1])); })),
              gcodeMetadata && !gcodeMetadata.filamentGrams && h('p', { className: 'mt-2 rounded-lg border border-amber-600 bg-amber-950/30 p-2 text-[11px] leading-5 text-amber-100' }, gcodeMetadata.filamentLengthMm ? 'This metadata reports filament length but not mass. Re-export from the approved slicer with filament grams enabled before creating a ticket.' : 'This metadata does not report filament mass. Re-export from the approved slicer with filament grams enabled before creating a ticket.'),
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
                h('p', { className: 'text-[11px] text-slate-300' }, 'Includes base, setup, material, time, complexity, minimum, and rounding rules. It is not a charge until staff approves it.')
              ),
              h('label', { className: 'mt-3 flex min-h-[40px] items-center gap-2 text-xs text-slate-200' }, h('input', { type: 'checkbox', checked: materialReviewed, onChange: function (event) { setMaterialReviewed(event.target.checked); clearJobArtifacts(); } }), 'Reviewer confirmed the exact material selection'),
              h('label', { className: 'flex min-h-[40px] items-center gap-2 text-xs text-slate-200' }, h('input', { type: 'checkbox', checked: profileReviewed, onChange: function (event) { setProfileReviewed(event.target.checked); clearJobArtifacts(); } }), 'Reviewer confirmed the receiving printer profile'),
              h('button', { type: 'button', disabled: !gcodeEvidenceCurrent || !quoteMaterial || !materialReviewed || !profileReviewed || !report || report.status === 'FAIL', onClick: createJobTicket, className: 'mt-2 min-h-[44px] w-full rounded-xl bg-violet-700 px-4 text-sm font-black text-white disabled:opacity-50' }, 'Create alloflow-print-job/1 ticket'),
              jobTicket && h('button', { type: 'button', onClick: downloadJobTicket, className: 'mt-2 min-h-[44px] w-full rounded-xl border border-violet-400 px-4 text-sm font-black text-violet-100' }, 'Download Job Ticket'),
              h('p', { className: 'mt-2 text-[11px] leading-5 text-amber-100' }, 'The ticket includes a deterministic SHA-256 digest of its normalized payload, excluding the integrity field. It can reveal later edits, but it is not a signature, authenticity proof, staff authorization, or server approval. It contains no commands, credentials, account identifier, or student identifier and does not authorize a physical print.')
            )
          ),
          h('aside', { className: 'space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'handoff-summary-title' },
            h('h2', { id: 'handoff-summary-title', className: 'text-base font-black text-white' }, 'Handoff summary'),
            h('dl', { className: 'space-y-2 text-xs' },
              [['Format', format], ['Preflight', report ? report.status : 'Not run'], ['Scale', unitMm + ' mm per unit'], ['Material study', chosenMaterial.name], ['Model bytes embedded', 'No'], ['School Rewards asset', rewardsAssetCompatibility.compatible ? (rewardsAssetCompatibility.needsAsset ? rewardsAssetSizeLabel + ' ready' : 'Recipe included') : rewardsAssetSizeLabel + ' too large']].map(function (row) { return h('div', { key: row[0], className: 'flex justify-between gap-3 border-b border-slate-800 pb-2' }, h('dt', { className: 'text-slate-400' }, row[0]), h('dd', { className: 'text-right font-bold text-white' }, row[1])); })
            ),
            h('p', { className: 'rounded-xl border border-cyan-800 bg-cyan-950/30 p-3 text-[11px] leading-5 text-cyan-100' }, 'The .alloflow-print.json file contains the design recipe when applicable, a generic source-file label, a content hash, scale declaration, AI disclosure, and the advisory report. It contains no account identifier and performs no network submission.'),
            !rewardsAssetCompatibility.compatible && h('div', { className: 'rounded-xl border border-amber-500 bg-amber-950/35 p-3 text-[11px] leading-5 text-amber-100', role: 'alert', 'data-school-rewards-asset-ready': 'false' },
              h('strong', { className: 'block text-xs text-white' }, 'Reduce the model before opening School Rewards'),
              h('p', { className: 'mt-1' }, rewardsAssetCompatibility.reason + ' Current local file: ' + rewardsAssetSizeLabel + '; portal maximum: 4 MiB. The 5 MiB local inspection allowance is intentionally larger so staff can inspect and simplify a borderline file without uploading it.')
            ),
            h('button', { type: 'button', disabled: !title.trim() || !report || report.status === 'FAIL', onClick: downloadHandoff, className: 'min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-sm font-black text-white disabled:opacity-50' }, 'Download review handoff'),
            rewardsPortalUrl && h('button', { type: 'button', disabled: !rewardsAssetCompatibility.compatible, 'data-school-rewards-asset-ready': rewardsAssetCompatibility.compatible ? 'true' : 'false', onClick: function () { try { var popup = window.open(rewardsPortalUrl, '_blank', 'noopener,noreferrer'); if (popup) popup.opener = null; } catch (_) { announce('The School Rewards portal could not open.'); } }, className: 'min-h-[44px] w-full rounded-xl border border-emerald-400 bg-emerald-950/30 px-4 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-400' }, 'Open School Rewards portal'),
            !rewardsPortalUrl && h('p', { className: 'text-[11px] leading-5 text-slate-300' }, 'Connect the Google Education School Rewards portal in AlloFlow Project Settings to open it directly from this step.'),
            h('button', { type: 'button', disabled: !report || report.status === 'FAIL', onClick: exportStl, className: 'min-h-[44px] w-full rounded-xl border border-cyan-400 px-4 text-sm font-black text-cyan-100 disabled:opacity-50' }, 'Optional STL export'),
            h('p', { className: 'text-[11px] leading-5 text-amber-100' }, 'The receiving school workflow must pair the handoff with the original GLB/STL when needed, verify the content hash, inspect the slicer preview, approve a point quote, and only then create a store request.'),
            h('section', { className: 'rounded-xl border border-emerald-700 bg-slate-950 p-3', 'aria-labelledby': 'simulator-title' },
              h('h3', { id: 'simulator-title', className: 'text-sm font-black text-white' }, 'Simulator'),
              h('p', { className: 'mt-1 text-[11px] leading-5 text-slate-300' }, 'Practice queue, telemetry, and two-printer capacity planning locally. OctoPrint, Moonraker, PrusaLink, Bambu, CuraEngine, PrusaSlicer, OrcaSlicer, boolean/remesh, wall-thickness, and text-to-mesh adapters remain disabled.'),
              h('button', { type: 'button', disabled: !jobTicket, onClick: queueSimulation, className: 'mt-2 min-h-[40px] w-full rounded-lg bg-emerald-700 px-3 text-xs font-black text-white disabled:opacity-50' }, 'Queue in simulator'),
              h('button', { type: 'button', disabled: !simulatorJobKey, onClick: advanceSimulation, className: 'mt-2 min-h-[40px] w-full rounded-lg border border-emerald-500 px-3 text-xs font-black text-emerald-100 disabled:opacity-50' }, 'Advance simulated telemetry'),
              h('button', { type: 'button', disabled: !jobTicket, onClick: planCapacity, className: 'mt-2 min-h-[40px] w-full rounded-lg border border-cyan-500 px-3 text-xs font-black text-cyan-100 disabled:opacity-50' }, 'Plan 3-copy / 2-printer example'),
              simulatorSnapshot && simulatorJobKey && h('p', { className: 'mt-2 text-xs font-bold text-white' }, 'Simulated state: ', simulatorSnapshot.jobs[simulatorJobKey] && simulatorSnapshot.jobs[simulatorJobKey].state),
              simulatedSchedule && h('p', { className: 'mt-2 text-[11px] text-slate-300' }, simulatedSchedule.assignments.length + ' simulated assignment(s); ' + simulatedSchedule.unscheduled.length + ' unscheduled.')
            )
          )
        );
      }

      var panel = activeTab === 'Design' ? designPanel() : activeTab === 'Preflight' ? preflightPanel() : activeTab === 'Materials' ? materialsPanel() : submitPanel();
      return h('div', { className: 'mx-auto max-w-7xl space-y-4 rounded-3xl bg-slate-950 p-3 text-slate-100 sm:p-5', 'data-print-lab': 'true' },
        h('header', { className: 'rounded-2xl border border-cyan-800 bg-gradient-to-br from-cyan-950 via-slate-900 to-violet-950 p-5' },
          h('p', { className: 'text-[11px] font-black uppercase tracking-[.18em] text-cyan-300' }, 'Additive manufacturing studio'),
          h('h1', { className: 'mt-1 text-2xl font-black text-white' }, 'Print Lab'),
          h('p', { className: 'mt-2 max-w-4xl text-sm leading-6 text-slate-200' }, 'Shape a model, understand its physical scale and material tradeoffs, and prepare evidence for a staff-reviewed print request. Nothing here spends points or starts a printer.')
        ),
        h('nav', { role: 'tablist', 'aria-label': 'Print Lab workflow', className: 'grid grid-cols-2 gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 sm:grid-cols-4' }, TABS.map(function (name, index) {
          var lower = name.toLowerCase(), selected = activeTab === name;
          return h('button', { key: name, id: 'print-lab-tab-' + lower, type: 'button', role: 'tab', 'aria-selected': selected ? 'true' : 'false', 'aria-controls': 'print-lab-panel-' + lower, tabIndex: selected ? 0 : -1, onKeyDown: function (event) { onTabKey(event, index); }, onClick: function () { chooseTab(name); }, className: 'min-h-[44px] rounded-xl px-3 text-sm font-black ' + (selected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-200') }, (index + 1) + '. ' + name);
        })),
        h('div', { id: 'print-lab-panel-' + activeTab.toLowerCase(), role: 'tabpanel', 'aria-labelledby': 'print-lab-tab-' + activeTab.toLowerCase() }, panel),
        h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-slate-200' }, status)
      );
    }
  });
})();
