'use strict';
// Live React/browser acceptance check for droplet collection visuals.
// Run: node dev-tools/watercycle_pilot_collection_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-collection-review');
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
      THREE.WebGLRenderer=function(...args){const renderer=new OriginalRenderer(...args);const render=renderer.render.bind(renderer);renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};
        const drops=scene.getObjectByName('pilot-collectible-droplets');
        if(drops&&!drops.userData.qaShader){const compile=drops.material.onBeforeCompile;drops.userData.qaShader=true;drops.material.onBeforeCompile=function(shader){compile(shader);window.collectionShader=shader;};}
        if(window.stopOnCollection&&scene.getObjectByName('pilot-collection-cues')?.children.some(c=>c.visible)){
          document.querySelector('#wcPilotCanvas')._wcPilotInput.paused=true;window.stopOnCollection=false;window.didStopCollection=true;
        }
        return render(scene,camera);};return renderer;};
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-collectible-droplets'));
    async function restore(form){
      await page.evaluate(form=>{
        const K=WaterCyclePilotKernel,env=K.environment('tropicalOcean');
        const checkpoint={...K.initialState('tropicalOcean'),form,altitudeM:env.lclM+60,
          x:-150,z:40,yaw:-1.05,pitch:.26,energy:1,vy:0,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,showWaypoint:true,navigationAssist:true,cameraMode:'follow',
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+Date.now()}}}));
      },form);
      await page.waitForFunction(form=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form,form);
    }
    const field=name=>page.evaluate(name=>Array.from(pilotReview.scene.getObjectByName(name).geometry.attributes.position.array),name);
    for(const [form,name] of [['vapor','pilot-condensation-nuclei'],['droplet','pilot-collectible-droplets']]){
      await restore(form);await page.waitForTimeout(350);
      const before=await field(name),time=await canvas.getAttribute('data-parcel-elapsed');
      assert(before.filter((v,i)=>i%3===1).every(y=>y>-9000),'Paused restore retains every '+form+' collectible');
      await page.waitForTimeout(1600);assert.deepEqual(await field(name),before,'Pause preserves particle positions and availability');
      assert.equal(await canvas.getAttribute('data-parcel-elapsed'),time);
      assert.equal(await canvas.getAttribute('data-collection-cue'),'hidden');
    }
    await page.waitForFunction(()=>window.collectionShader);
    const optics=await page.evaluate(()=>({normal:pilotReview.scene.getObjectByName('pilot-collectible-droplets').material.blending===THREE.NormalBlending,
      cap:collectionShader.uniforms.pilotDropletPixelCap.value/pilotReview.renderer.getPixelRatio(),
      clamp:collectionShader.vertexShader.includes('gl_PointSize = min(gl_PointSize, pilotDropletPixelCap)')}));
    assert.deepEqual(optics,{normal:true,cap:14,clamp:true});
    await canvas.hover();await page.mouse.wheel(0,-500);await page.waitForTimeout(800);
    const ringWidth=await page.evaluate(()=>{
      const ring=pilotReview.scene.getObjectByName('pilot-navigation-waypoint');
      const a=new THREE.Vector3(-5.8,0,0).applyMatrix4(ring.matrixWorld).project(pilotReview.camera);
      const b=new THREE.Vector3(5.8,0,0).applyMatrix4(ring.matrixWorld).project(pilotReview.camera);
      return Math.abs(a.x-b.x)*document.querySelector('#wcPilotCanvas').clientWidth/2;
    });
    assert(ringWidth>0&&ringWidth<=39,'Near waypoint stays below 39 CSS pixels');
    await canvas.screenshot({path:path.join(out,'droplet-follow.png')});
    await page.getByRole('button',{name:'Water view',exact:true}).click();
    await page.waitForFunction(()=>collectionShader.uniforms.pilotDropletPixelCap.value/pilotReview.renderer.getPixelRatio()===11);
    await canvas.screenshot({path:path.join(out,'droplet-water-view.png')});
    await page.getByRole('button',{name:'Follow view',exact:true}).click();
    await page.evaluate(()=>{window.stopOnCollection=true;window.didStopCollection=false;});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>window.didStopCollection,null,{timeout:60000});
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,paused:true}}})));
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot?.droplets===1);
    const cues=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-collection-cues').children.map(c=>({visible:c.visible,position:c.position.toArray(),opacity:c.material.opacity})));
    const receipt=await cues();assert(receipt.some(c=>c.visible),'A credited hit creates a visual receipt');
    const mass=await page.evaluate(()=>waterReviewData.pilot.snapshot.mass);
    await page.waitForTimeout(1100);assert.deepEqual(await cues(),receipt,'Pausing freezes collection feedback');
    assert.equal(await page.evaluate(()=>waterReviewData.pilot.snapshot.mass),mass);
    await canvas.screenshot({path:path.join(out,'collected-droplet.png')});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.collectionCue==='hidden');
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(600);
    await restore('droplet');
    assert.equal(await canvas.getAttribute('data-collection-cue'),'hidden','Restore clears a previous receipt');
    await page.getByRole('button',{name:'Water view',exact:true}).click();
    await page.evaluate(()=>{window.stopOnCollection=true;window.didStopCollection=false;});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>window.didStopCollection,null,{timeout:60000});
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,paused:true}}})));
    const reduced=await cues();await page.waitForTimeout(700);assert.deepEqual(await cues(),reduced);
    assert(reduced.some(c=>c.visible&&c.opacity===.6),'Reduced motion provides a static receipt');
    const lens=await page.evaluate(()=>{
      const cue=pilotReview.scene.getObjectByName('pilot-collection-cues').children.find(c=>c.visible);
      const projected=cue.position.clone().project(pilotReview.camera);
      return {x:projected.x,y:projected.y,z:projected.z,pixels:cue.scale.x*document.querySelector('#wcPilotCanvas').clientHeight/(28*Math.tan(pilotReview.camera.fov*Math.PI/360))};
    });
    assert(Math.abs(lens.x)<.001&&Math.abs(lens.y)<.001&&lens.z<1&&lens.pixels<=18.01,'Water view receipt stays visible and compact');
    await canvas.screenshot({path:path.join(out,'collection-water-view.png')});
    await page.setViewportSize({width:390,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-navigation'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{window.dropTextureDisposals=0;pilotReview.scene.getObjectByName('pilot-collectible-droplets').material.map.addEventListener('dispose',()=>dropTextureDisposals++);mountWater({wcMode:'explorer'});});
    assert.equal(await page.evaluate(()=>dropTextureDisposals),1);
    assert.deepEqual(errors,[]);
    console.log('PASS: paused nuclei/droplet preservation, compiled point-size cap, compact waypoint, both cameras, real credited collection, frozen/resumed receipts, reduced motion, checkpoint clearing, phone accessibility, shared texture disposal, and no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
