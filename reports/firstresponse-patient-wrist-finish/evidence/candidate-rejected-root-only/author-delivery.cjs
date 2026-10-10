const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const previous=path.join(__dirname,'../firstresponse-support-fit-work/finish-pass.cjs');
const replace=(s,old,value)=>{assert.equal(s.split(old).length,2,'Unique replacement: '+old.slice(0,100));return s.replace(old,value);};
let code=fs.readFileSync(previous,'utf8');
code=code.replaceAll('164407bb58546fc91584761e51e9a907d2eacd33442a0a5fae31da0c22ef37c0','BASELINE_PLACEHOLDER')
 .replaceAll('69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242','dc9deade4909e37e9aa4918309541168696e808b7eb066575fea3fa91d574c7e')
 .replaceAll('BASELINE_PLACEHOLDER','69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242')
 .replaceAll('firstresponse-support-frame','firstresponse-patient-wrist-finish')
 .replaceAll('firstresponse_support_frame_delta','firstresponse_patient_wrist_finish_delta')
 .replaceAll('firstresponse_nose_contour_delta','firstresponse_support_frame_delta')
 .replaceAll("rows.length===18,'Expected 18 history reversals'","rows.length===19,'Expected 19 history reversals'")
 .replaceAll("size===18,'Duplicate history reversal'","size===19,'Duplicate history reversal'");
code=replace(code,"function sharedSnapshot(history,integration,after,rawEdit){","function sharedSnapshot(history,integration,after){");
code=replace(code,"integration.edits.find(e=>e.file===file)||(rawEdit&&rawEdit.file===file?rawEdit:null)","integration.edits.find(e=>e.file===file)");
code=replace(code,"  const out={};for(const [file,h]of Object.entries(history.sourceHashes))",`  for(const [folder,pattern,kind] of [['tests',/^firstresponse.*\\.test\\.js$/,'fixtureHashes'],['dev-tools',/^firstresponse.*\\.cjs$/,'checkerHashes'],['tests/helpers',/^firstresponse_.*_delta\\.(cjs|json)$/,'helperHashes']]){const expected=Object.keys(history[kind]);if(after&&kind==='helperHashes')expected.push(...integration.additions.map(item=>path.basename(item.file)));same(fs.readdirSync(path.join(root,folder)).filter(name=>pattern.test(name)).sort(),expected.sort(),'Shared file inventory changed '+folder);}
  const out={};for(const [file,h]of Object.entries(history.sourceHashes))`);
const rawStart=code.indexOf("  const rawEdit=json(local('raw-test-edit.json'))");
const rawEnd=code.indexOf("  const audit=json(local('fixture-audit.json'))",rawStart);
assert.ok(rawStart>0&&rawEnd>rawStart);
code=code.slice(0,rawStart)+fs.readFileSync(path.join(__dirname,'delivery-raw-cpu.txt'),'utf8')+code.slice(rawEnd);
const auditStart=code.indexOf("  const audit=json(local('fixture-audit.json'))");
const auditEnd=code.indexOf("  const visual=json(local('visual-review.json'))",auditStart);
assert.ok(auditStart>0&&auditEnd>auditStart);
code=code.slice(0,auditStart)+fs.readFileSync(path.join(__dirname,'delivery-native.txt'),'utf8')+code.slice(auditEnd);
const requiredStart=code.indexOf("  const required=['baseline.json'");
const requiredEnd=code.indexOf("  for(const name of required)include(local(name));",requiredStart);
code=code.slice(0,requiredStart)+`  const required=['baseline.json','before.js','candidate.js','delta.json','history-integration.json','history-preservation.json','history-input-snapshot.json','prepare-history.cjs','snapshot-history.cjs','author-history.cjs','author-delivery.cjs','author-candidate.cjs','prepare-browser-fixture.cjs','delivery-raw-cpu.txt','delivery-native.txt','delivery-readme.txt','verify-patient-wrist-finish.cjs','geometry-contract/shading-verification.json','audit-preview-fixture.cjs','fixture-audit.json','firstresponse-face-preview.spec.ts','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs','patient-wrist-contract.cjs','visual-review.json','independent-visual-review.json','finish-pass.cjs','finish-selftest.json','run-raw-wrist.cjs','firstresponse_patient_wrist_finish_delta.cjs','firstresponse_patient_wrist_finish_delta.json'];\n`+code.slice(requiredEnd);
code=code.replace('candidate-rejected-|candidate-history$', 'geometry-contract(?!$)|winding-diagnostics$|candidate-rejected-|candidate-history$');
code=code.replace('cpu|check-nose-contour|fixture-audit','cpu|winding-diagnosis|check-nose-contour|fixture-audit');
code=code.replace("  for(const name of required)include(local(name));", "  required.push('reclaimed-archived-copies.json','accept-final-cpu.cjs','summarize-cpu.cjs','correct-winding-check.cjs','adjust-probe.cjs','diagnose-winding.cjs','checker-before-probe-adjustment.cjs.saved');\n  for(const name of required)include(local(name));\n  for(const name of ['early-check','early-diagnostic','early-corrected'])for(const file of walk(local(name)))include(file);");
code=code.replaceAll('raw-dependency-diagnostics','raw-dependency-diagnostics').replaceAll('sharedSnapshot(history,integration,false,rawEdit)','sharedSnapshot(history,integration,false)');
const readmeStart=code.indexOf('  const images=views.map(id=>');
const readmeEnd=code.indexOf("  packageFiles.set('README.md',Buffer.from(readme));",readmeStart);
code=code.slice(0,readmeStart)+fs.readFileSync(path.join(__dirname,'delivery-readme.txt'),'utf8')+code.slice(readmeEnd);
code=code.replaceAll('imageHashes,cpu,native,rawEdit,rawAfter,raw','imageHashes,cpu,native,raw')
 .replaceAll('data.cpu.cases.length','data.cpu.results.length')
 .replaceAll('nose-contour compatibility helper; two new support-frame compatibility helper files; one focused Supporting hand test fixture;','support-frame compatibility helper; two new patient-wrist-finish compatibility helper files;')
 .replaceAll('  guardedWrite(safeShared(data.rawEdit.file),data.rawAfter,data.rawEdit.beforeSHA256);\n','')
 .replaceAll('sharedSnapshot(data.history,data.integration,true,data.rawEdit)','sharedSnapshot(data.history,data.integration,true)')
 .replaceAll('rawFixtureFilesPreserved:38,rawFixtureFilesStrengthened:1','rawFixtureFilesPreserved:39,rawFixtureFilesStrengthened:0')
 .replaceAll('The raw Supporting hand fixture updates the narrow target contract and checks complete head visibility.','Both selected raw fixtures remain unchanged; current wrist normals are checked by the CPU and native browser validators.')
 .replaceAll('syntax, 18 compatibility reversals, 38 unchanged raw test files and one updated Supporting hand fixture, 8 unchanged checkers','syntax, 19 compatibility reversals, 39 unchanged raw test files, 8 unchanged checkers');
assert.ok(!code.includes('rawEdit'));
new Function(code);
fs.writeFileSync(path.join(__dirname,'finish-pass.cjs'),code);
console.log(JSON.stringify({authored:true,sharedWrites:0,bytes:Buffer.byteLength(code)}));
