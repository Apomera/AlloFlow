/* stem_tool_geologyexplorer.js — Geology Explorer
 *
 * An immersive voxel cross-section of the crust (three.js r128), sibling to
 * Geometry World but focused on geology. One scene teaches: superposition
 * (deeper sedimentary = older), cross-cutting (a younger granite pluton cuts the
 * layers), contact metamorphism (a baked aureole), depth -> temperature/pressure,
 * and where the rock cycle restarts (magma). Graduated from the
 * docs/geology_explorer_spike.html prototype. Six more scenes share the same
 * voxel engine: crystal cavern, deep Earth, subduction zone, mid-ocean ridge,
 * hotspot chain, and a continent–continent mountain belt (scene 7).
 *
 * Hooks-safety: every hook is declared unconditionally at the top of render();
 * the THREE-not-ready / WebGL-failure branches choose the VISUAL only (never an
 * early return before a hook) — avoids the throwlab/optics "more hooks" crash.
 *
 * a11y: the 3D canvas is an ENHANCEMENT. The accessible core is an always-present
 * cross-section or scene evidence map (SVG) + a keyboard-navigable material list;
 * selecting a material there shows the same info and announces it via a live
 * region. Screen-reader and keyboard-only users — and anyone whose WebGL fails —
 * retain the learning core.
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
    'Water': '#38bdf8', 'Igneous (basalt)': '#64748b', 'Mantle (rigid)': '#b45309', 'Mantle (ductile)': '#ef4444', 'Mantle (plume)': '#f97316',
    'Continental': '#a16207', 'Fault zone': '#57534e' };
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
  function factRow(id, label, value, speech, emphasis) {
    return { id: id, label: label, value: value, speech: speech || (label + ' ' + value), emphasis: !!emphasis };
  }
  function temperatureValue(tempC) { return (typeof tempC === 'number' ? '≈ ' + tempC : String(tempC)) + ' °C'; }
  function temperatureSpeech(tempC) { return 'Temperature about ' + (typeof tempC === 'number' ? tempC : String(tempC).replace(/^≈\s*/, '')) + ' degrees Celsius'; }
  function measurementSpeech(rows) {
    return (rows || []).map(function (row) { return row.speech || (row.label + ' ' + row.value); }).join('. ');
  }
  function rockFacts(key, y) {
    var R = (SCENE && SCENE.palette[key]) || ROCKS[key];
    var depthRaw = (R && R.depthKm != null) ? R.depthKm : y * KM_PER_VOXEL;   // radial scenes carry their own depth
    var g = (SCENE ? SCENE.geotherm : crustGeotherm)(depthRaw, key);
    var digits = SCENE && SCENE.id === 'geode' ? 4 : 1;
    var facts = { key: key, R: R, depthKm: depthRaw.toFixed(digits), tempC: g.tempC, presMPa: g.presMPa, state: g.state };
    facts.measurements = sceneMeasurementRows(SCENE && SCENE.id, facts);
    facts.measurementSummary = measurementSpeech(facts.measurements);
    return facts;
  }

  // ── First-person "drop into the world" explorer — pure, testable seams ─────────
  // Surface scenes use a grounded mine/walk model; Deep Earth deliberately keeps the
  // ghost-flight model because concentric shells have no meaningful horizontal floor.
  // The HUD defers ALL science to rockFacts() so each scene keeps its own geotherm
  // (crust linear, deepEarth non-linear — never the ~160,000°C artifact). Pointer-lock
  // is not required in the Canvas iframe: look = drag + keyboard, mine = click/tap.
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
  function fpExplorerMode(sceneId) { return sceneId === 'deepEarth' ? 'fly' : 'mine'; }
  // Gameplay properties are deliberately keyed by the material's physical state,
  // not by its colour. Water can be entered and swum through; molten cells are a
  // checkpoint hazard; everything else supports the grounded capsule.
  var FP_FLUID_MATERIALS = { oceanWater: 1, outerCore: 1 };
  var FP_HAZARD_MATERIALS = { magma: 1, arcMagma: 1, axialMagma: 1, conduit: 1 };
  function fpMaterialPhysics(key) {
    if (FP_FLUID_MATERIALS[key]) return { kind: 'fluid', speed: 0.52, gravity: 0.18, buoyancy: 0.72 };
    if (FP_HAZARD_MATERIALS[key]) return { kind: 'hazard', speed: 0, gravity: 1, buoyancy: 0 };
    return { kind: 'solid', speed: 1, gravity: 1, buoyancy: 0 };
  }
  // Mining duration is short enough to keep the explorer brisk, but distinct
  // enough that loose sediment, layered rock, and crystalline rock feel different.
  function fpMiningProfile(key, type) {
    if (FP_FLUID_MATERIALS[key]) return { mineable: false, ms: 0, label: 'Fluid', reason: 'Water flows around the tool — swim through it and target the rock beyond.' };
    if (FP_HAZARD_MATERIALS[key] || type === 'Molten') return { mineable: false, ms: 0, label: 'Molten hazard', reason: 'Molten rock cannot be mined safely. Find a solid route around it.' };
    if (key === 'soil' || key === 'sediment') return { mineable: true, ms: 180, label: 'Loose' };
    if (key === 'sandstone' || key === 'shale' || key === 'limestone') return { mineable: true, ms: 340, label: 'Layered' };
    if (key === 'chalcedony' || key === 'agate' || key === 'quartz' || key === 'amethyst' || type === 'Mineral' || (type && type.indexOf('Mineral') === 0)) return { mineable: true, ms: 520, label: 'Crystalline' };
    if (key === 'basement' || key === 'intrusion' || key === 'gabbro' || key === 'dikes' || type === 'Igneous (intrusive)' || type === 'Metamorphic') return { mineable: true, ms: 680, label: 'Hard' };
    return { mineable: true, ms: 460, label: 'Dense' };
  }
  function fpMiningStage(progress, stages) { var total = Math.max(1, Math.round(Number(stages) || 8)); return Math.max(0, Math.min(total, Math.ceil((Number(progress) || 0) * total))); }
  function fpToolMiningDuration(profile, tool) {
    var ms = Math.max(0, Number(profile && profile.ms) || 0);
    return tool === 'drill' ? Math.max(90, Math.round(ms / 2.5)) : ms;
  }
  function fpDrillHeatRate(profile) { return 0.55 + Math.min(0.45, Math.max(0, Number(profile && profile.ms) || 0) / 1600); }
  // Directional core rigs recover an intact stratigraphic column while keeping
  // water and molten rock as meaningful boundaries rather than mineable blocks.
  var CORE_RIG_ANGLES = { vertical: 90, slant: 60, shallow: 35 };
  var CORE_RIG_DEPTHS = [6, 9, 12];
  var CORE_RIG_FEED_MODES = {
    preserve: { label: 'Preserve', speedMultiplier: 0.72, heatMultiplier: 0.55 },
    cruise: { label: 'Cruise', speedMultiplier: 1, heatMultiplier: 1 },
    torque: { label: 'Torque', speedMultiplier: 1.45, heatMultiplier: 1.55 }
  };
  var CORE_RIG_INTERVAL_SCAN_MS = 700;
  function coreRigIntervalScanMs() { return CORE_RIG_INTERVAL_SCAN_MS; }
  function coreRigIntervalScanning(scanUntil, now, running, hasCurrent) {
    var deadline = Number(scanUntil), clock = Number(now);
    return !!running && !!hasCurrent && isFinite(deadline) && isFinite(clock) && deadline > clock;
  }
  function coreRigFeedProfile(modeId) {
    var id = Object.prototype.hasOwnProperty.call(CORE_RIG_FEED_MODES, modeId) ? modeId : 'cruise';
    return Object.assign({ id: id }, CORE_RIG_FEED_MODES[id]);
  }
  function coreRigFormationLoad(key, type) {
    var profile = fpMiningProfile(key, type), label = profile && profile.label ? profile.label : 'Dense';
    var idealMode = (label === 'Loose' || label === 'Crystalline') ? 'preserve' : (label === 'Hard' ? 'torque' : 'cruise');
    return { label: label, idealMode: idealMode };
  }
  function coreRigIntegrityLoss(idealMode, selectedMode, heat, seconds) {
    var ideal = coreRigFeedProfile(idealMode).id, selected = coreRigFeedProfile(selectedMode).id;
    var safeHeat = Math.max(0, Math.min(1, Number(heat) || 0));
    var safeSeconds = Math.max(0, Math.min(10, Number(seconds) || 0));
    var mismatchRate = ideal === selected ? 0 : ((ideal === 'cruise' || selected === 'cruise') ? 0.035 : 0.06);
    var thermalRate = safeHeat > 0.64 ? (safeHeat - 0.64) * 0.22 : 0;
    return Math.round((mismatchRate + thermalRate) * safeSeconds * 100000) / 100000;
  }
  function coreRigIntegrityFromStress(stress) {
    return Math.round(Math.max(0.55, Math.min(1, 1 - (Number(stress) || 0))) * 100) / 100;
  }
  function coreRigQualitySummary(samples) {
    var values = [], pristineCount = 0;
    (Array.isArray(samples) ? samples : []).forEach(function (sample) {
      if (!sample || sample.integrity == null || !isFinite(Number(sample.integrity))) return;
      var value = Math.max(0.55, Math.min(1, Number(sample.integrity)));
      values.push(value); if (value >= 0.97) pristineCount += 1;
    });
    var averageIntegrity = values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : 1;
    averageIntegrity = Math.round(averageIntegrity * 100) / 100;
    return { ratedCount: values.length, averageIntegrity: averageIntegrity, integrityPercent: Math.round(averageIntegrity * 100), pristineCount: pristineCount };
  }
  function coreRigTrajectoryAdvice(scan) {
    if (!scan.recoverable) return 'Relocate the rig or change angle before drilling.';
    if (scan.riskLevel === 'caution') return 'A protected boundary shortens this bore; prioritize sample integrity.';
    if (scan.riskLevel === 'limited') return 'The safe column is shorter than requested; consider another trajectory.';
    if (scan.variability === 'volatile') return 'Frequent resistance changes ahead: watch each formation scan and reserve coolant.';
    if (scan.dominantFeed === 'torque') return 'Sustained resistance ahead: favor Torque feed and protect the drill head with coolant.';
    if (scan.dominantFeed === 'preserve') return 'Delicate ground dominates: favor Preserve feed to protect core integrity.';
    return 'Balanced ground ahead: begin in Cruise and respond to each formation scan.';
  }
  function coreRigTrajectoryResult(requestedDepth, recoverable, loadCounts, transitions, riskLevel) {
    var requested = Math.max(1, Math.min(24, Math.round(Number(requestedDepth) || 1)));
    var recovered = Math.max(0, Math.min(requested, Math.floor(Number(recoverable) || 0)));
    var counts = { preserve: 0, cruise: 0, torque: 0 };
    Object.keys(counts).forEach(function (mode) {
      counts[mode] = Math.max(0, Math.min(recovered, Math.floor(Number(loadCounts && loadCounts[mode]) || 0)));
    });
    var countTotal = counts.preserve + counts.cruise + counts.torque;
    if (countTotal > recovered) {
      var overflow = countTotal - recovered;
      ['torque', 'cruise', 'preserve'].forEach(function (mode) {
        var reduction = Math.min(overflow, counts[mode]);
        counts[mode] -= reduction; overflow -= reduction;
      });
    } else if (countTotal < recovered) counts.cruise += recovered - countTotal;
    var shifts = Math.max(0, Math.min(Math.max(0, recovered - 1), Math.floor(Number(transitions) || 0)));
    var variability = shifts === 0 ? 'steady'
      : (shifts <= Math.max(1, Math.floor(Math.max(0, recovered - 1) / 2)) ? 'mixed' : 'volatile');
    var allowedRisk = ['clear', 'caution', 'limited'].indexOf(riskLevel) >= 0 ? riskLevel : 'limited';
    if (!recovered || (recovered < requested && allowedRisk === 'clear')) allowedRisk = 'limited';
    var peakCount = Math.max(counts.preserve, counts.cruise, counts.torque);
    var leaders = ['preserve', 'cruise', 'torque'].filter(function (mode) { return counts[mode] === peakCount; });
    var dominantFeed = leaders.length === 1 ? leaders[0] : 'balanced';
    var result = {
      requestedDepth: requested, recoverable: recovered,
      coveragePct: Math.round(recovered / requested * 100),
      loadCounts: counts, dominantFeed: dominantFeed,
      transitions: shifts, variability: variability, riskLevel: allowedRisk
    };
    result.advice = coreRigTrajectoryAdvice(result);
    return result;
  }
  function coreRigTrajectoryScan(entries, plannedStop, requestedDepth) {
    var source = Array.isArray(entries) ? entries.slice(0, 24) : [];
    var counts = { preserve: 0, cruise: 0, torque: 0 }, previousMode = null, transitions = 0;
    source.forEach(function (entry) {
      entry = entry && typeof entry === 'object' ? entry : {};
      var load = coreRigFormationLoad(entry.key, entry.type);
      var mode = load && ['preserve', 'cruise', 'torque'].indexOf(load.idealMode) >= 0 ? load.idealMode : 'cruise';
      counts[mode] += 1;
      if (previousMode && previousMode !== mode) transitions += 1;
      previousMode = mode;
    });
    var requested = Math.max(1, Math.min(24, Math.round(Number(requestedDepth) || source.length || 1)));
    var stop = ['fluid', 'hazard', 'blocked', 'spent', 'cancelled'].indexOf(plannedStop) >= 0 ? plannedStop : null;
    var riskLevel = !source.length ? 'limited'
      : ((stop === 'fluid' || stop === 'hazard') ? 'caution'
      : (stop || source.length < requested ? 'limited' : 'clear'));
    return coreRigTrajectoryResult(requested, source.length, counts, transitions, riskLevel);
  }
  function coreRigTrajectorySnapshot(scan) {
    scan = scan && typeof scan === 'object' ? scan : {};
    return coreRigTrajectoryResult(
      scan.requestedDepth, scan.recoverable, scan.loadCounts, scan.transitions,
      ['clear', 'caution', 'limited'].indexOf(scan.riskLevel) >= 0 ? scan.riskLevel : 'limited'
    );
  }
  function coreRigTrajectorySummary(scan) {
    var safe = coreRigTrajectorySnapshot(scan);
    return safe.recoverable + '/' + safe.requestedDepth + ' recoverable · ' +
      safe.variability + ' resistance · ' + safe.transitions + ' load shift' +
      (safe.transitions === 1 ? '' : 's') + ' · ' + safe.riskLevel + ' boundary risk';
  }
  function coreRigBoreBrief(scan, samples, bestPristineStreak, finished) {
    var safeScan = coreRigTrajectorySnapshot(scan);
    var safeSamples = (Array.isArray(samples) ? samples : []).filter(function (sample) {
      return sample && typeof sample === 'object';
    }).slice(0, 24);
    var quality = coreRigQualitySummary(safeSamples);
    var integrityValues = safeSamples.filter(function (sample) { return sample.integrity != null && isFinite(Number(sample.integrity)); }).map(function (sample) { return Math.max(0.55, Math.min(1, Number(sample.integrity))); });
    var rawAverageIntegrity = integrityValues.length ? integrityValues.reduce(function (sum, value) { return sum + value; }, 0) / integrityValues.length : 0;
    var streak = Math.max(0, Math.floor(Number(bestPristineStreak) || 0));
    var recoveryTarget = safeScan.recoverable;
    var precisionTarget = Math.min(3, recoveryTarget);
    var checks = [
      {
        id: 'recovery', label: 'Recover the safe column',
        current: safeSamples.length, target: recoveryTarget, unit: 'intervals',
        met: recoveryTarget > 0 && safeSamples.length >= recoveryTarget
      },
      {
        id: 'preservation', label: 'Protect average integrity',
        current: integrityValues.length ? Math.round(rawAverageIntegrity * 1000) / 10 : 0, target: 85, unit: '% integrity',
        met: safeSamples.length > 0 && quality.ratedCount === safeSamples.length && rawAverageIntegrity >= 0.85
      },
      {
        id: 'precision', label: 'Build a pristine streak',
        current: streak, target: precisionTarget, unit: 'intervals',
        met: precisionTarget > 0 && streak >= precisionTarget
      }
    ];
    checks = checks.map(function (objective) {
      return Object.assign({}, objective, { state: objective.met ? 'met' : (finished ? 'missed' : 'pending') });
    });
    var metCount = checks.filter(function (objective) { return objective.met; }).length;
    return {
      objectives: checks, metCount: metCount, total: 3, complete: metCount === 3,
      finished: !!finished,
      summary: (finished ? 'Bore Brief ' : 'Live Bore Brief ') + metCount + '/3 complete'
    };
  }
  function coreRigPublicSample(sample, fallbackDepth) {
    sample = sample && typeof sample === 'object' ? sample : {};
    var rawIntegrity = Number(sample.integrity);
    var integrity = isFinite(rawIntegrity) ? Math.max(0.55, Math.min(1, rawIntegrity)) : null;
    var rawColor = sample.color;
    var color = typeof rawColor === 'number' && isFinite(rawColor)
      ? Math.max(0, Math.min(0xffffff, Math.floor(rawColor)))
      : (typeof rawColor === 'string' && /^#?[0-9a-f]{3,8}$/i.test(rawColor) ? rawColor.slice(0, 9) : null);
    var clean = {
      key: String(sample.key || 'unknown').slice(0, 80),
      name: String(sample.name || sample.key || 'Core sample').slice(0, 100),
      type: String(sample.type || 'Rock').slice(0, 80),
      depth: Math.max(1, Math.min(24, Math.round(Number(sample.depth) || fallbackDepth || 1)))
    };
    if (color != null) clean.color = color;
    if (integrity != null) clean.integrity = integrity;
    return clean;
  }
  function coreRigCoreCassette(samples, intervalCount, running, scanning) {
    var source = (Array.isArray(samples) ? samples : []).filter(function (sample) {
      return sample && typeof sample === 'object' && sample.key;
    }).slice(0, 24);
    var requested = Math.max(0, Math.min(24, Math.round(Number(intervalCount) || source.length)));
    var total = Math.max(source.length, requested), slots = [];
    for (var slotIndex = 0; slotIndex < total; slotIndex++) {
      if (slotIndex < source.length) {
        var cleanSample = coreRigPublicSample(source[slotIndex], slotIndex + 1);
        var feedback = cleanSample.integrity == null
          ? { integrityPercent: null, tier: 'unrated', label: 'Unrated' }
          : coreRigIntervalFeedback(cleanSample.name, cleanSample.integrity, 0);
        var qualityGlyph = feedback.tier === 'pristine' ? '◆' : (feedback.tier === 'stable' ? '◇' : (feedback.tier === 'damaged' ? '△' : '□'));
        slots.push(Object.assign({
          index: slotIndex + 1, interval: slotIndex + 1, state: 'recovered',
          integrityPercent: feedback.integrityPercent, tier: feedback.tier,
          quality: feedback.label, glyph: qualityGlyph, sample: Object.assign({}, cleanSample)
        }, cleanSample));
      } else if (!!running && slotIndex === source.length) {
        slots.push({
          index: slotIndex + 1, interval: slotIndex + 1,
          state: scanning ? 'scanning' : 'current', quality: null, glyph: scanning ? '◉' : '○'
        });
      } else {
        slots.push({ index: slotIndex + 1, interval: slotIndex + 1, state: 'pending', quality: null, glyph: '·' });
      }
    }
    return { slots: slots, revealedCount: source.length, total: total, running: !!running, scanning: !!running && !!scanning };
  }
  function coreRigCompressedCore(report) {
    report = report && typeof report === 'object' ? report : {};
    var target = Number(report.targetDepth);
    var limit = isFinite(target) && target > 0 ? Math.max(1, Math.min(24, Math.round(target))) : 24;
    var samples = (Array.isArray(report.samples) ? report.samples : []).filter(function (sample) {
      return sample && typeof sample === 'object' && sample.key;
    }).slice(0, limit).map(function (sample, index) { return coreRigPublicSample(sample, index + 1); });
    var bands = [];
    samples.forEach(function (sample) {
      var previous = bands.length ? bands[bands.length - 1] : null;
      if (!previous || previous.key !== sample.key) {
        bands.push({
          key: sample.key, name: sample.name, type: sample.type,
          color: sample.color == null ? null : sample.color,
          startDepth: sample.depth, endDepth: sample.depth, count: 1,
          avgIntegrity: sample.integrity == null ? null : sample.integrity,
          integrityTotal: sample.integrity == null ? 0 : sample.integrity,
          integrityCount: sample.integrity == null ? 0 : 1
        });
        return;
      }
      if (sample.integrity != null) {
        previous.integrityTotal += sample.integrity;
        previous.integrityCount += 1;
      }
      previous.endDepth = sample.depth; previous.count += 1;
      previous.avgIntegrity = previous.integrityCount ? Math.round(previous.integrityTotal / previous.integrityCount * 10000) / 10000 : null;
    });
    var publicBands = bands.map(function (band) {
      var cleanBand = Object.assign({}, band);
      delete cleanBand.integrityTotal; delete cleanBand.integrityCount;
      return cleanBand;
    });
    return {
      bands: publicBands,
      sequence: publicBands.map(function (band) { return band.key; }),
      sampleCount: samples.length, intervalCount: samples.length, formationCount: publicBands.length
    };
  }
  function coreRigReportStableId(report) {
    report = report && typeof report === 'object' ? report : {};
    if (report.id != null && String(report.id).trim()) return String(report.id).trim().slice(0, 180);
    var compressed = coreRigCompressedCore(report);
    return [
      String(report.sceneId || '').slice(0, 80), String(report.angle || '').slice(0, 24),
      Math.max(0, Math.round(Number(report.targetDepth) || 0)),
      Math.max(0, Math.round(Number(report.completedAt) || 0)), compressed.sequence.join('>')
    ].join('@');
  }
  function coreRigCompareReports(previousReport, nextReport) {
    previousReport = previousReport && typeof previousReport === 'object' ? previousReport : {};
    nextReport = nextReport && typeof nextReport === 'object' ? nextReport : {};
    var previousCore = coreRigCompressedCore(previousReport), nextCore = coreRigCompressedCore(nextReport);
    var previousId = coreRigReportStableId(previousReport), nextId = coreRigReportStableId(nextReport);
    var pairId = [previousId, nextId].sort().join('::');
    var previousScene = String(previousReport.sceneId || ''), nextScene = String(nextReport.sceneId || '');
    var previousAngle = CORE_RIG_ANGLES[previousReport.angle] ? previousReport.angle : null;
    var nextAngle = CORE_RIG_ANGLES[nextReport.angle] ? nextReport.angle : null;
    var previousDepth = Math.max(0, Math.round(Number(previousReport.targetDepth) || 0));
    var nextDepth = Math.max(0, Math.round(Number(nextReport.targetDepth) || 0));
    var angleChanged = previousAngle !== nextAngle, depthChanged = previousDepth !== nextDepth;
    if (!previousScene || previousScene !== nextScene || !previousAngle || !nextAngle ||
        !previousCore.sampleCount || !nextCore.sampleCount || previousId === nextId || angleChanged === depthChanged) {
      return { eligible: false, pairId: null, changedVariable: null, reason: 'Paired bore trials must share a scene and change exactly one public variable.' };
    }
    var a = previousCore.sequence, b = nextCore.sequence;
    var matrix = [], rowIndex, columnIndex;
    for (rowIndex = 0; rowIndex <= a.length; rowIndex++) {
      matrix[rowIndex] = [];
      for (columnIndex = 0; columnIndex <= b.length; columnIndex++) matrix[rowIndex][columnIndex] = 0;
    }
    for (rowIndex = 1; rowIndex <= a.length; rowIndex++) {
      for (columnIndex = 1; columnIndex <= b.length; columnIndex++) {
        matrix[rowIndex][columnIndex] = a[rowIndex - 1] === b[columnIndex - 1]
          ? matrix[rowIndex - 1][columnIndex - 1] + 1
          : Math.max(matrix[rowIndex - 1][columnIndex], matrix[rowIndex][columnIndex - 1]);
      }
    }
    var lcsLength = matrix[a.length][b.length];
    var lcsRatio = Math.round((lcsLength / Math.max(1, a.length, b.length)) * 100) / 100;
    var similarityPct = Math.round(lcsRatio * 100);
    var previousByKey = {}, nextByKey = {};
    previousCore.bands.forEach(function (band) { if (!previousByKey[band.key]) previousByKey[band.key] = band; });
    nextCore.bands.forEach(function (band) { if (!nextByKey[band.key]) nextByKey[band.key] = band; });
    var sharedFormations = [], newFormations = [], notRepeated = [];
    nextCore.bands.forEach(function (band) {
      if (previousByKey[band.key] && sharedFormations.indexOf(band.key) < 0) {
        sharedFormations.push(band.key);
      } else if (!previousByKey[band.key] && newFormations.indexOf(band.key) < 0) {
        newFormations.push(band.key);
      }
    });
    previousCore.bands.forEach(function (band) {
      if (!nextByKey[band.key] && notRepeated.indexOf(band.key) < 0) notRepeated.push(band.key);
    });
    var sharedFormationDetails = sharedFormations.map(function (key) {
      var band = nextByKey[key] || previousByKey[key];
      return { key: key, name: band ? band.name : key };
    });
    var newFormationDetails = newFormations.map(function (key) {
      var band = nextByKey[key];
      return { key: key, name: band ? band.name : key };
    });
    var changedVariable = angleChanged ? 'angle' : 'depth';
    var controlLabel = angleChanged
      ? ('Angle ' + coreRigAngleDegrees(previousAngle) + '° → ' + coreRigAngleDegrees(nextAngle) + '° · depth held at ' + previousDepth)
      : ('Depth ' + previousDepth + ' → ' + nextDepth + ' intervals · angle held at ' + coreRigAngleDegrees(previousAngle) + '°');
    var findingLevel = similarityPct >= 70 ? 'consistent' : (similarityPct >= 35 ? 'mixed' : 'different');
    var interpretation = findingLevel === 'consistent'
      ? 'These paired bore trials recovered similar sequences.'
      : (findingLevel === 'mixed'
      ? 'These paired bore trials share part of the sequence and add different evidence.'
      : 'These paired bore trials recovered different sequences; another controlled trial would strengthen the interpretation.');
    return {
      eligible: true, pairId: pairId, changedVariable: changedVariable, changed: changedVariable,
      controlLabel: controlLabel, lcsLength: lcsLength, lcsRatio: lcsRatio, similarityPct: similarityPct,
      sharedFormations: sharedFormations.slice(), newFormations: newFormations.slice(), notRepeated: notRepeated.slice(),
      sharedFormationDetails: sharedFormationDetails, newFormationDetails: newFormationDetails,
      shared: sharedFormations.slice(),
      findingLevel: findingLevel, interpretation: interpretation, finding: interpretation,
      previousCore: previousCore, nextCore: nextCore
    };
  }
  function coreRigNextExperiment(report, certification) {
    report = report && typeof report === 'object' ? report : {};
    var angle = CORE_RIG_ANGLES[report.angle] ? report.angle : null;
    var depth = Math.round(Number(report.targetDepth) || 0);
    var currentKey = coreRigProgramKey(angle, depth);
    if (!currentKey) return null;
    var catalog = coreRigProgramCatalog(), programs = normalizeCoreRigPrograms(certification);
    var angles = ['vertical', 'slant', 'shallow'];
    var angleIndex = angles.indexOf(angle), depthIndex = CORE_RIG_DEPTHS.indexOf(depth), candidates = [];
    function offer(candidateAngle, candidateDepth) {
      var key = coreRigProgramKey(candidateAngle, candidateDepth);
      if (!key || key === currentKey || candidates.some(function (item) { return item.key === key; })) return;
      var program = catalog.filter(function (item) { return item.key === key; })[0];
      if (program) candidates.push(program);
    }
    for (var angleOffset = 1; angleOffset < angles.length; angleOffset++) offer(angles[(angleIndex + angleOffset) % angles.length], depth);
    for (var deeperIndex = depthIndex + 1; deeperIndex < CORE_RIG_DEPTHS.length; deeperIndex++) offer(angle, CORE_RIG_DEPTHS[deeperIndex]);
    for (var shallowerIndex = depthIndex - 1; shallowerIndex >= 0; shallowerIndex--) offer(angle, CORE_RIG_DEPTHS[shallowerIndex]);
    var next = candidates.filter(function (candidate) {
      return !programs[candidate.key] || Number(programs[candidate.key].tier) < 1;
    })[0];
    if (!next) return null;
    var changedVariable = next.angle === angle ? 'depth' : 'angle';
    var controlLabel = changedVariable === 'depth'
      ? ('Hold angle at ' + coreRigAngleDegrees(angle) + '° · change depth ' + depth + ' → ' + next.depth)
      : ('Hold depth at ' + depth + ' intervals · change angle ' + coreRigAngleDegrees(angle) + '° → ' + next.angleDegrees + '°');
    var question = changedVariable === 'depth'
      ? ('Does a ' + next.depth + '-interval bore add another recovered formation while angle stays ' + coreRigAngleDegrees(angle) + '°?')
      : ('Does changing to ' + next.angleDegrees + '° alter the recovered sequence while depth stays ' + depth + ' intervals?');
    return {
      mode: 'compare', programKey: next.key, angle: next.angle, angleDegrees: next.angleDegrees,
      depth: next.depth, changedVariable: changedVariable, changed: changedVariable,
      controlLabel: controlLabel, question: question
    };
  }
  function coreRigIntervalFeedback(name, integrity, pristineStreak) {
    var numericIntegrity = Number(integrity);
    var safeIntegrity = isFinite(numericIntegrity) ? Math.max(0.55, Math.min(1, numericIntegrity)) : 1;
    var integrityPercent = Math.round(safeIntegrity * 100);
    var streak = Math.max(0, Math.floor(Number(pristineStreak) || 0));
    var tier = safeIntegrity >= 0.97 ? 'pristine' : (safeIntegrity >= 0.85 ? 'stable' : 'damaged');
    var label = tier === 'pristine' ? 'Pristine' : (tier === 'stable' ? 'Stable' : 'Damaged');
    var sampleName = String(name || 'Core sample');
    return {
      name: sampleName, integrity: safeIntegrity, integrityPercent: integrityPercent,
      pristineStreak: streak, tier: tier, label: label,
      summary: label + ' core · ' + sampleName + ' · ' + integrityPercent + '% integrity · ' + (tier === 'pristine' ? ('pristine streak ' + streak) : 'streak reset')
    };
  }
  function coreRigFormationCue(formationLoad, idealMode, previousResult) {
    var load = String(formationLoad || 'Dense');
    var profile = coreRigFeedProfile(String(idealMode || 'cruise').toLowerCase());
    var previousSummary = previousResult && previousResult.summary ? String(previousResult.summary) : '';
    var prompt = previousSummary
      ? previousSummary + '. Next formation: ' + load + ' load. Select ' + profile.label + ' feed.'
      : 'Formation scan. ' + load + ' load. Select ' + profile.label + ' feed.';
    return { formationLoad: load, idealFeedMode: profile.id, idealFeedLabel: profile.label, prompt: prompt };
  }
  function coreRigChallengeProgress(replayScore, bestScore, resultScore) {
    function cleanScore(value) { return Math.max(0, Math.min(200, Math.floor(Number(value) || 0))); }
    var replay = cleanScore(replayScore), best = Math.max(replay, cleanScore(bestScore));
    var hasResult = resultScore !== null && resultScore !== undefined && isFinite(Number(resultScore));
    var result = hasResult ? cleanScore(resultScore) : null, delta = result == null ? null : result - replay;
    return {
      replayScore: replay, bestScore: best, xpTarget: best < 200 ? best + 1 : null, resultScore: result, delta: delta,
      state: result == null ? 'ready' : (delta > 0 ? 'beaten' : (delta === 0 ? 'matched' : 'behind'))
    };
  }
  function coreRigProgramKey(angle, depth) {
    var angleId = angle === 'vertical' || angle === 'slant' || angle === 'shallow' ? angle : null;
    var numericDepth = Number(depth), depthValue = Math.round(numericDepth || 0);
    return angleId && isFinite(numericDepth) && numericDepth === depthValue && CORE_RIG_DEPTHS.indexOf(depthValue) >= 0 ? angleId + '@' + depthValue : null;
  }
  function coreRigProgramCatalog() {
    var programs = [];
    ['vertical', 'slant', 'shallow'].forEach(function (angle) {
      CORE_RIG_DEPTHS.forEach(function (depth) {
        programs.push({ key: coreRigProgramKey(angle, depth), angle: angle, angleDegrees: coreRigAngleDegrees(angle), depth: depth });
      });
    });
    return programs;
  }
  function coreRigCertificationTiers() {
    return [
      { level: 0, id: 'unrated', label: 'Unrated' },
      { level: 1, id: 'certified', label: 'Certified' },
      { level: 2, id: 'advanced', label: 'Advanced' },
      { level: 3, id: 'mastered', label: 'Mastered' }
    ].map(function (tier) { return Object.assign({}, tier); });
  }
  function coreRigProgramScoreCeiling(report) {
    report = report && typeof report === 'object' ? report : {};
    var targetDepth = Math.max(1, Math.min(24, Math.round(Number(report.targetDepth) || coreRigReportSummary(report).sampleCount || 1)));
    return Math.min(200, targetDepth * 24 + 24);
  }
  function coreRigProgramRating(report, evaluation) {
    report = report && typeof report === 'object' ? report : {};
    evaluation = evaluation && typeof evaluation === 'object' ? evaluation : coreRigEvaluation(report);
    var theoreticalMaximum = coreRigProgramScoreCeiling(report);
    var score = Math.max(0, Math.min(theoreticalMaximum, Math.floor(Number(evaluation.score) || 0)));
    return Math.max(0, Math.min(200, Math.round(score / Math.max(1, theoreticalMaximum) * 200)));
  }
  function coreRigCertificationTier(report, evaluation) {
    report = report && typeof report === 'object' ? report : {};
    evaluation = evaluation && typeof evaluation === 'object' ? evaluation : coreRigEvaluation(report);
    var samples = Array.isArray(report.samples) ? report.samples : [];
    var quality = coreRigQualitySummary(samples);
    var suppliedIntegrity = evaluation.integrityPercent != null && isFinite(Number(evaluation.integrityPercent));
    var hasIntegrity = samples.length ? quality.ratedCount === samples.length : suppliedIntegrity;
    var integrityPercent = suppliedIntegrity
      ? Math.max(0, Math.min(100, Math.round(Number(evaluation.integrityPercent))))
      : (hasIntegrity ? quality.integrityPercent : 0);
    var score = Math.max(0, Math.min(coreRigProgramScoreCeiling(report), Math.floor(Number(evaluation.score) || 0)));
    var rating = coreRigProgramRating(report, evaluation);
    var targetDepth = Math.max(1, Number(report.targetDepth) || samples.length || 1);
    var recoveryRatio = samples.length
      ? Math.min(1, samples.length / targetDepth)
      : (evaluation.recoveryRatio != null && isFinite(Number(evaluation.recoveryRatio)) ? Math.max(0, Math.min(1, Number(evaluation.recoveryRatio))) : 0);
    var blockedStop = ['cancelled', 'blocked', 'spent'].indexOf(report.stopReason) >= 0;
    var eligibleFinish = (!!evaluation.fullCore && recoveryRatio >= 1) || (!!evaluation.safeBoundary && recoveryRatio >= 0.75);
    var eligible = !blockedStop && hasIntegrity && eligibleFinish;
    var level = eligible && rating >= 175 && integrityPercent >= 97 ? 3
      : (eligible && rating >= 135 && integrityPercent >= 92 ? 2
      : (eligible && score >= 65 && integrityPercent >= 85 ? 1 : 0));
    var tiers = coreRigCertificationTiers(), tier = tiers[level];
    return Object.assign({}, tier, {
      score: score, rating: rating, integrityPercent: integrityPercent, recoveryRatio: recoveryRatio, eligible: eligible,
      fullCore: !!evaluation.fullCore && recoveryRatio >= 1, safeBoundary: !!evaluation.safeBoundary && recoveryRatio >= 0.75
    });
  }
  function coreRigCertificationReward(previousBest, nextScore) {
    var previous = Math.max(0, Math.min(200, Math.floor(Number(previousBest) || 0)));
    var next = Math.max(0, Math.min(200, Math.floor(Number(nextScore) || 0)));
    return next > previous ? Math.max(0, Math.ceil(next / 10) - Math.ceil(previous / 10)) : 0;
  }
  function coreRigCertificationXpTarget(bestRating) {
    var best = Math.max(0, Math.min(200, Math.floor(Number(bestRating) || 0)));
    var bucket = Math.ceil(best / 10);
    return bucket >= 20 ? null : bucket * 10 + 1;
  }
  function normalizeCoreRigPrograms(programs) {
    var source = programs && programs.programs && typeof programs.programs === 'object' ? programs.programs : programs;
    source = source && typeof source === 'object' ? source : {};
    var tiers = coreRigCertificationTiers(), normalized = {};
    coreRigProgramCatalog().forEach(function (program) {
      var raw = source[program.key] && typeof source[program.key] === 'object' ? source[program.key] : {};
      var tierLevel = Math.max(0, Math.min(3, Math.floor(Number(raw.tier) || 0)));
      var scoreCeiling = coreRigProgramScoreCeiling({ targetDepth: program.depth });
      var rawBestScore = Math.max(0, Math.min(scoreCeiling, Math.floor(Number(raw.bestScore) || 0)));
      var bestScore = tierLevel >= 1 ? rawBestScore : 0;
      var lastScore = Math.max(0, Math.min(scoreCeiling, Math.floor(Number(raw.lastScore) || 0)));
      var reportIds = Array.isArray(raw.reportIds) ? raw.reportIds.map(String).filter(Boolean).slice(-8) : [];
      normalized[program.key] = Object.assign({}, raw, {
        key: program.key, angle: program.angle, angleDegrees: program.angleDegrees, depth: program.depth,
        bestScore: bestScore, bestGrade: coreRigGradeForScore(bestScore),
        bestRating: tierLevel >= 1 ? Math.max(0, Math.min(200, Math.round(Number(raw.bestRating) || coreRigProgramRating({ targetDepth: program.depth }, { score: bestScore })))) : 0,
        bestIntegrity: tierLevel >= 1 ? Math.max(0, Math.min(100, Math.round(Number(raw.bestIntegrity) || 0))) : 0,
        tier: tierLevel, tierLabel: tiers[tierLevel].label,
        attempts: Math.max(0, Math.floor(isFinite(Number(raw.attempts)) ? Number(raw.attempts) : 0)),
        lastScore: lastScore, lastGrade: coreRigGradeForScore(lastScore),
        lastRating: Math.max(0, Math.min(200, Math.round(Number(raw.lastRating) || coreRigProgramRating({ targetDepth: program.depth }, { score: lastScore })))),
        lastIntegrity: Math.max(0, Math.min(100, Math.round(Number(raw.lastIntegrity) || 0))),
        lastCompletedAt: Math.max(0, isFinite(Number(raw.lastCompletedAt)) ? Number(raw.lastCompletedAt) : 0),
        lastEligible: !!raw.lastEligible, lastFullCore: !!raw.lastFullCore, lastSafeBoundary: !!raw.lastSafeBoundary,
        lastStopReason: ['fluid', 'hazard', 'blocked', 'spent', 'cancelled'].indexOf(raw.lastStopReason) >= 0 ? raw.lastStopReason : null,
        bestReportId: raw.bestReportId == null ? null : String(raw.bestReportId),
        reportIds: reportIds
      });
    });
    return normalized;
  }
  function advanceCoreRigCertification(previousEntry, report, evaluation, completedAt, reportId) {
    previousEntry = previousEntry && typeof previousEntry === 'object' ? previousEntry : {};
    report = report && typeof report === 'object' ? report : {};
    evaluation = evaluation && typeof evaluation === 'object' ? evaluation : coreRigEvaluation(report);
    var programs = normalizeCoreRigPrograms(previousEntry);
    var baseEntry = Object.assign({}, previousEntry, { version: 1, programs: programs });
    var programKey = coreRigProgramKey(report.angle, report.targetDepth);
    if (!programKey || !programs[programKey]) {
      return { entry: baseEntry, certificationReward: 0, programKey: null, program: null, tierUp: false, newBest: false, duplicate: false, unsupported: true };
    }
    var previous = programs[programKey];
    var stableId = String(reportId || completedAt || '');
    if (stableId && previous.reportIds.indexOf(stableId) >= 0) {
      return { entry: baseEntry, certificationReward: 0, programKey: programKey, program: previous, tierUp: false, newBest: false, duplicate: true };
    }
    var assessment = coreRigCertificationTier(report, evaluation);
    var score = assessment.score, qualifies = assessment.level >= 1;
    var newBest = qualifies && score > previous.bestScore;
    var nextBest = newBest ? score : previous.bestScore;
    var newRatingBest = qualifies && assessment.rating > previous.bestRating;
    var nextBestRating = newRatingBest ? assessment.rating : previous.bestRating;
    var tierUp = assessment.level > previous.tier;
    var reportIds = stableId ? previous.reportIds.concat([stableId]).slice(-8) : previous.reportIds.slice();
    var nextProgram = Object.assign({}, previous, {
      bestScore: nextBest, bestGrade: coreRigGradeForScore(nextBest), bestRating: nextBestRating,
      bestIntegrity: qualifies ? Math.max(previous.bestIntegrity, assessment.integrityPercent) : previous.bestIntegrity,
      tier: tierUp ? assessment.level : previous.tier,
      tierLabel: coreRigCertificationTiers()[tierUp ? assessment.level : previous.tier].label,
      attempts: previous.attempts + 1,
      lastScore: score, lastGrade: coreRigGradeForScore(score), lastRating: assessment.rating, lastIntegrity: assessment.integrityPercent,
      lastCompletedAt: Math.max(0, isFinite(Number(completedAt)) ? Number(completedAt) : 0),
      lastEligible: assessment.eligible, lastFullCore: assessment.fullCore, lastSafeBoundary: assessment.safeBoundary, lastStopReason: report.stopReason || null,
      bestReportId: newBest || newRatingBest || tierUp ? (stableId || previous.bestReportId) : previous.bestReportId,
      reportIds: reportIds
    });
    var nextPrograms = Object.assign({}, programs); nextPrograms[programKey] = nextProgram;
    return {
      entry: Object.assign({}, previousEntry, { version: 1, programs: nextPrograms }),
      certificationReward: coreRigCertificationReward(previous.bestRating, nextBestRating),
      programKey: programKey, program: nextProgram, assessment: assessment,
      tierUp: tierUp, newBest: newBest, duplicate: false
    };
  }
  function coreRigCertificationGuidance(program) {
    program = program && typeof program === 'object' ? program : {};
    if (!Math.max(0, Math.floor(Number(program.attempts) || 0))) return 'Grade C, 85% integrity, and target recovery or a protected boundary after 75%';
    if (Number(program.tier) >= 3) return 'Highest operator tier earned';
    if (Number(program.tier) >= 2) return 'Mastered target: 175 program rating with 97% integrity';
    if (Number(program.tier) >= 1) return 'Advanced target: 135 program rating with 92% integrity';
    var needs = [];
    if (Number(program.lastScore) < 65) needs.push('Need Grade C');
    if (Number(program.lastIntegrity) < 85) needs.push('Need 85% integrity');
    if (!program.lastEligible || (!program.lastFullCore && !program.lastSafeBoundary)) needs.push('Recover 75% and finish at target or protected boundary');
    return needs.length ? needs.join(' · ') : 'Retry to certify this trajectory';
  }
  function coreRigCertificationSummary(entry) {
    var programs = normalizeCoreRigPrograms(entry), certified = 0, advanced = 0, mastered = 0, attempts = 0;
    var rows = { vertical: 0, slant: 0, shallow: 0 };
    coreRigProgramCatalog().forEach(function (program) {
      var cell = programs[program.key];
      attempts += cell.attempts;
      if (cell.tier >= 1) { certified += 1; rows[program.angle] += 1; }
      if (cell.tier >= 2) advanced += 1;
      if (cell.tier >= 3) mastered += 1;
    });
    var completedRows = Object.keys(rows).filter(function (angle) { return rows[angle] === CORE_RIG_DEPTHS.length; }).length;
    var title = mastered === 9 ? 'Master Core Operator' : (certified === 9 ? 'Certified Core Operator' : (certified >= 6 ? 'Directional Specialist' : (certified >= 3 ? 'Qualified Operator' : 'Operator in training')));
    return { total: 9, certified: certified, advanced: advanced, mastered: mastered, attempts: attempts, percent: Math.round(certified / 9 * 100), complete: certified === 9, completedRows: completedRows, title: title };
  }

  function coreRigSupported(sceneId) { return fpExplorerMode(sceneId) === 'mine'; }
  function coreRigAngleDegrees(angleId) { return CORE_RIG_ANGLES[angleId] || CORE_RIG_ANGLES.vertical; }
  function coreRigPath(origin, yaw, angleId, depth, bounds) {
    origin = origin || { x: 0, y: 0, z: 0 };
    bounds = bounds || {};
    var wanted = Math.max(1, Math.round(Number(depth) || CORE_RIG_DEPTHS[1]));
    var angle = coreRigAngleDegrees(angleId) * Math.PI / 180;
    var horizontal = Math.cos(angle), downward = Math.sin(angle);
    var minX = bounds.minX == null ? 0 : bounds.minX, maxX = bounds.maxX == null ? NX - 1 : bounds.maxX;
    var minY = bounds.minY == null ? 0 : bounds.minY, maxY = bounds.maxY == null ? NY - 1 : bounds.maxY;
    var minZ = bounds.minZ == null ? 0 : bounds.minZ, maxZ = bounds.maxZ == null ? NZ - 1 : bounds.maxZ;
    var cells = [], seen = {}, travelLimit = wanted * 4 + 4;
    for (var distance = 1; distance <= travelLimit && cells.length < wanted; distance++) {
      var cell = {
        x: Math.round(origin.x - Math.sin(Number(yaw) || 0) * horizontal * distance),
        y: Math.round(origin.y + downward * distance),
        z: Math.round(origin.z - Math.cos(Number(yaw) || 0) * horizontal * distance),
        distance: distance
      };
      var id = cell.x + ',' + cell.y + ',' + cell.z;
      if (seen[id]) continue;
      seen[id] = 1;
      if (cell.x < minX || cell.x > maxX || cell.y < minY || cell.y > maxY || cell.z < minZ || cell.z > maxZ) break;
      cell.depth = cells.length + 1;
      cells.push(cell);
    }
    return cells;
  }
  function coreRigStopReason(key, type) {
    if (!key || key === 'void') return 'blocked';
    var physics = fpMaterialPhysics(key);
    if (physics.kind === 'hazard' || type === 'Molten') return 'hazard';
    if (physics.kind === 'fluid') return 'fluid';
    return null;
  }
  function coreRigDrillDuration(key, type) {
    var profile = fpMiningProfile(key, type);
    return profile.mineable ? Math.max(180, Math.round(profile.ms * 0.72 + 110)) : 0;
  }
  function coreRigReportSummary(report) {
    var samples = report && Array.isArray(report.samples) ? report.samples : [];
    var unique = {}, deepest = 0;
    samples.forEach(function (sample) {
      unique[sample.key || sample.name || 'unknown'] = 1;
      deepest = Math.max(deepest, Number(sample.depth) || 0);
    });
    return {
      sampleCount: samples.length,
      uniqueMaterials: Object.keys(unique).length,
      deepest: deepest,
      stopReason: report && report.stopReason ? report.stopReason : null
    };
  }
  function coreRigGradeForScore(score) {
    var value = Math.max(0, Math.min(200, Math.floor(Number(score) || 0)));
    return value >= 175 ? 'S' : (value >= 135 ? 'A' : (value >= 100 ? 'B' : (value >= 65 ? 'C' : 'D')));
  }
  function coreRigEvaluation(report) {
    var summary = coreRigReportSummary(report);
    var targetDepth = Math.max(1, Number(report && report.targetDepth) || summary.sampleCount || 1);
    var recoveryRatio = Math.min(1, summary.sampleCount / targetDepth);
    var fullCore = !!(summary.sampleCount && !summary.stopReason && recoveryRatio >= 1);
    var safeBoundary = !!(summary.sampleCount && (summary.stopReason === 'fluid' || summary.stopReason === 'hazard'));
    var quality = coreRigQualitySummary(report && report.samples);
    var rawScore = Math.min(200, summary.sampleCount * 7 + summary.uniqueMaterials * 14 + summary.deepest * 3 + (fullCore ? 24 : 0) + (safeBoundary ? 16 : 0));
    var qualityPenalty = quality.ratedCount ? Math.round((1 - quality.averageIntegrity) * 40) : 0;
    var score = Math.max(0, rawScore - qualityPenalty);
    var grade = coreRigGradeForScore(score);
    var label = grade === 'S' ? 'Exceptional column' : (grade === 'A' ? 'Research-grade core' : (grade === 'B' ? 'Strong recovery' : (grade === 'C' ? 'Usable core' : 'Partial recovery')));
    var result = { score: score, grade: grade, label: label, fullCore: fullCore, safeBoundary: safeBoundary, recoveryRatio: recoveryRatio };
    if (quality.ratedCount) {
      result.averageIntegrity = quality.averageIntegrity; result.integrityPercent = quality.integrityPercent;
      result.pristineCount = quality.pristineCount; result.qualityPenalty = qualityPenalty;
    }
    return result;
  }
  function coreRigResearchReward(previousBest, nextScore) {
    var previous = Math.max(0, Math.min(200, Math.floor(Number(previousBest) || 0)));
    var next = Math.max(0, Math.min(200, Math.floor(Number(nextScore) || 0)));
    return next > previous ? Math.max(0, Math.ceil(next / 2) - Math.ceil(previous / 2)) : 0;
  }
  function advanceCoreRigResearch(previousEntry, evaluation, completedAt, reportId) {
    previousEntry = previousEntry && typeof previousEntry === 'object' ? previousEntry : {};
    evaluation = evaluation && typeof evaluation === 'object' ? evaluation : { score: 0 };
    var previousBest = Math.max(0, Math.min(200, Math.floor(Number(previousEntry.bestScore) || 0)));
    var score = Math.max(0, Math.min(200, Math.floor(Number(evaluation.score) || 0)));
    var previousIds = Array.isArray(previousEntry.reportIds) ? previousEntry.reportIds.map(String).slice(-12) : [];
    var stableId = String(reportId || completedAt || '');
    var duplicate = !!(stableId && previousIds.indexOf(stableId) >= 0);
    if (duplicate) {
      return { entry: Object.assign({}, previousEntry, { bestScore: previousBest, bestGrade: coreRigGradeForScore(previousBest), reportIds: previousIds }), researchReward: 0, newBest: false, duplicate: true };
    }
    var newBest = score > previousBest, bestScore = newBest ? score : previousBest;
    var reportIds = stableId ? previousIds.concat([stableId]).slice(-12) : previousIds;
    return {
      entry: Object.assign({}, previousEntry, {
        bestScore: bestScore, bestGrade: coreRigGradeForScore(bestScore),
        totalBores: Math.max(0, Math.floor(Number(previousEntry.totalBores) || 0)) + 1,
        lastScore: score, lastGrade: coreRigGradeForScore(score),
        lastCompletedAt: Math.max(0, Number(completedAt) || 0), reportIds: reportIds
      }),
      researchReward: newBest ? coreRigResearchReward(previousBest, score) : 0,
      newBest: newBest, duplicate: false
    };
  }
  function coreRigStopLabel(reason) {
    return reason === 'fluid' ? 'water boundary'
      : (reason === 'hazard' ? 'thermal boundary'
      : (reason === 'blocked' ? 'rock boundary'
      : (reason === 'spent' ? 'existing bore'
      : (reason === 'cancelled' ? 'operator-requested stop' : 'target depth'))));
  }
  function excavationWorldKey(sceneId, detail) { return String(sceneId || 'crust') + '@' + String(detail || 'standard'); }
  function fpSeedPose(sceneId) {                              // grounded eye-point for surfaces; radial midpoint for Deep Earth flight
    if (sceneId === 'deepEarth') return { pos: { x: 0, y: 0, z: WORLD.d * 0.46 }, yaw: 0, pitch: 0 };
    if (sceneId === 'geode') return { pos: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: -0.18 };   // begin in the hollow; gravity settles you on its crystal floor
    return { pos: { x: 0, y: WORLD.h * 0.5 + VOXEL * 1.58, z: WORLD.d * 0.28 }, yaw: 0, pitch: -0.42 };
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
  var FP_BLURB_RIDGE = {
    oceanWater: 'You’re in the deep ocean over the ridge — shallowest right above the axis.',
    sediment: 'You’re in deep-sea ooze — a slow rain of shells and clay, thicker the older the crust.',
    basaltN: 'You’re in pillow basalt that froze with today’s magnetic field locked in.',
    basaltR: 'You’re in REVERSED-polarity basalt — it cooled when the field pointed the other way.',
    dikes: 'You’re inside the sheeted dikes — each one a frozen crack from the crust pulling apart.',
    gabbro: 'You’re in gabbro — the same melt as the pillows above, cooled slowly into coarse crystals.',
    axialMagma: 'You’re at the axial magma lens — brand-new crust is being made right here.',
    vent: 'You’re at a black smoker — 350 °C mineral water jetting into the cold sea.',
    lithMantle: 'You’re in rigid mantle frozen onto the crust — it thickens as the plate ages.',
    asthenosphere: 'You’re in upwelling mantle — solid rock that melts a few percent as pressure drops.'
  };
  var FP_BLURB_HOTSPOT = {
    oceanWater: 'You’re in the ocean over a MOVING plate — the conveyor belt of the chain.',
    activeVolcano: 'You’re on the active shield volcano — directly over the plume today.',
    oldIsland: 'You’re on an extinct island — carried off its magma supply, now eroding.',
    seamount: 'You’re on a drowned seamount — a former island that eroded and sank.',
    oceanCrust: 'You’re in ordinary ocean crust — the plate that carries the volcanoes away.',
    lithMantle: 'You’re in the rigid mantle lid — the plume must burn through all of this.',
    conduit: 'You’re in the conduit — plume melt feeding ONLY the volcano overhead.',
    plume: 'You’re in the mantle plume — solid rock, ~200 °C hotter than its surroundings.',
    asthenosphere: 'You’re in ordinary ductile mantle — the plume is only slightly hotter than this.'
  };
  var FP_BLURB_COLLISION = {
    molasse: 'You’re in the foreland basin — gravel shed off the range, the youngest rock here.',
    foldedStrata: 'You’re in folded, thrust-stacked sea-floor layers — the crust shortened and thickened.',
    summitLimestone: 'You’re on the summit — an ancient sea floor lifted ~8 km by collision.',
    thrustZone: 'You’re inside a thrust fault — one slice of crust rode up and over another here.',
    schist: 'You’re in schist — shale baked and squeezed 15 km down (regional metamorphism).',
    gneiss: 'You’re in gneiss — the range’s core, once 25 km deep, exposed by erosion.',
    leucogranite: 'You’re in leucogranite — the over-thick crust melted a little and sweated this out.',
    suture: 'You’re in the suture — a trapped sliver of the ocean that closed here.',
    crustRoot: 'You’re in the crustal root — the iceberg-like keel that floats the range.',
    lithMantle: 'You’re in rigid mantle under both plates — the collision is still pushing today.',
    asthenosphere: 'You’re in the asthenosphere — its buoyant push-back is what holds the range up.'
  };
  var FP_BLURBS = { crust: FP_BLURB_CRUST, geode: FP_BLURB_GEODE, deepEarth: FP_BLURB_DEEP, subduction: FP_BLURB_SUB, ridge: FP_BLURB_RIDGE, hotspot: FP_BLURB_HOTSPOT, collision: FP_BLURB_COLLISION };
  function fpBlurb(sceneId, key) { var m = FP_BLURBS[sceneId] || FP_BLURB_CRUST; return (m && m[key]) || ''; }
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
    activeVolcano: 'A SHIELD volcano: runny basalt, gentle slopes — nothing like a steep, explosive arc volcano.',
    summitLimestone: 'Myth-bust: sea shells on a summit are not from a flood — collision lifted this sea floor ~8 km. Everest’s top is limestone.',
    leucogranite: 'Myth-bust: no volcanoes here. This granite came from melting the thickened crust itself — no plume, no slab, no wedge.',
    crustRoot: 'Myth-bust: a mountain is mostly BELOW you — an iceberg-like root ~70 km deep floats it on the mantle (isostasy).',
    thrustZone: 'Cross-cutting again: the fault cuts the layers, so it is younger than them — and it still slips (Nepal, 2015).',
    gneiss: 'This rock was ~25 km down. Everything above it eroded away — mountains rise AND erode at millimetres per year.',
    suture: 'Deep-sea rock on a mountainside: proof an entire ocean closed here.'
  };
  function fpBust(key) { return FP_BUST[key] || null; }
  function fpProbe(wx, wy, wz) {                              // you-are-here readout; defers all science to rockFacts (scene-aware)
    var v = fpWorldToVoxel(wx, wy, wz);
    var key = SCENE.gen(v.x, v.y, v.z);
    while (key === 'void' && v.y < NY - 1) key = SCENE.gen(v.x, ++v.y, v.z);     // geode hollow is thick → fall to the lining you actually see (mutates v.y so depth is the lining's)
    if (key === 'void') return null;                                            // fully enclosed (defensive) — never fabricate science for empty space
    var f = rockFacts(key, v.y);
    return { key: key, voxelY: v.y, depthKm: f.depthKm, tempC: f.tempC, presMPa: f.presMPa, state: f.state, measurements: f.measurements.map(function (row) { return Object.assign({}, row); }), measurementSummary: f.measurementSummary, layerName: f.R ? f.R.name : key, type: f.R ? f.R.type : '', blurb: fpBlurb(SCENE.id, key), bust: fpBust(key) };
  }
  function fpAnnounceText(p) {
    var summary = p.measurementSummary || ('Depth about ' + p.depthKm + ' kilometres. ' + temperatureSpeech(p.tempC) + '. State ' + p.state);
    return 'You are inside ' + p.layerName + ', ' + p.type + '. ' + summary + '. State ' + p.state + '.'
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
    ] },
    collision: { title: 'Test yourself — mountain belts', items: [
      { q: 'Why are sea-shell fossils found on the summit?', opts: ['A flood once covered the peak', 'Collision lifted an ancient sea floor'], correct: 1, why: 'The limestone formed on a sea floor between two continents; when they collided, the crust thickened and lifted it ~8 km.' },
      { q: 'The gneiss in the range’s core formed…', opts: ['At the surface, from lava', 'About 25 km down, then erosion exposed it'], correct: 1, why: 'Regional metamorphism: deep burial under the thickened crust recrystallised the rock; erosion later stripped away everything above it.' },
      { q: 'Why does this mountain belt have NO volcanoes?', opts: ['No slab water or plume melts the mantle here', 'Rock this cold can never melt'], correct: 0, why: 'Volcanoes need mantle melt. With no subducting slab and no plume, the mantle stays solid — only a little crustal melt (leucogranite) forms, and it freezes at depth.' },
      { q: 'What holds the range up?', opts: ['A deep, buoyant crustal root (isostasy)', 'Magma pushing up from below'], correct: 0, why: 'Like an iceberg, the range floats on a crustal root ~70 km deep. The mantle’s buoyant push-back supports the mass above.' }
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
    ],
    collision: [
      { id: 'collision-summit', misconception: 'Marine fossils on a summit mean water once covered the mountain.', remedy: 'The rock formed under a sea before the mountain existed. Collision thickened the crust and lifted that sea floor to the summit.' },
      { id: 'collision-gneiss', misconception: 'Gneiss in the core formed at the surface from lava.', remedy: 'Gneiss is metamorphic: deep burial baked and squeezed older rock. Uplift plus erosion exposed it later.' },
      { id: 'collision-volcano', misconception: 'Rock in a mountain belt is too cold to ever melt.', remedy: 'The thickened crust does melt a little, making leucogranite. What is missing is mantle melt: no slab water and no plume, so no volcanoes.' },
      { id: 'collision-root', misconception: 'Magma pushing up from below holds the range up.', remedy: 'A low-density crustal root floats the range on the mantle, the way an iceberg floats. That balance is isostasy.' }
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

  // ── Scene 7: Mountain belt (continent–continent collision) ──────────────────
  // Himalaya-style. The convergent case where NOTHING subducts: both plates are
  // buoyant granite, so the crust between them shortens, folds, and stacks along
  // thrust faults until it is ~70 km thick. Teaches crustal thickening + isostasy
  // (a buoyant root floats the range), REGIONAL metamorphism (schist/gneiss from
  // burial, vs the crust scene's CONTACT bake), crustal-melt leucogranite with NO
  // volcanoes (no wedge, no plume), sea-floor limestone lifted to the summit, a
  // suture-zone ophiolite as proof an ocean closed, and exhumation by erosion.
  var COLLISION_ROCKS = {
    molasse:         { name: 'Foreland basin gravel',    type: 'Sedimentary',          color: 0xd9b56a, depthKm: 2,  glow: 0, formation: 'Sand and gravel shed off the rising range and dumped in a basin at its foot (the Siwaliks). The mountain’s own erosion, stacked up as new rock.', minerals: 'Sandstone, conglomerate', age: 'Youngest rock here — still being deposited.' },
    foldedStrata:    { name: 'Folded, thrust-stacked strata', type: 'Sedimentary',     color: 0x8a6544, depthKm: 5,  glow: 0, formation: 'Sea-floor layers squeezed between two continents: folded like a rug and sliced along thrust faults, each slice shoved on top of the next. The crust SHORTENS and THICKENS.', minerals: 'Sandstone, shale, limestone', age: 'Deposited before the collision; deformed during it.' },
    summitLimestone: { name: 'Summit limestone',         type: 'Sedimentary',          color: 0xe6e0c8, depthKm: 0,  glow: 0, formation: 'Marine limestone — shells and sea-floor mud — now on the highest ridge. Everest’s summit is exactly this: an ancient sea floor lifted ~8 km by collision.', minerals: 'Calcite, marine fossils', age: 'Formed under a sea; lifted by collision.' },
    thrustZone:      { name: 'Thrust fault zone',        type: 'Fault zone',           color: 0x3f2a22, depthKm: 8,  glow: 0, formation: 'A gently dipping break where one crustal slice was shoved up and over another. Crushed, smeared rock marks the plane. It cuts the layers, so it is younger than them (cross-cutting).', minerals: 'Fault gouge, mylonite', age: 'Active during collision — still slipping today (Nepal, 2015).' },
    schist:          { name: 'Schist',                   type: 'Metamorphic',          color: 0x7d6b86, depthKm: 15, glow: 0, formation: 'Shale buried ~15 km under the thickened crust, heated and squeezed for millions of years until its clay recrystallised into shiny mica sheets — REGIONAL metamorphism, over a whole mountain belt, not a bake beside one pluton.', minerals: 'Mica, garnet, quartz', age: 'Metamorphosed during the collision.' },
    gneiss:          { name: 'Gneiss',                   type: 'Metamorphic',          color: 0xc4b8c8, depthKm: 25, glow: 0, formation: 'The range’s core: banded, high-grade rock that was ~25 km deep and close to melting. It is at the surface only because erosion has stripped away the kilometres of rock above it (exhumation).', minerals: 'Feldspar, quartz, mica bands', age: 'The deepest rock exposed at the surface.' },
    leucogranite:    { name: 'Leucogranite',             type: 'Igneous (intrusive)',  color: 0xe9c8dd, depthKm: 20, glow: 0, formation: 'Pale granite made by PARTIALLY MELTING the thickened crust itself — no mantle plume, no subducting slab. Wet, over-thick crust gets hot enough to sweat out a little granite melt, which freezes at depth.', minerals: 'Quartz, feldspar, muscovite, tourmaline', age: 'Intruded ~20 million years ago; cuts the gneiss it came from.' },
    suture:          { name: 'Suture-zone ophiolite',    type: 'Igneous (basalt)',     color: 0x3b5f4f, depthKm: 5,  glow: 0, formation: 'A sliver of the ocean floor that used to lie between the two continents, caught in the seam (the Indus–Tsangpo suture). Deep-sea rock on a mountainside is proof an ocean closed here.', minerals: 'Basalt, gabbro, serpentinite', age: 'The last trace of the vanished Tethys Ocean.' },
    crustRoot:       { name: 'Continental crust & root', type: 'Continental',          color: 0xb4915e, depthKm: 50, glow: 0, formation: 'Granite-type crust of both plates. Under the range it is doubled to ~70 km: like an iceberg, a mountain needs a deep, low-density ROOT to float on the mantle (isostasy) — most of the range is below sea level.', minerals: 'Granite, gneiss', age: 'The thickest crust on Earth.' },
    lithMantle:      { name: 'Lithospheric mantle',      type: 'Mantle (rigid)',       color: 0x6b3f33, depthKm: 85, glow: 0, formation: 'Rigid mantle welded under both plates. The indenting plate still pushes in at ~5 cm per year, so the collision — and the uplift — continue today.', minerals: 'Peridotite', age: 'Moves as one with the crust above it.' },
    asthenosphere:   { name: 'Asthenosphere',            type: 'Mantle (ductile)',     color: 0x8a2f22, depthKm: 100, glow: 0, formation: 'SOLID mantle that flows slowly. The crustal root presses into it and it pushes back — that buoyant support is what holds the range up.', minerals: 'Peridotite', age: 'Convects over millions of years.' }
  };
  function collisionTopo(fx) {                                  // surface height (fy): foreland plain → steep face → summit → high plateau
    return fx < 0.55 ? 0.30 - 0.26 * Math.max(0, 1 - (0.55 - fx) / 0.32) : Math.min(0.16, 0.04 + (fx - 0.55) * 0.45);
  }
  function collisionKeyAt(x, y, z) {
    var fx = NX > 1 ? x / (NX - 1) : 0;   // 0 = foreland (indenting plate) → 1 = high plateau (overriding plate)
    var fy = NY > 1 ? y / (NY - 1) : 0;   // 0 = top of block → 1 = deep
    var topo = collisionTopo(fx);
    if (fy < topo) return 'void';                                       // sky above the range
    var dz = fy - topo;                                                 // structural depth below the LOCAL surface
    var bump = fx < 0.62 ? Math.max(0, 1 - (0.62 - fx) / 0.40) : 1 - (fx - 0.62) / 1.2;
    var moho = 0.62 + 0.28 * bump;                                      // crust doubles into a ~70 km root under the range
    if (fy >= Math.min(0.97, moho + 0.08)) return 'asthenosphere';
    if (fy >= moho) return 'lithMantle';
    if (fx < 0.26) return dz < 0.10 ? 'molasse' : 'crustRoot';          // foreland basin on the indenting plate
    var fault = 0.27 + (fx - 0.26) * 0.55;                              // main thrust: surfaces at the range front, dips under the plateau
    if (fx <= 0.82 && Math.abs(fy - fault) < 0.045) return 'thrustZone';
    if (fx <= 0.82 && fy > fault) return 'crustRoot';                   // footwall: the underthrust plate
    if (fx > 0.82 && dz >= 0.24) return 'crustRoot';                    // plateau crust beyond the fault tip
    // hanging wall: stacked strata that metamorphose with burial and are exhumed on the steep face
    if (Math.abs(fx - 0.55) < 0.08 && dz < 0.10) return 'summitLimestone';
    if (Math.abs(fx - 0.78) < 0.045 && dz < 0.15) return 'suture';
    if (Math.abs(fx - 0.60) < 0.08 && dz >= 0.20 && dz < 0.30) return 'leucogranite';
    var exhume = 1 - 0.8 * Math.max(0, 1 - Math.abs(fx - 0.47) / 0.06);   // erosion on the steep face brings deep rock to the surface
    if (dz < 0.13 * exhume) return 'foldedStrata';
    if (dz < 0.24 * exhume) return 'schist';
    return 'gneiss';
  }
  function collisionGeotherm(depthKm, key) {
    // Key-based: the summit is the COLDEST rock (highest = coldest), the crustal melt is frozen, the mantle never melts.
    var T = { summitLimestone: -8, molasse: 20, foldedStrata: 60, suture: 80, thrustZone: 150, schist: 400, gneiss: 650, leucogranite: 700, crustRoot: 800, lithMantle: 1000, asthenosphere: 1330 };
    var S = { summitLimestone: 'solid (frozen summit — highest is coldest)', molasse: 'loose → cemented gravel', foldedStrata: 'solid (folded, faulted)', suture: 'solid (trapped sea floor)', thrustZone: 'solid (crushed; slips in earthquakes)', schist: 'solid (recrystallised by burial)', gneiss: 'solid (once near melting, now exhumed)', leucogranite: 'solid (crystallised crustal melt)', crustRoot: 'solid (buoyant root)', lithMantle: 'solid (rigid)', asthenosphere: 'solid (ductile — flows)' };
    return { tempC: (T[key] != null ? T[key] : Math.round(15 + depthKm * 25)), presMPa: Math.round(depthKm * 28), state: (S[key] || 'solid') };
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
      geotherm: crustGeotherm, kmPerWorldH: 0.002,
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
    },
    collision: {
      id: 'collision', label: '🏔️ Mountain belt', gen: collisionKeyAt, palette: COLLISION_ROCKS,
      order: ['molasse', 'foldedStrata', 'summitLimestone', 'thrustZone', 'schist', 'gneiss', 'leucogranite', 'suture', 'crustRoot', 'lithMantle', 'asthenosphere'],
      voxelKeys: ['molasse', 'foldedStrata', 'summitLimestone', 'thrustZone', 'schist', 'gneiss', 'leucogranite', 'suture', 'crustRoot', 'lithMantle', 'asthenosphere'],
      geotherm: collisionGeotherm, kmPerWorldH: 100,
      features: {},
      blurb: 'A continent–continent collision (schematic — not to scale), Himalaya-style. Neither plate can sink — both are buoyant granite — so the crust between them SHORTENS, folds, and stacks along thrust faults until it is ~70 km thick. Sea-floor limestone ends up on the summit; shale buried 15–25 km down bakes into schist and gneiss; the over-thick crust melts a little and sweats out pale leucogranite. No wedge, no plume: NO volcanoes. Like an iceberg, the range floats on a deep crustal root (isostasy) while erosion strips it almost as fast as it rises.'
    }
  };

  // Optional, low-pressure gameplay loop: ordered field contracts turn free digging
  // into repeatable evidence-gathering runs without restricting ordinary excavation.
  var FIELD_EXPEDITIONS = {
    crust: [
      { id: 'strata', label: 'Read the strata', targets: ['sandstone', 'shale', 'limestone'], reward: 130, brief: 'Collect the sedimentary stack from younger layers toward older layers.' },
      { id: 'contact', label: 'Map the contact zone', targets: ['hornfels', 'marble', 'intrusion'], reward: 150, brief: 'Trace heat-altered rock into the younger igneous intrusion.' }
    ],
    geode: [
      { id: 'growth', label: 'Follow crystal growth', targets: ['chalcedony', 'agate', 'quartz'], reward: 140, brief: 'Follow the mineral lining inward through three growth stages.' },
      { id: 'host', label: 'Cavity to host rock', targets: ['amethyst', 'quartz', 'limestone'], reward: 140, brief: 'Work outward from the youngest crystal tips to the older host rock.' }
    ],
    deepEarth: [
      { id: 'mantle', label: 'Cross the solid mantle', targets: ['crust', 'upperMantle', 'lowerMantle'], reward: 150, brief: 'Build a virtual transect from the crust through both solid mantle layers.' },
      { id: 'core', label: 'Virtual core transect', targets: ['lowerMantle', 'innerCore', 'upperMantle'], reward: 170, brief: 'Compare deep solid layers while remembering that this model is schematic.' }
    ],
    subduction: [
      { id: 'descending', label: 'Track the descending plate', targets: ['oceanCrust', 'slab', 'wedge'], reward: 150, brief: 'Follow the incoming plate to the water-fluxed mantle wedge.' },
      { id: 'overriding', label: 'Read the overriding plate', targets: ['contCrust', 'lithMantle', 'asthenosphere'], reward: 150, brief: 'Compare buoyant crust, rigid mantle, and ductile mantle below.' }
    ],
    ridge: [
      { id: 'ophiolite', label: 'Build the ophiolite stack', targets: ['basaltN', 'dikes', 'gabbro'], reward: 150, brief: 'Collect the classic upper-to-lower oceanic-crust sequence.' },
      { id: 'spreading', label: 'Read spreading evidence', targets: ['sediment', 'basaltR', 'vent'], reward: 150, brief: 'Link crustal age, magnetic polarity, and hydrothermal circulation.' }
    ],
    hotspot: [
      { id: 'plate', label: 'Follow the moving plate', targets: ['oldIsland', 'oceanCrust', 'lithMantle'], reward: 150, brief: 'Trace an extinct volcano into the plate carrying it away.' },
      { id: 'trail', label: 'Trace the hotspot trail', targets: ['seamount', 'plume', 'asthenosphere'], reward: 160, brief: 'Connect the oldest volcano shown to its mantle reference frame.' }
    ],
    collision: [
      { id: 'summit', label: 'Climb the stack', targets: ['molasse', 'foldedStrata', 'summitLimestone'], reward: 150, brief: 'Collect the foreland fill, the folded slices, and the sea-floor limestone on the summit.' },
      { id: 'core', label: 'Exhume the core', targets: ['schist', 'gneiss', 'leucogranite'], reward: 160, brief: 'Work from mica schist into the banded gneiss and the granite that sweated out of it.' }
    ]
  };
  function fieldExpeditionFor(sceneId, index) {
    var list = FIELD_EXPEDITIONS[sceneId] || [];
    if (!list.length) return null;
    var safeIndex = Math.max(0, Math.floor(Number(index) || 0)) % list.length;
    var item = list[safeIndex];
    return Object.assign({}, item, { targets: item.targets.slice(), index: safeIndex });
  }
  function beginFieldRun(entry, sceneId, requestedIndex) {
    var previous = (entry && typeof entry === 'object') ? entry : {};
    var completed = Math.max(0, Math.floor(Number(previous.completed) || 0));
    var contract = fieldExpeditionFor(sceneId, requestedIndex == null ? completed : requestedIndex);
    if (!contract) return null;
    return { active: true, completed: completed, contractIndex: contract.index, collected: [], ready: false };
  }
  function retireFieldRunEntry(entry) {
    var previous = (entry && typeof entry === 'object') ? entry : {};
    return { active: false, completed: Math.max(0, Math.floor(Number(previous.completed) || 0)), contractIndex: Math.max(0, Math.floor(Number(previous.contractIndex) || 0)), collected: [], ready: false };
  }
  function advanceFieldRun(entry, contract, removedKey) {
    var current = (entry && typeof entry === 'object') ? entry : {};
    var collected = Array.isArray(current.collected) ? current.collected.slice() : [];
    var nextEntry = Object.assign({}, current, { collected: collected });
    var expectedKey = contract && contract.targets ? contract.targets[collected.length] : null;
    if (!current.active || current.ready || !expectedKey || removedKey !== expectedKey) {
      return { entry: nextEntry, matched: false, ready: !!current.ready, expectedKey: expectedKey };
    }
    collected.push(removedKey);
    nextEntry.collected = collected;
    nextEntry.ready = collected.length >= contract.targets.length;
    return { entry: nextEntry, matched: true, ready: nextEntry.ready, expectedKey: nextEntry.ready ? null : contract.targets[collected.length] };
  }
  function fieldRunReward(contract) {
    return Math.max(1, Math.floor(Number(contract && contract.reward) || 100));
  }
  function fieldRankForXp(xp) {
    var value = Math.max(0, Math.floor(Number(xp) || 0));
    var ranks = [
      { label: 'Trail Scout', threshold: 0 },
      { label: 'Field Geologist', threshold: 300 },
      { label: 'Senior Geologist', threshold: 750 },
      { label: 'Expedition Lead', threshold: 1500 }
    ];
    var index = 0;
    for (var i = 1; i < ranks.length; i++) if (value >= ranks[i].threshold) index = i;
    var current = ranks[index], next = ranks[index + 1] || null;
    return { label: current.label, threshold: current.threshold, nextLabel: next ? next.label : null, nextThreshold: next ? next.threshold : null, remaining: next ? next.threshold - value : 0 };
  }
  function fieldSpecimenName(sceneId, key) {
    var sceneDef = SCENES[sceneId];
    var item = sceneDef && sceneDef.palette ? sceneDef.palette[key] : null;
    return item && item.name ? item.name : String(key || 'specimen');
  }
  function fieldCollectibleKeys(sceneId) {
    var sceneDef = SCENES[sceneId];
    if (!sceneDef) return [];
    return sceneDef.voxelKeys.filter(function (key) {
      var item = sceneDef.palette[key] || {};
      return fpMiningProfile(key, item.type).mineable;
    });
  }
  function recordFieldDiscovery(discoveredByScene, sceneId, key) {
    var source = (discoveredByScene && typeof discoveredByScene === 'object') ? discoveredByScene : {};
    var current = Array.isArray(source[sceneId]) ? source[sceneId].slice() : [];
    var valid = fieldCollectibleKeys(sceneId);
    var added = valid.indexOf(key) >= 0 && current.indexOf(key) < 0;
    if (added) current.push(key);
    var next = Object.assign({}, source); next[sceneId] = current;
    return { discoveredByScene: next, keys: current.slice(), added: added };
  }
  function fieldDiscoveryProgress(sceneId, discoveredByScene) {
    var available = fieldCollectibleKeys(sceneId);
    var saved = discoveredByScene && Array.isArray(discoveredByScene[sceneId]) ? discoveredByScene[sceneId] : [];
    var found = available.filter(function (key) { return saved.indexOf(key) >= 0; }).length;
    return { found: found, total: available.length, percent: available.length ? Math.round(found / available.length * 100) : 0, complete: available.length > 0 && found === available.length };
  }
  function fieldJournalEntries(sceneId, discoveredByScene) {
    var sceneDef = SCENES[sceneId], saved = discoveredByScene && Array.isArray(discoveredByScene[sceneId]) ? discoveredByScene[sceneId] : [];
    if (!sceneDef) return [];
    return fieldCollectibleKeys(sceneId).map(function (key) {
      var item = sceneDef.palette[key] || {};
      return { key: key, name: fieldSpecimenName(sceneId, key), type: item.type || 'Material', color: item.color, discovered: saved.indexOf(key) >= 0 };
    });
  }
  function fieldJournalSummary(discoveredByScene) {
    var found = 0, total = 0, scenesComplete = 0;
    Object.keys(SCENES).forEach(function (sceneId) {
      var progress = fieldDiscoveryProgress(sceneId, discoveredByScene);
      found += progress.found; total += progress.total; if (progress.complete) scenesComplete += 1;
    });
    return { found: found, total: total, percent: total ? Math.round(found / total * 100) : 0, scenesComplete: scenesComplete, sceneTotal: Object.keys(SCENES).length };
  }

  var GEODE_MEASUREMENTS = {
    limestone: { zone: 'Host rock outside the cavity', order: 'Predates the mineral lining' },
    chalcedony: { zone: 'Cavity wall rind', order: 'First mineral lining' },
    agate: { zone: 'Banded lining', order: 'Repeated growth pulses' },
    quartz: { zone: 'Open-space crystal zone', order: 'Later inward growth' },
    amethyst: { zone: 'Inner crystal tips', order: 'Late iron-bearing quartz growth' }
  };
  var SUBDUCTION_MEASUREMENTS = {
    oceanWater: { position: 'Ocean above the incoming plate', thermal: 'Cold surface reservoir' },
    oceanCrust: { position: 'Incoming oceanic plate', thermal: 'Cold, dense lithosphere' },
    contCrust: { position: 'Overriding continental plate', thermal: 'Cooler buoyant crust' },
    slab: { position: 'Descending plate below the trench', thermal: 'Cold slab anomaly' },
    lithMantle: { position: 'Rigid mantle beneath a plate', thermal: 'Rigid plate domain' },
    wedge: { position: 'Mantle above the descending slab', thermal: 'Hot, water-fluxed wedge' },
    asthenosphere: { position: 'Ductile mantle below the plates', thermal: 'Hot, slowly flowing mantle' },
    arcMagma: { position: 'Rising path above the mantle wedge', thermal: 'Buoyant partial melt' },
    arcVolcano: { position: 'Volcanic arc at the surface', thermal: 'Eruption above the wedge' }
  };
  var RIDGE_MEASUREMENTS = {
    oceanWater: { position: 'Above the spreading system', evidence: 'Seafloor deepens away from the axis' },
    sediment: { position: 'Older spreading flank', evidence: 'Thicker cover indicates more elapsed time' },
    basaltN: { position: 'Magnetic stripe on a spreading flank', evidence: 'Normal polarity locked in while cooling' },
    basaltR: { position: 'Mirrored magnetic stripe', evidence: 'Reversed polarity records another interval' },
    dikes: { position: 'Below the ridge-axis crust', evidence: 'Each dike records a crust-opening event' },
    gabbro: { position: 'Lower oceanic crust', evidence: 'Slow cooling makes coarse crystals' },
    axialMagma: { position: 'Ridge axis — youngest crust', evidence: 'Melt supplies new seafloor' },
    vent: { position: 'Hot young ridge flank', evidence: 'Circulating seawater carries dissolved minerals' },
    lithMantle: { position: 'Cooling plate below the crust', evidence: 'Rigid mantle thickens away from the axis' },
    asthenosphere: { position: 'Upwelling below the ridge axis', evidence: 'Pressure release drives partial melting' }
  };
  var HOTSPOT_MEASUREMENTS = {
    oceanWater: { position: 'Above the moving oceanic plate', age: 'Plate-motion reference' },
    activeVolcano: { position: 'Directly over the plume', age: 'Youngest — active now' },
    oldIsland: { position: 'Carried away from the plume', age: 'Older — extinct and eroding' },
    seamount: { position: 'Farthest along the trail shown', age: 'Oldest — eroded and drowned' },
    oceanCrust: { position: 'Moving plate beneath the chain', age: 'Carries volcanoes away from the plume' },
    lithMantle: { position: 'Rigid mantle moving with the plate', age: 'Part of the moving plate' },
    conduit: { position: 'Melt path below the active volcano', age: 'Feeds only the volcano overhead' },
    plume: { position: 'Relatively fixed mantle source', age: 'Reference point for the age trail' },
    asthenosphere: { position: 'Ductile mantle around the plume', age: 'Background mantle domain' }
  };
  var COLLISION_MEASUREMENTS = {
    molasse: { position: 'Foreland basin at the range front', burial: 'Never buried — the youngest fill' },
    foldedStrata: { position: 'Thrust-stacked slices of the hanging wall', burial: 'Shallow burial — folded, not recrystallised' },
    summitLimestone: { position: 'Summit ridge, ~8 km above sea level', burial: 'Deposited on a sea floor, then lifted' },
    thrustZone: { position: 'Main thrust plane beneath the range', burial: 'Cuts the layers — younger than them' },
    schist: { position: 'Mid-crust of the hanging wall', burial: '~15 km burial — regional metamorphism' },
    gneiss: { position: 'Exhumed core on the steep face', burial: '~25 km burial, then erosion exposed it' },
    leucogranite: { position: 'Melt pocket inside the hot core', burial: 'Partial melt of the thickened crust' },
    suture: { position: 'The seam between the two continents', burial: 'Trapped sea floor — an ocean closed here' },
    crustRoot: { position: 'Thickened crust beneath the range', burial: 'Root doubled to ~70 km — isostasy' },
    lithMantle: { position: 'Rigid mantle under both plates', burial: 'Still converging at ~5 cm per year' },
    asthenosphere: { position: 'Ductile mantle below the root', burial: 'Buoyant push-back supports the range' }
  };
  function formatMeasurementNumber(value, digits) {
    var n = Number(value);
    return isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits == null ? 1 : digits }) : String(value);
  }
  function depthMeasurement(facts, label) {
    var n = Number(facts.depthKm), shown = formatMeasurementNumber(n, n < 10 ? 1 : 0), name = label || 'Depth';
    return factRow('depth', name, '≈ ' + shown + ' km', name + ' about ' + shown + ' kilometres');
  }
  function pressureMeasurement(facts) {
    var pressure = Number(facts.presMPa);
    if (pressure >= 1000) {
      var gpa = pressure / 1000, shownGpa = formatMeasurementNumber(gpa, gpa < 10 ? 1 : 0);
      return factRow('pressure', 'Pressure', '≈ ' + shownGpa + ' GPa', 'Pressure about ' + shownGpa + ' gigapascals');
    }
    var shownMpa = formatMeasurementNumber(pressure, 0);
    return factRow('pressure', 'Pressure', '≈ ' + shownMpa + ' MPa', 'Pressure about ' + shownMpa + ' megapascals');
  }
  function temperatureMeasurement(facts) {
    return factRow('temperature', 'Temperature', temperatureValue(facts.tempC), temperatureSpeech(facts.tempC));
  }
  function sceneMeasurementRows(sceneId, facts) {
    var id = sceneId || 'crust', key = facts && facts.key;
    if (id === 'geode') {
      var geode = GEODE_MEASUREMENTS[key] || { zone: 'Mineral-lined cavity', order: 'Read growth from wall to center' };
      return [
        factRow('scale', 'Specimen scale', '≈ 2 m model span', 'Schematic specimen span about 2 metres'),
        factRow('growth-zone', 'Growth zone', geode.zone),
        factRow('formation-order', 'Formation order', geode.order, null, true)
      ];
    }
    if (id === 'deepEarth') return [depthMeasurement(facts, 'Representative radial depth'), temperatureMeasurement(facts), pressureMeasurement(facts)];
    if (id === 'subduction') {
      var subduction = SUBDUCTION_MEASUREMENTS[key] || { position: 'Convergent-margin system', thermal: 'Compare slab and mantle temperature' };
      return [
        depthMeasurement(facts, 'Representative depth'),
        factRow('process-position', 'Process position', subduction.position),
        factRow('thermal-domain', 'Thermal domain', subduction.thermal, null, true),
        temperatureMeasurement(facts)
      ];
    }
    if (id === 'ridge') {
      var ridge = RIDGE_MEASUREMENTS[key] || { position: 'Seafloor-spreading system', evidence: 'Read age outward from the axis' };
      return [
        depthMeasurement(facts, 'Representative depth'),
        factRow('age-position', 'Age position', ridge.position, null, true),
        factRow('evidence-signal', 'Evidence signal', ridge.evidence),
        temperatureMeasurement(facts)
      ];
    }
    if (id === 'hotspot') {
      var hotspot = HOTSPOT_MEASUREMENTS[key] || { position: 'Hotspot-chain system', age: 'Read age away from the plume' };
      return [
        depthMeasurement(facts, 'Representative depth'),
        factRow('track-position', 'Track position', hotspot.position),
        factRow('age-signal', 'Age signal', hotspot.age, null, true),
        temperatureMeasurement(facts)
      ];
    }
    if (id === 'collision') {
      var collision = COLLISION_MEASUREMENTS[key] || { position: 'Mountain-belt system', burial: 'Read burial depth against surface height' };
      return [
        depthMeasurement(facts, 'Representative depth'),
        factRow('structural-position', 'Structural position', collision.position),
        factRow('burial-signal', 'Burial signal', collision.burial, null, true),
        temperatureMeasurement(facts)
      ];
    }
    return [depthMeasurement(facts, 'Depth'), temperatureMeasurement(facts), pressureMeasurement(facts)];
  }
  var SCENE = SCENES.crust;


  var SCENE_COMPARISONS = {
    crust: { concept: 'Relative dating', process: 'Deposition, intrusion, and heat', evidence: 'Superposition, cross-cutting, and a metamorphic rim', direction: 'Top -> depth; a cutting feature is younger', outcome: 'A sequence of rock events' },
    geode: { concept: 'Mineral growth', process: 'Groundwater, precipitation, and open-space growth', evidence: 'Wall-to-center bands and crystal size', direction: 'Cavity wall -> center', outcome: 'A growth sequence inside a dissolved void' },
    deepEarth: { concept: 'Earth structure', process: 'Layered shells, pressure, and seismic waves', evidence: 'S-wave shadow plus solid/liquid states', direction: 'Surface -> center', outcome: 'A model of hidden interior layers' },
    subduction: { concept: 'Convergent plate motion', process: 'Cold slab descent and water fluxing the mantle wedge', evidence: 'Trench, slab, wedge, and volcanic arc', direction: 'Ocean plate -> trench -> arc', outcome: 'A causal path from plate motion to magma' },
    ridge: { concept: 'Seafloor spreading', process: 'Upwelling, decompression melting, and cooling', evidence: 'Symmetric magnetic stripes and older flanks', direction: 'Ridge axis -> older seafloor', outcome: 'New ocean crust moving away from the axis' },
    hotspot: { concept: 'Intraplate volcanism', process: 'A relatively fixed plume beneath a moving plate', evidence: 'Age and elevation progression along a chain', direction: 'Plume -> plate-motion trail', outcome: 'A volcanic chain that records plate motion' },
    collision: { concept: 'Continental collision', process: 'Two buoyant plates converge; the crust shortens, thickens, and rises', evidence: 'Sea-floor limestone on the summit, thrust-stacked slices, and a deep crustal root', direction: 'Foreland -> summit -> plateau; surface -> root', outcome: 'A mountain belt with no volcanoes, floating on a buoyant root' }
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
    'hotspot+subduction': 'Both produce volcanic chains, but subduction links volcanoes to a plate boundary while a hotspot chain records a plate moving over a plume.',
    'collision+crust': 'Both use cross-cutting: the crust’s pluton and the mountain belt’s thrust fault are each younger than the layers they cut, but a collision also folds and stacks whole layer sequences.',
    'collision+deepEarth': 'Both depend on the solid, flowing mantle: deep Earth shows it convecting, and the mountain belt shows it pushing back on a buoyant crustal root (isostasy).',
    'collision+geode': 'Both record slow change over millions of years, but a geode grows minerals into open space while a collision recrystallises buried rock into schist and gneiss.',
    'collision+hotspot': 'Both raise land far from any ridge, but a hotspot builds volcanoes from plume melt while a collision lifts sea-floor rock by thickening the crust — with no volcanoes at all.',
    'collision+ridge': 'Opposite ends of an ocean’s life: a ridge creates sea floor, and a collision is what happens after that ocean has closed, with its last sliver trapped in a suture.',
    'collision+subduction': 'Both are convergent boundaries, but subduction sinks a dense ocean plate and melts a wedge to feed volcanoes, while two buoyant continents cannot sink — so the crust stacks up instead.'
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
    },
    collision: {
      eyebrow: 'Mountain-building fieldwork',
      subtitle: 'Read a collision from the foreland to the summit, then down to the root that holds it up.',
      question: 'How can a sea floor end up on top of a mountain?',
      notice: ['Neither continent can sink.', 'Thrust faults stack the crust thicker.', 'A buoyant root lifts the range; erosion exposes its core.'],
      evidencePrompt: 'Use the summit limestone, the exhumed gneiss, and the foreland gravel to explain uplift without any volcano.',
      checklist: [
        { id: 'uplift', label: 'Compare summit limestone, gneiss, and foreland gravel', check: function (c) { return c.hasKeys(['summitLimestone', 'gneiss', 'molasse']); } },
        { id: 'thicken', label: 'Trace the thickening sequence', check: function (c) { return c.signalComplete; } },
        { id: 'quiz', label: 'Answer one mountain question', check: function (c) { return !!c.quizAnswered; } }
      ],
      signal: { title: 'Collision cause-and-effect', prompt: 'Follow the crust from the first thrust to the summit.', steps: [
        { key: 'thrustZone', label: '1 · Crust shortens and stacks', body: 'Two buoyant continents meet; thrust faults shove slices of crust over one another and the crust thickens.' },
        { key: 'gneiss', label: '2 · Deep burial bakes the core', body: 'Rock buried 15–25 km recrystallises into schist and gneiss; the over-thick crust sweats out leucogranite.' },
        { key: 'summitLimestone', label: '3 · The sea floor rises', body: 'A buoyant root floats the range; erosion strips the top and exposes the core while the old sea floor rides on the summit.' }
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

  function sceneResumeState(sceneId, data) {
    var id = SCENES[sceneId] ? sceneId : 'crust';
    var journey = sceneJourneyFor(id);
    var mission = SCENE_MISSIONS[id] || SCENE_MISSIONS.crust;
    var source = data && typeof data === 'object' ? data : {};
    var signals = source.sceneSignals && typeof source.sceneSignals === 'object' ? source.sceneSignals : source;
    var hasSavedProgress = false, rawIndex = 0;
    if (mission.signal) {
      hasSavedProgress = Object.prototype.hasOwnProperty.call(signals, id) && Number.isFinite(signals[id]);
      rawIndex = hasSavedProgress ? Math.floor(signals[id]) : 0;
    } else if (source.sceneSignals || source.identifiedByScene || source.notebook || source.quizByScene || source.sequenceByScene) {
      var completed = sceneJourneyProgressFor(id, source);
      for (var i = 0; i < completed.length; i++) {
        if (completed[i]) { hasSavedProgress = true; rawIndex = i; }
      }
    }
    var index = Math.max(0, Math.min(rawIndex, journey.length - 1));
    var stage = journey[index] || journey[0];
    return {
      sceneId: id,
      index: index,
      key: stage.key,
      label: stage.label,
      hasSavedProgress: hasSavedProgress,
      message: hasSavedProgress ? 'Resumed at stage ' + (index + 1) + ': ' + stage.label + '.' : ''
    };
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
    ],
    collision: [
      { id: 'thrust-stack', stage: 0, label: 'Thrust stack', key: 'thrustZone', view: 'front', detail: 'A gently dipping thrust fault carries one slice of crust up and over another, shortening and thickening the crust.' },
      { id: 'exhumed-core', stage: 1, label: 'Exhumed core', key: 'gneiss', view: 'front', detail: 'Gneiss that formed ~25 km down now sits on the steep face because erosion removed the rock above it.' },
      { id: 'summit-sea-floor', stage: 2, label: 'Summit sea floor', key: 'summitLimestone', view: 'iso', detail: 'Marine limestone on the summit shows the range was lifted from a sea floor by crustal thickening, not by a volcano.' }
    ]
  };
  function sceneBeaconsFor(sceneId) { return (SCENE_BEACONS[sceneId] || SCENE_BEACONS.crust).map(function (item) { return Object.assign({}, item); }); }


  var SCENE_PROCESS_CUES = {
    crust: { title: 'Relative dating', summary: 'Read the layers, then follow the later heat event.', depth: 'Deeper sedimentary layers are generally older; the cutting pluton is a later exception.', axis: { label: 'Evidence axis', value: 'Depth + relative age', gradient: 'from-sky-400 via-amber-400 to-red-600', labels: ['Surface / younger', 'Layer relationships', 'Depth / generally older'], ariaLabel: 'Evidence axis: begin at the surface, use layer and cross-cutting relationships, then read toward generally older sedimentary layers at depth.' }, steps: [
      { label: 'Superposition', detail: 'Deeper sedimentary layers generally formed first.' },
      { label: 'Cross-cutting', detail: 'The pluton cuts the layers, so it formed later.' },
      { label: 'Contact heat', detail: 'Heat bakes nearby rock into a metamorphic rim.' }
    ] },
    geode: { title: 'Crystal growth', summary: 'Groundwater builds the cavern from the wall inward.', depth: 'Read relative time inward: the wall lining formed first and crystal tips grew later into open space.', axis: { label: 'Growth axis', value: 'Relative formation order', gradient: 'from-emerald-500 via-orange-400 to-violet-500', labels: ['Cavity wall / first', 'Agate bands', 'Open space / later'], ariaLabel: 'Growth axis: the cavity-wall rind formed first, agate bands record repeated pulses, and crystal tips grew later into open space.' }, steps: [
      { label: 'Wall rind', detail: 'Microcrystalline silica precipitates first.' },
      { label: 'Banded pulses', detail: 'Mineral-rich water leaves concentric bands.' },
      { label: 'Open-space crystals', detail: 'Room for growth produces larger crystal points.' }
    ] },
    deepEarth: { title: 'Seismic probe', summary: 'Wave behavior reveals the hidden shells of Earth.', depth: 'Read radially from the surface toward the center; pressure and temperature rise while material state changes.', axis: { label: 'Radial axis', value: 'Depth + material state', gradient: 'from-sky-400 via-orange-500 to-yellow-300', labels: ['Surface', 'Liquid outer core', 'Center / highest pressure'], ariaLabel: 'Radial axis: move from Earth surface through the liquid outer core toward the high-pressure solid inner core at the center.' }, steps: [
      { label: 'Solid mantle', detail: 'Solid rock creeps and convects over geologic time.' },
      { label: 'S-wave shadow', detail: 'S-waves stop at the liquid outer core.' },
      { label: 'Pressure-frozen center', detail: 'Extreme pressure keeps the inner core solid.' }
    ] },
    subduction: { title: 'Subduction flux', summary: 'A sinking slab drives melting above it.', depth: 'This is a thermal contrast, not a simple depth gradient: a cold slab lies beside a hotter, water-fluxed mantle wedge.' , axis: { label: 'Process path', value: 'Cold slab → hot wedge → arc', gradient: 'from-sky-500 via-orange-500 to-red-600', labels: ['Incoming plate / cold', 'Wedge / fluxed', 'Arc / rising melt'], ariaLabel: 'Subduction process path: a cold incoming plate descends, water fluxes the hotter mantle wedge, and magma rises to the volcanic arc.' }, steps: [
      { label: 'Cold slab', detail: 'Dense oceanic crust sinks into the mantle.' },
      { label: 'Fluxed wedge', detail: 'Water lowers the melting point in the mantle wedge.' },
      { label: 'Arc magma', detail: 'Magma rises and feeds a volcanic arc.' }
    ] },
    ridge: { title: 'Seafloor spreading', summary: 'New crust forms at the axis and records magnetic time.', depth: 'Age increases away from the central ridge axis in both directions; mirrored stripes are the key evidence.', axis: { label: 'Age axis', value: 'Distance from ridge', gradient: 'from-slate-600 via-amber-300 to-slate-600', labels: ['Older flank', 'Axis / youngest', 'Older flank'], ariaLabel: 'Symmetric age axis: the ridge axis at the center is youngest, and ocean crust becomes older toward both flanks.' }, steps: [
      { label: 'Axis melt', detail: 'Decompression melting creates new basaltic crust.' },
      { label: 'Normal polarity', detail: 'Cooling basalt records one magnetic direction.' },
      { label: 'Reversed mirror', detail: 'Symmetric stripes reveal spreading.' }
    ] },
    hotspot: { title: 'Hotspot track', summary: 'A moving plate carries volcanic islands away from a plume.', depth: 'Read time along the plate-motion trail: the active volcano is over the plume and progressively older volcanoes lie downstream.', axis: { label: 'Age trail', value: 'Distance from plume', gradient: 'from-orange-500 via-slate-500 to-sky-700', labels: ['Plume / active now', 'Extinct island', 'Seamount / oldest'], ariaLabel: 'Hotspot age trail: begin at the active volcano over the plume, then follow the moving plate toward an extinct island and the oldest drowned seamount.' }, steps: [
      { label: 'Active plume', detail: 'A broad shield volcano forms above the plume.' },
      { label: 'Carried downstream', detail: 'Plate motion removes the island from its magma supply.' },
      { label: 'Drowned seamount', detail: 'Cooling, sinking crust carries the oldest link below sea level.' }
    ] },
    collision: { title: 'Continental collision', summary: 'Two buoyant continents meet; the crust shortens, thickens, and rises.', depth: 'Read two directions: up the surface from the foreland to the summit, and down from the summit to the crustal root that holds the range up.', axis: { label: 'Uplift axis', value: 'Crustal thickness', gradient: 'from-amber-700 via-stone-500 to-sky-300', labels: ['Foreland fill', 'Thrust-stacked slices', 'Summit sea floor'], ariaLabel: 'Uplift axis: begin at the foreland basin, cross the thrust-stacked slices, and end at the marine limestone on the summit.' }, steps: [
      { label: 'Crust stacks', detail: 'Thrust faults shove slices of crust over one another.' },
      { label: 'Deep bake', detail: 'Buried rock recrystallises into schist and gneiss; the crust sweats out granite.' },
      { label: 'Sea floor rises', detail: 'A buoyant root lifts the range; erosion exposes the core.' }
    ] }
  };
  function sceneProcessCueFor(sceneId) {
    var cue = SCENE_PROCESS_CUES[sceneId] || SCENE_PROCESS_CUES.crust;
    return { title: cue.title, summary: cue.summary, depth: cue.depth, axis: Object.assign({}, cue.axis, { labels: cue.axis.labels.slice() }), steps: cue.steps.map(function (item) { return Object.assign({}, item); }) };
  }

  function focusLensIncludes(materialKey, selectedKey, enabled) {
    return !enabled || !selectedKey || materialKey === selectedKey;
  }
  function cutawayReadout(slice, totalSections) {
    var total = Math.max(1, Math.round(Number(totalSections) || 1));
    var max = Math.max(0, total - 1);
    var raw = Number(slice); if (!isFinite(raw)) raw = 0;
    var step = Math.max(0, Math.min(max, Math.round(raw)));
    var percent = Math.round(step / total * 100);
    return {
      step: step,
      max: max,
      percent: percent,
      label: step === 0 ? 'Full block' : percent + '% cut away from front' + (step === max ? ' · final section' : '')
    };
  }
  function firstSolidVoxelY(voxelByKey, removed, x, z, height) {
    for (var y = 0; y < height; y++) {
      var id = x + ',' + y + ',' + z;
      var voxel = voxelByKey[id];
      if (voxel && voxel.key !== 'void' && !(removed && removed[id])) return y;
    }
    return null;
  }
  function undoPreviewTarget(history, voxelByKey, removed, slice, focusOn, stage, formedAt, gridDepth) {
    if (!Array.isArray(history) || !history.length || focusOn || !removed) return null;
    var id = null, voxel = null;
    for (var i = history.length - 1; i >= 0; i--) {
      if (!removed[history[i]]) continue;
      id = history[i]; voxel = voxelByKey && voxelByKey[id]; break;
    }
    if (!voxel || voxel.key === 'void') return null;
    var cutaway = Number(slice); if (!isFinite(cutaway)) cutaway = 0;
    cutaway = Math.max(0, Math.round(cutaway));
    // The WebGL camera looks toward the positive-z face. When gridDepth is
    // supplied, a front cutaway removes those high-z sections first. Keep the
    // legacy no-gridDepth branch for the pure helper's older callers.
    if (Number.isFinite(Number(gridDepth))) {
      if (Number(voxel.z) >= Math.max(0, Number(gridDepth) - cutaway)) return null;
    } else if (Number(voxel.z) < cutaway) return null;
    var formed = formedAt && formedAt[voxel.key]; if (formed == null) formed = 0;
    var maxStage = stage == null ? 99 : Number(stage); if (!isFinite(maxStage)) maxStage = 99;
    return formed <= maxStage ? voxel : null;
  }
  function restoreEnginePresentation(engine, selectedKey, focusOn, cameraView) {
    if (!engine) return false;
    var view = cameraView === 'front' || cameraView === 'top' ? cameraView : 'iso';
    if (engine.setHighlight) engine.setHighlight(selectedKey || null);
    if (engine.setFocusLens) engine.setFocusLens(!!focusOn);
    if (engine.setView) engine.setView(view);
    return true;
  }


  function sceneTimelineFor(sceneId) {
    var journey = sceneJourneyFor(sceneId), beacons = sceneBeaconsFor(sceneId), cue = sceneProcessCueFor(sceneId);
    return journey.map(function (stage, index) {
      var beacon = beacons.filter(function (item) { return Number(item.stage) === index; })[0] || beacons[index];
      var cueStep = cue.steps[index] || {};
      return { index: index, key: stage.key, label: stage.label, body: stage.body, beaconId: beacon ? beacon.id : null, beaconLabel: beacon ? beacon.label : stage.label, cueLabel: cueStep.label || stage.label };
    });
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
    hotspot: { chain: 'Select the active volcano, old island, and seamount; age and elevation change along the chain.', motion: 'Follow the sequence from the plume to the carried island to the drowned seamount.', quiz: 'Use the quiz to test whether the plate or plume is moving.' },
    collision: { uplift: 'Select the summit limestone, the gneiss on the steep face, and the foreland gravel; note which is highest, which was deepest, and which is youngest.', thicken: 'Follow the sequence from the thrust fault to the deep-baked core to the sea floor lifted onto the summit.', quiz: 'Use the quiz to check why marine fossils sit on the summit and why there are no volcanoes.' }
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
    uplift: { target: 'materials', mode: 'investigate', label: 'Open material list', message: 'Material list focused. Select the summit limestone, gneiss, and foreland gravel.' },
    thicken: { target: 'signal', mode: 'investigate', label: 'Open process timeline', message: 'Collision timeline focused. Follow the crust from the thrust stack to the summit.' },
    quiz: { target: 'quiz', mode: 'assess', label: 'Open quiz', message: 'Assessment quiz focused. Answer one question to complete this check.' }
  };
  function missionActionFor(checkId) { return MISSION_ACTIONS[checkId] || null; }

  var SCENE_ORIENTATION = {
    crust: { scale: '~10.8 km deep', direction: 'Surface -> depth', read: 'Read the layers from top to bottom. Deeper sedimentary layers are generally older; a cutting feature is younger.' },
    geode: { scale: '~2 m specimen span (schematic)', direction: 'Cavity wall -> center', read: 'Read mineral growth inward from the limestone wall. The open center is not empty by accident; it records space for crystals to grow.' },
    deepEarth: { scale: 'Earth radius 6,371 km', direction: 'Surface -> center', read: 'This is a radial slice, not a flat stack. Use the shells and seismic signal to infer state.' },
    subduction: { scale: '~200 km depth range (schematic)', direction: 'Left plate -> trench -> right arc', read: 'Follow the cold slab downward. Water leaves the slab, fluxes the wedge, and the melt rises toward the arc.' },
    ridge: { scale: '~30 km depth range (schematic)', direction: 'Ridge axis -> older flanks', read: 'The axis is youngest. Read outward for older crust, thicker sediment, and mirrored magnetic history.' },
    hotspot: { scale: '~150 km depth range (schematic)', direction: 'Plume -> plate-motion trail', read: 'The plume is the reference point. The plate carries volcanoes away, so age increases toward the drowned seamount.' },
    collision: { scale: '~100 km depth range (schematic)', direction: 'Foreland -> summit -> plateau', read: 'Read the surface for the stack: foreland fill, folded slices, summit limestone. Then read downward — the range rides on a crustal root about 70 km deep.' }
  };
  var SCENE_SCHEMATICS = {
    geode: {
      title: 'Crystal cavern 2D evidence map',
      description: 'Concentric mineral zones record growth from the limestone cavity wall toward crystal tips and open space.'
    },
    deepEarth: {
      title: 'Deep Earth 2D evidence map',
      description: 'Nested radial shells connect material state with the seismic evidence used to infer Earth’s hidden interior.'
    },
    subduction: {
      title: 'Subduction zone 2D evidence map',
      description: 'A cold oceanic slab descends beneath a continent while water fluxes the hotter mantle wedge and feeds an arc.'
    },
    ridge: {
      title: 'Mid-ocean ridge 2D evidence map',
      description: 'New crust forms at the central axis and mirrored magnetic stripes record spreading toward two older flanks.'
    },
    hotspot: {
      title: 'Hotspot chain 2D evidence map',
      description: 'A moving plate carries volcanoes away from a relatively fixed plume, creating an age trail from active island to seamount.'
    },
    collision: {
      title: 'Mountain belt 2D evidence map',
      description: 'Two continents converge: thrust faults stack folded sea-floor layers into a range that rides on a deep crustal root, with no volcanoes.'
    }
  };
  function sceneSchematicInfo(sceneId, selectedKey, stageIndex) {
    var id = SCENE_SCHEMATICS[sceneId] ? sceneId : 'geode';
    var config = SCENE_SCHEMATICS[id], scene = SCENES[id], journey = sceneJourneyFor(id);
    var index = Math.max(0, Math.min(Number(stageIndex) || 0, journey.length - 1));
    var active = journey[index], selectedRock = selectedKey && scene.palette[selectedKey];
    var selected = selectedRock ? { key: selectedKey, label: selectedRock.name } : null;
    var ariaLabel = config.title + '. ' + config.description + ' Active process stage: ' + active.label + '.';
    if (selected) ariaLabel += ' Selected material: ' + selected.label + '.';
    return {
      sceneId: id,
      title: config.title,
      description: config.description,
      activeIndex: index,
      activeKey: active.key,
      activeLabel: active.label,
      selectedKey: selected ? selected.key : null,
      selectedLabel: selected ? selected.label : null,
      ariaLabel: ariaLabel
    };
  }
  function sceneSchematicState(materialKey, selectedKey, activeKey, focusOn) {
    var selected = !!selectedKey && materialKey === selectedKey;
    var active = !!activeKey && materialKey === activeKey;
    var muted = !!focusOn && !!selectedKey && !selected;
    return {
      selected: selected,
      active: active,
      focusState: muted ? 'muted' : (selected ? 'match' : 'context'),
      state: selected && active ? 'selected-active' : (selected ? 'selected' : (active ? 'active' : (muted ? 'muted' : 'context'))),
      opacity: muted ? 0.18 : 1
    };
  }

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
    ],
    collision: [
      { term: 'Thrust fault', definition: 'A gently dipping fault along which one slice of crust is pushed up and over another, shortening and thickening the crust.', cue: 'Use it when you explain how sea-floor layers were stacked and lifted.' },
      { term: 'Regional metamorphism', definition: 'Heat and pressure from deep burial across a whole mountain belt recrystallise rock into schist and gneiss.', cue: 'Use it when you compare the gneiss core with the folded strata above it.' },
      { term: 'Isostasy', definition: 'Crust floats on the mantle; a high range needs a deep, low-density root, like the hidden part of an iceberg.', cue: 'Use it when you explain what holds the range up without any magma.' }
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
    ] },
    collision: { title: 'Mountain-building order', prompt: 'Arrange the events from the ocean that once separated the continents to the range eroding today.', items: [
      { key: 'summitLimestone', label: 'Sea-floor layers pile up', detail: 'Limestone and mud collect on the floor of the ocean between two continents.' },
      { key: 'suture', label: 'The ocean closes', detail: 'The continents meet; a sliver of sea floor is trapped in the suture.' },
      { key: 'thrustZone', label: 'Thrust faults stack the crust', detail: 'Slices of crust ride over one another; the crust shortens and thickens toward ~70 km.' },
      { key: 'gneiss', label: 'Deep burial bakes the core', detail: 'Buried rock becomes schist and gneiss, and the hot crust sweats out leucogranite.' },
      { key: 'molasse', label: 'The range rises and erodes', detail: 'A buoyant root lifts the summit; erosion exposes the core and fills the foreland basin.' }
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
    cnv.dataset.geologyMaterialRendering = 'procedural-rock-grain-bump-and-phase-glow';
    cnv.dataset.geologyAtmosphereRendering = 'scene-colored-depth-motes-and-haze';
    cnv.dataset.geologyProcessRendering = SCENE.id + '-science-process-tracers';
    cnv.dataset.geologyProcessGuideRendering = 'directional-ribbons-and-arrowheads';
    cnv.dataset.geologyExcavationRendering = 'rock-colored-dust-chips-and-exposure-flash';
    cnv.dataset.geologyMiningRendering = 'pickaxe-and-powered-drill-with-heat-and-staged-surface-cracks';
    cnv.dataset.geologyCutawayRendering = 'camera-facing-front-section';
    cnv.dataset.geologySurfaceRendering = SCENE.id === 'crust' ? 'field-landmarks' : 'scene-native-topography';
    container.appendChild(cnv);
    var motionMedia3d = null, reducedMotion3d = false;
    function syncGeologyMotion3d(event) {
      reducedMotion3d = event && typeof event.matches === 'boolean'
        ? event.matches : !!(motionMedia3d && motionMedia3d.matches);
      cnv.dataset.geologyReducedMotion = reducedMotion3d ? 'true' : 'false';
    }
    try {
      motionMedia3d = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      syncGeologyMotion3d(motionMedia3d);
      if (motionMedia3d && motionMedia3d.addEventListener) motionMedia3d.addEventListener('change', syncGeologyMotion3d);
      else if (motionMedia3d && motionMedia3d.addListener) motionMedia3d.addListener(syncGeologyMotion3d);
    } catch (e) {}
    var renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = SCENE.id === 'geode' ? 1.2 : 1.12;
    }
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    var geologyHighDetail3d = (container.clientWidth || 600) >= 420 &&
      (!navigator.hardwareConcurrency || navigator.hardwareConcurrency >= 4);
    renderer.shadowMap.enabled = geologyHighDetail3d;
    if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    cnv.dataset.geologyRenderQuality = geologyHighDetail3d ? 'depth-shadows' : 'mobile-efficient';

    function geologyTextureSeed3d(label) {
      var hash = 2166136261;
      String(label || 'geology').split('').forEach(function (character) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      });
      return hash >>> 0;
    }
    function geologyRandomFactory3d(seed) {
      var state = (seed >>> 0) || 1;
      return function () {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
      };
    }
    function makeGeologySurfaceTexture3d(sceneId3d) {
      var textureCanvas3d = document.createElement('canvas');
      textureCanvas3d.width = 256; textureCanvas3d.height = 256;
      var textureContext3d = textureCanvas3d.getContext('2d');
      var image3d = textureContext3d.createImageData(256, 256);
      var random3d = geologyRandomFactory3d(geologyTextureSeed3d(sceneId3d + '-surface'));
      var layered3d = sceneId3d === 'crust' || sceneId3d === 'subduction' || sceneId3d === 'ridge';
      for (var textureY3d = 0; textureY3d < 256; textureY3d++) {
        for (var textureX3d = 0; textureX3d < 256; textureX3d++) {
          var textureIndex3d = (textureY3d * 256 + textureX3d) * 4;
          var multiScaleGrain3d = (random3d() - 0.5) * 20 +
            Math.sin(textureX3d * 0.17 + textureY3d * 0.11) * 4 +
            Math.sin(textureX3d * 0.043 - textureY3d * 0.071) * 5;
          var bedding3d = layered3d
            ? Math.sin(textureY3d * 0.22 + Math.sin(textureX3d * 0.045) * 2.4) * 5 : 0;
          var textureValue3d = Math.max(196, Math.min(252,
            Math.round(232 + multiScaleGrain3d + bedding3d)));
          image3d.data[textureIndex3d] = textureValue3d;
          image3d.data[textureIndex3d + 1] = textureValue3d;
          image3d.data[textureIndex3d + 2] = textureValue3d;
          image3d.data[textureIndex3d + 3] = 255;
        }
      }
      textureContext3d.putImageData(image3d, 0, 0);
      textureContext3d.lineCap = 'round';
      var veinCount3d = sceneId3d === 'geode' ? 44 : 24;
      for (var veinIndex3d = 0; veinIndex3d < veinCount3d; veinIndex3d++) {
        var veinX3d = random3d() * 256, veinY3d = random3d() * 256;
        var veinLength3d = 10 + random3d() * (sceneId3d === 'geode' ? 48 : 24);
        var veinAngle3d = random3d() * Math.PI * 2;
        textureContext3d.strokeStyle = sceneId3d === 'geode'
          ? 'rgba(255,255,255,' + (0.14 + random3d() * 0.24) + ')'
          : 'rgba(46,37,31,' + (0.055 + random3d() * 0.08) + ')';
        textureContext3d.lineWidth = sceneId3d === 'geode' ? 0.8 + random3d() * 1.4 : 0.55;
        textureContext3d.beginPath();
        textureContext3d.moveTo(veinX3d, veinY3d);
        textureContext3d.lineTo(
          veinX3d + Math.cos(veinAngle3d) * veinLength3d,
          veinY3d + Math.sin(veinAngle3d) * veinLength3d
        );
        textureContext3d.stroke();
      }
      var surfaceTexture3d = new THREE.CanvasTexture(textureCanvas3d);
      surfaceTexture3d.wrapS = surfaceTexture3d.wrapT = THREE.RepeatWrapping;
      surfaceTexture3d.repeat.set(sceneId3d === 'geode' ? 1.15 : 1.65, sceneId3d === 'geode' ? 1.15 : 1.65);
      surfaceTexture3d.minFilter = THREE.LinearMipmapLinearFilter;
      surfaceTexture3d.magFilter = THREE.LinearFilter;
      if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
        surfaceTexture3d.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      }
      if (THREE.sRGBEncoding) surfaceTexture3d.encoding = THREE.sRGBEncoding;
      surfaceTexture3d.needsUpdate = true;
      return surfaceTexture3d;
    }
    function makeGeologyParticleTexture3d(kind3d) {
      var particleCanvas3d = document.createElement('canvas');
      particleCanvas3d.width = 64; particleCanvas3d.height = 64;
      var particleContext3d = particleCanvas3d.getContext('2d');
      var particleGradient3d = particleContext3d.createRadialGradient(32, 32, 1, 32, 32, 31);
      if (kind3d === 'chip') {
        particleGradient3d.addColorStop(0, 'rgba(255,255,255,1)');
        particleGradient3d.addColorStop(0.42, 'rgba(255,255,255,.92)');
        particleGradient3d.addColorStop(0.58, 'rgba(255,255,255,.18)');
      } else if (kind3d === 'dust') {
        particleGradient3d.addColorStop(0, 'rgba(255,255,255,.74)');
        particleGradient3d.addColorStop(0.38, 'rgba(255,255,255,.34)');
        particleGradient3d.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        particleGradient3d.addColorStop(0, 'rgba(255,255,255,1)');
        particleGradient3d.addColorStop(0.2, 'rgba(255,255,255,.78)');
        particleGradient3d.addColorStop(0.55, 'rgba(255,255,255,.16)');
        particleGradient3d.addColorStop(1, 'rgba(255,255,255,0)');
      }
      particleContext3d.fillStyle = particleGradient3d;
      particleContext3d.fillRect(0, 0, 64, 64);
      var particleTexture3d = new THREE.CanvasTexture(particleCanvas3d);
      particleTexture3d.minFilter = THREE.LinearFilter;
      particleTexture3d.magFilter = THREE.LinearFilter;
      particleTexture3d.generateMipmaps = false;
      particleTexture3d.needsUpdate = true;
      return particleTexture3d;
    }
    var rockSurfaceTexture3d = makeGeologySurfaceTexture3d(SCENE.id);
    var geologyGlowTexture3d = makeGeologyParticleTexture3d('glow');
    var geologyDustTexture3d = makeGeologyParticleTexture3d('dust');
    var geologyChipTexture3d = makeGeologyParticleTexture3d('chip');
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
    var isoSideX3d = SCENE.id === 'collision' ? -1 : 1;   // face the steep side of the mountain belt
    camera.position.set(WORLD.w * 1.15 * isoSideX3d, WORLD.h * 1.05, WORLD.d * 1.4);
    var TARGET = new THREE.Vector3(0, -WORLD.h * 0.05, 0);
    camera.lookAt(TARGET); // aim at the block immediately — keeps it CENTRED even if OrbitControls never loads
    var controls = null, orbitTried = false;
    // first-person explorer state (default off; drives the SAME camera, never OrbitControls)
    var fp = { active: false, intro: null, mode: 'mine', pos: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0, input: { fwd: 0, strafe: 0, vert: 0, jump: false, sprint: false }, turn: { yaw: 0, pitch: 0 }, reduced: false, savedPos: null, savedTgt: null, savedEnabled: true, lastHud: 0, lastKey: '__none', speed: WORLD.h * 0.5, velocity: { x: 0, y: 0, z: 0 }, onGround: false, jumpLatch: false, target: null, targetKey: '__none', lastMineAt: 0, lastHazardAt: 0, medium: 'air', mining: null, tool: 'pick', drillHeat: 0, drillOverheated: false, drillHeld: false, drillHudAt: 0, drillNextAt: 0, safePose: null, lastSafeAt: 0, hazardNearby: false, blockedUntil: 0, statusKey: '__none' };
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
    var keyL = new THREE.DirectionalLight(0xfff1d0, 1.0); keyL.position.set(12, 20, 14);
    keyL.castShadow = geologyHighDetail3d;
    if (keyL.shadow && keyL.shadow.camera) {
      keyL.shadow.mapSize.set(1024, 1024);
      keyL.shadow.camera.left = -WORLD.w * 0.85; keyL.shadow.camera.right = WORLD.w * 0.85;
      keyL.shadow.camera.top = WORLD.h * 0.85; keyL.shadow.camera.bottom = -WORLD.h * 0.85;
      keyL.shadow.camera.near = 1; keyL.shadow.camera.far = 56;
      keyL.shadow.bias = -0.0007;
    }
    scene.add(keyL);
    var fillL = new THREE.DirectionalLight(0x90b4ff, 0.35); fillL.position.set(-14, 6, -10); scene.add(fillL);
    var geologyHeatLightConfig3d = {
      crust: { color: 0xff5522, intensity: 1.8, flicker: 0.38 },
      geode: { color: 0x8b5cf6, intensity: 0.72, flicker: 0.08 },
      deepEarth: { color: 0xff6b2c, intensity: 1.9, flicker: 0.3 },
      subduction: { color: 0xff6633, intensity: 1.18, flicker: 0.22 },
      ridge: { color: 0xff7a33, intensity: 1.28, flicker: 0.2 },
      hotspot: { color: 0xff5a1f, intensity: 1.42, flicker: 0.28 },
      collision: { color: 0xffb36b, intensity: 0.62, flicker: 0.06 }
    }[SCENE.id] || { color: 0xff5522, intensity: 1.2, flicker: 0.2 };
    var magmaGlowBaseColor3d = new THREE.Color(geologyHeatLightConfig3d.color);
    var magmaGlow = new THREE.PointLight(geologyHeatLightConfig3d.color, geologyHeatLightConfig3d.intensity, 44); magmaGlow.position.set(0, -WORLD.h * 0.5, 0); scene.add(magmaGlow);
    // soft additive heat-glow radiating from beneath the crust (the magma source)
    var underGlowGeo = new THREE.SphereGeometry(3.6, 16, 12), underGlowMat = new THREE.MeshBasicMaterial({ color: geologyHeatLightConfig3d.color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    var underGlow = new THREE.Mesh(underGlowGeo, underGlowMat); underGlow.position.set(0, -(NY - 1) / 2 * VOXEL - 1.6, 0); underGlow.visible = SCENE.id === 'crust'; scene.add(underGlow);

    var voxels = [];
    for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) for (var z = 0; z < NZ; z++) voxels.push({ x: x, y: y, z: z, key: SCENE.gen(x, y, z), j: 0.87 + (((x * 41 + y * 71 + z * 13) % 100) / 100) * 0.26 });
    function vkey(v) { return v.x + ',' + v.y + ',' + v.z; }
    var voxelByKey = {};
    for (var vi = 0; vi < voxels.length; vi++) voxelByKey[vkey(voxels[vi])] = voxels[vi];
    var removed = {}, excavationHistory = [], excavationRedo = [];
    var initialExcavation = opts.initialExcavation || {};
    var initialHistory = Array.isArray(initialExcavation) ? initialExcavation : (Array.isArray(initialExcavation.history) ? initialExcavation.history : []);
    var initialRedo = Array.isArray(initialExcavation.redo) ? initialExcavation.redo : [];
    initialHistory.forEach(function (id) {
      var voxel = voxelByKey[id];
      if (voxel && voxel.key !== 'void' && !removed[id]) { removed[id] = 1; excavationHistory.push(id); }
    });
    initialRedo.forEach(function (id) {
      var voxel = voxelByKey[id];
      if (voxel && voxel.key !== 'void' && !removed[id] && excavationRedo.indexOf(id) < 0) excavationRedo.push(id);
    });
    function worldPos(v) { return [(v.x - (NX - 1) / 2) * VOXEL, ((NY - 1) / 2 - v.y) * VOXEL, (v.z - (NZ - 1) / 2) * VOXEL]; }

    var geo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
    var mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: rockSurfaceTexture3d,
      bumpMap: rockSurfaceTexture3d,
      bumpScale: SCENE.id === 'geode' ? 0.028 : 0.052,
      roughness: SCENE.id === 'geode' ? 0.48 : (SCENE.id === 'deepEarth' ? 0.68 : 0.82),
      metalness: SCENE.id === 'deepEarth' ? 0.1 : 0.035
    });
    var mesh = new THREE.InstancedMesh(geo, mat, voxels.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = geologyHighDetail3d;
    mesh.receiveShadow = geologyHighDetail3d;
    scene.add(mesh);

    var geologyAtmosphereColors3d = {
      crust: 0xe7c59a,
      geode: 0xc4b5fd,
      deepEarth: 0xff8a4c,
      subduction: 0x7dd3fc,
      ridge: 0x5eead4,
      hotspot: 0xfb923c,
      collision: 0xdbeafe
    };
    var geologyAtmosphereColor3d = geologyAtmosphereColors3d[SCENE.id] || 0xcbd5e1;
    var atmosphereRandom3d = geologyRandomFactory3d(geologyTextureSeed3d(SCENE.id + '-atmosphere'));
    var atmosphereMoteCount3d = geologyHighDetail3d ? 168 : 88;
    var atmosphereMotePositions3d = new Float32Array(atmosphereMoteCount3d * 3);
    var atmosphereMoteBase3d = new Float32Array(atmosphereMoteCount3d * 3);
    var atmosphereMotePhases3d = new Float32Array(atmosphereMoteCount3d);
    for (var atmosphereMoteIndex3d = 0; atmosphereMoteIndex3d < atmosphereMoteCount3d; atmosphereMoteIndex3d++) {
      var atmosphereMoteX3d = (atmosphereRandom3d() - 0.5) * WORLD.w * 1.24;
      var atmosphereMoteY3d = (atmosphereRandom3d() - 0.5) * WORLD.h * 1.18;
      var atmosphereMoteZ3d = (atmosphereRandom3d() - 0.5) * WORLD.d * 1.16;
      atmosphereMotePositions3d[atmosphereMoteIndex3d * 3] = atmosphereMoteX3d;
      atmosphereMotePositions3d[atmosphereMoteIndex3d * 3 + 1] = atmosphereMoteY3d;
      atmosphereMotePositions3d[atmosphereMoteIndex3d * 3 + 2] = atmosphereMoteZ3d;
      atmosphereMoteBase3d[atmosphereMoteIndex3d * 3] = atmosphereMoteX3d;
      atmosphereMoteBase3d[atmosphereMoteIndex3d * 3 + 1] = atmosphereMoteY3d;
      atmosphereMoteBase3d[atmosphereMoteIndex3d * 3 + 2] = atmosphereMoteZ3d;
      atmosphereMotePhases3d[atmosphereMoteIndex3d] = atmosphereRandom3d() * Math.PI * 2;
    }
    var atmosphereMoteGeometry3d = new THREE.BufferGeometry();
    atmosphereMoteGeometry3d.setAttribute('position', new THREE.BufferAttribute(atmosphereMotePositions3d, 3));
    var atmosphereMoteMaterial3d = new THREE.PointsMaterial({
      color: geologyAtmosphereColor3d,
      map: geologyGlowTexture3d,
      alphaTest: 0.018,
      size: SCENE.id === 'geode' ? 0.11 : 0.14,
      transparent: true,
      opacity: SCENE.id === 'deepEarth' ? 0.24 : 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var atmosphereMotes3d = new THREE.Points(atmosphereMoteGeometry3d, atmosphereMoteMaterial3d);
    scene.add(atmosphereMotes3d);
    var geologyHazeSprites3d = [];
    for (var geologyHazeIndex3d = 0; geologyHazeIndex3d < 3; geologyHazeIndex3d++) {
      var geologyHazeMaterial3d = new THREE.SpriteMaterial({
        map: geologyGlowTexture3d,
        color: geologyAtmosphereColor3d,
        transparent: true,
        opacity: 0.035 + geologyHazeIndex3d * 0.014,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      var geologyHazeSprite3d = new THREE.Sprite(geologyHazeMaterial3d);
      geologyHazeSprite3d.position.set(
        (geologyHazeIndex3d - 1) * WORLD.w * 0.27,
        -WORLD.h * 0.08 + geologyHazeIndex3d * WORLD.h * 0.11,
        -WORLD.d * 0.54 - geologyHazeIndex3d * 0.18
      );
      geologyHazeSprite3d.scale.set(
        WORLD.w * (0.78 + geologyHazeIndex3d * 0.08),
        WORLD.h * (0.58 + geologyHazeIndex3d * 0.07),
        1
      );
      geologyHazeSprite3d.userData.baseOpacity = geologyHazeMaterial3d.opacity;
      geologyHazeSprite3d.userData.phase = geologyHazeIndex3d * 1.7;
      scene.add(geologyHazeSprite3d);
      geologyHazeSprites3d.push(geologyHazeSprite3d);
    }

    var glowVoxelPositions3d = new Float32Array(voxels.length * 3);
    var glowVoxelColors3d = new Float32Array(voxels.length * 3);
    var glowVoxelGeometry3d = new THREE.BufferGeometry();
    glowVoxelGeometry3d.setAttribute('position', new THREE.BufferAttribute(glowVoxelPositions3d, 3));
    glowVoxelGeometry3d.setAttribute('color', new THREE.BufferAttribute(glowVoxelColors3d, 3));
    glowVoxelGeometry3d.setDrawRange(0, 0);
    var glowVoxelMaterial3d = new THREE.PointsMaterial({
      map: geologyGlowTexture3d,
      vertexColors: true,
      alphaTest: 0.015,
      size: SCENE.id === 'geode' ? VOXEL * 0.72 : VOXEL * 1.08,
      transparent: true,
      opacity: SCENE.id === 'deepEarth' ? 0.3 : 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var glowVoxelPoints3d = new THREE.Points(glowVoxelGeometry3d, glowVoxelMaterial3d);
    glowVoxelPoints3d.visible = false;
    scene.add(glowVoxelPoints3d);
    function geologyGlowStrength3d(voxel3d) {
      var paletteEntry3d = SCENE.palette[voxel3d.key] || ROCKS[voxel3d.key] || {};
      if (paletteEntry3d.glow) return 1;
      if (SCENE.id === 'geode' && (voxel3d.key === 'quartz' || voxel3d.key === 'amethyst')) return 0.58;
      return 0;
    }

    var geologyProcessCount3d = geologyHighDetail3d ? 112 : 64;
    var geologyProcessPositions3d = new Float32Array(geologyProcessCount3d * 3);
    var geologyProcessColors3d = new Float32Array(geologyProcessCount3d * 3);
    var geologyProcessPhases3d = new Float32Array(geologyProcessCount3d);
    var geologyProcessRandom3d = geologyRandomFactory3d(geologyTextureSeed3d(SCENE.id + '-process'));
    var processWarmColor3d = new THREE.Color(0xff8a3d);
    var processCoolColor3d = new THREE.Color(0x67e8f9);
    var processCrystalColor3d = new THREE.Color(0xc4b5fd);
    for (var geologyProcessIndex3d = 0; geologyProcessIndex3d < geologyProcessCount3d; geologyProcessIndex3d++) {
      geologyProcessPhases3d[geologyProcessIndex3d] = geologyProcessRandom3d();
      var geologyProcessColor3d = processWarmColor3d;
      if (SCENE.id === 'subduction') geologyProcessColor3d = geologyProcessIndex3d < geologyProcessCount3d * 0.56
        ? processCoolColor3d : processWarmColor3d;
      else if (SCENE.id === 'ridge') geologyProcessColor3d = geologyProcessIndex3d % 3 === 0
        ? processCoolColor3d : processWarmColor3d;
      else if (SCENE.id === 'geode') geologyProcessColor3d = geologyProcessIndex3d % 2
        ? processCrystalColor3d : processCoolColor3d;
      else if (SCENE.id === 'deepEarth') geologyProcessColor3d = geologyProcessIndex3d % 3
        ? processWarmColor3d : new THREE.Color(0xffd166);
      geologyProcessColors3d[geologyProcessIndex3d * 3] = geologyProcessColor3d.r;
      geologyProcessColors3d[geologyProcessIndex3d * 3 + 1] = geologyProcessColor3d.g;
      geologyProcessColors3d[geologyProcessIndex3d * 3 + 2] = geologyProcessColor3d.b;
    }
    var geologyProcessGeometry3d = new THREE.BufferGeometry();
    geologyProcessGeometry3d.setAttribute('position', new THREE.BufferAttribute(geologyProcessPositions3d, 3));
    geologyProcessGeometry3d.setAttribute('color', new THREE.BufferAttribute(geologyProcessColors3d, 3));
    var geologyProcessMaterial3d = new THREE.PointsMaterial({
      map: geologyGlowTexture3d,
      vertexColors: true,
      alphaTest: 0.018,
      size: SCENE.id === 'geode' ? 0.14 : 0.17,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var geologyProcessPoints3d = new THREE.Points(geologyProcessGeometry3d, geologyProcessMaterial3d);
    scene.add(geologyProcessPoints3d);

    // Thin luminous ribbons make the direction and relationship of each
    // process readable even when a moving tracer is between frames.
    var geologyProcessGuideGroup3d = new THREE.Group();
    var geologyProcessGuideGeometries3d = [];
    var geologyProcessGuideMaterials3d = [];
    var geologyProcessGuideArrowGeometry3d = new THREE.ConeGeometry(0.13, 0.36, 8, 1, false);
    var geologyProcessGuideUp3d = new THREE.Vector3(0, 1, 0);
    scene.add(geologyProcessGuideGroup3d);
    function addGeologyProcessGuide3d(points3d, color3d, closed3d, arrowStops3d) {
      var guideVectors3d = points3d.map(function (point3d) {
        return new THREE.Vector3(point3d[0], point3d[1], 0);
      });
      var guideCurve3d = new THREE.CatmullRomCurve3(guideVectors3d, !!closed3d, 'centripetal', 0.45);
      var guideGeometry3d = new THREE.TubeGeometry(
        guideCurve3d,
        geologyHighDetail3d ? 52 : 32,
        SCENE.id === 'geode' ? 0.034 : 0.045,
        6,
        !!closed3d
      );
      var guideMaterial3d = new THREE.MeshBasicMaterial({
        color: color3d,
        transparent: true,
        opacity: SCENE.id === 'geode' ? 0.25 : (SCENE.id === 'deepEarth' ? 0.48 : 0.3),
        depthWrite: false,
        blending: SCENE.id === 'deepEarth' ? THREE.NormalBlending : THREE.AdditiveBlending
      });
      var guideMesh3d = new THREE.Mesh(guideGeometry3d, guideMaterial3d);
      guideMesh3d.renderOrder = 2;
      geologyProcessGuideGroup3d.add(guideMesh3d);
      geologyProcessGuideGeometries3d.push(guideGeometry3d);
      geologyProcessGuideMaterials3d.push(guideMaterial3d);
      (arrowStops3d || [0.72]).forEach(function (arrowStop3d) {
        var arrowPosition3d = guideCurve3d.getPointAt(arrowStop3d);
        var arrowTangent3d = guideCurve3d.getTangentAt(arrowStop3d).normalize();
        var arrowMaterial3d = new THREE.MeshBasicMaterial({
          color: color3d,
          transparent: true,
          opacity: SCENE.id === 'deepEarth' ? 0.84 : 0.72,
          depthWrite: false,
          blending: SCENE.id === 'deepEarth' ? THREE.NormalBlending : THREE.AdditiveBlending
        });
        var arrowMesh3d = new THREE.Mesh(geologyProcessGuideArrowGeometry3d, arrowMaterial3d);
        arrowMesh3d.position.copy(arrowPosition3d);
        arrowMesh3d.quaternion.setFromUnitVectors(geologyProcessGuideUp3d, arrowTangent3d);
        arrowMesh3d.renderOrder = 3;
        geologyProcessGuideGroup3d.add(arrowMesh3d);
        geologyProcessGuideMaterials3d.push(arrowMaterial3d);
      });
    }
    if (SCENE.id === 'deepEarth') {
      addGeologyProcessGuide3d([[-4.2, 0], [-2.6, 2.8], [0, 3.5], [2.6, 2.8], [4.2, 0], [2.6, -2.8], [0, -3.5], [-2.6, -2.8]], 0xff9b4a, true, [0.18, 0.68]);
      addGeologyProcessGuide3d([[2.5, 0], [1.4, 1.65], [0, 2], [-1.4, 1.65], [-2.5, 0], [-1.4, -1.65], [0, -2], [1.4, -1.65]], 0xffd166, true, [0.12, 0.62]);
    } else if (SCENE.id === 'subduction') {
      addGeologyProcessGuide3d([[-5.6, 4.7], [-3.6, 3.1], [-1.7, 0.8], [0.2, -1.9], [2, -4.4]], 0x67e8f9, false, [0.4, 0.78]);
      addGeologyProcessGuide3d([[0.9, -3.2], [1.2, -1.4], [1.45, 1.2], [1.35, 4.6]], 0xff8a3d, false, [0.42, 0.8]);
    } else if (SCENE.id === 'ridge') {
      addGeologyProcessGuide3d([[0, -5.35], [-0.12, -2.6], [0, 1.85]], 0xff8a3d, false, [0.48, 0.84]);
      addGeologyProcessGuide3d([[0, 1.85], [-2.3, 2.05], [-5.7, 2.35]], 0x67e8f9, false, [0.8]);
      addGeologyProcessGuide3d([[0, 1.85], [2.3, 2.05], [5.7, 2.35]], 0x67e8f9, false, [0.8]);
    } else if (SCENE.id === 'hotspot') {
      addGeologyProcessGuide3d([[2.8, -5.5], [2.65, -2.5], [2.8, 0.7], [2.75, 4.75]], 0xff8a3d, false, [0.48, 0.82]);
      addGeologyProcessGuide3d([[5.3, 4.55], [2.2, 4.62], [-1.7, 4.52], [-5.4, 4.62]], 0x67e8f9, false, [0.44, 0.82]);
    } else if (SCENE.id === 'collision') {
      // two plates converge at mid-crust; the summit is pushed up above the seam
      addGeologyProcessGuide3d([[-6.4, -1.3], [-3.8, -1.15], [-1.3, -1.0]], 0x67e8f9, false, [0.5, 0.9]);
      addGeologyProcessGuide3d([[6.4, -1.5], [3.9, -1.3], [1.9, -1.1]], 0x67e8f9, false, [0.5, 0.9]);
      addGeologyProcessGuide3d([[0.6, -2.6], [0.65, 0.4], [0.7, 3.6]], 0xfbbf24, false, [0.45, 0.85]);
    } else if (SCENE.id === 'geode') {
      addGeologyProcessGuide3d([[-2.05, 0], [-1.45, 1.3], [0, 1.75], [1.45, 1.3], [2.05, 0], [1.45, -1.3], [0, -1.75], [-1.45, -1.3]], 0xc4b5fd, true, [0.2, 0.7]);
    } else {
      addGeologyProcessGuide3d([[-0.15, -5.45], [0.18, -2.1], [-0.12, 1.1], [0.08, 5.05]], 0xff8a3d, false, [0.42, 0.8]);
    }
    cnv.dataset.geologyProcessGuideCount = String(geologyProcessGuideGroup3d.children.length);
    function updateGeologyProcessGuideDepth3d() {
      geologyProcessGuideGroup3d.position.z = SCENE.id === 'geode'
        ? 0.12
        : WORLD.d * 0.5 - (Number(sliceZ) || 0) * VOXEL + 0.085;
    }
    var geologyDeepEarthCoreGroup3d = new THREE.Group();
    var geologyDeepEarthDynamoGroup3d = new THREE.Group();
    var geologyDeepEarthFieldGroup3d = new THREE.Group();
    var geologyDeepEarthGeometries3d = [];
    var geologyDeepEarthMaterials3d = [];
    var geologyDeepEarthFieldMaterials3d = [];
    var geologyInnerCoreMesh3d = null;
    var geologyInnerCoreGlow3d = null;
    var geologyOuterCoreShell3d = null;
    scene.add(geologyDeepEarthCoreGroup3d);
    scene.add(geologyDeepEarthFieldGroup3d);
    geologyDeepEarthCoreGroup3d.add(geologyDeepEarthDynamoGroup3d);
    function addDeepEarthCoreVisuals3d() {
      var innerCoreGeometry3d = new THREE.IcosahedronGeometry(1.38, geologyHighDetail3d ? 3 : 2);
      var innerCoreMaterial3d = new THREE.MeshPhysicalMaterial({
        color: 0xd97706,
        emissive: 0x7c2d12,
        emissiveIntensity: 0.12,
        roughness: 0.44,
        metalness: 0.28,
        clearcoat: 0.38,
        clearcoatRoughness: 0.28,
        flatShading: true,
        transparent: true,
        opacity: 0.96
      });
      geologyInnerCoreMesh3d = new THREE.Mesh(innerCoreGeometry3d, innerCoreMaterial3d);
      geologyInnerCoreMesh3d.castShadow = geologyHighDetail3d;
      geologyDeepEarthCoreGroup3d.add(geologyInnerCoreMesh3d);
      geologyDeepEarthGeometries3d.push(innerCoreGeometry3d);
      geologyDeepEarthMaterials3d.push(innerCoreMaterial3d);

      var innerCoreGlowGeometry3d = new THREE.SphereGeometry(1.58, geologyHighDetail3d ? 28 : 18, geologyHighDetail3d ? 18 : 12);
      var innerCoreGlowMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide
      });
      innerCoreGlowMaterial3d.userData.geologyBaseOpacity = 0.06;
      geologyInnerCoreGlow3d = new THREE.Mesh(innerCoreGlowGeometry3d, innerCoreGlowMaterial3d);
      geologyInnerCoreGlow3d.renderOrder = 2;
      geologyDeepEarthCoreGroup3d.add(geologyInnerCoreGlow3d);
      geologyDeepEarthGeometries3d.push(innerCoreGlowGeometry3d);
      geologyDeepEarthMaterials3d.push(innerCoreGlowMaterial3d);

      var outerCoreShellGeometry3d = new THREE.SphereGeometry(3.58, geologyHighDetail3d ? 38 : 24, geologyHighDetail3d ? 24 : 16);
      var outerCoreShellMaterial3d = new THREE.MeshPhysicalMaterial({
        color: 0xea580c,
        emissive: 0x7c2d12,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.16,
        roughness: 0.4,
        metalness: 0.12,
        clearcoat: 0.34,
        clearcoatRoughness: 0.26,
        depthWrite: false,
        side: THREE.BackSide
      });
      outerCoreShellMaterial3d.userData.geologyBaseOpacity = 0.16;
      geologyOuterCoreShell3d = new THREE.Mesh(outerCoreShellGeometry3d, outerCoreShellMaterial3d);
      geologyOuterCoreShell3d.renderOrder = 1;
      geologyDeepEarthCoreGroup3d.add(geologyOuterCoreShell3d);
      geologyDeepEarthGeometries3d.push(outerCoreShellGeometry3d);
      geologyDeepEarthMaterials3d.push(outerCoreShellMaterial3d);

      for (var coreBoundaryRingIndex3d = 0; coreBoundaryRingIndex3d < 3; coreBoundaryRingIndex3d++) {
        var coreBoundaryRingGeometry3d = new THREE.TorusGeometry(3.58, 0.027, 6, geologyHighDetail3d ? 56 : 34);
        var coreBoundaryRingMaterial3d = new THREE.MeshBasicMaterial({
          color: coreBoundaryRingIndex3d === 2 ? 0xf59e0b : 0xc2410c,
          transparent: true,
          opacity: 0.2,
          depthWrite: false
        });
        var coreBoundaryRing3d = new THREE.Mesh(coreBoundaryRingGeometry3d, coreBoundaryRingMaterial3d);
        if (coreBoundaryRingIndex3d === 0) coreBoundaryRing3d.rotation.x = Math.PI / 2;
        else if (coreBoundaryRingIndex3d === 1) coreBoundaryRing3d.rotation.y = Math.PI / 2;
        else coreBoundaryRing3d.rotation.set(Math.PI / 2, Math.PI / 4, 0);
        coreBoundaryRing3d.renderOrder = 2;
        geologyDeepEarthCoreGroup3d.add(coreBoundaryRing3d);
        geologyDeepEarthGeometries3d.push(coreBoundaryRingGeometry3d);
        geologyDeepEarthMaterials3d.push(coreBoundaryRingMaterial3d);
      }

      var dynamoArrowGeometry3d = new THREE.ConeGeometry(0.09, 0.26, 7, 1, false);
      geologyDeepEarthGeometries3d.push(dynamoArrowGeometry3d);
      var dynamoLoopCount3d = geologyHighDetail3d ? 4 : 3;
      for (var dynamoLoopIndex3d = 0; dynamoLoopIndex3d < dynamoLoopCount3d; dynamoLoopIndex3d++) {
        var dynamoPoints3d = [];
        var dynamoPhase3d = dynamoLoopIndex3d / dynamoLoopCount3d * Math.PI * 2;
        for (var dynamoPointIndex3d = 0; dynamoPointIndex3d < 12; dynamoPointIndex3d++) {
          var dynamoAngle3d = dynamoPointIndex3d / 12 * Math.PI * 2;
          var dynamoRadius3d = 2.25 + (dynamoLoopIndex3d % 2) * 0.28;
          dynamoPoints3d.push(new THREE.Vector3(
            Math.cos(dynamoAngle3d) * dynamoRadius3d,
            Math.sin(dynamoAngle3d) * dynamoRadius3d * 0.68,
            Math.sin(dynamoAngle3d * 2 + dynamoPhase3d) * (0.5 + dynamoLoopIndex3d * 0.07)
          ));
        }
        var dynamoCurve3d = new THREE.CatmullRomCurve3(dynamoPoints3d, true, 'centripetal', 0.45);
        var dynamoGeometry3d = new THREE.TubeGeometry(dynamoCurve3d, geologyHighDetail3d ? 52 : 32, 0.047, 6, true);
        var dynamoMaterial3d = new THREE.MeshBasicMaterial({
          color: dynamoLoopIndex3d % 2 ? 0xf59e0b : 0xdc2626,
          transparent: true,
          opacity: 0.7,
          depthWrite: false
        });
        var dynamoMesh3d = new THREE.Mesh(dynamoGeometry3d, dynamoMaterial3d);
        dynamoMesh3d.rotation.y = dynamoPhase3d * 0.23;
        dynamoMesh3d.renderOrder = 3;
        geologyDeepEarthDynamoGroup3d.add(dynamoMesh3d);
        geologyDeepEarthGeometries3d.push(dynamoGeometry3d);
        geologyDeepEarthMaterials3d.push(dynamoMaterial3d);
        var dynamoArrowStop3d = (0.18 + dynamoLoopIndex3d * 0.13) % 1;
        var dynamoArrowPosition3d = dynamoCurve3d.getPointAt(dynamoArrowStop3d);
        var dynamoArrowTangent3d = dynamoCurve3d.getTangentAt(dynamoArrowStop3d).normalize();
        var dynamoArrowMaterial3d = new THREE.MeshBasicMaterial({
          color: dynamoLoopIndex3d % 2 ? 0xf59e0b : 0xdc2626,
          transparent: true,
          opacity: 0.92,
          depthWrite: false
        });
        var dynamoArrow3d = new THREE.Mesh(dynamoArrowGeometry3d, dynamoArrowMaterial3d);
        dynamoArrow3d.position.copy(dynamoArrowPosition3d);
        dynamoArrow3d.quaternion.setFromUnitVectors(geologyProcessGuideUp3d, dynamoArrowTangent3d);
        dynamoArrow3d.renderOrder = 4;
        geologyDeepEarthDynamoGroup3d.add(dynamoArrow3d);
        geologyDeepEarthMaterials3d.push(dynamoArrowMaterial3d);
      }

      var magneticArrowGeometry3d = new THREE.ConeGeometry(0.075, 0.22, 7, 1, false);
      geologyDeepEarthGeometries3d.push(magneticArrowGeometry3d);
      var magneticFieldCount3d = geologyHighDetail3d ? 5 : 4;
      for (var magneticFieldIndex3d = 0; magneticFieldIndex3d < magneticFieldCount3d; magneticFieldIndex3d++) {
        var magneticAzimuth3d = magneticFieldIndex3d / magneticFieldCount3d * Math.PI * 2;
        var magneticRadialX3d = Math.cos(magneticAzimuth3d);
        var magneticRadialZ3d = Math.sin(magneticAzimuth3d);
        var magneticWidth3d = 4.65 + (magneticFieldIndex3d % 3) * 0.48;
        var magneticPoints3d = [
          new THREE.Vector3(0, 3.25, 0),
          new THREE.Vector3(magneticRadialX3d * magneticWidth3d * 0.58, 2.55, magneticRadialZ3d * magneticWidth3d * 0.58),
          new THREE.Vector3(magneticRadialX3d * magneticWidth3d, 0, magneticRadialZ3d * magneticWidth3d),
          new THREE.Vector3(magneticRadialX3d * magneticWidth3d * 0.58, -2.55, magneticRadialZ3d * magneticWidth3d * 0.58),
          new THREE.Vector3(0, -3.25, 0)
        ];
        var magneticCurve3d = new THREE.CatmullRomCurve3(magneticPoints3d, false, 'centripetal', 0.45);
        var magneticGeometry3d = new THREE.TubeGeometry(magneticCurve3d, geologyHighDetail3d ? 46 : 28, 0.03, 5, false);
        var magneticMaterial3d = new THREE.MeshBasicMaterial({
          color: magneticFieldIndex3d % 2 ? 0x38bdf8 : 0x2563eb,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          depthTest: false
        });
        magneticMaterial3d.userData.geologyBaseOpacity = 0.38;
        var magneticMesh3d = new THREE.Mesh(magneticGeometry3d, magneticMaterial3d);
        magneticMesh3d.renderOrder = 5;
        geologyDeepEarthFieldGroup3d.add(magneticMesh3d);
        geologyDeepEarthGeometries3d.push(magneticGeometry3d);
        geologyDeepEarthMaterials3d.push(magneticMaterial3d);
        geologyDeepEarthFieldMaterials3d.push(magneticMaterial3d);
        var magneticArrowPosition3d = magneticCurve3d.getPointAt(0.48);
        var magneticArrowTangent3d = magneticCurve3d.getTangentAt(0.48).normalize();
        var magneticArrowMaterial3d = new THREE.MeshBasicMaterial({
          color: magneticFieldIndex3d % 2 ? 0x38bdf8 : 0x2563eb,
          transparent: true,
          opacity: 0.82,
          depthWrite: false,
          depthTest: false
        });
        var magneticArrow3d = new THREE.Mesh(magneticArrowGeometry3d, magneticArrowMaterial3d);
        magneticArrow3d.position.copy(magneticArrowPosition3d);
        magneticArrow3d.quaternion.setFromUnitVectors(geologyProcessGuideUp3d, magneticArrowTangent3d);
        magneticArrow3d.renderOrder = 6;
        geologyDeepEarthFieldGroup3d.add(magneticArrow3d);
        geologyDeepEarthMaterials3d.push(magneticArrowMaterial3d);
      }
    }
    if (SCENE.id === 'deepEarth') addDeepEarthCoreVisuals3d();
    var geologyScienceStage3d = 0;
    var geologySeismicGroup3d = new THREE.Group();
    var geologySeismicRayGroup3d = new THREE.Group();
    var geologySeismicMarkerGroup3d = new THREE.Group();
    var geologySeismicGeometries3d = [];
    var geologySeismicMaterials3d = [];
    var geologySeismicPCurves3d = [];
    var geologySeismicSCurves3d = [];
    var geologySeismicPulseRecords3d = [];
    var geologySeismicSourceRings3d = [];
    var geologySeismicStopMarkers3d = [];
    var geologySeismicShadowReceivers3d = [];
    var geologySeismicSource3d = null;
    scene.add(geologySeismicGroup3d);
    geologySeismicGroup3d.add(geologySeismicRayGroup3d);
    geologySeismicGroup3d.add(geologySeismicMarkerGroup3d);
    function addDeepEarthSeismicVisuals3d() {
      var pPulseGeometry3d = new THREE.SphereGeometry(0.12, geologyHighDetail3d ? 12 : 8, geologyHighDetail3d ? 8 : 6);
      var sPulseGeometry3d = new THREE.OctahedronGeometry(0.16, 0);
      var pPulseMaterial3d = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
        depthTest: false
      });
      var sPulseMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.96,
        depthWrite: false,
        depthTest: false
      });
      geologySeismicGeometries3d.push(pPulseGeometry3d, sPulseGeometry3d);
      geologySeismicMaterials3d.push(pPulseMaterial3d, sPulseMaterial3d);
      [
        { radius: 5.3, width: 0.055, color: 0x93c5fd, opacity: 0.24, scaleY: 0.82 },
        { radius: 3.52, width: 0.065, color: 0xfda4af, opacity: 0.36, scaleY: 1 }
      ].forEach(function (boundary3d) {
        var boundaryGeometry3d = new THREE.RingGeometry(
          boundary3d.radius - boundary3d.width,
          boundary3d.radius + boundary3d.width,
          geologyHighDetail3d ? 72 : 44
        );
        var boundaryMaterial3d = new THREE.MeshBasicMaterial({
          color: boundary3d.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: boundary3d.opacity,
          depthWrite: false,
          depthTest: false
        });
        var boundaryMesh3d = new THREE.Mesh(boundaryGeometry3d, boundaryMaterial3d);
        boundaryMesh3d.scale.y = boundary3d.scaleY;
        boundaryMesh3d.position.z = -0.06;
        boundaryMesh3d.renderOrder = 6;
        geologySeismicRayGroup3d.add(boundaryMesh3d);
        geologySeismicGeometries3d.push(boundaryGeometry3d);
        geologySeismicMaterials3d.push(boundaryMaterial3d);
      });
      function addSeismicRay3d(pointRows3d, waveType3d, rayIndex3d) {
        var points3d = pointRows3d.map(function (point3d) {
          return new THREE.Vector3(point3d[0], point3d[1], point3d[2]);
        });
        var rayCurve3d = new THREE.CatmullRomCurve3(points3d, false, 'centripetal', 0.38);
        var isPWave3d = waveType3d === 'P';
        var rayGeometry3d = new THREE.TubeGeometry(
          rayCurve3d,
          geologyHighDetail3d ? 58 : 34,
          isPWave3d ? 0.052 : 0.068,
          6,
          false
        );
        var rayMaterial3d = new THREE.MeshBasicMaterial({
          color: isPWave3d ? (rayIndex3d % 2 ? 0x67e8f9 : 0x22d3ee) : (rayIndex3d % 2 ? 0xe879f9 : 0xf472b6),
          transparent: true,
          opacity: isPWave3d ? 0.82 : 0.9,
          depthWrite: false,
          depthTest: false
        });
        rayMaterial3d.userData.geologyBaseOpacity = rayMaterial3d.opacity;
        var rayMesh3d = new THREE.Mesh(rayGeometry3d, rayMaterial3d);
        rayMesh3d.renderOrder = isPWave3d ? 8 : 9;
        geologySeismicRayGroup3d.add(rayMesh3d);
        geologySeismicGeometries3d.push(rayGeometry3d);
        geologySeismicMaterials3d.push(rayMaterial3d);
        (isPWave3d ? geologySeismicPCurves3d : geologySeismicSCurves3d).push(rayCurve3d);
        var pulseCount3d = geologyHighDetail3d ? 2 : 1;
        for (var pulseIndex3d = 0; pulseIndex3d < pulseCount3d; pulseIndex3d++) {
          var pulseMesh3d = new THREE.Mesh(
            isPWave3d ? pPulseGeometry3d : sPulseGeometry3d,
            isPWave3d ? pPulseMaterial3d : sPulseMaterial3d
          );
          pulseMesh3d.renderOrder = 11;
          geologySeismicRayGroup3d.add(pulseMesh3d);
          geologySeismicPulseRecords3d.push({
            curve: rayCurve3d,
            mesh: pulseMesh3d,
            type: waveType3d,
            offset: (rayIndex3d * 0.19 + pulseIndex3d / pulseCount3d) % 1,
            speed: isPWave3d ? 0.105 : 0.082
          });
        }
      }

      var pRayRows3d = [
        [[-5.1, 3.45, -0.24], [-4.18, 2.78, -0.19], [-3.08, 1.58, -0.12], [-1.56, 0.58, -0.02], [0, -0.08, 0.08], [1.55, -0.66, 0.16], [3.05, -1.56, 0.21], [4.88, -3.02, 0.24]],
        [[-5.1, 3.45, 0.02], [-4.18, 2.25, 0.1], [-3.32, 0.78, 0.17], [-2.08, -0.52, 0.21], [-0.48, -1.08, 0.17], [1.55, -1.26, 0.11], [3.55, -1.52, 0.05], [5.02, -1.82, 0]],
        [[-5.1, 3.45, 0.3], [-4.02, 3.82, 0.25], [-2.18, 4.34, 0.13], [0, 4.56, 0], [2.4, 4.18, -0.13], [4.86, 2.88, -0.28]]
      ];
      var sRayRows3d = [
        [[-5.1, 3.45, -0.18], [-4.36, 2.94, -0.12], [-3.7, 2.34, -0.04], [-3.05, 1.75, 0.03]],
        [[-5.1, 3.45, 0.06], [-4.38, 2.4, 0.12], [-3.84, 1.25, 0.17], [-3.52, 0.38, 0.2]],
        [[-5.1, 3.45, 0.28], [-4.14, 3.68, 0.24], [-3.02, 3.42, 0.16], [-2.08, 2.88, 0.08]]
      ];
      var pRayLimit3d = geologyHighDetail3d ? pRayRows3d.length : 2;
      var sRayLimit3d = geologyHighDetail3d ? sRayRows3d.length : 2;
      for (var pRayIndex3d = 0; pRayIndex3d < pRayLimit3d; pRayIndex3d++) {
        addSeismicRay3d(pRayRows3d[pRayIndex3d], 'P', pRayIndex3d);
      }
      for (var sRayIndex3d = 0; sRayIndex3d < sRayLimit3d; sRayIndex3d++) {
        addSeismicRay3d(sRayRows3d[sRayIndex3d], 'S', sRayIndex3d);
      }

      var sourceGeometry3d = new THREE.IcosahedronGeometry(0.2, 1);
      var sourceMaterial3d = new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xdc2626,
        emissiveIntensity: 0.82,
        roughness: 0.36,
        metalness: 0.05,
        depthTest: false
      });
      geologySeismicSource3d = new THREE.Mesh(sourceGeometry3d, sourceMaterial3d);
      geologySeismicSource3d.position.set(-5.1, 3.45, 0.38);
      geologySeismicSource3d.renderOrder = 12;
      geologySeismicMarkerGroup3d.add(geologySeismicSource3d);
      geologySeismicGeometries3d.push(sourceGeometry3d);
      geologySeismicMaterials3d.push(sourceMaterial3d);
      for (var sourceRingIndex3d = 0; sourceRingIndex3d < 3; sourceRingIndex3d++) {
        var sourceRingGeometry3d = new THREE.RingGeometry(
          0.25 + sourceRingIndex3d * 0.16,
          0.275 + sourceRingIndex3d * 0.16,
          geologyHighDetail3d ? 32 : 20
        );
        var sourceRingMaterial3d = new THREE.MeshBasicMaterial({
          color: sourceRingIndex3d % 2 ? 0xf97316 : 0xfbbf24,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.78 - sourceRingIndex3d * 0.12,
          depthWrite: false,
          depthTest: false
        });
        sourceRingMaterial3d.userData.geologyBaseOpacity = sourceRingMaterial3d.opacity;
        var sourceRing3d = new THREE.Mesh(sourceRingGeometry3d, sourceRingMaterial3d);
        sourceRing3d.position.copy(geologySeismicSource3d.position);
        sourceRing3d.position.z -= 0.015;
        sourceRing3d.renderOrder = 10;
        geologySeismicMarkerGroup3d.add(sourceRing3d);
        geologySeismicSourceRings3d.push(sourceRing3d);
        geologySeismicGeometries3d.push(sourceRingGeometry3d);
        geologySeismicMaterials3d.push(sourceRingMaterial3d);
      }

      var stopRingGeometry3d = new THREE.TorusGeometry(0.21, 0.035, 6, geologyHighDetail3d ? 24 : 16);
      var stopRingMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        depthTest: false
      });
      var stopXGeometry3d = new THREE.BoxGeometry(0.34, 0.055, 0.04);
      var stopXMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xfdf2f8,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
        depthTest: false
      });
      geologySeismicGeometries3d.push(stopRingGeometry3d, stopXGeometry3d);
      geologySeismicMaterials3d.push(stopRingMaterial3d, stopXMaterial3d);
      geologySeismicSCurves3d.forEach(function (sCurve3d) {
        var stopPosition3d = sCurve3d.getPointAt(1);
        var stopGroup3d = new THREE.Group();
        var stopRing3d = new THREE.Mesh(stopRingGeometry3d, stopRingMaterial3d);
        var stopXForward3d = new THREE.Mesh(stopXGeometry3d, stopXMaterial3d);
        var stopXBack3d = new THREE.Mesh(stopXGeometry3d, stopXMaterial3d);
        stopXForward3d.rotation.z = Math.PI / 4;
        stopXBack3d.rotation.z = -Math.PI / 4;
        stopRing3d.renderOrder = 12;
        stopXForward3d.renderOrder = 13;
        stopXBack3d.renderOrder = 13;
        stopGroup3d.position.copy(stopPosition3d);
        stopGroup3d.add(stopRing3d);
        stopGroup3d.add(stopXForward3d);
        stopGroup3d.add(stopXBack3d);
        geologySeismicMarkerGroup3d.add(stopGroup3d);
        geologySeismicStopMarkers3d.push(stopGroup3d);
      });

      var shadowArcPoints3d = [];
      for (var shadowPointIndex3d = 0; shadowPointIndex3d <= 12; shadowPointIndex3d++) {
        var shadowAngle3d = (-52 + shadowPointIndex3d / 12 * 104) * Math.PI / 180;
        shadowArcPoints3d.push(new THREE.Vector3(
          Math.cos(shadowAngle3d) * 5.3,
          Math.sin(shadowAngle3d) * 5.3,
          0.04
        ));
      }
      var shadowArcCurve3d = new THREE.CatmullRomCurve3(shadowArcPoints3d, false, 'centripetal', 0.4);
      var shadowArcGeometry3d = new THREE.TubeGeometry(shadowArcCurve3d, geologyHighDetail3d ? 48 : 30, 0.05, 6, false);
      var shadowArcMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        depthTest: false
      });
      var shadowArcMesh3d = new THREE.Mesh(shadowArcGeometry3d, shadowArcMaterial3d);
      shadowArcMesh3d.renderOrder = 8;
      geologySeismicMarkerGroup3d.add(shadowArcMesh3d);
      geologySeismicGeometries3d.push(shadowArcGeometry3d);
      geologySeismicMaterials3d.push(shadowArcMaterial3d);

      var receiverRingGeometry3d = new THREE.TorusGeometry(0.2, 0.038, 6, geologyHighDetail3d ? 24 : 16);
      var receiverRingMaterial3d = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        depthTest: false
      });
      var receiverXGeometry3d = new THREE.BoxGeometry(0.28, 0.045, 0.035);
      var receiverXMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        depthTest: false
      });
      geologySeismicGeometries3d.push(receiverRingGeometry3d, receiverXGeometry3d);
      geologySeismicMaterials3d.push(receiverRingMaterial3d, receiverXMaterial3d);
      [-38, -13, 14, 39].forEach(function (receiverAngleDegrees3d) {
        var receiverAngle3d = receiverAngleDegrees3d * Math.PI / 180;
        var receiverGroup3d = new THREE.Group();
        var receiverRing3d = new THREE.Mesh(receiverRingGeometry3d, receiverRingMaterial3d);
        var receiverXForward3d = new THREE.Mesh(receiverXGeometry3d, receiverXMaterial3d);
        var receiverXBack3d = new THREE.Mesh(receiverXGeometry3d, receiverXMaterial3d);
        receiverXForward3d.rotation.z = Math.PI / 4;
        receiverXBack3d.rotation.z = -Math.PI / 4;
        receiverRing3d.renderOrder = 12;
        receiverXForward3d.renderOrder = 13;
        receiverXBack3d.renderOrder = 13;
        receiverGroup3d.position.set(
          Math.cos(receiverAngle3d) * 5.3,
          Math.sin(receiverAngle3d) * 5.3,
          0.08
        );
        receiverGroup3d.add(receiverRing3d);
        receiverGroup3d.add(receiverXForward3d);
        receiverGroup3d.add(receiverXBack3d);
        geologySeismicMarkerGroup3d.add(receiverGroup3d);
        geologySeismicShadowReceivers3d.push(receiverGroup3d);
      });
    }
    if (SCENE.id === 'deepEarth') addDeepEarthSeismicVisuals3d();
    cnv.dataset.geologySeismicRendering = SCENE.id === 'deepEarth'
      ? 'p-wave-refraction-s-wave-liquid-core-stop-and-shadow-receivers'
      : 'not-applicable';
    cnv.dataset.geologyPWaveRayCount = String(geologySeismicPCurves3d.length);
    cnv.dataset.geologySWaveRayCount = String(geologySeismicSCurves3d.length);
    cnv.dataset.geologySeismicReceiverCount = String(geologySeismicShadowReceivers3d.length);
    function updateGeologySeismicVisuals3d(time3d) {
      if (SCENE.id !== 'deepEarth' || !geologySeismicGroup3d.visible) return;
      var seismicTime3d = reducedMotion3d ? 0.68 : time3d;
      geologySeismicGroup3d.position.z = WORLD.d * 0.5 - (Number(sliceZ) || 0) * VOXEL + 0.18;
      if (geologySeismicSource3d) {
        geologySeismicSource3d.rotation.y = reducedMotion3d ? 0.2 : seismicTime3d * 0.72;
        geologySeismicSource3d.rotation.z = reducedMotion3d ? -0.12 : seismicTime3d * 0.46;
        geologySeismicSource3d.scale.setScalar(reducedMotion3d ? 1 : 0.9 + Math.sin(seismicTime3d * 3.4) * 0.1);
      }
      geologySeismicSourceRings3d.forEach(function (sourceRing3d, sourceRingIndex3d) {
        var sourcePhase3d = reducedMotion3d ? (sourceRingIndex3d + 1) / 4 : (seismicTime3d * 0.24 + sourceRingIndex3d / 3) % 1;
        sourceRing3d.scale.setScalar(0.82 + sourcePhase3d * 0.72);
        sourceRing3d.material.opacity = sourceRing3d.material.userData.geologyBaseOpacity * (1 - sourcePhase3d * 0.72);
      });
      geologySeismicPulseRecords3d.forEach(function (pulseRecord3d, pulseIndex3d) {
        var pulseProgress3d = reducedMotion3d
          ? (pulseRecord3d.offset + 0.58) % 1
          : (pulseRecord3d.offset + seismicTime3d * pulseRecord3d.speed) % 1;
        pulseRecord3d.mesh.position.copy(pulseRecord3d.curve.getPointAt(pulseProgress3d));
        var pulseScale3d = pulseRecord3d.type === 'S' && pulseProgress3d > 0.84
          ? 1 + (pulseProgress3d - 0.84) * 2.8
          : 0.86 + Math.sin((pulseProgress3d + pulseIndex3d * 0.17) * Math.PI * 2) * 0.12;
        pulseRecord3d.mesh.scale.setScalar(pulseScale3d);
        pulseRecord3d.mesh.rotation.z = pulseRecord3d.type === 'S' && !reducedMotion3d ? seismicTime3d * 2.1 : 0;
      });
      geologySeismicStopMarkers3d.forEach(function (stopMarker3d, stopIndex3d) {
        var stopPulse3d = reducedMotion3d ? 1 : 0.92 + Math.sin(seismicTime3d * 2.5 + stopIndex3d) * 0.13;
        stopMarker3d.scale.setScalar(stopPulse3d);
      });
      geologySeismicShadowReceivers3d.forEach(function (receiver3d, receiverIndex3d) {
        var receiverPulse3d = reducedMotion3d ? 1 : 0.94 + Math.sin(seismicTime3d * 1.6 + receiverIndex3d * 0.8) * 0.08;
        receiver3d.scale.setScalar(receiverPulse3d);
      });
    }
    cnv.dataset.geologyCoreRendering = SCENE.id === 'deepEarth'
      ? 'faceted-inner-core-liquid-shell-and-geodynamo-streamlines'
      : 'not-applicable';
    cnv.dataset.geologyCoreElementCount = String(SCENE.id === 'deepEarth'
      ? geologyDeepEarthCoreGroup3d.children.length + geologyDeepEarthDynamoGroup3d.children.length
      : 0);
    cnv.dataset.geologyMagneticFieldRendering = SCENE.id === 'deepEarth'
      ? 'three-dimensional-dipole-field-lines'
      : 'not-applicable';
    cnv.dataset.geologyMagneticFieldCount = String(geologyDeepEarthFieldGroup3d.children.length);
    function updateGeologyDeepEarthVisuals3d(time3d) {
      if (SCENE.id !== 'deepEarth') return;
      var deepEarthTime3d = reducedMotion3d ? 0.76 : time3d;
      var deepEarthVisible3d = !focusLens && (Number(sliceZ) || 0) >= Math.max(3, Math.round(NZ * 0.28));
      geologyDeepEarthCoreGroup3d.visible = deepEarthVisible3d;
      geologyDeepEarthDynamoGroup3d.visible = deepEarthVisible3d && geologyScienceStage3d === 2;
      geologyDeepEarthFieldGroup3d.visible = deepEarthVisible3d && geologyScienceStage3d === 2;
      geologySeismicGroup3d.visible = deepEarthVisible3d && geologyScienceStage3d === 1;
      if (!deepEarthVisible3d) return;
      updateGeologySeismicVisuals3d(deepEarthTime3d);
      geologyInnerCoreMesh3d.rotation.set(
        reducedMotion3d ? 0.08 : Math.sin(deepEarthTime3d * 0.09) * 0.08,
        reducedMotion3d ? 0.16 : deepEarthTime3d * 0.055,
        reducedMotion3d ? -0.05 : Math.cos(deepEarthTime3d * 0.07) * 0.055
      );
      geologyDeepEarthDynamoGroup3d.rotation.y = reducedMotion3d ? 0.14 : deepEarthTime3d * 0.038;
      geologyDeepEarthDynamoGroup3d.rotation.x = reducedMotion3d ? -0.05 : Math.sin(deepEarthTime3d * 0.11) * 0.045;
      geologyInnerCoreGlow3d.material.opacity = geologyInnerCoreGlow3d.material.userData.geologyBaseOpacity *
        (reducedMotion3d ? 1 : 0.86 + Math.sin(deepEarthTime3d * 0.82) * 0.14);
      geologyOuterCoreShell3d.material.opacity = geologyOuterCoreShell3d.material.userData.geologyBaseOpacity *
        (reducedMotion3d ? 1 : 0.9 + Math.cos(deepEarthTime3d * 0.56) * 0.1);
      geologyDeepEarthFieldGroup3d.rotation.y = reducedMotion3d ? 0 : Math.sin(deepEarthTime3d * 0.055) * 0.055;
      geologyDeepEarthFieldMaterials3d.forEach(function (fieldMaterial3d, fieldIndex3d) {
        fieldMaterial3d.opacity = fieldMaterial3d.userData.geologyBaseOpacity *
          (reducedMotion3d ? 1 : 0.82 + Math.sin(deepEarthTime3d * 0.34 + fieldIndex3d) * 0.18);
      });
    }
    function updateGeologyProcessTracers3d(time3d) {
      var effectiveTime3d = reducedMotion3d ? 0.86 : time3d;
      // Keep the explanatory motion just above the currently exposed face.
      // A fixed front-z left tracers floating in empty space after a cutaway.
      var processFrontZ3d = WORLD.d * 0.5 - sliceZ * VOXEL + 0.12;
      for (var processIndex3d = 0; processIndex3d < geologyProcessCount3d; processIndex3d++) {
        var processPhase3d = geologyProcessPhases3d[processIndex3d];
        var processProgress3d = (processPhase3d + effectiveTime3d * (0.035 + (processIndex3d % 5) * 0.004)) % 1;
        var processX3d = 0, processY3d = 0, processZ3d = processFrontZ3d;
        if (SCENE.id === 'deepEarth') {
          var loopDirection3d = processIndex3d % 2 ? 1 : -1;
          var loopAngle3d = processProgress3d * Math.PI * 2 * loopDirection3d +
            (processIndex3d % 4) * Math.PI * 0.5;
          var loopRadius3d = processIndex3d % 3 === 0 ? WORLD.w * 0.18 : WORLD.w * 0.31;
          processX3d = Math.cos(loopAngle3d) * loopRadius3d;
          processY3d = Math.sin(loopAngle3d) * loopRadius3d * 0.78;
          processZ3d = processFrontZ3d + Math.sin(loopAngle3d * 2) * 0.32;
        } else if (SCENE.id === 'subduction') {
          if (processIndex3d < geologyProcessCount3d * 0.56) {
            processX3d = -WORLD.w * 0.4 + processProgress3d * WORLD.w * 0.69;
            processY3d = WORLD.h * 0.43 - processProgress3d * WORLD.h * 0.77;
            processZ3d += Math.sin(processIndex3d * 1.7) * 0.24;
          } else {
            processX3d = WORLD.w * 0.1 + Math.sin(processProgress3d * Math.PI) * WORLD.w * 0.055;
            processY3d = -WORLD.h * 0.27 + processProgress3d * WORLD.h * 0.7;
            processZ3d += Math.sin(processIndex3d * 1.3) * 0.2;
          }
        } else if (SCENE.id === 'ridge') {
          if (processIndex3d % 3) {
            var spreadSide3d = processIndex3d % 2 ? 1 : -1;
            processX3d = spreadSide3d * processProgress3d * WORLD.w * 0.43;
            processY3d = WORLD.h * 0.18 - processProgress3d * WORLD.h * 0.04;
          } else {
            processX3d = Math.sin(processProgress3d * Math.PI * 2 + processIndex3d) * 0.3;
            processY3d = -WORLD.h * 0.46 + processProgress3d * WORLD.h * 0.67;
          }
          processZ3d += Math.sin(processIndex3d * 1.4) * 0.22;
        } else if (SCENE.id === 'hotspot') {
          if (processIndex3d < geologyProcessCount3d * 0.72) {
            processX3d = WORLD.w * 0.2 + Math.sin(processProgress3d * Math.PI * 2 + processIndex3d) * 0.42;
            processY3d = -WORLD.h * 0.48 + processProgress3d * WORLD.h * 0.88;
          } else {
            processX3d = WORLD.w * 0.35 - processProgress3d * WORLD.w * 0.72;
            processY3d = WORLD.h * 0.42 + Math.sin(processIndex3d) * 0.12;
          }
          processZ3d += Math.sin(processIndex3d * 1.1) * 0.24;
        } else if (SCENE.id === 'collision') {
          if (processIndex3d < geologyProcessCount3d * 0.64) {
            var convergeSide3d = processIndex3d % 2 ? 1 : -1;
            processX3d = convergeSide3d * (WORLD.w * 0.46 - processProgress3d * WORLD.w * 0.38);
            processY3d = -WORLD.h * 0.12 + Math.sin(processIndex3d * 1.9) * 0.5;
          } else {
            processX3d = WORLD.w * 0.05 + Math.sin(processProgress3d * Math.PI * 2 + processIndex3d) * 0.36;
            processY3d = -WORLD.h * 0.22 + processProgress3d * WORLD.h * 0.62;
          }
          processZ3d += Math.cos(processIndex3d * 1.3) * 0.24;
        } else if (SCENE.id === 'geode') {
          var crystalAngle3d = processProgress3d * Math.PI * 2 + processIndex3d * 0.73;
          var crystalRadius3d = WORLD.w * (0.12 + (processIndex3d % 4) * 0.012);
          processX3d = Math.cos(crystalAngle3d) * crystalRadius3d;
          processY3d = Math.sin(crystalAngle3d) * crystalRadius3d * 0.76;
          processZ3d = WORLD.d * 0.11 + Math.sin(crystalAngle3d * 1.7) * WORLD.d * 0.11;
        } else {
          processX3d = Math.sin(processProgress3d * Math.PI * 4 + processIndex3d) * WORLD.w * 0.055;
          processY3d = -WORLD.h * 0.47 + processProgress3d * WORLD.h * 0.91;
          processZ3d += Math.cos(processIndex3d * 1.2) * 0.26;
        }
        geologyProcessPositions3d[processIndex3d * 3] = processX3d;
        geologyProcessPositions3d[processIndex3d * 3 + 1] = processY3d;
        geologyProcessPositions3d[processIndex3d * 3 + 2] = processZ3d;
      }
      geologyProcessGeometry3d.attributes.position.needsUpdate = true;
    }

    var excavationDustCount3d = geologyHighDetail3d ? 58 : 32;
    var excavationChipCount3d = geologyHighDetail3d ? 22 : 12;
    var excavationDustPositions3d = new Float32Array(excavationDustCount3d * 3);
    var excavationChipPositions3d = new Float32Array(excavationChipCount3d * 3);
    var excavationDustVelocity3d = new Float32Array(excavationDustCount3d * 3);
    var excavationChipVelocity3d = new Float32Array(excavationChipCount3d * 3);
    var excavationDustGeometry3d = new THREE.BufferGeometry();
    excavationDustGeometry3d.setAttribute('position', new THREE.BufferAttribute(excavationDustPositions3d, 3));
    var excavationChipGeometry3d = new THREE.BufferGeometry();
    excavationChipGeometry3d.setAttribute('position', new THREE.BufferAttribute(excavationChipPositions3d, 3));
    var excavationDustMaterial3d = new THREE.PointsMaterial({
      color: 0xc4a982, map: geologyDustTexture3d, alphaTest: 0.012,
      size: 0.42, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.NormalBlending
    });
    var excavationChipMaterial3d = new THREE.PointsMaterial({
      color: 0xe2d4c2, map: geologyChipTexture3d, alphaTest: 0.08,
      size: 0.13, transparent: true, opacity: 0,
      depthWrite: false
    });
    var excavationDustPoints3d = new THREE.Points(excavationDustGeometry3d, excavationDustMaterial3d);
    var excavationChipPoints3d = new THREE.Points(excavationChipGeometry3d, excavationChipMaterial3d);
    excavationDustPoints3d.visible = false; excavationChipPoints3d.visible = false;
    scene.add(excavationDustPoints3d); scene.add(excavationChipPoints3d);
    var excavationFlashSource3d = new THREE.BoxGeometry(VOXEL * 1.12, VOXEL * 1.12, VOXEL * 1.12);
    var excavationFlashGeometry3d = new THREE.EdgesGeometry(excavationFlashSource3d);
    var excavationFlashMaterial3d = new THREE.LineBasicMaterial({
      color: 0xfef3c7, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    var excavationFlashBox3d = new THREE.LineSegments(excavationFlashGeometry3d, excavationFlashMaterial3d);
    excavationFlashBox3d.visible = false; excavationFlashBox3d.renderOrder = 4;
    scene.add(excavationFlashBox3d);
    var excavationBurstLife3d = 0;
    var excavationRandom3d = geologyRandomFactory3d(geologyTextureSeed3d(SCENE.id + '-excavation'));
    function spawnExcavationBurst3d(voxel3d) {
      if (!voxel3d) return;
      var burstPosition3d = worldPos(voxel3d);
      var burstColorEntry3d = SCENE.palette[voxel3d.key] || ROCKS[voxel3d.key] || { color: 0xb7a58f };
      excavationDustMaterial3d.color.setHex(burstColorEntry3d.color || 0xb7a58f);
      excavationChipMaterial3d.color.setHex(burstColorEntry3d.color || 0xd6c6b0).lerp(new THREE.Color(0xffffff), 0.22);
      excavationFlashMaterial3d.color.setHex(burstColorEntry3d.color || 0xfef3c7).lerp(new THREE.Color(0xffffff), 0.48);
      excavationFlashBox3d.position.set(burstPosition3d[0], burstPosition3d[1], burstPosition3d[2]);
      excavationFlashBox3d.scale.setScalar(1);
      excavationFlashBox3d.visible = true;
      excavationBurstLife3d = reducedMotion3d ? 0.34 : 1;
      for (var dustIndex3d = 0; dustIndex3d < excavationDustCount3d; dustIndex3d++) {
        excavationDustPositions3d[dustIndex3d * 3] = burstPosition3d[0] + (excavationRandom3d() - 0.5) * 0.26;
        excavationDustPositions3d[dustIndex3d * 3 + 1] = burstPosition3d[1] + (excavationRandom3d() - 0.5) * 0.26;
        excavationDustPositions3d[dustIndex3d * 3 + 2] = burstPosition3d[2] + (excavationRandom3d() - 0.5) * 0.26;
        excavationDustVelocity3d[dustIndex3d * 3] = (excavationRandom3d() - 0.5) * 0.065;
        excavationDustVelocity3d[dustIndex3d * 3 + 1] = 0.018 + excavationRandom3d() * 0.058;
        excavationDustVelocity3d[dustIndex3d * 3 + 2] = (excavationRandom3d() - 0.5) * 0.065;
      }
      for (var chipIndex3d = 0; chipIndex3d < excavationChipCount3d; chipIndex3d++) {
        excavationChipPositions3d[chipIndex3d * 3] = burstPosition3d[0];
        excavationChipPositions3d[chipIndex3d * 3 + 1] = burstPosition3d[1];
        excavationChipPositions3d[chipIndex3d * 3 + 2] = burstPosition3d[2];
        excavationChipVelocity3d[chipIndex3d * 3] = (excavationRandom3d() - 0.5) * 0.105;
        excavationChipVelocity3d[chipIndex3d * 3 + 1] = 0.035 + excavationRandom3d() * 0.09;
        excavationChipVelocity3d[chipIndex3d * 3 + 2] = (excavationRandom3d() - 0.5) * 0.105;
      }
      excavationDustGeometry3d.attributes.position.needsUpdate = true;
      excavationChipGeometry3d.attributes.position.needsUpdate = true;
      excavationDustPoints3d.visible = !reducedMotion3d;
      excavationChipPoints3d.visible = !reducedMotion3d;
    }
    function updateExcavationEffects3d() {
      if (excavationBurstLife3d <= 0) return;
      excavationBurstLife3d = Math.max(0, excavationBurstLife3d - 0.024);
      excavationFlashMaterial3d.opacity = excavationBurstLife3d > 0
        ? (reducedMotion3d ? 0.72 : excavationBurstLife3d * 0.82) : 0;
      excavationFlashBox3d.scale.setScalar(reducedMotion3d ? 1.04 : 1.02 + (1 - excavationBurstLife3d) * 0.24);
      if (!reducedMotion3d) {
        for (var dustUpdateIndex3d = 0; dustUpdateIndex3d < excavationDustCount3d; dustUpdateIndex3d++) {
          excavationDustPositions3d[dustUpdateIndex3d * 3] += excavationDustVelocity3d[dustUpdateIndex3d * 3];
          excavationDustPositions3d[dustUpdateIndex3d * 3 + 1] += excavationDustVelocity3d[dustUpdateIndex3d * 3 + 1];
          excavationDustPositions3d[dustUpdateIndex3d * 3 + 2] += excavationDustVelocity3d[dustUpdateIndex3d * 3 + 2];
          excavationDustVelocity3d[dustUpdateIndex3d * 3] *= 0.96;
          excavationDustVelocity3d[dustUpdateIndex3d * 3 + 1] *= 0.95;
          excavationDustVelocity3d[dustUpdateIndex3d * 3 + 2] *= 0.96;
        }
        for (var chipUpdateIndex3d = 0; chipUpdateIndex3d < excavationChipCount3d; chipUpdateIndex3d++) {
          excavationChipPositions3d[chipUpdateIndex3d * 3] += excavationChipVelocity3d[chipUpdateIndex3d * 3];
          excavationChipPositions3d[chipUpdateIndex3d * 3 + 1] += excavationChipVelocity3d[chipUpdateIndex3d * 3 + 1];
          excavationChipPositions3d[chipUpdateIndex3d * 3 + 2] += excavationChipVelocity3d[chipUpdateIndex3d * 3 + 2];
          excavationChipVelocity3d[chipUpdateIndex3d * 3 + 1] -= 0.007;
          excavationChipVelocity3d[chipUpdateIndex3d * 3] *= 0.985;
          excavationChipVelocity3d[chipUpdateIndex3d * 3 + 2] *= 0.985;
        }
        excavationDustGeometry3d.attributes.position.needsUpdate = true;
        excavationChipGeometry3d.attributes.position.needsUpdate = true;
        excavationDustMaterial3d.opacity = excavationBurstLife3d * 0.46;
        excavationChipMaterial3d.opacity = Math.min(0.94, excavationBurstLife3d * 1.35);
      }
      if (excavationBurstLife3d <= 0) {
        excavationDustPoints3d.visible = false;
        excavationChipPoints3d.visible = false;
        excavationFlashBox3d.visible = false;
      }
    }
    var dummy = new THREE.Object3D(), col = new THREE.Color(), WHITE = new THREE.Color(0xffffff);
    var instanceToVoxel = [];
    var sliceZ = 0, excavate = false, highlightKey = null, focusLens = false, waterTableOn = false, showStage = 99;
    var hoverSourceGeo = new THREE.BoxGeometry(VOXEL * 1.04, VOXEL * 1.04, VOXEL * 1.04);
    var hoverBox = new THREE.LineSegments(new THREE.EdgesGeometry(hoverSourceGeo), new THREE.LineBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.85 }));
    hoverBox.visible = false; hoverBox.renderOrder = 2; scene.add(hoverBox);
    // Deployable directional core rig: an amber-and-cyan A-frame with a live
    // bore hologram, moving drill string, sample lights, and an illuminated trail.
    var coreRigGeometries3d = [], coreRigMaterials3d = [];
    function coreRigGeometry3d(geometry) { coreRigGeometries3d.push(geometry); return geometry; }
    function coreRigMaterial3d(material) { coreRigMaterials3d.push(material); return material; }
    function coreRigMesh3d(geometry, material, x, y, z, parent) {
      var mesh3d = new THREE.Mesh(coreRigGeometry3d(geometry), material);
      mesh3d.position.set(x || 0, y || 0, z || 0);
      mesh3d.castShadow = geologyHighDetail3d; mesh3d.receiveShadow = geologyHighDetail3d;
      (parent || coreRigGroup3d).add(mesh3d);
      return mesh3d;
    }
    function coreRigBeam3d(from3d, to3d, radius3d, material3d, parent3d) {
      var direction3d = new THREE.Vector3().subVectors(to3d, from3d);
      var beam3d = coreRigMesh3d(new THREE.CylinderGeometry(radius3d, radius3d, direction3d.length(), 8), material3d, 0, 0, 0, parent3d);
      beam3d.position.copy(from3d).add(to3d).multiplyScalar(0.5);
      beam3d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction3d.clone().normalize());
      return beam3d;
    }
    var coreRigMetalMat3d = coreRigMaterial3d(new THREE.MeshStandardMaterial({ color: 0x172234, roughness: 0.3, metalness: 0.88 }));
    var coreRigSteelMat3d = coreRigMaterial3d(new THREE.MeshStandardMaterial({ color: 0xb9c5d5, roughness: 0.2, metalness: 0.92 }));
    var coreRigAmberMat3d = coreRigMaterial3d(new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x7c2d12, emissiveIntensity: 0.42, roughness: 0.28, metalness: 0.72 }));
    var coreRigCyanMat3d = coreRigMaterial3d(new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.84, blending: THREE.AdditiveBlending, depthWrite: false }));
    var coreRigBoreMat3d = coreRigMaterial3d(new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    var coreRigGuideMat3d = coreRigMaterial3d(new THREE.LineDashedMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.8, dashSize: VOXEL * 0.28, gapSize: VOXEL * 0.2, depthTest: false, depthWrite: false }));
    var coreRigGroup3d = new THREE.Group(), coreRigAssembly3d = new THREE.Group(), coreRigBoreGroup3d = new THREE.Group();
    var coreRigState3d = {
      deployed: false, running: false, stage: 'packed', angle: 'vertical', depth: CORE_RIG_DEPTHS[1],
      origin: null, yaw: 0, path: [], cursor: 0, samples: [], heat: 0, progress: 0,
      feedMode: 'cruise', coolantRemaining: 2, coolantUsed: 0, formationLoad: null, idealFeedMode: 'cruise',
      intervalStress: 0, intervalPeakHeat: 0, pristineStreak: 0, bestPristineStreak: 0,
      currentCell: null, currentVoxel: null, currentElapsed: 0, currentDuration: 0,
      stopReason: null, plannedStop: null, trajectoryScan: null, status: 'Pack ready', lastHudAt: 0, evaluation: null,
      deployedAt: 0, celebrateUntil: 0, coolantFlashUntil: 0, scanUntil: 0, lastIntervalResult: null
    };
    coreRigGroup3d.name = 'directional-core-rig';
    coreRigGroup3d.visible = false;
    coreRigGroup3d.add(coreRigAssembly3d); coreRigGroup3d.add(coreRigBoreGroup3d);
    scene.add(coreRigGroup3d);
    var rigUnit3d = Math.max(0.72, VOXEL * 0.78);
    // broad skids and four amber stabilizers make the deployed footprint legible.
    coreRigMesh3d(new THREE.BoxGeometry(rigUnit3d * 3.25, rigUnit3d * 0.2, rigUnit3d * 0.22), coreRigMetalMat3d, 0, rigUnit3d * 0.1, rigUnit3d * 1.08);
    coreRigMesh3d(new THREE.BoxGeometry(rigUnit3d * 3.25, rigUnit3d * 0.2, rigUnit3d * 0.22), coreRigMetalMat3d, 0, rigUnit3d * 0.1, -rigUnit3d * 1.08);
    coreRigMesh3d(new THREE.BoxGeometry(rigUnit3d * 2.55, rigUnit3d * 0.18, rigUnit3d * 1.82), coreRigSteelMat3d, 0, rigUnit3d * 0.25, 0);
    [[-1.38,-1.12],[1.38,-1.12],[-1.38,1.12],[1.38,1.12]].forEach(function (foot3d) {
      coreRigMesh3d(new THREE.CylinderGeometry(rigUnit3d * 0.22, rigUnit3d * 0.29, rigUnit3d * 0.32, 10), coreRigAmberMat3d, foot3d[0] * rigUnit3d, rigUnit3d * 0.18, foot3d[1] * rigUnit3d);
    });
    var mastLeftBottom3d = new THREE.Vector3(-rigUnit3d * 0.92, rigUnit3d * 0.38, rigUnit3d * 0.44);
    var mastRightBottom3d = new THREE.Vector3(rigUnit3d * 0.92, rigUnit3d * 0.38, rigUnit3d * 0.44);
    var mastTopLeft3d = new THREE.Vector3(-rigUnit3d * 0.28, rigUnit3d * 3.55, 0);
    var mastTopRight3d = new THREE.Vector3(rigUnit3d * 0.28, rigUnit3d * 3.55, 0);
    coreRigBeam3d(mastLeftBottom3d, mastTopLeft3d, rigUnit3d * 0.105, coreRigAmberMat3d, coreRigGroup3d);
    coreRigBeam3d(mastRightBottom3d, mastTopRight3d, rigUnit3d * 0.105, coreRigAmberMat3d, coreRigGroup3d);
    coreRigBeam3d(new THREE.Vector3(-rigUnit3d * 0.92, rigUnit3d * 0.38, -rigUnit3d * 0.44), mastTopLeft3d, rigUnit3d * 0.075, coreRigMetalMat3d, coreRigGroup3d);
    coreRigBeam3d(new THREE.Vector3(rigUnit3d * 0.92, rigUnit3d * 0.38, -rigUnit3d * 0.44), mastTopRight3d, rigUnit3d * 0.075, coreRigMetalMat3d, coreRigGroup3d);
    coreRigBeam3d(mastTopLeft3d, mastTopRight3d, rigUnit3d * 0.09, coreRigSteelMat3d, coreRigGroup3d);
    var coreRigMotor3d = coreRigMesh3d(new THREE.CylinderGeometry(rigUnit3d * 0.34, rigUnit3d * 0.42, rigUnit3d * 0.76, 12), coreRigAmberMat3d, 0, 0, 0, coreRigAssembly3d);
    coreRigMotor3d.rotation.z = Math.PI * 0.5;
    var coreRigRotor3d = coreRigMesh3d(new THREE.TorusGeometry(rigUnit3d * 0.47, rigUnit3d * 0.07, 6, 18), coreRigCyanMat3d, 0, 0, 0, coreRigAssembly3d);
    coreRigRotor3d.rotation.y = Math.PI * 0.5;
    var coreRigShaft3d = coreRigMesh3d(new THREE.CylinderGeometry(rigUnit3d * 0.095, rigUnit3d * 0.095, rigUnit3d * 2.6, 10), coreRigSteelMat3d, 0, -rigUnit3d * 1.45, 0, coreRigAssembly3d);
    var coreRigBit3d = coreRigMesh3d(new THREE.ConeGeometry(rigUnit3d * 0.24, rigUnit3d * 0.58, 10), coreRigAmberMat3d, 0, -rigUnit3d * 3.04, 0, coreRigAssembly3d);
    coreRigBit3d.rotation.z = Math.PI;
    coreRigAssembly3d.position.set(0, rigUnit3d * 3.0, 0);
    // Three indexed torque collars turn formation pressure into a readable mechanical load cue.
    // They reuse tracked rig resources and remain pooled for the lifetime of the explorer.
    var coreRigLoadCouplers3d = [], coreRigLoadCompression3d = 0;
    for (var loadCouplerIndex3d = 0; loadCouplerIndex3d < 3; loadCouplerIndex3d++) {
      var loadCoupler3d = new THREE.Group();
      loadCoupler3d.name = 'core-load-coupler-' + (loadCouplerIndex3d + 1);
      var loadCollar3d = new THREE.Mesh(coreRigRotor3d.geometry, coreRigAmberMat3d);
      loadCollar3d.rotation.x = Math.PI * 0.5;
      loadCollar3d.scale.setScalar(0.38);
      loadCollar3d.castShadow = false; loadCollar3d.receiveShadow = false;
      var loadIndexTooth3d = new THREE.Mesh(coreRigShaft3d.geometry, coreRigSteelMat3d);
      loadIndexTooth3d.scale.set(0.13, 0.07, 0.13);
      loadIndexTooth3d.position.x = rigUnit3d * 0.22;
      loadIndexTooth3d.rotation.z = Math.PI * 0.5;
      loadIndexTooth3d.castShadow = false; loadIndexTooth3d.receiveShadow = false;
      loadCoupler3d.add(loadCollar3d); loadCoupler3d.add(loadIndexTooth3d);
      loadCoupler3d.position.set(0, -rigUnit3d * (1.82 + loadCouplerIndex3d * 0.24), 0);
      loadCoupler3d.rotation.y = loadCouplerIndex3d * Math.PI * 0.66;
      coreRigAssembly3d.add(loadCoupler3d);
      coreRigLoadCouplers3d.push(loadCoupler3d);
    }
    var coreRigGuideGeo3d = coreRigGeometry3d(new THREE.BufferGeometry());
    var coreRigGuide3d = new THREE.Line(coreRigGuideGeo3d, coreRigGuideMat3d);
    coreRigGuide3d.renderOrder = 8; coreRigGroup3d.add(coreRigGuide3d);
    var coreRigTargetMat3d = coreRigMaterial3d(new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
    var coreRigPulseMat3d = coreRigMaterial3d(new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
    var coreRigTarget3d = coreRigMesh3d(new THREE.IcosahedronGeometry(rigUnit3d * 0.26, 1), coreRigTargetMat3d, 0, 0, 0);
    coreRigTarget3d.castShadow = false; coreRigTarget3d.receiveShadow = false; coreRigTarget3d.renderOrder = 9;
    var coreRigGuideStart3d = new THREE.Vector3(0, rigUnit3d * 0.34, 0), coreRigGuideEnd3d = coreRigGuideStart3d.clone();
    var coreRigPulseDirection3d = new THREE.Vector3(), coreRigPulseNormal3d = new THREE.Vector3(0, 0, 1);
    var coreRigPulseQuaternion3d = new THREE.Quaternion();
    var coreRigFeedGlow3d = coreRigMesh3d(new THREE.SphereGeometry(rigUnit3d * 0.18, 10, 8), coreRigTargetMat3d, 0, 0, 0);
    coreRigFeedGlow3d.castShadow = false; coreRigFeedGlow3d.receiveShadow = false; coreRigFeedGlow3d.renderOrder = 10; coreRigFeedGlow3d.visible = false;
    // This collar is a physical bit-face cue, so unlike the planning rings it obeys rock depth.
    var coreRigContactMat3d = coreRigMaterial3d(new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false }));
    var coreRigContact3d = coreRigMesh3d(new THREE.TorusGeometry(rigUnit3d * 0.23, rigUnit3d * 0.035, 6, 22), coreRigContactMat3d, 0, 0, 0);
    coreRigContact3d.castShadow = false; coreRigContact3d.receiveShadow = false; coreRigContact3d.renderOrder = 6; coreRigContact3d.visible = false;
    var coreRigPulseRings3d = [];
    for (var rigRingIndex3d = 0; rigRingIndex3d < 3; rigRingIndex3d++) {
      var pulseRing3d = coreRigMesh3d(new THREE.TorusGeometry(rigUnit3d * (0.46 + rigRingIndex3d * 0.16), rigUnit3d * 0.025, 5, 24), coreRigPulseMat3d, 0, rigUnit3d * 0.38, 0);
      pulseRing3d.rotation.x = Math.PI * 0.5; pulseRing3d.renderOrder = 8; pulseRing3d.visible = false;
      coreRigPulseRings3d.push(pulseRing3d);
    }
    // A spoiler-safe surface receiver makes every recovered interval physically legible.
    // Empty slots stay neutral; a slot only takes on a formation color after excavation succeeds.
    var CORE_RIG_GRADE_TONES_3D = { S: 0xc084fc, A: 0x22d3ee, B: 0x34d399, C: 0xfbbf24, D: 0xfb7185 };
    var coreRigAssemblyDirection3d = new THREE.Vector3();
    var coreRigReceiverGroup3d = new THREE.Group();
    coreRigReceiverGroup3d.name = 'core-recovery-surface-barrel';
    var coreRigReceiverRestY3d = rigUnit3d * 1.02;
    coreRigReceiverGroup3d.position.set(rigUnit3d * 1.02, coreRigReceiverRestY3d, rigUnit3d * 0.72);
    coreRigGroup3d.add(coreRigReceiverGroup3d);
    var coreRigReceiverGlassMat3d = coreRigMaterial3d(new THREE.MeshStandardMaterial({ color: 0x8be9f7, emissive: 0x164e63, emissiveIntensity: 0.16, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.16, depthWrite: false }));
    var coreRigReceiverSlotGeo3d = coreRigGeometry3d(new THREE.CylinderGeometry(rigUnit3d * 0.105, rigUnit3d * 0.105, rigUnit3d * 0.27, 8));
    var coreRigReceiverSlotCount3d = CORE_RIG_DEPTHS[CORE_RIG_DEPTHS.length - 1];
    coreRigMesh3d(new THREE.BoxGeometry(rigUnit3d * 1.52, rigUnit3d * 1.34, rigUnit3d * 0.16), coreRigReceiverGlassMat3d, 0, 0, 0, coreRigReceiverGroup3d).renderOrder = 5;
    coreRigBeam3d(new THREE.Vector3(-rigUnit3d * 0.82, -rigUnit3d * 0.72, 0), new THREE.Vector3(rigUnit3d * 0.82, -rigUnit3d * 0.72, 0), rigUnit3d * 0.045, coreRigSteelMat3d, coreRigReceiverGroup3d);
    coreRigBeam3d(new THREE.Vector3(-rigUnit3d * 0.82, rigUnit3d * 0.72, 0), new THREE.Vector3(rigUnit3d * 0.82, rigUnit3d * 0.72, 0), rigUnit3d * 0.045, coreRigSteelMat3d, coreRigReceiverGroup3d);
    coreRigBeam3d(new THREE.Vector3(-rigUnit3d * 0.82, -rigUnit3d * 0.72, 0), new THREE.Vector3(-rigUnit3d * 0.82, rigUnit3d * 0.72, 0), rigUnit3d * 0.045, coreRigAmberMat3d, coreRigReceiverGroup3d);
    coreRigBeam3d(new THREE.Vector3(rigUnit3d * 0.82, -rigUnit3d * 0.72, 0), new THREE.Vector3(rigUnit3d * 0.82, rigUnit3d * 0.72, 0), rigUnit3d * 0.045, coreRigAmberMat3d, coreRigReceiverGroup3d);
    var coreRigReceiverSlots3d = [];
    for (var receiverSlotIndex3d = 0; receiverSlotIndex3d < coreRigReceiverSlotCount3d; receiverSlotIndex3d++) {
      var receiverColumn3d = receiverSlotIndex3d % 4, receiverRow3d = Math.floor(receiverSlotIndex3d / 4);
      var receiverSlotMat3d = coreRigMaterial3d(new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x0f172a, emissiveIntensity: 0.12, roughness: 0.72, metalness: 0.22, transparent: true, opacity: 0.62 }));
      var receiverSlot3d = new THREE.Mesh(coreRigReceiverSlotGeo3d, receiverSlotMat3d);
      receiverSlot3d.position.set((receiverColumn3d - 1.5) * rigUnit3d * 0.37, (1 - receiverRow3d) * rigUnit3d * 0.42, rigUnit3d * 0.13);
      receiverSlot3d.rotation.z = Math.PI * 0.5;
      receiverSlot3d.castShadow = false; receiverSlot3d.receiveShadow = false; receiverSlot3d.renderOrder = 7;
      receiverSlot3d.userData.coreRigInterval = receiverSlotIndex3d + 1;
      coreRigReceiverGroup3d.add(receiverSlot3d); coreRigReceiverSlots3d.push(receiverSlot3d);
    }
    var coreRigReceiverNextMat3d = coreRigMaterial3d(new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
    var coreRigReceiverNext3d = coreRigMesh3d(new THREE.TorusGeometry(rigUnit3d * 0.17, rigUnit3d * 0.025, 5, 20), coreRigReceiverNextMat3d, 0, 0, rigUnit3d * 0.19, coreRigReceiverGroup3d);
    coreRigReceiverNext3d.castShadow = false; coreRigReceiverNext3d.receiveShadow = false; coreRigReceiverNext3d.renderOrder = 9;
    var coreRigLiftMat3d = coreRigMaterial3d(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, emissive: 0x475569, emissiveIntensity: 0.55, roughness: 0.28, metalness: 0.16, transparent: true, opacity: 0.96 }));
    var coreRigLiftMesh3d = coreRigMesh3d(new THREE.CylinderGeometry(rigUnit3d * 0.13, rigUnit3d * 0.13, rigUnit3d * 0.44, 10), coreRigLiftMat3d, 0, 0, 0, coreRigGroup3d);
    coreRigLiftMesh3d.visible = false; coreRigLiftMesh3d.castShadow = false; coreRigLiftMesh3d.receiveShadow = false; coreRigLiftMesh3d.renderOrder = 10;
    var coreRigLiftHaloMat3d = coreRigMaterial3d(new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
    var coreRigLiftHalo3d = coreRigMesh3d(new THREE.SphereGeometry(rigUnit3d * 0.25, 10, 8), coreRigLiftHaloMat3d, 0, 0, 0, coreRigGroup3d);
    coreRigLiftHalo3d.visible = false; coreRigLiftHalo3d.castShadow = false; coreRigLiftHalo3d.receiveShadow = false; coreRigLiftHalo3d.renderOrder = 9;
    // Reuse tracked rig resources for a visible winch: no extra geometry or material lifetime.
    var coreRigRecoveryPulley3d = new THREE.Group();
    coreRigRecoveryPulley3d.name = 'core-recovery-winch';
    coreRigRecoveryPulley3d.position.set(0, rigUnit3d * 3.18, rigUnit3d * 0.08);
    var coreRigRecoveryPulleyRim3d = new THREE.Mesh(coreRigRotor3d.geometry, coreRigSteelMat3d);
    coreRigRecoveryPulleyRim3d.scale.setScalar(0.42);
    coreRigRecoveryPulleyRim3d.castShadow = false; coreRigRecoveryPulleyRim3d.receiveShadow = false; coreRigRecoveryPulley3d.add(coreRigRecoveryPulleyRim3d);
    for (var pulleySpokeIndex3d = 0; pulleySpokeIndex3d < 2; pulleySpokeIndex3d++) {
      var pulleySpoke3d = new THREE.Mesh(coreRigShaft3d.geometry, coreRigSteelMat3d);
      pulleySpoke3d.scale.set(0.18, 0.16, 0.18); pulleySpoke3d.rotation.z = pulleySpokeIndex3d * Math.PI * 0.5;
      pulleySpoke3d.castShadow = false; pulleySpoke3d.receiveShadow = false; coreRigRecoveryPulley3d.add(pulleySpoke3d);
    }
    var coreRigRecoveryPulleyHub3d = new THREE.Mesh(coreRigMotor3d.geometry, coreRigAmberMat3d);
    coreRigRecoveryPulleyHub3d.scale.setScalar(0.16); coreRigRecoveryPulleyHub3d.rotation.x = Math.PI * 0.5;
    coreRigRecoveryPulleyHub3d.castShadow = false; coreRigRecoveryPulleyHub3d.receiveShadow = false; coreRigRecoveryPulley3d.add(coreRigRecoveryPulleyHub3d);
    coreRigGroup3d.add(coreRigRecoveryPulley3d);
    var coreRigRecoveryTether3d = new THREE.Mesh(coreRigShaft3d.geometry, coreRigSteelMat3d);
    coreRigRecoveryTether3d.name = 'core-recovery-tether'; coreRigRecoveryTether3d.visible = false;
    coreRigRecoveryTether3d.castShadow = false; coreRigRecoveryTether3d.receiveShadow = false; coreRigRecoveryTether3d.renderOrder = 9;
    coreRigRecoveryTether3d.scale.set(0.24, 1, 0.24); coreRigGroup3d.add(coreRigRecoveryTether3d);
    var coreRigRecoveryTetherVector3d = new THREE.Vector3(); var coreRigRecoveryPulleyProgress3d = 0;
    // A pooled wireline overshot visibly grips the core between the winch and barrel handoff.
    var coreRigRecoveryHead3d = new THREE.Group();
    coreRigRecoveryHead3d.name = 'core-recovery-overshot'; coreRigRecoveryHead3d.visible = false;
    var coreRigRecoveryHeadCollar3d = new THREE.Mesh(coreRigRotor3d.geometry, coreRigSteelMat3d);
    coreRigRecoveryHeadCollar3d.rotation.x = Math.PI * 0.5; coreRigRecoveryHeadCollar3d.scale.setScalar(0.34);
    coreRigRecoveryHeadCollar3d.castShadow = false; coreRigRecoveryHeadCollar3d.receiveShadow = false;
    var coreRigRecoveryHeadJawLeft3d = new THREE.Mesh(coreRigShaft3d.geometry, coreRigAmberMat3d);
    var coreRigRecoveryHeadJawRight3d = new THREE.Mesh(coreRigShaft3d.geometry, coreRigAmberMat3d);
    var coreRigRecoveryHeadJawClosed3d = rigUnit3d * 0.145, coreRigRecoveryHeadJawOpen3d = rigUnit3d * 0.215;
    coreRigRecoveryHeadJawLeft3d.scale.set(0.18, 0.075, 0.18); coreRigRecoveryHeadJawRight3d.scale.set(0.18, 0.075, 0.18);
    coreRigRecoveryHeadJawLeft3d.position.set(-coreRigRecoveryHeadJawOpen3d, -rigUnit3d * 0.11, 0);
    coreRigRecoveryHeadJawRight3d.position.set(coreRigRecoveryHeadJawOpen3d, -rigUnit3d * 0.11, 0);
    coreRigRecoveryHeadJawLeft3d.rotation.z = 0.26; coreRigRecoveryHeadJawRight3d.rotation.z = -0.26;
    coreRigRecoveryHeadJawLeft3d.castShadow = false; coreRigRecoveryHeadJawLeft3d.receiveShadow = false;
    coreRigRecoveryHeadJawRight3d.castShadow = false; coreRigRecoveryHeadJawRight3d.receiveShadow = false;
    coreRigRecoveryHead3d.add(coreRigRecoveryHeadCollar3d);
    coreRigRecoveryHead3d.add(coreRigRecoveryHeadJawLeft3d); coreRigRecoveryHead3d.add(coreRigRecoveryHeadJawRight3d);
    coreRigGroup3d.add(coreRigRecoveryHead3d);
    var coreRigRecoveryHeadOffset3d = new THREE.Vector3(0, rigUnit3d * 0.19, 0);
    var coreRigRecoveryHeadTransfer3d = new THREE.Vector3();
    var coreRigRecoveryHeadTransferQuaternion3d = new THREE.Quaternion();
    // A pooled spring clamp gives the surface barrel a physical catch at docking.
    var coreRigDockClamp3d = new THREE.Group();
    coreRigDockClamp3d.name = 'core-recovery-dock-clamp'; coreRigDockClamp3d.visible = false;
    var coreRigDockClampOpen3d = rigUnit3d * 0.23, coreRigDockClampClosed3d = rigUnit3d * 0.155;
    var coreRigDockClampTop3d = new THREE.Mesh(coreRigShaft3d.geometry, coreRigAmberMat3d);
    var coreRigDockClampBottom3d = new THREE.Mesh(coreRigShaft3d.geometry, coreRigAmberMat3d);
    coreRigDockClampTop3d.scale.set(0.32, 0.16, 0.32); coreRigDockClampBottom3d.scale.set(0.32, 0.16, 0.32);
    coreRigDockClampTop3d.castShadow = false; coreRigDockClampTop3d.receiveShadow = false;
    coreRigDockClampBottom3d.castShadow = false; coreRigDockClampBottom3d.receiveShadow = false;
    coreRigDockClamp3d.add(coreRigDockClampTop3d); coreRigDockClamp3d.add(coreRigDockClampBottom3d);
    coreRigReceiverGroup3d.add(coreRigDockClamp3d);
    var coreRigLiftState3d = { active: false, elapsed: 0, duration: 0.9, slotIndex: -1, sample: null, color: 0x67e8f9, dockFlashUntil: 0 };
    var coreRigLiftStart3d = new THREE.Vector3(), coreRigLiftTransfer3d = new THREE.Vector3(), coreRigLiftDock3d = new THREE.Vector3();
    var coreRigLiftWorld3d = new THREE.Vector3(), coreRigLiftDirection3d = new THREE.Vector3(0, 1, 0), coreRigLiftUp3d = new THREE.Vector3(0, 1, 0);
    var coreRigLiftStartQuaternion3d = new THREE.Quaternion(), coreRigLiftDockQuaternion3d = new THREE.Quaternion();
    var coreRigLight3d = new THREE.PointLight(0x22d3ee, 1.35, rigUnit3d * 7.5);
    coreRigLight3d.position.set(0, rigUnit3d * 2.8, 0); coreRigGroup3d.add(coreRigLight3d);
    try { renderer.domElement.dataset.geologyCoreRigRendering = 'animated-a-frame-directional-drill-and-core-trail';
      renderer.domElement.dataset.geologyCoreRecovery = 'spoiler-safe-lift-to-surface-barrel';
      renderer.domElement.dataset.geologyCorePulse = 'phase-aware-pooled-pressure-rings';
      renderer.domElement.dataset.geologyCoreContact = 'depth-tested-bit-pressure-collar';
      renderer.domElement.dataset.geologyCoreRecoveryMechanics = 'pooled-winch-tether-and-dock';
      renderer.domElement.dataset.geologyCoreRecoveryLatch = 'pooled-overshot-tension-and-release';
      renderer.domElement.dataset.geologyCoreDock = 'pooled-spring-clamp-catch';
      renderer.domElement.dataset.geologyCoreDrillLoadMechanics = 'pooled-torque-collars-and-axial-thrust'; } catch (coreRigDatasetError3d) {}
    // The optional Field Run survey pulse briefly reveals one nearby requested
    // specimen through overburden. It is a direction cue, not permanent x-ray vision.
    var surveySourceGeo = new THREE.BoxGeometry(VOXEL * 1.22, VOXEL * 1.22, VOXEL * 1.22);
    var surveyBox = new THREE.LineSegments(new THREE.EdgesGeometry(surveySourceGeo), new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
    var surveyUntil = 0, surveyVoxelKey = null, surveyLastAt = 0;
    surveyBox.visible = false; surveyBox.renderOrder = 5; scene.add(surveyBox);
    // A real block-face crack overlay gives progressive mining a spatial cue instead
    // of relying on the HUD bar alone. The same deterministic motif is stamped on
    // all six faces; drawRange reveals one stage at a time.
    var miningCrackPattern = [[-0.3,-0.08,-0.11,0.02],[-0.11,0.02,0.08,0.14],[0.08,0.14,0.29,0.04],[-0.11,0.02,-0.2,0.26],[-0.11,0.02,-0.02,-0.23],[-0.02,-0.23,0.19,-0.32],[0.08,0.14,0.18,0.32],[0.08,0.14,0.32,0.24]];
    var miningCrackFaces = [['x',1],['x',-1],['y',1],['y',-1],['z',1],['z',-1]], miningCrackPositions = [];
    function pushMiningCrackPoint(face, u, v) {
      var edge = VOXEL * 0.526, a = u * VOXEL, b = v * VOXEL;
      if (face[0] === 'x') miningCrackPositions.push(face[1] * edge, a, b);
      else if (face[0] === 'y') miningCrackPositions.push(a, face[1] * edge, b);
      else miningCrackPositions.push(a, b, face[1] * edge);
    }
    miningCrackPattern.forEach(function (segment) {
      miningCrackFaces.forEach(function (face) {
        pushMiningCrackPoint(face, segment[0], segment[1]); pushMiningCrackPoint(face, segment[2], segment[3]);
      });
    });
    var miningCrackGeometry = new THREE.BufferGeometry();
    miningCrackGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(miningCrackPositions), 3));
    miningCrackGeometry.setDrawRange(0, 0);
    var miningCrackMaterial = new THREE.LineBasicMaterial({ color: 0x2a160d, transparent: true, opacity: 0.82, depthTest: true, depthWrite: false });
    var miningCrackBox = new THREE.LineSegments(miningCrackGeometry, miningCrackMaterial);
    miningCrackBox.visible = false; miningCrackBox.renderOrder = 4; scene.add(miningCrackBox);
    var undoPreviewSourceGeo = new THREE.BoxGeometry(VOXEL * 1.1, VOXEL * 1.1, VOXEL * 1.1);
    var undoPreviewBox = new THREE.LineSegments(new THREE.EdgesGeometry(undoPreviewSourceGeo), new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }));
    var undoPreviewRequested = false, undoPreviewKey = null;
    undoPreviewBox.visible = false; undoPreviewBox.renderOrder = 3; scene.add(undoPreviewBox);
    var treeMeshes = [], lastHover = 0;
    function makeGeologyWaterTexture3d() {
      var waterCanvas3d = document.createElement('canvas');
      waterCanvas3d.width = 256; waterCanvas3d.height = 256;
      var waterContext3d = waterCanvas3d.getContext('2d');
      waterContext3d.fillStyle = '#dbeafe';
      waterContext3d.fillRect(0, 0, 256, 256);
      var waterRandom3d = geologyRandomFactory3d(geologyTextureSeed3d(SCENE.id + '-water'));
      for (var waterRippleIndex3d = 0; waterRippleIndex3d < 54; waterRippleIndex3d++) {
        var waterRippleX3d = waterRandom3d() * 256;
        var waterRippleY3d = waterRandom3d() * 256;
        var waterRippleRadius3d = 5 + waterRandom3d() * 27;
        waterContext3d.strokeStyle = 'rgba(255,255,255,' + (0.16 + waterRandom3d() * 0.26) + ')';
        waterContext3d.lineWidth = 0.7 + waterRandom3d() * 0.8;
        waterContext3d.beginPath();
        waterContext3d.ellipse(waterRippleX3d, waterRippleY3d,
          waterRippleRadius3d, waterRippleRadius3d * (0.18 + waterRandom3d() * 0.12),
          waterRandom3d() * 0.18 - 0.09, 0, Math.PI * 2);
        waterContext3d.stroke();
      }
      var waterTexture3d = new THREE.CanvasTexture(waterCanvas3d);
      waterTexture3d.wrapS = waterTexture3d.wrapT = THREE.RepeatWrapping;
      waterTexture3d.repeat.set(3.4, 3.4);
      waterTexture3d.minFilter = THREE.LinearMipmapLinearFilter;
      waterTexture3d.magFilter = THREE.LinearFilter;
      if (THREE.sRGBEncoding) waterTexture3d.encoding = THREE.sRGBEncoding;
      waterTexture3d.needsUpdate = true;
      return waterTexture3d;
    }
    function makeGeologyOceanMaskTexture3d() {
      var maskCanvas3d = document.createElement('canvas');
      maskCanvas3d.width = 256; maskCanvas3d.height = 16;
      var maskContext3d = maskCanvas3d.getContext('2d');
      var maskImage3d = maskContext3d.createImageData(256, 16);
      for (var maskX3d = 0; maskX3d < 256; maskX3d++) {
        var maskVoxelX3d = Math.max(0, Math.min(NX - 1, Math.round(maskX3d / 255 * (NX - 1))));
        for (var maskY3d = 0; maskY3d < 16; maskY3d++) {
          var maskVoxelZ3d = Math.max(0, Math.min(NZ - 1, Math.round(maskY3d / 15 * (NZ - 1))));
          var maskWater3d = SCENE.gen(maskVoxelX3d, 0, maskVoxelZ3d) === 'oceanWater' ? 255 : 0;
          var maskIndex3d = (maskY3d * 256 + maskX3d) * 4;
          maskImage3d.data[maskIndex3d] = maskWater3d;
          maskImage3d.data[maskIndex3d + 1] = maskWater3d;
          maskImage3d.data[maskIndex3d + 2] = maskWater3d;
          maskImage3d.data[maskIndex3d + 3] = 255;
        }
      }
      maskContext3d.putImageData(maskImage3d, 0, 0);
      var oceanMaskTexture3d = new THREE.CanvasTexture(maskCanvas3d);
      oceanMaskTexture3d.wrapS = oceanMaskTexture3d.wrapT = THREE.ClampToEdgeWrapping;
      oceanMaskTexture3d.minFilter = THREE.LinearFilter;
      oceanMaskTexture3d.magFilter = THREE.LinearFilter;
      oceanMaskTexture3d.generateMipmaps = false;
      oceanMaskTexture3d.needsUpdate = true;
      return oceanMaskTexture3d;
    }
    function makeGeologyCausticTexture3d() {
      var causticCanvas3d = document.createElement('canvas');
      causticCanvas3d.width = 256; causticCanvas3d.height = 256;
      var causticContext3d = causticCanvas3d.getContext('2d');
      var causticRandom3d = geologyRandomFactory3d(geologyTextureSeed3d(SCENE.id + '-caustics'));
      causticContext3d.clearRect(0, 0, 256, 256);
      causticContext3d.globalCompositeOperation = 'lighter';
      causticContext3d.lineCap = 'round';
      for (var causticBand3d = 0; causticBand3d < 18; causticBand3d++) {
        var causticPhase3d = causticRandom3d() * Math.PI * 2;
        causticContext3d.strokeStyle = 'rgba(226,250,255,' + (0.13 + causticRandom3d() * 0.14) + ')';
        causticContext3d.lineWidth = 0.65 + causticRandom3d() * 1.25;
        causticContext3d.beginPath();
        for (var causticX3d = -12; causticX3d <= 268; causticX3d += 7) {
          var causticY3d = causticBand3d * 15 +
            Math.sin(causticX3d * 0.055 + causticPhase3d) * (3.5 + causticRandom3d() * 2.4) +
            Math.sin(causticX3d * 0.12 - causticPhase3d * 0.6) * 1.8;
          if (causticX3d === -12) causticContext3d.moveTo(causticX3d, causticY3d);
          else causticContext3d.lineTo(causticX3d, causticY3d);
        }
        causticContext3d.stroke();
      }
      var causticTexture3d = new THREE.CanvasTexture(causticCanvas3d);
      causticTexture3d.wrapS = causticTexture3d.wrapT = THREE.RepeatWrapping;
      causticTexture3d.repeat.set(2.5, 2.5);
      causticTexture3d.minFilter = THREE.LinearMipmapLinearFilter;
      causticTexture3d.magFilter = THREE.LinearFilter;
      causticTexture3d.needsUpdate = true;
      return causticTexture3d;
    }
    var geologyWaterTexture3d = makeGeologyWaterTexture3d();
    var WATER_Y = ((NY - 1) / 2 - 1.8 * NY / 12) * VOXEL; // water table perched in the sandstone, above the shale (depth scales with detail)
    var waterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.w, WORLD.d),
      new THREE.MeshPhysicalMaterial({
        color: 0x60a5fa, map: geologyWaterTexture3d,
        transparent: true, opacity: 0.32,
        roughness: 0.08, metalness: 0.06,
        clearcoat: 0.96, clearcoatRoughness: 0.08,
        depthWrite: false, side: THREE.DoubleSide
      })
    );
    waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(0, WATER_Y, 0); waterMesh.visible = false; waterMesh.renderOrder = 1; scene.add(waterMesh);

    // ── Volcano: the EXTRUSIVE counterpart to the intrusive pluton (erupt() animates it) ──
    var surfTopY = ((NY - 1) / 2 + 0.5) * VOXEL;   // world Y of the ground surface
    var oceanScene3d = SCENE.id === 'subduction' || SCENE.id === 'ridge' || SCENE.id === 'hotspot';
    var geologyOceanMaskTexture3d = oceanScene3d ? makeGeologyOceanMaskTexture3d() : null;
    var geologyCausticTexture3d = oceanScene3d ? makeGeologyCausticTexture3d() : null;
    var oceanSurfaceMesh3d = null;
    var oceanSurfaceGeometry3d = null;
    var oceanSurfaceBasePositions3d = null;
    var oceanCausticMesh3d = null;
    if (oceanScene3d) {
      oceanSurfaceGeometry3d = new THREE.PlaneGeometry(
        WORLD.w,
        WORLD.d,
        geologyHighDetail3d ? 30 : 16,
        geologyHighDetail3d ? 22 : 10
      );
      oceanSurfaceBasePositions3d = new Float32Array(oceanSurfaceGeometry3d.attributes.position.array);
      oceanSurfaceMesh3d = new THREE.Mesh(
        oceanSurfaceGeometry3d,
        new THREE.MeshPhysicalMaterial({
          color: SCENE.id === 'ridge' ? 0x38bdf8 : 0x2563eb,
          map: geologyWaterTexture3d,
          alphaMap: geologyOceanMaskTexture3d,
          transparent: true, opacity: 0.34,
          roughness: 0.06, metalness: 0.08,
          clearcoat: 1, clearcoatRoughness: 0.045,
          depthWrite: false, side: THREE.DoubleSide
        })
      );
      oceanSurfaceMesh3d.rotation.x = -Math.PI / 2;
      oceanSurfaceMesh3d.position.set(0, surfTopY + 0.035, 0);
      oceanSurfaceMesh3d.renderOrder = 1;
      scene.add(oceanSurfaceMesh3d);
      oceanCausticMesh3d = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.w, WORLD.d),
        new THREE.MeshBasicMaterial({
          color: 0xa5f3fc,
          map: geologyCausticTexture3d,
          alphaMap: geologyOceanMaskTexture3d,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        })
      );
      oceanCausticMesh3d.rotation.x = -Math.PI / 2;
      oceanCausticMesh3d.position.set(0, surfTopY + 0.055, 0);
      oceanCausticMesh3d.renderOrder = 2;
      scene.add(oceanCausticMesh3d);
      cnv.dataset.geologyWaterRendering = 'masked-clearcoat-ocean-surface';
      cnv.dataset.geologyWaterMotionRendering = 'segmented-wave-displacement-and-caustic-depth-cues';
    } else {
      cnv.dataset.geologyWaterRendering = 'reflective-groundwater-plane';
      cnv.dataset.geologyWaterMotionRendering = 'subsurface-ripple-drift';
    }

    // Scene-native relief gives the flat voxel surface the landforms students
    // expect to connect with each tectonic process.
    var geologyLandformGroup3d = new THREE.Group();
    var geologyLandformMeshes3d = [];
    var geologyLandformGeometries3d = [];
    var geologyLandformMaterials3d = [];
    var geologyFoamMeshes3d = [];
    var geologySurfaceEffectGeometries3d = [];
    var geologySurfaceEffectMaterials3d = [];
    var geologyBathymetryMeshes3d = [];
    var geologyHydrothermalGroup3d = new THREE.Group();
    var geologyHydrothermalMeshes3d = [];
    var geologyHydrothermalGeometries3d = [];
    var geologyHydrothermalMaterials3d = [];
    var geologyHydrothermalMeta3d = null;
    var geologyHydrothermalPlumeGeometry3d = null;
    var geologyHydrothermalPlumeMaterial3d = null;
    var geologyHydrothermalPlumePositions3d = null;
    var geologyHydrothermalPlumeOrigins3d = null;
    var geologyHydrothermalPlumePhases3d = null;
    scene.add(geologyLandformGroup3d);
    scene.add(geologyHydrothermalGroup3d);
    function registerGeologyLandform3d(mesh3d, surfaceZ3d, radius3d, cutawayPlane3d) {
      mesh3d.userData.geologySurfaceZ = Number(surfaceZ3d) || 0;
      mesh3d.userData.geologyRadius = Number(radius3d) || 0;
      mesh3d.userData.geologyCutawayPlane = !!cutawayPlane3d;
      geologyLandformGroup3d.add(mesh3d);
      geologyLandformMeshes3d.push(mesh3d);
      return mesh3d;
    }
    function addRuggedGeologyCone3d(x3d, z3d, radius3d, height3d, color3d, seed3d, landformStyle3d, baseY3d) {
      var isShieldIsland3d = landformStyle3d === 'shield-island';
      var isAlpine3d = landformStyle3d === 'alpine';           // sharp horn, no crater, snow above the tree line
      var summitRadius3d = radius3d * (isShieldIsland3d ? 0.17 : (isAlpine3d ? 0.05 : 0.12));
      var landformGeometry3d = new THREE.CylinderGeometry(
        summitRadius3d,
        radius3d,
        height3d,
        geologyHighDetail3d ? 40 : 28,
        geologyHighDetail3d ? 8 : 6,
        false
      );
      var landformPositions3d = landformGeometry3d.attributes.position;
      var landformVertexColors3d = new Float32Array(landformPositions3d.count * 3);
      var landformBaseColor3d = new THREE.Color(color3d);
      var landformLowColor3d = landformBaseColor3d.clone().multiplyScalar(isShieldIsland3d ? 0.62 : 0.68);
      var landformMidColor3d = landformBaseColor3d.clone().lerp(
        new THREE.Color(isShieldIsland3d ? 0x335d43 : (isAlpine3d ? 0x6e7078 : 0x75584c)),
        isShieldIsland3d ? 0.58 : (isAlpine3d ? 0.7 : 0.42)
      );
      var landformHighColor3d = landformBaseColor3d.clone().lerp(
        new THREE.Color(isShieldIsland3d ? 0x887b67 : (isAlpine3d ? 0xf5f8fc : 0x9a8175)),
        isAlpine3d ? 0.96 : 0.68
      );
      for (var landformVertex3d = 0; landformVertex3d < landformPositions3d.count; landformVertex3d++) {
        var landformX3d = landformPositions3d.getX(landformVertex3d);
        var landformY3d = landformPositions3d.getY(landformVertex3d);
        var landformZ3d = landformPositions3d.getZ(landformVertex3d);
        var landformAngle3d = Math.atan2(landformZ3d, landformX3d);
        var landformHeightRatio3d = Math.max(0, Math.min(1, (landformY3d + height3d * 0.5) / height3d));
        var landformRoughness3d = 1 + Math.sin(landformAngle3d * 5 + seed3d) * (isShieldIsland3d ? 0.082 : 0.058) +
          Math.sin(landformAngle3d * 11 - seed3d * 0.7) * (isShieldIsland3d ? 0.038 : 0.026) +
          Math.sin(landformAngle3d * 3 + seed3d * 1.7) * (1 - landformHeightRatio3d) * 0.035;
        var landformAsymmetryX3d = isShieldIsland3d ? 1.08 : 1.02;
        var landformAsymmetryZ3d = isShieldIsland3d ? 0.93 : 0.98;
        landformX3d *= landformRoughness3d * landformAsymmetryX3d;
        landformZ3d *= landformRoughness3d * landformAsymmetryZ3d;
        var landformRadial3d = Math.sqrt(landformX3d * landformX3d + landformZ3d * landformZ3d);
        if (isAlpine3d && landformY3d > height3d * 0.485) {
          landformY3d = height3d * 0.5 + Math.sin(landformAngle3d * 2 + seed3d) * height3d * 0.012;   // keep the horn sharp
        } else if (landformY3d > height3d * 0.485) {
          var calderaRatio3d = Math.min(1, landformRadial3d / (summitRadius3d * 1.04));
          landformY3d = height3d * 0.5 - height3d * (isShieldIsland3d ? 0.085 : 0.105) *
            Math.pow(1 - calderaRatio3d, 1.35);
        } else if (Math.abs(landformY3d) < height3d * 0.44) {
          landformY3d += Math.sin(landformAngle3d * 3 + seed3d + landformHeightRatio3d * 4.2) *
            height3d * (isShieldIsland3d ? 0.028 : 0.02) * (0.45 + landformHeightRatio3d);
        }
        landformPositions3d.setXYZ(landformVertex3d, landformX3d, landformY3d, landformZ3d);
        var terrainColorRatio3d = Math.max(0, Math.min(1, (landformY3d + height3d * 0.5) / height3d));
        var snowLine3d = isAlpine3d ? 0.66 + Math.sin(landformAngle3d * 4 + seed3d) * 0.05 : 0.58;   // ragged snow line
        var landformVertexColor3d = terrainColorRatio3d < snowLine3d
          ? landformLowColor3d.clone().lerp(landformMidColor3d, terrainColorRatio3d / snowLine3d)
          : landformMidColor3d.clone().lerp(landformHighColor3d, isAlpine3d
            ? Math.min(1, (terrainColorRatio3d - snowLine3d) / 0.12)
            : (terrainColorRatio3d - snowLine3d) / (1 - snowLine3d));
        landformVertexColor3d.multiplyScalar(0.92 + Math.sin(landformAngle3d * 7 + seed3d) * 0.035);
        landformVertexColors3d[landformVertex3d * 3] = landformVertexColor3d.r;
        landformVertexColors3d[landformVertex3d * 3 + 1] = landformVertexColor3d.g;
        landformVertexColors3d[landformVertex3d * 3 + 2] = landformVertexColor3d.b;
      }
      landformGeometry3d.setAttribute('color', new THREE.BufferAttribute(landformVertexColors3d, 3));
      landformGeometry3d.computeVertexNormals();
      var landformMaterial3d = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        map: rockSurfaceTexture3d,
        bumpMap: rockSurfaceTexture3d,
        bumpScale: isShieldIsland3d ? 0.052 : 0.043,
        roughness: isShieldIsland3d ? 0.96 : 0.91,
        metalness: 0.025
      });
      var landformMesh3d = new THREE.Mesh(landformGeometry3d, landformMaterial3d);
      landformMesh3d.position.set(x3d, (baseY3d == null ? surfTopY : baseY3d) + height3d * 0.5 + 0.025, z3d);
      landformMesh3d.castShadow = geologyHighDetail3d;
      landformMesh3d.receiveShadow = geologyHighDetail3d;
      geologyLandformGeometries3d.push(landformGeometry3d);
      geologyLandformMaterials3d.push(landformMaterial3d);
      return registerGeologyLandform3d(landformMesh3d, z3d, radius3d, false);
    }
    function addGeologySurfaceStrip3d(x3d, width3d, color3d, emissive3d, opacity3d) {
      var stripGeometry3d = new THREE.PlaneGeometry(width3d, WORLD.d * 0.94);
      var stripMaterial3d = new THREE.MeshStandardMaterial({
        color: color3d,
        emissive: emissive3d || 0x000000,
        emissiveIntensity: emissive3d ? 0.32 : 0,
        roughness: 0.28,
        metalness: 0.08,
        transparent: true,
        opacity: opacity3d,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      var stripMesh3d = new THREE.Mesh(stripGeometry3d, stripMaterial3d);
      stripMesh3d.rotation.x = -Math.PI / 2;
      stripMesh3d.position.set(x3d, surfTopY + 0.065, 0);
      stripMesh3d.renderOrder = 2;
      geologyLandformGeometries3d.push(stripGeometry3d);
      geologyLandformMaterials3d.push(stripMaterial3d);
      return registerGeologyLandform3d(stripMesh3d, 0, width3d * 0.5, true);
    }
    function addGeologyTectonicBathymetry3d(kind3d, x3d, width3d, seed3d) {
      var bathymetryGeometry3d = new THREE.PlaneGeometry(
        width3d,
        WORLD.d * 0.94,
        geologyHighDetail3d ? 38 : 22,
        geologyHighDetail3d ? 36 : 20
      );
      var bathymetryPositions3d = bathymetryGeometry3d.attributes.position;
      var bathymetryColors3d = new Float32Array(bathymetryPositions3d.count * 3);
      var bathymetryLowColor3d = new THREE.Color(kind3d === 'ridge' ? 0x162f35 : 0x102735);
      var bathymetryMidColor3d = new THREE.Color(kind3d === 'ridge' ? 0x28504e : 0x2d4651);
      var bathymetryHighColor3d = new THREE.Color(kind3d === 'ridge' ? 0x4f7166 : 0x58656a);
      for (var bathymetryVertex3d = 0; bathymetryVertex3d < bathymetryPositions3d.count; bathymetryVertex3d++) {
        var bathymetryX3d = bathymetryPositions3d.getX(bathymetryVertex3d);
        var bathymetryY3d = bathymetryPositions3d.getY(bathymetryVertex3d);
        var bathymetryAbsX3d = Math.abs(bathymetryX3d);
        var bathymetryEdge3d = Math.max(0, 1 - bathymetryAbsX3d / (width3d * 0.5));
        var bathymetryRoughness3d =
          Math.sin(bathymetryY3d * 1.45 + seed3d) * 0.024 +
          Math.sin(bathymetryY3d * 3.1 - seed3d * 0.6 + bathymetryX3d * 1.8) * 0.012;
        var bathymetryHeight3d;
        var bathymetryColorRatio3d;
        if (kind3d === 'ridge') {
          var ridgeBroad3d = Math.exp(-Math.pow(bathymetryX3d / 1.85, 2)) * 0.28;
          var ridgeRift3d = Math.exp(-Math.pow(bathymetryX3d / 0.29, 2)) * 0.23;
          bathymetryHeight3d = (ridgeBroad3d - ridgeRift3d - 0.018 + bathymetryRoughness3d * (0.55 + ridgeBroad3d * 2.1)) * bathymetryEdge3d;
          bathymetryColorRatio3d = Math.max(0, Math.min(1, bathymetryHeight3d / 0.24));
          if (bathymetryAbsX3d < 0.33) bathymetryColorRatio3d *= 0.2;
        } else {
          var trenchShoulder3d = Math.exp(-Math.pow((bathymetryAbsX3d - width3d * 0.28) / (width3d * 0.15), 2)) * 0.18;
          var trenchChannel3d = Math.exp(-Math.pow(bathymetryX3d / (width3d * 0.13), 2)) * 0.09;
          bathymetryHeight3d = (0.08 + trenchShoulder3d - trenchChannel3d + bathymetryRoughness3d * 0.45) * bathymetryEdge3d;
          bathymetryColorRatio3d = Math.max(0, Math.min(1, (bathymetryHeight3d + 0.01) / 0.17));
          if (bathymetryAbsX3d < width3d * 0.16) bathymetryColorRatio3d *= 0.16;
        }
        bathymetryPositions3d.setZ(bathymetryVertex3d, bathymetryHeight3d);
        var bathymetryColor3d = bathymetryColorRatio3d < 0.56
          ? bathymetryLowColor3d.clone().lerp(bathymetryMidColor3d, bathymetryColorRatio3d / 0.56)
          : bathymetryMidColor3d.clone().lerp(bathymetryHighColor3d, (bathymetryColorRatio3d - 0.56) / 0.44);
        bathymetryColors3d[bathymetryVertex3d * 3] = bathymetryColor3d.r;
        bathymetryColors3d[bathymetryVertex3d * 3 + 1] = bathymetryColor3d.g;
        bathymetryColors3d[bathymetryVertex3d * 3 + 2] = bathymetryColor3d.b;
      }
      bathymetryGeometry3d.setAttribute('color', new THREE.BufferAttribute(bathymetryColors3d, 3));
      bathymetryGeometry3d.computeVertexNormals();
      var bathymetryMaterial3d = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        map: rockSurfaceTexture3d,
        bumpMap: rockSurfaceTexture3d,
        bumpScale: 0.045,
        roughness: 0.91,
        metalness: 0.025,
        side: THREE.DoubleSide
      });
      var bathymetryMesh3d = new THREE.Mesh(bathymetryGeometry3d, bathymetryMaterial3d);
      bathymetryMesh3d.rotation.x = -Math.PI / 2;
      bathymetryMesh3d.position.set(x3d, surfTopY + (kind3d === 'ridge' ? 0.02 : 0.035), 0);
      bathymetryMesh3d.castShadow = geologyHighDetail3d;
      bathymetryMesh3d.receiveShadow = geologyHighDetail3d;
      bathymetryMesh3d.renderOrder = 1;
      geologyLandformGeometries3d.push(bathymetryGeometry3d);
      geologyLandformMaterials3d.push(bathymetryMaterial3d);
      geologyBathymetryMeshes3d.push(bathymetryMesh3d);
      return registerGeologyLandform3d(bathymetryMesh3d, 0, width3d * 0.5, true);
    }
    function addGeologyFoamRibbon3d(x3d, seed3d) {
      var foamGeometry3d = new THREE.PlaneGeometry(
        0.18,
        WORLD.d * 0.94,
        2,
        geologyHighDetail3d ? 38 : 20
      );
      var foamPositions3d = foamGeometry3d.attributes.position;
      for (var foamVertex3d = 0; foamVertex3d < foamPositions3d.count; foamVertex3d++) {
        var foamLocalX3d = foamPositions3d.getX(foamVertex3d);
        var foamLocalY3d = foamPositions3d.getY(foamVertex3d);
        foamPositions3d.setX(
          foamVertex3d,
          foamLocalX3d + Math.sin(foamLocalY3d * 1.55 + seed3d) * 0.075 +
            Math.sin(foamLocalY3d * 3.8 - seed3d) * 0.026
        );
      }
      var foamMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xd8fbff,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      var foamMesh3d = new THREE.Mesh(foamGeometry3d, foamMaterial3d);
      foamMesh3d.rotation.x = -Math.PI / 2;
      foamMesh3d.position.set(x3d, surfTopY + 0.09, 0);
      foamMesh3d.renderOrder = 4;
      foamMesh3d.userData.geologySurfaceZ = 0;
      foamMesh3d.userData.geologyRadius = WORLD.d * 0.5;
      foamMesh3d.userData.geologyCutawayPlane = true;
      foamMesh3d.userData.geologyFoamKind = 'shore-ribbon';
      foamMesh3d.userData.geologyFoamPhase = seed3d;
      foamMesh3d.userData.geologyFoamBaseOpacity = foamMaterial3d.opacity;
      geologyLandformGroup3d.add(foamMesh3d);
      geologyFoamMeshes3d.push(foamMesh3d);
      geologySurfaceEffectGeometries3d.push(foamGeometry3d);
      geologySurfaceEffectMaterials3d.push(foamMaterial3d);
      return foamMesh3d;
    }
    function addGeologyCoastRing3d(x3d, z3d, radius3d, seed3d) {
      var coastGeometry3d = new THREE.TorusGeometry(radius3d, 0.048, 6, geologyHighDetail3d ? 40 : 26);
      var coastPositions3d = coastGeometry3d.attributes.position;
      for (var coastVertex3d = 0; coastVertex3d < coastPositions3d.count; coastVertex3d++) {
        var coastX3d = coastPositions3d.getX(coastVertex3d);
        var coastY3d = coastPositions3d.getY(coastVertex3d);
        var coastAngle3d = Math.atan2(coastY3d, coastX3d);
        var coastVariation3d = 1 + Math.sin(coastAngle3d * 5 + seed3d) * 0.075 +
          Math.sin(coastAngle3d * 9 - seed3d * 0.6) * 0.032;
        coastPositions3d.setX(coastVertex3d, coastX3d * coastVariation3d * 1.08);
        coastPositions3d.setY(coastVertex3d, coastY3d * coastVariation3d * 0.93);
      }
      coastGeometry3d.computeVertexNormals();
      var coastMaterial3d = new THREE.MeshBasicMaterial({
        color: 0xa9eff7,
        transparent: true,
        opacity: 0.48,
        depthWrite: false
      });
      var coastMesh3d = new THREE.Mesh(coastGeometry3d, coastMaterial3d);
      coastMesh3d.rotation.x = Math.PI / 2;
      coastMesh3d.position.set(x3d, surfTopY + 0.085, z3d);
      coastMesh3d.renderOrder = 3;
      coastMesh3d.userData.geologyFoamKind = 'coast-ring';
      coastMesh3d.userData.geologyFoamPhase = seed3d;
      coastMesh3d.userData.geologyFoamBaseOpacity = coastMaterial3d.opacity;
      geologyLandformGeometries3d.push(coastGeometry3d);
      geologyLandformMaterials3d.push(coastMaterial3d);
      registerGeologyLandform3d(coastMesh3d, z3d, radius3d, false);
      geologyFoamMeshes3d.push(coastMesh3d);
      return coastMesh3d;
    }
    function addGeologyHydrothermalField3d(x3d, z3d, seed3d) {
      geologyHydrothermalMeta3d = { x: x3d, z: z3d, radius: 0.34, seed: seed3d };
      var chimneyGeometry3d = new THREE.CylinderGeometry(0.055, 0.12, 1, geologyHighDetail3d ? 9 : 7, 4, false);
      var chimneyPositions3d = chimneyGeometry3d.attributes.position;
      for (var chimneyVertex3d = 0; chimneyVertex3d < chimneyPositions3d.count; chimneyVertex3d++) {
        var chimneyX3d = chimneyPositions3d.getX(chimneyVertex3d);
        var chimneyY3d = chimneyPositions3d.getY(chimneyVertex3d);
        var chimneyZ3d = chimneyPositions3d.getZ(chimneyVertex3d);
        var chimneyAngle3d = Math.atan2(chimneyZ3d, chimneyX3d);
        var chimneyRoughness3d = 1 + Math.sin(chimneyAngle3d * 5 + chimneyY3d * 7 + seed3d) * 0.09;
        chimneyPositions3d.setX(chimneyVertex3d, chimneyX3d * chimneyRoughness3d);
        chimneyPositions3d.setZ(chimneyVertex3d, chimneyZ3d * chimneyRoughness3d);
      }
      chimneyGeometry3d.computeVertexNormals();
      var chimneyMaterial3d = new THREE.MeshStandardMaterial({
        color: 0x1a292b,
        emissive: 0x071719,
        emissiveIntensity: 0.12,
        map: rockSurfaceTexture3d,
        bumpMap: rockSurfaceTexture3d,
        bumpScale: 0.06,
        roughness: 0.96,
        metalness: 0.08
      });
      geologyHydrothermalGeometries3d.push(chimneyGeometry3d);
      geologyHydrothermalMaterials3d.push(chimneyMaterial3d);
      var chimneyOffsets3d = [[0, 0, 0.72], [-0.2, 0.08, 0.5], [0.18, -0.13, 0.58], [0.09, 0.2, 0.39]];
      var plumeSourceHeights3d = [];
      for (var chimneyIndex3d = 0; chimneyIndex3d < chimneyOffsets3d.length; chimneyIndex3d++) {
        var chimneyOffset3d = chimneyOffsets3d[chimneyIndex3d];
        var chimneyHeight3d = chimneyOffset3d[2];
        var chimneyMesh3d = new THREE.Mesh(chimneyGeometry3d, chimneyMaterial3d);
        chimneyMesh3d.scale.set(0.88 + chimneyIndex3d * 0.08, chimneyHeight3d, 0.9 + (chimneyIndex3d % 2) * 0.12);
        chimneyMesh3d.position.set(
          x3d + chimneyOffset3d[0],
          surfTopY + 0.07 + chimneyHeight3d * 0.5,
          z3d + chimneyOffset3d[1]
        );
        chimneyMesh3d.rotation.z = (chimneyIndex3d - 1.5) * 0.035;
        chimneyMesh3d.castShadow = geologyHighDetail3d;
        chimneyMesh3d.receiveShadow = geologyHighDetail3d;
        geologyHydrothermalGroup3d.add(chimneyMesh3d);
        geologyHydrothermalMeshes3d.push(chimneyMesh3d);
        plumeSourceHeights3d.push(surfTopY + 0.07 + chimneyHeight3d);
      }
      var hydrothermalPlumeCount3d = geologyHighDetail3d ? 42 : 22;
      geologyHydrothermalPlumePositions3d = new Float32Array(hydrothermalPlumeCount3d * 3);
      geologyHydrothermalPlumeOrigins3d = new Float32Array(hydrothermalPlumeCount3d * 3);
      geologyHydrothermalPlumePhases3d = new Float32Array(hydrothermalPlumeCount3d);
      var hydrothermalRandom3d = geologyRandomFactory3d(geologyTextureSeed3d(SCENE.id + '-black-smoker'));
      for (var plumeIndex3d = 0; plumeIndex3d < hydrothermalPlumeCount3d; plumeIndex3d++) {
        var plumeChimneyIndex3d = plumeIndex3d % chimneyOffsets3d.length;
        var plumeOriginX3d = x3d + chimneyOffsets3d[plumeChimneyIndex3d][0];
        var plumeOriginY3d = plumeSourceHeights3d[plumeChimneyIndex3d];
        var plumeOriginZ3d = z3d + chimneyOffsets3d[plumeChimneyIndex3d][1];
        geologyHydrothermalPlumeOrigins3d[plumeIndex3d * 3] = plumeOriginX3d;
        geologyHydrothermalPlumeOrigins3d[plumeIndex3d * 3 + 1] = plumeOriginY3d;
        geologyHydrothermalPlumeOrigins3d[plumeIndex3d * 3 + 2] = plumeOriginZ3d;
        geologyHydrothermalPlumePositions3d[plumeIndex3d * 3] = plumeOriginX3d;
        geologyHydrothermalPlumePositions3d[plumeIndex3d * 3 + 1] = plumeOriginY3d;
        geologyHydrothermalPlumePositions3d[plumeIndex3d * 3 + 2] = plumeOriginZ3d;
        geologyHydrothermalPlumePhases3d[plumeIndex3d] = hydrothermalRandom3d();
      }
      geologyHydrothermalPlumeGeometry3d = new THREE.BufferGeometry();
      geologyHydrothermalPlumeGeometry3d.setAttribute('position', new THREE.BufferAttribute(geologyHydrothermalPlumePositions3d, 3));
      geologyHydrothermalPlumeMaterial3d = new THREE.PointsMaterial({
        color: 0x53656c,
        map: geologyDustTexture3d,
        alphaTest: 0.006,
        size: geologyHighDetail3d ? 0.31 : 0.25,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      });
      var hydrothermalPlumePoints3d = new THREE.Points(geologyHydrothermalPlumeGeometry3d, geologyHydrothermalPlumeMaterial3d);
      hydrothermalPlumePoints3d.renderOrder = 5;
      geologyHydrothermalGroup3d.add(hydrothermalPlumePoints3d);
      geologyHydrothermalGeometries3d.push(geologyHydrothermalPlumeGeometry3d);
      geologyHydrothermalMaterials3d.push(geologyHydrothermalPlumeMaterial3d);
    }
    if (SCENE.id === 'subduction') {
      addGeologyTectonicBathymetry3d('trench', -2.75, 1.65, 2.1);
      addGeologySurfaceStrip3d(-2.75, 0.68, 0x12364b, 0x082f49, 0.78);
      addGeologyFoamRibbon3d(((0.3 * (NX - 1)) - (NX - 1) * 0.5) * VOXEL, 2.8);
      addRuggedGeologyCone3d(1.45, -3.05, 0.74, 0.82, 0x4e3e39, 1.1, 'volcanic-arc');
      addRuggedGeologyCone3d(1.38, -0.25, 0.9, 1.32, 0x483632, 2.4, 'volcanic-arc');
      addRuggedGeologyCone3d(1.48, 2.35, 0.76, 0.94, 0x544238, 3.7, 'volcanic-arc');
      cnv.dataset.geologyLandformRendering = 'trench-and-volcanic-arc-relief';
    } else if (SCENE.id === 'ridge') {
      addGeologyTectonicBathymetry3d('ridge', 0, WORLD.w * 0.68, 1.7);
      addGeologySurfaceStrip3d(0, 0.62, 0x0f766e, 0x14b8a6, 0.62);
      var ridgeMeltStrip3d = addGeologySurfaceStrip3d(0, 0.12, 0xf97316, 0xfb923c, 0.7);
      ridgeMeltStrip3d.position.y += 0.025;
      addGeologyHydrothermalField3d(1.55, 1.55, 4.2);
      cnv.dataset.geologyLandformRendering = 'luminous-rift-axis-relief';
    } else if (SCENE.id === 'hotspot') {
      addRuggedGeologyCone3d(2.75, 0.55, 1.72, 1.08, 0x274536, 1.6, 'shield-island');
      addGeologyCoastRing3d(2.75, 0.55, 1.52, 1.6);
      addRuggedGeologyCone3d(-0.55, -0.55, 1.18, 0.7, 0x344c3b, 3.2, 'shield-island');
      addGeologyCoastRing3d(-0.55, -0.55, 1.02, 3.2);
      addRuggedGeologyCone3d(-3.02, -1.38, 0.78, 0.4, 0x4c5442, 4.8, 'shield-island');
      addGeologyCoastRing3d(-3.02, -1.38, 0.67, 4.8);
      var hotspotCraterGeometry3d = new THREE.SphereGeometry(0.14, 12, 8);
      var hotspotCraterMaterial3d = new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.82 });
      var hotspotCrater3d = new THREE.Mesh(hotspotCraterGeometry3d, hotspotCraterMaterial3d);
      hotspotCrater3d.scale.set(1.5, 0.28, 1.5);
      hotspotCrater3d.position.set(2.75, surfTopY + 1.04, 0.55);
      hotspotCrater3d.renderOrder = 4;
      geologyLandformGeometries3d.push(hotspotCraterGeometry3d);
      geologyLandformMaterials3d.push(hotspotCraterMaterial3d);
      registerGeologyLandform3d(hotspotCrater3d, 0.55, 0.2, false);
      cnv.dataset.geologyLandformRendering = 'age-progressive-shield-island-relief';
    } else if (SCENE.id === 'collision') {
      // The voxel block already carries the topography; these horns break the z-uniform
      // ridge into peaks and put a snow line where the summit limestone sits.
      var collisionSurfaceY3d = function (fx3d) {
        var rowIndex3d = Math.max(0, Math.ceil(collisionTopo(fx3d) * (NY - 1) - 1e-6));
        return ((NY - 1) / 2 - rowIndex3d) * VOXEL + VOXEL * 0.5;
      };
      var summitX3d = (0.55 - 0.5) * WORLD.w, summitY3d = collisionSurfaceY3d(0.55);
      [[-5.1, 2.0, 1.45, 1.1], [-3.0, 1.55, 1.3, 2.3], [-0.85, 2.6, 1.75, 3.6], [1.35, 1.8, 1.4, 4.9], [3.45, 2.3, 1.62, 6.1], [5.35, 1.4, 1.2, 7.4]]
        .forEach(function (peak3d, peakIndex3d) {
          addRuggedGeologyCone3d(summitX3d + Math.sin(peak3d[3]) * 0.22, peak3d[0], peak3d[2], peak3d[1], 0x8b7355, peak3d[3], 'alpine', summitY3d - 0.12);
        });
      var foothillX3d = (0.42 - 0.5) * WORLD.w, foothillY3d = collisionSurfaceY3d(0.42);
      addRuggedGeologyCone3d(foothillX3d, -3.9, 1.25, 1.1, 0x7a6b5e, 8.3, 'alpine', foothillY3d - 0.1);
      addRuggedGeologyCone3d(foothillX3d + 0.2, 0.6, 1.4, 1.3, 0x76685c, 9.1, 'alpine', foothillY3d - 0.1);
      addRuggedGeologyCone3d(foothillX3d - 0.1, 4.2, 1.2, 1.0, 0x7d6d5f, 10.4, 'alpine', foothillY3d - 0.1);
      // Glacier tongues: flattened tubes that follow the voxel staircase from the snow
      // line down the steep face. Rivers of ice are how the range sheds its summit.
      var addGeologyGlacierTongue3d = function (z3d, seed3d, length3d) {
        var glacierPoints3d = [];
        var glacierSteps3d = Math.max(8, Math.round(length3d * (NX - 1) * 2));
        for (var glacierStep3d = 0; glacierStep3d <= glacierSteps3d; glacierStep3d++) {
          var glacierFx3d = 0.55 - (glacierStep3d / glacierSteps3d) * length3d;
          glacierPoints3d.push(new THREE.Vector3(
            (glacierFx3d - 0.5) * WORLD.w + Math.sin(glacierStep3d * 0.7 + seed3d) * 0.06,
            collisionSurfaceY3d(glacierFx3d) + 0.16,
            z3d + Math.sin(glacierStep3d * 0.5 + seed3d) * 0.2
          ));
        }
        var glacierCurve3d = new THREE.CatmullRomCurve3(glacierPoints3d);
        var glacierGeometry3d = new THREE.TubeGeometry(glacierCurve3d, geologyHighDetail3d ? 36 : 20, 0.36, geologyHighDetail3d ? 10 : 7, false);
        var glacierMaterial3d = new THREE.MeshStandardMaterial({
          color: 0x8fd0f4, emissive: 0x2f9fe0, emissiveIntensity: 0.55, roughness: 0.22, metalness: 0.05,
          transparent: true, opacity: 0.9
        });
        var glacierMesh3d = new THREE.Mesh(glacierGeometry3d, glacierMaterial3d);
        glacierMesh3d.renderOrder = 3;
        geologyLandformGeometries3d.push(glacierGeometry3d);
        geologyLandformMaterials3d.push(glacierMaterial3d);
        registerGeologyLandform3d(glacierMesh3d, z3d, 0.5, false);
      };
      addGeologyGlacierTongue3d(-2.1, 1.7, 0.24);
      addGeologyGlacierTongue3d(2.7, 4.1, 0.2);
      addGeologyGlacierTongue3d(0.4, 6.3, 0.17);
      // Foreland river: the range's meltwater and gravel collect along its foot and
      // flow parallel to the front, the way the Ganges runs beside the Himalaya.
      var riverPoints3d = [];
      for (var riverStep3d = 0; riverStep3d <= 10; riverStep3d++) {
        var riverT3d = riverStep3d / 10;
        riverPoints3d.push(new THREE.Vector3(
          (0.11 - 0.5) * WORLD.w + Math.sin(riverT3d * Math.PI * 2.6 + 0.4) * 0.7,
          collisionSurfaceY3d(0.11) + 0.05,
          -WORLD.d * 0.5 + riverT3d * WORLD.d
        ));
      }
      var riverGeometry3d = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPoints3d), geologyHighDetail3d ? 48 : 28, 0.11, 6, false);
      var riverMaterial3d = new THREE.MeshStandardMaterial({
        color: 0x2f7fc1, emissive: 0x1d4ed8, emissiveIntensity: 0.22, roughness: 0.2, metalness: 0.1,
        transparent: true, opacity: 0.92
      });
      var riverMesh3d = new THREE.Mesh(riverGeometry3d, riverMaterial3d);
      riverMesh3d.renderOrder = 3;
      geologyLandformGeometries3d.push(riverGeometry3d);
      geologyLandformMaterials3d.push(riverMaterial3d);
      // Spans the whole depth, so it can only stay honest while the block is uncut.
      registerGeologyLandform3d(riverMesh3d, WORLD.d * 0.5 - 0.01, 0, false);
      cnv.dataset.geologyLandformRendering = 'snow-capped-alpine-ridge-relief';
    } else {
      cnv.dataset.geologyLandformRendering = 'voxel-native-relief';
    }
    cnv.dataset.geologyLandformCount = String(geologyLandformMeshes3d.length);
    cnv.dataset.geologyBathymetryRendering = SCENE.id === 'ridge'
      ? 'sculpted-twin-ridge-shoulders-and-rift-valley'
      : (SCENE.id === 'subduction' ? 'sculpted-trench-shoulders-and-channel' : 'not-applicable');
    cnv.dataset.geologyBathymetryCount = String(geologyBathymetryMeshes3d.length);
    cnv.dataset.geologyHydrothermalRendering = geologyHydrothermalMeta3d
      ? 'rugged-black-smoker-chimneys-and-mineral-plume'
      : 'not-applicable';
    cnv.dataset.geologyHydrothermalCount = String(geologyHydrothermalMeshes3d.length);
    cnv.dataset.geologySurfaceEffectRendering = oceanScene3d
      ? (geologyFoamMeshes3d.length ? 'animated-wave-caustics-and-coastal-foam' : 'animated-wave-caustics')
      : 'ambient-surface-detail';
    cnv.dataset.geologySurfaceEffectCount = String(geologyFoamMeshes3d.length + (oceanCausticMesh3d ? 1 : 0));
    function updateGeologyLandformCutaway3d() {
      var landformFrontZ3d = WORLD.d * 0.5 - (Number(sliceZ) || 0) * VOXEL;
      geologyLandformMeshes3d.forEach(function (landformMesh3d) {
        if (landformMesh3d.userData.geologyCutawayPlane) {
          landformMesh3d.scale.y = (NZ - (Number(sliceZ) || 0)) / NZ;
          landformMesh3d.position.z = -(Number(sliceZ) || 0) * VOXEL * 0.5;
          landformMesh3d.visible = !focusLens;
        } else {
          landformMesh3d.visible = !focusLens &&
            landformMesh3d.userData.geologySurfaceZ < landformFrontZ3d + landformMesh3d.userData.geologyRadius * 0.18;
        }
      });
    }
    function updateGeologySurfaceEffects3d(time3d) {
      var surfaceEffectTime3d = reducedMotion3d ? 0.82 : time3d;
      var surfaceEffectFrontZ3d = WORLD.d * 0.5 - (Number(sliceZ) || 0) * VOXEL;
      geologyFoamMeshes3d.forEach(function (foamMesh3d) {
        var foamPulse3d = Math.sin(surfaceEffectTime3d * 1.45 + foamMesh3d.userData.geologyFoamPhase);
        if (foamMesh3d.userData.geologyCutawayPlane) {
          foamMesh3d.scale.x = 1 + foamPulse3d * 0.055;
          foamMesh3d.scale.y = (NZ - (Number(sliceZ) || 0)) / NZ;
          foamMesh3d.position.z = -(Number(sliceZ) || 0) * VOXEL * 0.5;
          foamMesh3d.visible = !focusLens;
        } else {
          var foamScale3d = 1 + foamPulse3d * 0.012;
          foamMesh3d.scale.set(foamScale3d, foamScale3d, 1);
          foamMesh3d.visible = !focusLens &&
            foamMesh3d.userData.geologySurfaceZ < surfaceEffectFrontZ3d + foamMesh3d.userData.geologyRadius * 0.18;
        }
        foamMesh3d.material.opacity = foamMesh3d.userData.geologyFoamBaseOpacity * (0.88 + foamPulse3d * 0.12);
      });
    }
    function updateGeologyHydrothermalField3d(time3d) {
      if (!geologyHydrothermalMeta3d || !geologyHydrothermalPlumeGeometry3d) return;
      var hydrothermalTime3d = reducedMotion3d ? 0.79 : time3d;
      var hydrothermalFrontZ3d = WORLD.d * 0.5 - (Number(sliceZ) || 0) * VOXEL;
      var hydrothermalVisible3d = !focusLens &&
        geologyHydrothermalMeta3d.z < hydrothermalFrontZ3d + geologyHydrothermalMeta3d.radius;
      geologyHydrothermalGroup3d.visible = hydrothermalVisible3d;
      if (!hydrothermalVisible3d) return;
      for (var hydrothermalIndex3d = 0; hydrothermalIndex3d < geologyHydrothermalPlumePhases3d.length; hydrothermalIndex3d++) {
        var hydrothermalProgress3d = (geologyHydrothermalPlumePhases3d[hydrothermalIndex3d] + hydrothermalTime3d * 0.042) % 1;
        var hydrothermalSpread3d = hydrothermalProgress3d * hydrothermalProgress3d;
        geologyHydrothermalPlumePositions3d[hydrothermalIndex3d * 3] =
          geologyHydrothermalPlumeOrigins3d[hydrothermalIndex3d * 3] +
          Math.sin(hydrothermalTime3d * 0.46 + hydrothermalIndex3d * 1.37) * 0.22 * hydrothermalSpread3d;
        geologyHydrothermalPlumePositions3d[hydrothermalIndex3d * 3 + 1] =
          geologyHydrothermalPlumeOrigins3d[hydrothermalIndex3d * 3 + 1] + hydrothermalProgress3d * 1.48;
        geologyHydrothermalPlumePositions3d[hydrothermalIndex3d * 3 + 2] =
          geologyHydrothermalPlumeOrigins3d[hydrothermalIndex3d * 3 + 2] +
          Math.cos(hydrothermalTime3d * 0.39 + hydrothermalIndex3d * 1.11) * 0.17 * hydrothermalSpread3d;
      }
      geologyHydrothermalPlumeGeometry3d.attributes.position.needsUpdate = true;
      geologyHydrothermalPlumeMaterial3d.opacity = reducedMotion3d
        ? 0.4 : 0.38 + Math.sin(time3d * 0.52) * 0.045;
    }
    var geologyVolcanicAtmosphereGroup3d = new THREE.Group();
    var geologyVolcanicVentRing3d = null;
    var geologyVolcanicVentMeta3d = null;
    var geologyVolcanicSteamSprites3d = [];
    var geologyVolcanicAtmosphereGeometries3d = [];
    var geologyVolcanicAtmosphereMaterials3d = [];
    scene.add(geologyVolcanicAtmosphereGroup3d);
    function addGeologyVolcanicAtmosphere3d(x3d, y3d, z3d, radius3d, color3d, seed3d) {
      geologyVolcanicVentMeta3d = { x: x3d, y: y3d, z: z3d, radius: radius3d, seed: seed3d };
      var ventRingGeometry3d = new THREE.TorusGeometry(radius3d, 0.025, 7, geologyHighDetail3d ? 28 : 18);
      var ventRingMaterial3d = new THREE.MeshBasicMaterial({
        color: color3d,
        transparent: true,
        opacity: 0.72,
        depthWrite: false
      });
      geologyVolcanicVentRing3d = new THREE.Mesh(ventRingGeometry3d, ventRingMaterial3d);
      geologyVolcanicVentRing3d.rotation.x = Math.PI / 2;
      geologyVolcanicVentRing3d.position.set(x3d, y3d + 0.018, z3d);
      geologyVolcanicVentRing3d.renderOrder = 6;
      geologyVolcanicAtmosphereGroup3d.add(geologyVolcanicVentRing3d);
      geologyVolcanicAtmosphereGeometries3d.push(ventRingGeometry3d);
      geologyVolcanicAtmosphereMaterials3d.push(ventRingMaterial3d);
      var steamCount3d = geologyHighDetail3d ? 9 : 5;
      for (var steamIndex3d = 0; steamIndex3d < steamCount3d; steamIndex3d++) {
        var steamMaterial3d = new THREE.SpriteMaterial({
          map: geologyDustTexture3d,
          color: steamIndex3d % 3 === 0 ? 0xc9d7dc : 0xe5f2f3,
          transparent: true,
          opacity: 0.12,
          depthWrite: false
        });
        var steamSprite3d = new THREE.Sprite(steamMaterial3d);
        steamSprite3d.userData.geologySteamPhase = (steamIndex3d / steamCount3d + seed3d * 0.071) % 1;
        steamSprite3d.userData.geologySteamBaseOpacity = 0.1 + (steamIndex3d % 4) * 0.018;
        steamSprite3d.position.set(x3d, y3d, z3d);
        geologyVolcanicAtmosphereGroup3d.add(steamSprite3d);
        geologyVolcanicSteamSprites3d.push(steamSprite3d);
        geologyVolcanicAtmosphereMaterials3d.push(steamMaterial3d);
      }
    }
    if (SCENE.id === 'subduction') {
      addGeologyVolcanicAtmosphere3d(1.38, surfTopY + 1.36, -0.25, 0.15, 0xffb45b, 2.4);
    } else if (SCENE.id === 'hotspot') {
      addGeologyVolcanicAtmosphere3d(2.75, surfTopY + 1.11, 0.55, 0.19, 0xff6a2a, 1.6);
    }
    var geologyAlpineCloudSprites3d = [];
    if (SCENE.id === 'collision') {
      var alpineCloudCount3d = geologyHighDetail3d ? 8 : 5;
      var alpineCloudBaseY3d = ((NY - 1) / 2 - Math.ceil(collisionTopo(0.55) * (NY - 1) - 1e-6)) * VOXEL + VOXEL * 0.5;
      for (var alpineCloudIndex3d = 0; alpineCloudIndex3d < alpineCloudCount3d; alpineCloudIndex3d++) {
        var alpineCloudMaterial3d = new THREE.SpriteMaterial({
          map: geologyDustTexture3d,
          color: alpineCloudIndex3d % 3 === 0 ? 0xe2e8f0 : 0xf8fafc,
          transparent: true,
          opacity: 0.2,
          depthWrite: false
        });
        var alpineCloudSprite3d = new THREE.Sprite(alpineCloudMaterial3d);
        alpineCloudSprite3d.userData.geologyCloudSeed = alpineCloudIndex3d * 1.91;
        alpineCloudSprite3d.userData.geologyCloudBaseX = (0.55 - 0.5) * WORLD.w + Math.sin(alpineCloudIndex3d * 2.3) * WORLD.w * 0.19;
        alpineCloudSprite3d.userData.geologyCloudBaseY = alpineCloudBaseY3d + 0.55 + (alpineCloudIndex3d % 4) * 0.28;
        alpineCloudSprite3d.userData.geologyCloudBaseZ = -WORLD.d * 0.42 + (alpineCloudIndex3d + 0.5) * (WORLD.d * 0.84 / alpineCloudCount3d);
        alpineCloudSprite3d.userData.geologyCloudBaseOpacity = 0.38 + (alpineCloudIndex3d % 3) * 0.06;
        alpineCloudSprite3d.scale.set(2.6 + (alpineCloudIndex3d % 3) * 0.9, 0.9 + (alpineCloudIndex3d % 2) * 0.3, 1);
        alpineCloudSprite3d.position.set(alpineCloudSprite3d.userData.geologyCloudBaseX, alpineCloudSprite3d.userData.geologyCloudBaseY, alpineCloudSprite3d.userData.geologyCloudBaseZ);
        alpineCloudSprite3d.renderOrder = 6;
        geologyVolcanicAtmosphereGroup3d.add(alpineCloudSprite3d);
        geologyVolcanicAtmosphereMaterials3d.push(alpineCloudMaterial3d);
        geologyAlpineCloudSprites3d.push(alpineCloudSprite3d);
      }
    }
    cnv.dataset.geologyAlpineCloudRendering = geologyAlpineCloudSprites3d.length ? 'drifting-summit-cloud-sprites' : 'not-applicable';
    cnv.dataset.geologyAlpineCloudCount = String(geologyAlpineCloudSprites3d.length);
    function updateGeologyAlpineClouds3d(time3d) {
      if (!geologyAlpineCloudSprites3d.length) return;
      var cloudTime3d = reducedMotion3d ? 0.61 : time3d;
      var cloudFrontZ3d = WORLD.d * 0.5 - (Number(sliceZ) || 0) * VOXEL;
      geologyAlpineCloudSprites3d.forEach(function (cloudSprite3d) {
        var cloudSeed3d = cloudSprite3d.userData.geologyCloudSeed;
        cloudSprite3d.visible = !focusLens && cloudSprite3d.userData.geologyCloudBaseZ < cloudFrontZ3d + 0.4;
        cloudSprite3d.position.set(
          cloudSprite3d.userData.geologyCloudBaseX + Math.sin(cloudTime3d * 0.09 + cloudSeed3d) * 0.55,
          cloudSprite3d.userData.geologyCloudBaseY + Math.sin(cloudTime3d * 0.17 + cloudSeed3d * 0.6) * 0.08,
          cloudSprite3d.userData.geologyCloudBaseZ
        );
        cloudSprite3d.material.opacity = cloudSprite3d.userData.geologyCloudBaseOpacity * (0.82 + Math.sin(cloudTime3d * 0.23 + cloudSeed3d) * 0.18);
      });
    }
    cnv.dataset.geologyVolcanicAtmosphereRendering = geologyVolcanicVentMeta3d
      ? 'animated-steam-plume-and-incandescent-crater-rim'
      : 'not-applicable';
    cnv.dataset.geologyVolcanicAtmosphereCount = String(geologyVolcanicSteamSprites3d.length);
    function updateGeologyVolcanicAtmosphere3d(time3d) {
      if (!geologyVolcanicVentMeta3d) return;
      var volcanicTime3d = reducedMotion3d ? 0.74 : time3d;
      var volcanicFrontZ3d = WORLD.d * 0.5 - (Number(sliceZ) || 0) * VOXEL;
      var volcanicVisible3d = !focusLens &&
        geologyVolcanicVentMeta3d.z < volcanicFrontZ3d + geologyVolcanicVentMeta3d.radius * 0.22;
      geologyVolcanicAtmosphereGroup3d.visible = volcanicVisible3d;
      if (!volcanicVisible3d) return;
      var ventPulse3d = Math.sin(volcanicTime3d * 1.18 + geologyVolcanicVentMeta3d.seed);
      var ventScale3d = 1 + ventPulse3d * 0.045;
      geologyVolcanicVentRing3d.scale.set(ventScale3d, ventScale3d, 1);
      geologyVolcanicVentRing3d.material.opacity = 0.64 + ventPulse3d * 0.1;
      geologyVolcanicSteamSprites3d.forEach(function (steamSprite3d, steamIndex3d) {
        var steamProgress3d = (steamSprite3d.userData.geologySteamPhase + volcanicTime3d * 0.036) % 1;
        var steamDrift3d = steamProgress3d * steamProgress3d;
        steamSprite3d.position.set(
          geologyVolcanicVentMeta3d.x + Math.sin(volcanicTime3d * 0.33 + steamIndex3d * 1.7) * 0.12 * steamDrift3d,
          geologyVolcanicVentMeta3d.y + 0.08 + steamProgress3d * 1.28,
          geologyVolcanicVentMeta3d.z + Math.cos(volcanicTime3d * 0.27 + steamIndex3d * 1.23) * 0.09 * steamDrift3d
        );
        var steamScale3d = 0.22 + steamProgress3d * 0.58;
        steamSprite3d.scale.set(steamScale3d * 1.18, steamScale3d, 1);
        steamSprite3d.material.opacity = steamSprite3d.userData.geologySteamBaseOpacity *
          Math.sin(Math.PI * Math.max(0.04, steamProgress3d));
      });
    }
    var oceanSurfaceNormalFrame3d = 0;
    function updateGeologyOceanSurface3d(time3d) {
      if (!oceanSurfaceMesh3d || !oceanSurfaceGeometry3d || !oceanSurfaceBasePositions3d) return;
      var oceanTime3d = reducedMotion3d ? 0.68 : time3d;
      var oceanPositions3d = oceanSurfaceGeometry3d.attributes.position;
      for (var oceanVertex3d = 0; oceanVertex3d < oceanPositions3d.count; oceanVertex3d++) {
        var oceanBaseX3d = oceanSurfaceBasePositions3d[oceanVertex3d * 3];
        var oceanBaseY3d = oceanSurfaceBasePositions3d[oceanVertex3d * 3 + 1];
        var oceanWaveHeight3d =
          Math.sin(oceanBaseX3d * 1.28 + oceanTime3d * 0.74) * 0.032 +
          Math.sin(oceanBaseY3d * 1.72 - oceanTime3d * 0.53) * 0.022 +
          Math.sin((oceanBaseX3d + oceanBaseY3d) * 0.82 + oceanTime3d * 0.39) * 0.014;
        oceanPositions3d.setZ(oceanVertex3d, oceanWaveHeight3d);
      }
      oceanPositions3d.needsUpdate = true;
      oceanSurfaceNormalFrame3d++;
      if (reducedMotion3d || oceanSurfaceNormalFrame3d % (geologyHighDetail3d ? 2 : 3) === 0) {
        oceanSurfaceGeometry3d.computeVertexNormals();
      }
      oceanSurfaceMesh3d.material.opacity = 0.32 + Math.sin(oceanTime3d * 1.18) * 0.035;
      if (oceanCausticMesh3d) {
        oceanCausticMesh3d.material.opacity = 0.14 + Math.sin(oceanTime3d * 0.76 + 0.7) * 0.035;
        geologyCausticTexture3d.offset.x = reducedMotion3d ? 0.08 : (time3d * -0.006) % 1;
        geologyCausticTexture3d.offset.y = reducedMotion3d ? 0.04 : (time3d * 0.008) % 1;
      }
    }
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
    var lavaMat = new THREE.PointsMaterial({ color: 0xff7326, map: geologyGlowTexture3d, alphaTest: 0.018, size: 0.42, transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending });
    var lavaPts = new THREE.Points(lavaGeo, lavaMat); lavaPts.visible = false; volcano.add(lavaPts);
    var ASH_N = 46, ashPos = new Float32Array(ASH_N * 3), ashVel = new Float32Array(ASH_N * 3);
    var ashGeo = new THREE.BufferGeometry(); ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    var ashMat = new THREE.PointsMaterial({ color: 0x6b6b73, map: geologyDustTexture3d, alphaTest: 0.008, size: 0.86, transparent: true, opacity: 0.0, depthWrite: false });
    var ashPts = new THREE.Points(ashGeo, ashMat); ashPts.visible = false; volcano.add(ashPts);
    scene.add(volcano);
    eng._volcanoDispose = [coneGeo, coneMat, craterGeo, craterMat, flowGeo, flowMat, lavaGeo, lavaMat, ashGeo, ashMat];
    function rnd() { return Math.random(); }
    function spawnLava(i) { lavaPos[i * 3] = (rnd() - 0.5) * 0.3; lavaPos[i * 3 + 1] = ventY - 0.1; lavaPos[i * 3 + 2] = (rnd() - 0.5) * 0.3; lavaVel[i * 3] = (rnd() - 0.5) * 0.17; lavaVel[i * 3 + 1] = 0.3 + rnd() * 0.36; lavaVel[i * 3 + 2] = (rnd() - 0.5) * 0.17; }
    function spawnAsh(i) { ashPos[i * 3] = (rnd() - 0.5) * 0.5; ashPos[i * 3 + 1] = ventY + rnd() * 0.5; ashPos[i * 3 + 2] = (rnd() - 0.5) * 0.5; ashVel[i * 3] = (rnd() - 0.5) * 0.06; ashVel[i * 3 + 1] = 0.07 + rnd() * 0.1; ashVel[i * 3 + 2] = (rnd() - 0.5) * 0.06; }
    function startEruption() {
      if (eruptT >= 0) return;
      if (reducedMotion3d) {
        erupted = true; lavaFlow.visible = true;
        lavaPts.visible = false; ashPts.visible = false; ventLight.visible = false; craterGlow.visible = false;
        return;
      }
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

    var crystalShardGroup3d = new THREE.Group();
    var crystalShards3d = [];
    var crystalShardGeometry3d = null;
    var crystalShardMaterials3d = [];
    if (SCENE.id === 'geode') {
      crystalShardGeometry3d = new THREE.ConeGeometry(VOXEL * 0.18, VOXEL * 0.82, 6, 1, false);
      crystalShardMaterials3d = [
        new THREE.MeshPhysicalMaterial({
          color: 0xe0f2fe, emissive: 0x67e8f9, emissiveIntensity: 0.18,
          roughness: 0.12, metalness: 0.03,
          clearcoat: 1, clearcoatRoughness: 0.04,
          transmission: 0.2, transparent: true, opacity: 0.78,
          side: THREE.DoubleSide
        }),
        new THREE.MeshPhysicalMaterial({
          color: 0xa78bfa, emissive: 0x7c3aed, emissiveIntensity: 0.22,
          roughness: 0.16, metalness: 0.04,
          clearcoat: 1, clearcoatRoughness: 0.05,
          transmission: 0.16, transparent: true, opacity: 0.82,
          side: THREE.DoubleSide
        })
      ];
      var crystalShardUp3d = new THREE.Vector3(0, 1, 0);
      var crystalShardLimit3d = geologyHighDetail3d ? 58 : 34;
      for (var crystalVoxelIndex3d = 0; crystalVoxelIndex3d < voxels.length && crystalShards3d.length < crystalShardLimit3d; crystalVoxelIndex3d++) {
        var crystalVoxel3d = voxels[crystalVoxelIndex3d];
        if ((crystalVoxel3d.key !== 'quartz' && crystalVoxel3d.key !== 'amethyst') ||
          ((crystalVoxel3d.x * 17 + crystalVoxel3d.y * 11 + crystalVoxel3d.z * 7) % 5 !== 0)) continue;
        var crystalVoxelPosition3d = worldPos(crystalVoxel3d);
        var crystalDirection3d = new THREE.Vector3(
          -crystalVoxelPosition3d[0], -crystalVoxelPosition3d[1], -crystalVoxelPosition3d[2]
        ).normalize();
        var crystalShard3d = new THREE.Mesh(
          crystalShardGeometry3d,
          crystalVoxel3d.key === 'amethyst' ? crystalShardMaterials3d[1] : crystalShardMaterials3d[0]
        );
        crystalShard3d.quaternion.setFromUnitVectors(crystalShardUp3d, crystalDirection3d);
        crystalShard3d.position.set(
          crystalVoxelPosition3d[0] + crystalDirection3d.x * VOXEL * 0.42,
          crystalVoxelPosition3d[1] + crystalDirection3d.y * VOXEL * 0.42,
          crystalVoxelPosition3d[2] + crystalDirection3d.z * VOXEL * 0.42
        );
        var crystalScale3d = 0.72 + ((crystalVoxel3d.x * 13 + crystalVoxel3d.y * 5 + crystalVoxel3d.z * 3) % 9) / 20;
        crystalShard3d.scale.set(crystalScale3d, 0.88 + crystalScale3d * 0.22, crystalScale3d);
        crystalShard3d.userData.voxel = crystalVoxel3d;
        crystalShard3d.castShadow = geologyHighDetail3d;
        crystalShardGroup3d.add(crystalShard3d);
        crystalShards3d.push(crystalShard3d);
      }
      scene.add(crystalShardGroup3d);
      cnv.dataset.geologyCrystalRendering = 'inward-growing-refractive-quartz-shards';
    } else {
      cnv.dataset.geologyCrystalRendering = 'not-applicable';
    }

    function visible(v) { if (v.key === 'void') return false; var fa = FORMED_AT[v.key]; if (fa == null) fa = 0; return !removed[vkey(v)] && v.z < NZ - sliceZ && fa <= showStage && focusLensIncludes(v.key, highlightKey, focusLens); }
    function rebuild() {
      var i = 0, glowVoxelCount3d = 0; instanceToVoxel.length = 0;
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
        if (SCENE.id === 'collision' && v.key === 'summitLimestone') col.lerp(WHITE, 0.5);   // snow line: the summit reads white from any distance
        // when a rock type is selected, make every voxel of that type glow and let
        // the rest recede — so its distribution through the crust pops out.
        if (highlightKey && !(SCENE.id === 'deepEarth' && geologyScienceStage3d > 0)) { if (v.key === highlightKey) col.lerp(WHITE, 0.42); else col.multiplyScalar(0.5); }
        mesh.setColorAt(i, col);
        var voxelGlowStrength3d = geologyGlowStrength3d(v);
        if (voxelGlowStrength3d > 0 &&
          (SCENE.id === 'geode' || ((v.x * 13 + v.y * 7 + v.z * 3) % 2 === 0))) {
          glowVoxelPositions3d[glowVoxelCount3d * 3] = p[0];
          glowVoxelPositions3d[glowVoxelCount3d * 3 + 1] = p[1];
          glowVoxelPositions3d[glowVoxelCount3d * 3 + 2] = p[2];
          var voxelGlowColor3d = new THREE.Color(
            (SCENE.palette[v.key] || ROCKS[v.key] || { color: 0xffffff }).color
          ).lerp(WHITE, SCENE.id === 'geode' ? 0.42 : 0.18);
          glowVoxelColors3d[glowVoxelCount3d * 3] = voxelGlowColor3d.r * voxelGlowStrength3d;
          glowVoxelColors3d[glowVoxelCount3d * 3 + 1] = voxelGlowColor3d.g * voxelGlowStrength3d;
          glowVoxelColors3d[glowVoxelCount3d * 3 + 2] = voxelGlowColor3d.b * voxelGlowStrength3d;
          glowVoxelCount3d++;
        }
        instanceToVoxel[i] = v; i++;
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      glowVoxelGeometry3d.setDrawRange(0, glowVoxelCount3d);
      glowVoxelGeometry3d.attributes.position.needsUpdate = true;
      glowVoxelGeometry3d.attributes.color.needsUpdate = true;
      glowVoxelPoints3d.visible = glowVoxelCount3d > 0;
      var geologyProcessVisible3d = !focusLens && (SCENE.id !== 'deepEarth' || geologyScienceStage3d === 0);
      geologyProcessPoints3d.visible = geologyProcessVisible3d;
      geologyProcessGuideGroup3d.visible = geologyProcessVisible3d;
      updateGeologyProcessGuideDepth3d();
      crystalShards3d.forEach(function (crystalShard3d) {
        crystalShard3d.visible = visible(crystalShard3d.userData.voxel);
      });
      for (var ti = 0; ti < treeMeshes.length; ti++) { var tu = treeMeshes[ti].userData; treeMeshes[ti].visible = !focusLens && (tu.z < NZ - sliceZ) && !removed[tu.x + ',0,' + tu.z] && (FORMED_AT.soil <= showStage); }
      volcano.visible = !!SCENE.features.volcano && !focusLens && (FORMED_AT.soil <= showStage) && (sliceZ <= 7);
      underGlow.visible = SCENE.id === 'crust' && !focusLens && sliceZ === 0;
      waterMesh.visible = waterTableOn && !focusLens;
      if (oceanSurfaceMesh3d) oceanSurfaceMesh3d.visible = !focusLens;
      if (oceanCausticMesh3d) oceanCausticMesh3d.visible = !focusLens;
      updateGeologyLandformCutaway3d();
      updateGeologySurfaceEffects3d(reducedMotion3d ? 0.82 : t);
      updateGeologyHydrothermalField3d(reducedMotion3d ? 0.79 : t);
      updateGeologyVolcanicAtmosphere3d(reducedMotion3d ? 0.74 : t);
      updateGeologyAlpineClouds3d(reducedMotion3d ? 0.61 : t);
      updateGeologyDeepEarthVisuals3d(reducedMotion3d ? 0.76 : t);
      updateUndoPreview();
    }
    rebuild();

    // simple low-poly trees on the surface — a "this is the top, down is deep" cue
    (function buildSurface() {
      // Non-crust scenes encode their real topography in the voxel model.
      if (SCENE.id !== 'crust') return;
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
    var FP_EYE_HEIGHT = VOXEL * 1.55, FP_BODY_HEIGHT = VOXEL * 1.78, FP_RADIUS = VOXEL * 0.27;
    var FP_GRAVITY = VOXEL * 18, FP_JUMP_SPEED = VOXEL * 6.2, FP_REACH = VOXEL * 6;
    function fpVoxelAtWorld(wx, wy, wz) {
      if (wx < -WORLD.w * 0.5 || wx > WORLD.w * 0.5 || wy < -WORLD.h * 0.5 || wy > WORLD.h * 0.5 || wz < -WORLD.d * 0.5 || wz > WORLD.d * 0.5) return null;
      var v = fpWorldToVoxel(wx, wy, wz), voxel = voxelByKey[v.x + ',' + v.y + ',' + v.z];
      return (voxel && visible(voxel)) ? voxel : null;
    }
    function fpPointSolid(wx, wy, wz) {
      var voxel = fpVoxelAtWorld(wx, wy, wz);
      return !!(voxel && fpMaterialPhysics(voxel.key).kind === 'solid');
    }
    function fpMediumAt(wx, eyeY, wz) {
      var samples = [eyeY - FP_EYE_HEIGHT * 0.72, eyeY - FP_EYE_HEIGHT * 0.28, eyeY];
      var fluid = null;
      for (var si = 0; si < samples.length; si++) {
        var voxel = fpVoxelAtWorld(wx, samples[si], wz); if (!voxel) continue;
        var physics = fpMaterialPhysics(voxel.key);
        if (physics.kind === 'hazard') return { kind: 'hazard', voxel: voxel, physics: physics };
        if (physics.kind === 'fluid') fluid = { kind: 'fluid', voxel: voxel, physics: physics };
      }
      return fluid || { kind: 'air', voxel: null, physics: { speed: 1, gravity: 1, buoyancy: 0 } };
    }
    function fpSetMedium(kind) {
      if (fp.medium === kind) return;
      fp.medium = kind; cnv.dataset.geologyPlayerMedium = kind; fp.statusKey = '__refresh';
    }
    function fpHazardNearby(wx, eyeY, wz) {
      var centre = fpWorldToVoxel(wx, eyeY - FP_EYE_HEIGHT * 0.55, wz);
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++) {
        var voxel = voxelByKey[(centre.x + dx) + ',' + (centre.y + dy) + ',' + (centre.z + dz)];
        if (voxel && visible(voxel) && fpMaterialPhysics(voxel.key).kind === 'hazard') return true;
      }
      return false;
    }
    // ── Heat vignette: the viewport edges glow warmer the closer you dig to molten rock.
    // Pure DOM overlay (no extra draw calls); opacity is a static function of distance so
    // reduced-motion users get the same cue without any pulse.
    var heatVignette = null, heatVignetteAt = 0, heatVignetteLevel = -1;
    function fpHazardProximity(wx, eyeY, wz) {                 // 0 = no molten voxel within 3 blocks … 1 = adjacent
      var c = fpWorldToVoxel(wx, eyeY - FP_EYE_HEIGHT * 0.55, wz), best = 99;
      for (var dx = -3; dx <= 3; dx++) for (var dy = -3; dy <= 3; dy++) for (var dz = -3; dz <= 3; dz++) {
        var voxel = voxelByKey[(c.x + dx) + ',' + (c.y + dy) + ',' + (c.z + dz)];
        if (!voxel || !visible(voxel) || fpMaterialPhysics(voxel.key).kind !== 'hazard') continue;
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < best) best = d;
      }
      return best > 3.5 ? 0 : fpClampN(1 - (best - 1) / 2.5, 0, 1);
    }
    function fpUpdateHeatVignette(now) {
      if (!fp.active || fp.mode !== 'mine') { if (heatVignette) heatVignette.style.opacity = '0'; return; }
      if (now - heatVignetteAt < 120) return; heatVignetteAt = now;
      if (!heatVignette) {
        heatVignette = document.createElement('div');
        heatVignette.setAttribute('data-geology-heat-vignette', 'true'); heatVignette.setAttribute('aria-hidden', 'true');
        heatVignette.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .35s ease;background:radial-gradient(ellipse at center, rgba(251,146,60,0) 45%, rgba(249,115,22,.55) 78%, rgba(220,38,38,.85) 100%);mix-blend-mode:screen;';
        try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch (e) {}
        container.appendChild(heatVignette);
      }
      var level = Math.round(fpHazardProximity(fp.pos.x, fp.pos.y, fp.pos.z) * 20) / 20;
      if (level === heatVignetteLevel) return; heatVignetteLevel = level;
      heatVignette.style.opacity = String(level * 0.9);
      heatVignette.setAttribute('data-heat-level', String(level));
    }
    // ── Layer milestones: first footfall on each rock layer earns a flash + haptic, so
    // descending reads as a sequence of discoveries rather than an undifferentiated hole.
    function fpCheckLayerMilestone(now) {
      if (!fp.onGround || fp.mode !== 'mine' || !fp.layersReached) return;
      var here = null; try { here = fpProbe(fp.pos.x, fp.pos.y - FP_EYE_HEIGHT - VOXEL * 0.5, fp.pos.z); } catch (e) { return; }
      if (!here || !here.key || here.key === 'void') return;
      if (fp.layersReached[here.key]) return;
      fp.layersReached[here.key] = true;
      if (now - (fp.enteredAt || 0) < 1500) return;                      // the layer you spawn on is not a discovery
      var n = Object.keys(fp.layersReached).length;
      if (opts.onLayerMilestone) { try { opts.onLayerMilestone(here, n); } catch (e) {} }
      else if (opts.onFlash) opts.onFlash('New layer reached: ' + (here.layerName || here.key) + ' · ' + here.depthKm + ' km · ' + temperatureValue(here.tempC) + (n > 1 ? ' · ' + n + ' layers walked' : ''));
      if (window._alloHaptic) { try { window._alloHaptic('achieve'); } catch (e) {} }
    }
    function fpMarkBlocked() {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      fp.blockedUntil = now + 650; fp.statusKey = '__refresh';
    }
    function fpUpdatePlayerStatus() {
      if (!fp.active) return;
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var state = 'grounded', text = fp.mode === 'fly' ? 'Free flight' : (fp.onGround ? 'Grounded' : 'Falling');
      var here = null;
      if (fp.mode === 'mine' && fp.onGround) {
        // Make the geotherm FELT: the badge reads the depth + temperature of the block underfoot,
        // so digging down visibly heats up long before the magma warning fires.
        try { here = fpProbe(fp.pos.x, fp.pos.y - FP_EYE_HEIGHT - VOXEL * 0.5, fp.pos.z); } catch (e) { here = null; }
        if (here) text += ' · ' + here.depthKm + ' km · ' + temperatureValue(here.tempC);
      }
      if (fp.mining) {
        var pct = fp.mining.duration ? Math.round(fp.mining.elapsed / fp.mining.duration * 100) : 100;
        state = 'mining'; text = (fp.mining.tool === 'drill' ? 'Drilling ' : 'Mining ') + fp.mining.profile.label.toLowerCase() + ' rock · ' + Math.min(100, pct) + '%';
      } else if (fp.hazardNearby) { state = 'hazard'; text = 'Heat warning · molten rock within one block' + (here ? ' · ' + temperatureValue(here.tempC) + ' here' : ''); }
      else if (fp.drillOverheated) { state = 'overheated'; text = 'Drill overheated · cooling down'; }
      else if (fp.medium === 'fluid') { state = 'swimming'; text = 'Swimming · Space rises'; }
      else if (now < fp.blockedUntil) { state = 'blocked'; text = 'Blocked · dig or jump to clear a path'; }
      fpUpdateHeatVignette(now); fpCheckLayerMilestone(now);
      var key = state + ':' + text; if (fp.statusKey === key) return; fp.statusKey = key;
      var root = container.parentNode, node = null;
      try { node = root && root.querySelector ? root.querySelector('[data-geology-player-status]') : null; } catch (e) {}
      if (!node) return;
      node.setAttribute('data-state', state); node.textContent = text;
      var color = (state === 'hazard' || state === 'overheated') ? '#fca5a5' : (state === 'swimming' ? '#7dd3fc' : (state === 'blocked' ? '#fcd34d' : (state === 'mining' ? '#fdba74' : '#a7f3d0')));
      node.style.color = color; node.style.borderColor = color;
    }
    function fpUpdateDrillHud(force) {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (!force && now - fp.drillHudAt < 45) return; fp.drillHudAt = now;
      var root = container.parentNode, bar = null, readout = null, panel = null;
      try {
        bar = root && root.querySelector ? root.querySelector('[data-geology-drill-heat]') : null;
        readout = root && root.querySelector ? root.querySelector('[data-geology-drill-readout]') : null;
        panel = root && root.querySelector ? root.querySelector('[data-geology-drill-meter]') : null;
      } catch (e) {}
      if (bar) { bar.style.width = Math.round(fp.drillHeat * 100) + '%'; bar.style.background = fp.drillHeat > 0.82 ? '#ef4444' : (fp.drillHeat > 0.55 ? '#f59e0b' : '#38bdf8'); }
      if (readout) readout.textContent = fp.drillOverheated ? 'Cooling…' : (Math.round(fp.drillHeat * 100) + '% heat');
      if (panel) { panel.setAttribute('data-overheated', fp.drillOverheated ? 'true' : 'false'); panel.setAttribute('data-active-tool', fp.tool); }
    }
    function fpSetTool(tool) {
      var next = tool === 'drill' ? 'drill' : 'pick';
      if (fp.tool === next) { fpUpdateDrillHud(true); return next; }
      fpCancelMining(); fp.drillHeld = false; fp.tool = next; fp.statusKey = '__refresh'; fp.targetKey = '__refresh';
      var root = container.parentNode, label = null;
      try { label = root && root.querySelector ? root.querySelector('[data-geology-mining-target]') : null; } catch (e) {}
      if (label) label.setAttribute('data-target-key', '__refresh');
      fpUpdateTargetLabel(fp.target); fpUpdateDrillHud(true);
      return next;
    }
    function fpSetMiningHeld(on) {
      fp.drillHeld = !!on && fp.tool === 'drill' && !fp.drillOverheated;
      if (!fp.drillHeld && fp.tool === 'drill' && fp.mining) fpCancelMining();
      return fp.drillHeld;
    }
    function fpUpdateDrill(dt) {
      if (fp.tool === 'drill' && fp.mining) fp.drillHeat = Math.min(1, fp.drillHeat + Math.max(0, dt) * fpDrillHeatRate(fp.mining.profile));
      else fp.drillHeat = Math.max(0, fp.drillHeat - Math.max(0, dt) * (fp.drillOverheated ? 0.38 : 0.22));
      if (!fp.drillOverheated && fp.drillHeat >= 1) {
        fp.drillOverheated = true; fp.drillHeld = false; fpCancelMining(); fp.statusKey = '__refresh';
        if (opts.onFlash) opts.onFlash('The drill overheated. Release the trigger and let it cool.');
        if (window._alloHaptic) { try { window._alloHaptic('error'); } catch (e) {} }
      } else if (fp.drillOverheated && fp.drillHeat <= 0.3) {
        fp.drillOverheated = false; fp.statusKey = '__refresh';
      }
      fpUpdateDrillHud(false);
      var chainNow = (window.performance && performance.now) ? performance.now() : Date.now();
      if (fp.tool === 'drill' && fp.drillHeld && !fp.drillOverheated && !fp.mining && chainNow >= fp.drillNextAt) fpMineAtCrosshair(false, true);
    }
    function fpBodyBlocked(wx, eyeY, wz) {
      var feet = eyeY - FP_EYE_HEIGHT + VOXEL * 0.08;
      var head = eyeY + (FP_BODY_HEIGHT - FP_EYE_HEIGHT) - VOXEL * 0.08;
      var ys = [feet, (feet + head) * 0.5, head];
      var offsets = [[0, 0], [FP_RADIUS, 0], [-FP_RADIUS, 0], [0, FP_RADIUS], [0, -FP_RADIUS]];
      for (var yi = 0; yi < ys.length; yi++) for (var oi = 0; oi < offsets.length; oi++) {
        if (fpPointSolid(wx + offsets[oi][0], ys[yi], wz + offsets[oi][1])) return true;
      }
      return false;
    }
    function fpGroundEyeY(wx, wz, maxFeetY) {
      var best = null, offsets = [[0, 0], [FP_RADIUS, 0], [-FP_RADIUS, 0], [0, FP_RADIUS], [0, -FP_RADIUS]];
      for (var oi = 0; oi < offsets.length; oi++) {
        var sx = wx + offsets[oi][0], sz = wz + offsets[oi][1];
        if (sx < -WORLD.w * 0.5 || sx > WORLD.w * 0.5 || sz < -WORLD.d * 0.5 || sz > WORLD.d * 0.5) continue;
        var col = fpWorldToVoxel(sx, 0, sz);
        for (var vy = 0; vy < NY; vy++) {
          var voxel = voxelByKey[col.x + ',' + vy + ',' + col.z];
          if (!voxel || !visible(voxel) || fpMaterialPhysics(voxel.key).kind !== 'solid') continue;
          var top = worldPos(voxel)[1] + VOXEL * 0.5;
          if (top <= maxFeetY + VOXEL * 0.2 && (best == null || top > best)) best = top;
        }
      }
      return best == null ? null : best + FP_EYE_HEIGHT;
    }
    function fpHazardRespawn() {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      var canWarn = !fp.lastHazardAt || now - fp.lastHazardAt > 900;
      // Loop guard: if the saved foothold keeps dropping us straight back into the hazard
      // (e.g. the block under it was dug out), stop bouncing and go home to the seed pose.
      fp.hazardLoopCount = (now - fp.lastHazardAt < 2500) ? (fp.hazardLoopCount || 0) + 1 : 0;
      var goHome = fp.hazardLoopCount >= 2;
      if (goHome) { fp.safePose = null; fp.hazardLoopCount = 0; }
      fp.lastHazardAt = now; fpRespawn(goHome); fpSetMedium('air');
      if (canWarn && opts.onFlash) opts.onFlash(goHome
        ? 'Your last foothold was dug away, so the explorer returned you to the dig-in point. Magma is molten rock above ~1000 °C: no pick or drill can bite it.'
        : 'That is magma: molten rock above ~1000 °C, so no pick or drill can bite it. You returned to your last safe foothold. Tip: the baked rim around the chamber (contact metamorphism) shows how far its heat reached.');
      if (window._alloHaptic) { try { window._alloHaptic('error'); } catch (e) {} }
    }
    function fpWalkStep(dt, fwd) {
      var medium = fpMediumAt(fp.pos.x, fp.pos.y, fp.pos.z);
      if (medium.kind === 'hazard') { fpHazardRespawn(); return; }
      fpSetMedium(medium.kind);
      var inFluid = medium.kind === 'fluid';
      var flatLen = Math.sqrt(fwd.x * fwd.x + fwd.z * fwd.z) || 1;
      var fx = fwd.x / flatLen, fz = fwd.z / flatLen, rx = -fz, rz = fx;
      var ix = fx * fp.input.fwd + rx * fp.input.strafe, iz = fz * fp.input.fwd + rz * fp.input.strafe;
      var il = Math.sqrt(ix * ix + iz * iz); if (il > 1) { ix /= il; iz /= il; }
      var targetSpeed = fp.speed * (fp.input.sprint ? 1.55 : 1) * (inFluid ? medium.physics.speed : 1);
      var blend = 1 - Math.exp(-(il ? (inFluid ? 7 : 14) : 10) * dt);
      fp.velocity.x += (ix * targetSpeed - fp.velocity.x) * blend;
      fp.velocity.z += (iz * targetSpeed - fp.velocity.z) * blend;
      if (inFluid) {
        fp.onGround = false; fp.jumpLatch = false;
        fp.velocity.y += (fp.input.jump ? FP_JUMP_SPEED * 1.45 : FP_GRAVITY * medium.physics.buoyancy) * dt;
        fp.velocity.y *= Math.exp(-4.2 * dt);
      } else {
        if (fp.input.jump && fp.onGround && !fp.jumpLatch) { fp.velocity.y = FP_JUMP_SPEED; fp.onGround = false; fp.jumpLatch = true; }
        if (!fp.input.jump) fp.jumpLatch = false;
      }
      var minX = -WORLD.w * 0.5 + FP_RADIUS, maxX = WORLD.w * 0.5 - FP_RADIUS;
      var minZ = -WORLD.d * 0.5 + FP_RADIUS, maxZ = WORLD.d * 0.5 - FP_RADIUS;
      var nx = fpClampN(fp.pos.x + fp.velocity.x * dt, minX, maxX);
      if (!fpBodyBlocked(nx, fp.pos.y, fp.pos.z)) fp.pos.x = nx; else { fp.velocity.x = 0; if (Math.abs(ix) > 0.05) fpMarkBlocked(); }
      var nz = fpClampN(fp.pos.z + fp.velocity.z * dt, minZ, maxZ);
      if (!fpBodyBlocked(fp.pos.x, fp.pos.y, nz)) fp.pos.z = nz; else { fp.velocity.z = 0; if (Math.abs(iz) > 0.05) fpMarkBlocked(); }
      if (!inFluid) fp.velocity.y -= FP_GRAVITY * dt;
      var nextEyeY = fp.pos.y + fp.velocity.y * dt;
      if (fp.velocity.y > 0 && fpBodyBlocked(fp.pos.x, nextEyeY, fp.pos.z)) {
        fp.velocity.y = 0; fpMarkBlocked();
      } else {
        var floorEyeY = fpGroundEyeY(fp.pos.x, fp.pos.z, fp.pos.y - FP_EYE_HEIGHT);
        if (fp.velocity.y <= 0 && floorEyeY != null && nextEyeY <= floorEyeY) {
          // Hard landing → brief camera dip + haptic, so a drop down a shaft has weight
          // (skipped under reduced motion; the dip decays in applyFP).
          if (!fp.onGround && fp.velocity.y < -FP_JUMP_SPEED * 0.85) {
            var impact = fpClampN((-fp.velocity.y - FP_JUMP_SPEED * 0.85) / (FP_JUMP_SPEED * 1.6), 0, 1);
            if (!fp.reduced) fp.landDip = VOXEL * (0.04 + impact * 0.1);
            if (impact > 0.35 && window._alloHaptic) { try { window._alloHaptic('bump'); } catch (e) {} }
          }
          fp.pos.y = floorEyeY; fp.velocity.y = 0; fp.onGround = true;
        } else {
          fp.pos.y = nextEyeY; fp.onGround = false;
        }
      }
      var after = fpMediumAt(fp.pos.x, fp.pos.y, fp.pos.z);
      if (after.kind === 'hazard') { fpHazardRespawn(); return; }
      fpSetMedium(after.kind);
      var wasNearHazard = fp.hazardNearby; fp.hazardNearby = fpHazardNearby(fp.pos.x, fp.pos.y, fp.pos.z);
      var safeNow = (window.performance && performance.now) ? performance.now() : Date.now();
      if (fp.hazardNearby && !wasNearHazard && safeNow - (fp.lastHeatWarnAt || 0) > 8000) {
        // Teach the approach, not just the fall: one flash per descent, throttled so it never nags.
        fp.lastHeatWarnAt = safeNow;
        if (opts.onFlash) opts.onFlash('Heat rising: magma is within one block. Rock this close to the chamber gets baked into marble or hornfels. Dig around it, not into it.');
        if (window._alloHaptic) { try { window._alloHaptic('bump'); } catch (e) {} }
      }
      if (fp.onGround && fp.medium === 'air' && !fp.hazardNearby && safeNow - fp.lastSafeAt > 650) {
        fp.lastSafeAt = safeNow; fp.safePose = { pos: { x: fp.pos.x, y: fp.pos.y, z: fp.pos.z }, yaw: fp.yaw, pitch: fp.pitch };
      }
      if (fp.pos.y < -WORLD.h * 0.5 - VOXEL * 3) {
        fpRespawn(false); fpSetMedium('air');
        if (opts.onFlash) opts.onFlash('You slipped out of the model, so the explorer returned you to the last safe foothold.');
      }
    }
    function fpSafePoseStillSafe(pose) {
      // A saved foothold is only usable if solid ground still exists under it and nothing
      // molten sits within a voxel of where we'd stand — otherwise respawning there just
      // drops the player back into the hazard and the respawn repeats forever.
      if (!pose || fp.mode !== 'mine') return pose ? pose : null;
      var floorEyeY = fpGroundEyeY(pose.pos.x, pose.pos.z, pose.pos.y - FP_EYE_HEIGHT + VOXEL * 0.25);
      if (floorEyeY == null) return null;
      if (fpBodyBlocked(pose.pos.x, floorEyeY, pose.pos.z)) return null;
      if (fpMediumAt(pose.pos.x, floorEyeY, pose.pos.z).kind === 'hazard') return null;
      if (fpHazardNearby(pose.pos.x, floorEyeY, pose.pos.z)) return null;
      return { pos: { x: pose.pos.x, y: floorEyeY, z: pose.pos.z }, yaw: pose.yaw, pitch: pose.pitch };
    }
    function fpRespawn(home) {
      var safe = home ? null : fpSafePoseStillSafe(fp.safePose);
      if (!home && fp.safePose && !safe) fp.safePose = null;   // stale foothold: forget it so we don't retry it
      var seed = safe || fpSeedPose(SCENE.id);
      fp.pos = { x: seed.pos.x, y: seed.pos.y, z: seed.pos.z }; fp.yaw = seed.yaw; fp.pitch = seed.pitch;
      fp.velocity = { x: 0, y: 0, z: 0 }; fp.onGround = false; fp.jumpLatch = false; fp.mining = null; fpSetMiningProgress(0, false);
      return { mode: fp.mode, sceneId: SCENE.id };
    }
    function fpMiningProgressNode() {
      var root = container.parentNode;
      try { return root && root.querySelector ? root.querySelector('[data-geology-mining-progress]') : null; } catch (e) { return null; }
    }
    function fpSetMiningProgress(progress, active) {
      var bar = fpMiningProgressNode(), p = fpClampN(Number(progress) || 0, 0, 1);
      if (bar) {
        bar.style.width = Math.round(p * 100) + '%'; bar.style.background = fp.tool === 'drill' ? '#38bdf8' : '#fbbf24';
        if (bar.parentNode && bar.parentNode.setAttribute) {
          bar.parentNode.setAttribute('data-active', active ? 'true' : 'false');
          bar.parentNode.style.opacity = active ? '1' : '0.4';
        }
      }
      hoverBox.scale.setScalar(active ? 1 + p * 0.035 : 1); hoverBox.material.opacity = active ? 0.72 + p * 0.25 : 0.85;
      miningCrackBox.visible = !!(active && !fp.reduced && fp.mining);
      if (miningCrackBox.visible) {
        var wp = worldPos(fp.mining.voxel), stage = Math.max(1, fpMiningStage(p, miningCrackPattern.length));
        miningCrackBox.position.set(wp[0], wp[1], wp[2]);
        miningCrackGeometry.setDrawRange(0, stage * miningCrackFaces.length * 2);
        miningCrackMaterial.opacity = 0.54 + p * 0.4;
      } else miningCrackGeometry.setDrawRange(0, 0);
      fp.statusKey = '__refresh';
    }
    function fpCancelMining() { fp.mining = null; fpSetMiningProgress(0, false); }
    function fpUpdateTargetLabel(v) {
      var key = v ? vkey(v) : '__none';
      fp.targetKey = key;
      var root = container.parentNode, label = null;
      try { label = root && root.querySelector ? root.querySelector('[data-geology-mining-target]') : null; } catch (e) {}
      if (!label || label.getAttribute('data-target-key') === key) return;
      label.setAttribute('data-target-key', key);
      if (!v) { label.textContent = 'Aim at an exposed block'; label.setAttribute('data-target-ready', 'false'); return; }
      var material = SCENE.palette[v.key] || ROCKS[v.key] || { name: v.key || 'Rock', type: '' };
      var profile = fpMiningProfile(v.key, material.type);
      label.textContent = material.name + ' · ' + profile.label + (profile.mineable ? (fp.tool === 'drill' ? ' · hold X to drill' : ' · click or X to dig') : ' · cannot excavate');
      label.setAttribute('data-target-ready', profile.mineable ? 'true' : 'false');
    }
    function fpTargetVoxel() {
      if (!fp.active) return null;
      var oldFar = raycaster.far; raycaster.far = FP_REACH;
      pointer.set(0, 0); camera.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObject(mesh, false), v = null;
      raycaster.far = oldFar;
      for (var hi = 0; hi < hits.length; hi++) {
        var candidate = instanceToVoxel[hits[hi].instanceId];
        if (candidate && fpMaterialPhysics(candidate.key).kind !== 'fluid') { v = candidate; break; }
      }
      fp.target = v || null; fpUpdateTargetLabel(v);
      if (v) { var p = worldPos(v); hoverBox.position.set(p[0], p[1], p[2]); hoverBox.visible = true; }
      else hoverBox.visible = false;
      return v;
    }
    function fpSurveyMaterial(key) {
      if (!fp.active || !key || !SCENE.voxelKeys || SCENE.voxelKeys.indexOf(key) < 0) return null;
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (surveyLastAt && now - surveyLastAt < 1200) return { cooldown: true, remainingMs: Math.ceil(1200 - (now - surveyLastAt)) };
      surveyLastAt = now;
      var nearest = null, nearestWorld = null, nearestDistanceSq = Infinity;
      for (var si = 0; si < voxels.length; si++) {
        var candidate = voxels[si], formedAt = FORMED_AT[candidate.key]; if (formedAt == null) formedAt = 0;
        if (candidate.key !== key || removed[vkey(candidate)] || candidate.z >= NZ - sliceZ || formedAt > showStage) continue;
        var wp = worldPos(candidate), dx = wp[0] - fp.pos.x, dy = wp[1] - fp.pos.y, dz = wp[2] - fp.pos.z;
        var distanceSq = dx * dx + dy * dy + dz * dz;
        if (distanceSq < nearestDistanceSq) { nearest = candidate; nearestWorld = wp; nearestDistanceSq = distanceSq; }
      }
      if (!nearest || !nearestWorld) { surveyBox.visible = false; surveyVoxelKey = null; return { key: key, found: false }; }
      surveyVoxelKey = vkey(nearest); surveyUntil = now + 5200;
      surveyBox.position.set(nearestWorld[0], nearestWorld[1], nearestWorld[2]); surveyBox.scale.setScalar(1); surveyBox.visible = true;
      var deltaX = nearestWorld[0] - fp.pos.x, deltaY = nearestWorld[1] - fp.pos.y, deltaZ = nearestWorld[2] - fp.pos.z;
      // Swing the view toward the specimen (short ease; instant under reduced motion). The tween
      // yields the moment the player looks elsewhere, so it guides without hijacking.
      var aimYaw = Math.atan2(-deltaX, -deltaZ), aimPitch = fpClampPitch(Math.atan2(deltaY, Math.sqrt(deltaX * deltaX + deltaZ * deltaZ) || 1e-6));
      var dYaw = aimYaw - fp.yaw; dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
      fp.aim = { fromYaw: fp.yaw, fromPitch: fp.pitch, dYaw: dYaw, dPitch: aimPitch - fp.pitch, t: 0, dur: fp.reduced ? 0 : 0.55, lastYaw: fp.yaw, lastPitch: fp.pitch };
      var direction = Math.abs(deltaX) > Math.abs(deltaZ) ? (deltaX >= 0 ? 'east' : 'west') : (deltaZ >= 0 ? 'south' : 'north');
      var vertical = Math.abs(deltaY) < VOXEL * 1.25 ? 'near your level' : (deltaY > 0 ? 'above you' : 'below you');
      var material = SCENE.palette[key] || ROCKS[key] || { name: key };
      if (window._alloHaptic) { try { window._alloHaptic('selection'); } catch (e) {} }
      return { key: key, name: material.name, found: true, distanceBlocks: Math.max(1, Math.round(Math.sqrt(nearestDistanceSq) / VOXEL)), direction: direction, vertical: vertical };
    }
    function updateSurveyMarker3d() {
      if (!surveyBox.visible) return;
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (now >= surveyUntil || (surveyVoxelKey && removed[surveyVoxelKey])) { surveyBox.visible = false; surveyVoxelKey = null; return; }
      var pulse = reducedMotion3d ? 1 : 1 + Math.sin(t * 7) * 0.08;
      surveyBox.scale.setScalar(pulse);
      surveyBox.material.opacity = reducedMotion3d ? 0.95 : 0.72 + Math.sin(t * 7) * 0.22;
    }
    function coreRigSnapshot3d() {
      var trajectoryScan3d = coreRigState3d.trajectoryScan ? coreRigTrajectorySnapshot(coreRigState3d.trajectoryScan) : null;
      var finished3d = ['complete', 'stopped', 'paused'].indexOf(coreRigState3d.stage) >= 0;
      return {
        deployed: !!coreRigState3d.deployed, running: !!coreRigState3d.running, stage: coreRigState3d.stage,
        angle: coreRigState3d.angle, angleDegrees: coreRigAngleDegrees(coreRigState3d.angle), depth: coreRigState3d.depth,
        progress: fpClampN(coreRigState3d.progress, 0, 1), heat: fpClampN(coreRigState3d.heat, 0, 1),
        feedMode: coreRigState3d.feedMode, coolantRemaining: coreRigState3d.coolantRemaining, coolantUsed: coreRigState3d.coolantUsed,
        formationLoad: coreRigState3d.formationLoad, idealFeedMode: coreRigState3d.idealFeedMode,
        currentIntegrity: coreRigIntegrityFromStress(coreRigState3d.intervalStress), pristineStreak: coreRigState3d.pristineStreak, bestPristineStreak: coreRigState3d.bestPristineStreak,
        cursor: coreRigState3d.cursor, plannedCount: coreRigState3d.path.length,
        sampleCount: coreRigState3d.samples.length, samples: coreRigState3d.samples.map(function (sample3d) {
          return { key: sample3d.key, name: sample3d.name, type: sample3d.type, color: sample3d.color, depth: sample3d.depth, integrity: sample3d.integrity };
        }),
        // Publish only the stop actually reached; the engine keeps any future boundary private.
        stopReason: coreRigState3d.stopReason,
        trajectoryScan: trajectoryScan3d,
        boreBrief: trajectoryScan3d ? coreRigBoreBrief(trajectoryScan3d, coreRigState3d.samples, coreRigState3d.bestPristineStreak, finished3d) : null,
        evaluation: coreRigState3d.evaluation ? Object.assign({}, coreRigState3d.evaluation) : null,
        scanning: coreRigIntervalScanning(coreRigState3d.scanUntil, Date.now(), coreRigState3d.running, coreRigState3d.currentVoxel),
        lastIntervalResult: coreRigState3d.lastIntervalResult ? Object.assign({}, coreRigState3d.lastIntervalResult) : null,
        formationCue: coreRigState3d.running && coreRigState3d.currentVoxel && coreRigState3d.formationLoad ? coreRigFormationCue(coreRigState3d.formationLoad, coreRigState3d.idealFeedMode, coreRigState3d.lastIntervalResult) : null,
        status: coreRigState3d.status
      };
    }
    function updateCoreRigHudDom3d() {
      var root3d = container.parentNode, progress3d = null, heat3d = null, status3d = null, console3d = null;
      var progressValue3d = null, heatValue3d = null;
      try {
        progress3d = root3d && root3d.querySelector ? root3d.querySelector('[data-geology-core-rig-progress]') : null;
        heat3d = root3d && root3d.querySelector ? root3d.querySelector('[data-geology-core-rig-heat]') : null;
        progressValue3d = root3d && root3d.querySelector ? root3d.querySelector('[data-geology-core-rig-progress-value]') : null;
        heatValue3d = root3d && root3d.querySelector ? root3d.querySelector('[data-geology-core-rig-heat-value]') : null;
        status3d = root3d && root3d.querySelector ? root3d.querySelector('[data-geology-core-rig-status]') : null;
        console3d = root3d && root3d.querySelector ? root3d.querySelector('[data-geology-core-rig-console]') : null;
      } catch (coreRigDomError3d) {}
      var progressPercent3d = Math.round(fpClampN(coreRigState3d.progress, 0, 1) * 100);
      var heatPercent3d = Math.round(fpClampN(coreRigState3d.heat, 0, 1) * 100);
      if (progress3d) {
        progress3d.style.width = progressPercent3d + '%';
        if (progress3d.parentNode) progress3d.parentNode.setAttribute('aria-valuenow', progressPercent3d);
      }
      if (heat3d) {
        heat3d.style.width = heatPercent3d + '%';
        heat3d.style.background = coreRigState3d.heat > 0.74 ? '#fb7185' : '#22d3ee';
        if (heat3d.parentNode) heat3d.parentNode.setAttribute('aria-valuenow', heatPercent3d);
      }
      if (progressValue3d) progressValue3d.textContent = progressPercent3d + '%';
      if (heatValue3d) heatValue3d.textContent = heatPercent3d + '%';
      if (status3d) status3d.textContent = coreRigState3d.status;
      if (console3d) {
        console3d.setAttribute('data-stage', coreRigState3d.stage);
        console3d.setAttribute('data-running', coreRigState3d.running ? 'true' : 'false');
      }
    }
    function notifyCoreRigState3d(force3d) {
      if (!force3d && !coreRigState3d.running) return;
      updateCoreRigHudDom3d();
      var now3d = (window.performance && performance.now) ? performance.now() : Date.now();
      if (!force3d && now3d - coreRigState3d.lastHudAt < 190) return;
      coreRigState3d.lastHudAt = now3d;
      if (opts.onCoreRigState) opts.onCoreRigState(coreRigSnapshot3d());
    }
    function resetCoreRigLoadCouplers3d() {
      coreRigLoadCompression3d = 0;
      for (var loadResetIndex3d = 0; loadResetIndex3d < coreRigLoadCouplers3d.length; loadResetIndex3d++) {
        var resetCoupler3d = coreRigLoadCouplers3d[loadResetIndex3d];
        resetCoupler3d.position.set(0, -rigUnit3d * (1.82 + loadResetIndex3d * 0.24), 0);
        resetCoupler3d.rotation.set(0, loadResetIndex3d * Math.PI * 0.66, 0);
        resetCoupler3d.scale.set(1, 1, 1);
      }
    }
    function clearCoreRigBoreMarkers3d() {
      while (coreRigBoreGroup3d.children.length) {
        var markerRoot3d = coreRigBoreGroup3d.children[0];
        markerRoot3d.traverse(function (part3d) {
          if (part3d.userData && part3d.userData.coreRigDynamicGeometry && part3d.geometry) { part3d.geometry.dispose(); var geometryIndex3d = coreRigGeometries3d.indexOf(part3d.geometry); if (geometryIndex3d >= 0) coreRigGeometries3d.splice(geometryIndex3d, 1); }
          if (part3d.userData && part3d.userData.coreRigDynamicMaterial && part3d.material) { part3d.material.dispose(); var materialIndex3d = coreRigMaterials3d.indexOf(part3d.material); if (materialIndex3d >= 0) coreRigMaterials3d.splice(materialIndex3d, 1); }
        });
        coreRigBoreGroup3d.remove(markerRoot3d);
      }
      resetCoreRigReceiver3d();
      resetCoreRigLoadCouplers3d();
    }
    function coreRigLocalDirection3d() {
      var radians3d = coreRigAngleDegrees(coreRigState3d.angle) * Math.PI / 180;
      return new THREE.Vector3(0, -Math.sin(radians3d), -Math.cos(radians3d)).normalize();
    }
    function updateCoreRigGuide3d() {
      var direction3d = coreRigLocalDirection3d();
      coreRigGuideStart3d.set(0, rigUnit3d * 0.34, 0);
      coreRigGuideEnd3d.copy(coreRigGuideStart3d).addScaledVector(direction3d, VOXEL);
      if (coreRigState3d.path.length) {
        var endpointCell3d = coreRigState3d.path[coreRigState3d.path.length - 1];
        var endpointVoxel3d = voxelByKey[endpointCell3d.x + ',' + endpointCell3d.y + ',' + endpointCell3d.z];
        if (endpointVoxel3d) {
          var endpointWorld3d = worldPos(endpointVoxel3d);
          coreRigGuideEnd3d.copy(coreRigGroup3d.worldToLocal(new THREE.Vector3(endpointWorld3d[0], endpointWorld3d[1], endpointWorld3d[2])));
        }
      }
      var guideVector3d = coreRigGuideEnd3d.clone().sub(coreRigGuideStart3d);
      var guideLength3d = Math.max(VOXEL * 0.25, guideVector3d.length());
      if (guideVector3d.lengthSq() > 0.0001) direction3d.copy(guideVector3d).normalize();
      coreRigGuideGeo3d.setFromPoints([coreRigGuideStart3d, coreRigGuideEnd3d]);
      coreRigGuide3d.computeLineDistances();
      coreRigTarget3d.position.copy(coreRigGuideEnd3d);
      coreRigTarget3d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction3d);
      var trajectoryRisk3d = coreRigState3d.trajectoryScan ? coreRigState3d.trajectoryScan.riskLevel : 'limited';
      var targetTone3d = trajectoryRisk3d === 'clear' ? 0x22d3ee
        : (trajectoryRisk3d === 'caution' ? 0xfbbf24 : 0xfb7185);
      coreRigTargetMat3d.color.setHex(targetTone3d); coreRigGuideMat3d.color.setHex(targetTone3d);
      coreRigPulseRings3d.forEach(function (ring3d, index3d) {
        ring3d.position.copy(coreRigGuideStart3d).addScaledVector(direction3d, guideLength3d * ((index3d + 1) / 4));
        ring3d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction3d);
      });
      coreRigAssembly3d.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction3d);
      coreRigAssembly3d.position.copy(coreRigGuideStart3d).addScaledVector(direction3d, -rigUnit3d * 3.33);
      coreRigFeedGlow3d.position.copy(coreRigGuideStart3d);
    }
    function planCoreRigPath3d() {
      if (!coreRigState3d.origin) {
        coreRigState3d.path = []; coreRigState3d.plannedStop = null; coreRigState3d.trajectoryScan = null;
        return [];
      }
      var rawPath3d = coreRigPath(coreRigState3d.origin, coreRigState3d.yaw, coreRigState3d.angle, coreRigState3d.depth, { minX: 0, maxX: NX - 1, minY: 0, maxY: NY - 1, minZ: 0, maxZ: NZ - 1 });
      var planned3d = [], scanEntries3d = [], plannedStop3d = null, skippedCavities3d = 0;
      for (var pathIndex3d = 0; pathIndex3d < rawPath3d.length; pathIndex3d++) {
        var cell3d = rawPath3d[pathIndex3d];
        var voxel3d = voxelByKey[cell3d.x + ',' + cell3d.y + ',' + cell3d.z];
        if (voxel3d && removed[vkey(voxel3d)]) { skippedCavities3d += 1; continue; }
        var material3d = voxel3d ? (SCENE.palette[voxel3d.key] || ROCKS[voxel3d.key] || { name: voxel3d.key || 'Rock', type: '' }) : null;
        var stop3d = coreRigStopReason(voxel3d && voxel3d.key, material3d && material3d.type);
        if (stop3d) { plannedStop3d = stop3d; break; }
        planned3d.push({ x: cell3d.x, y: cell3d.y, z: cell3d.z, distance: cell3d.distance, depth: cell3d.depth });
        scanEntries3d.push({ key: voxel3d && voxel3d.key, type: material3d && material3d.type });
      }
      if (!plannedStop3d && rawPath3d.length < coreRigState3d.depth) plannedStop3d = 'blocked';
      if (!plannedStop3d && skippedCavities3d) plannedStop3d = 'spent';
      coreRigState3d.path = planned3d; coreRigState3d.plannedStop = plannedStop3d;
      coreRigState3d.trajectoryScan = coreRigTrajectoryScan(scanEntries3d, plannedStop3d, coreRigState3d.depth);
      return planned3d;
    }
    function coreRigError3d(message3d, reason3d) {
      if (opts.onFlash) opts.onFlash(message3d);
      return { ok: false, reason: reason3d || 'unavailable', message: message3d };
    }
    function setCoreRigFeedMode3d(modeId3d) {
      if (!coreRigState3d.deployed) return coreRigError3d('Deploy the rig before changing its feed mode.', 'packed');
      if (!CORE_RIG_FEED_MODES[modeId3d]) return coreRigError3d('Choose Preserve, Cruise, or Torque feed.', 'invalid-mode');
      coreRigState3d.feedMode = modeId3d;
      var profile3d = coreRigFeedProfile(modeId3d);
      coreRigState3d.status = profile3d.label + ' feed selected' + (coreRigState3d.formationLoad ? (' · ' + coreRigState3d.formationLoad + ' formation') : '');
      notifyCoreRigState3d(true);
      if (opts.onFlash) opts.onFlash(profile3d.label + ' feed · ' + Math.round(profile3d.speedMultiplier * 100) + '% advance · ' + Math.round(profile3d.heatMultiplier * 100) + '% heat load');
      if (window._alloHaptic) { try { window._alloHaptic('selection'); } catch (coreRigModeHapticError3d) {} }
      return { ok: true, state: coreRigSnapshot3d() };
    }
    function useCoreRigCoolant3d() {
      if (!coreRigState3d.deployed || !coreRigState3d.running) return coreRigError3d('Coolant is available during an active bore.', 'inactive');
      if (coreRigState3d.stage === 'cooling') return coreRigError3d('Auto-cooling is already protecting the core. Save the pulse for the next interval.', 'cooling');
      if (coreRigState3d.coolantRemaining <= 0) return coreRigError3d('Both coolant pulses have been used for this bore.', 'empty');
      if (coreRigState3d.heat < 0.22) return coreRigError3d('Head temperature is already low. Save the coolant pulse.', 'cool');
      coreRigState3d.coolantRemaining -= 1; coreRigState3d.coolantUsed += 1;
      coreRigState3d.heat = Math.max(0, coreRigState3d.heat - 0.34); coreRigState3d.coolantFlashUntil = Date.now() + 700;
      coreRigState3d.status = 'Coolant pulse · head temperature ' + Math.round(coreRigState3d.heat * 100) + '% · ' + coreRigState3d.coolantRemaining + ' remaining';
      notifyCoreRigState3d(true);
      if (opts.onFlash) opts.onFlash('Coolant pulse released · core integrity protected');
      if (window._alloHaptic) { try { window._alloHaptic('success'); } catch (coreRigCoolantHapticError3d) {} }
      return { ok: true, state: coreRigSnapshot3d() };
    }
    function coreRigSupportTop3d(wx3d, wz3d, maxTop3d) {
      if (wx3d < -WORLD.w * 0.5 || wx3d > WORLD.w * 0.5 || wz3d < -WORLD.d * 0.5 || wz3d > WORLD.d * 0.5) return null;
      var column3d = fpWorldToVoxel(wx3d, 0, wz3d), supportTop3d = null;
      for (var supportY3d = 0; supportY3d < NY; supportY3d++) {
        var supportVoxel3d = voxelByKey[column3d.x + ',' + supportY3d + ',' + column3d.z];
        if (!supportVoxel3d || removed[vkey(supportVoxel3d)] || !visible(supportVoxel3d) || fpMaterialPhysics(supportVoxel3d.key).kind !== 'solid') continue;
        var top3d = worldPos(supportVoxel3d)[1] + VOXEL * 0.5;
        if (top3d <= maxTop3d + VOXEL * 0.2 && (supportTop3d == null || top3d > supportTop3d)) supportTop3d = top3d;
      }
      return supportTop3d;
    }
    function coreRigStablePad3d(cx3d, cz3d, maxTop3d, yaw3d) {
      var footX3d = rigUnit3d * 1.38, footZ3d = rigUnit3d * 1.12;
      var localProbes3d = [[0, 0], [-footX3d, -footZ3d], [footX3d, -footZ3d], [-footX3d, footZ3d], [footX3d, footZ3d]];
      var sinYaw3d = Math.sin(Number(yaw3d) || 0), cosYaw3d = Math.cos(Number(yaw3d) || 0);
      var tops3d = [];
      for (var probeIndex3d = 0; probeIndex3d < localProbes3d.length; probeIndex3d++) {
        var localProbe3d = localProbes3d[probeIndex3d];
        var probeX3d = cx3d + localProbe3d[0] * cosYaw3d + localProbe3d[1] * sinYaw3d;
        var probeZ3d = cz3d - localProbe3d[0] * sinYaw3d + localProbe3d[1] * cosYaw3d;
        var probeTop3d = coreRigSupportTop3d(probeX3d, probeZ3d, maxTop3d);
        if (probeTop3d == null) return null;
        tops3d.push(probeTop3d);
      }
      var lowTop3d = Math.min.apply(Math, tops3d), highTop3d = Math.max.apply(Math, tops3d);
      if (highTop3d - lowTop3d > VOXEL * 0.35 || fpBodyBlocked(cx3d, highTop3d + FP_EYE_HEIGHT, cz3d)) return null;
      var origin3d = fpWorldToVoxel(cx3d, tops3d[0] - VOXEL * 0.18, cz3d);
      var centreSupport3d = voxelByKey[origin3d.x + ',' + origin3d.y + ',' + origin3d.z];
      if (!centreSupport3d || removed[vkey(centreSupport3d)] || !visible(centreSupport3d) || fpMaterialPhysics(centreSupport3d.key).kind !== 'solid') return null;
      return { origin: origin3d, groundTopY: tops3d[0] };
    }
    function deployCoreRig3d(config3d) {
      config3d = config3d || {};
      if (!coreRigSupported(SCENE.id) || fp.mode !== 'mine') return coreRigError3d('Directional core rigs need a stable surface. Deep Earth remains a handheld flight expedition.', 'unsupported');
      if (!fp.active) return coreRigError3d('Enter Walk & Dig before deploying the core rig.', 'inactive');
      if (coreRigState3d.deployed) {
        configureCoreRig3d(config3d);
        return { ok: true, state: coreRigSnapshot3d() };
      }
      if (!fp.onGround || fp.medium !== 'air' || fp.hazardNearby) return coreRigError3d('Find stable, cool ground before deploying the core rig.', 'unstable');
      var forwardX3d = -Math.sin(fp.yaw), forwardZ3d = -Math.cos(fp.yaw);
      var rightX3d = -forwardZ3d, rightZ3d = forwardX3d;
      var padOffsets3d = [[forwardX3d, forwardZ3d], [rightX3d, rightZ3d], [-rightX3d, -rightZ3d], [-forwardX3d, -forwardZ3d]];
      var pad3d = null;
      for (var padIndex3d = 0; padIndex3d < padOffsets3d.length; padIndex3d++) {
        var candidateX3d = fp.pos.x + padOffsets3d[padIndex3d][0] * VOXEL * 3.0;
        var candidateZ3d = fp.pos.z + padOffsets3d[padIndex3d][1] * VOXEL * 3.0;
        if (candidateX3d < -WORLD.w * 0.5 + VOXEL || candidateX3d > WORLD.w * 0.5 - VOXEL || candidateZ3d < -WORLD.d * 0.5 + VOXEL || candidateZ3d > WORLD.d * 0.5 - VOXEL) continue;
        var stablePad3d = coreRigStablePad3d(candidateX3d, candidateZ3d, fp.pos.y - FP_EYE_HEIGHT + VOXEL * 1.4, fp.yaw);
        if (!stablePad3d) continue;
        pad3d = stablePad3d; break;
      }
      if (!pad3d) return coreRigError3d('No level drilling pad is clear nearby. Move to a broader ledge and try again.', 'no-pad');
      coreRigState3d.deployed = true; coreRigState3d.running = false;
      coreRigState3d.stage = reducedMotion3d ? 'preview' : 'deploying';
      coreRigState3d.angle = CORE_RIG_ANGLES[config3d.angle] ? config3d.angle : coreRigState3d.angle;
      coreRigState3d.depth = CORE_RIG_DEPTHS.indexOf(Number(config3d.depth)) >= 0 ? Number(config3d.depth) : coreRigState3d.depth;
      coreRigState3d.origin = pad3d.origin; coreRigState3d.yaw = fp.yaw; coreRigState3d.cursor = 0;
      coreRigState3d.samples = []; coreRigState3d.heat = 0; coreRigState3d.progress = 0; coreRigState3d.stopReason = null;
      coreRigState3d.feedMode = CORE_RIG_FEED_MODES[config3d.feedMode] ? config3d.feedMode : coreRigState3d.feedMode;
      coreRigState3d.coolantRemaining = 2; coreRigState3d.coolantUsed = 0; coreRigState3d.formationLoad = null; coreRigState3d.idealFeedMode = 'cruise';
      coreRigState3d.intervalStress = 0; coreRigState3d.intervalPeakHeat = 0; coreRigState3d.pristineStreak = 0; coreRigState3d.bestPristineStreak = 0;
      coreRigState3d.currentCell = null; coreRigState3d.currentVoxel = null; coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = 0;
      coreRigState3d.evaluation = null; coreRigState3d.celebrateUntil = 0; coreRigState3d.coolantFlashUntil = 0;
      coreRigState3d.scanUntil = 0; coreRigState3d.lastIntervalResult = null; coreRigState3d.deployedAt = Date.now();
      clearCoreRigBoreMarkers3d();
      var rigOriginWorld3d = worldPos(pad3d.origin);
      coreRigGroup3d.position.set(rigOriginWorld3d[0], pad3d.groundTopY, rigOriginWorld3d[2]);
      coreRigGroup3d.rotation.y = fp.yaw; coreRigGroup3d.visible = true;
      coreRigGroup3d.scale.setScalar(1); coreRigGroup3d.updateMatrixWorld(true);
      planCoreRigPath3d(); updateCoreRigGuide3d();
      coreRigGroup3d.scale.setScalar(reducedMotion3d ? 1 : 0.04); coreRigGroup3d.updateMatrixWorld(true);
      coreRigState3d.status = reducedMotion3d
        ? (coreRigState3d.path.length ? ('Bore preview · ' + coreRigState3d.path.length + ' recoverable intervals') : 'No safe rock on this trajectory')
        : 'Locking stabilizers · trajectory scan ready';
      notifyCoreRigState3d(true);
      if (opts.onFlash) opts.onFlash('Core rig deployed. Choose an angle and depth, then match Preserve, Cruise, or Torque feed to each formation load.');
      if (window._alloHaptic) { try { window._alloHaptic('success'); } catch (coreRigHapticError3d) {} }
      return { ok: true, state: coreRigSnapshot3d() };
    }
    function configureCoreRig3d(config3d) {
      config3d = config3d || {};
      if (!coreRigState3d.deployed) return coreRigError3d('Deploy the core rig before configuring a bore.', 'packed');
      if (coreRigState3d.running || coreRigState3d.stage === 'deploying') return coreRigError3d('Wait for the stabilizers before redirecting the bore.', 'running');
      if (CORE_RIG_ANGLES[config3d.angle]) coreRigState3d.angle = config3d.angle;
      if (CORE_RIG_DEPTHS.indexOf(Number(config3d.depth)) >= 0) coreRigState3d.depth = Number(config3d.depth);
      coreRigState3d.stage = 'preview'; coreRigState3d.cursor = 0; coreRigState3d.samples = [];
      coreRigState3d.heat = 0; coreRigState3d.progress = 0; coreRigState3d.stopReason = null;
      coreRigState3d.coolantRemaining = 2; coreRigState3d.coolantUsed = 0; coreRigState3d.formationLoad = null; coreRigState3d.idealFeedMode = 'cruise';
      coreRigState3d.intervalStress = 0; coreRigState3d.intervalPeakHeat = 0; coreRigState3d.pristineStreak = 0; coreRigState3d.bestPristineStreak = 0;
      coreRigState3d.currentCell = null; coreRigState3d.currentVoxel = null; coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = 0;
      coreRigState3d.evaluation = null; coreRigState3d.celebrateUntil = 0; coreRigState3d.scanUntil = 0; coreRigState3d.lastIntervalResult = null; coreRigFeedGlow3d.visible = false;
      clearCoreRigBoreMarkers3d(); planCoreRigPath3d(); updateCoreRigGuide3d();
      coreRigState3d.status = coreRigState3d.path.length
        ? ('Trajectory ready · ' + coreRigState3d.path.length + ' recoverable intervals')
        : 'Trajectory unavailable · change angle, depth, or position';
      notifyCoreRigState3d(true);
      return { ok: true, state: coreRigSnapshot3d() };
    }
    function finishCoreRig3d(reason3d) {
      if (!coreRigState3d.deployed) return null;
      reason3d = reason3d || 'complete';
      coreRigState3d.running = false; coreRigState3d.stopReason = reason3d === 'complete' ? null : reason3d;
      coreRigState3d.stage = reason3d === 'complete' ? 'complete' : (reason3d === 'cancelled' ? 'paused' : 'stopped');
      coreRigState3d.currentCell = null; coreRigState3d.currentVoxel = null;
      coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = 0; coreRigState3d.scanUntil = 0; coreRigFeedGlow3d.visible = false;
      var completedAt3d = Date.now();
      var trajectoryScan3d = coreRigState3d.trajectoryScan
        ? coreRigTrajectorySnapshot(coreRigState3d.trajectoryScan)
        : coreRigTrajectoryScan([], reason3d, coreRigState3d.depth);
      var report3d = {
        sceneId: SCENE.id, angle: coreRigState3d.angle, angleDegrees: coreRigAngleDegrees(coreRigState3d.angle),
        targetDepth: coreRigState3d.depth, plannedCount: trajectoryScan3d.recoverable, stopReason: coreRigState3d.stopReason,
        feedMode: coreRigState3d.feedMode, coolantUsed: coreRigState3d.coolantUsed, bestPristineStreak: coreRigState3d.bestPristineStreak,
        trajectoryScan: trajectoryScan3d,
        samples: coreRigSnapshot3d().samples, completedAt: completedAt3d
      };
      report3d.boreBrief = coreRigBoreBrief(trajectoryScan3d, report3d.samples, report3d.bestPristineStreak, true);
      var summary3d = coreRigReportSummary(report3d);
      var evaluation3d = coreRigEvaluation(report3d);
      report3d.evaluation = Object.assign({}, evaluation3d);
      coreRigState3d.evaluation = Object.assign({}, evaluation3d);
      coreRigState3d.celebrateUntil = summary3d.sampleCount ? completedAt3d + (reducedMotion3d ? 250 : 2400) : 0;
      var resultLabel3d = 'Grade ' + evaluation3d.grade + ' · ' + evaluation3d.label +
        (evaluation3d.integrityPercent != null ? (' · ' + evaluation3d.integrityPercent + '% integrity') : '') +
        ' · Brief ' + report3d.boreBrief.metCount + '/3';
      var message3d = !summary3d.sampleCount
        ? (reason3d === 'spent' ? 'Existing bore detected — relocate or change trajectory.'
        : (reason3d === 'cancelled' ? 'Bore ended before a sample interval was recovered.'
        : 'No recoverable core on this trajectory.'))
        : (reason3d === 'fluid' ? 'Water-boundary stop sealed safely · ' + resultLabel3d
        : (reason3d === 'hazard' ? 'Thermal-boundary stop protected the sample · ' + resultLabel3d
        : (reason3d === 'blocked' ? 'Rock boundary reached · ' + resultLabel3d
        : (reason3d === 'spent' ? 'Existing bore intersected · ' + resultLabel3d
        : (reason3d === 'cancelled' ? 'Operator ended early · ' + resultLabel3d
        : 'Core recovered · ' + resultLabel3d)))));
      coreRigState3d.status = message3d;
      notifyCoreRigState3d(true);
      if (opts.onFlash) opts.onFlash(message3d);
      if (report3d.samples.length && opts.onCoreRigComplete) opts.onCoreRigComplete(report3d);
      if (window._alloHaptic) { try { window._alloHaptic(report3d.samples.length ? 'success' : 'warning'); } catch (coreRigFinishHapticError3d) {} }
      return report3d;
    }
    function prepareCoreRigStep3d() {
      while (coreRigState3d.cursor < coreRigState3d.path.length) {
        var cell3d = coreRigState3d.path[coreRigState3d.cursor];
        var voxel3d = voxelByKey[cell3d.x + ',' + cell3d.y + ',' + cell3d.z];
        if (voxel3d && removed[vkey(voxel3d)]) { coreRigState3d.cursor += 1; continue; }
        var material3d = voxel3d ? (SCENE.palette[voxel3d.key] || ROCKS[voxel3d.key] || { name: voxel3d.key || 'Rock', type: '' }) : null;
        var stop3d = coreRigStopReason(voxel3d && voxel3d.key, material3d && material3d.type);
        if (stop3d) { finishCoreRig3d(stop3d); return false; }
        var duration3d = coreRigDrillDuration(voxel3d.key, material3d.type);
        if (!duration3d) { finishCoreRig3d('blocked'); return false; }
        var formation3d = coreRigFormationLoad(voxel3d.key, material3d.type);
        coreRigState3d.currentCell = cell3d; coreRigState3d.currentVoxel = voxel3d;
        coreRigState3d.formationLoad = formation3d.label; coreRigState3d.idealFeedMode = formation3d.idealMode;
        coreRigState3d.intervalStress = 0; coreRigState3d.intervalPeakHeat = coreRigState3d.heat;
        coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = Math.max(950, Math.round(duration3d * 1.7));
        coreRigState3d.scanUntil = Date.now() + CORE_RIG_INTERVAL_SCAN_MS;
        coreRigState3d.stage = 'drilling'; coreRigState3d.status = coreRigFormationCue(formation3d.label, formation3d.idealMode, coreRigState3d.lastIntervalResult).prompt;
        notifyCoreRigState3d(true);
        return true;
      }
      finishCoreRig3d(coreRigState3d.plannedStop || 'complete'); return false;
    }
    function startCoreRig3d() {
      if (!coreRigState3d.deployed) return coreRigError3d('Deploy the rig before starting a bore.', 'packed');
      if (coreRigState3d.stage === 'deploying') return coreRigError3d('The stabilizers are still locking. Start the bore when the trajectory is ready.', 'deploying');
      if (coreRigState3d.running) return { ok: true, state: coreRigSnapshot3d() };
      coreRigState3d.cursor = 0; coreRigState3d.samples = []; coreRigState3d.heat = 0;
      coreRigState3d.progress = 0; coreRigState3d.stopReason = null; coreRigState3d.evaluation = null; coreRigState3d.celebrateUntil = 0;
      coreRigState3d.coolantRemaining = 2; coreRigState3d.coolantUsed = 0; coreRigState3d.formationLoad = null; coreRigState3d.idealFeedMode = 'cruise';
      coreRigState3d.intervalStress = 0; coreRigState3d.intervalPeakHeat = 0; coreRigState3d.pristineStreak = 0; coreRigState3d.bestPristineStreak = 0; coreRigState3d.coolantFlashUntil = 0;
      coreRigState3d.currentCell = null; coreRigState3d.currentVoxel = null; coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = 0;
      coreRigState3d.scanUntil = 0; coreRigState3d.lastIntervalResult = null;
      clearCoreRigBoreMarkers3d(); planCoreRigPath3d(); updateCoreRigGuide3d();
      if (!coreRigState3d.path.length) return finishCoreRig3d(coreRigState3d.plannedStop || 'blocked');
      coreRigState3d.running = true; coreRigState3d.stage = 'drilling'; coreRigState3d.status = 'Spin-up · locking the drill string';
      prepareCoreRigStep3d();
      if (window._alloHaptic) { try { window._alloHaptic('selection'); } catch (coreRigStartHapticError3d) {} }
      return { ok: true, state: coreRigSnapshot3d() };
    }
    function addCoreRigSampleMarker3d(sample3d, voxel3d) {
      var materialColor3d = new THREE.Color(sample3d.color || 0xcbd5e1);
      var sampleIntegrity3d = Math.max(0.55, Math.min(1, Number(sample3d.integrity) || 1));
      var markerMat3d = coreRigMaterial3d(new THREE.MeshStandardMaterial({ color: materialColor3d, emissive: materialColor3d, emissiveIntensity: 0.24 + sampleIntegrity3d * 0.28, roughness: 0.66 - sampleIntegrity3d * 0.3, metalness: 0.18, transparent: true, opacity: 0.55 + sampleIntegrity3d * 0.35 }));
      var marker3d = coreRigMesh3d(new THREE.CylinderGeometry(VOXEL * 0.12, VOXEL * 0.12, VOXEL * 0.54, 10), markerMat3d, 0, 0, 0, coreRigBoreGroup3d);
      marker3d.scale.set(0.72 + sampleIntegrity3d * 0.28, 1, 0.72 + sampleIntegrity3d * 0.28);
      marker3d.userData.coreRigDynamicGeometry = true; marker3d.userData.coreRigDynamicMaterial = true;
      var halo3d = coreRigMesh3d(new THREE.SphereGeometry(VOXEL * 0.2, 8, 6), coreRigBoreMat3d, 0, 0, 0, marker3d);
      halo3d.userData.coreRigDynamicGeometry = true; halo3d.castShadow = false; halo3d.receiveShadow = false;
      halo3d.scale.set(1, 0.36, 1); halo3d.renderOrder = 7;
      coreRigGroup3d.updateMatrixWorld(true);
      var voxelWorld3d = worldPos(voxel3d);
      marker3d.position.copy(coreRigGroup3d.worldToLocal(new THREE.Vector3(voxelWorld3d[0], voxelWorld3d[1], voxelWorld3d[2])));
      marker3d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), coreRigLocalDirection3d().clone().negate());
      marker3d.renderOrder = 6;
    }
    function resetCoreRigRecoveryHead3d() {
      coreRigRecoveryHead3d.visible = false;
      coreRigRecoveryHead3d.position.set(0, 0, 0); coreRigRecoveryHead3d.quaternion.identity();
      coreRigRecoveryHead3d.scale.set(1, 1, 1);
      coreRigRecoveryHeadOffset3d.set(0, rigUnit3d * 0.19, 0);
      coreRigRecoveryHeadTransfer3d.set(0, 0, 0); coreRigRecoveryHeadTransferQuaternion3d.identity();
      coreRigRecoveryHeadJawLeft3d.position.set(-coreRigRecoveryHeadJawOpen3d, -rigUnit3d * 0.11, 0);
      coreRigRecoveryHeadJawRight3d.position.set(coreRigRecoveryHeadJawOpen3d, -rigUnit3d * 0.11, 0);
      coreRigRecoveryHeadJawLeft3d.rotation.z = 0.26; coreRigRecoveryHeadJawRight3d.rotation.z = -0.26;
    }
    function positionCoreRigDockClamp3d(slot3d) {
      coreRigDockClamp3d.visible = !!slot3d;
      if (!slot3d) return;
      coreRigDockClamp3d.position.copy(slot3d.position); coreRigDockClamp3d.position.z += rigUnit3d * 0.11;
    }
    function resetCoreRigReceiver3d() {
      coreRigLiftState3d.active = false; coreRigLiftState3d.elapsed = 0; coreRigLiftState3d.slotIndex = -1;
      coreRigLiftState3d.sample = null; coreRigLiftState3d.dockFlashUntil = 0;
      coreRigLiftMesh3d.visible = false; coreRigLiftHalo3d.visible = false;
      coreRigRecoveryTether3d.visible = false; coreRigRecoveryTether3d.scale.set(0.24, 1, 0.24);
      coreRigRecoveryPulley3d.rotation.z = 0; coreRigRecoveryPulleyProgress3d = 0;
      resetCoreRigRecoveryHead3d();
      coreRigReceiverGroup3d.position.y = coreRigReceiverRestY3d;
      coreRigLiftHaloMat3d.opacity = 0.68;
      coreRigReceiverSlots3d.forEach(function (receiverSlot3d) {
        receiverSlot3d.userData.coreRigReceiverFilled = false;
        receiverSlot3d.material.color.setHex(0x334155); receiverSlot3d.material.emissive.setHex(0x0f172a);
        receiverSlot3d.material.emissiveIntensity = 0.12; receiverSlot3d.material.opacity = 0.62;
        receiverSlot3d.scale.set(1, 1, 1);
      });
      coreRigReceiverNext3d.visible = !!coreRigReceiverSlots3d.length;
      if (coreRigReceiverSlots3d.length) {
        coreRigReceiverNext3d.position.copy(coreRigReceiverSlots3d[0].position);
        coreRigReceiverNext3d.position.z += rigUnit3d * 0.06;
      }
      coreRigReceiverNext3d.scale.setScalar(1);
      positionCoreRigDockClamp3d(coreRigReceiverSlots3d.length ? coreRigReceiverSlots3d[0] : null);
      coreRigDockClampTop3d.position.set(0, coreRigDockClampOpen3d, 0); coreRigDockClampBottom3d.position.set(0, -coreRigDockClampOpen3d, 0);
      coreRigDockClampTop3d.rotation.z = Math.PI * 0.5 + 0.12; coreRigDockClampBottom3d.rotation.z = Math.PI * 0.5 - 0.12;
      coreRigDockClamp3d.scale.setScalar(1);
    }
    function fillCoreRigReceiverSlot3d(slotIndex3d, sample3d) {
      var receiverSlot3d = coreRigReceiverSlots3d[slotIndex3d];
      if (!receiverSlot3d || !sample3d) return;
      var recoveredColor3d = sample3d.color != null ? sample3d.color : 0xcbd5e1;
      var recoveredIntegrity3d = Math.max(0.55, Math.min(1, Number(sample3d.integrity) || 1));
      receiverSlot3d.material.color.set(recoveredColor3d); receiverSlot3d.material.emissive.set(recoveredColor3d);
      receiverSlot3d.material.emissiveIntensity = 0.24 + recoveredIntegrity3d * 0.34;
      receiverSlot3d.material.opacity = 0.78 + recoveredIntegrity3d * 0.2;
      var receiverRadius3d = 0.76 + recoveredIntegrity3d * 0.24;
      receiverSlot3d.scale.set(receiverRadius3d, 0.78 + recoveredIntegrity3d * 0.22, receiverRadius3d);
      receiverSlot3d.userData.coreRigReceiverFilled = true;
      var nextReceiverSlot3d = coreRigReceiverSlots3d[slotIndex3d + 1];
      coreRigReceiverNext3d.visible = !!nextReceiverSlot3d;
      if (nextReceiverSlot3d) {
        coreRigReceiverNext3d.position.copy(nextReceiverSlot3d.position);
        coreRigReceiverNext3d.position.z += rigUnit3d * 0.06;
      }
    }
    function beginCoreRigLift3d(sample3d, voxel3d) {
      if (!sample3d || !voxel3d || !coreRigReceiverSlots3d.length) return;
      if (coreRigLiftState3d.active && coreRigLiftState3d.sample) {
        fillCoreRigReceiverSlot3d(coreRigLiftState3d.slotIndex, coreRigLiftState3d.sample);
      }
      var liftSlotIndex3d = Math.max(0, Math.min(coreRigReceiverSlots3d.length - 1, coreRigState3d.samples.length - 1));
      var liftSlot3d = coreRigReceiverSlots3d[liftSlotIndex3d];
      coreRigReceiverGroup3d.position.y = coreRigReceiverRestY3d;
      var liftVoxelWorld3d = worldPos(voxel3d);
      coreRigGroup3d.updateMatrixWorld(true);
      coreRigLiftWorld3d.set(liftVoxelWorld3d[0], liftVoxelWorld3d[1], liftVoxelWorld3d[2]);
      coreRigLiftStart3d.copy(coreRigGroup3d.worldToLocal(coreRigLiftWorld3d));
      coreRigLiftTransfer3d.set(0, rigUnit3d * 2.97, rigUnit3d * 0.08);
      coreRigLiftDock3d.copy(coreRigReceiverGroup3d.position).add(liftSlot3d.position);
      coreRigLiftDock3d.z += rigUnit3d * 0.12;
      coreRigLiftDirection3d.copy(coreRigLocalDirection3d()).negate();
      coreRigLiftStartQuaternion3d.setFromUnitVectors(coreRigLiftUp3d, coreRigLiftDirection3d);
      coreRigLiftDockQuaternion3d.copy(liftSlot3d.quaternion);
      coreRigRecoveryHeadTransferQuaternion3d.copy(coreRigLiftStartQuaternion3d).slerp(coreRigLiftDockQuaternion3d, 0.784);
      coreRigRecoveryHeadOffset3d.set(0, rigUnit3d * 0.19, 0).applyQuaternion(coreRigRecoveryHeadTransferQuaternion3d);
      coreRigRecoveryHeadTransfer3d.copy(coreRigLiftTransfer3d).add(coreRigRecoveryHeadOffset3d);
      coreRigLiftState3d.active = !reducedMotion3d; coreRigLiftState3d.elapsed = 0; coreRigRecoveryPulleyProgress3d = 0;
      coreRigLiftState3d.duration = 0.82 + Math.min(0.28, coreRigLiftStart3d.distanceTo(coreRigLiftTransfer3d) * 0.025);
      coreRigLiftState3d.slotIndex = liftSlotIndex3d; coreRigLiftState3d.sample = sample3d;
      positionCoreRigDockClamp3d(liftSlot3d); coreRigDockClamp3d.scale.setScalar(1);
      coreRigLiftMat3d.color.set(sample3d.color != null ? sample3d.color : 0xcbd5e1);
      coreRigLiftMat3d.emissive.copy(coreRigLiftMat3d.color); coreRigLiftHaloMat3d.color.copy(coreRigLiftMat3d.color);
      coreRigLiftState3d.color = coreRigLiftMat3d.color.getHex(); coreRigLiftState3d.dockFlashUntil = 0;
      coreRigLiftMesh3d.position.copy(coreRigLiftStart3d); coreRigLiftMesh3d.quaternion.copy(coreRigLiftStartQuaternion3d);
      coreRigLiftMesh3d.scale.setScalar(1); coreRigLiftMesh3d.visible = !reducedMotion3d;
      coreRigLiftHalo3d.position.copy(reducedMotion3d ? coreRigLiftDock3d : coreRigLiftStart3d);
      coreRigLiftHalo3d.scale.set(1, 0.48, 1); coreRigLiftHaloMat3d.opacity = 0.68; coreRigLiftHalo3d.visible = true;
      if (reducedMotion3d) {
        fillCoreRigReceiverSlot3d(liftSlotIndex3d, sample3d);
        coreRigLiftState3d.sample = null; coreRigLiftState3d.dockFlashUntil = Date.now() + 260;
      }
    }
    function updateCoreRigRecoveryHead3d(liftProgress3d) {
      var headProgressValue3d = Number(liftProgress3d);
      var headActive3d = !!(coreRigLiftState3d.active && !reducedMotion3d && isFinite(headProgressValue3d) && headProgressValue3d < 0.9);
      coreRigRecoveryHead3d.visible = headActive3d;
      if (!headActive3d) {
        coreRigRecoveryHead3d.scale.set(1, 1, 1);
        coreRigRecoveryHeadJawLeft3d.position.set(-coreRigRecoveryHeadJawOpen3d, -rigUnit3d * 0.11, 0);
        coreRigRecoveryHeadJawRight3d.position.set(coreRigRecoveryHeadJawOpen3d, -rigUnit3d * 0.11, 0);
        coreRigRecoveryHeadJawLeft3d.rotation.z = 0.26; coreRigRecoveryHeadJawRight3d.rotation.z = -0.26;
        return;
      }
      var safeHeadProgress3d = fpClampN(headProgressValue3d, 0, 1);
      var headAtTransfer3d = safeHeadProgress3d > 0.7;
      if (headAtTransfer3d) {
        coreRigRecoveryHead3d.position.copy(coreRigRecoveryHeadTransfer3d);
        coreRigRecoveryHead3d.quaternion.copy(coreRigRecoveryHeadTransferQuaternion3d);
      } else {
        coreRigRecoveryHeadOffset3d.set(0, rigUnit3d * 0.19, 0).applyQuaternion(coreRigLiftMesh3d.quaternion);
        coreRigRecoveryHead3d.position.copy(coreRigLiftMesh3d.position).add(coreRigRecoveryHeadOffset3d);
        coreRigRecoveryHead3d.quaternion.copy(coreRigLiftMesh3d.quaternion);
      }
      var headGrip3d = fpClampN(safeHeadProgress3d / 0.12, 0, 1);
      headGrip3d = headGrip3d * headGrip3d * (3 - 2 * headGrip3d);
      var headRelease3d = fpClampN((safeHeadProgress3d - 0.7) / 0.18, 0, 1);
      headRelease3d = headRelease3d * headRelease3d * (3 - 2 * headRelease3d);
      var headLatch3d = fpClampN(headGrip3d - headRelease3d, 0, 1);
      var headJawGap3d = coreRigRecoveryHeadJawOpen3d
        + (coreRigRecoveryHeadJawClosed3d - coreRigRecoveryHeadJawOpen3d) * headLatch3d;
      var headJawTilt3d = 0.26 + (0.09 - 0.26) * headLatch3d;
      coreRigRecoveryHeadJawLeft3d.position.set(-headJawGap3d, -rigUnit3d * 0.11, 0);
      coreRigRecoveryHeadJawRight3d.position.set(headJawGap3d, -rigUnit3d * 0.11, 0);
      coreRigRecoveryHeadJawLeft3d.rotation.z = headJawTilt3d; coreRigRecoveryHeadJawRight3d.rotation.z = -headJawTilt3d;
      var headTension3d = headAtTransfer3d ? 0 : Math.sin(fpClampN(safeHeadProgress3d / 0.7, 0, 1) * Math.PI) * 0.045;
      var headReleasePulse3d = Math.sin(headRelease3d * Math.PI) * 0.055;
      coreRigRecoveryHead3d.scale.set(
        1 + headReleasePulse3d,
        1 - headTension3d + headReleasePulse3d * 0.3,
        1 + headReleasePulse3d
      );
    }
    function updateCoreRigDockClamp3d(now3d, dockFlashing3d) {
      var clampHasTarget3d = coreRigLiftState3d.active || dockFlashing3d || coreRigReceiverNext3d.visible;
      coreRigDockClamp3d.visible = clampHasTarget3d;
      if (!clampHasTarget3d) { coreRigReceiverGroup3d.position.y = coreRigReceiverRestY3d; return; }
      if (!coreRigLiftState3d.active && !dockFlashing3d && coreRigReceiverNext3d.visible) {
        coreRigDockClamp3d.position.copy(coreRigReceiverNext3d.position); coreRigDockClamp3d.position.z += rigUnit3d * 0.05;
      }
      var clampLatch3d = 0, clampPulse3d = 1, clampRecoil3d = 0;
      if (dockFlashing3d) {
        if (reducedMotion3d) clampLatch3d = 1;
        else {
          var clampCatchProgress3d = 1 - fpClampN((coreRigLiftState3d.dockFlashUntil - now3d) / 480, 0, 1);
          clampLatch3d = fpClampN(clampCatchProgress3d * 4.2, 0, 1);
          clampLatch3d = clampLatch3d * clampLatch3d * (3 - 2 * clampLatch3d);
          clampLatch3d += Math.sin(clampLatch3d * Math.PI) * 0.08;
          var clampImpactProgress3d = fpClampN(clampCatchProgress3d * 2.5, 0, 1);
          var clampImpact3d = Math.sin(clampImpactProgress3d * Math.PI);
          clampPulse3d += clampImpact3d * 0.055; clampRecoil3d = clampImpact3d * rigUnit3d * 0.055;
        }
      }
      coreRigReceiverGroup3d.position.y = coreRigReceiverRestY3d - clampRecoil3d;
      var clampGap3d = coreRigDockClampOpen3d + (coreRigDockClampClosed3d - coreRigDockClampOpen3d) * clampLatch3d;
      var clampTilt3d = (1 - Math.min(1, clampLatch3d)) * 0.12;
      coreRigDockClampTop3d.position.set(0, clampGap3d, 0); coreRigDockClampBottom3d.position.set(0, -clampGap3d, 0);
      coreRigDockClampTop3d.rotation.z = Math.PI * 0.5 + clampTilt3d; coreRigDockClampBottom3d.rotation.z = Math.PI * 0.5 - clampTilt3d;
      coreRigDockClamp3d.scale.setScalar(clampPulse3d);
    }
    function updateCoreRigRecoveryTether3d() {
      var tetherProgress3d = fpClampN(coreRigLiftState3d.elapsed / coreRigLiftState3d.duration, 0, 1); var tetherActive3d = coreRigLiftState3d.active && !reducedMotion3d && tetherProgress3d <= 0.7;
      coreRigRecoveryTether3d.visible = tetherActive3d;
      if (!tetherActive3d) {
        coreRigRecoveryTether3d.scale.set(0.24, 1, 0.24);
        return;
      }
      var tetherTravel3d = 1 - Math.pow(1 - tetherProgress3d / 0.7, 3); coreRigRecoveryPulley3d.rotation.z += (tetherTravel3d - coreRigRecoveryPulleyProgress3d) * Math.PI * 2.6; coreRigRecoveryPulleyProgress3d = tetherTravel3d;
      coreRigRecoveryTetherVector3d.subVectors(coreRigRecoveryHead3d.position, coreRigLiftTransfer3d);
      var tetherLength3d = coreRigRecoveryTetherVector3d.length();
      if (tetherLength3d <= rigUnit3d * 0.05) {
        coreRigRecoveryTether3d.visible = false;
        return;
      }
      coreRigRecoveryTether3d.position.copy(coreRigLiftTransfer3d).addScaledVector(coreRigRecoveryTetherVector3d, 0.5);
      coreRigRecoveryTether3d.quaternion.setFromUnitVectors(coreRigLiftUp3d, coreRigRecoveryTetherVector3d.normalize());
      coreRigRecoveryTether3d.scale.set(0.24, tetherLength3d / (rigUnit3d * 2.6), 0.24);
    }
    function updateCoreRigLift3d(dt3d, now3d) {
      if (coreRigLiftState3d.active) {
        coreRigLiftState3d.elapsed += Math.max(0, Number(dt3d) || 0);
        var liftProgress3d = fpClampN(coreRigLiftState3d.elapsed / coreRigLiftState3d.duration, 0, 1);
        if (liftProgress3d < 0.7) {
          var liftRise3d = liftProgress3d / 0.7;
          liftRise3d = 1 - Math.pow(1 - liftRise3d, 3);
          coreRigLiftMesh3d.position.copy(coreRigLiftStart3d).lerp(coreRigLiftTransfer3d, liftRise3d);
        } else {
          var liftDockProgress3d = (liftProgress3d - 0.7) / 0.3;
          liftDockProgress3d = liftDockProgress3d * liftDockProgress3d * (3 - 2 * liftDockProgress3d);
          coreRigLiftMesh3d.position.copy(coreRigLiftTransfer3d).lerp(coreRigLiftDock3d, liftDockProgress3d);
        }
        var liftEase3d = liftProgress3d * liftProgress3d * (3 - 2 * liftProgress3d);
        coreRigLiftMesh3d.quaternion.copy(coreRigLiftStartQuaternion3d).slerp(coreRigLiftDockQuaternion3d, liftEase3d);
        coreRigLiftMesh3d.scale.setScalar(0.94 + Math.sin(liftProgress3d * Math.PI) * 0.14);
        coreRigLiftHalo3d.position.copy(coreRigLiftMesh3d.position);
        coreRigLiftHalo3d.scale.setScalar(0.92 + Math.sin(liftProgress3d * Math.PI * 3) * 0.12);
        coreRigLiftHaloMat3d.opacity = 0.5 + Math.sin(liftProgress3d * Math.PI) * 0.22;
        if (liftProgress3d >= 1) {
          fillCoreRigReceiverSlot3d(coreRigLiftState3d.slotIndex, coreRigLiftState3d.sample);
          coreRigLiftState3d.active = false; coreRigLiftState3d.sample = null;
          coreRigLiftState3d.dockFlashUntil = now3d + 480;
          coreRigLiftMesh3d.visible = false; coreRigLiftHalo3d.position.copy(coreRigLiftDock3d);
        }
      }
      var dockFlashing3d = now3d < coreRigLiftState3d.dockFlashUntil;
      if (!coreRigLiftState3d.active && dockFlashing3d) {
        var dockFlashProgress3d = fpClampN((coreRigLiftState3d.dockFlashUntil - now3d) / (reducedMotion3d ? 260 : 480), 0, 1);
        coreRigLiftHalo3d.visible = true; coreRigLiftHalo3d.position.copy(coreRigLiftDock3d);
        coreRigLiftHalo3d.scale.setScalar(reducedMotion3d ? 1.05 : 1.05 + (1 - dockFlashProgress3d) * 0.48);
        coreRigLiftHaloMat3d.opacity = reducedMotion3d ? 0.52 : dockFlashProgress3d * 0.68;
      } else if (!coreRigLiftState3d.active) {
        coreRigLiftHalo3d.visible = false; coreRigLiftHaloMat3d.opacity = 0.68;
      }
      updateCoreRigDockClamp3d(now3d, dockFlashing3d);
      if (coreRigReceiverNext3d.visible) {
        var nextReceiverPulse3d = coreRigLiftState3d.active && !reducedMotion3d ? 1 + Math.sin(t * 12) * 0.12 : 1;
        coreRigReceiverNext3d.scale.setScalar(nextReceiverPulse3d);
      }
      updateCoreRigRecoveryHead3d(liftProgress3d);
      updateCoreRigRecoveryTether3d();
      return coreRigLiftState3d.active || dockFlashing3d ? coreRigLiftState3d.color : null;
    }
    function updateCoreRigPulseRings3d(motion3d, now3d, deployEase3d, scanning3d, recovering3d, celebrating3d, pulseRate3d, tone3d) {
      var stage3d = coreRigState3d.stage;
      var finished3d = stage3d === 'complete' || stage3d === 'stopped' || stage3d === 'paused';
      var progress3d = fpClampN(Number(coreRigState3d.progress) || 0, 0, 1);
      var guideLength3d = Math.max(VOXEL * 0.25, coreRigPulseDirection3d.subVectors(coreRigGuideEnd3d, coreRigGuideStart3d).length());
      if (coreRigPulseDirection3d.lengthSq() < 0.0001) coreRigPulseDirection3d.set(0, -1, 0);
      else coreRigPulseDirection3d.normalize();
      coreRigPulseQuaternion3d.setFromUnitVectors(coreRigPulseNormal3d, coreRigPulseDirection3d);
      var hasSamples3d = coreRigState3d.samples.length > 0;
      var completedAt3d = coreRigState3d.celebrateUntil - 2400;
      var rippleStart3d = Math.max(completedAt3d, Number(coreRigLiftState3d.dockFlashUntil) || 0);
      var rippleProgress3d = finished3d && motion3d && celebrating3d
        ? fpClampN((now3d - rippleStart3d) / 820, 0, 1) : 1;
      coreRigPulseMat3d.color.setHex(tone3d);
      coreRigPulseMat3d.opacity = recovering3d ? 0.2
        : (finished3d ? 0.76 : (coreRigState3d.running ? (scanning3d ? 0.74 : 0.64) : (stage3d === 'deploying' ? 0.62 : 0.5)));
      for (var index3d = 0; index3d < coreRigPulseRings3d.length; index3d++) {
        var ring3d = coreRigPulseRings3d[index3d];
        if (!motion3d) {
          if (finished3d) {
            ring3d.visible = hasSamples3d && index3d === 0;
            if (ring3d.visible) {
              ring3d.position.copy(coreRigReceiverGroup3d.position);
              ring3d.position.z += rigUnit3d * 0.24;
              ring3d.quaternion.identity();
            }
          } else {
            ring3d.visible = true;
            ring3d.position.copy(coreRigGuideStart3d).addScaledVector(coreRigPulseDirection3d, guideLength3d * ((index3d + 1) / 4));
            ring3d.quaternion.copy(coreRigPulseQuaternion3d);
          }
          ring3d.scale.setScalar(1);
          continue;
        }
        if (recovering3d) {
          ring3d.visible = index3d === 0;
          if (ring3d.visible) {
            ring3d.position.copy(coreRigGuideStart3d).lerp(coreRigGuideEnd3d, progress3d);
            ring3d.quaternion.copy(coreRigPulseQuaternion3d);
            ring3d.scale.setScalar(0.64);
          } else ring3d.scale.setScalar(1);
          continue;
        }
        if (finished3d) {
          if (!hasSamples3d) {
            ring3d.visible = false; ring3d.scale.setScalar(1);
            continue;
          }
          ring3d.position.copy(coreRigReceiverGroup3d.position);
          ring3d.position.z += rigUnit3d * 0.24;
          ring3d.quaternion.identity();
          if (!motion3d || !celebrating3d || rippleProgress3d >= 1) {
            ring3d.visible = index3d === 0;
            ring3d.scale.setScalar(0.92);
          } else {
            var wave3d = fpClampN(rippleProgress3d * 1.55 - index3d * 0.18, 0, 1);
            ring3d.visible = index3d === 0 || wave3d > 0.01;
            ring3d.scale.setScalar(0.68 + wave3d * 1.08);
          }
          continue;
        }
        if (coreRigState3d.running) {
          var phase3d = motion3d ? ((t * pulseRate3d + index3d * 0.29) % 1) : ((index3d + 1) / 4);
          var trail3d = fpClampN(progress3d - (0.016 + phase3d * 0.052), 0, 1);
          ring3d.visible = true;
          ring3d.position.copy(coreRigGuideStart3d).lerp(coreRigGuideEnd3d, trail3d);
          ring3d.quaternion.copy(coreRigPulseQuaternion3d);
          ring3d.scale.setScalar(motion3d ? (scanning3d ? 0.72 + phase3d * 0.34 : 0.74 + phase3d * 0.56) : 1);
          continue;
        }
        if (stage3d === 'deploying') {
          var settle3d = fpClampN(deployEase3d * 1.55 - index3d * 0.18, 0, 1);
          var lane3d = ((index3d + 1) / 4) * settle3d;
          ring3d.visible = settle3d > 0.02;
          ring3d.position.copy(coreRigGuideStart3d).addScaledVector(coreRigPulseDirection3d, guideLength3d * lane3d);
          ring3d.quaternion.copy(coreRigPulseQuaternion3d);
          ring3d.scale.setScalar(0.58 + settle3d * 0.42);
          continue;
        }
        var previewPhase3d = motion3d ? ((t * 0.55 + index3d * 0.28) % 1) : 0;
        ring3d.visible = true;
        ring3d.position.copy(coreRigGuideStart3d).addScaledVector(coreRigPulseDirection3d, guideLength3d * ((index3d + 1) / 4));
        ring3d.quaternion.copy(coreRigPulseQuaternion3d);
        ring3d.scale.setScalar(motion3d ? 0.9 + previewPhase3d * 0.34 : 1);
      }
    }
    function updateCoreRigLoadCouplers3d(dt3d, motion3d, scanning3d, feedSpeed3d) {
      var drillingLoadActive3d = !!(coreRigState3d.running && !scanning3d && coreRigState3d.stage !== 'cooling');
      var formationLoad3d = coreRigState3d.formationLoad === 'Hard' ? 1
        : (coreRigState3d.formationLoad === 'Dense' ? 0.7
          : (coreRigState3d.formationLoad === 'Crystalline' ? 0.45
            : (coreRigState3d.formationLoad === 'Loose' ? 0.18 : 0.25)));
      var stressLoad3d = fpClampN(Number(coreRigState3d.intervalStress) || 0, 0, 1);
      var feedLoad3d = fpClampN(((Number(feedSpeed3d) || 1) - 0.72) / 0.73, 0, 1);
      var targetLoad3d = drillingLoadActive3d
        ? fpClampN(formationLoad3d * 0.58 + feedLoad3d * 0.22 + stressLoad3d * 0.32, 0, 1)
        : 0;
      var safeLoadDt3d = Math.max(0, Number(dt3d) || 0);
      var loadResponse3d = motion3d
        ? 1 - Math.exp(-safeLoadDt3d * (targetLoad3d > coreRigLoadCompression3d ? 12 : 8))
        : 1;
      coreRigLoadCompression3d += (targetLoad3d - coreRigLoadCompression3d) * loadResponse3d;
      var loadSpacing3d = rigUnit3d * (0.24 - coreRigLoadCompression3d * 0.08);
      for (var loadIndex3d = 0; loadIndex3d < coreRigLoadCouplers3d.length; loadIndex3d++) {
        var activeCoupler3d = coreRigLoadCouplers3d[loadIndex3d];
        activeCoupler3d.position.y = -rigUnit3d * 1.82 - loadIndex3d * loadSpacing3d;
        activeCoupler3d.scale.set(
          1 + coreRigLoadCompression3d * 0.055,
          1 - coreRigLoadCompression3d * 0.045,
          1 + coreRigLoadCompression3d * 0.055
        );
        if (!motion3d) {
          activeCoupler3d.rotation.y = loadIndex3d * Math.PI * 0.66;
        } else if (drillingLoadActive3d) {
          activeCoupler3d.rotation.y += safeLoadDt3d * (2.2 + coreRigLoadCompression3d * 5.8)
            * (loadIndex3d === 1 ? -0.72 : (loadIndex3d === 2 ? 0.42 : 1));
        }
      }
      return coreRigLoadCompression3d;
    }
        function updateCoreRigContact3d(motion3d, scanning3d, coolantFlash3d, tone3d) {
      coreRigContact3d.visible = !!coreRigState3d.running;
      if (!coreRigContact3d.visible) {
        coreRigContact3d.scale.setScalar(1);
        return;
      }
      var contactProgress3d = fpClampN(Number(coreRigState3d.progress) || 0, 0, 1);
      var contactPressure3d = fpClampN(Number(coreRigState3d.intervalStress) || 0, 0, 1);
      coreRigContact3d.position.copy(coreRigGuideStart3d).lerp(coreRigGuideEnd3d, contactProgress3d);
      coreRigContact3d.position.addScaledVector(coreRigPulseDirection3d, -VOXEL * 0.46);
      coreRigContact3d.quaternion.copy(coreRigPulseQuaternion3d);
      coreRigContactMat3d.color.setHex(tone3d);
      coreRigContactMat3d.opacity = scanning3d ? 0.38 : (coolantFlash3d ? 0.88 : 0.58 + contactPressure3d * 0.18);
      var contactScale3d = motion3d && !scanning3d
        ? 0.88 + contactPressure3d * 0.34 + Math.sin(t * (coolantFlash3d ? 20 : 13)) * 0.055
        : 1;
      coreRigContact3d.scale.setScalar(contactScale3d);
    }
function updateCoreRig3d(dt3d) {
      if (!coreRigState3d.deployed) return;
      var motion3d = reducedMotion3d ? 0 : 1;
      var trajectoryVariability3d = coreRigState3d.trajectoryScan ? coreRigState3d.trajectoryScan.variability : 'steady';
      var trajectoryPulseRate3d = trajectoryVariability3d === 'volatile' ? 1.1 : (trajectoryVariability3d === 'mixed' ? 0.86 : 0.7);
      var coreRigNow3d = Date.now();
      var scanning3d = coreRigIntervalScanning(coreRigState3d.scanUntil, coreRigNow3d, coreRigState3d.running, coreRigState3d.currentVoxel);
      var deployEase3d = 1;
      if (coreRigState3d.stage === 'deploying') {
        var deployProgress3d = fpClampN((coreRigNow3d - coreRigState3d.deployedAt) / 520, 0, 1);
        deployEase3d = 1 - Math.pow(1 - deployProgress3d, 3);
        coreRigGroup3d.scale.setScalar(0.04 + deployEase3d * 0.96);
        coreRigGroup3d.updateMatrixWorld(true);
        coreRigLight3d.intensity = 0.5 + deployEase3d * 1.1;
        if (deployProgress3d >= 1) {
          coreRigState3d.stage = 'preview';
          coreRigState3d.status = coreRigState3d.path.length
            ? ('Bore preview · ' + coreRigState3d.path.length + ' recoverable intervals')
            : 'Trajectory unavailable · change angle, depth, or position';
          notifyCoreRigState3d(true);
        }
      }
      var feedProfile3d = coreRigFeedProfile(coreRigState3d.feedMode);
      var coolantFlash3d = coreRigNow3d < coreRigState3d.coolantFlashUntil;
      var gradeTone3d = CORE_RIG_GRADE_TONES_3D;
      var celebrating3d = !!(coreRigState3d.evaluation && coreRigNow3d < coreRigState3d.celebrateUntil);
      var trajectoryRisk3d = coreRigState3d.trajectoryScan ? coreRigState3d.trajectoryScan.riskLevel : 'limited';
      var baseTone3d = trajectoryRisk3d === 'clear' ? 0x22d3ee
        : (trajectoryRisk3d === 'caution' ? 0xfbbf24 : 0xfb7185);
      var scanTone3d = coreRigState3d.idealFeedMode === 'torque' ? 0xf59e0b : (coreRigState3d.idealFeedMode === 'preserve' ? 0x22d3ee : 0x34d399);
      var activeTone3d = coolantFlash3d ? 0x7dd3fc : (scanning3d ? scanTone3d : (celebrating3d ? (gradeTone3d[coreRigState3d.evaluation.grade] || baseTone3d) : baseTone3d));
      coreRigTargetMat3d.color.setHex(activeTone3d); coreRigCyanMat3d.color.setHex(activeTone3d); coreRigLight3d.color.setHex(activeTone3d);
      coreRigGuideMat3d.opacity = (scanning3d ? 0.76 : 0.62) + (motion3d ? (Math.sin(t * (scanning3d ? 8.4 : trajectoryPulseRate3d * 7.7)) + 1) * 0.11 : 0.1);
      coreRigRotor3d.rotation.x += dt3d * (coreRigState3d.running ? (scanning3d ? 2.2 : 10 * feedProfile3d.speedMultiplier) : 1.4) * motion3d;
      coreRigBit3d.rotation.y += dt3d * (coreRigState3d.running ? (scanning3d ? 4.4 : 22 * feedProfile3d.speedMultiplier) : 0.8) * motion3d;
      coreRigTarget3d.rotation.y += dt3d * 1.2 * motion3d;
      coreRigTarget3d.scale.setScalar(scanning3d && motion3d ? 1.08 + Math.sin(t * 12) * 0.09 : (celebrating3d && motion3d ? 1.08 + Math.sin(t * 11) * 0.16 : 1));
      coreRigLight3d.intensity = 0.9 + (coreRigState3d.running ? 0.8 : 0.25) + (scanning3d ? 0.5 : 0) + (celebrating3d ? 0.75 : 0) + Math.sin(t * 5) * 0.12 * motion3d;
      var coreRigRecoveryTone3d = updateCoreRigLift3d(dt3d, coreRigNow3d);
      if (coreRigRecoveryTone3d != null) {
        coreRigLight3d.color.setHex(coreRigRecoveryTone3d);
        coreRigLight3d.intensity += reducedMotion3d ? 0.32 : 0.72;
      }
      updateCoreRigPulseRings3d(
        motion3d, coreRigNow3d, deployEase3d, scanning3d,
        coreRigRecoveryTone3d != null, celebrating3d,
        coolantFlash3d ? 2.2 : (scanning3d ? 1.8 : 0.94),
        coreRigRecoveryTone3d != null ? coreRigRecoveryTone3d : activeTone3d
      );
      updateCoreRigContact3d(motion3d, scanning3d, coolantFlash3d, activeTone3d);
      var rigLoadCompression3d = updateCoreRigLoadCouplers3d(dt3d, motion3d, scanning3d, feedProfile3d.speedMultiplier);
      var assemblyDirection3d = coreRigAssemblyDirection3d.subVectors(coreRigGuideEnd3d, coreRigGuideStart3d);
      if (assemblyDirection3d.lengthSq() < 0.0001) assemblyDirection3d.copy(coreRigLocalDirection3d());
      else assemblyDirection3d.normalize();
      coreRigAssembly3d.position.copy(coreRigGuideStart3d).addScaledVector(assemblyDirection3d, -rigUnit3d * 3.33);
      // Local -Y maps into the guide axis, so positive guide travel seats the bit under load.
      coreRigAssembly3d.position.addScaledVector(assemblyDirection3d, rigUnit3d * 0.08 * rigLoadCompression3d);
      if (coreRigState3d.running && motion3d && !scanning3d && coreRigState3d.stage !== 'cooling') {
        coreRigAssembly3d.position.x += Math.sin(t * (32 + feedProfile3d.speedMultiplier * 10))
          * rigUnit3d * (0.004 + rigLoadCompression3d * 0.016);
      }
      coreRigFeedGlow3d.visible = !!coreRigState3d.running;
      if (coreRigFeedGlow3d.visible) {
        coreRigFeedGlow3d.position.copy(coreRigGuideStart3d).lerp(coreRigGuideEnd3d, fpClampN(coreRigState3d.progress, 0, 1));
        var feedPulse3d = motion3d ? 0.8 + (Math.sin(t * 18) + 1) * 0.22 : 1;
        coreRigFeedGlow3d.scale.setScalar(feedPulse3d);
      }
      if (!coreRigState3d.running) {
        if (coreRigState3d.heat > 0) {
          coreRigState3d.heat = Math.max(0, coreRigState3d.heat - dt3d * 0.22);
          updateCoreRigHudDom3d();
        }
        return;
      }
      if (scanning3d) {
        updateCoreRigHudDom3d();
        return;
      }
      if (coreRigState3d.scanUntil) {
        coreRigState3d.scanUntil = 0;
        coreRigState3d.status = 'Feed engaged · ' + coreRigState3d.formationLoad + ' load · ' + coreRigFeedProfile(coreRigState3d.feedMode).label + ' response';
        notifyCoreRigState3d(true);
      }
      if (coreRigState3d.stage === 'cooling') {
        coreRigState3d.heat = Math.max(0, coreRigState3d.heat - dt3d * 0.4);
        coreRigState3d.status = 'Auto-cooling drill head · ' + Math.round(coreRigState3d.heat * 100) + '%';
        if (coreRigState3d.heat <= 0.38) { coreRigState3d.stage = 'drilling'; coreRigState3d.status = 'Cooling complete · resuming the protected core'; }
        notifyCoreRigState3d(false); return;
      }
      if (!coreRigState3d.currentVoxel && !prepareCoreRigStep3d()) return;
      coreRigState3d.currentElapsed += Math.max(0, dt3d * 1000 * feedProfile3d.speedMultiplier);
      coreRigState3d.heat = Math.min(1, coreRigState3d.heat + dt3d * (0.11 + coreRigState3d.currentDuration / 5200) * feedProfile3d.heatMultiplier);
      coreRigState3d.intervalStress += coreRigIntegrityLoss(coreRigState3d.idealFeedMode, coreRigState3d.feedMode, coreRigState3d.heat, dt3d);
      coreRigState3d.intervalPeakHeat = Math.max(coreRigState3d.intervalPeakHeat, coreRigState3d.heat);
      var stepProgress3d = coreRigState3d.currentDuration ? fpClampN(coreRigState3d.currentElapsed / coreRigState3d.currentDuration, 0, 1) : 1;
      coreRigState3d.progress = coreRigState3d.path.length ? (coreRigState3d.cursor + stepProgress3d) / coreRigState3d.path.length : 1;
      coreRigFeedGlow3d.position.copy(coreRigGuideStart3d).lerp(coreRigGuideEnd3d, fpClampN(coreRigState3d.progress, 0, 1));
      if (coreRigState3d.heat >= 0.86 && stepProgress3d < 1) {
        coreRigState3d.stage = 'cooling'; coreRigState3d.status = 'Thermal pause · protecting the recovered core';
        notifyCoreRigState3d(true); return;
      }
      if (stepProgress3d >= 1) {
        var drilledVoxel3d = coreRigState3d.currentVoxel, drilledCell3d = coreRigState3d.currentCell;
        var drilledMaterial3d = SCENE.palette[drilledVoxel3d.key] || ROCKS[drilledVoxel3d.key] || { name: drilledVoxel3d.key || 'Rock', type: '', color: 0xcbd5e1 };
        var result3d = excavateVoxel(drilledVoxel3d, 'core-rig');
        if (result3d) {
          var intervalIntegrity3d = coreRigIntegrityFromStress(coreRigState3d.intervalStress);
          var sample3d = { key: drilledVoxel3d.key, name: drilledMaterial3d.name, type: drilledMaterial3d.type || 'Rock', color: drilledMaterial3d.color || 0xcbd5e1, depth: drilledCell3d.depth, integrity: intervalIntegrity3d };
          coreRigState3d.pristineStreak = intervalIntegrity3d >= 0.97 ? coreRigState3d.pristineStreak + 1 : 0;
          coreRigState3d.bestPristineStreak = Math.max(coreRigState3d.bestPristineStreak, coreRigState3d.pristineStreak);
          coreRigState3d.lastIntervalResult = coreRigIntervalFeedback(sample3d.name, intervalIntegrity3d, coreRigState3d.pristineStreak);
          coreRigState3d.samples.push(sample3d); addCoreRigSampleMarker3d(sample3d, drilledVoxel3d);
          beginCoreRigLift3d(sample3d, drilledVoxel3d);
          if (window._alloHaptic) { try { window._alloHaptic('break'); } catch (coreRigSampleHapticError3d) {} }
        }
        coreRigState3d.cursor += 1; coreRigState3d.currentVoxel = null; coreRigState3d.currentCell = null;
        coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = 0;
        coreRigState3d.progress = coreRigState3d.path.length ? coreRigState3d.cursor / coreRigState3d.path.length : 1;
        if (!prepareCoreRigStep3d()) return;
      }
      notifyCoreRigState3d(false);
    }
    function cancelCoreRig3d() {
      if (!coreRigState3d.deployed) return coreRigError3d('Deploy the rig before ending a bore.', 'packed');
      if (!coreRigState3d.running) return { ok: true, state: coreRigSnapshot3d() };
      var report3d = finishCoreRig3d('cancelled');
      return { ok: true, report: report3d, state: coreRigSnapshot3d() };
    }
    function packCoreRig3d() {
      if (!coreRigState3d.deployed) return { ok: true, state: coreRigSnapshot3d() };
      if (coreRigState3d.running) return coreRigError3d('The rig is actively drilling. End the bore safely before packing it.', 'running');
      coreRigState3d.deployed = false; coreRigState3d.running = false; coreRigState3d.stage = 'packed'; coreRigState3d.status = 'Pack ready';
      coreRigState3d.origin = null; coreRigState3d.path = []; coreRigState3d.samples = []; coreRigState3d.cursor = 0;
      coreRigState3d.currentCell = null; coreRigState3d.currentVoxel = null; coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = 0;
      coreRigState3d.progress = 0; coreRigState3d.heat = 0; coreRigState3d.stopReason = null; coreRigState3d.plannedStop = null; coreRigState3d.trajectoryScan = null;
      coreRigState3d.feedMode = 'cruise'; coreRigState3d.coolantRemaining = 2; coreRigState3d.coolantUsed = 0;
      coreRigState3d.formationLoad = null; coreRigState3d.idealFeedMode = 'cruise'; coreRigState3d.intervalStress = 0; coreRigState3d.intervalPeakHeat = 0;
      coreRigState3d.pristineStreak = 0; coreRigState3d.bestPristineStreak = 0;
      coreRigState3d.evaluation = null; coreRigState3d.deployedAt = 0; coreRigState3d.celebrateUntil = 0; coreRigState3d.coolantFlashUntil = 0;
      coreRigState3d.scanUntil = 0; coreRigState3d.lastIntervalResult = null;
      clearCoreRigBoreMarkers3d(); coreRigFeedGlow3d.visible = false;
      for (var packedRingIndex3d = 0; packedRingIndex3d < coreRigPulseRings3d.length; packedRingIndex3d++) {
        coreRigPulseRings3d[packedRingIndex3d].visible = false;
        coreRigPulseRings3d[packedRingIndex3d].scale.setScalar(1);
      }
      coreRigContact3d.visible = false; coreRigContact3d.scale.setScalar(1);
      coreRigGroup3d.scale.setScalar(1); coreRigGroup3d.visible = false; notifyCoreRigState3d(true);
      return { ok: true, state: coreRigSnapshot3d() };
    }
    function fpCompleteMining() {
      var mining = fp.mining; if (!mining) return null;
      fp.mining = null; fpSetMiningProgress(0, false);
      if (mining.tool === 'drill' && mining.duration === 0) {
        fp.drillHeat = Math.min(1, fp.drillHeat + fpDrillHeatRate(mining.profile) * fpToolMiningDuration(mining.profile, 'drill') / 1000);
      }
      var result = excavateVoxel(mining.voxel);
      if (result && window._alloHaptic) { try { window._alloHaptic('break'); } catch (e) {} }
      fp.targetKey = '__refresh'; fpTargetVoxel();
      return result;
    }
    function fpUpdateMining(dt) {
      if (!fp.mining) return;
      if (!fp.target || vkey(fp.target) !== fp.mining.id) { fpCancelMining(); return; }
      fp.mining.elapsed += Math.max(0, dt * 1000);
      var progress = fp.mining.duration > 0 ? fp.mining.elapsed / fp.mining.duration : 1;
      fpSetMiningProgress(progress, true);
      if (progress >= 1) fpCompleteMining();
    }
    function fpMineAtCrosshair(instant, chained) {
      if (coreRigState3d.deployed) {
        fp.drillHeld = false;
        return chained ? null : coreRigError3d('Pack the directional core rig before hand mining.', coreRigState3d.running ? 'rig-running' : 'rig-deployed');
      }
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (fp.mining) return { pending: true, progress: fp.mining.duration ? fp.mining.elapsed / fp.mining.duration : 1 };
      if (fp.tool === 'drill' && fp.drillOverheated && !instant) { if (!chained && opts.onFlash) opts.onFlash('The drill is cooling. Switch to the pickaxe or wait for the heat meter.'); return null; }
      if (!chained && fp.lastMineAt && now - fp.lastMineAt < 140) return null;
      fp.lastMineAt = now;
      var v = fpTargetVoxel();
      if (!v) { if (!chained && opts.onFlash) opts.onFlash('Move closer and aim the reticle at an exposed block.'); return null; }
      var material = SCENE.palette[v.key] || ROCKS[v.key] || { name: v.key || 'Rock', type: '' };
      var profile = fpMiningProfile(v.key, material.type);
      if (!profile.mineable) { fp.drillHeld = false; if (!chained && opts.onFlash) opts.onFlash(profile.reason); return null; }
      var duration = fpToolMiningDuration(profile, fp.tool);
      fp.drillNextAt = now + Math.max(90, duration);
      fp.mining = { id: vkey(v), voxel: v, elapsed: 0, duration: (instant || fp.reduced) ? 0 : duration, profile: profile, tool: fp.tool };
      fpSetMiningProgress(0, true);
      if (!fp.mining.duration) return fpCompleteMining();
      if (window._alloHaptic) { try { window._alloHaptic('selection'); } catch (e) {} }
      return { pending: true, duration: fp.mining.duration, hardness: profile.label, tool: fp.tool };
    }
    function fpUndoMine() {
      if (coreRigState3d.running) return coreRigError3d('The active bore must finish before excavation can be undone.', 'rig-running');
      if (coreRigState3d.deployed) return coreRigError3d('Pack the directional core rig before undoing excavation.', 'rig-deployed');
      fpCancelMining();
      var restored = undoExcavation();
      if (!restored) { if (opts.onFlash) opts.onFlash('There is no excavation to undo yet.'); return null; }
      if (opts.onFlash) opts.onFlash('Restored ' + restored.name + '. ' + restored.remaining + ' excavated block' + (restored.remaining === 1 ? '' : 's') + ' remain.');
      fp.targetKey = '__refresh'; fpTargetVoxel();
      return restored;
    }
    function fpRedoMine() {
      if (coreRigState3d.running) return coreRigError3d('The active bore must finish before excavation can be redone.', 'rig-running');
      if (coreRigState3d.deployed) return coreRigError3d('Pack the directional core rig before redoing excavation.', 'rig-deployed');
      fpCancelMining();
      var redone = redoExcavation();
      if (!redone) { if (opts.onFlash) opts.onFlash('There is no excavation to redo yet.'); return null; }
      if (opts.onFlash) opts.onFlash('Re-excavated ' + redone.name + '.');
      fp.targetKey = '__refresh'; fpTargetVoxel();
      return redone;
    }
    function notifyExcavationChange() {
      if (opts.onExcavateChange) opts.onExcavateChange(excavationHistory.length, { history: excavationHistory.slice(), redo: excavationRedo.slice() });
    }
    function updateUndoPreview() {
      var target = undoPreviewRequested && !fp.active ? undoPreviewTarget(excavationHistory, voxelByKey, removed, sliceZ, focusLens, showStage, FORMED_AT, NZ) : null;
      undoPreviewKey = target ? vkey(target) : null;
      if (target) { var p = worldPos(target); undoPreviewBox.position.set(p[0], p[1], p[2]); }
      undoPreviewBox.visible = !!target;
      return undoPreviewBox.visible;
    }
    function shallowest(x, z) { return firstSolidVoxelY(voxelByKey, removed, x, z, NY); }
    function excavateVoxel(v, method) {
      if (!v || v.key === 'void') return null;
      var id = vkey(v); if (removed[id]) return null;
      spawnExcavationBurst3d(v);
      removed[id] = 1; excavationHistory.push(id); excavationRedo = []; rebuild(); notifyExcavationChange();
      if (opts.onUncover && SED_FOSSIL[v.key] && hasFossilAt(v.x, v.y, v.z)) opts.onUncover(v.key);
      var below = shallowest(v.x, v.z);
      var belowVoxel = below == null ? null : voxelByKey[v.x + ',' + below + ',' + v.z];
      if (belowVoxel && opts.onSelect && method !== 'core-rig') opts.onSelect(rockFacts(belowVoxel.key, belowVoxel.y));
      var material = SCENE.palette[v.key] || ROCKS[v.key] || { name: v.key || 'material' };
      if (surveyVoxelKey === id) { surveyBox.visible = false; surveyVoxelKey = null; }
      if (opts.onFlash && method !== 'core-rig') opts.onFlash('Excavated ' + material.name + '. ' + (belowVoxel ? 'The layer beneath is now exposed.' : 'That column is now fully excavated.'));
      var result = { removedKey: v.key, removedY: v.y, name: material.name, exposedKey: belowVoxel ? belowVoxel.key : null, count: excavationHistory.length, firstPerson: !!fp.active, method: method || 'hand' };
      if (opts.onExcavate) opts.onExcavate(result);
      return result;
    }
    function undoExcavation() {
      while (excavationHistory.length) {
        var id = excavationHistory.pop();
        if (!removed[id]) continue;
        delete removed[id]; excavationRedo.push(id);
        var restored = voxelByKey[id]; rebuild(); notifyExcavationChange();
        if (!restored) return null;
        var material = SCENE.palette[restored.key] || ROCKS[restored.key] || { name: restored.key || 'material' };
        return { key: restored.key, y: restored.y, name: material.name, remaining: excavationHistory.length, redoCount: excavationRedo.length };
      }
      notifyExcavationChange(); return null;
    }
    function redoExcavation() {
      while (excavationRedo.length) {
        var id = excavationRedo.pop(), voxel = voxelByKey[id];
        if (!voxel || voxel.key === 'void' || removed[id]) continue;
        spawnExcavationBurst3d(voxel); removed[id] = 1; excavationHistory.push(id); rebuild(); notifyExcavationChange();
        var material = SCENE.palette[voxel.key] || ROCKS[voxel.key] || { name: voxel.key || 'material' };
        return { key: voxel.key, y: voxel.y, name: material.name, count: excavationHistory.length, redoCount: excavationRedo.length };
      }
      notifyExcavationChange(); return null;
    }
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
        excavateVoxel(v);
      } else {
        if (opts.onUncover && SED_FOSSIL[v.key] && hasFossilAt(v.x, v.y, v.z)) opts.onUncover(v.key);
        if (opts.onSelect) opts.onSelect(rockFacts(v.key, v.y));
      }
    }
    function onDown(e) { down = { x: e.clientX, y: e.clientY }; if (fp.active) fpPrev = { x: e.clientX, y: e.clientY }; }
    function onUp(e) { if (!down) return; var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); down = null; fpPrev = null; if (moved < 6) { if (fp.active) fpMineAtCrosshair(); else pick(e); } }
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
      fp.layersReached = {}; fp.enteredAt = (window.performance && performance.now) ? performance.now() : Date.now(); heatVignetteLevel = -1;
      undoPreviewRequested = false; updateUndoPreview();
      fp.savedPos = camera.position.clone();
      fp.savedTgt = controls ? controls.target.clone() : TARGET.clone();
      fp.savedEnabled = controls ? controls.enabled : true;
      if (controls) controls.enabled = false;                // hand the camera to FP
      var seed = fpSeedPose(SCENE.id);
      fp.mode = fpExplorerMode(SCENE.id);
      fp.pos = { x: seed.pos.x, y: seed.pos.y, z: seed.pos.z }; fp.yaw = seed.yaw; fp.pitch = seed.pitch;
      fp.input = { fwd: 0, strafe: 0, vert: 0, jump: false, sprint: false }; fp.turn = { yaw: 0, pitch: 0 };
      fp.velocity = { x: 0, y: 0, z: 0 }; fp.onGround = false; fp.jumpLatch = false; fp.target = null; fp.targetKey = '__none'; fp.lastMineAt = 0; fp.lastKey = '__none'; fp.lastHud = 0; fp.medium = 'air'; fp.mining = null; fp.tool = (o && o.tool === 'drill') ? 'drill' : 'pick'; fp.drillHeat = 0; fp.drillOverheated = false; fp.drillHeld = false; fp.drillHudAt = 0; fp.drillNextAt = 0; fp.safePose = { pos: { x: seed.pos.x, y: seed.pos.y, z: seed.pos.z }, yaw: seed.yaw, pitch: seed.pitch }; fp.lastSafeAt = 0; fp.hazardNearby = false; fp.blockedUntil = 0; fp.statusKey = '__refresh'; cnv.dataset.geologyPlayerMedium = 'air'; fpSetMiningProgress(0, false);
      cnv.dataset.geologyFirstPersonInteraction = fp.mode === 'mine' ? 'grounded-collision-jump-and-reticle-mining' : 'radial-flight-and-reticle-mining';
      fp.intro = fp.reduced ? null : { t: 0, from: camera.position.clone(), dur: 0.7 };   // eased "drop in"
      hoverBox.visible = false;
      cnv.addEventListener('pointermove', fpLookMove);
      if (fp.reduced) applyFP(0);                            // snap to the eye-point immediately
    }
    function exitFP(silentRigAbort3d) {
      if (!fp.active) return;
      if (coreRigState3d.deployed) {
        if (coreRigState3d.running && !silentRigAbort3d) finishCoreRig3d('cancelled');
        else if (coreRigState3d.running) coreRigState3d.running = false;
        packCoreRig3d();
      }
      fp.active = false; fp.intro = null; fp.drillHeld = false; fpCancelMining();
      if (heatVignette) { heatVignette.style.opacity = '0'; heatVignetteLevel = -1; }
      cnv.removeEventListener('pointermove', fpLookMove); fpPrev = null;
      fp.input = { fwd: 0, strafe: 0, vert: 0, jump: false, sprint: false }; fp.turn = { yaw: 0, pitch: 0 };
      fp.velocity = { x: 0, y: 0, z: 0 }; fp.target = null; fpUpdateTargetLabel(null); hoverBox.visible = false; surveyBox.visible = false; surveyVoxelKey = null;
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
      if (fp.aim) {                                           // survey aim tween — abandoned as soon as the player looks on their own
        var aim = fp.aim;
        if (fp.turn.yaw || fp.turn.pitch || Math.abs(fp.yaw - aim.lastYaw) > 1e-6 || Math.abs(fp.pitch - aim.lastPitch) > 1e-6) fp.aim = null;
        else {
          aim.t = aim.dur > 0 ? Math.min(1, aim.t + dt / aim.dur) : 1; var ae = easeInOutCubic(aim.t);
          fp.yaw = aim.fromYaw + aim.dYaw * ae; fp.pitch = fpClampPitch(aim.fromPitch + aim.dPitch * ae);
          aim.lastYaw = fp.yaw; aim.lastPitch = fp.pitch;
          if (aim.t >= 1) fp.aim = null;
        }
      }
      var fwd = fpForward(fp.yaw, fp.pitch);
      var spd = fp.speed * (fp.input.sprint ? 2 : 1);
      if (fp.mode === 'mine') fpWalkStep(dt, fwd);
      else fp.pos = fpStep(fp.pos, fwd, fp.input, dt, spd, fpBounds());
      var moving = !!(fp.input.fwd || fp.input.strafe || (fp.mode === 'fly' && fp.input.vert));
      var bob = fpBob(t, moving && (fp.mode === 'fly' || fp.onGround), fp.reduced, fp.mode === 'mine' ? 0.035 : 0.05);
      if (fp.landDip) { bob -= fp.landDip; fp.landDip *= Math.exp(-11 * dt); if (fp.landDip < 0.002) fp.landDip = 0; }
      camera.position.set(fp.pos.x, fp.pos.y + bob, fp.pos.z);
      camera.lookAt(fp.pos.x + fwd.x, fp.pos.y + fwd.y, fp.pos.z + fwd.z);
      fpTargetVoxel();
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

    var t = 0, raf = null, fpLastFrameAt = 0;
    function loop() {
      if (eng.disposed) return; raf = requestAnimationFrame(loop); t += 0.016;
      var fpFrameAt = (window.performance && performance.now) ? performance.now() : 0;
      var fpDt = (fpFrameAt && fpLastFrameAt) ? Math.min(0.05, Math.max(0.001, (fpFrameAt - fpLastFrameAt) / 1000)) : 0.016;
      fpLastFrameAt = fpFrameAt;
      if (container.clientWidth > 0 && (container.clientWidth !== lastW || container.clientHeight !== lastH)) resize(); // keep the canvas fitted to its container (robust in sandboxed iframes / late layout)
      var geologyMotionTime3d = reducedMotion3d ? 0.86 : t;
      magmaGlow.intensity = geologyHeatLightConfig3d.intensity + Math.sin(geologyMotionTime3d * 2) * geologyHeatLightConfig3d.flicker;
      magmaGlow.color.copy(magmaGlowBaseColor3d);
      if (underGlow.visible) underGlow.material.opacity = 0.1 + Math.sin(geologyMotionTime3d * 1.7) * 0.025;
      if (waterMesh.visible) waterMesh.material.opacity = 0.31 + Math.sin(geologyMotionTime3d * 1.6) * 0.045;
      geologyWaterTexture3d.offset.x = reducedMotion3d ? 0 : (t * 0.009) % 1;
      geologyWaterTexture3d.offset.y = reducedMotion3d ? 0 : (t * 0.004) % 1;
      updateGeologyOceanSurface3d(geologyMotionTime3d);
      updateGeologySurfaceEffects3d(geologyMotionTime3d);
      updateGeologyHydrothermalField3d(geologyMotionTime3d);
      updateGeologyVolcanicAtmosphere3d(geologyMotionTime3d);
      updateGeologyAlpineClouds3d(geologyMotionTime3d);
      updateSurveyMarker3d();
      updateCoreRig3d(fpDt);
      for (var atmosphereUpdateIndex3d = 0; atmosphereUpdateIndex3d < atmosphereMoteCount3d; atmosphereUpdateIndex3d++) {
        var atmosphereUpdatePhase3d = atmosphereMotePhases3d[atmosphereUpdateIndex3d];
        atmosphereMotePositions3d[atmosphereUpdateIndex3d * 3] = atmosphereMoteBase3d[atmosphereUpdateIndex3d * 3] +
          (reducedMotion3d ? 0 : Math.sin(t * 0.13 + atmosphereUpdatePhase3d) * 0.08);
        atmosphereMotePositions3d[atmosphereUpdateIndex3d * 3 + 1] = atmosphereMoteBase3d[atmosphereUpdateIndex3d * 3 + 1] +
          (reducedMotion3d ? 0 : Math.cos(t * 0.1 + atmosphereUpdatePhase3d) * 0.075);
        atmosphereMotePositions3d[atmosphereUpdateIndex3d * 3 + 2] = atmosphereMoteBase3d[atmosphereUpdateIndex3d * 3 + 2] +
          (reducedMotion3d ? 0 : Math.sin(t * 0.08 + atmosphereUpdatePhase3d * 1.4) * 0.06);
      }
      atmosphereMoteGeometry3d.attributes.position.needsUpdate = true;
      geologyHazeSprites3d.forEach(function (geologyHazeSprite3d) {
        geologyHazeSprite3d.material.opacity = geologyHazeSprite3d.userData.baseOpacity *
          (reducedMotion3d ? 1 : 0.9 + Math.sin(t * 0.17 + geologyHazeSprite3d.userData.phase) * 0.1);
      });
      updateGeologyProcessTracers3d(geologyMotionTime3d);
      updateGeologyDeepEarthVisuals3d(geologyMotionTime3d);
      glowVoxelMaterial3d.opacity = (SCENE.id === 'deepEarth' ? 0.28 : 0.36) *
        (reducedMotion3d ? 1 : 0.88 + Math.sin(t * 1.1) * 0.12);
      if (crystalShardMaterials3d.length) {
        crystalShardMaterials3d[0].emissiveIntensity = reducedMotion3d ? 0.18 : 0.16 + (Math.sin(t * 0.72) + 1) * 0.035;
        crystalShardMaterials3d[1].emissiveIntensity = reducedMotion3d ? 0.22 : 0.19 + (Math.cos(t * 0.81) + 1) * 0.045;
      }
      updateExcavationEffects3d();
      try { updateEruption(); } catch (e) {}
      if (!controls) ensureControls();   // OrbitControls may load a moment after the engine starts
      if (fp.active) { try { applyFP(fpDt); fpUpdateMining(fpDt); fpUpdateDrill(fpDt); fpUpdatePlayerStatus(); } catch (e) {} } else if (controls) controls.update();
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
      var V = { iso: [[NX * 1.15 * isoSideX3d, NY * 1.05, NZ * 1.4], [0, -NY * 0.18, 0]], front: [[0, -NY * 0.1, NZ * 1.75], [0, -NY * 0.18, 0]], top: [[0.01, NY * 2.4, 0.02], [0, 0, 0]] }[name];
      if (!V) return;
      camera.position.set(V[0][0], V[0][1], V[0][2]);
      TARGET.set(V[1][0], V[1][1], V[1][2]);
      if (controls) { controls.target.copy(TARGET); controls.update(); }
      else camera.lookAt(TARGET);
    };
    eng.setSlice = function (z) {
      sliceZ = cutawayReadout(z, NZ).step;
      waterMesh.scale.y = (NZ - sliceZ) / NZ; waterMesh.position.z = -sliceZ / 2 * VOXEL;
      if (oceanSurfaceMesh3d) {
        oceanSurfaceMesh3d.scale.y = (NZ - sliceZ) / NZ;
        oceanSurfaceMesh3d.position.z = -sliceZ / 2 * VOXEL;
      }
      if (oceanCausticMesh3d) {
        oceanCausticMesh3d.scale.y = (NZ - sliceZ) / NZ;
        oceanCausticMesh3d.position.z = -sliceZ / 2 * VOXEL;
      }
      rebuild();
    };
    eng.setExcavate = function (b) { excavate = !!b && !focusLens; return excavate; };
    eng.excavateAt = function (x, z) {
      x = Math.round(Number(x)); z = Math.round(Number(z));
      if (!excavate || focusLens || !isFinite(x) || !isFinite(z) || x < 0 || x >= NX || z < 0 || z >= NZ - sliceZ) return null;
      var y = shallowest(x, z), voxel = y == null ? null : voxelByKey[x + ',' + y + ',' + z];
      var formedAt = voxel ? FORMED_AT[voxel.key] : null; if (formedAt == null) formedAt = 0;
      return !voxel || formedAt > showStage ? null : excavateVoxel(voxel);
    };
    eng.undoExcavate = function () { return undoExcavation(); };
    eng.redoExcavate = function () { return redoExcavation(); };
    eng.setUndoPreview = function (b) { undoPreviewRequested = !!b; return updateUndoPreview(); };
    eng.setWaterTable = function (b) { waterTableOn = !!b; waterMesh.visible = waterTableOn && !focusLens; };
    eng.erupt = function () { startEruption(); };
    eng.setHighlight = function (k) { highlightKey = (k && SCENE.voxelKeys && SCENE.voxelKeys.indexOf(k) >= 0) ? k : null; hoverBox.visible = false; rebuild(); };
    eng.setFocusLens = function (b) { focusLens = !!b; if (focusLens) { excavate = false; undoPreviewRequested = false; } hoverBox.visible = false; rebuild(); };
    eng.setScienceStage = function (n) { geologyScienceStage3d = Math.max(0, Math.min(2, Math.round(Number(n) || 0))); rebuild(); return geologyScienceStage3d; };
    eng.getVisualState = function () { return { coreRigDeployed: coreRigState3d.deployed, coreRigStage: coreRigState3d.stage, coreRigSampleCount: coreRigState3d.samples.length, surveyActive: surveyBox.visible, focusLens: focusLens, highlightKey: highlightKey, visibleVoxels: mesh.count, sliceZ: sliceZ, excavate: excavate, excavatedCount: excavationHistory.length, redoCount: excavationRedo.length, undoPreview: undoPreviewBox.visible, undoPreviewKey: undoPreviewKey, scienceStage: geologyScienceStage3d, processGuideCount: geologyProcessGuideGroup3d.children.length, coreElementCount: SCENE.id === 'deepEarth' ? geologyDeepEarthCoreGroup3d.children.length + geologyDeepEarthDynamoGroup3d.children.length : 0, magneticFieldCount: geologyDeepEarthFieldGroup3d.children.length, pWaveRayCount: geologySeismicPCurves3d.length, sWaveRayCount: geologySeismicSCurves3d.length, seismicReceiverCount: geologySeismicShadowReceivers3d.length, landformCount: geologyLandformMeshes3d.length, bathymetryCount: geologyBathymetryMeshes3d.length, hydrothermalChimneyCount: geologyHydrothermalMeshes3d.length, hydrothermalPlumeCount: geologyHydrothermalPlumePhases3d ? geologyHydrothermalPlumePhases3d.length : 0, surfaceEffectCount: geologyFoamMeshes3d.length + (oceanCausticMesh3d ? 1 : 0), volcanicAtmosphereCount: geologyVolcanicSteamSprites3d.length, oceanWaveVertexCount: oceanSurfaceGeometry3d ? oceanSurfaceGeometry3d.attributes.position.count : 0 }; };
    eng.setStage = function (n) { showStage = (n == null) ? 99 : n; rebuild(); };
    eng.reset = function () {
      removed = {}; excavationHistory = []; excavationRedo = []; fpCancelMining(); undoPreviewRequested = false; undoPreviewKey = null; surveyBox.visible = false; surveyVoxelKey = null; sliceZ = 0;
      coreRigState3d.running = false; coreRigState3d.deployed = false; coreRigState3d.stage = 'packed'; coreRigState3d.status = 'Pack ready';
      coreRigState3d.angle = 'vertical'; coreRigState3d.depth = CORE_RIG_DEPTHS[1]; coreRigState3d.origin = null; coreRigState3d.yaw = 0;
      coreRigState3d.path = []; coreRigState3d.cursor = 0; coreRigState3d.samples = []; coreRigState3d.progress = 0; coreRigState3d.heat = 0;
      coreRigState3d.feedMode = 'cruise'; coreRigState3d.coolantRemaining = 2; coreRigState3d.coolantUsed = 0;
      coreRigState3d.formationLoad = null; coreRigState3d.idealFeedMode = 'cruise'; coreRigState3d.intervalStress = 0; coreRigState3d.intervalPeakHeat = 0;
      coreRigState3d.pristineStreak = 0; coreRigState3d.bestPristineStreak = 0;
      coreRigState3d.currentCell = null; coreRigState3d.currentVoxel = null; coreRigState3d.currentElapsed = 0; coreRigState3d.currentDuration = 0;
      coreRigState3d.stopReason = null; coreRigState3d.plannedStop = null; coreRigState3d.trajectoryScan = null; coreRigState3d.evaluation = null; coreRigState3d.deployedAt = 0; coreRigState3d.celebrateUntil = 0; coreRigState3d.coolantFlashUntil = 0; coreRigState3d.scanUntil = 0; coreRigState3d.lastIntervalResult = null; coreRigState3d.lastHudAt = 0;
      clearCoreRigBoreMarkers3d(); coreRigFeedGlow3d.visible = false; coreRigGroup3d.scale.setScalar(1); coreRigGroup3d.visible = false; notifyCoreRigState3d(true);
      waterMesh.scale.y = 1; waterMesh.position.z = 0;
      if (oceanSurfaceMesh3d) { oceanSurfaceMesh3d.scale.y = 1; oceanSurfaceMesh3d.position.z = 0; }
      if (oceanCausticMesh3d) { oceanCausticMesh3d.scale.y = 1; oceanCausticMesh3d.position.z = 0; }
      excavationBurstLife3d = 0; excavationDustPoints3d.visible = false;
      excavationChipPoints3d.visible = false; excavationFlashBox3d.visible = false;
      rebuild(); notifyExcavationChange(); notifyCoreRigState3d(true);
    };
    eng.setFirstPerson = function (on, o) { if (on) enterFP(o || {}); else exitFP(); };
    eng.fpInput = function (cmd, v) { if (cmd === 'move' && v) fp.input = Object.assign(fp.input, v); else if (cmd === 'look' && v) fp.turn = Object.assign(fp.turn, v); };
    eng.fpMine = fpMineAtCrosshair;
    eng.fpSetTool = fpSetTool;
    eng.fpMiningHeld = fpSetMiningHeld;
    eng.fpSurvey = fpSurveyMaterial;
    eng.coreRigDeploy = deployCoreRig3d;
    eng.coreRigConfigure = configureCoreRig3d;
    eng.coreRigSetFeedMode = setCoreRigFeedMode3d;
    eng.coreRigCoolant = useCoreRigCoolant3d;
    eng.coreRigStart = startCoreRig3d;
    eng.coreRigCancel = cancelCoreRig3d;
    eng.coreRigPack = packCoreRig3d;
    eng.coreRigState = coreRigSnapshot3d;
    eng.fpToolState = function () { return { tool: fp.tool, heat: fp.drillHeat, overheated: fp.drillOverheated, held: fp.drillHeld }; };
    eng.fpUndoMine = fpUndoMine;
    eng.fpRedoMine = fpRedoMine;
    eng.fpRespawn = function () { if (coreRigState3d.running) return coreRigError3d('The rig is drilling. Let the bore finish before returning home.', 'running'); if (coreRigState3d.deployed) packCoreRig3d(); var result = fpRespawn(true); if (opts.onFlash) opts.onFlash(fp.mode === 'mine' ? 'Returned to the dig-in point.' : 'Returned to the Deep Earth starting point.'); if (opts.onFpHome) opts.onFpHome(); return result; };
    eng.fpActive = function () { return !!fp.active; };
    eng._fpExit = exitFP;
    eng.dispose = function () {
      try { if (_geoVRBtnOff) _geoVRBtnOff(); } catch (e) {}
      try { if (_geoVR && _geoVR.destroy) _geoVR.destroy(); _geoVR = null; } catch (e) {}
      try { exitFP(true); } catch (e) {}   // tear down FP listeners first so nothing leaks across re-init
      eng.disposed = true; if (raf) cancelAnimationFrame(raf);
      cnv.removeEventListener('pointerdown', onDown); cnv.removeEventListener('pointerup', onUp); cnv.removeEventListener('webglcontextlost', onLost);
      cnv.removeEventListener('pointermove', onMoveHover); cnv.removeEventListener('pointerleave', onLeaveHover);
      if (motionMedia3d && motionMedia3d.removeEventListener) motionMedia3d.removeEventListener('change', syncGeologyMotion3d);
      else if (motionMedia3d && motionMedia3d.removeListener) motionMedia3d.removeListener(syncGeologyMotion3d);
      if (ro) try { ro.disconnect(); } catch (e) {}
      try {
        geo.dispose(); mat.dispose(); renderer.dispose();
        coreRigGeometries3d.forEach(function (rigGeometry3d) { rigGeometry3d.dispose(); });
        coreRigMaterials3d.forEach(function (rigMaterial3d) { rigMaterial3d.dispose(); });
        hoverSourceGeo.dispose(); hoverBox.geometry.dispose(); hoverBox.material.dispose();
        surveySourceGeo.dispose(); surveyBox.geometry.dispose(); surveyBox.material.dispose();
        miningCrackGeometry.dispose(); miningCrackMaterial.dispose();
        undoPreviewSourceGeo.dispose(); undoPreviewBox.geometry.dispose(); undoPreviewBox.material.dispose();
        waterMesh.geometry.dispose(); waterMesh.material.dispose();
        if (oceanSurfaceMesh3d) { oceanSurfaceMesh3d.geometry.dispose(); oceanSurfaceMesh3d.material.dispose(); }
        if (oceanCausticMesh3d) { oceanCausticMesh3d.geometry.dispose(); oceanCausticMesh3d.material.dispose(); }
        atmosphereMoteGeometry3d.dispose(); atmosphereMoteMaterial3d.dispose();
        geologyHazeSprites3d.forEach(function (geologyHazeSprite3d) { geologyHazeSprite3d.material.dispose(); });
        glowVoxelGeometry3d.dispose(); glowVoxelMaterial3d.dispose();
        geologyProcessGeometry3d.dispose(); geologyProcessMaterial3d.dispose();
        geologyProcessGuideArrowGeometry3d.dispose();
        geologyProcessGuideGeometries3d.forEach(function (guideGeometry3d) { guideGeometry3d.dispose(); });
        geologyProcessGuideMaterials3d.forEach(function (guideMaterial3d) { guideMaterial3d.dispose(); });
        geologyDeepEarthGeometries3d.forEach(function (deepEarthGeometry3d) { deepEarthGeometry3d.dispose(); });
        geologyDeepEarthMaterials3d.forEach(function (deepEarthMaterial3d) { deepEarthMaterial3d.dispose(); });
        geologySeismicGeometries3d.forEach(function (seismicGeometry3d) { seismicGeometry3d.dispose(); });
        geologySeismicMaterials3d.forEach(function (seismicMaterial3d) { seismicMaterial3d.dispose(); });
        geologyLandformGeometries3d.forEach(function (landformGeometry3d) { landformGeometry3d.dispose(); });
        geologyLandformMaterials3d.forEach(function (landformMaterial3d) { landformMaterial3d.dispose(); });
        geologySurfaceEffectGeometries3d.forEach(function (surfaceEffectGeometry3d) { surfaceEffectGeometry3d.dispose(); });
        geologySurfaceEffectMaterials3d.forEach(function (surfaceEffectMaterial3d) { surfaceEffectMaterial3d.dispose(); });
        geologyHydrothermalGeometries3d.forEach(function (hydrothermalGeometry3d) { hydrothermalGeometry3d.dispose(); });
        geologyHydrothermalMaterials3d.forEach(function (hydrothermalMaterial3d) { hydrothermalMaterial3d.dispose(); });
        geologyVolcanicAtmosphereGeometries3d.forEach(function (volcanicAtmosphereGeometry3d) { volcanicAtmosphereGeometry3d.dispose(); });
        geologyVolcanicAtmosphereMaterials3d.forEach(function (volcanicAtmosphereMaterial3d) { volcanicAtmosphereMaterial3d.dispose(); });
        excavationDustGeometry3d.dispose(); excavationDustMaterial3d.dispose();
        excavationChipGeometry3d.dispose(); excavationChipMaterial3d.dispose();
        excavationFlashSource3d.dispose(); excavationFlashGeometry3d.dispose(); excavationFlashMaterial3d.dispose();
        if (crystalShardGeometry3d) crystalShardGeometry3d.dispose();
        crystalShardMaterials3d.forEach(function (crystalShardMaterial3d) { crystalShardMaterial3d.dispose(); });
        if (eng._treeGeo) eng._treeGeo.forEach(function (g) { g.dispose(); });
        if (eng._treeMat) eng._treeMat.forEach(function (m) { m.dispose(); });
        if (eng._volcanoDispose) eng._volcanoDispose.forEach(function (x) { x.dispose(); });
        [bgTex, rockSurfaceTexture3d, geologyGlowTexture3d, geologyDustTexture3d,
          geologyChipTexture3d, geologyWaterTexture3d, geologyOceanMaskTexture3d, geologyCausticTexture3d].forEach(function (texture3d) {
          if (texture3d && texture3d.dispose) texture3d.dispose();
        });
        underGlowGeo.dispose(); underGlowMat.dispose();
      } catch (e) {}
      if (cnv.parentNode) cnv.parentNode.removeChild(cnv);
    };
    notifyExcavationChange();
    return eng;
  }

  // Test hook: expose the PURE generators/helpers so the science + AO logic can be
  // unit-tested in jsdom (the WebGL itself is Canvas-smoke-only). Also a characterization
  // baseline that locks current strata before the upcoming resolution refactor.
  try {
    window.__alloGeologyPure = {
      rockKeyAt: rockKeyAt, geodeKeyAt: geodeKeyAt, deepEarthKeyAt: deepEarthKeyAt, subductionKeyAt: subductionKeyAt, ridgeKeyAt: ridgeKeyAt, hotspotKeyAt: hotspotKeyAt, collisionKeyAt: collisionKeyAt, collisionTopo: collisionTopo, hasFossilAt: hasFossilAt, computeCore: computeCore, rockFacts: rockFacts, sceneMeasurementRows: sceneMeasurementRows, measurementSpeech: measurementSpeech, aoCount: aoCount,
      crustGeotherm: crustGeotherm, deepEarthGeotherm: deepEarthGeotherm, subductionGeotherm: subductionGeotherm, ridgeGeotherm: ridgeGeotherm, hotspotGeotherm: hotspotGeotherm, collisionGeotherm: collisionGeotherm, setGrid: setGrid, setScene: setScene, RES_MULT: RES_MULT, WORLD: WORLD,
      fpForward: fpForward, fpClampPitch: fpClampPitch, fpBounds: fpBounds, fpStep: fpStep, fpWorldToVoxel: fpWorldToVoxel, fpMaterialPhysics: fpMaterialPhysics, fpMiningProfile: fpMiningProfile, fpMiningStage: fpMiningStage, fpToolMiningDuration: fpToolMiningDuration, fpDrillHeatRate: fpDrillHeatRate, excavationWorldKey: excavationWorldKey,
      coreRigSupported: coreRigSupported, coreRigAngleDegrees: coreRigAngleDegrees, coreRigPath: coreRigPath, coreRigStopReason: coreRigStopReason, coreRigDrillDuration: coreRigDrillDuration, coreRigReportSummary: coreRigReportSummary, coreRigGradeForScore: coreRigGradeForScore, coreRigEvaluation: coreRigEvaluation, coreRigResearchReward: coreRigResearchReward, advanceCoreRigResearch: advanceCoreRigResearch, coreRigStopLabel: coreRigStopLabel, coreRigFeedProfile: coreRigFeedProfile, coreRigFormationLoad: coreRigFormationLoad, coreRigIntegrityLoss: coreRigIntegrityLoss, coreRigIntegrityFromStress: coreRigIntegrityFromStress, coreRigQualitySummary: coreRigQualitySummary, coreRigTrajectoryScan: coreRigTrajectoryScan, coreRigTrajectorySnapshot: coreRigTrajectorySnapshot, coreRigTrajectorySummary: coreRigTrajectorySummary, coreRigBoreBrief: coreRigBoreBrief, coreRigCoreCassette: coreRigCoreCassette, coreRigCompressedCore: coreRigCompressedCore, coreRigCompareReports: coreRigCompareReports, coreRigNextExperiment: coreRigNextExperiment, coreRigReportStableId: coreRigReportStableId, coreRigIntervalScanMs: coreRigIntervalScanMs, coreRigIntervalScanning: coreRigIntervalScanning, coreRigIntervalFeedback: coreRigIntervalFeedback, coreRigFormationCue: coreRigFormationCue, coreRigChallengeProgress: coreRigChallengeProgress, coreRigProgramKey: coreRigProgramKey, coreRigProgramCatalog: coreRigProgramCatalog, coreRigProgramRating: coreRigProgramRating, coreRigCertificationTier: coreRigCertificationTier, coreRigCertificationReward: coreRigCertificationReward, coreRigCertificationXpTarget: coreRigCertificationXpTarget, normalizeCoreRigPrograms: normalizeCoreRigPrograms, advanceCoreRigCertification: advanceCoreRigCertification, coreRigCertificationSummary: coreRigCertificationSummary, coreRigCertificationGuidance: coreRigCertificationGuidance, coreRigCertificationTiers: coreRigCertificationTiers, coreRigAngles: function () { return Object.assign({}, CORE_RIG_ANGLES); }, coreRigDepths: function () { return CORE_RIG_DEPTHS.slice(); }, coreRigFeedModes: function () { return Object.keys(CORE_RIG_FEED_MODES); },
      fieldExpeditions: function () { return FIELD_EXPEDITIONS; }, sceneVoxelKeys: function (sceneId) { return SCENES[sceneId] ? SCENES[sceneId].voxelKeys.slice() : []; }, fieldExpeditionFor: fieldExpeditionFor, beginFieldRun: beginFieldRun, retireFieldRunEntry: retireFieldRunEntry, advanceFieldRun: advanceFieldRun, fieldRunReward: fieldRunReward, fieldRankForXp: fieldRankForXp, fieldSpecimenName: fieldSpecimenName, fieldCollectibleKeys: fieldCollectibleKeys, recordFieldDiscovery: recordFieldDiscovery, fieldDiscoveryProgress: fieldDiscoveryProgress, fieldJournalEntries: fieldJournalEntries, fieldJournalSummary: fieldJournalSummary,
      fpExplorerMode: fpExplorerMode, fpSeedPose: fpSeedPose, fpBob: fpBob, layerChanged: layerChanged, fpBlurb: fpBlurb, fpBust: fpBust, fpProbe: fpProbe, fpAnnounceText: fpAnnounceText, easeInOutCubic: easeInOutCubic,
      scenes: function () { return Object.keys(SCENES); }, sceneId: function () { return SCENE.id; }, quizBanks: function () { return QUIZ_BANKS; }, quizRemediation: quizRemediation, missions: function () { return SCENE_MISSIONS; }, lessonGuide: function () { return LESSON_GUIDE; }, evaluateCER: evaluateCER, evidenceMapDraft: evidenceMapDraft, nextMissionHint: nextMissionHint, missionAction: missionActionFor, sceneComparisons: function () { return SCENE_COMPARISONS; }, sceneComparisonInsight: sceneComparisonInsight, sceneProgress: sceneProgressFor, orientation: function () { return SCENE_ORIENTATION; }, schematicInfo: sceneSchematicInfo, schematicState: sceneSchematicState, vocabulary: function () { return SCENE_VOCABULARY; }, sequenceChallenges: function () { return SCENE_SEQUENCE_CHALLENGES; }, sequenceInitialOrder: sequenceInitialOrder, sequenceIsCorrect: sequenceIsCorrect, sequenceMoveBefore: sequenceMoveBefore, sceneJourney: sceneJourneyFor, sceneResumeState: sceneResumeState, sceneBeacons: sceneBeaconsFor, processCues: sceneProcessCueFor, sceneTimeline: sceneTimelineFor, focusLensIncludes: focusLensIncludes, cutawayReadout: cutawayReadout, firstSolidVoxelY: firstSolidVoxelY, undoPreviewTarget: undoPreviewTarget, restoreEnginePresentation: restoreEnginePresentation, sceneJourneyProgress: sceneJourneyProgressFor, evidenceMapRoles: function () { return EVIDENCE_MAP_ROLES; }, evidenceMapForScene: evidenceMapForScene, evidenceMapStatus: evidenceMapStatus,
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
      var fln = React.useState(false); var focusLensOn = fln[0], setFocusLensOn = fln[1];
      var slc = React.useState(0); var slice = slc[0], setSlice = slc[1];
      var exc = React.useState(false); var excavate = exc[0], setExcavate = exc[1];
      var dgc = React.useState(0); var digCount = dgc[0], setDigCount = dgc[1];
      var rdc = React.useState(0); var redoCount = rdc[0], setRedoCount = rdc[1];
      var excavationByWorldRef = React.useRef((d.excavationByWorld && typeof d.excavationByWorld === 'object') ? d.excavationByWorld : {});
      var undoPreviewIntentRef = React.useRef({ hover: false, focus: false });
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
      var jst = React.useState(function () { return sceneResumeState(scene, d).index; }); var sceneJourneyStep = jst[0], setSceneJourneyStep = jst[1];
      var rsn = React.useState(function () { var restored = sceneResumeState(scene, d); return restored.hasSavedProgress ? restored : null; }); var sceneResumeNotice = rsn[0], setSceneResumeNotice = rsn[1];
      var rts = React.useState(null); var routeTarget = rts[0], setRouteTarget = rts[1];
      var csc = React.useState(defaultComparisonScene(scene)); var compareSceneId = csc[0], setCompareSceneId = csc[1];
      var cst = React.useState(0); var compareStage = cst[0], setCompareStage = cst[1];
      var bcn = React.useState(null); var activeBeaconId = bcn[0], setActiveBeaconId = bcn[1];
      var bto = React.useState(false); var beaconTourOn = bto[0], setBeaconTourOn = bto[1];
      var bts = React.useState(0); var beaconTourStep = bts[0], setBeaconTourStep = bts[1];
      var cvs = React.useState('iso'); var cameraViewState = cvs[0], setCameraViewState = cvs[1];
      var selectedKeyRef = React.useRef(null); selectedKeyRef.current = selected ? selected.key : null;
      var focusLensRef = React.useRef(false); focusLensRef.current = focusLensOn;
      var cameraViewRef = React.useRef('iso'); cameraViewRef.current = cameraViewState;
      var tts = React.useState(false); var ttsSpeaking = tts[0], setTtsSpeaking = tts[1];
      var ttsAudioRef = React.useRef(null);
      var ttsSessionRef = React.useRef(0);
      var ttsContextRef = React.useRef({ scene: scene, mode: mode });
      var sg = React.useState(function () { return sceneResumeState(scene, d).index; }); var signalStep = sg[0], setSignalStep = sg[1];
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
      var fpt = React.useState(d.fpTool === 'drill' ? 'drill' : 'pick'); var fpTool = fpt[0], setFpTool = fpt[1];
      var fpDrillPointerRef = React.useRef(false);
      var cra = React.useState(CORE_RIG_ANGLES[d.coreRigAngle] ? d.coreRigAngle : 'vertical'); var coreRigAngle = cra[0], setCoreRigAngle = cra[1];
      var crd = React.useState(CORE_RIG_DEPTHS.indexOf(Number(d.coreRigDepth)) >= 0 ? Number(d.coreRigDepth) : CORE_RIG_DEPTHS[1]); var coreRigDepth = crd[0], setCoreRigDepth = crd[1];
      var crh = React.useState(null); var coreRigHud = crh[0], setCoreRigHud = crh[1];
      var crr = React.useState(null); var coreRigReview = crr[0], setCoreRigReview = crr[1];
      var crc = React.useState(null); var coreRigChallenge = crc[0], setCoreRigChallenge = crc[1];
      var crp = React.useState(coreRigProgramKey(coreRigAngle, coreRigDepth)); var coreRigProgramSelection = crp[0], setCoreRigProgramSelection = crp[1];
      var coreRigConsoleRef = React.useRef(null), coreRigReturnFocusRef = React.useRef(null), coreRigStageAnnounceRef = React.useRef(null), coreRigDebriefFocusRef = React.useRef(false);
      var coreRigConfigRef = React.useRef({ angle: coreRigAngle, depth: coreRigDepth });
      coreRigConfigRef.current = { angle: coreRigAngle, depth: coreRigDepth };
      var initialFieldRuns = (d.fieldRuns && typeof d.fieldRuns === 'object') ? d.fieldRuns : {};
      var fieldBookSeed = {
        xp: Math.max(0, Math.floor(Number(initialFieldRuns.xp) || 0)),
        total: Math.max(0, Math.floor(Number(initialFieldRuns.total) || 0)),
        discoveredByScene: (initialFieldRuns.discoveredByScene && typeof initialFieldRuns.discoveredByScene === 'object') ? initialFieldRuns.discoveredByScene : {},
        byScene: (initialFieldRuns.byScene && typeof initialFieldRuns.byScene === 'object') ? initialFieldRuns.byScene : {},
        layersByScene: (initialFieldRuns.layersByScene && typeof initialFieldRuns.layersByScene === 'object') ? initialFieldRuns.layersByScene : {},
        coreLogsByScene: (initialFieldRuns.coreLogsByScene && typeof initialFieldRuns.coreLogsByScene === 'object') ? initialFieldRuns.coreLogsByScene : {},
        coreResearchByScene: (initialFieldRuns.coreResearchByScene && typeof initialFieldRuns.coreResearchByScene === 'object') ? initialFieldRuns.coreResearchByScene : {},
        coreCertification: Object.assign({}, (initialFieldRuns.coreCertification && typeof initialFieldRuns.coreCertification === 'object') ? initialFieldRuns.coreCertification : {}, { version: 1, programs: normalizeCoreRigPrograms(initialFieldRuns.coreCertification) })
      };
      var fbr = React.useState(fieldBookSeed); var fieldBook = fbr[0], setFieldBook = fbr[1];
      var fieldBookRef = React.useRef(fieldBook); fieldBookRef.current = fieldBook;
      var fjp = React.useState(!!d.fieldJournalOpen); var fieldJournalOpen = fjp[0], setFieldJournalOpen = fjp[1];
      var fph = React.useState(null); var fpHud = fph[0], setFpHud = fph[1];          // live "you are here" readout
      var fpToggleRef = React.useRef(null); var fpPrevFocusRef = React.useRef(null); var fpAnnAtRef = React.useRef(0);   // SR announce debounce clock
      setScene(scene); setGrid(res);   // sync active scene + module grid (NX/NY/NZ/VOXEL/KM_PER_VOXEL) before render + effects read them
      var feat = SCENE.features;
      var cutaway = cutawayReadout(slice, NZ);

      function announce(msg) { try { var lr = document.getElementById('allo-live-geology'); if (lr) { lr.textContent = ''; setTimeout(function () { lr.textContent = String(msg || ''); }, 30); } } catch (e) {} }
      React.useEffect(function () {
        var deployed = !!(coreRigHud && coreRigHud.deployed);
        if (deployed) {
          if (!coreRigReturnFocusRef.current) coreRigReturnFocusRef.current = document.activeElement;
          setTimeout(function () { try { if (coreRigConsoleRef.current) coreRigConsoleRef.current.focus(); } catch (coreRigFocusError) {} }, 0);
        } else if (coreRigReturnFocusRef.current) {
          var returnTarget = coreRigReturnFocusRef.current; coreRigReturnFocusRef.current = null;
          setTimeout(function () { try { if (returnTarget && returnTarget.focus) returnTarget.focus(); } catch (coreRigReturnFocusError) {} }, 0);
        }
      }, [!!(coreRigHud && coreRigHud.deployed)]);
      React.useEffect(function () {
        var finishedStage = !!(coreRigHud && ['complete', 'stopped', 'paused'].indexOf(coreRigHud.stage) >= 0);
        if (!finishedStage || !coreRigDebriefFocusRef.current) return;
        coreRigDebriefFocusRef.current = false;
        setTimeout(function () {
          try {
            var consoleNode = coreRigConsoleRef.current;
            var debriefHeading = consoleNode && consoleNode.querySelector('[data-geology-core-debrief-heading]');
            if (debriefHeading) debriefHeading.focus();
            else if (consoleNode) consoleNode.focus();
          } catch (coreRigDebriefFocusError) {}
        }, 0);
      }, [coreRigHud && coreRigHud.stage]);
      function saveFieldBook(next) {
        fieldBookRef.current = next;
        setFieldBook(next);
        upd('fieldRuns', next);
      }
      function saveCoreRigReport(sceneId, report) {
        if (!report || !Array.isArray(report.samples) || !report.samples.length) return false;
        sceneId = SCENES[sceneId] ? sceneId : SCENE.id;
        var cleanAngle = CORE_RIG_ANGLES[report.angle] ? report.angle : 'vertical';
        var cleanStop = ['fluid', 'hazard', 'blocked', 'spent', 'cancelled'].indexOf(report.stopReason) >= 0 ? report.stopReason : null;
        var reportedDepth = Math.max(1, Math.min(24, Math.round(Number(report.targetDepth) || 1)));
        var reportedRecoverable = Math.max(0, Math.min(reportedDepth, Math.floor(Number(report.plannedCount) || report.samples.length || 0)));
        var cleanTrajectory = report.trajectoryScan
          ? coreRigTrajectorySnapshot(report.trajectoryScan)
          : coreRigTrajectorySnapshot({
            requestedDepth: reportedDepth, recoverable: reportedRecoverable,
            loadCounts: { preserve: 0, cruise: reportedRecoverable, torque: 0 }, transitions: 0,
            riskLevel: reportedRecoverable >= reportedDepth ? 'clear' : 'limited'
          });
        var cleanReport = {
          sceneId: sceneId, angle: cleanAngle, angleDegrees: coreRigAngleDegrees(cleanAngle),
          targetDepth: reportedDepth, plannedCount: cleanTrajectory.recoverable,
          feedMode: CORE_RIG_FEED_MODES[report.feedMode] ? report.feedMode : 'cruise',
          coolantUsed: Math.max(0, Math.min(2, Math.floor(Number(report.coolantUsed) || 0))),
          bestPristineStreak: Math.max(0, Math.floor(Number(report.bestPristineStreak) || 0)),
          stopReason: cleanStop, completedAt: Math.max(1, Number(report.completedAt) || Date.now()),
          samples: report.samples.slice(0, reportedDepth).filter(function (sample) { return sample && sample.key; }).map(function (sample) {
            var cleanSample = {
              key: String(sample.key), name: String(sample.name || fieldSpecimenName(sceneId, sample.key)),
              type: String(sample.type || 'Rock'), color: sample.color, depth: Math.max(1, Number(sample.depth) || 1)
            };
            if (sample.integrity != null && isFinite(Number(sample.integrity))) cleanSample.integrity = Math.max(0.55, Math.min(1, Number(sample.integrity)));
            return cleanSample;
          })
        };
        if (!cleanReport.samples.length) return false;
        cleanReport.boreBrief = coreRigBoreBrief(cleanTrajectory, cleanReport.samples, cleanReport.bestPristineStreak, true);
        var reportId = sceneId + '@' + cleanReport.completedAt + '@' + cleanReport.angle + '@' + cleanReport.targetDepth;
        cleanReport.id = reportId;
        var evaluation = coreRigEvaluation(cleanReport);
        cleanReport.evaluation = Object.assign({}, evaluation);
        var book = fieldBookRef.current || {};
        var logsByScene = Object.assign({}, book.coreLogsByScene || {});
        var researchByScene = Object.assign({}, book.coreResearchByScene || {});
        var transition = advanceCoreRigResearch(researchByScene[sceneId], evaluation, cleanReport.completedAt, reportId);
        cleanReport.researchReward = transition.researchReward;
        cleanReport.newBest = transition.newBest;
        if (transition.duplicate) {
          cleanReport.duplicate = true;
          return cleanReport;
        }
        var previousCertification = book.coreCertification || {};
        var previousCertificationSummary = coreRigCertificationSummary(previousCertification);
        var certification = advanceCoreRigCertification(previousCertification, cleanReport, evaluation, cleanReport.completedAt, reportId);
        var nextCertificationSummary = coreRigCertificationSummary(certification.entry);
        cleanReport.programKey = certification.programKey;
        cleanReport.certificationTier = certification.assessment ? certification.assessment.level : 0;
        cleanReport.certificationTierLabel = certification.assessment ? certification.assessment.label : 'Unrated';
        cleanReport.programTier = certification.program ? certification.program.tier : 0;
        cleanReport.programTierLabel = certification.program ? certification.program.tierLabel : 'Unrated';
        cleanReport.certificationEarned = certification.tierUp;
        cleanReport.certificationReward = certification.certificationReward;
        cleanReport.totalReward = transition.researchReward + certification.certificationReward;
        var logs = Array.isArray(logsByScene[sceneId]) ? logsByScene[sceneId].slice(-5) : [];
        var previousCoreLog = logs.length ? logs[logs.length - 1] : null;
        cleanReport.comparison = coreRigCompareReports(previousCoreLog || {}, cleanReport);
        if (!previousCoreLog || !cleanReport.comparison.eligible) cleanReport.comparison = null;
        cleanReport.nextExperiment = coreRigNextExperiment(cleanReport, certification.entry);
        logs.push(cleanReport); logsByScene[sceneId] = logs; researchByScene[sceneId] = transition.entry;
        var oldXp = Math.max(0, Math.floor(Number(book.xp) || 0));
        var nextXp = oldXp + cleanReport.totalReward;
        saveFieldBook(Object.assign({}, book, {
          xp: nextXp, coreLogsByScene: logsByScene, coreResearchByScene: researchByScene,
          coreCertification: certification.entry
        }));
        setCoreRigReview(null);
        setCoreRigChallenge(function (previousChallenge) {
          if (!previousChallenge) return previousChallenge;
          var patch = {};
          if (previousChallenge.sceneId === sceneId) patch.bestScore = transition.entry.bestScore;
          if (previousChallenge.programKey === certification.programKey && certification.program) patch.programBestRating = certification.program.bestRating;
          return Object.keys(patch).length ? Object.assign({}, previousChallenge, patch) : previousChallenge;
        });
        setCoreRigHud(function (previousHud) {
          return previousHud ? Object.assign({}, previousHud, {
            evaluation: Object.assign({}, evaluation), researchReward: transition.researchReward,
            certificationReward: certification.certificationReward,
            certificationTier: cleanReport.certificationTier,
            certificationTierLabel: cleanReport.certificationTierLabel,
            certificationEarned: certification.tierUp, newBest: transition.newBest,
            boreBrief: cleanReport.boreBrief, comparison: cleanReport.comparison || null,
            nextExperiment: cleanReport.nextExperiment || null
          }) : previousHud;
        });
        var summary = coreRigReportSummary(cleanReport);
        var sequence = cleanReport.samples.map(function (sample) { return sample.name; }).join(' → ');
        var boundary = cleanReport.stopReason ? (' Stop: ' + coreRigStopLabel(cleanReport.stopReason) + '.') : ' Target depth recovered.';
        var certificationNote = certification.assessment && certification.assessment.level
          ? (' · This run ' + certification.assessment.label + ' at ' + certification.assessment.rating + '/200 program rating')
          : (' · This run unrated' + (certification.program && certification.program.tier ? (' · program best remains ' + certification.program.tierLabel) : ''));
        addNotebookEvidence(
          'core-rig',
          'Directional core · ' + cleanReport.angleDegrees + '° / ' + cleanReport.targetDepth + ' intervals · Grade ' + evaluation.grade + ' (' + evaluation.score + ')' + (evaluation.integrityPercent != null ? (' · ' + evaluation.integrityPercent + '% integrity') : '') + ' · Brief ' + cleanReport.boreBrief.metCount + '/3' + certificationNote,
          sequence + '.' + boundary,
          'core-rig-' + reportId
        );
        var oldRank = fieldRankForXp(oldXp), nextRank = fieldRankForXp(nextXp);
        var toastMessage = (transition.newBest ? 'New personal best! ' : '') + 'Grade ' + evaluation.grade + ' · ' + evaluation.score + '/200.' + (evaluation.integrityPercent != null ? (' Core integrity ' + evaluation.integrityPercent + '%.') : '') + ' Bore Brief ' + cleanReport.boreBrief.metCount + '/3.';
        if (certification.tierUp && certification.program) toastMessage += ' ' + certification.program.tierLabel + ': ' + certification.program.angleDegrees + '° / ' + certification.program.depth + ' program!';
        if (!certification.tierUp && certification.program && certification.program.tier === 0) toastMessage += ' ' + coreRigCertificationGuidance(certification.program) + '.';
        if (cleanReport.totalReward) toastMessage += ' +' + cleanReport.totalReward + ' XP.';
        else if (certification.program && certification.program.tier >= 3) toastMessage += ' Highest operator tier already earned.';
        else toastMessage += ' Improve the program rating or core quality to advance.';
        if (!previousCertificationSummary.complete && nextCertificationSummary.complete) toastMessage += ' All nine programs certified — Certified Core Operator!';
        if (previousCertificationSummary.mastered < 9 && nextCertificationSummary.mastered === 9) toastMessage += ' Every program mastered — Master Core Operator!';
        if (cleanReport.comparison) toastMessage += ' Paired finding · ' + cleanReport.comparison.similarityPct + '% sequence match.';
        if (cleanReport.nextExperiment) toastMessage += ' Next experiment ready.';
        if (nextRank.label !== oldRank.label) toastMessage += ' Rank up: ' + nextRank.label + '!';
        addToast(toastMessage, transition.newBest || certification.tierUp ? 'success' : 'info');
        var certificationSpeech = certification.tierUp && certification.program
          ? (certification.program.tierLabel + ' operator tier earned for ' + certification.program.angleDegrees + ' degrees, ' + certification.program.depth + ' intervals. ')
          : (certification.program && certification.program.tier === 0 ? ('Program remains unrated. ' + coreRigCertificationGuidance(certification.program) + '. ') : '');
        var completionSpeech = !previousCertificationSummary.complete && nextCertificationSummary.complete ? 'All nine programs certified. Certified Core Operator earned. ' : '';
        if (previousCertificationSummary.mastered < 9 && nextCertificationSummary.mastered === 9) completionSpeech += 'Every program mastered. Master Core Operator earned. ';
        announce('Core log saved. Grade ' + evaluation.grade + ', ' + evaluation.score + ' points. ' + summary.sampleCount + ' samples across ' + summary.uniqueMaterials + ' materials. ' + (evaluation.integrityPercent != null ? evaluation.integrityPercent + ' percent core integrity. ' : '') + 'Bore Brief ' + cleanReport.boreBrief.metCount + ' of 3 complete. ' + certificationSpeech + completionSpeech + (cleanReport.totalReward ? cleanReport.totalReward + ' experience earned. ' : 'No new experience this run. ') +
          (cleanReport.comparison ? ('Paired finding: ' + cleanReport.comparison.similarityPct + ' percent sequence match. ') : '') +
          (cleanReport.nextExperiment ? ('Next experiment ready. ' + cleanReport.nextExperiment.question) : ''));
        return cleanReport;
      }
      function startFieldRun(sceneId, requestedIndex) {
        var book = fieldBookRef.current || { xp: 0, total: 0, byScene: {} };
        var oldEntry = (book.byScene && book.byScene[sceneId]) || {};
        var entry = beginFieldRun(oldEntry, sceneId, requestedIndex);
        if (!entry) return false;
        var contract = fieldExpeditionFor(sceneId, entry.contractIndex);
        var byScene = Object.assign({}, book.byScene || {}); byScene[sceneId] = entry;
        saveFieldBook(Object.assign({}, book, { byScene: byScene }));
        addToast('Field run started: ' + contract.label + '. First specimen: ' + fieldSpecimenName(sceneId, contract.targets[0]) + '.', 'info');
        announce('Field run started. ' + contract.brief + ' First specimen: ' + fieldSpecimenName(sceneId, contract.targets[0]) + '.');
        return true;
      }
      function retireFieldRun(sceneId) {
        var book = fieldBookRef.current || {}, entry = book.byScene && book.byScene[sceneId];
        if (!entry || !entry.active || entry.ready) return false;
        var contract = fieldExpeditionFor(sceneId, entry.contractIndex);
        var byScene = Object.assign({}, book.byScene || {}); byScene[sceneId] = retireFieldRunEntry(entry);
        saveFieldBook(Object.assign({}, book, { byScene: byScene }));
        addToast('Assignment retired. Journal discoveries and Field XP were kept.', 'info');
        announce((contract ? contract.label + ' retired. ' : 'Assignment retired. ') + 'Your specimen journal and Field XP are unchanged.');
        return true;
      }
      function collectFieldSample(sceneId, sample) {
        if (!sample || !sample.firstPerson) return false;
        var book = fieldBookRef.current || {};
        var discovery = recordFieldDiscovery(book.discoveredByScene, sceneId, sample.removedKey);
        var nextBook = Object.assign({ xp: 0, total: 0, byScene: {} }, book, { discoveredByScene: discovery.discoveredByScene });
        var securedName = fieldSpecimenName(sceneId, sample.removedKey);
        if (discovery.added) {
          var specimenFacts = rockFacts(sample.removedKey, sample.removedY);
          var specimenDetail = specimenFacts && specimenFacts.R ? specimenFacts.R.formation + ' ' + specimenFacts.R.age : 'Collected during first-person fieldwork.';
          addNotebookEvidence('specimen', securedName, specimenDetail, sample.removedKey);
        }
        var entry = book.byScene && book.byScene[sceneId];
        if (!entry || !entry.active) {
          if (discovery.added) {
            saveFieldBook(nextBook);
            var freeProgress = fieldDiscoveryProgress(sceneId, discovery.discoveredByScene);
            addToast('New specimen logged: ' + securedName + ' · ' + freeProgress.found + '/' + freeProgress.total + ' in this scene.', 'success');
            announce('New field journal specimen: ' + securedName + '. ' + freeProgress.found + ' of ' + freeProgress.total + ' mineable materials logged in this scene.');
          }
          return discovery.added;
        }
        var contract = fieldExpeditionFor(sceneId, entry.contractIndex);
        var advanced = advanceFieldRun(entry, contract, sample.removedKey);
        if (!advanced.matched) {
          if (discovery.added) {
            saveFieldBook(nextBook);
            addToast('New specimen logged: ' + securedName + ' · contract target unchanged.', 'success');
            announce('New field journal specimen: ' + securedName + '. Your current contract target is still ' + fieldSpecimenName(sceneId, advanced.expectedKey) + '.');
          }
          return discovery.added;
        }
        var byScene = Object.assign({}, book.byScene || {}); byScene[sceneId] = advanced.entry;
        nextBook.byScene = byScene; saveFieldBook(nextBook);
        var journalNote = discovery.added ? ' New specimen logged.' : '';
        if (advanced.ready) {
          addToast('Field set complete.' + journalNote + ' Return to the entry point to bank ' + fieldRunReward(contract) + ' XP.', 'success');
          announce('Sample secured: ' + securedName + '.' + journalNote + ' Field set complete. Return to the entry point to bank your field XP.');
        } else {
          var nextName = fieldSpecimenName(sceneId, advanced.expectedKey);
          addToast('Sample secured: ' + securedName + '.' + journalNote + ' Next: ' + nextName + '.', 'success');
          announce('Sample secured: ' + securedName + '.' + journalNote + ' Next specimen: ' + nextName + '.');
        }
        return true;
      }
      var LAYER_MILESTONE_XP = 15;
      function awardLayerMilestone(sceneId, here, walkedThisDive) {
        // First footfall on a layer pays a small, once-per-layer field XP so descending feeds the
        // rank bar; later dives still get the depth/temperature read-out, just no repeat pay-out.
        if (!here || !here.key) return false;
        var book = fieldBookRef.current || {}, layers = (book.layersByScene && typeof book.layersByScene === 'object') ? book.layersByScene : {};
        var seen = Array.isArray(layers[sceneId]) ? layers[sceneId].slice() : [];
        var fresh = seen.indexOf(here.key) < 0;
        var where = (here.layerName || here.key) + ' · ' + here.depthKm + ' km · ' + temperatureValue(here.tempC);
        if (!fresh) { addToast('Layer reached: ' + where + (walkedThisDive > 1 ? ' · ' + walkedThisDive + ' layers this dive' : ''), 'info'); return false; }
        seen.push(here.key);
        var nextLayers = Object.assign({}, layers); nextLayers[sceneId] = seen;
        var oldXp = Math.max(0, Math.floor(Number(book.xp) || 0)), newXp = oldXp + LAYER_MILESTONE_XP;
        var oldRank = fieldRankForXp(oldXp), newRank = fieldRankForXp(newXp);
        saveFieldBook(Object.assign({ xp: 0, total: 0, byScene: {} }, book, { xp: newXp, layersByScene: nextLayers }));
        var rankUp = oldRank.label !== newRank.label ? ' Rank up: ' + newRank.label + '!' : '';
        addToast('New layer reached: ' + where + ' · +' + LAYER_MILESTONE_XP + ' XP.' + rankUp, 'success');
        announce('New layer reached: ' + (here.layerName || here.key) + '. ' + temperatureSpeech(here.tempC) + '. You earned ' + LAYER_MILESTONE_XP + ' field XP.' + rankUp);
        return true;
      }
      function surveyFieldTarget(sceneId) {
        var book = fieldBookRef.current || {}, entry = book.byScene && book.byScene[sceneId];
        if (!entry || !entry.active) { announce('Start a Field Run before using the specimen survey.'); return null; }
        if (entry.ready) { announce('The specimen set is complete. Return to the entry point to bank it.'); return null; }
        var contract = fieldExpeditionFor(sceneId, entry.contractIndex);
        var targetKey = contract && contract.targets ? contract.targets[(entry.collected || []).length] : null;
        var E = window[ENGINE_KEY], result = E && E.fpSurvey ? E.fpSurvey(targetKey) : null;
        if (!result) { announce('The specimen survey is available while exploring in first person.'); return null; }
        if (result.cooldown) { announce('The survey pulse is recharging.'); return result; }
        if (!result.found) {
          addToast('Survey could not find an unexcavated ' + fieldSpecimenName(sceneId, targetKey) + ' specimen in this cutaway.', 'info');
          announce('No unexcavated ' + fieldSpecimenName(sceneId, targetKey) + ' specimen was found in this cutaway.');
          return result;
        }
        var reading = result.name + ' is about ' + result.distanceBlocks + ' block' + (result.distanceBlocks === 1 ? '' : 's') + ' ' + result.direction + ', ' + result.vertical + '.';
        addToast('Survey pulse: ' + reading + ' Turning you to face it.', 'info'); announce('Survey pulse. ' + reading + ' Your view now faces it.');
        return result;
      }
      function coreRigAction(action, value) {
        var engine = window[ENGINE_KEY];
        if (!engine || !coreRigSupported(scene)) { announce('The directional core rig is available in surface Walk and Dig expeditions.'); return null; }
        var state = engine.coreRigState ? engine.coreRigState() : (coreRigHud || { deployed: false, running: false });
        var result = null;
        if (action === 'toggle') {
          if (state.deployed) {
            if (state.running) {
              result = engine.coreRigCancel ? engine.coreRigCancel() : null;
            } else result = engine.coreRigPack ? engine.coreRigPack() : null;
          } else result = engine.coreRigDeploy ? engine.coreRigDeploy(coreRigConfigRef.current) : null;
        } else if (action === 'start') result = engine.coreRigStart ? engine.coreRigStart() : null;
        else if (action === 'feed' && CORE_RIG_FEED_MODES[value]) result = engine.coreRigSetFeedMode ? engine.coreRigSetFeedMode(value) : null;
        else if (action === 'coolant') result = engine.coreRigCoolant ? engine.coreRigCoolant() : null;
        else if (action === 'pack') result = engine.coreRigPack ? engine.coreRigPack() : null;
        else if (action === 'angle' && CORE_RIG_ANGLES[value]) {
          setCoreRigAngle(value); coreRigConfigRef.current = { angle: value, depth: coreRigConfigRef.current.depth }; upd('coreRigAngle', value);
          var angleProgramKey = coreRigProgramKey(value, coreRigConfigRef.current.depth); setCoreRigProgramSelection(angleProgramKey);
          setCoreRigChallenge(function (challenge) { return challenge && challenge.programKey !== angleProgramKey ? null : challenge; });
          result = state.deployed && engine.coreRigConfigure ? engine.coreRigConfigure(coreRigConfigRef.current) : { ok: true, state: state };
        } else if (action === 'depth' && CORE_RIG_DEPTHS.indexOf(Number(value)) >= 0) {
          var nextDepth = Number(value); setCoreRigDepth(nextDepth); coreRigConfigRef.current = { angle: coreRigConfigRef.current.angle, depth: nextDepth }; upd('coreRigDepth', nextDepth);
          var depthProgramKey = coreRigProgramKey(coreRigConfigRef.current.angle, nextDepth); setCoreRigProgramSelection(depthProgramKey);
          setCoreRigChallenge(function (challenge) { return challenge && challenge.programKey !== depthProgramKey ? null : challenge; });
          result = state.deployed && engine.coreRigConfigure ? engine.coreRigConfigure(coreRigConfigRef.current) : { ok: true, state: state };
        }
        if (result && result.state) setCoreRigHud(result.state);
        if (result && result.ok && action === 'feed' && result.state) announce(result.state.status);
        return result;
      }
      function reviewCoreRigReport(report) {
        if (!report || !Array.isArray(report.samples)) return false;
        var evaluation = report.evaluation || coreRigEvaluation(report);
        setCoreRigReview({ sceneId: SCENE.id, report: report });
        announce('Reviewing grade ' + evaluation.grade + ' bore, ' + evaluation.score + ' points, ' + coreRigAngleDegrees(report.angle) + ' degrees and ' + report.targetDepth + ' intervals.');
        return true;
      }
      function applyCoreRigTrajectory(angle, depth) {
        var engine = window[ENGINE_KEY], engineState = engine && engine.coreRigState ? engine.coreRigState() : null;
        if (engineState && (engineState.running || engineState.stage === 'deploying')) {
          announce('End the active bore before loading a new trajectory.');
          return null;
        }
        setCoreRigAngle(angle); setCoreRigDepth(depth); coreRigConfigRef.current = { angle: angle, depth: depth };
        upd('coreRigAngle', angle); upd('coreRigDepth', depth);
        if (engineState && engineState.deployed && engine.coreRigConfigure) {
          var configured = engine.coreRigConfigure(coreRigConfigRef.current);
          if (configured && configured.state) setCoreRigHud(configured.state);
        }
        setFpOn(true);
        setTimeout(function () {
          try {
            var focusTarget = engineState && engineState.deployed ? coreRigConsoleRef.current : containerRef.current;
            if (focusTarget) focusTarget.focus();
          } catch (trajectoryFocusError) {}
        }, 0);
        return { engineState: engineState };
      }
      function loadCoreRigProgram(program, experiment) {
        var requestedKey = typeof program === 'string' ? program : (program && (program.key || coreRigProgramKey(program.angle, program.depth)));
        var catalogProgram = coreRigProgramCatalog().filter(function (item) { return item.key === requestedKey; })[0];
        if (!catalogProgram) {
          announce('That core rig certification program is unavailable.');
          return false;
        }
        var experimentMode = !!(experiment && typeof experiment === 'object' && experiment.mode === 'compare');
        var experimentQuestion = experimentMode && typeof experiment.question === 'string' ? experiment.question.slice(0, 220) : '';
        var experimentControl = experimentMode && typeof experiment.controlLabel === 'string' ? experiment.controlLabel.slice(0, 180) : '';
        var trajectoryApplication = applyCoreRigTrajectory(catalogProgram.angle, catalogProgram.depth);
        if (!trajectoryApplication) return false;
        var certification = (fieldBookRef.current && fieldBookRef.current.coreCertification) || {};
        var cell = normalizeCoreRigPrograms(certification)[catalogProgram.key];
        var challenge = {
          kind: experimentMode ? 'experiment' : 'program', sceneId: SCENE.id, programKey: catalogProgram.key,
          programBestRating: cell.bestRating, angle: catalogProgram.angle, depth: catalogProgram.depth,
          question: experimentQuestion, controlLabel: experimentControl
        };
        setCoreRigReview(null); setCoreRigChallenge(challenge); setCoreRigProgramSelection(catalogProgram.key);
        var xpTarget = coreRigCertificationXpTarget(cell.bestRating);
        var stateCopy = cell.tier ? (cell.tierLabel + ' · best grade ' + cell.bestGrade + ' · rating ' + cell.bestRating) : (cell.attempts ? 'retry available' : 'open program');
        var targetCopy = xpTarget == null ? 'Program XP ceiling reached.' : ('A ' + xpTarget + '-point program rating reaches the next XP step.');
        var programNextAction = trajectoryApplication.engineState && trajectoryApplication.engineState.deployed ? 'Trajectory applied — start the bore.' : 'Program loaded — enter Walk and Dig, find level ground, then deploy the rig.';
        if (experimentMode) {
          addToast('Next experiment loaded · ' + catalogProgram.angleDegrees + '° / ' + catalogProgram.depth + '. ' + (experimentQuestion || experimentControl), 'info');
          announce('Next controlled experiment loaded. ' + catalogProgram.angleDegrees + ' degrees, ' + catalogProgram.depth + ' intervals. ' + experimentControl + '. ' + experimentQuestion + ' ' + programNextAction);
        } else {
          addToast('Program loaded · ' + catalogProgram.angleDegrees + '° / ' + catalogProgram.depth + ' · ' + stateCopy + '. ' + programNextAction, 'info');
          announce('Core rig certification program loaded. ' + catalogProgram.angleDegrees + ' degrees, ' + catalogProgram.depth + ' intervals. ' + stateCopy + '. ' + targetCopy + ' Grade C or better, at least 85 percent integrity, and target recovery or a safe boundary after 75 percent earns certification. ' + programNextAction);
        }
        return true;
      }
      function loadCoreRigChallenge(report) {
        if (!report) return false;
        var challengeAngle = CORE_RIG_ANGLES[report.angle] ? report.angle : 'vertical';
        var challengeDepth = CORE_RIG_DEPTHS.indexOf(Number(report.targetDepth)) >= 0 ? Number(report.targetDepth) : CORE_RIG_DEPTHS[1];
        if (!applyCoreRigTrajectory(challengeAngle, challengeDepth)) return false;
        var evaluation = report.evaluation || coreRigEvaluation(report);
        var research = (fieldBookRef.current.coreResearchByScene && fieldBookRef.current.coreResearchByScene[SCENE.id]) || {};
        var progress = coreRigChallengeProgress(evaluation.score, research.bestScore, null);
        var programKey = coreRigProgramKey(challengeAngle, challengeDepth);
        var program = normalizeCoreRigPrograms(fieldBookRef.current.coreCertification)[programKey];
        var challenge = {
          kind: 'score', sceneId: SCENE.id, report: report, replayScore: progress.replayScore,
          bestScore: progress.bestScore, programKey: programKey, programBestRating: program.bestRating,
          angle: challengeAngle, depth: challengeDepth
        };
        setCoreRigReview({ sceneId: SCENE.id, report: report }); setCoreRigChallenge(challenge); setCoreRigProgramSelection(programKey);
        var targetCopy = progress.xpTarget == null ? 'The 200-point research ceiling is already reached.' : (progress.xpTarget + ' points earns more research XP.');
        addToast('Challenge loaded · ' + coreRigAngleDegrees(challengeAngle) + '° / ' + challengeDepth + ' intervals · replay ' + progress.replayScore + '.', 'info');
        announce('Challenge trajectory loaded. Replay score ' + progress.replayScore + '. Personal best ' + progress.bestScore + '. ' + targetCopy);
        return true;
      }
      function finishFieldRun(sceneId) {
        var book = fieldBookRef.current || {};
        var entry = book.byScene && book.byScene[sceneId];
        if (!entry || !entry.active || !entry.ready) return false;
        var contract = fieldExpeditionFor(sceneId, entry.contractIndex);
        var reward = fieldRunReward(contract);
        var oldRank = fieldRankForXp(book.xp), newRank = fieldRankForXp((Number(book.xp) || 0) + reward);
        var completed = Math.max(0, Math.floor(Number(entry.completed) || 0)) + 1;
        var nextEntry = { active: false, completed: completed, contractIndex: completed % ((FIELD_EXPEDITIONS[sceneId] || [1]).length), collected: [], ready: false };
        var byScene = Object.assign({}, book.byScene || {}); byScene[sceneId] = nextEntry;
        var nextBook = Object.assign({}, book, { xp: Math.max(0, Math.floor(Number(book.xp) || 0)) + reward, total: Math.max(0, Math.floor(Number(book.total) || 0)) + 1, byScene: byScene });
        saveFieldBook(nextBook);
        addNotebookEvidence('field-run', contract.label, contract.brief + ' Collected in order: ' + contract.targets.map(function (key) { return fieldSpecimenName(sceneId, key); }).join(' → ') + '.', 'field-run-' + contract.id);
        var nextContract = fieldExpeditionFor(sceneId, completed);
        var rankUp = oldRank.label !== newRank.label ? ' Rank up: ' + newRank.label + '!' : '';
        addToast('Field run banked: +' + reward + ' XP.' + rankUp + ' Next: ' + (nextContract ? nextContract.label : 'new contract') + '.', 'success');
        announce('Field run complete. You earned ' + reward + ' field XP.' + rankUp);
        return true;
      }
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
        var readout = facts.measurementSummary || measurementSpeech(facts.measurements) || ('Depth about ' + facts.depthKm + ' kilometres');
        announce(msg || (facts.R.name + '. ' + facts.R.type + '. ' + readout + '. ' + facts.R.formation + ' ' + facts.R.age));
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
        setSelected(null); setFocusLensOn(false); setSlice(0); setExcavate(false);
        try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].reset(); window[ENGINE_KEY].setExcavate(false); window[ENGINE_KEY].setHighlight(null); if (window[ENGINE_KEY].setFocusLens) window[ENGINE_KEY].setFocusLens(false); } } catch (e) {}
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
        setSelected(null); setFocusLensOn(false); setSlice(0); setExcavate(false);
        try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].setExcavate(false); window[ENGINE_KEY].setSlice(0); window[ENGINE_KEY].setHighlight(null); if (window[ENGINE_KEY].setFocusLens) window[ENGINE_KEY].setFocusLens(false); if (!motionReduced()) window[ENGINE_KEY].erupt(); } } catch (e) {}
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
        var mountedEngine = null;
        var excavationKey = excavationWorldKey(scene, res);
        try {
          mountedEngine = initEngine(containerRef.current, {
            initialExcavation: excavationByWorldRef.current[excavationKey] || { history: [], redo: [] },
            onSelect: function (facts) { selectRock(facts); },
            onUncover: function (k) { uncoverFossil(k); },
            onFlash: function (m) { addToast(m, 'info'); },
            onLayerMilestone: function (here, n) { awardLayerMilestone(SCENE.id, here, n); },
            onExcavateChange: function (count, state) {
              state = state || { history: [], redo: [] };
              if (!count) undoPreviewIntentRef.current = { hover: false, focus: false };
              setDigCount(count); setRedoCount((state.redo || []).length);
              var next = Object.assign({}, excavationByWorldRef.current);
              if (!(state.history || []).length && !(state.redo || []).length) delete next[excavationKey];
              else next[excavationKey] = { history: (state.history || []).slice(), redo: (state.redo || []).slice() };
              excavationByWorldRef.current = next; upd('excavationByWorld', next);
            },
            onExcavate: function (sample) { collectFieldSample(scene, sample); },
            onCoreRigState: function (state) {
              var nextRigStage = state && state.stage;
              var enteringCoreRigDebrief = nextRigStage && ['complete', 'stopped', 'paused'].indexOf(nextRigStage) >= 0 &&
                nextRigStage !== coreRigStageAnnounceRef.current;
              if (enteringCoreRigDebrief) {
                try {
                  var activeCoreRigControl = document.activeElement;
                  coreRigDebriefFocusRef.current = !!(activeCoreRigControl && coreRigConsoleRef.current &&
                    coreRigConsoleRef.current.contains(activeCoreRigControl));
                } catch (coreRigActiveFocusError) { coreRigDebriefFocusRef.current = false; }
              } else if (nextRigStage && ['complete', 'stopped', 'paused'].indexOf(nextRigStage) < 0) {
                coreRigDebriefFocusRef.current = false;
              }
              setCoreRigHud(state);
              if (nextRigStage && nextRigStage !== coreRigStageAnnounceRef.current) {
                coreRigStageAnnounceRef.current = nextRigStage;
                var coreRigStateSampleCount = state && Array.isArray(state.samples) ? state.samples.length : 0;
                if (nextRigStage === 'cooling' || (!coreRigStateSampleCount && ['complete', 'stopped', 'paused'].indexOf(nextRigStage) >= 0)) announce(state.status);
              }
            },
            onCoreRigComplete: function (report) { saveCoreRigReport(scene, report); },
            onFpHome: function () { finishFieldRun(scene); },
            onFpProbe: function (p) { if (!p) return; setFpHud(p); var nw = (window.performance && performance.now) ? performance.now() : Date.now(); if (nw - fpAnnAtRef.current > 1200) { fpAnnAtRef.current = nw; announce(fpAnnounceText(p)); } },   // HUD every layer change; SR debounced so fast flight can't flood it
            onContextLost: function () { setWebglError(true); setDigCount(0); setRedoCount(0); try { if (mountedEngine) mountedEngine.dispose(); if (window[ENGINE_KEY] === mountedEngine) window[ENGINE_KEY] = null; } catch (e) {} }
          });
          window[ENGINE_KEY] = mountedEngine;
          if (mountedEngine && mountedEngine.coreRigState) setCoreRigHud(mountedEngine.coreRigState());
          restoreEnginePresentation(window[ENGINE_KEY], selectedKeyRef.current, focusLensRef.current, cameraViewRef.current);
        } catch (e) { setWebglError(true); }
        return function () { try { if (mountedEngine) mountedEngine.dispose(); if (window[ENGINE_KEY] === mountedEngine) window[ENGINE_KEY] = null; } catch (e) {} };
      }, [threeReady, webglError, res, scene]);

      React.useEffect(function () {
        if (!threeReady || webglError) return;
        var scienceEngine = window[ENGINE_KEY];
        if (scienceEngine && scienceEngine.setScienceStage) scienceEngine.setScienceStage(sceneJourneyStep);
      }, [sceneJourneyStep, threeReady, webglError, res, scene]);

      // ── first-person: ARM the engine (re-runs whenever the engine is rebuilt on scene/detail change, so FP survives a world switch) ──
      React.useEffect(function () {
        if (!threeReady || webglError) return;
        var E = window[ENGINE_KEY]; if (!E || !E.setFirstPerson) return;
        var reduced = false; try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
        try { E.setFirstPerson(fpOn, { reduced: reduced, tool: fpTool }); } catch (e) {}
        return function () { try { if (window[ENGINE_KEY]) window[ENGINE_KEY].setFirstPerson(false); } catch (e) {} };
      }, [fpOn, threeReady, webglError, res, scene]);

      // ── first-person: focus + announce ONLY on a real enter/exit transition (deps [fpOn]) — never re-fired by a scene rebuild ──
      React.useEffect(function () {
        if (fpOn) {
          fpAnnAtRef.current = 0;   // let the first layer announce immediately on entry
          try { fpPrevFocusRef.current = document.activeElement; } catch (e) {}
          setTimeout(function () { try { if (containerRef.current) containerRef.current.focus(); } catch (e) {} }, 0);
          var fpInstructions = fpExplorerMode(scene) === 'mine'
            ? 'Mine mode on. W A S D or arrow keys walk, Space jumps, Shift sprints, I J K L or drag looks. Press 1 for the pickaxe or 2 for the powered drill. Hold X to drill continuously, R deploys the directional core rig, G surveys a Field Run target, Z undoes, Y redoes, and H returns home. Escape exits.'
            : 'Deep Earth flight on. W A S D or arrow keys fly, Q and E move up and down, I J K L or drag looks. Press 1 for the pickaxe or 2 for the powered drill. Hold X to drill continuously, Enter excavates instantly, Z undoes, Y redoes, and H returns home. Escape exits.';
          announce(t('stem.geology.fp_on', fpInstructions));
        } else {
          setFpHud(null);
          try { var pf = fpPrevFocusRef.current; if (pf && pf.focus) pf.focus(); else if (fpToggleRef.current) fpToggleRef.current.focus(); } catch (e) {}
        }
      }, [fpOn]);

      // ── first-person: keyboard, scoped to the focused viewport so it never hijacks page keys (re-binds on engine rebuild so held keys don't stall) ──
      React.useEffect(function () {
        if (!fpOn) return;
        var el = containerRef.current; if (!el) return;
        var ax = { fwd: 0, strafe: 0, vert: 0, jump: false, sprint: false }, lk = { yaw: 0, pitch: 0 };
        var MOVE = fpExplorerMode(scene) === 'mine'
          ? { w: 'fwd+', arrowup: 'fwd+', s: 'fwd-', arrowdown: 'fwd-', a: 'strafe-', arrowleft: 'strafe-', d: 'strafe+', arrowright: 'strafe+', ' ': 'jump+' }
          : { w: 'fwd+', arrowup: 'fwd+', s: 'fwd-', arrowdown: 'fwd-', a: 'strafe-', arrowleft: 'strafe-', d: 'strafe+', arrowright: 'strafe+', e: 'vert+', q: 'vert-' };
        var LOOK = { j: 'yaw+', l: 'yaw-', i: 'pitch+', k: 'pitch-' };   // keyboard turn (WCAG: look must be keyboard-operable, not drag-only)
        function pushMove() { try { if (window[ENGINE_KEY]) window[ENGINE_KEY].fpInput('move', { fwd: ax.fwd, strafe: ax.strafe, vert: ax.vert, jump: ax.jump, sprint: ax.sprint }); } catch (e) {} }
        function pushLook() { try { if (window[ENGINE_KEY]) window[ENGINE_KEY].fpInput('look', { yaw: lk.yaw, pitch: lk.pitch }); } catch (e) {} }
        function set(e, on) {
          var key = (e.key || '').toLowerCase();
          if (key === 'escape') { if (on) { try { e.preventDefault(); e.stopPropagation(); } catch (x) {} setFpOn(false); } return; }   // exit FP only — don't also collapse fullscreen
          if (key === 'x') {
            e.preventDefault();
            try {
              var drillEngine = window[ENGINE_KEY];
              if (drillEngine && drillEngine.fpMiningHeld) drillEngine.fpMiningHeld(on);
              if (on && !e.repeat && drillEngine && drillEngine.fpMine) drillEngine.fpMine(false);
            } catch (x) {}
            return;
          }
          if (on && key === 'enter') {
            e.preventDefault(); if (e.repeat) return;
            try { if (window[ENGINE_KEY] && window[ENGINE_KEY].fpMine) window[ENGINE_KEY].fpMine(true); } catch (x) {}
            return;
          }
          if (on && (key === '1' || key === '2')) {
            e.preventDefault(); if (e.repeat) return;
            var nextTool = key === '2' ? 'drill' : 'pick';
            setFpTool(nextTool); upd('fpTool', nextTool);
            try { if (window[ENGINE_KEY] && window[ENGINE_KEY].fpSetTool) window[ENGINE_KEY].fpSetTool(nextTool); } catch (x) {}
            announce((nextTool === 'drill' ? 'Powered drill' : 'Pickaxe') + ' selected.');
            return;
          }
          if (on && key === 'z') {
            e.preventDefault(); if (e.repeat) return;
            try { if (window[ENGINE_KEY] && window[ENGINE_KEY].fpUndoMine) window[ENGINE_KEY].fpUndoMine(); } catch (x) {}
            return;
          }
          if (on && key === 'y') {
            e.preventDefault(); if (e.repeat) return;
            try { if (window[ENGINE_KEY] && window[ENGINE_KEY].fpRedoMine) window[ENGINE_KEY].fpRedoMine(); } catch (x) {}
            return;
          }
          if (on && key === 'g') {
            e.preventDefault(); if (e.repeat) return;
            surveyFieldTarget(scene);
            return;
          }
          if (on && key === 'r' && coreRigSupported(scene)) {
            e.preventDefault(); if (e.repeat) return;
            coreRigAction('toggle');
            return;
          }
          if (on && key === 'h') {
            e.preventDefault(); if (e.repeat) return;
            try { if (window[ENGINE_KEY] && window[ENGINE_KEY].fpRespawn) window[ENGINE_KEY].fpRespawn(); } catch (x) {}
            return;
          }
          if (key === 'shift') { ax.sprint = on; pushMove(); return; }
          var m = MOVE[key]; if (m) { e.preventDefault(); ax[m.slice(0, -1)] = on ? (m.slice(-1) === '+' ? 1 : -1) : 0; pushMove(); return; }
          var lo = LOOK[key]; if (lo) { e.preventDefault(); lk[lo.slice(0, -1)] = on ? (lo.slice(-1) === '+' ? 1 : -1) : 0; pushLook(); return; }
        }
        function kd(e) { set(e, true); } function ku(e) { set(e, false); }
        el.addEventListener('keydown', kd); el.addEventListener('keyup', ku);
        return function () { el.removeEventListener('keydown', kd); el.removeEventListener('keyup', ku); try { if (window[ENGINE_KEY]) { window[ENGINE_KEY].fpInput('move', { fwd: 0, strafe: 0, vert: 0, jump: false, sprint: false }); window[ENGINE_KEY].fpInput('look', { yaw: 0, pitch: 0 }); if (window[ENGINE_KEY].fpMiningHeld) window[ENGINE_KEY].fpMiningHeld(false); } } catch (e) {} };
      }, [fpOn, threeReady, webglError, res, scene]);

      // ── styling helpers ──
      var cardBg = isDark ? 'bg-slate-800/70 border-slate-700 shadow-md shadow-black/20' : 'bg-white border-slate-200 shadow-sm';
      var muted = isDark ? 'text-slate-400' : 'text-slate-600';
      var ink = isDark ? 'text-slate-100' : 'text-slate-800';

      // ── selected info panel (shared by 3D + list) ──
      function toggleFocusLens() {
        if (!selected) return;
        var next = !focusLensOn, pausedDigging = next && excavate;
        if (next) clearUndoPreviewIntent();
        setFocusLensOn(next);
        if (pausedDigging) setExcavate(false);
        try {
          if (window[ENGINE_KEY]) {
            if (pausedDigging && window[ENGINE_KEY].setExcavate) window[ENGINE_KEY].setExcavate(false);
            if (window[ENGINE_KEY].setFocusLens) window[ENGINE_KEY].setFocusLens(next);
          }
        } catch (e) {}
        announce(next ? 'Focus lens on. Showing ' + selected.R.name + ' apart from surrounding materials.' + (pausedDigging ? ' Excavation was turned off while surrounding layers are hidden.' : '') : 'Focus lens off. Full scene context restored.');
      }
      function previewLastExcavation(on) {
        try { return !!(window[ENGINE_KEY] && window[ENGINE_KEY].setUndoPreview && window[ENGINE_KEY].setUndoPreview(!!on)); } catch (e) { return false; }
      }
      function setUndoPreviewIntent(kind, on) {
        var intent = undoPreviewIntentRef.current || { hover: false, focus: false };
        intent[kind] = !!on; undoPreviewIntentRef.current = intent;
        return previewLastExcavation(intent.hover || intent.focus);
      }
      function clearUndoPreviewIntent() {
        undoPreviewIntentRef.current = { hover: false, focus: false };
        return previewLastExcavation(false);
      }
      function undoLastExcavation() {
        var engine = window[ENGINE_KEY];
        clearUndoPreviewIntent();
        if (!engine || !engine.undoExcavate) return;
        var restored = engine.undoExcavate();
        if (!restored) { announce('There is no excavation to undo.'); return; }
        var facts = rockFacts(restored.key, restored.y);
        selectRock(facts, false, 'Restored ' + restored.name + '. ' + (restored.remaining ? restored.remaining + ' excavated blocks remain.' : 'The outcrop is back to its original surface.'));
      }
      function redoLastExcavation() {
        var engine = window[ENGINE_KEY];
        clearUndoPreviewIntent();
        if (!engine || !engine.redoExcavate) return;
        var redone = engine.redoExcavate();
        if (!redone) { announce('There is no excavation to redo.'); return; }
        var facts = rockFacts(redone.key, redone.y);
        selectRock(facts, false, 'Re-excavated ' + redone.name + '. ' + redone.count + (redone.count === 1 ? ' block is' : ' blocks are') + ' now removed.');
      }
      function infoPanel() {
        if (!selected) return h('div', { className: 'text-xs ' + muted + ' p-3 rounded-xl border ' + cardBg }, t('stem.geology.pick_hint', 'Pick a material — in the 3D model or the list below — to see its scene-specific position, scale, conditions, formation, and age relationship.'));
        var f = selected, R = f.R, tc = TYPE_COLOR[R.type] || '#64748b', F = FOSSILS[f.key];
        var measurements = f.measurements && f.measurements.length ? f.measurements : [depthMeasurement(f, 'Depth'), temperatureMeasurement(f), pressureMeasurement(f)];
        var measurementNodes = [];
        measurements.forEach(function (row) {
          measurementNodes.push(h('span', { key: row.id + '-label', className: muted }, row.label));
          measurementNodes.push(h('span', { key: row.id + '-value', 'data-geology-measurement': row.id, className: row.emphasis ? ('font-semibold ' + (isDark ? 'text-amber-200' : 'text-amber-800')) : '' }, row.value));
        });
        if (f.state && f.state !== 'solid') {
          measurementNodes.push(h('span', { key: 'state-label', className: muted }, t('stem.geology.state', 'State')));
          measurementNodes.push(h('span', { key: 'state-value', className: 'font-semibold', style: { color: '#f59e0b' }, 'data-geology-measurement': 'state' }, f.state));
        }
        measurementNodes.push(h('span', { key: 'forms-label', className: muted }, t('stem.geology.forms', 'Forms by')));
        measurementNodes.push(h('span', { key: 'forms-value' }, R.formation));
        measurementNodes.push(h('span', { key: 'minerals-label', className: muted }, t('stem.geology.minerals', 'Minerals')));
        measurementNodes.push(h('span', { key: 'minerals-value' }, R.minerals));
        return h('div', { className: 'p-3 rounded-xl border ' + cardBg, style: { borderLeft: '3px solid ' + tc }, role: 'region', 'aria-label': 'Selected rock details' },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' }, [
            h('div', { key: 'name', className: 'text-base font-extrabold tracking-tight ' + ink }, R.name),
            h('button', { key: 'lens', type: 'button', 'aria-pressed': focusLensOn ? 'true' : 'false', 'aria-label': 'Isolate selected material in the scene', 'data-geology-focus-lens': 'true', onClick: toggleFocusLens, className: 'rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ' + (focusLensOn ? 'border-cyan-400 bg-cyan-700 text-white' : (isDark ? 'border-slate-600 bg-slate-900/60 text-slate-100 hover:border-cyan-400' : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-500')) }, focusLensOn ? '◉ Focus lens: ON' : '◎ Focus lens: OFF')
          ]),
          h('span', { className: 'inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 mb-2', style: { color: tc, background: tc + '22', border: '1px solid ' + tc + '55' } }, R.type),
          h('div', { className: 'grid gap-1 text-[12px] ' + ink, style: { gridTemplateColumns: '92px minmax(0, 1fr)' } }, measurementNodes),
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
        setSceneJourneyStep(next);
        setSceneResumeNotice(null);
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
          setSceneResumeNotice(null);
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
            sceneResumeNotice && sceneResumeNotice.sceneId === SCENE.id
              ? h('p', { key: 'resume', className: 'mt-2 text-[11px] font-semibold ' + (isDark ? 'text-sky-300' : 'text-sky-700'), role: 'status', 'data-geology-resumed-stage': 'true' }, '↪ ' + sceneResumeNotice.message + ' Saved process evidence remains linked.')
              : null,
            h('div', { key: 'steps', className: 'relative mt-3' }, [
              h('div', { key: 'line', className: 'absolute left-[16%] right-[16%] top-5 hidden h-px ' + (isDark ? 'bg-slate-600' : 'bg-slate-300') + ' sm:block', 'aria-hidden': 'true' }),
              h('div', { key: 'buttons', className: 'relative grid grid-cols-3 gap-1.5' }, journey.map(function (item, index) {
                var on = index === activeIndex;
                var done = !!journeyComplete[index];
                return h('button', { key: item.key, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Stage ' + (index + 1) + ': ' + item.label, 'data-geology-journey-step': item.key, 'data-geology-journey-complete': done ? 'true' : 'false', onClick: function () { chooseJourneyStep(index); }, className: 'min-w-0 rounded-lg border px-1.5 py-2 text-center transition-colors ' + (on ? 'border-violet-500 bg-violet-600 text-white shadow-sm' : (done ? (isDark ? 'border-emerald-500/60 bg-emerald-950/20 text-emerald-200 hover:border-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400') : (isDark ? 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-violet-400' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-400'))) }, [
                  h('span', { key: 'number', className: 'mx-auto flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black ' + (on ? 'border-white/60 bg-white/15' : (done ? (isDark ? 'border-emerald-400 text-emerald-200' : 'border-emerald-500 text-emerald-700') : (isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'))) }, done ? '✓' : index + 1),
                  h('span', { key: 'label', className: 'mt-1 block text-[10px] font-bold leading-tight' }, item.cueLabel),
                  h('span', { key: 'status', className: 'mt-0.5 block text-[10px] font-semibold', 'aria-hidden': 'true' }, done ? 'Evidence linked' : 'Explore next')
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
                    h('span', { key: 'state', className: 'mt-0.5 block text-[10px] font-semibold', 'aria-hidden': 'true' }, entry.saved ? 'Notebook saved' : 'Find landmark')
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
        var fields = h('div', { key: 'fields', className: 'mt-2 space-y-2' }, [
          h('label', { key: 'claim', className: 'block text-[11px] font-bold ' + ink }, [
            'Claim',
            h('textarea', { key: 'field', rows: 2, value: notebook.claim || '', onChange: function (e) { setNotebookField('claim', e.target.value); }, placeholder: 'I think this world formed because…', className: 'mt-1 block w-full rounded-lg border p-2 text-[12px] font-normal ' + (isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800') })
          ]),
          h('label', { key: 'explanation', className: 'block text-[11px] font-bold ' + ink }, [
            'Explain your evidence',
            h('textarea', { key: 'field', rows: 4, value: explanation, onChange: function (e) { setNotebookField('explanation', e.target.value); }, placeholder: 'Use two or more observations. Connect what you saw to the process.', className: 'mt-1 block w-full rounded-lg border p-2 text-[12px] font-normal ' + (isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800') })
          ]),
          h('label', { key: 'reflection', className: 'block text-[11px] font-bold ' + ink }, [
            'Reflection: Which observation changed your thinking?',
             h('textarea', { key: 'field', rows: 3, value: notebook.reflection || '', onChange: function (e) { setNotebookField('reflection', e.target.value); }, placeholder: 'Name the observation that changed, strengthened, or complicated your first idea.', className: 'mt-1 block w-full rounded-lg border p-2 text-[12px] font-normal ' + (isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800') })
           ]),
        ]);
        var rubricBox = h('div', { key: 'rubric', className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/50' : 'bg-slate-50 border-slate-200'), role: 'region', 'aria-label': 'CER rubric' }, [
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
        var evidenceMapBox = h('section', { key: 'evidence-map', className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'), role: 'region', 'aria-label': 'Evidence map', 'data-geology-evidence-map': 'true' }, [
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
        var evidenceBox = h('div', { key: 'evidence', className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50') }, [
          h('div', { key: 'title', className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Collected evidence'),
          evidence.length
            ? h('ul', { key: 'list', className: 'mt-1 space-y-1 text-[11px] ' + ink }, evidence.map(function (item) { return h('li', { key: item.id }, [h('strong', { key: 'label' }, item.label + ': '), item.detail]); }))
            : h('p', { key: 'empty', className: 'mt-1 text-[11px] ' + muted }, 'Your observations will appear here as you explore.')
        ]);
        var actions = h('div', { key: 'actions', className: 'mt-2 flex flex-wrap gap-1.5' }, [
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
        var focusKey = focusLensOn && selected ? selected.key : null;
        var crossFocus = !!focusKey && (bands.indexOf(focusKey) >= 0 || focusKey === 'intrusion');
        var bh = 26, W = 150, rows = bands.map(function (k, i) {
          var focusState = !crossFocus ? 'context' : (focusKey === k ? 'match' : 'muted');
          return h('g', { key: k, opacity: focusState === 'muted' ? 0.2 : 1, 'data-geology-focus-state': focusState },
            h('rect', { x: 0, y: i * bh, width: W, height: bh, fill: hex(ROCKS[k].color), stroke: focusState === 'match' ? '#fbbf24' : 'rgba(0,0,0,0.25)', strokeWidth: focusState === 'match' ? 2 : 1 }),
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
          // you-are-here: while exploring in first person, a marker tracks the layer underfoot so the
          // 3D view and the accessible column tell one story (row from the HUD probe's voxel band)
          (fpOn && fpHud && fpHud.key) ? (function () {
            var row = bands.indexOf(fpHud.key === 'intrusion' ? 'basement' : fpHud.key); if (row < 0) return null;
            var vy = typeof fpHud.voxelY === 'number' ? fpHud.voxelY : null;
            var cy = row * bh + bh * 0.5, mx = fpHud.key === 'intrusion' ? W / 2 : W - 12;
            return h('g', { key: 'you', 'data-geology-you-are-here': fpHud.key, 'data-voxel-y': vy == null ? '' : String(vy) },
              h('line', { x1: 0, y1: cy, x2: W, y2: cy, stroke: '#fbbf24', strokeWidth: 1.5, strokeDasharray: '3 3', opacity: 0.9 }),
              h('circle', { cx: mx, cy: cy, r: 6, fill: '#fbbf24', stroke: '#78350f', strokeWidth: 1.5 }),
              h('text', { x: mx, y: cy + 3.5, fontSize: 10, textAnchor: 'middle', fill: '#78350f', style: { fontWeight: 800 } }, '⛏')
            );
          })() : null,
          h('polygon', { points: (W / 2) + ',' + (bands.length * bh) + ' ' + (W / 2 - 14) + ',' + (2 * bh) + ' ' + (W / 2 + 14) + ',' + (2 * bh), fill: hex(ROCKS.intrusion.color), opacity: crossFocus && focusKey !== 'intrusion' ? 0.2 : 0.92, stroke: crossFocus && focusKey === 'intrusion' ? '#fbbf24' : 'rgba(255,255,255,0.4)', strokeWidth: crossFocus && focusKey === 'intrusion' ? 2 : 1, 'data-geology-focus-state': !crossFocus ? 'context' : (focusKey === 'intrusion' ? 'match' : 'muted') })
        );
      }
      function geodeSchematicDiagram(v) {
        return [
          v.mark('circle', 'limestone', { key: 'host', cx: 180, cy: 92, r: 78, fill: v.color('limestone') }),
          v.mark('circle', 'chalcedony', { key: 'rind', cx: 180, cy: 92, r: 64, fill: v.color('chalcedony') }),
          v.mark('circle', 'agate', { key: 'bands', cx: 180, cy: 92, r: 52, fill: v.color('agate') }),
          v.mark('circle', 'quartz', { key: 'quartz', cx: 180, cy: 92, r: 39, fill: v.color('quartz') }),
          v.mark('circle', 'amethyst', { key: 'amethyst', cx: 180, cy: 92, r: 27, fill: v.color('amethyst') }),
          v.h('circle', { key: 'open', cx: 180, cy: 92, r: 11, fill: v.bg, stroke: v.edge, strokeWidth: 1.25 }),
          v.line('host-leader', 36, 28, 112, 43),
          v.text('Host limestone', 10, 24, 'start'),
          v.line('rind-leader', 56, 69, 117, 72),
          v.text('Wall rind', 10, 67, 'start'),
          v.line('bands-leader', 244, 61, 326, 48),
          v.text('Agate bands', 350, 45, 'end'),
          v.line('crystal-leader', 220, 106, 323, 113),
          v.text('Crystal tips', 350, 117, 'end'),
          v.line('center-leader', 191, 101, 305, 150),
          v.text('Open center', 350, 158, 'end'),
          v.h('line', { key: 'growth-arrow', x1: 120, y1: 174, x2: 240, y2: 174, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('Wall first', 112, 160, 'end'),
          v.text('Center later', 248, 160, 'start')
        ];
      }
      function deepEarthSchematicDiagram(v) {
        return [
          v.mark('circle', 'crust', { key: 'crust', cx: 122, cy: 94, r: 80, fill: v.color('crust') }),
          v.mark('circle', 'upperMantle', { key: 'upper-mantle', cx: 122, cy: 94, r: 73, fill: v.color('upperMantle') }),
          v.mark('circle', 'lowerMantle', { key: 'lower-mantle', cx: 122, cy: 94, r: 56, fill: v.color('lowerMantle') }),
          v.mark('circle', 'outerCore', { key: 'outer-core', cx: 122, cy: 94, r: 39, fill: v.color('outerCore') }),
          v.mark('circle', 'innerCore', { key: 'inner-core', cx: 122, cy: 94, r: 19, fill: v.color('innerCore') }),
          v.line('crust-leader', 177, 36, 238, 22),
          v.text('Thin crust', 350, 25, 'end'),
          v.line('mantle-leader', 169, 62, 238, 58),
          v.text('Solid mantle', 350, 62, 'end'),
          v.line('outer-leader', 159, 96, 238, 96),
          v.text('Liquid outer core', 350, 100, 'end'),
          v.line('inner-leader', 138, 109, 238, 137),
          v.text('Solid inner core', 350, 142, 'end'),
          v.h('path', { key: 's-wave', d: 'M 8 156 Q 48 111 84 105', fill: 'none', stroke: v.arrow, strokeWidth: 2, strokeDasharray: '6 3', markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('S-wave stops at liquid', 10, 181, 'start')
        ];
      }
      function subductionSchematicDiagram(v) {
        return [
          v.mark('rect', 'asthenosphere', { key: 'asthenosphere', x: 0, y: 96, width: 360, height: 94, fill: v.color('asthenosphere') }),
          v.mark('rect', 'oceanWater', { key: 'water', x: 0, y: 0, width: 145, height: 47, fill: v.color('oceanWater') }),
          v.mark('polygon', 'oceanCrust', { key: 'ocean-crust', points: '0,47 132,47 176,81 163,94 124,62 0,62', fill: v.color('oceanCrust') }),
          v.mark('polygon', 'slab', { key: 'slab', points: '120,50 134,43 278,169 260,183', fill: v.color('slab') }),
          v.mark('polygon', 'contCrust', { key: 'continental-crust', points: '142,42 360,27 360,63 174,78', fill: v.color('contCrust') }),
          v.mark('polygon', 'lithMantle', { key: 'lithosphere', points: '174,78 360,63 360,103 219,116', fill: v.color('lithMantle') }),
          v.mark('polygon', 'wedge', { key: 'mantle-wedge', points: '176,81 356,105 264,166', fill: v.color('wedge') }),
          v.mark('path', 'arcMagma', { key: 'arc-magma', d: 'M 251 132 C 252 105 268 83 281 54', fill: 'none', stroke: v.color('arcMagma'), strokeWidth: 9, strokeLinecap: 'round' }),
          v.mark('polygon', 'arcVolcano', { key: 'arc-volcano', points: '258,42 281,14 305,40', fill: v.color('arcVolcano') }),
          v.text('Oceanic plate', 10, 22, 'start'),
          v.line('trench-leader', 137, 34, 145, 49),
          v.text('Trench', 134, 30, 'end'),
          v.line('slab-leader', 76, 116, 176, 102),
          v.text('Cold slab + water', 10, 121, 'start'),
          v.line('wedge-leader', 276, 128, 329, 142),
          v.text('Fluxed mantle wedge', 350, 151, 'end'),
          v.line('arc-leader', 303, 28, 335, 20),
          v.text('Volcanic arc', 350, 18, 'end'),
          v.h('path', { key: 'water-flux', d: 'M 174 94 Q 205 106 229 128', fill: 'none', stroke: v.arrow, strokeWidth: 2, strokeDasharray: '5 3', markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('Released water enables melting', 350, 181, 'end')
        ];
      }
      function ridgeSchematicDiagram(v) {
        return [
          v.mark('rect', 'oceanWater', { key: 'water', x: 0, y: 0, width: 360, height: 70, fill: v.color('oceanWater') }),
          v.mark('rect', 'asthenosphere', { key: 'asthenosphere', x: 0, y: 145, width: 360, height: 45, fill: v.color('asthenosphere') }),
          v.mark('polygon', 'lithMantle', { key: 'left-lithosphere', points: '0,119 147,108 163,145 0,145', fill: v.color('lithMantle') }),
          v.mark('polygon', 'lithMantle', { key: 'right-lithosphere', points: '197,145 213,108 360,119 360,145', fill: v.color('lithMantle') }),
          v.mark('polygon', 'gabbro', { key: 'gabbro', points: '0,100 145,91 161,116 199,116 215,91 360,100 360,119 213,108 198,141 162,141 147,108 0,119', fill: v.color('gabbro') }),
          v.mark('polygon', 'dikes', { key: 'left-dikes', points: '0,88 150,78 161,116 145,91 0,100', fill: v.color('dikes') }),
          v.mark('polygon', 'dikes', { key: 'right-dikes', points: '199,116 210,78 360,88 360,100 215,91', fill: v.color('dikes') }),
          v.mark('polygon', 'basaltN', { key: 'left-normal-far', points: '0,72 56,71 56,88 0,92', fill: v.color('basaltN') }),
          v.mark('polygon', 'basaltR', { key: 'left-reversed', points: '56,71 108,68 110,84 56,88', fill: v.color('basaltR') }),
          v.mark('polygon', 'basaltN', { key: 'left-normal-near', points: '108,68 151,57 162,77 110,84', fill: v.color('basaltN') }),
          v.mark('polygon', 'basaltN', { key: 'axis-basalt', points: '151,57 180,44 209,57 198,77 180,67 162,77', fill: v.color('basaltN') }),
          v.mark('polygon', 'basaltN', { key: 'right-normal-near', points: '209,57 252,68 250,84 198,77', fill: v.color('basaltN') }),
          v.mark('polygon', 'basaltR', { key: 'right-reversed', points: '252,68 304,71 304,88 250,84', fill: v.color('basaltR') }),
          v.mark('polygon', 'basaltN', { key: 'right-normal-far', points: '304,71 360,72 360,92 304,88', fill: v.color('basaltN') }),
          v.mark('polygon', 'sediment', { key: 'left-sediment', points: '0,65 76,65 76,72 0,72', fill: v.color('sediment') }),
          v.mark('polygon', 'sediment', { key: 'right-sediment', points: '284,65 360,65 360,72 284,72', fill: v.color('sediment') }),
          v.mark('ellipse', 'axialMagma', { key: 'magma-lens', cx: 180, cy: 132, rx: 25, ry: 9, fill: v.color('axialMagma') }),
          v.mark('path', 'vent', { key: 'vent-chimney', d: 'M 229 78 L 229 58 M 224 58 L 234 58', fill: 'none', stroke: v.color('vent'), strokeWidth: 5, strokeLinecap: 'round' }),
          v.h('line', { key: 'spread-left', x1: 166, y1: 33, x2: 94, y2: 33, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.h('line', { key: 'spread-right', x1: 194, y1: 33, x2: 266, y2: 33, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('Older flank', 12, 21, 'start'),
          v.text('Axis: youngest', 180, 20, 'middle'),
          v.text('Older flank', 348, 21, 'end'),
          v.h('line', { key: 'upwelling', x1: 180, y1: 183, x2: 180, y2: 151, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('Upwelling mantle', 10, 181, 'start'),
          v.text('Mirrored magnetic stripes', 350, 181, 'end')
        ];
      }
      function hotspotSchematicDiagram(v) {
        return [
          v.mark('rect', 'oceanWater', { key: 'water', x: 0, y: 0, width: 360, height: 74, fill: v.color('oceanWater') }),
          v.mark('rect', 'oceanCrust', { key: 'ocean-crust', x: 0, y: 74, width: 360, height: 18, fill: v.color('oceanCrust') }),
          v.mark('rect', 'lithMantle', { key: 'lithosphere', x: 0, y: 92, width: 360, height: 40, fill: v.color('lithMantle') }),
          v.mark('rect', 'asthenosphere', { key: 'asthenosphere', x: 0, y: 132, width: 360, height: 58, fill: v.color('asthenosphere') }),
          v.mark('path', 'plume', { key: 'plume', d: 'M 230 190 C 235 166 236 151 228 139 C 223 130 232 121 248 121 C 264 121 274 130 268 140 C 260 153 261 168 267 190 Z', fill: v.color('plume') }),
          v.mark('path', 'conduit', { key: 'conduit', d: 'M 248 126 L 248 55', fill: 'none', stroke: v.color('conduit'), strokeWidth: 8, strokeLinecap: 'round' }),
          v.mark('polygon', 'seamount', { key: 'seamount', points: '29,82 55,61 82,82', fill: v.color('seamount') }),
          v.mark('polygon', 'oldIsland', { key: 'old-island', points: '121,74 150,43 180,74', fill: v.color('oldIsland') }),
          v.mark('polygon', 'activeVolcano', { key: 'active-volcano', points: '217,74 248,30 280,74', fill: v.color('activeVolcano') }),
          v.h('line', { key: 'plate-motion', x1: 304, y1: 20, x2: 76, y2: 20, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('Plate carries volcanoes left', 190, 14, 'middle'),
          v.line('seamount-leader', 55, 62, 55, 47),
          v.text('Oldest: drowned', 12, 43, 'start'),
          v.line('old-leader', 150, 45, 150, 34),
          v.text('Older: extinct', 150, 32, 'middle'),
          v.line('active-leader', 270, 43, 319, 36),
          v.text('Active now', 350, 34, 'end'),
          v.line('plume-leader', 265, 158, 320, 164),
          v.text('Relatively fixed plume', 350, 172, 'end')
        ];
      }
      function collisionSchematicDiagram(v) {
        return [
          v.mark('rect', 'asthenosphere', { key: 'asthenosphere', x: 0, y: 168, width: 360, height: 22, fill: v.color('asthenosphere') }),
          v.mark('polygon', 'lithMantle', { key: 'lithosphere', points: '0,118 200,160 360,150 360,168 0,168', fill: v.color('lithMantle') }),
          v.mark('polygon', 'crustRoot', { key: 'crust-root', points: '0,92 95,92 360,130 360,150 200,160 0,118', fill: v.color('crustRoot') }),
          v.mark('polygon', 'molasse', { key: 'molasse', points: '0,92 95,92 95,104 0,104', fill: v.color('molasse') }),
          v.mark('polygon', 'foldedStrata', { key: 'folded-strata', points: '95,92 150,50 200,22 250,50 280,58 360,58 360,130', fill: v.color('foldedStrata') }),
          v.mark('polygon', 'schist', { key: 'schist', points: '120,88 360,106 360,120 110,98', fill: v.color('schist') }),
          v.mark('polygon', 'gneiss', { key: 'gneiss', points: '150,60 168,42 190,50 222,54 232,84 176,94 140,82', fill: v.color('gneiss') }),
          v.mark('ellipse', 'leucogranite', { key: 'leucogranite', cx: 206, cy: 70, rx: 14, ry: 8, fill: v.color('leucogranite') }),
          v.mark('polygon', 'summitLimestone', { key: 'summit-limestone', points: '186,34 200,22 214,34 210,42 190,42', fill: v.color('summitLimestone') }),
          v.mark('polygon', 'suture', { key: 'suture', points: '300,58 318,58 324,78 306,82', fill: v.color('suture') }),
          v.mark('path', 'thrustZone', { key: 'thrust', d: 'M 95 92 L 360 130', fill: 'none', stroke: v.color('thrustZone'), strokeWidth: 6, strokeLinecap: 'round' }),
          v.h('line', { key: 'converge-left', x1: 18, y1: 160, x2: 84, y2: 160, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.h('line', { key: 'converge-right', x1: 342, y1: 160, x2: 286, y2: 160, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('Plates converge', 185, 182, 'middle'),
          v.h('line', { key: 'uplift', x1: 340, y1: 54, x2: 340, y2: 26, stroke: v.arrow, strokeWidth: 2, markerEnd: 'url(#' + v.arrowId + ')' }),
          v.text('Uplift', 340, 68, 'middle'),
          v.text('Foreland basin', 6, 84, 'start'),
          v.line('summit-leader', 212, 28, 236, 18),
          v.text('Sea-floor limestone on top', 238, 16, 'start'),
          v.line('thrust-leader', 300, 124, 300, 136),
          v.text('Thrust fault', 300, 148, 'middle'),
          v.text('Deep crustal root', 150, 130, 'middle')
        ];
      }
      function sceneSchematicSVG(info) {
        var W = 360, H = 190;
        var bg = isContrast ? '#000000' : (isDark ? '#0f172a' : '#f8fafc');
        var textColor = isContrast || isDark ? '#f8fafc' : '#0f172a';
        var mutedColor = isContrast || isDark ? '#cbd5e1' : '#475569';
        var edge = isContrast ? '#ffffff' : (isDark ? '#64748b' : '#64748b');
        var selectedStroke = '#22d3ee', activeStroke = '#f59e0b';
        var arrow = isContrast || isDark ? '#f8fafc' : '#334155';
        var arrowId = 'geology-schematic-arrow-' + info.sceneId;
        var titleId = 'geology-schematic-title-' + info.sceneId;
        var descId = 'geology-schematic-desc-' + info.sceneId;
        var palette = SCENES[info.sceneId].palette;
        function color(key, fallback) { return palette[key] ? hex(palette[key].color) : (fallback || mutedColor); }
        function mark(tag, key, props, children) {
          var state = sceneSchematicState(key, info.selectedKey, info.activeKey, focusLensOn);
          var baseWidth = props.strokeWidth == null ? 1.25 : props.strokeWidth;
          var next = Object.assign({}, props, {
            stroke: state.selected ? selectedStroke : (state.active ? activeStroke : (props.stroke || edge)),
            strokeWidth: baseWidth + (state.selected ? 1.75 : (state.active ? 1.25 : 0)),
            strokeDasharray: state.active ? (props.strokeDasharray || '6 3') : props.strokeDasharray,
            opacity: (props.opacity == null ? 1 : props.opacity) * state.opacity,
            vectorEffect: 'non-scaling-stroke',
            'data-geology-schematic-material': key,
            'data-geology-schematic-state': state.state,
            'data-geology-focus-state': state.focusState
          });
          return children == null ? h(tag, next) : h(tag, next, children);
        }
        function textNode(label, x, y, anchor) {
          return h('text', { key: 'label-' + label + '-' + x + '-' + y, x: x, y: y, fill: textColor, fontSize: 13, textAnchor: anchor || 'start', style: { fontWeight: 600 }, paintOrder: 'stroke', stroke: bg, strokeWidth: 2, strokeLinejoin: 'round' }, label);
        }
        function leader(key, x1, y1, x2, y2) {
          return h('line', { key: key, x1: x1, y1: y1, x2: x2, y2: y2, stroke: mutedColor, strokeWidth: 1.25, vectorEffect: 'non-scaling-stroke' });
        }
        var v = { h: h, mark: mark, color: color, text: textNode, line: leader, bg: bg, edge: edge, arrow: arrow, arrowId: arrowId };
        var diagrams = { geode: geodeSchematicDiagram, deepEarth: deepEarthSchematicDiagram, subduction: subductionSchematicDiagram, ridge: ridgeSchematicDiagram, hotspot: hotspotSchematicDiagram, collision: collisionSchematicDiagram };
        var draw = diagrams[info.sceneId] || geodeSchematicDiagram;
        var descText = info.ariaLabel.indexOf(info.title + '. ') === 0 ? info.ariaLabel.slice(info.title.length + 2) : info.ariaLabel;
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H,
          width: '100%', height: H,
          preserveAspectRatio: 'xMidYMid meet',
          role: 'img',
          'aria-labelledby': titleId + ' ' + descId,
          'data-geology-scene-schematic': info.sceneId,
          style: { display: 'block', width: '100%', height: H, background: bg, borderRadius: '0.5rem' }
        },
          h('title', { id: titleId }, info.title),
          h('desc', { id: descId }, descText),
          h('defs', null,
            h('marker', { id: arrowId, viewBox: '0 0 7 6', refX: 6, refY: 3, markerWidth: 7, markerHeight: 6, orient: 'auto-start-reverse' },
              h('path', { d: 'M 0 0 L 7 3 L 0 6 Z', fill: arrow }))),
          draw(v));
      }
      function sceneSchematicPanel() {
        var info = sceneSchematicInfo(SCENE.id, selected ? selected.key : null, sceneJourneyStep);
        var journey = sceneJourneyFor(SCENE.id);
        return h('section', { className: 'rounded-xl border p-3 ' + cardBg, role: 'region', 'aria-label': '2D evidence map', 'data-geology-schematic-panel': SCENE.id }, [
          h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' }, [
            h('div', { key: 'titles' }, [
              h('div', { key: 'eyebrow', className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, 'Accessible scene map'),
              h('h3', { key: 'title', className: 'mt-0.5 text-[12px] font-extrabold ' + ink }, info.title)
            ]),
            h('span', { key: 'stage', className: 'text-[10.5px] font-bold tabular-nums ' + muted }, 'Stage ' + (info.activeIndex + 1) + ' of ' + journey.length)
          ]),
          h('p', { key: 'description', className: 'mt-1 text-[11px] leading-relaxed ' + muted }, info.description),
          h('div', { key: 'map', className: 'mt-2 overflow-hidden rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-300') }, sceneSchematicSVG(info)),
          h('div', { key: 'status', className: 'mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] ' + ink, 'data-geology-schematic-status': 'true' }, [
            h('span', { key: 'active' }, [h('span', { key: 'label', className: 'font-bold' }, 'Active stage: '), info.activeLabel]),
            h('span', { key: 'selected' }, info.selectedLabel ? [h('span', { key: 'label', className: 'font-bold' }, 'Selected: '), info.selectedLabel] : 'Select a material below to connect it to the map.'),
            focusLensOn && info.selectedLabel ? h('span', { key: 'focus', className: 'font-semibold text-cyan-500' }, 'Focus Lens is isolating this material.') : null
          ]),
          h('p', { key: 'hint', className: 'mt-1 text-[10.5px] ' + muted }, 'This map follows the formation timeline and the existing material list.')
        ]);
      }
      function coreRigPublicBandColor(band) {
        var raw = band && band.color;
        if (typeof raw === 'number' && isFinite(raw)) return '#' + ('000000' + Math.max(0, Math.min(0xffffff, Math.round(raw))).toString(16)).slice(-6);
        if (typeof raw === 'string') {
          var match = raw.trim().match(/^#?([0-9a-f]{6})$/i);
          if (match) return '#' + match[1];
        }
        return '#64748b';
      }
      function coreRigCorrelationFigure(comparison, options) {
        comparison = comparison && typeof comparison === 'object' ? comparison : {};
        options = options || {};
        if (!comparison.eligible || !comparison.previousCore || !comparison.nextCore) return null;
        var darkSurface = !!(options.forceDark || isDark);
        var compact = !!options.compact;
        var similarity = Math.max(0, Math.min(100, Math.round(Number(comparison.similarityPct) || 0)));
        var findingLevel = comparison.findingLevel === 'consistent' || comparison.findingLevel === 'mixed' || comparison.findingLevel === 'different'
          ? comparison.findingLevel : 'mixed';
        var sharedKeys = Array.isArray(comparison.sharedFormations) ? comparison.sharedFormations.slice(0, 24).map(function (key) { return String(key).slice(0, 80); }) : [];
        var newKeys = Array.isArray(comparison.newFormations) ? comparison.newFormations.slice(0, 24).map(function (key) { return String(key).slice(0, 80); }) : [];
        var notRepeatedKeys = Array.isArray(comparison.notRepeated) ? comparison.notRepeated.slice(0, 24).map(function (key) { return String(key).slice(0, 80); }) : [];
        var surfaceTone = findingLevel === 'consistent'
          ? (darkSurface ? 'border-emerald-300/40 bg-emerald-400/10' : 'border-emerald-300 bg-emerald-50')
          : (findingLevel === 'mixed'
          ? (darkSurface ? 'border-amber-300/45 bg-amber-400/10' : 'border-amber-300 bg-amber-50')
          : (darkSurface ? 'border-rose-300/45 bg-rose-400/10' : 'border-rose-300 bg-rose-50'));
        var headingTone = findingLevel === 'consistent'
          ? (darkSurface ? 'text-emerald-100' : 'text-emerald-900')
          : (findingLevel === 'mixed' ? (darkSurface ? 'text-amber-100' : 'text-amber-900') : (darkSurface ? 'text-rose-100' : 'text-rose-900'));
        var bodyInk = darkSurface ? 'text-slate-100' : 'text-slate-900';
        var bodyMuted = darkSurface ? 'text-slate-300' : 'text-slate-600';
        var interpretation = String(comparison.interpretation || 'Recovered sequences provide a new comparison for the field journal.').slice(0, 180);
        var controlLabel = String(comparison.controlLabel || 'Compare one changed variable while holding the other constant.').slice(0, 120);
        function bandState(laneId, key) {
          key = String(key || '');
          if (sharedKeys.indexOf(key) >= 0) return 'shared';
          if (laneId === 'candidate' && newKeys.indexOf(key) >= 0) return 'new';
          if (laneId === 'reference' && notRepeatedKeys.indexOf(key) >= 0) return 'not-repeated';
          return laneId === 'candidate' ? 'new' : 'not-repeated';
        }
        function bandStateLabel(state) {
          return state === 'shared' ? 'Shared' : (state === 'new' ? 'New' : 'Not repeated');
        }
        function recoveredIntervalCount(core) {
          var bands = core && Array.isArray(core.bands) ? core.bands.slice(0, 24) : [];
          return bands.reduce(function (total, band) {
            return total + Math.max(1, Math.min(24, Math.round(Number(band && band.count) || 1)));
          }, 0);
        }
        var referenceIntervalCount = recoveredIntervalCount(comparison.previousCore);
        var candidateIntervalCount = recoveredIntervalCount(comparison.nextCore);
        var sharedIntervalScale = Math.max(1, referenceIntervalCount, candidateIntervalCount);
        function coreStrip(laneId, label, core) {
          var bands = core && Array.isArray(core.bands) ? core.bands.slice(0, 24) : [];
          var totalIntervals = laneId === 'reference' ? referenceIntervalCount : candidateIntervalCount;
          var remainderIntervals = Math.max(0, sharedIntervalScale - totalIntervals);
          return h('div', {
            key: laneId, 'data-geology-core-strip': laneId,
            className: 'rounded-lg border p-1.5 ' + (darkSurface ? 'border-white/10 bg-slate-950/55' : 'border-slate-200 bg-white/80')
          }, [
            h('div', { key: 'head', className: 'mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide ' + bodyMuted }, [
              h('span', { key: 'label' }, label),
              h('span', { key: 'count', className: 'tabular-nums' }, totalIntervals + ' / ' + sharedIntervalScale + ' intervals')
            ]),
            bands.length ? h('div', { key: 'scroll', className: 'overflow-x-auto pb-1' },
              h('ol', {
                className: 'flex gap-1', 'aria-label': label + ' recovered formations',
                style: { minWidth: compact ? '13rem' : '15rem' }
              }, bands.map(function (band, bandIndex) {
                var key = String(band && band.key || '');
                var state = bandState(laneId, key);
                var count = Math.max(1, Math.min(24, Math.round(Number(band && band.count) || 1)));
                var start = Math.max(1, Math.round(Number(band && band.startDepth) || (bandIndex + 1)));
                var end = Math.max(start, Math.round(Number(band && band.endDepth) || (start + count - 1)));
                var range = start === end ? String(start) : (start + '–' + end);
                var name = String(band && band.name || 'Recovered formation').slice(0, 80);
                var integrity = band && band.avgIntegrity != null && isFinite(Number(band.avgIntegrity))
                  ? Math.max(0, Math.min(100, Math.round(Number(band.avgIntegrity) * 100))) : null;
                var stateLabel = bandStateLabel(state);
                var stateTone = state === 'shared'
                  ? (darkSurface ? 'text-cyan-100' : 'text-cyan-800')
                  : (state === 'new' ? (darkSurface ? 'text-amber-100' : 'text-amber-800') : (darkSurface ? 'text-rose-100' : 'text-rose-800'));
                var bandRing = state === 'shared'
                  ? 'ring-1 ring-cyan-200/70'
                  : (state === 'new' ? 'ring-2 ring-amber-200/80' : 'ring-1 ring-rose-200/70 opacity-70 grayscale');
                var aria = label + ' intervals ' + range + ': ' + name + ', ' + stateLabel.toLowerCase() +
                  (integrity == null ? '' : (', average integrity ' + integrity + ' percent'));
                return h('li', {
                  key: laneId + '-' + key + '-' + bandIndex,
                  'data-geology-core-band': key || String(bandIndex + 1), 'data-state': state,
                  'data-start-interval': start, 'data-end-interval': end,
                  className: 'min-w-0 list-none', style: { flexGrow: count, flexBasis: 0, minWidth: 0 },
                  title: aria, 'aria-label': aria
                }, [
                  h('span', {
                    key: 'bar', className: 'block h-5 rounded-md border border-white/35 shadow-inner ' + bandRing,
                    style: { background: coreRigPublicBandColor(band) }, 'aria-hidden': 'true'
                  }),
                  h('span', { key: 'name', className: 'mt-1 block truncate text-[10px] font-extrabold ' + bodyInk }, name),
                  h('span', { key: 'meta', className: 'block text-[10px] font-bold tabular-nums ' + stateTone }, range + ' · ' + stateLabel)
                ]);
              })).concat(remainderIntervals ? [h('li', {
                key: laneId + '-remainder', 'data-geology-core-remainder': remainderIntervals,
                className: 'min-w-0 list-none', style: { flexGrow: remainderIntervals, flexBasis: 0, minWidth: 0 },
                'aria-label': label + ' has ' + remainderIntervals + ' fewer recovered intervals on the shared scale'
              }, [
                h('span', {
                  key: 'bar', className: 'block h-5 rounded-md border border-dashed ' + (darkSurface ? 'border-slate-500 bg-slate-800/70' : 'border-slate-300 bg-slate-100'),
                  style: { backgroundImage: 'repeating-linear-gradient(135deg, transparent 0, transparent 5px, rgba(148,163,184,.22) 5px, rgba(148,163,184,.22) 7px)' },
                  'aria-hidden': 'true'
                }),
                h('span', { key: 'meta', className: 'mt-1 block truncate text-[10px] font-bold ' + bodyMuted }, remainderIntervals + ' interval gap')
              ])] : [])) : h('p', { key: 'empty', className: 'text-[10px] font-semibold ' + bodyMuted }, 'No recovered intervals')
          ]);
        }
        var change = comparison.changedVariable === 'angle' ? 'Angle changed · depth held' : 'Depth changed · angle held';
        return h('figure', {
          key: options.key, 'data-geology-core-correlation': findingLevel,
          className: 'rounded-xl border p-2 shadow-inner ' + surfaceTone,
          'aria-label': 'Paired recovered core correlation'
        }, [
          h('div', { key: 'heading', className: 'flex items-start justify-between gap-2' }, [
            h('div', { key: 'copy' }, [
              h('h4', { key: 'title', className: 'text-[11px] font-black uppercase tracking-[.14em] ' + headingTone }, 'Core correlation'),
              h('p', { key: 'change', className: 'mt-0.5 text-[10px] font-bold ' + bodyMuted }, change)
            ]),
            h('span', { key: 'score', className: 'shrink-0 rounded-full border border-cyan-200/40 bg-cyan-400/10 px-2 py-1 text-[11px] font-black tabular-nums ' + (darkSurface ? 'text-cyan-100' : 'text-cyan-900') }, similarity + '% match')
          ]),
          h('div', {
            key: 'meter', role: 'meter', 'aria-label': 'Recovered sequence similarity',
            'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': similarity,
            'aria-valuetext': similarity + ' percent recovered sequence match',
            className: 'mt-2 h-1.5 overflow-hidden rounded-full ' + (darkSurface ? 'bg-slate-800' : 'bg-slate-200')
          }, h('span', {
            className: 'block h-full rounded-full bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300',
            style: { width: similarity + '%' }
          })),
          h('div', { key: 'strips', className: 'mt-2 grid gap-1.5' }, [
            coreStrip('reference', 'Reference bore', comparison.previousCore),
            coreStrip('candidate', 'Candidate bore', comparison.nextCore)
          ]),
          h('ul', { key: 'legend', className: 'mt-1.5 flex flex-wrap gap-1', 'aria-label': 'Core correlation states' }, [
            h('li', { key: 'shared', className: 'list-none rounded-full border border-cyan-300/40 px-1.5 py-0.5 text-[10px] font-bold ' + (darkSurface ? 'text-cyan-100' : 'text-cyan-800') }, 'Shared'),
            h('li', { key: 'new', className: 'list-none rounded-full border border-amber-300/45 px-1.5 py-0.5 text-[10px] font-bold ' + (darkSurface ? 'text-amber-100' : 'text-amber-800') }, 'New'),
            h('li', { key: 'not-repeated', className: 'list-none rounded-full border border-rose-300/40 px-1.5 py-0.5 text-[10px] font-bold ' + (darkSurface ? 'text-rose-100' : 'text-rose-800') }, 'Not repeated')
          ]),
          h('p', { key: 'note', 'data-geology-core-correlation-note': 'true', className: 'mt-1.5 text-[10px] font-semibold leading-snug ' + bodyMuted }, 'Sequence matches compare recovered intervals; they do not prove continuous rock between boreholes.'),
          h('figcaption', { key: 'caption', className: 'mt-1.5 ' + bodyInk }, [
            h('p', { key: 'finding', className: 'text-[11px] font-semibold leading-snug' }, interpretation),
            h('p', { key: 'control', className: 'mt-0.5 text-[10px] font-bold ' + bodyMuted }, controlLabel)
          ])
        ]);
      }
      function coreRigExperimentRail(experiment, options) {
        experiment = experiment && typeof experiment === 'object' ? experiment : {};
        options = options || {};
        var darkSurface = !!(options.forceDark || isDark);
        var changedVariable = experiment.changedVariable === 'angle' ? 'angle' : 'depth';
        var nextAngle = Math.max(0, Math.round(Number(experiment.angleDegrees) || 0));
        var nextDepth = Math.max(0, Math.round(Number(experiment.depth) || 0));
        var currentAngle = isFinite(Number(options.currentAngleDegrees)) ? Math.max(0, Math.round(Number(options.currentAngleDegrees))) : nextAngle;
        var currentDepth = isFinite(Number(options.currentDepth)) ? Math.max(0, Math.round(Number(options.currentDepth))) : nextDepth;
        var variables = [
          { id: 'angle', label: 'Angle', value: nextAngle + '°' },
          { id: 'depth', label: 'Depth', value: nextDepth + ' intervals' }
        ];
        var currentConfiguration = currentAngle + '° / ' + currentDepth;
        var nextConfiguration = nextAngle + '° / ' + nextDepth;
        return h('div', {
          key: options.key, 'data-geology-core-experiment-map': experiment.programKey || 'next',
          'data-geology-core-control-variable': changedVariable,
          className: 'mt-1.5', role: 'group',
          'aria-label': 'Controlled experiment map. Current setup ' + currentConfiguration + '. ' + changedVariable + ' changes. Next setup ' + nextConfiguration + '. Outcome unknown until the bore is run.'
        }, [
          h('div', { key: 'configurations', className: 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1' }, [
            h('div', { key: 'current', 'data-geology-core-configuration': 'current', className: 'min-w-0 rounded-md border px-2 py-1.5 ' + (darkSurface ? 'border-slate-500/50 bg-slate-950/55 text-slate-100' : 'border-slate-300 bg-white/80 text-slate-800') }, [
              h('span', { key: 'label', className: 'block text-[10px] font-black uppercase tracking-wide ' + (darkSurface ? 'text-cyan-200' : 'text-cyan-800') }, 'Current'),
              h('span', { key: 'value', className: 'mt-0.5 block truncate text-[11px] font-extrabold tabular-nums', title: currentConfiguration }, currentConfiguration)
            ]),
            h('span', { key: 'arrow', className: 'grid place-items-center px-0.5 text-base text-violet-300', 'aria-hidden': 'true' }, '→'),
            h('div', { key: 'next', 'data-geology-core-configuration': 'next', className: 'min-w-0 rounded-md border px-2 py-1.5 ' + (darkSurface ? 'border-violet-200/60 bg-violet-400/20 text-violet-50 shadow-[0_0_12px_rgba(167,139,250,.16)]' : 'border-violet-400 bg-violet-100 text-violet-950') }, [
              h('span', { key: 'label', className: 'block text-[10px] font-black uppercase tracking-wide ' + (darkSurface ? 'text-violet-200' : 'text-violet-800') }, 'Next'),
              h('span', { key: 'value', className: 'mt-0.5 block truncate text-[11px] font-extrabold tabular-nums', title: nextConfiguration }, nextConfiguration)
            ])
          ]),
          h('div', { key: 'variables', className: 'mt-1 grid grid-cols-2 gap-1' }, variables.map(function (variable) {
            var changed = variable.id === changedVariable;
            return h('div', {
              key: variable.id, 'data-geology-core-variable': variable.id, 'data-state': changed ? 'changed' : 'held',
              className: 'rounded-md border px-2 py-1.5 ' + (changed
                ? (darkSurface ? 'border-violet-200/70 bg-violet-400/20 text-violet-50' : 'border-violet-400 bg-violet-100 text-violet-950')
                : (darkSurface ? 'border-cyan-300/30 bg-slate-950/45 text-slate-200' : 'border-cyan-300 bg-white/70 text-slate-700')),
              'aria-label': variable.label + ' ' + (changed ? 'changed to ' : 'held at ') + variable.value
            }, [
              h('span', { key: 'state', className: 'block text-[10px] font-black uppercase tracking-wide ' + (changed ? (darkSurface ? 'text-violet-200' : 'text-violet-800') : (darkSurface ? 'text-cyan-200' : 'text-cyan-800')) }, (changed ? 'Δ Changed · ' : '= Held · ') + variable.label),
              h('span', { key: 'value', className: 'mt-0.5 block text-[11px] font-extrabold tabular-nums' }, variable.value)
            ]);
          })),
          h('div', {
            key: 'unknown', 'data-geology-core-outcome': 'unknown',
            className: 'mt-1 flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 ' + (darkSurface ? 'border-slate-500/70 bg-slate-950/35 text-slate-300' : 'border-slate-400 bg-white/60 text-slate-600')
          }, [
            h('span', { key: 'slots', className: 'flex shrink-0 gap-0.5', 'aria-hidden': 'true' }, [0, 1, 2].map(function (slot) {
              return h('span', { key: slot, className: 'grid h-5 w-4 place-items-center rounded-sm border border-slate-500/60 bg-slate-700/50 text-[10px] font-black' }, '?');
            })),
            h('span', { key: 'copy', className: 'min-w-0 text-[10px] font-bold leading-snug' }, 'Outcome unknown · run this bore to reveal the comparison')
          ])
        ]);
      }
      function fieldJournalPanel() {
        var discoveredByScene = fieldBook.discoveredByScene || {};
        var entries = fieldJournalEntries(SCENE.id, discoveredByScene);
        var progress = fieldDiscoveryProgress(SCENE.id, discoveredByScene);
        var totalProgress = fieldJournalSummary(discoveredByScene);
        var runEntry = (fieldBook.byScene && fieldBook.byScene[SCENE.id]) || {};
        var sceneCoreLogs = (fieldBook.coreLogsByScene && Array.isArray(fieldBook.coreLogsByScene[SCENE.id])) ? fieldBook.coreLogsByScene[SCENE.id] : [];
        var latestCoreLog = (coreRigReview && coreRigReview.sceneId === SCENE.id && coreRigReview.report) ? coreRigReview.report : (sceneCoreLogs.length ? sceneCoreLogs[sceneCoreLogs.length - 1] : null);
        var latestCoreSummary = coreRigReportSummary(latestCoreLog || {});
        var latestCoreEvaluation = latestCoreLog ? (latestCoreLog.evaluation || coreRigEvaluation(latestCoreLog)) : null;
        var latestCoreLogIndex = latestCoreLog ? sceneCoreLogs.map(coreRigReportStableId).indexOf(coreRigReportStableId(latestCoreLog)) : -1;
        var persistedCoreComparison = latestCoreLog && latestCoreLog.comparison && latestCoreLog.comparison.eligible
          ? latestCoreLog.comparison : null;
        var previousCoreLog = latestCoreLogIndex > 0 ? sceneCoreLogs[latestCoreLogIndex - 1] : null;
        var derivedCoreComparison = previousCoreLog && latestCoreLog
          ? coreRigCompareReports(previousCoreLog, latestCoreLog) : null;
        var latestCoreComparison = derivedCoreComparison && derivedCoreComparison.eligible
          ? derivedCoreComparison : (!previousCoreLog ? persistedCoreComparison : null);
        var latestCoreNextExperiment = latestCoreLog ? (coreRigNextExperiment(latestCoreLog, fieldBook.coreCertification) || latestCoreLog.nextExperiment || null) : null;
        var latestCoreCassette = latestCoreLog ? coreRigCoreCassette(latestCoreLog.samples, latestCoreLog.targetDepth, false, false) : null;
        var sceneCoreResearch = (fieldBook.coreResearchByScene && fieldBook.coreResearchByScene[SCENE.id]) || {};
        var corePrograms = normalizeCoreRigPrograms(fieldBook.coreCertification);
        var coreCertificationProgress = coreRigCertificationSummary(fieldBook.coreCertification);
        var selectedCoreProgramKey = corePrograms[coreRigProgramSelection] ? coreRigProgramSelection : coreRigProgramKey(coreRigAngle, coreRigDepth);
        var selectedCoreProgram = corePrograms[selectedCoreProgramKey] || corePrograms[coreRigProgramCatalog()[0].key];
        var selectedProgramXpTarget = coreRigCertificationXpTarget(selectedCoreProgram.bestRating);
        var coreProgramLoadLocked = !!(coreRigHud && (coreRigHud.running || coreRigHud.stage === 'deploying'));
        var coreProgramLoadHelpId = 'geology-core-program-load-help-' + SCENE.id;
        var coreMasteryScore = Math.max(0, Math.min(200, Math.floor(Number(sceneCoreResearch.bestScore) || (latestCoreEvaluation && latestCoreEvaluation.score) || 0)));
        var coreMasteryGrade = coreRigGradeForScore(coreMasteryScore);
        var latestCoreGrade = latestCoreEvaluation ? latestCoreEvaluation.grade : null;
        var coreGradeClass = latestCoreGrade === 'S'
          ? ('border-violet-300 bg-violet-400/20 ' + (isDark ? 'text-violet-100' : 'text-violet-800'))
          : (latestCoreGrade === 'A' ? ('border-cyan-300 bg-cyan-400/20 ' + (isDark ? 'text-cyan-100' : 'text-cyan-800'))
          : (latestCoreGrade === 'B' ? ('border-emerald-300 bg-emerald-400/20 ' + (isDark ? 'text-emerald-100' : 'text-emerald-800'))
          : (latestCoreGrade === 'C' ? ('border-amber-300 bg-amber-400/20 ' + (isDark ? 'text-amber-100' : 'text-amber-800'))
          : ('border-rose-300 bg-rose-400/20 ' + (isDark ? 'text-rose-100' : 'text-rose-800')))));
        var activeAssignment = runEntry.active ? fieldExpeditionFor(SCENE.id, runEntry.contractIndex) : null;
        var assignmentChoices = FIELD_EXPEDITIONS[SCENE.id] || [];
        var panelId = 'geology-field-journal-' + SCENE.id;
        function toggleJournal() {
          var next = !fieldJournalOpen; setFieldJournalOpen(next); upd('fieldJournalOpen', next);
          announce(next ? 'Specimen journal expanded.' : 'Specimen journal collapsed.');
        }
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Specimen field journal', 'data-geology-specimen-journal': SCENE.id }, [
          h('div', { key: 'head', className: 'flex items-center gap-2 p-2.5' }, [
            h('button', { key: 'toggle', type: 'button', onClick: toggleJournal, 'aria-expanded': fieldJournalOpen ? 'true' : 'false', 'aria-controls': panelId, className: 'flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-1.5 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400' }, [
              h('span', { key: 'title', className: 'min-w-0' }, [
                h('span', { key: 'eyebrow', className: 'block text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-cyan-300' : 'text-cyan-700') }, '📓 Specimen journal'),
                h('span', { key: 'world', className: 'mt-0.5 block truncate text-[11px] font-extrabold ' + ink }, SCENE.label)
              ]),
              h('span', { key: 'count', className: 'shrink-0 text-right text-[10px] font-bold ' + (progress.complete ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : muted) }, progress.found + '/' + progress.total + (fieldJournalOpen ? ' ▲' : ' ▼'))
            ])
          ]),
          h('div', { key: 'progress', className: 'mx-3 mb-2 h-1.5 overflow-hidden rounded-full ' + (isDark ? 'bg-slate-700' : 'bg-slate-200'), role: 'progressbar', 'aria-label': 'Specimen journal completion for ' + SCENE.label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progress.percent },
            h('span', { className: 'block h-full rounded-full ' + (progress.complete ? 'bg-emerald-500' : 'bg-cyan-500'), style: { width: progress.percent + '%' } })),
          fieldJournalOpen ? h('div', { key: 'body', id: panelId, className: 'border-t p-3 ' + (isDark ? 'border-slate-700' : 'border-slate-200') }, [
            h('div', { key: 'summary', className: 'flex flex-wrap items-start justify-between gap-2' }, [
              h('p', { key: 'copy', className: 'max-w-sm text-[10.5px] leading-relaxed ' + muted }, 'Mine a material in first person to log it. Logged cards reveal their category and can refocus the 3D model.'),
              h('span', { key: 'all', className: 'rounded-full border px-2 py-1 text-[10px] font-bold ' + (isDark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'), 'data-geology-journal-total': totalProgress.found + '/' + totalProgress.total }, totalProgress.found + '/' + totalProgress.total + ' across worlds')
            ]),
            h('section', { key: 'assignments', className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-violet-500/40 bg-violet-950/20' : 'border-violet-200 bg-violet-50'), role: 'region', 'aria-label': 'Field assignments', 'data-geology-assignment-board': SCENE.id }, [
              h('div', { key: 'assignment-head', className: 'flex items-center justify-between gap-2' }, [
                h('span', { key: 'label', className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-violet-300' : 'text-violet-700') }, '🧭 Field assignments'),
                activeAssignment ? h('span', { key: 'status', className: 'text-[10px] font-bold ' + (runEntry.ready ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : muted) }, runEntry.ready ? 'Ready to bank' : (runEntry.collected || []).length + '/3 secured') : null
              ]),
              activeAssignment
                ? h('div', { key: 'active', className: 'mt-1.5', 'data-geology-assignment': activeAssignment.id, 'data-state': runEntry.ready ? 'ready' : 'active' }, [
                    h('div', { key: 'title', className: 'flex items-start justify-between gap-2' }, [
                      h('span', { key: 'name', className: 'text-[11px] font-extrabold ' + ink }, activeAssignment.label),
                      h('span', { key: 'reward', className: 'shrink-0 text-[10px] font-bold text-emerald-500' }, '+' + fieldRunReward(activeAssignment) + ' XP')
                    ]),
                    h('p', { key: 'brief', className: 'mt-0.5 text-[10px] leading-snug ' + muted }, activeAssignment.brief),
                    runEntry.ready
                      ? h('button', { key: 'bank', type: 'button', onClick: function () { setFpOn(true); setTimeout(function () { try { if (containerRef.current) containerRef.current.focus(); } catch (e) {} }, 0); }, className: 'mt-2 min-h-10 w-full rounded-md border border-emerald-400/60 bg-emerald-500/10 px-2 text-[10px] font-extrabold ' + (isDark ? 'text-emerald-200' : 'text-emerald-800'), 'data-geology-assignment-bank': 'true' }, 'Enter 3D and return home to bank')
                      : h('button', { key: 'retire', type: 'button', onClick: function () { retireFieldRun(SCENE.id); }, className: 'mt-2 min-h-10 w-full rounded-md border border-slate-400/50 px-2 text-[10px] font-bold ' + btnIdle, 'data-geology-retire-assignment': 'true', 'aria-label': 'Retire ' + activeAssignment.label + '. Ordered contract progress will reset; journal discoveries and XP will be kept.' }, 'Retire assignment')
                  ])
                : h('div', { key: 'choices', className: 'mt-1.5 grid gap-1.5 sm:grid-cols-2', role: 'group', 'aria-label': 'Choose a field assignment' }, assignmentChoices.map(function (assignment, assignmentIndex) {
                    return h('button', { key: assignment.id, type: 'button', onClick: function () { startFieldRun(SCENE.id, assignmentIndex); }, className: 'min-h-12 rounded-lg border p-2 text-left transition hover:border-violet-400 ' + btnIdle, 'data-geology-assignment': assignment.id, 'data-state': 'available', 'aria-label': 'Start ' + assignment.label + ' for ' + fieldRunReward(assignment) + ' field XP' }, [
                      h('span', { key: 'row', className: 'flex items-start justify-between gap-2 text-[10.5px] font-extrabold' }, [h('span', { key: 'name' }, assignment.label), h('span', { key: 'xp', className: 'shrink-0 text-emerald-500' }, '+' + fieldRunReward(assignment))]),
                      h('span', { key: 'brief', className: 'mt-1 block text-[10px] font-normal leading-snug ' + muted }, assignment.brief)
                    ]);
                  }))
            ]),
            coreRigSupported(SCENE.id) ? h('section', { key: 'core-log', 'data-geology-core-log': SCENE.id, className: 'mt-2 overflow-hidden rounded-lg border ' + (isDark ? 'border-cyan-400/40 bg-gradient-to-br from-slate-950/70 via-cyan-950/35 to-amber-950/25' : 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-amber-50'), role: 'region', 'aria-label': 'Directional core research' }, [
              h('div', { key: 'accent', className: 'h-1 bg-gradient-to-r from-amber-400 via-cyan-400 to-violet-500', 'aria-hidden': 'true' }),
              h('div', { key: 'body', className: 'p-2.5' }, [
                h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' }, [
                  h('div', { key: 'title' }, [
                    h('h4', { key: 'label', className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-cyan-300' : 'text-cyan-800') }, '◉ Directional core research'),
                    h('p', { key: 'sub', className: 'mt-0.5 text-[10px] ' + muted }, latestCoreLog ? ((latestCoreLog.angleDegrees || coreRigAngleDegrees(latestCoreLog.angle)) + '° bore · ' + latestCoreLog.targetDepth + '-interval target · log ' + sceneCoreLogs.length) : 'No bore logged in this scene yet.')
                  ]),
                  latestCoreEvaluation ? h('div', { key: 'grade', className: 'flex items-center gap-1.5' }, [
                    latestCoreLog && latestCoreLog.newBest ? h('span', { key: 'best', className: 'rounded-full border border-amber-300/60 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ' + (isDark ? 'text-amber-200' : 'text-amber-800') }, 'New best') : null,
                    latestCoreLog && latestCoreLog.boreBrief ? h('span', { key: 'brief',
                      'data-geology-core-brief-badge': latestCoreLog.boreBrief.metCount,
                      className: 'rounded-full border border-violet-300/55 bg-violet-400/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ' + (isDark ? 'text-violet-200' : 'text-violet-800') },
                      'Brief ' + latestCoreLog.boreBrief.metCount + '/3') : null,
                    h('span', { key: 'badge', 'data-geology-core-grade': latestCoreEvaluation.grade, className: 'rounded-md border px-2 py-1 text-[11px] font-black ' + coreGradeClass }, 'Grade ' + latestCoreEvaluation.grade),
                    h('span', { key: 'score', 'data-geology-core-score': latestCoreEvaluation.score, className: 'text-[10px] font-black tabular-nums ' + ink }, latestCoreEvaluation.score + '/200')
                  ]) : null
                ]),
                h('section', { key: 'mastery', 'data-geology-core-mastery': coreMasteryScore, className: 'mt-2 rounded-lg border px-2 py-1.5 ' + (isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white/65'), 'aria-label': 'Core research mastery' }, [
                  h('div', { key: 'labels', className: 'flex items-center justify-between gap-2 text-[10px] font-bold' }, [
                    h('span', { key: 'label', className: ink }, 'Research mastery'),
                    h('span', { key: 'best', className: isDark ? 'text-cyan-200' : 'text-cyan-800' }, coreMasteryScore ? ('Best grade ' + coreMasteryGrade + ' · ' + coreMasteryScore + '/200') : 'Awaiting first core')
                  ]),
                  h('div', { key: 'track', className: 'mt-1 h-1.5 overflow-hidden rounded-full ' + (isDark ? 'bg-slate-800' : 'bg-slate-200'), role: 'progressbar', 'aria-label': 'Best directional core score', 'aria-valuemin': 0, 'aria-valuemax': 200, 'aria-valuenow': coreMasteryScore }, h('span', { className: 'block h-full rounded-full bg-gradient-to-r from-amber-400 via-cyan-400 to-violet-500 transition-[width] duration-300 motion-reduce:transition-none', style: { width: (coreMasteryScore / 2) + '%' } })),
                  h('div', { key: 'meta', className: 'mt-1 flex flex-wrap justify-between gap-1 text-[10px] font-semibold ' + muted }, [
                    h('span', { key: 'bores' }, Math.max(Number(sceneCoreResearch.totalBores) || 0, sceneCoreLogs.length) + ' scored bore' + (Math.max(Number(sceneCoreResearch.totalBores) || 0, sceneCoreLogs.length) === 1 ? '' : 's')),
                    h('span', { key: 'reward', 'data-geology-core-research-reward': latestCoreLog ? (latestCoreLog.researchReward || 0) : 0 }, latestCoreLog && latestCoreLog.researchReward ? ('Selected +' + latestCoreLog.researchReward + ' research XP') : 'Improve the best score to earn XP')
                  ])
                ]),
                h('section', { key: 'certification', 'data-geology-core-certification': 'true', className: 'mt-2 overflow-hidden rounded-lg border ' + (isDark ? 'border-violet-400/45 bg-violet-950/20' : 'border-violet-200 bg-white/75'), role: 'region', 'aria-label': 'Core Rig Operator Certification' }, [
                  h('div', { key: 'cert-head', className: 'flex flex-wrap items-start justify-between gap-2 p-2' }, [
                    h('div', { key: 'copy' }, [
                      h('h5', { key: 'title', className: 'text-[10px] font-black uppercase tracking-[.13em] ' + (isDark ? 'text-violet-200' : 'text-violet-800') }, '⬡ Core Rig Operator Certification'),
                      h('p', { key: 'rule', className: 'mt-0.5 max-w-sm text-[11px] leading-snug ' + muted }, 'Certify every angle and depth. Earn Grade C, protect at least 85% integrity, and recover the target or reach 75% before a protected boundary.'),
                      h('p', { key: 'tiers', className: 'mt-1 text-[10.5px] font-bold ' + (isDark ? 'text-violet-200' : 'text-violet-800') }, 'Certified C / 85% · Advanced 135 rating / 92% · Mastered 175 rating / 97%')
                    ]),
                    h('div', { key: 'rank', className: 'text-right' }, [
                      h('div', { key: 'count', className: 'text-[12px] font-black tabular-nums ' + (coreCertificationProgress.complete ? (isDark ? 'text-emerald-200' : 'text-emerald-800') : ink) }, coreCertificationProgress.certified + '/9'),
                      h('div', { key: 'title', className: 'text-[10px] font-bold ' + muted }, coreCertificationProgress.title)
                    ])
                  ]),
                  h('div', { key: 'cert-progress', className: 'mx-2 h-1.5 overflow-hidden rounded-full ' + (isDark ? 'bg-slate-800' : 'bg-slate-200'), role: 'progressbar', 'aria-label': 'Core rig certification programs completed', 'aria-valuemin': 0, 'aria-valuemax': 9, 'aria-valuenow': coreCertificationProgress.certified, 'aria-valuetext': coreCertificationProgress.certified + ' of 9 certification programs complete' }, h('span', { className: 'block h-full rounded-full bg-gradient-to-r from-amber-400 via-cyan-400 to-violet-500 transition-[width] motion-reduce:transition-none', style: { width: coreCertificationProgress.percent + '%' } })),
                  h('div', { key: 'matrix-wrap', className: 'mt-2 overflow-x-auto px-2' },
                    h('table', { className: 'w-full table-fixed border-separate border-spacing-1 text-center', 'data-geology-core-program-matrix': 'true' }, [
                      h('caption', { key: 'caption', className: 'sr-only' }, 'Certification programs by drill angle and target depth'),
                      h('thead', { key: 'head' }, h('tr', null, [
                        h('th', { key: 'corner', scope: 'col', className: 'w-[4.5rem] px-1 text-left text-[10px] font-black uppercase tracking-wide ' + muted }, 'Angle')
                      ].concat(CORE_RIG_DEPTHS.map(function (depth) {
                        return h('th', { key: depth, scope: 'col', 'aria-label': depth + ' intervals', className: 'px-1 pb-0.5 text-[10px] font-black ' + ink }, depth + ' int.');
                      })))),
                      h('tbody', { key: 'body' }, ['vertical', 'slant', 'shallow'].map(function (angle) {
                        return h('tr', { key: angle }, [
                          h('th', { key: 'label', scope: 'row', className: 'px-1 text-left text-[10px] font-extrabold leading-tight ' + ink }, [
                            h('span', { key: 'name', className: 'block capitalize' }, angle),
                            h('span', { key: 'degrees', className: 'block font-semibold ' + muted }, coreRigAngleDegrees(angle) + '°')
                          ])
                        ].concat(CORE_RIG_DEPTHS.map(function (depth) {
                          var programKey = coreRigProgramKey(angle, depth), cell = corePrograms[programKey];
                          var selectedProgram = selectedCoreProgramKey === programKey;
                          var visibleStatus = cell.tier >= 3 ? ('★ ' + cell.bestGrade) : (cell.tier >= 2 ? ('◆ ' + cell.bestGrade) : (cell.tier >= 1 ? ('✓ ' + cell.bestGrade) : (cell.attempts ? 'Retry' : 'Open')));
                          var programGuidance = coreRigCertificationGuidance(cell);
                          var spokenStatus = cell.tier
                            ? (cell.tierLabel + '. Highest qualifying score grade ' + cell.bestGrade + '. Best program rating ' + cell.bestRating + '. Highest integrity ' + cell.bestIntegrity + ' percent. ' + programGuidance)
                            : (cell.attempts ? ('Unrated after ' + cell.attempts + ' attempts. ' + programGuidance) : 'Open, no attempts. ' + programGuidance);
                          return h('td', { key: programKey, className: 'p-0.5' },
                            h('button', {
                              type: 'button', 'data-geology-core-program': programKey, 'data-tier': cell.tier,
                              'aria-pressed': selectedProgram ? 'true' : 'false',
                              'aria-label': cell.angleDegrees + ' degree, ' + cell.depth + ' interval certification program. ' + spokenStatus + '.',
                              title: spokenStatus,
                              onClick: function () {
                                setCoreRigProgramSelection(programKey);
                                announce(cell.angleDegrees + ' degree, ' + cell.depth + ' interval program selected. ' + spokenStatus + '.');
                              },
                              className: 'min-h-11 min-w-11 w-full rounded-md border px-1 text-[10px] font-black transition focus:outline-none focus:ring-2 focus:ring-cyan-400 ' + (selectedProgram
                                ? (isDark ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,.2)]' : 'border-cyan-500 bg-cyan-100 text-cyan-950 shadow-sm')
                                : (cell.tier >= 3 ? (isDark ? 'border-violet-300/70 bg-violet-400/20 text-violet-100' : 'border-violet-300 bg-violet-100 text-violet-900')
                                : (cell.tier >= 1 ? (isDark ? 'border-emerald-300/60 bg-emerald-400/15 text-emerald-100' : 'border-emerald-300 bg-emerald-50 text-emerald-900')
                                : (isDark ? 'border-slate-600 bg-slate-900/65 text-slate-200 hover:border-cyan-400' : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-500'))))
                            }, visibleStatus));
                        })));
                      }))
                    ])),
                  h('div', { key: 'selected', className: 'm-2 mt-1.5 rounded-lg border p-2 ' + (isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50') }, [
                    h('div', { key: 'row', className: 'flex flex-wrap items-start justify-between gap-2' }, [
                      h('div', { key: 'name' }, [
                        h('div', { key: 'eyebrow', className: 'text-[10px] font-black uppercase tracking-wide ' + muted }, 'Selected program'),
                        h('div', { key: 'value', className: 'text-[11px] font-extrabold ' + ink }, selectedCoreProgram.angleDegrees + '° ' + selectedCoreProgram.angle + ' · ' + selectedCoreProgram.depth + ' intervals')
                      ]),
                      h('span', { key: 'state', className: 'rounded-full border px-2 py-0.5 text-[10px] font-black ' + (selectedCoreProgram.tier ? (isDark ? 'border-emerald-300/50 text-emerald-200' : 'border-emerald-300 text-emerald-800') : (isDark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600')) }, selectedCoreProgram.tier ? selectedCoreProgram.tierLabel : (selectedCoreProgram.attempts ? 'Retry' : 'Open'))
                    ]),
                    h('p', { key: 'meta', className: 'mt-1 text-[11px] font-semibold ' + muted }, selectedCoreProgram.tier
                      ? ('Highest qualifying score ' + selectedCoreProgram.bestGrade + ' · ' + selectedCoreProgram.bestScore + '/200 · Best rating ' + selectedCoreProgram.bestRating + '/200 · Highest integrity ' + selectedCoreProgram.bestIntegrity + '% · ' + selectedCoreProgram.attempts + ' attempt' + (selectedCoreProgram.attempts === 1 ? '' : 's'))
                      : (selectedCoreProgram.attempts
                        ? ('Last result ' + selectedCoreProgram.lastGrade + ' · ' + selectedCoreProgram.lastScore + '/200 · rating ' + selectedCoreProgram.lastRating + '/200 · ' + selectedCoreProgram.lastIntegrity + '% integrity')
                        : 'No bore logged for this exact trajectory yet.')),
                    h('p', { key: 'guidance', className: 'mt-0.5 text-[11px] font-bold ' + (isDark ? 'text-cyan-200' : 'text-cyan-800') }, coreRigCertificationGuidance(selectedCoreProgram)),
                    h('p', { key: 'xp', className: 'mt-0.5 text-[10.5px] font-bold ' + (isDark ? 'text-amber-200' : 'text-amber-800') }, selectedProgramXpTarget == null ? 'All score-improvement XP earned' : ('Next XP at ' + selectedProgramXpTarget + ' rating ' + (selectedProgramXpTarget === 1 ? 'point' : 'points'))),
                    h('button', {
                      key: 'load', type: 'button', 'data-geology-core-program-load': selectedCoreProgram.key,
                      disabled: coreProgramLoadLocked, 'aria-describedby': coreProgramLoadLocked ? coreProgramLoadHelpId : undefined,
                      onClick: function () { loadCoreRigProgram(selectedCoreProgram); },
                      className: 'mt-2 min-h-11 w-full rounded-lg border border-cyan-300/60 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 px-3 text-[11px] font-extrabold transition hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-45 ' + (isDark ? 'text-cyan-100' : 'text-cyan-900'),
                      'aria-label': 'Load ' + selectedCoreProgram.angleDegrees + ' degree, ' + selectedCoreProgram.depth + ' interval certification program and enter Walk and Dig'
                    }, 'Load ' + selectedCoreProgram.angleDegrees + '° / ' + selectedCoreProgram.depth + ' program · enter Walk & Dig'),
                    coreProgramLoadLocked ? h('p', { key: 'load-help', id: coreProgramLoadHelpId, className: 'mt-1 text-[11px] font-semibold text-amber-500' }, 'End the active bore before loading another program.') : null
                  ])
                ]),
                latestCoreLog && latestCoreCassette ? h('ol', {
                  key: 'tube', 'data-geology-core-cassette': 'journal',
                  className: 'mt-2 flex min-h-12 gap-1 overflow-x-auto overflow-y-hidden rounded-lg border border-slate-500/50 bg-slate-900/80 p-1 shadow-inner',
                  'aria-label': 'Core cassette from shallowest to deepest'
                }, latestCoreCassette.slots.map(function (cassetteSlot) {
                  var recoveredSlot = cassetteSlot.state === 'recovered';
                  var cassetteSample = recoveredSlot ? cassetteSlot.sample : null;
                  var sampleRock = cassetteSample ? (SCENE.palette[cassetteSample.key] || ROCKS[cassetteSample.key] || {}) : {};
                  var rawColor = cassetteSample && cassetteSample.color != null ? cassetteSample.color : sampleRock.color;
                  var sampleTone = typeof rawColor === 'string' ? (rawColor.charAt(0) === '#' ? rawColor : '#' + rawColor) : hex(rawColor == null ? 0x64748b : rawColor);
                  var slotLabel = recoveredSlot
                    ? ('Core interval ' + cassetteSlot.interval + ': ' + cassetteSample.name + ', ' + cassetteSlot.quality + (cassetteSlot.integrityPercent == null ? ', integrity not recorded' : (', ' + cassetteSlot.integrityPercent + ' percent integrity')))
                    : ('Core interval ' + cassetteSlot.interval + ': not recovered');
                  var slotCopy = [
                    h('span', { key: 'number', 'data-geology-core-interval-number': cassetteSlot.interval, className: 'rounded-sm bg-slate-950/70 px-1 text-[10px] font-black tabular-nums shadow-sm' }, '#' + String(cassetteSlot.interval)),
                    h('span', { key: 'quality', 'data-geology-core-quality-glyph': cassetteSlot.quality, className: 'rounded-sm bg-slate-950/70 px-1 text-[13px] font-black leading-none shadow-sm', 'aria-hidden': 'true' }, cassetteSlot.glyph)
                  ];
                  return h('li', {
                    key: cassetteSlot.interval, 'data-state': cassetteSlot.state,
                    className: 'min-w-12 flex-1 list-none overflow-hidden rounded-md border transition motion-reduce:transition-none ' +
                      (recoveredSlot ? 'border-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]' : 'border-slate-600 bg-slate-800 text-slate-400')
                  }, recoveredSlot
                    ? h('button', {
                        type: 'button', className: 'flex min-h-11 w-full items-center justify-between gap-1 px-1 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300',
                        style: { background: sampleTone }, title: cassetteSample.name + ' · interval ' + cassetteSample.depth + (cassetteSlot.integrityPercent == null ? ' · integrity not recorded' : (' · ' + cassetteSlot.integrityPercent + '% integrity')),
                        'aria-label': slotLabel,
                        onClick: function () { selectRock(rockFacts(cassetteSample.key, DEPTH_GUESS[cassetteSample.key] || cassetteSample.depth)); }
                      }, slotCopy)
                    : h('span', { className: 'flex min-h-11 items-center justify-between gap-1 px-1', 'aria-label': slotLabel }, slotCopy));
                })) : h('div', { key: 'empty', className: 'mt-2 rounded-md border border-dashed p-2 text-[10px] font-semibold ' + (isDark ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-600') }, 'Drop into Walk & Dig, find level ground, then press R to deploy the core rig.'),
                latestCoreLog ? h('div', { key: 'summary', className: 'mt-2 grid gap-1 text-[10px] font-bold sm:grid-cols-[auto_1fr] ' + muted }, [
                  h('div', { key: 'facts', className: 'flex flex-wrap gap-x-3 gap-y-1' }, [
                    h('span', { key: 'samples' }, latestCoreSummary.sampleCount + ' samples'),
                    h('span', { key: 'materials' }, latestCoreSummary.uniqueMaterials + ' materials'),
                    h('span', { key: 'deepest' }, 'Interval ' + latestCoreSummary.deepest + ' deepest'),
                    latestCoreEvaluation && latestCoreEvaluation.integrityPercent != null ? h('span', { key: 'integrity', className: isDark ? 'text-cyan-200' : 'text-cyan-800' }, latestCoreEvaluation.integrityPercent + '% integrity') : null,
                    latestCoreEvaluation && latestCoreEvaluation.pristineCount ? h('span', { key: 'pristine', className: isDark ? 'text-emerald-200' : 'text-emerald-800' }, latestCoreEvaluation.pristineCount + ' pristine') : null,
                    latestCoreLog.coolantUsed ? h('span', { key: 'coolant', className: isDark ? 'text-sky-200' : 'text-sky-800' }, latestCoreLog.coolantUsed + ' coolant pulse' + (latestCoreLog.coolantUsed === 1 ? '' : 's')) : null,
                    h('span', { key: 'stop', className: latestCoreLog.stopReason ? (isDark ? 'text-amber-200' : 'text-amber-800') : (isDark ? 'text-emerald-200' : 'text-emerald-800') }, latestCoreLog.stopReason ? ('Stop · ' + coreRigStopLabel(latestCoreLog.stopReason)) : 'Target depth recovered')
                  ]),
                  h('span', { key: 'sequence', className: 'min-w-0 break-words sm:text-right', title: latestCoreLog.samples.map(function (sample) { return sample.name; }).join(' → ') }, latestCoreLog.samples.map(function (sample) { return sample.name; }).join(' → '))
                ]) : null,
                latestCoreComparison ? h('section', {
                  key: 'finding', 'data-geology-core-finding': latestCoreComparison.findingLevel,
                  className: 'mt-2', 'aria-label': 'Paired bore finding'
                }, [
                  h('span', { key: 'label', className: 'sr-only' }, 'Finding'),
                  coreRigCorrelationFigure(latestCoreComparison, { key: 'figure' })
                ]) : null,
                latestCoreNextExperiment ? h('section', {
                  key: 'next-experiment', 'data-geology-core-next-experiment': latestCoreNextExperiment.programKey,
                  className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-violet-300/35 bg-violet-400/10' : 'border-violet-200 bg-violet-50'),
                  'aria-label': 'Next controlled experiment'
                }, [
                  h('h5', { key: 'label', className: 'text-[10px] font-black uppercase tracking-[.14em] ' + (isDark ? 'text-violet-200' : 'text-violet-800') }, 'Next experiment'),
                  h('p', { key: 'question', className: 'mt-1 text-[11px] font-extrabold leading-snug ' + ink }, latestCoreNextExperiment.question),
                  coreRigExperimentRail(latestCoreNextExperiment, { key: 'variables', currentAngleDegrees: latestCoreLog.angleDegrees || coreRigAngleDegrees(latestCoreLog.angle), currentDepth: latestCoreLog.targetDepth }),
                  h('p', { key: 'control', className: 'mt-1 text-[10px] font-semibold ' + muted }, latestCoreNextExperiment.controlLabel)
                ]) : null,
                latestCoreLog ? h('div', { key: 'actions', className: 'mt-2 grid gap-1.5 ' + (latestCoreNextExperiment ? 'sm:grid-cols-2' : '') }, [
                  h('button', {
                    key: 'improve', type: 'button', disabled: coreProgramLoadLocked,
                    onClick: function () { loadCoreRigChallenge(latestCoreLog); },
                    className: 'min-h-11 rounded-lg border border-amber-300/60 bg-gradient-to-r from-amber-500/15 to-cyan-500/15 px-3 text-[11px] font-extrabold transition hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-45 ' + (isDark ? 'text-amber-100' : 'text-amber-900'),
                    'data-geology-core-load-trajectory': 'true',
                    'aria-label': 'Improve this ' + (latestCoreLog.angleDegrees || coreRigAngleDegrees(latestCoreLog.angle)) + ' degree, ' + latestCoreLog.targetDepth + ' interval bore'
                  }, 'Improve this bore · ' + (latestCoreLog.angleDegrees || coreRigAngleDegrees(latestCoreLog.angle)) + '° / ' + latestCoreLog.targetDepth),
                  latestCoreNextExperiment ? h('button', {
                    key: 'compare', type: 'button', disabled: coreProgramLoadLocked,
                    onClick: function () { loadCoreRigProgram(latestCoreNextExperiment.programKey, latestCoreNextExperiment); },
                    className: 'min-h-11 rounded-lg border border-violet-300/60 bg-gradient-to-r from-violet-500/20 to-cyan-500/15 px-3 text-[11px] font-extrabold transition hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-45 ' + (isDark ? 'text-violet-100' : 'text-violet-900'),
                    'data-geology-core-next-experiment': latestCoreNextExperiment.programKey,
                    'aria-label': 'Load next controlled experiment. ' + latestCoreNextExperiment.question
                  }, 'Compare · load ' + latestCoreNextExperiment.angleDegrees + '° / ' + latestCoreNextExperiment.depth) : null
                ]) : null,
                sceneCoreLogs.length > 1 ? h('div', { key: 'recent', className: 'mt-2 flex flex-wrap items-center gap-1', role: 'group', 'aria-label': 'Recent scored bores' }, [
                  h('span', { key: 'label', className: 'mr-1 text-[10px] font-black uppercase tracking-wide ' + muted }, 'Recent'),
                  sceneCoreLogs.slice().reverse().map(function (coreLog, coreLogIndex) {
                    var logEvaluation = coreLog.evaluation || coreRigEvaluation(coreLog);
                    var logSelected = latestCoreLog === coreLog;
                    var logStop = coreLog.stopReason ? coreRigStopLabel(coreLog.stopReason) : 'target depth';
                    return h('button', { key: coreLog.id || coreLog.completedAt || coreLogIndex, type: 'button', 'aria-pressed': logSelected ? 'true' : 'false', 'data-geology-core-review': coreLog.id || coreLog.completedAt || coreLogIndex, onClick: function () { reviewCoreRigReport(coreLog); }, className: 'min-h-9 rounded-full border px-2 text-[10px] font-extrabold transition focus:outline-none focus:ring-2 focus:ring-cyan-400 ' + (logSelected ? (isDark ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-cyan-500 bg-cyan-100 text-cyan-900') : (isDark ? 'border-slate-600 bg-slate-900/60 text-slate-200' : 'border-slate-300 bg-white/70 text-slate-700')), 'aria-label': 'Review grade ' + logEvaluation.grade + ' bore, score ' + logEvaluation.score + ', ' + coreRigAngleDegrees(coreLog.angle) + ' degrees, ' + coreLog.targetDepth + ' intervals, stop ' + logStop }, logEvaluation.grade + ' · ' + logEvaluation.score);
                  })
                ]) : null
              ])
            ]) : null,
            h('div', { key: 'entries', className: 'mt-2 grid grid-cols-2 gap-1.5', role: 'group', 'aria-label': 'Scene specimen entries' }, entries.map(function (entry) {
              var tone = entry.discovered ? hex(entry.color) : (isDark ? '#475569' : '#cbd5e1');
              var body = [
                h('span', { key: 'swatch', 'aria-hidden': 'true', className: 'h-5 w-5 shrink-0 rounded-md border border-white/20', style: { background: tone, boxShadow: entry.discovered ? 'inset 0 0 0 1px rgba(255,255,255,.18)' : 'none' } }),
                h('span', { key: 'copy', className: 'min-w-0' }, [
                  h('span', { key: 'name', className: 'block truncate text-[10.5px] font-extrabold' }, (entry.discovered ? '✓ ' : '🔒 ') + entry.name),
                  h('span', { key: 'type', className: 'block truncate text-[10px] ' + muted }, entry.discovered ? entry.type : 'Mine to reveal field notes')
                ])
              ];
              return entry.discovered
                ? h('button', { key: entry.key, type: 'button', 'data-geology-journal-entry': entry.key, 'data-state': 'logged', onClick: function () { selectRock(rockFacts(entry.key, DEPTH_GUESS[entry.key] || 4)); }, className: 'flex min-h-12 min-w-0 items-center gap-2 rounded-lg border p-2 text-left transition hover:border-cyan-400 ' + cardBg + ' ' + ink, 'aria-label': 'Review logged specimen ' + entry.name + ' in the 3D model' }, body)
                : h('div', { key: entry.key, 'data-geology-journal-entry': entry.key, 'data-state': 'unlogged', className: 'flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-dashed p-2 opacity-70 ' + (isDark ? 'border-slate-600' : 'border-slate-300') }, body);
            })),
            progress.complete
              ? h('p', { key: 'complete', className: 'mt-2 rounded-lg border border-emerald-400/50 bg-emerald-500/10 p-2 text-[10.5px] font-bold ' + (isDark ? 'text-emerald-200' : 'text-emerald-800'), role: 'status' }, '✓ Scene journal complete — every safely mineable material is logged.')
              : null,
            h('button', { key: 'drop-in', type: 'button', onClick: function () { setFpOn(true); setTimeout(function () { try { if (containerRef.current) containerRef.current.focus(); } catch (e) {} }, 0); }, className: 'mt-2 min-h-10 w-full rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-2 text-[10.5px] font-extrabold ' + (isDark ? 'text-cyan-200' : 'text-cyan-800'), 'data-geology-journal-drop-in': 'true' }, fpOn ? 'Return to the 3D view for fieldwork' : (progress.complete ? '⛏ Drop in for another Field Run' : '⛏ Drop in and log specimens'))
          ]) : null
        ]);
      }
      function strataList() {
        return h('div', { role: 'group', 'aria-label': 'Rock types ? select to learn more', tabIndex: -1, 'data-geology-target': 'materials', className: 'grid grid-cols-2 gap-1.5' + routeTargetClass('materials') },
          SCENE.order.map(function (k) {
            var R = SCENE.palette[k];
            var focusState = !focusLensOn || !selected ? 'context' : (selected.key === k ? 'match' : 'muted');
            return h('button', {
              key: k, type: 'button',
              'aria-pressed': selected && selected.key === k ? 'true' : 'false',
              'data-geology-material': k,
              'data-geology-focus-state': focusState,
              onClick: function () { selectRock(rockFacts(k, DEPTH_GUESS[k] || 4)); },
              className: 'transition active:scale-[0.97] hover:-translate-y-px flex items-center gap-2 text-left px-2 py-1.5 rounded-lg border text-[11.5px] ' + (focusState === 'muted' ? 'opacity-40 ' : '') + (selected && selected.key === k ? 'ring-2 ring-amber-400 ' : '') + cardBg + ' ' + ink + ' hover:border-amber-400 hover:shadow-md'
            },
              h('span', { 'aria-hidden': 'true', className: 'w-3.5 h-3.5 rounded flex-none', style: { background: hex(R.color), boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' } }),
              h('span', { className: 'truncate font-semibold' }, R.name)
            );
          })
        );
      }




      function normalizeCameraView(view) { return view === 'front' || view === 'top' ? view : 'iso'; }
      function cameraViewLabel(view) { var next = normalizeCameraView(view); return next === 'front' ? 'Front cross-section' : (next === 'top' ? 'Top-down map' : '3D overview'); }
      function setCameraView(view) {
        var next = normalizeCameraView(view);
        setCameraViewState(next); announce('Camera view: ' + cameraViewLabel(next) + '.');
        try { if (window[ENGINE_KEY] && window[ENGINE_KEY].setView) window[ENGINE_KEY].setView(next); } catch (e) {}
      }
      function switchScene(sid) {
        if (sid === scene || !SCENES[sid]) return;
        var restored = sceneResumeState(sid, d);
        setSceneState(sid); upd('scene', sid); setCoreRigHud(null); setCoreRigReview(null); setCoreRigChallenge(null);
        setCompareSceneId(defaultComparisonScene(sid));
        setModeState('explore'); upd('mode', 'explore');
        setHintShown(false); setVocabularyOpen(false);
        setSequenceOrder(sequenceInitialOrder(sid)); setSequenceFeedback(null); setSequenceDragKey(null); setSequenceTapKey(null);
        setSceneJourneyStep(restored.index); setSignalStep(restored.index); setSceneResumeNotice(restored.hasSavedProgress ? restored : null);
        setCompareStage(0); setActiveBeaconId(null); setBeaconTourOn(false); setBeaconTourStep(restored.index);
        setCameraViewState('iso'); setFocusLensOn(false); setRouteTarget(null);
        setSlice(0); setExcavate(false); setDigCount(0); setRedoCount(0); setSelected(null); setCompareList([]); setCore(null); setWaterOn(false); setQuizI(0); setQuizAns(null);
      }

      function formationTimelinePanel() {
        var timeline = sceneTimelineFor(SCENE.id), activeIndex = Math.max(0, Math.min(sceneJourneyStep, timeline.length - 1)), active = timeline[activeIndex];
        function chooseStage(index) {
          var next = timeline[Math.max(0, Math.min(index, timeline.length - 1))], beacon = sceneBeaconsFor(SCENE.id).filter(function (item) { return item.id === next.beaconId; })[0];
          if (beacon) activateBeacon(beacon); else { setSceneJourneyStep(next.index); setSceneResumeNotice(null); announce(next.label + '. ' + next.body); }
        }
        return h('section', { className: 'rounded-xl border ' + cardBg, role: 'region', 'aria-label': 'Formation timeline', 'data-geology-formation-timeline': 'true' },
          h('div', { className: 'p-3' }, [
            h('div', { key: 'head', className: 'flex flex-wrap items-start justify-between gap-2' }, [
              h('div', { key: 'copy' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wider ' + (isDark ? 'text-sky-300' : 'text-sky-700') }, 'Formation timeline'), h('h3', { className: 'mt-1 text-[12px] font-extrabold ' + ink }, 'Scrub the scene story'), h('p', { className: 'mt-1 text-[11px] leading-relaxed ' + muted }, 'Move through the three events to see the matching landmark and process cue.')),
              h('span', { key: 'count', className: 'text-[10px] font-bold ' + muted, 'data-geology-timeline-position': 'true' }, 'Stage ' + (activeIndex + 1) + ' of ' + timeline.length)
            ]),
            h('input', { key: 'range', type: 'range', min: 0, max: timeline.length - 1, step: 1, value: activeIndex, 'aria-label': 'Formation timeline stage', 'aria-valuetext': 'Stage ' + (activeIndex + 1) + ': ' + active.cueLabel, 'data-geology-timeline-range': 'true', onChange: function (e) { chooseStage(Number(e.target.value)); }, className: 'mt-3 w-full' }),
            h('div', { key: 'stages', className: 'mt-2 grid grid-cols-3 gap-1.5' }, timeline.map(function (item, index) {
              var on = index === activeIndex;
              return h('button', { key: item.key, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Timeline stage ' + (index + 1) + ': ' + item.cueLabel, 'data-geology-timeline-stage': item.key, onClick: function () { chooseStage(index); }, className: 'min-w-0 rounded-lg border px-1.5 py-2 text-center transition-colors ' + (on ? 'border-sky-600 bg-sky-700 text-white shadow-sm' : btnIdle) }, [
                h('span', { key: 'number', className: 'mx-auto flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black' }, index + 1),
                h('span', { key: 'label', className: 'mt-1 block text-[10px] font-bold leading-tight' }, item.cueLabel),
                h('span', { key: 'beacon', className: 'mt-0.5 block truncate text-[10px] font-semibold' }, item.beaconLabel)
              ]);
            })),
            h('div', { key: 'detail', className: 'mt-3 rounded-lg border-l-2 border-sky-400 bg-sky-500/10 p-2.5', role: 'status', 'data-geology-timeline-detail': 'true' }, [
              h('div', { key: 'title', className: 'text-[11px] font-extrabold ' + ink }, active.cueLabel + ' · ' + active.beaconLabel),
              h('p', { key: 'body', className: 'mt-0.5 text-[11px] leading-relaxed ' + ink }, active.body)
            ])
          ]));
      }

      function cameraCompassOverlay() {
        if (fpOn) return null;
        return h('div', { className: 'pointer-events-none absolute bottom-2 right-2 z-10 hidden items-center gap-2 rounded-lg border border-white/20 bg-slate-950/80 px-2 py-1.5 text-white shadow-lg sm:flex', 'aria-hidden': 'true', 'data-geology-camera-compass': 'true' }, [
          h('div', { key: 'compass', className: 'relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-400/70 text-[10px] font-black' }, [
            h('span', { key: 'north', className: 'absolute -top-2 text-[10px] text-amber-200' }, 'N'),
            h('span', { key: 'west', className: 'absolute -left-2 text-[10px] text-slate-300' }, 'W'),
            h('span', { key: 'east', className: 'absolute -right-2 text-[10px] text-slate-300' }, 'E'),
            h('span', { key: 'needle', className: 'text-amber-300 motion-safe:transition-transform motion-reduce:transition-none', style: { transform: cameraViewState === 'top' ? 'rotate(90deg)' : (cameraViewState === 'front' ? 'rotate(180deg)' : 'rotate(35deg)') } }, '↗')
          ]),
          h('div', { key: 'label', className: 'min-w-0' }, h('div', { className: 'text-[10px] font-black uppercase tracking-wider text-amber-200' }, 'Orientation'), h('div', { className: 'text-[10.5px] font-bold' }, cameraViewLabel(cameraViewState)))
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
              return h('button', { key: item[0], type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Set camera view: ' + item[1], onClick: function () { setCameraView(item[0]); }, className: 'rounded-md border px-2 py-1 text-[10px] font-bold ' + (on ? 'border-sky-600 bg-sky-700 text-white' : btnIdle) }, item[1]);
            }))
          ]));
      }

      function processCueOverlay() {
        if (fpOn) return null;
        var cue = sceneProcessCueFor(SCENE.id), index = Math.max(0, Math.min(sceneJourneyStep, cue.steps.length - 1)), step = cue.steps[index];
        var deepEarthCoreOpen = SCENE.id === 'deepEarth' && cutaway.step >= Math.max(3, Math.round(NZ * 0.28));
        var deepEarthLegend3d = null, deepEarthLegendState3d = 'closed';
        if (SCENE.id === 'deepEarth') {
          if (!deepEarthCoreOpen) {
            deepEarthLegend3d = 'Move Cutaway deeper to reveal the active science layer.';
          } else if (index === 1) {
            deepEarthLegendState3d = 'seismic-shadow';
            deepEarthLegend3d = [
              h('div', { key: 'p-wave', className: 'flex items-center gap-1.5' }, [h('span', { key: 'swatch', className: 'h-1.5 w-4 rounded-full bg-cyan-400' }), 'Cyan pulses · P-waves bend and continue']),
              h('div', { key: 's-wave', className: 'mt-0.5 flex items-center gap-1.5' }, [h('span', { key: 'swatch', className: 'flex h-3 w-4 items-center justify-center text-pink-300' }, '◆'), 'Magenta diamonds · S-waves stop at liquid core']),
              h('div', { key: 'shadow', className: 'mt-0.5 flex items-center gap-1.5' }, [h('span', { key: 'swatch', className: 'flex h-3 w-4 items-center justify-center font-black text-pink-300' }, '×'), 'Far-side receivers · S-wave shadow zone'])
            ];
          } else if (index === 2) {
            deepEarthLegendState3d = 'core-dynamo';
            deepEarthLegend3d = [
              h('div', { key: 'flow', className: 'flex items-center gap-1.5' }, [h('span', { key: 'swatch', className: 'h-1.5 w-4 rounded-full bg-orange-500' }), 'Orange-red flow · liquid outer-core convection']),
              h('div', { key: 'field', className: 'mt-0.5 flex items-center gap-1.5' }, [h('span', { key: 'swatch', className: 'h-1.5 w-4 rounded-full bg-sky-400' }), 'Blue arcs · magnetic field (schematic)']),
              h('div', { key: 'inner', className: 'mt-0.5 flex items-center gap-1.5' }, [h('span', { key: 'swatch', className: 'h-2.5 w-2.5 rounded-full bg-amber-300' }), 'Gold center · pressure keeps the inner core solid'])
            ];
          } else {
            deepEarthLegendState3d = 'solid-mantle';
            deepEarthLegend3d = [
              h('div', { key: 'mantle-flow', className: 'flex items-center gap-1.5' }, [h('span', { key: 'swatch', className: 'h-1.5 w-4 rounded-full bg-orange-500' }), 'Orange loops · slow mantle convection']),
              h('div', { key: 'mantle-state', className: 'mt-0.5 text-slate-300' }, 'The mantle is solid rock that creeps over geologic time.')
            ];
          }
        }
        return h('div', { className: 'pointer-events-none absolute bottom-12 left-2 z-10 hidden rounded-lg border border-white/20 bg-slate-950/85 p-2 text-white shadow-lg sm:block', style: { maxWidth: 'min(19rem, calc(100% - 6rem))' }, 'aria-hidden': 'true', 'data-geology-process-overlay': 'true' }, [
          h('div', { key: 'title', className: 'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-200' }, [h('span', { key: 'pulse', className: 'h-2 w-2 rounded-full bg-amber-300 ring-2 ring-amber-300/30', 'aria-hidden': 'true' }), cue.title]),
          h('div', { key: 'step', className: 'mt-1 text-[11px] font-bold' }, 'Stage ' + (index + 1) + ': ' + step.label),
          h('p', { key: 'detail', className: 'mt-0.5 text-[10.5px] leading-snug text-slate-200' }, step.detail),
          deepEarthLegend3d != null ? h('div', { key: 'core-key', className: 'mt-1.5 border-t border-white/10 pt-1.5 text-[10px] leading-snug text-slate-100', 'data-geology-deep-earth-legend': deepEarthLegendState3d }, deepEarthLegend3d) : null
        ]);
      }
      function processCuePanel() {
        var cue = sceneProcessCueFor(SCENE.id), axis = cue.axis, index = Math.max(0, Math.min(sceneJourneyStep, cue.steps.length - 1));
        var deepEarthScienceKey3d = null;
        if (SCENE.id === 'deepEarth') {
          deepEarthScienceKey3d = index === 1 ? {
            state: 'seismic-waves',
            title: 'Read the seismic model',
            rows: [
              { mark: 'P', tone: 'bg-cyan-400 text-slate-950', text: 'P-wave: a compressional pulse that travels through both solid and liquid layers.' },
              { mark: 'S', tone: 'bg-pink-600 text-white', text: 'S-wave: a shear pulse that travels through solids but stops at the liquid outer core.' },
              { mark: '×', tone: 'border border-pink-500 text-pink-500', text: 'Receiver cross: no S-wave arrival—evidence that the outer core is liquid.' }
            ]
          } : (index === 2 ? {
            state: 'core-dynamo',
            title: 'Read the core model',
            rows: [
              { mark: '↻', tone: 'bg-orange-700 text-white', text: 'Orange flow: conductive liquid iron circulates in the outer core.' },
              { mark: '⌁', tone: 'bg-sky-400 text-slate-950', text: 'Blue arcs: a schematic magnetic field generated by that moving metal.' },
              { mark: '●', tone: 'bg-amber-300 text-amber-950', text: 'Gold center: immense pressure keeps the inner core solid.' }
            ]
          } : {
            state: 'solid-mantle',
            title: 'Read the mantle model',
            rows: [
              { mark: '↻', tone: 'bg-orange-700 text-white', text: 'Orange loops: solid mantle rock slowly deforms and creeps over geologic time.' }
            ]
          });
        }
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
            deepEarthScienceKey3d ? h('div', { key: 'science-key', className: 'mt-2 rounded-lg border p-2 ' + (isDark ? 'border-slate-700 bg-slate-900/45' : 'border-slate-200 bg-slate-50'), role: 'note', 'aria-label': 'Deep Earth visual key', 'data-geology-science-key': deepEarthScienceKey3d.state }, [
              h('div', { key: 'title', className: 'text-[10px] font-black uppercase tracking-wider ' + muted }, deepEarthScienceKey3d.title),
              h('div', { key: 'rows', className: 'mt-1 grid gap-1.5' }, deepEarthScienceKey3d.rows.map(function (row3d) {
                return h('div', { key: row3d.text, className: 'flex items-start gap-2 text-[10.5px] leading-snug ' + ink }, [
                  h('span', { key: 'mark', className: 'mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black ' + row3d.tone, 'aria-hidden': 'true' }, row3d.mark),
                  h('span', { key: 'text' }, row3d.text)
                ]);
              }))
            ]) : null,
            h('div', { key: 'axis', className: 'mt-3', 'data-geology-evidence-axis-panel': SCENE.id }, [
              h('div', { key: 'axis-head', className: 'flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider ' + muted }, [h('span', { key: 'label' }, axis.label), h('span', { key: 'value', className: 'text-right' }, axis.value)]),
              h('div', { key: 'bar', className: 'mt-1 h-2 rounded-full bg-gradient-to-r ' + axis.gradient, style: { height: '0.5rem', minWidth: '1px' }, role: 'img', 'aria-label': axis.ariaLabel, 'data-geology-evidence-axis': SCENE.id }),
              h('div', { key: 'labels', className: 'mt-1 grid grid-cols-3 gap-2 text-[10px] ' + muted }, axis.labels.map(function (label, labelIndex) { return h('span', { key: label, className: labelIndex === 1 ? 'text-center' : (labelIndex === 2 ? 'text-right' : '') }, label); })),
              h('p', { key: 'axis-copy', className: 'mt-1 text-[10.5px] leading-snug ' + muted }, cue.depth)
            ])
          ]));
      }

      function activateBeacon(beacon) {
        if (!beacon) return;
        var stage = Number.isFinite(beacon.stage) ? beacon.stage : 0;
        setActiveBeaconId(beacon.id); setSceneJourneyStep(stage); setSceneResumeNotice(null); setBeaconTourStep(stage); setModeState('investigate'); upd('mode', 'investigate');
        setRouteTarget(null); setHintShown(false);
        if (beacon.view) setCameraView(beacon.view);
        try { if (window[ENGINE_KEY] && beacon.key && window[ENGINE_KEY].setHighlight) window[ENGINE_KEY].setHighlight(beacon.key); } catch (e) {}
        if (missionForScene().signal && Number.isFinite(beacon.stage)) revealSignalStep(beacon.stage);
        else if (beacon.key && SCENE.palette && SCENE.palette[beacon.key]) selectRock(rockFacts(beacon.key, DEPTH_GUESS[beacon.key] || 4), false, beacon.detail);
        addNotebookEvidence('landmark', beacon.label, beacon.detail, 'beacon-' + beacon.id);
        announce(beacon.label + '. ' + beacon.detail);
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
          return h('button', { key: beacon.id, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Highlight ' + beacon.label, 'data-geology-beacon-overlay-item': beacon.id, 'data-tooltip': beacon.label, onClick: function () { activateBeacon(beacon); }, className: 'flex min-h-11 min-w-11 items-center justify-center rounded-full border text-[10px] font-black shadow-sm ' + (on ? 'border-amber-200 bg-amber-400 text-amber-950' : (isDark ? 'border-slate-500 bg-slate-900/90 text-amber-200' : 'border-slate-300 bg-white/90 text-amber-700')) }, String(index + 1));
        }));
      }

      // ── 3D viewport / loading / fallback ──
      function measurementGridNodes(rows, prefix) {
        var nodes = [];
        (rows || []).forEach(function (row) {
          nodes.push(h('span', { key: prefix + row.id + '-label', className: muted }, row.label));
          nodes.push(h('span', { key: prefix + row.id + '-value', className: row.emphasis ? 'font-semibold text-amber-300' : '' }, row.value));
        });
        return nodes;
      }
      function viewport() {
        if (webglError) {
          var fallbackVisual = feat.crossSection ? 'cross-section' : '2D evidence map';
          return h('div', { className: 'rounded-xl border p-4 text-center ' + cardBg },
            h('div', { className: 'text-2xl mb-1' }, '⛰️'),
            h('div', { className: 'text-sm font-bold ' + ink }, t('stem.geology.no3d_title', '3D view unavailable')),
            h('div', { className: 'text-xs mt-1 ' + muted }, t('stem.geology.no3d_body_' + (feat.crossSection ? 'cross_section' : 'evidence_map'), 'Your device could not start WebGL. Use the ' + fallbackVisual + ' and material list — they preserve the learning core.')));
        }
        if (!threeReady) {
          return h('div', { className: 'rounded-xl border flex items-center justify-center ' + cardBg, style: { minHeight: 320 } },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-2xl mb-2 animate-pulse motion-reduce:animate-none' }, '🔷'),
              h('div', { className: 'text-sm ' + muted }, t('stem.geology.loading3d', 'Loading the 3D engine…'))));
        }
        var fpWalkScene = fpExplorerMode(scene) === 'mine';
        var rigDeployed = !!(fpOn && fpWalkScene && coreRigHud && coreRigHud.deployed);
        function fpAction(name) {
          var result = null;
          try {
            var E = window[ENGINE_KEY]; if (!E) return null;
            if (name === 'mine' && E.fpMine) result = E.fpMine(false);
            else if (name === 'mine-start') { if (E.fpMiningHeld) E.fpMiningHeld(true); if (E.fpMine) result = E.fpMine(false); }
            else if (name === 'mine-stop' && E.fpMiningHeld) result = E.fpMiningHeld(false);
            else if (name === 'tool-pick' || name === 'tool-drill') {
              var nextTool = name === 'tool-drill' ? 'drill' : 'pick';
              if (E.fpSetTool) result = E.fpSetTool(nextTool);
              setFpTool(nextTool); upd('fpTool', nextTool); announce((nextTool === 'drill' ? 'Powered drill' : 'Pickaxe') + ' selected.');
            }
            else if (name === 'undo' && E.fpUndoMine) result = E.fpUndoMine();
            else if (name === 'redo' && E.fpRedoMine) result = E.fpRedoMine();
            else if (name === 'survey') result = surveyFieldTarget(scene);
            else if (name === 'rig-toggle') result = coreRigAction('toggle');
            else if (name === 'rig-start') result = coreRigAction('start');
            else if (name === 'rig-stop' && E.coreRigCancel) result = E.coreRigCancel();
            else if (name === 'rig-pack') result = coreRigAction('pack');
            else if (name === 'home' && E.fpRespawn) result = E.fpRespawn();
          } catch (e) {}
          if (name !== 'rig-toggle' && name !== 'rig-pack') {
            setTimeout(function () { try { if (containerRef.current) containerRef.current.focus(); } catch (e) {} }, 0);
          }
          return result;
        }
        function fieldRunPanel() {
          if (!fpOn || rigDeployed) return null;
          var book = fieldBook || { xp: 0, total: 0, byScene: {} };
          var entry = (book.byScene && book.byScene[scene]) || {};
          var contract = fieldExpeditionFor(scene, entry.active ? entry.contractIndex : (entry.completed || 0));
          if (!contract) return null;
          var collected = Array.isArray(entry.collected) ? entry.collected : [];
          var heading = entry.active ? contract.label : 'Field Run';
          var rank = fieldRankForXp(book.xp), rankRange = rank.nextThreshold == null ? 1 : Math.max(1, rank.nextThreshold - rank.threshold);
          var rankProgress = rank.nextThreshold == null ? 100 : Math.max(0, Math.min(100, Math.round(((Number(book.xp) || 0) - rank.threshold) / rankRange * 100)));
          var discoveryProgress = fieldDiscoveryProgress(scene, book.discoveredByScene);
          var content = entry.active
            ? [
                h('p', { key: 'brief', className: 'mt-1 text-[10px] leading-snug text-slate-300' }, contract.brief),
                h('ol', { key: 'targets', className: 'mt-1.5 grid gap-0.5', 'aria-label': 'Specimens in collection order' }, contract.targets.map(function (key, index) {
                  var done = index < collected.length;
                  var current = index === collected.length && !entry.ready;
                  return h('li', { key: key, className: 'flex items-center gap-1 text-[10px] font-semibold ' + (done ? 'text-emerald-300' : (current ? 'text-amber-200' : 'text-slate-400')), 'aria-current': current ? 'step' : undefined }, [
                    h('span', { key: 'mark', 'aria-hidden': 'true', className: 'w-3 text-center' }, done ? '✓' : (current ? '→' : '○')),
                    h('span', { key: 'name' }, fieldSpecimenName(scene, key))
                  ]);
                })),
                entry.ready
                  ? h('button', { key: 'bank', type: 'button', onClick: function () { fpAction('home'); }, className: 'mt-2 min-h-10 w-full rounded-md border border-emerald-300 bg-emerald-500 px-2 text-[10px] font-extrabold text-emerald-950 shadow', 'aria-label': 'Return to the entry point and bank ' + fieldRunReward(contract) + ' field XP' }, '⌂ Bank +' + fieldRunReward(contract) + ' XP')
                  : h('div', { key: 'guide', className: 'mt-1.5 grid gap-1.5' }, [
                      h('p', { key: 'instruction', className: 'text-[10px] font-bold text-amber-100' }, 'Excavate the arrowed specimen next.'),
                      h('button', { key: 'survey', type: 'button', 'data-geology-field-survey': 'true', onClick: function () { fpAction('survey'); }, className: 'min-h-10 w-full rounded-md border border-cyan-300/70 bg-cyan-950/80 px-2 text-[10px] font-extrabold text-cyan-100', 'aria-label': 'Survey for nearest ' + fieldSpecimenName(scene, contract.targets[collected.length]) }, '◎ Survey pulse (G)')
                    ])
              ]
            : [
                h('p', { key: 'brief', className: 'mt-1 text-[10px] leading-snug text-slate-300' }, 'Next: ' + contract.label + ' · ' + contract.brief),
                h('button', { key: 'start', type: 'button', onClick: function () { startFieldRun(scene); }, className: 'mt-2 min-h-10 w-full rounded-md border border-amber-300 bg-amber-500 px-2 text-[10px] font-extrabold text-amber-950 shadow', 'aria-label': 'Start field run: ' + contract.label }, 'Start 3-specimen run')
              ];
          return h('section', { 'data-geology-field-run': 'true', 'data-state': entry.ready ? 'ready' : (entry.active ? 'active' : 'available'), className: 'absolute left-2 top-28 z-10 rounded-lg border border-amber-300/50 bg-slate-950/90 p-2 text-white shadow-xl ' + (coreRigHud && coreRigHud.deployed ? 'hidden md:block' : ''), style: { width: 'min(220px, calc(100% - 5.5rem))' }, role: 'region', 'aria-label': 'Field run contract' }, [
            h('div', { key: 'head', className: 'flex items-center justify-between gap-2' }, [
              h('h3', { key: 'title', className: 'truncate text-[11px] font-extrabold text-amber-200' }, '🧭 ' + heading),
              h('span', { key: 'xp', className: 'shrink-0 text-[10px] font-bold text-emerald-300', title: (book.total || 0) + ' field runs completed' }, (book.xp || 0) + ' XP')
            ]),
            h('div', { key: 'rank', className: 'mt-1', 'data-geology-field-rank': rank.label }, [
              h('div', { key: 'labels', className: 'flex justify-between gap-2 text-[10px] font-semibold text-slate-300' }, [h('span', { key: 'current' }, rank.label), h('span', { key: 'next' }, rank.nextLabel ? rank.remaining + ' XP to ' + rank.nextLabel : 'Top rank')]),
              h('div', { key: 'track', className: 'mt-0.5 h-1 overflow-hidden rounded-full bg-slate-700', role: 'progressbar', 'aria-label': 'Field rank progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': rankProgress }, h('span', { className: 'block h-full rounded-full bg-emerald-400', style: { width: rankProgress + '%' } })),
              h('div', { key: 'journal', 'data-geology-field-journal': 'true', className: 'mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold ' + (discoveryProgress.complete ? 'text-emerald-300' : 'text-cyan-200') }, [h('span', { key: 'label' }, '📓 Scene specimens'), h('span', { key: 'count' }, discoveryProgress.found + '/' + discoveryProgress.total + (discoveryProgress.complete ? ' complete' : ' logged'))])
            ])
          ].concat(content));
        }
        function coreRigConsole() {
          if (!fpOn || !fpWalkScene || !coreRigHud || !coreRigHud.deployed) return null;
          var rigRunning = !!coreRigHud.running, rigStage = coreRigHud.stage || 'preview';
          var rigFinished = ['complete', 'stopped', 'paused'].indexOf(rigStage) >= 0;
          var rigPreview = !rigRunning && !rigFinished;
          var rigPhaseIndex = rigFinished ? 2 : (rigStage === 'preview' ? 0 : 1);
          var rigPhaseKey = ['setup', 'bore', 'debrief'][rigPhaseIndex];
          var rigShellTone = rigFinished
            ? 'border-violet-300/70 shadow-[0_0_38px_rgba(167,139,250,.34)]'
            : (rigPhaseIndex === 1 ? 'border-amber-300/65 shadow-[0_0_36px_rgba(251,191,36,.28)]' : 'border-cyan-300/60 shadow-[0_0_34px_rgba(34,211,238,.32)]');
          var rigAccentTone = rigFinished
            ? 'from-violet-400 via-cyan-300 to-emerald-300'
            : (rigPhaseIndex === 1 ? 'from-amber-400 via-orange-300 to-cyan-300' : 'from-cyan-400 via-sky-300 to-violet-400');
          var rigCurrentStepTone = rigFinished
            ? 'border-violet-200/70 bg-violet-400/20 text-violet-100'
            : (rigPhaseIndex === 1 ? 'border-amber-200/70 bg-amber-400/20 text-amber-100' : 'border-cyan-200/70 bg-cyan-400/20 text-cyan-100');
          var rigIconTone = rigFinished
            ? 'border-violet-300/60 bg-violet-400/15 text-violet-100 shadow-[0_0_12px_rgba(167,139,250,.3)]'
            : (rigPhaseIndex === 1 ? 'border-amber-300/60 bg-amber-400/15 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,.3)]' : 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,.3)]');
          var rigStageTextTone = rigFinished ? 'text-violet-200' : (rigPhaseIndex === 1 ? 'text-amber-300' : 'text-cyan-200');
          var rigPhaseGlyph = ['⌖', '⛏', '⬡'][rigPhaseIndex];
          var rigLocked = rigRunning || rigStage === 'deploying';
          var rigProgress = Math.max(0, Math.min(100, Math.round((Number(coreRigHud.progress) || 0) * 100)));
          var rigHeat = Math.max(0, Math.min(100, Math.round((Number(coreRigHud.heat) || 0) * 100)));
          var rigSamples = Array.isArray(coreRigHud.samples) ? coreRigHud.samples : [];
          var rigEvaluation = coreRigHud.evaluation || null;
          var stageLabel = rigStage === 'deploying' ? 'STABILIZING' : (rigStage === 'drilling' ? 'LIVE BORE' : (rigStage === 'cooling' ? 'AUTO COOL' : (rigStage === 'complete' ? 'CORE READY' : (rigStage === 'stopped' ? 'BORE STOP' : (rigStage === 'paused' ? 'EARLY STOP' : 'TRAJECTORY')))));
          var rigRunEntry = (fieldBook.byScene && fieldBook.byScene[SCENE.id]) || {};
          var rigAssignment = rigRunEntry.active ? fieldExpeditionFor(SCENE.id, rigRunEntry.contractIndex) : null;
          var rigCollected = Array.isArray(rigRunEntry.collected) ? rigRunEntry.collected.length : 0;
          var rigTarget = rigAssignment ? (rigRunEntry.ready ? 'Return home to bank the field run' : fieldSpecimenName(SCENE.id, rigAssignment.targets[rigCollected])) : null;
          var rigFeed = coreRigFeedProfile(coreRigHud.feedMode);
          var rigIntegrity = Math.round(Math.max(0.55, Math.min(1, Number(coreRigHud.currentIntegrity) || 1)) * 100);
          var rigScanning = !!coreRigHud.scanning;
          var rigCassette = coreRigCoreCassette(rigSamples, coreRigHud.depth || coreRigDepth, rigRunning, rigScanning);
          var rigIntervalResult = coreRigHud.lastIntervalResult || null;
          var rigFormationCue = coreRigHud.formationCue || (rigRunning && coreRigHud.formationLoad ? coreRigFormationCue(coreRigHud.formationLoad, coreRigHud.idealFeedMode, rigIntervalResult) : null);
          var rigTrajectory = coreRigHud.trajectoryScan ? coreRigTrajectorySnapshot(coreRigHud.trajectoryScan) : null;
          var rigBrief = coreRigHud.boreBrief || (rigTrajectory
            ? coreRigBoreBrief(rigTrajectory, rigSamples, coreRigHud.bestPristineStreak, ['complete', 'stopped', 'paused'].indexOf(rigStage) >= 0)
            : null);
          var rigBriefObjectives = rigBrief && Array.isArray(rigBrief.objectives) ? rigBrief.objectives : [];
          var rigComparison = coreRigHud.comparison && coreRigHud.comparison.eligible ? coreRigHud.comparison : null;
          var rigNextExperiment = coreRigHud.nextExperiment || null;
          var rigTrajectoryCopy = rigTrajectory ? coreRigTrajectorySummary(rigTrajectory) : '';
          var rigRiskTone = !rigTrajectory ? 'border-slate-500/40 bg-slate-900/45 text-slate-200'
            : (rigTrajectory.riskLevel === 'clear' ? 'border-emerald-300/45 bg-emerald-400/10 text-emerald-100'
            : (rigTrajectory.riskLevel === 'caution' ? 'border-amber-300/50 bg-amber-400/10 text-amber-100'
            : 'border-rose-300/45 bg-rose-400/10 text-rose-100'));
          var rigResultTone = !rigIntervalResult ? '' : (rigIntervalResult.tier === 'pristine' ? 'border-emerald-300/50 bg-emerald-400/15 text-emerald-100' : (rigIntervalResult.tier === 'stable' ? 'border-cyan-300/45 bg-cyan-400/10 text-cyan-100' : 'border-amber-300/50 bg-amber-400/15 text-amber-100'));
          var rigProgramKey = coreRigProgramKey(coreRigAngle, coreRigDepth);
          var rigPrograms = normalizeCoreRigPrograms(fieldBook.coreCertification);
          var rigProgram = rigPrograms[rigProgramKey];
          var rigCertificationProgress = coreRigCertificationSummary(fieldBook.coreCertification);
          var rigCertificationState = rigRunning ? 'IN PROGRESS' : (rigProgram.tier ? (rigProgram.tierLabel.toUpperCase() + ' ' + rigProgram.bestGrade) : (rigProgram.attempts ? 'RETRY' : 'OPEN'));
          var rigCertificationCopy = 'CERT ' + rigCertificationProgress.certified + '/9 • ' + coreRigAngleDegrees(coreRigAngle) + '° / ' + coreRigDepth + ' • ' + rigCertificationState;
          var activeRigChallenge = coreRigChallenge && coreRigChallenge.sceneId === SCENE.id ? coreRigChallenge : null;
          var challengeProgress = activeRigChallenge && activeRigChallenge.kind === 'score' ? coreRigChallengeProgress(activeRigChallenge.replayScore, activeRigChallenge.bestScore, rigEvaluation && rigEvaluation.score) : null;
          var activeProgramChallenge = activeRigChallenge && (activeRigChallenge.kind === 'program' || activeRigChallenge.kind === 'experiment') ? activeRigChallenge : null;
          var challengeCopy = !challengeProgress ? '' : (challengeProgress.state === 'ready'
            ? ('Replay ' + challengeProgress.replayScore + (challengeProgress.xpTarget == null ? ' · research ceiling reached' : ' · ' + challengeProgress.xpTarget + '+ earns XP'))
            : (challengeProgress.state === 'beaten' ? ('Replay beaten +' + challengeProgress.delta + ' · result ' + challengeProgress.resultScore)
            : (challengeProgress.state === 'matched' ? ('Replay matched · result ' + challengeProgress.resultScore) : (Math.abs(challengeProgress.delta) + ' points to replay · result ' + challengeProgress.resultScore))));
          var activeExperimentChallenge = activeProgramChallenge && activeProgramChallenge.kind === 'experiment' ? activeProgramChallenge : null;
          var programChallengeTarget = activeProgramChallenge && !activeExperimentChallenge ? coreRigCertificationXpTarget(activeProgramChallenge.programBestRating) : null;
          var programChallengeCopy = !activeProgramChallenge ? '' : (activeExperimentChallenge
            ? (activeExperimentChallenge.question || 'Recover this core, then compare the revealed sequence.')
            : (rigProgram.tier ? (rigProgram.tierLabel + ' · highest qualifying score ' + rigProgram.bestGrade + ' · rating ' + rigProgram.bestRating + ' · highest integrity ' + rigProgram.bestIntegrity + '% · ' + coreRigCertificationGuidance(rigProgram)) : coreRigCertificationGuidance(rigProgram)));
          var programChallengeXpCopy = !activeProgramChallenge ? '' : (activeExperimentChallenge
            ? activeExperimentChallenge.controlLabel
            : (programChallengeTarget == null ? 'All score-improvement XP earned' : ('Next XP at ' + programChallengeTarget + ' rating ' + (programChallengeTarget === 1 ? 'point' : 'points'))));
          var rigGradeClass = !rigEvaluation ? '' : (rigEvaluation.grade === 'S' ? 'border-violet-300 bg-violet-400/20 text-violet-100' : (rigEvaluation.grade === 'A' ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : (rigEvaluation.grade === 'B' ? 'border-emerald-300 bg-emerald-400/20 text-emerald-100' : (rigEvaluation.grade === 'C' ? 'border-amber-300 bg-amber-400/20 text-amber-100' : 'border-rose-300 bg-rose-400/20 text-rose-100'))));
          function sampleColor(sample) {
            var raw = sample && sample.color;
            if (typeof raw === 'number') return '#' + ('000000' + raw.toString(16)).slice(-6);
            if (typeof raw === 'string' && raw) return raw.charAt(0) === '#' ? raw : ('#' + raw);
            var rock = sample && (SCENE.palette[sample.key] || ROCKS[sample.key]);
            return rock && rock.color ? ('#' + ('000000' + Number(rock.color).toString(16)).slice(-6)) : '#94a3b8';
          }
          return h('section', {
            ref: coreRigConsoleRef, tabIndex: -1, 'data-geology-core-rig-console': 'true', 'data-stage': rigStage, 'data-running': rigRunning ? 'true' : 'false',
            'data-geology-core-phase': rigPhaseKey,
            className: 'absolute top-14 z-20 overflow-y-auto overscroll-contain rounded-xl border bg-gradient-to-br from-slate-950/95 via-cyan-950/95 to-amber-950/90 text-white backdrop-blur-md transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-cyan-300 ' + rigShellTone,
            style: { width: 'min(380px, calc(100% - 1rem))', right: 'clamp(.5rem, 4vw, 3.5rem)', maxHeight: 'min(calc(100% - 4rem), calc(100dvh - 5rem))' }, role: 'region', 'aria-label': 'Directional core rig command console'
          }, [
            h('div', { key: 'body', className: 'p-2' }, [
              h('header', { key: 'head', className: 'relative sticky top-0 z-20 -mx-2 -mt-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/95 px-2 pb-1.5 pt-3 backdrop-blur-md' }, [
                h('span', { key: 'accent', className: 'absolute inset-x-0 top-0 h-1 bg-gradient-to-r transition-colors duration-200 motion-reduce:transition-none ' + rigAccentTone, 'aria-hidden': 'true' }),
                h('div', { key: 'title', className: 'flex min-w-0 items-center gap-1.5' }, [
                  h('span', { key: 'icon', className: 'grid h-7 w-7 shrink-0 place-items-center rounded-md border text-base transition-colors duration-200 motion-reduce:transition-none ' + rigIconTone, 'aria-hidden': 'true' }, rigPhaseGlyph),
                  h('div', { key: 'words', className: 'min-w-0' }, [
                    h('h3', { key: 'name', className: 'truncate text-[11px] font-black tracking-wide text-cyan-100' }, 'STRATA CORE RIG'),
                    h('p', { key: 'stage', className: 'text-[11px] font-extrabold tracking-[.14em] transition-colors duration-200 motion-reduce:transition-none ' + rigStageTextTone }, stageLabel)
                  ])
                ]),
                h('span', { key: 'count', className: 'shrink-0 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-bold text-cyan-100' }, rigSamples.length + ' sample' + (rigSamples.length === 1 ? '' : 's') + (rigBrief ? (' · ' + rigBrief.metCount + '/3 seals') : '')),
                h('ol', {
                  key: 'phase-rail', 'data-geology-core-phase-rail': rigPhaseKey,
                  className: 'grid w-full grid-cols-3 gap-1', 'aria-label': 'Core rig workflow'
                }, [['setup', 'Setup'], ['bore', 'Bore'], ['debrief', 'Debrief']].map(function (phase, phaseIndex) {
                  var phaseState = phaseIndex < rigPhaseIndex ? 'complete' : (phaseIndex === rigPhaseIndex ? 'current' : 'upcoming');
                  return h('li', {
                    key: phase[0], 'data-geology-core-phase-step': phase[0], 'data-state': phaseState,
                    'aria-current': phaseState === 'current' ? 'step' : undefined,
                    'aria-label': phase[1] + ' phase, ' + phaseState,
                    className: 'list-none rounded-md border px-1 py-1 text-center text-[10px] font-black uppercase tracking-wide transition-colors duration-200 motion-reduce:transition-none ' +
                      (phaseState === 'current' ? rigCurrentStepTone : (phaseState === 'complete'
                        ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-slate-400'))
                  }, [
                    h('span', { key: 'label', className: 'block' }, (phaseState === 'complete' ? '✓ ' : (phaseState === 'current' ? '● ' : '○ ')) + phase[1]),
                    h('span', { key: 'state', className: 'block text-[10px] font-bold normal-case tracking-normal opacity-80' },
                      phaseState === 'complete' ? 'Complete' : (phaseState === 'current' ? 'Current' : 'Upcoming'))
                  ]);
                }))
              ]),
              rigPreview ? h('div', { key: 'cert-status', 'data-geology-core-cert-status': rigProgramKey, className: 'mt-1.5 rounded-md border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-black tracking-wide text-cyan-100' }, rigCertificationCopy) : null,
              rigTarget ? h('div', { key: 'target', className: 'mt-1.5 flex items-center gap-1.5 rounded-md border border-violet-300/25 bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-100', 'data-geology-core-field-target': 'true' }, [
                h('span', { key: 'icon', 'aria-hidden': 'true' }, '🧭'),
                h('span', { key: 'copy', className: 'min-w-0 truncate', title: rigTarget }, 'Field Run target · ' + rigTarget)
              ]) : null,
              rigPreview && activeProgramChallenge ? h('p', { key: 'program-challenge', 'data-geology-core-program-challenge': activeProgramChallenge.programKey, className: 'mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 rounded-md border border-violet-300/30 bg-violet-400/10 px-2 py-1 text-[10.5px] font-semibold text-slate-100' }, [
                h('span', { key: 'label', className: 'font-black text-violet-200' }, activeExperimentChallenge ? 'Next experiment' : 'Program focus'),
                h('span', { key: 'copy' }, programChallengeCopy),
                h('span', { key: 'xp', className: 'text-amber-200' }, programChallengeXpCopy)
              ]) : null,
              rigPreview && challengeProgress ? h('div', { key: 'challenge', 'data-geology-core-challenge': challengeProgress.state, className: 'mt-1.5 rounded-md border border-amber-300/40 bg-gradient-to-r from-amber-400/15 to-violet-400/10 px-2 py-1.5' }, [
                h('div', { key: 'head', className: 'flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-amber-200' }, [
                  h('span', { key: 'label' }, '◆ Score challenge'),
                  h('span', { key: 'trajectory', className: 'shrink-0 text-cyan-200' }, coreRigAngleDegrees(activeRigChallenge.angle) + '° / ' + activeRigChallenge.depth)
                ]),
                h('p', { key: 'copy', className: 'mt-0.5 text-[11px] font-bold text-slate-100', role: challengeProgress.state === 'ready' ? undefined : 'status' }, challengeCopy)
              ]) : null,
              rigEvaluation ? h('div', { key: 'evaluation', className: 'mt-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5' }, [
                h('span', { key: 'grade', 'data-geology-core-grade': rigEvaluation.grade, className: 'rounded-md border px-2 py-1 text-[11px] font-black ' + rigGradeClass }, 'Grade ' + rigEvaluation.grade),
                h('div', { key: 'copy', className: 'min-w-0 flex-1' }, [
                  h('p', { key: 'label', className: 'truncate text-[11px] font-extrabold text-white' }, rigEvaluation.label),
                  h('p', { key: 'detail', className: 'text-[11px] font-semibold text-slate-300' }, [
                    h('span', { key: 'score', 'data-geology-core-score': rigEvaluation.score }, rigEvaluation.score + '/200'),
                    coreRigHud.newBest ? h('span', { key: 'best', className: 'ml-1.5 text-amber-300' }, '★ New best') : null,
                    coreRigHud.certificationEarned ? h('span', { key: 'cert-tier', className: 'ml-1.5 text-violet-200' }, '⬡ ' + coreRigHud.certificationTierLabel) : null,
                    coreRigHud.researchReward ? h('span', { key: 'xp', 'data-geology-core-research-reward': coreRigHud.researchReward, className: 'ml-1.5 text-emerald-300' }, '+' + coreRigHud.researchReward + ' research XP') : null,
                    coreRigHud.certificationReward ? h('span', { key: 'program-xp', 'data-geology-core-certification-reward': coreRigHud.certificationReward, className: 'ml-1.5 text-amber-200' }, '+' + coreRigHud.certificationReward + ' program XP') : null,
                    rigEvaluation.integrityPercent != null ? h('span', { key: 'integrity', className: 'ml-1.5 text-cyan-200' }, rigEvaluation.integrityPercent + '% integrity') : null
                  ])
                ])
              ]) : null,
              rigPreview ? h('div', { key: 'config', 'data-geology-core-phase-surface': 'setup', className: 'mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]' }, [
                h('div', { key: 'angles', role: 'group', 'aria-label': 'Bore angle', className: 'grid grid-cols-3 gap-1' }, [
                  ['vertical', '↧', '90°'], ['slant', '⤡', '60°'], ['shallow', '↘', '35°']
                ].map(function (angleOption) {
                  var angleActive = coreRigHud.angle === angleOption[0];
                  return h('button', { key: angleOption[0], type: 'button', disabled: rigLocked, 'data-geology-core-rig-angle': angleOption[0], 'aria-pressed': angleActive ? 'true' : 'false', 'aria-label': angleOption[2] + ' ' + angleOption[0] + ' bore', onClick: function () { coreRigAction('angle', angleOption[0]); }, className: 'min-h-11 rounded-md border px-1 text-[11px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ' + (angleActive ? 'border-cyan-300 bg-cyan-400/25 text-cyan-50 shadow-[0_0_10px_rgba(34,211,238,.2)]' : 'border-slate-600 bg-slate-900/70 text-slate-300 hover:border-cyan-500') }, angleOption[1] + ' ' + angleOption[2]);
                })),
                h('div', { key: 'depths', role: 'group', 'aria-label': 'Target core depth', className: 'grid grid-cols-3 gap-1' }, CORE_RIG_DEPTHS.map(function (depthOption) {
                  var depthActive = Number(coreRigHud.depth) === depthOption;
                  return h('button', { key: depthOption, type: 'button', disabled: rigLocked, 'data-geology-core-rig-depth': depthOption, 'aria-pressed': depthActive ? 'true' : 'false', 'aria-label': depthOption + ' interval target depth', onClick: function () { coreRigAction('depth', depthOption); }, className: 'min-h-11 min-w-8 rounded-md border px-1 text-[11px] font-extrabold disabled:cursor-not-allowed disabled:opacity-45 ' + (depthActive ? 'border-amber-300 bg-amber-400/25 text-amber-100' : 'border-slate-600 bg-slate-900/70 text-slate-300') }, String(depthOption));
                }))
              ]) : null,
              rigPreview && rigTrajectory && rigBrief ? h('section', {
                key: 'bore-brief', 'data-geology-core-trajectory-scan': rigTrajectory.riskLevel,
                'data-geology-core-bore-brief': rigBrief.finished ? 'finished' : 'active',
                className: 'mt-2 overflow-hidden rounded-lg border p-2 transition-all motion-reduce:transition-none ' +
                  (rigBrief.complete
                    ? 'border-violet-300/70 bg-gradient-to-br from-violet-400/20 via-cyan-400/10 to-emerald-400/15 shadow-[0_0_20px_rgba(167,139,250,.28)]'
                    : 'border-cyan-300/30 bg-gradient-to-br from-slate-950/60 via-cyan-950/35 to-violet-950/25'),
                'aria-label': 'Aggregate bore trajectory brief'
              }, [
                h('div', { key: 'head', className: 'flex items-center justify-between gap-2' }, [
                  h('div', { key: 'title', className: 'flex items-center gap-1.5' }, [
                    h('span', { key: 'radar', className: 'grid h-6 w-6 place-items-center rounded-full border border-cyan-300/45 bg-cyan-400/15 text-[12px] text-cyan-100', 'aria-hidden': 'true' }, '◉'),
                    h('div', { key: 'copy' }, [
                      h('h4', { key: 'label', className: 'text-[10px] font-black uppercase tracking-[.16em] text-cyan-100' }, 'Bore Brief'),
                      h('p', { key: 'summary', className: 'text-[10px] font-semibold text-slate-300' }, rigTrajectoryCopy)
                    ])
                  ]),
                  h('span', { key: 'seals', className: 'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ' +
                    (rigBrief.complete ? 'border-violet-200/70 bg-violet-300/20 text-violet-100' : 'border-white/15 bg-white/5 text-slate-200') },
                    rigBrief.metCount + '/3 SEALS')
                ]),
                h('div', { key: 'coverage', className: 'mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/10',
                  role: 'progressbar', 'aria-label': 'Projected safe bore coverage', 'aria-valuemin': 0, 'aria-valuemax': 100,
                  'aria-valuenow': rigTrajectory.coveragePct, 'aria-valuetext': rigTrajectory.recoverable + ' of ' + rigTrajectory.requestedDepth + ' intervals recoverable' },
                  h('span', { className: 'block h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-amber-300 transition-[width] duration-300 motion-reduce:transition-none',
                    style: { width: rigTrajectory.coveragePct + '%' } })),
                h('div', { key: 'signals', className: 'mt-1.5 grid grid-cols-3 gap-1 text-center' }, [
                  h('div', { key: 'yield', className: 'rounded-md border border-white/10 bg-black/20 px-1 py-1' }, [
                    h('span', { key: 'label', className: 'block text-[10px] font-black uppercase tracking-wide text-slate-400' }, 'Yield'),
                    h('span', { key: 'value', className: 'block text-[11px] font-black tabular-nums text-cyan-100' }, rigTrajectory.recoverable + '/' + rigTrajectory.requestedDepth)
                  ]),
                  h('div', { key: 'ground', className: 'rounded-md border border-white/10 bg-black/20 px-1 py-1' }, [
                    h('span', { key: 'label', className: 'block text-[10px] font-black uppercase tracking-wide text-slate-400' }, 'Resistance'),
                    h('span', { key: 'value', className: 'block text-[11px] font-black capitalize text-violet-100' }, rigTrajectory.variability)
                  ]),
                  h('div', { key: 'risk', className: 'rounded-md border px-1 py-1 ' + rigRiskTone }, [
                    h('span', { key: 'label', className: 'block text-[10px] font-black uppercase tracking-wide opacity-75' }, 'Boundary'),
                    h('span', { key: 'value', className: 'block text-[11px] font-black capitalize' }, rigTrajectory.riskLevel)
                  ])
                ]),
                h('div', { key: 'mix', className: 'mt-1.5 flex flex-wrap gap-1', 'aria-label': 'Aggregate feed mix' },
                  ['preserve', 'cruise', 'torque'].map(function (modeId) {
                    return h('span', { key: modeId, 'data-geology-core-load-mix': modeId,
                      className: 'rounded-full border border-white/10 bg-black/25 px-1.5 py-0.5 text-[10px] font-bold text-slate-200' },
                      coreRigFeedProfile(modeId).label + ' ×' + rigTrajectory.loadCounts[modeId]);
                  })),
                h('p', { key: 'advice', className: 'mt-1 text-[10px] font-semibold leading-snug text-slate-300' }, rigTrajectory.advice),
                h('ul', { key: 'objectives', className: 'mt-1.5 grid gap-1', 'aria-label': 'Bore Brief objectives' },
                  rigBriefObjectives.map(function (objective) {
                    var objectiveIcon = objective.state === 'met' ? '✓' : (objective.state === 'missed' ? '×' : '○');
                    var objectiveTone = objective.state === 'met'
                      ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'
                      : (objective.state === 'missed' ? 'border-rose-300/35 bg-rose-400/10 text-rose-100' : 'border-white/10 bg-white/5 text-slate-200');
                    var objectiveProgress = objective.id === 'preservation'
                      ? objective.current + '% / ' + objective.target + '%'
                      : objective.current + '/' + objective.target;
                    return h('li', { key: objective.id, 'data-geology-core-objective': objective.id, 'data-state': objective.state,
                      className: 'flex items-center justify-between gap-2 rounded-md border px-1.5 py-1 text-[10px] font-bold ' + objectiveTone }, [
                      h('span', { key: 'label', className: 'min-w-0 truncate' }, [
                        h('span', { key: 'icon', className: 'mr-1', 'aria-hidden': 'true' }, objectiveIcon),
                        objective.label
                      ]),
                      h('span', { key: 'progress', className: 'shrink-0 tabular-nums opacity-85' }, objectiveProgress)
                    ]);
                  })),
                // Completion speech is owned by the existing global announcer; keep this semantic summary silent.
                rigBrief.finished ? h('p', { key: 'final',
                  'data-geology-core-brief-summary': rigBrief.metCount, className: 'sr-only' }, rigBrief.summary) : null
              ]) : null,
              !rigFinished ? h('section', { key: 'operator', 'data-geology-core-phase-surface': 'bore', 'data-geology-core-feed-control': 'true', 'data-geology-core-interval-scan': rigScanning ? 'active' : 'idle', className: 'mt-2 rounded-lg border p-1.5 transition-colors motion-reduce:transition-none ' + (rigScanning ? 'border-cyan-300/70 bg-gradient-to-r from-cyan-400/15 via-emerald-400/10 to-amber-400/15 shadow-[0_0_16px_rgba(34,211,238,.18)]' : 'border-cyan-300/20 bg-black/20'), 'aria-label': 'Adaptive core recovery controls' }, [
                h('p', { key: 'scan-live', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only', 'data-geology-core-formation-cue': 'true', 'data-state': rigFormationCue ? 'active' : 'idle' }, rigFormationCue ? rigFormationCue.prompt : ''),
                h('div', { key: 'formation', className: 'flex items-center justify-between gap-2 text-[11px] font-bold ' + (rigScanning ? 'text-white' : 'text-slate-300') }, [
                  h('span', { key: 'load', className: 'min-w-0 leading-snug' }, rigScanning ? ('◉ FORMATION SCAN · ' + (coreRigHud.formationLoad || 'reading')) : ('Formation · ' + (coreRigHud.formationLoad || 'trajectory scan'))),
                  h('span', { key: 'ideal', className: 'shrink-0 ' + (rigScanning ? 'text-amber-200' : 'text-cyan-200') }, coreRigHud.formationLoad ? ((rigScanning ? 'Select · ' : 'Best response · ') + coreRigFeedProfile(coreRigHud.idealFeedMode).label) : 'Choose a feed')
                ]),
                rigIntervalResult ? h('div', { key: 'interval-result', 'data-geology-core-interval-result': rigIntervalResult.tier, className: 'mt-1 flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[10px] font-extrabold ' + rigResultTone }, [
                  h('span', { key: 'quality', className: 'min-w-0 leading-snug' }, '◆ ' + rigIntervalResult.label.toUpperCase() + ' · ' + rigIntervalResult.name + ' · ' + rigIntervalResult.integrityPercent + '%'),
                  h('span', { key: 'streak', className: 'shrink-0' }, rigIntervalResult.tier === 'pristine' ? ('streak ' + rigIntervalResult.pristineStreak) : 'streak reset')
                ]) : null,
                h('div', { key: 'modes', className: 'mt-1 grid grid-cols-3 gap-1', role: 'group', 'aria-label': 'Drill feed mode' }, Object.keys(CORE_RIG_FEED_MODES).map(function (modeId) {
                  var modeProfile = coreRigFeedProfile(modeId), modeActive = rigFeed.id === modeId;
                  return h('button', { key: modeId, type: 'button', disabled: rigStage === 'deploying', 'data-geology-core-feed-mode': modeId, 'aria-pressed': modeActive ? 'true' : 'false', onClick: function () { coreRigAction('feed', modeId); }, className: 'min-h-11 rounded-md border px-1 text-[11px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ' + (modeActive ? 'border-cyan-300 bg-cyan-400/25 text-cyan-50 shadow-[0_0_10px_rgba(34,211,238,.2)]' : 'border-slate-600 bg-slate-900/70 text-slate-300 hover:border-cyan-500'), 'aria-label': modeProfile.label + ' feed, ' + Math.round(modeProfile.speedMultiplier * 100) + ' percent advance and ' + Math.round(modeProfile.heatMultiplier * 100) + ' percent heat load' }, modeProfile.label);
                })),
                h('button', { key: 'coolant', type: 'button', disabled: !rigRunning || rigStage === 'cooling' || Number(coreRigHud.coolantRemaining) <= 0 || rigHeat < 22, onClick: function () { coreRigAction('coolant'); }, className: 'mt-1 min-h-11 w-full rounded-md border border-sky-300/50 bg-sky-400/15 px-2 text-[11px] font-extrabold text-sky-100 transition hover:bg-sky-400/25 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-900/60 disabled:text-slate-500', 'data-geology-core-coolant': coreRigHud.coolantRemaining, 'aria-label': 'Release coolant pulse. ' + Number(coreRigHud.coolantRemaining || 0) + ' remaining' }, '❄ Coolant pulse · ' + Number(coreRigHud.coolantRemaining || 0) + ' remaining')
              ]) : null,
              rigFinished ? h('section', {
                key: 'debrief', 'data-geology-core-debrief': rigStage, 'data-geology-core-phase-surface': 'debrief',
                className: 'mt-2 rounded-xl border border-violet-300/40 bg-gradient-to-r from-violet-400/15 via-cyan-400/10 to-emerald-400/10 p-2',
                'aria-label': 'Core bore debrief'
              }, [
                h('div', { key: 'head', className: 'flex items-center justify-between gap-2' }, [
                  h('h4', {
                    key: 'label', tabIndex: -1, 'data-geology-core-debrief-heading': 'true',
                    className: 'scroll-mt-24 text-[11px] font-black uppercase tracking-[.14em] text-violet-100 focus:outline-none'
                  }, 'Core debrief'),
                  h('span', { key: 'stage', className: 'rounded-full border border-white/15 bg-slate-950/45 px-2 py-0.5 text-[10px] font-black text-cyan-100' }, stageLabel)
                ]),
                h('div', { key: 'metrics', className: 'mt-1.5 grid grid-cols-3 gap-1' }, [
                  h('div', { key: 'recovery', className: 'rounded-md border border-white/10 bg-slate-950/45 p-1.5 text-center' }, [
                    h('span', { key: 'value', className: 'block text-[12px] font-black tabular-nums text-white' }, rigSamples.length + '/' + Math.max(1, Number(coreRigHud.depth || coreRigDepth))),
                    h('span', { key: 'label', className: 'block text-[10px] font-bold text-slate-300' }, 'Recovered')
                  ]),
                  h('div', { key: 'integrity', className: 'rounded-md border border-white/10 bg-slate-950/45 p-1.5 text-center' }, [
                    h('span', { key: 'value', className: 'block text-[12px] font-black tabular-nums text-emerald-200' }, (rigEvaluation && rigEvaluation.integrityPercent != null ? rigEvaluation.integrityPercent : rigIntegrity) + '%'),
                    h('span', { key: 'label', className: 'block text-[10px] font-bold text-slate-300' }, 'Integrity')
                  ]),
                  h('div', { key: 'brief', className: 'rounded-md border border-white/10 bg-slate-950/45 p-1.5 text-center' }, [
                    h('span', { key: 'value', className: 'block text-[12px] font-black tabular-nums text-amber-200' }, (rigBrief ? rigBrief.metCount : 0) + '/3'),
                    h('span', { key: 'label', className: 'block text-[10px] font-bold text-slate-300' }, 'Bore Brief')
                  ])
                ])
              ]) : null,
              h('div', { key: 'meters', className: (rigFinished ? 'hidden ' : '') + 'mt-2 grid grid-cols-2 gap-2' }, [
                h('div', { key: 'progress' }, [
                  h('div', { key: 'labels', className: 'flex justify-between text-[11px] font-bold text-slate-300' }, [h('span', { key: 'a' }, 'Bore'), h('span', { key: 'b', 'data-geology-core-rig-progress-value': 'true' }, rigProgress + '%')]),
                  h('div', { key: 'track', className: 'mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/10', role: 'progressbar', 'aria-label': 'Core bore progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': rigProgress }, h('span', { 'data-geology-core-rig-progress': 'true', className: 'block h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-300 shadow-[0_0_8px_rgba(34,211,238,.8)] transition-[width,background-color] duration-200 motion-reduce:transition-none', style: { width: rigProgress + '%' } }))
                ]),
                h('div', { key: 'heat' }, [
                  h('div', { key: 'labels', className: 'flex justify-between text-[11px] font-bold text-slate-300' }, [h('span', { key: 'a' }, 'Head temp'), h('span', { key: 'b', 'data-geology-core-rig-heat-value': 'true' }, rigHeat + '%')]),
                  h('div', { key: 'track', className: 'mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/10', role: 'progressbar', 'aria-label': 'Core rig heat', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': rigHeat }, h('span', { 'data-geology-core-rig-heat': 'true', className: 'block h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.8)] transition-[width,background-color] duration-200 motion-reduce:transition-none', style: { width: rigHeat + '%' } }))
                ])
              ]),
              h('div', { key: 'integrity', 'data-geology-core-integrity': rigIntegrity, className: (rigFinished ? 'hidden ' : '') + 'mt-2' }, [
                h('div', { key: 'labels', className: 'flex justify-between gap-2 text-[11px] font-bold text-slate-300' }, [
                  h('span', { key: 'a' }, 'Live core integrity'),
                  h('span', { key: 'b', className: rigIntegrity >= 97 ? 'text-emerald-300' : (rigIntegrity >= 85 ? 'text-cyan-200' : 'text-amber-300') }, rigIntegrity + '% · pristine streak ' + Number(coreRigHud.pristineStreak || 0))
                ]),
                h('div', { key: 'track', className: 'mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/10', role: 'progressbar', 'aria-label': 'Current core interval integrity', 'aria-valuemin': 55, 'aria-valuemax': 100, 'aria-valuenow': rigIntegrity }, h('span', { className: 'block h-full rounded-full bg-gradient-to-r from-amber-400 via-cyan-300 to-emerald-300 transition-[width] duration-200 motion-reduce:transition-none', style: { width: rigIntegrity + '%' } }))
              ]),
              h('section', { key: 'core', 'data-geology-core-cassette': 'console', className: 'mt-2 rounded-lg border border-slate-600/80 bg-slate-950/65 p-1.5', 'aria-label': 'Core recovery cassette' }, [
                h('div', { key: 'head', className: 'mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wide text-slate-300' }, [
                  h('span', { key: 'label' }, rigFinished ? 'Surface barrel' : 'Core cassette'),
                  h('span', { key: 'count', className: 'tabular-nums text-cyan-200' }, rigCassette.revealedCount + '/' + rigCassette.total + ' recovered')
                ]),
                h('ol', { key: 'slots', className: 'flex min-h-10 gap-1 overflow-x-auto', 'aria-label': 'Requested core intervals' },
                  rigCassette.slots.map(function (cassetteSlot) {
                    var recoveredSlot = cassetteSlot.state === 'recovered';
                    var newestRecovery = recoveredSlot && rigRunning && rigIntervalResult && cassetteSlot.interval === rigCassette.revealedCount;
                    var slotTone = recoveredSlot
                      ? 'border-white/25 text-white'
                      : (cassetteSlot.state === 'scanning'
                      ? 'border-cyan-200 bg-cyan-400/20 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,.55)] animate-pulse motion-reduce:animate-none'
                      : (cassetteSlot.state === 'current'
                      ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                      : 'border-slate-700 bg-slate-900 text-slate-400'));
                    var slotLabel = recoveredSlot
                      ? ('Interval ' + cassetteSlot.interval + ': ' + cassetteSlot.name + ', ' + cassetteSlot.quality + (cassetteSlot.integrityPercent == null ? ', integrity not recorded' : (', ' + cassetteSlot.integrityPercent + ' percent integrity')))
                      : ('Interval ' + cassetteSlot.interval + ': ' + (cassetteSlot.state === 'scanning' ? 'formation scan in progress' : (cassetteSlot.state === 'current' ? 'current drill interval' : 'pending')));
                    return h('li', {
                      key: cassetteSlot.interval, 'data-state': cassetteSlot.state, 'aria-label': slotLabel,
                      className: 'flex min-h-10 min-w-9 list-none flex-col items-center justify-center overflow-hidden rounded-md border text-center transition motion-reduce:transition-none ' + slotTone +
                        (newestRecovery ? ' ring-1 ring-emerald-200/80 shadow-[0_0_14px_rgba(52,211,153,.65)]' : ''),
                      style: recoveredSlot ? { background: sampleColor(cassetteSlot.sample) } : undefined
                    }, [
                      h('span', { key: 'number', 'data-geology-core-interval-number': cassetteSlot.interval, className: recoveredSlot ? 'rounded-sm bg-slate-950/70 px-1 text-[10px] font-black tabular-nums shadow-sm' : 'text-[10px] font-black tabular-nums' }, '#' + String(cassetteSlot.interval)),
                      h('span', { key: 'quality', 'data-geology-core-quality-glyph': cassetteSlot.quality, className: (recoveredSlot ? 'rounded-sm bg-slate-950/70 px-1 shadow-sm ' : '') + 'text-[13px] font-black leading-none', 'aria-hidden': 'true' }, cassetteSlot.glyph)
                    ]);
                  }))
              ]),
              rigFinished && rigComparison ? h('section', {
                key: 'finding', 'data-geology-core-finding': rigComparison.findingLevel,
                className: 'mt-2', 'aria-label': 'Paired bore finding'
              }, [
                h('span', { key: 'label', className: 'sr-only' }, 'Finding'),
                coreRigCorrelationFigure(rigComparison, { key: 'figure', compact: true, forceDark: true })
              ]) : null,
              rigFinished && rigNextExperiment ? h('section', {
                key: 'next-experiment', 'data-geology-core-next-experiment': rigNextExperiment.programKey,
                className: 'mt-2 rounded-lg border border-violet-300/45 bg-gradient-to-r from-violet-400/15 to-cyan-400/10 p-2',
                'aria-label': 'Next controlled experiment'
              }, [
                h('h4', { key: 'label', className: 'text-[10px] font-black uppercase tracking-wide text-violet-200' }, 'Next experiment'),
                h('p', { key: 'question', className: 'mt-1 text-[11px] font-extrabold leading-snug text-white' }, rigNextExperiment.question),
                coreRigExperimentRail(rigNextExperiment, { key: 'variables', forceDark: true, currentAngleDegrees: coreRigAngleDegrees(coreRigHud.angle || coreRigAngle), currentDepth: coreRigHud.depth || coreRigDepth }),
                h('p', { key: 'control', className: 'mt-1 text-[10px] font-semibold text-slate-300' }, rigNextExperiment.controlLabel),
                h('button', {
                  key: 'load', type: 'button', onClick: function () { loadCoreRigProgram(rigNextExperiment.programKey, rigNextExperiment); },
                  className: 'mt-1.5 min-h-11 w-full rounded-md border border-violet-200/60 bg-violet-400/20 px-2 text-[11px] font-black text-violet-50 transition hover:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300',
                  'aria-label': 'Load next controlled experiment. ' + rigNextExperiment.question
                }, 'Load comparison · ' + rigNextExperiment.angleDegrees + '° / ' + rigNextExperiment.depth)
              ]) : null,
              h('p', { key: 'status', 'data-geology-core-rig-status': 'true', className: 'mt-2 text-[11px] font-semibold leading-snug text-cyan-100', title: coreRigHud.status }, coreRigHud.status || 'Trajectory ready'),
              h('div', {
                key: 'footer', 'data-geology-core-action-dock': rigPhaseKey,
                className: 'sticky bottom-0 z-20 -mx-2 mt-2 grid gap-2 border-t border-white/10 bg-slate-950/95 px-2 pt-2 backdrop-blur-md ' +
                  (rigFinished ? 'grid-cols-1' : 'grid-cols-2'),
                style: { paddingBottom: 'max(.5rem, env(safe-area-inset-bottom))' }
              }, [
                !rigFinished ? h('button', { key: 'start', type: 'button', disabled: rigLocked || rigStage !== 'preview' || !coreRigHud.plannedCount, onClick: function () { fpAction('rig-start'); }, className: 'min-h-11 rounded-md border border-amber-200 bg-amber-400 px-2 text-[11px] font-black text-amber-950 shadow-[0_0_12px_rgba(251,191,36,.25)] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-400', 'aria-label': rigRunning ? 'Core rig drilling in progress' : 'Start directional core bore' }, rigRunning ? (rigScanning ? 'Scanning…' : (rigStage === 'cooling' ? 'Cooling…' : 'Drilling…')) : (rigStage === 'deploying' ? 'Stabilizing…' : (rigStage === 'preview' ? 'Start bore' : 'Adjust trajectory'))) : null,
                h('button', { key: 'pack', type: 'button', disabled: rigStage === 'deploying', onClick: function () { fpAction(rigRunning ? 'rig-stop' : 'rig-pack'); }, className: 'min-h-11 rounded-md border border-slate-500 bg-slate-900 px-2 text-[11px] font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40', 'aria-label': rigRunning ? 'End the active bore and log recovered samples' : 'Pack and relocate directional core rig' }, rigRunning ? 'End bore' : (rigStage === 'complete' || rigStage === 'stopped' || rigStage === 'paused' ? 'Relocate' : 'Pack'))
              ])
            ])
          ]);
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
          h('div', { ref: containerRef, tabIndex: fpOn ? 0 : undefined, style: { height: isFs ? '100vh' : 'min(58vh, 460px)', minHeight: isFs ? 0 : (rigDeployed ? 400 : 320), background: '#060913', cursor: fpOn ? 'crosshair' : (excavate ? 'crosshair' : 'grab') }, className: fpOn ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-inset' : undefined, role: fpOn ? 'application' : 'img', 'aria-label': fpOn ? (rigDeployed ? 'Directional core rig control station. Choose a bore angle and depth, match Preserve, Cruise, or Torque feed to each formation, use limited coolant to protect integrity, and challenge previous scores. R ends an active bore or packs an idle rig, and H returns home.' : (fpWalkScene ? 'First-person geology mining explorer. W A S D or arrow keys walk, Space jumps, Shift sprints, I J K L or drag looks, 1 selects the pickaxe, 2 selects the powered drill, holding X drills continuously with a heat limit, R deploys the directional core rig, G surveys for the active specimen, click or tap digs one block, Enter digs instantly, Z undoes, Y redoes, and H returns. Escape exits.' : 'First-person Deep Earth flight. W A S D or arrow keys fly, Q and E move up and down, I J K L or drag looks, 1 selects the pickaxe, 2 selects the powered drill, holding X drills continuously with a heat limit, G surveys for the active specimen, click or tap excavates one block, Enter excavates instantly, Z undoes, Y redoes, and H returns. Escape exits.')) : 'Interactive 3D voxel model of ' + SCENE.label + '. Use the ' + (feat.crossSection ? 'cross-section' : '2D evidence map') + ' and material list below for an accessible alternative.' }),
          h('div', { className: 'absolute top-2 left-2 z-10 flex gap-1' },
            [['iso', '3D'], ['front', 'Front'], ['top', 'Top']].map(function (vw) {
              var activeView = cameraViewState === vw[0];
              return h('button', { key: vw[0], type: 'button', disabled: fpOn, 'aria-pressed': activeView ? 'true' : 'false', 'data-geology-camera-view': vw[0], onClick: function () { setCameraView(vw[0]); }, 'aria-label': 'Camera view: ' + vw[1], className: 'min-h-9 transition-colors active:scale-[0.97] text-[10px] font-bold px-2 py-1 rounded-md border ' + (fpOn ? 'opacity-40 cursor-not-allowed ' : '') + (activeView ? 'border-sky-500 bg-sky-700 text-white' : (isDark ? 'bg-slate-900/75 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-white')) }, vw[1]);
            }).concat([
              h('button', { key: 'fp', ref: fpToggleRef, type: 'button', 'aria-pressed': fpOn ? 'true' : 'false', 'aria-label': fpOn ? 'Exit first-person explorer' : (fpWalkScene ? 'Drop in and dig — grounded first-person explorer' : 'Fly through Deep Earth — first-person explorer'), onClick: function () { setFpOn(function (v) { return !v; }); }, className: 'transition-colors active:scale-[0.97] text-[10px] font-bold px-2 py-1 rounded-md border ' + (fpOn ? 'bg-emerald-500 border-emerald-400 text-emerald-950' : (isDark ? 'bg-slate-900/75 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-white')) }, fpOn ? ('🚪 ' + t('stem.geology.fp_exit', 'Exit')) : ((fpWalkScene ? '⛏️ ' : '🛰️ ') + t('stem.geology.fp_enter', fpWalkScene ? 'Drop in & dig' : 'Fly inside')))
            ])),
          (fpOn && !rigDeployed) ? h('div', { 'data-geology-first-person-mode': fpWalkScene ? 'mine' : 'fly', className: 'absolute left-2 top-12 z-10 rounded-full border px-2 py-1 text-[10px] font-extrabold ' + (fpWalkScene ? 'border-amber-300/70 bg-amber-950/80 text-amber-100' : 'border-sky-300/70 bg-sky-950/80 text-sky-100'), 'aria-hidden': 'true' }, (fpWalkScene ? '⛏ Mine mode' : '🛰 Deep Earth flight') + ' · ' + digCount + ' dug') : null,
          (fpOn && !rigDeployed) ? h('div', { 'data-geology-player-status': 'true', 'data-state': fpWalkScene ? 'grounded' : 'flight', className: 'pointer-events-none absolute left-2 top-20 z-10 rounded-full border border-emerald-300/60 bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-emerald-200 shadow-lg', 'aria-hidden': 'true' }, fpWalkScene ? 'Finding safe ground…' : 'Free flight') : null,
          fieldRunPanel(),
          coreRigConsole(),
          (fpOn && !rigDeployed) ? h('div', { 'data-geology-tool-selector': 'true', className: 'absolute right-14 top-2 z-10 rounded-lg border border-slate-500/60 bg-slate-950/85 p-1 shadow-lg', role: 'group', 'aria-label': 'Excavation tool' },
            h('div', { className: 'flex gap-1' },
              h('button', { type: 'button', 'data-geology-tool': 'pick', 'aria-pressed': fpTool === 'pick' ? 'true' : 'false', onClick: function () { fpAction('tool-pick'); }, className: 'min-h-8 rounded px-2 text-[10px] font-bold ' + (fpTool === 'pick' ? 'bg-amber-500 text-amber-950' : 'bg-slate-800 text-slate-200'), title: 'Select pickaxe (1)' }, '1 ⛏ Pick'),
              h('button', { type: 'button', 'data-geology-tool': 'drill', 'aria-pressed': fpTool === 'drill' ? 'true' : 'false', onClick: function () { fpAction('tool-drill'); }, className: 'min-h-8 rounded px-2 text-[10px] font-bold ' + (fpTool === 'drill' ? 'bg-sky-500 text-sky-950' : 'bg-slate-800 text-slate-200'), title: 'Select powered drill (2)' }, '2 ⚙ Drill')),
            fpTool === 'drill' ? h('div', { 'data-geology-drill-meter': 'true', 'data-overheated': 'false', 'data-active-tool': fpTool, className: 'mt-1 min-w-[126px]', 'aria-hidden': 'true' },
              h('div', { className: 'h-1.5 overflow-hidden rounded-full bg-slate-700' }, h('span', { 'data-geology-drill-heat': 'true', className: 'block h-full rounded-full bg-sky-400', style: { width: '0%' } })),
              h('div', { 'data-geology-drill-readout': 'true', className: 'mt-0.5 text-right text-[10px] font-bold text-sky-200' }, '0% heat')) : null) : null,
          h('button', { ref: fsToggleRef, type: 'button', 'data-geology-fullscreen-toggle': 'true', onClick: toggleFullscreen, title: isFs ? t('stem.geology.exit_fullscreen', 'Exit fullscreen') : t('stem.geology.fullscreen', 'Fullscreen'), 'aria-label': isFs ? 'Exit fullscreen 3D view' : 'Fullscreen 3D view', className: 'absolute top-2 right-2 z-10 min-h-11 min-w-11 transition-colors active:scale-[0.97] text-base leading-none px-2 py-1.5 rounded-lg border ' + (isDark ? 'bg-slate-900/80 border-slate-600 text-slate-100 hover:bg-slate-800' : 'bg-white/85 border-slate-300 text-slate-700 hover:bg-white') }, isFs ? '✕' : '⛶'),
          fpOn ? null : h('select', { value: res, 'aria-label': t('stem.geology.detail', 'Voxel detail level'), title: t('stem.geology.detail_tip', 'Higher detail = smaller, sharper voxels (heavier on weak devices)'), onChange: function (e) { var v = e.target.value; setRes(v); upd('res', v); setSlice(0); setExcavate(false); setDigCount(0); setRedoCount(0); }, className: 'absolute bottom-2 left-2 z-10 text-[10px] font-bold px-1.5 py-1 rounded-md border cursor-pointer ' + (isDark ? 'bg-slate-900/80 border-slate-600 text-slate-100' : 'bg-white/85 border-slate-300 text-slate-700') },
            h('option', { value: 'low' }, t('stem.geology.detail_low', 'Detail: Low')),
            h('option', { value: 'standard' }, t('stem.geology.detail_std', 'Detail: Standard')),
            h('option', { value: 'high' }, t('stem.geology.detail_high', 'Detail: High'))),
          // first-person touch pad: walk + jump on surface scenes, six-axis movement in Deep Earth
          (fpOn && !rigDeployed) ? h('div', { className: 'absolute bottom-2 left-2 z-10 grid gap-1', style: { gridTemplateColumns: 'repeat(3, auto)' }, role: 'group', 'aria-label': fpWalkScene ? 'First-person walk and jump controls' : 'First-person flight controls' },
            emptyCell('a'), padBtn('▲', 'fwd', 1, 'Move forward'), emptyCell('b'),
            padBtn('◀', 'strafe', -1, 'Move left'), padBtn('▼', 'fwd', -1, 'Move back'), padBtn('▶', 'strafe', 1, 'Move right'),
            fpWalkScene ? emptyCell('walk-a') : padBtn('⤒', 'vert', 1, 'Move up'),
            fpWalkScene ? padBtn('⇧', 'jump', 1, 'Jump') : emptyCell('c'),
            fpWalkScene ? emptyCell('walk-b') : padBtn('⤓', 'vert', -1, 'Move down')) : null,
          // on-screen key legend (visual; SR gets layer announcements via the live region)
          (fpOn && !rigDeployed) ? h('div', { className: 'absolute bottom-2 left-1/2 z-10 hidden max-w-[58%] -translate-x-1/2 rounded-md px-2 py-1 text-center text-[10px] sm:block ' + (isDark ? 'bg-slate-900/70 text-slate-300' : 'bg-white/80 text-slate-600'), 'aria-hidden': 'true' }, t('stem.geology.fp_keys', fpWalkScene ? 'WASD walk · 1 pick · 2 drill · hold X dig · R core rig · G survey · Z/Y undo/redo · H home' : 'WASD fly · 1 pick · 2 drill · hold X dig · G survey · Z/Y undo/redo · H home')) : null,
          (fpOn && !rigDeployed) ? h('div', { 'data-geology-mining-reticle': 'true', className: 'pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-white/55 bg-black/15 text-xl font-light leading-none text-white shadow-[0_1px_6px_rgba(0,0,0,.8)]', 'aria-hidden': 'true' }, '+') : null,
          (fpOn && !rigDeployed) ? h('div', { 'data-geology-mining-target': 'true', 'data-target-ready': 'false', 'data-target-key': '__none', className: 'pointer-events-none absolute left-1/2 top-1/2 z-10 mt-6 -translate-x-1/2 rounded-full border border-white/20 bg-slate-950/75 px-2.5 py-1 text-[10px] font-bold text-slate-100 shadow-lg', 'aria-hidden': 'true' }, 'Aim at an exposed block') : null,
          (fpOn && !rigDeployed) ? h('div', { 'data-geology-mining-progress-shell': 'true', 'data-active': 'false', className: 'pointer-events-none absolute left-1/2 top-1/2 z-10 mt-14 h-1.5 w-28 -translate-x-1/2 overflow-hidden rounded-full border border-white/20 bg-slate-950/70 opacity-40 data-[active=true]:opacity-100', 'aria-hidden': 'true' },
            h('span', { 'data-geology-mining-progress': 'true', className: 'block h-full rounded-full bg-amber-400', style: { width: '0%' } })) : null,
          fpOn ? h('div', { className: 'absolute right-2 top-14 z-10 flex flex-col gap-1', role: 'group', 'aria-label': rigDeployed ? 'Core rig actions' : 'Mining actions' },
            !rigDeployed ? h('button', { type: 'button',
              onPointerDown: function (e) { if (fpTool !== 'drill') return; fpDrillPointerRef.current = true; try { e.preventDefault(); } catch (x) {} fpAction('mine-start'); },
              onPointerUp: function () { if (fpTool === 'drill') fpAction('mine-stop'); },
              onPointerCancel: function () { fpDrillPointerRef.current = false; if (fpTool === 'drill') fpAction('mine-stop'); },
              onPointerLeave: function () { fpDrillPointerRef.current = false; if (fpTool === 'drill') fpAction('mine-stop'); },
              onClick: function () { if (fpTool === 'drill' && fpDrillPointerRef.current) { fpDrillPointerRef.current = false; return; } fpAction('mine'); },
              className: 'min-h-10 min-w-10 rounded-lg border px-2 text-sm shadow-lg ' + (fpTool === 'drill' ? 'border-sky-300/60 bg-sky-950/85 text-sky-100' : 'border-amber-300/50 bg-amber-950/85 text-amber-100'),
              'aria-label': fpTool === 'drill' ? 'Hold to drill continuously' : 'Dig targeted block', title: fpTool === 'drill' ? 'Hold to drill continuously (X)' : 'Dig targeted block (X; Enter is instant)' }, fpTool === 'drill' ? '⚙' : '⛏') : null,
            !rigDeployed ? h('button', { type: 'button', disabled: digCount <= 0, onClick: function () { fpAction('undo'); }, className: 'min-h-10 min-w-10 rounded-lg border border-slate-400/40 bg-slate-950/80 px-2 text-sm text-slate-100 shadow-lg disabled:opacity-40', 'aria-label': 'Undo last excavation', title: 'Undo last excavation (Z)' }, '↶') : null,
            !rigDeployed ? h('button', { type: 'button', disabled: redoCount <= 0, onClick: function () { fpAction('redo'); }, className: 'min-h-10 min-w-10 rounded-lg border border-slate-400/40 bg-slate-950/80 px-2 text-sm text-slate-100 shadow-lg disabled:opacity-40', 'aria-label': 'Redo last excavation', title: 'Redo last excavation (Y)' }, '↷') : null,
            fpWalkScene ? h('button', { type: 'button', 'data-geology-core-rig-toggle': 'true', disabled: !!(rigDeployed && (coreRigHud.running || coreRigHud.stage === 'deploying')), 'aria-pressed': rigDeployed ? 'true' : 'false', onClick: function () { fpAction('rig-toggle'); }, className: 'min-h-10 min-w-10 rounded-lg border border-amber-300/60 bg-gradient-to-br from-amber-950/90 to-cyan-950/90 px-2 text-sm text-amber-100 shadow-[0_0_14px_rgba(34,211,238,.18)] disabled:cursor-not-allowed disabled:opacity-45', 'aria-label': rigDeployed ? 'Pack directional core rig' : 'Deploy directional core rig', title: rigDeployed ? 'Pack directional core rig (R)' : 'Deploy directional core rig (R)' }, '🏗') : null,
            h('button', { type: 'button', disabled: !!(rigDeployed && coreRigHud.running), onClick: function () { fpAction('home'); }, className: 'min-h-10 min-w-10 rounded-lg border border-sky-300/40 bg-sky-950/80 px-2 text-sm text-sky-100 shadow-lg disabled:cursor-not-allowed disabled:opacity-45', 'aria-label': 'Return to starting point', title: 'Return to starting point (H)' }, '⌂')) : null,
          // live "you are here" science HUD (announced separately via the polite live region)
          (fpOn && fpHud && !rigDeployed) ? h('div', { className: 'absolute bottom-2 right-2 z-10 max-w-[220px] p-2.5 rounded-xl border ' + (isDark ? 'bg-slate-900/85 border-slate-600 text-slate-100' : 'bg-white/90 border-slate-300 text-slate-800'), role: 'status', 'aria-hidden': 'true' },
            h('div', { className: 'text-[12px] font-extrabold' }, '📍 ' + fpHud.layerName),
            fpHud.type ? h('span', { className: 'inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 mb-1', style: { color: (TYPE_COLOR[fpHud.type] || '#64748b'), background: (TYPE_COLOR[fpHud.type] || '#64748b') + '22' } }, fpHud.type) : null,
            h('div', { className: 'grid gap-0.5 text-[11px]', style: { gridTemplateColumns: 'auto minmax(0, 1fr)' } },
              measurementGridNodes(fpHud.measurements && fpHud.measurements.length ? fpHud.measurements : [depthMeasurement(fpHud, 'Depth'), temperatureMeasurement(fpHud), pressureMeasurement(fpHud)], 'fp-'),
              (fpHud.state && fpHud.state !== 'solid') ? h('span', { key: 'fp-state-label', className: muted }, t('stem.geology.state', 'State')) : null,
              (fpHud.state && fpHud.state !== 'solid') ? h('span', { key: 'fp-state-value', className: 'font-semibold', style: { color: '#f59e0b' } }, fpHud.state) : null),
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

      return h('div', { className: 'space-y-3 animate-in fade-in duration-200', 'data-geology-tool': 'true', 'data-geology-theme': isContrast ? 'contrast' : (isDark ? 'dark' : 'light'), style: isContrast ? { background: '#000000', color: '#ffffff', padding: '2px' }
        // ★isDark needs a ground too: in dark theme the HOST wraps every tool in a
        // WHITE card (stem_lab_module.js ~1633) while this tool's dark branch paints
        // translucent slate panels and -300/-400 inks that assume a dark substrate.
        // Over white the alphas composited to #626976 with #94a3b8 on top: 2.15:1
        // across 31 nodes. Give the dark branch the canvas its palette was mixed for.
        : isDark ? { background: '#0f172a', borderRadius: 12, padding: 10 } : null },
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
          h('button', { type: 'button', 'aria-pressed': lessonGuideOpen ? 'true' : 'false', onClick: function () { var next = !lessonGuideOpen; setLessonGuideOpen(next); upd('lessonGuide', next); }, className: 'rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ' + (lessonGuideOpen ? 'border-sky-600 bg-sky-700 text-white' : btnIdle) }, lessonGuideOpen ? t('stem.geology.lesson_hide', 'Hide lesson guide') : t('stem.geology.lesson_open', 'Lesson guide'))),
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
              onClick: function () { switchScene(sid); },
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
            formationTimelinePanel(),
            sceneBeaconPanel(),
            processCuePanel(),
            // controls
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('label', { className: 'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ' + ink },
                h('span', { className: muted }, t('stem.geology.cutaway', 'Cutaway')),
                h('input', { type: 'range', min: 0, max: NZ - 1, value: cutaway.step, disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, 'aria-label': 'Cutaway from front', 'aria-valuetext': cutaway.label, title: 'Remove front sections to inspect structures inside the block', onChange: function (e) { var v = +e.target.value; setSlice(v); if (window[ENGINE_KEY]) window[ENGINE_KEY].setSlice(v); } }),
                h('span', { 'data-geology-cutaway-readout': 'true', 'aria-hidden': 'true', className: 'min-w-[7rem] text-[11px] font-semibold tabular-nums ' + muted }, cutaway.label)),
              inInvestigation && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError || focusLensOn, title: focusLensOn ? 'Turn off the Focus lens before excavating hidden layers' : 'Click a top block to remove it and expose the material below', onClick: function () { if (focusLensOn) return; var nv = !excavate; setExcavate(nv); if (window[ENGINE_KEY]) window[ENGINE_KEY].setExcavate(nv); }, 'aria-pressed': excavate ? 'true' : 'false', className: btn + (excavate ? 'bg-amber-500 border-amber-400 text-amber-950' : btnIdle) }, '⛏️ ' + t('stem.geology.excavate', 'Excavate') + ': ' + (excavate ? t('stem.on', 'ON') : t('stem.off', 'OFF'))),
              inInvestigation && digCount > 0 && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError || focusLensOn, 'data-geology-undo-excavation': 'true', 'data-geology-undo-preview-control': 'true', 'aria-label': 'Undo last excavation. ' + digCount + (digCount === 1 ? ' block removed.' : ' blocks removed.'), title: focusLensOn ? 'Turn off the Focus lens to restore the last block' : 'Hover or focus to preview the block; activate to restore it', onMouseEnter: function () { setUndoPreviewIntent('hover', true); }, onMouseLeave: function () { setUndoPreviewIntent('hover', false); }, onFocus: function () { setUndoPreviewIntent('focus', true); }, onBlur: function () { setUndoPreviewIntent('focus', false); }, onClick: undoLastExcavation, className: btn + (isDark ? 'border-amber-500/70 bg-amber-950/40 text-amber-100 hover:bg-amber-900/60' : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100') }, '↶ Undo dig (' + digCount + ')'),
              inInvestigation && redoCount > 0 && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError || focusLensOn, 'data-geology-redo-excavation': 'true', 'aria-label': 'Redo last excavation. ' + redoCount + (redoCount === 1 ? ' block available.' : ' blocks available.'), title: 'Reapply the most recently undone excavation', onClick: redoLastExcavation, className: btn + (isDark ? 'border-sky-500/70 bg-sky-950/40 text-sky-100 hover:bg-sky-900/60' : 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100') }, '↷ Redo dig (' + redoCount + ')'),
              h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { setSlice(0); setExcavate(false); setDigCount(0); setRedoCount(0); setFocusLensOn(false); if (window[ENGINE_KEY]) { window[ENGINE_KEY].reset(); window[ENGINE_KEY].setExcavate(false); if (window[ENGINE_KEY].setFocusLens) window[ENGINE_KEY].setFocusLens(false); } }, className: btn + btnIdle }, '↺ ' + t('stem.geology.reset', 'Reset')),
              inInvestigation && feat.history && h('button', { type: 'button', disabled: eruptStage >= 0, onClick: function () { if (histStage >= 0) { stopHistory(); } else { playHistory(); } }, 'aria-pressed': histStage >= 0 ? 'true' : 'false', title: t('stem.geology.play_history_tip', 'Watch the cross-section build in the order it formed'), className: btn + (histStage >= 0 ? 'bg-violet-600 border-violet-700 text-violet-50' : btnIdle) }, histStage >= 0 ? '■ ' + t('stem.geology.stop', 'Stop') : '▶ ' + t('stem.geology.play_history', 'Play history')),
              inInvestigation && feat.water && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0, onClick: function () { var nv = !waterOn; setWaterOn(nv); if (window[ENGINE_KEY]) window[ENGINE_KEY].setWaterTable(nv); if (nv) announce('Water table on. Rain soaks through permeable rock like sandstone and is trapped by the impermeable shale; the water table is the top of the saturated zone. Use the cutaway or read the cross-section to see it.'); }, 'aria-pressed': waterOn ? 'true' : 'false', title: t('stem.geology.water_tip', 'Show the water table and which layers hold groundwater'), className: btn + (waterOn ? 'bg-blue-700 border-blue-800 text-blue-50' : btnIdle) }, '💧 ' + t('stem.geology.water', 'Water table') + ': ' + (waterOn ? t('stem.on', 'ON') : t('stem.off', 'OFF'))),
              inInvestigation && feat.volcano && h('button', { type: 'button', disabled: histStage >= 0 || eruptStage >= 0 || !threeReady || webglError, onClick: function () { playEruption(); }, title: t('stem.geology.erupt_tip', 'Watch a volcano erupt — magma reaches the surface and cools fast into basalt'), className: btn + (eruptStage >= 0 ? 'bg-orange-700 border-orange-800 text-orange-50' : btnIdle) }, eruptStage >= 0 ? '🌋 ' + t('stem.geology.erupting_short', 'Erupting…') : '🌋 ' + t('stem.geology.erupt', 'Erupt')),
              h('span', { className: 'text-[11px] ' + muted }, threeReady && !webglError ? (focusLensOn ? 'Focus lens isolates one material · turn it off to excavate' : (excavate ? 'Click a top block to dig · Undo restores it' : t('stem.geology.tip', 'Drag to orbit · click a block to identify'))) : '')),
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
                  sceneSchematicPanel(),
                  h('details', { className: 'rounded-xl border p-3 ' + cardBg },
                    h('summary', { className: 'cursor-pointer text-[11px] font-bold ' + ink }, t('stem.geology.context_summary', 'Read the science context')),
                    h('p', { className: 'mt-2 text-[11px] leading-relaxed ' + ink }, t('stem.geology.scene.' + SCENE.id + '.context', SCENE.blurb)),
                    h('p', { className: 'mt-2 text-[10.5px] font-semibold ' + muted }, 'Schematic model — not to scale. Colors are illustrative.'))),
            SCENE.id !== 'crust' ? sceneSignalPanel() : null,
            inInvestigation ? sceneSequencePanel() : null,
            h('div', { className: 'text-[11px] font-bold ' + muted }, (feat.crossSection || SCENE.id === 'collision') ? t('stem.geology.rocks', 'Rock types') : (SCENE.id === 'geode' ? t('stem.geology.minerals', 'Minerals') : t('stem.geology.layers', 'Layers'))),
            strataList(),
            fieldJournalPanel(),
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
