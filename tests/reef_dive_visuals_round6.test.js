// Round 6, the look of the dive: a far haze that melts into the backdrop, one metre-scale read of
// the grain map on floor and rock, a long sand wave, and a grain map without square pits. These
// pin what was added, what it may not cost, and that reef health still drives the colour.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, SOURCE, runtime, site, cleanup } from './helpers/reef_dive_harness.js';

vi.setConfig({ testTimeout: 60000 });
afterEach(() => cleanup());

// Private functions, captured from the module under test (no second implementation).
const marker = 'function createSubstrateTexture(T) {';
const scope = {};
new Function('window', SOURCE.replace(marker, 'global.__round6 = { substrate: createSubstrateTexture, farMelt: farMelt };\n  ' + marker))(scope);
const { substrate, farMelt } = scope.__round6;

function compile(t, material) {
  const lib = THREE.ShaderLib.standard;
  const shader = { uniforms: THREE.UniformsUtils.clone(lib.uniforms), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  material.onBeforeCompile(shader, t.renderer);
  return shader;
}
const smoothstep = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const floorOf = (t) => t.scene.getObjectByName('reef-explore-floor');
const rockOf = (t) => t.scene.getObjectByName('reef-explore-bommies');
const backOf = (t) => t.scene.getObjectByName('reef-explore-backdrop');
const count = (text, part) => text.split(part).length - 1;
// The four dive sites' health, as the tool lists them.
const HEALTH = {
  healthy: { coralCover: 0.55, bleaching: 0, algae: 0.05 },
  restoration: { coralCover: 0.35, bleaching: 0, algae: 0.08 },
  heatwave: { coralCover: 0.45, bleaching: 0.6, algae: 0.08 },
  damaged: { coralCover: 0.12, bleaching: 0.05, algae: 0.35 }
};

describe('the far reef melts into the water', () => {
  it('matches the backdrop colour formula, so the two cannot drift apart unseen', () => {
    const t = runtime({ quality: 'high' }), back = backOf(t).material.fragmentShader, melt = farMelt(true);
    expect(back).toContain('bottomColor*mix(0.63,1.0,smoothstep(-0.85,-0.06,d.y))');
    expect(back).toContain('smoothstep(-0.10,0.98,d.y)');
    expect(back).toContain('column=mix(column,topColor,up*0.70)');
    expect(melt).toContain('reefBackBottom*mix(0.63,1.0,smoothstep(-0.85,-0.06,reefWaterRay.y))');
    expect(melt).toContain('mix(reefFarWater,reefBackTop,smoothstep(-0.10,0.98,reefWaterRay.y)*0.70)');
  });

  it('leaves the near reef alone, is complete before the far plane, and starts sooner on the light tier', () => {
    const range = (high) => farMelt(high).match(/smoothstep\(([\d.]+),([\d.]+),reefOpticalDistance\)/).slice(1).map(Number);
    const [hi0, hi1] = range(true), [lo0, lo1] = range(false);
    for (const [a, b] of [[hi0, hi1], [lo0, lo1]]) {
      expect(smoothstep(a, b, 8), 'what the diver studies stays clear').toBe(0);
      expect(smoothstep(a, b, 15), 'still mostly clear at 15 m').toBeLessThan(0.15);
      expect(b, 'nothing reaches the far plane unmelted').toBeLessThan(runtime({ quality: 'high' }).renderer.camera.far);
    }
    expect(lo0).toBeLessThan(hi0);
    expect(lo1).toBeLessThan(hi1);
  });

  it('runs on every reef material after encoding, bound to the backdrop\'s own colours, on both tiers', () => {
    for (const quality of ['high', 'low']) {
      const t = runtime({ quality }), back = backOf(t).material.uniforms;
      for (const material of [floorOf(t).material, rockOf(t).material]) {
        const shader = compile(t, material), f = shader.fragmentShader;
        expect(count(f, 'reefFarWater=mix('), quality).toBe(1);
        expect(f.indexOf('#include <encodings_fragment>')).toBeLessThan(f.indexOf('reefFarWater='));
        expect(f.indexOf('float reefOpticalDistance')).toBeLessThan(f.indexOf('reefFarWater='));
        expect(shader.uniforms.reefBackTop).toBe(back.topColor);
        expect(shader.uniforms.reefBackBottom).toBe(back.bottomColor);
      }
      // A coral's program too, or colonies would stand out unhazed over a melted floor.
      let coral = null; t.scene.traverse((o) => { if (o.userData.kind === 'plate' && o.userData.lod === 'near') coral = o; });
      const coralShader = compile(t, coral.material);
      expect(count(coralShader.fragmentShader, 'reefFarWater=mix(')).toBe(1);
      expect(coralShader.uniforms.reefBackBottom).toBe(back.bottomColor);
      // Light shafts and the surface are not reef surfaces and stay as they were.
      const shaft = t.scene.children.find((o) => o.name === 'reef-explore-shaft');
      const s = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
      shaft.material.onBeforeCompile(s, t.renderer);
      expect(s.fragmentShader).not.toContain('reefFarWater');
    }
  });
});

describe('metre-scale ground detail', () => {
  it('costs one more read of the one grain map on the floor and on the rock, with no new texture or mesh', () => {
    for (const quality of ['high', 'low']) {
      const t = runtime({ quality }), floor = compile(t, floorOf(t).material), rock = compile(t, rockOf(t).material);
      expect(count(floor.fragmentShader, 'texture2D(reefSubstrateMap,'), quality + ' floor').toBe(3);
      expect(count(rock.fragmentShader, 'texture2D(reefSubstrateMap,'), quality + ' rock').toBe(4);
      expect(floor.uniforms.reefSubstrateMap).toBe(rock.uniforms.reefSubstrateMap);
      // The read is biased two mips up, so it adds no speckle for the derivative relief to catch.
      expect(floor.fragmentShader).toMatch(/vec4 reefMacro=texture2D\(reefSubstrateMap,.*,2\.0\);/);
      expect(rock.fragmentShader).toMatch(/vec4 reefRockMacro=texture2D\(reefSubstrateMap,.*,2\.0\);/);
      // Close up it gives way to the grain, because a mip this coarse would show its texels.
      expect(floor.fragmentShader).toContain('reefMacro=mix(vec4(0.5),reefMacro,smoothstep(1.2,4.5,length(vViewPosition)))');
      expect(rock.fragmentShader).toContain('reefRockMacro=mix(vec4(0.5),reefRockMacro,smoothstep(1.2,4.5,length(vViewPosition)))');
      // The second caustic layer stays a high tier effect; this pass added nothing only one tier pays for.
      expect(floor.fragmentShader.includes('#define REEF_CAUSTIC_LAYERS')).toBe(quality === 'high');
      // The light tier pays for the extra read by filtering the map less at grazing angles.
      expect(floor.uniforms.reefSubstrateMap.value.anisotropy).toBe(quality === 'high' ? 4 : 2);
      // Still the same two program families, so nothing new has to link while the dive loads.
      expect(floorOf(t).material.customProgramCacheKey()).toMatch(/^reef3dx-floor-v1\|/);
      expect(rockOf(t).material.customProgramCacheKey()).toMatch(/^reef3dx-rock-v1\|/);
      const names = t.scene.children.map((o) => o.name);
      expect(names.filter((n) => n === 'reef-explore-floor').length).toBe(1);
      expect(names.filter((n) => /macro|dune|melt|haze/i.test(n))).toEqual([]);
    }
  });

  it('takes nothing from the clock, so reduced motion and a paused dive see still ground', () => {
    const t = runtime({ quality: 'high' });
    for (const material of [floorOf(t).material, rockOf(t).material]) {
      const f = compile(t, material).fragmentShader;
      for (const line of f.split('\n').filter((l) => /reefMacro|reefRockMacro|reefDune|reefFarWater/.test(l))) expect(line).not.toContain('reefCausticTime');
    }
  });

  it('gives the sand a longer wave that fades with its own footprint', () => {
    const f = compile(runtime({ quality: 'low' }), floorOf(runtime({ quality: 'low' })).material).fragmentShader;
    expect(f).toContain('reefDuneAA=1.0-smoothstep(0.5,1.9,fwidth(reefDune))');
    expect(f).toContain('reefDune=sin(reefDune)*reefDuneAA*reefSandW');
  });
});

describe('reef health still decides the colour of the rock', () => {
  const lifeOf = (health) => {
    const t = runtime({ quality: 'low', site: site({ health }) }), rock = compile(t, rockOf(t).material), floor = compile(t, floorOf(t).material);
    return { life: rock.uniforms.reefRockLife.value.x, algae: rock.uniforms.reefRockLife.value.y, vitality: floor.uniforms.reefVitality.value, floorAlgae: floor.uniforms.reefFloorAlgae.value, rock: rock.fragmentShader, floor: floor.fragmentShader };
  };

  it('allows large coralline patches on a living reef and almost none on the damaged one', () => {
    const healthy = lifeOf(HEALTH.healthy), damaged = lifeOf(HEALTH.damaged);
    expect(healthy.rock).toContain('smoothstep(0.19,0.33,reefRockLife.x)');
    expect(smoothstep(0.19, 0.33, healthy.life), 'healthy').toBeGreaterThan(0.95);
    expect(smoothstep(0.19, 0.33, damaged.life), 'damaged').toBeLessThan(0.02);
    expect(healthy.vitality).toBeGreaterThan(damaged.vitality * 2.5);
    // The floor's coralline tint scales with vitality, its turf with algae.
    expect(healthy.floor).toContain('reefMacroPatch*reefVitality*0.62');
    expect(healthy.floor).toContain('min(1.0,reefFloorAlgae*2.2)*0.72');
  });

  it('grows turf with the algae of the site', () => {
    const healthy = lifeOf(HEALTH.healthy), damaged = lifeOf(HEALTH.damaged);
    expect(damaged.floorAlgae).toBe(HEALTH.damaged.algae);
    expect(healthy.floorAlgae).toBe(HEALTH.healthy.algae);
    expect(Math.min(1, damaged.algae * 2.2) * 0.72, 'damaged turf weight').toBeGreaterThan(0.5);
    expect(Math.min(1, healthy.algae * 2.2) * 0.72, 'healthy turf weight').toBeLessThan(0.1);
    expect(damaged.rock).toContain('min(1.0,reefRockLife.y*2.2)*0.72');
  });

  it('does not brighten bare ground on average', () => {
    // The metre-scale light and dark is centred at 0.5 and the map's mean sits below that, so on
    // average it can only darken: a bleached or bare slope is not lit up into looking well.
    const { data, width, height } = substrate(THREE).image;
    let sum = 0; for (let i = 0; i < width * height; i++) sum += data[i * 4];
    expect(sum / (width * height) / 255).toBeLessThan(0.5);
    expect(lifeOf(HEALTH.healthy).floor).toContain('0.85*(reefMacro.r-0.5)-0.10*reefMacroPit');
  });
});

describe('the grain map', () => {
  it('bakes the same bytes every time, and tiles', () => {
    const a = substrate(THREE), b = substrate(THREE), n = a.image.width, d = a.image.data;
    expect(a.image.width).toBe(256);
    expect(Buffer.compare(Buffer.from(a.image.data), Buffer.from(b.image.data))).toBe(0);
    for (const channel of [0, 2, 3]) {
      let seam = 0, inner = 0;
      for (let y = 0; y < n; y++) {
        seam += Math.abs(d[(y * n) * 4 + channel] - d[(y * n + n - 1) * 4 + channel]);
        inner += Math.abs(d[(y * n + 1) * 4 + channel] - d[(y * n) * 4 + channel]);
      }
      expect(seam / n, 'channel ' + channel).toBeLessThan(inner / n * 2.5 + 2);
    }
  });

  it('keeps the two dives of a seed on one map, and its fields off the grid', () => {
    const one = runtime({ quality: 'high', site: site({ seed: 11 }) }), two = runtime({ quality: 'low', site: site({ seed: 99 }) });
    const map = (t) => compile(t, floorOf(t).material).uniforms.reefSubstrateMap.value.image.data;
    expect(Buffer.compare(Buffer.from(map(one)), Buffer.from(map(two)))).toBe(0);
    // A square lattice shows as gradients along the axes; shell chips were 0.785 before the 45 degree lattice.
    const { data, width: n } = substrate(THREE).image;
    const at = (x, y) => data[(((y + n) % n) * n + ((x + n) % n)) * 4 + 3];
    let sum = 0, c = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const gx = at(x + 1, y) - at(x - 1, y), gy = at(x, y + 1) - at(x, y - 1), m = Math.abs(gx) + Math.abs(gy);
      if (m > 24) { sum += Math.max(Math.abs(gx), Math.abs(gy)) / m; c++; }
    }
    expect(sum / c).toBeLessThan(0.76);
  });
});
