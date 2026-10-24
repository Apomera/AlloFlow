'use strict';
// Actual WebGL acceptance review for world-lit clouds, rain depth and solid-water releases. All transitions and
// checkpoints are produced by the unchanged production kernel. The renderer
// gates redundant GPU draws only; normal RAF, model clocks and UI keep running.
// Run only after source lock and GPU ownership are confirmed by the root agent.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const arg = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3);
const report = arg('report') || 'final';
assert(/^[a-z0-9-]+$/.test(report), 'Plain report folder name');
const reportRoot = path.join(root, 'reports/watercycle-pilot-phase-atmosphere');
const out = path.join(reportRoot, report);
const temp = path.join(root, 'scratch/watercycle-pilot-phase-atmosphere-temp');
fs.mkdirSync(temp, { recursive: true }); fs.mkdirSync(out, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp;
const sourcePath = path.resolve(root, arg('source') || 'stem_lab/stem_tool_watercycle.js');
assert(sourcePath.startsWith(root + path.sep), 'Fixture source stays within workspace');
const source = fs.readFileSync(sourcePath, 'utf8');
const captures = arg('captures')?.split(',');
const sections = arg('sections')?.split(',');
const enabled = section => !sections || sections.includes(section);
const cachedBrowsers = path.join(process.env.USERPROFILE || 'C:/Users/cabba', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cachedBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = cachedBrowsers;
const { chromium } = require('playwright');
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_pilot_snow_lab_qa.cjs'), 'utf8').match(/const html = String.raw`([\s\S]*?)`;/)[1];
html = html.replace('renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};',
  'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.reviewRenderActive!==false){const result=render(scene,window.reviewCameraOverride||camera);window.reviewRenderCount=(window.reviewRenderCount||0)+1;if(window.phaseAtmosphereCloudProbe)window.phaseAtmosphereCloudProbe(scene,window.reviewCameraOverride||camera,renderer);return result;}};');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (pathname === '/stem_lab/stem_tool_watercycle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname));
  const allowed = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => pathname.startsWith(prefix))) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream'); res.end(data); });
});
const result = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], transitions: [], states: [], errors: [] };
const pass = name => { result.checks.push(name); console.log('PASS ' + name); };
const maxDelta = (a, b) => Math.max(...a.map((v, n) => Math.abs(v - b[n])));
function assertPaused(actual, expected, label) {
  const a = structuredClone(actual), b = structuredClone(expected);
  // The damped Water lens can converge by floating roundoff even with its
  // phase clock paused. Local visual buffers and shared uniforms must be exact.
  if (a.cameraMode === 'water') {
    for (const key of ['position']) {
      const delta = maxDelta(a[key], b[key]);
      (result.pauseTranslationSamples ||= []).push({ label, delta, actual: a[key], expected: b[key] });
      assert(delta < 1e-7, label + ' camera-relative placement, delta=' + delta);
      a[key] = null; b[key] = null;
    }
    for (let n = 0; n < a.meshes.length; n++) for (const key of ['position', 'worldPosition', 'quaternion']) {
      assert(maxDelta(a.meshes[n][key], b.meshes[n][key]) < (key === 'quaternion' ? 1e-12 : 1e-7), label + ' negligible transform roundoff');
      a.meshes[n][key] = null; b.meshes[n][key] = null;
    }
  }
  assert.deepEqual(a, b, label);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text())) result.errors.push(message.text()); });
  const canvas = page.locator('#wcPilotCanvas');
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const resume = () => page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
  async function pause() { await page.evaluate(() => { if (!waterReviewData.pilot.paused) document.querySelector('[data-control="pause"]').click(); }); await settle(); }
  async function capture(name) {
    if (captures && !captures.includes(name)) return;
    await canvas.scrollIntoViewIfNeeded(); await settle();
    const before = await page.evaluate(() => { window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
    await page.waitForFunction(before => window.reviewRenderCount > before, before);
    await page.evaluate(() => { window.reviewRenderActive = false; });
    const box = await canvas.boundingBox(); assert(box && box.width >= 250 && box.height >= 180);
    try { await page.screenshot({ path: path.join(out, name + '.png'), clip: box, animations: 'disabled', timeout: 45000 }); }
    catch (error) { (result.captureRetries ||= []).push({ name, error: String(error) }); await page.screenshot({ path: path.join(out, name + '.png'), clip: box, timeout: 30000 }); }
    result.captures.push(name); console.log('CAPTURE ' + name);
  }
  async function restore(name, { cameraMode = 'follow', pauseAtChanges = true } = {}) {
    await page.evaluate(({ name, cameraMode, pauseAtChanges }) => {
      window.reviewRenderActive = false; window.reviewCameraOverride = null; window.phaseAtmosphereDriveInput = null; window.phaseAtmosphereSteadyInput = null; window.phaseAtmosphereLiveSteps = []; window.phaseAtmosphereTotalSteps = 0;
      const checkpoint = phaseAtmosphereStates[name];
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges, navigationAssist: false, showMolecules: false, cameraMode, snowTempC: checkpoint.snowTempC, snowHumidity: checkpoint.snowHumidity, resumeCheckpoint: { ...checkpoint, cameraMode }, resumeToken: 'phaseAtmosphere-' + name + '-' + Date.now() } }, 'light');
    }, { name, cameraMode, pauseAtChanges });
    await page.waitForFunction(({ name, cameraMode }) => { const c = document.querySelector('#wcPilotCanvas'); return window.pilotReview && c && c.dataset.parcelForm === phaseAtmosphereStates[name].form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === phaseAtmosphereStates[name].form; }, { name, cameraMode });
    await settle();
  }
  const handoff = () => page.evaluate(() => {
    const c = document.querySelector('#wcPilotCanvas'), scene = pilotReview.scene, group = scene.getObjectByName('pilot-phase-handoff');
    const geometryIds = new Set(), materialIds = new Set();
    const sample = o => {
      if (o.geometry) geometryIds.add(o.geometry.uuid);
      const materials = (o.material ? Array.isArray(o.material) ? o.material : [o.material] : []).map(m => { materialIds.add(m.uuid); return { uuid: m.uuid, opacity: m.opacity, depthTest:m.depthTest,depthWrite:m.depthWrite,userData: phaseAtmosphereClean(m.userData) }; });
      return { name: o.name, visible: o.visible, geometry: o.geometry?.uuid, position: o.position.toArray(), worldPosition: o.getWorldPosition(new THREE.Vector3()).toArray(), scale: o.scale.toArray(), worldScale: o.getWorldScale(new THREE.Vector3()).toArray(), quaternion: o.quaternion.toArray(), materials, userData: phaseAtmosphereClean(o.userData), count: o.count, instanceMatrix: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null };
    };
    const meshes = []; group.traverse(o => { if (o !== group) meshes.push(sample(o)); });
    const parcel = scene.getObjectByName('pilot-water-parcel');
    // A memory switches between already-pooled liquid and rain geometries;
    // inspect the whole scene pool rather than only currently assigned memory.
    scene.traverse(o => { if (o.geometry) geometryIds.add(o.geometry.uuid); for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) materialIds.add(m.uuid); });
    return { visible: group.visible, cameraMode: c.dataset.pilotCamera, position: group.position.toArray(), data: { active: c.dataset.phaseHandoff, kind: c.dataset.phaseHandoffKind, from: c.dataset.phaseHandoffFrom, to: c.dataset.phaseHandoffTo, progress: c.dataset.phaseHandoffProgress, front: c.dataset.phaseFront }, userData: phaseAtmosphereClean(group.userData), geometryIds: [...geometryIds].sort(), materialIds: [...materialIds].sort(), meshes, parcel: { position: parcel.position.toArray(), worldPosition: parcel.getWorldPosition(new THREE.Vector3()).toArray(), children: parcel.children.map(sample) } };
  });
  async function inspect(name) {
    const info = await page.evaluate(() => {
      let finite = true; const named = {};
      pilotReview.scene.traverse(o => {
        if (/^pilot-/.test(o.name)) named[o.name] = { visible: o.visible, type: o.type, children: o.children.length, userData: phaseAtmosphereClean(o.userData) };
        finite = finite && [...o.position.toArray(), ...o.scale.toArray(), ...o.quaternion.toArray()].every(Number.isFinite);
        if (o.instanceMatrix) finite = finite && Array.from(o.instanceMatrix.array).every(Number.isFinite);
        if (o.geometry) for (const a of Object.values(o.geometry.attributes || {})) finite = finite && Array.from(a.array).every(Number.isFinite);
        for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) { if (m.opacity !== undefined) finite = finite && Number.isFinite(m.opacity); }
      });
      const c = document.querySelector('#wcPilotCanvas');
      return { finite, dataset: { ...c.dataset }, named, resources: JSON.parse(JSON.stringify(pilotReview.renderer.info.memory)), programs: pilotReview.renderer.info.programs.length, snapshot: JSON.parse(JSON.stringify(waterReviewData.pilot.snapshot)) };
    });
    assert(info.finite, 'Actual rendered scene buffers and transforms stay finite'); result.states.push({ name, ...info }); return info;
  }
  async function trigger(name, options) {
    await restore('before-' + name, options); const before = await handoff(); assert.equal(before.data.active, 'hidden', 'Restore clears stale handoff');
    await page.evaluate(name => { window.phaseAtmosphereDriveInput = { ...phaseAtmosphereTransitions[name].input }; }, name); await resume();
    await page.waitForFunction(name => { const c = document.querySelector('#wcPilotCanvas'); return c.dataset.parcelForm === phaseAtmosphereTransitions[name].after.form && waterReviewData.pilot.paused; }, name);
    await settle();
    const receipt = await page.evaluate(name => ({ name, expectedFrom: phaseAtmosphereTransitions[name].before.form, expectedTo: phaseAtmosphereTransitions[name].after.form, actual: phaseAtmosphereLiveSteps, receipt: waterReviewData.pilot.lastChange }), name);
    assert(receipt.actual.some(step => step.from === receipt.expectedFrom && step.to === receipt.expectedTo), 'Real kernel performs the scene transition');
    assert(receipt.receipt?.from === receipt.expectedFrom && receipt.receipt?.to === receipt.expectedTo, 'Scene retains genuine form-change receipt');
    (result.receipts ||= []).push(receipt); return before;
  }

  const phaseSample = () => page.evaluate(() => {
    pilotReview.scene.updateMatrixWorld(true);
    const groups = [], geometryIds = new Set(), materialIds = new Set(), geometryDigests=new Map();
    const digestGeometry=geometry=>{if(!geometry)return null;if(geometryDigests.has(geometry.uuid))return geometryDigests.get(geometry.uuid);const attributes=Object.fromEntries(Object.entries(geometry.attributes).map(([key,a])=>{let hash=2166136261;const bits=new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength);for(const byte of bits)hash=Math.imul(hash^byte,16777619)>>>0;return [key,{count:a.count,itemSize:a.itemSize,hash}];}));geometryDigests.set(geometry.uuid,attributes);return attributes;};
    pilotReview.scene.traverse(o => {
      if (o.geometry) geometryIds.add(o.geometry.uuid);
      const materials = (o.material ? Array.isArray(o.material) ? o.material : [o.material] : []);
      for (const m of materials) materialIds.add(m.uuid);
      let owner=o,effectiveVisible=true;while(owner&&!/^pilot-(phase-|snow|melting|ocean-landing|landing-)/.test(owner.name))owner=owner.parent;
      if(!owner)return;for(let ancestor=o;ancestor;ancestor=ancestor.parent)effectiveVisible=effectiveVisible&&ancestor.visible;
      groups.push({ name:o.name,owner:owner.name,ancestry:(()=>{const names=[];for(let a=o;a;a=a.parent)if(a.name)names.push(a.name);return names;})(),type:o.type,renderOrder:o.renderOrder,visible:o.visible,effectiveVisible,position:o.position.toArray(),worldPosition:o.getWorldPosition(new THREE.Vector3()).toArray(),scale:o.scale.toArray(),worldScale:o.getWorldScale(new THREE.Vector3()).toArray(),quaternion:o.quaternion.toArray(),topFacingCamera:new THREE.Vector3(0,1,0).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion())).dot(pilotReview.camera.position.clone().sub(o.getWorldPosition(new THREE.Vector3())).normalize()),userData:phaseAtmosphereClean(o.userData),geometry:o.geometry?.uuid,count:o.count,instanceMatrix:o.instanceMatrix?Array.from(o.instanceMatrix.array):null,attributes:digestGeometry(o.geometry),materials:materials.map(m=>({uuid:m.uuid,opacity:m.opacity,depthTest:m.depthTest,depthWrite:m.depthWrite,userData:phaseAtmosphereClean(m.userData)})) });
    });
    const c=document.querySelector('#wcPilotCanvas');
    const preview=pilotReview.scene.getObjectByName('pilot-melt-drop-preview');
    const parcel=pilotReview.scene.getObjectByName('pilot-water-parcel'),vapor=pilotReview.scene.getObjectByName('pilot-vapor-marker'),bank=pilotReview.scene.getObjectByName('pilot-snowpack-release-memory'),grounds=[];
    pilotReview.scene.traverse(o=>{if(o.material?.userData.cloudShadowReceiver&&/^(pilot-wet-sand-slope|pilot-dry-sand-slope|terrain-5|terrain-6)$/.test(o.material.userData.cloudShadowReceiver))grounds.push(o);});
    const actualIncoming=preview&&parcel.children.find(o=>o.geometry===preview.geometry&&o.material===preview.material);
    const anchor=bank?.userData.sourceSnapshot?bank.userData.sourcePosition:parcel.getWorldPosition(new THREE.Vector3()),ray=new THREE.Raycaster(new THREE.Vector3(anchor.x,500,anchor.z),new THREE.Vector3(0,-1,0)),groundHit=ray.intersectObjects(grounds,false)[0];
    return {cameraMode:c.dataset.pilotCamera,dataset:{...c.dataset},groups,geometryIds:[...geometryIds].sort(),materialIds:[...materialIds].sort(),snapshot:JSON.parse(JSON.stringify(waterReviewData.pilot.snapshot)),steps:window.phaseAtmosphereTotalSteps,parcelWorld:parcel.getWorldPosition(new THREE.Vector3()).toArray(),parcelData:phaseAtmosphereClean(parcel.userData),primaryDepthFlags:parcel.children.flatMap(o=>(o.material?Array.isArray(o.material)?o.material:[o.material]:[]).map(m=>({uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite}))),vaporWorld:vapor.getWorldPosition(new THREE.Vector3()).toArray(),cameraWorld:pilotReview.camera.position.toArray(),actualBankGroundY:groundHit?.point.y,meltPreviewBindings:preview&&actualIncoming?{visible:preview.visible,sharesGeometry:preview.geometry===actualIncoming.geometry,sharesMaterial:preview.material===actualIncoming.material,previewWorldScale:preview.getWorldScale(new THREE.Vector3()).toArray(),incomingWorldScale:actualIncoming.getWorldScale(new THREE.Vector3()).toArray()}:null};
  });
  const cloudSample = () => page.evaluate(() => {
    pilotReview.scene.updateMatrixWorld(true);
    const clouds=[],normalMaps=new Map(),albedos=new Map(),shaderNormals=new Set(),sun=pilotReview.scene.getObjectByName('pilot-cloud-shadow').userData.sunDirection;
    const textureInfo=texture=>{const image=texture?.image;if(!image?.getContext)return null;const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let minR=255,maxR=0,minG=255,maxG=0,minB=255,maxB=0,maxRGBSpread=0,opaque=0,checksum=0;for(let n=0;n<pixels.length;n+=4){if(pixels[n+3]>16){opaque++;minR=Math.min(minR,pixels[n]);maxR=Math.max(maxR,pixels[n]);minG=Math.min(minG,pixels[n+1]);maxG=Math.max(maxG,pixels[n+1]);minB=Math.min(minB,pixels[n+2]);maxB=Math.max(maxB,pixels[n+2]);maxRGBSpread=Math.max(maxRGBSpread,Math.max(pixels[n],pixels[n+1],pixels[n+2])-Math.min(pixels[n],pixels[n+1],pixels[n+2]));}checksum=(checksum+pixels[n]*(n+1)+pixels[n+1]*3+pixels[n+2]*7) % 1000000007;}return {uuid:texture.uuid,name:texture.name,width:image.width,height:image.height,opaque,minR,maxR,minG,maxG,minB,maxB,maxRGBSpread,checksum};};
    pilotReview.scene.traverse(o=>{const m=o.material;if(!o.isSprite||!m?.pilotBillowNormalMap)return;const normal=m.pilotBillowNormalMap,newNormal=!normalMaps.has(normal.uuid),lighting=m.userData.cloudLighting||{};normalMaps.set(normal.uuid,textureInfo(normal));if(m.map)albedos.set(m.map.uuid,textureInfo(m.map));const properties=pilotReview.renderer.properties.get(m),program=properties.currentProgram||properties.program,gl=pilotReview.renderer.getContext(),fragment=program?.fragmentShader?gl.getShaderSource(program.fragmentShader):'',vertex=program?.vertexShader?gl.getShaderSource(program.vertexShader):'',keepShader=!!fragment&&!shaderNormals.has(normal.uuid),readUniform=name=>{if(!program?.program)return null;const location=gl.getUniformLocation(program.program,name);if(!location)return null;const value=gl.getUniform(program.program,location);return ArrayBuffer.isView(value)?Array.from(value):value;};if(keepShader)shaderNormals.add(normal.uuid);clouds.push({name:o.name,parent:o.parent?.name,map:m.map?.uuid,normal:normal.uuid,material:m.uuid,color:m.color.toArray(),position:o.position.toArray(),scale:o.scale.toArray(),lighting:phaseAtmosphereClean(lighting),sharedSunKeys:Object.entries(lighting).filter(([,v])=>v===sun||v?.value===sun).map(([k])=>k),sharesNormal:lighting.normalMap===normal||lighting.normalMap?.value===normal,compile:String(m.onBeforeCompile),linkedFragment:keepShader?fragment:null,linkedVertex:keepShader?vertex:null,linkedShader:!!fragment,uploaded:fragment?{sun:readUniform('pilotCloudSun'),solar:readUniform('pilotCloudSolar'),normalUnit:readUniform('pilotCloudNormalMap'),view:readUniform('pilotCloudViewMatrix')}:null,cacheKey:m.customProgramCacheKey()});});
    const camera=window.reviewCameraOverride||pilotReview.camera,cameraSun=sun.clone().transformDirection(camera.matrixWorldInverse);
    return {sun:sun.toArray(),cameraSun:cameraSun.toArray(),expectedCameraView:camera.matrixWorldInverse.toArray(),pixelProbe:window.phaseAtmosphereCloudPixels,clouds,normalMaps:[...normalMaps.values()],albedos:[...albedos.values()]};
  });
  const effect = (frame,name) => frame.groups.find(g=>g.name===(name==='snowWater'?'pilot-melting-snow':'pilot-snowpack-release-memory'));
  const vector = v => [v.x,v.y,v.z];
  function assertPhase(frame,name,cameraMode) {
    const memory=effect(frame,name),dry=name==='bankSublimation';
    assert(memory?.visible&&memory.userData.sourceSnapshot,'Actual solid-water release captures its outgoing source');
    assert.equal(memory.userData.kind,dry?'sublimation':'melting');
    assert.equal(memory.userData.target,dry?'vapor':name==='snowWater'?'liquid':name.endsWith('Soil')?'soil':name.endsWith('Plant')?'plant':'runoff');
    assert.equal(memory.userData.placement,cameraMode==='water'?'bounded-water-lens':'captured-world-source');if(cameraMode==='water')assert(memory.topFacingCamera>.45,'Bounded Water lens presents the solid upper surface clearly toward the eye');
    assert.equal(memory.userData.visibleBeadCount,dry?0:6,'Wet beads only accompany actual melting');
    assert(memory.userData.progress>0&&memory.userData.progress<1,'Phase front remains a bounded illustration of an actual event');
    if(cameraMode==='follow')assert(maxDelta(memory.worldPosition,vector(memory.userData.sourcePosition))<1e-7,'Solid memory stays at its captured actual world source');
    const family=frame.groups.filter(g=>g.ancestry.includes(memory.name));if(cameraMode==='water'){assert.equal(memory.renderOrder,9,'Water source memory draws as an explicit foreground teaching lens');for(const part of family.filter(g=>g.effectiveVisible))for(const material of part.materials)assert.equal(material.depthTest,false,'Water lens cannot be cut by opaque receiving terrain or water');}else{assert.equal(memory.renderOrder,0);for(const part of family.filter(g=>g.effectiveVisible))for(const material of part.materials)assert.equal(material.depthTest,true,'Follow memory keeps actual world occlusion');}
    if(name!=='snowWater') {
      const fronts=family.flatMap(g=>g.materials.map(m=>m.userData.snowReleaseFront).filter(Boolean));
      assert(fronts.length>0,'Captured bank materials have a retreating solid front');
      for(const front of fronts){assert(front.progress.value>0&&front.progress.value<1);assert.equal(front.mode.value,dry?0:1);assert(front.worldToBank.value.elements.every(Number.isFinite));}
      const beads=family.find(g=>g.name==='pilot-snowpack-melt-beads');assert(beads&&beads.visible===!dry);
      if(!dry)for(let n=0;n<beads.count;n++){const x=beads.instanceMatrix[n*16+12],z=beads.instanceMatrix[n*16+14];assert(Math.hypot(x/9.5,z/7.5)<=.97001,'Melt beads start on the captured snowbank instead of beyond its outer edge');}
      if(dry){assert(Number.isFinite(frame.actualBankGroundY));assert(frame.parcelWorld[1]>frame.actualBankGroundY&&frame.vaporWorld[1]>frame.actualBankGroundY,'Actual invisible-gas teaching marker emerges above the receiving bank ground');if(cameraMode==='water')assert(frame.cameraWorld[1]>frame.actualBankGroundY,'Water camera emerges above actual bank ground');}
    } else {
      assert.equal(frame.dataset.waterLandingSource,'snow');assert.equal(frame.dataset.waterLanding,'snowmelt-ripples');if(cameraMode==='water'){assert(frame.meltPreviewBindings?.visible&&frame.meltPreviewBindings.sharesGeometry&&frame.meltPreviewBindings.sharesMaterial);assert(maxDelta(frame.meltPreviewBindings.previewWorldScale,frame.meltPreviewBindings.incomingWorldScale)<1e-7,'Liquid preview uses exactly the actual incoming parcel world scale without double source scale');}
      const crystal=family.find(g=>g.materials.some(m=>m.userData.frontRadius));assert(crystal,'Captured snow crystal retains a retreating edge shader');
      const radius=crystal.materials.find(m=>m.userData.frontRadius).userData.frontRadius.value,beads=family.find(g=>g.name==='pilot-melt-beads');
      assert(beads&&beads.visible);for(let n=0;n<beads.count;n++){const x=beads.instanceMatrix[n*16+12],z=beads.instanceMatrix[n*16+14];assert(Math.hypot(x,z)/crystal.scale[0]<radius,'Snow melt beads remain attached inside its current visible crystal edge');}
    }
    return memory;
  }
  try {
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.pilotReview&&window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c=>{const gl=c.getContext('webgl2')||c.getContext('webgl');return !!gl&&!gl.isContextLost();}));
    await page.evaluate(()=>{
      window.reviewRenderActive=false;
      window.phaseAtmosphereCloudProbe=function(scene,camera,renderer){const cloud=scene.getObjectByName('pilot-self-cloud');if(!cloud?.visible)return;const gl=renderer.getContext(),samples=[];for(const child of cloud.children){const point=child.getWorldPosition(new THREE.Vector3()).project(camera);if(Math.abs(point.x)>.98||Math.abs(point.y)>.98||point.z< -1||point.z>1)continue;const x=Math.round((point.x+1)*.5*(gl.drawingBufferWidth-1)),y=Math.round((point.y+1)*.5*(gl.drawingBufferHeight-1)),pixel=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);samples.push({ndc:point.toArray(),rgba:Array.from(pixel),luminance:(pixel[0]+pixel[1]+pixel[2])/3});}window.phaseAtmosphereCloudPixels={samples,renderCamera:camera.matrixWorldInverse.toArray()};};
      window.phaseAtmosphereClean=function(value){const seen=new WeakSet();const clean=v=>{if(v==null||typeof v!=='object')return typeof v==='function'?undefined:v;if(v.isTexture)return {uuid:v.uuid,name:v.name,width:v.image?.width,height:v.image?.height};if(seen.has(v))return '[shared reference]';seen.add(v);if(Array.isArray(v)||ArrayBuffer.isView(v))return Array.from(v,clean);return Object.fromEntries(Object.entries(v).filter(([key])=>key!=='surfaceShader'&&key!=='meltShader').map(([key,item])=>[key,clean(item)]));};return clean(value);};
      const k=WaterCyclePilotKernel,original=k.step,states={},transitions={};
      const advance=(start,input,limit,desired)=>{let s=start;for(let n=0;n<limit;n++){const next=original(s,input);if(next.form!==s.form&&next.form===desired)return {before:s,after:next,input};s=next;}throw Error('Production kernel did not reach '+desired);};
      states.vapor=k.practiceState('cloud','tropicalOcean');states.droplet=advance(states.vapor,{dt:.12,nucleusHit:true},100,'droplet').after;
      states.cloud=advance(states.droplet,{dt:.12,dropletHit:true},100,'cloud').after;states.rain=advance(states.cloud,{dt:.12,dropletHit:true},100,'rain').after;
      states.snow=k.practiceState('snow','frozenHighlands');
      // This is a location-only practice probe: its actual solid snow state is
      // integrated by the original kernel over open ocean, never form-assigned.
      states.snowOcean={...states.snow,x:-150,z:40};
      transitions.snowWater=advance(states.snowOcean,{dt:.12,surface:'water'},10000,'liquid');
      const cold={dt:.12,snowTempC:-10,snowHumidity:100},warm={dt:.12,snowTempC:15,snowHumidity:100},dry={dt:.12,snowTempC:-10,snowHumidity:0};
      for(const [route,surface,form]of[['Soil','permeable','soil'],['Runoff','hard','runoff'],['Plant','plant','plant']]){
        const stored=advance(states.snow,{...cold,surface},10000,'snowpack').after;states['store'+route]=stored;
        transitions['bankMelt'+route]=advance(stored,warm,100000,form);
      }
      states.stored=states.storeRunoff;
      transitions.bankSublimation=advance(states.stored,dry,100000,'vapor');states.restoredLowVapor=transitions.bankSublimation.after;
      {let s=states.stored;for(let n=0;n<100000&&s.form==='snowpack';n++){s=original(s,warm);if(s.meltProgress>.20&&!states.bankExposureLow)states.bankExposureLow=s;if(s.meltProgress>.80){states.bankExposureHigh=s;break;}}if(!states.bankExposureLow||!states.bankExposureHigh)throw Error('Genuine exposure checkpoints missing');}
      for(const[name,t]of Object.entries(transitions))states['before-'+name]=t.before;
      window.phaseAtmosphereStates=states;window.phaseAtmosphereTransitions=transitions;window.phaseAtmosphereLiveSteps=[];window.phaseAtmosphereTotalSteps=0;
      k.step=function(state,input){window.phaseAtmosphereTotalSteps++;const drive=window.phaseAtmosphereDriveInput;if(drive)window.phaseAtmosphereDriveInput=null;const actualInput={...input,...(window.phaseAtmosphereSteadyInput||{}),...(drive||{})},next=original(state,actualInput);if(drive||next.form!==state.form)phaseAtmosphereLiveSteps.push({from:state.form,to:next.form,elapsed:next.elapsed,input:actualInput});return next;};
    });
    pass('Cloud/rain, solid snow ocean landing, three stored-snow melt routes and direct sublimation fixtures come from genuine production kernel steps');
    if(enabled('cloud')){
      await restore('cloud');result.cloudLighting=[];
      for(const [name,sign]of[['sunward',1],['opposite',-1]]){
        result.cloudLightingCamera=await page.evaluate(sign=>{const s=pilotReview.scene,sun=s.getObjectByName('pilot-cloud-shadow').userData.sunDirection,parcel=s.getObjectByName('pilot-water-parcel'),target=parcel.getWorldPosition(new THREE.Vector3()),horizontal=new THREE.Vector3(sun.x,0,sun.z).normalize(),camera=new THREE.PerspectiveCamera(48,pilotReview.camera.aspect,.1,3000);camera.position.copy(target).addScaledVector(horizontal,sign*260).add(new THREE.Vector3(0,45,0));camera.lookAt(target);camera.updateMatrixWorld(true);window.reviewCameraOverride=camera;return {scope:'Fixture-only view camera; production materials, world Sun, geometry and kernel checkpoint are unchanged.',camera:camera.position.toArray(),target:target.toArray()};},sign);
        await capture('cloud-worldsun-'+name);result.cloudLighting.push({name,camera:result.cloudLightingCamera,...await cloudSample()});
      }
      await page.evaluate(()=>{window.reviewCameraOverride=null;window.phaseAtmosphereCloudProbe=null;});await inspect('cloud-worldsun');pass('Cloud lighting renders under opposite review views without changing production geometry or world Sun');
      const [front,back]=result.cloudLighting;assert.deepEqual(back.sun,front.sun,'Opposite view keeps the actual world Sun fixed');assert(maxDelta(front.cameraSun,back.cameraSun)>.5,'Actual view-space sunlight responds to camera orientation');
      const pose=value=>value.clouds.map(c=>({material:c.material,map:c.map,normal:c.normal,position:c.position,scale:c.scale}));assert.deepEqual(pose(back),pose(front),'Cloud geometry and shared maps remain fixed while the eye moves');
      assert.equal(front.normalMaps.length,6);assert.equal(front.albedos.length,6);for(const normal of front.normalMaps){assert(normal.width===192&&normal.height===192&&normal.maxR>normal.minR&&normal.maxG>normal.minG,'Height-derived normal texture has non-flat X and Y relief');}
      for(const cloud of front.clouds){assert.equal(cloud.lighting.model,'world-sun-billow-relief');assert(cloud.sharesNormal&&cloud.sharedSunKeys.includes('sun'),'Self, ambient, interior and remembered cloud billows share actual paired normal and world Sun references');if(cloud.linkedFragment)assert(cloud.linkedFragment.includes('pilotCloudNormalMap')&&cloud.linkedFragment.includes('vPilotCloudSun'),'Native cloud shader samples relief under world-derived Sun');assert(cloud.compile.includes('mat3(pilotCloudViewMatrix)*pilotCloudSun'),'Cloud shader transforms the actual world Sun into the current eye space');}
      for(const view of result.cloudLighting){const linked=view.clouds.filter(c=>c.uploaded);assert(linked.length>0,'Native cloud program is actually linked');for(const cloud of linked){assert(cloud.uploaded.view?.length===16&&cloud.uploaded.view.some(v=>Math.abs(v)>0.1),'Actual uploaded custom cloud view matrix is nonzero');assert(maxDelta(cloud.uploaded.view,view.expectedCameraView)<1e-4,'Actual uploaded cloud matrix matches the active review camera');assert(maxDelta(cloud.uploaded.sun,view.sun)<1e-6&&cloud.uploaded.solar>0&&cloud.uploaded.normalUnit>=0,'Native cloud Sun, solar and normal sampler uniforms are valid');}const luminance=view.pixelProbe?.samples.map(v=>v.luminance).sort((a,b)=>a-b);assert(luminance?.length>=4&&luminance[Math.floor(luminance.length*.5)]>32,'Actual cloud billow centres remain visible, rather than rendering near-black from invalid lighting');}pass('Six paired height-gradient normals share the world Sun; uploaded nonzero active-camera matrices and native cloud pixels remain valid under opposite views');
    }
    if(enabled('rain')){
      await restore('rain');await capture('rain-depth-follow');result.rainDepth=await page.evaluate(()=>{const s=pilotReview.scene,out=[];for(const name of ['pilot-rain-field','pilot-rain-ribbons','pilot-rain-water-impacts']){const o=s.getObjectByName(name);if(!o)continue;const m=o.material,p=pilotReview.renderer.properties.get(m),program=p.currentProgram||p.program,gl=pilotReview.renderer.getContext();out.push({name,userData:phaseAtmosphereClean(o.userData),materialUserData:phaseAtmosphereClean(m.userData),compile:String(m.onBeforeCompile),vertex:program?.vertexShader?gl.getShaderSource(program.vertexShader):'',fragment:program?.fragmentShader?gl.getShaderSource(program.fragmentShader):''});}return out;});await inspect('rain-depth-follow');for(const record of result.rainDepth){if(record.name==='pilot-rain-water-impacts'){assert(!record.userData.depthEnvelope&&!record.materialUserData.depthEnvelope);assert(!record.fragment.includes('vPilotRainDepth'),'Receiving-water impacts retain their original opacity path');}else{const envelope=record.userData.depthEnvelope;assert.equal(envelope.model,'soft-view-depth');assert(envelope.near[0]<envelope.near[1]&&envelope.far[0]<envelope.far[1]&&envelope.minimumFar>0&&envelope.minimumFar<1);assert(record.vertex.includes('vPilotRainDepth=max(0.0,-mvPosition.z)'),'Native rain shader reads actual current camera-space depth');assert(record.fragment.includes('pilotRainNear')&&record.fragment.includes('pilotRainFar')&&record.fragment.includes('diffuseColor.a*=pilotRainNear*pilotRainFar'),'Native rain shader softly attenuates alpha with depth');}}assert.equal(result.rainDepth.length,3);pass('Native thread/ribbon shaders softly attenuate actual view depth, preserve a nonzero far shower, and leave receiving-water impact shaders unaffected');
    }
    if(enabled('phase')){
      await page.emulateMedia({reducedMotion:'no-preference'});result.phaseTransitions=[];
      for(const name of ['snowWater','bankMeltRunoff','bankSublimation'])for(const cameraMode of ['follow','water']){
        const before=await trigger(name,{cameraMode});const first=await phaseSample();
        const firstMemory=assertPhase(first,name,cameraMode);
        await resume();await page.waitForTimeout(380);await pause();const midpoint=await phaseSample();await page.waitForTimeout(180);const paused=await phaseSample();
        const midpointMemory=assertPhase(midpoint,name,cameraMode);assert(midpointMemory.userData.progress>firstMemory.userData.progress,'Normal-motion solid retreat advances with the model');assert.deepEqual(midpointMemory.userData.sourcePosition,firstMemory.userData.sourcePosition,'Outgoing solid source remains fixed during the phase cue');assert.deepEqual(midpoint.geometryIds,first.geometryIds);assert.deepEqual(midpoint.materialIds,first.materialIds);assert.deepEqual(paused.groups,midpoint.groups,'Paused solid fronts, pooled beads and actual transforms stay exact');
        await capture(name+'-'+cameraMode+'-midpoint');await inspect(name+'-'+cameraMode+'-midpoint');let modeSwitch=null,expiredLens=null;if(cameraMode==='water'){await page.getByRole('button',{name:'Follow view',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotCamera==='follow');await settle();const follow=await phaseSample();assertPhase(follow,name,'follow');const baselineFlags=before.parcel.children.flatMap(o=>o.materials.map(m=>({uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite})));assert.deepEqual(follow.primaryDepthFlags,baselineFlags,'Water to Follow restores exact original primary liquid/rain depth flags');await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotCamera==='water');await settle();const waterAgain=await phaseSample();assertPhase(waterAgain,name,'water');modeSwitch={follow,waterAgain,baselineFlags};await resume();await page.waitForFunction(name=>!pilotReview.scene.getObjectByName(name==='snowWater'?'pilot-melting-snow':'pilot-snowpack-release-memory').visible,name);await pause();expiredLens=await phaseSample();assert.deepEqual(expiredLens.primaryDepthFlags,baselineFlags,'Water lens expiry restores original primary liquid/rain depth flags');assert(!effect(expiredLens,name).userData.sourceSnapshot);}result.phaseTransitions.push({name,cameraMode,first,midpoint,paused,modeSwitch,expiredLens});
      }
      for(const name of ['bankMeltSoil','bankMeltPlant']){await trigger(name);const first=await phaseSample();assertPhase(first,name,'follow');result.phaseTransitions.push({name,cameraMode:'follow',first});}
      await restore('bankExposureLow');const low=await phaseSample();await restore('bankExposureHigh');const high=await phaseSample();result.snowExposure={low,high};
      assert(low.snapshot.meltProgress<high.snapshot.meltProgress&&high.snapshot.form==='snowpack');
      const storedPose=frame=>frame.groups.filter(g=>g.ancestry.includes('pilot-snowpack-storage')).map(g=>({name:g.name,position:g.position,scale:g.scale,quaternion:g.quaternion,instanceMatrix:g.instanceMatrix,attributes:g.attributes}));assert.deepEqual(storedPose(high),storedPose(low),'Genuine accumulating melt exposure never shrinks stored snow before release');
      result.restoredLowVapor=[];for(const cameraMode of ['follow','water']){await restore('restoredLowVapor',{cameraMode});const frame=await phaseSample();assert.equal(frame.snapshot.form,'vapor');assert.equal(frame.snapshot.altitudeM,0,'Display lift does not alter saved physical altitude');assert(frame.parcelData.snowVaporDisplayLift>0&&frame.parcelWorld[1]>frame.actualBankGroundY&&frame.vaporWorld[1]>frame.actualBankGroundY,'Restored genuine low-altitude snow vapor stays above actual raised ground');assert(frame.cameraWorld[1]>frame.actualBankGroundY,'Restored view remains above receiving bank ground');for(const name of ['pilot-snowpack-release-memory','pilot-melting-snow'])assert(!frame.groups.find(g=>g.name===name).visible,'Restoring vapor does not replay a phase event');if(cameraMode==='water')await capture('restored-snow-vapor-water');await resume();await page.waitForFunction(()=>phaseAtmosphereTotalSteps>0);await pause();const resumed=await phaseSample();assert.equal(resumed.snapshot.form,'vapor');assert(resumed.parcelWorld[1]>resumed.actualBankGroundY&&resumed.cameraWorld[1]>resumed.actualBankGroundY,'Restored actual vapor remains above raised land through a genuine resumed kernel step');result.restoredLowVapor.push({cameraMode,...frame,resumed});}pass('Genuine snow-water and bank phase releases retain anchored pooled fronts; exposed storage keeps its volume; restored low vapor keeps physical altitude zero and displays above actual bank ground');
    }
    if(sections?.includes('phone')){
      await page.setViewportSize({width:320,height:940});await page.emulateMedia({reducedMotion:'no-preference'});
      await trigger('snowWater',{cameraMode:'water'});await resume();await page.waitForTimeout(380);await pause();
      result.resumedPhoneLens=await phaseSample();assertPhase(result.resumedPhoneLens,'snowWater','water');
      await capture('snow-water-lens-phone-320');await inspect('snow-water-lens-phone-320');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Resumed Water lens has no 320px page overflow');
      pass('Resumed 320px Water lens stays visible above receiving water after its actual learning receipt is dismissed');
    }
    if(enabled('lifecycle')){
      await page.setViewportSize({width:320,height:940});await page.emulateMedia({reducedMotion:'no-preference'});await trigger('snowWater',{cameraMode:'water'});await capture('snow-water-phone-320');await inspect('snow-water-phone-320');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await restore('cloud',{cameraMode:'water'});await capture('cloud-water-phone-320');await inspect('cloud-water-phone-320');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.setViewportSize({width:1280,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await restore('before-bankSublimation',{pauseAtChanges:false});await page.evaluate(()=>{window.phaseAtmosphereSteadyInput={dropletHit:false,nucleusHit:false};window.phaseAtmosphereDriveInput={...phaseAtmosphereTransitions.bankSublimation.input};});await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor');const reduced=await phaseSample();await page.waitForTimeout(250);const later=await phaseSample();assert(later.steps>reduced.steps,'Real model continues under reduced motion');await pause();
      const reducedMemory=assertPhase(reduced,'bankSublimation','follow'),laterMemory=assertPhase(later,'bankSublimation','follow');assert.equal(laterMemory.userData.progress,reducedMemory.userData.progress,'Reduced-motion solid front remains at one readable stage');
      const localFronts=frame=>frame.groups.filter(g=>g.ancestry.includes('pilot-snowpack-release-memory')).map(g=>({name:g.name,scale:g.scale,quaternion:g.quaternion,instanceMatrix:g.instanceMatrix,materials:g.materials}));assert.deepEqual(localFronts(later),localFronts(reduced),'Reduced-motion bank materials and local staging stay static while the real gas moves');
      await resume();await page.waitForFunction(()=>!pilotReview.scene.getObjectByName('pilot-snowpack-release-memory').visible);await pause();const expired=await phaseSample();assert(!effect(expired,'bankSublimation').userData.sourceSnapshot);assert.deepEqual(expired.geometryIds,reduced.geometryIds);assert.deepEqual(expired.materialIds,reduced.materialIds);await restore('cloud');const restored=await phaseSample();await page.getByRole('button',{name:'Reset this run and start again as liquid water',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');const reset=await phaseSample();for(const frame of [restored,reset])for(const name of ['pilot-snowpack-release-memory','pilot-melting-snow']){const group=frame.groups.find(g=>g.name===name);assert(!group.visible&&!group.userData.sourceSnapshot);assert.equal(group.userData.kind,'none');}
      result.lifecycle={reduced,later,expired,restored,reset};pass('320px layouts, reduced-motion model integration, exact static phase staging, restore and reset clear stale solid-water memories');
    }
    assert.deepEqual(result.errors,[]);pass('No page, WebGL or shader errors');result.success=true;
  } catch (error) { result.success = false; result.harnessError = String(error); console.error(error); process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify({ success: result.success, sourceSha256: result.sourceSha256, checks: result.checks, captures: result.captures, transitions: result.transitions.map(({ name, cameraMode }) => ({ name, cameraMode })), errors: result.errors, harnessError: result.harnessError, report: path.relative(root, path.join(out, 'results.json')) }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
