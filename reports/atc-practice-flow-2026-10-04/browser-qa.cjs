const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createFixtureServer, repo } = require('../atc-deep-dive-2026-10-03/browser-fixture.cjs');
const results = { started: new Date().toISOString(), fixture: 'Installed Chrome, canonical source and actual React host. Preview and exercise coaching checks use actual pathway controls and fixed exercise traffic. Vertical progress uses real progressive altitude motion and real exercise completion.', checks: [], errors: [], screenshots: [] };
let browser, fixture;
const scenarios = ['first_landing', 'arrival_sequence', 'separation_recovery', 'crossing_priority'];
async function check(name, fn) { try { const detail = await fn(); results.checks.push({ name, pass: true, detail: detail || null }); console.log('PASS ' + name); } catch (error) { results.checks.push({ name, pass: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); } }
async function makePage(width = 1440, options = {}) { const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options }); page.setDefaultTimeout(30000); page.on('pageerror', e => results.errors.push(e.message)); page.on('dialog', async d => { results.errors.push('Unexpected native dialog: ' + d.message()); await d.dismiss(); }); await page.goto(fixture.url); return page; }
async function start(page, id = 'first_landing') { await page.locator('#stem-atctower-tab-practice').click(); await page.locator('[data-atctower-practice-start="' + id + '"]').click(); await page.locator('[data-atctower-playing]').waitFor(); }
async function command(page, key) { await page.locator('[data-atctower-command="' + key + '"]').click(); }
async function game(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcGameRef.current))); }
async function toolData(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.__atcToolData.atcTower))); }
async function fit(page) { const dims = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })); assert.ok(dims.document <= dims.width + 1, JSON.stringify(dims)); return dims; }
async function axeCheck(page) { await page.addScriptTag({ url: new URL('axe.js', fixture.url).href }); const violations = await page.evaluate(async () => (await axe.run(document.querySelector('main'))).violations.filter(x => ['serious','critical'].includes(x.impact)).map(x => ({ id: x.id, impact: x.impact, targets: x.nodes.map(n => n.target) }))); assert.deepEqual(violations, []); }
async function capture(page, name, loc = null) { const file = path.join(__dirname, name + '.png'); if (loc) await loc.screenshot({ path: file }); else await page.screenshot({ path: file, fullPage: true }); results.screenshots.push(file); }
async function focusAt(page, id) { await page.waitForFunction(id => document.activeElement.id === id, id); const rect = await page.locator('#' + id).boundingBox(); assert.ok(rect.y >= -2 && rect.y + rect.height <= 1002, JSON.stringify(rect)); return rect; }
async function runChecks() {
  for (const width of [1440,390,320]) {
    await check('Exercise previews begin collapsed and remain read-only at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        const launchContext = page.locator('[data-atctower-launch-context]'); assert.equal(await launchContext.count(),1); await fit(page); await axeCheck(page); await capture(page,'after-welcome-' + width);
        await page.locator('#stem-atctower-tab-practice').click();
        const previews = page.locator('[data-atctower-practice-preview]'); assert.equal(await previews.count(), 4);
        const initial = await toolData(page), cards = [];
        for (const id of scenarios) {
          const preview = page.locator('[data-atctower-practice-preview="' + id + '"]');
          assert.equal(await preview.getAttribute('open'), null);
          const summary = preview.locator('summary'); const rect = await summary.boundingBox(); assert.ok(rect.height >= 44, JSON.stringify(rect));
          await summary.click(); assert.notEqual(await preview.getAttribute('open'), null);
          const text = await preview.innerText(); assert.match(text, /Begins paused/); assert.match(text, /ft/); assert.match(text, /kt/); assert.match(text, /Heading/);
          cards.push({ id, text }); await fit(page); await summary.click(); assert.equal(await preview.getAttribute('open'), null);
        }
        assert.deepEqual(await toolData(page), initial); assert.equal(await page.locator('[data-atctower-playing]').count(), 0);
        await axeCheck(page); await capture(page, 'after-pathway-collapsed-' + width);
        const separation = page.locator('[data-atctower-practice-preview="separation_recovery"]'); await separation.locator('summary').click();
        await fit(page); await axeCheck(page); await capture(page, 'after-preview-separation-' + width, separation);
        await capture(page, 'after-pathway-expanded-' + width);
        return { dimensions: await fit(page), cards };
      } finally { await page.close(); }
    });
    await check('Separation coaching and actual measurements fit accessibly at ' + width + 'px', async () => {
      const page = await makePage(width);
      try {
        await start(page, 'separation_recovery'); await focusAt(page, 'atc-exercise-title');
        const coaching = page.locator('[data-atctower-coaching]'); assert.match(await coaching.innerText(), /different altitude targets/i); assert.match(await coaching.innerText(), /runway is not required/i);
        const gap = page.locator('[data-atctower-vertical-gap]'), time = page.locator('[data-atctower-practice-time]');
        assert.equal(await gap.getAttribute('data-atctower-vertical-gap'), '0'); assert.match(await gap.innerText(), /0 \/ 1,000 ft/); assert.equal(await time.getAttribute('data-atctower-practice-time'), '0');
        await command(page, 'u'); assert.match(await coaching.innerText(), /actual gap is still building/i);
        assert.equal(await gap.getAttribute('data-atctower-vertical-gap'), '0'); const state = await game(page); assert.equal(state.paused, true); assert.equal(state.time, 0); assert.equal(state.aircraft.find(a => a.id === state.selected).altitude, 5000);
        await fit(page); await axeCheck(page); await capture(page, 'after-separation-planned-' + width);
        await capture(page, 'after-measurements-' + width, page.locator('[data-atctower-separation-progress]'));
        await capture(page, 'after-coaching-planned-' + width, coaching);
        return { actualGap: await gap.innerText(), elapsed: await time.innerText(), target: state.aircraft.find(a => a.id === state.selected).targetAltitude, dimensions: await fit(page) };
      } finally { await page.close(); }
    });
  }
  for (const id of scenarios) {
    await check('The ' + id + ' preview accurately describes its actual starting traffic and direct start stays available', async () => {
      const page = await makePage(390);
      try {
        await page.locator('#stem-atctower-tab-practice').click();
        const preview = page.locator('[data-atctower-practice-preview="' + id + '"]'); await preview.locator('summary').click();
        const text = await preview.innerText(); await capture(page, 'after-preview-' + id + '-390', preview);
        await page.locator('[data-atctower-practice-start="' + id + '"]').click(); await page.locator('[data-atctower-playing]').waitFor(); await focusAt(page, 'atc-exercise-title');
        const state = await game(page); assert.equal(state.practice.id, id); assert.equal(state.paused, true); assert.equal(state.time, 0); assert.equal(state.trainingMode, 'guided');
        for (const ac of state.aircraft) { assert.ok(text.includes(ac.callsign), ac.callsign); assert.ok(text.includes(Math.round(ac.altitude).toLocaleString() + ' ft'), ac.callsign); assert.ok(text.includes(ac.speed + ' kt'), ac.callsign); assert.ok(text.includes(String(ac.heading).padStart(3,'0') + '°'), ac.callsign); }
        if (id === 'separation_recovery') assert.match(text, /No runway/);
        if (id === 'crossing_priority') { assert.match(text, /MED101 · Priority/); assert.match(text, /share one protected movement area/); assert.match(text, /RWY 18/); assert.match(text, /RWY 27/); }
        return { roster: state.aircraft.map(a => ({ callsign: a.callsign, altitude: a.altitude, speed: a.speed, heading: a.heading })), initialFocus: 'atc-exercise-title' };
      } finally { await page.close(); }
    });
  }
  await check('Native preview disclosure supports keyboard toggling and visible focus without starting traffic', async () => {
    const page = await makePage(390);
    try {
      await page.locator('#stem-atctower-tab-practice').click(); const preview = page.locator('[data-atctower-practice-preview="arrival_sequence"]'), summary = preview.locator('summary');
      await summary.focus(); await summary.press('Space'); assert.notEqual(await preview.getAttribute('open'), null);
      const focus = await summary.evaluate(el => ({ focused: document.activeElement === el, style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth })); assert.equal(focus.focused, true); assert.notEqual(focus.style,'none'); assert.ok(parseFloat(focus.width) >= 2);
      await summary.press('Enter'); assert.equal(await preview.getAttribute('open'), null); assert.equal(await page.locator('[data-atctower-playing]').count(), 0);
      return focus;
    } finally { await page.close(); }
  });
  await check('Welcome descriptions identify the selected airport and actual standard or guided launch pace',async()=>{
    const page=await makePage(390);
    try{
      const button=page.getByRole('button',{name:'Start Tower Shift',exact:true});assert.equal(await button.getAttribute('aria-describedby'),'atc-shift-launch-description');
      assert.match(await page.locator('#atc-shift-launch-description').innerText(),/Begins live with automatic arrivals/);
      await page.getByRole('button',{name:/O.Hare Challenge/}).click();
      const selectedName=await page.locator('#atc-shift-launch-description').innerText();assert.match(selectedName,/Hare/);assert.match(selectedName,/Begins live/);
      await page.getByRole('radio',{name:/Guided practice/}).check();const guidedText=await page.locator('#atc-shift-launch-description').innerText();assert.match(guidedText,/Hare/);assert.match(guidedText,/Begins paused; add traffic when ready/);
      await capture(page,'after-selected-launch-context-390',page.locator('[data-atctower-launch-context]'));
      await button.click();await page.locator('[data-atctower-playing]').waitFor();const state=await game(page);assert.match(state.airport.name,/Hare/);assert.equal(state.trainingMode,'guided');assert.equal(state.paused,true);assert.ok(!state.practice);return{standardDescription:selectedName,guidedDescription:guidedText,actualAirport:state.airport.name,actualPace:state.trainingMode};
    }finally{await page.close();}
  });
  await check('Quick guided training names and starts its fixed paused exercise independently of the selected shift airport',async()=>{
    const page=await makePage(390);
    try{
      await page.getByRole('button',{name:/O.Hare Challenge/}).click();const button=page.getByRole('button',{name:'Start guided training',exact:true});assert.equal(await button.getAttribute('aria-describedby'),'atc-guided-launch-description');
      const description=await page.locator('#atc-guided-launch-description').innerText();assert.match(description,/Guide one arrival/);assert.match(description,/Begins paused/);
      await button.click();await page.locator('[data-atctower-playing]').waitFor();const state=await game(page);assert.equal(state.practice.id,'first_landing');assert.equal(state.trainingMode,'guided');assert.equal(state.paused,true);assert.equal(state.airport.id,'simple');return{description,actualScenario:state.practice.id,actualAirport:state.airport.id};
    }finally{await page.close();}
  });
  await check('A requested altitude target stays distinct from actual motion and measured six-second completion', async () => {
    const page = await makePage(390);
    try {
      await start(page, 'separation_recovery'); await command(page,'u');
      const gap = page.locator('[data-atctower-vertical-gap]'), time = page.locator('[data-atctower-practice-time]');
      assert.equal(await gap.getAttribute('data-atctower-vertical-gap'),'0'); assert.equal(await page.locator('[data-atctower-exercise-criterion="vertical"]').getAttribute('data-complete'),'false');
      await command(page,'pause');
      await page.waitForFunction(() => { const g = window.__atcGameRef.current; return Math.abs(g.aircraft[0].altitude - g.aircraft[1].altitude) >= 1000; });
      await command(page,'pause'); const partial = await game(page); assert.ok(partial.time > 0 && partial.time < 6); assert.equal(partial.paused,true); assert.ok(Math.abs(partial.aircraft[0].altitude-partial.aircraft[1].altitude)>=1000);
      assert.match(await page.locator('[data-atctower-coaching]').innerText(),/actual altitude gap meets 1,000 ft/i);
      assert.ok(Number(await gap.getAttribute('data-atctower-vertical-gap')) >= 1000); assert.ok(Number(await time.getAttribute('data-atctower-practice-time')) < 6);
      await capture(page,'after-separation-actual-390');
      await command(page,'pause'); await page.locator('[data-atctower-exercise][data-exercise-status="complete"]').waitFor();
      const final = await game(page); assert.equal(final.paused,true); assert.ok(final.time>=6); assert.equal(final.conflictEpisodes,0); assert.equal(final.aircraft.length,2); assert.equal(final.practice.completed,true);
      assert.equal(await page.locator('[data-atctower-exercise-criterion="time"]').getAttribute('data-complete'),'true');
      await capture(page,'after-separation-completed-390'); await page.locator('[data-atctower-save-debrief]').click(); await page.locator('[data-atctower-debrief]').waitFor(); await focusAt(page,'atc-debrief-title');
      assert.equal(await page.locator('[data-atctower-separation-progress]').count(),0); const data=await toolData(page); assert.equal(data.lastShift.exerciseResult.complete,true);
      const next=page.locator('[data-atctower-next-practice]'),destination=page.locator('[data-atctower-next-destination]');assert.equal(await next.getAttribute('aria-describedby'),'atc-next-practice-destination');assert.equal(await destination.getAttribute('data-atctower-next-destination'),await next.getAttribute('data-atctower-next-practice'));assert.match(await destination.innerText(),/Guide one arrival/);await capture(page,'after-completed-debrief-next-390');
      await page.locator('[data-atctower-practice-retry="separation_recovery"]').click(); await page.locator('[data-atctower-playing]').waitFor(); await focusAt(page,'atc-exercise-title');
      assert.equal(await gap.getAttribute('data-atctower-vertical-gap'),'0'); assert.equal(await time.getAttribute('data-atctower-practice-time'),'0'); assert.match(await page.locator('[data-atctower-coaching]').innerText(),/different altitude targets/i);
      return { partialShiftTime: partial.time, finalShiftTime: final.time, finalVerticalGap: Math.abs(final.aircraft[0].altitude-final.aircraft[1].altitude), recordedCompletion: true, retryReset: true };
    } finally { await page.close(); }
  });
  await check('Preview and separation progress remain readable in forced colors at 200 percent zoom', async () => {
    const page = await makePage(1280,{forcedColors:'active'});
    try {
      await page.evaluate(() => { document.documentElement.style.zoom='2'; }); await page.locator('#stem-atctower-tab-practice').click();
      const preview=page.locator('[data-atctower-practice-preview="crossing_priority"]'); await preview.locator('summary').click(); await fit(page); await axeCheck(page); await capture(page,'after-preview-forced-colors-200percent');
      await page.locator('[data-atctower-practice-start="separation_recovery"]').click(); await page.locator('[data-atctower-playing]').waitFor(); await command(page,'u'); await fit(page); await axeCheck(page); await capture(page,'after-progress-forced-colors-200percent');
    } finally { await page.close(); }
  });
  await check('Actual arrival-sequence coaching follows the next aircraft after a landing', async () => {
    const page=await makePage(390);
    try {
      await start(page,'arrival_sequence'); await command(page,'p');
      assert.match(await page.locator('[data-atctower-coaching]').innerText(),/deliberately holding/i);
      await page.locator('[data-atctower-aircraft="102"]').click();
      assert.match(await page.locator('[data-atctower-coaching]').innerText(),/first in the exercise order/i);
      await command(page,'c'); await command(page,'pause');
      await page.waitForFunction(() => window.__atcGameRef.current.practice.landedIds.includes(102)); await command(page,'pause');
      const afterFirst=await game(page); assert.deepEqual(afterFirst.practice.landedIds,[102]); assert.equal(afterFirst.conflictEpisodes,0);
      await page.locator('[data-atctower-aircraft="101"]').click(); await command(page,'p');
      assert.match(await page.locator('[data-atctower-coaching]').innerText(),/preceding arrival has landed/i);
      await capture(page,'after-sequence-next-390',page.locator('[data-atctower-coaching]'));
      return {landedIds:afterFirst.practice.landedIds,followingAircraft:'NEAR101',coaching:await page.locator('[data-atctower-coaching]').innerText()};
    } finally {await page.close();}
  });
  await check('A real separation alert gives review coaching instead of presenting remaining work as safely completable',async()=>{
    const page=await makePage(390);
    try{
      await start(page,'separation_recovery');await command(page,'pause');
      await page.waitForFunction(()=>window.__atcGameRef.current.conflictEpisodes>0);await command(page,'pause');
      await page.locator('[data-atctower-exercise][data-exercise-status="review"]').waitFor();
      const text=await page.locator('[data-atctower-coaching]').innerText();assert.match(text,/objective needs review/i);assert.match(text,/record this attempt and retry/i);assert.doesNotMatch(text,/actual altitude gap meets/i);
      await capture(page,'after-review-needed-coaching-390',page.locator('[data-atctower-coaching]'));return{conflictEpisodes:(await game(page)).conflictEpisodes,coaching:text};
    }finally{await page.close();}
  });
}
async function main() { fixture = await createFixtureServer(); const source = path.join(repo, 'stem_lab/stem_tool_atctower.js'), hash = () => crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'), initialHash = hash(); results.sourceHash = initialHash; try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); await runChecks(); } finally { if (browser) await browser.close(); await new Promise(resolve => fixture.server.close(resolve)); } results.completed = new Date().toISOString(); results.passed = results.checks.filter(c => c.pass).length; results.failed = results.checks.filter(c => !c.pass).length; results.sourceStable = initialHash === hash(); fs.writeFileSync(path.join(__dirname, 'browser-qa-results.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify({ passed: results.passed, failed: results.failed, runtimeErrors: results.errors, sourceStable: results.sourceStable })); if (!results.checks.length || results.failed || results.errors.length || !results.sourceStable) process.exitCode = 1; }
main().catch(e => { console.error(e.stack); process.exitCode = 1; });
