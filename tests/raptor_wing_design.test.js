import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from './helpers/anchored_slice.js';

const source = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const block = sliceBetween(source, '  function raptorWingDesignGeometry(', '  function RaptorWingDesignStudy(', { file: 'stem_tool_raptorhunt.js' });
const { geometry, edit, experiment } = new Function(block + '\nreturn {geometry:raptorWingDesignGeometry,edit:raptorWingDesignEdit,experiment:raptorWingDesignExperiment};')();
const polygonArea = points => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

describe('Raptor generic wing design geometry', () => {
  it.each([[.5,.02],[.5,1],[3,.02],[3,1],[1.2,.25],[1.05,.108],[2.05,.75],[2.9,1.2]])('conserves polygon area and span for %sm by %sm²', (wingspan, wingArea) => {
    const g = geometry({ mass: .95, wingspan, wingArea });
    expect(polygonArea(g.left) + polygonArea(g.right)).toBeCloseTo(wingArea, 12);
    const xs = [...g.left, ...g.right].map(p => p[0]); expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(wingspan, 12);
    for (let i = 0; i < g.left.length; i++) { expect(g.left[i][0] + g.right[i][0]).toBeCloseTo(0, 12); expect(g.left[i][1]).toBe(g.right[i][1]); }
    expect(g.loading).toBeCloseTo(.95 / wingArea, 12); expect(g.aspect).toBeCloseTo(wingspan ** 2 / wingArea, 12);
  });
  it('changes no outline coordinate when mass alone changes', () => {
    const first = geometry({ mass: 1, wingspan: 1.2, wingArea: .25 }), next = geometry({ mass: 7.5, wingspan: 1.2, wingArea: .25 });
    expect(next.left).toEqual(first.left); expect(next.right).toEqual(first.right); expect(next.aspect).toBe(first.aspect); expect(next.loading / first.loading).toBe(7.5);
  });
  it('edits only one dimension and retains preset precision in the others', () => {
    const initial = Object.freeze({ mass: .95, wingspan: 1.05, wingArea: .108 });
    expect(edit(initial, 'wingspan', 1.337)).toEqual({ ...initial, wingspan: 1.34 });
    expect(edit(initial, 'wingArea', .2224)).toEqual({ ...initial, wingArea: .222 });
    expect(edit(initial, 'mass', 2.236)).toEqual({ ...initial, mass: 2.24 });
    expect(initial).toEqual({ mass: .95, wingspan: 1.05, wingArea: .108 });
  });
  it('bounds each edit at the existing Design limits', () => {
    const initial = { mass: 1, wingspan: 1.2, wingArea: .25 };
    for (const [field, min, max] of [['mass', .1, 10], ['wingspan', .5, 3], ['wingArea', .02, 1]]) {
      expect(edit(initial, field, -100)[field]).toBe(min); expect(edit(initial, field, 100)[field]).toBe(max);
    }
    expect(edit(initial, 'mass', NaN)).toEqual(initial); expect(edit(initial, 'unknown', 2)).toEqual(initial);
  });
  it('starts exact controlled experiments from the complete saved dimensions', () => {
    const frozen = Object.freeze({ mass: .95, wingspan: 1.05, wingArea: .108 });
    expect(experiment(frozen, 'span')).toEqual({ ...frozen, wingspan: 1.3 }); expect(experiment(frozen, 'mass')).toEqual({ ...frozen, mass: 1.45 });
    expect(experiment({ mass: 10, wingspan: 3, wingArea: .2 }, 'span')).toBeNull(); expect(experiment({ mass: 10, wingspan: 3, wingArea: .2 }, 'mass')).toBeNull();
    expect(experiment({ mass: 7.5, wingspan: 2.9, wingArea: 1.2 }, 'mass')).toBeNull(); expect(experiment(null, 'span')).toBeNull();
  });
  it('rejects nonfinite or nonpositive dimensions rather than drawing invalid polygons', () => {
    for (const field of ['mass', 'wingspan', 'wingArea']) for (const value of [NaN, Infinity, 0, -1]) expect(geometry({ mass: 1, wingspan: 1.2, wingArea: .25, [field]: value })).toBeNull();
  });
});
