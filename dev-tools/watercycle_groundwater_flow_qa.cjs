'use strict';
// Mounts the registered Water Cycle React module in an owned local fixture.
// All predictions, Check outcomes, and diagrams come from native renderer handlers.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const ROOT = path.resolve(process.env.WC_REPO || path.join(__dirname, '..'));
const { chromium } = createRequire(path.join(ROOT, 'package.json'))('playwright');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const arg = name => process.argv.find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3);
const MAIN = path.join(ROOT, 'stem_lab/stem_tool_watercycle.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const BASE = path.resolve(arg('baseline') || process.env.WC_GROUNDWATER_FLOW_BASELINE || path.join(ROOT, 'reports/watercycle-groundwater-flow/baseline-runtime.js'));
const BASE_SHA = '906f5470210c266c4c0fd7bebba5874fa081fd53cfbb9ca48bb283fed59a70ef';
const source = fs.readFileSync(MAIN), baseline = fs.readFileSync(BASE), harness = fs.readFileSync(__filename);
const sourceSha = hash(source);
if (arg('expected-sha') !== sourceSha) throw Error('Supply --expected-sha=' + sourceSha);
if (hash(baseline) !== BASE_SHA) throw Error('The frozen pre-enhancement baseline differs');
const OUT = path.resolve(arg('out') || path.join(ROOT, 'reports/watercycle-groundwater-flow/qa', sourceSha.slice(0, 12) + '-' + new Date().toISOString().replace(/[:.]/g, '-')));
fs.mkdirSync(OUT, { recursive: true });
if (fs.existsSync(path.join(OUT, 'results.json'))) throw Error('Refusing to overwrite existing evidence');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const clone = value => JSON.parse(JSON.stringify(value));
const normalized = value => { const copy = clone(value); delete copy.wcGroundwaterFlow; return copy; };
const assetPaths = ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'dev-tools/.cache/sweep-tailwind.css', 'desktop/web-app/node_modules/axe-core/axe.min.js'];
const assets = Object.fromEntries(assetPaths.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { startedAt: new Date().toISOString(), pid: process.pid, sourceSha256: sourceSha, publicSourceSha256: hash(fs.readFileSync(PUBLIC)), baselinePath: BASE, baselineSha256: BASE_SHA, harnessSha256: hash(harness), assetSha256: assets,
  method: 'Actual registered React Water Cycle module in an owned localhost fixture. Native parent/child details, buttons, keyboard activation, groundwater Check investigation and observation writing. Frozen baseline receives the same saved state and old navigation/writing controls. All three head setups and nine prediction outcomes are read from the mounted renderer. No copied markup or manufactured results.',
  checks: [], cases: [], predictionCases: [], nativeActions: [], semantics: {}, loadedSources: [], captures: [], audits: [], errors: [], completed: false, browserClosed: false, serverClosed: false };
function check(passed, label, detail) { report.checks.push({ passed: !!passed, label, ...(detail === undefined ? {} : { detail }) }); if (!passed) console.log('FAIL ' + label); }
function requireCheck(passed, label, detail) { check(passed, label, detail); if (!passed) throw Error(label); }
function progress(label) { report.lastStep = label; console.log('STEP ' + label); fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({ lastStep: label, captures: report.captures.map(item => item.file), checks: report.checks.length, failed: report.checks.filter(item => !item.passed).length })); }
const quiz = { q: 'How does most groundwater move through soil and rock?', a: 'Tiny connected pores and cracks', opts: ['Tiny connected pores and cracks', 'Open underground rivers', 'Sealed clouds below the ground', 'It cannot move'], concept: 'infiltration', wrongFeedback: { 'Open underground rivers': 'Most groundwater moves through pores and cracks, rather than open rivers.' }, answered: true, chosen: 'Open underground rivers', score: 2 };
const myth = { idx: 6, s: 'Groundwater flows in big underground rivers and lakes.', t: false, why: 'Almost all groundwater seeps through tiny pores in soil and rock, like water held in a sponge.', tryIt: 'In Journey Mode, take the Infiltration path: the aquifer leg is the slowest part of the cycle.', answered: true, chosen: true };
const seed = { wcMode: 'explorer', wcSection: 'journey', activeStage: 'infiltration', journeyView: '2d', journeyActive: true, journeyState: 'aquifer_flow', journeyLastPath: 'infiltrate', journeyPaused: true, wc2dPaused: true, journeySpeed: 1, journeyLoops: 2, journeyPaths: { runoff: 1, infiltrate: 1, plant: 0 },
  climSolar: 1.2, climTemp: 18, climWind: 1.4, landRainIntensity: 60, landSaturation: 50, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass', wcQuiz: quiz, wcMyth: myth, wcAttempts: 4, wcStreak: 0, quizCorrectCount: 2, wcMythsDone: 3, researchPoints: 10, xp: 73, score: 4,
  completedChallenges: ['complete_journey','explore_all_stages','adjust_climate','quiz_pass','vocabulary_studied','stewardship_win','myth_buster','double_rainbow'],
  wcScenarioBaseline: { climSolar: 1 }, wcProcessCompare: { notes: { 'condensation|precipitation': 'Keep earlier learner writing.' } }, wcExperimentLog: [{ key: 'preserve-evidence', label: 'Existing observation', notes: { explanation: 'Keep existing saved explanation.' } }], pilotNotebook: { reflection: 'Keep my journey reflection.' }, wcCheckReflections: { kept: { observation: 'Keep an earlier observation.' } }, precipHunt: { paused: true, experiment: { prediction: 'Keep storm prediction.', explanation: 'Keep storm explanation.' } } };
const SETUPS = [
  { id: 'left-high', left: 3, right: 1, direction: 'right' },
  { id: 'equal', left: 2, right: 2, direction: 'still' },
  { id: 'right-high', left: 1, right: 3, direction: 'left' }
];
function html(base) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Groundwater flow comparison QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui}main{box-sizing:border-box;padding:12px;max-width:1250px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="${base ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js'}"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountGroundwaterFlow=function(seed,theme){ReactDOM.unmountComponentAtNode(document.getElementById('slot'));window.groundwaterFlowAwards=[];window.groundwaterFlowAnnouncements=[];function Host(){const[data,setData]=React.useState({waterCycle:seed});window.groundwaterFlowQAData=data.waterCycle;window.groundwaterFlowQASet=setData;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:(...a)=>groundwaterFlowAnnouncements.push(a),awardXP:(...a)=>groundwaterFlowAwards.push(a),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':theme==='contrast'?'#000':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));};
</script></body></html>`; }
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/baseline') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html(url.pathname === '/baseline')); }
  if (url.pathname === '/baseline-runtime.js' || url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(url.pathname === '/baseline-runtime.js' ? baseline : source); }
  const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
  const allowed = ['/stem_lab/stem_lab_module.js', ...assetPaths.map(item => '/' + item)];
  if (!file.startsWith(ROOT + path.sep) || !allowed.includes(url.pathname)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => { res.writeHead(error ? 404 : 200, { 'Content-Type': file.endsWith('.css') ? 'text/css' : 'text/javascript' }); res.end(error ? 'Not found' : bytes); });
});
const paint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(groundwaterFlowQAData)));
const awards = page => page.evaluate(() => JSON.parse(JSON.stringify(groundwaterFlowAwards)));
const lens = (page, scope) => page.locator('details[data-gw-scope="' + scope + '"]');
const activity = (page, scope = 'explorer') => page.locator('details[data-wc-gw-flow="' + scope + '"]');
const prefix = scope => 'wcGroundwaterFlow-' + scope;
const mount = async (page, saved, theme = 'light') => { await page.evaluate(({ saved, theme }) => mountGroundwaterFlow(saved, theme), { saved, theme }); await paint(page); };
async function openPage(page, config, base) {
  await page.setViewportSize({ width: config.width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: config.forced ? 'active' : 'none' });
  const response = page.waitForResponse(item => item.url().endsWith(base ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js'));
  await page.goto(report.origin + (base ? '/baseline' : '/'));
  const loaded = hash(await (await response).body()); report.loadedSources.push({ name: config.name, baseline: base, sha256: loaded });
  requireCheck(loaded === (base ? BASE_SHA : sourceSha), config.name + ' loads intended source');
  await page.addScriptTag({ url: report.origin + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
  await page.evaluate(config => { document.body.style.zoom = config.zoom || 1; document.getElementById('slot').style.maxWidth = (config.hostWidth || 1250) + 'px'; }, config);
  await mount(page, seed, config.theme);
}
async function action(page, control, label, metadata = {}, key = 'Enter') {
  await control.focus(); await page.keyboard.press(key); await paint(page);
  report.nativeActions.push({ action: label, keyboard: true, key, ...metadata });
}
async function openLens(page, scope) {
  const parent = lens(page, scope); requireCheck(await parent.count() === 1, scope + ' has exactly one existing ground lens');
  if (!await parent.evaluate(node => node.open)) await action(page, parent.locator(':scope > summary'), 'open-parent-lens', { scope });
  requireCheck(await parent.evaluate(node => node.open), scope + ' ground lens opens natively');
}
async function selectPart(page, scope, part) {
  await action(page, lens(page, scope).locator('[data-gw-select="' + part + '"]'), 'select-ground-part', { scope, part });
  requireCheck(await lens(page, scope).getAttribute('data-gw-part') === part, scope + ' native lens shows ' + part);
}
async function openFlow(page, scope) {
  const flow = activity(page, scope);
  requireCheck(await flow.count() === 1, scope + ' has exactly one connected flow comparison');
  check(await flow.evaluate(node => node.firstElementChild?.tagName === 'SUMMARY'), scope + ' child summary is its first element');
  check(await flow.evaluate(node => node.closest('details[data-gw-scope]')?.dataset.gwPart === 'groundwater'), scope + ' comparison is inside the saturated ground lens');
  if (!await flow.evaluate(node => node.open)) await action(page, flow.locator(':scope > summary'), 'open-flow-comparison', { scope });
  requireCheck(await flow.evaluate(node => node.open), scope + ' flow comparison opens with keyboard Enter');
  const focus = await flow.locator(':scope > summary').evaluate(node => { const s = getComputedStyle(node); return { focused: document.activeElement === node, visible: node.matches(':focus-visible'), width: parseFloat(s.outlineWidth), style: s.outlineStyle }; });
  check(focus.focused && focus.visible && focus.width >= 2 && focus.style !== 'none', scope + ' disclosure has visible keyboard focus', focus);
}
async function semantics(page, scope) { return activity(page, scope).evaluate((section, pre) => {
  const figure = section.querySelector('figure[data-gwf-setup]'), result = section.querySelector('[data-gwf-result]'), svg = figure?.querySelector('svg[data-gwf-diagram]');
  const level = side => { const marker = figure?.querySelector('[data-gwf-level="' + side + '"]'); return marker ? { tag: marker.tagName, y1: Number(marker.getAttribute('y1')), y2: Number(marker.getAttribute('y2')) } : null; };
  const screen = side => { const marker = figure?.querySelector('[data-gwf-screen="' + side + '"]'); return marker ? { tag: marker.tagName, y: marker.getBBox().y, statedTop: Number(marker.getAttribute('data-gwf-screen-top')), statedBottom: Number(marker.getAttribute('data-gwf-screen-bottom')), bbox: { x: marker.getBBox().x, y: marker.getBBox().y, width: marker.getBBox().width, height: marker.getBBox().height } } : null; };
  return { setup: figure?.dataset.gwfSetup, title: section.querySelector('#' + pre + '-SetupTitle')?.textContent, direction: figure?.dataset.gwfDirection,
    wells: ['left','right'].map(side => ({ side, head: Number(figure?.querySelector('[data-gwf-well="' + side + '"]')?.getAttribute('data-gwf-head')), level: level(side), screen: screen(side), reading: section.querySelector('[data-gwf-reading="' + side + '"]')?.textContent })),
    reference: figure?.querySelector('[data-gwf-reference]') ? { y1: Number(figure.querySelector('[data-gwf-reference]').getAttribute('y1')), y2: Number(figure.querySelector('[data-gwf-reference]').getAttribute('y2')) } : null,
    svg: svg ? { scope: svg.dataset.gwfDiagram, hidden: svg.getAttribute('aria-hidden'), focusable: svg.getAttribute('focusable'), texts: svg.querySelectorAll('text').length, arrows: [...svg.querySelectorAll('[data-gwf-arrow]')].map(node => ({ direction: node.dataset.gwfArrow, d: node.getAttribute('d') })) } : null,
    noFlow: !!section.querySelector('[data-gwf-no-flow]'), result: result?.dataset.gwfResult, resultRole: result?.getAttribute('role'), resultLive: result?.getAttribute('aria-live'), resultText: result?.textContent, feedbackTitle: section.querySelector('#' + pre + '-FeedbackTitle')?.textContent,
    setups: [...section.querySelectorAll('[data-gwf-setup]')].filter(node => node.tagName === 'BUTTON').map(node => ({ id: node.dataset.gwfSetup, pressed: node.getAttribute('aria-pressed') })),
    answers: [...section.querySelectorAll('[data-gwf-answer]')].map(node => ({ id: node.dataset.gwfAnswer, pressed: node.getAttribute('aria-pressed') })), checkDisabled: section.querySelector('[data-gwf-check]')?.disabled, allText: section.textContent };
}, prefix(scope)); }
function assessSetup(detail, row, scope, label) {
  check(detail.setup === row.id && detail.setups.filter(item => item.pressed === 'true').length === 1 && detail.setups.find(item => item.id === row.id)?.pressed === 'true', label + ' reports one selected setup', detail.setups);
  check(detail.wells.length === 2 && detail.wells[0].head === row.left && detail.wells[1].head === row.right, label + ' well markers expose actual head relationship', detail.wells);
  const [left, right] = detail.wells;
  check(left.level?.tag === 'line' && right.level?.tag === 'line' && left.level.y1 === left.level.y2 && right.level.y1 === right.level.y2 && (row.left === row.right ? left.level.y1 === right.level.y1 : row.left > row.right ? left.level.y1 < right.level.y1 : left.level.y1 > right.level.y1), label + ' drawn water levels agree with the relative heads', detail.wells);
  check(detail.reference?.y1 === 194 && detail.reference?.y2 === 194, label + ' wells share the stated common reference', detail.reference);
  check(left.screen && right.screen && left.screen.y === right.screen.y && detail.wells.every(well => well.screen.statedTop === 142 && well.screen.statedBottom === 166 && well.screen.bbox.y === 142 && well.screen.bbox.height === 24), label + ' actual drawn well screens share the same saturated height', detail.wells);
  check(detail.wells.every(well => well.reading?.toLowerCase().includes(row.left === row.right ? 'equal' : well.head === 3 ? 'higher' : 'lower')), label + ' HTML well readings label higher, lower, or equal head', detail.wells);
  check(detail.svg?.scope === scope && detail.svg.hidden === 'true' && detail.svg.focusable === 'false' && detail.svg.texts === 0, label + ' decorative SVG has HTML explanations', detail.svg);
}
async function chooseSetup(page, scope, row) {
  await action(page, activity(page, scope).locator('button[data-gwf-setup="' + row.id + '"]'), 'choose-head-setup', { scope, setup: row.id });
  const detail = await semantics(page, scope); assessSetup(detail, row, scope, scope + ' ' + row.id);
  check(await page.evaluate(id => document.activeElement?.id === id, prefix(scope) + '-SetupTitle'), scope + ' choosing setup focuses its heading');
  return detail;
}
async function answer(page, scope, choice) {
  await action(page, activity(page, scope).locator('[data-gwf-answer="' + choice + '"]'), 'predict-flow-direction', { scope, choice }, 'Space');
  const detail = await semantics(page, scope);
  check(detail.answers.filter(item => item.pressed === 'true').length === 1 && detail.answers.find(item => item.id === choice)?.pressed === 'true', scope + ' ' + choice + ' prediction has one pressed button', detail.answers);
  return detail;
}
async function submit(page, scope, row, choice) {
  const button = activity(page, scope).locator('[data-gwf-check]'); requireCheck(!await button.isDisabled(), scope + ' prediction enables Check');
  await action(page, button, 'check-flow-prediction', { scope, setup: row.id, choice });
  const detail = await semantics(page, scope), expected = choice === row.direction ? 'agree' : 'revisit';
  check(detail.result === expected && detail.direction === row.direction, scope + ' ' + row.id + '/' + choice + ' native Check evaluates and reveals actual direction', { result: detail.result, direction: detail.direction });
  check(detail.resultRole === 'status' && detail.resultLive === 'polite', scope + ' feedback is a polite status');
  check(await page.evaluate(id => document.activeElement?.id === id, prefix(scope) + '-FeedbackTitle'), scope + ' Check focuses feedback heading');
  check(row.direction === 'still' ? detail.svg.arrows.length === 0 && detail.noFlow : detail.svg.arrows.length === 1 && detail.svg.arrows[0].direction === row.direction && !detail.noFlow, scope + ' checked setup shows the correct arrow or no-net-flow reading', detail.svg);
  check(detail.resultText?.length > 100, scope + ' checked result explains the head evidence', detail.resultText);
  return detail;
}
async function canvasState(page) { return page.locator('canvas[data-journey-state]').first().evaluate(node => ({ stage: node.dataset.activeStage, parcel: node.dataset.journeyState, paused: node.dataset.journeyPaused })); }
async function snapshot(page) { return { state: normalized(await state(page)), awards: await awards(page), canvas: await canvasState(page) }; }
async function checkInvestigation(page) {
  await mount(page, { ...(await state(page)), wcSection: 'check' });
  requireCheck(await page.locator('#wcCheckInvestigateQuiz').count() === 1, 'Groundwater quiz exposes native Investigate');
  await action(page, page.locator('#wcCheckInvestigateQuiz'), 'investigate-groundwater-quiz');
  requireCheck(await page.locator('[data-wc-check-investigation][data-destination="groundwater_pores"]').count() === 1 || await lens(page, 'check').count() === 1, 'Actual Check investigation mounts groundwater lens');
  await page.locator('#wcCheckObservation').fill('Keep my observation: connected spaces and two well levels provide clues about head.'); await paint(page);
  report.nativeActions.push({ action: 'write-native-check-observation' });
  await openLens(page, 'check'); await selectPart(page, 'check', 'groundwater');
  return await snapshot(page);
}
async function nativeSequence(page, base) {
  progress(base ? 'baseline old lens navigation and Check writing' : 'three native head comparisons and nine prediction checks');
  await openLens(page, 'explorer');
  if (!base) check(await activity(page, 'explorer').count() === 0, 'Flow comparison is absent from unsaturated soil');
  await selectPart(page, 'explorer', 'boundary');
  if (!base) check(await activity(page, 'explorer').count() === 0, 'Flow comparison is absent from water-table boundary');
  await selectPart(page, 'explorer', 'groundwater');
  const initial = await snapshot(page);
  if (base) report.semantics.baseline = { explorer: initial }; else {
    check(same(initial, report.semantics.baseline.explorer), 'Candidate preserves exact frozen baseline state, rewards, and paused parcel after old lens navigation');
    requireCheck(await activity(page, 'explorer').count() === 1, 'Saturated ground lens contains one flow comparison');
    check(!await activity(page, 'explorer').evaluate(node => node.open), 'New comparison starts folded');
    check(await activity(page, 'explorer').evaluate(node => !node.closest('[aria-live]')), 'Comparison is outside existing live regions');
    await capture(page, { name: 'desktop-folded' }, 'explorer'); await openFlow(page, 'explorer');
    const defaultDetail = await semantics(page, 'explorer'); assessSetup(defaultDetail, SETUPS[0], 'explorer', 'Default left-high');
    check(defaultDetail.result === 'unchecked' && defaultDetail.direction === 'unrevealed' && defaultDetail.checkDisabled && defaultDetail.answers.every(item => item.pressed === 'false') && !defaultDetail.svg.arrows.length, 'Initial prediction hides direction and disables Check without an answer');
    await capture(page, { name: 'desktop-unchecked' }, 'explorer');
    for (const row of SETUPS) {
      await chooseSetup(page, 'explorer', row);
      const unchecked = await semantics(page, 'explorer');
      check(unchecked.result === 'unchecked' && unchecked.direction === 'unrevealed' && unchecked.checkDisabled && unchecked.answers.every(item => item.pressed === 'false') && !unchecked.svg.arrows.length, row.id + ' new setup resets prediction and revealed arrow');
      for (const choice of ['right', 'left', 'still']) {
        const pre = await answer(page, 'explorer', choice);
        check(pre.result === 'unchecked' && pre.direction === 'unrevealed' && !pre.svg.arrows.length, row.id + '/' + choice + ' waits for explicit Check and clears stale evidence');
        const checked = await submit(page, 'explorer', row, choice);
        check(same(await snapshot(page), initial), row.id + '/' + choice + ' preserves all old notes, climate, land, parcel, progress and awards');
        report.predictionCases.push({ setup: row.id, choice, expectedDirection: row.direction, checked });
      }
      const saved = clone((await state(page)).wcGroundwaterFlow); await chooseSetup(page, 'explorer', row);
      check((await semantics(page, 'explorer')).result !== 'unchecked' && same(saved, (await state(page)).wcGroundwaterFlow), row.id + ' selecting the same setup preserves checked feedback');
    }
    await chooseSetup(page, 'explorer', SETUPS[0]); await answer(page, 'explorer', 'right'); await submit(page, 'explorer', SETUPS[0], 'right');
    const leftY = (await semantics(page, 'explorer')).wells.map(well => well.level.y1);
    await chooseSetup(page, 'explorer', SETUPS[2]); const rightY = (await semantics(page, 'explorer')).wells.map(well => well.level.y1);
    check(leftY[0] === rightY[1] && leftY[1] === rightY[0], 'Reversing head setup swaps actual rendered water-level heights');
    await answer(page, 'explorer', 'left'); await submit(page, 'explorer', SETUPS[2], 'left');
    const saved = clone((await state(page)).wcGroundwaterFlow);
    await action(page, activity(page, 'explorer').locator(':scope > summary'), 'fold-flow-comparison', { scope: 'explorer' }, 'Space');
    check(!await activity(page, 'explorer').evaluate(node => node.open), 'Keyboard Space closes flow comparison');
    await openFlow(page, 'explorer'); check(same(saved, (await state(page)).wcGroundwaterFlow) && (await semantics(page, 'explorer')).result === 'agree', 'Child fold and reopen retain checked prediction');
    await action(page, lens(page, 'explorer').locator(':scope > summary'), 'fold-parent-lens', { scope: 'explorer' }, 'Space'); await openLens(page, 'explorer');
    check(same(saved, (await state(page)).wcGroundwaterFlow) && (await semantics(page, 'explorer')).result === 'agree', 'Parent fold and reopen retain checked prediction');
  }
  await selectPart(page, 'explorer', 'soil'); await selectPart(page, 'explorer', 'groundwater');
  if (base) report.semantics.baseline.afterParts = await snapshot(page); else {
    check(same(await snapshot(page), report.semantics.baseline.afterParts), 'Old lens part navigation produces the exact baseline learner state');
    const saved = clone((await state(page)).wcGroundwaterFlow); await openFlow(page, 'explorer');
    check((await semantics(page, 'explorer')).setup === 'right-high' && (await semantics(page, 'explorer')).result === 'agree' && same(saved, (await state(page)).wcGroundwaterFlow), 'Leaving saturated part and returning retain the checked flow setup');
  }
  const investigation = await checkInvestigation(page);
  if (base) { report.semantics.baseline.check = investigation; return; }
  check(same(investigation, report.semantics.baseline.check), 'Real Check investigation and native observation writing match frozen baseline state and awards');
  const before = await snapshot(page), explorerSaved = clone((await state(page)).wcGroundwaterFlow?.explorer);
  const flowIds = await page.locator('[id^="wcGroundwaterFlow-"]').evaluateAll(nodes => nodes.map(node => node.id));
  check(new Set(flowIds).size === flowIds.length, 'Explorer and Check flow controls have unique scoped IDs', flowIds);
  check(!await activity(page, 'check').evaluate(node => node.open), 'Check comparison starts folded');
  await openFlow(page, 'check'); const independent = await semantics(page, 'check');
  check(independent.setup === 'left-high' && independent.result === 'unchecked' && independent.checkDisabled, 'Check starts independently from the Explorer choice');
  await chooseSetup(page, 'check', SETUPS[1]); await answer(page, 'check', 'still'); await submit(page, 'check', SETUPS[1], 'still');
  check(same((await state(page)).wcGroundwaterFlow?.explorer, explorerSaved), 'Check prediction preserves independent Explorer metadata');
  check(same(before, await snapshot(page)), 'Check prediction preserves full old session, observation writing, state, parcel and awards');
  check(await page.locator('#wcCheckObservation').inputValue() === 'Keep my observation: connected spaces and two well levels provide clues about head.', 'Native Check observation writing remains available');
  const savedBoth = await state(page), savedIdentity = savedBoth.wcCheckInvestigation.key;
  await mount(page, savedBoth); await openLens(page, 'check'); await selectPart(page, 'check', 'groundwater'); await openFlow(page, 'check');
  check((await semantics(page, 'check')).setup === 'equal' && (await semantics(page, 'check')).result === 'agree', 'Saved checked Check comparison restores for the same exact question identity');
  const changedQuiz = { ...quiz, q: quiz.q + ' Explain the two well levels.' };
  await mount(page, { ...savedBoth, wcSection: 'check', wcCheckInvestigation: null, wcQuiz: changedQuiz });
  await action(page, page.locator('#wcCheckInvestigateQuiz'), 'investigate-second-groundwater-question'); await openLens(page, 'check'); await selectPart(page, 'check', 'groundwater'); await openFlow(page, 'check');
  const changed = await semantics(page, 'check'), newSession = (await state(page)).wcCheckInvestigation;
  report.sessionIdentityEvidence = { first: savedIdentity, second: newSession.key, changedQuiz };
  check(newSession.key !== savedIdentity && changed.result === 'unchecked' && changed.checkDisabled && changed.answers.every(item => item.pressed === 'false'), 'Changed exact question identity clears old Check prediction and feedback', report.sessionIdentityEvidence);
  check(same((await state(page)).wcGroundwaterFlow?.explorer, explorerSaved), 'New Check question keeps independent Explorer metadata');
  for (const [label, malformed, expectedSetup] of [
    ['retired setup', { explorer: { setup: 'retired', answer: 'right', checked: true }, check: savedBoth.wcGroundwaterFlow.check }, 'left-high'],
    ['invalid answer', { explorer: { setup: 'equal', answer: 'down', checked: true }, check: savedBoth.wcGroundwaterFlow.check }, 'equal']
  ]) {
    const imported = { ...seed, wcGroundwaterFlow: malformed };
    await mount(page, imported); await openLens(page, 'explorer'); await selectPart(page, 'explorer', 'groundwater');
    const preserved = await snapshot(page); await openFlow(page, 'explorer'); const detail = await semantics(page, 'explorer');
    check(detail.setup === expectedSetup && detail.result === 'unchecked' && detail.direction === 'unrevealed' && detail.checkDisabled && detail.answers.every(item => item.pressed === 'false') && !detail.svg.arrows.length, 'Imported ' + label + ' falls back to safe unchecked feedback', detail);
    check(same(await snapshot(page), preserved), 'Imported ' + label + ' view preserves all old learner state');
  }
  report.semantics.candidate = { explorer: initial, check: investigation, checkedMetadata: savedBoth.wcGroundwaterFlow };
}
async function measurements(page, scope) { return activity(page, scope).evaluate(section => {
  const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const rgba = color => { const n = (color.match(/[\d.]+/g) || []).map(Number); return [n[0] || 0,n[1] || 0,n[2] || 0,n.length > 3 ? n[3] : 1]; };
  const over = (a,b) => [0,1,2].map(i => a[i] * a[3] + b[i] * (1-a[3])).concat(1);
  const lum = c => { const n = c.slice(0,3).map(v => { v/=255; return v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return n[0]*.2126+n[1]*.7152+n[2]*.0722; };
  const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  function backgrounds(element) { const parents=[];for(let p=element;p;p=p.parentElement)parents.unshift(p);let result=[[255,255,255,1]];for(const p of parents){const style=getComputedStyle(p);result=result.map(c=>over(rgba(style.backgroundColor),c));const stops=(style.backgroundImage.match(/rgba?\([^)]*\)/g)||[]).map(rgba);if(stops.length)result=result.flatMap(c=>stops.map(s=>over(s,c))).slice(0,8);}return result; }
  const text=[],walk=document.createTreeWalker(section,NodeFilter.SHOW_TEXT);let node;
  while(node=walk.nextNode()){
    const element=node.parentElement;if(!node.textContent.trim()||!element.getClientRects().length||element.closest('style,svg,[aria-hidden="true"],.sr-only'))continue;
    let hidden=false;for(let detail=element.closest('details');detail;detail=detail.parentElement?.closest('details'))if(!detail.open&&!detail.querySelector(':scope > summary')?.contains(element))hidden=true;if(hidden)continue;
    const style=getComputedStyle(element),range=document.createRange();range.selectNodeContents(node);const rect=range.getBoundingClientRect();
    const splitWords=[...node.textContent.matchAll(/[\p{L}\p{N}]+/gu)].map(match=>{const r=document.createRange();r.setStart(node,match.index);r.setEnd(node,match.index+match[0].length);return{word:match[0],lines:r.getClientRects().length};}).filter(w=>w.lines>1);
    const colors=backgrounds(element),foreground=rgba(style.color),panel=element.closest('[data-gwf-reading],[data-gwf-result],button,summary,figure')||section;
    text.push({text:node.textContent.trim(),font:parseFloat(style.fontSize),color:style.color,contrast:Math.min(...colors.map(c=>ratio(over(foreground,c),c))),splitWords,panel:box(panel),textRect:{x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom}});
  }
  const diagrams=[...section.querySelectorAll('svg[data-gwf-diagram]')].map(svg=>{const b=svg.getBBox(),v=svg.viewBox.baseVal;return{box:box(svg),bounds:{x:b.x,y:b.y,width:b.width,height:b.height},view:{x:v.x,y:v.y,width:v.width,height:v.height},textCount:svg.querySelectorAll('text').length};});
  const diagramMarkers=[...section.querySelectorAll('[data-gwf-level],[data-gwf-reference],[data-gwf-arrow],[data-gwf-screen]')].map(node=>{const s=getComputedStyle(node),svg=node.closest('svg');return{kind:node.dataset.gwfLevel?'level':node.hasAttribute('data-gwf-reference')?'reference':node.dataset.gwfArrow?'arrow':'screen',side:node.dataset.gwfLevel||node.dataset.gwfArrow||node.dataset.gwfScreen,display:s.display,visibility:s.visibility,stroke:s.stroke,fill:s.fill,strokeWidth:parseFloat(s.strokeWidth)||0,bounds:box(node),svg:box(svg)};});
  const headMarks=[...section.querySelectorAll('.wc-gwf-head-measure,.wc-gwf-level')].map(primary=>{
    const halo=primary.previousElementSibling,svg=primary.closest('svg'),style=getComputedStyle(primary),outline=halo&&getComputedStyle(halo),stroke=rgba(style.stroke),haloStroke=outline&&rgba(outline.stroke);
    const surfaces=[...backgrounds(svg),...['.wc-gwf-soil','path.wc-gwf-water','.wc-gwf-well'].map(selector=>rgba(getComputedStyle(svg.querySelector(selector)).fill))];
    const geometry=node=>node?.tagName==='path'?node.getAttribute('d'):['x1','x2','y1','y2'].map(name=>node?.getAttribute(name)).join(',');
    return{kind:primary.classList.contains('wc-gwf-level')?'level':'head bracket',side:primary.closest('[data-gwf-well]')?.dataset.gwfWell,stroke:style.stroke,haloStroke:outline?.stroke,strokeWidth:parseFloat(style.strokeWidth),haloWidth:parseFloat(outline?.strokeWidth),sameGeometry:!!halo?.classList.contains('wc-gwf-head-halo')&&primary.tagName===halo.tagName&&geometry(primary)===geometry(halo),pairContrast:haloStroke?ratio(stroke,haloStroke):0,surfaceContrasts:surfaces.map(surface=>({surface,primary:ratio(stroke,surface),halo:haloStroke?ratio(haloStroke,surface):0})),visible:style.display!=='none'&&style.visibility!=='hidden'&&outline?.display!=='none'&&outline?.visibility!=='hidden'};
  });
  return{section:box(section),viewport:innerWidth,overflow:section.scrollWidth>section.clientWidth+1,text,diagrams,diagramMarkers,headMarks,controls:[...section.querySelectorAll('summary,button')].filter(node=>node.getClientRects().length).map(node=>({name:node.textContent.trim(),role:node.tagName,rect:box(node),disabled:node.disabled}))};
}); }
function assessLayout(metrics,config){
  const name=config.name;check(!metrics.overflow&&metrics.section.x>=-1&&metrics.section.right<=metrics.viewport+1,name+' comparison fits its host and viewport',{section:metrics.section,viewport:metrics.viewport});
  for(const[index,item]of metrics.text.entries()){
    check(item.font>=13,name+' text '+index+' is at least13CSSpx',{text:item.text,font:item.font});
    check(!item.splitWords.length,name+' text '+index+' wraps whole words',item.splitWords);
    check(item.textRect.x>=item.panel.x-1&&item.textRect.right<=item.panel.right+1&&item.textRect.y>=item.panel.y-1&&item.textRect.bottom<=item.panel.bottom+1,name+' text '+index+' fits its panel',item);
    check(item.contrast>=(config.theme==='contrast'?7:4.5),name+' text '+index+' contrast',{text:item.text,contrast:item.contrast});
  }
  for(const control of metrics.controls)check(control.rect.width/(config.zoom||1)>=43.99&&control.rect.height/(config.zoom||1)>=43.99,name+' touch target '+control.name,control.rect);
  for(const diagram of metrics.diagrams)check(diagram.bounds.x>=diagram.view.x-1&&diagram.bounds.y>=diagram.view.y-1&&diagram.bounds.x+diagram.bounds.width<=diagram.view.x+diagram.view.width+1&&diagram.bounds.y+diagram.bounds.height<=diagram.view.y+diagram.view.height+1&&diagram.textCount===0,name+' visual diagram stays in viewBox and uses HTML labels',diagram);
  for(const marker of metrics.diagramMarkers)check(marker.display!=='none'&&marker.visibility!=='hidden'&&marker.bounds.x>=marker.svg.x-1&&marker.bounds.right<=marker.svg.right+1&&marker.bounds.y>=marker.svg.y-1&&marker.bounds.bottom<=marker.svg.bottom+1,name+' '+marker.kind+' '+(marker.side||'shared')+' is visible within the diagram',marker);
  check(metrics.headMarks.length===4,name+' both wells expose a visible level and head bracket',metrics.headMarks);
  for(const marker of metrics.headMarks){
    check(marker.visible&&marker.sameGeometry&&marker.strokeWidth>=2&&marker.haloWidth>=marker.strokeWidth+2,name+' '+marker.side+' '+marker.kind+' has an aligned visible outline',marker);
    check(marker.pairContrast>=3&&marker.surfaceContrasts.every(value=>Math.max(value.primary,value.halo)>=3),name+' '+marker.side+' '+marker.kind+' remains distinguishable across diagram surfaces',marker);
  }
}
async function focusCheck(page,config,scope){
  const button=activity(page,scope).locator('[data-gwf-check]');await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await button.hover();
  const focus=await button.evaluate(node=>{const s=getComputedStyle(node);return{visible:node.matches(':focus-visible'),focused:document.activeElement===node,width:parseFloat(s.outlineWidth),style:s.outlineStyle};});check(focus.visible&&focus.focused&&focus.width>=2&&focus.style!=='none',config.name+' keyboard focus stays visible while hovered',focus);
  const label=(await button.textContent()).trim(),hovered=await measurements(page,scope),text=hovered.text.filter(item=>item.text===label);
  check(text.length>0&&text.every(item=>item.contrast>=(config.theme==='contrast'?7:4.5)),config.name+' focused and hovered Check text stays readable',text);
}
async function audit(page,name,scope){const result=await activity(page,scope).evaluate(async node=>{const result=await axe.run(node,{rules:{region:{enabled:false}}});return{violations:result.violations.map(issue=>({id:issue.id,impact:issue.impact,nodes:issue.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),incomplete:result.incomplete.map(issue=>({id:issue.id,targets:issue.nodes.map(node=>node.target)}))};});report.audits.push({name,scope,...result});check(!result.violations.length,name+' scoped groundwater flow axe audit',result.violations);}
async function capture(page,config,scope){const selector='details[data-wc-gw-flow="'+scope+'"]';await page.locator(selector).screenshot({path:path.join(OUT,config.name+'.png'),animations:'disabled',timeout:60000});const bytes=fs.readFileSync(path.join(OUT,config.name+'.png'));report.captures.push({file:config.name+'.png',selector,sourceSha256:sourceSha,sha256:hash(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),bytes:bytes.length});progress('capture '+config.name);}
const configs=[
  {name:'desktop-light',width:1280,theme:'light',setup:'left-high',scope:'explorer'},
  {name:'desktop-dark',width:1280,theme:'dark',setup:'right-high',scope:'explorer'},
  {name:'phone320-light',width:320,theme:'light',setup:'equal',scope:'explorer'},
  {name:'phone390-dark',width:390,theme:'dark',setup:'left-high',scope:'check'},
  {name:'host400-dark',width:1280,hostWidth:400,theme:'dark',setup:'right-high',scope:'check'},
  {name:'phone320-contrast',width:320,theme:'contrast',setup:'equal',scope:'explorer'},
  {name:'phone320-forced',width:320,theme:'light',forced:true,setup:'left-high',scope:'check'},
  {name:'phone390-zoom150',width:390,theme:'light',zoom:1.5,setup:'right-high',scope:'explorer'}
];
(async()=>{
  let browser;
  try{
    requireCheck(report.publicSourceSha256===sourceSha,'Installed source and mirror match');
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});report.origin='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({executablePath:process.env.WC_BROWSER_EXECUTABLE||'C:/Users/cabba/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe',headless:true});
    for(const base of[true,false]){const page=await browser.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>report.errors.push((base?'baseline':'candidate')+': '+String(error)));try{await openPage(page,{...configs[0],name:base?'baseline-native':'candidate-native'},base);await nativeSequence(page,base);}finally{await page.close();}}
    for(const config of configs){progress('theme and host '+config.name);const page=await browser.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>report.errors.push(config.name+': '+String(error)));try{
      await openPage(page,config,false);await mount(page,{...seed,wcSection:config.scope==='check'?'check':'journey'},config.theme);
      if(config.scope==='check'){await action(page,page.locator('#wcCheckInvestigateQuiz'),'theme-native-Check-investigation',{name:config.name});}
      await openLens(page,config.scope);await selectPart(page,config.scope,'groundwater');const before=await snapshot(page);await openFlow(page,config.scope);const row=SETUPS.find(item=>item.id===config.setup);await chooseSetup(page,config.scope,row);await answer(page,config.scope,row.direction);const detail=await submit(page,config.scope,row,row.direction);assessSetup(detail,row,config.scope,config.name);
      check(same(await snapshot(page),before),config.name+' flow inspection preserves all old saved learner state and awards');
      const metrics=await measurements(page,config.scope);assessLayout(metrics,config);await focusCheck(page,config,config.scope);await audit(page,config.name,config.scope);report.cases.push({name:config.name,config,semantics:detail,metrics});await capture(page,config,config.scope);
    }finally{await page.close();}}
    report.completed=true;
  }catch(error){report.errors.push(String(error.stack||error));console.error(error);}
  finally{
    if(browser){await browser.close();report.browserClosed=true;}await new Promise(resolve=>server.close(()=>resolve()));report.serverClosed=true;
    check(hash(fs.readFileSync(MAIN))===sourceSha&&hash(fs.readFileSync(PUBLIC))===sourceSha,'Installed runtime and mirror remain unchanged');check(hash(fs.readFileSync(BASE))===BASE_SHA,'Frozen baseline remains unchanged');check(hash(fs.readFileSync(__filename))===report.harnessSha256,'Harness remains unchanged');check(assetPaths.every(file=>hash(fs.readFileSync(path.join(ROOT,file)))===assets[file]),'Loaded React, renderer host, CSS and axe assets remain unchanged');
    check(!report.errors.length,'No runtime errors',report.errors);check(report.browserClosed&&report.serverClosed,'Owned browser and server closed');check(report.predictionCases.length===9,'All three setups completed all nine native prediction checks');check(report.captures.length===configs.length+2,'Folded, unchecked and eight theme/layout captures complete');check(report.audits.length===8,'Eight theme/layout scoped audits complete');
    report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(item=>item.passed).length;report.failed=report.checks.length-report.passed;report.successful=report.completed&&!report.failed&&!report.errors.length;
    fs.writeFileSync(path.join(OUT,'tested-harness.cjs'),harness);fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out:OUT,sourceSha256:sourceSha,passed:report.passed,failed:report.failed,nativeActions:report.nativeActions.length,predictions:report.predictionCases.length,captures:report.captures.length,audits:report.audits.length,errors:report.errors,successful:report.successful}));if(!report.successful)process.exitCode=1;
  }
})();
