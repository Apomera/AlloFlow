// Reuse the repository's real-THREE ear assertions without starting jsdom/Vitest.
// The registered test bodies and all thresholds remain unchanged.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const work = __dirname;
const hash = value => createHash('sha256').update(value).digest('hex');
const before = fs.readFileSync(path.join(work, 'before.js'), 'utf8');
const candidate = fs.readFileSync(path.join(work, 'candidate.js'), 'utf8');
assert.equal(hash(before), '16aceaa1b7d8bbd0ed869536b554451ddd2e5e3a832229e2e3322f8ad75f03e2', 'accepted ear baseline');
const mode = process.argv[2] || 'full';
let checks = 0;
function expect(actual, message = '') {
  const test = (predicate, label) => { checks++; assert.ok(predicate, message + ': ' + label); };
  return {
    toBe: wanted => { checks++; assert.equal(actual, wanted, message); },
    toEqual: wanted => { checks++; assert.deepEqual(actual, wanted, message); },
    toBeTruthy: () => test(!!actual, 'expected truthy'),
    toBeGreaterThan: wanted => test(actual > wanted, `${actual} > ${wanted}`),
    toBeLessThan: wanted => test(actual < wanted, `${actual} < ${wanted}`),
  };
}
global.window = {};
const relativeRead = (file, ...args) => fs.readFileSync(path.isAbsolute(file) ? file : path.join(repo, file), ...args);
function fixture(name) {
  const file = path.join(repo, 'tests', name);
  const original = fs.readFileSync(file, 'utf8');
  let code = original.replace(/^import[^\n]*\n/gm, '');
  const read = "const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');";
  assert.equal(code.split(read).length, 2, name + ' source guard');
  code = code.replace(read, 'const source = __source;');
  const tests = [], beforeHooks = [], afterHooks = [], helpers = {};
  let describeName = '';
  const it = (title, fn) => tests.push({ title: describeName + ' / ' + title, fn });
  it.each = cases => (title, fn) => cases.forEach(value => it(title + ' ' + JSON.stringify(value), () => fn(value)));
  const describe = (title, fn) => { const previous = describeName; describeName = title; fn(); describeName = previous; };
  new Function('beforeEach', 'afterEach', 'describe', 'it', 'expect', 'readFileSync', '__source', '__helpers',
    code + '\nObject.assign(__helpers, { model, earModel, weldedShell, vertexKey, point, materialState });')(
    fn => beforeHooks.push(fn), fn => afterHooks.push(fn), describe, it, expect, relativeRead, candidate, helpers);
  return { name, originalSHA256: hash(original), tests, beforeHooks, afterHooks, helpers };
}
const results = [];
function runCase(suite, test) {
  const started = Date.now(), count = checks;
  let error;
  try { suite.beforeHooks.forEach(fn => fn()); test.fn(); }
  catch (failure) { error = failure.stack; }
  finally { for (const fn of suite.afterHooks) { try { fn(); } catch (failure) { error ||= failure.stack; } } }
  const result = { suite: suite.name, name: test.title, status: error ? 'failed' : 'passed', checks: checks-count, durationMs: Date.now()-started };
  if (error) result.error = error;
  results.push(result);
  console.log(JSON.stringify({status:result.status,suite:result.suite,name:result.name,checks:result.checks,error:error?.split('\n').slice(0,3).join('\n')}));
}
const fold = fixture('firstresponse_ear_folds.test.js');
const rim = fixture('firstresponse_ear_rims.test.js');
const attachmentMetrics=[];
for(const age of ['adult','child','infant'])for(const phase of [0,8])fold.tests.push({
  title:'refined pinna base / closed bilateral base and actual skull attachment '+JSON.stringify({age,phase}),
  fn(){
    const fixture=fold.helpers.model(age,phase), shells={};
    for(const side of ['left','right']){
      const ear=fold.helpers.earModel(fixture,side),shell=fold.helpers.weldedShell(ear.base);shells[side]=shell;
      expect(shell.finite,ear.base.name).toBe(true);expect(shell.connected,ear.base.name).toBe(true);expect(shell.euler,ear.base.name).toBe(2);
      expect([...shell.edges.values()].every(edge=>edge.count===2&&edge.balance===0),ear.base.name+' closed consistent winding').toBe(true);
      expect(shell.volume,ear.base.name+' outward signed volume').toBeGreaterThan(0);
      expect(shell.minimumFaceNormalDot,ear.base.name+' normals agree with winding').toBeGreaterThan(0);
      expect(shell.minimumNormalLength).toBeGreaterThan(.9999);expect(shell.maximumNormalLength).toBeLessThan(1.0001);
      expect(shell.minimumCoincidentDot,ear.base.name+' welded normal continuity').toBeGreaterThan(.9999);
      const vertices=Array.from({length:ear.base.geometry.attributes.position.count},(_,i)=>fold.helpers.point(ear.base,i).applyMatrix4(ear.base.matrix));
      const bounds=new THREE.Box3().setFromPoints(vertices),centre=bounds.getCenter(new THREE.Vector3()),half=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
      const inward=vertices.filter(p=>ear.sign*(p.x-centre.x)<0),chosen=new Set(),gaps=[];
      for(const y of [-.2,0,.2])for(const z of [-.2,0,.2]){
        const targetY=centre.y+y*half.y,targetZ=centre.z+z*half.z;
        let index=0,cost=Infinity;
        inward.forEach((point,i)=>{const next=Math.hypot(point.y-targetY,point.z-targetZ);if(next<cost){cost=next;index=i;}});
        chosen.add(index);const world=inward[index].clone().applyMatrix4(ear.ear.matrixWorld);
        const ray=new THREE.Raycaster(world.clone().addScaledVector(ear.outward,.1*ear.unit),ear.outward.clone().negate());
        const hit=ray.intersectObject(ear.head,false)[0];expect(hit,ear.base.name+' attachment samples intersect actual skull triangles').toBeTruthy();
        const gap=(hit.distance-.1*ear.unit)/ear.unit;gaps.push(gap);
        expect(gap,ear.base.name+' inner attachment overlaps actual skull').toBeLessThan(-.0001);
        expect(gap,ear.base.name+' attachment remains shallow').toBeGreaterThan(-.06);
      }
      expect(chosen.size,ear.base.name+' attachment samples distinct actual vertices').toBeGreaterThan(4);
      attachmentMetrics.push({age,phase,side,samples:gaps.length,distinctVertices:chosen.size,minimumGap:Math.min(...gaps),maximumGap:Math.max(...gaps),closedBase:{euler:shell.euler,volume:shell.volume,minimumFaceNormalDot:shell.minimumFaceNormalDot,minimumCoincidentDot:shell.minimumCoincidentDot}});
    }
    expect(shells.left.welded.size).toBe(shells.right.welded.size);
    for(const {position,normal} of shells.right.welded.values()){
      const mirror=position.clone();mirror.x*=-1;const matching=shells.left.welded.get(fold.helpers.vertexKey(mirror));expect(matching,'bilateral pinna base').toBeTruthy();
      const reflected=normal.clone();reflected.x*=-1;expect(matching.normal.dot(reflected),'bilateral pinna-base normals').toBeGreaterThan(.9999);
    }
  }
});
const fitOnly = title => /shallow relief|continuous loop|inside the ear outline/.test(title);
for (const suite of [fold, rim]) {
  for (const test of suite.tests.filter(test => mode !== 'early' || fitOnly(test.title))) {
    runCase(suite, test);
    if (mode === 'early' && results.at(-1).status === 'failed') break;
  }
  if (mode === 'early' && results.at(-1)?.status === 'failed') break;
}

const THREE = {};
new Function('exports','module',relativeRead('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
function capture(code) {
  let config;
  window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(value){config=value;return {attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};
  new Function(code)(); return config;
}
const oldConfig = capture(before), newConfig = capture(candidate);
function createModel(config, age, phase, contrast) {
  const scene = new THREE.Scene();
  const content = config.buildScene(THREE,{scene,phase,dark:true,contrast,wantShadow:false,
    trim:(color,shininess)=>new THREE.MeshPhongMaterial({color,shininess:shininess??30,specular:0x6b7688}),
    sceneProps:{age,tab:'recovery',recoveryGuides:true}});
  const sample=()=>{content.frame(0,{},true);scene.updateMatrixWorld(true);};sample();
  return {scene,content,sample};
}
function parameters(material) {
  const value={};
  for(const key of ['type','name','transparent','opacity','depthTest','depthWrite','side','shininess','wireframe','vertexColors','flatShading','alphaTest','blending','blendSrc','blendDst','blendEquation','premultipliedAlpha','dithering','toneMapped','fog','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','linewidth','dashSize','gapSize','scale']) if(material[key]!==undefined)value[key]=material[key];
  for(const key of ['color','specular','emissive'])if(material[key])value[key]=material[key].toArray();
  value.userData=material.userData;value.onBeforeCompile=String(material.onBeforeCompile);value.customProgramCacheKey=material.customProgramCacheKey();return value;
}
function preservation(model) {
  const value=createHash('sha256'), geometryIds=new Map(), materialIds=new Map(), resources={nodes:0,meshes:0,geometries:0,materials:0};
  const identity=(map,object)=>{if(!map.has(object))map.set(object,map.size);return map.get(object);};
  function visit(object, location) {
    if(/^fr-manikin-ear-(left|right)$/.test(object.name))return;
    resources.nodes++;if(object.isMesh)resources.meshes++;
    value.update(JSON.stringify([location,object.type,object.name,object.visible,object.matrix.toArray(),object.matrixWorld.toArray(),object.castShadow,object.receiveShadow,object.renderOrder,object.layers.mask]));
    if(object.geometry){const geometry=object.geometry;value.update(JSON.stringify([identity(geometryIds,geometry),geometry.type,geometry.drawRange,geometry.groups]));
      for(const key of Object.keys(geometry.attributes).sort()){const a=geometry.attributes[key],b=a.array;value.update(JSON.stringify([key,a.itemSize,a.normalized,b.constructor.name]));value.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}
      if(geometry.index){const b=geometry.index.array;value.update(b.constructor.name);value.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}}
    if(object.material)value.update(JSON.stringify((Array.isArray(object.material)?object.material:[object.material]).map(material=>[identity(materialIds,material),parameters(material)])));
    object.children.forEach((child,index)=>visit(child,location+'.'+index));
  }
  visit(model.scene,'scene');resources.geometries=geometryIds.size;resources.materials=materialIds.size;
  value.update(JSON.stringify({meshKeys:Object.keys(model.content.meshes).sort(),picks:model.content.picks.map(o=>o.name),inspection:Object.fromEntries(Object.entries(model.content.meshes).filter(([,o])=>o.userData?.inspection).map(([key,o])=>[key,o.userData.inspection]))}));
  return {SHA256:value.digest('hex'),resources};
}
function dispose(model){const geos=new Set(),mats=new Set();model.scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)mats.add(m);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}
const preservationCases=[];
if(mode!=='early')for(const age of ['adult','child','infant'])for(const phase of [0,8])for(const contrast of [false,true]){
  const a=createModel(oldConfig,age,phase,contrast),b=createModel(newConfig,age,phase,contrast);
  let error;const oldValue=preservation(a),newValue=preservation(b);
  try{checks++;assert.deepEqual(newValue,oldValue,'every buffer/transform/material outside ear subtrees');
    a.sample();b.sample();checks++;assert.deepEqual(preservation(b),preservation(a),'repeated frames preserve all outside ear subtrees');
  }catch(failure){error=failure.stack;}finally{dispose(a);dispose(b);}
  preservationCases.push({age,phase,contrast,status:error?'failed':'passed',before:oldValue,candidate:newValue,...(error?{error}:{})});
}
const output={mode,beforeSHA256:hash(before),candidateSHA256:hash(candidate),assertionCount:checks,
  fixtureInputs:[fold,rim].map(({name,originalSHA256,tests})=>({name,originalSHA256,registeredCases:tests.length})),results,preservationCases,attachmentMetrics,
  passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length+preservationCases.filter(r=>r.status==='failed').length};
fs.writeFileSync(path.join(work,'verification-'+mode+'.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({mode,beforeSHA256:output.beforeSHA256,candidateSHA256:output.candidateSHA256,assertionCount:checks,passed:output.passed,failed:output.failed,preservationCases:preservationCases.length}));
if(output.failed)process.exitCode=1;
