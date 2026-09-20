// Run from the repository root: node dev-tools/companion_planting_plot_cards_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { ready: companionHarvestReady, readiness: companionReadinessMoment, art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, care: companionCareMoment, paintCare: companionPaintCare, moment: companionPlantingMoment, condition: companionCropCondition, wildlife: companionGardenWildlife, pose: companionVisitorPose, visitor: companionPaintGardenVisitor };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const empty=()=>Array.from({length:16},()=>({plantId:null,growthDay:0,health:100,watered:false,pests:0}));
    const grid=empty();
    for(const [index,plantId,growthDay,health,pests] of [[0,'corn',0,100,0],[1,'beans',5,100,0],[2,'sunflower',35,100,0],[3,'tomato',200,100,0],[4,'radish',25,20,0],[5,'marigold',200,35,0],[6,'rain_barrel',200,0,50],[8,'lettuce',0,100,0],[9,'lavender',200,100,45],[10,'nasturtium',32,100,0],[11,'garlic',25,100,0],[12,'clover',200,100,0],[13,'borage',40,100,0],[14,'squash',50,100,0]])grid[index]={...grid[index],plantId,growthDay,health,pests};
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    await patch({grid,day:35,phase:'grow',moisture:60,nitrogen:50,budget:40,playGardenLens:'natural',reducedMotion:true,readableMode:false,playShowPlots:true});
    const tray=page.locator('[data-play-plot-tray]'),map=page.locator('#cp-play-plots'),plot=index=>map.locator(`[data-play-plot="${index}"]`);
    const captureTray=async options=>{
      const size=page.viewportSize();
      // A taller capture viewport avoids clipping a long component at the screenshot's scroll boundary.
      if(size.width<600)await page.setViewportSize({...size,height:1200});
      await tray.screenshot(options);
      if(size.width<600)await page.setViewportSize(size);
    };
    await map.waitFor();assert.equal(await map.locator('button').count(),16);assert.equal(await map.locator('svg').count(),16);
    assert.equal(await plot(0).locator('svg').getAttribute('data-botanical-stage'),'seed');
    assert.equal(await plot(1).locator('svg').getAttribute('data-botanical-stage'),'sprout');
    assert.equal(await plot(2).locator('svg').getAttribute('data-botanical-stage'),'leafing');
    assert.equal(await plot(3).getAttribute('data-plot-ready'),'true');
    assert.equal(await plot(4).getAttribute('data-plot-ready'),'false');
    assert.equal(await plot(4).locator('svg').getAttribute('data-botanical-condition'),'critical');
    assert.equal(await plot(5).getAttribute('data-plot-ready'),'true');assert.equal(await plot(5).getAttribute('data-plot-care'),'true');
    assert.equal(await plot(6).locator('svg').getAttribute('data-botanical-stage'),'structure');assert.equal(await plot(6).getAttribute('data-plot-care'),'false');
    assert.equal(await plot(7).locator('.cp-plot-open').innerText(),'+');
    assert.match(await plot(9).getAttribute('aria-label'),/Ready to harvest. High pest pressure/);
    const geometry=()=>map.evaluate(el=>{
      const cards=[...el.querySelectorAll('button')];
      return {columns:new Set(cards.map(c=>Math.round(c.getBoundingClientRect().left))).size,
        rows:new Set(cards.map(c=>Math.round(c.getBoundingClientRect().top))).size,
        minTarget:Math.min(...cards.map(c=>Math.min(c.clientWidth,c.clientHeight))),
        overflow:document.documentElement.scrollWidth>innerWidth,
        clipped:cards.some(c=>[...c.querySelectorAll('.cp-plot-name,.cp-plot-status')].some(n=>n.scrollWidth>n.clientWidth+1||n.getBoundingClientRect().bottom>c.getBoundingClientRect().bottom)),
        tabStops:cards.filter(c=>c.tabIndex===0).length};
    });
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await tray.scrollIntoViewIfNeeded();
      const before=await state();const shape=await geometry();assert.equal(shape.columns,4);assert.equal(shape.rows,4);assert.ok(shape.minTarget>=44);assert.equal(shape.overflow,false);assert.equal(shape.clipped,false);assert.equal(shape.tabStops,1);
      await captureTray({path:path.join(out,`garden-plot-cards-${width}.png`),style:'.cp-play-nav{position:static!important}'});
      await plot(0).focus();
      for(const [key,expected] of [['ArrowRight',1],['End',3],['ArrowDown',7],['Home',4],['Control+End',15],['Control+Home',0]]){
        await page.keyboard.press(key);await page.waitForFunction(expected=>document.activeElement.dataset.playPlot===String(expected),expected);
      }
      await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.matches('[data-play-focus="0"]'));
      await page.locator('[data-play-focus-close]').click();await page.waitForFunction(()=>document.activeElement.matches('[data-play-plot="0"]'));
      for(const key of ['grid','budget','day','phase','moisture'])assert.deepEqual((await state())[key],before[key]);
      for(const lens of ['harvest','care','companions']){
        await patch({playGardenLens:lens});await page.waitForFunction(lens=>cpData.companionPlanting.communityGarden.playGardenLens===lens,lens);
        const values=await map.locator('button').evaluateAll(nodes=>nodes.map(n=>({value:n.dataset.playPlotValue,text:n.querySelector('.cp-plot-status').textContent})));
        assert.ok(values.every(item=>item.value===item.text));
      }
      await patch({playGardenLens:'natural'});findings.viewports.push({width,...shape,keyboardRoundTrip:true});
    }
    // The miniature preview uses the staged identity and becomes a seed only on confirmation.
    await plot(7).focus();await page.keyboard.press('Enter');
    const dock=page.locator('[data-planting-dock-surface="simulation"]');await dock.waitFor();
    const beforePreview=await state();await dock.locator('[data-planting-candidate="radish"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-play-plot="7"]').dataset.plotPreview==='true');
    assert.equal(await plot(7).locator('svg').getAttribute('data-botanical-crop'),'radish');assert.match(await plot(7).getAttribute('aria-label'),/Not planted/);
    assert.deepEqual((await state()).grid,beforePreview.grid);assert.equal((await state()).budget,beforePreview.budget);
    await captureTray({path:path.join(out,'garden-plot-preview-320.png'),style:'.cp-play-nav{position:static!important}'});
    await dock.locator('[data-confirm-placement-preview]').click();
    await page.waitForFunction(()=>document.querySelector('[data-play-plot="7"]').dataset.plotPreview==='false');
    assert.equal(await plot(7).locator('svg').getAttribute('data-botanical-stage'),'seed');assert.equal((await state()).grid[7].plantId,'radish');assert.equal((await state()).grid[7].growthDay,0);
    assert.ok((await state()).budget<beforePreview.budget);assert.equal((await state()).day,beforePreview.day);findings.previewToSeed=true;
    // Actual care updates tags immediately and does not claim health recovery.
    await patch({phase:'grow'});await page.locator('[data-play-weed]').click();
    await page.waitForFunction(()=>document.querySelector('[data-play-plot="9"]').dataset.plotCare==='false');
    assert.equal(await plot(9).locator('.cp-plot-status').innerText(),'✓ Ready');assert.equal((await state()).grid[4].health,20);
    await patch({readableMode:true});await tray.scrollIntoViewIfNeeded();assert.equal(await plot(0).locator('.cp-plot-name').evaluate(el=>getComputedStyle(el).fontSize),'12px');findings.readable=await geometry();assert.equal(findings.readable.overflow,false);assert.equal(findings.readable.clipped,false);
    await captureTray({path:path.join(out,'garden-plot-readable-320.png'),style:'.cp-play-nav{position:static!important}'});
    await patch({readableMode:false,reducedMotion:false});await page.emulateMedia({reducedMotion:'no-preference'});
    await plot(3).hover();await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[data-play-plot="3"] svg')).transform).f< -1.9);
    findings.hoverLift=await plot(3).locator('svg').evaluate(el=>getComputedStyle(el).transform);assert.notEqual(findings.hoverLift,'none');
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-play-plot="3"] svg')).transform==='none');
    assert.ok(await plot(3).locator('svg').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<=.00001));
    await page.emulateMedia({reducedMotion:'no-preference'});await patch({reducedMotion:true});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-play-plot="3"] svg')).transform==='none');
    assert.equal(await map.locator('.cp-botanical-canopy').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.emulateMedia({forcedColors:'active'});await page.keyboard.press('Tab');await plot(3).focus();assert.equal(await plot(3).evaluate(el=>getComputedStyle(el).outlineStyle),'solid');await page.emulateMedia({forcedColors:'none'});
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-play-plot-tray]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);assert.deepEqual(findings.accessibility,[]);
    // Hidden navigation removes its extra portraits and controls from the DOM.
    await page.locator('[data-play-plots-toggle]').click();assert.equal(await map.count(),0);
    await page.locator('[data-play-plots-toggle]').click();assert.equal(await map.locator('button').count(),16);assert.equal((await geometry()).tabStops,1);
    await page.evaluate(()=>cpRoot.unmount());assert.deepEqual(findings.errors,[]);
    findings.assertions.push('All 16 plot cards use actual crop stage and health while habitat and empty beds stay distinct','Readiness and care coexist without premature maturity or health recovery','Four-column spatial order, full names, 44px targets, keyboard navigation, and inspection focus survive on phones','Harvest, care, and companion lens values remain exact','A real preview spends nothing; confirmation creates the correct zero-day seed','Hover feedback respects manual and OS reduced motion; canopy artwork stays still','Larger text, forced colors, mobile containment, accessibility, and collapsed DOM cleanup pass');
    fs.writeFileSync(path.join(out,'plot-cards-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});