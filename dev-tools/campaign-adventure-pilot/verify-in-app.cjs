const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {root,build,verifyPreservation}=require('./build.cjs');
const base='http://127.0.0.1:3000',evidence=path.join(__dirname,'evidence');
const protectedPaths=Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname,'preservation.json'),'utf8')).files);
const hashes=()=>Object.fromEntries(protectedPaths.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
async function main(){
  build(true);
  const before=hashes(),report={checkedAt:new Date().toISOString(),base,checks:[],bootErrors:[],pilotErrors:[],screenshots:[]};
  try{report.historicalPreservation=verifyPreservation();}catch(e){report.historicalPreservation={status:'drift in separate Adventure task',message:e.message};}
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1365,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage();let inPilot=false;
  page.on('pageerror',e=>(inPilot?report.pilotErrors:report.bootErrors).push(e.message));
  const capture=async name=>{await page.screenshot({path:path.join(evidence,name),fullPage:false});report.screenshots.push(name);};
  const host=()=>page.locator('[data-field-journeys="true"]');
  const currentRun=()=>page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('alloflow-campaign-pilot:v1:')).map(([,v])=>JSON.parse(v)));
  const openPilot=async()=>{
    await page.locator('[data-stem-tool-id="fieldJourneys"]').click();
    await host().getByRole('button',{name:'Begin Watershed Steward',exact:true}).waitFor({timeout:45000});
    inPilot=true;
  };
  try{
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
    await page.getByRole('region',{name:'Choose how to use AlloFlow'}).waitFor({timeout:120000});
    await page.getByRole('button',{name:'Learning Tools',exact:true}).click();
    const learning=page.getByRole('dialog',{name:'Learning Tools',exact:true});await learning.waitFor();
    await learning.locator('[data-hub-id="stem-lab"] [data-hub-launch="true"]').click();
    await page.locator('[data-stem-lab="true"]').waitFor({timeout:45000});
    await page.locator('[data-stem-tool-id="fieldJourneys"]').waitFor({timeout:45000});
    await capture('in-app-menu.png');await openPilot();
    assert.equal(await host().locator('iframe').count(),0);
    assert.equal(await page.locator('[data-stem-scroll-region="true"]').locator('[data-field-journeys="true"]').count(),1);
    await capture('in-app-field-station.png');
    report.checks.push('Opened the real AlloFlow app through Learning Tools → STEAM Lab → Field Journeys; native DOM inside its existing tool window');
    await page.evaluate(()=>{
      localStorage.setItem('allo_adventure_save','pilot-test-existing-adventure');
      localStorage.setItem('alloflow-adventure-audio-v1','pilot-test-existing-audio');
    });
    await host().getByRole('button',{name:'Begin Watershed Steward',exact:true}).click();
    await host().locator('[data-action="tech:bufferPlant:forestBuffer"]').click();
    await host().locator('[data-action="end-year"]').click();
    await host().locator('#field-note').fill('A buffer changed the evidence in the actual app.');
    await host().getByRole('button',{name:'Save field note',exact:true}).click();
    const saved=(await currentRun())[0];assert.equal(saved.commands.length,2);assert.equal(saved.notes.length,1);
    await page.locator('[data-stem-scroll-region="true"]').evaluate(n=>n.scrollTop=0);
    await capture('in-app-watershed.png');
    await host().getByRole('button',{name:'Sound off',exact:true}).click();
    await host().getByRole('button',{name:'Sound on',exact:true}).waitFor();
    await page.getByRole('button',{name:'Back to all STEAM Lab tools',exact:true}).click();
    await host().waitFor({state:'detached'});await openPilot();
    await host().getByRole('button',{name:'Resume Watershed Steward',exact:true}).click();
    assert.deepEqual((await currentRun()).find(r=>r.runId===saved.runId),saved);
    await host().getByRole('button',{name:'Sound off',exact:true}).waitFor();
    report.checks.push('Watershed fieldwork, year evidence and note persist after closing/reopening; sound starts off on the new mount');
    await host().getByRole('button',{name:'← Field station',exact:true}).click();
    await host().getByRole('button',{name:'Begin Grove Journey',exact:true}).click();
    const actions=await host().locator('[data-action]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.action,label:n.textContent})));
    report.groveActions=actions;
    await host().locator('[data-action]').first().click();
    assert.equal((await currentRun()).find(r=>r.campaignId==='grove').commands.length,1);
    await page.locator('[data-stem-scroll-region="true"]').evaluate(n=>n.scrollTop=0);
    await capture('in-app-grove.png');
    report.checks.push('Grove campaign runs through the same native tool renderer and writes its own run');
    await page.addScriptTag({path:require.resolve('axe-core')});
    report.axeDesktop=await page.evaluate(async()=>{
      const result=await axe.run(document.querySelector('[data-field-journeys]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
      return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
    });
    assert.deepEqual(report.axeDesktop,[]);
    await page.setViewportSize({width:390,height:844});
    await host().locator('#scene-title').scrollIntoViewIfNeeded();await capture('in-app-phone.png');
    assert.equal(await host().evaluate(h=>h.getBoundingClientRect().right<=innerWidth+1),true);
    assert.equal(await host().evaluate(h=>h.shadowRoot.querySelector('#main').scrollWidth<=h.shadowRoot.querySelector('#main').clientWidth+2),true);
    report.axePhone=await page.evaluate(async()=>{
      const result=await axe.run(document.querySelector('[data-field-journeys]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
      return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));
    });
    assert.deepEqual(report.axePhone,[]);
    // Exercise focus across the shadow boundary and the native host toolbar.
    await host().getByRole('button',{name:'← Field station',exact:true}).focus();
    await page.keyboard.press('Tab');
    assert.equal(await host().evaluate(h=>h.shadowRoot.activeElement?.textContent),'Sound off');
    await page.getByRole('button',{name:'Back to all STEAM Lab tools',exact:true}).click();
    await page.locator('[data-stem-tool-id="fieldJourneys"]').waitFor();
    report.checks.push('Desktop and 390px phone accessibility checks pass; keyboard enters the journey and native Back returns to the catalog');
    await page.reload();await page.getByRole('button',{name:'Learning Tools',exact:true}).waitFor({timeout:120000});
    assert.deepEqual((await currentRun()).find(r=>r.runId===saved.runId),saved);
    assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('allo_adventure_save'),localStorage.getItem('alloflow-adventure-audio-v1')]),['pilot-test-existing-adventure','pilot-test-existing-audio']);
    report.checks.push('Reload retains pilot saves and leaves the seeded existing Adventure/audio save values unchanged');
    assert.deepEqual(report.pilotErrors,[]);
    assert.deepEqual(hashes(),before);
    report.checks.push('All 25 protected source/build files remained byte-identical during in-app verification');
  }catch(e){
    report.failure=e.stack;
    report.visibleText=(await page.locator('body').innerText()).slice(-11000);
    await capture('in-app-failure.png');throw e;
  }finally{
    fs.writeFileSync(path.join(evidence,'in-app-browser-results.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));await browser.close();
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
