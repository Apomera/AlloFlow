const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
async function main(){
  const browser=await chromium.launch({headless:true});
  const results=[];
  for(const [name,width,query] of [['desktop',1280,''],['phone',390,''],['small-phone',320,''],['compact-phone',390,'compact=1'],['student-framed-phone',390,'student-framed=1'],['design-phone',390,'family=design'],['teacher',1280,'teacher=1'],['setup-phone',390,'setup=1']]){
    const page=await browser.newPage({viewport:{width,height:900}});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href+'?'+query);
    await page.locator('#root').filter({has:page.locator('button')}).waitFor();
    await page.addScriptTag({path:require.resolve('axe-core')});
    const a11y=await page.evaluate(async()=>{const r=await axe.run(document.getElementById('root'));return r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    const metrics=await page.evaluate(()=>{const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const first=document.querySelector('textarea[id^="applied-workspace-"]')||document.querySelector('textarea[id^="applied-workspace-"]');return{viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,firstWorkspaceTop:first?Math.round(first.getBoundingClientRect().top+scrollY):null,visibleTextareas:[...document.querySelectorAll('textarea')].filter(visible).length,stepLabels:[...document.querySelectorAll('nav[aria-label="Workspace sections"] button')].map(e=>e.textContent),visibleHeadings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>e.textContent),overflowElements:[...document.querySelectorAll('#root *')].filter(e=>visible(e)&&e.getBoundingClientRect().right>innerWidth+2).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,90),right:Math.round(e.getBoundingClientRect().right)}))}});
    await page.screenshot({path:path.join(__dirname,name+'-top.png')});
    if(!query.includes('setup')&&!query.includes('teacher')){
      await page.locator('#challenge-workspace-heading').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(__dirname,name+'-workspace.png')});
      await page.getByRole('button',{name:'Next',exact:true}).click();
      metrics.nextFocus=await page.evaluate(()=>document.activeElement?.id);
      const active=page.locator('textarea[id^="applied-workspace-"]:visible');
      await active.fill('A student-authored review response.');
      metrics.responseRecorded=await page.evaluate(()=>JSON.stringify(window.reviewResponses).includes('A student-authored review response.'));
      metrics.prefilledQuestionProgress=await page.locator('[aria-label="Applied challenge workspace sections started"]').getAttribute('value');
      await page.getByRole('button',{name:'Show all steps',exact:true}).click();
      metrics.allVisiblePhases=await page.locator('textarea[id^="applied-workspace-"]:visible').count();
    }
    results.push({name,...metrics,a11y,errors}); await page.close();
  }
  await browser.close();fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(({name,viewportWidth,documentWidth,documentHeight,firstWorkspaceTop,visibleTextareas,nextFocus,responseRecorded,a11y,errors})=>({name,viewportWidth,documentWidth,documentHeight,firstWorkspaceTop,visibleTextareas,nextFocus,responseRecorded,a11y:a11y.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length})),errors})),null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
