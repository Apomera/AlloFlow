'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = process.cwd();
const out = path.join(root, 'reports/watercycle-steward-decisions');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const groups = [], audits = [], errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Steward decisions QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.mountWater = function(seed, dark = false) {
        function Host() {
          const [data, setData] = React.useState({ waterCycle: seed });
          window.waterReviewData = data.waterCycle;
          window.waterReviewSet = setData;
          const noop = () => {};
          return StemLab._registry.waterCycle.render({ React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, gradeBand: '6-8', gradeLevel: '7th Grade', icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop, announceToSR: noop, awardXP: noop, getXP: () => 0,
            beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f, props: {}, srOnly: {}, callGemini: null });
        }
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#081b21' : '#f1f5f9';
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
      };
      mountWater({ wcMode: 'steward' });
    });
    await page.addScriptTag({ content: read('desktop/web-app/node_modules/axe-core/axe.min.js') });
    const data = () => page.evaluate(() => JSON.parse(JSON.stringify(waterReviewData)));
    const mount = (seed, dark = false) => page.evaluate(({ seed, dark }) => mountWater(seed, dark), { seed, dark });
    const click = name => page.getByRole('button', { name, exact: true }).click();
    const focus = id => page.waitForFunction(id => document.activeElement && document.activeElement.id === id, id);
    const overflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No horizontal page overflow');
    async function audit(selector, theme, width) {
      const violations = await page.evaluate(async selector => (await axe.run(document.querySelector(selector), { rules: { region: { enabled: false } } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.html) })), selector);
      audits.push({ selector, theme, width, violations });
      assert.deepEqual(violations, [], 'Accessible ' + selector + ' ' + theme + ' ' + width);
    }
    await click('💧 Begin 10-year Watershed Campaign');
    await page.evaluate(() => waterReviewSet(previous => {
      const steward = { ...previous.waterCycle.steward };
      steward.components = steward.components.map(c => c.id === 'riverMainstem' ? { ...c, quality: 97, connectivity: 90, support: 8 } : c);
      steward.yearStart = steward.components.map(c => ({ ...c }));
      return { ...previous, waterCycle: { ...previous.waterCycle, steward } };
    }));
    const initial = await data();
    const trigger = '#wc-steward-action-damRemoval-riverMainstem';
    await page.locator(trigger).click();
    await focus('wc-steward-decision-title');
    assert.deepEqual((await data()).steward.components, initial.steward.components);
    assert.equal((await data()).steward.hoursLeft, initial.steward.hoursLeft);
    const previewText = await page.locator('.wc-steward-decision').innerText();
    for (const text of ['97 → 100', '90 → 100', '8 → 0', '3 hours remain']) assert(previewText.includes(text), text);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Cancel');
    await page.keyboard.press('Enter');
    await focus(trigger.slice(1));
    assert.deepEqual((await data()).steward.components, initial.steward.components);
    assert.equal((await data()).steward.hoursLeft, initial.steward.hoursLeft);
    groups.push('Preview is read-only; capped effects visible; keyboard Cancel restores focus');

    await page.locator(trigger).click();
    await click('Apply action · 15h');
    await focus('wc-steward-action-log');
    const applied = await data();
    const river = applied.steward.components.find(c => c.id === 'riverMainstem');
    assert.deepEqual([river.quality, river.connectivity, river.support], [100, 100, 0]);
    assert.equal(applied.steward.hoursLeft, 3);
    assert.equal(applied.steward.yearActions.length, 1);
    assert(await page.locator('#wc-steward-action-stormwater-suburbanEdges').isDisabled());
    groups.push('Apply matches preview, spends hours once, updates focus and budget availability');

    await click('End this year');
    await page.locator('.wc-steward-ledger').waitFor();
    const reviewed = await data();
    const snap = reviewed.steward.yearLog.at(-1);
    const end = snap.post.find(c => c.id === 'riverMainstem');
    const beginning = snap.yearStart.find(c => c.id === 'riverMainstem');
    for (const field of ['quality', 'connectivity', 'support']) {
      let previous = beginning[field], total = 0;
      for (const stage of snap.stages) {
        const current = stage.components.find(c => c.id === 'riverMainstem')[field];
        total += current - previous; previous = current;
      }
      assert(Math.abs(total - (end[field] - beginning[field])) < 1e-9);
    }
    await page.getByLabel('Watershed component', { exact: true }).selectOption('forestBuffer');
    assert.equal((await data()).steward.ledgerComponent, 'forestBuffer');
    await page.getByLabel('Watershed component', { exact: true }).selectOption('riverMainstem');
    groups.push('Year ledger reconciles every score through all causes and supports place selection');

    for (const theme of ['light', 'dark']) {
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await mount(initial, theme === 'dark');
        await page.locator(trigger).click();
        await overflow(); await audit('.wc-steward-decision', theme, width);
        await page.locator('.wc-steward-decision').screenshot({ path: path.join(out, 'decision-' + theme + '-' + width + '.png') });
        await mount(reviewed, theme === 'dark');
        await overflow(); await audit('.wc-steward-ledger', theme, width);
        await page.locator('.wc-steward-ledger').screenshot({ path: path.join(out, 'ledger-' + theme + '-' + width + '.png') });
      }
    }
    groups.push('Light and dark previews/ledgers fit desktop and 320px; eight axe audits');
    const legacy = JSON.parse(JSON.stringify(reviewed));
    delete legacy.steward.yearLog[0].stages;
    delete legacy.steward.yearLog[0].yearStart;
    await mount(legacy);
    assert(await page.getByText('This saved year predates detailed change records.', { exact: false }).count());
    const partial = JSON.parse(JSON.stringify(reviewed));
    delete partial.steward.yearLog[0].yearStart;
    await mount(partial);
    assert(await page.getByText('The start of this saved year was not recorded', { exact: false }).count());
    assert.equal(await page.locator('.wc-steward-stage-list li').count(), 5);
    groups.push('Older saved years disclose missing evidence and preserve available summaries');
    assert.deepEqual(errors, []);
    const report = { groups, audits, errors };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ groups: groups.length, audits: audits.length, errors, report: path.join(out, 'results.json') }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
