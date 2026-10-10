import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), T = require('../vendor/three-r128/three.min.js');
const { restorePass53Source } = require('./helpers/cephalopod_pass53_reference.cjs');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const prior = restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)), ids = ['commonOcto', 'blueRinged', 'giantPacific', 'mimicOcto', 'caribReef', 'coconutOcto'];
const hash = s => createHash('sha256').update(s).digest('hex'), owned = [];
const noRandom = Object.assign(Object.create(Math), { random() { throw Error('Grasp consumed dive RNG'); } });
function region(s, a, b) { const start = s.indexOf(a), end = s.indexOf(b, start); assert.ok(start >= 0 && end > start, a); return s.slice(start, end); }
function factory(s) { return new Function('T', 'species', 'Math', region(s, 'function createCLHuntAnimal(', '// Compact, individually owned prey rig.') + ';return createCLHuntAnimal(T,species);'); }
// Apply the explicitly approved mantle shape to the historical grasp reference.
const build = factory(source), oldBuild = factory(require('./helpers/cephalopod_pass68_reference.cjs').applyPass68ModelSource(prior));
function rig(id = 'commonOcto', old = false) { const a = (old ? oldBuild : build)(T, { id, bodyColor: 0xbc6048 }, noRandom); owned.push(a); return a; }
const pose = extra => ({ moving: false, jet: false, strike: 0, camo: 0, substrate: 'sand', reducedMotion: false, ...extra });
const drive = new Function('THREE', 'animal', 'speciesId', 'state', `
  var bodyScale=animal.scale,octopus=animal.root,gameState=state.gameState;
  var squidStrikeVisual=null,squidStrikeAimLocal=new THREE.Vector3(),squidStrikeAimOffset=new THREE.Vector3();
  var octopusStrikeAimLocal=new THREE.Vector3(),octopusStrikeAimOffset=new THREE.Vector3();
  return function(now,dt){
    var octopusStrikeVisual=state.visual,isMoving=state.moving,isJetting=state.jet;
    ${region(source, '// Render reach after prey movement/contact', '// ─── Moray eel AI')}
    state.visual=octopusStrikeVisual;
    return {strike:strikePose,brace:strikeBrace,preparation:strikePreparation,aim:directedStrikeAim&&directedStrikeAim.clone(),radius:directedStrikeRadius};
  };
`);
function fixture(id = 'commonOcto', target = [0.55, -0.37, 1.35], active = true) {
  const a = rig(id), state = { visual: active ? { startedAt: 1000, aimWorld: new T.Vector3(...target).multiplyScalar(a.scale), radiusWorld: .30 } : null,
    moving: false, jet: false, gameState: { lastStrikeAt: active ? 1000 : -1000, camoEff: 0, currentSubstrate: 'sand', isDisplaying: false, a11y: { reducedMotion: false } } };
  return { a, state, step: drive(T, a, id, state) };
}
function snapshot(a, originalTubeOnly = false) {
  const rows = []; a.root.traverse(o => { const r = [o.name, o.type, o.position.toArray(), o.quaternion.toArray(), o.scale.toArray()];
    // The historical animation comparison predates the appended Pass66 tips.
    // Compare every original tube value; other snapshots retain the complete caps.
    const originalArm = originalTubeOnly && /^cl-arm-\d+$/.test(o.name);
    if (o.geometry) r.push(Object.entries(o.geometry.attributes).map(([n, v]) => [n, Array.from(originalArm ? v.array.subarray(0, 189 * v.itemSize) : v.array)]), o.geometry.index ? Array.from(originalArm ? o.geometry.index.array.subarray(0, 960) : o.geometry.index.array) : null, o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null);
    rows.push(r); }); return hash(JSON.stringify(rows));
}
const point = (g, i) => new T.Vector3().fromBufferAttribute(g.attributes.position, i);
const normal = (g, i) => new T.Vector3().fromBufferAttribute(g.attributes.normal, i);
const ring = (g, j) => Array.from({ length: 8 }, (_, i) => point(g, j * 9 + i)).reduce((s, p) => s.add(p), new T.Vector3()).multiplyScalar(1 / 8);
function refs(a) { const rows = []; a.root.traverse(o => { if (o.geometry) rows.push({ o, geometry: o.geometry, material: o.material, index: o.geometry.index, attributes: Object.entries(o.geometry.attributes).map(([n, v]) => [n, v, v.array]), instances: o.instanceMatrix, array: o.instanceMatrix?.array }); }); return rows; }
function retained(rows) { for (const r of rows) { assert.equal(r.o.geometry, r.geometry); assert.equal(r.o.material, r.material); assert.equal(r.geometry.index, r.index); for (const [n, v, a] of r.attributes) { assert.equal(r.geometry.attributes[n], v); assert.equal(v.array, a); } assert.equal(r.o.instanceMatrix, r.instances); assert.equal(r.o.instanceMatrix?.array, r.array); } }
afterEach(() => { for (const a of owned.splice(0)) { const resources = new Set(); a.root.traverse(o => { if (o.geometry) resources.add(o.geometry); if (o.material) resources.add(o.material); }); resources.forEach(o => o.dispose()); } });

describe('Reef octopus directed grasp', () => {
  it('recovers accepted Pass52 exactly and preserves capture rules and every swimming species', () => {
    assert.equal(hash(prior), 'f746c8e0bc501363d41f773cded469fb70d6d7a0200ad26df3ca11d9a1318c6a');
    assert.throws(() => restorePass53Source(source.replace('var octopusStrikeVisual=null,', 'var octopusStrikeVisual=undefined,')));
    const contact = s => region(s, 'if(gameState.pendingStrike&&now>=gameState.pendingStrike.at){', '// Render reach after prey movement/contact');
    assert.equal(contact(source), contact(prior));
    for (const id of ['humboldtSquid', 'cuttlefish', 'bobtailSquid', 'vampireSquid', 'dumboOcto', 'nautilus']) {
      const a = rig(id), b = rig(id, true);
      for (let i = 0; i < 8; i++) { const s = pose({ moving: i > 0, jet: i > 1 && i < 5, strike: i === 3 ? .8 : 0, strikeAim: new T.Vector3(.6, -.37, 1.5), strikeRadius: .3, strikeBrace: .8, reducedMotion: i === 7 }); a.update(i / 20, .05, s); b.update(i / 20, .05, s); assert.equal(snapshot(a), snapshot(b), id); }
    }
  });

  it('leaves idle, crawling, propulsion and undirected event animations exact for all six reef octopuses', () => {
    for (const id of ids) { const a = rig(id), b = rig(id, true);
      for (const s of [pose(), pose({ moving: true }), pose({ jet: true, moving: true }), pose({ strike: .8 }), pose({ strike: .8, strikeAim: { x: NaN, y: 0, z: 1 } }), pose({ reducedMotion: true, jet: true, strike: 1, strikeAim: new T.Vector3(.5, -.3, 1) })]) {
        a.update(2, .05, s); b.update(2, .05, s); assert.equal(snapshot(a, true), snapshot(b, true), id);
      }
    }
  });

  it('places three separate sucker-bearing contact sections around prey under rotation and species scale', () => {
    for (const id of ids) for (const target of [[.55, -.37, 1.35], [-.65, -.2, 1.5], [.2, -.2, -1], [0, 1, 1]]) {
      const f = fixture(id, target), aim = new T.Vector3(...target), a = f.a;
      a.root.position.set(12, -3, 8); a.root.rotation.set(.21, 1.1, -.17, 'YXZ'); a.root.updateMatrixWorld(true);
      f.state.visual.aimWorld.copy(a.root.localToWorld(aim.clone().multiplyScalar(a.scale))); const actual = f.step(1200, .05);
      assert.ok(actual.aim.distanceTo(aim) < 1e-10); assert.equal(actual.strike, 1);
      const d = aim.clone().sub(new T.Vector3(0, -.22, .20)).normalize(), across = new T.Vector3(d.z, 0, -d.x).normalize(), up = new T.Vector3().crossVectors(d, across);
      const radius = .30 / a.scale, contacts = [];
      for (let index = 1; index <= 3; index++) {
        const side = 2 - index, offset = across.clone().multiplyScalar(side * radius).addScaledVector(up, radius * (side ? .32 : .60));
        const expected = aim.clone().add(offset).multiplyScalar(a.scale), g = a.arms[index].mesh.geometry, contact = ring(g, 14);
        assert.ok(contact.distanceTo(expected) < 1e-6, id + ' rendered contact'); contacts.push(contact);
        const end = ring(g, 20), outgoing = ring(g, 15).sub(contact), returning = end.clone().sub(ring(g, 19));
        assert.ok(outgoing.dot(d) > 0 && returning.dot(d) < 0, id + ' tip curls back around contact');
        assert.ok(end.distanceTo(aim.clone().multiplyScalar(a.scale)) < .36, id + ' bounded curled tip');
      }
      assert.ok(contacts[0].distanceTo(contacts[2]) > .59, 'Left and right arms do not converge at one point');
    }
  });

  it('keeps finite separated rings and coherent oral frames throughout close, rearward, vertical and boosted reaches', () => {
    for (const target of [[0, -.37, 1.25], [.65, -.37, 1.3], [0, -.3, .35], [.2, -.2, -1], [0, 1, 1], [0, -.2, 4]]) for (const jet of [false, true]) for (const compression of [1, .42]) {
      const f = fixture('commonOcto', target); f.state.jet = f.state.moving = jet; f.a.arms.forEach(a => { a.compressCurrent = compression; });
      for (let n = 0; n < 24; n++) f.a.update(n * .05, .05, pose({ jet, moving: jet }));
      let previous;
      for (let age = 0; age <= 650; age += 5) {
        f.step(1000 + age, age ? .005 : 0); const current = f.a.arms.slice(1, 4).flatMap(a => a.points.map(p => p.clone()));
        if (previous) assert.ok(Math.max(...current.map((p, i) => p.distanceTo(previous[i]))) < .38, 'No instantaneous arm displacement'); previous = current;
        for (const arm of f.a.arms.slice(1, 4)) { const g = arm.mesh.geometry;
          for (let j = 1; j <= 20; j++) { assert.ok(arm.points[j].distanceTo(arm.points[j - 1]) > .004, 'No pinched ring'); assert.ok(normal(g, j * 9).dot(normal(g, (j - 1) * 9)) > .15, 'No neighboring oral-frame reversal'); }
          if (age % 50 === 0) { assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite)); for (let i = 0; i < g.index.count; i += 3) { const [a, b, c] = [0, 1, 2].map(n => point(g, g.index.getX(i + n))); assert.ok(b.sub(a).cross(c.sub(a)).length() > 1e-10, 'No collapsed triangle'); } }
        }
      }
    }
  });

  it('keeps cups mounted on rendered skin and web seams attached through the grasp', () => {
    const matrix = new T.Matrix4(), origin = new T.Vector3(), rotation = new T.Quaternion(), size = new T.Vector3();
    for (const id of ids) { const f = fixture(id), cups = f.a.root.getObjectByName('cl-suckers'), web = f.a.root.getObjectByName('cl-webbing').geometry;
      for (const age of [0, 40, 100, 150, 200, 260, 400, 550, 650]) { f.step(1000 + age, .05);
        for (let arm = 0; arm < 8; arm++) for (let j = 3; j < 15; j++) for (let row = 0; row < 2; row++) {
          cups.getMatrixAt(arm * 24 + (j - 3) * 2 + row, matrix); matrix.decompose(origin, rotation, size);
          const g = f.a.arms[arm].mesh.geometry, face = ((j - 1) * 8 + (row ? 3 : 4)) * 2 + 1;
          const triangle = new T.Triangle(...[0, 1, 2].map(n => point(g, g.index.getX(face * 3 + n)))), oral = new T.Vector3(0, 1, 0).applyQuaternion(rotation);
          assert.ok(oral.dot(triangle.getNormal(new T.Vector3())) > .99999); assert.ok(size.x > 0 && matrix.elements.every(Number.isFinite));
          assert.ok(Math.abs(triangle.getPlane(new T.Plane()).distanceToPoint(origin) / size.x - .08) < .0003);
        }
        for (let i = 0; i < web.attributes.normal.count; i++) assert.ok(Math.abs(normal(web, i).length() - 1) < .0001);
        for (let arm = 0; arm < 8; arm++) assert.ok(point(web, arm * 54 + 8).distanceTo(f.a.arms[arm].points[5]) < .02 * f.a.scale);
      }
    }
  });

  it('finishes at the ordinary swim pose with retained resources, roots and input state', () => {
    for (const id of ids) { const f = fixture(id), control = fixture(id, undefined, false), resources = refs(f.a), root = f.a.root.position.toArray();
      assert.equal(resources.length, refs(control.a).length);
      for (let age = 0; age <= 650; age += 5) { f.state.moving = control.state.moving = true; f.state.jet = control.state.jet = age >= 80 && age < 450; f.step(1000 + age, age ? .005 : 0); control.step(1000 + age, age ? .005 : 0); }
      assert.equal(f.state.visual, null); assert.equal(snapshot(f.a), snapshot(control.a), id + ' completed recovery'); retained(resources); assert.deepEqual(f.a.root.position.toArray(), root);
      const settings = Object.freeze(pose({ strike: 1, strikeAim: Object.freeze(new T.Vector3(.5, -.37, 1.4)), strikeRadius: .3, stamina: 42 })); f.a.update(2, .05, settings); assert.equal(settings.stamina, 42); assert.equal(settings.strikeAim.x, .5);
    }
  });

  it('uses the accepted clock through meals and freezes cleanly with pause or reduced motion', () => {
    const f = fixture(); assert.equal(f.step(1000, 0).strike, 0); assert.equal(f.step(1040, .04).brace, 1); assert.equal(f.step(1040, 0).strike, 0);
    assert.ok(f.step(1199.999, .05).strike < 1); assert.equal(f.step(1200, .001).strike, 1); assert.equal(f.step(1260, .05).strike, 1);
    const frozen = snapshot(f.a); f.step(1260, 0); assert.equal(snapshot(f.a), frozen);
    f.state.gameState.lastStrikeAt = 1500; assert.ok(f.step(1649, .05).strike < .001); assert.equal(f.step(1650, .001).aim, null); assert.equal(f.state.visual, null);
    for (const id of ids) { const reduced = fixture(id); reduced.state.gameState.a11y.reducedMotion = true; reduced.step(1000, .05); const still = snapshot(reduced.a);
      for (const age of [40, 100, 200, 400, 650]) { reduced.state.jet = true; reduced.step(1000 + age, .05); assert.equal(snapshot(reduced.a), still, id); }
    }
    const distant = fixture('blueRinged', [40, 30, -20]), bounded = distant.step(1200, .05); assert.ok(Math.abs(bounded.aim.distanceTo(new T.Vector3(0, -.22, .20)) - 3.2) < 1e-9);
  });

  it('follows the committed prey until capture and retains an owned recovery snapshot', () => {
    const follow = region(source, 'if(octopusStrikeVisual&&gameState.pendingStrike)', 'if(gameState.pendingStrike&&now>=gameState.pendingStrike.at)');
    const step = new Function('octopusStrikeVisual', 'gameState', 'selectedPrey', follow);
    const prey = { position: new T.Vector3(.6, .2, 1.5), userData: { alive: true } }, alternate = { position: new T.Vector3(-2, .2, 1), userData: { alive: true } };
    const visual = { startedAt: 1000, radiusWorld: .3, aimWorld: prey.position.clone() }, state = { pendingStrike: { target: prey, at: 1200 } };
    prey.position.x = .8; step(visual, state, alternate); assert.deepEqual(visual.aimWorld.toArray(), prey.position.toArray()); assert.notEqual(visual.aimWorld, prey.position);
    const contact = visual.aimWorld.clone(); state.pendingStrike = null; prey.userData.alive = false; prey.position.set(80, 0, 80); step(visual, state, alternate);
    assert.deepEqual(visual.aimWorld.toArray(), contact.toArray()); assert.equal(visual.radiusWorld, .3); assert.equal(visual.startedAt, 1000);
  });
});
