// BirdLab 3D residents in the rain: the same random draws are reweighted so
// a clear woodland keeps its exact sequence, while a wet one flies less,
// preens and rests more, and keeps robins working a better-stocked lawn.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
const SOURCES = [
  { id: 'feeder', kind: 'seed', label: 'Sunflower and millet seed', place: 'the feeder', eat: 'Eating seed spilled under the feeder', x: 2.9, z: -1.9, radius: .55, regrow: .03 },
  { id: 'winterberry', kind: 'berry', label: 'Winterberries', place: 'the winterberry shrub', eat: 'Eating winterberries', x: -3.2, z: -1.8, radius: .5, regrow: .012 },
  { id: 'leaf-litter', kind: 'insect', label: 'Insects in leaf litter', place: 'the leaf litter', eat: 'Scratching leaf litter for insects', x: -2.6, z: 2.6, radius: .6, regrow: .02 },
  { id: 'lawn', kind: 'worm', label: 'Earthworms', place: 'the lawn', eat: 'Pulling earthworms from the lawn', x: 2.4, z: 2.9, radius: .7, regrow: .015 },
  { id: 'oak', kind: 'acorn', label: 'Acorns', place: 'the oak', eat: 'Taking acorns under the oak', x: .6, z: 4.2, radius: .6, regrow: .008 }
];
const FLYING = /Taking flight|Short flight|Alighting|Flying to/;

function visit(weather, { feeding = false, seconds = 240 } = {}) {
  const local = {};
  new Function('window', anatomy)(local); new Function('window', behavior)(local);
  const wildlife = local.BirdLab3DWildlife.create(THREE, new THREE.Scene(), { quality: 'low', seed: 57 });
  try {
    if (feeding) wildlife.setFeedingStudy(SOURCES);
    wildlife.setMode('free');
    if (weather) wildlife.setWeather(weather);
    const samples = []; samples.lawn = 0;
    for (let frame = 0; frame < seconds * 30; frame++) {
      wildlife.update(frame / 30, 1 / 30);
      if (feeding && frame % 15 === 0) samples.lawn += wildlife.foodLevels().find(source => source.id === 'lawn').amount;
      if (frame % 15 === 0) samples.push(wildlife.snapshot().map(b => ({ id: b.id, behavior: b.behavior, food: b.food && b.food.kind, at: b.position.map(v => +v.toFixed(5)) })));
    }
    return samples;
  } finally { wildlife.dispose(); }
}
const count = (samples, test) => samples.reduce((n, frame) => n + frame.filter(test).length, 0);

describe('BirdLab residents in the rain', () => {
  it('leaves a clear woodland on its exact sequence', () => {
    expect(visit('clear', { seconds: 120 })).toEqual(visit(null, { seconds: 120 }));
  });

  it('flies less and preens and rests more when it rains', () => {
    const dry = visit('clear'), wet = visit('rain');
    const flights = [count(dry, b => FLYING.test(b.behavior)), count(wet, b => FLYING.test(b.behavior))];
    const preening = [count(dry, b => /Preening/.test(b.behavior)), count(wet, b => /Preening/.test(b.behavior))];
    expect(flights[1]).toBeLessThan(flights[0] * .6);
    expect(preening[1]).toBeGreaterThan(preening[0] * 1.4);
    expect(count(wet, b => b.behavior === 'Sitting tight in the rain')).toBeGreaterThan(100);
    expect(count(dry, b => b.behavior === 'Sitting tight in the rain')).toBe(0);
  });

  it('keeps robins on the lawn while others sit tight, with more earthworms up', () => {
    const dry = visit('clear', { feeding: true }), wet = visit('rain', { feeding: true });
    const worms = samples => count(samples, b => b.id === 'robin' && b.food === 'worm');
    const others = samples => count(samples, b => b.id !== 'robin' && !!b.food);
    // Robins already spend most of a dry visit on the lawn; rain must not pull them off it.
    expect(worms(wet)).toBeGreaterThan(worms(dry) * .9);
    expect(others(wet)).toBeLessThan(others(dry) * .95);
    // Wet ground brings earthworms up: the lawn stays better stocked.
    expect(wet.lawn).toBeGreaterThan(dry.lawn * 1.03);
    // No bird eats outside its diet because of the weather.
    expect(count(wet, b => b.food === 'worm' && b.id !== 'robin')).toBe(0);
  });
});
