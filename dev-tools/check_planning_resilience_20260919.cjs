const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{createRequire}=require('module'),{chromium}=require('playwright'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),req=createRequire(path.join(root,'desktop/web-app/package.json')),out=path.join(root,'reports/planning-context-resilience-2026-09-19');
(async()=>{
 const css=(await req('postcss')([req('tailwindcss')({...req('./tailwind.config.js'),content:[path.join(root,'view_lesson_plan_source.jsx')]})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';window.React=React;window.createRoot=createRoot;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const source=esbuild.transformSync(fs.readFileSync(path.join(root,'view_lesson_plan_source.jsx'),'utf8'),{loader:'jsx'}).code+';window.InputView=PlanningInputsSummary;';
 const boot="window.AlloModules={};window.events=[];window.t=k=>{const value=k.split('.').reduce((o,n)=>o&&o[n],window.strings);return typeof value==='string'?value:k;};";
 const mount="\nwindow.renderView=name=>{\n if(window.root)root.unmount();root=createRoot(document.getElementById('app'));events=[];\n const g={id:'g',type:'glossary',title:'Vocabulary from the lesson about changing states of water and observable evidence',data:[{term:name==='local'?'a'.repeat(7000):'evaporation'}]};\n const q={id:'q',type:'quiz',title:'Water cycle exit ticket',data:{questions:[{}]}};\n const source=[g,q],segments=[],inventory=[],u=AlloModules.UtilsPure;\n const context=AlloModules.ExportHandlers.getLessonContext(source,{inputText:'',targetStandards:[],trace:x=>segments.push(x)});\n const inventoryText=u.getAssetManifest(source,{trace:x=>inventory.push(x)});\n const record=u.capturePlanningInputs({context,segments,inventory,inventoryText,local:name==='local',inventorySupplied:name!=='local'});\n const current=JSON.parse(JSON.stringify(source));\n if(name==='teacher')current[0].data.push({term:'condensation'});\n if(name==='missing'){current.splice(0,1);current.push({...q});}\n if(name==='direct'){record.summaries=[{id:'__input__',title:'Original source input',type:'simplified',kind:'Source text excerpt'}];record.inventory=[];record.inventoryStatus='not-supplied';current.length=0;}\n root.render(React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),React.createElement(InputView,{resource:{id:name,config:name==='legacy'?{}:{generationInputs:record}},history:current,t,onOpen:id=>events.push(id)})));\n};\n";
 const assets={'/fingerprint.js':fs.readFileSync(path.join(root,'resource_content_fingerprint_module.js'),'utf8'),'/utils.js':fs.readFileSync(path.join(root,'utils_pure_module.js'),'utf8'),'/export.js':fs.readFileSync(path.join(root,'export_handlers_module.js'),'utf8'),'/runtime.js':runtime,'/source.js':source,'/boot.js':'window.strings='+fs.readFileSync(path.join(root,'ui_strings.js'),'utf8')+';\n'+boot,'/mount.js':mount,'/style.css':css,'/appstyles.js':fs.readFileSync(path.join(root,'app_styles_module.js'),'utf8')};
 const server=http.createServer((q,r)=>{if(assets[q.url]){r.setHeader('Content-Type',q.url.endsWith('.css')?'text/css':'text/javascript');r.end(assets[q.url]);return;}r.setHeader('Content-Type','text/html');r.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Planning inputs</title><link rel="stylesheet" href="/style.css"></head><body class="theme-light"><main id="app" class="allo-docsuite max-w-4xl mx-auto p-4"></main><script src="/runtime.js"></script><script src="/boot.js"></script><script src="/appstyles.js"></script><script src="/source.js"></script><script src="/fingerprint.js"></script><script src="/utils.js"></script><script src="/export.js"></script><script src="/mount.js"></script></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[],results=[];
  page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const name of ['teacher','local','missing','legacy','direct']){
    await page.evaluate(name=>renderView(name),name);
    if(name==='legacy')await page.getByText('Input versions were not recorded for this saved guide.').waitFor();
    else{
     const summary=page.locator('summary');await summary.waitFor();await summary.focus();await page.keyboard.press('Enter');
     assert.equal(await page.locator('details').getAttribute('open'),'');
     await page.keyboard.press('Space');assert.equal(await page.locator('details').getAttribute('open'),null);
     await page.keyboard.press('Enter');
     if(name==='teacher'){
      await page.getByRole('button',{name:'Open current resource: Vocabulary from the lesson about changing states of water and observable evidence',exact:true}).first().click();
      assert.deepEqual(await page.evaluate(()=>events),['g']);
      await page.getByText('Some recorded inputs need review.',{exact:true}).waitFor();await page.getByText('Recorded contribution differs',{exact:true}).waitFor();
     }
    }
    if(name==='missing'){assert.equal(await page.getByRole('button').count(),0);await page.getByText('Resource ID is ambiguous',{exact:true}).first().waitFor();}
    if(name==='local')await page.getByText('Only the recorded excerpt length is compared.',{exact:true}).waitFor();
    if(name==='direct'){await page.getByText('Source text was supplied directly; it is not a saved library resource.',{exact:true}).waitFor();assert.equal(await page.getByText('This resource is not in the current library.',{exact:true}).count(),0);assert.equal(await page.getByRole('button').count(),0);}
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    assert(metrics.scrollWidth<=width+2,name+' overflow at '+width);
    const violations=await page.evaluate(async()=>{const report=await axe.run(document.getElementById('app'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return report.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}));});
    results.push({name,width,metrics,violations});await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});
   }
  }
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({cases:results.length,errors,violations:results.filter(r=>r.violations.length)},null,2));
  assert.equal(errors.length,0);assert(results.every(r=>r.violations.length===0));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
