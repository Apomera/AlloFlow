'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), http = require('node:http'), assert = require('node:assert/strict');
const esbuild = require('esbuild'), { chromium } = require('playwright');
const root = process.cwd(), dir = path.join(root, 'reports/report-fixes-2026-09-30');
const modules = ['text_pipeline_helpers_module.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_utility_helpers_module.js', 'view_simplified_module.js'];
const inputs = [...modules, 'view_simplified_source.jsx', 'text_utility_helpers_source.jsx', 'desktop/web-app/public/view_simplified_module.js', 'desktop/web-app/public/text_utility_helpers_module.js', 'desktop/web-app/tailwind.config.js', 'desktop/web-app/src/index.css', 'ui_strings.js', 'tests/report_compact_audio_ui.test.js', 'reports/report-fixes-2026-09-30/compact-audio-browser.cjs'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const before = Object.fromEntries(inputs.map(file => [file, hash(file)]));
const build = JSON.parse(fs.readFileSync(path.join(dir, 'build-reader.json'), 'utf8')).modules.find(item => item.output === 'view_simplified_module.js');
assert.equal(build.inputs['view_simplified_source.jsx'], before['view_simplified_source.jsx'], 'Await coordinated reader build');
assert.equal(build.sha256, before['view_simplified_module.js']);
assert.equal(before['text_utility_helpers_source.jsx'], '6e3295ec4a7c662347d57ed2b6996fdf676066b09c288a2e92c12a240ae925ee');
const tests = fs.readFileSync(path.join(root, 'tests/report_compact_audio_ui.test.js'), 'utf8');
const mounting = tests.slice(tests.indexOf('const TEXT ='), tests.indexOf("describe('compact preparation"));
const fixture = [
  'import React from ' + JSON.stringify(path.resolve('desktop/web-app/node_modules/react').replaceAll('\\', '/')) + ';',
  'import * as ReactDOM from ' + JSON.stringify(path.resolve('desktop/web-app/node_modules/react-dom').replaceAll('\\', '/')) + ';',
  'import {createRoot} from ' + JSON.stringify(path.resolve('desktop/web-app/node_modules/react-dom/client.js').replaceAll('\\', '/')) + ';',
  'window.React=React;window.ReactDOM=ReactDOM;window.AlloModules={};window.AlloIcons=new Proxy({},{get:()=>()=>null});',
  ...modules.map(file => 'new Function(' + JSON.stringify(fs.readFileSync(path.join(root, file), 'utf8')) + ')();'),
  'const {SimplifiedView:View,PureHelpers:pure,PhaseNHelpers:phase}=window.AlloModules;let root,host,props;const act=fn=>ReactDOM.flushSync(fn);',
  'const strings=' + fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8') + ';const t=key=>key.split(".").reduce((o,k)=>o&&o[k],strings)||key;',
  mounting,
  'window.mountCompact=(extra={},options={})=>{if(root)act(()=>root.unmount());host?.remove();localStorage.clear();installAudioFixture(options);mount({t,...extra});};',
  'window.updateCompact=update;window.refreshCompact=refresh;window.compactProps=()=>props;window.mountCompact();'
].join('\n');
const result = { started: new Date().toISOString(), inputHashes: before, status: 'running', checks: [], errors: [] };
function progress(stage) { result.lastStage=stage; result.lastStageAt=new Date().toISOString(); fs.writeFileSync(path.join(dir,'compact-audio-browser-progress.json'),JSON.stringify(result,null,2)+'\n'); console.log('[compact browser] '+stage); }
function check(name, passed, evidence) { result.checks.push({ name, passed:!!passed, evidence }); progress(name); assert.ok(passed, name); }
(async () => {
  let browser, server, page, deadline;
  try {
    const bundle = await esbuild.build({ stdin:{contents:fixture,resolveDir:root,loader:'js'},bundle:true,write:false,platform:'browser',format:'iife' });
    result.servedJavaScriptSHA256 = crypto.createHash('sha256').update(bundle.outputFiles[0].contents).digest('hex');
    const desktop = path.join(root, 'desktop/web-app'), tailwind = require(require.resolve('tailwindcss', {paths:[desktop]}));
    const css = (await require('postcss')([tailwind({...require(path.join(desktop, 'tailwind.config.js')),content:[{raw:fs.readFileSync('view_simplified_source.jsx','utf8'),extension:'jsx'},{raw:fs.readFileSync('text_utility_helpers_source.jsx','utf8'),extension:'jsx'}]})]).process(fs.readFileSync(path.join(desktop,'src/index.css'),'utf8'),{from:undefined})).css;
    result.servedCssSHA256 = crypto.createHash('sha256').update(css).digest('hex');
    const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compact audio validation</title><style>'+css+'\nbody{margin:0}#app{max-width:900px;padding:8px;margin:auto}</style><div id="app"></div><script src="/fixture.js"></script></html>';
    server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?bundle.outputFiles[0].contents:html);});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,timeout:30000});const context=await browser.newContext({viewport:{width:320,height:900},hasTouch:true});page=await context.newPage();
    page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(20000);
    deadline=setTimeout(async()=>{result.harnessDeadlineReached=true;console.error('[compact browser] Overall120-second test deadline reached at '+result.lastStage);try{await page.screenshot({path:path.join(dir,'compact-audio-deadline.png'),timeout:3000});}catch(_){}try{await browser.close();}catch(_){}},120000);
    progress('Built fixture ready; opening page with20-second action/wait bounds');
    page.on('pageerror',error=>result.errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
    const panel=page.locator('[data-compact-audio]'), details=page.locator('[data-compact-audio-details]'), toggle=page.locator('[data-audio-details-toggle]');
    await page.waitForFunction(()=>document.querySelector('[data-compact-audio-counts]')?.textContent.includes('0/5 saved'));
    check('Default detail collapsed; clip availability and confirmed saves shown',await details.isHidden()&&(await panel.textContent()).includes('2/5 clips ready')&&(await panel.textContent()).includes('0/5 saved'));
    const bounds=await panel.boundingBox();check('Compact status/actions fit320 CSSpx',bounds.x>=0&&bounds.x+bounds.width<=320&&await panel.evaluate(node=>node.scrollWidth<=node.clientWidth),bounds);
    check('Every compact action fits320 CSSpx',await panel.locator('button').evaluateAll(nodes=>nodes.every(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=320;})));
    await toggle.focus();await page.keyboard.press('Enter');check('Enter expands audio details',await details.isVisible()&&await toggle.getAttribute('aria-expanded')==='true');
    check('Expanded copy separates model, synthesis, playback and confirmed storage',(await details.textContent()).includes('separate steps')&&(await details.textContent()).includes('playback in this session'));
    await details.evaluate(node=>{node.tabIndex=-1;node.focus();});await page.keyboard.press('Escape');check('Escape collapses detail and returns focus',await details.isHidden()&&await toggle.evaluate(node=>node===document.activeElement));
    await page.keyboard.press('Space');check('Space expands the native detail button',await details.isVisible());await page.keyboard.press('Escape');check('Escape from the details toggle closes details and retains focus',await details.isHidden()&&await toggle.evaluate(node=>node===document.activeElement));
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'compact-audio-default320.png')});
    await page.evaluate(()=>{window._kokoroTTS={ready:false,progress:.2};window.mountCompact({selectedVoice:'af_heart'});window.__compactAudioFixture.preparePromise=new Promise(resolve=>window.__finishCompactPrepare=resolve);});
    await page.waitForFunction(()=>document.querySelector('[data-compact-audio-counts]')?.textContent.includes('0/5 saved'));
    const prepare=page.locator('[data-review-state="audio"] [data-review-action="audio"]');await prepare.click();
    await page.waitForFunction(()=>document.querySelector('[data-compact-audio-title]')?.textContent==='Preparing local voice model');
    check('Cold local voice preparation is separate from ready session clips',(await panel.textContent()).includes('20%')&&(await panel.textContent()).includes('2/5 clips ready')&&(await page.evaluate(()=>window.__compactAudioFixture.prepareCalls.length))===1);
    const announcement=await page.locator('[data-device-audio-status]').textContent();await page.evaluate(()=>window._kokoroTTS.progress=.5);
    await page.waitForFunction(()=>document.querySelector('[data-compact-audio-progress]')?.textContent.includes('50%'));
    check('Model progress updates without repeated live announcements',await page.locator('[data-device-audio-status]').textContent()===announcement);
    await page.evaluate(()=>window._kokoroTTS.ready=true);await page.waitForFunction(()=>document.querySelector('[data-compact-audio-title]')?.textContent==='Preparing sentence audio');
    await page.evaluate(()=>window.__compactAudioFixture.prepareCalls[0].progress(1,3));await page.waitForFunction(()=>document.querySelector('[data-compact-audio-progress]')?.textContent.includes('1/3'));
    check('Attempt progress is not a ready/persisted clip count',(await panel.textContent()).includes('Processed 1/3 requested clips')&&(await panel.textContent()).includes('2/5 clips ready')&&(await panel.textContent()).includes('0/5 saved'));
    await page.evaluate(()=>window.__compactAudioFixture.prepareCalls[0].options.signal.addEventListener('abort',()=>window.__finishCompactPrepare({ok:false,cancelled:true})));
    await prepare.click();await page.waitForFunction(()=>document.querySelector('[data-review-state="audio"] [data-review-action="audio"]')?.textContent==='Prepare missing audio');
    check('Stop uses owned abort/cancel hooks and preserves partial clips',await page.evaluate(()=>window.__compactAudioFixture.prepareCalls[0].options.signal.aborted&&window.__compactAudioFixture.cancelCalls===1)&&(await panel.textContent()).includes('2/5 clips ready'));
    await page.evaluate(()=>{window.__compactAudioFixture.savePromise=new Promise(resolve=>window.__finishCompactSave=resolve);});
    const save=page.locator('[data-review-state="audio"] [data-review-action="audio-retry-save"]');await save.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('[data-review-action="audio-retry-save"]')?.getAttribute('aria-busy')==='true');
    await page.keyboard.press('Enter');check('Repeated save keeps focus and joins one request',await save.evaluate(node=>node===document.activeElement)&&await page.evaluate(()=>window.__compactAudioFixture.saveCalls.length===1));
    await page.evaluate(()=>window.__finishCompactSave(false));await page.waitForFunction(()=>document.querySelector('[data-device-audio-notice]')?.textContent.includes('was not confirmed'));
    check('Rejected/unconfirmed saving remains visible with usable clips',(await panel.textContent()).includes('Keep this page open')&&(await panel.textContent()).includes('2/5 clips ready')&&(await panel.textContent()).includes('0/5 saved'));
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'compact-audio-save-failure320.png')});
    await page.evaluate(()=>{window.__compactAudioFixture.savePromise=Promise.resolve(true);});await save.click();await page.waitForFunction(()=>document.querySelector('[data-review-action="audio-retry-save"]')?.getAttribute('aria-busy')!=='true');
    check('Successful write return does not invent durable readiness',(await panel.textContent()).includes('0/5 saved')&&!(await page.locator('[data-compact-audio-title]').textContent()).includes('Audio saved'));
    await page.evaluate(()=>{window.__compactAudioFixture.saved=2;window.refreshCompact();});await page.waitForFunction(()=>document.querySelector('[data-compact-audio-counts]')?.textContent.includes('2/5 saved'));
    check('Verified partial saves keep missing-clip action and remove save retry',await prepare.isVisible()&&await save.count()===0&&(await panel.textContent()).includes('2/5 clips ready'));
    await toggle.click();await page.evaluate(()=>{window.__compactAudioFixture.id='next-audio';window.updateCompact({generatedContent:{...window.compactProps().generatedContent,id:'next-audio'}});});
    await page.waitForFunction(()=>document.querySelector('[data-audio-details-toggle]')?.getAttribute('aria-expanded')==='false');
    check('Navigation resets expanded audio details',await details.isHidden());
    await page.evaluate(()=>window.mountCompact());await page.waitForFunction(()=>document.querySelector('[data-compact-audio-counts]')?.textContent.includes('0/5 saved'));
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');await panel.scrollIntoViewIfNeeded();
    const enlargedBounds=await panel.boundingBox();check('Compact audio reflows at320 CSSpx with32px root font',enlargedBounds.x>=0&&enlargedBounds.x+enlargedBounds.width<=320&&await panel.evaluate(node=>node.scrollWidth<=node.clientWidth),enlargedBounds);
    await toggle.focus();await page.keyboard.press('Enter');check('Enlarged-font keyboard activation exposes details',await details.isVisible());check('Expanded compact detail and actions fit320 CSSpx at32px font',await panel.evaluate(node=>node.scrollWidth<=node.clientWidth)&&await panel.locator('button').evaluateAll(nodes=>nodes.every(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=320;})));await page.keyboard.press('Escape');check('Enlarged-font Escape restores toggle focus',await details.isHidden()&&await toggle.evaluate(node=>node===document.activeElement));
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,'compact-audio-font32-320.png')});await page.evaluate(()=>document.documentElement.style.fontSize='16px');
    await page.addScriptTag({content:fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});
    result.axe=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-compact-audio]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};});
    check('Scoped compact-panel automated accessibility check',result.axe.violations.length===0,result.axe);
    check('No uncaught local generated-module errors',result.errors.length===0,result.errors);result.status='passed';
  }catch(error){result.status='failed';result.error=error.stack||error.message;process.exitCode=1;console.error(result.error);try{if(page&&!page.isClosed()){await page.screenshot({path:path.join(dir,'compact-audio-browser-failure.png'),timeout:5000});result.failureDom=await page.locator('[data-teacher-review-summary]').textContent({timeout:3000});}}catch(_){} }
  finally{clearTimeout(deadline);if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));result.changedInputs=inputs.filter(file=>hash(file)!==before[file]);if(result.changedInputs.length){result.status='failed';process.exitCode=1;}result.completed=new Date().toISOString();result.scope='Local generated reader, real React/CSS, fixture service statuses and owned real reader handlers; no cloud synthesis, actual storage reload or manual screen reader.';fs.writeFileSync(path.join(dir,'compact-audio-browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:result.checks.length,changedInputs:result.changedInputs,output:path.join(dir,'compact-audio-browser-results.json')}));}
})();
