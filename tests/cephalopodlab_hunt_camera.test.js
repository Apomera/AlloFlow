import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), T = require('../vendor/three-r128/three.min.js');
const { restorePass54Source } = require('./helpers/cephalopod_pass54_reference.cjs');
const { restorePass57Source } = require('./helpers/cephalopod_pass57_reference.cjs');
const { guards: pass62Guards } = require('./helpers/cephalopod_pass62_reference.cjs');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8'), prior = restorePass54Source(source);
const ids = ['commonOcto', 'blueRinged', 'giantPacific', 'mimicOcto', 'caribReef', 'coconutOcto', 'humboldtSquid', 'cuttlefish', 'bobtailSquid', 'vampireSquid', 'dumboOcto', 'nautilus'], owned = [];
const hash = s => createHash('sha256').update(s).digest('hex');
function region(s, a, b) { const i = s.indexOf(a), j = s.indexOf(b, i); assert.ok(i >= 0 && j > i, a); return s.slice(i, j); }
const factory = new Function('T', 'species', 'Math', region(source, 'function createCLHuntAnimal(', '// Compact, individually owned prey rig.') + ';return createCLHuntAnimal(T,species);');
const noRandom = Object.assign(Object.create(Math), { random() { throw Error('Camera consumed dive RNG'); } });
function fixture(id = 'commonOcto', aspect = 1.3, text = source) {
  const animal = factory(T, { id, bodyColor: 0xbc6048 }, noRandom); owned.push(animal.root);
  const helpers = text.includes('var huntCameraFrame=') ? region(text, '        var huntCameraFrame=', '        function updateDiveCamera(') : '';
  const context = `const octopus=animal.root,bodyScale=animal.scale,camera=new THREE.PerspectiveCamera(48,aspect,.1,150),cameraRay=new THREE.Raycaster(),rocks=[],targetHalo=new THREE.Object3D(),gameState={cameraMode:0,facingAngle:0,paused:true,a11y:{reducedMotion:false},pendingStrike:null,score:17,strikeReadyAt:1900},inspection={active:false,snapCamera:true,yaw:.4,pitch:.3,distance:5,center:new THREE.Vector3(0,2,0)},anatomyLabels=[],viewButton={textContent:'View · Follow',title:''};
  let selectedPrey=null,octopusStrikeVisual=null,squidStrikeVisual=null,ground=-10,focused=0,occlusions=0;
  const announcements=[],canvasEl={focus(){focused++;},getBoundingClientRect(){return{left:0,top:0,width:800,height:600};}},inspectionPanel={getBoundingClientRect(){return{left:0,top:0};}},inspectionTitle={getBoundingClientRect(){return{bottom:10};}},inspectionTools={getBoundingClientRect(){return{top:580};}},terrainHeight=()=>ground,updateInspectionOcclusion=()=>{occlusions++;},layoutCLAnatomyLabels=()=>[],clAnnounce=s=>announcements.push(s);
  octopus.position.set(0,2,0);camera.position.set(0,4,-4.6);camera.lookAt(0,2.15,0);camera.updateMatrixWorld();`;
  const f = new Function('THREE', 'animal', 'aspect', 'Math', context + helpers + region(text, '        function updateDiveCamera(', '        function preyCandidates()') + text.match(/function cycleCamera\(\)\{[^\n]*\}/)[0] + `;return{animal,octopus,camera,cameraRay,rocks,targetHalo,gameState,inspection,viewButton,announcements,update:updateDiveCamera,cycle:cycleCamera,frame:typeof huntCameraFrame==='undefined'?null:huntCameraFrame,select(p){selectedPrey=p;},visual(v,squid=false){if(squid)squidStrikeVisual=v;else octopusStrikeVisual=v;},ground(n){ground=n;},get focused(){return focused;},get occlusions(){return occlusions;}};`)(T, animal, aspect, noRandom);
  return f;
}
const pose = extra => ({ moving: false, jet: false, strike: 0, camo: 0, substrate: 'sand', reducedMotion: false, ...extra });
const snapshot = f => ({ position: f.camera.position.toArray(), rotation: f.camera.quaternion.toArray(), inspectionSnap: f.inspection.snapCamera });
function fit(f) {
  f.octopus.updateWorldMatrix(true, true); let maxX = 0, maxY = 0;
  f.octopus.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.visible) return;
    const a = o.geometry.attributes.position, p = new T.Vector3();
    for (let i = 0; i < a.count; i += 3) { p.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld).project(f.camera); assert.ok(p.z > -1 && p.z < 1 && Number.isFinite(p.x + p.y), o.name); maxX = Math.max(maxX, Math.abs(p.x)); maxY = Math.max(maxY, Math.abs(p.y)); }
  });
  assert.ok(maxX < .99 && maxY < .99, JSON.stringify({ id: f.animal.root.userData.species, maxX, maxY })); return { maxX, maxY };
}
afterEach(() => { const resources = new Set(); for (const root of owned.splice(0)) root.traverse(o => { if (o.geometry) resources.add(o.geometry); if (o.material) resources.add(o.material); }); resources.forEach(o => o.dispose()); });

describe('Optional live Hunt camera', () => {
  it('recovers accepted Pass53 exactly and leaves animal, prey and capture implementations unchanged', () => {
    assert.equal(hash(prior), '9cf2336d49a85586715b3da91b3b90f37e3f171e2bbb6ac6073014b670591d4b');
    assert.throws(() => restorePass54Source(source.replace('var huntCameraFrame=', 'var changedFrame=')));
    // This wide historical region also contains plant helpers; reverse only the exact approved Pass57 edits.
    assert.equal(region(restorePass57Source(source), 'function createCLHuntAnimal(', 'function initHuntSim3D('), region(prior, 'function createCLHuntAnimal(', 'function initHuntSim3D('));
    // This historical capture region includes the approved Pass62 rig squeeze input.
    // Reverse that one exact guarded edit; every other capture/update byte stays protected.
    const squeezeInput = pass62Guards.edits.find(edit => edit.name === 'rig squeeze input');
    let liveCaptureRegion = region(source, 'if(gameState.pendingStrike&&now>=gameState.pendingStrike.at){', '// ─── Moray eel AI');
    // Pass73 adds only two visual refuge posture inputs in this guarded capture region.
    const postureInput='crevice:gameState.crevice, refugeHideBlend:gameState.refugeHideBlend||0, refugePeekBlend:gameState.refugePeekBlend||0,';
    assert.equal(liveCaptureRegion.split(postureInput).length,2,'Unique approved refuge posture input');
    liveCaptureRegion=liveCaptureRegion.replace(postureInput,'crevice:gameState.crevice,');
    // Pass72 adds only the wall metadata consumed by the visual arm pose here.
    // Guard and reverse that input before applying the older squeeze-input guard.
    const wallInput = 'squeezeBlend:gameState.squeezeBlend||0, crevice:gameState.crevice,';
    assert.equal(liveCaptureRegion.split(wallInput).length, 2, 'Unique approved wall-pose input');
    const captureRegion = liveCaptureRegion.replace(wallInput, 'squeezeBlend:gameState.squeezeBlend||0,');
    assert.equal(captureRegion.split(squeezeInput.after).length, 2, 'Unique approved squeeze-input inverse');
    assert.equal(captureRegion.replace(squeezeInput.after, squeezeInput.before), region(prior, 'if(gameState.pendingStrike&&now>=gameState.pendingStrike.at){', '// ─── Moray eel AI'));
  });

  it('preserves every original camera view, interpolation, reduced-motion and inspection pose exactly', () => {
    for (const mode of [0, 1, 2]) for (const reduced of [false, true]) for (const inspecting of [false, true]) for (const snap of [false, true]) {
      const f = fixture(), old = fixture('commonOcto', 1.3, prior);
      for (const x of [f, old]) { x.gameState.cameraMode = mode; x.gameState.facingAngle = .75; x.gameState.a11y.reducedMotion = reduced; x.inspection.active = inspecting; x.update(.05, snap); }
      assert.deepEqual(snapshot(f), snapshot(old)); assert.equal(f.occlusions, old.occlusions);
    }
  });

  it('cycles four named views while paused without advancing gameplay or redirecting inspection', () => {
    const f = fixture(), before = f.octopus.position.toArray();
    for (const name of ['Side', 'Tactical', 'Hunt', 'Follow']) { f.cycle(); assert.equal(f.viewButton.textContent, 'View · ' + name); assert.equal(f.announcements.at(-1), name + ' view'); assert.ok(Math.abs(f.camera.quaternion.dot(f.targetHalo.quaternion)) > 1 - 1e-12); }
    assert.equal(f.gameState.cameraMode, 0); assert.equal(f.focused, 4); assert.deepEqual(f.octopus.position.toArray(), before); assert.equal(f.gameState.score, 17); assert.equal(f.gameState.strikeReadyAt, 1900);
    f.inspection.active = true; f.gameState.cameraMode = 2; const camera = snapshot(f); f.cycle(); assert.deepEqual(snapshot(f), camera); assert.equal(f.gameState.cameraMode, 3);
    assert.ok(source.includes("viewButton.setAttribute('aria-label','View')"));
  });

  for (const id of ids) it('fits ' + id + ' through live reach, turns and recovery on wide and narrow screens', () => {
    for (const aspect of [1.55, .54]) {
      const f = fixture(id, aspect); f.gameState.cameraMode = 3;
      for (let i = 0; i < 12; i++) {
        f.octopus.rotation.y = f.gameState.facingAngle = i * .23;
        f.animal.update(i * .05, .05, pose({ moving: true, jet: i > 5, strike: i > 3 && i < 8 ? .9 : 0, strikeAim: new T.Vector3(.55, -.37, 1.35), strikeRadius: .30 }));
        f.update(.05, i === 0); fit(f);
      }
    }
  });

  it('frames the committed catch through disposal and ignores a newly cycled target during recovery', () => {
    for (const squid of [false, true]) {
      const f = fixture(squid ? 'humboldtSquid' : 'commonOcto'), prey = new T.Object3D(), other = new T.Object3D();
      prey.position.set(.6, 1.7, 1.5); prey.userData.alive = other.userData.alive = true; other.position.set(-2, 2, -2);
      f.gameState.cameraMode = 3; f.gameState.pendingStrike = { target: prey, at: 1200 }; f.select(other); f.update(0, true); assert.deepEqual(f.frame.prey.toArray(), prey.position.toArray());
      const visual = { aimWorld: prey.position.clone() }; f.visual(visual, squid); f.gameState.pendingStrike = null; prey.userData.alive = false; prey.position.set(80, 0, 80); f.update(.05); assert.deepEqual(f.frame.prey.toArray(), visual.aimWorld.toArray()); assert.notEqual(f.frame.prey, visual.aimWorld);
      f.visual(null, squid); f.update(.05); assert.deepEqual(f.frame.prey.toArray(), other.position.toArray());
      other.position.set(100, 2, 100); f.update(.05); assert.equal(f.frame.hasPrey, false); other.position.set(NaN, 2, 0); f.update(.05); assert.equal(f.frame.hasPrey, false); assert.ok(f.camera.position.toArray().every(Number.isFinite));
    }
  });

  it('refits a paused portrait resize and holds geometry, materials, transforms and game state intact', () => {
    const f = fixture(), refs = []; f.octopus.traverse(o => { if (o.geometry) refs.push([o, o.geometry, o.material, o.geometry.attributes.position, o.geometry.attributes.position.array]); });
    f.gameState.cameraMode = 3; f.update(0, true); const before = JSON.stringify(f.gameState), positions = refs.map(r => hash(Buffer.from(r[4].buffer))), children = f.octopus.children.slice();
    f.camera.aspect = .5; f.camera.updateProjectionMatrix(); f.update(0, true); fit(f); const still = snapshot(f); f.update(0); assert.deepEqual(snapshot(f), still);
    for (let i = 0; i < 20; i++) f.update(.05);
    assert.equal(JSON.stringify(f.gameState), before); assert.deepEqual(f.octopus.children, children);
    refs.forEach(([o, g, m, a, data], i) => { assert.equal(o.geometry, g); assert.equal(o.material, m); assert.equal(g.attributes.position, a); assert.equal(a.array, data); assert.equal(hash(Buffer.from(data.buffer)), positions[i]); });
    assert.ok(source.includes('else if(gameState.cameraMode===3){updateDiveCamera(0,true);if(targetHalo.visible)targetHalo.quaternion.copy(camera.quaternion);}renderer.setSize'));
  });

  it('respects real rock clearance and the terrain floor without hiding live cover', () => {
    const f = fixture(); f.gameState.cameraMode = 3; f.update(0, true);
    const direction = f.camera.position.clone().sub(f.frame.look).normalize(), rock = new T.Mesh(new T.SphereGeometry(.5, 24, 16), new T.MeshBasicMaterial()); owned.push(rock);
    rock.position.copy(f.frame.look).addScaledVector(direction, 2.8); rock.updateMatrixWorld(); f.rocks.push(rock); const hit = new T.Raycaster(f.frame.look, direction).intersectObject(rock)[0]; assert.ok(hit);
    f.update(0, true); assert.ok(Math.abs(f.camera.position.distanceTo(f.frame.look) - Math.max(1.5, hit.distance - .3)) < 1e-8); assert.equal(rock.visible, true); assert.equal(f.occlusions, 0);
    f.ground(20); f.update(0, true); assert.ok(f.camera.position.y >= 20.65);
  });

  it('snaps deliberate entry and reduced motion, then eases inward after a nearby target leaves', () => {
    const f = fixture(), prey = new T.Object3D(); prey.userData.alive = true; prey.position.set(3.5, 2, 1); f.select(prey); f.gameState.paused = false; f.gameState.cameraMode = 2; f.cycle(); fit(f);
    const far = f.frame.distance; f.select(null); f.update(.01); assert.ok(f.frame.distance < far); assert.ok(f.frame.distance > far - 1);
    f.gameState.a11y.reducedMotion = true; f.octopus.rotation.y = f.gameState.facingAngle = 1.2; f.update(.05); fit(f); const still = snapshot(f); f.update(0); assert.deepEqual(snapshot(f), still);
  });
});
