// BirdLab 3D predator response: a hawk crossing low over the clearing makes
// nearby residents freeze and watch the sky, closer passes hold them longer,
// distant or high hawks are ignored, and each freeze carries one alarm that
// the sound layer voices: more chickadee "dee" notes for greater danger, a thin
// "seet" from most songbirds, and silence from the dove and grouse.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

vi.setConfig({ testTimeout: 120_000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');

function woodland() {
  const local = {};
  new Function('window', anatomy)(local); new Function('window', behavior)(local);
  const wildlife = local.BirdLab3DWildlife.create(THREE, new THREE.Scene(), { quality: 'low', seed: 57, groundHeight: () => 0 });
  wildlife.setMode('free');
  return wildlife;
}
function trace(wildlife, seconds, each) {
  const out = [];
  for (let frame = 0; frame < seconds * 30; frame++) { if (each) each(frame); wildlife.update(frame / 30, 1 / 30); if (frame % 10 === 0) out.push(wildlife.snapshot()); }
  return out;
}

describe('BirdLab residents and the hawk', () => {
  it('changes nothing until a hawk is reported', () => {
    const plain = woodland(), cleared = woodland();
    try {
      cleared.setPredator(null);
      const a = trace(plain, 60).map(f => f.map(b => [b.id, b.behavior, b.position])), b = trace(cleared, 60).map(f => f.map(b => [b.id, b.behavior, b.position]));
      expect(b).toEqual(a);
    } finally { plain.dispose(); cleared.dispose(); }
  });

  it('freezes birds under a low pass, longer when closer, and ignores a high or distant hawk', () => {
    const w = woodland();
    try {
      trace(w, 5);
      const birds = w.snapshot(), target = birds.find(b => b.id === 'chickadee');
      // A high hawk overhead and a low hawk far away: no reaction.
      for (const hawk of [{ x: target.position[0], y: 30, z: target.position[2] }, { x: target.position[0] + 40, y: 3, z: target.position[2] }]) {
        trace(w, 1, () => w.setPredator(hawk));
        expect(w.snapshot().filter(b => b.alarm)).toEqual([]);
      }
      w.setPredator(null);
      // A low pass right over the chickadee.
      const hawk = { x: target.position[0], y: 4, z: target.position[2] };
      w.setPredator(hawk); w.update(6, 1 / 30); w.setPredator(null);
      const frozen = w.snapshot().filter(b => b.alarm);
      expect(frozen.length).toBeGreaterThan(0);
      for (const b of frozen) {
        expect(b.behavior).toBe('Freezing as the hawk passes');
        const range = Math.hypot(b.position[0] - hawk.x, b.position[2] - hawk.z);
        expect(b.alarm.danger).toBeCloseTo(1 - range / 9, 1);
      }
      // Each freeze ends on its own, and the same bird does not refreeze at once.
      const longest = Math.max(...frozen.map(b => 2.6 + b.alarm.danger * 2));
      trace(w, Math.ceil(longest) + 1);
      expect(w.snapshot().filter(b => b.alarm)).toEqual([]);
      w.setPredator(hawk); w.update(20, 1 / 30); w.setPredator(null);
      expect(w.snapshot().filter(b => b.alarm)).toEqual([]);
    } finally { w.dispose(); }
  });
});

describe('BirdLab alarm calls', () => {
  let p;
  beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab'); p = window.__alloBirdLabPure; });

  it('adds chickadee dee notes as danger grows', () => {
    const dees = [0, .5, 1].map(d => p.alarmCall('chickadee', d));
    expect(dees.map(a => a.dees)).toEqual([2, 5, 8]);
    for (const a of dees) {
      expect(a.sketch.notes.filter(n => n.syl === 'dee')).toHaveLength(a.dees);
      expect(a.sketch.label).toContain(a.dees + ' dee notes');
      expect(p.callTones({ sketch: a.sketch }).length).toBe(a.dees + 2);
    }
  });

  it('gives most songbirds a high thin seet, the jay its scream, and the dove and grouse silence', () => {
    expect(p.alarmCall('mourningDove', 1)).toBeNull();
    expect(p.alarmCall('grouse', 1)).toBeNull();
    expect(p.alarmCall('blueJay', 1).sketch.notes).toBe(p.CALL_SKETCHES.jay_call.notes);
    for (const id of ['robin', 'northernCardinal', 'darkEyedJunco', 'americanGoldfinch', 'whiteThroatedSparrow']) {
      const tones = p.callTones({ sketch: p.alarmCall(id, .5).sketch });
      expect(tones).toHaveLength(1);
      expect(Math.min(tones[0].freq, tones[0].endFreq), id).toBeGreaterThan(6500);
    }
  });
});
