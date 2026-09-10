const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/semiconductor-enhancement');
(async()=>{
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.setContent('<!doctype html><html lang="en"><head><title>Semiconductor Lab verification</title></head><body><main id="root"></main></body></html>');
const cssDir=path.join(root,'app/static/css'),cssFiles=fs.readdirSync(cssDir).filter(f=>/^main\..*\.css$/.test(f));
assert.equal(cssFiles.length,1,'Expected one current built main stylesheet');
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
    window.semiData=data;window.semiSnapshots=snapshots;window.semiSetSnapshots=setSnapshots;window.semiSet=patch=>setData(p=>({semiconductor:{...p.semiconductor,...patch}}));
    return window.StemLab._registry.semiconductor.render({
      React:R,toolData:data,setToolData:setData,setStemLabTool:noop,stemLabTool:'semiconductor',toolSnapshots:snapshots,setToolSnapshots:setSnapshots,
      addToast:noop,icons,t:(k,f)=>f||k,gradeLevel:'11th Grade',props:{},srOnly:{position:'absolute',width:1,height:1,overflow:'hidden'},
      a11yClick:fn=>({onClick:fn}),announceToSR:noop,canvasNarrate:noop,awardXP:noop,getXP:()=>0
    });
  }
  window.semiRoot=ReactDOM.createRoot(document.getElementById('root'));window.semiRoot.render(h(App));
});





await page.locator('#semi-bandgap-canvas').waitFor();
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
async function scan(variant){const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});accessibility.push({variant,violations});}
const panel=page.locator('[data-parameter-sweep]');
await panel.locator('summary').first().click();
await panel.getByLabel('Your sweep prediction (optional)',{exact:true}).fill('Heating will reduce the band gap.');
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.temperature),300);
assert.equal(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.bandgap.run.points.length),11);
await panel.getByText('All 11 readings and inspection buttons',{exact:true}).click();
await panel.getByRole('button',{name:'Apply sample 11: 500 K',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.temperature),500);
await panel.getByLabel('Sweep explanation',{exact:true}).fill('At 200 K the band gap was larger than at 500 K, with silicon held fixed.');
await panel.getByRole('button',{name:'Save sweep to notebook',exact:true}).click();
const saved=await page.evaluate(()=>semiSnapshots.at(-1));
assert.equal(saved.data.parameterSweep.points.length,11);
assert.equal(saved.data.recordedEvidence.length,17);
assert.equal(saved.data.guidedPrediction,'Heating will reduce the band gap.');
assert.equal(saved.data.temperature,300,'saved baseline settings');
await page.evaluate(()=>semiSet({material:'germanium',temperature:600,solarIrradiance:0,guidedNotes:{memory:'Preserve memory draft'}}));
await panel.getByText('The simulation’s fixed settings have changed.',{exact:false}).waitFor();
await panel.getByRole('button',{name:'Apply sample 1: 200 K',exact:true}).click();
assert.deepEqual(await page.evaluate(()=>({material:semiData.semiconductor.material,temp:semiData.semiconductor.temperature,solar:semiData.semiconductor.solarIrradiance,draft:semiData.semiconductor.guidedNotes.memory})),{material:'silicon',temp:200,solar:0,draft:'Preserve memory draft'});
assert.equal(await page.evaluate(()=>semiSnapshots.at(-1).data.parameterSweep.baseline.x),300);
await panel.getByLabel('Plot quantity',{exact:true}).selectOption('intrinsic');
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByText('Logarithmic y-axis.',{exact:false}).waitFor();
await scan('carrier logarithmic sweep');
await panel.screenshot({path:path.join(out,'sweep-carriers-desktop.png')});
await panel.getByLabel('Sweep start (K)',{exact:true}).fill('');
assert.ok(await panel.getByRole('button',{name:'Run sweep',exact:true}).isDisabled());
await panel.getByLabel('Sweep start (K)',{exact:true}).fill('200');
await page.locator('#semiconductor-simulation-select').selectOption('pnjunction');
await panel.locator('summary').first().click();
await panel.getByLabel('Sweep end (V)',{exact:true}).fill('1');
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByText('All 11 readings and inspection buttons',{exact:true}).click();
await panel.getByRole('table').getByText('Not calculated',{exact:false}).first().waitFor();
assert.equal(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.pnjunction.run.points.at(-1).y),null);
await scan('PN limits');
await panel.screenshot({path:path.join(out,'sweep-pn-desktop.png')});
await page.locator('#semiconductor-simulation-select').selectOption('transistor');
await page.getByRole('button',{name:'P-MOSFET',exact:true}).click();
await page.getByRole('button',{name:'3D device cutaway',exact:true}).click();
await panel.locator('summary').first().click();
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.transistor.run.points[0].y<0));
await panel.getByLabel('Inspect sample',{exact:true}).focus();
await page.keyboard.press('ArrowRight');
assert.equal(await page.evaluate(()=>semiData.semiconductor.gateVoltage),-4.5);
assert.equal(await page.evaluate(()=>semiData.semiconductor.deviceView),'3d');
await scan('P-channel linked 3D');
await page.setViewportSize({width:390,height:844});
await panel.getByText('All 11 readings and inspection buttons',{exact:true}).click();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
await panel.screenshot({path:path.join(out,'sweep-transistor-mobile.png')});
await page.getByRole('button',{name:'NPN BJT',exact:true}).click();
await panel.getByText('Select N-MOSFET or P-MOSFET in the simulation to sweep gate voltage.',{exact:false}).waitFor();
assert.equal(await panel.getByRole('button',{name:'Run sweep',exact:true}).count(),0);
await panel.getByRole('table').waitFor();
await scan('qualitative device with saved run');
await page.locator('#semiconductor-simulation-select').selectOption('bandgap');
await panel.locator('summary').first().click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.bandgap.run.output.id),'intrinsic');
await page.getByRole('button',{name:'Open notebook (1)',exact:true}).click();
const notebook=page.locator('#semiconductor-notebook-preview');
await notebook.locator('[data-notebook-entry] > summary').click();
await notebook.getByRole('table',{name:'Evidence recorded at save time',exact:true}).getByText('Sample 11 · Temperature = 500 K',{exact:true}).waitFor();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'notebook sweep mobile overflow');
await scan('sweep notebook');
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'sweeps-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.ok(accessibility.every(r=>!r.violations.length),JSON.stringify(accessibility,null,2));
fs.writeFileSync(path.join(out,'sweeps-browser.json'),JSON.stringify({passed:true,checks:['run without live mutation','eleven samples','prediction capture','notebook evidence','held-setting restore','immutable run','logarithmic axis','invalid input','PN model gaps','signed P-channel current','keyboard link to 3D','mobile overflow','qualitative-mode guard','per-lesson persistence','five WCAG variants'],errors},null,2));
console.log('Controlled sweep browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
