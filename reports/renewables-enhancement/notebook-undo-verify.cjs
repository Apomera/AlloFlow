const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
(async()=>{
 const dir='reports/renewables-enhancement/',source=fs.readFileSync('stem_lab/stem_tool_renewables.js'),mirror=fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_renewables.js');
 assert.ok(source.equals(mirror),'source and desktop copy match');new vm.Script(source.toString());
 const sha=crypto.createHash('sha256').update(source).digest('hex');
 const browser=JSON.parse(fs.readFileSync(dir+'notebook-undo-browser-results.json','utf8')),tests=JSON.parse(fs.readFileSync(dir+'notebook-undo-vitest-results.json','utf8'));
 assert.equal(browser.sourceSha256,sha);assert.equal(browser.technologies.length,9);assert.equal(browser.behavior.length,25);assert.equal(Object.keys(browser.audits).length,7);
 for(const [name,violations] of Object.entries(browser.audits))assert.deepEqual(violations,[],name);assert.deepEqual(browser.pageErrors,[]);assert.deepEqual(browser.consoleErrors,[]);
 assert.equal(tests.success,true);assert.equal(tests.numPassedTests,115);assert.equal(tests.numFailedTests,0);assert.equal(tests.testResults.length,4);
 const response=await fetch('http://127.0.0.1:8790/tool.js',{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200);const preview=Buffer.from(await response.arrayBuffer());assert.ok(source.equals(preview),'preview serves the final source');
 const result={sourceSha256:sha,sourceAndDesktopIdentical:true,previewIdentical:true,syntaxValid:true,regressionTests:115,testFiles:4,browserBehaviors:25,technologies:9,accessibilityAudits:7,pageErrors:[],consoleErrors:[],viewportWidths:[1280,390,320],visualReview:['notebook-undo-desktop.jpg','notebook-undo-phone-320.jpg'],scope:'Isolated local React/Three.js host and running local preview source; no deployment.'};
 fs.writeFileSync(dir+'notebook-undo-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
