const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', work = __dirname;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const beforePath = path.join(work, 'before.js'), candidatePath = path.join(work, 'candidate.js');
const before = fs.readFileSync(beforePath, 'utf8'), candidate = fs.readFileSync(candidatePath, 'utf8');
const pins = { beforeSHA256: sha(before), candidateSHA256: sha(candidate), checkerSHA256: sha(fs.readFileSync(__filename)) };
assert.equal(pins.beforeSHA256, '0af58d9afd30ed0de275caf53197320ddabed9308f08b191cce7bf4927d83f84');
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
const noseNames = ['fr-manikin-nose', ...sides.map(side => `fr-manikin-nostril-${side}`)];
const changedNames = new Set(noseNames);
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
      const g = o.geometry; hash.update(JSON.stringify([identity(geos, g), g.type, g.drawRange, g.groups]));
      for (const k of Object.keys(g.attributes).sort()) { const a = g.attributes[k], b = a.array; hash.update(JSON.stringify([k, a.itemSize, a.normalized, b.constructor.name, b.length])); if (!(changedNames.has(o.name) && ['position','normal'].includes(k))) hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)); }
      if (g.index) { const b = g.index.array; hash.update(b.constructor.name); hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)); }
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
function bounds(mesh){mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox;}
function frontSample(mesh,xFraction,zFraction){
  const b=bounds(mesh),p=mesh.geometry.attributes.position,cx=(b.min.x+b.max.x)/2,hx=(b.max.x-b.min.x)/2,length=b.max.z-b.min.z;let best=0,cost=Infinity;
  for(let i=0;i<p.count;i++){const next=Math.abs((p.getX(i)-cx)/hx-xFraction)*100+Math.abs((p.getZ(i)-b.min.z)/length-zFraction)*100-p.getY(i)/length;if(next<cost){cost=next;best=i;}}
  return best;
}
function nasalRelief(fixture,prior){
  const head=object(fixture,'fr-manikin-head'),nose=object(fixture,'fr-manikin-nose'),oldNose=object(prior,'fr-manikin-nose'),skin=triangles(head),nasal=triangles(nose),unit=head.scale.x/.28;
  const gap=(mesh,i,target)=>{const v=point(mesh,i),height=surface(target,v.x,v.z);check(Number.isFinite(height),mesh.name+' sample lies over actual target triangles');return(v.y-height)/unit;};
  const fractions=[.25,.45,.70],middle=fractions.map(f=>gap(nose,frontSample(nose,0,f),skin)),beforeMiddle=fractions.map(f=>gap(oldNose,frontSample(oldNose,0,f),skin));
  check(Math.min(...middle)>.006&&Math.max(...middle)<.07,'nasal front remains visible and bounded');check(middle[2]>middle[0]*2,'tip remains fuller than bridge');
  check(middle[0]>beforeMiddle[0]*1.05,'narrow bridge receives visibly fuller relief');check(middle[2]<beforeMiddle[2]*.90,'tip relief is measurably softer');check(middle[2]>beforeMiddle[2]*.80,'tip retains most of accepted projection');
  const p=nose.geometry.attributes.position,old=oldNose.geometry.attributes.position,params=nose.geometry.parameters,nativeGeometry=new THREE.SphereGeometry(params.radius,params.widthSegments,params.heightSegments),native=nativeGeometry.attributes.position;nativeGeometry.dispose();
  const boundary=[],rear=[];let maxChangedDepth=0;
  for(let i=0;i<p.count;i++){
    equal(p.getX(i),old.getX(i),'nasal width samples preserved');equal(p.getZ(i),old.getZ(i),'nasal length samples preserved');
    const g=gap(nose,i,skin);maxChangedDepth=Math.max(maxChangedDepth,Math.abs(p.getY(i)-old.getY(i))/unit);
    if(native.getY(i)<=1e-7){equal(p.getY(i),old.getY(i),'nasal buried rear and equator preserved');rear.push(g);}
    if(Math.abs(native.getY(i))<1e-7)boundary.push(g);
  }
  check(Math.max(...boundary)<.0025&&Math.min(...boundary)>-.005,'complete nasal perimeter stays seated near actual skull');check(maxChangedDepth<.01,'profile adjustment stays bounded');
  const result={middle,beforeMiddle,bridgeGain:middle[0]-beforeMiddle[0],tipReduction:beforeMiddle[2]-middle[2],tipRatio:middle[2]/beforeMiddle[2],boundaryCount:boundary.length,boundaryRange:[Math.min(...boundary),Math.max(...boundary)],maxChangedDepth,nostrils:[]};
  for(const side of sides){
    const name=`fr-manikin-nostril-${side}`,mesh=object(fixture,name),previous=object(prior,name),np=mesh.geometry.attributes.position,op=previous.geometry.attributes.position;
    for(let i=0;i<np.count;i++){equal(np.getX(i),op.getX(i),'nostril lateral footprint preserved');equal(np.getZ(i),op.getZ(i),'nostril longitudinal footprint preserved');}
    const mid=[-.5,0,.5].map(f=>gap(mesh,frontSample(mesh,f,.5),nasal)),edge=[[-1,.5],[1,.5],[0,0],[0,1]].map(([x,z])=>gap(mesh,frontSample(mesh,x,z),nasal));
    check(Math.min(...mid)>.0001&&Math.max(...mid)<.003,name+' shallow central detail remains visible');check(Math.max(...edge)<.001&&Math.min(...edge)>-.0016,name+' full boundary stays tucked near actual nasal surface');check(Math.max(...edge)<Math.max(...mid),name+' relief tapers toward boundary');
    result.nostrils.push({name,middle:mid,edges:edge});
  }
  return result;
}
function contact(fixture){
  const head=object(fixture,'fr-manikin-head'),hand=object(fixture,'fr-patient-right-hand'),palm=object(fixture,'fr-patient-right-palm');
  const normal=new THREE.Vector3(0,1,0).transformDirection(hand.matrixWorld),origin=palm.getWorldPosition(new THREE.Vector3()).addScaledVector(normal,-palm.getWorldScale(new THREE.Vector3()).y);
  return new THREE.Raycaster(origin,normal.clone().negate()).intersectObject(head,false).map(hit=>({distance:hit.distance,point:hit.point.toArray(),face:hit.faceIndex}));
}
const early=process.argv.includes('--early'),selftest=process.argv.includes('--selftest');
const settings=early?[{age:'adult',phase:8,contrast:false}]:['adult','child','infant'].flatMap(age=>[0,8].flatMap(phase=>[false,true].map(contrast=>({age,phase,contrast}))));
const results=[],negatives=[],localByAge=new Map();
for(const setting of settings){
  const start=Date.now(),count=checks;let current,prior,error,metric={};
  try{
    prior=model(oldConfig,setting);current=model(newConfig,setting);
    equal(snapshot(current),snapshot(prior),'only three nasal position and normal buffers may change; all other buffers, materials, transforms, inspection and picks preserved');equal(contact(current),contact(prior),'supporting cheek contact preserved');metric.preserved=snapshot(current);metric.shells=[];
    const shells=new Map();for(const name of noseNames){const value=shell(object(current,name));shells.set(name,value);metric.shells.push({name,...value.metric});}
    for(const [leftName,rightName]of [['fr-manikin-nose','fr-manikin-nose'],['fr-manikin-nostril-left','fr-manikin-nostril-right']]){
      const left=shells.get(leftName).vertices,right=shells.get(rightName).vertices;equal(left.size,right.size,'bilateral nasal shell counts');
      for(const {position,normal}of left.values()){const mirror=position.clone();mirror.x*=-1;const match=right.get(key(mirror));check(!!match,'exact mirrored nasal vertex');const n=normal.clone();n.x*=-1;check(n.dot(match.normal)>.9999,'mirrored nasal normal');}
    }
    metric.relief=nasalRelief(current,prior);
    const local=noseNames.map(name=>{const g=object(current,name).geometry;return[name,sha(Buffer.from(g.attributes.position.array.buffer)),sha(Buffer.from(g.attributes.normal.array.buffer)),sha(Buffer.from(g.index.array.buffer))];});
    if(localByAge.has(setting.age))equal(local,localByAge.get(setting.age),'pose and contrast preserve local nasal geometry');else localByAge.set(setting.age,local);metric.localGeometry=local;
    const saved=snapshot(current),refs=noseNames.map(name=>{const o=object(current,name);return{o,g:o.geometry,m:o.material,p:o.geometry.attributes.position.array,n:o.geometry.attributes.normal.array,i:o.geometry.index.array};});
    const counts=[current.allocatedGeometries.length,current.allocatedMaterials.length];current.sample();current.sample();equal(snapshot(current),saved,'repeated frames preserve scene');
    for(const r of refs)check(r.o.geometry===r.g&&r.o.material===r.m&&r.o.geometry.attributes.position.array===r.p&&r.o.geometry.attributes.normal.array===r.n&&r.o.geometry.index.array===r.i,'repeated frames retain nasal resources');equal([current.allocatedGeometries.length,current.allocatedMaterials.length],counts,'no frame allocations');
    const a=resources(current),b=resources(prior);equal(a.geometries.size,b.geometries.size,'geometry count preserved');equal(a.materials.size,b.materials.size,'material count preserved');
    metric.triangleCounts=[];for(const name of noseNames){const now=object(current,name).geometry,was=object(prior,name).geometry;equal(now.attributes.position.count,was.attributes.position.count,'nasal vertex counts preserved');equal(now.index.count,was.index.count,'nasal triangle counts preserved');check(sha(Buffer.from(now.attributes.position.array.buffer))!==sha(Buffer.from(was.attributes.position.array.buffer)),'candidate changes actual nasal positions');metric.triangleCounts.push({name,triangles:now.index.count/3});}
    if(selftest&&!negatives.length){
      const nose=object(current,noseNames[0]),nostril=object(current,noseNames[1]);
      function mutation(kind,attribute,edit,validate){const saved=Buffer.from(attribute.array.buffer.slice(0)),file=path.join(work,'selftest-'+kind+'.bin');fs.writeFileSync(file,saved);let rejected=false;try{edit();validate();}catch(e){rejected=true;negatives.push({kind,error:e.message});}finally{const bytes=fs.readFileSync(file);new Uint8Array(attribute.array.buffer).set(bytes);equal(Buffer.from(attribute.array.buffer),saved,kind+' restores saved bytes');equal(sha(fs.readFileSync(file)),sha(saved),kind+' saved restore reread');}check(rejected,kind+' rejected');validate();}
      mutation('unchanged-profile',nose.geometry.attributes.position,()=>nose.geometry.attributes.position.array.set(object(prior,noseNames[0]).geometry.attributes.position.array),()=>nasalRelief(current,prior));
      mutation('raised-nostril',nostril.geometry.attributes.position,()=>{const i=frontSample(nostril,0,.5),p=nostril.geometry.attributes.position;p.setY(i,p.getY(i)+.01);},()=>nasalRelief(current,prior));
      mutation('invalid-normal',nose.geometry.attributes.normal,()=>nose.geometry.attributes.normal.setXYZ(0,0,0,0),()=>shell(nose));
    }
  }catch(e){error=e.stack;}
  finally{if(current)metric.resources=disposeOnce(current);if(prior)metric.priorResources=disposeOnce(prior);}
  const result={...setting,status:error?'failed':'passed',checks:checks-count,durationMs:Date.now()-start,...metric,...(error?{error}:{})};results.push(result);console.log(JSON.stringify({age:setting.age,phase:setting.phase,contrast:setting.contrast,status:result.status,error:error?.split('\n')[0]}));if(error)break;
}
equal(sha(fs.readFileSync(beforePath)),pins.beforeSHA256,'baseline input unchanged');equal(sha(fs.readFileSync(candidatePath)),pins.candidateSHA256,'candidate input unchanged');equal(sha(fs.readFileSync(__filename)),pins.checkerSHA256,'checker unchanged');
const summary={...pins,checks,negativeTests:negatives,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results};
const output=path.join(work,early?'cpu-early.json':'cpu-validation.json');if(fs.existsSync(output)){const saved=fs.readFileSync(output);fs.writeFileSync(output+'.previous-'+sha(saved).slice(0,12)+'.json',saved);}
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,checks,...pins}));if(summary.failed)process.exitCode=1;
