'use strict';
// Live React/browser acceptance check for mountain snow and the melting transition.
// Run: node dev-tools/watercycle_pilot_snowmelt_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-melting-crystal-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-melting-snow'));
    async function restore(form='snow',scenario='temperateCoast',meltReady=false){
      await page.evaluate(({form,scenario,meltReady})=>{
        const env=WaterCyclePilotKernel.environment(scenario);
        const checkpoint={...WaterCyclePilotKernel.initialState(scenario),form,energy:0,mass:2,
          altitudeM:meltReady?Math.max(100,env.freezingM-25):Math.max(2200,env.freezingM+300),
          x:100,z:-160,yaw:-1.05,pitch:.25,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario,navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:scenario+'-'+form+'-'+Date.now()}}}));
      },{form,scenario,meltReady});
      await page.waitForFunction(({form,scenario})=>{
        const canvas=document.querySelector('#wcPilotCanvas');return canvas.dataset.parcelForm===form&&canvas.dataset.pilotScenario===scenario;
      },{form,scenario});await page.waitForTimeout(700);
    }
    await page.evaluate(()=>{
      const renderer=pilotReview.renderer,render=renderer.render.bind(renderer);
      renderer.render=(scene,camera)=>{if(window.mountainInspection){camera.position.set(185,175,-135);camera.lookAt(90,65,-355);}return render(scene,camera);};
      window.mountainInspection=true;
    });
    for(const scenario of ['mountainWinter','temperateCoast','desertBasin']){
      await restore('snow',scenario);
      await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-watershed-ridges').children[0].userData.snowShader);
      const ridgeState=await page.evaluate(()=>{
        const ridge=pilotReview.scene.getObjectByName('pilot-watershed-ridges');
        return {winter:ridge.children[0].userData.snowShader.uniforms.ridgeWinterSnow.value,
          finite:ridge.children.every(layer=>Array.from(layer.geometry.attributes.ridgeHeight.array).every(Number.isFinite))};
      });assert.deepEqual(ridgeState,{winter:scenario==='mountainWinter'?1:0,finite:true});
      await canvas.screenshot({path:path.join(out,'ridge-'+scenario+'.jpg'),type:'jpeg',quality:82});
    }
    await page.evaluate(()=>window.mountainInspection=false);
    await restore('snow','temperateCoast',true);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-melting-snow').visible),false);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='rain'&&document.querySelector('#wcPilotCanvas').dataset.snowMeltCue==='melting');
    assert.equal(await canvas.getAttribute('data-latent-energy-transfer'),'absorbed-inward-to-water');
    const localMelt=()=>page.evaluate(()=>{
      const scene=pilotReview.scene,group=scene.getObjectByName('pilot-melting-snow');
      return {front:group.children[0].material.userData.meltShader?.uniforms.meltFrontRadius.value,
        scale:group.children[0].scale.x,opacity:group.children[0].material.opacity,
        beads:Array.from(scene.getObjectByName('pilot-melt-beads').instanceMatrix.array),rain:scene.getObjectByName('pilot-rain-parcel').scale.toArray()};
    });
    const paused=await localMelt();await page.waitForTimeout(800);assert.deepEqual(await localMelt(),paused);
    assert(paused.beads.every(Number.isFinite));
    assert(paused.front>4.5&&paused.front<5.3,'The initial melting pause retains most of the crystal');
    const aligned=await page.evaluate(()=>{
      const scene=pilotReview.scene,g=scene.getObjectByName('pilot-melting-snow');
      const b=scene.getObjectByName('pilot-melt-beads'),matrix=new THREE.Matrix4(),p=new THREE.Vector3();
      const crystal=g.children[0],radius=crystal.material.userData.meltShader.uniforms.meltFrontRadius.value;
      const positions=[];for(let i=0;i<b.count;i++){b.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);positions.push(p.toArray());}
      return {positions,radius,scale:crystal.scale.x,shared:crystal.geometry===scene.getObjectByName('pilot-snow-crystal-body').geometry};
    });assert(aligned.shared,'The transition reuses the original crystal geometry');
    for(let i=0;i<6;i++){
      const p=aligned.positions[i],r=(aligned.radius-.15)*aligned.scale;
      assert(Math.abs(p[1]-.16*aligned.scale)<.00001,'Beads lie above the crystal plane');
      assert(Math.abs(p[0]-Math.cos(i*Math.PI/3)*r)<.00001&&Math.abs(p[2]+Math.sin(i*Math.PI/3)*r)<.00001,'Each bead meets one retreating arm');
    }
    await canvas.hover();await page.mouse.wheel(0,-250);await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'melt-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-melt-drop-preview').visible),true);
    await canvas.screenshot({path:path.join(out,'melt-water-view.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(scale=>pilotReview.scene.getObjectByName('pilot-melting-snow').children[0].scale.x<scale-.03,paused.scale);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert((await localMelt()).front<paused.front,'The visible ice front retreats as the drop grows');
    await canvas.screenshot({path:path.join(out,'melt-retreating.jpg'),type:'jpeg',quality:82});
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(400);const reduced=await localMelt();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();await page.waitForTimeout(180);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.deepEqual(await localMelt(),reduced);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>!pilotReview.scene.getObjectByName('pilot-melting-snow').visible);
    assert.deepEqual(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-rain-parcel').scale.toArray()),[1.12,.82,1.12]);
    await restore('rain');assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-melting-snow').visible),false,'Restoration does not create a fake melt');
    await restore('snow','temperateCoast',true);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='rain');
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.meltDisposals={snow:0,rain:0,texture:0};const scene=pilotReview.scene;
      scene.getObjectByName('pilot-snow-crystal-body').geometry.addEventListener('dispose',()=>meltDisposals.snow++);
      scene.getObjectByName('pilot-rain-parcel').geometry.addEventListener('dispose',()=>meltDisposals.rain++);
      scene.getObjectByName('pilot-rain-parcel').material.envMap.addEventListener('dispose',()=>meltDisposals.texture++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>meltDisposals),{snow:1,rain:1,texture:1});assert.deepEqual(errors,[]);
    console.log('PASS: beads aligned to all six crystal arms, shared geometry, retreating soft ice front, seasonal ridge snow shader, finite height attributes, actual melting and energy cue, paused and reduced-motion transition, first-person proxy, cue expiry and restored rain scale, no fake restored melt, mobile accessibility, shared resource cleanup, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
