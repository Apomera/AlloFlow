const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const generated=path.join(__dirname,'capture-harness.generated.cjs');
require('esbuild').buildSync({entryPoints:[path.resolve(__dirname,'../../../tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness}=require(generated),initial=process.argv.includes('--initial'),prefix=initial?'initial-':'';
(async()=>{
  const harness=new GlHarness({toolFile:initial?'reports/cephalopod-hunter-enhancement/pass-seventeen/baseline.generated.cjs':'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});await harness.start();
  const browser=await chromium.launch({headless:true}),errors=[],warnings=[],captures=[];let page;
  try{
    page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning'&&/WebGL|shader|context|THREE/i.test(m.text()))warnings.push(m.text());});
    await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.THREE?.Clock&&!!window.StemLab?._registry?.cephalopodLab&&typeof window.__mount==='function');
    await page.evaluate(()=>{const w=window;w.__reviewStep=0;w.__reviewTicks=0;w.THREE.Clock.prototype.getDelta=function(){const dt=w.__reviewStep;w.__reviewStep=0;if(dt)w.__reviewTicks++;return dt;};w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'commonOcto',huntMode:'observe',huntSeed:2741,huntQuality:'balanced',_threeLoaded:true}});});
    await page.locator('canvas[role=application]').waitFor({state:'visible'});await page.waitForFunction(()=>window.__glRecorder.records.some(row=>row.scene?.getObjectByName('cl-player')&&row.canvas.isConnected));
    async function step(count){await page.evaluate(async n=>{const w=window;for(let i=0;i<n;i++){const previous=w.__reviewTicks;w.__reviewStep=.05;for(let tries=0;tries<120&&w.__reviewTicks===previous;tries++)await new Promise(resolve=>requestAnimationFrame(resolve));if(w.__reviewTicks!==previous+1)throw Error('Review clock was not consumed exactly once');}},count);}
    async function capture(name){await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});const file=prefix+name;await page.locator('canvas[role=application]').screenshot({path:path.join(__dirname,file)});captures.push(file);}
    await step(20);
    const fixtures=await page.evaluate(()=>{
      const w=window,T=w.THREE,scene=w.__glRecorder.records.filter(row=>row.scene&&row.canvas.isConnected).at(-1).scene;scene.updateMatrixWorld(true);
      const fish=scene.children.filter(o=>o.name==='cl-prey-fish'),den=scene.getObjectByName('cl-home');if(fish.length!==16||!den)throw Error('Missing actual seeded fish or den');
      const f=fish[0],school=fish.slice(0,8).reduce((p,o)=>p.add(o.position),new T.Vector3()).multiplyScalar(1/8);
      function view(object,offset,targetOffset){return{camera:object.localToWorld(new T.Vector3(...offset)).toArray(),target:object.localToWorld(new T.Vector3(...targetOffset)).toArray()};}
      w.__reviewScene=scene;w.__reviewFish=f;w.__reviewDen=den;
      return{seed:2741,simTicks:20,fish:fish.map(o=>({position:o.position.toArray(),quaternion:o.quaternion.toArray(),offset:o.userData.offset.toArray(),phase:o.userData.swimPhase,tail:o.userData.tail.matrix.toArray()})),den:{position:den.position.toArray(),quaternion:den.quaternion.toArray()},views:{'fish-side':view(f,[1.0,.19,.08],[0,0,-.05]),'fish-three-quarter':view(f,[.75,.32,.70],[0,0,-.05]),'school':{camera:school.clone().add(new T.Vector3(3.0,1.0,4.5)).toArray(),target:school.toArray()},'den-three-quarter':view(den,[3.8,2.9,5.9],[0,.85,0]),'den-entrance':view(den,[0,1.15,4.5],[0,.85,0]),'den-phone':view(den,[6.08,4.13,9.44],[0,.85,0])}};
    });
    const fixtureFile=path.join(__dirname,'visual-fixtures.json');if(initial)fs.writeFileSync(fixtureFile,JSON.stringify(fixtures,null,2)+'\n');else assert.deepEqual(JSON.parse(JSON.stringify(fixtures)),JSON.parse(fs.readFileSync(fixtureFile,'utf8')),'Seeded fish/den placement, pose or camera changed');
    async function camera(view){await page.evaluate(view=>{const w=window,T=w.THREE,position=new T.Vector3(...view.camera),target=new T.Vector3(...view.target);w.__reviewScene.onBeforeRender=function(renderer,scene,camera){camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);};},view);}
    for(const name of ['fish-side','fish-three-quarter','school','den-three-quarter','den-entrance']){await camera(fixtures.views[name]);await capture(name+'.png');}
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});await camera(fixtures.views['den-phone']);await capture('den-phone.png');
    fs.writeFileSync(path.join(__dirname,prefix+'capture-results.json'),JSON.stringify({errors,warnings,captures,fixture:'Actual first seeded silverside, first eight-fish school and home den at(0,-8), fixed1second simulation pose; camera-only views with unchanged scene lights/fog/scenery. Phone390x844.'},null,2)+'\n');
    console.log(JSON.stringify({errors,warnings,captures}));if(errors.length)process.exitCode=1;
  }catch(e){fs.writeFileSync(path.join(__dirname,prefix+'capture-failure.json'),JSON.stringify({message:e.message,errors,warnings,captures},null,2)+'\n');throw e;}
  finally{await browser.close();await harness.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
