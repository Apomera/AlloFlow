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
    magma:     { name: 'Magma chamber',     type: 'Molten',              color: 0xff7a33, glow: 1, formation: 'Molten rock — the source. It cools to igneous rock and the cycle restarts.',     minerals: '—',                             age: 'Active now — still forming.' },
    basalt:    { name: 'Basalt',            type: 'Igneous (extrusive)', color: 0x4a4a55, formation: 'Lava that ERUPTED and cooled FAST at the surface → crystals too tiny to see (the opposite of slow-cooled granite).', minerals: 'Plagioclase + pyroxene (fine-grained)', age: 'Newest rock — just erupted onto the surface.' }
  };
  var TYPE_COLOR = { 'Surface': '#92786a', 'Sedimentary': '#38bdf8', 'Igneous (intrusive)': '#ec4899', 'Igneous (extrusive)': '#f97316', 'Metamorphic': '#a78bfa', 'Molten': '#fb923c',
    'Crust': '#92786a', 'Mantle': '#ef4444', 'Outer core': '#fb923c', 'Inner core': '#fbbf24', 'Mineral': '#22d3ee', 'Mineral (silica)': '#5eead4', 'Mineral (quartz)': '#a78bfa',
    'Water': '#38bdf8', 'Igneous (basalt)': '#64748b', 'Mantle (rigid)': '#b45309', 'Mantle (ductile)': '#ef4444', 'Mantle (plume)': '#f97316' };
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
  // World extent is FIXED; the detail level only changes how finely it is voxelized, so
  // higher detail = SHARPER (smaller cubes), NOT a bigger block. Camera/lights/surface
  // anchor to WORLD (not the grid count), so framing is identical across detail levels.
  var WORLD = { w: 14, h: 12, d: 14 };
  var KM_PER_WORLD_H = 10.8;                  // 12 * 0.9 — total crust depth (kept constant across detail)
  var RES_MULT = { low: 0.72, standard: 1, high: 1.55 };
  var NX = 14, NY = 12, NZ = 14, KM_PER_VOXEL = 0.9, VOXEL = 1;   // set by setGrid()
  function setGrid(res) {
    var m = (RES_MULT[res] != null) ? RES_MULT[res] : 1;
    NX = Math.max(8, Math.round(WORLD.w * m));
    NY = Math.max(7, Math.round(WORLD.h * m));
    NZ = Math.max(8, Math.round(WORLD.d * m));
    VOXEL = WORLD.w / NX;
    KM_PER_VOXEL = ((SCENE && SCENE.kmPerWorldH) || KM_PER_WORLD_H) / NY;   // per-scene depth scale; depth/temp/pressure physically constant across detail
  }
  setGrid('standard');                         // default — byte-identical to the original 14×12×14 @0.9

  function rockKeyAt(x, y, z) {
    var cx = (NX - 1) / 2, cz = (NZ - 1) / 2;
    var sx = NX / 14;                          // radial scale vs the canonical 14-wide grid
    var r = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
    var Y = Math.floor(y * 12 / NY); if (Y > 11) Y = 11;   // map to the canonical 12-row strata
    var intrusionR = (1.2 + (Y / 12) * 2.6) * sx;
    if (Y >= 3 && r < intrusionR) return 'intrusion';
    if (Y >= 3 && Y < 11 && r < intrusionR + 1.05 * sx) return (Y >= 6 && Y <= 8) ? 'marble' : 'hornfels';
    if (Y === 0) return 'soil';
    if (Y <= 2) return 'sandstone';
    if (Y <= 4) return 'shale';
    if (Y <= 6) return 'limestone';
    if (Y <= 9) return 'basement';
    return 'magma';
  }
  // deterministic: ~1/3 of sedimentary voxels host a fossil, so digging feels like discovery
  function hasFossilAt(x, y, z) { return (((x + 1) * 13 + (z + 1) * 7 + y * 5) % 3) === 0; }

  // Per-voxel ambient occlusion: how many of the 6 face-neighbours are present (a
  // `present` map keyed 'x,y,z'). Flat per-face lighting is what makes voxels read as
  // "Minecrafty"; darkening enclosed voxels makes crevices, strata boundaries and the
  // metamorphic aureole pop. PURE — unit-tested.
  function aoCount(present, x, y, z) {
    var n = 0;
    if (present[(x + 1) + ',' + y + ',' + z]) n++;
    if (present[(x - 1) + ',' + y + ',' + z]) n++;
    if (present[x + ',' + (y + 1) + ',' + z]) n++;
    if (present[x + ',' + (y - 1) + ',' + z]) n++;
    if (present[x + ',' + y + ',' + (z + 1)]) n++;
    if (present[x + ',' + y + ',' + (z - 1)]) n++;
    return n;
  }

  // A drill core: the vertical rock sequence at one (x,z), merged into bands.
  function computeCore(x, z) {
    var segs = [], prev = null;
    for (var y = 0; y < NY; y++) {
      var k = SCENE.gen(x, y, z);
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
    var R = (SCENE && SCENE.palette[key]) || ROCKS[key];
    var depthRaw = (R && R.depthKm != null) ? R.depthKm : y * KM_PER_VOXEL;   // radial scenes carry their own depth
    var g = (SCENE ? SCENE.geotherm : crustGeotherm)(depthRaw, key);
    return { key: key, R: R, depthKm: depthRaw.toFixed(1), tempC: g.tempC, presMPa: g.presMPa, state: g.state };
  }

  // ── First-person "drop into the world" explorer — pure, testable seams ─────────
  // GHOST/FLY model (no collision): you fly THROUGH rock to read depth/temp/pressure
  // anywhere — essential for the radial deep-Earth core and the geode void. The HUD
  // defers ALL science to rockFacts() so each scene keeps its own geotherm (crust
  // linear, deepEarth non-linear — never the ~160,000°C artifact). NO pointer-lock /
  // fullscreen API (both blocked in the Canvas iframe): look = drag + keyboard.
  function fpClampN(n, a, b) { return n < a ? a : (n > b ? b : n); }
  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function fpClampPitch(p) { var M = Math.PI / 2 - 0.05; return p < -M ? -M : (p > M ? M : p); }
  function fpForward(yaw, pitch) { var cp = Math.cos(pitch); return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp }; }
  function fpBounds() { var hx = WORLD.w / 2, hy = WORLD.h / 2, hz = WORLD.d / 2; var m = Math.max(WORLD.w, WORLD.h, WORLD.d) * 0.9; return { min: [-(hx + m), -(hy + m), -(hz + m)], max: [hx + m, hy + m, hz + m] }; }
  function fpStep(pos, fwd, input, dt, speed, bounds) {
    var dtc = dt < 0.05 ? dt : 0.05;                          // stalled-tab guard so a long frame can't leap past the clamp
    var rx = -fwd.z, rz = fwd.x, rl = Math.sqrt(rx * rx + rz * rz) || 1; rx /= rl; rz /= rl;   // right = forward turned 90° in XZ
    var s = speed * dtc;
    var nx = pos.x + (fwd.x * input.fwd + rx * input.strafe) * s;
    var ny = pos.y + (fwd.y * input.fwd) * s + (input.vert || 0) * s;
    var nz = pos.z + (fwd.z * input.fwd + rz * input.strafe) * s;
    return { x: fpClampN(nx, bounds.min[0], bounds.max[0]), y: fpClampN(ny, bounds.min[1], bounds.max[1]), z: fpClampN(nz, bounds.min[2], bounds.max[2]) };
  }
  function fpWorldToVoxel(wx, wy, wz) {                       // exact inverse of worldPos() — clamped to the grid
    return { x: fpClampN(Math.round(wx / VOXEL + (NX - 1) / 2), 0, NX - 1),
             y: fpClampN(Math.round((NY - 1) / 2 - wy / VOXEL), 0, NY - 1),
             z: fpClampN(Math.round(wz / VOXEL + (NZ - 1) / 2), 0, NZ - 1) };
  }
  function fpSeedPose(sceneId) {                              // drop-in eye-point + facing per scene (faces into the block)
    if (sceneId === 'deepEarth') return { pos: { x: 0, y: 0, z: WORLD.d * 0.46 }, yaw: 0, pitch: 0 };
    if (sceneId === 'geode') return { pos: { x: 0, y: 0, z: WORLD.d * 0.42 }, yaw: 0, pitch: 0 };
    if (sceneId === 'subduction') return { pos: { x: 0, y: WORLD.h * 0.28, z: WORLD.d * 0.40 }, yaw: 0, pitch: -0.1 };   // above the margin, looking across the section
    return { pos: { x: 0, y: WORLD.h * 0.5 - 1.5, z: WORLD.d * 0.34 }, yaw: 0, pitch: -0.12 };
  }
  function fpBob(time, moving, reduced, amp) { return (reduced || !moving) ? 0 : Math.sin(time * 9) * amp; }   // reduced-motion / idle → no bob
  function layerChanged(prev, next) { return next != null && next !== prev; }
  // Second-person, present-tense "you are inside THIS" lines (distinct register from R.formation), per scene.
  var FP_BLURB_CRUST = {
    soil: 'You’re at the very surface — loose weathered rock and roots.',
    sandstone: 'You’re in young sandstone — the highest, newest sedimentary layer.',
    shale: 'You’re in shale — older than the sandstone above (superposition).',
    limestone: 'You’re in limestone — the oldest sedimentary layer, an ancient sea floor.',
    basement: 'You’re in ancient granite basement — the crystalline floor the layers rest on.',
    intrusion: 'You’re inside the granite pluton — it cut these layers, so it’s YOUNGER.',
    marble: 'You’re in marble — limestone recrystallised by the pluton’s heat.',
    hornfels: 'You’re in hornfels — shale baked hard beside the pluton.',
    magma: 'You’re in the magma chamber — molten source where the rock cycle restarts.',
    basalt: 'You’re on fresh basalt — lava that erupted and froze fast.'
  };
  var FP_BLURB_GEODE = {
    limestone: 'You’re in the limestone host — the rock the cavity grew inside.',
    chalcedony: 'You’re on the cavity wall — the first silica to precipitate.',
    agate: 'You’re in agate banding — each band is one growth pulse.',
    quartz: 'You’re among quartz that grew INTO open space — room = big crystals.',
    amethyst: 'You’re in amethyst — purple quartz, colour from trace iron.'
  };
  var FP_BLURB_DEEP = {
    crust: 'You’re in the thin brittle crust — the shell we live on.',
    upperMantle: 'You’re in the SOLID upper mantle — it creeps slowly; it is NOT lava.',
    lowerMantle: 'You’re in the SOLID lower mantle — convecting under huge pressure.',
    outerCore: 'You’re in the LIQUID iron outer core — this flow makes Earth’s magnetic field.',
    innerCore: 'You’re at the SOLID inner core — hotter than the outer core, frozen by pressure.'
  };
  var FP_BLURB_SUB = {
    oceanWater: 'You’re in the ocean above the plate that’s about to dive.',
    oceanCrust: 'You’re in dense oceanic crust — heavy enough to sink and subduct.',
    contCrust: 'You’re in buoyant continental crust — too light to subduct, so it overrides.',
    slab: 'You’re riding the slab DOWN — cold and dense, carrying seawater into the mantle.',
    lithMantle: 'You’re in rigid mantle welded under the crust — together they’re one plate.',
    wedge: 'You’re in the mantle wedge — slab water makes it melt. Arc magma is born HERE.',
    asthenosphere: 'You’re in the asthenosphere — SOLID mantle that flows; plates glide on it.',
    arcMagma: 'You’re in rising arc magma — wedge melt climbing through the crust.',
    arcVolcano: 'You’re in an arc volcano — built by wedge melt, not by the slab.'
  };
  function fpBlurb(sceneId, key) { var m = sceneId === 'geode' ? FP_BLURB_GEODE : (sceneId === 'deepEarth' ? FP_BLURB_DEEP : (sceneId === 'subduction' ? FP_BLURB_SUB : FP_BLURB_CRUST)); return (m && m[key]) || ''; }
  var FP_BUST = {
    upperMantle: 'Myth-bust: the mantle is SOLID rock that flows slowly — not a sea of molten lava.',
    lowerMantle: 'Myth-bust: still SOLID here, just convecting extremely slowly under pressure.',
    outerCore: 'This LIQUID iron’s convection is the geodynamo — S-waves can’t cross it, which is how we know.',
    innerCore: 'It’s HOTTER than the outer core yet SOLID — crushing pressure raises iron’s melting point.',
    wedge: 'Myth-bust: the arc’s magma forms when slab WATER melts the mantle wedge — the slab itself mostly doesn’t melt.',
    asthenosphere: 'Myth-bust: the asthenosphere is SOLID rock that flows slowly — plates don’t float on a liquid.',
    slab: 'The slab is COLDER than the mantle around it — that’s why deep earthquakes fire off inside it.',
    contCrust: 'Continental crust is too buoyant to subduct — so the dense ocean plate dives under it instead.',
    basaltN: 'Young crust rides HIGH because it’s hot and buoyant — the seafloor sinks as it cools and ages.',
    basaltR: 'Myth-bust: the symmetric magnetic stripes are a tape recorder of field reversals — the 1963 proof of spreading.',
    axialMagma: 'Most of Earth’s volcanism happens here — underwater, unseen, along 65,000 km of ridge.',
    vent: 'A black smoker: ~350 °C mineral-rich water. Life here runs on CHEMISTRY, not sunlight.',
    dikes: 'Every one of these vertical dikes is a frozen spreading event — the crust literally pulled apart here.',
    plume: 'Myth-bust: the plume stays ~fixed — the PLATE moves. The island chain is a tape recorder of plate motion.',
    oldIsland: 'Extinct: the plate carried it OFF the plume. Now it erodes above while the cooling plate sinks below.',
    seamount: 'A drowned former island — hotspot chains continue underwater for thousands of km.',
    activeVolcano: 'A SHIELD volcano: runny basalt, gentle slopes — nothing like a steep, explosive arc volcano.'
  };
  function fpBust(key) { return FP_BUST[key] || null; }
  function fpProbe(wx, wy, wz) {                              // you-are-here readout; defers all science to rockFacts (scene-aware)
    var v = fpWorldToVoxel(wx, wy, wz);
    var key = SCENE.gen(v.x, v.y, v.z);
    while (key === 'void' && v.y < NY - 1) key = SCENE.gen(v.x, ++v.y, v.z);     // geode hollow is thick → fall to the lining you actually see (mutates v.y so depth is the lining's)
    if (key === 'void') return null;                                            // fully enclosed (defensive) — never fabricate science for empty space
    var f = rockFacts(key, v.y);
    return { key: key, voxelY: v.y, depthKm: f.depthKm, tempC: f.tempC, presMPa: f.presMPa, state: f.state, layerName: f.R ? f.R.name : key, type: f.R ? f.R.type : '', blurb: fpBlurb(SCENE.id, key), bust: fpBust(key) };
  }
  function fpAnnounceText(p) {
    return 'You are inside ' + p.layerName + ', ' + p.type + '. Depth about ' + p.depthKm + ' kilometres, '
      + (typeof p.tempC === 'number' ? p.tempC : String(p.tempC)) + ' degrees Celsius, ' + p.state + '.'
      + (p.bust ? ' ' + p.bust : '');
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
  // Scene-aware quiz banks: retrieval practice for EVERY scene, keyed by
  // SCENE.id (crust keeps its original relative-dating bank). Each bank pins
  // the scene's core idea and its misconception-busts.
  var QUIZ_BANKS = {
    crust:     { title: 'Test yourself — relative dating', items: QUIZ },
    geode: { title: 'Test yourself — crystal caverns', items: [
      { q: 'Why are geode crystals so LARGE?', opts: ['They grew very fast', 'They grew slowly with open space'], correct: 1, why: 'Slow growth plus room to grow makes big crystals — the same rule that makes granite coarse.' },
      { q: 'What made the original hollow?', opts: ['An explosion', 'Acidic groundwater dissolving limestone'], correct: 1, why: 'Karst: slightly acidic water dissolves limestone, leaving voids that minerals later line.' },
      { q: 'Amethyst’s purple colour comes from…', opts: ['Copper', 'Trace iron plus natural irradiation'], correct: 1, why: 'Iron impurities in quartz, altered by natural radiation, give amethyst its purple.' },
      { q: 'Which formed FIRST?', opts: ['The quartz crystal points', 'The agate rind on the wall'], correct: 1, why: 'The rind precipitated on the void wall first; crystals then grew INWARD into the space.' }
    ] },
    deepEarth: { title: 'Test yourself — inside the Earth', items: [
      { q: 'The mantle is mostly…', opts: ['Molten lava', 'Solid rock that slowly flows'], correct: 1, why: 'The mantle is SOLID — it convects by creep over millions of years; only a tiny fraction melts near the top.' },
      { q: 'How do we know the OUTER core is liquid?', opts: ['We drilled into it', 'S-waves cannot pass through it'], correct: 1, why: 'Shear waves can’t travel through liquid — their shadow on the far side of Earth reveals the liquid outer core.' },
      { q: 'The inner core is HOTTER than the outer core, yet solid. Why?', opts: ['It is a different metal', 'Pressure raises iron’s melting point'], correct: 1, why: 'At inner-core pressure, iron’s melting point rises above the local temperature — crushed solid despite ≈5200 °C.' },
      { q: 'Earth’s magnetic field is generated by…', opts: ['The solid inner core spinning', 'Convection of liquid iron in the outer core'], correct: 1, why: 'The geodynamo: churning liquid iron-nickel in the outer core generates the field that shields us.' }
    ] },
    subduction: { title: 'Test yourself — subduction', items: [
      { q: 'Arc-volcano magma comes from…', opts: ['The slab itself melting', 'Slab water melting the mantle WEDGE'], correct: 1, why: 'Water driven off the slab lowers the wedge’s melting point — the wedge partially melts, not the slab.' },
      { q: 'Why does the OCEANIC plate sink?', opts: ['It is colder and denser', 'It is thinner'], correct: 0, why: 'Old oceanic plate is cold, dense basalt — heavy enough to sink. Thickness isn’t what decides.' },
      { q: 'Deep earthquakes happen…', opts: ['In the hot mantle wedge', 'Inside the cold slab'], correct: 1, why: 'Only the cold, rigid slab is brittle enough to snap at depth — the hot wedge flows instead.' },
      { q: 'Why doesn’t continental crust subduct?', opts: ['It is too buoyant', 'It is too strong'], correct: 0, why: 'Granite crust is low-density — like a cork, it’s too buoyant to be pushed under.' }
    ] },
    ridge: { title: 'Test yourself — seafloor spreading', items: [
      { q: 'The symmetric magnetic stripes prove…', opts: ['Earth’s field never changes', 'New seafloor spreads out from the axis'], correct: 1, why: 'Cooling basalt records the field; reversals paint matching stripes on BOTH flanks — the 1963 evidence for spreading.' },
      { q: 'Why does the ridge stand HIGH above the old seafloor?', opts: ['Young crust is hot and buoyant', 'Lava simply piles up there'], correct: 0, why: 'Young, hot crust rides high; as it ages it cools, densifies and SINKS — depth records age.' },
      { q: 'Where is deep-sea sediment THICKEST?', opts: ['Right at the axis', 'Far from the axis'], correct: 1, why: 'Sediment rains down slowly forever — older (farther) seafloor has collected more. The axis is brand new and bare.' },
      { q: 'Gabbro and pillow basalt are…', opts: ['Two different magmas', 'The same melt cooled at different speeds'], correct: 1, why: 'Same basaltic melt: erupted into seawater = fine-grained pillows; cooled slowly at depth = coarse gabbro.' }
    ] },
    hotspot: { title: 'Test yourself — hotspots', items: [
      { q: 'The island CHAIN exists because…', opts: ['The plume wanders around', 'The PLATE moves over a ~fixed plume'], correct: 1, why: 'The plume stays put; the plate slides past, carrying each volcano off its magma supply — a tape recorder of plate motion.' },
      { q: 'Which island is OLDEST?', opts: ['The one over the plume', 'The one farthest from the plume'], correct: 1, why: 'Age grows down the chain with distance — that age progression is textbook evidence that plates move.' },
      { q: 'A shield volcano has gentle slopes because…', opts: ['Its runny basalt flows far', 'Its thick lava explodes'], correct: 0, why: 'Hot, runny basalt spreads in thin sheets — broad shields, unlike steep, explosive arc stratovolcanoes.' },
      { q: 'Hotspot volcanoes sit…', opts: ['On plate boundaries', 'In the middle of plates'], correct: 1, why: 'Intraplate volcanism: the plume punches through the middle of a plate, far from any boundary.' }
    ] }
  };

  // ── Volcanic eruption narration (the extrusive-igneous story, staged) ──
  var QUIZ_REMEDIATION = {
    crust: [
      { id: 'crust-superposition', misconception: 'Top layers are always oldest.', remedy: 'Sedimentary layers are usually deposited on top of older layers. Read from the surface downward for older relative age.' },
      { id: 'crust-cross-cutting', misconception: 'A feature that cuts rock must be older.', remedy: 'The cutting feature had to arrive after the rock it cuts, so a pluton or fault is younger than the layers it crosses.' },
      { id: 'crust-metamorphism', misconception: 'Marble forms by shells piling up or by river sand.', remedy: 'Marble is limestone changed by heat and pressure. The original chemistry remains, but the texture recrystallizes.' },
      { id: 'crust-fossils', misconception: 'Fossils survive inside granite or magma.', remedy: 'Fossils are preserved most readily in sedimentary rock. Melting and strong heating destroy the original fossil record.' },
      { id: 'crust-core-order', misconception: 'The top of a drill core is the oldest part.', remedy: 'A core reads from the surface downward: the top is youngest and deeper layers are older unless the rocks were disturbed.' }
    ],
    geode: [
      { id: 'geode-crystal-size', misconception: 'Large crystals must have grown quickly.', remedy: 'Large crystals need time and open space. Slow growth lets atoms arrange into larger crystal faces.' },
      { id: 'geode-cavity', misconception: 'The hollow was made by an explosion.', remedy: 'Acidic groundwater can dissolve limestone and leave a cavity. Later mineral-rich water lines that open space.' },
      { id: 'geode-color', misconception: 'Amethyst purple comes from copper.', remedy: 'Trace iron in quartz plus natural irradiation produces the purple color.' },
      { id: 'geode-sequence', misconception: 'Crystal points formed before the wall rind.', remedy: 'The rind precipitated on the cavity wall first. Quartz and amethyst then grew inward into the open space.' }
    ],
    deepEarth: [
      { id: 'deepEarth-mantle', misconception: 'The mantle is a global ocean of liquid lava.', remedy: 'Most of the mantle is solid rock that flows slowly by plastic creep. Only small regions partially melt.' },
      { id: 'deepEarth-waves', misconception: 'Scientists drilled to the outer core.', remedy: 'S-waves cannot travel through liquid. Their shadow pattern lets scientists infer a liquid outer core from the surface.' },
      { id: 'deepEarth-pressure', misconception: 'The inner core is solid because it is made of a different metal.', remedy: 'The inner core is mostly the same iron-nickel system; immense pressure raises the melting point and keeps it solid.' },
      { id: 'deepEarth-dynamo', misconception: 'The solid inner core alone generates the magnetic field.', remedy: 'Convection in the liquid outer core moves conducting iron-nickel and powers the geodynamo.' }
    ],
    subduction: [
      { id: 'subduction-source', misconception: 'The descending slab itself melts to make the volcano.', remedy: 'Water released from the slab lowers the melting point of the mantle wedge. The wedge partially melts and supplies the arc magma.' },
      { id: 'subduction-density', misconception: 'The oceanic plate sinks because it is thinner.', remedy: 'Old oceanic lithosphere is cold and dense. Density and buoyancy, not thickness alone, drive sinking.' },
      { id: 'subduction-earthquakes', misconception: 'Deep earthquakes happen in the hot mantle wedge.', remedy: 'The cold rigid slab can break at depth. The hotter mantle wedge mostly flows instead of snapping.' },
      { id: 'subduction-continent', misconception: 'Continental crust stays up because it is too strong.', remedy: 'Continental crust is relatively low density and buoyant, so it resists being pulled beneath the mantle.' }
    ],
    ridge: [
      { id: 'ridge-magnetic', misconception: 'Magnetic stripes prove Earths field never changes.', remedy: 'Basalt records the field as it cools. Reversals create matching stripes on both sides as new seafloor spreads outward.' },
      { id: 'ridge-elevation', misconception: 'The ridge is high only because lava piles up there.', remedy: 'Young crust is hot and buoyant. As it cools and densifies, it sinks away from the ridge.' },
      { id: 'ridge-sediment', misconception: 'The newest seafloor has the thickest sediment.', remedy: 'Sediment accumulates over time, so older seafloor farther from the axis usually has more sediment.' },
      { id: 'ridge-cooling', misconception: 'Pillow basalt and gabbro come from different magmas.', remedy: 'They can form from the same basaltic melt: rapid cooling in seawater makes pillows, while slow cooling at depth makes coarse gabbro.' }
    ],
    hotspot: [
      { id: 'hotspot-motion', misconception: 'The plume wanders to make the island chain.', remedy: 'A relatively fixed plume supplies magma while the tectonic plate moves across it and carries older volcanoes away.' },
      { id: 'hotspot-age', misconception: 'The island over the plume is the oldest.', remedy: 'The active island is youngest. Age generally increases with distance from the plume toward extinct and drowned seamounts.' },
      { id: 'hotspot-shield', misconception: 'Shield volcanoes have gentle slopes because their lava is thick and explosive.', remedy: 'Runny basalt flows far in thin sheets, building broad gentle shields rather than steep explosive cones.' },
      { id: 'hotspot-setting', misconception: 'Hotspot volcanoes must sit on plate boundaries.', remedy: 'Hotspots can occur within plates. The plume is a deep heat source separate from the boundary-driven processes at ridges and subduction zones.' }
    ]
  };
  function quizRemediation(sceneId, index) {
    var bank = QUIZ_REMEDIATION[sceneId] || QUIZ_REMEDIATION.crust;
    return bank[index] || { id: sceneId + '-quiz-' + index, misconception: 'The evidence pattern is easy to mix up.', remedy: 'Return to the scene evidence, name what you observed, and connect it to the process before trying again.' };
  }

  var ERUPT = [
    { fb: 'Pressure builds — dissolved gas and rising magma push up beneath the volcano.' },
    { fb: 'Magma climbs a conduit: a pipe of molten rock cutting straight to the surface.' },
    { fb: 'Eruption! Lava fountains from the vent and an ash plume billows skyward.' },
    { fb: 'Out in the air and on the ground, the lava cools in seconds → fine-grained BASALT (extrusive igneous) — crystals too small to see.' },
    { fb: 'Same magma, two fates: erupted = fast-cooled BASALT (tiny crystals); trapped underground = slow-cooled GRANITE (big crystals). A new volcanic layer forms — the rock cycle turns.' }
  ];

  // ── SCENE REGISTRY ──────────────────────────────────────────────────────────
  // Each scene is a pluggable voxel WORLD: a pure generator + palette + geotherm +
  // which features apply. The crust is the default and is byte-identical to before.
  // Geotherm = temp/pressure vs depth. The crust uses the original LINEAR shallow-crust
  // model (valid in the upper crust + the shallow geode); deep scenes (next) MUST
  // declare their own NON-linear geotherm — the linear one overshoots ~50× at the core.
  function crustGeotherm(depthKm, key) {
    if (key === 'magma') return { tempC: '≈ 1000+', presMPa: Math.round(depthKm * 27), state: 'molten' };
    return { tempC: Math.round(15 + depthKm * 25), presMPa: Math.round(depthKm * 27), state: 'solid' };
  }

  // Crystal Cavern (geode): acidic groundwater dissolved a karst VOID in limestone;
  // mineral-rich water then precipitated a chalcedony/agate rind and grew quartz +
  // amethyst crystals INWARD into the open space (slow growth + room = big crystals —
  // the same rule the granite teaches). Amethyst purple = trace iron + irradiation.
  var GEODE_ROCKS = {
    limestone:  ROCKS.limestone,
    chalcedony: { name: 'Chalcedony rind', type: 'Mineral (silica)', color: 0x8fb0a8, formation: 'Microcrystalline silica lining the cavity wall — the first layer to precipitate from mineral-rich water.', minerals: 'Cryptocrystalline quartz', age: 'Grew inward from the wall over millennia.' },
    agate:      { name: 'Agate banding',   type: 'Mineral (silica)', color: 0xc98a5a, formation: 'Concentric bands deposited as mineral-rich water pulsed through — each band is one growth episode.', minerals: 'Banded chalcedony', age: 'Oldest band at the wall, youngest toward the centre.' },
    quartz:     { name: 'Quartz crystal',  type: 'Mineral',          color: 0xd9d6ea, formation: 'Clear quartz that grew slowly into the OPEN cavity — slow growth + space = big euhedral crystals.', minerals: 'SiO₂', age: '10³–10⁶ years to grow.' },
    amethyst:   { name: 'Amethyst',        type: 'Mineral (quartz)', color: 0x9b6dd6, formation: 'Purple quartz — colour from trace IRON plus natural irradiation; grew inward into the void.', minerals: 'SiO₂ + Fe', age: '10³–10⁶ years to grow.' }
  };
  function geodeKeyAt(x, y, z) {
    var cx = (NX - 1) / 2, cy = (NY - 1) / 2, cz = (NZ - 1) / 2;
    var dx = x - cx, dy = y - cy, dz = z - cz;
    var r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var minN = Math.min(NX, NY, NZ);
    var Rc = minN * 0.32, lining = Math.max(1.0, minN * 0.08), rind = minN * 0.16;
    if (r < Rc - lining) return 'void';                                   // hollow interior (skipped)
    if (r < Rc) return ((x * 7 + y * 5 + z * 3) % 5 === 0) ? 'quartz' : 'amethyst';   // crystal lining (inward)
    if (r < Rc + rind) return (Math.round(r) % 2 === 0) ? 'agate' : 'chalcedony';     // banded rind
    return 'limestone';                                                  // host rock
  }

  // Deep-Earth structure — a radial slice to the centre. SCHEMATIC / not to scale, with
  // its OWN non-linear geotherm (the crust's linear 25°C/km would read ~160,000°C at the
  // core). Per-layer depths drive the readouts (depth is radial here, not row-based).
  var DEEPEARTH_ROCKS = {
    crust:       { name: 'Crust',               type: 'Crust',      color: 0x6b5640, depthKm: 35,   glow: 0, formation: 'Thin, brittle outer shell of rock — oceanic basalt and continental granite.', minerals: 'Silicate rock', age: 'The surface we live on.' },
    upperMantle: { name: 'Upper mantle',        type: 'Mantle',     color: 0xb14a2c, depthKm: 700,  glow: 0, formation: 'SOLID silicate rock that CONVECTS by slow plastic creep over millions of years — only a tiny % melts near the top (the asthenosphere). It is NOT a sea of lava.', minerals: 'Olivine, pyroxene', age: 'Its slow convection drives plate tectonics.' },
    lowerMantle: { name: 'Lower mantle',        type: 'Mantle',     color: 0x7a2f22, depthKm: 2000, glow: 0, formation: 'Hotter, denser SOLID rock under huge pressure — still convects, just extremely slowly.', minerals: 'Bridgmanite', age: 'About two-thirds of Earth’s volume.' },
    outerCore:   { name: 'Outer core (liquid)', type: 'Outer core', color: 0xff7a33, depthKm: 4000, glow: 1, formation: 'LIQUID iron–nickel. Its convection generates Earth’s magnetic field — the geodynamo — the shield that deflects the solar wind.', minerals: 'Molten iron–nickel', age: 'S-waves can’t pass through it — that is HOW we know it is liquid.' },
    innerCore:   { name: 'Inner core (solid)',  type: 'Inner core', color: 0xffe08a, depthKm: 5500, glow: 1, formation: 'SOLID iron–nickel — even though it is HOTTER than the outer core, the crushing pressure raises iron’s melting point above the local temperature, so it freezes solid.', minerals: 'Solid iron–nickel', age: '≈ 5200 °C — about the Sun’s surface.' }
  };
  function deepEarthKeyAt(x, y, z) {
    var cx = (NX - 1) / 2, cy = (NY - 1) / 2, cz = (NZ - 1) / 2;
    var dx = x - cx, dy = y - cy, dz = z - cz;
    var maxR = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
    var rN = Math.sqrt(dx * dx + dy * dy + dz * dz) / maxR;   // 0 = centre, 1 = surface corner
    if (rN < 0.19) return 'innerCore';                        // ~real fractions of Earth's radius
    if (rN < 0.55) return 'outerCore';
    if (rN < 0.80) return 'lowerMantle';
    if (rN < 0.97) return 'upperMantle';
    return 'crust';
  }
  function deepEarthGeotherm(depthKm, key) {
    var T = { crust: 500, upperMantle: 1400, lowerMantle: 2800, outerCore: 4500, innerCore: 5200 };   // non-linear, schematic
    var P = { crust: 1000, upperMantle: 24000, lowerMantle: 125000, outerCore: 230000, innerCore: 360000 };
    var S = { crust: 'solid', upperMantle: 'solid (convecting)', lowerMantle: 'solid (convecting)', outerCore: 'liquid', innerCore: 'solid' };
    return { tempC: (T[key] != null ? T[key] : Math.round(15 + depthKm * 25)), presMPa: (P[key] != null ? P[key] : Math.round(depthKm * 27)), state: (S[key] || 'solid') };
  }

  // Subduction zone — a convergent ocean–continent margin (an Andes/Cascadia cross-section).
  // SCHEMATIC / not to scale. The science payload: a dense OCEANIC plate bends at the trench
  // and sinks beneath a buoyant CONTINENTAL plate; the COLD slab carries seawater down; at
  // ~100 km that water lowers the melting point of the overlying MANTLE WEDGE, which partially
  // melts → that melt rises to build the volcanic arc. Its OWN geotherm encodes the thermal
  // ANOMALY (cold slab, hot wedge) by key, so flying in reads honest cold-vs-hot.
  var SUBDUCTION_ROCKS = {
    oceanWater:    { name: 'Ocean',                type: 'Water',                color: 0x2b6cb0, depthKm: 0,   glow: 0, formation: 'The sea sitting over the oceanic plate, deepest right above the trench.', minerals: 'Seawater', age: 'Hydrates the plate before it dives.' },
    oceanCrust:    { name: 'Oceanic crust',        type: 'Igneous (basalt)',     color: 0x33414d, depthKm: 6,   glow: 0, formation: 'Thin, DENSE basalt + gabbro. Old oceanic plate is cold and heavy, so it sinks and subducts.', minerals: 'Basalt, gabbro', age: 'Made at mid-ocean ridges, recycled here.' },
    contCrust:     { name: 'Continental crust',    type: 'Continental',          color: 0xb08d57, depthKm: 20,  glow: 0, formation: 'Thick, LOW-density granite. Too buoyant to sink — so it overrides while the ocean plate dives under it.', minerals: 'Granite', age: 'The buoyant raft that never subducts.' },
    slab:          { name: 'Subducting slab',      type: 'Subducting plate',     color: 0x3a4a58, depthKm: 120, glow: 0, formation: 'The oceanic plate bending DOWN into the mantle — COLD and dense, dragging seawater locked in its minerals down with it. As it densifies to eclogite its own weight pulls the rest of the plate along (slab pull).', minerals: 'Basalt → eclogite', age: 'Colder than the mantle around it → deep earthquakes happen inside it.' },
    lithMantle:    { name: 'Lithospheric mantle',  type: 'Mantle (rigid)',       color: 0x6b3f33, depthKm: 60,  glow: 0, formation: 'Rigid mantle welded under the crust — crust + this rigid lid together make a tectonic plate.', minerals: 'Peridotite', age: 'Moves as one with the crust above it.' },
    wedge:         { name: 'Mantle wedge',         type: 'Mantle (melting)',     color: 0xc2452b, depthKm: 110, glow: 0, formation: 'Hot mantle ABOVE the slab. Water driven off the slab lowers its melting point so it PARTIALLY MELTS — this is where arc magma is born, NOT the slab itself.', minerals: 'Peridotite + water', age: 'The true source of the volcanoes.' },
    asthenosphere: { name: 'Asthenosphere',        type: 'Mantle (ductile)',     color: 0x8a2f22, depthKm: 200, glow: 0, formation: 'SOLID mantle that flows slowly by plastic creep — the plates glide on it. It is NOT a liquid layer.', minerals: 'Peridotite', age: 'Convects over millions of years.' },
    arcMagma:      { name: 'Arc magma',            type: 'Molten',               color: 0xff7a33, depthKm: 30,  glow: 1, formation: 'Melt from the mantle wedge rising buoyantly up through the continental crust toward the surface.', minerals: 'Silicate melt + water', age: 'Cooling at depth makes coarse intrusive rock (granodiorite); erupting makes andesite.' },
    arcVolcano:    { name: 'Arc volcano',          type: 'Igneous (extrusive)',  color: 0xd9603a, depthKm: 0,   glow: 1, formation: 'A stratovolcano of the volcanic arc (the Andes, Cascades, Japan) built by magma from the WEDGE — not from the slab.', minerals: 'Andesite, ash', age: 'The surface signature of subduction.' }
  };
  function subductionKeyAt(x, y, z) {
    var fx = NX > 1 ? x / (NX - 1) : 0;   // 0 = left (ocean) → 1 = right (continent)
    var fy = NY > 1 ? y / (NY - 1) : 0;   // 0 = surface → 1 = deep
    var trench = 0.30;                      // where the ocean plate bends down
    var slabFx = trench + fy * 0.62;       // slab centreline descends to the lower-right
    if (fy > 0.06 && Math.abs(fx - slabFx) < 0.07) return 'slab';   // the descending plate
    if (fx < trench) {                     // ocean side (not yet subducted)
      if (fy < 0.08) return 'oceanWater';
      if (fy < 0.22) return 'oceanCrust';
      if (fy < 0.42) return 'lithMantle';
      return 'asthenosphere';
    }
    // continent side: the magma conduit + volcano cut UP through the crust at the arc
    if (Math.abs(fx - 0.60) < 0.045 && fy < 0.50) return fy < 0.05 ? 'arcVolcano' : 'arcMagma';
    var crustBottom = Math.min(0.34, 0.06 + (fx - trench) * 0.5);   // crust thickens inland
    if (fy < crustBottom) return 'contCrust';
    var lidBottom = Math.min(0.46, crustBottom + 0.12);
    if (fy < lidBottom) return 'lithMantle';
    var slabDepthHere = (fx - trench) / 0.62;   // fy where the slab sits at this column
    if (fy < slabDepthHere) return 'wedge';      // between the rigid lid and the slab → mantle wedge
    return 'asthenosphere';                       // below / beyond the slab
  }
  function subductionGeotherm(depthKm, key) {
    var T = { oceanWater: 4, oceanCrust: 150, contCrust: 400, slab: 700, lithMantle: 900, asthenosphere: 1330, wedge: 1300, arcMagma: 1100, arcVolcano: 900 };   // slab COLD, wedge HOT (the anomaly)
    var S = { oceanWater: 'liquid', oceanCrust: 'solid', contCrust: 'solid', slab: 'solid (cold slab)', lithMantle: 'solid (rigid)', asthenosphere: 'solid (ductile — flows)', wedge: 'solid → partial melt', arcMagma: 'molten', arcVolcano: 'erupting' };
    return { tempC: (T[key] != null ? T[key] : Math.round(15 + depthKm * 25)), presMPa: Math.round(depthKm * 30), state: (S[key] || 'solid') };
  }

  // ── Scene 5: Mid-ocean ridge (divergent boundary) ───────────────────────────
  // The counterpart to the subduction scene: crust is CREATED here. Teaches the
  // ophiolite sequence (pillow basalt → sheeted dikes → gabbro), symmetric
  // magnetic striping (the tape-recorder evidence that proved spreading),
  // age-subsidence (young hot crust rides high; seafloor sinks as it cools),
  // sediment thickening with age, and hydrothermal vents.
  var RIDGE_ROCKS = {
    oceanWater:    { name: 'Ocean',               type: 'Water',                color: 0x2b6cb0, depthKm: 0,  glow: 0, formation: 'Deepest far from the axis: as oceanic crust ages and cools it grows denser and SINKS — seafloor depth is a clock.', minerals: 'Seawater', age: 'Shallowest right over the young, hot ridge axis.' },
    sediment:      { name: 'Deep-sea sediment',   type: 'Sedimentary',          color: 0xc9b98f, depthKm: 3,  glow: 0, formation: 'A slow rain of plankton shells and clay — a few cm per THOUSAND years. None on brand-new crust at the axis; thicker the older (farther) the seafloor.', minerals: 'Ooze, clay', age: 'Its thickness is a second clock: more sediment = older seafloor.' },
    basaltN:       { name: 'Pillow basalt',       type: 'Igneous (extrusive)',  color: 0x33414d, depthKm: 3,  glow: 0, formation: 'Lava erupting into cold seawater freezes into pillow-shaped blobs. Iron minerals inside lock in the direction of Earth’s magnetic field as they cool.', minerals: 'Basalt (normal polarity)', age: 'Recorded today’s field direction when it cooled.' },
    basaltR:       { name: 'Reversed-polarity basalt', type: 'Igneous (extrusive)', color: 0x50626f, depthKm: 3, glow: 0, formation: 'Same pillow basalt — but it cooled when Earth’s magnetic field pointed the OTHER way. The stripes mirror each other on both sides of the axis.', minerals: 'Basalt (reversed polarity)', age: 'The symmetric stripe pattern is how spreading was PROVEN in 1963.' },
    dikes:         { name: 'Sheeted dikes',       type: 'Igneous (intrusive)',  color: 0x475366, depthKm: 4,  glow: 0, formation: 'Thousands of vertical magma cracks, each one a spreading event: the crust pulls apart, magma fills the gap, freezes, and is split by the NEXT crack.', minerals: 'Diabase', age: 'Each dike records one moment of spreading.' },
    gabbro:        { name: 'Gabbro',              type: 'Igneous (intrusive)',  color: 0x3d4a43, depthKm: 6,  glow: 0, formation: 'The magma chamber’s floor, cooled SLOWLY at depth into coarse crystals — chemically the same melt as the pillow basalt above, cooled at a different speed.', minerals: 'Gabbro (coarse basalt)', age: 'Bottom layer of the ophiolite sequence.' },
    axialMagma:    { name: 'Axial magma lens',    type: 'Molten',               color: 0xff7a33, depthKm: 2,  glow: 1, formation: 'A thin melt lens under the rift valley, fed by upwelling mantle that melts as pressure drops (decompression melting — no extra heat needed).', minerals: 'Basaltic melt', age: 'Feeds every eruption and every dike.' },
    vent:          { name: 'Hydrothermal vent',   type: 'Mineral',              color: 0x18e0c8, depthKm: 2.5, glow: 1, formation: 'Seawater sinks into hot young crust, leaches metals, and jets back out at ~350 °C as a BLACK SMOKER, precipitating metal-sulfide chimneys.', minerals: 'Metal sulfides', age: 'Whole food webs live here on chemistry, not sunlight.' },
    lithMantle:    { name: 'Lithospheric mantle', type: 'Mantle (rigid)',       color: 0x6b3f33, depthKm: 15, glow: 0, formation: 'Mantle frozen rigid onto the crust’s base. Nearly ABSENT at the hot axis; thickens with age as the plate cools — old plates are thick plates.', minerals: 'Peridotite', age: 'Its growing thickness is a third clock.' },
    asthenosphere: { name: 'Asthenosphere',       type: 'Mantle (ductile)',     color: 0x8a2f22, depthKm: 30, glow: 0, formation: 'Solid mantle flowing slowly upward beneath the axis. As it rises, falling pressure lets a few percent of it melt — the source of ALL new ocean crust.', minerals: 'Peridotite', age: 'Wells up exactly where the plates pull apart.' }
  };
  function ridgeKeyAt(x, y, z) {
    var fx = NX > 1 ? x / (NX - 1) : 0;
    var fy = NY > 1 ? y / (NY - 1) : 0;
    var d = Math.abs(fx - 0.5);                       // distance from the spreading axis
    var waterBottom = 0.10 + d * 0.16;                // seafloor SINKS with age (axial high)
    var sedThick = d > 0.08 ? (d - 0.08) * 0.22 : 0;  // no sediment on brand-new crust
    if (fy < waterBottom) {
      // one black-smoker chimney just off-axis on the right flank
      if (d > 0.09 && d < 0.14 && fx > 0.5 && fy > waterBottom - 0.075) return 'vent';
      return 'oceanWater';
    }
    if (fy < waterBottom + sedThick) return 'sediment';
    var ct = waterBottom + sedThick;                  // top of igneous crust here
    if (d < 0.045) {                                  // axial neovolcanic zone
      if (fy < ct + 0.10) return 'basaltN';
      if (fy < 0.60) return 'axialMagma';
      return 'asthenosphere';                         // upwelling mantle right under the axis
    }
    if (fy < ct + 0.10) {                             // pillow-basalt layer, magnetically striped
      var stripe = Math.floor((d - 0.045) / 0.09);
      return (stripe % 2 === 0) ? 'basaltN' : 'basaltR';
    }
    if (fy < ct + 0.20) return 'dikes';
    if (fy < ct + 0.34) return 'gabbro';
    var lidBottom = ct + 0.34 + 0.05 + d * 0.55;      // lithosphere thickens with age
    if (fy < lidBottom) return 'lithMantle';
    return 'asthenosphere';
  }
  function ridgeGeotherm(depthKm, key) {
    // Key-based: temperature here tracks crust AGE (distance), not just depth.
    var T = { oceanWater: 2, sediment: 10, basaltN: 80, basaltR: 40, dikes: 150, gabbro: 300, axialMagma: 1200, vent: 350, lithMantle: 900, asthenosphere: 1330 };
    var S = { oceanWater: 'liquid', sediment: 'soft (unconsolidated)', basaltN: 'solid (young, still cooling)', basaltR: 'solid (older, cooler)', dikes: 'solid', gabbro: 'solid', axialMagma: 'molten', vent: 'superheated water jet', lithMantle: 'solid (rigid)', asthenosphere: 'solid (ductile — flows)' };
    return { tempC: (T[key] != null ? T[key] : Math.round(15 + depthKm * 25)), presMPa: Math.round(depthKm * 30), state: (S[key] || 'solid') };
  }

  // ── Scene 6: Hotspot island chain (intraplate volcanism) ────────────────────
  // Hawaii-style: a ~fixed mantle plume under a MOVING plate writes a line of
  // volcanoes — active over the plume, extinct and sinking downstream. Teaches
  // intraplate volcanism, the age-progression evidence for plate motion, and
  // shield (runny-basalt) vs arc (strato) volcanism.
  var HOTSPOT_ROCKS = {
    oceanWater:    { name: 'Ocean',               type: 'Water',               color: 0x2b6cb0, depthKm: 0,   glow: 0, formation: 'The plate under this ocean is moving — carrying each volcano off its magma supply.', minerals: 'Seawater', age: 'The conveyor belt.' },
    activeVolcano: { name: 'Active shield volcano', type: 'Igneous (extrusive)', color: 0x445247, depthKm: 0, glow: 1, formation: 'Sits directly over the plume TODAY. Runny basalt builds broad, gentle SHIELD slopes — nothing like the steep, explosive arc volcanoes of a subduction zone.', minerals: 'Basalt, olivine', age: 'Youngest of the chain — still growing.' },
    oldIsland:     { name: 'Extinct island',      type: 'Igneous (extrusive)', color: 0x6a6f5a, depthKm: 0,   glow: 0, formation: 'Carried OFF the plume by plate motion — its magma supply is gone. Now erosion grinds it down while the cooling plate beneath it slowly sinks.', minerals: 'Weathered basalt, soil', age: 'Older than the active island — age grows down the chain.' },
    seamount:      { name: 'Drowned seamount',    type: 'Igneous (extrusive)', color: 0x4a5d68, depthKm: 1,   glow: 0, formation: 'A former island that eroded and subsided beneath the waves — the chain continues underwater for thousands of km (Hawaii’s Emperor Seamounts).', minerals: 'Basalt, coral caps', age: 'Oldest link shown — the chain is a plate-motion tape recorder.' },
    oceanCrust:    { name: 'Oceanic crust',       type: 'Igneous (basalt)',    color: 0x33414d, depthKm: 8,   glow: 0, formation: 'Ordinary ocean floor the volcanoes are built on — made long ago at a mid-ocean ridge.', minerals: 'Basalt, gabbro', age: 'Rides the moving plate.' },
    lithMantle:    { name: 'Lithospheric mantle', type: 'Mantle (rigid)',      color: 0x6b3f33, depthKm: 60,  glow: 0, formation: 'The rigid mantle lid that moves with the crust as one plate — the plume must burn through ALL of this to reach the surface.', minerals: 'Peridotite', age: 'Moves; the plume below does not.' },
    conduit:       { name: 'Magma conduit',       type: 'Molten',              color: 0xff7a33, depthKm: 40,  glow: 1, formation: 'Melt from the plume head punching up through plate and crust to feed ONLY the volcano currently overhead.', minerals: 'Basaltic melt', age: 'Abandons each island as the plate carries it away.' },
    plume:         { name: 'Mantle plume',        type: 'Mantle (plume)',      color: 0xe0512e, depthKm: 150, glow: 1, formation: 'A column of SOLID but extra-hot mantle (~200 °C above its surroundings) rising slowly from deep in the mantle. Near the top, falling pressure lets it partially melt.', minerals: 'Hot peridotite', age: 'Stays ~fixed while the plate above slides past — that is the whole trick.' },
    asthenosphere: { name: 'Asthenosphere',       type: 'Mantle (ductile)',    color: 0x8a2f22, depthKm: 150, glow: 0, formation: 'Ordinary ductile mantle around the plume — solid rock that flows.', minerals: 'Peridotite', age: 'The plume is only slightly hotter — but that is enough.' }
  };
  function hotspotKeyAt(x, y, z) {
    var fx = NX > 1 ? x / (NX - 1) : 0;
    var fy = NY > 1 ? y / (NY - 1) : 0;
    var sea = 0.16;
    // Plate moves LEFT: active cone over the plume (right), older links downstream.
    var cone = function (cx, h) { return fy < sea && fy >= (sea - h) + Math.abs(fx - cx) * 2.4; };
    if (cone(0.70, 0.20)) return 'activeVolcano';
    if (cone(0.46, 0.17)) return 'oldIsland';
    if (cone(0.22, 0.11)) return 'seamount';        // apex below sea level — drowned
    if (fy < sea) return 'oceanWater';
    if (Math.abs(fx - 0.70) < 0.04 && fy < 0.42) return 'conduit';   // feeds ONLY the active island
    if (fy < sea + 0.12) return 'oceanCrust';
    if (Math.abs(fx - 0.70) < 0.11 && fy >= 0.42 && fy < 0.58) return 'plume';  // plume head, ponding under the plate
    if (Math.abs(fx - 0.70) < 0.055 && fy >= 0.58) return 'plume';              // plume tail from depth
    if (fy < 0.55) return 'lithMantle';
    return 'asthenosphere';
  }
  function hotspotGeotherm(depthKm, key) {
    var T = { oceanWater: 4, activeVolcano: 1150, oldIsland: 15, seamount: 4, oceanCrust: 150, lithMantle: 900, conduit: 1200, plume: 1550, asthenosphere: 1330 };
    var S = { oceanWater: 'liquid', activeVolcano: 'erupting (runny basalt)', oldIsland: 'solid (extinct, eroding)', seamount: 'solid (drowned)', oceanCrust: 'solid', lithMantle: 'solid (rigid)', conduit: 'molten', plume: 'solid — but ~200 °C hotter than its surroundings', asthenosphere: 'solid (ductile — flows)' };
    return { tempC: (T[key] != null ? T[key] : Math.round(15 + depthKm * 25)), presMPa: Math.round(depthKm * 30), state: (S[key] || 'solid') };
  }

  var SCENES = {
    crust: {
      id: 'crust', label: '⛰️ Layered crust', gen: rockKeyAt, palette: ROCKS, order: ROCK_ORDER, voxelKeys: ROCK_ORDER,
      geotherm: crustGeotherm, kmPerWorldH: 10.8,
      features: { volcano: 1, water: 1, fossils: 1, cores: 1, cycle: 1, dating: 1, quiz: 1, crossSection: 1, history: 1 },
      blurb: ''
    },
    geode: {
      id: 'geode', label: '💎 Crystal cavern', gen: geodeKeyAt, palette: GEODE_ROCKS,
      order: ['limestone', 'chalcedony', 'agate', 'quartz', 'amethyst'], voxelKeys: ['limestone', 'chalcedony', 'agate', 'quartz', 'amethyst'],
      geotherm: crustGeotherm, kmPerWorldH: 2.0,
      features: {},
      blurb: 'Acidic groundwater dissolved a VOID in limestone (karst); mineral-rich water then precipitated a chalcedony/agate rind and grew quartz & amethyst crystals INWARD into the open space. Slow growth + room = big crystals — the same rule that makes granite coarse. Amethyst’s purple = trace iron + natural irradiation. Geodes take 10³–10⁶ years.'
    },
    deepEarth: {
      id: 'deepEarth', label: '🌍 Deep Earth', gen: deepEarthKeyAt, palette: DEEPEARTH_ROCKS,
      order: ['crust', 'upperMantle', 'lowerMantle', 'outerCore', 'innerCore'], voxelKeys: ['crust', 'upperMantle', 'lowerMantle', 'outerCore', 'innerCore'],
      geotherm: deepEarthGeotherm, kmPerWorldH: 6371,
      features: {},
      blurb: 'A radial slice to Earth’s centre (schematic — not to scale). Four shells: a thin brittle CRUST; a SOLID MANTLE that convects by slow creep — it is NOT molten lava, only a tiny % melts near the top; a LIQUID iron–nickel OUTER CORE whose convection is the geodynamo that powers Earth’s magnetic field (our shield against the solar wind); and a SOLID INNER CORE that — despite being HOTTER than the outer core (≈ 5200 °C, about the Sun’s surface) — stays solid because the crushing pressure raises iron’s melting point above the local temperature. We know the outer core is liquid because S-waves can’t pass through it. Slice the globe to reveal the core.'
    },
    subduction: {
      id: 'subduction', label: '🌊 Subduction zone', gen: subductionKeyAt, palette: SUBDUCTION_ROCKS,
      order: ['oceanWater', 'oceanCrust', 'contCrust', 'slab', 'lithMantle', 'wedge', 'arcMagma', 'arcVolcano', 'asthenosphere'],
      voxelKeys: ['oceanWater', 'oceanCrust', 'contCrust', 'slab', 'lithMantle', 'wedge', 'arcMagma', 'arcVolcano', 'asthenosphere'],
      geotherm: subductionGeotherm, kmPerWorldH: 200,
      features: {},
      blurb: 'A convergent margin (schematic — not to scale). A dense OCEANIC plate on the left bends at the trench and sinks beneath a buoyant CONTINENTAL plate on the right. The cold slab carries seawater down; at about 100 km that water escapes and lowers the melting point of the overlying MANTLE WEDGE, which partially melts — and THAT melt rises to build the line of arc volcanoes (the Andes, Cascades, Japan). Three myths busted: the asthenosphere is SOLID rock that flows (not a liquid the plates float on); the magma comes from the fluxed WEDGE, not the melting slab; and continental crust is too buoyant to subduct. Fly in to feel the COLD slab against the HOT wedge.'
    },
    ridge: {
      id: 'ridge', label: '🌋 Mid-ocean ridge', gen: ridgeKeyAt, palette: RIDGE_ROCKS,
      order: ['oceanWater', 'sediment', 'basaltN', 'basaltR', 'dikes', 'gabbro', 'axialMagma', 'vent', 'lithMantle', 'asthenosphere'],
      voxelKeys: ['oceanWater', 'sediment', 'basaltN', 'basaltR', 'dikes', 'gabbro', 'axialMagma', 'vent', 'lithMantle', 'asthenosphere'],
      geotherm: ridgeGeotherm, kmPerWorldH: 30,
      features: {},
      blurb: 'A divergent boundary (schematic — not to scale): the place new seafloor is BORN. Mantle wells up beneath the rift, melts as the pressure drops, and freezes into three stacked layers — pillow basalt, sheeted dikes, gabbro (the ophiolite sequence). The pillow basalts record Earth’s magnetic field as they cool, so field REVERSALS paint symmetric stripes on both flanks — the tape-recorder evidence that proved seafloor spreading in 1963. Young crust rides HIGH because it is hot; as it ages it cools, sinks, and gathers sediment — depth and sediment are both clocks. Mid-ocean ridges wrap the planet like seams on a baseball: Earth’s longest mountain range and most of its volcanism, almost all of it unseen underwater. Find the black smoker on the right flank.'
    },
    hotspot: {
      id: 'hotspot', label: '🏝️ Hotspot chain', gen: hotspotKeyAt, palette: HOTSPOT_ROCKS,
      order: ['oceanWater', 'activeVolcano', 'oldIsland', 'seamount', 'oceanCrust', 'lithMantle', 'conduit', 'plume', 'asthenosphere'],
      voxelKeys: ['oceanWater', 'activeVolcano', 'oldIsland', 'seamount', 'oceanCrust', 'lithMantle', 'conduit', 'plume', 'asthenosphere'],
      geotherm: hotspotGeotherm, kmPerWorldH: 150,
      features: {},
      blurb: 'Intraplate volcanism (schematic — not to scale): volcanoes far from ANY plate boundary. A plume of solid-but-extra-hot mantle rises from deep below and partially melts near the top; the melt burns through the moving plate to build a SHIELD volcano of runny basalt — broad and gentle, nothing like a steep arc stratovolcano. The plume stays ~fixed while the PLATE slides past, so each volcano is carried off its magma supply, goes extinct, erodes, and sinks: active island over the plume, extinct island downstream, drowned seamount beyond. Age increasing down the chain is textbook evidence that plates move — Hawaii’s chain continues 6,000 km as the Emperor Seamounts.'
    }
  };
  var SCENE = SCENES.crust;


  var SCENE_COMPARISONS = {
    crust: { concept: 'Relative dating', process: 'Deposition, intrusion, and heat', evidence: 'Superposition, cross-cutting, and a metamorphic rim', direction: 'Top -> depth; a cutting feature is younger', outcome: 'A sequence of rock events' },
    geode: { concept: 'Mineral growth', process: 'Groundwater, precipitation, and open-space growth', evidence: 'Wall-to-center bands and crystal size', direction: 'Cavity wall -> center', outcome: 'A growth sequence inside a dissolved void' },
    deepEarth: { concept: 'Earth structure', process: 'Layered shells, pressure, and seismic waves', evidence: 'S-wave shadow plus solid/liquid states', direction: 'Surface -> center', outcome: 'A model of hidden interior layers' },
    subduction: { concept: 'Convergent plate motion', process: 'Cold slab descent and water fluxing the mantle wedge', evidence: 'Trench, slab, wedge, and volcanic arc', direction: 'Ocean plate -> trench -> arc', outcome: 'A causal path from plate motion to magma' },
    ridge: { concept: 'Seafloor spreading', process: 'Upwelling, decompression melting, and cooling', evidence: 'Symmetric magnetic stripes and older flanks', direction: 'Ridge axis -> older seafloor', outcome: 'New ocean crust moving away from the axis' },
    hotspot: { concept: 'Intraplate volcanism', process: 'A relatively fixed plume beneath a moving plate', evidence: 'Age and elevation progression along a chain', direction: 'Plume -> plate-motion trail', outcome: 'A volcanic chain that records plate motion' }
  };
  var SCENE_COMPARISON_INSIGHTS = {
    'crust+geode': 'Both scenes use position to read time, but the direction changes: layers read downward while crystals grow inward from a cavity wall.',
    'crust+ridge': 'Both scenes use age patterns, but crust layers use relative relationships while ridge stripes record magnetic history as new seafloor spreads.',
    'crust+subduction': 'The crust scene reconstructs a sequence from rock relationships; subduction reconstructs a living cause-and-effect system from plate motion to magma.',
    'crust+hotspot': 'Both can reveal time through rock position, but a hotspot chain records movement across distance while layered crust records stacked events.',
    'deepEarth+ridge': 'Both involve mantle material, yet seismic evidence reveals deep Earth structure while magnetic stripes reveal new crust forming at the surface.',
    'deepEarth+subduction': 'Both distinguish solid from liquid or flowing material, but deep Earth uses wave behavior while subduction uses temperature, density, and water.',
    'geode+subduction': 'Water matters in both scenes: groundwater builds mineral layers in a cavity, while slab water changes the melting behavior of the mantle wedge.',
    'ridge+subduction': 'These are opposite plate-boundary stories: a ridge creates crust as plates separate, while subduction recycles crust as plates converge.',
    'hotspot+ridge': 'Both can build basaltic volcanoes, but ridge volcanism marks a plate boundary while hotspot volcanism occurs within a moving plate.',
    'hotspot+subduction': 'Both produce volcanic chains, but subduction links volcanoes to a plate boundary while a hotspot chain records a plate moving over a plume.'
  };
  function defaultComparisonScene(id) { return id === 'crust' ? 'geode' : 'crust'; }
  function sceneComparisonFor(id) { return SCENE_COMPARISONS[id] || SCENE_COMPARISONS.crust; }
  function sceneComparisonInsight(a, b) {
    var key = [a, b].sort().join('+');
    return SCENE_COMPARISON_INSIGHTS[key] || 'Compare the driving process and the evidence pattern. Ask what changes, what stays constant, and which observation would distinguish these two scenes.';
  }

  // Each world now has a small, explicit field mission. The 3D model remains
  // open-ended, but the mission gives learners a reason to explore and a
  // finish line they can explain with evidence.
  var SCENE_MISSIONS = {
    crust: {
      eyebrow: 'Relative dating fieldwork',
      subtitle: 'Read layers, expose the pluton, and use evidence to reconstruct crust history.',
      question: 'How can rock layers reveal a sequence of events?',
      notice: ['Deeper sedimentary layers are older.', 'A feature that cuts layers is younger.', 'Heat can transform nearby rock.'],
      evidencePrompt: 'Identify three materials, inspect a core, then explain superposition and cross-cutting.',
      checklist: [
        { id: 'materials', label: 'Identify three materials', check: function (c) { return c.identifiedCount >= 3; } },
        { id: 'core', label: 'Read one drill core', check: function (c) { return !!c.core; } },
        { id: 'quiz', label: 'Answer one dating question', check: function (c) { return !!c.quizAnswered; } }
      ],
      signal: null
    },
    geode: {
      eyebrow: 'Mineral-growth fieldwork',
      subtitle: 'Trace how groundwater builds a crystal cavern from the wall inward.',
      question: 'Why do different minerals appear in a geode’s layers?',
      notice: ['Groundwater dissolves a cavity.', 'Bands grow in pulses from the wall.', 'Open space lets crystals grow large.'],
      evidencePrompt: 'Follow the growth sequence and explain why the largest crystals formed last.',
      checklist: [
        { id: 'layers', label: 'Identify rind, bands, and crystals', check: function (c) { return c.hasKeys(['chalcedony', 'agate', 'quartz']); } },
        { id: 'sequence', label: 'Trace the growth sequence', check: function (c) { return c.signalComplete; } },
        { id: 'quiz', label: 'Answer one crystal question', check: function (c) { return !!c.quizAnswered; } }
      ],
      signal: { title: 'Crystal growth sequence', prompt: 'Reveal each layer in the order it formed.', steps: [
        { key: 'chalcedony', label: '1 · Wall rind', body: 'Microcrystalline silica precipitates first on the limestone cavity wall.' },
        { key: 'agate', label: '2 · Banded pulses', body: 'Mineral-rich water arrives in pulses, leaving concentric agate bands.' },
        { key: 'quartz', label: '3 · Open-space crystals', body: 'Clear quartz and amethyst grow inward; slow growth plus room makes large points.' }
      ] }
    },
    deepEarth: {
      eyebrow: 'Seismic evidence fieldwork',
      subtitle: 'Probe Earth’s shells and use wave behavior to infer what lies inside.',
      question: 'How do scientists know the outer core is liquid?',
      notice: ['The mantle is solid but flows slowly.', 'S-waves cannot cross liquid.', 'Pressure can keep hotter inner-core iron solid.'],
      evidencePrompt: 'Compare the mantle and both cores, then explain the seismic evidence for a liquid outer core.',
      checklist: [
        { id: 'cores', label: 'Compare outer and inner core', check: function (c) { return c.hasKeys(['outerCore', 'innerCore']); } },
        { id: 'waves', label: 'Trace the seismic evidence', check: function (c) { return c.signalComplete; } },
        { id: 'quiz', label: 'Answer one core question', check: function (c) { return !!c.quizAnswered; } }
      ],
      signal: { title: 'Seismic probe', prompt: 'Use the evidence trail to test each shell.', steps: [
        { key: 'upperMantle', label: '1 · Solid mantle', body: 'The mantle is solid rock that creeps and convects over geologic time.' },
        { key: 'outerCore', label: '2 · S-wave shadow', body: 'S-waves do not pass through the liquid outer core; that shadow is key evidence.' },
        { key: 'innerCore', label: '3 · Pressure-frozen center', body: 'The inner core is hotter yet solid because pressure raises iron’s melting point.' }
      ] }
    },
    subduction: {
      eyebrow: 'Convergent-boundary fieldwork',
      subtitle: 'Follow a cold slab downward and find where arc magma is born.',
      question: 'Why does a volcano form above the slab instead of inside it?',
      notice: ['Oceanic crust is cold and dense.', 'Slab water escapes at depth.', 'The mantle wedge melts and feeds the arc.'],
      evidencePrompt: 'Connect slab, water, mantle wedge, and volcano in one causal explanation.',
      checklist: [
        { id: 'slab', label: 'Compare slab and mantle wedge', check: function (c) { return c.hasKeys(['slab', 'wedge']); } },
        { id: 'arc', label: 'Trace water to arc magma', check: function (c) { return c.signalComplete; } },
        { id: 'quiz', label: 'Answer one subduction question', check: function (c) { return !!c.quizAnswered; } }
      ],
      signal: { title: 'Subduction cause-and-effect', prompt: 'Follow the process from plate motion to volcano.', steps: [
        { key: 'slab', label: '1 · Cold slab descends', body: 'Dense oceanic lithosphere bends into the trench and carries seawater downward.' },
        { key: 'wedge', label: '2 · Water fluxes the wedge', body: 'Water lowers the mantle wedge’s melting point; the slab itself mostly does not melt.' },
        { key: 'arcMagma', label: '3 · Arc magma rises', body: 'Partial melt rises through the overriding plate and feeds the volcanic arc.' }
      ] }
    },
    ridge: {
      eyebrow: 'Seafloor-spreading fieldwork',
      subtitle: 'Read magnetic stripes, crustal layers, and sediment as clocks of ocean-floor age.',
      question: 'What evidence proves that new seafloor spreads from a ridge?',
      notice: ['New crust forms at the axis.', 'Magnetic reversals make symmetric stripes.', 'Older seafloor is deeper and more sediment-covered.'],
      evidencePrompt: 'Use polarity, depth, and sediment thickness to explain seafloor spreading.',
      checklist: [
        { id: 'polarity', label: 'Compare normal and reversed basalt', check: function (c) { return c.hasKeys(['basaltN', 'basaltR']); } },
        { id: 'spread', label: 'Trace the spreading sequence', check: function (c) { return c.signalComplete; } },
        { id: 'quiz', label: 'Answer one ridge question', check: function (c) { return !!c.quizAnswered; } }
      ],
      signal: { title: 'Spreading evidence', prompt: 'Move from the axis outward and read the tape recorder.', steps: [
        { key: 'axialMagma', label: '1 · New melt at the axis', body: 'Upwelling mantle melts as pressure drops; basaltic magma makes new crust.' },
        { key: 'basaltN', label: '2 · Normal polarity', body: 'Pillow basalt freezes and records the direction of Earth’s magnetic field.' },
        { key: 'basaltR', label: '3 · Reversed mirror', body: 'Reversals create matching stripes on both flanks, proving spreading.' }
      ] }
    },
    hotspot: {
      eyebrow: 'Intraplate-motion fieldwork',
      subtitle: 'Read an island chain as a record of a moving plate over a fixed plume.',
      question: 'How can a volcano chain reveal plate motion?',
      notice: ['The plume stays roughly fixed.', 'The plate carries volcanoes away from the melt.', 'Age increases toward extinct and drowned islands.'],
      evidencePrompt: 'Use island age and shape to explain how the plate moved across the plume.',
      checklist: [
        { id: 'chain', label: 'Compare active, extinct, and drowned volcanoes', check: function (c) { return c.hasKeys(['activeVolcano', 'oldIsland', 'seamount']); } },
        { id: 'motion', label: 'Trace the motion sequence', check: function (c) { return c.signalComplete; } },
        { id: 'quiz', label: 'Answer one hotspot question', check: function (c) { return !!c.quizAnswered; } }
      ],
      signal: { title: 'Hotspot motion timeline', prompt: 'Read the chain from active volcano to drowned seamount.', steps: [
        { key: 'activeVolcano', label: '1 · Active over plume', body: 'Runny basalt erupts above the plume and builds a broad shield volcano.' },
        { key: 'oldIsland', label: '2 · Carried downstream', body: 'Plate motion removes the island from its magma supply; erosion begins.' },
        { key: 'seamount', label: '3 · Drowned seamount', body: 'Cooling, sinking crust and erosion carry the oldest link below sea level.' }
      ] }
    }
  };
  function setScene(id) { SCENE = SCENES[id] || SCENES.crust; }
  function sceneJourneyFor(sceneId) {
    var mission = SCENE_MISSIONS[sceneId] || SCENE_MISSIONS.crust;
    if (mission.signal && Array.isArray(mission.signal.steps) && mission.signal.steps.length) {
      return mission.signal.steps.map(function (step) { return { key: step.key, label: step.label.replace(/^\d+\s*·\s*/, ''), body: step.body }; });
    }
    return [
      { key: 'layers', label: 'Read the layers', body: 'Start with the sedimentary layers: deeper layers are generally older.' },
      { key: 'cross-cutting', label: 'Find what cuts', body: 'A pluton or other feature that cuts across layers formed after the layers it cuts.' },
      { key: 'heat', label: 'Notice the heat', body: 'Heat from the intrusion can transform nearby rock, adding a later event to the story.' }
    ];
  }


  var SCENE_BEACONS = {
    crust: [
      { id: 'layers', stage: 0, label: 'Layer stack', key: 'sandstone', view: 'front', detail: 'Sedimentary layers preserve a relative-age sequence: deeper layers generally formed first.' },
      { id: 'intrusion', stage: 1, label: 'Cross-cutting pluton', key: 'intrusion', view: 'front', detail: 'The granite pluton cuts across the layers, so it formed after the rocks it cuts.' },
      { id: 'baked-rim', stage: 2, label: 'Baked metamorphic rim', key: 'marble', view: 'top', detail: 'Heat from the intrusion transforms nearby limestone into marble, recording contact metamorphism.' }
    ],
    geode: [
      { id: 'wall-rind', stage: 0, label: 'Wall rind', key: 'chalcedony', view: 'iso', detail: 'Microcrystalline silica precipitates first on the cavity wall.' },
      { id: 'banded-pulses', stage: 1, label: 'Banded pulses', key: 'agate', view: 'front', detail: 'Mineral-rich water arrives in pulses, leaving concentric agate bands.' },
      { id: 'open-space', stage: 2, label: 'Open-space crystals', key: 'quartz', view: 'iso', detail: 'Quartz and amethyst grow inward where open space lets crystals become large.' }
    ],
    deepEarth: [
      { id: 'solid-mantle', stage: 0, label: 'Solid mantle', key: 'upperMantle', view: 'iso', detail: 'The mantle is solid rock that creeps and convects over geologic time.' },
      { id: 's-wave-shadow', stage: 1, label: 'S-wave shadow', key: 'outerCore', view: 'iso', detail: 'S-waves cannot cross the liquid outer core, creating a seismic shadow.' },
      { id: 'pressure-frozen', stage: 2, label: 'Pressure-frozen center', key: 'innerCore', view: 'iso', detail: 'Extreme pressure keeps the hotter inner core solid.' }
    ],
    subduction: [
      { id: 'cold-slab', stage: 0, label: 'Cold slab', key: 'slab', view: 'front', detail: 'A dense oceanic slab sinks into the mantle at the subduction zone.' },
      { id: 'fluxed-wedge', stage: 1, label: 'Fluxed mantle wedge', key: 'wedge', view: 'front', detail: 'Water released from the slab lowers the melting point in the mantle wedge.' },
      { id: 'arc-magma', stage: 2, label: 'Arc magma', key: 'arcMagma', view: 'iso', detail: 'Magma rises above the slab and feeds a volcanic arc.' }
    ],
    ridge: [
      { id: 'axis-melt', stage: 0, label: 'New melt at axis', key: 'axialMagma', view: 'front', detail: 'Decompression melting at the ridge axis creates new basaltic crust.' },
      { id: 'normal-polarity', stage: 1, label: 'Normal polarity', key: 'basaltN', view: 'front', detail: 'Basalt records the magnetic field direction as it cools beside the ridge.' },
      { id: 'reversed-mirror', stage: 2, label: 'Reversed mirror', key: 'basaltR', view: 'top', detail: 'Symmetric magnetic stripes show that seafloor spreads away from the ridge.' }
    ],
    hotspot: [
      { id: 'active-plume', stage: 0, label: 'Active over plume', key: 'activeVolcano', view: 'iso', detail: 'A broad shield volcano forms above the active hotspot plume.' },
      { id: 'carried-island', stage: 1, label: 'Carried downstream', key: 'oldIsland', view: 'front', detail: 'Plate motion carries an older island away from its magma supply.' },
      { id: 'drowned-seamount', stage: 2, label: 'Drowned seamount', key: 'seamount', view: 'front', detail: 'Cooling, sinking crust and erosion carry the oldest volcanic link below sea level.' }
    ]
  };
  function sceneBeaconsFor(sceneId) { return (SCENE_BEACONS[sceneId] || SCENE_BEACONS.crust).map(function (item) { return Object.assign({}, item); }); }


  var SCENE_PROCESS_CUES = {
    crust: { title: 'Relative dating', summary: 'Read the layers, then follow the later heat event.', depth: 'Deeper layers are older; heat and pressure increase downward.', steps: [
      { label: 'Superposition', detail: 'Deeper sedimentary layers generally formed first.' },
      { label: 'Cross-cutting', detail: 'The pluton cuts the layers, so it formed later.' },
      { label: 'Contact heat', detail: 'Heat bakes nearby rock into a metamorphic rim.' }
    ] },
    geode: { title: 'Crystal growth', summary: 'Groundwater builds the cavern from the wall inward.', depth: 'The visual sequence moves inward from the cavity wall to open space.', steps: [
      { label: 'Wall rind', detail: 'Microcrystalline silica precipitates first.' },
      { label: 'Banded pulses', detail: 'Mineral-rich water leaves concentric bands.' },
      { label: 'Open-space crystals', detail: 'Room for growth produces larger crystal points.' }
    ] },
    deepEarth: { title: 'Seismic probe', summary: 'Wave behavior reveals the hidden shells of Earth.', depth: 'Pressure and temperature rise toward the center.', steps: [
      { label: 'Solid mantle', detail: 'Solid rock creeps and convects over geologic time.' },
      { label: 'S-wave shadow', detail: 'S-waves stop at the liquid outer core.' },
      { label: 'Pressure-frozen center', detail: 'Extreme pressure keeps the inner core solid.' }
    ] },
    subduction: { title: 'Subduction flux', summary: 'A sinking slab drives melting above it.', depth: 'Cold slab material descends into hotter mantle.' , steps: [
      { label: 'Cold slab', detail: 'Dense oceanic crust sinks into the mantle.' },
      { label: 'Fluxed wedge', detail: 'Water lowers the melting point in the mantle wedge.' },
      { label: 'Arc magma', detail: 'Magma rises and feeds a volcanic arc.' }
    ] },
    ridge: { title: 'Seafloor spreading', summary: 'New crust forms at the axis and records magnetic time.', depth: 'Fresh melt cools outward from the hot ridge axis.', steps: [
      { label: 'Axis melt', detail: 'Decompression melting creates new basaltic crust.' },
      { label: 'Normal polarity', detail: 'Cooling basalt records one magnetic direction.' },
      { label: 'Reversed mirror', detail: 'Symmetric stripes reveal spreading.' }
    ] },
    hotspot: { title: 'Hotspot track', summary: 'A moving plate carries volcanic islands away from a plume.', depth: 'The active plume is hottest; older crust cools and sinks.', steps: [
      { label: 'Active plume', detail: 'A broad shield volcano forms above the plume.' },
      { label: 'Carried downstream', detail: 'Plate motion removes the island from its magma supply.' },
      { label: 'Drowned seamount', detail: 'Cooling, sinking crust carries the oldest link below sea level.' }
    ] }
  };
  function sceneProcessCueFor(sceneId) {
    var cue = SCENE_PROCESS_CUES[sceneId] || SCENE_PROCESS_CUES.crust;
    return { title: cue.title, summary: cue.summary, depth: cue.depth, steps: cue.steps.map(function (item) { return Object.assign({}, item); }) };
  }

  function sceneJourneyProgressFor(sceneId, data) {
    var source = data || {};
    var mission = SCENE_MISSIONS[sceneId] || SCENE_MISSIONS.crust;
    var journey = sceneJourneyFor(sceneId);
    var signals = source.sceneSignals && typeof source.sceneSignals === 'object' ? source.sceneSignals : {};
    var signalIndex = Number.isFinite(signals[sceneId]) ? signals[sceneId] : -1;
    if (mission.signal) return journey.map(function (_, index) { return signalIndex >= index; });
    var byScene = source.identifiedByScene && typeof source.identifiedByScene === 'object' ? source.identifiedByScene : {};
    var identified = byScene[sceneId] || {};
    var notebook = source.notebook && typeof source.notebook === 'object' ? source.notebook : {};
    var evidence = Array.isArray(notebook.evidence) ? notebook.evidence.filter(function (item) { return item.scene === sceneId; }) : [];
    var hasCore = !!identified.intrusion || evidence.some(function (item) { return item.kind === 'core'; });
    var hasHeat = !!identified.marble || !!identified.hornfels || evidence.some(function (item) { return /(heat|metamorph|marble|hornfels|baked)/i.test(String(item.detail || '') + ' ' + String(item.label || '')); });
    return [Object.keys(identified).length >= 3, hasCore, hasHeat];
  }
  function sceneProgressFor(sceneId, data) {
    var source = data || {}, mission = SCENE_MISSIONS[sceneId] || SCENE_MISSIONS.crust;
    var byScene = (source.identifiedByScene && typeof source.identifiedByScene === 'object') ? source.identifiedByScene : {};
    var identified = byScene[sceneId] || {};
    var quizByScene = (source.quizByScene && typeof source.quizByScene === 'object') ? source.quizByScene : {};
    var quizState = quizByScene[sceneId] || {};
    var signalIndex = (source.sceneSignals && Number.isFinite(source.sceneSignals[sceneId])) ? source.sceneSignals[sceneId] : -1;
    var sequenceComplete = !!(source.sequenceByScene && source.sequenceByScene[sceneId]);
    var quizMisconceptions = quizState.misconceptions && typeof quizState.misconceptions === 'object' ? quizState.misconceptions : {};
    var notebook = source.notebook && typeof source.notebook === 'object' ? source.notebook : {};
    var evidence = Array.isArray(notebook.evidence) ? notebook.evidence.filter(function (item) { return item.scene === sceneId; }) : [];
    var context = {
      identified: identified,
      identifiedCount: Object.keys(identified).length,
      quizAnswered: (quizState.answered || 0) > 0,
      core: evidence.some(function (item) { return item.kind === 'core'; }),
      signalComplete: !!(mission.signal && signalIndex >= mission.signal.steps.length - 1),
      signalIndex: signalIndex,
      evidence: evidence,
      hasKeys: function (keys) { return keys.every(function (key) { return !!identified[key]; }); }
    };
    var checks = (mission.checklist || []).map(function (item) { return { id: item.id, label: item.label, complete: !!item.check(context) }; });
    var signalTotal = mission.signal && mission.signal.steps ? mission.signal.steps.length : 0;
    return {
      id: sceneId,
      label: SCENES[sceneId] ? SCENES[sceneId].label : sceneId,
      done: checks.filter(function (item) { return item.complete; }).length,
      total: checks.length,
      complete: checks.every(function (item) { return item.complete; }),
      checks: checks,
      identifiedCount: context.identifiedCount,
      evidenceCount: evidence.length,
      quizAttempts: Number(quizState.answered) || 0,
      quizCorrect: Number(quizState.correct) || 0,
      misconceptionCount: Object.keys(quizMisconceptions).reduce(function (sum, key) { return sum + (Number(quizMisconceptions[key]) || 0); }, 0),
      signalStep: signalTotal ? Math.max(0, Math.min(signalIndex + 1, signalTotal)) : 0,
      signalTotal: signalTotal,
      sequenceComplete: sequenceComplete
    };
  }

  // Classroom layer: a compact lesson guide sits above the same student workflow.
  var LESSON_GUIDE = {
    title: 'Geology Explorer lesson guide',
    duration: '25-35 minutes',
    objectives: [
      'Use observations to reconstruct a geologic process.',
      'Support a claim with at least two pieces of evidence.',
      'Explain how a process changes rocks, layers, or landforms.'
    ],
    phases: [
      { id: 'launch', title: 'Launch the question', minutes: '3 min', action: 'Read the scene question and ask students to predict what evidence would help.' },
      { id: 'investigate', title: 'Investigate', minutes: '12-15 min', action: 'Students select materials, follow the process trail, and collect notebook evidence.' },
      { id: 'assess', title: 'Build the explanation', minutes: '8-10 min', action: 'Students write a claim, cite two observations, and connect evidence to the process.' },
      { id: 'debrief', title: 'Debrief', minutes: '5 min', action: 'Compare explanations and name which observation changed the initial idea.' }
    ],
    prompts: ['What did you observe?', 'Which observation is strongest evidence?', 'What process connects the evidence to your claim?']
  };
  function evaluateCER(mission, context, notebook) {
    var claim = String((notebook && notebook.claim) || '').trim();
    var explanation = String((notebook && notebook.explanation) || '').trim();
    var evidenceCount = context && Array.isArray(context.evidence) ? context.evidence.length : 0;
    var causal = /(because|therefore|so|shows|suggests|means|caused|led to|as a result)/i.test(explanation);
    var mapStatus = context && context.evidenceMapStatus && typeof context.evidenceMapStatus === 'object' ? context.evidenceMapStatus : null;
    var mapReady = !mapStatus || !!mapStatus.ready;
    var evidenceMet = evidenceCount >= 2 && mapReady;
    var evidenceFeedback = evidenceCount < 2
      ? 'Collect at least two observations from the scene or notebook.'
      : (!mapReady ? 'Map your evidence across Observation, Process, and Outcome before using it in the explanation.' : 'You collected at least two observations and connected them in the Evidence Map.');
    var criteria = [
      { id: 'claim', label: 'Claim', met: claim.length >= 12, feedback: claim.length >= 12 ? 'Your response makes a specific, testable claim.' : 'State what you think happened and answer the scene question.' },
      { id: 'evidence', label: 'Evidence', met: evidenceMet, feedback: evidenceFeedback },
      { id: 'reasoning', label: 'Reasoning', met: explanation.length >= 30 && causal, feedback: explanation.length >= 30 && causal ? 'Your reasoning connects observations to a process.' : 'Explain why the observations support your claim using a causal link such as because, so, or therefore.' },
      { id: 'mission', label: 'Mission checks', met: !!(context && context.missionComplete), feedback: context && context.missionComplete ? 'The required scene checks are complete.' : 'Complete the scene checklist before submitting.' }
    ];
    var score = criteria.filter(function (item) { return item.met; }).length;
    return { criteria: criteria, score: score, total: criteria.length, ready: score === criteria.length };
  }


  var EVIDENCE_MAP_ROLES = [
    { id: 'observation', label: 'Observation', prompt: 'What did I directly observe?', help: 'A visible or measured detail.' },
    { id: 'process', label: 'Process', prompt: 'How did it happen?', help: 'The geological change that connects the details.' },
    { id: 'outcome', label: 'Outcome', prompt: 'What does it support?', help: 'The pattern or result that supports your claim.' }
  ];
  function evidenceMapForScene(map, sceneId) {
    var source = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    var scoped = source[sceneId];
    return scoped && typeof scoped === 'object' && !Array.isArray(scoped) ? scoped : {};
  }
  function evidenceMapStatus(evidence, map) {
    var list = Array.isArray(evidence) ? evidence : [];
    var allowed = {}, counts = {};
    EVIDENCE_MAP_ROLES.forEach(function (role) { allowed[role.id] = true; counts[role.id] = 0; });
    var assigned = 0;
    list.forEach(function (item) {
      var role = item && map ? map[item.id] : null;
      if (!allowed[role]) return;
      assigned += 1;
      counts[role] += 1;
    });
    var missingRoles = EVIDENCE_MAP_ROLES.filter(function (role) { return counts[role.id] === 0; }).map(function (role) { return role.id; });
    var mappedRoleCount = EVIDENCE_MAP_ROLES.length - missingRoles.length;
    return { total: list.length, assigned: assigned, mappedRoleCount: mappedRoleCount, unassigned: list.length - assigned, counts: counts, missingRoles: missingRoles, ready: mappedRoleCount === EVIDENCE_MAP_ROLES.length };
  }
  function evidenceMapDraft(mission, evidence, map) {
    var list = Array.isArray(evidence) ? evidence : [];
    var assignments = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    var groups = { observation: [], process: [], outcome: [] };
    var usedIds = [];
    function describe(item) {
      var label = String((item && item.label) || 'Evidence');
      var detail = String((item && item.detail) || '').trim();
      return detail ? label + ': ' + detail : label;
    }
    list.forEach(function (item) {
      var role = assignments[item && item.id];
      if (!groups[role]) return;
      groups[role].push(describe(item));
      usedIds.push(item.id);
    });
    var status = evidenceMapStatus(list, assignments);
    var observationText = groups.observation.join('; ');
    var processText = groups.process.join('; ');
    var outcomeText = groups.outcome.join('; ');
    var claim = outcomeText
      ? 'The evidence supports the outcome that ' + outcomeText + '.'
      : 'The evidence supports an explanation of ' + String((mission && mission.question) || 'the geologic process').replace(/[?.!]+$/, '') + '.';
    var parts = [];
    if (observationText) parts.push('I observed ' + observationText + '.');
    if (processText) parts.push('The process connects these observations because ' + processText + '.');
    if (outcomeText) parts.push('Together, these details support the outcome that ' + outcomeText + '.');
    if (!parts.length) parts.push('Add mapped observations, a process, and an outcome to build the explanation.');
    return { claim: claim, explanation: parts.join(' '), ready: status.ready, usedIds: usedIds, status: status };
  }
  var MISSION_HINTS = {
    crust: { materials: 'Select any three materials so you can compare their depth, type, and formation story.', core: 'Use a drill-core site on the right; read the colored bands from youngest at the top to oldest at depth.', quiz: 'Switch to Assess, open the quiz, and answer one question about superposition or cross-cutting.' },
    geode: { layers: 'Select the chalcedony rind, agate bands, and quartz crystal; compare where each sits in the cavity.', sequence: 'Open the crystal growth sequence and reveal the steps from the wall inward.', quiz: 'Switch to Assess, open the crystal quiz, and test why open space makes larger crystals.' },
    deepEarth: { cores: 'Select both the outer core and inner core so you can compare state and pressure.', waves: 'Follow the seismic probe to the S-wave shadow; liquid cannot carry shear waves.', quiz: 'Switch to Assess, answer the core question, and use the S-wave result in your explanation.' },
    subduction: { slab: 'Select the cold slab and hot mantle wedge; the slab carries water but the wedge supplies the melt.', arc: 'Follow the sequence from descending slab to water release to rising arc magma.', quiz: 'Use the quiz to check why the slab itself mostly does not melt.' },
    ridge: { polarity: 'Select normal and reversed basalt; matching magnetic records on both flanks are the key comparison.', spread: 'Follow the sequence from axial melt to normal basalt to the reversed mirror stripe.', quiz: 'Use the quiz to connect magnetic reversals with new seafloor.' },
    hotspot: { chain: 'Select the active volcano, old island, and seamount; age and elevation change along the chain.', motion: 'Follow the sequence from the plume to the carried island to the drowned seamount.', quiz: 'Use the quiz to test whether the plate or plume is moving.' }
  };
  function nextMissionHint(mission, context, sceneId) {
    var hints = MISSION_HINTS[sceneId] || {};
    var checks = mission && mission.checklist ? mission.checklist : [];
    for (var i = 0; i < checks.length; i++) {
      if (!checks[i].check(context)) return { id: checks[i].id, label: checks[i].label, text: hints[checks[i].id] || 'Return to the checklist and collect the next observation.' };
    }
    return { id: 'complete', label: 'Mission complete', text: 'Your required observations are ready to support a CER explanation.' };
  }
  var MISSION_ACTIONS = {
    materials: { target: 'materials', mode: 'investigate', label: 'Open material list', message: 'Material list focused. Select the requested materials to complete this check.' },
    layers: { target: 'materials', mode: 'investigate', label: 'Open material list', message: 'Material list focused. Select the rind, bands, and crystals to compare them.' },
    cores: { target: 'materials', mode: 'investigate', label: 'Open material list', message: 'Material list focused. Select the outer and inner core to compare their states.' },
    slab: { target: 'materials', mode: 'investigate', label: 'Open material list', message: 'Material list focused. Select the cold slab and mantle wedge.' },
    polarity: { target: 'materials', mode: 'investigate', label: 'Open material list', message: 'Material list focused. Select normal and reversed basalt.' },
    chain: { target: 'materials', mode: 'investigate', label: 'Open material list', message: 'Material list focused. Select the active volcano, old island, and seamount.' },
    core: { target: 'core', mode: 'investigate', label: 'Open drill core', message: 'Drill-core controls focused. Choose a site to read its layers.' },
    sequence: { target: 'signal', mode: 'investigate', label: 'Open process timeline', message: 'Process timeline focused. Reveal each step in order.' },
    waves: { target: 'signal', mode: 'investigate', label: 'Open process timeline', message: 'Seismic evidence timeline focused. Reveal the S-wave shadow step.' },
    arc: { target: 'signal', mode: 'investigate', label: 'Open process timeline', message: 'Cause-and-effect timeline focused. Follow water from the slab to arc magma.' },
    spread: { target: 'signal', mode: 'investigate', label: 'Open process timeline', message: 'Spreading timeline focused. Reveal the mirrored magnetic stripe.' },
    motion: { target: 'signal', mode: 'investigate', label: 'Open process timeline', message: 'Hotspot timeline focused. Follow the plate-motion trail.' },
    quiz: { target: 'quiz', mode: 'assess', label: 'Open quiz', message: 'Assessment quiz focused. Answer one question to complete this check.' }
  };
  function missionActionFor(checkId) { return MISSION_ACTIONS[checkId] || null; }

  var SCENE_ORIENTATION = {
    crust: { scale: '~10.8 km deep', direction: 'Surface -> depth', read: 'Read the layers from top to bottom. Deeper sedimentary layers are generally older; a cutting feature is younger.' },
    geode: { scale: '~2 km model span', direction: 'Cavity wall -> center', read: 'Read mineral growth inward from the limestone wall. The open center is not empty by accident; it records space for crystals to grow.' },
    deepEarth: { scale: 'Earth radius 6,371 km', direction: 'Surface -> center', read: 'This is a radial slice, not a flat stack. Use the shells and seismic signal to infer state.' },
    subduction: { scale: '~200 km model span', direction: 'Left plate -> trench -> right arc', read: 'Follow the cold slab downward. Water leaves the slab, fluxes the wedge, and the melt rises toward the arc.' },
    ridge: { scale: '~30 km model span', direction: 'Ridge axis -> older flanks', read: 'The axis is youngest. Read outward for older crust, thicker sediment, and mirrored magnetic history.' },
    hotspot: { scale: '~150 km model span', direction: 'Plume -> plate-motion trail', read: 'The plume is the reference point. The plate carries volcanoes away, so age increases toward the drowned seamount.' }
  };

  // Short, learner-facing definitions that bridge scene observations to the
  // vocabulary used in the mission, quiz, and evidence notebook.
  var SCENE_VOCABULARY = {
    crust: [
      { term: 'Superposition', definition: 'In an undisturbed stack, lower sedimentary layers were deposited before the layers above them.', cue: 'Use it when you compare depth in a drill core.' },
      { term: 'Cross-cutting', definition: 'A feature that cuts across another rock formed after the rock it cuts.', cue: 'Use it when you trace the granite pluton through the layers.' },
      { term: 'Contact metamorphism', definition: 'Heat from nearby magma changes rock without melting the whole rock.', cue: 'Use it when you compare limestone with the marble rim.' }
    ],
    geode: [
      { term: 'Cavity', definition: 'An open space left when groundwater dissolves part of the host rock.', cue: 'Use it when you identify the hollow center.' },
      { term: 'Precipitation', definition: 'Dissolved minerals leave water and become solid mineral layers or crystals.', cue: 'Use it when you explain how the rind and bands formed.' },
      { term: 'Growth sequence', definition: 'Minerals that form first stay at the wall; later crystals grow inward into open space.', cue: 'Use it when you order rind, bands, and crystal points.' }
    ],
    deepEarth: [
      { term: 'Seismic shadow', definition: 'A region with fewer recorded waves because a layer bends or blocks certain seismic waves.', cue: 'Use it when you infer a liquid outer core from missing S-waves.' },
      { term: 'Convection', definition: 'Slow movement that transfers heat through a material as warmer and cooler regions circulate.', cue: 'Use it when you describe the mantle or liquid outer core.' },
      { term: 'Pressure melting point', definition: 'The temperature at which a material melts can rise when pressure increases.', cue: 'Use it when you explain why the hotter inner core is solid.' }
    ],
    subduction: [
      { term: 'Subduction', definition: 'The process in which one tectonic plate bends and sinks beneath another plate.', cue: 'Use it when you follow the cold slab toward the trench.' },
      { term: 'Mantle wedge', definition: 'The wedge-shaped mantle above a sinking slab where water helps rock partially melt.', cue: 'Use it when you locate the source of arc magma.' },
      { term: 'Flux melting', definition: 'Water lowers a rock’s melting point, allowing partial melt to form at a lower temperature.', cue: 'Use it when you connect slab water to the volcanic arc.' }
    ],
    ridge: [
      { term: 'Magnetic reversal', definition: 'A time when Earth’s magnetic field points in the opposite direction.', cue: 'Use it when you read matching polarity stripes on both sides of the ridge.' },
      { term: 'Seafloor spreading', definition: 'New ocean crust forms at a ridge and moves outward as more crust is added.', cue: 'Use it when you read the ridge axis as the youngest crust.' },
      { term: 'Decompression melting', definition: 'Hot mantle can partially melt when it rises and pressure drops, even without extra heat.', cue: 'Use it when you explain the magma lens beneath the axis.' }
    ],
    hotspot: [
      { term: 'Mantle plume', definition: 'A relatively fixed column of unusually hot mantle that can supply melt from below.', cue: 'Use it when you identify the reference point under the active volcano.' },
      { term: 'Shield volcano', definition: 'A broad, gently sloping volcano built by runny basaltic lava.', cue: 'Use it when you compare the active volcano with a steep arc volcano.' },
      { term: 'Plate-motion trail', definition: 'A line of volcanoes that records how a moving plate traveled over a relatively fixed plume.', cue: 'Use it when age increases toward the extinct island and seamount.' }
    ]
  };

  // Scene-specific process orders power the optional sequencing challenge.
  var SCENE_SEQUENCE_CHALLENGES = {
    crust: { title: 'Relative-dating event order', prompt: 'Arrange the events from earliest to latest so the layer and cutting evidence tell one story.', items: [
      { key: 'limestone', label: 'Limestone accumulates', detail: 'Shells and coral build the oldest sedimentary layer in a shallow sea.' },
      { key: 'shale', label: 'Mud settles into shale', detail: 'Calm water deposits mud above the older limestone.' },
      { key: 'sandstone', label: 'Sand becomes sandstone', detail: 'Buried sand is compacted and cemented into the upper sedimentary layer.' },
      { key: 'soil', label: 'The surface weathers', detail: 'Exposed rock breaks down into soil at the surface.' },
      { key: 'pluton', label: 'A granite pluton cuts through', detail: 'A later pulse of magma forces through the existing layers and freezes.' },
      { key: 'rim', label: 'The contact rim is baked', detail: 'Heat from the pluton changes nearby limestone and shale without melting them.' }
    ] },
    geode: { title: 'Crystal-growth order', prompt: 'Arrange the events from the first cavity-forming step to the crystals that grew last.', items: [
      { key: 'cavity', label: 'Groundwater dissolves a cavity', detail: 'Slightly acidic water leaves an open space in the limestone host.' },
      { key: 'chalcedony', label: 'A wall rind precipitates', detail: 'Microcrystalline silica lines the cavity wall first.' },
      { key: 'agate', label: 'Mineral-rich pulses leave bands', detail: 'Repeated water pulses deposit concentric agate bands.' },
      { key: 'quartz', label: 'Open-space crystals grow inward', detail: 'Quartz and amethyst use the remaining room to form large points.' }
    ] },
    deepEarth: { title: 'Earth-interior evidence order', prompt: 'Arrange the evidence path from the shell we know to the inference about the center.', items: [
      { key: 'crust', label: 'Start at the solid crust', detail: 'The thin outer shell is the surface reference for the radial model.' },
      { key: 'upperMantle', label: 'Cross the solid mantle', detail: 'Mantle rock is solid but creeps and convects over geologic time.' },
      { key: 'outerCore', label: 'Find the S-wave shadow', detail: 'Missing S-waves reveal a liquid outer core.' },
      { key: 'innerCore', label: 'Explain the solid inner core', detail: 'Extreme pressure raises iron’s melting point and keeps the hotter center solid.' }
    ] },
    subduction: { title: 'Subduction cause-and-effect', prompt: 'Arrange the chain from plate motion to the volcano at the surface.', items: [
      { key: 'slab', label: 'A cold slab descends', detail: 'Dense oceanic lithosphere bends into the trench and carries water downward.' },
      { key: 'wedge', label: 'Water fluxes the mantle wedge', detail: 'Released water lowers the wedge’s melting point; the slab mostly does not melt.' },
      { key: 'arcMagma', label: 'Arc magma rises', detail: 'Partial melt rises through the overriding plate.' },
      { key: 'arcVolcano', label: 'The volcanic arc forms', detail: 'Magma reaches the surface and builds an arc volcano.' }
    ] },
    ridge: { title: 'Seafloor-spreading order', prompt: 'Arrange the evidence outward from the ridge axis to the older ocean floor.', items: [
      { key: 'axialMagma', label: 'Magma rises at the axis', detail: 'Upwelling mantle partially melts as pressure drops.' },
      { key: 'basaltN', label: 'New basalt records polarity', detail: 'Pillow basalt cools and locks in the magnetic field direction.' },
      { key: 'basaltR', label: 'A reversal makes a mirror stripe', detail: 'Later basalt records the opposite field direction on both flanks.' },
      { key: 'sediment', label: 'Older seafloor gathers sediment', detail: 'Farther crust cools, sinks, and accumulates a thicker sediment cover.' }
    ] },
    hotspot: { title: 'Hotspot plate-motion trail', prompt: 'Arrange the chain from the active volcano over the plume to the oldest drowned link.', items: [
      { key: 'plume', label: 'A relatively fixed plume supplies melt', detail: 'Extra-hot mantle rises beneath one location.' },
      { key: 'activeVolcano', label: 'A shield volcano grows', detail: 'Runny basalt builds a broad, gentle volcano over the plume.' },
      { key: 'oldIsland', label: 'The plate carries an island away', detail: 'The volcano goes extinct after moving off the magma supply.' },
      { key: 'seamount', label: 'The oldest link drowns', detail: 'Cooling, sinking crust and erosion carry the former island below sea level.' }
    ] }
  };
  function sequenceChallengeFor(sceneId) { return SCENE_SEQUENCE_CHALLENGES[sceneId] || SCENE_SEQUENCE_CHALLENGES.crust; }
  function sequenceInitialOrder(sceneId) {
    var items = sequenceChallengeFor(sceneId).items, order = [], i;
    for (i = 0; i < items.length; i += 2) order.push(items[i].key);
    for (i = 1; i < items.length; i += 2) order.push(items[i].key);
    if (sequenceIsCorrect(sceneId, order)) order.reverse();
    return order;
  }
  function sequenceIsCorrect(sceneId, order) {
    var items = sequenceChallengeFor(sceneId).items;
    return Array.isArray(order) && order.length === items.length && items.every(function (item, index) { return order[index] === item.key; });
  }

  function sequenceMoveBefore(order, movingKey, targetKey) {
    var next = Array.isArray(order) ? order.slice() : [];
    var from = next.indexOf(movingKey), target = next.indexOf(targetKey);
    if (from < 0 || target < 0 || movingKey === targetKey) return next;
    next.splice(from, 1);
    target = next.indexOf(targetKey);
    if (target < 0) return Array.isArray(order) ? order.slice() : [];
    next.splice(target, 0, movingKey);
    return next;
  }

  // three.js engine (imperative; lives on window[ENGINE_KEY])
  // ── three.js engine (imperative; lives on window[ENGINE_KEY]) ───────────────
  function initEngine(container, opts) {
    var THREE = window.THREE;
    var eng = { disposed: false };
    var cnv = document.createElement('canvas');
    // The labelled viewport container owns the WebGL alternative and keyboard mode.
    cnv.setAttribute('aria-hidden', 'true');
    cnv.style.width = '100%'; cnv.style.height = '100%'; cnv.style.display = 'block';
    container.appendChild(cnv);
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    // subtle vertical-gradient sky (deep blue up top → near-black below) for depth
    var bgCanvas = document.createElement('canvas');
    // Internal texture buffer: it conveys no content beyond the described viewport.
    bgCanvas.setAttribute('aria-hidden', 'true'); bgCanvas.width = 4; bgCanvas.height = 256;
    var bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) { var bgGrad = bgCtx.createLinearGradient(0, 0, 0, 256); bgGrad.addColorStop(0, '#13243f'); bgGrad.addColorStop(0.45, '#0a1322'); bgGrad.addColorStop(1, '#06080f'); bgCtx.fillStyle = bgGrad; bgCtx.fillRect(0, 0, 4, 256); }
    var bgTex = new THREE.CanvasTexture(bgCanvas);
    scene.background = bgTex;
    scene.fog = new THREE.Fog(0x0a1322, 30, 70);
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(WORLD.w * 1.15, WORLD.h * 1.05, WORLD.d * 1.4);
    var TARGET = new THREE.Vector3(0, -WORLD.h * 0.05, 0);
    camera.lookAt(TARGET); // aim at the block immediately — keeps it CENTRED even if OrbitControls never loads
    var controls = null, orbitTried = false;
    // first-person explorer state (default off; drives the SAME camera, never OrbitControls)
    var fp = { active: false, intro: null, pos: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0, input: { fwd: 0, strafe: 0, vert: 0, sprint: false }, turn: { yaw: 0, pitch: 0 }, reduced: false, savedPos: null, savedTgt: null, savedEnabled: true, lastHud: 0, lastKey: '__none', speed: WORLD.h * 0.5 };
    var fpPrev = null;   // last pointer point for drag-look (separate from `down` so taps still pick)
    function ensureControls() {
      if (controls) return;
      if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.dampingFactor = 0.08; controls.target.copy(TARGET); controls.minDistance = 8; controls.maxDistance = 60;
        controls.update();
        controls.enabled = !fp.active;   // if orbit loads while FP is on, keep it suspended until exit
      } else if (!orbitTried) {
        // host may have set _threeLoaded without OrbitControls (stem_lab_module.js:1492) — load it ourselves
        orbitTried = true;
        try { var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'; document.head.appendChild(s); } catch (e) {}
      }
    }
    ensureControls();
    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x6b5640, 0.55)); // sky-blue from above, warm ground-bounce below → dimensional shading
    var keyL = new THREE.DirectionalLight(0xfff1d0, 1.0); keyL.position.set(12, 20, 14); scene.add(keyL);
    var fillL = new THREE.DirectionalLight(0x90b4ff, 0.35); fillL.position.set(-14, 6, -10); scene.add(fillL);
    var magmaGlow = new THREE.PointLight(0xff5522, 1.8, 44); magmaGlow.position.set(0, -WORLD.h * 0.5, 0); scene.add(magmaGlow);
    // soft additive heat-glow radiating from beneath the crust (the magma source)
    var underGlowGeo = new THREE.SphereGeometry(3.6, 16, 12), underGlowMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
    var underGlow = new THREE.Mesh(underGlowGeo, underGlowMat); underGlow.position.set(0, -(NY - 1) / 2 * VOXEL - 1.6, 0); scene.add(underGlow);

    var voxels = [];
    for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) for (var z = 0; z < NZ; z++) voxels.push({ x: x, y: y, z: z, key: SCENE.gen(x, y, z), j: 0.87 + (((x * 41 + y * 71 + z * 13) % 100) / 100) * 0.26 });
    var removed = {};
    function vkey(v) { return v.x + ',' + v.y + ',' + v.z; }
    function worldPos(v) { return [(v.x - (NX - 1) / 2) * VOXEL, ((NY - 1) / 2 - v.y) * VOXEL, (v.z - (NZ - 1) / 2) * VOXEL]; }

    var geo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.05 });
    var mesh = new THREE.InstancedMesh(geo, mat, voxels.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    var dummy = new THREE.Object3D(), col = new THREE.Color(), WHITE = new THREE.Color(0xffffff);
    var instanceToVoxel = [];
    var sliceZ = 0, excavate = false, highlightKey = null, showStage = 99;
    var hoverBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(VOXEL * 1.04, VOXEL * 1.04, VOXEL * 1.04)), new THREE.LineBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.85 }));
    hoverBox.visible = false; hoverBox.renderOrder = 2; scene.add(hoverBox);
    var treeMeshes = [], lastHover = 0;
    var WATER_Y = ((NY - 1) / 2 - 1.8 * NY / 12) * VOXEL; // water table perched in the sandstone, above the shale (depth scales with detail)
    var waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.w, WORLD.d), new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.4, roughness: 0.25, metalness: 0.15, side: THREE.DoubleSide }));
    waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(0, WATER_Y, 0); waterMesh.visible = false; waterMesh.renderOrder = 1; scene.add(waterMesh);

    // ── Volcano: the EXTRUSIVE counterpart to the intrusive pluton (erupt() animates it) ──
    var surfTopY = ((NY - 1) / 2 + 0.5) * VOXEL;   // world Y of the ground surface
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

    function visible(v) { if (v.key === 'void') return false; var fa = FORMED_AT[v.key]; if (fa == null) fa = 0; return !removed[vkey(v)] && v.z >= sliceZ && fa <= showStage; }
    function rebuild() {
      var i = 0; instanceToVoxel.length = 0;
      // presence pass first → per-voxel ambient occlusion (depth/structure cue)
      var present = {};
      for (var pk = 0; pk < voxels.length; pk++) { var pv = voxels[pk]; if (visible(pv)) present[pv.x + ',' + pv.y + ',' + pv.z] = 1; }
      for (var k = 0; k < voxels.length; k++) {
        var v = voxels[k]; if (!visible(v)) continue;
        var p = worldPos(v); dummy.position.set(p[0], p[1], p[2]); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        col.setHex((SCENE.palette[v.key] || ROCKS[v.key] || { color: 0x888888 }).color);
        col.multiplyScalar(v.j || 1);                     // per-voxel grain → natural, non-plastic rock texture
        // ambient occlusion (enclosed → darker) + gentle depth shade (deeper → darker)
        var ao = 1 - 0.42 * (aoCount(present, v.x, v.y, v.z) / 6);
        var depthShade = 0.74 + 0.26 * (1 - v.y / Math.max(1, NY - 1));
        col.multiplyScalar(ao * depthShade);
        if ((SCENE.palette[v.key] || {}).glow) col.multiplyScalar(1.5);   // molten / core layers read hotter & glowing (re-boosted past the depth shade)
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
        var x = Math.round(cells[i][0] * NX / 14), z = Math.round(cells[i][1] * NZ / 14), p = worldPos({ x: x, y: 0, z: z });
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
        var rx = Math.round(rockCells[r][0] * NX / 14), rz = Math.round(rockCells[r][1] * NZ / 14), rp = worldPos({ x: rx, y: 0, z: rz });
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
    function onDown(e) { down = { x: e.clientX, y: e.clientY }; if (fp.active) fpPrev = { x: e.clientX, y: e.clientY }; }
    function onUp(e) { if (!down) return; var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); down = null; fpPrev = null; if (moved < 6 && !fp.active) pick(e); }   // no tap-pick from inside the rock during FP
    cnv.addEventListener('pointerdown', onDown); cnv.addEventListener('pointerup', onUp);
    // drag-to-look while FP is active (no Pointer Lock); uses fpPrev so `down` stays intact for tap-to-identify
    function fpLookMove(e) {
      if (!fp.active || !fpPrev) return;
      if (e.buttons !== undefined && (e.buttons & 1) === 0) { fpPrev = null; return; }   // button released (maybe off-canvas) → stop; no buttonless rotation on re-entry
      fp.yaw -= (e.clientX - fpPrev.x) * 0.0046; fp.pitch = fpClampPitch(fp.pitch - (e.clientY - fpPrev.y) * 0.0046); fpPrev = { x: e.clientX, y: e.clientY };
    }
    function onMoveHover(e) {
      if (fp.active) return;   // FP owns the pointer (drag-look); skip the hover raycast
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
    function onLeaveHover() { hoverBox.visible = false; if (fp.active) { down = null; fpPrev = null; } }   // dropping the look-drag off the canvas ends it cleanly
    cnv.addEventListener('pointermove', onMoveHover); cnv.addEventListener('pointerleave', onLeaveHover);
    function onLost(e) { e.preventDefault(); if (opts.onContextLost) opts.onContextLost(); }
    cnv.addEventListener('webglcontextlost', onLost, false);

    // ── first-person controller (drives `camera`; pure math lives in the module seams) ──
    function enterFP(o) {
      if (fp.active) return;                                  // idempotent — no double-binding
      fp.active = true; fp.reduced = !!(o && o.reduced);
      fp.savedPos = camera.position.clone();
      fp.savedTgt = controls ? controls.target.clone() : TARGET.clone();
      fp.savedEnabled = controls ? controls.enabled : true;
      if (controls) controls.enabled = false;                // hand the camera to FP
      var seed = fpSeedPose(SCENE.id);
      fp.pos = { x: seed.pos.x, y: seed.pos.y, z: seed.pos.z }; fp.yaw = seed.yaw; fp.pitch = seed.pitch;
      fp.input = { fwd: 0, strafe: 0, vert: 0, sprint: false }; fp.turn = { yaw: 0, pitch: 0 }; fp.lastKey = '__none'; fp.lastHud = 0;
      fp.intro = fp.reduced ? null : { t: 0, from: camera.position.clone(), dur: 0.7 };   // eased "drop in"
      hoverBox.visible = false;
      cnv.addEventListener('pointermove', fpLookMove);
      if (fp.reduced) applyFP(0);                            // snap to the eye-point immediately
    }
    function exitFP() {
      if (!fp.active) return;
      fp.active = false; fp.intro = null;
      cnv.removeEventListener('pointermove', fpLookMove); fpPrev = null;
      fp.input = { fwd: 0, strafe: 0, vert: 0, sprint: false }; fp.turn = { yaw: 0, pitch: 0 };
      if (fp.savedPos) camera.position.copy(fp.savedPos);
      if (controls) { if (fp.savedTgt) controls.target.copy(fp.savedTgt); controls.enabled = fp.savedEnabled; controls.update(); }
      else if (fp.savedTgt) camera.lookAt(fp.savedTgt);
      if (opts.onFpExit) opts.onFpExit();
    }
    function applyFP(dt) {
      if (fp.intro) {                                         // drop-in tween: ease from the orbit pose into the eye-point
        fp.intro.t += dt / fp.intro.dur; var tt = fp.intro.t < 1 ? fp.intro.t : 1; var e = easeInOutCubic(tt);
        var f0 = fp.intro.from;
        camera.position.set(f0.x + (fp.pos.x - f0.x) * e, f0.y + (fp.pos.y - f0.y) * e, f0.z + (fp.pos.z - f0.z) * e);
        var fw0 = fpForward(fp.yaw, fp.pitch);
        camera.lookAt(camera.position.x + fw0.x, camera.position.y + fw0.y, camera.position.z + fw0.z);
        if (tt >= 1) fp.intro = null;
        return;                                               // ignore movement until the dive finishes
      }
      if (fp.turn.yaw || fp.turn.pitch) { fp.yaw += fp.turn.yaw * 1.7 * dt; fp.pitch = fpClampPitch(fp.pitch + fp.turn.pitch * 1.7 * dt); }   // keyboard look (drag-look writes fp.yaw/pitch directly)
      var fwd = fpForward(fp.yaw, fp.pitch);
      var spd = fp.speed * (fp.input.sprint ? 2 : 1);
      fp.pos = fpStep(fp.pos, fwd, fp.input, dt, spd, fpBounds());
      var moving = !!(fp.input.fwd || fp.input.strafe || fp.input.vert);
      var bob = fpBob(t, moving, fp.reduced, 0.05);
      camera.position.set(fp.pos.x, fp.pos.y + bob, fp.pos.z);
      camera.lookAt(fp.pos.x + fwd.x, fp.pos.y + fwd.y, fp.pos.z + fwd.z);
      var now = (window.performance && performance.now) ? performance.now() : 0;
      if (now - fp.lastHud > 110) {                           // ~9Hz HUD sample; only push on a layer change
        fp.lastHud = now;
        var p = fpProbe(fp.pos.x, fp.pos.y, fp.pos.z);
        if (p && p.key !== fp.lastKey) { fp.lastKey = p.key; if (opts.onFpProbe) opts.onFpProbe(p); }
      }
    }

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
      if (!controls) ensureControls();   // OrbitControls may load a moment after the engine starts
      if (fp.active) { try { applyFP(0.016); } catch (e) {} } else if (controls) controls.update();
      renderer.render(scene, camera);
    }
    loop();

    // ── WebXR (optional): stand at the outcrop — walk around/through the voxel
    //    block at human scale (thumbstick glide + teleport + comfort vignette via
    //    AlloVR). Loads only when a headset is present; the 2D orbit/FP camera is
    //    untouched (loop paused while presenting). Seat/bounds ON-DEVICE TUNABLE. ──
    var _geoVR = null, _geoVRBtnOff = null;
    try {
      if (navigator.xr && navigator.xr.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-vr').then(function (ok) {
          if (!ok || eng.disposed) return;
          var ensureV = function (cb) {
            if (window.AlloModules && window.AlloModules.AlloVR) { cb(window.AlloModules.AlloVR); return; }
            var base = 'https://alloflow-cdn.pages.dev/', q = '';
            try {
              var scr = document.querySelectorAll('script[src]');
              for (var i = 0; i < scr.length; i++) {
                var m = (scr[i].getAttribute('src') || '').match(/^(.*\/)(?:allo_vr_module|prim3d_module|stem_lab\/stem_tool_[a-z0-9]+)\.js(\?.*)?$/);
                if (m) { base = m[1]; q = m[2] || ''; break; }
              }
            } catch (e) {}
            try {
              var s = document.createElement('script'); s.src = base + 'allo_vr_module.js' + q; s.async = true;
              s.onload = function () { cb(window.AlloModules && window.AlloModules.AlloVR); };
              s.onerror = function () { cb(null); };
              document.head.appendChild(s);
            } catch (e) { cb(null); }
          };
          ensureV(function (V) {
            if (!V || eng.disposed) return;
            try {
              _geoVR = V.enable({
                THREE: THREE, renderer: renderer, scene: scene, camera: camera,
                // world is ~NX(≈14) units wide; scale 0.35 → the block towers like a real
                // road-cut outcrop; seated just outside the front face looking in
                seat: { position: [0, -NY * 0.45, NZ * 1.05], scale: 0.35, moveSpeed: 1.4 },
                bounds: { minX: -NX * 1.6, maxX: NX * 1.6, minZ: -NZ * 1.6, maxZ: NZ * 1.6 },
                render: function () { renderer.render(scene, camera); },
                pauseLoop: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } },
                resumeLoop: function () { if (!eng.disposed) loop(); }
              });
              _geoVRBtnOff = V.mountButton(container, _geoVR, null,
                { style: 'position:absolute;left:10px;bottom:10px;z-index:12;border:none;background:#4f46e5;color:#fff;border-radius:999px;padding:6px 13px;font-size:12px;font-weight:800;cursor:pointer;' });
            } catch (e) {}
          });
        }).catch(function () {});
      }
    } catch (e) {}

    eng.setView = function (name) {
      if (fp.active) return;   // camera is owned by first-person mode
      if (!controls) return;
      var V = { iso: [[NX * 1.15, NY * 1.05, NZ * 1.4], [0, -NY * 0.18, 0]], front: [[0, -NY * 0.1, NZ * 1.75], [0, -NY * 0.18, 0]], top: [[0.01, NY * 2.4, 0.02], [0, 0, 0]] }[name];
      if (!V) return;
      camera.position.set(V[0][0], V[0][1], V[0][2]);
      controls.target.set(V[1][0], V[1][1], V[1][2]);
      controls.update();
    };
    eng.setSlice = function (z) { sliceZ = z | 0; waterMesh.scale.z = (NZ - sliceZ) / NZ; waterMesh.position.z = sliceZ / 2 * VOXEL; rebuild(); };
    eng.setExcavate = function (b) { excavate = !!b; };
    eng.setWaterTable = function (b) { waterMesh.visible = !!b; };
    eng.erupt = function () { startEruption(); };
    eng.setHighlight = function (k) { highlightKey = (k && SCENE.voxelKeys && SCENE.voxelKeys.indexOf(k) >= 0) ? k : null; rebuild(); };
    eng.setStage = function (n) { showStage = (n == null) ? 99 : n; rebuild(); };
    eng.reset = function () { removed = {}; sliceZ = 0; rebuild(); };
    eng.setFirstPerson = function (on, o) { if (on) enterFP(o || {}); else exitFP(); };
    eng.fpInput = function (cmd, v) { if (cmd === 'move' && v) fp.input = Object.assign(fp.input, v); else if (cmd === 'look' && v) fp.turn = Object.assign(fp.turn, v); };
    eng.fpActive = function () { return !!fp.active; };
    eng._fpExit = exitFP;
    eng.dispose = function () {
      try { if (_geoVRBtnOff) _geoVRBtnOff(); } catch (e) {}
      try { if (_geoVR && _geoVR.destroy) _geoVR.destroy(); _geoVR = null; } catch (e) {}
      try { exitFP(); } catch (e) {}   // tear down FP listeners first so nothing leaks across re-init
      eng.disposed = true; if (raf) cancelAnimationFrame(raf);
      cnv.removeEventListener('pointerdown', onDown); cnv.removeEventListener('pointerup', onUp); cnv.removeEventListener('webglcontextlost', onLost);
      cnv.removeEventListener('pointermove', onMoveHover); cnv.removeEventListener('pointerleave', onLeaveHover);
      if (ro) try { ro.disconnect(); } catch (e) {}
      try { geo.dispose(); mat.dispose(); renderer.dispose(); hoverBox.geometry.dispose(); hoverBox.material.dispose(); waterMesh.geometry.dispose(); waterMesh.material.dispose(); if (eng._treeGeo) eng._treeGeo.forEach(function (g) { g.dispose(); }); if (eng._treeMat) eng._treeMat.forEach(function (m) { m.dispose(); }); if (eng._volcanoDispose) eng._volcanoDispose.forEach(function (x) { x.dispose(); }); if (bgTex) bgTex.dispose(); underGlowGeo.dispose(); underGlowMat.dispose(); } catch (e) {}
      if (cnv.parentNode) cnv.parentNode.removeChild(cnv);
    };
    return eng;
  }

  // Test hook: expose the PURE generators/helpers so the science + AO logic can be
  // unit-tested in jsdom (the WebGL itself is Canvas-smoke-only). Also a characterization
  // baseline that locks current strata before the upcoming resolution refactor.
  try {
    window.__alloGeologyPure = {
      rockKeyAt: rockKeyAt, geodeKeyAt: geodeKeyAt, deepEarthKeyAt: deepEarthKeyAt, subductionKeyAt: subductionKeyAt, ridgeKeyAt: ridgeKeyAt, hotspotKeyAt: hotspotKeyAt, hasFossilAt: hasFossilAt, computeCore: computeCore, rockFacts: rockFacts, aoCount: aoCount,
      crustGeotherm: crustGeotherm, deepEarthGeotherm: deepEarthGeotherm, subductionGeotherm: subductionGeotherm, ridgeGeotherm: ridgeGeotherm, hotspotGeotherm: hotspotGeotherm, setGrid: setGrid, setScene: setScene, RES_MULT: RES_MULT, WORLD: WORLD,
      fpForward: fpForward, fpClampPitch: fpClampPitch, fpBounds: fpBounds, fpStep: fpStep, fpWorldToVoxel: fpWorldToVoxel,
      fpSeedPose: fpSeedPose, fpBob: fpBob, layerChanged: layerChanged, fpBlurb: fpBlurb, fpBust: fpBust, fpProbe: fpProbe, fpAnnounceText: fpAnnounceText, easeInOutCubic: easeInOutCubic,
      scenes: function () { return Object.keys(SCENES); }, sceneId: function () { return SCENE.id; }, quizBanks: function () { return QUIZ_BANKS; }, quizRemediation: quizRemediation, missions: function () { return SCENE_MISSIONS; }, lessonGuide: function () { return LESSON_GUIDE; }, evaluateCER: evaluateCER, evidenceMapDraft: evidenceMapDraft, nextMissionHint: nextMissionHint, missionAction: missionActionFor, sceneComparisons: function () { return SCENE_COMPARISONS; }, sceneComparisonInsight: sceneComparisonInsight, sceneProgress: sceneProgressFor, orientation: function () { return SCENE_ORIENTATION; }, vocabulary: function () { return SCENE_VOCABULARY; }, sequenceChallenges: function () { return SCENE_SEQUENCE_CHALLENGES; }, sequenceInitialOrder: sequenceInitialOrder, sequenceIsCorrect: sequenceIsCorrect, sequenceMoveBefore: sequenceMoveBefore, sceneJourney: sceneJourneyFor, sceneBeacons: sceneBeaconsFor, processCues: sceneProcessCueFor, sceneJourneyProgress: sceneJourneyProgressFor, evidenceMapRoles: function () { return EVIDENCE_MAP_ROLES; }, evidenceMapForScene: evidenceMapForScene, evidenceMapStatus: evidenceMapStatus,
      grid: function () { return { NX: NX, NY: NY, NZ: NZ, KM_PER_VOXEL: KM_PER_VOXEL, VOXEL: VOXEL }; }
    };
  } catch (e) {}

  window.StemLab.registerTool('geologyExplorer', {
    name: 'Geology Explorer',
    icon: '⛰️',
    desc: 'Excavate a 3D crust cross-section, identify rocks, read layers, and find the pluton that cuts through them.',
    category: 'geology',
    aliases: ['geology', 'rocks', 'minerals', 'crust layers'],
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
      var isContrast = !!ctx.isContrast;
      // Contrast uses the dark structural branch, then the host's high-contrast
      // overrides replace utility colors with black, white, and amber.
      var isDark = !!ctx.isDark || isContrast;
      var d = (ctx.toolData && ctx.toolData.geologyExplorer) || {};
      var ttsAvailable = typeof ctx.callTTS === 'function' || !!(window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function');
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast || function () {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      function upd(key, val) { if (ctx.update) ctx.update('geologyExplorer', key, val); }

      // ── hooks (all unconditional) ──
      var containerRef = React.useRef(null);
      var fsRef = React.useRef(null);
      var fsToggleRef = React.useRef(null);
      var fsPrevFocusRef = React.useRef(null);
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
      var cmp = React.useState([]); var compareList = cmp[0], setCompareList = cmp[1];
      var qz = React.useState(false); var quizOn = qz[0], setQuizOn = qz[1];
      var qi = React.useState(0); var quizI = qi[0], setQuizI = qi[1];
      var qa = React.useState(null); var quizAns = qa[0], setQuizAns = qa[1];
      var wt = React.useState(false); var waterOn = wt[0], setWaterOn = wt[1];
      var erp = React.useState(-1); var eruptStage = erp[0], setEruptStage = erp[1];
      var eruptTimer = React.useRef(null);
      var threeReady = !!(ctx.toolData && ctx.toolData._threeLoaded) && !!window.THREE;
      var rsr = React.useState((d.res === 'low' || d.res === 'high') ? d.res : 'standard'); var res = rsr[0], setRes = rsr[1];
      var scn = React.useState((d.scene && SCENES[d.scene]) ? d.scene : 'crust'); var scene = scn[0], setSceneState = scn[1];
      var md = React.useState((d.mode === 'investigate' || d.mode === 'assess') ? d.mode : 'explore'); var mode = md[0], setModeState = md[1];
      var lgs = React.useState(!!d.lessonGuide); var lessonGuideOpen = lgs[0], setLessonGuideOpen = lgs[1];
      var hs = React.useState(false); var hintShown = hs[0], setHintShown = hs[1];
      var vbs = React.useState(false); var vocabularyOpen = vbs[0], setVocabularyOpen = vbs[1];
      var seqo = React.useState(function () { return sequenceInitialOrder(scene); }); var sequenceOrder = seqo[0], setSequenceOrder = seqo[1];
      var seqf = React.useState(null); var sequenceFeedback = seqf[0], setSequenceFeedback = seqf[1];
      var seqd = React.useState(function () { return (d.sequenceByScene && typeof d.sequenceByScene === 'object') ? d.sequenceByScene : {}; }); var sequenceCompletionByScene = seqd[0], setSequenceCompletionByScene = seqd[1];
      var sequenceComplete = !!sequenceCompletionByScene[scene];
      var seqdrag = React.useState(null); var sequenceDragKey = seqdrag[0], setSequenceDragKey = seqdrag[1];
      var seqtap = React.useState(null); var sequenceTapKey = seqtap[0], setSequenceTapKey = seqtap[1];
      var jst = React.useState(0); var sceneJourneyStep = jst[0], setSceneJourneyStep = jst[1];
      var rts = React.useState(null); var routeTarget = rts[0], setRouteTarget = rts[1];
      var csc = React.useState(defaultComparisonScene(scene)); var compareSceneId = csc[0], setCompareSceneId = csc[1];
      var cst = React.useState(0); var compareStage = cst[0], setCompareStage = cst[1];
      var bcn = React.useState(null); var activeBeaconId = bcn[0], setActiveBeaconId = bcn[1];
      var bto = React.useState(false); var beaconTourOn = bto[0], setBeaconTourOn = bto[1];
      var bts = React.useState(0); var beaconTourStep = bts[0], setBeaconTourStep = bts[1];
      var cvs = React.useState('iso'); var cameraViewState = cvs[0], setCameraViewState = cvs[1];
      var tts = React.useState(false); var ttsSpeaking = tts[0], setTtsSpeaking = tts[1];
      var ttsAudioRef = React.useRef(null);
      var ttsSessionRef = React.useRef(0);
      var ttsContextRef = React.useRef({ scene: scene, mode: mode });
      var sg = React.useState((d.sceneSignals && d.sceneSignals[scene]) || 0); var signalStep = sg[0], setSignalStep = sg[1];
      var initialNotebook = (d.notebook && typeof d.notebook === 'object') ? d.notebook : {};
      var notebookSeed = {
        evidence: Array.isArray(initialNotebook.evidence) ? initialNotebook.evidence : [],
        evidenceMap: initialNotebook.evidenceMap && typeof initialNotebook.evidenceMap === 'object' && !Array.isArray(initialNotebook.evidenceMap) ? initialNotebook.evidenceMap : {},
        claim: typeof initialNotebook.claim === 'string' ? initialNotebook.claim : '',
        explanation: typeof initialNotebook.explanation === 'string' ? initialNotebook.explanation : '',
        reflection: typeof initialNotebook.reflection === 'string' ? initialNotebook.reflection : '',
        submitted: !!initialNotebook.submitted,
        rubric: initialNotebook.rubric && typeof initialNotebook.rubric === 'object' ? initialNotebook.rubric : null
      };
      var nb = React.useState(notebookSeed); var notebook = nb[0], setNotebook = nb[1];
      var notebookRef = React.useRef(notebook); notebookRef.current = notebook;
      var identifiedBySceneRef = React.useRef((d.identifiedByScene && typeof d.identifiedByScene === 'object') ? d.identifiedByScene : {});
      identifiedBySceneRef.current = (d.identifiedByScene && typeof d.identifiedByScene === 'object') ? d.identifiedByScene : identifiedBySceneRef.current;
      var fpp = React.useState(false); var fpOn = fpp[0], setFpOn = fpp[1];          // first-person explorer (default off)
      var fph = React.useState(null); var fpHud = fph[0], setFpHud = fph[1];          // live "you are here" readout
      var fpToggleRef = React.useRef(null); var fpPrevFocusRef = React.useRef(null); var fpAnnAtRef = React.useRef(0);   // SR announce debounce clock
      setScene(scene); setGrid(res);   // sync active scene + module grid (NX/NY/NZ/VOXEL/KM_PER_VOXEL) before render + effects read them
      var feat = SCENE.features;

      function announce(msg) { try { var lr = document.getElementById('allo-live-geology'); if (lr) { lr.textContent = ''; setTimeout(function () { lr.textContent = String(msg || ''); }, 30); } } catch (e) {} }
      function routeTargetClass(target) { return routeTarget === target ? ' ring-2 ring-amber-400 ring-offset-2 ' : ''; }
      function stopReadAloud() {
        ttsSessionRef.current += 1;
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        var audio = ttsAudioRef.current;
        ttsAudioRef.current = null;
        if (audio) {
          try { audio.pause(); audio.currentTime = 0; audio.onended = null; audio.onerror = null; } catch (e) {}
        }
        setTtsSpeaking(false);
      }
      function browserReadAloud(text, expectedSession) {
        if (expectedSession != null && expectedSession !== ttsSessionRef.current) return;
        stopReadAloud();
        if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
          setTtsSpeaking(false); announce('Read aloud is not available in this browser.');
          return;
        }
        try {
          var utterance = new window.SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.onend = function () { setTtsSpeaking(false); };
          utterance.onerror = function () { setTtsSpeaking(false); };
          setTtsSpeaking(true);
          window.speechSynthesis.speak(utterance);
        } catch (e) { setTtsSpeaking(false); announce('Read aloud could not start.'); }
      }
      function playGeneratedTts(url, text, expectedSession) {
        if (!url || expectedSession !== ttsSessionRef.current || typeof window.Audio !== 'function') return false;
        var audio;
        try { audio = new window.Audio(url); } catch (e) { return false; }
        ttsAudioRef.current = audio;
        var finish = function () {
          if (expectedSession !== ttsSessionRef.current) return;
          ttsAudioRef.current = null;
          setTtsSpeaking(false);
        };
        audio.onended = finish;
        audio.onerror = function () { finish(); browserReadAloud(text, expectedSession); };
        setTtsSpeaking(true);
        try {
          var pending = audio.play();
          if (pending && typeof pending.catch === 'function') pending.catch(function () { finish(); browserReadAloud(text, expectedSession); });
        } catch (e) { finish(); browserReadAloud(text, expectedSession); }
        return true;
      }
      function readAloud(text) {
        var clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
        if (!clean) return;
        stopReadAloud();
        var session = ttsSessionRef.current;
        if (typeof ctx.callTTS === 'function') {
          setTtsSpeaking(true);
          try {
            var result = ctx.callTTS(clean, null, null, { force: true });
            if (result && typeof result.then === 'function') {
              result.then(function (url) {
                if (!url) { browserReadAloud(clean, session); return; }
                if (!playGeneratedTts(url, clean, session)) browserReadAloud(clean, session);
              }).catch(function () { browserReadAloud(clean, session); });
            } else if (!playGeneratedTts(result, clean, session)) browserReadAloud(clean, session);
          } catch (e) { browserReadAloud(clean, session); }
          return;
        }
        browserReadAloud(clean, session);
      }
      function readAloudButton(text, key, label) {
        return h('button', { key: key, type: 'button', 'data-geology-read-aloud': key, 'aria-label': ttsSpeaking ? 'Stop reading aloud' : label, onClick: function () { if (ttsSpeaking) stopReadAloud(); else if (ttsAvailable) readAloud(text); else announce('Read aloud is not available in this browser.'); }, className: 'shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ' + btnIdle }, ttsSpeaking ? 'Stop reading' : 'Read aloud');
      }
      React.useEffect(function () {
        var previous = ttsContextRef.current;
        ttsContextRef.current = { scene: scene, mode: mode };
        if (previous.scene !== scene || previous.mode !== mode) stopReadAloud();
      }, [scene, mode]);
      React.useEffect(function () {
        return function () { stopReadAloud(); };
      }, []);
      function focusMissionTarget(checkId) {
        var action = missionActionFor(checkId);
        if (!action) return;
        setRouteTarget(action.target);
        setHintShown(false);
        if (action.mode && action.mode !== mode) { setModeState(action.mode); upd('mode', action.mode); }
        if (action.target === 'quiz') { setQuizOn(true); setQuizAns(null); }
        announce(action.message);
        setTimeout(function () {
          try {
            var node = document.querySelector('[data-geology-target="' + action.target + '"]');
            if (!node) return;
            node.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'center' });
            try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); }
          } catch (e) {}
        }, 80);
      }
      function saveNotebook(next) { notebookRef.current = next; setNotebook(next); upd('notebook', next); }
      function addNotebookEvidence(kind, label, detail, key) {
        var id = [SCENE.id, kind, key || label].join(':');
        var current = notebookRef.current || { evidence: [], claim: '', explanation: '', submitted: false };
        var evidence = Array.isArray(current.evidence) ? current.evidence : [];
        if (evidence.some(function (item) { return item.id === id; })) return;
        saveNotebook(Object.assign({}, current, { evidence: evidence.concat([{ id: id, scene: SCENE.id, kind: kind, label: label, detail: detail }]) }));
      }
      function setNotebookField(field, value) {
        var current = notebookRef.current || { evidence: [], claim: '', explanation: '', submitted: false };
        saveNotebook(Object.assign({}, current, { [field]: value, submitted: false, rubric: null }));
      }
      function setEvidenceRole(itemId, role, itemLabel) {
        var roleDef = EVIDENCE_MAP_ROLES.filter(function (item) { return item.id === role; })[0];
        if (!roleDef) return;
        var current = notebookRef.current || { evidence: [], claim: '', explanation: '', submitted: false, evidenceMap: {} };
        var allMaps = current.evidenceMap && typeof current.evidenceMap === 'object' && !Array.isArray(current.evidenceMap) ? current.evidenceMap : {};
        var sceneMap = Object.assign({}, evidenceMapForScene(allMaps, SCENE.id));
        var clearing = sceneMap[itemId] === role;
        if (clearing) delete sceneMap[itemId]; else sceneMap[itemId] = role;
        var nextMap = Object.assign({}, allMaps, { [SCENE.id]: sceneMap });
        saveNotebook(Object.assign({}, current, { evidenceMap: nextMap, submitted: false, rubric: null }));
        announce(clearing ? 'Evidence mapping cleared.' : roleDef.label + ' mapping saved for ' + (itemLabel || itemId) + '.');
      }
      function selectRock(facts, viaCycle, msg) {
        setSelected(facts);
        setDatingParent(100);
        setCyclePath(function (prev) { return viaCycle ? prev.concat([facts.key]).slice(-6) : [facts.key]; });
        try { if (window[ENGINE_KEY]) window[ENGINE_KEY].setHighlight(facts.key); } catch (e) {}
        announce(msg || (facts.R.name + '. ' + facts.R.type + '. Depth about ' + facts.depthKm + ' kilometres. ' + facts.R.formation + ' ' + facts.R.age));
        var cur = identifiedRef.current || {}; if (!cur[facts.key]) { var id = Object.assign({}, cur); id[facts.key] = 1; identifiedRef.current = id; upd('identified', id); }
        var byScene = identifiedBySceneRef.current || {}, sceneIdentified = Object.assign({}, byScene[SCENE.id] || {});
        if (!sceneIdentified[facts.key]) {
          sceneIdentified[facts.key] = 1;
          byScene = Object.assign({}, byScene, { [SCENE.id]: sceneIdentified });
          identifiedBySceneRef.current = byScene;
          upd('identifiedByScene', byScene);
        }
        addNotebookEvidence('observation', facts.R.name, facts.R.formation + ' ' + facts.R.age, facts.key);
      }
      function uncoverFossil(key) {
        var cur = fossilsRef.current || {}; if (cur[key]) return; // already collected this layer's fossil
        var nf = Object.assign({}, cur); nf[key] = 1; setFound(nf); upd('fossils', nf);
        var F = FOSSILS[key], rn = ROCKS[key] ? ROCKS[key].name : 'rock';
        addNotebookEvidence('fossil', F ? F.name : 'Fossil', F ? F.tells : 'A fossil was uncovered in this sedimentary layer.', key);
        addToast('✨ ' + (F ? F.name : 'Fossil') + ' uncovered in the ' + rn + '!', 'success');
        announce('You uncovered ' + (F ? F.name : 'a fossil') + ' in the ' + rn + '. ' + (F ? F.tells : ''));
      }
      function takeCore(site) {
        var segs = computeCore(site.x, site.z);
        setCore({ id: site.id, segs: segs, blurb: site.blurb });
        addNotebookEvidence('core', site.label, segs.map(function (s) { return ROCKS[s.key].name; }).join(' → ') + '. ' + site.blurb, site.id);
        announce('Core sample, ' + site.label + '. Top to bottom: ' + segs.map(function (s) { return ROCKS[s.key].name; }).join(', ') + '. ' + site.blurb);
      }
      function sceneQuiz() { return QUIZ_BANKS[SCENE.id] || QUIZ_BANKS.crust; }
      function answerQuiz(i) {
        setQuizAns(i);
        var Q = sceneQuiz().items[quizI];
        var remediation = i === Q.correct ? null : quizRemediation(SCENE.id, quizI);
        var quizByScene = (d.quizByScene && typeof d.quizByScene === 'object') ? d.quizByScene : {};
        var previous = quizByScene[SCENE.id] || { answered: 0, correct: 0 };
        var misconceptions = previous.misconceptions && typeof previous.misconceptions === 'object' ? previous.misconceptions : {};
        if (remediation) misconceptions = Object.assign({}, misconceptions, { [remediation.id]: (Number(misconceptions[remediation.id]) || 0) + 1 });
        var nextQuizState = Object.assign({}, quizByScene, { [SCENE.id]: { answered: (Number(previous.answered) || 0) + 1, correct: (Number(previous.correct) || 0) + (i === Q.correct ? 1 : 0), misconceptions: misconceptions } });
        upd('quizByScene', nextQuizState);
        addNotebookEvidence('quiz', Q.q, (i === Q.correct ? 'Correct. ' : 'Not quite. ') + Q.why, 'question-' + quizI);
        announce((i === Q.correct ? 'Correct. ' : 'Not quite. ') + Q.why);
      }
      function retryQuiz() { setQuizAns(null); announce('Try the same question again. Use the targeted feedback, then choose an answer.'); }
      function nextQuiz() { var B = sceneQuiz().items; var n = (quizI + 1) % B.length; setQuizI(n); setQuizAns(null); announce('Question ' + (n + 1) + '. ' + B[n].q); }

      // ── formation-history playback (assembles the crust in chronological order) ──
      function clearHistTimer() { if (histTimer.current) { clearTimeout(histTimer.current); histTimer.current = null; } }
      function goStage(n) {
        setHistStage(n);
        try { if (window[ENGINE_KEY]) window[ENGINE_KEY].setStage(n); } catch (e) {}
        var s = HISTORY[n]; if (s) announce(t(s.tk, s.fb));
      }
      function motionReduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
      function playHistory() {
        clearHistTimer();
        setSelected(null); setSlice(0); setExcavate(false);
        try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].reset(); window[ENGINE_KEY].setExcavate(false); window[ENGINE_KEY].setHighlight(null); } } catch (e) {}
        var n = 0; goStage(0);
        if (motionReduced()) { goStage(HISTORY.length - 1); return; }
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
        try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].setExcavate(false); window[ENGINE_KEY].setSlice(0); window[ENGINE_KEY].setHighlight(null); if (!motionReduced()) window[ENGINE_KEY].erupt(); } } catch (e) {}
        var n = 0; eruptGo(0);
        if (motionReduced()) { eruptGo(ERUPT.length - 1); setTimeout(function () { setEruptStage(-1); selectRock(rockFacts('basalt', 0)); }, 0); return; }
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
        if (!isFs) {
          try { fsPrevFocusRef.current = document.activeElement; } catch (e) {}
        }
        setIsFs(function (v) { return !v; });
        setTimeout(function () { try { if (window[ENGINE_KEY] && window[ENGINE_KEY].resize) window[ENGINE_KEY].resize(); } catch (e) {} }, 70);
      }
      React.useEffect(function () {
        if (!isFs) return undefined;
        var dialog = fsRef.current;
        if (!dialog) return undefined;
        var boundary = dialog.closest('[data-geology-tool="true"]');
        var blocked = [];
        var current = dialog;

        // The fullscreen viewport is nested. Isolate siblings at every ancestor
        // level so the rest of the tool is hidden and inert while it is modal.
        while (boundary && current && current !== boundary) {
          var parent = current.parentElement;
          if (!parent) break;
          Array.prototype.forEach.call(parent.children, function(element) {
            if (element === current) return;
            blocked.push({
              element: element,
              hadInert: element.hasAttribute('inert'),
              inertValue: element.getAttribute('inert'),
              hadAriaHidden: element.hasAttribute('aria-hidden'),
              ariaHiddenValue: element.getAttribute('aria-hidden')
            });
            element.setAttribute('inert', '');
            element.setAttribute('aria-hidden', 'true');
          });
          current = parent;
        }

        var getFocusable = function() {
          return Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        };
        var focusInitial = function() {
          (fsToggleRef.current || dialog).focus();
        };
        function onKey(event) {
          if (event.key === 'Escape') {
            // First-person mode stops Escape at the viewport; otherwise Escape
            // reaches this listener and closes fullscreen.
            event.preventDefault();
            toggleFullscreen();
            return;
          }
          if (event.key !== 'Tab') return;
          var focusable = getFocusable();
          if (!focusable.length) {
            event.preventDefault();
            dialog.focus();
            return;
          }
          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        function onFocusIn(event) {
          if (!dialog.contains(event.target)) focusInitial();
        }

        try {
          document.addEventListener('keydown', onKey);
          document.addEventListener('focusin', onFocusIn);
        } catch (e) {}
        setTimeout(focusInitial, 0);

        return function () {
          try {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('focusin', onFocusIn);
          } catch (e) {}
          blocked.forEach(function(entry) {
            if (entry.hadInert) entry.element.setAttribute('inert', entry.inertValue || '');
            else entry.element.removeAttribute('inert');
            if (entry.hadAriaHidden) entry.element.setAttribute('aria-hidden', entry.ariaHiddenValue || '');
            else entry.element.removeAttribute('aria-hidden');
          });
          setTimeout(function() {
            var target = fsPrevFocusRef.current && fsPrevFocusRef.current.isConnected
              ? fsPrevFocusRef.current
              : fsToggleRef.current;
            if (target && typeof target.focus === 'function') target.focus();
          }, 0);
        };
      }, [isFs]);

      React.useEffect(function () {
        if (!threeReady || webglError || !containerRef.current) return;
        setScene(scene); setGrid(res);   // build the chosen scene at the chosen detail level
        if (window[ENGINE_KEY]) { try { window[ENGINE_KEY].dispose(); } catch (e) {} window[ENGINE_KEY] = null; }   // rebuild on scene/detail change
        try {
          window[ENGINE_KEY] = initEngine(containerRef.current, {
            onSelect: function (facts) { selectRock(facts); },
            onUncover: function (k) { uncoverFossil(k); },
            onFlash: function (m) { addToast(m, 'info'); },
            onFpProbe: function (p) { if (!p) return; setFpHud(p); var nw = (window.performance && performance.now) ? performance.now() : Date.now(); if (nw - fpAnnAtRef.current > 1200) { fpAnnAtRef.current = nw; announce(fpAnnounceText(p)); } },   // HUD every layer change; SR debounced so fast flight can't flood it
            onContextLost: function () { setWebglError(true); try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].dispose(); window[ENGINE_KEY] = null; } } catch (e) {} }
          });
        } catch (e) { setWebglError(true); }
        return function () { try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].dispose(); window[ENGINE_KEY] = null; } } catch (e) {} };
      }, [threeReady, webglError, res, scene]);

      // ── first-person: ARM the engine (re-runs whenever the engine is rebuilt on scene/detail change, so FP survives a world switch) ──
      React.useEffect(function () {
        if (!threeReady || webglError) return;
        var E = window[ENGINE_KEY]; if (!E || !E.setFirstPerson) return;
        var reduced = false; try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
        try { E.setFirstPerson(fpOn, { reduced: reduced }); } catch (e) {}
        return function () { try { if (window[ENGINE_KEY]) window[ENGINE_KEY].setFirstPerson(false); } catch (e) {} };
      }, [fpOn, threeReady, webglError, res, scene]);

      // ── first-person: focus + announce ONLY on a real enter/exit transition (deps [fpOn]) — never re-fired by a scene rebuild ──
      React.useEffect(function () {
        if (fpOn) {
          fpAnnAtRef.current = 0;   // let the first layer announce immediately on entry
          try { fpPrevFocusRef.current = document.activeElement; } catch (e) {}
          setTimeout(function () { try { if (containerRef.current) containerRef.current.focus(); } catch (e) {} }, 0);
          announce(t('stem.geology.fp_on', 'First-person mode on. W A S D or arrow keys to fly, Q and E for up and down, I J K L or drag to look, Escape to exit.'));
        } else {
          setFpHud(null);
          try { var pf = fpPrevFocusRef.current; if (pf && pf.focus) pf.focus(); else if (fpToggleRef.current) fpToggleRef.current.focus(); } catch (e) {}
        }
      }, [fpOn]);

      // ── first-person: keyboard, scoped to the focused viewport so it never hijacks page keys (re-binds on engine rebuild so held keys don't stall) ──
      React.useEffect(function () {
        if (!fpOn) return;
        var el = containerRef.current; if (!el) return;
        var ax = { fwd: 0, strafe: 0, vert: 0, sprint: false }, lk = { yaw: 0, pitch: 0 };
        var MOVE = { w: 'fwd+', arrowup: 'fwd+', s: 'fwd-', arrowdown: 'fwd-', a: 'strafe-', arrowleft: 'strafe-', d: 'strafe+', arrowright: 'strafe+', e: 'vert+', q: 'vert-' };
        var LOOK = { j: 'yaw+', l: 'yaw-', i: 'pitch+', k: 'pitch-' };   // keyboard turn (WCAG: look must be keyboard-operable, not drag-only)
        function pushMove() { try { if (window[ENGINE_KEY]) window[ENGINE_KEY].fpInput('move', { fwd: ax.fwd, strafe: ax.strafe, vert: ax.vert, sprint: ax.sprint }); } catch (e) {} }
        function pushLook() { try { if (window[ENGINE_KEY]) window[ENGINE_KEY].fpInput('look', { yaw: lk.yaw, pitch: lk.pitch }); } catch (e) {} }
        function set(e, on) {
          var key = (e.key || '').toLowerCase();
          if (key === 'escape') { if (on) { try { e.preventDefault(); e.stopPropagation(); } catch (x) {} setFpOn(false); } return; }   // exit FP only — don't also collapse fullscreen
          if (key === 'shift') { ax.sprint = on; pushMove(); return; }
          var m = MOVE[key]; if (m) { e.preventDefault(); ax[m.slice(0, -1)] = on ? (m.slice(-1) === '+' ? 1 : -1) : 0; pushMove(); return; }
          var lo = LOOK[key]; if (lo) { e.preventDefault(); lk[lo.slice(0, -1)] = on ? (lo.slice(-1) === '+' ? 1 : -1) : 0; pushLook(); return; }
        }
        function kd(e) { set(e, true); } function ku(e) { set(e, false); }
        el.addEventListener('keydown', kd); el.addEventListener('keyup', ku);
        return function () { el.removeEventListener('keydown', kd); el.removeEventListener('keyup', ku); try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].fpInput('move', { fwd: 0, strafe: 0, vert: 0, sprint: false }); window[ENGINE_KEY].fpInput('look', { yaw: 0, pitch: 0 }); } } catch (e) {} };
      }, [fpOn, threeReady, webglError, res, scene]);

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
            h('span', { className: muted }, t('stem.geology.temp', 'Temp')), h('span', null, (typeof f.tempC === 'number' ? '≈ ' + f.tempC : f.tempC) + ' °C'),
            h('span', { className: muted }, t('stem.geology.pressure', 'Pressure')), h('span', null, '≈ ' + f.presMPa + ' MPa'),
            (f.state && f.state !== 'solid') ? h('span', { className: muted }, t('stem.geology.state', 'State')) : null,
            (f.state && f.state !== 'solid') ? h('span', { className: 'font-semibold', style: { color: '#f59e0b' } }, f.state) : null,
            h('span', { className: muted }, t('stem.geology.forms', 'Forms by')), h('span', null, R.formation),
            h('span', { className: muted }, t('stem.geology.minerals', 'Minerals')), h('span', null, R.minerals)
          ),
          h('div', { className: 'mt-2 text-[11.5px]', style: { color: '#f59e0b' } }, '🕓 ' + R.age),
          feat.fossils
            ? (F
              ? h('div', { className: 'mt-1 text-[11.5px] ' + ink }, h('span', { 'aria-hidden': 'true' }, F.icon + ' '), h('span', { className: 'font-semibold' }, F.name), h('span', { className: muted }, ' — ' + F.tells + (SED_FOSSIL[f.key] ? ' ' + t('stem.geology.dig_fossil', 'Dig or click this layer to uncover one.') : '')))
              : h('div', { className: 'mt-1 text-[11.5px] ' + muted }, '🚫 ' + t('stem.geology.no_fossils', 'No fossils — melting and metamorphism destroy them, so geologists read time from sedimentary layers.')))
            : null,
          (feat.water && GROUNDWATER[f.key]) ? h('div', { className: 'mt-1 text-[11.5px] ' + ink }, h('span', { 'aria-hidden': 'true' }, '💧 '), h('span', { className: 'font-semibold' }, GROUNDWATER[f.key].perm), h('span', { className: muted }, ' — ' + GROUNDWATER[f.key].role)) : null,
          feat.dating
            ? h('div', { className: 'mt-1 text-[11.5px] ' + ink }, h('span', { 'aria-hidden': 'true' }, '📅 '),
              DATING[f.key]
                ? h('span', null, h('span', { className: 'font-semibold' }, 'Datable'), h('span', { className: muted }, ' — ' + DATING[f.key].parent + ' → ' + DATING[f.key].daughter + ', half-life ' + DATING[f.key].hl.toLocaleString() + ' Ma'))
                : h('span', { className: muted }, datingNote(f)))
            : null,
          h('button', { type: 'button', onClick: function () { setCompareList(function (prev) { var i = prev.indexOf(f.key); if (i >= 0) return prev.filter(function (k) { return k !== f.key; }); return prev.concat([f.key]).slice(-2); }); }, 'aria-pressed': compareList.indexOf(f.key) >= 0 ? 'true' : 'false', className: 'mt-2 transition-colors active:scale-[0.97] text-[11px] font-bold px-2.5 py-1 rounded-lg border ' + (compareList.indexOf(f.key) >= 0 ? 'bg-indigo-600 border-indigo-700 text-indigo-50' : (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')) }, '📊 ' + (compareList.indexOf(f.key) >= 0 ? t('stem.geology.comparing', 'Pinned to compare ✓') : t('stem.geology.compare', 'Compare')))
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
      // ── compare two rocks side by side (pin via the info panel's 📊 button) ──
      function compareInsight(a, b) {
        var key = [a, b].sort().join('+');
        return {
          'basalt+basement': 'Same magma, opposite cooling: basalt erupted and cooled fast (crystals too tiny to see); granite cooled slowly underground (big interlocking crystals).',
          'basalt+intrusion': 'Same magma, opposite cooling: basalt erupted and cooled fast (tiny crystals); the granite pluton cooled slowly underground (big crystals).',
          'limestone+marble': 'Marble IS limestone — recrystallised by the pluton’s heat (contact metamorphism). Same chemistry, brand-new texture.',
          'basement+intrusion': 'Both granite, but the basement is ancient while the pluton is YOUNGER — it cuts across the layers (cross-cutting).',
          'hornfels+shale': 'Hornfels IS shale, baked hard beside the pluton (contact metamorphism).',
          'limestone+sandstone': 'Both sedimentary, but limestone is built from sea shells (warm shallow sea) and sandstone from sand grains (rivers, dunes, beaches).'
        }[key] || 'Compare their type, how they form, and their age relationship above — what’s the same, and what changed?';
      }
      function comparePanel() {
        if (compareList.length < 2) return null;
        var a = compareList[0], b = compareList[1], palette = SCENE.palette || ROCKS, RA = palette[a], RB = palette[b];
        if (!RA || !RB) return null;
        var cols = { gridTemplateColumns: '58px 1fr 1fr' };
        function row(label, va, vb) {
          return h('div', { className: 'grid gap-2 py-1 border-t text-[11px] ' + (isDark ? 'border-slate-700 ' : 'border-slate-200 ') + ink, style: cols },
            h('span', { className: muted }, label), h('span', null, va), h('span', null, vb));
        }
        return h('div', { className: 'p-3 rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Compare two rocks' },
          h('div', { className: 'flex items-center justify-between mb-1' },
            h('span', { className: 'text-[12px] font-extrabold ' + ink }, '📊 ' + t('stem.geology.compare_title', 'Compare')),
            h('button', { type: 'button', onClick: function () { setCompareList([]); }, className: 'text-[11px] font-bold px-2 py-0.5 rounded-lg border ' + (isDark ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100') }, '✕ ' + t('stem.geology.clear', 'Clear'))),
          h('div', { className: 'grid gap-2 text-[12px] font-extrabold pb-1', style: cols },
            h('span', null, ''), h('span', { style: { color: TYPE_COLOR[RA.type] || ink } }, RA.name), h('span', { style: { color: TYPE_COLOR[RB.type] || ink } }, RB.name)),
          row('Type', RA.type, RB.type),
          row('Forms by', RA.formation, RB.formation),
          row('Minerals', RA.minerals, RB.minerals),
          row('Dating', DATING[a] ? DATING[a].parent + '→' + DATING[a].daughter : 'indirect', DATING[b] ? DATING[b].parent + '→' + DATING[b].daughter : 'indirect'),
          row('Water', GROUNDWATER[a] ? GROUNDWATER[a].perm : '—', GROUNDWATER[b] ? GROUNDWATER[b].perm : '—'),
          h('div', { className: 'mt-2 text-[11px] leading-snug ' + ink }, '💡 ' + compareInsight(a, b))
        );
      }
      function sceneComparisonPanel() {
        var otherId = compareSceneId && compareSceneId !== SCENE.id ? compareSceneId : defaultComparisonScene(SCENE.id);
        var A = sceneComparisonFor(SCENE.id), B = sceneComparisonFor(otherId);
        var currentJourney = sceneJourneyFor(SCENE.id), otherJourney = sceneJourneyFor(otherId);
        var compareIndex = Math.max(0, Math.min(compareStage, Math.min(currentJourney.length, otherJourney.length) - 1));
        var currentStage = currentJourney[compareIndex], otherStage = otherJourney[compareIndex];
        var comparisonReadText = 'Current scene ' + SCENES[SCENE.id].label + '. Comparison scene ' + SCENES[otherId].label + '. Concept: ' + A.concept + ' versus ' + B.concept + '. Process: ' + A.process + ' versus ' + B.process + '. Evidence: ' + A.evidence + ' versus ' + B.evidence + '. Selected stage ' + (compareIndex + 1) + ': ' + currentStage.label + ' versus ' + otherStage.label + '. ' + sceneComparisonInsight(SCENE.id, otherId);
        function comparisonLane(title, sceneId, journey, side, accent) {
          return h('div', { key: side, className: 'min-w-0 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'), role: 'group', 'aria-label': title + ' visual story' }, [
            h('div', { key: 'lane-title', className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, title + ': ' + SCENES[sceneId].label),
            h('div', { key: 'lane-steps', className: 'relative mt-2 space-y-1.5' }, [
              h('div', { key: 'lane-line', className: 'absolute bottom-3 left-3 top-3 w-px ' + (isDark ? 'bg-slate-600' : 'bg-slate-300'), 'aria-hidden': 'true' }),
              journey.map(function (item, index) {
                var on = index === compareIndex;
                return h('button', { key: item.key, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': title + ' stage ' + (index + 1) + ': ' + item.label, 'data-geology-comparison-stage': side + ':' + index, onClick: function () { setCompareStage(index); announce('Comparing stage ' + (index + 1) + ': ' + item.label + ' with the matching stage in the other scene.'); }, className: 'relative flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors ' + (on ? ('border-' + accent + '-500 bg-' + accent + '-600 text-white') : (isDark ? 'border-slate-700 bg-slate-950/40 text-slate-200 hover:border-' + accent + '-400' : 'border-slate-200 bg-white text-slate-700 hover:border-' + accent + '-400')) }, [
                  h('span', { key: 'number', className: 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ' + (on ? 'border-white/60 bg-white/15' : (isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white')) }, index + 1),
                  h('span', { key: 'label', className: 'min-w-0 text-[10.5px] font-bold leading-tight' }, item.label)
                ]);
              })
            ])
          ]);
        }
        var visualComparison = h('section', { key: 'visual-comparison', className: 'mt-3 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-50'), role: 'region', 'aria-label': 'Visual story comparison', 'data-geology-comparison-map': 'true' }, [
          h('div', { key: 'visual-head', className: 'flex flex-wrap items-start justify-between gap-2' }, [
            h('div', { key: 'visual-copy' },
              h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-sky-300' : 'text-sky-700') }, 'Visual story comparison'),
              h('p', { className: 'mt-1 text-[10.5px] leading-relaxed ' + muted }, 'Select matching stages to see where the two geology stories diverge.')),
            h('span', { key: 'visual-stage', className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + muted }, 'Stage ' + (compareIndex + 1) + ' of ' + Math.min(currentJourney.length, otherJourney.length))
          ]),
          h('div', { key: 'lanes', className: 'mt-2 grid gap-2 sm:grid-cols-2' }, [
            comparisonLane('Current scene', SCENE.id, currentJourney, 'current', 'violet'),
            comparisonLane('Comparison scene', otherId, otherJourney, 'comparison', 'sky')
          ]),
          h('div', { key: 'visual-detail', className: 'mt-2 rounded-lg border-l-2 border-sky-400 bg-sky-500/10 p-2 text-[11px] leading-relaxed ' + ink, role: 'status', 'data-geology-comparison-detail': 'true' }, [
            h('strong', { key: 'visual-detail-title' }, currentStage.label + ' ↔ ' + otherStage.label),
            h('p', { key: 'visual-detail-copy', className: 'mt-0.5' }, currentStage.body + ' ' + otherStage.body)
          ])
        ]);
        var cols = { gridTemplateColumns: '82px minmax(180px, 1fr) minmax(180px, 1fr)' };
        var options = Object.keys(SCENES).filter(function (id) { return id !== SCENE.id; });
        function row(label, va, vb) {
          return h('div', { className: 'grid gap-2 border-t py-1.5 text-[11px] ' + (isDark ? 'border-slate-700 ' : 'border-slate-200 ') + ink, style: cols },
            h('span', { className: muted }, label), h('span', null, va), h('span', null, vb));
        }
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Compare geology scenes', 'data-geology-scene-comparison': 'true' },
          h('div', { className: 'p-3' },
            h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' },
              h('div', null,
                h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-violet-300' : 'text-violet-700') }, 'Transfer lab'),
                h('h3', { className: 'mt-1 text-sm font-extrabold ' + ink }, 'Compare geology scenes'),
                h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + muted }, 'Compare the process and evidence pattern, then transfer one idea from one environment to the other.')),
              h('label', { className: 'min-w-[12rem] text-[10px] font-bold ' + muted },
                h('span', { className: 'block mb-1 uppercase tracking-wider' }, 'Compare with'),
                h('select', { value: otherId, 'aria-label': 'Compare with', onChange: function (e) { var next = e.target.value; setCompareSceneId(next); setCompareStage(0); announce('Comparing ' + SCENES[SCENE.id].label + ' with ' + SCENES[next].label + '.'); }, className: 'w-full rounded-lg border px-2 py-1.5 text-[11px] font-bold ' + (isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-700') },
                  options.map(function (id) { return h('option', { key: id, value: id }, SCENES[id].label); })))),
            h('div', { key: 'headers', className: 'mt-3 grid gap-2 text-[11px] font-black ' + ink, style: cols },
              h('span', null, ''), h('span', null, 'Current scene: ' + SCENES[SCENE.id].label), h('span', null, 'Comparison scene: ' + SCENES[otherId].label)),
            visualComparison,
            h('div', { key: 'table', className: 'mt-1 overflow-x-auto', role: 'table', 'aria-label': 'Scene comparison evidence' },
              h('div', { className: 'min-w-[500px]' },
                row('Concept', A.concept, B.concept),
                row('Process', A.process, B.process),
                row('Evidence', A.evidence, B.evidence),
                row('Direction', A.direction, B.direction),
                row('Outcome', A.outcome, B.outcome))),
            h('p', { key: 'insight', className: 'mt-3 rounded-lg border-l-2 border-violet-400 bg-violet-500/10 p-2.5 text-[11px] leading-relaxed ' + ink },
              h('strong', null, 'Compare the pattern: '), sceneComparisonInsight(SCENE.id, otherId)),
            h('p', { key: 'prompt', className: 'mt-2 text-[11px] font-semibold ' + muted },
              'Transfer prompt: Which observation would best distinguish ' + A.concept.toLowerCase() + ' from ' + B.concept.toLowerCase() + '?'),
            h('div', { key: 'audio', className: 'mt-2' }, readAloudButton(comparisonReadText, 'comparison-' + SCENE.id + '-' + otherId, 'Read scene comparison aloud'))
          ));
      }
      function datingPanel() {
        if (!selected) return null;
        var DT = DATING[selected.key]; if (!DT) return null;
        var pPct = datingParent, dPct = 100 - pPct;
        var halfLives = Math.log(100 / pPct) / Math.log(2);
        var ageMa = Math.round(DT.hl * halfLives);
        return h('div', { className: 'p-3 rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Radiometric dating clock' },
          h('div', { className: 'text-[12px] font-extrabold tracking-tight ' + ink }, '📅 ' + t('stem.geology.dating_title', 'Radiometric clock') + ' · ' + DT.parent + ' → ' + DT.daughter),
          h('p', { className: 'mt-1 text-[10.5px] leading-relaxed ' + muted }, t('stem.geology.dating_simulation', 'Practice simulation: adjust the isotope ratio to see how an age calculation works. This does not date the voxel automatically.')),
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
        var _bank = sceneQuiz(), _items = _bank.items;
        var Q = _items[Math.min(quizI, _items.length - 1)], revealed = quizAns != null;
        var remediation = revealed && quizAns !== Q.correct ? quizRemediation(SCENE.id, quizI) : null;
        function ansBtn(i) {
          var chosen = quizAns === i, right = i === Q.correct;
          var cls = !revealed
            ? (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-violet-400' : 'bg-white border-slate-300 text-slate-700 hover:bg-violet-50 hover:border-violet-400')
            : right ? 'bg-emerald-500 border-emerald-400 text-emerald-950' : (chosen ? 'bg-rose-700 border-rose-800 text-rose-50' : (isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-400 text-slate-600'));
          return h('button', { key: i, type: 'button', disabled: revealed, onClick: function () { answerQuiz(i); }, className: 'transition-colors active:scale-[0.97] text-[12px] font-bold px-3 py-1.5 rounded-lg border ' + cls }, (revealed && right ? '✓ ' : (revealed && chosen ? '✗ ' : '')) + Q.opts[i]);
        }
        return h('div', { className: 'rounded-xl border p-3 ' + cardBg + routeTargetClass('quiz'), role: 'region', 'aria-label': 'Relative dating quiz', tabIndex: -1, 'data-geology-target': 'quiz' },
          h('div', { className: 'flex items-center justify-between gap-2' },
            h('span', { className: 'text-[12px] font-extrabold ' + ink }, '🧠 ' + t('stem.geology.quiz_title', _bank.title)),
            h('button', { type: 'button', onClick: function () { var nv = !quizOn; setQuizOn(nv); if (nv) setQuizAns(null); }, 'aria-expanded': quizOn ? 'true' : 'false', className: 'transition-colors active:scale-[0.97] text-[11px] font-bold px-2.5 py-1 rounded-lg border ' + (quizOn ? 'bg-violet-600 border-violet-700 text-violet-50' : (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')) }, quizOn ? t('stem.geology.quiz_hide', 'Hide') : t('stem.geology.quiz_start', 'Start'))),
          quizOn ? h('div', { className: 'mt-2' },
            h('div', { className: 'text-[12px] font-semibold ' + ink }, (Math.min(quizI, _items.length - 1) + 1) + '/' + _items.length + '. ' + Q.q),
            h('div', { className: 'flex flex-wrap gap-1.5 mt-1.5' }, Q.opts.map(function (_, i) { return ansBtn(i); })),
            revealed ? h('div', { className: 'mt-2 text-[11.5px] ' + (quizAns === Q.correct ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-rose-300' : 'text-rose-700')) }, (quizAns === Q.correct ? '? ' : '? ') + Q.why) : null,
            remediation ? h('div', { className: 'mt-2 rounded-lg border-l-2 border-amber-400 bg-amber-500/10 p-2.5 ' + ink, role: 'region', 'aria-label': 'Targeted remediation', 'data-geology-remediation': 'true' },
              h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, 'Targeted feedback'),
              h('div', { className: 'mt-1 text-[11px] font-bold' }, remediation.misconception),
              h('p', { className: 'mt-1 text-[11px] leading-relaxed' }, remediation.remedy),
              h('div', { className: 'mt-2 flex flex-wrap gap-1.5' },
                readAloudButton('Targeted feedback. ' + remediation.misconception + '. ' + remediation.remedy, 'remediation-' + remediation.id, 'Read targeted feedback aloud'),
                h('button', { type: 'button', onClick: retryQuiz, className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + btnIdle }, 'Try again'))) : null,
            revealed ? h('button', { type: 'button', onClick: nextQuiz, className: 'mt-2 ' + btn + btnIdle }, t('stem.geology.quiz_next', 'Next question ?')) : null
          ) : null);
      }

      function missionForScene() { return SCENE_MISSIONS[SCENE.id] || SCENE_MISSIONS.crust; }
      function missionContext() {
        var byScene = (d.identifiedByScene && typeof d.identifiedByScene === 'object') ? d.identifiedByScene : {};
        var identifiedForScene = byScene[SCENE.id] || {};
        var quizByScene = (d.quizByScene && typeof d.quizByScene === 'object') ? d.quizByScene : {};
        var quizState = quizByScene[SCENE.id] || {};
        var mission = missionForScene();
        var signalIndex = (d.sceneSignals && Number.isFinite(d.sceneSignals[SCENE.id])) ? d.sceneSignals[SCENE.id] : -1;
        var evidence = (notebook && Array.isArray(notebook.evidence) ? notebook.evidence : []).filter(function (item) { return item.scene === SCENE.id; });
        return {
          identified: identifiedForScene,
          identifiedCount: Object.keys(identifiedForScene).length,
          quizAnswered: (quizState.answered || 0) > 0,
          core: !!core,
          signalComplete: !!(mission.signal && signalIndex >= mission.signal.steps.length - 1),
          signalIndex: signalIndex,
          evidence: evidence,
          hasKeys: function (keys) { return keys.every(function (key) { return !!identifiedForScene[key]; }); }
        };
      }
      function missionItemsForScene() {
        var mission = missionForScene(), context = missionContext();
        return (mission.checklist || []).map(function (item) { return { id: item.id, label: item.label, complete: !!item.check(context) }; });
      }
      function missionIsComplete() { return missionItemsForScene().every(function (item) { return item.complete; }); }
      function revealSignalStep(index) {
        var mission = missionForScene();
        if (!mission.signal || !mission.signal.steps.length) return;
        var next = Math.max(0, Math.min(index, mission.signal.steps.length - 1));
        var step = mission.signal.steps[next];
        setSignalStep(next);
        var signals = (d.sceneSignals && typeof d.sceneSignals === 'object') ? d.sceneSignals : {};
        var prior = Number.isFinite(signals[SCENE.id]) ? signals[SCENE.id] : -1;
        if (next > prior) upd('sceneSignals', Object.assign({}, signals, { [SCENE.id]: next }));
        addNotebookEvidence('process', step.label, step.body, 'step-' + next);
        var R = SCENE.palette[step.key];
        if (R) selectRock(rockFacts(step.key, DEPTH_GUESS[step.key] || 4), false, step.body);
        else announce(step.body);
      }
      function invalidateSequenceCompletion() {
        if (!sequenceComplete) return;
        var next = Object.assign({}, sequenceCompletionByScene, { [SCENE.id]: false });
        setSequenceCompletionByScene(next);
        upd('sequenceByScene', next);
      }
      function moveSequenceCard(key, delta) {
        var from = sequenceOrder.indexOf(key), to = from + delta;
        if (from < 0 || to < 0 || to >= sequenceOrder.length) return;
        var next = sequenceOrder.slice(), moved = next.splice(from, 1)[0];
        next.splice(to, 0, moved);
        setSequenceOrder(next); setSequenceFeedback(null); setSequenceDragKey(null); setSequenceTapKey(null);
        invalidateSequenceCompletion();
      }
      function dropSequenceCard(targetKey, event) {
        if (event && event.preventDefault) event.preventDefault();
        var dragged = sequenceDragKey;
        try { if (event && event.dataTransfer && event.dataTransfer.getData('text/plain')) dragged = event.dataTransfer.getData('text/plain'); } catch (e) {}
        if (!dragged || dragged === targetKey) { setSequenceDragKey(null); return; }
        var from = sequenceOrder.indexOf(dragged), target = sequenceOrder.indexOf(targetKey);
        if (from < 0 || target < 0) { setSequenceDragKey(null); return; }
        var next = sequenceMoveBefore(sequenceOrder, dragged, targetKey);
        setSequenceOrder(next); setSequenceFeedback(null); setSequenceDragKey(null); setSequenceTapKey(null);
        invalidateSequenceCompletion();
      }
      function selectSequenceCard(key) {
        var challenge = sequenceChallengeFor(SCENE.id), byKey = {};
        challenge.items.forEach(function (item) { byKey[item.key] = item; });
        var item = byKey[key];
        if (!item) return;
        if (!sequenceTapKey) {
          setSequenceTapKey(key);
          setSequenceFeedback(null);
          announce('Selected ' + item.label + '. Tap Place here on another card to move it before that card.');
          return;
        }
        if (sequenceTapKey === key) {
          setSequenceTapKey(null);
          announce('Touch reorder canceled.');
          return;
        }
        var moving = byKey[sequenceTapKey];
        if (!moving) { setSequenceTapKey(key); return; }
        var next = sequenceMoveBefore(sequenceOrder, sequenceTapKey, key);
        setSequenceOrder(next);
        setSequenceFeedback(null);
        setSequenceDragKey(null);
        setSequenceTapKey(null);
        invalidateSequenceCompletion();
        announce('Moved ' + moving.label + ' before ' + item.label + '.');
      }

      function resetSequenceOrder() {
        setSequenceOrder(sequenceInitialOrder(SCENE.id)); setSequenceFeedback(null); setSequenceDragKey(null); setSequenceTapKey(null);
        invalidateSequenceCompletion();
        announce('Sequence order reset. Arrange the cards from earliest to latest.');
      }
      function checkSequenceOrder() {
        var challenge = sequenceChallengeFor(SCENE.id), items = challenge.items, byKey = {}, firstWrong = -1;
        setSequenceTapKey(null);
        items.forEach(function (item) { byKey[item.key] = item; });
        var correct = sequenceIsCorrect(SCENE.id, sequenceOrder);
        if (correct) {
          var saved = (d.sequenceByScene && typeof d.sequenceByScene === 'object') ? d.sequenceByScene : {};
          var nextSaved = Object.assign({}, saved, sequenceCompletionByScene, { [SCENE.id]: true });
          setSequenceCompletionByScene(nextSaved);
          setSequenceFeedback({ correct: true, message: 'Correct. The process now reads as one evidence-based sequence.' });
          upd('sequenceByScene', nextSaved);
          addNotebookEvidence('process', 'Sequence challenge: ' + challenge.title, items.map(function (item) { return item.label; }).join(' → '), 'sequence-challenge');
          announce('Sequence correct. The process is in the right order and saved as evidence.');
          return;
        }
        for (var i = 0; i < items.length; i++) { if (sequenceOrder[i] !== items[i].key) { firstWrong = i; break; } }
        var expected = firstWrong >= 0 ? items[firstWrong] : items[0];
        setSequenceFeedback({ correct: false, message: 'Not yet. Position ' + (firstWrong + 1) + ' should be “' + expected.label + '”. Move a card, then check again.' });
        announce('The sequence needs another change. Position ' + (firstWrong + 1) + ' should be ' + expected.label + '.');
      }
      function sceneSequencePanel() {
        var challenge = sequenceChallengeFor(SCENE.id), items = challenge.items, byKey = {};
        items.forEach(function (item) { byKey[item.key] = item; });
        var touchSelected = sequenceTapKey ? byKey[sequenceTapKey] : null;
        var sequenceReadText = challenge.title + '. ' + challenge.prompt + '. ' + items.map(function (item) { return item.label + ': ' + item.detail; }).join(' ');
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Sequence challenge', 'data-geology-sequence-challenge': 'true' },
          h('div', { className: 'p-3' }, [
            h('div', { key: 'seq-head', className: 'flex flex-wrap items-start justify-between gap-2' },
              h('div', null,
                h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, 'Drag-and-drop reasoning'),
                h('h3', { className: 'mt-1 text-[12px] font-extrabold ' + ink }, challenge.title),
                h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + muted }, challenge.prompt),
                h('div', { className: 'mt-2' }, readAloudButton(sequenceReadText, 'sequence-' + SCENE.id, 'Read sequence challenge aloud'))),
              h('span', { className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + (sequenceComplete ? (isDark ? 'border-emerald-500/60 text-emerald-200' : 'border-emerald-300 text-emerald-700') : muted) }, sequenceComplete ? 'Sequence saved' : 'Not checked')),
            h('p', { key: 'seq-hint', className: 'mt-2 text-[10.5px] ' + muted }, 'Drag a card to reorder it. Or tap Select on one card, then Place here on another card. Keyboard users can use the Move earlier and Move later buttons.'),
            h('p', { key: 'seq-status', className: 'mt-1 text-[10.5px] ' + muted, role: touchSelected ? 'status' : undefined, 'data-geology-sequence-touch-status': 'true' }, touchSelected ? 'Selected ' + touchSelected.label + '. Choose Place here on another card.' : 'Touch reorder is ready: choose Select on a card to move it before another card.'),
            h('div', { key: 'seq-list', className: 'mt-2 space-y-1.5', role: 'list', 'aria-label': 'Sequence cards' },
              sequenceOrder.map(function (key, index) {
                var item = byKey[key];
                return h('div', { key: key, role: 'listitem', draggable: true, 'data-geology-sequence-card': key, onDragStart: function (event) { setSequenceDragKey(key); try { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', key); } catch (e) {} }, onDragOver: function (event) { event.preventDefault(); }, onDrop: function (event) { dropSequenceCard(key, event); }, onDragEnd: function () { setSequenceDragKey(null); }, className: 'flex items-start gap-2 rounded-lg border p-2 transition ' + (sequenceDragKey === key ? 'ring-2 ring-amber-400 ' : '') + (isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50') },
                  h('span', { className: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-black text-white', 'aria-label': 'Position ' + (index + 1) }, index + 1),
                  h('div', { className: 'min-w-0 flex-1' },
                    h('div', { className: 'text-[11px] font-extrabold ' + ink }, item.label),
                    h('p', { className: 'mt-0.5 text-[10.5px] leading-snug ' + muted }, item.detail)),
                  h('div', { className: 'flex shrink-0 flex-wrap justify-end gap-1', role: 'group', 'aria-label': 'Reorder ' + item.label },
                    h('button', { type: 'button', 'aria-pressed': sequenceTapKey === key ? 'true' : 'false', 'aria-label': sequenceTapKey === key ? 'Cancel touch reorder for ' + item.label : (touchSelected ? 'Place ' + touchSelected.label + ' before ' + item.label : 'Select ' + item.label + ' for touch reorder'), onClick: function () { selectSequenceCard(key); }, className: 'rounded-md border px-1.5 py-1 text-[10px] font-bold ' + (sequenceTapKey === key ? 'border-violet-500 bg-violet-600 text-white' : btnIdle) }, sequenceTapKey === key ? 'Cancel' : (touchSelected ? 'Place here' : 'Select')),
                    h('button', { type: 'button', disabled: index === 0, 'aria-label': 'Move ' + item.label + ' earlier', onClick: function () { moveSequenceCard(key, -1); }, className: 'rounded-md border px-1.5 py-1 text-[10px] font-bold ' + (index === 0 ? 'opacity-40 ' : '') + btnIdle }, '↑'),
                    h('button', { type: 'button', disabled: index === sequenceOrder.length - 1, 'aria-label': 'Move ' + item.label + ' later', onClick: function () { moveSequenceCard(key, 1); }, className: 'rounded-md border px-1.5 py-1 text-[10px] font-bold ' + (index === sequenceOrder.length - 1 ? 'opacity-40 ' : '') + btnIdle }, '↓')));
              })),
            h('div', { key: 'seq-actions', className: 'mt-2 flex flex-wrap gap-1.5' },
              h('button', { type: 'button', 'data-geology-sequence-check': 'true', onClick: checkSequenceOrder, className: btn + btnIdle }, sequenceComplete ? 'Check again' : 'Check sequence'),
              h('button', { type: 'button', 'data-geology-sequence-reset': 'true', onClick: resetSequenceOrder, className: btn + btnIdle }, 'Reset order')),
             sequenceFeedback ? h('div', { key: 'seq-feedback', className: 'mt-2 rounded-lg border-l-2 p-2 text-[11px] leading-relaxed ' + (sequenceFeedback.correct ? 'border-emerald-400 bg-emerald-500/10 ' + (isDark ? 'text-emerald-200' : 'text-emerald-800') : 'border-amber-400 bg-amber-500/10 ' + ink), role: sequenceFeedback.correct ? 'status' : 'alert', 'data-geology-sequence-feedback': sequenceFeedback.correct ? 'correct' : 'retry' }, sequenceFeedback.message) : null
            ]));
      }

      function teacherProgressPanel() {
        var progress = Object.keys(SCENES).map(function (id) { return sceneProgressFor(id, d); });
        var completed = progress.filter(function (item) { return item.complete; }).length;
        function exportProgressSummary() {
          try {
            var lines = ['Geology Explorer progress summary', 'Scenes complete: ' + completed + '/' + progress.length, ''];
            progress.forEach(function (item) {
              lines.push(item.label + ' | checks ' + item.done + '/' + item.total + ' | observations ' + item.evidenceCount + ' | quiz attempts ' + item.quizAttempts + ' (' + item.quizCorrect + ' correct) | review flags ' + item.misconceptionCount);
              if (item.signalTotal) lines.push('  signal steps: ' + item.signalStep + '/' + item.signalTotal);
              if (item.sequenceComplete) lines.push('  sequence challenge: complete');
              item.checks.forEach(function (check) { lines.push('  ' + (check.complete ? '[x] ' : '[ ] ') + check.label); });
              lines.push('');
            });
            var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = 'geology-progress-summary.txt'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 0);
            addToast('Progress summary exported.', 'success');
          } catch (e) { addToast('Could not export the progress summary.', 'error'); }
        }
        return h('section', { key: 'teacher-progress', className: 'mt-3 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'), role: 'region', 'aria-label': 'Progress summary', 'data-geology-progress-summary': 'true' }, [
          h('div', { key: 'head', className: 'flex flex-wrap items-center justify-between gap-2' },
            h('div', null,
              h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Across all scenes'),
              h('div', { className: 'mt-1 text-[12px] font-extrabold ' + ink }, 'Progress summary'),
              h('p', { className: 'mt-1 text-[10.5px] ' + muted }, completed + '/' + progress.length + ' scene missions complete.')),
            h('button', { type: 'button', onClick: exportProgressSummary, className: btn + btnIdle }, 'Export progress summary')),
          h('div', { key: 'grid', className: 'mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3' },
            progress.map(function (item) {
              return h('div', { key: item.id, className: 'rounded-lg border p-2 ' + (item.complete ? (isDark ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-emerald-300 bg-emerald-50') : (isDark ? 'border-slate-700' : 'border-slate-200')), role: 'group', 'aria-label': item.label + ': ' + item.done + ' of ' + item.total + ' checks complete' },
                h('div', { className: 'truncate text-[11px] font-bold ' + ink, title: item.label }, item.label),
                h('div', { className: 'mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] ' + muted },
                  h('span', null, 'Checks ' + item.done + '/' + item.total),
                  h('span', null, 'Obs ' + item.evidenceCount),
                  h('span', null, 'Quiz ' + item.quizAttempts),
                  item.misconceptionCount ? h('span', { className: isDark ? 'text-amber-300' : 'text-amber-700' }, 'Review ' + item.misconceptionCount) : null,
                  item.signalTotal ? h('span', null, 'Signal ' + item.signalStep + '/' + item.signalTotal) : null,
                  item.sequenceComplete ? h('span', { className: isDark ? 'text-emerald-300' : 'text-emerald-700' }, 'Order ✓') : null))
            }))
        ]);
      }
      function lessonGuidePanel() {
        if (!lessonGuideOpen) return null;
        var mission = missionForScene(), context = missionContext(), complete = missionIsComplete();
        var rubric = evaluateCER(mission, Object.assign({}, context, { missionComplete: complete }), notebook);
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Lesson guide' },
          h('div', { className: 'p-3' }, [
            h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' },
              h('div', null,
                h('div', { className: 'text-[10px] font-black uppercase tracking-[0.16em] ' + (isDark ? 'text-sky-300' : 'text-sky-700') }, t('stem.geology.lesson_label', 'Teacher / lesson guide')),
                h('h3', { className: 'mt-1 text-sm font-extrabold ' + ink }, t('stem.geology.lesson_title', 'Geology Explorer lesson guide')),
                h('p', { className: 'mt-1 text-[11px] ' + muted }, LESSON_GUIDE.duration + ' ? ' + t('stem.geology.lesson_objective', 'Current objective: ') + mission.question)),
              h('span', { className: 'rounded-lg border px-2 py-1 text-[11px] font-bold ' + (isDark ? 'border-sky-500/40 bg-sky-950/30 text-sky-200' : 'border-sky-300 bg-sky-50 text-sky-800') }, rubric.score + '/' + rubric.total + ' CER')),
            h('div', { key: 'phases', className: 'mt-3 grid gap-2 sm:grid-cols-4' }, LESSON_GUIDE.phases.map(function (phase, index) {
              return h('div', { key: phase.id, className: 'rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50') },
                h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, (index + 1) + '. ' + phase.minutes),
                h('div', { className: 'mt-1 text-[11px] font-bold ' + ink }, phase.title),
                h('p', { className: 'mt-1 text-[10.5px] leading-snug ' + muted }, phase.action));
            })),
            h('div', { key: 'objectives-prompts', className: 'mt-3 grid gap-2 sm:grid-cols-2' },
              h('div', { className: 'rounded-lg border p-2 ' + (isDark ? 'border-slate-700' : 'border-slate-200') },
                h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, t('stem.geology.lesson_goals', 'Learning goals')),
                h('ul', { className: 'mt-1 space-y-1 text-[11px] ' + ink }, LESSON_GUIDE.objectives.map(function (goal, i) { return h('li', { key: i }, '? ' + goal); }))),
              h('div', { className: 'rounded-lg border p-2 ' + (isDark ? 'border-slate-700' : 'border-slate-200') },
                h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, t('stem.geology.lesson_prompts', 'Teacher prompts')),
                h('ul', { className: 'mt-1 space-y-1 text-[11px] ' + ink }, LESSON_GUIDE.prompts.map(function (prompt, i) { return h('li', { key: i }, '? ' + prompt); })))),
            teacherProgressPanel(),
            h('p', { key: 'next-move', className: 'mt-3 rounded-lg border-l-2 border-sky-400 bg-sky-500/10 p-2 text-[11px] leading-relaxed ' + ink },
              complete ? t('stem.geology.lesson_ready', 'The scene checks are complete. Invite the student to submit the CER explanation.') : t('stem.geology.lesson_next', 'Next teacher move: let the student explore until the three scene checks are complete.'))
          ]));
      }

      function sceneOrientationPanel() {
        var orientation = SCENE_ORIENTATION[SCENE.id] || SCENE_ORIENTATION.crust;
        var vocabulary = SCENE_VOCABULARY[SCENE.id] || [];
        var vocabularyText = vocabulary.map(function (item) { return item.term + '. ' + item.definition + ' ' + item.cue; }).join(' ');
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Scene orientation' },
          h('div', { className: 'p-3' }, [
            h('div', { key: 'title', className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, t('stem.geology.orientation_title', 'How to read this model')),
            h('div', { key: 'facts', className: 'mt-1 grid grid-cols-2 gap-2 text-[11px] ' + ink },
              h('div', null, h('span', { className: 'block text-[10px] font-bold uppercase ' + muted }, t('stem.geology.orientation_scale', 'Scale')), orientation.scale),
              h('div', null, h('span', { className: 'block text-[10px] font-bold uppercase ' + muted }, t('stem.geology.orientation_direction', 'Direction')), orientation.direction)),
            h('p', { key: 'read', className: 'mt-2 text-[11px] leading-relaxed ' + muted }, orientation.read),
            h('p', { key: 'note', className: 'mt-1 text-[10.5px] font-semibold ' + muted }, t('stem.geology.schematic_note', 'Schematic model - not to scale. Colors are illustrative.')),
            h('div', { key: 'audio', className: 'mt-2' }, readAloudButton('How to read this model. Scale: ' + orientation.scale + '. Direction: ' + orientation.direction + '. ' + orientation.read, 'orientation-' + SCENE.id, 'Read scene guidance aloud')),
            h('div', { key: 'vocab', className: 'mt-3 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50') }, [
              h('div', { key: 'vb-head', className: 'flex flex-wrap items-center justify-between gap-2' }, [
                h('div', { key: 'vb-label' },
                  h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Vocabulary bridge'),
                  h('p', { className: 'mt-0.5 text-[10.5px] ' + muted }, 'Connect the words to what you can observe.')),
                h('button', { key: 'vb-toggle', type: 'button', 'aria-expanded': vocabularyOpen ? 'true' : 'false', 'aria-controls': 'geology-vocabulary-' + SCENE.id, 'data-geology-vocabulary-toggle': SCENE.id, onClick: function () { setVocabularyOpen(function (open) { return !open; }); }, className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + btnIdle }, vocabularyOpen ? 'Hide vocabulary bridge' : 'Show vocabulary bridge')
              ]),
              vocabularyOpen ? h('div', { key: 'vb-body', id: 'geology-vocabulary-' + SCENE.id, role: 'region', 'aria-label': 'Vocabulary bridge', 'data-geology-vocabulary': 'true', className: 'mt-2' }, [
                h('dl', { key: 'vb-list', className: 'space-y-2' }, vocabulary.map(function (item) {
                  return h('div', { key: item.term, className: 'rounded-md border p-2 ' + (isDark ? 'border-slate-700' : 'border-slate-200') }, [
                    h('dt', { key: 'term', className: 'text-[11px] font-extrabold ' + ink }, item.term),
                    h('dd', { key: 'def', className: 'mt-0.5 text-[10.5px] leading-snug ' + muted }, item.definition),
                    h('dd', { key: 'observe', className: 'mt-1 text-[10px] font-semibold leading-snug ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, 'Use it when: ' + item.cue)
                  ]);
                })),
                h('div', { key: 'vb-audio', className: 'mt-2' }, readAloudButton('Vocabulary bridge. ' + vocabularyText, 'vocabulary-' + SCENE.id, 'Read vocabulary aloud'))
              ]) : null
            ])
          ]));
      }

      function sceneJourneyPanel() {
        var journey = sceneJourneyFor(SCENE.id);
        var journeyComplete = sceneJourneyProgressFor(SCENE.id, d);
        var completeCount = journeyComplete.filter(function (done) { return done; }).length;
        var activeIndex = Math.max(0, Math.min(sceneJourneyStep, journey.length - 1));
        var active = journey[activeIndex];
        var activeComplete = !!journeyComplete[activeIndex];
        var journeyBeacons = sceneBeaconsFor(SCENE.id);
        var journeyEvidence = Array.isArray(notebook.evidence) ? notebook.evidence : [];
        var evidenceTrail = journey.map(function (item, index) {
          var beacon = journeyBeacons.filter(function (candidate) { return Number(candidate.stage) === index; })[0] || journeyBeacons[index];
          var saved = !!(beacon && (activeBeaconId === beacon.id || journeyEvidence.some(function (entry) { return entry.id === SCENE.id + ':landmark:beacon-' + beacon.id; })));
          return { stage: item, index: index, beacon: beacon, saved: saved };
        });
        var journeyText = journey.map(function (item, index) { return 'Stage ' + (index + 1) + ': ' + item.label + '. ' + item.body; }).join(' ');
        function focusJourneyTarget(target, message) {
          setRouteTarget(target);
          setHintShown(false);
          announce(message);
          setTimeout(function () {
            try {
              var node = document.querySelector('[data-geology-target="' + target + '"]');
              if (!node) return;
              node.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'center' });
              try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); }
            } catch (e) {}
          }, 80);
        }
        function chooseJourneyStep(index) {
          var next = journey[index] || journey[0];
          setSceneJourneyStep(index);
          if (missionForScene().signal) {
            setModeState('investigate');
            upd('mode', 'investigate');
            setRouteTarget('signal');
            setHintShown(false);
            revealSignalStep(index);
            setTimeout(function () {
              try {
                var signalNode = document.querySelector('[data-geology-target="signal"]');
                if (signalNode) { signalNode.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'center' }); try { signalNode.focus({ preventScroll: true }); } catch (e) { signalNode.focus(); } }
              } catch (e) {}
            }, 80);
            return;
          }
          var target = index === 0 ? 'materials' : 'core';
          setModeState('investigate');
          upd('mode', 'investigate');
          focusJourneyTarget(target, next.label + '. ' + next.body);
        }
         return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Interactive process map', 'data-geology-journey': 'true' },
           h('div', { className: 'p-3' },
            h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' }, [
              h('div', { key: 'copy' },
                h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-violet-300' : 'text-violet-700') }, 'Visual process map'),
                h('h3', { className: 'mt-1 text-[12px] font-extrabold ' + ink }, 'See the story in three stages'),
                h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + muted }, 'Select a stage to spotlight evidence and open the matching investigation surface.')),
               h('span', { key: 'progress', className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + (completeCount === journey.length ? (isDark ? 'border-emerald-500/60 text-emerald-200' : 'border-emerald-300 text-emerald-700') : muted), 'data-geology-journey-progress': 'true' }, completeCount + '/' + journey.length + ' evidenced')
            ]),
            h('div', { key: 'steps', className: 'relative mt-3' }, [
              h('div', { key: 'line', className: 'absolute left-[16%] right-[16%] top-5 hidden h-px ' + (isDark ? 'bg-slate-600' : 'bg-slate-300') + ' sm:block', 'aria-hidden': 'true' }),
              h('div', { key: 'buttons', className: 'relative grid grid-cols-3 gap-1.5' }, journey.map(function (item, index) {
                var on = index === activeIndex;
                var done = !!journeyComplete[index];
                return h('button', { key: item.key, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Stage ' + (index + 1) + ': ' + item.label, 'data-geology-journey-step': item.key, 'data-geology-journey-complete': done ? 'true' : 'false', onClick: function () { chooseJourneyStep(index); }, className: 'min-w-0 rounded-lg border px-1.5 py-2 text-center transition-colors ' + (on ? 'border-violet-500 bg-violet-600 text-white shadow-sm' : (done ? (isDark ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200 hover:border-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400') : (isDark ? 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-violet-400' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-400'))) }, [
                  h('span', { key: 'number', className: 'mx-auto flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black ' + (on ? 'border-white/60 bg-white/15' : (done ? (isDark ? 'border-emerald-400 text-emerald-200' : 'border-emerald-500 text-emerald-700') : (isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'))) }, done ? '✓' : index + 1),
                  h('span', { key: 'label', className: 'mt-1 block text-[10px] font-bold leading-tight' }, item.label),
                  h('span', { key: 'status', className: 'mt-0.5 block text-[10px] font-semibold opacity-80', 'aria-hidden': 'true' }, done ? 'Evidence linked' : 'Explore next')
                ]);
              }))
            ]),
            h('div', { key: 'detail', className: 'mt-3 rounded-lg border-l-2 border-violet-400 bg-violet-500/10 p-2.5', role: 'status', 'data-geology-journey-detail': 'true' }, [
              h('div', { key: 'detail-title', className: 'flex flex-wrap items-center gap-2 text-[11px] font-extrabold ' + ink }, [
                h('span', { key: 'label' }, active.label),
                h('span', { key: 'state', className: activeComplete ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : muted }, activeComplete ? 'Evidence linked' : 'Next observation')
              ]),
              h('p', { key: 'detail-body', className: 'mt-0.5 text-[11px] leading-relaxed ' + ink }, active.body)
            ]),
            h('div', { key: 'trail', className: 'mt-3', role: 'group', 'aria-label': 'Evidence trail', 'data-geology-evidence-trail': 'true' }, [
              h('div', { key: 'trail-title', className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Evidence trail'),
              h('p', { key: 'trail-copy', className: 'mt-1 text-[11px] ' + muted }, 'Each landmark feeds one stage of the process map and can be carried into CER.'),
              h('div', { key: 'trail-steps', className: 'relative mt-2' }, [
                h('div', { key: 'trail-line', className: 'absolute left-[16%] right-[16%] top-4 hidden h-px ' + (isDark ? 'bg-slate-600' : 'bg-slate-300') + ' sm:block', 'aria-hidden': 'true' }),
                h('div', { key: 'trail-grid', className: 'relative grid grid-cols-3 gap-1.5' }, evidenceTrail.map(function (entry) {
                  var on = entry.beacon && entry.beacon.id === activeBeaconId;
                  return h('button', { key: entry.stage.key, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Focus evidence beacon: ' + (entry.beacon ? entry.beacon.label : entry.stage.label), 'data-geology-evidence-trail-step': entry.stage.key, onClick: function () { if (entry.beacon) activateBeacon(entry.beacon); }, className: 'min-w-0 rounded-lg border px-1.5 py-2 text-center transition-colors ' + (on ? 'border-amber-500 bg-amber-500 text-amber-950' : (entry.saved ? (isDark ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200' : 'border-emerald-300 bg-emerald-50 text-emerald-800') : btnIdle)) }, [
                    h('span', { key: 'dot', className: 'mx-auto flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black' }, entry.saved ? '✓' : entry.index + 1),
                    h('span', { key: 'label', className: 'mt-1 block truncate text-[10px] font-bold' }, entry.beacon ? entry.beacon.label : entry.stage.label),
                    h('span', { key: 'state', className: 'mt-0.5 block text-[10px] font-semibold opacity-80', 'aria-hidden': 'true' }, entry.saved ? 'Notebook saved' : 'Find landmark')
                  ]);
                }))
              ]),
              h('button', { key: 'cer', type: 'button', disabled: !journeyEvidence.length, onClick: function () { setModeState('assess'); upd('mode', 'assess'); focusJourneyTarget('cer', 'Evidence trail ready. Use the saved landmarks to explain your evidence.'); }, className: 'mt-2 rounded-md border px-2 py-1 text-[10px] font-bold ' + (!journeyEvidence.length ? 'opacity-50 ' : '') + btnIdle }, 'Carry trail into CER')
            ]),
             h('div', { key: 'audio', className: 'mt-2' }, readAloudButton(journeyText, 'journey-' + SCENE.id, 'Read process map aloud'))
           ));
      }

      function sceneMissionPanel() {
        var mission = missionForScene(), context = missionContext(), items = missionItemsForScene(), complete = items.every(function (item) { return item.complete; });
        var hint = nextMissionHint(mission, context, SCENE.id);
        var done = items.filter(function (item) { return item.complete; }).length;
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Field mission' },
          h('div', { className: 'flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between' },
            h('div', { className: 'min-w-0' },
              h('div', { className: 'text-[10px] font-black uppercase tracking-[0.16em] ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, t('stem.geology.scene.' + SCENE.id + '.eyebrow', mission.eyebrow)),
              h('h3', { className: 'mt-1 text-sm font-extrabold ' + ink }, t('stem.geology.scene.' + SCENE.id + '.question', mission.question)),
              h('p', { className: 'mt-1 text-[11.5px] leading-relaxed ' + muted }, t('stem.geology.scene.' + SCENE.id + '.evidence', mission.evidencePrompt)),
            readAloudButton(mission.question + '. ' + mission.evidencePrompt, 'mission-' + SCENE.id, 'Read mission aloud')),
            h('div', { className: 'shrink-0 rounded-lg border px-2.5 py-1.5 text-center ' + (complete ? (isDark ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200' : 'border-emerald-300 bg-emerald-50 text-emerald-800') : (isDark ? 'border-slate-600 bg-slate-900/40 text-slate-200' : 'border-slate-300 bg-slate-50 text-slate-700')), 'aria-label': done + ' of ' + items.length + ' mission checks complete' },
              h('div', { className: 'text-base font-black' }, done + '/' + items.length),
              h('div', { className: 'text-[10px] font-bold uppercase tracking-wider' }, complete ? 'Ready to explain' : 'Field checks'))),
          h('div', { className: 'grid gap-1.5 border-t px-3 py-2.5 sm:grid-cols-3 ' + (isDark ? 'border-slate-700' : 'border-slate-200') },
            items.map(function (item) {
              var action = item.complete ? null : missionActionFor(item.id);
              return h('div', { key: item.id, className: 'flex items-start gap-2 text-[11.5px] ' + (item.complete ? (isDark ? 'text-emerald-200' : 'text-emerald-800') : ink) },
                h('span', { 'aria-hidden': 'true', className: 'mt-px font-black' }, item.complete ? '?' : '?'),
                h('span', { className: 'min-w-0 flex-1' }, t('stem.geology.scene.' + SCENE.id + '.check.' + item.id, item.label)),
                action ? h('button', { type: 'button', 'data-geology-route': item.id, 'aria-label': action.label + ': ' + item.label, onClick: function () { focusMissionTarget(item.id); }, className: 'shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ' + btnIdle }, action.label) : null);
            })),
          h('div', { className: 'border-t px-3 py-2.5 ' + (isDark ? 'border-slate-700' : 'border-slate-200') },
            h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'What to notice'),
            h('ul', { className: 'mt-1 grid gap-1 text-[11px] ' + muted },
              (mission.notice || []).map(function (notice, i) { return h('li', { key: i, className: 'flex gap-1.5' }, h('span', { 'aria-hidden': 'true' }, '•'), h('span', null, t('stem.geology.scene.' + SCENE.id + '.notice.' + i, notice))); }))),
          h('div', { className: 'border-t px-3 py-2.5 ' + (isDark ? 'border-slate-700' : 'border-slate-200') },
            hint.id === 'complete'
              ? h('p', { className: 'text-[11px] font-semibold ' + (isDark ? 'text-emerald-300' : 'text-emerald-700') }, '? ' + hint.text)
              : h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
                  h('span', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, t('stem.geology.hint_label', 'Stuck?')),
                  h('button', { type: 'button', 'aria-expanded': hintShown ? 'true' : 'false', onClick: function () { setHintShown(function (value) { return !value; }); }, className: btn + btnIdle }, hintShown ? t('stem.geology.hide_hint', 'Hide hint') : t('stem.geology.show_hint', 'Show hint')),
                  hintShown ? h('p', { className: 'basis-full rounded-lg border-l-2 border-amber-400 bg-amber-500/10 p-2 text-[11px] leading-relaxed ' + ink, 'data-geology-hint': 'true' }, 'Hint: ' + hint.text) : null)
          )
        );
      }
      function sceneSignalPanel() {
        var mission = missionForScene(), signal = mission.signal;
        if (!signal) return null;
        var index = Math.max(0, Math.min(signalStep, signal.steps.length - 1)), step = signal.steps[index];
        var signalReadText = signal.title + '. ' + signal.prompt + '. Step ' + step.label + ': ' + step.body;
        return h('section', { className: 'rounded-xl border ' + cardBg + routeTargetClass('signal'), role: 'region', 'aria-label': signal.title, tabIndex: -1, 'data-geology-target': 'signal' },
          h('div', { className: 'p-3' },
            h('div', { className: 'flex items-center justify-between gap-2' },
              h('div', { className: 'text-[12px] font-extrabold ' + ink }, '🧭 ' + signal.title),
              h('span', { className: 'text-[11px] font-bold ' + muted }, (index + 1) + '/' + signal.steps.length)),
              h('p', { className: 'mt-1 text-[11px] ' + muted }, signal.prompt),
            h('div', { className: 'mt-2' }, readAloudButton(signalReadText, 'signal-' + SCENE.id, 'Read process timeline aloud')),
            h('div', { className: 'mt-2 flex flex-wrap gap-1.5' },
              signal.steps.map(function (item, i) {
                return h('button', { key: item.key, type: 'button', 'aria-pressed': i === index ? 'true' : 'false', onClick: function () { revealSignalStep(i); }, className: 'rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ' + (i === index ? 'border-violet-500 bg-violet-600 text-white' : (isDark ? 'border-slate-600 bg-slate-800 text-slate-200 hover:border-violet-400' : 'border-slate-300 bg-white text-slate-700 hover:border-violet-400')) }, item.label);
              })),
            h('div', { className: 'mt-2 rounded-lg border-l-2 border-violet-400 bg-violet-500/10 p-2.5 text-[11.5px] leading-relaxed ' + ink }, step.body),
            h('div', { className: 'mt-2 flex gap-1.5' },
              h('button', { type: 'button', disabled: index <= 0, onClick: function () { revealSignalStep(index - 1); }, className: btn + (index <= 0 ? 'opacity-40 ' : '') + btnIdle }, '← Previous'),
              h('button', { type: 'button', disabled: index >= signal.steps.length - 1, onClick: function () { revealSignalStep(index + 1); }, className: btn + (index >= signal.steps.length - 1 ? 'opacity-40 ' : '') + btnIdle }, 'Next →'))));
      }
      function reconstructPanel() {
        if (mode !== 'assess') return null;
        var context = missionContext(), mission = missionForScene(), evidence = context.evidence;
        var ready = missionIsComplete(), explanation = notebook.explanation || '';
        var mapAssignments = evidenceMapForScene(notebook.evidenceMap, SCENE.id);
        var mapStatus = evidenceMapStatus(evidence, mapAssignments);
        var rubric = evaluateCER(mission, Object.assign({}, context, { missionComplete: ready, evidenceMapStatus: mapStatus }), notebook);
        var draft = evidenceMapDraft(mission, evidence, mapAssignments);
        function draftFromMap() {
          if (!draft.ready) { announce('Complete the Observation, Process, and Outcome map before drafting.'); return; }
          var current = notebookRef.current || notebook;
          saveNotebook(Object.assign({}, current, { claim: current.claim || draft.claim, explanation: draft.explanation, submitted: false, rubric: null }));
          addToast('Draft explanation created from the Evidence Map.', 'success');
          announce('Draft explanation created from the Evidence Map. Review and edit it before saving.');
        }
        function exportNote() {
          try {
            var lines = ['CER score: ' + rubric.score + '/' + rubric.total, 'Geology Explorer field note — ' + SCENE.label, '', 'Question: ' + mission.question, 'Claim: ' + (notebook.claim || '(not written)'), 'Explanation: ' + (notebook.explanation || '(not written)'), 'Reflection: ' + (notebook.reflection || '(not written)'), '', 'Evidence:',];
            evidence.forEach(function (item) { lines.push('- ' + item.label + ': ' + item.detail); });
            lines.push('', 'Evidence map:');
            EVIDENCE_MAP_ROLES.forEach(function (role) {
              var mapped = evidence.filter(function (item) { return mapAssignments[item.id] === role.id; });
              lines.push(role.label + ':');
              if (!mapped.length) lines.push('- (none assigned)');
              mapped.forEach(function (item) { lines.push('- ' + item.label + ': ' + item.detail); });
            });
            var unassigned = evidence.filter(function (item) { return !mapAssignments[item.id]; });
            if (unassigned.length) {
              lines.push('Unassigned:');
              unassigned.forEach(function (item) { lines.push('- ' + item.label + ': ' + item.detail); });
            }
            var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = 'geology-field-note-' + SCENE.id + '.txt'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 0);
          } catch (e) { addToast('Could not export the field note.', 'error'); }
        }
        var fields = h('div', { className: 'mt-2 space-y-2' }, [
          h('label', { key: 'claim', className: 'block text-[11px] font-bold ' + ink }, [
            'Claim',
            h('textarea', { rows: 2, value: notebook.claim || '', onChange: function (e) { setNotebookField('claim', e.target.value); }, placeholder: 'I think this world formed because…', className: 'mt-1 block w-full rounded-lg border p-2 text-[12px] font-normal ' + (isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800') })
          ]),
          h('label', { key: 'explanation', className: 'block text-[11px] font-bold ' + ink }, [
            'Explain your evidence',
            h('textarea', { rows: 4, value: explanation, onChange: function (e) { setNotebookField('explanation', e.target.value); }, placeholder: 'Use two or more observations. Connect what you saw to the process.', className: 'mt-1 block w-full rounded-lg border p-2 text-[12px] font-normal ' + (isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800') })
          ]),
          h('label', { key: 'reflection', className: 'block text-[11px] font-bold ' + ink }, [
            'Reflection: Which observation changed your thinking?',
             h('textarea', { rows: 3, value: notebook.reflection || '', onChange: function (e) { setNotebookField('reflection', e.target.value); }, placeholder: 'Name the observation that changed, strengthened, or complicated your first idea.', className: 'mt-1 block w-full rounded-lg border p-2 text-[12px] font-normal ' + (isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800') })
           ]),
        ]);
        var rubricBox = h('div', { className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/50' : 'bg-slate-50 border-slate-200'), role: 'region', 'aria-label': 'CER rubric' }, [
          h('div', { key: 'title', className: 'flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider ' + muted },
            h('span', null, t('stem.geology.rubric_title', 'CER rubric')),
            h('span', { className: rubric.ready ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : ink }, rubric.score + '/' + rubric.total)),
          h('ul', { key: 'criteria', className: 'mt-1 space-y-1 text-[11px] ' + ink }, rubric.criteria.map(function (criterion) {
            return h('li', { key: criterion.id, className: 'flex items-start gap-1.5' },
              h('span', { 'aria-hidden': 'true', className: criterion.met ? 'text-emerald-500 font-black' : 'text-amber-500 font-black' }, criterion.met ? '?' : '?'),
              h('span', null, h('strong', null, criterion.label + ': '), criterion.feedback));
          })),
          h('p', { key: 'summary', className: 'mt-2 text-[11px] font-semibold ' + (rubric.ready ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : muted) }, rubric.ready ? t('stem.geology.rubric_ready', 'Ready to submit for teacher review.') : t('stem.geology.rubric_next', 'Use the feedback above to strengthen the explanation.')),
          h('div', { key: 'audio', className: 'mt-2' }, readAloudButton('CER rubric. Score ' + rubric.score + ' out of ' + rubric.total + '. ' + rubric.criteria.map(function (criterion) { return criterion.label + ': ' + criterion.feedback; }).join(' '), 'cer-' + SCENE.id, 'Read CER feedback aloud'))
        ]);
        var evidenceMapBox = h('section', { className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'), role: 'region', 'aria-label': 'Evidence map', 'data-geology-evidence-map': 'true' }, [
          h('div', { key: 'header', className: 'flex flex-wrap items-start justify-between gap-2' }, [
            h('div', { key: 'em-label' },
              h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Evidence Map'),
              h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + muted }, 'Give each collected item a job: what you observed, how the process worked, or what it supports.')),
            h('span', { key: 'em-status', className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + (mapStatus.ready ? (isDark ? 'border-emerald-500/60 text-emerald-200' : 'border-emerald-300 text-emerald-700') : muted) }, mapStatus.ready ? 'Map ready' : mapStatus.mappedRoleCount + '/' + EVIDENCE_MAP_ROLES.length + ' roles mapped')
          ]),
          h('p', { key: 'status', className: 'mt-2 text-[11px] font-semibold ' + (mapStatus.ready ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : muted), role: mapStatus.ready ? 'status' : 'note', 'data-geology-evidence-map-status': 'true' }, mapStatus.ready ? 'Map ready: an observation, process, and outcome are represented.' : 'Map each item as an observation, process, or outcome. ' + mapStatus.unassigned + ' item' + (mapStatus.unassigned === 1 ? ' is' : 's are') + ' still unassigned.'),
          h('div', { key: 'draft-actions', className: 'mt-2 flex flex-wrap items-center gap-2' }, [
            h('button', { key: 'draft', type: 'button', disabled: !mapStatus.ready, onClick: draftFromMap, className: btn + (!mapStatus.ready ? 'opacity-50 ' : '') + btnIdle }, 'Draft explanation from map'),
            h('span', { key: 'draft-help', className: 'text-[10px] ' + muted }, mapStatus.ready ? 'Creates an editable claim and explanation.' : 'Map all three roles to unlock a draft.')
          ]),
          evidence.length
            ? h('div', { key: 'items', className: 'mt-2 space-y-2' }, evidence.map(function (item) {
                var activeRole = mapAssignments[item.id];
                return h('div', { key: item.id, className: 'rounded-lg border p-2 ' + (isDark ? 'border-slate-700' : 'border-slate-200'), 'data-geology-evidence-item': item.id }, [
                  h('div', { key: 'detail' }, h('div', { className: 'text-[11px] font-bold ' + ink }, item.label), h('p', { className: 'mt-0.5 text-[10.5px] leading-snug ' + muted }, item.detail)),
                  h('div', { key: 'roles', className: 'mt-1.5 flex flex-wrap gap-1', role: 'group', 'aria-label': 'Map ' + item.label }, EVIDENCE_MAP_ROLES.map(function (role) {
                    var on = activeRole === role.id;
                    return h('button', { key: role.id, type: 'button', title: role.prompt, 'aria-pressed': on ? 'true' : 'false', 'data-geology-evidence-role': role.id + ':' + item.id, onClick: function () { setEvidenceRole(item.id, role.id, item.label); }, className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + (on ? 'border-violet-500 bg-violet-600 text-white' : btnIdle) }, role.label);
                  }))
                ]);
              }))
            : h('p', { key: 'empty', className: 'mt-2 text-[11px] ' + muted }, 'Collect observations in Investigate mode, then map them here.')
        ]);
        var evidenceBox = h('div', { className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50') }, [
          h('div', { key: 'title', className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Collected evidence'),
          evidence.length
            ? h('ul', { key: 'list', className: 'mt-1 space-y-1 text-[11px] ' + ink }, evidence.map(function (item) { return h('li', { key: item.id }, [h('strong', { key: 'label' }, item.label + ': '), item.detail]); }))
            : h('p', { key: 'empty', className: 'mt-1 text-[11px] ' + muted }, 'Your observations will appear here as you explore.')
        ]);
        var actions = h('div', { className: 'mt-2 flex flex-wrap gap-1.5' }, [
          h('button', { key: 'save', type: 'button', disabled: !rubric.ready, onClick: function () { saveNotebook(Object.assign({}, notebookRef.current, { submitted: true, rubric: rubric, submittedAt: Date.now() })); addToast('Field conclusion saved.', 'success'); announce('Your field conclusion is saved.'); }, className: btn + (!rubric.ready ? 'opacity-50 ' : '') + btnIdle }, notebook.submitted ? '✓ Conclusion saved' : 'Save conclusion'),
          h('button', { key: 'export', type: 'button', disabled: !evidence.length, onClick: exportNote, className: btn + (!evidence.length ? 'opacity-50 ' : '') + btnIdle }, '⇩ Export field note')
        ]);
        return h('section', { className: 'rounded-xl border ' + cardBg + routeTargetClass('cer'), role: 'region', 'aria-label': 'Explain your evidence', 'data-geology-target': 'cer', tabIndex: -1 },
          h('div', { className: 'p-3' }, [
            h('div', { key: 'title', className: 'text-[12px] font-extrabold ' + ink }, '📝 Explain your evidence'),
            h('p', { key: 'prompt', className: 'mt-1 text-[11px] leading-relaxed ' + muted }, rubric.ready ? mission.evidencePrompt : 'Complete the rubric checks above before submitting your conclusion.'),
            fields,
            evidenceMapBox,
            rubricBox,
            evidenceBox,
            actions
          ]));
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
            h('text', { x: W - 5, y: 1.55 * bh - 3, fontSize: 10, fill: '#1d4ed8', textAnchor: 'end', style: { fontWeight: 700 } }, '💧')
          ) : null,
          h('polygon', { points: (W / 2) + ',' + (bands.length * bh) + ' ' + (W / 2 - 14) + ',' + (2 * bh) + ' ' + (W / 2 + 14) + ',' + (2 * bh), fill: hex(ROCKS.intrusion.color), opacity: 0.92, stroke: 'rgba(255,255,255,0.4)' })
        );
      }
      function strataList() {
        return h('div', { role: 'group', 'aria-label': 'Rock types ? select to learn more', tabIndex: -1, 'data-geology-target': 'materials', className: 'grid grid-cols-2 gap-1.5' + routeTargetClass('materials') },
          SCENE.order.map(function (k) {
            var R = SCENE.palette[k];
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




      function cameraViewLabel(view) { return view === 'front' ? 'Front cross-section' : (view === 'top' ? 'Top-down map' : '3D overview'); }
      function setCameraView(view) {
        setCameraViewState(view); announce('Camera view: ' + cameraViewLabel(view) + '.');
        try { if (window[ENGINE_KEY] && window[ENGINE_KEY].setView) window[ENGINE_KEY].setView(view); } catch (e) {}
      }
      function cameraCompassOverlay() {
        if (fpOn) return null;
        return h('div', { className: 'absolute bottom-2 right-2 z-10 flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/80 px-2 py-1.5 text-white shadow-lg', role: 'group', 'aria-label': 'Camera compass', 'data-geology-camera-compass': 'true' }, [
          h('div', { key: 'compass', className: 'relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-400/70 text-[10px] font-black' }, [
            h('span', { key: 'north', className: 'absolute -top-1.5 text-[8px] text-amber-200' }, 'N'),
            h('span', { key: 'west', className: 'absolute -left-1.5 text-[8px] text-slate-300' }, 'W'),
            h('span', { key: 'east', className: 'absolute -right-1.5 text-[8px] text-slate-300' }, 'E'),
            h('span', { key: 'needle', className: 'text-amber-300 motion-safe:transition-transform motion-reduce:transition-none', style: { transform: cameraViewState === 'top' ? 'rotate(90deg)' : (cameraViewState === 'front' ? 'rotate(180deg)' : 'rotate(35deg)') } }, '↗')
          ]),
          h('div', { key: 'label', className: 'min-w-0' }, h('div', { className: 'text-[9px] font-black uppercase tracking-wider text-amber-200' }, 'Orientation'), h('div', { className: 'text-[10.5px] font-bold' }, cameraViewLabel(cameraViewState)))
        ]);
      }
      function cameraOrientationPanel() {
        var views = [['iso', '3D overview'], ['front', 'Front cross-section'], ['top', 'Top-down map']];
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Camera orientation', 'data-geology-camera-orientation': 'true' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2 p-3' }, [
            h('div', { key: 'copy' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Camera breadcrumb'), h('p', { className: 'mt-1 text-[11px] ' + muted }, 'Keep the scene orientation visible while you compare depth and layers.')),
            h('span', { key: 'current', className: 'text-[10px] font-bold ' + ink, 'data-geology-camera-current': 'true' }, 'Viewing: ' + cameraViewLabel(cameraViewState)),
            h('div', { key: 'controls', className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': 'Camera orientation choices' }, views.map(function (item) {
              var on = cameraViewState === item[0];
              return h('button', { key: item[0], type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Set camera view: ' + item[1], onClick: function () { setCameraView(item[0]); }, className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + (on ? 'border-sky-500 bg-sky-600 text-white' : btnIdle) }, item[1]);
            }))
          ]));
      }

      function processCueOverlay() {
        if (fpOn) return null;
        var cue = sceneProcessCueFor(SCENE.id), index = Math.max(0, Math.min(sceneJourneyStep, cue.steps.length - 1)), step = cue.steps[index];
        return h('div', { className: 'absolute bottom-2 left-2 z-10 max-w-[min(19rem,calc(100%-4rem))] rounded-lg border border-white/20 bg-slate-950/85 p-2 text-white shadow-lg', role: 'group', 'aria-label': 'Active process cue', 'data-geology-process-overlay': 'true' }, [
          h('div', { key: 'title', className: 'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-200' }, [h('span', { key: 'pulse', className: 'h-2 w-2 rounded-full bg-amber-300 motion-safe:animate-pulse motion-reduce:animate-none', 'aria-hidden': 'true' }), cue.title]),
          h('div', { key: 'step', className: 'mt-1 text-[11px] font-bold' }, 'Stage ' + (index + 1) + ': ' + step.label),
          h('p', { key: 'detail', className: 'mt-0.5 text-[10.5px] leading-snug text-slate-200' }, step.detail)
        ]);
      }
      function processCuePanel() {
        var cue = sceneProcessCueFor(SCENE.id), index = Math.max(0, Math.min(sceneJourneyStep, cue.steps.length - 1));
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Process cues', 'data-geology-process-cues': 'true' },
          h('div', { className: 'p-3' }, [
            h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' }, [
              h('div', { key: 'copy' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, 'Process cues'), h('h3', { className: 'mt-1 text-[12px] font-extrabold ' + ink }, cue.title), h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + muted }, cue.summary)),
              h('span', { key: 'stage', className: 'text-[10px] font-bold ' + muted }, 'Stage ' + (index + 1) + ' of ' + cue.steps.length)
            ]),
            h('div', { key: 'steps', className: 'mt-2 grid grid-cols-3 gap-1.5' }, cue.steps.map(function (step, stepIndex) {
              var on = stepIndex === index;
              return h('button', { key: step.label, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Show process cue: ' + step.label, 'data-geology-process-step': stepIndex, onClick: function () { var beacon = sceneBeaconsFor(SCENE.id)[stepIndex]; if (beacon) activateBeacon(beacon); }, className: 'min-w-0 rounded-lg border px-1.5 py-2 text-center transition-colors ' + (on ? 'border-amber-500 bg-amber-500 text-amber-950 shadow-sm' : btnIdle) }, [h('span', { key: 'dot', className: 'mx-auto flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black' }, stepIndex + 1), h('span', { key: 'label', className: 'mt-1 block text-[10px] font-bold leading-tight' }, step.label)]);
            })),
            h('div', { key: 'depth', className: 'mt-3' }, [
              h('div', { key: 'depth-head', className: 'flex items-center justify-between text-[10px] font-black uppercase tracking-wider ' + muted }, [h('span', { key: 'label' }, 'Depth shading'), h('span', { key: 'value' }, 'Heat + pressure')]),
              h('div', { key: 'bar', className: 'mt-1 h-2 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-red-600', role: 'img', 'aria-label': 'Depth shading: surface at left, increasing heat and pressure toward the right' }),
              h('div', { key: 'labels', className: 'mt-1 flex justify-between text-[10px] ' + muted }, h('span', null, 'Surface'), h('span', null, 'Deeper / hotter')),
              h('p', { key: 'depth-copy', className: 'mt-1 text-[10.5px] leading-snug ' + muted }, cue.depth)
            ])
          ]));
      }

      function activateBeacon(beacon) {
        if (!beacon) return;
        setActiveBeaconId(beacon.id); setSceneJourneyStep(Number.isFinite(beacon.stage) ? beacon.stage : 0); setModeState('investigate'); upd('mode', 'investigate');
        setRouteTarget('beacons'); setHintShown(false);
        try { if (window[ENGINE_KEY]) { if (beacon.view) setCameraView(beacon.view); if (beacon.key && window[ENGINE_KEY].setHighlight) window[ENGINE_KEY].setHighlight(beacon.key); } } catch (e) {}
        if (missionForScene().signal && Number.isFinite(beacon.stage)) revealSignalStep(beacon.stage);
        else if (beacon.key && SCENE.palette && SCENE.palette[beacon.key]) selectRock(rockFacts(beacon.key, DEPTH_GUESS[beacon.key] || 4), false, beacon.detail);
        addNotebookEvidence('landmark', beacon.label, beacon.detail, 'beacon-' + beacon.id);
        announce(beacon.label + '. ' + beacon.detail);
        setTimeout(function () { try { var node = document.querySelector('[data-geology-target="beacons"]'); if (node) { node.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'center' }); try { node.focus({ preventScroll: true }); } catch (e) { node.focus(); } } } catch (e) {} }, 80);
      }

      function startBeaconTour() {
        var items = sceneBeaconsFor(SCENE.id);
        if (!items.length) return;
        setBeaconTourOn(true); setBeaconTourStep(0); activateBeacon(items[0]);
        announce('Beacon tour started. Stop 1 of ' + items.length + ': ' + items[0].label + '.');
      }
      function moveBeaconTour(delta) {
        var items = sceneBeaconsFor(SCENE.id), next = Math.max(0, Math.min(items.length - 1, beaconTourStep + delta));
        setBeaconTourOn(true); setBeaconTourStep(next); activateBeacon(items[next]);
        announce('Beacon tour stop ' + (next + 1) + ' of ' + items.length + ': ' + items[next].label + '.');
      }
      function exitBeaconTour() { setBeaconTourOn(false); setBeaconTourStep(0); announce('Beacon tour closed. You can still choose any landmark.'); }

      function sceneBeaconPanel() {
        var beacons = sceneBeaconsFor(SCENE.id), active = beacons.filter(function (item) { return item.id === activeBeaconId; })[0] || beacons[0];
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Evidence beacons', 'data-geology-beacon-panel': 'true', 'data-geology-target': 'beacons', tabIndex: -1 },
          h('div', { className: 'p-3' }, [
            h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' }, [
              h('div', { key: 'copy' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-amber-300' : 'text-amber-700') }, 'Evidence beacons'), h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + muted }, 'Jump to a landmark, highlight its material, and save the observation to your notebook.')),
              h('span', { key: 'count', className: 'text-[10px] font-bold ' + muted }, beacons.length + ' landmarks')
            ]),

            h('div', { key: 'tour', className: 'mt-2 flex flex-wrap items-center gap-1.5', 'data-geology-beacon-tour': 'true' }, [
              h('button', { key: 'start', type: 'button', 'aria-pressed': beaconTourOn ? 'true' : 'false', onClick: function () { beaconTourOn ? exitBeaconTour() : startBeaconTour(); }, className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + (beaconTourOn ? 'border-amber-500 bg-amber-500 text-amber-950' : btnIdle) }, beaconTourOn ? 'Exit beacon tour' : 'Start beacon tour'),
              beaconTourOn ? h('button', { key: 'prev', type: 'button', disabled: beaconTourStep <= 0, onClick: function () { moveBeaconTour(-1); }, className: btn + (beaconTourStep <= 0 ? 'opacity-40 ' : '') + btnIdle }, '← Previous stop') : null,
              beaconTourOn ? h('button', { key: 'next', type: 'button', disabled: beaconTourStep >= beacons.length - 1, onClick: function () { moveBeaconTour(1); }, className: btn + (beaconTourStep >= beacons.length - 1 ? 'opacity-40 ' : '') + btnIdle }, 'Next stop →') : null,
              beaconTourOn ? h('span', { key: 'status', className: 'text-[10px] font-bold ' + muted, role: 'status', 'data-geology-beacon-tour-status': 'true' }, 'Stop ' + (beaconTourStep + 1) + ' of ' + beacons.length) : null
            ]),
            h('div', { key: 'list', className: 'mt-2 grid gap-1.5 sm:grid-cols-3' }, beacons.map(function (beacon, index) {
              var on = beacon.id === activeBeaconId;
              return h('button', { key: beacon.id, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Highlight ' + beacon.label, 'data-geology-beacon': beacon.id, onClick: function () { activateBeacon(beacon); }, className: 'min-w-0 rounded-lg border px-2 py-2 text-left transition-colors ' + (on ? 'border-amber-500 bg-amber-500 text-amber-950 shadow-sm' : btnIdle) }, h('span', { className: 'flex items-center gap-1.5 text-[10.5px] font-bold' }, h('span', { 'aria-hidden': 'true', className: 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]' }, String(index + 1)), h('span', { className: 'truncate' }, beacon.label)));
            })),
            h('div', { key: 'detail', className: 'mt-2 rounded-lg border-l-2 border-amber-400 bg-amber-500/10 p-2.5', role: 'status', 'data-geology-beacon-detail': 'true' }, [h('div', { key: 'label', className: 'text-[11px] font-extrabold ' + ink }, active.label), h('p', { key: 'body', className: 'mt-0.5 text-[11px] leading-relaxed ' + ink }, activeBeaconId ? active.detail : 'Choose a beacon to begin a focused observation.')])
          ]));
      }
      function sceneBeaconOverlay() {
        if (fpOn) return null;
        return h('div', { className: 'absolute right-2 top-14 z-10 grid gap-1', role: 'group', 'aria-label': '3D evidence beacons', 'data-geology-beacon-overlay': 'true' }, sceneBeaconsFor(SCENE.id).map(function (beacon, index) {
          var on = beacon.id === activeBeaconId;
          return h('button', { key: beacon.id, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Highlight ' + beacon.label, 'data-geology-beacon-overlay-item': beacon.id, 'data-tooltip': beacon.label, onClick: function () { activateBeacon(beacon); }, className: 'flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black shadow-sm ' + (on ? 'border-amber-200 bg-amber-400 text-amber-950' : (isDark ? 'border-slate-500 bg-slate-900/90 text-amber-200' : 'border-slate-300 bg-white/90 text-amber-700')) }, String(index + 1));
        }));
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
              h('div', { className: 'text-2xl mb-2 animate-pulse motion-reduce:animate-none' }, '🔷'),
              h('div', { className: 'text-sm ' + muted }, t('stem.geology.loading3d', 'Loading the 3D engine…'))));
        }
        function fpSet(axis, val) { try { var o = {}; o[axis] = val; if (window[ENGINE_KEY]) window[ENGINE_KEY].fpInput('move', o); } catch (e) {} }
        function padBtn(label, axis, val, aria) {
          return h('button', { key: aria, type: 'button', 'aria-label': aria,
            onPointerDown: function (e) { try { e.preventDefault(); } catch (x) {} fpSet(axis, val); },
            onPointerUp: function () { fpSet(axis, 0); }, onPointerLeave: function () { fpSet(axis, 0); },
            className: 'w-8 h-8 flex items-center justify-center rounded-md border text-sm font-bold select-none touch-none ' + (isDark ? 'bg-slate-900/80 border-slate-600 text-slate-100 active:bg-slate-700' : 'bg-white/85 border-slate-300 text-slate-700 active:bg-slate-200') }, label);
        }
        var emptyCell = function (k) { return h('span', { key: k }); };
        return h('div', Object.assign({ ref: fsRef, className: (isFs ? 'fixed inset-0 z-[9999] overflow-hidden bg-[#060913]' : 'relative rounded-xl overflow-hidden border ' + (isDark ? 'border-slate-700' : 'border-slate-300')) }, isFs ? { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'geology-fullscreen-title', tabIndex: -1, 'data-geology-fullscreen': 'true' } : {}),
          isFs ? h('h2', { id: 'geology-fullscreen-title', className: 'sr-only' }, t('stem.geology.fullscreen_title', 'Fullscreen geology explorer')) : null,
          sceneBeaconOverlay(),
          processCueOverlay(),
          cameraCompassOverlay(),
          h('div', { ref: containerRef, tabIndex: fpOn ? 0 : undefined, style: { height: isFs ? '100vh' : 'min(58vh, 460px)', minHeight: 320, background: '#060913', cursor: fpOn ? 'move' : (excavate ? 'crosshair' : 'grab') }, className: fpOn ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset' : undefined, role: fpOn ? 'application' : 'img', 'aria-label': fpOn ? 'First-person geology explorer. W A S D or arrow keys to fly, Q and E for up and down, I J K L or drag to look, Escape to exit.' : 'Interactive 3D voxel cross-section of the crust. Use the rock list below for a non-visual version.' }),
          h('div', { className: 'absolute top-2 left-2 z-10 flex gap-1' },
            [['iso', '3D'], ['front', 'Front'], ['top', 'Top']].map(function (vw) {
              return h('button', { key: vw[0], type: 'button', disabled: fpOn, onClick: function () { setCameraView(vw[0]); }, 'aria-label': 'Camera view: ' + vw[1], className: 'transition-colors active:scale-[0.97] text-[10px] font-bold px-2 py-1 rounded-md border ' + (fpOn ? 'opacity-40 cursor-not-allowed ' : '') + (isDark ? 'bg-slate-900/75 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-white') }, vw[1]);
            }).concat([
              h('button', { key: 'fp', ref: fpToggleRef, type: 'button', 'aria-pressed': fpOn ? 'true' : 'false', 'aria-label': fpOn ? 'Exit first-person explorer' : 'Drop into the world — first-person explorer', onClick: function () { setFpOn(function (v) { return !v; }); }, className: 'transition-colors active:scale-[0.97] text-[10px] font-bold px-2 py-1 rounded-md border ' + (fpOn ? 'bg-emerald-500 border-emerald-400 text-emerald-950' : (isDark ? 'bg-slate-900/75 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-white')) }, fpOn ? ('🚪 ' + t('stem.geology.fp_exit', 'Exit')) : ('🚶 ' + t('stem.geology.fp_enter', 'Drop in')))
            ])),
          h('button', { ref: fsToggleRef, type: 'button', 'data-geology-fullscreen-toggle': 'true', onClick: toggleFullscreen, title: isFs ? t('stem.geology.exit_fullscreen', 'Exit fullscreen') : t('stem.geology.fullscreen', 'Fullscreen'), 'aria-label': isFs ? 'Exit fullscreen 3D view' : 'Fullscreen 3D view', className: 'absolute top-2 right-2 z-10 min-h-11 min-w-11 transition-colors active:scale-[0.97] text-base leading-none px-2 py-1.5 rounded-lg border ' + (isDark ? 'bg-slate-900/80 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/85 border-slate-300 text-slate-700 hover:bg-white') }, isFs ? '✕' : '⛶'),
          fpOn ? null : h('select', { value: res, 'aria-label': t('stem.geology.detail', 'Voxel detail level'), title: t('stem.geology.detail_tip', 'Higher detail = smaller, sharper voxels (heavier on weak devices)'), onChange: function (e) { var v = e.target.value; setRes(v); upd('res', v); setSlice(0); setExcavate(false); }, className: 'absolute bottom-2 left-2 z-10 text-[10px] font-bold px-1.5 py-1 rounded-md border cursor-pointer ' + (isDark ? 'bg-slate-900/80 border-slate-600 text-slate-100' : 'bg-white/85 border-slate-300 text-slate-700') },
            h('option', { value: 'low' }, t('stem.geology.detail_low', 'Detail: Low')),
            h('option', { value: 'standard' }, t('stem.geology.detail_std', 'Detail: Standard')),
            h('option', { value: 'high' }, t('stem.geology.detail_high', 'Detail: High'))),
          // first-person touch move-pad (forward/back/strafe + up/down) — tablets; keyboard does the same
          fpOn ? h('div', { className: 'absolute bottom-2 left-2 z-10 grid gap-1', style: { gridTemplateColumns: 'repeat(3, auto)' }, role: 'group', 'aria-label': 'First-person move controls' },
            emptyCell('a'), padBtn('▲', 'fwd', 1, 'Move forward'), emptyCell('b'),
            padBtn('◀', 'strafe', -1, 'Move left'), padBtn('▼', 'fwd', -1, 'Move back'), padBtn('▶', 'strafe', 1, 'Move right'),
            padBtn('⤒', 'vert', 1, 'Move up'), emptyCell('c'), padBtn('⤓', 'vert', -1, 'Move down')) : null,
          // on-screen key legend (visual; SR gets layer announcements via the live region)
          fpOn ? h('div', { className: 'absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[9.5px] px-2 py-1 rounded-md whitespace-nowrap ' + (isDark ? 'bg-slate-900/70 text-slate-300' : 'bg-white/80 text-slate-600'), 'aria-hidden': 'true' }, t('stem.geology.fp_keys', 'WASD / arrows fly · Q E up·down · IJKL / drag look · Esc exit')) : null,
          // live "you are here" science HUD (announced separately via the polite live region)
          (fpOn && fpHud) ? h('div', { className: 'absolute bottom-2 right-2 z-10 max-w-[220px] p-2.5 rounded-xl border ' + (isDark ? 'bg-slate-900/85 border-slate-600 text-slate-100' : 'bg-white/90 border-slate-300 text-slate-800'), role: 'status', 'aria-hidden': 'true' },
            h('div', { className: 'text-[12px] font-extrabold' }, '📍 ' + fpHud.layerName),
            fpHud.type ? h('span', { className: 'inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 mb-1', style: { color: (TYPE_COLOR[fpHud.type] || '#64748b'), background: (TYPE_COLOR[fpHud.type] || '#64748b') + '22' } }, fpHud.type) : null,
            h('div', { className: 'grid gap-0.5 text-[11px]', style: { gridTemplateColumns: 'auto 1fr' } },
              h('span', { className: muted }, t('stem.geology.depth', 'Depth')), h('span', null, '≈ ' + fpHud.depthKm + ' km'),
              h('span', { className: muted }, t('stem.geology.temp', 'Temp')), h('span', null, (typeof fpHud.tempC === 'number' ? '≈ ' + fpHud.tempC : fpHud.tempC) + ' °C'),
              h('span', { className: muted }, t('stem.geology.pressure', 'Pressure')), h('span', null, '≈ ' + fpHud.presMPa + ' MPa'),
              (fpHud.state && fpHud.state !== 'solid') ? h('span', { className: muted }, t('stem.geology.state', 'State')) : null,
              (fpHud.state && fpHud.state !== 'solid') ? h('span', { className: 'font-semibold', style: { color: '#f59e0b' } }, fpHud.state) : null),
            fpHud.blurb ? h('div', { className: 'mt-1 text-[10.5px] leading-snug' }, fpHud.blurb) : null,
            fpHud.bust ? h('div', { className: 'mt-1 text-[10.5px] leading-snug font-semibold', style: { color: '#f59e0b' } }, '⚠ ' + fpHud.bust) : null) : null);
      }

      var btn = 'transition-colors active:scale-[0.97] text-xs font-bold px-3 py-2 rounded-lg border ';
      var btnIdle = isDark ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100';
      var sceneMission = missionForScene();
      var sceneContext = missionContext();
      var missionItems = missionItemsForScene();
      var identifiedCount = sceneContext.identifiedCount;
      var fossilCount = Object.keys(found || {}).length;
      var sceneLabel = (SCENES[scene] && SCENES[scene].label) || scene;
      var fieldEvidence = sceneContext.evidence.length + (core ? 1 : 0) + (d.datedRock ? 1 : 0);
      var fieldNext = missionIsComplete()
        ? 'Your field checks are complete. Switch to Assess and explain your evidence.'
        : !selected
          ? sceneMission.evidencePrompt
          : identifiedCount < 3
            ? 'Select another material and compare what changed.'
            : 'Use the mission checklist to collect one more piece of evidence.';
      var inInvestigation = mode !== 'explore';
      var inAssessment = mode === 'assess';
      var GEOLOGY_SCENE_ORDER = Object.keys(SCENES);
      var geologySceneTabKeyDown = function(e, index) {
        var nextIndex = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % GEOLOGY_SCENE_ORDER.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + GEOLOGY_SCENE_ORDER.length - 1) % GEOLOGY_SCENE_ORDER.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = GEOLOGY_SCENE_ORDER.length - 1;
        if (nextIndex < 0) return;
        e.preventDefault();
        var tabs = e.currentTarget && e.currentTarget.parentNode
          ? e.currentTarget.parentNode.querySelectorAll('[role="tab"]')
          : [];
        var nextTab = tabs[nextIndex];
        if (nextTab) {
          nextTab.focus();
          nextTab.click();
        }
      };

      return h('div', { className: 'space-y-3 animate-in fade-in duration-200', 'data-geology-tool': 'true', 'data-geology-theme': isContrast ? 'contrast' : (isDark ? 'dark' : 'light'), style: isContrast ? { background: '#000000', color: '#ffffff', padding: '2px' } : null },
        // live region (SR)
        h('div', { id: 'allo-live-geology', 'aria-live': 'polite', 'aria-atomic': 'true', role: 'status', className: 'sr-only' }),
        // header
        h('section', { 'data-geology-command': 'true', className: 'overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-slate-950 via-stone-900 to-violet-950 text-white shadow-xl' },
          h('div', { className: 'p-4 sm:p-5' },
            h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
              h('div', { className: 'min-w-0' },
                h('div', { className: 'flex items-center gap-2' },
                  setStemLabTool ? h('button', { onClick: function () { setStemLabTool(null); }, 'aria-label': t('stem.back', 'Back to tools'), className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-300' }, ArrowLeft ? h(ArrowLeft, { size: 18 }) : '←') : null,
                  h('span', { className: 'rounded-full bg-amber-300/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100 ring-1 ring-amber-200/30' }, t('stem.geology.scene.' + scene + '.eyebrow', sceneMission.eyebrow))
                ),
                h('h2', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, '⛰️ ' + t('stem.geology.title', 'Geology Explorer')),
                h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-stone-200' }, t('stem.geology.scene.' + scene + '.subtitle', sceneMission.subtitle)),
                h('div', { className: 'mt-3 rounded-xl border border-white/15 bg-white/10 p-3' },
                  h('p', { className: 'text-[10px] font-black uppercase tracking-[0.16em] text-amber-200' }, t('stem.geology.next_move', 'Recommended next move')),
                  h('p', { className: 'mt-1 text-sm font-semibold text-white' }, fieldNext)
                )
              ),
              h('div', { className: 'grid grid-cols-3 gap-2 lg:w-[22rem]' },
                [
                  { label: t('stem.geology.metric.world', 'World'), value: sceneLabel },
                  { label: t('stem.geology.metric.materials', 'Materials'), value: String(identifiedCount) },
                  { label: t('stem.geology.metric.evidence', 'Evidence'), value: String(fieldEvidence) }
                ].map(function (metric) {
                  return h('div', { key: metric.label, className: 'min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center' },
                    h('div', { className: 'truncate text-sm font-black text-white', title: metric.value }, metric.value),
                    h('div', { className: 'mt-1 text-[10px] font-bold uppercase tracking-wider text-stone-300' }, metric.label)
                  );
                })
              )
            ),
            h('ol', { className: 'mt-4 grid gap-2 text-xs sm:grid-cols-3', 'aria-label': 'Geology field investigation pathway' },
              [
                { n: '1', title: 'Observe', detail: 'Explore a world and select material.' },
                { n: '2', title: 'Compare', detail: 'Connect layers, depth, and processes.' },
                { n: '3', title: 'Reconstruct', detail: 'Use evidence to explain its history.' }
              ].map(function (step) {
                return h('li', { key: step.n, className: 'flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5' },
                  h('span', { className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300 font-black text-slate-950' }, step.n),
                  h('span', null, h('strong', { className: 'block text-white' }, step.title), h('span', { className: 'text-stone-300' }, step.detail))
                );
              })
            )
          )
        ),
        h('div', { className: 'flex flex-wrap items-center gap-1.5', role: 'group', 'aria-label': t('stem.geology.mode_group', 'Investigation mode') },
          [['explore', 'Explore', 'Select and orient'], ['investigate', 'Investigate', 'Collect observations'], ['assess', 'Assess', 'Explain evidence']].map(function (item) {
            var active = mode === item[0];
            return h('button', { key: item[0], type: 'button', 'aria-pressed': active ? 'true' : 'false', onClick: function () { setModeState(item[0]); upd('mode', item[0]); }, className: 'rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ' + (active ? 'border-amber-500 bg-amber-500 text-amber-950' : btnIdle) }, t('stem.geology.mode.' + item[0], item[1]) + ' ? ' + t('stem.geology.mode.' + item[0] + '.hint', item[2]));
          })
        ),
        h('div', { className: 'flex flex-wrap items-center gap-1.5', role: 'group', 'aria-label': t('stem.geology.lesson_group', 'Lesson tools') },
          h('button', { type: 'button', 'aria-pressed': lessonGuideOpen ? 'true' : 'false', onClick: function () { var next = !lessonGuideOpen; setLessonGuideOpen(next); upd('lessonGuide', next); }, className: 'rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ' + (lessonGuideOpen ? 'border-sky-500 bg-sky-600 text-white' : btnIdle) }, lessonGuideOpen ? t('stem.geology.lesson_hide', 'Hide lesson guide') : t('stem.geology.lesson_open', 'Lesson guide'))),
        lessonGuidePanel(),
        sceneMissionPanel(),
        sceneJourneyPanel(),
        // scene picker (worlds) — switching rebuilds the 3D voxel scene
        h('div', { className: 'flex flex-wrap items-center gap-1.5', role: 'tablist', 'aria-label': t('stem.geology.scene', 'Scene') },
          GEOLOGY_SCENE_ORDER.map(function (sid, sceneIndex) {
            var on = scene === sid;
            return h('button', {
              key: sid, type: 'button', role: 'tab',
              id: 'stem-geology-tab-' + sid,
              'aria-controls': 'stem-geology-panel-' + sid,
              'aria-selected': on ? 'true' : 'false',
              tabIndex: on ? 0 : -1,
              onKeyDown: function(e) { geologySceneTabKeyDown(e, sceneIndex); },
              onClick: function () { if (sid === scene) return; setSceneState(sid); upd('scene', sid); setCompareSceneId(defaultComparisonScene(sid)); setModeState('explore'); upd('mode', 'explore'); setHintShown(false); setVocabularyOpen(false); setSequenceOrder(sequenceInitialOrder(sid)); setSequenceFeedback(null); setSequenceDragKey(null); setSequenceTapKey(null); setSceneJourneyStep(0); setCompareStage(0); setActiveBeaconId(null); setBeaconTourOn(false); setBeaconTourStep(0); setCameraViewState('iso'); setRouteTarget(null); setSignalStep((d.sceneSignals && Number.isFinite(d.sceneSignals[sid])) ? d.sceneSignals[sid] : 0); setSlice(0); setExcavate(false); setSelected(null); setCompareList([]); setCore(null); setWaterOn(false); setQuizI(0); setQuizAns(null); },
              className: 'transition-colors active:scale-[0.97] text-xs font-bold px-3 py-1.5 rounded-lg border ' + (on ? 'bg-violet-600 border-violet-500 text-white' : (isDark ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'))
            }, SCENES[sid].label);
          })),
        // main: viewport + controls (left) | info + cross-section + list (right)
        h('div', { className: 'grid gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]',
          role: 'tabpanel', id: 'stem-geology-panel-' + scene,
          'aria-labelledby': 'stem-geology-tab-' + scene, tabIndex: 0 },
          h('div', { className: 'space-y-2' },
            inInvestigation && feat.history ? historyBar() : null,
            inInvestigation && feat.volcano ? eruptionBar() : null,
            viewport(),
            cameraOrientationPanel(),
            sceneBeaconPanel(),
            processCuePanel(),
            // controls
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('label', { className: 'flex items-center gap-2 text-xs ' + ink },
                h('span', { className: muted }, t('stem.geology.slice', 'Slice')),
                h('input', { type: 'range', min: 0, max: NZ - 1, value: slice, disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, 'aria-label': 'Cross-section slice depth', onChange: function (e) { var v = +e.target.value; setSlice(v); if (window[ENGINE_KEY]) window[ENGINE_KEY].setSlice(v); } })),
              inInvestigation && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { var nv = !excavate; setExcavate(nv); if (window[ENGINE_KEY]) window[ENGINE_KEY].setExcavate(nv); }, 'aria-pressed': excavate ? 'true' : 'false', className: btn + (excavate ? 'bg-amber-500 border-amber-400 text-amber-950' : btnIdle) }, '⛏️ ' + t('stem.geology.excavate', 'Excavate') + ': ' + (excavate ? t('stem.on', 'ON') : t('stem.off', 'OFF'))),
              h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { setSlice(0); setExcavate(false); if (window[ENGINE_KEY]) { window[ENGINE_KEY].reset(); window[ENGINE_KEY].setExcavate(false); } }, className: btn + btnIdle }, '↺ ' + t('stem.geology.reset', 'Reset')),
              inInvestigation && feat.history && h('button', { type: 'button', disabled: eruptStage >= 0, onClick: function () { if (histStage >= 0) { stopHistory(); } else { playHistory(); } }, 'aria-pressed': histStage >= 0 ? 'true' : 'false', title: t('stem.geology.play_history_tip', 'Watch the cross-section build in the order it formed'), className: btn + (histStage >= 0 ? 'bg-violet-600 border-violet-700 text-violet-50' : btnIdle) }, histStage >= 0 ? '■ ' + t('stem.geology.stop', 'Stop') : '▶ ' + t('stem.geology.play_history', 'Play history')),
              inInvestigation && feat.water && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0, onClick: function () { var nv = !waterOn; setWaterOn(nv); if (window[ENGINE_KEY]) window[ENGINE_KEY].setWaterTable(nv); if (nv) announce('Water table on. Rain soaks through permeable rock like sandstone and is trapped by the impermeable shale; the water table is the top of the saturated zone. Slice the block or read the cross-section to see it.'); }, 'aria-pressed': waterOn ? 'true' : 'false', title: t('stem.geology.water_tip', 'Show the water table and which layers hold groundwater'), className: btn + (waterOn ? 'bg-blue-700 border-blue-800 text-blue-50' : btnIdle) }, '💧 ' + t('stem.geology.water', 'Water table') + ': ' + (waterOn ? t('stem.on', 'ON') : t('stem.off', 'OFF'))),
              inInvestigation && feat.volcano && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { playEruption(); }, title: t('stem.geology.erupt_tip', 'Watch a volcano erupt — magma reaches the surface and cools fast into basalt'), className: btn + (eruptStage >= 0 ? 'bg-orange-700 border-orange-800 text-orange-50' : btnIdle) }, eruptStage >= 0 ? '🌋 ' + t('stem.geology.erupting_short', 'Erupting…') : '🌋 ' + t('stem.geology.erupt', 'Erupt')),
              h('span', { className: 'text-[11px] ' + muted }, threeReady && !webglError ? t('stem.geology.tip', 'Drag to orbit · click a block to identify') : '')),
            infoPanel(),
            inInvestigation && feat.dating ? datingPanel() : null,
            inInvestigation && feat.cycle ? cyclePanel() : null,
            inAssessment ? comparePanel() : null,
            inAssessment ? sceneComparisonPanel() : null),
          h('div', { className: 'space-y-2' },
            sceneOrientationPanel(),
            feat.crossSection
              ? h('div', { className: 'flex items-start gap-3' },
                  crossSectionSVG(),
                  h('p', { className: 'text-[11px] leading-relaxed ' + muted }, t('stem.geology.teach', 'Deeper sedimentary layers are older (superposition). The granite pluton is YOUNGER than the layers it cuts (cross-cutting), and it bakes a metamorphic rim (contact metamorphism). Heat + pressure rise with depth toward the magma — where the rock cycle restarts.')))
              : h('div', { className: 'space-y-2' },
                  h('div', { className: 'rounded-xl border p-3 ' + cardBg, role: 'region', 'aria-label': 'What to notice' },
                    h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'What to notice'),
                    h('ul', { className: 'mt-1 space-y-1 text-[11.5px] ' + ink }, sceneMission.notice.map(function (notice, i) { return h('li', { key: i, className: 'flex gap-1.5' }, h('span', { 'aria-hidden': 'true' }, '•'), h('span', null, notice)); }))),
                  h('details', { className: 'rounded-xl border p-3 ' + cardBg },
                    h('summary', { className: 'cursor-pointer text-[11px] font-bold ' + ink }, t('stem.geology.context_summary', 'Read the science context')),
                    h('p', { className: 'mt-2 text-[11px] leading-relaxed ' + ink }, t('stem.geology.scene.' + SCENE.id + '.context', SCENE.blurb)),
                    h('p', { className: 'mt-2 text-[10.5px] font-semibold ' + muted }, 'Schematic model — not to scale. Colors are illustrative.'))),
            SCENE.id !== 'crust' ? sceneSignalPanel() : null,
            inInvestigation ? sceneSequencePanel() : null,
            h('div', { className: 'text-[11px] font-bold ' + muted }, feat.crossSection ? t('stem.geology.rocks', 'Rock types') : ((SCENE.id === 'deepEarth' || SCENE.id === 'subduction') ? t('stem.geology.layers', 'Layers') : t('stem.geology.minerals', 'Minerals'))),
            strataList(),
            feat.fossils ? fossilStrip() : null,
            inInvestigation && feat.cores ? h('div', { className: 'space-y-1.5' + routeTargetClass('core'), tabIndex: -1, 'data-geology-target': 'core' },
              h('div', { className: 'text-[11px] font-bold ' + muted }, '🪛 ' + t('stem.geology.core_title', 'Drill a core sample')),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                CORE_SITES.map(function (site) {
                  var on = core && core.id === site.id;
                  return h('button', { key: site.id, type: 'button', onClick: function () { takeCore(site); }, 'aria-pressed': on ? 'true' : 'false', title: site.blurb, className: 'transition-colors active:scale-[0.97] text-[11px] font-bold px-2.5 py-1.5 rounded-lg border ' + (on ? 'bg-amber-500 border-amber-400 text-amber-950' : (isDark ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-amber-400' : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-400')) }, site.icon + ' ' + t('stem.geology.core_' + site.id, site.label));
                })),
              corePanel()) : null))
        , inAssessment ? quizPanel() : null
        , reconstructPanel()
      );
    }
  });

  console.log('[StemLab] stem_tool_geologyexplorer.js loaded');
})();
