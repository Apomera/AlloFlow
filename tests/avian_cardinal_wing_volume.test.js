import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
function create(quality) { return scope.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality }); }
function width(position, start, columns) {
  return Math.hypot(position.getX(start + columns - 1) - position.getX(start), position.getY(start + columns - 1) - position.getY(start), position.getZ(start + columns - 1) - position.getZ(start));
}
function arch(position, feather, rows, columns) {
  const start = feather * (rows + 1) * columns + (columns - 1) / 2;
  const firstMiddle = start + Math.floor(rows / 2) * columns, secondMiddle = start + Math.ceil(rows / 2) * columns;
  return (position.getY(firstMiddle) + position.getY(secondMiddle) - position.getY(start) - position.getY(start + rows * columns)) / 2;
}

describe('cardinal three-dimensional flight plumage', () => {
  it.each(['high', 'low'])('holds an arched wing section with loaded power and relaxed recovery (%s)', quality => {
    const bird = create(quality), rows = quality === 'high' ? 9 : 5, columns = quality === 'high' ? 5 : 3;
    try {
      const { position, featherInfo, uv } = bird.wings[1].children[0].geometry.attributes;
      bird.update({ flight: 1, effort: 0 });
      const restingArch = arch(position, 5, rows, columns), roots = [];
      // Measure shaft curvature against its own root-to-tip line, removing
      // the whole wing's height and rotation from the comparison.
      expect(restingArch).toBeGreaterThan(.0018); expect(restingArch).toBeLessThan(.004);
      for (let i = 0; i < position.count; i++) if (featherInfo.getX(i) === 3 && uv.getY(i) === 0 && position.getX(i) <= .006) {
        roots.push([i, position.getX(i), position.getY(i), position.getZ(i)]);
      }
      expect(roots.length).toBeGreaterThan(5);
      bird.update({ flight: 1, phase: Math.PI / 2, effort: .8 });
      const powerArch = arch(position, 5, rows, columns);
      for (const [i, x, y, z] of roots) expect([position.getX(i), position.getY(i), position.getZ(i)]).toEqual([x, y, z]);
      bird.update({ flight: 1, phase: 3 * Math.PI / 2, effort: .8 });
      const recoveryArch = arch(position, 5, rows, columns);
      expect(powerArch).toBeGreaterThan(recoveryArch + .0001);
      expect(recoveryArch).toBeGreaterThan(.0013);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('keeps dorsal coverts broad through wrist recovery instead of squeezing opposite vane edges (%s)', quality => {
    const bird = create(quality), rows = quality === 'high' ? 9 : 5, columns = quality === 'high' ? 5 : 3;
    try {
      const { position, featherInfo } = bird.wings[1].children[0].geometry.attributes;
      bird.update({ flight: 1, effort: 0 });
      const sections = [], count = (rows + 1) * columns;
      for (let feather = 0; feather < position.count / count; feather++) {
        const start = feather * count;
        if (featherInfo.getX(start) !== 3 || featherInfo.getY(start) >= 2048) continue;
        for (let row = 1; row < rows; row++) {
          const index = start + row * columns, restWidth = width(position, index, columns);
          if (restWidth > .0005) sections.push({ index, restWidth });
        }
      }
      expect(sections.length).toBeGreaterThan(80);
      for (const landing of [0, .5, 1]) for (let step = 0; step < 36; step++) {
        bird.update({ flight: 1, phase: step / 36 * Math.PI * 2, effort: 1, bank: .4, landing });
        let smallest = Infinity, largest = 0;
        for (const section of sections) {
          const ratio = width(position, section.index, columns) / section.restWidth;
          smallest = Math.min(smallest, ratio); largest = Math.max(largest, ratio);
        }
        expect(smallest).toBeGreaterThan(.95); expect(largest).toBeLessThan(1.04);
      }
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('folds exactly into its retained mantle and keeps periodic feather motion finite (%s)', quality => {
    const bird = create(quality), parts = [], resources = new Set();
    bird.root.traverse(part => { if (part.isMesh) { parts.push(part); resources.add(part.geometry); resources.add(part.material); } });
    const initial = bird.wings.map(wing => wing.children[0].geometry.attributes.position.array.slice());
    const arrays = parts.map(part => Object.fromEntries(Object.entries(part.geometry.attributes).map(([key, value]) => [key, value.array])));
    try {
      expect(parts).toHaveLength(9);
      for (const pose of [{ flight: 1, phase: 1.2, effort: .72 }, { flight: .35, phase: 4.4, effort: .8, landing: .7 }]) {
        bird.update(pose); const expected = bird.wings.map(wing => wing.children[0].geometry.attributes.position.array.slice());
        bird.update({ ...pose, phase: pose.phase + Math.PI * 2 });
        bird.wings.forEach((wing, index) => expect(wing.children[0].geometry.attributes.position.array).toEqual(expected[index]));
      }
      for (let frame = 0; frame < 100; frame++) bird.update({ flight: (1 + Math.sin(frame * .14)) / 2, phase: frame * .35, effort: .82, landing: frame / 100 });
      bird.update({});
      bird.wings.forEach((wing, index) => expect(wing.children[0].geometry.attributes.position.array).toEqual(initial[index]));
      parts.forEach((part, index) => {
        expect(resources.has(part.geometry)).toBe(true); expect(resources.has(part.material)).toBe(true);
        for (const [key, value] of Object.entries(part.geometry.attributes)) { expect(value.array).toBe(arrays[index][key]); expect(value.array.every(Number.isFinite)).toBe(true); }
      });
    } finally { bird.dispose(); }
  });
});
