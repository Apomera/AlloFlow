const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:3000',dir=path.join(__dirname,'evidence');
async function main(){
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1365,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
 const page=await context.newPage(),report={checkedAt:new Date().toISOString(),checks:[],errors:[],screenshots:[]};
 page.on('pageerror',e=>report.errors.push(e.message));
 const host=()=>page.locator('[data-field-journeys]');
 const runs=()=>page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('alloflow-campaign-pilot:v1:')).map(([,v])=>JSON.parse(v)));
 const shot=async name=>{await page.screenshot({path:path.join(dir,name),fullPage:false});report.screenshots.push(name);};
 const snapshot=async()=>{
   const pending=page.waitForEvent('download');await host().getByRole('button',{name:'Download journal',exact:true}).click();
   const download=await pending,file=path.join(__dirname,'local-app','response-export.json');await download.saveAs(file);return JSON.parse(fs.readFileSync(file,'utf8'));
 };
 const hub=async kind=>{
   await page.goto(base,{waitUntil:'domcontentloaded'});const launch=page.getByRole('region',{name:'Choose how to use AlloFlow'});await launch.waitFor({timeout:120000});await launch.getByRole('button',{name:/^Learning Tools/}).click();
   const learning=page.getByRole('dialog',{name:'Learning Tools',exact:true});await learning.waitFor();await learning.locator('[data-hub-id]').first().waitFor();
   if(kind==='stem')await learning.locator('[data-hub-id="stem-lab"] [data-hub-launch="true"]').click();
   else{
     const ids=await learning.locator('[data-hub-id]').evaluateAll(ns=>ns.map(n=>n.dataset.hubId));
     const id=ids.find(id=>/sel/i.test(id));assert.ok(id,'SEL hub available: '+ids.join(','));
     await learning.locator('[data-hub-id="'+id+'"] [data-hub-launch="true"]').click();
     if(!(await page.evaluate(()=>sessionStorage.getItem('alloflow_sel_seen_ephemeral_explainer')==='1')))await page.locator('#sel-ephemeral-explainer-modal [data-primary-action]').click();
   }
 };
 const write=async(text,action)=>{
   await host().locator('#response-mode').selectOption('write');await host().locator('#written-response').fill(text);
   const sel=await host().getAttribute('data-journey-hub')==='sel';const before=JSON.stringify(sel?await snapshot():await runs());await host().getByRole('button',{name:'Review my response',exact:true}).click();
   assert.equal(JSON.stringify(sel?await snapshot():await runs()),before,'Review must not change a saved run');
   await host().locator('#response-action').selectOption(action);await host().getByRole('button',{name:'Confirm response and continue',exact:true}).click();
 };
 try{
   await hub('stem');await page.locator('[data-stem-tool-id="waterCycle"]').click();
   await page.getByRole('button',{name:'Play Watershed as a Field Journey',exact:true}).waitFor({timeout:45000});
   await page.getByRole('button',{name:'Play Watershed as a Field Journey',exact:true}).click();
   await host().getByRole('button',{name:'Begin Watershed Steward',exact:true}).waitFor({timeout:45000});
   assert.equal(await host().getByRole('button',{name:'Begin Grove Journey',exact:true}).count(),0);
   await host().getByRole('button',{name:'Return to Watershed tool',exact:true}).click();
   await page.getByRole('button',{name:'Play Watershed as a Field Journey',exact:true}).click();
   await host().getByRole('button',{name:'Begin Watershed Steward',exact:true}).click();
   assert.equal(await host().locator('#response-mode').inputValue(),'both');
   assert.equal(await host().locator('[data-action]').count()>0,true);await host().locator('#written-response').waitFor();
   await write('I would plant trees to make a buffer.','tech:bufferPlant:forestBuffer');
   let water=(await runs()).find(r=>r.campaignId==='watershed');assert.equal(water.version,2);assert.equal(water.responses[0].text,'I would plant trees to make a buffer.');
   await host().locator('#written-response').fill('Keep this draft while I look at the map.');
   await host().locator('[data-location]').first().click();
   assert.equal(await host().locator('#written-response').inputValue(),'Keep this draft while I look at the map.');
   await host().locator('#response-mode').selectOption('choices');assert.equal(await host().locator('#written-response').count(),0);
   await host().locator('#response-mode').selectOption('both');assert.equal(await host().locator('#written-response').inputValue(),'Keep this draft while I look at the map.');
   await host().locator('[data-action="end-year"]').click();
   water=(await runs()).find(r=>r.campaignId==='watershed');assert.equal(water.commands.length,2);assert.equal(water.responses.length,1);
   await host().locator('#response-mode').scrollIntoViewIfNeeded();await shot('responses-watershed.png');
   report.checks.push('Optional Watershed launch and return; Both default; written action confirmation; choices and writing in one run; drafts survive map and format changes');
   await page.getByRole('button',{name:'Back to all STEAM Lab tools',exact:true}).click();await page.locator('[data-stem-tool-id="fieldJourneys"]').click();
   await host().getByRole('button',{name:'Resume Watershed Steward',exact:true}).click();await host().getByText('I would plant trees to make a buffer.',{exact:true}).waitFor();
   assert.deepEqual((await runs()).find(r=>r.runId===water.runId),water);
   await host().getByRole('button',{name:'← Field station',exact:true}).click();await host().getByRole('button',{name:'Show all journeys',exact:true}).click();await host().getByRole('button',{name:'Begin Grove Journey',exact:true}).click();
   await write('Use the food to build roots for water.','roots');assert.equal((await runs()).find(r=>r.campaignId==='grove').responses.length,1);
   await host().locator('#response-mode').selectOption('choices');await host().locator('[data-action="reserve"]').click();
   report.checks.push('Written Watershed response survives native close/reopen; Grove also supports mixed response formats');
   await hub('sel');
   await page.locator('[data-sel-tool-card-id="practiceJourneys"]').waitFor({timeout:45000});await page.locator('[data-sel-tool-card-id="practiceJourneys"]').click();
   await host().getByRole('button',{name:'Begin Self-Advocacy Journey',exact:true}).waitFor({timeout:45000});
   assert.equal(await host().getByText('Journey needs recovery',{exact:true}).count(),0);
   await host().getByRole('button',{name:'Begin Self-Advocacy Journey',exact:true}).click();
   assert.equal(await host().locator('#response-mode').inputValue(),'both');
   await host().locator('#response-mode').selectOption('both');
   await page.addScriptTag({path:require.resolve('axe-core')});
   const axe=async()=>page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('[data-field-journeys]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});
   report.axeSELDesktop=await axe();assert.deepEqual(report.axeSELDesktop,[]);
   await host().locator('#written-response').fill('');await host().locator('#written-response').pressSequentially('Could I have a minute to think?',{delay:2});await host().getByRole('button',{name:'Review my response',exact:true}).click();
   assert.equal(await host().locator('#response-action').inputValue(),'thinking-time');
   await host().getByRole('button',{name:'Confirm response and continue',exact:true}).click();
   await write('Could you share the next steps in written notes?','written-checkin');
   await host().locator('#response-mode').selectOption('choices');await host().locator('[data-action="keep-boundary"]').click();
   await host().locator('#response-mode').selectOption('both');
   await host().locator('#response-mode').scrollIntoViewIfNeeded();await shot('responses-sel.png');
   await page.setViewportSize({width:390,height:844});await host().locator('#written-response').scrollIntoViewIfNeeded();await shot('responses-sel-phone.png');
   assert.equal(await host().evaluate(h=>h.getBoundingClientRect().right<=innerWidth+1),true);
   assert.equal(await host().evaluate(h=>{const n=h.shadowRoot.querySelector('#main');return n.scrollWidth<=n.clientWidth+2;}),true);
   report.axeSELPhone=await axe();assert.deepEqual(report.axeSELPhone,[]);
   // Keyboard reaches the review control from the written response.
   await host().locator('#written-response').focus();await page.keyboard.press('Tab');
   assert.equal(await host().evaluate(h=>h.shadowRoot.activeElement?.textContent),'Review my response');
   await write('I want to keep the support that worked.','keep-support');
   const original=await snapshot();assert.equal(original.commands.length,4);assert.equal(original.responses.length,3);
   await host().getByRole('button',{name:'Replay the latest encounter',exact:true}).click();
   const pendingBranch=await snapshot();assert.equal(pendingBranch.commands.length,3);assert.equal(pendingBranch.responses.length,2);
   await write('Let us change the support next time.','revise-support');
   const branch=await snapshot();assert.notEqual(branch.runId,original.runId);
   assert.equal(branch.responses.at(-1).text,'Let us change the support next time.');assert.equal(branch.responses.length,3);
   await host().getByRole('button',{name:'← Practice journeys',exact:true}).click();
   let resume=host().getByRole('button',{name:'Resume Self-Advocacy Journey',exact:true});assert.equal(await resume.count(),2);
   await resume.nth(1).click();assert.deepEqual(await snapshot(),original);
   await host().getByRole('button',{name:'Continue in Advocacy Practice',exact:true}).click();await host().waitFor({state:'detached'});
   await page.getByRole('button',{name:/^Back to (SEL )?tools$/i}).first().click();
   await page.locator('[data-sel-tool-card-id="practiceJourneys"]').click();
   await host().getByRole('button',{name:'Begin Self-Advocacy Journey',exact:true}).waitFor();
   assert.equal(await host().getByRole('button',{name:'Resume Self-Advocacy Journey',exact:true}).count(),2);
   assert.equal((await runs()).filter(r=>r.campaignId==='self-advocacy').length,0);
   report.checks.push('SEL mixes written and choice responses; replay retains both branches in the hub session; journal export preserves wording; related Advocacy Practice opens normally');
   await hub('sel');await page.locator('[data-sel-tool-card-id="practiceJourneys"]').click();
   await host().getByRole('button',{name:'Begin Self-Advocacy Journey',exact:true}).waitFor({timeout:45000});
   assert.equal(await host().getByRole('button',{name:'Resume Self-Advocacy Journey',exact:true}).count(),0);
   await host().locator('input[type="file"]').setInputFiles({name:'practice-journey.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(branch))});
   await host().getByRole('button',{name:'Download journal',exact:true}).waitFor();
   const imported=await snapshot();assert.deepEqual(imported.responses,branch.responses);assert.deepEqual(imported.commands,branch.commands);assert.notEqual(imported.runId,branch.runId);
   assert.equal((await runs()).filter(r=>r.campaignId==='self-advocacy').length,0);
   report.checks.push('SEL honors temporary-session policy after reload; importing a downloaded journal restores choices and words as a new run; no SEL written responses in browser storage; desktop/phone axe and keyboard checks pass');
   assert.equal(report.errors.length,0,report.errors.join('\\n'));report.ok=true;
 }catch(error){report.ok=false;report.failure=error.stack;report.text=(await page.locator('body').innerText()).slice(-5000);await shot('responses-failure.png');throw error;}
 finally{fs.writeFileSync(path.join(dir,'response-browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
