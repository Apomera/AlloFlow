const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm'),acorn=require('acorn');
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='9891a85c1';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const baseline=cp.execFileSync('git',['show',baselineCommit+':'+source],{encoding:'utf8',maxBuffer:4e6}),candidate=fs.readFileSync(source,'utf8');
function region(text){const a=text.indexOf('        function predictionPractice()'),b=text.indexOf('        function backCheck()',a);assert(a>text.indexOf('      function stationPowerLab()')&&b>a);return{a,b,content:text.slice(a,b)};}
const old=region(baseline),next=region(candidate);
assert.equal(candidate.slice(0,next.a)+old.content+candidate.slice(next.b),baseline);
assert.equal(next.content.slice(0,next.content.indexOf('          function stageNumber(')),old.content.slice(0,old.content.indexOf('          function act(')));
function callbacks(text){const tree=acorn.parse(text,{ecmaVersion:'latest'}),items=[];function visit(node){if(!node||typeof node!=='object')return;if(node.type==='Property'&&/^on[A-Z]/.test(node.key.name||node.key.value||''))items.push({key:node.key.name||node.key.value,source:text.slice(node.value.start,node.value.end)});for(const [key,value] of Object.entries(node)){if(key==='start'||key==='end')continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}visit(tree);return items;}
const oldCallbacks=callbacks(old.content),newCallbacks=callbacks(next.content);assert.deepEqual(newCallbacks,oldCallbacks);assert(oldCallbacks.length>0);
assert.equal(candidate,fs.readFileSync(mirror,'utf8'));new vm.Script(candidate);
const result={baselineCommit,baselineSha256:hash(baseline),sourceSha256:hash(candidate),mirrorSha256:hash(fs.readFileSync(mirror)),onlyPredictionPracticeChanged:true,predictionOutcomeAndModelSelectionUnchanged:true,allEventCallbacksByteIdentical:true,eventCallbacks:oldCallbacks.length,existingMathStateGradingRecordsAndOtherViewsUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
