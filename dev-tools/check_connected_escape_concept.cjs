const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const fragmentPath = process.argv[2];
if (!fragmentPath) throw Error('Pass the absolute concept fragment path.');
const html = fs.readFileSync(fragmentPath, 'utf8');
assert(!/<!doctype|<html|<head>|<body>/i.test(html));
assert(!html.includes('\\"'));
assert(Buffer.byteLength(html) < 1000000);
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 736, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}</style></head><body>' + html + '</body></html>');
    const model = await page.evaluate(() => {
      const api = document.getElementById('connected-escape-room').escapeConcept;
      const fail = message => { throw Error(message); };
      const uniqueRooms = new Set();
      for (let seed = 1; seed <= 200; seed++) {
        api.reset(seed);
        const room = api.snapshot().room;
        if (api.validateRoom(room).length) fail('Rejected valid seed ' + seed);
        uniqueRooms.add(JSON.stringify([room.origin, room.target]));
        api.act('vector'); api.act('latch'); api.act('exit');
        if (api.snapshot().facts.length) fail('Prerequisite bypass');
        // Either independent discovery can happen first.
        if (seed % 2) { api.act('station'); api.act('torch'); }
        else { api.act('torch'); api.act('station'); }
        api.act('torch');
        if (api.snapshot().facts.length !== 2) fail('Duplicate collection');
        api.act('vector');
        if (room.target.x !== 1 || room.target.y !== 1) {
          api.act('latch');
          if (api.snapshot().facts.includes('latch')) fail('Incorrect search advanced');
        }
        for (let x = 1; x < room.target.x; x++) api.act('east');
        for (let y = 1; y < room.target.y; y++) api.act('north');
        api.act('latch'); api.act('exit');
        if (!api.snapshot().facts.includes('exit')) fail('Unsolvable seed ' + seed);
        api.act('replay');
        if (api.snapshot().facts.length || JSON.stringify(room) !== JSON.stringify(api.snapshot().room)) fail('Replay lost deterministic content or retained progress');
      }
      const room = api.makeRoom(1);
      const graph = () => JSON.parse(JSON.stringify(api.nodes));
      let bad = graph(); bad[0].requires = ['exit'];
      if (!api.validateRoom(room, bad).length) fail('Cycle accepted');
      bad = graph(); bad[2].requires = ['missing'];
      if (!api.validateRoom(room, bad).length) fail('Missing dependency accepted');
      bad = graph(); bad[1].id = bad[0].id;
      if (!api.validateRoom(room, bad).length) fail('Duplicate ID accepted');
      bad = graph(); bad[1].grants = bad[0].grants;
      if (!api.validateRoom(room, bad).length) fail('Duplicate reward accepted');
      if (!api.validateRoom({ ...room, dx: room.dx + 1 }).length) fail('Contradictory clue accepted');
      if (!api.validateRoom({ ...room, target: { x: 8, y: 1 } }).length) fail('Outside grid accepted');
      api.reset(1);
      return { seedsSolved: 200, uniqueRooms, invalidGraphCasesRejected: 6, prerequisiteBypassBlocked: true, duplicateCollectionBlocked: true, replayVerified: true };
    });
    // Test the actual buttons separately from the state-model exploration.
    const place = name => page.locator('[data-place="' + name + '"]');
    const action = name => page.locator('[data-action="' + name + '"]');
    await place('wall').click(); await expect(action('vector')).toBeDisabled();
    await place('door').click(); await expect(action('exit')).toBeDisabled();
    await place('bench').click(); await action('torch').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('[data-inventory]')).toContainText('UV torch');
    await place('wall').click(); await action('vector').click();
    await place('desk').click(); await action('station').click();
    await place('console').click();
    const room = await page.evaluate(() => document.getElementById('connected-escape-room').escapeConcept.snapshot().room);
    await expect(action('west')).toBeDisabled(); await expect(action('south')).toBeDisabled();
    if (room.target.x !== 1 || room.target.y !== 1) {
      await action('latch').click(); await expect(page.locator('[data-status]')).toContainText('no cache');
      await expect(page.locator('[data-inventory]')).not.toContainText('Recovered latch');
    }
    for (let i = 0; i < 3; i++) await action('hint').click();
    await expect(page.locator('[data-hint]')).toContainText('Hint 3 of 3');
    for (let x = 1; x < room.target.x; x++) await action('east').click();
    for (let y = 1; y < room.target.y; y++) await action('north').click();
    await action('latch').click(); await expect(page.locator('[data-inventory]')).toContainText('Recovered latch');
    await place('door').click(); await action('exit').click(); await expect(page.locator('[data-progress]')).toHaveText('Vault open');
    await action('replay').click(); await expect(page.locator('[data-inventory]')).toHaveText('Empty');
    await action('new').click(); await expect(page.locator('[data-variant]')).toHaveText('VARIANT 2');
    await action('torch').click(); await place('wall').click(); await action('vector').click(); await place('desk').click(); await action('station').click(); await place('console').click();
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const layouts = [];
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      for (const width of [736, 360, 320]) {
        await page.setViewportSize({ width, height: 1100 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, colorScheme + ' overflow at ' + width);
        const axe = await page.evaluate(async () => (await window.axe.run('#connected-escape-room', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
        assert.deepEqual(axe, [], colorScheme + ' accessibility at ' + width);
        await page.screenshot({ path: path.join('docs/escape-room-concept', colorScheme + '-' + width + '.png'), fullPage: true });
        layouts.push({ colorScheme, width, overflow, axeViolations: axe.length });
      }
    }
    assert.deepEqual(errors, []);
    // Sets do not serialize through evaluate; collect the distinct count directly.
    const distinct = await page.evaluate(() => { const api = document.getElementById('connected-escape-room').escapeConcept; return new Set(Array.from({ length: 200 }, (_, i) => { const r = api.makeRoom(i + 1); return JSON.stringify([r.origin, r.target]); })).size; });
    const result = { ...model, uniqueRooms: distinct, browserSolve: true, keyboardCollection: true, graduatedHints: true, newVariation: true, layouts, errors };
    fs.writeFileSync('docs/escape-room-concept/verification.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
