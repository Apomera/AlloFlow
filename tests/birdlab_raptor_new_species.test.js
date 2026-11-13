// Second species expansion: four woodland residents for the Bird Lab clearing
// (chipping sparrow, American tree sparrow, hermit thrush, purple finch) and
// three flyable hawks for Raptor Lab (broad-winged, red-shouldered, harrier).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const raptor = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const birdlab = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const WOODLAND = { chippingSparrow: ['Breeding adult', .135], americanTreeSparrow: ['Adult', .155], hermitThrush: ['Adult', .17], purpleFinch: ['Adult male', .15] };
function library() { const window = {}; new Function('window', anatomy)(window); return window.AvianWoodlandBirds; }
function colors(bird, name) {
  let mesh = null; bird.root.traverse(o => { if (o.isMesh && o.name === name) mesh = o; });
  const c = mesh.geometry.attributes.color, p = mesh.geometry.attributes.position, out = [];
  for (let i = 0; i < c.count; i++) out.push({ r: c.getX(i), g: c.getY(i), b: c.getZ(i), x: p.getX(i), y: p.getY(i), z: p.getZ(i) });
  return out;
}
const linear = hex => { const c = new THREE.Color(hex).convertSRGBToLinear(); return [c.r, c.g, c.b]; };
const near = (v, hex, tolerance = .03) => { const t = linear(hex); return Math.abs(v.r - t[0]) < tolerance && Math.abs(v.g - t[1]) < tolerance && Math.abs(v.b - t[2]) < tolerance; };

describe('four more woodland residents', () => {
  it.each(Object.keys(WOODLAND))('builds %s at both qualities with finite geometry and its own plumage label', id => {
    const api = library();
    expect(api.supports(id)).toBe(true);
    for (const quality of ['high', 'low']) {
      const bird = api.create(THREE, id, { quality });
      try {
        expect(bird.root.userData.plumage).toBe(WOODLAND[id][0]);
        expect(bird.profile.sizeM).toBe(WOODLAND[id][1]);
        expect(bird.feet).toHaveLength(2);
        bird.root.traverse(o => { if (o.isMesh) for (const v of o.geometry.attributes.position.array) expect(Number.isFinite(v)).toBe(true); });
      } finally { bird.dispose(); }
    }
  });

  it('gives both rufous-capped sparrows a rufous crown, and only the chipping sparrow a black eye line', () => {
    const api = library();
    for (const [id, crown] of [['chippingSparrow', '#7c3216'], ['americanTreeSparrow', '#7a3618']]) {
      const bird = api.create(THREE, id, { quality: 'high' });
      try {
        const head = colors(bird, 'woodland-head-plumage');
        // The top of the head is rufous.
        const top = head.filter(v => v.y > Math.max(...head.map(h => h.y)) * .8);
        expect(top.filter(v => near(v, crown, .05)).length / top.length, id).toBeGreaterThan(.6);
        const blackish = head.filter(v => v.r + v.g + v.b < .15).length;
        if (id === 'chippingSparrow') expect(blackish).toBeGreaterThan(6); else expect(blackish).toBe(0);
      } finally { bird.dispose(); }
    }
  });

  it('paints the tree sparrow bill dark above and yellow below', () => {
    const bird = library().create(THREE, 'americanTreeSparrow', { quality: 'high' });
    try {
      const face = colors(bird, 'woodland-eyes-and-bill');
      const tip = Math.max(...face.map(v => v.z)), bill = face.filter(v => v.z > tip - .006 && v.z < tip - .001);
      const upper = bill.filter(v => v.y > -.003), lower = bill.filter(v => v.y < -.0045);
      expect(upper.length).toBeGreaterThan(3); expect(lower.length).toBeGreaterThan(3);
      const mean = list => list.reduce((n, v) => n + v.r + v.g, 0) / list.length;
      expect(mean(lower)).toBeGreaterThan(mean(upper) * 3);
    } finally { bird.dispose(); }
  });

  it('spots the hermit thrush breast and leaves the other three unspotted there', () => {
    const api = library();
    const darkOnPale = id => {
      const bird = api.create(THREE, id, { quality: 'high' });
      try {
        const body = colors(bird, 'woodland-body-plumage');
        const front = body.filter(v => v.z > .015 && v.y < .0);
        const light = front.map(v => v.r + v.g + v.b).sort((a, b) => a - b), median = light[light.length >> 1];
        return light.filter(v => v < median * .5).length / light.length;
      } finally { bird.dispose(); }
    };
    expect(darkOnPale('hermitThrush')).toBeGreaterThan(.04);
    expect(darkOnPale('chippingSparrow')).toBeLessThan(.02);
    expect(darkOnPale('purpleFinch')).toBeLessThan(.02);
  });

  it('describes each newcomer in the Bird Lab panel, with a call and field-mark prompts', () => {
    for (const id of Object.keys(WOODLAND)) {
      expect(birdlab.split(id + ': {name:').length, id).toBe(2);
      expect(birdlab.split('    ' + id + ': { sketch:').length, id).toBe(2);
      // The three prompts are translated, so each starts with its translator call.
      expect(birdlab.split("      " + id + ":[t('stem.birdlab.").length, id).toBe(2);
    }
  });
});

describe('three more flyable hawks', () => {
  const HAWKS = ['broadWinged', 'redShouldered', 'northernHarrier'];
  it('adds each hawk once to the roster, prey table, underwing table and encyclopedia link', () => {
    for (const id of HAWKS) {
      expect(raptor.split("{ id: '" + id + "', name:").length, id).toBe(2);
      expect(raptor.split('"simId":"' + id + '"').length, id).toBe(2);
      expect(new RegExp('\\n    ' + id + ':\\s+\\[').test(raptor), id).toBe(true);
      expect(new RegExp('\\n          ' + id + ':\\{lining:').test(raptor), id).toBe(true);
    }
  });

  it('keeps each roster entry consistent: wing loading and aspect ratio follow from mass, span and area', () => {
    for (const id of HAWKS) {
      const entry = raptor.slice(raptor.indexOf("{ id: '" + id + "', name:")).split('pullupG')[0];
      const num = key => Number(new RegExp(key + ': ([0-9.]+)').exec(entry)[1]);
      expect(num('massKg') / num('wingAreaSqM'), id).toBeCloseTo(num('wingLoading'), 1);
      expect(num('wingspanM') ** 2 / num('wingAreaSqM'), id).toBeCloseTo(num('aspectRatio'), 1);
    }
  });

  it('marks the harrier with a white rump on the tail base', () => {
    expect(raptor).toContain("markKind: 'harrier-white-rump', tailBands: true");
    expect(raptor).toContain("raptorFieldMarkIds.push('white-rump');");
    expect(raptor).toContain("return 'raptor-tail-bands-v1-harrier-rump';");
  });
});
