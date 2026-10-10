const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const names=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','support-frame-contract.cjs','candidate.js','before.js','delta.json'];
const bytes=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(work,n))])),pins=Object.fromEntries(Object.entries(bytes).map(([n,b])=>[n,sha(b)]));
const delta=JSON.parse(bytes['delta.json']);assert.equal(pins['before.js'],delta.beforeSHA256);assert.equal(pins['candidate.js'],delta.afterSHA256);
const rules={
 'firstresponse-face-preview.spec.ts':[
  'geometry:o.geometry?exactGeometry(o.geometry):null',
  "if(o.name==='fr-patient-right-hand'&&data.inspection)delete data.inspection.faceFrame;",
  'validateNativePair(reference,value,view.id);validateCandidateFraming(value,view.id);',
  "validateNativePair(referenceResize.wide,wide,'adult-wide');",
  "await page.setViewportSize({width:1280,height:1080});",
  "await page.setViewportSize({width:view.width,height:view.height});await settle(page);const restored=await probe(page);",
  'resize={wide,restored};validateResize(value,resize,variant);',
  "await page.getByRole('button',{name:view.head?'Head close-up':'Supporting hand close-up',exact:true}).click();",
  'expect(repeat.preservedScene).toEqual(value.preservedScene);',
  'expect(await harness.leakedAfterUnmount(page)).toEqual([]);',
  '__faceDraws.get(c).disposeCount)).toBe(1);',
  "test.describe.configure({retries:0,timeout:450000});"
 ],
 'support-frame-contract.cjs':[
  "assert.deepEqual(value.preservedScene,reference.preservedScene,'complete scene preservation');",
  "assert.deepEqual(value.supportInspection.original,reference.supportInspection.original,'original support metadata preserved');",
  "['pose','state','contact','neckMesh','neckBounds','skullGeometry','torsoMesh','contrast','headMaterial','noseMaterial','noseMeshes']",
  "for(const name of ['head','selectedHand'])",
  "assert.equal(p.inFrame,p.total,name+' complete');",
  "value.head.max[0]-value.head.min[0]>1.2",
  "value.selectedHand.max[0]-value.selectedHand.min[0]>.6",
  "n>-.94",'n<.94',
  "for(const key of ['geometries','materials','programs'])",
  "for(const key of ['calls','triangles'])assert.equal(value.draw[key],reference.draw[key],'wide '+key+' exact');",
  "assert.deepEqual(resize.restored.camera,value.camera,'restored narrow camera exact');",
  "vectorNear(info.faceFrame.center,info.expectedFaceFrame.center,'full head frame center');",
  "near(info.faceFrame.radius,info.expectedFaceFrame.radius,'full head frame radius');"
 ],
 'run-face-browser.cjs':[
  "if(id==='adult-wide'&&changedPixels!==0)throw Error('Wide stage pixels changed');",
  "if(id!=='adult-wide'&&changedPixels===0)throw Error('Narrow framing had no visible effect');",
  "for(const p of otherCopies)if(sha(fs.readFileSync(p))!==baselineSHA)",
  "for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(p))!==h)",
  'r.stats.unexpected || r.stats.skipped || r.stats.flaky',
  "!e.detail.proof.sameCapturedFrame||e.detail.proof.sourceSHA256!==sha(fs.readFileSync(path.join(report,e.capture)))",
  "images.filter(p=>p.endsWith('-face.png')).length!==expectedEvidence"
 ],
 'playwright-face.config.cjs':["testMatch:'firstresponse-face-preview.spec.ts'",'workers:1,retries:0']
};
function validate(input){for(const[file,tokens]of Object.entries(rules))for(const token of tokens)assert.ok(input[file].toString().includes(token),file+' required: '+token);}
validate(bytes);const negativeTests=[];
if(process.argv.includes('--selftest')){
 const sandbox=path.join(work,'fixture-selftest');fs.mkdirSync(sandbox,{recursive:true});
 const mutations=[['omit-head-projection','support-frame-contract.cjs',"for(const name of ['head','selectedHand'])","for(const name of ['selectedHand'])"],['omit-preserved-scene','support-frame-contract.cjs',rules['support-frame-contract.cjs'][0],''],['allow-wide-pixels','run-face-browser.cjs',rules['run-face-browser.cjs'][0],''],['omit-resize','firstresponse-face-preview.spec.ts','resize={wide,restored};validateResize(value,resize,variant);','resize={wide,restored};'],['allow-tiny-head','support-frame-contract.cjs','value.head.max[0]-value.head.min[0]>1.2','value.head.max[0]-value.head.min[0]>0']];
 for(const[kind,name,old,next]of mutations){const saved=bytes[name],file=path.join(sandbox,name+'.saved');assert.equal(saved.toString().split(old).length,2);let rejected=false,error='';
  try{fs.writeFileSync(file,saved.toString().replace(old,next));try{validate({...bytes,[name]:fs.readFileSync(file)});}catch(e){rejected=true;error=e.message;}}
  finally{fs.writeFileSync(file,saved);assert.deepEqual(fs.readFileSync(file),saved);validate({...bytes,[name]:fs.readFileSync(file)});}
  assert.ok(rejected,kind+' must fail');negativeTests.push({kind,rejected,error,restoredAndReread:true,restoredSHA256:sha(fs.readFileSync(file))});
 }
}
let listing=null;
if(process.argv.includes('--list')){
 const args=[path.join(repo,'node_modules/@playwright/test/cli.js'),'test','firstresponse-face-preview.spec.ts','--config='+path.join(work,'playwright-face.config.cjs'),'--list'];
 const r=spawnSync(process.execPath,args,{cwd:repo,windowsHide:true,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,env:{...process.env,FIRST_RESPONSE_FACE_WORK:work,FIRST_RESPONSE_FACE_REPORT:path.join(work,'audit-list-only'),FIRST_RESPONSE_FACE_SOURCE_SHA:pins['candidate.js'],FIRST_RESPONSE_FACE_CANDIDATE:path.join(work,'candidate.js')}});
 assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/Total: 3 tests in 1 file/);for(const id of ['adult-wide','child-narrow','infant-narrow-contrast'])assert.ok(r.stdout.includes('support frame '+id+' preview at native view'));listing={exitCode:r.status,args,stdout:r.stdout,stderr:r.stderr,browserLaunched:false};
}
for(const[name,pin]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(work,name))),pin);
const result={candidateSHA256:pins['candidate.js'],baselineSHA256:pins['before.js'],auditorSHA256:sha(fs.readFileSync(__filename)),inputs:pins,accepted:true,scope:'All geometry/materials/poses/contact/state preserved. Original metadata exact; only faceFrame added. Narrow camera changes; whole head/hand fit. Wide pixels/camera exact. Resize preserves resources and restored view. Narrow visible draw counts may change through culling.',negativeTests,list:listing,inputsUnchanged:true,sharedFilesWritten:0};fs.writeFileSync(path.join(work,'fixture-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({accepted:true,negativeTests:negativeTests.length,listedTests:listing?3:0}));
