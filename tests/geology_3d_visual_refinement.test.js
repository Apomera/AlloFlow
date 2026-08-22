import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

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
