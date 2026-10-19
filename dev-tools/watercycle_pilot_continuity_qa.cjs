'use strict';
// Actual WebGL acceptance review for the continuity pass. All transitions and
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
const reportRoot = path.join(root, 'reports/watercycle-pilot-continuity');
const out = path.join(reportRoot, report);
const temp = path.join(root, 'scratch/watercycle-pilot-continuity-temp');
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
  'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.reviewRenderActive!==false){const result=render(scene,window.reviewCameraOverride||camera);window.reviewRenderCount=(window.reviewRenderCount||0)+1;return result;}};');
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
      window.reviewRenderActive = false; window.reviewCameraOverride = null; window.continuityDriveInput = null; window.continuitySteadyInput = null; window.continuityLiveSteps = []; window.continuityTotalSteps = 0;
      const checkpoint = continuityStates[name];
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges, navigationAssist: false, showMolecules: false, cameraMode, resumeCheckpoint: { ...checkpoint, cameraMode }, resumeToken: 'continuity-' + name + '-' + Date.now() } }, 'light');
    }, { name, cameraMode, pauseAtChanges });
    await page.waitForFunction(({ name, cameraMode }) => { const c = document.querySelector('#wcPilotCanvas'); return window.pilotReview && c && c.dataset.parcelForm === continuityStates[name].form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === continuityStates[name].form; }, { name, cameraMode });
    await settle();
  }
  const handoff = () => page.evaluate(() => {
    const c = document.querySelector('#wcPilotCanvas'), scene = pilotReview.scene, group = scene.getObjectByName('pilot-phase-handoff');
    const geometryIds = new Set(), materialIds = new Set();
    const sample = o => {
      if (o.geometry) geometryIds.add(o.geometry.uuid);
      const materials = (o.material ? Array.isArray(o.material) ? o.material : [o.material] : []).map(m => { materialIds.add(m.uuid); return { uuid: m.uuid, opacity: m.opacity, userData: JSON.parse(JSON.stringify(m.userData)) }; });
      return { name: o.name, visible: o.visible, geometry: o.geometry?.uuid, position: o.position.toArray(), worldPosition: o.getWorldPosition(new THREE.Vector3()).toArray(), scale: o.scale.toArray(), worldScale: o.getWorldScale(new THREE.Vector3()).toArray(), quaternion: o.quaternion.toArray(), materials, userData: JSON.parse(JSON.stringify(o.userData)), count: o.count, instanceMatrix: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null };
    };
    const meshes = []; group.traverse(o => { if (o !== group) meshes.push(sample(o)); });
    const parcel = scene.getObjectByName('pilot-water-parcel');
    // A memory switches between already-pooled liquid and rain geometries;
    // inspect the whole scene pool rather than only currently assigned memory.
    scene.traverse(o => { if (o.geometry) geometryIds.add(o.geometry.uuid); for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) materialIds.add(m.uuid); });
    return { visible: group.visible, cameraMode: c.dataset.pilotCamera, position: group.position.toArray(), data: { active: c.dataset.phaseHandoff, kind: c.dataset.phaseHandoffKind, from: c.dataset.phaseHandoffFrom, to: c.dataset.phaseHandoffTo, progress: c.dataset.phaseHandoffProgress, front: c.dataset.phaseFront }, userData: JSON.parse(JSON.stringify(group.userData)), geometryIds: [...geometryIds].sort(), materialIds: [...materialIds].sort(), meshes, parcel: { position: parcel.position.toArray(), worldPosition: parcel.getWorldPosition(new THREE.Vector3()).toArray(), children: parcel.children.map(sample) } };
  });
  const rainSample = () => page.evaluate(() => {
    const s = pilotReview.scene, field = s.getObjectByName('pilot-rain-field'), groups = [];
    s.traverse(o => { if (/^pilot-rain-water-|^pilot-rain-field/.test(o.name)) groups.push({ name: o.name, visible: o.visible, position: o.position.toArray(), userData: JSON.parse(JSON.stringify(o.userData)), geometry: o.geometry?.uuid, opacity: o.material?.opacity, uniforms: o.material?.uniforms ? Object.fromEntries(Object.entries(o.material.uniforms).filter(([,v]) => typeof v.value === 'number').map(([k,v]) => [k,v.value])) : null, attributes: o.geometry ? Object.fromEntries(Object.entries(o.geometry.attributes).map(([key,a]) => [key, Array.from(a.array)])) : null }); });
    return { cameraMode: document.querySelector('#wcPilotCanvas').dataset.pilotCamera, dataset: { ...document.querySelector('#wcPilotCanvas').dataset }, fieldData: JSON.parse(JSON.stringify(field.userData)), groups };
  });
  const shadowSample = () => page.evaluate(() => {
    pilotReview.scene.updateMatrixWorld(true);
    const shadow = pilotReview.scene.getObjectByName('pilot-cloud-shadow'), receivers = [];
    pilotReview.scene.traverse(o => { for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) if (m.userData.cloudShadow) {
      const refs = m.userData.cloudShadow, position = o.geometry?.attributes.position, index = o.geometry?.index, candidates = [0, Math.floor((position?.count || 1) / 2), (position?.count || 1) - 1];
      const samples = candidates.map(n => {
        const point = new THREE.Vector3().fromBufferAttribute(position, n).applyMatrix4(o.matrixWorld), source = refs.source.value, sun = refs.sun.value;
        const depth = source.y - point.y, travel = Math.min(Math.max(0, depth) / Math.max(.18, sun.y), 560), centre = [source.x - sun.x * travel, source.z - sun.z * travel];
        return { actualReceiverVertex: point.toArray(), depth, travel, projectedCentre: centre };
      });
      const shader = o.userData.surfaceShader;
      const properties = pilotReview.renderer.properties.get(m), program = properties.currentProgram || properties.program, gl = pilotReview.renderer.getContext();
      const compiledFragment = program?.fragmentShader ? gl.getShaderSource(program.fragmentShader) : shader?.fragmentShader;
      receivers.push({ objectName: o.name, receiver: m.userData.cloudShadowReceiver, materialType: m.type, visible: o.visible, data: JSON.parse(JSON.stringify(refs)), sharedSource: refs.source.value === shadow.userData.sourcePosition, sharedSun: refs.sun.value === shadow.userData.sunDirection, sharedFootprint: refs.footprint.value === shadow.userData.footprint, sharedOpacity: refs.opacity === shadow.userData.opacity, shadowCompile: String(m.onBeforeCompile), cacheKey: m.customProgramCacheKey(), samples, compiledProjection: compiledFragment ? compiledFragment.includes('cloudProjectedCentre') : null, compiledShadow: shader ? { fragment: shader.fragmentShader.includes('cloudProjectedCentre'), source: shader.uniforms.pilotCloudShadowSource === refs.source, sun: shader.uniforms.pilotCloudShadowSun === refs.sun, opacity: shader.uniforms.pilotCloudShadowOpacity === refs.opacity } : null });
    } });
    return { exists: !!shadow, type: shadow?.type, visible: shadow?.visible, userData: shadow && JSON.parse(JSON.stringify(shadow.userData)), receivers };
  });
  const tailSurfaceSample = () => page.evaluate(() => {
    // Native renderer updates this before every product draw. The isolated
    // fixture gates redundant GPU draws, so refresh matrices before raycasts.
    pilotReview.scene.updateMatrixWorld(true);
    const impacts = pilotReview.scene.getObjectByName('pilot-rain-water-impacts'), position = impacts.geometry.attributes.position, alpha = impacts.geometry.attributes.rainAlpha, receivers = [];
    pilotReview.scene.traverse(o => { if (o.material?.userData.cloudShadow && /^(terrain-0|pilot-ocean)/.test(o.material.userData.cloudShadowReceiver)) receivers.push(o); });
    const ray = new THREE.Raycaster(), samples = [];
    for (let n = 0; n < alpha.count && samples.length < 24; n++) {
      if (alpha.getX(n) <= 0 || n % (impacts.userData.segmentsPerStreak * 2) >= impacts.userData.rippleSegments * 2) continue;
      const p = new THREE.Vector3().fromBufferAttribute(position, n).applyMatrix4(impacts.matrixWorld);
      ray.set(new THREE.Vector3(p.x, 500, p.z), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObjects(receivers, false)[0];
      if (hit) samples.push({ position: p.toArray(), actualSurfaceY: hit.point.y, clearance: p.y - hit.point.y });
    }
    return { samples, receiverCount: receivers.length };
  });
  async function inspect(name) {
    const info = await page.evaluate(() => {
      let finite = true; const named = {};
      pilotReview.scene.traverse(o => {
        if (/^pilot-/.test(o.name)) named[o.name] = { visible: o.visible, type: o.type, children: o.children.length, userData: JSON.parse(JSON.stringify(o.userData)) };
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
    await page.evaluate(name => { window.continuityDriveInput = { ...continuityTransitions[name].input }; }, name); await resume();
    await page.waitForFunction(name => { const c = document.querySelector('#wcPilotCanvas'); return c.dataset.parcelForm === continuityTransitions[name].after.form && waterReviewData.pilot.paused; }, name);
    await settle();
    const receipt = await page.evaluate(name => ({ name, expectedFrom: continuityTransitions[name].before.form, expectedTo: continuityTransitions[name].after.form, actual: continuityLiveSteps, receipt: waterReviewData.pilot.lastChange }), name);
    assert(receipt.actual.some(step => step.from === receipt.expectedFrom && step.to === receipt.expectedTo), 'Real kernel performs the scene transition');
    assert(receipt.receipt?.from === receipt.expectedFrom && receipt.receipt?.to === receipt.expectedTo, 'Scene retains genuine form-change receipt');
    (result.receipts ||= []).push(receipt); return before;
  }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForFunction(() => window.pilotReview && window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c => { const gl = c.getContext('webgl2') || c.getContext('webgl'); return !!gl && !gl.isContextLost(); }));
    await page.evaluate(() => {
      window.reviewRenderActive = false;
      const k = WaterCyclePilotKernel, original = k.step, states = {}, transitions = {};
      const advance = (start, input, limit, desired) => { let s = start; for (let n = 0; n < limit; n++) { const next = original(s, input); if (next.form !== s.form && next.form === desired) return { before: s, after: next, input }; s = next; } throw Error('Production kernel did not reach ' + desired); };
      states.surface = k.practiceState('surface', 'tropicalOcean'); states.vapor = k.practiceState('cloud', 'tropicalOcean');
      transitions.evaporation = advance(states.surface, { dt: .12, sunlit: true, surface: 'water' }, 10000, 'vapor');
      states.droplet = advance(states.vapor, { dt: .12, nucleusHit: true }, 100, 'droplet').after;
      transitions.cloud = advance(states.droplet, { dt: .12, dropletHit: true }, 100, 'cloud'); states.cloud = transitions.cloud.after;
      transitions.rain = advance(states.cloud, { dt: .12, dropletHit: true }, 100, 'rain'); states.rain = transitions.rain.after;
      { let s = states.rain; for (let n = 0; n < 10000 && s.altitudeM > 28; n++) s = original(s, { dt: .12, surface: 'water' }); if (s.form !== 'rain' || s.altitudeM <= 0) throw Error('Real falling rain did not reach low ocean checkpoint'); states.rainLow = s; }
      transitions.landing = advance(states.rainLow, { dt: .12, surface: 'water' }, 1000, 'liquid'); states.landed = transitions.landing.after;
      const plantLanding = advance(states.rainLow, { dt: .12, surface: 'plant' }, 1000, 'plant').after;
      states.transpiring = advance(plantLanding, { dt: .12 }, 10000, 'transpiring').after;
      transitions.transpiration = advance(states.transpiring, { dt: .12 }, 1000, 'vapor');
      for (const [name, transition] of Object.entries(transitions)) states['before-' + name] = transition.before;
      window.continuityStates = states; window.continuityTransitions = transitions; window.continuityLiveSteps = []; window.continuityTotalSteps = 0;
      k.step = function (state, input) { window.continuityTotalSteps++; const drive = window.continuityDriveInput; if (drive) window.continuityDriveInput = null; const actualInput = { ...input, ...(window.continuitySteadyInput || {}), ...(drive || {}) }, next = original(state, actualInput); if (drive || next.form !== state.form) continuityLiveSteps.push({ from: state.form, to: next.form, elapsed: next.elapsed, input: actualInput }); return next; };
    });
    pass('Ocean evaporation, leaf release, rain and water landing fixtures use genuine production kernel transitions');
    // Feature assertions are finalized against the frozen source interfaces.
    if (enabled('evaporation')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const cameraMode of ['follow', 'water']) {
        const before = await trigger('evaporation', { cameraMode }), first = await handoff();
        assert.equal(first.data.kind, 'evaporation'); assert.equal(first.data.from, 'liquid'); assert.equal(first.data.to, 'vapor');
        assert.deepEqual(first.geometryIds, before.geometryIds); assert.deepEqual(first.materialIds, before.materialIds);
        const memory = first.meshes.find(m => m.name === 'pilot-phase-liquid-memory'), outgoing = before.parcel.children.find(m => m.visible && m.geometry === memory.geometry);
        assert(memory.userData.sourceSnapshot && outgoing, 'Evaporation captures the actual outgoing liquid mesh');
        const vector = value => [value.x, value.y, value.z];
        assert(maxDelta(vector(memory.userData.sourceScale), outgoing.worldScale) < 1e-10, 'Outgoing liquid pulse is captured without a nominal-scale snap');
        assert(maxDelta(vector(memory.userData.sourcePosition), outgoing.worldPosition) < 1e-7, 'Source position comes from actual outgoing liquid');
        assert.equal(memory.userData.placement, cameraMode === 'water' ? 'bounded-water-lens' : 'captured-world-source');
        await capture('evaporation-' + cameraMode + '-first');
        await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .56); await pause();
        const midpoint = await handoff(); await page.waitForTimeout(220); assertPaused(await handoff(), midpoint, 'Evaporation midpoint freezes while paused');
        const laterMemory = midpoint.meshes.find(m => m.name === 'pilot-phase-liquid-memory');
        assert.deepEqual(laterMemory.userData.sourcePosition, memory.userData.sourcePosition, 'Captured source remains fixed while the vapor parcel advances');
        assert(maxDelta(midpoint.parcel.worldPosition, first.parcel.worldPosition) > .001, 'Actual vapor parcel moves independently of source memory');
        if (cameraMode === 'follow') assert(maxDelta(laterMemory.worldPosition, vector(memory.userData.sourcePosition)) < 1e-7, 'Follow evaporation memory stays at the receiving surface');
        await capture('evaporation-' + cameraMode + '-midpoint'); await inspect('evaporation-' + cameraMode + '-midpoint');
        result.transitions.push({ name: 'evaporation', cameraMode, before, first, midpoint });
      }
      await trigger('transpiration'); const leaf = await handoff(); assert.equal(leaf.data.kind, 'evaporation'); assert.equal(leaf.data.from, 'transpiring');
      const leafMemory = leaf.meshes.find(m => m.name === 'pilot-phase-liquid-memory'); assert(leafMemory.userData.sourceSnapshot); assert.equal(leafMemory.userData.placement, 'captured-world-source');
      result.transitions.push({ name: 'transpiration', first: leaf });
      pass('Ocean and leaf evaporation use the real phase handoff and retain pooled resources');
    }
    if (enabled('rain')) {
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await trigger('rain', { cameraMode: 'water' });
      const first = await rainSample(); await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .56); await pause(); const midpoint = await rainSample();
      assert(first.fieldData.onsetFactor > 0 && first.fieldData.onsetFactor < midpoint.fieldData.onsetFactor && midpoint.fieldData.onsetFactor < 1, 'Shower intensity eases from actual cloud release');
      await page.waitForTimeout(180); const pausedOnset = await rainSample(); assert.equal(pausedOnset.fieldData.onsetFactor, midpoint.fieldData.onsetFactor); assert.deepEqual(pausedOnset.groups, midpoint.groups, 'Paused onset neither advances nor compounds opacity');
      await capture('rain-release-water-midpoint'); result.rainOnset = { first, midpoint }; await inspect('rain-release-water-midpoint');
      await restore('rainLow'); const low = await rainSample(); await page.waitForTimeout(180); assert.deepEqual(await rainSample(), low, 'Paused receiving-water contact geometry is stable');
      assert(Number(low.dataset.rainWaterImpactCount) > 0, 'Real low rain has receiving-water contacts'); await capture('rain-low-ocean');
      await trigger('landing'); const tail = await rainSample(), impact = tail.groups.find(g => g.name === 'pilot-rain-water-impacts'), field = tail.groups.find(g => g.name === 'pilot-rain-field');
      assert.equal(tail.dataset.parcelForm, 'liquid'); assert(!field.visible, 'Airborne rain stops at actual water landing'); assert(impact.visible && impact.userData.tailActive && impact.userData.tailImpactCount > 0, 'Solved water contact rings linger briefly');
      const alpha = impact.attributes.rainAlpha, segments = impact.userData.segmentsPerStreak, ripple = impact.userData.rippleSegments;
      for (let n = 0; n < alpha.length; n++) if (n % (segments * 2) >= ripple * 2) assert.equal(alpha[n], 0, 'Contact tail retains no new crown or rebound');
      await page.waitForTimeout(180); assert.deepEqual((await rainSample()).groups, tail.groups, 'Contact tail freezes exactly while paused');
      const surfaceFirst = await tailSurfaceSample(); await capture('rain-water-contact-tail');
      await resume(); await page.waitForFunction(() => pilotReview.scene.getObjectByName('pilot-rain-water-impacts').userData.tailElapsed > .15); await pause();
      const later = await rainSample(), laterImpact = later.groups.find(g => g.name === 'pilot-rain-water-impacts'), surfaceLater = await tailSurfaceSample();
      assert.deepEqual(laterImpact.position, impact.position, 'Residual rings retain fixed world anchor'); assert.deepEqual(laterImpact.userData.tailAnchor, impact.userData.tailAnchor); assert(laterImpact.opacity < impact.opacity, 'Contact rings fade over model elapsed time');
      assert.deepEqual(laterImpact.attributes.rainAlpha, impact.attributes.rainAlpha, 'No new contact is spawned during the tail');
      assert(laterImpact.userData.tailSurfaceUpdates > impact.userData.tailSurfaceUpdates, 'Retained contact vertices refresh as actual receiving water moves');
      result.rainContacts = { low, tail, later, surfaceFirst, surfaceLater };
      for (const surface of [surfaceFirst, surfaceLater]) {
        assert(surface.receiverCount === 1 && surface.samples.length > 0, 'Actual ocean triangles can be sampled beneath the retained rings');
        for (const sample of surface.samples) assert(Math.abs(sample.clearance - .075) < .0002, 'Retained rings follow the actual waved water height at the existing contact lift; clearance=' + sample.clearance);
      }
      await resume(); await page.waitForFunction(() => !pilotReview.scene.getObjectByName('pilot-rain-water-impacts').userData.tailActive); await pause(); assert(!(await rainSample()).groups.find(g => g.name === 'pilot-rain-water-impacts').visible, 'Tail expires cleanly');
      pass('Shower onset interpolates without opacity accumulation; actual landing leaves fixed-world ring-only contacts that pause, fade and expire');
    }
    if (enabled('shadow')) {
      await restore('cloud'); await capture('cloud-shadow-follow');
      result.shadow = await shadowSample();
      assert(result.shadow.exists, 'Named cloud shadow controller exists'); assert.equal(result.shadow.type, 'Group', 'Cloud shadow adds no floating overlay draw'); assert.equal(result.shadow.userData.model, 'sun-projected-receiver-shader'); assert.equal(result.shadow.receivers.length, 12, 'All actual water and land receiver materials use projected shadow');
      for (const receiver of result.shadow.receivers) {
        assert(receiver.sharedSource && receiver.sharedSun && receiver.sharedFootprint && receiver.sharedOpacity, 'Receiver shares actual cloud/light uniform references'); assert(receiver.cacheKey.includes('receiving-cloud-shadow-v1'));
        if (receiver.shadowCompile.includes('vPilotCloudShadowWorld')) assert(receiver.shadowCompile.indexOf('cloudProjectedCentre') < receiver.shadowCompile.lastIndexOf('#include <tonemapping_fragment>'), 'Receiver computes projected shadow before tone mapping');
        if (receiver.compiledProjection !== null) assert(receiver.compiledProjection, 'Actual linked receiver shader includes sun projection through its material wrapper chain');
        for (const sample of receiver.samples) assert(sample.travel >= 0 && sample.travel <= 560 && sample.projectedCentre.every(Number.isFinite), 'Projection uses the actual deformed receiver vertex elevation');
        if (receiver.compiledShadow) assert(receiver.compiledShadow.fragment && receiver.compiledShadow.source && receiver.compiledShadow.sun && receiver.compiledShadow.opacity, 'Actual compiled water shader retains shared shadow uniforms');
      }
      assert(result.shadow.receivers.some(r => r.compiledProjection || r.compiledShadow), 'A real native draw compiled receiver shadow shaders');
      await trigger('rain'); const releaseFirst = await shadowSample(); await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .56); await pause(); const releaseMidpoint = await shadowSample();
      assert.equal(releaseFirst.userData.sourceForm, 'cloud-memory'); assert.deepEqual(releaseMidpoint.userData.sourcePosition, releaseFirst.userData.sourcePosition, 'Departed cloud shadow retains captured actual source'); assert(releaseMidpoint.userData.opacity.value < releaseFirst.userData.opacity.value, 'Source cloud shadow fades through rain release');
      result.shadowRelease = { first: releaseFirst, midpoint: releaseMidpoint };
      await inspect('cloud-shadow-follow'); pass('All 12 actual receiver shaders project away from the real Sun using receiver elevations, then preserve and fade the actual departed cloud source');
    }
    if (sections?.includes('shadowdetail')) {
      await restore('cloud');
      result.shadowDetailCamera = await page.evaluate(() => {
        pilotReview.scene.updateMatrixWorld(true);
        const controller = pilotReview.scene.getObjectByName('pilot-cloud-shadow'), source = controller.userData.sourcePosition.clone(), sun = controller.userData.sunDirection.clone(), ocean = pilotReview.scene.getObjectByName('pilot-ocean-surface');
        const ray = new THREE.Raycaster(), centre = new THREE.Vector3(source.x, 0, source.z);
        // Iterating against real triangle intersections accounts for the small
        // difference between the receiving wave's Y and sea-level projection.
        for (let n = 0; n < 3; n++) { const travel = Math.min(Math.max(0, source.y - centre.y) / Math.max(.18, sun.y), 560); centre.x = source.x - sun.x * travel; centre.z = source.z - sun.z * travel; ray.set(new THREE.Vector3(centre.x, 500, centre.z), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObject(ocean, false)[0]; if (hit) centre.y = hit.point.y; }
        const target = source.clone().add(centre).multiplyScalar(.5), side = new THREE.Vector3(sun.z, 0, -sun.x).normalize();
        const camera = new THREE.PerspectiveCamera(52, pilotReview.camera.aspect, .1, 3000);
        camera.position.copy(target).addScaledVector(side, 245).add(new THREE.Vector3(0, 280, 0)); camera.lookAt(target); camera.updateMatrixWorld(true); window.reviewCameraOverride = camera;
        return { scope: 'Fixture-only review camera. Actual production geometry, materials, uniforms and kernel checkpoint are unchanged.', source: source.toArray(), projectedOceanCentre: centre.toArray(), camera: camera.position.toArray(), target: target.toArray(), shadow: JSON.parse(JSON.stringify(controller.userData)) };
      });
      await capture('cloud-shadow-receivers'); await inspect('cloud-shadow-receivers');
      await page.evaluate(() => { window.reviewCameraOverride = null; });
      pass('Dedicated fixture-only camera shows actual cloud source and sun-projected receiving-shore footprint');
    }
    if (enabled('lifecycle')) {
      await page.setViewportSize({ width: 320, height: 940 });
      for (const name of ['cloud', 'rain']) { await restore(name, { cameraMode: name === 'cloud' ? 'water' : 'follow' }); await capture(name + '-phone-320'); await inspect(name + '-phone-320'); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No 320 px page overflow'); }
      await page.setViewportSize({ width: 1280, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' }); await restore('before-evaporation', { pauseAtChanges: false });
      await page.evaluate(() => { window.continuitySteadyInput = { dropletHit: false, nucleusHit: false }; window.continuityDriveInput = { ...continuityTransitions.evaporation.input }; }); await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'active');
      const reduced = await handoff(), steps = await page.evaluate(() => continuityTotalSteps); await page.waitForTimeout(250); const later = await handoff(), laterSteps = await page.evaluate(() => continuityTotalSteps);
      assert.equal(later.data.progress, reduced.data.progress, 'Reduced-motion phase stage stays readable'); assert(laterSteps > steps, 'Real model advances under reduced motion'); await pause();
      const reducedMemory = reduced.meshes.find(m => m.name === 'pilot-phase-liquid-memory'), laterMemory = later.meshes.find(m => m.name === 'pilot-phase-liquid-memory');
      for (const key of ['scale', 'quaternion', 'materials']) assert.deepEqual(laterMemory[key], reducedMemory[key], 'Reduced-motion local evaporation presentation stays static');
      await restore('cloud'); assert.equal((await handoff()).data.active, 'hidden');
      await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid'); assert.equal((await handoff()).data.active, 'hidden');
      result.lifecycle = { reducedSteps: [steps, laterSteps], reducedProgress: reduced.data.progress, reduced, later };
      pass('320 px views, reduced-motion model integration, restore and reset preserve readable continuity');
    }
    assert.deepEqual(result.errors, []); pass('No page, WebGL or shader errors'); result.success = true;
  } catch (error) { result.success = false; result.harnessError = String(error); console.error(error); process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify({ success: result.success, sourceSha256: result.sourceSha256, checks: result.checks, captures: result.captures, transitions: result.transitions.map(({ name, cameraMode }) => ({ name, cameraMode })), errors: result.errors, harnessError: result.harnessError, report: path.relative(root, path.join(out, 'results.json')) }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
