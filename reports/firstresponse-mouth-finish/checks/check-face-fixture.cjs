const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname,{expect}=require(path.join(root,'node_modules/@playwright/test'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),fixturePath=path.join(work,'firstresponse-face-preview.spec.ts'),saved=fs.readFileSync(fixturePath),fixture=saved.toString();
for(const name of ['run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs']){const r=spawnSync(process.execPath,['--check',path.join(work,name)],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(name+' '+r.stdout+r.stderr);}
const start=fixture.indexOf('function validLips('),end=fixture.indexOf('\nfor(const view of views)test(',start);if(start<0||end<start)throw Error('Matcher extraction anchors');
function contextFor(source){const context={expect};vm.createContext(context);vm.runInContext(source.replace(/:any\b|:string\b/g,''),context);return context;}
const source=fixture.slice(start,end),context=contextFor(source),clone=x=>JSON.parse(JSON.stringify(x));
function lips(contrast,specular){return ['lower','upper'].map(part=>({name:'fr-manikin-'+part+'-lip',visible:true,material:contrast?{type:'MeshBasicMaterial',color:0xffffff}:{type:'MeshPhongMaterial',color:0x947872,specular,shininess:5}}));}
const before={contrast:false,lipMaterials:lips(false,0x25313b),preservedScene:{hash:'all geometry,metadata,transforms and other materials',bytes:1000},draw:{geometries:180,programs:3,calls:143,triangles:12345}};
for(const key of ['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','preservedFace','cheekContext','eyeMeshes','torsoMesh','faceProjection','head'])before[key]={retained:key};
const after=clone(before);after.lipMaterials=lips(false,0x060606);
const contrastBefore=clone(before);contrastBefore.contrast=true;contrastBefore.lipMaterials=lips(true);const contrastAfter=clone(contrastBefore);
context.validLips(before,'baseline');context.validLips(after,'candidate');context.matching(after,before);context.validLips(contrastBefore,'baseline');context.validLips(contrastAfter,'candidate');context.matching(contrastAfter,contrastBefore);
const negative=[];
function rejected(name,change,contrast=false){const value=clone(contrast?contrastAfter:after),reference=contrast?contrastBefore:before;change(value);let error='';try{context.validLips(value,'candidate');context.matching(value,reference);}catch(e){error=e.message;}if(!error)throw Error('Mutation accepted '+name);negative.push({name,rejected:true});}
rejected('normal specular unchanged',x=>{x.lipMaterials[0].material.specular=0x25313b;});
rejected('lip diffuse altered',x=>{x.lipMaterials[0].material.color++;});
rejected('lip gloss altered',x=>{x.lipMaterials[0].material.shininess++;});
rejected('outside scene altered',x=>{x.preservedScene.hash='mutation';});
rejected('camera altered',x=>{x.camera.retained='mutation';});
rejected('rendered triangle count altered',x=>{x.draw.triangles++;});
rejected('rendered draw count altered',x=>{x.draw.calls++;});
rejected('supporting hand altered',x=>{x.selectedHand.retained='mutation';});
rejected('contrast material altered',x=>{x.lipMaterials[0].material.color--;},true);
let mutationRejected=false,restoreVerified=false;
if(process.argv.includes('--selftest')){
  const changed=fixture.replace("expect(value.preservedScene,'all scene geometry, materials except declared lip specular, transforms and metadata').toEqual(reference.preservedScene);","expect(value.preservedScene,'mutation rejects otherwise accepted scene').toEqual({hash:'deliberately impossible'});");if(changed===fixture)throw Error('Mutation anchor');
  try{fs.writeFileSync(fixturePath,changed);const reread=fs.readFileSync(fixturePath,'utf8'),s=reread.indexOf('function validLips('),e=reread.indexOf('\nfor(const view of views)test(',s);try{contextFor(reread.slice(s,e)).matching(after,before);}catch{mutationRejected=true;}if(!mutationRejected)throw Error('Mutated matcher still passed');}
  finally{fs.writeFileSync(fixturePath,saved);restoreVerified=fs.readFileSync(fixturePath).equals(saved);if(!restoreVerified)throw Error('Fixture restore failed');}
  const restored=fs.readFileSync(fixturePath,'utf8'),s=restored.indexOf('function validLips('),e=restored.indexOf('\nfor(const view of views)test(',s);contextFor(restored.slice(s,e)).matching(after,before);
}
const baselineSHA=sha(fs.readFileSync(path.join(work,'before.js'))),candidateSHA=sha(fs.readFileSync(path.join(work,'candidate.js'))),delta=JSON.parse(fs.readFileSync(path.join(work,'delta.json'),'utf8'));
if(delta.afterSHA256!==candidateSHA)throw Error('Candidate/delta pin mismatch');
const list=spawnSync(process.execPath,[path.join(root,'node_modules/@playwright/test/cli.js'),'test','firstresponse-face-preview.spec.ts','--list','--config='+path.join(work,'playwright-face.config.cjs')],{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,FIRST_RESPONSE_FACE_WORK:work,FIRST_RESPONSE_FACE_REPORT:path.join(work,'list-only'),FIRST_RESPONSE_FACE_SOURCE_SHA:candidateSHA,FIRST_RESPONSE_FACE_CANDIDATE:path.join(work,'candidate.js')}});
if(list.status!==0)throw Error(list.stdout+list.stderr);if(!/Total: 2 tests/.test(list.stdout))throw Error('Expected2workflows '+list.stdout);
const result={passed:true,browserLaunched:false,baselineSHA,candidateSHA,fixtureSHA256:sha(saved),checkerSHA256:sha(fs.readFileSync(__filename)),syntaxFiles:4,listedWorkflows:2,scope:'normal upper/lower lip specular only; all geometry and high contrast retained',negative,mutationRejected,restoreVerified,list:{status:list.status,stdout:list.stdout,stderr:list.stderr}};
fs.writeFileSync(path.join(work,'fixture-contract-check.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(work,'fixture-list-check.json'),JSON.stringify({exitCode:list.status,stdout:list.stdout,stderr:list.stderr,browserLaunched:false},null,2));console.log(JSON.stringify(result));
