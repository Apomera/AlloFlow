const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const outDir=__dirname;const sourceDir=path.join(outDir,'before-source');fs.mkdirSync(sourceDir,{recursive:true});
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
for(const name of names)if(!fs.existsSync(path.join(sourceDir,name)))fs.copyFileSync('stem_lab/'+name,path.join(sourceDir,name));
const frozen=new Map(names.map(name=>[path.resolve('stem_lab',name),fs.readFileSync(path.join(sourceDir,name))]));
const prior=fs.readFileSync('reports/geometry-world-showcase-composition-2026-09-09/verify-composition-browser.cjs','utf8');
const fixtureStart=prior.indexOf('    await page.evaluate(()=>{\n      const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;e.loadLesson');
if(fixtureStart<0)throw Error('Missing fixture');
const fixture=prior.slice(fixtureStart,prior.indexOf('    result.buildingPose=',fixtureStart));
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen.get(file)||fs.readFileSync(file));').replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
let body=(async function backdropProbe(){
  const result={sources:Object.fromEntries(Array.from(frozen,([name,bytes])=>[path.basename(name),crypto.createHash('sha256').update(bytes).digest('hex')])),errors:[],captures:[]};
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1});page.setDefaultTimeout(30000);page.on('pageerror',e=>result.errors.push(e.message));
  const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    /* FIXTURE */
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();await frames();
    const variants=[{name:'baseline',background:0xf1eee8,linear:true,floor:0xc6c3c0},{name:'display-ivory',background:0xf1eee8,floor:0xc6c3c0},{name:'display-calm-floor',background:0xf1eee8,floor:0xb9b8b5},{name:'display-low-floor',background:0xf1eee8,floor:0xaaa6a2}];
    for(const variant of variants)for(const view of ['front','perspective']){
      await page.evaluate(({variant,view})=>{const e=__geoWorldEngine,c=new THREE.Color(variant.background);if(variant.linear)c.convertSRGBToLinear();e.scene.background=c;e.scene.fog.color.copy(c);e._showcase.studio.floor.material.color.setHex(variant.floor).convertSRGBToLinear();e.setShowcaseView(view);},{variant,view});await frames();
      const samples=await page.evaluate(()=>{
        const e=__geoWorldEngine,r=e.renderer;r.render(e.scene,e.camera);const gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,data=new Uint8Array(h*4);gl.readPixels(Math.floor(w*.18),0,1,h,gl.RGBA,gl.UNSIGNED_BYTE,data);
        const sample=y=>Array.from(data.slice((h-1-Math.floor(y*h))*4,(h-1-Math.floor(y*h))*4+3));
        const line=[];for(let y=.42;y<=.65;y+=.01)line.push({y,rgb:sample(y)});
        return {background:e.scene.background.toArray(),fog:{color:e.scene.fog.color.toArray(),near:e.scene.fog.near,far:e.scene.fog.far},floor:e._showcase.studio.floor.material.color.toArray(),sky:sample(.1),floorSample:sample(.9),line,pose:e.camera.position.toArray(),cameraFloorHeight:e.camera.position.y-e._showcase.studio.floor.position.y,render:{calls:r.info.render.calls,triangles:r.info.render.triangles},renderer:{encoding:r.outputEncoding,toneMapping:r.toneMapping,quality:e._qualityProfile?.tier}};
      });
      const name=variant.name+'-'+view+'.png';await page.screenshot({path:path.join(out,name)});result.captures.push({variant,view,samples,screenshot:name});
    }
  }catch(e){result.failure=e.stack;}
  finally{fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({errors:result.errors,failure:result.failure,captures:result.captures.map(c=>({name:c.screenshot,sky:c.samples.sky,floor:c.samples.floorSample,height:c.samples.cameraFloorHeight}))}));await browser.close();await new Promise(r=>server.close(r));if(result.failure||result.errors.length)process.exitCode=1;}
}).toString();
body=body.replace('    /* FIXTURE */',fixture);harness+='('+body+')();';eval(harness);
