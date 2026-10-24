'use strict';
// Focused WebGL review of Be the Water visual polish. Physics/evidence remain
// owned by the production kernel: every restored view starts from a practice
// checkpoint and any later state is integrated with WaterCyclePilotKernel.step.
// Run: node dev-tools/watercycle_pilot_visual_polish_qa.cjs [--baseline | --nuclei-only | --states=storedCold,storedWarm,rain]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const baseline = process.argv.includes('--baseline');
const nucleiOnly = process.argv.includes('--nuclei-only');
const statesArg = process.argv.find(arg => arg.startsWith('--states='));
const selectedStates = statesArg ? statesArg.slice('--states='.length).split(',').filter(Boolean) : null;
const out = path.join(root, 'reports', 'watercycle-pilot-visual-polish', selectedStates ? 'after-targeted' : nucleiOnly ? 'nuclei' : baseline ? 'baseline' : 'after');
const temp = path.join(root, 'scratch', 'watercycle-pilot-visual-polish-temp');
fs.mkdirSync(temp, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp;
const browserPath = path.join(process.env.USERPROFILE || 'C:/Users/cabba', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(browserPath)) process.env.PLAYWRIGHT_BROWSERS_PATH = browserPath;
const { chromium } = require('playwright');
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_pilot_snow_lab_qa.cjs'), 'utf8').match(/const html = String.raw`([\s\S]*?)`;/)[1];
html = html.replace('renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};',
  'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.reviewRenderActive!==false){const result=render(scene,camera);window.reviewRenderCount=(window.reviewRenderCount||0)+1;return result;}};');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (pathname === '/stem_lab/stem_tool_watercycle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname));
  const permitted = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!file.startsWith(root + path.sep) || !permitted.some(prefix => pathname.startsWith(prefix))) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream'); res.end(data);
  });
});
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js'));
const result = { baseline, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], states: [], audits: [], errors: [] };
const pass = name => { result.checks.push(name); console.log('PASS ' + name); };
(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text())) result.errors.push(message.text()); });
  const canvas = page.locator('#wcPilotCanvas');
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  async function renderFrame() {
    const previous = await page.evaluate(() => { window.reviewRenderActive = true; return window.reviewRenderCount || 0; });
    await page.waitForFunction(previous => window.reviewRenderCount > previous + 1, previous);
    // The native renderer has now completed two real GPU draws. Suppress later
    // draws only in this fixture so software WebGL cannot delay DOM/axe work.
    await page.evaluate(() => { window.reviewRenderActive = false; });
  }
  async function capture(name) {
    await canvas.scrollIntoViewIfNeeded(); await settle(); await renderFrame();
    const box = await canvas.boundingBox();
    assert(box && box.width > 200 && box.height > 180, 'Visible canvas bounds');
    await page.screenshot({ path: path.join(out, name + '.png'), clip: { x: box.x, y: box.y, width: box.width, height: box.height }, timeout: 15000, animations: 'disabled' });
  }
  async function restore(name, theme = 'light', cameraMode = 'follow') {
    await page.evaluate(({ name, theme, cameraMode }) => {
      window.reviewRenderActive = false;
      const checkpoint = window.polishCheckpoints[name];
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges: true, navigationAssist: false, showMolecules: false, cameraMode, resumeCheckpoint: checkpoint, resumeToken: 'visual-' + name + '-' + Date.now(), snowTempC: checkpoint.snowTempC, snowHumidity: checkpoint.snowHumidity } }, theme);
    }, { name, theme, cameraMode });
    await page.waitForFunction(({ name, cameraMode }) => {
      const checkpoint = polishCheckpoints[name], c = document.querySelector('#wcPilotCanvas');
      return window.pilotReview && c && c.dataset.parcelForm === checkpoint.form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === checkpoint.form;
    }, { name, cameraMode });
    await settle();
  }
  async function inspect(name) {
    const info = await page.evaluate(() => {
      const names = ['pilot-water-parcel', 'pilot-liquid-parcel', 'pilot-cloud-droplet', 'pilot-rain-parcel', 'pilot-ice-parcel', 'pilot-snow-parcel', 'pilot-snowpack-storage'];
      const found = Object.fromEntries(names.map(name => [name, !!pilotReview.scene.getObjectByName(name)]));
      const storage = pilotReview.scene.getObjectByName('pilot-snowpack-storage');
      let finite = true, meshes = 0, materials = 0;
      pilotReview.scene.traverse(object => {
        finite = finite && object.position.toArray().every(Number.isFinite) && object.scale.toArray().every(Number.isFinite) && object.quaternion.toArray().every(Number.isFinite);
        if (object.geometry) { meshes++; for (const attribute of Object.values(object.geometry.attributes || {})) finite = finite && Array.from(attribute.array).every(Number.isFinite); }
        for (const material of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) { materials++; for (const key of ['opacity', 'roughness', 'metalness', 'ior']) if (material[key] !== undefined) finite = finite && Number.isFinite(material[key]); }
      });
      const liquid = pilotReview.scene.getObjectByName('pilot-liquid-parcel');
      const contact = pilotReview.scene.getObjectByName('pilot-water-contact');
      const opticalForms = ['pilot-liquid-parcel', 'pilot-cloud-droplet', 'pilot-rain-parcel'].map(name => pilotReview.scene.getObjectByName(name));
      const parcel = pilotReview.scene.getObjectByName('pilot-water-parcel');
      const parcelPosition = parcel.getWorldPosition(new THREE.Vector3());
      const snowPosition = storage.getWorldPosition(new THREE.Vector3());
      const nuclei = pilotReview.scene.getObjectByName('pilot-condensation-nuclei');
      return { form: document.querySelector('#wcPilotCanvas').dataset.parcelForm, found, finite, meshes, materials, snowVisible: storage.visible, snowScale: storage.scale.toArray(), snowUserData: storage.userData, camera: pilotReview.camera.position.toArray(), parcelPosition: parcelPosition.toArray(), snowPosition: snowPosition.toArray(), cameraParcelDistance: pilotReview.camera.position.distanceTo(parcelPosition), cameraSnowDistance: pilotReview.camera.position.distanceTo(snowPosition), parcelProjection: parcelPosition.clone().project(pilotReview.camera).toArray(), snowProjection: snowPosition.clone().project(pilotReview.camera).toArray(), opticalMaterial: { transmission: liquid.material.transmission, opacity: liquid.material.opacity, roughness: liquid.material.roughness }, opticalCacheKeys: opticalForms.map(mesh => mesh.material.customProgramCacheKey()), sharedEnvironment: opticalForms.every(mesh => mesh.material.envMap === liquid.material.envMap), contact: !!contact, contactVisible: contact ? contact.visible : false, contactChildren: contact ? contact.children.length : 0, nucleiVisible: nuclei.visible, nucleiNormalBlend: nuclei.material.blending === THREE.NormalBlending, nucleiDepthTest: nuclei.material.depthTest, nucleiDepthWrite: nuclei.material.depthWrite, resources: JSON.parse(JSON.stringify(pilotReview.renderer.info.memory)), programs: pilotReview.renderer.info.programs.length };
    });
    assert(Object.values(info.found).every(Boolean), 'Named parcel objects exist'); assert(info.finite && info.meshes > 0 && info.materials > 0, 'Finite geometry/materials/transforms');
    assert.equal(info.snowVisible, info.form === 'snowpack', 'Stored snow visibility follows the actual phase');
    assert.equal(info.nucleiVisible, info.form === 'vapor', 'Nuclei visibility follows the actual phase');
    if (!baseline && info.form === 'snowpack') {
      assert(Number.isFinite(info.snowUserData.groundHeight) && info.snowUserData.groundHeight > 0, 'Rendered land height is sampled for stored snow');
      assert(Math.abs(info.snowPosition[1] - info.snowUserData.groundHeight - .8) < 1e-7, 'Snow bed rests above rendered terrain');
      assert(Math.abs(info.parcelPosition[1] - info.snowUserData.groundHeight - 3.2) < 1e-7, 'Parcel and camera track the same terrain anchor');
    }
    result.states.push({ name, ...info });
  }
  try {
    await page.goto(url); await page.waitForFunction(() => window.pilotReview && window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c => { const gl = c.getContext('webgl2') || c.getContext('webgl'); return !!gl && !gl.isContextLost(); }), 'Actual WebGL context');
    await page.evaluate(() => {
      window.reviewRenderActive = false;
      const k = WaterCyclePilotKernel, states = {};
      states.surface = k.practiceState('surface', 'tropicalOcean');
      states.vapor = k.practiceState('cloud', 'tropicalOcean');
      states.rain = k.practiceState('rain', 'tropicalOcean');
      states.cloudDroplet = k.step(k.practiceState('cloud', 'tropicalOcean'), { dt: .12, nucleusHit: true });
      states.cloud = states.cloudDroplet;
      for (let i = 0; i < k.DROPLETS_FOR_CLOUD; i++) { const next = k.step(states.cloud, { dt: .12, dropletHit: true }); states.cloud = next; if (next.form === 'cloud') break; }
      states.ice = k.step(k.practiceState('cloud', 'mountainWinter'), { dt: .12, nucleusHit: true });
      // If mountain cloud base is warmer than freezing, integrate upward with
      // model thrust; the test never assigns a form or altitude.
      for (let i = 0; states.ice.form !== 'ice' && i < 12000; i++) states.ice = k.step(states.ice, { dt: .12, thrust: 1 });
      states.snow = k.practiceState('snow', 'frozenHighlands');
      let stored = states.snow;
      for (let i = 0; stored.form === 'snow' && i < 1000; i++) stored = k.step(stored, { dt: .12, surface: 'permeable', snowTempC: -10, snowHumidity: 100 });
      states.storedCold = stored; let warm = stored;
      for (let i = 0; warm.form === 'snowpack' && warm.meltProgress < .62 && i < 2000; i++) warm = k.step(warm, { dt: .12, surface: 'permeable', snowTempC: 15, snowHumidity: 100 });
      states.storedWarm = warm; states.soil = k.practiceState('soil', 'tropicalOcean');
      window.polishCheckpoints = states;
    });
    const forms = await page.evaluate(() => Object.fromEntries(Object.entries(polishCheckpoints).map(([key, value]) => [key, value.form])));
    assert.deepEqual(forms, { surface: 'liquid', vapor: 'vapor', rain: 'rain', cloudDroplet: 'droplet', cloud: 'cloud', ice: 'ice', snow: 'snow', storedCold: 'snowpack', storedWarm: 'snowpack', soil: 'soil' });
    pass('All visual checkpoints are generated by production practice/step APIs');
    if (selectedStates) {
      for (const name of selectedStates) {
        assert(Object.hasOwn(forms, name), 'Known kernel checkpoint: ' + name);
        await restore(name); await capture(name); await inspect(name);
        const state = result.states[result.states.length - 1];
        if (state.form === 'snowpack') {
          assert(Number.isFinite(state.snowUserData.groundHeight) && state.snowUserData.groundHeight > 0, 'Rendered land height is sampled for stored snow');
          assert(Math.abs(state.snowPosition[1] - state.snowUserData.groundHeight - .8) < 1e-7, 'Snow bed rests above rendered terrain');
          assert(Math.abs(state.parcelPosition[1] - state.snowUserData.groundHeight - 3.2) < 1e-7, 'Parcel and camera track the same terrain anchor');
          assert(Math.abs(state.snowProjection[0]) < .02 && Math.abs(state.snowProjection[1]) < .35, 'Terrain-anchored storage remains centered in follow view');
        }
        const elapsed = await canvas.getAttribute('data-parcel-elapsed');
        const pausedState = () => page.evaluate(() => { const s=waterReviewData.pilot.snapshot; return { form:s.form,elapsed:s.elapsed,melt:s.meltProgress,sublimation:s.sublimationProgress,camera:pilotReview.camera.position.toArray(),snow:pilotReview.scene.getObjectByName('pilot-snowpack-storage').position.toArray() }; });
        const before = await pausedState();
        await page.waitForTimeout(300);
        assert.equal(await canvas.getAttribute('data-parcel-elapsed'), elapsed);
        assert.deepEqual(await pausedState(), before);
        pass(name + ' real render has finite scene data and remains stable while paused');
      }
      const cold = result.states.find(state => state.name === 'storedCold'), warm = result.states.find(state => state.name === 'storedWarm');
      if (cold && warm) {
        assert.deepEqual(cold.snowPosition, warm.snowPosition); assert.deepEqual(cold.snowScale, warm.snowScale);
        assert(warm.snowUserData.wetness > cold.snowUserData.wetness, 'Genuine melt exposure changes wet surface without shrinking/moving reservoir');
        pass('Cold/warm snow uses the same sampled ground anchor and fixed size while wetness responds to integrated melt exposure');
      }
      assert.deepEqual(result.errors, []); pass('No browser or WebGL shader errors'); return;
    }
    if (nucleiOnly) {
      await restore('vapor'); await capture('vapor'); await inspect('vapor');
      const nuclei = await page.evaluate(() => { const object = pilotReview.scene.getObjectByName('pilot-condensation-nuclei'); return { visible: object.visible, blending: object.material.blending, normal: THREE.NormalBlending, depthTest: object.material.depthTest, depthWrite: object.material.depthWrite, textureWidth: object.material.map.image.width }; });
      assert(nuclei.visible && nuclei.blending === nuclei.normal && nuclei.textureWidth > 0 && nuclei.depthTest && !nuclei.depthWrite, 'Visible depth-aware nuclei use an actual point texture and normal alpha blending');
      pass('Vapor checkpoint renders textured condensation nuclei with normal alpha blending');
      assert.deepEqual(result.errors, []); pass('No browser or WebGL shader errors'); return;
    }
    for (const name of Object.keys(forms)) { await restore(name); await capture(name); await inspect(name); console.log('CAPTURE ' + name); }
    pass('Ten real rendered phase views have finite geometry, materials, named objects, resources, and correct snow visibility');
    if (!baseline) {
      const cold = result.states.find(s => s.name === 'storedCold'), warm = result.states.find(s => s.name === 'storedWarm');
      assert.equal(cold.snowUserData.visualModel, 'layered-snow-storage');
      assert.equal(cold.snowUserData.moundCount, 5); assert.equal(cold.snowUserData.granuleCount, 48);
      assert.equal(cold.snowUserData.storageScaleInvariant, true); assert.deepEqual(cold.snowScale, warm.snowScale);
      assert(warm.snowUserData.wetness > cold.snowUserData.wetness, 'Actual integrated melt exposure changes surface wetness');
      assert(result.states.every(state => state.contact), 'Water contact group exists in every mounted scene');
      assert(result.states.every(state => state.contactChildren === 2 && state.sharedEnvironment), 'Two pooled water contact rings and shared optical environment');
      assert(result.states.every(state => state.opticalCacheKeys.every(key => key === 'pilot-water-parcel-rim-v1')), 'All three optical forms compile the rim shader');
      const vapor = result.states.find(state => state.name === 'vapor');
      assert(vapor.nucleiVisible && vapor.nucleiNormalBlend && vapor.nucleiDepthTest && !vapor.nucleiDepthWrite, 'Vapor phase has readable, depth-tested condensation nuclei');
      assert(result.states.find(state => state.name === 'surface').contactVisible, 'Surface liquid has visible water contact');
      assert(result.states.filter(state => state.form !== 'liquid').every(state => !state.contactVisible), 'Water contact is hidden for other phases');
      pass('Layered snow, fixed reservoir size, melt wetness, and liquid contact geometry');
    }
    await restore('storedWarm'); await renderFrame();
    const frozen = () => page.evaluate(() => { const o = pilotReview.scene.getObjectByName('pilot-snowpack-storage'); return { elapsed: document.querySelector('#wcPilotCanvas').dataset.parcelElapsed, melt: waterReviewData.pilot.snapshot.meltProgress, sublimation: waterReviewData.pilot.snapshot.sublimationProgress, position: o.position.toArray(), scale: o.scale.toArray(), camera: pilotReview.camera.position.toArray(), children: o.children.map(c => ({ position: c.position.toArray(), scale: c.scale.toArray() })) }; });
    const before = await frozen(); await page.waitForTimeout(450); assert.deepEqual(await frozen(), before);
    pass('Paused reduced-motion state preserves kernel exposure, camera, snow transforms, and elapsed time');
    await restore('surface');
    for (const [label, mode] of [['Water view', 'water'], ['Follow view', 'follow']]) {
      const button = page.getByRole('button', { name: label, exact: true });
      if (!await button.count() && mode === 'follow') await page.getByRole('button', { name: /Follow view|Follow the water|Follow water/, exact: false }).first().click();
      else await button.click();
      await page.waitForFunction(mode => document.querySelector('#wcPilotCanvas').dataset.pilotCamera === mode, mode);
      assert.equal(await page.evaluate(() => pilotReview.scene.getObjectByName('pilot-water-parcel').visible), mode === 'follow');
      if (!baseline) assert.equal(await page.evaluate(() => pilotReview.scene.getObjectByName('pilot-water-contact').visible), mode === 'follow');
      await capture('surface-' + mode);
    }
    pass('Follow and Water view controls preserve phase and show/hide the parcel correctly');
    await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 940 }); await settle();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + ' has no horizontal overflow');
    }
    for (const theme of ['light', 'dark', 'contrast']) {
      await restore('storedWarm', theme); await settle();
      for (const selector of ['.wc-pilot-navigation', '.wc-pilot-practice-lab']) {
        if (selector.includes('practice')) await page.locator(selector).evaluate(el => { el.open = true; });
        const violations = await page.evaluate(async selector => (await axe.run(selector, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), selector);
        result.audits.push({ theme, width: 320, selector, violations }); assert.deepEqual(violations, []);
      }
    }
    pass('390/320 px layouts and six scoped accessibility audits in light/dark/high contrast');
    assert.deepEqual(result.errors, [], 'No page or WebGL shader errors'); pass('No browser or WebGL shader errors');
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
