// Reproducible Chromium print QA for the actual glossary renderers.
const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/glossary-print-review-2026-09-12', process.argv[2] || 'baseline');
fs.mkdirSync(OUT, { recursive: true });
const data = ['Photosynthesis', 'Evaporation', 'Condensation', 'Precipitation', 'Ecosystem', 'Habitat', 'Producer', 'Consumer', 'Decomposer', 'Adaptation', 'Population', 'Community'].map((term, i) => ({
  term, def: ['Plants use sunlight, water, and carbon dioxide to make food and release oxygen.', 'Liquid water changes into water vapor when it gains heat energy.', 'Living things interact with their surroundings and depend on one another.'][i % 3],
  translations: { Spanish: term + ': Las plantas y los animales dependen de su entorno para sobrevivir.' },
}));
data[0].def += ' ' + 'The process supports food webs and moves energy through ecosystems. '.repeat(9) + 'END OF LONG DEFINITION.';
data[0].etymology = 'From Greek roots meaning light and putting together. '.repeat(4);
data[0].roots = [{root:'photo',lang:'Greek',meaning:'light',related:['photograph','phototropism']}];
const gameData = {grid:Array.from({length:15},(_,r)=>Array.from({length:15},(_,c)=>'PHOTOSYNTHESISAB'[(r+c)%15])),words:data.map(x=>x.term.toUpperCase()),solutions:Array.from({length:14},(_,c)=>'0-'+c)};

(async () => {
  const config = {...req('./tailwind.config.js'),content:[path.join(ROOT,'games_source.jsx'),path.join(ROOT,'view_glossary_source.jsx')]};
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', {from:undefined})).css;
  const runtime = esbuild.buildSync({stdin:{contents:"import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons;",resolveDir:path.join(ROOT,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
  const translations = JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8'));
  const previewSource=fs.readFileSync(path.join(ROOT,'view_export_preview_source.jsx'),'utf8');
  const optionsStart=previewSource.indexOf('{hasGlossary && (',previewSource.indexOf('{/* Glossary display:'));
  const optionsEnd=previewSource.indexOf('{/* Timeline display:',optionsStart);
  if(optionsStart<0||optionsEnd<0)throw Error('Glossary options not found');
  const optionsJs=esbuild.transformSync('window.PrintReviewOptions=function(props){const hasGlossary=true,hasGlossaryTranslations=props.translated;const [exportConfig,setExportConfigAndRefresh]=React.useState({includeGlossary:props.included,glossaryDisplayMode:"table"});return <div>'+previewSource.slice(optionsStart,optionsEnd)+'</div>}',{loader:'jsx'}).code;
  const assets = {'/runtime.js':runtime,'/styles.css':css,'/options.js':optionsJs};
  for (const name of ['games','app_styles','export','doc_pipeline']) assets['/'+name+'.js']=fs.readFileSync(path.join(ROOT,name+'_module.js'),'utf8');
  const server = http.createServer((request,response)=>{
    if(assets[request.url]) {response.setHeader('Content-Type',request.url.endsWith('.css')?'text/css':'text/javascript');response.end(assets[request.url]);return;}
    response.setHeader('Content-Type','text/html');response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head><body class="theme-light"><aside>UNDERLYING APP MUST NOT PRINT</aside><main class="allo-docsuite" id="game"></main><script src="/runtime.js"></script></body></html>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const errors=[],results=[]; page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(({translations,data,gameData})=>{
      window.translations=translations;
      window.t=(key,vars={})=>{const v=key.split('.').reduce((o,k)=>o&&o[k],translations);return typeof v==='string'?v.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m):key;};
      window.AlloLanguageContext=React.createContext({t});window.AlloModules={};window.fisherYatesShuffle=a=>a.slice().reverse();window.getGlobalAudioContext=()=>null;
      window.__data=data;window.__grid=gameData;window.warnLog=()=>{};window.debugLog=()=>{};window.processMathHTML=x=>x;window.__alloflowPrintExport=true;
    },{translations,data,gameData});
    for (const name of ['app_styles','games','export','doc_pipeline']) await page.addScriptTag({url:'/'+name+'.js'});
    async function capture(name,target=page) {
      for(const format of ['Letter','A4']) {
        await target.emulateMedia({media:'print'});
        await target.pdf({path:path.join(OUT,name+'-'+format+'.pdf'),format,printBackground:false,margin:{top:'12mm',right:'12mm',bottom:'12mm',left:'12mm'}});
      }
      const metrics=await target.evaluate(()=>({
        height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,
        clipped:[...document.querySelectorAll('.card-side,#bingo-print-area span')].filter(e=>e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2).map(e=>e.textContent.slice(0,70)),
        fixed:[...document.querySelectorAll('[role="dialog"]')].map(e=>({position:getComputedStyle(e).position,height:e.getBoundingClientRect().height})),
        grid:document.querySelector('#word-search-grid')?{display:getComputedStyle(document.querySelector('#word-search-grid')).display,cells:document.querySelectorAll('#word-search-grid .grid-cell').length}:null
      }));
      results.push({name,...metrics});
      await target.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});
      await target.emulateMedia({media:'screen'});
    }
    for(const name of ['MatchingGame','CrosswordGame','BingoGame']) {
      await page.evaluate(name=>{
        if(window.gameRoot)gameRoot.unmount(); window.gameRoot=createRoot(document.querySelector('#game'));
        const noop=()=>{};
        const props={data:__data,onClose:noop,playSound:noop,onScoreUpdate:noop,onGameComplete:noop,settings:{cardCount:3,includeImages:true},setSettings:noop,setBingoState:noop,onGenerate:noop,bingoState:{cards:Array.from({length:3},()=>Array.from({length:25},(_,i)=>i===12?{type:'free',term:'FREE SPACE'}:{...__data[i%__data.length],type:'term'}))}};
        window.print=()=>{window.__printSnapshot=document.documentElement.outerHTML;};
        gameRoot.render(React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),React.createElement(AlloModules[name],props)));
      },name);
      await page.locator('[role="dialog"]').waitFor();
      if(name==='CrosswordGame') {
        await page.locator('[data-help-key="crossword_controls"] button').first().click();
        await page.waitForFunction(()=>!!window.__printSnapshot);
        const printPage=await browser.newPage();
        await printPage.setContent(await page.evaluate(()=>__printSnapshot));
        await printPage.addStyleTag({content:css});
        await capture(name,printPage);await printPage.close();
      } else await capture(name);
    }
    const host=fs.readFileSync(path.join(ROOT,'AlloFlowANTI.txt'),'utf8');
    const handler=host.slice(host.indexOf('  const handlePrintGame = () => {'),host.indexOf('  const chunkText =',host.indexOf('  const handlePrintGame = () => {')));
    const wordHtml=await page.evaluate(handler=>{
      const el=document.createElement('div');el.id='printable-game-area';el.innerHTML='<h2 class="hidden print-only">Word search</h2><div id="word-search-grid" class="inline-grid" style="grid-template-columns:repeat(15,minmax(2rem,2.25rem))">'+__grid.grid.map(row=>'<div role="row" class="contents">'+row.map(c=>'<div class="grid-cell">'+c+'</div>').join('')+'</div>').join('')+'</div><div>Found 1 of 12</div><div class="word-list">'+__grid.words.map(w=>'<span>'+w+'</span>').join('')+'</div>';document.body.appendChild(el);
      let html='';const old=window.open;window.open=()=>({document:{write:v=>{html+=v},close:()=>{}},print:()=>{}});
      try{new Function('gameData','t','addToast',handler+';handlePrintGame();')(__grid,t,()=>{});}finally{window.open=old;el.remove();}return html;
    },handler);
    const outputPage=await browser.newPage(); await outputPage.setContent(wordHtml);await capture('WordSearch',outputPage);
    for(const mode of ['standard','language']) {
      const html=await page.evaluate(mode=>{
        let html='';const original=window.Blob,click=HTMLAnchorElement.prototype.click;window.Blob=class{constructor(parts){html=parts.join('');}};
        const create=URL.createObjectURL,revoke=URL.revokeObjectURL;URL.createObjectURL=()=> 'blob:qa';URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=()=>{};
        try {AlloModules.createExport({liveRef:{current:{generatedContent:{type:'glossary',data:__data},t,addToast:()=>{}}},escapeXml:s=>String(s),warnLog:()=>{},debugLog:()=>{}}).handleExportFlashcards(mode);}finally{window.Blob=original;URL.createObjectURL=create;URL.revokeObjectURL=revoke;HTMLAnchorElement.prototype.click=click;}return html;
      },mode);
      fs.writeFileSync(path.join(OUT,'Flashcards-'+mode+'.html'),html);
      await outputPage.setContent(html);await capture('Flashcards-'+mode,outputPage);
    }
    for(const mode of ['table','flash-cards','language-cards']) {
      const html=await page.evaluate(mode=>{
        const pipeline=AlloModules.createDocPipeline({callGemini:async()=>'{}',callGeminiVision:async()=>'{}',callImagen:async()=>null,addToast:()=>{},t,isRtlLang:()=>false,updateExportPreview:()=>{},getDefaultTitle:()=> 'Vocabulary',state:{}});
        return pipeline.generateFullPackHTML([{type:'glossary',id:'qa-glossary',title:'Vocabulary',data:__data,gameData:__grid}],'Science vocabulary',true,{}, {includeGlossary:true,includeTeacherKey:false,glossaryDisplayMode:mode,annotations:[]});
      },mode);
      fs.writeFileSync(path.join(OUT,'Export-'+mode+'.html'),html);
      await outputPage.evaluate(()=>{window.__alloflowPrintExport=true;});
      await outputPage.setContent(html);await capture('Export-'+mode,outputPage);
    }
    await page.addScriptTag({url:'/options.js'});
    const optionsResults=[];
    for(const width of [1280,390]) {
      await page.setViewportSize({width,height:844});
      for(const translated of [false,true]) {
        await page.evaluate(translated=>{gameRoot.unmount();gameRoot=createRoot(document.querySelector('#game'));gameRoot.render(React.createElement(PrintReviewOptions,{translated,included:true}));},translated);
        const radios=page.locator('input[name="glossaryDisplayMode"]');await radios.first().waitFor();
        if(await radios.nth(2).isDisabled()===translated)throw Error('Incorrect language-card availability');
        await radios.nth(1).check();if(!(await radios.nth(1).isChecked()))throw Error('Cannot select flashcards');
        await page.screenshot({path:path.join(OUT,'export-options-'+width+'-'+translated+'.png')});
        optionsResults.push({width,translated,languageDisabled:await radios.nth(2).isDisabled()});
      }
    }
    fs.writeFileSync(path.join(OUT,'export-options-results.json'),JSON.stringify(optionsResults,null,2));
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
