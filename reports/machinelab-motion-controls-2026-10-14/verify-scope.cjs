const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'../..'));
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baseline='e058da26d';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),current=fs.readFileSync(source,'utf8'),before=cp.execFileSync('git',['show',baseline+':'+source],{encoding:'utf8',maxBuffer:5e6});
function section(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a);assert(a>0&&b>a);return s.slice(a,b);}
const now=section(current,'        function shopMotionInspector() {','        function shopDiscoveryClue() {'),old=section(before,'        function shopMotionInspector() {','        function shopDiscoveryClue() {');
assert.equal(current.replace(now,old),before,'Only shopMotionInspector presentation may change');
assert.equal(section(now,'                onClick: function (ev) {','                style: {'),section(old,'                onClick: function (ev) {','                style: {'));
const handlers=s=>s.match(/(?:ref|onChange|onClick): function[^\n]*?\}(?=,)/g);assert.deepEqual(handlers(now),handlers(old));
assert.equal((now.match(/onClick: holdShopPose/g)||[]).length,1);
for(const attr of ['disabled:',"'aria-pressed':","'aria-valuetext':"]){const expr=new RegExp(attr.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[^,\\n]+','g');assert.deepEqual(now.match(expr),old.match(expr));}
const translations=s=>s.match(/__alloT\('(?:\\.|[^'])*', '(?:\\.|[^'])*'\)/g);for(const entry of translations(old))assert(translations(now).includes(entry));
assert.equal(hash(current),hash(fs.readFileSync(mirror)));cp.execFileSync(process.execPath,['--check',source],{stdio:'pipe',windowsHide:true});
const result={baselineCommit:baseline,baselineSha256:hash(before),sourceSha256:hash(current),mirrorSha256:hash(fs.readFileSync(mirror)),onlyMotionInspectorChanged:true,previewGeometrySimulationAndCalculationsUnchanged:true,existingHandlersRefsAndDisabledRulesUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
