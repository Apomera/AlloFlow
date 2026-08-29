import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function functionSlice(startName, endName) {
  const start = source.search(new RegExp(`function\\s+${startName}\\s*\\(`));
  const end = source.search(new RegExp(`function\\s+${endName}\\s*\\(`));
  return start >= 0 && end > start ? source.slice(start, end) : '';
}

function markerLead(haystack, marker, distance = 520) {
  const markerIndex = haystack.indexOf(marker);
  return markerIndex >= 0 ? haystack.slice(Math.max(0, markerIndex - distance), markerIndex) : '';
}

describe('Geology Explorer 3D visual refinement', () => {
  it('renders scene-aware rock surfaces, cinematic lighting, and adaptive detail', () => {
    expect(source).toContain('makeGeologySurfaceTexture3d');
    expect(source).toContain('map: rockSurfaceTexture3d');
    expect(source).toContain('bumpMap: rockSurfaceTexture3d');
    expect(source).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping');
    expect(source).toContain("cnv.dataset.geologyRenderQuality = geologyHighDetail3d ? 'depth-shadows' : 'mobile-efficient'");
    expect(source).toContain("cnv.dataset.geologyMaterialRendering = 'procedural-rock-grain-bump-and-phase-glow'");
  });

  it('adds scientific atmosphere and process motion for all six geology scenes', () => {
    expect(source).toContain('geologyAtmosphereColors3d');
    expect(source).toContain('updateGeologyProcessTracers3d');
    expect(source).toContain("SCENE.id === 'subduction'");
    expect(source).toContain("SCENE.id === 'ridge'");
    expect(source).toContain("SCENE.id === 'hotspot'");
    expect(source).toContain("SCENE.id === 'deepEarth'");
    expect(source).toContain("SCENE.id === 'geode'");
    expect(source).toContain("cnv.dataset.geologyProcessRendering = SCENE.id + '-science-process-tracers'");
  });

  it('gives water, crystals, and excavation distinct physical feedback', () => {
    expect(source).toContain('makeGeologyOceanMaskTexture3d');
    expect(source).toContain('makeGeologyCausticTexture3d');
    expect(source).toContain("cnv.dataset.geologyWaterRendering = 'masked-clearcoat-ocean-surface'");
    expect(source).toContain("'segmented-wave-displacement-and-caustic-depth-cues'");
    expect(source).toContain('function updateGeologyOceanSurface3d');
    expect(source).toContain('oceanSurfaceBasePositions3d');
    expect(source).toContain('geologyCausticTexture3d.offset.x');
    expect(source).toContain("cnv.dataset.geologyCrystalRendering = 'inward-growing-refractive-quartz-shards'");
    expect(source).toContain('spawnExcavationBurst3d(v);');
    expect(source).toContain("cnv.dataset.geologyExcavationRendering = 'rock-colored-dust-chips-and-exposure-flash'");
  });

  it('opens the camera-facing side so cutaways expose the science instead of the back of the block', () => {
    expect(source).toContain("cnv.dataset.geologyCutawayRendering = 'camera-facing-front-section'");
    expect(source).toContain('v.z < NZ - sliceZ');
    expect(source).toContain('waterMesh.position.z = -sliceZ / 2 * VOXEL');
    expect(source).toContain('z >= NZ - sliceZ');
  });

  it('uses scene-native topography instead of repeating crust scenery in every world', () => {
    expect(source).toContain("cnv.dataset.geologySurfaceRendering = SCENE.id === 'crust' ? 'field-landmarks' : 'scene-native-topography'");
    expect(source).toContain("if (SCENE.id !== 'crust') return;");
    expect(source).toContain('volcano.visible = !!SCENE.features.volcano');
    expect(source).toContain('geologyHeatLightConfig3d');
  });

  it('keeps process tracers attached to the exposed cut face', () => {
    expect(source).toContain('WORLD.d * 0.5 - sliceZ * VOXEL + 0.12');
  });

  it('adds persistent directional ribbons and arrowheads behind moving process tracers', () => {
    expect(source).toContain("cnv.dataset.geologyProcessGuideRendering = 'directional-ribbons-and-arrowheads'");
    expect(source).toContain('function addGeologyProcessGuide3d');
    expect(source).toContain('new THREE.TubeGeometry');
    expect(source).toContain('geologyProcessGuideArrowGeometry3d');
    expect(source).toContain('function updateGeologyProcessGuideDepth3d');
  });

  it('builds scene-native tectonic surface relief and clips it with the cutaway', () => {
    expect(source).toContain('function addRuggedGeologyCone3d');
    expect(source).toContain('new THREE.CylinderGeometry');
    expect(source).toContain("landformStyle3d === 'shield-island'");
    expect(source).toContain("landformGeometry3d.setAttribute('color'");
    expect(source).toContain('calderaRatio3d');
    expect(source).toContain('coastVariation3d');
    expect(source).toContain("-3.02, -1.38, 0.78, 0.4");
    expect(source).toContain("'trench-and-volcanic-arc-relief'");
    expect(source).toContain("'luminous-rift-axis-relief'");
    expect(source).toContain("'age-progressive-shield-island-relief'");
    expect(source).toContain('function updateGeologyLandformCutaway3d');
    expect(source).toContain('geologyLandformGeometries3d.forEach');
  });

  it('adds restrained coastal foam and vent atmosphere that follow the modeled surface', () => {
    expect(source).toContain('function addGeologyFoamRibbon3d');
    expect(source).toContain("'animated-wave-caustics-and-coastal-foam'");
    expect(source).toContain('function updateGeologySurfaceEffects3d');
    expect(source).toContain('function addGeologyVolcanicAtmosphere3d');
    expect(source).toContain("'animated-steam-plume-and-incandescent-crater-rim'");
    expect(source).toContain('function updateGeologyVolcanicAtmosphere3d');
    expect(source).toContain('geologySurfaceEffectGeometries3d.forEach');
    expect(source).toContain('geologyVolcanicAtmosphereMaterials3d.forEach');
  });

  it('sculpts tectonic bathymetry and builds a reduced-motion-safe black smoker field', () => {
    expect(source).toContain('function addGeologyTectonicBathymetry3d');
    expect(source).toContain("'sculpted-twin-ridge-shoulders-and-rift-valley'");
    expect(source).toContain("'sculpted-trench-shoulders-and-channel'");
    expect(source).toContain('ridgeBroad3d');
    expect(source).toContain('trenchShoulder3d');
    expect(source).toContain('function addGeologyHydrothermalField3d');
    expect(source).toContain("'rugged-black-smoker-chimneys-and-mineral-plume'");
    expect(source).toContain('function updateGeologyHydrothermalField3d');
    expect(source).toContain('var hydrothermalTime3d = reducedMotion3d ? 0.79 : time3d;');
    expect(source).toContain('geologyHydrothermalGeometries3d.forEach');
  });

  it('reveals a faceted inner core, liquid-core circulation, and a spatial magnetic field', () => {
    expect(source).toContain('function addDeepEarthCoreVisuals3d');
    expect(source).toContain('new THREE.IcosahedronGeometry');
    expect(source).toContain("'faceted-inner-core-liquid-shell-and-geodynamo-streamlines'");
    expect(source).toContain("'three-dimensional-dipole-field-lines'");
    expect(source).toContain('function updateGeologyDeepEarthVisuals3d');
    expect(source).toContain('var deepEarthTime3d = reducedMotion3d ? 0.76 : time3d;');
    expect(source).toContain("'data-geology-deep-earth-legend'");
    expect(source).toContain('Orange-red flow · liquid outer-core convection');
    expect(source).toContain('Blue arcs · magnetic field (schematic)');
    expect(source).toContain('geologyDeepEarthGeometries3d.forEach');
    expect(source).toContain('geologyDeepEarthMaterials3d.forEach');
  });

  it('turns the Deep Earth evidence stage into P- and S-wave ray tracing', () => {
    expect(source).toContain('function addDeepEarthSeismicVisuals3d');
    expect(source).toContain("'p-wave-refraction-s-wave-liquid-core-stop-and-shadow-receivers'");
    expect(source).toContain('geologySeismicPCurves3d');
    expect(source).toContain('geologySeismicSCurves3d');
    expect(source).toContain('function updateGeologySeismicVisuals3d');
    expect(source).toContain('var seismicTime3d = reducedMotion3d ? 0.68 : time3d;');
    expect(source).toContain('geologySeismicGroup3d.visible = deepEarthVisible3d && geologyScienceStage3d === 1;');
    expect(source).toContain('eng.setScienceStage');
    expect(source).toContain('scienceEngine.setScienceStage(sceneJourneyStep)');
    expect(source).toContain('Cyan pulses · P-waves bend and continue');
    expect(source).toContain('Magenta diamonds · S-waves stop at liquid core');
    expect(source).toContain("deepEarthLegendState3d = 'seismic-shadow'");
    expect(source).toContain("'data-geology-science-key': deepEarthScienceKey3d.state");
    expect(source).toContain('P-wave: a compressional pulse that travels through both solid and liquid layers.');
    expect(source).toContain('Receiver cross: no S-wave arrival—evidence that the outer core is liquid.');
    expect(source).toContain('geologySeismicGeometries3d.forEach');
    expect(source).toContain('geologySeismicMaterials3d.forEach');
  });

  it('turns drop-in mode into grounded, Minecraft-style excavation', () => {
    expect(source).toContain("function fpExplorerMode(sceneId) { return sceneId === 'deepEarth' ? 'fly' : 'mine'; }");
    expect(source).toContain('function fpWalkStep(dt, fwd)');
    expect(source).toContain('function fpBodyBlocked(wx, eyeY, wz)');
    expect(source).toContain('FP_GRAVITY = VOXEL * 18');
    expect(source).toContain('function fpMineAtCrosshair(instant, chained)');
    expect(source).toContain('function fpMiningProfile(key, type)');
    expect(source).toContain('function fpToolMiningDuration(profile, tool)');
    expect(source).toContain('function fpUpdateDrill(dt)');
    expect(source).toContain('eng.fpSetTool = fpSetTool');
    expect(source).toContain("'data-geology-tool-selector': 'true'");
    expect(source).toContain("'data-geology-drill-heat': 'true'");
    expect(source).toContain('function fpMaterialPhysics(key)');
    expect(source).toContain("'data-geology-mining-progress': 'true'");
    expect(source).toContain("'data-geology-player-status': 'true'");
    expect(source).toContain('var miningCrackPattern =');
    expect(source).toContain('miningCrackGeometry.setDrawRange');
    expect(source).toContain('function fpHazardNearby');
    expect(source).toContain('fp.safePose =');
    expect(source).toContain('eng.fpRedoMine = fpRedoMine');
    expect(source).toContain('initialExcavation: excavationByWorldRef.current[excavationKey]');
    expect(source).toContain('raycaster.far = FP_REACH');
    expect(source).toContain("'data-geology-mining-reticle': 'true'");
    expect(source).toContain("' ': 'jump+'");
    expect(source).toContain('jump: ax.jump');
    expect(source).toContain('applyFP(fpDt)');
    expect(source).toContain('eng.fpMine = fpMineAtCrosshair');
    expect(source).toContain('eng.fpUndoMine = fpUndoMine');
    expect(source).toContain("key === 'x'");
    expect(source).toContain("key === 'enter'");
    expect(source).toContain("key === 'z'");
    expect(source).toContain("key === 'h'");
    expect(source).toContain("'data-geology-mining-target': 'true'");
    expect(source).toContain("'aria-label': fpTool === 'drill' ? 'Hold to drill continuously' : 'Dig targeted block'");
    expect(source).toContain('now - fp.lastMineAt < 140');
    expect(source).toContain('grounded-collision-jump-and-reticle-mining');
    expect(source).toContain('var FIELD_EXPEDITIONS =');
    expect(source).toContain('function advanceFieldRun');
    expect(source).toContain('onExcavate: function (sample)');
    expect(source).toContain('onFpHome: function ()');
    expect(source).toContain("'data-geology-field-run': 'true'");
    expect(source).toContain("upd('fieldRuns', next)");
    expect(source).toContain('function fieldRankForXp');
    expect(source).toContain('function fpSurveyMaterial');
    expect(source).toContain('var surveySourceGeo = new THREE.BoxGeometry');
    expect(source).toContain('updateSurveyMarker3d()');
    expect(source).toContain('eng.fpSurvey = fpSurveyMaterial');
    expect(source).toContain("'data-geology-field-survey': 'true'");
    expect(source).toContain("'data-geology-field-rank': rank.label");
    expect(source).toContain("key === 'g'");
    expect(source).toContain('function recordFieldDiscovery');
    expect(source).toContain('function fieldDiscoveryProgress');
    expect(source).toContain('discoveredByScene:');
    expect(source).toContain("addNotebookEvidence('specimen'");
    expect(source).toContain("addNotebookEvidence('field-run'");
    expect(source).toContain("'data-geology-field-journal': 'true'");
    expect(source).toContain('function fieldJournalEntries');
    expect(source).toContain('function fieldJournalSummary');
    expect(source).toContain("'data-geology-specimen-journal': SCENE.id");
    expect(source).toContain("'data-geology-journal-entry': entry.key");
    expect(source).toContain("'data-state': 'logged'");
    expect(source).toContain("'data-state': 'unlogged'");
    expect(source).toContain("'data-geology-journal-drop-in': 'true'");
    expect(source).toContain('function beginFieldRun');
    expect(source).toContain('function retireFieldRunEntry');
    expect(source).toContain('function retireFieldRun(sceneId)');
    expect(source).toContain("'data-geology-assignment-board': SCENE.id");
    expect(source).toContain("'data-geology-assignment': assignment.id");
    expect(source).toContain("'data-geology-retire-assignment': 'true'");
    expect(source).toContain("'data-geology-assignment-bank': 'true'");
  });

  it('adds an animated deployable directional core rig and persistent core log', () => {
    expect(source).toContain("renderer.domElement.dataset.geologyCoreRigRendering = 'animated-a-frame-directional-drill-and-core-trail'");
    expect(source).toContain("coreRigGroup3d.name = 'directional-core-rig'");
    expect(source).toContain('function coreRigBeam3d');
    expect(source).toContain('function coreRigStablePad3d');
    expect(source).toContain('function deployCoreRig3d');
    expect(source).toContain('function configureCoreRig3d');
    expect(source).toContain('function startCoreRig3d');
    expect(source).toContain('function updateCoreRig3d(dt3d)');
    expect(source).toContain('function addCoreRigSampleMarker3d');
    expect(source).toContain("excavateVoxel(drilledVoxel3d, 'core-rig')");
    expect(source).toContain('updateCoreRig3d(fpDt)');
    expect(source).toContain('eng.coreRigDeploy = deployCoreRig3d');
    expect(source).toContain('eng.coreRigConfigure = configureCoreRig3d');
    expect(source).toContain('eng.coreRigStart = startCoreRig3d');
    expect(source).toContain('eng.coreRigPack = packCoreRig3d');
    expect(source).toContain('onCoreRigState: function (state)');
    expect(source).toContain('onCoreRigComplete: function (report)');
    expect(source).toContain('function saveCoreRigReport(sceneId, report)');
    expect(source).toContain('coreLogsByScene:');
    expect(source).toMatch(/addNotebookEvidence\(\s*'core-rig'/);
    expect(source).toContain("key === 'r'");
    expect(source).toContain("'data-geology-core-rig-console': 'true'");
    expect(source).toContain("width: 'min(380px, calc(100% - 1rem))'");
    expect(source).toContain("right: 'clamp(.5rem, 4vw, 3.5rem)'");
    expect(source).toContain("calc(100dvh - 5rem)");
    expect(source).toContain('minHeight: isFs ? 0 : (rigDeployed ? 400 : 320)');
    expect(source).toContain("'data-geology-core-cassette': 'journal'");
    expect(source).toContain("'data-geology-core-rig-toggle': 'true'");
    expect(source).toContain("'data-geology-core-rig-progress': 'true'");
    expect(source).toContain("'data-geology-core-rig-heat': 'true'");
    expect(source).toContain("'data-geology-core-log': SCENE.id");
    expect(source).toContain('function coreRigGradeForScore');
    expect(source).toContain('function coreRigEvaluation');
    expect(source).toContain('function coreRigResearchReward');
    expect(source).toContain('function advanceCoreRigResearch');
    expect(source).toContain('coreRigEvaluation(cleanReport)');
    expect(source).toContain('advanceCoreRigResearch(');
    expect(source).toContain('coreResearchByScene:');
    expect(source).toContain("'data-geology-core-grade':");
    expect(source).toContain("'data-geology-core-score':");
    expect(source).toContain("'data-geology-core-research-reward':");
    expect(source).toContain('coreRigFeedGlow3d');
    expect(source).toContain("coreRigState3d.stage = reducedMotion3d ? 'preview' : 'deploying'");
    expect((source.match(/if \(coreRigState3d\.running\) return coreRigError3d\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('coreRigGeometries3d.forEach');
    expect(source).toContain('coreRigMaterials3d.forEach');
  });

  it('lifts each recovered interval into a spoiler-safe surface barrel', () => {
    expect(source).toContain("renderer.domElement.dataset.geologyCoreRecovery = 'spoiler-safe-lift-to-surface-barrel'");
    expect(source).toContain("coreRigReceiverGroup3d.name = 'core-recovery-surface-barrel'");
    expect(source).toContain('var coreRigReceiverSlotCount3d = CORE_RIG_DEPTHS[CORE_RIG_DEPTHS.length - 1]');
    expect(source).toContain('function resetCoreRigReceiver3d');
    expect(source).toContain('function fillCoreRigReceiverSlot3d');
    expect(source).toContain('function beginCoreRigLift3d');
    expect(source).toContain('function updateCoreRigLift3d');
    expect(source).toContain('beginCoreRigLift3d(sample3d, drilledVoxel3d)');
    expect(source).toContain('coreRigLiftState3d.active = !reducedMotion3d');
    expect(source).toContain('fillCoreRigReceiverSlot3d(liftSlotIndex3d, sample3d)');
    expect(source).toContain('resetCoreRigReceiver3d();');

    const liftBody = functionSlice('beginCoreRigLift3d', 'updateCoreRigLift3d');
    expect(liftBody).toContain('sample3d.color');
    expect(liftBody).toContain('worldPos(voxel3d)');
    expect(liftBody).not.toMatch(/trajectoryScan|plannedStop|coreRigState3d\.path|currentVoxel/);

    const updateBody = functionSlice('updateCoreRig3d', 'cancelCoreRig3d');
    expect(updateBody.indexOf('updateCoreRigLift3d(dt3d, coreRigNow3d)')).toBeLessThan(updateBody.indexOf('if (!coreRigState3d.running)'));
    expect(updateBody).not.toMatch(/new THREE\.|\.clone\(\)/);
  });

  it('recovers each core through a pooled mechanical winch and depth-tested steel tether', () => {
    const tetherBody = functionSlice('updateCoreRigRecoveryTether3d', 'updateCoreRigLift3d');
    const liftUpdateBody = functionSlice('updateCoreRigLift3d', 'updateCoreRigPulseRings3d');
    const resetBody = functionSlice('resetCoreRigReceiver3d', 'fillCoreRigReceiverSlot3d');
    const constructionStart = source.indexOf("coreRigRecoveryPulley3d.name = 'core-recovery-winch'");
    const constructionEnd = source.indexOf('var coreRigLiftState3d', constructionStart);
    const constructionBody = source.slice(constructionStart, constructionEnd);

    expect(source).toContain("renderer.domElement.dataset.geologyCoreRecoveryMechanics = 'pooled-winch-tether-and-dock'");
    expect(source).toContain('new THREE.Mesh(coreRigRotor3d.geometry, coreRigSteelMat3d)');
    expect(source).toContain('coreRigRecoveryPulley3d.position.set(0, rigUnit3d * 3.18, rigUnit3d * 0.08)');
    expect(source).toContain('coreRigLiftTransfer3d.set(0, rigUnit3d * 2.97, rigUnit3d * 0.08)');
    expect(source).toContain('new THREE.Mesh(coreRigMotor3d.geometry, coreRigAmberMat3d)');
    expect(source).toContain('new THREE.Mesh(coreRigShaft3d.geometry, coreRigSteelMat3d)');
    expect(constructionBody).not.toMatch(/new THREE\.(?:TorusGeometry|CylinderGeometry|MeshBasicMaterial|MeshStandardMaterial)/);
    expect(constructionBody).not.toContain('coreRigLiftHaloMat3d');

    expect(tetherBody).not.toBe('');
    expect(tetherBody).toContain('coreRigLiftState3d.active && !reducedMotion3d');
    expect(tetherBody).toContain('tetherProgress3d <= 0.7');
    expect(tetherBody).toContain('1 - Math.pow(1 - tetherProgress3d / 0.7, 3)');
    expect(tetherBody).toContain('(tetherTravel3d - coreRigRecoveryPulleyProgress3d) * Math.PI * 2.6');
    expect(tetherBody).toContain('subVectors(coreRigRecoveryHead3d.position, coreRigLiftTransfer3d)');
    expect(tetherBody).not.toContain('subVectors(coreRigLiftMesh3d.position, coreRigLiftTransfer3d)');
    expect(tetherBody).toContain('addScaledVector(coreRigRecoveryTetherVector3d, 0.5)');
    expect(tetherBody).toContain('setFromUnitVectors(coreRigLiftUp3d, coreRigRecoveryTetherVector3d.normalize())');
    expect(tetherBody).toContain('tetherLength3d / (rigUnit3d * 2.6)');
    expect(tetherBody).toContain('coreRigRecoveryPulley3d.rotation.z +=');
    expect(tetherBody).not.toMatch(/new THREE|\.clone\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(|\bSCENE\b|\bROCKS\b|palette|currentVoxel|voxelByKey|sample3d|trajectoryScan|plannedStop|coreRigState3d\.path/);

    const tetherUpdateAt = liftUpdateBody.indexOf('updateCoreRigRecoveryTether3d()');
    const liftReturnAt = liftUpdateBody.indexOf('return coreRigLiftState3d.active');
    expect(tetherUpdateAt).toBeGreaterThan(-1);
    expect(tetherUpdateAt).toBeLessThan(liftReturnAt);
    expect(resetBody).toContain('coreRigRecoveryTether3d.visible = false');
    expect(resetBody).toContain('coreRigRecoveryTether3d.scale.set(0.24, 1, 0.24)');
    expect(resetBody).toContain('coreRigRecoveryPulley3d.rotation.z = 0');
    expect(resetBody).toContain('coreRigRecoveryPulleyProgress3d = 0');
  });

  it('grips and releases recovered cores with a pooled wireline overshot', () => {
    const headBody = functionSlice('updateCoreRigRecoveryHead3d', 'updateCoreRigDockClamp3d');
    const headResetBody = functionSlice('resetCoreRigRecoveryHead3d', 'positionCoreRigDockClamp3d');
    const beginBody = functionSlice('beginCoreRigLift3d', 'updateCoreRigRecoveryHead3d');
    const tetherBody = functionSlice('updateCoreRigRecoveryTether3d', 'updateCoreRigLift3d');
    const liftBody = functionSlice('updateCoreRigLift3d', 'updateCoreRigPulseRings3d');
    const receiverResetBody = functionSlice('resetCoreRigReceiver3d', 'fillCoreRigReceiverSlot3d');
    const clearBody = functionSlice('clearCoreRigBoreMarkers3d', 'coreRigLocalDirection3d');
    const packBody = functionSlice('packCoreRig3d', 'fpCompleteMining');
    const snapshotBody = functionSlice('coreRigSnapshot3d', 'updateCoreRigHudDom3d');
    const constructionStart = source.indexOf('var coreRigRecoveryHead3d = new THREE.Group()');
    const constructionEnd = source.indexOf('// A pooled spring clamp', constructionStart);
    const constructionBody = source.slice(constructionStart, constructionEnd);

    expect(source).toContain("renderer.domElement.dataset.geologyCoreRecoveryLatch = 'pooled-overshot-tension-and-release'");
    expect(source.match(/var coreRigRecoveryHead3d = new THREE\.Group\(\)/g) || []).toHaveLength(1);
    expect(constructionStart).toBeGreaterThan(-1);
    expect(constructionEnd).toBeGreaterThan(constructionStart);
    expect(constructionBody).toContain("coreRigRecoveryHead3d.name = 'core-recovery-overshot'");
    expect(constructionBody).toContain('coreRigGroup3d.add(coreRigRecoveryHead3d)');
    expect(constructionBody.match(/new THREE\.Mesh\(coreRigRotor3d\.geometry, coreRigSteelMat3d\)/g) || []).toHaveLength(1);
    expect(constructionBody.match(/new THREE\.Mesh\(coreRigShaft3d\.geometry, coreRigAmberMat3d\)/g) || []).toHaveLength(2);
    expect(constructionBody).toContain('coreRigRecoveryHeadOffset3d = new THREE.Vector3');
    expect(constructionBody).toContain('coreRigRecoveryHeadTransfer3d = new THREE.Vector3()');
    expect(constructionBody).toContain('coreRigRecoveryHeadTransferQuaternion3d = new THREE.Quaternion()');
    expect(constructionBody).not.toMatch(/new THREE\.(?:[A-Za-z]+Geometry|[A-Za-z]+Material)\(/);
    expect(constructionBody).not.toMatch(/coreRigLiftHaloMat3d|coreRigCyanMat3d|coreRigBoreMat3d/);

    expect(beginBody).toContain('coreRigRecoveryHeadTransferQuaternion3d.copy(coreRigLiftStartQuaternion3d).slerp(coreRigLiftDockQuaternion3d, 0.784)');
    expect(beginBody).toContain('coreRigRecoveryHeadOffset3d.set(0, rigUnit3d * 0.19, 0).applyQuaternion(coreRigRecoveryHeadTransferQuaternion3d)');
    expect(beginBody).toContain('coreRigRecoveryHeadTransfer3d.copy(coreRigLiftTransfer3d).add(coreRigRecoveryHeadOffset3d)');

    expect(headBody).not.toBe('');
    expect(headBody).toContain('coreRigLiftState3d.active && !reducedMotion3d');
    expect(headBody).toContain('headProgressValue3d < 0.9');
    const inactiveAt = headBody.indexOf('if (!headActive3d)');
    const sineAt = headBody.indexOf('Math.sin');
    expect(inactiveAt).toBeGreaterThan(-1);
    expect(inactiveAt).toBeLessThan(sineAt);
    expect(headBody).toContain('var headAtTransfer3d = safeHeadProgress3d > 0.7');
    expect(headBody).toContain('coreRigRecoveryHead3d.position.copy(coreRigLiftMesh3d.position).add(coreRigRecoveryHeadOffset3d)');
    expect(headBody).toContain('coreRigRecoveryHead3d.quaternion.copy(coreRigLiftMesh3d.quaternion)');
    expect(headBody).toContain('coreRigRecoveryHead3d.position.copy(coreRigRecoveryHeadTransfer3d)');
    expect(headBody).toContain('coreRigRecoveryHead3d.quaternion.copy(coreRigRecoveryHeadTransferQuaternion3d)');
    expect(headBody).toContain('(safeHeadProgress3d - 0.7) / 0.18');
    expect(headBody).toContain('headRelease3d * headRelease3d * (3 - 2 * headRelease3d)');
    expect(headBody).toContain('coreRigRecoveryHeadJawClosed3d - coreRigRecoveryHeadJawOpen3d');
    expect(headBody).toContain('coreRigRecoveryHeadJawLeft3d.position.set(-headJawGap3d');
    expect(headBody).toContain('coreRigRecoveryHeadJawRight3d.position.set(headJawGap3d');
    expect(headBody).toContain('coreRigRecoveryHead3d.scale.set(');
    expect(headBody).not.toMatch(/new THREE|\.clone\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(|Array\.from|setTimeout|setInterval|requestAnimationFrame|Date\.now|performance\.now/);
    expect(headBody).not.toMatch(/\.(?:material|color|emissive|opacity)\b|\bSCENE\b|\bROCKS\b|palette|currentVoxel|voxelByKey|worldPos|sample3d|\.sample\b|samples|trajectoryScan|plannedStop|coreRigState3d\.path|excavateVoxel/);
    expect(headBody).not.toMatch(/(?:position|rotation|scale)[^;\n]*\+=/);

    expect(tetherBody).toContain('subVectors(coreRigRecoveryHead3d.position, coreRigLiftTransfer3d)');
    expect(tetherBody).not.toContain('subVectors(coreRigLiftMesh3d.position, coreRigLiftTransfer3d)');
    expect(tetherBody).not.toMatch(/new THREE|\.clone\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(/);

    const liftPoseAt = liftBody.indexOf('coreRigLiftMesh3d.quaternion.copy(coreRigLiftStartQuaternion3d)');
    const headUpdateAt = liftBody.indexOf('updateCoreRigRecoveryHead3d(liftProgress3d)');
    const tetherUpdateAt = liftBody.indexOf('updateCoreRigRecoveryTether3d()');
    const liftReturnAt = liftBody.indexOf('return coreRigLiftState3d.active');
    expect(liftPoseAt).toBeGreaterThan(-1);
    expect(liftPoseAt).toBeLessThan(headUpdateAt);
    expect(headUpdateAt).toBeLessThan(tetherUpdateAt);
    expect(tetherUpdateAt).toBeLessThan(liftReturnAt);

    expect(headResetBody).toContain('coreRigRecoveryHead3d.visible = false');
    expect(headResetBody).toContain('coreRigRecoveryHead3d.position.set(0, 0, 0)');
    expect(headResetBody).toContain('coreRigRecoveryHead3d.quaternion.identity()');
    expect(headResetBody).toContain('coreRigRecoveryHead3d.scale.set(1, 1, 1)');
    expect(headResetBody).toContain('coreRigRecoveryHeadTransfer3d.set(0, 0, 0)');
    expect(headResetBody).toContain('coreRigRecoveryHeadTransferQuaternion3d.identity()');
    expect(headResetBody).toContain('-coreRigRecoveryHeadJawOpen3d');
    expect(headResetBody).toContain('coreRigRecoveryHeadJawOpen3d, -rigUnit3d * 0.11');
    expect(receiverResetBody).toContain('resetCoreRigRecoveryHead3d()');
    expect(clearBody).toContain('resetCoreRigReceiver3d()');
    expect(packBody).toContain('clearCoreRigBoreMarkers3d()');
    expect(snapshotBody).not.toMatch(/RecoveryHead|RecoveryLatch|overshot/i);
  });

  it('catches recovered cores with a pooled spring clamp and bounded barrel recoil', () => {
    const clampBody = functionSlice('updateCoreRigDockClamp3d', 'updateCoreRigRecoveryTether3d');
    const liftUpdateBody = functionSlice('updateCoreRigLift3d', 'updateCoreRigPulseRings3d');
    const resetBody = functionSlice('resetCoreRigReceiver3d', 'fillCoreRigReceiverSlot3d');
    const beginBody = functionSlice('beginCoreRigLift3d', 'updateCoreRigDockClamp3d');
    const positionBody = functionSlice('positionCoreRigDockClamp3d', 'resetCoreRigReceiver3d');
    const constructionStart = source.indexOf('var coreRigDockClamp3d = new THREE.Group()');
    const constructionEnd = source.indexOf('var coreRigLiftState3d', constructionStart);
    const constructionBody = source.slice(constructionStart, constructionEnd);

    expect(source).toContain("renderer.domElement.dataset.geologyCoreDock = 'pooled-spring-clamp-catch'");
    expect(source.match(/var coreRigDockClamp3d = new THREE\.Group\(\)/g) || []).toHaveLength(1);
    expect(constructionBody).toContain("coreRigDockClamp3d.name = 'core-recovery-dock-clamp'");
    expect(constructionBody).toContain('coreRigDockClampOpen3d');
    expect(constructionBody).toContain('coreRigDockClampClosed3d');
    expect(constructionBody.match(/new THREE\.Mesh\(coreRigShaft3d\.geometry, coreRigAmberMat3d\)/g) || []).toHaveLength(2);
    expect(constructionBody).toContain('coreRigReceiverGroup3d.add(coreRigDockClamp3d)');
    expect(constructionBody).not.toMatch(/new THREE\.(?:[A-Za-z]+Geometry|[A-Za-z]+Material)\(/);

    expect(positionBody).toContain('coreRigDockClamp3d.position.copy(slot3d.position)');
    expect(positionBody).not.toMatch(/sample3d|trajectoryScan|plannedStop|currentVoxel|voxelByKey|\bSCENE\b|\bROCKS\b|palette/);
    expect(beginBody).toContain('positionCoreRigDockClamp3d(liftSlot3d)');
    expect(beginBody).toContain('coreRigReceiverGroup3d.position.y = coreRigReceiverRestY3d');
    expect(beginBody.indexOf('coreRigReceiverGroup3d.position.y = coreRigReceiverRestY3d')).toBeLessThan(beginBody.indexOf('coreRigLiftDock3d.copy(coreRigReceiverGroup3d.position)'));

    expect(clampBody).toContain('coreRigLiftState3d.active || dockFlashing3d || coreRigReceiverNext3d.visible');
    expect(clampBody).toContain('if (reducedMotion3d) clampLatch3d = 1');
    expect(clampBody).toContain('coreRigLiftState3d.dockFlashUntil - now3d');
    expect(clampBody).toContain('clampCatchProgress3d * 4.2');
    expect(clampBody).toContain('clampImpactProgress3d * Math.PI');
    expect(clampBody).toContain('coreRigReceiverRestY3d - clampRecoil3d');
    expect(clampBody).toContain('clampRecoil3d = clampImpact3d * rigUnit3d * 0.055');
    expect(clampBody).toContain('coreRigDockClampClosed3d - coreRigDockClampOpen3d');
    expect(clampBody.indexOf('if (reducedMotion3d)')).toBeLessThan(clampBody.indexOf('Math.sin'));
    expect(clampBody).not.toMatch(/new THREE|\.clone\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(|setTimeout|setInterval|requestAnimationFrame|performance\.now|Date\.now/);
    expect(clampBody).not.toMatch(/\.(?:material|color|emissive|opacity)\b|\bSCENE\b|\bROCKS\b|palette|trajectoryScan|plannedStop|currentVoxel|voxelByKey|sample3d|coreRigState3d\.path/);

    const flashAt = liftUpdateBody.indexOf('var dockFlashing3d');
    const clampAt = liftUpdateBody.indexOf('updateCoreRigDockClamp3d(now3d, dockFlashing3d)');
    const tetherAt = liftUpdateBody.indexOf('updateCoreRigRecoveryTether3d()');
    const returnAt = liftUpdateBody.indexOf('return coreRigLiftState3d.active');
    expect(flashAt).toBeGreaterThan(-1);
    expect(clampAt).toBeGreaterThan(flashAt);
    expect(clampAt).toBeLessThan(tetherAt);
    expect(tetherAt).toBeLessThan(returnAt);

    expect(resetBody).toContain('coreRigReceiverGroup3d.position.y = coreRigReceiverRestY3d');
    expect(resetBody).toContain('positionCoreRigDockClamp3d(coreRigReceiverSlots3d.length ? coreRigReceiverSlots3d[0] : null)');
    expect(resetBody).toContain('coreRigDockClampTop3d.position.set(0, coreRigDockClampOpen3d, 0)');
    expect(resetBody).toContain('coreRigDockClampBottom3d.position.set(0, -coreRigDockClampOpen3d, 0)');
    expect(resetBody).toContain('coreRigDockClamp3d.scale.setScalar(1)');
  });

  it('choreographs pooled pulse rings through every drill phase without spoilers or frame allocations', () => {
    const pulseBody = functionSlice('updateCoreRigPulseRings3d', 'updateCoreRig3d');
    const updateBody = functionSlice('updateCoreRig3d', 'cancelCoreRig3d');
    const packBody = functionSlice('packCoreRig3d', 'fpCompleteMining');

    expect(source).toContain("renderer.domElement.dataset.geologyCorePulse = 'phase-aware-pooled-pressure-rings'");
    expect(source).toContain('var coreRigPulseRings3d = []');
    expect(source).toContain('rigRingIndex3d < 3');
    expect(source).toContain('var coreRigPulseMat3d = coreRigMaterial3d');
    expect(source).toContain('coreRigPulseMat3d, 0, rigUnit3d * 0.38');
    expect(pulseBody).not.toBe('');
    expect(pulseBody).toContain('for (var index3d = 0; index3d < coreRigPulseRings3d.length; index3d++)');

    const reducedAt = pulseBody.indexOf('if (!motion3d)');
    const recoveryAt = pulseBody.indexOf('if (recovering3d)');
    const finishedAt = pulseBody.indexOf('if (finished3d)', recoveryAt);
    const drillingAt = pulseBody.indexOf('if (coreRigState3d.running)');
    const deployingAt = pulseBody.indexOf("if (stage3d === 'deploying')");
    expect(reducedAt).toBeGreaterThan(-1);
    expect(reducedAt).toBeLessThan(recoveryAt);
    const reducedSlice = pulseBody.slice(reducedAt, recoveryAt);
    expect(reducedSlice).toContain('guideLength3d * ((index3d + 1) / 4)');
    expect(reducedSlice).toContain('ring3d.scale.setScalar(1)');
    expect(reducedSlice).not.toMatch(/%|Math\.sin|Math\.cos|deployEase3d|progress3d|\.lerp\(/);
    expect(recoveryAt).toBeGreaterThan(-1);
    expect(recoveryAt).toBeLessThan(finishedAt);
    expect(finishedAt).toBeLessThan(drillingAt);
    expect(drillingAt).toBeLessThan(deployingAt);

    expect(pulseBody).toContain('coreRigGuideStart3d).lerp(coreRigGuideEnd3d, trail3d)');
    expect(pulseBody).toContain('coreRigReceiverGroup3d.position');
    expect(pulseBody).toContain('rippleStart3d');
    expect(pulseBody).toContain('!motion3d || !celebrating3d || rippleProgress3d >= 1');
    expect(pulseBody).toContain('ring3d.scale.setScalar(motion3d ?');
    expect(pulseBody).toContain('var previewPhase3d = motion3d ? ((t * 0.55');
    expect(pulseBody).toContain('coreRigPulseQuaternion3d.setFromUnitVectors');
    expect(pulseBody).toContain('ring3d.quaternion.copy(coreRigPulseQuaternion3d)');
    expect((pulseBody.match(/setFromUnitVectors/g) || []).length).toBe(1);
    expect(pulseBody).not.toMatch(/new THREE|\.clone\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(|\bSCENE\b|\bROCKS\b|palette|currentVoxel|voxelByKey|sample3d|coreRigRecoveryTone3d|trajectoryScan|plannedStop|coreRigState3d\.path/);

    const liftAt = updateBody.indexOf('updateCoreRigLift3d');
    const pulseAt = updateBody.indexOf('updateCoreRigPulseRings3d');
    const nonRunningAt = updateBody.indexOf('if (!coreRigState3d.running)');
    expect(liftAt).toBeGreaterThan(-1);
    expect(liftAt).toBeLessThan(pulseAt);
    expect(pulseAt).toBeLessThan(nonRunningAt);
    const pulseCall = updateBody.slice(pulseAt, updateBody.indexOf(');', pulseAt) + 2);
    expect(pulseCall).not.toContain('trajectoryPulseRate3d');
    expect(pulseCall).toContain('coreRigRecoveryTone3d != null ? coreRigRecoveryTone3d : activeTone3d');
    expect(updateBody).toContain('coreRigCyanMat3d.color.setHex(activeTone3d)');
    expect(updateBody).not.toContain('var pulse3d = motion3d ? 0.88');

    expect(packBody).toContain('packedRingIndex3d < coreRigPulseRings3d.length');
    expect(packBody).toContain('coreRigPulseRings3d[packedRingIndex3d].scale.setScalar(1)');
  });

  it('turns drilling pressure into pooled torque-collar compression and axial thrust', () => {
    const loadBody = functionSlice('updateCoreRigLoadCouplers3d', 'updateCoreRigContact3d');
    const resetBody = functionSlice('resetCoreRigLoadCouplers3d', 'clearCoreRigBoreMarkers3d');
    const clearBody = functionSlice('clearCoreRigBoreMarkers3d', 'coreRigLocalDirection3d');
    const updateBody = functionSlice('updateCoreRig3d', 'cancelCoreRig3d');
    const constructionStart = source.indexOf('var coreRigLoadCouplers3d = []');
    const constructionEnd = source.indexOf('var coreRigGuideGeo3d', constructionStart);
    const constructionBody = source.slice(constructionStart, constructionEnd);

    expect(source).toContain("renderer.domElement.dataset.geologyCoreDrillLoadMechanics = 'pooled-torque-collars-and-axial-thrust'");
    expect(constructionStart).toBeGreaterThan(-1);
    expect(constructionEnd).toBeGreaterThan(constructionStart);
    expect(constructionBody).toContain('loadCouplerIndex3d < 3');
    expect(constructionBody).toContain('new THREE.Group()');
    expect(constructionBody).toContain('new THREE.Mesh(coreRigRotor3d.geometry, coreRigAmberMat3d)');
    expect(constructionBody).toContain('new THREE.Mesh(coreRigShaft3d.geometry, coreRigSteelMat3d)');
    expect(constructionBody).toContain("loadCoupler3d.name = 'core-load-coupler-'");
    expect(constructionBody).toContain('coreRigAssembly3d.add(loadCoupler3d)');
    expect(constructionBody).not.toMatch(/new THREE\.[A-Za-z]+Geometry|new THREE\.[A-Za-z]+Material/);

    expect(loadBody).not.toBe('');
    ['Hard', 'Dense', 'Crystalline', 'Loose'].forEach((label) => expect(loadBody).toContain("formationLoad === '" + label + "'"));
    expect(loadBody).toContain('coreRigState3d.intervalStress');
    expect(loadBody).toContain('Number(feedSpeed3d)');
    expect(loadBody).toContain("coreRigState3d.stage !== 'cooling'");
    expect(loadBody).toContain('!scanning3d');
    expect(loadBody).toContain('Math.exp(-safeLoadDt3d');
    expect(loadBody).toContain('loadSpacing3d = rigUnit3d * (0.24 - coreRigLoadCompression3d * 0.08)');
    expect(loadBody).toContain('activeCoupler3d.position.y =');
    expect(loadBody).toContain('activeCoupler3d.scale.set(');
    expect(loadBody).toContain('return coreRigLoadCompression3d');
    const reducedAt = loadBody.indexOf('if (!motion3d)');
    const spinAt = loadBody.indexOf('activeCoupler3d.rotation.y +=');
    expect(reducedAt).toBeGreaterThan(-1);
    expect(spinAt).toBeGreaterThan(reducedAt);
    expect(loadBody.slice(reducedAt, spinAt)).toContain('loadIndex3d * Math.PI * 0.66');
    expect(loadBody).not.toMatch(/new THREE|\.clone\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(|\bSCENE\b|\bROCKS\b|palette|currentVoxel|voxelByKey|sample3d|samples|trajectoryScan|plannedStop|coreRigState3d\.path/);
    expect(loadBody).not.toMatch(/\.(?:material|color|emissive|opacity)\b/);

    expect(resetBody).toContain('coreRigLoadCompression3d = 0');
    expect(resetBody).toContain('resetCoupler3d.position.set(');
    expect(resetBody).toContain('resetCoupler3d.rotation.set(');
    expect(resetBody).toContain('resetCoupler3d.scale.set(1, 1, 1)');
    expect(clearBody).toContain('resetCoreRigLoadCouplers3d()');

    const contactAt = updateBody.indexOf('updateCoreRigContact3d');
    const loadAt = updateBody.indexOf('updateCoreRigLoadCouplers3d');
    const assemblyAt = updateBody.indexOf('coreRigAssembly3d.position.copy');
    const thrustAt = updateBody.indexOf('addScaledVector(assemblyDirection3d, rigUnit3d * 0.08 * rigLoadCompression3d)');
    const nonRunningAt = updateBody.indexOf('if (!coreRigState3d.running)');
    expect(contactAt).toBeLessThan(loadAt);
    expect(loadAt).toBeLessThan(assemblyAt);
    expect(assemblyAt).toBeLessThan(thrustAt);
    expect(thrustAt).toBeLessThan(nonRunningAt);
    expect(updateBody).toContain("coreRigState3d.running && motion3d && !scanning3d && coreRigState3d.stage !== 'cooling'");
    expect(updateBody).toContain('0.004 + rigLoadCompression3d * 0.016');
  });

  it('grounds drilling with a depth-tested pressure collar at the physical bit face', () => {
    const contactBody = functionSlice('updateCoreRigContact3d', 'updateCoreRig3d');
    const updateBody = functionSlice('updateCoreRig3d', 'cancelCoreRig3d');
    const packBody = functionSlice('packCoreRig3d', 'fpCompleteMining');

    expect(source).toContain("renderer.domElement.dataset.geologyCoreContact = 'depth-tested-bit-pressure-collar'");
    expect(source).toContain('var coreRigContactMat3d = coreRigMaterial3d');
    expect(source).toContain('depthTest: true, depthWrite: false');
    expect(source).toContain('var coreRigContact3d = coreRigMesh3d(new THREE.TorusGeometry');
    expect(contactBody).not.toBe('');
    expect(contactBody).toContain('coreRigContact3d.visible = !!coreRigState3d.running');
    expect(contactBody).toContain('coreRigGuideStart3d).lerp(coreRigGuideEnd3d, contactProgress3d)');
    expect(contactBody).toContain('addScaledVector(coreRigPulseDirection3d, -VOXEL * 0.46)');
    expect(contactBody).toContain('coreRigState3d.intervalStress');
    expect(contactBody).toContain('motion3d && !scanning3d');
    expect(contactBody).toContain(': 1;');
    expect(contactBody).not.toMatch(/new THREE|\.clone\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(|\bSCENE\b|\bROCKS\b|palette|currentVoxel|voxelByKey|sample3d|trajectoryScan|plannedStop|coreRigState3d\.path/);

    const pulseAt = updateBody.indexOf('updateCoreRigPulseRings3d');
    const contactAt = updateBody.indexOf('updateCoreRigContact3d');
    const nonRunningAt = updateBody.indexOf('if (!coreRigState3d.running)');
    expect(pulseAt).toBeLessThan(contactAt);
    expect(contactAt).toBeLessThan(nonRunningAt);
    expect(packBody).toContain('coreRigContact3d.visible = false');
    expect(packBody).toContain('coreRigContact3d.scale.setScalar(1)');
  });

  it('keeps recovered cassette labels readable without an endless recovery pulse', () => {
    const journalBody = functionSlice('fieldJournalPanel', 'coreRigConsole');
    const consoleBody = functionSlice('coreRigConsole', 'fpSet');
    expect(journalBody).toContain('bg-slate-950/70');
    expect(consoleBody).toContain('bg-slate-950/70');
    expect(consoleBody).toContain('ring-emerald-200/80');
    expect(consoleBody).not.toMatch(/newestRecovery\s*\?[^:]*animate-pulse/);
    expect(consoleBody).toContain("key: 'load', className: 'min-w-0 leading-snug'");
    expect(consoleBody).toContain("key: 'quality', className: 'min-w-0 leading-snug'");
  });

  it('adds adaptive feed, coolant, sample-quality, and trajectory-challenge controls', () => {
    expect(source).toContain('function coreRigFeedProfile');
    expect(source).toContain('function coreRigFormationLoad');
    expect(source).toContain('function coreRigIntegrityLoss');
    expect(source).toContain('function coreRigIntegrityFromStress');
    expect(source).toContain('function coreRigQualitySummary');
    expect(source).toContain('function coreRigChallengeProgress');
    expect(source).toContain('coreRigFeedModes: function ()');
    expect(source).toContain('eng.coreRigSetFeedMode = setCoreRigFeedMode3d;');
    expect(source).toContain('eng.coreRigCoolant = useCoreRigCoolant3d;');
    expect(source).toContain("'data-geology-core-feed-control': 'true'");
    expect(source).toContain("'data-geology-core-feed-mode': modeId");
    expect(source).toContain("'data-geology-core-coolant': coreRigHud.coolantRemaining");
    expect(source).toContain('integrity: intervalIntegrity3d');
    expect(source).toContain('cleanSample.integrity = Math.max');
    expect(source).toContain('var quality = coreRigQualitySummary(report && report.samples);');
    expect(source).toContain("'data-geology-core-review': coreLog.id");
    expect(source).toContain("'aria-pressed': logSelected ? 'true' : 'false'");
    expect(source).toContain('function loadCoreRigChallenge(report)');
    expect(source).toContain("'data-geology-core-load-trajectory': 'true'");
    expect(source).toContain("'data-geology-core-challenge': challengeProgress.state");
    expect(source).toContain("'data-geology-core-cassette': 'console'");
    expect(source).toContain("'data-geology-core-quality-glyph': cassetteSlot.quality");
    expect(source).toContain('ref: coreRigConsoleRef, tabIndex: -1');
    expect(source).toContain('coreRigConsoleRef.current.focus()');
  });

  it('adds a non-punitive formation-scan beat with accessible interval feedback', () => {
    ['coreRigIntervalScanMs', 'coreRigIntervalScanning', 'coreRigIntervalFeedback', 'coreRigFormationCue'].forEach((helper) => {
      expect(source).toContain('function ' + helper);
      expect(source).toContain(helper + ': ' + helper);
    });
    expect(source).toContain('var CORE_RIG_INTERVAL_SCAN_MS = 700;');
    expect(source).toContain('scanUntil: 0, lastIntervalResult: null');
    expect(source).toContain('coreRigState3d.scanUntil = Date.now() + CORE_RIG_INTERVAL_SCAN_MS');
    expect(source).toContain('coreRigIntervalFeedback(sample3d.name, intervalIntegrity3d');
    expect(source).toContain('lastIntervalResult: coreRigState3d.lastIntervalResult ? Object.assign({}, coreRigState3d.lastIntervalResult) : null');

    const snapshotBody = source.slice(source.indexOf('function coreRigSnapshot3d()'), source.indexOf('function updateCoreRigHudDom3d()'));
    expect(snapshotBody).toContain('scanning: coreRigIntervalScanning(');
    expect(snapshotBody).toContain('formationCue: coreRigState3d.running && coreRigState3d.currentVoxel');
    expect(snapshotBody).not.toContain('scanUntil: coreRigState3d.scanUntil');

    const updateBody = source.slice(source.indexOf('function updateCoreRig3d(dt3d)'), source.indexOf('function cancelCoreRig3d()'));
    const scanGuard = updateBody.indexOf('if (scanning3d) {');
    const advancement = updateBody.indexOf('coreRigState3d.currentElapsed +=');
    expect(scanGuard).toBeGreaterThan(-1);
    expect(advancement).toBeGreaterThan(scanGuard);
    expect(updateBody.slice(scanGuard, advancement)).toContain('return;');
    expect(updateBody).toContain('var scanTone3d');

    expect(source.split('coreRigState3d.scanUntil = 0').length - 1).toBeGreaterThanOrEqual(5);
    expect(source.split('coreRigState3d.lastIntervalResult = null').length - 1).toBeGreaterThanOrEqual(4);
    expect(source).toContain("'data-geology-core-interval-scan': rigScanning ? 'active' : 'idle'");
    expect(source).toContain("'data-geology-core-interval-result': rigIntervalResult.tier");
    const cueMarker = source.indexOf("'data-geology-core-formation-cue': 'true'");
    expect(cueMarker).toBeGreaterThan(-1);
    expect(source.slice(cueMarker - 180, cueMarker + 80)).toContain("role: 'status'");
    expect(source.slice(cueMarker - 180, cueMarker + 80)).toContain("'aria-live': 'polite'");
  });

  it('adds a spoiler-safe trajectory scan and persistent three-seal Bore Brief', () => {
    ['coreRigTrajectoryScan', 'coreRigTrajectorySnapshot', 'coreRigTrajectorySummary', 'coreRigBoreBrief'].forEach((helper) => {
      expect(source).toContain('function ' + helper);
      expect(source).toContain(helper + ': ' + helper);
    });

    const plannerBody = source.slice(source.indexOf('function planCoreRigPath3d()'), source.indexOf('function coreRigError3d('));
    expect(plannerBody).toContain('scanEntries3d.push({ key: voxel3d && voxel3d.key, type: material3d && material3d.type })');
    expect(plannerBody).toContain('coreRigState3d.trajectoryScan = coreRigTrajectoryScan(');
    expect(plannerBody).not.toMatch(/fieldExpedition|rigTarget|objectiveEcho|targetPresent/);
    expect(source).not.toContain('Existing bore detected · choose another trajectory');

    const scanBody = source.slice(source.indexOf('function coreRigTrajectoryScan('), source.indexOf('function coreRigTrajectorySnapshot('));
    expect(scanBody).toContain("var counts = { preserve: 0, cruise: 0, torque: 0 }");
    expect(scanBody).not.toMatch(/loadBands|orderedDepths|targetPresent|objectiveEcho/);
    const resultBody = source.slice(source.indexOf('function coreRigTrajectoryResult('), source.indexOf('function coreRigTrajectoryScan('));
    expect(resultBody).toContain('loadCounts: counts');
    expect(resultBody).not.toMatch(/\bkey:\s|\btype:\s|\bname:\s|\bcolor:\s|\bx:\s|\by:\s|\bz:\s/);

    const snapshotBody = source.slice(source.indexOf('function coreRigSnapshot3d()'), source.indexOf('function updateCoreRigHudDom3d()'));
    expect(snapshotBody).toContain('coreRigTrajectorySnapshot(coreRigState3d.trajectoryScan)');
    expect(snapshotBody).toContain('boreBrief: trajectoryScan3d ? coreRigBoreBrief(');
    expect(snapshotBody).not.toContain('plannedStop:');
    expect(source).toContain('trajectoryScan: null');
    expect(source.split('coreRigState3d.trajectoryScan = null').length - 1).toBeGreaterThanOrEqual(3);

    expect(source).toContain("var trajectoryRisk3d = coreRigState3d.trajectoryScan ? coreRigState3d.trajectoryScan.riskLevel : 'limited'");
    expect(source).toContain("var trajectoryPulseRate3d = trajectoryVariability3d === 'volatile'");
    expect(source).toContain('coreRigGuideMat3d.color.setHex(targetTone3d)');

    expect(source).toContain("'data-geology-core-trajectory-scan': rigTrajectory.riskLevel");
    expect(source).toContain("'data-geology-core-bore-brief': rigBrief.finished ? 'finished' : 'active'");
    expect(source).toContain("'data-geology-core-load-mix': modeId");
    expect(source).toContain("'data-geology-core-objective': objective.id");
    expect(source).toContain("'data-state': objective.state");
    expect(source).toContain("'aria-label': 'Bore Brief objectives'");
    expect(source).toContain("'data-geology-core-brief-summary': rigBrief.metCount");
    expect(source).toContain("'data-geology-core-brief-badge': latestCoreLog.boreBrief.metCount");
    expect(source).toContain('cleanReport.boreBrief = coreRigBoreBrief(');
    expect(source).toContain("' · Brief ' + cleanReport.boreBrief.metCount + '/3'");

    const briefMarker = source.indexOf("'data-geology-core-brief-summary': rigBrief.metCount");
    const briefSnippet = source.slice(briefMarker - 180, briefMarker + 120);
    expect(briefSnippet).not.toContain("role: 'status'");
    expect(briefSnippet).not.toContain("'aria-live'");
    expect(briefSnippet).not.toContain("'aria-atomic'");
    expect(source).toContain("'Bore Brief ' + cleanReport.boreBrief.metCount + ' of 3 complete. '");
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('declares and exports the bounded paired-bore experiment helpers', () => {
    [
      'coreRigCoreCassette',
      'coreRigCompressedCore',
      'coreRigCompareReports',
      'coreRigNextExperiment',
    ].forEach((helper) => {
      expect(source).toMatch(new RegExp(`function\\s+${helper}\\s*\\(`));
      expect(source).toMatch(new RegExp(`\\b${helper}\\s*:\\s*${helper}\\b`));
    });
  });

  it('persists the post-bore comparison and next experiment with each saved report', () => {
    const saveBody = functionSlice('saveCoreRigReport', 'startFieldRun');
    expect(saveBody).not.toBe('');
    expect(saveBody).toMatch(/cleanReport\s*\.\s*comparison\s*=\s*coreRigCompareReports\s*\(/);
    expect(saveBody).toMatch(/cleanReport\s*\.\s*nextExperiment\s*=\s*coreRigNextExperiment\s*\(/);

    const comparisonIndex = saveBody.search(/cleanReport\s*\.\s*comparison\s*=/);
    const experimentIndex = saveBody.search(/cleanReport\s*\.\s*nextExperiment\s*=/);
    const persistenceIndex = saveBody.search(/logs\s*\.\s*push\s*\(\s*cleanReport\s*\)/);
    expect(comparisonIndex).toBeGreaterThan(-1);
    expect(experimentIndex).toBeGreaterThan(comparisonIndex);
    expect(persistenceIndex).toBeGreaterThan(experimentIndex);
  });

  it('loads a next experiment through the public program catalog without hidden-world inputs', () => {
    const loaderBody = functionSlice('loadCoreRigProgram', 'loadCoreRigChallenge');
    expect(loaderBody).not.toBe('');
    expect(loaderBody).toMatch(/function\s+loadCoreRigProgram\s*\(\s*program\s*,\s*experiment\s*\)/);
    expect(loaderBody).toMatch(/\bexperiment\b/);
    expect(loaderBody).toMatch(/applyCoreRigTrajectory\s*\(\s*catalogProgram\s*\.\s*angle\s*,\s*catalogProgram\s*\.\s*depth\s*\)/);
    expect(loaderBody).not.toMatch(/samples?|path|origin|voxel|plannedStop/i);
    expect(loaderBody).not.toMatch(/planned\s+stop/i);
  });

  it('uses phase-aware rig panels so time-critical controls stay legible', () => {
    const consoleBody = functionSlice('coreRigConsole', 'fpSet');
    expect(consoleBody).not.toBe('');
    expect(consoleBody).toMatch(/\bvar\s+rigPreview\s*=/);
    expect(consoleBody).toMatch(/\bvar\s+rigFinished\s*=/);

    [
      "key: 'config'",
      "'data-geology-core-bore-brief'",
      "key: 'cert-status'",
      "'data-geology-core-program-challenge'",
    ].forEach((marker) => {
      expect(consoleBody).toContain(marker);
      expect(markerLead(consoleBody, marker)).toMatch(/\brigPreview\b\s*(?:&&|\?)/);
    });

    const operatorMarker = "'data-geology-core-feed-control'";
    expect(consoleBody).toContain(operatorMarker);
    expect(markerLead(consoleBody, operatorMarker)).toMatch(/!\s*rigFinished\b\s*(?:&&|\?)/);
  });

  it('renders a spoiler-safe, accessible core cassette with visible recovery feedback', () => {
    const cassetteHelper = functionSlice('coreRigCoreCassette', 'coreRigCompressedCore');
    expect(cassetteHelper).not.toBe('');
    expect(cassetteHelper).toMatch(/['"]pending['"]/);

    const cassetteMarker = source.indexOf("'data-geology-core-cassette'");
    expect(cassetteMarker).toBeGreaterThan(-1);
    const cassetteUi = cassetteMarker >= 0
      ? source.slice(Math.max(0, cassetteMarker - 280), cassetteMarker + 4200)
      : '';
    expect(cassetteUi).toContain("h('ol'");
    expect(cassetteUi).toContain("h('li'");
    expect(cassetteUi).toContain("'data-state': cassetteSlot.state");
    expect(cassetteUi).toContain("'data-geology-core-interval-number': cassetteSlot.interval");
    expect(cassetteUi).toContain('String(cassetteSlot.interval)');
    expect(cassetteUi).toContain("'data-geology-core-quality-glyph': cassetteSlot.quality");
    expect(cassetteUi).toContain('cassetteSlot.glyph');
    expect(cassetteUi).toMatch(/motion-reduce:(?:animate-none|transition-none)/);
  });

  it('renders paired recovered cores as semantic proportional correlation strips', () => {
    const correlationBody = functionSlice('coreRigCorrelationFigure', 'coreRigExperimentRail');
    expect(correlationBody).not.toBe('');
    expect(correlationBody).toContain("h('figure'");
    expect(correlationBody).toContain("h('figcaption'");
    expect(correlationBody).toContain("role: 'meter'");
    expect(correlationBody).toContain("'aria-valuetext': similarity + ' percent recovered sequence match'");
    expect(correlationBody).toContain("'data-geology-core-correlation': findingLevel");
    expect(correlationBody).toContain("'data-geology-core-strip': laneId");
    expect(correlationBody).toContain("'data-geology-core-band': key");
    expect(correlationBody).toContain("'data-state': state");
    expect(correlationBody).toContain('flexGrow: count');
    expect(correlationBody).toContain('sharedIntervalScale');
    expect(correlationBody).toContain("'data-geology-core-remainder': remainderIntervals");
    expect(correlationBody).toContain('fewer recovered intervals on the shared scale');
    expect(correlationBody).toContain('repeating-linear-gradient');
    expect(correlationBody).toContain('sharedFormations.slice(0, 24)');
    expect(correlationBody).toContain("String(comparison.interpretation ||");
    expect(correlationBody).toContain('.slice(0, 180)');
    expect(correlationBody).toContain("coreStrip('reference', 'Reference bore', comparison.previousCore)");
    expect(correlationBody).toContain("coreStrip('candidate', 'Candidate bore', comparison.nextCore)");
    expect(correlationBody).toContain("'Shared'");
    expect(correlationBody).toContain("'New'");
    expect(correlationBody).toContain("'Not repeated'");
    expect(correlationBody).toContain("'data-geology-core-correlation-note': 'true'");
    expect(correlationBody).toContain('they do not prove continuous rock between boreholes');
    expect(correlationBody).not.toMatch(/trajectoryScan|plannedStop|currentVoxel|coreRigState3d\.path|\bSCENE\b|\bROCKS\b/);

    const colorBody = functionSlice('coreRigPublicBandColor', 'coreRigCorrelationFigure');
    expect(colorBody).toMatch(/\[0-9a-f\]\{6\}/);
    expect(colorBody).toContain("return '#64748b'");
  });

  it('visualizes the one changed and one held variable for the next experiment', () => {
    const railBody = functionSlice('coreRigExperimentRail', 'fieldJournalPanel');
    expect(railBody).not.toBe('');
    expect(railBody).toContain("'data-geology-core-experiment-map': experiment.programKey");
    expect(railBody).toContain("'data-geology-core-control-variable': changedVariable");
    expect(railBody).toContain("'data-geology-core-configuration': 'current'");
    expect(railBody).toContain("'data-geology-core-configuration': 'next'");
    expect(railBody).toContain("'data-geology-core-outcome': 'unknown'");
    expect(railBody).toContain('Outcome unknown');
    expect(railBody).toContain("'data-geology-core-variable': variable.id");
    expect(railBody).toContain("'data-state': changed ? 'changed' : 'held'");
    expect(railBody).toContain('Δ Changed');
    expect(railBody).toContain('= Held');
    expect(railBody).not.toContain("'aria-live'");

    const journalBody = functionSlice('fieldJournalPanel', 'coreRigConsole');
    const consoleBody = functionSlice('coreRigConsole', 'fpSet');
    expect(journalBody).toContain("coreRigCorrelationFigure(latestCoreComparison");
    expect(journalBody).toContain("coreRigExperimentRail(latestCoreNextExperiment");
    expect(consoleBody).toContain("coreRigCorrelationFigure(rigComparison");
    expect(consoleBody).toContain("coreRigExperimentRail(rigNextExperiment");
    expect(markerLead(consoleBody, "coreRigCorrelationFigure(rigComparison")).toMatch(/\brigFinished\b\s*(?:&&|\?)/);
    expect(journalBody).toMatch(/derivedCoreComparison\s*=\s*previousCoreLog\s*&&\s*latestCoreLog/);
    expect(journalBody).toContain('!previousCoreLog ? persistedCoreComparison : null');
  });

  it('turns the finished console into a result-first core debrief', () => {
    const consoleBody = functionSlice('coreRigConsole', 'fpSet');
    expect(consoleBody).toContain("'data-geology-core-debrief': rigStage");
    expect(consoleBody).toContain("'Core debrief'");
    expect(consoleBody).toContain("'Recovered'");
    expect(consoleBody).toContain("'Integrity'");
    expect(consoleBody).toContain("'Bore Brief'");
    expect(markerLead(consoleBody, "'data-geology-core-debrief': rigStage")).toMatch(/\brigFinished\b\s*\?/);
    expect(consoleBody).toContain("className: (rigFinished ? 'hidden ' : '') + 'mt-2 grid grid-cols-2 gap-2'");
    expect(consoleBody).toContain("rigFinished ? 'Surface barrel' : 'Core cassette'");
    expect(consoleBody).toContain("!rigFinished ? h('button', { key: 'start'");
    expect(consoleBody).toContain("(rigFinished ? 'grid-cols-1' : 'grid-cols-2')");
  });

  it('choreographs setup, bore, and debrief through a sticky instrument deck', () => {
    const consoleBody = functionSlice('coreRigConsole', 'fpSet');
    expect(consoleBody).not.toBe('');
    expect(consoleBody).toContain("var rigPhaseKey = ['setup', 'bore', 'debrief'][rigPhaseIndex]");
    expect(consoleBody).toContain("'data-geology-core-phase': rigPhaseKey");
    expect(consoleBody).toContain("'data-geology-core-phase-rail': rigPhaseKey");
    expect(consoleBody).toContain("'data-geology-core-phase-step': phase[0]");
    expect(consoleBody).toContain("'data-geology-core-phase-surface': 'setup'");
    expect(consoleBody).toContain("'data-geology-core-phase-surface': 'bore'");
    expect(consoleBody).toContain("'data-geology-core-phase-surface': 'debrief'");
    expect(consoleBody).toContain("'data-state': phaseState");
    expect(consoleBody).toContain("'aria-current': phaseState === 'current' ? 'step' : undefined");
    expect(consoleBody).toContain("['setup', 'Setup'], ['bore', 'Bore'], ['debrief', 'Debrief']");
    expect(consoleBody).toContain("phaseState === 'complete' ? '✓ '");
    expect(consoleBody).toContain("phaseState === 'current' ? '● ' : '○ '");
    expect(consoleBody).toContain("phaseState === 'complete' ? 'Complete' : (phaseState === 'current' ? 'Current' : 'Upcoming')");
    expect(consoleBody).toContain("h('header'");
    expect(consoleBody).toContain('relative sticky top-0');
    expect(consoleBody).toContain('absolute inset-x-0 top-0 h-1');
    expect(consoleBody).toContain("'data-geology-core-action-dock': rigPhaseKey");
    expect(consoleBody).toContain('sticky bottom-0');
    expect(consoleBody).toContain('env(safe-area-inset-bottom)');
    expect(consoleBody).toContain('motion-reduce:transition-none');
    expect(consoleBody).toContain('rigShellTone');
    expect(consoleBody).toContain('rigAccentTone');
  });

  it('moves keyboard focus into the debrief only when disappearing rig controls owned it', () => {
    expect(source).toContain('coreRigDebriefFocusRef = React.useRef(false)');
    expect(source).toContain('var enteringCoreRigDebrief = nextRigStage');
    expect(source).toContain('coreRigConsoleRef.current.contains(activeCoreRigControl)');
    expect(source).toContain("querySelector('[data-geology-core-debrief-heading]')");
    expect(source).toContain('if (debriefHeading) debriefHeading.focus()');
    expect(source).toContain("'data-geology-core-debrief-heading': 'true'");
    expect(source).toContain("key: 'label', tabIndex: -1");
    expect(source).toContain('if (!finishedStage || !coreRigDebriefFocusRef.current) return');
  });

  it('keeps rig announcements reliable without coolant echoes or focus races', () => {
    const actionBody = functionSlice('coreRigAction', 'reviewCoreRigReport');
    const consoleBody = functionSlice('coreRigConsole', 'fpSet');
    const fpActionBody = functionSlice('fpAction', 'fieldRunPanel');
    expect(actionBody).toContain("action === 'feed' && result.state");
    expect(actionBody).not.toContain("action === 'feed' || action === 'coolant'");
    expect(source).toContain("if (nextRigStage === 'cooling'");
    expect(consoleBody).toContain("h('p', { key: 'scan-live', role: 'status'");
    expect(consoleBody).toContain("'data-geology-core-formation-cue': 'true', 'data-state': rigFormationCue ? 'active' : 'idle'");
    expect(consoleBody).toContain("rigFormationCue ? rigFormationCue.prompt : ''");
    expect(consoleBody).not.toContain("rigFormationCue ? h('p', { key: 'scan-live'");
    expect(fpActionBody).toContain("name !== 'rig-toggle' && name !== 'rig-pack'");
  });

  it('shows the saved Finding and Next experiment in both the journal and finished console', () => {
    const journalBody = functionSlice('fieldJournalPanel', 'coreRigConsole');
    const consoleBody = functionSlice('coreRigConsole', 'fpSet');
    [journalBody, consoleBody].forEach((body) => {
      expect(body).not.toBe('');
      expect(body).toContain("'data-geology-core-finding'");
      expect(body).toContain("'data-geology-core-next-experiment'");
      expect(body).toMatch(/['"]Finding['"]/);
      expect(body).toMatch(/['"]Next experiment['"]/i);
    });

    expect(journalBody).toMatch(/latestCoreLog\s*\.\s*comparison/);
    expect(journalBody).toMatch(/latestCoreLog\s*\.\s*nextExperiment/);
    expect(markerLead(consoleBody, "'data-geology-core-finding'")).toMatch(/\brigFinished\b\s*(?:&&|\?)/);
    expect(markerLead(consoleBody, "'data-geology-core-next-experiment'")).toMatch(/\brigFinished\b\s*(?:&&|\?)/);
  });

  it('persists an accessible nine-program core-rig certification matrix and loader', () => {
    [
      'coreRigProgramKey', 'coreRigProgramCatalog', 'coreRigProgramRating', 'coreRigCertificationTier',
      'coreRigCertificationReward', 'coreRigCertificationXpTarget', 'normalizeCoreRigPrograms',
      'advanceCoreRigCertification', 'coreRigCertificationSummary', 'coreRigCertificationGuidance', 'coreRigCertificationTiers',
    ].forEach((helper) => {
      expect(source).toContain('function ' + helper);
      expect(source).toContain(helper + ': ' + helper);
    });

    expect(source).toContain('coreCertification: Object.assign');
    expect(source).toContain('normalizeCoreRigPrograms(initialFieldRuns.coreCertification)');
    expect(source).toContain('var certification = advanceCoreRigCertification(');
    expect(source).toContain('cleanReport.certificationReward = certification.certificationReward');
    expect(source).toContain('cleanReport.certificationTier = certification.assessment');
    expect(source).toContain('cleanReport.programTier = certification.program');
    expect(source).toContain('cleanReport.totalReward = transition.researchReward + certification.certificationReward');
    expect(source).toContain('coreCertification: certification.entry');

    expect(source).toContain("'data-geology-core-certification': 'true'");
    expect(source).toContain("h('table'");
    expect(source).toContain("'data-geology-core-program-matrix': 'true'");
    expect(source).toContain("h('caption'");
    expect(source).toContain("scope: 'col'");
    expect(source).toContain("scope: 'row'");
    expect(source).toContain("['vertical', 'slant', 'shallow'].map(function (angle)");
    expect(source).toContain('CORE_RIG_DEPTHS.map(function (depth)');
    expect(source).toContain('var programKey = coreRigProgramKey(angle, depth)');
    expect(source).toContain("'data-geology-core-program': programKey");
    expect(source).toContain("'aria-pressed': selectedProgram ? 'true' : 'false'");
    expect(source).toContain("className: 'min-h-11 min-w-11 w-full");

    expect(source).toMatch(/function\s+loadCoreRigProgram\s*\(\s*program(?:\s*,\s*experiment)?\s*\)/);
    expect(source).toContain('applyCoreRigTrajectory(catalogProgram.angle, catalogProgram.depth)');
    expect(source).toContain("'data-geology-core-program-load': selectedCoreProgram.key");
    expect(source).toMatch(/var\s+coreProgramLoadLocked\s*=\s*!!\s*\(/);
    const programLoadMarker = source.indexOf("'data-geology-core-program-load': selectedCoreProgram.key");
    expect(programLoadMarker).toBeGreaterThan(-1);
    expect(source.slice(programLoadMarker, programLoadMarker + 420)).toContain('disabled: coreProgramLoadLocked');
    expect(source).toContain("'data-geology-core-cert-status': rigProgramKey");
  });

  it('freezes ambient motion and cleans up its listener for reduced-motion users', () => {
    expect(source).toContain("window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('var geologyMotionTime3d = reducedMotion3d ? 0.86 : t;');
    expect(source).toContain("motionMedia3d.removeEventListener('change', syncGeologyMotion3d)");
    expect(source).toContain('excavationDustPoints3d.visible = !reducedMotion3d;');
  });

  it('keeps effect cleanup from disposing a newer WebGL engine during a remount', () => {
    expect(source).toContain('var mountedEngine = null;');
    expect(source).toContain('if (window[ENGINE_KEY] === mountedEngine) window[ENGINE_KEY] = null;');
  });

  it('keeps the source and packaged copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
