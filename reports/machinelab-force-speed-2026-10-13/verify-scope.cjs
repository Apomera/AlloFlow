const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const file='stem_lab/stem_tool_machinelab.js',baseline='fb4f44cfb',hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const before=cp.execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:4e6}),after=fs.readFileSync(file,'utf8');
function region(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert(a>0&&b>a);return{a,b,text:s.slice(a,b)};}
const b=region(before,'      function powerRotationKinds()','      function compoundPowerKinds()'),a=region(after,'      function powerRotationKinds()','      function compoundPowerKinds()');
assert.equal(after.slice(0,a.a)+b.text+after.slice(a.b),before);
for(const [start,end] of [['      function powerAnswer(', '      function validPowerRecord('],['      function validPowerRecord(', '      function powerRecordText('],['      function powerRecordText(', '      function stationPowerLab('],['        function change(patch)', '        function input(key']]){
  const old=start.includes('change')?b.text.slice(b.text.indexOf('      function stationPowerLab(')):b.text;
  const current=start.includes('change')?a.text.slice(a.text.indexOf('      function stationPowerLab(')):a.text;
  assert.equal(region(current,start,end).text,region(old,start,end).text,start);
}
const oldQuestion=region(before,'      function powerQuestion(', '      function powerAnswer(').text;
const newQuestion=region(after,'      function powerQuestion(', '      function powerAnswer(').text;
const added=region(newQuestion,'        if (powerMotionKinds().indexOf(kind) >= 0)', '        if (powerRotationKinds().indexOf(kind) >= 0)');
assert.equal(newQuestion.slice(0,added.a)+newQuestion.slice(added.b),oldQuestion);
assert(fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)));new(require('vm').Script)(after);
const tests=['machinelab_power_lab','machinelab_power_planning','machinelab_rotation_skills','machinelab_skill_map'].map(name=>{
  const file='tests/'+name+'.test.js';const old=cp.execFileSync('git',['show',baseline+':'+file]);return{file,baselineSha256:hash(old),sha256:hash(fs.readFileSync(file))};
});
const changes=JSON.parse(fs.readFileSync(__dirname+'/existing-test-inventory-changes.json','utf8'));
for(const change of changes){const record=tests.find(t=>t.file===change.file);assert(record);assert.equal(record.sha256,change.currentSha256);assert.equal(record.baselineSha256,change.baselineSha256);
  let revised=fs.readFileSync(change.file,'utf8');for(const [old,value] of change.replacements){assert.equal(revised.split(value).length,2);revised=revised.replace(value,old);}assert.equal(hash(revised),record.baselineSha256);
}
assert.equal(changes.length,4);
const proof={baselineCommit:baseline,baselineSha256:hash(before),sourceSha256:hash(after),mirrorSha256:hash(fs.readFileSync('desktop/web-app/public/'+file)),onlyPowerRegionChanged:true,physicalMathAndOtherViewsUnchanged:true,gradingValidationCallbacksAndRecordTextUnchanged:true,legacyQuestionBranchesUnchanged:true,sourceMirrorParity:true,syntax:true,existingTestsOnlyInventoryChanged:true,existingTests:tests};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
