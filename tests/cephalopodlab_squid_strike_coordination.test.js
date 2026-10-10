import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Proposed destination: tests/cephalopodlab_squid_strike_coordination.test.js.
// Execute the production controller and production geometry, never a copied
// easing function. This is bounded CPU coverage; native contact/pause remain
// exercised by the existing Playwright tests and the accompanying motion review.
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(startText, endText) {
  const start = source.indexOf(startText), end = source.indexOf(endText, start);
  if (start < 0 || end <= start) throw new Error('Missing production region: ' + startText);
  return source.slice(start, end);
}
const build = new Function('T', 'species', 'Math', region('function createCLHuntAnimal(', '// Compact, individually owned prey rig.') + ';return createCLHuntAnimal(T,species);');
const drive = new Function('THREE', 'animal', 'speciesId', 'state', `
  var bodyScale=animal.scale,octopus=animal.root,gameState=state.gameState;
  var squidStrikeAimLocal=new THREE.Vector3(),squidStrikeAimOffset=new THREE.Vector3();
  var octopusStrikeVisual=null,octopusStrikeAimLocal=new THREE.Vector3(),octopusStrikeAimOffset=new THREE.Vector3();
  return function(now,dt){
    var squidStrikeVisual=state.visual,isMoving=state.moving,isJetting=state.jet;
    ${region('// Render reach after prey movement/contact', '// ─── Moray eel AI')}
    state.visual=squidStrikeVisual;
  };
`);
const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Strike geometry consumed dive RNG'); } });
const allocated = [];
const pose = extra => ({ moving: false, jet: false, strike: 0, strikeAim: null, camo: 0, substrate: 'sand', reducedMotion: false, ...extra });
function rig(id = 'humboldtSquid') {
  const a = build(THREE, { id, bodyColor: 0xbc6048 }, noRandom);
  allocated.push(a);
  return a;
}
function meshes(a) { const list = []; a.root.traverse(o => { if (o.isMesh) list.push(o); }); return list; }
function resources(a) {
  return meshes(a).map(o => ({ object: o, geometry: o.geometry, material: o.material,
    attributes: Object.entries(o.geometry.attributes).map(([name, value]) => [name, value, value.array]),
    index: o.geometry.index, indexArray: o.geometry.index?.array, instances: o.instanceMatrix, instanceArray: o.instanceMatrix?.array }));
}
function assertResources(a, rows) {
  expect(meshes(a)).toEqual(rows.map(row => row.object));
  for (const row of rows) {
    expect(row.object.geometry).toBe(row.geometry); expect(row.object.material).toBe(row.material);
    for (const [name, attribute, array] of row.attributes) {
      expect(row.geometry.attributes[name]).toBe(attribute); expect(attribute.array).toBe(array);
    }
    expect(row.geometry.index).toBe(row.index); expect(row.geometry.index?.array).toBe(row.indexArray);
    expect(row.object.instanceMatrix).toBe(row.instances); expect(row.object.instanceMatrix?.array).toBe(row.instanceArray);
  }
}
function record(a) {
  return meshes(a).map(o => ({ name: o.name, position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(),
    attributes: Object.fromEntries(Object.entries(o.geometry.attributes).map(([name, value]) => [name, Array.from(value.array)])),
    instances: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null }));
}
const crownBodyFins = a => record(a).filter(row => row.name.startsWith('cl-arm-') || row.name === 'cl-mantle' || row.name.startsWith('cl-fin-'));
function finite(a) {
  let valid = true;
  for (const o of meshes(a)) {
    valid = valid && o.position.toArray().concat(o.quaternion.toArray(), o.scale.toArray()).every(Number.isFinite);
    for (const attribute of Object.values(o.geometry.attributes)) valid = valid && Array.from(attribute.array).every(Number.isFinite);
    if (o.instanceMatrix) valid = valid && Array.from(o.instanceMatrix.array).every(Number.isFinite);
  }
  expect(valid, 'Every rendered coordinate, normal and sucker transform stays finite').toBe(true);
}
function centers(mesh) {
  const p = mesh.geometry.attributes.position, stride = 9;
  expect(p.count % stride, 'Existing eight-sided tube topology').toBe(0);
  return Array.from({ length: p.count / stride }, (_, ring) => {
    const center = new THREE.Vector3();
    for (let side = 0; side < stride - 1; side++) center.add(new THREE.Vector3().fromBufferAttribute(p, ring * stride + side));
    return center.multiplyScalar(1 / (stride - 1));
  });
}
function crownRadius(a) {
  const points = a.arms.map(limb => { const rings = centers(limb.mesh); return rings[Math.floor((rings.length - 1) / 2)]; });
  return points.reduce((sum, p) => sum + Math.hypot(p.x, p.y + .035 * a.scale), 0) / points.length;
}
function mantleBounds(a) {
  const box = new THREE.Box3(), p = new THREE.Vector3(), mesh = a.mantle;
  mesh.updateMatrix();
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) box.expandByPoint(p.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrix));
  return box.getSize(new THREE.Vector3());
}
function fixture(active, aim = new THREE.Vector3(.9, .45, 1.65), extra = {}) {
  const a = rig(), state = { visual: active ? { startedAt: 1000, aimWorld: aim.clone() } : null,
    moving: false, jet: false, gameState: { lastStrikeAt: 1000, camoEff: 0, currentSubstrate: 'sand', isDisplaying: false, a11y: { reducedMotion: false } }, ...extra };
  return { a, state, step: drive(THREE, a, 'humboldtSquid', state) };
}
function cupDirections(a) {
  const cups = a.root.getObjectByName('cl-suckers'), matrix = new THREE.Matrix4(), list = [];
  for (let i = 0; i < cups.count; i++) { cups.getMatrixAt(i, matrix); list.push(new THREE.Vector3(0, 1, 0).transformDirection(matrix)); }
  return list;
}
function maxVertexStep(a, b) {
  let largest = 0;
  for (let i = 0; i < a.length; i++) for (let at = 0; at < a[i].length; at += 3) largest = Math.max(largest, Math.hypot(a[i][at] - b[i][at], a[i][at + 1] - b[i][at + 1], a[i][at + 2] - b[i][at + 2]));
  return largest;
}
const limbBuffers = a => meshes(a).filter(o => /^cl-(arm|tentacle)-\d+$/.test(o.name)).map(o => Array.from(o.geometry.attributes.position.array));
afterEach(() => {
  for (const a of allocated.splice(0)) {
    const owned = new Set();
    meshes(a).forEach(o => { owned.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => owned.add(m)); });
    owned.forEach(resource => resource.dispose());
  }
});

describe('Humboldt coordinated feeding strike', () => {
  it('gathers the crown and folded clubs before launch, then opens around real contact without axial body movement', () => {
    const active = fixture(true), control = fixture(false), stages = [];
    for (const age of [0, 20, 40, 100, 160, 200, 260]) {
      const dt = stages.length ? (age - stages.at(-1).age) / 1000 : 0;
      active.step(1000 + age, dt); control.step(1000 + age, dt);
      stages.push({ age, crown: crownRadius(active.a), controlCrown: crownRadius(control.a), body: mantleBounds(active.a), controlBody: mantleBounds(control.a),
        tips: [0, 1].map(index => centers(active.a.root.getObjectByName('cl-tentacle-' + index)).at(-1)),
        controlTips: [0, 1].map(index => centers(control.a.root.getObjectByName('cl-tentacle-' + index)).at(-1)) });
    }
    const prepared = stages.find(row => row.age === 40), contact = stages.find(row => row.age === 200);
    expect(prepared.crown).toBeLessThan(prepared.controlCrown - .005);
    for (let i = 0; i < 2; i++) expect(prepared.tips[i].z).toBeLessThan(prepared.controlTips[i].z - .03);
    expect(contact.crown).toBeGreaterThan(contact.controlCrown + .005);
    for (const row of [prepared, contact]) {
      expect(row.body.x / row.controlBody.x, 'Small body cross-section brace').toBeGreaterThan(.965);
      expect(row.body.x / row.controlBody.x).toBeLessThan(.996);
      expect(row.body.y / row.controlBody.y).toBeGreaterThan(.965);
      expect(row.body.y / row.controlBody.y).toBeLessThan(.998);
      expect(row.body.z, 'Mantle axial connection stays in place').toBe(row.controlBody.z);
    }
    expect(active.a.root.position.toArray()).toEqual(control.a.root.position.toArray());
    expect(active.a.root.userData.anatomy).toEqual({ arms: 8, feedingTentacles: 2, form: 'squid' });
  });

  it('puts the distal club and actual short tip on the committed contact trajectory at 200 ms under world transforms', () => {
    const aim = new THREE.Vector3(.9, .45, 1.65), f = fixture(true, aim);
    f.a.root.position.set(12, -3, 8); f.a.root.rotation.set(.27, 1.1, -.31, 'YXZ');
    f.a.root.updateMatrixWorld(true);
    f.state.visual.aimWorld.copy(f.a.root.localToWorld(aim.clone()));
    let previousDistance = Infinity, approachStarted = false;
    for (const age of [100, 150, 180, 199.999, 200]) {
      f.step(1000 + age, .016);
      f.a.root.updateMatrixWorld(true);
      const distances = [0, 1].map(index => {
        const mesh = f.a.root.getObjectByName('cl-tentacle-' + index), rings = centers(mesh), distal = rings.slice(Math.floor((rings.length - 1) * .8));
        const world = distal.map(p => mesh.localToWorld(p.clone()));
        return { surfaceCenterDistance: Math.min(...world.map(p => p.distanceTo(f.state.visual.aimWorld))), tipDistance: world.at(-1).distanceTo(f.state.visual.aimWorld) };
      });
      const distance = Math.max(...distances.map(row => row.surfaceCenterDistance));
      // Float32 render buffers can quantize the last sub-millisecond approach
      // to the same point. Require approach over the launch, not strict motion
      // in every vanishingly small endpoint sample.
      if (age === 100) expect(distance).toBeGreaterThan(.15);
      if (age === 180) approachStarted = distance < previousDistance - .01;
      expect(distance).toBeLessThanOrEqual(previousDistance + 1e-7); previousDistance = distance;
      if (age === 200) {
        expect(distance, 'Both distal clubs reach the contact position').toBeLessThan(.045);
        distances.forEach(row => expect(row.tipDistance, 'The actual short tips remain close to the gripping region').toBeLessThan(.20));
      }
    }
    expect(approachStarted).toBe(true);
    finite(f.a);
  });

  it('keeps a complete launch and recovery continuous and returns exactly to the same-time swim control at 650 ms', () => {
    const active = fixture(true), control = fixture(false), owned = resources(active.a);
    let disposed = false, maxStep = 0, minDirectionDot = 1, previous = null, previousCups = null;
    for (const resource of new Set(owned.flatMap(row => [row.geometry, ...(Array.isArray(row.material) ? row.material : [row.material])]))) resource.addEventListener('dispose', () => { disposed = true; });
    // 131 samples includes every phase boundary and reaches an exact integer
    // 650 ms. Ordinary movement/jet inputs are identical in the control.
    for (let age = 0; age <= 650; age += 5) {
      active.state.moving = control.state.moving = true;
      active.state.jet = control.state.jet = age >= 80 && age < 450;
      active.step(1000 + age, age ? .005 : 0); control.step(1000 + age, age ? .005 : 0);
      const next = limbBuffers(active.a), cups = cupDirections(active.a);
      if (previous) maxStep = Math.max(maxStep, maxVertexStep(next, previous));
      if (previousCups) cups.forEach((direction, i) => { minDirectionDot = Math.min(minDirectionDot, direction.dot(previousCups[i])); });
      previous = next; previousCups = cups;
      if (age % 40 === 0 || age === 650) finite(active.a);
    }
    expect(maxStep, 'No limb vertex teleports between 5 ms samples').toBeLessThan(.09);
    expect(minDirectionDot, 'No one-frame sucker orientation reversal').toBeGreaterThan(.85);
    expect(active.state.visual).toBeNull();
    expect(record(active.a), 'No residual strike at the unchanged recovery boundary').toEqual(record(control.a));
    active.step(1800, .05); control.step(1800, .05);
    expect(record(active.a), 'Neutral pose stays on the ordinary swim trajectory').toEqual(record(control.a));
    assertResources(active.a, owned); expect(disposed).toBe(false);
  });

  it('moves the real fin seam with measured mantle width while preserving free membrane span length', () => {
    const active = fixture(true), control = fixture(false);
    let seamError = 0, spanError = 0, freeLift = 0;
    for (const age of [0, 20, 40, 100, 200, 260, 400, 600, 650]) {
      active.state.jet = control.state.jet = age >= 100 && age < 400;
      active.step(1000 + age, .016); control.step(1000 + age, .016);
      const widthRatio = active.a.mantle.scale.x / control.a.mantle.scale.x;
      for (const side of [-1, 1]) {
        const p = active.a.root.getObjectByName('cl-fin-' + side).geometry.attributes.position;
        const ordinary = control.a.root.getObjectByName('cl-fin-' + side).geometry.attributes.position;
        expect(p.count).toBe(ordinary.count);
        for (let root = 0; root < p.count; root += 6) {
          seamError = Math.max(seamError, Math.abs(p.getX(root) - ordinary.getX(root) * widthRatio), Math.abs(p.getY(root) - ordinary.getY(root)), Math.abs(p.getZ(root) - ordinary.getZ(root)));
          for (let span = 1; span < 6; span++) {
            const i = root + span;
            const length = Math.hypot(p.getX(i) - p.getX(root), p.getY(i) - p.getY(root));
            const originalLength = Math.hypot(ordinary.getX(i) - ordinary.getX(root), ordinary.getY(i) - ordinary.getY(root));
            spanError = Math.max(spanError, Math.abs(length - originalLength));
            freeLift = Math.max(freeLift, Math.abs(p.getY(i) - ordinary.getY(i)));
          }
        }
      }
    }
    expect(seamError, 'Attachment follows actual width scaling, rather than the old unbraced outline').toBeLessThan(2e-7);
    expect(spanError, 'Fin brace rotates existing membrane without stretching it').toBeLessThan(5e-7);
    expect(freeLift, 'Free membrane participates in the brace').toBeGreaterThan(.005);
  });

  it('requires a finite aim and valid envelope, preserves the legacy reach alone, and suppresses coordination in reduced motion', () => {
    const aim = new THREE.Vector3(.9, .45, 1.65);
    const reach = rig(), noStrike = rig();
    reach.update(8, .016, pose({ strike: .65, strikeAim: aim })); noStrike.update(8, .016, pose());
    expect(crownBodyFins(reach), 'A reach without accepted coordination cannot brace or open the body/crown/fins').toEqual(crownBodyFins(noStrike));
    expect(limbBuffers(reach).slice(8), 'The existing directed feeding reach still moves its clubs').not.toEqual(limbBuffers(noStrike).slice(8));
    const pairs = [
      [pose({ strike: .65, strikeAim: aim, strikePreparation: NaN, strikeBrace: Infinity }), pose({ strike: .65, strikeAim: aim })],
      [pose({ strike: .65, strikeAim: aim, strikePreparation: '1', strikeBrace: -3 }), pose({ strike: .65, strikeAim: aim })],
      [pose({ strike: .65, strikePreparation: 1, strikeBrace: 1 }), pose({ strike: .65 })],
      [pose({ strike: .65, strikeAim: new THREE.Vector3(NaN, .4, 1.6), strikePreparation: 1, strikeBrace: 1 }), pose({ strike: .65 })],
      [pose({ strike: .65, strikeAim: aim, strikePreparation: 1, strikeBrace: NaN }), pose({ strike: .65, strikeAim: aim, strikePreparation: 1, strikeBrace: 0 })],
      [pose({ strike: .65, strikeAim: aim, strikePreparation: Infinity, strikeBrace: 1 }), pose({ strike: .65, strikeAim: aim, strikePreparation: 0, strikeBrace: 1 })],
      [pose({ strike: .65, strikeAim: aim, strikePreparation: 2, strikeBrace: 20 }), pose({ strike: .65, strikeAim: aim, strikePreparation: 1, strikeBrace: 1 })],
      [pose({ moving: true, jet: true, strike: 1, strikeAim: aim, strikePreparation: 1, strikeBrace: 1, reducedMotion: true }), pose({ moving: true, jet: true, reducedMotion: true })],
    ];
    for (const [settings, expected] of pairs) {
      const a = rig(), ordinary = rig();
      a.update(8, .016, settings); ordinary.update(8, .016, expected);
      finite(a); expect(record(a)).toEqual(record(ordinary));
    }
    for (const id of ['bobtailSquid', 'cuttlefish']) {
      const a = rig(id), ordinary = rig(id), settings = pose({ strike: .65, strikeAim: aim });
      a.update(8, .016, { ...settings, strikePreparation: 1, strikeBrace: 1 }); ordinary.update(8, .016, settings);
      expect(record(a), 'Humboldt coordination leaves other swimming rigs unchanged').toEqual(record(ordinary));
    }
  });
});
