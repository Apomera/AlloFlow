// Genuine React and WebGL scene with deterministic local investigation inputs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-black-hole-comparison-2026-10-01');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
let shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
shell = shell.replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');

const kernel=read('stem_lab/stem_tool_galaxy.js').split('// BEGIN BLACK HOLE EXPERIMENT MODEL')[1].split('// END BLACK HOLE EXPERIMENT MODEL')[0];
const model=new Function(kernel+';return {trajectory:blackHoleTrajectory,sample:blackHoleSample,at:blackHoleComparisonSample};')();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let page;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, hasTouch: true });
    const errors = [], checks = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ path: path.join(ROOT, cssAsset) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = () => page.evaluate(() => window.__galaxyState);
    const patch = async data => { await page.evaluate(data => window.__patchGalaxy(data), data); await settle(); };
    const click = async name => { await page.getByRole('button', { name, exact: true }).click(); await settle(); };



    const canvas=page.locator('[data-black-hole-canvas]');
    const release={blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:0,blackHoleRadialVelocity:0,blackHoleLaunchAngle:0};
    const escape={...release,blackHoleSideways:1.5,blackHoleLaunchAngle:90};
    const ready=()=>page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._blackHoleReleaseSettings);
    const mount=async data=>{await page.evaluate(data=>window.__mount({simMode:'blackHole',blackHolePaused:true,...data}),data);await ready();await settle();};
    const scene=()=>canvas.evaluate(c=>c._blackHoleExperimentState());
    const prediction=()=>canvas.evaluate(c=>c._blackHolePredictionState());
    const settings=()=>canvas.evaluate(c=>c._blackHoleReleaseSettings());
    const seek=async fraction=>{await canvas.evaluate((c,f)=>c._seekBlackHoleExperiment(f),fraction);await settle();};
    const comparisonDetails=page.locator('[data-bh-planner] details');
    const openComparison=async()=>{if(!await comparisonDetails.evaluate(e=>e.open))await comparisonDetails.locator('summary').click();await settle();};
    const table=page.locator('[data-bh-comparison-table]'),chart=page.locator('#black-hole-distance-chart'),distance=page.locator('[data-bh-distance]');
    const graph=()=>chart.evaluate(svg=>({reference:svg.querySelector('#black-hole-distance-reference').getAttribute('d'),center:svg.querySelector('#black-hole-distance-center').getAttribute('d'),referenceDot:svg.querySelector('#black-hole-distance-reference-dot').style.display,referenceX:Number(svg.querySelector('#black-hole-distance-reference-dot').getAttribute('cx')),referenceY:Number(svg.querySelector('#black-hole-distance-reference-dot').getAttribute('cy')),selectedY:Number(svg.querySelector('#black-hole-distance-selected-dot').getAttribute('cy')),max:Number(document.getElementById('black-hole-distance-max').textContent),value:svg.getAttribute('aria-valuetext')}));
    const view=()=>canvas.evaluate(c=>{const s=c._blackHoleExperimentState();return {yaw:s.cameraYaw,pitch:s.cameraPitch,distance:c._blackHolePredictionState().cameraDistance};});

    await mount({...release,blackHoleComparison:escape});await openComparison();
    assert.equal(await table.isVisible(),true);assert.equal(await page.locator('#black-hole-release-comparison-caption').textContent(),'Release comparison: 2 changed inputs');
    assert.equal(await page.locator('#black-hole-compare-current-outcome').textContent(),'Center reaches the horizon');assert.equal(await page.locator('#black-hole-compare-reference-outcome').textContent(),'Center escapes');
    assert.equal(await page.locator('#black-hole-compare-row-blackHoleSideways').getAttribute('data-bh-changed'),'true');assert.equal(await page.locator('#black-hole-compare-row-blackHoleMassMode').getAttribute('data-bh-changed'),'false');
    const keptPositions=(await prediction()).comparison.positions;
    await click('Place object');await canvas.scrollIntoViewIfNeeded();await page.locator('[data-bh-launch-handle]').waitFor({state:'visible'});await page.locator('[data-bh-launch-handle]').focus();await page.keyboard.press('ArrowUp');await settle();
    assert.equal(await page.locator('#black-hole-compare-current-blackHoleReleaseRadius').textContent(),'5.25');assert.equal(await page.locator('#black-hole-compare-reference-blackHoleReleaseRadius').textContent(),'5.00');assert.equal(await page.locator('#black-hole-release-comparison-caption').textContent(),'Release comparison: 3 changed inputs');
    assert.deepEqual((await prediction()).comparison.positions,keptPositions);
    checks.push('The release table updates during launch editing and highlights exactly the changed inputs while retaining the saved release.');
    await click('Release here');await seek(.25);let p=await prediction(),s=await scene(),g=await graph();
    const referenceRun=model.trajectory({radius:5,sideways:1.5,radialVelocity:0}),expected=model.at(referenceRun,s.time);
    assert(Math.abs(p.distance.currentReference.radius-expected.radius)<1e-8);assert(Math.abs(g.referenceY-(144-(expected.radius-1)/(g.max-1)*126))<1e-6);assert(Math.abs(g.referenceX-s.time/s.duration*600)<1e-6);
    assert(g.value.includes('Kept center at this moment:'));assert.equal(p.distance.reference.duration,s.duration);assert(g.reference.startsWith('M'));assert.equal(await page.locator('#black-hole-distance-reference-key').isVisible(),true);
    await chart.scrollIntoViewIfNeeded();await chart.focus();await page.keyboard.press('ArrowRight');await settle();assert((await scene()).time>s.time);assert((await graph()).value.includes('Kept center'));
    checks.push('The dashed reference and cursor sample the same elapsed model time as the current run; keyboard scrubbing announces both centers.');

    const orbit={...release,blackHoleReleaseRadius:8,blackHoleSideways:1};
    await mount({...orbit,blackHoleComparison:{...release,blackHoleReleaseRadius:4}});await click('Release here');await seek(.8);p=await prediction();g=await graph();
    assert.equal(p.distance.currentReference.state,'captured');assert.equal(p.distance.currentReference.radius,null);assert.equal(g.referenceDot,'none');assert.equal(await page.locator('#black-hole-distance-reference-readout').textContent(),'Kept center: reached the horizon');
    let final=g.reference.trim().split(' L').at(-1).replace(/^M/,'').split(',').map(Number);assert(final[0]<600);assert(Math.abs(final[1]-144)<.001);assert.equal(p.distance.reference.points.at(-1).time,p.distance.reference.end);
    await seek(0);assert.equal((await graph()).referenceDot,'');
    await patch({blackHoleComparison:escape});await seek(1);p=await prediction();g=await graph();assert.equal(p.distance.currentReference.state,'ended');assert.equal(g.referenceDot,'none');assert.equal(await page.locator('#black-hole-distance-reference-readout').textContent(),'Kept center: its modeled interval has ended');
    final=g.reference.trim().split(' L').at(-1).replace(/^M/,'').split(',').map(Number);assert(final[0]<600);
    checks.push('Captured and escaped reference curves end at the exact modeled endpoint, hide their later cursor, and recover when scrubbing backward.');

    await mount({...release,blackHoleDropObject:'star',blackHoleReleaseRadius:4,blackHoleSideways:1});await click('Release here');await seek(.3);await canvas.evaluate(c=>c._inspectBlackHoleFragment(0));await click('Above disk');await settle();
    s=await scene();const beforeView=await view(),beforeTime=s.time,selected=s.inspectedFragment,baseMax=(await graph()).max;assert.equal(selected,0);
    await patch({blackHoleComparison:escape});p=await prediction();g=await graph();assert.equal((await scene()).time,beforeTime);assert.equal((await scene()).inspectedFragment,selected);assert.deepEqual(await view(),beforeView);
    const selectedState=await scene();assert(selectedState.inspection&&selectedState.inspection.phase==='outside');assert(Math.abs(g.selectedY-(144-(selectedState.inspection.radius-1)/(g.max-1)*126))<1e-6);
    const momentDots=await chart.locator('[data-bh-moment-dot]').evaluateAll(es=>es.map(e=>Number(e.getAttribute('cy'))));assert.equal(momentDots.length,selectedState.fragmentMoments.length);momentDots.forEach((y,i)=>assert(Math.abs(y-(144-(selectedState.fragmentMoments[i].radius-1)/(g.max-1)*126))<1e-6));
    const selectedPath=await page.locator('#black-hole-distance-selected').getAttribute('d');assert(selectedPath.length>0);
    await openComparison();await click('Clear comparison');assert.equal((await prediction()).comparison,null);assert.equal((await graph()).reference,'');assert.equal((await graph()).referenceDot,'none');assert.equal((await graph()).max,baseMax);assert.equal((await scene()).time,beforeTime);assert.equal((await scene()).inspectedFragment,selected);assert.deepEqual(await view(),beforeView);
    assert.equal(await table.isVisible(),false);assert.equal(await page.locator('#black-hole-distance-reference-readout').isVisible(),false);assert.equal(await page.locator('#black-hole-distance-reference-key').isVisible(),false);
    checks.push('Keeping and clearing a reference recomputes the shared graph scale while preserving playback time, selected debris, and camera view.');

    await patch({blackHoleComparison:escape});const graphBefore=(await graph()).reference;await click('Light bending');assert.equal(await distance.isVisible(),false);await click('Object experiment');assert.equal((await graph()).reference,graphBefore);assert.equal((await scene()).time,beforeTime);
    const saved=JSON.parse(JSON.stringify(await state()));await mount(saved);await openComparison();assert.equal(await table.isVisible(),true);await click('Release here');await seek(.3);assert.equal((await graph()).reference,graphBefore);
    checks.push('Comparison inputs survive an optical view change and a complete JSON remount; reopening rebuilds the same graph after release.');

    const layouts=[];
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:1200});await mount({...release,blackHoleComparison:escape});await openComparison();await click('Release here');await seek(.25);await distance.scrollIntoViewIfNeeded();await settle();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await table.locator('tbody th[scope=row]').count(),8);
      const paths=await chart.locator('path').evaluateAll(es=>es.map(e=>e.getAttribute('d')));assert(paths.every(d=>!d.includes('NaN')&&!d.includes('Infinity')));
      await distance.screenshot({path:path.join(OUT,'comparison-graph-'+width+'.png')});await table.scrollIntoViewIfNeeded();await table.screenshot({path:path.join(OUT,'comparison-table-'+width+'.png')});layouts.push({width,noOverflow:true,sharedAxes:true});
    }
    await page.evaluate(()=>document.documentElement.dir='rtl');await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await table.screenshot({path:path.join(OUT,'comparison-table-320-rtl.png')});await distance.scrollIntoViewIfNeeded();await distance.screenshot({path:path.join(OUT,'comparison-graph-320-rtl.png')});
    checks.push('1440, 390, 320 px and RTL layouts keep readable release columns, a dashed reference legend, and valid graph geometry without horizontal overflow.');
    const cleanup=await canvas.evaluate(c=>{window.__mount({simMode:'star'});return !c.isConnected&&!c._blackHolePredictionState&&!c._setBlackHoleComparison;});assert(cleanup);assert.deepEqual(errors,[]);
    const result={passed:true,checks,layouts,cleanup,errors};fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }catch(error){if(page){console.log('DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{const c=document.querySelector('[data-black-hole-canvas]');return {tool:window.__galaxyState,scene:c&&c._blackHoleExperimentState&&c._blackHoleExperimentState(),prediction:c&&c._blackHolePredictionState&&c._blackHolePredictionState()};})));await page.screenshot({path:path.join(OUT,'failure.png')});}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
