'use strict';
// Live React/browser acceptance check for assisted pilot navigation.
// Run: node dev-tools/watercycle_pilot_navigation_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-parcel-review');
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
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-liquid-parcel'));
    await page.locator('.wc-pilot-flight-options>summary').click();
    const toggle=page.getByRole('button',{name:'Molecular lens',exact:true});
    assert.equal(await toggle.getAttribute('aria-pressed'),'true');
    const handle=await canvas.elementHandle();
    const time=await canvas.getAttribute('data-parcel-elapsed');
    await toggle.click();await page.waitForFunction(()=>!pilotReview.scene.getObjectByName('pilot-molecular-lens').visible);
    assert.equal(await canvas.getAttribute('data-molecular-lens'),'hidden');
    assert(await canvas.evaluate((node,old)=>node===old,handle));assert.equal(await canvas.getAttribute('data-parcel-elapsed'),time);
    await canvas.hover();await page.mouse.wheel(0,-650);await page.waitForTimeout(900);
    await canvas.screenshot({path:path.join(out,'liquid-close.png')});
    const optics=await page.evaluate(()=>{const p=pilotReview.scene.getObjectByName('pilot-water-parcel');const forms=['pilot-liquid-parcel','pilot-cloud-droplet','pilot-rain-parcel','pilot-ice-parcel'].map(n=>p.getObjectByName(n));return {shared:forms.every(o=>o.material.envMap===forms[0].material.envMap),size:forms[0].material.envMap.image.width,finite:forms.every(o=>Number.isFinite(o.material.ior)&&o.material.ior>1)};});
    assert.deepEqual(optics,{shared:true,size:256,finite:true});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(1000);
    await canvas.screenshot({path:path.join(out,'water-clear.png')});
    await toggle.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-molecular-lens').visible);
    const atoms=await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-molecular-lens').children.filter(o=>o.isInstancedMesh).map(o=>({opaque:!o.material.transparent,depth:o.material.depthWrite,count:o.count})));
    assert(atoms.length===3&&atoms.every(o=>o.opaque&&o.depth&&o.count===18));
    await canvas.screenshot({path:path.join(out,'molecular-water.png')});
    for(const form of ['droplet','ice','rain']){
      await page.evaluate(form=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,paused:true,showMolecules:false,cameraMode:'follow',resumeCheckpoint:{...WaterCyclePilotKernel.initialState('tropicalOcean'),form,altitudeM:600,x:-150,z:40,yaw:-1.05,pitch:0.26,cameraMode:'follow'},resumeToken:'optics-'+form}}})),form);
      await page.waitForFunction(form=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form,form);
      await page.waitForTimeout(600);await canvas.screenshot({path:path.join(out,form+'.png')});
    }
    await page.setViewportSize({width:390,height:900});
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-navigation'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.evaluate(()=>{const env=pilotReview.scene.getObjectByName('pilot-liquid-parcel').material.envMap;window.parcelEnvDisposals=0;env.addEventListener('dispose',()=>parcelEnvDisposals++);mountWater({wcMode:'explorer'});});
    await page.waitForFunction(()=>parcelEnvDisposals===1);
    assert.deepEqual(errors,[]);console.log('PASS shared parcel optics in four phases, molecular depth/visibility, paused state, preserved canvas, keyboard toggle, phone axe, and reflection texture disposal');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
