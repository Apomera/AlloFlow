#!/usr/bin/env node
'use strict';

// Read-only paired trajectories must explain equal summaries without loading
// either setup into the live station or changing the learner's evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-trajectory'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, label, tolerance = 1e-7) => assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} should equal ${expected}`);
let models;
function trajectory(setup) {
  const power = { generation: 160 * Math.sin(setup.opsArrayAngle * Math.PI / 180), load: 68 + setup.opsCrew * 1.6 + setup.opsResearch * .22, eclipse: setup.opsEclipse, battery: setup.opsBattery, capacity: 210 };
  const air = models.air({ power, crew: setup.opsCrew, scrub: setup.opsScrub, flow: setup.opsAirFlow, activity: setup.opsAirActivity, startPpm: setup.opsAirStart, restore: setup.opsAirRestore, restoreMinute: setup.opsAirRestoreMinute });
  const thermal = models.thermal({ power, radiator: setup.opsRadiator, cooling: setup.opsCooling, cabinStart: setup.opsCabinStart, crew: setup.opsCrew });
  const attitude = models.attitude({ cmg: setup.opsCmg, torque: setup.opsAttitudeTorque, inertia: setup.opsAttitudeInertia, dump: setup.opsAttitudeDump, burnMinute: setup.opsAttitudeBurnMinute, thrust: setup.opsAttitudeThrust, fuel: setup.opsAttitudeFuel });
  return minute => {
    const p = models.power(power, minute), a = models.airInspect(air, minute), t = models.thermalInspect(thermal, minute), c = models.attitudeInspect(attitude, minute);
    return { minute, lit: p.lit, battery: p.percent, co2: Math.max(a.localPpm, a.cabinPpm), temp: t.cabin, cmg: c.percent, pointing: c.angleDeg, propellant: c.fuelUsed };
  };
}

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], checks = [], audits = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData.spaceStation)));
  const patch = async values => {
    await page.evaluate(values => window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation, ...values } })), values);
    await page.waitForFunction(values => Object.entries(values).every(([key, value]) => JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), values);
  };
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const section = () => page.locator('[data-ops-trajectory]');
  const panel = () => page.locator('[data-ops-trajectory-panel]');
  const toggle = () => page.locator('[data-ops-trajectory-toggle]');
  const metric = () => page.locator('[data-ops-trajectory-metric]');
  const time = () => page.locator('[data-ops-trajectory-time]');
  const chart = () => page.locator('[data-ops-trajectory-chart]');
  const reading = side => page.locator('[data-ops-trajectory-reading="' + side + '"]');
  const curve = side => page.locator('[data-ops-trajectory-curve="' + side + '"]');
  const protectedState = async () => {
    const saved = await state();
    for (const key of ['opsTrajectoryOpen','opsTrajectoryMetric','opsTrajectoryMinute']) delete saved[key];
    return saved;
  };
  const unchanged = async (before, label) => assert.deepEqual(await protectedState(), before, label + ' preserves all station controls, clocks, notes, and records');
  const expand = async () => { if (await toggle().getAttribute('aria-expanded') !== 'true') await activate(toggle()); await panel().waitFor(); };
  const audit = async label => {
    const result = await page.evaluate(async () => {
      const scan = await axe.run(document.querySelector('[data-ops-trajectory]'), { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    });
    assert.deepEqual(result.violations, [], label + ' accessibility, including contrast'); audits.push({ label, ...result });
  };
  const parity = async (left, right, minute, key) => {
    const expectedA = left(minute), expectedB = right(minute), actual = {};
    for (const [side, expected] of [['baseline',expectedA],['comparison',expectedB]]) {
      actual[side] = Number(await reading(side).getAttribute('data-value'));
      near(actual[side], expected[key], side + ' ' + key + ' at ' + minute);
      near(Number(await reading(side).getAttribute('data-minute')), minute, side + ' selected time');
      assert.equal(await reading(side).getAttribute('data-lit'), String(expected.lit), side + ' has its own eclipse phase');
    }
    near(Number(await page.locator('[data-ops-trajectory-delta]').getAttribute('data-value')), expectedB[key] - expectedA[key], key + ' comparison minus baseline');
    near(Number(await time().inputValue()), (await state()).opsTrajectoryMinute, 'Native independent range retains the cursor without a step grid', 1e-10);
    assert((await time().getAttribute('aria-valuetext') || '').includes(minute.toFixed(2)), 'Accessible independent time uses two decimals');
    return { key, minute, ...actual, delta: expectedB[key] - expectedA[key], baselineLit: expectedA.lit, comparisonLit: expectedB.lit };
  };
  const chartGeometry = async () => chart().evaluate(svg => {
    const view = svg.viewBox.baseVal, box = svg.getBoundingClientRect(), owner = svg.closest('[data-ops-trajectory]').getBoundingClientRect();
    const curves = [...svg.querySelectorAll('[data-ops-trajectory-curve]')].map(node => node.getAttribute('d') || '');
    const markers = [...svg.querySelectorAll('[data-ops-trajectory-marker]')].map(node => { const bounds = node.getBBox(); return { cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2 }; });
    return { width: view.width, height: view.height, curves, markers, clipped: box.left < owner.left - 1 || box.right > owner.right + 1 };
  });
  const holdFrames = () => page.evaluate(() => {
    const gate = window.__trajectoryFrameGate = { request: window.requestAnimationFrame, cancel: window.cancelAnimationFrame, next: -1, callbacks: new Map() };
    window.requestAnimationFrame = callback => { const id = gate.next--; gate.callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { if (!gate.callbacks.delete(id)) gate.cancel.call(window, id); };
  });
  const releaseFrames = () => page.evaluate(() => {
    const gate = window.__trajectoryFrameGate;
    window.requestAnimationFrame = gate.request; window.cancelAnimationFrame = gate.cancel;
    gate.callbacks.forEach(callback => gate.request.call(window, callback)); delete window.__trajectoryFrameGate;
  });
  try {
    await page.goto(base + '/?tab=operations');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await patch({ opsCmg: 100, opsAttitudeTorque: 0, opsAttitudeDump: true, opsAttitudeThrust: 5, opsAttitudeFuel: 1.5, opsAttitudeBurnMinute: 10 });
    await page.locator('[data-ops-prediction]').fill('The same peak and final readings may hide different conditions in the middle of the orbit.');
    await activate(page.locator('[data-ops-record-trial]'));
    const aId = (await state()).opsTrialSelected;
    await page.locator('[data-ops-reflection]').fill('Compare gyro storage before and after the earlier burn.');
    await patch({ opsAttitudeBurnMinute: 70 });
    await activate(page.locator('[data-ops-record-trial]'));
    const bId = Number((await state()).opsTrialCompare), a = (await state()).opsTrials.find(item => item.id === aId), b = (await state()).opsTrials.find(item => item.id === bId);
    assert.deepEqual(a.results, b.results, 'Different intervention timing has the same recorded summary');
    const left = trajectory(a.setup), right = trajectory(b.setup);
    near(left(40).cmg, 8, 'Earlier burn CMG at40'); near(right(40).cmg, 100, 'Later burn CMG at40');
    await patch({ opsResearch: 30, opsOrbitMinute: 37.25, opsWaterDay: 12.3, opsPressureMinute: 7.5, opsPrediction: 'A working draft that browsing saved trajectories must preserve.' });
    assert.equal(await toggle().getAttribute('aria-expanded'), 'false');
    assert.equal(await chart().count(), 0, 'Trajectory models and plot are not mounted while collapsed');
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await audit('collapsed trajectory disclosure');
    const protectedBefore = await protectedState();
    await expand(); await unchanged(protectedBefore, 'Opening paired trajectories');
    assert.equal(await metric().inputValue(), 'battery');
    near(Number(await time().inputValue()),0,'Independent time starts at zero, not the shared cursor');
    assert.equal(await time().getAttribute('step'), 'any');
    assert.deepEqual((await metric().locator('option').evaluateAll(nodes => nodes.map(node => node.value))).sort(), ['battery','co2','temp','cmg','pointing','propellant'].sort());
    assert.match(await section().innerText(), /recomput|current.*model/i);
    assert.match(await section().innerText(), /saved|recorded/i);
    await metric().selectOption('cmg'); await patch({ opsTrajectoryMinute: 40 });
    checks.push(await parity(left,right,40,'cmg'));
    assert.match(await reading('baseline').innerText(), new RegExp('trial\\s+' + aId,'i'));
    assert.match(await reading('comparison').innerText(), new RegExp('trial\\s+' + bId,'i'));
    assert.notEqual(await curve('baseline').getAttribute('d'), await curve('comparison').getAttribute('d'));
    assert.notEqual(await curve('baseline').evaluate(node => getComputedStyle(node).strokeDasharray),'none','Baseline curve has a non-color distinction');
    assert.equal(await curve('comparison').evaluate(node => getComputedStyle(node).strokeDasharray),'none','Comparison curve is solid');
    await unchanged(protectedBefore, 'Metric/time selection');
    const initialTime = (await state()).opsTrajectoryMinute;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal((await state()).opsTrajectoryMinute, initialTime, 'Read-only explorer does not autoplay');
    await audit('paired trajectories');
    await section().screenshot({ path: path.join(output, 'paired-cmg-' + width + '.png'), animations: 'disabled' });

    for (const key of ['battery','co2','temp','cmg','pointing','propellant']) {
      await metric().selectOption(key); await patch({ opsTrajectoryMinute: 25.12345 });
      checks.push(await parity(left,right,25.12345,key));
      const geometry = await chartGeometry();
      assert(geometry.width > 0 && geometry.height > 0 && !geometry.clipped);
      assert(geometry.curves.length === 2 && geometry.curves.every(value => value && !/NaN|Infinity/.test(value)), key + ' has finite curves');
      assert(geometry.markers.length === 2 && geometry.markers.every(point => Number.isFinite(point.cx) && Number.isFinite(point.cy) && point.cx >= 0 && point.cx <= geometry.width && point.cy >= 0 && point.cy <= geometry.height), key + ' markers fit the SVG');
    }
    await metric().selectOption('cmg');
    const keyChecks = [];
    for (const [key, expected] of [['ArrowRight',25.22345],['ArrowLeft',25.12345],['PageUp',26.12345],['PageDown',25.12345],['Home',0],['ArrowLeft',0],['PageDown',0],['End',92],['ArrowRight',92],['PageUp',92]]) {
      await time().focus(); await page.keyboard.press(key);
      near((await state()).opsTrajectoryMinute, expected, key + ' independent time');
      near(Number(await time().inputValue()), expected, key + ' DOM time');
      keyChecks.push({ key, minute: expected });
    }
    await unchanged(protectedBefore, 'Native time keyboard');
    checks.push({ keyboard: keyChecks });

    // Derive the plotted domain from actual marker coordinates, then transform
    // SVG coordinates into viewport pixels for native pointer interaction.
    await time().focus(); await page.keyboard.press('Home');
    const startX = Number(await page.locator('[data-ops-trajectory-marker="baseline"]').getAttribute('cx'));
    await page.keyboard.press('End');
    const endX = Number(await page.locator('[data-ops-trajectory-marker="baseline"]').getAttribute('cx'));
    async function clickSvg(x) {
      const point = await chart().evaluate((svg,x) => {
        const position = svg.createSVGPoint(); position.x = x; position.y = svg.viewBox.baseVal.height / 2;
        const transformed = position.matrixTransform(svg.getScreenCTM()); return { x: transformed.x, y: transformed.y };
      },x);
      await page.mouse.click(point.x,point.y);
    }
    await clickSvg(startX + (endX - startX) * 31.375 / 92);
    // SVGPoint transforms use platform float precision; this tolerance remains
    // well below a millisecond and cannot conceal a rounded time step.
    near((await state()).opsTrajectoryMinute,31.375,'Fractional pointer time',1e-5);
    checks.push(await parity(left,right,(await state()).opsTrajectoryMinute,'cmg'));
    await clickSvg(1); near((await state()).opsTrajectoryMinute,0,'Pointer clamps before plot');
    const geometry = await chartGeometry();
    await clickSvg(geometry.width - 1); near((await state()).opsTrajectoryMinute,92,'Pointer clamps after plot');
    await unchanged(protectedBefore,'Plot pointer');

    await patch({ opsTrajectoryMinute: 40 });
    await activate(toggle()); assert.equal(await toggle().getAttribute('aria-expanded'),'false');
    assert.equal(await chart().count(),0);
    await expand(); near(Number(await time().inputValue()),40,'Reopened independent time');
    assert.equal(await metric().inputValue(),'cmg'); await unchanged(protectedBefore,'Collapse/reopen');
    const roundtrip = JSON.parse(JSON.stringify(await state()));
    await page.reload(); await page.locator('[data-ops-trial-notebook]').waitFor();
    await page.evaluate(saved => window.__setToolData({spaceStation:saved}),roundtrip);
    await panel().waitFor();
    assert.equal(await toggle().getAttribute('aria-expanded'),'true'); assert.equal(await metric().inputValue(),'cmg');
    near(Number(await time().inputValue()),40,'Persisted independent time'); await unchanged(protectedBefore,'JSON reload');
    checks.push({ collapsedByDefault:true, noAutoplay:true, independentKeyboardPointer:true, persistedView:true });

    // Independent exploration neither advances nor pauses the live clock.
    await holdFrames();
    try {
      await activate(page.locator('[data-iss-playback-toggle="integrated"]'));
      assert.equal(await page.locator('[data-iss-playback-toggle="integrated"]').getAttribute('aria-pressed'),'true');
      await time().focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-iss-playback-toggle="integrated"]').getAttribute('aria-pressed'),'true');
      await unchanged(protectedBefore,'Independent seek during held live playback');
      await activate(page.locator('[data-iss-playback-toggle="integrated"]'));
    } finally { await releaseFrames(); }
    checks.push({ sharedPlaybackUnaffected:true });

    await patch({opsResearch:95,opsTrajectoryMinute:92});
    await metric().selectOption('battery');
    checks.push(await parity(left,right,92,'battery'));
    assert.deepEqual((await state()).opsTrials,roundtrip.opsTrials,'Editing current controls leaves both saved trajectory sources unchanged');
    checks.push({savedComparisonIgnoresCurrentEdits:true});

    await page.locator('[data-ops-trial-compare]').selectOption('current');
    await patch({ ...b.setup, opsEclipse:45, opsTrajectoryMinute:50 });
    await metric().selectOption('battery');
    const currentSetup = await state(), currentModel = trajectory(currentSetup), beforeCurrentSeek = await protectedState();
    checks.push(await parity(left,currentModel,50,'battery'));
    assert.equal(await reading('baseline').getAttribute('data-lit'),'true');
    assert.equal(await reading('comparison').getAttribute('data-lit'),'false');
    assert.match(await reading('comparison').innerText(),/current setup/i);
    assert.match(await reading('baseline').innerText(),/sunlight/i); assert.match(await reading('comparison').innerText(),/eclipse/i);
    await section().screenshot({path:path.join(output,'different-eclipse-phases-'+width+'.png'),animations:'disabled'});
    await time().focus(); await page.keyboard.press('ArrowRight'); await unchanged(beforeCurrentSeek,'Current comparison seek');
    await patch({opsResearch:95});
    const changedCurrent=trajectory(await state()); checks.push(await parity(left,changedCurrent,(await state()).opsTrajectoryMinute,'battery'));
    assert.deepEqual((await state()).opsTrials,roundtrip.opsTrials);
    await page.locator('[data-ops-trial-compare]').selectOption(String(aId));
    await metric().selectOption('cmg');
    await parity(left,left,(await state()).opsTrajectoryMinute,'cmg');
    assert.equal(await curve('baseline').getAttribute('d'),await curve('comparison').getAttribute('d'),'Self-comparison overlays exactly');
    checks.push({selfComparison:true,differentEclipsePhases:true,currentComparisonUpdates:true});

    const legacy={...a,id:99,results:{...a.results}}; delete legacy.results.pointingEnd; delete legacy.results.propellantUsed;
    await patch({opsTrials:[a,b,legacy],opsTrialSelected:99,opsTrialCompare:bId,opsTrajectoryMinute:40});
    const legacyBefore=await protectedState();
    for(const [key,row] of [['pointing','pointingEnd'],['propellant','propellantUsed']]) {
      await metric().selectOption(key); checks.push(await parity(left,right,40,key));
      assert.match(await page.locator('[data-ops-trial-metric="'+row+'"] td').first().innerText(),/not recorded/i);
    }
    await unchanged(legacyBefore,'Legacy recomputed previews');
    assert.equal(Object.hasOwn((await state()).opsTrials.find(item=>item.id===99).results,'pointingEnd'),false);
    checks.push({legacyPreviewAvailable:true,legacyRecordedEvidenceStillMissing:true});

    await patch({opsTrajectoryMetric:'unknown-channel',opsTrajectoryMinute:'not-a-number'});
    assert.equal(await metric().inputValue(),'battery'); near(Number(await time().inputValue()),0,'Invalid stored time fallback');
    await patch({opsTrajectoryMinute:-5}); near(Number(await time().inputValue()),0,'Negative time clamp');
    await patch({opsTrajectoryMinute:999}); near(Number(await time().inputValue()),92,'Time above orbit clamp');
    await patch({opsTrials:[a,b],opsTrialSelected:aId,opsTrialCompare:bId,opsRuns:bId,opsTrajectoryMetric:'cmg',opsTrajectoryMinute:40,opsTrajectoryOpen:true});
    await parity(left,right,40,'cmg');
    await page.addScriptTag({path:path.join(ROOT,'desktop/web-app/node_modules/axe-core/axe.min.js')});
    await audit('final paired trajectories');
    const fit=await section().evaluate(element=>{const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,overflow:element.scrollWidth>element.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,targets:[...element.querySelectorAll('button,input,select')].map(node=>{const box=node.getBoundingClientRect();return {width:box.width,height:box.height};}).filter(box=>box.width&&box.height)};});
    assert(fit.left>=-1&&fit.right<=width+1&&!fit.overflow&&!fit.pageOverflow);
    assert(fit.targets.every(box=>box.width>=24&&box.height>=24));
    await section().screenshot({path:path.join(output,'paired-cmg-'+width+'.png'),animations:'disabled'});
    if(width<500){await page.emulateMedia({forcedColors:'active'});await section().screenshot({path:path.join(output,'trajectory-forced-colors-'+width+'.png'),animations:'disabled'});await audit('phone paired trajectories forced colors');await page.emulateMedia({forcedColors:'none'});}
    assert.deepEqual(errors,[]); return {width,checks,audits,fit,errors};
  } finally {await page.evaluate(()=>{const gate=window.__trajectoryFrameGate;if(gate){window.requestAnimationFrame=gate.request;window.cancelAnimationFrame=gate.cancel;}window.__destroy?.();}).catch(()=>{});await page.close();}
}

async function main(){
  await fs.mkdir(output,{recursive:true});
  const source=await fs.readFile(path.join(ROOT,'stem_lab/stem_tool_spacestation.js'),'utf8');
  const numbers=source.slice(source.indexOf('  function issFlightNumber('),source.indexOf('  function issTransferPlan('));
  const modelCode=source.slice(source.indexOf('  function issPowerState('),source.indexOf('  var _issRefOrbit'));
  models=new Function(numbers+modelCode+';return {power:issPowerState,air:issAirRun,airInspect:issAirInspect,thermal:issThermalRun,thermalInspect:issThermalInspect,attitude:issAttitudeRun,attitudeInspect:issAttitudeInspect};')();
  const suppliedBase=arg('--base',''),preview=suppliedBase?null:await createPreview(),base=(suppliedBase||preview.base).replace(/\/$/,'');let browser;
  try{const channel=arg('--channel','');browser=await chromium.launch({headless:true,...(channel?{channel}:{})});const results=[];for(const width of widths){results.push(await run(base,browser,width));await fs.writeFile(path.join(output,'results.json'),JSON.stringify({ok:results.length===widths.length,results},null,2));console.log('Read-only paired trajectories, exact independent time, native interaction, persistence, legacy evidence, and accessibility passed at '+width+'px');}console.log(JSON.stringify({ok:true,output,widths}));}
  finally{if(browser)await browser.close();if(preview)await new Promise(resolve=>preview.server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
