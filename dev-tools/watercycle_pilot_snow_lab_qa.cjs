'use strict';
// Live WebGL acceptance checks for Be the Water practice starts and snow storage.
// Run: node dev-tools/watercycle_pilot_snow_lab_qa.cjs
// Preview: node dev-tools/watercycle_pilot_snow_lab_qa.cjs --serve --port=8771
// Retry only visual/accessibility evidence after a completed functional run:
// node dev-tools/watercycle_pilot_snow_lab_qa.cjs --audits-only
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = process.cwd();
const out = path.join(root, 'reports', 'watercycle-pilot-snow-lab');
const temporary = path.join(root, 'scratch', 'watercycle-pilot-snow-temp');
fs.mkdirSync(temporary, { recursive: true });
process.env.TEMP = temporary;
process.env.TMP = temporary;
const existingBrowsers = path.join(process.env.USERPROFILE || 'C:/Users/cabba', 'AppData', 'Local', 'ms-playwright');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(existingBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = existingBrowsers;
const { chromium } = require('playwright');

const html = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Be the Water snow laboratory</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#e8eef1;font-family:system-ui}main{max-width:1440px;margin:auto;padding:12px;box-sizing:border-box}@media(max-width:500px){main{padding:8px}}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script><script src="/vendor/three-r128/OrbitControls.js"></script>
<script>
const OriginalRenderer=THREE.WebGLRenderer;
THREE.WebGLRenderer=function(...args){const renderer=new OriginalRenderer(...args),render=renderer.render.bind(renderer);renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};return renderer;};
window.pilotExportSequence=0;
const createObjectURL=URL.createObjectURL.bind(URL),exportBlobs=new Map();
URL.createObjectURL=blob=>{const url=createObjectURL(blob);exportBlobs.set(url,blob);return url;};
document.addEventListener('click',event=>{const anchor=event.target.closest&&event.target.closest('a[download]');if(!anchor||!exportBlobs.has(anchor.href))return;event.preventDefault();const filename=anchor.download;exportBlobs.get(anchor.href).text().then(text=>{window.pilotLastExport={filename,text};window.pilotExportSequence++;});},true);
</script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountWater=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({waterCycle:seed,_threeLoaded:true});window.waterReviewData=data.waterCycle;window.waterReviewSet=setData;const noop=()=>{};
  return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:message=>{window.pilotAnnouncement=message;},awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('theme-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#0b1722':theme==='contrast'?'#000':'#e8eef1';ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};
const params=new URLSearchParams(location.search);mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true}},params.get('theme')||'light');
</script></body></html>`;
const allowed = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end('Missing asset'); return; }
    res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  const port = portArg ? Number(portArg.split('=')[1]) : process.argv.includes('--serve') ? Number(process.env.WATER_PILOT_SNOW_PORT || 8771) : 0;
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  if (process.argv.includes('--serve')) { console.log('Be the Water snow laboratory preview: ' + url); return; }
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const checks = [], audits = [], errors = [];
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text())) errors.push(message.text()); });
  const check = name => { if (!checks.includes(name)) checks.push(name); console.log('PASS ' + name); };
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const data = async () => { await settle(); return page.evaluate(() => JSON.parse(JSON.stringify(waterReviewData))); };
  const click = async name => { await page.getByRole('button', { name, exact: true }).click(); await settle(); };
  const expand = async selector => { const details = page.locator(selector); if (!await details.evaluate(el => el.open)) await details.locator(':scope > summary').click(); return details; };
  const pause = async () => { if (!(await data()).pilot.paused) await click('Pause the simulation'); };
  const resume = async () => { if ((await data()).pilot.paused) await click('Resume the simulation'); };
  const canvas = page.locator('#wcPilotCanvas');
  async function setRange(selector, value) {
    const input = page.locator(selector);
    const bounds = await input.evaluate(el => ({ min: Number(el.min), max: Number(el.max), step: Number(el.step) || 1 }));
    await input.focus();
    if (value === bounds.max) await page.keyboard.press('End');
    else {
      await page.keyboard.press('Home');
      for (let step = 0; step < Math.round((value - bounds.min) / bounds.step); step++) await page.keyboard.press('ArrowRight');
    }
    await settle();
    assert.equal(Number(await input.inputValue()), value, selector + ' keyboard value');
  }
  async function snowConditions(tempC, humidity) {
    await expand('.wc-pilot-practice-lab');
    await setRange('#wcPilotSnowTemp', tempC);
    await setRange('#wcPilotSnowHumidity', humidity);
    await page.waitForFunction(({ tempC, humidity }) => waterReviewData.pilot.snowTempC === tempC && waterReviewData.pilot.snowHumidity === humidity, { tempC, humidity });
  }
  async function rates() {
    return {
      melt: Number(await page.locator('[data-snow-melt-rate]').first().getAttribute('data-snow-melt-rate')),
      sublimation: Number(await page.locator('[data-snow-sub-rate]').first().getAttribute('data-snow-sub-rate'))
    };
  }
  async function assertFrozen(label) {
    const before = await data(), elapsed = await canvas.getAttribute('data-parcel-elapsed');
    const scene = await page.evaluate(() => { const o = pilotReview.scene.getObjectByName('pilot-snowpack-storage'); return o ? { visible: o.visible, position: o.position.toArray(), scale: o.scale.toArray() } : null; });
    await page.waitForTimeout(650);
    const after = await data();
    assert.equal(await canvas.getAttribute('data-parcel-elapsed'), elapsed, label + ' freezes simulation elapsed time');
    assert.equal(after.pilot.snapshot.meltProgress, before.pilot.snapshot.meltProgress, label + ' freezes melting');
    assert.equal(after.pilot.snapshot.sublimationProgress, before.pilot.snapshot.sublimationProgress, label + ' freezes sublimation');
    assert.deepEqual(await page.evaluate(() => { const o = pilotReview.scene.getObjectByName('pilot-snowpack-storage'); return o ? { visible: o.visible, position: o.position.toArray(), scale: o.scale.toArray() } : null; }), scene, label + ' freezes snow storage illustration');
  }
  async function restore(checkpoint, overrides = {}) {
    await page.evaluate(({ checkpoint, overrides }) => {
      waterReviewSet(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, pilot: { ...prev.waterCycle.pilot,
        paused: true, navigationAssist: false, pauseAtChanges: true, reviewChange: null, ...overrides,
        resumeCheckpoint: checkpoint, resumeToken: 'snow-qa-' + Math.random() } } }));
    }, { checkpoint, overrides });
    await page.waitForFunction(checkpoint => {
      const snapshot = waterReviewData.pilot.snapshot;
      return document.querySelector('#wcPilotCanvas').dataset.parcelForm === checkpoint.form && snapshot.form === checkpoint.form
        && Math.abs((snapshot.meltProgress || 0) - (checkpoint.meltProgress || 0)) < 1e-9
        && Math.abs((snapshot.sublimationProgress || 0) - (checkpoint.sublimationProgress || 0)) < 1e-9;
    }, checkpoint);
    await settle();
  }
  async function audit(selector, label) {
    const violations = await page.evaluate(async selector => (await axe.run(selector, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), selector);
    audits.push({ label, violations });
    fs.writeFileSync(path.join(out, 'accessibility.json'), JSON.stringify(audits, null, 2));
    assert.deepEqual(violations, [], label + ' accessibility');
  }
  async function download(name, filename) {
    const before = await page.evaluate(() => pilotExportSequence);
    await click(name);
    await page.waitForFunction(before => pilotExportSequence > before, before);
    const exported = await page.evaluate(() => pilotLastExport);
    assert(exported.filename, 'Actual export handler suggests a filename');
    fs.writeFileSync(path.join(out, filename), exported.text);
    return exported.text;
  }
  async function capture(selector, filename) {
    // Extra review images are optional. Software WebGL screenshot readback can
    // stall despite clean DOM geometry and axe results; it must not block the
    // accessibility matrix. The genuine storage-scene image is captured above.
    if (!process.argv.includes('--capture')) return;
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, filename), timeout: 5000 }).catch(error => console.warn('Optional screenshot skipped: ' + error.message.split('\n')[0]));
  }
  try {
    await page.goto(url);
    await page.waitForSelector('#wcPilotCanvas');
    await page.waitForFunction(() => window.pilotReview && window.waterReviewData.pilot.snapshot);
    await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
    const live = await canvas.evaluate(c => { const gl = c.getContext('webgl2') || c.getContext('webgl'); return !!gl && !gl.isContextLost(); });
    assert(live, 'A real WebGL context is running');
    check('Real React host and WebGL renderer');

    let receiptSeed;
    if (!process.argv.includes('--audits-only')) {

    await expand('.wc-pilot-practice-lab');
    assert.deepEqual(await page.locator('#wcPilotPractice option').evaluateAll(options => options.map(option => option.value)), ['surface', 'cloud', 'rain', 'snow', 'soil', 'plant']);
    for (const [practice, form] of [['surface', 'liquid'], ['cloud', 'vapor'], ['rain', 'rain'], ['soil', 'soil'], ['plant', 'plant'], ['snow', 'snow']]) {
      await expand('.wc-pilot-practice-lab');
      const before = await data(), ledger = JSON.stringify(before.pilot.notebookChanges || []), stages = JSON.stringify(before.pilot.stagesSeen || {});
      await page.locator('#wcPilotPractice').selectOption(practice);
      await page.locator('#wcPilotPracticeStart').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(({ practice, form }) => waterReviewData.pilot.snapshot && waterReviewData.pilot.snapshot.form === form && waterReviewData.pilot.snapshot.practiceOrigin === practice, { practice, form });
      const after = await data();
      assert.equal(after.pilot.paused, true, practice + ' begins at a paused boundary');
      assert.equal(JSON.stringify(after.pilot.notebookChanges || []), ledger, practice + ' does not invent a transition');
      assert.equal(JSON.stringify(after.pilot.stagesSeen || {}), stages, practice + ' does not award unvisited stages');
      assert.equal(after.pilot.snapshot.loops || 0, 0, practice + ' does not close a water cycle');
    }
    assert.equal((await data()).pilot.snapshot.altitudeM, 80);
    assert.equal((await data()).pilot.snapshot.scenario, 'frozenHighlands');
    check('Six keyboard practice starts preserve evidence and begin paused without fabricated stage or cycle credit');

    // Run the complete falling part of the snow practice. No form, position,
    // elapsed time, or receipt is written by this test during the descent.
    await page.evaluate(() => waterReviewSet(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, pilot: { ...prev.waterCycle.pilot, navigationAssist: false, pauseAtChanges: true } } })));
    await resume();
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'snowpack', null, { timeout: 45000 });
    await page.waitForFunction(() => waterReviewData.pilot.paused && waterReviewData.pilot.lastChange && waterReviewData.pilot.lastChange.to === 'snowpack');
    let current = await data();
    assert.equal(current.pilot.lastChange.from, 'snow');
    assert.equal(current.pilot.snapshot.altitudeM, 0);
    assert.equal(current.pilot.snapshot.note, 'landed');
    assert(['permeable', 'plant', 'hard'].includes(current.pilot.snapshot.snowLandingSurface));
    assert.equal(current.pilot.snapshot.loops, 0);
    const landingReceipt = JSON.stringify(current.pilot.lastChange);
    const storedSnow = JSON.parse(JSON.stringify(current.pilot.snapshot));
    await page.waitForFunction(() => pilotReview.scene.getObjectByName('pilot-snowpack-storage')?.visible);
    const geometry = await page.evaluate(() => {
      const storage = pilotReview.scene.getObjectByName('pilot-snowpack-storage'); let finite = true, meshes = 0;
      storage.traverse(object => { if (object.geometry?.attributes.position) { meshes++; finite = finite && Array.from(object.geometry.attributes.position.array).every(Number.isFinite); } });
      return { finite, meshes, position: storage.position.toArray(), parcel: pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray() };
    });
    assert(geometry.finite && geometry.meshes > 0, 'Stored snow uses finite, visible 3D geometry');
    await assertFrozen('Snow landing learning pause');
    await canvas.screenshot({ path: path.join(out, 'snow-storage-light-1280.png') });
    check('A real snowflake falls from its practice start, lands as stored snow, records evidence, and freezes its WebGL scene at the learning pause');

    // Readouts can respond during a pause; neither process exposure may move.
    await snowConditions(-10, 100);
    assert.deepEqual(await rates(), { melt: 0, sublimation: 0 });
    assert.equal(JSON.stringify((await data()).pilot.lastChange), landingReceipt, 'Changing conditions cannot relabel the landing receipt');
    await assertFrozen('Paused snow condition change');
    await resume();
    await page.waitForFunction(elapsed => Number(document.querySelector('#wcPilotCanvas').dataset.parcelElapsed) > elapsed + 0.8, (await data()).pilot.snapshot.elapsed);
    await pause();
    current = await data();
    assert.equal(current.pilot.snapshot.form, 'snowpack');
    assert.equal(current.pilot.snapshot.meltProgress, storedSnow.meltProgress);
    assert.equal(current.pilot.snapshot.sublimationProgress, storedSnow.sublimationProgress);
    await snowConditions(15, 100);
    const warmRates = await rates();
    assert(warmRates.melt > 0 && warmRates.sublimation === 0, 'Warm saturated air activates only the warm-air melt process');
    const warmStart = (await data()).pilot.snapshot.meltProgress;
    await resume();
    await page.waitForFunction(value => waterReviewData.pilot.snapshot.meltProgress > value + 0.02, warmStart);
    await pause();
    assert.equal((await data()).pilot.snapshot.sublimationProgress, storedSnow.sublimationProgress);
    await assertFrozen('Manual snow pause');
    check('Keyboard air controls alter actual integration rates; cold saturated storage persists and warm saturated air accumulates melting only');

    // Restore genuine stored-snow checkpoint data near the release threshold.
    // The live kernel still owns both phase changes and their receipts.
    const meltCheckpoint = { ...storedSnow, meltProgress: 0.995, sublimationProgress: 0, snowTempC: 15, snowHumidity: 100 };
    const routesBeforeMelt = (await data()).pilot.routes || {};
    await restore(meltCheckpoint, { snowTempC: 15, snowHumidity: 100 });
    await resume();
    const expectedMeltForm = await page.evaluate(surface => WaterCyclePilotKernel.landingForm(surface), storedSnow.snowLandingSurface);
    await page.waitForFunction(form => waterReviewData.pilot.snapshot.form === form && waterReviewData.pilot.paused, expectedMeltForm);
    current = await data();
    assert.equal(current.pilot.lastChange.from, 'snowpack');
    assert.equal(current.pilot.lastChange.to, expectedMeltForm);
    assert.equal(current.pilot.snapshot.note, 'snowmelt');
    assert.equal(current.pilot.lastChange.snowTempC, 15);
    assert.equal(current.pilot.lastChange.snowHumidity, 100);
    assert.equal(current.pilot.snapshot.loops, 0, 'Melting into a land route does not close a cycle');
    const meltRoute = { soil: 'infiltration', plant: 'plant', runoff: 'runoff' }[expectedMeltForm];
    if (meltRoute) assert.equal(current.pilot.routes[meltRoute], (routesBeforeMelt[meltRoute] || 0) + 1, 'Released meltwater receives its actual land-route credit');
    assert.equal(await page.evaluate(() => pilotReview.scene.getObjectByName('pilot-snowpack-storage').visible), false);
    assert(/melt|liquid/i.test(await page.locator('.wc-pilot-notice').innerText()));
    const meltReceipt = JSON.stringify(current.pilot.lastChange);
    await snowConditions(-10, 0);
    assert.equal(JSON.stringify((await data()).pilot.lastChange), meltReceipt, 'Live conditions never change frozen snowmelt evidence');
    check('Stored snow truly melts into the recorded landing surface pathway and retains its original measured conditions');

    await restore({ ...storedSnow, meltProgress: 0, sublimationProgress: 0.995, snowTempC: -10, snowHumidity: 0 }, { snowTempC: -10, snowHumidity: 0 });
    const dryRates = await rates();
    assert(dryRates.melt === 0 && dryRates.sublimation > 0, 'Cold dry air activates sublimation without melting');
    await resume();
    await page.waitForFunction(() => waterReviewData.pilot.snapshot.form === 'vapor' && waterReviewData.pilot.paused);
    current = await data();
    assert.equal(current.pilot.lastChange.from, 'snowpack');
    assert.equal(current.pilot.lastChange.to, 'vapor');
    assert.equal(current.pilot.snapshot.note, 'sublimation');
    assert.equal(current.pilot.lastChange.snowTempC, -10);
    assert.equal(current.pilot.lastChange.snowHumidity, 0);
    assert.equal(current.pilot.snapshot.loops, 0);
    assert.equal(await canvas.getAttribute('data-latent-energy-transfer'), 'absorbed-inward-to-water');
    assert(/sublim|solid|snow/i.test(await page.locator('.wc-pilot-notice').innerText()));
    await assertFrozen('Sublimation learning pause');
    receiptSeed = current;
    check('Cold dry stored snow truly sublimates to vapor with absorbed-energy evidence and no false cycle completion');

    // Preserve both process indices and the selected near-snow air through the
    // actual local notebook controls, page reload, and recovery button.
    const notebookCheckpoint = { ...storedSnow, meltProgress: 0.37, sublimationProgress: 0.24, snowTempC: -12, snowHumidity: 18 };
    await restore(notebookCheckpoint, { snowTempC: -12, snowHumidity: 18 });
    await page.locator('.wc-pilot-notebook').evaluate(el => { for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; });
    await page.locator('#wcPilotNotebookReflection').fill('I compared frozen storage, melting, and direct sublimation from the same snow practice.');
    await click('Save notebook');
    const saved = await page.evaluate(() => WaterCyclePilotNotebook.read(localStorage));
    assert.equal(saved.checkpoint.form, 'snowpack');
    for (const key of ['meltProgress', 'sublimationProgress', 'snowTempC', 'snowHumidity', 'practiceOrigin', 'snowLandingSurface']) assert.equal(saved.checkpoint[key], notebookCheckpoint[key], 'Notebook preserves ' + key);
    assert(saved.evidence.changes.some(change => change.from === 'snow' && change.to === 'snowpack'));
    assert(saved.evidence.changes.some(change => change.from === 'snowpack' && change.to === 'vapor'));
    const report = await download('Download readable report', 'snow-journey-report.txt');
    assert(/snow|sublim/i.test(report));
    assert(report.includes('-12') && report.includes('18'), 'Readable report carries frozen near-snow air conditions');
    assert(/practice|starting point|origin/i.test(report), 'Readable report identifies its practice origin');
    await page.reload();
    await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
    await page.waitForSelector('.wc-pilot-recovery');
    await click('Resume saved journey');
    await page.waitForFunction(() => waterReviewData.pilot.snapshot.form === 'snowpack');
    current = await data();
    assert(current.pilot.paused);
    for (const key of ['meltProgress', 'sublimationProgress', 'snowTempC', 'snowHumidity', 'practiceOrigin', 'snowLandingSurface']) assert.equal(current.pilot.snapshot[key], saved.checkpoint[key], 'Reload restores ' + key);
    assert.equal(Number(await page.locator('#wcPilotSnowTemp').inputValue()), -12);
    assert.equal(Number(await page.locator('#wcPilotSnowHumidity').inputValue()), 18);
    await assertFrozen('Recovered snow notebook');
    receiptSeed = current;
    fs.writeFileSync(path.join(out, 'recovered-snow-checkpoint.json'), JSON.stringify({ data: receiptSeed }, null, 2));
    check('Readable Blob export and real saved-notebook recovery retain process exposures, air conditions, practice origin, and the actual transition trail');

    await click('Reset this run and start again as liquid water');
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid');
    let resetState = await data();
    assert(!resetState.pilot.resumeCheckpoint && !resetState.pilot.resumeToken, 'Reset clears the old practice handoff');
    assert.equal(resetState.pilot.practiceOrigin, '');
    await page.evaluate(seed => mountWater(seed), resetState);
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid' && waterReviewData.pilot.snapshot?.form === 'liquid');
    await settle();
    assert.equal((await data()).pilot.snapshot.practiceOrigin, '', 'Remount after Reset cannot resurrect a practice');
    await expand('.wc-pilot-practice-lab');
    await page.locator('#wcPilotPractice').selectOption('snow');
    await page.locator('#wcPilotPracticeStart').click();
    await page.waitForFunction(() => waterReviewData.pilot.snapshot.form === 'snow');
    await expand('.wc-pilot-climate-drawer');
    await page.locator('.wc-pilot-scenario[data-scenario="tropicalOcean"]').click();
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid' && waterReviewData.pilot.snapshot?.scenario === 'tropicalOcean');
    resetState = await data();
    assert(!resetState.pilot.resumeCheckpoint && !resetState.pilot.resumeToken, 'Climate change clears the old practice handoff');
    assert.equal(resetState.pilot.practiceOrigin, '');
    await page.evaluate(seed => mountWater(seed), resetState);
    await page.waitForFunction(() => document.querySelector('#wcPilotCanvas').dataset.parcelForm === 'liquid' && waterReviewData.pilot.snapshot?.scenario === 'tropicalOcean');
    await settle();
    assert.equal((await data()).pilot.snapshot.practiceOrigin, '', 'Remount after climate change cannot resurrect a practice');
    check('Reset and climate change discard practice handoffs and remain ordinary liquid-water starts after a full React remount');
    } else {
      const prior = JSON.parse(fs.readFileSync(path.join(out, 'result.json'), 'utf8'));
      assert(prior.checks.some(name => name.startsWith('Reset and climate change')), 'Functional run must have completed before audit-only retry');
      assert(prior.checks.some(name => name.startsWith('Readable Blob export')), 'Notebook recovery must already be proven');
      assert.deepEqual(prior.errors, [], 'Previous functional run had no browser exceptions');
      const checkpointFile = fs.existsSync(path.join(out, 'recovered-snow-checkpoint.json')) ? 'recovered-snow-checkpoint.json' : 'failure-state.json';
      receiptSeed = JSON.parse(fs.readFileSync(path.join(out, checkpointFile), 'utf8')).data;
      assert.equal(receiptSeed.pilot.snapshot.form, 'snowpack', 'Retry uses the genuine recovered stored-snow checkpoint');
      assert.equal(receiptSeed.pilot.lastChange.from, 'snowpack');
      assert.equal(receiptSeed.pilot.lastChange.to, 'vapor');
      for (const name of prior.checks) if (!checks.includes(name)) checks.push(name);
    }

    // Reduced motion keeps the actual model active while removing illustration
    // motion; audit each newly introduced surface across phone and desktop.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const theme of ['light', 'dark', 'contrast']) for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1280 ? 1000 : 940 });
      await page.evaluate(({ seed, theme }) => mountWater({ ...seed, pilot: { ...seed.pilot, reviewChange: null } }, theme), { seed: receiptSeed, theme });
      await page.waitForSelector('.wc-pilot-practice-lab');
      await expand('.wc-pilot-practice-lab');
      await page.locator('#wcPilotReviewLatest').click();
      await page.waitForSelector('.wc-pilot-notice');
      await page.waitForFunction(() => window.pilotReview?.renderer.domElement === document.querySelector('#wcPilotCanvas'));
      // Actual model integration and WebGL rendering were proven above. These
      // paused semantic snapshots need DOM/CSS accessibility checks only; stop
      // GPU drawing while preserving React, layout, and requestAnimationFrame.
      await page.evaluate(() => { pilotReview.renderer.render = function() {}; });
      await page.locator('.wc-pilot-notebook').evaluate(el => { for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow ' + theme + ' ' + width);
      await audit('.wc-pilot-practice-lab', 'journey-lab-' + theme + '-' + width);
      await audit('.wc-pilot-notice', 'sublimation-receipt-' + theme + '-' + width);
      await audit('.wc-pilot-notebook', 'notebook-' + theme + '-' + width);
      const storageBox = await page.locator('.wc-pilot-snow-live').boundingBox();
      const rootBox = await page.locator('.wc-pilot-root').boundingBox();
      assert(storageBox.x >= rootBox.x - 1 && storageBox.x + storageBox.width <= rootBox.x + rootBox.width + 1, 'Stored-snow card stays inside the tool at ' + width);
      for (const meter of await page.locator('.wc-pilot-snow-live meter').all()) {
        const meterBox = await meter.boundingBox();
        assert(meterBox.x >= storageBox.x && meterBox.x + meterBox.width <= storageBox.x + storageBox.width + 1, 'Snow exposure meter stays inside its card at ' + width);
      }
      if (width === 320) await audit('.wc-pilot-snow-live', 'snow-storage-' + theme + '-320');
      if (width !== 1280) await capture('.wc-pilot-snow-live', 'snow-storage-card-' + theme + '-' + width + '.png');
      await capture('.wc-pilot-practice-lab', 'journey-lab-' + theme + '-' + width + '.png');
      await capture('.wc-pilot-notice', 'sublimation-receipt-' + theme + '-' + width + '.png');
      assert(await page.locator('#wcPilotPracticeStart').evaluate(el => el.getBoundingClientRect().height >= 44), 'Practice action meets 44 px target');
      const notice = await page.locator('.wc-pilot-notice').boundingBox(), action = await page.locator('#wcPilotNoticeContinue').boundingBox();
      assert(action.y >= notice.y && action.y + action.height <= notice.y + notice.height + 1, 'Continue stays visible inside the receipt');
      console.log('PASS accessibility and layout ' + theme + ' ' + width);
    }
    check('Journey lab, snow controls, recorded sublimation receipt, notebook, and stored-snow meters pass 30 scoped accessibility audits in three themes with 1280, 390, and 320 pixel layout checks');

    assert.deepEqual(errors, [], 'No browser exceptions or WebGL shader errors');
    check('No browser or WebGL errors');
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ passed: true, checks, audits, errors }, null, 2));
  } catch (error) {
    console.error(error);
    const runtime = await page.evaluate(() => ({ data: window.waterReviewData, canvas: document.querySelector('#wcPilotCanvas')?.dataset })).catch(() => null);
    fs.writeFileSync(path.join(out, 'failure-state.json'), JSON.stringify(runtime, null, 2));
    await page.screenshot({ path: path.join(out, 'failure.png'), timeout: 10000 }).catch(() => {});
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ passed: false, error: String(error), checks, audits, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
