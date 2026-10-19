'use strict';
// Actual WebGL review of rain cores, cloud shade and genuine phase transitions. All transitions and
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
const suite = arg('suite') || 'rain-cloud-depth';
assert(['rain-cloud-depth','relief-optics','spatial-weather','cloud-evolution'].includes(suite), 'Known isolated native QA suite');
const earlyClean = suite === 'cloud-evolution' && arg('early-clean') === 'true';
const reportRoot = path.join(root, 'reports/watercycle-pilot-' + suite);
const out = path.join(reportRoot, report);
// Re-check the saved native evidence without starting another GPU/browser.
// This also makes the stronger source/ref/shader assertions reproducible.
if (process.argv.includes('--analyze')) {
  const d = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
  const checks = [...d.checks], evidence = {};
  const ok = (value, label) => { assert(value, label); checks.push(label); };
  const delta = (a, b) => Math.max(...a.map((v, n) => Math.abs(v - b[n])));
  const obj = (snapshot, name) => snapshot.objects.find(o => o.name === name);
  const xyz = v => [v.x, v.y, v.z];
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  ok(d.success && d.errors.length === 0, 'Saved native run succeeded without page, shader or WebGL errors');
  ok(d.sourceSha256 === hash(path.join(reportRoot, 'final-source.js')), 'Every final native capture matches the exact frozen source SHA');
  if (suite === 'cloud-evolution') {
    ok(d.cloudEvolution && d.cloudEvolution.assembly.length === 4, 'Saved evidence covers early, middle and late genuine cloud assembly in both views');
    ok(d.cloudEvolution.release.source.lobes.some(lobe => lobe.density < 1), 'Actual rapid cloud-to-rain release retained a partial cloud optical depth');
    ok(d.cloudEvolution.motion.maxVerticalVelocity - d.cloudEvolution.motion.minVerticalVelocity > .05, 'Actual native cloud lobes have distinct convective velocities');
    const summary = { success: true, sourceSha256: d.sourceSha256, browsersClosed: true, checks, captures: d.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: d.sourceSha256 })), report: path.relative(root, path.join(out, 'results.json')), numericalEvidence: d.cloudEvolution.evidence, errors: [] };
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify({ success: true, checks: checks.length, captures: summary.captures.length, numericalEvidence: summary.numericalEvidence }, null, 2));
    process.exit(0);
  }
  const [a, b] = d.cloudLighting;
  const fixedClouds = v => v.clouds.map(c => ({material:c.material,map:c.map,normal:c.normal,position:c.position,scale:c.scale,shelter:c.lighting.shelter.value}));
  assert.deepEqual(fixedClouds(a), fixedClouds(b));
  checks.push('Opposite actual review cameras preserve all187 cloud sprite poses, relief maps, materials and camera-independent shelter');
  evidence.cloud = {spriteCount:a.clouds.length,normalMaps:a.normalMaps.length,readbacks:[],luminance:[]};
  for (const view of d.cloudLighting) {
    ok(view.normalMaps.length === 6 && view.normalMaps.every(t=>t.width===192&&t.height===192), 'All six192px paired cloud normal maps remain shared in '+view.name+' view');
    ok(view.albedos.length === 6 && view.albedos.every(t=>t.width===192&&t.height===192&&t.opaque>0&&t.minR>100&&t.maxR<=255), 'All six shared192px billow albedos contain healthy nonblack texels in '+view.name+' view');
    ok(view.clouds.every(c=>c.sharesNormal&&c.sharedSunKeys.includes('sun')&&c.lighting.model==='world-sun-billow-relief'), 'Every cloud sprite uses the actual paired relief map and shared world Sun in '+view.name+' view');
    for (const c of view.clouds.filter(c=>Number.isInteger(c.tier))) {
      // Unrendered pooled memories retain zero until their first actual draw.
      const expectedBase=[.12,.055,0][c.tier], base=c.lighting.shelterBase, extra=[.05,.05,.0175][c.tier];
      assert(base===0||Math.abs(base-expectedBase)<1e-12);
      assert(c.lighting.shelter.value>=base-1e-12&&c.lighting.shelter.value<=base+extra+1e-12);
    }
    const linked=view.clouds.filter(c=>c.linkedVertex&&c.linkedFragment);
    ok(linked.length===6&&linked.every(c=>c.linkedVertex.includes('mat3(pilotCloudViewMatrix)*pilotCloudSun')&&c.linkedFragment.includes('pilotCloudShelter')&&c.linkedFragment.includes('texture2D(pilotCloudNormalMap')), 'All six actual linked cloud programs include camera-correct Sun, relief and tier/leeward shelter in '+view.name+' view');
    const uploaded=view.clouds.filter(c=>c.uploaded);
    ok(uploaded.length>0&&uploaded.every(c=>delta(c.uploaded.sun,view.sun)<1e-6&&delta(c.uploaded.view,view.expectedCameraView)<1e-3&&c.uploaded.solar===1), 'Actual uploaded cloud Sun/custom-view uniforms match the active native camera in '+view.name+' view');
    const reads=view.shelterReads,maxShelterError=Math.max(...reads.map(r=>Math.abs(r.expected-r.uploaded)));
    ok(reads.length>0&&maxShelterError<1e-6, 'Per-sprite shelter uniform is read back after its actual native draw in '+view.name+' view');
    const luminance=view.pixelProbe.samples.map(p=>p.luminance),range=[Math.min(...luminance),Math.max(...luminance)];
    ok(luminance.length===26&&range[0]>100&&range[1]<255&&range[1]-range[0]>5, 'Actual cloud framebuffer samples retain nonblack relief contrast in '+view.name+' view');
    evidence.cloud.readbacks.push({view:view.name,count:reads.length,maxShelterError});
    evidence.cloud.luminance.push({view:view.name,samples:luminance.length,range});
  }
  const ribbons=d.rain.objects.find(o=>o.name==='pilot-rain-ribbons'),threads=d.rain.objects.find(o=>o.name==='pilot-rain-field'),impacts=d.rain.objects.find(o=>o.name==='pilot-rain-water-impacts');
  const along=ribbons.attributes.rainAlong;
  ok(along.count===672&&along.itemSize===1&&along.values.every((v,n)=>Math.abs(v-[0,0,.32,.32,.9,.9,1,1][n%8])<1e-6), 'Actual rain buffer has84 pooled eight-vertex ribbons with the full0/.32/.9/1 longitudinal profile');
  ok(['rainBodyMask','rainCore','rainEdgeGlint','rainHeadGlint','vRainAlong','vRainAcross'].every(t=>ribbons.fragment.includes(t)), 'Actual linked rain ribbon shader includes translucent core and edge/head glints');
  ok(ribbons.userData.ribbonSurface.model==='translucent-core-edge-glint'&&ribbons.materialUserData.ribbonSurface.coreStrength===.5&&ribbons.materialUserData.ribbonSurface.edgeStrength===.16&&ribbons.materialUserData.ribbonSurface.headStrength===.26, 'Rain ribbon surface metadata agrees with the implemented core/glint strengths');
  ok([threads,ribbons].every(o=>o.vertex.includes('vPilotRainDepth')&&o.fragment.includes('pilotRainNear')&&o.fragment.includes('pilotRainFar'))&&!impacts.fragment.includes('vPilotRainDepth')&&!impacts.fragment.includes('rainCore'), 'Actual linked thread/ribbon depth envelope preserves unattenuated receiving-water impacts');
  ok(ribbons.opacity>=.66&&ribbons.opacity<=.76&&Number(d.rain.dataset.rainOnset)===1, 'Native settled ribbon opacity stays within the new.66–.76 optical envelope');
  evidence.rain={ribbonVertices:along.count,ribbonCount:along.count/8,opacity:ribbons.opacity,renderProbeSamples:d.rain.pixels.samples.length};
  const routes={condensation:['vapor','droplet','condensation'],reevaporation:['droplet','vapor','evaporation'],melting:['ice','droplet','melting'],snowRelease:['cloud','snow','precipitation-release']};
  evidence.phase=[];
  for (const p of d.phaseViews) {
    const m=p.midpoint,route=routes[p.name],water=p.cameraMode==='water';
    assert.equal(m.groupData.from,route[0]);assert.equal(m.groupData.to,route[1]);assert.equal(m.groupData.kind,route[2]);
    assert(m.visible&&p.first.groupData.progress<m.groupData.progress&&m.groupData.progress<1);
    assert.deepEqual(m.objects,p.frozen.objects);
    assert.equal(m.groupData.foregroundLens,water);
    assert.equal(m.bindings.rainVisible,false);
    const dropExpected=water&&['condensation','melting'].includes(p.name);
    assert.equal(m.bindings.droplet.visible,dropExpected);
    if(dropExpected){assert(m.bindings.droplet.sharesGeometry&&m.bindings.droplet.sharesMaterial);assert(delta(m.bindings.droplet.previewWorldScale,m.bindings.droplet.actualWorldScale)<1e-12);}
    assert.equal(m.bindings.snow.visible,water&&p.name==='snowRelease');
    if(water&&p.name==='snowRelease'){assert(m.bindings.snow.bodyGeometry&&m.bindings.snow.bodyMaterial&&m.bindings.snow.edgeGeometry&&m.bindings.snow.edgeMaterial);assert(delta(m.bindings.snow.previewScale,m.bindings.snow.actualScale)<1e-12);}
    if(p.name==='melting'){const f=m.bindings.melting;assert(f.sharedActive&&f.sharedProgress&&f.sharedTransform&&!f.sourceIsIncoming&&f.targetIsIncoming);assert(delta(f.sourceCentre,[0,0,0])<1e-10);assert.equal(m.groupData.front,'ice-to-liquid');}
    const memoryName={reevaporation:'pilot-phase-liquid-memory',melting:'pilot-phase-ice-memory',snowRelease:'pilot-phase-cloud-memory'}[p.name];
    if(memoryName){const first=obj(p.first,memoryName),memory=obj(m,memoryName);assert(memory.userData.sourceSnapshot);assert.deepEqual(memory.userData.sourcePosition,first.userData.sourcePosition);assert.deepEqual(memory.userData.sourceScale,first.userData.sourceScale);assert.deepEqual(memory.userData.sourceQuaternion,first.userData.sourceQuaternion);assert.equal(memory.userData.placement,water?'bounded-water-lens':'captured-world-source');if(!water)assert(delta(memory.worldPosition,xyz(memory.userData.sourcePosition))<1e-10);}
    if(p.name==='snowRelease'){assert.equal(m.shadow.userData.sourceForm,'cloud-memory');assert.deepEqual(m.shadow.userData.sourcePosition,obj(m,memoryName).userData.sourcePosition);assert.deepEqual(p.first.shadow.userData.sourcePosition,m.shadow.userData.sourcePosition);assert(m.shadow.userData.opacity.value>0&&m.shadow.userData.opacity.value<p.first.shadow.userData.opacity.value);assert(m.cameraDistance>2&&m.cameraDistance<200);}
    if(water){assert.deepEqual(p.modeSwitch.follow.materialDepth,p.before.materialDepth);assert.deepEqual(p.expired.materialDepth,p.before.materialDepth);assert(!p.expired.visible);assert.equal(p.modeSwitch.waterAgain.groupData.foregroundLens,true);}
    evidence.phase.push({name:p.name,camera:p.cameraMode,progress:[p.first.groupData.progress,m.groupData.progress],cameraDistance:m.cameraDistance});
  }
  checks.push('All eight genuine phase/view cases have advancing fronts, exact paused buffers, proper target-only previews and original primary geometry/material/scale');
  checks.push('Liquid, ice and cloud outgoing memories retain captured source transforms; Follow remains world anchored and Water uses a bounded lens');
  checks.push('Ice/liquid melt masks share actual complementary uniforms; snow release keeps captured cloud shadow source while opacity fades');
  checks.push('All four Water→Follow→Water switches and cue expiries restore every original scene material depth flag exactly');
  ok(d.receipts.length>=13&&d.receipts.every(r=>r.receipt.from===r.expectedFrom&&r.receipt.to===r.expectedTo&&r.actual.some(a=>a.from===r.expectedFrom&&a.to===r.expectedTo)), 'All native route fixtures produce the genuine expected kernel transitions and recorded receipts');
  evidence.consecutive=[];
  for(const c of d.consecutive){const liquid=c.kind==='melting-to-evaporation',name=liquid?'pilot-phase-liquid-memory':'pilot-phase-ice-memory',carry=obj(c.after,name).userData[liquid?'carriedMeltingFront':'carriedFreezingFront'];assert.equal(carry.active.value,1);assert(carry.progress.value>0&&carry.progress.value<1);if(liquid){const expected=c.cameraMode==='water'?c.before.bindings.melting.previewLocalToSource:c.before.bindings.melting.actualLocalToSource;assert(delta(carry.localToSource.value.elements,expected)<1e-8);}evidence.consecutive.push({kind:c.kind,camera:c.cameraMode,carriedProgress:carry.progress.value});}
  checks.push('All four genuine interrupted handoffs retain the previous partial reveal; liquid preserves the actual visible source-to-front mapping');
  const life=d.lifecycle;
  assert(life.later.steps>life.reduced.steps);assert.equal(life.reduced.groupData.progress,life.later.groupData.progress);
  for(const state of [life.restored,life.reset]){assert(!state.visible);for(const o of state.objects){for(const key of ['carriedMeltingFront','carriedFreezingFront'])if(o.userData[key]){assert.equal(o.userData[key].active.value,0);assert.equal(o.userData[key].progress.value,0);}}}
  evidence.lifecycle={reducedModelSteps:[life.reduced.steps,life.later.steps],staticReducedProgress:life.reduced.groupData.progress,phoneWidth:320,phoneIncomingVisible:d.phonePhase.bindings.droplet.visible};
  checks.push('Reduced motion holds the midpoint while real kernel steps advance; restore/reset clear both carried-front memories');
  const summary={success:true,sourceSha256:d.sourceSha256,browsersClosed:true,report:path.relative(root,path.join(out,'results.json')),checks,captures:d.captures.map(name=>({name,path:path.relative(root,path.join(out,name+'.png')),sourceSha256:d.sourceSha256})),transitions:d.phaseViews.map(p=>({name:p.name,cameraMode:p.cameraMode,from:p.midpoint.groupData.from,to:p.midpoint.groupData.to})),numericalEvidence:evidence,fixtureNotes:['Every phase checkpoint is reached by unchanged kernel stepping; fixture controls provide actual thrust and collection opportunities, never synthetic forms.','Temperate-coast melting is used because the tropical cloud droplet buoyancy prevents the intended descent; the cold cloud/snow fixture is lofted above the freezing level so the source cue survives its real duration.','The rapid recross is reached with a bounded genuine thrust controller near the freezing boundary.','Two cloud captures use an explicitly labelled QA-only camera orbit around unchanged actual geometry, light and materials.'],visualReview:{reviewedAllTen:true,rootReview:'reports/watercycle-pilot-rain-cloud-depth/visual-review.json',result:'Cloud bases and upper billows retain soft relief. Fine rain streaks remain readable against water/shore. Actual incoming liquid, paired ice melt and snow previews are centered and clear;320px rain controls fit.',limitation:'Rain center eligibility framebuffer probe yielded zero samples; rain visibility is supported by its actual compiled shader/buffer and inspected native desktop/phone PNGs. This pass makes no pixel contrast claim for that empty probe.'},rawAttempts:[{sourceSha256:d.sourceSha256,report:path.relative(root,path.join(out,'results.json')),success:true},{stage:'preflight',result:'Initial final-source path was missing before browser launch; production source hash verified exact6af and immutable source used. Root subsequently copied the identical frozen final-source.js.'}],errors:[]};
  fs.writeFileSync(path.join(reportRoot,'qa-summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({success:true,checks:checks.length,captures:summary.captures.length,numericalEvidence:evidence},null,2));
  process.exit(0);
}
const temp = path.join(root, 'scratch/watercycle-pilot-' + suite + '-temp');
fs.mkdirSync(temp, { recursive: true }); fs.mkdirSync(out, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp;
const sourcePath = path.resolve(root, arg('source') || 'stem_lab/stem_tool_watercycle.js');
assert(sourcePath.startsWith(root + path.sep), 'Fixture source stays within workspace');
const source = fs.readFileSync(sourcePath, 'utf8');
const captures = arg('captures')?.split(',');
const sections = arg('sections')?.split(',');
const phaseRoutes = (arg('phase-routes') || 'condensation,reevaporation,melting,snowRelease').split(',');
const opticalForms = (arg('optical-forms') || 'liquid,droplet,rain').split(',');
const cloudDistance = Number(arg('cloud-distance') || 260);
assert(Number.isFinite(cloudDistance)&&cloudDistance>=80&&cloudDistance<=400);
const enabled = section => !sections || sections.includes(section);
const cachedBrowsers = path.join(process.env.USERPROFILE || 'C:/Users/cabba', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cachedBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = cachedBrowsers;
const { chromium } = require('playwright');
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_pilot_snow_lab_qa.cjs'), 'utf8').match(/const html = String.raw`([\s\S]*?)`;/)[1];
html = html.replace('renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};',
  'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.reviewRenderActive!==false){const result=render(scene,window.reviewCameraOverride||camera);window.reviewRenderCount=(window.reviewRenderCount||0)+1;if(window.rainCloudDepthCloudProbe)window.rainCloudDepthCloudProbe(scene,window.reviewCameraOverride||camera,renderer);return result;}};');
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
    const before = await page.evaluate(() => { window.spatialWeatherDrawOrder=[]; window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
    await page.waitForFunction(before => window.reviewRenderCount > before, before);
    await page.evaluate(() => { window.reviewRenderActive = false; });
    const box = await canvas.boundingBox(); assert(box && box.width >= 250 && box.height >= 180);
    try { await page.screenshot({ path: path.join(out, name + '.png'), clip: box, animations: 'disabled', timeout: 45000 }); }
    catch (error) { (result.captureRetries ||= []).push({ name, error: String(error) }); await page.screenshot({ path: path.join(out, name + '.png'), clip: box, timeout: 30000 }); }
    result.captures.push(name); console.log('CAPTURE ' + name);
  }
  async function restore(name, { cameraMode = 'follow', pauseAtChanges = true } = {}) {
    await page.evaluate(({ name, cameraMode, pauseAtChanges }) => {
      window.reviewRenderActive = false; window.reviewCameraOverride = null; window.rainCloudDepthDriveInput = null; window.rainCloudDepthSteadyInput = null; window.rainCloudDepthLiveSteps = []; window.rainCloudDepthTotalSteps = 0;
      const checkpoint = rainCloudDepthStates[name];
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges, navigationAssist: false, showMolecules: false, cameraMode, snowTempC: checkpoint.snowTempC, snowHumidity: checkpoint.snowHumidity, resumeCheckpoint: { ...checkpoint, cameraMode }, resumeToken: 'rainCloudDepth-' + name + '-' + Date.now() } }, 'light');
    }, { name, cameraMode, pauseAtChanges });
    await page.waitForFunction(({ name, cameraMode }) => { const c = document.querySelector('#wcPilotCanvas'); return window.pilotReview && c && c.dataset.parcelForm === rainCloudDepthStates[name].form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === rainCloudDepthStates[name].form; }, { name, cameraMode });
    await settle();
    if(suite==='spatial-weather')await page.evaluate(()=>{
      window.spatialWeatherDrawOrder=[];window.spatialWeatherDrawHooks||=new WeakSet();
      pilotReview.scene.traverse(o=>{
        const water=['pilot-ocean-surface','pilot-coastal-shallows','pilot-lake-water','pilot-stream-water','pilot-stream-riffles','pilot-stream-cascades','pilot-stream-ice','pilot-water-surface-glints','pilot-stream-flow-streaks'].includes(o.name),cloud=o.isSprite&&o.material?.pilotBillowNormalMap;
        if((!water&&!cloud)||!o.material||spatialWeatherDrawHooks.has(o))return;spatialWeatherDrawHooks.add(o);const previous=o.onBeforeRender;
        o.onBeforeRender=function(){if(previous)previous.apply(this,arguments);const groups=[];for(let p=this.parent;p;p=p.parent)if(p.isGroup)groups.push({name:p.name,renderOrder:p.renderOrder});window.spatialWeatherDrawOrder.push({frame:window.reviewRenderCount||0,kind:cloud?'cloud':'water',name:this.name,parent:this.parent?.name,renderOrder:this.renderOrder,groups});};
      });
    });
  }
  const handoff = () => page.evaluate(() => {
    const c = document.querySelector('#wcPilotCanvas'), scene = pilotReview.scene, group = scene.getObjectByName('pilot-phase-handoff');
    const geometryIds = new Set(), materialIds = new Set(), allMaterialDepth=new Map();
    const sample = o => {
      if (o.geometry) geometryIds.add(o.geometry.uuid);
      const materials = (o.material ? Array.isArray(o.material) ? o.material : [o.material] : []).map(m => { materialIds.add(m.uuid); return { uuid: m.uuid, opacity: m.opacity, depthTest:m.depthTest,depthWrite:m.depthWrite,userData: rainCloudDepthClean(m.userData) }; });
      return { name: o.name, visible: o.visible, geometry: o.geometry?.uuid, position: o.position.toArray(), worldPosition: o.getWorldPosition(new THREE.Vector3()).toArray(), scale: o.scale.toArray(), worldScale: o.getWorldScale(new THREE.Vector3()).toArray(), quaternion: o.quaternion.toArray(), worldQuaternion:o.getWorldQuaternion(new THREE.Quaternion()).toArray(), materials, userData: rainCloudDepthClean(o.userData), count: o.count, instanceMatrix: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null };
    };
    const meshes = []; group.traverse(o => { if (o !== group) meshes.push(sample(o)); });
    const parcel = scene.getObjectByName('pilot-water-parcel');
    // A memory switches between already-pooled liquid and rain geometries;
    // inspect the whole scene pool rather than only currently assigned memory.
    scene.traverse(o => { if (o.geometry) geometryIds.add(o.geometry.uuid); for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {materialIds.add(m.uuid);allMaterialDepth.set(m.uuid,{uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite});} });
    return { visible: group.visible, cameraMode: c.dataset.pilotCamera, position: group.position.toArray(), data: { active: c.dataset.phaseHandoff, kind: c.dataset.phaseHandoffKind, from: c.dataset.phaseHandoffFrom, to: c.dataset.phaseHandoffTo, progress: c.dataset.phaseHandoffProgress, front: c.dataset.phaseFront }, userData: rainCloudDepthClean(group.userData), geometryIds: [...geometryIds].sort(), materialIds: [...materialIds].sort(), materialDepth:[...allMaterialDepth.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid)), meshes, parcel: { position: parcel.position.toArray(), worldPosition: parcel.getWorldPosition(new THREE.Vector3()).toArray(), children: parcel.children.map(sample) } };
  });
  async function inspect(name) {
    const info = await page.evaluate(() => {
      let finite = true; const named = {};
      pilotReview.scene.traverse(o => {
        if (/^pilot-/.test(o.name)) named[o.name] = { visible: o.visible, type: o.type, children: o.children.length, userData: rainCloudDepthClean(o.userData) };
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
    await page.evaluate(name => { window.rainCloudDepthDriveInput = { ...rainCloudDepthTransitions[name].input }; }, name); await resume();
    await page.waitForFunction(name => { const c = document.querySelector('#wcPilotCanvas'); return c.dataset.parcelForm === rainCloudDepthTransitions[name].after.form && waterReviewData.pilot.paused; }, name);
    await settle();
    const receipt = await page.evaluate(name => ({ name, expectedFrom: rainCloudDepthTransitions[name].before.form, expectedTo: rainCloudDepthTransitions[name].after.form, actual: rainCloudDepthLiveSteps, receipt: waterReviewData.pilot.lastChange }), name);
    assert(receipt.actual.some(step => step.from === receipt.expectedFrom && step.to === receipt.expectedTo), 'Real kernel performs the scene transition');
    assert(receipt.receipt?.from === receipt.expectedFrom && receipt.receipt?.to === receipt.expectedTo, 'Scene retains genuine form-change receipt');
    (result.receipts ||= []).push(receipt); return before;
  }

  const cloudSample = () => page.evaluate(() => {
    pilotReview.scene.updateMatrixWorld(true);
    const clouds=[],normalMaps=new Map(),albedos=new Map(),shaderNormals=new Set(),sun=pilotReview.scene.getObjectByName('pilot-cloud-shadow').userData.sunDirection;
    const textureInfo=texture=>{const image=texture?.image;if(!image?.getContext)return null;const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let minR=255,maxR=0,minG=255,maxG=0,minB=255,maxB=0,maxRGBSpread=0,opaque=0,checksum=0;const luminances=[];for(let n=0;n<pixels.length;n+=4){if(pixels[n+3]>16){opaque++;minR=Math.min(minR,pixels[n]);maxR=Math.max(maxR,pixels[n]);minG=Math.min(minG,pixels[n+1]);maxG=Math.max(maxG,pixels[n+1]);minB=Math.min(minB,pixels[n+2]);maxB=Math.max(maxB,pixels[n+2]);maxRGBSpread=Math.max(maxRGBSpread,Math.max(pixels[n],pixels[n+1],pixels[n+2])-Math.min(pixels[n],pixels[n+1],pixels[n+2]));if(pixels[n+3]>240)luminances.push((pixels[n]+pixels[n+1]+pixels[n+2])/3);}checksum=(checksum+pixels[n]*(n+1)+pixels[n+1]*3+pixels[n+2]*7) % 1000000007;}luminances.sort((a,b)=>a-b);return {uuid:texture.uuid,name:texture.name,width:image.width,height:image.height,opaque,minR,maxR,minG,maxG,minB,maxB,maxRGBSpread,checksum,userData:rainCloudDepthClean(texture.userData),opaqueLuminance05:luminances[Math.floor(luminances.length*.05)],opaqueLuminance95:luminances[Math.floor(luminances.length*.95)]};};
    pilotReview.scene.traverse(o=>{const m=o.material;if(!o.isSprite||!m?.pilotBillowNormalMap)return;const normal=m.pilotBillowNormalMap,newNormal=!normalMaps.has(normal.uuid),lighting=m.userData.cloudLighting||{};normalMaps.set(normal.uuid,textureInfo(normal));if(m.map)albedos.set(m.map.uuid,textureInfo(m.map));const properties=pilotReview.renderer.properties.get(m),program=properties.currentProgram||properties.program,gl=pilotReview.renderer.getContext(),fragment=program?.fragmentShader?gl.getShaderSource(program.fragmentShader):'',vertex=program?.vertexShader?gl.getShaderSource(program.vertexShader):'',keepShader=!!fragment&&!shaderNormals.has(normal.uuid),readUniform=name=>{if(!program?.program)return null;const location=gl.getUniformLocation(program.program,name);if(!location)return null;const value=gl.getUniform(program.program,location);return ArrayBuffer.isView(value)?Array.from(value):value;};if(keepShader)shaderNormals.add(normal.uuid);clouds.push({name:o.name,parent:o.parent?.name,tier:o.userData.cloudTier,shelterCaptured:o.userData.cloudShelterCaptured,map:m.map?.uuid,normal:normal.uuid,material:m.uuid,color:m.color.toArray(),position:o.position.toArray(),scale:o.scale.toArray(),lighting:rainCloudDepthClean(lighting),sharedSunKeys:Object.entries(lighting).filter(([,v])=>v===sun||v?.value===sun).map(([k])=>k),sharesNormal:lighting.normalMap===normal||lighting.normalMap?.value===normal,compile:String(m.onBeforeCompile),linkedFragment:keepShader?fragment:null,linkedVertex:keepShader?vertex:null,linkedShader:!!fragment,uploaded:fragment?{sun:readUniform('pilotCloudSun'),solar:readUniform('pilotCloudSolar'),normalUnit:readUniform('pilotCloudNormalMap'),shelter:readUniform('pilotCloudShelter'),view:readUniform('pilotCloudViewMatrix')}:null,cacheKey:m.customProgramCacheKey()});});
    const camera=window.reviewCameraOverride||pilotReview.camera,cameraSun=sun.clone().transformDirection(camera.matrixWorldInverse);
    return {sun:sun.toArray(),cameraSun:cameraSun.toArray(),expectedCameraView:camera.matrixWorldInverse.toArray(),pixelProbe:window.rainCloudDepthCloudPixels,shelterReads:Object.values(window.rainCloudDepthShelterReads||{}),clouds,normalMaps:[...normalMaps.values()],albedos:[...albedos.values()],drawOrder:(window.spatialWeatherDrawOrder||[]).slice()};
  });

  const phaseDetail = () => page.evaluate(() => {
    const s=pilotReview.scene;s.updateMatrixWorld(true);const group=s.getObjectByName('pilot-phase-handoff'),parcel=s.getObjectByName('pilot-water-parcel'),c=document.querySelector('#wcPilotCanvas'),objects=[];
    group.traverse(o=>{const materials=o.material?Array.isArray(o.material)?o.material:[o.material]:[];objects.push({name:o.name,type:o.type,visible:o.visible,renderOrder:o.renderOrder,position:o.position.toArray(),worldPosition:o.getWorldPosition(new THREE.Vector3()).toArray(),scale:o.scale.toArray(),worldScale:o.getWorldScale(new THREE.Vector3()).toArray(),quaternion:o.quaternion.toArray(),geometry:o.geometry?.uuid,count:o.count,instanceMatrix:o.instanceMatrix?Array.from(o.instanceMatrix.array):null,userData:rainCloudDepthClean(o.userData),materials:materials.map(m=>({uuid:m.uuid,opacity:m.opacity,depthTest:m.depthTest,depthWrite:m.depthWrite,userData:rainCloudDepthClean(m.userData)}))});});
    const primaryDroplet=s.getObjectByName('pilot-phase-incoming-droplet'),primarySnow=s.getObjectByName('pilot-snow-parcel'),snowPreview=s.getObjectByName('pilot-phase-incoming-snow'),rainPreview=s.getObjectByName('pilot-phase-incoming-rain');
    const actualDrop=primaryDroplet&&parcel.children.find(o=>o.geometry===primaryDroplet.geometry&&o.material===primaryDroplet.material),snowBody=primarySnow.children.find(o=>o.isMesh),snowEdge=primarySnow.children.find(o=>o.isLineSegments),previewBody=snowPreview?.children.find(o=>o.isMesh),previewEdge=snowPreview?.children.find(o=>o.isLineSegments),iceMemory=s.getObjectByName('pilot-phase-ice-memory'),iceFront=iceMemory?.material?.userData.meltingFront,dropFront=actualDrop?.material.userData.meltingFront;
    const bindings={droplet:primaryDroplet&&actualDrop?{visible:primaryDroplet.visible,sharesGeometry:primaryDroplet.geometry===actualDrop.geometry,sharesMaterial:primaryDroplet.material===actualDrop.material,previewWorldScale:primaryDroplet.getWorldScale(new THREE.Vector3()).toArray(),actualWorldScale:actualDrop.getWorldScale(new THREE.Vector3()).toArray()}:null,snow:snowPreview?{visible:snowPreview.visible,bodyGeometry:previewBody?.geometry===snowBody.geometry,bodyMaterial:previewBody?.material===snowBody.material,edgeGeometry:previewEdge?.geometry===snowEdge.geometry,edgeMaterial:previewEdge?.material===snowEdge.material,previewScale:snowPreview.getWorldScale(new THREE.Vector3()).toArray(),actualScale:primarySnow.getWorldScale(new THREE.Vector3()).toArray()}:null,rainVisible:rainPreview?.visible,melting:iceFront&&dropFront?{sharedActive:iceFront.active===dropFront.active,sharedProgress:iceFront.progress===dropFront.progress,sharedTransform:iceFront.worldToSource===dropFront.worldToSource,sourceIsIncoming:iceFront.incoming,targetIsIncoming:dropFront.incoming,sourceCentre:iceMemory.getWorldPosition(new THREE.Vector3()).applyMatrix4(iceFront.worldToSource.value).toArray(),previewLocalToSource:iceFront.worldToSource.value.clone().multiply(primaryDroplet.matrixWorld).toArray(),actualLocalToSource:iceFront.worldToSource.value.clone().multiply(actualDrop.matrixWorld).toArray()}:null};
    const materialDepth=new Map();s.traverse(o=>{for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])materialDepth.set(m.uuid,{uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite});});
    const shadow=s.getObjectByName('pilot-cloud-shadow'),cameraDistance=pilotReview.camera.position.distanceTo(parcel.getWorldPosition(new THREE.Vector3()));
    return {visible:group.visible,groupData:rainCloudDepthClean(group.userData),data:{...c.dataset},objects,bindings,materialDepth:[...materialDepth.values()].sort((a,b)=>a.uuid.localeCompare(b.uuid)),parcelPosition:parcel.getWorldPosition(new THREE.Vector3()).toArray(),cameraDistance,primary:parcel.children.map(o=>({name:o.name,visible:o.visible,geometry:o.geometry?.uuid,scale:o.scale.toArray(),worldScale:o.getWorldScale(new THREE.Vector3()).toArray(),position:o.position.toArray(),worldPosition:o.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:o.quaternion.toArray(),materials:(o.material?Array.isArray(o.material)?o.material:[o.material]:[]).map(m=>({uuid:m.uuid,depthTest:m.depthTest,depthWrite:m.depthWrite}))})),shadow:{visible:shadow.visible,userData:rainCloudDepthClean(shadow.userData)},steps:window.rainCloudDepthTotalSteps};
  });
  const rainSample = () => page.evaluate(() => {
    pilotReview.scene.updateMatrixWorld(true);const out=[];
    for(const name of ['pilot-rain-field','pilot-rain-ribbons','pilot-rain-water-impacts']){const o=pilotReview.scene.getObjectByName(name),m=o.material,p=pilotReview.renderer.properties.get(m),program=p.currentProgram||p.program,gl=pilotReview.renderer.getContext();out.push({name,visible:o.visible,opacity:m.opacity,userData:rainCloudDepthClean(o.userData),materialUserData:rainCloudDepthClean(m.userData),compile:String(m.onBeforeCompile),vertex:program?.vertexShader?gl.getShaderSource(program.vertexShader):'',fragment:program?.fragmentShader?gl.getShaderSource(program.fragmentShader):'',attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,{count:a.count,itemSize:a.itemSize,values:Array.from(a.array)}]))});}
    return {objects:out,pixels:window.rainCloudDepthRainPixels,dataset:{...document.querySelector('#wcPilotCanvas').dataset}};
  });
  const opticalSample = () => page.evaluate(() => {
    const s=pilotReview.scene,renderer=pilotReview.renderer,gl=renderer.getContext(),seen=new Set(),materials=[],objects=[];s.updateMatrixWorld(true);
    for(const groupName of ['pilot-water-parcel','pilot-phase-handoff'])s.getObjectByName(groupName)?.traverse(o=>{
      if(!o.material)return;objects.push({name:o.name,type:o.type,visible:o.visible,parentVisible:o.parent?.visible,worldPosition:o.getWorldPosition(new THREE.Vector3()).toArray(),worldScale:o.getWorldScale(new THREE.Vector3()).toArray(),geometry:o.geometry?.uuid});
      for(const m of Array.isArray(o.material)?o.material:[o.material]){if(seen.has(m.uuid))continue;seen.add(m.uuid);const properties=renderer.properties.get(m),program=properties.currentProgram||properties.program,uniforms={};if(program?.program){for(let i=0,n=gl.getProgramParameter(program.program,gl.ACTIVE_UNIFORMS);i<n;i++){const active=gl.getActiveUniform(program.program,i);if(!/^pilot|^parcelOptical|^opacity$|^diffuse$|^roughness$|^metalness$/.test(active.name))continue;const value=gl.getUniform(program.program,gl.getUniformLocation(program.program,active.name));uniforms[active.name]=ArrayBuffer.isView(value)?Array.from(value):value;}}
      materials.push({uuid:m.uuid,name:m.name,type:m.type,color:m.color?.toArray(),opacity:m.opacity,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,blending:m.blending,premultipliedAlpha:m.premultipliedAlpha,toneMapped:m.toneMapped,userData:rainCloudDepthClean(m.userData),compile:String(m.onBeforeCompile),cacheKey:m.customProgramCacheKey(),vertex:program?.vertexShader?gl.getShaderSource(program.vertexShader):null,fragment:program?.fragmentShader?gl.getShaderSource(program.fragmentShader):null,uploaded:uniforms});}
    });return {objects,materials,camera:(window.reviewCameraOverride||pilotReview.camera).matrixWorldInverse.toArray(),dataset:{...document.querySelector('#wcPilotCanvas').dataset}};
  });
  try {
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.pilotReview&&window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c=>{const gl=c.getContext('webgl2')||c.getContext('webgl');return !!gl&&!gl.isContextLost();}));
    await page.evaluate(()=>{
      window.reviewRenderActive=false;
      window.rainCloudDepthClean=function(value){const seen=new WeakSet();const clean=v=>{if(v==null||typeof v!=='object')return typeof v==='function'?undefined:v;if(v.isTexture)return {uuid:v.uuid,name:v.name,width:v.image?.width,height:v.image?.height};if(seen.has(v))return '[shared reference]';seen.add(v);if(Array.isArray(v)||ArrayBuffer.isView(v))return Array.from(v,clean);return Object.fromEntries(Object.entries(v).filter(([key])=>!['surfaceShader','meltShader','cloudShader'].includes(key)).map(([key,item])=>[key,clean(item)]));};return clean(value);};
      window.rainCloudDepthCloudProbe=function(scene,camera,renderer){const gl=renderer.getContext(),cloud=scene.getObjectByName('pilot-self-cloud'),read=(x,y)=>{const p=new Uint8Array(4);gl.readPixels(Math.max(0,Math.min(gl.drawingBufferWidth-1,x)),Math.max(0,Math.min(gl.drawingBufferHeight-1,y)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);};if(cloud?.visible){const samples=[];for(const child of cloud.children){const point=child.getWorldPosition(new THREE.Vector3()).project(camera);if(Math.abs(point.x)>.98||Math.abs(point.y)>.98||point.z< -1||point.z>1)continue;const x=Math.round((point.x+1)*.5*(gl.drawingBufferWidth-1)),y=Math.round((point.y+1)*.5*(gl.drawingBufferHeight-1)),rgba=read(x,y);samples.push({ndc:point.toArray(),rgba,luminance:(rgba[0]+rgba[1]+rgba[2])/3});}window.rainCloudDepthCloudPixels={samples,renderCamera:camera.matrixWorldInverse.toArray()};}
        const rain=scene.getObjectByName('pilot-rain-ribbons');if(rain?.visible){const positions=rain.geometry.attributes.position,alpha=rain.geometry.attributes.rainAlpha,along=rain.geometry.attributes.rainAlong,samples=[];let stride=6;if(along)for(let i=2;i<along.count;i++)if(along.getX(i)===0&&along.getX(i-1)!==0){stride=i;break;}for(let n=0;n<positions.count&&samples.length<20;n+=stride){if(alpha&&alpha.getX(n)<=.03)continue;const world=new THREE.Vector3();for(let v=0;v<stride;v++)world.add(new THREE.Vector3().fromBufferAttribute(positions,n+v));world.multiplyScalar(1/stride).applyMatrix4(rain.matrixWorld);const eye=world.clone().applyMatrix4(camera.matrixWorldInverse),point=world.clone().project(camera),depth=-eye.z;if(depth<3||depth>100||Math.abs(point.x)>.95||Math.abs(point.y)>.95||point.z< -1||point.z>1)continue;const x=Math.round((point.x+1)*.5*(gl.drawingBufferWidth-1)),y=Math.round((point.y+1)*.5*(gl.drawingBufferHeight-1)),centre=read(x,y),left=read(x-3,y),right=read(x+3,y),contrast=Math.max(...centre.slice(0,3).map((v,i)=>Math.max(Math.abs(v-left[i]),Math.abs(v-right[i]))));samples.push({depth,ndc:point.toArray(),centre,left,right,contrast});}window.rainCloudDepthRainPixels={samples};}
      };
      const k=WaterCyclePilotKernel,original=k.step,states={},transitions={},env=k.environment('tropicalOcean');
      const advance=(start,input,limit,desired)=>{let s=start;for(let n=0;n<limit;n++){const next=original(s,input);if(next.form!==s.form&&next.form===desired)return {before:s,after:next,input};s=next;}throw Error('Production kernel did not reach '+desired);};
      states.liquid=k.practiceState('surface','tropicalOcean');states.vapor=k.practiceState('cloud','tropicalOcean');transitions.condensation=advance(states.vapor,{dt:.12,nucleusHit:true},100,'droplet');states.droplet=transitions.condensation.after;
      transitions.reevaporation=advance(states.droplet,{dt:.12,thrust:-1,nucleusHit:false,dropletHit:false},12000,'vapor');
      const temperateDroplet=advance(k.practiceState('cloud','temperateCoast'),{dt:.12,nucleusHit:true},100,'droplet').after;transitions.freezing=advance(temperateDroplet,{dt:.12,thrust:1,dropletHit:false},12000,'ice');states.ice=transitions.freezing.after;
      transitions.melting=advance(states.ice,{dt:.12,thrust:-1,nucleusHit:false,dropletHit:false},12000,'droplet');
      transitions.cloudAssembly=advance(states.droplet,{dt:.12,dropletHit:true},100,'cloud');states.cloud=transitions.cloudAssembly.after;transitions.rainRelease=advance(states.cloud,{dt:.12,dropletHit:true},100,'rain');states.rain=transitions.rainRelease.after;
      {let s=states.rain;for(let n=0;n<10000&&s.altitudeM>28;n++)s=original(s,{dt:.12,surface:'water'});if(s.form!=='rain'||s.altitudeM<=0)throw Error('Real rain did not reach low ocean');states.rainLow=s;}
      {let s=states.cloud;for(let n=0;n<12000&&s.altitudeM<Math.min(env.ceilingM-40,env.freezingM+240);n++)s=original(s,{dt:.12,thrust:1,dropletHit:false,nucleusHit:false});if(s.form!=='cloud'||s.altitudeM<env.freezingM)throw Error('Actual cloud could not be lofted through freezing');states.coldCloud=s;transitions.snowRelease=advance(s,{dt:.12,thrust:1,dropletHit:true},100,'snow');}
      const mountainVapor=k.practiceState('cloud','mountainWinter'),mountainIce=advance(mountainVapor,{dt:.12,nucleusHit:true},100,'ice').after;transitions.mountainMelting=advance(mountainIce,{dt:.12,thrust:-1,dropletHit:false,nucleusHit:false},12000,'droplet');transitions.mountainReevaporation=advance(transitions.mountainMelting.after,{dt:.12,thrust:-1,dropletHit:false,nucleusHit:false},10,'vapor');
      {const e=k.environment('temperateCoast');let state=temperateDroplet;for(let n=0;n<12000;n++){const dt=.12,base=k.verticalAccel(state,e,0),gain=k.verticalAccel(state,e,1)-base,desired=Math.max(-.1,Math.min(1.5,(e.freezingM+.05-state.altitudeM)/(k.UNIT_M*2.5))),thrust=Math.max(-1,Math.min(1,((desired/(1-.9*dt)-state.vy)/dt-base)/gain)),input={dt,thrust,dropletHit:false,nucleusHit:false},next=original(state,input);if(state.form==='droplet'&&next.form==='ice'){transitions.recrossFreezing={before:state,after:next,input};break;}state=next;}if(!transitions.recrossFreezing)throw Error('Genuine controlled freezing recross missing');transitions.recrossMelting=advance(transitions.recrossFreezing.after,{dt:.12,thrust:-1,dropletHit:false,nucleusHit:false},8,'droplet');}
      for(const[name,t]of Object.entries(transitions))states['before-'+name]=t.before;
      window.rainCloudDepthStates=states;window.rainCloudDepthTransitions=transitions;window.rainCloudDepthLiveSteps=[];window.rainCloudDepthTotalSteps=0;
      k.step=function(state,input){window.rainCloudDepthTotalSteps++;const drive=window.rainCloudDepthDriveInput;if(drive)window.rainCloudDepthDriveInput=null;const actualInput={...input,...(window.rainCloudDepthSteadyInput||{}),...(drive||{})},next=original(state,actualInput);if(window.cloudEvolutionReleaseProbe&&state.form==='cloud'&&(next.form==='rain'||next.form==='snow'))window.cloudEvolutionReleaseProof=window.cloudEvolutionReleaseProbe(state,next);if(drive||next.form!==state.form)rainCloudDepthLiveSteps.push({from:state.form,to:next.form,elapsed:next.elapsed,input:actualInput});return next;};
    });
    pass('Condensation, cloud-droplet re-evaporation, ice melting and cloud-to-snow fixtures come from genuine unchanged kernel integration');
    if (enabled('cloud-evolution')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => {
        window.cloudEvolutionLobes = group => group.children.map((o, index) => ({
          index, tier: o.userData.cloudTier, position: o.position.toArray(), scale: o.scale.toArray(),
          opacity: o.material.opacity, density: o.material.userData.cloudLighting.density.value,
          densityModel: o.material.userData.cloudLighting.densityModel,
          basePosition: [o.userData.motionBaseX, o.userData.motionBaseY, o.userData.motionBaseZ],
          baseScale: [o.userData.motionBaseScaleX, o.userData.motionBaseScaleY, 1],
          baseOpacity: o.userData.motionBaseOpacity, material: o.material.uuid,
          map: o.material.map.uuid, normal: o.material.pilotBillowNormalMap.uuid
        }));
        window.cloudEvolutionReleaseProbe = (before, after) => ({
          from: before.form, to: after.form, elapsed: [before.elapsed, after.elapsed],
          phaseProgress: Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress),
          lobes: cloudEvolutionLobes(pilotReview.scene.getObjectByName('pilot-self-cloud'))
        });
        window.cloudEvolutionHooked = new WeakSet();
        window.cloudEvolutionDensityReads = [];
      });
      async function evolutionDraw() {
        await page.evaluate(() => {
          for (const groupName of ['pilot-self-cloud', 'pilot-phase-cloud-memory']) {
            const group = pilotReview.scene.getObjectByName(groupName);
            for (const o of group.children) {
              if (cloudEvolutionHooked.has(o)) continue;
              cloudEvolutionHooked.add(o); const previous = o.onAfterRender;
              o.onAfterRender = function(renderer, scene, camera, geometry, material) {
                if (previous) previous.apply(this, arguments);
                const properties = renderer.properties.get(material), program = properties.currentProgram || properties.program;
                const gl = renderer.getContext(), location = program?.program && gl.getUniformLocation(program.program, 'pilotCloudDensity');
                cloudEvolutionDensityReads.push({ parent: this.parent.name, index: this.parent.children.indexOf(this),
                  expected: material.userData.cloudLighting.density.value,
                  uploaded: location === null || !program ? null : gl.getUniform(program.program, location) });
              };
            }
          }
        });
        // Scene restores create fresh materials. Warm them through the native
        // renderer before reading the actual per-sprite uploaded uniforms.
        for (let draw = 0; draw < 2; draw++) {
          const before = await page.evaluate(() => { cloudEvolutionDensityReads = []; window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
          await page.waitForFunction(before => window.reviewRenderCount > before, before, { timeout: 90000 });
          await page.evaluate(() => { window.reviewRenderActive = false; });
        }
      }
      const evolutionSample = (linked = false) => page.evaluate(linked => {
        const s = pilotReview.scene, live = s.getObjectByName('pilot-self-cloud'), memory = s.getObjectByName('pilot-phase-cloud-memory');
        const group = s.getObjectByName('pilot-phase-handoff'), programs = new Map(), textures = new Set();
        if (linked) for (const o of [...live.children, ...memory.children]) {
          const material = o.material, properties = pilotReview.renderer.properties.get(material), program = properties.currentProgram || properties.program;
          textures.add(material.map.uuid); textures.add(material.pilotBillowNormalMap.uuid);
          if (program?.fragmentShader && !programs.has(program.id)) {
            const gl = pilotReview.renderer.getContext(); programs.set(program.id, { id: program.id, fragment: gl.getShaderSource(program.fragmentShader) });
          }
        }
        return { camera: document.querySelector('#wcPilotCanvas').dataset.pilotCamera,
          phaseKind: group.userData.kind, phaseVisible: group.visible, phaseProgress: group.userData.progress,
          motionTime: live.userData.motionTime, live: { visible: live.visible, lobes: cloudEvolutionLobes(live) },
          memory: { visible: memory.visible, placement: memory.userData.placement, lobes: cloudEvolutionLobes(memory) },
          reads: cloudEvolutionDensityReads.slice(), programs: [...programs.values()], sharedTextureCount: textures.size,
          resources: JSON.parse(JSON.stringify(pilotReview.renderer.info.memory)), steps: rainCloudDepthTotalSteps,
          releaseProof: window.cloudEvolutionReleaseProof || null };
      }, linked);
      const verifyAssembly = snapshot => {
        assert.equal(snapshot.phaseKind, 'cloud-assembly'); assert(snapshot.phaseVisible);
        const p = snapshot.phaseProgress, eased = p * p * (3 - 2 * p);
        for (const lobe of snapshot.live.lobes) {
          const tier = Math.max(0, Math.min(1, (eased - lobe.tier * .17) / .62));
          assert(Math.abs(lobe.density - tier * tier * (3 - 2 * tier)) < 1e-10);
          assert.equal(lobe.opacity, lobe.baseOpacity, 'Formation changes optical depth inside each map, preserving base material opacity');
          assert.equal(lobe.densityModel, 'optical-depth-assembly');
          if (snapshot.camera === 'water') assert.equal(snapshot.memory.lobes[lobe.index].density, lobe.density, 'Water lens copies the actual forming lobe density');
        }
        const expectedParent = snapshot.camera === 'water' ? 'pilot-phase-cloud-memory' : 'pilot-self-cloud';
        const reads = snapshot.reads.filter(read => read.parent === expectedParent);
        assert(reads.length > 0 && reads.every(read => Number.isFinite(read.uploaded) && Math.abs(read.uploaded - read.expected) < 1e-6), 'Actual native per-sprite cloud density matches the uploaded uniform');
      };
      const immutableLobes = snapshot => snapshot.live.lobes.map(({ position, scale, opacity, density }) => ({ position, scale, opacity, density }));
      const assembly = [];
      await trigger('cloudAssembly', { cameraMode: 'follow' });
      await page.evaluate(() => { window.rainCloudDepthSteadyInput = { dropletHit: false, nucleusHit: false }; });
      await evolutionDraw(); let sample = await evolutionSample(true); verifyAssembly(sample);
      assert(sample.programs.length > 0 && sample.programs.every(program => ['uniform float pilotCloudDensity', 'cloudTransmission', 'cloudDensityCoverage', 'pow(cloudTransmission,cloudDensity)'].every(token => program.fragment.includes(token))), 'Actual linked cloud shader contains the normalized optical-depth formation');
      assert(sample.sharedTextureCount <= 12, 'Cloud formation reuses the six paired albedo and relief maps');
      if (earlyClean) {
        const before = sample;
        // Dismiss the genuine receipt using its own UI, then pause immediately.
        // No form, mass, phase progress or simulation clock is written by QA.
        await page.getByRole('button', { name: 'Continue journey', exact: true }).click();
        await pause(); await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample);
        assert(sample.phaseProgress < .4, 'Receipt dismissal retains the early formation stage');
        assert.equal(await page.locator('.wc-pilot-notice').count(), 0, 'Journey receipt is dismissed through the supported Continue journey action');
        await capture('cloud-assembly-early-clean-follow'); await inspect('cloud-assembly-early-clean-follow');
        result.cloudEvolutionClean = { before, clean: sample, receiptDismissed: true, scope: 'Actual Continue journey UI followed immediately by Pause; all clocks and forms remain production controlled.' };
        assert.deepEqual(result.errors, []); pass('Unobscured early cloud formation retains genuine partial optical depth after supported receipt dismissal without synthetic model or phase edits');
        pass('No page, WebGL or shader errors'); result.success = true; return;
      }
      assembly.push({ name: 'early-follow', ...sample }); await capture('cloud-assembly-early-follow');
      await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .48); await pause();
      await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample); assembly.push({ name: 'middle-follow', ...sample }); await capture('cloud-assembly-middle-follow');
      await page.waitForTimeout(180); const frozen = await evolutionSample(); assert.deepEqual(immutableLobes(frozen), immutableLobes(sample), 'Paused formation keeps every cloud pose, density and opacity exact');
      await page.getByRole('button', { name: 'Water view', exact: true }).click(); await settle(); await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample);
      assembly.push({ name: 'middle-water', ...sample }); await capture('cloud-assembly-middle-water');
      assert.deepEqual(immutableLobes(sample), immutableLobes(assembly[1]), 'Water/Follow switch does not change the forming real cloud');
      await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .82); await pause();
      await evolutionDraw(); sample = await evolutionSample(); verifyAssembly(sample); assembly.push({ name: 'late-water', ...sample }); await capture('cloud-assembly-late-water');
      await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden'); await pause();
      const expired = await evolutionSample(); assert(expired.live.lobes.every(lobe => lobe.density === 1) && expired.memory.lobes.every(lobe => lobe.density === 1), 'Formation expiry restores all live and pooled memory optical depths');
      pass('Genuine early, middle and late cloud assembly grows per-tier optical depth; actual uploaded uniforms, paused poses and Water/Follow density remain consistent');

      await trigger('cloudAssembly', { cameraMode: 'follow' });
      await page.evaluate(() => { window.cloudEvolutionReleaseProof = null; window.rainCloudDepthSteadyInput = { dropletHit: true, nucleusHit: false }; });
      await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'rain' && waterReviewData.pilot.paused);
      await settle(); await evolutionDraw(); const released = await evolutionSample(), source = released.releaseProof;
      assert(source && source.from === 'cloud' && source.to === 'rain' && source.lobes.some(lobe => lobe.density < 1), 'Genuine rapid coalescence interrupts partial cloud assembly');
      for (const lobe of source.lobes) {
        const memory = released.memory.lobes[lobe.index];
        assert.equal(memory.density, lobe.density, 'Outgoing source retains each actually visible partial optical depth');
        assert.deepEqual(memory.position, lobe.position); assert.deepEqual(memory.scale, lobe.scale);
      }
      assert(released.live.lobes.every(lobe => lobe.density === 1));
      await capture('cloud-assembly-rapid-rain-follow');
      await page.getByRole('button', { name: 'Water view', exact: true }).click(); await settle(); await evolutionDraw(); const releaseWater = await evolutionSample();
      assert.deepEqual(releaseWater.memory.lobes.map(lobe => lobe.density), source.lobes.map(lobe => lobe.density), 'Source density survives the bounded Water teaching lens');
      await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden'); await pause();
      const releaseExpired = await evolutionSample(); assert(releaseExpired.memory.lobes.every(lobe => lobe.density === 1));
      pass('A genuine partial-assembly cloud-to-rain transition captures every source lobe density and pose before clearing, preserves it in both views and clears it at expiry');

      await restore('cloud', { pauseAtChanges: false }); await page.evaluate(() => { window.rainCloudDepthSteadyInput = { dropletHit: false, nucleusHit: false }; });
      const zero = await evolutionSample(); assert.equal(zero.motionTime, 0);
      for (const lobe of zero.live.lobes) { assert.deepEqual(lobe.position, lobe.basePosition); assert.deepEqual(lobe.scale, lobe.baseScale); assert.equal(lobe.density, 1); }
      await resume(); await page.waitForFunction(() => pilotReview.scene.getObjectByName('pilot-self-cloud').userData.motionTime >= .25); await pause(); const firstMotion = await evolutionSample();
      await resume(); await page.waitForFunction(() => pilotReview.scene.getObjectByName('pilot-self-cloud').userData.motionTime >= .55); await pause(); const secondMotion = await evolutionSample();
      const verticalVelocities = [];
      for (const lobe of secondMotion.live.lobes) {
        const tier = lobe.tier, delta = lobe.position.map((value, i) => value - lobe.basePosition[i]);
        assert(Math.abs(delta[0]) <= 2.2 * tier + 1e-10 && Math.abs(delta[1]) <= 2 * tier * (.4 + tier * .1) + 1e-10 && Math.abs(delta[2]) <= .56 * tier + 1e-10);
        const width = lobe.scale[0] / lobe.baseScale[0], height = lobe.scale[1] / lobe.baseScale[1];
        assert(width >= .982 - 1e-10 && width <= 1.018 + 1e-10 && height >= .972 - 1e-10 && height <= 1.028 + 1e-10);
        if (tier === 0) { assert.deepEqual(lobe.position, lobe.basePosition); assert.equal(lobe.scale[1], lobe.baseScale[1]); }
        else verticalVelocities.push((lobe.position[1] - firstMotion.live.lobes[lobe.index].position[1]) / (secondMotion.motionTime - firstMotion.motionTime));
      }
      const minVerticalVelocity = Math.min(...verticalVelocities), maxVerticalVelocity = Math.max(...verticalVelocities);
      assert(maxVerticalVelocity - minVerticalVelocity > .05 && minVerticalVelocity < 0 && maxVerticalVelocity > 0, 'Actual cloud lobes have different signed convective velocities');
      await page.waitForTimeout(180); const pausedMotion = await evolutionSample(); assert.deepEqual(immutableLobes(pausedMotion), immutableLobes(secondMotion)); assert.equal(pausedMotion.motionTime, secondMotion.motionTime);
      pass('Native lobe motion starts at the original geometry, has distinct bounded rising/falling velocities and breathing, keeps the shelf anchored and freezes exactly at pause');

      await page.emulateMedia({ reducedMotion: 'reduce' }); await trigger('cloudAssembly', { cameraMode: 'water' });
      await page.evaluate(() => { window.rainCloudDepthSteadyInput = { dropletHit: false, nucleusHit: false }; }); await evolutionDraw(); const reduced = await evolutionSample();
      await resume(); await page.waitForTimeout(180); const reducedLater = await evolutionSample(); await pause();
      assert(reducedLater.steps > reduced.steps); assert.equal(reducedLater.phaseProgress, reduced.phaseProgress); assert.equal(reducedLater.motionTime, reduced.motionTime);
      assert.deepEqual(immutableLobes(reducedLater), immutableLobes(reduced), 'Reduced motion keeps optical depth and cloud poses static while the genuine kernel advances');
      await restore('cloud'); const restored = await evolutionSample(); assert(!restored.phaseVisible && restored.live.lobes.every(lobe => lobe.density === 1) && restored.memory.lobes.every(lobe => lobe.density === 1));
      await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid');
      const reset = await evolutionSample(); assert.equal(reset.motionTime, 0); assert(reset.live.lobes.every(lobe => lobe.density === 1) && reset.memory.lobes.every(lobe => lobe.density === 1));
      pass('Reduced motion holds a representative cloud formation while real model steps advance; restore and reset clear optical-depth memories and motion');
      result.cloudEvolution = { assembly, frozen, expired, release: { source, released, water: releaseWater, expired: releaseExpired }, motion: { zero, first: firstMotion, second: secondMotion, paused: pausedMotion, minVerticalVelocity, maxVerticalVelocity }, lifecycle: { reduced, reducedLater, restored, reset }, evidence: { lobes: zero.live.lobes.length, sharedPairedTextures: assembly[0].sharedTextureCount, assemblyProgress: assembly.map(item => ({ name: item.name, progress: item.phaseProgress, densityRange: [Math.min(...item.live.lobes.map(lobe => lobe.density)), Math.max(...item.live.lobes.map(lobe => lobe.density))] })), sourceDensityRange: [Math.min(...source.lobes.map(lobe => lobe.density)), Math.max(...source.lobes.map(lobe => lobe.density))], sourceProgress: source.phaseProgress, minVerticalVelocity, maxVerticalVelocity, reducedModelSteps: [reduced.steps, reducedLater.steps] } };
    }
    if(enabled('cloud')){
      await restore('cloud');result.cloudLighting=[];await page.evaluate(()=>{window.rainCloudDepthShelterReads={};pilotReview.scene.traverse(o=>{if(!o.isSprite||!o.material?.userData.cloudLighting?.shelter)return;const previous=o.onAfterRender;o.onAfterRender=function(renderer,scene,camera,geometry,material){if(previous)previous.apply(this,arguments);const properties=renderer.properties.get(material),program=properties.currentProgram||properties.program,gl=renderer.getContext(),location=program?.program&&gl.getUniformLocation(program.program,'pilotCloudShelter');window.rainCloudDepthShelterReads[material.uuid]={uuid:material.uuid,tier:this.userData.cloudTier,expected:material.userData.cloudLighting.shelter.value,uploaded:location?gl.getUniform(program.program,location):null};};});});
      for(const[name,sign]of[['sunward',1],['opposite',-1]]){await page.evaluate(()=>{window.rainCloudDepthShelterReads={};window.spatialWeatherDrawOrder=[];});const camera=await page.evaluate(({sign,distance})=>{const s=pilotReview.scene,sun=s.getObjectByName('pilot-cloud-shadow').userData.sunDirection,target=s.getObjectByName('pilot-water-parcel').getWorldPosition(new THREE.Vector3()),horizontal=new THREE.Vector3(sun.x,0,sun.z).normalize(),view=new THREE.PerspectiveCamera(48,pilotReview.camera.aspect,.1,3000);view.position.copy(target).addScaledVector(horizontal,sign*distance).add(new THREE.Vector3(0,distance*45/260,0));view.lookAt(target);view.updateMatrixWorld(true);window.reviewCameraOverride=view;return {scope:'Fixture-only review camera; actual production Sun, geometry, materials and kernel checkpoint are unchanged.',position:view.position.toArray(),target:target.toArray()};},{sign,distance:cloudDistance});await capture('cloud-shade-'+name);result.cloudLighting.push({name,camera,...await cloudSample()});}
      if(suite==='spatial-weather'){
        const backdrop=()=>page.evaluate(()=>{
          const s=pilotReview.scene,camera=window.reviewCameraOverride||pilotReview.camera,cloud=s.getObjectByName('pilot-self-cloud'),ocean=s.getObjectByName('pilot-ocean-surface');s.updateMatrixWorld(true);const ray=new THREE.Raycaster(),samples=[];
          for(const child of cloud.children){const world=child.getWorldPosition(new THREE.Vector3()),point=world.clone().project(camera);if(Math.abs(point.x)>.98||Math.abs(point.y)>.98||point.z< -1||point.z>1)continue;ray.setFromCamera(new THREE.Vector2(point.x,point.y),camera);const hit=ray.intersectObject(ocean,false)[0],distance=world.distanceTo(camera.position);if(!hit||hit.distance<=distance+1)continue;const pixel=rainCloudDepthCloudPixels.samples.find(p=>Math.abs(p.ndc[0]-point.x)<1e-9&&Math.abs(p.ndc[1]-point.y)<1e-9);if(pixel)samples.push({ndc:point.toArray(),cloudDistance:distance,waterDistance:hit.distance,rgba:pixel.rgba});}
          return {samples,drawOrder:spatialWeatherDrawOrder.slice()};
        });
        const production=await backdrop();
        const orders=await page.evaluate(()=>{
          const s=pilotReview.scene,objects=[],buffers=[],materials=new Map(),geometries=new Set();
          s.traverse(o=>{objects.push({object:o,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible});if(o.instanceMatrix)buffers.push({name:o.name,buffer:o.instanceMatrix.array,bytes:new Uint8Array(o.instanceMatrix.array.buffer,o.instanceMatrix.array.byteOffset,o.instanceMatrix.array.byteLength).slice()});if(o.geometry&&!geometries.has(o.geometry)){geometries.add(o.geometry);for(const[name,a]of Object.entries(o.geometry.attributes))buffers.push({name:o.name+':'+name,buffer:a.array,bytes:new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength).slice()});}for(const m of o.material?Array.isArray(o.material)?o.material:[o.material]:[])if(!materials.has(m))materials.set(m,{opacity:m.opacity,depthTest:m.depthTest,depthWrite:m.depthWrite});});
          window.spatialWeatherDiagnosticState={objects,buffers,materials};const backdrop=s.getObjectByName('pilot-water-backdrop');if(!backdrop?.isGroup)throw Error('Missing production water backdrop group');const orders=[];backdrop.traverse(o=>{if(o.isGroup){orders.push({name:o.name,uuid:o.uuid,production:o.renderOrder,legacy:0});o.renderOrder=0;}});window.spatialWeatherDrawOrder=[];return orders;
        });
        let legacy;
        try{await capture('cloud-opposite-legacy-order');legacy=await backdrop();}
        finally{await page.evaluate(orders=>{for(const {uuid,production}of orders)pilotReview.scene.getObjectByProperty('uuid',uuid).renderOrder=production;},orders);}
        const unchanged=await page.evaluate(()=>{
          const state=spatialWeatherDiagnosticState,changed=[];
          for(const p of state.objects)for(const key of ['position','quaternion','scale'])if(!p[key].every((v,i)=>v===p.object[key].toArray()[i]))changed.push(p.object.name+':'+key);
          for(const p of state.objects)if(p.object.visible!==p.visible)changed.push(p.object.name+':visible');
          for(const p of state.buffers){const bytes=new Uint8Array(p.buffer.buffer,p.buffer.byteOffset,p.buffer.byteLength);if(bytes.length!==p.bytes.length||!bytes.every((v,i)=>v===p.bytes[i]))changed.push(p.name+':buffer');}
          for(const[m,p]of state.materials)for(const key of ['opacity','depthTest','depthWrite'])if(m[key]!==p[key])changed.push(m.uuid+':'+key);
          window.spatialWeatherDiagnosticState=null;return {changed,objectCount:state.objects.length,bufferCount:state.buffers.length,materialCount:state.materials.size};
        });assert.deepEqual(unchanged.changed,[],'Legacy-order diagnostic restores every actual transform, buffer and material flag');
        assert.deepEqual(production.samples.map(p=>p.ndc),legacy.samples.map(p=>p.ndc),'Same cloud pixels are sampled over geometrically farther water');
        const differences=production.samples.map((p,i)=>({ndc:p.ndc,production:p.rgba,legacy:legacy.samples[i].rgba,maxRgbDelta:Math.max(...p.rgba.slice(0,3).map((v,n)=>Math.abs(v-legacy.samples[i].rgba[n])))}));
        assert(production.samples.length>0,'Actual cloud review contains cloud centres in front of geometrically farther ocean');
        const lastFrame=Math.max(...production.drawOrder.map(o=>o.frame)),draws=production.drawOrder.filter(o=>o.frame===lastFrame),firstCloud=draws.findIndex(o=>o.kind==='cloud'),waterIndices=draws.map((o,i)=>o.kind==='water'?i:-1).filter(i=>i>=0);
        assert(firstCloud>=0&&waterIndices.length>0&&Math.max(...waterIndices)<firstCloud,'Actual native receiver draws finish before translucent cloud draws');
        result.waterBackdrop={scope:'QA-only same paused opposite camera; only receiver backdrop Group render orders temporarily restored to legacy zero. Legacy PNG is diagnostic, not a final deliverable.',orders,production,legacy,unchanged,differences};
        pass('Paired native cloud-over-water diagnostic logs actual draw order and restores all production transforms, buffers, materials and render orders');
      }
      await page.evaluate(()=>{window.reviewCameraOverride=null;});await inspect('cloud-shade');
      // Tier/shelter shader and uploaded-uniform checks are finalized against
      // the production interfaces only after the root explicitly freezes them.
      pass('Opposite native review views render fixed cloud geometry with actual world Sun and shared relief maps');
    }
    if(enabled('optics')){
      result.opticalViews=[];
      for(const[name,state]of [['liquid','liquid'],['droplet','droplet'],['rain','rainLow']]){
        if(!opticalForms.includes(name))continue;
        await restore(state);const camera=await page.evaluate(()=>{const s=pilotReview.scene;s.updateMatrixWorld(true);const target=s.getObjectByName('pilot-water-parcel').getWorldPosition(new THREE.Vector3()),view=new THREE.PerspectiveCamera(42,pilotReview.camera.aspect,.1,3000);view.position.copy(target).add(new THREE.Vector3(8,5,12));view.lookAt(target);view.updateMatrixWorld(true);window.reviewCameraOverride=view;return {scope:'Fixture-only optical review camera around unchanged actual parcel geometry/materials and genuine kernel checkpoint.',position:view.position.toArray(),target:target.toArray()};});
        await capture(name+'-optics-follow');result.opticalViews.push({name,camera,...await opticalSample()});await inspect(name+'-optics-follow');
      }
      await page.evaluate(()=>{window.reviewCameraOverride=null;});pass('Actual liquid, droplet and rain parcel optical materials render at genuine paused checkpoints');
    }
    if(enabled('rain')){
      await restore('rainLow');await capture('rain-core-glints-ocean');result.rain=await rainSample();const paused=await rainSample();await page.waitForTimeout(180);assert.deepEqual((await rainSample()).objects,paused.objects,'Rain material uniforms and geometry freeze exactly at pause');await inspect('rain-core-glints-ocean');
      await page.setViewportSize({width:320,height:940});await restore('rainLow');await capture('rain-core-phone-320');await inspect('rain-core-phone-320');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1280,height:1000});pass('Actual rain core/glint view remains finite, paused and readable at desktop and320px');
    }
    if(enabled('rain-advection')){
      // A restored fixture creates a fresh gated renderer. Compile its actual
      // receiving-water program before reading the shared production clock.
      const warm=async()=>{const before=await page.evaluate(()=>{window.reviewRenderActive=true;return window.reviewRenderCount||0;});await page.waitForFunction(before=>window.reviewRenderCount>before,before);await page.evaluate(()=>{window.reviewRenderActive=false;});};
      const sample=()=>page.evaluate(()=>{
        const s=pilotReview.scene;s.updateMatrixWorld(true);
        const field=s.getObjectByName('pilot-rain-field'),ribbons=s.getObjectByName('pilot-rain-ribbons'),impacts=s.getObjectByName('pilot-rain-water-impacts'),ocean=s.getObjectByName('pilot-ocean-surface');
        return {time:ocean.userData.surfaceShader.uniforms.pilotRippleTime.value,steps:rainCloudDepthTotalSteps,
          advection:{...field.userData.advection},sameAdvection:field.userData.advection===ribbons.userData.advection,
          sameProfiles:field.userData.dropProfile===ribbons.userData.dropProfile,profiles:Array.from(field.userData.dropProfile),
          field:{position:field.position.toArray(),geometry:field.geometry.uuid,points:Array.from(field.geometry.attributes.position.array),alpha:Array.from(field.geometry.attributes.rainAlpha.array)},
          ribbons:{geometry:ribbons.geometry.uuid,points:Array.from(ribbons.geometry.attributes.position.array)},
          impacts:{position:impacts.position.toArray(),geometry:impacts.geometry.uuid,points:Array.from(impacts.geometry.attributes.position.array),alpha:Array.from(impacts.geometry.attributes.rainAlpha.array)}};
      });
      const validate=snapshot=>{
        assert.equal(snapshot.advection.model,'shared-wind-size-dependent-slant');assert.equal(snapshot.advection.referenceFallSpeed,55);assert(snapshot.sameAdvection&&snapshot.sameProfiles);assert.equal(snapshot.profiles.length,84*4);
        let maxSlopeError=0,maxTrajectoryError=0,valid=0;const slopes=[];
        for(let rf=0;rf<84;rf++){
          const p=snapshot.field.points,offset=rf*12,dy=p[offset+1]-p[offset+10];
          if(snapshot.field.alpha[rf*4]===0||dy<.001)continue;
          const expected=snapshot.advection.horizontalSpeed/snapshot.profiles[rf*4],measured=(p[offset+9]-p[offset])/dy;
          maxSlopeError=Math.max(maxSlopeError,Math.abs(expected-measured));slopes.push({rf,fallSpeed:snapshot.profiles[rf*4],slope:measured});valid++;
          for(let vertex=0;vertex<4;vertex++){
            const i=offset+vertex*3,phase=60-p[i+1],expectedX=-48+((rf*37)%97)+expected*phase;
            maxTrajectoryError=Math.max(maxTrajectoryError,Math.abs(p[i]-expectedX));
          }
        }
        assert(valid>20&&maxSlopeError<.00002&&maxTrajectoryError<.00003,JSON.stringify({valid,maxSlopeError,maxTrajectoryError}));
        return {valid,maxSlopeError,maxTrajectoryError,slopes};
      };
      await page.emulateMedia({reducedMotion:'no-preference'});await restore('rain',{pauseAtChanges:false});await warm();
      const first=await sample(),firstProof=validate(first);await page.waitForTimeout(150);const paused=await sample();assert.deepEqual(paused,first,'Paused rain clock, buffers, profiles and metadata remain exact');
      await page.getByRole('button',{name:'Look',exact:true}).click();await page.getByRole('button',{name:'Look left',exact:true}).click();await settle();
      const looked=await sample();assert.deepEqual(looked.field,first.field,'Paused Look keeps the exact same world rain centerlines');assert.deepEqual(looked.impacts,first.impacts,'Paused Look keeps solved contacts fixed');assert.equal(looked.time,first.time);assert.notDeepEqual(looked.ribbons.points,first.ribbons.points,'Ribbon widths face the changed camera');
      await page.getByRole('button',{name:'Look',exact:true}).click();await resume();await page.waitForFunction(()=>rainCloudDepthTotalSteps>3);await pause();
      const moving=await sample(),movingProof=validate(moving);assert(moving.time>first.time);
      let compared=0,maxWindSpeedError=0;
      for(let rf=0;rf<84;rf++){
        const offset=rf*12,p=first.field.points,q=moving.field.points,fall=first.profiles[rf*4],dt=moving.time-first.time;
        if(first.field.alpha[rf*4]===0||moving.field.alpha[rf*4]===0||Math.abs((p[offset+1]-p[offset+10])-first.profiles[rf*4+1])>.0001||Math.abs((q[offset+1]-q[offset+10])-first.profiles[rf*4+1])>.0001)continue;
        if(Math.abs((p[offset+10]-q[offset+10])-fall*dt)>.0001)continue; // Exclude deterministic wrap frames.
        maxWindSpeedError=Math.max(maxWindSpeedError,Math.abs((q[offset+9]-p[offset+9])/dt-first.advection.horizontalSpeed));compared++;
      }
      assert(compared>20&&maxWindSpeedError<.0002,JSON.stringify({compared,maxWindSpeedError}));
      await page.emulateMedia({reducedMotion:'reduce'});await restore('rain',{pauseAtChanges:false});await warm();const reduced=await sample();await resume();await page.waitForFunction(()=>rainCloudDepthTotalSteps>3);await pause();const reducedLater=await sample();assert(reducedLater.steps>reduced.steps);assert.equal(reducedLater.time,reduced.time);assert.deepEqual(reducedLater.field.points,reduced.field.points,'Reduced motion retains static local rain trajectories while genuine model steps advance');
      await restore('rainLow',{cameraMode:'water'});await capture('rain-size-slants-water');await inspect('rain-size-slants-water');
      const contacts=await page.evaluate(()=>{
        const s=pilotReview.scene;s.updateMatrixWorld(true);const pool=s.getObjectByName('pilot-rain-water-impacts'),p=pool.geometry.attributes.position,a=pool.geometry.attributes.rainAlpha;
        const receivers=['pilot-ocean-surface','pilot-lake-water','pilot-stream-water'].map(n=>s.getObjectByName(n)).filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});
        const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),v=new THREE.Vector3(),start=new THREE.Vector3(),end=new THREE.Vector3(),gaps=[];
        for(let rf=0;rf<84;rf++)for(let segment=0;segment<14;segment++){
          const index=(rf*29+segment)*2;if(a.getX(index)<=0)continue;
          start.fromBufferAttribute(p,index).applyMatrix4(pool.matrixWorld);end.fromBufferAttribute(p,index+1).applyMatrix4(pool.matrixWorld);
          for(const fraction of [0,.5,1]){v.copy(start).lerp(end,fraction);ray.set(new THREE.Vector3(v.x,500,v.z),down);const hit=ray.intersectObjects(receivers,false)[0];if(!hit)throw Error('Missing actual receiving water under active ripple');gaps.push(v.y-hit.point.y);}
        }
        return {samples:gaps.length,minGap:Math.min(...gaps),maxGap:Math.max(...gaps)};
      });assert(contacts.samples>0&&contacts.minGap>.04&&contacts.maxGap<.12,JSON.stringify(contacts));
      result.rainAdvection={first,firstProof,paused,looked,moving,movingProof,compared,maxWindSpeedError,reduced,reducedLater,contacts};
      pass('Actual pooled rain shares wind speed with size-dependent slopes, fixed paused Look contacts, static reduced-motion trajectories and ray-verified receiving-water ripples');
    }
    if(enabled('phase')){
      await page.emulateMedia({reducedMotion:'no-preference'});result.phaseViews=[];
      for(const name of phaseRoutes)for(const cameraMode of ['follow','water']){
        const before=await trigger(name,{cameraMode}),first=await phaseDetail();await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await resume();await page.waitForFunction(()=>Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress)>=.48);await pause();const midpoint=await phaseDetail();await page.waitForTimeout(180);const frozen=await phaseDetail();
        assert.deepEqual(frozen.objects,midpoint.objects,'Paused outgoing/incoming fronts and pooled transforms stay exact');
        if(cameraMode==='water'||name==='snowRelease'||captures?.includes(name+'-'+cameraMode+'-midpoint'))await capture(name+'-'+cameraMode+'-midpoint');await inspect(name+'-'+cameraMode+'-midpoint');const optical=suite==='relief-optics'?await opticalSample():null;let modeSwitch=null,expired=null;if(cameraMode==='water'){await page.getByRole('button',{name:'Follow view',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotCamera==='follow');await settle();const follow=await phaseDetail();assert.deepEqual(follow.materialDepth,before.materialDepth,'Water to Follow restores exact original scene material depth flags');await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.pilotCamera==='water');await settle();const waterAgain=await phaseDetail();modeSwitch={follow,waterAgain};await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='hidden');await pause();expired=await phaseDetail();assert.deepEqual(expired.materialDepth,before.materialDepth,'Phase expiry restores exact original material depth flags');}result.phaseViews.push({name,cameraMode,before,first,midpoint,frozen,optical,modeSwitch,expired,nativeDrawOrder:suite==='spatial-weather'?await page.evaluate(()=>spatialWeatherDrawOrder.slice()):null});
      }
      pass('Actual new phase routes produce their original kernel receipts and fixed paused outgoing/incoming illustrations');
      if(suite==='spatial-weather')for(const p of result.phaseViews.filter(p=>p.name==='rainRelease'&&p.cameraMode==='follow')){
        const lastFrame=Math.max(...p.nativeDrawOrder.map(o=>o.frame)),draws=p.nativeDrawOrder.filter(o=>o.frame===lastFrame),source=draws.map((o,i)=>o.kind==='cloud'&&o.parent==='pilot-phase-cloud-memory'?i:-1).filter(i=>i>=0),water=draws.map((o,i)=>o.kind==='water'?i:-1).filter(i=>i>=0);
        assert(source.length>0&&water.length>0&&Math.max(...water)<Math.min(...source),'Actual source-cloud memory draws after receivers during genuine cloud-to-rain Follow handoff');
      }
    }
    if(enabled('consecutive')){result.consecutive=[];await page.emulateMedia({reducedMotion:'no-preference'});for(const cameraMode of ['follow','water']){await trigger('mountainMelting',{cameraMode});const before=await phaseDetail();await page.evaluate(()=>{window.rainCloudDepthDriveInput={...rainCloudDepthTransitions.mountainReevaporation.input};window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor'&&waterReviewData.pilot.paused);await settle();const after=await phaseDetail(),memory=after.objects.find(o=>o.name==='pilot-phase-liquid-memory'),prior=before.objects.find(o=>o.name==='pilot-phase-incoming-droplet').materials[0].userData.meltingFront,carry=memory.userData.carriedMeltingFront;assert.equal(carry.active.value,1);assert.equal(carry.progress.value,prior.progress.value,'Interrupted incoming liquid mask remains exactly on outgoing evaporation memory');const mapping=cameraMode==='water'?before.bindings.melting.previewLocalToSource:before.bindings.melting.actualLocalToSource;assert(maxDelta(carry.localToSource.value.elements,mapping)<1e-8,'Interrupted liquid mask keeps the actual previously visible source mapping');if(cameraMode==='water')await capture('mountain-consecutive-water');result.consecutive.push({kind:'melting-to-evaporation',cameraMode,before,after});}
      for(const cameraMode of ['follow','water']){await trigger('recrossFreezing',{cameraMode});const before=await phaseDetail();await page.evaluate(()=>{window.rainCloudDepthDriveInput={...rainCloudDepthTransitions.recrossMelting.input};window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};});await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='droplet'&&waterReviewData.pilot.paused);await settle();const after=await phaseDetail(),carry=after.objects.find(o=>o.name==='pilot-phase-ice-memory').userData.carriedFreezingFront,prior=before.objects.find(o=>o.name==='pilot-phase-incoming-ice').materials[0].userData.phaseReveal;assert.equal(carry.active.value,1);assert.equal(carry.progress.value,prior.progress.value,'Rapid actual freezing-boundary recross retains the visible partial solid front');result.consecutive.push({kind:'freezing-to-melting',cameraMode,before,after});}pass('Genuine Mountainwinter and low-velocity freezing-boundary recrosses preserve interrupted liquid and solid masks in both camera views');}
    if(enabled('lifecycle')){
      await page.setViewportSize({width:320,height:940});await trigger('condensation',{cameraMode:'water'});await resume();await page.waitForTimeout(350);await pause();result.phonePhase=await phaseDetail();await capture('condensation-water-phone-320');await inspect('condensation-water-phone-320');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1280,height:1000});
      await page.emulateMedia({reducedMotion:'reduce'});await restore('before-melting',{cameraMode:'water',pauseAtChanges:false});await page.evaluate(()=>{window.rainCloudDepthSteadyInput={dropletHit:false,nucleusHit:false};window.rainCloudDepthDriveInput={...rainCloudDepthTransitions.melting.input};});await resume();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.phaseHandoff==='active');const reduced=await phaseDetail();await page.waitForTimeout(250);const later=await phaseDetail();assert(later.steps>reduced.steps);assert.equal(later.data.phaseHandoffProgress,reduced.data.phaseHandoffProgress);await pause();
      await restore('cloud');const restored=await phaseDetail();assert(!restored.visible);await page.getByRole('button',{name:'Reset this run and start again as liquid water',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');const reset=await phaseDetail();assert(!reset.visible);result.lifecycle={reduced,later,restored,reset};pass('New phase routes fit320px, retain static reduced-motion progress while genuine model steps advance, and clear on restore/reset');
    }
    assert.deepEqual(result.errors,[]);pass('No page, WebGL or shader errors');result.success=true;
  } catch (error) { result.success = false; result.harnessError = String(error); console.error(error); process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(reportRoot, earlyClean ? 'qa-summary-early-clean.json' : 'qa-summary.json'), JSON.stringify({ success: result.success, sourceSha256: result.sourceSha256, checks: result.checks, captures: result.captures, transitions: result.transitions.map(({ name, cameraMode }) => ({ name, cameraMode })), errors: result.errors, harnessError: result.harnessError, report: path.relative(root, path.join(out, 'results.json')) }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
    if (suite === 'cloud-evolution') {
      const summaryPath = path.join(reportRoot, earlyClean ? 'qa-summary-early-clean.json' : 'qa-summary.json'), summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      summary.browsersClosed = true;
      summary.numericalEvidence = result.cloudEvolution?.evidence;
      summary.captureFiles = result.captures.map(name => ({ name, path: path.relative(root, path.join(out, name + '.png')), sourceSha256: result.sourceSha256 }));
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
