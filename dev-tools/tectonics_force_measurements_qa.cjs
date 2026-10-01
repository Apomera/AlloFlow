'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const repo=process.env.PT_REPO || path.resolve(__dirname,'..');
const {chromium}=require(path.join(repo,'node_modules/playwright'));
const read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const source=fs.readFileSync(process.env.PT_FORCES_SOURCE || path.join(repo,'stem_lab/stem_tool_platetectonics.js'),'utf8');
const out=process.env.PT_FORCE_QA_OUT || path.join(repo,'scratch/tectonics-force-measurements-review');fs.mkdirSync(out,{recursive:true});
const report={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),checks:[],layouts:[],captures:[],errors:[]};
const check=name=>{report.checks.push({name,pass:true});console.log('PASS',name);};
(async()=>{const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:1100,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(String(e)));
  await page.setContent('<!doctype html><html lang="en"><head><title>Sea-floor measurements review</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
  await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
  for(const f of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','node_modules/axe-core/axe.min.js'])await page.addScriptTag({content:read(f)});
  await page.evaluate(()=>{window.StemLab={registerTool(){}};window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});await page.addScriptTag({content:source});
  await page.evaluate(()=>{const root=ReactDOM.createRoot(document.querySelector('#app'));let generation=0;window.mountForce=dark=>{document.documentElement.classList.toggle('dark',dark);document.body.style.background=dark?'#0f172a':'#f1f5f9';window.calls=[];window.announcements=[];function Host(){const[saved,setSaved]=React.useState({});window.saved=saved;return React.createElement(AlloTectonicsForces,{saved,darkMode:dark,t:(k,f)=>f,onRecord:r=>{calls.push(r);setSaved(prev=>({...prev,...r}));},announceToSR:text=>announcements.push(text)});}ReactDOM.flushSync(()=>root.render(React.createElement(Host,{key:++generation})));};});
  const panel=page.locator('[data-pt-forces-probe]'),input=panel.locator('[data-pt-forces-probe-km]'),side=panel.locator('select');
  async function measure(distance,plate='A'){await input.fill(String(distance));await side.selectOption(plate);await input.focus();await page.keyboard.press('Enter');}
  async function capture(name){const file=path.join(out,name+'.png');await panel.screenshot({path:file,animations:'disabled'});report.captures.push(file);}
  for(const dark of [false,true])for(const width of [1100,390]){
    const name=`${dark?'dark':'light'}-${width}`;await page.setViewportSize({width,height:1000});await page.evaluate(dark=>mountForce(dark),dark);await panel.waitFor();
    assert.equal(await page.evaluate(()=>calls.length),0);await measure(400);await measure(400);assert.equal(await panel.locator('[data-pt-probe-pair]').count(),0);assert.match(await panel.locator('[data-pt-probe-next]').innerText(),/Repeated readings/);check(name+': duplicate distance is not a pattern');
    await measure(100);assert.equal(await panel.locator('[data-pt-probe-pair="A"]').getAttribute('data-pt-probe-pattern'),'older');assert.match(await panel.locator('[data-pt-probe-next]').innerText(),/plate B/);await capture(name+'-measurements');
    await side.focus();await page.keyboard.press('End');await page.keyboard.press('Enter');assert.equal(await side.inputValue(),'B');await input.fill('100');await input.press('Enter');await measure(400,'B');assert.equal(await panel.locator('[data-pt-probe-pair="B"]').getAttribute('data-pt-probe-pattern'),'older');assert.equal(await panel.locator('[data-pt-probe-next]').count(),0);check(name+': actual two-side values and keyboard measurement');
    const rates=await panel.locator('[data-pt-probe-average]').allTextContents();
    await page.locator('[data-pt-forces-cut]').click();await page.locator('[data-pt-forces-predict] input').nth(1).check();await page.locator('[data-pt-forces-lock]').click();await page.locator('[data-pt-forces-run]').click();
    assert.deepEqual(await panel.locator('[data-pt-probe-average]').allTextContents(),rates);assert.match(await panel.locator('[data-pt-probe-current-rate]').innerText(),/plate A 0.9 cm\/yr/);assert.equal(await page.evaluate(()=>(saved.observations||[]).length),0);await capture(name+'-average-current');
    const before=await page.evaluate(()=>JSON.stringify({calls,announcements}));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify({calls,announcements})),before);check(name+': recorded averages remain fixed; current speed changes; idle silent');
    const metrics=await panel.evaluate(node=>({overflow:document.documentElement.scrollWidth-innerWidth,clipped:[...node.querySelectorAll('input,select,button')].filter(el=>{const r=el.getBoundingClientRect();return r.left<0||r.right>innerWidth+1;}).map(el=>el.outerHTML),fonts:[...node.querySelectorAll('p,label,input,select,button,th,td,dt,dd,h4,h5')].filter(el=>el.getClientRects().length).map(el=>getComputedStyle(el).fontSize),tableVisible:!!node.querySelector('[data-pt-probe-table]').getClientRects().length,cardsVisible:!!node.querySelector('[data-pt-probe-cards]').getClientRects().length}));
    assert.equal(metrics.overflow,0);assert.deepEqual(metrics.clipped,[]);assert.ok(metrics.fonts.every(f=>parseFloat(f)>=14));assert.equal(metrics.tableVisible,width>=768);assert.equal(metrics.cardsVisible,width<768);
    const violations=await panel.evaluate(async node=>(await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));assert.deepEqual(violations,[]);report.layouts.push({name,metrics,violations});check(name+': accessible 14px responsive records, no overflow');
    await page.locator('[data-pt-forces-reset]').click();await measure(100);await page.locator('[data-pt-forces-step]').click();await measure(400);assert.equal(await panel.locator('[data-pt-probe-pair]').count(),0);assert.deepEqual(await panel.locator('[data-pt-probe-time]').allTextContents(),['0.0','1.0']);check(name+': different-time samples remain separate');
  }
  assert.deepEqual(report.errors,[]);
}catch(e){report.failure=e.stack;throw e;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
