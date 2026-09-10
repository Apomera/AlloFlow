'use strict';
// Live React/browser acceptance check for refined pilot controls.
// Run: node dev-tools/watercycle_pilot_controls_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-movement-review');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water pilot navigation QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({content:read(file)});
    await page.evaluate(()=>{
      const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
      window.mountWater=function(seed,dark=false){
        function Host(){
          const [data,setData]=React.useState({waterCycle:seed,_threeLoaded:true});
          window.waterReviewData=data.waterCycle;
          window.waterReviewSet=setData;
          const noop=()=>{};
          return window.StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:dark,isContrast:false,gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,
            setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,
            beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});
        }
        document.documentElement.classList.toggle('dark',dark);
        document.body.style.background=dark?'#0f172a':'#f1f5f9';
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
      };
      window.mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true}});
    });
    await page.addScriptTag({content:read('desktop/web-app/node_modules/axe-core/axe.min.js')});


    const canvas=page.locator('#wcPilotCanvas');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotCameraStartDistance);
    const step=page.getByRole('button',{name:'Tap steps',exact:true});
    await step.click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotMovementStyle==='tap');
    await page.locator('.wc-pilot-flight-options>summary').click();
    await page.getByRole('button',{name:'Look',exact:true}).click();
    const heading=Number(await canvas.getAttribute('data-pilot-heading'));
    await page.getByRole('button',{name:'Look left',exact:true}).click();
    await page.waitForFunction(h=>Number(document.querySelector('#wcPilotCanvas').dataset.pilotHeading)>h+0.1,heading);
    await page.getByRole('button',{name:'Look right',exact:true}).click();
    await page.waitForFunction(h=>Math.abs(Number(document.querySelector('#wcPilotCanvas').dataset.pilotHeading)-h)<0.01,heading);
    await page.getByRole('button',{name:'Look up',exact:true}).click();
    await page.waitForFunction(()=>Number(document.querySelector('#wcPilotCanvas').dataset.pilotLookPitch)<0.2);
    await page.getByRole('button',{name:'Close look controls',exact:true}).click();
    const forward=page.locator('[data-control="forward"]');
    await forward.click();
    assert.equal(await canvas.evaluate(el=>el._wcPilotInput.stepRemaining),0,'Paused taps are not queued');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    const position=()=>page.evaluate(()=>({x:waterReviewData.pilot.snapshot.x,z:waterReviewData.pilot.snapshot.z}));
    await page.waitForTimeout(700);
    const before=await position();
    await canvas.focus();await page.keyboard.down('w');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotStepActive==='true');
    await page.keyboard.down('w');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotStepActive==='false');
    await page.waitForTimeout(600);
    const after=await position();const distance=Math.hypot(after.x-before.x,after.z-before.z);
    assert(distance>3.7&&distance<4.7,'One key activation produces a bounded step: '+distance);
    await page.waitForTimeout(600);assert.deepEqual(await position(),after,'Holding a key does not repeat steps');await page.keyboard.up('w');
    await page.selectOption('#wcPilotSteeringPace','gentle');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotSteeringPace==='gentle');
    await forward.evaluate(el=>el.click());
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotStepActive==='true');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotStepActive==='false');
    await page.waitForTimeout(600);
    const gentle=await position();const gentleDistance=Math.hypot(gentle.x-after.x,gentle.z-after.z);
    assert(gentleDistance>1.6&&gentleDistance<2.2,'Gentle step scales only manual movement: '+gentleDistance);
    await forward.evaluate(el=>el.click());
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.equal(await canvas.evaluate(el=>el._wcPilotInput.stepRemaining),0,'Pause cancels the remaining step');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await canvas.focus();await page.keyboard.down('w');
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await canvas.evaluate(el=>el._wcPilotInput.stepRemaining),0,'Window blur cancels movement');await page.keyboard.up('w');
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    for(const [width,dark] of [[1280,false],[390,false],[320,true]]){
      await page.setViewportSize({width,height:1000});await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-navigation'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Movement accessibility');
      await page.locator('.wc-pilot-navigation').screenshot({path:path.join(out,'movement-'+width+(dark?'-dark':'')+'.png')});
    }
    await page.getByRole('button',{name:'Look',exact:true}).click();
    const lookViolations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotLookPanel'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));
    assert.deepEqual(lookViolations,[]);
    await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'look-in-scene-320.png')});
    await page.getByRole('button',{name:'Look left',exact:true}).focus();await page.keyboard.press('Escape');
    assert.equal(await page.locator('#wcPilotLookPanel').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'wcPilotLookToggle');
    assert.deepEqual(errors,[]);
    console.log('PASS tap distance, no key repeat, gentle distance, pause/blur cancellation, accessible synthesized click, camera buttons while paused, responsive accessibility');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
