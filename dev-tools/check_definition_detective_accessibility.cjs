// Browser QA with production React, Tailwind, app styles and translations.
// Run: node dev-tools/check_definition_detective_accessibility.cjs
const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/definition-detective-accessibility');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const config = {...req('./tailwind.config.js'), content:[path.join(ROOT,'games_source.jsx'), path.join(ROOT,'view_glossary_source.jsx')]};
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', {from:undefined})).css;
  const runtime = esbuild.buildSync({stdin:{contents:"import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;",resolveDir:path.join(ROOT,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
  const translations = JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8'));
  const bootstrap = 'window.translations='+JSON.stringify(translations)+';\n'+
    "window.t=(key,vars={})=>{let value=key.split('.').reduce((o,k)=>o&&o[k],translations);if(typeof value!=='string')return key;return value.replace(/\\{(\\w+)\\}/g,(m,k)=>vars[k]??m);}; window.AlloLanguageContext=React.createContext({t}); window.AlloModules={}; window.fisherYatesShuffle=a=>a.slice().reverse(); window.getGlobalAudioContext=()=>null;";
  const mount = "window.renderGame = (name, overrides={}) => {\n  if(window.gameRoot) window.gameRoot.unmount();\n  window.gameRoot=createRoot(document.querySelector('#game')); window.events=[];\n  const noop=()=>{};\n  const data=[\n    {term:'Photosynthesis',def:'The process by which plants use sunlight, water, and carbon dioxide to make food and release oxygen.'},\n    {term:'Evaporation',def:'The change from liquid water to water vapor when it gains heat energy.'},\n    {term:'Condensation',def:'The change from a gas into a liquid as it cools.'},\n    {term:'Precipitation',def:'Water that falls from clouds as rain, snow, sleet, or hail.'},\n    {term:'Ecosystem',def:'A community of living things interacting with each other and their physical environment.'}\n  ];\n  window.__qaGlossaryData=data; const props={data,text:'Plants use sunlight to make their own food. Water vapor rises into the atmosphere.',onClose:()=>events.push('close'),playSound:noop,onScoreUpdate:(...args)=>events.push(args),onGameComplete:(...args)=>events.push(args),settings:{cardCount:1,includeImages:true},setSettings:noop,bingoState:{cards:[]},setBingoState:noop,onGenerate:noop,...overrides};\n  if(name==='BingoGame') props.bingoState={cards:[Array.from({length:25},(_,i)=>i===12?{type:'free',term:'FREE SPACE'}:{...data[i%data.length],type:'term'})]};\n  gameRoot.render(React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),React.createElement(AlloModules[name],props)));\n};";
  const assets = {'/runtime.js':runtime, '/bootstrap.js':bootstrap, '/games.js':fs.readFileSync(path.join(ROOT,'games_module.js'),'utf8'),'/styles.js':fs.readFileSync(path.join(ROOT,'app_styles_module.js'),'utf8'),'/mount.js':mount,'/styles.css':css};
  const server=http.createServer((request,response)=>{
    if(assets[request.url]) {response.setHeader('Content-Type',request.url.endsWith('.css')?'text/css':'text/javascript');response.end(assets[request.url]);return;}
    response.setHeader('Content-Type','text/html');response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Glossary games QA</title><link rel="stylesheet" href="/styles.css"></head><body class="theme-light"><main class="allo-docsuite" id="game"></main><script src="/runtime.js"></script><script src="/bootstrap.js"></script><script src="/styles.js"></script><script src="/games.js"></script><script src="/mount.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser; const results=[], accessibility=[];
  const checkAccessibility=async(page,label)=>{
    const result=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[role="dialog"]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};});
    accessibility.push({label,...result});
    if(result.violations.length)throw Error(label+': '+JSON.stringify(result.violations));
  };
  try {
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:320,height:740}]) {
      await page.setViewportSize(viewport);
      for(const name of ['DefinitionDetectiveGame','MemoryGame','MatchingGame','CrosswordGame','SyntaxScramble','BingoGame','StudentBingoGame','WordScrambleGame']) {
        await page.evaluate(name=>renderGame(name),name);
        await page.waitForFunction(name=>document.body.textContent.length>100 && (name!=='WordScrambleGame'||document.querySelector('input')) && (name!=='DefinitionDetectiveGame'||document.querySelector('#detective-clue')),name);
        await page.screenshot({path:path.join(OUT,name+'-'+viewport.width+'.png')});
        const metrics=await page.evaluate(()=>({
          width:innerWidth, bodyWidth:document.documentElement.scrollWidth,
          dialogs:[...document.querySelectorAll('[role="dialog"]')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),
          focus:document.activeElement?.getAttribute('aria-label')
        }));
        results.push({name,viewport,metrics});
        if(metrics.bodyWidth>viewport.width+2) throw Error(name+' overflows the page at '+viewport.width);
        if(name==='DefinitionDetectiveGame') {
          await checkAccessibility(page,'question-'+viewport.width);
          await page.locator('[data-help-key="detective_not_sure"]').focus();
          await page.keyboard.press('Tab');
          if(await page.evaluate(()=>!document.activeElement.closest('[role="dialog"]')))throw Error('Tab escaped the dialog');
          await page.keyboard.press('Shift+Tab');
          if(await page.evaluate(()=>document.activeElement.getAttribute('data-help-key'))!=='detective_not_sure')throw Error('Reverse Tab did not wrap');
          await page.evaluate(()=>{
            const clue=document.querySelector('#detective-clue').textContent;
            const target=__qaGlossaryData.find(item=>item.def===clue).term;
            [...document.querySelectorAll('[data-help-key="detective_choice"]')].find(button=>button.textContent!==target).click();
          });
          await page.locator('[data-help-key="detective_next"]').waitFor();
          if(await page.evaluate(()=>document.activeElement.id)!=='detective-feedback-title')throw Error('Feedback focus lost');
          await checkAccessibility(page,'feedback-'+viewport.width);
          const feedbackVisible=await page.locator('#detective-feedback-meaning').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
          if(!feedbackVisible)throw Error('Feedback explanation is not visible at '+viewport.width);
          await page.screenshot({path:path.join(OUT,'DefinitionDetective-feedback-'+viewport.width+'.png')});
          await page.locator('[data-help-key="detective_next"]').click();
          for(let i=1;i<5;i++){
            await page.evaluate(()=>{const clue=document.querySelector('#detective-clue').textContent;const target=__qaGlossaryData.find(item=>item.def===clue).term;[...document.querySelectorAll('[data-help-key="detective_choice"]')].find(button=>button.textContent===target).click();});
            await page.locator('[data-help-key="detective_next"]').click();
          }
          await page.locator('#detective-summary-title').waitFor();
          await checkAccessibility(page,'review-'+viewport.width);
          await page.screenshot({path:path.join(OUT,'DefinitionDetective-review-'+viewport.width+'.png')});
          const completion=await page.evaluate(()=>events.filter(event=>event[0]==='definitionDetective'));
          if(completion.length!==1||completion[0][1].score!==40)throw Error('Incorrect Detective completion');
          await page.locator('[data-help-key="detective_practice_missed"]').click();
          await page.evaluate(()=>{const clue=document.querySelector('#detective-clue').textContent;const target=__qaGlossaryData.find(item=>item.def===clue).term;[...document.querySelectorAll('[data-help-key="detective_choice"]')].find(button=>button.textContent===target).click();});
          await page.locator('[data-help-key="detective_next"]').click();
          if(await page.evaluate(()=>events.filter(event=>event[0]==='definitionDetective').length)!==1)throw Error('Practice duplicated a completion');
        }
        if(name==='CrosswordGame') {
          const overlaps=await page.locator('[data-help-key="crossword_grid"] [role="row"]').evaluateAll(rows=>rows.some(row=>{const cells=[...row.children];return cells.some((cell,i)=>i>0 && Math.abs(cell.getBoundingClientRect().left-cells[i-1].getBoundingClientRect().left)<cells[i-1].getBoundingClientRect().width-0.5);}));
          if(overlaps) throw Error('Crossword cells overlap at '+viewport.width);
        }
        if(name==='BingoGame') {
          await page.locator('[data-help-key="bingo_launch_caller_btn"]').click();
          await page.locator('[data-help-key="bingo_next_clue"]').click();
          await page.screenshot({path:path.join(OUT,'BingoCaller-'+viewport.width+'.png')});
        }
        if(name==='StudentBingoGame') {
          await page.locator('[role="group"] button').first().click();
          await page.screenshot({path:path.join(OUT,'BingoMarked-'+viewport.width+'.png')});
        }
        if(name==='SyntaxScramble') {
          await page.locator('[data-help-key="syntax_pool_word"]').first().focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(()=>document.querySelectorAll('[data-help-key="syntax_dropped_word"]').length===1);
          await page.waitForFunction(()=>document.activeElement?.getAttribute('data-help-key')==='syntax_pool_word');
          await page.locator('[data-help-key="syntax_dropped_word"]').click();
        }
      }
    }
    await page.setViewportSize({width:1280,height:900});
    for(const theme of ['theme-dark','theme-contrast']){
      await page.evaluate(theme=>{document.body.className=theme;renderGame('SyntaxScramble');},theme);
      await page.screenshot({path:path.join(OUT,'SyntaxScramble-'+theme+'.png')});
      await page.evaluate(()=>renderGame('DefinitionDetectiveGame'));
      await page.locator('#detective-clue').waitFor();
      await checkAccessibility(page,theme);
      await page.screenshot({path:path.join(OUT,'DefinitionDetective-'+theme+'.png')});
    }
    await page.setViewportSize({width:320,height:740});
    await page.evaluate(()=>{document.body.className='theme-light';renderGame('DefinitionDetectiveGame',{data:[
      {term:'Electroencephalographically'.repeat(3),def:'A long definition. '.repeat(20)},
      {term:'مصطلح عربي',def:'تعريف مختلف باللغة العربية لاختبار اتجاه النص والتفاف الكلمات.'},
      {term:'生物多様性',def:'さまざまな生物が暮らしていることを表す言葉です。'}
    ]});});
    await page.getByRole('button',{name:'Larger text',exact:true}).click();
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    await page.addStyleTag({content:'*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}p{margin-bottom:2em!important;}'});
    const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,panel:document.querySelector('.detective-large-text').scrollWidth,panelWidth:document.querySelector('.detective-large-text').clientWidth}));
    if(overflow.document>overflow.viewport+2||overflow.panel>overflow.panelWidth+2)throw Error('Enlarged text overflow: '+JSON.stringify(overflow));
    await checkAccessibility(page,'320px-enlarged-spaced-multilingual');
    await page.screenshot({path:path.join(OUT,'DefinitionDetective-enlarged-text-320.png')});
    await page.emulateMedia({forcedColors:'active'});
    await page.locator('[data-help-key="detective_not_sure"]').click();
    await checkAccessibility(page,'forced-colors-feedback');
    await page.screenshot({path:path.join(OUT,'DefinitionDetective-forced-colors-320.png')});
    results.push({name:'Text enlargement and multilingual reflow',metrics:overflow});

    if(errors.length) throw Error(errors.join('\n'));
    fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({results,accessibility,errors},null,2));
    console.log('Browser checks passed: '+accessibility.length+' accessibility scans, 24 game/viewport checks, focus wrap, text enlargement, and forced colors. Screenshots: '+OUT);
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});

