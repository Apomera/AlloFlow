'use strict';
const fs=require('node:fs'),path=require('node:path');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
  const report={errors:[],console:[]};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1000,height:800}});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.console.push(m.text());});
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.locator('.gwe-home').waitFor({timeout:120000});
    await page.locator('.gwe-home-card[data-path=learn]').click();
    await page.getByLabel('Choose a lesson',{exact:true}).selectOption('geometryHarbor');
    await page.getByRole('button',{name:'Start this lesson',exact:true}).click();
    const skip=page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true});if(await skip.isVisible())await skip.click();
    await page.waitForFunction(()=>window.__geoWorldEngine&&__geoWorldEngine._groundChunks&&__geoWorldEngine._groundChunks.length);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    report.state=await page.evaluate(()=>{
      const e=__geoWorldEngine,T=THREE;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);
      e.camera.position.set(-25,19,27);e.camera.lookAt(0,0,-1);e.euler.setFromQuaternion(e.camera.quaternion);
      const chunks=e._groundChunks, samples=chunks.slice(0,4).map(c=>{
        const p=Object.values(e.blocks).find(b=>b.userData._groundRecord&&b.userData._groundRecord.mesh===c),i=p.userData._groundInstance;
        return {name:c.name,material:{type:c.material.type,color:c.material.color.toArray(),vertexColors:c.material.vertexColors,opacity:c.material.opacity,transparent:c.material.transparent,emissive:c.material.emissive.toArray(),roughness:c.material.roughness,metalness:c.material.metalness},cell:p.userData.gridPos,index:i,count:c.count,
          instanceColor:Array.from(c.instanceColor.array.slice(i*3,i*3+3)),instanceMatrix:Array.from(c.instanceMatrix.array.slice(i*16,i*16+16)),geometryAttributes:Object.fromEntries(Object.entries(c.geometry.attributes).map(([name,a])=>[name,{count:a.count,sample:Array.from(a.array.slice(0,12))}]))};
      });
      const chosen=chunks.find(c=>c.name.includes('grass')), proxy=Object.values(e.blocks).find(b=>b.userData._groundRecord&&b.userData._groundRecord.mesh===chosen), pos=proxy.userData.gridPos;
      const cam=new T.OrthographicCamera(-.4,.4,.4,-.4,.1,10);cam.position.set(pos.x+.5,pos.y+5,pos.z+.5);cam.up.set(0,0,-1);cam.lookAt(pos.x+.5,pos.y,pos.z+.5);cam.updateMatrixWorld(true);
      const target=new T.WebGLRenderTarget(16,16),pixels=new Uint8Array(16*16*4),oldTarget=e.renderer.getRenderTarget();
      function sample(label){e.renderer.setRenderTarget(target);e.renderer.render(e.scene,cam);e.renderer.readRenderTargetPixels(target,0,0,16,16,pixels);let sum=[0,0,0];for(let i=0;i<pixels.length;i+=4){sum[0]+=pixels[i];sum[1]+=pixels[i+1];sum[2]+=pixels[i+2];}return {label,rgb:sum.map(v=>Math.round(v/256)),center:Array.from(pixels.slice(4*(8*16+8),4*(8*16+8)+4))};}
      const variants=[sample('current')],old=chosen.material;
      chosen.material=new T.MeshBasicMaterial({color:0xffffff});variants.push(sample('basic-white-instancecolor'));
      chosen.material.vertexColors=false;chosen.material.needsUpdate=true;variants.push(sample('basic-novertexcolors'));
      const savedColors=chosen.instanceColor;
      chosen.instanceColor=savedColors;chosen.material.dispose();chosen.material=old;
      const oldMap=old.map;old.map=null;old.needsUpdate=true;variants.push(sample('standard-no-map'));old.map=oldMap;old.needsUpdate=true;
      const oldTone=e.renderer.toneMapping; e.renderer.toneMapping=T.NoToneMapping;variants.push(sample('standard-no-tone'));e.renderer.toneMapping=oldTone;
      e.renderer.setRenderTarget(oldTarget);target.dispose();
      const gl=e.renderer.getContext();
      const programs=e.renderer.info.programs.map(p=>({id:p.id,name:p.name,runnable:p.diagnostics&&p.diagnostics.runnable,vertex:p.vertexShader?gl.getShaderSource(p.vertexShader):null,fragment:p.fragmentShader?gl.getShaderSource(p.fragmentShader):null}));
      return {samples,variants,programs,render:e.renderer.info.render,lights:e.scene.children.filter(o=>o.isLight).map(l=>({type:l.type,color:l.color.toArray(),intensity:l.intensity})),tone:e.renderer.toneMapping,exposure:e.renderer.toneMappingExposure};
    });
    fs.writeFileSync(path.join(out,'ground-webgl-debug.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({samples:report.state.samples,variants:report.state.variants,lights:report.state.lights,errors:report.errors,console:report.console},null,2));
  }catch(error){console.error(error.stack);report.failure=error.stack;process.exitCode=1;}
  finally{fs.writeFileSync(path.join(out,'ground-webgl-debug.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
};
eval(harness+'('+run.toString()+')();');
