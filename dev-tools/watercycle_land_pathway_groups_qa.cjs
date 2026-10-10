'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'stem_lab/stem_tool_watercycle.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const BASELINE = path.join(ROOT, 'reports/watercycle-heat-actor-clarity/candidate-runtime.js');
const BASELINE_SHA = '12132650ea1f18152ac4bf1e07dfd1c4c9d1c9bc84501276904ada975ad3e244';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(MAIN);
const sourceHash = hash(source);
const expected = process.argv.find(arg => arg.startsWith('--expected-sha='))?.slice(15);
if (expected !== sourceHash) throw Error('Supply installed source with --expected-sha=' + sourceHash);
const harnessBytes = fs.readFileSync(__filename);
const baseline = fs.readFileSync(BASELINE);
if (hash(baseline) !== BASELINE_SHA) throw Error('Frozen chapter baseline changed');
const baselineText = baseline.toString('utf8');
function slice(text, start, end) {
  const first = text.indexOf(start), last = text.indexOf(end, first + start.length);
  if (first < 0 || last <= first) throw Error('Missing authored chapter anchor: ' + start);
  return text.slice(first, last);
}
const diagramHelpers = [
  slice(baselineText, '          function wcProcessDiagram(id, after) {', '          var wcJourneyChapter ='),
  slice(baselineText, '          function wcJourneyChapterDiagram(state, after) {', '          function renderWcJourneyChapters() {'),
];
const OUT = path.join(ROOT, 'reports/watercycle-land-pathway-groups', sourceHash.slice(0, 12) + '-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(OUT, { recursive: true });
const report = {
  pid: process.pid, startedAt: new Date().toISOString(), sourceSha256: sourceHash,
  publicSourceSha256: hash(fs.readFileSync(PUBLIC)), baselineSha256: BASELINE_SHA, harnessSha256: hash(harnessBytes),
  checks: [], cases: [], nativeActions: [], captures: [], loadedSources: [], audits: [], errors: [],
  completed: false, successful: false, browserLaunched: false, browserClosed: false, serverListening: false, serverClosed: false,
};
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function check(passed, label, detail) {
  report.checks.push({ passed: !!passed, label, ...(detail === undefined ? {} : { detail }) });
  if (!passed) console.log('FAIL ' + label);
}
function save() {
  const json = JSON.stringify(report, null, 2);
  if (Buffer.byteLength(json) > 1000000) throw Error('Compact report exceeded 1 MB');
  fs.writeFileSync(path.join(OUT, 'results.json'), json + '\n');
}
const STEPS = [
  ['ground_choice', 'Path choice'], ['river_runoff', 'River runoff'], ['infiltrating', 'Soil infiltration'],
  ['aquifer_flow', 'Aquifer flow'], ['plant_absorb', 'Plant uptake'], ['transpiring', 'Transpiration'],
];
const GROUPS = [
  { id: 'surface', title: 'Surface water', cue: 'Water moving across the land surface.', steps: ['river_runoff'] },
  { id: 'soil', title: 'Soil and groundwater', cue: 'Entering soil does not guarantee groundwater recharge.', steps: ['infiltrating', 'aquifer_flow'] },
  { id: 'plants', title: 'Plants', cue: 'Compare liquid uptake with vapor leaving leaves.', steps: ['plant_absorb', 'transpiring'] },
];
const seed = {
  wcMode: 'explorer', wcSection: 'journey', wcJourneyChapter: 'land', wcJourneyLandStep: 'infiltrating',
  activeStage: 'infiltration', journeyView: '2d', journeyActive: true,
  journeyState: 'aquifer_flow', journeyLastPath: 'infiltrate', journeyPaused: true, wc2dPaused: true,
  journeySpeed: 1, journeyLoops: 2, journeyReplayProgress: null,
  journeyPaths: { runoff: 1, infiltrate: 1, plant: 0 }, stagesViewed: { infiltration: true },
  xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
  completedChallenges: ['complete_journey', 'explore_all_stages', 'adjust_climate', 'quiz_pass', 'vocabulary_studied', 'stewardship_win', 'myth_buster', 'double_rainbow'],
  climSolar: 1.2, climTemp: 18, climWind: 1.4,
  landRainIntensity: 60, landSaturation: 50, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
  wcQuiz: { q: 'Where can groundwater move in an aquifer?', a: 'Connected pores and fractures', opts: ['Connected pores and fractures', 'Only an empty underground lake'], answered: true, chosen: 'Only an empty underground lake', score: 2, concept: 'aquifer' },
  wcScenarioBaseline: { climSolar: 1, climTemp: 15, climWind: 1 }, wcPrediction: 'infiltration',
  wcProcessCompare: { notes: { 'evaporation|condensation': 'Keep my comparison explanation.' } },
  wcExperimentLog: [{ key: 'saved-record', label: 'Retain my observation', notes: { explanation: 'Keep the learner evidence.' } }],
  wcCheckReflections: { kept: { observation: 'Keep the learner Check reflection.' } },
  wcGroundwaterLens: { explorer: { version: 1, identity: 'groundwater-lens-v1', part: 'soil', answer: 'soil_storage' }, check: { version: 1, identity: 'retained-question', part: 'groundwater', answer: 'soil_storage' } },
  precipHunt: { experiment: { prediction: 'Keep my storm prediction.', explanation: 'Keep my storm explanation.' } },
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Land pathway grouping QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui}main{padding:12px;max-width:1250px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.landAwards=[];window.mountLand=function(seed,theme){
 ReactDOM.unmountComponentAtNode(document.getElementById('slot'));window.landAwards=[];
 function Host(){const[data,setData]=React.useState({waterCycle:seed});window.landData=data.waterCycle;const noop=()=>{};
 return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:(...args)=>landAwards.push(args),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};
(function(){${diagramHelpers.join('\n')}
window.landExpectedSvg=function(state,after){const slot=document.createElement('div');ReactDOM.render(wcJourneyChapterDiagram(state,after),slot);const markup=slot.firstElementChild.outerHTML;ReactDOM.unmountComponentAtNode(slot);return markup;};})();
</script></body></html>`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html); }
  if (url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(source); }
  const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
  const allowed = ['/stem_lab/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!file.startsWith(ROOT + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => { res.writeHead(error ? 404 : 200, { 'Content-Type': file.endsWith('.css') ? 'text/css' : 'text/javascript' }); res.end(error ? 'Not found' : bytes); });
});
const paint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function mount(page, config, patch = {}) {
  await page.evaluate(({ seed, config, patch }) => {
    document.body.style.zoom = config.zoom || 1;
    mountLand({ ...seed, wcJourneyLandStep: config.step, journeyReplayProgress: config.replay ? .86 : null, ...patch }, config.theme);
  }, { seed, config, patch });
  await page.locator('.wc-chapter-land').waitFor({ state: 'visible' });
  await paint(page);
  await page.locator('#wcCanvas').evaluate(canvas => { if (canvas._wcSetJourneyProgress) canvas._wcSetJourneyProgress(.42); });
  await paint(page);
}
async function snapshot(page) {
  await paint(page);
  return page.evaluate(() => {
    const canvas = document.querySelector('#wcCanvas');
    return { data: JSON.parse(JSON.stringify(landData)), awards: JSON.parse(JSON.stringify(landAwards)),
      parcel: { state: canvas?.dataset.journeyState, progress: canvas?.dataset.journeyProgress, paused: canvas?.dataset.journeyPaused },
      parcelLabel: document.querySelector('[data-wc-chapter-parcel]')?.textContent,
      markers: [...document.querySelectorAll('.wc-journey-timeline [data-current-parcel]')].map(el => ({ current: el.dataset.currentParcel, replay: el.dataset.replayFocus, label: el.querySelector('.wc-chapter-current')?.textContent || '', id: el.querySelector('button')?.id, currentAria: el.querySelector('button')?.getAttribute('aria-current') })) };
  });
}
async function diagrams(page, state, label) {
  const result = await page.evaluate(state => {
    const svgs = [...document.querySelectorAll('.wc-chapter-flow .wc-chapter-water > svg')];
    return { svgCount: svgs.length, matches: svgs.map((svg, i) => svg.outerHTML === landExpectedSvg(state, i === 1)),
      decorative: svgs.every(svg => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('focusable') === 'false' && !svg.querySelector('text')),
      geometry: svgs.map(svg => ({ attributes: [...svg.attributes].map(a => [a.name, a.value]), children: [...svg.querySelectorAll('*')].map(el => ({ tag: el.tagName, attributes: [...el.attributes].map(a => [a.name, a.value]) })) })) };
  }, state);
  check(result.svgCount === 2 && result.matches.every(Boolean), label + ' renders both original scientific SVGs from the frozen chapter baseline');
  check(result.decorative, label + ' retains decorative scientific SVG semantics');
  return result.geometry;
}
async function inspect(page, state, label, config) {
  const metric = await page.locator('.wc-chapter-land').evaluate(root => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const text = [...root.querySelectorAll('p,h6,button')].map(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const r = range.getBoundingClientRect();
      const wordFragments = element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE
        ? [...element.textContent.matchAll(/\S+/g)].map(word => { const wordRange = document.createRange(); wordRange.setStart(element.firstChild, word.index); wordRange.setEnd(element.firstChild, word.index + word[0].length); return wordRange.getClientRects().length; }) : [];
      return { text: element.textContent, fontSize: parseFloat(getComputedStyle(element).fontSize), rect: rect(element),
        textRect: { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, wordFragments };
    });
    const groups = [...root.querySelectorAll('.wc-chapter-land-pathway')].map(el => ({
      id: el.dataset.landPathway, active: el.dataset.active, role: el.getAttribute('role'),
      labelledBy: el.getAttribute('aria-labelledby'), describedBy: el.getAttribute('aria-describedby'),
      heading: el.querySelector('h6')?.textContent, headingId: el.querySelector('h6')?.id,
      cue: el.querySelector('.wc-land-pathway-cue')?.textContent, cueId: el.querySelector('.wc-land-pathway-cue')?.id,
      activeCue: el.querySelector('.wc-land-pathway-active')?.textContent || '', rect: rect(el),
      steps: [...el.querySelectorAll('button')].map(button => button.id.replace('wcJourneyLandStep-', '')),
      icon: (() => { const icon = el.querySelector('svg'); return icon ? { id: icon.dataset.landPathwayIcon, hidden: icon.getAttribute('aria-hidden'), focusable: icon.getAttribute('focusable'), textCount: icon.querySelectorAll('text').length, pathCount: icon.querySelectorAll('path').length } : null; })(),
    }));
    const options = root.querySelector('.wc-chapter-land-options'), routes = root.querySelector('.wc-chapter-land-routes');
    const overview = root.querySelector('.wc-chapter-land-overview');
    const buttons = [...root.querySelectorAll('button')].map(el => ({ id: el.id, text: el.textContent, pressed: el.getAttribute('aria-pressed'), controls: el.getAttribute('aria-controls'), type: el.type, rect: rect(el) }));
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    return { rect: rect(root), containerWidth: root.clientWidth, containerType: getComputedStyle(root).containerType,
      optionsRole: options?.getAttribute('role'), optionsLabelledBy: options?.getAttribute('aria-labelledby'), stepLabel: root.querySelector('#wcJourneyLandStepLabel')?.textContent,
      overviewBeforeRoutes: !!(overview && routes && (overview.compareDocumentPosition(routes) & Node.DOCUMENT_POSITION_FOLLOWING)),
      overviewInGroup: !!overview?.closest('.wc-chapter-land-pathway'), overviewRect: overview ? rect(overview) : null,
      routeColumns: routes ? getComputedStyle(routes).gridTemplateColumns.trim().split(/\s+/).length : 0,
      groups, buttons, text, uniqueIds: new Set(ids).size === ids.length,
      scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      cardState: root.closest('#wcJourneyChapterCard')?.dataset.chapterState,
      rootClass: root.closest('.wc-explorer-root')?.className,
    };
  });
  check(metric.cardState === state, label + ' inspects the selected land step');
  check(metric.containerType === 'inline-size', label + ' measures its available workspace width');
  check(metric.optionsRole === 'group' && metric.optionsLabelledBy === 'wcJourneyLandStepLabel' && metric.stepLabel === 'Inspect a land step', label + ' retains the existing overall land selector label');
  check(same(metric.buttons.map(button => [button.id, button.text]), STEPS.map(([id, text]) => ['wcJourneyLandStep-' + id, text])), label + ' retains all six native button IDs, labels and order');
  check(metric.buttons.every(button => button.type === 'button' && button.controls === 'wcJourneyChapterCard' && button.pressed === String(button.id === 'wcJourneyLandStep-' + state)), label + ' retains button semantics and the single selected step');
  check(metric.overviewBeforeRoutes && !metric.overviewInGroup && metric.overviewRect.y < metric.groups[0]?.rect.y, label + ' places the path choice overview before the three routes');
  check(metric.groups.length === 3 && metric.groups.every((group, index) => {
    const expected = GROUPS[index];
    return group.id === expected.id && group.role === 'group' && group.heading === expected.title && group.cue === expected.cue
      && group.headingId === 'wcJourneyLandPathway-' + expected.id + '-Title' && group.labelledBy === group.headingId
      && group.cueId === 'wcJourneyLandPathway-' + expected.id + '-Cue' && group.describedBy === group.cueId && same(group.steps, expected.steps);
  }), label + ' names and describes surface, soil and groundwater, and plant groups');
  check(metric.groups.every(group => group.icon?.id === group.id && group.icon.hidden === 'true' && group.icon.focusable === 'false' && group.icon.textCount === 0 && group.icon.pathCount === 1), label + ' keeps three route icons decorative');
  const active = GROUPS.find(group => group.steps.includes(state))?.id;
  check(metric.groups.every(group => group.active === String(group.id === active) && group.activeCue === (group.id === active ? 'Inspecting this pathway' : '')), label + ' gives the selected route an explicit text cue');
  check(metric.uniqueIds, label + ' retains unique page IDs');
  check(!metric.pageOverflow && metric.scrollWidth <= metric.clientWidth + 1, label + ' has no horizontal overflow');
  check(metric.buttons.every(button => button.rect.width >= 44 && button.rect.height >= 44), label + ' retains 44px native targets');
  check(metric.text.every(item => item.fontSize >= 13), label + ' keeps pathway text at least 13px');
  check(metric.text.every(item => item.wordFragments.every(count => count === 1)), label + ' wraps pathway text between whole words');
  check(metric.text.every(item => item.rect.x >= metric.rect.x - 1 && item.rect.right <= metric.rect.right + 1 && item.scrollWidth <= item.clientWidth + 1
    && item.textRect.x >= item.rect.x - 1 && item.textRect.right <= item.rect.right + 1 && item.textRect.y >= item.rect.y - 1 && item.textRect.bottom <= item.rect.bottom + 1), label + ' fits visible labels and cues inside their boxes');
  const wide = metric.containerWidth >= 620;
  check(metric.routeColumns === (wide ? 3 : 1), label + ' uses three route columns only with at least 620px available', { containerWidth: metric.containerWidth, columns: metric.routeColumns });
  check(wide ? metric.groups[1]?.rect.x >= metric.groups[0]?.rect.right - 1 && metric.groups[2]?.rect.x >= metric.groups[1]?.rect.right - 1
    : metric.groups[1]?.rect.y >= metric.groups[0]?.rect.bottom - 1 && metric.groups[2]?.rect.y >= metric.groups[1]?.rect.bottom - 1, label + ' places routes on the intended responsive axis');
  const geometry = await diagrams(page, state, label);
  report.cases.push({ label, state, config, ...metric, diagramSha256: hash(JSON.stringify(geometry)) });
}
async function markers(page, config, label) {
  const result = await snapshot(page);
  const selected = result.markers.filter(marker => marker.current === 'true');
  check(selected.length === 1 && selected[0].id === 'wcJourneyChapter-land' && selected[0].currentAria === 'step', label + ' retains the active parcel chapter marker independently of inspection');
  check(selected[0]?.label === (config.replay ? 'Replay parcel' : 'Current parcel') && selected[0]?.replay === (config.replay ? 'true' : undefined)
    && result.parcelLabel.startsWith(config.replay ? 'Replay parcel: ' : 'Current parcel: '), label + ' labels current and replay parcels accurately');
  check(result.data.journeyActive === true && result.data.journeyPaused === true && result.data.journeyState === 'aquifer_flow'
    && result.data.journeyReplayProgress === (config.replay ? .86 : null), label + ' retains the original paused parcel and replay position');
}
async function audit(page, label) {
  const result = await page.evaluate(async () => {
    const scope = document.querySelector('.wc-chapter-land');
    const data = await axe.run(scope, { rules: { region: { enabled: false } } });
    return { violations: data.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })),
      incomplete: data.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
  });
  report.audits.push({ label, ...result });
  check(result.violations.length === 0, label + ' scoped accessibility has zero violations', result.violations);
}
async function nativeAction(page, step, label, config, follow = false) {
  const before = await snapshot(page);
  const button = page.locator(follow ? '#wcJourneyFollowParcel' : '#wcJourneyLandStep-' + step);
  await button.focus(); await button.press('Enter'); await paint(page);
  const after = await snapshot(page);
  const changed = Object.keys({ ...before.data, ...after.data }).filter(field => !same(before.data[field], after.data[field]));
  const allowed = follow ? ['wcJourneyChapter'] : ['wcJourneyChapter', 'wcJourneyLandStep'];
  report.nativeActions.push({ label, step, follow, changedFields: changed, beforeStateSha256: hash(JSON.stringify(stable(before.data))), afterStateSha256: hash(JSON.stringify(stable(after.data))), parcelBefore: before.parcel, parcelAfter: after.parcel });
  check(after.data.wcJourneyChapter === (follow ? '' : 'land') && changed.every(field => allowed.includes(field)), label + ' performs only the original chapter inspection writes', changed);
  check(follow ? after.data.wcJourneyLandStep === before.data.wcJourneyLandStep : after.data.wcJourneyLandStep === step, label + (follow ? ' retains the remembered land step' : ' saves the selected land step'));
  const omit = data => Object.fromEntries(Object.entries(data).filter(([key]) => !allowed.includes(key)));
  check(same(omit(before.data), omit(after.data)), label + ' preserves every other learner, model, record and score field');
  check(same(before.awards, after.awards), label + ' adds no score events');
  check(same(before.parcel, after.parcel), label + ' preserves paused parcel state and progress');
  check(same(before.markers, after.markers) && before.parcelLabel === after.parcelLabel, label + ' preserves current and replay parcel markers');
  check(await page.locator('#wcJourneyChapterTitle').evaluate(el => document.activeElement === el), label + ' retains the original native heading focus');
  await inspect(page, follow ? 'aquifer_flow' : step, label, config);
  await markers(page, config, label);
}
async function main() {
  let browser;
  try {
    check(report.publicSourceSha256 === sourceHash, 'source and public runtime start identical');
    check(diagramHelpers.every(fragment => source.toString('utf8').includes(fragment)), 'scientific chapter drawing helpers remain byte identical to the frozen baseline');
    const preview = await fetch('http://127.0.0.1:8770/stem_lab/stem_tool_watercycle.js', { signal: AbortSignal.timeout(20000) });
    report.nativePreview = { url: preview.url, status: preview.status, sha256: hash(Buffer.from(await preview.arrayBuffer())) };
    check(preview.ok && report.nativePreview.sha256 === sourceHash, 'native preview serves installed runtime', report.nativePreview);
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); report.serverListening = true;
    const url = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true }); report.browserLaunched = true;
    const configs = [
      { label: 'soil-1280-light', width: 1280, theme: 'light', step: 'infiltrating' },
      { label: 'overview-1280-light', width: 1280, theme: 'light', step: 'ground_choice' },
      { label: 'plants-390-dark', width: 390, theme: 'dark', step: 'plant_absorb' },
      { label: 'soil-320-light', width: 320, theme: 'light', step: 'infiltrating' },
      { label: 'surface-320-contrast', width: 320, theme: 'contrast', step: 'river_runoff' },
      { label: 'soil-320-forced', width: 320, theme: 'contrast', step: 'infiltrating', forced: true },
      { label: 'plants-390-zoom150', width: 390, theme: 'light', step: 'plant_absorb', zoom: 1.5 },
      { label: 'replay-soil-1280-light', width: 1280, theme: 'light', step: 'infiltrating', replay: true },
    ];
    for (const config of configs) {
      const context = await browser.newContext({ viewport: { width: config.width, height: 1000 }, reducedMotion: 'reduce', forcedColors: config.forced ? 'active' : 'none' });
      try {
        const page = await context.newPage(); page.setDefaultTimeout(30000);
        page.on('pageerror', error => report.errors.push(config.label + ': ' + String(error)));
        const pending = page.waitForResponse(response => response.url().endsWith('/stem_lab/stem_tool_watercycle.js'));
        await page.goto(url); const response = await pending; const loaded = hash(await response.body());
        report.loadedSources.push({ label: config.label, sha256: loaded }); check(loaded === sourceHash, config.label + ' loads frozen installed runtime bytes');
        await page.addScriptTag({ url: url + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
        await mount(page, config);
        await inspect(page, config.step, config.label, config); await markers(page, config, config.label); await audit(page, config.label);
        const region = page.locator('.wc-chapter-land');
        check(await region.count() === 1, config.label + ' captures the bounded land pathway workspace');
        const file = config.label + '.png'; await region.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
        const bytes = fs.readFileSync(path.join(OUT, file)); report.captures.push({ file, sha256: hash(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sourceSha256: sourceHash });
        if (config.label === 'soil-1280-light' || config.replay) {
          for (const [step] of STEPS) await nativeAction(page, step, (config.replay ? 'Paused replay inspection ' : 'Native land inspection ') + step, config);
          await nativeAction(page, '', (config.replay ? 'Paused replay' : 'Native') + ' Follow current parcel', config, true);
          check(await page.locator('#wcJourneyChapterCard').getAttribute('data-following-parcel') === 'true', config.label + ' follows the existing live parcel after inspection');
          check(await page.locator('#wcJourneyFollowParcel').getAttribute('aria-pressed') === 'true', config.label + ' retains Follow selected semantics');
        }
        await page.evaluate(() => ReactDOM.unmountComponentAtNode(document.getElementById('slot')));
        console.log('Verified ' + config.label); save();
      } finally { await context.close(); }
    }
    report.completed = true;
  } catch (error) { report.errors.push(error.stack || String(error)); process.exitCode = 1; }
  finally {
    if (browser) { try { await browser.close(); report.browserClosed = true; } catch (error) { report.errors.push('Browser cleanup: ' + String(error)); } }
    try { await new Promise((resolve, reject) => server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve())); report.serverClosed = true; }
    catch (error) { report.errors.push('Server cleanup: ' + String(error)); }
    report.finalSourceSha256 = hash(fs.readFileSync(MAIN)); report.finalPublicSourceSha256 = hash(fs.readFileSync(PUBLIC)); report.finalHarnessSha256 = hash(fs.readFileSync(__filename));
    check(report.finalSourceSha256 === sourceHash && report.finalPublicSourceSha256 === sourceHash, 'both installed runtime copies remain unchanged');
    check(report.finalHarnessSha256 === report.harnessSha256, 'QA harness remains unchanged');
    check(hash(fs.readFileSync(BASELINE)) === BASELINE_SHA, 'frozen chapter baseline remains unchanged');
    check(report.completed && report.captures.length === 8, 'all eight representative captures completed');
    check(report.nativeActions.length === 14, 'all six native selectors and Follow completed for current and replay parcels');
    check(report.browserLaunched && report.browserClosed && report.serverClosed, 'owned browser and HTTP server closed');
    report.passed = report.checks.filter(item => item.passed).length; report.failed = report.checks.length - report.passed;
    report.successful = report.completed && report.failed === 0 && report.errors.length === 0 && report.browserClosed && report.serverClosed;
    report.completedAt = new Date().toISOString(); save(); fs.writeFileSync(path.join(OUT, 'tested-harness.cjs'), harnessBytes);
    console.log(JSON.stringify({ out: OUT, sourceHash, passed: report.passed, failed: report.failed, captures: report.captures.length, nativeActions: report.nativeActions.length, errors: report.errors, browserClosed: report.browserClosed, serverClosed: report.serverClosed }));
    if (!report.successful) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
