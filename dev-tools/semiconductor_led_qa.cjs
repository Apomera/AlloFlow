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
await page.addStyleTag({path:path.join(root,'app/static/css/main.01e7c1d9.css')});
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
await page.locator('#semiconductor-simulation-select').selectOption('ledspec');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
const canvas=page.locator('#semi-led-canvas'),ws=page.locator('.semi-workspace');
assert.equal(await page.getByRole('button',{name:'GaAsP (Red) LED',exact:true}).getAttribute('aria-pressed'),'true');
const reference=await canvas.evaluate(c=>c.toDataURL());
await page.getByRole('button',{name:'Double drive · 40 mA',exact:true}).click();
assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),reference);
assert.equal(await page.getByRole('slider',{name:'Current',exact:true}).inputValue(),'40');
await page.getByRole('button',{name:'Turn off · 0 mA',exact:true}).click();
await ws.getByRole('heading',{name:'Off · no emission',exact:true}).waitFor();
assert.equal(await page.getByRole('slider',{name:'Current',exact:true}).inputValue(),'0');
await page.locator('#semi-prediction').fill('Zero current will turn off the LED without changing the nominal emission center.');
await page.locator('#semiconductor-guided-observation').fill('The zero-current spectrum is flat. The nominal red emission center is still listed, but there are no emitted photons.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
let rows=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence.observed);
assert.equal(rows.find(r=>r[0]==='Drive')[1],'0 mA');
assert.equal(rows.find(r=>r[0]==='Peak photon energy')[1],'No emission');
await ws.screenshot({path:path.join(out,'led-off-desktop.png')});
await page.getByRole('button',{name:'Reference · 20 mA',exact:true}).click();
await page.getByRole('button',{name:'AlGaAs/GaAs (Infrared) LED',exact:true}).click();
await ws.getByRole('heading',{name:'Outside the approximate visible range',exact:true}).waitFor();
assert.match(await canvas.getAttribute('aria-label'),/940 nm/);
await ws.screenshot({path:path.join(out,'led-infrared-desktop.png')});
await page.getByRole('button',{name:'Compare phosphor white',exact:true}).click();
await ws.getByText('White has no single photon energy or band gap.',{exact:false}).waitFor();
assert.equal(await ws.getByRole('row').count(),3);
const white=await canvas.evaluate(c=>c.toDataURL());
await ws.screenshot({path:path.join(out,'led-phosphor-desktop.png')});
await page.getByRole('button',{name:'Compare RGB white',exact:true}).click();
assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),white);
assert.equal(await page.getByRole('slider',{name:'Red',exact:true}).inputValue(),'255');
assert.equal(await page.getByRole('slider',{name:'Green',exact:true}).inputValue(),'255');
assert.equal(await page.getByRole('slider',{name:'Blue',exact:true}).inputValue(),'255');
await page.getByRole('button',{name:'Yellow mix',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Blue',exact:true}).inputValue(),'0');
await ws.screenshot({path:path.join(out,'led-rgb-desktop.png')});
await page.getByRole('button',{name:'All off',exact:true}).click();
await ws.getByRole('heading',{name:'Off · no emission',exact:true}).waitFor();
await page.getByRole('button',{name:'Magenta mix',exact:true}).click();
await page.getByRole('slider',{name:'Red',exact:true}).fill('128');
assert.equal(await page.evaluate(()=>semiData.semiconductor.ledMixR),128);
await page.getByRole('button',{name:'Single LED',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Current',exact:true}).inputValue(),'20');
await page.getByRole('button',{name:'RGB Mixer',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Red',exact:true}).inputValue(),'128');
await page.locator('#semiconductor-guided-observation').fill('The mixed spectrum retains red and blue bands. Changing red changes its contribution, and does not create an average wavelength.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
rows=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence.observed);
assert.equal(rows.find(r=>r[0]==='Drive')[1],'RGB 128, 0, 255');
assert.equal(rows.find(r=>r[0]==='Peak photon energy')[1],'Multiple photon energies');
await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'They keep their separate emission bands',exact:true}).click();
await page.getByText('Yes. The component spectra add.',{exact:false}).waitFor();
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
for(const name of ['AlGaAs/GaAs (Infrared)','AlGaAs (Red)','GaAsP (Red)','GaAsP (Orange)','GaP:N (Yellow)','InGaN (Green)','InGaN (Blue)','AlGaN (UV)','Blue InGaN + Phosphor','RGB Mixer']){
 if(name==='RGB Mixer')await page.getByRole('button',{name,exact:true}).click();
 else{await page.getByRole('button',{name:'Single LED',exact:true}).click();await page.getByRole('button',{name:name+' LED',exact:true}).click();}
 const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 accessibility.push({variant:name,violations});
}
for(const [name,file] of [['Compare phosphor white','led-phosphor-mobile.png'],['Compare RGB white','led-rgb-mobile.png']]){
 await page.getByRole('button',{name,exact:true}).click();await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow');
 await ws.screenshot({path:path.join(out,file)});
 await page.setViewportSize({width:1280,height:1000});
}
await page.getByRole('button',{name:'Connect to Band Gap',exact:true}).click();
await page.locator('#semi-bandgap-canvas').waitFor();
assert.equal(await page.evaluate(()=>semiData.semiconductor.guidedSetupSubtool),null);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'led-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.ok(accessibility.every(a=>a.violations.length===0),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'led-browser.json'),JSON.stringify({passed:true,checks:['fixed-scale current response','zero current','invisible radiation','phosphor and RGB spectra','RGB presets and sliders','independent drive settings','saved zero and mixed evidence','concept feedback','ten accessibility variants','mobile layout','connected band-gap lesson'],errors},null,2));
console.log('LED spectrum browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
