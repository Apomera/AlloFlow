// Genuine React and WebGL scene with deterministic local investigation inputs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-black-hole-notebook-2026-10-01');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
let shell = core.slice(core.indexOf('const SHELL = `') + 15, core.indexOf('`;\n\n(async'));
shell = shell.replace('var pair = React.useState({ galaxy: state });', `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');

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
    const ready=()=>page.waitForFunction(()=>!!document.querySelector('[data-black-hole-canvas]')?._blackHoleReleaseSettings);
    const mount=async data=>{await page.evaluate(data=>window.__mount(data),data);await ready();await settle();};
    const settings=()=>canvas.evaluate(c=>c._blackHoleReleaseSettings());
    const comparison=()=>canvas.evaluate(c=>c._blackHolePredictionState().comparison);
    const book=page.locator('[data-bh-notebook]');
    const openBook=async()=>{if(!await book.locator('details').evaluate(e=>e.open))await book.locator('summary').click();await settle();};
    const save=async()=>{await page.locator('[data-bh-notebook-save]').click();await settle();};
    const handle=page.locator('[data-bh-launch-handle]');
    const arm=async name=>{await click(name);await canvas.scrollIntoViewIfNeeded();await settle();await handle.waitFor({state:'visible',timeout:5000});};
    const handlePoint=async()=>{await handle.scrollIntoViewIfNeeded();await settle();const b=await handle.boundingBox();assert(b&&b.width>=44&&b.height>=44);return{x:b.x+b.width/2,y:b.y+b.height/2};};
    await mount({simMode:'blackHole',blackHolePaused:true,metalHunt:{hypothesis:'Keep this other investigation.'}});
    await openBook();await save();let s=await state();assert.equal(s.blackHoleNotebook.length,1);const first={...s.blackHoleNotebook[0].settings},firstId=s.blackHoleNotebook[0].id;
    const note='Close approach <script>plain note text</script>';await page.locator('[data-bh-notebook-note="'+firstId+'"]').fill(note);await settle();
    await page.locator('[data-bh-notebook-compare="'+firstId+'"]').click();await settle();assert.deepEqual((await state()).blackHoleComparison,first);
    const firstLine=(await comparison()).positions;
    await arm('Place object');await handle.focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowRight');await settle();
    assert.equal((await settings()).blackHoleReleaseRadius,first.blackHoleReleaseRadius+.25);assert.equal((await settings()).blackHoleLaunchAngle,first.blackHoleLaunchAngle+5);
    let p=await handlePoint();const old=await settings(),yaw=await canvas.evaluate(c=>c._blackHoleExperimentState().cameraYaw);
    await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+38,p.y+20,{steps:5});await page.mouse.up();await settle();assert.notDeepEqual(await settings(),old);assert.equal(await canvas.evaluate(c=>c._blackHoleExperimentState().cameraYaw),yaw);
    const committed=await settings();p=await handlePoint();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x-25,p.y-12);await page.keyboard.press('Escape');await page.mouse.up();await settle();assert.deepEqual(await settings(),committed);
    const cdp=await page.context().newCDPSession(page);p=await handlePoint();const beforeTouch=await settings();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-28,y:p.y+14}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert.notDeepEqual(await settings(),beforeTouch);await cdp.detach();
    await arm('Aim throw');await handle.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');await settle();assert.equal((await settings()).blackHoleSideways,.05);assert.equal((await settings()).blackHoleRadialVelocity,.05);
    p=await handlePoint();const beforeAim=await settings();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+25,p.y-22,{steps:4});await page.mouse.up();await settle();assert.notDeepEqual(await settings(),beforeAim);
    assert.deepEqual((await comparison()).positions,firstLine);assert.deepEqual((await state()).blackHoleNotebook[0].settings,first);assert.equal((await state()).blackHoleNotebook[0].note,note);
    checks.push('48 px handles support native mouse/touch placement, keyboard placement and aiming, and Escape rollback without moving the camera or saved reference.');
    await openBook();await save();s=await state();const secondId=s.blackHoleNotebook[1].id;await page.locator('[data-bh-notebook-note="'+secondId+'"]').fill('Adjusted throw');await settle();
    await page.locator('#black-hole-object').selectOption('star');await page.locator('#black-hole-mass').selectOption('supermassive');await click('Orbit');await openBook();await save();s=await state();const third=s.blackHoleNotebook[2];
    assert.equal(await page.locator('[data-bh-notebook-entry="'+third.id+'"] [data-bh-notebook-outcome]').textContent(),'Circular center orbit');
    await page.locator('[data-bh-notebook-compare="'+third.id+'"]').click();await settle();const thirdLine=(await comparison()).positions;assert.deepEqual((await comparison()).settings,third.settings);
    await click('Release here');await settle();assert.equal(await canvas.evaluate(c=>c._blackHoleExperimentState().released),true);
    await page.locator('[data-bh-notebook-restore="'+firstId+'"]').click();await settle();assert.deepEqual(await settings(),first);assert.equal(await canvas.evaluate(c=>c._blackHoleExperimentState().released),false);assert.equal((await state()).blackHolePaused,true);assert.deepEqual((await comparison()).positions,thirdLine);
    assert.equal((await state()).blackHoleNotebook[0].note,note);
    checks.push('Saving, notes, center outcomes, and paused restore use the release inputs; restoring a run leaves the reference fixed.');
    const saved=JSON.parse(JSON.stringify(await state()));await page.locator('[data-galaxy-mode="star"]').click();await settle();await page.locator('[data-galaxy-mode="blackHole"]').click();await ready();await settle();
    assert.deepEqual((await state()).blackHoleNotebook,saved.blackHoleNotebook);assert.deepEqual((await comparison()).settings,third.settings);assert.deepEqual((await comparison()).positions,thirdLine);
    assert.equal((await state()).metalHunt.hypothesis,'Keep this other investigation.');
    await mount(saved);assert.deepEqual((await comparison()).positions,thirdLine);await openBook();
    checks.push('Reference geometry and notes survive mode changes and complete unmount/remount from JSON tool data.');
    await page.locator('[data-bh-notebook-remove="'+third.id+'"]').click();await settle();assert.equal((await state()).blackHoleNotebook.length,2);assert.deepEqual((await comparison()).positions,thirdLine);
    await page.locator('[data-bh-notebook-undo]').click();await settle();assert.deepEqual((await state()).blackHoleNotebook,saved.blackHoleNotebook);
    for(let i=0;i<5;i++)await save();s=await state();assert.equal(s.blackHoleNotebook.length,8);assert.equal(await page.locator('[data-bh-notebook-save]').isDisabled(),true);assert.equal(s.blackHoleNotebook[0].note,note);
    const exportPromise=page.waitForEvent('download');await page.locator('[data-bh-notebook-export]').click();const download=await exportPromise;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(exported.schema,'galaxy-black-hole-experiments');assert.equal(exported.version,1);assert.equal(exported.experiments.length,8);assert.equal(exported.experiments[0].note,note);assert.deepEqual(exported.comparison,third.settings);assert.equal(exported.experiments[2].prediction.outcome,'orbit');assert.equal(exported.experiments[0].settings.samples,undefined);
    fs.writeFileSync(path.join(OUT,'exported-experiments.json'),JSON.stringify(exported,null,2));
    checks.push('Removal is reversible and keeps the independent reference; the eight-entry limit preserves notes, and JSON export includes settings and current model predictions.');
    const layouts=[];
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:1100});await mount({...saved,blackHoleInteraction:'aim'});await openBook();await canvas.scrollIntoViewIfNeeded();await settle();await handle.waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert((await handle.boundingBox()).width>=44);
      const targets=await page.locator('[data-bh-launch-workflow] button,[data-bh-notebook] button:visible').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert(targets.every(h=>h>=44));
      await page.locator('[data-bh-stage]').screenshot({animations:'disabled',path:path.join(OUT,'launch-and-notebook-'+width+'.png')});
      layouts.push({width,noOverflow:true,handleSize:48,touchTargets:true});
    }
    await page.evaluate(()=>document.documentElement.dir='rtl');await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await book.scrollIntoViewIfNeeded();await settle();await book.screenshot({animations:'disabled',path:path.join(OUT,'notebook-320-rtl.png')});
    checks.push('Desktop, 390 px, 320 px, and RTL layouts retain usable targets without horizontal overflow.');
    await page.locator('[data-bh-planner] details summary').click();await click('Clear comparison');assert.equal((await state()).blackHoleComparison,null);assert.equal(await comparison(),null);assert.equal((await state()).blackHoleNotebook.length,3);
    const cleanup=await canvas.evaluate(c=>{window.__mount({simMode:'star'});return !c._setBlackHoleComparison&&!c._blackHoleReleaseSettings&&!c._restoreBlackHoleRelease&&!c._beginBlackHoleLaunchHandle&&!c.isConnected;});assert(cleanup);
    assert.deepEqual(errors,[]);const result={passed:true,checks,layouts,export:true,cleanup:true,errors};fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }catch(error){console.log('DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>{const c=document.querySelector('[data-black-hole-canvas]'),h=document.querySelector('[data-bh-launch-handle]');return {tool:window.__galaxyState,handle:h&&h.outerHTML,camera:c&&c._blackHoleCameraState&&c._blackHoleCameraState(),release:c&&c._blackHoleReleaseSettings&&c._blackHoleReleaseSettings(),bounds:c&&c.getBoundingClientRect().toJSON()};})));await page.screenshot({path:path.join(OUT,'failure.png')});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
