// Run from the repository root: node dev-tools/companion_planting_growth_journey_qa.cjs
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
    await page.setContent('<!doctype html><html lang="en"><head><title>Companion Planting Lab · experiment verification</title></head><body><main id="root"></main></body></html>');
    const cssDir = path.join(root, 'app/static/css');
    const css = fs.readdirSync(cssDir).find(file => /^main\..*\.css$/.test(file));
    await page.addStyleTag({ path: path.join(cssDir, css) });
    await page.addStyleTag({ content: 'body{margin:0;background:#eff3ef;font-family:system-ui}#root{max-width:1152px;margin:16px auto;padding:0 12px}button,select,input,textarea{font:inherit}@media(max-width:640px){#root{padding:0 6px;margin:6px auto}}' });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
    let source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_companionplanting.js'), 'utf8');
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { journey: companionGrowthJourney, art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, condition: companionCropCondition };\n  window.StemLab.registerTool('companionPlanting', {");
    source = source.replace('          // Plant portraits and field-guide details', '          window.cpVisualQA.plants = CG_PLANTS;\n          // Plant portraits and field-guide details');
    source = source.replace('          function getCellBonus(grid, idx) {', '          window.cpVisualQA.relationships = CG_COMPANIONS;\n          function getCellBonus(grid, idx) {');
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
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

    await page.waitForFunction(() => window.cpSetData && window.cpVisualQA.plants);
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    const empty=()=>Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,pests:0,watered:false}));
    const grid=empty();grid[0]={...grid[0],plantId:'corn',growthDay:37.8,health:35};grid[1]={...grid[1],plantId:'beans',growthDay:0};grid[2]={...grid[2],plantId:'rain_barrel'};
    await patch({grid,day:35,phase:'grow',moisture:60,nitrogen:50,budget:40,playGardenLens:'natural',reducedMotion:true,relationshipLens:true,relationshipFocus:0});
    const journey=page.locator('[data-growth-journey]'),panel=page.locator('[data-play-focus-panel]');
    await journey.waitFor();
    const baseline=await state();
    const capture=async(name,locator=journey)=>{await locator.scrollIntoViewIfNeeded();await locator.screenshot({path:path.join(out,name),style:'.cp-play-nav{position:static!important}'});};
    const geometry=()=>journey.evaluate(el=>{
      const bounds=el.getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,steps:el.querySelectorAll('[data-growth-step]').length,current:el.querySelectorAll('[aria-current="step"]').length,
        clipped:[...el.querySelectorAll('[data-growth-step], .cp-growth-step>strong')].some(n=>{const r=n.getBoundingClientRect();return r.left<bounds.left||r.right>bounds.right||n.scrollWidth>n.clientWidth+1;})};
    });
    assert.equal(await journey.locator('[aria-current="step"]').getAttribute('data-growth-step'),'leaves');
    assert.equal(await journey.locator('[aria-current="step"] svg').getAttribute('data-botanical-condition'),'low');
    assert.equal(await journey.locator('[data-growth-step="mature"] svg').getAttribute('data-botanical-condition'),'healthy');
    assert.equal(await journey.locator('[data-growth-maturity]').innerText(),'42% mature');
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});
      assert.deepEqual(await geometry(),{overflow:false,steps:5,current:1,clipped:false});
      await capture('garden-growth-journey-'+width+'.png');await capture('garden-growth-inspector-'+width+'.png',panel);
      // Inspecting the guide is read-only; keyboard browsing uses each new crop's identity.
      await page.locator('[data-play-focus-step="1"]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement.matches('[data-play-focus-step="1"]')&&document.querySelector('[data-growth-journey="1"]'));
      assert.equal(await journey.locator('[aria-current="step"]').getAttribute('data-growth-step'),'seed');
      assert.equal(await journey.locator('svg').evaluateAll(nodes=>nodes.every(n=>n.dataset.botanicalCrop==='beans')),true);
      await page.keyboard.press('Enter');assert.equal(await journey.count(),0,'habitat structures have no crop stages');
      await page.locator('[data-play-focus-step="-1"]').focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('[data-growth-journey="0"]'));
      for(const key of ['grid','budget','day'])assert.deepEqual((await state())[key],baseline[key]);
      findings.viewports.push({width,steps:5,current:1,overflow:false,clipped:false,keyboardBrowsing:true});
    }
    await patch({readableMode:true});assert.deepEqual(await geometry(),{overflow:false,steps:5,current:1,clipped:false});
    await capture('garden-growth-journey-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-growth-journey]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({forcedColors:'active'});assert.equal(await journey.locator('[aria-current="step"]').evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none'});await patch({readableMode:false});
    // Every crop uses the same exact milestone boundaries, including fractional pre-maturity.
    findings.cropCoverage=await page.evaluate(()=>{
      let crops=0,structures=0;
      for(const plant of Object.values(cpVisualQA.plants)){
        const cell={growthDay:0,health:100};
        if(plant.isStructure){if(cpVisualQA.journey(plant,cell,0)!==null)throw Error('Structure got a growth journey');structures++;continue;}
        for(const [fraction,stage] of [[0,0],[.01,0],[.011,1],[.1999,1],[.2,2],[.5499,2],[.55,3],[.9999,3],[1,4]]){
          cell.growthDay=plant.days*fraction;const before=JSON.stringify(cell),model=cpVisualQA.journey(plant,cell,0);
          if(model.stage!==stage||model.ready!==(fraction===1)||model.progress>99&&fraction<1||JSON.stringify(cell)!==before)throw Error('Incorrect stage/readiness: '+plant.label+' '+fraction);
        }
        if(cpVisualQA.journey(plant,{growthDay:NaN,health:100},0)!==null||cpVisualQA.journey(plant,{health:100},0)!==null)throw Error('Missing growth invented a stage');
        crops++;
      }
      return {crops,structures};
    });
    const setCorn=async(growthDay,health=100,day=35)=>{await patch({grid:grid.map((cell,i)=>i===0?{...cell,growthDay,health}:cell),relationshipFocus:0,day,phase:'grow'});await journey.waitFor();};
    await setCorn(89.99,100);assert.equal(await journey.locator('[data-growth-maturity]').innerText(),'99% mature');assert.equal(await journey.getAttribute('data-growth-ready'),'false');
    await setCorn(90,20);assert.equal(await journey.locator('[aria-current="step"]').getAttribute('data-growth-step'),'mature');assert.equal(await journey.getAttribute('data-growth-ready'),'false');assert.match(await journey.locator('[data-growth-next]').innerText(),/Health must be above 20/);assert.equal(await page.locator('[data-play-focus-harvest]').count(),0);
    await capture('garden-growth-mature-care-320.png');
    await setCorn(90,20.1);assert.equal(await journey.getAttribute('data-growth-ready'),'true');assert.equal(await page.locator('[data-play-focus-harvest]').count(),1);await capture('garden-growth-ready-320.png');
    await setCorn(37.8,100,95);assert.match(await journey.locator('[data-growth-next]').innerText(),/Growth is paused for winter/);await capture('garden-growth-winter-320.png');
    // A real growing day crosses a milestone; care does not fake a stage or health recovery.
    await setCorn(17.9,100);const beforeDay=await state();await page.locator('[data-play-primary]').click();
    await page.waitForFunction(day=>cpData.companionPlanting.communityGarden.day===day+1,beforeDay.day);
    assert.ok((await state()).grid[0].growthDay>=18);assert.equal(await journey.locator('[aria-current="step"]').getAttribute('data-growth-step'),'leaves');
    await patch({moisture:25});const beforeCare=await state();await page.locator('[data-play-water]').click();
    assert.equal((await state()).grid[0].growthDay,beforeCare.grid[0].growthDay);assert.equal((await state()).grid[0].health,beforeCare.grid[0].health);
    // A finite arrival animation respects both user motion preferences; there is no repeating portrait animation.
    await page.emulateMedia({reducedMotion:'no-preference'});await patch({reducedMotion:false});
    const art=journey.locator('[aria-current="step"] .cp-growth-art');
    assert.equal(await art.evaluate(el=>getComputedStyle(el).animationName),'cp-growth-arrive');
    assert.equal(await art.evaluate(el=>getComputedStyle(el).animationIterationCount),'1');
    assert.ok(await art.evaluate(el=>parseFloat(getComputedStyle(el).animationDuration)<=.4));
    await page.waitForFunction(()=>document.querySelector('[data-growth-journey]').getAnimations({subtree:true}).every(a=>a.playState!=='running'));
    await patch({reducedMotion:true});assert.equal(await art.evaluate(el=>getComputedStyle(el).animationName),'none');
    await patch({reducedMotion:false});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await art.evaluate(el=>getComputedStyle(el).animationName),'none');
    await patch({reducedMotion:true});
    // Harvest clears an annual's inspector, while a perennial resumes from its actual saved reset stage.
    await setCorn(90,100);await page.locator('[data-play-focus-harvest]').click();assert.equal((await state()).grid[0].plantId,null);assert.equal(await journey.count(),0);
    const perennial=empty();perennial[0]={...perennial[0],plantId:'strawberry',growthDay:200};
    await patch({grid:perennial,day:35,phase:'grow',relationshipFocus:0});await page.locator('[data-play-focus-harvest]').click();
    const saved=(await state()).grid[0];assert.equal(saved.plantId,'strawberry');
    const expected=await page.evaluate(cell=>cpVisualQA.journey(cpVisualQA.plants.strawberry,cell,1),saved);
    await patch({relationshipFocus:0});assert.equal(await journey.locator('[aria-current="step"]').getAttribute('data-growth-step'),expected.steps[expected.stage].id);assert.equal(await journey.locator('[data-growth-maturity]').innerText(),expected.progress+'% mature');
    await page.locator('[data-play-focus-close]').click();assert.equal(await journey.count(),0);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('All crops obey precise stage boundaries and exact harvest-readiness rules; habitat and unknown stages are excluded','Current portraits reflect live stage and health; other portraits are explicitly illustrative','Desktop, 320px, larger text, forced colors, keyboard browsing, and accessibility pass','A real day crosses a growth milestone while watering preserves growth and health','Winter dormancy, stressed mature crops, harvest clearing, and perennial growth reset remain accurate','Arrival animation is finite, respects both reduced-motion settings, and adds no repeating animation');
    fs.writeFileSync(path.join(out,'growth-journey-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error) {
    const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'growth-journey-failure.png'),fullPage:true});throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
