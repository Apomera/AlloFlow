const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const file='stem_lab/stem_tool_machinelab.js',baseline='d5aa990f3';
const before=cp.execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:4e6}),after=fs.readFileSync(file,'utf8');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function region(s){const start=s.indexOf('        function practice() {',s.indexOf('      function stationPowerLab() {')),end=s.indexOf('        return card([',start);assert(start>0&&end>start);return{start,end,body:s.slice(start,end)};}
const b=region(before),a=region(after);
assert.equal(after.slice(0,a.start)+b.body+after.slice(a.end),before);
assert(fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)));
new (require('vm').Script)(after);
const proof={baselineCommit:baseline,baselineSha256:hash(before),sourceSha256:hash(after),mirrorSha256:hash(fs.readFileSync('desktop/web-app/public/'+file)),onlyPowerPracticeChanged:true,physicalMathGradingStateAndRecordHelpersUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
