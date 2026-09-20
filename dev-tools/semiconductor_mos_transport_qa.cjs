const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/semiconductor-enhancement/mos-transport-2026-09-19');
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
const cutaway=page.getByRole('region',{name:'3D MOSFET cutaway',exact:true});
const readout=page.getByRole('region',{name:'Read the MOSFET operating point',exact:true});
const svg=cutaway.locator('svg');
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const scans=[];
async function scan(name){
 const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));});
 scans.push({name,violations});assert.deepEqual(violations,[],name+' accessibility');
}
for(const [name,p,carrier] of [['N-MOSFET',1,'Electrons'],['P-MOSFET',-1,'Holes']]){
 await page.getByRole('button',{name,exact:true}).click();
 await readout.getByRole('button',{name:'Form a channel with zero drain bias',exact:true}).click();
 await cutaway.getByText('A channel is present, but zero drain bias gives zero net drain current in this model.',{exact:true}).waitFor();
 assert.match(await readout.innerText(),/No net flow/);
 assert.equal(await readout.locator('.semi-mos-lane b').count(),0);
 await scan(name+' zero bias');
 await readout.getByRole('button',{name:'Apply a small drain bias',exact:true}).click();
 assert.match(await svg.getAttribute('aria-label'),/Linear/);
 assert.match(await readout.locator('[data-carriers]').innerText(),new RegExp(carrier));
 assert.match((await readout.locator('[data-current] strong').innerText()).replace(/\s/g,''),p===1?/Drain.*Source/:/Source.*Drain/);
 await readout.getByText('Why this operating region?',{exact:true}).click();
 await readout.getByText('below the boundary, in the linear region.',{exact:false}).waitFor();
 await readout.getByRole('button',{name:'Reach the saturation boundary',exact:true}).click();
 assert.match(await svg.getAttribute('aria-label'),/Saturation/);
 const atBoundary=await page.evaluate(()=>semiData.semiconductor);
 assert.equal(atBoundary.gateVoltage,3*p);assert.equal(atBoundary.drainVoltage,1.5*p);
 await cutaway.getByText('current continues.',{exact:false}).waitFor();
 await scan(name+' saturation');
 await readout.getByText('Why this operating region?',{exact:true}).click();
 const before=await svg.innerHTML();await svg.focus();await page.keyboard.press('ArrowRight');
 assert.notEqual(await svg.innerHTML(),before);await page.keyboard.press('Home');assert.equal(await svg.innerHTML(),before);
 const polygons=await svg.locator('polygon').count();
 const settings=await page.evaluate(()=>JSON.stringify(semiData.semiconductor));
 await cutaway.getByLabel('Reveal channel (hide gate and oxide)',{exact:true}).check();
 assert.equal(await svg.locator('polygon').count(),polygons-12);
 assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor)),settings);
 assert.match(await svg.getAttribute('aria-label'),/Gate and oxide hidden/);
 await cutaway.screenshot({path:path.join(out,p===1?'nmos-channel-desktop.png':'pmos-channel-desktop.png')});
 await cutaway.getByRole('button',{name:'Oxide',exact:true}).click();
 assert.equal(await cutaway.getByLabel('Reveal channel (hide gate and oxide)',{exact:true}).isChecked(),false);
 assert.equal(await svg.locator('polygon').count(),polygons);
 await cutaway.getByRole('button',{name:'Channel',exact:true}).click();
 await readout.getByRole('button',{name:'Remove the gate drive',exact:true}).click();
 assert.match(await svg.getAttribute('aria-label'),/Cutoff/);
 assert.equal((await page.evaluate(()=>semiData.semiconductor)).drainVoltage,1.5*p);
 assert.equal(await readout.locator('.semi-mos-lane b').count(),0);
}
await page.getByRole('button',{name:'N-MOSFET',exact:true}).click();
await page.getByRole('slider',{name:'Gate VGS',exact:true}).fill('1.6');
await page.getByRole('slider',{name:'Drain VDS',exact:true}).fill('0');
await readout.getByRole('button',{name:'Apply a small drain bias',exact:true}).click();
assert.match(await svg.getAttribute('aria-label'),/Linear/);
assert.ok(await page.getByRole('slider',{name:'Drain VDS',exact:true}).evaluate(el=>!el.validity.stepMismatch));
await readout.getByRole('button',{name:'Reach the saturation boundary',exact:true}).click();
assert.match(await svg.getAttribute('aria-label'),/Saturation/);
await page.getByRole('button',{name:'Saturation region',exact:true}).click();
await cutaway.getByLabel('Reveal channel (hide gate and oxide)',{exact:true}).check();
await scan('revealed channel');
for(const width of [390,320]){
 await page.setViewportSize({width,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow at '+width);
 await cutaway.screenshot({path:path.join(out,'channel-mobile-'+width+'.png')});
}
await scan('mobile channel');
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks:['NMOS and PMOS guided cycles','signed terminal voltages and current directions','zero-bias and cutoff suppress arrows','exact saturation boundary','gate/oxide reveal preserves electrical state','layer selection reveals selected layer','keyboard rotation and Home reset','near-threshold preset and slider step alignment','390 and 320 px overflow'],scans,errors},null,2));
console.log('MOS transport browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
