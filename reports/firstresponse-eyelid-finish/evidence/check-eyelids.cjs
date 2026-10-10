const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', work = __dirname;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const beforePath = path.join(work, 'before.js'), candidatePath = path.join(work, 'candidate.js');
const before = fs.readFileSync(beforePath, 'utf8'), candidate = fs.readFileSync(candidatePath, 'utf8');
const pins = { beforeSHA256: sha(before), candidateSHA256: sha(candidate), checkerSHA256: sha(fs.readFileSync(__filename)) };
assert.equal(pins.beforeSHA256, 'af6ecb094af6d67ebb0955170a55e0a9726308c59f4ddd9b196d56cfe434e4c7');
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
const sides = ['left', 'right'], kinds = ['upper', 'lower'];
const lidNames = sides.flatMap(side => kinds.map(kind => `fr-manikin-${kind}-lid-${side}`));
const changedNames = new Set([...lidNames, ...sides.map(side => `fr-manikin-eye-${side}`)]);
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
      const g = o.geometry; hash.update(JSON.stringify([identity(geos, g), changedNames.has(o.name) ? '[edited eye geometry]' : g.type, g.drawRange, g.groups]));
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
function relief(fixture) {
  const head = object(fixture,'fr-manikin-head'), skin = triangles(head), scale = head.scale.x/.28, result = [];
  for (const name of lidNames) {
    const mesh = object(fixture,name), p = mesh.geometry.attributes.position, params = mesh.geometry.parameters;
    const sphere = new THREE.SphereGeometry(1,params.widthSegments,params.heightSegments), native = sphere.attributes.position;
    const gap = index => { const v = point(mesh,index); return (v.y-surface(skin,v.x,v.z))/scale; };
    const middle = [-.65,-.4,0,.4,.65].map(fraction => gap(frontSample(mesh,fraction)));
    const tails = [-1,1].map(fraction => gap(frontSample(mesh,fraction)));
    let maxBack = -Infinity, maxBoundary = -Infinity, minFront = Infinity, maxFront = -Infinity, backs = 0, boundary = 0;
    for (let i = 0; i < p.count; i++) {
      const g = gap(i); check(Number.isFinite(g),name+' lies over actual skull');
      const nativeFront=-native.getX(i),nativeAlong=native.getY(i);
      if (nativeFront <= 1e-7) { maxBack = Math.max(maxBack,g); backs++; }
      if (Math.abs(nativeFront) < 1e-7) { maxBoundary = Math.max(maxBoundary,g); boundary++; }
      if (nativeFront > .8 && Math.abs(nativeAlong) < .7) { minFront = Math.min(minFront,g); maxFront = Math.max(maxFront,g); }
    }
    sphere.dispose();
    check(Math.min(...middle) > .0002,name+' broad front relief remains visible');
    check(Math.max(...middle) < .008,name+' front relief remains shallow');
    check(Math.max(...tails) < -.0008 && Math.min(...tails) > -.004,name+' corners buried near actual skin');
    check(maxBack < -.0007,name+' entire back remains below skull');
    check(maxBoundary < -.0007,name+' complete shell boundary remains below skull');
    result.push({name,middle,tails,maxBack,maxBoundary,minFront,maxFront,backs,boundary});
  }
  return result;
}
function crease(fixture) {
  const head = object(fixture,'fr-manikin-head'), scale = head.scale.x/.28, result = [];
  for (const side of sides) {
    const seam = object(fixture,'fr-manikin-eye-'+side), support = triangles(head).concat(...kinds.map(kind => triangles(object(fixture,`fr-manikin-${kind}-lid-${side}`))));
    const p = seam.geometry.attributes.position, idx = seam.geometry.index.array; let minimum = Infinity, maximum = -Infinity, samples = 0;
    function sample(v,vertex=false) { const gap = (v.y-surface(support,v.x,v.z))/scale; check(Number.isFinite(gap) && gap > 0,seam.name+' crease clears rendered surface '+JSON.stringify({gap,sample:samples,point:v.toArray()})); check(gap<.003,seam.name+' crease stays within a small fraction of lid width');if(vertex)check(gap<.001,seam.name+' crease vertex remains shallow'); minimum = Math.min(minimum,gap); maximum = Math.max(maximum,gap); samples++; }
    for (let i = 0; i < p.count; i++) sample(point(seam,i),true);
    for (let i = 0; i < idx.length; i += 3) { const [a,b,c] = [0,1,2].map(j=>point(seam,idx[i+j])); sample(a.clone().add(b).add(c).divideScalar(3)); for (const [v,w] of [[a,b],[b,c],[c,a]]) sample(v.clone().add(w).multiplyScalar(.5)); }
    result.push({name:seam.name,minimum,maximum,samples});
  }
  return result;
}
function contact(fixture) {
  const head = object(fixture,'fr-manikin-head'), hand = object(fixture,'fr-patient-right-hand'), palm = object(fixture,'fr-patient-right-palm');
  const normal = new THREE.Vector3(0,1,0).transformDirection(hand.matrixWorld), origin = palm.getWorldPosition(new THREE.Vector3()).addScaledVector(normal,-palm.getWorldScale(new THREE.Vector3()).y);
  return new THREE.Raycaster(origin,normal.clone().negate()).intersectObject(head,false).map(hit=>({distance:hit.distance,point:hit.point.toArray(),face:hit.faceIndex}));
}
const early = process.argv.includes('--early'), selftest = process.argv.includes('--selftest');
if(process.argv.includes('--baseline-shell')){
  const diagnostics=[];
  for(const age of ['adult','child','infant']){const fixture=model(oldConfig,{age,phase:0,contrast:false});try{for(const name of lidNames){try{diagnostics.push({age,name,status:'passed',...shell(object(fixture,name)).metric});}catch(error){diagnostics.push({age,name,status:'failed',error:error.message});}}}finally{disposeOnce(fixture);}}
  fs.writeFileSync(path.join(work,'baseline-shell-diagnostic.json'),JSON.stringify({...pins,diagnostics},null,2));console.log(JSON.stringify(diagnostics));process.exit(0);
}
const earlyAge=process.argv.find(v=>v.startsWith('--age='))?.slice(6)||'adult';
const settings = early ? [{age:earlyAge,phase:8,contrast:false}] : ['adult','child','infant'].flatMap(age=>[0,8].flatMap(phase=>[false,true].map(contrast=>({age,phase,contrast}))));
const results = [], negatives = [], localByAge = new Map();
for (const setting of settings) {
  const start = Date.now(), count = checks; let current, prior, error, metric = {};
  try {
    prior = model(oldConfig,setting); current = model(newConfig,setting);
    const currentScope=snapshot(current), priorScope=snapshot(prior);
    if(currentScope.sha256!==priorScope.sha256){const a=snapshot(current,true).parts,b=snapshot(prior,true).parts;const differences=[];for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i])differences.push({i,current:a[i],before:b[i]});fs.writeFileSync(path.join(work,'scope-differences.json'),JSON.stringify({currentScope,priorScope,differences},null,2));}
    equal(currentScope,priorScope,'all geometry outside six eye meshes; all materials, transforms, selection and contacts preserved');
    equal(contact(current),contact(prior),'supporting cheek ray contact preserved');
    metric.preserved = snapshot(current); metric.shells = [];
    const shells = new Map(); for (const name of lidNames) { const value = shell(object(current,name)); shells.set(name,value); metric.shells.push({name,...value.metric}); }
    for (const kind of kinds) {
      const left = shells.get(`fr-manikin-${kind}-lid-left`).vertices, right = shells.get(`fr-manikin-${kind}-lid-right`).vertices; equal(left.size,right.size,'bilateral shell count');
      for (const {position,normal} of left.values()) { const mirrored = position.clone(); mirrored.x *= -1; const match = right.get(key(mirrored)); check(!!match,kind+' exact mirrored vertex'); const n = normal.clone(); n.x *= -1; check(n.dot(match.normal)>.9999,kind+' exact mirrored normal'); }
    }
    metric.relief = relief(current); metric.creases = crease(current); metric.baselineCreases = crease(prior);
    const local = [...changedNames].map(name => { const g = object(current,name).geometry; return [name,sha(Buffer.from(g.attributes.position.array.buffer)),sha(Buffer.from(g.attributes.normal.array.buffer)),sha(Buffer.from(g.index.array.buffer))]; });
    if (localByAge.has(setting.age)) equal(local,localByAge.get(setting.age),'pose and contrast preserve fitted local geometry'); else localByAge.set(setting.age,local);
    metric.localGeometry = local;
    const saved = snapshot(current), refs = [...changedNames].map(name => { const o=object(current,name); return {o,g:o.geometry,m:o.material,p:o.geometry.attributes.position.array,n:o.geometry.attributes.normal.array,i:o.geometry.index.array}; });
    const beforeCounts = [current.allocatedGeometries.length,current.allocatedMaterials.length]; current.sample(); current.sample(); equal(snapshot(current),saved,'repeated frames preserve scene');
    for (const r of refs) check(r.o.geometry===r.g&&r.o.material===r.m&&r.o.geometry.attributes.position.array===r.p&&r.o.geometry.attributes.normal.array===r.n&&r.o.geometry.index.array===r.i,'repeated frames retain eye resources');
    equal([current.allocatedGeometries.length,current.allocatedMaterials.length],beforeCounts,'no frame allocations');
    const a=resources(current),b=resources(prior); equal(a.geometries.size,b.geometries.size,'unique geometry count preserved');equal(a.materials.size,b.materials.size,'unique material count preserved');
    if (selftest && !negatives.length) {
      const mesh=object(current,'fr-manikin-upper-lid-left'), p=mesh.geometry.attributes.position, savedBytes=Buffer.from(p.array.buffer.slice(0)), file=path.join(work,'selftest-positions.bin');
      fs.writeFileSync(file,savedBytes); const idx=frontSample(mesh,0); p.setY(idx,p.getY(idx)+.02); let failed=false;
      try { relief(current); } catch(e) { failed=true; negatives.push({kind:'raised-lid',error:e.message}); } finally { const restored=fs.readFileSync(file);new Uint8Array(p.array.buffer).set(restored);equal(Buffer.from(p.array.buffer),savedBytes,'selftest restored original positions from saved bytes'); }
      check(failed,'raised lid mutation rejected'); relief(current);
      const n=mesh.geometry.attributes.normal,savedNormals=n.array.slice();n.setXYZ(0,0,0,0);failed=false;
      try { shell(mesh); } catch(e) { failed=true; negatives.push({kind:'invalid-normal',error:e.message}); } finally { n.array.set(savedNormals);equal(Array.from(n.array),Array.from(savedNormals),'normal selftest restored'); }
      check(failed,'invalid normal mutation rejected'); shell(mesh);
    }
  } catch(e) { error=e.stack; }
  finally { if(current)metric.resources=disposeOnce(current);if(prior)metric.priorResources=disposeOnce(prior); }
  const result={...setting,status:error?'failed':'passed',checks:checks-count,durationMs:Date.now()-start,...metric,...(error?{error}:{})}; results.push(result); console.log(JSON.stringify({age:setting.age,phase:setting.phase,contrast:setting.contrast,status:result.status,error:error?.split('\n')[0]})); if(error)break;
}
equal(sha(fs.readFileSync(beforePath)),pins.beforeSHA256,'baseline input unchanged');equal(sha(fs.readFileSync(candidatePath)),pins.candidateSHA256,'candidate input unchanged');equal(sha(fs.readFileSync(__filename)),pins.checkerSHA256,'checker input unchanged');
const summary={...pins,checks,negativeTests:negatives,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,results};
const output=path.join(work,early?'cpu-early.json':'cpu-validation.json');if(fs.existsSync(output)){const saved=fs.readFileSync(output);fs.writeFileSync(output+'.previous-'+sha(saved).slice(0,12)+'.json',saved);}
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n'); console.log(JSON.stringify({passed:summary.passed,failed:summary.failed,checks,...pins}));if(summary.failed)process.exitCode=1;
