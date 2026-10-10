'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated');
const expectedHash = process.argv[2];
const phase = process.argv[3] || 'baseline';
assert.match(expectedHash || '', /^[a-f0-9]{64}$/);
const runtimePath = path.join(root, 'stem_lab/stem_tool_watercycle.js');
const sourceOverride = process.argv[4];
const source = fs.readFileSync(sourceOverride || runtimePath);
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
assert.equal(hash(source), expectedHash, 'Capture source hash');
const mirrorHash = hash(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js')));
if (!sourceOverride) assert.equal(mirrorHash, expectedHash, 'Capture mirror hash');
const out = path.join(__dirname, phase + '-' + expectedHash.slice(0, 10));
fs.mkdirSync(out, { recursive: true });
const fixture = fs.readFileSync(path.join(root, 'dev-tools/watercycle_storm_immersion_qa.cjs'), 'utf8').match(/const html=String.raw`([\s\S]*?)`;/);
assert(fixture, 'Storm fixture HTML');
const html = fixture[1].replace('<head>', '<head><meta name="viewport" content="width=device-width,initial-scale=1">')
  .replace('isDark:false,isContrast:false', 'isDark:!!window.qaDark,isContrast:!!window.qaContrast');
const result = { expectedHash, startHash: hash(source), mirrorHash, phase, screenshots: [], layouts: [], checks: [], audits: [], cases: [], errors: [], failedRequests: [] };
function check(value, label, evidence) {
  result.checks.push({ label, pass: !!value, ...(evidence === undefined ? {} : { evidence }) });
  assert(value, label);
}
function near(actual, expected, label, tolerance = 1e-8) { check(Math.abs(actual - expected) <= tolerance, label, { actual, expected }); }
function expectedProfile(values) {
  const bound = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const temps = [bound(values[0],-35,15),bound(values[1],-25,25),bound(values[2],-15,35)];
  const positions = [0,.55,1], crossings = [], touches = [], bands = [];
  for (let i = 0; i < 2; i++) if (temps[i]*temps[i+1] < 0) crossings.push(positions[i] + (positions[i+1]-positions[i]) * -temps[i]/(temps[i+1]-temps[i]));
  if (temps[1] === 0 && temps[0]*temps[2] < 0) crossings.push(.55);
  for (let i = 0; i < 3; i++) if (temps[i] === 0 && !(i > 0 && temps[i-1] === 0) && !(i < 2 && temps[i+1] === 0) && !(i === 1 && temps[0]*temps[2] < 0)) touches.push(positions[i]);
  for (let i = 0; i < 2; i++) if (temps[i] === 0 && temps[i+1] === 0) {
    if (bands.length) bands[0].end = positions[i+1]; else bands.push({ start: positions[i], end: positions[i+1] });
  }
  return { temps, crossings: crossings.sort((a,b)=>a-b), touches, bands };
}
let browser, page, server;
async function screenshot(selector, name) {
  const node = page.locator(selector);
  await node.scrollIntoViewIfNeeded();
  const filename = name + '.png';
  await node.screenshot({ path: path.join(out, filename), animations: 'disabled' });
  result.screenshots.push(path.join(out, filename));
  result.layouts.push(await node.evaluate((node, name) => {
    const attrs = n => Object.fromEntries([...n.attributes].map(a => [a.name, a.value]));
    const svg = node.querySelector('svg');
    return { name, width: innerWidth, bounds: node.getBoundingClientRect().toJSON(), documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      text: node.innerText, attrs: attrs(node),
      elements: [...node.querySelectorAll('button,input,summary,th,td,dt,dd')].map(n => ({ tag: n.tagName, text: n.innerText, attrs: attrs(n), bounds: n.getBoundingClientRect().toJSON(), font: getComputedStyle(n).fontSize })),
      svg: svg ? { viewBox: svg.getAttribute('viewBox'), ariaLabel: svg.getAttribute('aria-label'), markup: svg.outerHTML } : null };
  }, name));
}
(async () => {
  const cache = path.join(require('node:os').homedir(), 'AppData/Local/ms-playwright');
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(cache)) process.env.PLAYWRIGHT_BROWSERS_PATH = cache;
  const { chromium } = require(require.resolve('playwright', { paths: [root] }));
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); return res.end(html); }
    if (url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(source); }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); return res.end(); } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream'); res.end(data); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(String(error)));
  page.on('requestfailed', request => result.failedRequests.push({ url: request.url(), error: request.failure() }));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort('blockedbyclient'));
  await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => typeof mountStorm === 'function');
  async function mount(values, dark = false, contrast = false) {
    await page.evaluate(({ values, dark, contrast }) => {
      window.qaDark = dark; window.qaContrast = contrast;
      document.documentElement.classList.toggle('dark', dark);
      mountStorm({ wcMode: 'precipHunt', precipHunt: { preset: 'gentleRain', viewMode: '2d', paused: true, stormAutoPlay: false,
        tempC: values[0], midLevelTempC: values[1], surfaceTempC: values[2] } });
    }, { values, dark, contrast });
    await page.locator('.wc-air-profile').waitFor();
  }
  for (const [name, values] of (phase === 'validation' ? [] : [['cloud-end', [-1,25,35]], ['close-crossings', [-35,.01,-35]]])) {
    await mount(values);
    await page.getByRole('button', { name: 'Compare air with particle state', exact: true }).click();
    assert(await page.locator('#wcThermalLayerPanel').evaluate(n => n.open), 'Inspector opens');
    for (const width of [1280,390,320]) {
      await page.setViewportSize({ width, height: 1000 });
      await screenshot('#wcThermalLayerPanel', name + '-inspector-' + width);
      if (name === 'cloud-end' && width !== 320) await screenshot('.wc-air-profile', name + '-main-profile-' + width);
      console.log('CAPTURE ' + name + ' ' + width);
    }
  }
  if (phase === 'validation') {
    const cases = [['cloud-end',[-1,25,35]],['surface-end',[5,5,-.1]],['two-crossings',[-5,5,-5]],['middle-zero',[-5,0,5]],['tangent',[5,0,5]],['cloud-zero',[0,5,5]],['surface-zero',[5,5,0]],['all-zero',[0,0,0]],['zero-band',[0,0,5]],['near-zero',[-.00004,.00004,-.00004]],['close-crossings',[-35,.01,-35]],['warm',[5,8,14]],['cold',[-16,-10,-5]]];
    for (const [name, values] of cases) {
      await mount(values);
      await page.getByRole('button', { name: 'Compare air with particle state', exact: true }).click();
      const actual = await page.locator('#wcThermalLayerPanel').evaluate(node => {
        const plot = node.querySelector('.wc-tl-plot'), rect = plot.getBoundingClientRect();
        const attrs = n => Object.fromEntries([...n.attributes].map(a => [a.name, a.value]));
        const main = document.querySelector('.wc-air-profile');
        return { extent: +plot.dataset.tlExtent, summary: node.querySelector('[data-tl-air-summary]').innerText,
          crossings: [...node.querySelectorAll('[data-tl-crossing]')].map(n => ({ progress: +n.dataset.tlProgress, y: +n.querySelector('line').getAttribute('y1'), markerY: +n.querySelector('rect').getAttribute('y') + 4 })),
          touches: [...node.querySelectorAll('[data-tl-touch]')].map(n => ({ progress: +n.dataset.tlTouch, path: n.getAttribute('d') })),
          bands: [...node.querySelectorAll('[data-tl-zero-band]')].map(n => ({ start: +n.dataset.tlZeroBand, end: +n.dataset.tlZeroEnd, y1: +n.getAttribute('y1'), y2: +n.getAttribute('y2') })),
          points: [...node.querySelectorAll('[data-tl-point]')].map(n => ({ id: n.dataset.tlPoint, temperature: +n.dataset.tlTemperature, progress: +n.dataset.tlProgress, x: +n.getAttribute('cx'), y: +n.getAttribute('cy') })),
          levels: [...node.querySelectorAll('[data-tl-level-label]')].map(n => ({ id: n.dataset.tlLevelLabel, label: n.innerText, relativeY: (n.getBoundingClientRect().top + n.getBoundingClientRect().height/2 - rect.top)/rect.height*228 })),
          main: { attrs: attrs(main), crossings: [...main.querySelectorAll('[data-air-crossing] circle.wc-profile-crossing-point')].map(n => (+n.getAttribute('cy')-38)/140), touches: [...main.querySelectorAll('[data-air-touch]')].length, bands: [...main.querySelectorAll('[data-air-zero-band]')].length } };
      });
      const expected = expectedProfile(values);
      check(actual.crossings.length === expected.crossings.length, name + ' exact crossing count');
      check(actual.touches.length === expected.touches.length, name + ' exact touch count');
      check(actual.bands.length === expected.bands.length, name + ' exact zero-span count');
      check(actual.main.crossings.length === expected.crossings.length && actual.main.touches === expected.touches.length && actual.main.bands === expected.bands.length, name + ' inspector agrees with main profile topology');
      actual.crossings.forEach((n,i) => { near(n.progress,expected.crossings[i],name+' crossing progress '+i); near(n.y,22+182*expected.crossings[i],name+' crossing y '+i); near(n.markerY,n.y,name+' crossing marker y '+i); near(actual.main.crossings[i],n.progress,name+' main crossing agrees '+i); });
      actual.touches.forEach((n,i) => { near(n.progress,expected.touches[i],name+' touch progress '+i); const m=n.path.match(/^M120 ([\d.e+-]+)/); check(!!m,name+' touch geometry '+i); near(+m[1]+8,22+182*expected.touches[i],name+' touch y '+i); });
      actual.bands.forEach((n,i) => { near(n.start,expected.bands[i].start,name+' zero span start'); near(n.end,expected.bands[i].end,name+' zero span end'); near(n.y1,22+182*n.start,name+' zero span y1'); near(n.y2,22+182*n.end,name+' zero span y2'); });
      check(actual.points.length === 3 && actual.levels.length === 3,name+' three labeled levels');
      actual.points.forEach((n,i) => { near(n.temperature,expected.temps[i],name+' point temperature '+i); near(n.x,16+(expected.temps[i]+actual.extent)/(2*actual.extent)*208,name+' point x '+i); near(n.y,22+[0,.55,1][i]*182,name+' point y '+i); near(actual.levels[i].relativeY,n.y,name+' HTML rail aligns '+i,.1); });
      if (name === 'all-zero') check(/0\s*°C/.test(actual.summary) && !/crosses|below|above/.test(actual.summary), 'all-zero wording avoids false cold/warm crossing');
      result.cases.push({name,values,expected,actual});
      console.log('PASS '+name);
    }
    await mount([-5,5,-5]);
    await page.getByRole('button',{name:'Compare air with particle state',exact:true}).click();
    const weatherBefore = await page.evaluate(() => JSON.stringify(stormData.precipHunt));
    const cloud = page.locator('[data-tl-select="cloud"]');
    await cloud.focus(); await cloud.press('Space');
    await page.waitForFunction(() => document.querySelector('[data-tl-detail]')?.dataset.tlDetail === 'cloud' && document.activeElement.id === 'wcThermalLayerDetailTitle');
    const state = await page.locator('#wcThermalLayerPanel').evaluate(n => ({ selectedPoints:n.querySelectorAll('[data-tl-point][data-selected=true]').length, selectedLabels:n.querySelectorAll('[data-tl-level-label][data-selected=true]').length, selectedGuides:n.querySelectorAll('.wc-tl-guide[data-selected=true]').length, selectedButtons:n.querySelectorAll('[data-tl-select][aria-pressed=true]').length, caption:n.querySelector('.wc-tl-chart-selection').innerText }));
    check(state.selectedPoints===1&&state.selectedLabels===1&&state.selectedGuides===1&&state.selectedButtons===1&&/A.*Cloud base/.test(state.caption),'Space selects one matching level and focuses detail',state);
    const practice = page.locator('.wc-tl-question > summary'); await practice.focus(); await practice.press('Space');
    const answer = page.locator('[data-tl-answer]').first(); await answer.focus(); await answer.press('Space');
    await page.waitForFunction(() => document.activeElement.id === 'wcThermalLayerFeedbackTitle');
    const answerState = await page.locator('.wc-tl-feedback').getAttribute('data-tl-result');
    check(answerState==='supported'||answerState==='retry','Native answer retains explanatory practice feedback',answerState);
    await cloud.focus(); await cloud.press('Space');
    check(await page.locator('.wc-tl-feedback').getAttribute('data-tl-result') === answerState,'Reselecting same level retains accepted feedback');
    const surface = page.locator('[data-tl-select="surface"]'); await surface.focus(); await surface.press('Space');
    await page.waitForFunction(() => document.activeElement.id === 'wcThermalLayerDetailTitle');
    check(await page.locator('[data-tl-answer][aria-pressed=true]').count() === 0,'Selecting different level clears stale answer');
    check(await page.evaluate(() => JSON.stringify(stormData.precipHunt)) === weatherBefore,'Level and practice choices preserve weather inputs');
    const axePath = path.join(root,'desktop/web-app/node_modules/axe-core/axe.min.js');
    await page.addScriptTag({path:axePath});
    async function audit(name) {
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('#wcThermalLayerPanel'), {rules:{region:{enabled:false}}})).violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
      result.audits.push({name,violations}); check(violations.length===0,name+' scoped axe audit',violations);
    }
    await page.setViewportSize({width:1280,height:1000}); await audit('light1280');
    await page.setViewportSize({width:320,height:1000}); await audit('light320');
    check(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1),'Phone320 no horizontal document overflow');
    await mount([-5,5,-5],true); await page.getByRole('button',{name:'Compare air with particle state',exact:true}).click();
    await page.setViewportSize({width:390,height:1000}); await screenshot('#wcThermalLayerPanel','inspector-dark-390'); await audit('dark390');
    await page.emulateMedia({forcedColors:'active'}); await mount([-5,5,-5],false,true); await page.getByRole('button',{name:'Compare air with particle state',exact:true}).click();
    await page.setViewportSize({width:320,height:1000}); await screenshot('#wcThermalLayerPanel','inspector-forced-320'); await audit('forced320');
    await page.emulateMedia({forcedColors:'none'});
    check(await page.evaluate(() => typeof THREE) === 'undefined','Validation stays in local 2D fixture');
  }
  result.currentDiskHash = hash(fs.readFileSync(runtimePath));
  result.loadedRuntimeHash = hash(source);
  result.passed = result.errors.length === 0 && result.failedRequests.length === 0;
  console.log('RESULT ' + path.join(out, 'result.json'));
})().catch(async error => {
  result.error = String(error.stack || error); result.passed = false; process.exitCode = 1;
  console.error(result.error);
  if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
}).finally(async () => {
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
