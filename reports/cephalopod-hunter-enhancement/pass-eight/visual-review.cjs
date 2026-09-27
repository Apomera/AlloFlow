const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[],details=[];
    page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const url=fs.readFileSync(path.join(__dirname,'../preview-url.txt'),'utf8').trim();
    await page.goto(url+'?species=commonOcto&mode=observe');
    const canvas=page.locator('canvas[role=application]');await canvas.waitFor();
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await page.evaluate(()=>{
      window.__nativeDelta=THREE.Clock.prototype.getDelta;window.__step=0;THREE.Clock.prototype.getDelta=function(){const d=window.__step;window.__step=0;return d;};
      const update=THREE.Camera.prototype.updateMatrixWorld;THREE.Camera.prototype.updateMatrixWorld=function(...args){if(this.isPerspectiveCamera)window.__reviewCamera=this;return update.apply(this,args);};
    });
    async function step(n){await page.evaluate(async count=>{for(let i=0;i<count;i++){window.__step=.05;do{await new Promise(r=>requestAnimationFrame(r));}while(window.__step!==0);}},n);}
    await canvas.focus();await page.keyboard.down('KeyD');await step(8);await page.keyboard.up('KeyD');await page.keyboard.down('KeyW');await step(34);await page.keyboard.up('KeyW');await step(8);
    await canvas.screenshot({path:path.join(__dirname,'reef-desktop.png')});
    await page.keyboard.press('KeyF');await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();await step(3);
    await canvas.screenshot({path:path.join(__dirname,'reef-inspection.png')});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});await step(25);
    await canvas.screenshot({path:path.join(__dirname,'reef-phone.png')});
    await page.setViewportSize({width:1280,height:1100});await page.evaluate(()=>{document.getElementById('wrap').style.width='1100px';window.dispatchEvent(new Event('resize'));});
    await canvas.focus();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    for(const form of ['finger','antler','corymbose']){
      const detail=await page.evaluate(form=>{
        const scene=__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1).scene,player=scene.getObjectByName('cl-player');scene.updateMatrixWorld(true);
        const rocks=scene.children.filter(o=>o.userData.substrate==='rock'),rockBounds=rocks.map(r=>new THREE.Box3().setFromObject(r));
        const colonies=scene.children.filter(o=>o.visible&&o.userData.substrate==='coral'&&o.geometry.userData.growthForm===form).sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position));
        const ray=new THREE.Raycaster();let chosen;
        for(const coral of colonies){
          const box=new THREE.Box3(),p=new THREE.Vector3(),vertices=coral.geometry.attributes.position;
          for(let i=0;i<vertices.count;i++)box.expandByPoint(p.fromBufferAttribute(vertices,i).applyMatrix4(coral.matrixWorld));
          const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),distance=Math.max(3.6,size.y*1.65);
          for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6){
            const position=center.clone().add(new THREE.Vector3(Math.sin(angle)*distance,.65,Math.cos(angle)*distance));
            if(rockBounds.some(b=>b.containsPoint(position)))continue;
            const direction=center.clone().sub(position);ray.set(position,direction.clone().normalize());ray.far=direction.length();
            if(!ray.intersectObjects(rocks,false).length){chosen={coral,center,position};break;}
          }
          if(chosen)break;
        }
        if(!chosen)throw Error('No unobstructed colony found for '+form);
        __reviewCamera.position.copy(chosen.position);__reviewCamera.lookAt(chosen.center);__reviewCamera.fov=38;__reviewCamera.updateProjectionMatrix();__reviewCamera.updateMatrixWorld();
        const main=document.querySelector('canvas[role=application]');for(const el of main.parentElement.children)if(el!==main)el.style.visibility='hidden';
        return {form,position:chosen.coral.position.toArray(),camera:chosen.position.toArray(),vertices:chosen.coral.geometry.attributes.position.count,triangles:chosen.coral.geometry.index.count/3};
      },form);
      await step(2);await canvas.screenshot({path:path.join(__dirname,'coral-'+form+'.png')});details.push(detail);
    }
    const result={errors,fixture:'Desktop and phone reef views use normal movement and inspection. Three detail views reposition only the paused camera and hide overlays; actual world colonies, actors, lighting, geometry and materials are unchanged.',details,screenshots:['reef-desktop.png','reef-inspection.png','reef-phone.png','coral-finger.png','coral-antler.png','coral-corymbose.png']};
    fs.writeFileSync(path.join(__dirname,'capture-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
