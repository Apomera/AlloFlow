const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/semiconductor-enhancement/mos-comparison-notebook-2026-09-19');
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
const panel=page.locator('details.semi-mos-curve'),plot=panel.locator('[data-mos-curve]');
await panel.locator(':scope > summary').click();await plot.waitFor();
const gate=panel.getByRole('slider',{name:'Gate VGS for curve comparison',exact:true});
const note=panel.getByRole('textbox',{name:'Gate comparison explanation',exact:true});
const save=panel.getByRole('button',{name:'Save gate comparison to notebook',exact:true});
const notebook=page.locator('#semiconductor-notebook-preview');
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const scans=[];
async function scan(name){const violations=await page.evaluate(async()=>{const a=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return a.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));});scans.push({name,violations});assert.deepEqual(violations,[],name+' accessibility');}
for(const [name,p] of [['N-MOSFET',1],['P-MOSFET',-1]]){
 await page.getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:'Linear region',exact:true}).click();
 if(!await plot.count()){await panel.locator(':scope > summary').click();await plot.waitFor();}
 await panel.getByRole('button',{name:'Hold this gate as a reference',exact:true}).click();
 await gate.fill(String(4*p));
 await panel.getByRole('slider',{name:'Drain-bias magnitude on the current–voltage curve',exact:true}).fill('5');
 const explanation='Increasing the gate magnitude increased the current magnitude at the same drain bias.';
 await note.fill(explanation);
 await panel.locator(':scope > summary').click();await plot.waitFor({state:'detached'});
 await panel.locator(':scope > summary').click();await plot.waitFor();assert.equal(await note.inputValue(),explanation);
 const live=await page.evaluate(()=>JSON.stringify(semiData.semiconductor));
 await save.click();await panel.getByText('Gate comparison saved to your notebook.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor)),live);
 const captured=await page.evaluate(()=>JSON.stringify(semiSnapshots));
 await gate.fill(String(2*p));
 assert.equal(await panel.getByText('Gate comparison saved to your notebook.',{exact:true}).count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(semiSnapshots)),captured);
 await panel.getByRole('button',{name:'Review saved comparisons',exact:true}).click();
 const savedEntry=notebook.locator('[data-notebook-entry]').filter({has:page.locator('summary').filter({hasText:p===1?'Gate comparison: NMOS':'Gate comparison: PMOS'})}).first();
 await savedEntry.locator(':scope > summary').click();
 assert.ok((await savedEntry.innerText()).includes(p===1?'3.125 mA':'-1.5625 mA'));
 assert.ok((await savedEntry.innerText()).includes(explanation));
 await scan(name+' saved comparison');
 await page.getByRole('button',{name:'2D device diagram',exact:true}).click();
 await savedEntry.getByRole('button',{name:/^Restore Gate comparison:/}).click();
 await plot.waitFor();
 assert.equal(await gate.inputValue(),String(4*p));assert.equal(await note.inputValue(),explanation);
 assert.ok((await panel.innerText()).includes('Reference gate: '+(3*p).toFixed(2)+' V'));
 assert.equal(await page.evaluate(()=>semiData.semiconductor.mosComparisonRestore),null);
 assert.equal(await page.evaluate(()=>JSON.stringify(semiSnapshots)),captured);
 await scan(name+' restored comparison');
 // A second restore while already in 3D replaces the active reference and draft.
 await panel.getByRole('button',{name:'Update reference to this gate',exact:true}).click();
 await note.fill('A different draft.');await gate.fill(String(2*p));
 await savedEntry.getByRole('button',{name:/^Restore Gate comparison:/}).click();
 await page.waitForFunction(v=>window.semiData.semiconductor.gateVoltage===v,4*p);
 assert.equal(await note.inputValue(),explanation);
 assert.ok((await panel.innerText()).includes('Reference gate: '+(3*p).toFixed(2)+' V'));
 await panel.screenshot({path:path.join(out,p===1?'nmos-restored-desktop.png':'pmos-restored-desktop.png')});
 // Once consumed, a restore must not resurrect a reference on later visits.
 await page.getByRole('button',{name:'2D device diagram',exact:true}).click();
 await page.getByRole('button',{name:'3D device cutaway',exact:true}).click();
 await panel.locator(':scope > summary').click();await plot.waitFor();
 assert.equal(await panel.locator('[data-mos-reference]').count(),0);
}
await panel.getByRole('button',{name:'Hold this gate as a reference',exact:true}).click();
await gate.fill('-3');await note.fill('The reference has a larger current magnitude.');
for(const width of [390,320]){
 await page.setViewportSize({width,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow at '+width);
 await panel.screenshot({path:path.join(out,'comparison-notebook-mobile-'+width+'.png')});
}
await scan('mobile comparison capture');
await page.evaluate(()=>semiSet({drainVoltage:1}));await page.waitForFunction(()=>semiData.semiconductor.drainVoltage===1);
assert.equal(await save.isDisabled(),false);
assert.ok((await panel.innerText()).includes('VDS = 0.00 V'));
await save.click();
const last=await page.evaluate(()=>semiSnapshots.at(-1));assert.equal(Object.fromEntries(last.data.recordedEvidence)['Live drain current'],'0 mA');
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks:['save leaves electrical settings unchanged','immutable NMOS and PMOS evidence','explanation survives collapse','notebook review','restore both gates from 2D and existing 3D','one-time restoration does not resurrect stale references','save status clears after changes','saved evidence matches normalized display settings','zero bias saved','390 and 320 px overflow'],scans,errors},null,2));
console.log('MOSFET comparison notebook browser checks passed.');await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
