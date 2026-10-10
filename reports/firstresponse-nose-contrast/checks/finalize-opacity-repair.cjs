const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const work=__dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex'),recordPath=path.join(work,'fixture-opacity-repair.json'),record=JSON.parse(fs.readFileSync(recordPath,'utf8'));
if(process.argv.includes('--archive-name')){
 const old=path.join(work,record.backupDirectory,'firstresponse-face-preview.spec.ts'),saved=old+'.saved';
 if(sha(fs.readFileSync(old))!==record.before['firstresponse-face-preview.spec.ts'])throw Error('Archived bytes drift');
 if(fs.existsSync(saved))throw Error('Saved name exists');fs.renameSync(old,saved);
 if(sha(fs.readFileSync(saved))!==record.before['firstresponse-face-preview.spec.ts'])throw Error('Rename changed bytes');
 record.backupFiles=Object.fromEntries(Object.keys(record.before).map(file=>[file,file==='firstresponse-face-preview.spec.ts'?file+'.saved':file]));
 record.listDiscoveryRepair={reason:'Playwright discovered the archived spec under testDir; saved fixture extension changed to .spec.ts.saved without changing its bytes.',activeConfigUnchanged:true};
}else{
 const contract=JSON.parse(fs.readFileSync(path.join(work,'fixture-contract-check.json'),'utf8'));
 if(!contract.passed||!contract.mutationRejected||!contract.restoreVerified||contract.listedWorkflows!==3||contract.negative.length!==12)throw Error('Incomplete contract');
 for(const [file,hash]of Object.entries(record.after))if(sha(fs.readFileSync(path.join(work,file)))!==hash)throw Error('Repaired input drift '+file);
 for(const [file,hash]of Object.entries(record.before))if(sha(fs.readFileSync(path.join(work,record.backupDirectory,record.backupFiles[file])))!==hash)throw Error('Archived input drift '+file);
 record.validationPending=false;record.validation={passed:true,contractFile:'fixture-contract-check.json',contractSHA256:sha(fs.readFileSync(path.join(work,'fixture-contract-check.json'))),negativeChecks:12,listedWorkflows:3,mutationRejected:true,restoreVerified:true,browserLaunched:false};
}
fs.writeFileSync(recordPath,JSON.stringify(record,null,2));console.log(JSON.stringify(record));
