const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {verify,walk,sha}=require('./verify-recovery-native-package.cjs'),work=__dirname,original=path.resolve(work,'../firstresponse-patient-wrist-fold-diagnostic-work'),directory=path.join(work,'recovery-fold-native-diagnostic');
assert.deepEqual(process.argv.slice(2),['--selftest'],'Package with deliberate rejection checks');assert.ok(!fs.existsSync(directory),'Preserve prior recovery package');
const originals=Object.fromEntries(walk(original).map(file=>[path.relative(original,file).split(path.sep).join('/'),sha(fs.readFileSync(file))]));
for(const required of ['diagnostic-derivation.json','recovery-visual-review.json','recovery-root-visual-review.json','fixture-audit.json','native-adult-recovery-fold/summary.json'])assert.ok(originals[required],'Completed recovery evidence missing '+required);
assert.ok(!Object.keys(originals).some(name=>name.split('/').includes('node_modules')),'Do not copy dependencies');
fs.mkdirSync(directory);
for(const[name,pin]of Object.entries(originals)){const source=path.join(original,name),target=path.join(directory,name);assert.equal(sha(fs.readFileSync(source)),pin);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);assert.equal(sha(fs.readFileSync(target)),pin);}
const manifest={originalWork:original,sourceSHA256:sha(fs.readFileSync(path.join(work,'candidate.js'))),beforeSHA256:sha(fs.readFileSync(path.join(work,'before.js'))),files:{...originals},packagerSHA256:sha(fs.readFileSync(__filename)),verifierSHA256:sha(fs.readFileSync(path.join(work,'verify-recovery-native-package.cjs'))),sharedWrites:0,selftest:{ran:false}};
const manifestPath=path.join(directory,'diagnostic-package.json'),save=()=>fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');save();verify(directory,false);
const negative=[];
for(const kind of ['recovery-image-pin','recovery-unaccepted-review']){
  const file=path.join(directory,kind==='recovery-image-pin'?'native-adult-recovery-fold/adult-wide-candidate-wrist.png':'recovery-visual-review.json'),saved=fs.readFileSync(file),savedManifest=fs.readFileSync(manifestPath);let rejected=false,error='';
  try{if(kind==='recovery-image-pin')fs.appendFileSync(file,'deliberate private pin mutation');else{const review=JSON.parse(saved);review.accepted=false;fs.writeFileSync(file,JSON.stringify(review));manifest.files['recovery-visual-review.json']=sha(fs.readFileSync(file));save();}try{verify(directory,false);}catch(e){rejected=true;error=e.message;}}
  finally{fs.writeFileSync(file,saved);fs.writeFileSync(manifestPath,savedManifest);assert.deepEqual(fs.readFileSync(file),saved);assert.deepEqual(fs.readFileSync(manifestPath),savedManifest);manifest.files['recovery-visual-review.json']=originals['recovery-visual-review.json'];verify(directory,false);}
  assert.ok(rejected,kind+' must fail');negative.push({kind,rejected,error,restoredAndReread:true,restoredSHA256:sha(saved)});
}
for(const[name,pin]of Object.entries(originals)){assert.equal(sha(fs.readFileSync(path.join(original,name))),pin,'Original recovery evidence preserved');assert.equal(sha(fs.readFileSync(path.join(directory,name))),pin,'Copied recovery evidence preserved');}
manifest.selftest={ran:true,negative,restoredInventory:true};save();const result=verify(directory);console.log(JSON.stringify({packaged:true,directory,...result,sharedWrites:0}));
