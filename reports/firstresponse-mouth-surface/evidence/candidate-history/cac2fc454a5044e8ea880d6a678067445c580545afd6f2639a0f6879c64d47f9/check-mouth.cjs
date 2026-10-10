const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', work = __dirname;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const beforePath = path.join(work, 'before.js'), candidatePath = path.join(work, 'candidate.js');
const before = fs.readFileSync(beforePath, 'utf8'), candidate = fs.readFileSync(candidatePath, 'utf8');
const pins = { beforeSHA256: sha(before), candidateSHA256: sha(candidate), checkerSHA256: sha(fs.readFileSync(__filename)) };
assert.equal(pins.beforeSHA256, 'f551cf0c50073315effbf3fa5bcd9ce2dd3e1b806dbfcbd3f1434ba7e831af2c');
const THREE = {};
new Function('exports', 'module', fs.readFileSync(path.join(repo, 'vendor/three-r128/three.min.js'), 'utf8'))(THREE, { exports: THREE });
let checks = 0;
const check = (v, m) => { checks++; assert.ok(v, m); };
const equal = (a, b, m) => { checks++; assert.deepEqual(a, b, m); };
const { model, resources, disposeOnce } = require(path.join(repo, 'tests/helpers/firstresponse_neck_mesh_checks.cjs')).createNeckMeshChecks(THREE, check, equal);
global.window = {};
function capture(code) {
  let config;
  window.StemLab = { isRegistered: () => false, registerTool() {}, makeBayViewer(c) { config = c; return { attach() {}, sync() {}, reset() {}, nudge() {}, zoom() {}, status: () => 'failed' }; } };
  new Function(code)(); return config;
}
const oldConfig = capture(before), newConfig = capture(candidate);
const configValue = config => JSON.parse(JSON.stringify(config, (key, value) => key === 'buildScene' ? '[buildScene]' : typeof value === 'function' ? String(value) : value));
equal(configValue(newConfig), configValue(oldConfig), 'viewer camera and part configurations unchanged');
const sides = ['left', 'right'];
const lipNames = ['fr-manikin-upper-lip','fr-manikin-lower-lip'];
const mouthName='fr-manikin-mouth';
const changedNames = new Set([...lipNames,mouthName]);
const point = (mesh, index) => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index);
const key = p => p.toArray().map(v => Math.round(v * 1e8)).join(',');
const object = (fixture, name) => { const o = fixture.scene.getObjectByName(name); check(!!o, name + ' exists'); return o; };
function materialValue(material) {
  const value = {};
  for (const k of ['type', 'name', 'transparent', 'opacity', 'depthTest', 'depthWrite', 'side', 'shininess', 'wireframe', 'vertexColors', 'flatShading', 'alphaTest', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'premultipliedAlpha', 'dithering', 'toneMapped', 'fog', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'linewidth', 'dashSize', 'gapSize', 'scale']) if (material[k] !== undefined) value[k] = material[k];
  for (const k of ['color', 'specular', 'emissive']) if (material[k]) value[k] = material[k].toArray();
  value.userData = material.userData; value.onBeforeCompile = String(material.onBeforeCompile); value.programKey = material.customProgramCacheKey();
  return value;
}
function snapshot(fixture, trace = false) {
  const hash = crypto.createHash('sha256'), geos = new Map(), mats = new Map(); let nodes = 0, meshes = 0;
  const parts=[]; if(trace){const update=hash.update.bind(hash);hash.update=data=>{parts.push(typeof data==='string'?data:sha(data));return update(data);};}
  const identity = (map, item) => { if (!map.has(item)) map.set(item, map.size); return map.get(item); };
  function visit(o, address) {
    nodes++; if (o.isMesh) meshes++;
    hash.update(JSON.stringify([address, o.type, o.name, o.visible, o.matrix.toArray(), o.matrixWorld.toArray(), o.castShadow, o.receiveShadow, o.renderOrder, o.layers.mask]));
    if (o.geometry) {
      const g = o.geometry; hash.update(JSON.stringify([identity(geos, g), changedNames.has(o.name) ? '[edited mouth geometry]' : g.type, g.drawRange, g.groups]));
      if (!changedNames.has(o.name)) {
        for (const k of Object.keys(g.attributes).sort()) { const a = g.attributes[k], b = a.array; hash.update(JSON.stringify([k, a.itemSize, a.normalized, b.constructor.name])); hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)); }
        if (g.index) { const b = g.index.array; hash.update(b.constructor.name); hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)); }
      }
    }
    if (o.material) hash.update(JSON.stringify((Array.isArray(o.material) ? o.material : [o.material]).map(m => [identity(mats, m), materialValue(m)])));
    o.children.forEach((child, i) => visit(child, address + '.' + i));
  }
  visit(fixture.scene, 'scene');
  hash.update(JSON.stringify({ meshKeys: Object.keys(fixture.content.meshes).sort(), picks: fixture.content.picks.map(o => o.name), inspection: Object.fromEntries(Object.entries(fixture.content.meshes).filter(([, o]) => o.userData?.inspection).map(([name, o]) => [name, o.userData.inspection])) }));
  hash.update(JSON.stringify(fixture.allocatedMaterials.map(m => [identity(mats, m), materialValue(m)])));
  return { sha256: hash.digest('hex'), nodes, meshes, geometries: geos.size, materials: mats.size, ...(trace?{parts}:{}) };
}
function triangles(mesh) {
  const out = [], p = mesh.geometry.attributes.position, idx = mesh.geometry.index.array;
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, idx[i + j]).applyMatrix4(mesh.matrix));
    const den = (b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
    if (Math.abs(den) > 1e-14) out.push({ a, b, c, den, minX: Math.min(a.x,b.x,c.x), maxX: Math.max(a.x,b.x,c.x), minZ: Math.min(a.z,b.z,c.z), maxZ: Math.max(a.z,b.z,c.z) });
  }
  return out;
}
function surface(tris, x, z) {
  let result = -Infinity;
  for (const t of tris) {
    if (x < t.minX-1e-8 || x > t.maxX+1e-8 || z < t.minZ-1e-8 || z > t.maxZ+1e-8) continue;
    const { a, b, c, den } = t, u = ((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den, v = ((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;
    if (u >= -1e-6 && v >= -1e-6 && u+v <= 1+1e-6) result = Math.max(result, u*a.y+v*b.y+(1-u-v)*c.y);
  }
  return result;
}
function shell(mesh) {
  const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal, idx = mesh.geometry.index.array;
  const vertices = new Map(), edges = new Map(), adjacency = new Map(), keys = [];
  let minNormal = Infinity, maxNormal = 0, seamNormal = 1, minAgreement = 1, faces = 0, volume = 0, worstFace;
  const centre = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const v = point(mesh, i), normal = new THREE.Vector3().fromBufferAttribute(n, i), k = key(v); keys.push(k);
    check([...v.toArray(), ...normal.toArray()].every(Number.isFinite), mesh.name + ' finite surface');
    minNormal = Math.min(minNormal, normal.length()); maxNormal = Math.max(maxNormal, normal.length());
    if (vertices.has(k)) seamNormal = Math.min(seamNormal, vertices.get(k).normal.dot(normal));
    else { vertices.set(k, { position: v, normal }); centre.add(v); }
  }
  centre.divideScalar(vertices.size);
  for (let i = 0; i < idx.length; i += 3) {
    const ids = [idx[i],idx[i+1],idx[i+2]], ps = ids.map(j => point(mesh,j)), cross = ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));
    if (new Set(ids.map(j => keys[j])).size < 3 || cross.lengthSq() < 1e-24) continue;
    faces++; volume += ps[0].clone().sub(centre).dot(ps[1].clone().sub(centre).cross(ps[2].clone().sub(centre))) / 6;
    const normal = ids.reduce((sum,j) => sum.add(new THREE.Vector3().fromBufferAttribute(n,j)), new THREE.Vector3()).normalize();
    const agreement=cross.normalize().dot(normal);if(agreement<minAgreement){minAgreement=agreement;worstFace={index:i/3,ids,points:ps.map(v=>v.toArray()),agreement};}
    for (let e = 0; e < 3; e++) {
      const a = keys[ids[e]], b = keys[ids[(e+1)%3]], pair = [a,b].sort(), k = pair.join('|'), edge = edges.get(k) || {count:0,balance:0};
      edge.count++; edge.balance += a === pair[0] ? 1 : -1; edges.set(k,edge);
      if (!adjacency.has(a)) adjacency.set(a,new Set()); if (!adjacency.has(b)) adjacency.set(b,new Set()); adjacency.get(a).add(b); adjacency.get(b).add(a);
    }
  }
  const visited = new Set(), todo = [adjacency.keys().next().value];
  while (todo.length) { const k = todo.pop(); if (visited.has(k)) continue; visited.add(k); todo.push(...adjacency.get(k)); }
  check(visited.size === adjacency.size, mesh.name + ' connected shell');
  equal(adjacency.size - edges.size + faces, 2, mesh.name + ' closed sphere topology');
  check([...edges.values()].every(e => e.count === 2 && e.balance === 0), mesh.name + ' closed consistent winding');
  check(volume > 0, mesh.name + ' outward signed volume'); check(minAgreement > 0, mesh.name + ' normals agree with triangles '+JSON.stringify(worstFace));
  check(minNormal > .9999 && maxNormal < 1.0001, mesh.name + ' unit normals'); check(seamNormal > .9999, mesh.name + ' smooth duplicated vertices');
  return { vertices, metric: { vertices: p.count, faces, volume, minAgreement, minNormal, maxNormal, seamNormal } };
}
function frontSample(mesh, fraction) {
  mesh.geometry.computeBoundingBox(); const box = mesh.geometry.boundingBox, centre = (box.min.x+box.max.x)/2, half = (box.max.x-box.min.x)/2;
  const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal; let best = 0, score = Infinity;
  for (let i = 0; i < p.count; i++) { const value = Math.abs((p.getX(i)-centre)/half-fraction)*100+1-n.getY(i); if (value < score) { score = value; best = i; } }
  return best;
}
function nearby(tris,mesh){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;return tris.filter(t=>t.maxX>=b.min.x-1e-7&&t.minX<=b.max.x+1e-7&&t.maxZ>=b.min.z-1e-7&&t.minZ<=b.max.z+1e-7);}
function triangleSamples(ps){return[ps[0].clone().add(ps[1]).add(ps[2]).divideScalar(3),...[[0,1],[1,2],[2,0]].map(([a,b])=>ps[a].clone().add(ps[b]).multiplyScalar(.5))];}
function relief(fixture){
  const head=object(fixture,'fr-manikin-head'),skin=triangles(head),scale=head.scale.x/.28,result=[];
  for(const name of lipNames){
    const mesh=object(fixture,name),p=mesh.geometry.attributes.position,params=mesh.geometry.parameters,support=nearby(skin,mesh);
    const sphere=new THREE.SphereGeometry(1,params.widthSegments,params.heightSegments),native=sphere.attributes.position;
    const gapPoint=v=>(v.y-surface(support,v.x,v.z))/scale,gap=i=>gapPoint(point(mesh,i));
    const middle=[-.75,-.5,0,.5,.75].map(f=>gap(frontSample(mesh,f))),tails=[-1,1].map(f=>gap(frontSample(mesh,f))),shoulders=[-.97,.97].map(f=>gap(frontSample(mesh,f)));
    let maxBack=-Infinity,maxBoundary=-Infinity,minBack=Infinity,backs=0,boundary=0,buriedSamples=0,maxBuriedTriangle=-Infinity;
    for(let i=0;i<p.count;i++){
      const g=gap(i);check(Number.isFinite(g),name+' lies over actual skull');const front=-native.getX(i);
      if(front<=1e-7){maxBack=Math.max(maxBack,g);minBack=Math.min(minBack,g);backs++;}
      if(Math.abs(front)<1e-7){maxBoundary=Math.max(maxBoundary,g);boundary++;}
    }
    const index=mesh.geometry.index.array;
    for(let i=0;i<index.length;i+=3){const ids=[index[i],index[i+1],index[i+2]];if(ids.some(j=>-native.getX(j)>1e-7))continue;
      for(const sample of triangleSamples(ids.map(j=>point(mesh,j)))){const g=gapPoint(sample);check(Number.isFinite(g),name+' buried triangle remains over skull');maxBuriedTriangle=Math.max(maxBuriedTriangle,g);buriedSamples++;}
    }
    sphere.dispose();
    check(Math.min(...middle)>.001,name+' central relief remains visible');check(Math.max(...middle)<.008,name+' relief remains shallow');
    check(Math.max(...tails)<-.0008&&Math.min(...tails)>-.004,name+' endpoints buried near actual skin');
    check(Math.max(...shoulders)<Math.max(...middle)*.65,name+' relief tapers at shoulders');
    check(maxBack<-.0007&&minBack>-.005,name+' entire rear shell remains buried near skull');
    check(maxBoundary<-.0007,name+' perimeter below actual skull');check(maxBuriedTriangle<-.0006,name+' rear triangle interiors remain buried');
    const bounds=mesh.geometry.boundingBox;check(Math.abs((bounds.max.x-bounds.min.x)/scale-.116)<1e-6,name+' mouth width retained');
    result.push({name,middle,tails,shoulders,maxBack,minBack,maxBoundary,backs,boundary,buriedSamples,maxBuriedTriangle});
  }return result;
}
function seamChecks(fixture){
  const mesh=object(fixture,mouthName),head=object(fixture,'fr-manikin-head'),scale=head.scale.x/.28;
  const support=nearby([head,...lipNames.map(n=>object(fixture,n))].flatMap(triangles),mesh);
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,idx=mesh.geometry.index.array,edges=new Map(),keys=[],positions=new Map();
  let minVertex=Infinity,maxVertex=-Infinity,minTriangle=Infinity,maxTriangle=-Infinity,minAgreement=1,minNormal=Infinity,maxNormal=0,faces=0;
  const gap=v=>(v.y-surface(support,v.x,v.z))/scale;
  for(let i=0;i<p.count;i++){
    const v=point(mesh,i),normal=new THREE.Vector3().fromBufferAttribute(n,i),g=gap(v);check([...v.toArray(),...normal.toArray(),g].every(Number.isFinite),'mouth seam finite supported vertex');
    minVertex=Math.min(minVertex,g);maxVertex=Math.max(maxVertex,g);minNormal=Math.min(minNormal,normal.length());maxNormal=Math.max(maxNormal,normal.length());
    const k=key(v);keys.push(k);positions.set(k,v);
    const u=v.x/scale/.058,centre=.125+.008*Math.max(0,1-u*u),t=(u+1)/2,half=.0018*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.55);
    check(Math.abs(v.z/scale-centre)<=half+1e-7,'mouth crease remains inside tapered original width');
  }
  for(let i=0;i<idx.length;i+=3){
    const ids=[idx[i],idx[i+1],idx[i+2]],ps=ids.map(j=>point(mesh,j)),cross=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));
    check(cross.y>0,'mouth crease outward front winding');check(cross.lengthSq()>1e-24,'mouth crease has no degenerate triangle');faces++;
    const average=ids.reduce((sum,j)=>sum.add(new THREE.Vector3().fromBufferAttribute(n,j)),new THREE.Vector3()).normalize();minAgreement=Math.min(minAgreement,cross.normalize().dot(average));
    for(const sample of triangleSamples(ps)){const g=gap(sample);check(Number.isFinite(g),'mouth crease triangle supported');minTriangle=Math.min(minTriangle,g);maxTriangle=Math.max(maxTriangle,g);}
    for(let e=0;e<3;e++){const a=keys[ids[e]],b=keys[ids[(e+1)%3]],pair=[a,b].sort(),k=pair.join('|'),v=edges.get(k)||{a:pair[0],b:pair[1],count:0,balance:0};v.count++;v.balance+=a===pair[0]?1:-1;edges.set(k,v);}
  }
  check(minNormal>.9999&&maxNormal<1.0001,'mouth crease unit normals');check(minAgreement>0,'mouth crease normals match front triangles');
  const boundary=[...edges.values()].filter(e=>e.count===1),interior=[...edges.values()].filter(e=>e.count!==1);check(interior.every(e=>e.count===2&&e.balance===0),'mouth crease interior winding consistent');
  equal(positions.size-edges.size+faces,1,'mouth crease is a single open disk');const neighbours=new Map();for(const e of boundary){for(const [a,b] of [[e.a,e.b],[e.b,e.a]]){if(!neighbours.has(a))neighbours.set(a,[]);neighbours.get(a).push(b);}}
  check([...neighbours.values()].every(v=>v.length===2),'mouth crease has one smooth perimeter without dangling edges');const seen=new Set(),pending=[neighbours.keys().next().value];while(pending.length){const a=pending.pop();if(seen.has(a))continue;seen.add(a);pending.push(...neighbours.get(a));}equal(seen.size,neighbours.size,'mouth crease perimeter connected');
  check(minVertex>.0007&&maxVertex<.0008,'mouth crease vertices sit just above visible skin and lips');
  check(minTriangle>.00005,'mouth crease triangle interiors remain continuously visible: '+minTriangle);check(maxTriangle<.0014,'mouth crease triangles stay seated: '+maxTriangle);
  for(const v of positions.values()){const mirror=v.clone();mirror.x*=-1;check(positions.has(key(mirror)),'mouth crease bilateral positions');}
  const centreSamples=[];
  for(let i=0;i<=96;i++){const u=i/48-1,x=.058*u*scale,z=(.125+.008*Math.max(0,1-u*u))*scale,front=surface(support,x,z),seam=surface(triangles(mesh),x,z);check(Number.isFinite(seam)&&seam>front+.00001*scale,'continuous crease visible along original path');centreSamples.push((seam-front)/scale);}
  return{vertices:p.count,faces,minVertex,maxVertex,minTriangle,maxTriangle,minNormal,maxNormal,minAgreement,boundaryEdges:boundary.length,minCentre:Math.min(...centreSamples),maxCentre:Math.max(...centreSamples)};
}
function attachment(fixture){for(const name of changedNames){const mesh=object(fixture,name);check(mesh.parent===fixture.scene.getObjectByName('fr-manikin-head-pivot'),name+' attached to head');equal(mesh.matrix.elements,new THREE.Matrix4().elements,name+' local transform preserved');check(!fixture.content.picks.includes(mesh),name+' is not an answer target');}}

function contact(fixture) {
  const head=object(fixture,'fr-manikin-head'),hand=object(fixture,'fr-patient-right-hand'),palm=object(fixture,'fr-patient-right-palm');
  const normal=new THREE.Vector3(0,1,0).transformDirection(hand.matrixWorld),origin=palm.getWorldPosition(new THREE.Vector3()).addScaledVector(normal,-palm.getWorldScale(new THREE.Vector3()).y);
  return new THREE.Raycaster(origin,normal.clone().negate()).intersectObject(head,false).map(hit=>({distance:hit.distance,point:hit.point.toArray(),face:hit.faceIndex}));
}
const selftest=process.argv.includes('--selftest'),early=process.argv.includes('--early');
const settings=early?[{age:'adult',phase:8,contrast:false}]:['adult','child','infant'].flatMap(age=>[0,8].flatMap(phase=>[false,true].map(contrast=>({age,phase,contrast}))));
const results=[],negatives=[],localByAge=new Map();
for(const setting of settings){const start=Date.now(),count=checks;let current,prior,error,metric={};
  try{
    prior=model(oldConfig,setting);current=model(newConfig,setting);
    equal(snapshot(current),snapshot(prior),'outside three mouth meshes all geometry/materials/transforms/selection unchanged');
    equal(contact(current),contact(prior),'supporting cheek contact unchanged');metric.preserved=snapshot(current);metric.shells=[];
    for(const name of lipNames){const a=object(prior,name).geometry,b=object(current,name).geometry;
      equal(b.parameters,a.parameters,name+' mesh resolution and sphere metadata unchanged');equal(Array.from(b.index.array),Array.from(a.index.array),name+' index buffer unchanged');equal(Object.keys(b.attributes),Object.keys(a.attributes),name+' attributes unchanged');
      for(const attr of Object.keys(a.attributes))if(!['position','normal'].includes(attr))equal(Array.from(b.attributes[attr].array),Array.from(a.attributes[attr].array),name+' '+attr+' unchanged');
      const value=shell(object(current,name));metric.shells.push({name,...value.metric});for(const{position}of value.vertices.values()){const reflected=position.clone();reflected.x*=-1;check(value.vertices.has(key(reflected)),name+' bilateral surface positions');}
    }
    metric.relief=relief(current);metric.seam=seamChecks(current);attachment(current);
    metric.triangleDelta=[...changedNames].reduce((sum,name)=>sum+(object(current,name).geometry.index.count-object(prior,name).geometry.index.count)/3,0);equal(metric.triangleDelta,1960,'bounded crease triangle increase');
    const local=[...changedNames].map(name=>{const g=object(current,name).geometry;return[name,sha(Buffer.from(g.attributes.position.array.buffer)),sha(Buffer.from(g.attributes.normal.array.buffer)),sha(Buffer.from(g.index.array.buffer))];});
    if(localByAge.has(setting.age))equal(local,localByAge.get(setting.age),'pose/contrast preserve local mouth geometry');else localByAge.set(setting.age,local);metric.localGeometry=local;
    const saved=snapshot(current),refs=[...changedNames].map(name=>{const o=object(current,name);return{o,g:o.geometry,m:o.material,p:o.geometry.attributes.position.array,n:o.geometry.attributes.normal.array,i:o.geometry.index.array};});
    const beforeCounts=[current.allocatedGeometries.length,current.allocatedMaterials.length];current.sample();current.sample();equal(snapshot(current),saved,'repeated frames preserve scene');
    for(const r of refs)check(r.o.geometry===r.g&&r.o.material===r.m&&r.o.geometry.attributes.position.array===r.p&&r.o.geometry.attributes.normal.array===r.n&&r.o.geometry.index.array===r.i,'frames retain mouth resources');
    equal([current.allocatedGeometries.length,current.allocatedMaterials.length],beforeCounts,'no frame allocations');const a=resources(current),b=resources(prior);equal(a.geometries.size,b.geometries.size,'geometry counts unchanged');equal(a.materials.size,b.materials.size,'material counts unchanged');
    if(selftest&&!negatives.length){const mesh=object(current,lipNames[0]),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,seam=object(current,mouthName).geometry.attributes.position;
      for(const[kind,attribute,mutate,validate]of[['raised-lip',p,()=>{const i=frontSample(mesh,0);p.setY(i,p.getY(i)+.02);},()=>relief(current)],['hidden-seam',seam,()=>{for(let i=0;i<seam.count;i++)seam.setY(i,seam.getY(i)-.02);},()=>seamChecks(current)],['invalid-normal',n,()=>n.setXYZ(0,0,0,0),()=>shell(mesh)]]){
        const savedBytes=Buffer.from(attribute.array.buffer.slice(0)),file=path.join(work,'selftest-'+kind+'.bin');fs.writeFileSync(file,savedBytes);let rejected=false;mutate();
        try{validate();}catch(e){rejected=true;negatives.push({kind,error:e.message});}finally{const restored=fs.readFileSync(file);new Uint8Array(attribute.array.buffer).set(restored);equal(Buffer.from(attribute.array.buffer),savedBytes,kind+' restored saved bytes');equal(sha(fs.readFileSync(file)),sha(savedBytes),kind+' saved bytes reread');}
        check(rejected,kind+' must fail validation');validate();
      }
    }
  }catch(e){error=e.stack;}finally{if(current)metric.resources=disposeOnce(current);if(prior)metric.priorResources=disposeOnce(prior);}
  const result={...setting,status:error?'failed':'passed',checks:checks-count,durationMs:Date.now()-start,...metric,...(error?{error}:{})};results.push(result);console.log(JSON.stringify({age:setting.age,phase:setting.phase,contrast:setting.contrast,status:result.status,error:error?.split('\n')[0]}));if(error)break;
}
equal(sha(fs.readFileSync(beforePath)),pins.beforeSHA256,'baseline unchanged');equal(sha(fs.readFileSync(candidatePath)),pins.candidateSHA256,'candidate unchanged');equal(sha(fs.readFileSync(__filename)),pins.checkerSHA256,'checker unchanged');
const summary={...pins,checks,negativeTests:negatives,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results};
const output=path.join(work,early?'cpu-early.json':'cpu-validation.json');if(fs.existsSync(output)){const saved=fs.readFileSync(output);fs.writeFileSync(output+'.previous-'+sha(saved).slice(0,12)+'.json',saved);}
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,checks,...pins}));if(summary.failed)process.exitCode=1;
