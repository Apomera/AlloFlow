// Disposable, local-only fixture. Host audio/lookup callbacks are recorded;
// this checks interaction ownership, not a provider's pronunciation quality.
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const playwright = require('playwright');
const esbuild = require('esbuild');
const root = process.cwd(), out = process.env.PREPARED_HELP_OUTPUT_DIR || path.join(root,'reports/reader-prepared-help');
fs.mkdirSync(out,{recursive:true});
const inputRoot = process.env.PREPARED_HELP_SOURCE_DIR || root;
const previewProbe = process.argv.includes('--preview-probe');
const layoutProbe = process.argv.includes('--layout-probe');
const cardProbe = process.argv.includes('--card-stress');
const activationProbe = process.argv.includes('--activation-probe');
const browserName = process.env.PREPARED_HELP_BROWSER || 'chromium';
const styleRoot = process.env.PREPARED_HELP_STYLE_DIR || inputRoot;
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
  window.__alloT = key=>scenario.labels?.[key] || key;
  window.calls = {speak: [], lookup: [], lookupContexts: [], stop: []};
  const data = scenario.data || 'A bank **account**. A bank account.';
  const quote = scenario.quote || 'bank account';
  const language = scenario.language || 'English';
  const item = {id:'browser-prepared', type:'simplified', data, config:{language}, instructionalText:{form:'adapted',role:'supplemental'}, sourceSnapshot:contract.createSourceSnapshot('The bank holds an account.', {language})};
  let help = contract.upsertAdaptedReadingSupport(item, null, {id:'browser-help', start:scenario.start ?? data.lastIndexOf(quote), end:(scenario.start ?? data.lastIndexOf(quote))+quote.length, quote, text:scenario.explanation || 'The explanation for this exact occurrence.', image:scenario.image || (scenario.picture ? {src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5m8AAAAASUVORK5CYII=',alt:'A sample illustration'} : undefined)});
  for(const [index, extra] of (scenario.additionalHelp || []).entries()) help=contract.upsertAdaptedReadingSupport(item,help,{id:'extra-'+index,...extra});
  item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, help, true);
  window.fixtureItem = item;
  function Host() {
    const [playing, setPlaying] = React.useState(null);
    const [mode, setMode] = React.useState(scenario.mode || 'define');
    const [firstReader, setFirstReader] = React.useState(true);
    const [learner, setLearner] = React.useState('learner-a');
    const [, setRevision] = React.useState(0);
    window.hideFirstReader = () => setFirstReader(false);
    window.changeFixtureLearner = () => setLearner('learner-b');
    window.changeFixtureForm = form => { item.instructionalText.form=form; setRevision(value=>value+1); };
    window.changeFixtureSupport = change => {
      if(change==='hide') item.adaptedReadingSupports.shown=false;
      if(change==='remove') item.adaptedReadingSupports.annotations.length=0;
      if(change==='revise') item.adaptedReadingSupports.annotations[0].text='The revised prepared explanation.';
      setRevision(value=>value+1);
    };
    const props = {
      ComplexityGauge:()=>null, t:k=>scenario.labels?.[k] || k, inputText:'', gradeLevel:'5', leveledTextLanguage:language, selectedVoice:'Kore', voiceSpeed:1,
      isSideBySide:!!scenario.sideBySide,
      studentInterests:[], isTeacherMode:!!scenario.teacher, isZenMode:!scenario.teacher, interactionMode:mode, isCompareMode:!!scenario.compare,
      history:[item], generatedContent:item, readingLearnerKey:learner, textEditorRef:React.createRef(), playbackState:{currentIdx:-1}, cursorStyles:{}, latestGlossary:[],
      isPlaying:!!playing && !scenario.pendingAudio, playingContentId:playing,
      setComplexityLevel:noop, setSaveOriginalOnAdjust:noop, setReadingTheme:noop, setSelectionMenu:noop, setIsCustomReviseOpen:noop,
      setInteractionMode:setMode, setIsCompareMode:noop, setIsFluencyMode:noop, setFocusedParagraphIndex:noop,
      handleToggleIsEditingLeveledText:noop, handleFormatText:noop, handleSimplifiedTextChange:noop, handleTextMouseUp:noop,
      closeDefinition:noop, closePhonics:noop, closeRevision:noop, handleQuickAddGlossary:noop, handlePhonicsClick:noop,
      handleSpeak:(...args)=>{window.calls.speak.push(args);setPlaying(args[1]);},
      stopPlayback:()=>{window.calls.stop.push(playing);setPlaying(null);},
      handleWordClick:(word,event,context)=>{window.calls.lookup.push(word);window.calls.lookupContexts.push(context);}, callTTS:noop,
      splitTextToSentences:text=>pure.splitTextToSentences(text, {}), getSideBySideContent:text=>{
        const parts=text.split('--- ENGLISH TRANSLATION ---');
        return parts.length<2 ? null : {source:parts[0].trim().split(/\\n{2,}/),target:parts[1].trim().split(/\\n{2,}/),sourceFull:parts[0].trim(),targetFull:parts[1].trim()};
      },
      getContentDirection:language=>/^(Arabic|Hebrew)$/.test(language)?'rtl':'ltr', isRtlLang:language=>/^(Arabic|Hebrew)$/.test(language), renderFormattedText:text=>React.createElement('div',null,text),
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
  let css='body{font:16px system-ui;margin:16px}button{min-height:44px;margin:3px}button,[role=button]{cursor:pointer}.fixed{position:fixed}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}[data-word-help-card]{z-index:100;background:white;border:2px solid #6366f1;border-radius:12px;padding:16px;box-sizing:border-box}a{color:#3730a3}[data-prepared-word-help]{text-decoration:underline dotted}*:focus-visible{outline:3px solid #4338ca}#app{max-width:900px}details{margin-block:8px}';
  if(layoutProbe || cardProbe || process.env.PREPARED_HELP_STYLE_DIR) {
    const desktop=path.join(styleRoot,'desktop/web-app');
    const tailwind=require(require.resolve('tailwindcss',{paths:[desktop]}));
    const config=require(path.join(desktop,'tailwind.config.js'));
    css=(await require('postcss')([tailwind({...config,content:[{raw:fs.readFileSync(path.join(inputRoot,'view_simplified_source.jsx'),'utf8'),extension:'jsx'}]})]).process(fs.readFileSync(path.join(desktop,'src/index.css'),'utf8'),{from:undefined})).css;
    css+='\n#app{padding:16px;max-width:900px;margin:auto}';
  }
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prepared help fixture</title><style>'+css+'</style><div id="app"></div><script src="/fixture.js"></script></html>';
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/fixture.js' ? 'text/javascript' : 'text/html'); res.end(req.url === '/fixture.js' ? bundle.outputFiles[0].contents : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await playwright[browserName].launch({ headless: true });
  const url = 'http://127.0.0.1:' + server.address().port;
  const results = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url); await page.locator('[data-prepared-word-help]').first().waitFor();
    if(activationProbe) {
      await require('./activation-check.cjs')({page,errors,out,browserName});
      return;
    }
    if(cardProbe) {
      await require('./card-stress.cjs')({browser,page,url,errors,out,browserName,inputRoot});
      return;
    }
    if(layoutProbe) {
      const measurements=[];
      for(const width of [320,390,768]) for(const enlarged of [false,true]) {
        await page.setViewportSize({width,height:900});
        await page.evaluate(({enlarged})=>{
          document.documentElement.style.fontSize=enlarged?'32px':'16px';
          window.mount({data:'La garza descansa.',quote:'garza',language:'Spanish',picture:true,
            explanation:'Un ave de patas largas que vive cerca del agua y busca alimento con cuidado.',
            labels:{'simplified.word_help_open_help':'Abrir explicación preparada','simplified.word_help_prepared_for':'Ayuda preparada: {word}','simplified.word_help_show_in_text':'Mostrar esta palabra en el texto','simplified.word_help_show_word_in_text':'Mostrar esta palabra en el texto: {word}'}});
        },{enlarged});
        const list=page.locator('[data-adapted-word-help]'); await list.waitFor();
        await list.scrollIntoViewIfNeeded();
        const metrics=await list.evaluate(node=>{
          const text=node.querySelector('[data-adapted-word-help-text]'), buttons=[...node.querySelectorAll('[data-prepared-help-open],[data-adapted-word-help-spot]')];
          const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
          return {list:rect(node),text:rect(text),buttons:buttons.map(rect),overflow:node.scrollWidth>node.clientWidth+1,picture:!!node.querySelector('img'),names:buttons.map(b=>({visible:b.textContent.trim(),accessible:b.getAttribute('aria-label')}))};
        });
        measurements.push({width,enlarged,...metrics});
        for(const name of metrics.names) assert.ok(name.accessible.includes(name.visible),'Accessible control name includes its visible translated label');
        assert.equal(await list.getByRole('button',{name:'Abrir explicación preparada: Ayuda preparada: garza',exact:true}).count(),1);
        if(width===320&&enlarged) await list.screenshot({path:path.join(out,'prepared-help-320-large.png')});
      }
      fs.writeFileSync(path.join(out,'layout-results.json'),JSON.stringify({measurements,errors,styling:'App Tailwind config and index.css, compiled against reader source; host shell excluded.'},null,2));
      const textFailures=measurements.filter(m=>m.overflow||m.text.width<120||m.buttons.some(b=>b.left<m.list.left||b.right>m.list.right||b.height<44));
      console.log(JSON.stringify({measurements,errors,failures:textFailures.length},null,2));
      assert.equal(textFailures.length,0,'Prepared list must keep readable text and contained controls');
      assert.deepEqual(errors,[]); return;
    }
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
      await preview.getByRole('button',{name:'Word meaning',exact:true}).click();
      await previewList.locator('[data-prepared-help-open]').click();
      await preview.locator('[data-word-help-card]').waitFor();
      assert.equal(await preview.locator('[data-word-help-card-hear]').isDisabled(),true);
      assert.equal(await preview.locator('[data-word-help-card-more]').count(),0);
      assert.deepEqual(await page.evaluate(()=>window.calls.lookup),[]);
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
      const result={passed:true,inputRoot,readerSha256:require('crypto').createHash('sha256').update(fs.readFileSync(path.join(inputRoot,'view_simplified_source.jsx'))).digest('hex'),checks:['preview is outside the teacher reader','background is inert and aria-hidden','preview spotlight remains in preview','preview audio remains disabled','preview has no More control or lookup capability in Word meaning mode','card Escape keeps preview open and returns focus','second Escape closes preview','teacher spotlight and All word help stay in teacher reader after preview closes'],errors};
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
    await opener.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-word-help-card')),true);
    results.push('Reactivating the same keyboard trigger returns focus to the prepared card');
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
    const listAccessibility = await page.evaluate(async()=>axe.run(document.querySelector('[data-adapted-word-help]'), {runOnly:{type:'rule',values:['aria-valid-attr-value','aria-allowed-attr','button-name','nested-interactive','label-content-name-mismatch']}}));
    assert.deepEqual(listAccessibility.violations.map(v=>v.id),[]);
    results.push('Same-item readers keep distinct heading IDs and spotlight ownership; list keyboard/popup references remain valid');
    await page.evaluate(()=>window.mount({pendingAudio:true, data:'The heron rests.', quote:'heron'}));
    await page.locator('[data-prepared-word-help]').click();
    await page.locator('[data-word-help-card-hear]').click();
    const pendingId = await page.evaluate(()=>window.calls.speak.at(-1)[1]);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    assert.equal(await page.evaluate(id=>window.calls.stop.includes(id),pendingId),true);
    results.push('Closing cancels owned pending audio while the host still reports isPlaying false');
    for(const control of ['hear','listen']) {
      await page.evaluate(()=>window.mount({pendingAudio:true,data:'The heron rests.',quote:'heron'}));
      await page.locator('[data-prepared-word-help]').click();
      const button=page.locator('[data-word-help-card-'+control+']');
      await button.click();
      const owned=await page.evaluate(()=>window.calls.speak.at(-1)[1]);
      assert.equal(await button.innerText(),'Stop');
      await button.click();
      assert.equal(await page.evaluate(()=>window.calls.speak.length),1);
      assert.equal(await page.evaluate(id=>window.calls.stop.includes(id),owned),true);
    }
    results.push('Both pending pronunciation controls stop the request on a second activation without requesting speech twice');
    for(const change of ['hide','remove','revise']) {
      await page.evaluate(()=>window.mount({pendingAudio:true,data:'The heron rests.',quote:'heron'}));
      await page.locator('[data-prepared-word-help]').click();
      await page.locator('[data-word-help-card-listen]').click();
      const owned=await page.evaluate(()=>window.calls.speak.at(-1)[1]);
      await page.evaluate(value=>window.changeFixtureSupport(value),change);
      await page.locator('[data-word-help-card]').waitFor({state:'detached'});
      // Invalidation hides the card during render; its cleanup effect follows.
      await page.waitForFunction(id=>window.calls.stop.includes(id),owned,{timeout:1000});
      assert.equal(await page.evaluate(id=>window.calls.stop.includes(id),owned),true);
      if(change==='revise') {
        await page.locator('[data-prepared-word-help]').click();
        assert.equal(await page.locator('[data-word-help-card-text]').innerText(),'The revised prepared explanation.');
      } else assert.equal(await page.locator('[data-prepared-word-help], [data-prepared-help-open]').count(),0);
      assert.deepEqual(await page.evaluate(()=>window.calls.lookup),[]);
    }
    results.push('In-place hiding, removal and revised explanations invalidate cards and owned pending audio; reopening uses current prepared text');
    await page.evaluate(()=>window.mount({pendingAudio:true,data:'The heron rests.',quote:'heron'}));
    await page.locator('[data-prepared-word-help]').click();
    await page.locator('[data-word-help-card-hear]').click();
    const learnerOwned=await page.evaluate(()=>window.calls.speak.at(-1)[1]);
    await page.evaluate(()=>window.changeFixtureLearner());
    await page.locator('[data-word-help-card]').waitFor({state:'detached'});
    // Invalidation hides the card during render; its cleanup effect follows.
    await page.waitForFunction(id=>window.calls.stop.includes(id),learnerOwned,{timeout:1000});
    assert.equal(await page.evaluate(id=>window.calls.stop.includes(id),learnerOwned),true);
    await page.locator('[data-prepared-help-open]').click();
    await page.locator('[data-word-help-card]').waitFor();
    assert.deepEqual(await page.evaluate(()=>window.calls.lookup),[]);
    results.push('Learner changes dismiss the previous card and stop its audio; current learner can reopen prepared help');
    await page.evaluate(()=>window.mount({language:'Spanish',sideBySide:true,
      data:'La radio suena.\n\nLa radio calla.\n\n--- ENGLISH TRANSLATION ---\n\nThe radio plays.\n\nThe radio stops.',quote:'suena.\n\nLa radio'}));
    await page.locator('[data-prepared-word-help]').first().waitFor();
    const preparedRanges = name=>page.evaluate(name=>[...CSS.highlights.get(name)].map(range=>({
      text:range.toString(),
      language:range.startContainer.parentElement.closest('[data-reading-language]').getAttribute('data-reading-language'),
      singleNode:range.startContainer===range.endContainer
    })),name);
    for(const name of ['allo-word-help','allo-word-help-focus']) {
      if(name.endsWith('-focus')) await page.locator('[data-adapted-word-help-spot]').click();
      const ranges=await preparedRanges(name);
      assert.equal(ranges.map(range=>range.text).join(''),'suena.La radio');
      assert.equal(ranges.every(range=>range.language==='Spanish'&&range.singleNode),true);
    }
    await page.locator('[data-prepared-word-help]').last().click();
    assert.equal(await page.locator('[data-word-help-card] h5').textContent(),'suena.\n\nLa radio');
    assert.deepEqual(await page.evaluate(()=>window.calls.lookup),[]);
    assert.deepEqual(await page.evaluate(()=>window.calls.speak),[]);
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.locator('[data-reading-language="English"] [data-reading-word]').filter({hasText:/^radio$/}).first().click();
    assert.equal(await page.locator('[data-word-help-card]').count(),0);
    assert.deepEqual(await page.evaluate(()=>window.calls.lookup),['radio']);
    results.push('Cross-paragraph prepared phrase underlines and spotlight contain only matched source text; translated words do not open that support');
    for(const fromList of [false,true]) {
      await page.evaluate(()=>window.mount());
      const trigger=fromList ? page.locator('[data-prepared-help-open]') : page.locator('[data-prepared-word-help]').last();
      await trigger.focus(); await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(()=>window.calls.lookup),[]);
      await page.locator('[data-word-help-card-more]').click();
      const context=await page.evaluate(()=>window.calls.lookupContexts.at(-1));
      assert.equal(context.passageText,'A bank **account**. A bank account.');
      assert.equal(context.selectionStart,context.passageText.lastIndexOf('bank account'));
      assert.equal(context.passageText.slice(context.selectionStart,context.selectionEnd),'bank account');
      assert.deepEqual(await page.evaluate(()=>window.calls.lookup),['bank account']);
      assert.deepEqual(await page.evaluate(()=>window.calls.speak),[]);
    }
    results.push('More help preserves exact phrase and source context from the last inline word and the keyboard-accessible list');
    await page.evaluate(()=>window.mount({mode:'read',data:'The heron rests.',quote:'heron'}));
    await page.locator('[data-prepared-help-open]').click();
    assert.equal(await page.locator('[data-word-help-card-more]').count(),0);
    assert.equal(await page.locator('[data-word-help-card-text]').innerText(),'The explanation for this exact occurrence.');
    assert.deepEqual(await page.evaluate(()=>window.calls.lookup),[]);
    results.push('Prepared help stays available in Read mode without offering a lookup action the host ignores');
    for(const form of ['original','same-text-supported']) {
      await page.evaluate(()=>window.mount({pendingAudio:true,data:'The heron rests.',quote:'heron'}));
      await page.locator('[data-adapted-word-help-spot]').click();
      await page.locator('[data-prepared-word-help]').click();
      await page.locator('[data-word-help-card-listen]').click();
      const owned=await page.evaluate(()=>window.calls.speak.at(-1)[1]);
      await page.evaluate(form=>window.changeFixtureForm(form),form);
      await page.locator('[data-word-help-card]').waitFor({state:'detached'});
      assert.equal(await page.locator('[data-prepared-word-help], [data-prepared-help-open]').count(),0);
      await page.waitForFunction(id=>window.calls.stop.includes(id),owned,{timeout:1000});
      assert.equal(await page.evaluate(id=>window.calls.stop.filter(stopped=>stopped===id).length,owned),1);
      assert.equal(await page.evaluate(()=>CSS.highlights.has('allo-word-help')||CSS.highlights.has('allo-word-help-focus')),false);
      await page.evaluate(()=>window.changeFixtureForm('adapted'));
      await page.locator('[data-prepared-word-help]').waitFor();
      assert.equal(await page.locator('[data-word-help-card]').count(),0);
      assert.equal(await page.evaluate(()=>window.calls.speak.length),1);
      await page.locator('[data-prepared-word-help]').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('[data-word-help-card-text]').innerText(),'The explanation for this exact occurrence.');
      assert.deepEqual(await page.evaluate(()=>window.calls.lookup),[]);
    }
    results.push('Changing adapted text to an original removes its card, labels and highlights and cancels owned pending audio; restoring adapted text requires a fresh activation');
    await page.evaluate(()=>window.mount({data:'The heron rests.',quote:'heron'}));
    await page.locator('[data-prepared-word-help]').waitFor();
    await page.evaluate(()=>window.changeFixtureForm('original'));
    await page.locator('[data-prepared-word-help]').waitFor({state:'detached'});
    const ordinaryWord=page.locator('[data-reading-word]').filter({hasText:/^heron$/});
    assert.equal(await ordinaryWord.getAttribute('data-prepared-word-help'),null);
    assert.equal(await ordinaryWord.getAttribute('aria-haspopup'),null);
    assert.doesNotMatch(await ordinaryWord.getAttribute('aria-label'),/Prepared word help/);
    await ordinaryWord.click();
    assert.deepEqual(await page.evaluate(()=>window.calls.lookup),['heron']);
    assert.equal(await page.locator('[data-word-help-card]').count(),0);
    results.push('Validation changes remove obsolete prepared labels even when no help card was open');
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
    await touch.evaluate(()=>window.mount({teacher:true,data:'The heron rests.',quote:'heron'}));
    await touch.locator('[data-student-preview-open]').tap();
    const fallbackPreview=touch.locator('[data-student-preview]');
    await fallbackPreview.getByRole('button',{name:'Word meaning',exact:true}).tap();
    const previewStatus=await fallbackPreview.locator('[data-reading-mode-status]').innerText();
    assert.doesNotMatch(previewStatus,/underlined/i);
    assert.match(previewStatus,/Word help after the passage/);
    await fallbackPreview.getByRole('button',{name:'Open help: Prepared word help: heron',exact:true}).tap();
    assert.equal(await fallbackPreview.locator('[data-word-help-card]').count(),1);
    assert.deepEqual(await touch.evaluate(()=>window.calls.lookup),[]);
    results.push('No-Highlights preview gives truthful instructions and opens prepared help by its visible accessible action name');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:results,errors,styling:process.env.PREPARED_HELP_STYLE_DIR?'App Tailwind config and index.css, compiled against reader source; host shell excluded.':'Minimal fixture CSS.',limitations:'Local fixture uses host callback spies; no live provider pronunciation, actual assistive-technology, or full-app visual claim.'},null,2));
    console.log(JSON.stringify({passed:results.length,results,errors},null,2));
  } catch(error) {
    fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({browser:browserName,completed:results,errors,error:error.message,stack:error.stack},null,2)+'\n');
    throw error;
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
