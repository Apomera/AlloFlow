const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=__dirname;
const source=fs.readFileSync(path.join(root,'stem_lab/stem_lab_module.js'),'utf8');
const marker=source.indexOf('"aria-label": "Open " + snap.label + " snapshot"');
const start=source.indexOf('onClick: () => {',marker)+'onClick: '.length;
const end=source.indexOf('\n            },',start)+'\n            }'.length;
const handler=source.slice(start,end);
(async()=>{
  const browser=await chromium.launch({headless:true}),results={checks:[],errors:[],axe:[],layouts:[]};
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>results.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit enhancement checks</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','stem_lab/stem_tool_circuit.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.evaluate(handler=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      window.quizAwards=[];
      function Host(){
        const [data,setData]=React.useState({_circuit:{pauseMotion:true,mode:'series',voltage:1,components:[{id:1,type:'resistor',value:10000}]}});
        const [snapshots,setSnapshots]=React.useState([]),[locale,setLocale]=React.useState('en');
        window.state=data;window.setState=setData;window.snapshots=snapshots;window.setLocale=setLocale;
        window.loadSnapshot=snap=>new Function('snap','setStemLabTab','_openStemTool','setLabToolData','return ('+handler+');')(snap,noop,noop,setData)();
        return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(k,f)=>locale==='en'?(f||k):locale+':'+(f||k),gradeLevel:'8',addToast:noop,awardXP:(...args)=>quizAwards.push(args),announceToSR:noop,a11yClick:f=>({onClick:f}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:setSnapshots});
      }
      window.auditRoot=ReactDOM.createRoot(document.querySelector('#root'));auditRoot.render(React.createElement(Host));
    },handler);
    await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
    await page.getByText('Plan an investigation',{exact:true}).click();
    await page.locator('#circuit-prediction').fill('Doubling voltage should double the current.');
    await page.getByRole('button',{name:'Save baseline',exact:true}).click();
    await page.getByRole('slider',{name:'Voltage slider',exact:true}).evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'2');el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>state._circuit.voltage===2);
    const readout=await page.locator('.circuit-comparison').innerText();
    assert.match(readout,/100 µA/);assert.match(readout,/200 µA/);assert.match(readout,/\+100 µA/);
    await page.locator('#circuit-explanation').fill('The resistance stayed at 10 kilohms; 1 V to 2 V changed 100 to 200 microamps.');
    await page.getByRole('button',{name:'Record comparison',exact:true}).click();
    await page.waitForFunction(()=>state._circuit.observations?.length===1);
    results.checks.push({name:'Small-current evidence',readout,delta:await page.evaluate(()=>state._circuit.observations[0].delta)});
    await page.locator('.circuit-lab-workflow').screenshot({path:path.join(out,'small-current-evidence.png')});
    await page.getByRole('button',{name:'Snapshot',exact:true}).click();
    await page.waitForFunction(()=>snapshots.length===1);
    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,voltage:24,networkWorkbench:true},circuit:{workspaceTab:'reference',expSection:'ohmInquiry'}})));
    await page.waitForFunction(()=>state._circuit.voltage===24);
    await page.evaluate(()=>loadSnapshot(snapshots[0]));
    await page.waitForFunction(()=>state._circuit.voltage===2&&state.circuit.workspaceTab==='build');
    assert.equal(await page.getByRole('slider',{name:'Voltage slider',exact:true}).inputValue(),'2');
    assert.equal(await page.evaluate(()=>state._circuit.observations.length),1);
    results.checks.push({name:'Save-edit-load returns to the saved circuit and evidence',voltage:2});

    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,ohmScore:0,ohmStreak:0,ohmQuiz:{text:'Find current for 3 V / 500 ohms',answer:.006,unit:'A',formula:'I = 0.006 A',opts:[.006,.02,.007,.007],answered:false}}})));
    await page.getByRole('button',{name:'0.007A',exact:true}).first().click();
    await page.waitForFunction(()=>state._circuit.ohmQuiz.answered);
    assert.equal(await page.evaluate(()=>state._circuit.ohmScore),0);
    assert.equal(await page.evaluate(()=>quizAwards.filter(a=>a[0]==='circuit').length),0);
    results.checks.push({name:'Legacy wrong answer rejected without rewards'});
    await page.evaluate(()=>{
      const original=Math.random,values=[0,0,.999,0,0,0];let i=0;
      Math.random=()=>values[i++]??.6;
      try{[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Next Question')).click();}finally{Math.random=original;}
    });
    await page.waitForFunction(()=>!state._circuit.ohmQuiz.answered);
    const question=await page.evaluate(()=>state._circuit.ohmQuiz);
    assert.equal(question.answer,.006);assert.equal(new Set(question.opts).size,4);
    await page.getByRole('button',{name:'0.006A',exact:true}).click();
    await page.waitForFunction(()=>state._circuit.ohmScore===1);
    assert.equal(await page.evaluate(()=>quizAwards.filter(a=>a[0]==='circuit').length),1);
    results.checks.push({name:'Generated quiz has four distinct options and rewards its exact answer',question});

    await page.evaluate(()=>setLocale('ES'));
    await page.getByRole('button',{name:'ES:Snapshot',exact:true}).waitFor();
    assert.equal(await page.getByRole('slider',{name:'ES:Voltage slider',exact:true}).inputValue(),'2');
    await page.getByRole('button',{name:'Connected circuits',exact:true}).click();
    await page.getByRole('combobox',{name:'ES:Connected circuit example',exact:true}).waitFor();
    await page.evaluate(()=>setLocale('FR'));
    await page.getByRole('combobox',{name:'FR:Connected circuit example',exact:true}).waitFor();
    await page.getByRole('button',{name:'Simple circuits',exact:true}).click();
    await page.getByRole('button',{name:'FR:Snapshot',exact:true}).waitFor();
    results.checks.push({name:'EN to ES to FR updates Simple and Connected controls without losing state'});
    await page.evaluate(()=>setLocale('en'));
    await page.getByRole('button',{name:'Snapshot',exact:true}).waitFor();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    for(const workspace of ['Simple circuits','Mixed circuits','Active electronics','Connected circuits']){
      await page.getByRole('button',{name:workspace,exact:true}).click();
      results.axe.push({workspace,violations:await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));})});
      for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(dimensions.scrollWidth<=width+1,workspace+' overflow');results.layouts.push({workspace,...dimensions});}
      await page.setViewportSize({width:1280,height:1000});
    }
    assert.deepEqual(results.errors,[]);assert.ok(results.axe.every(r=>r.violations.length===0),JSON.stringify(results.axe));
    results.passed=true;
    await page.evaluate(()=>auditRoot.unmount());
  }catch(error){results.failure=error.stack;throw error;}
  finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));await browser.close();}
  console.log('Circuit browser enhancements passed: '+results.checks.length+' workflows, four axe scans, twelve responsive checks.');
})().catch(error=>{console.error(error);process.exitCode=1;});
