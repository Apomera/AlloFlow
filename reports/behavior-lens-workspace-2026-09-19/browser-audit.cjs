const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const root = process.cwd();
const out = __dirname;
const req = createRequire(path.join(root, 'desktop/web-app/package.json'));

async function main() {
  const config = require(path.join(root, 'desktop/web-app/tailwind.config.js'));
  config.content = [path.join(root, 'behavior_lens_module.js')];
  const css = await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined });
  fs.writeFileSync(path.join(out, 'preview.css'), css.css);
  const bundle = await esbuild.build({ stdin: { contents: `import React from ${JSON.stringify(req.resolve('react'))}; import {createRoot} from ${JSON.stringify(req.resolve('react-dom/client'))}; window.React=React; window.auditCreateRoot=createRoot;`, resolveDir: root }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } });
  fs.writeFileSync(path.join(out, 'react-runtime.js'), bundle.outputFiles[0].contents);
  const icons = fs.readFileSync(path.join(root, 'tests/helpers/behavior_lens_harness.js'), 'utf8').match(/const LUCIDE_ICONS = (\[[\s\S]*?\]);/)[1];
  fs.writeFileSync(path.join(out, 'preview.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Behavior Lens local audit fixture</title><link rel="stylesheet" href="preview.css"></head><body><main id="root"></main><script src="react-runtime.js"></script><script>
  (${icons}).forEach(name=>window[name]=props=>React.createElement('span',{'aria-hidden':'true',style:{display:'inline-block',width:(props?.size||18)+'px',height:(props?.size||18)+'px'}}, '◇'));
  window.addToast=(...args)=>(window.auditToasts||=[]).push(args); window.warnLog=()=>{};window.debugLog=()=>{};
  window.safeGetItem=k=>localStorage.getItem(k);window.safeSetItem=(k,v)=>localStorage.setItem(k,v);
  window.callGemini=async()=>'';window.callGeminiVision=async()=>'';window.studentNickname='Eagle';
  window.AlloModules={};localStorage.clear();localStorage.setItem('bl_student_roster',JSON.stringify([{id:'audit-eagle',name:'Eagle'}]));
  </script><script src="../../behavior_lens_workspace_module.js"></script><script src="../../behavior_lens_module.js"></script><script>
  auditCreateRoot(document.getElementById('root')).render(React.createElement(AlloModules.BehaviorLens,{onClose:()=>window.auditClosed=true,callGemini,callGeminiVision,addToast,t:(key,arg)=>typeof arg==='string'?arg:undefined,studentNickname:'Eagle',dashboardData:null,isTeacherMode:true,alloBotRef:{current:null},firestore:null,firebaseAuth:null,isCanvasEnv:true}));
  </script></body></html>`);
  const browser = await chromium.launch({headless:true});
  const results=[];
  for (const width of [1280,390,320]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(require('node:url').pathToFileURL(path.join(out,'preview.html')).href);
    await page.getByRole('button',{name:'Close BehaviorLens',exact:true}).waitFor();
    await page.screenshot({path:path.join(out,`hub-${width}.png`)});
    await page.addScriptTag({path:require.resolve('axe-core')});
    const metrics=await page.evaluate(async()=>{
      const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Close BehaviorLens');const r=b.getBoundingClientRect();
      const a=await axe.run(document.querySelector('#root'));
      return {closeBounds:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},viewport:innerWidth,bodyWidth:document.body.scrollWidth,headings:[...document.querySelectorAll('h2,h3')].map(x=>x.textContent),buttons:[...document.querySelectorAll('button')].map(x=>({label:x.getAttribute('aria-label'),text:x.textContent})),axe:a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};
    });
    results.push({width,errors,...metrics});
    await page.close();
  }
  await browser.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({width:r.width,errors:r.errors,closeBounds:r.closeBounds,bodyWidth:r.bodyWidth,axe:r.axe.map(v=>({id:v.id,count:v.nodes.length}))})),null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

