'use strict';
const fs = require('node:fs'), path = require('node:path');
const checkerPath = path.join(__dirname, 'verify-palm-symmetry.cjs');
const prefix = fs.readFileSync(checkerPath, 'utf8').split('const results = [], negative = [];')[0];
const extra = String.raw`
function diagnosticSnapshot(model) {
  const result = {};
  model.scene.traverse(o => {
    const key = o.name || ('unnamed-' + Object.keys(result).length);
    const row = { type:o.type, name:o.name, position:o.position.toArray(), quaternion:o.quaternion.toArray(), rotation:o.rotation.toArray(),scale:o.scale.toArray(),matrix:o.matrix.toArray(),matrixWorld:o.matrixWorld.toArray(), visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow,frustumCulled:o.frustumCulled,renderOrder:o.renderOrder,layers:o.layers.mask,matrixAutoUpdate:o.matrixAutoUpdate,userData:o.userData,animations:o.animations };
    if (o.geometry) {
      const g=o.geometry;
      row.geometry={type:g.type,parameters:parameterData(o),drawRange:g.drawRange,groups:g.groups,userData:g.userData,boundingBox:g.boundingBox,boundingSphere:g.boundingSphere,morphAttributes:g.morphAttributes,morphTargetsRelative:g.morphTargetsRelative,attributes:{},index:g.index?{descriptor:descriptor(g.index),sha:mayChange(o.name,'index')?'allowed':sha(bytes(g.index))}:null};
      for(const [k,v] of Object.entries(g.attributes)) row.geometry.attributes[k]={descriptor:descriptor(v),sha:mayChange(o.name,k)?'allowed':sha(bytes(v))};
    }
    if(o.material) row.materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>({json:m.toJSON(),compile:String(m.onBeforeCompile),key:String(m.customProgramCacheKey)}));
    result[key]=row;
  });
  result.content={landmarks:model.content.landmarks,meshKeys:Object.keys(model.content.meshes).sort(),picks:model.content.picks.map(o=>o.name),anchor:model.content.anchor.name};
  return JSON.parse(JSON.stringify(result,(k,v)=>k==='uuid'?undefined:typeof v==='function'?String(v):v));
}
function difference(a,b,path='') {
  if(JSON.stringify(a)===JSON.stringify(b)) return [];
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return [{path,before:a,after:b}];
  return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>difference(a[k],b[k],path+'.'+k));
}
function diagnoseNormals(model,leftName,rightName) {
  const left=find(model,leftName),right=find(model,rightName);
  const map=new Map(), rightMatrix=new THREE.Matrix3().getNormalMatrix(right.matrix),leftMatrix=new THREE.Matrix3().getNormalMatrix(left.matrix);
  parentPositions(right).forEach((p,i)=>{const k=vertexKey(p);if(!map.has(k))map.set(k,[]);map.get(k).push({i,n:new THREE.Vector3().fromBufferAttribute(right.geometry.attributes.normal,i).applyMatrix3(rightMatrix).normalize()});});
  const bad=[], all=[];
  parentPositions(left).forEach((p,i)=>{p.x*=-1;const n=new THREE.Vector3().fromBufferAttribute(left.geometry.attributes.normal,i).applyMatrix3(leftMatrix).normalize();n.x*=-1;const matches=map.get(vertexKey(p))||[];const list=matches.map(m=>({i:m.i,error:n.distanceTo(m.n),normal:m.n.toArray()}));const used=list[list.length-1];const nearest=list.slice().sort((a,b)=>a.error-b.error)[0];const r={leftIndex:i,key:vertexKey(p),leftNormal:n.toArray(),used,nearest,matches:list};all.push(r);if(!used||used.error>=1e-6)bad.push(r);});
  return {vertices:all.length,duplicateKeys:[...map].filter(([k,v])=>v.length>1).map(([k,v])=>({key:k,indices:v.map(x=>x.i)})),badCount:bad.length,maxUsedError:Math.max(...all.map(x=>x.used?.error||0)),maxNearestError:Math.max(...all.map(x=>x.nearest?.error||0)),all,bad};
}
const results=[];
for(const phase of [0]) {
  const a=build(beforeConfig,'adult',phase,false), b=build(candidateConfig,'adult',phase,false);
  const diffs=difference(diagnosticSnapshot(a),diagnosticSnapshot(b));
  const comparisons = [];
  for(const [pair,left,right] of [['patient','fr-patient-left-palm','fr-patient-right-palm'],['rescuer','fr-rescuer-lower-palm','fr-rescuer-upper-palm']]) {
    const prior=diagnoseNormals(a,left,right), current=diagnoseNormals(b,left,right);
    const worse=current.all.filter((r,i)=>r.used.error > prior.all[i].used.error + 1e-7).map((r,i)=>({leftIndex:r.leftIndex,before:prior.all[r.leftIndex].used.error,after:r.used.error,increase:r.used.error-prior.all[r.leftIndex].used.error}));
    comparisons.push({pair,baselineMax:prior.maxUsedError,candidateMax:current.maxUsedError,baselineBad:prior.badCount,candidateBad:current.badCount,baselineMean:prior.all.reduce((s,r)=>s+r.used.error,0)/prior.vertices,candidateMean:current.all.reduce((s,r)=>s+r.used.error,0)/current.vertices,worseCount:worse.length,worse});
  }
  results.push({phase,diffs,comparisons});
  dispose(a);dispose(b);
}
const out={sourceSHA256:candidateSHA256,checkerSHA256:sha(fs.readFileSync(path.join(work,'verify-palm-symmetry.cjs'))),results};
fs.writeFileSync(path.join(work,'diagnosis-baseline-comparison.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
`;
new Function('require','__dirname','__filename',prefix+extra)(require,__dirname,__filename);
