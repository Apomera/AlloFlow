const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const file='stem_lab/stem_tool_machinelab.js',baseline='2276030a7',hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const before=cp.execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:4e6}),after=fs.readFileSync(file,'utf8');
function region(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>=0&&b>a);return{a,b,text:s.slice(a,b)};}
const old=region(before,'      function powerRotationKinds()', '      function compoundPowerKinds()'),current=region(after,'      function powerRotationKinds()', '      function compoundPowerKinds()');
assert.equal(after.slice(0,current.a)+old.text+after.slice(current.b),before);
for(const [start,end] of [
  ['        function change(patch)','        function input(key'],
  ['      function powerRecordText(', '      function stationPowerLab()'],
  ['        // Keep efficiency precise:', '      function powerAnswer('],
  ['        // A tiny absolute floor', '      function validPowerRecord('],
  ['      function powerRotation(model,', '      function powerPlanningKinds()'],
  ['      function powerModel(', '      function powerSession(']
])assert.equal(region(current.text,start,end).text,region(old.text,start,end).text);
assert(fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)));new(require('vm').Script)(after);
const proof={baselineCommit:baseline,baselineSha256:hash(before),sourceSha256:hash(after),mirrorSha256:hash(fs.readFileSync('desktop/web-app/public/'+file)),onlyPowerRegionChanged:true,physicalMathAndOtherViewsUnchanged:true,oldQuestionBranchesUnchanged:true,oldNumericToleranceUnchanged:true,changeAndSaveCallbacksUnchanged:true,recordTextUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
