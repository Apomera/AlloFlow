'use strict';
// Isolated browser checks for Water Cycle's shared visual system and mode surfaces.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = process.cwd();
const baseline = process.argv.includes('--baseline');
const quick = process.argv.includes('--quick');
const serve = process.argv.includes('--serve');
const forcedOnly = process.argv.includes('--forced-only');
const out = path.join(root, 'reports/watercycle-visual-system', baseline ? 'baseline' : forcedOnly ? 'forced-colors-followup' : 'final');
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Water Cycle visual system QA</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#eef2f2;font-family:system-ui}main{padding:12px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script>
<script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountWater=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({waterCycle:seed});window.waterReviewData=data.waterCycle;window.waterReviewSet=setData;const noop=()=>{};
 return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
}; const query=new URLSearchParams(location.search),mode=query.get('mode')||'explore';
mountWater({wcMode:({explore:'explorer',storm:'precipHunt',steward:'steward',worlds:'worlds',pilot:'pilot'})[mode]||'explorer',journeyView:'2d',journeyPaused:true,wc2dPaused:true,precipHunt:{viewMode:'2d',paused:true,playing:false,showStormAnatomy:false}},query.get('theme')||'light');
</script></body></html>`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(!serve&&url.pathname==='/stem_lab/stem_tool_watercycle.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(source);}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});
});
const seeds={
 explore:{wcMode:'explorer',journeyView:'2d',journeyPaused:true,wc2dPaused:true},
 storm:{wcMode:'precipHunt',precipHunt:{viewMode:'2d',playing:false,paused:true,showStormAnatomy:false}},
 steward:{wcMode:'steward'},
 worlds:{wcMode:'worlds'}
};
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(serve?Number(process.env.WATER_VISUAL_PORT||8770):0,'127.0.0.1',resolve));
 if(serve){console.log('Water Cycle visual preview: http://127.0.0.1:'+server.address().port+'/?mode=explore');return;}
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={sourceSha256:hash(source),baseline,capturedAt:new Date().toISOString(),checks:[],surfaces:[],audits:[],errors:[],failures:[]};
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(120000);
 async function screenshot(filename){await page.screenshot({path:path.join(out,filename),animations:'disabled',timeout:120000});}
 page.on('pageerror',error=>report.errors.push(String(error)));
 const check=(condition,label,detail)=>{report.checks.push({label,pass:!!condition,...(detail?{detail}:{})});if(!condition)report.failures.push(label);};
 async function mount(mode,theme){await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode+'&theme='+theme);await page.locator('.wc-mode-bar').waitFor();if(mode==='worlds')await page.locator('[data-water-worlds]').waitFor({timeout:30000});await page.addScriptTag({url:'/desktop/web-app/node_modules/axe-core/axe.min.js'});await page.waitForTimeout(300);}
 async function audit(selector,label){if(!await page.locator(selector).count())return;const violations=await page.evaluate(async selector=>(await axe.run(document.querySelector(selector),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})),selector);report.audits.push({label,selector,violations});}
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('#wcCanvas').waitFor();
  await page.addScriptTag({url:'/desktop/web-app/node_modules/axe-core/axe.min.js'});
  for(const theme of forcedOnly?[]:baseline?['light']:quick?['light','dark']:['light','dark','contrast']){
   for(const width of baseline?[1280,390]:quick?[1280]:[1280,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const mode of quick||width===390||width===320&&theme!=='contrast'?['explore']:['explore','storm','steward','worlds']){
     try{
      await mount(mode,theme);console.log('CHECK '+mode+' '+theme+' '+width);
      const id=mode+'-'+theme+'-'+width;
      const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,buttons:Array.from(document.querySelectorAll('.wc-mode-tab')).map(el=>({text:el.innerText,pressed:el.getAttribute('aria-pressed'),height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width})),canvases:Array.from(document.querySelectorAll('canvas')).map(el=>({id:el.id,width:el.width,height:el.height,displayWidth:el.getBoundingClientRect().width})),overflow:Array.from(document.querySelectorAll('main *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right}))}));
      report.surfaces.push({id,...metrics});check(metrics.scrollWidth<=width,id+' fits viewport',metrics.overflow);check(metrics.buttons.every(b=>b.height>=44),id+' navigation targets are at least 44px tall');check(metrics.buttons.filter(b=>b.pressed==='true').length===1,id+' exactly one selected mode');
      if(mode==='explore'&&width!==390||baseline){await screenshot(id+'.png');console.log('CAPTURE '+id);}
      if(width!==390)await audit('.wc-mode-bar',id+' mode navigation');
      const surface=mode==='storm'?'.wc-precip-lab':mode==='steward'?'.wc-steward-experience':mode==='explore'?'.wc-explorer-header':'[data-water-worlds]';
      if(width!==390&&(mode==='explore'||theme==='contrast'||baseline))await audit(surface,id+' surface');
      if(mode==='explore'&&width!==390){await audit('.wc-view-switch',id+' view switch');await audit('.wc-view-status',id+' status');await audit('.wc-section-tabs',id+' section navigation');}
      if(mode==='steward'&&(theme==='contrast'||baseline)){
       await page.getByRole('button',{name:'💧 Begin 10-year Watershed Campaign',exact:true}).click();
       const yearWidth=await page.evaluate(()=>document.documentElement.scrollWidth);check(yearWidth<=width,id+' year fits viewport');
       if(width!==390)await audit('.wc-steward-season',id+' year summary');
      }
     }catch(error){report.failures.push(mode+' '+theme+' '+width+': '+error.message);}
    }
   }
  }
  if(!baseline&&!quick){
   if(!forcedOnly){
   await page.setViewportSize({width:1280,height:1000});await mount('explore','light');
   const nav=page.locator('.wc-mode-bar');
   const modeNames=await nav.locator('button').allTextContents();check(modeNames.length===5,'Five modes remain available in shared navigation',modeNames);
   await nav.getByRole('button',{name:/^Be the Water\./}).click();check(await nav.getByRole('button',{name:/^Be the Water\./}).getAttribute('aria-pressed')==='true','Pointer navigation opens Be the Water');
   await nav.getByRole('button',{name:/^Storm Lab\./}).click();check(await nav.getByRole('button',{name:/^Storm Lab\./}).getAttribute('aria-pressed')==='true','Pointer navigation opens Storm Lab');
   await nav.getByRole('button',{name:/^Steward\./}).focus();await page.keyboard.press('Enter');check(await nav.getByRole('button',{name:/^Steward\./}).getAttribute('aria-pressed')==='true','Keyboard navigation opens Steward');
   await nav.getByRole('button',{name:/^Explore\./}).focus();await page.keyboard.press('Space');check(await nav.getByRole('button',{name:/^Explore\./}).getAttribute('aria-pressed')==='true','Space navigation opens Explore');
   await nav.getByRole('button',{name:/^Storm Lab\./}).focus();
   const focusStyle=await nav.getByRole('button',{name:/^Storm Lab\./}).evaluate(el=>{const s=getComputedStyle(el);return{outline:s.outlineStyle,width:s.outlineWidth,shadow:s.boxShadow,focusVisible:el.matches(':focus-visible')};});check(focusStyle.focusVisible&&(parseFloat(focusStyle.width)>=2||focusStyle.shadow!=='none'),'Keyboard navigation has visible focus',focusStyle);
   await screenshot('navigation-keyboard-focus.png');
   }
   await page.emulateMedia({forcedColors:'active'});await mount('explore','contrast');await audit('.wc-mode-bar','forced colors navigation');await screenshot('navigation-forced-colors.png');
   const mirror=fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'));report.mirrorSha256=hash(mirror);report.finalSourceSha256=hash(fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js')));report.sourceChangedDuringRun=report.sourceSha256!==report.finalSourceSha256;check(report.finalSourceSha256===report.mirrorSha256,'Source and desktop mirror match');
  }
 }finally{
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));
 }
 console.log(JSON.stringify({baseline,checks:report.checks.length,audits:report.audits.length,violations:report.audits.filter(a=>a.violations.length).map(a=>({label:a.label,ids:a.violations.map(v=>v.id)})),failures:report.failures,errors:report.errors,report:path.join(out,'results.json')},null,2));
 assert.deepEqual(report.failures,[]);assert.deepEqual(report.errors,[]);
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
