const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname,'../../../..');
const OUT = __dirname;
const harnessSource=fs.readFileSync(path.join(ROOT,'tests/e2e/helpers/stem_gl_harness.ts'),'utf8');
const recorder=harnessSource.slice(harnessSource.indexOf('const GL_RECORDER ='),harnessSource.indexOf('function harnessHtml'));
const htmlFn=harnessSource.slice(harnessSource.indexOf('function harnessHtml'),harnessSource.indexOf('\n}',harnessSource.indexOf('function harnessHtml'))+2).replace('o: HarnessOptions, appCss: string | null, substitutes: string[]','o, appCss, substitutes').replace('): string {',') {');
const createHtml=new Function(recorder+'\n'+htmlFn+'\nreturn harnessHtml;')();
const css='app/static/css/'+fs.readdirSync(path.join(ROOT,'app/static/css')).find(x=>/^main\..*\.css$/.test(x));
const {chromium}=require('playwright');
async function launch(variant='current',width=1365,height=900) {
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 const page=await context.newPage(); const errors=[],blocked=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});
 const html=createHtml({toolFile:'stem_lab/stem_tool_treelab.js',toolId:'treeLab',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/OrbitControls.js'],width,height,layout:'document'},css,[])
 .replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">')
 .replace('width:'+width+'px;min-height:','width:100%;min-height:')
 .replace('background:#0f172a','background:#f8fafc');
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://tree-lab.local') {blocked.push(url.href);await route.abort();return;}
  if(url.pathname==='/__harness') return route.fulfill({contentType:'text/html',body:html});
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/,'');
  let file=path.join(ROOT,rel);
  if(!file.startsWith(ROOT)&&!file.startsWith(OUT)) return route.abort();
  try {return route.fulfill({body:fs.readFileSync(file),contentType:rel.endsWith('.css')?'text/css':rel.endsWith('.js')?'text/javascript':'application/octet-stream'});}
  catch(e){blocked.push(rel);return route.abort();}
 });
 await page.goto('http://tree-lab.local/__harness');
 if(!await page.evaluate(()=>typeof window.__mount==='function')) { console.error({errors,blocked,htmlEnd:html.slice(-700)}); await browser.close(); throw new Error('Fixture failed to load'); }
 await page.evaluate(()=>{window.__mount({treeLab:{bandOverride:'g68'}});window.__ctx.reduceMotion=true;window.__rerender();});
 await page.waitForFunction(()=>window.__glScene()?.renders>0,{},{timeout:120000});
 return {browser,page,errors,blocked,context};
}
async function measure(page) {
 return page.evaluate(()=>({
  viewport:{w:innerWidth,h:innerHeight},height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,
  scene:document.querySelector('canvas')?.getBoundingClientRect().toJSON(),
  gl:window.__glScene(),
  buttons:[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().top<innerHeight).map(b=>b.textContent.trim()),
  headings:[...document.querySelectorAll('h2,h3')].map(b=>({text:b.textContent.trim(),top:Math.round(b.getBoundingClientRect().top)})).slice(0,24)
 }));
}
if(require.main===module) (async()=>{
 const variant=process.argv[2]||'current';
 const {browser,page,errors,blocked}=await launch(variant);
 try {
  const report=await measure(page);
  await page.screenshot({path:path.join(OUT,variant+'-desktop.png')});
  await page.screenshot({path:path.join(OUT,variant+'-full.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(OUT,variant+'-phone.png')});
  report.mobile=await measure(page);
  if(variant==='candidate'){await page.locator('.allo-tree-field-invitation').click(); await page.waitForFunction(()=>document.activeElement.id==='treelab-discovery-heading'); await page.screenshot({path:path.join(OUT,'candidate-phone-mission.png')});}
  report.errors=errors; report.blocked=blocked;
  fs.writeFileSync(path.join(OUT,variant+'-inspection.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
 }finally {await page.evaluate(()=>window.__destroy());await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
module.exports={launch,measure,OUT};
