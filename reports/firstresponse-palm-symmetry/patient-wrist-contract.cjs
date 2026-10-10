const assert=require('node:assert/strict');
const required=['fr-patient-right-palm','fr-patient-right-palm-crease','fr-patient-right-thumb-crease','fr-patient-right-wrist'];
const narrowIds=['child-narrow','infant-narrow-contrast'];
const finiteVector=(value,name)=>assert.ok(Array.isArray(value)&&value.length===3&&value.every(Number.isFinite),name+' finite vector');
function near(a,b,name){assert.ok(Math.abs(a-b)<1e-8,name+' matches independently derived bound');}
function vectorNear(a,b,name){finiteVector(a,name);finiteVector(b,name+' expected');a.forEach((n,i)=>near(n,b[i],name));}
function validateMetadata(value){
 const info=value.supportInspection,original=info.original,expected=info.expectedOriginal;
 assert.deepEqual(Object.keys(original).sort(),['center','context','faceFrame','forward','normal','radius'],'inspection fields unchanged');
 for(const key of ['center','normal','forward'])vectorNear(original[key],expected[key],key);
 assert.ok(Number.isFinite(original.radius)&&original.radius>0);near(original.radius,expected.radius,'original radius');
 assert.equal(original.context.length,5,'five cheek points');for(const point of original.context)finiteVector(point,'cheek point');
 assert.deepEqual(original.faceFrame,info.faceFrame,'exact duplicated face frame');
 assert.deepEqual(Object.keys(info.faceFrame).sort(),['center','radius'],'numeric frame fields only');
 vectorNear(info.faceFrame.center,info.expectedFaceFrame.center,'full head frame center');
 assert.ok(Number.isFinite(info.faceFrame.radius)&&info.faceFrame.radius>0,'finite positive full head frame radius');near(info.faceFrame.radius,info.expectedFaceFrame.radius,'full head frame radius');
 validatePalmBuffers(value.palmBuffers);
}
function buffer(value,name){assert.ok(value&&Number.isInteger(value.bytes)&&value.bytes>0,name+' positive bytes');assert.match(value.hash,/^[0-9a-f]+$/,name+' actual buffer hash');}
function attribute(value,name){assert.ok(value&&Number.isInteger(value.count)&&value.count>0,name+' nonempty count');assert.equal(value.itemSize,3,name+' three coordinates');assert.equal(value.normalized,false,name+' Float32 values');buffer(value.buffer,name);assert.equal(value.buffer.bytes,value.count*12,name+' Float32 byte count');}
function validatePalmBuffers(buffers){
 const names=buffers.map(b=>b.name),expected=names.includes('fr-rescuer-upper-palm')?[...required,'fr-rescuer-upper-palm']:required;
 assert.deepEqual(names,expected,'only exact named palm symmetry targets');
 for(const part of buffers){
  const palm=part.name==='fr-patient-right-palm'||part.name==='fr-rescuer-upper-palm',crease=part.name.endsWith('-crease');
  assert.equal(part.finiteUnitNormals,true,'all scoped normals finite and unit');
  assert.ok(Number.isFinite(part.minLength)&&Number.isFinite(part.maxLength)&&part.minLength>1-1e-5&&part.maxLength<1+1e-5,'unit normal length bounds');
  attribute(part.normal,part.name+' normal');
  if(palm){buffer(part.index,part.name+' index');assert.equal(part.validIndices,true,'all palm indices within vertex bounds');assert.ok(Number.isInteger(part.indexCount)&&part.indexCount>0&&part.indexCount%3===0,'complete palm triangles');assert.ok(part.index.bytes===part.indexCount*2||part.index.bytes===part.indexCount*4,'index byte count');}
  else assert.equal(part.index,null,'no other index exception');
  if(crease){attribute(part.position,part.name+' position');assert.equal(part.finitePositions,true,'finite crease positions');assert.equal(part.position.count,part.normal.count,'crease attribute counts');assert.equal(part.path.length,49,'exact crease path point count');for(const p of part.path){assert.deepEqual(Object.keys(p).sort(),['x','y','z']);assert.ok([p.x,p.y,p.z].every(Number.isFinite),'finite crease path');}}
  else {assert.equal(part.position,null,'no other position exception');assert.equal(part.path,null,'no other path exception');}
 }
}
function validateNativePair(reference,value,id){
 validatePalmBuffers(reference.palmBuffers);validatePalmBuffers(value.palmBuffers);
 assert.deepEqual(value.palmBuffers.map(b=>b.name),reference.palmBuffers.map(b=>b.name),'same exact named target inventory');
 assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preserved outside exact palm symmetry fields');
 for(const key of ['pose','state','contact','supportInspection','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes','camera','selectedHand','head','faceProjection','neckProjection','skull','preservedFace','cheekContext','palmProjection'])assert.deepEqual(value[key],reference[key],key+' exact');
 for(const key of ['geometries','materials','programs','calls','triangles'])assert.equal(value.draw[key],reference.draw[key],key+' exact');
 const changed=[];
 for(let i=0;i<value.palmBuffers.length;i++){
  const a=reference.palmBuffers[i],b=value.palmBuffers[i];
  for(const field of ['normal','position'])if(a[field]){for(const key of ['count','itemSize','normalized'])assert.equal(b[field][key],a[field][key],a.name+' '+field+' '+key+' exact');assert.equal(b[field].buffer.bytes,a[field].buffer.bytes,'attribute byte count exact');if(b[field].buffer.hash!==a[field].buffer.hash)changed.push(a.name+'.'+field);}
  if(a.index){assert.equal(b.index.bytes,a.index.bytes,'index bytes exact');assert.equal(b.indexCount,a.indexCount,'index count exact');assert.notEqual(b.index.hash,a.index.hash,'each present right-handed palm changes its diagonal indices');changed.push(a.name+'.index');}
  if(a.path){a.path.forEach((p,j)=>{assert.equal(b.path[j].x,p.x,'crease path x exact');assert.equal(b.path[j].z,p.z,'crease path z exact');});if(JSON.stringify(a.path)!==JSON.stringify(b.path))changed.push(a.name+'.path');}
 }
 assert.ok(changed.includes('fr-patient-right-palm.index'),'right patient palm has actual changed indices');
 if(id==='adult-wide')assert.ok(value.camera.aspect>=1.15,'wide viewer');else {assert.ok(narrowIds.includes(id),'known narrow view');assert.ok(value.camera.aspect<1.15,'narrow viewer');}
 return {accepted:true,changedFields:changed,exactSceneOutsideScope:true,exactCameraContactState:true,exactResourceCounts:true};
}
function validateCandidateFraming(value,id){
 const palm=value.palmProjection;assert.ok(palm.total>0,'palm and crease have vertices');assert.equal(palm.inFrame,palm.total,'complete palm and crease detail');
 if(!narrowIds.includes(id))return;
 assert.ok(value.head.max[0]-value.head.min[0]>1.2,'head occupies over sixty percent of the narrow view');
 assert.ok(value.selectedHand.max[0]-value.selectedHand.min[0]>.6,'supporting hand remains readable');
 for(const name of ['head','selectedHand']){const p=value[name];assert.ok(p.total>0,name+' has vertices');assert.equal(p.inFrame,p.total,name+' complete');assert.ok(p.min.slice(0,2).every(n=>Number.isFinite(n)&&n>-.94)&&p.max.slice(0,2).every(n=>Number.isFinite(n)&&n<.94),name+' fits with .94 margin');assert.ok(p.min[2]>-1&&p.max[2]<1,name+' near/far planes');}
}
function validateResize(value,resize){
 assert.ok(resize.wide.camera.aspect>=1.15&&resize.restored.camera.aspect<1.15,'real resize crosses threshold');
 for(const sample of [resize.wide,resize.restored]){
  validateMetadata(sample);
  for(const key of ['preservedScene','pose','state','contact','supportInspection','noseMeshes','skullGeometry','palmBuffers'])assert.deepEqual(sample[key],value[key],'resize preserves '+key);
  for(const key of ['geometries','programs','materials'])assert.equal(sample.draw[key],value.draw[key],'resize allocates no '+key);
  assert.equal(sample.draw.id,value.draw.id,'resize reuses renderer');assert.equal(sample.draw.disposeCount,0,'resize retains renderer');
 }
 assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');
 for(const key of ['calls','triangles'])assert.equal(resize.restored.draw[key],value.draw[key],'restored narrow '+key+' exact');
 for(const key of ['selectedHand','head','faceProjection','cheekContext','palmProjection'])assert.deepEqual(resize.restored[key],value[key],'restored narrow '+key+' exact');
 validateCandidateFraming(resize.restored,'child-narrow');
}
module.exports={validateMetadata,validatePalmBuffers,validateNativePair,validateCandidateFraming,validateResize};
