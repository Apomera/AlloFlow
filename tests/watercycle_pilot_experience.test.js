import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];
const WATER_CYCLE_SOURCES = new Map(
  WATER_CYCLE_PATHS.map((filePath) => [filePath, readFileSync(filePath, 'utf8')]),
);

describe.each(WATER_CYCLE_PATHS)('Be the Water experience layer (%s)', (filePath) => {
  const source = WATER_CYCLE_SOURCES.get(filePath);

  it('pauses behind a concise guided launch and offers two meaningful entry views', () => {
    expect(source).toContain("var onboardingComplete = pilotStored.onboardingComplete === true;");
    expect(source).toContain('var effectivePaused = paused || !onboardingComplete;');
    expect(source).toContain('el._wcPilotInput.paused = effectivePaused;');
    expect(source).toContain('tabIndex: onboardingComplete ? 0 : -1');
    expect(source).toContain("className: 'wc-pilot-launch', role: 'region'");
    expect(source).toContain('Explore freely, but follow real science: heat, humidity, altitude, particles, gravity, and the surface below you determine what happens next.');
    expect(source).toContain("beginPilot('follow')");
    expect(source).toContain("beginPilot('water')");
    expect(source).toContain("setPilot({ onboardingComplete: true, cameraMode: safeMode, paused: false });");
  });

  it('describes the experience by function rather than marketing rank', () => {
    expect(source).toContain("experienceType: 'piloted3d'");
    expect(source).toContain("t('stem.watercycle.mode_3d_simulation', '3D SIMULATION')");
    expect(source).toContain("t('stem.watercycle.pilot_interactive_3d_simulation', 'Interactive 3D water-cycle simulation')");
    expect(source).toContain('Pilot one parcel through changing states and pathways');
    expect(source).not.toMatch(/flagship/i);
  });

  it('lets learners switch between a phase-visible follow camera and a parcel-level water camera', () => {
    expect(source).toContain("cameraMode: 'follow'");
    expect(source).toContain("var waterView = input.cameraMode === 'water';");
    expect(source).toContain('parcel.visible = !waterView;');
    expect(source).toContain("canvasEl.dataset.pilotCamera = waterView ? 'water' : 'follow';");
    expect(source).toContain("'data-camera-mode': cameraMode");
    expect(source).toContain("t('stem.watercycle.pilot_follow_view', 'Follow view')");
    expect(source).toContain("t('stem.watercycle.pilot_water_view', 'Water view')");
    expect(source).toContain('cameraGoal.set(px, eyeY, pz);');
    expect(source).toContain('camera.lookAt(');
  });

  it('recovers from a lost WebGL context without erasing journey progress', () => {
    expect(source).toContain("canvasEl.addEventListener('webglcontextlost', onPilotContextLost, false);");
    expect(source).toContain("canvasEl.removeEventListener('webglcontextlost', onPilotContextLost, false);");
    expect(source).toContain("canvasEl.dataset.engineState = 'context-lost';");
    expect(source).toContain("upd('pilotError', { kind: 'context-lost', message: contextMessage });");
    expect(source).toContain('Your journey progress is saved; retry the view or continue in the System Map.');
    expect(source).toContain("t('stem.watercycle.pilot_retry_3d_view', 'Retry 3D view')");
    expect(source).toContain('onClick: retryPilot3d');
    expect(source).toContain("className: 'wc-pilot-fallback-actions'");
    const retryStart = source.indexOf('function retryPilot3d()');
    const retryEnd = source.indexOf('function chooseCameraMode(nextMode)', retryStart);
    const retryBlock = source.slice(retryStart, retryEnd);
    expect(retryBlock).toContain("upd('pilotError', null);");
    expect(retryBlock).not.toContain('snapshot: null');
    expect(retryBlock).not.toContain('stagesSeen');
  });

  it('connects the last change, current state, and next goal without live-region noise', () => {
    expect(source).toContain("className: 'wc-pilot-journey-guide'");
    expect(source).toContain("'aria-labelledby': 'wcPilotJourneyGuideTitle'");
    expect(source).toContain("className: 'wc-pilot-journey-steps'");
    expect(source).toContain("transitionMeta.from + ' ' + String.fromCharCode(8594) + ' ' + transitionMeta.to");
    expect(source).toContain("'aria-current': 'step'");
    expect(source).toMatch(/activeLandPathway\s*\?\s*activeLandPathway\.label/);
    const guideStart = source.indexOf("className: 'wc-pilot-journey-guide'");
    const transitionStart = source.indexOf("className: 'wc-pilot-transition'", guideStart);
    const guideBlock = source.slice(guideStart, transitionStart);
    expect(guideBlock.match(/aria-live/g) || []).toHaveLength(1);
    expect(guideBlock).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(source).not.toContain("className: 'wc-pilot-objective'");
    expect(source).toContain('Follow the Next goal panel at the top right of the scene.');
    expect(source).toContain('Watch Next goal, the phase badge, and the meters explain every transformation.');
    expect(source).not.toContain('Do this next');
  });

  it('turns landing terrain into explicit, model-backed pathway choices', () => {
    expect(source).toContain("'LAKE - COLLECTION'");
    expect(source).toContain("'STREAM - COLLECTION'");
    expect(source).toContain('targetLabel.scale.set(25, 4.7, 1);');
    expect(source).toContain("'FOREST - PLANT UPTAKE'");
    expect(source).toContain("'SOIL - INFILTRATION'");
    expect(source).toContain("'HARDPAN - RUNOFF'");
    expect(source).toContain('landingLabels.visible = WCPK.isFalling(f) && sim.altitudeM < 1700;');
    expect(source).toContain('surface: currentSurface');
    expect(source).toContain("permeable: { label: t('stem.watercycle.pilot_surface_soil'");
    expect(source).toContain("plant: { label: t('stem.watercycle.pilot_surface_plant'");
    expect(source).toContain("hard: { label: t('stem.watercycle.pilot_surface_hard'");
    expect(source).toContain('if (lake.visible && lakeDx * lakeDx + lakeDz * lakeDz < 34 * 34)');
  });

  it('surrounds each water state with performant, scientifically honest environmental feedback', () => {
    const frameIndex = source.indexOf('function frame(now)');
    expect(source.indexOf('var HEAT_GLINT_COUNT = 42;')).toBeLessThan(frameIndex);
    expect(source.indexOf('var RAIN_STREAK_COUNT = 84;')).toBeLessThan(frameIndex);
    expect(source.indexOf('var SNOW_CRYSTAL_COUNT = 76;')).toBeLessThan(frameIndex);
    expect(source).toContain('The warm glints represent ENERGY entering the');
    expect(source).toContain("'heat-energy-shimmer-vapour-invisible'");
    expect(source).toContain('var rainField = new THREE.LineSegments');
    expect(source).toContain('var snowField = new THREE.Points');
    expect(source).toContain("? 'rain-streaks' : showingSnow ? 'snow-crystals' : 'hidden'");
    expect(source).toContain("var cloudImmersion = waterView && (f === 'droplet' || f === 'cloud' || f === 'ice');");
    expect(source).toContain('var fogFarGoal = cloudImmersion ? 145 : 2300;');
    expect(source).toContain('freeDrops.material.size = waterView ? 1.45 : 3.1;');
    expect(source).toContain('shoreFoam.children.forEach(function(line, foamIndex)');
    expect(source).toContain('var snowPhase = motionReduced');
  });

  it('makes phase changes visible through a schematic intact-H2O molecular lens', () => {
    const frameIndex = source.indexOf('function frame(now)');
    expect(source.indexOf('var MOLECULE_COUNT = 18;')).toBeLessThan(frameIndex);
    expect(source).toContain('var WATER_BOND_ANGLE_RAD = 104.5 * Math.PI / 180;');
    expect(source).toContain('var molecularOxygenField = new THREE.InstancedMesh');
    expect(source).toContain('var molecularHydrogenAField = new THREE.InstancedMesh');
    expect(source).toContain('var molecularHydrogenBField = new THREE.InstancedMesh');
    expect(source).toContain('var molecularBonds = new THREE.LineSegments');
    expect(source).toContain('function molecularPhaseForForm(formName)');
    expect(source).toContain("if (formName === 'vapor') return 'gas';");
    expect(source).toContain("var molecularModel = snap.form === 'vapor'");
    expect(source).toContain("if (formName === 'ice' || formName === 'snow') return 'solid';");
    expect(source).toContain('var moleculeTime = motionReduced ? 0 : visualTime;');
    expect(source).toContain('updateMolecularLens(f, waterView, t);');
    expect(source).toContain("? 'gas-far-apart' : molecularPhase === 'solid'");
    expect(source).toContain("? 'solid-open-lattice' : 'liquid-close-disordered';");
    expect(source).toContain("canvasEl.dataset.molecularLens = 'schematic-h2o-not-to-scale';");

    expect(source).toContain("className: 'wc-pilot-micro'");
    expect(source).toContain("'Molecular lens - schematic H2O'");
    expect(source).toContain('every particle remains H2O; {arrangement}.');
    expect(source).toContain("'Liquid - close together, sliding'");
    expect(source).toContain("'Gas - far apart, moving freely'");
    expect(source).toContain("'Solid - open lattice, vibrating'");
  });

  it('shows latent energy moving inward or outward only during phase changes', () => {
    const frameIndex = source.indexOf('function frame(now)');
    expect(source.indexOf('var LATENT_ENERGY_COUNT = 56;')).toBeLessThan(frameIndex);
    expect(source).toContain('function beginLatentEnergyCue(fromForm, toForm)');
    expect(source).toContain('latentEnergyKind = WCPK.energyTransfer(fromForm, toForm);');
    expect(source).toContain('function updateLatentEnergyCue(dt, visualTime)');
    expect(source).toContain('var latentMotionProgress = motionReduced ? 0.48');
    expect(source).toContain("? 'absorbed-inward-to-water' : 'released-outward-to-air';");
    expect(source).toContain("canvasEl.dataset.latentEnergyTransfer = 'none-no-phase-change';");
    expect(source).toContain('beginLatentEnergyCue(previousForm, sim.form);');
    expect(source).toContain('updateLatentEnergyCue(dt, t);');

    expect(source).toContain('var energyDirection = WCPK.energyTransfer(change.from, change.to);');
    expect(source).toContain("'Energy absorbed by water'");
    expect(source).toContain("'Energy released to surrounding air'");
    expect(source).toContain("'No phase change - no latent heat transfer in this step'");
    expect(source).toContain("className: 'wc-pilot-transition-energy'");
    expect(source).toContain("'data-energy': transitionMeta.energyDirection");
  });

  it('builds a legible coast-to-watershed world instead of a flat generic stage', () => {
    expect(source).toContain('var coastalShelf = new THREE.Mesh');
    expect(source).toContain('var wetSand = new THREE.Mesh');
    expect(source).toContain('var COAST_OUTLINE = [');
    expect(source).toContain('new THREE.ShapeGeometry(outlineShape(COAST_OUTLINE, 1.12, 1.16), 12)');
    expect(source).toContain("new THREE.CatmullRomCurve3(outlineVectors, true, 'centripetal', 0.42)");
    expect(source).toContain('function sculptedLandGeometry(points, bottomY, topY, scaleX, scaleZ)');
    expect(source).toContain('var landGeometry = new THREE.ExtrudeGeometry');
    expect(source).toContain('function makeTerrainTexture(seed, repeatX, repeatY)');
    expect(source).toContain('var shoreSampleCount = COAST_OUTLINE.length * 5;');
    expect(source).toContain('var STREAM_PATH_POINTS = [');
    expect(source).toContain('flattenStreamTube(new THREE.TubeGeometry(streamCurve, 96, 2.75, 8, false), 0.12)');
    expect(source).toContain('var rockField = new THREE.InstancedMesh');
    expect(source).toContain('var reedField = new THREE.InstancedMesh');
    expect(source).toContain('streamGroup.visible = !isDesert;');
    expect(source).toContain('streamIce.visible = isWinter && !isDesert;');
    expect(source).toContain('function streamUnder(x, z)');
    expect(source).toContain('if (streamUnder(x, z)) return \'water\';');
    expect(source).toContain('if (pointInOutline(x, z, HARDPAN_OUTLINE)) return \'hard\';');
    expect(source).toContain('|| pointInOutline(x, z, COAST_OUTLINE)) return \'permeable\';');
    expect(source).toContain("? 'lake-stream-ocean' : 'dry-basin'");
    expect(source).toContain("canvasEl.dataset.terrainProfile = 'sculpted-irregular-textured';");
    expect(source).toContain("canvasEl.dataset.shorelineModel = 'outline-aligned';");
    expect(source).toContain('Collection - join a stream, lake, or the ocean');
  });

  it('renders one continuous, climate-responsive catchment with an efficient layered forest', () => {
    const frameIndex = source.indexOf('function frame(now)');
    expect(source.indexOf('function makeWatershedRidgeGeometry(')).toBeLessThan(frameIndex);
    expect(source.indexOf('var ridgeSurface = new THREE.Mesh(')).toBeLessThan(frameIndex);
    expect(source.indexOf('var ridgeBackdrop = new THREE.Mesh(')).toBeLessThan(frameIndex);
    expect(source).toContain("canvasEl.dataset.landformRendering = 'continuous-heightfield-watershed';");
    expect(source).toContain('function paintWatershedRidge(isDesert, isWinter)');
    expect(source).toContain('var snowLineVariation = 0.46 + (ridgeLightFactor - 0.5) * 0.11;');
    expect(source).toContain("canvasEl.dataset.ridgeBiome = isWinter ? 'snowline-storage'");

    expect(source).toContain('var TREE_COUNT = 68;');
    expect(source).toContain('var trunkField = new THREE.InstancedMesh');
    expect(source).toContain('var lowerCanopyField = new THREE.InstancedMesh');
    expect(source).toContain('var upperCanopyField = new THREE.InstancedMesh');
    expect(source).toContain('var treeSnowField = new THREE.InstancedMesh');
    expect(source).toContain('function updateForestBiome(isDesert, isWinter)');
    expect(source).toContain('treeSnowField.visible = isWinter && !isDesert;');
    expect(source).toContain("canvasEl.dataset.forestRendering = 'instanced-layered-canopy';");

    expect(source).toContain('scene.fog.color.setHex(isDesert ? 0xe1c99e');
    expect(source).toContain("var landscapeDescription = scenarioId === 'mountainWinter'");
    expect(source).toContain('A snow-covered mountain catchment stores water above a connected stream, lake, and ocean.');
    expect(source).toContain('A forested mountain catchment drains through a visible stream and lake to the ocean.');
  });

  it('visualizes water flow, wind advection, depth and cloud volume with pooled effects', () => {
    const frameIndex = source.indexOf('function frame(now)');
    expect(source.indexOf('var WATER_GLINT_COUNT = 124;')).toBeLessThan(frameIndex);
    expect(source.indexOf('var STREAM_FLOW_COUNT = 28;')).toBeLessThan(frameIndex);
    expect(source.indexOf('var WIND_STREAK_COUNT = 54;')).toBeLessThan(frameIndex);
    expect(source.indexOf('var cloudShadow = new THREE.Mesh')).toBeLessThan(frameIndex);
    expect(source.indexOf('var cloudVeil = new THREE.Group();')).toBeLessThan(frameIndex);
    expect(source).toContain("canvasEl.dataset.waterSurface = 'depth-layer-glints-foam';");
    expect(source).toContain("canvasEl.dataset.windVisual = showingWind ? 'advection-inland' : 'hidden';");
    expect(source).toContain("canvasEl.dataset.cloudShadow = showingCloudShadow ? 'projected' : 'hidden';");
    expect(source).toContain("cloudVeil.visible = waterView && (f === 'droplet' || f === 'cloud' || f === 'ice');");
    expect(source).toContain('var waterGlintT = motionReduced ? 0 : t;');
    expect(source).toContain('var windPhase = motionReduced');
    expect(source).toContain('var streamU = motionReduced');
  });

  it('keeps surface location and wind context visible and available as text', () => {
    expect(source).toContain("canvasEl.dataset.pilotWindMs = String(env.windMs);");
    expect(source).toContain("className: 'wc-pilot-place'");
    expect(source).toContain("t('stem.watercycle.pilot_over_surface', 'Over {surface}')");
    expect(source).toContain("t('stem.watercycle.pilot_wind_inland', 'Wind {speed} m/s → inland')");
    expect(source).toContain('Wind carries airborne water inland at {speed} metres per second.');
  });

  it('reserves separate, non-colliding zones for the phone HUD and controls', () => {
    expect(source).toContain('.wc-pilot-canvas{height:520px;min-height:520px}');
    expect(source).toContain('.wc-pilot-hud-left{top:54px;right:8px;left:8px');
    expect(source).toContain('.wc-pilot-hud-left .wc-pilot-readouts{grid-column:2;grid-row:1}');
    expect(source).toContain('.wc-pilot-hud-left .wc-pilot-place{grid-column:1/-1;grid-row:3}');
    expect(source).toContain('.wc-pilot-camera-switch{top:8px;right:8px;left:8px');
    expect(source).toContain('.wc-pilot-route{top:200px;right:8px');
  });

  it('keeps live WebGL overlays crisp and the camera loop allocation-free', () => {
    expect(source).not.toMatch(/\.wc-pilot-(?:hud|pad|camera-switch|route)\{[^}]*backdrop-filter/);
    expect(source).toContain('background:rgba(3,18,31,.92);color:#e0f2fe');
    expect(source).toContain('background:rgba(3,18,31,.94)');
    expect(source).toContain('var cameraGoal = new THREE.Vector3();');
    expect(source).toContain('cameraGoal.set(px, eyeY, pz);');
    expect(source).not.toContain('var eyeGoal = new THREE.Vector3');
    expect(source).not.toContain('var camGoal = new THREE.Vector3');
  });

  it('keeps the progress HUD aligned with the current form', () => {
    expect(source).toContain(": snap.form === 'droplet'");
    expect(source).toContain("(snap.form === 'rain' || snap.form === 'snow')");
    expect(source).toContain("t('stem.watercycle.pilot_descent_to_surface', 'Descent to surface')");
    expect(source).toContain("t('stem.watercycle.pilot_gravity_steer_pathway', 'Gravity is pulling you down — steer toward a pathway')");
    expect(source).toContain("t('stem.watercycle.pilot_current_pathway', 'Current pathway')");
  });

  it('unifies climate setup, live instruments, controls, and the notebook visually', () => {
    expect(source).toContain("'data-scenario': id");
    expect(source).toContain("className: 'wc-pilot-scenario-scene'");
    expect(source).toContain("className: 'wc-pilot-scenario-copy'");
    expect(source).toContain("className: 'wc-pilot-scenario-selected'");
    expect(source).toContain("t('stem.watercycle.pilot_live_water_state', 'Live water state')");
    expect(source).toContain("t('stem.watercycle.pilot_transition_meter', 'Transition meter')");
    expect(source).toContain("className: 'wc-pilot-pad-motion'");
    expect(source).toContain("className: 'wc-pilot-pad-actions'");
    expect(source).toContain("'data-control': 'rise'");
    expect(source).toContain("className: 'wc-pilot-notebook-mark'");
    expect(source).toContain("className: 'wc-pilot-notebook-progress'");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuemax': coverage.total");
    expect(source).toContain('.wc-pilot-scenario[data-scenario="mountainWinter"]');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-scenario');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-scenario-scene{display:none}');
  });

  it('connects orientation, evidence, science, and watershed progress in one learning dashboard', () => {
    expect(source).toContain("className: 'wc-pilot-learning-dashboard'");
    expect(source).toContain("'data-step': 'last'");
    expect(source).toContain("'data-step': 'now'");
    expect(source).toContain("'data-step': 'next'");
    expect(source).toContain("'data-energy': transitionMeta.energyDirection");
    expect(source).toContain("className: 'wc-pilot-ledger-progress'");
    expect(source).toContain("'aria-valuenow': coverage.done");
    expect(source).toContain("'aria-valuemax': coverage.total");
    expect(source).toContain("'data-stage': stageId");
    expect(source).toContain("'data-route': route.id");
    expect(source).toContain('.wc-pilot-journey-steps::before');
    expect(source).toContain('.wc-pilot-transition[data-energy=absorbed]');
    expect(source).toContain('.wc-pilot-ledger-list li[data-stage=evaporation]');
    expect(source).toContain('.wc-pilot-route-history li[data-route=plant]');
    expect(source).toContain('@media(max-width:860px){.wc-pilot-learning-dashboard{grid-template-columns:1fr}');
  });

  it('keeps a concise science receipt from the exact frame that changed the learner', () => {
    expect(source).toContain('lastChange: {');
    expect(source).toContain('from: wasForm,');
    expect(source).toContain('to: next.form,');
    expect(source).toContain('altitudeM: next.altitudeM,');
    expect(source).toContain('surface: next.surface');
    expect(source).toContain('function pilotTransitionMeta(change)');
    expect(source).toContain("'liquid>vapor': {");
    expect(source).toContain("'vapor>droplet': {");
    expect(source).toContain("'cloud>rain': {");
    expect(source).toContain("'rain>soil': {");
    expect(source).toContain("t('stem.watercycle.pilot_why_you_changed', 'Why you changed')");
    expect(source).toContain("className: 'wc-pilot-transition-evidence'");
    expect(source).toContain("setPilot({ snapshot: null, lastChange: null, lastCycle: null });");
  });

  it('continues landfall through visible, playable watershed pathways', () => {
    expect(source).toContain('var WC_PILOT_PATHWAY_BASE_RATE = {');
    expect(source).toContain('function wcPilotPathwayNextForm(form)');
    expect(source).toContain('function wcPilotPathwayRate(form, input)');
    expect(source).toContain('pathwayProgress: 0, // 0..1 through the current land-storage pathway');
    expect(source).toContain("if (form === 'soil') return 'groundwater';");
    expect(source).toContain("if (form === 'plant') return 'transpiring';");
    expect(source).toContain('surface: currentSurface, pathwayDrive: Math.max(0, surge)');

    expect(source).toContain('var PATHWAY_BEAD_COUNT = 30;');
    expect(source).toContain('var runoffLocalCurve = new THREE.CatmullRomCurve3([');
    expect(source).toContain('var groundwaterLocalCurve = new THREE.CatmullRomCurve3([');
    expect(source).toContain('var infiltrationLocalCurve = new THREE.CatmullRomCurve3([');
    expect(source).toContain('var plantLocalCurve = new THREE.CatmullRomCurve3([');
    expect(source).toContain('var soilColumn = new THREE.Mesh(');
    expect(source).toContain('var waterTableDisc = new THREE.Mesh(');
    expect(source).toContain("canvasEl.dataset.pathwayVisual = f === 'runoff' ? 'gravity-runoff-ribbon'");
    expect(source).toContain("f === 'soil' ? 'soil-pore-cutaway'");
    expect(source).toContain("f === 'groundwater' ? 'saturated-aquifer-flow'");
    expect(source).toContain("? 'root-xylem-leaf'");

    expect(source).toContain("className: 'wc-pilot-route is-process'");
    expect(source).toContain("className: 'wc-pilot-route-progress', role: 'progressbar'");
    expect(source).toContain("t('stem.watercycle.pilot_residence_time_note', 'Pathway in motion: natural residence time is compressed, not skipped.')");
    expect(source).toContain("{ key: 'down', label: t('stem.watercycle.pilot_percolate_faster'");
    expect(source).toContain("{ key: 'up', label: t('stem.watercycle.pilot_ride_xylem'");
    expect(source).toContain("{ key: 'fwd', label: t('stem.watercycle.pilot_follow_flow'");
  });

  it('makes Desert Basin virga visible, explainable, and measurable', () => {
    expect(source).toContain('var WC_PILOT_VIRGA_RATE = 0.12;');
    expect(source).toContain('function wcPilotVirgaRate(env, altitudeM)');
    expect(source).toContain("if ((state.dryAirExposure || 0) >= 1) return 'vapor';");
    expect(source).toContain("'rain>vapor': true");
    expect(source).toContain("process: t('stem.watercycle.pilot_receipt_virga', 'Virga - rain re-evaporation')");
    expect(source).toContain("t('stem.watercycle.pilot_virga_risk', 'Dry-air exposure')");
    expect(source).toContain('canvasEl.dataset.pilotDryAirExposure');
  });

  it('preserves cumulative pilot coverage, completed loops, and landing comparisons across runs', () => {
    expect(source).toContain('var pilotStagesSeen = Object.assign({}, pilotStored.stagesSeen || {}, snap.stagesSeen || {});');
    expect(source).toContain('stagesSeen: cumulativePilotStages');
    expect(source).toContain('var totalPilotLoops = pilotStored.loopsCompleted || 0;');
    expect(source).toContain('var cycleNumber = (cur.loopsCompleted || 0) + loopDelta;');
    expect(source).toContain('loopsCompleted: cycleNumber,');
    expect(source).toContain("lastCycle: {");
    expect(source).toContain("var landingRouteByForm = { liquid: 'water', runoff: 'runoff', soil: 'infiltration', plant: 'plant' };");
    expect(source).toContain("note: sim.note || ''");
    expect(source).toContain('var isLiveTransition = WCPK.isLiveTransition(prevSnap, next);');
    expect(source).toContain("if (isLiveTransition && next.note === 'landed' && landingRoute)");
    expect(source).toContain("className: 'wc-pilot-route-history', role: 'region'");
    expect(source).toContain("t('stem.watercycle.pilot_try_next_route', 'Try next: land on {surface}.')");
    expect(source).toContain('var done = !!pilotStagesSeen[stageId];');
  });

  it('stores bounded semantic comparison evidence while recomputing climate from the kernel', () => {
    const modelStart = source.indexOf('// Scenario comparison records store only bounded semantic evidence');
    const modelEnd = source.indexOf('var pinnedPilotComparisonCount', modelStart);
    const model = source.slice(modelStart, modelEnd);

    expect(modelStart).toBeGreaterThan(-1);
    expect(model).toContain('var pilotComparisonSource = pilotStored.comparisons');
    expect(model).toContain('function pilotComparisonNumber(value, minimum, maximum, fallback)');
    expect(model).toContain('Object.keys(WCPK.scenarios).forEach(function(id)');
    expect(model).toContain('var comparisonEnv = WCPK.environment(id);');
    expect(model).toContain('altitudeM: Math.round(pilotComparisonNumber(record.altitudeM, 0, comparisonEnv.ceilingM, 0))');
    expect(model).toContain('stageCount: Math.round(pilotComparisonNumber(record.stageCount, 0, WCPK.stageOrder.length, 0))');
    expect(model).toContain('rainbowStage: Math.round(pilotComparisonNumber(record.rainbowStage, 0, 4, 0))');
    expect(model).not.toContain('pointer');
    expect(model).not.toContain('camera');
    expect(model).not.toContain('trajectory');
  });

  it('pins, updates, and clears the current run without confusing it with cumulative coverage', () => {
    const currentStart = source.indexOf('var currentRunStageCount');
    const currentEnd = source.indexOf('var pilotComparisonRows', currentStart);
    const currentRecord = source.slice(currentStart, currentEnd);

    expect(currentRecord).toContain('snap.stagesSeen && snap.stagesSeen[stageId]');
    expect(currentRecord).not.toContain('pilotStagesSeen');
    expect(source).toContain('function pinPilotComparison()');
    expect(source).toContain('nextComparisons[scenarioId] = Object.assign({}, currentPilotComparison, {');
    expect(source).toContain('savedAt: Date.now()');
    expect(source).toContain('setPilot({ comparisons: nextComparisons });');
    expect(source).toContain('function clearPilotComparisons()');
    expect(source).toContain('setPilot({ comparisons: {} });');
    expect(source).toContain("className: 'wc-pilot-compare-btn is-primary'");
    expect(source).toContain("t('stem.watercycle.pilot_compare_update', 'Update current pin')");
    expect(source).toContain("t('stem.watercycle.pilot_compare_pin', 'Pin current journey')");
    expect(source).toContain("t('stem.watercycle.pilot_compare_clear', 'Clear pinned journeys')");
  });

  it('turns all four climates into a responsive visual evidence lab with causal findings', () => {
    expect(source).toContain("className: 'wc-pilot-compare-lab'");
    expect(source).toContain("'data-pins': String(pinnedPilotComparisonCount)");
    expect(source).toContain("'data-current-scenario': scenarioId");
    expect(source).toContain("className: 'wc-pilot-compare-insights', role: 'note'");
    expect(source).toContain("'data-insight': 'humidity'");
    expect(source).toContain("'data-insight': 'freezing'");
    expect(source).toContain('pilotComparisonLowestCloud.env.lclM');
    expect(source).toContain('pilotComparisonHighestCloud.env.lclM');
    expect(source).toContain('pilotComparisonLowestFreezing.env.freezingM');
    expect(source).toContain("className: 'wc-pilot-compare-card'");
    expect(source).toContain("'data-evidence': evidenceState");
    expect(source).toContain("className: 'wc-pilot-compare-climate'");
    expect(source).toContain("className: 'wc-pilot-compare-evidence'");
    expect(source).toContain('.wc-pilot-compare-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))');
    expect(source).toContain('.wc-pilot-compare-card[data-scenario=mountainWinter] .wc-pilot-compare-sky');
    expect(source).toContain('.wc-pilot-compare-card[data-scenario=desertBasin] .wc-pilot-compare-sky');
    expect(source).toContain('.dark .wc-pilot-compare-lab');
    expect(source).toContain('@media(max-width:1040px){.wc-pilot-compare-grid{grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(source).toContain('@media(max-width:560px){.wc-pilot-compare-lab');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-compare-mark');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-compare-lab');
  });

  it('aligns cloud, freezing, and journey evidence on one accessible climate sky scale', () => {
    expect(source).toContain('var pilotComparisonProfileCeilingM = pilotComparisonRows.reduce(function(highest, row)');
    expect(source).toContain('var pilotComparisonCloudSpreadM = Math.round(');
    expect(source).toContain('function pilotComparisonProfilePercent(value)');
    expect(source).toContain('function pilotComparisonProfileMarkerPercent(value)');
    expect(source).toContain("className: 'wc-pilot-sky-profile'");
    expect(source).toContain("'aria-labelledby': 'wcPilotSkyProfileTitle'");
    expect(source).toContain("'aria-describedby': 'wcPilotSkyProfileCaption'");
    expect(source).toContain("className: 'wc-pilot-sky-profile-legend'");
    expect(source).toContain("role: 'list'");
    expect(source).toContain("className: 'wc-pilot-sky-profile-columns'");
    expect(source).toContain("className: 'wc-pilot-sky-profile-column'");
    expect(source).toContain("'data-cloud-base-m': Math.round(row.env.lclM)");
    expect(source).toContain("'data-freezing-m': Math.round(row.env.freezingM)");
    expect(source).toContain("className: 'wc-pilot-sky-threshold is-cloud'");
    expect(source).toContain("className: 'wc-pilot-sky-threshold is-freezing'");
    expect(source).toContain("className: 'wc-pilot-sky-journey-marker'");
    expect(source).toContain('pilotComparisonProfileMarkerPercent(profileEvidence.altitudeM)');
    expect(source).toContain("t('stem.watercycle.pilot_compare_profile_caption',");
    expect(source).toContain("h('dt', null, t('stem.watercycle.pilot_compare_freezing', 'Freezing'))");
    expect(source).toContain(".replace('{freezing}', reportComparisonFreezing)");
    expect(source).toContain('.wc-pilot-sky-profile-columns{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))');
    expect(source).toContain('.wc-pilot-sky-profile-column[data-scenario=temperateCoast]');
    expect(source).not.toContain('[data-scenario=temperateLake]');
    expect(source).toContain('.dark .wc-pilot-sky-profile');
    expect(source).toContain('@media(max-width:560px){.wc-pilot-sky-profile-head');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-sky-journey-marker');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-sky-profile');
  });

  it('turns the shared scale into an accessible altitude threshold probe', () => {
    expect(source).toContain('var pilotComparisonProbeM = Math.round(');
    expect(source).toContain('pilotComparisonNumber(pilotStored.profileProbeM, 0,');
    expect(source).toContain('function pilotComparisonProbeReading(row)');
    expect(source).toContain('function wcPilotClimateProbe(environment, altitudeM)');
    expect(source).toContain('var aboveCloudBase = boundedAltitudeM >= env.lclM;');
    expect(source).toContain('var atOrAboveFreezingLevel = boundedAltitudeM >= env.freezingM;');
    expect(source).toContain('climateProbe: wcPilotClimateProbe');
    expect(source).toContain('WCPK.climateProbe(row.env, pilotComparisonProbeM)');
    expect(source).toContain("'Cold air, no cloud yet'");
    expect(source).toContain("'Liquid cloud possible'");
    expect(source).toContain("'Cloud ice possible'");
    expect(source).toContain("className: 'wc-pilot-sky-probe'");
    expect(source).toContain("id: 'wcPilotSkyProbe'");
    expect(source).toContain("type: 'range'");
    expect(source).toContain("'aria-describedby': 'wcPilotSkyProbeStatus wcPilotSkyProbeScience wcPilotSkyWaypointStatus'");
    expect(source).toContain("role: 'status'");
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain("'aria-pressed': String(pilotComparisonProbeM === probePresetM)");
    expect(source).toContain("setPilot({ profileProbeM: pilotComparisonNumber(nextProbeM, 0,");
    expect(source).toContain("className: 'wc-pilot-sky-probe-line'");
    expect(source).toContain('pilotComparisonProfilePercent(pilotComparisonProbeM)');
    expect(source).toContain("'data-edge': pilotComparisonProbeM === 0 ? 'surface'");
    expect(source).toContain("className: 'wc-pilot-sky-profile-probe-result'");
    expect(source).toContain("'data-probe-state': profileProbeReading.key");
    expect(source).toContain('Supercooled liquid can remain below 0°C.');
    expect(source).toContain('.wc-pilot-sky-probe-presets button{min-height:42px');
    expect(source).toContain('.dark .wc-pilot-sky-probe{');
    expect(source).toContain('@media(max-width:380px){.wc-pilot-sky-probe{');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-sky-probe-line i');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-sky-probe,');
    expect(source).toContain('@media print{.wc-pilot-sky-probe{');
  });

  it('summarizes four climate states and paints independent threshold regions', () => {
    expect(source).toContain("var pilotComparisonProbeStateOrder = ['air', 'cold', 'cloud', 'ice'];");
    expect(source).toContain('var pilotComparisonProbeCounts = { air: 0, cold: 0, cloud: 0, ice: 0 };');
    expect(source).toContain('aboveCloudBase: kernelReading.aboveCloudBase');
    expect(source).toContain('atOrAboveFreezingLevel: kernelReading.atOrAboveFreezingLevel');
    expect(source).toContain('var pilotComparisonProbeAboveCloudCount = pilotComparisonProbeRows.reduce');
    expect(source).toContain('var pilotComparisonProbeFreezingCount = pilotComparisonProbeRows.reduce');
    expect(source).toContain("t('stem.watercycle.pilot_compare_probe_crossing',");
    expect(source).toContain("className: 'wc-pilot-sky-probe-verdict'");
    expect(source).toContain("'aria-labelledby': 'wcPilotSkyProbeVerdictTitle'");
    expect(source).toContain("className: 'wc-pilot-sky-probe-states'");
    expect(source).toContain("'data-count': probeStateCount");
    expect(source).toContain("'data-empty': String(probeStateCount === 0)");
    expect(source).toContain("className: 'wc-pilot-sky-condition-zone is-cloud'");
    expect(source).toContain("className: 'wc-pilot-sky-condition-zone is-freezing'");
    expect(source).toContain("'data-active': String(profileProbeReading.aboveCloudBase)");
    expect(source).toContain("'data-active': String(profileProbeReading.atOrAboveFreezingLevel)");
    expect(source).toContain('height: (100 - pilotComparisonProfilePercent(row.env.lclM))');
    expect(source).toContain('height: (100 - pilotComparisonProfilePercent(row.env.freezingM))');
    expect(source).toContain('Tinted sky above each marker shows where that threshold has been crossed');
    expect(source).toContain('.wc-pilot-sky-probe-states{display:grid;grid-template-columns:repeat(4');
    expect(source).toContain('.dark .wc-pilot-sky-probe-verdict{');
    expect(source).toContain('@media(max-width:560px){.wc-pilot-sky-probe-verdict-head{');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-sky-probe-states li');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-sky-probe-verdict,');
    expect(source).toContain('@media print{.wc-pilot-sky-probe-verdict,');
  });

  it('turns climate thresholds into navigable atmospheric waypoints with temperature beacons', () => {
    expect(source).toContain('var pilotComparisonWaypointLabels = {');
    expect(source).toContain('var pilotComparisonProbeWaypoints = [];');
    expect(source).toContain('pilotComparisonRows.forEach(function(row)');
    expect(source).toContain("candidate.type === 'freezing'");
    expect(source).toContain('candidate.altitudeM >= row.env.ceilingM');
    expect(source).toContain('Math.ceil(thresholdM / 100) * 100');
    expect(source).toContain('pilotComparisonProbeWaypoints.sort(function(a, b)');
    expect(source).toContain('var pilotComparisonProbePreviousWaypoint = null;');
    expect(source).toContain('var pilotComparisonProbeNextWaypoint = null;');
    expect(source).toContain('var pilotComparisonProbeWaypointCrossedCount = 0;');
    expect(source).toContain('var pilotComparisonProbeWaypointProgress = pilotComparisonProbeWaypoints.length');
    expect(source).toContain("className: 'wc-pilot-sky-waypoints'");
    expect(source).toContain("'aria-labelledby': 'wcPilotSkyWaypointsTitle'");
    expect(source).toContain("'data-complete': String(pilotComparisonProbeWaypointCrossedCount");
    expect(source).toContain("className: 'wc-pilot-sky-waypoints-count'");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuemax': pilotComparisonProbeWaypoints.length");
    expect(source).toContain("'aria-valuenow': pilotComparisonProbeWaypointCrossedCount");
    expect(source).toContain("className: 'wc-pilot-sky-waypoints-list'");
    expect(source).toContain("'--wc-waypoint-progress':");
    expect(source).toContain("'data-waypoint-type': waypoint.type");
    expect(source).toContain("'data-crossed': String(waypointCrossed)");
    expect(source).toContain("'data-current': String(waypointCurrent)");
    expect(source).toContain("'data-next': String(waypointNext)");
    expect(source).toContain("'aria-current': waypointCurrent ? 'step' : undefined");
    expect(source).toContain("className: 'wc-pilot-sky-waypoint-step is-previous'");
    expect(source).toContain("className: 'wc-pilot-sky-waypoint-step is-next'");
    expect(source).toContain("id: 'wcPilotSkyWaypointStatus'");
    expect(source).toContain("className: 'wc-pilot-sky-probe-temperature'");
    expect(source).toContain("'data-freezing': String(profileProbeReading.temperatureC <= 0)");
    expect(source).toContain('pilotComparisonProbeTemperatureText(');
    expect(source).toContain('.wc-pilot-sky-waypoints{position:relative;');
    expect(source).toContain('.wc-pilot-sky-probe-temperature{position:absolute;');
    expect(source).toContain('.dark .wc-pilot-sky-waypoints{');
    expect(source).toContain('@media(max-width:560px){.wc-pilot-sky-waypoints-head{');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-sky-waypoints-list');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-sky-waypoints,');
    expect(source).toContain('@media print{.wc-pilot-sky-waypoints{');
  });

  it('aligns every climate on one accessible ambient-temperature cross-section', () => {
    expect(source).toContain('var pilotComparisonThermalRawMinC = pilotComparisonRows.reduce');
    expect(source).toContain('WCPK.climateProbe(row.env, pilotComparisonProfileCeilingM).ambientTempC');
    expect(source).toContain('var pilotComparisonThermalRawMaxC = pilotComparisonRows.reduce');
    expect(source).toContain('WCPK.climateProbe(row.env, 0).ambientTempC');
    expect(source).toContain('Math.floor(pilotComparisonThermalRawMinC / 5) * 5');
    expect(source).toContain('Math.ceil(pilotComparisonThermalRawMaxC / 5) * 5');
    expect(source).toContain('function pilotComparisonThermalPercent(value)');
    expect(source).toContain('var pilotComparisonCoolingRateCPerKm = Number(WCPK.envLapse) || 6.5;');
    expect(source).toContain('var pilotComparisonCoolingDropC =');
    expect(source).toContain('pilotComparisonCoolingRateCPerKm * pilotComparisonCoolingAltitudeKm;');
    expect(source).toContain('var pilotComparisonThermalRows = pilotComparisonProbeRows.map');
    expect(source).toContain('ambientTempC: kernelReading.ambientTempC');
    expect(source).toContain('surfacePositionPct: surfacePositionPct');
    expect(source).toContain('coolingWidthPct: Math.max(0, surfacePositionPct - currentPositionPct)');
    expect(source).toContain('var pilotComparisonThermalColdest = pilotComparisonThermalRows.reduce');
    expect(source).toContain('var pilotComparisonThermalWarmest = pilotComparisonThermalRows.reduce');
    expect(source).toContain('var pilotComparisonThermalSpreadC = pilotComparisonThermalWarmest');
    expect(source).toContain("t('stem.watercycle.pilot_compare_thermal_summary',");
    expect(source).toContain("className: 'wc-pilot-sky-thermal'");
    expect(source).toContain("'aria-labelledby': 'wcPilotSkyThermalTitle'");
    expect(source).toContain("'aria-describedby': 'wcPilotSkyThermalSummary'");
    expect(source).toContain("'data-scale-min-c': pilotComparisonThermalScaleMinC");
    expect(source).toContain("'data-scale-max-c': pilotComparisonThermalScaleMaxC");
    expect(source).toContain("'data-spread-c': pilotComparisonThermalSpreadC");
    expect(source).toContain("'data-lapse-rate-c-km': pilotComparisonCoolingRateText");
    expect(source).toContain("'data-cooling-c': pilotComparisonCoolingDropText");
    expect(source).toContain("className: 'wc-pilot-sky-thermal-plot'");
    expect(source).toContain("'aria-hidden': 'true'");
    expect(source).toContain("className: 'wc-pilot-sky-thermal-zero'");
    expect(source).toContain("className: 'wc-pilot-sky-thermal-path'");
    expect(source).toContain("className: 'wc-pilot-sky-thermal-surface'");
    expect(source).toContain("width: thermalItem.coolingWidthPct + '%'");
    expect(source).toContain("className: 'wc-pilot-sky-thermal-marker'");
    expect(source).toContain("className: 'wc-pilot-sky-cooling-rule'");
    expect(source).toContain("role: 'note'");
    expect(source).toContain("'aria-labelledby': 'wcPilotCoolingRuleTitle'");
    expect(source).toContain("'aria-describedby': 'wcPilotCoolingRuleSummary'");
    expect(source).toContain("className: 'wc-pilot-sky-cooling-equation'");
    expect(source).toContain("'aria-label': pilotComparisonCoolingEquationAria");
    expect(source).toContain("'data-freezing': String(thermalItem.temperatureC <= 0)");
    expect(source).toContain("'data-extreme': thermalExtreme");
    expect(source).toContain("className: 'wc-pilot-sky-thermal-legend'");
    expect(source).toContain("id: 'wcPilotSkyThermalSummary'");
    expect(source).toContain('.wc-pilot-sky-thermal{position:relative;');
    expect(source).toContain('.wc-pilot-sky-thermal-plot{position:relative;height:70px');
    expect(source).toContain('.wc-pilot-sky-thermal-path{--wc-thermal:#0284c7;');
    expect(source).toContain('.wc-pilot-sky-cooling-rule{position:relative;');
    expect(source).toContain('.dark .wc-pilot-sky-thermal{');
    expect(source).toContain('.dark .wc-pilot-sky-cooling-rule{');
    expect(source).toContain('@media(max-width:560px){.wc-pilot-sky-thermal-head{');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-sky-freeze-choices button,.wc-pilot-sky-thermal-path,.wc-pilot-sky-thermal-marker');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-sky-thermal,');
    expect(source).toContain('@media print{.wc-pilot-sky-thermal{');
  });

  it('turns the 0°C line into an accessible altitude-scoped forecast challenge', () => {
    expect(source).toContain('var pilotComparisonFreezeRows = pilotComparisonProbeRows.filter(function(item)');
    expect(source).toContain('return item.reading.ambientTempC <= 0;');
    expect(source).toContain('var pilotComparisonFreezeActualCount = pilotComparisonFreezeRows.length;');
    expect(source).toContain('var pilotComparisonFreezeRawCount = pilotStored.thermalForecastCount;');
    expect(source).toContain('pilotComparisonFreezeRawCount !== null');
    expect(source).toContain('pilotComparisonFreezeRawCount !== undefined');
    expect(source).toContain('pilotComparisonFreezeRawCount, 0, pilotComparisonRows.length, 0');
    expect(source).toContain('pilotStored.thermalForecastProbeM === null');
    expect(source).toContain('pilotComparisonFreezeStoredProbeM === pilotComparisonProbeM;');
    expect(source).toContain('pilotComparisonFreezeSelectedCount === pilotComparisonFreezeActualCount;');
    expect(source).toContain("className: 'wc-pilot-sky-freeze-challenge'");
    expect(source).toContain("'data-state': pilotComparisonFreezeState");
    expect(source).toContain("'data-correct': String(pilotComparisonFreezeCorrect)");
    expect(source).toContain("'aria-labelledby': 'wcPilotFreezeChallengeTitle'");
    expect(source).toContain("'aria-describedby': 'wcPilotFreezeChallengePrompt wcPilotFreezeChallengeScope'");
    expect(source).toContain("className: 'wc-pilot-sky-freeze-choices'");
    expect(source).toContain("role: 'group'");
    expect(source).toContain('[0, 1, 2, 3, 4].map(function(forecastCount)');
    expect(source).toContain("'aria-pressed': String(forecastSelected)");
    expect(source).toContain('thermalForecastCount: forecastCount');
    expect(source).toContain('thermalForecastProbeM: pilotComparisonProbeM');
    expect(source).toContain("className: 'wc-pilot-sky-freeze-feedback'");
    expect(source).toContain("role: 'status'");
    expect(source).toContain("'aria-live': 'polite'");
    expect(source).toContain('Below-freezing air does not guarantee that every water parcel is ice.');
    expect(source).toContain('.wc-pilot-sky-freeze-challenge{position:relative;');
    expect(source).toContain('.dark .wc-pilot-sky-freeze-challenge{');
    expect(source).toContain('@media(max-width:560px){.wc-pilot-sky-thermal-head');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-sky-freeze-choices button');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-sky-thermal,');
    expect(source).toContain('@media print{.wc-pilot-sky-thermal{');
  });

  it('guides a four-climate fair test with accessible progress and a smart next mission', () => {
    expect(source).toContain('var pilotPinnedComparisonRows = pilotComparisonRows.filter(function(row)');
    expect(source).toContain('var pilotUnpinnedComparisonRows = pilotComparisonRows.filter(function(row)');
    expect(source).toContain('var pilotNextComparisonRow = pilotUnpinnedComparisonRows.reduce(function(best, row)');
    expect(source).toContain('var pilotComparisonMissionComplete = pinnedPilotComparisonCount === pilotComparisonRows.length;');
    expect(source).toContain("className: 'wc-pilot-compare-mission'");
    expect(source).toContain("'data-complete': String(pilotComparisonMissionComplete)");
    expect(source).toContain("className: 'wc-pilot-compare-progress'");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuemax': pilotComparisonRows.length");
    expect(source).toContain("'aria-valuenow': pinnedPilotComparisonCount");
    expect(source).toContain("className: 'wc-pilot-compare-checklist'");
    expect(source).toContain("var missionState = row.pinned ? 'pinned' : (row.current ? 'current' : 'todo');");
    expect(source).toContain("t('stem.watercycle.pilot_compare_fair_test_title', 'Fair-test rule')");
    expect(source).toContain('Use the same rise and steering strategy in every climate so starting conditions are the main variable.');
    expect(source).toContain('onClick: function() { chooseScenario(pilotNextComparisonRow.id); }');
  });

  it('unlocks a claim-evidence-reasoning conclusion after two pins without mislabeling route coverage', () => {
    expect(source).toContain('var pilotComparisonSynthesisReady = pilotPinnedComparisonRows.length >= 2;');
    expect(source).toContain('var pilotPinnedLowestCloud = pilotPinnedComparisonRows.reduce(function(best, row)');
    expect(source).toContain('var pilotPinnedHighestCloud = pilotPinnedComparisonRows.reduce(function(best, row)');
    expect(source).toContain('var pilotPinnedMostStages = pilotPinnedComparisonRows.reduce(function(best, row)');
    expect(source).toContain("className: 'wc-pilot-compare-synthesis'");
    expect(source).toContain("'data-ready': String(pilotComparisonSynthesisReady)");
    expect(source).toContain('? h(React.Fragment, null,');
    expect(source).not.toContain('? h(Fragment, null,');
    expect(source).toContain("className: 'wc-pilot-compare-cer'");
    expect(source).toContain("'data-part': 'claim'");
    expect(source).toContain("'data-part': 'evidence'");
    expect(source).toContain("'data-part': 'reasoning'");
    expect(source).toContain(".replace('{lowRH}', Math.round(lowRow.env.surfaceRH))");
    expect(source).toContain(".replace('{highRH}', Math.round(highRow.env.surfaceRH))");
    expect(source).toContain("t('stem.watercycle.pilot_compare_method_title',");
    expect(source).toContain('Stage coverage reflects the route you flew, so it is not proof of a climate effect.');
    expect(source).toContain("className: 'wc-pilot-compare-complete', role: 'status'");
    expect(source).toContain("className: 'wc-pilot-compare-notebook-btn'");
    expect(source).toContain('onClick: focusPilotComparisonNotebook');
    expect(source).toContain("className: 'wc-pilot-notebook-compare'");
    expect(source).toContain("className: 'wc-pilot-notebook-compare-cer', role: 'note'");
    expect(source).toContain("t('stem.watercycle.pilot_notebook_climates', 'Climates')");
    expect(source).toContain('.wc-pilot-compare-checklist{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))');
    expect(source).toContain('.wc-pilot-compare-cer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(source).toContain('.dark .wc-pilot-compare-mission');
    expect(source).toContain('@media(max-width:820px){.wc-pilot-compare-checklist');
    expect(source).toContain('@media(prefers-reduced-motion:reduce){.wc-pilot-compare-progress i');
    expect(source).toContain('@media(forced-colors:active){.wc-pilot-compare-mission');
  });

  it('keeps keyboard, touch, focus-loss, and assistive-control input from lying or sticking', () => {
    expect(source).toContain("['w', 'a', 's', 'd', 'f', 'b', 'e', 'q', 'arrowup'");
    expect(source).toContain("surge = (keyState.w || keyState.arrowup || keyState.f || input.fwd ? 1 : 0)");
    expect(source).toContain("thrust = (keyState[' '] || keyState.e || input.up ? 1 : 0)");
    expect(source).toContain("- (keyState.s || keyState.arrowdown || keyState.b || input.back ? 1 : 0)");
    expect(source).toContain('function clearPilotKeyboardState()');
    expect(source).toContain('function clearPilotInputs()');
    expect(source).toContain('activePointers = {};');
    expect(source).toContain('pinchDistance = 0;');
    expect(source).toContain("window.addEventListener('blur', clearPilotInputs);");
    expect(source).toContain("window.removeEventListener('blur', clearPilotInputs);");
    expect(source).toContain("canvasEl.addEventListener('blur', clearPilotKeyboardState);");
    expect(source).toContain("canvasEl.removeEventListener('blur', clearPilotKeyboardState);");
    expect(source).not.toContain("canvasEl.addEventListener('blur', clearPilotInputs);");
    expect(source).toContain("document.addEventListener('visibilitychange', onPilotVisibilityChange);");
    expect(source).toContain("document.removeEventListener('visibilitychange', onPilotVisibilityChange);");
    expect(source).toContain('function pilotPinchDistance()');
    expect(source).toContain('return Math.hypot(b.x - a.x, b.y - a.y);');
    expect(source).toContain('function pilotZoomBase()');
    expect(source).toContain("formCamDist(sim && sim.form ? sim.form : 'liquid')");
    expect(source).toContain("if (input.cameraMode === 'water') return;");
    expect(source).toContain('var remainingIds = pilotPointerIds();');
    expect(source).not.toContain('(userZoom || camDist) -');
    expect(source).not.toContain('(userZoom || camDist) +');
    expect(source).toContain('canvasEl.dataset.pilotZoom = String(Math.round(userZoom));');
    expect(source).toContain('onClick: impulse, onBlur: directOff');
    expect(source).toContain('directActivation || (e && e.detail > 0)');
    expect(source).toContain('setTimeout(function() { target[key] = 0; }, 180);');
    expect(source).toContain("document.querySelector('.wc-pilot-launch-btn')");
    expect(source).toContain('W A S D F B ArrowUp ArrowDown ArrowLeft ArrowRight Space Shift');
  });

  it('announces every form or pathway change even when sound is muted', () => {
    expect(source).toContain("if (isLiveTransition && next.form !== 'cloud') {");
    expect(source).toContain('var announcedMeta = pilotTransitionMeta(announcedChange);');
    expect(source).toContain("t('stem.watercycle.pilot_transition_announce', 'Water changed from {from} to {to}: {process}.')");
    expect(source).toContain("if (isLiveTransition && next.form === 'cloud') {");
  });
});

describe('Be the Water guided comparison render', () => {
  it('server-renders the unlocked climate conclusion from two pinned journeys', () => {
    resetStemLab();
    loadTool(WATER_CYCLE_PATHS[0], 'waterCycle');
    const html = renderTool('waterCycle', {
      _threeLoaded: true,
      waterCycle: {
        wcMode: 'pilot',
        pilot: {
          onboardingComplete: true,
          profileProbeM: 1500,
          thermalForecastCount: 1,
          thermalForecastProbeM: 1500,
          scenario: 'temperateCoast',
          comparisons: {
            tropicalOcean: {
              scenario: 'tropicalOcean',
              form: 'rain',
              altitudeM: 1400,
              stageCount: 4,
              rainbowStage: 2,
              savedAt: 1,
            },
            mountainWinter: {
              scenario: 'mountainWinter',
              form: 'snow',
              altitudeM: 2200,
              stageCount: 3,
              rainbowStage: 0,
              savedAt: 2,
            },
          },
        },
      },
    });

    expect(html).toContain('data-ready="true"');
    expect(html).toContain('Climate conclusion');
    expect(html).toContain('Claim - evidence - reasoning');
    expect(html).toContain('Separate climate from piloting');
    expect(html).toContain('Stage coverage reflects the route you flew');
    expect(html).toContain('Use this conclusion in Journey Notebook');
    expect(html).toContain('Climate comparison evidence');
    expect(html).toContain('Climate sky profile');
    expect(html).toContain('Shared model scale');
    expect(html).toContain('cloud-base spread');
    expect(html).toContain('All four climates use the same 0-6 km model scale');
    expect(html).toContain('Pinned: Raindrop at 1400 m');
    expect(html).toContain('Pinned: Snowflake at 2200 m');
    expect(html.match(/class="wc-pilot-sky-profile-column"/g) || []).toHaveLength(4);
    expect(html).toContain('data-cloud-base-m=');
    expect(html).toContain('data-freezing-m=');
    expect(html).toContain('Altitude probe');
    expect(html).toContain('Move one altitude through every climate');
    expect(html).toContain('data-altitude-m="1500"');
    expect(html).toContain('class="wc-pilot-sky-probe-range"');
    expect(html).toContain('value="1500"');
    expect(html).toContain('aria-valuetext="1500 metres"');
    expect(html).toContain('1.5 km');
    expect(html).toContain('Liquid cloud possible');
    expect(html).toContain('Cloud ice possible');
    expect(html).toContain('Below cloud base');
    expect(html).toContain('Supercooled liquid can remain below 0°C.');
    expect(html.match(/class="wc-pilot-sky-probe-line"/g) || []).toHaveLength(4);
    expect(html.match(/class="wc-pilot-sky-profile-probe-result"/g) || []).toHaveLength(4);
    expect(html).toContain('data-probe-state="cloud"');
    expect(html).toContain('data-probe-state="ice"');
    expect(html).toContain('data-probe-state="air"');
    expect(html).toContain('Conditions at this altitude');
    expect(html).toContain('At 1.5 km, the probe is above cloud base in 3 of 4 climates and at or above the freezing level in 1.');
    expect(html).toContain('class="wc-pilot-sky-probe-states"');
    expect(html).toContain('data-probe-state="air" data-count="1"');
    expect(html).toContain('data-probe-state="cold" data-count="0"');
    expect(html).toContain('data-probe-state="cloud" data-count="2"');
    expect(html).toContain('data-probe-state="ice" data-count="1"');
    expect(html).toContain('0 / 4 climates');
    expect(html).toContain('2 / 4 climates');
    expect(html.match(/class="wc-pilot-sky-condition-zone is-cloud"/g) || []).toHaveLength(4);
    expect(html.match(/class="wc-pilot-sky-condition-zone is-freezing"/g) || []).toHaveLength(4);
    expect(html).toContain('data-zone="cloud" data-active="true"');
    expect(html).toContain('data-zone="cloud" data-active="false"');
    expect(html).toContain('data-zone="freezing" data-active="true"');
    expect(html).toContain('Tinted sky above each marker shows where that threshold has been crossed');
    expect(html).toContain('Atmospheric waypoints');
    expect(html).toContain('Boundary navigator');
    expect(html).toContain('Jump to the first 100 m probe step at or above each boundary');
    expect(html).toContain('class="wc-pilot-sky-waypoints"');
    expect(html).toContain('aria-labelledby="wcPilotSkyWaypointsTitle"');
    expect(html).toContain('aria-label="Atmospheric thresholds crossed"');
    expect(html).toContain('class="wc-pilot-sky-waypoints-list"');
    expect((html.match(/data-waypoint-type=/g) || []).length).toBeGreaterThan(4);
    expect(html).toContain('data-waypoint-type="cloud"');
    expect(html).toContain('data-waypoint-type="freezing"');
    expect(html).toContain('data-crossed="true"');
    expect(html).toContain('data-crossed="false"');
    expect(html).toContain('data-next="true"');
    expect(html).toContain('Next crossing:');
    expect(html.match(/class="wc-pilot-sky-probe-temperature"/g) || []).toHaveLength(4);
    expect(html).toContain('data-freezing="true"');
    expect(html).toContain('data-freezing="false"');
    expect(html).toContain('Thermal cross-section');
    expect(html).toContain('Temperature evidence');
    expect(html).toContain('Same altitude, one shared model scale');
    expect(html).toContain('class="wc-pilot-sky-thermal"');
    expect(html).toContain('aria-labelledby="wcPilotSkyThermalTitle"');
    expect(html).toContain('aria-describedby="wcPilotSkyThermalSummary"');
    expect(html).toContain('data-scale-min-c="-40"');
    expect(html).toContain('data-scale-max-c="40"');
    expect(html).toContain('data-spread-c="36"');
    expect(html).toContain('data-lapse-rate-c-km="6.5"');
    expect(html).toContain('data-cooling-c="9.8"');
    expect(html).toContain('36°C spread');
    expect(html).toContain('Shared ambient-temperature scale');
    expect(html).toContain('class="wc-pilot-sky-thermal-zero"');
    expect(html.match(/class="wc-pilot-sky-thermal-path"/g) || []).toHaveLength(4);
    expect(html.match(/class="wc-pilot-sky-thermal-surface"/g) || []).toHaveLength(4);
    expect(html.match(/class="wc-pilot-sky-thermal-marker"/g) || []).toHaveLength(4);
    expect(html).toContain('class="wc-pilot-sky-cooling-rule"');
    expect(html).toContain('aria-labelledby="wcPilotCoolingRuleTitle"');
    expect(html).toContain('aria-describedby="wcPilotCoolingRuleSummary"');
    expect(html).toContain('aria-label="6.5 degrees Celsius per kilometre multiplied by 1.5 kilometres equals 9.8 degrees Celsius cooler."');
    expect(html).toContain('Model rule');
    expect(html).toContain('Altitude cooling');
    expect(html).toContain('6.5°C / km');
    expect(html).toContain('1.5 km climbed');
    expect(html).toContain('9.8°C cooler');
    expect(html).toContain('Every climate cools by the same 9.8°C at this altitude because the model applies one environmental lapse rate. Different surface temperatures keep the markers separated.');
    expect(html).toContain('class="wc-pilot-sky-freeze-challenge"');
    expect(html).toContain('data-state="confirmed"');
    expect(html).toContain('data-correct="true"');
    expect(html).toContain('data-probe-m="1500"');
    expect(html).toContain('aria-labelledby="wcPilotFreezeChallengeTitle"');
    expect(html).toContain('aria-describedby="wcPilotFreezeChallengePrompt wcPilotFreezeChallengeScope"');
    expect(html).toContain('Science challenge');
    expect(html).toContain('Freeze-line forecast');
    expect(html).toContain('How many climate markers sit at or below 0°C at 1.5 km?');
    expect(html).toContain('class="wc-pilot-sky-freeze-choices"');
    expect((html.match(/Forecast [0-4] climate profiles at or below 0°C/g) || []).length).toBe(5);
    expect(html).toContain('aria-label="Forecast 1 climate profiles at or below 0°C" aria-pressed="true"');
    expect(html).toContain('data-outcome="correct"');
    expect(html).toContain('Evidence matched');
    expect(html).toContain('Confirmed: 1 of 4 climate profiles sit at or below 0°C at 1.5 km: Mountain winter.');
    expect(html).toContain('Counts ambient temperature markers only. Below-freezing air does not guarantee that every water parcel is ice.');
    expect(html).toContain('class="wc-pilot-sky-thermal-legend"');
    expect((html.match(/model cooling 9.8°C./g) || []).length).toBe(4);
    expect((html.match(/surface starting temperature [+-]/g) || []).length).toBe(4);
    expect(html).toContain('data-extreme="coldest"');
    expect(html).toContain('data-extreme="warmest"');
    expect(html).toContain('Surface +2°C');
    expect(html).toContain('Surface +38°C');
    expect(html).toContain('At 1.5 km, Mountain winter is coldest at -8°C; Desert basin is warmest at +28°C. The 36°C spread comes from different surface starting temperatures in this shared-lapse-rate model.');
    expect(html).toContain('2 of 4 climates pinned');
    expect(html).toContain('Tropical ocean');
    expect(html).toContain('Mountain winter');
    expect(html).not.toContain('Pin one more climate to unlock a conclusion');
  }, 30_000);

  it('resets stale-altitude forecasts and keeps incorrect feedback evidence-seeking', () => {
    resetStemLab();
    loadTool(WATER_CYCLE_PATHS[0], 'waterCycle');
    function renderForecast(forecastCount, forecastProbeM) {
      const html = renderTool('waterCycle', {
        _threeLoaded: true,
        waterCycle: {
          wcMode: 'pilot',
          pilot: {
            onboardingComplete: true,
            profileProbeM: 1500,
            thermalForecastCount: forecastCount,
            thermalForecastProbeM: forecastProbeM,
          },
        },
      });
      const start = html.indexOf('class="wc-pilot-sky-freeze-challenge"');
      const end = html.indexOf('class="wc-pilot-sky-cooling-rule"', start);
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      return html.slice(start, end);
    }

    const staleChallenge = renderForecast(1, 1000);
    expect(staleChallenge).toContain('data-state="ready"');
    expect(staleChallenge).toContain('data-correct="false"');
    expect(staleChallenge).toContain('Read the dashed freezing line, then choose 0–4.');
    expect(staleChallenge).not.toContain('aria-pressed="true"');

    const retryChallenge = renderForecast(2, 1500);
    expect(retryChallenge).toContain('data-state="retry"');
    expect(retryChallenge).toContain('data-correct="false"');
    expect(retryChallenge).toContain('aria-label="Forecast 2 climate profiles at or below 0°C" aria-pressed="true"');
    expect(retryChallenge).toContain('data-outcome="retry"');
    expect(retryChallenge).toContain('Check the line');
    expect(retryChallenge).toContain('Try again. Count the markers on or left of the dashed 0°C line.');
    expect(retryChallenge).not.toContain('Confirmed:');
  }, 30_000);
});

describe('Be the Water deployment mirror', () => {
  it('ships the same experience in the canonical and desktop copies', () => {
    expect(WATER_CYCLE_SOURCES.get(WATER_CYCLE_PATHS[1])).toBe(WATER_CYCLE_SOURCES.get(WATER_CYCLE_PATHS[0]));
  }, 30_000);
});

describe.each([
  'ui_strings.js',
  'desktop/web-app/public/ui_strings.js',
])('Be the Water English labels (%s)', (filePath) => {
  const uiSource = readFileSync(filePath, 'utf8');

  it('publishes descriptive simulation labels without legacy marketing keys', () => {
    expect(uiSource).toContain('"mode_3d_simulation": "3D SIMULATION"');
    expect(uiSource).toContain('"pilot_interactive_3d_simulation": "Interactive 3D water-cycle simulation"');
    expect(uiSource).toContain('"pilot_3d_view_interrupted": "3D view interrupted"');
    expect(uiSource).toContain('"pilot_retry_3d_view": "Retry 3D view"');
    expect(uiSource).toContain('"pilot_retrying_3d_view": "Retrying the 3D view. Your journey progress is preserved."');
    expect(uiSource).toContain('"pilot_live_water_state": "Live water state"');
    expect(uiSource).toContain('"pilot_transition_meter": "Transition meter"');
    expect(uiSource).toContain('"pilot_flight_deck": "Flight deck"');
    expect(uiSource).toContain('"pilot_notebook_evidence_progress": "Stage evidence"');
    expect(uiSource).toContain('"pilot_compare_use_in_notebook": "Use this conclusion in Journey Notebook"');
    expect(uiSource).toContain('"pilot_notebook_compare_title": "Climate comparison evidence"');
    expect(uiSource).toContain('"pilot_notebook_report_comparison": "Climate comparison evidence"');
    expect(uiSource).toContain('"pilot_compare_profile_title": "Climate sky profile"');
    expect(uiSource).toContain('"pilot_compare_profile_legend_journey": "Live or pinned parcel"');
    expect(uiSource).toContain('"pilot_compare_profile_legend_probe": "Altitude probe"');
    expect(uiSource).toContain('"pilot_compare_probe_prompt": "Move one altitude through every climate"');
    expect(uiSource).toContain('"pilot_compare_probe_verdict_title": "Conditions at this altitude"');
    expect(uiSource).toContain('"pilot_compare_probe_crossing": "At {altitude}, the probe is above cloud base in {cloud} of {total} climates and at or above the freezing level in {freezing}."');
    expect(uiSource).toContain('"pilot_compare_probe_state_count": "{count} / {total} climates"');
    expect(uiSource).toContain('"pilot_compare_probe_condition_aria": "{label}: {count} of {total} climates at {altitude}."');
    expect(uiSource).toContain('"pilot_compare_probe_temperature": "{temp}°C"');
    expect(uiSource).toContain('"pilot_compare_waypoint_cloud": "cloud base"');
    expect(uiSource).toContain('"pilot_compare_waypoint_freezing": "freezing level"');
    expect(uiSource).toContain('"pilot_compare_waypoints_title": "Atmospheric waypoints"');
    expect(uiSource).toContain('"pilot_compare_waypoints_hint": "Jump to the first 100 m probe step at or above each boundary"');
    expect(uiSource).toContain('"pilot_compare_waypoints_count": "{crossed} / {total} crossed"');
    expect(uiSource).toContain('"pilot_compare_waypoint_button_aria": "Move probe to the {scenario} {threshold} crossing step at {altitude}"');
    expect(uiSource).toContain('"pilot_compare_waypoint_status_here": "This probe step crosses: {events}."');
    expect(uiSource).toContain('"pilot_compare_waypoint_status_next": "Next crossing: {scenario} {threshold} at the {altitude} probe step; climb {distance}."');
    expect(uiSource).toContain('"pilot_compare_waypoint_status_complete": "Every modeled cloud-base and freezing crossing is at or below this altitude."');
    expect(uiSource).toContain('"pilot_compare_thermal_kicker": "Temperature evidence"');
    expect(uiSource).toContain('"pilot_compare_thermal_title": "Thermal cross-section"');
    expect(uiSource).toContain('"pilot_compare_thermal_hint": "Same altitude, one shared model scale"');
    expect(uiSource).toContain('"pilot_compare_thermal_spread": "{spread}°C spread"');
    expect(uiSource).toContain('"pilot_compare_thermal_scale": "Shared ambient-temperature scale"');
    expect(uiSource).toContain('"pilot_compare_thermal_zero": "0°C"');
    expect(uiSource).toContain('"pilot_compare_thermal_surface": "Surface {temp}"');
    expect(uiSource).toContain('"pilot_compare_thermal_climate_aria": "{scenario}: {current} at {altitude}; surface starting temperature {surface}; model cooling {drop}°C."');
    expect(uiSource).toContain('"pilot_compare_thermal_summary": "At {altitude}, {cold} is coldest at {coldTemp}; {warm} is warmest at {warmTemp}. The {spread}°C spread comes from different surface starting temperatures in this shared-lapse-rate model."');
    expect(uiSource).toContain('"pilot_compare_cooling_kicker": "Model rule"');
    expect(uiSource).toContain('"pilot_compare_cooling_title": "Altitude cooling"');
    expect(uiSource).toContain('"pilot_compare_cooling_rate": "{rate}°C / km"');
    expect(uiSource).toContain('"pilot_compare_cooling_altitude": "{altitude} km climbed"');
    expect(uiSource).toContain('"pilot_compare_cooling_result": "{drop}°C cooler"');
    expect(uiSource).toContain('"pilot_compare_cooling_equation_aria": "{rate} degrees Celsius per kilometre multiplied by {altitude} kilometres equals {drop} degrees Celsius cooler."');
    expect(uiSource).toContain('"pilot_compare_cooling_summary": "Every climate cools by the same {drop}°C at this altitude because the model applies one environmental lapse rate. Different surface temperatures keep the markers separated."');
    expect(uiSource).toContain('"pilot_compare_freeze_none": "none"');
    expect(uiSource).toContain('"pilot_compare_freeze_state_confirmed": "Evidence matched"');
    expect(uiSource).toContain('"pilot_compare_freeze_state_retry": "Check the line"');
    expect(uiSource).toContain('"pilot_compare_freeze_state_ready": "Make your call"');
    expect(uiSource).toContain('"pilot_compare_freeze_prompt": "How many climate markers sit at or below 0°C at {altitude}?"');
    expect(uiSource).toContain('"pilot_compare_freeze_confirmed": "Confirmed: {count} of {total} climate profiles sit at or below 0°C at {altitude}: {climates}."');
    expect(uiSource).toContain('"pilot_compare_freeze_retry": "Try again. Count the markers on or left of the dashed 0°C line."');
    expect(uiSource).toContain('"pilot_compare_freeze_hint": "Read the dashed freezing line, then choose 0–4."');
    expect(uiSource).toContain('"pilot_compare_freeze_kicker": "Science challenge"');
    expect(uiSource).toContain('"pilot_compare_freeze_title": "Freeze-line forecast"');
    expect(uiSource).toContain('"pilot_compare_freeze_choices_aria": "Freeze-line forecast choices"');
    expect(uiSource).toContain('"pilot_compare_freeze_choice_aria": "Forecast {count} climate profiles at or below 0°C"');
    expect(uiSource).toContain('"pilot_compare_freeze_profiles": "profiles"');
    expect(uiSource).toContain('"pilot_compare_freeze_scope": "Counts ambient temperature markers only. Below-freezing air does not guarantee that every water parcel is ice."');
    expect(uiSource).toContain('"pilot_compare_probe_state_cloud": "Liquid cloud possible"');
    expect(uiSource).toContain('"pilot_compare_probe_state_ice": "Cloud ice possible"');
    expect(uiSource).toContain('"pilot_compare_probe_science": "Thresholds describe environmental conditions, not a guaranteed parcel phase. Supercooled liquid can remain below 0°C."');
    expect(uiSource).toContain('"pilot_compare_profile_caption": "All four climates use the same 0-{ceiling} km model scale. Tinted sky above each marker shows where that threshold has been crossed; higher markers require a farther climb."');
    expect(uiSource).toContain('"pilot_journey_guide": "Journey guide"');
    expect(uiSource).toContain('"pilot_last_change": "Last change"');
    expect(uiSource).toContain('"pilot_journey_started": "Journey started"');
    expect(uiSource).toContain('"pilot_now": "Now"');
    expect(uiSource).toContain('"pilot_next_goal": "Next goal"');
    expect(uiSource).toContain('"pilot_do_this_next": "Next goal"');
    expect(uiSource).toContain('Follow the Next goal panel at the top right of the scene.');
    expect(uiSource).toContain('Watch Next goal, the phase badge, and the meters explain every transformation.');
    expect(uiSource).toContain('"sect_fly_one_parcel_through_every_form": "Pilot one parcel through changing states and pathways"');
    expect(uiSource).not.toContain('"mode_flagship":');
    expect(uiSource).not.toContain('"pilot_flagship_experience":');
  });

  it('publishes every Scenario Comparison Lab label used by the runtime', () => {
    const runtime = WATER_CYCLE_SOURCES.get(WATER_CYCLE_PATHS[0]);
    const comparisonKeys = new Set(
      [...runtime.matchAll(/stem[.]watercycle[.](pilot_compare_[a-z0-9_]+)/g)].map((match) => match[1]),
    );

    expect(comparisonKeys.size).toBeGreaterThan(20);
    comparisonKeys.forEach((key) => expect(uiSource).toContain('"' + key + '":'));
    expect(uiSource).toContain('"pilot_compare_title": "Scenario comparison lab"');
    expect(uiSource).toContain('"pilot_compare_cloud_insight_title": "Humidity changes the climb"');
    expect(uiSource).toContain('"pilot_compare_freeze_insight_title": "Temperature changes the phase"');
  });
});
