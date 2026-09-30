const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const generated=path.join(__dirname,'capture-harness.generated.cjs');
require('esbuild').buildSync({entryPoints:[path.resolve(__dirname,'../../../tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness}=require(generated),initial=process.argv.includes('--initial'),prefix=initial?'initial-':'';
(async()=>{
 const harness=new GlHarness({toolFile:initial?'reports/cephalopod-hunter-enhancement/pass-nineteen/baseline.generated.cjs':'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});await harness.start();
 const browser=await chromium.launch({headless:true}),errors=[],warnings=[],captures=[];let page;
 try{
  page=await browser.newPage({viewport:{width:1280,height:1100}});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning'&&/WebGL|shader|context|THREE/i.test(m.text()))warnings.push(m.text());});
  await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.THREE?.Clock&&!!window.StemLab?._registry?.cephalopodLab&&typeof window.__mount==='function');
  await page.evaluate(()=>{const w=window;w.__reviewStep=0;w.__reviewTicks=0;w.THREE.Clock.prototype.getDelta=function(){const dt=w.__reviewStep;w.__reviewStep=0;if(dt)w.__reviewTicks++;return dt;};w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'commonOcto',huntMode:'observe',huntSeed:2743,huntQuality:'balanced',_threeLoaded:true}});});
  await page.locator('canvas[role=application]').waitFor({state:'visible'});await page.waitForFunction(()=>window.__glRecorder.records.some(row=>row.scene?.getObjectByName('cl-player')&&row.canvas.isConnected));
  await page.evaluate(async()=>{const w=window;for(let i=0;i<20;i++){const previous=w.__reviewTicks;w.__reviewStep=.05;for(let tries=0;tries<120&&w.__reviewTicks===previous;tries++)await new Promise(resolve=>requestAnimationFrame(resolve));if(w.__reviewTicks!==previous+1)throw Error('Clock not consumed exactly once');}});
  const fixtures=await page.evaluate(()=>{
   const w=window,T=w.THREE,scene=w.__glRecorder.records.filter(row=>row.scene&&row.canvas.isConnected).at(-1).scene;scene.updateMatrixWorld(true);
   const grouper=scene.children.find(o=>o.userData.aggroRange===10&&typeof o.userData.patrolAngle==='number');if(!grouper)throw Error('Missing actual grouper');
   const crabs=scene.children.filter(o=>o.userData.cfg&&['rock','red','hermit'].includes(o.userData.type)),clams=scene.children.filter(o=>typeof o.userData.drillProgress==='number');
   if(crabs.length!==10||clams.length!==8)throw Error('Missing actual prey groups');
   const center=grouper.position.clone(),angle=grouper.userData.patrolAngle,views={};
   function vector(values){return new T.Vector3(...values).applyAxisAngle(new T.Vector3(0,1,0),angle).add(center).toArray();}
   for(const [name,offset,target]of [['grouper-oblique',[4.5,2.2,5],[0,.1,0]],['grouper-side',[-5,1,.1],[0,0,0]],['grouper-face',[0,.8,4],[0,0,.55]],['grouper-tail',[-3.6,1.8,-4.7],[0,.1,0]],['grouper-reef',[8,3.8,10],[0,.1,0]],['grouper-phone',[5.5,2.2,6],[0,.1,0]]])views[name]={camera:vector(offset),target:vector(target)};
   w.__reviewScene=scene;
   return{seed:2743,simTicks:20,grouper:{position:grouper.position.toArray(),state:grouper.userData.state,patrolAngle:angle,patrolTimer:grouper.userData.patrolTimer,stateTimer:grouper.userData.stateTimer,speed:grouper.userData.speed,awareness:grouper.userData.awareness},crabs:crabs.map(o=>({type:o.userData.type,position:o.position.toArray(),quaternion:o.quaternion.toArray(),wanderAngle:o.userData.wanderAngle,wanderTimer:o.userData.wanderTimer,legPhase:o.userData.legPhase})),clams:clams.map(o=>({position:o.position.toArray(),quaternion:o.quaternion.toArray(),alive:o.userData.alive,drillProgress:o.userData.drillProgress})),views};
  });
  const fixtureFile=path.join(__dirname,'visual-fixtures.json');if(initial){if(fs.existsSync(fixtureFile)){const prior=JSON.parse(fs.readFileSync(fixtureFile,'utf8')),next=JSON.parse(JSON.stringify(fixtures));delete prior.views['grouper-side'];delete next.views['grouper-side'];assert.deepEqual(next,prior,'Side-camera refresh changed another fixture field');}fs.writeFileSync(fixtureFile,JSON.stringify(fixtures,null,2)+'\n');}else assert.deepEqual(JSON.parse(JSON.stringify(fixtures)),JSON.parse(fs.readFileSync(fixtureFile,'utf8')),'Seeded actors, simulation state or fixed world cameras changed');
  async function camera(view){await page.evaluate(view=>{const w=window,T=w.THREE,position=new T.Vector3(...view.camera),target=new T.Vector3(...view.target);w.__reviewScene.onBeforeRender=function(renderer,scene,camera){camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);};},view);}
  async function capture(name){await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});const file=prefix+name+'.png';await page.locator('canvas[role=application]').screenshot({path:path.join(__dirname,file)});captures.push(file);}
  for(const name of ['grouper-oblique','grouper-side','grouper-face','grouper-tail','grouper-reef']){await camera(fixtures.views[name]);await capture(name);}
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});await camera(fixtures.views['grouper-phone']);await capture('grouper-phone');
  fs.writeFileSync(path.join(__dirname,prefix+'capture-results.json'),JSON.stringify({errors,warnings,captures,fixture:'Actual seeded grouper and unchanged reef/prey; 20 counted .05s steps; fixed world camera offsets use the patrol travel angle, preserving an exact before/after comparison while visual heading intentionally changes. No actors or scenery moved/hidden. Phone390x844.'},null,2)+'\n');console.log(JSON.stringify({errors,captures}));if(errors.length)process.exitCode=1;
 }catch(e){fs.writeFileSync(path.join(__dirname,prefix+'capture-failure.json'),JSON.stringify({message:e.message,errors,warnings,captures},null,2)+'\n');throw e;}finally{await browser.close();await harness.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
