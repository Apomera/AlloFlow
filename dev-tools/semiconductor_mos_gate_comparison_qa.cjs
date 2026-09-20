const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/semiconductor-enhancement/mos-gate-comparison-2026-09-19');
(async()=>{
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.setContent('<!doctype html><html lang="en"><head><title>Semiconductor Lab verification</title></head><body><main id="root"></main></body></html>');
const cssDir=path.join(root,'app/static/css'),cssFiles=fs.readdirSync(cssDir).filter(f=>/^main\..*\.css$/.test(f));
assert.equal(cssFiles.length,1);
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

await page.locator('#semiconductor-simulation-select').selectOption('transistor');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
await page.getByRole('button',{name:'3D device cutaway',exact:true}).click();
const panel=page.locator('details.semi-mos-curve'),plot=panel.locator('[data-mos-curve]');
await panel.locator('summary').click();await plot.waitFor();
const comparison=panel.getByRole('region',{name:'Gate-voltage comparison',exact:true});
const gate=panel.getByRole('slider',{name:'Gate VGS for curve comparison',exact:true});
const drain=panel.getByRole('slider',{name:'Drain-bias magnitude on the current–voltage curve',exact:true});
const row=name=>comparison.locator('tbody tr').filter({has:page.getByRole('rowheader',{name,exact:true})}).locator('td');
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const scans=[];
async function scan(name){
 const violations=await page.evaluate(async()=>{const a=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return a.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));});
 scans.push({name,violations});assert.deepEqual(violations,[],name+' accessibility');
}
for(const [name,p] of [['N-MOSFET',1],['P-MOSFET',-1]]){
 await page.getByRole('button',{name,exact:true}).click();
 await comparison.waitFor({state:'detached'});
 await page.getByRole('button',{name:'Linear region',exact:true}).click();
 const before=await page.evaluate(()=>JSON.stringify(semiData.semiconductor));
 await panel.getByRole('button',{name:'Hold this gate as a reference',exact:true}).click();
 assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor)),before);
 await panel.getByText('The gates match, so the curves overlap. Change the gate voltage to compare.',{exact:true}).waitFor();
 await gate.fill(String(4*p));
 let data=await page.evaluate(()=>semiData.semiconductor);
 assert.equal(data.gateVoltage,4*p);assert.equal(data.drainVoltage,.5*p);
 assert.deepEqual(await row('Gate VGS').allTextContents(),[(3*p).toFixed(2)+' V',(4*p).toFixed(2)+' V']);
 const liveY=Number(await plot.locator('[data-mos-operating-point]').getAttribute('cy')),refY=Number(await plot.locator('[data-mos-reference-point]').getAttribute('y'))+8;
 assert.ok(liveY<refY);
 await scan(name+' gate comparison');
 const refPath=await plot.locator('[data-mos-reference] path').getAttribute('d');
 await drain.fill('5');
 assert.equal(await plot.locator('[data-mos-reference] path').getAttribute('d'),refPath);
 assert.deepEqual(await row('Drain VDS').allTextContents(),[(5*p).toFixed(2)+' V',(5*p).toFixed(2)+' V']);
 assert.deepEqual(await row('Drain current').allTextContents(),p===1?['1.125 mA','3.125 mA']:['-0.5625 mA','-1.5625 mA']);
 await panel.screenshot({path:path.join(out,p===1?'nmos-comparison-desktop.png':'pmos-comparison-desktop.png')});
 const heldState=await page.evaluate(()=>JSON.stringify(semiData.semiconductor));
 await panel.locator('summary').click();await plot.waitFor({state:'detached'});
 await panel.locator('summary').click();await plot.waitFor();
 assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor)),heldState);
 assert.deepEqual(await row('Gate VGS').allTextContents(),[(3*p).toFixed(2)+' V',(4*p).toFixed(2)+' V']);
 await panel.getByRole('button',{name:'Update reference to this gate',exact:true}).click();
 await panel.getByText('The gates match, so the curves overlap. Change the gate voltage to compare.',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'Clear gate reference',exact:true}).click();
 await comparison.waitFor({state:'detached'});
 assert.ok(await panel.getByRole('button',{name:'Hold this gate as a reference',exact:true}).evaluate(el=>el===document.activeElement));
 assert.equal(await page.evaluate(()=>JSON.stringify(semiData.semiconductor)),heldState);
 await panel.getByRole('button',{name:'Hold this gate as a reference',exact:true}).click();
}
await gate.fill('0');
await scan('PMOS live cutoff');
await panel.getByRole('button',{name:'Update reference to this gate',exact:true}).click();
await gate.fill('-1.6');
await scan('PMOS cutoff reference and small current');
await gate.fill('-3');
await panel.getByRole('button',{name:'Update reference to this gate',exact:true}).click();
await gate.fill('-4');
for(const width of [390,320]){
 await page.setViewportSize({width,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow at '+width);
 await panel.screenshot({path:path.join(out,'pmos-comparison-mobile-'+width+'.png')});
}
await scan('mobile gate comparison');
await page.getByRole('button',{name:'2D device diagram',exact:true}).click();
await page.getByRole('button',{name:'3D device cutaway',exact:true}).click();
await panel.locator('summary').click();await plot.waitFor();
assert.equal(await comparison.count(),0);
assert.equal(await panel.getByRole('button',{name:'Hold this gate as a reference',exact:true}).count(),1);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,checks:['capture preserves live settings','NMOS and PMOS comparison on shared axes','signed readings at one drain bias','reference recomputes as drain changes','reference survives collapse','update and clear reference','keyboard focus after clearing','reference cleared on polarity switch','zero-current and near-threshold comparisons','390 and 320 px overflow'],scans,errors},null,2));
console.log('MOSFET gate comparison browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
