'use strict';
// Live React/browser acceptance check for lake and shoreline detail.
// Run: node dev-tools/watercycle_pilot_stream_landing_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-stream-landing-review');
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
      await page.waitForTimeout(650);
    }

    const slope=await page.evaluate(()=>{
      const path=pilotReview.scene.getObjectByName('pilot-stream-water').geometry.parameters.path;let best=null;
      for(let i=1;i<100;i++){const p=path.getPointAt(i/100),t=path.getTangentAt(i/100);if(Math.hypot(p.x-268,p.z+104)<42||p.y<2)continue;
        if(!best||t.y<best.slope)best={x:p.x,z:p.z,y:p.y,slope:t.y};}
      return best;
    });assert(slope.slope<-.08);
    async function land(x=slope.x,z=slope.z,surface='stream'){
      await restore('rain','temperateCoast',x,z,1);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
      await page.waitForFunction(surface=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid'&&document.querySelector('#wcPilotCanvas').dataset.waterLandingSurface===surface,surface);
      await page.waitForSelector('.wc-pilot-notice');
    }
    const state=()=>page.evaluate(()=>{
      const g=pilotReview.scene.getObjectByName('pilot-ocean-landing');return g.children.filter(o=>o.isMesh).map(r=>({position:r.position.toArray(),scale:r.scale.toArray(),opacity:r.material.opacity,vertices:Array.from(r.geometry.attributes.position.array),wet:Array.from(r.geometry.attributes.landingWet.array)}));
    });
    await land();
    const contact=await page.evaluate(()=>{
      const scene=pilotReview.scene,g=scene.getObjectByName('pilot-ocean-landing'),stream=scene.getObjectByName('pilot-stream-water');scene.updateMatrixWorld(true);
      const ray=new THREE.Raycaster(),p=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);let max=0,missing=0,minY=Infinity,maxY=-Infinity,count=0;
      for(const r of g.children.filter(o=>o.isMesh))for(let i=0;i<r.geometry.attributes.position.count;i+=3){if(r.geometry.attributes.landingWet.getX(i)<.5)continue;
        p.fromBufferAttribute(r.geometry.attributes.position,i).applyMatrix4(r.matrixWorld);ray.set(new THREE.Vector3(p.x,500,p.z),down);const hit=ray.intersectObject(stream)[0];
        if(!hit){missing++;continue;}max=Math.max(max,Math.abs(p.y-hit.point.y-.14));minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);count++;
      }return {max,missing,range:maxY-minY,count};
    });assert(contact.max<.002&&contact.missing===0&&contact.range>.15&&contact.count>100,JSON.stringify(contact));
    const paused=await state();await page.waitForTimeout(500);assert.deepEqual(await state(),paused);
    await canvas.screenshot({path:path.join(out,'stream-landing-follow.jpg'),type:'jpeg',quality:82});
    await page.evaluate(()=>{
      const renderer=pilotReview.renderer,render=renderer.render.bind(renderer);window.streamInspection=true;
      renderer.render=(scene,camera)=>{if(window.streamInspection){const g=scene.getObjectByName('pilot-ocean-landing');camera.position.set(g.position.x+10,g.position.y+8,g.position.z+12);camera.lookAt(g.position);camera.updateMatrixWorld(true);}return render(scene,camera);};
    });await page.waitForTimeout(400);await canvas.screenshot({path:path.join(out,'stream-landing-detail.jpg'),type:'jpeg',quality:82});
    await page.evaluate(()=>window.streamInspection=false);await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(350);
    await canvas.screenshot({path:path.join(out,'stream-landing-water-view.jpg'),type:'jpeg',quality:82});
    await page.evaluate(()=>{
      const scene=pilotReview.scene,stream=scene.getObjectByName('pilot-stream-water');window.streamLandingMotion={frames:0,max:0,missing:0,dry:0,drift:0};
      scene.onBeforeRender=()=>{
        const g=scene.getObjectByName('pilot-ocean-landing'),m=streamLandingMotion;if(!g.visible||waterReviewData.pilot.paused)return;
        const r=g.children.find(o=>o.isMesh),a=r.geometry.attributes.position,w=r.geometry.attributes.landingWet;
        const ray=new THREE.Raycaster(),p=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);m.frames++;m.drift=Math.max(m.drift,r.position.z);
        for(let i=0;i<a.count;i+=7){if(w.getX(i)<.5){m.dry++;continue;}p.fromBufferAttribute(a,i).applyMatrix4(r.matrixWorld);ray.set(new THREE.Vector3(p.x,500,p.z),down);const hit=ray.intersectObject(stream)[0];if(!hit)m.missing++;else m.max=Math.max(m.max,Math.abs(p.y-hit.point.y-.14));}
      };
    });
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();await page.waitForFunction(()=>!pilotReview.scene.getObjectByName('pilot-ocean-landing').visible);
    const moving=await page.evaluate(()=>streamLandingMotion);assert(moving.frames>3&&moving.max<.002&&moving.missing===0&&moving.dry>0&&moving.drift>.6,JSON.stringify(moving));
    await page.evaluate(()=>pilotReview.scene.onBeforeRender=()=>{});
    await land();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);const reduced=await state();await page.waitForTimeout(450);assert.deepEqual(await state(),reduced);
    await page.setViewportSize({width:390,height:900});await canvas.scrollIntoViewIfNeeded();await canvas.screenshot({path:path.join(out,'stream-landing-mobile.jpg'),type:'jpeg',quality:82});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await land(268,-104,'lake');const lake=await state();assert(lake.every(r=>r.position[2]===0&&r.vertices.filter((_,i)=>i%3===2).every(v=>Math.abs(v)<.00001)&&r.wet.every(v=>v===1)),'Lake landing clears stream drift, slope and bank fade');
    await land(-150,40,'ocean');const ocean=await state();assert(ocean.every(r=>r.position[2]===0&&r.wet.every(v=>v===1)),'Ocean landing clears stream drift and bank fade');
    await page.evaluate(()=>{
      window.streamLandingDisposals=0;pilotReview.scene.getObjectByName('pilot-ocean-landing').children.filter(o=>o.isMesh).forEach(r=>r.geometry.addEventListener('dispose',()=>streamLandingDisposals++));mountWater({wcMode:'explorer'});
    });assert.equal(await page.evaluate(()=>streamLandingDisposals),3);assert.deepEqual(errors,[]);
    console.log('PASS: actual stream collection on a steep reach, ray-verified slope alignment, downstream drift, bank fade during expansion, pause and reduced motion, camera views, mobile accessibility, lake/ocean reset, three ring geometries disposed once, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
