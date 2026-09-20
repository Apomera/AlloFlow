// Run from the repository root: node dev-tools/companion_planting_season_outlook_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { harvestArt: companionHarvestArt, ready: companionHarvestReady, readiness: companionReadinessMoment, art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, care: companionCareMoment, paintCare: companionPaintCare, moment: companionPlantingMoment, condition: companionCropCondition, wildlife: companionGardenWildlife, pose: companionVisitorPose, visitor: companionPaintGardenVisitor };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const grid=empty();for(const [index,plantId,growthDay] of [[0,'corn',5],[4,'radish',3],[5,'strawberry',18],[8,'blueberry',7],[6,'rain_barrel',0],[15,'bee_hotel',0]])grid[index]={...grid[index],plantId,growthDay};
    await page.evaluate(()=>{Math.random=()=>.99;});
    await patch({grid,phase:'grow',day:105,year:1,budget:41,moisture:60,nitrogen:50,reducedMotion:true,readableMode:false});
    const outlook=page.locator('[data-play-season-outlook]'),summary=outlook.locator('summary'),steps=outlook.locator('[data-season-step]'),meter=outlook.getByRole('progressbar'),primary=page.locator('[data-play-primary]');
    await outlook.waitFor();const initial=await state();assert.equal(await outlook.getAttribute('open'),null);
    const geometry=()=>outlook.evaluate(el=>{
      const tiles=[...el.querySelectorAll('[data-season-step]')],rects=tiles.map(n=>n.getBoundingClientRect());
      return {overflow:document.documentElement.scrollWidth>innerWidth,columns:new Set(rects.map(r=>Math.round(r.left))).size,
        clipped:[...el.querySelectorAll('.cp-season-step,.cp-season-progress,.cp-season-carryover>span')].some(n=>n.scrollWidth>n.clientWidth+1),target:el.querySelector('summary').getBoundingClientRect().height>=44};
    });
    const capture=async(name,target=outlook)=>{const viewport=page.viewportSize(),bounds=await target.boundingBox();await page.setViewportSize({...viewport,height:Math.max(viewport.height,Math.ceil(bounds.height)+180)});await target.scrollIntoViewIfNeeded();await target.screenshot({path:path.join(out,name),style:'.cp-play-nav{visibility:hidden!important}'});await page.setViewportSize(viewport);};
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});assert.equal(await outlook.getAttribute('open'),null);
      await capture('garden-season-collapsed-'+width+'.png',page.locator('[data-play-console]'));
      await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.evaluate(el=>document.activeElement===el),true);
      assert.deepEqual(await geometry(),{overflow:false,columns:width===320?2:4,clipped:false,target:true});
      assert.equal(await steps.count(),4);assert.equal(await steps.filter({has:page.locator('[data-season-art="3"]')}).getAttribute('aria-current'),'step');
      assert.equal(await meter.getAttribute('aria-valuenow'),'16');assert.equal((await outlook.locator('[data-season-countdown]').innerText()).trim(),'· Spring in 15 simulated days');
      assert.equal(await outlook.locator('[data-season-annuals]').innerText(),'2 annual beds clear');assert.equal(await outlook.locator('[data-season-perennials]').innerText(),'2 perennial beds remain');assert.equal(await outlook.locator('[data-season-structures]').innerText(),'2 habitat structures remain');
      await capture('garden-season-outlook-'+width+'.png');if(width===1280)await capture('garden-season-controls-1280.png',page.locator('[data-play-console]'));
      await page.keyboard.press('Enter');assert.equal(await outlook.getAttribute('open'),null);assert.deepEqual(await state(),initial);findings.viewports.push({width,columns:width===320?2:4,overflow:false,clipped:false,keyboardDisclosure:true});
    }
    await summary.click();await patch({readableMode:true});assert.equal(await outlook.locator('.cp-season-tempo').first().evaluate(el=>getComputedStyle(el).fontSize),'13px');assert.equal(await outlook.locator('.cp-season-progress>div').first().evaluate(el=>getComputedStyle(el).fontSize),'13px');
    assert.deepEqual(await geometry(),{overflow:false,columns:2,clipped:false,target:true});await capture('garden-season-readable-320.png');
    await page.addScriptTag({path:require.resolve('axe-core')});findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-play-season-outlook]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    await page.emulateMedia({forcedColors:'active'});await summary.focus();assert.equal(await summary.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal(await steps.nth(3).evaluate(el=>getComputedStyle(el).outlineStyle),'solid');assert.equal((await geometry()).overflow,false);
    await page.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});await patch({reducedMotion:false});assert.equal(await meter.locator('span').evaluate(el=>getComputedStyle(el).transitionDuration),'0.35s');
    await patch({day:106});await meter.locator('span').evaluate(async el=>Promise.all(el.getAnimations().map(a=>a.finished)));assert.equal(await meter.getAttribute('aria-valuenow'),'17');
    await patch({reducedMotion:true});assert.equal(await meter.locator('span').evaluate(el=>getComputedStyle(el).transitionProperty),'none');
    await patch({reducedMotion:false});await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await meter.locator('span').evaluate(el=>getComputedStyle(el).transitionProperty),'none');
    assert.equal(await outlook.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
    // Every boundary uses the current day, never a stale saved report or a projected harvest date.
    for(const [day,index,name,position,next,left] of [[0,0,'Spring',1,'Summer',30],[29,0,'Spring',30,'Summer',1],[30,1,'Summer',1,'Autumn',30],[59,1,'Summer',30,'Autumn',1],[60,2,'Autumn',1,'Winter',30],[89,2,'Autumn',30,'Winter',1],[90,3,'Winter',1,'Spring',30],[119,3,'Winter',30,'Spring',1],[120,0,'Spring',1,'Summer',30]]){
      await patch({day});assert.equal(await steps.nth(index).getAttribute('aria-current'),'step');assert.equal(await meter.getAttribute('aria-valuenow'),String(position));assert.equal(await outlook.locator('[data-season-position]').innerText(),name+' · Day '+position+' of 30');assert.equal((await outlook.locator('[data-season-countdown]').innerText()).trim(),'· '+next+' in '+left+' simulated day'+(left===1?'':'s'));
      if(day===0||day===30||day===60||day===119)await capture('garden-season-'+name.toLowerCase()+'-320.png');
    }
    // Reading while a planting preview is pending must not cancel it or spend funds.
    await patch({phase:'plan',day:119,plantingTarget:1,selectedPlant:'beans',placementPreview:{plot:1,plantId:'beans'}});const staged=await state();await summary.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');assert.deepEqual(await state(),staged);assert.equal(await primary.isDisabled(),true);
    // The actual year rollover agrees with the outlook and applies existing perennial rules.
    await patch({grid,day:119,year:3,phase:'grow',moisture:60,nitrogen:50,plantingTarget:null,selectedPlant:null,placementPreview:null,activeEvent:null,lastDayReport:null,lastCareAction:null,relationshipFocus:null});
    const beforeYear=await state();assert.equal(await primary.innerText(),'Advance 1 day');await primary.click();
    await page.waitForFunction(()=>cpData.companionPlanting.communityGarden.day===120);const afterYear=await state();assert.equal(afterYear.year,4);assert.equal(afterYear.budget,beforeYear.budget);assert.equal(afterYear.grid[0].plantId,null);assert.equal(afterYear.grid[4].plantId,null);assert.equal(afterYear.grid[5].plantId,'strawberry');assert.equal(afterYear.grid[5].growthDay,8);assert.equal(afterYear.grid[8].growthDay,0);assert.equal(afterYear.grid[6].plantId,'rain_barrel');assert.equal(afterYear.grid[15].plantId,'bee_hotel');
    assert.equal(await outlook.locator('[data-season-position]').innerText(),'Spring · Day 1 of 30');assert.equal(await outlook.locator('[data-season-carryover]').count(),0);assert.match(await outlook.locator('.cp-season-progress').innerText(),/Year 4/);await capture('garden-season-new-year-320.png');
    // Autumn becoming winter leaves annual beds planted; clearing happens at year end.
    await patch({grid,day:89,year:1,phase:'grow',moisture:60,nitrogen:50,lastCareAction:null,lastDayReport:null,activeEvent:null});await primary.click();assert.equal((await state()).day,90);assert.equal((await state()).grid[0].plantId,'corn');assert.equal(await outlook.locator('[data-season-annuals]').innerText(),'2 annual beds clear');
    const habitat=empty();habitat[0].plantId='bee_hotel';await patch({grid:habitat,day:119});assert.equal(await outlook.locator('[data-season-annuals]').innerText(),'No annual beds to clear');assert.equal(await outlook.locator('[data-season-structures]').innerText(),'1 habitat structure remains');
    await patch({grid:empty()});assert.equal(await outlook.count(),0);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Four seasonal landscapes identify the current season with exact day positions and countdowns','Actual autumn/winter and year transitions agree with annual, perennial, and habitat guidance','Reading and keyboard disclosure preserve all state, including staged planting previews','Desktop, 320px, larger text, forced colors, 44px disclosure, bounded progress motion, both reduced-motion preferences, accessibility, and cleanup pass');
    fs.writeFileSync(path.join(out,'season-outlook-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  }catch(error){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(out,'season-outlook-failure.png')});throw error;}
  finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});