'use strict';
// Real canvas pixels and native controls are checked in an isolated browser.
// Run from the repository: node dev-tools/watercycle_diagram_clarity_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const out = path.join(root, 'reports/watercycle-diagram-clarity');
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const report = { capturedAt: new Date().toISOString(), sourceSha256: hash(source), checks: [], cases: [], audits: [], errors: [], failures: [] };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Water Cycle diagram clarity QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#eef2f2;font-family:system-ui}main{padding:12px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
const theme=new URLSearchParams(location.search).get('theme')||'light';
function Host(){const [data,setData]=React.useState({waterCycle:{wcMode:'explorer',journeyView:'2d',journeyPaused:true,wc2dPaused:true,activeStage:'evaporation'}});window.waterReviewData=data.waterCycle;window.waterReviewSet=setData;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
</script></body></html>`;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html); }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  if (url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(source); }
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(error ? 'Not found' : data); });
});
const check = (pass, label, detail) => { report.checks.push({ label, pass: !!pass, ...(detail ? { detail } : {}) }); if (!pass) report.failures.push(label); };
function canvasInstrumentation() {
  const proto = CanvasRenderingContext2D.prototype;
  const clear = proto.clearRect;
  const fill = proto.fillText;
  window.wcCanvasAudit = { frames: 0, text: [] };
  proto.clearRect = function (...args) {
    if (this.canvas.id === 'wcCanvas') { window.wcCanvasAudit.frames++; window.wcCanvasAudit.text = []; }
    return clear.apply(this, args);
  };
  proto.fillText = function (text, x, y, ...args) {
    if (this.canvas.id === 'wcCanvas') {
      const metrics = this.measureText(String(text));
      const transform = this.getTransform();
      const fontPx = Number((this.font.match(/([\d.]+)px/) || [0, 0])[1]);
      const width = metrics.width;
      const left = x - (this.textAlign === 'center' ? width / 2 : this.textAlign === 'right' || this.textAlign === 'end' ? width : 0);
      const top = y - (this.textBaseline === 'middle' ? fontPx / 2 : this.textBaseline === 'top' || this.textBaseline === 'hanging' ? 0 : fontPx);
      window.wcCanvasAudit.text.push({ text: String(text), font: this.font, fontPx, fill: this.fillStyle, x: transform.a * left + transform.c * top + transform.e, y: transform.b * left + transform.d * top + transform.f, w: width * transform.a, h: fontPx * transform.d });
    }
    return fill.call(this, text, x, y, ...args);
  };
}
async function metrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('wcCanvas');
    const c = canvas.getBoundingClientRect();
    const sx = canvas.width / c.width, sy = canvas.height / c.height;
    const chrome = [...canvas.parentElement.querySelectorAll('.wc-canvas-title,.wc-chip-row,.wc-scene-lens')].map(el => { const r = el.getBoundingClientRect(); return { class: el.className, x: (r.left - c.left) * sx, y: (r.top - c.top) * sy, w: r.width * sx, h: r.height * sy }; }).filter(r => r.w && r.h);
    const captions = window.wcCanvasAudit.text.filter(t => Math.abs(t.fontPx / sx - 11) < 0.2 && /[A-Z]/.test(t.text) && t.text === t.text.toUpperCase());
    const stageText = window.wcCanvasAudit.text.filter(t => /Evaporation|Condensation|Precipitation|Collection|Transpiration|Infiltration/.test(t.text));
    const guide = document.querySelector('.wc-canvas-guide');
    const gr = guide.getBoundingClientRect();
    return { stage: canvas.dataset.activeStage, journey: canvas.dataset.journeyState, subsurface: canvas.dataset.subsurfacePhase, width: canvas.width, height: canvas.height, cssWidth: c.width, cssHeight: c.height, paused: canvas.dataset.wc2dPaused, pendingFrame: !!canvas._wcAnim, frames: window.wcCanvasAudit.frames, captions, stageText, chrome, flowCue: canvas.dataset.flowCue, sceneTitle: document.querySelector('.wc-canvas-title strong').innerText, guideStep: guide.querySelector('.wc-canvas-guide-handoff-process').innerText, guideText: guide.innerText, guideEnergy: guide.querySelector('.wc-canvas-guide-handoff-energy').innerText, vaporGuidance: guide.querySelector('[data-vapor-guidance]').dataset.vaporGuidance, guideBounds: { x: gr.left, y: gr.top, w: gr.width, h: gr.height }, guideOverflow: [...guide.querySelectorAll('*')].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.left < gr.left - 1 || r.right > gr.right + 1); }).map(el => el.className), viewportWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth, ariaLabel: canvas.getAttribute('aria-label'), energy: canvas.dataset.energyTransfer };
  });
}
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function assess(metric, label) {
  report.cases.push({ label, ...metric });
  check(metric.captions.length > 0, label + ' draws physical evidence captions');
  check(metric.captions.every(r => r.x >= 2 && r.y >= 2 && r.x + r.w <= metric.width - 2 && r.y + r.h <= metric.height - 2), label + ' all actual caption text stays inside canvas', metric.captions);
  check(metric.captions.every(r => metric.chrome.every(c => !overlap(r, c))), label + ' actual caption text clears DOM scene chrome', { captions: metric.captions, chrome: metric.chrome });
  check(metric.stageText.length === 6, label + ' all six process labels are drawn');
  check(metric.paused === 'true' && !metric.pendingFrame, label + ' paused controls leave no pending animation frame');
  check(metric.scrollWidth <= metric.viewportWidth && metric.guideOverflow.length === 0, label + ' guide and page fit viewport', metric.guideOverflow);
  check(metric.guideText.includes('Location, not amount') && metric.guideText.includes('Energy, not water') && metric.guideText.includes('not to scale'), label + ' visual key explains parcel energy and depiction scope');
  check(metric.sceneTitle === metric.guideStep, label + ' scene heading names the same active step as its guide', { scene: metric.sceneTitle, guide: metric.guideStep });
  const energy = { absorbed: 'Latent heat absorbed', released: 'Latent heat released', none: 'No required phase change' }[metric.energy];
  check(metric.guideEnergy === energy, label + ' guide expresses energy in learner language', { energy: metric.energy, text: metric.guideEnergy });
}
async function crop(page, name, guide = false) {
  await page.evaluate(() => scrollTo(0, 0));
  const clip = await page.evaluate(guide => { const shell = document.querySelector('.wc-canvas-shell').getBoundingClientRect(); const bottom = guide ? document.querySelector('.wc-canvas-guide').getBoundingClientRect().bottom : shell.bottom; return { x: shell.x, y: shell.y, width: shell.width, height: bottom - shell.y }; }, guide);
  await page.screenshot({ path: path.join(out, name), clip, animations: 'disabled', timeout: 60000 });
}
(async function () {
  fs.mkdirSync(out, { recursive: true });
  for (const stage of ['infiltration', 'condensation']) {
    const original = path.join(root, 'scratch/watercycle-diagram-audit', stage + '-light-320.png');
    const saved = path.join(out, 'before-' + stage + '-light-320.png');
    if (fs.existsSync(original)) fs.copyFileSync(original, saved);
    else assert.ok(fs.existsSync(saved), 'The saved original baseline capture must be present: ' + saved);
  }
  report.baselineSourceSha256 = '35eff63fc4c5ecc4d2755a92c2b0a688e80801daea5520d797b46af21a7fbdaa';
  report.baselineNote = 'Before captures use the unchanged prior runtime; the isolated fixture explicitly stopped its canvas through the runtime pause hook because the old persisted-pause attribute did not reach the drawing loop.';
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const config of [{ theme: 'light', width: 1280 }, { theme: 'light', width: 320 }, { theme: 'dark', width: 320 }, { theme: 'contrast', width: 320 }, { theme: 'contrast', width: 320, forced: true }]) {
      const page = await browser.newPage({ viewport: { width: config.width, height: 1800 }, reducedMotion: 'reduce', ...(config.forced ? { forcedColors: 'active' } : {}) });
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => report.errors.push(String(error)));
      await page.addInitScript(canvasInstrumentation);
      await page.goto('http://127.0.0.1:' + server.address().port + '/?theme=' + config.theme);
      await page.locator('#wcCanvas').waitFor();
      await page.waitForTimeout(200);
      const prefix = (config.forced ? 'forced-colors' : config.theme) + '-' + config.width;
      const initial = await metrics(page);
      check(initial.frames >= 1 && initial.paused === 'true' && !initial.pendingFrame, prefix + ' restored paused state paints one stable initial diagram', initial);
      const previousFrames = initial.frames;
      await page.waitForTimeout(100);
      check((await metrics(page)).frames === previousFrames, prefix + ' paused initial frame does not keep repainting');
      for (const [index, stage] of ['evaporation', 'condensation', 'precipitation', 'collection', 'transpiration', 'infiltration'].entries()) {
        await page.locator('button[aria-label^="Stage ' + (index + 1) + ':"]').click();
        const value = await metrics(page);
        check(value.stage === stage && value.ariaLabel.includes(stage[0].toUpperCase() + stage.slice(1)), prefix + ' native stage control selects ' + stage);
        assess(value, prefix + ' ' + stage);
        if (config.theme === 'light' && (config.width === 1280 && stage === 'evaporation' || config.width === 320 && ['condensation', 'infiltration'].includes(stage))) await crop(page, stage + '-' + prefix + '.png', config.width === 1280);
        if (config.theme === 'dark' && stage === 'transpiration' || config.forced && stage === 'infiltration') await crop(page, stage + '-' + prefix + '.png', true);
      }
      for (const journey of [{ state: 'plant_absorb', stage: 'transpiration', required: 'ROOT → XYLEM', vapor: 'not-applicable' }, { state: 'aquifer_flow', stage: 'infiltration', required: 'SELECTED DEEP RECHARGE', vapor: 'not-applicable', progress: 0 }, { state: 'aquifer_flow', stage: 'infiltration', required: 'GROUNDWATER → DISCHARGE', vapor: 'not-applicable', progress: 0.5, label: 'groundwater transfer' }, { state: 'infiltrating', stage: 'infiltration', required: 'SOIL PORE WATER (VADOSE ZONE)', vapor: 'not-applicable' }]) {
        await page.evaluate(j => waterReviewSet(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, journeyActive: true, journeyPaused: true, journeyState: j.state, journeyLastPath: j.state === 'infiltrating' ? 'infiltrate' : '', activeStage: j.stage } })), journey);
        if (typeof journey.progress === 'number') await page.locator('#wcCanvas').evaluate((el, progress) => el._wcSetJourneyProgress(progress), journey.progress);
        const value = await metrics(page);
        const journeyLabel = journey.label || journey.state;
        assess(value, prefix + ' journey ' + journeyLabel);
        check(value.captions.map(r => r.text).join(' ').includes(journey.required), prefix + ' journey ' + journeyLabel + ' draws its actual pathway caption', value.captions);
        check(value.vaporGuidance === journey.vapor, prefix + ' journey ' + journeyLabel + ' shows applicable phase guidance', value.vaporGuidance);
        if (journey.state === 'plant_absorb') check(!value.captions.some(r => /VAPOR|STOMATA/.test(r.text)), prefix + ' root uptake diagram does not imply vapor release');
        if (journey.state === 'plant_absorb' && config.theme === 'light' && config.width === 320) await crop(page, 'plant-uptake-light-320.png', true);
      }
      await page.evaluate(() => waterReviewSet(prev => ({ ...prev, waterCycle: { ...prev.waterCycle, journeyActive: false, journeyState: 'idle', activeStage: 'transpiration', climSolar: 0 } })));
      const closed = await metrics(page);
      assess(closed, prefix + ' limited vegetation or closed stomata');
      check(closed.captions.map(r => r.text).join(' ').includes('LIMITED VEGETATION / STOMATA CLOSED'), prefix + ' longest condition caption remains complete', closed.captions);
      await page.addScriptTag({ url: '/desktop/web-app/node_modules/axe-core/axe.min.js' });
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('.wc-canvas-guide'), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })));
      report.audits.push({ label: prefix + ' diagram guide', violations });
      check(violations.length === 0, prefix + ' diagram guide accessibility audit', violations);
      await page.keyboard.press('Tab');
      await page.locator('.wc-2d-playback').focus();
      const focus = await page.locator('.wc-2d-playback').evaluate(el => { const s = getComputedStyle(el); return { visible: el.matches(':focus-visible'), outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow, bounds: { width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height } }; });
      check(focus.visible && (parseFloat(focus.width) >= 2 && focus.outline !== 'none' || focus.shadow !== 'none'), prefix + ' playback control has visible keyboard focus', focus);
      check(focus.bounds.height >= 44, prefix + ' playback target is at least 44px tall', focus.bounds);
      if (config.theme === 'light' && config.width === 320) await crop(page, 'guide-keyboard-focus-light-320.png', true);
      await page.close();
      console.log('CHECK ' + prefix);
    }
    report.finalSourceSha256 = hash(fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js')));
    report.mirrorSha256 = hash(fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js')));
    check(report.sourceSha256 === report.finalSourceSha256 && report.sourceSha256 === report.mirrorSha256, 'frozen source and public mirror match the tested runtime');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify({ sourceSha256: report.sourceSha256, checks: report.checks.length, cases: report.cases.length, audits: report.audits.length, failures: report.failures, errors: report.errors }, null, 2));
  assert.deepEqual(report.failures, []);
  assert.deepEqual(report.errors, []);
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
