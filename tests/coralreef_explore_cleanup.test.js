import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, runtime } from './helpers/reef_dive_harness.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function resources(scene) {
  const all = new Set();
  function texture(value) {
    if (value?.isTexture) all.add(value);
    else if (Array.isArray(value)) value.forEach(texture);
  }
  scene.traverse(object => {
    if (object.geometry) all.add(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) {
      all.add(material);
      Object.values(material).forEach(texture);
      Object.values(material.uniforms || {}).forEach(uniform => texture(uniform.value));
    }
  });
  return all;
}

describe('Leaving a rendered reef releases resources without forced context loss', () => {
  for (const quality of ['low', 'high']) {
    it(`disposes ${quality} scene resources and renderer once, then stops frames and state callbacks`, () => {
      const t = runtime({ quality });
      t.step();
      const renderer = t.renderer, scene = t.scene, tracked = resources(scene), released = new Set();
      expect(tracked.size).toBeGreaterThan(20);
      tracked.forEach(resource => resource.addEventListener('dispose', () => released.add(resource)));
      const dispose = vi.spyOn(renderer, 'dispose'), forcedLoss = vi.spyOn(renderer, 'forceContextLoss');
      t.controller.dispose(); t.controller.dispose();
      expect(released).toEqual(tracked);
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(forcedLoss).not.toHaveBeenCalled();
      expect(scene.children).toHaveLength(0);
      expect(t.canvas._reef3dExplore).toBeUndefined();
      expect(t.state().ready).toBe(false);
      const rendered = t.counts.render, states = t.states.length;
      t.controller.setInput({ forward: 1 }); t.controller.resize(); t.step(1000); t.step(1000);
      expect(t.counts.render).toBe(rendered);
      expect(t.states).toHaveLength(states);
      expect(t.errors).toEqual([]);
    }, 45000);
  }

  it('cancels an unfinished staged reef without later rendering or publishing readiness', () => {
    const t = runtime({ staged: true, quality: 'low' });
    const dispose = vi.spyOn(t.renderer, 'dispose'), forcedLoss = vi.spyOn(t.renderer, 'forceContextLoss');
    t.controller.dispose();
    const rendered = t.counts.render, states = t.states.length;
    for (let i = 0; i < 20; i++) t.step(250);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(forcedLoss).not.toHaveBeenCalled();
    expect(t.counts.render).toBe(rendered);
    expect(t.states).toHaveLength(states);
    expect(t.state().ready).toBe(false);
    expect(t.canvas._reef3dExplore).toBeUndefined();
    expect(t.errors).toEqual([]);
  });
});
