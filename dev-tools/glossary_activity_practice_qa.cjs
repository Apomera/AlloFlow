const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const assert = require('node:assert/strict');
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/glossary-activity-practice');
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
      const data=[{term:'Leaf',def:'A green plant part'},{term:'Root',def:'Takes up water'},{term:'Seed',def:'Grows into a plant'},{term:'Sun',def:'Our nearest star'},{term:'Rain',def:'Water from clouds'},{term:'Stem',def:'Supports a plant'},{term:'Flower',def:'Makes seeds'},{term:'Soil',def:'Earth where plants grow'}];
      window.practiceWords=data;
      const t=(key,vars={})=>{const value=key.split('.').reduce((obj,part)=>obj&&obj[part],translations);return typeof value==='string'?value.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m):key;};window.qaT=t;
      Math.random=()=>0.999;
      const root=createRoot(document.getElementById('root'));
      window.showPracticeGame=name=>root.render(React.createElement(AlloLanguageContext.Provider,{value:{t}},React.createElement(AlloModules[name],{data:name==='MatchingGame'?data:data.slice(0,3),roundSize:8,onClose:()=>{window.closed=true;},onGameComplete:(_,result)=>{window.practiceResult=result;}})));
      showPracticeGame('MatchingGame');
    });
    const connect=async(term,definition)=>{
      await page.locator('[data-help-key="matching_term_item"]').filter({hasText:new RegExp('^'+term+'$')}).focus();await page.keyboard.press('Enter');
      await page.locator('[data-help-key="matching_def_item"]').filter({hasText:new RegExp('^'+definition+'$')}).focus();await page.keyboard.press('Enter');
    };
    await connect('Leaf','A green plant part');await connect('Root','Grows into a plant');await page.locator('[data-help-key="matching_check_btn"]').click();
    assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H3');
    assert.match(await page.locator('[data-game-review-practice]').textContent(),/\(7\)/);
    evidence.layouts=[];
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:568});await page.locator('[data-game-review-practice]').scrollIntoViewIfNeeded();
      const result=await page.locator('[data-game-review-practice]').evaluate(el=>({width:innerWidth,scroll:document.documentElement.scrollWidth,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:innerHeight}));assert.ok(result.scroll<=width&&result.top>=0&&result.bottom<=result.height,JSON.stringify(result));evidence.layouts.push(result);
      await page.screenshot({path:path.join(OUT,'matching-review-'+width+'.png'),fullPage:true});
    }
    await page.locator('[data-game-review-practice]').click();assert.equal(await page.locator('[data-help-key="matching_term_item"]').count(),7);assert.match(await page.locator('[data-game-practice-round]').textContent(),/7\/8/);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-help-key')),'matching_term_item');
    for(const word of (await page.evaluate(()=>practiceWords)).slice(1))await connect(word.term,word.def);
    await page.locator('[data-help-key="matching_check_btn"]').click();assert.equal(await page.locator('[data-game-review-practice]').count(),0);await page.getByRole('button',{name:'Restart all pairs',exact:true}).click();assert.equal(await page.locator('[data-help-key="matching_term_item"]').count(),8);evidence.matchingPractice=true;
    await page.evaluate(()=>showPracticeGame('WordScrambleGame'));await page.setViewportSize({width:390,height:844});
    await page.locator('input').fill('Leaf');await page.locator('input').press('Enter');await page.getByText('"Takes up water"',{exact:true}).waitFor();
    await page.locator('button[aria-label="'+await page.evaluate(()=>qaT('games.scramble.get_hint_aria'))+'"]').click();await page.locator('input').fill('Root');await page.locator('input').press('Enter');await page.getByText('"Grows into a plant"',{exact:true}).waitFor();await page.locator('[data-help-key="wizard_skip_btn"]').click();
    assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H3');assert.match(await page.locator('[data-game-review-practice]').textContent(),/\(2\)/);await page.getByText('Solved with a hint',{exact:true}).waitFor();await page.getByText('Skipped',{exact:true}).waitFor();
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:568});await page.locator('[data-game-review-practice]').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(OUT,'scramble-review-'+width+'.png'),fullPage:true});
    }
    await page.locator('[data-game-review-practice]').click();await page.waitForFunction(()=>document.activeElement.tagName==='INPUT');assert.match(await page.locator('[data-game-practice-round]').textContent(),/2\/3/);
    await page.locator('input').fill('Root');await page.locator('input').press('Enter');await page.getByText('"Grows into a plant"',{exact:true}).waitFor();await page.locator('input').fill('Seed');await page.locator('input').press('Enter');await page.getByRole('button',{name:'Restart all words',exact:true}).waitFor();assert.equal(await page.locator('[data-game-review-practice]').count(),0);await page.getByRole('button',{name:'Restart all words',exact:true}).click();await page.getByText('"A green plant part"',{exact:true}).waitFor();evidence.scramblePractice=true;
    evidence.errors=errors;assert.deepEqual(errors,[]);console.log(JSON.stringify(evidence,null,2));
  }catch(error){evidence.failure=error.message;await page.screenshot({path:path.join(OUT,'failure.png')});throw error;}finally{evidence.errors=errors;fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(evidence,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
