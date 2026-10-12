const fs=require('fs'),cp=require('child_process'),assert=require('assert'),crypto=require('crypto');
const out='reports/machinelab-power-planning-2026-10-12',source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baselineCommit='1745ec1e1';
const read=p=>fs.readFileSync(p,'utf8'),oldFile=p=>cp.execFileSync('git',['show',baselineCommit+':'+p],{encoding:'utf8',maxBuffer:8*1024*1024});
const current=read(source),baseline=oldFile(source),hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function region(text,a,b){const start=text.indexOf(a),end=text.indexOf(b,start);assert(start>=0&&end>start);return{start,end,text:text.slice(start,end)};}
const now=region(current,'      function powerPlanningKinds()','      function compoundPowerKinds()'),old=region(baseline,'      function powerKinds(','      function compoundPowerKinds()');
const helper=region(current,'    // Energy-limited alternatives for one station','    // Compatible series stages:');
assert.equal(current.slice(0,helper.start)+current.slice(helper.end,now.start)+old.text+current.slice(now.end),baseline);
assert.equal(region(now.text,'        function change(patch)','        function save()').text,region(old.text,'        function change(patch)','        function save()').text);
assert.equal(region(now.text,'        function save()','        function comparison()').text.replace('version: powerRecordVersion(ld.question)','version: 1'),region(old.text,'        function save()','        function comparison()').text);
assert.equal(current,read(mirror));
const test='tests/machinelab_power_lab.test.js',testCurrent=read(test),testBaseline=oldFile(test);
const before='expect(values).toEqual(skills(b).map(q => q.id));',after="expect(values).toEqual(skills(b).map(q => q.id).concat(['budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency']));";
assert.equal(testCurrent.split(after).length,2);assert.equal(testCurrent.replace(after,before),testBaseline);
const proof={baselineCommit,baselineSha256:hash(baseline),source,mirror,sourceSha256:hash(current),byteParity:true,outsidePowerRegionAndNewHelperByteIdentical:true,existingPhysicalMathHelpersByteIdentical:true,changeCallbackByteIdentical:true,saveCallbackOnlyVersionSelectionChanged:true,existingTestOnlySelectorExpectationChanged:true,existingTest:{path:test,baselineSha256:hash(testBaseline),sha256:hash(testCurrent)},scope:'One new powerBudget math helper and power session/question/record helpers and lab presentation. Existing physical math, defaults, efficiency and compound labs, other views and export callers are unchanged. Existing power test changes only its explicit expected selector list; all prior assertions remain.'};
fs.writeFileSync(out+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
