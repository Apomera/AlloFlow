const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
(async()=>{
  const dir='reports/renewables-enhancement/',source=fs.readFileSync('stem_lab/stem_tool_renewables.js'),desktop=fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_renewables.js'),hash=crypto.createHash('sha256').update(source).digest('hex');assert.ok(source.equals(desktop));
  const response=await fetch('http://127.0.0.1:8790/tool.js');assert.equal(response.status,200);assert.ok(source.equals(Buffer.from(await response.arrayBuffer())));
  const browser=JSON.parse(fs.readFileSync(dir+'live-labels-browser-results.json','utf8')),edges=JSON.parse(fs.readFileSync(dir+'live-labels-edges-results.json','utf8')),tests=JSON.parse(fs.readFileSync(dir+'live-labels-vitest-results.json','utf8'));
  for(const result of [browser,edges]){assert.equal(result.sourceSha256,hash);assert.deepEqual(result.pageErrors,[]);assert.deepEqual(result.consoleErrors,[]);assert.ok(Object.values(result.audits).every(a=>a.length===0));}
  assert.equal(browser.technologies.length,9);assert.equal(browser.scenarios.length,18);assert.equal(tests.success,true);assert.equal(tests.numPassedTests,114);assert.equal(tests.numFailedTests,0);assert.equal(tests.testResults.length,4);assert.ok(Object.values(edges.behavior).every(Boolean));
  const result={sourceSha256:hash,mirrorMatches:true,previewMatches:true,technologies:9,scenarios:18,testsPassed:114,testFiles:4,accessibilityAudits:Object.keys(browser.audits).length,touchSelection:true,hiddenLabelsIgnored:true,texturesReusedAndDisposed:true,pageErrors:[],consoleErrors:[]};
  fs.writeFileSync(dir+'live-labels-integrity.json',JSON.stringify(result,null,2));fs.writeFileSync(dir+'live-labels-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
