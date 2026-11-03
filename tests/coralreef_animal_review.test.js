import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const local = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
new Function('window', readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8'))(local);
const X = local.__RR_TEST_EXPORTS__.coralReef, tx = X.speciesText((key, fallback) => fallback), profiles = X.marineProfiles((key, fallback) => fallback);
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), models = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(models);

describe('animal encyclopedia evidence and anatomical details', () => {
  it('resolves every animal entry citation and retains a complete account', () => {
    const animals = X.SPECIES_META.filter(m => !['coral', 'structure'].includes(m.group));
    expect(animals).toHaveLength(68);
    for (const { id, scientific } of animals) {
      expect(scientific, id).toBeTruthy();
      for (const key of ['habitat', 'diet', 'behavior', 'observe']) expect(profiles[id][key]?.length, id + ' ' + key).toBeGreaterThan(20);
      expect(tx[id].marks.length, id).toBeGreaterThanOrEqual(3);
      expect(tx[id].fact.length, id).toBeGreaterThan(30);
      const sources = X.marineEntrySources(profiles[id]);
      expect(sources.map(s => s.id), id).toEqual([...new Set(profiles[id].sources)]);
      for (const source of sources) expect(source.text.length, id + ' ' + source.id).toBeGreaterThan(20);
    }
  });

  it('distinguishes species facts from local community and daily-average estimates', () => {
    expect(tx.parrotfish.fact).toMatch(/community/);
    expect(tx.parrotfish.fact).toMatch(/several parrotfish species/);
    expect(tx.bumphead_parrotfish.fact).toMatch(/large.*may consume/i);
    expect(tx.bumphead_parrotfish.fact).not.toMatch(/Each .*over 5 tonnes/);
    expect(tx.cleaner_wrasse.fact).toMatch(/Lizard Island/);
    expect(tx.cleaner_wrasse.fact).toMatch(/average/);
    for (const [id, citation] of [['parrotfish', 'dx-parrotfish-sediment-study'], ['cleaner_wrasse', 'dx-cleaner-rates-study']])
      expect(X.marineEntrySources(profiles[id]).map(s => s.id), id).toContain(citation);
  });

  it('states the date and geographic scope of the turtle assessment and hunting observations', () => {
    expect(tx.green_turtle.fact).toMatch(/global assessment published in 2025/);
    expect(tx.green_turtle.fact).toMatch(/regional populations remain threatened/);
    expect(tx.day_octopus.fact).toMatch(/Red Sea study/);
    expect(tx.day_octopus.fact).not.toMatch(/keep them in line/);
    for (const [id, citation] of [['green_turtle', 'dx-green-turtle-global-2025'], ['day_octopus', 'dx-octopus-team-study'], ['giant_moray', 'dx-moray-hunt-study'], ['giant_clam', 'dx-clam-eyes-study']])
      expect(X.marineEntrySources(profiles[id]).map(s => s.id), id).toContain(citation);
  });

  it.each(['low', 'high'])('keeps %s-detail anatomical additions in one bounded body mesh', quality => {
    for (const id of ['blue_sea_star', 'sea_cucumber']) {
      const model = models.Reef3DSpecies.create(THREE, id, { seed: 7, quality, reducedMotion: true });
      try {
        const meshes = []; model.root.traverse(o => { if (o.isMesh) meshes.push(o); });
        expect(meshes).toHaveLength(1);
        const mesh = meshes[0], g = mesh.geometry;
        expect((g.index?.count || g.attributes.position.count) / 3).toBeLessThanOrEqual(quality === 'low' ? 1500 : 6000);
        expect(mesh.material.bumpMap).toBeTruthy();
        const p = g.attributes.position, colors = g.attributes.color;
        if (id === 'blue_sea_star') {
          const sectors = new Set();
          for (let i = 0; i < p.count; i++) if (Math.hypot(p.getX(i), p.getZ(i)) > .1 && colors.getX(i) > colors.getY(i) * 3 && colors.getX(i) > colors.getZ(i) * 3)
            sectors.add(Math.round((Math.atan2(p.getZ(i), p.getX(i)) - .3) / (Math.PI * 2 / 5) + 5) % 5);
          expect(sectors.size, 'small red sensory structures at all five arm ends').toBe(5);
        } else {
          let feet = 0, tentacles = 0;
          const box = new THREE.Box3().setFromBufferAttribute(p), frontQuarter = box.max.x - (box.max.x - box.min.x) / 4;
          for (let i = 0; i < p.count; i++) {
            if (p.getY(i) < .002 && Math.abs(p.getX(i)) < .09) feet++;
            if (p.getX(i) > frontQuarter && p.getY(i) < box.max.y / 3 && colors.getY(i) > .25) tentacles++;
          }
          expect(feet, 'short feet beneath the cylindrical body').toBeGreaterThan(20);
          expect(tentacles, 'extended oral structures at the front').toBeGreaterThan(20);
        }
      } finally { model.dispose(); }
    }
  });
});
