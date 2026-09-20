'use strict';
// Live React/browser acceptance check for lake and shoreline detail.
// Run: node dev-tools/watercycle_pilot_lake_shore_detail_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : path.join(ROOT, 'scratch', 'water-lake-shore-detail-review');
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
    const ripple=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-water').userData.surfaceShader.uniforms.pilotLakeTime.value);
    const parcelY=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.y);
    await restore();
    const anatomy=await page.evaluate(()=>{
      const scene=pilotReview.scene,lake=scene.getObjectByName('pilot-lake-water'),shore=scene.getObjectByName('pilot-lake-shore');
      let finite=true;shore.traverse(o=>{if(o.geometry?.attributes.position)finite&&=Array.from(o.geometry.attributes.position.array).every(Number.isFinite);});
      return {radius:lake.geometry.parameters.radius,stones:scene.getObjectByName('pilot-lake-shore-stones').count,
        finite,openOutlet:shore.children[0].geometry.index.count<96*3*6};
    });assert.deepEqual(anatomy,{radius:34,stones:48,finite:true,openOutlet:true});
    const shoreDetail=await page.evaluate(()=>{
      const scene=pilotReview.scene,ground=scene.getObjectByName('pilot-lake-shore-ground');
      const grass=scene.getObjectByName('pilot-lake-shore-grasses'),riverGrass=scene.getObjectByName('pilot-stream-bank-grasses');
      const gravel=scene.getObjectByName('pilot-lake-shore-gravel'),stones=scene.getObjectByName('pilot-lake-shore-stones');
      const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0)),matrix=new THREE.Matrix4(),world=new THREE.Matrix4(),p=new THREE.Vector3(),v=new THREE.Vector3();
      let missing=0,floating=0,buried=0,inOutlet=0,inWater=0,rootError=0;
      for(const mesh of [grass,gravel,stones])for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);world.multiplyMatrices(mesh.matrixWorld,matrix);p.setFromMatrixPosition(world);
        ray.ray.origin.set(p.x,500,p.z);const hits=ray.intersectObject(ground,false);if(!hits.length){missing++;continue;}
        let a=Math.atan2(p.z+104,p.x-268);if(a<0)a+=Math.PI*2;if(Math.abs(a-2.63)<.2)inOutlet++;
        if(Math.hypot(p.x-268,p.z+104)<34)inWater++;
        if(mesh===grass)rootError=Math.max(rootError,Math.abs(p.y-(hits[0].point.y-.035)));
        else{let min=Infinity,max=-Infinity;const vertices=mesh.geometry.attributes.position;
          for(let j=0;j<vertices.count;j++){v.fromBufferAttribute(vertices,j).applyMatrix4(world);min=Math.min(min,v.y);max=Math.max(max,v.y);}
          if(min>hits[0].point.y+.01)floating++;if(max<hits[0].point.y+.01)buried++;
        }
      }
      const color=ground.geometry.attributes.color;
      return {grass:grass.count,gravel:gravel.count,missing,floating,buried,inOutlet,inWater,rootError,
        wetEdge:color.getX(0)<color.getX(2),sharedGrass:grass.geometry===riverGrass.geometry&&grass.material===riverGrass.material,
        sharedGravel:gravel.geometry===stones.geometry&&gravel.material===stones.material,
        finite:[grass,gravel,stones].every(m=>Array.from(m.instanceMatrix.array).every(Number.isFinite))};
    });assert(shoreDetail.grass>=30&&shoreDetail.gravel>=110,JSON.stringify(shoreDetail));
    assert.equal(shoreDetail.missing,0);assert.equal(shoreDetail.floating,0);assert.equal(shoreDetail.buried,0);
    assert.equal(shoreDetail.inOutlet,0);assert.equal(shoreDetail.inWater,0);assert(shoreDetail.rootError<.001);
    assert(shoreDetail.wetEdge&&shoreDetail.sharedGrass&&shoreDetail.sharedGravel&&shoreDetail.finite);
    assert(Math.abs(await parcelY()-11.8)<.01,'Collected lake water rests above the visible water surface; y='+await parcelY());
    assert.equal(await canvas.getAttribute('data-parcel-altitude-m'),'0','Visual lift must not alter kernel altitude');
    const paused=await ripple();await page.waitForTimeout(700);assert.equal(await ripple(),paused);
    await canvas.hover();await page.mouse.wheel(0,250);await page.waitForTimeout(600);
    await canvas.screenshot({path:path.join(out,'lake-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'lake-water-view.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-lake-water').userData.surfaceShader.uniforms.pilotLakeTime.value>.05);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);const still=await ripple();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');await page.waitForFunction(v=>document.querySelector('#wcPilotCanvas').dataset.parcelElapsed!==v,elapsed);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.equal(await ripple(),still);
    await restore('rain','temperateCoast',268,-104,1);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
    assert(Math.abs(await parcelY()-11.8)<.01,'Actual lake landing receives the same surface height');
    await restore('liquid','temperateCoast',205,-50);assert(await parcelY()>7.5&&await parcelY()<9,'Collected stream water floats on the stream');
    await restore('liquid','temperateCoast',-100,0);assert(Math.abs(await parcelY()-3.2)<.01,'Open ocean retains its existing height');
    await restore();
    await page.evaluate(()=>{
      const renderer=pilotReview.renderer,render=renderer.render.bind(renderer);
      renderer.render=(scene,camera)=>{camera.position.set(310,20,-74);camera.lookAt(292,8.8,-90);return render(scene,camera);};
    });
    await page.waitForTimeout(500);await canvas.screenshot({path:path.join(out,'lake-shore-detail.jpg'),type:'jpeg',quality:82});
    await restore('liquid','mountainWinter');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-shore').visible),true);
    await canvas.screenshot({path:path.join(out,'lake-winter.jpg'),type:'jpeg',quality:82});
    await restore('liquid','desertBasin');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-water').visible),false);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-shore').visible),false);
    await restore('groundwater','temperateCoast');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-shore-grasses').visible),false);
    await restore();
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.lakeDisposals={geometry:0,texture:0,grassGeometry:0,grassMaterial:0,stoneGeometry:0,stoneMaterial:0};const shore=pilotReview.scene.getObjectByName('pilot-lake-shore');
      shore.children[0].geometry.addEventListener('dispose',()=>lakeDisposals.geometry++);
      shore.children[0].material.map.addEventListener('dispose',()=>lakeDisposals.texture++);
      const grass=pilotReview.scene.getObjectByName('pilot-lake-shore-grasses'),stones=pilotReview.scene.getObjectByName('pilot-lake-shore-stones');
      grass.geometry.addEventListener('dispose',()=>lakeDisposals.grassGeometry++);grass.material.addEventListener('dispose',()=>lakeDisposals.grassMaterial++);
      stones.geometry.addEventListener('dispose',()=>lakeDisposals.stoneGeometry++);stones.material.addEventListener('dispose',()=>lakeDisposals.stoneMaterial++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>lakeDisposals),{geometry:1,texture:1,grassGeometry:1,grassMaterial:1,stoneGeometry:1,stoneMaterial:1});assert.deepEqual(errors,[]);
    console.log('PASS: grounded lake planting and gravel, clear water and outlet, wet-edge colors, reused grass and stone resources disposed once, subsurface planting hidden, lake boundary, finite shore and open outlet, correct lake/stream/ocean parcel heights, paused/reduced-motion ripples, both camera modes, actual lake landing, winter/desert visibility, mobile accessibility, shared resource cleanup, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
