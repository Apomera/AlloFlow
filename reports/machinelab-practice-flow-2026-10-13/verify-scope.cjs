const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const file='stem_lab/stem_tool_machinelab.js',baseline='fbd5aa477',hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const before=cp.execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:4e6}),after=fs.readFileSync(file,'utf8');
function region(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>=0&&b>a);return{a,b,text:s.slice(a,b)};}
const start='      function stationPowerLab() {',end='      function compoundPowerKinds()';
const old=region(before,start,end),current=region(after,start,end);
assert.equal(after.slice(0,current.a)+old.text+after.slice(current.b),before);
assert.equal(region(current.text,'        function change(patch)', '        function input(key').text,region(old.text,'        function change(patch)', '        function input(key').text);
const oldFeedback=region(old.text,"              result ? h('p', { key: 'result'", "            h('div', { key: 'save-next'").text;
const newFeedback=region(current.text,"              result ? h('p', { key: 'result'", "            h('div', { key: 'save-next'").text;
assert.equal(oldFeedback,newFeedback);
assert(fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)));new(require('vm').Script)(after);
const proof={baselineCommit:baseline,baselineSha256:hash(before),sourceSha256:hash(after),mirrorSha256:hash(fs.readFileSync('desktop/web-app/public/'+file)),onlyStationPowerLabChanged:true,calculationGradingRecordAndOtherViewHelpersUnchanged:true,changeAndSaveCallbacksUnchanged:true,resultFeedbackTextUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
