const fs = require('node:fs');
const path = require('node:path');
require('esbuild').buildSync({ entryPoints: ['tests/e2e/helpers/stem_gl_harness.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(__dirname, 'harness.cjs'), external: ['@playwright/test'] });
const { GlHarness } = require('./harness.cjs');
const { chromium } = require('playwright');
const stage = process.argv[2] || 'before';
(async () => {
  const harness = new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});
  await harness.start();
  const browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
  const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors = []; page.on('pageerror',e=>errors.push(e.message));
  const results = [];
  try {
    await harness.mount(page,{anatomy:{}},undefined,{expectCanvas:false});
    await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
    async function record(name) {
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:path.join(__dirname,stage+'-'+name+'.png'),fullPage:true});
      const result = await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,modelTop:document.querySelector('[data-anatomy-model-shell]')?.getBoundingClientRect().top,text:document.querySelector('[data-anatomy-tool]').innerText}));
      results.push({name,...result});
      console.log(name,JSON.stringify({width:result.width,overflow:result.overflow,modelTop:result.modelTop}));
    }
    await record('desktop');
    await page.setViewportSize({width:390,height:844}); await record('phone');
    await page.setViewportSize({width:1440,height:1000});
    for (const tab of ['tour','quiz','flashcards','connections','spotter','pathways','homeoHunt','aiTutor','imaging','procedure']) {
      await page.evaluate(tab=>{window.__ctx.gradeLevel='College';window.__ctx.updateMulti('anatomy',{_activeTab:tab,_startHereDismissed:true});},tab);
      await record(tab);
    }
    fs.writeFileSync(path.join(__dirname,stage+'-audit.json'),JSON.stringify({results,errors},null,2));
  } finally {await harness.destroy(page);await browser.close();await harness.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
