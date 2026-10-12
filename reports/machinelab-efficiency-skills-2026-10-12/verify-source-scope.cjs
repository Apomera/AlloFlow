const fs=require('fs'),cp=require('child_process'),assert=require('assert'),crypto=require('crypto');
const out='reports/machinelab-efficiency-skills-2026-10-12',source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='04b899d3a';
const current=fs.readFileSync(source,'utf8'),baseline=cp.execFileSync('git',['show',baselineCommit+':'+source],{encoding:'utf8',maxBuffer:8*1024*1024});
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function region(text,a,b){const start=text.indexOf(a),end=text.indexOf(b,start);assert(start>=0&&end>start);return{start,end,text:text.slice(start,end)};}
const now=region(current,'      function efficiencyKinds()','      function powerKinds('),old=region(baseline,'      function efficiencySession(','      function powerKinds(');
assert.equal(current.slice(0,now.start)+old.text+current.slice(now.end),baseline);
assert.equal(region(now.text,'        function change(patch)','        function save()').text,region(old.text,'        function change(patch)','        function save()').text);
const newSave=region(now.text,'        function save()','        function energySplit()').text.replace('version: efficiencyRecordVersion(ld.question)','version: 1');
assert.equal(newSave,region(old.text,'        function save()','        function comparisonView()').text);
assert.equal(current,fs.readFileSync(mirror,'utf8'));
const proof={baselineCommit,baselineSha256:hash(baseline),source,mirror,sourceSha256:hash(current),byteParity:true,outsideEfficiencyRegionByteIdentical:true,physicalMathHelpersByteIdentical:true,changeCallbackByteIdentical:true,saveCallbackOnlyVersionSelectionChanged:true,scope:'Efficiency session/question/answer/record helpers and efficiency lab presentation only. Defaults, physical math, all power and compound helpers/labs, other views and record export callers unchanged.'};
fs.writeFileSync(out+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
