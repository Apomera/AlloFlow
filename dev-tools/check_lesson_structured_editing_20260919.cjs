
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{createRequire}=require('module'),{chromium}=require('playwright'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),req=createRequire(path.join(root,'desktop/web-app/package.json')),out=path.join(root,'reports/lesson-structured-editing-2026-09-19');
(async()=>{
 const css=(await req('postcss')([req('tailwindcss')({...req('./tailwind.config.js'),content:[path.join(root,'view_lesson_plan_source.jsx')]})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';window.React=React;window.createRoot=createRoot;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const assets={'/runtime.js':runtime,'/style.css':css,'/boot.js':'window.AlloModules={};window.strings='+fs.readFileSync(path.join(root,'ui_strings.js'),'utf8')+';','/mount.js':"\nwindow.t=k=>{const v=k.split('.').reduce((o,key)=>o&&o[key],window.strings);return typeof v==='string'?v:k;};\nwindow.mountPlan=()=>{\n if(window.root)root.unmount();root=createRoot(document.getElementById('app'));\n window.saved={id:'plan',type:'lesson-plan',title:'Comparing fractions with paper strips',config:{gradeLevel:'4th Grade'},data:{\n essentialQuestion:'How do equal parts help us compare fractions?',objectives:['Explain equal parts'],\n materialsNeeded:[{name:'Paper strips',quantity:4,id:'paper'},{item:{en:'Colored pencils',fr:'Crayons',id:'label'},quantity:3,id:'pencils'},{text:0,unit:'extra counters',id:'zero'}],\n hook:{text:{en:'Opening question',fr:'Question initiale',id:'localized'},id:'hook'},\n directInstruction:{text:'Compare equal wholes',id:'instruction',title:'Do not show this metadata title'},\n guidedPractice:'Fold a strip into equal parts.',independentPractice:'Label the fractions.',closure:'Explain the comparison.'\n }};\n window.visible=saved;window.editing=true;\n const deps={get generatedContent(){return visible;},onUpdateResource:(id,update)=>{if(id!==saved.id)return false;saved=update(saved);visible=saved;renderPlan();return true;}};\n window.edit=AlloModules.HostHandlers(deps).handleLessonPlanChange;\n window.renderPlan=()=>root.render(React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),React.createElement(AlloModules.LessonPlanView,{\n generatedContent:visible,history:[],t,isTeacherMode:true,isEditingLessonPlan:editing,getRows:()=>2,handleLessonPlanChange:edit,\n handleToggleIsEditingLessonPlan:()=>{editing=!editing;renderPlan();},handleCopyToClipboard:()=>{},handleExportPDF:()=>{},handleExport:()=>{},\n BilingualFieldRenderer:({text})=>React.createElement('span',null,text)\n })));\n window.reopenPlan=()=>{saved=JSON.parse(JSON.stringify(saved));visible=saved;root.unmount();root=createRoot(document.getElementById('app'));renderPlan();};\n renderPlan();\n};\n"};
 for(const [route,file]of [['/view.js','view_lesson_plan_module.js'],['/host.js','host_handlers_module.js'],['/export.js','export_handlers_module.js'],['/styles.js','app_styles_module.js']])assets[route]=fs.readFileSync(path.join(root,file),'utf8');
 const server=http.createServer((q,r)=>{if(assets[q.url]){r.setHeader('Content-Type',q.url.endsWith('.css')?'text/css':'text/javascript');r.end(assets[q.url]);return;}r.setHeader('Content-Type','text/html');r.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Saved lesson editing</title><link rel="stylesheet" href="/style.css"></head><body class="theme-light"><main id="app" class="allo-docsuite max-w-4xl mx-auto p-4"></main><script src="/runtime.js"></script><script src="/boot.js"></script><script src="/styles.js"></script><script src="/view.js"></script><script src="/host.js"></script><script src="/export.js"></script><script src="/mount.js"></script></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  async function check(width,mode){
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert(metrics.scrollWidth<=width+2);
   const violations=await page.evaluate(async()=>{const r=await axe.run(document.getElementById('app'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}));});
   results.push({width,mode,metrics,violations});await page.screenshot({path:path.join(out,mode+'-'+width+'.png'),fullPage:true});
  }
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>mountPlan());
   const material=()=>page.getByRole('textbox',{name:'Material 1',exact:true});
   await material().waitFor();assert.equal(await material().inputValue(),'Paper strips');
   assert.equal(await page.getByRole('textbox',{name:'Material 3',exact:true}).inputValue(),'0');
   await page.evaluate(()=>{saved={...saved,data:{...saved.data,directInstruction:{...saved.data.directInstruction,teacherNote:'Arrived after render'}}};});
   const instruction=page.getByRole('textbox',{name:'Edit direct instruction',exact:true});
   await instruction.fill('Teacher revision');
   assert.equal(await page.evaluate(()=>saved.data.directInstruction.teacherNote),'Arrived after render');
   await page.getByRole('textbox',{name:"Edit hook",exact:true}).fill('Revised opening question');
   assert.equal(await page.evaluate(()=>saved.data.hook.text.fr),'Question initiale');
   await material().fill('Colored paper strips');assert.equal(await page.evaluate(()=>saved.data.materialsNeeded[0].quantity),4);
   await page.getByRole('button',{name:'Remove: Material 1',exact:true}).focus();await page.keyboard.press('Space');
   const undo=page.getByRole('button',{name:'Undo removal',exact:true});await undo.waitFor();await undo.focus();await page.keyboard.press('Enter');
   await material().waitFor();assert.equal(await material().inputValue(),'Colored paper strips');
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Material 1');
   await page.getByRole('button',{name:'Move down: Material 1',exact:true}).focus();await page.keyboard.press('Space');
   assert.equal(await page.getByRole('textbox',{name:'Material 2',exact:true}).inputValue(),'Colored paper strips');
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Material 2');
   await instruction.fill('');await page.evaluate(()=>reopenPlan());await instruction.waitFor();assert.equal(await instruction.inputValue(),'');
   const exported=await page.evaluate(()=>AlloModules.ExportHandlers.prepareLessonPlanExport(saved).resource.data);
   assert.equal(exported.directInstruction,'');assert.deepEqual(exported.materialsNeeded,['Colored pencils','Colored paper strips','0']);
   await check(width,'editing');
   await page.evaluate(()=>{editing=false;renderPlan();});
   await page.getByText('Revised opening question',{exact:true}).waitFor();
   assert.equal(await page.getByText('Do not show this metadata title',{exact:true}).count(),0);
   await check(width,'reading');
  }
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({cases:results.length,errors,violations:results.filter(r=>r.violations.length)},null,2));assert.equal(errors.length,0);assert(results.every(r=>!r.violations.length));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
