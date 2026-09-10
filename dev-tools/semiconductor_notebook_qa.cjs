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
const notebook=page.locator('#semiconductor-notebook-preview');
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
async function scan(name){const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});accessibility.push({variant:name,violations});}
await page.getByRole('button',{name:'Open notebook (0)',exact:true}).click();
await notebook.getByText('Your notebook is empty.',{exact:false}).waitFor();
await scan('empty notebook');
await page.getByText('Choose a question / learning route',{exact:true}).click();
await page.getByRole('button',{name:'How do materials control charge?',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.subtool),'bandgap');
await page.getByRole('button',{name:'Continue route: Band Gap',exact:true}).click();
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.evaluate(()=>semiSet({temperature:500}));
await page.locator('#semi-prediction').fill('A hotter sample will have more intrinsic carriers.');
await page.locator('#semiconductor-guided-observation').fill('Increasing the temperature changed the band gap and intrinsic carrier estimate in the shared model.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
await page.getByText('1 / 4 lessons with saved explanations.',{exact:false}).waitFor();
await page.getByRole('button',{name:'Next workspace →',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.subtool),'doping');
await page.locator('#semiconductor-simulation-select').selectOption('solarcell');
await page.evaluate(()=>semiSet({solarIrradiance:0,solarArea:100,solarTemp:300}));
await page.locator('.semi-snapshot').click();
let saved=await page.evaluate(()=>semiSnapshots.at(-1));
assert.equal(saved.data.solarIrradiance,0);
assert.match(saved.label,/Irradiance: 0 W/);
assert.equal(saved.data.recordedEvidence.find(r=>r[0]==='Delivered power')[1],'0.000 W');
await page.evaluate(()=>semiSet({solarIrradiance:1000}));
await page.locator('.semi-snapshot').click();
await page.getByRole('button',{name:'Open notebook (3)',exact:true}).click();
await page.getByLabel('Filter notebook by lesson',{exact:true}).selectOption('solarcell');
let entries=notebook.locator('[data-notebook-entry]');
assert.equal(await entries.count(),2);
for(let i=0;i<2;i++){await entries.nth(i).locator(':scope > summary').click();await entries.nth(i).getByRole('checkbox').check();}
await notebook.getByRole('table',{name:'Recorded values · no recalculation',exact:true}).waitFor();
let powerRow=notebook.getByRole('table',{name:'Recorded values · no recalculation',exact:true}).getByRole('row').filter({hasText:'Delivered power'});
assert.match(await powerRow.innerText(),/0\.000 W/);
await notebook.screenshot({path:path.join(out,'notebook-comparison-desktop.png')});
await scan('same-lesson comparison');
await page.evaluate(()=>semiSet({ampVin:.15,gateVoltage:4,guidedNotes:{memory:'Keep my unfinished memory explanation'},motionPaused:true}));
await entries.nth(1).getByRole('button',{name:/Restore /}).click();
assert.deepEqual(await page.evaluate(()=>({solar:semiData.semiconductor.solarIrradiance,amp:semiData.semiconductor.ampVin,gate:semiData.semiconductor.gateVoltage,draft:semiData.semiconductor.guidedNotes.memory,paused:semiData.semiconductor.motionPaused})),{solar:0,amp:.15,gate:4,draft:'Keep my unfinished memory explanation',paused:true});
assert.equal(await page.evaluate(()=>semiSnapshots[1].data.solarIrradiance),0);
await page.getByRole('button',{name:'Open notebook (3)',exact:true}).click();
const downloadPromise=page.waitForEvent('download');
await notebook.getByRole('button',{name:'Export filtered entries (.md)',exact:true}).click();
const download=await downloadPromise;await download.saveAs(path.join(out,'notebook-export.md'));
const markdown=fs.readFileSync(path.join(out,'notebook-export.md'),'utf8');
assert.match(markdown,/0\.000 W/);assert.match(markdown,/Solar Cell/);assert.doesNotMatch(markdown,/Keep my unfinished/);assert.doesNotMatch(markdown,/Guided: Band/);
await page.locator('#semiconductor-simulation-select').selectOption('amplifier');
await page.evaluate(()=>semiSet({ampVin:0}));
await page.locator('.semi-snapshot').click();
saved=await page.evaluate(()=>semiSnapshots.at(-1));assert.match(saved.label,/Input amplitude: 0 V/);
await page.getByRole('button',{name:'Open notebook (4)',exact:true}).click();
await page.getByLabel('Filter notebook by lesson',{exact:true}).selectOption('all');
entries=notebook.locator('[data-notebook-entry]');
for(let i=0;i<2;i++){if(!await entries.nth(i).evaluate(e=>e.open))await entries.nth(i).locator(':scope > summary').click();await entries.nth(i).getByRole('checkbox').check();}
await notebook.getByText('Choose two entries from the same lesson.',{exact:false}).waitFor();
await scan('cross-lesson guard');
await page.evaluate(()=>semiSetSnapshots(p=>p.concat([{id:'legacy-led',tool:'semiconductor',label:'Legacy LED at zero',data:{subtool:'ledspec',ledCurrent:0}},{tool:'semiconductor',label:'Older unknown state'}])));
await page.getByLabel('Filter notebook by lesson',{exact:true}).selectOption('ledspec');
entries=notebook.locator('[data-notebook-entry]');
assert.equal(await entries.count(),1);
await entries.first().locator(':scope > summary').click();
await notebook.getByText('No numerical evidence was stored with this older entry.',{exact:true}).waitFor();
await scan('legacy notebook');
await entries.first().getByRole('button',{name:'Restore Legacy LED at zero',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.ledCurrent),0);
assert.equal(await page.evaluate(()=>semiData.semiconductor.subtool),'ledspec');
await page.getByRole('button',{name:'Open notebook (6)',exact:true}).click();
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'notebook mobile overflow');
await notebook.screenshot({path:path.join(out,'notebook-legacy-mobile.png')});
await page.getByLabel('Filter notebook by lesson',{exact:true}).selectOption('solarcell');
entries=notebook.locator('[data-notebook-entry]');
for(let i=0;i<2;i++){if(!await entries.nth(i).evaluate(e=>e.open))await entries.nth(i).locator(':scope > summary').click();await entries.nth(i).getByRole('checkbox').check();}
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'comparison mobile overflow');
await notebook.screenshot({path:path.join(out,'notebook-comparison-mobile.png')});
await page.getByRole('button',{name:'How does a chip switch, calculate and remember?',exact:true}).click();
await page.getByRole('button',{name:'Continue route: Transistor',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.subtool),'transistor');
await page.locator('[data-learning-routes]').screenshot({path:path.join(out,'learning-route-mobile.png')});
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'notebook-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.ok(accessibility.every(a=>a.violations.length===0),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'notebook-browser.json'),JSON.stringify({passed:true,checks:['empty state','route selection without reset','guided route progress','route next lesson','zero-value snapshots','same-lesson comparison','scoped restore preserves drafts and other lessons','Markdown download','cross-lesson guard','legacy restoration','mobile layout','four WCAG variants'],errors},null,2));
console.log('Notebook and learning-route browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
