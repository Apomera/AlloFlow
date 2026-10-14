const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='3594d5c4f';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const baseline=cp.execFileSync('git',['show',baselineCommit+':'+source],{encoding:'utf8',maxBuffer:4e6}),candidate=fs.readFileSync(source,'utf8');
function region(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert(a>text.indexOf('      function stationPowerLab()')&&b>a);return{a,b,content:text.slice(a,b)};}
const old=region(baseline,'        function predictionState(','        function backCheck('),next=region(candidate,'        function predictionState(','        function backCheck(');
assert.equal(candidate.slice(0,next.a)+old.content+candidate.slice(next.b),baseline);
assert.equal(region(candidate,'        function predictionModel(','        function predictionNumberResult(').content,region(baseline,'        function predictionModel(','        function updatePrediction(').content);
assert.equal(candidate,fs.readFileSync(mirror,'utf8'));new vm.Script(candidate);
const result={baselineCommit,baselineSha256:hash(baseline),sourceSha256:hash(candidate),mirrorSha256:hash(fs.readFileSync(mirror)),onlyPredictionHelpersChanged:true,predictionModelUnchanged:true,existingMathGradingRecordsAndCallbacksUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
