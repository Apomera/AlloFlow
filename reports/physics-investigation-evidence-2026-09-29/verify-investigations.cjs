const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
let fixture = fs.readFileSync('reports/physics-deep-review-2026-09-27/preview-harness.cjs', 'utf8');
fixture = fixture.replace('window.__reviewState = pair[0]; var ctx = {', 'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
fixture += '\nglobalThis.makePhysicsPage = html;';
const sandbox = { require, console, __dirname, globalThis: {} };
vm.runInNewContext(fixture, sandbox);
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const before = process.argv.includes('--before');
const sourceHash = hash(fs.readFileSync('stem_lab/stem_tool_physics.js'));
const configurations = [], failures = [];
async function patch(page, values) {
  await page.evaluate(next => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...next } })), values);
  await page.waitForTimeout(50);
}
async function launch(page, values) {
  await patch(page, values);
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'); let count = 0;
    while (cv._launched && count++ < 10000) window.__energyTick();
    if (cv._launched) throw Error('Energy audit flight did not land');
  });
  await page.waitForFunction(() => !!window.__reviewState.physics.lastFlight, null, { polling: 20 });
  await page.waitForTimeout(60);
}
async function evidence(page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas'), d = window.__reviewState.physics;
    return { ball: cv._ball, trails: cv._trails.map(t => ({ points: [...t], parameters: t.parameters, run: t.run, apex: t.apex, modelVersion: t.modelVersion })), log: d.runLog, lastFlight: d.lastFlight };
  });
}
async function textAudit(page) {
  return page.locator('[data-physics-investigation-comparison]').evaluate(root => {
    const lum = color => {
      const parts = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v+.055)/1.055)**2.4; });
      return parts.reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
    };
    const readings = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!node.textContent.trim() || !el.getClientRects().length || el.closest('defs,[aria-hidden="true"],.sr-only')) continue;
      const s = getComputedStyle(el); let bg;
      for (let parent=el; parent; parent=parent.parentElement) { const color=getComputedStyle(parent).backgroundColor; if (/^rgb\(/.test(color)) { bg=color; break; } }
      if (!bg) throw Error('Missing opaque text background');
      const svg = el.ownerSVGElement, transform = svg && el.getScreenCTM();
      const font = parseFloat(s.fontSize) * (transform ? Math.hypot(transform.a,transform.b) : 1);
      const fg = svg ? s.fill : s.color, a=lum(fg), b=lum(bg);
      readings.push({text:node.textContent.trim(),font,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
    }
    return readings;
  });
}
(async () => {
 const browser=await chromium.launch({headless:true});
 try {
  for(const theme of before?['default']:['default','dark','contrast']) for(const viewportWidth of before?[1100,320]:[1100,375,320]) {
   const page=await browser.newPage({viewport:{width:viewportWidth,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try {
    await page.evaluate(()=>{let id=0,now=1000;const frames=new Map();window.requestAnimationFrame=cb=>{frames.set(++id,cb);return id;};window.cancelAnimationFrame=key=>frames.delete(key);window.__energyTick=()=>{now+=1000/60;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};});
    await page.setContent(sandbox.globalThis.makePhysicsPage({file:'physics',id:'physics'},theme),{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>!!document.getElementById('physicsCanvas')?._launch,null,{polling:20});
    for(const velocity of [15,30,45]) await launch(page,{angle:45,velocity,gravity:9.8,mass:1,launchHeight:0,airResist:false,simSpeed:2});
    await patch(page,{investigationOpen:true,investigationDraft:{title:'Testing launch speed',question:'How does speed change range?',prediction:'Doubling speed will quadruple range.',selectedRunIds:[1,2,3]}});
    const original=await evidence(page), root=page.locator('[data-physics-investigation-comparison]');
    const file='investigation-'+(before?'before-':'')+theme+'-'+viewportWidth+'.png';
    await root.screenshot({path:path.join(__dirname,file),animations:'disabled'});
    const layout=await root.evaluate(el=>({panelWidth:el.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth-innerWidth}));
    assert.equal(layout.overflow,0);assert.deepEqual(errors,[]);
    const configuration={theme,viewportWidth,...layout,screenshots:[file],evidenceSha256:hash(original),pageErrors:errors};
    if(!before){
     const text=await textAudit(page);assert(text.length>=25&&text.every(t=>t.font>=11.99&&t.contrast>=4.5),'Text audit: '+JSON.stringify(text));configuration.text=text;
     await root.locator('[data-physics-investigation-held]').click();
     assert.equal(await root.locator('[data-physics-investigation-setting][data-changed="false"]').count(),5);
     await root.locator('[data-physics-investigation-held]').click();
     await root.locator('[data-physics-investigation-compare-run]').selectOption('3');
     assert.equal(await root.getAttribute('data-compared-run'),'3');
     for(const key of ['range','maxH','time']){
      const a=original.log[0][key],b=original.log[2][key],card=root.locator('[data-physics-investigation-measure="'+key+'"]');
      assert(Math.abs(Number(await card.locator('[data-physics-investigation-ratio]').getAttribute('data-value'))-b/a)<1e-10);
      const bars=await card.locator('[data-physics-investigation-bar]').evaluateAll(els=>els.map(el=>({width:el.getBoundingClientRect().width,total:el.parentElement.getBoundingClientRect().width-parseFloat(getComputedStyle(el.parentElement).borderLeftWidth)-parseFloat(getComputedStyle(el.parentElement).borderRightWidth),value:Number(el.dataset.value)})));
      for(const bar of bars)assert(Math.abs(bar.width-bar.total*bar.value/Math.max(a,b))<.05);
     }
     await patch(page,{angle:80,velocity:5,gravity:1,mass:9,launchHeight:30,airResist:true});
     assert.deepEqual(await evidence(page),original);
     await page.locator('[data-physics-investigation-save]').click();
     const archive=page.locator('[data-physics-investigation-archived-evidence]');
     await page.getByRole('button',{name:'Clear the experiment log',exact:true}).click();
     assert.equal(await archive.getAttribute('data-reference-run'),'1');
     await archive.locator('[data-physics-investigation-compare-run]').selectOption('3');
     assert.equal(Number(await archive.locator('[data-physics-investigation-measure="range"] [data-physics-investigation-ratio]').getAttribute('data-value')),original.log[2].range/original.log[0].range);
     if(theme==='default'&&viewportWidth!==375){const archived='investigation-archive-'+viewportWidth+'.png';await archive.screenshot({path:path.join(__dirname,archived),animations:'disabled'});configuration.screenshots.push(archived);}
     configuration.evidenceUnchanged=true;configuration.archivedAfterLogClear=true;
    }
    configurations.push(configuration);console.log('Verified '+(before?'previous ':'')+'investigation view '+theme+' at '+viewportWidth+'px');
   }catch(error){failures.push({theme,viewportWidth,message:error.message,pageErrors:errors});throw error;}finally{await page.close();}
  }
  assert.equal(hash(fs.readFileSync('stem_lab/stem_tool_physics.js')),sourceHash,'Source changed during investigation audit');
 }finally{
  await browser.close();fs.writeFileSync(path.join(__dirname,before?'investigation-before-results.json':'investigation-results.json'),JSON.stringify({createdAt:new Date().toISOString(),sourceSha256:sourceHash,passed:configurations.length===(before?2:9)&&!failures.length,configurations,failures},null,2));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
