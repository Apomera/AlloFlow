'use strict';
// Isolated actual-WebGL review of cloud assembly, precipitation release and
// receiving-water details. Every form/receipt is produced by the real kernel.
// Collision inputs are made deterministic; production source is never patched.
// Run only after source lock:
// node dev-tools/watercycle_pilot_cloud_rain_qa.cjs --source=reports/watercycle-pilot-cloud-rain/final-source.js
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const arg = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3);
const report = arg('report') || 'final';
const baseline = process.argv.includes('--baseline');
const transitionFilter = arg('transitions') ? arg('transitions').split(',') : null;
const captureFilter = arg('captures') ? arg('captures').split(',') : null;
assert(/^[a-z0-9-]+$/.test(report), 'Plain report folder name');
const reportRoot = path.join(root, 'reports/watercycle-pilot-cloud-rain');
const out = path.join(reportRoot, report);
const temp = path.join(root, 'scratch/watercycle-pilot-cloud-rain-temp');
fs.mkdirSync(temp, { recursive: true }); fs.mkdirSync(out, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp;
const sourcePath = path.resolve(root, arg('source') || 'stem_lab/stem_tool_watercycle.js');
assert(sourcePath.startsWith(root + path.sep), 'Fixture source stays within workspace');
const source = fs.readFileSync(sourcePath, 'utf8');
const cachedBrowsers = path.join(process.env.USERPROFILE || 'C:/Users/cabba', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cachedBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = cachedBrowsers;
const { chromium } = require('playwright');
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_pilot_snow_lab_qa.cjs'), 'utf8').match(/const html = String.raw`([\s\S]*?)`;/)[1];
html = html.replace('renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};',
  'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.reviewRenderActive!==false){const result=render(scene,camera);window.reviewRenderCount=(window.reviewRenderCount||0)+1;return result;}};');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (pathname === '/stem_lab/stem_tool_watercycle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname));
  const allowed = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => pathname.startsWith(prefix))) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream'); res.end(data); });
});
const result = { baseline, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], states: [], transitions: [], errors: [] };
function pass(name) { result.checks.push(name); console.log('PASS ' + name); }
function assertPaused(actual, expected, message) {
  const a = structuredClone(actual), b = structuredClone(expected);
  // Damped Water lens translation may converge by floating roundoff. Every
  // local buffer/matrix/material and progress value remains exact.
  if (a.cameraMode === 'water') {
    const delta = Math.max(...a.position.map((v, i) => Math.abs(v - b.position[i])));
    assert(delta < 1e-7, 'Paused Water handoff translation is visually identical');
    result.maxPauseTranslationRoundoff = Math.max(result.maxPauseTranslationRoundoff || 0, delta);
    a.position = null; b.position = null;
    for (let n = 0; n < a.meshes.length; n++) {
      for (const key of ['position', 'worldPosition', 'quaternion']) {
        const error = Math.max(...a.meshes[n][key].map((v, i) => Math.abs(v - b.meshes[n][key][i])));
        assert(error < (key === 'quaternion' ? 1e-12 : 1e-7), 'Paused Water transform differs only by floating roundoff');
        a.meshes[n][key] = null; b.meshes[n][key] = null;
      }
    }
  }
  assert.deepEqual(a, b, message);
}
function reducedStage(frame) {
  const value = structuredClone(frame);
  value.position = null; value.fog = null;
  for (const mesh of value.meshes) {
    mesh.worldPosition = null;
    // The snapshot's local offset compensates for real parcel travel in
    // Follow view, keeping its source world position fixed.
    if (mesh.name === 'pilot-phase-cloud-memory' && frame.cameraMode === 'follow' && mesh.userData.sourceSnapshot) mesh.position = null;
  }
  for (const target of value.targets) target.worldPosition = null;
  return value;
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
    if (captureFilter && !captureFilter.includes(name)) return;
    await canvas.scrollIntoViewIfNeeded(); await settle();
    const before = await page.evaluate(() => { window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
    await page.waitForFunction(before => window.reviewRenderCount > before, before);
    // Product animation and kernel clocks continue; only redundant GPU draws
    // are gated in this fixture after a real native draw.
    await page.evaluate(() => { window.reviewRenderActive = false; });
    const box = await canvas.boundingBox(); assert(box && box.width >= 250 && box.height >= 180);
    try { await page.screenshot({ path: path.join(out, name + '.png'), clip: box, animations: 'disabled', timeout: 45000 }); }
    catch (error) { result.captureRetries = result.captureRetries || []; result.captureRetries.push({ name, error: String(error) }); await page.screenshot({ path: path.join(out, name + '.png'), clip: box, timeout: 30000 }); }
    result.captures.push(name); console.log('CAPTURE ' + name);
  }
  async function restore(name, { cameraMode = 'follow', pauseAtChanges = true } = {}) {
    await page.evaluate(({ name, cameraMode, pauseAtChanges }) => {
      window.reviewRenderActive = false; window.cloudRainDriveInput = null; window.cloudRainSteadyInput = null; window.cloudRainLiveSteps = []; window.cloudRainTotalSteps = 0;
      const checkpoint = cloudRainStates[name];
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges, navigationAssist: false, showMolecules: false, cameraMode, resumeCheckpoint: { ...checkpoint, cameraMode }, resumeToken: 'cloud-rain-' + name + '-' + Date.now() } }, 'light');
    }, { name, cameraMode, pauseAtChanges });
    await page.waitForFunction(({ name, cameraMode }) => { const c = document.querySelector('#wcPilotCanvas'); return window.pilotReview && c && c.dataset.parcelForm === cloudRainStates[name].form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === cloudRainStates[name].form; }, { name, cameraMode });
    await settle();
  }
  async function inspect(name) {
    const info = await page.evaluate(() => {
      const p = pilotReview, named = {}; let finite = true;
      p.scene.traverse(o => {
        if (o.name && /^pilot-/.test(o.name)) named[o.name] = { visible: o.visible, type: o.type, count: o.count, children: o.children.length, userData: JSON.parse(JSON.stringify(o.userData)) };
        finite = finite && [...o.position.toArray(), ...o.scale.toArray(), ...o.quaternion.toArray()].every(Number.isFinite);
        if (o.instanceMatrix) finite = finite && Array.from(o.instanceMatrix.array).every(Number.isFinite);
        if (o.geometry) for (const a of Object.values(o.geometry.attributes || {})) finite = finite && Array.from(a.array).every(Number.isFinite);
        for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {
          if (m.opacity !== undefined) finite = finite && Number.isFinite(m.opacity);
          for (const key of ['phaseFront', 'phaseReveal']) for (const ref of Object.values(m.userData[key] || {})) if (ref && typeof ref.value === 'number') finite = finite && Number.isFinite(ref.value);
        }
      });
      const c = document.querySelector('#wcPilotCanvas'), box = c.getBoundingClientRect(), parcel = p.scene.getObjectByName('pilot-water-parcel');
      const projected = parcel.getWorldPosition(new THREE.Vector3()).project(p.camera);
      const center = { x: box.left + (projected.x + 1) * box.width * .5, y: box.top + (1 - projected.y) * box.height * .5 };
      const blockers = Array.from(c.parentElement.querySelectorAll('*')).filter(el => { if (el === c || el.contains(c)) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && r.width * r.height < box.width * box.height * .9 && center.x > r.left && center.x < r.right && center.y > r.top && center.y < r.bottom && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > .15 && ((s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none'); }).map(el => String(el.className));
      return { finite, dataset: { ...c.dataset }, named, resources: JSON.parse(JSON.stringify(p.renderer.info.memory)), programs: p.renderer.info.programs.length, parcelScreen: { center, blockers }, snapshot: JSON.parse(JSON.stringify(waterReviewData.pilot.snapshot)) };
    });
    assert(info.finite, 'Actual scene buffers, materials and transforms stay finite');
    if (info.dataset.pilotCamera === 'follow' && ['cloud', 'rain'].includes(info.dataset.parcelForm)) assert.deepEqual(info.parcelScreen.blockers, [], 'Primary parcel center clears painted HUD rectangles');
    result.states.push({ name, ...info }); return info;
  }
  const handoff = () => page.evaluate(() => {
    const c = document.querySelector('#wcPilotCanvas'), s = pilotReview.scene, group = s.getObjectByName('pilot-phase-handoff');
    const geometryIds = new Set(), materialIds = new Set();
    const sample = o => {
      if (o.geometry) geometryIds.add(o.geometry.uuid);
      const materials = (o.material ? Array.isArray(o.material) ? o.material : [o.material] : []).map(m => { materialIds.add(m.uuid); return { uuid: m.uuid, map: m.map && m.map.uuid, opacity: m.opacity, color: m.color ? m.color.toArray() : null, userData: JSON.parse(JSON.stringify(m.userData)) }; });
      return { name: o.name, visible: o.visible, position: o.position.toArray(), worldPosition: o.getWorldPosition(new THREE.Vector3()).toArray(), worldScale: o.getWorldScale(new THREE.Vector3()).toArray(), scale: o.scale.toArray(), quaternion: o.quaternion.toArray(), materials, userData: JSON.parse(JSON.stringify(o.userData)), count: o.count, instanceMatrix: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null, attributes: o.geometry ? Object.fromEntries(Object.entries(o.geometry.attributes).map(([k, a]) => [k, Array.from(a.array)])) : null };
    };
    const meshes = []; group.traverse(o => { if (o !== group) meshes.push(sample(o)); });
    const targets = ['pilot-self-cloud', 'pilot-rain-parcel'].map(name => { const o = s.getObjectByName(name); return { name, visible: o.visible, position: o.position.toArray(), worldPosition: o.getWorldPosition(new THREE.Vector3()).toArray(), scale: o.scale.toArray(), quaternion: o.quaternion.toArray(), userData: JSON.parse(JSON.stringify(o.userData)), children: o.children.map(c => ({ position: c.position.toArray(), scale: c.scale.toArray(), opacity: c.material.opacity, map: c.material.map && c.material.map.uuid, tier: c.userData.cloudTier, baseOpacity: c.userData.motionBaseOpacity })) }; });
    const rain = s.getObjectByName('pilot-rain-parcel'), preview = s.getObjectByName('pilot-phase-incoming-rain');
    const bindings = preview ? { sharesRainGeometry: preview.geometry === rain.geometry, sharesRainMaterial: preview.material === rain.material, previewVisible: preview.visible } : null;
    return { visible: group.visible, cameraMode: c.dataset.pilotCamera, position: group.position.toArray(), fog: { near: s.fog.near, far: s.fog.far, color: s.fog.color.toArray() }, data: { active: c.dataset.phaseHandoff, kind: c.dataset.phaseHandoffKind, from: c.dataset.phaseHandoffFrom, to: c.dataset.phaseHandoffTo, progress: c.dataset.phaseHandoffProgress, front: c.dataset.phaseFront, cloudPlacement: c.dataset.cloudHandoffPlacement }, userData: JSON.parse(JSON.stringify(group.userData)), bindings, geometryIds: [...geometryIds].sort(), materialIds: [...materialIds].sort(), meshes, targets };
  });
  const contactSample = () => page.evaluate(() => {
    const s = pilotReview.scene, field = s.getObjectByName('pilot-rain-field');
    const groups = []; s.traverse(o => { if (/^pilot-rain-water-/.test(o.name)) groups.push({ name: o.name, visible: o.visible, position: o.position.toArray(), userData: JSON.parse(JSON.stringify(o.userData)), geometry: o.geometry && o.geometry.uuid, instanceMatrix: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null, attributes: o.geometry ? Object.fromEntries(Object.entries(o.geometry.attributes).map(([key, a]) => [key, Array.from(a.array)])) : null }); });
    return { bufferUpdates: field.userData.bufferUpdates, groups };
  });
  async function trigger(name, options) {
    await restore('before-' + name, options); const before = await handoff(); assert.equal(before.data.active, 'hidden', 'Restore clears stale handoff');
    await page.evaluate(name => { window.cloudRainDriveInput = { ...cloudRainTransitions[name].input }; }, name); await resume();
    await page.waitForFunction(name => { const c = document.querySelector('#wcPilotCanvas'); return c.dataset.parcelForm === cloudRainTransitions[name].after.form && c.dataset.phaseHandoff === 'active' && waterReviewData.pilot.paused; }, name);
    await settle();
    return before;
  }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForFunction(() => window.pilotReview && window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c => { const gl = c.getContext('webgl2') || c.getContext('webgl'); return !!gl && !gl.isContextLost(); }));
    await page.evaluate(() => {
      window.reviewRenderActive = false;
      const k = WaterCyclePilotKernel, original = k.step, states = {}, transitions = {};
      const advance = (start, input, limit, desired) => { let s = start; for (let n = 0; n < limit; n++) { const next = original(s, input); if (next.form !== s.form && next.form === desired) return { before: s, after: next, input }; s = next; } throw Error('Production kernel did not reach ' + desired); };
      states.surface = k.practiceState('surface', 'tropicalOcean'); states.vapor = k.practiceState('cloud', 'tropicalOcean');
      states.droplet = advance(states.vapor, { dt: .12, nucleusHit: true }, 100, 'droplet').after;
      transitions.cloud = advance(states.droplet, { dt: .12, dropletHit: true }, 100, 'cloud'); states.cloud = transitions.cloud.after;
      transitions.rain = advance(states.cloud, { dt: .12, dropletHit: true }, 100, 'rain'); states.rain = transitions.rain.after;
      { let s = states.rain; for (let n = 0; n < 10000 && s.altitudeM > 28; n++) s = original(s, { dt: .12, surface: 'water' }); if (s.form !== 'rain' || s.altitudeM <= 0) throw Error('Real falling rain did not reach low ocean checkpoint'); states.rainLow = s; }
      for (const [name, transition] of Object.entries(transitions)) states['before-' + name] = transition.before;
      window.cloudRainStates = states; window.cloudRainTransitions = transitions; window.cloudRainLiveSteps = []; window.cloudRainTotalSteps = 0;
      k.step = function (state, input) { window.cloudRainTotalSteps++; const drive = window.cloudRainDriveInput; if (drive) window.cloudRainDriveInput = null; const actualInput = { ...input, ...(window.cloudRainSteadyInput || {}), ...(drive || {}) }, next = original(state, actualInput); if (drive || next.form !== state.form) cloudRainLiveSteps.push({ from: state.form, to: next.form, elapsed: next.elapsed, input: actualInput }); return next; };
    });
    pass('Cloud and rain fixtures come from actual production kernel integration');
    if (baseline) {
      for (const name of ['cloud', 'rain']) for (const cameraMode of ['follow', 'water']) { await restore(name, { cameraMode }); await capture(name + '-' + cameraMode); await inspect(name + '-' + cameraMode); }
    } else {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const name of ['cloud', 'rain']) for (const cameraMode of ['follow', 'water']) {
        if (transitionFilter && !transitionFilter.includes(name + '-' + cameraMode)) continue;
        const before = await trigger(name, { cameraMode }); const event = await handoff();
        const kernel = await page.evaluate(name => ({ before: cloudRainTransitions[name].before.form, after: cloudRainTransitions[name].after.form, actual: cloudRainLiveSteps, receipt: waterReviewData.pilot.lastChange }), name);
        assert.equal(event.data.from, kernel.before); assert.equal(event.data.to, kernel.after); assert.equal(event.data.kind, name === 'cloud' ? 'cloud-assembly' : 'precipitation-release');
        assert(kernel.receipt && kernel.receipt.from === kernel.before && kernel.receipt.to === kernel.after && kernel.actual.some(s => s.from === kernel.before && s.to === kernel.after), 'Integrated transition preserves real receipt');
        await page.waitForTimeout(180); assertPaused(await handoff(), event, 'Initial stage buffers and matrices freeze while paused');
        await capture(name + '-' + cameraMode + '-first'); await inspect(name + '-' + cameraMode + '-first');
        await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .52); await pause();
        const midpoint = await handoff(); assert.equal(midpoint.data.active, 'active'); assert.equal(midpoint.data.kind, event.data.kind);
        await capture(name + '-' + cameraMode + '-midpoint'); await inspect(name + '-' + cameraMode + '-midpoint');
        const still = await handoff(); await page.waitForTimeout(180); assertPaused(await handoff(), still, 'Midpoint stage buffers and matrices freeze while paused');
        assert.deepEqual(midpoint.geometryIds, event.geometryIds, 'Staging reuses geometry'); assert.deepEqual(midpoint.materialIds, event.materialIds, 'Staging reuses materials');
        if (name === 'rain') {
          const source = before.targets.find(o => o.name === 'pilot-self-cloud');
          for (const frame of [event, midpoint]) {
            const memory = frame.meshes.find(o => o.name === 'pilot-phase-cloud-memory');
            assert(memory.visible && memory.userData.sourceSnapshot, 'Rain retains the actual outgoing cloud snapshot');
            assert.deepEqual(Object.values(memory.userData.sourceScale), source.scale, 'Source cloud scale matches the outgoing primary cloud');
            const sourceIndex = frame.meshes.indexOf(memory), lobes = frame.meshes.slice(sourceIndex + 1, sourceIndex + 27);
            assert.equal(lobes.length, 26); assert.deepEqual(lobes.map(o => o.materials[0].map), source.children.map(o => o.map), 'All 26 source billows share actual outgoing texture maps');
            for (let n = 0; n < lobes.length; n++) { assert.deepEqual(lobes[n].position, source.children[n].position, 'Source billow positions match the outgoing cloud'); assert.deepEqual(lobes[n].scale, source.children[n].scale, 'Source billow scales match the outgoing cloud'); }
            if (cameraMode === 'follow') {
              assert.equal(memory.userData.placement, 'captured-world-source');
              assert(Math.max(...memory.worldPosition.map((v, i) => Math.abs(v - Object.values(memory.userData.sourcePosition)[i]))) < 1e-7, 'Outgoing cloud remains at its captured world source');
              assert.deepEqual(memory.scale, source.scale, 'Outgoing cloud fades without shrinking');
            } else {
              assert.equal(memory.userData.placement, 'bounded-water-lens');
              assert(memory.scale.every((v, i) => Math.abs(v - source.scale[i] * .13) < 1e-9), 'Water source cloud stays bounded in the teaching lens');
            }
            assert(frame.bindings && frame.bindings.sharesRainGeometry && frame.bindings.sharesRainMaterial, 'Water incoming rain reuses actual primary geometry and material');
            assert.equal(frame.bindings.previewVisible, cameraMode === 'water', 'Incoming rain preview only appears in the Water teaching lens');
          }
        } else {
          const firstCloud = event.targets.find(o => o.name === 'pilot-self-cloud'), midCloud = midpoint.targets.find(o => o.name === 'pilot-self-cloud');
          const firstBeads = event.meshes.find(o => o.name === 'pilot-phase-condensation-beads'), midBeads = midpoint.meshes.find(o => o.name === 'pilot-phase-condensation-beads');
          assert(firstBeads.visible && firstBeads.count === 12 && firstBeads.userData.mode === 'cloud-assembly');
          assert.notDeepEqual(firstBeads.instanceMatrix, midBeads.instanceMatrix, 'Reused droplets spread into billows as the actual assembly stage progresses');
          assert(midCloud.userData.assemblyProgress > firstCloud.userData.assemblyProgress, 'Cloud opacity assembly follows actual handoff progress');
          assert(firstCloud.children.some(o => o.opacity < o.baseOpacity * .2), 'Early assembly leaves part of the cloud unfilled');
          assert(midCloud.children.some((o, i) => o.opacity > firstCloud.children[i].opacity), 'Billows visibly fill as assembly proceeds');
          if (cameraMode === 'water') for (const frame of [event, midpoint]) {
            const forming = frame.meshes.find(o => o.name === 'pilot-phase-cloud-memory');
            assert(forming.visible && !forming.userData.sourceSnapshot && forming.userData.placement === 'forming-water-lens', 'Water shows the actual forming cloud in a bounded teaching lens');
          }
        }
        result.transitions.push({ name, cameraMode, before, event, midpoint, kernel });
      }
      pass('Actual first/midpoint rendering, receipts and exact local pause state: ' + result.transitions.map(t => t.name + '-' + t.cameraMode).join(', '));
      await restore('rainLow'); await capture('rain-low-ocean'); const low = await inspect('rain-low-ocean');
      assert(low.named['pilot-rain-water-impacts'].visible && Number(low.dataset.rainWaterImpactCount) > 0, 'Low ocean rain has actual receiving-water contacts');
      const cached = await contactSample(); await page.waitForTimeout(180); assert.deepEqual(await contactSample(), cached, 'Paused water-contact buffers are exact');
      const impact = cached.groups.find(o => o.name === 'pilot-rain-water-impacts');
      assert(impact && impact.userData.pooled && impact.userData.rippleSegments === 14 && impact.userData.segmentsPerStreak === 29 && impact.userData.crownRays === 6 && impact.userData.reboundTicks === 3, 'Ripple/crown/rebound share the existing fixed pool');
      const alpha = impact.attributes.rainAlpha, positions = impact.attributes.position;
      assert.equal(alpha.length, 84 * 29 * 2); assert.equal(positions.length, alpha.length * 3);
      let crowns = 0, rebounds = 0;
      for (let streak = 0; streak < 84; streak++) {
        let crowned = false;
        for (let segment = 0; segment < 29; segment++) {
          const i = (streak * 29 + segment) * 2;
          assert.equal(alpha[i], alpha[i + 1], 'Every splash segment masks both endpoints together');
          assert(alpha[i] >= 0 && alpha[i] <= 1, 'Contact alpha stays bounded');
          if (alpha[i] > 0) { if (segment >= 26) rebounds++; else if (segment >= 14) crowned = true; }
        }
        if (crowned) crowns++;
      }
      assert.equal(crowns, impact.userData.activeCrownCount); assert.equal(rebounds, impact.userData.activeReboundCount);
      assert.equal(Number(low.dataset.rainWaterCrownCount), crowns); assert.equal(Number(low.dataset.rainWaterReboundCount), rebounds);
      const lookBox = await canvas.boundingBox(); await page.mouse.move(lookBox.x + lookBox.width * .22, lookBox.y + lookBox.height * .65); await page.mouse.down(); await page.mouse.move(lookBox.x + lookBox.width * .22 + 26, lookBox.y + lookBox.height * .65, { steps: 3 }); await page.mouse.up();
      await page.waitForFunction(count => pilotReview.scene.getObjectByName('pilot-rain-field').userData.bufferUpdates > count, cached.bufferUpdates); const looked = await contactSample();
      await resume(); await page.waitForFunction(count => pilotReview.scene.getObjectByName('pilot-rain-field').userData.bufferUpdates > count, looked.bufferUpdates); await pause();
      result.rainContacts = { initial: cached, looked, resumed: await contactSample() };
      pass('Receiving-water details reuse paused buffers and invalidate on actual look/flight input');
      await page.setViewportSize({ width: 320, height: 940 });
      for (const name of ['cloud', 'rain']) { await restore(name); if (name === 'rain') await capture(name + '-phone-320'); await inspect(name + '-phone-320'); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No 320 px page overflow'); }
      await page.setViewportSize({ width: 1280, height: 1000 });
      pass('Cloud and rain fit 320 px without hiding the primary parcel');
      result.lifecycle = [];
      for (const name of ['cloud', 'rain']) {
        await page.emulateMedia({ reducedMotion: 'reduce' }); await restore('before-' + name, { pauseAtChanges: false });
        // Remove new collision opportunities after the actual transition input.
        // This isolates decorative motion from legitimate later mass growth;
        // the original kernel still integrates time, gravity and wind normally.
        await page.evaluate(name => { window.cloudRainSteadyInput = { dropletHit: false, nucleusHit: false }; window.cloudRainDriveInput = { ...cloudRainTransitions[name].input }; }, name); await resume(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'active');
        const reduced = await handoff(), steps = await page.evaluate(() => cloudRainTotalSteps); await page.waitForTimeout(260); const reducedLater = await handoff(), laterSteps = await page.evaluate(() => cloudRainTotalSteps);
        assert.equal(reducedLater.data.progress, reduced.data.progress, 'Reduced-motion stage remains readable'); assert(laterSteps > steps, 'Real model advances under reduced motion');
        // The teaching marker is allowed to travel with the real parcel; its
        // local staging transforms, opacities and matrices remain unchanged.
        assert.deepEqual(reducedStage(reducedLater), reducedStage(reduced), 'Reduced-motion local staging stays static'); await pause();
        await restore('cloud'); const restored = await handoff(); assert.equal(restored.data.active, 'hidden'); assert(!restored.visible);
        await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid'); const reset = await handoff(); assert.equal(reset.data.active, 'hidden'); assert(!reset.visible);
        await page.emulateMedia({ reducedMotion: 'no-preference' }); await restore('before-' + name, { pauseAtChanges: false }); await page.evaluate(name => { window.cloudRainDriveInput = { ...cloudRainTransitions[name].input }; }, name); await resume();
        await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'active'); const live = await handoff(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden', null, { timeout: 10000 }); await pause(); const expired = await handoff();
        assert(!expired.visible); assert.deepEqual(expired.geometryIds, live.geometryIds); assert.deepEqual(expired.materialIds, live.materialIds);
        result.lifecycle.push({ name, reducedSteps: [steps, laterSteps], reducedProgress: reduced.data.progress, reducedCollisionInputs: { dropletHit: false, nucleusHit: false }, restore: restored.data, reset: reset.data, expiry: expired.data, resourceCounts: { geometries: expired.geometryIds.length, materials: expired.materialIds.length } });
      }
      pass('Both new stages respect reduced motion, clear on restore/reset and expire with fixed pooled resources');
    }
    assert.deepEqual(result.errors, []); pass('No page, WebGL or shader errors'); result.success = true;
  } catch (error) { result.success = false; result.harnessError = String(error); throw error; }
  finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    if (!baseline) fs.writeFileSync(path.join(reportRoot, 'qa-summary.json'), JSON.stringify({ success: result.success, sourceSha256: result.sourceSha256, checks: result.checks, captures: result.captures, transitionViews: result.transitions.map(({ name, cameraMode }) => ({ name, cameraMode })), lifecycle: result.lifecycle, errors: result.errors, harnessError: result.harnessError, report: path.relative(root, path.join(out, 'results.json')) }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
