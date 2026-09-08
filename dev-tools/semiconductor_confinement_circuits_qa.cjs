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
await page.locator('#semiconductor-simulation-select').selectOption('qwell');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'quantum-finite-desktop.png')});
assert.match(await page.locator('#semi-qw-canvas').getAttribute('aria-label'),/n=1 at 0.0\d\d eV/);
await page.getByRole('button',{name:'Shallow, narrow well',exact:true}).click();
await page.getByText('1 bound state supported; 1 displayed',{exact:true}).waitFor();
await page.getByLabel('Show wavefunction',{exact:true}).uncheck();
await page.getByLabel('Show probability density',{exact:true}).check();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'quantum-penetration-desktop.png')});
await page.getByRole('button',{name:'Infinite barrier comparison',exact:true}).click();
assert.match(await page.locator('#semi-qw-canvas').getAttribute('aria-label'),/Probability outside the well: 0.00 percent/);
assert.equal(await page.getByRole('slider',{name:'Well Depth',exact:true}).count(),0);
await page.getByRole('button',{name:'Wider, deeper well',exact:true}).click();
await page.getByRole('button',{name:'State n=2',exact:true}).click();
assert.match(await page.locator('#semi-qw-canvas').getAttribute('aria-label'),/Selected n=2/);
await page.locator('#semi-prediction').fill('Finite barriers allow probability tails beyond the well.');
await page.locator('#semiconductor-guided-observation').fill('The selected state has energy below the finite barrier but still has nonzero probability outside the well.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
let evidence=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence);
assert.ok(evidence.observed.find(r=>r[0]==='Outside probability'));
await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'The electron can be found in a classically forbidden region',exact:true}).click();
await page.getByText('Yes. A finite bound state',{exact:false}).waitFor();
await page.locator('#semiconductor-simulation-select').selectOption('sandbox');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'Resistor baseline',exact:true}).click();
await page.getByText('Series current: 5.000 mA',{exact:true}).waitFor();
await page.getByRole('button',{name:'Light an LED',exact:true}).click();
await page.getByRole('spinbutton',{name:'Resistance for component 1',exact:true}).fill('');
await page.getByText('Enter a resistance from 10 to 100000 Ω',{exact:false}).waitFor();
await page.getByRole('spinbutton',{name:'Resistance for component 1',exact:true}).pressSequentially('1000');
assert.equal(await page.getByRole('spinbutton',{name:'Resistance for component 1',exact:true}).inputValue(),'1000');
const initial=await page.getByRole('region',{name:'Live circuit result',exact:true}).innerText();
await page.getByRole('spinbutton',{name:'Resistance for component 1',exact:true}).fill('2000');
assert.notEqual(await page.getByRole('region',{name:'Live circuit result',exact:true}).innerText(),initial);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'circuit-led-desktop.png')});
await page.locator('#semi-prediction').fill('Increasing resistance should lower the current in every part.');
await page.locator('#semiconductor-guided-observation').fill('At 5 V, increasing the resistor to 2000 ohms lowers the same series current through both the resistor and LED.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
evidence=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence);
assert.match(evidence.observed.find(r=>r[0]==='Components')[1],/2000 Ω resistor/);
assert.match(evidence.observed.find(r=>r[0]==='Series current')[1],/mA/);
await page.getByRole('slider',{name:'Supply',exact:true}).fill('0');
await page.getByText('Series current: 0.000 mA',{exact:true}).waitFor();
await page.getByRole('button',{name:'Light an LED',exact:true}).click();
await page.getByRole('button',{name:'Remove component 1 Resistor',exact:true}).click();
await page.getByText('No external current-limiting resistor.',{exact:false}).waitFor();
await page.getByRole('button',{name:'Capacitor at steady DC',exact:true}).click();
await page.getByText('Series current: 0.000 mA',{exact:true}).waitFor();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'circuit-capacitor-desktop.png')});
if(!await page.getByText('Check your model',{exact:true}).evaluate(el=>el.parentElement.open))await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'After charging, the ideal capacitor blocks steady DC',exact:true}).click();
await page.getByText('Yes. Charge can flow during charging',{exact:false}).waitFor();
await page.evaluate(()=>semiSet({circuitComponents:[{id:'legacy',type:'nmos'}]}));
await page.getByText('A transistor needs separate gate and drain connections',{exact:false}).waitFor();
await page.getByRole('button',{name:'Share the voltage',exact:true}).click();
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
for(const id of ['qwell','sandbox']){
await page.locator('#semiconductor-simulation-select').selectOption(id);
const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
accessibility.push({workspace:id,violations});
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' horizontal overflow');
await page.locator('.semi-workspace').screenshot({path:path.join(out,id+'-mobile.png')});
if(id==='sandbox')assert.ok((await page.getByRole('button',{name:'Remove component 1 Resistor',exact:true}).boundingBox()).height>=44);
await page.setViewportSize({width:1280,height:1000});
}
fs.writeFileSync(path.join(out,'confinement-circuit-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.deepEqual(errors,[]);assert.ok(accessibility.every(a=>a.violations.length===0),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'confinement-circuit-browser.json'),JSON.stringify({passed:true,checks:['finite and infinite barriers','shallow bound ground state','probability without wavefunction toggle','state selection','live resistance updates','zero supply','LED without external resistor','steady capacitor','unsupported saved transistor','touch removal','two concept checks','saved numerical evidence','desktop and mobile overflow','WCAG scans'],errors},null,2));
console.log('Confinement and circuit browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
