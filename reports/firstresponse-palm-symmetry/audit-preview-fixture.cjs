const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','candidate.js','before.js','delta.json'];
const bytes=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(work,n))])),pins=Object.fromEntries(Object.entries(bytes).map(([n,b])=>[n,sha(b)]));
const delta=JSON.parse(bytes['delta.json']);assert.equal(pins['before.js'],delta.beforeSHA256);assert.equal(pins['candidate.js'],delta.afterSHA256);
const rules={
 'firstresponse-face-preview.spec.ts':[
  "var isPalm=name==='fr-patient-right-palm'||name==='fr-rescuer-upper-palm';",
  "var isWrist=name==='fr-patient-right-wrist';",
  "var isCrease=name==='fr-patient-right-palm-crease'||name==='fr-patient-right-thumb-crease';",
  'if(!isPalm&&!isWrist&&!isCrease)return descriptor;',
  "if(!isFinite(length)||Math.abs(length-1)>1e-5)throw Error('Invalid scoped unit normal '+name);",
  "if(!Number.isInteger(index.getX(i))||index.getX(i)<0||index.getX(i)>=a.count)throw Error('Invalid palm index '+name);",
  "descriptor.parameters.path.points=points.map(function(p){return [p[0],'[allowed fitted crease height]',p[2]];});",
  'function exactUserData(o){return JSON.parse(JSON.stringify(o.userData));}',
  'geometry:o.geometry?palmGeometry(o):null',
  "validateCandidateFraming(value,view.id);if(variant==='baseline')reference=value;else value.scopeComparison=validateNativePair(reference,value,view.id);",
  "validateNativePair(referenceResize.wide,wide,'adult-wide');",
  'resize={wide,restored};validateResize(value,resize,variant);',
  "await page.setViewportSize({width:1280,height:1080});",
  "await page.setViewportSize({width:view.width,height:view.height});await settle(page);const restored=await probe(page);",
  'expect(repeat.preservedScene).toEqual(value.preservedScene);expect(repeat.palmBuffers).toEqual(value.palmBuffers);',
  'expect(await harness.leakedAfterUnmount(page)).toEqual([]);',
  '__faceDraws.get(c).disposeCount)).toBe(1);',
  "expect(item.disposeCount,'material disposed '+item.name).toBeGreaterThan(0);",
  "const s=observed.stage,b=observed.canvas,p=value.palmProjection;",
  "file=prefix+'-palm.png'",
  "{id:'adult-wide',age:'adult',width:1280,height:1080,pose:8,contrast:false,head:false}",
  "{id:'child-narrow',age:'child',width:320,height:840,pose:4,contrast:false,head:false}",
  "{id:'infant-narrow-contrast',age:'infant',width:320,height:840,pose:8,contrast:true,head:false}",
 ],
 'patient-wrist-contract.cjs':[
  "assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preserved outside exact palm symmetry fields');",
  "['pose','state','contact','supportInspection','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes','camera','selectedHand','head','faceProjection','neckProjection','skull','preservedFace','cheekContext','palmProjection']",
  "assert.notEqual(b.index.hash,a.index.hash,'each present right-handed palm changes its diagonal indices');",
  "assert.deepEqual(names,expected,'only exact named palm symmetry targets');",
  "assert.equal(part.finiteUnitNormals,true,'all scoped normals finite and unit');",
  "assert.equal(b.path[j].x,p.x,'crease path x exact');assert.equal(b.path[j].z,p.z,'crease path z exact');",
  "for(const key of ['geometries','materials','programs','calls','triangles'])",
  "assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');",
 ],
 'run-face-browser.cjs':[
  "if(JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Palm comparison framing changed '+id);",
  "if(!pair[0].contrast&&changedPixels===0)throw Error('Palm shading had no visible effect '+id);",
  "if(!pair[0].contrast&&palmChangedPixels===0)throw Error('Palm detail had no visible effect '+id);",
  "for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)",
  "for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)",
  'r.stats.unexpected || r.stats.skipped || r.stats.flaky',
  "!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture)))",
  "images.filter(p=>p.endsWith('-palm.png')).length!==expectedEvidence"
 ],
 'playwright-face.config.cjs':["testMatch:'firstresponse-face-preview.spec.ts'",'workers:1,retries:0']
};
function validate(input){for(const[file,tokens]of Object.entries(rules))for(const token of tokens)assert.ok(input[file].toString().includes(token),file+' required: '+token);}
validate(bytes);const negativeTests=[];
if(process.argv.includes('--selftest')){
 const sandbox=path.join(work,'fixture-selftest');fs.mkdirSync(sandbox,{recursive:true});
 const mutations=[
  ['broaden-palm-scope','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][0],"var isPalm=/palm$/.test(name);"],
  ['broaden-wrist-scope','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][1],"var isWrist=/wrist$/.test(name);"],
  ['normalize-metadata','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][7],'function exactUserData(o){return {}; }'],
  ['omit-unit-normal-check','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][4],''],
  ['omit-index-bounds-check','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][5],''],
  ['omit-resize','firstresponse-face-preview.spec.ts','resize={wide,restored};validateResize(value,resize,variant);','resize={wide,restored};'],
  ['omit-palm-pixel-effect','run-face-browser.cjs',rules['run-face-browser.cjs'][2],'']
 ];
 for(const[kind,name,old,next]of mutations){const saved=bytes[name],file=path.join(sandbox,name+'.saved');assert.equal(saved.toString().split(old).length,2);let rejected=false,error='';
  try{fs.writeFileSync(file,saved.toString().replace(old,next));try{validate({...bytes,[name]:fs.readFileSync(file)});}catch(e){rejected=true;error=e.message;}}
  finally{fs.writeFileSync(file,saved);assert.deepEqual(fs.readFileSync(file),saved);validate({...bytes,[name]:fs.readFileSync(file)});}
  assert.ok(rejected,kind+' must fail');negativeTests.push({kind,rejected,error,restoredAndReread:true,restoredSHA256:sha(fs.readFileSync(file))});
 }
 const contract=require('./patient-wrist-contract.cjs'),attr=()=>({count:1200,itemSize:3,normalized:false,buffer:{hash:'abcd',bytes:14400}});
 function sample(){const frame={center:[0,0,0],radius:1},original={center:[0,0,0],radius:.4,normal:[0,1,0],forward:[0,0,1],context:Array.from({length:5},()=>[0,0,0]),faceFrame:frame};return {
  supportInspection:{original,faceFrame:frame,expectedOriginal:{center:[0,0,0],radius:.4,normal:[0,1,0],forward:[0,0,1]},expectedFaceFrame:frame},
  palmBuffers:['fr-patient-right-palm','fr-patient-right-palm-crease','fr-patient-right-thumb-crease','fr-patient-right-wrist'].map(name=>{const palm=name.endsWith('-palm'),crease=name.endsWith('-crease');return {name,normal:attr(),index:palm?{hash:'abcd',bytes:600}:null,indexCount:palm?300:undefined,validIndices:palm?true:undefined,position:crease?attr():null,finitePositions:crease?true:undefined,path:crease?Array.from({length:49},()=>({x:0,y:0,z:0})):null,minLength:.99999999,maxLength:1.00000001,finiteUnitNormals:true};}),
  preservedScene:{hash:'whole-scene',bytes:4000},camera:{aspect:1.5,position:[1,2,3]},draw:{geometries:200,materials:12,programs:5,calls:150,triangles:60000},palmProjection:{total:1200,inFrame:1200,min:[-.6,-.5,.1],max:[.5,.6,.5]}
 };}
 const before=sample(),after=sample();after.palmBuffers[0].index.hash='abce';after.palmBuffers[0].normal.buffer.hash='abce';after.palmBuffers[1].path[0].y=.000001;after.palmBuffers[1].position.buffer.hash='abce';
 contract.validateMetadata(before);contract.validateMetadata(after);contract.validateNativePair(before,after,'adult-wide');contract.validateCandidateFraming(after,'adult-wide');
 const dataFile=path.join(sandbox,'native-evidence.json.saved'),saved=Buffer.from(JSON.stringify(after));
 const dataMutations=[
  ['reject-other-geometry-change',v=>v.preservedScene.hash='changed'],
  ['reject-camera-change',v=>v.camera.position[0]+=.01],
  ['reject-inspection-change',v=>v.supportInspection.original.context[0][0]=.01],
  ['reject-normal-count-change',v=>v.palmBuffers[0].normal.count--],
  ['reject-invalid-unit-normals',v=>v.palmBuffers[0].minLength=.5],
  ['reject-extra-target',v=>v.palmBuffers[0].name='fr-patient-left-palm'],
  ['reject-unchanged-palm-indices',v=>v.palmBuffers[0].index.hash='abcd'],
  ['reject-invalid-palm-indices',v=>v.palmBuffers[0].validIndices=false],
  ['reject-crease-position-count-change',v=>v.palmBuffers[1].position.count--],
  ['reject-crease-path-x-change',v=>v.palmBuffers[1].path[0].x=.01],
  ['reject-crease-path-z-change',v=>v.palmBuffers[1].path[0].z=.01],
  ['reject-material-allocation',v=>v.draw.materials++]
 ];
 for(const[kind,mutate]of dataMutations){let rejected=false,error='';try{const changed=JSON.parse(saved);mutate(changed);fs.writeFileSync(dataFile,JSON.stringify(changed));try{contract.validateNativePair(before,JSON.parse(fs.readFileSync(dataFile)),'adult-wide');}catch(e){rejected=true;error=e.message;}}
  finally{fs.writeFileSync(dataFile,saved);assert.deepEqual(fs.readFileSync(dataFile),saved);contract.validateNativePair(before,JSON.parse(fs.readFileSync(dataFile)),'adult-wide');}
  assert.ok(rejected,kind+' must fail');negativeTests.push({kind,rejected,error,restoredAndReread:true,restoredSHA256:sha(fs.readFileSync(dataFile))});
 }
}
let listing=null;
if(process.argv.includes('--list')){
 const args=[path.join(repo,'node_modules/@playwright/test/cli.js'),'test','firstresponse-face-preview.spec.ts','--config='+path.join(work,'playwright-face.config.cjs'),'--list'];
 const r=spawnSync(process.execPath,args,{cwd:repo,windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,env:{...process.env,FIRST_RESPONSE_FACE_WORK:work,FIRST_RESPONSE_FACE_REPORT:path.join(work,'audit-list-only'),FIRST_RESPONSE_FACE_SOURCE_SHA:pins['candidate.js'],FIRST_RESPONSE_FACE_CANDIDATE:path.join(work,'candidate.js')}});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/Total: 3 tests in 1 file/);for(const id of ['adult-wide','child-narrow','infant-narrow-contrast'])assert.ok(r.stdout.includes('patient palm symmetry '+id+' preview at native view'));listing={exitCode:r.status,args,stdout:r.stdout,stderr:r.stderr,browserLaunched:false};
}
for(const[name,pin]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(work,name))),pin);
const result={candidateSHA256:pins['candidate.js'],baselineSHA256:pins['before.js'],auditorSHA256:sha(fs.readFileSync(__filename)),inputs:pins,accepted:true,scope:'Right patient palm and present rescuer upper palm index/normal arrays, right patient wrist normal array, right palm/thumb crease position/normal arrays and path point heights. Exact scene outside these fields, unchanged counts, camera/contact/state/resources. Stage and palm detail share one captured frame.',negativeTests,list:listing,inputsUnchanged:true,sharedFilesWritten:0};fs.writeFileSync(path.join(work,'fixture-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({accepted:true,negativeTests:negativeTests.length,listedTests:listing?3:0}));
