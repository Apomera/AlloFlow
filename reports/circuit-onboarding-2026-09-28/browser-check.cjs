const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const results={sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'))).digest('hex'),checks:[],errors:[],axe:[],layouts:[]};
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>results.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit onboarding checks</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','stem_lab/stem_tool_circuit.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});window.awards=[];
      function Host(){
        const [data,setData]=React.useState({_circuit:{components:[],pauseMotion:true,prediction:'Keep my own question'},_circuitMixed:{prediction:'Mixed study'},_circuitActive:{reflection:'Active study'},_circuitNetwork:{reflection:'Network study'}});
        window.state=data;window.setState=setData;
        return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(_k,f)=>f,gradeLevel:'8',addToast:noop,awardXP:(...args)=>awards.push(args),announceToSR:noop,a11yClick:f=>({onClick:f}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
      }
      window.auditRoot=ReactDOM.createRoot(document.querySelector('#root'));auditRoot.render(React.createElement(Host));
    });
    await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    async function inspect(name,selector){
      results.axe.push({name,violations:await page.evaluate(async()=>{const scan=await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));})});
      for(const width of [1280,390,320]){
        await page.setViewportSize({width,height:1000});
        const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));results.layouts.push({name,...dimensions});
        if(dimensions.scrollWidth>width+1){
          results.overflows=await page.evaluate(()=>Array.from(document.querySelectorAll('#root *')).map(el=>({tag:el.tagName,id:el.id,className:String(el.className),right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,text:el.textContent.slice(0,90)})).filter(el=>el.right>innerWidth+1&&el.width>0).slice(-35));
          await page.screenshot({path:path.join(__dirname,name+'-overflow.png'),fullPage:true});
        }
        assert.ok(dimensions.scrollWidth<=width+1,name+' overflow at '+width);
        if(width!==390)await page.locator(selector).screenshot({path:path.join(__dirname,name+'-'+width+'.png')});
      }
      await page.setViewportSize({width:1280,height:1000});
    }
    const start=page.locator('.circuit-start-guide');
    assert.equal(await start.getAttribute('open'),'');
    assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);
    await inspect('first-circuit','.circuit-start-guide');
    await start.locator('summary').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.querySelector('.circuit-start-guide').open);
    await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Build on my own',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement.id==='circuit-parts-heading');
    assert.equal(await page.evaluate(()=>state._circuit.components.length),0);
    await start.locator('summary').click();
    await page.getByRole('button',{name:'Start with a bulb',exact:true}).click();
    await page.waitForFunction(()=>state._circuit.lessonId==='loop'&&document.activeElement===document.querySelector('.circuit-lessons>summary'));
    assert.equal(await page.evaluate(()=>state._circuit.components[1].closed),false);
    assert.equal(await page.evaluate(()=>state._circuit.prediction),'Keep my own question');
    results.checks.push({name:'Optional start guide supports keyboard, free building, and explicit guided start with focus'});

    const lab=page.locator('.circuit-lessons');
    await lab.getByRole('button',{name:'It stays at zero',exact:true}).click();
    await lab.getByRole('button',{name:'Test my prediction',exact:true}).click();
    await lab.getByText('1 of 3 experiments tested',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>state._circuit.lessonTrial.correct),false);
    await lab.getByRole('textbox',{name:'Explain using evidence',exact:true}).fill('Closing the switch made a complete loop: current rose from zero to about 90 mA.');
    await inspect('guided-evidence','.circuit-lessons');
    await lab.getByRole('button',{name:'Next: Turn down the current',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>state._circuit.lessonId==='resistance'&&document.activeElement===document.querySelector('.circuit-lessons legend'));
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.circuit-lessons fieldset button')),true);
    const beforeResume=await page.evaluate(()=>JSON.stringify([state._circuit.components,state._circuit.mode,state._circuit.voltage]));
    await lab.getByRole('button',{name:/Complete the loop/}).click();
    assert.equal(await page.evaluate(()=>JSON.stringify([state._circuit.components,state._circuit.mode,state._circuit.voltage])),beforeResume);
    assert.match(await lab.getByRole('textbox',{name:'Explain using evidence',exact:true}).inputValue(),/complete loop/);
    await lab.getByRole('button',{name:'Load this experiment result',exact:true}).click();
    assert.equal(await page.evaluate(()=>state._circuit.components[1].type),'switch');
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await page.evaluate(()=>state._circuit.components.length),1);
    results.checks.push({name:'A revised prediction counts as a tested experiment; notes and saved evidence survive next/resume/load/Undo'});

    const workspaceGuide=page.locator('.circuit-workspace-guide');
    await workspaceGuide.locator('summary').focus();await page.keyboard.press('Enter');
    await inspect('workbench-guide','.circuit-workspace-guide');
    const simpleBefore=await page.evaluate(()=>JSON.stringify(state._circuit.components));
    for(const name of ['Mixed circuits','Active electronics','Connected circuits','Simple circuits']){
      const button=workspaceGuide.getByRole('button',{name:'Open '+name,exact:true});await button.focus();await page.keyboard.press('Enter');
      await page.getByRole('button',{name,exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(state._circuit.components)),simpleBefore);
    assert.deepEqual(await page.evaluate(()=>[state._circuitMixed.prediction,state._circuitActive.reflection,state._circuitNetwork.reflection]),['Mixed study','Active study','Network study']);
    await page.keyboard.press('Escape');
    assert.equal(await workspaceGuide.getAttribute('open'),null);
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.circuit-workspace-guide>summary')),true);
    results.checks.push({name:'Workbench guide supports Enter and Escape, preserves all four studies, and identifies the active workspace'});

    await page.getByRole('button',{name:'Try a Target',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-circuit-target')==='0');
    assert.equal(await page.evaluate(()=>awards.filter(a=>a[0]==='circuitChallenge').length),0);
    await page.getByRole('button',{name:'Check target',exact:true}).click();
    assert.equal(await page.evaluate(()=>awards.filter(a=>a[0]==='circuitChallenge').length),0);
    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,mode:'series',voltage:10,components:[{id:91,type:'resistor',value:5}]}})));
    await page.getByRole('button',{name:'Check target',exact:true}).click();
    await page.waitForFunction(()=>awards.filter(a=>a[0]==='circuitChallenge').length===1);
    await page.getByRole('button',{name:'Check target',exact:true}).click();
    assert.equal(await page.evaluate(()=>awards.filter(a=>a[0]==='circuitChallenge').length),1);
    await inspect('target-feedback','[aria-labelledby="circuit-challenges-title"]');
    results.checks.push({name:'Target selection earns nothing; explicit checks provide feedback and award a matching circuit once'});
    assert.deepEqual(results.errors,[]);
    assert.ok(results.axe.every(scan=>scan.violations.length===0),JSON.stringify(results.axe));
    results.passed=true;await page.evaluate(()=>auditRoot.unmount());
  }catch(error){results.failure=error.stack;throw error;}
  finally{fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(results,null,2));await browser.close();}
  console.log('Circuit onboarding: '+results.checks.length+' workflows, '+results.axe.length+' axe scans, '+results.layouts.length+' layout checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
