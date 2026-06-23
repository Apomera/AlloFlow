/* stem_tool_geologyexplorer.js — Geology Explorer
 *
 * An immersive voxel cross-section of the crust (three.js r128), sibling to
 * Geometry World but focused on geology. One scene teaches: superposition
 * (deeper sedimentary = older), cross-cutting (a younger granite pluton cuts the
 * layers), contact metamorphism (a baked aureole), depth -> temperature/pressure,
 * and where the rock cycle restarts (magma). Graduated from the
 * docs/geology_explorer_spike.html prototype.
 *
 * Hooks-safety: every hook is declared unconditionally at the top of render();
 * the THREE-not-ready / WebGL-failure branches choose the VISUAL only (never an
 * early return before a hook) — avoids the throwlab/optics "more hooks" crash.
 *
 * a11y: the 3D canvas is an ENHANCEMENT. The accessible core is an always-present
 * cross-section (SVG) + a keyboard-navigable strata list; selecting a rock there
 * shows the same info and announces it via a live region. So screen-reader and
 * keyboard-only users — and anyone whose WebGL fails — get the full tool.
 */
(function () {
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
  if (window.StemLab.isRegistered && window.StemLab.isRegistered('geologyExplorer')) return;

  var ENGINE_KEY = '__alloGeologyEngine';

  // ── Geology model (colours are illustrative, not photographic) ──────────────
  var ROCKS = {
    soil:      { name: 'Soil / Regolith',   type: 'Surface',             color: 0x6b4f2a, formation: 'Weathered rock + organic matter at the very surface.',                            minerals: 'Clay, quartz grains, organics', age: 'Youngest — forming today.' },
    sandstone: { name: 'Sandstone',         type: 'Sedimentary',         color: 0xd9b27a, formation: 'Sand grains (rivers, dunes, beaches) buried, compacted, and cemented.',           minerals: 'Quartz, feldspar',              age: 'Sits on top, so the youngest sedimentary layer.' },
    shale:     { name: 'Shale',             type: 'Sedimentary',         color: 0x6e7681, formation: 'Mud and clay settled in calm water, compacted into thin layers.',                minerals: 'Clay minerals, mica',           age: 'Older than the sandstone above it (superposition).' },
    limestone: { name: 'Limestone',         type: 'Sedimentary',         color: 0xbcd4d6, formation: 'Shells and coral (calcium carbonate) built up in warm, shallow seas.',           minerals: 'Calcite',                       age: 'Oldest sedimentary layer — deposited first.' },
    basement:  { name: 'Granite basement',  type: 'Igneous (intrusive)', color: 0xc99ab8, formation: 'Magma that cooled SLOWLY deep underground -> large interlocking crystals.',       minerals: 'Quartz, feldspar, mica',        age: 'Ancient basement — older than the sediments resting on it.' },
    intrusion: { name: 'Granite pluton',    type: 'Igneous (intrusive)', color: 0xe75fb0, formation: 'A LATER pulse of magma forced up through the layers and froze in place.',        minerals: 'Quartz, feldspar, mica',        age: 'YOUNGER than the layers it cuts — the cross-cutting rule wins here.' },
    marble:    { name: 'Marble',            type: 'Metamorphic',         color: 0xe8e8ee, formation: 'Limestone BAKED by the nearby pluton (contact metamorphism) -> recrystallised.', minerals: 'Recrystallised calcite',        age: 'Re-cooked when the intrusion arrived.' },
    hornfels:  { name: 'Hornfels / Schist', type: 'Metamorphic',         color: 0x8a5a8a, formation: 'Shale baked + squeezed beside the pluton -> hard, sometimes garnet-bearing.',    minerals: 'Mica, garnet',                  age: 'Re-cooked when the intrusion arrived.' },
    magma:     { name: 'Magma chamber',     type: 'Molten',              color: 0xff7a33, formation: 'Molten rock — the source. It cools to igneous rock and the cycle restarts.',     minerals: '—',                             age: 'Active now — still forming.' },
    basalt:    { name: 'Basalt',            type: 'Igneous (extrusive)', color: 0x4a4a55, formation: 'Lava that ERUPTED and cooled FAST at the surface → crystals too tiny to see (the opposite of slow-cooled granite).', minerals: 'Plagioclase + pyroxene (fine-grained)', age: 'Newest rock — just erupted onto the surface.' }
  };
  var TYPE_COLOR = { 'Surface': '#92786a', 'Sedimentary': '#38bdf8', 'Igneous (intrusive)': '#ec4899', 'Igneous (extrusive)': '#f97316', 'Metamorphic': '#a78bfa', 'Molten': '#fb923c' };
  var ROCK_ORDER = ['soil', 'sandstone', 'shale', 'limestone', 'basement', 'magma', 'intrusion', 'marble', 'hornfels'];
  // Index fossils per depositional environment (illustrative). Sedimentary layers
  // record life; igneous/metamorphic/molten rock does not — melting and
  // metamorphism destroy fossils, which is exactly why we date sedimentary strata.
  var FOSSILS = {
    soil:      { icon: '🌱', name: 'Roots & recent shells',          tells: 'Forming today — too young to be an index fossil.' },
    sandstone: { icon: '🌿', name: 'Plant fossils & ripple marks',   tells: 'Point to rivers, deltas and dunes when the sand was laid down.' },
    shale:     { icon: '🦐', name: 'Trilobites & graptolites',       tells: 'Lived in calm, deeper water — classic index fossils for dating layers.' },
    limestone: { icon: '🐚', name: 'Brachiopods, crinoids & coral',  tells: 'Shelly sea-floor life — they mark a warm, shallow sea.' }
  };
  var SED_FOSSIL = { sandstone: 1, shale: 1, limestone: 1 }; // layers a fossil can be uncovered in (soil is too young)
  // Groundwater behaviour by rock — permeable layers store/transmit water (aquifers),
  // impermeable ones trap it (aquitards). The water table tops the saturated zone.
  var GROUNDWATER = {
    soil:      { perm: 'Porous',                    role: 'lets rain soak in from the surface' },
    sandstone: { perm: 'Permeable — aquifer',       role: 'connected pores store & transmit groundwater (wells tap this)' },
    shale:     { perm: 'Impermeable — aquitard',    role: 'tight clay traps water in the rock above it' },
    limestone: { perm: 'Permeable where fractured', role: 'cracks & caves carry water (karst aquifers)' },
    basement:  { perm: 'Impermeable',               role: 'solid crystalline rock blocks water unless fractured' },
    intrusion: { perm: 'Impermeable',               role: 'solid granite blocks water unless fractured' },
    marble:    { perm: 'Impermeable',               role: 'tight, recrystallised rock' },
    hornfels:  { perm: 'Impermeable',               role: 'baked, tight rock' },
    magma:     { perm: '—',                          role: 'molten rock — no groundwater here' },
    basalt:    { perm: 'Impermeable (unless vesicular/fractured)', role: 'dense lava rock; gas bubbles or cracks can let some water through' }
  };
  // ── Radiometric (absolute) dating — the numerical-age complement to the tool's
  // relative-dating story. Only IGNEOUS rock resets the clock as it crystallises;
  // sedimentary grains are older than their rock, so those are dated indirectly.
  // Half-lives are real (Ma = millions of years).
  var DATING = {
    basement:  { parent: 'Uranium-238', daughter: 'Lead-206', hl: 4470, note: 'Granite locks in uranium as it crystallises — the clock starts the moment it solidifies.' },
    intrusion: { parent: 'Uranium-238', daughter: 'Lead-206', hl: 4470, note: 'Dating the pluton tells you when this magma froze — so it post-dates the layers it cuts.' },
    basalt:    { parent: 'Potassium-40', daughter: 'Argon-40', hl: 1250, note: 'Erupted lava traps potassium; the argon it decays to builds up from zero as it ages.' }
  };
  var NX = 14, NY = 12, NZ = 14, KM_PER_VOXEL = 0.9;

  function rockKeyAt(x, y, z) {
    var cx = (NX - 1) / 2, cz = (NZ - 1) / 2;
    var r = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
    var intrusionR = 1.2 + (y / NY) * 2.6;
    if (y >= 3 && r < intrusionR) return 'intrusion';
    if (y >= 3 && y < NY - 1 && r < intrusionR + 1.05) return (y >= 6 && y <= 8) ? 'marble' : 'hornfels';
    if (y === 0) return 'soil';
    if (y <= 2) return 'sandstone';
    if (y <= 4) return 'shale';
    if (y <= 6) return 'limestone';
    if (y <= 9) return 'basement';
    return 'magma';
  }
  // deterministic: ~1/3 of sedimentary voxels host a fossil, so digging feels like discovery
  function hasFossilAt(x, y, z) { return (((x + 1) * 13 + (z + 1) * 7 + y * 5) % 3) === 0; }

  // A drill core: the vertical rock sequence at one (x,z), merged into bands.
  function computeCore(x, z) {
    var segs = [], prev = null;
    for (var y = 0; y < NY; y++) {
      var k = rockKeyAt(x, y, z);
      if (!prev || prev.key !== k) { prev = { key: k, y0: y, y1: y }; segs.push(prev); }
      else prev.y1 = y;
    }
    return segs;
  }
  // Three representative columns, each revealing a different principle when compared.
  var CORE_SITES = [
    { id: 'edge',   icon: '🪨', label: 'Layered edge',  x: 1, z: 1, blurb: 'Away from the pluton: the sedimentary layers stack up, oldest at the bottom (superposition).' },
    { id: 'rim',    icon: '🔥', label: 'Baked rim',     x: 9, z: 7, blurb: 'Beside the pluton, limestone & shale became marble & hornfels — contact metamorphism.' },
    { id: 'centre', icon: '⛏️', label: 'Pluton centre', x: 7, z: 7, blurb: 'The granite pluton cuts straight down through the layers to the magma (cross-cutting).' }
  ];
  function hex(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }
  function rockFacts(key, y) {
    var R = ROCKS[key];
    var depthKm = (y * KM_PER_VOXEL).toFixed(1);
    var tempC = key === 'magma' ? '≈ 1000+' : Math.round(15 + y * KM_PER_VOXEL * 25);
    var presMPa = Math.round(y * KM_PER_VOXEL * 27);
    return { key: key, R: R, depthKm: depthKm, tempC: tempC, presMPa: presMPa };
  }

  // Representative depth (voxel rows) for a rock picked from the list / cycle, so
  // its temperature & pressure read sensibly even when not picked in the 3D block.
  var DEPTH_GUESS = { soil: 0, sandstone: 2, shale: 4, limestone: 6, basement: 8, magma: 11, intrusion: 6, marble: 7, hornfels: 5, basalt: 0 };

  // ── The rock cycle as a graph ───────────────────────────────────────────────
  // For each rock: the real geological processes that act on it and what it
  // becomes. Lets a learner TRACE one rock around the cycle (it doesn't alter the
  // ground — it's a conceptual "what happens to this rock next?").
  var CYCLE = {
    magma:     [{ proc: 'Erupt & cool fast',     icon: '🌋', to: 'basalt',    note: 'Erupts at the surface and cools in seconds → fine-grained BASALT (extrusive).' },
                { proc: 'Cool slowly (trapped)', icon: '❄️', to: 'basement',  note: 'Trapped underground, slow cooling grows big crystals → GRANITE (intrusive).' }],
    basement:  [{ proc: 'Uplift & weather',   icon: '💧', to: 'soil',      note: 'Exposed at the surface, it breaks down into loose sediment.' },
                { proc: 'Heat + pressure',    icon: '🔥', to: 'hornfels',  note: 'Squeezed and baked without melting → metamorphic rock.' },
                { proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Deeply buried or subducted → back to molten.' }],
    intrusion: [{ proc: 'Uplift & weather',   icon: '💧', to: 'soil',      note: 'Exposed at the surface, it breaks down into loose sediment.' },
                { proc: 'Heat + pressure',    icon: '🔥', to: 'hornfels',  note: 'Baked without melting → metamorphic rock.' },
                { proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Deep heat melts it back to molten.' }],
    soil:      [{ proc: 'Bury, compact & cement', icon: '🧱', to: 'sandstone', note: 'Sediment is squeezed and glued into solid rock (lithification).' }],
    sandstone: [{ proc: 'Heat + pressure',    icon: '🔥', to: 'hornfels',  note: 'Recrystallises into a harder metamorphic rock.' },
                { proc: 'Weather & erode',    icon: '💧', to: 'soil',      note: 'Broken back down into loose sediment.' },
                { proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Deep heat melts it.' }],
    shale:     [{ proc: 'Heat + pressure',    icon: '🔥', to: 'hornfels',  note: 'Bakes and squeezes into hornfels / schist.' },
                { proc: 'Weather & erode',    icon: '💧', to: 'soil',      note: 'Broken back down into loose sediment.' },
                { proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Deep heat melts it.' }],
    limestone: [{ proc: 'Heat + pressure',    icon: '🔥', to: 'marble',    note: 'Recrystallises into marble.' },
                { proc: 'Weather & erode',    icon: '💧', to: 'soil',      note: 'Dissolves / breaks back down into sediment.' },
                { proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Deep heat melts it.' }],
    marble:    [{ proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Deep heat melts it → molten.' },
                { proc: 'Uplift & weather',   icon: '💧', to: 'soil',      note: 'Exposed and broken into sediment.' }],
    hornfels:  [{ proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Deep heat melts it → molten.' },
                { proc: 'Uplift & weather',   icon: '💧', to: 'soil',      note: 'Exposed and broken into sediment.' }],
    basalt:    [{ proc: 'Weather & erode',    icon: '💧', to: 'soil',      note: 'Breaks down at the surface into sediment.' },
                { proc: 'Heat + pressure',    icon: '🔥', to: 'hornfels',  note: 'Buried and baked → metamorphic rock.' },
                { proc: 'Melt',               icon: '🌋', to: 'magma',     note: 'Re-melts back to molten.' }]
  };

  // ── Formation history ───────────────────────────────────────────────────────
  // The chronological stage each rock appeared, so "Play history" can assemble the
  // cross-section in the order it actually formed — the synthesis of superposition
  // (sediments bottom-up), cross-cutting (pluton last) and contact metamorphism.
  var FORMED_AT = { basement: 0, magma: 0, limestone: 1, shale: 2, sandstone: 3, soil: 4, intrusion: 5, marble: 6, hornfels: 6 };
  var HISTORY = [
    { tk: 'stem.geology.hist0', fb: 'Starting point — an ancient granite basement above deep, molten magma.' },
    { tk: 'stem.geology.hist1', fb: '1 · A warm, shallow sea deposits LIMESTONE — the first and oldest sedimentary layer, so it ends up on the bottom.' },
    { tk: 'stem.geology.hist2', fb: '2 · Mud settles in calmer water and hardens into SHALE, resting on the older limestone.' },
    { tk: 'stem.geology.hist3', fb: '3 · Rivers and dunes pile up sand → SANDSTONE, the newest layer on top (superposition: youngest is highest).' },
    { tk: 'stem.geology.hist4', fb: '4 · Weathering breaks down the surface rock into SOIL.' },
    { tk: 'stem.geology.hist5', fb: '5 · A LATER pulse of magma forces up through every layer and freezes into a granite PLUTON — because it cuts the layers, it must be younger (cross-cutting).' },
    { tk: 'stem.geology.hist6', fb: '6 · The pluton’s heat bakes the rock it touches into a METAMORPHIC rim — marble from limestone, hornfels from shale (contact metamorphism).' }
  ];

  // ── Relative-dating quiz (active recall of the principles the tool teaches) ──
  var QUIZ = [
    { q: 'Which layer is OLDER?',                                              opts: ['Sandstone', 'Limestone'],                                              correct: 1, why: 'Limestone lies below the sandstone, and lower layers were laid down first — superposition.' },
    { q: 'Is the granite pluton older or younger than the shale it cuts?',      opts: ['Older', 'Younger'],                                                    correct: 1, why: 'A feature that cuts across another must be younger — cross-cutting. The pluton cuts the shale, so it came later.' },
    { q: 'How did the marble rim form?',                                        opts: ['Shells piled up in a sea', 'The pluton baked the limestone', 'A river dropped sand'], correct: 1, why: 'Marble is limestone recrystallised by the pluton’s heat — contact metamorphism.' },
    { q: 'Where would you expect to find fossils?',                             opts: ['In the granite pluton', 'In the shale', 'In the magma'],               correct: 1, why: 'Fossils form in sedimentary rock like shale; melting and metamorphism destroy them.' },
    { q: 'In a drill core, the OLDEST rock is…',                                opts: ['At the top', 'At the bottom'],                                          correct: 1, why: 'Layers stack oldest-first, so the deepest rock is the oldest — superposition.' }
  ];

  // ── Volcanic eruption narration (the extrusive-igneous story, staged) ──
  var ERUPT = [
    { fb: 'Pressure builds — dissolved gas and rising magma push up beneath the volcano.' },
    { fb: 'Magma climbs a conduit: a pipe of molten rock cutting straight to the surface.' },
    { fb: 'Eruption! Lava fountains from the vent and an ash plume billows skyward.' },
    { fb: 'Out in the air and on the ground, the lava cools in seconds → fine-grained BASALT (extrusive igneous) — crystals too small to see.' },
    { fb: 'Same magma, two fates: erupted = fast-cooled BASALT (tiny crystals); trapped underground = slow-cooled GRANITE (big crystals). A new volcanic layer forms — the rock cycle turns.' }
  ];

  // ── three.js engine (imperative; lives on window[ENGINE_KEY]) ───────────────
  function initEngine(container, opts) {
    var THREE = window.THREE;
    var eng = { disposed: false };
    var cnv = document.createElement('canvas');
    cnv.style.width = '100%'; cnv.style.height = '100%'; cnv.style.display = 'block';
    container.appendChild(cnv);
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    // subtle vertical-gradient sky (deep blue up top → near-black below) for depth
    var bgCanvas = document.createElement('canvas'); bgCanvas.width = 4; bgCanvas.height = 256;
    var bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) { var bgGrad = bgCtx.createLinearGradient(0, 0, 0, 256); bgGrad.addColorStop(0, '#13243f'); bgGrad.addColorStop(0.45, '#0a1322'); bgGrad.addColorStop(1, '#06080f'); bgCtx.fillStyle = bgGrad; bgCtx.fillRect(0, 0, 4, 256); }
    var bgTex = new THREE.CanvasTexture(bgCanvas);
    scene.background = bgTex;
    scene.fog = new THREE.Fog(0x0a1322, 30, 70);
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(NX * 1.15, NY * 1.05, NZ * 1.4);
    var controls = THREE.OrbitControls ? new THREE.OrbitControls(camera, renderer.domElement) : null;
    if (controls) { controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.set(0, -NY * 0.05, 0); controls.minDistance = 8; controls.maxDistance = 60; }
    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x6b5640, 0.55)); // sky-blue from above, warm ground-bounce below → dimensional shading
    var keyL = new THREE.DirectionalLight(0xfff1d0, 1.0); keyL.position.set(12, 20, 14); scene.add(keyL);
    var fillL = new THREE.DirectionalLight(0x90b4ff, 0.35); fillL.position.set(-14, 6, -10); scene.add(fillL);
    var magmaGlow = new THREE.PointLight(0xff5522, 1.8, 44); magmaGlow.position.set(0, -NY * 0.5, 0); scene.add(magmaGlow);
    // soft additive heat-glow radiating from beneath the crust (the magma source)
    var underGlowGeo = new THREE.SphereGeometry(3.6, 16, 12), underGlowMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
    var underGlow = new THREE.Mesh(underGlowGeo, underGlowMat); underGlow.position.set(0, -(NY - 1) / 2 - 1.6, 0); scene.add(underGlow);

    var voxels = [];
    for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) for (var z = 0; z < NZ; z++) voxels.push({ x: x, y: y, z: z, key: rockKeyAt(x, y, z), j: 0.87 + (((x * 41 + y * 71 + z * 13) % 100) / 100) * 0.26 });
    var removed = {};
    function vkey(v) { return v.x + ',' + v.y + ',' + v.z; }
    function worldPos(v) { return [(v.x - (NX - 1) / 2), ((NY - 1) / 2 - v.y), (v.z - (NZ - 1) / 2)]; }

    var geo = new THREE.BoxGeometry(1, 1, 1);
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05 });
    var mesh = new THREE.InstancedMesh(geo, mat, voxels.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    var dummy = new THREE.Object3D(), col = new THREE.Color(), WHITE = new THREE.Color(0xffffff);
    var instanceToVoxel = [];
    var sliceZ = 0, excavate = false, highlightKey = null, showStage = 99;
    var hoverBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)), new THREE.LineBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.85 }));
    hoverBox.visible = false; hoverBox.renderOrder = 2; scene.add(hoverBox);
    var treeMeshes = [], lastHover = 0;
    var WATER_Y = (NY - 1) / 2 - 1.8; // water table perched in the sandstone, above the shale
    var waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(NX, NZ), new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.4, roughness: 0.25, metalness: 0.15, side: THREE.DoubleSide }));
    waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(0, WATER_Y, 0); waterMesh.visible = false; waterMesh.renderOrder = 1; scene.add(waterMesh);

    // ── Volcano: the EXTRUSIVE counterpart to the intrusive pluton (erupt() animates it) ──
    var surfTopY = (NY - 1) / 2 + 0.5;   // world Y of the ground surface
    var ventY = surfTopY + 2.0;          // vent at the top of the cone
    var eruptT = -1, erupted = false;
    var volcano = new THREE.Group();
    var coneGeo = new THREE.ConeGeometry(2.3, 2.4, 24, 1, true);
    var coneMat = new THREE.MeshStandardMaterial({ color: 0x39323a, roughness: 0.95, metalness: 0.04, side: THREE.DoubleSide });
    var coneMesh = new THREE.Mesh(coneGeo, coneMat); coneMesh.position.set(0, surfTopY + 1.2, 0); volcano.add(coneMesh);
    var craterGeo = new THREE.SphereGeometry(0.6, 16, 12);
    var craterMat = new THREE.MeshStandardMaterial({ color: 0xff6a1e, emissive: 0xff4500, emissiveIntensity: 1.3, transparent: true, opacity: 0.0 });
    var craterGlow = new THREE.Mesh(craterGeo, craterMat); craterGlow.position.set(0, ventY - 0.25, 0); craterGlow.visible = false; volcano.add(craterGlow);
    var flowGeo = new THREE.ConeGeometry(3.0, 0.5, 24, 1, true);
    var flowMat = new THREE.MeshStandardMaterial({ color: 0x2c2630, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide });
    var lavaFlow = new THREE.Mesh(flowGeo, flowMat); lavaFlow.position.set(0, surfTopY + 0.26, 0); lavaFlow.visible = false; volcano.add(lavaFlow);
    var ventLight = new THREE.PointLight(0xff5a1e, 0.0, 22); ventLight.position.set(0, ventY, 0); ventLight.visible = false; volcano.add(ventLight);
    var LAVA_N = 70, lavaPos = new Float32Array(LAVA_N * 3), lavaVel = new Float32Array(LAVA_N * 3);
    var lavaGeo = new THREE.BufferGeometry(); lavaGeo.setAttribute('position', new THREE.BufferAttribute(lavaPos, 3));
    var lavaMat = new THREE.PointsMaterial({ color: 0xff7326, size: 0.42, transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending });
    var lavaPts = new THREE.Points(lavaGeo, lavaMat); lavaPts.visible = false; volcano.add(lavaPts);
    var ASH_N = 46, ashPos = new Float32Array(ASH_N * 3), ashVel = new Float32Array(ASH_N * 3);
    var ashGeo = new THREE.BufferGeometry(); ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    var ashMat = new THREE.PointsMaterial({ color: 0x6b6b73, size: 0.7, transparent: true, opacity: 0.0, depthWrite: false });
    var ashPts = new THREE.Points(ashGeo, ashMat); ashPts.visible = false; volcano.add(ashPts);
    scene.add(volcano);
    eng._volcanoDispose = [coneGeo, coneMat, craterGeo, craterMat, flowGeo, flowMat, lavaGeo, lavaMat, ashGeo, ashMat];
    function rnd() { return Math.random(); }
    function spawnLava(i) { lavaPos[i * 3] = (rnd() - 0.5) * 0.3; lavaPos[i * 3 + 1] = ventY - 0.1; lavaPos[i * 3 + 2] = (rnd() - 0.5) * 0.3; lavaVel[i * 3] = (rnd() - 0.5) * 0.17; lavaVel[i * 3 + 1] = 0.3 + rnd() * 0.36; lavaVel[i * 3 + 2] = (rnd() - 0.5) * 0.17; }
    function spawnAsh(i) { ashPos[i * 3] = (rnd() - 0.5) * 0.5; ashPos[i * 3 + 1] = ventY + rnd() * 0.5; ashPos[i * 3 + 2] = (rnd() - 0.5) * 0.5; ashVel[i * 3] = (rnd() - 0.5) * 0.06; ashVel[i * 3 + 1] = 0.07 + rnd() * 0.1; ashVel[i * 3 + 2] = (rnd() - 0.5) * 0.06; }
    function startEruption() {
      if (eruptT >= 0) return;
      eruptT = 0; var i;
      for (i = 0; i < LAVA_N; i++) spawnLava(i);
      for (i = 0; i < ASH_N; i++) spawnAsh(i);
      lavaPts.visible = true; ashPts.visible = true; ventLight.visible = true; craterGlow.visible = true;
      lavaGeo.attributes.position.needsUpdate = true; ashGeo.attributes.position.needsUpdate = true;
    }
    function updateEruption() {
      if (eruptT < 0) return;
      eruptT += 0.016;
      var fountain = eruptT < 5.0, ashing = eruptT < 6.2, i;
      for (i = 0; i < LAVA_N; i++) {
        lavaVel[i * 3 + 1] -= 0.019;
        lavaPos[i * 3] += lavaVel[i * 3]; lavaPos[i * 3 + 1] += lavaVel[i * 3 + 1]; lavaPos[i * 3 + 2] += lavaVel[i * 3 + 2];
        if (lavaPos[i * 3 + 1] < surfTopY) { if (fountain) spawnLava(i); else lavaPos[i * 3 + 1] = -999; }
      }
      for (i = 0; i < ASH_N; i++) {
        ashPos[i * 3] += ashVel[i * 3]; ashPos[i * 3 + 1] += ashVel[i * 3 + 1]; ashPos[i * 3 + 2] += ashVel[i * 3 + 2];
        ashVel[i * 3] *= 1.004; ashVel[i * 3 + 2] *= 1.004;
        if (ashPos[i * 3 + 1] > ventY + 8 || !ashing) { if (ashing) spawnAsh(i); else ashPos[i * 3 + 1] = -999; }
      }
      lavaGeo.attributes.position.needsUpdate = true; ashGeo.attributes.position.needsUpdate = true;
      var ramp = eruptT < 1 ? eruptT : (eruptT > 5 ? Math.max(0, (7 - eruptT) / 2) : 1);
      ventLight.intensity = 2.4 * ramp * (0.82 + 0.18 * Math.sin(t * 32));
      craterMat.opacity = 0.9 * ramp;
      ashMat.opacity = 0.5 * (eruptT < 6 ? Math.min(1, eruptT / 1.2) : Math.max(0, (7 - eruptT)));
      if (eruptT > 7.2) { eruptT = -1; lavaPts.visible = false; ashPts.visible = false; ventLight.visible = false; craterGlow.visible = false; erupted = true; lavaFlow.visible = true; }
    }

    function visible(v) { return !removed[vkey(v)] && v.z >= sliceZ && FORMED_AT[v.key] <= showStage; }
    function rebuild() {
      var i = 0; instanceToVoxel.length = 0;
      for (var k = 0; k < voxels.length; k++) {
        var v = voxels[k]; if (!visible(v)) continue;
        var p = worldPos(v); dummy.position.set(p[0], p[1], p[2]); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        col.setHex(ROCKS[v.key].color);
        col.multiplyScalar(v.j || 1);                     // per-voxel grain → natural, non-plastic rock texture
        if (v.key === 'magma') col.multiplyScalar(1.22);  // molten rock reads hotter / glowing
        // when a rock type is selected, make every voxel of that type glow and let
        // the rest recede — so its distribution through the crust pops out.
        if (highlightKey) { if (v.key === highlightKey) col.lerp(WHITE, 0.42); else col.multiplyScalar(0.5); }
        mesh.setColorAt(i, col);
        instanceToVoxel[i] = v; i++;
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      for (var ti = 0; ti < treeMeshes.length; ti++) { var tu = treeMeshes[ti].userData; treeMeshes[ti].visible = (tu.z >= sliceZ) && !removed[tu.x + ',0,' + tu.z] && (FORMED_AT.soil <= showStage); }
      volcano.visible = (FORMED_AT.soil <= showStage) && (sliceZ <= 7);
    }
    rebuild();

    // simple low-poly trees on the surface — a "this is the top, down is deep" cue
    (function buildSurface() {
      // trees — varied height + foliage colour + a layered top for a natural look (clear of the central volcano)
      var cells = [[2, 3], [4, 10], [10, 2], [11, 9], [1, 11], [12, 4], [3, 12], [12, 6], [1, 5]];
      var trunkGeo = new THREE.CylinderGeometry(0.08, 0.13, 0.55, 5), trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
      var leafGeo = new THREE.ConeGeometry(0.36, 0.82, 8);
      var leafMats = [new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: 0x4f9442, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: 0x357036, roughness: 0.8 })];
      for (var i = 0; i < cells.length; i++) {
        var x = cells[i][0], z = cells[i][1], p = worldPos({ x: x, y: 0, z: z });
        var sc = 0.78 + (((x * 13 + z * 7) % 10) / 10) * 0.5;
        var lm = leafMats[(x + z) % 3];
        var g = new THREE.Group();
        var trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 0.27;
        var leaf = new THREE.Mesh(leafGeo, lm); leaf.position.y = 0.82;
        var leaf2 = new THREE.Mesh(leafGeo, lm); leaf2.position.y = 1.18; leaf2.scale.set(0.68, 0.68, 0.68);
        g.add(trunk); g.add(leaf); g.add(leaf2); g.scale.set(sc, sc, sc);
        g.position.set(p[0], p[1] + 0.5, p[2]); g.userData = { x: x, z: z };
        scene.add(g); treeMeshes.push(g);
      }
      // boulders — a few scattered rocks for surface detail
      var rockGeo = new THREE.DodecahedronGeometry(0.32, 0), rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8576, roughness: 1.0, flatShading: true });
      var rockCells = [[6, 10], [1, 7], [10, 11]];
      for (var r = 0; r < rockCells.length; r++) {
        var rx = rockCells[r][0], rz = rockCells[r][1], rp = worldPos({ x: rx, y: 0, z: rz });
        var rs = 0.7 + (((rx * 5 + rz * 3) % 10) / 10) * 0.6;
        var rock = new THREE.Mesh(rockGeo, rockMat);
        rock.scale.set(rs, rs * 0.7, rs); rock.rotation.set(rx, rz, rx + rz);
        rock.position.set(rp[0], rp[1] + 0.6, rp[2]); rock.userData = { x: rx, z: rz };
        scene.add(rock); treeMeshes.push(rock);
      }
      eng._treeGeo = [trunkGeo, leafGeo, rockGeo]; eng._treeMat = [trunkMat, rockMat].concat(leafMats);
    })();

    var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), down = null;
    function shallowest(x, z) { for (var yy = 0; yy < NY; yy++) { if (!removed[x + ',' + yy + ',' + z]) return yy; } return null; }
    function pick(ev) {
      var rect = cnv.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObject(mesh); if (!hits.length) return;
      var v = instanceToVoxel[hits[0].instanceId]; if (!v) return;
      if (excavate) {
        var top = shallowest(v.x, v.z);
        if (v.y !== top) { if (opts.onFlash) opts.onFlash('Dig the layers above first — deeper = older (superposition).'); if (opts.onSelect) opts.onSelect(rockFacts(v.key, v.y)); return; }
        removed[vkey(v)] = 1; rebuild();
        if (opts.onUncover && SED_FOSSIL[v.key] && hasFossilAt(v.x, v.y, v.z)) opts.onUncover(v.key);
        var below = shallowest(v.x, v.z);
        if (below != null && opts.onSelect) opts.onSelect(rockFacts(rockKeyAt(v.x, below, v.z), below));
        if (opts.onFlash) opts.onFlash('Excavated ' + ROCKS[v.key].name + '. The layer beneath is now exposed.');
      } else {
        if (opts.onUncover && SED_FOSSIL[v.key] && hasFossilAt(v.x, v.y, v.z)) opts.onUncover(v.key);
        if (opts.onSelect) opts.onSelect(rockFacts(v.key, v.y));
      }
    }
    function onDown(e) { down = { x: e.clientX, y: e.clientY }; }
    function onUp(e) { if (!down) return; var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); down = null; if (moved < 6) pick(e); }
    cnv.addEventListener('pointerdown', onDown); cnv.addEventListener('pointerup', onUp);
    function onMoveHover(e) {
      if (down) { if (hoverBox.visible) hoverBox.visible = false; return; }
      var now = (window.performance && performance.now) ? performance.now() : 0;
      if (now - lastHover < 40) return; lastHover = now;
      var rect = cnv.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObject(mesh);
      if (hits.length) { var v = instanceToVoxel[hits[0].instanceId]; if (v) { var p = worldPos(v); hoverBox.position.set(p[0], p[1], p[2]); hoverBox.visible = true; return; } }
      hoverBox.visible = false;
    }
    function onLeaveHover() { hoverBox.visible = false; }
    cnv.addEventListener('pointermove', onMoveHover); cnv.addEventListener('pointerleave', onLeaveHover);
    function onLost(e) { e.preventDefault(); if (opts.onContextLost) opts.onContextLost(); }
    cnv.addEventListener('webglcontextlost', onLost, false);

    var lastW = 0, lastH = 0;
    function resize() { var w = container.clientWidth || 600, h = container.clientHeight || 420; lastW = w; lastH = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    resize();
    var ro = null; try { ro = new ResizeObserver(resize); ro.observe(container); } catch (e) {}
    eng.resize = function () { if (!eng.disposed) resize(); };

    var t = 0, raf = null;
    function loop() {
      if (eng.disposed) return; raf = requestAnimationFrame(loop); t += 0.016;
      if (container.clientWidth > 0 && (container.clientWidth !== lastW || container.clientHeight !== lastH)) resize(); // keep the canvas fitted to its container (robust in sandboxed iframes / late layout)
      magmaGlow.intensity = 1.9 + Math.sin(t * 2) * 0.4;
      magmaGlow.color.setRGB(1, 0.32 + Math.sin(t * 5) * 0.05, 0.13);            // subtle fire flicker
      underGlow.material.opacity = 0.15 + Math.sin(t * 1.7) * 0.05;              // pulsing deep-heat glow
      if (waterMesh.visible) waterMesh.material.opacity = 0.34 + Math.sin(t * 1.6) * 0.07; // water shimmer
      try { updateEruption(); } catch (e) {}
      if (controls) controls.update(); renderer.render(scene, camera);
    }
    loop();

    eng.setView = function (name) {
      if (!controls) return;
      var V = { iso: [[NX * 1.15, NY * 1.05, NZ * 1.4], [0, -NY * 0.18, 0]], front: [[0, -NY * 0.1, NZ * 1.75], [0, -NY * 0.18, 0]], top: [[0.01, NY * 2.4, 0.02], [0, 0, 0]] }[name];
      if (!V) return;
      camera.position.set(V[0][0], V[0][1], V[0][2]);
      controls.target.set(V[1][0], V[1][1], V[1][2]);
      controls.update();
    };
    eng.setSlice = function (z) { sliceZ = z | 0; waterMesh.scale.z = (NZ - sliceZ) / NZ; waterMesh.position.z = sliceZ / 2; rebuild(); };
    eng.setExcavate = function (b) { excavate = !!b; };
    eng.setWaterTable = function (b) { waterMesh.visible = !!b; };
    eng.erupt = function () { startEruption(); };
    eng.setHighlight = function (k) { highlightKey = (k && FORMED_AT[k] != null) ? k : null; rebuild(); };
    eng.setStage = function (n) { showStage = (n == null) ? 99 : n; rebuild(); };
    eng.reset = function () { removed = {}; sliceZ = 0; rebuild(); };
    eng.dispose = function () {
      eng.disposed = true; if (raf) cancelAnimationFrame(raf);
      cnv.removeEventListener('pointerdown', onDown); cnv.removeEventListener('pointerup', onUp); cnv.removeEventListener('webglcontextlost', onLost);
      cnv.removeEventListener('pointermove', onMoveHover); cnv.removeEventListener('pointerleave', onLeaveHover);
      if (ro) try { ro.disconnect(); } catch (e) {}
      try { geo.dispose(); mat.dispose(); renderer.dispose(); hoverBox.geometry.dispose(); hoverBox.material.dispose(); waterMesh.geometry.dispose(); waterMesh.material.dispose(); if (eng._treeGeo) eng._treeGeo.forEach(function (g) { g.dispose(); }); if (eng._treeMat) eng._treeMat.forEach(function (m) { m.dispose(); }); if (eng._volcanoDispose) eng._volcanoDispose.forEach(function (x) { x.dispose(); }); if (bgTex) bgTex.dispose(); underGlowGeo.dispose(); underGlowMat.dispose(); } catch (e) {}
      if (cnv.parentNode) cnv.parentNode.removeChild(cnv);
    };
    return eng;
  }

  window.StemLab.registerTool('geologyExplorer', {
    name: 'Geology Explorer',
    icon: '⛰️',
    category: 'explore',
    questHooks: [
      { id: 'identify_5', label: 'Identify 5 different rocks', icon: '🔍', check: function (d) { return Object.keys(d.identified || {}).length >= 5; }, progress: function (d) { return Math.min(Object.keys(d.identified || {}).length, 5) + '/5 rocks'; } },
      { id: 'reach_magma', label: 'Expose the magma chamber', icon: '🌋', check: function (d) { return !!(d.identified && d.identified.magma); }, progress: function (d) { return (d.identified && d.identified.magma) ? 'Found it!' : 'Dig / slice deep'; } },
      { id: 'find_intrusion', label: 'Find the cross-cutting pluton', icon: '⛏️', check: function (d) { return !!(d.identified && d.identified.intrusion); }, progress: function (d) { return (d.identified && d.identified.intrusion) ? 'Cross-cutting!' : 'Slice to the centre'; } },
      { id: 'fossils_3', label: 'Uncover an index fossil in all 3 sedimentary layers', icon: '🦴', check: function (d) { var f = d.fossils || {}; return f.sandstone && f.shale && f.limestone; }, progress: function (d) { var f = d.fossils || {}; return ['sandstone', 'shale', 'limestone'].filter(function (k) { return f[k]; }).length + '/3 layers'; } },
      { id: 'date_rock', label: 'Radiometrically date an igneous rock', icon: '📅', check: function (d) { return !!d.datedRock; }, progress: function (d) { return d.datedRock ? 'Dated!' : 'Pick granite/basalt → decay clock'; } }
    ],
    render: function (ctx) {
      var React = ctx.React, h = React.createElement;
      // Robust: fall back to the English default whenever the host's t() returns
      // nothing for a key (geology's stem.geology.* keys aren't in the lang packs
      // yet, and ctx.t returns undefined for a miss — which showed as "undefined").
      var t = function (k, fb) { var v; try { v = ctx.t ? ctx.t(k, fb) : null; } catch (e) {} return (v == null || v === '' || v === k) ? (fb != null ? fb : k) : v; };
      var isDark = ctx.isDark;
      var d = (ctx.toolData && ctx.toolData.geologyExplorer) || {};
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast || function () {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      function upd(key, val) { if (ctx.update) ctx.update('geologyExplorer', key, val); }

      // ── hooks (all unconditional) ──
      var containerRef = React.useRef(null);
      var fsRef = React.useRef(null);
      var fss = React.useState(false); var isFs = fss[0], setIsFs = fss[1];
      var dpp = React.useState(100); var datingParent = dpp[0], setDatingParent = dpp[1];
      var identifiedRef = React.useRef(d.identified || {}); identifiedRef.current = d.identified || {};
      var st = React.useState(false); var webglError = st[0], setWebglError = st[1];
      var ss = React.useState(null); var selected = ss[0], setSelected = ss[1];
      var slc = React.useState(0); var slice = slc[0], setSlice = slc[1];
      var exc = React.useState(false); var excavate = exc[0], setExcavate = exc[1];
      var cph = React.useState([]); var cyclePath = cph[0], setCyclePath = cph[1];
      var hst = React.useState(-1); var histStage = hst[0], setHistStage = hst[1];
      var histTimer = React.useRef(null);
      var fos = React.useState(d.fossils || {}); var found = fos[0], setFound = fos[1];
      var fossilsRef = React.useRef(found); fossilsRef.current = found;
      var cr = React.useState(null); var core = cr[0], setCore = cr[1];
      var qz = React.useState(false); var quizOn = qz[0], setQuizOn = qz[1];
      var qi = React.useState(0); var quizI = qi[0], setQuizI = qi[1];
      var qa = React.useState(null); var quizAns = qa[0], setQuizAns = qa[1];
      var wt = React.useState(false); var waterOn = wt[0], setWaterOn = wt[1];
      var erp = React.useState(-1); var eruptStage = erp[0], setEruptStage = erp[1];
      var eruptTimer = React.useRef(null);
      var threeReady = !!(ctx.toolData && ctx.toolData._threeLoaded) && !!window.THREE;

      function announce(msg) { try { var lr = document.getElementById('allo-live-geology'); if (lr) { lr.textContent = ''; setTimeout(function () { lr.textContent = String(msg || ''); }, 30); } } catch (e) {} }
      function selectRock(facts, viaCycle, msg) {
        setSelected(facts);
        setDatingParent(100);
        setCyclePath(function (prev) { return viaCycle ? prev.concat([facts.key]).slice(-6) : [facts.key]; });
        try { if (window[ENGINE_KEY]) window[ENGINE_KEY].setHighlight(facts.key); } catch (e) {}
        announce(msg || (facts.R.name + '. ' + facts.R.type + '. Depth about ' + facts.depthKm + ' kilometres. ' + facts.R.formation + ' ' + facts.R.age));
        var cur = identifiedRef.current || {}; if (!cur[facts.key]) { var id = Object.assign({}, cur); id[facts.key] = 1; upd('identified', id); }
      }
      function uncoverFossil(key) {
        var cur = fossilsRef.current || {}; if (cur[key]) return; // already collected this layer's fossil
        var nf = Object.assign({}, cur); nf[key] = 1; setFound(nf); upd('fossils', nf);
        var F = FOSSILS[key], rn = ROCKS[key] ? ROCKS[key].name : 'rock';
        addToast('✨ ' + (F ? F.name : 'Fossil') + ' uncovered in the ' + rn + '!', 'success');
        announce('You uncovered ' + (F ? F.name : 'a fossil') + ' in the ' + rn + '. ' + (F ? F.tells : ''));
      }
      function takeCore(site) {
        var segs = computeCore(site.x, site.z);
        setCore({ id: site.id, segs: segs, blurb: site.blurb });
        announce('Core sample, ' + site.label + '. Top to bottom: ' + segs.map(function (s) { return ROCKS[s.key].name; }).join(', ') + '. ' + site.blurb);
      }
      function answerQuiz(i) { setQuizAns(i); var Q = QUIZ[quizI]; announce((i === Q.correct ? 'Correct. ' : 'Not quite. ') + Q.why); }
      function nextQuiz() { var n = (quizI + 1) % QUIZ.length; setQuizI(n); setQuizAns(null); announce('Question ' + (n + 1) + '. ' + QUIZ[n].q); }

      // ── formation-history playback (assembles the crust in chronological order) ──
      function clearHistTimer() { if (histTimer.current) { clearTimeout(histTimer.current); histTimer.current = null; } }
      function goStage(n) {
        setHistStage(n);
        try { if (window[ENGINE_KEY]) window[ENGINE_KEY].setStage(n); } catch (e) {}
        var s = HISTORY[n]; if (s) announce(t(s.tk, s.fb));
      }
      function playHistory() {
        clearHistTimer();
        setSelected(null); setSlice(0); setExcavate(false);
        try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].reset(); window[ENGINE_KEY].setExcavate(false); window[ENGINE_KEY].setHighlight(null); } } catch (e) {}
        var n = 0; goStage(0);
        function tick() { n++; if (n >= HISTORY.length) { histTimer.current = null; return; } goStage(n); histTimer.current = setTimeout(tick, 2600); }
        histTimer.current = setTimeout(tick, 2600);
      }
      function stopHistory() { clearHistTimer(); setHistStage(-1); try { if (window[ENGINE_KEY]) window[ENGINE_KEY].setStage(null); } catch (e) {} }
      function stepTo(n) { clearHistTimer(); if (n < 0) n = 0; if (n >= HISTORY.length) { stopHistory(); return; } goStage(n); }
      // ── volcanic eruption playback (3D animation + staged narration in sync) ──
      function eruptGo(n) { setEruptStage(n); var s = ERUPT[n]; if (s) announce(s.fb); }
      function playEruption() {
        if (eruptTimer.current) clearTimeout(eruptTimer.current);
        setSelected(null); setSlice(0); setExcavate(false);
        try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].setExcavate(false); window[ENGINE_KEY].setSlice(0); window[ENGINE_KEY].setHighlight(null); window[ENGINE_KEY].erupt(); } } catch (e) {}
        var n = 0; eruptGo(0);
        function tick() {
          n++;
          if (n >= ERUPT.length) { eruptTimer.current = setTimeout(function () { setEruptStage(-1); selectRock(rockFacts('basalt', 0)); }, 1700); return; }
          eruptGo(n); eruptTimer.current = setTimeout(tick, 1500);
        }
        eruptTimer.current = setTimeout(tick, 1500);
      }
      React.useEffect(function () { return function () { if (histTimer.current) clearTimeout(histTimer.current); if (eruptTimer.current) clearTimeout(eruptTimer.current); }; }, []);
      // CSS-based fullscreen: the real Fullscreen API is blocked by the Canvas
      // iframe's permissions policy (it rejects with "Disallowed by permissions
      // policy"), so we expand to a fixed-position overlay instead — works anywhere.
      function toggleFullscreen() {
        setIsFs(function (v) { return !v; });
        setTimeout(function () { try { if (window[ENGINE_KEY] && window[ENGINE_KEY].resize) window[ENGINE_KEY].resize(); } catch (e) {} }, 70);
      }
      React.useEffect(function () {
        if (!isFs) return;
        function onKey(e) { if (e.key === 'Escape') setIsFs(false); }
        try { document.addEventListener('keydown', onKey); } catch (e) {}
        return function () { try { document.removeEventListener('keydown', onKey); } catch (e) {} };
      }, [isFs]);

      React.useEffect(function () {
        if (!threeReady || webglError || !containerRef.current || window[ENGINE_KEY]) return;
        try {
          window[ENGINE_KEY] = initEngine(containerRef.current, {
            onSelect: function (facts) { selectRock(facts); },
            onUncover: function (k) { uncoverFossil(k); },
            onFlash: function (m) { addToast(m, 'info'); },
            onContextLost: function () { setWebglError(true); try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].dispose(); window[ENGINE_KEY] = null; } } catch (e) {} }
          });
        } catch (e) { setWebglError(true); }
        return function () { try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].dispose(); window[ENGINE_KEY] = null; } } catch (e) {} };
      }, [threeReady, webglError]);

      // ── styling helpers ──
      var cardBg = isDark ? 'bg-slate-800/70 border-slate-700 shadow-md shadow-black/20' : 'bg-white border-slate-200 shadow-sm';
      var muted = isDark ? 'text-slate-400' : 'text-slate-500';
      var ink = isDark ? 'text-slate-100' : 'text-slate-800';

      // ── selected info panel (shared by 3D + list) ──
      function infoPanel() {
        if (!selected) return h('div', { className: 'text-xs ' + muted + ' p-3 rounded-xl border ' + cardBg }, t('stem.geology.pick_hint', 'Pick a rock — in the 3D block or the list below — to see its type, depth, temperature/pressure, how it forms, and its age relationship.'));
        var f = selected, R = f.R, tc = TYPE_COLOR[R.type] || '#64748b', F = FOSSILS[f.key];
        return h('div', { className: 'p-3 rounded-xl border ' + cardBg, style: { borderLeft: '3px solid ' + tc }, role: 'region', 'aria-label': 'Selected rock details' },
          h('div', { className: 'text-base font-extrabold tracking-tight ' + ink }, R.name),
          h('span', { className: 'inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 mb-2', style: { color: tc, background: tc + '22', border: '1px solid ' + tc + '55' } }, R.type),
          h('div', { className: 'grid gap-1 text-[12px] ' + ink, style: { gridTemplateColumns: '64px 1fr' } },
            h('span', { className: muted }, t('stem.geology.depth', 'Depth')), h('span', null, '≈ ' + f.depthKm + ' km'),
            h('span', { className: muted }, t('stem.geology.temp', 'Temp')), h('span', null, '≈ ' + f.tempC + ' °C'),
            h('span', { className: muted }, t('stem.geology.pressure', 'Pressure')), h('span', null, '≈ ' + f.presMPa + ' MPa'),
            h('span', { className: muted }, t('stem.geology.forms', 'Forms by')), h('span', null, R.formation),
            h('span', { className: muted }, t('stem.geology.minerals', 'Minerals')), h('span', null, R.minerals)
          ),
          h('div', { className: 'mt-2 text-[11.5px]', style: { color: '#f59e0b' } }, '🕓 ' + R.age),
          F
            ? h('div', { className: 'mt-1 text-[11.5px] ' + ink }, h('span', { 'aria-hidden': 'true' }, F.icon + ' '), h('span', { className: 'font-semibold' }, F.name), h('span', { className: muted }, ' — ' + F.tells + (SED_FOSSIL[f.key] ? ' ' + t('stem.geology.dig_fossil', 'Dig or click this layer to uncover one.') : '')))
            : h('div', { className: 'mt-1 text-[11.5px] ' + muted }, '🚫 ' + t('stem.geology.no_fossils', 'No fossils — melting and metamorphism destroy them, so geologists read time from sedimentary layers.')),
          GROUNDWATER[f.key] ? h('div', { className: 'mt-1 text-[11.5px] ' + ink }, h('span', { 'aria-hidden': 'true' }, '💧 '), h('span', { className: 'font-semibold' }, GROUNDWATER[f.key].perm), h('span', { className: muted }, ' — ' + GROUNDWATER[f.key].role)) : null,
          h('div', { className: 'mt-1 text-[11.5px] ' + ink }, h('span', { 'aria-hidden': 'true' }, '📅 '),
            DATING[f.key]
              ? h('span', null, h('span', { className: 'font-semibold' }, 'Datable'), h('span', { className: muted }, ' — ' + DATING[f.key].parent + ' → ' + DATING[f.key].daughter + ', half-life ' + DATING[f.key].hl.toLocaleString() + ' Ma'))
              : h('span', { className: muted }, datingNote(f)))
        );
      }

      // ── absolute (radiometric) dating: why a rock can or can't be dated, + a clock ──
      function datingNote(f) {
        var ty = f.R.type;
        if (ty === 'Molten') return 'No age yet — the radiometric clock only starts when molten rock crystallises.';
        if (ty === 'Surface') return 'Forming today — far too young; radiometric clocks suit million-to-billion-year spans.';
        if (ty.indexOf('Metamorphic') >= 0) return 'Dating gives the metamorphism age (when it was baked), not the original rock.';
        return 'Not dated directly — its grains are older than the rock. Geologists bracket it with datable igneous layers + index fossils.';
      }
      function datingPanel() {
        if (!selected) return null;
        var DT = DATING[selected.key]; if (!DT) return null;
        var pPct = datingParent, dPct = 100 - pPct;
        var halfLives = Math.log(100 / pPct) / Math.log(2);
        var ageMa = Math.round(DT.hl * halfLives);
        return h('div', { className: 'p-3 rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Radiometric dating clock' },
          h('div', { className: 'text-[12px] font-extrabold tracking-tight ' + ink }, '📅 ' + t('stem.geology.dating_title', 'Radiometric clock') + ' · ' + DT.parent + ' → ' + DT.daughter),
          h('div', { className: 'flex h-4 rounded-md overflow-hidden mt-2 border ' + (isDark ? 'border-slate-700' : 'border-slate-300'), 'aria-hidden': 'true' },
            h('div', { style: { width: pPct + '%', background: '#f59e0b', transition: 'width .12s' } }),
            h('div', { style: { width: dPct + '%', background: isDark ? '#475569' : '#cbd5e1', transition: 'width .12s' } })),
          h('div', { className: 'flex items-center justify-between mt-1 text-[11px] ' + muted },
            h('span', null, '🟠 ' + DT.parent + ' ' + Math.round(pPct) + '%'),
            h('span', null, DT.daughter + ' ' + Math.round(dPct) + '% ◻️')),
          h('label', { className: 'block mt-2 text-[11px] ' + muted },
            t('stem.geology.parent_left', 'Parent isotope still left (drag to let it decay):'),
            h('input', { type: 'range', min: 5, max: 100, value: pPct, 'aria-label': 'Percent of parent isotope remaining', className: 'w-full', onChange: function (e) { var v = +e.target.value; setDatingParent(v); if (v < 100) upd('datedRock', 1); var hlv = Math.log(100 / v) / Math.log(2); announce(Math.round(v) + ' percent parent left — about ' + (Math.round(hlv * 100) / 100) + ' half-lives, age ' + Math.round(DT.hl * hlv).toLocaleString() + ' million years.'); } })),
          h('div', { className: 'text-[12px] font-bold ' + ink }, '≈ ' + ageMa.toLocaleString() + ' ' + t('stem.geology.ma', 'million years') + '  ·  ' + (Math.round(halfLives * 100) / 100) + ' ' + t('stem.geology.halflives', 'half-lives')),
          h('div', { className: 'mt-1.5 text-[11px] leading-snug ' + muted }, DT.note + ' ' + t('stem.geology.dating_method', 'Measure the real parent:daughter ratio → that fixes how many half-lives passed → × the half-life gives the age.'))
        );
      }

      // ── interactive rock cycle: apply a real process and follow the rock ──
      function cyclePanel() {
        if (!selected) return null;
        var procs = CYCLE[selected.key] || [];
        if (!procs.length) return null;
        var chipIdle = isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-amber-400' : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-400';
        return h('div', { className: 'p-3 rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Rock cycle — apply a process to the selected rock' },
          h('div', { className: 'text-[12px] font-extrabold tracking-tight ' + ink }, '🔄 ' + t('stem.geology.cycle_title', 'Rock cycle — what happens next?')),
          h('p', { className: 'text-[11px] mt-0.5 mb-2 ' + muted }, t('stem.geology.cycle_hint', 'Apply a real process and follow this rock around the cycle. (It traces the rock — it doesn’t change the ground.)')),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            procs.map(function (p) {
              var toR = ROCKS[p.to], toC = TYPE_COLOR[toR.type] || '#64748b';
              return h('button', {
                key: p.proc + '>' + p.to, type: 'button', title: p.note,
                'aria-label': p.proc + ': turns ' + selected.R.name + ' into ' + toR.name + '. ' + p.note,
                onClick: function () { selectRock(rockFacts(p.to, DEPTH_GUESS[p.to] || 4), true, 'Applied ' + p.proc + '. ' + selected.R.name + ' becomes ' + toR.name + '. ' + p.note); },
                className: 'transition-colors active:scale-[0.97] inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ' + chipIdle
              },
                h('span', null, p.icon + ' ' + p.proc),
                h('span', { 'aria-hidden': 'true', style: { color: toC, fontWeight: 800 } }, '→ ' + toR.name)
              );
            })
          ),
          cyclePath.length > 1 ? h('div', { className: 'mt-2 pt-2 border-t text-[11px] ' + (isDark ? 'border-slate-700 ' : 'border-slate-200 ') + muted },
            h('span', { className: 'font-bold ' + ink }, t('stem.geology.cycle_path', 'Your path: ')),
            cyclePath.map(function (k, i) { return (i ? ' → ' : '') + ROCKS[k].name; }).join('')
          ) : null
        );
      }

      // ── formation history bar: the "how did this form?" chronological narrative ──
      function historyBar() {
        if (histStage < 0) return null;
        var s = HISTORY[histStage] || HISTORY[0];
        var stepBtn = 'transition-colors active:scale-[0.97] text-[12px] font-bold w-7 h-7 inline-flex items-center justify-center rounded-lg border ' + (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100');
        return h('div', { className: 'p-2.5 rounded-xl border-2 ' + (isDark ? 'bg-amber-950/40 border-amber-700/60' : 'bg-amber-50 border-amber-300'), role: 'region', 'aria-label': 'Formation history, step ' + (histStage + 1) + ' of ' + HISTORY.length },
          h('div', { className: 'flex items-center justify-between gap-2 mb-1.5' },
            h('div', { className: 'flex items-center gap-1', 'aria-hidden': 'true' },
              HISTORY.map(function (_, i) { return h('span', { key: i, className: 'w-2 h-2 rounded-full transition-colors ' + (i === histStage ? 'bg-amber-500' : i < histStage ? (isDark ? 'bg-amber-700' : 'bg-amber-300') : (isDark ? 'bg-slate-700' : 'bg-slate-300')) }); })),
            h('div', { className: 'flex items-center gap-1' },
              h('button', { type: 'button', onClick: function () { stepTo(histStage - 1); }, disabled: histStage <= 0, 'aria-label': t('stem.geology.prev_step', 'Previous step'), className: stepBtn + (histStage <= 0 ? ' opacity-40' : '') }, '◀'),
              h('button', { type: 'button', onClick: function () { stepTo(histStage + 1); }, 'aria-label': t('stem.geology.next_step', 'Next step'), className: stepBtn }, '▶'),
              h('button', { type: 'button', onClick: function () { stopHistory(); }, 'aria-label': t('stem.geology.to_present', 'Skip to present — show the whole cross-section'), className: 'transition-colors active:scale-[0.97] text-[11px] font-bold px-2 h-7 rounded-lg border ' + (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100') }, '⏭ ' + t('stem.geology.present', 'Present')))),
          h('div', { className: 'text-[12px] font-semibold leading-snug ' + (isDark ? 'text-amber-100' : 'text-amber-900') }, t(s.tk, s.fb))
        );
      }

      // ── volcanic eruption bar: the extrusive-igneous narrative, staged ──
      function eruptionBar() {
        if (eruptStage < 0) return null;
        var s = ERUPT[eruptStage] || ERUPT[0];
        return h('div', { className: 'p-2.5 rounded-xl border-2 ' + (isDark ? 'bg-orange-950/40 border-orange-700/60' : 'bg-orange-50 border-orange-300'), role: 'region', 'aria-label': 'Volcanic eruption, step ' + (eruptStage + 1) + ' of ' + ERUPT.length },
          h('div', { className: 'flex items-center justify-between gap-2 mb-1.5' },
            h('span', { className: 'text-[12px] font-extrabold ' + (isDark ? 'text-orange-100' : 'text-orange-900') }, '🌋 ' + t('stem.geology.erupting', 'Eruption in progress')),
            h('div', { className: 'flex items-center gap-1', 'aria-hidden': 'true' },
              ERUPT.map(function (_, i) { return h('span', { key: i, className: 'w-2 h-2 rounded-full transition-colors ' + (i === eruptStage ? 'bg-orange-500' : i < eruptStage ? (isDark ? 'bg-orange-700' : 'bg-orange-300') : (isDark ? 'bg-slate-700' : 'bg-slate-300')) }); }))),
          h('div', { className: 'text-[12px] font-semibold leading-snug ' + (isDark ? 'text-orange-100' : 'text-orange-900') }, s.fb)
        );
      }

      // ── fossils uncovered (collection grows as you dig the sedimentary layers) ──
      function fossilStrip() {
        var keys = Object.keys(found || {}).filter(function (k) { return SED_FOSSIL[k]; });
        if (!keys.length) return null;
        return h('div', { className: 'p-2.5 rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Fossils you have uncovered' },
          h('div', { className: 'flex items-center justify-between mb-1.5' },
            h('span', { className: 'text-[11px] font-bold ' + ink }, '🦴 ' + t('stem.geology.fossils_found', 'Fossils uncovered')),
            h('span', { className: 'text-[11px] ' + muted }, keys.length + '/3')),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            keys.map(function (k) { var F = FOSSILS[k]; return h('span', { key: k, title: F.tells, className: 'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border ' + cardBg + ' ' + ink }, F.icon + ' ' + F.name); })));
      }

      // ── drill core log: a real core reads top (youngest) → bottom (oldest) ──
      function corePanel() {
        if (!core) return null;
        var H = 188, W = 50, total = NY;
        var bands = core.segs.map(function (s, i) {
          var y = (s.y0 / total) * H, bh = ((s.y1 - s.y0 + 1) / total) * H;
          return h('rect', { key: i, x: 0, y: y, width: W, height: bh, fill: hex(ROCKS[s.key].color), stroke: 'rgba(0,0,0,0.3)' });
        });
        var list = core.segs.map(function (s, i) {
          var d0 = (s.y0 * KM_PER_VOXEL).toFixed(1), d1 = ((s.y1 + 1) * KM_PER_VOXEL).toFixed(1), R = ROCKS[s.key];
          return h('li', { key: i, className: 'flex items-center gap-2 text-[11px] ' + ink },
            h('span', { 'aria-hidden': 'true', className: 'w-3 h-3 rounded flex-none', style: { background: hex(R.color), boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' } }),
            h('span', { className: 'font-semibold' }, R.name),
            h('span', { className: muted }, d0 + '–' + d1 + ' km'));
        });
        return h('div', { className: 'p-2.5 rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Drill core sample' },
          h('div', { className: 'text-[11px] mb-1.5 ' + muted }, t('stem.geology.core_read', 'A core reads top → bottom: youngest at the surface, oldest at depth.')),
          h('div', { className: 'flex items-start gap-3' },
            h('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', className: 'rounded-md overflow-hidden border flex-none ' + (isDark ? 'border-slate-700' : 'border-slate-300') }, bands),
            h('ol', { className: 'space-y-1 m-0 p-0 list-none' }, list)),
          h('div', { className: 'mt-2 text-[11px] leading-snug ' + ink }, core.blurb));
      }

      // ── relative-dating quiz (active recall) ──
      function quizPanel() {
        var Q = QUIZ[quizI], revealed = quizAns != null;
        function ansBtn(i) {
          var chosen = quizAns === i, right = i === Q.correct;
          var cls = !revealed
            ? (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-violet-400' : 'bg-white border-slate-300 text-slate-700 hover:bg-violet-50 hover:border-violet-400')
            : right ? 'bg-emerald-500 border-emerald-400 text-emerald-950' : (chosen ? 'bg-rose-500 border-rose-400 text-rose-50' : (isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'));
          return h('button', { key: i, type: 'button', disabled: revealed, onClick: function () { answerQuiz(i); }, className: 'transition-colors active:scale-[0.97] text-[12px] font-bold px-3 py-1.5 rounded-lg border ' + cls }, (revealed && right ? '✓ ' : (revealed && chosen ? '✗ ' : '')) + Q.opts[i]);
        }
        return h('div', { className: 'rounded-xl border p-3 ' + cardBg, role: 'region', 'aria-label': 'Relative dating quiz' },
          h('div', { className: 'flex items-center justify-between gap-2' },
            h('span', { className: 'text-[12px] font-extrabold ' + ink }, '🧠 ' + t('stem.geology.quiz_title', 'Test yourself — relative dating')),
            h('button', { type: 'button', onClick: function () { var nv = !quizOn; setQuizOn(nv); if (nv) setQuizAns(null); }, 'aria-expanded': quizOn ? 'true' : 'false', className: 'transition-colors active:scale-[0.97] text-[11px] font-bold px-2.5 py-1 rounded-lg border ' + (quizOn ? 'bg-violet-500 border-violet-400 text-violet-50' : (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')) }, quizOn ? t('stem.geology.quiz_hide', 'Hide') : t('stem.geology.quiz_start', 'Start'))),
          quizOn ? h('div', { className: 'mt-2' },
            h('div', { className: 'text-[12px] font-semibold ' + ink }, (quizI + 1) + '/' + QUIZ.length + '. ' + Q.q),
            h('div', { className: 'flex flex-wrap gap-1.5 mt-1.5' }, Q.opts.map(function (_, i) { return ansBtn(i); })),
            revealed ? h('div', { className: 'mt-2 text-[11.5px] ' + (quizAns === Q.correct ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-rose-300' : 'text-rose-700')) }, (quizAns === Q.correct ? '✓ ' : '✗ ') + Q.why) : null,
            revealed ? h('button', { type: 'button', onClick: nextQuiz, className: 'mt-2 ' + btn + btnIdle }, t('stem.geology.quiz_next', 'Next question →')) : null
          ) : null);
      }

      // ── accessible cross-section: SVG diagram + keyboard strata list (the non-3D core) ──
      function crossSectionSVG() {
        var bands = ['soil', 'sandstone', 'shale', 'limestone', 'basement', 'magma'];
        var bh = 26, W = 150, rows = bands.map(function (k, i) {
          return h('g', { key: k },
            h('rect', { x: 0, y: i * bh, width: W, height: bh, fill: hex(ROCKS[k].color), stroke: 'rgba(0,0,0,0.25)' }),
            h('text', { x: 6, y: i * bh + 17, fontSize: 10, fill: i >= 4 ? '#fff' : '#1e293b', style: { fontWeight: 600 } }, ROCKS[k].name)
          );
        });
        // cross-cutting pluton (triangle up the centre) + label
        return h('svg', { width: W, height: bands.length * bh, viewBox: '0 0 ' + W + ' ' + (bands.length * bh), role: 'img', 'aria-label': 'Cross-section: sedimentary layers over basement and magma, cut by a granite pluton' + (waterOn ? '. Groundwater fills the sandstone aquifer and is trapped above the shale; a dashed line marks the water table.' : ''), className: 'rounded-lg overflow-hidden border ' + (isDark ? 'border-slate-700' : 'border-slate-300') },
          rows,
          // groundwater: saturated zone fills the lower sandstone, perched on the shale
          waterOn ? h('g', { key: 'water' },
            h('rect', { x: 0, y: 1.55 * bh, width: W, height: 0.45 * bh, fill: '#3b82f6', opacity: 0.42 }),
            h('line', { x1: 0, y1: 1.55 * bh, x2: W, y2: 1.55 * bh, stroke: '#1d4ed8', strokeWidth: 1.5, strokeDasharray: '5 2' }),
            h('text', { x: W - 5, y: 1.55 * bh - 3, fontSize: 9, fill: '#1d4ed8', textAnchor: 'end', style: { fontWeight: 700 } }, '💧')
          ) : null,
          h('polygon', { points: (W / 2) + ',' + (bands.length * bh) + ' ' + (W / 2 - 14) + ',' + (2 * bh) + ' ' + (W / 2 + 14) + ',' + (2 * bh), fill: hex(ROCKS.intrusion.color), opacity: 0.92, stroke: 'rgba(255,255,255,0.4)' })
        );
      }
      function strataList() {
        return h('div', { role: 'group', 'aria-label': 'Rock types — select to learn more', className: 'grid grid-cols-2 gap-1.5' },
          ROCK_ORDER.map(function (k) {
            var R = ROCKS[k];
            return h('button', {
              key: k, type: 'button',
              onClick: function () { selectRock(rockFacts(k, DEPTH_GUESS[k] || 4)); },
              className: 'transition active:scale-[0.97] hover:-translate-y-px flex items-center gap-2 text-left px-2 py-1.5 rounded-lg border text-[11.5px] ' + (selected && selected.key === k ? 'ring-2 ring-amber-400 ' : '') + cardBg + ' ' + ink + ' hover:border-amber-400 hover:shadow-md'
            },
              h('span', { 'aria-hidden': 'true', className: 'w-3.5 h-3.5 rounded flex-none', style: { background: hex(R.color), boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' } }),
              h('span', { className: 'truncate font-semibold' }, R.name)
            );
          })
        );
      }

      // ── 3D viewport / loading / fallback ──
      function viewport() {
        if (webglError) {
          return h('div', { className: 'rounded-xl border p-4 text-center ' + cardBg },
            h('div', { className: 'text-2xl mb-1' }, '⛰️'),
            h('div', { className: 'text-sm font-bold ' + ink }, t('stem.geology.no3d_title', '3D view unavailable')),
            h('div', { className: 'text-xs mt-1 ' + muted }, t('stem.geology.no3d_body', 'Your device could not start WebGL. Use the cross-section and rock list — they have the full content.')));
        }
        if (!threeReady) {
          return h('div', { className: 'rounded-xl border flex items-center justify-center ' + cardBg, style: { minHeight: 320 } },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-2xl mb-2 animate-pulse' }, '🔷'),
              h('div', { className: 'text-sm ' + muted }, t('stem.geology.loading3d', 'Loading the 3D engine…'))));
        }
        return h('div', { ref: fsRef, className: (isFs ? 'fixed inset-0 z-[9999] overflow-hidden bg-[#060913]' : 'relative rounded-xl overflow-hidden border ' + (isDark ? 'border-slate-700' : 'border-slate-300')) },
          h('div', { ref: containerRef, style: { height: isFs ? '100vh' : 'min(58vh, 460px)', minHeight: 320, background: '#060913', cursor: excavate ? 'crosshair' : 'grab' }, role: 'img', 'aria-label': 'Interactive 3D voxel cross-section of the crust. Use the rock list below for a non-visual version.' }),
          h('div', { className: 'absolute top-2 left-2 z-10 flex gap-1' },
            [['iso', '3D'], ['front', 'Front'], ['top', 'Top']].map(function (vw) {
              return h('button', { key: vw[0], type: 'button', onClick: function () { try { if (window[ENGINE_KEY] && window[ENGINE_KEY].setView) window[ENGINE_KEY].setView(vw[0]); } catch (e) {} }, 'aria-label': 'Camera view: ' + vw[1], className: 'transition-colors active:scale-[0.97] text-[10px] font-bold px-2 py-1 rounded-md border ' + (isDark ? 'bg-slate-900/75 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-white') }, vw[1]);
            })),
          h('button', { type: 'button', onClick: toggleFullscreen, title: isFs ? t('stem.geology.exit_fullscreen', 'Exit fullscreen') : t('stem.geology.fullscreen', 'Fullscreen'), 'aria-label': isFs ? 'Exit fullscreen 3D view' : 'Fullscreen 3D view', className: 'absolute top-2 right-2 z-10 transition-colors active:scale-[0.97] text-base leading-none px-2 py-1.5 rounded-lg border ' + (isDark ? 'bg-slate-900/80 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/85 border-slate-300 text-slate-700 hover:bg-white') }, isFs ? '✕' : '⛶'));
      }

      var btn = 'transition-colors active:scale-[0.97] text-xs font-bold px-3 py-2 rounded-lg border ';
      var btnIdle = isDark ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100';

      return h('div', { className: 'space-y-3 animate-in fade-in duration-200' },
        // live region (SR)
        h('div', { id: 'allo-live-geology', 'aria-live': 'polite', 'aria-atomic': 'true', role: 'status', className: 'sr-only' }),
        // header
        h('div', { className: 'flex items-center gap-3' },
          setStemLabTool ? h('button', { onClick: function () { setStemLabTool(null); }, 'aria-label': t('stem.back', 'Back to tools'), className: 'transition-colors active:scale-[0.97] p-1.5 rounded-lg ' + (isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100') }, ArrowLeft ? h(ArrowLeft, { size: 18, className: isDark ? 'text-slate-200' : 'text-slate-600' }) : '←') : null,
          h('div', null,
            h('h2', { className: 'text-lg font-black tracking-tight ' + ink }, '⛰️ ' + t('stem.geology.title', 'Geology Explorer')),
            h('div', { className: 'h-[3px] w-12 rounded-full mt-1', style: { background: 'linear-gradient(90deg,#f59e0b,#a855f7)' } }),
            h('p', { className: 'text-[11px] mt-1 ' + muted }, t('stem.geology.subtitle', 'Dig a cross-section of the crust. Identify rocks, read the layers, find the pluton that cuts them.')))),
        // main: viewport + controls (left) | info + cross-section + list (right)
        h('div', { className: 'grid gap-3', style: { gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' } },
          h('div', { className: 'space-y-2' },
            historyBar(),
            eruptionBar(),
            viewport(),
            // controls
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('label', { className: 'flex items-center gap-2 text-xs ' + ink },
                h('span', { className: muted }, t('stem.geology.slice', 'Slice')),
                h('input', { type: 'range', min: 0, max: NZ - 1, value: slice, disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, 'aria-label': 'Cross-section slice depth', onChange: function (e) { var v = +e.target.value; setSlice(v); if (window[ENGINE_KEY]) window[ENGINE_KEY].setSlice(v); } })),
              h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { var nv = !excavate; setExcavate(nv); if (window[ENGINE_KEY]) window[ENGINE_KEY].setExcavate(nv); }, 'aria-pressed': excavate ? 'true' : 'false', className: btn + (excavate ? 'bg-amber-500 border-amber-400 text-amber-950' : btnIdle) }, '⛏️ ' + t('stem.geology.excavate', 'Excavate') + ': ' + (excavate ? t('stem.on', 'ON') : t('stem.off', 'OFF'))),
              h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { setSlice(0); setExcavate(false); if (window[ENGINE_KEY]) { window[ENGINE_KEY].reset(); window[ENGINE_KEY].setExcavate(false); } }, className: btn + btnIdle }, '↺ ' + t('stem.geology.reset', 'Reset')),
              h('button', { type: 'button', disabled: eruptStage >= 0, onClick: function () { if (histStage >= 0) { stopHistory(); } else { playHistory(); } }, 'aria-pressed': histStage >= 0 ? 'true' : 'false', title: t('stem.geology.play_history_tip', 'Watch the cross-section build in the order it formed'), className: btn + (histStage >= 0 ? 'bg-violet-500 border-violet-400 text-violet-50' : btnIdle) }, histStage >= 0 ? '■ ' + t('stem.geology.stop', 'Stop') : '▶ ' + t('stem.geology.play_history', 'Play history')),
              h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0, onClick: function () { var nv = !waterOn; setWaterOn(nv); if (window[ENGINE_KEY]) window[ENGINE_KEY].setWaterTable(nv); if (nv) announce('Water table on. Rain soaks through permeable rock like sandstone and is trapped by the impermeable shale; the water table is the top of the saturated zone. Slice the block or read the cross-section to see it.'); }, 'aria-pressed': waterOn ? 'true' : 'false', title: t('stem.geology.water_tip', 'Show the water table and which layers hold groundwater'), className: btn + (waterOn ? 'bg-blue-500 border-blue-400 text-blue-50' : btnIdle) }, '💧 ' + t('stem.geology.water', 'Water table') + ': ' + (waterOn ? t('stem.on', 'ON') : t('stem.off', 'OFF'))),
              h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { playEruption(); }, title: t('stem.geology.erupt_tip', 'Watch a volcano erupt — magma reaches the surface and cools fast into basalt'), className: btn + (eruptStage >= 0 ? 'bg-orange-500 border-orange-400 text-orange-50' : btnIdle) }, eruptStage >= 0 ? '🌋 ' + t('stem.geology.erupting_short', 'Erupting…') : '🌋 ' + t('stem.geology.erupt', 'Erupt')),
              h('span', { className: 'text-[11px] ' + muted }, threeReady && !webglError ? t('stem.geology.tip', 'Drag to orbit · click a block to identify') : '')),
            infoPanel(),
            datingPanel(),
            cyclePanel()),
          h('div', { className: 'space-y-2' },
            h('div', { className: 'flex items-start gap-3' },
              crossSectionSVG(),
              h('p', { className: 'text-[11px] leading-relaxed ' + muted }, t('stem.geology.teach', 'Deeper sedimentary layers are older (superposition). The granite pluton is YOUNGER than the layers it cuts (cross-cutting), and it bakes a metamorphic rim (contact metamorphism). Heat + pressure rise with depth toward the magma — where the rock cycle restarts.'))),
            h('div', { className: 'text-[11px] font-bold ' + muted }, t('stem.geology.rocks', 'Rock types')),
            strataList(),
            fossilStrip(),
            h('div', { className: 'space-y-1.5' },
              h('div', { className: 'text-[11px] font-bold ' + muted }, '🪛 ' + t('stem.geology.core_title', 'Drill a core sample')),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                CORE_SITES.map(function (site) {
                  var on = core && core.id === site.id;
                  return h('button', { key: site.id, type: 'button', onClick: function () { takeCore(site); }, 'aria-pressed': on ? 'true' : 'false', title: site.blurb, className: 'transition-colors active:scale-[0.97] text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ' + (on ? 'bg-amber-500 border-amber-400 text-amber-950' : (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-amber-400' : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-400')) }, site.icon + ' ' + t('stem.geology.core_' + site.id, site.label));
                })),
              corePanel())))
        , quizPanel()
      );
    }
  });

  console.log('[StemLab] stem_tool_geologyexplorer.js loaded');
})();
