const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');
(async()=>{let browser;const dir=__dirname;try {
browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1365,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('https://alloflow-cdn.pages.dev/app/',{waitUntil:'domcontentloaded',timeout:60000});
await page.locator('[data-pathway="guided"]').click({timeout:60000});
await page.getByRole('button',{name:'Teacher',exact:true}).click({timeout:45000});
await page.screenshot({path:path.join(dir,'public-teacher.png')});
const state={text:await page.locator('body').innerText(),errors};fs.writeFileSync(path.join(dir,'public-teacher.json'),JSON.stringify(state,null,2));console.log(JSON.stringify(state,null,2));
await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
const result=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,target:n.target,summary:n.failureSummary}))})),passes:r.passes.length,incomplete:r.incomplete.length};});
fs.writeFileSync(path.join(dir,'public-teacher-axe.json'),JSON.stringify(result,null,2));console.log('AXE',JSON.stringify(result,null,2));
}finally {if(browser)await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});