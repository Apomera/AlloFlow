const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),assert=require('assert');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 try{
  for(const width of [1280,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href);
   await page.getByRole('button',{name:'Try recall',exact:true}).first().click();
   await page.getByRole('button',{name:'Start recall practice',exact:true}).click();
   await page.getByRole('textbox',{name:/Recall response for/}).fill('A solid keeps its shape and volume.');
   await page.getByRole('button',{name:'Reveal the facts',exact:true}).click();
   for(const radio of await page.getByRole('radio',{name:/I recalled fact/}).all())await radio.check();
   await page.getByText('Use it in a new situation',{exact:true}).click();
   await page.getByRole('textbox',{name:'Your explanation',exact:true}).fill('A wooden block keeps its shape in both the jar and bowl.');
   await page.getByRole('button',{name:'Compare my explanation',exact:true}).click();
   await page.getByLabel('How did your explanation connect?',{exact:true}).selectOption('connected');
   await page.getByLabel('Review again on',{exact:true}).fill('2026-09-20');
   await page.getByRole('button',{name:'Save private practice plan',exact:true}).click();
   await page.getByText('Private practice plan saved.',{exact:true}).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Application overflow at '+width);
   await page.screenshot({path:path.join(__dirname,'application-'+width+'.png'),fullPage:true});
   await page.getByRole('button',{name:'Return to card',exact:true}).click();
   await page.getByText('All targets and practice',{exact:true}).click();
   assert.equal(await page.getByLabel('Review date for Solids keep their shape',{exact:true}).inputValue(),'2026-09-20');
   await page.getByLabel('Review date for Solids keep their shape',{exact:true}).fill('2026-09-22');
   await page.waitForFunction(() => JSON.stringify(window.AlloModules.MemoryAid._testing.loadMemoryAidPrivatePractice('resource:ux-review-fixture',window.fixture.data.cards,'memory-ux-review-only')).includes('2026-09-22'));
   await page.reload();await page.getByText('All targets and practice',{exact:true}).click();
   assert.equal(await page.getByLabel('Review date for Solids keep their shape',{exact:true}).inputValue(),'2026-09-22');
   await page.screenshot({path:path.join(__dirname,'overview-'+width+'.png'),fullPage:true});
   await page.getByText('Print and export options',{exact:true}).click();
   await page.getByLabel('Format',{exact:true}).selectOption('no-hints');
   const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Open export preview',exact:true}).click();const popup=await popupPromise;
   await popup.getByRole('heading',{name:'Recall worksheet — without hints',exact:true}).waitFor();
   const text=await popup.locator('body').innerText();assert(!text.includes('Solids keep'));assert(!text.includes('wooden block'));assert.equal(await popup.locator('img').count(),0);
   await popup.close();
   await page.addScriptTag({path:require.resolve('axe-core')});
   const audit=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});
   assert.equal(audit.filter(v=>v.impact==='critical'||v.impact==='serious').length,0,'Serious accessibility violations: '+JSON.stringify(audit));
   results.push({width,application:true,reviewDateSaved:true,reviewDateSurvivesReload:true,unsupportedExport:true,a11y:audit,errors});assert.deepEqual(errors,[]);await page.close();
  }
  const page=await browser.newPage({viewport:{width:1050,height:1000}});
  await page.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href+'?diagram=1');
  await page.addScriptTag({path:path.join(root,'doc_pipeline_module.js')});
  for(const preset of ['study','recall','no-hints','teacher']){
   const html=await page.evaluate(preset=>{const pipeline=window.AlloModules.createDocPipeline({callGemini:async()=>'{}',callGeminiVision:async()=>'{}',callImagen:async()=>null,addToast:()=>{},t:key=>key,isRtlLang:()=>false,updateExportPreview:()=>{},getDefaultTitle:()=> 'Memory Aid',state:{}});return pipeline.generateFullPackHTML([{...window.fixture,title:preset==='no-hints'?'Recall practice':window.fixture.title,data:{...window.fixture.data,memoryAidExportPreset:preset}}],'Remember states of matter',preset==='no-hints',{}, {includeTeacherKey:false,annotations:[]});},preset);
   fs.writeFileSync(path.join(__dirname,'export-'+preset+'.html'),html);
   const printPage=await browser.newPage({viewport:{width:1050,height:1000}});await printPage.setContent(html);await printPage.emulateMedia({media:'print'});
   assert(await printPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Print overflow');
   assert.equal(await printPage.locator('[role=dialog]').count(),0);assert.equal(await printPage.locator('script').count(),0);
   await printPage.screenshot({path:path.join(__dirname,'export-'+preset+'.png'),fullPage:true});
   if(preset==='no-hints'){const text=await printPage.locator('body').innerText();assert(!text.includes('Solid statue'));assert(!text.includes('Solids keep'));assert(!text.includes('Remember states of matter'));}
   await printPage.close();
  }
  await page.close();results.push({pipelinePrintPresets:['study','recall','no-hints','teacher']});
  fs.writeFileSync(path.join(__dirname,'followthrough-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
