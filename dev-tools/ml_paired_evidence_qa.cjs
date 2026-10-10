// Native-browser acceptance for frozen comparison records in the real Machine Lab host.
const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-paired-evidence-2026-10-09/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1')
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  const panel = pg.locator('.ml-station-comparison');
  const evidence = pg.locator('[data-ml-experiment]');
  function check(ok, label) { if (!ok) errors.push(label); checks.push(label); }
  async function mount(kind, width, extra = {}, theme = {}) {
    await pg.setViewportSize({ width, height: 1000 });
    await pg.evaluate(([s, opts]) => window.__mount(s, opts), [S({ view: 'machines', bench: kind, shopMotionProgress: 0.5, ...extra }), { band: 'g68', ...theme }]);
    await panel.locator(':scope > summary').focus();
    await pg.keyboard.press('Enter');
  }
  async function savePair() {
    await panel.getByRole('button', { name: 'Save current setup', exact: true }).click();
    check(await panel.getByRole('button', { name: 'Save comparison', exact: true }).isDisabled(), 'Unchanged pair cannot be recorded');
    await pg.locator('.ml-station-range').first().focus();
    await pg.keyboard.press('ArrowRight');
    await panel.getByRole('button', { name: 'Save comparison', exact: true }).focus();
    await pg.keyboard.press('Enter');
    await evidence.waitFor();
  }
  async function record() { return pg.evaluate(() => JSON.stringify(window.__qaState.benchExperiments[window.__qaState.bench])); }
  async function inspect(label) {
    const result = await evidence.evaluate(el => {
      const values = [...el.querySelectorAll('[data-ml-experiment-value]')].map(x => Number(x.dataset.value));
      const work = side => Number(el.querySelector('[data-ml-experiment-metric="workIn"] [data-ml-experiment-value="' + side + '"]').dataset.value);
      const output = side => Number(el.querySelector('[data-ml-experiment-metric="workOut"] [data-ml-experiment-value="' + side + '"]').dataset.value);
      return { finite: values.length === 10 && values.every(Number.isFinite),
        balanced: ['before', 'after'].every(side => Math.abs(work(side) - output(side)) < 1e-8),
        overflow: document.documentElement.scrollWidth > innerWidth,
        elementOverflow: el.scrollWidth > el.clientWidth + 1,
        focusable: !!el.querySelector('textarea[aria-label][maxlength="1200"]') };
    });
    check(result.finite && result.balanced && !result.overflow && !result.elementOverflow && result.focusable, label + ': values, work balance, labeling and fit');
  }
  async function shot(name) { await evidence.screenshot({ path: path.join(OUT, name + '.png') }); shots.push(name); }
  try {
    for (const kind of ['lever', 'pulley', 'windlass', 'ramp', 'wedge', 'screw']) {
      await mount(kind, 1150);
      await savePair();
      const frozen = await record();
      await pg.locator('.ml-station-range').first().focus();
      await pg.keyboard.press('ArrowRight');
      check(await record() === frozen, kind + ': live slider does not change evidence');
      await inspect(kind + '/1150');
    }
    await mount('lever', 1150);
    await savePair();
    await pg.locator('#ml-leverEffortArm').fill('4');
    await panel.getByRole('button', { name: 'Replace comparison record', exact: true }).click();
    const values = await evidence.locator('[data-ml-experiment-value]').evaluateAll(nodes => nodes.map(n => Number(n.dataset.value)));
    check(JSON.stringify(values) === JSON.stringify([2, 4, 200, 100, 1, 2, 200, 200, 200, 200]), 'Doubling lever arm halves force and doubles travel with equal work');
    await evidence.getByRole('textbox', { name: 'What does your comparison show?', exact: true }).fill('The effort arm doubled. Force halved and hand travel doubled; work stayed at 200 J.');
    const kept = await record();
    await shot('lever-desktop');
    await panel.getByRole('button', { name: 'Clear saved setup', exact: true }).click();
    check(await record() === kept, 'Clearing baseline preserves record and explanation');
    await pg.locator('#ml-bench-tab-pulley').click();
    check(await evidence.count() === 0, 'Record does not appear at another station');
    await pg.locator('#ml-bench-tab-lever').click();
    await panel.locator(':scope > summary').click();
    check(await record() === kept, 'Record and explanation survive station navigation');
    await evidence.getByRole('button', { name: 'Clear comparison record', exact: true }).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(() => document.activeElement?.hasAttribute('data-ml-save-reference'));
    check(await evidence.count() === 0, 'Clearing record removes evidence and restores keyboard focus');
    for (const [width, theme, name] of [
      [390, {}, 'phone-390'], [320, {}, 'phone-320'],
      [390, { dark: true }, 'dark-390'], [320, { dark: true, contrast: true }, 'contrast-320']
    ]) {
      await mount('screw', width, {}, theme);
      await savePair();
      await evidence.getByRole('textbox').fill('The handle radius changed. The load and its travel stayed the same.');
      await inspect(name);
      await shot(name);
    }
    await pg.emulateMedia({ forcedColors: 'active' });
    await mount('lever', 320);
    await savePair();
    await inspect('forced-colors');
    await shot('forced-colors-320');
    await pg.emulateMedia({ forcedColors: 'none' });
    await mount('lever', 390);
    await savePair();
    await pg.locator('#ml-leverLoad').fill('600');
    await pg.locator('#ml-loadDistance').fill('1');
    await panel.getByRole('button', { name: 'Replace comparison record', exact: true }).click();
    check((await evidence.textContent()).includes('Several settings changed') && (await evidence.textContent()).includes('this is a different task'), 'Multiple changes and differing work get accurate guidance');
    check(await evidence.locator('[data-ml-experiment-metric="workOut"] [data-ml-experiment-value="after"]').getAttribute('data-value') === '600', 'Changed task records 600 J');
    await inspect('multiple-changes');
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ checks, shots, errors }, null, 2));
    console.log(JSON.stringify({ checks: checks.length, screenshots: shots.length, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally { await b.close(); }
})();`;
vm.runInThisContext('(function(require){' + source + '\n})', { filename: __filename })(require);
