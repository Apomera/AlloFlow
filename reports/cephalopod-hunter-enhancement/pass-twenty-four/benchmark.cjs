// Author-only benchmark. Root executes it; production source is served unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {auditBenchmark}=require('./reanalysis.cjs');
const repo=path.resolve(__dirname,'../../..'),args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){assert(['--baseline','--candidate','--output'].includes(args[i])&&args[i+1],'Usage: node benchmark.cjs [--baseline source] [--candidate source] [--output report]');assert(!options[args[i]],'Duplicate option '+args[i]);options[args[i]]=args[i+1];}
const baseline=path.resolve(options['--baseline']||process.env.CEPHALOPOD_BENCHMARK_BASELINE||path.join(__dirname,'baseline.generated.cjs'));
const candidate=path.resolve(options['--candidate']||process.env.CEPHALOPOD_MODEL_SOURCE||path.join(repo,'stem_lab/stem_tool_cephalopodlab.js'));
const output=path.resolve(options['--output']||path.join(__dirname,'benchmark-results.json'));
assert(output.startsWith(__dirname+path.sep),'Benchmark report must stay in pass-twenty-four');
assert.equal(path.resolve(process.cwd()),repo,'Run benchmark from the repository root so the production harness serves local vendor files');
const generated=path.join(__dirname,'benchmark-harness.generated.cjs');
require('esbuild').buildSync({entryPoints:[path.join(repo,'tests/e2e/helpers/stem_gl_harness.ts')],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness}=require(generated),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const viewport={width:390,height:844},config={seed:2741,species:'commonOcto',mode:'observe',quality:'balanced',fixedDt:.05,warmup:10,samples:60};

async function measure(label,sourceFile){
  const bytes=fs.readFileSync(sourceFile),hasHabitatHelper=bytes.includes(Buffer.from('function settleCLHuntHabitatPlants(near,refresh)')),harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:390,height:844,layout:'document'});
  if(label==='baseline')assert.equal(hasHabitatHelper,false,'Benchmark baseline must precede the habitat helper');
  const errors=[],warnings=[],servedSourceRequests=[];let browser;
  try{
    await harness.start();browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'no-preference'});page.setDefaultTimeout(120000);
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning'&&/WebGL|shader|context|THREE/i.test(message.text()))warnings.push(message.text());});
    await page.route(/\/stem_lab\/stem_tool_cephalopodlab\.js(?:\?.*)?$/,route=>{
      servedSourceRequests.push({url:route.request().url(),responseSha256:hash(bytes)});
      return route.fulfill({status:200,contentType:'application/javascript',body:bytes});
    });
    await page.goto(harness.url+'/__harness');await page.waitForFunction(()=>!!window.THREE?.Clock&&typeof window.__mount==='function');
    await page.evaluate(config=>{
      const w=window,T=w.THREE;
      if(w.__alloForceFX)throw Error('Natural benchmark must not force FX');
      const b=w.__benchmark={step:0,ticks:0,paused:false,pending:null,active:null,warmup:[],samples:[],renderer:null,scene:null,camera:null};
      function togglePause(){
        const canvas=document.querySelector('canvas[role=application]');
        const veils=Array.from(canvas.parentElement.children).filter(element=>element.children.length===3&&element.children[1].textContent==='Paused'&&element.children[2].textContent==='Press Esc to resume');
        if(veils.length!==1)throw Error('Expected the actual native pause control');
        canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));b.paused=!b.paused;
      }
      // Exactly one active production frame per step. Actual pause between steps
      // prevents zero-delta simulation RNG from depending on browser wall time.
      T.Clock.prototype.getDelta=function(){
        const dt=b.step;b.step=0;
        if((dt>0&&b.paused)||(dt===0&&!b.paused))togglePause();
        if(dt){b.ticks++;b.active=b.pending;b.pending=null;b.active.frameStart=performance.now();queueMicrotask(()=>{if(!b.paused)togglePause();});}
        return dt;
      };
      const OriginalRenderer=T.WebGLRenderer;
      T.WebGLRenderer=new Proxy(OriginalRenderer,{
        construct(target,args,newTarget){
          const renderer=Reflect.construct(target,args,newTarget),render=renderer.render;b.renderer=renderer;
          renderer.render=function(scene,camera){
            if(scene?.isScene&&scene.getObjectByName('cl-player')){b.scene=scene;b.camera=camera;}
            const active=b.active;
            if(!active||!scene?.isScene||!scene.getObjectByName('cl-player'))return render.apply(this,arguments);
            const record=w.__glRecorder.forCanvas(this.domElement),drawsBefore=record.draws;
            const started=performance.now();let result;
            try{result=render.apply(this,arguments);}
            finally{
              const completed=performance.now(),durationMs=completed-started;
              active.durationMs=durationMs;active.frameDurationMs=completed-active.frameStart;active.actualGLDrawCalls=record.draws-drawsBefore;
              active.rendererCalls=this.info.render.calls;active.triangles=this.info.render.triangles;active.points=this.info.render.points;active.lines=this.info.render.lines;
              active.submittedPlantActorCount=active.plants.size;delete active.plants;
              active.camera={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect};
              active.rendererMemory={...this.info.memory,programs:this.info.programs.length};
              b[active.kind].push(active);b.active=null;
            }
            return result;
          };
          return renderer;
        }
      });
      w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:config.species,huntMode:config.mode,huntSeed:config.seed,huntQuality:config.quality,_threeLoaded:true}});
    },config);
    await page.locator('canvas[role=application]').waitFor({state:'visible'});
    await page.waitForFunction(()=>window.__benchmark?.scene?.getObjectByName('cl-player')&&window.__benchmark.paused);
    assert.equal(servedSourceRequests.length,1,'Expected exactly one intercepted production-source response before mount');
    const initial=await page.evaluate(()=>{
      const w=window,b=w.__benchmark,scene=b.scene,renderer=b.renderer,gl=renderer.getContext();
      const debug=gl.getExtension('WEBGL_debug_renderer_info');const rendererName=debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):String(gl.getParameter(gl.RENDERER));
      if(!/SwiftShader|llvmpipe|Software/i.test(rendererName))throw Error('This benchmark requires an actual software renderer: '+rendererName);
      const plants=[];scene.traverse(object=>{if(object.geometry?.userData.clPlantKind)plants.push(object);});
      if(plants.length!==105)throw Error('Expected105 existing grass/kelp actors, got '+plants.length);
      // Bounded actor callbacks count actual main-pass submissions. No pixels,
      // shader reflection, scene census, or screenshots occur in timed calls.
      for(const plant of plants){const original=plant.onBeforeRender;plant.onBeforeRender=function(){if(b.active){b.active.plants.add(this.id);b.active.plantDraws++;}return original.apply(this,arguments);};}
      b.plants=plants;
      b.memory=function(){
        const geometry=new Set(),materials=new Set(),textures=new Set(),arrays=new Set();let instanceBytes=0;
        function storage(attribute){const array=attribute?.isInterleavedBufferAttribute?attribute.data.array:attribute?.array;if(array?.buffer)arrays.add(array.buffer);}
        scene.traverse(object=>{
          if(object.geometry){const g=object.geometry;geometry.add(g);Object.values(g.attributes).forEach(storage);storage(g.index);Object.values(g.morphAttributes||{}).forEach(list=>list.forEach(storage));}
          for(const attr of [object.instanceMatrix,object.instanceColor])if(attr?.array){instanceBytes+=attr.array.byteLength;storage(attr);}
          for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);for(const uniform of Object.values(material.uniforms||{}))if(uniform?.value?.isTexture)textures.add(uniform.value);}
        });
        const sceneTextureNames=[];let textureTexelStorageEstimateBytes=0;
        for(const texture of textures){const images=Array.isArray(texture.image)?texture.image:[texture.image];let estimate=0;for(const image of images){const width=image?.width||image?.videoWidth||0,height=image?.height||image?.videoHeight||0;if(image?.data?.byteLength)estimate+=image.data.byteLength;else estimate+=width*height*4;}textureTexelStorageEstimateBytes+=estimate;sceneTextureNames.push({name:texture.name||'',width:texture.image?.width||0,height:texture.image?.height||0,estimateBytes:estimate});}
        return {sceneGeometryCount:geometry.size,sceneMaterialCount:materials.size,sceneTextureCount:textures.size,sceneArrayBufferCount:arrays.size,sceneArrayBufferBytes:[...arrays].reduce((sum,array)=>sum+array.byteLength,0),instanceAttributeBytes:instanceBytes,textureTexelStorageEstimateBytes,sceneTextureNames,rendererMemory:{...renderer.info.memory,programs:renderer.info.programs.length},shadowMapSize:scene.children.filter(o=>o.isLight&&o.shadow?.map).map(o=>({width:o.shadow.map.width,height:o.shadow.map.height}))};
      };
      b.visibility=function(){
        scene.updateMatrixWorld(true);b.camera.updateMatrixWorld(true);
        const frustum=new w.THREE.Frustum().setFromProjectionMatrix(new w.THREE.Matrix4().multiplyMatrices(b.camera.projectionMatrix,b.camera.matrixWorldInverse));
        const visible=b.plants.filter(plant=>{let object=plant;while(object){if(!object.visible)return false;object=object.parent;}return true;});
        return {totalPlantActors:b.plants.length,visibleFlagActors:visible.length,frustumOverlapActors:visible.filter(plant=>frustum.intersectsObject(plant)).length,kelpActors:b.plants.filter(p=>p.geometry.userData.clPlantKind==='kelp').length,grassActors:b.plants.filter(p=>p.geometry.userData.clPlantKind==='grass').length,habitatMetadataActors:b.plants.filter(p=>!!p.userData.clHabitat).length};
      };
      const canvas=renderer.domElement,rect=canvas.getBoundingClientRect();
      const actorConstruction=scene.children.filter(o=>!o.isLight&&!o.geometry?.userData.clPlantKind&&o!==scene.getObjectByName('cl-seafloor')&&o.type!=='Object3D').map(o=>({name:o.name,type:o.type,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray()}));
      return {rendererName,contextType:w.__glRecorder.forCanvas(canvas).type,hardwareConcurrency:navigator.hardwareConcurrency,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,forceFX:!!w.__alloForceFX,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvas:{clientWidth:rect.width,clientHeight:rect.height,backingWidth:canvas.width,backingHeight:canvas.height},actorConstruction,memory:b.memory(),visibility:b.visibility()};
    });
    async function steps(kind,count){await page.evaluate(async({kind,count,dt})=>{
      const b=window.__benchmark;
      for(let index=0;index<count;index++){
        const ticksBefore=b.ticks,recordsBefore=b[kind].length;
        b.pending={kind,index,plants:new Set(),plantDraws:0};b.step=dt;
        for(let tries=0;tries<180&&(b.ticks===ticksBefore||!b.paused);tries++)await new Promise(resolve=>requestAnimationFrame(resolve));
        if(b.ticks!==ticksBefore+1||b[kind].length!==recordsBefore+1||!b.paused)throw Error('Expected exactly one native active render and actual pause per step');
      }
    },{kind,count,dt:config.fixedDt});}
    await steps('warmup',config.warmup);
    const warmed=await page.evaluate(()=>({memory:window.__benchmark.memory(),visibility:window.__benchmark.visibility()}));
    assert.equal(warmed.visibility.habitatMetadataActors,hasHabitatHelper?105:0,'Natural plants do not match the intercepted source habitat contract after warmup');
    await steps('samples',config.samples);
    const final=await page.evaluate(()=>{const b=window.__benchmark;return {ticks:b.ticks,warmup:b.warmup,samples:b.samples,memory:b.memory(),visibility:b.visibility(),paused:b.paused,forceFX:!!window.__alloForceFX};});
    assert.equal(final.samples.length,60);assert.equal(final.ticks,70);assert(final.paused&&!final.forceFX);assert.deepEqual(errors,[]);
    assert.equal(servedSourceRequests.length,1,'Expected exactly one intercepted production-source response throughout benchmark');
    assert.equal(final.visibility.habitatMetadataActors,hasHabitatHelper?105:0,'Final natural plants do not match the intercepted source habitat contract');
    const sorted=final.samples.map(frame=>frame.durationMs).sort((a,b)=>a-b),median=(sorted[29]+sorted[30])/2,p95=sorted[Math.ceil(sorted.length*.95)-1];
    const frameSorted=final.samples.map(frame=>frame.frameDurationMs).sort((a,b)=>a-b);
    assert(sorted.every(value=>Number.isFinite(value)&&value>=0),'Invalid render CPU sample');
    assert(final.samples.every(frame=>Number.isFinite(frame.frameDurationMs)&&frame.frameDurationMs>=frame.durationMs),'Invalid production update-through-render CPU sample');
    return {label,sourcePath:sourceFile,sourceSha256:hash(bytes),sourceResponse:{interceptedRequestCount:servedSourceRequests.length,requests:servedSourceRequests,hasHabitatHelper,naturalHabitatMetadataActors:final.visibility.habitatMetadataActors},initial,warmed,final,renderCPUMs:{median,p95,min:sorted[0],max:sorted.at(-1),sampleCount:sorted.length},productionFrameCPUMs:{median:(frameSorted[29]+frameSorted[30])/2,p95:frameSorted[Math.ceil(frameSorted.length*.95)-1],min:frameSorted[0],max:frameSorted.at(-1),sampleCount:frameSorted.length},actualGLDrawCalls:{min:Math.min(...final.samples.map(f=>f.actualGLDrawCalls)),max:Math.max(...final.samples.map(f=>f.actualGLDrawCalls))},submittedPlantActors:{min:Math.min(...final.samples.map(f=>f.submittedPlantActorCount)),max:Math.max(...final.samples.map(f=>f.submittedPlantActorCount))},errors,warnings};
  }catch(error){error.benchmarkContext={label,sourcePath:sourceFile,servedSourceRequests,errors,warnings};throw error;}
  finally{if(browser)await browser.close();await harness.stop();}
}
function staticStorage(memory){const {sceneTextureNames,rendererMemory,shadowMapSize,...storage}=memory;return {...storage,shadowMapSize};}
(async()=>{
  const report={configuration:config,viewport,limitation:'390x844 viewport, DPR1, explicitly verified software Chromium. Render-only CPU durations cover renderer.render. Separate production-frame CPU spans start at the controlled positive-delta Clock.getDelta and end on renderer return, including production update/recycle/placement work, rendering, the existing small harness counters, and105 simple plant-submission callbacks. These are JavaScript CPU spans; they do not wait for GPU completion and are not end-to-end browser presentation times, hardware-device FPS, or physical-phone measurements. No readPixels, forced FX, camera overrides, screenshots, shader reflection, or resource traversal occur in timed calls. Texture texel bytes are estimates; scene ArrayBuffer bytes are actual unique typed storage. Render targets, driver overhead, compressed GPU storage and mipmaps are excluded from texel estimates. Frustum-overlap plant count does not claim occlusion visibility.',results:[]};
  try{
    report.results.push(await measure('baseline',baseline));report.results.push(await measure('candidate',candidate));
    const [before,after]=report.results;
    const ownershipAudit=auditBenchmark(report);report.parity=ownershipAudit.parity;report.rendererOwnershipAudit=ownershipAudit.ownership;
    report.change={medianCPUPercent:(after.renderCPUMs.median/before.renderCPUMs.median-1)*100,p95CPUPercent:(after.renderCPUMs.p95/before.renderCPUMs.p95-1)*100,medianProductionFrameCPUPercent:(after.productionFrameCPUMs.median/before.productionFrameCPUMs.median-1)*100,p95ProductionFrameCPUPercent:(after.productionFrameCPUMs.p95/before.productionFrameCPUMs.p95-1)*100,frustumOverlapPlantDelta:after.final.visibility.frustumOverlapActors-before.final.visibility.frustumOverlapActors,sceneArrayBufferBytesDelta:after.final.memory.sceneArrayBufferBytes-before.final.memory.sceneArrayBufferBytes};
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,results:report.results.map(r=>({label:r.label,sourceSha256:r.sourceSha256,renderCPUMs:r.renderCPUMs,productionFrameCPUMs:r.productionFrameCPUMs,actualGLDrawCalls:r.actualGLDrawCalls,submittedPlantActors:r.submittedPlantActors,visibility:r.final.visibility,resourceBytes:staticStorage(r.final.memory)})),parity:report.parity,change:report.change},null,2));
    assert(Object.values(report.parity).every(Boolean),'Benchmark fixture or static storage parity failed; inspect the saved report');
  }catch(error){report.failure={message:error.message,...error.benchmarkContext};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');throw error;}
})().catch(error=>{console.error(error);process.exitCode=1;});
