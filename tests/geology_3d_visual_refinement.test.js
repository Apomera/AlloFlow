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
    expect(source).toContain("cnv.dataset.geologyWaterRendering = 'masked-clearcoat-ocean-surface'");
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

  it('freezes ambient motion and cleans up its listener for reduced-motion users', () => {
    expect(source).toContain("window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('var geologyMotionTime3d = reducedMotion3d ? 0.86 : t;');
    expect(source).toContain("motionMedia3d.removeEventListener('change', syncGeologyMotion3d)");
    expect(source).toContain('excavationDustPoints3d.visible = !reducedMotion3d;');
  });

  it('keeps the source and packaged copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
