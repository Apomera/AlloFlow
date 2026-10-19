'use strict';
// Isolated, real WebGL review of cloud/rain rendering and actual kernel handoffs.
// The fixture may provide deterministic collision inputs; it never assigns a
// form, forges a transition snapshot, or changes production source on disk.
// Run: node dev-tools/watercycle_pilot_realism_qa.cjs [--baseline] [--captures=...] [--transitions=...] [--midpoints] [--desktop-transitions] [--landing-audit] [--source=...] [--report=...]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const baseline = process.argv.includes('--baseline');
const runtimeOnly = process.argv.includes('--runtime-only');
const capturesArg = process.argv.find(arg => arg.startsWith('--captures='));
const captureFilter = capturesArg ? capturesArg.slice('--captures='.length).split(',') : runtimeOnly ? [] : null;
const transitionsArg = process.argv.find(arg => arg.startsWith('--transitions='));
const transitionFilter = transitionsArg ? transitionsArg.slice('--transitions='.length).split(',') : null;
const runLifecycle = !transitionFilter || process.argv.includes('--lifecycle');
const midpointCaptures = process.argv.includes('--midpoints');
const staticOnly = baseline || (!!capturesArg && !transitionFilter) || process.argv.includes('--static-only');
const reportArg = process.argv.find(arg => arg.startsWith('--report='));
const reportName = reportArg ? reportArg.slice('--report='.length) : null;
assert(!reportName || /^[a-z0-9-]+$/.test(reportName), 'Plain report folder name');
const out = path.join(root, 'reports/watercycle-pilot-realism', reportName || (baseline ? 'baseline' : runtimeOnly ? 'runtime-after' : transitionFilter ? 'portrait-after' : 'after'));
const temp = path.join(root, 'scratch/watercycle-pilot-realism-temp');
fs.mkdirSync(temp, { recursive: true }); fs.mkdirSync(out, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp;
const cachedBrowsers = path.join(process.env.USERPROFILE || 'C:/Users/cabba', 'AppData/Local/ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cachedBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = cachedBrowsers;
const { chromium } = require('playwright');
const sourceArg=process.argv.find(arg=>arg.startsWith('--source='));
const sourcePath=sourceArg?path.resolve(root,sourceArg.slice(9)):path.join(root,baseline?'reports/watercycle-pilot-realism/baseline-source.js':'stem_lab/stem_tool_watercycle.js');
assert(sourcePath.startsWith(root+path.sep),'Fixture source stays within workspace');
const source=fs.readFileSync(sourcePath,'utf8');
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_pilot_snow_lab_qa.cjs'), 'utf8').match(/const html = String.raw`([\s\S]*?)`;/)[1];
html = html.replace('renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};',
  'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.reviewRenderActive!==false){const result=render(scene,camera);window.reviewRenderCount=(window.reviewRenderCount||0)+1;return result;}};');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (pathname === '/stem_lab/stem_tool_watercycle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(pathname));
  const allowed = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => pathname.startsWith(prefix))) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream'); res.end(data); });
});
const result = { baseline, sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), checks: [], states: [], transitions: [], audits: [], errors: [] };
function pass(name) { result.checks.push(name); console.log('PASS ' + name); }
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
    // Keep production animation/React running while gating only subsequent GPU
    // draws in this development fixture. A native render preceded the gate.
    await page.evaluate(() => { window.reviewRenderActive = false; });
  }
  async function capture(name) {
    await canvas.scrollIntoViewIfNeeded(); await settle(); await draw();
    const box = await canvas.boundingBox(); assert(box && box.width >= 250 && box.height >= 180);
    try { await page.screenshot({ path: path.join(out, name + '.png'), clip: { x: box.x, y: box.y, width: box.width, height: box.height }, animations: 'disabled', timeout: 45000 }); } catch(error) { result.captureRetries = result.captureRetries || []; result.captureRetries.push({name, error:String(error)}); await page.screenshot({ path: path.join(out, name + '.png'), clip: { x: box.x, y: box.y, width: box.width, height: box.height }, timeout:30000 }); }
    console.log('CAPTURE ' + name);
  }
  async function restore(name, { cameraMode = 'follow', theme = 'light', pauseAtChanges = true } = {}) {
    await page.evaluate(({ name, cameraMode, theme, pauseAtChanges }) => {
      window.reviewRenderActive = false; window.atmosphereDriveInput = null; window.atmosphereLiveSteps = []; window.atmosphereTotalSteps = 0;
      const checkpoint = atmosphereStates[name];
      mountWater({ wcMode: 'pilot', pilot: { scenario: checkpoint.scenario, onboardingComplete: true, paused: true, pauseAtChanges, navigationAssist: false, showMolecules: false, cameraMode, resumeCheckpoint: { ...checkpoint, cameraMode }, resumeToken: 'atmosphere-' + name + '-' + Date.now() } }, theme);
    }, { name, cameraMode, theme, pauseAtChanges });
    await page.waitForFunction(({ name, cameraMode }) => {
      const c = document.querySelector('#wcPilotCanvas');
      return window.pilotReview && c && c.dataset.parcelForm === atmosphereStates[name].form && c.dataset.pilotCamera === cameraMode && waterReviewData.pilot.snapshot.form === atmosphereStates[name].form;
    }, { name, cameraMode }); await settle();
  }
  async function inspect(name) {
    const info = await page.evaluate(() => {
      const p = pilotReview, named = {};
      let finite = true, geometries = 0, materials = 0;
      p.scene.traverse(o => {
        if (o.name && /pilot-|cloud|rain/i.test(o.name)) named[o.name] = { visible: o.visible, type: o.type, children: o.children.length, userData: JSON.parse(JSON.stringify(o.userData)) };
        finite = finite && o.position.toArray().every(Number.isFinite) && o.scale.toArray().every(Number.isFinite) && o.quaternion.toArray().every(Number.isFinite);
        if(o.instanceMatrix) finite = finite && Array.from(o.instanceMatrix.array).every(Number.isFinite);
        if (o.geometry) { geometries++; for (const a of Object.values(o.geometry.attributes || {})) finite = finite && Array.from(a.array).every(Number.isFinite); }
        for (const m of o.material ? Array.isArray(o.material) ? o.material : [o.material] : []) { materials++; for (const key of ['opacity', 'roughness', 'metalness']) if (m[key] !== undefined) finite = finite && Number.isFinite(m[key]); }
      });
      const c=document.querySelector('#wcPilotCanvas'), box=c.getBoundingClientRect(), parcel=p.scene.getObjectByName('pilot-water-parcel');
      const projected=parcel.getWorldPosition(new THREE.Vector3()).project(p.camera);
      const center={x:box.left+(projected.x+1)*box.width*.5,y:box.top+(1-projected.y)*box.height*.5};
      const blockers=Array.from(c.parentElement.querySelectorAll('*')).filter(el=>{if(el===c||el.contains(c))return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>2&&r.height>2&&r.width*r.height<box.width*box.height*.9&&center.x>r.left&&center.x<r.right&&center.y>r.top&&center.y<r.bottom&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>.15&&((s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.backgroundColor!=='transparent')||s.backgroundImage!=='none');}).map(el=>({tag:el.tagName,className:String(el.className),rect:{x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}}));
      return { parcelScreen:{center,blockers}, dataset: { ...c.dataset }, form: document.querySelector('#wcPilotCanvas').dataset.parcelForm, cameraMode: document.querySelector('#wcPilotCanvas').dataset.pilotCamera, finite, geometries, materials, named, resources: JSON.parse(JSON.stringify(p.renderer.info.memory)), programs: p.renderer.info.programs.length, snapshot: JSON.parse(JSON.stringify(waterReviewData.pilot.snapshot)) };
    });
    assert(info.finite && info.geometries > 0 && info.materials > 0, 'Finite real scene'); if(info.cameraMode==='follow'&&['cloud','rain'].includes(info.form)&&!name.startsWith('transition-')) assert.deepEqual(info.parcelScreen.blockers,[],'Actual primary parcel center clears painted HUD rectangles'); result.states.push({ name, ...info }); return info;
  }
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForFunction(() => window.pilotReview && window.waterReviewData.pilot.snapshot);
    assert(await canvas.evaluate(c => { const gl = c.getContext('webgl2') || c.getContext('webgl'); return !!gl && !gl.isContextLost(); }));
    await page.evaluate(() => {
      window.reviewRenderActive = false;
      const k = WaterCyclePilotKernel, original = k.step;
      const states = {}, transitions = {};
      const advance = (start, input, limit, desired) => { let s = start; for (let n = 0; n < limit; n++) { const next = original(s, input); if (next.form !== s.form && (!desired || next.form === desired)) return { before: s, after: next, input }; s = next; } throw Error('Production kernel did not reach ' + desired); };
      states.surface = k.practiceState('surface', 'tropicalOcean');
      states.vapor = k.practiceState('cloud', 'tropicalOcean');
      transitions.evaporation = advance(states.surface, { dt: .12, sunlit: true, surface: 'water' }, 10000, 'vapor');
      transitions.condensation = advance(states.vapor, { dt: .12, nucleusHit: true }, 100, 'droplet');
      states.droplet = transitions.condensation.after;
      transitions.cloud = advance(states.droplet, { dt: .12, dropletHit: true }, 100, 'cloud'); states.cloud = transitions.cloud.after;
      transitions.rain = advance(states.cloud, { dt: .12, dropletHit: true }, 100, 'rain'); states.rain = transitions.rain.after;
      states.practiceRain = k.practiceState('rain', 'tropicalOcean');
      { let low = states.rain; for(let n=0;n<10000 && low.altitudeM>28;n++) low=original(low,{dt:.12,surface:'water'}); if(low.form!=='rain'||low.altitudeM<=0)throw Error('Real falling rain did not reach low ocean checkpoint'); states.rainLow=low; }
      // The cold mountain practice condenses directly from vapour to ice. To
      // test freezing, genuinely loft an already liquid tropical cloud droplet
      // through the freezing level instead of calling deposition "freezing".
      transitions.freezing = advance(states.droplet, { dt: .12, thrust: 1 }, 12000, 'ice'); states.ice = transitions.freezing.after;
      transitions.deposition = advance(k.practiceState('cloud', 'mountainWinter'), { dt: .12, nucleusHit: true, thrust: 1 }, 100, 'ice');
      transitions.snow = advance(states.ice, { dt: .12, dropletHit: true }, 100, 'snow'); states.snow = transitions.snow.after;
      for (const [key, transition] of Object.entries(transitions)) states['before-' + key] = transition.before;
      window.atmosphereStates = states; window.atmosphereTransitions = transitions;
      window.atmosphereLiveSteps = [];
      k.step = function(state, input) {
        window.atmosphereTotalSteps = (window.atmosphereTotalSteps || 0) + 1;
        const drive = window.atmosphereDriveInput;
        if (drive) window.atmosphereDriveInput = null;
        const actualInput = drive ? { ...input, ...drive } : input;
        const next = original(state, actualInput);
        if (drive || next.form !== state.form) atmosphereLiveSteps.push({ from: state.form, to: next.form, elapsed: next.elapsed, input: actualInput });
        return next;
      };
    });
    const forms = await page.evaluate(() => Object.fromEntries(Object.entries(atmosphereStates).map(([n, s]) => [n, s.form])));
    assert.equal(forms.cloud, 'cloud'); assert.equal(forms.droplet, 'droplet'); assert.equal(forms.rain, 'rain'); assert.equal(forms.ice, 'ice');
    assert.equal(forms.rainLow, 'rain');
    pass('Checkpoints and pre-transition states are generated by genuine production kernel integration');
    for (const name of ['vapor', 'droplet', 'cloud', 'rain', 'snow', 'rainLow']) { if (captureFilter && !captureFilter.includes(name + '-desktop')) continue; await restore(name); await capture(name + '-desktop'); const info=await inspect(name); if(name==='rainLow') { assert(info.named['pilot-rain-water-impacts'].visible,'Low rain shows its receiving-water pool'); assert(Number(info.dataset.rainWaterImpactCount)>0,'Actual receiving-water contacts publish active ripple count'); const sample=()=>page.evaluate(()=>{const o=pilotReview.scene.getObjectByName('pilot-rain-water-impacts');return {bufferUpdates:pilotReview.scene.getObjectByName('pilot-rain-field').userData.bufferUpdates,visible:o.visible,position:o.position.toArray(),geometry:o.geometry.uuid,attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([key,a])=>[key,Array.from(a.array)]))};}); const paused=await sample(); await page.waitForTimeout(180); assert.deepEqual(await sample(),paused,'Receiving-water ripple buffers freeze while paused'); assert(Number.isFinite(paused.bufferUpdates),'Rain pool exposes its bounded rebuild counter'); const lookBox=await canvas.boundingBox(); await page.mouse.move(lookBox.x+lookBox.width*.22,lookBox.y+lookBox.height*.65); await page.mouse.down(); await page.mouse.move(lookBox.x+lookBox.width*.22+26,lookBox.y+lookBox.height*.65,{steps:3}); await page.mouse.up(); await page.waitForFunction(count=>pilotReview.scene.getObjectByName('pilot-rain-field').userData.bufferUpdates>count,paused.bufferUpdates); const looked=await sample(); await page.getByRole('button',{name:'Resume the simulation',exact:true}).click(); await page.waitForFunction(count=>pilotReview.scene.getObjectByName('pilot-rain-field').userData.bufferUpdates>count,looked.bufferUpdates); await page.evaluate(()=>{if(!waterReviewData.pilot.paused)document.querySelector('[data-control=\"pause\"]').click();}); const resumed=await sample(); result.rainCache={pausedUpdates:paused.bufferUpdates,lookUpdates:looked.bufferUpdates,resumedUpdates:resumed.bufferUpdates}; pass('Genuine low ocean rain renders active water contacts; paused cache holds exact buffers and resumes rebuilding when the parcel moves'); } }
    for (const name of ['cloud', 'rain']) { if (captureFilter && !captureFilter.includes(name + '-water-desktop')) continue; await restore(name, { cameraMode: 'water' }); await capture(name + '-water-desktop'); const info = await inspect(name + '-water'); assert.equal(info.named['pilot-water-parcel'].visible, false); }
    if (!runtimeOnly) pass('Selected atmospheric forms and first-person cloud/rain render finite buffers, materials and transforms');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 940 });
      for (const name of ['cloud', 'rain']) {
        if (captureFilter && !captureFilter.includes(name + '-phone-' + width)) continue;
        await restore(name); await capture(name + '-phone-' + width); await inspect(name + '-phone-' + width);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No phone overflow');
      }
    }
    if (result.states.some(state=>state.name.includes('-phone-'))) pass('Selected cloud/rain fit 390 and 320 px phone canvases without horizontal page overflow');
    if(process.argv.includes('--landing-audit')) {
      await page.setViewportSize({width:320,height:940}); await restore('rain'); await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
      for(const theme of ['light','dark','contrast']) { await restore('rain',{theme}); const selector='.wc-pilot-route.is-landing'; const violations=await page.evaluate(async selector=>(await axe.run(selector,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),selector);result.audits.push({theme,selector,width:320,violations});assert.deepEqual(violations,[]); } pass('Three scoped WCAG AA audits pass for compact phone landing strip');
    }
    if (!staticOnly) {
      if (!transitionFilter) await page.setViewportSize({ width: 1280, height: 1000 });
      else { if(process.argv.includes('--desktop-transitions')) await page.setViewportSize({ width:1280, height:1000 }); await page.emulateMedia({ reducedMotion: 'no-preference' }); }
      await restore('cloud');
      const parcelChildren = () => page.evaluate(() => pilotReview.scene.getObjectByName('pilot-water-parcel').children.map(o => ({ type: o.type, name: o.name, visible: o.visible, position: o.position.toArray(), scale: o.scale.toArray(), quaternion: o.quaternion.toArray() })));
      const restoredCloud = await parcelChildren(); await page.waitForTimeout(400); assert.deepEqual(await parcelChildren(), restoredCloud, 'Restored cloud growth is settled while paused');
      pass('Restored cloud parcel keeps stable visible geometry and settled scale while paused');
      const handoff = () => page.evaluate(() => {
        const c = document.querySelector('#wcPilotCanvas'), o = pilotReview.scene.getObjectByName('pilot-phase-handoff');
        const meshes = []; const geometries = new Set(), materials = new Set();
        if (o) o.traverse(child => {
          if (child.geometry) geometries.add(child.geometry.uuid);
          for (const m of child.material ? Array.isArray(child.material) ? child.material : [child.material] : []) materials.add(m.uuid);
          meshes.push({ name: child.name, visible: child.visible, position: child.position.toArray(), scale: child.scale.toArray(), quaternion: child.quaternion.toArray(), opacity: child.material && child.material.opacity, phaseUniforms: child.material && child.material.userData && JSON.parse(JSON.stringify(child.material.userData.phaseFront || null)), userData: JSON.parse(JSON.stringify(child.userData)), instanceMatrix: child.instanceMatrix ? Array.from(child.instanceMatrix.array) : null, positions: child.geometry && child.geometry.attributes.position ? Array.from(child.geometry.attributes.position.array) : null });
        });
        const parcel = p => ({ name: p.name, visible: p.visible, position: p.position.toArray(), scale: p.scale.toArray(), quaternion: p.quaternion.toArray() });
        return { found: !!o, visible: o && o.visible, data: { active: c.dataset.phaseHandoff, kind: c.dataset.phaseHandoffKind, from: c.dataset.phaseHandoffFrom, to: c.dataset.phaseHandoffTo, progress: c.dataset.phaseHandoffProgress, front: c.dataset.phaseFront }, userData: o && JSON.parse(JSON.stringify(o.userData)), geometries: geometries.size, materials: materials.size, meshes, targets: pilotReview.scene.getObjectByName('pilot-water-parcel').children.map(parcel), form: c.dataset.parcelForm, integratedSteps: window.atmosphereTotalSteps || 0 };
      });
      const expectedKinds = { evaporation: 'evaporation', condensation: 'condensation', cloud: 'cloud-assembly', rain: 'precipitation-release', freezing: 'freezing', snow: 'ice-growth', deposition: 'deposition' };
      for (const name of Object.keys(expectedKinds)) {
        if (transitionFilter && !transitionFilter.includes(name)) continue;
        await restore('before-' + name);
        const before = await handoff(); assert(before.found && !before.visible && before.data.active === 'hidden', 'Restore starts with no stale handoff');
        await page.evaluate(name => { window.atmosphereDriveInput = { ...atmosphereTransitions[name].input }; }, name);
        await page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
        try {
          await page.waitForFunction(name => { const c = document.querySelector('#wcPilotCanvas'); return c.dataset.parcelForm === atmosphereTransitions[name].after.form && c.dataset.phaseHandoff === 'active' && waterReviewData.pilot.paused; }, name);
        } catch (error) {
          result.failure = await page.evaluate(name => ({ name, expected: atmosphereTransitions[name], steps: atmosphereLiveSteps, queue: atmosphereDriveInput, pilot: waterReviewData.pilot, canvas: { ...document.querySelector('#wcPilotCanvas').dataset } }), name);
          console.log('FAILED PHASE ' + JSON.stringify(result.failure)); throw error;
        }
        await settle();
        const event = await handoff();
        const kernel = await page.evaluate(name => ({ before: atmosphereTransitions[name].before.form, after: atmosphereTransitions[name].after.form, actual: atmosphereLiveSteps, receipt: waterReviewData.pilot.lastChange }), name);
        assert.equal(event.data.from, kernel.before); assert.equal(event.data.to, kernel.after); assert.equal(event.data.kind, expectedKinds[name]); assert(event.visible);
        const bead = event.meshes.find(m => m.name === 'pilot-phase-condensation-beads');
        const frost = event.meshes.find(m => m.name === 'pilot-phase-frost-front');
        assert(bead && frost, 'Pooled beaded condensation and frost-front meshes exist');
        assert.equal(bead.visible, name === 'condensation', 'Condensation beads only accompany the actual vapor-to-liquid change');
        assert.equal(frost.visible, name === 'freezing' || name === 'deposition', 'Frost front only accompanies actual ice formation');
        assert(kernel.receipt && kernel.receipt.from === kernel.before && kernel.receipt.to === kernel.after, 'Scene preserved the actual live form receipt');
        assert(kernel.actual.some(step => step.from === kernel.before && step.to === kernel.after), 'Production kernel made actual phase transition during normal scene step');
        assert.equal(event.geometries, before.geometries); assert.equal(event.materials, before.materials);
        assert(Number.isFinite(Number(event.data.progress)) && Number(event.data.progress) >= 0 && Number(event.data.progress) <= 1);
        await page.waitForTimeout(350); assert.deepEqual(await handoff(), event, 'Paused handoff geometry and progress stay fixed');
        if (!transitionFilter || transitionFilter.includes(name)) await capture('transition-' + name);
        let midpoint = null;
        if (midpointCaptures) {
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
          await page.waitForFunction(() => Number(document.querySelector('#wcPilotCanvas').dataset.phaseHandoffProgress) >= .52);
          await page.evaluate(() => document.querySelector('[data-control=\"pause\"]').click()); await settle();
          midpoint = await handoff();
          assert.equal(midpoint.data.kind, expectedKinds[name]); assert.equal(midpoint.data.active, 'active');
          await capture('transition-' + name + '-midpoint');
          const still = await handoff(); await page.waitForTimeout(160); assert.deepEqual(await handoff(), still, 'Midpoint remains frozen while paused');
          await inspect('transition-' + name + '-midpoint');
        }
        result.transitions.push({ name, event, midpoint, kernel });
      }
      if (result.transitions.length) pass(result.transitions.length + ' actual kernel phase changes trigger correctly named pooled handoffs, publish real form receipts, and freeze during pause');
      if (runLifecycle) {
      // Reduced motion suppresses the moving morph even if the learner resumes;
      // the production model is allowed to continue integrating underneath it.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await restore('before-evaporation', { pauseAtChanges: false });
      await page.evaluate(() => { window.atmosphereDriveInput = { ...atmosphereTransitions.evaporation.input }; });
      await page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'active');
      const reduced = await handoff(); await page.waitForTimeout(450); const reducedLater = await handoff();
      assert.equal(reducedLater.data.progress, reduced.data.progress, 'Reduced-motion handoff stays at one readable stage');
      assert(reducedLater.integratedSteps > reduced.integratedSteps, 'The real model continues while reduced-motion presentation is static');
      await page.getByRole('button', { name: 'Pause the simulation', exact: true }).click();
      await restore('cloud'); assert.equal((await handoff()).data.active, 'hidden'); assert.equal((await handoff()).visible, false);
      await page.getByRole('button', { name: 'Reset this run and start again as liquid water', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid');
      assert.equal((await handoff()).data.active, 'hidden'); assert.equal((await handoff()).visible, false);
      pass('Reduced motion keeps handoffs static while the model advances; restore and restart clear stale phase visuals');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await restore('before-evaporation', { pauseAtChanges: false });
      await page.evaluate(() => { window.atmosphereDriveInput = { ...atmosphereTransitions.evaporation.input }; });
      await page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'active');
      const moving = await handoff(); await page.waitForTimeout(180); const movingLater = await handoff();
      assert(Number(movingLater.data.progress) > Number(moving.data.progress), 'Normal-motion cue progresses while running');
      await page.evaluate(() => document.querySelector('[data-control="pause"]').click()); await settle();
      const paused = await handoff(); await page.waitForTimeout(350); assert.deepEqual(await handoff(), paused);
      await page.getByRole('button', { name: 'Resume the simulation', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.phaseHandoff === 'hidden', { timeout: 10000 });
      const expired = await handoff(); assert.equal(expired.visible, false); assert.equal(expired.geometries, moving.geometries); assert.equal(expired.materials, moving.materials);
      pass('Normal-motion handoff progresses, pauses exactly, expires, and reuses fixed GPU resources');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 320, height: 940 });
      await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
      for (const theme of ['light', 'dark', 'contrast']) {
        await restore('cloud', { theme });
        for (const selector of ['.wc-pilot-navigation', '.wc-pilot-practice-lab']) {
          if (selector.includes('practice')) await page.locator(selector).evaluate(el => { el.open = true; });
          const violations = await page.evaluate(async selector => (await axe.run(selector, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), selector);
          result.audits.push({ theme, selector, width: 320, violations }); assert.deepEqual(violations, []);
        }
      }
      pass('Six scoped WCAG AA audits pass for phone navigation and practice controls across three themes');
      }
    }
    assert.deepEqual(result.errors, []); pass('No page, WebGL or shader errors');
    result.success = true;
  } catch (error) {
    result.success = false; result.harnessError = String(error); throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
