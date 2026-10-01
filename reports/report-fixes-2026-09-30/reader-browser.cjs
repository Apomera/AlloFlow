'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const esbuild = require('esbuild'), { chromium } = require('playwright');
const focusProbe = process.argv.includes('--focus-probe');
const root = process.cwd(), output = path.join(root, 'reports/report-fixes-2026-09-30/' + (focusProbe ? 'reader-browser-focus-probe.json' : 'reader-browser-results.json'));
const inputs = ['AlloFlowANTI.txt', 'view_simplified_source.jsx', 'text_utility_helpers_source.jsx', 'view_simplified_module.js', 'text_utility_helpers_module.js', 'text_pipeline_helpers_module.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'tests/report_reader_glossary_parity.test.js', 'desktop/web-app/public/view_simplified_module.js', 'desktop/web-app/public/text_utility_helpers_module.js', 'desktop/web-app/tailwind.config.js', 'desktop/web-app/src/index.css'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const before = Object.fromEntries(inputs.map(file => [file, hash(file)]));
const modules = ['text_pipeline_helpers_module.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_utility_helpers_module.js', 'view_simplified_module.js'];
const testSource = fs.readFileSync(path.join(root, 'tests/report_reader_glossary_parity.test.js'), 'utf8');
const constants = testSource.slice(testSource.indexOf('const SOURCE ='), testSource.indexOf('beforeAll('));
const mounting = testSource.slice(testSource.indexOf('function pair('), testSource.indexOf("describe('actual reader"));
const hostAdapter = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8').match(/^  const highlightGlossaryTerms =[\s\S]*?^  };/m)?.[0];
if (!hostAdapter) throw new Error('Canonical host glossary adapter missing');
const fixture = [
  'import React from ' + JSON.stringify(path.resolve('desktop/web-app/node_modules/react').replaceAll('\\', '/')) + ';',
  'import * as ReactDOM from ' + JSON.stringify(path.resolve('desktop/web-app/node_modules/react-dom').replaceAll('\\', '/')) + ';',
  'import {createRoot} from ' + JSON.stringify(path.resolve('desktop/web-app/node_modules/react-dom/client.js').replaceAll('\\', '/')) + ';',
  'window.React = React; window.ReactDOM = ReactDOM; window.AlloModules = {}; window.AlloIcons = new Proxy({}, {get:()=>()=>null});',
  'window.__reportReaderHostGlossaryAdapter=' + JSON.stringify(hostAdapter) + ';',
  ...modules.map(file => 'new Function(' + JSON.stringify(fs.readFileSync(path.join(root, file), 'utf8')) + ')();'),
  'const {SimplifiedView:View, InstructionalContext:api, PureHelpers:pure, PhaseNHelpers:phase, TextUtilityHelpers:helpers}=window.AlloModules;',
  'const act = fn => ReactDOM.flushSync(fn); let host, root, props;',
  'const vi={fn:()=>{const fn=(...args)=>fn.mock.calls.push(args);fn.mock={calls:[]};return fn;}};',
  constants, mounting,
  'window.mountReader=(mode, extra={})=>{if(root)act(()=>root.unmount());host?.remove();localStorage.clear();mount(mode,extra);};',
  'window.readerCalls=()=>({speak:props.handleSpeak.mock.calls,lookup:props.handleWordClick.mock.calls.length,phonics:props.handlePhonicsClick.mock.calls.length});',
  'window.updateReader=extra=>{Object.assign(props,extra);act(()=>root.render(React.createElement(View,props)));};',
  'window.mountReader("original");'
].join('\n');
const result = { started: new Date().toISOString(), inputHashes: before, checks: [], errors: [], status: 'running' };
function check(name, passed, evidence) { result.checks.push({ name, passed: !!passed, evidence }); assert.ok(passed, name); }
(async () => {
  let browser, server;
  try {
    const bundle = await esbuild.build({ stdin: { contents: fixture, resolveDir: root, loader: 'js' }, bundle: true, write: false, platform: 'browser', format: 'iife' });
    result.bundledJavaScriptSHA256 = crypto.createHash('sha256').update(bundle.outputFiles[0].contents).digest('hex');
    const desktop = path.join(root, 'desktop/web-app'), tailwind = require(require.resolve('tailwindcss', { paths: [desktop] }));
    const config = require(path.join(desktop, 'tailwind.config.js'));
    const css = (await require('postcss')([tailwind({ ...config, content: [
      { raw: fs.readFileSync(path.join(root, 'view_simplified_source.jsx'), 'utf8'), extension: 'jsx' },
      { raw: fs.readFileSync(path.join(root, 'text_utility_helpers_source.jsx'), 'utf8'), extension: 'jsx' }
    ] })]).process(fs.readFileSync(path.join(desktop, 'src/index.css'), 'utf8'), { from: undefined })).css;
    result.generatedCssSHA256 = crypto.createHash('sha256').update(css).digest('hex');
    const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reader glossary verification</title><style>' + css + '\nbody{margin:0}#app{max-width:900px;padding:8px;margin:auto}</style><div id="app"></div><script src="/fixture.js"></script></html>';
    server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/fixture.js' ? bundle.outputFiles[0].contents : html); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 320, height: 900 }, hasTouch: true, isMobile: true });
    const page = await context.newPage(); page.on('pageerror', error => result.errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port); await page.locator('.allo-glossary-term').first().waitFor();
    if (focusProbe) {
      result.focusProbe = [];
      for (const size of [16, 32]) {
        await page.evaluate(size => {
          document.documentElement.style.fontSize = size + 'px'; window.mountReader('original');
          window.__readerFocusTrace = [];
          window.addEventListener('scroll', event => window.__readerFocusTrace.push({event:'scroll',target:event.target.nodeName || 'window',scrollY,at:performance.now()}),{capture:true});
          document.addEventListener('focusin', event => window.__readerFocusTrace.push({event:'focusin',target:event.target.className,scrollY,at:performance.now()}),{capture:true});
        }, size);
        const target = page.locator('.allo-glossary-term').first();
        await target.focus();
        await page.waitForTimeout(250);
        const afterFocus = await page.evaluate(() => ({trace:window.__readerFocusTrace,focused:document.activeElement?.classList.contains('allo-glossary-term'),popup:!!document.querySelector('[role="tooltip"]'),scrollY,term:document.querySelector('.allo-glossary-term').getBoundingClientRect().toJSON()}));
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
        const afterEnter = await page.evaluate(() => ({popup:!!document.querySelector('[role="tooltip"]'),focused:document.activeElement?.classList.contains('allo-glossary-term'),scrollY}));
        result.focusProbe.push({fontSize:size,afterFocus,afterEnter});
        await page.keyboard.press('Escape');
      }
      const passed = result.focusProbe.every(item => item.afterFocus.focused && item.afterFocus.popup && item.afterEnter.popup);
      result.status = passed ? 'passed' : 'failed';
      if (!passed) process.exitCode = 1;
      return;
    }
    for (const mode of ['adapted', 'original', 'both']) {
      for (const preview of [false, true]) {
        await page.evaluate(({mode,preview}) => window.mountReader(mode, { isStudentPreview: preview, previewLimitId: 'preview-limits' }), {mode,preview});
        const expected = mode === 'both' ? 12 : 6; await page.waitForFunction(count => document.querySelectorAll('.allo-glossary-term').length === count, expected);
        const nested = await page.locator('button button, button [role="button"], [role="button"] button, [role="button"] [role="button"], a [role="button"]').count();
        check(mode + (preview ? ' preview' : '') + ': six repeated terms per passage, no nested controls', nested === 0, {terms:expected,nested});
        const term = page.locator('.allo-glossary-term').first(); await term.tap();
        await page.getByRole('tooltip').waitFor();
        await page.waitForFunction(() => { const picture = document.querySelector('[role="tooltip"] img'); return picture?.complete && picture.naturalWidth > 0; });
        check(mode + (preview ? ' preview' : '') + ': touch exposes saved definition/image without speech', (await page.getByRole('tooltip').textContent()).includes('A Scottish lord.') && await page.getByRole('tooltip').locator('img').count() === 1 && (await page.evaluate(()=>window.readerCalls())).speak.length === 0);
        await term.focus(); await page.keyboard.press('Escape'); await page.getByRole('tooltip').waitFor({state:'hidden'});
        check(mode + ': Escape keeps term focus', await term.evaluate(node => node === document.activeElement));
        await page.keyboard.press('Enter'); await page.getByRole('tooltip').waitFor();
        const popup = await page.getByRole('tooltip').boundingBox();
        check(mode + ': 320 CSSpx popup fits viewport', popup.x >= 0 && popup.x + popup.width <= 320 && popup.y >= 0 && popup.y + popup.height <= 900, popup);
        await page.keyboard.press('Escape');
        if (mode === 'both') {
          await page.getByRole('checkbox',{name:'Show changes',exact:true}).check();
          check('Both Show changes: glossary in both columns', await page.locator('[data-compare-version="source"] .allo-glossary-term').count() === 6 && await page.locator('[data-compare-version="adapted"] .allo-glossary-term').count() === 6);
          await page.locator('[data-compare-version="adapted"] .allo-glossary-term').nth(4).tap(); await page.getByRole('tooltip').waitFor();
          check('Both Show changes: help on repeated word', (await page.getByRole('tooltip').textContent()).includes('A ruler of a kingdom.'));
          await page.keyboard.press('Escape');
          await page.getByRole('checkbox',{name:'Show changes',exact:true}).uncheck();
        }
        if (!preview) {
          const sentence = page.locator(mode === 'adapted' ? '[data-sentence-read]' : '[data-exact-sentence-stop]').first();
          await sentence.focus(); await page.keyboard.press('Enter');
          check(mode + ': native keyboard sentence read still works', (await page.evaluate(()=>window.readerCalls())).speak.length === 1);
          await page.evaluate(()=>{const [text,id,start]=window.readerCalls().speak[0];const sentences=text.split(/\n{2,}/).flatMap(part=>window.AlloModules.PureHelpers.splitTextToSentences(part,{}));window.updateReader({isPlaying:true,playingContentId:id,playbackState:{currentIdx:start,sentences}});});
          const currentSelector = mode === 'adapted' ? '[data-reading-sentence][aria-current="true"]' : '[data-exact-sentence-stop][aria-current="true"]';
          check(mode + ': current sentence announced during playback', await page.locator(currentSelector).count() === 1);
          await page.evaluate(()=>window.updateReader({isPlaying:false,playingContentId:null,playbackState:{currentIdx:-1}}));
          check(mode + ': current sentence marker clears on stop', await page.locator(currentSelector).count() === 0);
        }
      }
    }
    await page.evaluate(()=>window.mountReader('original',{interactionMode:'define'}));
    const word = page.locator('[data-exact-word]').first(); await word.focus(); await page.keyboard.press('ArrowRight');
    check('Original Word meaning: RightArrow reaches glossary and displays help', await page.evaluate(()=>document.activeElement?.classList.contains('allo-glossary-term')) && await page.getByRole('tooltip').isVisible());
    await page.keyboard.press('Enter');
    check('Original Word meaning: existing glossary avoids AI lookup', (await page.evaluate(()=>window.readerCalls())).lookup === 0);
    await page.keyboard.press('Escape');
    for (const width of [320, 640]) for (const fontSize of [16,32]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(size=>{document.documentElement.style.fontSize=size+'px';window.mountReader('original');},fontSize);
      await page.locator('.allo-glossary-term').first().focus(); await page.waitForTimeout(150);
      check('Reflow width '+width+' font '+fontSize+': native focus scroll keeps help open', await page.getByRole('tooltip').isVisible());
      await page.getByRole('tooltip').waitFor();
      const bounds = await page.getByRole('tooltip').boundingBox(), dimensions = await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
      check('Reflow width '+width+' font '+fontSize+': no horizontal overflow; tooltip fits', dimensions.scroll <= dimensions.client && bounds.x >= 0 && bounds.x + bounds.width <= width, {bounds,dimensions});
      if (width === 320) await page.screenshot({path:path.join(root,'reports/report-fixes-2026-09-30/reader-browser-reflow320-font'+fontSize+'.png')});
      await page.keyboard.press('Escape');
    }
    check('No uncaught generated-module browser errors', result.errors.length === 0, result.errors);
    result.status = 'passed';
  } catch(error) { result.status='failed';result.error=error.stack || error.message;process.exitCode=1; console.error(error.stack || error.message); }
  finally {
    if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
    result.changedInputs = inputs.filter(file=>hash(file)!==before[file]);
    if(result.changedInputs.length){result.status='failed';process.exitCode=1;}
    result.completed=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({status:result.status,checks:result.checks.length,changedInputs:result.changedInputs,output},null,2));
  }
})();
