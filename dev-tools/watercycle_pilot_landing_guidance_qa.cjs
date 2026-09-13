'use strict';
// Live React/browser acceptance check for inland water landing detail.
// Run: node dev-tools/watercycle_pilot_landing_guidance_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-landing-guidance-review');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',m=>{if(m.type()==='error' && /THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
    await page.setContent('<!doctype html><html lang="en"><head><title>Water pilot navigation QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({content:read(file)});
    await page.evaluate(()=>{
      const OriginalRenderer=THREE.WebGLRenderer;
      THREE.WebGLRenderer=function(...args){const renderer=new OriginalRenderer(...args);const render=renderer.render.bind(renderer);renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};return renderer;};
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-lake-water')?.userData.surfaceShader);
    async function restore(form='liquid',scenario='temperateCoast',x=268,z=-104,altitudeM=0){
      await page.evaluate(({form,scenario,x,z,altitudeM})=>{
        const checkpoint={...WaterCyclePilotKernel.initialState(scenario),form,energy:0,altitudeM,
          x,z,yaw:-.75,pitch:.65,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario,navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:scenario+'-'+form+'-'+x+'-'+Date.now()}}}));
      },{form,scenario,x,z,altitudeM});
      await page.waitForFunction(({form,scenario,x,z})=>{
        const canvas=document.querySelector('#wcPilotCanvas'),parcel=pilotReview.scene.getObjectByName('pilot-water-parcel');
        return canvas.dataset.parcelForm===form && canvas.dataset.pilotScenario===scenario
          && Math.abs(parcel.position.x-x)<.01 && Math.abs(parcel.position.z-z)<.01;
      },{form,scenario,x,z});
      await page.waitForFunction(altitudeM=>Math.abs(waterReviewData.pilot.snapshot.altitudeM-altitudeM)<.01,altitudeM);
      await page.waitForTimeout(250);
    }



    const card=page.locator('.wc-pilot-route.is-landing');
    const checkLabels=()=>page.evaluate(()=>{
      const {scene,camera}=pilotReview,g=scene.getObjectByName('pilot-landing-labels');
      const forward=camera.getWorldDirection(new THREE.Vector3()),height=document.querySelector('#wcPilotCanvas').clientHeight;
      return {visible:g.visible,labels:g.children.map(l=>{
        const depth=l.position.clone().sub(camera.position).dot(forward);
        return {visible:l.visible,opacity:l.material.opacity,depth,
          width:depth>0?l.scale.x*height/(2*Math.tan(camera.fov*Math.PI/360)*depth):0,
          textWidth:l.material.map.image.getContext('2d').measureText(l.userData.labelText).width};
      })};
    });
    for(const [x,z,key,label] of [[268,-104,'lake','Lake'],[205,-50,'stream','Stream'],[-150,40,'ocean','Ocean'],[240,0,'permeable','Permeable soil'],[195,-174,'plant','Forest canopy'],[90,-170,'hard','Hard ground']]) {
      await restore('rain','temperateCoast',x,z,200);
      await page.waitForFunction(key=>document.querySelector('.wc-pilot-route.is-landing')?.dataset.landingSurface===key,key);
      assert.equal(await card.locator('strong').innerText(),label);
      assert((await card.innerText()).includes('Wind and steering can change where you land.'));
      assert((await card.getAttribute('aria-label')).includes('Surface below you: '+label));
      assert.equal(await card.locator('svg').getAttribute('focusable'),'false');
      const labels=await checkLabels();assert(labels.visible);
      assert(labels.labels.every(l=>l.textWidth<=464),'Scene label text fits inside its texture');
      assert(labels.labels.every(l=>l.width<=168.01),'Projected label widths are capped on desktop');
      await canvas.screenshot({path:path.join(out,key+'-guidance.jpg'),type:'jpeg',quality:82});
    }
    await restore('rain','temperateCoast',268,-104,200);
    // A water-body change must update the HUD even when altitude, form, and
    // the kernel surface category are all within the ordinary snapshot throttle.
    await page.evaluate(()=>document.querySelector('#wcPilotCanvas')._wcPilotOnSnapshot({...waterReviewData.pilot.snapshot,landingSurface:'stream',reason:'tick'}));
    await page.waitForFunction(()=>document.querySelector('.wc-pilot-route.is-landing').dataset.landingSurface==='stream');
    assert.equal(await card.locator('strong').innerText(),'Stream');
    await restore('rain','temperateCoast',177,-5,216);
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(600);
    const close=await checkLabels();assert(close.labels.every(l=>l.width<=168.01));
    assert(close.labels.some(l=>l.depth<24&&l.opacity<1),'Labels fade as the camera passes close');
    await canvas.screenshot({path:path.join(out,'near-label-water-view.jpg'),type:'jpeg',quality:82});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.ambientCloudMotion==='still');
    const still=await checkLabels();await page.waitForTimeout(500);assert.deepEqual(await checkLabels(),still);
    await restore('rain','desertBasin',268,-104,200);
    assert.notEqual(await card.getAttribute('data-landing-surface'),'lake','Dry basin does not claim a standing lake');
    assert((await checkLabels()).labels.slice(0,2).every(l=>!l.visible));
    await restore('rain','temperateCoast',268,-104,1800);assert(!(await checkLabels()).visible,'Landing labels remain hidden high above the landscape');
    await restore('snow','mountainWinter',268,-104,1200);assert.equal(await card.locator('strong').innerText(),'Lake');
    await restore('liquid','temperateCoast',268,-104,0);assert.equal(await card.count(),0,'Landing guide yields to the collected-water view');
    await restore('rain','temperateCoast',205,-50,200);
    await page.setViewportSize({width:390,height:900});await page.waitForTimeout(500);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert((await checkLabels()).labels.every(l=>l.width<=128.01),'Mobile scene labels use a smaller cap');
    const box=await card.boundingBox();assert(box.x>=0&&box.x+box.width<=390,'Landing card fits on mobile');
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.screenshot({path:path.join(out,'mobile-guidance.jpg'),type:'jpeg',quality:82});
    await page.emulateMedia({forcedColors:'active'});await page.waitForTimeout(300);
    assert(await card.isVisible());await page.screenshot({path:path.join(out,'forced-colors-guidance.jpg'),type:'jpeg',quality:82});
    await page.evaluate(()=>{
      window.guidanceDisposals=0;pilotReview.scene.getObjectByName('pilot-landing-labels').children.forEach(l=>l.material.map.addEventListener('dispose',()=>guidanceDisposals++));
      mountWater({wcMode:'explorer'});
    });assert.equal(await page.evaluate(()=>guidanceDisposals),5);assert.deepEqual(errors,[]);
    console.log('PASS: six distinct surface cards, water-body updates through HUD throttle, fitted label text, desktop/mobile projected size caps, close fade, reduced motion, desert/high-altitude/collected exclusions, mobile and forced colors, accessibility, texture cleanup, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
