// Run from the repository root: node dev-tools/companion_planting_crop_watch_qa.cjs
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

    const empty=()=>Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    const grid=empty();
    grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    grid[1]={...grid[1],plantId:'radish',growthDay:25};
    grid[2]={...grid[2],plantId:'lettuce',growthDay:200,health:20};
    grid[3]={...grid[3],plantId:'basil',growthDay:39};
    grid[4]={...grid[4],plantId:'tomato',growthDay:12};
    grid[5]={...grid[5],plantId:'rain_barrel',growthDay:200};
    await patch({grid,phase:'grow',day:35,year:1,budget:41,moisture:60,nitrogen:50,totalHarvested:7,reducedMotion:true,relationshipFocus:null,activeReflection:null,playCropWatchReturn:null});
    const watch=page.locator('[data-crop-watch]');
    await watch.waitFor();
    assert.match(await watch.locator('[data-crop-watch-summary]').innerText(),/1 ready · 3 growing · 1 need care/);
    assert.deepEqual(await watch.locator('[data-watch-plot]').evaluateAll(nodes=>nodes.map(el=>+el.dataset.watchPlot)),[1,2,0]);
    assert.equal(await watch.getByRole('progressbar',{name:'Corn maturity',exact:true}).getAttribute('aria-valuenow'),'99');
    assert.equal(await watch.locator('[data-watch-plot="2"]').getAttribute('data-tone'),'care');
    const before=await state();
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?1100:1000});
      await watch.scrollIntoViewIfNeeded();
      assert.equal((await measure()).overflow,false);
      const geometry=await watch.evaluate(el=>({height:el.offsetHeight,width:el.offsetWidth}));
      await watch.screenshot({path:path.join(out,'garden-crop-watch-'+width+'.png'),style:'.cp-play-nav{position:static!important}'});
      findings.viewports.push({width,...geometry,overflow:false});
    }
    await page.setViewportSize({width:320,height:844});
    await watch.locator('[data-watch-inspect="0"]').click();
    const panel=page.locator('[data-play-focus-panel]');
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-play-focus-panel'));
    assert.equal((await state()).relationshipFocus,0);
    assert.equal((await state()).playCropWatchReturn,0);
    const focusBounds=await panel.evaluate(el=>({top:el.getBoundingClientRect().top,navBottom:document.querySelector('.cp-play-nav').getBoundingClientRect().bottom}));
    assert.ok(focusBounds.top>=focusBounds.navBottom-1,JSON.stringify(focusBounds));
    await panel.locator('[data-play-focus-close]').click();
    await page.waitForFunction(()=>document.activeElement.getAttribute('data-watch-inspect')==='0');
    assert.deepEqual((await state()).grid,before.grid);assert.equal((await state()).budget,before.budget);assert.equal((await state()).day,before.day);
    await watch.locator('[data-crop-watch-all]').click();
    await page.waitForFunction(()=>document.activeElement.getAttribute('data-play-plot')==='1');
    assert.equal((await state()).playGardenLens,'harvest');
    assert.equal((await state()).playShowPlots,true);
    assert.equal(await page.locator('[data-play-plot="0"]').getAttribute('data-play-plot-value'),'99%');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-crop-watch]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await patch({day:95,playGardenLens:'natural',playShowPlots:false});
    await watch.scrollIntoViewIfNeeded();
    assert.match(await watch.locator('[data-crop-watch-summary]').innerText(),/3 resting/);
    assert.equal(await watch.locator('[data-watch-stage="0"]').innerText(),'Winter rest');
    await page.setViewportSize({width:320,height:1100});
    await watch.screenshot({path:path.join(out,'garden-crop-watch-winter-320.png'),style:'.cp-play-nav{position:static!important}'});
    // Maturity advances from 99 to exactly 100, while a crop at the health boundary stays blocked.
    await patch({day:35,grid:grid.map((cell,i)=>i===0?{...cell,growthDay:90}:cell)});
    assert.equal(await watch.getByRole('progressbar',{name:'Corn maturity',exact:true}).getAttribute('aria-valuenow'),'100');
    assert.equal(await watch.locator('[data-watch-stage="0"]').innerText(),'Ready to harvest');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await patch({reducedMotion:false});
    assert.equal(await watch.locator('.cp-watch-meter>span').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0.5s');
    await patch({reducedMotion:true});
    assert.ok(parseFloat(await watch.locator('.cp-watch-meter>span').first().evaluate(el=>getComputedStyle(el).transitionDuration))<=.01);
    await patch({reducedMotion:false});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(parseFloat(await watch.locator('.cp-watch-ring circle').last().evaluate(el=>getComputedStyle(el).transitionDuration))<=.01);
    await patch({readableMode:true});
    await watch.scrollIntoViewIfNeeded();
    assert.equal((await measure()).overflow,false);
    await watch.screenshot({path:path.join(out,'garden-crop-watch-large-text-320.png'),style:'.cp-play-nav{position:static!important}'});
    const harvestGrid=empty();
    harvestGrid[0]={...harvestGrid[0],plantId:'strawberry',growthDay:200};
    harvestGrid[1]={...harvestGrid[1],plantId:'corn',growthDay:90};
    harvestGrid[2]={...harvestGrid[2],plantId:'lettuce',growthDay:200,health:20};
    await patch({grid:harvestGrid,cellHistory:{2:['radish']},readableMode:false,phase:'grow',reducedMotion:true,relationshipFocus:null});
    await primary.click();
    await page.locator('[data-play-harvest-receipt]').waitFor();
    assert.equal((await state()).lastHarvestBatch.cropCount,2);
    assert.deepEqual((await state()).cellHistory[2],['radish']);
    assert.equal(await watch.locator('[data-watch-stage="0"]').innerText(),'Newly planted');
    assert.equal(await watch.locator('[data-watch-stage="2"]').innerText(),'Needs care');
    await watch.screenshot({path:path.join(out,'garden-crop-watch-after-harvest-320.png'),style:'.cp-play-nav{position:static!important}'});
    await patch({grid:empty()});assert.equal(await watch.count(),0);
    const habitat=empty();habitat[0]={...habitat[0],plantId:'rain_barrel'};
    await patch({grid:habitat});assert.equal(await watch.count(),0);
    findings.assertions.push('Ready, blocked, and most-mature crops are shown in priority order','Exact maturity and harvest-health boundaries',
      'Crop inspection and focus return without changing garden state','All-crop values open the keyboard map',
      'Winter rest, large text, and reduced motion','Perennials restart after harvest; blocked plots remain unharvested','Empty and habitat-only gardens hide crop watch');
    assert.deepEqual(findings.errors,[]);
    fs.writeFileSync(path.join(out,'crop-watch-results.json'),JSON.stringify(findings,null,2));
    console.log(JSON.stringify(findings,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
