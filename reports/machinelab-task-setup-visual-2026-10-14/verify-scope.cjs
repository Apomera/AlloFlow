const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'../..'));const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baseline='b33626f52';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),current=fs.readFileSync(source,'utf8'),before=cp.execFileSync('git',['show',baseline+':'+source],{encoding:'utf8',maxBuffer:5e6});
const start=current.indexOf('        function taskSetup() {'),marker="        return card([h('details', { key: 'lab', className: 'ml-power-lab'",endMarker='      function compoundPowerKinds()';
const end=current.indexOf(endMarker,start),oldStart=before.indexOf(marker),oldEnd=before.indexOf(endMarker,oldStart);assert(start>0&&end>start&&oldStart>0&&oldEnd>oldStart);
assert.equal(current.slice(0,start)+before.slice(oldStart,oldEnd)+current.slice(end),before,'Only taskSetup and the power lab render shell may change');
assert.equal(hash(current),hash(fs.readFileSync(mirror)));cp.execFileSync(process.execPath,['--check',source],{stdio:'pipe',windowsHide:true});
const result={baselineCommit:baseline,baselineSha256:hash(before),sourceSha256:hash(current),mirrorSha256:hash(fs.readFileSync(mirror)),onlyTaskSetupAndRenderShellChanged:true,existingCalculationsHandlersPracticeAndRecordsUnchanged:true,sourceMirrorParity:true,syntax:true};fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
