'use strict';
// Live React/browser acceptance check for assisted pilot navigation.
// Run: node dev-tools/watercycle_pilot_navigation_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-terrain-review');
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
    for(const scenario of ['tropicalOcean','temperateCoast','mountainWinter','desertBasin']){
      await page.evaluate(scenario=>mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true,scenario}}),scenario);
      await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-ocean-surface')?.userData.surfaceShader);
      const surface=await page.evaluate(()=>{const o=pilotReview.scene.getObjectByName('pilot-ocean-surface');const u=o.userData.surfaceShader.uniforms;return {type:o.material.type,strength:u.pilotRippleStrength.value,time:u.pilotRippleTime.value,color:u.pilotReflectedSky.value.getHexString(),finite:Array.from(o.geometry.attributes.normal.array).every(Number.isFinite)};});
      assert.equal(surface.type,'MeshPhongMaterial');assert(surface.finite);assert(surface.strength>=0.45&&surface.strength<=1.15);assert.equal(surface.time,0);
      const terrain=await page.evaluate(()=>{
        const ridges=pilotReview.scene.getObjectByName('pilot-watershed-ridges');
        const foam=pilotReview.scene.getObjectByName('pilot-shore-foam');
        return {shared:ridges.children[0].material.map===ridges.children[1].material.map,
          textured:!!ridges.children[0].material.bumpMap,
          finite:ridges.children.every(o=>Array.from(o.geometry.attributes.color.array).every(Number.isFinite)),
          fragments:foam.children.every(o=>o.isLineSegments&&o.geometry.attributes.position.count>0&&o.geometry.attributes.position.count<350),
          taper:foam.children.every(o=>o.geometry.attributes.color.array[0]>o.geometry.attributes.color.array[3])};
      });assert.deepEqual(terrain,{shared:true,textured:true,finite:true,fragments:true,taper:true});
      await page.evaluate(()=>document.querySelector('#wcPilotCanvas')._wcPilotInput.lookYaw=0.75);
      await page.waitForTimeout(900);
      await canvas.screenshot({path:path.join(out,scenario+'.png')});console.log('PASS climate surface',scenario,surface);
    }
    await page.evaluate(()=>mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true,scenario:'tropicalOcean'}}));
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-ocean-surface')?.userData.surfaceShader);
    const clock=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-ocean-surface').userData.surfaceShader.uniforms.pilotRippleTime.value);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-ocean-surface').userData.surfaceShader.uniforms.pilotRippleTime.value>0.6);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.waitForTimeout(150);const paused=await clock();await page.waitForTimeout(500);assert.equal(await clock(),paused,'Pause freezes fine ripples');
    await canvas.screenshot({path:path.join(out,'tropical-waves.png')});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(1200);
    await canvas.screenshot({path:path.join(out,'water-level.png')});
    await page.emulateMedia({reducedMotion:'reduce'});const reduced=await clock();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();await page.waitForTimeout(500);assert.equal(await clock(),reduced,'Reduced motion keeps ripple pattern still');
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.getByRole('button',{name:'Follow view',exact:true}).click();await page.setViewportSize({width:390,height:900});await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'phone-water.png')});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.evaluate(()=>{const ocean=pilotReview.scene.getObjectByName('pilot-ocean-surface');window.surfaceDisposal={material:0,geometry:0,rockTexture:0};const rock=pilotReview.scene.getObjectByName('pilot-watershed-ridges').children[0].material.map;rock.addEventListener('dispose',()=>surfaceDisposal.rockTexture++);ocean.material.addEventListener('dispose',()=>surfaceDisposal.material++);ocean.geometry.addEventListener('dispose',()=>surfaceDisposal.geometry++);mountWater({wcMode:'explorer'});});
    await page.waitForFunction(()=>surfaceDisposal.material===1&&surfaceDisposal.geometry===1&&surfaceDisposal.rockTexture===1);
    assert.deepEqual(errors,[],'No JavaScript or WebGL shader errors');
    console.log('PASS four climates, live shader compilation, paused/reduced-motion clocks, water-level/phone views, terrain colors, tapered foam, and exactly-once shared rock texture disposal');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
