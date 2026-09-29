'use strict';
// Runs an isolated, ephemeral preview. It does not use or replace the user's preview tab.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const out = path.join(root, 'reports/watercycle-explore-notebook');
const finalAudits = process.argv.includes('--final-audits');
const remainingOnly = process.argv.includes('--remaining-only');
const capturesOnly = process.argv.includes('--captures-only');
const report = { capturedAt: new Date().toISOString(), checks: [], audits: [], errors: [], failures: [] };
if (remainingOnly) {
  const previous = JSON.parse(fs.readFileSync(path.join(out, 'results.json'), 'utf8'));
  assert(previous.checks.every(check => check.pass) && previous.audits.every(audit => !audit.violations.length) && !previous.errors.length,
    'Only an otherwise passing prior run can be resumed.');
  assert(previous.failures.length === 1 && previous.failures[0].includes("locator('#wcScenarioPreset')"),
    'The prior run must have stopped at the diagnosed hidden preset.');
  report.checks = previous.checks;
  report.audits = previous.audits;
  report.verificationRuns = [{ sourceSha256: previous.sourceSha256, capturedAt: previous.capturedAt,
    completedChecks: previous.checks.length, completedAudits: previous.audits.length,
    coverage: 'Notebook editing, export, viewport/contrast audits, capacity, signed cooling, baseline identity, and accumulated undo.',
    stoppedAt: 'Experiment preset was hidden by the legacy details first-child CSS rule.',
    correction: 'The scoped Climate Lab header display:flex rule overrides that hidden ancestor.' }];
}
const check = (pass, label, detail) => {
  report.checks.push({ label, pass: !!pass, ...(detail === undefined ? {} : { detail }) });
  if (!pass) report.failures.push(label);
};
const base = { climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55,
  landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass' };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Explore notebook QA</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#eef2f2;font-family:system-ui}main{padding:12px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script>
<script>const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountNotebook=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({waterCycle:seed});window.waterReviewData=data.waterCycle;window.waterReviewSet=setData;const noop=()=>{};
 return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:text=>window.notebookAnnouncements.push(text),awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 window.notebookAnnouncements=[];document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};</script></body></html>`;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html); }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(error ? 'Not found' : data);
  });
});

async function main() {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', acceptDownloads: true });
    page.setDefaultTimeout(90000);
    page.on('pageerror', error => report.errors.push(String(error)));
    async function mount(theme, extra = {}) {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ theme, seed }) => window.mountNotebook(seed, theme), {
        theme, seed: { ...base, wcMode: 'explorer', wcSection: 'conditions', wcClimateLabOpen: true, journeyView: '2d', journeyPaused: true, wc2dPaused: true, ...extra },
      });
      await page.locator('#wc-climate-temperature').waitFor();
      await page.addScriptTag({ url: origin + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
    }
    async function openLand() {
      if (!await page.locator('.wc-land-lab').evaluate(node => node.open)) await page.locator('.wc-land-lab > summary').click();
    }
    async function openClimate() {
      if (!await page.locator('.wc-climate-lab').evaluate(node => node.open)) await page.locator('.wc-climate-lab > summary').click();
    }
    async function notes(explanation, evidence, nextTest) {
      const record = page.locator('.wc-log-entry').first();
      const details = record.locator('details').filter({ has: page.locator('summary', { hasText: 'Explain this observation' }) });
      if (!await details.evaluate(node => node.open)) await details.locator('summary').click();
      await record.getByLabel('My explanation', { exact: true }).fill(explanation);
      await record.getByLabel('Evidence I used', { exact: true }).fill(evidence);
      await record.getByLabel('My next test', { exact: true }).fill(nextTest);
    }
    async function readLog() { return page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData.wcExperimentLog || []))); }
    async function setTemperature(target) {
      await openClimate();
      const control = page.locator('#wc-climate-temperature');
      await control.focus();
      const current = Number(await control.inputValue());
      for (let i = 0; i < Math.abs(target - current); i++) await page.keyboard.press(target > current ? 'ArrowRight' : 'ArrowLeft');
    }
    async function chooseClaim(text) {
      const choice = page.locator('.wc-prediction-option').filter({ hasText: text });
      await choice.focus(); await page.keyboard.press('Enter');
      await page.locator('.wc-compare-bars').waitFor();
    }
    async function save() { await page.getByRole('button', { name: 'Save current observation to experiment trail', exact: true }).click(); }
    async function audit(label) {
      const violations = await page.evaluate(async () => (await axe.run({ include: [['.wc-climate-lab'], ['.wc-fair-test'], ['.wc-prediction-strip'], ['.wc-compare-strip'], ['.wc-experiment-log']] }, { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })));
      report.audits.push({ label, violations });
      if (violations.length) report.failures.push(label + ' accessibility violations');
    }

    if (capturesOnly) {
      for (const [theme, width] of [['light', 1280], ['dark', 320]]) {
        await page.setViewportSize({ width, height: 1000 }); await mount(theme, { wcScenarioBaseline: { ...base } });
        await openClimate(); await page.locator('#wcScenarioPreset').selectOption('heavy_storm');
        check(await page.locator('#wcScenarioPreset').isVisible(), theme + '-' + width + ' restored experiment selector is visible');
        await page.locator('.wc-climate-lab > summary').evaluate(node => node.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: path.join(out, 'climate-preset-' + theme + '-' + width + '.png'), animations: 'disabled' });
        if (width === 320) {
          await page.locator('#wcFairTestHeading').evaluate(node => node.scrollIntoView({ block: 'start' }));
          await page.screenshot({ path: path.join(out, 'fair-comparison-dark-320.png'), animations: 'disabled' });
        }
      }
      console.log('Refreshed climate and fair-comparison captures.');
      return;
    }

    for (const theme of remainingOnly ? [] : ['light', 'dark', 'contrast']) {
      for (const width of [1280, 320]) {
        const id = theme + '-' + width;
        console.log('CHECK notebook ' + id);
        await page.setViewportSize({ width, height: 1000 }); await mount(theme);
        await page.locator('.wc-compare-trigger').click(); await openLand();
        const cover = page.locator('.wc-land-control').filter({ has: page.locator('legend', { hasText: 'Land cover' }) });
        await cover.getByRole('button', { name: /Urban/ }).focus(); await page.keyboard.press('Space');
        await chooseClaim('Surface runoff');
        check(await page.locator('.wc-compare-strip').innerText().then(text => /one (?:input|control)|1 (?:input|control)/i.test(text)), id + ' identifies a comparison with one changed input');
        const note = 'Paving comparison ' + id;
        await save(); await notes(note, 'Runoff increased; infiltration decreased.', 'Hold cover fixed and change rainfall only.');
        let log = await readLog();
        check(log.length === 1 && log[0].notes.explanation === note && log[0].notes.evidence.includes('Runoff increased') && log[0].notes.nextTest.includes('rainfall only'), id + ' saves all three labeled notes');
        check(log[0].baseline.landCover === 'grass' && log[0].snapshot.landCover === 'urban' && !!log[0].metrics.baseline && !!log[0].metrics.current, id + ' saves both recorded setups and their evidence values');
        const explanation = page.locator('.wc-log-entry').getByLabel('My explanation', { exact: true });
        check(await explanation.isVisible() && await explanation.inputValue() === note, id + ' saved notes remain visible in the trail');
        const beforeSwitch = JSON.stringify(log);
        await page.locator('.wc-section-tabs').getByRole('button', { name: /^What the data shows\./ }).click();
        await page.locator('.wc-section-tabs').getByRole('button', { name: /^Change the conditions\./ }).click();
        check(JSON.stringify(await readLog()) === beforeSwitch, id + ' section switching preserves complete records');
        const pendingDownload = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Download trail', exact: true }).click();
        const download = await pendingDownload; const downloaded = fs.readFileSync(await download.path(), 'utf8');
        check(downloaded.includes(note) && downloaded.includes('rainfall only') && /not.*(?:measured|forecast|water volume)/i.test(downloaded), id + ' downloaded report retains notes and model limitations');
        const remove = page.getByRole('button', { name: /^Remove observation:/ }).first();
        await remove.focus(); await page.keyboard.press('Enter');
        check((await readLog()).length === 0, id + ' keyboard removal removes the selected record');
        const undo = page.getByRole('button', { name: 'Undo removal', exact: true });
        check(await undo.isVisible(), id + ' removal offers undo');
        check(await page.evaluate(() => document.activeElement !== document.body), id + ' removal retains meaningful focus');
        await undo.focus(); await page.keyboard.press('Enter');
        check(JSON.stringify(await readLog()) === beforeSwitch, id + ' undo restores the exact recorded evidence');
        await page.locator('.wc-log-entry details > summary').first().click();
        const buttons = await page.locator('.wc-experiment-log button').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, height: node.getBoundingClientRect().height })));
        check(buttons.every(button => button.height >= 44), id + ' notebook actions have at least 44px targets', buttons);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ' notebook fits viewport');
        await audit(id);
        if (id === 'light-1280' || id === 'dark-320') { await page.locator('.wc-experiment-log').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'notebook-' + id + '.png'), animations: 'disabled' }); }
      }
    }

    if (remainingOnly) {
      console.log('CHECK visible preset and fair-comparison surfaces');
      for (const theme of ['light', 'dark', 'contrast']) {
        for (const width of [1280, 320]) {
          const id = 'preset-' + theme + '-' + width;
          await page.setViewportSize({ width, height: 1000 }); await mount(theme, { wcScenarioBaseline: { ...base } });
          await openClimate();
          const preset = page.locator('#wcScenarioPreset');
          check(await preset.isVisible(), id + ' experiment selector is visibly available');
          check(await preset.evaluate(node => node.getBoundingClientRect().height >= 44), id + ' experiment selector has a 44px target');
          await preset.selectOption('heavy_storm');
          check(await page.locator('.wc-fair-inputs li').count() === 8, id + ' preset displays all eight changed inputs');
          check(await page.locator('.wc-fair-test').innerText().then(text => /cannot isolate/i.test(text)), id + ' multi-input preset states its attribution limit');
          check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ' restored selector and fairness panel fit the viewport');
          const violations = await page.evaluate(async () => (await axe.run({ include: [['.wc-climate-lab'], ['.wc-fair-test'], ['.wc-prediction-strip']] }, { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })));
          report.audits.push({ label: id, violations });
          if (violations.length) report.failures.push(id + ' accessibility violations');
          if (id === 'preset-light-1280' || id === 'preset-dark-320') {
            await page.locator('.wc-climate-lab > summary').evaluate(node => node.scrollIntoView({ block: 'start' }));
            await page.screenshot({ path: path.join(out, 'climate-' + id + '.png'), animations: 'disabled' });
            if (width === 320) { await page.locator('#wcFairTestHeading').evaluate(node => node.scrollIntoView({ block: 'start' })); await page.screenshot({ path: path.join(out, 'fair-comparison-dark-320.png'), animations: 'disabled' }); }
          }
        }
      }
    }

    if (!finalAudits && !remainingOnly) {
    console.log('CHECK notebook capacity, signed evidence, and baseline identity');
    await page.setViewportSize({ width: 1280, height: 1000 }); await mount('light');
    await page.locator('.wc-compare-trigger').click();
    for (const [i, target] of [20, 24, 28, 32].entries()) {
      await setTemperature(target); await chooseClaim('Evaporation');
      await save(); await notes('Saved explanation ' + (i + 1), 'Recorded evidence ' + (i + 1), 'Next test ' + (i + 1));
    }
    const fullLog = JSON.stringify(await readLog());
    await setTemperature(34); await chooseClaim('Evaporation');
    check((await readLog()).length === 4, 'notebook capacity is four records');
    check(JSON.stringify(await readLog()) === fullLog, 'fifth comparison leaves all prior records intact');
    check(await page.locator('.wc-prediction-save').isDisabled(), 'save is disabled while notebook is full');
    check(await page.locator('.wc-notebook-capacity').innerText().then(text => /four|4/i.test(text) && /remove|download/i.test(text)), 'capacity guidance explains how to make room');
    await page.getByRole('button', { name: /^Remove observation:/ }).last().click();
    check(await page.locator('.wc-prediction-save').isEnabled(), 'removing one record makes room for the pending comparison');
    await save(); check((await readLog()).length === 4, 'pending comparison saves after making room');

    await mount('light', { wcScenarioBaseline: { ...base, climTemp: 25 }, climTemp: 20 });
    await chooseClaim('Evaporation');
    check(/\bagrees\b/i.test(await page.locator('.wc-prediction-result-badge').innerText()), 'cooling supports a direction-neutral evaporation-change claim');
    check(await page.locator('.wc-prediction-copy').innerText().then(text => /-0\.33|decreas|slows/i.test(text)), 'cooling evidence reports its negative direction');
    await save(); await notes('Cooling record', '20°C is cooler than 25°C.', 'Try the same sunlight with warmer air.');
    const firstComparison = await readLog();
    await mount('light', { wcExperimentLog: firstComparison, wcScenarioBaseline: { ...base }, climTemp: 20 });
    await chooseClaim('Evaporation');
    check(await page.locator('.wc-prediction-save').isEnabled(), 'same current setup against a different baseline can save');
    await save(); check((await readLog()).length === 2, 'two different baselines retain distinct comparisons');
    }

    if (!remainingOnly) {
    console.log('CHECK notebook accumulated removal and undo');
    await page.setViewportSize({ width: 1280, height: 1000 }); await mount('light');
    await page.locator('.wc-compare-trigger').click();
    for (const [index, temperature] of [20, 21, 22].entries()) {
      await setTemperature(temperature); await chooseClaim('Evaporation'); await save();
      await notes('Removal order record ' + (index + 1), 'Evidence retained ' + (index + 1), 'Next test retained ' + (index + 1));
    }
    const beforeRemovals = JSON.stringify(await readLog());
    await page.getByRole('button', { name: /^Remove observation:/ }).first().click();
    await page.getByRole('button', { name: /^Remove observation:/ }).last().click();
    check((await readLog()).length === 1, 'two sequential removals remove only their selected records');
    await page.getByRole('button', { name: 'Undo removal', exact: true }).click();
    check(JSON.stringify(await readLog()) === beforeRemovals, 'one undo restores multiple removals in original order with all notes');
    } else {
      await page.setViewportSize({ width: 1280, height: 1000 }); await mount('light', { wcScenarioBaseline: { ...base } });
      await openLand();
      const cover = page.locator('.wc-land-control').filter({ has: page.locator('legend', { hasText: 'Land cover' }) });
      await cover.getByRole('button', { name: /Urban/ }).click(); await chooseClaim('Surface runoff'); await save();
      await notes('Preserved explanation during isolation', 'Recorded runoff and infiltration evidence', 'Hold seven inputs fixed.');
    }

    console.log('CHECK notebook one-input isolation');
    await mount('light', { wcExperimentLog: await readLog(), wcScenarioBaseline: { ...base } });

    const beforeIsolation = JSON.stringify(await readLog());
    await openClimate();
    await page.locator('#wcScenarioPreset').selectOption('heavy_storm');
    await chooseClaim('Surface runoff');
    check(await page.locator('.wc-fair-test').innerText().then(text => /several inputs changed/i.test(text) && /cannot isolate/i.test(text)), 'multi-input preset explains its attribution limit');
    await page.getByLabel('Choose one change to test', { exact: true }).selectOption('landCover');
    const isolate = page.getByRole('button', { name: 'Keep only this change', exact: true });
    await isolate.focus(); await page.keyboard.press('Enter');
    const isolated = await page.evaluate(() => window.waterReviewData);
    check(Object.keys(base).every(key => isolated[key] === (key === 'landCover' ? 'urban' : base[key])), 'isolation keeps selected cover change and restores the other seven inputs');
    check(isolated.wcPrediction === '', 'isolating one change clears the prior claim');
    check(JSON.stringify(await readLog()) === beforeIsolation, 'isolating one change preserves saved records and notes');
    check(await page.locator('.wc-fair-inputs li').count() === 1 && await page.locator('.wc-fair-test').innerText().then(text => /one input changed/i.test(text)), 'isolated scenario visibly identifies one changed input');
    await page.waitForFunction(() => document.activeElement.id === 'wcFairTestHeading', null, { timeout: 5000 });
    check(await page.evaluate(() => document.activeElement.id === 'wcFairTestHeading'), 'isolation moves focus to the visible comparison method heading');
    check(await page.locator('.wc-prediction-option').count() === 5, 'isolation exposes five choices for the new comparison');

    await page.setViewportSize({ width: 320, height: 1000 }); await mount('contrast', { wcExperimentLog: await readLog(), wcScenarioBaseline: { ...base }, climTemp: 20 });
    await chooseClaim('Evaporation'); await page.emulateMedia({ forcedColors: 'active' });
    const downloadButton = page.getByRole('button', { name: 'Download trail', exact: true });
    await downloadButton.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    const focus = await downloadButton.evaluate(node => { const style = getComputedStyle(node); return { visible: node.matches(':focus-visible'), width: style.outlineWidth, outline: style.outlineStyle }; });
    check(focus.visible && focus.outline !== 'none' && parseFloat(focus.width) >= 2, 'forced-colors notebook action has visible keyboard focus', focus);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'forced-colors notebook fits 320px');
    await page.locator('.wc-experiment-log').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'notebook-forced-colors-320.png'), animations: 'disabled' });
    await page.close();
  } catch (error) { report.failures.push(error.stack || String(error)); }
  finally {
    report.sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js'))).digest('hex');
    if (remainingOnly) report.verificationRuns.push({ sourceSha256: report.sourceSha256, capturedAt: report.capturedAt,
      completedChecks: report.checks.length - report.verificationRuns[0].completedChecks,
      completedAudits: report.audits.length - report.verificationRuns[0].completedAudits,
      coverage: 'Visible experiment presets, climate/fair-comparison audits, one-input isolation, retained writing, focus, and forced colors.' });
    fs.writeFileSync(path.join(out, capturesOnly ? 'capture-results.json' : finalAudits ? 'final-audits.json' : 'results.json'), JSON.stringify(report, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify({ checks: report.checks.length, audits: report.audits.length, failures: report.failures, errors: report.errors }, null, 2));
  assert.deepEqual(report.failures, []); assert.deepEqual(report.errors, []);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
