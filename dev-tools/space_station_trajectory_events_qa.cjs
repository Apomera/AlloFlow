#!/usr/bin/env node
'use strict';

// Follow the causes of paired-curve divergence without loading either trial.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-trajectory-events'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, label, tolerance = 1e-7) => assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} should equal ${expected}`);

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
  const details = () => page.locator('[data-ops-trajectory-events]');
  const metric = () => page.locator('[data-ops-trajectory-metric]');
  const event = (side, id) => page.locator('[data-ops-trajectory-event="' + side + ':' + id + '"]');
  const minute = async (side,id) => Number(await event(side,id).getAttribute('data-event-minute'));
  const entries = () => details().locator('[data-ops-trajectory-event]').evaluateAll(nodes => nodes.map(node => ({ key: node.dataset.opsTrajectoryEvent, minute: Number(node.dataset.eventMinute), pressed: node.getAttribute('aria-pressed') === 'true', text: node.innerText })));
  const protectedState = async () => { const value = await state(); delete value.opsTrajectoryMinute; return value; };
  const audit = async label => {
    const result = await page.evaluate(async () => {
      const scan = await axe.run(document.querySelector('[data-ops-trajectory]'), { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    });
    assert.deepEqual(result.violations, [], label + ' accessibility, including contrast'); audits.push({ label, ...result });
  };
  const openEvents = async () => { if (!(await details().evaluate(element => element.open))) await activate(details().locator('summary')); };
  const choose = async (side,id,waitForFocus=true) => {
    const expected = await minute(side,id), before = await protectedState();
    await activate(event(side,id));
    if(waitForFocus)await page.waitForFunction(() => document.activeElement?.id === 'iss-trajectory-readout-title');
    assert.equal((await state()).opsTrajectoryMinute, expected, 'Event keeps its exact raw time');
    assert.deepEqual(await protectedState(), before, 'Only the independent cursor changes');
    for (const item of await entries()) assert.equal(item.pressed,item.minute === expected,'Strict selected event time: '+item.key);
    for (const name of ['baseline','comparison']) near(Number(await page.locator('[data-ops-trajectory-reading="'+name+'"]').getAttribute('data-minute')),expected,'Readout '+name+' clock');
    return expected;
  };
  const navigate = async (direction, expected) => {
    const before = await protectedState();
    await activate(page.locator('[data-ops-trajectory-'+direction+']'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trajectory-readout-title');
    assert.equal((await state()).opsTrajectoryMinute, expected, direction+' visits the next distinct raw time');
    assert.deepEqual(await protectedState(),before);
  };
  const holdFrames = () => page.evaluate(() => {
    const gate = window.__trajectoryEventsGate = { request: window.requestAnimationFrame, cancel: window.cancelAnimationFrame, next: -1, callbacks: new Map() };
    window.requestAnimationFrame = callback => { const id = gate.next--; gate.callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { if (!gate.callbacks.delete(id)) gate.cancel.call(window,id); };
  });
  const releaseFrames = () => page.evaluate(() => {
    const gate=window.__trajectoryEventsGate;window.requestAnimationFrame=gate.request;window.cancelAnimationFrame=gate.cancel;
    gate.callbacks.forEach(callback=>gate.request.call(window,callback));delete window.__trajectoryEventsGate;
  });
  try {
    await page.goto(base+'/?tab=operations');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await patch({opsCmg:100,opsAttitudeTorque:0,opsAttitudeDump:true,opsAttitudeThrust:5,opsAttitudeFuel:1.5,opsAttitudeBurnMinute:10});
    await page.locator('[data-ops-prediction]').fill('An earlier unloading burn should change the middle of the orbit even when summary readings agree.');
    await activate(page.locator('[data-ops-record-trial]'));
    const aId=(await state()).opsTrialSelected;
    await page.locator('[data-ops-reflection]').fill('Use the exact burn events to explain where the paired curves separate.');
    await patch({opsAttitudeBurnMinute:70});
    await activate(page.locator('[data-ops-record-trial]'));
    const bId=Number((await state()).opsTrialCompare),saved=(await state()).opsTrials,a=saved.find(item=>item.id===aId),b=saved.find(item=>item.id===bId);
    await patch({opsResearch:30,opsOrbitMinute:37.25,opsWaterDay:12.3,opsPressureMinute:7.5,opsPrediction:'Draft for another experiment.',opsTrajectoryMetric:'cmg'});
    await activate(page.locator('[data-ops-trajectory-toggle]'));
    assert.equal(await details().evaluate(element=>element.tagName),'DETAILS');
    assert.equal(await details().evaluate(element=>element.open),false,'Events default collapsed');
    await page.addScriptTag({path:path.join(ROOT,'desktop/web-app/node_modules/axe-core/axe.min.js')});
    await audit('collapsed events');
    await openEvents();
    for(const [side,id] of [['baseline',aId],['comparison',bId]]) assert.match(await page.locator('[data-ops-trajectory-event-group="'+side+'"]').innerText(),new RegExp('trial\\s+'+id,'i'));
    near(await minute('baseline','burn-start'),10,'Earlier burn start');
    near(await minute('baseline','burn-end'),13.641666666666667,'Earlier burn end');
    near(await minute('comparison','burn-start'),70,'Later burn start');
    near(await minute('comparison','burn-end'),73.64166666666667,'Later burn end');
    const earlyEnd=await choose('baseline','burn-end');
    near(Number(await page.locator('[data-ops-trajectory-reading="baseline"]').getAttribute('data-value')),8,'Early burn complete');
    near(Number(await page.locator('[data-ops-trajectory-reading="comparison"]').getAttribute('data-value')),100,'Late burn still pending');
    const simultaneous=(await entries()).filter(item=>item.minute===0);
    assert(simultaneous.some(item=>item.key==='baseline:start')&&simultaneous.some(item=>item.key==='baseline:cmg-peak'),'Distinct events retain their meanings at the same instant');
    await choose('baseline','start');
    assert((await entries()).filter(item=>item.pressed).length>2,'Every exact coincident event is selected');
    const times=[...new Set((await entries()).map(item=>item.minute))].sort((x,y)=>x-y);
    assert(await page.locator('[data-ops-trajectory-previous]').isDisabled());
    for(const time of times.slice(1)) await navigate('next',time);
    assert(await page.locator('[data-ops-trajectory-next]').isDisabled());
    for(const time of times.slice(0,-1).reverse()) await navigate('previous',time);
    assert(await page.locator('[data-ops-trajectory-previous]').isDisabled());
    checks.push({burns:{earlyStart:10,earlyEnd,lateStart:70,lateEnd:await minute('comparison','burn-end')},coincident:simultaneous,distinctNavigation:times});
    await choose('baseline','burn-end');
    await audit('expanded CMG events');
    await details().screenshot({path:path.join(output,'paired-burn-events-'+width+'.png'),animations:'disabled'});

    const allowed={battery:['start','eclipse','end','battery-reserve','battery-full','battery-empty','battery-min'],co2:['start','eclipse','end','air-limit','air-restore','co2-peak'],temp:['start','eclipse','end','thermal-limit','cabin-min','cabin-max'],cmg:['start','eclipse','end','attitude-caution','attitude-capacity','burn-start','burn-end','cmg-peak'],pointing:['start','eclipse','end','attitude-capacity','burn-start','burn-end'],propellant:['start','eclipse','end','attitude-capacity','burn-start','burn-end']};
    const filtered=[];
    for(const [key,ids] of Object.entries(allowed)){
      await metric().selectOption(key);await openEvents();const list=await entries();
      assert(list.every(item=>ids.includes(item.key.split(':')[1])),key+' excludes unrelated checkpoints');
      for(const side of ['baseline','comparison']){const group=list.filter(item=>item.key.startsWith(side+':'));assert(group.every((item,index)=>!index||item.minute>=group[index-1].minute),key+' group is chronological');for(const common of ['start','eclipse','end'])assert(group.some(item=>item.key===side+':'+common));}
      filtered.push({key,ids:[...new Set(list.map(item=>item.key.split(':')[1]))]});
    }
    checks.push({metricFiltering:filtered});

    // Editing the working setup cannot change a saved comparison's events.
    await metric().selectOption('cmg');const savedEvents=await entries();
    await patch({opsAttitudeBurnMinute:23.5,opsEclipse:45});
    assert.deepEqual(await entries(),savedEvents);
    await page.locator('[data-ops-trial-compare]').selectOption('current');
    await patch({...b.setup,opsEclipse:45});
    assert.match(await page.locator('[data-ops-trajectory-event-group="comparison"]').innerText(),/current setup/i);
    near(await minute('baseline','eclipse'),57,'Baseline eclipse');near(await minute('comparison','eclipse'),47,'Current eclipse');
    await choose('comparison','eclipse');
    assert.equal(await page.locator('[data-ops-trajectory-reading="baseline"]').getAttribute('data-lit'),'true');
    assert.equal(await page.locator('[data-ops-trajectory-reading="comparison"]').getAttribute('data-lit'),'false');
    await patch({opsAttitudeBurnMinute:23.5});near(await minute('comparison','burn-start'),23.5,'Current intervention updates');near(await minute('baseline','burn-start'),10,'Saved baseline stays fixed');
    await patch({opsAttitudeDump:false});assert.equal(await event('comparison','burn-start').count(),0);assert.equal(await event('comparison','burn-end').count(),0);
    await patch({opsAttitudeDump:true,opsAttitudeFuel:0});assert.equal(await event('comparison','burn-start').count(),0);assert.equal(await event('comparison','burn-end').count(),0);
    checks.push({sourceSpecificEclipse:true,currentEventsUpdate:true,disabledBurnAbsent:true,emptyTankBurnAbsent:true,savedEventsIgnoreCurrentEdits:true});

    await metric().selectOption('co2');
    await patch({...b.setup,opsAirFlow:3,opsAirRestore:true,opsAirRestoreMinute:57.12345});
    near(await minute('comparison','air-restore'),57.12345,'Fractional air restoration');
    await choose('comparison','air-restore');
    near(Number(await page.locator('[data-ops-trajectory-reading="comparison"]').getAttribute('data-value')),4226.805383484121,'Exact restored-air reading');
    assert.equal(await event('comparison','co2-peak').getAttribute('aria-pressed'),'true','Coincident restoration and peak remain distinct selected meanings');
    await patch({opsAirFlow:120});assert.equal(await event('comparison','air-restore').count(),0,'Already adequate flow has no restoration action');
    await patch({...b.setup,opsAirFlow:3,opsAirRestore:true,opsAirRestoreMinute:57.00000001,opsEclipse:35});
    const closeTimes=[...new Set((await entries()).map(item=>item.minute))].sort((x,y)=>x-y);
    assert(closeTimes.includes(57)&&closeTimes.includes(57.00000001),'Very close independent events are not merged');
    await choose('comparison','eclipse');
    assert.equal(await event('comparison','air-restore').getAttribute('aria-pressed'),'false','Near-but-not-equal events are not selected by rounded label');
    await navigate('next',57.00000001);
    assert.equal(await event('comparison','eclipse').getAttribute('aria-pressed'),'false');
    assert.equal(await event('comparison','air-restore').getAttribute('aria-pressed'),'true');
    checks.push({fractionalRestoration:57.12345,nearbyDistinctTimes:[57,57.00000001],noopRestorationAbsent:true});

    // Native event seeking is independent even while the live orbit is playing.
    await patch({opsOrbitMinute:37.25});await holdFrames();
    try{await activate(page.locator('[data-iss-playback-toggle="integrated"]'));assert.equal(await page.locator('[data-iss-playback-toggle="integrated"]').getAttribute('aria-pressed'),'true');await choose('comparison','air-restore',false);assert.equal(await page.locator('[data-iss-playback-toggle="integrated"]').getAttribute('aria-pressed'),'true');await activate(page.locator('[data-iss-playback-toggle="integrated"]'));}finally{await releaseFrames();}
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trajectory-readout-title');
    checks.push({sharedPlaybackContinues:true});

    await page.locator('[data-ops-trial-compare]').selectOption(String(aId));await metric().selectOption('cmg');
    const self=await entries(),leftSelf=self.filter(item=>item.key.startsWith('baseline:')).map(item=>[item.key.split(':')[1],item.minute]),rightSelf=self.filter(item=>item.key.startsWith('comparison:')).map(item=>[item.key.split(':')[1],item.minute]);
    assert.deepEqual(leftSelf,rightSelf);await choose('baseline','burn-end');
    near(Number(await page.locator('[data-ops-trajectory-delta]').getAttribute('data-value')),0,'Self comparison');
    const legacy={...b,id:99,results:{...b.results}};delete legacy.results.pointingEnd;delete legacy.results.propellantUsed;
    await patch({opsTrials:[a,b,legacy],opsTrialSelected:aId,opsTrialCompare:99});await metric().selectOption('propellant');
    await choose('comparison','burn-end');
    assert.match(await page.locator('[data-ops-trial-metric="propellantUsed"] td').nth(1).innerText(),/not recorded/i);
    assert.equal(Object.hasOwn((await state()).opsTrials.find(item=>item.id===99).results,'propellantUsed'),false);
    checks.push({selfGroupsEquivalent:true,legacyEventsRecomputedWithoutFillingEvidence:true});

    await patch({...b.setup,opsTrials:[a,b],opsTrialSelected:aId,opsTrialCompare:bId,opsRuns:bId,opsTrajectoryMetric:'cmg'});await openEvents();await choose('baseline','burn-end');
    const descriptor=await page.locator('#iss-trajectory-readout-title').getAttribute('aria-describedby');
    assert(descriptor,'Focused readout heading connects both readings and their difference');
    const described=await page.evaluate(ids=>ids.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' '),descriptor);
    assert.match(described,/trial\s*1/i);assert.match(described,/trial\s*2/i);assert.match(described,/comparison.*baseline|difference|delta/i);
    const fit=await details().evaluate(element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,overflow:element.scrollWidth>element.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,buttons:[...element.querySelectorAll('button,summary')].map(node=>{const b=node.getBoundingClientRect();return{width:b.width,height:b.height};})};});
    assert(fit.left>=-1&&fit.right<=width+1&&!fit.overflow&&!fit.pageOverflow);assert(fit.buttons.every(b=>b.width>=24&&b.height>=24));
    await audit('final expanded events');
    await details().screenshot({path:path.join(output,'paired-burn-events-'+width+'.png'),animations:'disabled'});
    await section().screenshot({path:path.join(output,'trajectory-with-events-'+width+'.png'),animations:'disabled'});
    await activate(details().locator('summary'));assert.equal(await details().evaluate(e=>e.open),false);await audit('closed after interaction');await openEvents();
    if(width<500){await page.emulateMedia({forcedColors:'active'});await details().screenshot({path:path.join(output,'events-forced-colors-'+width+'.png'),animations:'disabled'});await audit('phone events forced colors');await page.emulateMedia({forcedColors:'none'});}
    assert.deepEqual(errors,[]);return{width,checks,audits,fit,errors};
  }finally{await page.evaluate(()=>{const gate=window.__trajectoryEventsGate;if(gate){window.requestAnimationFrame=gate.request;window.cancelAnimationFrame=gate.cancel;}window.__destroy?.();}).catch(()=>{});await page.close();}
}

async function main(){await fs.mkdir(output,{recursive:true});const supplied=arg('--base',''),preview=supplied?null:await createPreview(),base=(supplied||preview.base).replace(/\/$/,'');let browser;try{const channel=arg('--channel','');browser=await chromium.launch({headless:true,...(channel?{channel}:{})});const results=[];for(const width of widths){results.push(await run(base,browser,width));await fs.writeFile(path.join(output,'results.json'),JSON.stringify({ok:results.length===widths.length,results},null,2));console.log('Source-specific trajectory checkpoints, exact navigation, independent state, legacy evidence, focus, and accessibility passed at '+width+'px');}console.log(JSON.stringify({ok:true,output,widths}));}finally{if(browser)await browser.close();if(preview)await new Promise(resolve=>preview.server.close(resolve));}}
main().catch(error=>{console.error(error);process.exitCode=1;});
