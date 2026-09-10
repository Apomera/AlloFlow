const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{createRequire}=require('module'),{chromium}=require('playwright'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),req=createRequire(path.join(root,'desktop/web-app/package.json')),out=path.join(root,'reports/map-planning-refinements-2026-09-08');
(async()=>{
 const css=(await req('postcss')([req('tailwindcss')({...req('./tailwind.config.js'),content:[path.join(root,'view_lesson_plan_source.jsx')]})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';window.React=React;window.createRoot=createRoot;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const source=esbuild.transformSync(fs.readFileSync(path.join(root,'view_lesson_plan_source.jsx'),'utf8'),{loader:'jsx'}).code+';window.InputView=PlanningInputsSummary;';
 const boot="window.AlloModules={};window.events=[];window.t=k=>{const value=k.split('.').reduce((o,n)=>o&&o[n],window.strings);return typeof value==='string'?value:k;};";
 const mount="window.renderView=name=>{if(window.root)root.unmount();root=createRoot(document.getElementById('app'));events=[];const record={version:1,mode:name==='family'?'family':'teacher',traceComplete:true,projection:name==='family'?'local-excerpt-v1':'context-v1',summaries:[{id:'reading',title:'A source passage about the changing states of water and the evidence we can observe',kind:'Source text excerpt',partial:name==='family'},{id:'missing',title:'Vocabulary from the original lesson',kind:'Vocabulary terms'}],inventoryStatus:name==='family'?'not-supplied':'recorded',inventory:name==='family'?[]:[{id:'reading',title:'Original reading resource'},{id:'duplicate',title:'An imported resource with an ambiguous identity'}]};root.render(React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),React.createElement(InputView,{resource:{id:name,config:name==='legacy'?{}:{generationInputs:record}},history:[{id:'reading',title:'Current reading'},{id:'duplicate'},{id:'duplicate'}],t,onOpen:name==='teacher'?(id)=>events.push(id):null})));};";
 const assets={'/runtime.js':runtime,'/source.js':source,'/boot.js':'window.strings='+fs.readFileSync(path.join(root,'ui_strings.js'),'utf8')+';\n'+boot,'/mount.js':mount,'/style.css':css,'/appstyles.js':fs.readFileSync(path.join(root,'app_styles_module.js'),'utf8')};
 const server=http.createServer((q,r)=>{if(assets[q.url]){r.setHeader('Content-Type',q.url.endsWith('.css')?'text/css':'text/javascript');r.end(assets[q.url]);return;}r.setHeader('Content-Type','text/html');r.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Planning inputs</title><link rel="stylesheet" href="/style.css"></head><body class="theme-light"><main id="app" class="allo-docsuite max-w-4xl mx-auto p-4"></main><script src="/runtime.js"></script><script src="/boot.js"></script><script src="/appstyles.js"></script><script src="/source.js"></script><script src="/mount.js"></script></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[],results=[];
  page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const name of ['teacher','family','legacy']){
    await page.evaluate(name=>renderView(name),name);
    if(name==='legacy')await page.getByText('Input versions were not recorded for this saved guide.').waitFor();
    else{
     const summary=page.locator('summary');await summary.waitFor();await summary.focus();await page.keyboard.press('Enter');
     assert.equal(await page.locator('details').getAttribute('open'),'');
     await page.keyboard.press('Space');assert.equal(await page.locator('details').getAttribute('open'),null);
     await page.keyboard.press('Enter');
     if(name==='teacher'){
      await page.getByRole('button',{name:'Open current resource: A source passage about the changing states of water and the evidence we can observe',exact:true}).click();
      assert.deepEqual(await page.evaluate(()=>events),['reading']);
      assert.equal(await page.getByRole('button',{name:/ambiguous identity/}).count(),0);
     }
    }
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    assert(metrics.scrollWidth<=width+2,name+' overflow at '+width);
    const violations=await page.evaluate(async()=>{const report=await axe.run(document.getElementById('app'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return report.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}));});
    results.push({name,width,metrics,violations});await page.screenshot({path:path.join(out,name+'-'+width+'.png')});
   }
  }
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({cases:results.length,errors,violations:results.filter(r=>r.violations.length)},null,2));
  assert.equal(errors.length,0);assert(results.every(r=>r.violations.length===0));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
