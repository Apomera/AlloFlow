const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const work=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',sha=v=>crypto.createHash('sha256').update(v).digest('hex'),THREE={};
const before=fs.readFileSync(path.join(work,'before.js'),'utf8'),candidate=fs.readFileSync(path.join(work,'candidate.js'),'utf8');
assert.equal(sha(before),'38f468c92a949621adcf6eea4765c8a3aaf2626d35132996df1d17239b97a542');assert.equal(sha(candidate),'0cc79f45f9a57ce3c4f1d5fa674b56f462a2418c4b253dbc648557b37a6b2639');
const paths=[__filename,path.join(work,'before.js'),path.join(work,'candidate.js'),path.join(work,'verify-collar.cjs'),path.join(work,'firstresponse_collar_mesh_checks.cjs'),path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs')];
const inputHashes=Object.fromEntries(paths.map(file=>[file,sha(fs.readFileSync(file))]));
new Function('exports','module',fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'),'utf8'))(THREE,{exports:THREE});
const neck=require(path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs')).createNeckMeshChecks(THREE),collar=require('./firstresponse_collar_mesh_checks.cjs').createCollarMeshChecks(THREE);
const checker=fs.readFileSync(path.join(work,'verify-collar.cjs'),'utf8'),start=checker.indexOf('function material(m)'),end=checker.indexOf('\nfunction selftest(',start);assert.ok(start>=0&&end>start);
const fingerprint=new Function('THREE','crypto',checker.slice(start,end)+'\nreturn fingerprint;')(THREE,crypto);
global.window={};function capture(source){let config;window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(value){config=value;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};new Function(source)();return config;}
const oldConfig=capture(before),newConfig=capture(candidate),results=[];
function model(config,settings){const {age,tab}=settings,scene=new THREE.Scene(),content=config.buildScene(THREE,{scene,phase:0,dark:true,contrast:false,wantShadow:false,trim:(color,shininess)=>new THREE.MeshPhongMaterial({color,shininess:shininess??30,specular:0x6b7688}),sceneProps:{age,tab}});
  const sample=()=>{const clock=200000,previous=Date.now;Date.now=()=>clock;try{content.frame(0,{depthLab:{age,motion:'press',depth:100,lean:0},coach:{running:true,phase:'compressions',lastCompressionAt:clock,startedAt:clock,bpm:110},childHands:'two'},false);}finally{Date.now=previous;}scene.updateMatrixWorld(true);};sample();return{scene,content,neck:scene.getObjectByName('fr-manikin-neck'),sample,allocatedGeometries:[],allocatedMaterials:[]};}
for(const settings of [{age:'adult',tab:'depth'},{age:'infant',tab:'coach'}]){
  const a=model(oldConfig,settings),b=model(newConfig,settings);
  try{const outside=fingerprint(a);assert.deepEqual(fingerprint(b),outside,'all geometry, head/hand transforms and scene metadata outside torso remain exact at peak compression');
    const baselineCaps=neck.caps(a,settings),candidateCaps=neck.caps(b,settings),baselineSide=collar.coveredSide(a,settings,false),candidateSide=collar.coveredSide(b,settings,false);
    for(let i=0;i<baselineCaps.length;i++)assert.ok(candidateCaps[i].outside<=baselineCaps[i].outside,'actual neck cap exposure does not increase');
    assert.equal(candidateSide.samples,baselineSide.samples);assert.ok(candidateSide.outside<=baselineSide.outside,'covered neck-side exposure does not increase');
    const torso=a.scene.getObjectByName('fr-manikin-torso');assert.ok(torso.parent.scale.y<1,'probe actually exercises chest compression');
    results.push({...settings,status:'passed',input:{depth:100,motion:'press',lean:0,coachPeakClock:200000,reducedMotion:false,note:'Depth100 exercises the internal maximum clamp; frozen lastCompressionAt samples actual coach peak.'},chestRigScale:torso.parent.scale.toArray(),chestRigPosition:torso.parent.position.toArray(),outsideTorso:outside,baselineCaps,candidateCaps,baselineSide,candidateSide});
  }finally{neck.disposeOnce(a);neck.disposeOnce(b);}
}
for(const[file,hash]of Object.entries(inputHashes))assert.equal(sha(fs.readFileSync(file)),hash,'all CPR probe inputs remain pinned');
const output={passed:true,cases:2,inputHashes,beforeSHA256:sha(before),candidateSHA256:sha(candidate),results,scope:'Two maximum-compression regression checks. Complete cap and covered-side burial is claimed only for the12 recovery cases.'};
fs.writeFileSync(path.join(work,'cpr-preservation.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({passed:true,cases:2,results:results.map(r=>({age:r.age,tab:r.tab,baselineCapOutside:r.baselineCaps.find(c=>c.end==='torso').outside,candidateCapOutside:r.candidateCaps.find(c=>c.end==='torso').outside,baselineSideOutside:r.baselineSide.outside,candidateSideOutside:r.candidateSide.outside,chestRigScale:r.chestRigScale}))}));
