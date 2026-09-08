const fs = require('fs');
const path = require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
(async()=>{
  const dir=path.resolve('reports/machinelab-visual-upgrade/pass2-interaction');fs.mkdirSync(dir,{recursive:true});
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1180,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('reports/machinelab-visual-upgrade/pass2-range-final/ml-shots.html')).href);
  const layouts=[];
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    await page.evaluate(()=>window.__mount({view:'range',animating:true,shotId:1,motionPref:'off'},{dark:false,contrast:false}));
    await page.waitForTimeout(800);
    layouts.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,canvas:!!document.querySelector('canvas'),guide:document.body.innerText.includes('The fading trail marks equal time steps.')})));
    await page.screenshot({path:path.join(dir,'range-'+width+'.png'),fullPage:true});
  }
  await page.setViewportSize({width:1180,height:1000});
  await page.evaluate(()=>window.__mount({view:'machines',bench:'wedge'},{dark:true}));
  const run=page.getByRole('button',{name:/Run the three-dimensional demonstration/});
  await run.click();const started=await run.isDisabled();await page.waitForTimeout(700);
  await page.locator('canvas').first().screenshot({path:path.join(dir,'wedge-running.png')});
  await page.waitForTimeout(1900);const finished=!(await run.isDisabled());
  const report={errors,layouts,started,finished};fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2));
  await browser.close();console.log(JSON.stringify(report));
  if(errors.length||layouts.some(x=>x.overflow||!x.canvas||!x.guide)||!started||!finished)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
