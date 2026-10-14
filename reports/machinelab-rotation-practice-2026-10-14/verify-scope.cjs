const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'../..'));
const source='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+source,baseline='cb2392852';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),current=fs.readFileSync(source,'utf8'),before=cp.execFileSync('git',['show',baseline+':'+source],{encoding:'utf8',maxBuffer:5e6});
function section(s,start,end){const a=s.indexOf(start),b=s.indexOf(end,a);assert(a>0&&b>a);return s.slice(a,b);}
const start='        function rotationGuide() {',end='        function comparison() {',now=section(current,start,end),old=section(before,start,end);
let restored=current.replace(now,old).replaceAll('openGuidePractice(ev, kind)','openForcePractice(ev, kind)');
restored=restored.replace("if (powerMotionKinds().concat(['rotationalWork', 'rotationalPower']).indexOf(kind) < 0 || powerKinds(bench).indexOf(kind) < 0) return;","if (powerMotionKinds().indexOf(kind) < 0) return;");
assert.equal(restored,before,'Only rotation guide and the narrow guide navigation extension may differ');
assert.equal(now.slice(0,now.indexOf("          return h('details'")),old.slice(0,old.indexOf("          return h('details'")));
assert.equal(section(now,"h('svg',", "h('p', { key: 'conversion'"),section(old,"h('svg',", "h('p', { key: 'conversion'"));
assert.equal(section(now,"h('span', { 'data-ml-rotation-bar'", "              h('p', { key: 'scale'"),section(old,"h('span', { 'data-ml-rotation-bar'", "              h('p', { key: 'scale'"));
const translations=s=>s.match(/__alloT\('(?:\\.|[^'])*', '(?:\\.|[^'])*'\)/g);for(const entry of translations(old))assert(translations(now).includes(entry));
assert.equal(hash(current),hash(fs.readFileSync(mirror)));cp.execFileSync(process.execPath,['--check',source],{stdio:'pipe',windowsHide:true});
const result={baselineCommit:baseline,baselineSha256:hash(before),sourceSha256:hash(current),mirrorSha256:hash(fs.readFileSync(mirror)),onlyRotationGuideAndSharedNavigationChanged:true,existingCalculationsRotationBarsAndReferenceUnchanged:true,existingDraftUpdateFocusGradingRecordsAndExportsUnchanged:true,sourceMirrorParity:true,syntax:true};
fs.writeFileSync(__dirname+'/source-scope.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
