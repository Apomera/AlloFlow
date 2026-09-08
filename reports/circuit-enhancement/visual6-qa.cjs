
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/circuit-enhancement');
(async()=>{
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit bench review</title></head><body><main id="root"></main></body></html>');
await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #facc15;outline-offset:3px}'});
await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react/umd/react.development.js')});
await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')});
await page.addScriptTag({path:path.join(root,'stem_lab/stem_tool_circuit.js')});
await page.evaluate(()=>{
const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
function Host(){
const [data,setData]=React.useState({_circuit:{pauseMotion:true}});
window.state=data;window.setState=setData;
return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(k,f)=>f||k,gradeLevel:'8',
addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:f=>({onClick:f}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
}
ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
});
await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();

const cases=[
['studio-starter',{mode:'series',components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2},{type:'switch',closed:true,id:3}]}],
['studio-components',{mode:'series',components:[{type:'resistor',value:470,id:1},{type:'capacitor',value:1000,id:2},{type:'ammeter',id:3},{type:'voltmeter',id:4},{type:'switch',closed:false,id:5},{type:'bulb',value:100,id:6},{type:'led',ledColor:'#22c55e',id:7}]}],
['studio-parallel',{mode:'parallel',components:Array.from({length:8},(_,i)=>({type:'bulb',value:100,id:i+1}))}]
];
for(const [name,state] of cases){
await page.evaluate(s=>setState({_circuit:{...s,voltage:9,pauseMotion:true,benchView:'3d'}}),state);
await page.locator('.circuit-3d').waitFor();
await page.locator('.circuit-3d').screenshot({path:path.join(out,name+'.png')});
assert.equal(await page.evaluate(()=>document.querySelector('.circuit-3d svg').innerHTML.includes('NaN')),false);
}
const physics=await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current);
await page.getByRole('button',{name:'Close-up',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Close-up',exact:true}).getAttribute('aria-pressed'),'true');
assert.equal(await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current),physics);
await page.locator('.circuit-3d').screenshot({path:path.join(out,'studio-bulb-detail.png')});
await page.getByRole('button',{name:'Inspect 3D part 8 bulb',exact:true}).click();
assert.equal(await page.evaluate(()=>state._circuit.selectedPart),7);
await page.getByLabel('3D camera orbit').fill('80');
await page.getByLabel('3D camera tilt').fill('20');
assert.equal(await page.evaluate(()=>StemLab.solveCircuit(state._circuit).current),physics);
await page.getByRole('button',{name:'Reset camera',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Close-up',exact:true}).getAttribute('aria-pressed'),'false');
await page.getByRole('button',{name:'Top view',exact:true}).click();
await page.locator('.circuit-3d').screenshot({path:path.join(out,'studio-parallel-top.png')});
await page.getByRole('button',{name:'Reset camera',exact:true}).click();
await page.setViewportSize({width:390,height:844});
await page.locator('.circuit-3d').screenshot({path:path.join(out,'studio-parallel-mobile.png')});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(()=>setState({_circuit:{mode:'series',voltage:9,pauseMotion:true,benchView:'3d',sceneCloseup:true,selectedPart:1,components:[{type:'resistor',value:470,id:1},{type:'led',ledColor:'#ef4444',id:2}]}}));
await page.locator('.circuit-3d').screenshot({path:path.join(out,'studio-led-mobile.png')});
await page.getByRole('button',{name:'Labels',exact:true}).click();
const hiddenLabels=await page.locator('.circuit-3d svg text').count();
await page.getByRole('button',{name:'Labels',exact:true}).click();
assert.ok(await page.locator('.circuit-3d svg text').count()>hiddenLabels);
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
const axe=await page.evaluate(async()=>axe.run({include:[['.circuit-3d']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
await page.evaluate(()=>setState({_circuit:{pauseMotion:true,benchView:'3d',components:[]}}));
assert.equal(await page.getByRole('button',{name:'Close-up',exact:true}).isDisabled(),true);
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(out,'visual6-results.json'),JSON.stringify({errors,axeViolations:axe.violations,checks:['all materials','eight parallel branches','selected close-up','camera preserves physics','reset restores wide view','top view','phone layout','label toggle','empty close-up disabled']},null,2));
console.log('3D visual, camera, responsive and accessibility checks passed.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
