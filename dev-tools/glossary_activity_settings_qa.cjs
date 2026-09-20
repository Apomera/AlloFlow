const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const assert = require('node:assert/strict');
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/glossary-activity-settings');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const config = { ...req('./tailwind.config.js'), content: [path.join(ROOT, 'view_glossary_source.jsx'), path.join(ROOT, 'glossary_image_controls_source.jsx'), path.join(ROOT, 'games_source.jsx')] };
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
  const runtime = esbuild.buildSync({ stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.createRoot=createRoot; window.AlloIcons=icons; window.AlloLanguageContext=React.createContext({t:k=>k}); window.fisherYatesShuffle=a=>a.slice().reverse(); window.getGlobalAudioContext=()=>null;", resolveDir: path.join(ROOT, 'desktop/web-app') }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } }).outputFiles[0].text;
  const assets = { '/runtime.js': runtime, '/styles.css': css, '/games.js': fs.readFileSync(path.join(ROOT, 'games_module.js')), '/view.js': fs.readFileSync(path.join(ROOT, 'view_glossary_module.js')), '/host.js': fs.readFileSync(path.join(ROOT, 'host_handlers_module.js')), '/export.js': fs.readFileSync(path.join(ROOT, 'export_module.js')), '/helpers.js': fs.readFileSync(path.join(ROOT, 'glossary_helpers_module.js')), '/fixture.js': 'window.glossaryMediaProps=' + glossaryMediaProps.toString() + ';window.translations=' + fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8') };
  const server = http.createServer((request, response) => {
    if (assets[request.url]) { response.setHeader('Content-Type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(assets[request.url]); return; }
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main id="root" class="p-4"></main><script src="/runtime.js"></script><script src="/helpers.js"></script><script src="/host.js"></script><script src="/export.js"></script><script src="/games.js"></script><script src="/view.js"></script><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], evidence = { service: process.argv.includes('--live') ? 'live' : 'fixture' };
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(()=>{
      const initial=glossaryMediaProps();
      const data=['Leaf','Root','Seed','Stem','Flower','Fruit','Branch','Bark','Tree','Moss','Fern','Grass'].map((term,index)=>({...initial.generatedContent.data[0],entryId:String(index),term,def:'Meaning of '+term}));
      const resource={...initial.generatedContent,data};
      const t=(key,vars={})=>{const value=key.split('.').reduce((obj,part)=>obj&&obj[part],translations);return typeof value==='string'?value.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m):key;};
      const Boundary=({children})=>children;
      function App(){
        const [state,set]=React.useState({limit:6,isMemoryGame:false,isMatchingGame:false});
        window.updateActivity=patch=>set(p=>({...p,...patch}));
        const props=glossaryMediaProps({...state,t,generatedContent:resource,filteredGlossaryData:data.slice(0,state.limit).map((x,i)=>({...x,_originalIdx:i})),MemoryGame:AlloModules.MemoryGame,MatchingGame:AlloModules.MatchingGame,ErrorBoundary:Boundary,handleSetIsMemoryGameToTrue:()=>set(p=>({...p,isMemoryGame:true})),closeMemory:()=>set(p=>({...p,isMemoryGame:false})),handleSetIsMatchingGameToTrue:()=>set(p=>({...p,isMatchingGame:true})),closeMatching:()=>set(p=>({...p,isMatchingGame:false})),playSound:()=>{},handleGameScoreUpdate:()=>{},handleGameCompletion:()=>{}});
        return React.createElement(AlloLanguageContext.Provider,{value:{t}},React.createElement(AlloModules.GlossaryView,props));
      }
      createRoot(document.getElementById('root')).render(React.createElement(App));
    });
    await page.locator('button[aria-controls="glossary-games-tools"]').click();
    await page.getByLabel('Words for games',{exact:true}).selectOption('filtered');
    await page.getByLabel('Memory and Matching board size',{exact:true}).selectOption('4');
    evidence.layouts=[];
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:1000});
      await page.locator('#glossary-games-tools').scrollIntoViewIfNeeded();
      const size=await page.locator('#glossary-games-tools').evaluate(el=>({width:innerWidth,scroll:document.documentElement.scrollWidth,client:el.clientWidth,inner:el.scrollWidth}));evidence.layouts.push(size);assert.ok(size.scroll<=width&&size.inner<=size.client,JSON.stringify(size));
      await page.locator('#glossary-games-tools').screenshot({path:path.join(OUT,'settings-'+width+'.png')});
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-help-key="glossary_memory_game"]').click();
    await page.waitForFunction(()=>document.querySelectorAll('[role="group"] [role="button"]').length===8);
    const labels=await page.locator('[role="group"] [role="button"]').evaluateAll(cards=>cards.map(c=>c.textContent));
    evidence.memoryCards=labels.length;
    await page.evaluate(()=>updateActivity({limit:1}));
    await page.waitForFunction(()=>document.querySelectorAll('[role="group"] [role="button"]').length===8);
    assert.equal(await page.locator('[role="group"] [role="button"]').count(),8);
    await page.locator('[role="group"] [role="button"]').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(OUT,'memory-4-pairs-390.png'),fullPage:true});
    await page.evaluate(()=>updateActivity({isMemoryGame:false,limit:6}));
    await page.locator('[data-help-key="glossary_matching"]').click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-help-key="matching_term_item"]').length===4);
    const words=await page.locator('[data-help-key="matching_term_item"]').allTextContents();assert.equal(words.length,4);assert.ok(words.every(w=>!w.includes('Grass')&&!w.includes('Bark')));evidence.matchingTerms=words;
    await page.screenshot({path:path.join(OUT,'matching-4-pairs-390.png'),fullPage:true});
    await page.keyboard.press('Escape');
    await page.evaluate(()=>updateActivity({limit:0}));
    assert.equal(await page.locator('[data-help-key="glossary_matching"]').isDisabled(),true);
    await page.getByRole('button',{name:'Use all glossary words',exact:true}).click();
    assert.equal(await page.locator('[data-help-key="glossary_matching"]').isDisabled(),false);evidence.emptyRecovery=true;
    evidence.errors=errors;assert.deepEqual(errors,[]);console.log(JSON.stringify(evidence,null,2));
  }catch(error){evidence.failure=error.message;await page.screenshot({path:path.join(OUT,'failure.png')});throw error;}finally{evidence.errors=errors;fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(evidence,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
