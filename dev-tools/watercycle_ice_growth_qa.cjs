'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = process.env.WC_REPO || process.cwd();
const fromRoot = createRequire(path.join(root, 'package.json'));
const { chromium } = fromRoot('playwright');
const expected = process.argv[2];
assert.match(expected || '', /^[0-9a-f]{64}$/, 'Pass the candidate SHA256');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sourcePath = path.join(root, 'stem_lab/stem_tool_watercycle.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const out = path.join(__dirname, 'qa-' + expected.slice(0, 12) + '-focused-6');
assert.equal(hash(fs.readFileSync(sourcePath)), expected);
assert.equal(hash(fs.readFileSync(mirrorPath)), expected);
fs.mkdirSync(out, { recursive: true });
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_storm_immersion_qa.cjs'), 'utf8').match(/const html=String.raw`([\s\S]*?)`;/)[1];
html = html.replace('var immersivePreview=', `const loader=StemLab.ensureThree; StemLab.ensureThree=function(options){return loader.call(StemLab,options).then(three=>{if(!three._coalescenceQA){three._coalescenceQA=true;const Native=three.WebGLRenderer;three.WebGLRenderer=function(options){const r=new Native(options),render=r.render;r.render=function(scene,camera){window.coalescenceQA={scene,camera,renderer:r};if(window.qaLowCostInteractions){const volume=scene.getObjectByName('storm-cloud-volume');if(volume)volume.visible=false;}if(window.qaObserveStages){const inputs=scene.getObjectByName('wc-coalescence-incoming');const frame=(inputs?.userData.coalescenceFrames||[]).find(f=>f.index===window.qaObservedIndex);if(frame&&window.qaObservedStages.at(-1)!==frame.stage)window.qaObservedStages.push(frame.stage);}return render.call(r,scene,camera);};return r;};}return three;});};\nvar immersivePreview=`);
html = html.replace('var immersivePreview=', `const originalArc=CanvasRenderingContext2D.prototype.arc,originalSave=CanvasRenderingContext2D.prototype.save;CanvasRenderingContext2D.prototype.save=function(...args){if(window.qaTrace2d&&this.canvas.id==='wcPrecipCanvas'&&new Error().stack.includes('at drawCloudFormationMicrophysics'))window.qaArcs2d=[];return originalSave.apply(this,args);};CanvasRenderingContext2D.prototype.arc=function(x,y,r,...args){if(window.qaTrace2d&&this.canvas.id==='wcPrecipCanvas'&&this.fillStyle==='#0284c7'&&new Error().stack.includes('drawCloudFormationMicrophysics'))window.qaArcs2d.push({x,y,r});return originalArc.call(this,x,y,r,...args);};\nvar immersivePreview=`);
html = html.replace('var immersivePreview=', `const iceSave=CanvasRenderingContext2D.prototype.save,iceMove=CanvasRenderingContext2D.prototype.moveTo,iceLine=CanvasRenderingContext2D.prototype.lineTo;CanvasRenderingContext2D.prototype.save=function(...args){if(window.qaIce2dOn&&this.canvas.id==='wcPrecipCanvas'&&(new Error().stack.split('\\n')[2]||'').includes('at drawCloudFormationMicrophysics'))window.qaIce2d=[];return iceSave.apply(this,args);};CanvasRenderingContext2D.prototype.moveTo=function(x,y){this._iceMove=[x,y];return iceMove.call(this,x,y);};CanvasRenderingContext2D.prototype.lineTo=function(x,y){if(window.qaIce2dOn&&this.canvas.id==='wcPrecipCanvas'&&this.strokeStyle==='#e0f2fe'&&Math.abs(this.lineWidth-1.2)<.0001&&new Error().stack.includes('drawCloudFormationMicrophysics'))window.qaIce2d.push([...this._iceMove,x,y]);return iceLine.call(this,x,y);};\nvar immersivePreview=`);
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {res.setHeader('Content-Type', 'text/html'); return res.end(html);}
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(path.resolve(root) + path.sep)) {res.writeHead(403); return res.end();}
  fs.readFile(file, (error, data) => {if (error) {res.writeHead(404); return res.end();} res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');res.end(data);});
});
let browser, page;
const checks = [], captures = [], errors = [], layouts = [];
function check(label, fn) {fn(); checks.push(label); console.log('PASS ' + label);}
async function capture(locator, name) {await locator.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));const clip=await locator.boundingBox();await page.screenshot({path:path.join(out,name+'.png'),clip,timeout:60000});captures.push(name+'.png');}
async function sceneState() {
  return page.evaluate(() => {
    const camera=coalescenceQA.camera, renderer=coalescenceQA.renderer;
    const viewport=renderer.getSize(new THREE.Vector2());
    function describe(name) {
      const node = coalescenceQA.scene.getObjectByName(name);
      if (!node) return null;
      let visible = true; for (let current = node; current; current = current.parent) visible = visible && current.visible;
      const positions=Array.from(node.geometry.attributes.position.array).slice(0,node.geometry.drawRange.count*3),worldPositions=[];
      for(let i=0;i<positions.length;i+=3){const vector=new THREE.Vector3(...positions.slice(i,i+3)).applyMatrix4(node.matrixWorld);worldPositions.push(vector.x,vector.y,vector.z);}
      const projectedPairs=name==='wc-coalescence-incoming'?(node.userData.coalescenceFrames||[]).filter(f=>f.incomingCount).map(frame=>{
        const a=new THREE.Vector3(...worldPositions.slice(frame.inputOffset*3,frame.inputOffset*3+3));
        const b=new THREE.Vector3(...worldPositions.slice(frame.inputOffset*3+3,frame.inputOffset*3+6));
        const za=-a.clone().applyMatrix4(camera.matrixWorldInverse).z,zb=-b.clone().applyMatrix4(camera.matrixWorldInverse).z;
        a.project(camera);b.project(camera);
        return {index:frame.index,stage:frame.stage,separation:frame.separation,distance:Math.hypot((a.x-b.x)*viewport.x/2,(a.y-b.y)*viewport.y/2),diameterA:node.material.size*viewport.y/2/za,diameterB:node.material.size*viewport.y/2/zb};
      }):[];
      return {name:node.name, type:node.type, visible, ownVisible:node.visible, count:node.geometry.drawRange.count, size:node.material.size, opacity:node.material.opacity,
        positions,worldPositions,projectedPairs,frames:node.userData.coalescenceFrames || [],texture:node.material.map && node.material.map.uuid};
    }
    return {projectionY:camera.projectionMatrix.elements[5],incoming:describe('wc-coalescence-incoming'), merged:describe('wc-coalescence-merged')};
  });
}
function finitePositions(state) {return ['incoming','merged'].every(key => state[key] && state[key].positions.every(Number.isFinite));}
function checkGeometry(state, label) {
  check(label + ': finite live geometry', () => {assert(finitePositions(state));assert(state.incoming.count > 0);assert(state.merged.count > 0);});
  check(label + ': two equal inputs form one volume-conserving drop', () => {assert(Math.abs(Math.pow(state.merged.size / state.incoming.size, 3) - 2) < 1e-6);assert.equal(state.incoming.count % 2, 0);assert.equal(state.incoming.count / 2 + state.merged.count, 18);});
  check(label + ': shared particle texture', () => {assert(state.incoming.texture);assert.equal(state.incoming.texture, state.merged.texture);});
  check(label + ': actual packed geometry matches each event', () => {
    const frames = state.incoming.frames;
    assert.equal(frames.length, 18);assert.deepEqual(frames, state.merged.frames);
    let inputCount = 0, mergedCount = 0;
    frames.forEach(frame => {
      if (frame.incomingCount === 2) {
        assert.equal(frame.inputOffset, inputCount);assert.equal(frame.mergedOffset, -1);assert.equal(frame.mergedCount, 0);
        const offset = frame.inputOffset * 3, pos = state.incoming.worldPositions;
        const distance = Math.hypot(pos[offset]-pos[offset+3], pos[offset+1]-pos[offset+4], pos[offset+2]-pos[offset+5]);
        const worldDiameter=state.incoming.size/state.projectionY;
        assert(Math.abs(distance-worldDiameter*frame.separation)<1e-5, 'Particle center distance follows the stage: '+JSON.stringify({index:frame.index,stage:frame.stage,distance,expected:worldDiameter*frame.separation,size:state.incoming.size,projectionY:state.projectionY}));
        assert(frame.stage === 'approach' || frame.stage === 'touch');
        if(frame.stage === 'touch')assert(Math.abs(distance-worldDiameter)<1e-5, 'Touching circles meet at their edges');
        inputCount += 2;
      } else {
        assert.equal(frame.incomingCount,0);assert.equal(frame.mergedCount,1);assert.equal(frame.inputOffset,-1);assert.equal(frame.mergedOffset,mergedCount);assert.equal(frame.stage,'merged');
        mergedCount += 1;
      }
    });
    assert.equal(inputCount,state.incoming.count);assert.equal(mergedCount,state.merged.count);
  });
  check(label + ': projected particle circles meet at contact', () => state.incoming.projectedPairs.forEach(pair => {
    assert(Math.abs(pair.diameterA-pair.diameterB)<0.01,'Billboard pair shares camera depth: '+JSON.stringify(pair));
    assert(Math.abs(pair.distance-pair.diameterA*pair.separation)<0.02,'Projected separation follows actual sprite diameter: '+JSON.stringify(pair));
  }));
}
async function checkOverlayLayout(label) {
  const layout=await page.evaluate(() => {
    const group=document.querySelector('.wc-precip-3d-focus'),rail=document.querySelector('.wc-precip-3d-thermal-rail'),chamber=group.closest('.wc-precip-chamber');
    const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const content=node=>{const range=document.createRange();range.selectNodeContents(node);const r=range.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const info=node=>{let opaque=true;for(let ancestor=node;ancestor;ancestor=ancestor.parentElement)opaque=opaque&&Number(getComputedStyle(ancestor).opacity)>0;return {text:node.textContent.trim(),rect:rect(node),content:content(node),display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility,opaque};};
    return {viewport:innerWidth,canvasWidth:document.getElementById('wcPrecip3dCanvas').getBoundingClientRect().width,chamber:rect(chamber),group:rect(group),rail:rect(rail),title:info(rail.querySelector('strong')),note:info(rail.querySelector('small')),rows:Array.from(rail.querySelectorAll('.wc-precip-3d-thermal-level')).map(row=>({rect:rect(row),label:info(row.querySelector('b')),value:info(row.querySelector('em'))})),buttons:Array.from(group.querySelectorAll('button')).map(info)};
  });
  const fits=(inner,outer,tolerance=2)=>inner.left>=outer.left-tolerance&&inner.right<=outer.right+tolerance&&inner.top>=outer.top-tolerance&&inner.bottom<=outer.bottom+tolerance;
  check(label+': camera controls and air column do not overlap',()=>{
    const intersectionWidth=Math.max(0,Math.min(layout.group.right,layout.rail.right)-Math.max(layout.group.left,layout.rail.left));
    const intersectionHeight=Math.max(0,Math.min(layout.group.bottom,layout.rail.bottom)-Math.max(layout.group.top,layout.rail.top));
    assert(intersectionWidth*intersectionHeight<0.5,JSON.stringify(layout));assert(fits(layout.group,layout.chamber));assert(fits(layout.rail,layout.chamber));
  });
  check(label+': all three air temperatures are visible within the card',()=>{
    assert.deepEqual(layout.rows.map(row=>row.label.text),['Cloud','Middle','Surface']);
    layout.rows.forEach(row=>{assert(fits(row.rect,layout.rail));for(const item of [row.label,row.value]){assert(item.display!=='none'&&item.visibility==='visible'&&item.opaque);assert(item.rect.width>0&&item.rect.height>0);assert(fits(item.content,layout.rail));}});
    assert(layout.note.display!=='none'&&layout.note.visibility==='visible'&&layout.note.opaque);assert(fits(layout.note.content,layout.rail));
    assert(layout.title.display!=='none'&&layout.title.visibility==='visible'&&layout.title.opaque);assert(layout.title.rect.width>0&&layout.title.rect.height>0);assert(fits(layout.title.content,layout.rail));
  });
  check(label+': all four camera choices are readable and contained',()=>{
    assert.deepEqual(layout.buttons.map(button=>button.text),['Inside the storm','Whole storm','Inside cloud','Surface path']);
    layout.buttons.forEach(button=>{assert(button.display!=='none'&&button.visibility==='visible'&&button.opaque);assert(button.rect.width>=24&&button.rect.height>=24);assert(fits(button.rect,layout.group));assert(fits(button.content,button.rect));});
  });
  layouts.push({label,...layout});
}
async function iceState() {
  return page.evaluate(() => {
    const camera=coalescenceQA.camera;
    return ['wc-ice-growth-crystals','wc-ice-growth-vapor'].map(name=>{
      const node=coalescenceQA.scene.getObjectByName(name);if(!node)return null;
      let visible=true;for(let n=node;n;n=n.parent)visible=visible&&n.visible;
      const positions=Array.from(node.geometry.attributes.position.array).slice(0,node.geometry.drawRange.count*3);
      const world=[],depth=[];
      for(let i=0;i<positions.length;i+=3){const p=new THREE.Vector3(...positions.slice(i,i+3)).applyMatrix4(node.matrixWorld);world.push([p.x,p.y,p.z]);depth.push(p.clone().applyMatrix4(camera.matrixWorldInverse).z);}
      return {name,visible,count:node.geometry.drawRange.count,positions,world,depth,frames:node.userData.iceGrowthFrames||[]};
    });
  });
}
function checkIce(state,label) {
  const [crystal,vapor]=state;
  check(label+': twelve visible branched crystals use finite rendered geometry',()=>{assert(crystal.visible);assert.equal(crystal.frames.length,12);assert.equal(crystal.count,720);assert(crystal.positions.every(Number.isFinite));assert(vapor.positions.every(Number.isFinite));});
  check(label+': each crystal retains six equal arms and sixty-degree symmetry',()=>{
    crystal.frames.forEach(frame=>{
      const arms=[];
      for(let arm=0;arm<6;arm++){
        const offset=frame.segmentOffset+arm*10,a=crystal.world[offset],b=crystal.world[offset+1],v=b.map((n,i)=>n-a[i]);
        const length=Math.hypot(...v);assert(Math.abs(length-frame.radius*frame.worldRadius)<1e-6);arms.push(v.map(n=>n/length));
      }
      for(let arm=0;arm<6;arm++)assert(Math.abs(arms[arm].reduce((n,v,i)=>n+v*arms[(arm+1)%6][i],0)-0.5)<1e-5);
      const depths=crystal.depth.slice(frame.segmentOffset,frame.segmentOffset+60);assert(Math.max(...depths)-Math.min(...depths)<1e-5);
    });
  });
  check(label+': hollow vapor tracers disappear after deposition',()=>{
    assert.equal(vapor.count,crystal.frames.reduce((n,f)=>n+f.tracerCount*16,0));
    crystal.frames.forEach(f=>{assert.equal(f.tracerCount,f.stage==='grown'?0:3);assert(f.tracerRadius>=f.radius-1e-12);});
  });
}
async function coldMount(mode,paused,tempC=-12){
  await page.evaluate(({mode,paused,tempC})=>mountStorm({wcMode:'precipHunt',precipHunt:Object.assign({},WaterCyclePrecipitationKernel.presets.mountainSnow,{preset:'mountainSnow',viewMode:mode,cameraFocus:'cloud',tempC,paused,showStormAnatomy:false})}),{mode,paused,tempC});
  await page.waitForSelector(mode==='3d'?'#wcPrecip3dCanvas[data-rendered="true"]':'#wcPrecipCanvas');
  if(mode==='2d')await page.waitForFunction(()=>!!document.getElementById('wcPrecipCanvas').dataset.cloudFormationRendering);
}

async function warmMount(mode, paused) {
  await page.evaluate(({mode, paused}) => mountStorm({wcMode:'precipHunt', precipHunt:Object.assign({}, WaterCyclePrecipitationKernel.presets.gentleRain, {
    preset:'gentleRain', moisture:96,tempC:5,midLevelTempC:9,lowLevelHumidity:90,surfaceTempC:18,wind:10,windDirection:'east',updraft:68,cloudDepth:8,terrain:'plains',viewMode:mode,cameraFocus:'cloud',paused,showStormAnatomy:false
  })}), {mode, paused});
  await page.waitForSelector(mode === '3d' ? '#wcPrecip3dCanvas[data-rendered="true"]' : '#wcPrecipCanvas');
  if(mode === '2d') await page.waitForFunction(() => !!document.getElementById('wcPrecipCanvas').dataset.cloudFormationRendering);
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  page=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
  const details={};
  function assertGrowthStill(before,after){
    const signature=state=>state[0].frames.map(f=>({index:f.index,cycle:f.cycle,stage:f.stage,radius:f.radius,tracerCount:f.tracerCount,anchor:f.anchor}));
    assert.deepEqual(signature(after),signature(before));
    for(const frame of after[0].frames)for(let arm=0;arm<6;arm++){
      const a=after[0].world[frame.segmentOffset+arm*10],b=after[0].world[frame.segmentOffset+arm*10+1];
      assert(Math.abs(Math.hypot(...b.map((v,i)=>v-a[i]))-frame.radius*frame.worldRadius)<1e-5);
    }
  }
  async function waitForStaticGrowth(){await page.waitForFunction(()=>coalescenceQA.scene.getObjectByName('wc-ice-growth-crystals').userData.iceGrowthFrames.every(f=>f.cycle===((f.index*7)%17)/17));}
  try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    console.log('STEP cold paused');await coldMount('3d',true);
    details.paused=await iceState();checkIce(details.paused,'Paused cold cloud');
    check('All three ice-growth stages remain available while paused',()=>assert.deepEqual([...new Set(details.paused[0].frames.map(f=>f.stage))].sort(),['growing','grown','seed']));
    await page.waitForTimeout(200);const pausedAfter=await iceState();check('Paused ice growth and rendered arm lengths stay fixed',()=>assertGrowthStill(details.paused,pausedAfter));
    await checkOverlayLayout('Desktop cold cloud');await capture(page.locator('#wcPrecip3dCanvas'),'desktop-ice-paused');
    await page.setViewportSize({width:390,height:940});await capture(page.locator('#wcPrecip3dCanvas'),'phone-ice-reduced');
    await page.evaluate(()=>{window.qaLowCostInteractions=true;});
    await page.setViewportSize({width:1100,height:900});
    console.log('STEP native orbit');const canvas=page.locator('#wcPrecip3dCanvas');await canvas.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));const box=await canvas.boundingBox();
    const cameraBefore=await page.evaluate(()=>coalescenceQA.camera.position.toArray());
    await page.mouse.move(box.x+box.width*.45,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.54,{steps:5});await page.mouse.up();
    await page.waitForFunction(before=>JSON.stringify(coalescenceQA.camera.position.toArray())!==JSON.stringify(before),cameraBefore);
    details.orbited=await iceState();checkIce(details.orbited,'Orbited cold cloud');
    console.log('STEP native resume');await page.emulateMedia({reducedMotion:'no-preference'});
    await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).press('Space');
    await page.waitForFunction(before=>coalescenceQA.scene.getObjectByName('wc-ice-growth-crystals').userData.iceGrowthFrames.some((f,i)=>Math.abs(f.radius-before[i])>.0001),details.paused[0].frames.map(f=>f.radius));
    details.moving=await iceState();checkIce(details.moving,'Animating cold cloud');
    check('Keyboard resume grows rendered crystal arms',()=>assert.notDeepEqual(details.moving[0].frames.map(f=>f.radius),details.paused[0].frames.map(f=>f.radius)));
    console.log('STEP native pause');await page.getByRole('button',{name:'Pause precipitation animation',exact:true}).press('Space');
    await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).waitFor({state:'visible'});
    await waitForStaticGrowth();const stopped=await iceState();await page.waitForTimeout(200);const stoppedAfter=await iceState();check('Keyboard pause freezes growth while preserving camera-facing crystals',()=>assertGrowthStill(stopped,stoppedAfter));
    console.log('STEP reduced motion');
    await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).press('Space');
    await page.getByRole('button',{name:'Pause precipitation animation',exact:true}).waitFor({state:'visible'});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByRole('button',{name:'Animation is static because reduced motion is enabled',exact:true}).waitFor({state:'visible'});
    await waitForStaticGrowth();details.reduced=await iceState();await page.waitForTimeout(200);const reducedAfter=await iceState();check('Reduced motion holds unpaused ice growth still',()=>assertGrowthStill(details.reduced,reducedAfter));
    await page.setViewportSize({width:390,height:940});await checkOverlayLayout('Phone cold cloud');
    const iceCopy=await page.locator('.wc-precip-3d-science').innerText();
    check('Explanation distinguishes deposition and supercooled liquid',()=>{for(const word of ['Deposition','invisible gas','supercooled','illustrative'])assert(iceCopy.includes(word));});
    fs.writeFileSync(path.join(out,'ice-visible-copy.txt'),iceCopy);fs.writeFileSync(path.join(out,'visible-copy.txt'),await page.locator('.wc-precip-lab').innerText());
    await capture(page.locator('.wc-precip-3d-science'),'phone-ice-science');
    const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2);check('Phone content fits without horizontal overflow',()=>assert(noOverflow));
    console.log('STEP scope and temperature');await page.getByRole('button',{name:'Whole storm',exact:true}).press('Space');
    await page.waitForFunction(()=>!coalescenceQA.scene.getObjectByName('wc-ice-growth-crystals').visible);
    const whole=await iceState();check('Enlarged ice samples stay in the cloud inspection view',()=>assert(whole.every(n=>!n.visible&&n.count===0)));
    await page.getByRole('button',{name:'Inside cloud',exact:true}).press('Space');
    async function changeCloudTemperature(value){
      await page.locator('#wcPrecip-tempC').evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
      await page.waitForFunction(value=>document.querySelector('#wcPrecip-tempC').getAttribute('aria-valuetext')===value+' degrees Celsius at cloud base',value);
    }
    await changeCloudTemperature(0);await page.waitForFunction(()=>coalescenceQA.scene.getObjectByName('wc-ice-growth-crystals').geometry.drawRange.count===0);
    const zero=await iceState();check('Zero degrees alone does not activate ice growth',()=>assert(zero.every(n=>!n.visible&&n.count===0)));
    console.log('STEP warm regression');await changeCloudTemperature(15);
    await page.waitForFunction(()=>coalescenceQA.scene.getObjectByName('wc-coalescence-incoming').geometry.drawRange.count>0);
    const warmIce=await iceState();check('Warm cloud hides cold growth samples',()=>assert(warmIce.every(n=>!n.visible&&n.count===0)));checkGeometry(await sceneState(),'Warm cloud regression');
    console.log('STEP 2D cold');await changeCloudTemperature(-12);await page.evaluate(()=>{window.qaIce2dOn=true;window.qaIce2d=[];});
    await page.getByRole('button',{name:'2D chamber',exact:true}).press('Space');await page.waitForSelector('#wcPrecipCanvas');
    await page.waitForFunction(()=>window.qaIce2d.length===240);
    details.actual2d=await page.evaluate(()=>qaIce2d);
    check('2D draws eight complete branched crystals',()=>{assert.equal(details.actual2d.length,240);assert(details.actual2d.every(s=>s.every(Number.isFinite)));});
    check('Actual 2D arms have equal lengths with different growth stages',()=>{
      const lengths=Array.from({length:8},(_,i)=>{const s=details.actual2d[i*30];return Math.hypot(s[2]-s[0],s[3]-s[1]);});assert(Math.max(...lengths)/Math.min(...lengths)>2);
      for(let i=0;i<8;i++)for(let a=1;a<6;a++){const s=details.actual2d[i*30+a*5];assert(Math.abs(Math.hypot(s[2]-s[0],s[3]-s[1])-lengths[i])<1e-6);}
    });
    const cold2d=await page.locator('#wcPrecipCanvas').evaluate(n=>n.toDataURL());await page.waitForTimeout(200);const cold2dAfter=await page.locator('#wcPrecipCanvas').evaluate(n=>n.toDataURL());check('Reduced-motion cold 2D remains static',()=>assert.equal(cold2dAfter,cold2d));
    await capture(page.locator('#wcPrecipCanvas'),'phone-ice-2d');await page.setViewportSize({width:1100,height:900});await capture(page.locator('#wcPrecipCanvas'),'desktop-ice-2d');
    assert.deepEqual(errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),expected);assert.equal(hash(fs.readFileSync(mirrorPath)),expected);
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,sourceSha256:expected,harnessSha256:hash(fs.readFileSync(__filename)),checks,checkCount:checks.length,captures,captureCount:captures.length,errors,layouts,details,renderingNote:'Desktop and phone 3D captures include the full cloud volume. Subsequent interaction checks hide only the cloud-volume mesh to keep the software renderer responsive; actual particle geometry, camera and controls remain active.'},null,2));
    console.log('PASS '+checks.length+' browser checks');
  }catch(error){
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:false,sourceSha256:expected,harnessSha256:hash(fs.readFileSync(__filename)),checks,checkCount:checks.length,captures,captureCount:captures.length,errors,layouts,error:String(error),stack:error.stack},null,2));
    throw error;
  }finally{
    await browser.close();await new Promise(resolve=>server.close(resolve));
    const f=path.join(out,'result.json'),record=JSON.parse(fs.readFileSync(f));record.resources={browserClosed:true,serverClosed:true};fs.writeFileSync(f,JSON.stringify(record,null,2));console.log('Owned browser and server closed');
  }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
