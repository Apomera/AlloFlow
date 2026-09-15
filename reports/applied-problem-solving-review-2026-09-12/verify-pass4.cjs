const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');const read=f=>fs.readFileSync(path.join(root,f));
const result={checkedAt:new Date().toISOString(),modules:[]};
for(const file of ['applied_challenge_module.js','studio_response_module.js','ui_strings.js']){
 const value=read(file);assert(value.equals(read('desktop/web-app/public/'+file)),file+' public mirror mismatch');
 if(file==='ui_strings.js')JSON.parse(value.toString());else new vm.Script(value.toString(),{filename:file});
 result.modules.push({file,publicMirrorMatches:true,syntaxValid:true,sha256:crypto.createHash('sha256').update(value).digest('hex')});
}
const tests=JSON.parse(fs.readFileSync(path.join(__dirname,'pass4-tests.json'),'utf8'));assert(tests.success);assert.equal(tests.numFailedTests,0);result.tests={passed:tests.numPassedTests,total:tests.numTotalTests,failed:tests.numFailedTests};
const recovery=JSON.parse(fs.readFileSync(path.join(__dirname,'pass4-recovery-tests.json'),'utf8'));assert(recovery.success);assert.equal(recovery.numFailedTests,0);result.sharedRecoveryTests={passed:recovery.numPassedTests,failed:recovery.numFailedTests};
const browser=JSON.parse(fs.readFileSync(path.join(__dirname,'pass4-browser-results.json'),'utf8'));assert.deepEqual(browser.errors,[]);for(const check of browser.checks)if(check.issues)assert.deepEqual(check.issues,[]);else assert(check.passed);
const previous=JSON.parse(fs.readFileSync(path.join(__dirname,'pass3-browser-results.json'),'utf8'));
result.browser={accessibilityStates:browser.checks.filter(c=>c.issues).length,consoleErrors:0,layouts:browser.layouts.map(layout=>{
 const before=previous.layouts.find(item=>item.viewport===layout.viewport);assert.equal(layout.width,layout.viewport);assert(layout.firstFieldTop<before.firstFieldTop);
 return {...layout,previousFirstFieldTop:before.firstFieldTop,improvementPixels:before.firstFieldTop-layout.firstFieldTop};
})};
fs.writeFileSync(path.join(__dirname,'pass4-build-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
