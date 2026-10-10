'use strict';
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
const BASE = path.resolve(arg('baseline') || 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-7/watercycle-steward-connections/baseline-runtime.js');
const BASE_SHA = 'e4fc1f8963506efd5d03dbab7cf4ce6204403f513899ff5fbedd225bbf57720c';
const source = fs.readFileSync(MAIN), baseline = fs.readFileSync(BASE), harness = fs.readFileSync(__filename);
const sourceSha = hash(source);
if (arg('expected-sha') !== sourceSha) throw Error('Supply --expected-sha=' + sourceSha);
if (hash(baseline) !== BASE_SHA) throw Error('The frozen pre-enhancement baseline differs');
const OUT = path.resolve(arg('out') || path.join('C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-7/watercycle-steward-connections/qa', sourceSha.slice(0, 12) + '-' + new Date().toISOString().replace(/[:.]/g, '-')));
fs.mkdirSync(OUT, { recursive: true });
if (fs.existsSync(path.join(OUT, 'results.json'))) throw Error('Refusing to overwrite an existing evidence run');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const clone = value => JSON.parse(JSON.stringify(value));
const assetPaths = ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'dev-tools/.cache/sweep-tailwind.css', 'desktop/web-app/node_modules/axe-core/axe.min.js'];
const assets = Object.fromEntries(assetPaths.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { startedAt: new Date().toISOString(), pid: process.pid, sourceSha256: sourceSha, publicSourceSha256: hash(fs.readFileSync(PUBLIC)), baselinePath: BASE, baselineSha256: BASE_SHA, harnessSha256: hash(harness), assetSha256: assets, method: 'Actual React Water Cycle module in an owned localhost fixture. Native details, buttons, keyboard activation, action preview/cancel/apply and end-year handlers. Original pre-enhancement runtime receives the same campaign seed and native action sequence. Scores are seeded test inputs; displayed connections and action/year results are produced by the mounted renderer. Screenshots crop mounted inspector DOM. No copied markup or manufactured results.', checks: [], cases: [], conditionCases: [], nativeActions: [], semantics: {}, loadedSources: [], captures: [], audits: [], errors: [], completed: false, browserClosed: false, serverClosed: false };
function check(passed, label, detail) { report.checks.push({ passed: !!passed, label, ...(detail === undefined ? {} : { detail }) }); if (!passed) console.log('FAIL ' + label); }
function requireCheck(passed, label, detail) { check(passed, label, detail); if (!passed) throw Error(label); }
const seed = { wcMode: 'steward', journeyView: '2d', journeyActive: false, wc2dPaused: true, xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3, completedChallenges: ['complete_journey'], wcExperimentLog: [{ key: 'kept', notes: { explanation: 'Keep earlier experiment evidence.' } }], pilotNotebook: { reflection: 'Keep my journey reflection.', autoSave: false }, wcCheckReflections: { kept: { observation: 'Keep my observation.' } }, precipHunt: { paused: true, hypothesis: 'Keep the storm prediction.', experiment: { prediction: 'Keep the recorded prediction.', saved: [] } } };
function html(base) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steward connections QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui}main{box-sizing:border-box;padding:12px;max-width:1250px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="${base ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js'}"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountSteward=function(seed,theme){ReactDOM.unmountComponentAtNode(document.getElementById('slot'));window.stewardAwards=[];window.stewardAnnouncements=[];function Host(){const[data,setData]=React.useState({waterCycle:seed});window.stewardQAData=data.waterCycle;window.stewardQASet=setData;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:(...a)=>stewardAnnouncements.push(a),awardXP:(...a)=>stewardAwards.push(a),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':theme==='contrast'?'#000':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));};
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
const state = page => page.evaluate(() => JSON.parse(JSON.stringify(stewardQAData)));
const awards = page => page.evaluate(() => JSON.parse(JSON.stringify(stewardAwards)));
const mount = async (page, saved, theme = 'light') => { await page.evaluate(({ saved, theme }) => mountSteward(saved, theme), { saved, theme }); await paint(page); };
const click = (page, name) => page.getByRole('button', { name, exact: true }).click();
async function openPage(page, config, base) {
  await page.setViewportSize({ width: config.width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: config.forced ? 'active' : 'none' });
  const response = page.waitForResponse(item => item.url().endsWith(base ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js'));
  await page.goto(report.origin + (base ? '/baseline' : '/'));
  const loaded = hash(await (await response).body());
  report.loadedSources.push({ name: config.name, baseline: base, sha256: loaded });
  requireCheck(loaded === (base ? BASE_SHA : sourceSha), config.name + ' loads the intended source');
  await page.addScriptTag({ url: report.origin + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
  await page.evaluate(config => { document.body.style.zoom = config.zoom || 1; document.getElementById('slot').style.maxWidth = (config.hostWidth || 1250) + 'px'; }, config);
  await mount(page, seed, config.theme);
}
async function freshCampaign(page) {
  await click(page, '💧 Begin 10-year Watershed Campaign');
  await page.evaluate(() => stewardQASet(previous => {
    const steward = { ...previous.waterCycle.steward, seed: 'steward-connections-qa-fixed' };
    steward.components = steward.components.map(component => ({ ...component, ...(component.id === 'forestBuffer' ? { quality: 70 } : component.id === 'floodplainWetlands' || component.id === 'agriculturalWatershed' ? { quality: 60 } : component.id === 'riverMainstem' ? { connectivity: 60 } : {}) }));
    steward.yearStart = steward.components.map(component => ({ ...component }));
    return { ...previous, waterCycle: { ...previous.waterCycle, steward } };
  }));
  await paint(page); return state(page);
}
async function openInspector(page) {
  const inspector = page.locator('.wc-steward-connections');
  if (!(await inspector.evaluate(element => element.open))) {
    await inspector.locator('summary').focus(); await page.keyboard.press('Enter'); await paint(page);
  }
  requireCheck(await inspector.evaluate(element => element.open), 'Native details opens with keyboard Enter');
}
const IDS = ['bufferFeedsHeadwaters', 'beaverHelpsFloodplain', 'agCleansUp', 'runRestoration'];
const CONDITIONS = { bufferFeedsHeadwaters: [['forestBuffer', 'quality', 70]], beaverHelpsFloodplain: [['floodplainWetlands', 'quality', 60]], agCleansUp: [['agriculturalWatershed', 'quality', 60]], runRestoration: [['riverMainstem', 'connectivity', 60], ['forestBuffer', 'quality', 60]] };
const EFFECTS = { bufferFeedsHeadwaters: ['+4 Quality', 'Headwater Streams'], beaverHelpsFloodplain: ['+3 Quality', '+2 Habitat connection', 'River Mainstem'], agCleansUp: ['+4 Quality', 'River Mainstem'], runRestoration: ['+2 Community support', 'Every watershed place'] };
async function selectConnection(page, id, keyboard = true) {
  const button = page.locator('[data-wc-connection="' + id + '"]');
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await paint(page);
  requireCheck(await page.locator('[data-wc-connection-detail="' + id + '"]').count() === 1, id + ' shows its selected detail');
  check(await button.getAttribute('aria-pressed') === 'true', id + ' reports selected state');
  check(await page.locator('[data-wc-connection][aria-pressed="true"]').count() === 1, id + ' is the only selected connection');
  if (keyboard) check(await button.evaluate(element => document.activeElement === element), id + ' keyboard selection retains button focus');
  check((await state(page)).wcStewardConnection === id, id + ' stores the inspection selection for future renders');
  const status = page.locator('[data-wc-current-status]');
  check(await status.getAttribute('role') === 'status' && await status.getAttribute('aria-live') === 'polite' && await status.getAttribute('aria-atomic') === 'true', id + ' has a polite atomic status');
}
async function inspectorSemantics(page) { return page.locator('.wc-connection-detail').evaluate(detail => ({ id: detail.dataset.wcConnectionDetail, title: detail.querySelector('h4').textContent, current: detail.querySelector('[data-wc-current-status]').dataset.wcCurrentStatus, currentText: detail.querySelector('[data-wc-current-status]').textContent, preview: detail.querySelector('[data-wc-preview-status]')?.dataset.wcPreviewStatus ?? null, previewText: detail.querySelector('[data-wc-preview-status]')?.textContent ?? null, conditions: [...detail.querySelectorAll('[data-wc-condition]')].map(row => ({ key: row.dataset.wcCondition, score: row.querySelector('.wc-connection-reading strong').textContent, requirement: [...row.querySelectorAll('.wc-connection-requirement')].find(element => element.textContent.includes('Exactly')).textContent, state: row.querySelector('.wc-connection-condition-state').textContent, preview: row.querySelector('.wc-connection-condition-preview')?.textContent ?? null })), effects: detail.querySelector('.wc-connection-effects').textContent, timing: detail.querySelector('.wc-connection-timing').textContent, actions: [...detail.querySelectorAll('[data-wc-connection-action]')].map(button => ({ id: button.dataset.wcConnectionAction, disabled: button.disabled })) })); }
function expectedStatus(saved, id) {
  const values = CONDITIONS[id].map(([componentId, field, threshold]) => { const value = saved.steward.components.find(component => component.id === componentId)?.[field]; return typeof value === 'number' && Number.isFinite(value) ? value > threshold : null; });
  return values.includes(null) ? 'unknown' : values.every(Boolean) ? 'met' : 'unmet';
}
function assessInspector(saved, semantics, label) {
  check(semantics.current === expectedStatus(saved, semantics.id), label + ' reflects strict model conditions', { actual: semantics.current, expected: expectedStatus(saved, semantics.id) });
  check(semantics.conditions.length === CONDITIONS[semantics.id].length, label + ' shows every required condition');
  for (const [componentId, field, threshold] of CONDITIONS[semantics.id]) {
    const row = semantics.conditions.find(item => item.key === componentId + ':' + field), value = saved.steward.components.find(component => component.id === componentId)?.[field];
    check(!!row, label + ' includes ' + componentId + ':' + field);
    if (!row) continue;
    const finite = typeof value === 'number' && Number.isFinite(value);
    check(finite ? row.score === ((Math.round(value * 100) / 100 === value ? '' : '≈') + String(Math.round(value * 100) / 100)) : /unavailable|recorded/i.test(row.score), label + ' reports the actual current score', { value, row });
    check(row.requirement.includes('above ' + threshold) && row.requirement.includes('Exactly ' + threshold), label + ' distinguishes strict threshold equality', row.requirement);
    check(row.state === (finite ? value > threshold ? 'Above the threshold' : 'At or below the threshold' : 'Score unavailable'), label + ' has the correct textual condition state', row);
  }
  check(EFFECTS[semantics.id].every(text => semantics.effects.includes(text)), label + ' explains target and point effects', semantics.effects);
  check(semantics.effects.includes('capped at 100') && semantics.timing.includes('Earlier effects can change later conditions') && semantics.timing.includes('do not guarantee the year-end outcome'), label + ' explains score caps, rule order and timing');
}
function normalized(saved) { const result = clone(saved); delete result.wcStewardConnection; return result; }
async function nativeSequence(page, base) {
  const name = base ? 'baseline' : 'candidate', initial = await freshCampaign(page);
  if (!base) {
    check(!await page.locator('.wc-steward-connections').evaluate(element => element.open), 'Connection guide is closed initially');
    await openInspector(page);
    const before = await state(page), previousAwards = await awards(page);
    check(await page.locator('[data-wc-connection]').count() === 4, 'Four native connection choices');
    for (const id of IDS) { await selectConnection(page, id); const saved = await state(page), detail = await inspectorSemantics(page); assessInspector(saved, detail, id); check(same(saved.steward, before.steward), id + ' inspection preserves the entire campaign'); report.nativeActions.push({ runtime: name, action: 'inspect-connection-keyboard', id }); }
    check(same(await awards(page), previousAwards), 'Connection inspection does not award XP');
    await selectConnection(page, IDS[0]);
  }
  const trigger = base ? page.locator('#wc-steward-action-bufferPlant-forestBuffer') : page.locator('[data-wc-connection-action="bufferPlant:forestBuffer"]');
  await trigger.focus(); await page.keyboard.press('Enter'); await page.locator('.wc-steward-decision').waitFor();
  await page.waitForFunction(() => document.activeElement?.id === 'wc-steward-decision-title');
  const preview = await state(page);
  check(same(preview.steward.components, initial.steward.components) && preview.steward.hoursLeft === initial.steward.hoursLeft && same(preview.steward.yearActions, initial.steward.yearActions), name + ' preview does not change model scores, hours or action history');
  const decisionText = await page.locator('.wc-steward-decision').innerText();
  check(decisionText.includes('70 → 78') && decisionText.includes('13 hours remain'), name + ' renders the native immediate action result');
  report.nativeActions.push({ runtime: name, action: 'preview-keyboard', id: 'bufferPlant:forestBuffer' });
  if (!base) {
    check(await page.locator('.wc-steward-connections').evaluate(element => element.open), 'Connection guide stays open during preview');
    const detail = await inspectorSemantics(page);
    check(detail.current === 'unmet' && detail.preview === 'met', 'Preview distinguishes current unmet and immediate met condition');
    check(detail.previewText.includes('If this action is applied') && detail.conditions[0].preview.includes('78'), 'Preview names the conditional action and actual next score');
    check(detail.previewText.toLowerCase().includes('would be') && detail.previewText.toLowerCase().includes('after this action') && !detail.previewText.toLowerCase().includes('condition met now'), 'Hypothetical result uses future wording while current eligibility remains unmet', detail.previewText);
    await capture(page, { name: 'desktop-action-preview' }, '.wc-connection-detail');
  }
  await page.keyboard.press('Tab');
  check(await page.evaluate(() => document.activeElement.textContent) === 'Cancel', name + ' keyboard reaches Cancel from preview heading');
  await page.keyboard.press('Enter'); await paint(page);
  check(!await page.locator('.wc-steward-decision').count(), name + ' Cancel dismisses the pending decision');
  check(same((await state(page)).steward, initial.steward), name + ' Cancel preserves the complete initial campaign');
  report.nativeActions.push({ runtime: name, action: 'cancel-keyboard' });
  if (!base) check(!await page.locator('[data-wc-preview-status]').count() && await page.locator('.wc-steward-connections').evaluate(element => element.open), 'Cancel removes hypothetical results while keeping guide open');
  await trigger.click(); await click(page, 'Apply action · 5h'); await paint(page);
  await page.waitForFunction(() => document.activeElement?.id === 'wc-steward-action-log');
  const applied = await state(page);
  const forest = applied.steward.components.find(component => component.id === 'forestBuffer');
  check(forest.quality === 78 && applied.steward.hoursLeft === 13 && applied.steward.yearActions.length === 1, name + ' Apply uses real action math and spends hours once');
  report.nativeActions.push({ runtime: name, action: 'apply', id: 'bufferPlant:forestBuffer' });
  if (!base) { const detail = await inspectorSemantics(page); check(detail.current === 'met' && detail.preview === null, 'Applied action becomes current score and clears hypothetical preview'); }
  await click(page, 'End this year'); await page.locator('.wc-steward-ledger').waitFor();
  const ending = await state(page);
  report.nativeActions.push({ runtime: name, action: 'end-year', year: ending.steward.year });
  check(ending.steward.yearLog.length === 1 && ending.steward.yearLog[0].stages.length >= 5, name + ' records real year-end effects');
  const outcome = { initial: normalized(initial), preview: normalized(preview), decisionText, applied: normalized(applied), ending: normalized(ending), awards: await awards(page) };
  report.semantics[name] = outcome;
  if (!base) check(same(outcome, report.semantics.baseline), 'Native preview, Cancel, Apply, year-end scores/history, saved learner work and awards exactly match the frozen model');
  return initial;
}
function changedSeed(initial, patches, missing) {
  const saved = clone(initial);
  saved.steward.components = saved.steward.components.map(component => ({ ...component, ...(patches[component.id] || {}) }));
  for (const [componentId, field] of missing || []) delete saved.steward.components.find(component => component.id === componentId)[field];
  saved.steward.yearStart = clone(saved.steward.components); return saved;
}
async function boundaries(page, initial) {
  const tests = [
    { name: 'forest-exact70', id: IDS[0], patches: { forestBuffer: { quality: 70 } }, status: 'unmet' },
    { name: 'forest-above70', id: IDS[0], patches: { forestBuffer: { quality: 70.1 } }, status: 'met' },
    { name: 'forest-rounded-above70', id: IDS[0], patches: { forestBuffer: { quality: 70.001 } }, status: 'met', rounded: '≈70' },
    { name: 'forest-rounded-below70', id: IDS[0], patches: { forestBuffer: { quality: 69.999 } }, status: 'unmet', rounded: '≈70' },
    { name: 'wetland-exact60', id: IDS[1], patches: { floodplainWetlands: { quality: 60 } }, status: 'unmet' },
    { name: 'wetland-above60', id: IDS[1], patches: { floodplainWetlands: { quality: 60.1 } }, status: 'met' },
    { name: 'farm-exact60', id: IDS[2], patches: { agriculturalWatershed: { quality: 60 } }, status: 'unmet' },
    { name: 'farm-above60', id: IDS[2], patches: { agriculturalWatershed: { quality: 60.1 } }, status: 'met' },
    { name: 'restoration-river-equal60', id: IDS[3], patches: { forestBuffer: { quality: 61 }, riverMainstem: { connectivity: 60 } }, status: 'unmet' },
    { name: 'restoration-forest-equal60', id: IDS[3], patches: { forestBuffer: { quality: 60 }, riverMainstem: { connectivity: 61 } }, status: 'unmet' },
    { name: 'restoration-both-above60', id: IDS[3], patches: { forestBuffer: { quality: 60.1 }, riverMainstem: { connectivity: 60.1 } }, status: 'met' },
    { name: 'forest-missing-quality', id: IDS[0], patches: {}, missing: [['forestBuffer', 'quality']], status: 'unknown' },
    { name: 'restoration-missing-connectivity', id: IDS[3], patches: { forestBuffer: { quality: 61 } }, missing: [['riverMainstem', 'connectivity']], status: 'unknown' }
  ];
  for (const test of tests) {
    const saved = changedSeed(initial, test.patches, test.missing); await mount(page, saved); await openInspector(page); await selectConnection(page, test.id);
    const detail = await inspectorSemantics(page); assessInspector(saved, detail, test.name); check(detail.current === test.status, test.name + ' boundary status', detail);
    if (test.rounded) {
      check(detail.conditions[0].score === test.rounded, test.name + ' displays the approximation marker with the same rounded score', detail.conditions[0]);
      check(detail.effects.includes('Eligibility uses unrounded scores') && detail.effects.includes('≈ marks a rounded display'), test.name + ' explains precision and strict eligibility', detail.effects);
    }
    check(same((await state(page)).steward, saved.steward), test.name + ' inspection keeps missing/current model data intact');
    report.conditionCases.push({ name: test.name, selected: test.id, patches: test.patches, missing: test.missing, semantics: detail });
  }
  const fish = changedSeed(initial, { forestBuffer: { quality: 61 }, riverMainstem: { connectivity: 60 } });
  await mount(page, fish); await openInspector(page); await selectConnection(page, IDS[3]);
  await page.locator('[data-wc-connection-action="fishPassage:riverMainstem"]').click(); await paint(page);
  const fishDetail = await inspectorSemantics(page);
  check(fishDetail.current === 'unmet' && fishDetail.preview === 'met', 'Compound condition preview becomes met only when both immediate scores exceed 60');
  check(fishDetail.conditions.find(row => row.key === 'riverMainstem:connectivity').preview.includes('74') && fishDetail.conditions.find(row => row.key === 'forestBuffer:quality').preview.includes('61'), 'Compound preview reports actual passage score and unchanged buffer score');
  check(same((await state(page)).steward.components, fish.steward.components) && (await state(page)).steward.hoursLeft === fish.steward.hoursLeft, 'Compound guide preview preserves actual components and hours');
  report.nativeActions.push({ runtime: 'candidate', action: 'compound-preview', id: 'fishPassage:riverMainstem' });
  await click(page, 'Cancel'); await paint(page);
  check(!await page.locator('[data-wc-preview-status]').count(), 'Compound preview clears on Cancel');
  report.nativeActions.push({ runtime: 'candidate', action: 'compound-cancel' });
  const limited = clone(initial); limited.steward.hoursLeft = 3; await mount(page, limited); await openInspector(page); await selectConnection(page, IDS[0]);
  check(await page.locator('[data-wc-connection-action="bufferPlant:forestBuffer"]').isDisabled(), 'Relevant action is disabled when hours are insufficient');
  check(!await page.locator('[data-wc-preview-status]').count(), 'Insufficient hours do not create hypothetical preview scores');
  const stale = clone(initial); stale.wcStewardConnection = 'removed-old-selection'; await mount(page, stale); await openInspector(page);
  check(await page.locator('[data-wc-connection-detail="bufferFeedsHeadwaters"]').count() === 1, 'Old invalid selection falls back to the first connection');
  check(same((await state(page)).steward, stale.steward), 'Selection fallback preserves the saved campaign');
}
async function measurements(page) { return page.locator('.wc-steward-connections').evaluate(section => {
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
    const colors = backgrounds(element), foreground = rgba(style.color), panel = element.closest('.wc-connection-condition,.wc-connection-detail,.wc-connection-options,summary') || section;
    text.push({ text: node.textContent.trim(), font: parseFloat(style.fontSize), color: style.color, contrast: Math.min(...colors.map(color => ratio(over(foreground, color), color))), splitWords, panel: box(panel), textRect: { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom } });
  }
  return { section: box(section), viewport: innerWidth, theme: section.dataset.wcConnectionsTheme, overflow: section.scrollWidth > section.clientWidth + 1, text, controls: [...section.querySelectorAll('summary,button')].filter(element => element.getClientRects().length).map(element => ({ name: element.textContent.trim(), role: element.tagName, rect: box(element), disabled: element.disabled })) };
}); }
function assessLayout(metrics, config) {
  const name = config.name; check(metrics.theme === config.theme, name + ' records actual renderer theme');
  check(!metrics.overflow && metrics.section.x >= -1 && metrics.section.right <= metrics.viewport + 1, name + ' inspector fits its host and viewport', { section: metrics.section, viewport: metrics.viewport });
  for (const [index, item] of metrics.text.entries()) {
    check(item.font >= 13, name + ' text ' + index + ' is at least 13 CSS px', { text: item.text, font: item.font });
    check(!item.splitWords.length, name + ' text ' + index + ' wraps whole words', item.splitWords);
    check(item.textRect.x >= item.panel.x - 1 && item.textRect.right <= item.panel.right + 1 && item.textRect.y >= item.panel.y - 1 && item.textRect.bottom <= item.panel.bottom + 1, name + ' text ' + index + ' fits its panel', item);
    check(item.contrast >= (config.theme === 'contrast' ? 7 : 4.5), name + ' text ' + index + ' contrast', { text: item.text, contrast: item.contrast });
  }
  for (const control of metrics.controls) check(control.rect.width / (config.zoom || 1) >= 44 && control.rect.height / (config.zoom || 1) >= 44, name + ' touch target ' + control.name, control.rect);
}
async function audit(page, name) {
  const result = await page.evaluate(async () => { const result = await axe.run(document.querySelector('.wc-steward-connections'), { rules: { region: { enabled: false } } }); return { violations: result.violations.map(issue => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: result.incomplete.map(issue => ({ id: issue.id, targets: issue.nodes.map(node => node.target) })) }; });
  report.audits.push({ name, ...result }); check(!result.violations.length, name + ' scoped inspector axe audit', result.violations);
}
async function capture(page, config, selector = '.wc-steward-connections', base = false) {
  const locator = page.locator(selector); await locator.screenshot({ path: path.join(OUT, config.name + '.png'), animations: 'disabled', timeout: 60000 });
  const bytes = fs.readFileSync(path.join(OUT, config.name + '.png'));
  report.captures.push({ file: config.name + '.png', selector, baseline: base, sourceSha256: base ? BASE_SHA : sourceSha, sha256: hash(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length });
  console.log('CAPTURE ' + config.name);
  fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({ captures: report.captures.map(item => item.file), checks: report.checks.length, failed: report.checks.filter(item => !item.passed).length }));
}
const configs = [{ name: 'desktop-light', width: 1280, theme: 'light' }, { name: 'desktop-dark', width: 1280, theme: 'dark' }, { name: 'phone320-light', width: 320, theme: 'light' }, { name: 'phone390-dark', width: 390, theme: 'dark' }, { name: 'host400-dark', width: 1280, hostWidth: 400, theme: 'dark' }, { name: 'phone320-contrast', width: 320, theme: 'contrast' }, { name: 'phone320-forced', width: 320, theme: 'light', forced: true }, { name: 'phone390-zoom150', width: 390, theme: 'light', zoom: 1.5 }];
(async () => {
  let browser, initial;
  try {
    requireCheck(report.publicSourceSha256 === sourceSha, 'Installed source and public mirror match');
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); report.origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ executablePath: process.env.WC_BROWSER_EXECUTABLE || 'C:/Users/cabba/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: true });
    for (const base of [true, false]) {
      const page = await browser.newPage(); page.setDefaultTimeout(45000); page.on('pageerror', error => report.errors.push((base ? 'baseline' : 'candidate') + ': ' + String(error)));
      try { await openPage(page, { ...configs[0], name: base ? 'baseline-native' : 'candidate-native' }, base); initial = await nativeSequence(page, base); if (!base) await boundaries(page, initial); }
      finally { await page.close(); }
    }
    for (const config of configs) {
      const page = await browser.newPage(); page.setDefaultTimeout(45000); page.on('pageerror', error => report.errors.push(config.name + ': ' + String(error)));
      try {
        await openPage(page, config, false); await mount(page, initial, config.theme); await openInspector(page); await selectConnection(page, 'runRestoration');
        const detail = await inspectorSemantics(page); assessInspector(initial, detail, config.name); const metrics = await measurements(page); assessLayout(metrics, config); await audit(page, config.name);
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
    check(report.captures.length === configs.length + 1, 'One action detail and eight theme/layout captures complete');
    report.finishedAt = new Date().toISOString(); report.passed = report.checks.filter(item => item.passed).length; report.failed = report.checks.length - report.passed; report.successful = report.completed && !report.failed && !report.errors.length;
    fs.writeFileSync(path.join(OUT, 'tested-harness.cjs'), harness); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out: OUT, passed: report.passed, failed: report.failed, nativeActions: report.nativeActions.length, captures: report.captures.length, audits: report.audits.length, errors: report.errors, successful: report.successful }));
    if (!report.successful) process.exitCode = 1;
  }
})();
