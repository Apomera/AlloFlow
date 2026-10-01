// Disposable, local-only fixture. Host audio/lookup callbacks are recorded;
// this checks interaction ownership, not a provider's pronunciation quality.
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const root = process.cwd(), out = __dirname;
const inputRoot = process.env.PREPARED_HELP_SOURCE_DIR || root;
const previewProbe = process.argv.includes('--preview-probe');
const react = path.resolve('desktop/web-app/node_modules/react').replaceAll('\\', '/');
const reactDom = path.resolve('desktop/web-app/node_modules/react-dom/client.js').replaceAll('\\', '/');
const modules = ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'alt_text_module.js'].map(file => fs.readFileSync(path.join(inputRoot, file), 'utf8'));
if (process.env.PREPARED_HELP_SOURCE_DIR) {
  const source = ['reader_place_store.js', 'reader_support_drafts.js', 'view_simplified_source.jsx'].filter(file=>fs.existsSync(path.join(inputRoot,file))).map(file=>fs.readFileSync(path.join(inputRoot,file),'utf8')).join('\n');
  const compiled = require('@babel/core').transformSync(source,{plugins:[['@babel/plugin-transform-react-jsx',{useBuiltIns:false}]],babelrc:false,configFile:false,parserOpts:{sourceType:'script',plugins:['jsx']}}).code;
  modules.push('var React=window.React; var Fragment=React.Fragment;\n'+compiled+'\nwindow.AlloModules.SimplifiedView=SimplifiedView;');
} else modules.push(fs.readFileSync('view_simplified_module.js','utf8'));
const fixture = `
import React from ${JSON.stringify(react)};
import {createRoot} from ${JSON.stringify(reactDom)};
window.React = React; window.AlloModules = {}; window.AlloIcons = new Proxy({}, {get: () => () => null});
${modules.map(source => 'new Function(' + JSON.stringify(source) + ')();').join('\n')}
const {InstructionalContext: contract, SimplifiedView: View, PureHelpers: pure, PhaseNHelpers: phase} = window.AlloModules;
const noop = () => {};
let app;
window.mount = (scenario = {}) => {
  if (app) app.unmount();
  window.calls = {speak: [], lookup: [], stop: []};
  const data = scenario.data || 'A bank **account**. A bank account.';
  const quote = scenario.quote || 'bank account';
  const item = {id:'browser-prepared', type:'simplified', data, config:{language:'English'}, instructionalText:{form:'adapted',role:'supplemental'}, sourceSnapshot:contract.createSourceSnapshot('The bank holds an account.', {language:'English'})};
  let help = contract.upsertAdaptedReadingSupport(item, null, {id:'browser-help', start:data.lastIndexOf(quote), end:data.lastIndexOf(quote)+quote.length, quote, text:'The explanation for this exact occurrence.'});
  item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, help, true);
  function Host() {
    const [playing, setPlaying] = React.useState(null);
    const [mode, setMode] = React.useState('define');
    const [firstReader, setFirstReader] = React.useState(true);
    window.hideFirstReader = () => setFirstReader(false);
    const props = {
      ComplexityGauge:()=>null, t:k=>k, inputText:'', gradeLevel:'5', leveledTextLanguage:'English', selectedVoice:'Kore', voiceSpeed:1,
      studentInterests:[], isTeacherMode:!!scenario.teacher, isZenMode:!scenario.teacher, interactionMode:mode, isCompareMode:!!scenario.compare,
      history:[item], generatedContent:item, textEditorRef:React.createRef(), playbackState:{currentIdx:-1}, cursorStyles:{}, latestGlossary:[],
      isPlaying:!!playing && !scenario.pendingAudio, playingContentId:playing,
      setComplexityLevel:noop, setSaveOriginalOnAdjust:noop, setReadingTheme:noop, setSelectionMenu:noop, setIsCustomReviseOpen:noop,
      setInteractionMode:setMode, setIsCompareMode:noop, setIsFluencyMode:noop, setFocusedParagraphIndex:noop,
      handleToggleIsEditingLeveledText:noop, handleFormatText:noop, handleSimplifiedTextChange:noop, handleTextMouseUp:noop,
      closeDefinition:noop, closePhonics:noop, closeRevision:noop, handleQuickAddGlossary:noop, handlePhonicsClick:noop,
      handleSpeak:(...args)=>{window.calls.speak.push(args);setPlaying(args[1]);},
      stopPlayback:()=>{window.calls.stop.push(playing);setPlaying(null);},
      handleWordClick:(word)=>window.calls.lookup.push(word), callTTS:noop,
      splitTextToSentences:text=>pure.splitTextToSentences(text, {}), getSideBySideContent:()=>null,
      getContentDirection:()=> 'ltr', isRtlLang:()=>false, renderFormattedText:text=>React.createElement('div',null,text),
      formatInteractiveText:(text,cloze)=>phase.formatInteractiveText(text,cloze,false,{highlightGlossaryTerms:x=>x,latestGlossary:[],MathSymbol:({text})=>text}),
      highlightGlossaryTerms:x=>x, SourceReferencesPanel:()=>null
    };
    return scenario.multiple ? React.createElement(React.Fragment, null,
      firstReader && React.createElement(View, {...props, key:'first'}),
      React.createElement(View, {...props, key:'second'})) : React.createElement(View, props);
  }
  app=createRoot(document.getElementById('app'));app.render(React.createElement(Host));
};
window.mount();
`;

(async () => {
  const bundle = await esbuild.build({ stdin: { contents: fixture, resolveDir: root, loader: 'js' }, bundle: true, write: false, platform: 'browser', format: 'iife' });
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prepared help fixture</title><style>body{font:16px system-ui;margin:16px}button{min-height:44px;margin:3px}button,[role=button]{cursor:pointer}.fixed{position:fixed}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}[data-word-help-card]{z-index:100;background:white;border:2px solid #6366f1;border-radius:12px;padding:16px;box-sizing:border-box}a{color:#3730a3}[data-prepared-word-help]{text-decoration:underline dotted}*:focus-visible{outline:3px solid #4338ca}#app{max-width:900px}details{margin-block:8px}</style><div id="app"></div><script src="/fixture.js"></script></html>';
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/fixture.js' ? bundle.outputFiles[0].contents : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const url = 'http://127.0.0.1:' + server.address().port;
  const results = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url); await page.locator('[data-prepared-word-help]').first().waitFor();
    if (previewProbe) {
      await page.evaluate(()=>window.mount({teacher:true,data:'The heron rests.',quote:'heron'}));
      await page.locator('[data-student-preview-open]').click();
      const preview = page.locator('[data-student-preview]');
      await preview.waitFor();
      assert.equal(await preview.evaluate(node=>node.closest('[data-adapted-reader]')===null),true);
      assert.equal(await page.locator('[data-adapted-reader="teacher"]').evaluate(node=>node.hasAttribute('inert')&&node.getAttribute('aria-hidden')==='true'),true);
      const previewList = preview.locator('[data-adapted-word-help]');
      await previewList.locator('[data-adapted-word-help-spot]').click();
      assert.equal(await page.evaluate(()=>[...CSS.highlights.get('allo-word-help-focus')][0].startContainer.parentElement.closest('[data-student-preview]')!==null),true);
      await previewList.locator('[data-prepared-help-open]').click();
      await preview.locator('[data-word-help-card]').waitFor();
      assert.equal(await preview.locator('[data-word-help-card-hear]').isDisabled(),true);
      await page.keyboard.press('Escape');
      assert.equal(await preview.count(),1);
      assert.equal(await previewList.locator('[data-prepared-help-open]').evaluate(node=>node===document.activeElement),true);
      await page.keyboard.press('Escape');
      await preview.waitFor({state:'detached'});
      const teacher = page.locator('[data-adapted-reader="teacher"]');
      await teacher.locator('[data-adapted-word-help-spot]').click();
      assert.equal(await page.evaluate(()=>[...CSS.highlights.get('allo-word-help-focus')][0].startContainer.parentElement.closest('[data-adapted-reader]').getAttribute('data-adapted-reader')), 'teacher');
      await teacher.locator('[data-prepared-help-open]').click();
      await teacher.locator('[data-word-help-card-all]').click();
      assert.equal(await teacher.locator('[data-adapted-word-help]').evaluate(node=>node===document.activeElement),true);
      assert.deepEqual(errors,[]);
      const result={passed:true,inputRoot,readerSha256:require('crypto').createHash('sha256').update(fs.readFileSync(path.join(inputRoot,'view_simplified_source.jsx'))).digest('hex'),checks:['preview is outside the teacher reader','background is inert and aria-hidden','preview spotlight remains in preview','preview audio remains disabled','card Escape keeps preview open and returns focus','second Escape closes preview','teacher spotlight and All word help stay in teacher reader after preview closes'],errors};
      fs.writeFileSync(path.join(out,'integration-preview-results.json'),JSON.stringify(result,null,2));
      console.log(JSON.stringify(result,null,2));
      return;
    }
    await page.locator('[data-reading-word]').filter({hasText:/^bank$/}).first().click();
    assert.equal(await page.locator('[data-word-help-card]').count(), 0);
    assert.deepEqual(await page.evaluate(()=>window.calls.lookup), ['bank']);
    const opener = page.locator('[data-prepared-word-help]').first();
    await opener.focus(); await page.keyboard.press('Enter');
    await page.locator('[data-word-help-card]').waitFor();
    assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-word-help-card')), true);
    assert.equal((await page.evaluate(()=>window.calls.speak)).length, 0);
    await page.keyboard.press('Escape');
    assert.equal(await opener.evaluate(node=>document.activeElement===node), true);
    await page.keyboard.press('Space'); await page.locator('[data-word-help-card]').waitFor();
    results.push('Exact formatted occurrence; keyboard Enter/Space; Escape focus return; no sentence playback');
    await page.locator('[data-word-help-card-listen]').click();
    const ownId = await page.evaluate(()=>window.calls.speak.at(-1)[1]);
    await page.getByRole('button', {name:'Close',exact:true}).click();
    assert.equal(await page.evaluate(id=>window.calls.stop.includes(id), ownId), true);
    results.push('Closing stops the actual card-owned audio ID');
    await page.evaluate(()=>window.mount({compare:true, data:'The heron rests.', quote:'heron'}));
    await page.locator('[data-compare-version="adapted"] [data-prepared-word-help]').click();
    await page.getByRole('checkbox',{name:'Show changes',exact:true}).check();
    assert.equal(await page.locator('[data-word-help-card]').count(),0);
    results.push('Comparison change view dismisses an open card');
    await page.evaluate(()=>window.mount({multiple:true, data:'The heron rests.', quote:'heron'}));
    await page.waitForFunction(()=>document.querySelectorAll('[data-adapted-reader]').length===2);
    const readers = page.locator('[data-adapted-reader]');
    const listIds = await page.locator('[data-adapted-word-help]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-labelledby')));
    assert.equal(new Set(listIds).size,2);
    assert.equal(await page.locator('[data-prepared-word-help][aria-controls]').count(),0);
    await readers.nth(0).locator('[data-adapted-word-help-spot]').click();
    await readers.nth(1).locator('[data-adapted-word-help-spot]').click();
    await page.evaluate(()=>{window.lastSpotlight=CSS.highlights.get('allo-word-help-focus');window.hideFirstReader();});
    await page.waitForFunction(()=>document.querySelectorAll('[data-adapted-reader]').length===1);
    assert.equal(await page.evaluate(()=>CSS.highlights.get('allo-word-help-focus')===window.lastSpotlight),true);
    const listed = page.locator('[data-prepared-help-open]');
    await listed.focus(); await page.keyboard.press('Enter');
    await page.locator('[data-word-help-card]').waitFor();
    assert.equal(await listed.getAttribute('aria-expanded'),'true');
    assert.equal(await listed.getAttribute('aria-controls'),await page.locator('[data-word-help-card]').getAttribute('id'));
    await page.keyboard.press('Escape');
    assert.equal(await listed.evaluate(node=>node===document.activeElement),true);
    assert.equal(await listed.getAttribute('aria-controls'),null);
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const listAccessibility = await page.evaluate(async()=>axe.run(document.querySelector('[data-adapted-word-help]'), {runOnly:{type:'rule',values:['aria-valid-attr-value','aria-allowed-attr','button-name','nested-interactive']}}));
    assert.deepEqual(listAccessibility.violations.map(v=>v.id),[]);
    results.push('Same-item readers keep distinct heading IDs and spotlight ownership; list keyboard/popup references remain valid');
    await page.evaluate(()=>window.mount({pendingAudio:true, data:'The heron rests.', quote:'heron'}));
    await page.locator('[data-prepared-word-help]').click();
    await page.locator('[data-word-help-card-hear]').click();
    const pendingId = await page.evaluate(()=>window.calls.speak.at(-1)[1]);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    assert.equal(await page.evaluate(id=>window.calls.stop.includes(id),pendingId),true);
    results.push('Closing cancels owned pending audio while the host still reports isPlaying false');
    const phone = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    await phone.addInitScript(()=>Object.defineProperty(window,'Highlight',{value:undefined,configurable:true}));
    const touch = await phone.newPage(); touch.on('pageerror', error=>errors.push(error.message));
    await touch.goto(url); await touch.locator('[data-prepared-word-help]').first().waitFor();
    await touch.locator('[data-prepared-word-help]').first().tap();
    assert.equal(await touch.locator('[data-word-help-card]').count(),1);
    assert.deepEqual(await touch.evaluate(()=>window.calls.lookup),[]);
    assert.deepEqual(await touch.evaluate(()=>window.calls.speak),[]);
    await touch.getByRole('button',{name:'Close',exact:true}).tap();
    await touch.locator('[data-adapted-word-help-spot]').tap();
    assert.match(await touch.locator('[data-adapted-word-help-spot-notice]').innerText(),/Located/);
    assert.doesNotMatch(await touch.locator('[data-adapted-word-help-tip]').innerText(),/underlined/i);
    await touch.locator('[data-prepared-help-open]').tap();
    await touch.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const accessibility = await touch.evaluate(async()=>axe.run(document.querySelector('[data-word-help-card]'), {runOnly:{type:'rule',values:['aria-valid-attr-value','aria-allowed-attr','button-name','nested-interactive']}}));
    assert.deepEqual(accessibility.violations.map(v=>v.id),[]);
    await touch.screenshot({path:path.join(out,'prepared-help-phone.png'),fullPage:true});
    results.push('Touch opens one card without lookup/audio; truthful no-Highlights fallback; card ARIA/control checks');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:results,errors,limitations:'Local fixture uses host callback spies and minimal layout CSS; no live provider pronunciation or full-app visual claim.'},null,2));
    console.log(JSON.stringify({passed:results.length,results,errors},null,2));
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
