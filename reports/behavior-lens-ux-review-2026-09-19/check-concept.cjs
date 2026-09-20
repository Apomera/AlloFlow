const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
 const fragment=fs.readFileSync('C:/Users/cabba/.codex/visualizations/2026/09/19/01a0bb17-5fbe-7551-8ac6-f7b5cbf8b676/behavior-lens-direction.html','utf8');
 const browser=await chromium.launch({headless:true});
 const results=[];
 for(const width of [1024,320]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style>'+fragment);
  await page.screenshot({path:path.join(__dirname,`concept-${width}.png`),fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  await page.getByRole('button',{name:'Add observation',exact:true}).click();
  await page.locator('#bl-during').fill('Asked for help with the first sentence.');
  await page.getByRole('button',{name:'Keep draft & return',exact:true}).click();
  await page.getByRole('button',{name:'Record',exact:true}).click();
  const draft=await page.locator('#bl-during').inputValue();
  await page.getByRole('button',{name:'Save example observation',exact:true}).click();
  const saved=await page.locator('#bl-records').innerText();
  await page.getByRole('button',{name:'Support plan',exact:true}).click();
  await page.getByRole('button',{name:'Save example draft',exact:true}).click();
  results.push({width,overflow,errors,draftRetained:draft==='Asked for help with the first sentence.',exampleSaved:saved.includes(draft)});await page.close();
 }
 await browser.close();fs.writeFileSync(path.join(__dirname,'concept-check.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
