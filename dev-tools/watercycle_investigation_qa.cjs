'use strict';
// Live React/browser acceptance check for the connected storm investigation.
// Run: node dev-tools/watercycle_investigation_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-implementation-review');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water investigation QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({content:read(file)});
    await page.evaluate(()=>{
      const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
      window.mountWater=function(seed,dark=false){
        function Host(){
          const [data,setData]=React.useState({waterCycle:seed});
          window.waterReviewData=data.waterCycle;
          window.waterReviewSet=setData;
          const noop=()=>{};
          return window.StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:dark,isContrast:false,gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,
            setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,
            beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});
        }
        document.documentElement.classList.toggle('dark',dark);
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
      };
      window.mountWater({});
    });
    await page.addScriptTag({content:read('desktop/web-app/node_modules/axe-core/axe.min.js')});
    async function auditInvestigation() {
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-investigation'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[], 'Investigation accessibility including contrast');
    }
    const click=name=>page.getByRole('button',{name,exact:true}).click();
    const step=async name=>{await page.waitForSelector('[data-investigation-step="'+name+'"]'); await auditInvestigation();};
    await page.waitForSelector('#wcCanvas');
    const bounds=await page.locator('#wcCanvas').boundingBox();
    assert(bounds.y<450,'Explorer canvas must begin in the first viewport: '+JSON.stringify(bounds));
    await page.screenshot({path:path.join(out,'explorer-desktop.png')});
    await click('Start investigation'); await step('predict');
    assert(await page.getByRole('button',{name:'Save prediction and observe',exact:true}).isDisabled());
    await page.getByRole('radio',{name:'Less runoff',exact:true}).check();
    await click('Save prediction and observe'); await step('storm');
    await click('Record storm and follow the water'); await step('observe');
    const data=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.waterReviewData)));
    const storm=(await data()).wcInvestigation.storm;
    assert.equal((await data()).landRainIntensity,storm.rain);
    assert(storm.rain >= 0 && storm.rain <= 100, 'Rain input uses the 0–100 model scale');
    assert.equal(storm.rain, await page.evaluate(config=>WaterCyclePrecipitationKernel.compute(config).relativeIntensity,storm.config));
    await click('Trace a droplet');
    assert.equal((await data()).journeyActive,true);
    await click('Record urban baseline'); await step('plan');
    await click('Test forest cover'); await step('compare');
    const baseline=JSON.stringify((await data()).wcInvestigation.baseline);
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,landSaturation:99}})));
    assert(await page.getByRole('button',{name:'Record comparison and explain',exact:true}).isDisabled());
    await click('Restore fair test');
    assert.equal(JSON.stringify((await data()).wcInvestigation.baseline),baseline);
    await page.screenshot({path:path.join(out,'comparison-desktop.png')});
    await click('Record comparison and explain'); await step('explain');
    assert(await page.getByRole('button',{name:'Save explanation',exact:true}).isDisabled());
    await page.getByLabel('My explanation',{exact:true}).fill('Forest cover reduced runoff tendency and increased infiltration opportunity. Roots and cover change pathways. These indices cannot predict an actual flood.');
    await click('Save explanation'); await step('complete');
    const complete=(await data()).wcInvestigation;
    assert(complete.comparison.result.runoff<complete.baseline.result.runoff);
    assert(complete.comparison.result.infiltration>complete.baseline.result.infiltration);
    const downloadPromise=page.waitForEvent('download'); await click('Download evidence'); const download=await downloadPromise;
    await download.saveAs(path.join(out,'stormwater-investigation.txt'));
    const exported=fs.readFileSync(path.join(out,'stormwater-investigation.txt'),'utf8');
    assert(exported.includes(complete.reflection));
    assert(exported.includes('urban')&&exported.includes('forest'));
    await page.getByRole('button',{name:/^Storm Lab\./}).click();
    assert.equal((await data()).wcInvestigation.step,'complete');
    await click('Return to investigation step');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      await page.evaluate(()=>mountWater({}));
      await page.screenshot({path:path.join(out,'explorer-'+width+'.png'),fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow at '+width);
      await page.evaluate(seed=>mountWater({wcInvestigation:seed}),complete);
      await page.locator('.wc-investigation-notebook summary').click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No notebook overflow at '+width);
    }
    await page.setViewportSize({width:1280,height:900});
    await page.evaluate(seed=>mountWater({wcInvestigation:seed},true),complete);
    await page.screenshot({path:path.join(out,'evidence-dark.png')});
    await auditInvestigation();
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#slot'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
    assert.deepEqual(violations,[],'Evidence UI structural accessibility');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: complete investigation, fair-test rejection/restoration, frozen evidence, export, mode persistence, desktop scene placement, 320/390px overflow, and axe structure.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
