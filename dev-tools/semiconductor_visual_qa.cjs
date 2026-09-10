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
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.locator('#semi-prediction').fill('Heating will increase the number of thermally excited carriers.');
await page.getByRole('slider',{name:'Temperature',exact:true}).fill('500');
await page.locator('#semiconductor-guided-observation').fill('Heating silicon from 300 K to 500 K narrows the gap and increases the intrinsic carrier concentration.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
assert.equal(await page.evaluate(()=>window.semiSnapshots.length),1);
assert.equal(await page.evaluate(()=>window.semiSnapshots[0].data.guidedEvidence.observed[1][1]),'500 K');
assert.match(await page.evaluate(()=>window.semiSnapshots[0].data.guidedPrediction),/Heating/);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'bandgap-desktop.png')});
await page.getByLabel('Photon Excitation',{exact:true}).check();
await page.getByRole('slider',{name:'Photon wavelength'}).fill('2000');
await page.getByText('Below the band gap',{exact:false}).waitFor();
await page.locator('#semiconductor-simulation-select').selectOption('doping');
await page.getByRole('button',{name:'3D crystal',exact:true}).click();
const svg=page.locator('.semi-crystal svg');
await svg.waitFor();assert.ok(await svg.evaluate(el=>Array.from(el.querySelectorAll('circle')).every(c=>{const b=c.getBBox();return b.x>=0&&b.y>=0&&b.x+b.width<=560&&b.y+b.height<=360;})),'default 3D view fits all atoms');await page.locator('.semi-crystal').screenshot({path:path.join(out,'crystal-unit-cell.png')});await svg.focus();
const before=await svg.innerHTML();await page.keyboard.press('ArrowRight');assert.notEqual(await svg.innerHTML(),before);
await page.getByLabel('Isolate four neighbors',{exact:true}).check();
assert.equal(await svg.locator('line').count(),4);
await page.getByLabel('Show bonds',{exact:true}).uncheck();assert.equal(await svg.locator('line').count(),0);
await page.getByLabel('Show bonds',{exact:true}).check();
await page.getByRole('button',{name:'Phosphorus (P)',exact:true}).click();
await page.locator('.semi-crystal').getByText('fixed positive donor ion',{exact:false}).waitFor();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'crystal-desktop.png')});
await page.setViewportSize({width:390,height:844});
await page.locator('.semi-crystal').screenshot({path:path.join(out,'crystal-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile document overflow');
await page.getByRole('button',{name:'2D bond diagram',exact:true}).click();
await page.locator('#semi-doping-canvas').waitFor();
await page.locator('#semiconductor-simulation-select').selectOption('pnjunction');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'Reverse −1 V',exact:true}).click();
assert.match(await page.locator('#semi-pn-canvas').getAttribute('aria-label'),/Reverse biased/);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'junction-mobile.png')});
await page.setViewportSize({width:1280,height:1000});
await page.getByRole('button',{name:'Forward +0.5 V',exact:true}).click();
await page.getByLabel('I-V Curve',{exact:true}).check();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'junction-desktop.png')});
await page.getByRole('slider',{name:'Bias Voltage'}).fill('0.1');
assert.match(await page.locator('#semi-pn-canvas').getAttribute('aria-label'),/Forward biased/);
await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'The junction remains at equilibrium until 0.7 V',exact:true}).click();
await page.getByText('Reconsider.',{exact:false}).waitFor();
await page.getByRole('button',{name:'The barrier and depletion width decrease',exact:true}).click();
await page.getByText('Yes. Any positive applied bias',{exact:false}).waitFor();
for(const id of ['bandgap','doping','pnjunction','transistor','gates','ivcurve','sandbox','waferfab','ledspec','solarcell','moorelaw','qwell','memory','amplifier','dopeHunt']){
  await page.locator('#semiconductor-simulation-select').selectOption(id);
  await page.locator('.semi-workspace').waitFor();
}
for(const id of ['learn','challenge','battle','explore'])await page.locator('#semiconductor-tab-'+id).click();
await page.emulateMedia({reducedMotion:'no-preference'});
await page.locator('#semiconductor-simulation-select').selectOption('bandgap');
await page.getByRole('button',{name:'Pause particle motion',exact:true}).click();
const canvas=page.locator('#semi-bandgap-canvas');
const frame=await canvas.evaluate(c=>c.toDataURL());await page.waitForTimeout(160);
assert.equal(await canvas.evaluate(c=>c.toDataURL()),frame,'paused canvas must stop drawing');

await page.locator('#semiconductor-simulation-select').selectOption('dopeHunt');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'GaAs',exact:true}).click();
await page.getByRole('slider',{name:'Donor density exponent (10^x cm⁻³)',exact:true}).fill('17');
await page.getByText('Degenerate regime: outside model',{exact:true}).waitFor();
await page.getByRole('slider',{name:'Donor density exponent (10^x cm⁻³)',exact:true}).fill('15');
await page.getByRole('button',{name:'📋 Log',exact:true}).click();
await page.getByText('Recent comparisons (up to 8)',{exact:true}).waitFor();
await page.getByLabel('Intrinsic sample (no donors)',{exact:false}).check();
assert.ok(await page.getByRole('slider',{name:'Donor density exponent (10^x cm⁻³)',exact:true}).isDisabled());
await page.locator('.semi-workspace').screenshot({path:path.join(out,'discovery-desktop.png')});
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
for(const id of ['doping','pnjunction','bandgap','dopeHunt']){
 await page.locator('#semiconductor-simulation-select').selectOption(id);
 if(id==='doping')await page.getByRole('button',{name:'3D crystal',exact:true}).click();
 const result=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 accessibility.push({workspace:id,violations:result});
}
fs.writeFileSync(path.join(out,'accessibility-results.json'),JSON.stringify(accessibility,null,2));
console.log('Accessibility violations: '+accessibility.map(r=>r.workspace+'='+r.violations.length).join(', '));

assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,viewportWidths:[1280,390],checks:['prediction and evidence saved','photon threshold','3D keyboard rotation','tetrahedral isolation','bond toggle','dopant selection','2D restoration','bias presets','concept feedback','15 workspaces and four modes','pause','mobile overflow'],errors},null,2));
console.log('Semiconductor browser checks passed; captures in '+out);
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

