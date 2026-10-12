const fs=require('fs'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict'),path=require('path');
const commit='81cd7c9fc',file='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+file;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const previous=f=>cp.execFileSync('git',['show',commit+':'+f],{encoding:'utf8',maxBuffer:8e6});
const before=previous(file),after=fs.readFileSync(file,'utf8');assert.equal(after,fs.readFileSync(mirror,'utf8'));
function slice(s,a,b){const start=s.indexOf(a),end=s.indexOf(b,start);assert(start>=0&&end>start,a);return s.slice(start,end);}
const old=slice(before,'      function powerPlanningKinds()','      function compoundPowerKinds()');
const now=slice(after,'      function powerRotationKinds()','      function compoundPowerKinds()');
assert.equal(after.replace(now,old),before,'Changes outside power helpers/panel');
for(const [a,b] of [['        function change(patch) {','        function input(key,'],['      function powerAnswer(','      function validPowerRecord('],['      function powerRecordText(','      function stationPowerLab(']])assert.equal(slice(now,a,b),slice(old,a,b));
const oldQuestion=slice(old,'      function powerQuestion(','      function powerAnswer('),newQuestion=slice(now,'      function powerQuestion(','      function powerAnswer(');
const added=slice(newQuestion,'        if (powerRotationKinds().indexOf(kind) >= 0) {','        var specs = {');
assert.equal(newQuestion.replace(added,''),oldQuestion,'Legacy questions changed');
const tests=[
  ['tests/machinelab_power_lab.test.js',"skills(b).map(q => q.id).concat(['budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'])", "skills(b).map(q => q.id).concat(['budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'], b.radius ? ['turns', 'angularTravel', 'omega', 'rotationalWork', 'rotationalPower'] : [])"],
  ['tests/machinelab_power_planning.test.js',"const kinds = b => [...OLD_SKILLS.filter(q => !q.rotation || b.radius), ...NEW_SKILLS].map(q => q.id);", "const kinds = b => [...OLD_SKILLS.filter(q => !q.rotation || b.radius), ...NEW_SKILLS].map(q => q.id).concat(b.radius ? ['turns', 'angularTravel', 'omega', 'rotationalWork', 'rotationalPower'] : []);"]
].map(([file,original,revised])=>{const current=fs.readFileSync(file,'utf8'),baseline=previous(file);assert.equal(current.split(revised).length,2);assert.equal(current.replace(revised,original),baseline);return {file,sha256:hash(current),baselineSha256:hash(baseline)};});
for(const f of [file,mirror])cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe',windowsHide:true});
const result={baselineCommit:commit,baselineSha256:hash(before),sourceSha256:hash(after),mirrorSha256:hash(fs.readFileSync(mirror)),byteParity:true,onlyPowerRegionChanged:true,
 physicalMathAndOtherViewsUnchanged:true,changeAndSaveCallbacksUnchanged:true,answerGradingUnchanged:true,legacyQuestionCalculationsUnchanged:true,recordTextFormatterUnchanged:true,
 existingTestsOnlyInventoryChanged:true,existingTests:tests,syntax:true};
fs.writeFileSync(path.join(__dirname,'source-scope.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
