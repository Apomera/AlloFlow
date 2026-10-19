'use strict';
// Isolated real-WebGL review for the Be the Water fluidity pass. Production
// kernel steps generate every form and transition; fixture inputs only make
// collision opportunities deterministic. No product source is changed here.
// Run only after source lock: node dev-tools/watercycle_pilot_fluidity_qa.cjs
//   --source=reports/watercycle-pilot-fluidity/final-source.js [--report=final]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const arg = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3);
const report = arg('report') || 'final';
const phasesOnly = process.argv.includes('--phases-only');
assert(/^[a-z0-9-]+$/.test(report), 'Plain report folder name');
const out = path.join(root, 'reports/watercycle-pilot-fluidity', report);
const temp = path.join(root, 'scratch/watercycle-pilot-fluidity-temp');
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
const result = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], captures: [], states: [], transitions: [], errors: [] };
function pass(name) { result.checks.push(name); console.log('PASS ' + name); }
function assertPausedHandoff(actual, expected, message) {
  const a = structuredClone(actual), b = structuredClone(expected);
  const groupA = a.meshes.find(m => m.name === 'pilot-phase-handoff'), groupB = b.meshes.find(m => m.name === 'pilot-phase-handoff');
  // Water view positions the handoff from a damped camera. At convergence its
  // world translation may differ by floating roundoff (~1e-12 world units).
  // The mask uniforms, rotations and every geometry/matrix remain exact.
  const translationDelta = Math.max(...groupA.position.map((v, i) => Math.abs(v - groupB.position[i])));
  assert(translationDelta < 1e-7, 'Paused handoff world translation is visually identical');
  result.pauseCameraRoundoff = result.pauseCameraRoundoff || { maxTranslation: 0, maxWaterQuaternion: 0 };
  result.pauseCameraRoundoff.maxTranslation = Math.max(result.pauseCameraRoundoff.maxTranslation, translationDelta);
  if (actual.cameraMode === 'water') {
    for (let n = 0; n < a.meshes.length; n++) {
      const delta = Math.max(...a.meshes[n].quaternion.map((v, i) => Math.abs(v - b.meshes[n].quaternion[i])));
      assert(delta < 1e-12, 'Paused Water lens orientation is numerically identical');
      result.pauseCameraRoundoff.maxWaterQuaternion = Math.max(result.pauseCameraRoundoff.maxWaterQuaternion, delta);
      a.meshes[n].quaternion = null; b.meshes[n].quaternion = null;
    }
  }
  groupA.position = null; groupB.position = null; assert.deepEqual(a, b, message);
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
  async function draw() {
    const before = await page.evaluate(() => { window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
    await page.waitForFunction(before => window.reviewRenderCount > before, before);
    // Gate subsequent GPU draws, never the product's animation or kernel clock.
    await page.evaluate(() => { window.reviewRenderActive = false; });
  }
  async function capture(name) {
    await canvas.scrollIntoViewIfNeeded(); await settle(); await draw();
    const box = await canvas.boundingBox(); assert(box && box.width >= 250 && box.height >= 180);
    try { await page.screenshot({ path: path.join(out, name + '.png'), clip: box, animations: 'disabled', timeout: 45000 }); }
    catch (error) { result.captureRetries = result.captureRetries || []; result.captureRetries.push({ name, error: String(error) }); await page.screenshot({ path: path.join(out, name + '.png'), clip: box, timeout: 30000 }); }
    result.captures.push(name); console.log('CAPTURE ' + name);
  }
  async function restore(name, { cameraMode = 'follow', pauseAtChanges = true } = {}) {
    await page.evaluate(({ name, cameraMode, pauseAtChanges }) => {
      window.reviewRenderActive = false; window.fluidityDriveInput = null; window.fluidityLiveSteps = []; window.fluidityTotalSteps = 0;
      const checkpoint = fluidityStates[name];
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges, navigationAssist: false, showMolecules: false, cameraMode, resumeCheckpoint: { ...checkpoint, cameraMode }, resumeToken: 'fluidity-' + name + '-' + Date.now() } }, 'light');
    }, { name, cameraMode, pauseAtChanges });
    await page.waitForFunction(({ name, cameraMode }) => {
      const c = document.querySelector('#wcPilotCanvas');
      return window.pilotReview && c && c.dataset.parcelForm === fluidityStates[name].form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === fluidityStates[name].form;
    }, { name, cameraMode }); await settle();
  }
  const resume = () => page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
  async function pause() { await page.evaluate(() => { if (!waterReviewData.pilot.paused) document.querySelector('[data-control="pause"]').click(); }); await settle(); }
  async function inspect(name) {
    const info = await page.evaluate(() => {
      const p = pilotReview, named = {}; let finite = true;
      p.scene.traverse(o => {
        if (o.name && /^pilot-/.test(o.name)) named[o.name] = { visible: o.visible, type: o.type, children: o.children.length, userData: JSON.parse(JSON.stringify(o.userData)) };
        finite = finite && [...o.position.toArray(), ...o.scale.toArray(), ...o.quaternion.toArray()].every(Number.isFinite);
        if (o.instanceMatrix) finite = finite && Array.from(o.instanceMatrix.array).every(Number.isFinite);
        if (o.geometry) for (const a of Object.values(o.geometry.attributes || {})) finite = finite && Array.from(a.array).every(Number.isFinite);
        for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) {
          if (m.opacity !== undefined) finite = finite && Number.isFinite(m.opacity);
          for (const ref of Object.values(m.userData.phaseFront || {})) if (ref && typeof ref.value === 'number') finite = finite && Number.isFinite(ref.value);
        }
      });
      const c = document.querySelector('#wcPilotCanvas'), box = c.getBoundingClientRect(), parcel = p.scene.getObjectByName('pilot-water-parcel');
      const projected = parcel.getWorldPosition(new THREE.Vector3()).project(p.camera);
      const center = { x: box.left + (projected.x + 1) * box.width * .5, y: box.top + (1 - projected.y) * box.height * .5 };
      const blockers = Array.from(c.parentElement.querySelectorAll('*')).filter(el => { if (el === c || el.contains(c)) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && r.width * r.height < box.width * box.height * .9 && center.x > r.left && center.x < r.right && center.y > r.top && center.y < r.bottom && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > .15 && ((s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.backgroundImage !== 'none'); }).map(el => String(el.className));
      return { finite, dataset: { ...c.dataset }, named, resources: JSON.parse(JSON.stringify(p.renderer.info.memory)), programs: p.renderer.info.programs.length, parcelScreen: { center, blockers }, snapshot: JSON.parse(JSON.stringify(waterReviewData.pilot.snapshot)) };
    });
    assert(info.finite, 'Actual scene buffers, uniforms, materials and transforms stay finite');
    if (info.dataset.pilotCamera === 'follow' && ['cloud', 'rain'].includes(info.dataset.parcelForm)) assert.deepEqual(info.parcelScreen.blockers, [], 'Primary parcel center clears painted HUD rectangles');
    result.states.push({ name, ...info }); return info;
  }
  const motionSample = () => page.evaluate(() => {
    const s = pilotReview.scene, cloud = s.getObjectByName('pilot-self-cloud'), rain = s.getObjectByName('pilot-rain-parcel');
    const transform = o => ({ position: o.position.toArray(), scale: o.scale.toArray(), quaternion: o.quaternion.toArray() });
    return { steps: fluidityTotalSteps, cloud: { ...transform(cloud), children: cloud.children.map(o => ({ ...transform(o), tier: o.userData.cloudTier, baseY: o.userData.motionBaseY })), userData: JSON.parse(JSON.stringify(cloud.userData)) }, rain: { ...transform(rain), volume: rain.scale.x * rain.scale.y * rain.scale.z, userData: JSON.parse(JSON.stringify(rain.userData)) } };
  });
  const handoff = () => page.evaluate(() => {
    const c = document.querySelector('#wcPilotCanvas'), s = pilotReview.scene, o = s.getObjectByName('pilot-phase-handoff');
    const geometries = new Set(), materials = new Set();
    const sample = child => {
      if (child.geometry) geometries.add(child.geometry.uuid);
      for (const m of child.material ? Array.isArray(child.material) ? child.material : [child.material] : []) materials.add(m.uuid);
      const m = child.material;
      return { name: child.name, visible: child.visible, position: child.position.toArray(), scale: child.scale.toArray(), quaternion: child.quaternion.toArray(), opacity: m && m.opacity, phaseUniforms: m && JSON.parse(JSON.stringify(m.userData.phaseFront || null)), revealUniforms: m && JSON.parse(JSON.stringify(m.userData.phaseReveal || null)), programKey: m && m.userData.phaseReveal ? m.customProgramCacheKey() : null, userData: JSON.parse(JSON.stringify(child.userData)), instanceMatrix: child.instanceMatrix ? Array.from(child.instanceMatrix.array) : null, positions: child.geometry && child.geometry.attributes.position ? Array.from(child.geometry.attributes.position.array) : null };
    };
    const meshes = []; o.traverse(child => meshes.push(sample(child)));
    const targets = []; s.getObjectByName('pilot-water-parcel').traverse(child => targets.push(sample(child)));
    const water = s.getObjectByName('pilot-phase-liquid-memory'), ice = s.getObjectByName('pilot-ice-parcel'), preview = s.getObjectByName('pilot-phase-incoming-ice'), frost = s.getObjectByName('pilot-phase-frost-front');
    const sharedProgress = water.material.userData.phaseFront.progress;
    const revealBindings = { previewSharesMaterial: preview.material === ice.material, sharedProgress: [ice, preview, frost, ...ice.children].filter(child => child.material && child.material.userData.phaseReveal).every(child => child.material.userData.phaseReveal.progress === sharedProgress), sharedActive: frost.material.userData.phaseReveal.active === ice.material.userData.phaseReveal.active, maskedMaterials: targets.concat(meshes).filter(m => m.revealUniforms).length };
    const energy = s.getObjectByName('pilot-energy-transfer'), sparks = s.getObjectByName('pilot-energy-sparks'), eye = pilotReview.camera.position.clone().sub(energy.position).normalize(), positions = sparks.geometry.attributes.position, alpha = sparks.geometry.attributes.energyAlpha;
    let centerIntrusions = 0, visibleSparks = 0;
    for (let n = 0; n < positions.count; n++) { const x = positions.getX(n), y = positions.getY(n), z = positions.getZ(n), along = x * eye.x + y * eye.y + z * eye.z; const projectedRadius = Math.sqrt(Math.max(0, x * x + y * y + z * z - along * along)) * energy.scale.x; if (alpha.getX(n) > .001) { visibleSparks++; if (projectedRadius < energy.userData.clearCenterRadius - .0001) centerIntrusions++; } }
    return { visible: o.visible, cameraMode: c.dataset.pilotCamera, data: { active: c.dataset.phaseHandoff, kind: c.dataset.phaseHandoffKind, from: c.dataset.phaseHandoffFrom, to: c.dataset.phaseHandoffTo, progress: c.dataset.phaseHandoffProgress, front: c.dataset.phaseFront }, userData: JSON.parse(JSON.stringify(o.userData)), geometries: geometries.size, materials: materials.size, meshes, targets, revealBindings, energy: { visible: energy.visible, clearCenterRadius: energy.userData.clearCenterRadius, visibleSparks, centerIntrusions }, form: c.dataset.parcelForm, integratedSteps: fluidityTotalSteps };
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForFunction(() => window.pilotReview && window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c => { const gl = c.getContext('webgl2') || c.getContext('webgl'); return !!gl && !gl.isContextLost(); }));
    await page.evaluate(() => {
      window.reviewRenderActive = false;
      const k = WaterCyclePilotKernel, original = k.step, states = {}, transitions = {};
      const advance = (start, input, limit, desired) => { let s = start; for (let n = 0; n < limit; n++) { const next = original(s, input); if (next.form !== s.form && next.form === desired) return { before: s, after: next, input }; s = next; } throw Error('Production kernel did not reach ' + desired); };
      states.surface = k.practiceState('surface', 'tropicalOcean');
      // A legitimate liquid checkpoint may start at a different visible water
      // location. Its form/phase/mass still come directly from practiceState.
      states.wakeOcean = { ...states.surface, x: -150, z: -50, yaw: 0 };
      states.wakeLake = { ...states.surface, x: 268, z: -104, yaw: 0 };
      states.wakeRim = { ...states.surface, x: 268, z: -72.3, yaw: 0 };
      states.vapor = k.practiceState('cloud', 'tropicalOcean');
      transitions.condensation = advance(states.vapor, { dt: .12, nucleusHit: true }, 100, 'droplet'); states.droplet = transitions.condensation.after;
      transitions.cloud = advance(states.droplet, { dt: .12, dropletHit: true }, 100, 'cloud'); states.cloud = transitions.cloud.after;
      transitions.rain = advance(states.cloud, { dt: .12, dropletHit: true }, 100, 'rain'); states.rain = transitions.rain.after;
      { let s = states.rain; for (let n = 0; n < 10000 && s.altitudeM > 28; n++) s = original(s, { dt: .12, surface: 'water' }); if (s.form !== 'rain' || s.altitudeM <= 0) throw Error('Real falling rain did not reach low ocean checkpoint'); states.rainLow = s; }
      transitions.freezing = advance(states.droplet, { dt: .12, thrust: 1 }, 12000, 'ice'); states.ice = transitions.freezing.after;
      transitions.deposition = advance(k.practiceState('cloud', 'mountainWinter'), { dt: .12, nucleusHit: true, thrust: 1 }, 100, 'ice');
      for (const [name, transition] of Object.entries(transitions)) states['before-' + name] = transition.before;
      window.fluidityStates = states; window.fluidityTransitions = transitions; window.fluidityLiveSteps = []; window.fluidityTotalSteps = 0;
      k.step = function (state, input) {
        window.fluidityTotalSteps++;
        const drive = window.fluidityDriveInput; if (drive) window.fluidityDriveInput = null;
        const actualInput = drive ? { ...input, ...drive } : input, next = original(state, actualInput);
        if (drive || next.form !== state.form) fluidityLiveSteps.push({ from: state.form, to: next.form, elapsed: next.elapsed, input: actualInput });
        return next;
      };
    });
    pass('Cloud, rain, freezing and deposition checkpoints come from genuine production kernel integration');

    if (!phasesOnly) {
    for (const name of ['cloud', 'rain']) for (const cameraMode of ['follow', 'water']) {
      await restore(name, { cameraMode }); await capture(name + '-' + cameraMode); const info = await inspect(name + '-' + cameraMode);
      assert.equal(info.named['pilot-water-parcel'].visible, cameraMode !== 'water');
    }
    await page.setViewportSize({ width: 320, height: 940 });
    for (const name of ['cloud', 'rain']) { await restore(name); if (name === 'rain') await capture('rain-phone-320'); await inspect(name + '-phone-320'); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No 320 px page overflow'); }
    pass('Cloud and rain render finite follow/Water views; both fit 320 px without obscuring the parcel');
    await page.setViewportSize({ width: 1280, height: 1000 });

    // Dynamic details may move only on the normal, running presentation clock.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const name of ['cloud', 'rain']) {
      await restore(name, { pauseAtChanges: false }); const initial = await motionSample();
      await page.waitForTimeout(200); assert.deepEqual(await motionSample(), initial, name + ' detail stays exact while paused');
      await resume(); await page.waitForTimeout(220); const a = await motionSample(); await page.waitForTimeout(220); const b = await motionSample(); await pause();
      assert(b.steps > a.steps, 'Production model advances for motion check');
      if (name === 'cloud') { assert.notDeepEqual(a.cloud.children, b.cloud.children, 'Cloud lobes deform while running'); assert.deepEqual(a.cloud.quaternion, b.cloud.quaternion, 'Cloud sunlight does not rotate'); for (const lobe of b.cloud.children.filter(lobe => lobe.tier === 0)) assert.equal(lobe.position[1], lobe.baseY, 'Condensation shelf stays vertically anchored'); }
      else { assert.notDeepEqual(a.rain.scale, b.rain.scale, 'Rain drop shape oscillates while running'); assert(Math.abs(a.rain.volume - b.rain.volume) < 1e-7, 'Rain wobble preserves scale volume'); assert(Math.abs(b.rain.userData.shapeVolumeRatio - 1) < 1e-12, 'Wobble factors are complementary'); }
      const frozen = await motionSample(); await page.waitForTimeout(220); assert.deepEqual(await motionSample(), frozen, 'New lobe/wobble presentation clock freezes exactly');
      await page.emulateMedia({ reducedMotion: 'reduce' }); await restore(name, { pauseAtChanges: false }); await resume(); await page.waitForTimeout(100); const r1 = await motionSample(); await page.waitForTimeout(220); const r2 = await motionSample(); await pause();
      assert(r2.steps > r1.steps, 'Real model still advances under reduced motion');
      if (name === 'cloud') assert.deepEqual(r2.cloud.children, r1.cloud.children, 'Reduced-motion cloud lobes stay static'); else assert.deepEqual(r2.rain.scale, r1.rain.scale, 'Reduced-motion rain shape stays static');
      result.motion = result.motion || {}; result.motion[name] = { initial, normalA: a, normalB: b, reducedA: r1, reducedB: r2 };
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    pass('Cloud lobes and volume-preserving rain wobble move normally, freeze in pause and stay still under reduced motion');

    const wakeSample = () => page.evaluate(() => {
      const s = pilotReview.scene, wake = s.getObjectByName('pilot-water-wake'), lake = s.getObjectByName('pilot-lake-water'), ocean = s.getObjectByName('pilot-ocean-surface');
      let wetTriangles = 0, dryTriangles = 0, mixedTriangles = 0, lakeOutside = 0; const vertices = [], heightErrors = [];
      const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), origin = new THREE.Vector3();
      wake.updateMatrixWorld(true); ocean.updateMatrixWorld(true); lake.updateMatrixWorld(true);
      for (const arc of wake.children) {
        const p = arc.geometry.attributes.position, a = arc.geometry.attributes.wakeAlpha; let sampled = 0;
        for (let n = 0; n < p.count; n += 3) {
          const mask = [a.getX(n), a.getX(n + 1), a.getX(n + 2)];
          if (!mask.every(v => v === mask[0])) mixedTriangles++;
          if (mask[0] === 0) { dryTriangles++; continue; } wetTriangles++;
          for (let corner = 0; corner < 3; corner++) {
            const v = arc.localToWorld(new THREE.Vector3().fromBufferAttribute(p, n + corner)); vertices.push(v.toArray());
            if (Math.hypot(v.x - 268, v.z + 104) > 34.0001) lakeOutside++;
            if (sampled < 3) { origin.set(v.x, 1000, v.z); ray.set(origin, down); const mesh = Math.hypot(wake.position.x - 268, wake.position.z + 104) < 34 ? lake : ocean; const hit = ray.intersectObject(mesh, false)[0]; if (hit) heightErrors.push(Math.abs(v.y - hit.point.y - .075)); sampled++; }
          }
        }
      }
      return { visible: wake.visible, userData: JSON.parse(JSON.stringify(wake.userData)), position: wake.position.toArray(), wetTriangles, dryTriangles, mixedTriangles, lakeOutside, heightErrors, vertices, arrays: wake.children.map(arc => ({ position: Array.from(arc.geometry.attributes.position.array), alpha: Array.from(arc.geometry.attributes.wakeAlpha.array), geometry: arc.geometry.uuid, opacity: arc.material.opacity })) };
    });
    result.wakes = [];
    for (const name of ['wakeOcean', 'wakeLake', 'wakeRim']) {
      await restore(name, { pauseAtChanges: false }); assert.equal((await wakeSample()).visible, false, 'Restoring clears stale wake strength');
      await resume(); await canvas.focus(); await page.keyboard.down('w'); await page.waitForTimeout(260); await page.keyboard.up('w'); await pause();
      const wake = await wakeSample(); assert(wake.visible && wake.wetTriangles > 0, 'Real surface movement generates receiving-water wake'); assert.equal(wake.mixedTriangles, 0, 'Shore clip masks whole triangles'); assert(wake.heightErrors.length > 0 && wake.heightErrors.every(error => error < .002), 'Wake vertices sit .075 above actual water triangles');
      if (name !== 'wakeOcean') assert.equal(wake.lakeOutside, 0, 'Lake wake never crosses the visible shore');
      if (name === 'wakeRim') assert(wake.dryTriangles > 0, 'Near-shore geometry is actually clipped');
      await page.waitForTimeout(180); assert.deepEqual(await wakeSample(), wake, 'Paused wake buffers, opacity and cache counter stay exact');
      if (name === 'wakeLake') await capture('wake-lake');
      result.wakes.push({ name, ...wake });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' }); await restore('wakeLake', { pauseAtChanges: false }); await resume(); await canvas.focus(); await page.keyboard.down('w'); await page.waitForTimeout(180); await page.keyboard.up('w'); await pause(); assert.equal((await wakeSample()).visible, false, 'Reduced motion suppresses the wake');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    pass('Real movement creates ocean/lake wakes at rendered water heights, clips lake shore triangles, freezes exact pause buffers and respects reduced motion');

    // Receiving-water buffers must keep their exact paused cache behavior.
    await restore('rainLow'); await capture('rain-low-ocean'); const low = await inspect('rain-low-ocean');
    assert(low.named['pilot-rain-water-impacts'].visible && Number(low.dataset.rainWaterImpactCount) > 0, 'Low ocean rain has actual receiving-water contacts');
    const contactSample = () => page.evaluate(() => { const s = pilotReview.scene, o = s.getObjectByName('pilot-rain-water-impacts'); return { bufferUpdates: s.getObjectByName('pilot-rain-field').userData.bufferUpdates, visible: o.visible, position: o.position.toArray(), geometry: o.geometry.uuid, attributes: Object.fromEntries(Object.entries(o.geometry.attributes).map(([key, a]) => [key, Array.from(a.array)])) }; });
    const cached = await contactSample(); await page.waitForTimeout(180); assert.deepEqual(await contactSample(), cached, 'Paused rain contact buffers are exact');
    const lookBox = await canvas.boundingBox(); await page.mouse.move(lookBox.x + lookBox.width * .22, lookBox.y + lookBox.height * .65); await page.mouse.down(); await page.mouse.move(lookBox.x + lookBox.width * .22 + 26, lookBox.y + lookBox.height * .65, { steps: 3 }); await page.mouse.up();
    await page.waitForFunction(count => pilotReview.scene.getObjectByName('pilot-rain-field').userData.bufferUpdates > count, cached.bufferUpdates); const looked = await contactSample();
    await resume(); await page.waitForFunction(count => pilotReview.scene.getObjectByName('pilot-rain-field').userData.bufferUpdates > count, looked.bufferUpdates); await pause();
    result.rainCache = { pausedUpdates: cached.bufferUpdates, lookUpdates: looked.bufferUpdates, resumedUpdates: (await contactSample()).bufferUpdates };
    pass('Rain water contacts retain exact paused caching and invalidate on real look and flight input');
    }

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const name of ['freezing', 'deposition']) for (const cameraMode of ['follow', 'water']) {
      await restore('before-' + name, { cameraMode }); const before = await handoff();
      assert(!before.visible && before.data.active === 'hidden', 'Restore clears stale phase visuals');
      await page.evaluate(name => { window.fluidityDriveInput = { ...fluidityTransitions[name].input }; }, name); await resume();
      await page.waitForFunction(name => { const c = document.querySelector('#wcPilotCanvas'); return c.dataset.parcelForm === fluidityTransitions[name].after.form && c.dataset.phaseHandoff === 'active' && waterReviewData.pilot.paused; }, name);
      await settle(); const event = await handoff();
      const kernel = await page.evaluate(name => ({ before: fluidityTransitions[name].before.form, after: fluidityTransitions[name].after.form, actual: fluidityLiveSteps, receipt: waterReviewData.pilot.lastChange }), name);
      assert.equal(event.data.from, kernel.before); assert.equal(event.data.to, kernel.after); assert.equal(event.data.kind, name);
      assert(kernel.receipt && kernel.receipt.from === kernel.before && kernel.receipt.to === kernel.after && kernel.actual.some(s => s.from === kernel.before && s.to === kernel.after), 'Real integrated transition preserves actual receipt');
      await page.waitForTimeout(200); assertPausedHandoff(await handoff(), event, 'Initial masks, rotations and buffers freeze exactly while paused');
      await resume(); await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .52); await pause();
      const midpoint = await handoff(); assert.equal(midpoint.data.active, 'active'); assert.equal(midpoint.data.kind, name);
      await capture(name + '-' + cameraMode + '-midpoint'); await inspect(name + '-' + cameraMode + '-midpoint');
      const still = await handoff(); await page.waitForTimeout(180); assertPausedHandoff(await handoff(), still, 'Midpoint masks, rotations and geometry remain exact while paused');
      for (const frame of [event, midpoint]) {
        const primary = frame.targets.find(m => m.name === 'pilot-ice-parcel'), incoming = frame.meshes.find(m => m.name === 'pilot-phase-incoming-ice'), frost = frame.meshes.find(m => m.name === 'pilot-phase-frost-front'), water = frame.meshes.find(m => m.name === 'pilot-phase-liquid-memory');
        assert(frame.revealBindings.previewSharesMaterial && frame.revealBindings.sharedProgress && frame.revealBindings.sharedActive && frame.revealBindings.maskedMaterials >= 5, 'Incoming ice, primary ice, ice edges and frost share the actual front bindings');
        assert(primary.revealUniforms && primary.revealUniforms.active.value === 1, 'Primary ice reveals through an active complementary mask');
        assert(primary.programKey.endsWith('-surface') && frost.programKey.endsWith('-line'), 'Surface and line materials compile the matching complementary reveal');
        assert.equal(incoming.visible, cameraMode === 'water', 'Pooled incoming ice is visible inside Water view');
        assert.equal(water.phaseUniforms.mode.value, name === 'freezing' ? 2 : 0, 'Liquid complement only clips real freezing');
        const visibleIce = cameraMode === 'water' ? incoming : primary;
        if (name === 'freezing') assert.deepEqual(water.quaternion, visibleIce.quaternion, 'Freezing keeps outgoing and incoming local nucleation directions aligned');
        assert.deepEqual(frost.quaternion, visibleIce.quaternion, 'Frost detail shares the visible incoming solid orientation');
        assert.equal(primary.revealUniforms.progress.value, water.phaseUniforms.progress.value, 'Incoming and outgoing fronts share exact progress');
        assert.equal(frame.energy.centerIntrusions, 0, 'Visible energy sparks leave the projected phase boundary clear');
      }
      result.transitions.push({ name, cameraMode, event, midpoint, kernel });
    }
    pass('Actual freezing and deposition render and pause correctly in follow and Water views');

    await page.emulateMedia({ reducedMotion: 'reduce' }); await restore('before-freezing', { pauseAtChanges: false });
    await page.evaluate(() => { window.fluidityDriveInput = { ...fluidityTransitions.freezing.input }; }); await resume();
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'active');
    const reduced = await handoff(); await page.waitForTimeout(260); const reducedLater = await handoff();
    assert.equal(reducedLater.data.progress, reduced.data.progress, 'Reduced-motion phase front stays at a readable stage'); assert(reducedLater.integratedSteps > reduced.integratedSteps, 'Reduced-motion real model advances'); await pause();
    await restore('cloud'); assert.equal((await handoff()).data.active, 'hidden');
    await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click(); await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid');
    const reset = await handoff(); assert.equal(reset.data.active, 'hidden'); assert.equal(reset.visible, false);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await restore('before-freezing', { pauseAtChanges: false });
    await page.evaluate(() => { window.fluidityDriveInput = { ...fluidityTransitions.freezing.input }; }); await resume();
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'active'); const live = await handoff();
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden', { timeout: 10000 }); await pause(); const expired = await handoff();
    assert.equal(expired.visible, false); assert.equal(expired.geometries, live.geometries); assert.equal(expired.materials, live.materials);
    result.lifecycle = { reducedProgress: reduced.data.progress, reducedSteps: [reduced.integratedSteps, reducedLater.integratedSteps], resetFront: reset.data, expiredFront: expired.data, resources: { geometries: expired.geometries, materials: expired.materials } };
    pass('Reduced-motion fronts stay static; restore/reset clear them; normal handoffs expire with fixed resources');
    assert.deepEqual(result.errors, []); pass('No page, WebGL or shader errors'); result.success = true;
  } catch (error) { result.success = false; result.harnessError = String(error); throw error; }
  finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
