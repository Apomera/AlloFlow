#!/usr/bin/env node
'use strict';

// Saved-trial interpretation, setup loading, and threshold display in the native UI.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-comparison'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000);
  const errors = [], audits = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData.spaceStation)));
  const patch = async values => {
    await page.evaluate(values => window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation, ...values } })), values);
    await page.waitForFunction(values => Object.entries(values).every(([key, value]) => JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), values);
  };
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const notebook = () => page.locator('[data-ops-trial-notebook]');
  const summary = () => page.locator('[data-ops-rule-comparison]');
  const details = () => page.locator('[data-ops-compared-details]');
  const trial = async id => (await state()).opsTrials.find(item => item.id === id);
  const comparisonText = () => page.locator('[data-ops-trial-comparison]').innerText();
  const changes = () => summary().locator('[data-ops-rule-change]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.opsRuleChange, { state: node.dataset.changeState, text: node.innerText }])));
  const audit = async label => {
    const result = await page.evaluate(async () => {
      const scan = await axe.run(document.querySelector('[data-ops-trial-notebook]'), { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    });
    assert.deepEqual(result.violations, [], label + ' accessibility, including contrast');
    audits.push({ label, ...result });
  };
  const assertChanges = async expected => {
    const actual = await changes();
    assert.equal(Object.keys(actual).length, 5, 'Thermal counts once in the five-rule summary');
    for (const [id, value] of Object.entries(expected)) assert.equal(actual[id].state, value, id + ' transition');
    return actual;
  };
  const load = async (selector, expected, selections) => {
    const before = await state();
    await activate(page.locator(selector));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trial-load-notice');
    const after = await state();
    assert.equal(after.opsOrbitMinute, 0);
    for (const [key, value] of Object.entries(expected.setup)) assert.equal(after[key], value, 'Loaded ' + key);
    for (const key of ['opsTrials', 'opsPrediction', 'opsWaterDay', 'opsPressureMinute', 'mapSunPhase', 'interiorNotes']) assert.deepEqual(after[key], before[key], 'Loading preserves ' + key);
    for (const key of ['opsPowerSeekToken', 'opsAirSeekToken', 'opsThermalSeekToken', 'opsAttitudeSeekToken']) assert.notEqual(after[key], before[key], 'Loading pauses ' + key);
    assert(!after.opsInspection, 'Loading clears prior inspection context');
    for (const [key, value] of Object.entries(selections || {})) assert.equal(String(after[key]), String(value));
    const notice = page.locator('#iss-trial-load-notice');
    assert.equal(await notice.getAttribute('role'), 'status');
    assert.match(await notice.innerText(), new RegExp('trial\\s+' + expected.id, 'i'));
    assert.equal(await page.locator('[data-ops-loaded-trial]').getAttribute('data-ops-loaded-trial'), String(expected.id));
    return { id: expected.id, notice: await notice.innerText(), focus: true, preserved: true };
  };
  try {
    await page.goto(base + '/?tab=operations');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await patch({ opsBattery: 20, opsRecovery: 98 });
    await page.locator('[data-ops-prediction]').fill('Low initial battery reserve may fail the power rule even if sunlight restores the charge later.');
    await activate(page.locator('[data-ops-record-trial]'));
    const aId = (await state()).opsTrialSelected;
    await page.locator('[data-ops-reflection]').fill('The minimum includes the initial reserve. Later charging does not erase the low starting value.');
    await patch({ opsBattery: 76, opsRecovery: 89 });
    await page.locator('[data-ops-prediction]').fill('A higher initial charge should restore the power margin, but lower recovery may introduce a water check.');
    await activate(page.locator('[data-ops-record-trial]'));
    const bId = Number((await state()).opsTrialCompare);
    assert.notEqual(aId, bId);
    // Seed B's reflection through the baseline selector as an alternate editing
    // route; saved prediction, setup, and measurements remain immutable.
    await page.locator('[data-ops-trial-select]').selectOption(String(bId));
    await page.locator('[data-ops-reflection]').fill('Power improved while water recovery fell below its rule. One success did not make every subsystem GO.');
    await page.locator('[data-ops-trial-select]').selectOption(String(aId));
    const a = await trial(aId), b = await trial(bId);
    const mixed = await assertChanges({ power: 'resolved', air: 'still-go', water: 'introduced', thermal: 'still-go', attitude: 'still-go' });
    assert.match(mixed.power.text, /CHECK\s*→\s*GO/);
    assert.match(mixed.water.text, /GO\s*→\s*CHECK/);
    assert.equal(await details().evaluate(element => element.tagName), 'DETAILS');
    await activate(details().locator('summary'));
    assert.equal(await details().evaluate(element => element.open), true);
    assert.equal(await page.locator('[data-ops-compared-prediction]').innerText(), b.prediction);
    assert.equal(await page.locator('[data-ops-compared-reflection]').inputValue(), b.reflection);
    assert.equal(await details().locator('textarea').count(), 1, 'Only the comparison reflection is editable');
    assert.equal(await details().locator('input,select').count(), 0, 'Saved comparison setup remains read-only');
    assert.equal(await page.locator('[data-ops-compared-prediction]').evaluate(element => element.tagName), 'P');
    const storedEvidence = (await state()).opsTrials;
    const frozenText = await comparisonText();
    await patch({ opsBattery: 40, opsResearch: 30 });
    assert.equal(await comparisonText(), frozenText, 'Editing current controls leaves saved B comparison unchanged');
    assert.deepEqual((await state()).opsTrials, storedEvidence);
    const draft = 'Next I will vary research load alone while keeping the higher initial charge and recovery fixed.';
    await page.locator('[data-ops-prediction]').fill(draft);
    await patch({ opsOrbitMinute: 32.123, opsWaterDay: 12.3, opsPressureMinute: 7.5, mapSunPhase: 123, interiorNotes: { harmony: 'Crew observation retained' }, opsInspection: { source: 'rule', id: 'power', setup: 'stale' } });
    const loadedB = await load('[data-ops-comparison-load]', b, { opsTrialSelected: aId, opsTrialCompare: bId });
    assert.match(loadedB.notice, new RegExp('baseline.*' + aId, 'i'));
    assert.equal(await page.locator('[data-ops-prediction]').inputValue(), draft);
    await assertChanges({ power: 'resolved', air: 'still-go', water: 'introduced', thermal: 'still-go', attitude: 'still-go' });
    checks.push({ mixedTransitions: mixed, savedEvidenceUnchanged: true, loadedComparison: loadedB });
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await audit('saved comparison and setup details');
    const layout = await notebook().evaluate(element => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, overflow: element.scrollWidth > element.clientWidth + 1, documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: [...element.querySelectorAll('button,input,select,textarea,summary')].map(node => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }).filter(rect => rect.width && rect.height) };
    });
    assert(layout.left >= -1 && layout.right <= width + 1 && !layout.overflow && !layout.documentOverflow);
    assert(layout.targets.every(box => box.width >= 24 && box.height >= 24), 'Visible notebook controls have minimum target size');
    await notebook().screenshot({ path: path.join(output, 'comparison-details-' + width + '.png'), animations: 'disabled' });
    await summary().screenshot({ path: path.join(output, 'comparison-rules-' + width + '.png'), animations: 'disabled' });
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await audit('phone forced colors');
      await notebook().screenshot({ path: path.join(output, 'comparison-forced-colors-' + width + '.png'), animations: 'disabled' });
      await page.emulateMedia({ forcedColors: 'none' });
    }

    const beforeCurrent = await state();
    await activate(page.locator('[data-ops-compare-current]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-rule-comparison-title');
    assert.equal((await state()).opsTrialCompare, 'current');
    for (const key of Object.keys(b.setup).concat(['opsTrials', 'opsTrialSelected', 'opsPrediction', 'opsOrbitMinute'])) assert.deepEqual((await state())[key], beforeCurrent[key]);
    assert.equal(await details().count(), 0, 'Current setup has no saved prediction/reflection panel');
    await patch({ opsRecovery: 98 });
    await assertChanges({ power: 'resolved', air: 'still-go', water: 'still-go', thermal: 'still-go', attitude: 'still-go' });
    const loadedA = await load('[data-ops-trial-restore]', a, { opsTrialSelected: aId });
    assert.equal(await page.locator('[data-ops-prediction]').inputValue(), draft, 'Loading baseline preserves the working prediction draft');
    await page.locator('[data-ops-trial-compare]').selectOption(String(aId));
    await assertChanges({ power: 'still-check', air: 'still-go', water: 'still-go', thermal: 'still-go', attitude: 'still-go' });
    const zeroDeltas = await page.locator('[data-ops-trial-metric] td:last-child').allTextContents();
    assert(zeroDeltas.every(text => /^0\s/.test(text)), 'Comparing a saved trial with itself has zero deltas');
    checks.push({ switchToCurrent: true, loadedBaseline: loadedA, selfComparison: true });

    // Saved values straddling rounded boundaries expose strict/equality rule
    // semantics without depending on a convenient numerical model solution.
    const edgeA = { ...a, id: 101, results: { ...a.results, batteryMin: 24.999, batteryEnd: 50, co2Peak: 3999.6, recovery: 89.999, cabinMin: 17.999, cabinMax: 26.999, cmgPeak: 79.999 } };
    const edgeB = { ...b, id: 102, results: { ...b.results, batteryMin: 25.001, batteryEnd: 50.0000000004, co2Peak: 4000.4, recovery: 90.001, cabinMin: 18.001, cabinMax: 27.001, cmgPeak: 80.001 } };
    await patch({ opsTrials: [edgeA, edgeB], opsTrialSelected: edgeA.id, opsTrialCompare: edgeB.id });
    const boundaryRows = {};
    for (const [key, threshold] of Object.entries({ batteryMin: '25.0', co2Peak: '4000', recovery: '90.0', cabinMin: '18.0', cabinMax: '27.0', cmgPeak: '80.0' })) {
      const cells = await page.locator('[data-ops-trial-metric="' + key + '"] td').allTextContents();
      assert(cells[0].includes('<') && cells[0].includes(threshold), key + ' below-threshold value is explicit');
      assert(cells[1].includes('>') && cells[1].includes(threshold), key + ' above-threshold value is explicit');
      boundaryRows[key] = cells;
    }
    const tinyDelta = await page.locator('[data-ops-trial-metric="batteryEnd"] td').last().innerText();
    assert.match(tinyDelta, /\+\s*</, 'A nonzero delta below display precision never says zero');
    await assertChanges({ power: 'resolved', air: 'introduced', water: 'resolved', thermal: 'still-check', attitude: 'introduced' });
    await notebook().screenshot({ path: path.join(output, 'threshold-comparison-' + width + '.png'), animations: 'disabled' });
    checks.push({ boundaryRows, tinyDelta });

    // The same precision safeguard applies to the current flight-rule cards.
    await patch({ ...a.setup, opsBattery: 24.999, opsRecovery: 89.999, opsCabinStart: 17.999, opsCmg: 79.999, opsAttitudeTorque: 0 });
    const cards = {};
    for (const id of ['power', 'water', 'thermal', 'attitude']) cards[id] = await page.locator('[data-ops-rule="' + id + '"] .iss-ops-metric-value').innerText();
    assert(cards.power.includes('<') && cards.power.includes('25'), cards.power);
    assert(cards.water.includes('<') && cards.water.includes('90.0'));
    assert(cards.thermal.includes('<') && cards.thermal.includes('18.0'));
    assert(cards.attitude.includes('<') && cards.attitude.includes('80'), cards.attitude);

    // The adjoining labs must preserve the same side of each rule boundary.
    const labOutcomes = {};
    for (const [id, selector, expression] of [
      ['power', '[data-power-outcome]', /Minimum reserve <\s*25\.0%/],
      ['thermal', '[data-thermal-outcome]', /Cabin range <\s*18\.00/],
      ['attitude', '[data-attitude-outcome]', /Orbit peak <\s*80\.0%/]
    ]) {
      await activate(page.locator('[data-ops-rule="' + id + '"]'));
      await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
      labOutcomes[id] = await page.locator(selector).innerText();
      assert.match(labOutcomes[id], expression, id + ' outcome agrees with the current rule card');
      if (id === 'thermal') assert.match(await page.locator('[data-thermal-plot]').getAttribute('aria-label'), /ranges from <\s*18\.00/);
      await page.locator(selector).screenshot({ path: path.join(output, 'boundary-outcome-' + id + '-' + width + '.png'), animations: 'disabled' });
    }
    // With no mixing/removal, this initial concentration gives a 3999.9 ppm
    // final local reading, so both the peak and final phrases test rounding.
    await patch({ ...a.setup, opsCrew: 3, opsBattery: 76, opsAirFlow: 0, opsScrub: 0, opsAirStart: 1046.55887500254, opsMode: 'integrated', opsOrbitMinute: 0 });
    await activate(page.locator('[data-ops-rule="air"]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-ops-inspection-title');
    labOutcomes.air = await page.locator('[data-air-outcome]').innerText();
    assert.match(labOutcomes.air, /Highest reading <\s*4000 ppm/);
    assert.match(labOutcomes.air, /final crew zone <\s*4000 ppm/);
    assert.equal(await page.locator('[data-air-outcome]').getAttribute('data-air-outcome'), 'below');
    await page.locator('[data-air-outcome]').screenshot({ path: path.join(output, 'boundary-outcome-air-' + width + '.png'), animations: 'disabled' });
    await patch({ ...a.setup, opsMode: 'integrated', opsFocus: 'all', opsRecovery: 90 });
    const networkWater = await page.locator('[data-iss-network-focus] svg').evaluate(svg => {
      const label = [...svg.querySelectorAll('text')].find(node => node.textContent === 'WATER');
      return { color: label.getAttribute('fill'), outline: label.parentElement.querySelector('circle').getAttribute('stroke'), value: label.nextElementSibling.textContent, description: svg.getAttribute('aria-label') };
    });
    assert.equal(networkWater.color, '#38bdf8', 'Exactly 90% recovery has the passing water color');
    assert.equal(networkWater.outline, '#38bdf8');
    assert.equal(networkWater.value, '90%');
    assert.match(networkWater.description, /WATER 90%/);
    await page.locator('[data-iss-network-focus]').screenshot({ path: path.join(output, 'water-rule-boundary-network-' + width + '.png'), animations: 'disabled' });
    checks.push({ labOutcomes, thermalAccessibleRange: true, networkWater });

    await patch({ opsTrials: storedEvidence, opsTrialSelected: 999999, opsTrialCompare: 999999 });
    assert.equal(await page.locator('[data-ops-trial-select]').inputValue(), String(bId), 'Invalid stored baseline falls back to latest valid trial');
    assert.equal(await page.locator('[data-ops-trial-compare]').inputValue(), 'current', 'Invalid saved comparison falls back to current setup');
    assert.equal(await details().count(), 0);
    assert.equal(await summary().locator('[data-ops-rule-change]').count(), 5);
    assert.deepEqual((await state()).opsTrials, storedEvidence);
    checks.push({ currentRuleCards: cards, invalidSelectionFallback: true });
    assert.deepEqual(errors, [], 'No browser runtime errors');
    return { width, checks, audits, layout, errors };
  } finally {
    await page.evaluate(() => window.__destroy?.()).catch(() => {});
    await page.close();
  }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const suppliedBase = arg('--base', ''), preview = suppliedBase ? null : await createPreview();
  const base = (suppliedBase || preview.base).replace(/\/$/, '');
  let browser;
  try {
    const channel = arg('--channel', '');
    browser = await chromium.launch({ headless: true, downloadsPath: output, ...(channel ? { channel } : {}) });
    const results = [];
    for (const width of widths) {
      results.push(await run(base, browser, width));
      console.log('Saved comparison, setup loading, precise rule values, keyboard, and accessibility passed at ' + width + 'px');
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: true, results }, null, 2));
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally {
    if (browser) await browser.close();
    if (preview) await new Promise(resolve => preview.server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
