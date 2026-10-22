import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), process.env.MIGRATION_ANATOMY_CANDIDATE || 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing followed-anatomy source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createMarkers = new Function(section('      function createMigrationAnatomyMarkers(', '      function createMigrationMarkedWingPose(') + '\nreturn createMigrationAnatomyMarkers;')();
const initAnatomy = new Function('THREE', 'scene', 'engine', 'flockRoot', 'migrNum', 'createMigrationAnatomyMarkers', section('          // One pooled, colored line buffer for all four anatomy callouts.', '          engine.updateStudyBackdrop =') + '\nreturn { overlay: anatomyOverlay, markers: anatomyMarkers };');
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];

function fixture(id = 'canada_goose') {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock);
  flock.position.set(.4, 1.2, -1); flock.rotation.set(.03, .12, -.05); flock.scale.set(1.1, .9, 1.2);
  const bird = createFlyer(THREE, { id }, 2); bird.position.set(.7, .5, -5); flock.add(bird);
  const camera = new THREE.PerspectiveCamera(54, 1.4, .1, 900);
  camera.position.set(7, 5, 3); camera.lookAt(bird.getWorldPosition(new THREE.Vector3())); camera.updateMatrixWorld(true);
  const engine = { speciesId: id, flyers: [bird], camera, host: { clientWidth: 780, clientHeight: 560 },
    disposed: false, contextLost: false, time: 13.75, wingStepSerial: 6, wingStepPhase: .87,
    learnerWork: { notes: 'Keep my observation', challenge: { prediction: 'same joint' } } };
  const parts = initAnatomy(THREE, scene, engine, flock, num, createMarkers);
  const f = { ...parts, scene, flock, bird, camera, engine,
    update(side, region = 'primaries', enabled = true) { engine.updateAnatomy(enabled, 0, region, side); scene.updateMatrixWorld(true); },
    phase(value) { bird.userData.applyWingPhase(value); bird.userData.lastRenderedWingPhase = value; scene.updateMatrixWorld(true); } };
  f.phase(0); f.update(undefined, '', false); return f;
}
function localOutline(id, index, side, legacy) {
  if (index === 0 || index === 3) return legacy[index].outline;
  const reach = id === 'arctic_tern' ? 1.7 : id === 'sandhill_crane' ? 1.62 : 1.38;
  const sweep = id === 'arctic_tern' || id === 'peregrine' ? .57 : .86;
  if (index === 1) {
    const x = side === 0 ? -1 : 1;
    return [x*.04,.02,-.46*sweep,x*.50*reach,.075,-.40*sweep,
      x*.50*reach,.075,-.40*sweep,x*.50*reach,.075,.28*sweep,
      x*.50*reach,.075,.28*sweep,x*.04,.02,.44*sweep,
      x*.04,.02,.44*sweep,x*.04,.02,-.46*sweep];
  }
  const result = [];
  for (let pin = 0; pin < 5; pin++) {
    const x = (.10+pin*.072)*reach, z = (.08+pin*.013)*sweep;
    result.push(x,.075,z,x+(.06+pin*.038)*reach,.083,z+(.47-pin*.041)*sweep);
  }
  return result;
}
function localPoint(id, index, side, legacy) {
  if (index === 0 || index === 3) return legacy[index].point.clone();
  const reach = id === 'arctic_tern' ? 1.7 : id === 'sandhill_crane' ? 1.62 : 1.38;
  const sweep = id === 'arctic_tern' || id === 'peregrine' ? .57 : .86;
  return index === 1 ? new THREE.Vector3((side === 0 ? -1 : 1)*reach*.27,.10,0) : new THREE.Vector3(reach*.39,.10,sweep*.32);
}
function assertBuffer(f, id, side) {
  const legacy = f.bird.userData.anatomyAnchors, output = f.overlay.geometry.attributes.position;
  let offset = 0; const body = [];
  for (let index = 0; index < 4; index++) {
    const node = index === 1 ? f.bird.userData.wings[side] : index === 2 ? f.bird.userData.primaries[side] : f.bird;
    const outline = localOutline(id, index, side, legacy), start = offset;
    for (let coordinate = 0; coordinate < outline.length; coordinate += 3) {
      const expected = new THREE.Vector3().fromArray(outline, coordinate).applyMatrix4(node.matrixWorld);
      const actual = new THREE.Vector3().fromBufferAttribute(output, offset / 3);
      expect(actual.distanceTo(expected)).toBeLessThan(.000002); offset += 3;
    }
    const leader = new THREE.Vector3().fromBufferAttribute(output, offset / 3);
    expect(leader.distanceTo(localPoint(id,index,side,legacy).applyMatrix4(node.matrixWorld))).toBeLessThan(.000002);
    expect(new THREE.Vector3().fromBufferAttribute(output, offset / 3 + 3).distanceTo(f.markers.children[index].position)).toBeLessThan(.000002);
    offset += 12;
    if (index === 0 || index === 3) body.push(Array.from(output.array.slice(start, offset)));
  }
  expect(f.overlay.geometry.drawRange).toEqual({ start: 0, count: offset / 3 }); return body;
}
function hidden(f) {
  for (const root of [f.overlay, f.markers]) {
    expect(root.visible).toBe(false); expect(root.userData.anatomySide).toBeNull(); expect(root.userData.sourceBirdUuid).toBe('');
  }
  expect(f.overlay.geometry.drawRange.count).toBe(0); expect(f.markers.userData.selectedAnatomyId).toBe('');
  for (const marker of f.markers.children) {
    expect(marker.userData.anatomySide).toBeNull(); expect(marker.userData.focused).toBe(false); expect(marker.children[3].visible).toBe(false);
  }
}
function pool(f) {
  const resources = new Set();
  for (const root of [f.markers,f.overlay]) root.traverse(node => { if(node.geometry) resources.add(node.geometry); if(node.material) resources.add(node.material); });
  return resources;
}
function poseSnapshot(bird) {
  const values = []; bird.traverse(node => values.push([node.uuid,node.position.toArray(),node.quaternion.toArray(),node.scale.toArray()])); return values;
}

describe('Followed-wing anatomical callout geometry', () => {
  it.each(species)('routes %s outlines and leaders to actual nodes on both articulated sides', id => {
    const f = fixture(id), legacy = f.bird.userData.anatomyAnchors, bilateral = f.bird.userData.anatomyAnchorsBySide;
    expect(bilateral[1]).toBe(legacy); expect(bilateral[0][0]).toBe(legacy[0]); expect(bilateral[0][3]).toBe(legacy[3]);
    expect(bilateral[0][2].outline).toBe(legacy[2].outline); expect(bilateral[0][2].point.toArray()).toEqual(legacy[2].point.toArray());
    expect(bilateral[0][1].node).toBe(f.bird.userData.wings[0]); expect(bilateral[0][2].node).toBe(f.bird.userData.primaries[0]);
    expect(f.bird.userData.primaries[0].scale.x).toBe(-1); expect(f.bird.userData.primaries[1].scale.x).toBe(1);
    for (let coordinate = 0; coordinate < legacy[1].outline.length; coordinate++) expect(bilateral[0][1].outline[coordinate]).toBe(coordinate % 3 === 0 ? -legacy[1].outline[coordinate] : legacy[1].outline[coordinate]);
    for (const phase of [0,Math.PI/2,Math.PI,3*Math.PI/2]) {
      f.phase(phase); let previousBody;
      for (const side of [0,1]) {
        f.update(side); expect(f.overlay.visible).toBe(true); expect(f.markers.visible).toBe(true);
        for (const root of [f.overlay,f.markers]) { expect(root.userData.anatomySide).toBe(side); expect(root.userData.sourceBirdUuid).toBe(f.bird.uuid); }
        expect(f.markers.children.map(marker => marker.userData.anatomySide)).toEqual([null,side,side,null]);
        expect(f.markers.children.map(marker => marker.userData.focused)).toEqual([false,false,true,false]);
        const body = assertBuffer(f,id,side); if(previousBody) expect(body).toEqual(previousBody); previousBody = body;
      }
    }
    expect(f.bird.userData.anatomyAnchors).toBe(legacy); expect(f.bird.userData.anatomyAnchorsBySide).toBe(bilateral);
  });

  it.each([undefined,null,-1,2,'0',true])('retains right-side legacy behavior for follow value %s', side => {
    const f = fixture(); f.update(0); f.update(side); expect(f.overlay.userData.anatomySide).toBe(1); assertBuffer(f,'canada_goose',1);
  });

  it('keeps the exact three-argument API and leaves invalid regions unfocused', () => {
    const f = fixture(); f.engine.updateAnatomy(true,0,'inner-wing'); expect(f.overlay.userData.anatomySide).toBe(1);
    f.update(0,'__proto__'); expect(f.overlay.visible).toBe(true); expect(f.markers.userData.selectedAnatomyId).toBe('');
    expect(f.markers.children.every(marker => !marker.userData.focused && !marker.children[3].visible)).toBe(true);
  });

  it('never falls back to right anchors when requested left metadata is missing', () => {
    const f = fixture(); f.update(1); f.bird.userData.anatomyAnchorsBySide[0] = null; f.update(0); hidden(f);
    f.update(1); expect(f.overlay.visible).toBe(true); expect(f.overlay.userData.anatomySide).toBe(1);
  });

  it('rejects wrong-side, foreign, detached and incomplete anchor sources before drawing', () => {
    for (const kind of ['wrong-side','foreign','detached','missing-node','missing-entry']) {
      const f = fixture(); f.update(0); const anchors = f.bird.userData.anatomyAnchorsBySide[0];
      if(kind==='wrong-side') anchors[1].node=f.bird.userData.wings[1];
      if(kind==='foreign') anchors[2].node=createFlyer(THREE,{id:'canada_goose'},0).userData.primaries[0];
      if(kind==='detached') f.bird.remove(f.bird.userData.wings[0]);
      if(kind==='missing-node') anchors[1].node=null;
      if(kind==='missing-entry') anchors.splice(2,1);
      f.update(0); hidden(f);
    }
  });

  it('rejects malformed ids, points, outlines and fixed-buffer overflows without stale metadata', () => {
    for (const kind of ['id','point','nan-outline','odd-outline','overflow','color']) {
      const f=fixture(); f.update(0); const anchor=f.bird.userData.anatomyAnchorsBySide[0][1];
      if(kind==='id') anchor.id='head'; if(kind==='point') anchor.point.x=NaN;
      if(kind==='nan-outline') anchor.outline[0]=NaN; if(kind==='odd-outline') anchor.outline=new Float32Array(3);
      if(kind==='overflow') anchor.outline=new Float32Array(600); if(kind==='color') anchor.color=NaN;
      f.update(0); hidden(f);
    }
  });

  it('clears both roots and focus on hidden, disposed, context-lost and missing-flyer paths', () => {
    const f=fixture(); hidden(f); f.update(0); f.update(0,'primaries',false); hidden(f);
    f.update(0); f.engine.disposed=true; f.update(0); hidden(f); f.engine.disposed=false;
    f.update(0); f.engine.contextLost=true; f.update(0); hidden(f); f.engine.contextLost=false;
    f.update(0); f.engine.flyers=[]; f.update(0); hidden(f); f.engine.flyers=[f.bird];
    f.update(1); expect(f.overlay.userData.anatomySide).toBe(1); expect(f.markers.userData.selectedAnatomyId).toBe('primaries');
  });

  it('keeps Monarch whole-insect semantics and never displays bird anatomy', () => {
    const f=fixture('monarch'); expect(f.bird.userData.anatomyAnchors).toEqual([]); expect(f.bird.userData.anatomyAnchorsBySide).toEqual([]);
    for(const side of [0,1,undefined]) { f.update(side); hidden(f); }
  });

  it('updates source metadata on replacement and preserves pose, phase, camera and learner work', () => {
    const f=fixture(); f.phase(1.7); const apply=vi.spyOn(f.bird.userData,'applyWingPhase');
    const pose=poseSnapshot(f.bird), camera=[f.camera.position.toArray(),f.camera.quaternion.toArray(),f.camera.projectionMatrix.toArray()];
    const work=JSON.stringify(f.engine.learnerWork), timing=[f.engine.time,f.engine.wingStepSerial,f.engine.wingStepPhase,f.bird.userData.phase,f.bird.userData.lastRenderedWingPhase];
    for(const side of [0,1,0]) f.update(side,'inner-wing');
    expect(apply).not.toHaveBeenCalled(); expect(poseSnapshot(f.bird)).toEqual(pose);
    expect([f.camera.position.toArray(),f.camera.quaternion.toArray(),f.camera.projectionMatrix.toArray()]).toEqual(camera);
    expect(JSON.stringify(f.engine.learnerWork)).toBe(work); expect([f.engine.time,f.engine.wingStepSerial,f.engine.wingStepPhase,f.bird.userData.phase,f.bird.userData.lastRenderedWingPhase]).toEqual(timing);
    const replacement=createFlyer(THREE,{id:'snow_goose'},1); f.flock.add(replacement); f.engine.flyers=[replacement]; f.engine.speciesId='snow_goose'; f.update(0);
    for(const root of [f.overlay,f.markers]) expect(root.userData.sourceBirdUuid).toBe(replacement.uuid);
  });

  it('retains all fifteen GPU resources and both 576-float buffers across sides and portrait views, then disposes once', () => {
    const f=fixture(), resources=pool(f); expect(resources.size).toBe(15);
    const positions=f.overlay.geometry.attributes.position.array, colors=f.overlay.geometry.attributes.color.array;
    expect(positions.length).toBe(576); expect(colors.length).toBe(576); expect(positions.byteLength+colors.byteLength).toBe(4608);
    for(let index=0;index<24;index++) {
      f.camera.aspect=index%2 ? 390/700 : 1.4; f.camera.updateProjectionMatrix(); f.camera.position.set(7,index%2?10:5,3); f.camera.lookAt(f.bird.getWorldPosition(new THREE.Vector3())); f.camera.updateMatrixWorld(true);
      f.engine.host.clientWidth=index%2?390:780; f.engine.host.clientHeight=index%2?700:560; f.phase(index*.21); f.update(index%2);
      expect(pool(f)).toEqual(resources); expect(f.overlay.geometry.attributes.position.array).toBe(positions); expect(f.overlay.geometry.attributes.color.array).toBe(colors);
    }
    const events=[...resources].map(resource=>{const listener=vi.fn();resource.addEventListener('dispose',listener);return listener;});
    dispose(f.overlay);dispose(f.markers);for(const listener of events) expect(listener).toHaveBeenCalledTimes(1);
  });

  it('adapts every outline and leader color without changing positions, pose, camera or pooled resources', () => {
    const f = fixture(); f.phase(1.7);
    const resources = pool(f), positions = f.overlay.geometry.attributes.position.array;
    const colors = f.overlay.geometry.attributes.color.array, pose = poseSnapshot(f.bird);
    const camera = [f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()];
    const timing = [f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, f.bird.userData.phase, f.bird.userData.lastRenderedWingPhase];
    const anchors = f.bird.userData.anatomyAnchorsBySide[0];
    const day = [0x78350f, 0x164e63, 0x14532d, 0x831843];
    function assertColors(expected) {
      let offset = 0;
      for (let callout = 0; callout < 4; callout++) {
        const color = new THREE.Color(expected[callout]), end = offset + anchors[callout].outline.length + 12;
        // Include the complete outline and both three-dimensional leader segments.
        for (; offset < end; offset += 3) {
          expect(colors[offset]).toBeCloseTo(color.r, 6);
          expect(colors[offset + 1]).toBeCloseTo(color.g, 6);
          expect(colors[offset + 2]).toBeCloseTo(color.b, 6);
        }
      }
      expect(f.overlay.geometry.drawRange.count).toBe(offset / 3);
    }
    f.engine.updateAnatomy(true, 0, '', 0, false);
    assertColors(day);
    const fixedPositions = positions.slice(), dayColors = colors.slice();
    const drawRange = { ...f.overlay.geometry.drawRange };
    for (const isDark of [true, undefined, false]) {
      if (isDark === undefined) f.engine.updateAnatomy(true, 0, '', 0);
      else f.engine.updateAnatomy(true, 0, '', 0, isDark);
      assertColors(isDark === false ? day : anchors.map(anchor => anchor.color));
      if (isDark === false) expect(colors).toEqual(dayColors);
      else expect(colors).not.toEqual(dayColors);
      expect(positions).toEqual(fixedPositions); expect(f.overlay.geometry.drawRange).toEqual(drawRange);
      expect(f.overlay.geometry.attributes.position.array).toBe(positions);
      expect(f.overlay.geometry.attributes.color.array).toBe(colors);
      expect(pool(f)).toEqual(resources); expect(resources.size).toBe(15);
      expect(poseSnapshot(f.bird)).toEqual(pose);
      expect([f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()]).toEqual(camera);
      expect([f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, f.bird.userData.phase, f.bird.userData.lastRenderedWingPhase]).toEqual(timing);
    }
  });
});
