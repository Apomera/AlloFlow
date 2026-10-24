import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical primary relief section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') +
  '\nreturn { createMigrationTailGeometry, createMigrationFlyer, migrationStudyDistance };')(num);
const guides = new Function(section('      function createMigrationMarkedWingPose(', '      function initMigrationFlightScene(') +
  '\nreturn { createMigrationWingtipPath, createMigrationMarkedWingPose };')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const birds = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];
const planforms = [[1, 1], [1.38, .86], [1.7, .57], [1.62, .86]];
const roots = new Set();
const geometries = new Set();
afterEach(() => {
  for (const root of roots) dispose(root);
  for (const geometry of geometries) geometry.dispose();
  roots.clear(); geometries.clear();
});
function primaryGeometry(reach, sweep) {
  const geometry = model.createMigrationPrimaryGeometry(THREE, reach, sweep);
  geometries.add(geometry); return geometry;
}
function point(positions, index) { return new THREE.Vector3().fromBufferAttribute(positions, index); }
// This is the preserved five-point rim contract from the previous model.
// Tests compare real indexed boundaries and real guide output with that rim.
function originalRim(feather, reach, sweep) {
  const x = (.10 + feather * .072) * reach, z = (.08 + feather * .013) * sweep;
  const length = (.47 - feather * .041) * sweep, spread = (.06 + feather * .038) * reach, half = .047 * reach;
  const values = new Float32Array([x - half, .048, z, x + half, .048, z,
    x + spread + half * .60, .075, z + length * .82,
    x + spread, .065, z + length, x + spread - half * .60, .075, z + length * .82]);
  return Array.from({ length: 5 }, (_, i) => new THREE.Vector3().fromArray(values, i * 3));
}
function pointKey(value) { return value.toArray().map(Math.fround).join(','); }
function edgeKey(a, b) { return [pointKey(a), pointKey(b)].sort().join('|'); }
function insideRimXZ(value, rim) {
  let inside = false;
  for (let i = 0, j = rim.length - 1; i < rim.length; j = i++) {
    const a = rim[i], b = rim[j];
    if ((a.z > value.z) !== (b.z > value.z) && value.x < (b.x - a.x) * (value.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
function edgesFromPairs(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 2) out.push(edgeKey(points[i], points[i + 1]));
  return out.sort();
}
function fixture(id) {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock); roots.add(scene);
  flock.position.set(.3, 1.2, -.4); flock.rotation.y = .07;
  const bird = model.createMigrationFlyer(THREE, { id }, 0); flock.add(bird);
  bird.position.set(0, .5, -5); bird.userData.applyWingPhase(.713);
  const camera = new THREE.PerspectiveCamera(54, 1, .1, 900);
  camera.position.set(4, 3, 2); camera.lookAt(bird.position);
  const pathGuide = guides.createMigrationWingtipPath(THREE), marked = guides.createMigrationMarkedWingPose(THREE);
  scene.add(pathGuide, marked); scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  return { scene, flock, bird, camera, pathGuide, marked };
}
function snapshot(bird) {
  const states = [];
  bird.traverse(node => states.push({ node, rotation: node.rotation.toArray(), quaternion: node.quaternion.toArray(),
    matrix: node.matrix.toArray(), world: node.matrixWorld.toArray(), automatic: node.matrixAutoUpdate }));
  return states;
}
function resourceIds(root) {
  const nodes = [], geometry = new Set(), material = new Set();
  root.traverse(node => {
    nodes.push(node.uuid);
    if (node.geometry) geometry.add(node.geometry.uuid);
    for (const item of Array.isArray(node.material) ? node.material : [node.material]) if (item) material.add(item.uuid);
  });
  return { nodes: nodes.sort(), geometry: [...geometry].sort(), material: [...material].sort() };
}
function reachAndSweep(id) { return [id === 'arctic_tern' ? 1.7 : id === 'sandhill_crane' ? 1.62 : 1.38, id === 'arctic_tern' || id === 'peregrine' ? .57 : .86]; }


const tailedBirds=['canada_goose','snow_goose','ruby_hummingbird','peregrine','sandhill_crane','bartailed_godwit'];
function originalTailRim(feather) {
  const offset=feather-3,root=offset*.024,tip=offset*.097,length=.69-Math.abs(offset)*.035;
  const values=new Float32Array([root-.03,0,0,root+.03,0,0,tip+.058,.025,length*.83,tip,.042,length,tip-.058,.025,length*.83]);
  return Array.from({length:5},(_,i)=>new THREE.Vector3().fromArray(values,i*3));
}
function tailGeometry() { const g=model.createMigrationTailGeometry(THREE);geometries.add(g);return g; }
describe('Stylized tail vane relief within the preserved fan outline',()=>{
  it('preserves every original rim coordinate and tint and exposes only the same boundary edges',()=>{
    const g=tailGeometry(),p=g.attributes.position,c=g.attributes.color;
    expect(p.count).toBe(49);expect(c.count).toBe(49);expect(g.index.count).toBe(147);
    const expectedEdges=[];
    for(let feather=0;feather<7;feather++){
      const rim=originalTailRim(feather),usage=new Map();
      for(let i=0;i<5;i++){
        expect(point(p,feather*7+i).toArray()).toEqual(rim[i].toArray());
        const shade=i===3?.98:i<2?.76:.87;expect(c.getX(feather*7+i)).toBe(Math.fround(shade));
        expectedEdges.push(edgeKey(rim[i],rim[(i+1)%5]));
      }
      for(let i=feather*21;i<(feather+1)*21;i+=3){
        const tri=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
        expect(tri.every(v=>v>=feather*7&&v<(feather+1)*7)).toBe(true);
        for(let j=0;j<3;j++){const key=[tri[j],tri[(j+1)%3]].sort((a,b)=>a-b).join(':');usage.set(key,(usage.get(key)||0)+1);}
      }
      const boundary=[...usage].filter(([,count])=>count===1);expect(boundary).toHaveLength(5);
      expect(boundary.every(([edge])=>edge.split(':').every(index=>Number(index)%7<5))).toBe(true);
      expect([...usage.values()].every(count=>count===1||count===2)).toBe(true);
    }
    const edgeGeometry=new THREE.EdgesGeometry(g,180);geometries.add(edgeGeometry);
    const actual=Array.from({length:edgeGeometry.attributes.position.count},(_,i)=>point(edgeGeometry.attributes.position,i));
    expect(edgesFromPairs(actual)).toEqual(expectedEdges.sort());expect(actual).toHaveLength(70);
  });
  it('adds shallow interior relief with nondegenerate consistently wound triangles and unit normals',()=>{
    const g=tailGeometry(),p=g.attributes.position,n=g.attributes.normal;
    for(const attribute of Object.values(g.attributes))expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    for(let i=0;i<g.index.count;i+=3){
      const a=point(p,g.index.getX(i)),b=point(p,g.index.getX(i+1)),c=point(p,g.index.getX(i+2));
      const normal=b.sub(a).cross(c.sub(a));expect(normal.length()/2).toBeGreaterThan(.000001);expect(normal.y).toBeLessThan(0);
    }
    for(let i=0;i<n.count;i++){expect(point(n,i).length()).toBeCloseTo(1,5);expect(n.getY(i)).toBeLessThan(0);}
    for(let feather=0;feather<7;feather++){
      const rim=originalTailRim(feather);
      for(const i of [5,6]){
        const ridge=point(p,feather*7+i);expect(insideRimXZ(ridge,rim)).toBe(true);
        expect(ridge.y).toBeGreaterThan(.03);expect(ridge.y).toBeLessThan(.06);
        expect(g.attributes.color.getX(feather*7+i)).toBeGreaterThan(g.attributes.color.getX(feather*7));
      }
    }
  });
  it('uses one49station buffer rather than per-feather scene nodes',()=>{
    const f=fixture('canada_goose');const tail=f.bird.getObjectByName('migration-tail-feathers');const meshes=[];
    f.bird.traverse(node=>{if(node.name==='migration-tail-feathers')meshes.push(node);});
    expect(meshes).toHaveLength(1);expect(tail.children).toHaveLength(0);expect(tail.geometry.attributes.position.count).toBe(49);
    expect(tail.material.vertexColors).toBe(true);expect(tail.material.side).toBe(THREE.DoubleSide);
    expect(tail.position.toArray()).toEqual([0,0,.51]);
  });
  it.each(tailedBirds)('retains the original camera envelope, tail anchor and static resources for%s',id=>{
    const f=fixture(id),bird=f.bird,tail=bird.getObjectByName('migration-tail-feathers');
    const resources=resourceIds(f.scene),g=tail.geometry,m=tail.material,arrays=Object.values(g.attributes).map(a=>a.array),copies=arrays.map(a=>Array.from(a));
    bird.userData.applyWingPhase(0);bird.updateMatrixWorld(true);
    // Recompute the previous envelope from all unchanged vertices, excluding
    // only the new interior tail stations. This is independent of cached fit.
    let oldRadius=0;
    bird.traverse(node=>{const p=node.geometry?.attributes.position;if(!p)return;for(let i=0;i<p.count;i++){if(node===tail&&i%7>=5)continue;oldRadius=Math.max(oldRadius,point(p,i).applyMatrix4(node.matrixWorld).sub(bird.getWorldPosition(new THREE.Vector3())).length());}});
    // The cached radius is computed before placement and articulation; use
    // its exact creation pose to compare the geometry-derived legacy fit.
    const isolated=model.createMigrationFlyer(THREE,{id},0);roots.add(isolated);isolated.updateMatrixWorld(true);
    const isolatedTail=isolated.getObjectByName('migration-tail-feathers');let legacy=0;
    isolated.traverse(node=>{const p=node.geometry?.attributes.position;if(!p)return;for(let i=0;i<p.count;i++){if(node===isolatedTail&&i%7>=5)continue;legacy=Math.max(legacy,point(p,i).applyMatrix4(node.matrixWorld).length());}});
    expect(isolated.userData.studyRadius).toBeCloseTo(legacy*1.08,12);
    const anchor=bird.userData.anatomyAnchors.find(a=>a.id==='tail');
    expect(anchor.node).toBe(bird);expect(anchor.point.toArray()).toEqual([0,.1,.98]);expect(anchor.outline.length).toBe(24);
    for(let phase=0;phase<8;phase++){bird.userData.applyWingPhase(phase*Math.PI/4);f.scene.updateMatrixWorld(true);
      for(let i=0;i<g.attributes.position.count;i++){
        const v=point(g.attributes.position,i).applyMatrix4(tail.matrixWorld).sub(bird.getWorldPosition(new THREE.Vector3()));
        expect(v.length()).toBeLessThan(bird.userData.studyRadius);
      }}
    expect(resourceIds(f.scene)).toEqual(resources);expect(tail.geometry).toBe(g);expect(tail.material).toBe(m);
    Object.values(g.attributes).forEach((a,i)=>{expect(a.array).toBe(arrays[i]);expect(Array.from(a.array)).toEqual(copies[i]);});
  });
  it.each(tailedBirds)('keeps%s tail buffers and live transforms through actual path sampling and marked wing capture',id=>{
    const f=fixture(id),tail=f.bird.getObjectByName('migration-tail-feathers'),saved=snapshot(f.bird),resources=resourceIds(f.scene);
    const p=tail.geometry.attributes.position,copy=Array.from(p.array);
    f.pathGuide.updatePath(true,'study',f.bird,id,0,f.camera,true,390,.713,null,0);
    expect(f.pathGuide.userData.available).toBe(true);
    for(const state of saved){expect(state.node.quaternion.toArray()).toEqual(state.quaternion);expect(state.node.matrixWorld.toArray()).toEqual(state.world);}
    expect(f.marked.capturePose(f.bird,id,0)).toBe(true);expect(f.marked.userData.sources.some(s=>s.role==='migration-tail-feathers')).toBe(false);
    expect(f.marked.geometry.drawRange.count).toBeLessThanOrEqual(f.marked.userData.capacity);
    expect(Array.from(p.array)).toEqual(copy);expect(resourceIds(f.scene)).toEqual(resources);
  });
  it.each(['arctic_tern','monarch'])('keeps%s specialized tail/body geometry separate',id=>{
    const f=fixture(id);expect(f.bird.getObjectByName('migration-tail-feathers')).toBeUndefined();
    if(id==='arctic_tern'){const streamers=[];f.bird.traverse(n=>{if(n.name==='migration-tern-tail-streamer')streamers.push(n);});expect(streamers).toHaveLength(2);expect(streamers[0].geometry).toBe(streamers[1].geometry);}
    else expect(f.bird.getObjectByName('migration-monarch-forewing')).toBeTruthy();
  });
});
