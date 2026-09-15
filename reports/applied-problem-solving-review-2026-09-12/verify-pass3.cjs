const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');const read=f=>fs.readFileSync(path.join(root,f));
const results={checkedAt:new Date().toISOString(),modules:[],sourceMirrors:[]};
for(const file of ['applied_challenge_module.js','generate_dispatcher_module.js','doc_pipeline_module.js','live_aac_module.js','studio_response_module.js','ui_strings.js']){
 const value=read(file),publicValue=read('desktop/web-app/public/'+file);assert(value.equals(publicValue),file+' public mirror mismatch');
 if(file==='ui_strings.js')JSON.parse(value.toString());else new vm.Script(value.toString(),{filename:file});
 results.modules.push({file,publicMirrorMatches:true,syntaxValid:true,sha256:crypto.createHash('sha256').update(value).digest('hex')});
}
assert(read('generate_dispatcher_source.jsx').equals(read('desktop/web-app/src/generate_dispatcher_source.jsx')),'dispatcher source mirror mismatch');results.sourceMirrors.push({file:'generate_dispatcher_source.jsx',matches:true});
const tests=JSON.parse(fs.readFileSync(path.join(__dirname,'pass3-tests.json'),'utf8'));assert(tests.success);assert.equal(tests.numFailedTests,0);results.tests={passed:tests.numPassedTests,total:tests.numTotalTests,failed:tests.numFailedTests};
const browser=JSON.parse(fs.readFileSync(path.join(__dirname,'pass3-browser-results.json'),'utf8'));assert.deepEqual(browser.errors,[]);for(const item of browser.checks)if(item.issues)assert.deepEqual(item.issues,[]);else assert(item.passed);
results.browser={layouts:browser.layouts,accessibilityStates:browser.checks.filter(item=>item.issues).length,consoleErrors:0};
fs.writeFileSync(path.join(__dirname,'pass3-build-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
