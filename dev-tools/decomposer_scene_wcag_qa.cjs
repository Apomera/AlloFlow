'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const arg = key => process.argv.find(value => value.startsWith('--' + key + '='))?.slice(key.length + 3);
const label = arg('report') || 'baseline';
assert(/^[a-z0-9-]+$/.test(label));
const folder = path.join(root, 'reports/decomposer-scene-wcag');
const out = path.join(folder, label);
fs.mkdirSync(out, { recursive: true });
const sourcePath = path.resolve(root, arg('source') || 'reports/decomposer-scene-wcag/baseline-source.js');
assert(sourcePath.startsWith(root + path.sep));
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const temp = process.argv.includes('--serve') ? null : fs.mkdtempSync(path.join(out, 'browser-temp-'));
if (temp) process.env.TEMP = process.env.TMP = temp;
const browserDirectory = path.join(process.env.USERPROFILE, 'AppData/Local/ms-playwright');
if (fs.existsSync(browserDirectory)) process.env.PLAYWRIGHT_BROWSERS_PATH = browserDirectory;
const { chromium } = require('playwright');
const cssFile = fs.readdirSync(path.join(root, 'app/static/css')).find(file => /^main\.[a-z0-9]+\.css$/i.test(file));
assert(cssFile, 'Compiled app stylesheet exists');
const verify = process.argv.includes('--verify');
const result = { sourceSha256, sourcePath: path.relative(root, sourcePath), scope: 'Interactive React Decomposer Hunt in a local host using the compiled application stylesheet and runtime AppStyles. Icons are aria-hidden SVGs; names cannot come from test placeholder text. Native keyboard focus and axe findings cover sampled states, not complete WCAG conformance.', checks: [], cases: [], audits: [], captures: [], errors: [], networkFailures: [], progressLocks: [] };
function progress() {
  try { fs.writeFileSync(path.join(out, 'progress.json'), JSON.stringify(result, null, 2)); }
  catch (error) { if (error.code !== 'EBUSY') throw error; result.progressLocks.push(String(error)); }
}
function check(name, ok, evidence) {
  result.checks.push({ name, ok, evidence });
  console.log('CHECK ' + name + ' ' + ok);
  progress();
  if (verify) assert(ok, name);
}
const html = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Decomposer Hunt accessibility review</title>
<link rel="stylesheet" href="/app/static/css/${cssFile}"><style>body{margin:0;background:#fff;color:#0f172a;font-family:system-ui}#tool-root{max-width:1200px;margin:auto;padding:12px;box-sizing:border-box}.theme-contrast{background:#000;color:#ff0}@media(max-width:500px){#tool-root{padding:8px}}:root{--allo-stem-canvas:#fff;--allo-stem-panel:#f8fafc;--allo-stem-deeper:#e2e8f0;--allo-stem-text:#0f172a;--allo-stem-text-soft:#475569;--allo-stem-border:#cbd5e1;--allo-stem-button-bg:#f1f5f9;--allo-stem-button-text:#0f172a;--allo-stem-button-border:#cbd5e1}</style></head><body><div id="styles"></div><main id="tool-root"></main><div id="qa-announcer" class="sr-only" role="status" aria-live="polite"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/app_styles_module.js"></script><script>window.StemLab={_registry:{},registerTool:function(id,tool){this._registry[id]=tool;}};</script><script src="/stem_lab/stem_tool_decomposer.js"></script><script>
const Icon=function(props){return React.createElement('svg',{'aria-hidden':'true',focusable:'false',width:props.size||20,height:props.size||20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,className:props.className},React.createElement('path',{d:'M6 6L18 18M6 18L18 6'}));};
const icons=new Proxy({},{get:()=>Icon});
ReactDOM.render(React.createElement(AlloModules.AppStyles.AppStyles,{baseFontSize:16,lineHeight:1.5}),document.getElementById('styles'));
window.mountDecomposer=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({decomposer:seed});window.decomposerData=data.decomposer;window.decomposerSet=setData;const noop=()=>{};
 return StemLab._registry.decomposer.render({React,toolData:data,setToolData:setData,icons,toolSnapshots:[],setToolSnapshots:noop,setStemLabTool:noop,setStemLabTab:noop,stemLabTab:'explore',stemLabTool:'decomposer',gradeLevel:'5th Grade',gradeBand:'3-5',isDark:false,isContrast:theme==='contrast',props:{},addToast:noop,awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,srOnly:{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0,0,0,0)'},a11yClick:fn=>({onClick:fn}),t:(key,fallback)=>fallback==null?key:fallback,announceToSR:message=>{window.decomposerAnnouncements.push(message);document.querySelector('#qa-announcer').textContent=message;},callGemini:null,callTTS:null});}
 window.decomposerAnnouncements=[];document.documentElement.classList.toggle('theme-contrast',theme==='contrast');document.body.style.background=theme==='contrast'?'#000':'#fff';document.body.style.color=theme==='contrast'?'#ff0':'#0f172a';document.querySelector('#qa-announcer').textContent='';ReactDOM.unmountComponentAtNode(document.getElementById('tool-root'));ReactDOM.render(React.createElement(Host),document.getElementById('tool-root'));
};mountDecomposer({tab:'scenes',activeScene:'kitchen',huntTarget:'k_faucet',huntWrongGuess:'k_salt'});
</script></body></html>`;
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  if (url.pathname === '/stem_lab/stem_tool_decomposer.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  const allowed = ['/app/static/css/', '/app_styles_module.js', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/'];
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, bytes) => { if (error) { response.writeHead(404); response.end(); return; } response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(bytes); });
});
let browser;
(async () => {
  await new Promise(resolve => server.listen(process.argv.includes('--serve') ? Number(arg('port') || 8772) : 0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  if (process.argv.includes('--serve')) { console.log('Decomposer Hunt accessibility preview: ' + url); return; }
  try {
    browser = await chromium.launch({ headless: true, args: ['--disk-cache-size=1', '--media-cache-size=1', '--disable-background-networking'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('requestfailed', request => result.networkFailures.push({ url: request.url(), failure: request.failure() }));
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.decomposerData && document.querySelector('#tool-root canvas'));
    await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const wrongSeed = { tab: 'scenes', activeScene: 'kitchen', huntTarget: 'k_faucet', huntWrongGuess: 'k_salt' };
    const detailSeed = { tab: 'scenes', activeScene: 'kitchen', huntTarget: 'k_salt', selectedSceneObj: 'k_faucet', foundObjects: { k_faucet: true } };
    function dismiss(type) {
      if (type === 'feedback') return page.locator('p').filter({ hasText: /^Not quite! Salt Shaker contains:$/ }).locator('xpath=../..').locator(':scope > button');
      return page.getByRole('heading', { name: 'Kitchen Faucet', exact: true }).locator('xpath=../..').locator(':scope > button');
    }
    async function active() {
      return page.evaluate(() => { const element = document.activeElement, box = element.getBoundingClientRect(), style = getComputedStyle(element), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return { tag: element.tagName, id: element.id, name: element.getAttribute('aria-label') || element.textContent.trim(), dataObject: element.dataset.decomposerObject, hit: hit === element || element.contains(hit), occluder: hit && { tag: hit.tagName, object: hit.closest('[data-decomposer-object]')?.dataset.decomposerObject, text: hit.textContent }, outline: style.outlineStyle, outlineWidth: style.outlineWidth, rect: { x: box.x, y: box.y, width: box.width, height: box.height }, inViewport: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight }; });
    }
    async function nativeFocus(locator) { await locator.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await settle(); return active(); }
    async function audit(name) {
      const audit = await page.evaluate(async name => { const r = await axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] } }); const compact = item => ({ id: item.id, impact: item.impact, help: item.help, helpUrl: item.helpUrl, nodes: item.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary, any: node.any, all: node.all, none: node.none })) }); return { name, version: axe.version, violations: r.violations.map(compact), incomplete: r.incomplete.map(compact), passes: r.passes.map(item => item.id) }; }, name);
      result.audits.push(audit); progress(); return audit;
    }
    async function capture(name, locator) { const file = path.join(out, name + '.png'); await locator.screenshot({ path: file }); const bytes = fs.readFileSync(file); result.captures.push({ name, path: path.relative(root, file), sha256: crypto.createHash('sha256').update(bytes).digest('hex') }); }
    async function mount(seed, width, mode) {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ forcedColors: mode === 'forced-colors' ? 'active' : 'none' });
      await page.evaluate(({seed,mode}) => { document.querySelector('#qa-spacing')?.remove(); mountDecomposer(seed,mode==='app-contrast'?'contrast':'light'); }, {seed,mode});
      await page.evaluate(() => document.fonts.ready); await settle();
      if (mode === 'spacing') { const style = await page.addStyleTag({ content: '#tool-root,#tool-root *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#tool-root p{margin-bottom:2em!important}' }); await style.evaluate(element => { element.id = 'qa-spacing'; }); }
      await settle();
    }
    if (process.argv.includes('--contrast-probe')) {
      result.paint = [];
      for (const [type, mode, width] of [['feedback', 'normal', 320], ['details', 'normal', 320], ['feedback', 'app-contrast', 1280], ['details', 'app-contrast', 1280], ['feedback', 'forced-colors', 1280]]) {
        await mount(type === 'feedback' ? wrongSeed : detailSeed, width, mode);
        result.paint.push(...await page.evaluate(({type, mode, width}) => {
          const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
          const lum = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
          const ratio = (one, two) => (Math.max(lum(one), lum(two)) + .05) / (Math.min(lum(one), lum(two)) + .05);
          const elements = [...document.querySelectorAll('#tool-root p,#tool-root span')].filter(element => {
            const text = element.textContent;
            return element.classList.contains('decomposer-scene-object-label') || /Chemistry Challenge|Tap the object in the scene|Keep looking for/.test(text) || type === 'details' && /Covalent|Liquid|18\.015 g\/mol/.test(text) && !!element.closest('.bg-gradient-to-r');
          });
          return elements.map(element => {
            const style = getComputedStyle(element), foreground = style.color;
            let ancestor = element, background = null, stops = [];
            while (ancestor) { const s = getComputedStyle(ancestor); if (s.backgroundImage !== 'none') { background = s.backgroundImage; stops = background.match(/rgba?\([^)]*\)/g) || []; break; } if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') { background = s.backgroundColor; stops = [background]; break; } ancestor = ancestor.parentElement; }
            return { type, mode, width, text: element.textContent.trim(), classes: element.className, foreground, background, fontSize: style.fontSize, fontWeight: style.fontWeight, stops, ratios: stops.map(stop => ratio(rgb(foreground), rgb(stop))) };
          });
        }, {type, mode, width}));
        if (type === 'feedback' && mode === 'normal') { await nativeFocus(dismiss(type)); await page.keyboard.press('Enter'); await settle(); result.restoredOccluder = await active(); await capture('320-restored-object-focus', page.locator('[data-allo-fs-stage]').first()); }
      }
      if (verify) check('Sampled small Hunt text meets4.5to1 at every painted gradient endpoint', result.paint.length >= 8 && result.paint.every(row => row.ratios.length > 0 && row.ratios.every(value => value >= 4.5)), result.paint);
      result.success = true; return;
    }
    const matrix = [[320, 'normal'], [1280, 'normal']];
    if (verify) matrix.push([320, 'spacing'], [1280, 'forced-colors'], [1280, 'app-contrast']);
    for (const [width, mode] of matrix) for (const type of ['feedback', 'details']) {
      if (mode === 'app-contrast' && type === 'details') continue;
      const name = width + '-' + mode + '-' + type;
      await mount(type === 'feedback' ? wrongSeed : detailSeed, width, mode);
      const close = dismiss(type);
      assert.equal(await close.count(), 1, 'One exact conditional dismiss control');
      const canvas = await page.locator('#tool-root canvas').elementHandle();
      const before = await nativeFocus(close);
      const a = await audit(name);
      const panel = close.locator('xpath=../..');
      await capture(name, panel);
      const nameExpected = type === 'feedback' ? 'Dismiss incorrect guess feedback' : 'Close object details';
      check(name + ' dismiss control has a descriptive name', before.name === nameExpected, before);
      check(name + ' dismiss control has a44px target', before.rect.width >= 44 && before.rect.height >= 44, before.rect);
      check(name + ' dismiss focus is visible and unobscured', before.hit && before.inViewport && before.outline !== 'none' && parseFloat(before.outlineWidth) > 0, before);
      await page.keyboard.press('Enter'); await settle();
      const after = await active();
      const expectedObject = type === 'feedback' ? 'k_salt' : 'k_faucet';
      check(name + ' dismiss removes its panel', await close.count() === 0, after);
      check(name + ' dismiss restores corresponding scene object focus', after.id === 'stem-decomposer-object-kitchen-' + expectedObject && after.hit && after.inViewport, after);
      if (width === 320 && mode === 'normal' && type === 'feedback') await capture('320-normal-restored-scene-focus', page.locator('[data-allo-fs-stage]').first());
      const preserved = await canvas.evaluate(element => element === document.querySelector('#tool-root canvas'));
      check(name + ' dismiss preserves scene canvas', preserved);
      await page.keyboard.press('Tab'); await settle(); const next = await active();
      check(name + ' subsequent Tab reaches another control', next.tag === 'BUTTON' && next.id !== after.id && next.hit && next.inViewport, next);
      const fit = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
      check(name + ' page reflows horizontally', fit.width <= fit.viewport + 1, fit);
      check(name + ' has no unnamed-button finding', !a.violations.some(item => item.id === 'button-name'), a.violations.filter(item => item.id === 'button-name'));
      if (verify) check(name + ' has no target-size finding', !a.violations.some(item => item.id === 'target-size'), a.violations.filter(item => item.id === 'target-size'));
      result.cases.push({ name, type, width, mode, before, after, next, preserved, fit }); progress();
    }
    if (verify) {
      result.objectFocus = [];
      for (const [width, mode] of [[320, 'normal'], [320, 'spacing'], [640, 'normal'], [1280, 'normal']]) {
        await mount({ tab: 'scenes', activeScene: 'kitchen', huntTarget: 'k_faucet' }, width, mode);
        const objects = page.locator('[data-decomposer-object]');
        check(width + ' ' + mode + ' scene has all seven native object controls', await objects.count() === 7);
        for (let index = 0; index < 7; index++) { const observation = await nativeFocus(objects.nth(index)); result.objectFocus.push({ width, mode, ...observation }); check(width + ' ' + mode + ' scene object ' + index + ' native keyboard focus is visible and unobscured', observation.hit && observation.inViewport && observation.outline !== 'none' && parseFloat(observation.outlineWidth) > 0 && observation.rect.width >= 44 && observation.rect.height >= 44, observation); }
        const objectsAudit = await audit(width + '-' + mode + '-all-object-controls');
        check(width + ' ' + mode + ' all scene objects have no target-size finding', !objectsAudit.violations.some(item => item.id === 'target-size'), objectsAudit.violations.filter(item => item.id === 'target-size'));
      }
      await mount({ tab: 'scenes', activeScene: 'kitchen', huntTarget: 'k_faucet' }, 1280, 'normal');
      const canvas = await page.locator('#tool-root canvas').elementHandle();
      await nativeFocus(page.getByRole('button', { name: 'Salt', exact: true })); await page.keyboard.press('Enter'); await settle();
      check('keyboard wrong selection opens feedback without moving object focus', await page.evaluate(() => decomposerData.huntWrongGuess === 'k_salt' && document.activeElement.dataset.decomposerObject === 'k_salt'));
      const announcement = await page.evaluate(() => decomposerAnnouncements.at(-1) || '');
      check('wrong selection announces object compound and target', /Salt Shaker/.test(announcement) && /Table Salt/.test(announcement) && /NaCl/.test(announcement) && /Water|H2O|H₂O/.test(announcement), announcement);
      await nativeFocus(dismiss('feedback')); await page.keyboard.press('Enter'); await settle();
      await nativeFocus(page.getByRole('button', { name: 'Faucet', exact: true })); await page.keyboard.press('Enter'); await settle();
      check('keyboard correct selection identifies the target and opens details', await page.evaluate(() => decomposerData.foundObjects.k_faucet === true && decomposerData.selectedSceneObj === 'k_faucet' && document.activeElement.dataset.decomposerObject === 'k_faucet'));
      check('identified scene trigger exposes its expanded details region', await page.getByRole('region', { name: 'Kitchen Faucet', exact: true }).count() === 1 && await page.evaluate(() => { const trigger = document.activeElement; const target = document.getElementById(trigger.getAttribute('aria-controls')); return trigger.getAttribute('aria-expanded') === 'true' && target && target.id === 'stem-decomposer-object-details'; }));
      await nativeFocus(dismiss('details')); await page.keyboard.press('Enter'); await settle();
      check('keyboard details close restores trigger with collapsed state', await page.evaluate(() => document.activeElement.dataset.decomposerObject === 'k_faucet' && document.activeElement.getAttribute('aria-expanded') === 'false'));
      check('full wrong-correct-dismiss keyboard journey preserves canvas', await canvas.evaluate(element => element === document.querySelector('#tool-root canvas')));
      await capture('1280-keyboard-journey-final', page.locator('#tool-root'));
    }
    if (verify) check('No confirmed automated WCAG findings in the sampled Hunt states', result.audits.every(audit => audit.violations.length === 0), result.audits.map(audit => ({name:audit.name, violations:audit.violations.map(item=>item.id)})));
    check('No browser errors in sampled Hunt states', result.errors.length === 0, result.errors);
    result.success = true;
  } catch (error) { result.success = false; result.harnessError = String(error); console.error(error); process.exitCode = 1; }
  finally {
    if (browser) { await browser.close(); result.browsersClosed = true; }
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); });
    const real = fs.realpathSync(temp), parent = fs.realpathSync(out);
    assert(real.startsWith(parent + path.sep) && path.basename(real).startsWith('browser-temp-'));
    fs.rmSync(real, { recursive: true, force: true }); result.browserTempCleaned = true;
    result.passed = result.checks.filter(row => row.ok).length; result.failed = result.checks.filter(row => !row.ok).length;
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ success: result.success, sourceSha256, passed: result.passed, failed: result.failed, cases: result.cases.length, errors: result.errors }));
  }
})();
