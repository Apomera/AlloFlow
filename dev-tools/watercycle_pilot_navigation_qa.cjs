'use strict';
// Live React/browser acceptance check for assisted pilot navigation.
// Run: node dev-tools/watercycle_pilot_navigation_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-navigation-review');
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
    await page.waitForSelector('.wc-pilot-navigation');
    await page.locator('.wc-pilot-flight-options>summary').click();

    const data=()=>page.evaluate(()=>waterReviewData);
    const guide=()=>page.getByRole('button',{name:/^(Guide my movement|Movement assist on)$/,exact:true});
    assert.equal(await guide().getAttribute('aria-pressed'),'false');
    await guide().click();
    assert.equal((await data()).pilot.navigationAssist,true);
    await page.getByLabel('Aim to land on',{exact:true}).selectOption('plant');
    assert.equal((await data()).pilot.landingGoal,'plant');
    await page.getByRole('button',{name:'Show waypoint',exact:true}).click();
    assert.equal((await data()).pilot.showWaypoint,false);
    await page.getByRole('button',{name:'Show waypoint',exact:true}).click();
    assert.equal((await data()).pilot.navigationAssist,true);
    assert.equal((await data()).pilot.landingGoal,'plant');
    assert.equal(await page.locator('.wc-pilot-climate-drawer').getAttribute('open'),null);
    await page.locator('.wc-pilot-climate-drawer summary').click();
    assert.equal(await page.locator('.wc-pilot-scenario').count(),4);
    await page.locator('.wc-pilot-climate-drawer summary').click();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotAssist==='guiding');
    await canvas.focus();
    await page.keyboard.down('w');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotAssist==='waiting');
    await page.keyboard.up('w');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotAssist==='guiding');
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotAssist==='waiting');
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForTimeout(750);
    assert.equal(await canvas.getAttribute('data-parcel-elapsed'),elapsed,'Pause freezes simulated time with assistance enabled');
    await page.evaluate(()=>scrollTo(0,0));
    for(const [width,dark] of [[1280,false],[390,false],[320,false],[1280,true]]) {
      await page.setViewportSize({width,height:900});
      if(dark) await page.evaluate(seed=>mountWater(seed,true),await data());
      if(!await page.locator('.wc-pilot-flight-options').evaluate(n=>n.open)) await page.locator('.wc-pilot-flight-options>summary').click();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-navigation'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Navigation accessibility at '+width+' dark '+dark);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow at '+width);
      await page.screenshot({path:path.join(out,'pilot-'+width+(dark?'-dark':'')+'.png')});
    }
    // Start a saved vapor parcel near cloud base; every subsequent collision
    // must come from the live particle field and ordinary assisted movement.
    await page.evaluate(()=>{
      const K=WaterCyclePilotKernel, env=K.environment('tropicalOcean');
      const checkpoint={...K.initialState('tropicalOcean'),form:'vapor',altitudeM:env.lclM+60,
        x:-150,z:40,yaw:-1.05,pitch:0.26,energy:1,vy:0,surface:'water',cameraMode:'follow'};
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
        paused:true,navigationAssist:true,resumeCheckpoint:checkpoint,resumeToken:'navigation-collision-check'}}}));
    });
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>['droplet','cloud','ice','rain','snow'].includes(document.querySelector('#wcPilotCanvas').dataset.parcelForm),null,{timeout:60000});
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot && waterReviewData.pilot.snapshot.droplets>0,null,{timeout:60000});
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,'pilot-assisted-condensation.png')});
    console.log('Live assisted condensation and droplet collection:',await page.evaluate(()=>({form:waterReviewData.pilot.snapshot.form,droplets:waterReviewData.pilot.snapshot.droplets})));
    const live=await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>{
      const gl=n.getContext('webgl2')||n.getContext('webgl');
      return {id:n.id,live:!!gl&&!gl.isContextLost(),dataset:{...n.dataset}};
    }));
    console.log('Live pilot WebGL:',live.some(c=>c.live&&c.dataset.parcelForm));
    assert(live.some(c=>c.live&&c.dataset.parcelForm),'A live pilot WebGL scene is required');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: live manual override/resume/pause, assist preferences, landing choice, waypoint toggle, climate drawer, responsive layout, axe contrast, real particle collisions, and live WebGL.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
