const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const out=__dirname;
async function main(){
  const seed=`localStorage.clear();localStorage.setItem('bl_onboarded','1');localStorage.setItem('bl_ai_consent_v1','1');localStorage.setItem('bl_student_roster',JSON.stringify([{id:'audit-eagle',name:'Eagle'},{id:'audit-falcon',name:'Falcon'}]));
  for (const [id,name] of [['audit-eagle','Eagle'],['audit-falcon','Falcon']]) localStorage.setItem('behaviorLens_workspace_'+id,JSON.stringify({version:4,student:name,studentId:id,savedAt:new Date().toISOString(),abcEntries:[1,2,3].map(i=>({id:id+'-'+i,timestamp:'2026-09-12T12:0'+i+':00.000Z',antecedent:'Independent work',behavior:'Calls out',consequence:'Teacher responds',intensity:2})),observationSessions:[],sessionHistory:[]}));
  window.callGemini=prompt=>{window.auditLastPrompt=prompt;return new Promise(resolve=>window.auditResolveAI=resolve)};`;
  const original=fs.readFileSync(path.join(out,'preview.html'),'utf8');
  const html=original.replace("localStorage.clear();localStorage.setItem('bl_student_roster',JSON.stringify([{id:'audit-eagle',name:'Eagle'}]));",seed).replace('dashboardData:null','dashboardData:[{studentNickname:"Eagle"},{studentNickname:"Falcon"}]');
  fs.writeFileSync(path.join(out,'flow-preview.html'),html);
  const browser=await chromium.launch({headless:true});
  const results={};
  const errors=[];
  async function page(){const p=await browser.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(out,'flow-preview.html')).href);await p.getByRole('button',{name:'Close BehaviorLens',exact:true}).waitFor();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-eagle')).abcEntries.length===3);return p;}
  const ai=await page();
  await ai.getByRole('button',{name:/Full Student Summary/}).click();
  await ai.waitForFunction(()=>typeof window.auditResolveAI==='function');
  results.aiPromptStudent=await ai.evaluate(()=>window.auditLastPrompt.match(/Student codename: (.*)/)?.[1]);
  await ai.getByRole('combobox',{name:'Choose a student'}).selectOption('Falcon');
  await ai.getByRole('button',{name:'Switch to student Eagle',exact:true}).waitFor();
  await ai.evaluate(()=>window.auditResolveAI('EAGLE ONLY SUMMARY — audit delayed response'));
  await ai.waitForFunction(()=>document.body.textContent.includes('EAGLE ONLY SUMMARY'));
  await ai.waitForFunction(()=>JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-falcon')).fullSummary?.includes('EAGLE ONLY SUMMARY'));
  results.aiAfterSwitch=await ai.evaluate(()=>({selected:document.querySelector('select[aria-label="Choose a student"]').value,visible:document.body.textContent.includes('EAGLE ONLY SUMMARY'),falconSummary:JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-falcon')).fullSummary,eagleSummary:JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-eagle')).fullSummary}));
  await ai.screenshot({path:path.join(out,'ai-summary-wrong-student.png')});await ai.close();
  const frequency=await page();await frequency.locator('[aria-labelledby="bl-tool-frequency-title"] button').last().click();
  const dialog=frequency.getByRole('dialog',{name:'Frequency Counter — Eagle',exact:true});await dialog.waitFor();
  results.frequencyButtons=await dialog.locator('button').evaluateAll(bs=>bs.map(b=>({label:b.getAttribute('aria-label'),text:b.textContent})));
  await dialog.getByRole('button',{name:'Close',exact:true}).focus();await frequency.keyboard.press('Shift+Tab');
  results.frequencyFocus=await frequency.evaluate(()=>({text:document.activeElement.textContent,label:document.activeElement.getAttribute('aria-label'),dialog:document.activeElement.closest('[role="dialog"]')?.getAttribute('aria-label')}));
  const tap=dialog.getByRole('button',{name:'Add one to unlabeled behavior',exact:true});
  if(await tap.count()){await tap.click();results.frequencyCountBeforeEscape=await dialog.innerText();}
  await frequency.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  results.frequencyEscape=await frequency.evaluate(()=>({stillOpen:!!document.querySelector('[aria-label="Frequency Counter — Eagle"]'),observationSessions:JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-eagle')).observationSessions.length}));
  await frequency.close();
  const panels=await page();const ids=await panels.locator('article[aria-labelledby^="bl-tool-"]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-labelledby').replace('bl-tool-','').replace('-title','')));
  results.toolCount=ids.length;results.panelChecks=[];
  const skip=new Set(['analysis','observation','frequency','interval','choice']);
  for(const id of ids){if(skip.has(id))continue; const before=errors.length;
    try{await panels.locator(`[aria-labelledby="bl-tool-${id}-title"] button`).last().click({timeout:2000});
      const check=await panels.evaluate(()=>({text:document.body.textContent.slice(0,150),buttons:document.querySelectorAll('button').length}));
      results.panelChecks.push({id,...check,errors:errors.slice(before)});
      const back=panels.getByRole('button',{name:'Toggle active panel',exact:true});if(await back.count())await back.click();
    }catch(e){results.panelChecks.push({id,error:e.message.slice(0,350),errors:errors.slice(before)});break;}
  }
  await panels.close();results.errors=errors;await browser.close();fs.writeFileSync(path.join(out,'flow-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({...results,panelChecks:{tested:results.panelChecks.length,failures:results.panelChecks.filter(x=>x.error||x.errors.length)}},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
