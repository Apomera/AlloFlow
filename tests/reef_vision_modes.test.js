import { afterEach, describe, expect, it } from 'vitest';
import { THREE, SOURCE, runtime, site, cleanup, census } from './helpers/reef_dive_harness.js';

afterEach(() => cleanup());
function compile(t, material) {
  const template = material.isPointsMaterial ? THREE.ShaderLib.points : material.isMeshBasicMaterial ? THREE.ShaderLib.basic : THREE.ShaderLib.standard;
  const shader = { uniforms: THREE.UniformsUtils.clone(template.uniforms), vertexShader: template.vertexShader, fragmentShader: template.fragmentShader };
  material.onBeforeCompile(shader, t.renderer);
  expect(shader.vertexShader).not.toContain('undefined');
  expect(shader.fragmentShader).not.toContain('undefined');
  return shader;
}
function lightState(t) {
  const sun = t.scene.getObjectByName('reef-explore-sun'), ambient = t.scene.getObjectByName('reef-explore-ambient');
  const back = t.scene.getObjectByName('reef-explore-backdrop').material.uniforms;
  return [sun.intensity, ambient.intensity, ...sun.color.toArray(), ...ambient.color.toArray(), ...t.scene.fog.color.toArray(), ...back.topColor.value.toArray(), ...back.bottomColor.value.toArray()];
}

describe('optional reef viewing modes', () => {
  it('defaults to natural and reversibly changes the view while a paused dive retains its position, focus and light', () => {
    for (const quality of ['low', 'high']) {
      const t = runtime({ quality });
      expect(t.state().vision).toBe('natural');
      t.controller.setPaused(true); t.controller.setView('first'); t.controller.setLight(true); t.step();
      const target = t.state().nearby[0]; t.controller.focus(target.uid); t.step();
      const before = t.state(), organisms = census(t), light = lightState(t), objects = [];
      t.scene.traverse(o => { if (o.isMesh || o.isPoints) objects.push([o.uuid, o.geometry, o.material, o.material.version]); });
      for (const mode of ['vivid', 'fluorescence', 'natural']) {
        t.controller.setVision(mode); t.step();
        const state = t.state();
        expect(state.vision).toBe(mode);
        expect(state.diver).toEqual(before.diver);
        expect(state.focused.uid).toBe(before.focused.uid);
        expect([state.paused, state.light, state.view]).toEqual([true, true, 'first']);
        expect(census(t)).toEqual(organisms);
        const after = []; t.scene.traverse(o => { if (o.isMesh || o.isPoints) after.push([o.uuid, o.geometry, o.material, o.material.version]); });
        expect(after).toEqual(objects);
      }
      expect(lightState(t)).toEqual(light);
      expect(t.errors).toEqual([]);
    }
  });

  it('shares live mode uniforms across terrain, coral, shafts, surface and marine snow without rebuilding materials', () => {
    const t = runtime();
    const names = ['reef-explore-floor', 'reef-explore-decor-plate', 'reef-explore-decor-sponge', 'reef-explore-shaft', 'reef-explore-surface', 'reef-explore-motes'];
    const shaders = names.map(name => compile(t, t.scene.getObjectByName(name).material));
    const uniform = shaders[0].uniforms.reefVision;
    expect(shaders.every(shader => shader.uniforms.reefVision === uniform)).toBe(true);
    expect(shaders[1].uniforms.reefFluorescent.value).toBe(1);
    expect(shaders[2].uniforms.reefFluorescent.value).toBe(0);
    t.controller.setPaused(true); t.step();
    t.controller.setVision('vivid');
    expect(uniform.value.toArray()).toEqual([1, 0]);
    expect(shaders[0].uniforms.reefCausticStrength.value).toBeGreaterThan(0.62);
    t.controller.setVision('fluorescence');
    expect(uniform.value.toArray()).toEqual([0, 1]);
    t.controller.setVision('natural');
    expect(uniform.value.toArray()).toEqual([0, 0]);
    expect(shaders[0].uniforms.reefCausticStrength.value).toBe(0.62);
  });

  it('illustrates living hard coral while excluding dead colonies, fish, sponges and restoration structures', () => {
    const t = runtime({ site: site({ health: { coralCover: 0.3, bleaching: 0.18, algae: 0.9 }, population: [{ id: 'brain_coral', count: 24 }, { id: 'staghorn_coral', count: 12 }, { id: 'blue_tang', count: 3 }, { id: 'barrel_sponge', count: 3 }] }) });
    const checked = { live: 0, dead: 0, other: 0 };
    t.scene.getObjectByName('reef-explore-organisms').traverse(object => {
      if (!object.isMesh || !object.material.isMeshStandardMaterial) return;
      let owner = object; while (owner && !owner.userData.exploreUid) owner = owner.parent;
      const uid = object.userData.exploreUids?.[0] || owner?.userData.exploreUid;
      if (!uid) return;
      t.controller.focus(uid);
      const state = t.state().focused, isCoral = ['brain_coral', 'staghorn_coral'].includes(state.speciesId);
      const eligible = isCoral && state.health !== 'dead';
      expect(compile(t, object.material).uniforms.reefFluorescent.value, state.speciesId + ' ' + state.health).toBe(eligible ? 1 : 0);
      checked[!isCoral ? 'other' : eligible ? 'live' : 'dead']++;
    });
    expect(checked.live).toBeGreaterThan(0); expect(checked.dead).toBeGreaterThan(0); expect(checked.other).toBeGreaterThan(0);
    for (const kind of ['rock', 'deadstand', 'algae', 'sponge']) {
      const mesh = t.scene.getObjectByName('reef-explore-decor-' + kind);
      if (mesh) expect(compile(t, mesh.material).uniforms.reefFluorescent.value).toBe(0);
    }
  });

  it('keeps recently dead decorative skeleton masked through every visible detail tier', () => {
    for (const quality of ['low', 'high']) {
      const t = runtime({ quality, site: site({ health: { coralCover: 0.3, bleaching: 0.45, algae: 0.3 } }) });
      t.controller.setPaused(true); t.controller.setVision('fluorescence'); t.step();
      let living = 0, skeleton = 0, displayed = 0;
      const kinds = new Map();
      t.scene.traverse(mesh => {
        const items = mesh.userData.items;
        if (!items || !['finger', 'antler', 'corym', 'table', 'massive', 'brain', 'plate', 'encrust'].includes(mesh.userData.kind)) return;
        const lookup = new Map();
        for (let i = 0; i < items.skeletons.length; i++) {
          const value = items.skeletons[i];
          expect([0, 1]).toContain(value);
          value ? skeleton++ : living++;
          lookup.set(Array.from(items.matrices.slice(i * 16, i * 16 + 16)).join(','), value);
        }
        kinds.set(mesh.userData.kind, lookup);
      });
      t.scene.traverse(mesh => {
        const lookup = kinds.get(mesh.userData.kind);
        if (!lookup || !mesh.isInstancedMesh) return;
        const buffer = mesh.geometry.getAttribute('reefSkeleton');
        expect(buffer.isInstancedBufferAttribute).toBe(true);
        for (let i = 0; i < mesh.count; i++) {
          const key = Array.from(mesh.instanceMatrix.array.slice(i * 16, i * 16 + 16)).join(',');
          expect(lookup.has(key)).toBe(true);
          expect(buffer.array[i]).toBe(lookup.get(key));
          displayed++;
        }
        const shader = compile(t, mesh.material);
        expect(shader.fragmentShader).toContain('reefGlowLiving*=1.0-step(0.5,vReefSkeleton)');
      });
      expect(living).toBeGreaterThan(0); expect(skeleton).toBeGreaterThan(0); expect(displayed).toBeGreaterThan(0);
    }
  });

  it('excludes shared fallback models and bare feeding scars from the glow', () => {
    const fallbackSource = SOURCE.replace("var Species = global.Reef3DSpecies && typeof global.Reef3DSpecies.create === 'function' ? global.Reef3DSpecies : null;", 'var Species = null;');
    expect(fallbackSource).not.toBe(SOURCE);
    const t = runtime({ site: site({ population: [{ id: 'table_coral', count: 12 }, { id: 'brain_coral', count: 6 }, { id: 'blue_tang', count: 3 }, { id: 'crown_of_thorns', count: 5 }] }) }, fallbackSource);
    let placeholders = 0, scars = 0;
    t.scene.traverse(mesh => {
      if (mesh.name === 'reef-explore-placeholder') {
        expect(compile(t, mesh.material).uniforms.reefFluorescent.value).toBe(0); placeholders++;
      }
      if (mesh.userData.scar) {
        expect(Array.from(mesh.geometry.getAttribute('reefSkeleton').array)).toEqual([1]); scars++;
      }
    });
    expect(placeholders).toBeGreaterThan(0); expect(scars).toBeGreaterThan(0);
  });

  it('accepts initial modes, falls back for unknown values, and safely ignores calls after disposal', () => {
    for (const mode of ['natural', 'vivid', 'fluorescence']) {
      const t = runtime({ vision: mode, reducedMotion: true });
      expect(t.state().vision).toBe(mode);
      t.controller.setVision('ultraviolet'); t.step();
      expect(t.state().vision).toBe('natural');
      t.controller.setVision(null); expect(t.state().vision).toBe('natural');
      t.controller.dispose(); expect(() => t.controller.setVision('vivid')).not.toThrow();
    }
    const t = runtime({ vision: 'unknown' }); expect(t.state().vision).toBe('natural');
  });
});
