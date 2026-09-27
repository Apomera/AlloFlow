const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const prefix=process.argv.includes('--initial')?'initial-':'';
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[],screenshots=[],details=[];
    page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const url=fs.readFileSync(path.join(__dirname,'../preview-url.txt'),'utf8').trim();
    await page.goto(url+'?species=humboldtSquid&mode=observe');
    const canvas=page.locator('canvas[role=application]');await canvas.waitFor();
    await page.waitForFunction(()=>parseInt(document.querySelector('[data-hud=time]')?.textContent||'0')>=1);
    await page.evaluate(()=>{
      window.__nativeDelta=THREE.Clock.prototype.getDelta;window.__step=0;THREE.Clock.prototype.getDelta=function(){const d=window.__step;window.__step=0;return d;};
      const update=THREE.Camera.prototype.updateMatrixWorld;THREE.Camera.prototype.updateMatrixWorld=function(...args){if(this.isPerspectiveCamera)window.__reviewCamera=this;return update.apply(this,args);};
    });
    async function step(n){await page.evaluate(async count=>{for(let i=0;i<count;i++){window.__step=.05;do{await new Promise(r=>requestAnimationFrame(r));}while(window.__step!==0);}},n);}
    async function shot(name){const file=prefix+name+'.png';await canvas.screenshot({path:path.join(__dirname,file)});screenshots.push(file);}
    await step(2);await canvas.focus();await page.keyboard.press('KeyF');
    await page.evaluate(()=>{THREE.Clock.prototype.getDelta=window.__nativeDelta;});
    await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Higher',exact:true}).click();
    await page.waitForTimeout(600);await shot('squid-profile');
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';window.dispatchEvent(new Event('resize'));});
    await page.waitForTimeout(600);await shot('squid-phone');
    await page.setViewportSize({width:1280,height:1100});await page.evaluate(()=>{document.getElementById('wrap').style.width='1100px';window.dispatchEvent(new Event('resize'));});
    await canvas.focus();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    async function detail(name,position,target,fov=36){
      details.push(await page.evaluate(({position,target,fov,name})=>{
        const scene=__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1).scene,player=scene.getObjectByName('cl-player');scene.updateMatrixWorld(true);
        const cameraPosition=player.localToWorld(new THREE.Vector3(...position)),look=player.localToWorld(new THREE.Vector3(...target));
        __reviewCamera.position.copy(cameraPosition);__reviewCamera.lookAt(look);__reviewCamera.fov=fov;__reviewCamera.updateProjectionMatrix();__reviewCamera.updateMatrixWorld();
        const main=document.querySelector('canvas[role=application]');for(const el of main.parentElement.children)if(el!==main)el.style.visibility='hidden';
        const cups=player.getObjectByName('cl-suckers');return{name,camera:cameraPosition.toArray(),target:look.toArray(),suckerInstances:cups.count,suckerVertices:cups.geometry.attributes.position.count};
      },{position,target,fov,name}));
      await page.waitForTimeout(350);await shot(name);
    }
    await detail('squid-arm-detail',[1.25,-.65,2.15],[0,-.04,.9],34);
    await detail('squid-crown-front',[.28,.03,2.15],[0,-.035,.84],31);
    await page.evaluate(()=>{const main=document.querySelector('canvas[role=application]');for(const el of main.parentElement.children)if(el!==main)el.style.visibility='';window.__step=0;THREE.Clock.prototype.getDelta=function(){const d=window.__step;window.__step=0;return d;};});
    await canvas.focus();await page.keyboard.press('Escape');await step(1);
    await page.evaluate(async()=>{
      const scene=__glRecorder.records.filter(r=>r.scene&&r.canvas.isConnected).at(-1).scene,player=scene.getObjectByName('cl-player'),fish=scene.children.filter(o=>o.name==='cl-prey-fish').slice(0,8),approx=fish[0].position.clone().sub(fish[0].userData.offset),clone=THREE.Vector3.prototype.clone;let center;
      THREE.Vector3.prototype.clone=function(){if(this.distanceToSquared(approx)<4&&!fish.some(f=>f.position===this))center=this;return clone.call(this);};
      try{await new Promise(r=>requestAnimationFrame(r));}finally{THREE.Vector3.prototype.clone=clone;}
      if(!center)throw Error('No real school center found');
      scene.updateMatrixWorld(true);center.copy(player.localToWorld(new THREE.Vector3(.60,.22,1.5)));
      fish.forEach((f,i)=>{f.userData.offset.set(i?4+i:0,0,0);f.position.copy(center).add(f.userData.offset);});
      scene.children.forEach(o=>{if(o.userData.alive&&o.userData.cfg){o.position.set(20,.18,20);o.userData.speed=0;}});
    });
    await page.keyboard.press('KeyT');await step(2);await page.keyboard.press('KeyE');await step(4);await page.keyboard.press('Escape');
    await detail('squid-reaching-clubs',[2.3,-.6,3.2],[.2,.12,1.03],44);
    const result={errors,screenshots,details,fixture:'Profile and phone use normal paused inspection. Close-ups only move the paused camera and hide overlays. The reaching-club view moves one actual fish school near the player, triggers normal T/E and pauses during wind-up. No animal geometry, material, lighting or rig pose override.'};
    fs.writeFileSync(path.join(__dirname,prefix+'capture-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
