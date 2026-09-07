const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(), out=path.join(root,'reports/chemistry-refinement-2026-09-06');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const report={checks:[],errors:[],axe:[]};
 try {
  const page=await browser.newPage({viewport:{width:1200,height:950},reducedMotion:'reduce'});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('http://127.0.0.1:7777/chemistry',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Chemistry calculator QA</title></head><body><main id="root"></main></body></html>'}));
  await page.goto('http://127.0.0.1:7777/chemistry');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','app_styles_module.js','stem_lab/stem_tool_chembalance.js']) await page.addScriptTag({path:path.join(root,file)});
  const cssDir=path.join(root,'app/static/css');
  await page.addStyleTag({path:path.join(cssDir,fs.readdirSync(cssDir).find(f=>/^main\..*\.css$/.test(f)))});
  await page.evaluate(()=>{
   const noop=()=>{};
   const ctx={React,icons:new Proxy({},{get:()=>()=>null}),gradeLevel:'10',t:(k,f)=>f||k,addToast:noop,announceToSR:noop,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,awardXP:noop,toolSnapshots:[],a11yClick:fn=>({onClick:fn}),srOnly:{position:'absolute',width:1,height:1,overflow:'hidden'},callGemini:null,callTTS:null};
   function App(){const [toolData,setToolData]=React.useState({chemBalance:{subtool:'stoich',_everPicked:true}});return React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),StemLab._registry.chemBalance.render({...ctx,toolData,setToolData}));}
   ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  });
  const grams=page.getByRole('spinbutton',{name:'Grams to convert to moles',exact:true});
  const moles=page.getByRole('spinbutton',{name:'Moles to convert to grams',exact:true});
  const formula=page.getByRole('textbox',{name:'Chemical formula input',exact:true});
  await grams.fill('44.009');
  await formula.fill('CO2');
  assert.equal(await moles.inputValue(),'1');
  await moles.fill('2');
  await formula.fill('H2O');
  assert.equal(await grams.inputValue(),'36.03');
  await moles.fill('');
  assert.equal(await grams.inputValue(),'');
  report.checks.push('Both conversion directions recalculate with the current formula and clear together.');
  await grams.fill('-1');
  assert.equal(await grams.getAttribute('aria-invalid'),'true');
  assert.equal(await moles.inputValue(),'');
  await grams.fill('0.000001');
  assert(Number(await moles.inputValue())>0);
  report.checks.push('Negative amounts show an associated error; small nonzero amounts remain nonzero.');
  await formula.fill('Na2CO3·2NaHCO3·2H2O');
  assert((await page.getByRole('region',{name:'Molar mass result',exact:true}).innerText()).includes('310.030'));
  const reaction=page.getByRole('textbox',{name:'Reaction for the yield calculator',exact:true});
  await reaction.fill('N2 + H2 -> NH3');
  await reaction.press('Enter');
  await page.getByRole('spinbutton',{name:'N2 grams available',exact:true}).fill('28.014');
  await page.getByRole('spinbutton',{name:'H2 grams available',exact:true}).fill('6.048');
  await page.getByRole('spinbutton',{name:'Actual grams produced',exact:true}).fill('68.124');
  await page.getByRole('button',{name:'Set up',exact:true}).click();
  assert.equal(await page.getByRole('spinbutton',{name:'Actual grams produced',exact:true}).inputValue(),'68.124');
  report.checks.push('Repeating setup for an unchanged reaction preserves entered amounts.');
  assert((await page.locator('main').innerText()).includes('Percent yield: 200.0%'));
  assert((await page.locator('main').innerText()).includes('used up together'));
  await reaction.fill('H2 + O2 -> H2O');
  assert(!(await page.locator('main').innerText()).includes('Theoretical yield:'));
  await reaction.press('Enter');
  assert.equal(await page.getByRole('spinbutton',{name:'H2 grams available',exact:true}).inputValue(),'');
  report.checks.push('Keyboard setup works; reaction edits invalidate all old amounts and results. Ties and excess yield are explained.');
  await page.getByRole('spinbutton',{name:'H2 grams available',exact:true}).fill('2.016');
  await page.getByRole('spinbutton',{name:'O2 grams available',exact:true}).fill('15.999');
  await page.getByRole('spinbutton',{name:'Actual grams produced',exact:true}).fill('18.015');
  await formula.fill('H2O');
  await grams.fill('18.015');
  await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
  for(const width of [1200,360,320]){
   await page.setViewportSize({width,height:950});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const result=await page.evaluate(async()=>{const region=document.querySelector('[aria-label="Molar mass result"]');const yieldPanel=[...document.querySelectorAll('h4')].find(n=>n.textContent==='Limiting reagent & yield').parentElement.parentElement; yieldPanel.id='chem-yield-qa';const a=await axe.run({include:[region,'#chem-yield-qa']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {overflow:document.documentElement.scrollWidth>innerWidth,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});
   report.axe.push({width,...result});
   assert.deepEqual(result.violations,[]);
   assert.equal(result.overflow,false);
  }
  await page.getByRole('region',{name:'Molar mass result',exact:true}).screenshot({path:path.join(out,'calculator-mobile.png')});
  report.checks.push('Calculator regions pass targeted axe checks and document reflow at 320, 360, and 1200 pixels.');
  assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report));
 }finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
