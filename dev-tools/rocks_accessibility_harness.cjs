// Local React harness with the repository compiled CSS, no CDN, no synthetic focus styles.
// Three.js and external AI services are intentionally deferred: this is tool-level QA.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const DEFAULT_OUTPUT = path.join(ROOT, 'tmp/rocks-accessibility-audit');
const cssName = fs.readdirSync(path.join(ROOT, 'app/static/css')).find(n => /^main\..*\.css$/.test(n));
if (!cssName) throw new Error('Compiled app CSS is required for meaningful visual QA.');
const files = {
  '/react.js': ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'text/javascript'],
  '/react-dom.js': ['desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'text/javascript'],
  '/rocks.js': ['stem_lab/stem_tool_rocks.js', 'text/javascript'],
  '/app.css': ['app/static/css/' + cssName, 'text/css'],
  '/strings.json': ['ui_strings.js', 'application/json'],
  '/axe.js': ['node_modules/axe-core/axe.min.js', 'text/javascript'],
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rocks & Minerals local verification</title><link rel="stylesheet" href="/app.css"><style>html,body{margin:0;background:#fff;color:#1e293b;font-family:Arial,sans-serif}*{box-sizing:border-box}main{padding:16px;max-width:1200px;margin:auto}</style></head><body><main id="root"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script>window.StemLab={_registry:{},registerTool:function(id,cfg){this._registry[id]=cfg},loadScriptResilient:function(){return new Promise(function(){})},ensureThree:function(){return new Promise(function(){})}};</script><script src="/rocks.js"></script><script>
window.__errors=[];window.__announcements=[];window.__toasts=[];
window.addEventListener('error',function(e){window.__errors.push(e.message)});
window.__state={rocks:{mode:'landscape'},rockCycle:{}};
window.__strings={};window.__theme={};
var noop=function(){};var h=React.createElement;
var icons=new Proxy({},{get:function(){return function(){return h('span',{'aria-hidden':true})}}});
var setData=function(update){window.__state=typeof update==='function'?update(window.__state):update;window.__rerender()};
function App(){var tick=React.useState(0);window.__rerender=function(){tick[1](function(x){return x+1})};window.__setState=function(state){window.__state=state;window.__rerender()};
return window.StemLab._registry.rocks.render({React:React,toolData:window.__state,setToolData:setData,icons:icons,t:function(k,fb){var v=k.split('.').reduce(function(o,p){return o&&o[p]},window.__strings);return typeof v==='string'?v:fb},setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],stemLabTab:'explore',stemLabTool:'rocks',gradeLevel:'5th Grade',props:{},getXP:function(){return 0},awardXP:noop,celebrate:noop,beep:noop,canvasNarrate:noop,canvasA11yDesc:noop,announceToSR:function(m){window.__announcements.push(m)},addToast:function(m){window.__toasts.push(m)},isContrast:!!window.__theme.contrast,callGemini:null,callTTS:null,callImagen:null,callGeminiVision:null,srOnly:{position:'absolute',width:1,height:1,overflow:'hidden'},a11yClick:function(fn){return{onClick:fn,role:'button',tabIndex:0,onKeyDown:function(e){if(e.key==='Enter'||e.key===' ')fn()}}}})}
fetch('/strings.json').then(function(r){return r.json()}).then(function(data){window.__strings=data;ReactDOM.createRoot(document.getElementById('root')).render(h(App))});
</script></body></html>`;

async function start(options = {}) {
  const OUTPUT = path.resolve(options.output || DEFAULT_OUTPUT);
  fs.mkdirSync(OUTPUT, { recursive: true });
  const browserTemp=path.join(OUTPUT,'browser-temp');
  const downloads=path.join(OUTPUT,'downloads');
  fs.mkdirSync(browserTemp,{recursive:true});fs.mkdirSync(downloads,{recursive:true});
  process.env.TEMP=browserTemp;process.env.TMP=browserTemp;
  const server = http.createServer((req,res) => {
    const p = new URL(req.url, 'http://localhost').pathname;
    if (p === '/') { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(html); return; }
    if (!files[p]) { res.writeHead(404); res.end(); return; }
    const [file,mime] = files[p];
    res.writeHead(200, {'Content-Type':mime + '; charset=utf-8'});
    fs.createReadStream(path.join(ROOT,file)).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const caches = [path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),path.join(require('node:os').homedir(),'AppData','Local','ms-playwright')];
  const candidates = caches.flatMap(cache => fs.existsSync(cache) ? fs.readdirSync(cache).filter(n=>/^chromium_headless_shell-\d+$/.test(n)).sort((a,b)=>Number(b.split('-').pop())-Number(a.split('-').pop())).map(n=>path.join(cache,n,'chrome-headless-shell-win64/chrome-headless-shell.exe')) : []);
  const localBrowser = process.env.ROCKS_QA_BROWSER || candidates.find(file=>fs.existsSync(file)) || '';
  let browser;
  try { browser=await chromium.launch({headless:true,downloadsPath:downloads,...(localBrowser && fs.existsSync(localBrowser)?{executablePath:localBrowser}:{})}); }
  catch(error) {await new Promise(resolve=>server.close(resolve));throw error;}
  const page = await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>typeof window.__setState==='function');
  return {page,errors,server,browser,output:OUTPUT,async stop(){await browser.close();await new Promise(resolve=>server.close(resolve));}};
}
async function settle(page) {
  await page.evaluate(async () => {
    document.getAnimations().forEach(animation => {
      try { const timing=animation.effect.getComputedTiming(); if(Number.isFinite(timing.endTime)) animation.finish(); else animation.pause(); } catch {}
    });
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
}
async function audit(page, selector) {
  await settle(page);
  if (!await page.evaluate(()=>!!window.axe)) await page.addScriptTag({url:'/axe.js'});
  return page.evaluate(async selector => {
    const results=await window.axe.run(document.querySelector(selector),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},rules:{'label-content-name-mismatch':{enabled:true},'target-size':{enabled:true}}});
    return results.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>{
      const element=typeof n.target[0]==='string'?document.querySelector(n.target[0]):null;
      const visibleText=element?.innerText||element?.textContent||'';
      const labelledBy=element?.getAttribute('aria-labelledby');
      const accessibleName=element?.getAttribute('aria-label')||(labelledBy?labelledBy.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' '):visibleText);
      // SC 2.5.3 permits differences in punctuation, case and symbolic characters.
      // Keep raw evidence for human review, including every unmatched case.
      const normalized=text=>text.toLowerCase().replace(/[^\p{L}\p{N}+−×÷=<>]/gu,'');
      const labelReview=v.id==='label-content-name-mismatch'?{visibleText,accessibleName,normalizedVisible:normalized(visibleText),normalizedName:normalized(accessibleName),symbolPunctuationOnly:normalized(visibleText).length>0&&normalized(accessibleName).includes(normalized(visibleText))}:undefined;
      return{target:n.target,summary:n.failureSummary,...(labelReview?{labelReview}:{})};
    })}));
  },selector);
}
async function layout(page) {
  return page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,text:(e.textContent||'').slice(0,80),width:e.getBoundingClientRect().width}))}));
}
module.exports={start,audit,layout,settle,cssFile:path.join(ROOT,files["/app.css"][0])};

