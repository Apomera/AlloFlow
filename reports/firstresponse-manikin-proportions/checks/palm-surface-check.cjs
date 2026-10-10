'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const REPO = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const WORK = 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-14/firstresponse-palm-work';
const BASELINE_SHA = '476c1562ef879cb20ac65efdbf290edff9b98fafde9dbd7866f3e612c5750935';
const CHANGED = new Set(['left', 'right'].flatMap(side => ['palm', 'thumb'].map(kind => 'fr-patient-'+side+'-'+kind+'-crease')));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value);

function loadThree(repo) {
  const THREE = {};
  new Function('exports', 'module', fs.readFileSync(path.join(repo, 'vendor/three-r128/three.min.js'), 'utf8'))(THREE, { exports: THREE });
  return THREE;
}

function capture(code) {
  let config;
  const window = { StemLab: { isRegistered: () => false, registerTool() {}, makeBayViewer(value) {
    config = value;
    return { attach() {}, sync() {}, reset() {}, nudge() {}, zoom() {}, status: () => 'failed' };
  } } };
  vm.runInNewContext(code, { window, console, setTimeout, clearTimeout }, { timeout: 10000 });
  assert.ok(config && typeof config.buildScene === 'function', 'Captures the production geometry builder');
  return config;
}

function createModel(THREE, config, age, phase, contrast) {
  const allocatedGeometries = [], allocatedMaterials = [], tracked = { ...THREE };
  for (const key of Object.keys(THREE)) {
    if (typeof THREE[key] !== 'function') continue;
    const list = /Geometry$/.test(key) ? allocatedGeometries : /Material$/.test(key) ? allocatedMaterials : null;
    if (!list) continue;
    tracked[key] = new Proxy(THREE[key], { construct(target, args) {
      const value = Reflect.construct(target, args); list.push(value); return value;
    } });
  }
  const scene = new THREE.Scene();
  const content = config.buildScene(tracked, { scene, phase, dark: true, contrast, wantShadow: false,
    trim: (color, shininess) => new tracked.MeshPhongMaterial({ color, shininess: shininess == null ? 30 : shininess, specular: 0x6b7688 }),
    sceneProps: { age, tab: 'recovery', recoveryGuides: true } });
  const model = { scene, content, allocatedGeometries, allocatedMaterials, age, phase, contrast, disposed: false };
  model.sample = (settings = {}, childHands = 'two') => {
    content.frame(0, { depthLab: { age, motion: 'release', lean: 0, ...settings }, childHands }, true);
    scene.updateMatrixWorld(true);
  };
  model.sample(); return model;
}

function resources(model) {
  const geometries = new Set(model.allocatedGeometries), materials = new Set(model.allocatedMaterials);
  model.scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  return { geometries, materials };
}

function disposal(model) {
  assert.equal(model.disposed, false, 'A model is disposed once');
  const { geometries, materials } = resources(model), counts = new Map();
  for (const value of [...geometries, ...materials]) {
    counts.set(value, 0); value.addEventListener('dispose', () => counts.set(value, counts.get(value)+1));
  }
  for (const value of geometries) value.dispose();
  for (const value of materials) value.dispose();
  assert.ok([...counts.values()].every(value => value === 1), 'Every unique tracked/scene resource emits one disposal event');
  model.disposed = true;
  return { geometries: geometries.size, materials: materials.size, disposalEvents: counts.size };
}

function materialValues(material) {
  const result = {};
  for (const key of ['type','name','transparent','opacity','depthTest','depthWrite','side','shininess','wireframe',
    'vertexColors','flatShading','alphaTest','blending','blendSrc','blendDst','blendEquation','premultipliedAlpha',
    'dithering','toneMapped','fog','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','linewidth','dashSize','gapSize','scale']) {
    if (material[key] !== undefined) result[key] = material[key];
  }
  for (const key of ['color','specular','emissive']) if (material[key]) result[key] = material[key].toArray();
  result.userData = material.userData;
  result.onBeforeCompile = String(material.onBeforeCompile);
  result.customProgramCacheKey = material.customProgramCacheKey();
  return result;
}

function materialHash(model) {
  const h = crypto.createHash('sha256'), ids = new Map();
  const identify = value => { if (!ids.has(value)) ids.set(value, ids.size); return ids.get(value); };
  function visit(object, entryPath) {
    if (object.material) h.update(json([entryPath, object.name,
      (Array.isArray(object.material) ? object.material : [object.material]).map(material => [identify(material), materialValues(material)])]));
    object.children.forEach((child, index) => visit(child, entryPath+'.'+index));
  }
  visit(model.scene, 'scene');
  h.update(json(model.allocatedMaterials.map(material => [identify(material), materialValues(material)])));
  return h.digest('hex');
}

function geometryHash(scene, omitCreases) {
  const h = crypto.createHash('sha256'), ids = new Map();
  function visit(object, entryPath) {
    h.update(json([entryPath, object.type, object.name, object.visible, object.matrix.toArray(), object.matrixWorld.toArray(),
      object.castShadow, object.receiveShadow, object.renderOrder, object.layers.mask]));
    if (object.geometry && !(omitCreases && CHANGED.has(object.name))) {
      const geometry = object.geometry;
      if (!ids.has(geometry)) ids.set(geometry, ids.size);
      h.update(json([ids.get(geometry), geometry.type, geometry.drawRange, geometry.groups]));
      for (const key of Object.keys(geometry.attributes).sort()) {
        const attribute = geometry.attributes[key], bytes = attribute.array;
        h.update(json([key, attribute.itemSize, attribute.normalized, bytes.constructor.name]));
        h.update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      }
      if (geometry.index) {
        const bytes = geometry.index.array; h.update(bytes.constructor.name);
        h.update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      }
    }
    object.children.forEach((child, index) => visit(child, entryPath+'.'+index));
  }
  visit(scene, 'scene'); return h.digest('hex');
}

function creaseHash(scene) {
  const h=crypto.createHash('sha256');
  for(const name of CHANGED) {
    const object=scene.getObjectByName(name), g=object.geometry;
    h.update(json([name,object.matrix.toArray(),object.matrixWorld.toArray(),object.visible]));
    for(const attribute of [...Object.values(g.attributes),g.index]) {
      const a=attribute.array; h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
    }
  }
  return h.digest('hex');
}

function summary(model) {
  const { geometries, materials } = resources(model); let nodes = 0, meshes = 0;
  model.scene.traverse(object => { nodes++; if (object.isMesh) meshes++; });
  return { nodes, meshes, geometries: geometries.size, materials: materials.size,
    allocatedGeometries: model.allocatedGeometries.length, allocatedMaterials: model.allocatedMaterials.length,
    picks: model.content.picks.map(object => object.name), meshKeys: Object.keys(model.content.meshes).sort() };
}

function inspectionMetadata(model) {
  return Object.fromEntries(['nearPalm','supportingHand','heelSide','handContact'].map(key => {
    const object = model.content.meshes[key];
    return [key, object ? { name: object.name, inspection: object.userData.inspection } : null];
  }));
}

function snapshot(model) {
  const entries = [];
  model.scene.traverse(object => entries.push({ object, geometry: object.geometry, material: object.material,
    attributes: object.geometry && Object.fromEntries(Object.entries(object.geometry.attributes).map(([key, value]) => [key, [value, value.array]])),
    index: object.geometry?.index, indexArray: object.geometry?.index?.array }));
  return { entries, geometries: model.allocatedGeometries.length, materials: model.allocatedMaterials.length };
}

function assertStable(model, saved) {
  const objects = []; model.scene.traverse(object => objects.push(object));
  assert.deepEqual(objects, saved.entries.map(entry => entry.object));
  assert.equal(model.allocatedGeometries.length, saved.geometries);
  assert.equal(model.allocatedMaterials.length, saved.materials);
  for (const { object, geometry, material, attributes, index, indexArray } of saved.entries) {
    assert.equal(object.geometry, geometry); assert.equal(object.material, material);
    if (!geometry) continue;
    assert.deepEqual(Object.keys(geometry.attributes), Object.keys(attributes));
    for (const [key, [attribute, array]] of Object.entries(attributes)) {
      assert.equal(geometry.attributes[key], attribute); assert.equal(attribute.array, array);
    }
    assert.equal(geometry.index, index); assert.equal(geometry.index?.array, indexArray);
  }
}

function ribbonMetrics(THREE, model, name) {
  const crease = model.scene.getObjectByName(name), side = name.includes('-left-') ? 'left' : 'right';
  const palm = model.scene.getObjectByName('fr-patient-'+side+'-palm');
  assert.ok(crease && palm, name+' exists');
  assert.equal(crease.parent, palm.parent, name+' retains its hand parent');
  const g = crease.geometry, p = g.attributes.position, n = g.attributes.normal, ix = g.index;
  assert.equal(g.type, 'BufferGeometry');
  assert.ok(g.parameters?.path instanceof THREE.CatmullRomCurve3, name+' retains a fitted inspection centerline');
  assert.equal(p.count, 98, name+' has 49 two-sided rows');
  assert.equal(p.itemSize, 3); assert.equal(n.count, p.count); assert.equal(ix.count, 288);
  assert.equal(crease.material.side, THREE.FrontSide);
  const surface = new THREE.Mesh(palm.geometry, palm.material);
  surface.position.copy(palm.position); surface.quaternion.copy(palm.quaternion); surface.scale.copy(palm.scale);
  surface.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), direction = new THREE.Vector3(0,-1,0);
  function clearance(point) {
    ray.set(new THREE.Vector3(point.x, .10, point.z), direction);
    const hit = ray.intersectObject(surface, false)[0];
    assert.ok(hit, name+' sample remains over the rendered palm');
    return point.y-hit.point.y;
  }
  const vertices = [], clears = [], widths = [], interior = [], edges = new Map();
  for (let i=0; i<p.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(p, i), normal = new THREE.Vector3().fromBufferAttribute(n, i);
    assert.ok([...vertex.toArray(), ...normal.toArray()].every(Number.isFinite), name+' finite positions/normals');
    assert.ok(Math.abs(normal.length()-1) < 2e-6, name+' unit normals');
    assert.ok(normal.y > 0, name+' normals face the palm exterior');
    const lift = clearance(vertex);
    assert.ok(Math.abs(lift-.00035) < 2e-8, name+' vertex follows the actual triangles at stable lift: '+lift);
    clears.push(lift); vertices.push(vertex);
  }
  for (let row=0; row<49; row++) {
    const a=vertices[row*2], b=vertices[row*2+1], width=Math.hypot(a.x-b.x,a.z-b.z), t=row/48;
    assert.ok(g.parameters.path.getPoint(t).distanceTo(a.clone().add(b).multiplyScalar(.5))<2e-8, name+' centerline follows the actual strip rows');
    const edge=Math.min(1,t/.15,(1-t)/.15), expected=.0022*(.08+.92*edge*edge*(3-2*edge));
    assert.ok(Math.abs(width-expected)<2e-8, name+' taper follows a smooth finite width');
    widths.push(width);
  }
  assert.ok(widths[0] < widths[24]*.081 && widths[48] < widths[24]*.081, name+' ends taper');
  for (let row=1; row<=8; row++) assert.ok(widths[row] >= widths[row-1]-2e-8, name+' start taper is monotone');
  for (let row=41; row<49; row++) assert.ok(widths[row] <= widths[row-1]+2e-8, name+' end taper is monotone');
  for (let i=0; i<ix.count; i+=3) {
    const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];
    assert.ok(ids.every(id => Number.isInteger(id) && id>=0 && id<p.count), name+' valid triangle indices');
    const [a,b,c]=ids.map(id=>vertices[id]);
    const face=b.clone().sub(a).cross(c.clone().sub(a));
    assert.ok(face.length()>1e-10 && face.y>0, name+' has nondegenerate exterior winding');
    for (const point of [a.clone().add(b).add(c).multiplyScalar(1/3), a.clone().add(b).multiplyScalar(.5), b.clone().add(c).multiplyScalar(.5), c.clone().add(a).multiplyScalar(.5)]) {
      const value=clearance(point); interior.push(value);
      assert.ok(value>0 && value<.001, name+' triangle interiors clear the rendered palm: '+value);
    }
    for (let edge=0; edge<3; edge++) {
      const x=ids[edge], y=ids[(edge+1)%3], key=Math.min(x,y)+':'+Math.max(x,y);
      edges.set(key,(edges.get(key)||0)+1);
    }
  }
  assert.ok([...edges.values()].every(count=>count===1 || count===2), name+' manifold strip without overlapping triangle edges');
  assert.equal([...edges.values()].filter(count=>count===1).length, 98, name+' has only the two outer sides and two end boundaries');
  const neighbors=Array.from({length:p.count},()=>new Set());
  for (const key of edges.keys()) { const [a,b]=key.split(':').map(Number); neighbors[a].add(b); neighbors[b].add(a); }
  const seen=new Set([0]), queue=[0];
  while(queue.length) for (const next of neighbors[queue.pop()]) if(!seen.has(next)) { seen.add(next); queue.push(next); }
  assert.equal(seen.size,p.count,name+' all rows form one connected strip');
  return { name, vertices:p.count, triangles:ix.count/3, vertexClearance:[Math.min(...clears),Math.max(...clears)],
    interiorClearance:[Math.min(...interior),Math.max(...interior)], width:[Math.min(...widths),Math.max(...widths)], boundaryEdges:98 };
}

function runCheck(options = {}) {
  const repo=options.repo||REPO, beforePath=options.beforePath||path.join(WORK,'before.js');
  const candidatePath=options.candidatePath||path.join(WORK,'candidate.js');
  const before=fs.readFileSync(beforePath,'utf8'), candidate=fs.readFileSync(candidatePath,'utf8');
  assert.equal(hash(before), BASELINE_SHA, 'Uses the accepted hand-comparison baseline');
  if (options.expectedCandidateSHA) assert.equal(hash(candidate), options.expectedCandidateSHA);
  let geometryBefore=before;
  const headEditsPath=options.headEditsPath || path.join(WORK,'final-head-edits.json');
  if (fs.existsSync(headEditsPath)) {
    const edits=JSON.parse(fs.readFileSync(headEditsPath,'utf8'));
    if(candidate.includes(edits[0].after)) for(const edit of edits) {
      assert.equal(geometryBefore.split(edit.before).length,2,'Head comparison edit is unique');
      assert.equal(candidate.split(edit.after).length,2,'Candidate contains the pinned head refinement');
      geometryBefore=geometryBefore.replace(edit.before,edit.after);
    }
  }
  const THREE=loadThree(repo), oldConfig=capture(geometryBefore), newConfig=capture(candidate);
  const configValues=config=>json(config, (_,v)=>typeof v==='function'?'[function]':v);
  // JSON's replacer is deliberately passed directly here to keep scene configuration plain.
  const normalize=config=>JSON.stringify(config,(_,v)=>typeof v==='function'?'[function]':v);
  assert.equal(normalize(newConfig),normalize(oldConfig),'Viewer configuration unchanged');
  const cases=['adult','child','infant'].flatMap(age=>[2,4,5].map(phase=>({age,phase,contrast:false})));
  cases.push({age:'child',phase:4,contrast:true},{age:'infant',phase:5,contrast:true});
  const report={ schema:1, baselineSHA256:hash(before), geometryComparisonBaselineSHA256:hash(geometryBefore), candidateSHA256:hash(candidate), threeRevision:THREE.REVISION,
    changedMeshes:[...CHANGED], cases:[], checkedFrames:0, checkedRibbons:0, checkedVertices:0, disposedResources:0 };
  for (const test of cases) {
    const a=createModel(THREE,oldConfig,test.age,test.phase,test.contrast), b=createModel(THREE,newConfig,test.age,test.phase,test.contrast);
    try {
      assert.equal(geometryHash(b.scene,true),geometryHash(a.scene,true),'Exact unrelated geometry/transforms/visibility '+json(test));
      assert.equal(materialHash(b),materialHash(a),'Exact material values/identity sharing '+json(test));
      assert.equal(json(summary(b)),json(summary(a)),'Exact resource counts and pick/mesh keys '+json(test));
      assert.equal(json(inspectionMetadata(b)),json(inspectionMetadata(a)),'Exact inspection-camera metadata '+json(test));
      const found=[]; b.scene.traverse(object=>{if(CHANGED.has(object.name)) found.push(object.name);});
      assert.equal(found.length,4,'Only the four expected crease meshes exist');
      const metrics=[...CHANGED].map(name=>ribbonMetrics(THREE,b,name));
      report.checkedRibbons+=metrics.length; report.checkedVertices+=metrics.reduce((sum,value)=>sum+value.vertices,0);
      const saved=snapshot(b), geometry=creaseHash(b.scene), material=materialHash(b);
      for(const settings of [{motion:'press',depth:6,lean:1},{motion:'release',lean:0},{motion:'inspect',phase:50,depth:6,lean:1}]) {
        for(const childHands of test.age==='child'?['one','two']:['two']) {
          a.sample(settings,childHands);b.sample(settings,childHands);
          assertStable(b,saved);
          assert.equal(creaseHash(b.scene),geometry,'Ribbon buffers and transforms stay stable during existing rescuer motion');
          assert.equal(geometryHash(b.scene,true),geometryHash(a.scene,true),'Unrelated geometry remains exact during frames');
          assert.equal(materialHash(b),material,'Materials remain stable during frames');
          assert.equal(json(inspectionMetadata(b)),json(inspectionMetadata(a)),'Inspection-camera metadata remains exact during frames');
          report.checkedFrames++;
        }
      }
      report.cases.push({...test, resources:summary(b), ribbons:metrics});
    } finally {
      report.disposedResources+=disposal(a).disposalEvents;
      report.disposedResources+=disposal(b).disposalEvents;
    }
  }
  const first=createModel(THREE,newConfig,'adult',5,false), second=createModel(THREE,newConfig,'adult',5,false);
  try {
    for(const name of CHANGED) {
      const a=first.scene.getObjectByName(name), b=second.scene.getObjectByName(name);
      assert.notEqual(a.geometry,b.geometry,'Rebuild has independently owned crease geometry');
      assert.notEqual(a.geometry.attributes.position.array,b.geometry.attributes.position.array,'Rebuild owns a fresh vertex array');
      assert.notEqual(a.material,b.material,'Rebuild has independent scene materials');
    }
  } finally {
    report.disposedResources+=disposal(first).disposalEvents;
    report.disposedResources+=disposal(second).disposalEvents;
  }
  report.passed=true;
  return report;
}

module.exports={runCheck,BASELINE_SHA,CHANGED};
if(require.main===module) {
  const start=Date.now(), output=process.argv[4]||path.join(WORK,'checks','results.json');
  const report=runCheck({beforePath:process.argv[2]||undefined,candidatePath:process.argv[3]||undefined});
  report.elapsedMs=Date.now()-start;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,ribbons:report.checkedRibbons,
    vertices:report.checkedVertices,frames:report.checkedFrames,disposedResources:report.disposedResources,
    baselineSHA256:report.baselineSHA256,candidateSHA256:report.candidateSHA256,elapsedMs:report.elapsedMs,output}));
}
