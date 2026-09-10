'use strict';
// Live React/browser acceptance check for ice and snow visual behavior.
// Run: node dev-tools/watercycle_pilot_crystal_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-crystal-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-snow-parcel'));
    async function restore(form,melting=false){
      await page.evaluate(({form,melting})=>{
        const K=WaterCyclePilotKernel, env=K.environment('tropicalOcean');
        const checkpoint={...K.initialState('tropicalOcean'),form,mass:3,energy:1,x:-150,z:40,
          altitudeM:env.freezingM+(melting?2:800),vy:form==='snow'?-7:0,
          yaw:-1.05,pitch:.26,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,pauseAtChanges:melting,cameraMode:'follow',
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+Date.now()}}}));
      },{form,melting});
      await page.waitForFunction(form=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form,form);
    }
    const rotations=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').children.filter(c=>c.visible).map(c=>c.rotation.toArray()));
    for(const form of ['snow','ice','vapor','cloud']){
      await restore(form);
      const before=await rotations(),time=await canvas.getAttribute('data-parcel-elapsed');
      await page.waitForTimeout(1300);
      assert.deepEqual(await rotations(),before,form+' rotation freezes while paused');
      assert.equal(await canvas.getAttribute('data-parcel-elapsed'),time);
    }
    await restore('snow');
    await canvas.hover();await page.mouse.wheel(0,-350);await page.waitForTimeout(700);
    await canvas.screenshot({path:path.join(out,'snow-close.png')});
    const geometry=await page.evaluate(()=>{
      const scene=pilotReview.scene, body=scene.getObjectByName('pilot-snow-crystal-body'), field=scene.getObjectByName('pilot-snow-field');
      body.geometry.computeBoundingBox();
      return {finite:Array.from(body.geometry.attributes.position.array).every(Number.isFinite),
        count:body.geometry.attributes.position.count,width:body.geometry.boundingBox.max.x-body.geometry.boundingBox.min.x,
        fieldVisible:field.visible,countField:field.geometry.attributes.position.count,
        textureSize:field.material.map.image.width,alphaCorner:field.material.map.image.getContext('2d').getImageData(0,0,1,1).data[3]};
    });
    assert(geometry.finite&&geometry.count>100&&geometry.width>9&&geometry.width<12);
    assert(geometry.fieldVisible&&geometry.countField===76&&geometry.textureSize===128&&geometry.alphaCorner===0);
    const initialRotation=await rotations();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-snow-parcel').rotation.y>.3);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.notDeepEqual(await rotations(),initialRotation,'Snow tumbles while running');
    const pausedRotation=await rotations();await page.waitForTimeout(800);assert.deepEqual(await rotations(),pausedRotation);
    await page.emulateMedia({reducedMotion:'reduce'});
    // Let the media query settle across rendering frames before resuming.
    await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
    await page.waitForTimeout(700);
    const reducedRotation=await rotations(),reducedTime=await canvas.getAttribute('data-parcel-elapsed');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(time=>Number(document.querySelector('#wcPilotCanvas').dataset.parcelElapsed)>Number(time)+.4,reducedTime);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.deepEqual(await rotations(),reducedRotation,'Reduced motion stops tumbling while physics continues');
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(800);
    await canvas.screenshot({path:path.join(out,'snow-water-view.png')});
    await restore('ice');await canvas.screenshot({path:path.join(out,'ice-close.png')});
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-snow-field').visible),false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await restore('snow',true);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='rain');
    await page.waitForSelector('.wc-pilot-notice');
    assert.equal(await canvas.getAttribute('data-latent-energy-transfer'),'absorbed-inward-to-water');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-snow-field').visible),false,'Snow visuals stop after melting');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:900});
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));
      assert.deepEqual(violations,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.evaluate(()=>{
      window.crystalDisposed={geometry:0,material:0,texture:0,environment:0};const s=pilotReview.scene;
      const body=s.getObjectByName('pilot-snow-crystal-body'),field=s.getObjectByName('pilot-snow-field');
      body.geometry.addEventListener('dispose',()=>crystalDisposed.geometry++);
      body.material.addEventListener('dispose',()=>crystalDisposed.material++);
      field.material.map.addEventListener('dispose',()=>crystalDisposed.texture++);
      body.material.envMap.addEventListener('dispose',()=>crystalDisposed.environment++);
      mountWater({wcMode:'explorer'});
    });
    assert.deepEqual(await page.evaluate(()=>crystalDisposed),{geometry:1,material:1,texture:1,environment:1});
    assert.deepEqual(errors,[]);
    console.log('PASS: branched snow geometry, textured 76-flake field, four paused parcel rotations, running/reduced-motion behavior, first-person snow, real melting and energy cue, phone accessibility, resource disposal, and no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
