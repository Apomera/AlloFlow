// BirdLab 3D mobbing: after the hawk lands, jays, chickadees, titmice and
// robins within range move in and scold it once per landing; other species
// never join; a hawk already perched on arrival is left alone. Mobbing calls
// are low, harsh and easy to locate, unlike the thin "seet" given for a hawk
// overhead.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 120_000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
const MOBBERS = ['blueJay', 'chickadee', 'tuftedTitmouse', 'robin'];

function woodland() {
  const local = {};
  new Function('window', anatomy)(local); new Function('window', behavior)(local);
  const wildlife = local.BirdLab3DWildlife.create(THREE, new THREE.Scene(), { quality: 'low', seed: 57, groundHeight: () => 0 });
  wildlife.setMode('free');
  for (let frame = 0; frame < 5 * 30; frame++) wildlife.update(frame / 30, 1 / 30);
  return wildlife;
}
function watch(wildlife, seconds, hawk) {
  const seen = {}; let peak = 0;
  for (let frame = 0; frame < seconds * 30; frame++) {
    if (hawk) wildlife.setPredator(hawk);
    wildlife.update(5 + frame / 30, 1 / 30);
    peak = Math.max(peak, wildlife.mobbers());
    for (const b of wildlife.snapshot()) {
      const row = seen[b.id] || (seen[b.id] = { behaviors: new Set(), alarms: new Set(), closest: Infinity, mobAlarm: false });
      row.behaviors.add(b.behavior);
      if (b.alarm && b.alarm.mob) { row.alarms.add(b.alarm.at); row.mobAlarm = true; }
      if (b.behavior === 'Mobbing the perched hawk' && hawk) row.closest = Math.min(row.closest, Math.hypot(b.position[0] - hawk.x, b.position[2] - hawk.z));
    }
  }
  return { seen, peak };
}

describe('BirdLab mobbing', () => {
  it('leaves a hawk alone that was already perched on arrival', () => {
    const w = woodland();
    try {
      const jay = w.snapshot().find(b => b.id === 'blueJay');
      const { seen, peak } = watch(w, 14, { x: jay.position[0] + 2.5, y: 3, z: jay.position[2], flying: false });
      expect(peak).toBe(0);
      expect(Object.values(seen).some(r => r.behaviors.has('Mobbing the perched hawk'))).toBe(false);
    } finally { w.dispose(); }
  });

  it('sends mobbing species in after a landing, once each, and no others', () => {
    const w = woodland();
    try {
      // Residents stay within the clearing, so the perch sits 2.5 m from the jay toward its centre.
      const jay = w.snapshot().find(b => b.id === 'blueJay'), r = Math.hypot(jay.position[0], jay.position[2]) || 1;
      const perch = { x: jay.position[0] * (1 - 2.5 / r), y: 3, z: jay.position[2] * (1 - 2.5 / r) };
      w.setPredator({ ...perch, flying: true }); w.update(5, 1 / 30);
      const { seen, peak } = watch(w, 14, { ...perch, flying: false });
      const mobbing = Object.keys(seen).filter(id => seen[id].behaviors.has('Mobbing the perched hawk'));
      expect(mobbing).toContain('blueJay');
      for (const id of mobbing) {
        expect(MOBBERS, id).toContain(id);
        expect(seen[id].mobAlarm, id).toBe(true);
        expect(seen[id].alarms.size, id + ' scolds once per landing').toBe(1);
        expect(seen[id].closest, id + ' moves in close').toBeLessThan(2.8);
      }
      for (const id of Object.keys(seen).filter(id => !MOBBERS.includes(id))) expect(seen[id].behaviors.has('Mobbing the perched hawk'), id).toBe(false);
      expect(peak).toBeGreaterThan(0);
      // Not tested here: the 12 s window after landing for birds that only wander
      // into range later. Every bird near this perch mobs within it, so a check
      // after it would pass on the once-per-landing rule alone.
    } finally { w.dispose(); }
  });
});

describe('BirdLab mobbing calls', () => {
  let p;
  beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab'); p = window.__alloBirdLabPure; });
  it('scolds low and harsh when mobbing, but gives a high seet for a hawk overhead', () => {
    const scold = p.alarmCall('tuftedTitmouse', .15, true), seet = p.alarmCall('tuftedTitmouse', .15, false);
    const scoldTones = p.callTones({ sketch: scold.sketch }), seetTones = p.callTones({ sketch: seet.sketch });
    expect(scold.sketch.label).toMatch(/^Mobbing call: .*easy to locate/);
    expect(scoldTones.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...scoldTones.map(t => Math.max(t.freq, t.endFreq)))).toBeLessThan(4000);
    expect(scoldTones.every(t => t.quality === 'harsh')).toBe(true);
    expect(Math.min(...seetTones.map(t => Math.min(t.freq, t.endFreq)))).toBeGreaterThan(6500);
    const chick = p.alarmCall('chickadee', .15, true);
    expect(chick.sketch.label).toMatch(/^Mobbing call: chick-a-dee-dee-dee, 3 dee notes$/);
    expect(p.alarmCall('blueJay', .15, true).sketch.label).toBe('Mobbing call: harsh jay screams');
  });
});
