'use strict';
// Captures product bytes once and checks the real Explorer UI in an owned browser.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const out = path.join(root, 'reports/watercycle-next-experiment');
const sourcePath = path.join(root, 'stem_lab/stem_tool_watercycle.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const source = fs.readFileSync(sourcePath);
const mirror = fs.readFileSync(mirrorPath);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = { capturedAt: new Date().toISOString(), sourceSha256: sha(source), mirrorSha256: sha(mirror),
  provenance: 'Source bytes captured before the isolated localhost server starts. Only an owned headless Playwright browser is used; the learner preview and tabs are untouched.',
  checks: [], audits: [], errors: [], failures: [], timings: [] };
const remainingOnly = process.argv.includes('--remaining-only');
const followupOnly = process.argv.includes('--followup-only');
const readingFollowupOnly = process.argv.includes('--reading-followup-only');
if (readingFollowupOnly) {
  const previous = JSON.parse(fs.readFileSync(path.join(out, 'followup-results.json'), 'utf8'));
  const earlier = JSON.parse(fs.readFileSync(path.join(out, 'pre-forced-colors-results.json'), 'utf8'));
  assert.equal(previous.sourceSha256, report.sourceSha256);
  assert.deepEqual(previous.failures, ['Sunlight return to Data updates the supported comparison reading', 'Soil permeability return to Data updates the supported comparison reading']);
  assert(!previous.errors.length && previous.audits.every(row => !row.violations.length));
  report.checks = [...earlier.checks, ...previous.checks.filter(row => row.pass)];
  report.audits = [...earlier.audits.filter(row => !row.violations.length), ...previous.audits]; report.timings = earlier.timings;
  report.verificationRuns = [...previous.verificationRuns, { sourceSha256: previous.sourceSha256,
    capturedAt: previous.capturedAt, completedAt: previous.completedAt, rawReport: 'followup-results.json',
    checks: 16, passingChecks: 14, audits: 4, coverage: 'Two native learning loops and corrected forced-colors bridge/land checks.',
    correction: 'Check changing numerical Scenario Readout cards; the bridge metric-name label is intentionally static.' }];
  report.resolvedFailures = previous.resolvedFailures;
}
if (followupOnly) {
  const previous = JSON.parse(fs.readFileSync(path.join(out, 'pre-forced-colors-results.json'), 'utf8'));
  assert(previous.checks.every(row => row.pass) && !previous.errors.length);
  assert.deepEqual(previous.failures, ['forced-colors-320-opened-land accessibility violations']);
  report.checks = previous.checks; report.audits = previous.audits.filter(row => !row.violations.length); report.timings = previous.timings;
  report.verificationRuns = [...(previous.verificationRuns || []), { sourceSha256: previous.sourceSha256,
    capturedAt: previous.capturedAt, completedAt: previous.completedAt, checks: previous.checks.length,
    audits: previous.audits.length, passingAudits: report.audits.length,
    coverage: 'All destinations, shortcuts, baseline semantics, keyboard focus, and responsive themes.',
    failedAudit: 'Forced-colors land text author colors; the raw audit is retained in pre-forced-colors-results.json.',
    correction: 'Explicit CanvasText declarations for Land Lab text in forced colors.' }];
  report.resolvedFailures = previous.resolvedFailures;
}
if (remainingOnly) {
  const previous = JSON.parse(fs.readFileSync(path.join(out, 'initial-results.json'), 'utf8'));
  assert.equal(previous.sourceSha256, report.sourceSha256, 'Resumption requires the same product bytes');
  assert(previous.checks.every(row => row.pass) && !previous.errors.length && previous.audits.every(row => !row.violations.length));
  assert.equal(previous.checks.length, 49);
  assert.equal(previous.failures.length, 1);
  assert(previous.failures[0].includes("name: /Change the weather/"));
  report.checks = previous.checks;
  report.timings = previous.timings;
  report.verificationRuns = [{ sourceSha256: previous.sourceSha256, capturedAt: previous.capturedAt,
    completedAt: previous.completedAt, checks: previous.checks.length, stoppedAt: 'Weather shortcut accessible-name selector',
    correction: 'Use the existing accessible name: Open climate controls and run a one-variable experiment.' }];
  const shortcutAttempt = JSON.parse(fs.readFileSync(path.join(out, 'shortcut-results.json'), 'utf8'));
  assert.equal(shortcutAttempt.sourceSha256, report.sourceSha256);
  report.verificationRuns.push({ sourceSha256: shortcutAttempt.sourceSha256, capturedAt: shortcutAttempt.capturedAt,
    completedAt: shortcutAttempt.completedAt, stoppedAt: 'Existing weather button is inside the closed learning-guide disclosure.',
    correction: 'Open the native learning-guide disclosure before invoking its weather button.' });
}
const inheritedChecks = report.checks.length;
const inheritedAudits = report.audits.length;
const check = (pass, label, detail) => {
  report.checks.push({ label, pass: !!pass, ...(detail === undefined ? {} : { detail }) });
  if (!pass) report.failures.push(label);
};
function progress(label) {
  report.lastStep = label;
  console.log('STEP ' + label);
  fs.writeFileSync(path.join(out, 'progress.json'), JSON.stringify({ lastStep: label,
    checks: report.checks.length, audits: report.audits.length, failures: report.failures,
    capturedAt: report.capturedAt, sourceSha256: report.sourceSha256 }, null, 2));
}
async function bounded(operation, label, milliseconds = 30000) {
  progress(label);
  let timer;
  try { return await Promise.race([operation(), new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Deadline: ' + label)), milliseconds);
  })]); } finally { clearTimeout(timer); }
}
const base = { climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55,
  landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass' };
const saved = {
  wcPrediction: 'evaporation', wcReplayedObservation: 'saved-observation',
  wcExperimentLog: [{ id: 'saved-observation', label: 'My saved observation', baseline: { ...base }, snapshot: { ...base, climTemp: 20 },
    notes: { explanation: 'Warmer water has a larger evaporation index.', evidence: 'Compare the two saved readings.', nextTest: 'Change sunlight only.' } }],
  wcExperimentUndo: [{ index: 0, entry: { label: 'Keep this removed observation.' } }],
  wcProcessCompare: { first: 'evaporation', second: 'transpiration', question: 'phase', answer: 'both', checked: true,
    notes: { 'evaporation|transpiration': 'Both produce water vapor.' } },
  journeyActive: true, journeyPaused: true, journeyState: 'river_runoff', journeyLoops: 2,
  journeyLastPath: 'runoff', journeyPaths: { runoff: 2, infiltrate: 1, plant: 0 },
  journey3dPaths: { runoff: 1, infiltrate: 0, plant: 0 }, journeyReplayProgress: 0.42,
  journey3dStatesVisited: { ocean: true, evaporating: true }, researchPoints: 25,
};
const specs = [
  { key: 'climSolar', label: 'Sunlight', lab: 'climate', target: '#wc-climate-solar', reading: 'evaporation' },
  { key: 'climTemp', label: 'Temperature', lab: 'climate', target: '#wc-climate-temperature', reading: 'evaporation' },
  { key: 'landRainIntensity', label: 'Rainfall intensity', lab: 'land', target: '#wc-land-rain', reading: 'land' },
  { key: 'landSaturation', label: 'Soil saturation', lab: 'land', target: '#wc-land-saturation', reading: 'land' },
  { key: 'landPermeability', label: 'Soil permeability', lab: 'land', target: '[data-wc-input="landPermeability"] button[aria-pressed="true"]', reading: 'land' },
  { key: 'landSlope', label: 'Slope', lab: 'land', target: '[data-wc-input="landSlope"] button[aria-pressed="true"]', reading: 'land' },
  { key: 'landCover', label: 'Land cover', lab: 'land', target: '[data-wc-input="landCover"] button[aria-pressed="true"]', reading: 'land' },
];
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Next experiment browser review</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#eef2f2;font-family:system-ui}main{padding:12px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script>
<script>const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountNextExperiment=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({waterCycle:seed});window.waterReviewData=data.waterCycle;window.waterReviewSet=setData;const noop=()=>{};
 return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:text=>window.nextAnnouncements.push(text),awardXP:()=>window.nextXPCalls++,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 window.nextAnnouncements=[];window.nextXPCalls=0;document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};
window.nextScrolls=[];const actualScroll=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(options){window.nextScrolls.push({id:this.id,lab:this.getAttribute('data-watercycle-climate')?'climate':this.getAttribute('data-watercycle-land')?'land':'other',options});return actualScroll.call(this,options);};</script></body></html>`;
const allowed = ['/stem_lab/stem_lab_module.js', '/stem_lab/stem_tool_watercycle.js',
  '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/',
  '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html); }
  if (url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(source); }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': path.extname(file) === '.css' ? 'text/css' : 'text/javascript' }); res.end(error ? 'Not found' : data); });
});

async function main() {
  fs.mkdirSync(out, { recursive: true });
    if (!remainingOnly && !followupOnly && !readingFollowupOnly) check(source.equals(mirror), 'source and desktop public runtime match at capture');
    else assert(source.equals(mirror), 'Source and public runtime must still match on continuation');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => report.errors.push(String(error)));
    await bounded(() => page.goto(origin, { waitUntil: 'domcontentloaded' }), 'load captured source');
    await page.addScriptTag({ url: origin + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
    async function mount(theme = 'light', extra = {}) {
      await bounded(() => page.evaluate(({ seed, theme }) => window.mountNextExperiment(seed, theme), { theme,
        seed: { ...base, wcMode: 'explorer', wcSection: 'data', journeyView: '2d', wc2dPaused: true,
          activeStage: 'evaporation', wcClimateLabOpen: false, wcLandLabOpen: false, ...saved,
          wcScenarioBaseline: { ...base }, ...extra } }), 'mount ' + theme + ' Explorer');
      await page.locator('.wc-explorer-root').waitFor({ state: 'attached' });
    }
    async function audit(label, selectors) {
      const violations = await bounded(() => page.evaluate(async selectors => (await axe.run({ include: selectors.map(selector => [selector]) },
        { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, impact: v.impact,
          nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })), selectors), 'axe ' + label);
      report.audits.push({ label, violations });
      if (violations.length) report.failures.push(label + ' accessibility violations');
    }
    const bridge = () => page.locator('.wc-next-test');
    if (!followupOnly && !readingFollowupOnly) {
    if (!remainingOnly) {
    await mount();
    check(await bridge().isVisible(), 'next investigation is visible in Data');
    check(await bridge().locator('#wcNextTestInput option').evaluateAll(nodes => nodes.map(n => n.value).join('|')) === specs.map(s => s.key).join('|'),
      'native select offers exactly seven supported inputs');
    check(!await bridge().locator('#wcNextTestInput option[value="climWind"]').count(), 'wind is not offered as a measured investigation input');

    // Batch native DOM events to avoid expensive repeated browser protocol calls.
    // Each assertion uses rendered targets and independent expected destinations.
    const matrix = await bounded(() => page.evaluate(async ({ specs, base, saved }) => {
      const rows = [];
      for (const spec of specs) {
        window.mountNextExperiment({ ...base, ...saved, wcMode: 'explorer', wcSection: 'data', journeyView: '2d', wc2dPaused: true,
          activeStage: 'evaporation', wcClimateLabOpen: false, wcLandLabOpen: false, wcScenarioBaseline: { ...base } });
        const before = JSON.parse(JSON.stringify(window.waterReviewData));
        const select = document.querySelector('#wcNextTestInput');
        const start = performance.now();
        select.value = spec.key; select.dispatchEvent(new Event('change', { bubbles: true }));
        const selected = JSON.parse(JSON.stringify(window.waterReviewData));
        const reading = document.querySelector('.wc-next-test-reading').textContent;
        document.querySelector('.wc-next-test-open').click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const target = document.querySelector(spec.target);
        const lab = document.querySelector('[data-watercycle-' + spec.lab + ']');
        rows.push({ key: spec.key, before, selected, after: JSON.parse(JSON.stringify(window.waterReviewData)), reading,
          focused: target === document.activeElement, visible: !!target && !!target.getBoundingClientRect().height,
          labOpen: !!lab && lab.open, focusId: document.activeElement.id, focusText: document.activeElement.textContent,
          ariaPressed: document.activeElement.getAttribute('aria-pressed'), milliseconds: performance.now() - start,
          scroll: window.nextScrolls[window.nextScrolls.length - 1] });
      }
      return rows;
    }, { specs, base, saved }), 'seven native input destinations');
    for (const row of matrix) {
      const spec = specs.find(s => s.key === row.key);
      const selectedBefore = { ...row.before, wcNextTestInput: spec.key };
      check(JSON.stringify(row.selected) === JSON.stringify(selectedBefore), spec.label + ' selection changes only the intended input choice');
      check(row.focused && row.visible && row.labOpen, spec.label + ' opens and focuses its actual native control', { focusId: row.focusId, focusText: row.focusText, labOpen: row.labOpen });
      if (spec.target.includes('button')) check(row.ariaPressed === 'true', spec.label + ' focuses the selected categorical option');
      const navigationKeys = new Set(['wcSection', 'wcFocusMode', 'wcClimateLabOpen', 'wcLandLabOpen', 'wcNextTestInput']);
      const protectedState = state => Object.fromEntries(Object.entries(state).filter(([key]) => !navigationKeys.has(key)));
      check(JSON.stringify(protectedState(row.before)) === JSON.stringify(protectedState(row.after)), spec.label + ' navigation preserves inputs, baseline, writing, and paused journey');
      check(row.after.wcSection === 'conditions' && !row.after.wcFocusMode, spec.label + ' navigates to Conditions outside Focus Canvas');
      check(spec.reading === 'evaporation' ? /evaporation/i.test(row.reading) : /runoff/i.test(row.reading) && /infiltration/i.test(row.reading), spec.label + ' names the supported readings', row.reading);
      check(row.scroll && row.scroll.options.behavior === 'auto', spec.label + ' respects reduced motion when scrolling', row.scroll);
      report.timings.push({ key: row.key, milliseconds: row.milliseconds });
    }
    }

    for (const section of ['journey', 'data', 'check']) {
      await mount('light', { wcSection: section });
      const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData)));
      await page.locator('.wc-learning-drawer > summary').click();
      await page.getByRole('button', { name: 'Open climate controls and run a one-variable experiment', exact: true }).click();
      await page.waitForFunction(() => document.activeElement.id === 'wc-climate-solar');
      const result = await page.evaluate(() => ({ state: window.waterReviewData, open: document.querySelector('[data-watercycle-climate]').open }));
      check(result.state.wcSection === 'conditions' && result.open, section + ' weather shortcut opens the mounted Climate Lab');
      const omitNavigation = state => { const copy = { ...state }; ['wcSection', 'wcFocusMode', 'wcClimateLabOpen'].forEach(k => delete copy[k]); return copy; };
      check(JSON.stringify(omitNavigation(result.state)) === JSON.stringify(omitNavigation(before)), section + ' weather shortcut preserves learner/model state');
    }
    if (remainingOnly) report.resolvedFailures = [{ initialReport: 'initial-results.json',
      initialFailure: 'Locator expected visible text as accessible name for the weather shortcut.',
      correctiveValidation: 'All three original non-Conditions sections activate the existing named native button and focus sunlight.' },
      { initialReport: 'shortcut-results.json', initialFailure: 'Weather button parent learning-guide disclosure was closed.',
        correctiveValidation: 'Open the native parent disclosure and then activate its weather button in all three sections.' }];
    await mount('light', { wcSection: 'check', wcFocusMode: true });
    await page.locator('.wc-learning-drawer > summary').click();
    const weather = page.getByRole('button', { name: 'Open climate controls and run a one-variable experiment', exact: true });
    check(await weather.isVisible(), 'weather shortcut remains a visible caller in Focus Canvas');
    await weather.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'wc-climate-solar');
    check(await page.evaluate(() => window.waterReviewData.wcFocusMode === false && window.waterReviewData.wcSection === 'conditions'),
      'keyboard weather shortcut exits Focus Canvas and focuses sunlight');

    for (const [label, baseline] of [['missing', null], ['complete', { ...base, climTemp: 10 }], ['partial', { climTemp: 10 }]]) {
      await mount('light', { wcScenarioBaseline: baseline, wcNextTestInput: 'landCover' });
      const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData)));
      const status = await bridge().locator('.wc-next-test-status').innerText();
      await bridge().locator('.wc-next-test-open').click();
      await page.waitForFunction(() => document.activeElement.matches('[data-wc-input="landCover"] button[aria-pressed="true"]'));
      const after = await page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData)));
      check(JSON.stringify(after.wcScenarioBaseline) === JSON.stringify(baseline || base), label + ' baseline is ' + (baseline ? 'preserved exactly' : 'captured from current inputs'));
      check(JSON.stringify(after.wcExperimentLog) === JSON.stringify(before.wcExperimentLog) && JSON.stringify(after.wcProcessCompare) === JSON.stringify(before.wcProcessCompare), label + ' baseline action preserves notebook and comparison writing');
      check(JSON.stringify(Object.fromEntries(Object.keys(base).map(k => [k, after[k]]))) === JSON.stringify(base), label + ' baseline action does not adjust any scenario input');
      if (label === 'partial') check(/incomplete|partial|missing/i.test(status), 'partial baseline status identifies incomplete evidence', status);
      if (label === 'missing') check(/baseline/i.test(status), 'missing baseline status describes the baseline action', status);
    }
    await mount('light', { climSolar: 1.2, landRainIntensity: 80, wcScenarioBaseline: { ...base } });
    const multiStatus = await bridge().locator('.wc-next-test-status').innerText();
    check(/(?:2|two|multiple|several|more than one)/i.test(multiStatus) && !/one[ -]input test/i.test(multiStatus), 'several changed inputs are described without claiming a one-input test', multiStatus);
    await bridge().locator('#wcNextTestInput').selectOption('landSlope');
    await page.getByRole('button', { name: /Change the conditions.*Climate and land controls/ }).click();
    await page.getByRole('button', { name: /What the data shows.*Readouts, comparison, next test/ }).click();
    check(await bridge().locator('#wcNextTestInput').inputValue() === 'landSlope', 'explicit input choice survives section switching');

    // Real keyboard modality checks are separate from the native event matrix.
    await mount();
    await bridge().locator('#wcNextTestInput').focus();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab');
    check(await bridge().locator('.wc-next-test-open').evaluate(node => node === document.activeElement), 'native keyboard select tabs directly to its action');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'wc-climate-temperature');
    const focus = await page.locator('#wc-climate-temperature').evaluate(node => ({ visible: node.matches(':focus-visible'), outline: getComputedStyle(node).outlineWidth, value: node.value }));
    check(focus.visible && parseFloat(focus.outline) >= 2 && focus.value === '15', 'keyboard action focuses Temperature with a visible outline and unchanged value', focus);

    for (const [theme, width, forced] of [['light', 1280, false], ['light', 320, false], ['dark', 1280, false], ['dark', 320, false], ['contrast', 1280, false], ['contrast', 320, false], ['contrast', 320, true]]) {
      const label = forced ? 'forced-colors-320' : theme + '-' + width;
      await page.emulateMedia({ forcedColors: forced ? 'active' : 'none' });
      await page.setViewportSize({ width, height: 1000 });
      await mount(theme, { wcNextTestInput: 'landPermeability', activeStage: 'infiltration' });
      const layout = await bridge().evaluate(node => ({ fits: node.scrollWidth <= node.clientWidth,
        targets: [...node.querySelectorAll('select,button')].map(n => ({ tag: n.tagName, height: n.getBoundingClientRect().height })) }));
      check(layout.fits && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ' bridge and page fit the viewport', layout);
      check(layout.targets.every(n => n.height >= 44), label + ' bridge controls have at least 44px targets', layout.targets);
      await bridge().locator('#wcNextTestInput').focus(); await page.keyboard.press('Tab');
      const buttonFocus = await bridge().locator('.wc-next-test-open').evaluate(node => ({ active: node === document.activeElement, visible: node.matches(':focus-visible'), width: getComputedStyle(node).outlineWidth, style: getComputedStyle(node).outlineStyle }));
      check(buttonFocus.active && buttonFocus.visible && buttonFocus.style !== 'none' && parseFloat(buttonFocus.width) >= 2, label + ' action has visible keyboard focus', buttonFocus);
      await audit(label + '-bridge', ['.wc-next-test']);
      if (label === 'light-1280' || label === 'dark-320' || forced) await bridge().screenshot({ path: path.join(out, 'next-test-' + label + '.png'), animations: 'disabled' });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.matches('[data-wc-input="landPermeability"] button[aria-pressed="true"]'));
      check(await page.locator('[data-watercycle-land]').evaluate(node => node.open && node.scrollWidth <= node.clientWidth), label + ' selected land controls open and fit');
      await audit(label + '-opened-land', ['[data-watercycle-land]']);
      if (label === 'light-1280' || label === 'dark-320' || forced) await page.locator('[data-watercycle-land]').screenshot({ path: path.join(out, 'opened-land-' + label + '.png'), animations: 'disabled' });
    }
    }
    {
      for (const [key, label] of [['climSolar', 'Sunlight'], ['landPermeability', 'Soil permeability']]) {
        await mount('light', { wcNextTestInput: key });
        async function numericalReading() {
          return page.evaluate(key => {
            const readout = document.querySelector('.wc-section-body[aria-label="What the data shows"] > div[role="status"]');
            const labels = key === 'climSolar' ? ['Evaporation index'] : ['Runoff tendency', 'Infiltration opportunity'];
            return labels.map(label => {
              const name = [...readout.querySelectorAll('p')].find(node => node.textContent === label);
              return { label, value: name.previousElementSibling.textContent };
            });
          }, key);
        }
        const readingBefore = await numericalReading();
        const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData)));
        await bridge().locator('#wcNextTestInput').selectOption(key);
        await bridge().locator('.wc-next-test-open').focus();
        await page.keyboard.press('Enter');
        if (key === 'climSolar') {
          await page.waitForFunction(() => document.activeElement.id === 'wc-climate-solar');
          await page.keyboard.press('ArrowRight');
        } else {
          await page.waitForFunction(() => document.activeElement.matches('[data-wc-input="landPermeability"] button[aria-pressed="true"]'));
          await page.locator('[data-wc-input="landPermeability"]').getByRole('button', { name: 'Soil permeability: High', exact: true }).click();
        }
        await page.getByRole('button', { name: /What the data shows.*Readouts, comparison, next test/ }).click();
        const after = await page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData)));
        const status = await bridge().locator('.wc-next-test-status').innerText();
        const readingAfter = await numericalReading();
        const changed = Object.keys(base).filter(input => before[input] !== after[input]);
        if (!readingFollowupOnly) {
        check(changed.length === 1 && changed[0] === key, label + ' learning loop changes exactly its chosen input', changed);
        check(JSON.stringify(after.wcScenarioBaseline) === JSON.stringify(before.wcScenarioBaseline), label + ' learning loop preserves the saved baseline');
        check(JSON.stringify(after.wcExperimentLog) === JSON.stringify(before.wcExperimentLog) && JSON.stringify(after.wcProcessCompare) === JSON.stringify(before.wcProcessCompare), label + ' learning loop preserves saved writing');
        check(/one|1|single/i.test(status) && !/several|multiple|incomplete/i.test(status), label + ' return to Data describes a one-input comparison', status);
        check(after.wcSection === 'data' && after.wcNextTestInput === key && after.journeyPaused === true && after.journeyState === before.journeyState, label + ' completes the loop with retained choice and paused journey');
        }
        check(JSON.stringify(readingAfter) !== JSON.stringify(readingBefore) && readingAfter.every(row => /[0-9]/.test(row.value)), label + ' return to Data updates the supported comparison reading', { before: readingBefore, after: readingAfter });
        if (!readingFollowupOnly) {
        await audit('learning-loop-' + key, ['.wc-next-test']);
        }
      }
    }
    if (readingFollowupOnly && !report.failures.length) report.resolvedFailures.push({
      initialReport: 'followup-results.json', initialFailure: 'Two harness predicates expected static metric-name labels to change.',
      correctiveValidation: 'The two real native learning loops update the numerical Scenario Readout values after returning to Data.' });
    if (followupOnly) {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.setViewportSize({ width: 320, height: 1000 });
      await mount('contrast', { wcNextTestInput: 'landPermeability', activeStage: 'infiltration' });
      await bridge().locator('#wcNextTestInput').focus(); await page.keyboard.press('Tab');
      const focus = await bridge().locator('.wc-next-test-open').evaluate(node => ({ active: node === document.activeElement,
        visible: node.matches(':focus-visible'), width: getComputedStyle(node).outlineWidth }));
      check(focus.active && focus.visible && parseFloat(focus.width) >= 2, 'forced-colors follow-up retains native action keyboard focus', focus);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'forced-colors follow-up bridge fits 320px');
      await audit('forced-colors-320-bridge-follow-up', ['.wc-next-test']);
      await bridge().screenshot({ path: path.join(out, 'next-test-forced-colors-320.png'), animations: 'disabled' });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.matches('[data-wc-input="landPermeability"] button[aria-pressed="true"]'));
      check(await page.locator('[data-watercycle-land]').evaluate(node => node.open && node.scrollWidth <= node.clientWidth), 'forced-colors follow-up opened land controls fit 320px');
      await audit('forced-colors-320-opened-land-follow-up', ['[data-watercycle-land]']);
      await page.locator('[data-watercycle-land]').screenshot({ path: path.join(out, 'opened-land-forced-colors-320.png'), animations: 'disabled' });
      if (!report.audits[report.audits.length - 1].violations.length) report.resolvedFailures.push({
        initialReport: 'pre-forced-colors-results.json', initialFailure: 'Forced-colors Land Lab author colors triggered a color-contrast audit.',
        correctiveValidation: 'Explicit system text colors pass the same scoped axe audit and preserve the readable forced-colors screenshot.' });
    }
    if (!readingFollowupOnly) check(await page.evaluate(() => window.nextXPCalls === 0), 'navigation awards no XP or mastery');
    await page.close();
  } catch (error) { report.failures.push(error.stack || String(error)); }
  finally {
    report.completedAt = new Date().toISOString();
    report.sourceUnchangedAtCompletion = sha(fs.readFileSync(sourcePath)) === report.sourceSha256;
    report.mirrorUnchangedAtCompletion = sha(fs.readFileSync(mirrorPath)) === report.mirrorSha256;
    await browser.close(); await new Promise(resolve => server.close(resolve));
    report.ownedBrowserClosed = true; report.ownedServerClosed = true;
    report.totals = { assertionExecutions: report.checks.length, uniqueAssertionLabels: new Set(report.checks.map(row => row.label)).size,
      passingAuditExecutions: report.audits.filter(row => !row.violations.length).length };
    if (followupOnly) fs.writeFileSync(path.join(out, 'followup-results.json'), JSON.stringify({ ...report,
      checks: report.checks.slice(inheritedChecks), audits: report.audits.slice(inheritedAudits), timings: [],
      verificationRuns: undefined, totals: undefined, priorEvidenceReport: 'pre-forced-colors-results.json' }, null, 2));
    if (readingFollowupOnly) fs.writeFileSync(path.join(out, 'learning-loop-results.json'), JSON.stringify({ ...report,
      checks: report.checks.slice(inheritedChecks), audits: [], timings: [], verificationRuns: undefined,
      totals: undefined, priorEvidenceReport: 'followup-results.json' }, null, 2));
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify({ checks: report.checks.length, audits: report.audits.length, failures: report.failures, errors: report.errors }, null, 2));
  assert.deepEqual(report.failures, []); assert.deepEqual(report.errors, []);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
