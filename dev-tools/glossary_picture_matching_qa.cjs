const fs = require('fs'), path = require('path'), http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const assert = require('node:assert/strict');
const { glossaryMediaProps } = require('../tests/helpers/glossary_media_fixture.cjs');
const ROOT = path.resolve(__dirname, '..');
const req = createRequire(path.join(ROOT, 'desktop/web-app/package.json'));
const OUT = path.join(ROOT, 'reports/glossary-picture-matching');
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
      const data=[
        {term:'Sun',def:'The star that lights our sky',imageAlt:'A yellow circle with rays',image:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><path d="M80 5v15m0 80v15M25 60H5m150 0h-20M30 15l15 15m70 60 15 15M30 105l15-15m70-60 15-15" stroke="#e7a008" stroke-width="6"/><circle cx="80" cy="60" r="32" fill="#facc15"/></svg>'),imageAttribution:{set:'Example',author:'Test fixture'}},
        {term:'Leaf',def:'A plant part that collects sunlight',imageAlt:'An oval green shape with branching veins',image:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><ellipse cx="80" cy="55" rx="36" ry="48" fill="#22a447"/><path d="M80 110V20m0 30-20-12m20 30 20-15" stroke="#14532d" stroke-width="4"/></svg>')},
        {term:'Seed',def:'Grows into a new plant'},
        {term:'Rain',def:'Water falling from clouds',imageAlt:'Drops beneath a cloud',image:'/missing-picture.png'}
      ];
      const t=(key,vars={})=>{const value=key.split('.').reduce((obj,part)=>obj&&obj[part],translations);return typeof value==='string'?value.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m):key;};
      createRoot(document.getElementById('root')).render(React.createElement(AlloLanguageContext.Provider,{value:{t}},React.createElement(AlloModules.MatchingGame,{data,roundSize:4,onClose:()=>{window.matchingClosed=true;},onGameComplete:(_,result)=>{window.matchingResult=result;}})));
    });
    await page.getByLabel('Match words with',{exact:true}).selectOption('pictures');
    await page.waitForFunction(()=>document.querySelectorAll('[data-help-key="matching_def_item"]').length===4);
    await page.getByText('Picture unavailable',{exact:true}).last().waitFor();
    evidence.layouts=[];
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:844});
      const size=await page.locator('[role="dialog"]').evaluate(el=>({width:innerWidth,scroll:document.documentElement.scrollWidth,client:el.clientWidth,inner:el.scrollWidth}));evidence.layouts.push(size);assert.ok(size.scroll<=width&&size.inner<=size.client,JSON.stringify(size));
      await page.screenshot({path:path.join(OUT,'pictures-'+width+'.png'),fullPage:true});
    }
    const expected={Sun:'A yellow circle with rays',Leaf:'An oval green shape with branching veins',Seed:'Grows into a new plant',Rain:'Drops beneath a cloud'};
    for(const [term,clue] of Object.entries(expected)){
      await page.locator('[data-help-key="matching_term_item"]').filter({hasText:new RegExp('^'+term+'$')}).focus();await page.keyboard.press('Enter');
      await page.locator('[data-help-key="matching_def_item"]').filter({has:page.locator('img[alt="'+clue+'"]')}).count().then(async count=>{
        const target=page.locator('[data-help-key="matching_def_item"]').filter({hasText:term==='Rain'?'Water falling from clouds':clue});
        if(count)await page.locator('[data-help-key="matching_def_item"]:has(img[alt="'+clue+'"])').focus();else await target.focus();
      });await page.keyboard.press('Enter');
    }
    await page.locator('[data-help-key="matching_check_btn"]').click();
    assert.equal(await page.evaluate(()=>matchingResult.isPerfect),true);evidence.keyboardPerfect=true;
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.glossary-matching-sheet').isVisible(),true);
    assert.equal(await page.locator('.glossary-matching-sheet img').count(),2);
    await page.screenshot({path:path.join(OUT,'worksheet.png'),fullPage:true});
    await page.pdf({path:path.join(OUT,'worksheet.pdf'),format:'A4'});evidence.print=true;
    await page.emulateMedia({media:'screen'});
    await page.getByLabel('Match words with',{exact:true}).selectOption('definitions');
    assert.equal(await page.locator('[data-help-key="matching_def_item"] img').count(),0);evidence.modeReset=true;
    await page.locator('[data-help-key="matching_term_item"]').first().focus();await page.keyboard.press('Escape');await page.waitForFunction(()=>window.matchingClosed===true);
    evidence.errors=errors;assert.deepEqual(errors,[]);console.log(JSON.stringify(evidence,null,2));
  }catch(error){evidence.failure=error.message;await page.screenshot({path:path.join(OUT,'failure.png')});throw error;}finally{evidence.errors=errors;fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(evidence,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
