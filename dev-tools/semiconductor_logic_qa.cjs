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
await page.locator('#semiconductor-simulation-select').selectOption('gates');
await page.getByRole('button',{name:'Load guided setup',exact:true}).click();
const ws=page.locator('.semi-workspace'),canvas=page.locator('#semi-gates-canvas');
await page.getByRole('button',{name:'Use inputs 1',exact:true}).click();
await page.getByRole('button',{name:'Record current row',exact:true}).click();
await page.getByRole('button',{name:'Use inputs 0',exact:true}).click();
await page.locator('#semiconductor-guided-observation').waitFor();
await page.getByRole('button',{name:'Record current row',exact:true}).click();
assert.ok(await page.getByRole('button',{name:'Record current row',exact:true}).isDisabled());
await ws.getByText('Recorded 2 / 2 input rows · all cases inspected.',{exact:true}).waitFor();
await page.getByText('Inspect the CMOS implementation',{exact:true}).click();
const expected={NOT:[1,0],AND:[0,0,0,1],OR:[0,1,1,1],NAND:[1,1,1,0],NOR:[1,0,0,0],XOR:[0,1,1,0],XNOR:[1,0,0,1]};
await page.addScriptTag({path:path.join(root,'axe-core/4.12.1/axe.min.js')});
const accessibility=[];
async function scan(name){const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.semiconductor-lab'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});accessibility.push({variant:name,violations});}
for(const type of Object.keys(expected)){
 await ws.getByRole('button',{name:type,exact:true}).click();
 const inputs=type==='NOT'?['0','1']:['00','01','10','11'];
 for(let i=0;i<inputs.length;i++){
   await page.getByRole('button',{name:'Use inputs '+inputs[i],exact:true}).click();
   assert.match(await canvas.getAttribute('aria-label'),new RegExp('Q='+expected[type][i]));
   if(!await page.getByRole('button',{name:'Record current row',exact:true}).isDisabled())await page.getByRole('button',{name:'Record current row',exact:true}).click();
 }
 await ws.getByText('Recorded '+inputs.length+' / '+inputs.length+' input rows · all cases inspected.',{exact:true}).waitFor();
 if(!await ws.getByText('Build this function using only NAND gates',{exact:true}).evaluate(el=>el.parentElement.open))await ws.getByText('Build this function using only NAND gates',{exact:true}).click();
 await ws.getByText('matches '+type+' output Q = '+expected[type].at(-1)+'.',{exact:false}).waitFor();
 await scan(type);
}
await ws.getByRole('button',{name:'NAND',exact:true}).click();
await ws.getByText('Pull-up to VDD: open · Pull-down to GND: conducting.',{exact:true}).waitFor();
await ws.screenshot({path:path.join(out,'logic-nand-desktop.png')});
await page.getByRole('button',{name:'Use inputs 10',exact:true}).click();
await ws.getByText('Pull-up to VDD: conducting · Pull-down to GND: open.',{exact:true}).waitFor();
await page.getByRole('button',{name:'Clear this checklist',exact:true}).click();
assert.deepEqual(await page.evaluate(()=>semiData.semiconductor.gateRecorded.NAND),[]);
assert.equal(await page.evaluate(()=>semiData.semiconductor.gateRecorded.XOR.length),4);
await ws.getByRole('button',{name:'Half adder',exact:true}).click();
for(const [bits,sum,carry] of [['00',0,0],['01',1,0],['10',1,0],['11',0,1]]){
 await page.getByRole('button',{name:'Use inputs '+bits,exact:true}).click();
 assert.match(await canvas.getAttribute('aria-label'),new RegExp('Sum='+sum+' Carry='+carry));
 await page.getByRole('button',{name:'Record current row',exact:true}).click();
}
await ws.screenshot({path:path.join(out,'logic-halfadder-desktop.png')});
await page.locator('#semi-prediction').fill('For 1 plus 1, the sum bit is zero and a carry bit represents two.');
await page.locator('#semiconductor-guided-observation').fill('The XOR sum is zero at inputs 11 while AND produces carry one. Together the output bits are 10 in binary, equal to two.');
await page.getByRole('button',{name:'Save observation',exact:true}).click();
const evidence=await page.evaluate(()=>semiSnapshots.at(-1).data.guidedEvidence.observed);
assert.equal(evidence.find(r=>r[0]==='Output')[1],'Sum=0 Carry=1');
assert.equal(evidence.find(r=>r[0]==='Binary addition')[1],'1 + 1 = 10₂');
await page.getByText('Check your model',{exact:true}).click();
await page.getByRole('button',{name:'Sum 0, Carry 1',exact:true}).click();
await page.getByText('Yes. XOR gives Sum 0',{exact:false}).waitFor();
await scan('Half adder');
await page.setViewportSize({width:390,height:844});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'half adder mobile overflow');
await ws.screenshot({path:path.join(out,'logic-halfadder-mobile.png')});
await ws.getByRole('button',{name:'Single gate',exact:true}).click();
await ws.getByRole('button',{name:'NAND',exact:true}).click();
await page.getByText('Inspect the CMOS implementation',{exact:true}).click();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'NAND mobile overflow');
await ws.screenshot({path:path.join(out,'logic-nand-mobile.png')});
await page.setViewportSize({width:1280,height:1000});
await page.getByRole('button',{name:'Reload baseline',exact:true}).click();
assert.equal(await page.evaluate(()=>semiData.semiconductor.gateExperiment),'single');
assert.deepEqual(await page.evaluate(()=>semiData.semiconductor.gateRecorded.NOT),[]);
assert.equal(await page.evaluate(()=>semiData.semiconductor.gateRecorded.halfadder.length),4);
await page.getByRole('button',{name:'Connect to Transistor',exact:true}).click();
await page.locator('#semi-transistor-canvas').waitFor();
assert.equal(await page.evaluate(()=>semiData.semiconductor.showCMOS),true);
assert.equal(await page.evaluate(()=>semiData.semiconductor.gateVoltage),0);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'logic-accessibility.json'),JSON.stringify(accessibility,null,2));
assert.ok(accessibility.every(a=>a.violations.length===0),JSON.stringify(accessibility));
fs.writeFileSync(path.join(out,'logic-browser.json'),JSON.stringify({passed:true,checks:['every truth-table row','NAND trace agreement','complementary CMOS paths','per-experiment checklist','half-adder sum and carry','saved binary evidence','concept feedback','eight WCAG variants','mobile overflow','guided reset preserves other checklists','connected transistor lesson'],errors},null,2));
console.log('Logic browser checks passed.');
await page.evaluate(()=>window.semiRoot.unmount());
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
