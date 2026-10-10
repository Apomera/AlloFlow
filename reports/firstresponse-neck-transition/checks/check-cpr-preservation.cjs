const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=v=>crypto.createHash('sha256').update(v).digest('hex'),THREE={};
const before=fs.readFileSync(path.join(__dirname,'before.js'),'utf8'),candidate=fs.readFileSync(path.join(__dirname,'candidate.js'),'utf8');
assert.equal(sha(candidate),'38f468c92a949621adcf6eea4765c8a3aaf2626d35132996df1d17239b97a542');
new Function('exports','module',fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'),'utf8'))(THREE,{exports:THREE});
const helperPath=path.join(__dirname,'firstresponse_neck_mesh_checks.cjs'),checks=require(helperPath).createNeckMeshChecks(THREE);
const checker=fs.readFileSync(path.join(__dirname,'verify-neck.cjs'),'utf8'),start=checker.indexOf('function parameters(material)'),end=checker.indexOf('\nconst results=[];let failure=false;',start);
assert.ok(start>=0&&end>start);const fingerprint=new Function('THREE','crypto',checker.slice(start,end)+'\nreturn fingerprint;')(THREE,crypto);
let config;global.window={};function capture(code){window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(c){config=c;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};new Function(code)();return config;}
const oldConfig=capture(before),newConfig=capture(candidate),results=[];
function model(config,settings){const {age,tab}=settings,scene=new THREE.Scene(),content=config.buildScene(THREE,{scene,phase:0,dark:true,contrast:false,wantShadow:false,trim:(color,shininess)=>new THREE.MeshPhongMaterial({color,shininess:shininess??30,specular:0x6b7688}),sceneProps:{age,tab}});const sample=()=>{const clock=200000,previousNow=Date.now;Date.now=()=>clock;try{content.frame(0,{depthLab:{age,motion:'press',depth:100,lean:0},coach:{running:true,phase:'compressions',lastCompressionAt:clock,startedAt:clock,bpm:110},childHands:'two'},false);}finally{Date.now=previousNow;}scene.updateMatrixWorld(true);};sample();return{scene,content,neck:scene.getObjectByName('fr-manikin-neck'),sample,allocatedGeometries:[],allocatedMaterials:[]};}
for(const settings of [{age:'adult',tab:'depth'},{age:'infant',tab:'coach'}]){
 const oldModel=model(oldConfig,settings),newModel=model(newConfig,settings),oldValue=fingerprint(oldModel),newValue=fingerprint(newModel);
 assert.deepEqual(newValue,oldValue,'all head/hand/camera-inspection metadata and buffers outside neck remain exact at maximum compression');
 const oldCaps=checks.caps(oldModel,settings),newCaps=checks.caps(newModel,settings),oldProximal=oldCaps.find(c=>c.end==='torso'),newProximal=newCaps.find(c=>c.end==='torso');
 assert.ok(newProximal.outside<=oldProximal.outside,'proximal artificial-cap exposure must not increase relative to baseline');
 const torso=oldModel.scene.getObjectByName('fr-manikin-torso');
 assert.ok(torso.parent.scale.y<1,'requested CPR comparison actually samples a compressed chest');
 results.push({...settings,status:'passed',input:{depth:100,motion:'press',lean:0,coachPeakClock:200000,reducedMotion:false,note:'Depth100 exercises the existing internal maximum-depth clamp. A frozen lastCompressionAt exercises the actual coach compression peak.'},chestRigScale:torso.parent.scale.toArray(),chestRigPosition:torso.parent.position.toArray(),outsideNeck:oldValue,baselineCaps:oldCaps,candidateCaps:newCaps});
 checks.disposeOnce(oldModel);checks.disposeOnce(newModel);
}
const output={passed:true,checkerSHA256:sha(fs.readFileSync(__filename)),meshHelperSHA256:sha(fs.readFileSync(helperPath)),candidateSHA256:sha(candidate),beforeSHA256:sha(before),cases:2,results,scope:'Two maximum-compression regressions; complete cap-burial claims are scoped to the12 recovery cases.'};
fs.writeFileSync(path.join(__dirname,'cpr-preservation.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({passed:true,candidateSHA256:sha(candidate),results:results.map(r=>({age:r.age,tab:r.tab,baselineProximalOutside:r.baselineCaps.find(c=>c.end==='torso').outside,candidateProximalOutside:r.candidateCaps.find(c=>c.end==='torso').outside,chestRigScale:r.chestRigScale,chestRigPosition:r.chestRigPosition}))}));
