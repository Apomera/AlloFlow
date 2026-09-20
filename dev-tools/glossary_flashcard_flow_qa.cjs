const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const assert = require('node:assert/strict');
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/glossary-flashcard-flow');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const config = { ...req('./tailwind.config.js'), content: [path.join(ROOT, 'view_glossary_source.jsx'), path.join(ROOT, 'glossary_image_controls_source.jsx')] };
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const runtime = esbuild.buildSync({ stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;", resolveDir: path.join(ROOT, 'desktop/web-app') }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  const assets = { '/runtime.js': runtime, '/styles.css': css, '/view.js': fs.readFileSync(path.join(ROOT, 'view_glossary_module.js')), '/host.js': fs.readFileSync(path.join(ROOT, 'host_handlers_module.js')), '/export.js': fs.readFileSync(path.join(ROOT, 'export_module.js')), '/helpers.js': fs.readFileSync(path.join(ROOT, 'glossary_helpers_module.js')), '/fixture.js': 'window.glossaryMediaProps=' + glossaryMediaProps.toString() + ';window.translations=' + fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8') };
  const server = http.createServer((request, response) => {
    if (assets[request.url]) { response.setHeader('Content-Type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(assets[request.url]); return; }
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/host.js"></script><script src="/export.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], evidence = { service: process.argv.includes('--live') ? 'live' : 'fixture' };
  try {
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      const initial = window.glossaryMediaProps();
      const data = ['Photosynthesis', 'Root', 'Seed'].map((term,index) => ({ ...initial.generatedContent.data[0], entryId: 'card-'+index, term, imageAlt: 'A green leaf with branching veins.', def: ('Plants capture light and use water and carbon dioxide to make sugars. ').repeat(5), translations: { French: term + ': ' + ('Les plantes utilisent la lumière pour fabriquer des sucres. ').repeat(5) } }));
      const t = key => { const value = key.split('.').reduce((obj, part) => obj && obj[part], window.translations); return typeof value === 'string' ? value : key; };
      function App() {
        const [state,set] = React.useState({ isInteractiveFlashcards:true,flashcardIndex:0,isFlashcardFlipped:false,flashcardMode:'standard',standardDeckLang:'English Only',flashcardLang:'French',isFlashcardQuizMode:false,flashcardScore:0,quizSelectedOption:null,flashcardFeedback:null,showFlashcardImages:true });
        window.setDeck = patch => set(prev => ({...prev,...patch})); window.deckState=state;
        const props = window.glossaryMediaProps({ ...state, t, generatedContent:{...initial.generatedContent,data}, flashcardOptions:[data[state.flashcardIndex].def,'Wrong answer'],flashcardCorrectAnswer:item=>item.def, closeInteractiveFlashcards:()=>set(prev=>({...prev,isInteractiveFlashcards:false})) });
        for(const name of ['FlashcardIndex','IsFlashcardFlipped','IsFlashcardQuizMode','FlashcardScore','FlashcardFeedback','QuizSelectedOption','StandardDeckLang','FlashcardLang']){const key=name[0].toLowerCase()+name.slice(1);props['set'+name]=value=>set(prev=>({...prev,[key]:typeof value==='function'?value(prev[key]):value}));}
        props.setFlashcardOptions=()=>{}; props.handleToggleIsFlashcardFlipped=()=>set(prev=>({...prev,isFlashcardFlipped:!prev.isFlashcardFlipped}));props.handleToggleShowFlashcardImages=()=>set(prev=>({...prev,showFlashcardImages:!prev.showFlashcardImages}));
        props.handleQuizOptionClick=window.AlloModules.createHostHandlers({...props,playSound(){},handleScoreUpdate(){}}).handleQuizOptionClick;
        window.exportDeck = mode => window.AlloModules.createExport({liveRef:{current:props},escapeXml:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}).handleExportFlashcards(mode);
        return React.createElement(window.AlloModules.GlossaryView,props);
      }
      window.createRoot(document.getElementById('root')).render(React.createElement(App));
    });
    await page.locator('[data-flashcard-body]').waitFor();
    evidence.layouts=[];
    for(const width of [320,390,1280]) {
      await page.setViewportSize({width,height:900});
      for(const mode of ['standard','language']) {
        await page.evaluate(mode=>window.setDeck({flashcardMode:mode,isFlashcardFlipped:false}),mode);
        await page.locator('[data-flashcard-face="front"] img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
        for(const face of ['front','back']) {
          await page.evaluate(face=>window.setDeck({isFlashcardFlipped:face==='back'}),face);
          const panel=page.locator('[data-flashcard-face="'+face+'"]');await panel.waitFor({state:'visible'});
          const layout=await panel.evaluate(el=>{const r=el.getBoundingClientRect(),dialog=el.closest('[role=dialog]');return {left:r.left,right:r.right,width:innerWidth,scroll:el.scrollWidth,client:el.clientWidth,dialogScroll:dialog.scrollWidth,dialogClient:dialog.clientWidth,height:r.height,clamped:[...el.querySelectorAll('p,span')].some(n=>getComputedStyle(n).webkitLineClamp!=='none'&&getComputedStyle(n).webkitLineClamp!=='')};});
          evidence.layouts.push({width,mode,face,...layout});
          assert.ok(layout.left>=0&&layout.right<=width&&layout.scroll<=layout.client&&layout.dialogScroll<=layout.dialogClient&&!layout.clamped,JSON.stringify(evidence.layouts.at(-1)));
          await page.screenshot({path:path.join(OUT,mode+'-'+face+'-'+width+'.png')});
        }
      }
    }
    await page.setViewportSize({width:320,height:900});
    await page.evaluate(()=>window.setDeck({flashcardMode:'standard',isFlashcardFlipped:false,flashcardIndex:2}));
    await page.locator('[data-help-key="flashcard_next"]').click();
    await page.locator('[data-flashcard-summary]').waitFor();
    assert.equal(await page.locator('[data-flashcard-summary] h2').evaluate(el=>el===document.activeElement),true);
    await page.screenshot({path:path.join(OUT,'summary-320.png')});
    const sum=await page.locator('[data-flashcard-summary]').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));assert.ok(sum.scroll<=sum.client);evidence.summary=sum;
    await page.getByRole('button',{name:'Review cards needing practice (3)',exact:true}).click();
    await page.waitForFunction(()=>window.deckState.flashcardIndex===0);
    // Only the displayed face may contribute keyboard stops.
    const hiddenFace=page.locator('[data-flashcard-face="back"]');assert.equal(await hiddenFace.isVisible(),false);
    await page.getByRole('button',{name:'Hide Images',exact:true}).click();
    assert.equal(await page.locator('[data-flashcard-face="front"] img').count(),0);evidence.hideImages=true;
    for(const mode of ['standard','language']) {
      const downloadPromise=page.waitForEvent('download');await page.evaluate(mode=>window.exportDeck(mode),mode);const download=await downloadPromise;await download.saveAs(path.join(OUT,'flashcards-'+mode+'.html'));
      const exported=fs.readFileSync(path.join(OUT,'flashcards-'+mode+'.html'),'utf8');assert.equal((exported.match(/<img /g)||[]).length,3);assert.ok(exported.includes('alt="A green leaf with branching veins."'));
    }
    evidence.downloads='standard and language include all images and saved alt text';
    const preview=await browser.newPage({viewport:{width:1000,height:900}});
    for(const mode of ['standard','language']) {
      await preview.setContent(fs.readFileSync(path.join(OUT,'flashcards-'+mode+'.html'),'utf8'));
      await preview.emulateMedia({media:'print'});
      assert.equal(await preview.locator('img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth>0).length),3);
      await preview.screenshot({path:path.join(OUT,'download-'+mode+'.png'),fullPage:true});
    }
    await preview.close();
    await page.keyboard.press('Escape');assert.equal(await page.locator('[role=dialog]').count(),0);
    evidence.errors=errors;assert.deepEqual(errors,[]);console.log(JSON.stringify(evidence,null,2));
  } finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(evidence,null,2));
    await browser.close();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
