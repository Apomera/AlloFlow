// Run from the repository root: node dev-tools/companion_planting_botanical_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const empty=()=>Array.from({length:16},()=>({plantId:null,growthDay:0,health:96,watered:false,pests:0}));
    const grid=empty();grid[0]={...grid[0],plantId:'corn',growthDay:55};grid[5]={...grid[5],plantId:'beans',growthDay:32};grid[6]={...grid[6],plantId:'onion',growthDay:25};grid[9]={...grid[9],plantId:'squash',growthDay:38};grid[15]={...grid[15],plantId:'corn',growthDay:25};
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    await patch({grid,day:42,phase:'grow',moisture:60,nitrogen:50,budget:40,playGardenLens:'companions',playCompanionFocus:5,playCompanionNeighbor:null,reducedMotion:true});
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]');
    const scene=page.locator('[data-community-scene-panel]');
    const explorer=page.locator('[data-companion-explorer]');
    await explorer.waitFor();await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLinkCount==='3'&&__cgCanvasEl._cgAnim===null);
    assert.equal(await explorer.locator('[data-companion-net]').innerText(),'+15%');
    assert.deepEqual(await explorer.locator('[data-companion-pair]').evaluateAll(nodes=>nodes.map(el=>+el.dataset.companionPair)),[6,9,0]);
    // The supplied relationship table has one entry per undirected pair, matching the shared view.
    assert.equal(await page.evaluate(()=>{const pairs=cpVisualQA.relationships.map(p=>[p.a,p.b].sort().join(':'));return pairs.length===new Set(pairs).size;}),true);
    const before=await state();
    await explorer.locator('[data-companion-pair="6"]').click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLinkSelected==='6');
    assert.match(await explorer.locator('[data-companion-explanation]').innerText(),/Beans ↔ Onion/);
    assert.equal(await explorer.locator('[data-companion-pair="6"]').getAttribute('aria-pressed'),'true');
    assert.deepEqual((await state()).grid,before.grid);assert.equal((await state()).day,before.day);assert.equal((await state()).budget,before.budget);
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:1200});
      await scene.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>__cgCanvasEl.width===__cgCanvasEl.offsetWidth*2&&__cgCanvasEl._cgAnim===null);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await scene.screenshot({path:path.join(out,'garden-neighborhood-'+width+'.png'),style:'.cp-play-nav{position:static!important}'});
      findings.viewports.push({width,explorer:await explorer.boundingBox(),overflow:false});
    }
    await page.setViewportSize({width:320,height:844});
    await page.locator('[data-play-lens-inspect="5"]').click();
    await page.waitForFunction(()=>document.activeElement.hasAttribute('data-play-focus-panel'));
    await page.locator('[data-play-focus-close]').click();
    await page.waitForFunction(()=>document.activeElement.getAttribute('data-play-lens-inspect')==='5');
    assert.equal(await explorer.locator('[data-companion-pair="6"]').getAttribute('aria-pressed'),'true');
    const returnBounds=await page.locator('[data-play-lens-inspect="5"]').evaluate(el=>({top:el.getBoundingClientRect().top,navBottom:document.querySelector('.cp-play-nav').getBoundingClientRect().bottom}));
    assert.ok(returnBounds.top>=returnBounds.navBottom-1,JSON.stringify(returnBounds));
    await explorer.locator('[data-companion-show]').click();
    await page.waitForFunction(()=>document.activeElement===__cgCanvasEl);
    const sceneFocus=await canvas.evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,navBottom:document.querySelector('.cp-play-nav').getBoundingClientRect().bottom,viewport:innerHeight}));
    assert.ok(sceneFocus.top>=sceneFocus.navBottom-1&&sceneFocus.bottom<=sceneFocus.viewport+1,JSON.stringify(sceneFocus));
    await explorer.locator('[data-companion-pair="0"]').focus();await page.keyboard.press('Enter');
    assert.equal((await state()).playCompanionNeighbor,0);
    await explorer.locator('[data-companion-all]').click();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLinkSelected==='-1');
    await page.setViewportSize({width:1280,height:1200});await scene.scrollIntoViewIfNeeded();
    await scene.screenshot({path:path.join(out,'garden-neighborhood-all-1280.png'),style:'.cp-play-nav{position:static!important}'});
    // Isolate motion with fixed scene times. Neither drawing nor pair selection changes the garden.
    const frames=await canvas.evaluate(el=>{
      const ctx=el.getContext('2d'),frame=el._cgFrameState,paint=(time,reduced)=>cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,time,reduced);
      paint(0,true);const first=el.toDataURL();paint(55,true);const second=el.toDataURL();
      paint(0,false);const animatedA=el.toDataURL();paint(1.3,false);const animatedB=el.toDataURL();
      return {still:first===second,animated:animatedA!==animatedB,alpha:ctx.globalAlpha,identity:ctx.getTransform().isIdentity};
    });
    assert.deepEqual(frames,{still:true,animated:true,alpha:1,identity:true});
    await explorer.locator('[data-companion-crop]').selectOption('15');
    assert.equal(await explorer.locator('[data-companion-pair]').count(),0);
    assert.match(await explorer.locator('.cp-pair-empty').innerText(),/No modeled pairs/);
    await patch({playCompanionFocus:5,playCompanionNeighbor:6});
    const saved=await state();await page.evaluate(saved=>cpSetData({companionPlanting:{gardenMode:'community',communityGarden:saved}}),saved);
    assert.equal(await explorer.locator('[data-companion-pair="6"]').getAttribute('aria-pressed'),'true');
    const removed=empty();removed[5]={...grid[5]};removed[0]={...grid[0]};
    await patch({grid:removed});
    assert.equal(await explorer.locator('[data-companion-all]').count(),0);
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLinkSelected==='-1'&&__cgCanvasEl.dataset.gardenLinkCount==='1');
    // All eight adjacent beds count; the distant matching crop never contributes.
    const dense=empty();for(const i of [0,1,2,4,6,8,9,10,15])dense[i]={...dense[i],plantId:'corn',growthDay:65};dense[5]={...dense[5],plantId:'beans',growthDay:40};
    await patch({grid:dense,playCompanionFocus:5,playCompanionNeighbor:6,readableMode:true});
    assert.equal(await explorer.locator('[data-companion-net]').innerText(),'+144%');
    assert.equal(await explorer.locator('[data-companion-pair]').count(),8);
    await page.setViewportSize({width:320,height:1400});await scene.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLinkCount==='8'&&__cgCanvasEl._cgAnim===null);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await scene.screenshot({path:path.join(out,'garden-neighborhood-eight-320.png'),style:'.cp-play-nav{position:static!important}'});
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-play-garden-views]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await patch({readableMode:false,reducedMotion:false});await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>__cgCanvasEl._cgAnim!==null);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null);
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenLinkCount==='8'&&__cgCanvasEl._cgAnim===null);
    assert.equal(await explorer.isVisible(),false,'explorer stays out of the maximized scene');
    await page.getByRole('button',{name:'Exit maximized garden view',exact:true}).click();
    await explorer.waitFor({state:'visible'});
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;cpRoot.unmount();});
    await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._cgAnim),null);
    assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Individual pair values and net totals match actual adjacent crops','Selection isolates one pair without modifying time, funds, or planting','Inspection returns focus to the explorer with its selected pair intact','Keyboard selection, saved-state restoration, removed neighbors, and isolated crops','All eight adjacent beds included and distant crops excluded','Reduced motion is still; enabled motion changes frames; context and lifecycle remain balanced','Desktop, phone, larger text, and maximized layouts remain usable');
    fs.writeFileSync(path.join(out,'neighborhood-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } catch(error){fs.writeFileSync(path.join(out,'neighborhood-results.json'),JSON.stringify({...findings,failure:error.stack},null,2));console.error(error);process.exitCode=1;}
  finally{await browser.close();}
})();