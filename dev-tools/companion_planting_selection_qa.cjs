// Run from the repository root: node dev-tools/companion_planting_selection_qa.cjs
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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting, basket: companionHarvestBasket, produce: companionDrawProduce, condition: companionCropCondition };\n  window.StemLab.registerTool('companionPlanting', {");
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
    const ids=['corn','dill','tomato','pepper','marigold','beans','borage','basil','cucumber','nasturtium','lettuce','carrot','lavender','strawberry','radish','rain_barrel'];
    const grid=await page.evaluate(ids=>ids.map(plantId=>({plantId,growthDay:cpVisualQA.plants[plantId].days*.8,health:96,pests:0,watered:false})),ids);
    const patch=async change=>page.evaluate(change=>cpSetData(prev=>({companionPlanting:{...prev.companionPlanting,communityGarden:{...prev.companionPlanting.communityGarden,...change}}})),change);
    const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(cpData.companionPlanting.communityGarden)));
    await patch({grid,day:44,phase:'grow',moisture:60,nitrogen:50,budget:40,playGardenLens:'natural',reducedMotion:true,relationshipLens:true,relationshipFocus:5});
    const canvas=page.locator('canvas[aria-describedby="community-plot-help"]');
    const waitForCanvas=async()=>{await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>__cgCanvasEl._cgAnim===null&&+__cgCanvasEl.dataset.gardenRenderWidth===__cgCanvasEl.width);};
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:width===320?844:1000});await waitForCanvas();
      const before=await state();
      await page.locator('[data-play-focus-locate="5"]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement===__cgCanvasEl&&__cgCanvasEl.dataset.gardenSelectedPlot==='5');
      assert.equal(await canvas.getAttribute('data-garden-locate-active'),'false','reduced motion has no locate pulse');
      assert.match(await canvas.getAttribute('aria-label'),/Selected Plot 6 · Beans/);
      await canvas.screenshot({path:path.join(out,`garden-selected-${width}.png`)});
      // A second hovered bed keeps the inspected plot selected.
      await canvas.evaluate(el=>{el._hoverCell=11;cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,0,true);});
      assert.equal(await canvas.getAttribute('data-garden-selected-plot'),'5');
      await canvas.screenshot({path:path.join(out,`garden-selected-hover-${width}.png`)});
      const still=await canvas.evaluate(el=>{
        const ctx=el.getContext('2d'),frame=el._cgFrameState;el._hoverCell=-1;
        cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,0,true);const first=el.toDataURL();
        cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,55,true);const same=first===el.toDataURL();
        el._cgBedLayer.key=null;cpVisualQA.scene(ctx,el,React,frame,cpVisualQA.plants,cpVisualQA.relationships,0,true);
        return {same,fresh:first===el.toDataURL(),identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha};
      });
      assert.deepEqual(still,{same:true,fresh:true,identity:true,alpha:1});
      await canvas.evaluate(el=>cpVisualQA.scene(el.getContext('2d'),el,React,el._cgFrameState,cpVisualQA.plants,cpVisualQA.relationships,66,false));
      await canvas.screenshot({path:path.join(out,`garden-selected-night-${width}.png`)});
      await page.locator('[data-play-selection-return="5"]').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.activeElement.matches('[data-play-focus="5"]'));
      assert.deepEqual(await state(),before,'locating and returning do not change garden state');
      await page.locator('[data-play-focus-step="1"]').click();
      assert.equal(await page.locator('[data-play-focus-locate="6"]').count(),1);
      await page.locator('[data-play-focus-locate="6"]').click();await waitForCanvas();
      await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenSelectedPlot==='6');
      await page.locator('[data-play-selection-return="6"]').click();
      await page.locator('[data-play-focus-close]').click();await waitForCanvas();
      await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenSelectedPlot==='-1');
      assert.equal(await page.locator('[data-play-selection-return]').count(),0);
      assert.doesNotMatch(await canvas.getAttribute('aria-label'),/Selected Plot/);
      await patch({relationshipLens:true,relationshipFocus:5});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      findings.viewports.push({width,selectionSurvivesHover:true,keyboardRoundTrip:true,reducedMotionStable:true});
    }
    // The finite locate cue shares the scene loop and cancels on reset, preview, or changed crop.
    await waitForCanvas();
    findings.locate=await canvas.evaluate(el=>{
      const ctx=el.getContext('2d'),frame=el._cgFrameState;
      const draw=(testFrame,reduced)=>cpVisualQA.scene(ctx,el,React,testFrame,cpVisualQA.plants,cpVisualQA.relationships,0,reduced);
      el._hoverCell=-1;el._cgLocate={index:5,plantId:'beans',t0:null};draw(frame,false);
      const starts=typeof el._cgLocate.t0==='number'&&el.dataset.gardenLocateActive==='true';
      el._cgLocate.t0=performance.now()-150;draw(frame,false);const first=el.toDataURL();
      el._cgLocate.t0=performance.now()-500;draw(frame,false);const changes=first!==el.toDataURL();
      el._cgLocate.t0=performance.now()-900;draw(frame,false);const expires=el._cgLocate===null;
      const previewGrid=frame.grid.map((cell,i)=>i===8?{...cell,plantId:null,growthDay:0}:cell);
      el._cgLocate={index:5,plantId:'beans',t0:null};draw({...frame,phase:'plan',grid:previewGrid,placementPreview:{plot:8,plantId:'tomato'}},false);
      const previewCancels=el._cgLocate===null&&el.dataset.gardenSelectedPlot==='-1';
      const invalidPreviewIgnored=[
        {...frame,phase:'plan',placementPreview:{plot:8,plantId:'tomato'}},
        {...frame,phase:'plan',grid:previewGrid,placementPreview:{plot:8}}
      ].every(testFrame=>{
        el._cgLocate={index:5,plantId:'beans',t0:null};draw(testFrame,false);
        return el._cgLocate!==null&&el.dataset.gardenSelectedPlot==='5';
      });
      el._cgLocate={index:5,plantId:'beans',t0:null};draw({...frame,grid:frame.grid.map((cell,i)=>i===5?{...cell,plantId:'basil'}:cell)},false);
      const changedCropCancels=el._cgLocate===null;
      el._cgLocate={index:5,plantId:'beans',t0:null};draw({...frame,cg:{...frame.cg,relationshipFocus:null}},false);
      const closedCancels=el._cgLocate===null;
      el._cgLocate={index:5,plantId:'beans',t0:null};draw(frame,true);
      return {starts,changes,expires,previewCancels,invalidPreviewIgnored,changedCropCancels,closedCancels,reducedCancels:el._cgLocate===null,identity:ctx.getTransform().isIdentity,alpha:ctx.globalAlpha};
    });
    assert.ok(Object.entries(findings.locate).every(([key,value])=>key==='alpha'?value===1:value===true),JSON.stringify(findings.locate));
    await patch({relationshipFocus:15});await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenSelectedPlot==='15');
    await canvas.screenshot({path:path.join(out,'garden-selected-habitat-320.png')});
    await patch({relationshipFocus:99});await waitForCanvas();
    await page.waitForFunction(()=>__cgCanvasEl.dataset.gardenSelectedPlot==='-1');
    await patch({relationshipFocus:5,readableMode:true});
    await page.locator('[data-play-garden-views]').screenshot({path:path.join(out,'garden-selection-controls-320.png'),style:'.cp-play-nav{position:static!important}'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await patch({readableMode:false});await page.setViewportSize({width:1280,height:1000});
    await page.getByRole('button',{name:'Maximize garden view',exact:true}).click();await waitForCanvas();
    await canvas.screenshot({path:path.join(out,'garden-selected-maximized-1280.png')});
    await page.locator('[data-play-selection-return]').click();
    await page.waitForFunction(()=>cpData.companionPlanting.communityGarden.maximized===false&&document.activeElement.matches('[data-play-focus="5"]'));
    await page.addScriptTag({path:require.resolve('axe-core')});
    findings.accessibility=await page.evaluate(async()=>(await axe.run({include:['[data-community-scene-panel]','[data-play-garden-views]','[data-play-focus]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations);
    assert.deepEqual(findings.accessibility,[]);
    await page.evaluate(()=>{window.retiredGarden=__cgCanvasEl;retiredGarden._cgLocate={index:5,plantId:'beans',t0:null};cpRoot.unmount();});await page.waitForFunction(()=>retiredGarden._cgCanvasInit===false);
    assert.equal(await page.evaluate(()=>retiredGarden._cgLocate),null);assert.deepEqual(findings.errors,[]);
    findings.assertions.push('Selected crop stays marked while another plot is hovered','Show in garden and return to details preserve saved state','Browsing, closing, restored habitat, and invalid selections update correctly','Locate pulse starts on drawing, ends after 850ms, and cancels safely','Preview evidence takes priority over inspection decoration','Phone, large text, night, maximized layout, balanced canvas, and cleanup');
    fs.writeFileSync(path.join(out,'selection-results.json'),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});