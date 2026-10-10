const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','candidate.js','before.js','delta.json'];
const bytes=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(work,n))])),pins=Object.fromEntries(Object.entries(bytes).map(([n,b])=>[n,sha(b)]));
const delta=JSON.parse(bytes['delta.json']);assert.equal(pins['before.js'],delta.beforeSHA256);assert.equal(pins['candidate.js'],delta.afterSHA256);
const requiredNames="var fingerNames=['fr-patient-left-finger-0-surface','fr-patient-left-finger-1-surface','fr-patient-left-finger-2-surface','fr-patient-left-finger-3-surface','fr-patient-right-finger-0-surface','fr-patient-right-finger-1-surface','fr-patient-right-finger-2-surface','fr-patient-right-finger-3-surface'];";
const rules={
 'firstresponse-face-preview.spec.ts':[
  requiredNames,'if(fingerNames.indexOf(name)<0)return descriptor;',
  "if(!isFinite(length)||Math.abs(length-1)>1e-5)throw Error('Invalid scoped unit normal '+name);",
  "if(!Number.isInteger(index.getX(i))||index.getX(i)<0||index.getX(i)>=a.count)throw Error('Invalid finger index '+name);",
  "if(average.lengthSq()<1e-24)throw Error('Cancelling finger triangle normals '+name);var dot=average.normalize().dot(face);if(!isFinite(dot))throw Error('Invalid finger triangle normal '+name);minFaceDot=Math.min(minFaceDot,dot);if(dot<-1e-5)backwards.push(i/3);",
  "descriptor.attributes.normal.buffer={hash:'[allowed patient finger join normal]',bytes:a.array.byteLength};return descriptor;",
  'index:g.index?bufferHash(g.index.array):null,indexCount:g.index?g.index.count:null',
  'function exactUserData(o){return JSON.parse(JSON.stringify(o.userData));}',
  'geometry:o.geometry?fingerGeometry(o):null',
  "validateCandidateFraming(value,view.id);if(variant==='baseline')reference=value;else value.scopeComparison=validateNativePair(reference,value,view.id);",
  "validateNativePair(referenceResize.wide,wide,'adult-wide');",
  'resize={wide,restored};validateResize(value,resize,variant);',
  "await page.setViewportSize({width:1280,height:1080});",
  "await page.setViewportSize({width:view.width,height:view.height});await settle(page);const restored=await probe(page);",
  'expect(repeat.preservedScene).toEqual(value.preservedScene);expect(repeat.fingerBuffers).toEqual(value.fingerBuffers);',
  'expect(await harness.leakedAfterUnmount(page)).toEqual([]);',
  '__faceDraws.get(c).disposeCount)).toBe(1);',
  "expect(item.disposeCount,'material disposed '+item.name).toBeGreaterThan(0);",
  'const s=observed.stage,b=observed.canvas,p=value.fingerProjection;',
  "file=prefix+'-fingers.png'",
  "{id:'adult-wide',age:'adult',width:1280,height:1080,pose:8,contrast:false,head:false}",
  "{id:'child-narrow',age:'child',width:320,height:840,pose:4,contrast:false,head:false}",
  "{id:'infant-narrow-contrast',age:'infant',width:320,height:840,pose:8,contrast:true,head:false}",
 ],
 'patient-wrist-contract.cjs':[
  "assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preserved outside exact eight finger normal arrays');",
  "['pose','state','contact','supportInspection','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes','camera','selectedHand','head','faceProjection','neckProjection','skull','preservedFace','cheekContext','fingerProjection']",
  "assert.notEqual(b.normal.buffer.hash,a.normal.buffer.hash,'each patient finger has changed join normals');",
  "assert.deepEqual(buffers.map(b=>b.name),required,'only exact eight named patient finger targets');",
  "assert.equal(part.finiteUnitNormals,true,'all scoped normals finite and unit');",
  "for(const face of b.backwardsTriangles)assert.ok(a.backwardsTriangles.includes(face),'no newly reversed face shading '+a.name+' triangle '+face);",
  "assert.equal(b.triangleCount,a.triangleCount,'triangle count exact');assert.deepEqual(b.degenerateTriangles,a.degenerateTriangles,'degenerate geometry exact');",
  "for(const key of ['geometries','materials','programs','calls','triangles'])",
  "assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');",
  "assert.ok(Object.hasOwn(reference,key)&&Object.hasOwn(value,key),key+' evidence present');",
 ],
 'run-face-browser.cjs':[
  "if(JSON.stringify(pair[0].detail.clip)!==JSON.stringify(pair[1].detail.clip))throw Error('Finger comparison framing changed '+id);",
  "if(changedPixels===0)throw Error('Finger shading had no visible effect '+id);",
  "if(fingerChangedPixels===0)throw Error('Finger detail had no visible effect '+id);",
  "for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)",
  "for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)",
  'r.stats.unexpected || r.stats.skipped || r.stats.flaky',
  "!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture)))",
  "images.filter(p=>p.endsWith('-fingers.png')).length!==expectedEvidence",
  "if(outsideCropChangedPixels!==0)throw Error('Changed pixels outside finger crop '+id+': '+outsideCropChangedPixels);",
 ],
 'playwright-face.config.cjs':["testMatch:'firstresponse-face-preview.spec.ts'",'workers:1,retries:0']
};
function validate(input){for(const[file,tokens]of Object.entries(rules))for(const token of tokens)assert.ok(input[file].toString().includes(token),file+' required: '+token);}
validate(bytes);const negativeTests=[];
if(process.argv.includes('--selftest')){
 const sandbox=path.join(work,'fixture-selftest');fs.mkdirSync(sandbox,{recursive:true});
 const mutations=[
  ['broaden-finger-scope','firstresponse-face-preview.spec.ts',requiredNames,"var fingerNames=['fr-patient-right-palm'];"],
  ['omit-scope-filter','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][1],''],
  ['normalize-metadata','firstresponse-face-preview.spec.ts','function exactUserData(o){return JSON.parse(JSON.stringify(o.userData));}','function exactUserData(o){return {}; }'],
  ['omit-unit-normal-check','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][2],''],
  ['omit-index-bounds-check','firstresponse-face-preview.spec.ts',rules['firstresponse-face-preview.spec.ts'][3],''],
  ['omit-reversed-face-check','patient-wrist-contract.cjs',rules['patient-wrist-contract.cjs'][5],''],
  ['omit-resize','firstresponse-face-preview.spec.ts','resize={wide,restored};validateResize(value,resize,variant);','resize={wide,restored};'],
  ['omit-disposal','firstresponse-face-preview.spec.ts',"expect(item.disposeCount,'material disposed '+item.name).toBeGreaterThan(0);",''],
  ['omit-finger-pixel-effect','run-face-browser.cjs',rules['run-face-browser.cjs'][2],''],
  ['omit-crop-scope-check','run-face-browser.cjs',rules['run-face-browser.cjs'][8],''],
 ];
 for(const[kind,name,old,next]of mutations){const saved=bytes[name],file=path.join(sandbox,name+'.saved');assert.equal(saved.toString().split(old).length,2);let rejected=false,error='';
  try{fs.writeFileSync(file,saved.toString().replace(old,next));try{validate({...bytes,[name]:fs.readFileSync(file)});}catch(e){rejected=true;error=e.message;}}
  finally{fs.writeFileSync(file,saved);assert.deepEqual(fs.readFileSync(file),saved);validate({...bytes,[name]:fs.readFileSync(file)});}
  assert.ok(rejected,kind+' must fail');negativeTests.push({kind,rejected,error,restoredAndReread:true,restoredSHA256:sha(fs.readFileSync(file))});
 }
 const contract=require('./patient-wrist-contract.cjs'),attr=()=>({count:786,itemSize:3,normalized:false,buffer:{hash:'abcd',bytes:9432}});
 function sample(){const frame={center:[0,0,0],radius:1},original={center:[0,0,0],radius:.4,normal:[0,1,0],forward:[0,0,1],context:Array.from({length:5},()=>[0,0,0]),faceFrame:frame};return {
  supportInspection:{original,faceFrame:frame,expectedOriginal:{center:[0,0,0],radius:.4,normal:[0,1,0],forward:[0,0,1]},expectedFaceFrame:frame},
  fingerBuffers:['fr-patient-left-finger-0-surface','fr-patient-left-finger-1-surface','fr-patient-left-finger-2-surface','fr-patient-left-finger-3-surface','fr-patient-right-finger-0-surface','fr-patient-right-finger-1-surface','fr-patient-right-finger-2-surface','fr-patient-right-finger-3-surface'].map(name=>({name,normal:attr(),validIndices:true,triangleCount:1568,minFaceDot:-.01,backwardsTriangles:[35],degenerateTriangles:[],minLength:.99999999,maxLength:1.00000001,finiteUnitNormals:true})),
  preservedScene:{hash:'whole-scene',bytes:4000},camera:{aspect:1.5,position:[1,2,3]},draw:{geometries:200,materials:12,programs:5,calls:150,triangles:60000},fingerProjection:{total:1200,inFrame:1200,min:[-.6,-.5,.1],max:[.5,.6,.5]},
  pose:{counts:{meshes:100}},state:{pose:8},contact:{cheek:[.1,.2,.3]},neckMesh:{name:'neck'},neckBounds:[[0,0,0],[1,1,1]],skullGeometry:{hash:'skull'},torsoMesh:{name:'torso'},contrast:false,headMaterial:{type:'MeshPhongMaterial'},noseMaterial:{type:'MeshPhongMaterial'},noseMeshes:[],selectedHand:{total:1},head:{total:1},faceProjection:{total:1},neckProjection:{total:1},skull:{total:1},preservedFace:{total:1},cheekContext:[[0,0,0]]
 };}
 const before=sample(),after=sample();for(const finger of after.fingerBuffers)finger.normal.buffer.hash='abce';
 contract.validateMetadata(before);contract.validateMetadata(after);contract.validateNativePair(before,after,'adult-wide');contract.validateCandidateFraming(after,'adult-wide');
 const dataFile=path.join(sandbox,'native-evidence.json.saved'),saved=Buffer.from(JSON.stringify(after));
 const dataMutations=[
  ['reject-other-geometry-change',v=>v.preservedScene.hash='changed'],
  ['reject-camera-change',v=>v.camera.position[0]+=.01],
  ['reject-contact-change',v=>v.contact.cheek[0]+=.01],
  ['reject-inspection-change',v=>v.supportInspection.original.context[0][0]=.01],
  ['reject-normal-count-change',v=>v.fingerBuffers[0].normal.count--],
  ['reject-invalid-unit-normals',v=>v.fingerBuffers[0].minLength=.5],
  ['reject-extra-target',v=>v.fingerBuffers[0].name='fr-patient-right-palm'],
  ['reject-missing-target',v=>v.fingerBuffers.pop()],
  ['reject-unchanged-finger-normals',v=>v.fingerBuffers[0].normal.buffer.hash='abcd'],
  ['reject-invalid-finger-indices',v=>v.fingerBuffers[0].validIndices=false],
  ['reject-new-reversed-shading',v=>v.fingerBuffers[0].backwardsTriangles=[35,36]],
  ['reject-degenerate-geometry-change',v=>v.fingerBuffers[0].degenerateTriangles=[25]],
  ['reject-non-finite-face-alignment',v=>v.fingerBuffers[0].minFaceDot=null],
  ['reject-broader-attribute-exception',v=>v.fingerBuffers[0].position=attr()],
  ['reject-material-allocation',v=>v.draw.materials++],
  ['reject-missing-state-data',v=>delete v.state],
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
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/Total: 3 tests in 1 file/);for(const id of ['adult-wide','child-narrow','infant-narrow-contrast'])assert.ok(r.stdout.includes('patient finger joins '+id+' preview at native view'));listing={exitCode:r.status,args,stdout:r.stdout,stderr:r.stderr,browserLaunched:false};
}
for(const[name,pin]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(work,name))),pin);
const result={candidateSHA256:pins['candidate.js'],baselineSHA256:pins['before.js'],auditorSHA256:sha(fs.readFileSync(__filename)),inputs:pins,accepted:true,scope:'Exactly eight patient finger normal arrays. Exact positions, indices, geometry metadata, scene outside these normal arrays, camera/contact/state/resource counts; no newly reversed face shading. Stage and finger detail share one captured frame.',negativeTests,list:listing,inputsUnchanged:true,sharedFilesWritten:0};fs.writeFileSync(path.join(work,'fixture-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({accepted:true,negativeTests:negativeTests.length,listedTests:listing?3:0}));
