'use strict';
// Focused browser QA for the aquarium/aquaculture learning tools. Uses local assets only.
// Usage: node dev-tools/aquatic_browser_qa.cjs [--label baseline] [--interactive]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => { const n = process.argv.indexOf(name); return n >= 0 ? process.argv[n + 1] : fallback; };
const label = arg('--label', 'current');
const OUT = path.join(ROOT, '.codex-artifacts', 'aquatic-qa', label);
fs.mkdirSync(OUT, { recursive: true });
const tools = [{ id: 'aquarium', file: 'stem_tool_aquarium.js' }, { id: 'aquacultureLab', file: 'stem_tool_aquaculture.js' }];
function harness(tool) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aquatic QA</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>html,body{margin:0;min-height:100%;font-family:system-ui,sans-serif;background:#f1f5f9;color:#0f172a}#root{box-sizing:border-box;margin:0 auto;max-width:1320px;padding:12px}*,*::before,*::after{box-sizing:border-box}</style></head><body><div id="root"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script>window.__events={errors:[],toasts:[],announcements:[]};window.addEventListener('error',e=>__events.errors.push(e.message));window.__toolData={};</script>
<script src="/stem_lab/${tool.file}"></script><script>
const noop=function(){};
const Icons=new Proxy({}, {get:function(){return function(){return React.createElement('span');};}});
function Host(){
const pair=React.useState(window.__toolData);window.__toolData=pair[0];window.__setToolData=pair[1];
const force=React.useReducer(x=>x+1,0)[1];
const update=function(tool,key,value){pair[1](function(old){let next={...old};next[tool]={...old[tool],[key]:typeof value==='function'?value(old[tool]&&old[tool][key]):value};return next;});};
const ctx={React:React,toolData:pair[0],setToolData:pair[1],labToolData:pair[0],setLabToolData:pair[1],update: update,forceUpdate:force,
updateMulti:function(tool,patch){pair[1](old=>({...old,[tool]:{...old[tool],...patch}}));},
theme:'light',isDark:false,isContrast:false,gradeBand:'g68',gradeLevel:'7th Grade',stemLabTab:'explore',stemLabTool:'${tool.id}',toolSnapshots:[],props:{},srOnly:{},icons:Icons,
setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,addToast:function(m){__events.toasts.push(m);},announceToSR:function(m){__events.announcements.push(m);},awardXP:noop,getXP:function(){return 0;},beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,
callGemini:null,callTTS:null,callImagen:null,callGeminiVision:null,a11yClick:function(f){return {onClick:f};},
t:function(k,fb){return fb!=null?fb:String(k).split('.').pop().replace(/_/g,' ');}};
return window.StemLab._registry['${tool.id}'].render(ctx);
}
window.__root=ReactDOM.createRoot(document.getElementById('root'));window.__root.render(React.createElement(Host));
</script></body></html>`;
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const tool=tools.find(t=>url.pathname==='/qa/'+t.id);
 if(tool){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(harness(tool));return;}
 const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 try{const data=await fs.promises.readFile(file);res.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'application/octet-stream'});res.end(data);}catch(e){res.writeHead(404);res.end();}
});
async function inspect(page,name){
 await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});
 const data=await page.evaluate(()=>{
 const visible=e=>{for(let p=e.parentElement;p;p=p.parentElement){if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector(':scope > summary')?.contains(e))return false;}const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
 const nodes=Array.from(document.querySelectorAll('body *'));
 return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
 landmarks:Object.fromEntries(['[data-aquarium-next-step]','[data-aquarium-live-tank]','#aquarium-care-actions','#aquarium-systems-investigation','.aq-investigation-loop'].map(selector=>{const e=document.querySelector(selector);return [selector,e?{top:Math.round(e.getBoundingClientRect().top+scrollY),height:Math.round(e.getBoundingClientRect().height)}:null];})),
 headings:Array.from(document.querySelectorAll('h1,h2,h3')).filter(visible).map(e=>e.textContent),
 buttons:Array.from(document.querySelectorAll('button')).filter(visible).map(e=>({text:e.innerText,aria:e.getAttribute('aria-label'),disabled:e.disabled})),
 overflow:nodes.filter(e=>visible(e)&&e.getBoundingClientRect().right>innerWidth+2).slice(0,25).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',text:e.textContent.slice(0,120),right:Math.round(e.getBoundingClientRect().right)})),
 unnamedControls:Array.from(document.querySelectorAll('button,input,select,textarea')).filter(visible).filter(e=>!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.innerText||e.title||(e.labels&&e.labels.length))).map(e=>e.outerHTML.slice(0,220)),errors:window.__events.errors,bodyText:document.body.innerText};
 });
 fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(data,null,2));
 return data;
}
async function verifyEvidenceV2(page,width){
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
 const results=[];
 const parkedPrediction='Draft prediction: a small oxygen change may reduce resilience.';
 const parkedObservation='Draft reflection: compare dissolved oxygen measurements while the other inputs are held steady.';
 await page.locator('#aq-eco-prediction').fill(parkedPrediction);
 await page.locator('#aq-eco-observation').fill(parkedObservation);
 await page.locator('#aq-eco-oxygen').focus();await page.locator('#aq-eco-oxygen').press('ArrowLeft');
 const beforeReplay=await stored();
 const immutableRecord=JSON.stringify(beforeReplay.experiments[0]);
 const savedReviewCard=page.locator('article.aq-experiment-record').first();
 const savedDetails=savedReviewCard.locator('details.aq-saved-inputs');
 await savedDetails.locator(':scope > summary').focus();await savedDetails.locator(':scope > summary').press('Enter');
 assert(await savedDetails.evaluate(e=>e.open),'Saved settings disclosure does not open by keyboard');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Saved settings cause horizontal overflow');
 await savedReviewCard.screenshot({path:path.join(OUT,'aquacultureLab-'+width+'-saved-settings.jpg'),type:'jpeg',quality:85});
 await savedDetails.locator(':scope > summary').press('Enter');
 const replay=page.getByRole('button',{name:/^Replay experiment/}).first();
 await replay.focus();await replay.press('Enter');
 await page.getByRole('button',{name:'Return to my draft',exact:true}).waitFor();
 const replayState=await stored();
 assert(replayState.parkedDraft,'Replay did not park the current draft');
 assert(JSON.stringify(replayState.water)===JSON.stringify(beforeReplay.experiments[0].currentScenario.water),'Replay did not restore saved water inputs');
 assert(JSON.stringify(replayState.experiments[0])===immutableRecord,'Replay changed the immutable evidence record');
 await page.reload();
 await page.getByRole('button',{name:'Return to my draft',exact:true}).waitFor();
 await page.getByRole('button',{name:'Return to my draft',exact:true}).click();
 const returned=await stored();
 assert(returned.prediction===parkedPrediction&&returned.observation===parkedObservation,'Return to draft lost the parked writing');
 assert(JSON.stringify(returned.water)===JSON.stringify(beforeReplay.water),'Return to draft lost the parked water settings');
 results.push('Replay is keyboard accessible, leaves evidence immutable, survives reload, and restores the parked draft');
 const failedDraft='Unsaved storage probe: lower oxygen should reduce the minimum oxygen available to organisms.';
 const beforeFailure=await stored();
 const beforeVisible=await page.getByRole('button',{name:/^Replay experiment/}).count();
 await page.evaluate(()=>{window.__qaOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('QA simulated quota exceeded','QuotaExceededError');};});
 await page.locator('#aq-eco-observation').fill(failedDraft);
 await page.getByRole('button',{name:'Save snapshot evidence',exact:true}).click();
 assert(await page.locator('#aq-eco-observation').inputValue()===failedDraft,'Failed save cleared the current draft');
 assert((await stored()).experiments.length===beforeFailure.experiments.length,'Failed save changed durable evidence');
 assert(await page.getByRole('button',{name:/^Replay experiment/}).count()===beforeVisible,'Failed save created a visible ghost record');
 await page.getByRole('button',{name:'Retry device save',exact:true}).waitFor();
 await inspect(page,'aquacultureLab-'+width+'-storage-warning');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download current backup',exact:true}).click();
 const download=await downloadPromise;
 const backupPath=path.join(OUT,'aquaculture-backup-storage-failure-'+width+'.json');
 await download.saveAs(backupPath);
 const findWorkspace=item=>{if(!item||typeof item!=='object')return null;if(item.ecosystemWorkspace)return item.ecosystemWorkspace;for(const value of Object.values(item)){const found=findWorkspace(value);if(found)return found;}return null;};
 const backup=findWorkspace(JSON.parse(fs.readFileSync(backupPath,'utf8')));
 assert(backup&&backup.observation===failedDraft,'Failure backup omits the current in-memory draft');
 assert(backup.experiments.length===beforeFailure.experiments.length,'Failure backup contains a ghost record');
 await page.evaluate(()=>{Storage.prototype.setItem=window.__qaOriginalSetItem;});
 await page.getByRole('button',{name:'Retry device save',exact:true}).click();
 assert((await stored()).observation===failedDraft,'Retry did not persist the current draft');
 results.push('Failed storage preserves writing/history, exports current backup, and retries successfully');
 await page.getByRole('button',{name:'Save snapshot evidence',exact:true}).click();
 const snapshotState=await stored();
 assert(snapshotState.experiments[0].currentScenario,'Snapshot does not include replayable settings');
 assert(snapshotState.experiments[0].prediction===parkedPrediction,'Snapshot does not preserve its prediction');
 const savedBeforeDelete=JSON.stringify(snapshotState.experiments[0]);
 const recordCard=page.locator('article').filter({has:page.getByRole('button',{name:/^Replay experiment/})}).first();
 await recordCard.getByRole('button',{name:/Remove/}).click();
 assert((await stored()).experiments.length===snapshotState.experiments.length-1,'Remove did not remove one record');
 const undo=page.getByRole('button',{name:'Undo remove',exact:true});
 await undo.focus();await undo.press('Enter');
 const undoState=await stored();
 assert(undoState.experiments.length===snapshotState.experiments.length,'Undo did not restore the record count');
 assert(undoState.experiments.some(record=>JSON.stringify(record)===savedBeforeDelete),'Undo changed the saved evidence');
 await inspect(page,'aquacultureLab-'+width+'-evidence-replayed');
 results.push('Snapshots preserve complete settings/prediction; remove and keyboard undo retain evidence');
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('aquacultureLab.state.v1'));const template=state.ecosystemWorkspace.experiments[0];state.ecosystemWorkspace.experiments=Array.from({length:12},(_,i)=>({...template,id:'qa-capacity-'+i}));state.ecosystemWorkspace.observation='Capacity probe: keep this draft when the twelve-record evidence log is full.';localStorage.setItem('aquacultureLab.state.v1',JSON.stringify(state));});
 await page.reload();
 const fullSave=page.getByRole('button',{name:'Save snapshot evidence',exact:true});
 const cappedDraft=await page.locator('#aq-eco-observation').inputValue();
 if(await fullSave.isEnabled())await fullSave.click();
 assert((await stored()).experiments.length===12,'A full log changed its record count');
 assert(await page.locator('#aq-eco-observation').inputValue()===cappedDraft,'A full log lost its current draft');
 results.push('A full twelve-record log preserves both existing evidence and the current draft');
 await page.getByRole('button',{name:'Comfortable text',exact:true}).click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Comfortable text creates horizontal overflow');
 assert(await page.getByRole('button',{name:'Comfortable text: On',exact:true}).getAttribute('aria-pressed')==='true','Comfortable text does not expose its active state');
 results.push('Comfortable reading mode remains responsive and exposes its selected state');
 return results;
}
async function probeEvidenceSemantics(page,width){
 const outcomes={};
 // Exercise actual native keyboard controls while inspecting the existing learning flow.
 await page.keyboard.press('/');
 outcomes.topicSearchShortcutFocus=await page.locator('#aq-topic-search').evaluate(e=>e===document.activeElement);
 await page.locator('#aq-topic-search').press('Escape');
 const group=page.getByRole('radiogroup',{name:'Ecosystem disturbance',exact:true});
 const selected=group.locator('[aria-checked="true"]');
 const firstChoice=await selected.textContent();
 await selected.focus();await selected.press('ArrowRight');
 const nextChoice=group.locator('[aria-checked="true"]');
 outcomes.disturbanceArrowChangesChoice=(await nextChoice.textContent())!==firstChoice;
 outcomes.disturbanceArrowRetainsFocus=await nextChoice.evaluate(e=>e===document.activeElement);
 const draft='Storage probe: oxygen changed after the disturbance; use those measurements to test the prediction.';
 await page.locator('#aq-eco-observation').fill(draft);
 const durableBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace.experiments.length);
 await page.evaluate(()=>{window.__qaOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('QA simulated quota exceeded','QuotaExceededError');};});
 await page.getByRole('button',{name:'Save snapshot evidence',exact:true}).click();
 outcomes.failedSave={draftPreserved:(await page.locator('#aq-eco-observation').inputValue())===draft,storedRecordCount:await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace.experiments.length),durableBefore};
 const observed=await inspect(page,'aquacultureLab-'+width+'-storage-failure-probe');
 outcomes.failedSave.liveAnnouncement=await page.locator('#allo-live-aq').textContent();
 outcomes.failedSave.visibleFailureNotice=/could not save|couldn't save|not saved|save failed/i.test(observed.bodyText);
 await page.evaluate(()=>{Storage.prototype.setItem=window.__qaOriginalSetItem;});
 await page.reload();
 outcomes.failedSave.afterReloadDraft=await page.locator('#aq-eco-observation').inputValue();
 fs.writeFileSync(path.join(OUT,'aquacultureLab-'+width+'-semantics-probe.json'),JSON.stringify(outcomes,null,2));
 return outcomes;
}
async function interact(page,tool,width){
 const assert=(value,message)=>{if(!value)throw new Error(message);};
 const capture=async(name)=>{const d=await inspect(page,tool.id+'-'+width+'-'+name);assert(!d.errors.length,'Browser error: '+d.errors.join('; '));assert(d.scrollWidth<=width,'Horizontal overflow on '+name+': '+d.scrollWidth);return d;};
 const checks=[];
 if(tool.id==='aquacultureLab'){
  const startInvestigation=page.getByRole('button',{name:'Start an ecosystem investigation',exact:true});
  const startControl=await startInvestigation.isVisible()?startInvestigation:page.getByRole('button',{name:'Ecosystem builder',exact:true});
  await startControl.focus();await startControl.press('Enter');
  await page.locator('.aq-investigation-loop').waitFor();
  await capture('builder');
  await page.locator('#aq-eco-prediction').fill('If I lower starting oxygen, the lowest oxygen will drop because less is available to the community.');
  await page.getByRole('button',{name:'Begin comparison with this design',exact:true}).click();
  assert(await page.getByRole('heading',{name:'Change one input',exact:true}).isVisible(),'Missing stage 2');
  await page.locator('#aq-eco-observation').fill('Scenario B has a lower dissolved oxygen minimum than A. The comparison supports my prediction.');
  assert(await page.getByRole('button',{name:'Save A/B comparison',exact:true}).isDisabled(),'Unchanged A/B comparison can be saved');
  checks.push('Unchanged A/B save guarded');
  await page.getByRole('button',{name:'Try changing starting oxygen',exact:true}).click();
  assert(await page.locator('#aq-eco-oxygen').evaluate(e=>e===document.activeElement),'Oxygen CTA does not focus the slider');
  const original=await page.locator('#aq-eco-oxygen').inputValue();
  await page.locator('#aq-eco-oxygen').press('ArrowLeft');
  assert(await page.locator('.aq-loop-changes').innerText().then(t=>t.includes('One input changed')),'Missing single-input feedback');
  await page.getByRole('button',{name:'Restore inputs from A',exact:true}).click();
  assert(await page.locator('#aq-eco-oxygen').inputValue()===original,'Restore A does not restore oxygen');
  checks.push('One-input feedback and restore A work');
  await page.locator('#aq-eco-oxygen').press('ArrowLeft');
  await page.getByRole('button',{name:'Explain and save the comparison',exact:true}).click();
  assert(await page.locator('#aq-eco-observation').evaluate(e=>e===document.activeElement),'Explain CTA does not focus the observation');
  await page.getByRole('button',{name:'Save A/B comparison',exact:true}).click();
  await page.getByRole('heading',{name:'Evidence saved',exact:true}).waitFor();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')));
  const record=state.ecosystemWorkspace.experiments[0];
  assert(record.currentScenario&&record.baselineScenario&&record.prediction,'Comparison omits saved input scenarios or prediction');
  await page.locator('.aq-investigation-loop').scrollIntoViewIfNeeded();
  await capture('comparison-saved');
  await page.reload();
  await page.getByRole('heading',{name:'Evidence saved',exact:true}).waitFor();
  checks.push('A/B evidence saves complete scenarios and survives reload');
  await page.getByRole('button',{name:'Start another investigation',exact:true}).click();
  assert(await page.locator('#aq-eco-prediction').isVisible(),'New investigation does not return to prediction');
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')));
  assert(after.ecosystemWorkspace.experiments.length===1,'Starting next investigation loses saved evidence');
  checks.push('Next investigation preserves saved evidence');
  if(process.argv.includes('--probe-semantics'))checks.push(await probeEvidenceSemantics(page,width));
  if(process.argv.includes('--evidence-v2'))checks.push(...await verifyEvidenceV2(page,width));
 }else{
  await page.getByRole('button',{name:/Select tank:.*Freshwater Community/}).click();
  await page.locator('[data-aquarium-observation-loop]').waitFor();
  const hideLessons=page.getByRole('button',{name:'Hide learning path',exact:true});if(await hideLessons.isVisible())await hideLessons.click();
  await page.evaluate(()=>scrollTo(0,0));
  await capture('active-tank');
  if(process.argv.includes('--aquarium-v2')){
   const systemPanel=page.locator('#aquarium-systems-investigation');
   const lifeSupport=page.locator('#aquarium-life-support');
   assert(!await systemPanel.evaluate(e=>e.open),'Systems map is not collapsed on entry');
   assert(!await lifeSupport.evaluate(e=>e.open),'Advanced life support is not collapsed on entry');
   assert(await page.evaluate(()=>document.querySelector('[data-aquarium-live-tank]').compareDocumentPosition(document.querySelector('#aquarium-systems-investigation'))&Node.DOCUMENT_POSITION_FOLLOWING),'Systems map appears before the live tank');
   const initialStep=await page.evaluate(()=>window.__toolData._aquarium.tutorialStep||0);
   const recordEvidence=page.locator('[data-aquarium-next-step]').getByRole('button',{name:'Record evidence & continue',exact:true});
   await recordEvidence.focus();await recordEvidence.press('Enter');
   assert(await page.evaluate(()=>window.__toolData._aquarium.tutorialStep)===initialStep+1,'Recording fulfilled evidence did not advance the lesson');
   const addStock=page.locator('[data-aquarium-next-step]').getByRole('button',{name:'Add your first organism',exact:true});
   await addStock.focus();await addStock.press('Enter');
   assert(await page.locator('#aquarium-stock-selection').evaluate(e=>e===document.activeElement),'Next objective does not focus the stocking controls');
   const openSystems=page.getByRole('button',{name:'Systems investigation',exact:true});
   await openSystems.focus();await openSystems.press('Enter');
   assert(await systemPanel.evaluate(e=>e.open),'Systems CTA did not open the map');
   assert(await systemPanel.locator(':scope > summary').evaluate(e=>e===document.activeElement),'Systems CTA did not focus its summary');
   await systemPanel.locator(':scope > summary').press('Enter');
   assert(!await systemPanel.evaluate(e=>e.open),'Systems disclosure does not close by keyboard');
   await lifeSupport.locator(':scope > summary').focus();await lifeSupport.locator(':scope > summary').press('Enter');
   assert(await lifeSupport.evaluate(e=>e.open),'Life support disclosure does not open by keyboard');
   await lifeSupport.locator(':scope > summary').press('Enter');
   checks.push('Tank and daily care precede collapsed maps; keyboard disclosures and objective evidence advance correctly');
  }
  const before=await page.evaluate(()=>window.__toolData._aquarium.simTick||0);
  await page.getByRole('button',{name:'Pause and observe one aquarium hour',exact:true}).click();
  const after=await page.evaluate(()=>window.__toolData._aquarium);
  assert(after.simTick===before+1,'Observe +1 h did not advance exactly one hour');
  assert(after.simRunning===false,'Observe +1 h did not pause the simulation');
  await page.getByRole('button',{name:'Save baseline',exact:true}).click();
  assert(await page.evaluate(()=>!!window.__toolData._aquarium.observationBaseline),'Baseline was not saved');
  await page.evaluate(()=>window.__setToolData(old=>({...old,_aquarium:{...old._aquarium,simHour:23,simDay:2,simRunning:false}})));
  await page.getByRole('button',{name:'Pause and observe one aquarium hour',exact:true}).click();
  const midnight=await page.evaluate(()=>window.__toolData._aquarium);
  assert(midnight.simHour===0&&midnight.simDay===3,'Midnight rollover failed');
  await page.getByRole('button',{name:'Pause and observe one aquarium hour',exact:true}).click();
  const nextHour=await page.evaluate(()=>window.__toolData._aquarium);
  assert(nextHour.simHour===1&&nextHour.simDay===3,'Midnight reset back to 8am');
  checks.push('Midnight advances 23:00 → 00:00 → 01:00 with one day change');
  assert(await page.getByRole('button',{name:/Baseline .*; change .*Show chemistry details/}).count()===8,'Chemistry cards omit baseline deltas');
  await page.getByRole('button',{name:'Open lesson notebook',exact:true}).click();
  await page.locator('#aquarium-note-prediction').waitFor({state:'visible'});
  assert(await page.locator('#aquarium-note-prediction').evaluate(e=>e===document.activeElement),'Notebook CTA does not focus prediction');
  checks.push('Starter tank, exact one-hour observation, baseline deltas and lesson notebook focus work');
  await page.getByRole('button',{name:/Marine Science/}).click();
  await page.getByRole('button',{name:'Marine Science Quiz',exact:true}).click();
  await page.getByText(/Which organism matches this habitat field note/).waitFor();
  await capture('marine-quiz');
  const correctAnswer=await page.evaluate(()=>window.__toolData._aquarium.quizQ.answer);
  await page.getByRole('button',{name:'Select answer: '+correctAnswer,exact:true}).click();
  const quiz=await page.evaluate(()=>window.__toolData._aquarium.quizQ);
  assert(quiz.correct===true&&quiz.explanation,'Quiz correct answer does not provide feedback');
  await page.getByRole('button',{name:'Next Question',exact:true}).waitFor();
  await capture('marine-feedback');
  checks.push('Marine habitat quiz matches answer type, scores correctly and explains feedback');
 }
 return {tool:tool.id,width,screen:'interaction',checks};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 let browser;
 const report=[];
 try{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const width of [1440,390].filter(w=>!arg('--width','')||String(w)===arg('--width','')))for(const tool of tools.filter(t=>!arg('--tool','')||t.id===arg('--tool',''))){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/qa/'+tool.id);await page.waitForSelector('#root button',{timeout:20000});
 let data=await inspect(page,tool.id+'-'+width+'-entry');
 report.push({tool:tool.id,width,screen:'entry',scrollHeight:data.scrollHeight,scrollWidth:data.scrollWidth,overflow:data.overflow,unnamedControls:data.unnamedControls,errors:[...errors,...data.errors],headings:data.headings,buttons:data.buttons});
 if(process.argv.includes('--interactive')){try{report.push(await interact(page,tool,width));}catch(e){report.push({tool:tool.id,width,screen:'interaction',failure:e.message});await inspect(page,tool.id+'-'+width+'-failure');}}
 await context.close();
 }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
 if(report.some(r=>r.failure||(r.errors&&r.errors.length)||(r.scrollWidth&&r.scrollWidth>r.width)))process.exitCode=1;
 console.log(JSON.stringify({output:OUT,report:report.map(r=>({...r,buttons:r.buttons?.filter(b=>b.text).length,headings:r.headings,unnamedControls:r.unnamedControls?.length}))},null,2));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});















