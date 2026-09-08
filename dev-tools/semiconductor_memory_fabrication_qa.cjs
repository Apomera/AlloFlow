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
await page.locator('#semiconductor-simulation-select').selectOption('memory');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
assert.ok(await page.getByRole('button',{name:'Write 1',exact:true}).isDisabled());
await page.getByLabel('Enable writes',{exact:true}).check();
await page.getByRole('button',{name:'Write 1',exact:true}).click();
await page.getByRole('button',{name:'Address 0: 1',exact:true}).waitFor();
await page.getByRole('button',{name:'Address 1: 0',exact:true}).click();
await page.getByRole('button',{name:'Write 1',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.memBanks.sram.bits.filter(v=>v===1).length),2);
await page.getByRole('button',{name:'Read selected',exact:true}).click();
await page.getByText('Last read: address 1 → 1.',{exact:false}).waitFor();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'memory-sram-desktop.png')});
await page.locator('#semi-prediction').fill('SRAM will lose its stored information when power is removed.');
await page.locator('#semiconductor-guided-observation').fill('The two selected SRAM addresses store ones after writing, while every other address remains zero.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
let evidence=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence.observed);
assert.equal(evidence.find(r=>r[0]==='Address')[1],'1');
assert.equal(evidence.find(r=>r[0]==='Stored model state')[1],'1');
await page.getByRole('button',{name:'Remove power',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.memBanks.sram.bits.every(v=>v===null)));
assert.ok(await page.getByRole('button',{name:'Read selected',exact:true}).isDisabled());
await page.getByRole('button',{name:'Restore power',exact:true}).click();
await page.getByRole('button',{name:'Read selected',exact:true}).click();
await page.getByText('Last read: address 1 → unknown.',{exact:false}).waitFor();
await page.getByRole('button',{name:'DRAM (1T1C)',exact:true}).click();
await page.getByLabel('Enable writes',{exact:true}).check();
await page.getByRole('button',{name:'Write 1',exact:true}).click();
await page.getByRole('button',{name:'Advance 6 steps',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.memBanks.dram.bits.every(v=>v===null)));
await page.getByRole('button',{name:'Refresh valid cells',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.memBanks.dram.bits.every(v=>v===null)));
await page.getByRole('button',{name:'Reset this memory experiment',exact:true}).click();
await page.getByLabel('Automatic refresh every 2 steps',{exact:true}).check();
await page.getByRole('button',{name:'Write 1',exact:true}).click();
await page.getByRole('button',{name:'Advance 6 steps',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.memBanks.dram.bits[0]),1);
const dramBefore=await page.evaluate(()=>JSON.stringify(semiData.semiconductor.memBanks.dram));
await page.locator('.semi-workspace').screenshot({path:path.join(out,'memory-dram-desktop.png')});
await page.getByRole('button',{name:'FeRAM',exact:true}).click();
await page.getByLabel('Enable writes',{exact:true}).check();
await page.getByRole('button',{name:'Write 1',exact:true}).click();
await page.getByRole('button',{name:'Remove power',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.memBanks.feram.bits[0]),1);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'memory-feram-desktop.png')});
await page.getByRole('button',{name:'Flash (NOR)',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.memBanks.flash.bits.every(v=>v===1)));
await page.getByLabel('Enable writes',{exact:true}).check();
await page.getByRole('button',{name:'Program selected to 0',exact:true}).click();
await page.getByRole('button',{name:'Address 3: 1',exact:true}).click();
await page.getByRole('button',{name:'Program selected to 0',exact:true}).click();
await page.locator('.semi-workspace').screenshot({path:path.join(out,'memory-flash-desktop.png')});
await page.getByRole('button',{name:'Erase teaching block to 1',exact:true}).click();
assert.ok(await page.evaluate(()=>semiData.semiconductor.memBanks.flash.bits.every(v=>v===1)));
await page.getByRole('button',{name:'DRAM (1T1C)',exact:true}).click();
assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor.memBanks.dram)),dramBefore);
if(!await page.getByText('Check your model',{exact:true}).evaluate(el=>el.parentElement.open))await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'No, it can only restore a still-valid sensed state',exact:true}).click();
await page.getByText('Yes. Refresh restores information',{exact:false}).waitFor();
await page.locator('#semiconductor-simulation-select').selectOption('waferfab');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'Stage 8: Metallization & CMP',exact:true}).click();
await page.getByRole('button',{name:'Review remaining stages',exact:true}).waitFor();
assert.equal(await page.getByRole('button',{name:'Finish walkthrough ✓',exact:true}).count(),0);
await page.getByRole('button',{name:'Reset walkthrough',exact:true}).click();
await page.getByRole('button',{name:'Stage 3: Thermal Oxidation',exact:true}).click();
await page.getByText('Relative oxide growth index: 1.00 × baseline.',{exact:true}).waitFor();
const before=await page.locator('#semi-fab-canvas').evaluate(c=>c.toDataURL());
await page.getByRole('slider',{name:'Temperature',exact:true}).fill('1100');
await page.getByRole('slider',{name:'Oxidation duration',exact:true}).fill('60');
assert.notEqual(await page.locator('#semi-fab-canvas').evaluate(c=>c.toDataURL()),before);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'fab-oxidation-desktop.png')});
await page.getByRole('slider',{name:'Oxidation duration',exact:true}).fill('0');
await page.getByText('Relative oxide growth index: 0.00 × baseline.',{exact:true}).waitFor();
await page.getByRole('slider',{name:'Oxidation duration',exact:true}).fill('30');
await page.getByRole('button',{name:'Stage 4: Photolithography',exact:true}).click();
await page.getByRole('button',{name:'One opening',exact:true}).click();
await page.getByRole('button',{name:'Stage 5: Etching',exact:true}).click();
assert.match(await page.locator('#semi-fab-canvas').getAttribute('aria-label'),/1 mask opening/);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'fab-etch-desktop.png')});
await page.getByRole('button',{name:'Stage 6: Ion Implantation',exact:true}).click();
const shallow=await page.locator('#semi-fab-canvas').evaluate(c=>c.toDataURL());
await page.getByRole('slider',{name:'Dose exponent',exact:true}).fill('15');
await page.getByRole('slider',{name:'Implant energy',exact:true}).fill('100');
await page.getByLabel('Show activation anneal',{exact:true}).check();
assert.notEqual(await page.locator('#semi-fab-canvas').evaluate(c=>c.toDataURL()),shallow);
await page.locator('.semi-workspace').screenshot({path:path.join(out,'fab-implant-desktop.png')});
await page.locator('#semi-prediction').fill('The same mask opening will constrain etching and implantation.');
await page.locator('#semiconductor-guided-observation').fill('A single mask opening selects where oxide is removed and ions enter. Dose changes quantity, energy changes schematic depth, and annealing illustrates activation.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
evidence=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence.observed);
assert.equal(evidence.find(r=>r[0]==='Mask openings')[1],'1');
assert.equal(evidence.find(r=>r[0]==='Implant energy')[1],'100 keV');
if(!await page.getByText('Check your model',{exact:true}).evaluate(el=>el.parentElement.open))await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'Dose',exact:true}).click();
await page.getByText('Yes. Dose measures ions per area.',{exact:false}).waitFor();
for(const name of ['Stage 2: Wafer Slicing','Stage 7: Thin Film Deposition','Stage 8: Metallization & CMP'])await page.getByRole('button',{name,exact:true}).click();
await page.getByRole('button',{name:'Finish walkthrough ✓',exact:true}).click();
assert.ok(await page.getByRole('button',{name:'Walkthrough complete',exact:true}).isDisabled());
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
for(const id of ['memory','waferfab']){
await page.locator('#semiconductor-simulation-select').selectOption(id);
const variants=id==='memory'?['SRAM (6T)','DRAM (1T1C)','Flash (NOR)','Flash (NAND)','FeRAM']:['Stage 1: Crystal Growth','Stage 3: Thermal Oxidation','Stage 6: Ion Implantation','Stage 8: Metallization & CMP'];
for(const name of variants){
await page.getByRole('button',{name,exact:true}).click();
const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
accessibility.push({workspace:id,variant:name,violations});
}
if(id==='waferfab')await page.getByRole('button',{name:'Stage 6: Ion Implantation',exact:true}).click();
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' overflow');
await page.locator('.semi-workspace').screenshot({path:path.join(out,id+'-fourth-mobile.png')});
await page.setViewportSize({width:1280,height:1000});
}
fs.writeFileSync(path.join(out,'memory-fabrication-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.deepEqual(errors,[]);assert.ok(accessibility.every(a=>a.violations.length===0),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'memory-fabrication-browser.json'),JSON.stringify({passed:true,checks:['write protection','address isolation','volatile power loss','DRAM refresh and information loss','nonvolatile retention','FeRAM mechanism','flash erase block','independent banks','oxidation controls and zero duration','mask continuity','dose/energy/anneal controls','visited-stage completion','numerical notebook evidence','concept feedback','desktop/mobile overflow','nine WCAG variants'],errors},null,2));
console.log('Memory and fabrication browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
