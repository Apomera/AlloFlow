const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,destination=path.resolve(work,'../firstresponse-patient-wrist-fold-diagnostic-work'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const finalSHA='147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
const names=['firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','candidate.js','before.js','delta.json','audit-preview-fixture.cjs'];
const original=Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(work,name))]));
assert.equal(sha(original['candidate.js']),finalSHA,'frozen fold-preserving candidate');
assert.equal(JSON.parse(original['delta.json']).afterSHA256,finalSHA);
const old="{id:'adult-wide',age:'adult',width:1280,height:1080,pose:5,contrast:false,head:false}",next=old.replace('pose:5','pose:8');
assert.equal(original['firstresponse-face-preview.spec.ts'].toString().split(old).length,2,'exact one existing adult view');
const expected=Buffer.from(original['firstresponse-face-preview.spec.ts'].toString().replace(old,next));
function validate(input){for(const name of names)assert.deepEqual(input[name],name==='firstresponse-face-preview.spec.ts'?expected:original[name],'only the adult pose differs: '+name);}
if(fs.existsSync(destination))throw Error('Diagnostic directory already exists; preserve evidence');
fs.mkdirSync(destination);
for(const name of names)fs.writeFileSync(path.join(destination,name),name==='firstresponse-face-preview.spec.ts'?expected:original[name]);
const read=()=>Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(destination,name))]));
validate(read());
const selftest=[];
if(process.argv.includes('--selftest')){
 const target=path.join(destination,'derivation-selftest.saved'),saved=expected;
 let rejected=false,error='';
 try{fs.writeFileSync(target,saved.toString().replace('pose:8,contrast:false','pose:7,contrast:false'));try{validate({...read(),'firstresponse-face-preview.spec.ts':fs.readFileSync(target)});}catch(e){rejected=true;error=e.message;}}
 finally{fs.writeFileSync(target,saved);assert.deepEqual(fs.readFileSync(target),saved);validate({...read(),'firstresponse-face-preview.spec.ts':fs.readFileSync(target)});}
 assert.ok(rejected,'wrong pose mutation rejected');selftest.push({kind:'unapproved-fixture-edit',rejected,error,restoredAndReread:true,restoredSHA256:sha(fs.readFileSync(target))});
}
for(const name of names)assert.deepEqual(fs.readFileSync(path.join(work,name)),original[name],'primary inputs preserved');
const report={sourceSHA256:finalSHA,baselineSHA256:sha(original['before.js']),primaryWork:work,diagnosticWork:destination,derivation:{file:'firstresponse-face-preview.spec.ts',old,next,edits:1},primaryInputs:Object.fromEntries(names.map(name=>[name,sha(original[name])])),diagnosticInputs:Object.fromEntries(names.map(name=>[name,sha(fs.readFileSync(path.join(destination,name)))])),selftest,primaryInputsUnchanged:true,sharedFilesWritten:0,scope:'Targeted adult recovery pose8 diagnostic. Existing adult-wide ID and Supporting hand close-up are retained to use the unchanged wide-view assertions. This is separate from the three primary rendered comparisons.'};
fs.writeFileSync(path.join(destination,'diagnostic-derivation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({prepared:true,sourceSHA256:finalSHA,destination,selftest:selftest.length}));
