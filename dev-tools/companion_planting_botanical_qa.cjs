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
    source = source.replace("  window.StemLab.registerTool('companionPlanting', {", "  window.cpVisualQA = { art: companionBotanicalArt, scene: companionDrawGardenScene, light: companionGardenLighting };\n  window.StemLab.registerTool('companionPlanting', {");
    source = source.replace('          // Plant portraits and field-guide details', '          window.cpVisualQA.plants = CG_PLANTS;\n          // Plant portraits and field-guide details');
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
    const ids = ['corn', 'dill', 'beans', 'tomato', 'marigold', 'borage', 'pepper', 'basil', 'cucumber', 'nasturtium', 'lettuce', 'carrot', 'lavender', 'strawberry', 'radish', 'rain_barrel'];
    await page.evaluate(ids => {
      const plants = cpVisualQA.plants;
      cpSetData({ companionPlanting: { gardenMode: 'community', communityGarden: { day: 44, phase: 'grow', moisture: 60, beneficialPop: 12, reducedMotion: true,
        grid: ids.map((plantId, i) => ({ plantId, growthDay: plants[plantId].days, health: 98, pests: 0, watered: i % 2 === 0 })) } } });
    }, ids);
    const canvas = page.locator('canvas[aria-describedby="community-plot-help"]');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => __cgCanvasEl.dataset.gardenReadyCount === '15' && __cgCanvasEl._cgAnim === null);
    await canvas.screenshot({ path: path.join(out, 'garden-refined-desktop.png') });

    // Render deterministic scene times directly in this fixture; production exposes no debug controls.
    const lightChecks = await page.evaluate(() => {
      const values = [0, 24, 40, 56, 66, 83, 100, 120].map(t => cpVisualQA.light(t));
      return { values, before: cpVisualQA.light(119.999), after: cpVisualQA.light(0) };
    });
    assert.ok(lightChecks.values.every(x => x.sun === 0 || x.moon === 0), 'sun and moon do not overlap');
    assert.ok(lightChecks.values.some(x => x.moon === 1 && x.night > .6), 'moon is visible at night');
    assert.ok(Math.abs(lightChecks.before.night - lightChecks.after.night) < .001, 'night cycle wraps continuously');
    await canvas.evaluate(el => cpVisualQA.scene(el.getContext('2d'), el, React, el._cgFrameState, cpVisualQA.plants, [], 66, false));
    await canvas.screenshot({ path: path.join(out, 'garden-refined-night.png') });

    // Harvest readiness is a user-facing count, and must match the harvest action.
    await page.evaluate(() => cpSetData(prev => {
      const garden = prev.companionPlanting.communityGarden;
      return { companionPlanting: { ...prev.companionPlanting, communityGarden: { ...garden, grid: garden.grid.map((cell, i) => i === 0 ? { ...cell, growthDay: 88.2 } : i === 3 ? { ...cell, health: 20 } : cell) } } };
    }));
    await page.waitForFunction(() => __cgCanvasEl.dataset.gardenReadyCount === '13');
    findings.assertions.push('Harvest-ready scene count excludes immature and unhealthy crops and structures');
    await page.evaluate(() => cpSetData(prev => {
      const garden = prev.companionPlanting.communityGarden;
      return { companionPlanting: { ...prev.companionPlanting, communityGarden: { ...garden, grid: garden.grid.map(cell => ({ ...cell, growthDay: cpVisualQA.plants[cell.plantId].days, health: 98 })) } } };
    }));
    await page.waitForFunction(() => __cgCanvasEl.dataset.gardenReadyCount === '15');
    await page.setViewportSize({ width: 320, height: 844 });
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Number(__cgCanvasEl.dataset.gardenRenderWidth) === __cgCanvasEl.width && __cgCanvasEl._cgAnim === null);
    await canvas.screenshot({ path: path.join(out, 'garden-refined-mobile-320.png') });

    // Growth easing remains bounded and finishes; reduced motion jumps to the current measurement.
    await page.setViewportSize({ width: 1280, height: 1000 });
    await canvas.scrollIntoViewIfNeeded();
    await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, grid: prev.companionPlanting.communityGarden.grid.map(cell => ({ ...cell, growthDay: 0 })) } } })));
    await page.waitForFunction(() => __cgCanvasEl._cgGrowthStates[0].value === 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, reducedMotion: false } } })));
    await page.waitForFunction(() => __cgCanvasEl.dataset.gardenMotion === 'animated');
    await page.evaluate(() => cpSetData(prev => ({ companionPlanting: { ...prev.companionPlanting, communityGarden: { ...prev.companionPlanting.communityGarden, grid: prev.companionPlanting.communityGarden.grid.map(cell => ({ ...cell, growthDay: cpVisualQA.plants[cell.plantId].days })) } } })));
    await page.waitForFunction(() => __cgCanvasEl._cgGrowthStates[0].value > 0 && __cgCanvasEl._cgGrowthStates[0].value < 1);
    await page.waitForFunction(() => __cgCanvasEl._cgGrowthStates[0].value === 1);
    await canvas.evaluate(el => { el._actionBurst = { kind: 'water', t0: performance.now() - 630 }; cpVisualQA.scene(el.getContext('2d'), el, React, el._cgFrameState, cpVisualQA.plants, [], 0, false); });
    await canvas.screenshot({ path: path.join(out, 'garden-watering-detail.png') });
    await page.waitForFunction(() => __cgCanvasEl._actionBurst === null);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => __cgCanvasEl._cgAnim === null);
    findings.assertions.push('Growth easing reaches the measured endpoint', 'Watering effect expires', 'Motion preferences stop the animation loop', 'Day and night transition continuously');

    // Both SVG and canvas consume the same botanical nodes. Review the authored species at a useful size.
    await page.evaluate(() => {
      document.getElementById('root').style.display = 'none';
      const el = document.createElement('div'); el.id = 'botanical-review'; document.body.appendChild(el);
      window.reviewRoot = ReactDOM.createRoot(el);
      const R = React, h = R.createElement, plants = cpVisualQA.plants;
      const ids = ['lavender','rosemary','dill','yarrow','borage','cucumber','pepper','carrot','radish','onion','strawberry','clover','nasturtium','buckwheat','rhubarb','tomato'];
      reviewRoot.render(h('section', { style: { background:'#f8f6ed',padding:28,maxWidth:1040,margin:'20px auto',borderRadius:20 } },
        h('h1', { style:{margin:'0 0 8px',color:'#294b36',fontSize:26} }, 'A closer look at the garden'),
        h('p',{style:{margin:'0 0 24px',color:'#596b4d'}},'Distinct leaves, flowers, and fruit · illustrated crop forms'),
        h('div', {style:{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:14}}, ids.map(id =>
          h('article',{key:id,style:{background:'#fffdf7',border:'1px solid #d7dec8',borderRadius:12,padding:12,textAlign:'center'}},
            h('div',{style:{height:160,width:150,margin:'0 auto'}},cpVisualQA.art(R,id,plants[id],1,{roots:false})),
            h('strong',{style:{color:'#35533b',fontSize:15}},plants[id].label)
          )))));
    });
    await page.locator('#botanical-review svg').first().waitFor();
    await page.locator('#botanical-review').screenshot({ path: path.join(out, 'botanical-species-detail.png') });
    await page.evaluate(() => {
      const R = React, h = R.createElement, plants = cpVisualQA.plants;
      reviewRoot.render(h('section',{style:{background:'#f8f6ed',padding:28,maxWidth:1040,margin:'20px auto'}},
        h('h1',{style:{color:'#294b36',fontSize:26}},'From a seed to a garden'),
        ['corn','carrot','lavender','strawberry'].map(id=>h('div',{key:id,style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:14}},
          [0,.08,.38,1].map((progress,i)=>h('article',{key:i,'data-review-stage':i,style:{background:'#fffdf7',border:'1px solid #d7dec8',borderRadius:12,padding:10,textAlign:'center'}},
            h('div',{style:{height:140,width:130,margin:'0 auto'}},cpVisualQA.art(R,id,plants[id],progress,{roots:true})),
            h('strong',{style:{color:'#35533b',fontSize:14}},plants[id].label+' · '+['Seed','Seedling','Leafing','Mature'][i])))))));
    });
    await page.waitForFunction(()=>document.querySelectorAll('[data-botanical-seedling]').length===4);
    for (const node of await page.locator('[data-review-stage="1"] .cp-botanical-growth').all()) {
      assert.equal(await node.evaluate(el=>getComputedStyle(el).opacity), '0', 'young seedlings do not show mature flowers or support structures');
    }
    assert.equal(await page.locator('[data-review-stage="0"] [data-botanical-seed]').count(),4);
    assert.equal(await page.locator('[data-review-stage="3"] [data-botanical-seedling]').count(),0);
    await page.locator('#botanical-review').screenshot({ path: path.join(out, 'botanical-growth-stages.png') });
    findings.assertions.push('Seedling artwork hides mature flowers, fruit, and supports', 'Seed and mature art retain their distinct stages', 'Species detail and mobile garden visually captured');
    assert.deepEqual(findings.errors,[]);
    fs.writeFileSync(path.join(out,'botanical-refinement-results.json'),JSON.stringify(findings,null,2));
    console.log(JSON.stringify(findings,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
