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

await page.locator('#semiconductor-simulation-select').selectOption('transistor');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'3D device cutaway',exact:true}).click();
await page.getByRole('button',{name:'Channel, zero current',exact:true}).click();
await page.getByText('A channel is present, but zero drain bias gives zero net drain current in this model.',{exact:true}).waitFor();
const svg=page.locator('.semi-crystal svg');await svg.focus();const before=await svg.innerHTML();await page.keyboard.press('ArrowRight');assert.notEqual(await svg.innerHTML(),before);
await page.getByRole('button',{name:'Reset view',exact:true}).click();
await page.locator('.semi-crystal').screenshot({path:path.join(out,'mosfet-cutaway.png')});
await page.getByRole('button',{name:'Linear region',exact:true}).click();
assert.match(await svg.getAttribute('aria-label'),/Linear/);
await page.getByRole('button',{name:'Saturation region',exact:true}).click();
assert.match(await svg.getAttribute('aria-label'),/Saturation/);
await page.getByLabel('Separate gate layers',{exact:true}).uncheck();
await page.getByLabel('Separate gate layers',{exact:true}).check();
await page.getByRole('button',{name:'Oxide',exact:true}).click();
await page.getByText('Electric-field control does not require electrons to cross the oxide.',{exact:false}).waitFor();
await page.getByRole('button',{name:'P-MOSFET',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Gate VGS',exact:true}).getAttribute('min'),'-5');
await page.getByRole('button',{name:'Linear region',exact:true}).click();
await page.getByText('Inside a P-channel MOSFET',{exact:true}).waitFor();
await page.getByRole('button',{name:'NPN BJT',exact:true}).click();
assert.equal(await page.getByRole('slider',{name:'Base VBE',exact:true}).getAttribute('max'),'0.9');
await page.getByRole('button',{name:/CMOS Inverter/}).click();
await page.getByRole('slider',{name:'Input V',exact:true}).fill('2.5');
assert.match(await page.locator('#semi-transistor-canvas').getAttribute('aria-label'),/TRANSITION/);
await page.getByRole('button',{name:'N-MOSFET',exact:true}).click();
await page.getByRole('button',{name:'Saturation region',exact:true}).click();
await page.getByRole('button',{name:'3D device cutaway',exact:true}).click();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'transistor-devices-desktop.png')});
await page.locator('#semiconductor-simulation-select').selectOption('solarcell');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'Match load to maximum power',exact:true}).click();
await page.getByLabel('I-V / P-V Curve',{exact:true}).check();
let solarData=await page.evaluate(()=>semiData.semiconductor);
assert.ok(solarData.solarLoadR>0&&solarData.solarLoadR<1);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'solar-load-desktop.png')});
for(const label of ['Open circuit','Short circuit','Try darkness']){
await page.getByRole('button',{name:label,exact:true}).click();
await page.getByText('Power delivered to load: 0.000 W',{exact:true}).waitFor();
}
assert.equal(await page.getByRole('slider',{name:'Irradiance',exact:true}).inputValue(),'0');
assert.ok(await page.getByRole('button',{name:'Match load to maximum power',exact:true}).isDisabled());
await page.getByRole('button',{name:'Restore sunlight',exact:true}).click();
await page.locator('#semiconductor-simulation-select').selectOption('amplifier');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'Observe clipping',exact:true}).click();
assert.match(await page.locator('#semi-amp-canvas').getAttribute('aria-label'),/Clipped at supply rails/);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'amplifier-clipping-desktop.png')});
await page.getByRole('button',{name:'Small signal',exact:true}).click();
assert.match(await page.locator('#semi-amp-canvas').getAttribute('aria-label'),/Within supply rails/);
await page.getByRole('slider',{name:'Input amplitude',exact:true}).fill('0');
assert.match(await page.locator('#semi-amp-canvas').getAttribute('aria-label'),/2.500 to 2.500/);
await page.evaluate(()=>semiSet({ampShowBode:true,ampVin:.01,ampFreq:10000}));
await page.locator('.semi-workspace').screenshot({path:path.join(out,'amplifier-bode-desktop.png')});
await page.locator('#semiconductor-simulation-select').selectOption('ivcurve');
await page.getByRole('button',{name:'LED',exact:true}).click();
await page.evaluate(()=>semiSet({ivSweepV:5}));
await page.locator('.semi-workspace').screenshot({path:path.join(out,'diode-offscale-desktop.png')});

await page.locator('#semiconductor-simulation-select').selectOption('transistor');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'Channel, zero current',exact:true}).click();
await page.locator('#semi-prediction').fill('The gate can create a channel without a drain current.');
await page.locator('#semiconductor-guided-observation').fill('With gate voltage 3 V and drain voltage zero, a channel exists but the drain current is zero.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
const evidence=await page.evaluate(()=>semiSnapshots[semiSnapshots.length-1].data.guidedEvidence);
assert.equal(evidence.observed.find(r=>r[0]==='Drain current')[1],'0.000 mA');
assert.equal(evidence.observed.find(r=>r[0]==='Region')[1],'Zero drain bias');
for(const [id,answer] of [['transistor','Zero in this model'],['solarcell','Its current is zero, so VI is zero'],['amplifier','The requested output exceeds the supply rails'],['ivcurve','No, its current changes continuously with voltage']]){
await page.locator('#semiconductor-simulation-select').selectOption(id);
if(!await page.getByText('Check your model',{exact:true}).evaluate(el=>el.parentElement.open))await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:answer,exact:true}).click();
await page.getByText('Yes.',{exact:false}).waitFor();
}

await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
for(const id of ['transistor','solarcell','amplifier','ivcurve']){
await page.locator('#semiconductor-simulation-select').selectOption(id);
const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
accessibility.push({workspace:id,violations});
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' mobile overflow');
await page.locator('.semi-workspace').screenshot({path:path.join(out,id+'-devices-mobile.png')});
await page.setViewportSize({width:1280,height:1000});
}
fs.writeFileSync(path.join(out,'device-accessibility-results.json'),JSON.stringify(accessibility,null,2));
assert.deepEqual(errors,[]);assert.ok(accessibility.every(a=>a.violations.length===0),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'device-browser-results.json'),JSON.stringify({passed:true,viewportWidths:[1280,390],checks:['3D keyboard rotation and layer selection','zero drain current with channel','NMOS and PMOS operating regions','BJT voltage range','CMOS transition','solar matched/open/short/dark load','amplifier clipping and zero input','Bode response','diode off-scale rendering','four mobile workspaces','WCAG automated scan','saved numerical notebook evidence','four device concept checks'],errors},null,2));
console.log('Device browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

