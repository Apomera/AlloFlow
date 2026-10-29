import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 30000 });

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const Species = local.Reef3DSpecies;
const ids = ['goldmouth_sea_squirt', 'feather_duster_worm'];
const meshes = root => { const result = []; root.traverse(o => { if (o.isMesh) result.push(o); }); return result; };
const positions = root => meshes(root).map(m => Array.from(m.geometry.attributes.position.array));

describe('new sessile filter-feeder models', () => {
  it.each(ids)('%s has a distinct anchored silhouette and stays within its specimen detail budget', id => {
    expect(Species.info(id)).toMatchObject({ group: 'invertebrate', habit: 'sessile', origin: 'base', healthStates: ['healthy'] });
    for (const quality of ['low', 'high']) {
      const model = Species.create(THREE, id, { seed: 19, quality });
      const parts = meshes(model.root), box = new THREE.Box3().setFromObject(model.root);
      expect(parts).toHaveLength(2);
      const budget = id === 'feather_duster_worm' ? [3000,16000] : [1500,6000];
      expect(parts.reduce((sum, m) => sum + m.geometry.index.count / 3, 0)).toBeLessThanOrEqual(budget[quality === 'high' ? 1 : 0]);
      expect(box.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(box.max.y).toBeGreaterThan(.09); expect(box.max.y).toBeLessThan(.14);
      for (const part of parts) {
        expect(Array.from(part.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
        expect(Array.from(part.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
      }
      for (const t of [0, 1, 10, 120]) {
        model.update(.016, t, { current: { x: .3, z: -.2 } });
        for (const p of meshes(model.root)) expect(Array.from(p.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
        expect(new THREE.Box3().setFromObject(model.root).max.y).toBeLessThan(.15);
      }
      model.dispose();
    }
  });

  it('models two visibly recessed orange siphon mouths instead of closed surface markings', () => {
    for (const quality of ['low', 'high']) {
      const model = Species.create(THREE, ids[0], { seed: 19, quality });
      const mouth = model.root.getObjectByName(ids[0] + '-siphons');
      const data = mouth.geometry.userData.goldmouthSeaSquirt;
      expect(data.siphons.map(s => s.name)).toEqual(['oral', 'atrial']);
      model.root.updateMatrixWorld(true);
      for (const siphon of data.siphons) {
        const axis = new THREE.Vector3().fromArray(siphon.axis), center = new THREE.Vector3().fromArray(siphon.center);
        const ray = new THREE.Raycaster(center.clone().addScaledVector(axis, siphon.lipHeight + .025), axis.clone().negate());
        const hit = ray.intersectObject(mouth, false)[0];
        expect(hit).toBeTruthy();
        // A surface at the mouth plane would be .025 m away. The visible
        // throat must sit materially behind the orange lip.
        expect(hit.distance).toBeGreaterThan(.025 + siphon.throatDepth * .75);
        expect(hit.distance).toBeLessThan(.025 + siphon.throatDepth * 1.2);
      }
      const colors = mouth.geometry.attributes.color;
      let orange = 0, dark = 0;
      for (let i = 0; i < colors.count; i++) {
        if (colors.getX(i) > .45 && colors.getY(i) > .1 && colors.getZ(i) < .12) orange++;
        if (colors.getX(i) < .18 && colors.getY(i) < .1) dark++;
      }
      expect(orange).toBeGreaterThan(40); expect(dark).toBeGreaterThan(20);
      model.dispose();
    }
  });

  it('builds paired feathered crown lobes with banded radioles and a separate tube', () => {
    const model = Species.create(THREE, ids[1], { seed: 19, quality: 'high' });
    const crown = model.root.getObjectByName(ids[1] + '-feeding-crown'), data = crown.geometry.userData.featherDusterWorm;
    expect(data).toMatchObject({ pairedPinnules: true, spiral: false, hiddenBody: true, operculum: false });
    expect(data.lobes.map(lobe => lobe.side)).toEqual([-1, 1]);
    expect(data.radioles).toHaveLength(48);
    expect(data.radioles.every(r => r.pinnulePairs === 40 && r.count > r.shaftCount)).toBe(true);
    for (const side of [-1, 1]) {
      const lobe = data.radioles.filter(r => r.lobe === side);
      expect(lobe).toHaveLength(24);
      expect(lobe.reduce((sum,r) => sum + side*r.tip[0],0)/lobe.length).toBeGreaterThan(.015);
      expect(data.lobes.find(lobe => lobe.side === side).arcRadians).toBeGreaterThan(Math.PI*1.8);
      expect(lobe.some(r => r.tip[2] > .04) && lobe.some(r => r.tip[2] < -.04)).toBe(true);
    }
    const colors = crown.geometry.attributes.color;
    expect(Math.max(...Array.from(colors.array))).toBeGreaterThan(.7);
    expect(Math.min(...Array.from(colors.array))).toBeLessThan(.1);
    const tube = model.root.getObjectByName(ids[1] + '-tube'), tubeBefore = Array.from(tube.geometry.attributes.position.array);
    model.retract(true); expect(crown.visible).toBe(false); expect(tube.visible).toBe(true);
    model.retract(false); expect(crown.visible).toBe(true);
    expect(Array.from(tube.geometry.attributes.position.array)).toEqual(tubeBefore);
    model.dispose();
  });

  it('retains low-detail feather coverage through mip levels without transparent sorting or extra draws', () => {
    const a = Species.create(THREE, ids[1], { seed: 19, quality: 'low' });
    const b = Species.create(THREE, ids[1], { seed: 19, quality: 'low' });
    const crown = a.root.getObjectByName(ids[1] + '-feeding-crown'), map = crown.material.map;
    expect(meshes(a.root)).toHaveLength(2);
    expect(crown.geometry.userData.featherDusterWorm.crownRepresentation).toBe('coverage-feather-vanes');
    expect(crown.geometry.userData.featherDusterWorm.radioles).toHaveLength(48);
    expect(crown.material).toMatchObject({ alphaTest: .42, transparent: false, depthWrite: true, vertexColors: false });
    expect(map.generateMipmaps).toBe(false);
    expect(map.mipmaps.length).toBeGreaterThan(7);
    for (const mip of map.mipmaps.filter(level => level.width >= 8 && level.height >= 8)) {
      let visible = 0, clear = 0;
      for (let i = 3; i < mip.data.length; i += 4) { if (mip.data[i] >= .42 * 255) visible++; else clear++; }
      expect(visible / (visible + clear)).toBeGreaterThan(.4);
      expect(visible / (visible + clear)).toBeLessThan(.7);
    }
    expect(b.root.getObjectByName(ids[1] + '-feeding-crown').material.map).toBe(map);
    const disposed = vi.fn(); map.addEventListener('dispose', disposed);
    a.dispose(); expect(disposed).not.toHaveBeenCalled();
    b.dispose(); b.dispose(); expect(disposed).toHaveBeenCalledTimes(1);
  });

  it.each(ids)('%s is deterministic, animated gently, and static under reduced motion', id => {
    const a = Species.create(THREE, id, { seed: 5, quality: 'low' });
    const b = Species.create(THREE, id, { seed: 5, quality: 'low' });
    const c = Species.create(THREE, id, { seed: 6, quality: 'low' });
    const calm = Species.create(THREE, id, { seed: 5, quality: 'low', reducedMotion: true });
    expect(positions(a.root)).toEqual(positions(b.root)); expect(positions(c.root)).not.toEqual(positions(a.root));
    const before = positions(a.root), calmBefore = positions(calm.root);
    a.update(.016, 4); calm.update(.016, 4);
    expect(positions(a.root)).not.toEqual(before); expect(positions(calm.root)).toEqual(calmBefore);
    for (const model of [a, b, c, calm]) {
      const geometry = meshes(model.root).map(m => m.geometry), disposed = new Set();
      geometry.forEach(g => g.addEventListener('dispose', () => disposed.add(g)));
      model.dispose(); model.dispose(); expect(disposed.size).toBe(geometry.length);
    }
  });
});
