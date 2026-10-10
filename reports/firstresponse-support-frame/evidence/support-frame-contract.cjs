const assert=require('node:assert/strict');
const narrowIds=['child-narrow','infant-narrow-contrast'];
const finiteVector=(value,name)=>assert.ok(Array.isArray(value)&&value.length===3&&value.every(Number.isFinite),name+' finite vector');
function near(a,b,name){assert.ok(Math.abs(a-b)<1e-8,name+' matches independently derived bound');}
function vectorNear(a,b,name){finiteVector(a,name);finiteVector(b,name+' expected');a.forEach((n,i)=>near(n,b[i],name));}
function validateMetadata(value,variant){
  const info=value.supportInspection,original=info.original,expected=info.expectedOriginal;
  assert.deepEqual(Object.keys(original).sort(),['center','context','forward','normal','radius'],'original inspection fields unchanged');
  for(const key of ['center','normal','forward'])vectorNear(original[key],expected[key],key);
  assert.ok(Number.isFinite(original.radius)&&original.radius>0);near(original.radius,expected.radius,'original radius');
  assert.equal(original.context.length,5,'original five cheek points');for(const point of original.context)finiteVector(point,'original cheek point');
  if(variant==='baseline'){assert.equal(info.faceFrame,null,'baseline has no new frame');return;}
  assert.deepEqual(Object.keys(info.faceFrame).sort(),['center','radius'],'numeric frame fields only');
  vectorNear(info.faceFrame.center,info.expectedFaceFrame.center,'full head frame center');
  assert.ok(Number.isFinite(info.faceFrame.radius)&&info.faceFrame.radius>0,'finite positive full head frame radius');
  near(info.faceFrame.radius,info.expectedFaceFrame.radius,'full head frame radius');
}
function validateNativePair(reference,value,id){
  assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preservation');
  for(const key of ['pose','state','contact','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes'])assert.deepEqual(value[key],reference[key],key+' preserved');
  assert.deepEqual(value.supportInspection.original,reference.supportInspection.original,'original support metadata preserved');
  assert.deepEqual(value.supportInspection.expectedOriginal,reference.supportInspection.expectedOriginal,'original actual bounds preserved');
  assert.deepEqual(value.supportInspection.expectedFaceFrame,reference.supportInspection.expectedFaceFrame,'actual head and hand bounds preserved');
  for(const key of ['geometries','materials','programs'])assert.equal(value.draw[key],reference.draw[key],key+' exact');
  if(id==='adult-wide'){
    for(const key of ['calls','triangles'])assert.equal(value.draw[key],reference.draw[key],'wide '+key+' exact');
    for(const key of ['camera','selectedHand','head','faceProjection','neckProjection','skull','preservedFace','cheekContext'])assert.deepEqual(value[key],reference[key],'wide '+key+' exact');
    assert.ok(value.camera.aspect>=1.15,'wide viewer uses original fit');
  }else {assert.ok(narrowIds.includes(id),'known narrow view');assert.ok(value.camera.aspect<1.15,'narrow viewer selects head frame');}
}
function validateCandidateFraming(value,id){
  if(!narrowIds.includes(id))return;
  assert.ok(value.head.max[0]-value.head.min[0]>1.2,'head occupies over sixty percent of the narrow view for readable detail');
  assert.ok(value.selectedHand.max[0]-value.selectedHand.min[0]>.6,'supporting hand remains large enough to inspect');
  for(const name of ['head','selectedHand']){
    const p=value[name];assert.ok(p.total>0,name+' has vertices');assert.equal(p.inFrame,p.total,name+' complete');
    assert.ok(p.min.slice(0,2).every(n=>Number.isFinite(n)&&n>-.94)&&p.max.slice(0,2).every(n=>Number.isFinite(n)&&n<.94),name+' fits with .94 margin');
    assert.ok(p.min[2]>-1&&p.max[2]<1,name+' near/far planes');
  }
}
function validateResize(value,resize,variant){
  assert.ok(resize.wide.camera.aspect>=1.15&&resize.restored.camera.aspect<1.15,'real resize crosses threshold');
  for(const sample of [resize.wide,resize.restored]){
    validateMetadata(sample,variant);
    for(const key of ['preservedScene','pose','state','contact','supportInspection','noseMeshes','skullGeometry'])assert.deepEqual(sample[key],value[key],'resize preserves '+key);
    for(const key of ['geometries','programs','materials'])assert.equal(sample.draw[key],value.draw[key],'resize allocates no '+key);
    assert.equal(sample.draw.id,value.draw.id,'resize reuses renderer');assert.equal(sample.draw.disposeCount,0,'resize retains renderer');
  }
  assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');
  for(const key of ['calls','triangles'])assert.equal(resize.restored.draw[key],value.draw[key],'restored narrow '+key+' exact');
  for(const key of ['selectedHand','head','faceProjection','cheekContext'])assert.deepEqual(resize.restored[key],value[key],'restored narrow '+key+' exact');
  if(variant==='candidate')validateCandidateFraming(resize.restored,'child-narrow');
}
module.exports={validateMetadata,validateNativePair,validateCandidateFraming,validateResize};
