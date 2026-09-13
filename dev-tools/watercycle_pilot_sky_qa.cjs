'use strict';
// Live React/browser acceptance check for sky, sun and ambient clouds.
// Run: node dev-tools/watercycle_pilot_sky_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-sky-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-atmosphere-sky'));
    async function restore({scenario='temperateCoast',x=0,z=0,altitudeM=1000,elapsed=0,form='vapor',yaw=0,pitch=-.18,mode='water'}={}){
      await page.evaluate(v=>{
        const checkpoint={...WaterCyclePilotKernel.initialState(v.scenario),form:v.form,energy:0,altitudeM:v.altitudeM,
          x:v.x,z:v.z,elapsed:v.elapsed,yaw:v.yaw,pitch:v.pitch,cameraMode:v.mode};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario:v.scenario,navigationAssist:false,cameraMode:v.mode,pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:'sky-'+Date.now()}}}));
      },{scenario,x,z,altitudeM,elapsed,form,yaw,pitch,mode});
      await page.waitForFunction(({scenario,x,z,form,elapsed})=>{
        const c=document.querySelector('#wcPilotCanvas'),p=pilotReview.scene.getObjectByName('pilot-water-parcel');
        return c.dataset.pilotScenario===scenario&&c.dataset.parcelForm===form&&Math.abs(p.position.x-x)<.01&&Math.abs(p.position.z-z)<.01
          &&c.dataset.parcelElapsed===String(Math.round(elapsed*10)/10);
      },{scenario,x,z,form,elapsed});await page.waitForTimeout(650);
    }
    const celestial=()=>page.evaluate(()=>{
      const {scene,camera}=pilotReview,sky=scene.getObjectByName('pilot-atmosphere-sky'),sun=scene.getObjectByName('pilot-sun-disc');
      return {offset:sky.position.distanceTo(camera.position),distance:sun.position.distanceTo(camera.position),
        direction:sun.position.clone().sub(camera.position).normalize().toArray(),expected:sky.material.uniforms.sunDirection.value.toArray(),
        projection:sun.position.clone().project(camera).toArray()};
    });
    await restore({x:-180,z:60,altitudeM:900,yaw:2.214,pitch:-.7});const first=await celestial();
    await restore({x:230,z:-220,altitudeM:4100,yaw:2.214,pitch:-.7});const moved=await celestial();
    for(const state of [first,moved]){assert(state.offset<1e-7);assert(Math.abs(state.distance-720)<1e-7);state.direction.forEach((n,i)=>assert(Math.abs(n-state.expected[i])<1e-7));}
    moved.projection.forEach((n,i)=>assert(Math.abs(n-first.projection[i])<1e-6,'Sun projection stays stable while travelling'));
    await canvas.screenshot({path:path.join(out,'sun-water-view.jpg'),type:'jpeg',quality:82});
    await restore({x:50,z:-60,altitudeM:500});
    await canvas.screenshot({path:path.join(out,'cloud-depth.jpg'),type:'jpeg',quality:82});
    const clouds=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-ambient-clouds').children.map(c=>({x:c.position.x,opacity:c.children[0].material.opacity})));
    const initial=await clouds();assert.equal(initial.length,9);await page.waitForTimeout(750);assert.deepEqual(await clouds(),initial);
    const textures=await page.evaluate(()=>{
      const group=pilotReview.scene.getObjectByName('pilot-ambient-clouds');
      return group.children[0].children.slice(0,7).map(lobe=>{
        const cv=lobe.material.map.image;return {size:cv.width,corner:cv.getContext('2d').getImageData(0,0,1,1).data[3]};
      });
    });assert(textures.every(t=>t.size===128&&t.corner===0));
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(x=>pilotReview.scene.getObjectByName('pilot-ambient-clouds').children[0].position.x>x+.05,initial[0].x);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.ambientCloudMotion==='still');const still=await clouds();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();const elapsed=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForFunction(e=>document.querySelector('#wcPilotCanvas').dataset.parcelElapsed!==e,elapsed);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.deepEqual(await clouds(),still);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.ambientCloudMotion==='wind');
    const edgeTimes=await page.evaluate(()=>{const wind=WaterCyclePilotKernel.environment('temperateCoast').windMs;return [(509+460)/(wind*.18),(511+460)/(wind*.18)];});
    for(const elapsed of edgeTimes){await restore({elapsed});assert((await clouds())[0].opacity<.002,'Cloud fades on both sides of its wrap');}
    const palettes=[];
    for(const scenario of ['mountainWinter','desertBasin']){
      await restore({scenario,altitudeM:1800});
      const state=await celestial();state.direction.forEach((n,i)=>assert(Math.abs(n-state.expected[i])<1e-7));
      palettes.push(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-atmosphere-sky').material.uniforms.horizonColor.value.getHex()));
      await canvas.screenshot({path:path.join(out,'sky-'+scenario+'.jpg'),type:'jpeg',quality:82});
    }assert.notEqual(palettes[0],palettes[1]);
    await restore({form:'cloud',altitudeM:2500,mode:'follow'});await canvas.screenshot({path:path.join(out,'parcel-cloud-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'inside-cloud.jpg'),type:'jpeg',quality:82});
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.skyDisposals={geometry:0,texture:0};const scene=pilotReview.scene;
      scene.getObjectByName('pilot-atmosphere-sky').geometry.addEventListener('dispose',()=>skyDisposals.geometry++);
      scene.getObjectByName('pilot-ambient-clouds').children[0].children[0].material.map.addEventListener('dispose',()=>skyDisposals.texture++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>skyDisposals),{geometry:1,texture:1});assert.deepEqual(errors,[]);
    console.log('PASS: stable sky centre and sun direction/projection across travel, cloud texture bounds, paused/running/reduced cloud drift, both wrap fades, seasonal palettes, both cloud camera modes, mobile accessibility, shared cleanup, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
