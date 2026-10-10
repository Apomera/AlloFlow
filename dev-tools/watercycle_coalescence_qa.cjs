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
const out = path.join(__dirname, 'qa-' + expected.slice(0, 12));
assert.equal(hash(fs.readFileSync(sourcePath)), expected);
assert.equal(hash(fs.readFileSync(mirrorPath)), expected);
fs.mkdirSync(out, { recursive: true });
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_storm_immersion_qa.cjs'), 'utf8').match(/const html=String.raw`([\s\S]*?)`;/)[1];
html = html.replace('var immersivePreview=', `const loader=StemLab.ensureThree; StemLab.ensureThree=function(options){return loader.call(StemLab,options).then(three=>{if(!three._coalescenceQA){three._coalescenceQA=true;const Native=three.WebGLRenderer;three.WebGLRenderer=function(options){const r=new Native(options),render=r.render;r.render=function(scene,camera){window.coalescenceQA={scene,camera,renderer:r};if(window.qaObserveStages){const inputs=scene.getObjectByName('wc-coalescence-incoming');const frame=(inputs?.userData.coalescenceFrames||[]).find(f=>f.index===window.qaObservedIndex);if(frame&&window.qaObservedStages.at(-1)!==frame.stage)window.qaObservedStages.push(frame.stage);}return render.call(r,scene,camera);};return r;};}return three;});};\nvar immersivePreview=`);
html = html.replace('var immersivePreview=', `const originalArc=CanvasRenderingContext2D.prototype.arc,originalSave=CanvasRenderingContext2D.prototype.save;CanvasRenderingContext2D.prototype.save=function(...args){if(window.qaTrace2d&&this.canvas.id==='wcPrecipCanvas'&&(new Error().stack.split('\\n')[2]||'').includes('at drawCloudFormationMicrophysics'))window.qaArcs2d=[];return originalSave.apply(this,args);};CanvasRenderingContext2D.prototype.arc=function(x,y,r,...args){if(window.qaTrace2d&&this.canvas.id==='wcPrecipCanvas'&&this.fillStyle==='#0284c7'&&new Error().stack.includes('drawCloudFormationMicrophysics'))window.qaArcs2d.push({x,y,r});return originalArc.call(this,x,y,r,...args);};\nvar immersivePreview=`);
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
async function capture(locator, name) {await locator.scrollIntoViewIfNeeded(); await locator.screenshot({path:path.join(out, name + '.png')}); captures.push(name + '.png');}
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
async function warmMount(mode, paused) {
  await page.evaluate(({mode, paused}) => mountStorm({wcMode:'precipHunt', precipHunt:Object.assign({}, WaterCyclePrecipitationKernel.presets.gentleRain, {
    preset:'gentleRain', moisture:96,tempC:5,midLevelTempC:9,lowLevelHumidity:90,surfaceTempC:18,wind:10,windDirection:'east',updraft:68,cloudDepth:8,terrain:'plains',viewMode:mode,cameraFocus:'cloud',paused,showStormAnatomy:false
  })}), {mode, paused});
  await page.waitForSelector(mode === '3d' ? '#wcPrecip3dCanvas[data-rendered="true"]' : '#wcPrecipCanvas');
  if(mode === '2d') await page.waitForFunction(() => !!document.getElementById('wcPrecipCanvas').dataset.cloudFormationRendering);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  page = await browser.newPage({viewport:{width:1440,height:1100}, reducedMotion:'no-preference'});
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => {if(message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text()))errors.push(message.text());});
  try {
    await page.goto(url);
    await page.evaluate(() => {window.qaTrace2d=true;window.qaArcs2d=[];});
    await warmMount('2d', true);
    const canvas2d = page.locator('#wcPrecipCanvas');
    const frame2d = await canvas2d.evaluate(node => node.toDataURL());
    await page.waitForTimeout(250);
    const frame2dAfter = await canvas2d.evaluate(node => node.toDataURL());
    check('Paused 2D remains visually still', () => assert.equal(frame2dAfter, frame2d));
    const actual2d = await page.evaluate(() => {window.qaTrace2d=false;return {arcs:qaArcs2d,frames:Array.from({length:9},(_,index)=>WaterCycleCoalescenceFrame(((index*31)%43)/43))};});
    check('2D renders two inputs or one merged circle per event', () => {
      const baseRadius = actual2d.arcs[0].r;
      let offset = 0;
      actual2d.frames.forEach(frame => {
        if(frame.incomingCount === 2) {
          const a=actual2d.arcs[offset++],b=actual2d.arcs[offset++];
          assert(Math.abs(a.r-baseRadius)<1e-8);assert(Math.abs(b.r-baseRadius)<1e-8);
          assert(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-2*baseRadius*frame.separation)<1e-6);
        } else {
          const merged=actual2d.arcs[offset++];assert(Math.abs(Math.pow(merged.r/baseRadius,3)-2)<1e-6);
        }
      });
      assert.equal(offset,actual2d.arcs.length);
    });
    await capture(canvas2d, 'desktop-2d-paused');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByRole('button', {name:'View this setup in 3D cloud chamber',exact:true}).click();
    await page.waitForSelector('#wcPrecip3dCanvas[data-rendered="true"]');
    await page.getByRole('button',{name:'Inside cloud',exact:true}).click();
    await page.waitForFunction(() => document.getElementById('wcPrecip3dCanvas').dataset.precipitationCameraFocus === 'cloud');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.getByRole('button',{name:'Inside cloud',exact:true}).click();
    const canvas3d = page.locator('#wcPrecip3dCanvas');
    const paused = await sceneState();
    checkGeometry(paused, 'Paused 3D');
    check('Coalescence visible in warm inspection', () => {assert(paused.incoming.visible && paused.merged.visible);assert(paused.incoming.opacity > 0 && paused.merged.opacity > 0);});
    await page.waitForTimeout(250);
    const pausedAfter = await sceneState();
    check('Paused 3D preserves particle positions and phases', () => assert.deepEqual(pausedAfter, paused));
    await checkOverlayLayout('Desktop');
    await capture(canvas3d, 'desktop-3d-paused');
    await page.evaluate(index => {window.qaObserveStages=true;window.qaObservedIndex=index;window.qaObservedStages=['approach'];}, paused.incoming.frames.filter(frame=>frame.stage==='approach').sort((a,b)=>a.separation-b.separation)[0].index);
    await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).click();
    await page.waitForFunction(old => {
      const node=coalescenceQA.scene.getObjectByName('wc-coalescence-incoming');return JSON.stringify(Array.from(node.geometry.attributes.position.array).slice(0,node.geometry.drawRange.count*3))!==old;
    }, JSON.stringify(paused.incoming.positions));
    const moving = await sceneState();
    checkGeometry(moving, 'Animating 3D');
    check('Resume advances real coalescence geometry', () => assert.notDeepEqual(moving.incoming.positions, paused.incoming.positions));
    await page.waitForFunction(() => qaObservedStages.includes('merged'), null, {timeout:45000});
    const observedStages = await page.evaluate(() => {window.qaObserveStages=false;return qaObservedStages;});
    check('A rendered event progresses through approach, contact and merge', () => assert.deepEqual(observedStages.slice(0,3), ['approach','touch','merged']));
    await page.getByRole('button',{name:'Pause precipitation animation',exact:true}).click();
    const stopped = await sceneState();
    await page.waitForTimeout(200);
    const stoppedAfter = await sceneState();
    check('Native pause freezes resumed coalescence', () => assert.deepEqual(stoppedAfter, stopped));
    await page.getByRole('button',{name:'Whole storm',exact:true}).click();
    await page.waitForFunction(() => document.getElementById('wcPrecip3dCanvas').dataset.precipitationCameraFocus === 'storm');
    const wholeStorm = await sceneState();
    check('Whole storm camera preserves valid coalescence geometry', () => assert(finitePositions(wholeStorm)));
    await page.getByRole('button',{name:'Inside cloud',exact:true}).click();
    await page.emulateMedia({reducedMotion:'reduce'});
    await warmMount('3d', false);
    const reduced = await sceneState();
    checkGeometry(reduced, 'Reduced motion 3D');
    await page.waitForTimeout(250);
    assert.deepEqual(await sceneState(), reduced);
    checks.push('Reduced motion 3D remains static while unpaused');
    const orbitCanvas=page.locator('#wcPrecip3dCanvas');await orbitCanvas.scrollIntoViewIfNeeded();
    const beforeOrbit=await page.evaluate(() => coalescenceQA.camera.position.toArray());
    const orbitBounds=await orbitCanvas.boundingBox();
    await page.mouse.move(orbitBounds.x+orbitBounds.width*0.5,orbitBounds.y+orbitBounds.height*0.4);
    await page.mouse.down();await page.mouse.move(orbitBounds.x+orbitBounds.width*0.65,orbitBounds.y+orbitBounds.height*0.45,{steps:8});await page.mouse.up();
    await page.waitForFunction(before=>JSON.stringify(coalescenceQA.camera.position.toArray())!==JSON.stringify(before),beforeOrbit);
    const orbited=await sceneState();checkGeometry(orbited,'Native orbit 3D');
    await capture(page.locator('#wcPrecip3dCanvas'), 'desktop-3d-reduced');
    const chamberStyle=await page.locator('.wc-precip-chamber').getAttribute('style');
    await page.locator('.wc-precip-chamber').evaluate(node=>{node.style.width='330px';node.style.maxWidth='330px';});
    await page.waitForFunction(()=>document.getElementById('wcPrecip3dCanvas').getBoundingClientRect().width<=332);
    await checkOverlayLayout('330px chamber in a wide viewport');
    await page.locator('.wc-precip-chamber').evaluate((node,style)=>{if(style===null)node.removeAttribute('style');else node.setAttribute('style',style);},chamberStyle);
    await page.waitForFunction(()=>document.getElementById('wcPrecip3dCanvas').getBoundingClientRect().width>500);
    await page.setViewportSize({width:390,height:940});
    await checkOverlayLayout('390px phone');
    await capture(page.locator('#wcPrecip3dCanvas'), 'phone-3d-reduced');
    await capture(page.locator('.wc-precip-3d-science'), 'phone-science-copy');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    checks.push('Phone has no horizontal overflow');
    const copy = await page.locator('.wc-precip-lab').innerText();
    fs.writeFileSync(path.join(out, 'visible-copy.txt'), copy);
    await page.evaluate(() => mountStorm({wcMode:'precipHunt',precipHunt:Object.assign({},WaterCyclePrecipitationKernel.presets.mountainSnow,{preset:'mountainSnow',viewMode:'3d',cameraFocus:'cloud',paused:true,showStormAnatomy:false})}));
    await page.waitForSelector('#wcPrecip3dCanvas[data-rendered="true"]');
    const cold = await sceneState();
    check('Cold cloud hides warm collision samples', () => {assert(!cold.incoming.visible && !cold.merged.visible);});
    await capture(page.locator('#wcPrecip3dCanvas'), 'phone-cold-control');
    await page.getByRole('button',{name:'2D chamber',exact:true}).click();
    await page.waitForSelector('#wcPrecipCanvas');
    checks.push('Native return to 2D succeeds');
    await warmMount('2d', false);
    const reduced2d = await page.locator('#wcPrecipCanvas').evaluate(node => node.toDataURL());
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#wcPrecipCanvas').evaluate(node => node.toDataURL()), reduced2d);
    checks.push('Reduced motion 2D remains static while unpaused');
    await capture(page.locator('#wcPrecipCanvas'), 'phone-2d-reduced');
    assert.deepEqual(errors, []);
    assert.equal(hash(fs.readFileSync(sourcePath)), expected);
    assert.equal(hash(fs.readFileSync(mirrorPath)), expected);
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({passed:true,sourceSha256:expected,harnessSha256:hash(fs.readFileSync(__filename)),checkCount:checks.length,captureCount:captures.length,checks,captures,errors,layouts,actual2d,observedStages,paused,moving,reduced,orbited,cold},null,2));
    console.log('PASS ' + checks.length + ' focused checks; ' + captures.length + ' captures');
  } catch(error) {
    const scene = await sceneState().catch(() => null);
    await page.screenshot({path:path.join(out,'failure.png'),timeout:10000}).catch(() => {});
    const observed = await page.evaluate(() => ({stages:window.qaObservedStages,index:window.qaObservedIndex})).catch(() => null);
    fs.writeFileSync(path.join(out,'result.json'), JSON.stringify({passed:false,sourceSha256:expected,harnessSha256:hash(fs.readFileSync(__filename)),checkCount:checks.length,captureCount:captures.length,checks,captures,errors,layouts,observed,scene,error:String(error),stack:error.stack},null,2));
    throw error;
  } finally {
    await browser.close();browser = null;
    await new Promise(resolve => server.close(resolve));
    const recordPath=path.join(out,'result.json'),record=JSON.parse(fs.readFileSync(recordPath,'utf8'));
    record.resources={browserClosed:true,serverClosed:true};fs.writeFileSync(recordPath,JSON.stringify(record,null,2));
    console.log('Owned browser and server closed');
  }
})().catch(error => {console.error(error);process.exitCode=1;server.close();});
