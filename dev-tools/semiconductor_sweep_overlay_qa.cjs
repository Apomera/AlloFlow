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
async function scan(variant){const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact}));});accessibility.push({variant,violations});}
const panel=page.locator('[data-parameter-sweep]');
await panel.locator('summary').first().click();
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByLabel('Sweep explanation',{exact:true}).fill('The silicon band gap decreased as temperature increased.');
await panel.getByRole('button',{name:'Save sweep to notebook',exact:true}).click();
await page.evaluate(()=>semiSet({material:'germanium'}));
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByLabel('Sweep explanation',{exact:true}).fill('Germanium had a lower band gap across the same temperature samples.');
await panel.getByRole('button',{name:'Save sweep to notebook',exact:true}).click();
await page.getByRole('button',{name:'Open notebook (2)',exact:true}).click();
const notebook=page.locator('#semiconductor-notebook-preview');
const entries=notebook.locator('[data-notebook-entry]');
for(let i=0;i<2;i++){await entries.nth(i).locator(':scope > summary').click();await entries.nth(i).getByRole('checkbox').check();}
const overlay=notebook.locator('[data-sweep-overlay]');
await overlay.locator(':scope > summary').click();
await overlay.getByText('11 exactly shared input values.',{exact:false}).waitFor();
await overlay.getByText('One recorded fixed setting differs.',{exact:false}).waitFor();
await overlay.getByText('Read overlay values',{exact:true}).click();
const original=await page.evaluate(()=>JSON.stringify({snapshots:semiSnapshots,temperature:semiData.semiconductor.temperature,material:semiData.semiconductor.material,sweep:semiData.semiconductor.experimentSweeps}));
await overlay.screenshot({path:path.join(out,'sweep-overlay-desktop.png')});
await scan('material overlay');
assert.equal(await page.evaluate(()=>JSON.stringify({snapshots:semiSnapshots,temperature:semiData.semiconductor.temperature,material:semiData.semiconductor.material,sweep:semiData.semiconductor.experimentSweeps})),original);
async function pair(kind){await page.evaluate(kind=>{
const c=window.__SemiconductorCore,mat={silicon:{name:'Si',bandGap:1.12,ni:1.5e10}},solar={silicon:{name:'Si',eff:.22,Voc:.72}};
let a={subtool:'bandgap'},b={subtool:'bandgap'},oa={},ob={};
if(kind==='partial'){oa={start:200,end:500};ob={start:350,end:650};}
if(kind==='log'){oa={output:'intrinsic'};ob={output:'intrinsic',start:300,end:600};}
if(kind==='solar'){a={subtool:'solarcell',solarLoadR:.2};b={subtool:'solarcell',solarLoadR:1,solarArea:250};}
if(kind==='mismatch'){oa={output:'intrinsic'};}
if(kind==='pn'){a=b={subtool:'pnjunction'};oa=ob={start:-1,end:1};}
const snaps=[a,b].map((state,i)=>{const run=c.sweepRun(state,i?ob:oa,mat,solar);const saved=c.capture(state,'Run '+(i?'B':'A'),c.sweepEvidence(run));saved.data.parameterSweep=run;return saved;});
semiSetSnapshots(snaps);semiSet({notebookCompare:c.notebookEntries(snaps).map(e=>e.key)});
},kind);if(kind!=='mismatch'){await overlay.waitFor();if(!await overlay.evaluate(e=>e.open))await overlay.locator(':scope > summary').click();}}
await pair('partial');await overlay.getByText('6 exactly shared input values.',{exact:false}).waitFor();
if(!await overlay.getByText('Read overlay values',{exact:true}).evaluate(e=>e.parentElement.open))await overlay.getByText('Read overlay values',{exact:true}).click();
await overlay.getByRole('cell',{name:'Not sampled',exact:true}).first().waitFor();await scan('partially shared ranges');
await pair('log');await overlay.getByText('logarithmic output scale',{exact:false}).waitFor();await scan('logarithmic overlay');
await pair('pn');await overlay.getByRole('cell',{name:'Outside model',exact:true}).first().waitFor();await scan('missing output overlay');
await pair('solar');await overlay.getByText('2 recorded fixed settings differ.',{exact:false}).waitFor();await overlay.getByText('delivered power only',{exact:false}).waitFor();
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overlay mobile overflow');
await overlay.screenshot({path:path.join(out,'sweep-overlay-solar-mobile.png')});await scan('solar changed conditions mobile');
await pair('mismatch');await notebook.locator('[data-sweep-overlay-message]').getByText('same input variable',{exact:false}).waitFor();assert.equal(await overlay.count(),0);await scan('incompatible quantities');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'sweep-overlay-accessibility.json'),JSON.stringify(accessibility,null,2));assert.ok(accessibility.every(r=>!r.violations.length),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'sweep-overlay-browser.json'),JSON.stringify({passed:true,checks:['two saved sweep selections','shared axes','changed conditions','unmodified simulation and snapshots','exact shared input table','logarithmic scale','missing samples','solar primary curve','incompatible output guard','mobile overflow','six WCAG variants'],errors},null,2));
console.log('Saved sweep overlay browser checks passed.');await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
