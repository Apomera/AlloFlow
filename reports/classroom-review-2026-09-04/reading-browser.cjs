const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:1200,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('http://127.0.0.1:7777/reading-check',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Reading workflow check</title></head><body style="margin:16px;background:#f1f5f9;font-family:Arial"><main id="root" style="max-width:620px;margin:auto"></main></body></html>'}));
    await page.goto('http://127.0.0.1:7777/reading-check');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','guided_mode_config_module.js','view_guided_mode_banner_module.js']) await page.addScriptTag({path:path.resolve(file)});
    await page.evaluate(()=>{
      const React=window.React,config=window.AlloModules.GuidedModeConfig;
      const e=React.createElement;
      function Harness(){
        const [input,setInput]=React.useState(''),[selected,setSelected]=React.useState(null),[step,setStep]=React.useState(0);
        const active=selected?config.GUIDED_STEPS.filter(s=>selected.includes(s.id)):config.GUIDED_STEPS;
        const t=k=>({'guided.indicator_title':'Guided mode','guided.source_prompt':'Paste your source text to continue.'}[k]||'');
        return e(React.Fragment,null,e(window.AlloModules.GuidedModeBanner.GuidedModeBanner,{
          GUIDED_STEPS:active,allGuidedSteps:config.GUIDED_STEPS,GUIDED_TOUR_MAP:config.GUIDED_TOUR_MAP,
          guidedPresets:config.GUIDED_PRESETS,guidedPhases:config.GUIDED_PHASES,guidedSelectedIds:selected,guidedStep:step,
          inputText:input,setInputText:setInput,setGuidedStep:setStep,history:[],tourSteps:[],t,
          handleExitGuidedMode:()=>{},handleGuidedSkip:()=>setStep(n=>n+1),setShowGuidedTip:()=>{},
          getDefaultTitle:x=>x,markGuidedStepDone:()=>{},guidedCompletedIds:[],guidedSkippedIds:[],guidedCreatedHistoryIds:[],
          applyGuidedPreset:p=>{setSelected(config.normalizeGuidedProgress({selectedIds:p.stepIds}).selectedIds);setStep(0);}
        }),e('label',{htmlFor:'source'},'Source passage'),e('textarea',{id:'source',value:input,onChange:event=>setInput(event.target.value),style:{display:'block',width:'95%',minHeight:120}}));
      }
      ReactDOM.createRoot(document.getElementById('root')).render(e(Harness));
    });
    const reading=page.getByRole('button',{name:/Adapt a reading/});
    if(!(await reading.innerText()).includes('7 steps, including review and delivery')) throw new Error('Missing preset count');
    await reading.click();
    await page.getByText('Step 1 of 7',{exact:true}).waitFor();
    await page.getByLabel('Source passage',{exact:true}).fill('My lesson');
    if(await page.getByRole('button',{name:/example passage/}).count()) throw new Error('Sample could overwrite draft');
    await page.getByLabel('Source passage',{exact:true}).fill('');
    const sample=page.getByRole('button',{name:/example passage/});
    await sample.focus();
    await page.keyboard.press('Enter');
    const passage=await page.getByLabel('Source passage',{exact:true}).inputValue();
    if(!passage.startsWith('Photosynthesis')) throw new Error('Keyboard sample load failed');
    await page.getByRole('button',{name:/^Continue to/}).waitFor({timeout:3000});
    await page.screenshot({path:path.join(__dirname,'reading-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(__dirname,'reading-mobile.png')});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow) throw new Error('Horizontal overflow at mobile width');
    await page.getByRole('button',{name:/^Continue to/}).click();
    await page.getByText('Step 2 of 7',{exact:true}).waitFor();
    if(errors.length) throw new Error(errors.join('\n'));
    const result={passed:true,scope:'Real GuidedModeBanner + GuidedModeConfig in an isolated browser harness; not full application E2E',checks:['7-step preset visible before selection','preset applied','short draft protected','keyboard sample load','next-step navigation','390px viewport without horizontal overflow'],pageErrors:errors};
    fs.writeFileSync(path.join(__dirname,'reading-browser.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



