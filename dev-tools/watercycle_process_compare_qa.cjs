'use strict';
// Captures the reviewed source once and serves it to an owned, ephemeral browser.
// This harness never uses the learner's running preview or browser tabs.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const out = path.join(root, 'reports/watercycle-process-compare');
const diagnosticOnly = process.argv.includes('--diagnostic-only');
const timingOnly = process.argv.includes('--timing-only');
const followupOnly = process.argv.includes('--followup-only');
const focusOnly = process.argv.includes('--focus-only');
const sourcePath = path.join(root, 'stem_lab/stem_tool_watercycle.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const source = fs.readFileSync(sourcePath);
const mirror = fs.readFileSync(mirrorPath);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = { capturedAt: new Date().toISOString(), sourceSha256: sha(source), mirrorSha256: sha(mirror),
  provenance: 'Product source bytes captured before server launch; isolated localhost server and owned headless browser; no learner preview or browser tabs used.',
  checks: [], audits: [], errors: [], failures: [] };
const check = (pass, label, detail) => {
  report.checks.push({ label, pass: !!pass, ...(detail === undefined ? {} : { detail }) });
  if (!pass) report.failures.push(label);
};
function progress(label) {
  report.lastStep = label;
  console.log('STEP ' + label);
  fs.writeFileSync(path.join(out, 'progress.json'), JSON.stringify({ lastStep: label, completedChecks: report.checks.length,
    completedAudits: report.audits.length, errors: report.errors, capturedAt: report.capturedAt, sourceSha256: report.sourceSha256 }, null, 2));
}
async function bounded(operation, label, timeoutMs = 15000) {
  progress(label);
  let timer;
  try { return await Promise.race([operation(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Diagnostic deadline: ' + label)), timeoutMs); })]); }
  finally { clearTimeout(timer); }
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Water process comparison QA</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#eef2f2;font-family:system-ui}main{padding:12px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script>
<script>const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountComparison=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({waterCycle:seed});window.waterReviewData=data.waterCycle;window.waterReviewSet=setData;const noop=()=>{};
 return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:text=>window.comparisonAnnouncements.push(text),awardXP:()=>window.comparisonXPCalls++,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 window.comparisonAnnouncements=[];window.comparisonXPCalls=0;document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};</script></body></html>`;
const allowed = ['/stem_lab/stem_lab_module.js', '/stem_lab/stem_tool_watercycle.js',
  '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/',
  '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
const mime = { '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html); }
  if (url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(source); }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(error ? 'Not found' : data); });
});

async function main() {
  fs.mkdirSync(out, { recursive: true });
  check(source.equals(mirror), 'source and deployed copy are identical at capture');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => report.errors.push(String(error)));
    const activity = () => page.locator('details[data-wc-process-compare="true"]');
    const state = () => bounded(() => page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData.wcProcessCompare || {}))), 'read comparison state');
    const outsideState = () => bounded(() => page.evaluate(() => { const state = { ...window.waterReviewData }; delete state.wcProcessCompare; return JSON.stringify(state); }), 'read independent Explorer state');
    async function mount(theme = 'light', extra = {}) {
      await bounded(() => page.goto(origin, { waitUntil: 'domcontentloaded' }), 'load isolated source');
      await bounded(() => page.evaluate(({ theme, seed }) => window.mountComparison(seed, theme), { theme,
        seed: { wcMode: 'explorer', wcSection: 'conditions', journeyView: '2d', journeyPaused: true, wc2dPaused: true,
          activeStage: 'evaporation', climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55,
          landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass', ...extra } }), 'mount paused Explorer');
      await activity().waitFor({ state: 'attached' });
      await page.addScriptTag({ url: origin + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
    }
    async function open() { if (!await activity().evaluate(node => node.open)) await activity().locator(':scope > summary').click(); }
    async function pair(first, second) {
      const currentFirst = await activity().locator('#wcProcessFirst').inputValue();
      const currentSecond = await activity().locator('#wcProcessSecond').inputValue();
      if (currentSecond === first) {
        const intermediate = await activity().locator('#wcProcessSecond option').evaluateAll((nodes, blocked) =>
          nodes.find(node => !node.disabled && !blocked.includes(node.value)).value, [currentFirst, first, second]);
        await activity().locator('#wcProcessSecond').selectOption(intermediate);
      }
      await activity().locator('#wcProcessFirst').selectOption(first);
      await activity().locator('#wcProcessSecond').selectOption(second);
      if (await activity().locator('#wcProcessFirst').inputValue() !== first) await activity().locator('#wcProcessFirst').selectOption(first);
      assert.equal(await activity().locator('#wcProcessFirst').inputValue(), first, 'requested first process');
      assert.equal(await activity().locator('#wcProcessSecond').inputValue(), second, 'requested second process');
    }
    async function question(value) { await activity().locator('input[name="wcProcessQuestion"][value="' + value + '"]').check(); }
    async function answer(value) { await activity().locator('input[name="wcProcessAnswer"][value="' + value + '"]').check(); }
    async function submit() {
      await activity().getByRole('button', { name: 'Check this comparison', exact: true }).click();
      await page.waitForFunction(() => document.activeElement.id === 'wcProcessFeedbackTitle');
    }
    async function audit(label) {
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('details[data-wc-process-compare="true"]'),
        { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, impact: v.impact,
          nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })));
      report.audits.push({ label, violations });
      if (violations.length) report.failures.push(label + ' accessibility violations');
    }
    async function focusThemes() {
      for (const [theme, width, forced] of [['light', 1280, false], ['dark', 320, false], ['contrast', 320, false], ['contrast', 320, true]]) {
        const label = forced ? 'forced-colors-320' : theme + '-' + width;
        await page.emulateMedia({ forcedColors: forced ? 'active' : 'none' });
        await page.setViewportSize({ width, height: 1000 }); await mount(theme); await open();
        await pair('evaporation', forced ? 'condensation' : 'transpiration'); await question(forced ? 'energy' : 'phase');
        await answer(forced ? 'first' : 'both'); await submit();
        const button = activity().getByRole('button', { name: 'Check this comparison', exact: true });
        await button.hover(); await button.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
        // Keyboard scrolling can move a mobile control away from the stationary pointer.
        // Restore hover without clicking, so keyboard focus modality remains active.
        await button.hover();
        const focus = await button.evaluate(node => { const style = getComputedStyle(node); return { visible: node.matches(':focus-visible'), hovered: node.matches(':hover'), width: style.outlineWidth, style: style.outlineStyle }; });
        check(focus.visible && focus.hovered && focus.style !== 'none' && parseFloat(focus.width) >= 3,
          forced ? 'forced colors displays visible keyboard focus' : label + ' keeps a 3px keyboard focus outline while hovered', focus);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ' targeted follow-up fits viewport');
        await audit(label + '-targeted-follow-up');
        if (theme !== 'contrast' || forced) {
          if (!forced) await activity().locator('#wcProcessExplain').fill('Both change liquid water into vapor; transpiration also moves water through a plant.');
          await activity().screenshot({ path: path.join(out, 'comparison-' + label + '.png'), animations: 'disabled' });
        }
      }
    }
    function expected(first, second, field) {
      const changesPhase = new Set(['evaporation', 'condensation', 'transpiration']);
      const takesLatentHeat = new Set(['evaporation', 'transpiration']);
      const flags = field === 'phase' ? changesPhase : takesLatentHeat;
      return flags.has(first) ? flags.has(second) ? 'both' : 'first' : flags.has(second) ? 'second' : 'neither';
    }

    console.log('CHECK native disclosure and all ordered process comparisons');
    await mount();
    if (focusOnly) { await focusThemes(); return; }
    if (timingOnly || followupOnly) {
      await open();
      report.timings = await bounded(() => page.evaluate(async () => {
        const box = document.querySelector('details[data-wc-process-compare="true"]');
        const get = selector => box.querySelector(selector);
        const rows = [];
        for (const [first, second, phase, energy] of [['evaporation', 'transpiration', 'both', 'both'],
          ['condensation', 'precipitation', 'first', 'neither'], ['infiltration', 'collection', 'neither', 'neither']]) {
          for (const [question, answer] of [['phase', phase], ['energy', energy]]) {
            const started = performance.now(), events = [];
            function measure(label, action) { const before = performance.now(); action(); events.push({ label, synchronousMs: performance.now() - before }); }
            function select(id, value) { const node = get(id); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }
            measure('first process select', () => select('#wcProcessFirst', first));
            measure('second process select', () => select('#wcProcessSecond', second));
            measure('question radio', () => get('input[name="wcProcessQuestion"][value="' + question + '"]').click());
            measure('answer radio', () => get('input[name="wcProcessAnswer"][value="' + answer + '"]').click());
            measure('check button', () => get('.wc-process-check').click());
            await new Promise(resolve => setTimeout(resolve, 10));
            rows.push({ first, second, question, events, totalMs: performance.now() - started,
              focus: document.activeElement.id, match: get('.wc-process-feedback').dataset.match });
          }
        }
        return rows;
      }), 'measure six native comparison cases');
      check(report.timings.every(row => row.match === 'agree' && row.focus === 'wcProcessFeedbackTitle'), 'timed native comparison cases retain agreement and focus');
      if (followupOnly) {
        const baseline = { climSolar: 1, climTemp: 10, climWind: 1, landRainIntensity: 55, landSaturation: 45,
          landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass' };
        await mount('light', { activeStage: 'collection', journeyActive: true, journeyState: 'river_runoff', journeyPaused: true,
          journeyLoops: 2, journeyLastPath: 'runoff', journeyPaths: { runoff: 2, infiltrate: 1, plant: 0 },
          journey3dPaths: { runoff: 1, infiltrate: 0, plant: 0 }, journey3dStatesVisited: { ocean: true, evaporating: true },
          wcScenarioBaseline: baseline, wcExperimentLog: [{ label: 'Preserved parcel observation', baseline, snapshot: { ...baseline, climTemp: 15 } }] });
        await open();
        const before = await outsideState();
        const canvasBefore = await page.locator('canvas[data-journey-state]').first().evaluate(node => ({ stage: node.dataset.activeStage, parcel: node.dataset.journeyState, paused: node.dataset.journeyPaused }));
        await pair('precipitation', 'infiltration'); await question('phase'); await answer('neither'); await submit();
        await activity().locator('#wcProcessExplain').fill('Falling water can enter soil while this selected parcel remains paused on a surface route.');
        check(await outsideState() === before, 'active paused journey comparison preserves parcel, stage, history, baseline, and observations');
        const canvasAfter = await page.locator('canvas[data-journey-state]').first().evaluate(node => ({ stage: node.dataset.activeStage, parcel: node.dataset.journeyState, paused: node.dataset.journeyPaused }));
        check(JSON.stringify(canvasAfter) === JSON.stringify(canvasBefore) && canvasAfter.parcel === 'river_runoff' && canvasAfter.paused === 'true', 'active paused parcel canvas remains on its selected route');
        const text = await activity().innerText();
        check(/precipitation[\s\S]*(?:(?:phase|state) change|change of (?:state|phase))/i.test(text), 'precipitation explanation addresses phase change explicitly');
        check(/(?:groundwater|water table|recharge)/i.test(text) && /(?:not all|does not|doesn.t|may|can)/i.test(text), 'infiltration explanation includes a groundwater caveat');
        check(await page.evaluate(() => window.comparisonXPCalls === 0), 'active paused journey comparison awards no XP');
        await focusThemes();
      }
      return;
    }
    if (diagnosticOnly) {
      const debugSession = await page.context().newCDPSession(page);
      await debugSession.send('Debugger.enable');
      try {
        await bounded(() => activity().locator(':scope > summary').focus(), 'focus native disclosure');
        await bounded(() => page.keyboard.press('Enter'), 'open native disclosure with keyboard');
        await bounded(() => activity().locator('#wcProcessSecond').selectOption('condensation'), 'select condensation in slot B');
        await bounded(() => question('phase'), 'select phase question');
        await bounded(() => answer('both'), 'select both answer');
        await bounded(() => submit(), 'check correct comparison');
        await bounded(() => answer('neither'), 'replace answer with neither');
        await bounded(() => submit(), 'check revision comparison');
        const debug = await bounded(() => activity().evaluate(node => ({ open: node.open, text: node.innerText, html: node.outerHTML })), 'read checked activity');
        fs.writeFileSync(path.join(out, 'diagnostic.json'), JSON.stringify({ ...debug, sourceSha256: report.sourceSha256, errors: report.errors }, null, 2));
      } catch (error) {
        let paused;
        debugSession.on('Debugger.paused', event => { paused = event.callFrames.map(frame => ({ functionName: frame.functionName, url: frame.url, line: frame.location.lineNumber + 1, column: frame.location.columnNumber + 1 })); });
        await debugSession.send('Debugger.pause').catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 100));
        fs.writeFileSync(path.join(out, 'diagnostic-stack.json'), JSON.stringify({ lastStep: report.lastStep, stack: paused, error: String(error), sourceSha256: report.sourceSha256 }, null, 2));
        await debugSession.send('Debugger.resume').catch(() => {});
        throw error;
      }
      return;
    }
    check(!await activity().evaluate(node => node.open), 'process comparison starts collapsed');
    check(await activity().evaluate(node => !node.closest('.wc-stage-focus')), 'comparison is outside the stage focus live region');
    await activity().locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    check(await activity().evaluate(node => node.open), 'keyboard opens the native comparison disclosure');
    check(await activity().locator('.wc-process-state-flow strong').count() === 4, 'both process cards show source and destination states before checking');
    check(await activity().locator('.wc-process-energy').count() === 0, 'latent heat explanations are withheld before checking');
    const outsideBefore = await outsideState();
    const processes = ['evaporation', 'condensation', 'precipitation', 'infiltration', 'collection', 'transpiration'];
    const options = await activity().locator('#wcProcessFirst option').evaluateAll(nodes => nodes.map(node => node.value));
    assert.deepEqual([...options].sort(), [...processes].sort(), 'comparison exposes the expected six processes');
    for (const first of processes) for (const second of processes) {
      if (first === second) continue;
      for (const field of ['phase', 'energy']) {
        const correct = expected(first, second, field);
        const result = await bounded(() => page.evaluate(async ({ first, second, field, correct }) => {
          // Native DOM events invoke the rendered React control handlers. Keeping
          // this matrix in one protocol call avoids hundreds of slow round trips.
          const box = document.querySelector('details[data-wc-process-compare="true"]');
          const get = selector => box.querySelector(selector);
          function select(id, value) { const node = get(id); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }
          if (get('#wcProcessSecond').value === first) {
            const currentFirst = get('#wcProcessFirst').value;
            const intermediate = [...get('#wcProcessSecond').options].find(option => !option.disabled && ![currentFirst, first, second].includes(option.value));
            select('#wcProcessSecond', intermediate.value);
          }
          select('#wcProcessFirst', first); select('#wcProcessSecond', second);
          get('input[name="wcProcessQuestion"][value="' + field + '"]').click();
          const before = { checked: !!window.waterReviewData.wcProcessCompare.checked, feedback: !!get('.wc-process-feedback') };
          const cards = [...box.querySelectorAll('article.wc-process-card')].map(node => ({ slot: node.dataset.slot, process: node.dataset.process }));
          get('input[name="wcProcessAnswer"][value="' + correct + '"]').click(); get('.wc-process-check').click();
          await new Promise(resolve => setTimeout(resolve, 10));
          const agreement = { match: get('.wc-process-feedback').dataset.match, focus: document.activeElement.id };
          const wrong = correct === 'both' ? 'neither' : 'both';
          get('input[name="wcProcessAnswer"][value="' + wrong + '"]').click();
          const reset = !window.waterReviewData.wcProcessCompare.checked && !get('.wc-process-feedback');
          get('.wc-process-check').click(); await new Promise(resolve => setTimeout(resolve, 10));
          return { before, cards, agreement, reset, revision: get('.wc-process-feedback').dataset.match,
            first: get('#wcProcessFirst').value, second: get('#wcProcessSecond').value };
        }, { first, second, field, correct }), 'matrix ' + first + '/' + second + ' ' + field);
        check(result.first === first && result.second === second, first + '/' + second + ' ' + field + ' controls retain selected pair');
        check(!result.before.checked, first + '/' + second + ' ' + field + ' begins unchecked');
        check(!result.before.feedback, first + '/' + second + ' ' + field + ' explanation stays unrevealed');
        const cards = result.cards;
        check(cards.length === 2 && cards[0].slot === 'first' && cards[0].process === first && cards[1].slot === 'second' && cards[1].process === second,
          first + '/' + second + ' ' + field + ' cards identify the selected pair');
        check(result.agreement.match === 'agree', first + '/' + second + ' ' + field + ' accepts ' + correct);
        check(result.agreement.focus === 'wcProcessFeedbackTitle', first + '/' + second + ' ' + field + ' check focuses the feedback heading');
        const wrong = correct === 'both' ? 'neither' : 'both';
        check(result.reset, first + '/' + second + ' ' + field + ' changing an answer hides stale feedback');
        check(result.revision === 'revisit', first + '/' + second + ' ' + field + ' invites revision of ' + wrong);
      }
    }
    check(await outsideState() === outsideBefore, 'all process comparisons preserve active stage, journey, and condition state');
    check(await page.evaluate(() => window.comparisonXPCalls === 0), 'comparison checking makes no XP calls');

    console.log('CHECK independent writing, reset rules, and scientific caveats');
    await pair('evaporation', 'transpiration'); await question('phase');
    const explanation = 'Both produce water vapor, but transpiration includes movement through a plant.';
    await activity().locator('#wcProcessExplain').fill(explanation);
    await activity().locator('input[name="wcProcessAnswer"][value="both"]').focus(); await page.keyboard.press('Space');
    check(await activity().locator('input[name="wcProcessAnswer"][value="both"]').isChecked(), 'keyboard selects a native answer radio');
    await activity().getByRole('button', { name: 'Check this comparison', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'wcProcessFeedbackTitle');
    check(await activity().locator('.wc-process-feedback').getAttribute('data-match') === 'agree', 'keyboard checks the chosen answer');
    await question('energy');
    check(!(await state()).checked && !(await state()).answer, 'changing the question clears checked feedback and the answer');
    check(await activity().locator('#wcProcessExplain').inputValue() === explanation, 'changing the question retains writing for the same ordered pair');
    await pair('precipitation', 'infiltration');
    check(!(await state()).checked && !(await state()).answer, 'changing a process clears checked feedback and the answer');
    check(await activity().locator('#wcProcessExplain').inputValue() === '', 'a different ordered pair receives its own explanation');
    await activity().locator('#wcProcessExplain').fill('Falling water and water entering soil describe movement.');
    await pair('transpiration', 'evaporation');
    check(await activity().locator('#wcProcessExplain').inputValue() === '', 'the reversed pair receives independent writing');
    await pair('evaporation', 'transpiration');
    check(await activity().locator('#wcProcessExplain').inputValue() === explanation, 'returning to an ordered pair restores its writing');
    await activity().locator(':scope > summary').click(); await open();
    check(await activity().locator('#wcProcessExplain').inputValue() === explanation, 'collapsing and reopening preserves the explanation');
    const saved = await state();
    await page.locator('.wc-section-tabs').getByRole('button', { name: /^What the data shows\./ }).click();
    await page.locator('.wc-section-tabs').getByRole('button', { name: /^Change the conditions\./ }).click();
    await open();
    check(JSON.stringify(await state()) === JSON.stringify(saved) && await activity().locator('#wcProcessExplain').inputValue() === explanation,
      'section switching preserves comparison state and writing');
    check(await activity().locator('#wcProcessExplain').getAttribute('maxlength') === '800', 'explanations have the stated 800 character limit');
    await pair('precipitation', 'infiltration'); await question('phase'); await answer('neither'); await submit();
    const movementText = await activity().innerText();
    check(/precipitation[\s\S]*(?:(?:phase|state) change|change of (?:state|phase))/i.test(movementText), 'precipitation explanation addresses phase change explicitly');
    check(/(?:groundwater|water table|recharge)/i.test(movementText) && /(?:not all|does not|doesn.t|may|can)/i.test(movementText), 'infiltration explanation includes a groundwater caveat');
    await pair('evaporation', 'condensation'); await question('energy'); await answer('first'); await submit();
    const phaseText = await activity().innerText();
    check(/(?:liquid|droplet)/i.test(phaseText) && /deposition/i.test(phaseText), 'condensation explanation distinguishes liquid droplets and deposition');
    check(/schematic|diagram marks represent/i.test(phaseText), 'the vapor diagram explains its schematic representation');
    check(/latent|thermal energy/i.test(phaseText) && /(?:releases|release|released)/i.test(phaseText), 'energy explanation distinguishes absorption and release');

    console.log('CHECK mobile themes, target sizes, focus, and accessibility');
    for (const theme of ['light', 'dark', 'contrast']) for (const width of [1280, 320]) {
      const id = theme + '-' + width;
      await page.setViewportSize({ width, height: 1000 }); await mount(theme); await open();
      await pair('evaporation', 'transpiration'); await question('phase');
      check(await activity().locator('.wc-process-feedback').count() === 0, id + ' feedback is hidden before checking');
      await answer('both'); await submit();
      const targets = await activity().locator('button,select,textarea,summary').evaluateAll(nodes => nodes
        .filter(node => node.getBoundingClientRect().width && node.getBoundingClientRect().height)
        .map(node => ({ tag: node.tagName, id: node.id, text: node.textContent.trim().slice(0, 80), height: node.getBoundingClientRect().height })));
      check(targets.every(target => target.height >= 44), id + ' visible controls have 44px targets', targets);
      const radioLabels = await activity().locator('input[type="radio"]').evaluateAll(nodes => nodes.map(node => {
        const label = node.closest('label') || document.querySelector('label[for="' + node.id + '"]');
        return { id: node.id, height: label ? label.getBoundingClientRect().height : 0 };
      }));
      check(radioLabels.every(label => label.height >= 44), id + ' radio labels have 44px targets', radioLabels);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ' page fits the viewport');
      check(await activity().evaluate(node => node.scrollWidth <= node.clientWidth), id + ' comparison fits its container');
      await audit(id + '-phase');
      if (id === 'light-1280' || id === 'dark-320') {
        await activity().locator('#wcProcessExplain').fill('Both change liquid water into vapor; transpiration also moves water through a plant.');
        await activity().screenshot({ path: path.join(out, 'comparison-' + id + '.png'), animations: 'disabled' });
      }
      await pair('evaporation', 'condensation'); await question('energy'); await answer('first'); await submit();
      check(await activity().locator('.wc-process-energy').count() === 2, id + ' checking reveals both energy explanations');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ' energy explanation fits the viewport');
      await audit(id + '-energy');
    }
    await page.setViewportSize({ width: 320, height: 1000 }); await page.emulateMedia({ forcedColors: 'active' });
    await mount('contrast'); await open(); await pair('evaporation', 'condensation'); await question('energy'); await answer('first'); await submit();
    const selected = activity().locator('input[name="wcProcessAnswer"][value="first"]');
    await selected.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    check(await selected.isChecked(), 'forced colors retains the selected answer');
    const checkButton = activity().getByRole('button', { name: 'Check this comparison', exact: true });
    await checkButton.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    const focus = await checkButton.evaluate(node => { const style = getComputedStyle(node); return { visible: node.matches(':focus-visible'), width: style.outlineWidth, style: style.outlineStyle }; });
    check(focus.visible && focus.style !== 'none' && parseFloat(focus.width) >= 2, 'forced colors displays visible keyboard focus', focus);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'forced colors comparison fits 320px');
    await audit('forced-colors-320');
    await activity().screenshot({ path: path.join(out, 'comparison-forced-colors-320.png'), animations: 'disabled' });
    await page.close();
  } catch (error) { report.failures.push(error.stack || String(error)); }
  finally {
    report.completedAt = new Date().toISOString();
    report.sourceUnchangedAtCompletion = sha(fs.readFileSync(sourcePath)) === report.sourceSha256;
    fs.writeFileSync(path.join(out, focusOnly ? 'focus-results.json' : followupOnly ? 'followup-results.json' : timingOnly ? 'timing-results.json' : diagnosticOnly ? 'diagnostic-results.json' : 'browser-results.json'), JSON.stringify(report, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
    if (diagnosticOnly || timingOnly || followupOnly || focusOnly) {
      console.log(JSON.stringify({ checks: report.checks.length, audits: report.audits.length, failures: report.failures, errors: report.errors }, null, 2));
      assert.deepEqual(report.failures, []); assert.deepEqual(report.errors, []);
    }
  }
  console.log(JSON.stringify({ checks: report.checks.length, audits: report.audits.length, failures: report.failures, errors: report.errors }, null, 2));
  assert.deepEqual(report.failures, []); assert.deepEqual(report.errors, []);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
