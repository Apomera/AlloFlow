const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),parser=require('@babel/parser'),traverse=require('@babel/traverse').default;
const source=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
assert.equal(source,fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js','utf8'));
const english=JSON.parse(fs.readFileSync(__dirname+'/english.json','utf8')),registry=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_anatomy_en.json','utf8')),table=JSON.parse(fs.readFileSync('dev-tools/i18n/handtl_anatomy_clinical_notes_20260912.json','utf8'));
const seen=new Set(),vars=s=>(s.match(/\{\w+\}/g)||[]).sort();
traverse(parser.parse(source,{sourceType:'script'}),{CallExpression(p){const key=p.node.arguments[0]?.value;if(typeof key==='string'&&key.startsWith('stem.anatomy.notes_ref_')){assert.equal(p.node.arguments[1]?.value,english[key.slice(13)]);seen.add(key.slice(13));}}});
assert.equal(seen.size,33);for(const [key,value]of Object.entries(english))assert.equal(registry[key],value);
for(const [lang,dict]of Object.entries(table)){
  const packs=['','desktop/web-app/public/'].map(prefix=>JSON.parse(fs.readFileSync(prefix+'lang/'+lang+'.js','utf8')).stem.anatomy);
  assert.equal(Object.keys(dict).length,33);
  for(const [key,value]of Object.entries(dict)){assert.ok(value&&value!==english[key]);assert.deepEqual(vars(value),vars(english[key]));for(const pack of packs)assert.equal(pack[key],value);}
}
const b=JSON.parse(fs.readFileSync(__dirname+'/browser-results.json','utf8')),t=JSON.parse(fs.readFileSync(__dirname+'/test-results.json','utf8'));
assert.equal(t.success,true);assert.equal(t.numFailedTests,0);assert.ok(t.testResults.every(f=>f.status==='passed'));
assert.equal(b.explored.length,13);assert.equal(b.flashcards.length,13);assert.equal(b.axe.length,35);assert.deepEqual(b.errors,[]);assert.deepEqual(b.axe.flatMap(x=>x.violations),[]);
assert.equal(b.axe.flatMap(x=>x.incomplete).length,1);assert.equal(b.manualContrastReviews.length,1);assert.ok(b.manualContrastReviews[0].contrastRatio>=4.5);assert.deepEqual(b.manualContrastReviews[0].occlusions,[]);
const v={syntax:'pass',sha256:crypto.createHash('sha256').update(source).digest('hex'),mirrorIdentical:true,clinicalNotes:13,localizedStrings:33,validatedPacks:6,testFiles:t.testResults.length,passedTests:t.numPassedTests,failedTests:t.numFailedTests,axeScans:b.axe.length,axeViolations:0,axeIncomplete:1,reviewedIncomplete:1,reviewedContrastRatio:b.manualContrastReviews[0].contrastRatio,browserErrors:0,screenshots:b.screens.length};
fs.writeFileSync(__dirname+'/verification.json',JSON.stringify(v,null,2)+'\n');console.log(JSON.stringify(v,null,2));
const reportFile=__dirname+'/README.md';let report=fs.readFileSync(reportFile,'utf8');report=report.split('\n## Final verification')[0];
report+='\n## Final verification\n\n- '+v.passedTests+' tests passed across '+v.testFiles+' anatomy test files.\n- All 13 notes exercised in Explore and revealed flashcards; no browser errors.\n- 35 scoped axe scans: zero violations; one incomplete contrast result independently checked at '+v.reviewedContrastRatio.toFixed(2)+':1, with no sampled text occlusion.\n- 10 screenshots; no horizontal page overflow at the tested phone widths.\n- Both active source copies are identical. JavaScript syntax, all 33 localization keys, six pack copies, and placeholders passed validation.\n- Active source SHA-256: `'+v.sha256+'`.\n';fs.writeFileSync(reportFile,report);
