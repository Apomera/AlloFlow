import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

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

  it('lets learners switch between a phase-visible follow camera and a parcel-level water camera', () => {
    expect(source).toContain("cameraMode: 'follow'");
    expect(source).toContain("var waterView = input.cameraMode === 'water';");
    expect(source).toContain('parcel.visible = !waterView;');
    expect(source).toContain("canvasEl.dataset.pilotCamera = waterView ? 'water' : 'follow';");
    expect(source).toContain("'data-camera-mode': cameraMode");
    expect(source).toContain("t('stem.watercycle.pilot_follow_view', 'Follow view')");
    expect(source).toContain("t('stem.watercycle.pilot_water_view', 'Water view')");
    expect(source).toContain('var eyeGoal = new THREE.Vector3(px, eyeY, pz);');
    expect(source).toContain('camera.lookAt(');
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

  it('keeps the progress HUD aligned with the current form', () => {
    expect(source).toContain(": snap.form === 'droplet'");
    expect(source).toContain("(snap.form === 'rain' || snap.form === 'snow')");
    expect(source).toContain("t('stem.watercycle.pilot_descent_to_surface', 'Descent to surface')");
    expect(source).toContain("t('stem.watercycle.pilot_gravity_steer_pathway', 'Gravity is pulling you down — steer toward a pathway')");
    expect(source).toContain("t('stem.watercycle.pilot_current_pathway', 'Current pathway')");
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
    expect(source).toContain("setPilot({ snapshot: null, lastChange: null });");
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
});

describe('Be the Water deployment mirror', () => {
  it('ships the same experience in the canonical and desktop copies', () => {
    expect(WATER_CYCLE_SOURCES.get(WATER_CYCLE_PATHS[1])).toBe(WATER_CYCLE_SOURCES.get(WATER_CYCLE_PATHS[0]));
  }, 30_000);
});
