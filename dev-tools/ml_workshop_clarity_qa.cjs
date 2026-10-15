// Native pixel checks for workshop rendering, with an optional same-scene bloom A/B.
const fs=require('fs'),path=require('path'),vm=require('vm');
const report=path.resolve(process.argv[2]),diagnostic=process.argv.includes('--diagnostic');
const browserTemp=path.join(report,'browser-temp');fs.mkdirSync(browserTemp,{recursive:true});
process.env.TEMP=browserTemp;process.env.TMP=browserTemp;
process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH||'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
 .replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2]);")
 .replace('deviceScaleFactor: 2','deviceScaleFactor: 1')
 .replace('var ctx = {','window.__qaState=pair[0].machineLab; var ctx = {')
 .replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
 const diagnostic=process.argv.includes('--diagnostic'),checks=[],observations=[],shots=[];
 const sha=file=>require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const inputs=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_workshop_clarity_qa.cjs','dev-tools/ml_scene_shots.cjs'];
 const before=inputs.map(file=>({file,sha256:sha(file)}));
 const check=(ok,label)=>{checks.push(label);if(!ok)throw Error(label);};
 const settle=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const bay=()=>pg.locator('.ml-shop-bay');
 async function mount(kind,theme={},width=1180,focus=true){
  await pg.setViewportSize({width,height:1000});await pg.emulateMedia({reducedMotion:'reduce',forcedColors:theme.contrast?'active':'none'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopFocusMechanism:focus,shopMotionProgress:.5,designReflection:'Preserve my design note.'}),theme]);
  await bay().scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop?.mlDemo?.kind===kind&&window.__qaShop.data.static&&document.querySelector('.ml-shop-bay canvas')?.width>0,kind);await settle();
 }
 async function inspect(label,expected){
  const v=await pg.evaluate(()=>{
   const s=window.__qaShop,r=s.renderer,c=r.domElement;
   if(s.composer)s.composer.render();else r.render(s.scene,s.camera);
   const gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const pixel=(x,y)=>Array.from(pixels.slice((y*w+x)*4,(y*w+x)*4+3));
   const corner=pixel(12,h-12);let changed=0,clipped=0;
   for(let i=0;i<pixels.length;i+=4){if(Math.max(...corner.map((v,j)=>Math.abs(v-pixels[i+j])))>25)changed++;if(pixels[i]>=250&&pixels[i+1]>=250&&pixels[i+2]>=250)clipped++;}
   return{kind:s.mlDemo.kind,clear:r.getClearColor().getHexString(),corner,changedFraction:changed/(w*h),clippedFraction:clipped/(w*h),composer:!!s.composer,environment:!!s.scene.environment,filter:getComputedStyle(c).filter,width:w,height:h,focused:s.data.focusMechanism,roomVisible:s.mlDemo.room.visible,progress:s.data.motionProgress,pageFits:document.documentElement.scrollWidth<=innerWidth+1,note:window.__qaState.designReflection,canvasVisible:c.getBoundingClientRect().width>0};
  });observations.push({label,...v});
  if(expected){
   check(!v.composer,label+': bloom cannot bleach the background');
   check(v.clear===expected,label+': renderer uses the selected theme');
   const rgb=expected.match(/../g).map(n=>parseInt(n,16));check(v.corner.every((n,i)=>Math.abs(n-rgb[i])<=2),label+': native background pixels retain the theme color');
   check(v.changedFraction>.01,label+': machinery has distinct pixels against the background');
   check(v.environment&&v.filter==='none',label+': reflection environment remains active without CSS filtering');
   check(v.pageFits&&v.canvasVisible,label+': scene fits its viewport');
   check(v.roomVisible===!v.focused&&v.progress===.5&&v.note==='Preserve my design note.',label+': focus, held pose and student note survive rendering');
  }return v;
 }
 async function shot(name){await bay().screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:sha(path.join(OUT,name+'.png'))});}
 try{
  if(diagnostic){
   await mount('windlass');await pg.waitForFunction(()=>!!window.__qaShop?.composer,{},{timeout:45000});await settle();
   const a=await inspect('baseline bloom enabled');await shot('baseline-bloom');
   await pg.evaluate(()=>{const s=window.__qaShop;window.__qaComposer=s.composer;s.composer=null;s.renderer.render(s.scene,s.camera);});
   const b=await inspect('same scene plain render');await shot('same-scene-plain');
   check(a.composer&&!b.composer,'A/B uses the same scene with only composer bypassed');
   check(a.clippedFraction>b.clippedFraction+.1,'Bloom is responsible for widespread clipped white pixels');
   await pg.evaluate(()=>{window.__qaShop.composer=window.__qaComposer;});
  }else{
   for(const [name,theme,color] of [['light',{},'eaf0f6'],['dark',{dark:true},'07111f'],['contrast',{contrast:true},'000000']]){
    for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){
     await mount(kind,theme);await inspect(name+' '+kind,color);if(name==='light'&&kind==='windlass')await shot('light-windlass');
    }
    await mount('pulley',theme,320);await inspect(name+' phone pulley',color);if(name!=='light')await shot(name+'-phone-pulley');
    await mount('windlass',theme,1180,false);await inspect(name+' whole workshop',color);if(name==='light')await shot('light-whole-workshop');
   }
  }
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const temp=path.resolve(OUT,'browser-temp'),base=fs.realpathSync(OUT);
  if(fs.existsSync(temp)){const resolved=fs.realpathSync(temp);if(path.dirname(resolved)!==base)throw Error('Temp escaped run');fs.rmSync(resolved,{recursive:true,force:true});}
  if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=inputs.map(file=>({file,sha256:sha(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during native run');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({diagnostic,before,after,checks,observations,shots,errors},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,scenes:observations.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
