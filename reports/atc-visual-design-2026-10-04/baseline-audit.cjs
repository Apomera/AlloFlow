const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const {createFixtureServer,repo}=require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
const report={started:new Date().toISOString(),observations:[],errors:[],screenshots:[]};
const source=path.join(repo,'stem_lab/stem_tool_atctower.js');
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
const initialHash=hash();
async function capture(page,name){const file=path.join(__dirname,name+'.png');await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
async function note(page,width,view){report.observations.push(await page.evaluate(({width,view})=>({width,view,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,focus:{id:document.activeElement.id,tag:document.activeElement.tagName},radarTop:document.querySelector('canvas')?document.querySelector('canvas').getBoundingClientRect().top+scrollY:null,headings:[...document.querySelectorAll('h1,h2,h3,h4')].map(e=>({level:e.tagName,text:e.textContent,top:e.getBoundingClientRect().top+scrollY}))}),{width,view}));}
async function main(){
 const fixture=await createFixtureServer();const browser=await chromium.launch({channel:'chrome',headless:true});
 try{await Promise.all([1440,390,320].map(async width=>{
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(fixture.url);await page.getByRole('button',{name:'Start Tower Shift',exact:true}).waitFor();await note(page,width,'welcome');await capture(page,'before-welcome-'+width);
  await page.locator('#stem-atctower-tab-practice').click();await note(page,width,'pathway');await capture(page,'before-pathway-'+width);await page.locator('[data-atctower-practice-preview="crossing_priority"] summary').click();await capture(page,'before-pathway-preview-'+width);
  await page.locator('[data-atctower-practice-start="crossing_priority"]').click();await page.locator('[data-atctower-playing]').waitFor();await page.evaluate(()=>scrollTo(0,0));await note(page,width,'crossing-playing');await capture(page,'before-playing-'+width);await page.locator('#atc-aircraft-controls-title').scrollIntoViewIfNeeded();await capture(page,'before-controls-'+width);
  await page.goto(fixture.url);await page.locator('#stem-atctower-tab-practice').click();await page.locator('[data-atctower-practice-start="separation_recovery"]').click();await page.locator('[data-atctower-playing]').waitFor();await page.locator('[data-atctower-command="u"]').click();await page.locator('[data-atctower-command="pause"]').click();await page.locator('[data-atctower-exercise][data-exercise-status="complete"]').waitFor();await page.locator('[data-atctower-save-debrief]').click();await page.locator('[data-atctower-debrief]').waitFor();await page.evaluate(()=>scrollTo(0,0));await note(page,width,'completed-debrief');await capture(page,'before-completed-debrief-'+width);await page.close();
 }));}finally{await browser.close();await new Promise(resolve=>fixture.server.close(resolve));}
 report.completed=new Date().toISOString();report.sourceHash=initialHash;report.sourceStable=initialHash===hash();fs.writeFileSync(path.join(__dirname,'baseline-visual-findings.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.errors.length||!report.sourceStable)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
