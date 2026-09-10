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
const panel=page.locator('[data-parameter-sweep]'),comparison=page.locator('[data-sweep-comparison]');
async function openRun(){await panel.locator('summary').first().click();await panel.getByRole('button',{name:'Run sweep',exact:true}).click();await comparison.getByRole('button',{name:'Compare two samples',exact:true}).click();}
await panel.locator('summary').first().click();
await panel.getByLabel('Plot quantity',{exact:true}).selectOption('intrinsic');
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByLabel('Sweep explanation',{exact:true}).fill('My explanation should survive choosing a different comparison.');
await comparison.getByRole('button',{name:'Compare two samples',exact:true}).click();
const temperature=await page.evaluate(()=>semiData.semiconductor.temperature);
await comparison.getByLabel('Comparison sample A',{exact:true}).selectOption('2');
await comparison.getByLabel('Comparison sample B',{exact:true}).selectOption('8');
assert.equal(await page.evaluate(()=>semiData.semiconductor.temperature),temperature);
assert.match(await panel.getByLabel('Sweep explanation',{exact:true}).inputValue(),/My explanation should survive/);
await comparison.getByText('equal vertical distances represent equal ratios',{exact:false}).waitFor();
await scan('logarithmic comparison');await comparison.screenshot({path:path.join(out,'sample-comparison-desktop.png')});
await panel.getByRole('button',{name:'Save sweep to notebook',exact:true}).click();
const saved=await page.evaluate(()=>semiSnapshots.at(-1));assert.equal(saved.data.sweepComparison.aIndex,2);assert.equal(saved.data.sweepComparison.bIndex,8);assert.equal(saved.data.recordedEvidence.length,21);
await comparison.getByLabel('Comparison sample B',{exact:true}).selectOption('2');
await comparison.getByText('Choose different samples for A and B.',{exact:true}).waitFor();await scan('duplicate selection');
await comparison.getByLabel('Comparison sample B',{exact:true}).selectOption('9');
assert.equal(await page.evaluate(()=>semiSnapshots[0].data.sweepComparison.bIndex),8);
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
assert.equal(await comparison.getByLabel('Comparison sample A',{exact:true}).count(),0);
await page.locator('#semiconductor-simulation-select').selectOption('pnjunction');
await panel.locator('summary').first().click();await panel.getByLabel('Sweep end (V)',{exact:true}).fill('1');await panel.getByRole('button',{name:'Run sweep',exact:true}).click();await comparison.getByRole('button',{name:'Compare two samples',exact:true}).click();
await comparison.getByText('A reading is outside the model.',{exact:true}).waitFor();await scan('missing value');
await page.locator('#semiconductor-simulation-select').selectOption('transistor');await page.getByRole('button',{name:'P-MOSFET',exact:true}).click();await openRun();
await comparison.getByLabel('Comparison sample B',{exact:true}).selectOption('2');await comparison.getByText('A more negative current can have a larger magnitude.',{exact:false}).waitFor();await scan('signed current');
await page.locator('#semiconductor-simulation-select').selectOption('solarcell');await page.evaluate(()=>semiSet({solarOpen:true}));await openRun();
await comparison.getByLabel('Comparison sample A',{exact:true}).selectOption('1');assert.equal(await comparison.getByRole('table').count(),2);
await comparison.getByText('Relative change is undefined because A is zero.',{exact:true}).waitFor();
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');await comparison.screenshot({path:path.join(out,'sample-comparison-solar-mobile.png')});await scan('solar dual comparison');
await page.getByRole('button',{name:'Open notebook (1)',exact:true}).click();const notebook=page.locator('#semiconductor-notebook-preview');await notebook.locator('[data-notebook-entry] > summary').click();await notebook.getByText('Comparison A',{exact:true}).waitFor();
const downloadPromise=page.waitForEvent('download');await notebook.getByRole('button',{name:'Export filtered entries (.md)',exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(out,'sample-comparison-export.md'));
const md=fs.readFileSync(path.join(out,'sample-comparison-export.md'),'utf8');assert.match(md,/Comparison A/);assert.match(md,/Sample 3/);assert.match(md,/Sample 9/);assert.match(md,/B − A/);
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'sample-comparison-accessibility.json'),JSON.stringify(accessibility,null,2));assert.ok(accessibility.every(r=>!r.violations.length),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'sample-comparison-browser.json'),JSON.stringify({passed:true,errors},null,2));console.log('Sample comparison browser checks passed.');await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
