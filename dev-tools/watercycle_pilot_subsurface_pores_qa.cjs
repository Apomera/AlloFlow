'use strict';
// Live React/browser acceptance check for soil and groundwater cutaways.
// Run: node dev-tools/watercycle_pilot_subsurface_pores_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-subsurface-pores-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-soil-layers'));
    async function restore(form,progress=.45){
      await page.evaluate(({form,progress})=>{
        const K=WaterCyclePilotKernel,checkpoint={...K.initialState('temperateCoast'),form,pathwayProgress:progress,
          x:200,z:0,yaw:-1.05,pitch:.4,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario:'temperateCoast',navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+progress+'-'+Date.now()}}}));
      },{form,progress});
      await page.waitForFunction(({form,progress})=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form
        && Math.abs(waterReviewData.pilot.snapshot.pathwayProgress-progress)<.001,{form,progress});
      await page.waitForTimeout(300);
    }

    const inset=page.locator('.wc-pilot-pore-closeup');
    await restore('soil');
    assert.equal(await inset.getAttribute('data-saturation'),'unsaturated');
    assert((await inset.innerText()).includes('Air and water share pore space'));
    const anatomy=await page.evaluate(()=>{
      const scene=pilotReview.scene,bed=scene.getObjectByName('pilot-saturated-pore-bed'),table=scene.getObjectByName('pilot-soil-water-table');
      const data=bed.material.map.image.getContext('2d').getImageData(0,0,256,256).data;
      let blue=0,solid=0;for(let i=0;i<data.length;i+=4){if(data[i+2]>data[i]+30)blue++;else solid++;}
      return {shared:bed.material.map===table.material.map,dimensions:[bed.material.map.image.width,bed.material.map.image.height],
        repeat:bed.material.map.repeat.toArray(),blue,solid,version:bed.material.map.version,
        finite:Array.from(bed.geometry.attributes.uv.array).every(Number.isFinite)};
    });
    assert(anatomy.shared&&anatomy.finite&&anatomy.blue>5000&&anatomy.solid>5000);
    assert.deepEqual(anatomy.dimensions,[256,256]);assert.deepEqual(anatomy.repeat,[3,3]);
    await canvas.hover();await page.mouse.wheel(0,-350);await page.waitForTimeout(700);
    await canvas.screenshot({path:path.join(out,'soil-pore-cutaway.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'soil-water-view.jpg'),type:'jpeg',quality:82});
    await restore('groundwater');
    assert.equal(await inset.getAttribute('data-saturation'),'saturated');
    assert(await page.evaluate(()=>{
      const group=pilotReview.scene.getObjectByName('pilot-groundwater-cutaway');
      const uv=pilotReview.scene.getObjectByName('pilot-saturated-pore-bed').geometry.attributes.uv;
      return Math.abs(uv.getY(0)-2*group.scale.z)<.0001;
    }),'Pore pattern compensates for groundwater route stretch');
    assert((await inset.innerText()).includes('Water fills connected pores'));
    assert.equal(await inset.locator('svg').getAttribute('focusable'),'false');
    await canvas.hover();await page.mouse.wheel(0,-350);await page.waitForTimeout(700);
    await canvas.screenshot({path:path.join(out,'aquifer-pore-bed.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'aquifer-water-view.jpg'),type:'jpeg',quality:82});
    const flow=()=>page.evaluate(()=>Array.from(pilotReview.scene.getObjectByName('pilot-groundwater-flow').geometry.attributes.position.array));
    const frozen=await flow();await page.waitForTimeout(500);assert.deepEqual(await flow(),frozen);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.ambientCloudMotion==='still');
    const still=await flow();await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot.pathwayProgress>.46);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.deepEqual(await flow(),still);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-saturated-pore-bed').material.map.version),anatomy.version,'The pore texture stays static while the route advances');
    await restore('soil',.999);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='groundwater');
    await page.waitForFunction(()=>document.querySelector('.wc-pilot-pore-closeup')?.dataset.saturation==='saturated');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-soil-cutaway').visible),false);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-groundwater-cutaway').visible),true);
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.setViewportSize({width:390,height:900});await page.waitForTimeout(400);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const card=page.locator('.wc-pilot-route.is-process'),box=await card.boundingBox();assert(box.x>=0&&box.x+box.width<=390);
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await card.screenshot({path:path.join(out,'mobile-pore-closeup.jpg'),type:'jpeg',quality:85});
    await page.emulateMedia({forcedColors:'active'});await card.screenshot({path:path.join(out,'forced-colors-pore-closeup.jpg'),type:'jpeg',quality:85});
    await restore('rain',0);assert.equal(await inset.count(),0,'Pore close-up appears only on subsurface routes');
    await page.evaluate(()=>{
      window.poreDisposals=0;pilotReview.scene.getObjectByName('pilot-saturated-pore-bed').material.map.addEventListener('dispose',()=>poreDisposals++);
      mountWater({wcMode:'explorer'});
    });assert.equal(await page.evaluate(()=>poreDisposals),1,'The shared pore texture is disposed once');assert.deepEqual(errors,[]);
    console.log('PASS: distinct soil/groundwater close-ups, shared solid-and-water pore texture, both camera views, pause/reduced motion, actual percolation transition, mobile/forced colors, accessibility, single texture disposal, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
