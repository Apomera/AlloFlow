// Run from the repository root: node dev-tools/companion_planting_gameplay_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/companion-planting-enhancement');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const findings = { viewports: [], assertions: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => findings.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><title>Companion Planting Lab · gameplay verification</title></head><body><main id="root"></main></body></html>');
    const cssDir = path.join(root, 'app/static/css');
    const css = fs.readdirSync(cssDir).find(file => /^main\..*\.css$/.test(file));
    await page.addStyleTag({ path: path.join(cssDir, css) });
    await page.addStyleTag({ content: 'body{margin:0;background:#eff3ef;font-family:system-ui}#root{max-width:1152px;margin:16px auto;padding:0 12px}button,select,input,textarea{font:inherit}@media(max-width:640px){#root{padding:0 6px;margin:6px auto}}' });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_tool_companionplanting.js') });
    await page.evaluate(() => {
      const NativeObserver=window.IntersectionObserver;
      window.IntersectionObserver=class extends NativeObserver {
        constructor(callback,options){super(callback,options);this.qaCallback=callback;}
        observe(target){
          if(target.getAttribute('aria-describedby')==='community-plot-help')window.cpGardenVisibility={callback:this.qaCallback,observer:this,target};
          return super.observe(target);
        }
      };
      const R = window.React, h = R.createElement, noop = () => {};
      const icons = new Proxy({}, { get: () => () => h('span', { 'aria-hidden': true }) });
      function App() {
        const [data, setData] = R.useState({ companionPlanting: { gardenMode: 'community', communityGarden: {} } });
        window.cpData = data;
        window.cpSetData = setData;
        return window.StemLab._registry.companionPlanting.render({
          React: R, toolData: data, setToolData: setData, setStemLabTool: noop, setStemLabTab: noop,
          stemLabTool: 'companionPlanting', toolSnapshots: [], setToolSnapshots: noop, addToast: noop, icons,
          t: (key, fallback) => fallback || key, gradeLevel: '7th Grade', props: {},
          srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
          a11yClick: fn => ({ onClick: fn }), announceToSR: noop, canvasNarrate: noop,
          awardXP: noop, beep: noop, celebrate: noop, saveSnapshot: noop
        });
      }
      window.cpRoot = ReactDOM.createRoot(document.getElementById('root'));
      window.cpRoot.render(h(App));
    });

    await page.locator('[data-play-console]').waitFor();
    const primary=page.locator('[data-play-primary]');
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]');
    const patch=async change=>{await page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);};
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    const measure=()=>page.evaluate(()=>({height:document.documentElement.scrollHeight,canvasTop:document.querySelector('canvas[aria-describedby="community-plot-help"]').getBoundingClientRect().top+scrollY,primaryTop:document.querySelector('[data-play-primary]').getBoundingClientRect().top+scrollY,overflow:document.documentElement.scrollWidth>innerWidth}));
    findings.initial=await measure();
    assert.ok(findings.initial.canvasTop<600,'garden begins in the first desktop viewport');
    assert.ok(findings.initial.height<2200,'default garden does not bury the play loop');
    await page.screenshot({path:path.join(out,'gameplay-first-garden-desktop.png'),fullPage:true});

    findings.initialMobile=[];
    for (const width of [390,320]) {
      await page.setViewportSize({width,height:844});
      await canvas.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.evaluate(()=>scrollTo(0,0));
      const geometry=await measure();
      findings.initialMobile.push({width,...geometry});
      assert.equal(geometry.overflow,false);
      assert.ok(geometry.canvasTop<850,'mobile garden starts near the first screen');
      await page.screenshot({path:path.join(out,'gameplay-first-garden-mobile-'+width+'.png'),fullPage:true});
    }
    await page.setViewportSize({width:1280,height:1000});

    await page.evaluate(()=>{window.cpCanvasOriginal=document.querySelector('canvas[aria-describedby="community-plot-help"]'); Math.random=()=>.99;});
    await primary.click();
    let s=await state();
    assert.ok(s.grid.filter(c=>c.plantId).length>=4,'starter plants a working layout');
    assert.equal(s.phase,'plan');
    const budget=s.budget;
    await primary.click(); assert.equal((await state()).phase,'grow');
    await page.locator('[data-play-prediction]').selectOption({index:1});
    await primary.click(); s=await state();
    assert.equal(s.day,1,'one click advances one day');
    assert.equal(s.lastDayReport.day,1);
    assert.ok(s.predictionResult,'optional prediction is evaluated');
    await page.locator('[data-play-day-result="1"]').waitFor();
    assert.equal(await page.evaluate(()=>cpCanvasOriginal===document.querySelector('canvas[aria-describedby="community-plot-help"]')),true,'state changes preserve the canvas');
    await page.locator('[data-play-report]').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'community-day-report');
    await page.locator('[data-play-view="garden"]').click();
    assert.equal((await state()).budget,budget,'workspace navigation preserves garden funds');
    assert.equal(await page.evaluate(()=>cpCanvasOriginal===document.querySelector('canvas[aria-describedby="community-plot-help"]')),true,'workspace switches preserve the canvas');

    await patch({moisture:20});
    assert.match(await primary.innerText(),/Water/);
    await primary.click(); s=await state();
    assert.equal(s.moisture,45); assert.equal(s.day,1,'watering does not advance time');
    await page.locator('[data-play-weed]').click();
    assert.equal(await page.locator('[data-play-weed]').isDisabled(),true,'weeding empty pest populations is disabled');
    await page.locator('[data-play-compost]').click();
    assert.equal(await page.locator('[data-play-compost]').isDisabled(),true);
    await page.locator('[data-play-water]').click();
    assert.equal(await page.locator('[data-play-compost]').isDisabled(),true,'another care action does not allow more compost on the same day');
    await primary.click();
    assert.equal((await state()).day,2);
    assert.equal(await page.locator('[data-play-compost]').isDisabled(),false,'a new day reopens care decisions');
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,'gameplay-growing-desktop.png'),fullPage:true});


    for(let decision=0;decision<90&&!/Harvest/.test(await primary.innerText());decision++){
      const current=await state();
      if(current.nitrogen<25 && !(await page.locator('[data-play-compost]').isDisabled()))await page.locator('[data-play-compost]').click();
      if(current.grid.some(c=>c.plantId && c.pests>30))await page.locator('[data-play-weed]').click();
      await primary.click();
    }
    assert.match(await primary.innerText(),/Harvest/,'the starter reaches harvest through actual daily play');
    findings.firstNaturalHarvestDay=(await state()).day;
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,'gameplay-first-harvest-desktop.png'),fullPage:true});
    const naturalBudget=(await state()).budget;
    await primary.click();
    assert.ok((await state()).budget>naturalBudget && (await state()).totalHarvested>0,'natural harvest rewards support another planting');

    const grid=Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    grid[0]={plantId:'lettuce',growthDay:200,health:100,watered:false,pests:0};
    await patch({grid,phase:'grow',activeEvent:null,selReflection:null,moisture:65});
    assert.match(await primary.innerText(),/Harvest 1/);
    const beforeHarvest=await state();
    await primary.click(); s=await state();
    assert.equal(s.grid.filter(c=>c.plantId).length,0);
    assert.ok(s.budget>beforeHarvest.budget && s.totalHarvested>0);
    await primary.click();
    assert.equal((await state()).phase,'plan','empty harvested gardens restart in planning');
    await primary.click(); assert.equal((await state()).phase,'grow');

    await patch({grid:Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0})),phase:'plan',plantingTarget:null,selectedPlant:null,placementPreview:null,relationshipFocus:null,playShowPlots:false,activeEvent:null,selReflection:null});
    await page.locator('[data-play-plots-toggle]').click();
    await page.locator('[data-play-plot="0"]').focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.playPlot),'5');
    await page.keyboard.press('Enter');
    assert.equal((await state()).plantingTarget,5);
    const dock=page.locator('[data-planting-dock-surface="simulation"]');
    await dock.locator('[data-planting-candidate="corn"]').click();
    assert.equal((await state()).grid[5].plantId,null,'preview does not spend or plant');
    assert.equal(await primary.isDisabled(),true,'pending previews must be resolved');
    await dock.locator('[data-confirm-placement-preview]').click();
    assert.equal((await state()).grid[5].plantId,'corn');

    const paidPlantingBudget=(await state()).budget;
    await page.locator('[data-play-undo]').click();
    assert.equal((await state()).grid[5].plantId,null,'quick undo reopens the last planting');
    assert.ok((await state()).budget>paidPlantingBudget,'quick undo returns its seed cost');
    await dock.locator('[data-planting-candidate="corn"]').click();
    await dock.locator('[data-confirm-placement-preview]').click();

    await page.locator('[data-play-plot="5"]').click();
    assert.match(await page.locator('[data-play-focus]').innerText(),/Corn/);

    await page.locator('[data-play-remove="5"]').click();
    assert.equal((await state()).grid[5].plantId,'corn','arming removal keeps the crop');
    await page.locator('[data-play-remove-cancel]').click();
    assert.equal((await state()).grid[5].plantId,'corn','cancel keeps the crop');
    await page.locator('[data-play-remove="5"]').click();
    await page.locator('[data-play-remove-confirm]').click();
    assert.equal((await state()).grid[5].plantId,null);
    assert.equal((await state()).plantingTarget,5,'removal selects the same bed for replanting');
    await dock.locator('[data-planting-candidate="corn"]').click();
    await dock.locator('[data-confirm-placement-preview]').click();
    await page.locator('[data-play-plot="5"]').click();

    await page.locator('[data-play-focus]').getByRole('button',{name:'Inspect roots & soil',exact:true}).click();
    await page.getByRole('button',{name:/Back to (Garden|Focused Plot)/i}).first().click();
    await page.locator('[data-play-console]').waitFor();
    await page.waitForFunction(()=>document.activeElement.dataset.playFocus==='5');
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(cpData)));
    await page.evaluate(()=>cpSetData({companionPlanting:{gardenMode:'sisters'}}));
    await page.locator('[data-experiment-entry]').waitFor();
    await page.evaluate(saved=>cpSetData(saved),saved);
    assert.equal((await state()).grid[5].plantId,'corn','serialized state restores the gameplay workspace');
    findings.assertions.push('Starter → grow → predict → advance → inspect day report','Workspace and canvas continuity','Responsive water guidance and care feedback','Harvest → funds → replant → resume','Keyboard plot navigation, preview, removal confirmation and replanting','Root inspection and serialized restoration');


    async function clickGardenBed(index) {
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>{const el=window.__cgCanvasEl;return Number(el.dataset.gardenRenderWidth)===el.width&&Number(el.dataset.gardenRenderHeight)===el.height;});
      const position=await canvas.evaluate((el,index)=>{
        const box=el.getBoundingClientRect(),w=Number(el.dataset.gardenTileWidth),h=Number(el.dataset.gardenTileHeight);
        const row=Math.floor(index/4)+.5,col=index%4+.5;
        return {x:(el.width/2+(col-row)*w/2)*box.width/el.width,y:(Number(el.dataset.gardenOriginY)+(col+row)*h/2)*box.height/el.height};
      },index);
      await canvas.click({position});
    }
    await patch({phase:'grow',selectedPlant:null,plantingTarget:null});
    await clickGardenBed(5);
    assert.equal((await state()).relationshipFocus,5);
    assert.equal((await state()).microscopeCell,null,'pointer selection opens crop controls before root inspection');
    await clickGardenBed(10);
    assert.equal((await state()).phase,'plan');
    assert.equal((await state()).plantingTarget,10,'an empty growing bed opens for replanting');
    await patch({plantingTarget:null,selectedPlant:null,relationshipFocus:5});


    const resumeGarden=await page.evaluate(()=>JSON.parse(JSON.stringify(cpData)));
    await page.setViewportSize({width:1280,height:1000});
    await patch({grid:Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0})),
      budget:0,day:119,phase:'grow',moisture:60,nitrogen:50,activeEvent:null,plantingTarget:null,placementPreview:null,selectedPlant:null,
      lastPlacement:null,lastDayReport:null,lastCareAction:null,lastFeedback:null,journal:[{day:3,text:'My recovery observation.'}],totalHarvested:7});
    assert.match(await primary.innerText(),/free strawberry/);
    assert.equal(await primary.isDisabled(),false);
    await page.locator('[data-play-console]').screenshot({path:path.join(out,'garden-recovery-desktop.png')});
    await primary.click();
    assert.equal((await state()).grid[0].plantId,'strawberry');
    assert.equal((await state()).budget,0);
    assert.equal((await state()).day,119);
    assert.equal((await state()).totalHarvested,7);
    assert.equal((await state()).journal[0].text,'My recovery observation.');
    assert.equal(await page.locator('[data-play-undo]').count(),0,'donated seeds have no paid-plant refund');
    await primary.click();
    assert.match(await page.locator('[data-play-next-action]').innerText(),/Spring begins in 1 simulated day/);
    await page.locator('[data-play-console]').screenshot({path:path.join(out,'garden-winter-guidance.png')});
    await primary.click(); assert.equal((await state()).day,120);
    assert.equal((await state()).grid[0].growthDay,0,'winter growth remains paused');
    await primary.click(); assert.ok((await state()).grid[0].growthDay>0,'growth resumes in spring');

    const careGrid=Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    careGrid[0]={...careGrid[0],plantId:'corn',pests:45};
    await patch({grid:careGrid,moisture:20,nitrogen:0,day:7,phase:'grow',activeEvent:null,lastCompostDay:null});
    assert.match(await primary.innerText(),/Water garden/);
    await primary.click();
    assert.match(await primary.innerText(),/Weed affected plots/);
    await page.setViewportSize({width:320,height:844});
    await page.locator('[data-play-console]').screenshot({path:path.join(out,'garden-care-guidance-mobile.png')});
    assert.equal((await measure()).overflow,false);
    await primary.click();
    assert.match(await primary.innerText(),/Add compost/);
    await primary.click();
    assert.equal((await state()).nitrogen,15);
    assert.equal((await state()).day,7,'care does not silently advance time');
    assert.match(await primary.innerText(),/Advance 1 day/);
    await page.evaluate(saved=>cpSetData(saved),resumeGarden);
    findings.assertions.push('Quick undo refunds paid seeds','Empty unfunded garden recovery preserves records','Winter pause and spring growth','Water, pest, and soil-care priorities');

    await page.addScriptTag({path:require.resolve('axe-core')});

    const beforeDetails=await page.evaluate(()=>JSON.parse(JSON.stringify(cpData)));
    const detailGrid=Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    for(const index of [0,1,2,15])detailGrid[index]={...detailGrid[index],plantId:'corn',growthDay:45};
    detailGrid[5]={...detailGrid[5],plantId:'beans',growthDay:32,health:84,pests:31};
    detailGrid[6]={...detailGrid[6],plantId:'onion',growthDay:30};
    detailGrid[9]={...detailGrid[9],plantId:'squash',growthDay:30};
    await page.setViewportSize({width:1280,height:1000});
    await patch({grid:detailGrid,day:35,phase:'grow',moisture:60,nitrogen:50,relationshipFocus:null,plantingTarget:null,placementPreview:null,selectedPlant:null,
      playShowPlots:false,playRemovePlot:null,playReturnPhase:null,lastCareAction:null,lastFeedback:null,lastDayReport:null,activeReflection:null,activeEvent:null});
    await clickGardenBed(5);
    const focusPanel=page.locator('[data-play-focus-panel]');
    await page.waitForFunction(()=>document.activeElement.dataset.playFocus==='5');
    assert.equal(await page.locator('[data-play-neighbor-total]').getAttribute('data-play-neighbor-total'),'51');
    assert.match(await page.locator('[data-play-crop-status]').innerText(),/Pest pressure/);
    assert.equal(await page.locator('[data-play-neighbor-link="15"]').count(),0,'distant crops are excluded from relationships');
    const extraLink=focusPanel.locator('details [data-play-neighbor-link]').first();
    assert.equal(await extraLink.isVisible(),false,'long relationship lists begin collapsed');
    await focusPanel.getByText('Show 1 more relationship',{exact:true}).click();
    assert.equal(await extraLink.isVisible(),true);
    await focusPanel.screenshot({path:path.join(out,'garden-crop-panel-desktop.png')});
    await canvas.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'garden-inspection-desktop.png'),fullPage:true});
    await page.locator('[data-play-neighbor-link="0"]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.playFocus==='0');
    await page.locator('[data-play-focus-step="-1"]').focus();
    await page.keyboard.press('Enter');
    assert.equal((await state()).relationshipFocus,15,'previous wraps around planted beds');
    await page.waitForFunction(()=>document.activeElement.dataset.playFocusStep==='-1');
    await page.keyboard.press('Enter');
    assert.equal((await state()).relationshipFocus,9,'keyboard stays on the navigation button');
    await page.locator('[data-play-focus-close]').click();
    await page.waitForFunction(()=>document.activeElement===window.__cgCanvasEl);
    await clickGardenBed(5);
    await page.setViewportSize({width:320,height:844});
    await clickGardenBed(5);
    await page.waitForFunction(()=>document.activeElement.dataset.playFocus==='5');
    assert.equal((await measure()).overflow,false,'crop panel fits a 320px screen');
    const focusedHeader=await page.evaluate(()=>({
      top:document.querySelector('.cp-specimen-head').getBoundingClientRect().top,
      navBottom:document.querySelector('[data-play-navigation]').getBoundingClientRect().bottom
    }));
    findings.mobileCropFocus=focusedHeader;
    assert.ok(focusedHeader.top>=focusedHeader.navBottom,'focused crop heading stays below sticky navigation');
    await focusPanel.screenshot({path:path.join(out,'garden-crop-panel-mobile-320.png'),style:'.cp-play-nav{position:static!important}'});
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,'garden-inspection-mobile-320.png'),fullPage:true});
    findings.cropPanelAccessibility=await page.evaluate(async()=>(
      await axe.run({include:['[data-play-focus-panel]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})
    ).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    assert.deepEqual(findings.cropPanelAccessibility,[]);

    const harvestGrid=Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    ['corn','beans','squash','radish','lettuce'].forEach((plantId,i)=>harvestGrid[i]={...harvestGrid[i],plantId,growthDay:200});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await patch({grid:harvestGrid,phase:'grow',relationshipFocus:0,totalHarvested:7,lastCareAction:null,activeReflection:null});
    const fundsBeforeReceipt=(await state()).budget;
    await primary.click();
    const receipt=page.locator('[data-play-harvest-receipt]');
    await receipt.waitFor();
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-play-harvest-receipt'));
    const receiptState=await state();
    assert.match(await receipt.innerText(),/5 crops harvested/);
    assert.match(await receipt.innerText(),/1 more crop type/);
    assert.ok(Math.abs(receiptState.budget-fundsBeforeReceipt-receiptState.lastHarvestBatch.revenue)<.001);
    assert.equal(await page.locator('.cp-harvest-sparks span').first().evaluate(el=>getComputedStyle(el).animationName),'cp-harvest-spark');
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:width===1280?1000:844});
      assert.equal((await measure()).overflow,false,'harvest summary is contained at '+width+'px');
      await receipt.screenshot({path:path.join(out,'garden-harvest-summary-'+width+'.png')});
    }
    await patch({reducedMotion:true});
    assert.equal(await page.locator('.cp-harvest-sparks').evaluate(el=>getComputedStyle(el).display),'none','in-lab motion preference suppresses celebratory particles');
    await patch({reducedMotion:false});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.cp-harvest-sparks').evaluate(el=>getComputedStyle(el).display),'none','system motion preference suppresses celebratory particles');
    findings.harvestAccessibility=await page.evaluate(async()=>(
      await axe.run({include:['[data-play-harvest-receipt]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})
    ).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    assert.deepEqual(findings.harvestAccessibility,[]);
    await page.locator('[data-play-harvest-next]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.plantingDockSurface==='simulation');
    assert.equal((await state()).phase,'plan');
    assert.equal((await state()).plantingTarget,0);
    assert.equal((await state()).budget,receiptState.budget,'opening replanting does not spend harvest proceeds');
    assert.equal((await state()).day,receiptState.day);
    assert.equal(await receipt.count(),0);
    findings.assertions.push('Crop meters and actual companion effects','Conflicts and expandable neighbor explanations','Keyboard crop browsing and focus return','Harvest receipt, proceeds, and replanting handoff','Reduced motion for crop and harvest animations');
    await page.evaluate(saved=>cpSetData(saved),beforeDetails);


    const beforeLenses=await page.evaluate(()=>JSON.parse(JSON.stringify(cpData)));
    const lensGrid=Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    ['corn','beans','onion','squash','lettuce','radish','carrot','strawberry','tomato','pepper','basil','marigold','borage','dill','bee_hotel'].forEach((plantId,i)=>{
      lensGrid[i]={...lensGrid[i],plantId,growthDay:[0,4,5].includes(i)?200:24,health:i===0?20:i===11?35:94,pests:i===3?45:0};
    });
    await page.setViewportSize({width:1280,height:1000});
    await patch({grid:lensGrid,phase:'grow',day:35,moisture:60,nitrogen:50,playGardenLens:'natural',relationshipFocus:null,plantingTarget:null,placementPreview:null,selectedPlant:null,
      playShowPlots:false,playRemovePlot:null,playReturnPhase:null,lastDayReport:null,lastFeedback:null,lastCareAction:null,activeReflection:null,activeEvent:null,reducedMotion:true});
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLens==='natural' && __cgCanvasEl._cgAnim===null);
    await page.evaluate(()=>window.cpLensCanvas=__cgCanvasEl);
    const visibilityBatches=await page.evaluate(()=>{
      const {callback,observer,target}=cpGardenVisibility;
      callback([{target,isIntersecting:false},{target,isIntersecting:true}],observer);
      const latestVisible=target._cgVisible;
      callback([{target,isIntersecting:true},{target,isIntersecting:false}],observer);
      const latestHidden=target._cgVisible;
      callback([{target,isIntersecting:false},{target,isIntersecting:true}],observer);
      return {latestVisible,latestHidden};
    });
    assert.deepEqual(visibilityBatches,{latestVisible:true,latestHidden:false},'batched visibility records use the most recent canvas state');
    findings.assertions.push('Batched hide/reveal visibility updates repaint the garden');
    const lensBudget=(await state()).budget,lensDay=(await state()).day;
    findings.gardenViews=[];
    for(const lens of ['harvest','care','companions']){
      await page.locator('[data-play-garden-lens="'+lens+'"]').click();
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForFunction(lens=>__cgCanvasEl.dataset.gardenLens===lens && __cgCanvasEl._cgAnim===null,lens);
      assert.equal(await page.evaluate(()=>__cgCanvasEl===cpLensCanvas),true,'garden views preserve the canvas');
      assert.equal((await state()).budget,lensBudget);
      assert.equal((await state()).day,lensDay);
      assert.equal(await page.locator('[data-play-garden-lens="'+lens+'"]').getAttribute('aria-pressed'),'true');
      const entries=await canvas.evaluate(el=>el._cgFrameState.lens.entries);
      if(lens==='harvest'){assert.equal(entries[0].short,'Care');assert.equal(entries[4].short,'Ready');assert.equal(entries[14].crop,false);}
      if(lens==='care'){assert.equal(entries[0].tone,'critical');assert.equal(entries[3].short,'45 pests');}
      findings.gardenViews.push({id:lens,summary:await page.locator('[data-play-lens-summary]').innerText()});
      await page.locator('[data-community-scene-panel]').screenshot({path:path.join(out,'garden-view-'+lens+'-desktop.png')});
      await page.setViewportSize({width:320,height:844});
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>Number(__cgCanvasEl.dataset.gardenRenderWidth)===__cgCanvasEl.width && Number(__cgCanvasEl.dataset.gardenRenderHeight)===__cgCanvasEl.height);
      assert.equal((await measure()).overflow,false,'garden view fits a 320px screen');
      await page.locator('[data-community-scene-panel]').screenshot({path:path.join(out,'garden-view-'+lens+'-mobile-320.png')});
      await page.setViewportSize({width:1280,height:1000});
    }
    await page.locator('[data-play-garden-lens="care"]').click();
    await page.locator('[data-play-lens-map]').click();
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-play-plot-tray'));
    assert.match(await page.locator('[data-play-plot="3"]').getAttribute('aria-label'),/Pest pressure 45 points/);
    assert.equal(await page.locator('[data-play-plot="0"]').getAttribute('data-play-plot-value'),'! 20%');
    await page.locator('[data-play-weed]').click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl._cgFrameState.lens.entries[3].short==='94%');
    assert.equal(await page.locator('[data-play-plot="3"]').getAttribute('data-play-plot-value'),'94%','scene and text values update together after care');
    assert.equal((await state()).day,lensDay);
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();
    await page.waitForFunction(()=>Number(__cgCanvasEl.dataset.gardenRenderWidth)===__cgCanvasEl.width && Number(__cgCanvasEl.dataset.gardenRenderHeight)===__cgCanvasEl.height);
    const fullscreenLens=await page.evaluate(()=>{
      const panel=document.querySelector('[data-community-scene-panel]').getBoundingClientRect();
      const canvas=__cgCanvasEl.getBoundingClientRect();
      const controls=document.querySelector('[data-play-garden-views]').getBoundingClientRect();
      return {panelBottom:panel.bottom,canvasBottom:canvas.bottom,controlsTop:controls.top,controlsBottom:controls.bottom};
    });
    assert.ok(fullscreenLens.controlsBottom<=1000,'garden view controls fit the maximized scene');
    assert.ok(fullscreenLens.canvasBottom<=fullscreenLens.controlsTop+9,'canvas makes room for view controls');
    await page.getByRole('button',{name:'Exit maximized garden view',exact:true}).click();
    await page.locator('[data-play-lens-inspect="0"]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.playFocus==='0');
    assert.equal((await state()).grid[0].plantId,'corn','inspecting an alert does not remove a stressed crop');
    await patch({grid:lensGrid.map((cell,i)=>i===0?{...cell,growthDay:30,health:90}:cell),nitrogen:0});
    await page.setViewportSize({width:320,height:844});
    await clickGardenBed(0);
    assert.match(await page.locator('[data-play-crop-status]').innerText(),/Low nitrogen/);
    assert.match(await page.locator('[data-play-crop-advice]').innerText(),/Compost adds nitrogen/);
    await page.locator('[data-play-focus-panel]').screenshot({path:path.join(out,'garden-care-inspection-mobile-320.png'),style:'.cp-play-nav{position:static!important}'});
    await page.locator('[data-play-compost]').click();
    assert.notEqual(await page.locator('[data-play-crop-status]').innerText(),'Low nitrogen','crop advice resolves after its recommended care');
    assert.equal((await measure()).overflow,false);
    await page.setViewportSize({width:1280,height:1000});
    await page.locator('[data-play-focus-close]').click();
    await clickGardenBed(12);
    assert.equal((await state()).relationshipFocus,12,'garden view plaques retain exact bed targeting');
    await page.locator('[data-play-focus-close]').click();
    await page.locator('[data-play-garden-lens="natural"]').click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLens==='natural');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await patch({reducedMotion:false});
    await page.locator('[data-play-garden-lens="harvest"]').click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl._cgLensTransition.id==='harvest'&&performance.now()-__cgCanvasEl._cgLensTransition.started>400);
    await patch({reducedMotion:true});
    await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null&&__cgCanvasEl.dataset.gardenMotion==='still');
    await page.emulateMedia({reducedMotion:'reduce'});
    const savedLens=await page.evaluate(()=>JSON.parse(JSON.stringify(cpData)));
    await page.evaluate(()=>cpSetData({companionPlanting:{gardenMode:'sisters'}}));
    await page.locator('[data-experiment-entry]').waitFor();
    await page.evaluate(saved=>cpSetData(saved),savedLens);
    assert.equal(await page.locator('[data-play-garden-lens="harvest"]').getAttribute('aria-pressed'),'true','serialized sessions restore their garden view');
    findings.gardenViewsAccessibility=await page.evaluate(async()=>(
      await axe.run({include:['[data-play-garden-views]','[data-play-plot-tray]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})
    ).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    assert.deepEqual(findings.gardenViewsAccessibility,[]);
    findings.assertions.push('Harvest, care, and companion garden views','View changes preserve previews, time, funds, and canvas identity','Text plot values match live canvas data','Maximized scene and phone view controls','View transition, reduced motion, and saved-session restoration');
    await page.evaluate(saved=>cpSetData(saved),beforeLenses);

    findings.accessibility=await page.evaluate(async()=>{
      const result=await axe.run({include:['[data-play-navigation]','[data-play-console]','[data-play-outcome]','[data-play-plot-tray]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
      return result.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
    });
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      await page.evaluate(()=>scrollTo(0,0));
      findings.viewports.push({width,...await measure()});
      assert.equal((await measure()).overflow,false,'mobile page is contained');
      await page.screenshot({path:path.join(out,'gameplay-mobile-'+width+'.png'),fullPage:true});
      await canvas.screenshot({path:path.join(out,'gameplay-garden-mobile-'+width+'.png')});
    }
    assert.equal(findings.accessibility.length,0,'new play controls pass accessibility checks');
    assert.deepEqual(findings.errors,[]);
    console.log(JSON.stringify(findings,null,2));
    fs.writeFileSync(path.join(out,'gameplay-results.json'),JSON.stringify(findings,null,2));
  } catch(error) {
    const failedPage=browser.contexts()[0]?.pages()[0];
    if(failedPage)findings.failureScene=await failedPage.evaluate(()=>{
      const el=window.__cgCanvasEl;
      return {visibility:document.visibilityState,hasCanvas:!!el,connected:el&&el.isConnected,visible:el&&el._cgVisible,
        animation:el&&el._cgAnim,attributes:el&&{...el.dataset},width:el&&el.width,height:el&&el.height,
        bounds:el&&el.getBoundingClientRect().toJSON(),frameLens:el&&el._cgFrameState&&el._cgFrameState.lens&&el._cgFrameState.lens.id,
        contextLost:el&&el.getContext('2d').isContextLost(),reducedMotion:el&&el._cgFrameState&&el._cgFrameState.reducedMotion};
    }).catch(()=>null);
    fs.writeFileSync(path.join(out,'gameplay-failure.json'),JSON.stringify({...findings,failure:error.stack},null,2));
    const page=browser.contexts()[0]?.pages()[0]; if(page)await page.screenshot({path:path.join(out,'gameplay-failure.png'),fullPage:true});
    throw error;
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
