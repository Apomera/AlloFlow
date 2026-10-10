const assert=require('node:assert/strict');
const required=['fr-patient-left-finger-0-surface','fr-patient-left-finger-1-surface','fr-patient-left-finger-2-surface','fr-patient-left-finger-3-surface','fr-patient-right-finger-0-surface','fr-patient-right-finger-1-surface','fr-patient-right-finger-2-surface','fr-patient-right-finger-3-surface'];
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
 validateFingerBuffers(value.fingerBuffers);validateScopeProjections(value);
}
function buffer(value,name){assert.ok(value&&Number.isInteger(value.bytes)&&value.bytes>0,name+' positive bytes');assert.match(value.hash,/^[0-9a-f]+$/,name+' actual buffer hash');}
function attribute(value,name){assert.ok(value&&Number.isInteger(value.count)&&value.count>0,name+' nonempty count');assert.equal(value.itemSize,3,name+' three coordinates');assert.equal(value.normalized,false,name+' Float32 values');buffer(value.buffer,name);assert.equal(value.buffer.bytes,value.count*12,name+' Float32 byte count');}
function triangleIds(ids,count,name){assert.ok(Array.isArray(ids),name+' triangle array');assert.deepEqual(ids,[...new Set(ids)].sort((a,b)=>a-b),name+' unique sorted triangles');for(const id of ids)assert.ok(Number.isInteger(id)&&id>=0&&id<count,name+' triangle within bounds');}
function validateFingerBuffers(buffers){
 assert.ok(Array.isArray(buffers),'finger buffers array');
 assert.deepEqual(buffers.map(b=>b.name),required,'only exact eight named patient finger targets');
 for(const part of buffers){
  assert.deepEqual(Object.keys(part).sort(),['backwardsTriangles','degenerateTriangles','finiteUnitNormals','maxLength','minFaceDot','minLength','name','normal','triangleCount','validIndices'],'normal-only scoped evidence fields');
  assert.equal(part.finiteUnitNormals,true,'all scoped normals finite and unit');
  assert.ok(Number.isFinite(part.minLength)&&Number.isFinite(part.maxLength)&&part.minLength>1-1e-5&&part.maxLength<1+1e-5&&part.minLength<=part.maxLength,'unit normal length bounds');
  attribute(part.normal,part.name+' normal');
  assert.equal(part.validIndices,true,'all finger indices within vertex bounds');
  assert.ok(Number.isInteger(part.triangleCount)&&part.triangleCount>0,'complete finger triangles');
  assert.ok(Number.isFinite(part.minFaceDot)&&part.minFaceDot>=-1.000001&&part.minFaceDot<=1.000001,'finite face shading alignment');
  triangleIds(part.backwardsTriangles,part.triangleCount,part.name+' reversed shading');triangleIds(part.degenerateTriangles,part.triangleCount,part.name+' degenerate');
 }
}
function validateScopeProjections(value){
 const scope=value.fingerScopeProjections;assert.ok(scope&&typeof scope==='object','actual per-hand scope projections');assert.deepEqual(Object.keys(scope).sort(),['left','right'],'exact two separate hand projection bounds');
 for(const side of ['left','right']){const p=scope[side],expected=value.fingerBuffers.filter(b=>b.name.startsWith('fr-patient-'+side+'-')).reduce((sum,b)=>sum+b.normal.count,0);
  assert.deepEqual(Object.keys(p).sort(),['inFrame','max','min','total'],'exact projected geometry fields');assert.equal(p.total,expected,'all four actual finger surfaces projected '+side);assert.ok(Number.isInteger(p.inFrame)&&p.inFrame>=0&&p.inFrame<=p.total,'visible projected vertex count '+side);
  finiteVector(p.min,side+' projected min');finiteVector(p.max,side+' projected max');for(let axis=0;axis<3;axis++)assert.ok(p.min[axis]<=p.max[axis],side+' projected bounds ordered');
 }
}
function validateNativePair(reference,value,id){
 validateFingerBuffers(reference.fingerBuffers);validateFingerBuffers(value.fingerBuffers);validateScopeProjections(reference);validateScopeProjections(value);
 assert.deepEqual(value.fingerBuffers.map(b=>b.name),reference.fingerBuffers.map(b=>b.name),'same exact named target inventory');
 assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preserved outside exact eight finger normal arrays');
 for(const key of ['pose','state','contact','supportInspection','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes','camera','selectedHand','head','faceProjection','neckProjection','skull','preservedFace','cheekContext','fingerProjection','fingerScopeProjections']){assert.ok(Object.hasOwn(reference,key)&&Object.hasOwn(value,key),key+' evidence present');assert.deepEqual(value[key],reference[key],key+' exact');}
 for(const key of ['geometries','materials','programs','calls','triangles'])assert.equal(value.draw[key],reference.draw[key],key+' exact');
 const changed=[];
 for(let i=0;i<value.fingerBuffers.length;i++){
  const a=reference.fingerBuffers[i],b=value.fingerBuffers[i];
  for(const key of ['count','itemSize','normalized'])assert.equal(b.normal[key],a.normal[key],a.name+' normal '+key+' exact');
  assert.equal(b.normal.buffer.bytes,a.normal.buffer.bytes,'normal byte count exact');
  assert.equal(b.triangleCount,a.triangleCount,'triangle count exact');assert.deepEqual(b.degenerateTriangles,a.degenerateTriangles,'degenerate geometry exact');
  for(const face of b.backwardsTriangles)assert.ok(a.backwardsTriangles.includes(face),'no newly reversed face shading '+a.name+' triangle '+face);
  assert.notEqual(b.normal.buffer.hash,a.normal.buffer.hash,'each patient finger has changed join normals');changed.push(a.name+'.normal');
 }
 if(id==='adult-wide')assert.ok(value.camera.aspect>=1.15,'wide viewer');else {assert.ok(narrowIds.includes(id),'known narrow view');assert.ok(value.camera.aspect<1.15,'narrow viewer');}
 return {accepted:true,changedFields:changed,exactSceneOutsideScope:true,noNewReversedFaceShading:true,exactCameraContactState:true,exactResourceCounts:true};
}
function validateCandidateFraming(value,id){
 const fingers=value.fingerProjection;assert.ok(fingers.total>0,'palm and four fingers have vertices');assert.equal(fingers.inFrame,fingers.total,'complete palm and finger detail');
 if(!narrowIds.includes(id))return;
 assert.ok(value.head.max[0]-value.head.min[0]>1.2,'head occupies over sixty percent of the narrow view');
 assert.ok(value.selectedHand.max[0]-value.selectedHand.min[0]>.6,'supporting hand remains readable');
 for(const name of ['head','selectedHand']){const p=value[name];assert.ok(p.total>0,name+' has vertices');assert.equal(p.inFrame,p.total,name+' complete');assert.ok(p.min.slice(0,2).every(n=>Number.isFinite(n)&&n>-.94)&&p.max.slice(0,2).every(n=>Number.isFinite(n)&&n<.94),name+' fits with .94 margin');assert.ok(p.min[2]>-1&&p.max[2]<1,name+' near/far planes');}
}
function validateResize(value,resize){
 assert.ok(resize.wide.camera.aspect>=1.15&&resize.restored.camera.aspect<1.15,'real resize crosses threshold');
 for(const sample of [resize.wide,resize.restored]){
  validateMetadata(sample);
  for(const key of ['preservedScene','pose','state','contact','supportInspection','noseMeshes','skullGeometry','fingerBuffers'])assert.deepEqual(sample[key],value[key],'resize preserves '+key);
  for(const key of ['geometries','programs','materials'])assert.equal(sample.draw[key],value.draw[key],'resize allocates no '+key);
  assert.equal(sample.draw.id,value.draw.id,'resize reuses renderer');assert.equal(sample.draw.disposeCount,0,'resize retains renderer');
 }
 assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');
 for(const key of ['calls','triangles'])assert.equal(resize.restored.draw[key],value.draw[key],'restored narrow '+key+' exact');
 for(const key of ['selectedHand','head','faceProjection','cheekContext','fingerProjection','fingerScopeProjections'])assert.deepEqual(resize.restored[key],value[key],'restored narrow '+key+' exact');
 validateCandidateFraming(resize.restored,'child-narrow');
}
module.exports={validateMetadata,validateFingerBuffers,validateScopeProjections,validateNativePair,validateCandidateFraming,validateResize};
