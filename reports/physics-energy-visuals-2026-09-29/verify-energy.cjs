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
  return page.locator('[data-physics-energy-panel]').evaluate(root => {
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
async function chartAudit(page) {
  return page.locator('[data-physics-energy-graph]').evaluate(svg => {
    const lum = color => color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4; }).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const bands = [svg.querySelector('[data-physics-energy-area="ke"]'), ...svg.querySelectorAll('pattern rect')].map(el=>getComputedStyle(el).fill);
    const marks = [svg.querySelector('[data-physics-energy-cursor]'), ...svg.querySelectorAll('[data-physics-energy-boundary]')].map(el=>getComputedStyle(el).stroke);
    const markerContrast = marks.flatMap(mark=>bands.map(band=>{const a=lum(mark),b=lum(band);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}));
    const labels = [...svg.querySelectorAll('text')].map(el=>{const b=el.getBBox();return {text:el.textContent,left:b.x,top:b.y,right:b.x+b.width,bottom:b.y+b.height};});
    return {markerContrast,labels,width:svg.viewBox.baseVal.width,height:svg.viewBox.baseVal.height};
  });
}
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const theme of before ? ['default'] : ['default','dark','contrast']) for (const viewportWidth of before ? [1100,320] : [1100,375,320]) {
      const page = await browser.newPage({viewport:{width:viewportWidth,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      try {
        await page.evaluate(() => {
          let id=0,now=1000;const frames=new Map();
          window.requestAnimationFrame=cb=>{frames.set(++id,cb);return id;}; window.cancelAnimationFrame=key=>frames.delete(key);
          window.__energyTick=()=>{now+=1000/60;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
        });
        await page.setContent(sandbox.globalThis.makePhysicsPage({file:'physics',id:'physics'},theme),{waitUntil:'domcontentloaded',timeout:120000});
        await page.waitForFunction(()=>!!document.getElementById('physicsCanvas')?._launch,null,{polling:20});
        await launch(page,{angle:45,velocity:30,gravity:9.8,mass:2,launchHeight:10,airResist:false,simSpeed:2,showGraphs:true,showFlightData:true});
        await launch(page,{angle:45,velocity:40,gravity:9.8,mass:3,launchHeight:20,airResist:true,simSpeed:2});
        const original=await evidence(page);
        const peak=await page.evaluate(()=>{const t=document.getElementById('physicsCanvas')._trails.at(-1);return t.reduce((best,p,i)=>p.mY>t[best].mY?i:best,0);});
        await page.locator('[data-physics-graph-time-slider]').evaluate((el,index)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(index));el.dispatchEvent(new Event('input',{bubbles:true}));},peak);
        await page.waitForFunction(index=>document.getElementById('physicsCanvas')._inspection?.index===index,peak,{polling:20});
        await patch(page,{angle:80,velocity:5,gravity:1,mass:9,launchHeight:30,airResist:false});
        const selector=before?'[data-physics-motion-panel]':'[data-physics-energy-panel]';
        const file=`energy-${before?'before-':''}${theme}-${viewportWidth}.png`;
        await page.locator(selector).screenshot({path:path.join(__dirname,file),animations:'disabled'});
        const layout=await page.locator(selector).evaluate(root=>({panelWidth:root.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth-innerWidth}));
        assert.equal(layout.overflow,0); assert.deepEqual(errors,[]); assert.deepEqual(await evidence(page),original);
        const configuration={theme,viewportWidth,...layout,screenshots:[file],evidenceSha256:hash(original),evidenceUnchanged:true,pageErrors:errors};
        if(!before){
          const selected=await page.evaluate(()=>document.getElementById('physicsCanvas')._inspection.snapshot);
          const text=await textAudit(page); assert(text.length>=15&&text.every(t=>t.font>=11.99&&t.contrast>=4.5),'Energy text audit: '+JSON.stringify(text));
          const chart=await chartAudit(page);assert(chart.markerContrast.every(ratio=>ratio>=3),'Energy marker contrast failed');
          assert(chart.labels.every(label=>label.left>=-1&&label.top>=-1&&label.right<=chart.width+1&&label.bottom<=chart.height+1),'Energy labels extend outside the chart');
          const values=await page.locator('[data-physics-energy-value]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.dataset.physicsEnergyValue,Number(el.dataset.value)])));
          for(const key of ['ke','pe','dragLoss','totalEnergy','initialEnergy'])assert.equal(values[key],selected[key]);
          assert.equal(selected.parameters.mass,3);assert.equal(selected.parameters.launchHeight,20);assert.equal(selected.parameters.airResist,true);
          configuration.selected=selected; configuration.text=text; configuration.values=values; configuration.chart=chart;
        }
        configurations.push(configuration);console.log(`Verified ${before?'previous ':''}energy view ${theme} at ${viewportWidth}px`);
      }catch(error){failures.push({theme,viewportWidth,message:error.message,pageErrors:errors});throw error;}finally{await page.close();}
    }
    assert.equal(hash(fs.readFileSync('stem_lab/stem_tool_physics.js')),sourceHash,'Source changed during energy audit');
  }finally{
    await browser.close();fs.writeFileSync(path.join(__dirname,before?'energy-before-results.json':'energy-results.json'),JSON.stringify({createdAt:new Date().toISOString(),sourceSha256:sourceHash,passed:configurations.length===(before?2:9)&&!failures.length,configurations,failures},null,2));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
