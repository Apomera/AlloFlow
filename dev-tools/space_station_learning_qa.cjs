#!/usr/bin/env node
'use strict';

// Complete the notebook learning loop: evidence notes, meaningful control
// changes, and pointing/propellant results with legacy-record compatibility.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createPreview } = require('./space_station_enhancement_qa.cjs');
const ROOT = path.resolve(__dirname, '..');
const arg = (name, fallback) => process.argv.slice(2).find(value => value.startsWith(name + '='))?.slice(name.length + 1) || fallback;
const output = path.resolve(ROOT, arg('--out', 'reports/space-station-learning'));
const widths = arg('--widths', '1440,390').split(',').map(Number);
assert(widths.length && widths.every(width => Number.isInteger(width) && width >= 320));
const near = (actual, expected, tolerance = 1e-7) => assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected}`);
function csvRows(text) {
  const rows = [], row = []; let cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\r' || character === '\n') && !quoted) {
      if (character === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row.splice(0)); cell = '';
    } else cell += character;
  }
  assert.equal(quoted, false);
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function run(base, browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce', acceptDownloads: true });
  page.setDefaultTimeout(30000);
  const errors = [], checks = [], audits = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__toolData.spaceStation)));
  const patch = async values => {
    await page.evaluate(values => window.__setToolData(previous => ({ ...previous, spaceStation: { ...previous.spaceStation, ...values } })), values);
    await page.waitForFunction(values => Object.entries(values).every(([key, value]) => JSON.stringify(window.__toolData.spaceStation[key]) === JSON.stringify(value)), values);
  };
  const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
  const notebook = () => page.locator('[data-ops-trial-notebook]');
  const reflection = () => page.locator('textarea[data-ops-compared-reflection]');
  const openDetails = async selector => {
    const target = page.locator(selector);
    if (!(await target.evaluate(element => element.open))) await activate(target.locator('summary'));
  };
  const record = () => activate(page.locator('[data-ops-record-trial]'));
  const trial = async id => (await state()).opsTrials.find(item => item.id === id);
  const audit = async label => {
    const result = await page.evaluate(async () => {
      const scan = await axe.run(document.querySelector('[data-ops-trial-notebook]'), { rules: { region: { enabled: false } } });
      return { passes: scan.passes.length, violations: scan.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) };
    });
    assert.deepEqual(result.violations, [], label + ' accessibility, including contrast');
    audits.push({ label, ...result });
  };
  try {
    await page.goto(base + '/?tab=operations');
    await page.locator('[data-iss-scenario="nominal"]').click();
    await patch({ opsCmg: 85, opsAttitudeTorque: 2.4, opsAttitudeDump: false, opsAttitudeInertia: 40 });
    await page.locator('[data-ops-prediction]').fill('A saturated gyro may allow more pointing change when the station has less rotational inertia.');
    await record();
    const aId = (await state()).opsTrialSelected;
    await page.locator('[data-ops-reflection]').fill('The gyro reaches capacity. I will compare the final pointing angle while keeping the disturbance torque fixed.');
    await patch({ opsAttitudeInertia: 160, opsAttitudeBurnMinute: 70 });
    await page.locator('[data-ops-prediction]').fill('Four times the rotational inertia should reduce the final pointing change even if peak CMG storage stays the same.');
    await record();
    const bId = Number((await state()).opsTrialCompare), a = await trial(aId), b = await trial(bId);
    assert.equal(a.version, 1); assert.equal(b.version, 1);
    for (const key of ['batteryMin', 'batteryEnd', 'co2Peak', 'cabinMin', 'cabinMax', 'cmgPeak', 'recovery', 'waterResupply']) assert.equal(a.results[key], b.results[key], key + ' remains equal while pointing changes');
    assert.equal(a.results.cmgPeak, 100); assert.equal(b.results.cmgPeak, 100);
    near(a.results.pointingEnd, 32.264209567); near(b.results.pointingEnd, 8.066052392);
    assert.equal(a.results.propellantUsed, 0); assert.equal(b.results.propellantUsed, 0);
    const pointingCells = await page.locator('[data-ops-trial-metric="pointingEnd"] td').allTextContents();
    near(parseFloat(pointingCells[0]), a.results.pointingEnd, .011);
    near(parseFloat(pointingCells[1]), b.results.pointingEnd, .011);
    assert.match(pointingCells[2], /[−-]/);
    const propellantCells = await page.locator('[data-ops-trial-metric="propellantUsed"] td').allTextContents();
    assert(propellantCells.every(text => /^0(?:\.0+)?\s/.test(text)), 'Known zero propellant stays distinct from missing evidence');
    checks.push({ supplementalResults: { baseline: a.results, comparison: b.results, pointingCells, propellantCells } });

    await openDetails('[data-ops-compared-details]');
    assert.equal(await reflection().getAttribute('id'), 'iss-trial-comparison-reflection');
    assert.equal(await reflection().getAttribute('maxlength'), '1200');
    assert.equal(await page.locator('[data-ops-compared-prediction]').evaluate(element => element.tagName), 'P');
    assert.equal(await page.locator('[data-ops-compared-prediction]').innerText(), b.prediction);
    const draft = 'Next I will enable unloading and compare the propellant used against the resulting pointing angle.';
    const note = '=SUM(1,2)\nThe comparison says "less pointing change", while CMG peak remains 100%.';
    await page.locator('[data-ops-prediction]').fill(draft);
    await patch({ opsOrbitMinute: 37.25, opsWaterDay: 12.3, opsPressureMinute: 7.5 });
    const beforeNote = await state();
    await reflection().fill(note);
    const expectedEdited = { ...beforeNote, opsTrials: beforeNote.opsTrials.map(item => item.id === bId ? { ...item, reflection: note } : item) };
    assert.deepEqual(await state(), expectedEdited, 'Editing B changes only its reflection, without moving baseline, draft, controls, or clocks');
    assert.deepEqual(await trial(aId), a);
    assert.deepEqual((await trial(bId)).setup, b.setup); assert.deepEqual((await trial(bId)).results, b.results);
    await activate(page.locator('[data-ops-compare-current]'));
    assert.equal(await reflection().count(), 0, 'An unsaved current comparison has no saved reflection editor');
    await page.locator('[data-ops-trial-compare]').selectOption(String(bId));
    await openDetails('[data-ops-compared-details]');
    assert.equal(await reflection().inputValue(), note);
    const roundtrip = JSON.parse(JSON.stringify(await state()));
    await page.reload(); await notebook().waitFor();
    await page.evaluate(saved => window.__setToolData({ spaceStation: saved }), roundtrip);
    await page.waitForFunction(id => window.__toolData.spaceStation.opsTrialSelected === id, aId);
    await openDetails('[data-ops-compared-details]');
    assert.equal(await reflection().inputValue(), note, 'Saved comparison reflection roundtrips through project JSON');
    await activate(page.locator('[data-ops-comparison-load]'));
    await page.waitForFunction(() => document.activeElement?.id === 'iss-trial-load-notice');
    assert.equal((await state()).opsTrialSelected, aId); assert.equal(Number((await state()).opsTrialCompare), bId);
    assert.equal((await state()).opsPrediction, draft); assert.equal((await trial(bId)).reflection, note);
    await page.locator('[data-ops-trial-compare]').selectOption(String(aId));
    assert.equal(await reflection().count(), 0, 'Self-comparison uses just the baseline reflection editor');
    assert.equal(await page.locator('[data-ops-reflection]').count(), 1);
    assert.equal(await page.locator('#iss-trial-comparison-reflection').count(), 0);
    checks.push({ comparisonReflectionOnly: true, projectJson: true, loadPreservesNotes: true, selfComparison: true });

    // A historical version1 record is still usable when optional evidence was
    // never measured. Absence must not be replaced by a made-up zero.
    const editedB = await trial(bId), legacy = { ...a, id: 99, results: { ...a.results } };
    delete legacy.results.pointingEnd; delete legacy.results.propellantUsed;
    await patch({ opsTrials: [a, editedB, legacy], opsTrialSelected: legacy.id, opsTrialCompare: bId });
    const legacyRows = {};
    for (const key of ['pointingEnd', 'propellantUsed']) {
      legacyRows[key] = await page.locator('[data-ops-trial-metric="' + key + '"] td').allTextContents();
      assert.match(legacyRows[key][0], /Not recorded/i);
      assert.doesNotMatch(legacyRows[key][1], /Not recorded/i);
      assert.match(legacyRows[key][2], /Not comparable/i);
    }
    assert.equal(await page.locator('[data-ops-trial-select]').inputValue(), '99');
    const downloadPromise = page.waitForEvent('download');
    await activate(page.locator('[data-ops-trial-export]'));
    const download = await downloadPromise, csvFile = path.join(output, 'learning-export-' + width + '.csv');
    await download.saveAs(csvFile);
    const rows = csvRows((await fs.readFile(csvFile, 'utf8')).replace(/^\uFEFF/, ''));
    assert(rows.every(row => row.length === rows[0].length));
    const pointColumn = rows[0].findIndex(label => /pointing/i.test(label));
    const fuelColumn = rows[0].findIndex(label => /propellant.*used|used.*propellant/i.test(label));
    const reflectionColumn = rows[0].findIndex(label => /^Reflection$/.test(label));
    assert(pointColumn >= 0 && fuelColumn >= 0 && reflectionColumn >= 0, 'CSV names both supplemental measurements');
    const oldRow = rows.find(row => row[0] === '99'), newRow = rows.find(row => row[0] === String(bId));
    assert.equal(oldRow[pointColumn], ''); assert.equal(oldRow[fuelColumn], '');
    near(Number(newRow[pointColumn]), b.results.pointingEnd); assert.equal(newRow[fuelColumn], '0');
    assert.equal(newRow[reflectionColumn], "'" + note, 'Formula-prefixed multiline comparison reflection is neutralized and quoted');
    checks.push({ legacyRows, csv: path.basename(csvFile), legacyOptionalColumnsBlank: true, savedZeroPreserved: true });

    const baseSetup = a.setup;
    async function diffCase(label, before, after, activeKeys, inactiveKeys) {
      await patch({ ...baseSetup, ...before, opsTrials: [], opsTrialSelected: null, opsTrialCompare: 'current', opsRuns: 0, opsOrbitMinute: 0 });
      await record();
      await patch({ ...baseSetup, ...after });
      const active = page.locator('[data-ops-active-changes] [data-ops-setup-change]');
      assert.equal(await active.count(), activeKeys.length, label + ' active controls');
      assert.equal(await page.locator('[data-ops-change-guidance]').getAttribute('data-ops-change-guidance'), String(activeKeys.length), label + ' guidance uses the active count');
      for (const key of activeKeys) {
        const entry = page.locator('[data-ops-setup-change="' + key + '"]');
        assert.equal(await entry.getAttribute('data-change-active'), 'true');
      }
      if (inactiveKeys.length) {
        await openDetails('[data-ops-inactive-changes]');
        assert.equal(await page.locator('[data-ops-inactive-changes] [data-ops-setup-change]').count(), inactiveKeys.length);
        for (const key of inactiveKeys) {
          const entry = page.locator('[data-ops-setup-change="' + key + '"]');
          assert.equal(await entry.getAttribute('data-change-active'), 'false');
          assert.match(await entry.innerText(), /off|disabled|both|already|at least|not used|inactive/i, key + ' explains its inactivity');
        }
      }
      return { label, activeKeys, inactiveKeys, guidance: await page.locator('[data-ops-change-guidance]').innerText() };
    }
    const classifications = [];
    classifications.push(await diffCase('disabled restoration timing', { opsAirRestore: false, opsAirRestoreMinute: 5 }, { opsAirRestore: false, opsAirRestoreMinute: 70 }, [], ['opsAirRestoreMinute']));
    classifications.push(await diffCase('disabled unloading settings', { opsAttitudeDump: false, opsAttitudeBurnMinute: 10, opsAttitudeThrust: 1, opsAttitudeFuel: .1 }, { opsAttitudeDump: false, opsAttitudeBurnMinute: 70, opsAttitudeThrust: 15, opsAttitudeFuel: 3 }, [], ['opsAttitudeBurnMinute', 'opsAttitudeThrust', 'opsAttitudeFuel']));
    classifications.push(await diffCase('restoration active on one side', { opsAirFlow: 3, opsAirRestore: false, opsAirRestoreMinute: 5 }, { opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 70 }, ['opsAirRestore', 'opsAirRestoreMinute'], []));
    classifications.push(await diffCase('flow already exceeds restored flow', { opsAirFlow: 120, opsAirRestore: true, opsAirRestoreMinute: 5 }, { opsAirFlow: 120, opsAirRestore: true, opsAirRestoreMinute: 70 }, [], ['opsAirRestoreMinute']));
    classifications.push(await diffCase('one active plus an inactive setting', { opsResearch: 60, opsAirRestore: false, opsAirRestoreMinute: 5 }, { opsResearch: 65, opsAirRestore: false, opsAirRestoreMinute: 70 }, ['opsResearch'], ['opsAirRestoreMinute']));
    classifications.push(await diffCase('inertia matters despite identical rule metrics', { opsAttitudeInertia: 40 }, { opsAttitudeInertia: 160 }, ['opsAttitudeInertia'], []));
    checks.push({ classifications });

    const educationalNote = 'The final pointing change fell from about 32.26° to 8.07° when inertia increased fourfold. Peak CMG storage stayed at 100%. Changing the disabled burn time had no effect on this comparison.';
    const finalB = { ...editedB, reflection: educationalNote };
    await patch({ ...b.setup, opsTrials: [a, finalB], opsTrialSelected: aId, opsTrialCompare: bId, opsRuns: bId, opsPrediction: draft, opsOrbitMinute: 0 });
    await openDetails('[data-ops-compared-details]');
    await openDetails('[data-ops-inactive-changes]');
    assert.equal(await reflection().inputValue(), educationalNote);
    const duplicateIds = await notebook().evaluate(element => {
      const ids = [...element.querySelectorAll('[id]')].map(node => node.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    assert.deepEqual(duplicateIds, []);
    await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
    await audit('open reflection and inactive-control explanations');
    const fit = await notebook().evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, overflow: element.scrollWidth > element.clientWidth + 1, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        targets: [...element.querySelectorAll('button,summary,textarea,input,select')].map(node => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height }; }).filter(box => box.width && box.height) };
    });
    assert(fit.left >= -1 && fit.right <= width + 1 && !fit.overflow && !fit.pageOverflow);
    assert(fit.targets.every(box => box.width >= 24 && box.height >= 24));
    await notebook().screenshot({ path: path.join(output, 'learning-notebook-' + width + '.png'), animations: 'disabled' });
    await page.locator('[data-ops-trial-comparison]').screenshot({ path: path.join(output, 'meaningful-changes-' + width + '.png'), animations: 'disabled' });
    if (width < 500) {
      await page.emulateMedia({ forcedColors: 'active' });
      await notebook().screenshot({ path: path.join(output, 'learning-forced-colors-' + width + '.png'), animations: 'disabled' });
      await audit('phone reflection and inactive explanations forced colors');
      await page.emulateMedia({ forcedColors: 'none' });
    }
    assert.deepEqual(errors, []);
    return { width, checks, audits, fit, errors };
  } finally { await page.evaluate(() => window.__destroy?.()).catch(() => {}); await page.close(); }
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const suppliedBase = arg('--base', ''), preview = suppliedBase ? null : await createPreview();
  const base = (suppliedBase || preview.base).replace(/\/$/, ''); let browser;
  try {
    const channel = arg('--channel', '');
    browser = await chromium.launch({ headless: true, downloadsPath: output, ...(channel ? { channel } : {}) });
    const results = [];
    for (const width of widths) {
      results.push(await run(base, browser, width));
      await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: results.length === widths.length, results }, null, 2));
      console.log('Comparison reflections, active controls, supplemental results, legacy CSV, and accessibility passed at ' + width + 'px');
    }
    console.log(JSON.stringify({ ok: true, output, widths }));
  } finally { if (browser) await browser.close(); if (preview) await new Promise(resolve => preview.server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
