'use strict';
// Live React/browser acceptance check for live landing map.
// Run: node dev-tools/watercycle_pilot_map_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-map-review');
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

    const canvas=page.locator('#wcPilotCanvas'),map=page.locator('#wcPilotLandingMap');
    await page.waitForSelector('.wc-pilot-navigation');
    await page.locator('.wc-pilot-flight-options>summary').click();
    assert.equal(await map.count(),0,'Map starts hidden');
    await page.getByRole('button',{name:'Landing-zone map',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('wcPilotLandingMap')?.dataset.renderState==='ready');
    assert.equal(await map.getAttribute('data-scenario'),'tropicalOcean');
    assert.equal(await map.getAttribute('data-surface'),await canvas.getAttribute('data-pilot-surface'));
    const goldCount=()=>map.evaluate(c=>{
      const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;
      for(let i=0;i<pixels.length;i+=4) if(pixels[i]>235&&pixels[i+1]>195&&pixels[i+2]<175) count++;
      return count;
    });
    assert(await goldCount()>10,'Destination ring is rendered');
    await page.getByRole('button',{name:'Show waypoint',exact:true}).click();
    await page.waitForTimeout(300);
    assert.equal(await goldCount(),0,'Waypoint toggle also hides the map destination');
    await page.getByRole('button',{name:'Show waypoint',exact:true}).click();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    const beforeX=Number(await map.getAttribute('data-parcel-x'));
    await canvas.focus();await page.keyboard.down('d');
    try {await page.waitForFunction(before=>Math.abs(Number(document.getElementById('wcPilotLandingMap').dataset.parcelX)-before)>3,beforeX);} finally {await page.keyboard.up('d');}
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('wcPilotLandingMap').dataset.paused==='true');
    const pausedX=await map.getAttribute('data-parcel-x'), pausedZ=await map.getAttribute('data-parcel-z');
    await page.waitForTimeout(450);
    assert.equal(await map.getAttribute('data-parcel-x'),pausedX);assert.equal(await map.getAttribute('data-parcel-z'),pausedZ);
    const heading=Number(await map.getAttribute('data-heading'));
    const box=await canvas.boundingBox();
    await page.mouse.move(box.x+box.width*0.6,box.y+box.height*0.65);await page.mouse.down();
    await page.mouse.move(box.x+box.width*0.6+80,box.y+box.height*0.65,{steps:8});await page.mouse.up();
    await page.waitForFunction(before=>Math.abs(Number(document.getElementById('wcPilotLandingMap').dataset.heading)-before)>0.2,heading);
    assert.equal(await map.getAttribute('data-parcel-x'),pausedX,'Looking around does not move the parcel');
    const firstMap=await map.evaluate(c=>c.toDataURL());
    await page.locator('.wc-pilot-climate-drawer>summary').click();
    await page.locator('.wc-pilot-scenario[data-scenario="desertBasin"]').click();
    await page.waitForFunction(()=>document.getElementById('wcPilotLandingMap').dataset.scenario==='desertBasin');
    assert.notEqual(await map.evaluate(c=>c.toDataURL()),firstMap,'Scenario repaints the schematic');
    await page.locator('.wc-pilot-climate-drawer>summary').click();
    for(const [width,dark] of [[1280,false],[390,false],[320,false],[1280,true]]) {
      await page.setViewportSize({width,height:900});
      if(dark) await page.evaluate(()=>mountWater(waterReviewData,true));
      await page.waitForFunction(()=>document.getElementById('wcPilotLandingMap')?.dataset.renderState==='ready');
      await page.locator('.wc-pilot-stage').scrollIntoViewIfNeeded();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-map'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Map accessibility including contrast at '+width+' dark '+dark);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow at '+width);
      const panel=await page.locator('.wc-pilot-map').boundingBox(),pad=await page.locator('.wc-pilot-pad').boundingBox();
      assert(panel.y+panel.height<=pad.y+1,'Map does not cover flight controls');
      await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'landing-map-'+width+(dark?'-dark':'')+'.png')});
    }
    await page.getByRole('button',{name:'Hide landing map',exact:true}).click();
    assert.equal(await map.count(),0,'Map can be closed');
    await page.waitForFunction(()=>document.activeElement?.id==='wcPilotCanvas');
    const live=await canvas.evaluate(c=>{const gl=c.getContext('webgl2')||c.getContext('webgl');return !!gl&&!gl.isContextLost();});
    assert(live,'Live 3D context after map interactions');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: live map position and camera heading, paused motion, waypoint visibility, scenario repaint, 320/390px layout, clear flight controls, and light/dark axe contrast.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
