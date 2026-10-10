const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname,{expect}=require(path.join(root,'node_modules/@playwright/test'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),fixturePath=path.join(work,'firstresponse-face-preview.spec.ts'),saved=fs.readFileSync(fixturePath),fixture=saved.toString();
function contextFor(text){const start=text.indexOf('function validNose('),end=text.indexOf('\nfor(const view of views)test(',start);if(start<0||end<start)throw Error('Matcher anchors');const context={expect};vm.createContext(context);vm.runInContext(text.slice(start,end).replace(/:any\b|:string\b/g,''),context);return context;}
const context=contextFor(fixture),clone=x=>JSON.parse(JSON.stringify(x));
const normalMaterial={type:'MeshPhongMaterial',color:0xc8a385,specular:0x060606,shininess:12};
const before={contrast:false,headMaterial:normalMaterial,noseMaterial:{name:'fr-manikin-nose',visible:true,material:normalMaterial,separateFromHead:false,strength:null,hooks:{compile:'default',cacheKey:'default'}},preservedScene:{hash:'all geometry and other finishes exact',bytes:1000},draw:{geometries:180,programs:3,calls:143,triangles:12345,materials:23}};
for(const key of ['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','preservedFace','cheekContext','eyeMeshes','torsoMesh','faceProjection','head'])before[key]={retained:key};
const after=clone(before),contrastBefore=clone(before);contrastBefore.contrast=true;contrastBefore.headMaterial={type:'MeshBasicMaterial',color:0xffffff};contrastBefore.noseMaterial.material=clone(contrastBefore.headMaterial);
const contrastAfter=clone(contrastBefore);contrastAfter.draw.programs++;contrastAfter.draw.materials++;
contrastAfter.noseMaterial={name:'fr-manikin-nose',visible:true,separateFromHead:true,strength:1,material:{...contrastAfter.headMaterial,name:'fr-patient-nose-skin',userData:{frNoseContourStrength:{value:1}}},hooks:{cacheKey:'fr-patient-nose-contrast-contours-v1',compile:['shader.uniforms.frNoseContourStrength = noseContourStrength','frNoseSurfaceNormal = normalize(normalMatrix * normal)','frNoseViewPosition = -mvPosition.xyz','abs(dot(normalize(frNoseSurfaceNormal), normalize(frNoseViewPosition)))','mix(0.08, 1.0, smoothstep(0.20, 0.45, frNoseFacing))','diffuseColor.rgb *= mix(1.0, frNoseContour, frNoseContourStrength)'].join('\n')}};
for(const [a,b]of [[after,before],[contrastAfter,contrastBefore]]){context.validNose(b,'baseline');context.validNose(a,'candidate');context.matching(a,b);}
const negative=[];
function rejected(name,change,contrast=true){const a=clone(contrast?contrastAfter:after),b=contrast?contrastBefore:before;change(a);let error='';try{context.validNose(a,'candidate');context.matching(a,b);}catch(e){error=e.message;}if(!error)throw Error('Accepted '+name);negative.push({name,rejected:true});}
rejected('disabled contrast uniform',v=>v.noseMaterial.strength=0);
rejected('wrong shader cache key',v=>v.noseMaterial.hooks.cacheKey='wrong');
rejected('missing normal-space shader hook',v=>v.noseMaterial.hooks.compile='shader.uniforms.frNoseContourStrength = noseContourStrength');
rejected('changed nose diffuse',v=>v.noseMaterial.material.color=0x333333);
rejected('outside scene changed',v=>v.preservedScene.hash='wrong');
rejected('camera changed',v=>v.camera.retained='wrong');
rejected('rendered triangles changed',v=>v.draw.triangles++);
rejected('extra material missing',v=>v.draw.materials--);
rejected('extra program missing',v=>v.draw.programs--);
rejected('normal mode shader added',v=>v.noseMaterial.separateFromHead=true,false);
let mutationRejected=false,restoreVerified=false;
if(process.argv.includes('--selftest')){
 const from="expect(value.preservedScene,'all geometry, metadata, transforms and other materials').toEqual(reference.preservedScene);",to="expect(value.preservedScene,'intentional failed guard').toEqual({hash:'impossible'});";
 if(fixture.split(from).length!==2)throw Error('Mutation anchor');
 try{fs.writeFileSync(fixturePath,fixture.replace(from,to));try{contextFor(fs.readFileSync(fixturePath,'utf8')).matching(after,before);}catch{mutationRejected=true;}if(!mutationRejected)throw Error('Mutated matcher passed');}
 finally{fs.writeFileSync(fixturePath,saved);restoreVerified=fs.readFileSync(fixturePath).equals(saved);if(!restoreVerified)throw Error('Restore mismatch');}
 contextFor(fs.readFileSync(fixturePath,'utf8')).matching(after,before);
}
for(const name of ['run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs']){const result=spawnSync(process.execPath,['--check',path.join(work,name)],{encoding:'utf8',windowsHide:true});if(result.status!==0)throw Error(result.stdout+result.stderr);}
const baselineSHA=sha(fs.readFileSync(path.join(work,'before.js'))),candidateSHA=sha(fs.readFileSync(path.join(work,'candidate.js')));
const result=spawnSync(process.execPath,[path.join(root,'node_modules/@playwright/test/cli.js'),'test','firstresponse-face-preview.spec.ts','--list','--config='+path.join(work,'playwright-face.config.cjs')],{cwd:root,encoding:'utf8',windowsHide:true,env:{...process.env,FIRST_RESPONSE_FACE_WORK:work,FIRST_RESPONSE_FACE_REPORT:path.join(work,'list-only'),FIRST_RESPONSE_FACE_SOURCE_SHA:candidateSHA,FIRST_RESPONSE_FACE_CANDIDATE:path.join(work,'candidate.js')}});
if(result.status!==0||!/Total: 3 tests/.test(result.stdout))throw Error(result.stdout+result.stderr);
const report={passed:true,browserLaunched:false,baselineSHA,candidateSHA,fixtureSHA256:sha(saved),checkerSHA256:sha(fs.readFileSync(__filename)),syntaxFiles:4,listedWorkflows:3,scope:'contrast nose material and shader only',negative,mutationRejected,restoreVerified,list:{status:result.status,stdout:result.stdout,stderr:result.stderr}};
fs.writeFileSync(path.join(work,'fixture-contract-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
