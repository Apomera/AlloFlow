import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function create(quality = 'low', species = 'northernCardinal') {
  const scope = {}; Function('window', source)(scope);
  return scope.AvianWoodlandBirds.create(THREE, species, { quality });
}
function tail(bird) { return bird.tail.getObjectByName('woodland-layered-tail'); }
function widths(attributes) {
  const rows = new Map(), { position, uv, featherInfo } = attributes;
  for (let i = 0; i < position.count; i++) {
    const key = `${featherInfo.getY(i)}:${uv.getY(i)}`;
    if (!rows.has(key)) rows.set(key, []);
    if (uv.getX(i) === 0 || uv.getX(i) === 1) rows.get(key).push(i);
  }
  return [...rows.values()].map(([a, b]) => Math.hypot(
    position.getX(a) - position.getX(b), position.getY(a) - position.getY(b), position.getZ(a) - position.getZ(b)));
}

describe('cardinal tail feather compliance through a hop', () => {
  it.each(['low', 'high'])('adds restrained distal response while preserving roots and vane widths (%s)', quality => {
    const bird = create(quality), mesh = tail(bird), { position, uv } = mesh.geometry.attributes;
    const rest = position.array.slice(), originalWidths = widths(mesh.geometry.attributes);
    const retained = [mesh.geometry, mesh.material, position.array, mesh.geometry.attributes.normal.array];
    try {
      // The distal feathers follow the tail base through takeoff, flight
      // within the hop, then reverse their small deflection after planting.
      for (const [hopPhase, direction] of [[.13, 1], [.415, 1], [.845, -1]]) {
        bird.update({ hopPhase });
        let largestTipTravel = 0;
        for (let i = 0; i < position.count; i++) {
          const travel = position.getY(i) - rest[i * 3 + 1];
          if (uv.getY(i) === 0) expect(travel).toBe(0);
          if (uv.getY(i) === 1) {
            expect(travel * direction).toBeGreaterThan(.001);
            largestTipTravel = Math.max(largestTipTravel, Math.abs(travel));
          }
        }
        expect(largestTipTravel).toBeGreaterThan(.0012);
        expect(largestTipTravel).toBeLessThan(.002);
      }
      for (let step = 0; step <= 50; step++) {
        bird.update({ hopPhase: step / 50 });
        const currentWidths = widths(mesh.geometry.attributes);
        currentWidths.forEach((width, row) => expect(Math.abs(width - originalWidths[row])).toBeLessThan(3e-8));
        expect(position.array.every(Number.isFinite)).toBe(true);
        expect(mesh.geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);
      }
      bird.update({}); expect(position.array).toEqual(rest);
      expect(mesh.geometry).toBe(retained[0]);
      expect(mesh.material).toBe(retained[1]);
      expect(position.array).toBe(retained[2]);
      expect(mesh.geometry.attributes.normal.array).toBe(retained[3]);
    } finally { bird.dispose(); }
  });

  it.each(['low', 'high'])('joins the feather response without velocity or acceleration steps (%s)', quality => {
    const bird = create(quality), { position, uv } = tail(bird).geometry.attributes;
    const tip = Array.from({ length: position.count }, (_, i) => i).find(i => uv.getY(i) === 1 && uv.getX(i) === .5);
    const epsilon = .0002;
    try {
      for (const boundary of [0, .025, .18, .235, .65, .69, 1]) {
        const samples = [];
        for (const offset of [-2, -1, 0, 1, 2]) {
          bird.update({ hopPhase: boundary + offset * epsilon }); samples.push(position.getY(tip));
        }
        const leftV = (3 * samples[2] - 4 * samples[1] + samples[0]) / (2 * epsilon);
        const rightV = (-3 * samples[2] + 4 * samples[3] - samples[4]) / (2 * epsilon);
        const leftA = (samples[2] - 2 * samples[1] + samples[0]) / epsilon ** 2;
        const rightA = (samples[4] - 2 * samples[3] + samples[2]) / epsilon ** 2;
        expect(Math.abs(leftV - rightV), `phase ${boundary} velocity`).toBeLessThan(.0001);
        expect(Math.abs(leftA - rightA), `phase ${boundary} acceleration`).toBeLessThan(.04);
      }
    } finally { bird.dispose(); }
  });

  it('is seekable, returns to exact rest, and does not alter airborne flight geometry', () => {
    const bird = create(), mesh = tail(bird), position = mesh.geometry.attributes.position;
    try {
      const rest = position.array.slice();
      bird.update({ hopPhase: .415 }); const expected = position.array.slice();
      for (const pose of [{ flight: 1, phase: 2.7 }, { hopPhase: .845 }, { landingSettle: .6 }, {}, { hopPhase: .13 }]) bird.update(pose);
      bird.update({ hopPhase: .415 }); expect(position.array).toEqual(expected);
      const airborne = { flight: .8, phase: 1.4, effort: .7 };
      bird.update(airborne); const flight = position.array.slice();
      bird.update({ ...airborne, hopPhase: .415 }); expect(position.array).toEqual(flight);
      bird.update({}); expect(position.array).toEqual(rest);
    } finally { bird.dispose(); }
  });

  it('does not add a hop feather response to other shared species', () => {
    for (const species of ['mourningDove', 'grouse', 'blueJay']) {
      const bird = create('low', species), position = tail(bird).geometry.attributes.position;
      try {
        const rest = position.array.slice();
        for (const hopPhase of [.13, .415, .845]) { bird.update({ hopPhase }); expect(position.array).toEqual(rest); }
      } finally { bird.dispose(); }
    }
  });
});
