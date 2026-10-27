// BirdLab 3D visible calls: a cued resident lifts its head and opens its bill
// with each syllable (a grouse beats its wings instead); uncued birds and
// every other action keep the historical pose and geometry.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const species = {};
new Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(species);
function rig(model) {
  const state = [];
  model.root.traverse(object => state.push(object.name, ...object.position.toArray(), ...object.quaternion.toArray(), object.visible));
  return state;
}
function faceArrays(model) {
  const face = model.head.getObjectByName('woodland-eyes-and-bill').geometry.attributes;
  return { position: Array.from(face.position.array), normal: Array.from(face.normal.array) };
}
function fixture() {
  const scope = {}, scene = new THREE.Scene(), poses = new Map();
  new Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
  const original = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const model = original(...args), update = model.update;
    model.update = pose => { poses.set(args[1], { ...pose }); update(pose); };
    return model;
  };
  new Function('window', readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8'))(scope);
  return { scene, poses, wildlife: scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed: 57 }) };
}
const behavior = (f, id) => f.wildlife.snapshot().find(item => item.id === id).behavior;

describe('BirdLab 3D calling pose', () => {
  it.each(['northernCardinal', 'americanGoldfinch', 'blackCappedChickadee'])('lifts the %s head, opens a lower mandible, then restores the exact closed bill', id => {
    const model = species.AvianWoodlandBirds.create(THREE, id, { quality: 'high' });
    try {
      const rest = rig(model), face = faceArrays(model);
      expect(model.head.getObjectByName('woodland-lower-mandible')).toBeUndefined();
      model.update({ song: 0, gape: 0 });
      expect(model.head.getObjectByName('woodland-lower-mandible'), 'a bird that never calls builds no jaw').toBeUndefined();
      const headPitch = model.head.rotation.x;
      model.update({ song: 1, gape: 1 });
      const jaw = model.head.getObjectByName('woodland-song-jaw');
      expect(jaw.visible).toBe(true);
      expect(jaw.rotation.x).toBeCloseTo(.42, 10);
      expect(model.head.rotation.x).toBeLessThan(headPitch - .3);
      const open = model.head.getObjectByName('woodland-eyes-and-bill').geometry.attributes.position.array;
      expect(Array.from(open)).not.toEqual(face.position);
      model.update({ song: 0, gape: 0 });
      expect(jaw.visible).toBe(false);
      expect(faceArrays(model)).toEqual(face);
      // The hidden jaw is the only addition to the closed rig.
      expect(rig(model).filter((v, i, a) => !['woodland-song-jaw', 'woodland-lower-mandible'].includes(a[i - (i % 9)]))).toEqual(rest);
    } finally { model.dispose(); }
  });

  it('gives way to every other action and drums the grouse wings without a gape', () => {
    const cardinal = species.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality: 'low' });
    const grouse = species.AvianWoodlandBirds.create(THREE, 'grouse', { quality: 'low' });
    try {
      for (const busy of [{ peck: .5 }, { walking: .5 }, { flight: .3 }, { preen: .6 }, { landing: .4 }]) {
        cardinal.update({ ...busy });
        const before = rig(cardinal);
        cardinal.update({ ...busy, song: 1, gape: 1 });
        expect(rig(cardinal), JSON.stringify(busy)).toEqual(before);
      }
      grouse.update({});
      const wing = grouse.wings[0].rotation.z;
      grouse.update({ song: 1, drum: 1, gape: 1 });
      expect(Math.abs(grouse.wings[0].rotation.z - wing)).toBeGreaterThan(.5);
      expect(grouse.head.getObjectByName('woodland-lower-mandible')).toBeUndefined();
    } finally { cardinal.dispose(); grouse.dispose(); }
  });

  it('times the posture and gape to the cued syllables on the scene clock', () => {
    const f = fixture();
    try {
      expect(f.wildlife.cueSong('mourningDove', [{ on: 0, dur: .4 }], 0)).toBe(false);
      expect(f.wildlife.cueSong('nobody', [{ on: 0, dur: .4 }], 0)).toBe(false);
      expect(f.wildlife.cueSong('northernCardinal', [{ on: 0, dur: -1 }], 0)).toBe(false);
      f.wildlife.update(.4, 1 / 60);
      expect(f.poses.get('northernCardinal').song ?? 0).toBe(0);
      expect(f.wildlife.cueSong('northernCardinal', [{ on: 0, dur: .12, freq: 2000 }, { on: .5, dur: .12, freq: 4800 }], .1)).toBe(true);
      // Paused frames do not advance the call.
      f.wildlife.update(.4, 0);
      expect(f.poses.get('northernCardinal').gape).toBe(0);
      const samples = [];
      for (let frame = 1; frame <= 90; frame++) {
        f.wildlife.update(.4, 1 / 60);
        const pose = f.poses.get('northernCardinal');
        samples.push({ t: frame / 60, song: pose.song, gape: pose.gape, behavior: behavior(f, 'northernCardinal') });
      }
      const at = t => samples.reduce((best, s) => Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best);
      expect(at(.05).gape).toBe(0);
      expect(at(.16).gape).toBeGreaterThan(.3);
      expect(at(.40).gape, 'closed between syllables').toBe(0);
      expect(at(.40).song, 'posture held between syllables').toBe(1);
      expect(at(.66).gape, 'higher note, wider gape').toBeGreaterThan(at(.16).gape);
      expect(at(.40).behavior).toBe('Calling');
      expect(samples.at(-1).song).toBe(0);
      expect(samples.at(-1).behavior).not.toBe('Calling');
    } finally { f.wildlife.dispose(); }
  });
});

describe('BirdLab song cues', () => {
  it('lays out syllable onsets exactly as the synthesis plays them', () => {
    resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
    const p = window.__alloBirdLabPure;
    for (const id of Object.keys(p.WOODLAND_CALLS)) {
      const sketch = p.WOODLAND_CALLS[id].sketch, tones = p.callTones({ sketch }), cues = p.songCues(sketch);
      expect(cues).toHaveLength(tones.length);
      let on = 0;
      cues.forEach((cue, i) => { expect(cue.on, id).toBeCloseTo(on, 10); expect(cue.dur).toBe(tones[i].dur); expect(cue.freq).toBe(tones[i].freq); on += tones[i].dur + tones[i].gap; });
    }
  });
});
