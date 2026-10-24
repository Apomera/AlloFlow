import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Field marks for the hopping songbirds (allaboutbirds.org ID pages cited in the
// factory): each must carry the marks the observatory notes tell students to find.
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function library() { const scope = {}; new Function('window', source)(scope); return scope.AvianWoodlandBirds; }
const luminance = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
function vertices(bird, name) {
  const mesh = bird.root.getObjectByName(name), g = mesh.geometry, out = [];
  const p = g.attributes.position, c = g.attributes.color, uv = g.attributes.uv, info = g.attributes.featherInfo;
  for (let i = 0; i < p.count; i++) out.push({ x: p.getX(i), y: p.getY(i), z: p.getZ(i), r: c.getX(i), g: c.getY(i), b: c.getZ(i),
    v: uv.getY(i), kind: info.getX(i), seed: info.getY(i) });
  return out;
}
const SONGBIRDS = ['darkEyedJunco', 'tuftedTitmouse', 'easternTowhee'];

describe('hopping woodland songbirds', () => {
  it('are offered by the shared factory without changing its version or Raptor Lab ids', () => {
    const api = library();
    expect(api.version).toBe('1.0.0');
    for (const id of [...SONGBIRDS, 'americanRobin', 'blackCappedChickadee']) expect(api.supports(id)).toBe(true);
    for (const id of ['songbird', 'squirrel', 'ptarmigan', 'hawk']) expect(api.supports(id)).toBe(false);
  });

  it.each(['high', 'low'])('gives the junco a slate hood over a white belly, a pink bill and white outer tail feathers (%s)', quality => {
    const bird = library().create(THREE, 'darkEyedJunco', { quality });
    try {
      const body = vertices(bird, 'woodland-body-plumage');
      const breast = body.filter(v => v.z > .030 && v.y > -.004), belly = body.filter(v => v.y < -.022 && Math.abs(v.z) < .02);
      expect(breast.length).toBeGreaterThan(20); expect(belly.length).toBeGreaterThan(20);
      expect(Math.max(...breast.map(v => luminance(v.r, v.g, v.b)))).toBeLessThan(.12);
      expect(belly.filter(v => luminance(v.r, v.g, v.b) > .6).length / belly.length).toBeGreaterThan(.8);
      const tail = vertices(bird, 'woodland-layered-tail');
      const outer = tail.filter(v => v.seed <= 1 || v.seed >= 10), central = tail.filter(v => v.seed >= 4 && v.seed <= 7);
      expect(Math.min(...outer.map(v => luminance(v.r, v.g, v.b)))).toBeGreaterThan(.6);
      expect(Math.max(...central.map(v => luminance(v.r, v.g, v.b)))).toBeLessThan(.12);
      const bill = vertices(bird, 'woodland-eyes-and-bill').filter(v => v.z > .0165 * .76 + .002);
      expect(bill.length).toBeGreaterThan(10);
      for (const v of bill) { expect(v.r).toBeGreaterThan(v.b); expect(luminance(v.r, v.g, v.b)).toBeGreaterThan(.35); }
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('gives the titmouse a raised gray crest, a black forehead band and peach flanks (%s)', quality => {
    const bird = library().create(THREE, 'tuftedTitmouse', { quality });
    try {
      const head = vertices(bird, 'woodland-head-plumage');
      // The crest rises well above the 21 mm crown and stays gray, not dark or pale.
      const crest = head.filter(v => v.y > .026);
      expect(crest.length).toBeGreaterThan(30);
      for (const v of crest) { const l = luminance(v.r, v.g, v.b); expect(l).toBeGreaterThan(.04); expect(l).toBeLessThan(.25); }
      const forehead = head.filter(v => v.z > .016 && v.y > .002 && v.y < .012);
      expect(forehead.filter(v => luminance(v.r, v.g, v.b) < .02).length).toBeGreaterThan(5);
      const flanks = vertices(bird, 'woodland-body-plumage').filter(v => Math.abs(v.x) > .016 && v.y < .0 && v.y > -.024);
      const peach = flanks.filter(v => v.r > v.g * 1.25 && v.g > v.b * 1.15 && luminance(v.r, v.g, v.b) > .2);
      expect(peach.length).toBeGreaterThan(20);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('gives the towhee a black hood, red eyes, rufous sides and white tail corners (%s)', quality => {
    const bird = library().create(THREE, 'easternTowhee', { quality });
    try {
      const body = vertices(bird, 'woodland-body-plumage');
      // The central breast is black; rufous begins on the sides beside it.
      const breast = body.filter(v => v.z > .040 && v.y > -.004 && Math.abs(v.x) < .012);
      expect(breast.length).toBeGreaterThan(20);
      expect(Math.max(...breast.map(v => luminance(v.r, v.g, v.b)))).toBeLessThan(.05);
      const sides = body.filter(v => Math.abs(v.x) > .020 && v.y < 0 && v.y > -.028 && v.z < .03);
      expect(sides.filter(v => v.r > v.g * 1.8 && v.r > v.b * 2.5 && v.r > .12).length).toBeGreaterThan(20);
      const eyes = vertices(bird, 'woodland-eyes-and-bill').filter(v => v.r > v.g * 4 && v.r > v.b * 4 && v.r > .1);
      expect(eyes.length).toBeGreaterThan(20);
      const corners = vertices(bird, 'woodland-layered-tail').filter(v => (v.seed <= 1 || v.seed >= 10) && v.v > .9);
      expect(corners.length).toBeGreaterThan(4);
      expect(corners.filter(v => luminance(v.r, v.g, v.b) > .6).length / corners.length).toBeGreaterThan(.8);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('gives the robin a dark head, yellow bill, brick-orange breast and white vent (%s)', quality => {
    const bird = library().create(THREE, 'americanRobin', { quality });
    try {
      const body = vertices(bird, 'woodland-body-plumage');
      const breast = body.filter(v => v.z > .040 && Math.abs(v.x) < .015 && v.y > -.020 && v.y < .010);
      expect(breast.length).toBeGreaterThan(20);
      expect(breast.filter(v => v.r > v.g * 2.2 && v.r > v.b * 3 && v.r > .2).length / breast.length).toBeGreaterThan(.8);
      const vent = body.filter(v => v.z < -.035 && v.y < -.018 && Math.abs(v.x) < .015);
      expect(vent.length).toBeGreaterThan(10);
      expect(vent.filter(v => luminance(v.r, v.g, v.b) > .55).length / vent.length).toBeGreaterThan(.7);
      const crown = vertices(bird, 'woodland-head-plumage').filter(v => v.y > .015);
      expect(Math.max(...crown.map(v => luminance(v.r, v.g, v.b)))).toBeLessThan(.06);
      const bill = vertices(bird, 'woodland-eyes-and-bill').filter(v => v.z > .027 * .76 + .004);
      expect(bill.length).toBeGreaterThan(10);
      for (const v of bill) { expect(v.r).toBeGreaterThan(v.b * 3); expect(v.g).toBeGreaterThan(v.b * 2); }
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('gives the chickadee a black cap and bib around white cheeks, and buff flanks (%s)', quality => {
    const bird = library().create(THREE, 'blackCappedChickadee', { quality });
    try {
      const head = vertices(bird, 'woodland-head-plumage');
      const cap = head.filter(v => v.y > .012), cheek = head.filter(v => Math.abs(v.x) > .013 && Math.abs(v.y) < .003 && v.z > -.004);
      const bib = head.filter(v => v.z > .006 && v.y < -.012);
      expect(Math.max(...cap.map(v => luminance(v.r, v.g, v.b)))).toBeLessThan(.03);
      expect(cheek.length).toBeGreaterThan(10);
      expect(cheek.filter(v => luminance(v.r, v.g, v.b) > .7).length / cheek.length).toBeGreaterThan(.7);
      expect(bib.length).toBeGreaterThan(10);
      expect(bib.filter(v => luminance(v.r, v.g, v.b) < .03).length / bib.length).toBeGreaterThan(.7);
      const flanks = vertices(bird, 'woodland-body-plumage').filter(v => Math.abs(v.x) > .014 && v.y < 0 && v.y > -.020);
      expect(flanks.filter(v => v.r > v.b * 1.4 && luminance(v.r, v.g, v.b) > .25).length).toBeGreaterThan(20);
      // The bib continues down the front of the throat feathers below the face.
      bird.update({}); bird.root.updateMatrixWorld(true);
      const neck = vertices(bird, 'woodland-neck-plumage'), meanZ = neck.reduce((sum, v) => sum + v.z, 0) / neck.length;
      const meanY = neck.reduce((sum, v) => sum + v.y, 0) / neck.length;
      const throat = neck.filter(v => v.z > meanZ + .006 && v.y > meanY);
      expect(throat.length).toBeGreaterThan(20);
      // About half of this band is black with the bib (its sides grade into the
      // white cheek); without it, under a tenth is.
      expect(throat.filter(v => luminance(v.r, v.g, v.b) < .03).length / throat.length).toBeGreaterThan(.3);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('keeps the mourning dove head small beside its body, as the field guide describes (%s)', quality => {
    const api = library(), dove = api.create(THREE, 'mourningDove', { quality }), jay = api.create(THREE, 'blueJay', { quality });
    try {
      const width = (bird, name) => { const b = new THREE.Box3().setFromObject(bird.root.getObjectByName(name)); return b.max.x - b.min.x; };
      for (const bird of [dove, jay]) { bird.update({}); bird.root.updateMatrixWorld(true); }
      const doveRatio = width(dove, 'woodland-head-plumage') / width(dove, 'woodland-body-plumage');
      expect(doveRatio).toBeLessThan(.5);
      expect(doveRatio).toBeLessThan(width(jay, 'woodland-head-plumage') / width(jay, 'woodland-body-plumage') - .08);
    } finally { dove.dispose(); jay.dispose(); }
  });

  it('drives a paired hop through the legs for every songbird, while walkers ignore the hop cue', () => {
    const api = library();
    for (const id of [...SONGBIRDS, 'blackCappedChickadee', 'mourningDove', 'americanRobin']) {
      const bird = api.create(THREE, id, { quality: 'low' });
      try {
        bird.update({ hopPhase: -1 }); const rest = bird.feet.map(f => f.rotation.x), restBody = bird.body.rotation.x;
        bird.update({ hopPhase: .42 }); const air = bird.feet.map(f => f.rotation.x), airBody = bird.body.rotation.x;
        if (id === 'mourningDove' || id === 'americanRobin') { expect(air).toEqual(rest); expect(airBody).toBe(restBody); }
        else {
          // Both feet gather together in the air, and the torso leans into the hop.
          expect(air[0]).toBeLessThan(rest[0] - .05); expect(air[1]).toBeCloseTo(air[0], 10);
          expect(airBody).not.toBe(restBody);
        }
        bird.update({ hopPhase: -1 }); expect(bird.feet.map(f => f.rotation.x)).toEqual(rest);
      } finally { bird.dispose(); }
    }
  });
});
