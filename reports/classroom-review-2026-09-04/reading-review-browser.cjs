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
        const [reviewFixture,setReviewFixture]=React.useState({}); window.__setReadingReviewFixture=setReviewFixture;
        const active=selected?config.GUIDED_STEPS.filter(s=>selected.includes(s.id)):config.GUIDED_STEPS;
        const t=k=>({'guided.indicator_title':'Guided mode','guided.source_prompt':'Paste your source text to continue.'}[k]||'');
        return e(React.Fragment,null,e(window.AlloModules.GuidedModeBanner.GuidedModeBanner,{
          GUIDED_STEPS:active,allGuidedSteps:config.GUIDED_STEPS,GUIDED_TOUR_MAP:config.GUIDED_TOUR_MAP,
          guidedPresets:config.GUIDED_PRESETS,guidedPhases:config.GUIDED_PHASES,guidedSelectedIds:selected,guidedStep:step,
          inputText:input,setInputText:setInput,setGuidedStep:setStep,history:[],tourSteps:[],t,
          handleExitGuidedMode:()=>{},handleGuidedSkip:()=>setStep(n=>n+1),setShowGuidedTip:()=>{},
          getDefaultTitle:x=>x,markGuidedStepDone:()=>{},guidedCompletedIds:[],guidedSkippedIds:[],guidedCreatedHistoryIds:[],
          applyGuidedPreset:p=>{setSelected(config.normalizeGuidedProgress({selectedIds:p.stepIds}).selectedIds);setStep(0);}, ...reviewFixture
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
    await page.evaluate(()=>{
      window.__reviewActions={open:0,settings:0,retry:0};
      const reading={id:'review-reading',type:'simplified',title:'Plant energy - adapted reading',data:'Plants use light energy to make sugars from water and carbon dioxide. Oxygen is released during this process.'};
      window.__reviewFixture={guidedStep:3,history:[reading],guidedCreatedHistoryIds:[reading.id],guidedCompletedIds:['simplified'],
        guidedStepError:{status:401,message:'AI access needs attention'},
        openGuidedHistoryItem:item=>{if(item.id!=='review-reading')throw new Error('Wrong reading');window.__reviewActions.open++;},
        openUniversalSettings:()=>window.__reviewActions.settings++,retryGuidedStep:()=>window.__reviewActions.retry++};
      window.__setReadingReviewFixture(window.__reviewFixture);
    });
    await page.getByRole('region',{name:'Saved result available',exact:true}).waitFor();
    const preview=page.getByRole('region',{name:'Saved result available',exact:true});
    if(!(await preview.innerText()).includes('Plants use light energy')) throw new Error('Reading body missing');
    await page.getByRole('button',{name:'Open result',exact:true}).click();
    const settings=page.getByRole('button',{name:'Review settings',exact:true});
    await settings.focus(); await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Retry',exact:true}).click();
    const actions=await page.evaluate(()=>window.__reviewActions);
    if(actions.open!==1||actions.settings!==1||actions.retry!==1)throw new Error('Recovery or review callback failed');
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const accessibility=await page.evaluate(async()=>{
      const targets=[document.querySelector('[aria-labelledby="guided-result-preview-title"]'),...document.querySelectorAll('[role="alert"]')];
      const result=await axe.run({include:targets},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
      return {violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.failureSummary)})),passes:result.passes.length};
    });
    fs.writeFileSync(path.join(__dirname,'reading-review-axe.json'),JSON.stringify(accessibility,null,2));
    if(accessibility.violations.length)throw new Error('Review-control accessibility violations: '+JSON.stringify(accessibility.violations));
    await page.screenshot({path:path.join(__dirname,'reading-review-mobile.png'),fullPage:true});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Review controls overflow mobile width');
    await page.evaluate(()=>window.__setReadingReviewFixture({...window.__reviewFixture,guidedCreatedHistoryIds:[],guidedStepError:'Could not generate the adaptation.'}));
    await preview.waitFor({state:'detached'});
    if(!(await page.locator('body').innerText()).includes('Review the source and settings, then retry.'))throw new Error('Generic generation error misclassified');
    if(errors.length) throw new Error(errors.join('\n'));
    const result={passed:true,scope:'Real GuidedModeBanner + GuidedModeConfig in an isolated browser harness; not full application E2E',checks:['7-step preset visible before selection','preset applied','short draft protected','keyboard sample load','next-step navigation','390px viewport without horizontal overflow','actual adapted text preview','correct reading opened','settings opened by keyboard','retry callback','old lesson excluded','generation error guidance','targeted automated accessibility scan'],pageErrors:errors};
    fs.writeFileSync(path.join(__dirname,'reading-review-browser.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



