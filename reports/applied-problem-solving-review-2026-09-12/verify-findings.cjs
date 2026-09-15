const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const {chromium}=require('playwright');const{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'../..');
async function main(){
 const sandbox={window:{React:{}},console};vm.runInNewContext(fs.readFileSync(path.join(root,'applied_challenge_module.js'),'utf8'),sandbox);
 const api=sandbox.window.AlloModules.AppliedChallenge._testing;
 const base=JSON.parse(fs.readFileSync(path.join(__dirname,'fixture.json'),'utf8')).data;
 const data=api.normalizeAppliedChallengeData(base);
 const facts={initialProgress:api.appliedChallengeWorkspaceProgress(data),clearedQuestion:api.normalizeAppliedChallengeData({...data,workspace:{...data.workspace,workingQuestion:''}}).workspace.workingQuestion,unlinkedVerifiedRow:api.normalizeAppliedChallengeData({...data,brief:{...data.brief,factVerified:true},evidenceLedger:[{claim:'Unrelated claim',evidence:'No selected lesson fact',status:'verified'}]}).evidenceLedger[0],ratingAfterCriterionReplacement:api.normalizeAppliedChallengeCriteriaCheck({'criterion-0':{rating:'met',note:'Old criterion evidence'}},{criteria:['Completely different requirement']}),compactPhases:api.appliedChallengeVisiblePhases('compact').map(x=>x.id),standardPhases:api.appliedChallengeVisiblePhases('standard').map(x=>x.id),extendedPhases:api.appliedChallengeVisiblePhases('extended').map(x=>x.id)};
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:900}});
 await page.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href);
 await page.locator('#applied-workspace-workingQuestion').fill('');
 facts.browserQuestionAfterClear=await page.locator('#applied-workspace-workingQuestion').inputValue();
 await page.close();
 const visual='C:/Users/cabba/.codex/visualizations/2026/09/12/01a09613-93ba-79b0-af19-62f27fd68053/applied-problem-solving-direction.html';
 const fragment=fs.readFileSync(visual,'utf8');
 const preview='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Applied Problem Solving design preview</title><body>'+fragment+'</body></html>';
 fs.writeFileSync(path.join(__dirname,'design-preview.html'),preview);
 const previewResults=[];
 for(const width of [1024,390,320]){
  const p=await browser.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.join(__dirname,'design-preview.html')).href);
  await p.locator('#aps-field-question').fill('How could we compare two plans?');
  await p.locator('#aps-next').click();await p.getByRole('button',{name:'Show a thinking prompt',exact:true}).click();
  const promptVisible=await p.locator('#aps-hint').isVisible();await p.locator('[data-stage="0"]').click();
  const valuePreserved=await p.locator('#aps-field-question').inputValue()==='How could we compare two plans?';
  await p.addScriptTag({path:require.resolve('axe-core')});const axe=await p.evaluate(async()=>{const r=await window.axe.run(document.getElementById('aps-direction'));return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});
  previewResults.push({width,documentWidth:await p.evaluate(()=>document.documentElement.scrollWidth),valuePreserved,promptVisible,axe,errors});
  await p.screenshot({path:path.join(__dirname,'direction-'+width+'.png'),fullPage:true});await p.close();
 }
 await browser.close();
 const files=['applied_challenge_source.jsx','applied_challenge_module.js','desktop/web-app/public/applied_challenge_module.js','generate_dispatcher_source.jsx','studio_response_module.js','doc_pipeline_source.jsx'];
 const hashes=Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
 fs.writeFileSync(path.join(__dirname,'verified-findings.json'),JSON.stringify({facts,previewResults,hashes},null,2));console.log(JSON.stringify({facts,previewResults},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
