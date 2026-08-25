// AlloFlow STEM Lab — Print Lab
// Client-only preparation workspace for primitive recipes, GLB, and STL.
(function () {
  'use strict';

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('printLab')) return;

  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var MAX_GCODE_BYTES = 25 * 1024 * 1024;
  var TABS = ['Design', 'Preflight', 'Materials', 'Submit'];
  var SHAPES = ['box', 'sphere', 'cylinder', 'cone', 'torus'];
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
      return normalizer && typeof normalizer.normalizeRecipe === 'function' ? normalizer.normalizeRecipe(candidate) : JSON.parse(JSON.stringify(candidate));
    } catch (_) { return null; }
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

  window.StemLab.printLabPure = {
    MAX_FILE_BYTES: MAX_FILE_BYTES,
    MAX_GCODE_BYTES: MAX_GCODE_BYTES,
    TABS: TABS.slice(),
    SHAPES: SHAPES.slice(),
    MATERIALS: MATERIALS.map(function (item) { return Object.assign({}, item); }),
    allowedFile: allowedFile,
    allowedGcodeFile: allowedGcodeFile,
    sourceExtension: sourceExtension,
    normalizeRewardsPortalUrl: normalizeRewardsPortalUrl,
    normalizePersistedRecipe: normalizePersistedRecipe
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
      var initialRecipe = normalizePersistedRecipe(stored.recipe);
      var initialFormat = initialRecipe ? 'RECIPE' : 'RECIPE';
      var _tab = React.useState(TABS.indexOf(stored.activeTab) >= 0 ? stored.activeTab : 'Design'), activeTab = _tab[0], setActiveTab = _tab[1];
      var _ready = React.useState(!!(window.AlloModules && window.AlloModules.PrintableModel && window.AlloModules.Prim3D)), runtimeReady = _ready[0], setRuntimeReady = _ready[1];
      var _runtimeError = React.useState(''), runtimeError = _runtimeError[0], setRuntimeError = _runtimeError[1];
      var _format = React.useState(initialFormat), format = _format[0], setFormat = _format[1];
      var _recipe = React.useState(initialRecipe), recipe = _recipe[0], setRecipe = _recipe[1];
      var _bytes = React.useState(null), fileBytes = _bytes[0], setFileBytes = _bytes[1];
      var _glb = React.useState(null), glbRoot = _glb[0], setGlbRoot = _glb[1];
      var _sourceName = React.useState(''), sourceName = _sourceName[0], setSourceName = _sourceName[1];
      var _hash = React.useState(''), contentHash = _hash[0], setContentHash = _hash[1];
      var _unit = React.useState(clamp(stored.unitMm, 0.01, 1000, 20)), unitMm = _unit[0], setUnitMm = _unit[1];
      var _report = React.useState(stored.preflight || null), report = _report[0], setReport = _report[1];
      var _status = React.useState('Model files stay on this device until you deliberately download a handoff.'), status = _status[0], setStatus = _status[1];
      var _revision = React.useState(0), revision = _revision[0], setRevision = _revision[1];
      var _subject = React.useState(''), aiSubject = _subject[0], setAiSubject = _subject[1];
      var _refine = React.useState(''), aiRefinement = _refine[0], setAiRefinement = _refine[1];
      var _busy = React.useState(false), aiBusy = _busy[0], setAiBusy = _busy[1];
      var _title = React.useState(stored.title || ''), title = _title[0], setTitle = _title[1];
      var _description = React.useState(stored.description || ''), description = _description[0], setDescription = _description[1];
      var _note = React.useState(stored.studentNote || ''), studentNote = _note[0], setStudentNote = _note[1];
      var _aiUse = React.useState(stored.aiUse || 'NONE'), aiUse = _aiUse[0], setAiUse = _aiUse[1];
      var _aiDisclosure = React.useState(stored.aiDisclosure || ''), aiDisclosure = _aiDisclosure[0], setAiDisclosure = _aiDisclosure[1];
      var _profile = React.useState(stored.profile || { name: 'School printer', bedWidthMm: 220, bedDepthMm: 220, bedHeightMm: 250, nozzleMm: 0.4, maxTriangles: 250000, maxBytes: MAX_FILE_BYTES }), profile = _profile[0], setProfile = _profile[1];
      var _material = React.useState(stored.materialId || 'PLA'), materialId = _material[0], setMaterialId = _material[1];
      var _infill = React.useState(clamp(stored.infillPercent, 0, 100, 20)), infillPercent = _infill[0], setInfillPercent = _infill[1];
      var _support = React.useState(clamp(stored.supportPercent, 0, 200, 10)), supportPercent = _support[0], setSupportPercent = _support[1];
      var _saved = React.useState(''), selectedSaved = _saved[0], setSelectedSaved = _saved[1];
      var _repair = React.useState(null), repairResult = _repair[0], setRepairResult = _repair[1];
      var _gcode = React.useState(null), gcodeMetadata = _gcode[0], setGcodeMetadata = _gcode[1];
      var _gcodeHash = React.useState(''), gcodeMetadataHash = _gcodeHash[0], setGcodeMetadataHash = _gcodeHash[1];
      var _ticket = React.useState(null), jobTicket = _ticket[0], setJobTicket = _ticket[1];
      var _profileReviewed = React.useState(false), profileReviewed = _profileReviewed[0], setProfileReviewed = _profileReviewed[1];
      var _materialReviewed = React.useState(false), materialReviewed = _materialReviewed[0], setMaterialReviewed = _materialReviewed[1];
      var defaultQuoteConfig = { basePoints: 5, setupPoints: 5, pointsPerGram: 2, pointsPerHour: 4, complexityMultiplier: 1, complexityPoints: 0, roundingIncrement: 1, minimumPoints: 10, estimatedMinutes: 0 };
      var _quoteConfig = React.useState(Object.assign({}, defaultQuoteConfig, stored.quoteConfig || {})), quoteConfig = _quoteConfig[0], setQuoteConfig = _quoteConfig[1];
      var _simulator = React.useState(null), simulatorSnapshot = _simulator[0], setSimulatorSnapshot = _simulator[1];
      var _simJob = React.useState(''), simulatorJobKey = _simJob[0], setSimulatorJobKey = _simJob[1];
      var _schedule = React.useState(null), simulatedSchedule = _schedule[0], setSimulatedSchedule = _schedule[1];
      var simulatorRef = React.useRef(null);

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
        return function () { if (glbRoot) disposeObject(glbRoot, true); };
      }, [glbRoot]);

      function announce(message) {
        setStatus(message);
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(message);
      }

      function clearJobArtifacts() {
        setJobTicket(null); setSimulatorSnapshot(null); setSimulatorJobKey(''); setSimulatedSchedule(null); simulatorRef.current = null;
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

      function replaceDesign(nextFormat, nextRecipe, nextBytes, nextRoot, nextName, nextUnit, nextReport, nextHash) {
        setFormat(nextFormat); setRecipe(nextRecipe || null); setFileBytes(nextBytes || null); setGlbRoot(nextRoot || null); setSourceName(nextName || '');
        setUnitMm(nextUnit); setReport(nextReport || null); setContentHash(nextHash || ''); setRevision(function (value) { return value + 1; });
        setRepairResult(null); clearJobArtifacts();
        persist({ recipe: nextFormat === 'RECIPE' ? nextRecipe : null, unitMm: nextUnit, preflight: nextReport || null });
      }

      function updateRecipe(next) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        var clean = P3D ? P3D.normalizeRecipe(next) : next;
        setRecipe(clean); setFormat('RECIPE'); setFileBytes(null); setGlbRoot(null); setSourceName(''); setReport(null); setContentHash('');
        setRepairResult(null); clearJobArtifacts();
        setRevision(function (value) { return value + 1; });
        persist({ recipe: clean, unitMm: unitMm, preflight: null });
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
        setUnitMm(20); updateRecipe(clean); setTitle(clean.name || selectedSaved); announce('Loaded “' + selectedSaved + '” from Geometry Sandbox.');
      }

      function runPreflight() {
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable) { announce('The inspection engine is still loading.'); return null; }
        var next = format === 'RECIPE' ? Printable.inspectRecipe(recipe, unitMm, profile)
          : format === 'STL' ? Printable.inspectStl(fileBytes, unitMm, profile)
          : Printable.inspectGlb(fileBytes, unitMm, profile);
        if (format === 'GLB' && glbRoot) next = inspectObjectCapabilities(glbRoot, next);
        setReport(next); persist({ preflight: next, profile: profile, unitMm: unitMm });
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
        Printable.sha256Hex(bytes).then(function (hash) {
          replaceDesign('STL', null, bytes, null, 'repaired-model.stl', unitMm, repairResult.report, hash);
          announce('The conservative repair candidate is now the local working copy. Its analysis remains advisory.');
        }).catch(function () { announce('The repaired candidate hash could not be calculated.'); });
      }

      function downloadRepairCandidate() {
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable || !repairResult || !repairResult.ok || !repairResult.buffer) return;
        downloadBlob(new Blob([repairResult.buffer], { type: 'model/stl' }), Printable.safeFilename(title || 'student-model') + '-conservative-repair.stl');
        announce('Downloaded the conservative repair candidate. It is not certified watertight or ready to print.');
      }

      function setProfileField(key, value) {
        var next = Object.assign({}, profile); next[key] = Number(value); setProfile(next); setProfileReviewed(false); setReport(null); clearJobArtifacts(); persist({ profile: next, preflight: null });
      }

      function importFile(event) {
        var file = event.target.files && event.target.files[0]; event.target.value = '';
        var accepted = allowedFile(file); if (!accepted.ok) { announce(accepted.message); return; }
        if (!runtimeReady) { announce('The local inspection engine is still loading.'); return; }
        var Printable = window.AlloModules.PrintableModel, P3D = window.AlloModules.Prim3D;
        announce('Reading ' + accepted.format + ' locally…');
        readBytes(file).then(function (bytes) {
          return Printable.sha256Hex(bytes).then(function (hash) { return { bytes: bytes, hash: hash }; });
        }).then(function (loaded) {
          var bytes = loaded.bytes, hash = loaded.hash;
          if (accepted.format === 'RECIPE') {
            var parsed;
            try { parsed = JSON.parse(utf8(bytes)); } catch (_) { parsed = null; }
            var candidate = parsed && parsed.recipe ? parsed.recipe : parsed;
            var clean = P3D.normalizeRecipe(candidate);
            if (!clean) throw new Error('The JSON file does not contain a supported primitive recipe.');
            var recipeReport = Printable.inspectRecipe(clean, 20, profile);
            return Printable.sha256Hex(JSON.stringify(clean)).then(function (normalizedHash) {
              replaceDesign('RECIPE', clean, null, null, '', 20, recipeReport, normalizedHash);
              setTitle(clean.name || safeText(file.name.replace(/\.json$/i, ''), 100));
            });
          } else if (accepted.format === 'STL') {
            var stlReport = Printable.inspectStl(bytes, 1, profile);
            replaceDesign('STL', null, bytes, null, file.name, 1, stlReport, hash);
          } else {
            var glbReport = Printable.inspectGlb(bytes, 10, profile);
            if (hasBlockingIssue(glbReport)) { replaceDesign('GLB', null, bytes, null, file.name, 10, glbReport, hash); return null; }
            return ensureThree().then(function (THREE) { return parseGlb(THREE, bytes); }).then(function (root) {
              glbReport = inspectObjectCapabilities(root, glbReport);
              replaceDesign('GLB', null, bytes, root, file.name, 10, glbReport, hash);
            });
          }
          return null;
        }).then(function () {
          announce('Import inspected locally. Confirm scale and review Preflight before submitting.');
        }).catch(function (error) {
          announce(error && error.message ? error.message : 'The model could not be imported.');
        });
      }

      function importGcodeMetadata(event) {
        var file = event.target.files && event.target.files[0]; event.target.value = '';
        var accepted = allowedGcodeFile(file); if (!accepted.ok) { announce(accepted.message); return; }
        var Printable = window.AlloModules && window.AlloModules.PrintableModel;
        if (!Printable) { announce('The local metadata reader is still loading.'); return; }
        announce('Reading allowlisted G-code comments locally. Toolpath commands will not be interpreted.');
        readBytes(file).then(function (bytes) {
          var parsed = Printable.parseGcodeMetadata(bytes);
          if (!parsed.ok) throw new Error(parsed.errors.join(' '));
          return Printable.hashGcodeMetadata(parsed.value).then(function (hash) { return { value: parsed.value, hash: hash }; });
        }).then(function (result) {
          setGcodeMetadata(result.value); setGcodeMetadataHash(result.hash); clearJobArtifacts();
          if (result.value.estimatedTimeSeconds > 0) {
            var next = Object.assign({}, quoteConfig, { estimatedMinutes: Math.round(result.value.estimatedTimeSeconds / 6) / 10 });
            setQuoteConfig(next); persist({ quoteConfig: next });
          }
          announce('Slicer comment metadata imported locally. No G-code command was stored or executed.');
        }).catch(function (error) { announce(error && error.message ? error.message : 'G-code comment metadata could not be read.'); });
      }

      function callRecipeAi(kind) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        if (!P3D || typeof ctx.callGemini !== 'function') { announce('AI assistance is not configured. Manual primitive tools remain available.'); return; }
        var prompt = kind === 'refine' ? P3D.buildRefinePrompt(recipe, aiRefinement) : P3D.buildRecipePrompt(aiSubject);
        if ((kind === 'refine' && !aiRefinement.trim()) || (kind !== 'refine' && !aiSubject.trim())) { announce('Describe what you want the modeling assistant to do.'); return; }
        setAiBusy(true); announce(kind === 'refine' ? 'Preparing an AI-assisted revision…' : 'Preparing an AI-assisted primitive recipe…');
        Promise.resolve(ctx.callGemini(prompt, false, false, 0.5)).then(function (response) {
          var next = P3D.parseRecipe(aiText(response));
          if (!next) throw new Error('The modeling response did not contain a valid primitive recipe.');
          updateRecipe(next); setTitle(next.name || title); setAiUse('ASSISTED');
          if (!aiDisclosure) setAiDisclosure(kind === 'refine' ? 'AI helped revise a primitive-based model from my instruction.' : 'AI proposed a primitive-based starting model that I reviewed and can edit.');
          announce('AI-assisted recipe ready. Review every part and run Preflight.');
        }).catch(function (error) { announce(error && error.message ? error.message : 'AI modeling was unavailable.'); }).then(function () { setAiBusy(false); });
      }

      var chosenMaterial = materialById(materialId);
      var Printable = window.AlloModules && window.AlloModules.PrintableModel;
      var materialEstimate = Printable && report && Number(report.volumeMm3UpperBound) > 0
        ? Printable.estimateMaterial(report, { densityGPerCm3: chosenMaterial.density, infillPercent: infillPercent, supportPercent: supportPercent }) : null;
      var slicerMaterial = gcodeMetadata && gcodeMetadata.filamentGrams > 0 ? { estimatedGrams: gcodeMetadata.filamentGrams, method: 'reviewed-slicer-comment' } : null;
      var quoteMaterial = slicerMaterial || materialEstimate;
      var pointQuote = Printable && quoteMaterial ? Printable.estimatePointQuote(quoteMaterial, quoteConfig) : null;

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
        if (!gcodeMetadata || !gcodeMetadataHash) { announce('Import comment metadata from the approved school slicer before creating a job ticket.'); return; }
        if (!quoteMaterial || !(Number(quoteMaterial.estimatedGrams) > 0)) { announce('The reviewed slicer handoff must include a positive material mass in grams before creating a job ticket.'); return; }
        if (!profileReviewed || !materialReviewed) { announce('Confirm the reviewed material and printer profile first.'); return; }
        currentModelHash().then(function (hash) {
          return Printable.createPrintJobTicket({
            modelHash: hash, sourceFormat: format, unitDeclaration: format === 'RECIPE' ? '1 recipe unit = ' + unitMm + ' mm' : '1 source unit = ' + unitMm + ' mm', dimensionsMm: report.dimensionsMm,
            material: { key: materialId, name: chosenMaterial.name, densityGPerCm3: chosenMaterial.density, reviewed: true },
            printerProfile: Object.assign({ key: 'reviewed-school-profile', reviewed: true }, profile),
            advisoryEstimate: { materialGrams: quoteMaterial.estimatedGrams, printMinutes: quoteConfig.estimatedMinutes, pointQuote: pointQuote && pointQuote.totalPoints, method: quoteMaterial.method || 'staff-review-required' },
            gcodeMetadataHash: gcodeMetadataHash, createdAt: new Date().toISOString()
          });
        }).then(function (ticket) { setJobTicket(ticket); setSimulatorSnapshot(null); setSimulatorJobKey(''); setSimulatedSchedule(null); simulatorRef.current = null; announce('Created a privacy-minimized local job ticket. It contains no G-code commands and does not authorize printing.'); })
          .catch(function (error) { announce(error && error.message ? error.message : 'The job ticket could not be created.'); });
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
        var hashPromise = contentHash ? Promise.resolve(contentHash) : Printable.sha256Hex(format === 'RECIPE' ? JSON.stringify(recipe || {}) : fileBytes);
        hashPromise.then(function (hash) {
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
        }).catch(function (error) { announce(error && error.message ? error.message : 'The handoff could not be created.'); });
      }

      function exportStl() {
        if (!Printable || !report || report.status === 'FAIL') { chooseTab('Preflight'); announce('Run preflight and resolve blocking items before exporting STL.'); return; }
        ensureThree().then(function (THREE) {
          var object = makeModelObject(THREE, format, recipe, fileBytes, glbRoot, unitMm);
          if (!object) throw new Error('There is no model ready to export.');
          centerAndGround(THREE, object);
          var buffer = Printable.exportBinaryStl(THREE, object);
          disposeObject(object, false);
          if (!buffer) throw new Error('The model did not contain exportable triangles.');
          downloadBlob(new Blob([buffer], { type: 'model/stl' }), Printable.safeFilename(title || 'student-model') + '.stl');
          announce('STL exported. Re-open it in the school’s slicer to confirm orientation, supports, scale, and machine settings.');
        }).catch(function (error) { announce(error && error.message ? error.message : 'STL export was unavailable.'); });
      }

      function field(label, value, onChange, options) {
        options = options || {};
        return h('label', { className: 'block text-[11px] font-bold text-slate-200' },
          h('span', { className: 'mb-1 block' }, label),
          h('input', { type: options.type || 'text', value: value, min: options.min, max: options.max, step: options.step, onChange: function (event) { onChange(event.target.value); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white' })
        );
      }

      function renderPart(part, index) {
        var P3D = window.AlloModules && window.AlloModules.Prim3D;
        return h('fieldset', { key: 'part-' + index, className: 'rounded-xl border border-slate-700 bg-slate-950/70 p-3' },
          h('legend', { className: 'px-1 text-xs font-black text-cyan-200' }, 'Part ' + (index + 1)),
          h('div', { className: 'grid gap-2 md:grid-cols-4' },
            h('label', { className: 'text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Shape'), h('select', { value: part.shape, onChange: function (event) { patchPart(index, { shape: event.target.value }); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-600 bg-slate-950 px-2 text-white' }, SHAPES.map(function (shape) { return h('option', { key: shape, value: shape }, shape); }))),
            [0, 1, 2].map(function (axis) { return field('Size ' + ['X / radius', 'Y / height', 'Z / depth'][axis], part.size[axis], function (value) { var next = part.size.slice(); next[axis] = Number(value); patchPart(index, { size: next }); }, { type: 'number', min: 0.02, max: 4, step: 0.05 }); })
          ),
          h('div', { className: 'mt-2 grid gap-2 md:grid-cols-4' },
            [0, 1, 2].map(function (axis) { return field('Position ' + ['X', 'Y', 'Z'][axis], part.position[axis], function (value) { var next = part.position.slice(); next[axis] = Number(value); patchPart(index, { position: next }); }, { type: 'number', min: axis === 1 ? -4 : -4, max: axis === 1 ? 8 : 4, step: 0.05 }); }),
            h('label', { className: 'text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Color'), h('input', { type: 'color', value: part.color, onChange: function (event) { patchPart(index, { color: event.target.value }); }, className: 'h-[42px] w-full rounded-lg border border-slate-600 bg-slate-950 p-1' }))
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
              h('label', { className: 'mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-sky-700 px-4 text-xs font-black text-white' }, 'Choose RECIPE / GLB / STL', h('input', { type: 'file', accept: '.json,.glb,.stl,application/json,model/gltf-binary,model/stl', className: 'sr-only', onChange: importFile })),
              sourceName && h('p', { className: 'mt-2 text-xs text-slate-300' }, 'Loaded locally: ', h('strong', { className: 'text-white' }, sourceName), '. The downloaded handoff substitutes a generic file name and a content hash.'),
              savedNames.length > 0 && h('div', { className: 'mt-3 flex flex-wrap items-end gap-2' },
                h('label', { className: 'min-w-[220px] text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Saved Geometry Sandbox sculpture'), h('select', { value: selectedSaved, onChange: function (event) { setSelectedSaved(event.target.value); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-600 bg-slate-950 px-2 text-white' }, h('option', { value: '' }, 'Choose a saved sculpture'), savedNames.map(function (name) { return h('option', { key: name, value: name }, name); }))),
                h('button', { type: 'button', disabled: !selectedSaved, onClick: importSavedRecipe, className: 'min-h-[42px] rounded-xl border border-cyan-500 px-4 text-xs font-black text-cyan-100 disabled:opacity-50' }, 'Open in Print Lab')
              )
            )
          ),
          h('div', { className: 'space-y-4' },
            h(PrintPreview, { React: React, ready: runtimeReady, format: format, recipe: recipe, bytes: fileBytes, glbRoot: glbRoot, unitMm: unitMm, revision: revision }),
            h('section', { className: 'rounded-2xl border border-slate-700 bg-slate-900 p-4' },
              h('h2', { className: 'text-sm font-black text-white' }, 'Physical scale'),
              field('Millimeters per model unit', unitMm, function (value) { var next = clamp(value, 0.01, 1000, unitMm); setUnitMm(next); setReport(null); clearJobArtifacts(); setRevision(function (v) { return v + 1; }); persist({ unitMm: next, preflight: null }); }, { type: 'number', min: 0.01, max: 1000, step: 0.1 }),
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
              field('Nozzle diameter (mm)', profile.nozzleMm, function (v) { setProfileField('nozzleMm', v); }, { type: 'number', min: 0.1, max: 2, step: 0.05 })
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
              report && h('span', { className: 'rounded-full px-3 py-1 text-xs font-black ' + (report.status === 'FAIL' ? 'bg-rose-800 text-white' : report.status === 'WARN' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-600 text-white') }, report.status)
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
            h('div', { className: 'mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3' }, MATERIALS.map(function (item) { return h('button', { key: item.id, type: 'button', onClick: function () { setMaterialId(item.id); setMaterialReviewed(false); clearJobArtifacts(); persist({ materialId: item.id }); }, 'aria-pressed': materialId === item.id ? 'true' : 'false', className: 'min-h-[150px] rounded-2xl border p-4 text-left ' + (materialId === item.id ? 'border-cyan-300 bg-cyan-950/50' : 'border-slate-700 bg-slate-950') }, h('span', { className: 'block text-base font-black text-white' }, item.name), h('span', { className: 'mt-2 block text-xs leading-5 text-slate-200' }, item.summary), h('span', { className: 'mt-2 block text-[11px] leading-5 text-amber-100' }, item.lifecycle)); }))
          ),
          h('section', { className: 'grid gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 lg:grid-cols-[minmax(0,1fr)_320px]', 'aria-labelledby': 'material-estimate-title' },
            h('div', null,
              h('h2', { id: 'material-estimate-title', className: 'text-base font-black text-white' }, 'Advisory material estimate'),
              h('p', { className: 'mt-1 text-xs leading-5 text-slate-300' }, 'This is a learning estimate from primitive volume, infill, density, and a support allowance. The receiving slicer determines the real toolpath, time, supports, and mass.'),
              h('div', { className: 'mt-3 grid gap-3 sm:grid-cols-2' },
                field('Infill (%)', infillPercent, function (value) { var next = clamp(value, 0, 100, 20); setInfillPercent(next); clearJobArtifacts(); persist({ infillPercent: next }); }, { type: 'number', min: 0, max: 100, step: 1 }),
                field('Support allowance (%)', supportPercent, function (value) { var next = clamp(value, 0, 200, 10); setSupportPercent(next); clearJobArtifacts(); persist({ supportPercent: next }); }, { type: 'number', min: 0, max: 200, step: 1 })
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
              field('Model title', title, function (value) { setTitle(value); persist({ title: safeText(value, 100) }); }),
              h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'What is it for?'), h('textarea', { value: description, maxLength: 500, rows: 3, onChange: function (event) { setDescription(event.target.value); persist({ description: safeText(event.target.value, 500) }); }, className: 'w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white' })),
              h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Design note for the reviewer'), h('textarea', { value: studentNote, maxLength: 300, rows: 3, onChange: function (event) { setStudentNote(event.target.value); persist({ studentNote: safeText(event.target.value, 300) }); }, className: 'w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white' })),
              h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'AI participation'), h('select', { value: aiUse, onChange: function (event) { setAiUse(event.target.value); persist({ aiUse: event.target.value }); }, className: 'min-h-[42px] w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-white' }, h('option', { value: 'NONE' }, 'No AI assistance'), h('option', { value: 'ASSISTED' }, 'AI assisted part of the design'), h('option', { value: 'MOSTLY_AI' }, 'AI created most of the starting geometry'))),
              aiUse !== 'NONE' && h('label', { className: 'block text-[11px] font-bold text-slate-200' }, h('span', { className: 'mb-1 block' }, 'Explain the AI contribution'), h('textarea', { value: aiDisclosure, maxLength: 300, rows: 2, onChange: function (event) { setAiDisclosure(event.target.value); persist({ aiDisclosure: safeText(event.target.value, 300) }); }, className: 'w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white' }))
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
              h('button', { type: 'button', disabled: !gcodeMetadata || !gcodeMetadataHash || !quoteMaterial || !materialReviewed || !profileReviewed || !report || report.status === 'FAIL', onClick: createJobTicket, className: 'mt-2 min-h-[44px] w-full rounded-xl bg-violet-700 px-4 text-sm font-black text-white disabled:opacity-50' }, 'Create alloflow-print-job/1 ticket'),
              jobTicket && h('button', { type: 'button', onClick: downloadJobTicket, className: 'mt-2 min-h-[44px] w-full rounded-xl border border-violet-400 px-4 text-sm font-black text-violet-100' }, 'Download Job Ticket'),
              h('p', { className: 'mt-2 text-[11px] leading-5 text-amber-100' }, 'The ticket includes a deterministic SHA-256 digest of its normalized payload, excluding the integrity field. It can reveal later edits, but it is not a signature, authenticity proof, staff authorization, or server approval. It contains no commands, credentials, account identifier, or student identifier and does not authorize a physical print.')
            )
          ),
          h('aside', { className: 'space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4', 'aria-labelledby': 'handoff-summary-title' },
            h('h2', { id: 'handoff-summary-title', className: 'text-base font-black text-white' }, 'Handoff summary'),
            h('dl', { className: 'space-y-2 text-xs' },
              [['Format', format], ['Preflight', report ? report.status : 'Not run'], ['Scale', unitMm + ' mm per unit'], ['Material study', chosenMaterial.name], ['Model bytes embedded', 'No']].map(function (row) { return h('div', { key: row[0], className: 'flex justify-between gap-3 border-b border-slate-800 pb-2' }, h('dt', { className: 'text-slate-400' }, row[0]), h('dd', { className: 'text-right font-bold text-white' }, row[1])); })
            ),
            h('p', { className: 'rounded-xl border border-cyan-800 bg-cyan-950/30 p-3 text-[11px] leading-5 text-cyan-100' }, 'The .alloflow-print.json file contains the design recipe when applicable, a generic source-file label, a content hash, scale declaration, AI disclosure, and the advisory report. It contains no account identifier and performs no network submission.'),
            h('button', { type: 'button', disabled: !title.trim() || !report || report.status === 'FAIL', onClick: downloadHandoff, className: 'min-h-[44px] w-full rounded-xl bg-cyan-700 px-4 text-sm font-black text-white disabled:opacity-50' }, 'Download review handoff'),
            rewardsPortalUrl && h('button', { type: 'button', onClick: function () { try { var popup = window.open(rewardsPortalUrl, '_blank', 'noopener,noreferrer'); if (popup) popup.opener = null; } catch (_) { announce('The School Rewards portal could not open.'); } }, className: 'min-h-[44px] w-full rounded-xl border border-emerald-400 bg-emerald-950/30 px-4 text-sm font-black text-emerald-100' }, 'Open School Rewards portal'),
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
