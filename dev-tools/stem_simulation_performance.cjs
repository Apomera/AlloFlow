// Local working-tree profiling, using the same real-WebGL harness as conformance tests.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('@playwright/test');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),scratch=path.join(root,'scratch/stem-performance-pass2');
const out=path.join(root,'reports/stem-performance-pass2');
fs.mkdirSync(scratch,{recursive:true});fs.mkdirSync(out,{recursive:true});
const harnessFile=path.join(scratch,'gl-harness.cjs');
fs.writeFileSync(harnessFile,esbuild.transformSync(fs.readFileSync(path.join(root,'tests/e2e/helpers/stem_gl_harness.ts'),'utf8'),{loader:'ts',format:'cjs',platform:'node'}).code);
const {GlHarness}=require(harnessFile);
const mode=process.argv.includes('--after')?'after':'before';
const toolArg=process.argv.find(x=>x.startsWith('--tool='))?.split('=')[1];
const cases=[{id:'solarSystem',file:'stem_lab/stem_tool_solarsystem.js',state:{}},{id:'roadReady',file:'stem_lab/stem_tool_roadready.js',state:{roadReady:{view:'driving',scenario:'residential',vehicle:'sedan'}}}].filter(x=>!toolArg||x.id===toolArg);
async function run(){
  const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const item of cases){
      const h=new GlHarness({toolId:item.id,toolFile:item.file,preScripts:['stem_lab/stem_lab_module.js'],width:900,height:600});await h.start();
      const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
      try{
        const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
        const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
        const before=await metrics();const navigationStart=Date.now();await page.goto(h.url+'/__harness',{waitUntil:'load',timeout:90000});const navigationMs=Date.now()-navigationStart;
        const loaded=await metrics();
        await page.evaluate(()=>{
          const Renderer=THREE.WebGLRenderer;window.__renderers=[];
          THREE.WebGLRenderer=function(options){const r=new Renderer(options);__renderers.push(r);return r;};
          window.__frameGaps=[];window.__observeFrames=true;let last;
          function frame(t){if(!__observeFrames)return;if(last!=null)__frameGaps.push(t-last);last=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
        });
        await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
        const mountStart=Date.now();await page.evaluate(d=>window.__mount(d),item.state);
        await page.waitForFunction(()=>{const c=window.__glCanvas();return c&&!c.gl.isContextLost();},null,{timeout:90000});const mountToGlMs=Date.now()-mountStart;
        await page.waitForTimeout(4000);
        const {profile}=await cdp.send('Profiler.stop');const settled=await metrics();
        const scene=await page.evaluate(()=>{
          window.__observeFrames=false;const a=__frameGaps.slice().sort((a,b)=>a-b);
          return {frames:a.length,medianFrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)],over50Ms:a.filter(x=>x>50).length,
            renderers:__renderers.map(r=>({drawCalls:r.info.render.calls,triangles:r.info.render.triangles,textures:r.info.memory.textures,geometries:r.info.memory.geometries})),
            resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,bytes:r.decodedBodySize,duration:r.duration}))};
        });
        const nodes=new Map(profile.nodes.map(n=>[n.id,n]));const costs=new Map();
        (profile.samples||[]).forEach((id,i)=>{const n=nodes.get(id),f=n.callFrame,key=f.functionName+'|'+f.url+'|'+f.lineNumber;const r=costs.get(key)||{function:f.functionName,url:f.url,line:f.lineNumber+1,selfUs:0};r.selfUs+=profile.timeDeltas?.[i]||0;costs.set(key,r);});
        const cpu=Array.from(costs.values()).sort((a,b)=>b.selfUs-a.selfUs).slice(0,35);
        const result={tool:item.id,mode,cpuSlowdown:4,gpu:'SwiftShader software WebGL (not a Chromebook GPU benchmark)',navigationMs,mountToGlMs,
          loadMetrics:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration'].map(k=>[k,loaded[k]-before[k]])),
          mountedMetrics:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration'].map(k=>[k,settled[k]-loaded[k]])),scene,cpu,errors};
        fs.writeFileSync(path.join(out,item.id+'-'+mode+'.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(out,item.id+'-'+mode+'.cpuprofile'),JSON.stringify(profile));
        console.log(JSON.stringify({...result,scene:{...scene,resources:undefined},cpu:cpu.slice(0,12)},null,2));
        await h.destroy(page);if(errors.length)throw Error(errors.join('\n'));
      }finally{await page.close();await h.stop();}
    }
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
