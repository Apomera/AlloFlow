'use strict';
// Uses the actual registered React module, captured once, in an owned fixture.
// It never reads or operates the learner's browser or running preview.
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
const BASE = path.resolve(arg('baseline') || process.env.WC_PHASE_MAP_BASELINE || 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-7/watercycle-phase-map/baseline-runtime.js');
const BASE_SHA = 'ad07af85cc74677dacb388dd27a29b5d874fc498773f6688a62953bccaa42a0a';
const source = fs.readFileSync(MAIN), baseline = fs.readFileSync(BASE), harness = fs.readFileSync(__filename);
const sourceSha = hash(source);
if (arg('expected-sha') !== sourceSha) throw Error('Supply --expected-sha=' + sourceSha);
if (hash(baseline) !== BASE_SHA) throw Error('The frozen pre-enhancement baseline differs');
const OUT = path.resolve(arg('out') || path.join('C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-7/watercycle-phase-map/qa', sourceSha.slice(0, 12) + '-' + new Date().toISOString().replace(/[:.]/g, '-')));
fs.mkdirSync(OUT, { recursive: true });
if (fs.existsSync(path.join(OUT, 'results.json'))) throw Error('Refusing to overwrite an existing evidence run');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const clone = value => JSON.parse(JSON.stringify(value));
const assetPaths = ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'dev-tools/.cache/sweep-tailwind.css', 'desktop/web-app/node_modules/axe-core/axe.min.js'];
const assets = Object.fromEntries(assetPaths.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { startedAt: new Date().toISOString(), pid: process.pid, sourceSha256: sourceSha, publicSourceSha256: hash(fs.readFileSync(PUBLIC)), baselinePath: BASE, baselineSha256: BASE_SHA, harnessSha256: hash(harness), assetSha256: assets,
  method: 'Actual registered React Water Cycle module in an owned localhost fixture. Native details, rendered buttons, keyboard activation, and pre-existing comparison writing control. Frozen baseline receives the same saved learner state and pre-existing writing action. Six transition diagrams and prediction feedback are produced by the mounted renderer. No copied markup or manufactured results.',
  checks: [], cases: [], transitionCases: [], nativeActions: [], semantics: {}, loadedSources: [], captures: [], audits: [], errors: [], completed: false, browserClosed: false, serverClosed: false };
function check(passed, label, detail) { report.checks.push({ passed: !!passed, label, ...(detail === undefined ? {} : { detail }) }); if (!passed) console.log('FAIL ' + label); }
function requireCheck(passed, label, detail) { check(passed, label, detail); if (!passed) throw Error(label); }
function progress(label) { report.lastStep = label; console.log('STEP ' + label); fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({ lastStep: label, captures: report.captures.map(item => item.file), checks: report.checks.length, failed: report.checks.filter(item => !item.passed).length })); }
const seed = {
  wcMode: 'explorer', wcSection: 'conditions', journeyView: '2d', journeyActive: true, journeyPaused: true, wc2dPaused: true,
  activeStage: 'collection', journeyState: 'river_runoff', journeyLoops: 2, journeyLastPath: 'runoff',
  journeyPaths: { runoff: 2, infiltrate: 1, plant: 0 }, journey3dPaths: { runoff: 1, infiltrate: 0, plant: 0 },
  journey3dStatesVisited: { ocean: true, evaporating: true },
  climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55, landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
  wcScenarioBaseline: { climSolar: 1, climTemp: 10, climWind: 1, landRainIntensity: 55, landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass' },
  xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3, completedChallenges: ['complete_journey'],
  wcExperimentLog: [{ key: 'kept', label: 'Keep earlier experiment evidence', notes: { explanation: 'Keep earlier experiment evidence.' } }],
  pilotNotebook: { reflection: 'Keep my journey reflection.', autoSave: false }, wcCheckReflections: { kept: { observation: 'Keep my observation.' } },
  precipHunt: { paused: true, hypothesis: 'Keep the storm prediction.', experiment: { prediction: 'Keep the recorded prediction.', saved: [] } }
};
const ROWS = [
  { id: 'melting', label: 'Melting', from: 'solid', to: 'liquid', fromLabel: 'Ice', toLabel: 'Liquid water', energy: 'absorbed', reverse: 'freezing' },
  { id: 'freezing', label: 'Freezing', from: 'liquid', to: 'solid', fromLabel: 'Liquid water', toLabel: 'Ice', energy: 'released', reverse: 'melting' },
  { id: 'evaporation', label: 'Evaporation', from: 'liquid', to: 'gas', fromLabel: 'Liquid water', toLabel: 'Water vapor', energy: 'absorbed', reverse: 'condensation' },
  { id: 'condensation', label: 'Condensation', from: 'gas', to: 'liquid', fromLabel: 'Water vapor', toLabel: 'Liquid water', energy: 'released', reverse: 'evaporation' },
  { id: 'sublimation', label: 'Sublimation', from: 'solid', to: 'gas', fromLabel: 'Ice', toLabel: 'Water vapor', energy: 'absorbed', reverse: 'deposition' },
  { id: 'deposition', label: 'Deposition', from: 'gas', to: 'solid', fromLabel: 'Water vapor', toLabel: 'Ice', energy: 'released', reverse: 'sublimation' }
];
function html(base) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase change explorer QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui}main{box-sizing:border-box;padding:12px;max-width:1250px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="${base ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js'}"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountPhaseMap=function(seed,theme){ReactDOM.unmountComponentAtNode(document.getElementById('slot'));window.phaseMapAwards=[];window.phaseMapAnnouncements=[];function Host(){const[data,setData]=React.useState({waterCycle:seed});window.phaseMapQAData=data.waterCycle;window.phaseMapQASet=setData;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:(...a)=>phaseMapAnnouncements.push(a),awardXP:(...a)=>phaseMapAwards.push(a),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':theme==='contrast'?'#000':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));};
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
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(phaseMapQAData)));
const awards = page => page.evaluate(() => JSON.parse(JSON.stringify(phaseMapAwards)));
const activity = page => page.locator('details[data-wc-phase-map]');
const normalized = value => { const copy = clone(value); delete copy.wcPhaseChangeMap; return copy; };
const mount = async (page, saved, theme = 'light') => { await page.evaluate(({ saved, theme }) => mountPhaseMap(saved, theme), { saved, theme }); await paint(page); };
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
async function openMap(page) {
  const map = activity(page);
  requireCheck(await map.count() === 1, 'One phase explorer is mounted');
  check(await map.evaluate(element => element.firstElementChild?.tagName === 'SUMMARY'), 'Native summary is the first disclosure child');
  if (!await map.evaluate(element => element.open)) { await map.locator(':scope > summary').focus(); await page.keyboard.press('Enter'); await paint(page); report.nativeActions.push({ action: 'open-keyboard' }); }
  requireCheck(await map.evaluate(element => element.open), 'Native phase disclosure opens with keyboard Enter');
  const clearance = await map.evaluate(element => {
    const summary = element.querySelector(':scope > summary'), scope = element.querySelector('.wc-pm-scope');
    const style = getComputedStyle(summary), range = document.createRange(); range.selectNodeContents(scope);
    return { focused: document.activeElement === summary, focusVisible: summary.matches(':focus-visible'),
      summaryBottom: summary.getBoundingClientRect().bottom, textTop: range.getBoundingClientRect().top,
      outline: parseFloat(style.outlineWidth) || 0, offset: parseFloat(style.outlineOffset) || 0 };
  });
  check(clearance.focused && clearance.focusVisible, 'Keyboard-opened summary retains visible focus', clearance);
  check(clearance.textTop >= clearance.summaryBottom + Math.max(0, clearance.outline + clearance.offset) + 2, 'Focused summary outline has clear space before the scope text', clearance);
}
async function selection(page, row, keyboard = true) {
  const button = activity(page).locator('[data-phase-select="' + row.id + '"]');
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await paint(page);
  requireCheck(await activity(page).locator('[data-phase-detail="' + row.id + '"]').count() === 1, row.id + ' shows selected detail');
  check(await button.getAttribute('aria-pressed') === 'true' && await activity(page).locator('[data-phase-select][aria-pressed="true"]').count() === 1, row.id + ' reports a single selected button');
  if (keyboard) check(await page.evaluate(() => document.activeElement?.id === 'wcPhaseMapDetailTitle'), row.id + ' keyboard selection focuses its detail heading');
  report.nativeActions.push({ action: 'select' + (keyboard ? '-keyboard' : ''), id: row.id });
}
async function semantics(page) { return activity(page).evaluate(map => {
  const detail = map.querySelector('[data-phase-detail]'), result = map.querySelector('[data-phase-result]');
  return { selected: detail?.dataset.phaseDetail, title: map.querySelector('#wcPhaseMapDetailTitle')?.textContent,
    from: detail?.querySelector('[data-phase-from]')?.dataset.phaseFrom, fromText: detail?.querySelector('[data-phase-from]')?.textContent,
    to: detail?.querySelector('[data-phase-to]')?.dataset.phaseTo, toText: detail?.querySelector('[data-phase-to]')?.textContent,
    glyphs: [...(detail?.querySelectorAll('svg[data-phase-glyph]') || [])].map(node => ({ state: node.dataset.phaseGlyph, hidden: node.getAttribute('aria-hidden'), focusable: node.getAttribute('focusable') })),
    result: result?.dataset.phaseResult, resultRole: result?.getAttribute('role'), resultLive: result?.getAttribute('aria-live'), resultText: result?.textContent,
    feedbackTitle: map.querySelector('#wcPhaseMapFeedbackTitle')?.textContent,
    heat: result?.querySelector('[data-phase-heat]')?.dataset.phaseHeat ?? null,
    heatArrow: result?.querySelector('[data-phase-heat-arrow]')?.dataset.phaseHeatArrow ?? null,
    heatLabel: result?.querySelector('[data-phase-heat]')?.getAttribute('aria-label') ?? null,
    answers: [...map.querySelectorAll('[data-phase-answer]')].map(button => ({ id: button.dataset.phaseAnswer, pressed: button.getAttribute('aria-pressed') })),
    checkDisabled: map.querySelector('[data-phase-check]')?.disabled, detailText: detail?.textContent, allText: map.textContent };
}); }
function assessSelection(detail, row, label) {
  check(detail.selected === row.id && detail.title?.includes(row.label), label + ' names chosen phase change', detail.title);
  check(detail.from === row.from && detail.to === row.to && detail.fromText?.toLowerCase().includes(row.fromLabel.toLowerCase()) && detail.toText?.toLowerCase().includes(row.toLabel.toLowerCase()), label + ' labels the actual source and destination', { from: detail.from, fromText: detail.fromText, to: detail.to, toText: detail.toText });
  check(detail.glyphs.length === 2 && detail.glyphs[0].state === row.from && detail.glyphs[1].state === row.to, label + ' diagrams represent the source and destination states', detail.glyphs);
  check(detail.glyphs.every(glyph => glyph.hidden === 'true' && glyph.focusable === 'false'), label + ' decorative diagrams stay out of the accessibility tree', detail.glyphs);
}
async function chooseAnswer(page, answer, keyboard = true) {
  const button = activity(page).locator('[data-phase-answer="' + answer + '"]');
  if (keyboard) { await button.focus(); await page.keyboard.press('Space'); } else await button.click();
  await paint(page);
  check(await button.getAttribute('aria-pressed') === 'true' && await activity(page).locator('[data-phase-answer][aria-pressed="true"]').count() === 1, answer + ' answer reports a single selected button');
  report.nativeActions.push({ action: 'answer' + (keyboard ? '-keyboard' : ''), answer });
}
async function submit(page, expected) {
  const button = activity(page).locator('[data-phase-check]');
  requireCheck(!await button.isDisabled(), 'Chosen energy prediction enables Check');
  await button.focus(); await page.keyboard.press('Enter'); await paint(page);
  const detail = await semantics(page);
  check(detail.result === expected, 'Native Check produces ' + expected + ' feedback', detail.result);
  check(detail.resultRole === 'status' && detail.resultLive === 'polite', 'Feedback has a polite native status');
  check(await page.evaluate(() => document.activeElement?.id === 'wcPhaseMapFeedbackTitle'), 'Checking focuses the feedback heading');
  report.nativeActions.push({ action: 'check-keyboard', expected, actual: detail.result });
  return detail;
}
async function prepareExistingWriting(page, base) {
  const comparison = page.locator('details[data-wc-process-compare="true"]');
  requireCheck(await comparison.count() === 1, (base ? 'baseline' : 'candidate') + ' has existing process comparison');
  await comparison.locator(':scope > summary').click();
  await comparison.locator('#wcProcessExplain').fill('Keep my existing comparison writing while I explore phase changes.');
  const text = await comparison.locator('#wcProcessExplain').inputValue();
  await comparison.locator(':scope > summary').click(); await paint(page);
  return text;
}
async function canvasState(page) { return page.locator('canvas[data-journey-state]').first().evaluate(node => ({ stage: node.dataset.activeStage, parcel: node.dataset.journeyState, paused: node.dataset.journeyPaused })); }
async function nativeSequence(page, base) {
  progress(base ? 'baseline saved state and existing writing' : 'six native phase transitions and prediction checks');
  const written = await prepareExistingWriting(page, base), initial = await state(page), initialAwards = await awards(page), initialCanvas = await canvasState(page);
  if (base) { report.semantics.baseline = { initial: normalized(initial), awards: initialAwards, canvas: initialCanvas, writing: written }; return initial; }
  check(same({ initial: normalized(initial), awards: initialAwards, canvas: initialCanvas, writing: written }, report.semantics.baseline), 'Candidate initially preserves the frozen baseline learner state, paused parcel, writing and awards');
  const map = activity(page);
  requireCheck(await map.count() === 1, 'Phase explorer is present in Explore conditions');
  check(!await map.evaluate(element => element.open), 'Phase explorer starts folded');
  check(await map.evaluate(element => !element.closest('.wc-stage-focus')), 'Phase explorer is outside the stage focus live region');
  check(await map.evaluate(element => { const compare = document.querySelector('details[data-wc-process-compare="true"]'); return compare?.parentElement === element.parentElement && compare.nextElementSibling === element; }), 'Phase explorer follows Compare processes as an adjacent panel');
  await capture(page, { name: 'desktop-folded' });
  await openMap(page);
  const ids = await map.locator('[data-phase-select]').evaluateAll(buttons => buttons.map(button => button.dataset.phaseSelect));
  check(same(ids, ROWS.map(row => row.id)), 'Six phase choices follow the documented order', ids);
  const defaultDetail = await semantics(page); assessSelection(defaultDetail, ROWS.find(row => row.id === 'evaporation'), 'Default evaporation');
  check(defaultDetail.result === 'unchecked' && defaultDetail.checkDisabled && defaultDetail.answers.every(answer => answer.pressed === 'false'), 'Default prediction is unchecked with no answer and disabled Check');
  await capture(page, { name: 'desktop-unchecked' });
  const before = await state(page);
  for (const row of ROWS) {
    await selection(page, row); const untested = await semantics(page); assessSelection(untested, row, row.id);
    check(untested.result === 'unchecked' && untested.checkDisabled && untested.answers.every(answer => answer.pressed === 'false') && untested.heat === null, row.id + ' newly selected process clears the previous answer and revealed heat path');
    await chooseAnswer(page, row.energy); const preCheck = await semantics(page);
    check(preCheck.result === 'unchecked', row.id + ' selected prediction stays unchecked until Check');
    const correct = await submit(page, 'agree');
    check(correct.heat === row.energy && correct.heatArrow === (row.energy === 'absorbed' ? 'right' : 'left') && correct.heatLabel === (row.energy === 'absorbed' ? 'Heat flows from surroundings into water' : 'Heat flows from water into surroundings'), row.id + ' correct feedback shows and labels the true energy direction', { heat: correct.heat, arrow: correct.heatArrow, label: correct.heatLabel });
    await selection(page, row);
    check((await semantics(page)).result === 'agree' && same((await state(page)).wcPhaseChangeMap, { selected: row.id, answer: row.energy, checked: true }), row.id + ' selecting the same row preserves its checked prediction');
    const wrongEnergy = row.energy === 'absorbed' ? 'released' : 'absorbed';
    await chooseAnswer(page, wrongEnergy); const changed = await semantics(page);
    check(changed.result === 'unchecked' && changed.feedbackTitle === 'Make a prediction' && changed.heat === null && changed.heatArrow === null, row.id + ' changing prediction removes the stale revealed heat path');
    const wrong = await submit(page, 'revisit');
    check(wrong.heat === row.energy && wrong.heatArrow === (row.energy === 'absorbed' ? 'right' : 'left') && wrong.resultText?.includes('Revisit your prediction'), row.id + ' revision feedback explains the true energy direction', { heat: wrong.heat, arrow: wrong.heatArrow, text: wrong.resultText });
    const reverseButton = map.locator('[data-phase-reverse]'); await reverseButton.focus(); await page.keyboard.press('Enter'); await paint(page);
    const reverseRow = ROWS.find(item => item.id === row.reverse), reversed = await semantics(page); assessSelection(reversed, reverseRow, row.id + ' reversed');
    check(reversed.result === 'unchecked' && reversed.checkDisabled && reversed.answers.every(answer => answer.pressed === 'false'), row.id + ' reverse clears prediction and checked feedback');
    check(await page.evaluate(() => document.activeElement?.id === 'wcPhaseMapDetailTitle'), row.id + ' reverse focuses the new detail heading');
    report.nativeActions.push({ action: 'reverse-keyboard', from: row.id, to: row.reverse });
    await reverseButton.focus(); await page.keyboard.press('Enter'); await paint(page);
    check((await semantics(page)).selected === row.id, row.id + ' reverse twice returns to the original process');
    report.nativeActions.push({ action: 'reverse-keyboard', from: row.reverse, to: row.id });
    check(same(normalized(await state(page)), normalized(before)), row.id + ' interactions preserve all old climate, land, journey, progress, reward, evidence and writing state');
    check(same(await awards(page), initialAwards), row.id + ' interactions award no XP');
    check(same(await canvasState(page), initialCanvas) && initialCanvas.parcel === 'river_runoff' && initialCanvas.paused === 'true', row.id + ' interactions preserve the active paused parcel route');
    report.transitionCases.push({ id: row.id, correctEnergy: row.energy, selected: untested, correct, wrong, reversed });
  }
  await selection(page, ROWS.find(row => row.id === 'deposition')); await chooseAnswer(page, 'released'); await submit(page, 'agree');
  const savedMap = clone((await state(page)).wcPhaseChangeMap);
  await map.locator(':scope > summary').focus(); await page.keyboard.press('Space'); await paint(page);
  check(!await map.evaluate(element => element.open), 'Keyboard Space folds the phase explorer');
  await openMap(page);
  check(same((await state(page)).wcPhaseChangeMap, savedMap) && (await semantics(page)).result === 'agree', 'Collapsing and reopening preserves the checked phase prediction');
  const preservedWriting = page.locator('details[data-wc-process-compare="true"]'); await preservedWriting.locator(':scope > summary').click();
  check(await preservedWriting.locator('#wcProcessExplain').inputValue() === written, 'Existing process comparison writing remains available');
  await preservedWriting.locator(':scope > summary').click();
  const beforeRemount = await state(page); await mount(page, beforeRemount);
  check(!await activity(page).evaluate(element => element.open), 'Saved checked phase prediction mounts with disclosure folded');
  await openMap(page);
  check((await semantics(page)).selected === 'deposition' && (await semantics(page)).result === 'agree' && same((await state(page)).wcPhaseChangeMap, savedMap), 'Saved checked selection and answer restore on remount');
  check(same(normalized(await state(page)), normalized(beforeRemount)), 'Remount preserves the existing saved learner state');
  const malformed = clone(initial); malformed.wcPhaseChangeMap = { selected: 'retired-process', answer: 'released', checked: true };
  await mount(page, malformed); await openMap(page); const fallback = await semantics(page);
  check(fallback.selected === 'evaporation' && fallback.result === 'unchecked' && fallback.checkDisabled, 'Stale saved phase selection falls back to an unchecked evaporation view');
  check(same(normalized(await state(page)), normalized(malformed)), 'Stale selection fallback preserves old saved learner state');
  report.semantics.candidate = { initial: normalized(initial), finalBeforeRemount: normalized(beforeRemount), awards: await awards(page), canvas: await canvasState(page), writing: written };
  return initial;
}
async function measurements(page) { return activity(page).evaluate(section => {
  const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const rgba = color => { const n = (color.match(/[\d.]+/g) || []).map(Number); return [n[0] || 0, n[1] || 0, n[2] || 0, n.length > 3 ? n[3] : 1]; };
  const over = (a, b) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
  const lum = color => { const n = color.slice(0, 3).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return n[0] * .2126 + n[1] * .7152 + n[2] * .0722; };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
  function backgrounds(element) { const parents = []; for (let p = element; p; p = p.parentElement) parents.unshift(p); let result = [[255, 255, 255, 1]]; for (const parent of parents) { const style = getComputedStyle(parent); result = result.map(color => over(rgba(style.backgroundColor), color)); const stops = (style.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(rgba); if (stops.length) result = result.flatMap(color => stops.map(stop => over(stop, color))).slice(0, 8); } return result; }
  const text = [], walk = document.createTreeWalker(section, NodeFilter.SHOW_TEXT); let node;
  while (node = walk.nextNode()) {
    const element = node.parentElement;
    if (!node.textContent.trim() || !element.getClientRects().length || element.closest('style,svg,[aria-hidden="true"]')) continue;
    const style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(node); const rect = range.getBoundingClientRect();
    const splitWords = [...node.textContent.matchAll(/[\p{L}\p{N}]+/gu)].map(match => { const r = document.createRange(); r.setStart(node, match.index); r.setEnd(node, match.index + match[0].length); return { word: match[0], lines: r.getClientRects().length }; }).filter(word => word.lines > 1);
    const colors = backgrounds(element), foreground = rgba(style.color), panel = element.closest('[data-phase-from],[data-phase-to],[data-phase-result],button,summary,[data-phase-detail]') || section;
    text.push({ text: node.textContent.trim(), font: parseFloat(style.fontSize), color: style.color, contrast: Math.min(...colors.map(color => ratio(over(foreground, color), color))), splitWords, panel: box(panel), textRect: { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom } });
  }
  const heat = section.querySelector('[data-phase-heat]');
  let heatGeometry = null;
  if (heat) {
    const pathElement = heat.querySelector('svg path'), ink = box(pathElement), matrix = pathElement.getScreenCTM();
    const stroke = parseFloat(getComputedStyle(pathElement).strokeWidth) || 0;
    // Include stroke in screen coordinates. This is exact for this glyph's
    // orthogonal rotation and conservative for any future affine transform.
    const padX = stroke / 2 * Math.hypot(matrix.a, matrix.c), padY = stroke / 2 * Math.hypot(matrix.b, matrix.d);
    const painting = { x: ink.x - padX, y: ink.y - padY, right: ink.right + padX, bottom: ink.bottom + padY, width: ink.width + 2 * padX, height: ink.height + 2 * padY };
    heatGeometry = { container: box(heat), actors: [...heat.children].filter(element => element.tagName === 'SPAN').map(box),
      arrow: box(heat.querySelector('svg')), path: ink, strokeWidth: stroke,
      screenMatrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f }, painting };
  }
  return { section: box(section), viewport: innerWidth, overflow: section.scrollWidth > section.clientWidth + 1, text,
    heatGeometry,
    controls: [...section.querySelectorAll('summary,button')].filter(element => element.getClientRects().length).map(element => ({ name: element.textContent.trim(), role: element.tagName, rect: box(element), disabled: element.disabled })) };
}); }
function assessLayout(metrics, config) {
  const name = config.name;
  check(!metrics.overflow && metrics.section.x >= -1 && metrics.section.right <= metrics.viewport + 1, name + ' phase explorer fits its host and viewport', { section: metrics.section, viewport: metrics.viewport });
  for (const [index, item] of metrics.text.entries()) {
    check(item.font >= 13, name + ' text ' + index + ' is at least 13 CSS px', { text: item.text, font: item.font });
    check(!item.splitWords.length, name + ' text ' + index + ' wraps whole words', item.splitWords);
    check(item.textRect.x >= item.panel.x - 1 && item.textRect.right <= item.panel.right + 1 && item.textRect.y >= item.panel.y - 1 && item.textRect.bottom <= item.panel.bottom + 1, name + ' text ' + index + ' fits its panel', item);
    check(item.contrast >= (config.theme === 'contrast' ? 7 : 4.5), name + ' text ' + index + ' contrast', { text: item.text, contrast: item.contrast });
  }
  for (const control of metrics.controls) check(control.rect.width / (config.zoom || 1) >= 44 && control.rect.height / (config.zoom || 1) >= 44, name + ' touch target ' + control.name, control.rect);
  if (metrics.heatGeometry) {
    const { actors, painting: ink } = metrics.heatGeometry;
    const overlap = rectangle => Math.min(rectangle.right, ink.right) > Math.max(rectangle.x, ink.x) + .5 && Math.min(rectangle.bottom, ink.bottom) > Math.max(rectangle.y, ink.y) + .5;
    check(actors.length === 2 && actors.every(actor => !overlap(actor)), name + ' rendered heat arrow including its stroke does not overlap either actor card', metrics.heatGeometry);
  }
}
async function focusCheck(page, config) {
  const button = activity(page).locator('[data-phase-check]'); await button.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await button.hover();
  const focus = await button.evaluate(element => { const style = getComputedStyle(element); return { visible: element.matches(':focus-visible'), focused: document.activeElement === element, width: parseFloat(style.outlineWidth), style: style.outlineStyle }; });
  check(focus.visible && focus.focused && focus.width >= 2 && focus.style !== 'none', config.name + ' keyboard focus remains visible while hovered', focus);
}
async function audit(page, name) {
  const result = await page.evaluate(async () => { const result = await axe.run(document.querySelector('details[data-wc-phase-map]'), { rules: { region: { enabled: false } } }); return { violations: result.violations.map(issue => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: result.incomplete.map(issue => ({ id: issue.id, targets: issue.nodes.map(node => node.target) })) }; });
  report.audits.push({ name, ...result }); check(!result.violations.length, name + ' scoped phase explorer axe audit', result.violations);
}
async function capture(page, config) {
  const selector = 'details[data-wc-phase-map]'; await page.locator(selector).screenshot({ path: path.join(OUT, config.name + '.png'), animations: 'disabled', timeout: 60000 });
  const bytes = fs.readFileSync(path.join(OUT, config.name + '.png'));
  report.captures.push({ file: config.name + '.png', selector, sourceSha256: sourceSha, sha256: hash(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length });
  progress('capture ' + config.name);
}
const configs = [
  { name: 'desktop-light', width: 1280, theme: 'light', selected: 'evaporation' },
  { name: 'desktop-dark', width: 1280, theme: 'dark', selected: 'condensation' },
  { name: 'phone320-light', width: 320, theme: 'light', selected: 'melting' },
  { name: 'phone390-dark', width: 390, theme: 'dark', selected: 'freezing' },
  { name: 'host400-dark', width: 1280, hostWidth: 400, theme: 'dark', selected: 'sublimation' },
  { name: 'phone320-contrast', width: 320, theme: 'contrast', selected: 'deposition' },
  { name: 'phone320-forced', width: 320, theme: 'light', forced: true, selected: 'deposition' },
  { name: 'phone390-zoom150', width: 390, theme: 'light', zoom: 1.5, selected: 'condensation' }
];
(async () => {
  let browser, initial;
  try {
    requireCheck(report.publicSourceSha256 === sourceSha, 'Installed source and public mirror match');
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); report.origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ executablePath: process.env.WC_BROWSER_EXECUTABLE || 'C:/Users/cabba/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: true });
    for (const base of [true, false]) {
      const page = await browser.newPage(); page.setDefaultTimeout(45000); page.on('pageerror', error => report.errors.push((base ? 'baseline' : 'candidate') + ': ' + String(error)));
      try { await openPage(page, { ...configs[0], name: base ? 'baseline-native' : 'candidate-native' }, base); initial = await nativeSequence(page, base); }
      finally { await page.close(); }
    }
    for (const config of configs) {
      progress('theme and host ' + config.name);
      const page = await browser.newPage(); page.setDefaultTimeout(45000); page.on('pageerror', error => report.errors.push(config.name + ': ' + String(error)));
      try {
        await openPage(page, config, false); await mount(page, initial, config.theme); const before = await state(page); await openMap(page);
        const row = ROWS.find(item => item.id === config.selected); await selection(page, row); await chooseAnswer(page, row.energy); const detail = await submit(page, 'agree'); assessSelection(detail, row, config.name);
        check(same(normalized(await state(page)), normalized(before)), config.name + ' inspection keeps all old saved learner state');
        const metrics = await measurements(page); assessLayout(metrics, config); await focusCheck(page, config); await audit(page, config.name);
        report.cases.push({ name: config.name, config, semantics: detail, metrics }); await capture(page, config);
      } finally { await page.close(); }
    }
    report.completed = true;
  } catch (error) { report.errors.push(String(error.stack || error)); console.error(error); }
  finally {
    if (browser) { await browser.close(); report.browserClosed = true; }
    await new Promise(resolve => server.close(() => resolve())); report.serverClosed = true;
    check(hash(fs.readFileSync(MAIN)) === sourceSha && hash(fs.readFileSync(PUBLIC)) === sourceSha, 'Installed runtime and mirror remain unchanged');
    check(hash(fs.readFileSync(BASE)) === BASE_SHA, 'Frozen baseline remains unchanged');
    check(hash(fs.readFileSync(__filename)) === report.harnessSha256, 'Harness remains unchanged');
    check(assetPaths.every(file => hash(fs.readFileSync(path.join(ROOT, file))) === assets[file]), 'Loaded React, renderer host, CSS and axe assets remain unchanged');
    check(!report.errors.length, 'No runtime errors', report.errors); check(report.browserClosed && report.serverClosed, 'Owned browser and server closed');
    check(report.transitionCases.length === 6, 'All six phase transitions completed native prediction and reverse checks');
    check(report.captures.length === configs.length + 2, 'Folded, unchecked and eight theme/layout captures complete');
    report.finishedAt = new Date().toISOString(); report.passed = report.checks.filter(item => item.passed).length; report.failed = report.checks.length - report.passed; report.successful = report.completed && !report.failed && !report.errors.length;
    fs.writeFileSync(path.join(OUT, 'tested-harness.cjs'), harness); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out: OUT, sourceSha256: sourceSha, passed: report.passed, failed: report.failed, nativeActions: report.nativeActions.length, transitions: report.transitionCases.length, captures: report.captures.length, audits: report.audits.length, errors: report.errors, successful: report.successful }));
    if (!report.successful) process.exitCode = 1;
  }
})();
