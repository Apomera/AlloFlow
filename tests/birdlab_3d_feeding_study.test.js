import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// Whole-visit free-roam simulations; 5 s is too tight when the suite runs in parallel.
vi.setConfig({ testTimeout: 60_000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
// The habitat's own sites, so this follows the shipped layout.
const SOURCES = [
  { id: 'feeder', kind: 'seed', label: 'Sunflower and millet seed', place: 'the feeder', eat: 'Eating seed spilled under the feeder', x: 2.9, z: -1.9, radius: .55, regrow: .03 },
  { id: 'winterberry', kind: 'berry', label: 'Winterberries', place: 'the winterberry shrub', eat: 'Eating winterberries', x: -3.2, z: -1.8, radius: .5, regrow: .012 },
  { id: 'leaf-litter', kind: 'insect', label: 'Insects in leaf litter', place: 'the leaf litter', eat: 'Scratching leaf litter for insects', x: -2.6, z: 2.6, radius: .6, regrow: .02 },
  { id: 'lawn', kind: 'worm', label: 'Earthworms', place: 'the lawn', eat: 'Pulling earthworms from the lawn', x: 2.4, z: 2.9, radius: .7, regrow: .015 },
  { id: 'oak', kind: 'acorn', label: 'Acorns', place: 'the oak', eat: 'Taking acorns under the oak', x: .6, z: 4.2, radius: .6, regrow: .008 }
];
// Diet accounts the model teaches; a bird must never eat outside its own.
const DIETS = { robin: ['worm', 'berry', 'insect'], chickadee: ['seed', 'insect'], mourningDove: ['seed'], grouse: ['berry', 'acorn', 'insect'],
  blueJay: ['acorn', 'seed', 'insect'], northernCardinal: ['seed', 'berry', 'insect'], darkEyedJunco: ['seed', 'insect'], tuftedTitmouse: ['seed', 'insect', 'acorn'],
  easternTowhee: ['insect', 'seed', 'berry'], americanGoldfinch: ['seed'], easternBluebird: ['insect', 'berry'], whiteThroatedSparrow: ['seed', 'insect', 'berry'] };

function fixture() {
  const local = {};
  new Function('window', anatomy)(local); new Function('window', behavior)(local);
  return local.BirdLab3DWildlife.create(THREE, new THREE.Scene(), { quality: 'low', groundHeight: () => 0 });
}
function transforms(root) { const out = []; root.traverse(o => out.push(...o.position.toArray(), ...o.quaternion.toArray())); return out; }
const crouched = { position: { x: 0, y: 1.6, z: 0 }, speed: 0, crouching: true };
function run(wildlife, seconds, each) {
  for (let frame = 1; frame <= seconds * 30; frame++) { wildlife.update(frame / 30, 1 / 30, crouched); if (each && frame % 10 === 0) each(frame); }
}

describe('BirdLab feeding study', () => {
  it('changes nothing when the study is switched on and off again before free roam', () => {
    const plain = fixture(), toggled = fixture();
    try {
      toggled.setFeedingStudy(SOURCES); toggled.setFeedingStudy(null);
      plain.setMode('free'); toggled.setMode('free');
      let worst = 0, mismatched = 0;
      run(plain, 40); run(toggled, 40, () => {});
      const a = transforms(plain.root), b = transforms(toggled.root);
      for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - b[i]));
      if (JSON.stringify(plain.snapshot()) !== JSON.stringify(toggled.snapshot())) mismatched++;
      expect(worst).toBe(0); expect(mismatched).toBe(0);
      expect(toggled.foodLevels()).toEqual([]);
      expect(toggled.snapshot().every(row => row.food === undefined)).toBe(true);
    } finally { plain.dispose(); toggled.dispose(); }
  });

  it('feeds every species only on its own diet, draws food down and lets it refill', () => {
    const wildlife = fixture();
    try {
      wildlife.setFeedingStudy(SOURCES); wildlife.setMode('free');
      const eaten = {}, lowest = {}, labels = new Set(), refilled = new Set();
      run(wildlife, 150, () => {
        for (const row of wildlife.snapshot()) {
          labels.add(row.behavior);
          if (!row.food) continue;
          (eaten[row.id] ||= new Set()).add(row.food.kind);
          expect(row.behavior).toBe(SOURCES.find(source => source.id === row.food.source).eat);
        }
        for (const level of wildlife.foodLevels()) {
          lowest[level.id] = Math.min(lowest[level.id] ?? 1, level.amount);
          if (level.amount > lowest[level.id] + .2) refilled.add(level.id);
        }
      });
      const outside = Object.entries(eaten).flatMap(([id, kinds]) => [...kinds].filter(kind => !DIETS[id].includes(kind)).map(kind => id + ' ate ' + kind));
      expect(outside).toEqual([]);
      expect(Object.keys(eaten).length).toBeGreaterThanOrEqual(10);
      expect(new Set(Object.values(eaten).flatMap(kinds => [...kinds])).size).toBe(5);
      expect([...eaten.americanGoldfinch]).toEqual(['seed']); expect([...eaten.mourningDove]).toEqual(['seed']);
      expect(Object.values(lowest).filter(amount => amount < .6).length).toBeGreaterThanOrEqual(3);
      expect([...labels].some(label => /^Flying to the /.test(label))).toBe(true);
      // A source that was eaten down recovers as feeding moves elsewhere.
      expect(refilled.size).toBeGreaterThanOrEqual(1);
      // A fresh study starts every source full.
      wildlife.setFeedingStudy(null); wildlife.setFeedingStudy(SOURCES);
      expect(wildlife.foodLevels().every(level => level.amount === 1)).toBe(true);
    } finally { wildlife.dispose(); }
  });

  it('lets a feeding blue jay displace smaller birds but never the grouse', () => {
    const wildlife = fixture();
    try {
      wildlife.setFeedingStudy(SOURCES); wildlife.setMode('free');
      let displaced = 0;
      const victims = new Set();
      run(wildlife, 240, () => { for (const row of wildlife.snapshot()) if (row.behavior === 'Displaced by a blue jay') { displaced++; victims.add(row.id); } });
      expect(displaced).toBeGreaterThan(0);
      expect(victims.has('blueJay')).toBe(false); expect(victims.has('grouse')).toBe(false);
    } finally { wildlife.dispose(); }
  });

  it('reports food only while a bird is eating, and nothing in guided mode', () => {
    const wildlife = fixture();
    try {
      wildlife.setFeedingStudy(SOURCES);
      wildlife.update(12); expect(wildlife.snapshot().every(row => row.food === undefined)).toBe(true);
      wildlife.setMode('free');
      run(wildlife, 60, () => {
        for (const row of wildlife.snapshot()) if (row.food) expect(['Flying', 'Moving', 'Displaced'].some(word => row.behavior.startsWith(word))).toBe(false);
      });
    } finally { wildlife.dispose(); }
  });

  it('finds each guided bird’s main food at its scripted feeding spot without moving the guided scene', () => {
    const wildlife = fixture();
    try {
      wildlife.update(17.25); const before = transforms(wildlife.root), snapshot = wildlife.snapshot();
      const spots = wildlife.guidedForageSpots(17.25);
      expect(transforms(wildlife.root)).toEqual(before); expect(wildlife.snapshot()).toEqual(snapshot);
      expect(spots.length).toBeGreaterThanOrEqual(10);
      for (const spot of spots) {
        expect(DIETS[spot.id][0]).toBe(spot.kind);
        expect(Number.isFinite(spot.x) && Number.isFinite(spot.z)).toBe(true);
        expect(Math.hypot(spot.x, spot.z)).toBeLessThan(6);
      }
      wildlife.setMode('free'); expect(wildlife.guidedForageSpots(0)).toEqual([]);
    } finally { wildlife.dispose(); }
  });
});
