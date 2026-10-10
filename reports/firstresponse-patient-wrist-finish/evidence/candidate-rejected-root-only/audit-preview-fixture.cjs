const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','candidate.js','before.js','delta.json'];
const bytes=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(work,n))])),pins=Object.fromEntries(Object.entries(bytes).map(([n,b])=>[n,sha(b)]));
const delta=JSON.parse(bytes['delta.json']);assert.equal(pins['before.js'],delta.beforeSHA256);assert.equal(pins['candidate.js'],delta.afterSHA256);
const rules={
 'firstresponse-face-preview.spec.ts':[
  "if(o.name!=='fr-patient-left-wrist'&&o.name!=='fr-patient-right-wrist')return descriptor;",
  "descriptor.attributes.normal.buffer={hash:'[allowed patient wrist normal]',bytes:a.array.byteLength};",
  "if(!isFinite(length)||Math.abs(length-1)>1e-5)throw Error('Invalid wrist unit normal '+o.name);",
  'geometry:o.geometry?wristGeometry(o):null',
  'function exactUserData(o){return JSON.parse(JSON.stringify(o.userData));}',
  'validateCandidateFraming(value,view.id);if(variant===\'baseline\')reference=value;else validateNativePair(reference,value,view.id);',
  "validateNativePair(referenceResize.wide,wide,'adult-wide');",
  "await page.setViewportSize({width:1280,height:1080});",
  "await page.setViewportSize({width:view.width,height:view.height});await settle(page);const restored=await probe(page);",
  'resize={wide,restored};validateResize(value,resize,variant);',
  "await page.getByRole('button',{name:view.head?'Head close-up':'Supporting hand close-up',exact:true}).click();",
  'expect(repeat.preservedScene).toEqual(value.preservedScene);expect(repeat.wristBuffers).toEqual(value.wristBuffers);expect(repeat.supportInspection).toEqual(value.supportInspection);',
  'expect(await harness.leakedAfterUnmount(page)).toEqual([]);',
  '__faceDraws.get(c).disposeCount)).toBe(1);',
  "item.name==='fr-patient-arm-skin'",
  'const s=observed.stage,b=observed.canvas,p=value.wristProjection;',
  "file=prefix+'-wrist.png'",
  "test.describe.configure({retries:0,timeout:450000});"
 ],
 'patient-wrist-contract.cjs':[
  "assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preserved except exact two wrist normal arrays');",
  "['pose','state','contact','supportInspection','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes','camera','selectedHand','head','faceProjection','neckProjection','skull','preservedFace','cheekContext','wristProjection']",
  "assert.notEqual(b.buffer.hash,a.buffer.hash,'each wrist has a deliberate normal change');",
  "assert.deepEqual(buffers.map(b=>b.name),wrists,'exact two wrist normal buffers');",
  "assert.equal(wrist.finiteUnitNormals,true,'all wrist normals finite and unit');",
  "assert.equal(wrist.normal.buffer.bytes,wrist.normal.count*3*4,'normal buffer byte count');",
  "for(const key of ['geometries','materials','programs','calls','triangles'])",
  "assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');",
  "assert.deepEqual(original.faceFrame,info.faceFrame,'exact duplicated face frame');",
  "for(const name of ['head','selectedHand'])"
 ],
 'run-face-browser.cjs':[
  "if(JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Wrist comparison framing changed '+id);",
  "if(!pair[0].contrast&&changedPixels===0)throw Error('Wrist shading had no visible effect '+id);",
  "if(!pair[0].contrast&&wristChangedPixels===0)throw Error('Wrist detail had no visible effect '+id);",
  "for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)",
  "for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)",
  'r.stats.unexpected || r.stats.skipped || r.stats.flaky',
  "!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture)))",
  "images.filter(p=>p.endsWith('-wrist.png')).length!==expectedEvidence"
 ],
 'playwright-face.config.cjs':["testMatch:'firstresponse-face-preview.spec.ts'",'workers:1,retries:0']
};
function validate(input){for(const[file,tokens]of Object.entries(rules))for(const token of tokens)assert.ok(input[file].toString().includes(token),file+' required: '+token);}
validate(bytes);const negativeTests=[];
if(process.argv.includes('--selftest')){
 const sandbox=path.join(work,'fixture-selftest');fs.mkdirSync(sandbox,{recursive:true});
 const mutations=[
  ['broaden-normal-exemption','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][0],"if(!/^fr-patient-/.test(o.name))return descriptor;"],
  ['normalize-metadata','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][4],'function exactUserData(o){return {}; }'],
  ['omit-unit-normal-check','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][2],''],
  ['omit-resize','firstresponse-face-preview.spec.ts','resize={wide,restored};validateResize(value,resize,variant);','resize={wide,restored};'],
  ['omit-wrist-pixel-effect','run-face-browser.cjs',rules['run-face-browser.cjs'][2],'']
 ];
 for(const[kind,name,old,next]of mutations){const saved=bytes[name],file=path.join(sandbox,name+'.saved');assert.equal(saved.toString().split(old).length,2);let rejected=false,error='';
  try{fs.writeFileSync(file,saved.toString().replace(old,next));try{validate({...bytes,[name]:fs.readFileSync(file)});}catch(e){rejected=true;error=e.message;}}
  finally{fs.writeFileSync(file,saved);assert.deepEqual(fs.readFileSync(file),saved);validate({...bytes,[name]:fs.readFileSync(file)});}
  assert.ok(rejected,kind+' must fail');negativeTests.push({kind,rejected,error,restoredAndReread:true,restoredSHA256:sha(fs.readFileSync(file))});
 }
 const contract=require('./patient-wrist-contract.cjs');
 function sample(){const frame={center:[0,0,0],radius:1},original={center:[0,0,0],radius:.4,normal:[0,1,0],forward:[0,0,1],context:Array.from({length:5},()=>[0,0,0]),faceFrame:frame};return {
  supportInspection:{original,faceFrame:frame,expectedOriginal:{center:[0,0,0],radius:.4,normal:[0,1,0],forward:[0,0,1]},expectedFaceFrame:frame},
  wristBuffers:['fr-patient-left-wrist','fr-patient-right-wrist'].map(name=>({name,normal:{count:1200,itemSize:3,normalized:false,buffer:{hash:'abcd',bytes:14400}},minLength:.99999999,maxLength:1.00000001,finiteUnitNormals:true})),
  preservedScene:{hash:'whole-scene',bytes:4000},camera:{aspect:1.5,position:[1,2,3]},draw:{geometries:200,materials:12,programs:5,calls:150,triangles:60000},wristProjection:{total:1200,inFrame:1200,min:[-.6,-.5,.1],max:[.5,.6,.5]}
 };}
 const before=sample(),after=sample();after.wristBuffers.forEach(w=>w.normal.buffer.hash='abce');contract.validateMetadata(before);contract.validateMetadata(after);contract.validateNativePair(before,after,'adult-wide');contract.validateCandidateFraming(after,'adult-wide');
 const dataFile=path.join(sandbox,'native-evidence.json.saved'),saved=Buffer.from(JSON.stringify(after));
 const dataMutations=[
  ['reject-other-geometry-change',v=>v.preservedScene.hash='changed'],
  ['reject-camera-change',v=>v.camera.position[0]+=.01],
  ['reject-inspection-change',v=>v.supportInspection.original.context[0][0]=.01],
  ['reject-normal-count-change',v=>v.wristBuffers[0].normal.count--],
  ['reject-invalid-unit-normals',v=>v.wristBuffers[0].minLength=.5],
  ['reject-extra-normal-target',v=>v.wristBuffers[0].name='fr-patient-left-forearm'],
  ['reject-unchanged-wrist-normals',v=>v.wristBuffers[1].normal.buffer.hash='abcd'],
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
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/Total: 3 tests in 1 file/);for(const id of ['adult-wide','child-narrow','infant-narrow-contrast'])assert.ok(r.stdout.includes('patient wrist finish '+id+' preview at native view'));listing={exitCode:r.status,args,stdout:r.stdout,stderr:r.stderr,browserLaunched:false};
}
for(const[name,pin]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(work,name))),pin);
const result={candidateSHA256:pins['candidate.js'],baselineSHA256:pins['before.js'],auditorSHA256:sha(fs.readFileSync(__filename)),inputs:pins,accepted:true,scope:'Only normal arrays of exact left/right patient wrist meshes may differ. All positions, indices, UVs, materials, shaders, scene transforms, metadata, contacts, camera projections, state and resource counts stay exact. Stage/wrist crops share one captured frame. Contrast contour pixels may change because the unchanged shader consumes normals.',negativeTests,list:listing,inputsUnchanged:true,sharedFilesWritten:0};fs.writeFileSync(path.join(work,'fixture-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({accepted:true,negativeTests:negativeTests.length,listedTests:listing?3:0}));
