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






await page.locator('#semiconductor-simulation-select').selectOption('solarcell');
await page.evaluate(()=>semiSet({solarLoadR:.2,solarIrradiance:900,solarTemp:300,solarArea:100,solarOpen:false}));
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
async function scan(variant){const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});accessibility.push({variant,violations});}
const panel=page.locator('[data-parameter-sweep="solarcell"]');
await panel.locator('summary').first().click();
await panel.getByLabel('Your sweep prediction (optional)',{exact:true}).fill('With a fixed resistor, delivered power may differ from the available maximum.');
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.solarIrradiance),900,'run leaves live state unchanged');
assert.equal(await panel.locator('[data-sweep-reference]').count(),1);
await panel.getByText('All 11 readings and inspection buttons',{exact:true}).click();
await panel.getByRole('button',{name:'Apply sample 1: 0 W/m²',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.solarIrradiance),0);
await panel.locator('[data-solar-sweep-reading]').getByText('percentage is not defined',{exact:false}).waitFor();
await panel.getByRole('button',{name:'Apply sample 11: 1200 W/m²',exact:true}).click();
await panel.getByLabel('Sweep explanation',{exact:true}).fill('The fixed resistor delivered less than the available maximum, while both powers were zero without light.');
await panel.getByRole('button',{name:'Save sweep to notebook',exact:true}).click();
const saved=await page.evaluate(()=>semiSnapshots.at(-1));
assert.equal(saved.data.recordedEvidence.length,30);
assert.equal(saved.data.parameterSweep.points.length,11);
assert.equal(saved.data.parameterSweep.baseline.x,900);
assert.ok(saved.data.parameterSweep.points.at(-1).reference>saved.data.parameterSweep.points.at(-1).y);
await scan('solar irradiance comparison');
await panel.locator('svg').screenshot({path:path.join(out,'solar-sweep-power-plot-desktop.png')});
await panel.screenshot({path:path.join(out,'solar-sweep-desktop.png')});
await panel.getByLabel('Variable to sweep',{exact:true}).selectOption('temperature');
assert.equal(await panel.getByLabel('Sweep start (K)',{exact:true}).inputValue(),'270');
assert.equal(await panel.getByLabel('Sweep end (K)',{exact:true}).inputValue(),'370');
await panel.getByText('Run again to replace the recorded irradiance sweep.',{exact:false}).waitFor();
assert.equal(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.solarcell.run.field),'solarIrradiance');
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.solarcell.run.settings.solarIrradiance),1200);
await panel.getByLabel('Inspect sample',{exact:true}).focus();
await page.keyboard.press('End');
assert.equal(await page.evaluate(()=>semiData.semiconductor.solarTemp),370);
assert.equal(await page.evaluate(()=>semiData.semiconductor.solarIrradiance),1200);
await scan('solar temperature comparison');
await page.evaluate(()=>semiSet({solarMaterial:'tandem',solarArea:250,solarLoadR:5,solarOpen:true,gateVoltage:4,motionPaused:true,guidedNotes:{memory:'Keep this memory note'}}));
await panel.getByText('The simulation’s fixed settings have changed.',{exact:false}).waitFor();
await panel.getByRole('button',{name:'Apply sample 1: 270 K',exact:true}).click();
assert.deepEqual(await page.evaluate(()=>({material:semiData.semiconductor.solarMaterial,area:semiData.semiconductor.solarArea,load:semiData.semiconductor.solarLoadR,open:semiData.semiconductor.solarOpen,temp:semiData.semiconductor.solarTemp,gate:semiData.semiconductor.gateVoltage,note:semiData.semiconductor.guidedNotes.memory})),{material:'silicon',area:100,load:.2,open:false,temp:270,gate:4,note:'Keep this memory note'});
assert.equal(await page.evaluate(()=>semiSnapshots[0].data.parameterSweep.baseline.x),900);
await page.evaluate(()=>semiSet({solarOpen:true}));
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.solarcell.run.points.every(p=>p.y===0&&p.reference>0)));
await scan('open circuit power comparison');
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'solar mobile overflow');
await panel.locator('svg').screenshot({path:path.join(out,'solar-sweep-open-plot-mobile.png')});
await panel.screenshot({path:path.join(out,'solar-sweep-mobile.png')});
await page.evaluate(()=>semiSet({solarOpen:false,solarLoadR:0}));
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.solarcell.run.points.every(p=>p.y===0&&p.voltage===0&&p.reference>0)));
await page.evaluate(()=>semiSet({solarIrradiance:0}));
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.experimentSweeps.solarcell.run.points.every(p=>p.y===0&&p.reference===0&&p.fraction===null)));
await scan('no-light temperature sweep');
await page.getByRole('button',{name:'Open notebook (1)',exact:true}).click();
const notebook=page.locator('#semiconductor-notebook-preview');
await notebook.locator('[data-notebook-entry] > summary').click();
await notebook.getByText('Sample 11 · Available maximum power',{exact:true}).waitFor();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'solar notebook mobile overflow');
const downloadPromise=page.waitForEvent('download');
await notebook.getByRole('button',{name:'Export filtered entries (.md)',exact:true}).click();
const download=await downloadPromise;await download.saveAs(path.join(out,'solar-sweep-notebook-export.md'));
const markdown=fs.readFileSync(path.join(out,'solar-sweep-notebook-export.md'),'utf8');
assert.match(markdown,/Available maximum power/);assert.match(markdown,/Reference baseline/);assert.match(markdown,/load voltage/);assert.match(markdown,/fixed resistor/);
await scan('solar notebook evidence');
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'solar-sweeps-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.ok(accessibility.every(r=>!r.violations.length),JSON.stringify(accessibility,null,2));
fs.writeFileSync(path.join(out,'solar-sweeps-browser.json'),JSON.stringify({passed:true,checks:['paired power curves','zero light','variable switching','keyboard sample selection','fixed-setting restoration','open circuit','short circuit','mobile overflow','immutable recorded runs','both curves in notebook and Markdown export','five WCAG variants'],errors},null,2));
console.log('Solar sweep browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
