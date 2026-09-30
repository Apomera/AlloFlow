const fs=require('fs'),path=require('path'),assert=require('assert'),{chromium}=require('playwright');
const generated=path.join(__dirname,'capture-harness.generated.cjs');
require('esbuild').buildSync({entryPoints:[path.resolve(__dirname,'../../../tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness}=require(generated),initial=process.argv.includes('--initial'),nautilusOnly=process.argv.includes('--nautilus-only'),prefix=initial?'initial-':'';
(async()=>{
  const harness=new GlHarness({toolFile:initial?'reports/cephalopod-hunter-enhancement/pass-fifteen/baseline.generated.cjs':'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});await harness.start();
  const browser=await chromium.launch({headless:true}),errors=[],warnings=[],captures=[],fixtures=[];let page;
  try{
    page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning'&&/WebGL|shader|context|THREE/i.test(m.text()))warnings.push(m.text());});
    async function mount(species){
      await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.THREE?.Clock&&!!window.StemLab?._registry?.cephalopodLab&&typeof window.__mount==='function');
      await page.evaluate(id=>{const w=window;w.__reviewStep=0;w.__reviewTicks=0;w.THREE.Clock.prototype.getDelta=function(){const dt=w.__reviewStep;w.__reviewStep=0;if(dt)w.__reviewTicks++;return dt;};w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:id,huntMode:'observe',huntSeed:2741,huntQuality:'balanced',_threeLoaded:true}});},species);
      await page.locator('canvas[role=application]').waitFor({state:'visible'});await page.waitForFunction(()=>window.__glRecorder.records.some(row=>row.scene?.getObjectByName('cl-player')&&row.canvas.isConnected));
      await step(20);
    }
    async function step(count){await page.evaluate(async n=>{const w=window;for(let i=0;i<n;i++){const previous=w.__reviewTicks;w.__reviewStep=.05;for(let tries=0;tries<120&&w.__reviewTicks===previous;tries++)await new Promise(resolve=>requestAnimationFrame(resolve));if(w.__reviewTicks!==previous+1)throw Error('Review clock was not consumed exactly once');}},count);}
    async function capture(name){await page.waitForTimeout(180);const file=prefix+name;await page.locator('canvas[role=application]').screenshot({path:path.join(__dirname,file)});captures.push(file);}
    await mount('nautilus');await page.locator('canvas[role=application]').focus();await page.keyboard.press('KeyF');
    await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();await page.getByRole('button',{name:'Higher',exact:true}).click();
    await step(30); // The paused simulation still needs render delta for camera smoothing.
    await capture('nautilus-three-quarter.png');
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Closer',exact:true}).click();
    await step(30);
    await capture('nautilus-shell-side.png');
    for(let i=0;i<5;i++)await page.getByRole('button',{name:'Orbit right',exact:true}).click();
    await step(30);
    await capture('nautilus-aperture.png');
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});
    await step(30);
    await capture('nautilus-phone.png');
    await page.setViewportSize({width:1280,height:1100});await page.evaluate(()=>{document.getElementById('wrap').style.width='1100px';window.dispatchEvent(new Event('resize'));});
    for(let i=0;i<5;i++)await page.getByRole('button',{name:'Orbit right',exact:true}).click();await step(30);await capture('nautilus-opposite-side.png');
    if(nautilusOnly){
      assert(!initial,'Partial recapture is for final pigment review only');
      const resultFile=path.join(__dirname,'capture-results.json'),prior=JSON.parse(fs.readFileSync(resultFile,'utf8'));
      const plants=prior.captures.filter(name=>!name.startsWith('nautilus-'));assert.equal(plants.length,4);
      const result={...prior,errors:[...prior.errors,...errors],warnings:[...prior.warnings,...warnings],captures:[...captures,...plants],nautilusRecapture:'Final outer pigment refinement; five right orbits from the side give a front aperture view. Four accepted plant images and exact fixtures are retained because the plant source is unchanged.'};
      fs.writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.errors.length)process.exitCode=1;return;
    }
    await mount('commonOcto');
    const fixtureFile=path.join(__dirname,'visual-fixtures.json'),prior=initial?null:JSON.parse(fs.readFileSync(fixtureFile,'utf8'));
    for(const kind of ['cl-seagrass','cl-kelp']){
      const fixture=await page.evaluate(({kind,prior})=>{
        const w=window,T=w.THREE,scene=w.__glRecorder.records.filter(row=>row.scene&&row.canvas.isConnected).at(-1).scene;scene.updateMatrixWorld(true);
        const plants=scene.children.filter(o=>o.name===kind).sort((a,b)=>a.position.lengthSq()-b.position.lengthSq()),plant=plants[0];if(!plant)throw Error('Missing plant '+kind);
        const height=plant.geometry.userData.clPlantHeight,center=plant.position.clone().add(new T.Vector3(0,height*.5,0)),distance=Math.max(1,height),obstacles=[];
        scene.traverse(o=>{if(o.isMesh&&o!==plant&&o.visible&&o.material?.opacity!==0)obstacles.push(o);});
        let cameraPosition;if(prior){cameraPosition=new T.Vector3().fromArray(prior.camera);}else{
          const probes=[center,center.clone().add(new T.Vector3(0,height*.25,0)),center.clone().add(new T.Vector3(0,-height*.25,0))],ray=new T.Raycaster();let blocked=Infinity;
          for(let i=0;i<16;i++){const angle=.58+i*Math.PI/8,candidate=center.clone().add(new T.Vector3(Math.sin(angle)*1.75,.16,Math.cos(angle)*1.75).multiplyScalar(distance));let count=0;
            for(const target of probes){const direction=target.clone().sub(candidate);ray.set(candidate,direction.clone().normalize());ray.far=direction.length()*.98;count+=ray.intersectObjects(obstacles,false).length?1:0;}
            if(count<blocked){blocked=count;cameraPosition=candidate;}if(!count)break;
          }if(blocked)throw Error('No unobstructed plant view '+kind);
        }
        scene.onBeforeRender=function(renderer,renderedScene,camera){camera.position.copy(cameraPosition);camera.lookAt(center);camera.updateMatrixWorld(true);};
        return{kind,position:plant.position.toArray(),height,variant:plant.geometry.userData.clPlantVariant,baseYaw:plant.rotation.y,instances:plant.instanceMatrix?Array.from(plant.instanceMatrix.array):null,camera:cameraPosition.toArray(),target:center.toArray()};
      },{kind,prior:prior?.find(row=>row.kind===kind)});
      fixtures.push(fixture);const short=kind==='cl-seagrass'?'seagrass':'kelp';
      await capture(short+'-flex-early.png');await step(60);await capture(short+'-flex-late.png');
      // Start the next plant view at the same exact simulation tick.
      if(kind==='cl-seagrass')await mount('commonOcto');
    }
    if(initial)fs.writeFileSync(fixtureFile,JSON.stringify(fixtures,null,2)+'\n');else assert.deepEqual(fixtures,prior,'Plant seed/placement/instance layout/camera changed');
    fs.writeFileSync(path.join(__dirname,prefix+'capture-results.json'),JSON.stringify({errors,warnings,captures,fixtures,fixture:'Nautilus normal F/Orbit/Higher/Closer inspection and phone390×844; actual nearest seeded plants at1and4simulated seconds, with camera-only unobstructed views and original lights/fog/objects.'},null,2)+'\n');
    console.log(JSON.stringify({errors,warnings,captures}));if(errors.length)process.exitCode=1;
  }catch(e){let diagnostic;try{diagnostic=await page?.evaluate(()=>({state:window.__toolData?.cephalopodLab,contexts:window.__glRecorder?.records.map(row=>({connected:row.canvas.isConnected,lost:row.ctx?.isContextLost?.()})),text:document.body.innerText.slice(0,1800)}));}catch{}fs.writeFileSync(path.join(__dirname,prefix+'capture-failure.json'),JSON.stringify({message:e.message,errors,warnings,captures,diagnostic},null,2)+'\n');throw e;
  }finally{await browser.close();await harness.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
