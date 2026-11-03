#!/usr/bin/env node
'use strict';

// Compare two guided eclipses, inspect the extra time in shadow, and explain a chart reading.
// node dev-tools/space_station_guided_eclipse_qa.cjs [--widths=1440,390] [--out=reports/space-station-guided-eclipse]
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const root = path.resolve(__dirname, '..');
const option = (key, fallback) => process.argv.slice(2).find(value => value.startsWith(key + '='))?.slice(key.length + 1) || fallback;
const output = path.resolve(root, option('--out', 'reports/space-station-guided-eclipse'));
const widths = option('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));

async function run(browser, base, width) {
  const page = await browser.newPage({
    viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce'
  });
  const errors = [], audits = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const find = selector => page.locator(selector);
  const guide = find('[data-eclipse-guide]');
  const action = name => find('[data-eclipse-guide-' + name + ']');
  const obs = name => find('[data-ops-observation-' + name + ']');
  const comparison = find('[data-ops-trial-compare]');
  const reflection = find('[data-ops-compared-reflection]');
  const state = () => page.evaluate(() => structuredClone(window.__toolData.spaceStation));
  const patch = async values => {
    await page.evaluate(values => window.__setToolData(previous => ({
      ...previous, spaceStation: { ...previous.spaceStation, ...values }
    })), values);
    await page.waitForFunction(values => Object.entries(values).every(([key, value]) =>
      JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), values);
  };
  const press = async control => {
    await control.focus();
    await page.keyboard.press('Enter');
  };
  const captureReading = async () => {
    await press(obs('capture'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-observation-preview-title');
  };
  const shot = (control, name) => control.screenshot({ path: path.join(output, name + '-' + width + '.png'), animations: 'disabled' });
  const audit = async (scope, label) => {
    const result = await scope.evaluate(async element => {
      const scan = await axe.run(element, { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })) };
    });
    assert.deepEqual(result.violations, [], label + ' accessibility');
    const layout = await scope.evaluate(element => ({
      fits: element.scrollWidth <= element.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
      shortTargets: Array.from(element.querySelectorAll('button,summary')).filter(button => {
        const box = button.getBoundingClientRect();
        return box.width && (box.width < 24 || box.height < 24);
      }).map(button => button.textContent)
    }));
    assert(layout.fits, label + ' fits viewport');
    assert.deepEqual(layout.shortTargets, [], label + ' target size');
    audits.push({ label, ...result, ...layout });
  };
  async function showComparisonNote() {
    const details = find('[data-ops-compared-details]');
    if (!await details.evaluate(element => element.open)) await press(details.locator('summary'));
  }
  async function useReading(baseline, revised) {
    assert.equal(await find('[data-ops-trajectory-toggle]').getAttribute('aria-expanded'), 'true');
    assert.equal(await find('[data-ops-trajectory-metric]').inputValue(), 'battery');
    const minute = Number(await find('[data-ops-trajectory-time]').inputValue());
    assert.equal(await page.getByRole('button', { name: /use this reading in my reflection/i }).count(), 1);
    await showComparisonNote();
    assert.equal(await reflection.inputValue(), '');
    const before = await state();
    await captureReading();
    const preview = await obs('text').innerText();
    assert.match(preview, /battery/i);
    assert(preview.includes(minute.toFixed(2)) || preview.includes('+' + minute + ' '), 'Includes selected comparison minute');
    assert.match(preview, new RegExp('trial\\s+' + baseline.id, 'i'));
    assert.match(preview, new RegExp('trial\\s+' + revised.id, 'i'));
    for (const side of ['baseline', 'comparison']) {
      const readout = await find('[data-ops-trajectory-reading="' + side + '"] strong').innerText();
      assert(preview.replace(/\s/g, '').includes(readout.replace(/\s/g, '')), side + ' preview agrees with chart');
    }
    assert.equal(await obs('target').inputValue(), String(revised.id));
    await shot(obs('preview'), 'evidence-preview');
    await audit(obs('preview'), 'Evidence preview');
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit(obs('preview'), 'Evidence preview in forced colors');
      await shot(obs('preview'), 'evidence-forced-colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    assert.deepEqual(await state(), before, 'Preview and destination selection only affect local draft UI');
    await press(obs('append'));
    const appended = preview;
    await page.waitForFunction(expected => document.querySelector('[data-ops-compared-reflection]').value === expected, appended);
    const after = await state();
    assert.deepEqual(after, {
      ...before, opsTrials: before.opsTrials.map(trial => trial.id === revised.id ? { ...trial, reflection: appended } : trial)
    }, 'Appending updates just the chosen reflection');
    assert(await action('finish').isDisabled(), 'A captured reading still needs the learner’s explanation');
    const explanation = '\nDuring eclipse the arrays no longer supply the load, so ten more minutes draw more energy from the battery.';
    await page.waitForFunction(() => document.activeElement?.id === 'iss-eclipse-guide-reflection');
    assert(await action('reflection').evaluate(element => element.selectionStart === element.value.length && element.selectionEnd === element.value.length));
    await page.keyboard.insertText(explanation);
    const answer = appended + explanation;
    const answered = await state();
    assert.equal(answered.opsTrials.find(trial => trial.id === revised.id).reflection, answer);
    assert(await action('finish').isEnabled(), 'Writing an explanation completes the reflection step');
    checks.push({ guidedReading: preview, appendedOnlyTo: revised.id, learnerExplanationSaved: true });
    return { answer, answered };
  }
  async function guardObservations(baseline, revised) {
    const time = find('[data-ops-trajectory-time]');
    const note = () => state().then(value => value.opsTrials.find(trial => trial.id === revised.id).reflection);
    const original = await note();
    await captureReading();
    await obs('target').selectOption(String(revised.id));
    const frozen = await obs('text').innerText();
    await time.press('ArrowLeft');
    assert.equal(await obs('text').innerText(), frozen, 'Seeking preserves the preview');
    assert(await obs('append').isDisabled(), 'A reading from an earlier cursor needs a fresh capture');
    assert.equal(await note(), original);
    await press(obs('cancel'));
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-ops-observation-capture'));
    await captureReading();
    await obs('target').selectOption(String(revised.id));
    const fresh = await obs('text').innerText();
    assert.notEqual(fresh, frozen);
    const limit = Number(await reflection.getAttribute('maxlength'));
    const fitsExactly = 'x'.repeat(limit - fresh.length - 1);
    await reflection.fill(fitsExactly + 'x');
    assert(await obs('append').isDisabled(), 'Appending must not truncate an existing reflection');
    assert.equal(await note(), fitsExactly + 'x');
    await reflection.fill(fitsExactly);
    assert(await obs('append').isEnabled(), 'Exactly 1200 characters fit');
    await press(obs('append'));
    assert.equal(await note(), fitsExactly + '\n' + fresh);
    await reflection.fill(original);
    for (const choice of [String(baseline.id), 'current']) {
      await comparison.selectOption(choice);
      await captureReading();
      assert.deepEqual(await obs('target').locator('option').evaluateAll(options => options.map(option => option.value)), [String(baseline.id)]);
      await press(obs('cancel'));
    }
    await comparison.selectOption(String(revised.id));
    checks.push({ stalePreviewBlocked: true, capacity: limit, currentAndSelfDestinations: 1 });
  }
  async function step(name) {
    await page.waitForFunction(name => document.querySelector('[data-eclipse-guide]')?.dataset.step === name, name);
    await page.waitForFunction(() => document.activeElement?.id === 'iss-eclipse-guide-title');
  }
  async function remount(saved) {
    await page.evaluate(saved => {
      window.__destroy();
      window.__mount(JSON.parse(JSON.stringify(saved)));
    }, saved);
    await find('[data-ops-trial-notebook]').waitFor();
  }
  async function checkEclipseWindow(baseline, revised, empty) {
    const panel = find('details[data-eclipse-window]');
    const summary = panel.locator('summary');
    assert.equal(await panel.evaluate(element => element.open), false);
    assert.match(await summary.innerText(), /ten|10/i);
    // Make the working controls differ from both saved setups before reading the pair.
    await patch({ opsResearch: 30, opsOrbitMinute: 17.25, opsWaterDay: 8.5, opsPressureMinute: 3.75, opsTrialCompare: 'current' });
    const before = await state();
    await press(summary);
    assert.equal(await panel.getAttribute('data-window-start'), '47');
    assert.equal(await panel.getAttribute('data-window-end'), '57');
    const readings = {};
    for (const side of ['baseline', 'comparison']) {
      const card = panel.locator('[data-eclipse-window-side="' + side + '"]');
      const isBaseline = side === 'baseline';
      assert.match(await card.innerText(), new RegExp('trial\\s+' + (isBaseline ? baseline.id : revised.id), 'i'));
      assert.equal(await card.getAttribute('data-lit'), String(isBaseline));
      const expected = {
        startReserve: empty ? 0 : 99.81696488139829,
        endReserve: empty ? 0 : isBaseline ? 100 : 92.09766663578425,
        solarToLoadsKWh: !empty && isBaseline ? 15.4 : 0,
        batteryDeliveredKWh: !empty && !isBaseline ? 15.4 : 0,
        unservedKWh: empty ? 15.4 : 0, requestedKWh: 15.4
      };
      readings[side] = {};
      for (const [key, target] of Object.entries(expected)) {
        const raw = await card.locator('[data-eclipse-window-value="' + key + '"]').getAttribute('data-value');
        assert(raw !== null && Math.abs(Number(raw) - target) <= 1e-8, side + ' ' + key + ': ' + raw);
        readings[side][key] = Number(raw);
      }
    }
    assert.deepEqual(await state(), before, 'Inspecting interval energy uses the saved pair without editing project state');
    const label = empty ? 'empty' : 'nominal';
    await shot(panel, 'extra-ten-minutes-' + label);
    await audit(panel, 'Extra ten minutes ' + label);
    if (!empty && width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit(panel, 'Extra ten minutes in forced colors');
      await shot(panel, 'extra-ten-minutes-forced-colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    await press(panel.locator('[data-eclipse-window-inspect]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trajectory-readout-title');
    assert.deepEqual(await state(), { ...before, opsTrialSelected: baseline.id, opsTrialCompare: revised.id,
      opsTrajectoryOpen: true, opsTrajectoryMetric: 'battery', opsTrajectoryMinute: 52 }, 'Chart shortcut only selects the guide pair and its independent cursor');
    for (const side of ['baseline', 'comparison']) {
      const sample = find('[data-ops-trajectory-reading="' + side + '"]');
      assert.equal(await sample.getAttribute('data-lit'), String(side === 'baseline'));
      assert.equal(await sample.getAttribute('data-minute'), '52');
    }
    await press(summary);
    assert.equal(await panel.evaluate(element => element.open), false);
    checks.push({ eclipseWindow: label, minutes: [47, 57], chartMinute: 52, readings });
  }
  async function checkMidProjectStart(previousTrials) {
    await press(action('exit'));
    await page.locator('.iss-ops-mode').filter({ hasText: 'Power' }).click();
    const draft = 'A separate project already has a prediction about cabin air.';
    await patch({ opsPrediction: draft, opsWaterDay: 8.5, opsPressureMinute: 3.75, opsEclipse: 28, opsBattery: 0, opsArrayAngle: 0, opsResearch: 60 });
    await press(action('start'));
    await step('baseline');
    const started = await state();
    assert.deepEqual(started.opsTrials, previousTrials);
    assert.equal(started.opsPrediction, draft);
    assert.equal(started.opsWaterDay, 8.5);
    assert.equal(started.opsPressureMinute, 3.75);
    assert.equal(started.opsBattery, 0);
    assert.equal(started.opsEclipse, 35);
    assert.equal(started.opsOrbitMinute, 0);
    await action('prediction').fill('With an empty battery and no solar generation, I expect unmet demand in both trials.');
    await press(action('record-a'));
    await step('change');
    await press(action('change'));
    await step('comparison');
    await press(action('record-b'));
    await step('reflect');
    const recorded = await state();
    assert.equal(recorded.opsTrials.length, 4);
    assert.deepEqual(recorded.opsTrials.slice(0, 2), previousTrials);
    const [a, b] = recorded.opsTrials.slice(-2);
    assert.deepEqual(b.setup, { ...a.setup, opsEclipse: 45 });
    assert.equal(a.setup.opsBattery, 0);
    assert.equal(a.setup.opsEclipse, 35);
    assert.equal(recorded.opsTrialSelected, a.id);
    assert.equal(Number(recorded.opsTrialCompare), b.id);
    assert.equal(recorded.opsWaterDay, 8.5);
    assert.equal(recorded.opsPressureMinute, 3.75);
    assert.equal(recorded.opsPrediction, draft);
    await checkEclipseWindow(a, b, true);
    await press(action('exit'));
    await press(find('[data-ops-record-trial]'));
    await page.locator('.iss-ops-mode').filter({ hasText: 'Power' }).click();
    assert(await action('start').isDisabled(), 'A notebook with one free slot cannot start a two-trial guide');
    assert.match(await guide.innerText(), /slots/i);
    assert.deepEqual((await state()).opsTrials.slice(0, 4), recorded.opsTrials);
    checks.push({ existingProjectTrialsPreserved: previousTrials.map(trial => trial.id), laterGuidedPair: [a.id, b.id], draftRetained: true, reservedTwoSlots: true });
  }
  try {
    await page.goto(base + '/?tab=operations&mode=power');
    await find('#iss-power-title').waitFor();
    await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    const starter = action('start');
    await starter.waitFor();
    assert.match(await starter.innerText(), /eclipse|investigation/i);
    await press(starter);
    await step('baseline');
    const started = await state();
    assert.equal(started.opsEclipse, 35);
    assert.equal(started.opsMode, 'power');
    assert.equal(started.opsOrbitMinute, 0);
    assert.equal((started.opsTrials || []).length, 0);
    const prediction = 'I predict a lower minimum battery reserve with ten more minutes in eclipse because the solar panels cannot supply the station during that time.';
    await action('prediction').fill(prediction);
    await shot(guide, 'guided-baseline');
    await audit(guide, 'Guided investigation');
    await find('#iss-power-angle').press('Home');
    assert(await action('record-a').isDisabled(), 'Drift must be restored before recording the guided baseline');
    await press(action('restore'));
    await press(action('record-a'));
    await step('change');
    let current = await state();
    assert.equal(current.opsTrials.length, 1);
    const baseline = current.opsTrials[0];
    assert.equal(baseline.setup.opsEclipse, 35);
    await press(action('change'));
    await step('comparison');
    assert.equal((await state()).opsEclipse, 45);
    await press(action('record-b'));
    await step('reflect');
    current = await state();
    assert.equal(current.opsMode, 'integrated');
    assert.equal(current.opsTrials.length, 2);
    const revised = current.opsTrials[1];
    assert.equal(current.opsTrialSelected, baseline.id);
    assert.equal(Number(current.opsTrialCompare), revised.id);
    assert.deepEqual(revised.setup, { ...baseline.setup, opsEclipse: 45 }, 'Only eclipse duration changes');
    assert(revised.results.batteryMin < baseline.results.batteryMin);
    const minima = [baseline.results.batteryMin, revised.results.batteryMin];
    for (const [index, side] of ['baseline', 'comparison'].entries()) {
      assert.equal(Number(await find('[data-eclipse-guide-minimum="' + side + '"]').getAttribute('data-value')), minima[index]);
    }
    const table = await find('[data-ops-trial-metric="batteryMin"] td').allTextContents();
    assert(table[2].match(/[-−]/), 'The recorded minimum decreases');
    assert(await action('finish').isDisabled(), 'The explanation step needs a reflection');
    await shot(guide, 'guided-comparison');
    await checkEclipseWindow(baseline, revised, false);
    await press(action('chart'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trajectory-readout-title');
    const chartValue = await find('[data-ops-trajectory-reading="comparison"]').getAttribute('data-value');
    assert(Math.abs(Number(chartValue) - revised.results.batteryMin) < 1e-8, 'Chart opens at B minimum');
    const { answer } = await useReading(baseline, revised);
    await guardObservations(baseline, revised);
    await press(action('finish'));
    await step('done');
    const completed = await state();
    assert.equal(completed.opsTrials[1].reflection, answer);
    await remount(completed);
    assert.equal(await guide.getAttribute('data-step'), 'done');
    const completedWindow = find('details[data-eclipse-window]');
    await press(completedWindow.locator('summary'));
    assert.equal(await completedWindow.locator('[data-eclipse-window-value="startReserve"]').count(), 2, 'Completed investigation retains both sets of interval readings');
    await press(completedWindow.locator('summary'));
    await showComparisonNote();
    assert.equal(await reflection.inputValue(), answer);
    assert.deepEqual((await state()).opsTrials, completed.opsTrials);
    await shot(guide, 'guided-done');
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit(guide, 'Completed guide in forced colors');
      await shot(guide, 'guided-forced-colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    checks.push({ baselineMinutes: 35, revisedMinutes: 45, minimumBattery: minima, recordedCells: table, restoredAfterSave: true });
    await checkMidProjectStart(completed.opsTrials);
    assert.deepEqual(errors, []);
    return { width, checks, audits, errors };
  } finally {
    await page.evaluate(() => window.__destroy?.()).catch(() => {});
    await page.close();
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const preview = await createPreview();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const results = [];
    for (const width of widths) {
      results.push(await run(browser, preview.base, width));
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Guided eclipse investigation and evidence workflow passed at ' + width + 'px');
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
