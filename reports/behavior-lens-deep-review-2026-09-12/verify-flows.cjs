const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const out=path.join(__dirname,'implementation');
const results={errors:[]};
async function main(){
  const seed=`localStorage.clear();sessionStorage.clear();localStorage.setItem('bl_onboarded','1');localStorage.setItem('bl_ai_consent_v1','1');localStorage.setItem('bl_student_roster',JSON.stringify([{id:'audit-eagle',name:'Eagle'},{id:'audit-falcon',name:'Falcon'}]));
  for (const [id,name] of [['audit-eagle','Eagle'],['audit-falcon','Falcon']]) localStorage.setItem('behaviorLens_workspace_'+id,JSON.stringify({version:4,student:name,studentId:id,savedAt:new Date().toISOString(),abcEntries:[1,2,3].map(i=>({id:id+'-'+i,timestamp:'2026-09-12T12:0'+i+':00.000Z',antecedent:'Unfamiliar multi-step worksheet',behavior:'Asks for another explanation',consequence:'Adult rephrased the directions',intensity:null,phase:'Baseline',tags:['preserve'],metadata:{audit:true}})),observationSessions:[],sessionHistory:[]}));
  window.callGemini=prompt=>{window.auditLastPrompt=prompt;window.auditAiCalls=(window.auditAiCalls||0)+1;return new Promise(resolve=>window.auditResolveAI=resolve)};`;
  const html=fs.readFileSync(path.join(out,'preview.html'),'utf8').replace("localStorage.clear();localStorage.setItem('bl_student_roster',JSON.stringify([{id:'audit-eagle',name:'Eagle'}]));",seed).replace('dashboardData:null','dashboardData:[{studentNickname:"Eagle"},{studentNickname:"Falcon"}]');
  fs.writeFileSync(path.join(out,'flow-preview.html'),html);
  const browser=await chromium.launch({headless:true});
  async function page(width=1280){const p=await browser.newPage({viewport:{width,height:900}});p.setDefaultTimeout(30000);p.on('pageerror',e=>results.errors.push(e.message));await p.goto(pathToFileURL(path.join(out,'flow-preview.html')).href,{waitUntil:'domcontentloaded',timeout:60000});await p.getByRole('button',{name:'Close BehaviorLens',exact:true}).waitFor();await p.getByRole('button',{name:/Full Student Summary/}).waitFor();return p;}
  async function open(p,id){const card=p.locator(`[aria-labelledby="bl-tool-${id}-title"]`);await card.locator('button').last().click();}
  try {
    const ai=await page();await ai.getByRole('button',{name:/Full Student Summary/}).click();await ai.waitForFunction(()=>window.auditAiCalls===1);
    await ai.getByRole('combobox',{name:'Choose a student'}).selectOption('Falcon');await ai.getByRole('button',{name:'Switch to student Eagle',exact:true}).waitFor();
    await ai.evaluate(()=>window.auditResolveAI('EAGLE OLD SUMMARY'));await ai.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    if(await ai.getByText('EAGLE OLD SUMMARY',{exact:true}).count())throw new Error('Stale summary was displayed');
    await ai.getByRole('button',{name:/Full Student Summary/}).click();await ai.waitForFunction(()=>window.auditAiCalls===2);await ai.evaluate(()=>window.auditResolveAI('FALCON CURRENT SUMMARY'));
    await ai.waitForFunction(()=>JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-falcon')).fullSummary==='FALCON CURRENT SUMMARY');
    results.ai=await ai.evaluate(()=>({selected:document.querySelector('select[aria-label="Choose a student"]').value,summary:JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-falcon')).fullSummary,oldSummaryVisible:document.body.textContent.includes('EAGLE OLD SUMMARY')}));await ai.close();
    const frequency=await page(390);await open(frequency,'frequency');const dialog=frequency.getByRole('dialog',{name:'Frequency Counter — Eagle',exact:true});await dialog.waitFor();
    await dialog.getByRole('button',{name:'Close Frequency Counter',exact:true}).focus();await frequency.keyboard.press('Shift+Tab');
    results.recordingFocus=await frequency.evaluate(()=>({label:document.activeElement.getAttribute('aria-label'),dialog:document.activeElement.closest('[role="dialog"]')?.getAttribute('aria-label')}));
    if(results.recordingFocus.dialog!=='Frequency Counter — Eagle')throw new Error('Focus escaped recording dialog');
    await dialog.getByRole('button',{name:'Add one to unlabeled behavior',exact:true}).click();await frequency.keyboard.press('Escape');
    await frequency.getByRole('button',{name:'Keep draft and close',exact:true}).click();await dialog.waitFor({state:'hidden'});await open(frequency,'frequency');await dialog.waitFor();
    results.recoveredCounter=await dialog.innerText();await dialog.getByRole('button',{name:'Start recording',exact:true}).waitFor();
    if(!results.recoveredCounter.includes('\n1\n'))throw new Error('Counter draft did not recover one event');
    await frequency.screenshot({path:path.join(out,'frequency-recovered-390.png')});await dialog.getByRole('button',{name:'Save',exact:true}).click();await dialog.waitFor({state:'hidden'});
    await frequency.waitForFunction(()=>JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-eagle')).observationSessions.length===1);
    results.savedRecording=await frequency.evaluate(()=>({saved:JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-eagle')).observationSessions[0],draftKeys:Object.keys(sessionStorage).filter(k=>k.includes('observation_draft'))}));await frequency.close();
    const abc=await page(390);await open(abc,'abc');await abc.locator('tbody button[aria-label="Toggle edit entry"]').first().click();const editor=abc.getByRole('dialog',{name:'Edit ABC entry',exact:true});await editor.waitFor();
    results.abcEditor=await editor.locator('input,textarea,select').evaluateAll(es=>es.map(e=>({label:e.getAttribute('aria-label'),value:e.value,type:e.type})));
    for(const value of ['Unfamiliar multi-step worksheet','Asks for another explanation','Adult rephrased the directions'])if(!results.abcEditor.some(e=>e.value===value))throw new Error('Missing editable narrative: '+value);
    await editor.getByRole('textbox',{name:'Additional notes',exact:true}).fill('Browser edit keeps metadata');await abc.screenshot({path:path.join(out,'abc-edit-390.png')});await editor.getByRole('button',{name:'Save Entry',exact:true}).click();await editor.waitFor({state:'hidden'});
    await abc.waitForFunction(()=>JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-eagle')).abcEntries.some(e=>e.notes==='Browser edit keeps metadata'));
    results.editedEntry=await abc.evaluate(()=>JSON.parse(localStorage.getItem('behaviorLens_workspace_audit-eagle')).abcEntries.find(e=>e.notes==='Browser edit keeps metadata'));
    if(results.editedEntry.phase!=='Baseline'||!results.editedEntry.metadata.audit||results.editedEntry.intensity!==null)throw new Error('ABC edit changed non-edited data');await abc.close();
    const panels=await page();const ids=await panels.locator('article[aria-labelledby^="bl-tool-"]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-labelledby').replace('bl-tool-','').replace('-title','')));results.panels=[];
    for(const id of ids){if(['analysis','observation','frequency','interval','choice'].includes(id))continue;await open(panels,id);results.panels.push({id,heading:await panels.locator('#behavior-lens-dialog-subtitle').textContent()});await panels.getByRole('button',{name:'Back to BehaviorLens tools',exact:true}).click();}
    await panels.close();results.success=results.errors.length===0;
  } finally {await browser.close();fs.writeFileSync(path.join(out,'flow-results.json'),JSON.stringify(results,null,2));}
  console.log(JSON.stringify({success:results.success,ai:results.ai,recordingFocus:results.recordingFocus,recordingDraftsAfterSave:results.savedRecording?.draftKeys,metadataPreserved:results.editedEntry?.metadata,panels:results.panels?.length,errors:results.errors},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
