const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sourceDir=path.join(__dirname,'before-source');fs.mkdirSync(sourceDir,{recursive:true});
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
for(const name of names)if(!fs.existsSync(path.join(sourceDir,name)))fs.copyFileSync('stem_lab/'+name,path.join(sourceDir,name));
const frozen=new Map(names.map(name=>[path.resolve('stem_lab',name),fs.readFileSync(path.join(sourceDir,name))]));
const prior=fs.readFileSync('reports/geometry-world-showcase-composition-2026-09-09/verify-composition-browser.cjs','utf8');
const fixtureStart=prior.indexOf('    await page.evaluate(()=>{\n      const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;e.loadLesson');
if(fixtureStart<0)throw Error('Missing fixture');const fixture=prior.slice(fixtureStart,prior.indexOf('    result.buildingPose=',fixtureStart));
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen.get(file)||fs.readFileSync(file));').replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"balanced",autoCycle:false});');
const taps=Array.from({length:16},(_,i)=>{const a=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt((i+.5)/16);return [Math.cos(a)*r,Math.sin(a)*r];});
const shaderBody='\n shadow = (\n'+taps.map(([x,y])=>'texture2DCompare( shadowMap, shadowCoord.xy + gweStudioShadowSpread * vec2('+x.toFixed(6)+', '+y.toFixed(6)+'), shadowCoord.z )').join(' +\n')+'\n ) * 0.0625;\n';
let body=(async function softlightProbe(){
  const result={errors:[],consoleErrors:[],captures:[]};await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1200,height:820},deviceScaleFactor:1});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
  const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    /* FIXTURE */
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();
    await page.evaluate(()=>{__geoWorldEngine.applyRenderQuality('balanced');__geoWorldEngine._ambientMotionEnabled=false;});await frames();
    for(const spread of [0,.1,.18,.28]){
      await page.evaluate(({spread,shaderBody})=>{
        const e=__geoWorldEngine,studio=e._showcase.studio,m=studio.floor.material,key=studio.lights[0],c=key.shadow.camera;
        m.onBeforeCompile=spread?function(shader){shader.uniforms.gweStudioShadowSpread={value:new THREE.Vector2(spread/(c.right-c.left),spread/(c.top-c.bottom))};let chunk=THREE.ShaderChunk.shadowmap_pars_fragment;const a=chunk.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )'),b=chunk.indexOf('#elif defined( SHADOWMAP_TYPE_VSM )',a);if(a<0||b<0)throw Error('Shader markers missing');chunk=chunk.slice(0,a)+'#elif defined( SHADOWMAP_TYPE_PCF_SOFT )'+shaderBody+chunk.slice(b);shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>','uniform vec2 gweStudioShadowSpread;\n'+chunk);}:function(){};
        m.customProgramCacheKey=()=>String(spread);m.needsUpdate=true;
      },{spread,shaderBody});await frames();
      const data=await page.evaluate(()=>{const e=__geoWorldEngine,r=e.renderer;r.info.autoReset=false;r.info.reset();r.render(e.scene,e.camera);const d={draw:{calls:r.info.render.calls,triangles:r.info.render.triangles},programs:r.info.programs.map(p=>p.diagnostics).filter(d=>d&&d.runnable===false)};r.info.autoReset=true;return d;});
      const name='spread-'+String(spread).replace('.','_')+'.png';await page.screenshot({path:path.join(out,name)});result.captures.push({spread,data,screenshot:name});
    }
  }catch(e){result.failure=e.stack;}
  finally{fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();await new Promise(r=>server.close(r));if(result.failure||result.errors.length||result.consoleErrors.length)process.exitCode=1;}
}).toString();
body=body.replace('    /* FIXTURE */',fixture);harness+='('+body+')();';eval(harness);
