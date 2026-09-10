'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd(), out = path.join(root, 'reports/cloud-chamber');
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_storm_immersion_qa.cjs'), 'utf8').match(/const html=String.raw`([\s\S]*?)`;/)[1];
html = html.replace('var immersivePreview=', `const loader=StemLab.ensureThree; StemLab.ensureThree=function(options){return loader.call(StemLab,options).then(three=>{if(!three._cloudReview){three._cloudReview=true; const Native=three.WebGLRenderer; three.WebGLRenderer=function(options){const r=new Native(options),render=r.render;r.render=function(scene,camera){window.cloudReview={scene,camera,renderer:r};return render.call(r,scene,camera);};return r;};}return three;});};\nvar immersivePreview=`);
html = html.replace("cameraFocus:'immersive'", "cameraFocus:new URLSearchParams(location.search).has('cloud')?'storm':'immersive'");
const server = http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});
});
(async()=>{
  fs.mkdirSync(out,{recursive:true}); await new Promise(r=>server.listen(58122,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port+'/';
  if(process.argv.includes('--serve')){console.log(url+'?immersive=1&cloud=1');return;}
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}), errors=[];
  page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error' && /THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
  try{
    await page.goto(url);
    for(const preset of (process.argv.includes('--before')?['summerStorm']:['summerStorm','gentleRain','mountainSnow','virga','freezingRain','hailstorm'])){
      await page.evaluate(preset=>mountStorm({wcMode:'precipHunt',precipHunt:Object.assign({},WaterCyclePrecipitationKernel.presets[preset],{preset,viewMode:'3d',cameraFocus:'storm',paused:true,showStormAnatomy:false})}),preset);
      await page.waitForFunction(()=>document.querySelector('#wcPrecip3dCanvas')?.dataset.rendered==='true');
      const canvas=page.locator('#wcPrecip3dCanvas');await canvas.scrollIntoViewIfNeeded();
      await canvas.screenshot({path:path.join(out,(process.argv.includes('--before')?'before-':'')+preset+'-storm.png')});
      if(!process.argv.includes('--before')){
        const info=await page.evaluate(()=>{
          const mesh=cloudReview.scene.getObjectByName('storm-cloud-volume'), data=mesh.material.uniforms.densityAtlas.value.image.data;
          let boundaryMax=0;
          for(let z=0;z<64;z++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){
            if(x>0&&x<63&&y>0&&y<63&&z>0&&z<63)continue;
            const i=((z%8)*64+x+512*(Math.floor(z/8)*64+y))*4;boundaryMax=Math.max(boundaryMax,data[i],data[i+2]);
          }
          return {boundaryMax,cutaway:mesh.material.uniforms.cutaway.value,bytes:data.length,visible:mesh.visible,anvil:mesh.material.uniforms.anvilStrength.value,shear:mesh.material.uniforms.upperShear.value};
        });
        assert.equal(info.boundaryMax,0,'density must vanish at every volume boundary');
        assert.equal(info.cutaway,0);assert.equal(info.bytes,1048576);assert.equal(info.visible,true);
        assert(Number.isFinite(info.anvil)&&Number.isFinite(info.shear),'finite weather-driven uniforms');
        if(preset==='gentleRain')assert.equal(info.anvil,0,'gentle rain has no convective anvil');
        if(preset==='summerStorm'||preset==='hailstorm')assert(info.anvil>0,'strong storm develops its anvil with annotations off');
      }
      if(preset==='summerStorm'){
        for(const [label,key] of [['Inside cloud','cloud'],['Surface path','surface']]){
          await page.getByRole('button',{name:label,exact:true}).click();
          await page.waitForFunction(key=>document.querySelector('#wcPrecip3dCanvas')?.dataset.precipitationCameraFocus===key,key);
          if(!process.argv.includes('--before'))assert.equal(await page.evaluate(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.cutaway.value),key==='cloud'?1:0);
          await canvas.screenshot({path:path.join(out,(process.argv.includes('--before')?'before-':'')+preset+'-'+key+'.png')});
        }
      }
      if(!process.argv.includes('--before')){
        const presentation=await page.evaluate(()=>{
          let samples=0,invalid=0,belowGround=0,aboveCloud=0,badTaper=0;const sizes=[];
          for(const key of ['rain','freezing-rain','snow','ice']){
            const points=cloudReview.scene.getObjectByName('storm-phase-points-'+key),trails=cloudReview.scene.getObjectByName('storm-phase-trails-'+key);
            const count=points.geometry.drawRange.count,looks=points.geometry.attributes.particleStyle.array;
            for(let i=0;i<count;i++){
              const size=looks[i*3],angle=looks[i*3+1],alpha=looks[i*3+2];samples++;sizes.push(size);
              if(!Number.isFinite(size)||!Number.isFinite(angle)||!Number.isFinite(alpha)||size<=0||alpha<0||alpha>1)invalid++;
              if(key==='snow')continue;
              const p=trails.geometry.attributes.position.array,c=trails.geometry.attributes.color.array;
              if(p[i*6+4]<-2.031)belowGround++;
              if(p[i*6+1]>0.951)aboveCloud++;
              if(c[i*6]>c[i*6+3])badTaper++;
            }
          }
          return {samples,invalid,belowGround,aboveCloud,badTaper,sizeVariety:new Set(sizes).size,liquidImpacts:cloudReview.scene.getObjectByName('storm-liquid-impacts').visible};
        });
        assert(presentation.samples>0);assert.equal(presentation.invalid,0);assert.equal(presentation.belowGround,0);assert.equal(presentation.aboveCloud,0);assert.equal(presentation.badTaper,0);assert(presentation.sizeVariety>1);
        if(['hailstorm','mountainSnow','virga'].includes(preset))assert.equal(presentation.liquidImpacts,false,'no liquid splash rings for '+preset);
        if(preset==='mountainSnow'){
          await page.emulateMedia({reducedMotion:'no-preference'});
          await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).click();
          const angle=await page.evaluate(()=>cloudReview.scene.getObjectByName('storm-phase-points-snow').geometry.attributes.particleStyle.array[1]);
          await page.waitForFunction(old=>cloudReview.scene.getObjectByName('storm-phase-points-snow').geometry.attributes.particleStyle.array[1]!==old,angle);
          await page.getByRole('button',{name:'Pause precipitation animation',exact:true}).click();
          const paused=await page.evaluate(()=>Array.from(cloudReview.scene.getObjectByName('storm-phase-points-snow').geometry.attributes.particleStyle.array));
          await page.waitForTimeout(150);
          assert.deepEqual(await page.evaluate(()=>Array.from(cloudReview.scene.getObjectByName('storm-phase-points-snow').geometry.attributes.particleStyle.array)),paused,'snow appearance freezes when paused');
          await page.emulateMedia({reducedMotion:'reduce'});
        }
      }
      console.log('PASS '+preset+' rendered; particle variation, tapered trails and phase-correct impacts');
    }
    if(!process.argv.includes('--before')){
      await page.evaluate(()=>mountStorm({wcMode:'precipHunt',precipHunt:Object.assign({},WaterCyclePrecipitationKernel.presets.hailstorm,{preset:'hailstorm',viewMode:'3d',cameraFocus:'storm',paused:true,stormTime:90,showStormAnatomy:false})}));
      await page.waitForFunction(()=>document.querySelector('#wcPrecip3dCanvas')?.dataset.rendered==='true');
      assert((await page.evaluate(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.anvilStrength.value))>0,'anvil remains in the dissipating stage');
      await page.getByRole('button',{name:'Whole storm',exact:true}).click();
      const canvas=page.locator('#wcPrecip3dCanvas');
      for(const [angle,position] of [['oblique',[6,3.4,6]],['rear',[-5,2.8,-6]]]){
        await page.evaluate(p=>cloudReview.camera.position.set(...p),position);
        await page.waitForTimeout(250);
        await canvas.screenshot({path:path.join(out,angle+'.png')});
      }
      await page.getByRole('button',{name:'Whole storm',exact:true}).click();
      const structure=await page.evaluate(()=>{const m=cloudReview.scene.getObjectByName('storm-cloud-volume');window.retainedCloudAtlas=m.material.uniforms.densityAtlas.value;return m.material.uniforms.anvilStrength.value;});
      await page.locator('#wcPrecipStormAnatomy').check();
      assert.equal(await page.evaluate(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.anvilStrength.value),structure);
      assert(await page.evaluate(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.densityAtlas.value===retainedCloudAtlas));
      await page.locator('#wcPrecipStormAnatomy').uncheck();
      await page.selectOption('#wcPrecipWindDirection','west');
      await page.waitForFunction(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.upperShear.value<0);
      await page.selectOption('#wcPrecipWindDirection','east');
      await page.waitForFunction(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.upperShear.value>0);
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.getByRole('button',{name:'Inside cloud',exact:true}).click();
      await page.waitForFunction(()=>{const c=cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.cutaway.value;return c>0&&c<1;});
      await page.waitForFunction(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.cutaway.value===1,{},{timeout:15000});
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.getByRole('button',{name:'Whole storm',exact:true}).click();
      assert.equal(await page.evaluate(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.cutaway.value),0);
      await page.getByRole('button',{name:'Inside cloud',exact:true}).click();
      assert.equal(await page.evaluate(()=>cloudReview.scene.getObjectByName('storm-cloud-volume').material.uniforms.cutaway.value),1);
      console.log('PASS anvil eligibility, annotation independence, atlas reuse, wind shaping and smooth/reduced-motion cutaway');
      await page.setViewportSize({width:390,height:940});await canvas.scrollIntoViewIfNeeded();
      await canvas.screenshot({path:path.join(out,'phone-cutaway.png')});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'phone overflow');
      await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/axe-core/axe.min.js')});
      const violations=await page.evaluate(async()=> (await axe.run('.wc-precip-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations);
      fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(violations,null,2));assert.equal(violations.length,0);
      await page.evaluate(()=>{window.volumeDisposals={texture:0,material:0,geometry:0};const m=cloudReview.scene.getObjectByName('storm-cloud-volume');m.material.uniforms.densityAtlas.value.addEventListener('dispose',()=>volumeDisposals.texture++);m.material.addEventListener('dispose',()=>volumeDisposals.material++);m.geometry.addEventListener('dispose',()=>volumeDisposals.geometry++);});
      await page.getByRole('button',{name:'2D chamber',exact:true}).click();
      assert.deepEqual(await page.evaluate(()=>volumeDisposals),{texture:1,material:1,geometry:1});
      console.log('PASS empty volume boundaries, cutaway, front/rear orbit, phone accessibility and volume disposal');
    }
    assert.deepEqual(errors,[]); fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({errors,url},null,2));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
