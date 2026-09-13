// Run from the repository root: node dev-tools/companion_planting_day_recap_qa.cjs
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

    await page.evaluate(()=>{Math.random=()=>.99;});
    const empty=()=>Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    const grid=empty();
    grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    grid[1]={...grid[1],plantId:'radish',growthDay:24.9};
    grid[5]={...grid[5],plantId:'carrot',growthDay:10,health:60.6};
    grid[6]={...grid[6],plantId:'lettuce',growthDay:8,health:80.6};
    await patch({grid,day:0,year:1,phase:'grow',moisture:60,nitrogen:50,pH:8.5,budget:41,totalHarvested:7,
      lastDayReport:null,lastCareAction:null,lastFeedback:null,relationshipFocus:null,plantingTarget:null,selectedPlant:null,placementPreview:null});
    await page.locator('[data-play-prediction]').selectOption('moisture');
    await primary.click();
    const report=page.locator('[data-play-day-result="1"]');
    await report.waitFor();
    const afterDay=await state();
    assert.equal(afterDay.lastDayReport.plotChanges[0].beforeMaturity,99);
    assert.equal(afterDay.lastDayReport.plotChanges[0].afterReady,true);
    assert.equal(afterDay.lastDayReport.plotChanges[1].beforeReady,false,'rounded maturity must not hide a newly ready crop');
    assert.equal(afterDay.lastDayReport.plotChanges[1].afterReady,true);
    assert.match(await page.locator('[data-play-day-title]').innerText(),/Spring · Day 1 complete/);
    assert.match(await page.locator('[data-play-day-prediction]').innerText(),/Your forecast matched/);
    await page.locator('[data-play-review-day]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.playDayResult==='1');
    assert.ok(await report.locator('[data-play-day-highlight]').count()>2,'important crop changes can expand beyond the first two');
    await report.locator('.cp-day-more summary').click();
    assert.equal(await report.locator('[data-play-day-highlight="5"]').isVisible(),true);
    await report.locator('.cp-day-more summary').click();
    await report.screenshot({path:path.join(out,'garden-day-recap-desktop.png'),style:'.cp-play-nav{position:static!important}'});
    await page.locator('[data-play-day-focus="0"]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.playFocus==='0');
    assert.equal((await state()).day,afterDay.day);
    assert.equal((await state()).budget,afterDay.budget);
    assert.equal((await state()).grid[0].plantId,'corn');
    await page.locator('[data-play-focus-close]').click();

    await page.setViewportSize({width:320,height:844});
    await page.locator('[data-play-review-day]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.playDayResult==='1');
    const focusGeometry=await page.evaluate(()=>({
      top:document.querySelector('.cp-day-heading').getBoundingClientRect().top,
      navBottom:document.querySelector('[data-play-navigation]').getBoundingClientRect().bottom
    }));
    assert.ok(focusGeometry.top>=focusGeometry.navBottom,'recap heading remains visible below sticky navigation');
    findings.recapFocus=focusGeometry;
    assert.equal((await measure()).overflow,false);
    await page.setViewportSize({width:320,height:1100});
    await report.screenshot({path:path.join(out,'garden-day-recap-mobile-320.png'),style:'.cp-play-nav{position:static!important}'});
    await page.setViewportSize({width:320,height:844});
    await page.addScriptTag({path:require.resolve('axe-core')});
    const axeScope=async()=>page.evaluate(async()=>(
      await axe.run({include:['[data-play-outcome]','[data-play-console]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})
    ).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    findings.recapAccessibility=await axeScope();
    assert.deepEqual(findings.recapAccessibility,[]);
    await patch({readableMode:true});
    assert.equal(await page.locator('.cp-day-note').evaluate(el=>getComputedStyle(el).fontSize),'12px','readable mode enlarges recap notes');
    assert.equal((await measure()).overflow,false);
    await patch({readableMode:false});
    assert.equal(await report.evaluate(el=>getComputedStyle(el).animationName),'none','system reduced motion disables recap entrance');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await report.evaluate(el=>getComputedStyle(el).animationName),'cp-day-arrive');
    await patch({reducedMotion:true});
    assert.equal(await report.evaluate(el=>getComputedStyle(el).animationName),'none','in-lab reduced motion also disables recap entrance');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('[data-play-day-return]').click();
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-play-console'));
    await page.locator('[data-play-water]').click();
    assert.deepEqual((await state()).lastDayReport,afterDay.lastDayReport,'care preserves the recorded day-end values');
    assert.equal(await page.locator('[data-play-day-value="moisture"]').innerText(),String(afterDay.lastDayReport.moistureDelta));
    findings.assertions.push('Exact newly-ready flags and crop highlights','Expandable crop evidence and current-crop inspection','Phone recap focus and containment','Forecast alignment and immutable day-end snapshot','Bounded entrance animation and both reduced-motion preferences');

    const winterGrid=empty();
    winterGrid[0]={...winterGrid[0],plantId:'corn',growthDay:30};
    winterGrid[1]={...winterGrid[1],plantId:'strawberry',growthDay:10};
    winterGrid[2].plantId='bee_hotel';
    await patch({grid:winterGrid,day:119,year:1,phase:'grow',moisture:60,nitrogen:50,pH:6.5,budget:41,
      lastDayReport:null,lastCareAction:null,lastFeedback:null,predictionResult:null,dayPrediction:null,
      relationshipFocus:null,plantingTarget:null,selectedPlant:null,placementPreview:null});
    await primary.click();
    const winterReport=page.locator('[data-play-day-result="120"]');
    await winterReport.waitFor();
    assert.match(await page.locator('[data-play-season-change]').innerText(),/Spring begins · Year 2/);
    assert.match(await page.locator('[data-play-day-title]').innerText(),/Winter · Day 30 complete/);
    assert.equal(await page.locator('[data-play-day-value="cleared"]').innerText(),'1');
    assert.equal(await page.locator('[data-play-day-value="carried"]').innerText(),'1');
    assert.equal(await page.locator('[data-play-day-value="growth"]').count(),0,'year reset does not masquerade as negative crop growth');
    assert.equal((await state()).grid[2].plantId,'bee_hotel','habitat structure survives the year boundary');
    await page.locator('[data-play-review-day]').click();
    await page.setViewportSize({width:320,height:1100});
    await winterReport.screenshot({path:path.join(out,'garden-year-recap-mobile-320.png'),style:'.cp-play-nav{position:static!important}'});
    await page.setViewportSize({width:320,height:844});
    assert.equal((await measure()).overflow,false);
    findings.rolloverAccessibility=await axeScope();
    assert.deepEqual(findings.rolloverAccessibility,[]);
    await page.setViewportSize({width:1280,height:1000});
    await winterReport.screenshot({path:path.join(out,'garden-year-recap-desktop.png'),style:'.cp-play-nav{position:static!important}'});
    const beforeReplant=await state();
    await page.locator('[data-play-day-replant="0"]').click();
    await page.waitForFunction(()=>document.activeElement.dataset.plantingDockSurface==='simulation');
    assert.equal((await state()).plantingTarget,0);
    assert.equal((await state()).budget,beforeReplant.budget);
    assert.equal((await state()).day,120);
    const dock=page.locator('[data-planting-dock-surface="simulation"]');
    await dock.locator('[data-planting-candidate="radish"]').click();
    assert.equal(await page.locator('[data-play-day-replant="0"]').isDisabled(),true,'an unresolved preview is protected');
    const preview=JSON.stringify((await state()).placementPreview);
    await page.locator('[data-play-review-day]').click();
    await page.locator('[data-play-day-return]').click();
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-confirm-placement-preview'));
    assert.equal(JSON.stringify((await state()).placementPreview),preview);
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(cpData)));
    await page.evaluate(()=>cpSetData({companionPlanting:{gardenMode:'sisters'}}));
    await page.locator('[data-experiment-entry]').waitFor();
    await page.evaluate(saved=>cpSetData(saved),saved);
    assert.equal((await state()).lastDayReport.year,1);
    assert.equal((await state()).year,2);
    assert.equal((await state()).lastDayReport.plotChanges[0].afterPlantId,null);
    findings.assertions.push('Year reset explains annual clearing and perennial carryover','Completed-day season and year labels','Replanting from a cleared bed preserves funds and time','Pending preview protection and keyboard return','Serialized recap restoration');

    await patch({phase:'plan',lastFeedback:null,placementPreview:null,selectedPlant:null,plantingTarget:null,
      lastDayReport:{day:4,season:'Spring',growthDelta:1.2,healthDelta:.3},predictionResult:null});
    assert.equal(await page.locator('[data-play-outcome]').isVisible(),true);
    assert.equal(await page.locator('[data-play-day-value="moisture"]').innerText(),'—');
    assert.doesNotMatch(await page.locator('[data-play-day-result]').innerText(),/undefined|NaN/);
    findings.assertions.push('Legacy reports remain readable without fabricated values');
    assert.deepEqual(findings.errors,[]);
    fs.writeFileSync(path.join(out,'day-recap-results.json'),JSON.stringify(findings,null,2));
    console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];
    fs.writeFileSync(path.join(out,'day-recap-failure.json'),JSON.stringify({...findings,failure:error.stack},null,2));
    if(page)await page.screenshot({path:path.join(out,'day-recap-failure.png'),fullPage:true});
    throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
