'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const normalize=value=>value.toString().replace(/\r\n/g,'\n');
const read=file=>fs.readFileSync(path.join(root,file));
const applied=JSON.parse(fs.readFileSync(path.join(__dirname,'applied.json'),'utf8'));
for(const row of applied.files) assert.equal(hash(read(row.file)),row.afterSha256,'Current production bytes: '+row.file);
applied.context.forEach(row=>assert.equal(hash(read(row.file)),row.sha256,'Unchanged selective builder input'));
const build=require(path.join(root,'_build_first_wave_view_modules.js')).buildFirstWaveModule;
assert.equal(read('host_handlers_module.js').toString(),build('HostHandlers',normalize(read('host_handlers_source.jsx'))),'Generated module matches source');
assert.equal(hash(read('host_handlers_module.js')),hash(read('desktop/web-app/public/host_handlers_module.js')),'Runtime mirror');
const parser=require(path.join(root,'node_modules/@babel/parser'));
for(const file of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']) {
 const code=normalize(read(file));parser.parse(code,{sourceType:'unambiguous',plugins:['jsx']});
 assert(code.includes('host_handlers_module.js?v='+applied.pin),'Current HostHandlers content pin');
 assert(code.includes("maine_sld_practice_module.js?v=8771e0b3"),'Concurrent owner pin preserved');
}
new vm.Script(read('host_handlers_module.js').toString());
for(const file of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx','host_handlers_source.jsx']) {
 let original=normalize(read(file));
 for(const op of applied.operations.filter(op=>op.target===file).reverse()) {
  assert.equal(original.split(op.after).length,2,'Unique reverse anchor');original=original.replace(op.after,op.before);
 }
 assert.equal(original,normalize(fs.readFileSync(path.join(__dirname,'source-before',file))),'Exact scoped reversal preserves other edits');
}
const result={passed:true,completedAt:new Date().toISOString(),files:applied.files.length,pin:applied.pin,sourceGeneratedParity:true,hostRuntimeMirrors:true,scopedReversal:true,preservedMainePin:'8771e0b3'};
fs.writeFileSync(path.join(__dirname,'consistency.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
