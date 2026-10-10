'use strict';

// Actual Explore renderer, persisted mission evidence, and native view controls.
// GPU pixels are outside this CSS-panel check; model, input, and frame loop run.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const ROOT = path.resolve(process.env.WC_REPO || path.join(__dirname, '..'));
const { chromium } = createRequire(path.join(ROOT, 'package.json'))('playwright');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const MAIN = path.join(ROOT, 'stem_lab/stem_tool_watercycle.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const BASE = path.join(ROOT, 'reports/watercycle-ray-readability/candidate-runtime.js');
const BASE_SHA = 'bef9797b926aafb7430bcce82d7f24252c1d9e09361efc6a9cc6aea6ed29ec88';
const source = fs.readFileSync(MAIN), baseline = fs.readFileSync(BASE), harness = fs.readFileSync(__filename), sourceSha = hash(source);
const arg = n => process.argv.find(a => a.startsWith('--' + n + '='))?.slice(n.length + 3);
const baselineOnly = process.argv.includes('--baseline-only');
if (arg('expected-sha') !== sourceSha) throw Error('Supply --expected-sha=' + sourceSha);
if (hash(baseline) !== BASE_SHA) throw Error('Frozen baseline changed');
const OUT = path.resolve(arg('out') || path.join(__dirname, 'runs', 'hydro-' + sourceSha.slice(0, 12) + '-' + new Date().toISOString().replace(/[:.]/g, '-')));
fs.mkdirSync(OUT, { recursive: true });
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const report = {
  qaRasterThrottle: { drawsOmittedForPanelChecks: true, exactDomCloneOnlyDuringCapture: true, scope: 'Actual THREE renderer retained; WebGL draws omitted; model, input and frame loop active during native interactions; screenshots exclude WebGL' },
  pid: process.pid, startedAt: new Date().toISOString(), baselineOnly, sourceSha256: sourceSha,
  publicSourceSha256: hash(fs.readFileSync(PUBLIC)), baselineSha256: BASE_SHA, harnessSha256: hash(harness),
  checks: [], cases: [], fixtures: [], frozenSemantics: {}, nativeActions: [], captures: [], loadedSources: [], audits: [], errors: [],
  completed: false, successful: false, browserLaunched: false, browserClosed: false, serverListening: false, serverClosed: false,
};
function check(passed, label, detail) { report.checks.push({ passed: !!passed, label, ...(detail === undefined ? {} : { detail }) }); if (!passed) console.log('FAIL ' + label); }
const missions = [
  { id: 'cloud', name: 'Cloud Chaser', detail: 'Reach condensation in 3D' },
  { id: 'river', name: 'River Runner', detail: 'Travel by surface runoff in 3D' },
  { id: 'deep', name: 'Deep Current', detail: 'Enter soil or an aquifer in 3D' },
  { id: 'green', name: 'Green Return', detail: 'Travel through a plant in 3D' },
  { id: 'routes', name: 'Route Master', detail: 'Explore all three land paths in 3D' },
  { id: 'cycle', name: 'Cycle Keeper', detail: 'Complete a full 3D cycle' },
];
function seedFor(completed) {
  const paths = completed === 0 ? { runoff: 0, infiltrate: 0, plant: 0 } : { runoff: 1, infiltrate: 1, plant: completed === 6 ? 1 : 0 };
  return {
    wcMode: 'explorer', wcSection: 'journey', wcJourneyChapter: 'land', wcJourneyLandStep: 'infiltrating',
    activeStage: 'infiltration', journeyView: '3d', journeyActive: true, journeyState: 'aquifer_flow',
    journeyLastPath: 'infiltrate', journeyPaused: true, wc2dPaused: true, journeySpeed: 1, journeyLoops: 2,
    journeyReplayProgress: null, journeyPaths: { runoff: 1, infiltrate: 1, plant: 0 },
    journey3dPaths: paths, journey3dStatesVisited: completed === 0 ? {} : { condensing: true, ...(completed === 6 ? { complete: true } : {}) },
    xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
    completedChallenges: ['complete_journey', 'explore_all_stages', 'adjust_climate', 'quiz_pass', 'vocabulary_studied', 'stewardship_win', 'myth_buster', 'double_rainbow'],
    climSolar: 1.2, climTemp: 18, climWind: 1.4, landRainIntensity: 60, landSaturation: 50,
    landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass', stagesViewed: { infiltration: true },
    wcExperimentLog: [{ key: 'saved-record', label: 'Retain my observation', notes: { explanation: 'Keep the learner evidence.' } }],
    wcCheckReflections: { kept: { observation: 'Keep the learner reflection.' } },
    pilotNotebook: { reflection: 'Retain my prior raindrop ray evidence.', autoSave: false },
    wcProcessCompare: { first: 'condensation', second: 'precipitation', question: 'phase', answer: '', checked: false, notes: { 'condensation|precipitation': 'Cloud formation and falling are different.' } },
  };
}
function html(isBase) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hydro Quest readability QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui}main{box-sizing:border-box;padding:12px;max-width:1250px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/vendor/three-r128/three.min.js"></script><script src="/vendor/three-r128/OrbitControls.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="${isBase ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js'}"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
const NativeRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(...args){const r=new NativeRenderer(...args),draw=r.render.bind(r);r.render=(...a)=>{if(!window.hydroRasterThrottle)return draw(...a);};return r;};THREE.WebGLRenderer.prototype=NativeRenderer.prototype;Object.setPrototypeOf(THREE.WebGLRenderer,NativeRenderer);window.hydroRasterThrottle=true;
window.hydroAwards=[];window.mountHydro=function(seed,theme){ReactDOM.unmountComponentAtNode(document.getElementById('slot'));window.hydroAwards=[];
function Host(){const[data,setData]=React.useState({waterCycle:seed,_threeLoaded:true});window.hydroData=data.waterCycle;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:(...a)=>hydroAwards.push(a),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));};
</script></body></html>`;
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/' || u.pathname === '/baseline') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html(u.pathname === '/baseline')); }
  if (u.pathname === '/baseline-runtime.js' || u.pathname === '/stem_lab/stem_tool_watercycle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(u.pathname === '/baseline-runtime.js' ? baseline : source); }
  const f = path.resolve(ROOT, '.' + decodeURIComponent(u.pathname));
  const allowed = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!f.startsWith(ROOT + path.sep) || !allowed.some(p => u.pathname.startsWith(p))) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { res.writeHead(e ? 404 : 200, { 'Content-Type': f.endsWith('.css') ? 'text/css' : 'text/javascript' }); res.end(e ? 'Not found' : b); });
});
const paint = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function open(page, config, isBase) {
  await page.setViewportSize({ width: config.width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: config.forced ? 'active' : 'none' });
  await page.goto(report.origin + (isBase ? '/baseline' : '/'), { waitUntil: 'load' });
  const loaded = await page.evaluate(async base => { const b = await (await fetch(base ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js')).arrayBuffer(); return [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(v => v.toString(16).padStart(2, '0')).join(''); }, isBase);
  report.loadedSources.push({ case: config.name, baseline: isBase, sha256: loaded });
  check(loaded === (isBase ? BASE_SHA : sourceSha), config.name + ' loaded intended frozen runtime');
  await page.addScriptTag({ url: report.origin + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
}
async function mount(page, config, completed) {
  const seed = seedFor(completed);
  await page.evaluate(({ seed, c }) => { document.body.style.zoom = c.zoom || 1; document.getElementById('slot').style.maxWidth = (c.hostWidth || 1250) + 'px'; mountHydro(seed, c.theme); }, { seed, c: config });
  await page.locator('.wc-hydro-quest').waitFor({ state: 'visible' });
  await page.locator('#wcJourney3d').waitFor({ state: 'visible' });
  await paint(page);
  await page.waitForFunction(() => { const value = document.getElementById('wcCanvas')?.dataset.journeyProgress; return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)); });
}
async function semantics(page) {
  return page.locator('.wc-hydro-quest').evaluate(root => {
    const progress = root.querySelector('.wc-hydro-progress');
    return {
      role: root.getAttribute('role'), labelledby: root.getAttribute('aria-labelledby'), describedby: root.getAttribute('aria-describedby'),
      kicker: root.querySelector('.wc-hydro-kicker').textContent, rank: root.querySelector('.wc-hydro-rank,h4').textContent,
      score: root.querySelector('.wc-hydro-score').textContent, scoreLabel: root.querySelector('.wc-hydro-score').getAttribute('aria-label'),
      status: root.querySelector('#wcHydroQuestStatus').textContent, live: root.querySelector('#wcHydroQuestStatus').getAttribute('aria-live'),
      progress: { role: progress.getAttribute('role'), name: progress.getAttribute('aria-label'), min: progress.getAttribute('aria-valuemin'), max: progress.getAttribute('aria-valuemax'), now: progress.getAttribute('aria-valuenow'), text: progress.getAttribute('aria-valuetext'), fill: progress.firstElementChild.style.width },
      list: { role: root.querySelector('.wc-hydro-missions').getAttribute('role'), name: root.querySelector('.wc-hydro-missions').getAttribute('aria-label') },
      missions: [...root.querySelectorAll('.wc-hydro-mission')].map(c => ({ id: c.dataset.mission, role: c.getAttribute('role'), aria: c.getAttribute('aria-label'), name: c.querySelector('strong').textContent, detail: c.querySelector('small').textContent, complete: c.classList.contains('is-complete'), mark: c.querySelector('.wc-hydro-mark').textContent, markHidden: c.querySelector('.wc-hydro-mark').getAttribute('aria-hidden'), state: c.querySelector('.wc-hydro-state').textContent })),
    };
  });
}
function assertSemantics(s, completed, label) {
  const points = completed * 20, completeIds = completed === 6 ? missions.map(m => m.id) : completed === 3 ? ['cloud', 'river', 'deep'] : [];
  check(s.labelledby === 'wcHydroQuestTitle' && s.describedby === 'wcHydroQuestStatus', label + ' preserves named section and status description');
  check(s.rank === (completed === 6 ? 'Cycle Guardian' : completed === 3 ? 'Watershed Scout' : 'Observer'), label + ' native evidence yields correct rank');
  check(s.score === points + ' HP' && s.scoreLabel === points + ' of 120 Hydro Points', label + ' native evidence yields visible and spoken points');
  check(s.progress.role === 'progressbar' && s.progress.min === '0' && s.progress.max === '120' && s.progress.now === String(points) && s.progress.fill === String(points / 1.2) + '%', label + ' native progress values and fill agree');
  check(s.progress.text === completed + ' of 6 missions complete; ' + points + ' of 120 Hydro Points.' && s.status === completed + ' of 6 Hydro Quest missions complete. ' + points + ' of 120 Hydro Points.' && s.live === 'polite', label + ' completion and points retain spoken status');
  check(s.list.role === 'list' && !!s.list.name && s.missions.length === 6, label + ' six named native list items');
  for (const [i, m] of s.missions.entries()) {
    const expected = missions[i], done = completeIds.includes(expected.id);
    check(m.id === expected.id && m.name === expected.name && m.detail === expected.detail, label + ' mission ' + i + ' retains learning requirement');
    check(m.role === 'listitem' && m.complete === done && m.state === (done ? 'Complete' : 'Open') && m.mark === (done ? '\u2713' : '\u25cb') && m.markHidden === 'true', label + ' mission ' + i + ' non-color completion state');
    check(m.aria === expected.name + (done ? ' complete. ' : ' open. ') + expected.detail, label + ' mission ' + i + ' retains full accessible evidence');
  }
}
async function snapshot(page) {
  await paint(page);
  return page.evaluate(() => {
    const c = document.getElementById('wcCanvas'), j = document.getElementById('wcJourney3d');
    return { data: JSON.parse(JSON.stringify(hydroData)), awards: JSON.parse(JSON.stringify(hydroAwards)), parcel: { state: c?.dataset.journeyState, paused: c?.dataset.journeyPaused, progress: c?.dataset.journeyProgress }, rewardPoints: j?.dataset.hydroPoints };
  });
}
async function metrics(page) {
  return page.locator('.wc-hydro-quest').evaluate(root => {
    const box = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const visible = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return e.getClientRects().length && s.visibility !== 'hidden' && r.width > 1 && r.height > 1; };
    const rgba = c => { const n = (c.match(/[\d.]+/g) || []).map(Number); return [n[0] || 0, n[1] || 0, n[2] || 0, n.length > 3 ? n[3] : 1]; };
    const over = (a, b) => [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
    const lum = c => { const a = c.slice(0, 3).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const background = e => { let color = [255, 255, 255, 1]; const layers = []; for (let p = e; p; p = p.parentElement) layers.unshift(rgba(getComputedStyle(p).backgroundColor)); for (const layer of layers) color = over(layer, color); return color; };
    const text = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while (n = w.nextNode()) {
      const e = n.parentElement; if (!n.textContent.trim() || !visible(e)) continue;
      const s = getComputedStyle(e), range = document.createRange(); range.selectNodeContents(n); const r = range.getBoundingClientRect();
      const words = [...n.textContent.matchAll(/[\p{L}\p{N}]+/gu)].map(m => { const q = document.createRange(); q.setStart(n, m.index); q.setEnd(n, m.index + m[0].length); return q.getClientRects().length; });
      const bg = background(e), fg = rgba(s.color); fg[3] *= parseFloat(s.opacity);
      text.push({ text: n.textContent.trim(), tag: e.tagName, className: e.className, font: parseFloat(s.fontSize), minimum: e.closest('.wc-hydro-rank,h4,.wc-hydro-mission strong') ? 15 : 13, color: s.color, background: bg, contrast: ratio(over(fg, bg), bg), rect: box(e), cardRect: box(e.closest('.wc-hydro-mission') || e), textRect: { x: r.x, y: r.y, right: r.right, bottom: r.bottom }, words });
    }
    const style = getComputedStyle(root), bounds = box(root), cards = [...root.querySelectorAll('.wc-hydro-mission')].map(c => { const s = getComputedStyle(c), state = c.querySelector('.wc-hydro-state'); return { id: c.dataset.mission, rect: box(c), complete: c.classList.contains('is-complete'), background: s.backgroundColor, borderWidth: parseFloat(s.borderTopWidth), borderStyle: s.borderTopStyle, stateRect: box(state), nameRect: box(c.querySelector('strong')), detailRect: box(c.querySelector('small')), state: state.textContent }; });
    const outliers = [...root.querySelectorAll('*')].filter(visible).map(e => ({ tag: e.tagName, className: e.className, rect: box(e) })).filter(e => e.rect.x < bounds.x - 1 || e.rect.right > bounds.right + 1);
    const progress = root.querySelector('.wc-hydro-progress');
    const status = root.querySelector('#wcHydroQuestStatus'), statusStyle = getComputedStyle(status);
    return { rect: bounds, contentWidth: root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), containerName: style.containerName, containerType: style.containerType, theme: root.dataset.wcHydroTheme, background: style.backgroundColor, backgroundImage: style.backgroundImage, columns: new Set(cards.map(c => Math.round(c.rect.x))).size, cards, text, outliers, status: { visible: visible(status), rect: box(status), position: statusStyle.position, clip: statusStyle.clip, font: parseFloat(statusStyle.fontSize), text: status.textContent }, progress: { rect: box(progress), fillRect: box(progress.firstElementChild), background: getComputedStyle(progress).backgroundColor, fill: getComputedStyle(progress.firstElementChild).backgroundColor }, overflow: root.scrollWidth > root.clientWidth + 1, animations: root.getAnimations({ subtree: true }).length, viewportWidth: innerWidth, documentOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}
async function interactions(page, config, completed) {
  await page.waitForFunction(() => { const value = document.getElementById('wcCanvas')?.dataset.journeyProgress; return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)); });
  const label = config.name, before = await snapshot(page), beforeSemantics = await semantics(page), canvas = await page.locator('#wcCanvas').elementHandle();
  check(typeof before.parcel.progress === 'string' && Number.isFinite(Number(before.parcel.progress)), label + ' preserved parcel snapshot uses actual initialized engine progress', before.parcel);
  const omitView = d => Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'journeyView'));
  for (const [view, text] of [['2d', 'System Map'], ['3d', 'Droplet Journey']]) {
    const button = page.locator('.wc-view-segments').getByRole('button', { name: text, exact: true });
    await button.focus(); await button.press('Enter'); await paint(page);
    if (view === '2d') await page.locator('.wc-hydro-quest').waitFor({ state: 'detached' }); else await page.locator('.wc-hydro-quest').waitFor({ state: 'visible' });
    const after = await snapshot(page), identity = await page.locator('#wcCanvas').evaluate((e, old) => e === old, canvas);
    const item = { case: label, action: 'keyboard-view-' + view, view, changedFields: Object.keys({ ...before.data, ...after.data }).filter(k => !same(before.data[k], after.data[k])), canvasIdentity: identity, retained: same(omitView(before.data), omitView(after.data)), awardsRetained: same(before.awards, after.awards), parcelRetained: same(before.parcel, after.parcel), beforeSha256: hash(JSON.stringify(stable(before))), afterSha256: hash(JSON.stringify(stable(after))), panelCount: await page.locator('.wc-hydro-quest').count(), pressed: await button.getAttribute('aria-pressed'), focused: await button.evaluate(e => document.activeElement === e) };
    report.nativeActions.push(item);
    check(after.data.journeyView === view && item.panelCount === (view === '3d' ? 1 : 0) && item.pressed === 'true', label + ' native ' + view + ' view controls mission visibility');
    check(item.retained && item.awardsRetained && item.parcelRetained && after.data.journeyPaused === true, label + ' native ' + view + ' view retains mission evidence, all other learner data and paused parcel', item);
    check(identity && item.focused, label + ' native ' + view + ' view keeps underlying canvas and keyboard focus');
  }
  const afterSemantics = await semantics(page);
  check(same(beforeSemantics, afterSemantics), label + ' returning to 3D retains exact mission, rank and progress semantics');
  assertSemantics(afterSemantics, completed, label + ' after native views');
}
async function audit(page, label) {
  const result = await page.evaluate(async () => { const r = await axe.run(document.querySelector('.wc-hydro-quest'), { rules: { region: { enabled: false } } }); return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: r.incomplete.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })) }; });
  report.audits.push({ case: label, ...result }); check(!result.violations.length, label + ' scoped accessibility audit', result.violations);
}
async function capture(page, config, isBase) {
  const name = config.name;
  const clone = await page.evaluate(() => {
    const panel = document.querySelector('.wc-hydro-quest'), slot = document.getElementById('slot'); if (!panel || !slot) throw Error('Actual mission panel missing');
    const before = panel.getBoundingClientRect(), markup = panel.outerHTML; let branch = panel.cloneNode(true), parent = panel.parentElement;
    while (parent && parent !== slot) { const wrap = parent.cloneNode(false); wrap.append(branch); branch = wrap; parent = parent.parentElement; }
    if (parent !== slot) throw Error('Mission panel escaped real render slot'); ReactDOM.unmountComponentAtNode(slot); slot.replaceChildren(branch);
    const copy = slot.querySelector('.wc-hydro-quest'), after = copy.getBoundingClientRect(); return { markupEqual: copy.outerHTML === markup, before: { width: before.width, height: before.height }, after: { width: after.width, height: after.height } };
  });
  check(clone.markupEqual, name + ' capture keeps exact rendered mission DOM', clone);
  check(Math.abs(clone.before.width - clone.after.width) <= 1 && Math.abs(clone.before.height - clone.after.height) <= 1, name + ' capture keeps same-viewport panel dimensions', clone);
  await paint(page); let r = await page.locator('.wc-hydro-quest').boundingBox(); if (!r || r.height > 2360) throw Error('Capture region missing or exceeds bound');
  if (r.height > page.viewportSize().height - 24) await page.setViewportSize({ width: page.viewportSize().width, height: Math.ceil(r.height) + 24 });
  await page.locator('.wc-hydro-quest').evaluate(e => window.scrollTo({ top: e.getBoundingClientRect().top + scrollY - 12, behavior: 'instant' })); await paint(page); r = await page.locator('.wc-hydro-quest').boundingBox();
  if (!r || r.x < 0 || r.y < 0 || r.x + r.width > page.viewportSize().width + 1 || r.y + r.height > page.viewportSize().height + 1) throw Error('Capture does not fit bounded viewport');
  const file = name + '.png', f = path.join(OUT, file); await page.screenshot({ path: f, animations: 'disabled', clip: { x: r.x, y: r.y, width: r.width, height: r.height }, timeout: 60000 });
  const bytes = fs.readFileSync(f); report.captures.push({ name, file, baseline: isBase, completed: config.completed, sourceSha256: isBase ? BASE_SHA : sourceSha, bytes: bytes.length, sha256: hash(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), clone });
  fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({ pid: process.pid, sourceSha256: sourceSha, cases: report.cases.map(c => c.name), captures: report.captures.map(c => c.name), checks: report.checks.length, failed: report.checks.filter(c => !c.passed).length, nativeActions: report.nativeActions.length }) + '\n'); console.log('CAPTURE ' + name);
}
const baselines = [{ name: 'baseline-desktop-light', width: 1280, theme: 'light', completed: 3 }, { name: 'baseline-host400', width: 1280, hostWidth: 400, theme: 'light', completed: 3 }];
const finals = [{ name: 'desktop-light', width: 1280, theme: 'light', completed: 3 }, { name: 'desktop-dark', width: 1280, theme: 'dark', completed: 6 }, { name: 'phone320-light', width: 320, theme: 'light', completed: 0 }, { name: 'phone320-dark', width: 320, theme: 'dark', completed: 3 }, { name: 'phone320-contrast', width: 320, theme: 'contrast', completed: 3 }, { name: 'phone320-forced', width: 320, theme: 'light', forced: true, completed: 6 }, { name: 'phone390-zoom150', width: 390, theme: 'light', zoom: 1.5, completed: 3 }, { name: 'host400', width: 1280, hostWidth: 400, theme: 'light', completed: 3 }];
(async () => {
  let browser;
  try {
    check(report.publicSourceSha256 === sourceSha, 'installed source/public parity');
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); report.serverListening = true; report.origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ executablePath: process.env.WC_BROWSER_EXECUTABLE || 'C:/Users/cabba/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); report.browserLaunched = true;
    for (const [i, config] of baselines.entries()) {
      const page = await browser.newPage(); page.setDefaultTimeout(60000); page.on('pageerror', e => report.errors.push(config.name + ': ' + String(e)));
      try {
        await open(page, config, true);
        if (i === 0) for (const completed of [0, 3, 6]) { await mount(page, config, completed); const s = await semantics(page); assertSemantics(s, completed, 'frozen ' + completed + '-mission fixture'); report.frozenSemantics[completed] = s; report.fixtures.push({ case: config.name, baseline: true, completed, seedSha256: hash(JSON.stringify(stable(seedFor(completed)))), semanticsSha256: hash(JSON.stringify(stable(s))) }); }
        await mount(page, config, config.completed); const s = await semantics(page), m = await metrics(page); check(same(s, report.frozenSemantics[config.completed]), config.name + ' baseline semantics stable'); report.cases.push({ name: config.name, baseline: true, config, semantics: s, semanticsSha256: hash(JSON.stringify(stable(s))), metrics: m }); await capture(page, config, true);
      } finally { await page.close(); }
    }
    if (!baselineOnly) for (const config of finals) {
      const page = await browser.newPage(); page.setDefaultTimeout(60000); page.on('pageerror', e => report.errors.push(config.name + ': ' + String(e)));
      try {
        await open(page, config, false); await mount(page, config, config.completed); const initial = await semantics(page); assertSemantics(initial, config.completed, config.name); check(same(initial, report.frozenSemantics[config.completed]), config.name + ' exact native mission semantics match frozen evidence state');
        report.fixtures.push({ case: config.name, baseline: false, completed: config.completed, seedSha256: hash(JSON.stringify(stable(seedFor(config.completed)))), semanticsSha256: hash(JSON.stringify(stable(initial))) });
        await interactions(page, config, config.completed); const s = await semantics(page), m = await metrics(page);
        check(m.containerName.includes('wc-hydro-quest') && m.containerType === 'inline-size', config.name + ' named available-width mission container');
        check(m.columns === (m.contentWidth >= 900 ? 3 : m.contentWidth >= 560 ? 2 : 1), config.name + ' columns follow actual mission panel width', { width: m.contentWidth, columns: m.columns });
        check(m.theme === (config.theme === 'light' ? 'light' : 'dark'), config.name + ' explicit actual renderer theme hook', { theme: m.theme, requested: config.theme });
        check(m.cards.length === 6 && m.cards.filter(c => c.complete).length === config.completed, config.name + ' six cards retain selected native evidence completion');
        check(m.backgroundImage === 'none', config.name + ' mission panel uses stable theme paper');
        check(m.progress.rect.height / (config.zoom || 1) >= 10, config.name + ' readable progress track');
        check(m.status.visible && m.status.font >= 13 && m.status.position !== 'absolute' && m.status.text === s.status, config.name + ' visible completion count explains mission progress and points', m.status);
        check(!m.overflow && !m.outliers.length, config.name + ' panel and all meaningful children contained', m.outliers);
        check(m.rect.x >= -1 && m.rect.right <= m.viewportWidth + 1, config.name + ' mission panel contained inside viewport');
        check(m.animations === 0, config.name + ' reduced-motion mission panel static');
        for (const [i, t] of m.text.entries()) { check(t.font >= t.minimum, config.name + ' text ' + i + ' readable font', { text: t.text, font: t.font, minimum: t.minimum }); check(t.words.every(n => n <= 1), config.name + ' text ' + i + ' whole words'); check(t.textRect.x >= m.rect.x - 1 && t.textRect.right <= m.rect.right + 1, config.name + ' text ' + i + ' horizontal containment', { text: t.text, rect: t.textRect }); check([t.rect, t.cardRect].every(r => t.textRect.x >= r.x - 1 && t.textRect.right <= r.right + 1 && t.textRect.y >= r.y - 1 && t.textRect.bottom <= r.bottom + 1), config.name + ' text ' + i + ' fits its own label and mission card', { text: t.text, textRect: t.textRect, labelRect: t.rect, cardRect: t.cardRect }); check(t.contrast >= 4.5, config.name + ' text ' + i + ' contrast ≥4.5', { text: t.text, contrast: t.contrast, foreground: t.color, background: t.background }); }
        for (const [i, c] of m.cards.entries()) { check(c.stateRect.y >= c.nameRect.y - 1 && c.stateRect.right <= c.rect.right + 1, config.name + ' mission ' + i + ' state fits card'); if (config.forced && c.complete) check(c.borderStyle === 'double' && c.borderWidth * (config.zoom || 1) >= 3, config.name + ' mission ' + i + ' completed state retains forced-color double border', c); }
        report.cases.push({ name: config.name, baseline: false, config, semantics: s, semanticsSha256: hash(JSON.stringify(stable(s))), metrics: m }); await audit(page, config.name); await capture(page, config, false);
      } finally { await page.close(); }
    }
    report.completed = true;
  } catch (e) { report.errors.push(String(e.stack || e)); console.error(e); }
  finally {
    if (browser) { try { await browser.close(); report.browserClosed = true; } catch (e) { report.errors.push('Browser cleanup: ' + String(e)); } }
    try { await new Promise((resolve, reject) => server.close(e => e && e.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(e) : resolve())); report.serverClosed = true; } catch (e) { report.errors.push('Server cleanup: ' + String(e)); }
    report.finalSourceSha256 = hash(fs.readFileSync(MAIN)); report.finalPublicSourceSha256 = hash(fs.readFileSync(PUBLIC)); report.finalHarnessSha256 = hash(fs.readFileSync(__filename));
    check(report.finalSourceSha256 === sourceSha && report.finalPublicSourceSha256 === sourceSha, 'installed source/public bytes unchanged after browser run'); check(report.finalHarnessSha256 === report.harnessSha256, 'harness bytes unchanged'); check(hash(fs.readFileSync(BASE)) === BASE_SHA, 'preceding frozen baseline unchanged');
    check(report.captures.filter(c => c.baseline).length === 2, 'both matched baseline captures completed'); if (!baselineOnly) { check(report.captures.filter(c => !c.baseline).length === 8, 'all eight final mission captures completed'); check(report.nativeActions.length === 16, 'all sixteen actual keyboard view actions completed'); check(report.audits.length === 8, 'all eight scoped accessibility audits completed'); }
    check(!report.errors.length, 'no runtime errors', report.errors); check(report.browserLaunched && report.browserClosed && report.serverClosed, 'owned browser and server closed');
    report.finishedAt = new Date().toISOString(); report.passed = report.checks.filter(c => c.passed).length; report.failed = report.checks.filter(c => !c.passed).length; report.successful = report.completed && !report.failed && !report.errors.length && report.browserClosed && report.serverClosed;
    fs.writeFileSync(path.join(OUT, 'tested-harness.cjs'), harness); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ out: OUT, passed: report.passed, failed: report.failed, errors: report.errors.length, captures: report.captures.length, nativeActions: report.nativeActions.length, successful: report.successful })); if (!report.successful) process.exitCode = 1;
  }
})();
