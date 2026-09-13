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
    grid[0]={...grid[0],plantId:'corn',growthDay:45,pests:43.5};
    grid[1]={...grid[1],plantId:'beans',growthDay:20,pests:12};
    grid[4]={...grid[4],plantId:'squash',growthDay:36,pests:8};
    await patch({grid,phase:'grow',day:14,year:1,budget:41,moisture:22.5,nitrogen:12,phosphorus:40,potassium:45,organicMatter:3,reducedMotion:true,relationshipFocus:null,activeReflection:null,lastCareAction:null});
    const tray=page.locator('[data-care-tray]');
    await tray.waitFor();
    assert.equal(await tray.locator('svg.cp-care-art').count(),3);
    assert.equal(await tray.getByRole('meter',{name:'Soil moisture'}).getAttribute('aria-valuenow'),'22.5');
    assert.match(await tray.locator('[data-play-water]').innerText(),/47.5%/);
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:1000});
      await tray.scrollIntoViewIfNeeded();
      assert.equal((await measure()).overflow,false);
      const box=await tray.boundingBox();
      await tray.screenshot({path:path.join(out,'garden-tending-tools-'+width+'.png'),style:'.cp-play-nav{position:static!important}'});
      findings.viewports.push({viewport:width,componentWidth:box.width,height:box.height,overflow:false});
    }
    await page.setViewportSize({width:1280,height:1000});
    await canvas.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'garden-tending-context-1280.png')});
    await page.setViewportSize({width:320,height:844});
    const before=await state();
    await tray.locator('[data-play-water]').click();
    assert.equal((await state()).moisture,47.5);
    assert.equal((await state()).day,before.day);assert.equal((await state()).budget,before.budget);
    assert.equal(await tray.locator('[data-care-change="Moisture"]').innerText(),'Moisture22.5% → 47.5%');
    await tray.locator('[data-play-weed]').click();
    assert.equal((await state()).grid[0].pests,23.5);assert.equal((await state()).grid[1].pests,0);
    assert.equal(await tray.locator('[data-care-result="water"]').count(),0);
    await tray.locator('[data-play-compost]').click();
    assert.equal((await state()).nitrogen,27);
    assert.equal(await tray.locator('[data-play-compost]').isDisabled(),true);
    await tray.screenshot({path:path.join(out,'garden-tending-result-320.png'),style:'.cp-play-nav{position:static!important}'});
    // Values are recorded, not recalculated from today's changed state or inferred from old saves.
    await patch({nitrogen:98,phosphorus:97,potassium:99,organicMatter:9.9,lastCompostDay:null,moisture:82.5});
    await tray.locator('[data-play-compost]').click();
    assert.deepEqual((await state()).lastCareAction.changes.map(c=>c.after),[100,100,100,10]);
    await page.setViewportSize({width:1280,height:1000});
    await tray.screenshot({path:path.join(out,'garden-tending-capped-1280.png'),style:'.cp-play-nav{position:static!important}'});
    assert.match(await tray.locator('#cp-care-hint-water').innerText(),/consider waiting/);
    await tray.locator('[data-play-water]').click();
    assert.equal((await state()).moisture,100);
    assert.equal(await tray.locator('[data-play-water]').isDisabled(),true);
    assert.match(await tray.locator('[data-care-change="Moisture"]').innerText(),/82.5% → 100%/);
    await primary.click();
    assert.equal(await tray.locator('[data-care-result]').count(),0);
    assert.equal(await tray.locator('[data-play-compost]').isDisabled(),false);
    await patch({lastCareAction:{id:'water',label:'Watered garden'}});
    assert.equal(await tray.locator('[data-care-result]').count(),0);
    await page.setViewportSize({width:320,height:844});
    await patch({readableMode:true,moisture:45});
    await tray.scrollIntoViewIfNeeded();
    assert.equal((await measure()).overflow,false);
    const contained=await tray.locator('button').evaluateAll(nodes=>nodes.every(el=>el.scrollWidth<=el.clientWidth+2));
    assert.equal(contained,true,'large-text actions fit');
    await tray.screenshot({path:path.join(out,'garden-tending-large-text-320.png'),style:'.cp-play-nav{position:static!important}'});
    await tray.locator('[data-play-water]').focus();
    await page.keyboard.press('Enter');
    assert.equal((await state()).moisture,70);
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-care-tray]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await patch({readableMode:false,reducedMotion:false});
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await tray.locator('.cp-care-meter>span').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0.45s');
    await patch({reducedMotion:true});
    assert.ok(parseFloat(await tray.locator('.cp-care-meter>span').first().evaluate(el=>getComputedStyle(el).transitionDuration))<=.01);
    await patch({reducedMotion:false});await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(parseFloat(await tray.locator('.cp-care-art').first().evaluate(el=>getComputedStyle(el).transitionDuration))<=.01);
    await page.emulateMedia({forcedColors:'active'});
    await tray.screenshot({path:path.join(out,'garden-tending-forced-colors-320.png'),style:'.cp-play-nav{position:static!important}'});
    await patch({phase:'plan'});assert.equal(await page.locator('[data-care-tray]').count(),0);
    await patch({phase:'grow',grid:empty()});assert.equal(await page.locator('[data-care-tray]').count(),0);
    assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Exact action previews and bounded care receipts','Plot-level pest scope and soil nutrient caps','No time or budget changes from tending','Day advance clears immediate receipts','Desktop, phone, large text, keyboard, and motion preferences','Legacy saves and planning hide unsupported care receipts');
    fs.writeFileSync(path.join(out,'tending-results.json'),JSON.stringify(findings,null,2));
    console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    fs.writeFileSync(path.join(out,'tending-results.json'),JSON.stringify({...findings,failure:error.stack},null,2));
    console.error(error);process.exitCode=1;
  } finally { await browser.close(); }
})();