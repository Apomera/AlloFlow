const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='3c3deb314';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const baseline=cp.execFileSync('git',['show',baselineCommit+':'+source],{encoding:'utf8',maxBuffer:4e6}),candidate=fs.readFileSync(source,'utf8');
function part(text,start,end){const a=text.indexOf(start,text.indexOf('      function stationPowerLab()')),b=text.indexOf(end,a);assert(a>0&&b>a);return{a,b,text:text.slice(a,b)};}
const old=part(baseline,'        function predictionState(','        function backCheck('),next=part(candidate,'        function predictionState(','        function backCheck(');
assert.equal(candidate.slice(0,next.a)+old.text+candidate.slice(next.b),baseline);
assert.equal(part(candidate,'        function predictionModel(','        function predictionNumberResult(').text,part(baseline,'        function predictionModel(','        function predictionNumberResult(').text);
const oldNumber=part(baseline,'        function predictionNumberResult(','        function updatePrediction(').text,newNumber=part(candidate,'        function predictionNumberResult(','        function updatePrediction(').text;
assert.equal(newNumber.slice(newNumber.indexOf('          var answer =')),oldNumber.slice(oldNumber.indexOf('          var answer =')));
assert.equal(candidate,fs.readFileSync(mirror,'utf8'));new vm.Script(candidate);
const proof={baselineCommit,baselineSha256:hash(baseline),sourceSha256:hash(candidate),mirrorSha256:hash(fs.readFileSync(mirror)),onlyPredictionHelpersChanged:true,physicalPredictionModelUnchanged:true,legacyValueGradingByteIdentical:true,mainCalculationsAndSavedRecordsUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
