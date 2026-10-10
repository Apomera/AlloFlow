const assert=require('node:assert/strict');
const wrists=['fr-patient-left-wrist','fr-patient-right-wrist'];
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
 validateWristBuffers(value.wristBuffers);
}
function validateWristBuffers(buffers){
 assert.deepEqual(buffers.map(b=>b.name),wrists,'exact two wrist normal buffers');
 for(const wrist of buffers){
  assert.equal(wrist.finiteUnitNormals,true,'all wrist normals finite and unit');
  assert.ok(Number.isFinite(wrist.minLength)&&Number.isFinite(wrist.maxLength)&&wrist.minLength>1-1e-5&&wrist.maxLength<1+1e-5,'unit normal length bounds');
  assert.equal(wrist.normal.itemSize,3,'three normal coordinates');assert.equal(wrist.normal.normalized,false,'Float32 normal attributes');
  assert.ok(Number.isInteger(wrist.normal.count)&&wrist.normal.count>0,'nonempty normal buffer');assert.equal(wrist.normal.buffer.bytes,wrist.normal.count*3*4,'normal buffer byte count');
  assert.match(wrist.normal.buffer.hash,/^[0-9a-f]+$/,'actual normal hash');
 }
}
function validateNativePair(reference,value,id){
 validateWristBuffers(reference.wristBuffers);validateWristBuffers(value.wristBuffers);
 assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preserved except exact two wrist normal arrays');
 for(const key of ['pose','state','contact','supportInspection','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes','camera','selectedHand','head','faceProjection','neckProjection','skull','preservedFace','cheekContext','wristProjection'])assert.deepEqual(value[key],reference[key],key+' exact');
 for(const key of ['geometries','materials','programs','calls','triangles'])assert.equal(value.draw[key],reference.draw[key],key+' exact');
 for(let i=0;i<wrists.length;i++){
  const a=reference.wristBuffers[i].normal,b=value.wristBuffers[i].normal;
  for(const key of ['count','itemSize','normalized'])assert.equal(b[key],a[key],'wrist normal '+key+' exact');
  assert.equal(b.buffer.bytes,a.buffer.bytes,'wrist normal bytes exact');assert.notEqual(b.buffer.hash,a.buffer.hash,'each wrist has a deliberate normal change');
 }
 if(id==='adult-wide')assert.ok(value.camera.aspect>=1.15,'wide viewer');else {assert.ok(narrowIds.includes(id),'known narrow view');assert.ok(value.camera.aspect<1.15,'narrow viewer');}
}
function validateCandidateFraming(value,id){
 const wrist=value.wristProjection;assert.ok(wrist.total>0,'wrist has vertices');assert.equal(wrist.inFrame,wrist.total,'complete wrist detail');
 if(!narrowIds.includes(id))return;
 assert.ok(value.head.max[0]-value.head.min[0]>1.2,'head occupies over sixty percent of the narrow view');
 assert.ok(value.selectedHand.max[0]-value.selectedHand.min[0]>.6,'supporting hand remains readable');
 for(const name of ['head','selectedHand']){const p=value[name];assert.ok(p.total>0,name+' has vertices');assert.equal(p.inFrame,p.total,name+' complete');assert.ok(p.min.slice(0,2).every(n=>Number.isFinite(n)&&n>-.94)&&p.max.slice(0,2).every(n=>Number.isFinite(n)&&n<.94),name+' fits with .94 margin');assert.ok(p.min[2]>-1&&p.max[2]<1,name+' near/far planes');}
}
function validateResize(value,resize){
 assert.ok(resize.wide.camera.aspect>=1.15&&resize.restored.camera.aspect<1.15,'real resize crosses threshold');
 for(const sample of [resize.wide,resize.restored]){
  validateMetadata(sample);
  for(const key of ['preservedScene','pose','state','contact','supportInspection','noseMeshes','skullGeometry','wristBuffers'])assert.deepEqual(sample[key],value[key],'resize preserves '+key);
  for(const key of ['geometries','programs','materials'])assert.equal(sample.draw[key],value.draw[key],'resize allocates no '+key);
  assert.equal(sample.draw.id,value.draw.id,'resize reuses renderer');assert.equal(sample.draw.disposeCount,0,'resize retains renderer');
 }
 assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');
 for(const key of ['calls','triangles'])assert.equal(resize.restored.draw[key],value.draw[key],'restored narrow '+key+' exact');
 for(const key of ['selectedHand','head','faceProjection','cheekContext','wristProjection'])assert.deepEqual(resize.restored[key],value[key],'restored narrow '+key+' exact');
 validateCandidateFraming(resize.restored,'child-narrow');
}
module.exports={validateMetadata,validateWristBuffers,validateNativePair,validateCandidateFraming,validateResize};
