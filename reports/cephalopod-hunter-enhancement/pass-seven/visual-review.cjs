const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[];
    page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const url=fs.readFileSync(path.join(__dirname,'../preview-url.txt'),'utf8').trim();
    await page.goto(url+'?species=commonOcto&mode=observe');
    const canvas=page.locator('canvas[role=application]');await canvas.waitFor();
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await page.evaluate(()=>{window.__nativeDelta=THREE.Clock.prototype.getDelta;window.__step=0;THREE.Clock.prototype.getDelta=function(){const d=window.__step;window.__step=0;return d;};const update=THREE.Camera.prototype.updateMatrixWorld;THREE.Camera.prototype.updateMatrixWorld=function(...args){if(this.isPerspectiveCamera)window.__reviewCamera=this;return update.apply(this,args);};});
    async function step(n){await page.evaluate(async count=>{for(let i=0;i<count;i++){window.__step=.05;do{await new Promise(r=>requestAnimationFrame(r));}while(window.__step!==0);}},n);}
    async function coralDetail(){
      await page.evaluate(()=>{
        const scene=__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1).scene,player=scene.getObjectByName('cl-player');scene.updateMatrixWorld(true);
        const rocks=scene.children.filter(o=>o.userData.substrate==='rock'),rockBounds=rocks.map(r=>new THREE.Box3().setFromObject(r));
        const colonies=scene.children.filter(o=>o.userData.substrate==='coral').sort((a,b)=>a.position.distanceToSquared(player.position)-b.position.distanceToSquared(player.position));
        const ray=new THREE.Raycaster();let chosen;
        for(const coral of colonies){
          const box=new THREE.Box3().setFromObject(coral);if(rockBounds.some(b=>b.intersectsBox(box)))continue;
          const center=box.getCenter(new THREE.Vector3());
          for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){
            const position=center.clone().add(new THREE.Vector3(Math.sin(angle)*4,1.1,Math.cos(angle)*4));
            if(rockBounds.some(b=>b.containsPoint(position)))continue;
            const direction=center.clone().sub(position),distance=direction.length();ray.set(position,direction.normalize());ray.far=distance;
            if(!ray.intersectObjects(rocks,false).length){chosen={coral,center,position};break;}
          }
          if(chosen)break;
        }
        if(!chosen)throw Error('No unobstructed actual coral colony found for review');
        __reviewCamera.position.copy(chosen.position);__reviewCamera.lookAt(chosen.center);__reviewCamera.fov=36;__reviewCamera.updateProjectionMatrix();__reviewCamera.updateMatrixWorld();
        const main=document.querySelector('canvas[role=application]');for(const el of main.parentElement.children)if(el!==main)el.style.visibility='hidden';
        window.__coralReview={position:chosen.coral.position.toArray(),camera:chosen.position.toArray(),fixture:'Camera-only view of an existing colony clear of rocks; scene meshes, placement, lights and materials unchanged.'};
      });await page.waitForTimeout(400);await canvas.screenshot({path:path.join(__dirname,'coral-detail.png')});
    }
    if(process.argv.includes('--coral-only')){
      await step(1);await canvas.focus();await page.keyboard.press('Escape');await coralDetail();
      const file=path.join(__dirname,'capture-results.json'),result=JSON.parse(fs.readFileSync(file,'utf8'));result.coralDetail=await page.evaluate(()=>window.__coralReview);result.errors.push(...errors);fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({errors,coralDetail:result.coralDetail}));if(errors.length)process.exitCode=1;return;
    }
    await canvas.focus();await page.keyboard.down('KeyD');await step(8);await page.keyboard.up('KeyD');await page.keyboard.down('KeyW');await step(34);await page.keyboard.up('KeyW');await step(8);
    await canvas.screenshot({path:path.join(__dirname,'reef-desktop.png')});
    await page.keyboard.press('KeyF');await page.evaluate(()=>{THREE.Clock.prototype.getDelta=window.__nativeDelta;});await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();await page.waitForTimeout(700);
    await canvas.screenshot({path:path.join(__dirname,'reef-inspection.png')});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(700);await canvas.screenshot({path:path.join(__dirname,'reef-phone.png')});
    await page.setViewportSize({width:1280,height:1100});await page.evaluate(()=>{document.getElementById('wrap').style.width='1100px';window.dispatchEvent(new Event('resize'));});
    await canvas.focus();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    await coralDetail();
    await page.evaluate(()=>{__unmount();__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'humboldtSquid',huntMode:'observe',huntSeed:2741,huntQuality:'balanced',_threeLoaded:true}});});
    await page.waitForFunction(()=>document.querySelector('[data-hud=time]')?.textContent==='1s');
    await page.evaluate(async()=>{
      const w=window;w.__step=0;THREE.Clock.prototype.getDelta=function(){const d=w.__step;w.__step=0;return d;};
      const scene=__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1).scene,player=scene.getObjectByName('cl-player'),fish=scene.children.filter(o=>o.name==='cl-prey-fish').slice(0,8),approx=fish[0].position.clone().sub(fish[0].userData.offset),clone=THREE.Vector3.prototype.clone;let center;
      THREE.Vector3.prototype.clone=function(){if(this.distanceToSquared(approx)<4&&!fish.some(f=>f.position===this))center=this;return clone.call(this);};
      try{await new Promise(r=>requestAnimationFrame(r));}finally{THREE.Vector3.prototype.clone=clone;}
      if(!center)throw Error('No real school center found');
      center.copy(player.position).add(new THREE.Vector3(.9,.3,1.5));fish.forEach((f,i)=>{f.userData.offset.set(i?4+i:0,0,0);f.position.copy(center).add(f.userData.offset);});
      scene.children.forEach(o=>{if(o.userData.alive&&o.userData.cfg){o.position.set(20,.18,20);o.userData.speed=0;}});
    });
    await canvas.focus();await page.keyboard.press('KeyT');await step(2);await page.keyboard.press('KeyE');await step(5);await page.keyboard.press('KeyF');await page.evaluate(()=>{THREE.Clock.prototype.getDelta=window.__nativeDelta;});await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();await page.waitForTimeout(700);
    await canvas.screenshot({path:path.join(__dirname,'squid-strike-contact.png')});
    for(let i=0;i<3;i++)await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Higher',exact:true}).click();await page.waitForTimeout(700);await canvas.screenshot({path:path.join(__dirname,'squid-strike-oblique.png')});
    const result={errors,fixture:'Reef views use standard movement/inspection. Coral detail uses a paused camera-only close-up of an actual world colony with overlays hidden. Squid strike fixture places one actual fish school near the player, triggers normal T/E, advances 250ms including accepted-input frame, and inspects the real contact pose. No rig/geometry/material edits.',screenshots:['reef-desktop.png','reef-inspection.png','reef-phone.png','coral-detail.png','squid-strike-contact.png','squid-strike-oblique.png']};
    fs.writeFileSync(path.join(__dirname,'capture-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
