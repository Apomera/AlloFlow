const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/semiconductor-enhancement/mos-curve-2026-09-19');
(async()=>{
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.setContent('<!doctype html><html lang="en"><head><title>Semiconductor Lab verification</title></head><body><main id="root"></main></body></html>');
const cssDir=path.join(root,'app/static/css'),cssFiles=fs.readdirSync(cssDir).filter(f=>/^main\..*\.css$/.test(f));
assert.equal(cssFiles.length,1);
await page.addStyleTag({path:path.join(cssDir,cssFiles[0])});
await page.addStyleTag({content:'body{margin:0;background:#07111f;font-family:system-ui}#root{max-width:1120px;margin:20px auto}button,select,textarea,input{font:inherit}@media(max-width:640px){#root{margin:0}}'});
await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react/umd/react.development.js')});
await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')});
await page.addScriptTag({path:path.join(root,'stem_lab/stem_tool_semiconductor.js')});
await page.evaluate(()=>{
  const R=window.React,h=R.createElement,noop=()=>{};
  const icons=new Proxy({},{get:()=>()=>h('span',{'aria-hidden':true})});
  function App(){
    const [data,setData]=R.useState({semiconductor:{mode:'explore',subtool:'bandgap',material:'silicon',temperature:300}});
    const [snapshots,setSnapshots]=R.useState([]);
    window.semiData=data;window.semiSnapshots=snapshots;window.semiSet=patch=>setData(p=>({semiconductor:{...p.semiconductor,...patch}}));
    return window.StemLab._registry.semiconductor.render({
      React:R,toolData:data,setToolData:setData,setStemLabTool:noop,stemLabTool:'semiconductor',toolSnapshots:snapshots,setToolSnapshots:setSnapshots,
      addToast:noop,icons,t:(k,f)=>f||k,gradeLevel:'11th Grade',props:{},srOnly:{position:'absolute',width:1,height:1,overflow:'hidden'},
      a11yClick:fn=>({onClick:fn}),announceToSR:noop,canvasNarrate:noop,awardXP:noop,getXP:()=>0
    });
  }
  window.semiRoot=ReactDOM.createRoot(document.getElementById('root'));window.semiRoot.render(h(App));
});

await page.locator('#semiconductor-simulation-select').selectOption('transistor');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'3D device cutaway',exact:true}).click();
const cutaway=page.getByRole('region',{name:'3D MOSFET cutaway',exact:true}),cube=cutaway.locator('[data-mos-cutaway]');
const panel=cutaway.locator('details.semi-mos-curve'),plot=panel.locator('[data-mos-curve]');
const control=panel.getByRole('slider',{name:'Drain-bias magnitude on the current–voltage curve',exact:true});
assert.equal(await plot.count(),0);
await panel.locator('summary').click();await plot.waitFor();
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const scans=[];
async function scan(name){
 const violations=await page.evaluate(async()=>{const a=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return a.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));});
 scans.push({name,violations});assert.deepEqual(violations,[],name+' accessibility');
}
for(const [name,p] of [['N-MOSFET',1],['P-MOSFET',-1]]){
 await page.getByRole('button',{name,exact:true}).click();
 assert.equal(await plot.locator('[data-mos-boundary]').count(),0);
 assert.match(await plot.getAttribute('aria-label'),/current is zero throughout/);
 await page.getByRole('button',{name:'Channel, zero current',exact:true}).click();
 await control.fill('0.5');
 let data=await page.evaluate(()=>semiData.semiconductor);
 assert.equal(data.gateVoltage,3*p);assert.equal(data.drainVoltage,.5*p);
 assert.match(await cube.getAttribute('aria-label'),/Linear/);
 assert.match(await panel.locator('[role=status]').innerText(),new RegExp('VDS = '+(.5*p).toFixed(2)));
 await scan(name+' linear curve');
 await control.fill('1.5');
 assert.match(await cube.getAttribute('aria-label'),/Saturation/);
 assert.equal(await plot.locator('[data-mos-operating-point]').getAttribute('cx'),await plot.locator('[data-mos-boundary]').getAttribute('x1'));
 const boundaryY=await plot.locator('[data-mos-operating-point]').getAttribute('cy');
 await control.focus();await page.keyboard.press('End');
 assert.equal((await page.evaluate(()=>semiData.semiconductor)).drainVoltage,10*p);
 assert.equal(await plot.locator('[data-mos-operating-point]').getAttribute('cy'),boundaryY);
 await page.keyboard.press('Home');
 assert.equal(Math.abs((await page.evaluate(()=>semiData.semiconductor)).drainVoltage),0);
 assert.match(await cube.getAttribute('aria-label'),/Zero drain bias/);
 assert.match(await cutaway.locator('[data-carriers]').innerText(),/No net flow/);
 await control.fill('5');
 const oldPath=await plot.locator('[data-mos-linear]').getAttribute('d');
 await page.getByRole('slider',{name:'Gate VGS',exact:true}).fill(String(4*p));
 assert.notEqual(await plot.locator('[data-mos-linear]').getAttribute('d'),oldPath);
 assert.match(await plot.getAttribute('aria-label'),new RegExp('gate '+(4*p).toFixed(2)));
 const settings=await page.evaluate(()=>JSON.stringify(semiData.semiconductor));
 const pathBefore=await plot.locator('[data-mos-linear]').getAttribute('d');
 await cube.focus();await page.keyboard.press('ArrowRight');
 assert.equal(await plot.locator('[data-mos-linear]').getAttribute('d'),pathBefore);
 await cutaway.getByLabel('Reveal channel (hide gate and oxide)',{exact:true}).check();
 assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor)),settings);
 await panel.screenshot({path:path.join(out,p===1?'nmos-curve-desktop.png':'pmos-curve-desktop.png')});
 await panel.locator('summary').click();await plot.waitFor({state:'detached'});assert.equal(await plot.count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor)),settings);
 await panel.locator('summary').click();await plot.waitFor();
 assert.equal(await plot.locator('[data-mos-linear]').getAttribute('d'),pathBefore);
}
await scan('PMOS saturation curve');
for(const width of [390,320]){
 await page.setViewportSize({width,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow at '+width);
 await panel.screenshot({path:path.join(out,'pmos-curve-mobile-'+width+'.png')});
}
await scan('mobile curve');
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks:['NMOS and PMOS signed bias linked to cutaway','exact boundary marker','keyboard Home and End control actual bias','flat saturation current','gate changes curve and scale','camera and layer inspection preserve curve and state','collapse preserves settings','390 and 320 px layout'],scans,errors},null,2));
console.log('Linked MOSFET curve browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
