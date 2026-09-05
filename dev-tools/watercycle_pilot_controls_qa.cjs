'use strict';
// Live React/browser acceptance check for refined pilot controls.
// Run: node dev-tools/watercycle_pilot_controls_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-controls-review');
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
    const data=()=>page.evaluate(()=>waterReviewData);
    const options=page.locator('.wc-pilot-flight-options');
    for(const [width,dark] of [[1280,false],[390,false],[320,false],[1280,true]]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(({dark})=>mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true}},dark),{dark});
      await page.waitForSelector('#wcPilotCanvas');
      await page.waitForFunction(()=>Number(document.getElementById('wcPilotCanvas').dataset.pilotCameraStartDistance)>100);
      assert.equal(await options.evaluate(n=>n.open),false,'Secondary controls start collapsed');
      const bounds=await canvas.boundingBox();
      assert(bounds.y<(width>700?440:550),'Scene starts high enough at '+width+': '+bounds.y);
      const setup=await page.locator('.wc-pilot-setup-row>details').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
      assert.equal(setup.length,2);assert(Math.abs(setup[0].y-setup[1].y)<2 && setup[1].x>setup[0].x,'Setup choices share a row');
      const modes=await page.locator('.wc-mode-tab').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,right:n.getBoundingClientRect().right,height:n.getBoundingClientRect().height})));
      assert.equal(modes.length,4);assert(modes.every(n=>n.x>=0 && n.right<=width+1 && n.height>=44),'All four modes visible with usable targets');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow at '+width);
      await page.screenshot({path:path.join(out,'pilot-compact-'+width+(dark?'-dark':'')+'.png')});
      await options.locator('summary').focus();await page.keyboard.press('Enter');
      assert.equal(await options.evaluate(n=>n.open),true,'Keyboard opens flight options');
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-navigation'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Options accessibility at '+width+' dark '+dark);
      await page.getByLabel('Aim to land on',{exact:true}).selectOption('plant');
      await page.getByRole('button',{name:'Pause at changes',exact:true}).click();
      await options.locator('summary').click();
      assert.equal((await data()).pilot.landingGoal,'plant');assert.equal((await data()).pilot.pauseAtChanges,true);
      await options.locator('summary').click();
      assert.equal(await page.getByLabel('Aim to land on',{exact:true}).inputValue(),'plant','Folding options retains choices');
      await options.locator('summary').click();
      await page.locator('.wc-pilot-climate-drawer>summary').click();
      const climate=await page.locator('.wc-pilot-climate-drawer').boundingBox(), row=await page.locator('.wc-pilot-setup-row').boundingBox();
      assert(Math.abs(climate.width-row.width)<2,'Expanded climate choice uses the full row');
      await page.locator('.wc-pilot-climate-drawer>summary').click();
      await page.locator('#wcPilotMissions>summary').click();
      assert.equal(await page.getByRole('button',{name:/^Start challenge:/}).count(),4);
      const missions=await page.locator('#wcPilotMissions').boundingBox();
      assert(Math.abs(missions.width-row.width)<2,'Expanded challenge choice uses the full row');
      await page.locator('#wcPilotMissions>summary').click();
    }
    await page.getByRole('button',{name:'Guide my movement',exact:true}).click();
    assert.equal(await page.locator('.wc-pilot-assist-status').innerText(),'Journey paused');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.wc-pilot-assist-status').textContent==='Guiding movement');
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.equal(await page.locator('.wc-pilot-assist-status').innerText(),'Journey paused');
    await options.locator('summary').click();
    await page.getByRole('button',{name:'Landing-zone map',exact:true}).click();
    await options.locator('summary').click();
    await page.waitForFunction(()=>document.getElementById('wcPilotLandingMap')?.dataset.renderState==='ready');
    await page.setViewportSize({width:320,height:900});
    const map=page.locator('.wc-pilot-map');
    const mapViolations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-map'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
    assert.deepEqual(mapViolations,[],'Map close control accessibility');
    const mapBounds=await map.boundingBox(),pad=await page.locator('.wc-pilot-pad').boundingBox();
    assert(mapBounds.y+mapBounds.height<pad.y,'Map keeps the flight controls clear');
    const closeBounds=await page.getByRole('button',{name:'Hide landing map',exact:true}).boundingBox();
    assert(closeBounds.width>=44 && closeBounds.height>=44,'Map close target is at least 44px');
    await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'pilot-map-close-320.png')});
    await page.getByRole('button',{name:'Hide landing map',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.id==='wcPilotCanvas');
    assert.equal(await page.locator('#wcPilotLandingMap').count(),0);
    assert.equal((await data()).pilot.paused,true,'Closing the map preserves pause');
    await page.evaluate(()=>mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true,cameraMode:'water'}}));
    await page.waitForFunction(()=>{const distance=Number(document.getElementById('wcPilotCanvas').dataset.pilotCameraStartDistance);return distance>0 && distance<10;});
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: compact scene placement, all four mobile modes, keyboard flight options, persisted choices, full-width expanded setup, live assist status, accessible map close, and focus return.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
