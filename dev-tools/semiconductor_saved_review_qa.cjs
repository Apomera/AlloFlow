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
await panel.locator('summary').first().click();await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByRole('button',{name:'Compare two samples',exact:true}).click();
await panel.getByLabel('Comparison sample A',{exact:true}).selectOption('2');
await panel.getByLabel('Comparison sample B',{exact:true}).selectOption('8');
await panel.getByLabel('Sweep explanation',{exact:true}).fill('The recorded band gap decreased as the temperature increased.');
await panel.getByRole('button',{name:'Save sweep to notebook',exact:true}).click();
await page.evaluate(()=>{const saved=JSON.parse(JSON.stringify(semiSnapshots[0]));saved.data.parameterSweep.points[10].y=.12345;saved.label='Archived model result';semiSetSnapshots([saved]);});
await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByLabel('Sweep explanation',{exact:true}).fill('Keep my unfinished current experiment.');
await page.evaluate(()=>semiSet({temperature:650,guidedNotes:{memory:'Keep my memory draft'},motionPaused:true}));
const before=await page.evaluate(()=>JSON.stringify({state:semiData.semiconductor,snapshots:semiSnapshots}));
await page.getByRole('button',{name:'Open notebook (1)',exact:true}).click();
const notebook=page.locator('#semiconductor-notebook-preview');await notebook.locator('[data-notebook-entry] > summary').click();
const review=notebook.locator('[data-saved-sweep]');
await review.locator('summary').first().click();
await review.getByText('A: sample 3',{exact:false}).waitFor();
const activeBefore=await page.evaluate(()=>JSON.stringify({temperature:semiData.semiconductor.temperature,sweeps:semiData.semiconductor.experimentSweeps,notes:semiData.semiconductor.guidedNotes,paused:semiData.semiconductor.motionPaused,snapshots:semiSnapshots}));
await review.getByLabel('Review sample',{exact:true}).selectOption('10');
await review.getByRole('status').getByText('0.12345 eV',{exact:false}).waitFor();
assert.equal(await page.evaluate(()=>JSON.stringify({temperature:semiData.semiconductor.temperature,sweeps:semiData.semiconductor.experimentSweeps,notes:semiData.semiconductor.guidedNotes,paused:semiData.semiconductor.motionPaused,snapshots:semiSnapshots})),activeBefore);
await scan('archived values and comparison');
await review.screenshot({path:path.join(out,'saved-sweep-review-desktop.png')});
await review.getByLabel('Review sample',{exact:true}).focus();await page.keyboard.press('Home');
assert.equal(await review.getByLabel('Review sample',{exact:true}).inputValue(),'0');
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'saved review mobile overflow');
await review.screenshot({path:path.join(out,'saved-sweep-review-mobile.png')});
await scan('mobile archived review');
await page.evaluate(()=>{const saved=JSON.parse(JSON.stringify(semiSnapshots[0]));saved.id='bad-archive';saved.label='Incomplete archive';saved.data.parameterSweep.points=[];saved.data.recordedEvidence=[['Legacy reading','1.23 eV']];semiSetSnapshots(prev=>prev.concat(saved));});
const malformed=notebook.locator('[data-notebook-entry]').filter({hasText:'Incomplete archive'});
await malformed.locator(':scope > summary').click();await malformed.getByText('incomplete or unsupported',{exact:false}).waitFor();await malformed.getByText('1.23 eV',{exact:true}).waitFor();await scan('incomplete archive');
await page.locator('#semiconductor-simulation-select').selectOption('solarcell');
await panel.locator('summary').first().click();await panel.getByRole('button',{name:'Run sweep',exact:true}).click();
await panel.getByLabel('Sweep explanation',{exact:true}).fill('The selected load delivered less power than the matched load reference.');
await panel.getByRole('button',{name:'Save sweep to notebook',exact:true}).click();
await page.getByRole('button',{name:'Open notebook (3)',exact:true}).click();
const solarEntry=notebook.locator('[data-notebook-entry]').filter({hasText:'Sweep: Solar Cell'});
await solarEntry.locator('summary').first().click();
const solarReview=solarEntry.locator('[data-saved-sweep]');await solarReview.locator('summary').first().click();
await solarReview.getByLabel('Review sample',{exact:true}).selectOption('10');await solarReview.getByRole('status').getByText('Available maximum power',{exact:false}).waitFor();await scan('solar archived reference');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'solar archive mobile overflow');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'saved-review-accessibility.json'),JSON.stringify(accessibility,null,2));assert.ok(accessibility.every(r=>!r.violations.length),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'saved-review-browser.json'),JSON.stringify({passed:true,checks:['recorded values without rerun','saved comparison pair','live state and draft preservation','keyboard selection','mobile overflow','incomplete archives','solar reference curve','four WCAG variants'],errors},null,2));
console.log('Saved sweep review browser checks passed.');await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
