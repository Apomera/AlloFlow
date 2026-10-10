const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,target=path.join(work,'candidate-rejected-recovery-fold'),previousArchive=path.join(work,'candidate-rejected-root-only');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),read=file=>fs.readFileSync(file),json=file=>JSON.parse(read(file));
const candidateSHA256='38660be59270be0b42e34649f7c7ef62f91a804671d3469631b48b5292a35be4',baselineSHA256='69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242';
assert.ok(!fs.existsSync(target),'Do not overwrite a rejected candidate archive');
assert.equal(hash(read(path.join(work,'candidate.js'))),candidateSHA256);
assert.equal(hash(read(path.join(work,'before.js'))),baselineSHA256);
const cpu=json(path.join(work,'geometry-contract-palm/shading-verification.json')),diagnosis=json(path.join(work,'geometry-contract-palm/recovery-fold-diagnosis.json'));
assert.equal(cpu.candidateSHA256,candidateSHA256);assert.equal(cpu.passed,false,'This archive preserves a rejected CPU candidate');
assert.equal(diagnosis.candidateSHA256,candidateSHA256);assert.equal(diagnosis.beforeSHA256,baselineSHA256);
assert.ok(diagnosis.findings.some(row=>row.age==='adult'&&row.faces.some(face=>face.beforeDot<0&&face.afterDot<face.beforeDot-1e-7)),'Expected actual worsened fold diagnosis');
function walk(dir,skip=[]){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{const file=path.join(dir,entry.name);if(skip.includes(file))return[];assert.ok(!entry.isSymbolicLink(),'Reject archive symlink '+file);return entry.isDirectory()?walk(file,skip):[file];});}
const previous=json(path.join(previousArchive,'rejection.json'));
assert.equal(previous.candidateSHA256,'dc9deade4909e37e9aa4918309541168696e808b7eb066575fea3fa91d574c7e');
assert.equal(previous.accepted,false);assert.equal(previous.artifacts.length,111);
const referencedFiles=walk(previousArchive).map(file=>({path:path.relative(previousArchive,file).split(path.sep).join('/'),sha256:hash(read(file)),bytes:read(file).length}));
assert.deepEqual(referencedFiles.map(row=>row.path).filter(name=>name!=='rejection.json').sort(),previous.artifacts.map(row=>row.path).sort(),'Prior archive inventory drift');
for(const entry of previous.artifacts){const file=path.resolve(previousArchive,entry.path);assert.ok(file.startsWith(path.resolve(previousArchive)+path.sep));assert.equal(hash(read(file)),entry.sha256);assert.equal(read(file).length,entry.bytes);}
const files=walk(work,[target,previousArchive]),entries=files.map(file=>({path:path.relative(work,file).split(path.sep).join('/'),sha256:hash(read(file)),bytes:read(file).length}));
fs.mkdirSync(target);
for(const entry of entries){const original=path.join(work,entry.path),destination=path.join(target,entry.path),bytes=read(original);assert.equal(hash(bytes),entry.sha256,'Original changed before copy '+entry.path);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes,{flag:'wx'});assert.deepEqual(read(destination),bytes,'Archive copy reread '+entry.path);}
assert.deepEqual(walk(work,[target,previousArchive]).map(file=>path.relative(work,file).split(path.sep).join('/')),entries.map(entry=>entry.path),'Original inventory changed during archive');
for(const entry of entries){assert.equal(hash(read(path.join(work,entry.path))),entry.sha256,'Original changed during archive '+entry.path);assert.equal(hash(read(path.join(target,entry.path))),entry.sha256,'Archived bytes changed '+entry.path);}
for(const entry of referencedFiles)assert.equal(hash(read(path.join(previousArchive,entry.path))),entry.sha256,'Referenced previous archive changed '+entry.path);
const rejection={accepted:false,candidateSHA256,baselineSHA256,reason:'Matched native views were visually accepted, but the complete CPU pass found worsened shading agreement on a pre-existing reversed face in the adult recovery wrist fold. This candidate is not eligible for delivery.',cpuReport:'geometry-contract-palm/shading-verification.json',diagnosis:'geometry-contract-palm/recovery-fold-diagnosis.json',nativeScope:'Three matched views and twelve images belong only to this rejected source. They must be rerun for a new candidate.',rawScope:'The full two-file run had 53 passes and three pre-existing palm-crease mirroring failures; a filtered baseline comparison reproduced exact assertions and values.',artifacts:entries,previousArchiveReference:{path:'../candidate-rejected-root-only',candidateSHA256:previous.candidateSHA256,files:referencedFiles},sharedWrites:0,originalsPreserved:true};
const rejectionBytes=Buffer.from(JSON.stringify(rejection,null,2)+'\n');fs.writeFileSync(path.join(target,'rejection.json'),rejectionBytes,{flag:'wx'});assert.deepEqual(read(path.join(target,'rejection.json')),rejectionBytes);
assert.equal(hash(read(path.join(work,'candidate.js'))),candidateSHA256);assert.equal(hash(read(path.join(target,'candidate.js'))),candidateSHA256);
console.log(JSON.stringify({archived:true,candidateSHA256,files:entries.length,bytes:entries.reduce((sum,row)=>sum+row.bytes,0),referencedPreviousFiles:referencedFiles.length,sharedWrites:0,originalsPreserved:true,target,rejectionSHA256:hash(rejectionBytes)}));
