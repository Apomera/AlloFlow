'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
let source=fs.readFileSync(path.join(__dirname,'candidate-host-handlers-source.jsx'),'utf8');
const ops=JSON.parse(fs.readFileSync(path.join(__dirname,'operations.json'),'utf8'));
for(const op of [...ops].reverse()){assert.equal(source.split(op.after).length,2,op.name);source=source.replace(op.after,op.before);}
fs.writeFileSync(path.join(__dirname,'baseline-host-handlers-source.jsx'),source);
let generated=fs.readFileSync(path.join(root,'host_handlers_module.js'),'utf8'),generatedFromSource=false;
if(generated.includes('canvasRecoveryVaultSyncRequestRef')){generated=require(path.join(root,'_build_first_wave_view_modules.js')).buildFirstWaveModule('HostHandlers',source);generatedFromSource=true;}
fs.writeFileSync(path.join(__dirname,'baseline-host-handlers-module.js'),generated);
console.log(JSON.stringify({baselineSourceReversedExactly:true,baselineGeneratedFromSource:generatedFromSource,productionWritten:false}));
