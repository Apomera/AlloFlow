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
    window.semiData=data;window.semiSnapshots=snapshots;window.semiSet=patch=>setData(p=>({semiconductor:{...p.semiconductor,...patch}}));
    return window.StemLab._registry.semiconductor.render({
      React:R,toolData:data,setToolData:setData,setStemLabTool:noop,stemLabTool:'semiconductor',toolSnapshots:snapshots,setToolSnapshots:setSnapshots,
      addToast:noop,icons,t:(k,f)=>f||k,gradeLevel:'11th Grade',props:{},srOnly:{position:'absolute',width:1,height:1,overflow:'hidden'},
      a11yClick:fn=>({onClick:fn}),announceToSR:noop,canvasNarrate:noop,awardXP:noop,getXP:()=>0
    });
  }
  window.semiRoot=ReactDOM.createRoot(document.getElementById('root'));window.semiRoot.render(h(App));
});



await page.locator('#semi-bandgap-canvas').waitFor();
await page.locator('#semiconductor-simulation-select').selectOption('moorelaw');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
const canvas=page.locator('#semi-moore-canvas'),ws=page.locator('.semi-workspace');
assert.match(await canvas.getAttribute('aria-label'),/NVIDIA B200, 208 billion/);
const initial=await canvas.evaluate(c=>c.toDataURL());
await page.getByRole('button',{name:'Linear scale',exact:true}).click();
assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),initial);
assert.match(await canvas.getAttribute('aria-label'),/linear scale/);
await ws.screenshot({path:path.join(out,'moore-linear-desktop.png')});
await page.getByRole('button',{name:'Log scale',exact:true}).click();
await page.getByRole('slider',{name:'Year',exact:true}).fill('2023');
await ws.getByText('2023 · No product entry for this year',{exact:true}).waitFor();
assert.doesNotMatch(await canvas.getAttribute('aria-label'),/NVIDIA B200/);
await page.getByRole('button',{name:'Next product',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Year',exact:true}).inputValue(),'2024');
await page.getByLabel('Include products with two compute dies',{exact:true}).uncheck();
await ws.getByText('2024 · Product excluded by die filter',{exact:true}).waitFor();
assert.ok(await page.getByRole('button',{name:'Next product',exact:true}).isDisabled());
assert.equal(await ws.getByRole('table').locator('tbody tr').count(),6);
assert.ok(await ws.getByRole('button',{name:'Inspect NVIDIA B200',exact:true}).count()===0);
await page.getByRole('button',{name:'Previous product',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Year',exact:true}).inputValue(),'2021');
await page.getByRole('button',{name:'Inspect M1 Ultra',exact:true}).click();
assert.ok(await page.getByLabel('Include products with two compute dies',{exact:true}).isChecked());
assert.equal(await page.getByRole('slider',{name:'Year',exact:true}).inputValue(),'2022');
await ws.screenshot({path:path.join(out,'moore-package-desktop.png')});
await page.getByRole('button',{name:'1-year experiment',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Doubling interval',exact:true}).inputValue(),'1');
await page.getByRole('button',{name:'4-year experiment',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Doubling interval',exact:true}).inputValue(),'4');
await page.getByRole('slider',{name:'Doubling interval',exact:true}).fill('2.5');
assert.equal(await page.evaluate(()=>semiData.semiconductor.mooreDoubling),2.5);
await page.getByRole('slider',{name:'Year',exact:true}).fill('2030');
await ws.getByText('2030 · Scenario only · dataset ends in 2024',{exact:true}).waitFor();
const shown=await canvas.evaluate(c=>c.toDataURL());
await page.getByLabel('Show doubling reference',{exact:true}).uncheck();
assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),shown);
assert.match(await canvas.getAttribute('aria-label'),/Reference line hidden/);
await page.getByLabel('Show doubling reference',{exact:true}).check();
await page.locator('#semi-prediction').fill('The 2030 value is a calculation from the doubling assumption, not a measured product.');
await page.locator('#semiconductor-guided-observation').fill('At 2030 there is no reported product. Changing the doubling interval to 2.5 years changes the reference without adding any measured data.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
const evidence=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence.observed);
assert.equal(evidence.find(r=>r[0]==='Product')[1],'No entry');
assert.equal(evidence.find(r=>r[0]==='Reported count')[1],'Not compared');
assert.equal(evidence.find(r=>r[0]==='Doubling interval')[1],'2.5 years');
await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'The product contains twice as many transistors; density need not change',exact:true}).click();
await page.getByText('Yes. Combining dies increases the product total',{exact:false}).waitFor();
await ws.screenshot({path:path.join(out,'moore-scenario-desktop.png')});
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
for(const variant of [
 {name:'log all',mooreYear:2024,mooreLogScale:true,mooreIncludeMulti:true,mooreDoubling:2,mooreShowPred:true},
 {name:'linear all',mooreLogScale:false},
 {name:'linear single-die',mooreIncludeMulti:false},
 {name:'log single-die',mooreLogScale:true},
 {name:'annual reference',mooreDoubling:1},
 {name:'four-year reference',mooreDoubling:4},
 {name:'scenario only',mooreYear:2030},
 {name:'historical gap',mooreYear:1965}
]){
 await page.evaluate(v=>semiSet(v),variant);
 await page.waitForFunction(v=>semiData.semiconductor.mooreYear===(v.mooreYear??semiData.semiconductor.mooreYear),variant);
 const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 accessibility.push({variant:variant.name,violations});
}
await page.getByRole('button',{name:'Reload baseline',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Doubling interval',exact:true}).inputValue(),'2');
assert.ok(await page.getByLabel('Include products with two compute dies',{exact:true}).isChecked());
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'log mobile overflow');
await ws.screenshot({path:path.join(out,'moore-log-mobile.png')});
await page.getByRole('button',{name:'Linear scale',exact:true}).click();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'linear mobile overflow');
await ws.screenshot({path:path.join(out,'moore-linear-mobile.png')});
await page.getByRole('button',{name:'Inspect Intel 4004',exact:true}).click();
assert.match(await canvas.getAttribute('aria-label'),/2,300 transistors/);
await page.getByRole('button',{name:'Connect to Wafer Fab',exact:true}).click();
await page.locator('#semi-fab-canvas').waitFor();
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'moore-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.ok(accessibility.every(a=>a.violations.length===0),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'moore-browser.json'),JSON.stringify({passed:true,checks:['working chart scales','exact-year gaps','die scope filter','product navigation','package comparison','doubling presets and slider','line visibility','future evidence','misconception check','eight WCAG variants','mobile overflow','guided baseline reload','connected fabrication lesson'],errors},null,2));
console.log('Moore lesson browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
