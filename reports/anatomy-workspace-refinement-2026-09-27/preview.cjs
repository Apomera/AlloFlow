const fs=require('fs'),path=require('path');
const {GlHarness}=require('../anatomy-ux-review-2026-09-27/harness.cjs');
const {chromium}=require('playwright');
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
 await harness.start();const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const data=[];
 try{
 await harness.mount(page,{anatomy:{}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
 for(const width of [1440,390]){
 await page.setViewportSize({width,height:width===390?844:1000});await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(__dirname,'explore-'+width+'.png'),fullPage:true});
 data.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,modelTop:document.querySelector('[data-anatomy-model-shell]').getBoundingClientRect().top,fonts:[...document.querySelectorAll('.anatomy-explorer-nav label,.anatomy-explorer-nav button,.anatomy-body-title-heading,.anatomy-browser-preview')].slice(0,12).map(el=>({text:el.textContent.slice(0,35),font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize}))})));
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('#anatomy-explorer-level').selectOption('3');await page.locator('[data-anatomy-structure-option=skull]').click();
 await page.locator('[data-anatomy-structure-detail]').screenshot({path:path.join(__dirname,'detail-desktop.png')});
 data.push(await page.locator('[data-anatomy-structure-detail]').evaluate(el=>[...el.querySelectorAll('p,h4,button')].slice(0,25).map(el=>({text:el.textContent.slice(0,45),font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize}))));
 fs.writeFileSync(path.join(__dirname,'layout.json'),JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));
 }finally{await harness.destroy(page);await browser.close();await harness.stop()}
})().catch(e=>{console.error(e);process.exitCode=1});
