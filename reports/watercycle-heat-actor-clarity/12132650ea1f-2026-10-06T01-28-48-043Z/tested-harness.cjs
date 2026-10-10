'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'stem_lab/stem_tool_watercycle.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(MAIN);
const sourceHash = hash(source);
const expected = process.argv.find(arg => arg.startsWith('--expected-sha='))?.slice(15);
if (expected !== sourceHash) throw Error('Supply installed source with --expected-sha=' + sourceHash);
const harnessBytes = fs.readFileSync(__filename);
const OUT = path.join(ROOT, 'reports/watercycle-heat-actor-clarity', sourceHash.slice(0, 12) + '-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(OUT, { recursive: true });

const report = {
  pid: process.pid, startedAt: new Date().toISOString(), sourceSha256: sourceHash,
  publicSourceSha256: hash(fs.readFileSync(PUBLIC)), harnessSha256: hash(harnessBytes),
  checks: [], cases: [], nativeActions: [], captures: [], loadedSources: [], audits: [], errors: [],
  completed: false, successful: false, browserLaunched: false, browserClosed: false,
  serverListening: false, serverClosed: false,
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
// Expected authored meanings are independent of DOM attributes and label classifiers.
const PREVIEWS = {
  evaporation: { label: 'Evaporation', energy: 'absorbed', reading: 'Latent heat absorbed' },
  transpiration: { label: 'Transpiration', energy: 'absorbed', reading: 'Latent heat absorbed at leaves' },
  condensation: { label: 'Condensation', energy: 'released', reading: 'Latent heat released to surrounding air' },
  infiltration: { label: 'Infiltration', energy: 'none', reading: 'No phase change; infiltration is not automatically recharge' },
  precipitation: { label: 'Precipitation', energy: 'none', reading: 'No required phase change during the fall' },
  collection: { label: 'Collection', energy: 'none', reading: 'No required phase change during storage' },
};
const JOURNEYS = {
  evaporating: PREVIEWS.evaporation,
  condensing: PREVIEWS.condensation,
  aquifer_flow: { energy: 'none', reading: 'No phase change along this modeled return path' },
  ground_choice: { energy: 'none', reading: 'No required phase change while choosing a route' },
  ocean: { energy: 'none', reading: 'No phase change during storage' },
};
const seed = {
  wcMode: 'explorer', wcSection: 'journey', wcJourneyChapter: 'water',
  activeStage: 'evaporation', journeyView: '2d', journeyActive: false,
  journeyState: 'aquifer_flow', journeyLastPath: 'infiltrate', journeyPaused: true, wc2dPaused: true,
  journeySpeed: 1, journeyLoops: 2, journeyReplayProgress: .42,
  journeyPaths: { runoff: 1, infiltrate: 1, plant: 0 }, stagesViewed: {},
  xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
  completedChallenges: ['complete_journey', 'explore_all_stages', 'adjust_climate', 'quiz_pass', 'vocabulary_studied', 'stewardship_win', 'myth_buster', 'double_rainbow'],
  climSolar: 1.2, climTemp: 18, climWind: 1.4,
  landRainIntensity: 60, landSaturation: 50, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
  wcScenarioBaseline: { climSolar: 1, climTemp: 15, climWind: 1 }, wcPrediction: 'infiltration',
  wcProcessCompare: { notes: { 'evaporation|condensation': 'Keep my comparison explanation.' } },
  wcExperimentLog: [{ key: 'saved-record', label: 'Retain my observation', notes: { explanation: 'Keep the learner evidence.' } }],
  wcCheckReflections: { kept: { observation: 'Keep the learner Check reflection.' } },
  wcGroundwaterLens: { explorer: { version: 1, identity: 'groundwater-lens-v1', part: 'soil', answer: 'soil_storage' } },
  precipHunt: { experiment: { prediction: 'Keep my storm prediction.', explanation: 'Keep my storm explanation.' } },
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heat actor clarity QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui}main{padding:12px;max-width:1250px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.heatAwards=[];window.mountHeat=function(seed,theme){
 ReactDOM.unmountComponentAtNode(document.getElementById('slot'));window.heatAwards=[];
 function Host(){const[data,setData]=React.useState({waterCycle:seed});window.heatData=data.waterCycle;const noop=()=>{};
 return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:(...args)=>heatAwards.push(args),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};</script></body></html>`;
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
    mountHeat({ ...seed, ...patch }, config.theme);
  }, { seed, config, patch });
  await page.locator('#wcStageFocusDescription .wc-live-heat-path').waitFor({ state: 'visible' });
  await paint(page);
  await page.locator('#wcCanvas').evaluate(canvas => { if (canvas._wcSetJourneyProgress) canvas._wcSetJourneyProgress(.42); });
  await paint(page);
}
async function snapshot(page) {
  await paint(page);
  return page.evaluate(() => {
    const canvas = document.querySelector('#wcCanvas');
    return { data: JSON.parse(JSON.stringify(heatData)), awards: JSON.parse(JSON.stringify(heatAwards)),
      parcel: { state: canvas?.dataset.journeyState, progress: canvas?.dataset.journeyProgress, paused: canvas?.dataset.journeyPaused } };
  });
}
async function inspect(page, expectation, label, config) {
  const metric = await page.locator('#wcStageFocusDescription .wc-live-heat-path').evaluate(root => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const text = [...root.querySelectorAll('p,strong,small,.wc-lt-heat-arrow>span')].map(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      return { text: element.textContent, fontSize: parseFloat(getComputedStyle(element).fontSize), color: getComputedStyle(element).color,
        rect: rect(element), textRect: (() => { const r = range.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })(),
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
    });
    const actors = [...root.querySelectorAll('[data-lt-heat-actor]')].map(element => ({ actor: element.dataset.ltHeatActor,
      nameWordFragments: (() => { const name=element.querySelector('strong'); const range=document.createRange(); range.setStart(name.firstChild,0); range.setEnd(name.firstChild,name.textContent.split(' ')[0].length); return range.getClientRects().length; })(),
      role: element.dataset.ltHeatRole, name: element.querySelector('strong')?.textContent, roleText: element.querySelector('small')?.textContent,
      nameFont: parseFloat(getComputedStyle(element.querySelector('strong')).fontSize), roleFont: parseFloat(getComputedStyle(element.querySelector('small')).fontSize),
      copyFont: parseFloat(getComputedStyle(element.querySelector('.wc-lt-heat-actor-copy')).fontSize), rect: rect(element),
      iconHidden: element.querySelector('i')?.getAttribute('aria-hidden') === 'true' }));
    const arrow = root.querySelector('[data-lt-heat-arrow]');
    const arrowMetric = arrow ? { direction: arrow.dataset.ltHeatArrow, path: arrow.querySelector('path').getAttribute('d'),
      transform: getComputedStyle(arrow).transform, rect: rect(arrow), hidden: arrow.getAttribute('aria-hidden'), focusable: arrow.getAttribute('focusable'),
      textCount: arrow.querySelectorAll('text').length } : null;
    return { rect: rect(root), containerWidth: root.clientWidth, containerType: getComputedStyle(root).containerType,
      energy: root.dataset.ltEnergy, direction: root.dataset.ltHeatDirection, headline: root.querySelector('.wc-lt-heat-direction')?.textContent || '',
      reading: root.querySelector('.wc-lt-heat-reading')?.textContent, noLatent: root.querySelector('.wc-lt-no-latent')?.textContent || '',
      groupLabel: root.querySelector('[role=group]')?.getAttribute('aria-label'), actors, arrow: arrowMetric, text,
      scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  const absorbed = expectation.energy === 'absorbed', released = expectation.energy === 'released';
  const transferring = absorbed || released;
  check(metric.energy === expectation.energy && metric.direction === (absorbed ? 'into-water' : released ? 'out-of-water' : 'not-required'), label + ' retains authored heat direction');
  check(metric.reading === expectation.reading, label + ' retains original energy label', metric.reading);
  check(!metric.pageOverflow && metric.scrollWidth <= metric.clientWidth + 1, label + ' has no horizontal overflow');
  check(metric.text.every(item => item.rect.x >= metric.rect.x - 1 && item.rect.right <= metric.rect.right + 1 && item.scrollWidth <= item.clientWidth + 1
    && item.textRect.x >= item.rect.x - 1 && item.textRect.right <= item.rect.right + 1 && item.textRect.y >= item.rect.y - 1 && item.textRect.bottom <= item.rect.bottom + 1), label + ' fits visible text inside the heat workspace');
  check(metric.text.every(item => item.fontSize >= 13), label + ' retains readable text despite legacy definition-list rules');
  if (transferring) {
    check(metric.headline === (absorbed ? 'Heat enters water' : 'Heat leaves water'), label + ' names heat entering or leaving water');
    const surroundings = metric.actors.find(actor => actor.actor === 'surroundings');
    const water = metric.actors.find(actor => actor.actor === 'water');
    check(metric.actors.length === 2 && metric.actors[0]?.actor === 'surroundings' && metric.actors[1]?.actor === 'water'
      && surroundings?.name === (released ? 'Surrounding air' : 'Surroundings') && water?.name === 'Water', label + ' retains both actor names and their order');
    check(surroundings?.role === (absorbed ? 'gives' : 'receives') && water?.role === (absorbed ? 'receives' : 'gives')
      && surroundings?.roleText === (absorbed ? 'Gives heat' : 'Receives heat') && water?.roleText === (absorbed ? 'Receives heat' : 'Gives heat'), label + ' pairs each actor with its sender or receiver role');
    check(metric.actors.every(actor => actor.nameFont >= 13 && actor.roleFont >= 13 && actor.copyFont >= 13), label + ' protects actor label typography');
    check(metric.actors.every(actor => actor.nameWordFragments === 1), label + ' keeps actor names readable as whole words');
    check(metric.groupLabel === (absorbed ? 'Latent heat flows from surroundings into water' : 'Latent heat flows from water to surrounding air'), label + ' retains original accessible flow description');
    check(metric.arrow?.direction === (absorbed ? 'right' : 'left') && metric.arrow?.path === (absorbed ? 'M8 14h68M65 4l11 10-11 10' : 'M76 14H8M19 4L8 14l11 10'), label + ' retains true arrow direction and geometry');
    check(metric.arrow?.hidden === 'true' && metric.arrow?.focusable === 'false' && metric.arrow?.textCount === 0 && metric.actors.every(actor => actor.iconHidden), label + ' keeps icons and arrow decorative');
    const horizontal = metric.containerWidth >= 440;
    const matrix = metric.arrow?.transform.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number);
    const rotated = matrix && Math.abs(matrix[0]) < .001 && Math.abs(matrix[1] - 1) < .001 && Math.abs(matrix[2] + 1) < .001 && Math.abs(matrix[3]) < .001;
    check(horizontal ? metric.arrow?.transform === 'none' : !!rotated, label + ' uses correct horizontal or 90 degree arrow layout', { containerWidth: metric.containerWidth, transform: metric.arrow?.transform });
    if (surroundings && water) {
      check(horizontal ? water.rect.x >= surroundings.rect.right - 1 : water.rect.y >= surroundings.rect.bottom - 1, label + ' places actor cards along the arrow axis');
      const sender = absorbed ? surroundings : water, receiver = absorbed ? water : surroundings;
      check(horizontal ? (absorbed ? receiver.rect.x > sender.rect.x : receiver.rect.x < sender.rect.x)
        : (absorbed ? receiver.rect.y > sender.rect.y : receiver.rect.y < sender.rect.y), label + ' points toward the actor receiving heat');
    }
  } else {
    check(!metric.arrow && metric.actors.length === 0 && metric.headline === '', label + ' adds no heat-transfer diagram for movement or storage');
    check(metric.noLatent === 'No latent heat transfer is required by this process. Water can still move, warm or cool.', label + ' retains the original no-latent explanation');
  }
  report.cases.push({ label, expectation, config, ...metric });
  return metric;
}
async function audit(page, label) {
  const result = await page.evaluate(async () => {
    const scope = document.querySelector('#wcStageFocusDescription .wc-live-heat-path');
    const data = await axe.run(scope, { rules: { region: { enabled: false } } });
    return { violations: data.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })),
      incomplete: data.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
  });
  report.audits.push({ label, ...result });
  check(result.violations.length === 0, label + ' scoped accessibility has zero violations', result.violations);
}
async function stageAction(page, stage, label, active = false) {
  const before = await snapshot(page);
  const button = page.locator('.wc-stage-rack').getByRole('button', { name: new RegExp('^Stage [1-6]: ' + PREVIEWS[stage].label + '(?: |$)') });
  await button.focus(); await button.press('Enter'); await paint(page);
  const after = await snapshot(page);
  const changed = Object.keys({ ...before.data, ...after.data }).filter(field => !same(before.data[field], after.data[field]));
  report.nativeActions.push({ label, stage, changedFields: changed, beforeStateSha256: hash(JSON.stringify(stable(before.data))), afterStateSha256: hash(JSON.stringify(stable(after.data))), parcelBefore: before.parcel, parcelAfter: after.parcel });
  check(after.data.activeStage === stage && changed.every(field => ['activeStage', 'stagesViewed'].includes(field)), label + ' performs only existing stage preview writes', changed);
  const omit = data => Object.fromEntries(Object.entries(data).filter(([key]) => !['activeStage', 'stagesViewed'].includes(key)));
  check(same(omit(before.data), omit(after.data)), label + ' preserves every other saved learner and model field');
  check(same(before.awards, after.awards), label + ' adds no score events');
  check(same(before.parcel, after.parcel), label + ' preserves the paused parcel state and progress');
  check(after.data.journeyActive === active && after.data.journeyPaused === true, label + ' retains existing journey activity and pause');
}

async function main() {
  let browser;
  try {
    check(report.publicSourceSha256 === sourceHash, 'source and public runtime start identical');
    const preview = await fetch('http://127.0.0.1:8770/stem_lab/stem_tool_watercycle.js', { signal: AbortSignal.timeout(20000) });
    report.nativePreview = { url: preview.url, status: preview.status, sha256: hash(Buffer.from(await preview.arrayBuffer())) };
    check(preview.ok && report.nativePreview.sha256 === sourceHash, 'native preview serves installed runtime', report.nativePreview);
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    report.serverListening = true;
    const url = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true }); report.browserLaunched = true;
    const configs = [
      { label: 'absorption-1280-light', width: 1280, theme: 'light', stage: 'evaporation' },
      { label: 'release-1280-light', width: 1280, theme: 'light', stage: 'condensation' },
      { label: 'movement-1280-light', width: 1280, theme: 'light', stage: 'infiltration' },
      { label: 'release-390-dark', width: 390, theme: 'dark', stage: 'condensation' },
      { label: 'absorption-320-light', width: 320, theme: 'light', stage: 'evaporation' },
      { label: 'release-320-contrast', width: 320, theme: 'contrast', stage: 'condensation' },
      { label: 'release-320-forced', width: 320, theme: 'contrast', stage: 'condensation', forced: true },
      { label: 'release-390-zoom150', width: 390, theme: 'light', stage: 'condensation', zoom: 1.5 },
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
        await mount(page, config, { activeStage: config.stage });
        await inspect(page, PREVIEWS[config.stage], config.label, config); await audit(page, config.label);
        const region = page.locator('#wcStageFocusDescription .wc-live-heat-path').locator('xpath=ancestor::div[parent::dl][1]');
        check(await region.count() === 1, config.label + ' captures the bounded latent-heat definition card');
        const file = config.label + '.png'; await region.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
        const bytes = fs.readFileSync(path.join(OUT, file)); report.captures.push({ file, sha256: hash(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sourceSha256: sourceHash });
        if (config.label === 'absorption-1280-light') {
          await mount(page, config, { activeStage: 'evaporation' });
          for (const stage of ['transpiration', 'condensation', 'infiltration', 'precipitation', 'collection', 'evaporation']) {
            await stageAction(page, stage, 'Native inactive preview ' + stage);
            await inspect(page, PREVIEWS[stage], 'Native inactive preview ' + stage, config);
          }
          for (const journeyState of ['condensing', 'evaporating', 'aquifer_flow', 'ground_choice', 'ocean']) {
            await mount(page, config, { journeyActive: true, journeyState, activeStage: 'infiltration' });
            await inspect(page, JOURNEYS[journeyState], 'Paused journey ' + journeyState, config);
            await stageAction(page, 'condensation', 'Paused journey stage selection ' + journeyState, true);
            await inspect(page, JOURNEYS[journeyState], 'Paused journey after stage selection ' + journeyState, config);
          }
          await mount(page, config, { activeStage: 'condensation' });
          await page.locator('#wcStageFocusDescription .wc-live-heat-path').evaluate(element => { element.style.width='400px'; });
          await paint(page);
          await inspect(page, PREVIEWS.condensation, 'Constrained 400px heat workspace', config);
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
    report.finalSourceSha256 = hash(fs.readFileSync(MAIN)); report.finalPublicSourceSha256 = hash(fs.readFileSync(PUBLIC));
    report.finalHarnessSha256 = hash(fs.readFileSync(__filename));
    check(report.finalSourceSha256 === sourceHash && report.finalPublicSourceSha256 === sourceHash, 'both installed runtime copies remain unchanged');
    check(report.finalHarnessSha256 === report.harnessSha256, 'QA harness remains unchanged');
    check(report.completed && report.captures.length === 8, 'all eight representative captures completed');
    check(report.browserLaunched && report.browserClosed && report.serverClosed, 'owned browser and HTTP server closed');
    report.passed = report.checks.filter(item => item.passed).length; report.failed = report.checks.length - report.passed;
    report.successful = report.completed && report.failed === 0 && report.errors.length === 0 && report.browserClosed && report.serverClosed;
    report.completedAt = new Date().toISOString(); save(); fs.writeFileSync(path.join(OUT, 'tested-harness.cjs'), harnessBytes);
    console.log(JSON.stringify({ out: OUT, sourceHash, passed: report.passed, failed: report.failed, captures: report.captures.length, errors: report.errors, browserClosed: report.browserClosed, serverClosed: report.serverClosed }));
    if (!report.successful) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
