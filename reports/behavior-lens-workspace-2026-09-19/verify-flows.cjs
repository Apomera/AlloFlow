const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const preview=fs.readFileSync(path.join(__dirname,'preview.html'),'utf8').replace("{id:'audit-eagle',name:'Eagle'}", "{id:'audit-eagle',name:'Eagle'},{id:'audit-falcon',name:'Falcon'}").replace('dashboardData:null','dashboardData:[{studentNickname:"Eagle"},{studentNickname:"Falcon"}]');
 fs.writeFileSync(path.join(__dirname,'flow-preview.html'),preview);
 const browser=await chromium.launch({headless:true});const results=[];
 for(const width of [1280,390,320]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'flow-preview.html')).href);
  await page.getByRole('button',{name:'Add observation',exact:true}).waitFor();
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  await page.addScriptTag({path:require.resolve('axe-core')});
  async function capture(state) {
   await page.locator('[data-bl-panel-content]').evaluate(el=>el.scrollTop=0);
   await page.screenshot({path:path.join(__dirname,`${state}-${width}.png`)});
   const metrics=await page.evaluate(async()=>({buttons:[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length&&e.checkVisibility()).length,tools:document.querySelectorAll('article[aria-labelledby^="bl-tool-"]').length,overflow:document.documentElement.scrollWidth>innerWidth,axe:(await axe.run(document.querySelector('#root'))).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}));
   results.push({width,state,errors:[...errors],...metrics});assert.equal(metrics.overflow,false);assert.deepEqual(metrics.axe,[]);assert.deepEqual(errors,[]);
  }
  await capture('today');
  await page.getByRole('button',{name:'Define a target',exact:true}).click();
  await page.getByLabel('Short target name',{exact:true}).fill('Requests help');
  await page.getByLabel('Observable definition',{exact:true}).fill('Says help or presents a help card during a task.');
  await page.getByRole('button',{name:'Back to BehaviorLens tools',exact:true}).click();
  await page.getByRole('button',{name:'Continue definition',exact:true}).click();
  assert.equal(await page.getByLabel('Short target name',{exact:true}).inputValue(),'Requests help');
  await capture('definition');
  await page.getByRole('button',{name:'Save target and add note',exact:true}).click();
  await page.getByRole('dialog',{name:'New ABC entry',exact:true}).waitFor();
  await page.getByRole('button',{name:'Keep draft and close',exact:true}).click();
  await page.getByRole('button',{name:'Definitions (1)',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'Operational definition for Requests help',exact:true}).inputValue(),'Says help or presents a help card during a task.');
  await page.getByRole('button',{name:'Back to BehaviorLens tools',exact:true}).click();
  await page.getByRole('button',{name:'All tools',exact:true}).click();
  await capture('library');
  assert.equal(await page.locator('article[aria-labelledby^="bl-tool-"]').count(),101);
  await page.getByRole('button',{name:'Today',exact:true}).click();
  await page.getByRole('combobox',{name:'Choose a student',exact:true}).selectOption('Falcon');
  await page.getByRole('button',{name:'Define a target',exact:true}).click();
  assert.equal(await page.getByLabel('Short target name',{exact:true}).inputValue(),'');
  await page.getByRole('button',{name:'Back to BehaviorLens tools',exact:true}).click();
  await page.getByRole('button',{name:'Family Mode',exact:true}).click();
  await page.getByRole('button',{name:'Add home observation',exact:true}).waitFor();
  await capture('family');
  await page.close();
 }
 await browser.close();fs.writeFileSync(path.join(__dirname,'flow-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
